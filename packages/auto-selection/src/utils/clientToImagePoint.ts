import type { ImagePoint } from '../types';

/**
 * Maps a viewport client point to image-pixel coordinates within a canvas.
 *
 * Uses the canvas's `getBoundingClientRect` so any CSS transform (scale, pan,
 * `devicePixelRatio`) applied to the canvas is absorbed in a single ratio.
 * Returns `null` when the canvas is detached (zero-sized rect).
 */
export function clientToImagePoint(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): ImagePoint | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: ((clientX - rect.left) * canvas.width) / rect.width,
    y: ((clientY - rect.top) * canvas.height) / rect.height,
  };
}
