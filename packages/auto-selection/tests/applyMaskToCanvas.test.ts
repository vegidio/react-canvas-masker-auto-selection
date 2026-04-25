import { describe, expect, it, vi } from 'vitest';
import type { DetectedObject } from '../src';
import { applyMaskToCanvas } from '../src';

const makeCtxSpy = () => {
    return {
        save: vi.fn(),
        restore: vi.fn(),
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        putImageData: vi.fn(),
        createImageData: vi.fn((w: number, h: number) => new ImageData(w, h)),
        globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
        globalAlpha: 1,
        fillStyle: '' as string | CanvasGradient | CanvasPattern,
        imageSmoothingEnabled: true,
    };
};

const makeCanvasWithSpy = (): {
    canvas: HTMLCanvasElement;
    ctx: ReturnType<typeof makeCtxSpy>;
} => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = makeCtxSpy();
    canvas.getContext = vi.fn(() => ctx) as unknown as HTMLCanvasElement['getContext'];

    return { canvas, ctx };
};

const makeObject = (overrides: Partial<DetectedObject> = {}): DetectedObject => {
    return {
        id: 'test-1',
        score: 0.9,
        bbox: { x: 2, y: 2, width: 4, height: 4 },
        ...overrides,
    };
};

describe('applyMaskToCanvas', () => {
    it('is a safe no-op when the canvas is undefined', () => {
        expect(() => applyMaskToCanvas(undefined, makeObject())).not.toThrow();
    });

    it('paints the bbox when no mask is present', () => {
        const { canvas, ctx } = makeCanvasWithSpy();
        applyMaskToCanvas(canvas, makeObject({ bbox: { x: 2, y: 2, width: 4, height: 4 } }));

        expect(ctx.save).toHaveBeenCalled();
        expect(ctx.fillRect).toHaveBeenCalledWith(2, 2, 4, 4);
        expect(ctx.restore).toHaveBeenCalled();
    });

    it('honors the default color and opacity when no style is passed', () => {
        const { canvas, ctx } = makeCanvasWithSpy();
        applyMaskToCanvas(canvas, makeObject());

        expect(ctx.fillStyle).toBe('#ffffff');
        expect(ctx.globalAlpha).toBeCloseTo(1);
        expect(ctx.globalCompositeOperation).toBe('source-over');
    });

    it('honors a custom color/opacity/blendMode', () => {
        const { canvas, ctx } = makeCanvasWithSpy();
        applyMaskToCanvas(canvas, makeObject(), {
            color: '#ff0000',
            opacity: 0.5,
            blendMode: 'multiply',
        });

        expect(ctx.fillStyle).toBe('#ff0000');
        expect(ctx.globalAlpha).toBeCloseTo(0.5);
        expect(ctx.globalCompositeOperation).toBe('multiply');
    });

    it('takes the mask path (not the bbox fallback) when a mask is present', () => {
        const { canvas, ctx } = makeCanvasWithSpy();
        const mask = new ImageData(4, 4);
        applyMaskToCanvas(canvas, makeObject({ mask }));

        expect(ctx.save).toHaveBeenCalled();
        expect(ctx.fillRect).not.toHaveBeenCalled();
    });
});
