/**
 * useTipTapQuoteSync Hook
 *
 * Bridges quote review state with TipTap editor:
 * - Syncs quote highlights to TipTap marks
 * - Handles selection for quote creation
 * - Manages focus between quote panel and editor
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useQuoteReview } from '../../../contexts';
import type { NodeId } from '../../../../shared/documentModel';
import type { QuoteReviewItem } from '../../../types/quoteReview';

interface UseTipTapQuoteSyncOptions {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Document ID for persistence */
  documentId?: string;
  /** Callback when a quote node should be highlighted in editor */
  onHighlightQuote?: (quoteId: NodeId, scrollIntoView?: boolean) => void;
  /** Callback when selection changes in editor */
  onSelectionChange?: (selection: {
    text: string;
    from: number;
    to: number;
    isEmpty: boolean;
  }) => void;
}

interface TipTapQuoteSyncActions {
  /** Scroll to and highlight a quote in the editor */
  focusQuoteInEditor: (quoteId: NodeId) => void;
  /** Get text selection from editor */
  getSelection: () => { text: string; from: number; to: number } | null;
  /** Apply quote mark to selection */
  applyQuoteMark: (from: number, to: number, quoteId: NodeId) => void;
  /** Remove quote mark */
  removeQuoteMark: (quoteId: NodeId) => void;
  /** Update quote mark boundaries */
  updateQuoteMarkBoundaries: (quoteId: NodeId, from: number, to: number) => void;
  /** Check if selection spans multiple paragraphs */
  selectionSpansParagraphs: (from: number, to: number) => NodeId[];
}

// Mark name for quotes in TipTap
const QUOTE_MARK_NAME = 'bibleQuote';

/**
 * Hook for syncing quote review state with TipTap editor.
 */
export function useTipTapQuoteSync(
  options: UseTipTapQuoteSyncOptions
): TipTapQuoteSyncActions {
  const { editor, documentId, onHighlightQuote, onSelectionChange } = options;

  const context = useQuoteReview();
  const {
    quotes,
    review,
    setFocusedQuote,
    loadPersistedState,
  } = context;

  // Track previous focused quote for comparison
  const prevFocusedQuoteRef = useRef<NodeId | null>(null);

  // Load persisted state when document changes
  useEffect(() => {
    if (documentId) {
      loadPersistedState(documentId);
    }
  }, [documentId, loadPersistedState]);

  // Track selection changes in editor
  useEffect(() => {
    if (!editor || !onSelectionChange) return;

    const handleSelectionUpdate = () => {
      const { from, to, empty } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, '\n');

      onSelectionChange({
        text,
        from,
        to,
        isEmpty: empty,
      });
    };

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, onSelectionChange]);

  // Scroll to focused quote when it changes
  useEffect(() => {
    if (!editor) return;

    const focusedQuoteId = review.focusedQuoteId;
    if (focusedQuoteId && focusedQuoteId !== prevFocusedQuoteRef.current) {
      // Find the quote in the editor and scroll to it
      if (onHighlightQuote) {
        onHighlightQuote(focusedQuoteId, true);
      }
    }

    prevFocusedQuoteRef.current = focusedQuoteId;
  }, [editor, review.focusedQuoteId, onHighlightQuote]);

  /**
   * Focus a quote in the editor (scroll into view and highlight)
   */
  const focusQuoteInEditor = useCallback((quoteId: NodeId) => {
    if (!editor) return;

    // Find the quote's position in the document
    const quote = quotes.find((q: QuoteReviewItem) => q.id === quoteId);
    if (!quote || quote.startOffset === undefined) return;

    // Focus and scroll
    editor.commands.focus();
    editor.commands.setTextSelection({
      from: quote.startOffset,
      to: quote.endOffset ?? quote.startOffset,
    });

    // Scroll into view
    const domElement = editor.view.domAtPos(quote.startOffset);
    if (domElement.node instanceof HTMLElement) {
      domElement.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Update context
    setFocusedQuote(quoteId);

    // Call highlight callback
    if (onHighlightQuote) {
      onHighlightQuote(quoteId, true);
    }
  }, [editor, quotes, setFocusedQuote, onHighlightQuote]);

  /**
   * Get current text selection from editor
   */
  const getSelection = useCallback((): { text: string; from: number; to: number } | null => {
    if (!editor) return null;

    const { from, to, empty } = editor.state.selection;
    if (empty) return null;

    const text = editor.state.doc.textBetween(from, to, '\n');
    return { text, from, to };
  }, [editor]);

  /**
   * Apply quote mark to a range in the editor
   */
  const applyQuoteMark = useCallback((from: number, to: number, quoteId: NodeId) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .setMark(QUOTE_MARK_NAME, { quoteId })
      .run();
  }, [editor]);

  /**
   * Remove quote mark by quote ID
   */
  const removeQuoteMark = useCallback((quoteId: NodeId) => {
    if (!editor) return;

    // Find all marks with this quote ID and remove them
    const { doc } = editor.state;
    let foundFrom: number | null = null;
    let foundTo: number | null = null;

    doc.descendants((node, pos) => {
      if (node.isText) {
        const mark = node.marks.find(
          (m) => m.type.name === QUOTE_MARK_NAME && m.attrs.quoteId === quoteId
        );
        if (mark) {
          if (foundFrom === null) foundFrom = pos;
          foundTo = pos + node.nodeSize;
        }
      }
    });

    if (foundFrom !== null && foundTo !== null) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: foundFrom, to: foundTo })
        .unsetMark(QUOTE_MARK_NAME)
        .run();
    }
  }, [editor]);

  /**
   * Update quote mark boundaries
   */
  const updateQuoteMarkBoundaries = useCallback((quoteId: NodeId, from: number, to: number) => {
    if (!editor) return;

    // Remove existing mark
    removeQuoteMark(quoteId);

    // Apply new mark at new position
    applyQuoteMark(from, to, quoteId);
  }, [editor, removeQuoteMark, applyQuoteMark]);

  /**
   * Check if a range spans multiple paragraphs
   */
  const selectionSpansParagraphs = useCallback((from: number, to: number): NodeId[] => {
    if (!editor) return [];

    const paragraphIds: NodeId[] = [];
    const { doc } = editor.state;

    doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === 'paragraph') {
        // Generate or get paragraph ID
        const paragraphId = node.attrs.id || `para_${pos}`;
        if (!paragraphIds.includes(paragraphId)) {
          paragraphIds.push(paragraphId);
        }
      }
    });

    return paragraphIds;
  }, [editor]);

  return {
    focusQuoteInEditor,
    getSelection,
    applyQuoteMark,
    removeQuoteMark,
    updateQuoteMarkBoundaries,
    selectionSpansParagraphs,
  };
}

export default useTipTapQuoteSync;
