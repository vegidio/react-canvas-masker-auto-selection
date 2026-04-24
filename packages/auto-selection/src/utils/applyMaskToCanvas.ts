import type { DetectedObject, MaskStyle } from '../types';

const DEFAULT_COLOR = '#ffffff';
const DEFAULT_OPACITY = 1;
const DEFAULT_BLEND: GlobalCompositeOperation = 'source-over';

/**
 * Paints a detected object's mask onto a `react-canvas-masker` mask canvas.
 *
 * If `object.mask` is present, its alpha channel is used as the silhouette,
 * tinted with `style.color` and blended with `style.opacity` /
 * `style.blendMode`. If the mask is absent, `object.bbox` is filled as a
 * rectangle fallback. Existing pixels on the mask canvas are preserved; the
 * new mask unions on top.
 *
 * Exported for consumers driving `detectAt` themselves who want to apply the
 * result manually.
 */
export function applyMaskToCanvas(
  maskCanvas: HTMLCanvasElement | null | undefined,
  object: DetectedObject,
  style: MaskStyle = {},
): void {
  if (!maskCanvas) return;

  const ctx = maskCanvas.getContext('2d');
  if (!ctx) return;

  const color = style.color ?? DEFAULT_COLOR;
  const opacity = style.opacity ?? DEFAULT_OPACITY;
  const blendMode = style.blendMode ?? DEFAULT_BLEND;

  ctx.save();
  ctx.globalCompositeOperation = blendMode;
  ctx.globalAlpha = opacity;

  if (object.mask) {
    const offscreen = createOffscreen(object.mask.width, object.mask.height);
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      offCtx.putImageData(object.mask, 0, 0);
      offCtx.globalCompositeOperation = 'source-in';
      offCtx.fillStyle = color;
      offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
      ctx.drawImage(
        offscreen as CanvasImageSource,
        0,
        0,
        offscreen.width,
        offscreen.height,
        0,
        0,
        maskCanvas.width,
        maskCanvas.height,
      );
    }
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(object.bbox.x, object.bbox.y, object.bbox.width, object.bbox.height);
  }

  ctx.restore();
}

function createOffscreen(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}
