import type { CSSProperties, JSX, MouseEvent } from 'react';
import type { AutoSelectionOverlayDriverProps } from '../types';

export type AutoSelectionOverlayProps = AutoSelectionOverlayDriverProps & {
    className?: string;
    style?: CSSProperties;
};

/**
 * Renders a transparent layer that sits on top of `MaskEditor`.
 *
 * When `active` is false, the overlay is fully click-through (`pointer-events: none`), so the editor receives mouse
 * events normally, and the paint mode works unchanged. When `active` is true, the overlay captures clicks and forwards
 * the viewport client coordinates to the hook, which maps them to image-pixel space against the `MaskEditor`'s current
 * transform.
 *
 * Place the overlay inside a positioned ancestor that matches the `MaskEditor`'s rendered area so the click coordinates
 * line up with the image.
 */
export const AutoSelectionOverlay = ({
    active,
    isDetecting,
    onPick,
    className,
    style,
}: AutoSelectionOverlayProps): JSX.Element => {
    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
        if (!active || isDetecting) return;
        onPick({ clientX: event.clientX, clientY: event.clientY });
    };

    const cursor: CSSProperties['cursor'] = !active
        ? 'default'
        : isDetecting
          ? 'wait'
          : 'crosshair';

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
                cursor,
                pointerEvents: active ? 'auto' : 'none',
                background: active && isDetecting ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                ...style,
            }}
        />
    );
};
