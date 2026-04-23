# react-canvas-masker-auto-selection

A plugin for [`react-canvas-masker`](https://github.com/3rChuss/react-canvas-masker) that automatically detects objects in an image and produces masks for them.

> **Status:** scaffolding only. The detection backend is not yet implemented — the public API is in place but `useAutoSelection().detect()` currently throws.

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
  useAutoSelection,
  applyMaskToCanvas,
} from 'react-canvas-masker-auto-selection';

export function Editor({ src }: { src: string }) {
  const canvasRef = useRef<MaskEditorCanvasRef>(null);
  const { detect, isLoading } = useAutoSelection({ source: src });

  const handleAutoMask = async () => {
    const objects = await detect();
    const first = objects[0];
    if (first) applyMaskToCanvas(canvasRef.current?.maskCanvas, first);
  };

  return (
    <>
      <MaskEditor src={src} canvasRef={canvasRef} />
      <button type="button" onClick={handleAutoMask} disabled={isLoading}>
        {isLoading ? 'Detecting…' : 'Auto-mask first object'}
      </button>
    </>
  );
}
```

## API

- `useAutoSelection(options)` — hook returning `{ detect, isReady, isLoading, objects, error }`.
- `<AutoSelectionOverlay objects imageWidth imageHeight onSelect />` — visual overlay for detected regions.
- `applyMaskToCanvas(maskCanvas, object)` — paints a `DetectedObject` onto a `MaskEditor` mask canvas.
- Types: `AutoSelectionOptions`, `AutoSelectionResult`, `DetectedObject`, `BoundingBox`.

## License

MIT
