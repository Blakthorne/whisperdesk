import React, { useCallback } from 'react';
import type { QuoteReviewItem } from '../../../types/quoteReview';
import './QuoteListItem.css';

interface QuoteListItemProps {
  /** The quote item to display */
  quote: QuoteReviewItem;
  /** Zero-based index in the list */
  index: number;
  /** Whether this quote is currently focused */
  isFocused: boolean;
  /** Whether boundary editing is active for this quote */
  isBoundaryEditing: boolean;
  /** Callback when quote is clicked/selected */
  onSelect: (quoteId: string) => void;
  /** Callback when verify button is clicked */
  onVerify: (quoteId: string) => void;
  /** Optional: show compact view */
  compact?: boolean;
}

/**
 * Single item in the quote review list.
 * Shows quote text preview, reference, and review status.
 */
export function QuoteListItem({
  quote,
  index,
  isFocused,
  isBoundaryEditing,
  onSelect,
  onVerify,
  compact = false,
}: QuoteListItemProps): React.JSX.Element {
  const handleClick = useCallback(() => {
    onSelect(quote.id);
  }, [quote.id, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(quote.id);
      } else if (e.key === 'v' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onVerify(quote.id);
      }
    },
    [quote.id, onSelect, onVerify]
  );

  const handleVerifyClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onVerify(quote.id);
    },
    [quote.id, onVerify]
  );

  // Truncate text for display
  const displayText = compact
    ? quote.text.length > 50
      ? `${quote.text.slice(0, 50)}...`
      : quote.text
    : quote.text.length > 100
      ? `${quote.text.slice(0, 100)}...`
      : quote.text;

  // Status classes
  const statusClasses = [
    'quote-list-item',
    isFocused ? 'focused' : '',
    quote.isReviewed ? 'reviewed' : '',
    isBoundaryEditing ? 'editing' : '',
    quote.isNonBiblical ? 'non-biblical' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={statusClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isFocused}
      aria-label={`Quote ${index + 1}: ${displayText.slice(0, 30)}... ${quote.isReviewed ? 'Reviewed' : 'Not reviewed'}`}
    >
      {/* Quote number badge */}
      <div className="quote-item-number">
        <span className="quote-item-number-text">#{index + 1}</span>
      </div>

      {/* Main content */}
      <div className="quote-item-content">
        {/* Quote text */}
        <div className="quote-item-text">
          <span className="quote-item-quote-mark">"</span>
          {displayText}
          <span className="quote-item-quote-mark">"</span>
        </div>

        {/* Reference or non-biblical indicator */}
        <div className="quote-item-meta">
          {quote.isNonBiblical ? (
            <span className="quote-item-reference non-biblical">Non-biblical</span>
          ) : quote.reference ? (
            <span className="quote-item-reference">{quote.reference}</span>
          ) : (
            <span className="quote-item-reference missing">No reference</span>
          )}

          {/* Interjection count */}
          {quote.interjections && quote.interjections.length > 0 && (
            <span className="quote-item-interjections">
              {quote.interjections.length} interjection{quote.interjections.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Status indicators */}
      <div className="quote-item-status">
        {/* Verify button */}
        <button
          className={`quote-item-verify-btn ${quote.isReviewed ? 'verified' : ''}`}
          onClick={handleVerifyClick}
          title={quote.isReviewed ? 'Verified' : 'Mark as verified'}
          aria-label={quote.isReviewed ? 'Verified' : 'Mark as verified'}
        >
          {quote.isReviewed ? '✓' : '○'}
        </button>

        {/* Editing indicator */}
        {isBoundaryEditing && (
          <span className="quote-item-editing-badge" title="Editing boundaries">
            ✎
          </span>
        )}
      </div>
    </div>
  );
}

export default QuoteListItem;
