import { type RefObject, useRef, useState } from 'react';
import { MaskEditor, type MaskEditorCanvasRef } from 'react-canvas-masker';
import { applyMaskToCanvas, useAutoSelection } from 'react-canvas-masker-auto-selection';

const SAMPLE_IMAGE =
  'https://images.unsplash.com/photo-1724745523440-e9a3982d8994?q=80&w=2367&auto=format&fit=crop&w=900&q=80';

export function App() {
  const canvasRef = useRef<MaskEditorCanvasRef>(null);
  const [status, setStatus] = useState<string>('Idle');
  const { detect, isLoading } = useAutoSelection({ source: SAMPLE_IMAGE });

  const handleDetect = async () => {
    setStatus('Detecting…');
    try {
      const objects = await detect();
      const first = objects[0];
      if (first) {
        applyMaskToCanvas(canvasRef.current?.maskCanvas, first);
        setStatus(`Applied mask for: ${first.label ?? first.id}`);
      } else {
        setStatus('No objects detected.');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <main className="playground">
      <header>
        <h1>react-canvas-masker-auto-selection · playground</h1>
        <p>
          Loads <code>react-canvas-masker</code> with a sample image and wires up the auto-selection
          plugin. Detection is currently a stub — click the button to see the wiring exercise the
          API.
        </p>
      </header>

      <section className="editor">
        <MaskEditor
          src={SAMPLE_IMAGE}
          canvasRef={canvasRef as RefObject<MaskEditorCanvasRef>}
          onDrawingChange={() => {}}
          maxWidth={900}
          maxHeight={600}
        />
      </section>

      <section className="controls">
        <button type="button" onClick={handleDetect} disabled={isLoading}>
          {isLoading ? 'Detecting…' : 'Auto-detect & mask first object'}
        </button>
        <p className="status" role="status">
          {status}
        </p>
      </section>
    </main>
  );
}
