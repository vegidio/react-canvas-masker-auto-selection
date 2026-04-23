# react-canvas-masker-auto-selection

A plugin for [`react-canvas-masker`](https://github.com/3rChuss/react-canvas-masker) that adds an **auto-selection mode**. The user toggles between the parent library's default freehand painting and a click-to-mask mode where each click on the image is routed to an AI backend that detects the object under the cursor and writes its mask to the editor.

> **Status:** the public API and overlay wiring are in place; the AI detection backend (`detectAt`) currently throws "not implemented".

## Install

```bash
pnpm add react-canvas-masker react-canvas-masker-auto-selection
```

`react`, `react-dom` (`>=18 <20`), and `react-canvas-masker` (`^1.2.0`) are peer dependencies.

## Usage

```tsx
import { useRef } from 'react';
import { MaskEditor, type MaskEditorCanvasRef } from 'react-canvas-masker';
import {
  AutoSelectionOverlay,
  useAutoSelection,
} from 'react-canvas-masker-auto-selection';

export function Editor({ src }: { src: string }) {
  const canvasRef = useRef<MaskEditorCanvasRef>(null);
  const auto = useAutoSelection({ canvasRef, source: src });

  return (
    <>
      <div style={{ position: 'relative' }}>
        <MaskEditor src={src} canvasRef={canvasRef} onDrawingChange={() => {}} />
        <AutoSelectionOverlay {...auto.overlayProps} />
      </div>

      <button type="button" onClick={auto.toggleMode}>
        Switch to {auto.mode === 'paint' ? 'auto-select' : 'paint'} mode
      </button>
    </>
  );
}
```

While `auto.mode === 'paint'` the overlay is fully click-through and `MaskEditor` behaves as usual. While `auto.mode === 'auto'` the overlay captures clicks, hands the picked point to `useAutoSelection().detectAt`, and applies the resulting mask to the editor's `maskCanvas`.

## API

- `useAutoSelection({ canvasRef, source, initialMode?, minScore?, onObjectDetected?, onError? })` — owns the `'paint' | 'auto'` mode state. Returns `{ mode, setMode, toggleMode, isDetecting, lastDetected, error, detectAt, overlayProps }`.
- `<AutoSelectionOverlay {...overlayProps} />` — the click-intercepting layer; spread `overlayProps` from the hook. Place it inside a positioned ancestor that matches the `MaskEditor`'s rendered area.
- `applyMaskToCanvas(maskCanvas, object)` — low-level utility used internally by the hook; exported so callers driving `detectAt` themselves can write the mask manually.
- Types: `AutoSelectionMode`, `AutoSelectionOptions`, `AutoSelectionResult`, `AutoSelectionOverlayDriverProps`, `DetectedObject`, `BoundingBox`, `ImagePoint`.

## License

MIT
