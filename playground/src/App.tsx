import { type RefObject, useRef } from 'react';
import { MaskEditor, type MaskEditorCanvasRef } from 'react-canvas-masker';
import { AutoSelectionOverlay, useAutoSelection } from 'react-canvas-masker-auto-selection';

const SAMPLE_IMAGE =
  'https://images.unsplash.com/photo-1724745523440-e9a3982d8994?q=80&w=2367&auto=format&fit=crop&w=900&q=80';

export function App() {
  const canvasRef = useRef<MaskEditorCanvasRef>(null);
  const auto = useAutoSelection({
    canvasRef,
    source: SAMPLE_IMAGE,
  });

  const status = auto.isDetecting
    ? 'Detecting…'
    : auto.error
      ? auto.error.message
      : auto.mode === 'auto'
        ? 'Auto-select mode: click an object in the image to mask it.'
        : 'Paint mode: drag on the image to paint a mask.';

  return (
    <main className="playground">
      <header>
        <h1>react-canvas-masker-auto-selection · playground</h1>
        <p>
          <code>react-canvas-masker</code> handles freehand mask painting. This plugin adds a second
          mode where clicks on the image are intercepted and routed to an AI backend that
          auto-detects and masks the clicked object. The detection backend is stubbed — clicking in
          auto mode surfaces a "not implemented" error.
        </p>
      </header>

      <section className="editor">
        <div className="editor-stack">
          <MaskEditor
            src={SAMPLE_IMAGE}
            canvasRef={canvasRef as RefObject<MaskEditorCanvasRef>}
            onDrawingChange={() => {}}
            maxWidth={900}
            maxHeight={600}
          />
          <AutoSelectionOverlay {...auto.overlayProps} />
        </div>
      </section>

      <section className="controls">
        <button type="button" onClick={auto.toggleMode}>
          Switch to {auto.mode === 'paint' ? 'auto-select' : 'paint'} mode
        </button>
        <span className="mode-indicator" data-mode={auto.mode}>
          Current mode: <strong>{auto.mode}</strong>
        </span>
        <p className="status" role="status">
          {status}
        </p>
      </section>
    </main>
  );
}
