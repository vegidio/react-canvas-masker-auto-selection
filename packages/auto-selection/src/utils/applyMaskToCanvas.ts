import type { DetectedObject } from '../types';

/**
 * Paints a detected object's mask onto a `react-canvas-masker` mask canvas.
 *
 * Pass the `maskCanvas` from a `MaskEditorCanvasRef` together with the chosen
 * `DetectedObject`. Existing mask pixels are preserved; the new mask is
 * composited on top.
 */
export function applyMaskToCanvas(
  _maskCanvas: HTMLCanvasElement | null | undefined,
  _object: DetectedObject,
): void {
  // TODO: implement — draw `object.mask` (or a filled `object.bbox` fallback)
  // onto the mask canvas using the same color/opacity conventions as
  // react-canvas-masker's MaskEditor.
}
