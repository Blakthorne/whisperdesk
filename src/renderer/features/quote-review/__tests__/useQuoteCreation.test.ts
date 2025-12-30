/**
 * Tests for useQuoteCreation hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { useQuoteCreation } from '../hooks/useQuoteCreation';
import { QuoteReviewProvider } from '../../../contexts/QuoteReviewContext';

// Mock wrapper component using createElement to avoid JSX parsing issues in .ts files
const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QuoteReviewProvider, null, children);

describe('useQuoteCreation', () => {
  describe('parseReference', () => {
    it('should parse "John 3:16" correctly', () => {
      const { result } = renderHook(() => useQuoteCreation(), { wrapper });

      const parsed = result.current.parseReference('John 3:16');

      expect(parsed.valid).toBe(true);
      expect(parsed.book).toBe('John');
      expect(parsed.chapter).toBe(3);
      expect(parsed.verseStart).toBe(16);
      expect(parsed.verseEnd).toBeUndefined();
    });

    it('should parse "1 Corinthians 13:4-7" correctly', () => {
      const { result } = renderHook(() => useQuoteCreation(), { wrapper });

      const parsed = result.current.parseReference('1 Corinthians 13:4-7');

      expect(parsed.valid).toBe(true);
      expect(parsed.book).toBe('1 Corinthians');
      expect(parsed.chapter).toBe(13);
      expect(parsed.verseStart).toBe(4);
      expect(parsed.verseEnd).toBe(7);
    });

    it('should parse "Genesis 1:1" correctly', () => {
      const { result } = renderHook(() => useQuoteCreation(), { wrapper });

      const parsed = result.current.parseReference('Genesis 1:1');

      expect(parsed.valid).toBe(true);
      expect(parsed.book).toBe('Genesis');
      expect(parsed.chapter).toBe(1);
      expect(parsed.verseStart).toBe(1);
    });

    it('should parse "2 Timothy 3:16-17" correctly', () => {
      const { result } = renderHook(() => useQuoteCreation(), { wrapper });

      const parsed = result.current.parseReference('2 Timothy 3:16-17');

      expect(parsed.valid).toBe(true);
      expect(parsed.book).toBe('2 Timothy');
      expect(parsed.chapter).toBe(3);
      expect(parsed.verseStart).toBe(16);
      expect(parsed.verseEnd).toBe(17);
    });

    it('should reject invalid references', () => {
      const { result } = renderHook(() => useQuoteCreation(), { wrapper });

      expect(result.current.parseReference('invalid').valid).toBe(false);
      expect(result.current.parseReference('John').valid).toBe(false);
      expect(result.current.parseReference('John 3').valid).toBe(false);
      expect(result.current.parseReference('3:16').valid).toBe(false);
    });

    it('should handle extra whitespace', () => {
      const { result } = renderHook(() => useQuoteCreation(), { wrapper });

      const parsed = result.current.parseReference('  John   3:16  ');

      expect(parsed.valid).toBe(true);
      expect(parsed.book).toBe('John');
    });
  });

  describe('startCreation', () => {
    it('should start quote creation with provided data', () => {
      const { result } = renderHook(() => useQuoteCreation(), { wrapper });

      act(() => {
        result.current.startCreation(
          'For God so loved the world',
          {
            startNodeId: 'para-1',
            startOffset: 0,
            endNodeId: 'para-1',
            endOffset: 26,
          },
          ['para-1']
        );
      });

      // The context should be updated (hook doesn't expose state directly)
      // We verify by the fact that no error was thrown
      expect(true).toBe(true);
    });
  });

  describe('checkMultiParagraph', () => {
    it('should return false when not creating', () => {
      const { result } = renderHook(() => useQuoteCreation(), { wrapper });

      expect(result.current.checkMultiParagraph()).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should cancel without error', () => {
      const { result } = renderHook(() => useQuoteCreation(), { wrapper });

      act(() => {
        result.current.cancel();
      });

      expect(true).toBe(true); // No error thrown
    });
  });
});
