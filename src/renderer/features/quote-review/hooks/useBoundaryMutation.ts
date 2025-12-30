/**
 * useBoundaryMutation Hook
 *
 * Handles quote boundary adjustments including:
 * - Boundary offset calculations
 * - Paragraph merging when boundaries cross paragraphs
 * - Debounced boundary change commits
 * - Undo/redo grouping
 */

import { useCallback, useRef, useEffect } from 'react';
import { useQuoteReview } from '../../../contexts';
import type { NodeId } from '../../../../shared/documentModel';
import { BOUNDARY_CHANGE_DEBOUNCE_MS } from '../../../types/quoteReview';

interface BoundaryMutationResult {
  /** Whether a paragraph merge is needed */
  requiresMerge: boolean;
  /** IDs of paragraphs that need to be merged */
  paragraphsToMerge: NodeId[];
  /** New start offset */
  newStartOffset: number;
  /** New end offset */
  newEndOffset: number;
}

interface UseBoundaryMutationOptions {
  /** Callback when boundary change is committed */
  onBoundaryCommit?: (quoteId: NodeId, result: BoundaryMutationResult) => void;
  /** Callback when paragraphs need to be merged */
  onParagraphMerge?: (paragraphIds: NodeId[]) => void;
  /** Document node map for offset calculations */
  documentNodes?: Map<NodeId, { startOffset: number; endOffset: number; type: string }>;
}

interface BoundaryMutationActions {
  /** Start dragging a boundary edge */
  startDrag: (quoteId: NodeId, edge: 'start' | 'end', initialOffset: number) => void;
  /** Update the drag position */
  updateDrag: (newOffset: number, mouseX: number, mouseY: number) => void;
  /** End the drag and commit changes */
  endDrag: () => void;
  /** Cancel the drag without committing */
  cancelDrag: () => void;
  /** Check if moving to offset would cross a paragraph boundary */
  checkParagraphCrossing: (startOffset: number, endOffset: number) => {
    crosses: boolean;
    paragraphs: NodeId[];
  };
  /** Calculate snapped offset to word boundaries */
  snapToWordBoundary: (offset: number, direction: 'start' | 'end') => number;
}

/**
 * Hook for managing quote boundary mutations.
 * Handles drag operations, paragraph merge detection, and debounced commits.
 */
