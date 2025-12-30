/**
 * Tests for useInterjectionDetection hook
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { useInterjectionDetection, COMMON_INTERJECTIONS } from '../hooks/useInterjectionDetection';
import { QuoteReviewProvider } from '../../../contexts/QuoteReviewContext';

// Mock wrapper component using createElement to avoid JSX parsing issues in .ts files
const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QuoteReviewProvider, null, children);

describe('useInterjectionDetection', () => {
  describe('detectInterjections', () => {
    it('should detect "amen" with high confidence', () => {
      const { result } = renderHook(() => useInterjectionDetection(), { wrapper });

      const text = 'For God so loved the world, amen, that he gave his only son';
      const interjections = result.current.detectInterjections(text);

      expect(interjections).toHaveLength(1);
      expect(interjections[0]!.text.toLowerCase()).toBe('amen');
      expect(interjections[0]!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should detect "hallelujah" with high confidence', () => {
      const { result } = renderHook(() => useInterjectionDetection(), { wrapper });

      // Use text that only contains "hallelujah"
      const text = 'He is risen! Hallelujah! He is risen indeed!';
      const interjections = result.current.detectInterjections(text);

      expect(interjections).toHaveLength(1);
      expect(interjections[0]!.text.toLowerCase()).toBe('hallelujah');
      expect(interjections[0]!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should detect multiple interjections in order', () => {
      const { result } = renderHook(() => useInterjectionDetection(), { wrapper });

      const text = 'Blessed are the poor, amen, in spirit, hallelujah, for theirs';
      const interjections = result.current.detectInterjections(text);

      expect(interjections.length).toBeGreaterThanOrEqual(2);
      // Should be sorted by position
      if (interjections.length >= 2) {
        expect(interjections[0]!.startOffset).toBeLessThan(interjections[1]!.startOffset);
      }
    });

    it('should return empty array for text without interjections', () => {
      const { result } = renderHook(() => useInterjectionDetection(), { wrapper });

      const text = 'For God so loved the world that he gave his only son';
      const interjections = result.current.detectInterjections(text);

      expect(interjections).toHaveLength(0);
    });

    it('should respect threshold option', () => {
      const { result } = renderHook(
        () => useInterjectionDetection({ threshold: 0.95 }),
        { wrapper }
      );

      // "wow" has lower confidence, should be filtered out with high threshold
      const text = 'Wow, that is amazing. Amen!';
      const interjections = result.current.detectInterjections(text);

      // Only high-confidence interjections should pass
      interjections.forEach((i) => {
        expect(i.confidence).toBeGreaterThanOrEqual(0.95);
      });
    });
  });

  describe('hasLikelyInterjections', () => {
    it('should return true for text with interjections', () => {
      const { result } = renderHook(() => useInterjectionDetection(), { wrapper });

      expect(result.current.hasLikelyInterjections('Amen, praise God!')).toBe(true);
    });

    it('should return false for text without interjections', () => {
      const { result } = renderHook(() => useInterjectionDetection(), { wrapper });

      expect(result.current.hasLikelyInterjections('Regular sermon text here')).toBe(false);
    });
  });

  describe('getHighConfidenceMatches', () => {
    it('should only return matches above 0.80 confidence', () => {
      const { result } = renderHook(() => useInterjectionDetection(), { wrapper });

      const text = 'Wow, oh my, amen, hallelujah!';
      const highConfidence = result.current.getHighConfidenceMatches(text);

      highConfidence.forEach((match) => {
        expect(match.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });
  });
});

describe('COMMON_INTERJECTIONS', () => {
  it('should export common interjection list', () => {
    expect(COMMON_INTERJECTIONS).toContain('Amen');
    expect(COMMON_INTERJECTIONS).toContain('Hallelujah');
    expect(COMMON_INTERJECTIONS.length).toBeGreaterThan(0);
  });
});
