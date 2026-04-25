# react-canvas-masker-auto-selection

A plugin for [`react-canvas-masker`](https://github.com/3rChuss/react-canvas-masker) that adds an **auto selection** mode when creating masks — one click on the image and the silhouette of the object under the cursor is written to the mask canvas.

## 💡 Motivation

[`react-canvas-masker`](https://github.com/3rChuss/react-canvas-masker) is a great library for painting binary masks over an image, but it only supports **freehand** painting. When the thing you actually want to mask is a person, a car, a pet, or any other complex shape, dragging the brush around its outline can be slow, imprecise, and tiring — especially on touch devices.

This plugin layers an **interaction mode** on top of `MaskEditor`:

- **`paint` mode** — the parent library is unchanged. The plugin's overlay sits on top with `pointer-events: none`, so every mouse event still reaches `MaskEditor`.
- **`auto` mode** — the overlay captures clicks. Each click is fed to a Segment-Anything-style model, the resulting silhouette is composited onto `MaskEditor`'s mask canvas with the same colour and blend mode the parent library uses for paint, and the user gets a clean mask in one tap.

Three things make it practical:

- **Runs entirely in the browser:** No server, no upload, no API key. The default backend bundles [SlimSAM-77](https://huggingface.co/Xenova/slimsam-77-uniform) (a quantised distillation of Meta's Segment Anything model) and runs it through [`onnxruntime-web`](https://onnxruntime.ai/docs/tutorials/web/) on the user's device.
- **Models are persisted client-side:** The first detection downloads ~14 MB of ONNX weights; the library caches them in the browser's `Cache` storage, so subsequent visits load with zero network — even after a browser restart.
- **Drop-in, not a fork:** The overlay is a sibling component to `MaskEditor`, fed the same `canvasRef`. You don't wrap, fork, or replace `react-canvas-masker` — you just add a `<div>`.

## ⬇️ Installation

```bash
$ pnpm add react-canvas-masker react-canvas-masker-auto-selection onnxruntime-web
```

Or with `npm` / `yarn`:

```bash
$ npm install react-canvas-masker react-canvas-masker-auto-selection onnxruntime-web
$ yarn add react-canvas-masker react-canvas-masker-auto-selection onnxruntime-web
```

Peer dependency ranges:

- `react`, `react-dom` — `>=18 <20` (React 18 or 19)
- `react-canvas-masker` — `^1.2.0`
- `onnxruntime-web` — `^1.24.3` (**optional** — see below)

### What about `onnxruntime-web`?

The library supports two integration modes, and only one of them needs ONNX Runtime.

#### Mode A — bundled SAM backend (recommended)

You pass a `sam: { encoderUrl, decoderUrl }` option to `useAutoSelection`. The first time the user triggers a detection, the hook dynamic-imports the SAM module, which loads `onnxruntime-web` and runs SlimSAM-77 entirely in the browser. **In this mode `onnxruntime-web` is required at runtime.**

#### Mode B — bring your own backend

You omit the `sam` option and skip the bundled SAM module entirely. The library still gives you the building blocks you need — the click-capturing overlay, the viewport-to-image coordinate mapper, and the mask compositor — and you wire them to *your* segmentation: a server API, a different ONNX model, TensorFlow.js, a Cloud Run endpoint, anything that turns a click into an object silhouette. The SAM dynamic import never runs, so `onnxruntime-web` does not need to be installed.

`onnxruntime-web` is declared as an *optional* peer dependency so consumers in Mode B don't get an `npm install` warning. It does **not** mean "the model runs without ONNX Runtime" — if you use the bundled backend, you must install `onnxruntime-web`.

## 🤖 Usage

Render `MaskEditor` and `AutoSelectionOverlay` as **siblings** inside a `position: relative` container. They share the same `canvasRef`, so the overlay can reach `MaskEditor`'s underlying mask canvas to write to it. The hook owns the `'paint' | 'auto'` mode state and produces an `overlayProps` bundle to spread on the overlay.

### Mode A — the bundled SAM backend

```tsx
import { useRef } from 'react';
import { MaskEditor, type MaskEditorCanvasRef } from 'react-canvas-masker';
import { AutoSelectionOverlay, useAutoSelection } from 'react-canvas-masker-auto-selection';

const sam = {
  encoderUrl: '/models/vision_encoder_quantized.onnx',
  decoderUrl: '/models/prompt_encoder_mask_decoder_quantized.onnx',
};

export function Editor({ src }: { src: string }) {
  const canvasRef = useRef<MaskEditorCanvasRef>(null);
  const auto = useAutoSelection({ canvasRef, source: src, sam });

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block' }}>
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

The hook walks through this lifecycle: `idle` → `loading` (downloading the ONNX files and running the encoder once on the source — the embedding is then cached) → `ready` → `detecting` (per click) → `ready` (or `error`).

### Where do the model files come from?

The bundled SAM backend takes two strings, `sam.encoderUrl` and `sam.decoderUrl`. They are passed verbatim to `fetch()`, so anything `fetch` accepts works — an absolute URL, a same-origin path, even a `blob:` URL. After the first successful load, both files are stored in `caches.open('rcm-auto-selection-sam-v1')` and served from there on every subsequent page load with zero network, until you call `clearSamCache()` or the browser evicts.

You have three reasonable choices for **where** those files live:

#### 1. Hugging Face CDN (prototyping only)

The original [Xenova/slimsam-77-uniform](https://huggingface.co/Xenova/slimsam-77-uniform) export is hosted on the Hugging Face CDN. You can point the library directly at it while you evaluate:

```ts
const sam = {
  encoderUrl: 'https://huggingface.co/Xenova/slimsam-77-uniform/resolve/main/onnx/vision_encoder_quantized.onnx',
  decoderUrl: 'https://huggingface.co/Xenova/slimsam-77-uniform/resolve/main/onnx/prompt_encoder_mask_decoder_quantized.onnx',
};
```

The [`playground/`](playground/) app in this repo uses exactly this approach, parameterised via the `VITE_SAM_ENCODER_URL` / `VITE_SAM_DECODER_URL` env vars (see [`playground/.env.example`](playground/.env.example)).

It works, but it is **not recommended for production**: Hugging Face rate-limits its CDN, you don't control the caching headers, and your app's availability ends up depending on a third party.

#### 2. Self-host on your own CDN (recommended for production)

Mirror both `.onnx` files to your own origin (S3, R2, Cloudfront, your own server, whatever you use), serve them with a strong immutable cache header, and pass those URLs:

```ts
const sam = {
  encoderUrl: 'https://cdn.example.com/sam/vision_encoder_quantized.onnx',
  decoderUrl: 'https://cdn.example.com/sam/prompt_encoder_mask_decoder_quantized.onnx',
};
```

Recommended response header for the `.onnx` files:

```
Cache-Control: public, max-age=31536000, immutable
```

#### 3. Bundle the files locally with your app

Drop the two `.onnx` files into your project's static-assets folder — `public/models/` for Vite or Next.js, `public/` for Create React App — and point at the same-origin path:

```ts
const sam = {
  encoderUrl: '/models/vision_encoder_quantized.onnx',
  decoderUrl: '/models/prompt_encoder_mask_decoder_quantized.onnx',
};
```

The two file names are `vision_encoder_quantized.onnx` (~8.9 MB) and `prompt_encoder_mask_decoder_quantized.onnx` (~4.9 MB) — a one-time ~14 MB download regardless of which option you pick. During development you can call `clearSamCache()` to wipe the persistent cache and force a re-download.

> **A note on the WASM runtime.** Separately from the `.onnx` model files, `onnxruntime-web` also needs its own WebAssembly engine (`ort-wasm-simd-threaded.wasm` and a couple of `.mjs` glue files) to actually execute the model. By default, it loads them from `cdn.jsdelivr.net`, which works well: JSDelivr is fast, the files are immutably cached by the browser, and you don't need any extra setup. If you'd rather control the delivery yourself — for stricter privacy, CSP, or to keep your app independent of a third-party CDN — you can self-host these files the same way you'd self-host the model files (copy them out of `node_modules/onnxruntime-web/dist/` into your static-assets folder) and point ORT at them by passing `wasmPaths: '/your-prefix/'` in the `sam` config.

### Mode B — bringing your own backend

If you want to use a different model, a server-side API, or any other segmentation pipeline, you can skip the `sam` config and drive the overlay yourself. The library exposes everything you need as standalone primitives.

#### 1. Render the overlay

`<AutoSelectionOverlay>` is a transparent `<div>` that sits over `MaskEditor`. It takes three driver props:

- `active: boolean` — when `false`, the overlay sets `pointer-events: none` so paint mode is untouched. When `true`, it captures clicks.
- `isDetecting: boolean` — when `true`, the overlay shows a wait cursor and a faint dim, and ignores further clicks until you flip it back.
- `onPick: (point: { clientX: number; clientY: number }) => void` — fires on click in viewport coordinates (matching `MouseEvent.clientX/clientY`).

You manage `mode` and `isDetecting` in your own `useState`.

#### 2. Map the click to image space

Inside your `onPick` handler, convert the viewport point to image-pixel coordinates with `clientToImagePoint`:

```ts
const imagePoint = clientToImagePoint(clientX, clientY, canvasRef.current.maskCanvas);
```

This handles CSS transforms (zoom/pan, scaled previews) and `devicePixelRatio` automatically — don't try to recompute it manually.

#### 3. Run your backend

Your backend takes the image-pixel point (and the source image — a URL, an `HTMLImageElement`, or an `HTMLCanvasElement`) and must return a `DetectedObject`:

```ts
interface DetectedObject {
  id: string;          // any unique string for this detection
  label?: string;      // optional human-readable class label
  score: number;       // confidence, 0..1
  bbox: BoundingBox;   // { x, y, width, height } in image-pixel coords
  mask?: ImageData;    // alpha-only silhouette of the object
}
```

The important field is `mask`. It's an `ImageData` whose **alpha channel encodes the object silhouette** — pixels with alpha > 0 belong to the object, alpha === 0 is background. The RGB channels are ignored: the library re-tints the alpha channel with the user's `maskStyle.color` before drawing. The mask is ideally sized to the source image, but the compositor uses `drawImage` to scale to whatever the mask canvas is, so other resolutions work too.

If your backend is a pure object-detector (no pixel-precise mask), you can omit `mask` entirely and the library will fall back to filling `bbox` as a solid rectangle.

#### 4. Composite the result

Once you have the `DetectedObject`, call `applyMaskToCanvas` to write it onto `MaskEditor`'s mask canvas:

```ts
applyMaskToCanvas(canvasRef.current.maskCanvas, detected, { color: '#ffffff' });
```

The defaults (`#ffffff`, opacity `1`, `source-over`) match `react-canvas-masker`'s default `maskColor`, so a Mode-B mask is pixel-identical to manual paint and renders identically under the parent library's `maskOpacity` / `maskBlendMode` CSS.

#### Putting it together

```tsx
import { useRef, useState } from 'react';
import { MaskEditor, type MaskEditorCanvasRef } from 'react-canvas-masker';
import {
  AutoSelectionOverlay,
  applyMaskToCanvas,
  clientToImagePoint,
  type DetectedObject,
} from 'react-canvas-masker-auto-selection';

declare const myBackend: {
  segment(src: string, point: { x: number; y: number }): Promise<DetectedObject>;
};

export function Editor({ src }: { src: string }) {
  const canvasRef = useRef<MaskEditorCanvasRef>(null);
  const [mode, setMode] = useState<'paint' | 'auto'>('paint');
  const [isDetecting, setIsDetecting] = useState(false);

  const onPick = async ({ clientX, clientY }: { clientX: number; clientY: number }) => {
    const maskCanvas = canvasRef.current?.maskCanvas;
    if (!maskCanvas) return;
    const point = clientToImagePoint(clientX, clientY, maskCanvas);
    if (!point) return;

    setIsDetecting(true);
    try {
      const detected = await myBackend.segment(src, point);
      applyMaskToCanvas(maskCanvas, detected);
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <MaskEditor src={src} canvasRef={canvasRef} onDrawingChange={() => {}} />
      <AutoSelectionOverlay active={mode === 'auto'} isDetecting={isDetecting} onPick={onPick} />
    </div>
  );
}
```

The only thing you "own" in Mode B is `myBackend.segment`. Everything else is the library.

## 💣 Troubleshooting

### Auto-detected masks render in a different colour than manual paint

`react-canvas-masker`'s default `maskColor` is white (`#ffffff`). The auto-selection plugin defaults to the same colour so manual and auto masks look identical. If you override `maskColor` on `<MaskEditor>` you also need to pass a matching colour to the plugin:

```tsx
<MaskEditor src={src} canvasRef={canvasRef} maskColor="red" onDrawingChange={() => {}} />;

useAutoSelection({
  canvasRef,
  source: src,
  sam,
  maskStyle: { color: 'red' },
});
```

`maskOpacity` and `maskBlendMode` are applied as CSS by `react-canvas-masker` to the whole mask canvas, so they cover both paint paths without any extra forwarding.

### WebGPU produces noisy or tiled masks (`iou_scores > 1.0`)

The bundled backend defaults to the `wasm` execution provider for a reason. `onnxruntime-web@1.24` cannot assign every operator in the INT8-quantised SlimSAM-77 export to its WebGPU EP, and the operators that fall back to CPU end up round-tripping quantised activations across the EP boundary. The result is silently corrupted mask logits — telltale signs are a noisy, tiled-looking mask and `iou_scores` greater than `1.0`.

Keep the default `executionProviders: ['wasm']` unless you are shipping a different SAM export (e.g. a non-quantised or FP16 one) that you have re-verified end-to-end on WebGPU.

### My mask doesn't update after I edit the source canvas in place

The encoder runs once per source and the result is cached. The cache key is the **identity** of the value passed as `source` — a string URL, an `HTMLImageElement`, or an `HTMLCanvasElement`. If you mutate that canvas in place (e.g. you draw on it and reuse the same `<canvas>`), the reference doesn't change and the cache happily returns the stale embedding.

Call `auto.invalidateEmbedding()` after any in-place mutation to force the next click to re-encode:

```ts
canvasCtx.drawImage(somethingNew, 0, 0);
auto.invalidateEmbedding();
```

## 📝 License

**react-canvas-masker-auto-selection** is released under the Apache 2.0 License. See [LICENSE](LICENSE) for details.

## 👨🏾‍💻 Author

Vinicius Egidio ([vinicius.io](https://vinicius.io))
