# react-canvas-masker-auto-selection

A plugin for [`react-canvas-masker`](https://github.com/3rChuss/react-canvas-masker) that adds an **auto-selection mode**. The user toggles between the parent library's default freehand painting and a click-to-mask mode where each click on the image is sent to [SlimSAM-77](https://huggingface.co/Xenova/slimsam-77-uniform) — a quantized distillation of Segment Anything — running locally in the browser via [`onnxruntime-web`](https://onnxruntime.ai/docs/tutorials/web/). The detected object's mask is written into the editor's `maskCanvas`.

- ~14 MB of quantized ONNX weights, downloaded once and cached via the browser `Cache` API.
- WASM execution by default (see the WebGPU note below).
- Zero server: all inference runs on the user's device.

## Install

```bash
pnpm add react-canvas-masker react-canvas-masker-auto-selection onnxruntime-web
```

Peer dependencies:

- `react`, `react-dom` (`>=18 <20`)
- `react-canvas-masker` (`^1.2.0`)
- `onnxruntime-web` (`^1.24.3`) — **optional**. Only required if you use the bundled SAM backend; if you bring your own backend, you can omit it.

## Usage

```tsx
import { useRef } from 'react';
import { MaskEditor, type MaskEditorCanvasRef } from 'react-canvas-masker';
import {
  AutoSelectionOverlay,
  useAutoSelection,
} from 'react-canvas-masker-auto-selection';

const SAM = {
  encoderUrl: '/models/vision_encoder_quantized.onnx',
  decoderUrl: '/models/prompt_encoder_mask_decoder_quantized.onnx',
  wasmPaths: '/ort/',
};

export function Editor({ src }: { src: string }) {
  const canvasRef = useRef<MaskEditorCanvasRef>(null);
  const auto = useAutoSelection({ canvasRef, source: src, sam: SAM });

  return (
    <>
      <div style={{ position: 'relative' }}>
        <MaskEditor src={src} canvasRef={canvasRef} onDrawingChange={() => {}} />
        <AutoSelectionOverlay {...auto.overlayProps} />
      </div>

      <button type="button" onClick={auto.toggleMode}>
        Switch to {auto.mode === 'paint' ? 'auto-select' : 'paint'} mode
      </button>
      <p>Status: {auto.status}</p>
    </>
  );
}
```

While `auto.mode === 'paint'` the overlay is fully click-through and `MaskEditor` behaves as usual. While `auto.mode === 'auto'` the overlay captures clicks, hands them to the SAM backend, and composites the resulting mask onto `maskCanvas` with react-canvas-masker's default color/opacity (overridable via `maskStyle`).

## Model weights

The `sam.encoderUrl` / `sam.decoderUrl` must point to the [SlimSAM-77 quantized ONNX exports](https://huggingface.co/Xenova/slimsam-77-uniform/tree/main/onnx):

- `vision_encoder_quantized.onnx` (~8.9 MB)
- `prompt_encoder_mask_decoder_quantized.onnx` (~4.9 MB)

For production you should **self-host** these files with strong cache headers (`Cache-Control: public, max-age=31536000, immutable`) rather than relying on Hugging Face's CDN at runtime. The first time a user triggers auto-select, the library downloads both files, stores them in `caches.open('rcm-auto-selection-sam-v1')`, and serves every subsequent page load from that cache with zero network — even across browser restarts.

Call `clearSamCache()` to drop the cache during development.

## `onnxruntime-web` WASM files

`onnxruntime-web` fetches its own WASM runtime (`ort-wasm-simd-threaded.*`) at load time. By default, it pulls them from `cdn.jsdelivr.net`. Override this to serve them from your own origin.

**Vite recipe (recommended):** add a small plugin that copies the WASM into `public/ort/` on dev/build, then pass `wasmPaths: '/ort/'`.

```ts
// vite.config.ts
import { createRequire } from 'node:module';
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

export function copyOnnxRuntimeAssets(): Plugin {
  const sourceDir = `${dirname(require.resolve('onnxruntime-web/package.json'))}/dist`;
  const targetDir = resolve(here, 'public/ort');
  const run = async () => {
    await mkdir(targetDir, { recursive: true });
    const files = (await readdir(sourceDir)).filter(
      (f) => f.endsWith('.wasm') || f.endsWith('.mjs'),
    );
    await Promise.all(files.map((n) => copyFile(join(sourceDir, n), join(targetDir, n))));
  };
  return {
    name: 'copy-onnxruntime',
    buildStart: run,
    configureServer: run,
  };
}
```

**Alternative — CDN:** `wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@<ver>/dist/'` with an explicit version pin.

## API

- `useAutoSelection({ canvasRef, source, sam?, maskStyle?, initialMode?, minScore?, onObjectDetected?, onError? })` — owns the `'paint' | 'auto'` mode state. Returns `{ mode, setMode, toggleMode, status, isDetecting, lastDetected, error, detectAt, invalidateEmbedding, overlayProps }`.
- `<AutoSelectionOverlay {...overlayProps} />` — the click-intercepting layer; spread `overlayProps` from the hook. Place it inside a positioned ancestor that matches the `MaskEditor`'s rendered area.
- `applyMaskToCanvas(maskCanvas, object, style?)` — low-level utility used internally by the hook; exported so callers driving `detectAt` themselves can write the mask manually.
- `clientToImagePoint(clientX, clientY, maskCanvas)` — map a viewport click to image-pixel coordinates using the canvas's bounding rect (handles CSS transforms and `devicePixelRatio`).
- `clearSamCache()` — drop the persistent ONNX weight cache.
- Types: `AutoSelectionMode`, `AutoSelectionOptions`, `AutoSelectionResult`, `AutoSelectionStatus`, `AutoSelectionOverlayDriverProps`, `DetectedObject`, `BoundingBox`, `ImagePoint`, `ClientPoint`, `MaskStyle`, `SamConfig`.

### `maskStyle` — keeping auto masks visually identical to manual paint

The plugin writes detected masks directly to `react-canvas-masker`'s `maskCanvas` (the parent library doesn't expose a paint-for-me API, so there is no other way). By default the plugin writes pixels the same way manual paint does: `color: '#ffffff'`, `opacity: 1` — matching `react-canvas-masker`'s default `maskColor`. With defaults on both sides, a manually painted stroke and an auto-detected silhouette are pixel-identical on the canvas and render identically under the parent library's `maskOpacity` / `maskBlendMode` CSS.

If you override `maskColor` on `<MaskEditor>`, pass a matching `maskStyle.color` to `useAutoSelection`:

```tsx
<MaskEditor src={src} canvasRef={canvasRef} maskColor="red" onDrawingChange={() => {}} />
// then…
useAutoSelection({ canvasRef, source: src, sam: SAM, maskStyle: { color: 'red' } });
```

`maskOpacity` and `maskBlendMode` are applied as CSS to the whole mask canvas by `react-canvas-masker` and cover both paint paths automatically — no forwarding needed.

### `sam` config

```ts
interface SamConfig {
  encoderUrl: string;
  decoderUrl: string;
  wasmPaths?: string;                          // default: onnxruntime-web CDN
  executionProviders?: ('webgpu' | 'wasm')[];  // default: ['wasm']
}
```

> **Known issue — WebGPU + quantized SAM.** `onnxruntime-web@1.24` cannot assign every op in the INT8-quantized SlimSAM-77 export to its WebGPU EP; the ones that fall back to CPU round-trip quantized activations across the EP boundary, which silently corrupts the mask logits. The symptom is a noisy/tiled mask and `iou_scores > 1.0`. Keep the default `['wasm']` unless you are shipping a different SAM export (e.g. FP16 or non-quantized) that you have confirmed runs cleanly on WebGPU end-to-end.

### `status` lifecycle

`idle` → `loading` (downloading ONNX files, initializing sessions, and running the vision encoder on the current source; the embedding is cached afterwards) → `ready` → `detecting` (per click) → `ready` | `error`.

## License

MIT
