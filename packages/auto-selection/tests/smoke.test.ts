import { describe, expect, it } from 'vitest';
import { AutoSelectionOverlay, applyMaskToCanvas, useAutoSelection } from '../src';

describe('public API surface', () => {
  it('exports the hook, component, and utility', () => {
    expect(typeof useAutoSelection).toBe('function');
    expect(typeof AutoSelectionOverlay).toBe('function');
    expect(typeof applyMaskToCanvas).toBe('function');
  });
});
