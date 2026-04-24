const SAM_INPUT_SIZE = 1024;
const MEAN_R = 123.675;
const MEAN_G = 116.28;
const MEAN_B = 103.53;
const STD_R = 58.395;
const STD_G = 57.12;
const STD_B = 57.375;

export interface PreprocessedImage {
  /** Float32 tensor data, CHW layout (3 * 1024 * 1024). */
  data: Float32Array;
  /** Tensor dims: `[1, 3, 1024, 1024]`. */
  dims: readonly [number, number, number, number];
  /** Original image pixel dimensions `[width, height]`. */
  origSize: [number, number];
  /** Size of the image after resize, before padding `[width, height]`. */
  resizedSize: [number, number];
}

export async function sourceToEncoderInput(
  source: string | HTMLImageElement | HTMLCanvasElement,
): Promise<PreprocessedImage> {
  const bitmap = await loadAsBitmap(source);
  const origW = bitmap.width;
  const origH = bitmap.height;

  const scale = SAM_INPUT_SIZE / Math.max(origW, origH);
  const resizedW = Math.round(origW * scale);
  const resizedH = Math.round(origH * scale);

  const canvas = createCanvas(SAM_INPUT_SIZE, SAM_INPUT_SIZE);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error('Failed to acquire 2D context for SAM preprocessing.');

  ctx.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, resizedW, resizedH);
  const imageData = ctx.getImageData(0, 0, SAM_INPUT_SIZE, SAM_INPUT_SIZE);

  const data = new Float32Array(3 * SAM_INPUT_SIZE * SAM_INPUT_SIZE);
  const pixels = imageData.data;
  const plane = SAM_INPUT_SIZE * SAM_INPUT_SIZE;
  for (let i = 0; i < plane; i += 1) {
    const offset = i * 4;
    data[i] = ((pixels[offset] ?? 0) - MEAN_R) / STD_R;
    data[plane + i] = ((pixels[offset + 1] ?? 0) - MEAN_G) / STD_G;
    data[2 * plane + i] = ((pixels[offset + 2] ?? 0) - MEAN_B) / STD_B;
  }

  return {
    data,
    dims: [1, 3, SAM_INPUT_SIZE, SAM_INPUT_SIZE],
    origSize: [origW, origH],
    resizedSize: [resizedW, resizedH],
  };
}

async function loadAsBitmap(
  source: string | HTMLImageElement | HTMLCanvasElement,
): Promise<ImageBitmap | HTMLImageElement | HTMLCanvasElement> {
  if (typeof source === 'string') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${source}`));
      img.src = source;
    });
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(img);
    }
    return img;
  }
  return source;
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

/**
 * Map an image-space point to the 1024-padded input space SAM's decoder expects.
 *
 * Returns `[x, y]` in pixels within the 1024×1024 input tensor frame.
 */
export function imagePointToInputSpace(
  imageX: number,
  imageY: number,
  origSize: readonly [number, number],
  resizedSize: readonly [number, number],
): [number, number] {
  const [origW, origH] = origSize;
  const [rW, rH] = resizedSize;
  const x = (imageX / origW) * rW;
  const y = (imageY / origH) * rH;
  return [x, y];
}

export { SAM_INPUT_SIZE };
