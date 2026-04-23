import type { BoundingBox } from '../../types';

const SAM_PAD_SIZE = 1024;

/**
 * Converts SAM's low-res mask logits (256×256 representing the 1024×1024
 * padded input frame) into a full-resolution alpha-only `ImageData` at the
 * original image's dimensions.
 *
 * The 256×256 mask covers the padded frame, so we first sample only the
 * top-left subregion corresponding to the unpadded, resized image, then
 * stretch that to the target (original image) dimensions. Without this, the
 * padding region on the right/bottom of non-square images would leak into the
 * output.
 */
export function logitsToMask(
  logits: Float32Array,
  logitsShape: readonly [number, number],
  resizedSize: readonly [number, number],
  targetWidth: number,
  targetHeight: number,
): { mask: ImageData; bbox: BoundingBox } {
  const [logitsH, logitsW] = logitsShape;
  const [resizedW, resizedH] = resizedSize;

  const srcW = Math.max(1, Math.round((logitsW * resizedW) / SAM_PAD_SIZE));
  const srcH = Math.max(1, Math.round((logitsH * resizedH) / SAM_PAD_SIZE));

  const logitCanvas = createCanvas(logitsW, logitsH);
  const logitCtx = logitCanvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!logitCtx) throw new Error('Failed to acquire 2D context for mask upscaling.');

  const logitImage = logitCtx.createImageData(logitsW, logitsH);
  for (let i = 0; i < logitsW * logitsH; i += 1) {
    const active = (logits[i] ?? 0) > 0 ? 255 : 0;
    logitImage.data[i * 4] = 0;
    logitImage.data[i * 4 + 1] = 0;
    logitImage.data[i * 4 + 2] = 0;
    logitImage.data[i * 4 + 3] = active;
  }
  logitCtx.putImageData(logitImage, 0, 0);

  const targetCanvas = createCanvas(targetWidth, targetHeight);
  const targetCtx = targetCanvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!targetCtx) throw new Error('Failed to acquire 2D context for target mask.');

  targetCtx.imageSmoothingEnabled = true;
  targetCtx.drawImage(
    logitCanvas as CanvasImageSource,
    0,
    0,
    srcW,
    srcH,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  const mask = targetCtx.getImageData(0, 0, targetWidth, targetHeight);

  let minX = targetWidth;
  let minY = targetHeight;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const alpha = mask.data[(y * targetWidth + x) * 4 + 3] ?? 0;
      if (alpha >= 128) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bbox: BoundingBox =
    maxX < 0
      ? { x: 0, y: 0, width: 0, height: 0 }
      : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };

  return { mask, bbox };
}

/** Picks the mask index with the highest IoU score. */
export function pickBestMask(iouScores: Float32Array, numMasks: number): number {
  let bestIdx = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < numMasks; i += 1) {
    const score = iouScores[i] ?? -Infinity;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}
