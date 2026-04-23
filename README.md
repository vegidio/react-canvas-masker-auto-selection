# react-canvas-masker-auto-selection

A plugin for [`react-canvas-masker`](https://github.com/3rChuss/react-canvas-masker) that adds **automatic object detection and mask generation**. Drop in the hook, point it at your image, and let it produce masks that the existing `MaskEditor` can render and edit.

> **Status:** scaffolding only. The public API is wired up but the ML/CV detection backend is not yet implemented — `useAutoSelection().detect()` currently throws.

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

## Library API (current stubs)

```ts
import {
  useAutoSelection,
  AutoSelectionOverlay,
  applyMaskToCanvas,
  type DetectedObject,
} from 'react-canvas-masker-auto-selection';
```

See [`packages/auto-selection/README.md`](packages/auto-selection/README.md) for usage details.

## License

MIT
