import { useCallback, useState } from 'react';
import type { AutoSelectionOptions, AutoSelectionResult, DetectedObject } from '../types';

/**
 * Hook that exposes automatic object detection over an image.
 *
 * The returned `detect` function runs a single pass and resolves with the list
 * of detected objects. Pair the result with {@link applyMaskToCanvas} to push
 * a chosen mask into a `react-canvas-masker` `MaskEditor`.
 */
export function useAutoSelection(_options: AutoSelectionOptions): AutoSelectionResult {
  const [objects, setObjects] = useState<DetectedObject[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const detect = useCallback(async (): Promise<DetectedObject[]> => {
    // TODO: implement — wire up the chosen ML backend (ONNX/SAM, transformers.js, etc.)
    setIsLoading(true);
    setError(null);
    try {
      const err = new Error('useAutoSelection.detect: not implemented yet');
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
      setObjects(null);
    }
  }, []);

  return {
    detect,
    isReady: false,
    isLoading,
    objects,
    error,
  };
}
