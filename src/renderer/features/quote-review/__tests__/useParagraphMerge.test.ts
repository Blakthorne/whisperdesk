/**
 * Tests for useParagraphMerge hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useParagraphMerge } from '../hooks/useParagraphMerge';

describe('useParagraphMerge', () => {
  const mockParagraphs = new Map([
    ['para-1', { id: 'para-1', text: 'First paragraph.', startOffset: 0, endOffset: 16 }],
    ['para-2', { id: 'para-2', text: 'Second paragraph.', startOffset: 17, endOffset: 34 }],
    ['para-3', { id: 'para-3', text: 'Third paragraph.', startOffset: 35, endOffset: 51 }],
  ]);

  const getParagraphInfo = (id: string) => mockParagraphs.get(id) || null;

  describe('previewMerge', () => {
    it('should return null for less than 2 paragraphs', () => {
      const { result } = renderHook(() => useParagraphMerge({ getParagraphInfo }));

      expect(result.current.previewMerge(['para-1'])).toBeNull();
      expect(result.current.previewMerge([])).toBeNull();
    });

    it('should preview merge for 2 paragraphs', () => {
      const { result } = renderHook(() => useParagraphMerge({ getParagraphInfo }));

      const preview = result.current.previewMerge(['para-1', 'para-2']);

      expect(preview).not.toBeNull();
      expect(preview?.paragraphIds).toEqual(['para-1', 'para-2']);
      expect(preview?.mergedText).toBe('First paragraph. Second paragraph.');
      expect(preview?.startOffset).toBe(0);
      expect(preview?.requiresConfirmation).toBe(true);
    });

    it('should preview merge for 3 paragraphs', () => {
      const { result } = renderHook(() => useParagraphMerge({ getParagraphInfo }));

      const preview = result.current.previewMerge(['para-1', 'para-2', 'para-3']);

      expect(preview).not.toBeNull();
      expect(preview?.paragraphIds).toHaveLength(3);
      expect(preview?.mergedText).toBe('First paragraph. Second paragraph. Third paragraph.');
    });
  });

  describe('calculateMergedContent', () => {
    it('should return empty string for empty array', () => {
      const { result } = renderHook(() => useParagraphMerge({ getParagraphInfo }));

      expect(result.current.calculateMergedContent([])).toBe('');
    });

    it('should return single paragraph text unchanged', () => {
      const { result } = renderHook(() => useParagraphMerge({ getParagraphInfo }));

      expect(result.current.calculateMergedContent(['para-1'])).toBe('First paragraph.');
    });

    it('should merge multiple paragraphs with space', () => {
      const { result } = renderHook(() => useParagraphMerge({ getParagraphInfo }));

      const merged = result.current.calculateMergedContent(['para-1', 'para-2']);
      expect(merged).toBe('First paragraph. Second paragraph.');
    });
  });

  describe('requestMerge with autoConfirm', () => {
    it('should auto-confirm when autoConfirm is true', () => {
      const onMergeConfirmed = vi.fn();
      const { result } = renderHook(() =>
        useParagraphMerge({
          getParagraphInfo,
          onMergeConfirmed,
          autoConfirm: true,
        })
      );

      act(() => {
        result.current.requestMerge(['para-1', 'para-2']);
      });

      expect(onMergeConfirmed).toHaveBeenCalledTimes(1);
      expect(result.current.isMergePending).toBe(false);
    });

    it('should set pending when autoConfirm is false', () => {
      const onMergeConfirmed = vi.fn();
      const { result } = renderHook(() =>
        useParagraphMerge({
          getParagraphInfo,
          onMergeConfirmed,
          autoConfirm: false,
        })
      );

      act(() => {
        result.current.requestMerge(['para-1', 'para-2']);
      });

      expect(onMergeConfirmed).not.toHaveBeenCalled();
      expect(result.current.isMergePending).toBe(true);
      expect(result.current.pendingMerge).not.toBeNull();
    });
  });

  describe('confirmMerge', () => {
    it('should call onMergeConfirmed and clear pending', () => {
      const onMergeConfirmed = vi.fn();
      const { result } = renderHook(() =>
        useParagraphMerge({
          getParagraphInfo,
          onMergeConfirmed,
          autoConfirm: false,
        })
      );

      act(() => {
        result.current.requestMerge(['para-1', 'para-2']);
      });

      expect(result.current.isMergePending).toBe(true);

      act(() => {
        result.current.confirmMerge();
      });

      expect(onMergeConfirmed).toHaveBeenCalledTimes(1);
      expect(result.current.isMergePending).toBe(false);
      expect(result.current.pendingMerge).toBeNull();
    });

    it('should do nothing when no merge is pending', () => {
      const onMergeConfirmed = vi.fn();
      const { result } = renderHook(() =>
        useParagraphMerge({ getParagraphInfo, onMergeConfirmed })
      );

      act(() => {
        result.current.confirmMerge();
      });

      expect(onMergeConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('cancelMerge', () => {
    it('should clear pending merge', () => {
      const { result } = renderHook(() =>
        useParagraphMerge({ getParagraphInfo, autoConfirm: false })
      );

      act(() => {
        result.current.requestMerge(['para-1', 'para-2']);
      });

      expect(result.current.isMergePending).toBe(true);

      act(() => {
        result.current.cancelMerge();
      });

      expect(result.current.isMergePending).toBe(false);
      expect(result.current.pendingMerge).toBeNull();
    });
  });
});