export function useBoundaryMutation(
  options: UseBoundaryMutationOptions = {}
): BoundaryMutationActions {
  const { onBoundaryCommit, onParagraphMerge, documentNodes } = options;

  const context = useQuoteReview();
  const {
    boundaryDrag,
    startBoundaryDrag,
    updateBoundaryDrag,
    endBoundaryDrag,
    cancelBoundaryDrag,
  } = context;

  // Debounce timer ref
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track last committed offset for undo grouping
  const lastCommittedOffsetRef = useRef<number | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
      }
    };
  }, []);

  /**
   * Find which paragraphs a range spans
   */
  const findSpannedParagraphs = useCallback((startOffset: number, endOffset: number): NodeId[] => {
    if (!documentNodes) return [];

    const paragraphs: NodeId[] = [];
    documentNodes.forEach((node, nodeId) => {
      if (node.type === 'paragraph') {
        // Check if this paragraph overlaps with the range
        if (node.startOffset < endOffset && node.endOffset > startOffset) {
          paragraphs.push(nodeId);
        }
      }
    });

    return paragraphs;
  }, [documentNodes]);

  /**
   * Check if moving boundaries would cross paragraph boundaries
   */
  const checkParagraphCrossing = useCallback((startOffset: number, endOffset: number): {
    crosses: boolean;
    paragraphs: NodeId[];
  } => {
    const spannedParagraphs = findSpannedParagraphs(startOffset, endOffset);
    return {
      crosses: spannedParagraphs.length > 1,
      paragraphs: spannedParagraphs,
    };
  }, [findSpannedParagraphs]);

  /**
   * Snap offset to nearest word boundary
   */
  const snapToWordBoundary = useCallback((offset: number, _direction: 'start' | 'end'): number => {
    // This would need access to the actual text content
    // For now, return the offset as-is (snap logic would be implemented with text access)
    // In a real implementation, we'd find the nearest whitespace
    return offset;
  }, []);

  /**
   * Start a boundary drag operation
   */
  const startDrag = useCallback((quoteId: NodeId, edge: 'start' | 'end', initialOffset: number) => {
    lastCommittedOffsetRef.current = initialOffset;
    startBoundaryDrag(quoteId, edge, initialOffset);
  }, [startBoundaryDrag]);

  /**
   * Update drag position with paragraph crossing detection
   */
  const updateDrag = useCallback((_newOffset: number, _mouseX: number, _mouseY: number) => {
    if (!boundaryDrag.isDragging || boundaryDrag.quoteId === null) return;

    // Snap to word boundary for better UX
    const snappedOffset = snapToWordBoundary(
      _newOffset,
      boundaryDrag.edge || 'end'
    );

    // Calculate the full range based on which edge is being dragged
    let startOffset: number;
    let endOffset: number;

    if (boundaryDrag.edge === 'start') {
      startOffset = snappedOffset;
      endOffset = boundaryDrag.originalOffset; // Keep original end
    } else {
      startOffset = boundaryDrag.originalOffset; // Keep original start
      endOffset = snappedOffset;
    }

    // Check for paragraph crossing
    const { crosses, paragraphs } = checkParagraphCrossing(startOffset, endOffset);

    updateBoundaryDrag(snappedOffset, crosses, paragraphs);
  }, [boundaryDrag, snapToWordBoundary, checkParagraphCrossing, updateBoundaryDrag]);

  /**
   * End drag and commit changes with debounce
   */
  const endDrag = useCallback(() => {
    if (!boundaryDrag.isDragging || boundaryDrag.quoteId === null) return;

    const quoteId = boundaryDrag.quoteId;
    const newOffset = boundaryDrag.currentOffset;
    const edge = boundaryDrag.edge;

    // Clear any existing timer
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
    }

    // Debounce the commit for undo grouping
    commitTimerRef.current = setTimeout(() => {
      // Check if this is a significant change from last commit
      const significantChange =
        lastCommittedOffsetRef.current === null ||
        Math.abs(newOffset - lastCommittedOffsetRef.current) > 5;

      if (significantChange && onBoundaryCommit) {
        // Calculate final offsets
        let newStartOffset: number;
        let newEndOffset: number;

        if (edge === 'start') {
          newStartOffset = newOffset;
          newEndOffset = boundaryDrag.originalOffset;
        } else {
          newStartOffset = boundaryDrag.originalOffset;
          newEndOffset = newOffset;
        }

        const { crosses, paragraphs } = checkParagraphCrossing(newStartOffset, newEndOffset);

        const result: BoundaryMutationResult = {
          requiresMerge: crosses,
          paragraphsToMerge: paragraphs,
          newStartOffset,
          newEndOffset,
        };

        onBoundaryCommit(quoteId, result);

        // Handle paragraph merge if needed
        if (crosses && onParagraphMerge) {
          onParagraphMerge(paragraphs);
        }

        lastCommittedOffsetRef.current = newOffset;
      }

      endBoundaryDrag();
      commitTimerRef.current = null;
    }, BOUNDARY_CHANGE_DEBOUNCE_MS);
  }, [boundaryDrag, checkParagraphCrossing, onBoundaryCommit, onParagraphMerge, endBoundaryDrag]);

  /**
   * Cancel drag without committing
   */
  const cancelDrag = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    lastCommittedOffsetRef.current = null;
    cancelBoundaryDrag();
  }, [cancelBoundaryDrag]);

  return {
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    checkParagraphCrossing,
    snapToWordBoundary,
  };
}

export default useBoundaryMutation;
