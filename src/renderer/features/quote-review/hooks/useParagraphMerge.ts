/**
 * useParagraphMerge Hook
 *
 * Handles paragraph merging when quote boundaries cross paragraphs:
 * - Validates merge operations
 * - Computes merged text content
 * - Provides merge confirmation UI state
 */

import { useCallback, useState } from 'react';
import type { NodeId } from '../../../../shared/documentModel';

interface ParagraphInfo {
  id: NodeId;
  text: string;
  startOffset: number;
  endOffset: number;
}

interface MergePreview {
  /** IDs of paragraphs to be merged */
  paragraphIds: NodeId[];
  /** Combined text after merge */
  mergedText: string;
  /** New start offset of merged paragraph */
  startOffset: number;
  /** New end offset of merged paragraph */
  endOffset: number;
  /** Whether merge confirmation is required */
  requiresConfirmation: boolean;
}

interface UseParagraphMergeOptions {
  /** Get paragraph info by ID */
  getParagraphInfo?: (id: NodeId) => ParagraphInfo | null;
  /** Callback when merge is confirmed */
  onMergeConfirmed?: (preview: MergePreview) => void;
  /** Whether to auto-confirm merges (no user confirmation) */
  autoConfirm?: boolean;
}

interface ParagraphMergeActions {
  /** Preview a merge operation */
  previewMerge: (paragraphIds: NodeId[]) => MergePreview | null;
  /** Show merge confirmation dialog */
  requestMerge: (paragraphIds: NodeId[]) => void;
  /** Confirm pending merge */
  confirmMerge: () => void;
  /** Cancel pending merge */
  cancelMerge: () => void;
  /** Check if merge is currently pending */
  isMergePending: boolean;
  /** Current merge preview (if pending) */
  pendingMerge: MergePreview | null;
  /** Calculate merged content for paragraph IDs */
  calculateMergedContent: (paragraphIds: NodeId[]) => string;
}

/**
 * Hook for managing paragraph merge operations.
 */
export function useParagraphMerge(
  options: UseParagraphMergeOptions = {}
): ParagraphMergeActions {
  const { getParagraphInfo, onMergeConfirmed, autoConfirm = false } = options;

  const [pendingMerge, setPendingMerge] = useState<MergePreview | null>(null);

  /**
   * Calculate merged content from paragraph IDs
   */
  const calculateMergedContent = useCallback((paragraphIds: NodeId[]): string => {
    if (!getParagraphInfo || paragraphIds.length === 0) {
      return '';
    }

    const paragraphs = paragraphIds
      .map((id) => getParagraphInfo(id))
      .filter((p): p is ParagraphInfo => p !== null)
      .sort((a, b) => a.startOffset - b.startOffset);

    // Join with space, trimming each paragraph
    return paragraphs.map((p) => p.text.trim()).join(' ');
  }, [getParagraphInfo]);

  /**
   * Preview a merge operation without committing
   */
  const previewMerge = useCallback((paragraphIds: NodeId[]): MergePreview | null => {
    if (!getParagraphInfo || paragraphIds.length < 2) {
      return null;
    }

    const paragraphs = paragraphIds
      .map((id) => getParagraphInfo(id))
      .filter((p): p is ParagraphInfo => p !== null)
      .sort((a, b) => a.startOffset - b.startOffset);

    if (paragraphs.length < 2) {
      return null;
    }

    const mergedText = paragraphs.map((p) => p.text.trim()).join(' ');
    const firstParagraph = paragraphs[0];
    const lastParagraph = paragraphs[paragraphs.length - 1];
    const startOffset = firstParagraph?.startOffset ?? 0;
    const endOffset = lastParagraph?.endOffset ?? 0;

    return {
      paragraphIds,
      mergedText,
      startOffset,
      endOffset,
      requiresConfirmation: !autoConfirm,
    };
  }, [getParagraphInfo, autoConfirm]);

  /**
   * Request a merge (shows confirmation or auto-confirms)
   */
  const requestMerge = useCallback((paragraphIds: NodeId[]) => {
    const preview = previewMerge(paragraphIds);
    if (!preview) return;

    if (autoConfirm) {
      // Auto-confirm immediately
      if (onMergeConfirmed) {
        onMergeConfirmed(preview);
      }
    } else {
      // Set pending for user confirmation
      setPendingMerge(preview);
    }
  }, [previewMerge, autoConfirm, onMergeConfirmed]);

  /**
   * Confirm the pending merge
   */
  const confirmMerge = useCallback(() => {
    if (!pendingMerge) return;

    if (onMergeConfirmed) {
      onMergeConfirmed(pendingMerge);
    }

    setPendingMerge(null);
  }, [pendingMerge, onMergeConfirmed]);

  /**
   * Cancel the pending merge
   */
  const cancelMerge = useCallback(() => {
    setPendingMerge(null);
  }, []);

  return {
    previewMerge,
    requestMerge,
    confirmMerge,
    cancelMerge,
    isMergePending: pendingMerge !== null,
    pendingMerge,
    calculateMergedContent,
  };
}

export default useParagraphMerge;
