import type { CSSProperties, JSX, MouseEvent } from 'react';
import type { AutoSelectionOverlayDriverProps, ImagePoint } from '../types';

export interface AutoSelectionOverlayProps extends AutoSelectionOverlayDriverProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a transparent layer that sits on top of `MaskEditor`.
 *
 * When `active` is false, the overlay is fully click-through (`pointer-events:
 * none`), so the editor receives mouse events normally and paint mode works
 * unchanged. When `active` is true, the overlay captures clicks, computes the
 * picked point, and forwards it via `onPick` so the hook can run auto
 * detection.
 *
 * Place the overlay inside a positioned ancestor that matches the
 * `MaskEditor`'s rendered area so the click coordinates line up with the image.
 */
export function AutoSelectionOverlay({
  active,
  isDetecting,
  onPick,
  className,
  style,
}: AutoSelectionOverlayProps): JSX.Element {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!active || isDetecting) return;
    const rect = event.currentTarget.getBoundingClientRect();
    // TODO: when the AI backend lands, map this overlay-local point to image
    // pixel coordinates using the MaskEditor's current zoom/pan transform so
    // the detection runs in the correct coordinate space.
    const point: ImagePoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    onPick(point);
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: spatial click on an image canvas has no meaningful keyboard equivalent; keyboard affordances belong on a sibling control.
    // biome-ignore lint/a11y/noStaticElementInteractions: same reason — this is a transparent click-capture layer, not a semantic widget.
    <div
      data-testid="auto-selection-overlay"
      data-active={active}
      data-detecting={isDetecting}
      onClick={handleClick}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: active ? (isDetecting ? 'wait' : 'crosshair') : 'default',
        pointerEvents: active ? 'auto' : 'none',
        background: active && isDetecting ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
        ...style,
      }}
    />
  );
}
