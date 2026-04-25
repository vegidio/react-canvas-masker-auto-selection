import { describe, expect, it } from 'vitest';
import { clientToImagePoint } from '../src';

const makeCanvas = (
    width: number,
    height: number,
    rect: { left: number; top: number; width: number; height: number },
): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    canvas.getBoundingClientRect = () => ({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        x: rect.left,
        y: rect.top,
        toJSON() {
            return this;
        },
    });

    return canvas;
};

describe('clientToImagePoint', () => {
    it('returns undefined when the canvas has a zero-sized rect', () => {
        const canvas = makeCanvas(100, 100, { left: 0, top: 0, width: 0, height: 0 });
        expect(clientToImagePoint(10, 10, canvas)).toBeUndefined();
    });

    it('maps 1:1 when rect size matches backing-store size', () => {
        const canvas = makeCanvas(100, 50, { left: 0, top: 0, width: 100, height: 50 });
        expect(clientToImagePoint(25, 10, canvas)).toEqual({ x: 25, y: 10 });
    });

    it('scales up when the canvas is displayed smaller than its backing store', () => {
        const canvas = makeCanvas(1000, 500, { left: 0, top: 0, width: 100, height: 50 });
        expect(clientToImagePoint(50, 25, canvas)).toEqual({ x: 500, y: 250 });
    });

    it('accounts for the rect offset on the viewport', () => {
        const canvas = makeCanvas(200, 200, { left: 20, top: 40, width: 200, height: 200 });
        expect(clientToImagePoint(120, 140, canvas)).toEqual({ x: 100, y: 100 });
    });
});
