import { act, renderHook, waitFor } from '@testing-library/react';
import { createRef, type RefObject } from 'react';
import type { MaskEditorCanvasRef } from 'react-canvas-masker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DetectedObject, SamConfig } from '../src';
import { useAutoSelection } from '../src';

const mockEngine = {
    prepare: vi.fn(),
    detect: vi.fn(),
    invalidate: vi.fn(),
    dispose: vi.fn(),
};

vi.mock('../src/backends/sam', () => ({
    createSamEngine: vi.fn(() => mockEngine),
    clearSamCache: vi.fn(),
}));

function makeCanvasRef(): {
    ref: RefObject<MaskEditorCanvasRef | null>;
    canvas: HTMLCanvasElement;
} {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    canvas.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 200,
        height: 100,
        right: 200,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON() {
            return this;
        },
    });
    const maskRef: MaskEditorCanvasRef = {
        maskCanvas: canvas,
        undo: () => {},
        redo: () => {},
        clear: () => {},
        resetZoom: () => {},
        setPan: () => {},
        zoomIn: () => {},
        zoomOut: () => {},
    };
    const ref = createRef<MaskEditorCanvasRef>() as RefObject<MaskEditorCanvasRef | null>;
    (ref as { current: MaskEditorCanvasRef | null }).current = maskRef;
    return { ref, canvas };
}

const SAM_CONFIG: SamConfig = {
    encoderUrl: 'https://example.test/encoder.onnx',
    decoderUrl: 'https://example.test/decoder.onnx',
};

beforeEach(() => {
    mockEngine.prepare.mockReset().mockResolvedValue(undefined);
    mockEngine.detect.mockReset();
    mockEngine.invalidate.mockReset();
    mockEngine.dispose.mockReset();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('useAutoSelection — mode state', () => {
    it('starts in paint mode and toggles to auto', () => {
        const { ref } = makeCanvasRef();
        const { result } = renderHook(() => useAutoSelection({ canvasRef: ref }));
        expect(result.current.mode).toBe('paint');
        act(() => result.current.toggleMode());
        expect(result.current.mode).toBe('auto');
    });

    it('respects initialMode', () => {
        const { ref } = makeCanvasRef();
        const { result } = renderHook(() =>
            useAutoSelection({ canvasRef: ref, initialMode: 'auto' }),
        );
        expect(result.current.mode).toBe('auto');
    });
});

describe('useAutoSelection — no backend', () => {
    it('detectAt throws when `sam` is not provided', async () => {
        const { ref } = makeCanvasRef();
        const { result } = renderHook(() =>
            useAutoSelection({ canvasRef: ref, source: 'https://example.test/img.png' }),
        );
        await expect(result.current.detectAt({ x: 1, y: 1 })).rejects.toThrow(
            /no backend configured/i,
        );
    });
});

describe('useAutoSelection — with mocked SAM backend', () => {
    it('prepares the engine when source is set', async () => {
        const { ref } = makeCanvasRef();
        renderHook(() =>
            useAutoSelection({
                canvasRef: ref,
                source: 'https://example.test/img.png',
                sam: SAM_CONFIG,
            }),
        );
        await waitFor(() => expect(mockEngine.prepare).toHaveBeenCalledTimes(1));
    });

    it('transitions status through loading → ready', async () => {
        const { ref } = makeCanvasRef();
        const { result } = renderHook(() =>
            useAutoSelection({
                canvasRef: ref,
                source: 'https://example.test/img.png',
                sam: SAM_CONFIG,
            }),
        );
        await waitFor(() => expect(result.current.status).toBe('ready'));
    });

    it('detectAt maps overlay client coords to image-space and forwards to the engine', async () => {
        const detected: DetectedObject = {
            id: 'detected-1',
            score: 0.95,
            bbox: { x: 10, y: 10, width: 20, height: 20 },
        };
        mockEngine.detect.mockResolvedValue(detected);

        const { ref } = makeCanvasRef();
        const onObjectDetected = vi.fn();
        const { result } = renderHook(() =>
            useAutoSelection({
                canvasRef: ref,
                source: 'https://example.test/img.png',
                sam: SAM_CONFIG,
                onObjectDetected,
            }),
        );
        await waitFor(() => expect(result.current.status).toBe('ready'));

        await act(async () => {
            await result.current.overlayProps.onPick({ clientX: 100, clientY: 50 });
        });

        expect(mockEngine.detect).toHaveBeenCalledTimes(1);
        const [sourceArg, pointArg, widthArg, heightArg] = mockEngine.detect.mock.calls[0] ?? [];
        expect(sourceArg).toBe('https://example.test/img.png');
        expect(pointArg).toEqual({ x: 100, y: 50 });
        expect(widthArg).toBe(200);
        expect(heightArg).toBe(100);
        expect(result.current.lastDetected?.id).toBe('detected-1');
        expect(onObjectDetected).toHaveBeenCalledWith(detected);
    });

    it('invalidateEmbedding calls engine.invalidate', async () => {
        const { ref } = makeCanvasRef();
        const { result } = renderHook(() =>
            useAutoSelection({
                canvasRef: ref,
                source: 'https://example.test/img.png',
                sam: SAM_CONFIG,
            }),
        );
        await waitFor(() => expect(result.current.status).toBe('ready'));
        act(() => result.current.invalidateEmbedding());
        expect(mockEngine.invalidate).toHaveBeenCalledTimes(1);
    });

    it('surfaces backend errors via state and onError', async () => {
        mockEngine.prepare.mockRejectedValue(new Error('boom'));
        const onError = vi.fn();
        const { ref } = makeCanvasRef();
        const { result } = renderHook(() =>
            useAutoSelection({
                canvasRef: ref,
                source: 'https://example.test/img.png',
                sam: SAM_CONFIG,
                onError,
            }),
        );
        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.error?.message).toBe('boom');
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
});
