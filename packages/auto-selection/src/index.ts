export { clearSamCache } from './backends/sam/session';
export {
  AutoSelectionOverlay,
  type AutoSelectionOverlayProps,
} from './components/AutoSelectionOverlay';
export { useAutoSelection } from './hooks/useAutoSelection';
export type {
  AutoSelectionMode,
  AutoSelectionOptions,
  AutoSelectionOverlayDriverProps,
  AutoSelectionResult,
  AutoSelectionStatus,
  BoundingBox,
  ClientPoint,
  DetectedObject,
  ImagePoint,
  MaskStyle,
  SamConfig,
} from './types';
export { applyMaskToCanvas } from './utils/applyMaskToCanvas';
export { clientToImagePoint } from './utils/clientToImagePoint';
