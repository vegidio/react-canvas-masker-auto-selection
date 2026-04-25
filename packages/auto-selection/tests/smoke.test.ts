import { act, renderHook } from '@testing-library/react';
import { createRef, type RefObject } from 'react';
import type { MaskEditorCanvasRef } from 'react-canvas-masker';
import { describe, expect, it } from 'vitest';
import { AutoSelectionOverlay, applyMaskToCanvas, useAutoSelection } from '../src';

describe('public API surface', () => {
    it('exports the hook, overlay, and utility', () => {
        expect(typeof useAutoSelection).toBe('function');
        expect(typeof AutoSelectionOverlay).toBe('function');
        expect(typeof applyMaskToCanvas).toBe('function');
    });
});

describe('useAutoSelection', () => {
    const canvasRef = createRef<MaskEditorCanvasRef>() as RefObject<MaskEditorCanvasRef | null>;

    it('starts in paint mode and toggles to auto', () => {
        const { result } = renderHook(() => useAutoSelection({ canvasRef }));

        expect(result.current.mode).toBe('paint');
        expect(result.current.overlayProps.active).toBe(false);

        act(() => result.current.toggleMode());

        expect(result.current.mode).toBe('auto');
        expect(result.current.overlayProps.active).toBe(true);
    });

    it('respects initialMode', () => {
        const { result } = renderHook(() => useAutoSelection({ canvasRef, initialMode: 'auto' }));

        expect(result.current.mode).toBe('auto');
        expect(result.current.overlayProps.active).toBe(true);
    });
});
