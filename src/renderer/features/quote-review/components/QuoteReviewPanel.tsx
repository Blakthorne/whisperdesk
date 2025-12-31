import React, { useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { useQuoteReview, useEditorActionsOptional } from '../../../contexts';
import type { QuoteReviewItem } from '../../../types/quoteReview';
import { QuoteListItem } from './QuoteListItem';
import { QuoteDetailView } from './QuoteDetailView';
import './QuoteReviewPanel.css';

interface QuoteReviewPanelProps {
  /** Optional: show compact mode */
  compact?: boolean;
  /** Callback when verse lookup is requested */
  onLookupVerse?: (reference: string) => void;
}

/**
 * Main side panel for reviewing and editing quotes.
 * Combines quote list with detail view for focused quote.
 */
export function QuoteReviewPanel({
  compact = false,
  onLookupVerse,
}: QuoteReviewPanelProps): React.JSX.Element {
  // Context is flat - state and actions at top level
  const context = useQuoteReview();
  const editorActions = useEditorActionsOptional();
  const {
    quotes,
    review,
    boundaryDrag,
    // Actions
    setFocusedQuote,
    updateQuote,
    removeQuote,
    endBoundaryDrag,
    enterBoundaryEditMode,
    enterInterjectionEditMode,
    setPanelOpen,
  } = context;

  const focusedQuoteId = review.focusedQuoteId;

  // Handle close panel
  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
  }, [setPanelOpen]);

  // Get the focused quote
  const focusedQuote = useMemo((): QuoteReviewItem | null => {
    if (!focusedQuoteId) return null;
    return quotes.find((q: QuoteReviewItem) => q.id === focusedQuoteId) || null;
  }, [quotes, focusedQuoteId]);

  // Calculate review progress
  const reviewProgress = useMemo(() => {
    const total = quotes.length;
    const reviewed = quotes.filter((q: QuoteReviewItem) => q.isReviewed).length;
    return { total, reviewed, percentage: total > 0 ? Math.round((reviewed / total) * 100) : 0 };
  }, [quotes]);

  // Handle quote selection - also focus in editor
  const handleSelectQuote = useCallback(
    (quoteId: string) => {
      setFocusedQuote(quoteId);
      // Focus the quote in the editor
      editorActions?.quoteActions.focusQuote(quoteId);
    },
    [setFocusedQuote, editorActions]
  );

  // Handle verify toggle - update BOTH context and editor
  const handleVerify = useCallback(
    (quoteId: string) => {
      const quote = quotes.find((q: QuoteReviewItem) => q.id === quoteId);
      if (quote) {
        const newVerifiedState = !quote.isReviewed;
        // Update context state
        updateQuote(quoteId, { isReviewed: newVerifiedState });
        // Update editor state
        editorActions?.quoteActions.toggleQuoteVerification(quoteId, newVerifiedState);
      }
    },
    [quotes, updateQuote, editorActions]
  );

  // Handle reference change - update BOTH context and editor
  const handleReferenceChange = useCallback(
    (reference: string) => {
      if (focusedQuoteId) {
        // Update context state
        updateQuote(focusedQuoteId, { reference });
        // Update editor state
        editorActions?.quoteActions.updateQuoteReference(focusedQuoteId, reference);
      }
    },
    [focusedQuoteId, updateQuote, editorActions]
  );

  // Handle edit boundaries
  const handleEditBoundaries = useCallback(() => {
    if (focusedQuoteId) {
      if (boundaryDrag.isDragging && boundaryDrag.quoteId === focusedQuoteId) {
        endBoundaryDrag();
      } else {
        enterBoundaryEditMode(focusedQuoteId);
        // Focus the quote in editor for visual feedback
        editorActions?.quoteActions.focusQuote(focusedQuoteId);
      }
    }
  }, [focusedQuoteId, boundaryDrag, endBoundaryDrag, enterBoundaryEditMode, editorActions]);

  // Handle edit interjections
  const handleEditInterjections = useCallback(() => {
    if (focusedQuoteId) {
      enterInterjectionEditMode(focusedQuoteId);
      // Focus the quote in editor for visual feedback
      editorActions?.quoteActions.focusQuote(focusedQuoteId);
    }
  }, [focusedQuoteId, enterInterjectionEditMode, editorActions]);

  // Handle delete quote - update BOTH context and editor
  const handleDelete = useCallback(() => {
    if (focusedQuoteId) {
      // Delete from editor first (converts back to paragraph)
      editorActions?.quoteActions.deleteQuote(focusedQuoteId);
      // Then remove from context state
      removeQuote(focusedQuoteId);
      // Deselect
      setFocusedQuote(null);
    }
  }, [focusedQuoteId, removeQuote, editorActions, setFocusedQuote]);

  // Handle toggle non-biblical - update BOTH context and editor
  const handleToggleNonBiblical = useCallback(() => {
    if (focusedQuote && focusedQuoteId) {
      const newNonBiblicalState = !focusedQuote.isNonBiblical;
      // Update context state
      updateQuote(focusedQuoteId, { isNonBiblical: newNonBiblicalState });
      // Update editor state
      editorActions?.quoteActions.toggleQuoteNonBiblical(focusedQuoteId, newNonBiblicalState);
    }
  }, [focusedQuote, focusedQuoteId, updateQuote, editorActions]);

  // Handle lookup verse
  const handleLookupVerse = useCallback(
    (reference: string) => {
      onLookupVerse?.(reference);
    },
    [onLookupVerse]
  );

  // Handle Update Text
  const handleUpdateText = useCallback((text: string) => {
      if (focusedQuoteId) {
          updateQuote(focusedQuoteId, { text });
          editorActions?.quoteActions.updateQuoteText(focusedQuoteId, text);
      }
  }, [focusedQuoteId, updateQuote, editorActions]);

  // Handle Update Interjections
  const handleUpdateInterjections = useCallback((interjections: string[]) => {
      if (focusedQuoteId) {
          updateQuote(focusedQuoteId, { interjections });
          editorActions?.quoteActions.updateQuoteInterjections(focusedQuoteId, interjections);
      }
  }, [focusedQuoteId, updateQuote, editorActions]);

  // Handle close detail view
  const handleCloseDetail = useCallback(() => {
    setFocusedQuote(null);
  }, [setFocusedQuote]);


  // Render empty state
  if (quotes.length === 0) {
    return (
      <div className="quote-review-panel quote-review-panel-empty">
        <div className="quote-review-empty-icon">📝</div>
        <h3>No Quotes to Review</h3>
        <p>No Bible quotes have been detected in this document.</p>
        <p className="quote-review-empty-hint">
          Select text in the editor and click "Create Quote" to add one manually.
        </p>
      </div>
    );
  }

  return (
    <div className={`quote-review-panel ${compact ? 'compact' : ''}`}>
      {/* Header with progress */}
      <div className="quote-review-panel-header">
        <div className="quote-review-title-row">
          <div className="quote-review-title">
            <h3>Quote Review</h3>
          </div>
          <button
            className="quote-review-close-btn"
            onClick={handleClosePanel}
            title="Close Panel"
            aria-label="Close quote review panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="quote-review-progress">
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${reviewProgress.percentage}%` }} />
          </div>
          <span className="progress-text">
            {reviewProgress.reviewed}/{reviewProgress.total} verified
          </span>
        </div>
      </div>

      {/* Main content area */}
      <div className="quote-review-panel-content">
        {/* Quote list */}
        <div className="quote-review-list-section">
          <div className="quote-review-list">
            {quotes.map((quote: QuoteReviewItem, index: number) => (
              <QuoteListItem
                key={quote.id}
                quote={quote}
                index={index}
                isFocused={focusedQuoteId === quote.id}
                isBoundaryEditing={boundaryDrag.isDragging && boundaryDrag.quoteId === quote.id}
                onSelect={handleSelectQuote}
                onVerify={handleVerify}
                compact={compact}
              />
            ))}
          </div>
        </div>

        {/* Detail view for focused quote - SLIDE OVER OVERLAY */}
         {focusedQuote && !compact && (
          <div className="quote-review-detail-section">
            <QuoteDetailView
              quote={focusedQuote}
              onReferenceChange={handleReferenceChange}
              onVerify={() => handleVerify(focusedQuote.id)}
              onEditBoundaries={handleEditBoundaries}
              onEditInterjections={handleEditInterjections}
              onDelete={handleDelete}
              onToggleNonBiblical={handleToggleNonBiblical}
              onLookupVerse={handleLookupVerse}
              onUpdateText={handleUpdateText}
              onUpdateInterjections={handleUpdateInterjections}
              onClose={handleCloseDetail}
              isBoundaryEditing={
                boundaryDrag.isDragging && boundaryDrag.quoteId === focusedQuote.id
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default QuoteReviewPanel;
