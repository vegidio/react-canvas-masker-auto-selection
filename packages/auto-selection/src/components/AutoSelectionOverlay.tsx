import type { CSSProperties, JSX } from 'react';
import type { DetectedObject } from '../types';

export interface AutoSelectionOverlayProps {
  /** Detected objects to visualize as selectable regions. */
  objects: DetectedObject[];
  /** Width, in CSS pixels, of the underlying image. */
  imageWidth: number;
  /** Height, in CSS pixels, of the underlying image. */
  imageHeight: number;
  /** Called when the user picks one of the detected regions. */
  onSelect?: (object: DetectedObject) => void;
  /** Optional inline styles for the root container. */
  style?: CSSProperties;
  /** Optional className for the root container. */
  className?: string;
}

/**
 * Renders an absolutely-positioned overlay above a `MaskEditor` showing every
 * detected object as a clickable region.
 *
 * Currently a placeholder — the full visualization (bounding boxes, hover
 * highlight, mask preview) will land alongside the detection backend.
 */
export function AutoSelectionOverlay(_props: AutoSelectionOverlayProps): JSX.Element {
  // TODO: implement — render bbox/mask outlines and forward clicks via onSelect.
  return (
    <div
      data-testid="auto-selection-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
