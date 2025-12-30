import React, { useState, useCallback } from 'react';
import type { QuoteReviewItem } from '../../../types/quoteReview';
import { BookAutocomplete } from './BookAutocomplete';
import './QuoteDetailView.css';

interface QuoteDetailViewProps {
  /** The quote to display in detail */
  quote: QuoteReviewItem;
  /** Callback when reference is changed */
  onReferenceChange: (reference: string) => void;
  /** Callback when verify is clicked */
  onVerify: () => void;
  /** Callback when edit boundaries is clicked */
  onEditBoundaries: () => void;
  /** Callback when edit interjections is clicked */
  onEditInterjections: () => void;
  /** Callback when delete is clicked */
  onDelete: () => void;
  /** Callback when toggle non-biblical is clicked */
  onToggleNonBiblical: () => void;
  /** Callback when lookup verse is clicked */
  onLookupVerse: (reference: string) => void;
  /** Whether boundary editing is active */
  isBoundaryEditing: boolean;
}

/**
 * Detailed view of a single quote in the side panel.
 * Shows full text, reference editor, and all actions.
 */
export function QuoteDetailView({
  quote,
  onReferenceChange,
  onVerify,
  onEditBoundaries,
  onEditInterjections,
  onDelete,
  onToggleNonBiblical,
  onLookupVerse,
  isBoundaryEditing,
}: QuoteDetailViewProps): React.JSX.Element {
  const [isEditingReference, setIsEditingReference] = useState(false);
  const [localReference, setLocalReference] = useState(quote.reference || '');
  const [chapterVerse, setChapterVerse] = useState('');

  // Parse reference into book and chapter:verse parts
  React.useEffect(() => {
    setLocalReference(quote.reference || '');
    const match = (quote.reference || '').match(/\s*(\d+:\d+(-\d+)?)$/);
    if (match && match[1]) {
      setChapterVerse(match[1]);
    } else {
      setChapterVerse('');
    }
  }, [quote.reference]);

  const handleReferenceSubmit = useCallback(() => {
    onReferenceChange(localReference);
    setIsEditingReference(false);
  }, [localReference, onReferenceChange]);

  const handleChapterVerseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setChapterVerse(value);

      // Extract book name from current reference
      const bookMatch = localReference.match(/^[A-Za-z\s]+/);
      const bookName = bookMatch ? bookMatch[0].trim() : '';

      if (bookName && value) {
        const newRef = `${bookName} ${value}`;
        setLocalReference(newRef);
      }
    },
    [localReference]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleReferenceSubmit();
      } else if (e.key === 'Escape') {
        setLocalReference(quote.reference || '');
        setIsEditingReference(false);
      }
    },
    [handleReferenceSubmit, quote.reference]
  );

  return (
    <div className="quote-detail-view">
      {/* Quote text section */}
      <div className="quote-detail-text-section">
        <div className="quote-detail-label">Quote Text</div>
        <div className="quote-detail-text">
          <span className="quote-detail-quote-mark">"</span>
          {quote.text}
          <span className="quote-detail-quote-mark">"</span>
        </div>
      </div>

      {/* Reference section */}
      <div className="quote-detail-reference-section">
        <div className="quote-detail-label">Reference</div>
        {quote.isNonBiblical ? (
          <div className="quote-detail-non-biblical">
            <span className="non-biblical-badge">Non-biblical quote</span>
            <button className="quote-detail-link-btn" onClick={onToggleNonBiblical}>
              Mark as Biblical
            </button>
          </div>
        ) : isEditingReference ? (
          <div className="quote-detail-reference-editor" onKeyDown={handleKeyDown}>
            <BookAutocomplete
              value={localReference.replace(/\s*\d+:\d+(-\d+)?$/, '')}
              onChange={(val) => {
                const newRef = chapterVerse ? `${val} ${chapterVerse}` : val;
                setLocalReference(newRef);
              }}
              placeholder="Book name"
              autoFocus
            />
            <input
              type="text"
              value={chapterVerse}
              onChange={handleChapterVerseChange}
              placeholder="3:16"
              className="quote-detail-verse-input"
            />
            <div className="quote-detail-reference-actions">
              <button
                className="quote-detail-btn quote-detail-btn-primary"
                onClick={handleReferenceSubmit}
              >
                Save
              </button>
              <button
                className="quote-detail-btn"
                onClick={() => {
                  setLocalReference(quote.reference || '');
                  setIsEditingReference(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="quote-detail-reference-display">
            {quote.reference ? (
              <span className="quote-detail-reference-text">{quote.reference}</span>
            ) : (
              <span className="quote-detail-reference-missing">No reference set</span>
            )}
            <div className="quote-detail-reference-buttons">
              <button className="quote-detail-link-btn" onClick={() => setIsEditingReference(true)}>
                Edit
              </button>
              {quote.reference && (
                <button
                  className="quote-detail-link-btn"
                  onClick={() => onLookupVerse(quote.reference || '')}
                >
                  Lookup
                </button>
              )}
              <button className="quote-detail-link-btn" onClick={onToggleNonBiblical}>
                Non-biblical
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interjections section */}
      {quote.interjections && quote.interjections.length > 0 && (
        <div className="quote-detail-interjections-section">
          <div className="quote-detail-label">Interjections</div>
          <div className="quote-detail-interjections">
            {quote.interjections.map((interjection, idx) => (
              <span key={idx} className="quote-detail-interjection-tag">
                {interjection}
              </span>
            ))}
          </div>
          <button className="quote-detail-link-btn" onClick={onEditInterjections}>
            Edit interjections
          </button>
        </div>
      )}

      {/* Status section */}
      <div className="quote-detail-status-section">
        <div className="quote-detail-label">Status</div>
        <div className="quote-detail-status">
          <span
            className={`quote-detail-status-badge ${quote.isReviewed ? 'reviewed' : 'pending'}`}
          >
            {quote.isReviewed ? '✓ Verified' : '○ Not verified'}
          </span>
        </div>
      </div>

      {/* Actions section */}
      <div className="quote-detail-actions">
        <button
          className={`quote-detail-action-btn quote-detail-verify-btn ${quote.isReviewed ? 'verified' : ''}`}
          onClick={onVerify}
        >
          {quote.isReviewed ? '✓ Verified' : 'Mark as Verified'}
        </button>

        <button
          className={`quote-detail-action-btn ${isBoundaryEditing ? 'active' : ''}`}
          onClick={onEditBoundaries}
        >
          {isBoundaryEditing ? '✓ Done Editing' : '✎ Edit Boundaries'}
        </button>

        <button className="quote-detail-action-btn" onClick={onEditInterjections}>
          💬 Edit Interjections
        </button>

        <button className="quote-detail-action-btn quote-detail-delete-btn" onClick={onDelete}>
          🗑 Delete Quote
        </button>
      </div>
    </div>
  );
}

export default QuoteDetailView;
