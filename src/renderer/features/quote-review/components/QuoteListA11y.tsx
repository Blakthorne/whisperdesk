/**
 * QuoteListA11y Component
 *
 * Accessible wrapper for the quote list with:
 * - ARIA live regions for status updates
 * - Proper role attributes
 * - Screen reader announcements
 * - Focus management
 */

import React, { useEffect, useRef, useState } from 'react';
import type { QuoteReviewItem } from '../../../types/quoteReview';

interface QuoteListA11yProps {
  /** Quote items */
  quotes: QuoteReviewItem[];
  /** Currently focused quote ID */
  focusedQuoteId: string | null;
  /** Whether review mode is active */
  isReviewModeActive: boolean;
  /** Progress (reviewed count / total) */
  progress: { reviewed: number; total: number };
  /** Children to render */
  children: React.ReactNode;
  /** Container className */
  className?: string;
  /** ID for the listbox */
  id?: string;
}

/**
 * Accessible container for quote review list.
 * Provides ARIA live regions and proper roles.
 */
export function QuoteListA11y({
  quotes,
  focusedQuoteId,
  isReviewModeActive,
  progress,
  children,
  className = '',
  id = 'quote-review-list',
}: QuoteListA11yProps): React.JSX.Element {
  const [announcement, setAnnouncement] = useState('');
  const prevProgressRef = useRef(progress);
  const containerRef = useRef<HTMLDivElement>(null);

  // Announce progress changes
  useEffect(() => {
    const prevProgress = prevProgressRef.current;
    if (progress.reviewed !== prevProgress.reviewed) {
      const newlyVerified = progress.reviewed > prevProgress.reviewed;
      if (newlyVerified) {
        setAnnouncement(
          `Quote verified. ${progress.reviewed} of ${progress.total} quotes reviewed.`
        );
      } else {
        setAnnouncement(
          `Quote unverified. ${progress.reviewed} of ${progress.total} quotes reviewed.`
        );
      }
    }
    prevProgressRef.current = progress;
  }, [progress]);

  // Announce focus changes
  useEffect(() => {
    if (focusedQuoteId) {
      const quote = quotes.find((q) => q.id === focusedQuoteId);
      if (quote) {
        const index = quotes.indexOf(quote) + 1;
        const status = quote.isReviewed ? 'verified' : 'unverified';
        const reference = quote.reference || 'No reference';
        setAnnouncement(`Quote ${index} of ${quotes.length}. ${reference}. Status: ${status}.`);
      }
    }
  }, [focusedQuoteId, quotes]);

  // Clear announcement after screen reader has time to read it
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [announcement]);

  // Focus the focused item when it changes
  useEffect(() => {
    if (focusedQuoteId && containerRef.current) {
      const focusedElement = containerRef.current.querySelector(
        `[data-quote-id="${focusedQuoteId}"]`
      );
      if (focusedElement instanceof HTMLElement) {
        focusedElement.focus();
      }
    }
  }, [focusedQuoteId]);

  const listLabel = isReviewModeActive
    ? `Passage review list. ${progress.reviewed} of ${progress.total} verified.`
    : 'Passage list';

  return (
    <div
      ref={containerRef}
      className={`quote-list-a11y ${className}`}
      role="region"
      aria-label="Passage Review Panel"
    >
      {/* Live region for announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Instructions for screen readers */}
      <div id={`${id}-instructions`} className="sr-only">
        Use arrow keys to navigate between passages. Press Enter or Space to toggle verification.
        Press E to edit boundaries. Press N to jump to next unverified passage.
      </div>

      {/* The actual list */}
      <div
        id={id}
        role="listbox"
        aria-label={listLabel}
        aria-describedby={`${id}-instructions`}
        aria-activedescendant={focusedQuoteId ? `quote-item-${focusedQuoteId}` : undefined}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Props for individual quote list item accessibility wrapper
 */
interface QuoteItemA11yProps {
  /** Quote data */
  quote: QuoteReviewItem;
  /** Index in list (1-based) */
  index: number;
  /** Total number of quotes */
  total: number;
  /** Whether this item is focused */
  isFocused: boolean;
  /** Whether this item is being boundary edited */
  isBoundaryEditing: boolean;
  /** Children to render */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Accessible wrapper for individual quote list item.
 */
export function QuoteItemA11y({
  quote,
  index,
  total,
  isFocused,
  isBoundaryEditing,
  children,
  className = '',
}: QuoteItemA11yProps): React.JSX.Element {
  const status = quote.isReviewed ? 'verified' : 'unverified';
  const editingStatus = isBoundaryEditing ? ', editing boundaries' : '';
  const label = `${quote.reference || 'No reference'}. ${status}${editingStatus}`;

  return (
    <div
      id={`quote-item-${quote.id}`}
      data-quote-id={quote.id}
      role="option"
      aria-selected={isFocused}
      aria-label={label}
      aria-setsize={total}
      aria-posinset={index}
      tabIndex={isFocused ? 0 : -1}
      className={`quote-item-a11y ${className} ${isFocused ? 'focused' : ''}`}
    >
      {children}
    </div>
  );
}

// Screen reader only styles (to be added to CSS)
export const srOnlyStyles = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;

export default QuoteListA11y;
