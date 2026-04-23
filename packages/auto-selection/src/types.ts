/**
 * A bounding box in image-pixel coordinates.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A single object detected in the source image.
 *
 * `mask` is an optional binary alpha mask sized to match `bbox` (or the full
 * image, depending on the backend). When present, non-zero pixels mark the
 * object's silhouette.
 */
export interface DetectedObject {
  id: string;
  label?: string;
  score: number;
  bbox: BoundingBox;
  mask?: ImageData;
}

/**
 * Options accepted by {@link useAutoSelection}.
 */
export interface AutoSelectionOptions {
  /** Source image to analyze. May be a URL, an HTMLImageElement, or a canvas. */
  source: string | HTMLImageElement | HTMLCanvasElement | null;
  /** Minimum confidence score (0-1) for a detection to be returned. */
  minScore?: number;
  /** Maximum number of objects to return. */
  maxObjects?: number;
  /** Optional CORS mode used when `source` is a URL. */
  crossOrigin?: 'anonymous' | 'use-credentials';
}

/**
 * Return value of {@link useAutoSelection}.
 */
export interface AutoSelectionResult {
  /** Trigger a detection pass against the current `source`. */
  detect: () => Promise<DetectedObject[]>;
  /** True once any underlying model/runtime is initialized and ready to detect. */
  isReady: boolean;
  /** True while a detection pass is in flight. */
  isLoading: boolean;
  /** The most recent set of detected objects, or `null` before the first run. */
  objects: DetectedObject[] | null;
  /** The most recent error, if any. */
  error: Error | null;
}
