import { useCallback, useState } from 'react';
import type {
  AutoSelectionMode,
  AutoSelectionOptions,
  AutoSelectionResult,
  DetectedObject,
  ImagePoint,
} from '../types';
import { applyMaskToCanvas } from '../utils/applyMaskToCanvas';

/**
 * Adds an auto-selection mode on top of `react-canvas-masker`'s `MaskEditor`.
 *
 * The hook owns a `mode` state. While `mode === 'paint'`, the parent
 * `MaskEditor` behaves normally — the user paints masks freehand. While
 * `mode === 'auto'`, an {@link AutoSelectionOverlay} (driven by
 * `result.overlayProps`) sits on top of the editor and intercepts clicks; each
 * click is forwarded to the AI backend, which returns the mask of the object
 * under the cursor and writes it to the editor's mask canvas.
 */
export function useAutoSelection(options: AutoSelectionOptions): AutoSelectionResult {
  const { canvasRef, initialMode = 'paint', onObjectDetected, onError } = options;

  const [mode, setMode] = useState<AutoSelectionMode>(initialMode);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastDetected, setLastDetected] = useState<DetectedObject | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'paint' ? 'auto' : 'paint'));
  }, []);

  const detectAt = useCallback(
    async (_point: ImagePoint): Promise<DetectedObject | null> => {
      // TODO: implement — call the chosen ML backend (e.g. SAM via ONNX Runtime
      // Web, transformers.js, or a remote inference API) with `options.source`
      // and the click point, and return the segmentation of the clicked object.
      setIsDetecting(true);
      setError(null);
      try {
        const err = new Error('useAutoSelection.detectAt: AI backend not implemented yet');
        setError(err);
        onError?.(err);
        throw err;
      } finally {
        setIsDetecting(false);
      }
    },
    [onError],
  );

  const handleOverlayPick = useCallback(
    async (point: ImagePoint) => {
      try {
        const detected = await detectAt(point);
        if (!detected) return;
        setLastDetected(detected);
        onObjectDetected?.(detected);
        applyMaskToCanvas(canvasRef.current?.maskCanvas ?? null, detected);
      } catch {
        // detectAt already surfaced the failure via state and onError.
      }
    },
    [detectAt, canvasRef, onObjectDetected],
  );

  return {
    mode,
    setMode,
    toggleMode,
    isDetecting,
    lastDetected,
    error,
    detectAt,
    overlayProps: {
      active: mode === 'auto',
      isDetecting,
      onPick: handleOverlayPick,
    },
  };
}
