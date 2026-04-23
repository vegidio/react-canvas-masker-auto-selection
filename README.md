# react-canvas-masker-auto-selection

A plugin for [`react-canvas-masker`](https://github.com/3rChuss/react-canvas-masker) that adds **automatic object detection and mask generation**. Toggle between freehand `paint` mode and a click-to-mask `auto` mode where each click runs [SlimSAM-77](https://huggingface.co/Xenova/slimsam-77-uniform) — a quantized distillation of Segment Anything — locally in the browser via [`onnxruntime-web`](https://onnxruntime.ai/docs/tutorials/web/). The detected object's mask is written into the `MaskEditor`'s canvas.

- ~14 MB of quantized ONNX weights (encoder + decoder), downloaded once and persisted via the browser `Cache` API.
- WebGPU-first with automatic WASM fallback.
- Zero server: all inference runs on the user's device.

## Repo layout

```
.
├── packages/
│   └── auto-selection/   # the publishable library
└── playground/           # local Vite app for hands-on iteration
```

## Prerequisites

- Node 22 (matches `.nvmrc`)
- pnpm 10 (managed via Corepack — `corepack enable` is enough)

## Getting started

```bash
pnpm install
pnpm dev          # starts the playground at http://localhost:5173
```

Other useful scripts:

```bash
pnpm build        # builds the library (packages/auto-selection)
pnpm test         # runs Vitest in every package
pnpm typecheck    # tsc --noEmit in every package
pnpm check        # biome check + typecheck + test
pnpm fix          # biome lint/format with --write
pnpm changeset    # record a release note for the next version
```

## Stack

- TypeScript 6 (strict)
- Vite 8 library mode + `vite-plugin-dts`
- Vitest 4 + Testing Library + happy-dom
- Biome 2 (lint + format, single config)
- Changesets for versioning
- pnpm 10 workspaces
- GitHub Actions for CI

## Library API

```ts
import {
  useAutoSelection,
  AutoSelectionOverlay,
  applyMaskToCanvas,
  clientToImagePoint,
  clearSamCache,
  type DetectedObject,
  type SamConfig,
} from 'react-canvas-masker-auto-selection';
```

`onnxruntime-web@^1.24.3` is an **optional peer dependency** — only install it if you use the bundled SAM backend. See [`packages/auto-selection/README.md`](packages/auto-selection/README.md) for full usage details, including the `wasmPaths` self-hosting recipe and the persistent model cache behavior.

## License

MIT
