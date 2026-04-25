/**
 * Returns an `OffscreenCanvas` when available, falling back to a detached `HTMLCanvasElement`. Internal helper shared
 * by the mask compositor and the SAM pre/postprocess paths.
 */
export const createCanvas = (
    width: number,
    height: number,
): HTMLCanvasElement | OffscreenCanvas => {
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height);
    }

    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;

    return c;
};
