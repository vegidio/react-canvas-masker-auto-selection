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

/** A point in viewport client coordinates (matches `MouseEvent.clientX/Y`). */
export interface ClientPoint {
  clientX: number;
  clientY: number;
}

/**
 * A single object detected in the source image.
 *
 * `mask` is an alpha-only mask covering the object, sized to the full image.
 * Non-zero alpha marks the object's silhouette; `applyMaskToCanvas` tints it
 * with the caller's color/opacity before compositing onto the mask canvas.
 */
export interface DetectedObject {
  id: string;
  label?: string;
  score: number;
  bbox: BoundingBox;
  mask?: ImageData;
}

/** Styling applied when compositing a detected mask onto the MaskEditor canvas. */
export interface MaskStyle {
  /**
   * Fill color (CSS color string). Defaults to `'#ffffff'`, matching
   * `react-canvas-masker`'s default `maskColor` so auto-detected masks are
   * visually indistinguishable from manual paint. If you override `maskColor`
   * on `<MaskEditor>`, pass a matching `color` here.
   */
  color?: string;
  /**
   * Alpha multiplier for the final draw (0-1). Defaults to `1`. The
   * render-time mask dimming is controlled by `react-canvas-masker`'s
   * `maskOpacity` CSS, which applies uniformly to all pixels on the canvas.
   */
  opacity?: number;
  /** Canvas compositing operation for the final draw. Defaults to `'source-over'`. */
  blendMode?: GlobalCompositeOperation;
}

/** Configuration for the bundled SAM (SlimSAM-77) backend. */
export interface SamConfig {
  /** URL of the quantized vision encoder ONNX file. */
  encoderUrl: string;
  /** URL of the quantized combined prompt_encoder + mask_decoder ONNX file. */
  decoderUrl: string;
  /** Optional override for `ort.env.wasm.wasmPaths`. Set only if provided. */
  wasmPaths?: string;
  /**
   * ONNX Runtime execution providers, in preference order. Defaults to
   * `['wasm']` because `onnxruntime-web@1.24`'s WebGPU EP produces corrupt
   * output for the INT8-quantized SlimSAM-77 export (some ops fall back to
   * CPU and the EP boundary mangles quantized activations).
   */
  executionProviders?: ('webgpu' | 'wasm')[];
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
  /**
   * SAM backend config. When present, clicks in auto mode run SlimSAM-77 via
   * `onnxruntime-web`. When omitted, `detectAt` throws "not implemented".
   */
  sam?: SamConfig;
  /** Color/opacity/blend used when compositing detected masks. */
  maskStyle?: MaskStyle;
}

/**
 * Props produced by {@link useAutoSelection} for spreading onto
 * {@link AutoSelectionOverlay}.
 *
 * `onPick` receives client coordinates (matching `MouseEvent.clientX/clientY`);
 * the hook maps them to image-pixel coordinates using the mask canvas's
 * bounding rect so CSS zoom/pan and `devicePixelRatio` are handled correctly.
 */
export interface AutoSelectionOverlayDriverProps {
  /** When true, the overlay captures mouse events to drive auto-detection. */
  active: boolean;
  /** True while a detection request is in flight. */
  isDetecting: boolean;
  /** Called with the click position in viewport client coordinates. */
  onPick: (point: ClientPoint) => void;
}

/** Lifecycle state of the auto-selection backend. */
export type AutoSelectionStatus = 'idle' | 'loading' | 'encoding' | 'ready' | 'detecting' | 'error';

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
  /** Coarser lifecycle state covering model load, encoding, and detection. */
  status: AutoSelectionStatus;
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
  /**
   * Drops the cached encoder embedding, forcing the next `detectAt` call to
   * re-encode the current source. Only needed if consumers mutate an
   * `HTMLCanvasElement` source in place.
   */
  invalidateEmbedding: () => void;
}
