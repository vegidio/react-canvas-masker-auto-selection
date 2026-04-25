import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    AutoSelectionMode,
    AutoSelectionOptions,
    AutoSelectionResult,
    AutoSelectionStatus,
    ClientPoint,
    DetectedObject,
    ImagePoint,
} from '../types';
import { applyMaskToCanvas } from '../utils/applyMaskToCanvas';
import { clientToImagePoint } from '../utils/clientToImagePoint';

type SamEngineLike = {
    prepare(
        source: string | HTMLImageElement | HTMLCanvasElement,
        signal?: AbortSignal,
    ): Promise<void>;
    detect(
        source: string | HTMLImageElement | HTMLCanvasElement,
        point: ImagePoint,
        targetWidth: number,
        targetHeight: number,
        signal?: AbortSignal,
    ): Promise<DetectedObject | undefined>;
    invalidate(): void;
    dispose(): void;
};

/**
 * Adds an auto-selection mode on top of `react-canvas-masker`'s `MaskEditor`.
 *
 * While `mode === 'paint'`, the parent `MaskEditor` behaves normally — the
 * user paints masks freehand. While `mode === 'auto'`, an
 * {@link AutoSelectionOverlay} (driven by `result.overlayProps`) sits on top
 * of the editor and intercepts clicks; each click is forwarded to the SAM
 * backend (when `options.sam` is configured), which returns the mask of the
 * object under the cursor and writes it to the editor's mask canvas.
 */
export function useAutoSelection(options: AutoSelectionOptions): AutoSelectionResult {
    const {
        canvasRef,
        source,
        sam,
        maskStyle,
        initialMode = 'paint',
        onObjectDetected,
        onError,
    } = options;

    const [mode, setMode] = useState<AutoSelectionMode>(initialMode);
    const [status, setStatus] = useState<AutoSelectionStatus>('idle');
    const [isDetecting, setIsDetecting] = useState(false);
    const [lastDetected, setLastDetected] = useState<DetectedObject | undefined>(undefined);
    const [error, setError] = useState<Error | undefined>(undefined);

    const engineRef = useRef<SamEngineLike | undefined>(undefined);
    const engineKeyRef = useRef<string | undefined>(undefined);
    const activeAbortRef = useRef<AbortController | undefined>(undefined);

    const samKey = useMemo(() => {
        if (!sam) return undefined;
        return [
            sam.encoderUrl,
            sam.decoderUrl,
            sam.wasmPaths ?? '',
            (sam.executionProviders ?? []).join(','),
        ].join('|');
    }, [sam]);

    const ensureEngine = useCallback(async (): Promise<SamEngineLike | undefined> => {
        if (!sam || !samKey) return undefined;
        if (engineRef.current && engineKeyRef.current === samKey) return engineRef.current;
        engineRef.current?.dispose();
        const { createSamEngine } = await import('../backends/sam');
        engineRef.current = createSamEngine(sam);
        engineKeyRef.current = samKey;
        return engineRef.current;
    }, [sam, samKey]);

    useEffect(() => {
        return () => {
            activeAbortRef.current?.abort();
            engineRef.current?.dispose();
            engineRef.current = undefined;
            engineKeyRef.current = undefined;
        };
    }, []);

    useEffect(() => {
        if (!sam || !source) return;
        const controller = new AbortController();
        activeAbortRef.current?.abort();
        activeAbortRef.current = controller;
        setStatus('loading');
        (async () => {
            try {
                const engine = await ensureEngine();
                if (!engine || controller.signal.aborted) return;
                await engine.prepare(source, controller.signal);
                if (controller.signal.aborted) return;
                setStatus('ready');
            } catch (err) {
                if (controller.signal.aborted) return;
                const e = err instanceof Error ? err : new Error(String(err));
                setError(e);
                setStatus('error');
                onError?.(e);
            }
        })();
        return () => controller.abort();
    }, [sam, source, ensureEngine, onError]);

    const toggleMode = useCallback(() => {
        setMode((current) => (current === 'paint' ? 'auto' : 'paint'));
    }, []);

    const detectAt = useCallback(
        async (point: ImagePoint): Promise<DetectedObject | undefined> => {
            setError(undefined);
            if (!sam) {
                const err = new Error(
                    'useAutoSelection.detectAt: no backend configured. Pass a `sam` option or bring your own.',
                );
                setError(err);
                onError?.(err);
                throw err;
            }
            if (!source) {
                const err = new Error('useAutoSelection.detectAt: `source` is required.');
                setError(err);
                onError?.(err);
                throw err;
            }
            const maskCanvas = canvasRef.current?.maskCanvas;
            if (!maskCanvas) {
                const err = new Error(
                    'useAutoSelection.detectAt: maskCanvas not ready — ensure MaskEditor has mounted.',
                );
                setError(err);
                onError?.(err);
                throw err;
            }

            setIsDetecting(true);
            setStatus('detecting');
            const controller = new AbortController();
            activeAbortRef.current?.abort();
            activeAbortRef.current = controller;

            try {
                const engine = await ensureEngine();
                if (!engine) throw new Error('SAM engine unavailable.');
                const detected = await engine.detect(
                    source,
                    point,
                    maskCanvas.width,
                    maskCanvas.height,
                    controller.signal,
                );
                setStatus('ready');
                return detected;
            } catch (err) {
                const e = err instanceof Error ? err : new Error(String(err));
                setError(e);
                setStatus('error');
                onError?.(e);
                throw e;
            } finally {
                setIsDetecting(false);
            }
        },
        [sam, source, canvasRef, ensureEngine, onError],
    );

    const handleOverlayPick = useCallback(
        async (clientPoint: ClientPoint) => {
            const maskCanvas = canvasRef.current?.maskCanvas;
            if (!maskCanvas) return;
            const imagePoint = clientToImagePoint(
                clientPoint.clientX,
                clientPoint.clientY,
                maskCanvas,
            );
            if (!imagePoint) return;

            try {
                const detected = await detectAt(imagePoint);
                if (!detected) return;
                setLastDetected(detected);
                onObjectDetected?.(detected);
                applyMaskToCanvas(maskCanvas, detected, maskStyle);
            } catch {
                // detectAt already surfaced the failure via state and onError.
            }
        },
        [detectAt, canvasRef, maskStyle, onObjectDetected],
    );

    const invalidateEmbedding = useCallback(() => {
        engineRef.current?.invalidate();
    }, []);

    return {
        mode,
        setMode,
        toggleMode,
        isDetecting,
        status,
        lastDetected,
        error,
        detectAt,
        invalidateEmbedding,
        overlayProps: {
            active: mode === 'auto',
            isDetecting,
            onPick: handleOverlayPick,
        },
    };
}
