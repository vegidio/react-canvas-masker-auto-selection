import type { RefObject } from 'react';
import type { MaskEditorCanvasRef } from 'react-canvas-masker';

/**
 * Interaction mode for the underlying `MaskEditor`.
 *
 * - `paint`: default `react-canvas-masker` behavior — the user paints a mask
 *   freehand with the mouse.
 * - `auto`: clicks on the image are intercepted; the AI backend detects the
 *   object under the click point and writes its mask to the editor.
 */
export type AutoSelectionMode = 'paint' | 'auto';

/** A bounding box in image-pixel coordinates. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A point in image-pixel coordinates. */
export interface ImagePoint {
  x: number;
  y: number;
}

/**
 * A single object detected in the source image.
 *
 * `mask` is the binary alpha mask covering the object. When present, non-zero
 * pixels mark the object's silhouette — typically sized to either `bbox` or
 * the full image, depending on the backend.
 */
export interface DetectedObject {
  id: string;
  label?: string;
  score: number;
  bbox: BoundingBox;
  mask?: ImageData;
}

/** Options accepted by {@link useAutoSelection}. */
export interface AutoSelectionOptions {
  /** Ref to the underlying `MaskEditor` canvas API, used to write masks. */
  canvasRef: RefObject<MaskEditorCanvasRef | null>;
  /** Source image being edited. May be a URL, an HTMLImageElement, or a canvas. */
  source: string | HTMLImageElement | HTMLCanvasElement | null;
  /** Initial interaction mode. Defaults to `'paint'`. */
  initialMode?: AutoSelectionMode;
  /** Minimum confidence score (0-1) for a detection to be accepted. */
  minScore?: number;
  /** Called after a successful auto-detection, before the mask is written. */
  onObjectDetected?: (object: DetectedObject) => void;
  /** Called whenever a detection attempt fails. */
  onError?: (error: Error) => void;
}

/**
 * Props produced by {@link useAutoSelection} for spreading onto
 * {@link AutoSelectionOverlay}.
 */
export interface AutoSelectionOverlayDriverProps {
  /** When true, the overlay captures mouse events to drive auto-detection. */
  active: boolean;
  /** True while a detection request is in flight. */
  isDetecting: boolean;
  /** Called with the click position (in overlay-local pixels). */
  onPick: (point: ImagePoint) => void;
}

/** Return value of {@link useAutoSelection}. */
export interface AutoSelectionResult {
  /** Current interaction mode. */
  mode: AutoSelectionMode;
  /** Set the interaction mode explicitly. */
  setMode: (mode: AutoSelectionMode) => void;
  /** Toggle between `'paint'` and `'auto'`. */
  toggleMode: () => void;
  /** True while an auto-detection request is in flight. */
  isDetecting: boolean;
  /** The most recently detected object, or `null` before the first run. */
  lastDetected: DetectedObject | null;
  /** The most recent error, if any. */
  error: Error | null;
  /**
   * Programmatic detection at a specific image-pixel coordinate.
   *
   * Useful when integrating with custom UI (e.g. a coordinate input). The
   * overlay calls this internally when the user clicks in auto mode.
   */
  detectAt: (point: ImagePoint) => Promise<DetectedObject | null>;
  /** Props to spread onto {@link AutoSelectionOverlay}. */
  overlayProps: AutoSelectionOverlayDriverProps;
}
