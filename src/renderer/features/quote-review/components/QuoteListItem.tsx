import React, { useCallback } from 'react';
import { Check, Edit2 } from 'lucide-react';
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
  compact?: boolean; // Kept for future use but currently unused
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
  compact: _compact = false,
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
      aria-label={`Quote ${index + 1}: ${quote.reference || (quote.isNonBiblical ? 'Non-biblical' : 'Missing reference')} - ${quote.isReviewed ? 'Reviewed' : 'Not reviewed'}`}
    >
      {/* Quote number badge */}
      <div className="quote-item-number">
        <span className="quote-item-number-text">{index + 1}</span>
      </div>

      {/* Main content */}
      <div className="quote-item-content">
        {/* Reference or non-biblical indicator */}
        <div className="quote-item-meta">
          {quote.isNonBiblical ? (
            <span className="quote-item-reference non-biblical">Non-biblical</span>
          ) : quote.reference ? (
            <span className="quote-item-reference">{quote.reference}</span>
          ) : (
            <span className="quote-item-reference missing">Missing Reference</span>
          )}

          {/* Interjection count */}
          {quote.interjections && quote.interjections.length > 0 && (
            <span className="quote-item-interjections" title="Interjections">
              • {quote.interjections.length} interjection{quote.interjections.length > 1 ? 's' : ''}
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
        >
          <Check size={14} strokeWidth={3} />
        </button>

        {/* Editing indicator */}
        {isBoundaryEditing && (
          <span className="quote-item-editing-badge" title="Editing boundaries">
            <Edit2 size={12} />
          </span>
        )}
      </div>
    </div>
  );
}

export default QuoteListItem;
