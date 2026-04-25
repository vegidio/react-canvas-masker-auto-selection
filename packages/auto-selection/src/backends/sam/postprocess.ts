import type { BoundingBox } from '../../types';
import { createCanvas } from '../../utils/createCanvas';
import { SAM_INPUT_SIZE } from './preprocess';

/**
 * Converts SAM's low-res mask logits (256×256 representing the 1024×1024 padded input frame) into a full-resolution
 * alpha-only `ImageData` at the original image's dimensions.
 *
 * The 256×256 mask covers the padded frame, so we first sample only the top-left subregion corresponding to the
 * unpadded, resized image, then stretch that to the target (original image) dimensions. Without this, the padding
 * region on the right/bottom of non-square images would leak into the output.
 */
export const logitsToMask = (
    logits: Float32Array,
    logitsShape: readonly [number, number],
    resizedSize: readonly [number, number],
    targetWidth: number,
    targetHeight: number,
): { mask: ImageData; bbox: BoundingBox } => {
    const [logitsH, logitsW] = logitsShape;
    const [resizedW, resizedH] = resizedSize;

    const srcW = Math.max(1, Math.round((logitsW * resizedW) / SAM_INPUT_SIZE));
    const srcH = Math.max(1, Math.round((logitsH * resizedH) / SAM_INPUT_SIZE));

    const logitCanvas = createCanvas(logitsW, logitsH);
    const logitCtx = logitCanvas.getContext('2d');
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
    const targetCtx = targetCanvas.getContext('2d');

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

    const data = mask.data;
    let minX = targetWidth;
    let minY = targetHeight;
    let maxX = -1;
    let maxY = -1;

    for (let i = 3, p = 0; i < data.length; i += 4, p += 1) {
        if ((data[i] as number) >= 128) {
            const x = p % targetWidth;
            const y = (p / targetWidth) | 0;

            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }

    const bbox: BoundingBox =
        maxX < 0
            ? { x: 0, y: 0, width: 0, height: 0 }
            : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };

    return { mask, bbox };
};

/** Picks the mask index with the highest IoU score. */
export const pickBestMask = (iouScores: Float32Array, numMasks: number): number => {
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
};
