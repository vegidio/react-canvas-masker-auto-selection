import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { MaskEditor, type MaskEditorCanvasRef } from 'react-canvas-masker';
import {
  AutoSelectionOverlay,
  type SamConfig,
  useAutoSelection,
} from 'react-canvas-masker-auto-selection';

const PREVIEW_WIDTH = 160;
const PREVIEW_HEIGHT = 107;

const SAMPLE_IMAGE =
  'https://images.unsplash.com/photo-1724745523440-e9a3982d8994?q=80&w=2367&auto=format&fit=crop&w=900&q=80';

const DEFAULT_ENCODER_URL =
  'https://huggingface.co/Xenova/slimsam-77-uniform/resolve/main/onnx/vision_encoder_quantized.onnx';
const DEFAULT_DECODER_URL =
  'https://huggingface.co/Xenova/slimsam-77-uniform/resolve/main/onnx/prompt_encoder_mask_decoder_quantized.onnx';

export function App() {
  const canvasRef = useRef<MaskEditorCanvasRef>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const samConfig = useMemo<SamConfig>(
    () => ({
      encoderUrl: import.meta.env.VITE_SAM_ENCODER_URL ?? DEFAULT_ENCODER_URL,
      decoderUrl: import.meta.env.VITE_SAM_DECODER_URL ?? DEFAULT_DECODER_URL,
      wasmPaths: '/ort/',
    }),
    [],
  );

  const redrawPreview = useCallback(() => {
    const maskCanvas = canvasRef.current?.maskCanvas;
    const preview = previewRef.current;
    if (!maskCanvas || !preview) return;
    const ctx = preview.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, preview.width, preview.height);
    ctx.drawImage(maskCanvas, 0, 0, preview.width, preview.height);
  }, []);

  const auto = useAutoSelection({
    canvasRef,
    source: SAMPLE_IMAGE,
    sam: samConfig,
    onObjectDetected: () => queueMicrotask(redrawPreview),
  });

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const ctx = preview.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, preview.width, preview.height);
  }, []);

  const status = (() => {
    if (auto.error) return `Error: ${auto.error.message}`;
    switch (auto.status) {
      case 'loading':
        return 'Loading SAM model (~14 MB first time, then cached)…';
      case 'detecting':
        return 'Detecting object…';
      case 'ready':
        return auto.mode === 'auto'
          ? 'Auto-select mode: click an object in the image to mask it.'
          : 'Paint mode: drag on the image to paint a mask.';
      default:
        return auto.mode === 'auto'
          ? 'Auto-select mode: preparing…'
          : 'Paint mode: drag on the image to paint a mask.';
    }
  })();

  return (
    <main className="playground">
      <header>
        <h1>react-canvas-masker-auto-selection · playground</h1>
        <p>
          <code>react-canvas-masker</code> handles freehand mask painting. This plugin adds a second
          mode where clicks on the image are sent to SlimSAM-77 running locally in the browser via{' '}
          <code>onnxruntime-web</code>. First load downloads ~14 MB of quantized ONNX weights and
          caches them; subsequent loads are instant.
        </p>
      </header>

      <section className="editor">
        <div className="editor-stack">
          <MaskEditor
            src={SAMPLE_IMAGE}
            canvasRef={canvasRef as RefObject<MaskEditorCanvasRef>}
            onDrawingChange={() => {}}
            onMaskChange={redrawPreview}
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
        <span className="status-indicator" data-status={auto.status}>
          Status: <strong>{auto.status}</strong>
        </span>
        <p className="status" role="status">
          {status}
        </p>
      </section>

      <canvas
        ref={previewRef}
        className="mask-preview"
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        aria-label="Mask preview"
      />
    </main>
  );
}
