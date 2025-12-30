/**
 * useQuoteKeyboardNavigation Hook
 *
 * Provides keyboard navigation and shortcuts for quote review:
 * - Arrow key navigation between quotes
 * - Enter to verify/confirm
 * - Escape to cancel
 * - Tab for focus management
 * - Keyboard shortcuts for common actions
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQuoteReview } from '../../../contexts';
import type { NodeId } from '../../../../shared/documentModel';
import type { QuoteReviewItem } from '../../../types/quoteReview';

// Keyboard shortcut modifiers
const MOD_KEY = navigator.platform.includes('Mac') ? 'metaKey' : 'ctrlKey';

interface UseQuoteKeyboardNavigationOptions {
  /** List of quotes for navigation */
  quotes: QuoteReviewItem[];
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
  /** Callback when edit boundaries is triggered */
  onEditBoundaries?: (quoteId: NodeId) => void;
  /** Callback when delete is triggered */
  onDelete?: (quoteId: NodeId) => void;
  /** Callback when lookup is triggered */
  onLookupVerse?: (reference: string) => void;
  /** Container element ref for focus trapping */
  containerRef?: React.RefObject<HTMLElement>;
}

interface QuoteKeyboardNavigationActions {
  /** Navigate to next quote */
  navigateNext: () => void;
  /** Navigate to previous quote */
  navigatePrevious: () => void;
  /** Navigate to first quote */
  navigateFirst: () => void;
  /** Navigate to last quote */
  navigateLast: () => void;
  /** Navigate to next unverified quote */
  navigateNextUnverified: () => void;
  /** Toggle verify on current quote */
  toggleVerify: () => void;
  /** Get all keyboard shortcuts for help display */
  getShortcuts: () => Array<{ key: string; description: string }>;
  /** Handle keydown event (attach to container) */
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Hook for keyboard navigation in quote review.
 */
export function useQuoteKeyboardNavigation(
  options: UseQuoteKeyboardNavigationOptions
): QuoteKeyboardNavigationActions {
  const {
    quotes,
    enabled = true,
    onEditBoundaries,
    onDelete,
    onLookupVerse,
    containerRef,
  } = options;

  const context = useQuoteReview();
  const {
    review,
    boundaryDrag,
    interjectionEdit,
    setFocusedQuote,
    updateQuote,
    exitBoundaryEditMode,
    exitInterjectionEditMode,
    cancelBoundaryDrag,
  } = context;

  const focusedQuoteId = review.focusedQuoteId;

  // Track the last focused element for focus restoration
  const lastFocusedRef = useRef<Element | null>(null);

  /**
   * Find index of currently focused quote
   */
  const getCurrentIndex = useCallback((): number => {
    if (!focusedQuoteId) return -1;
    return quotes.findIndex((q) => q.id === focusedQuoteId);
  }, [quotes, focusedQuoteId]);

  /**
   * Get quote at index
   */
  const getQuoteAtIndex = useCallback((index: number): QuoteReviewItem | null => {
    if (index < 0 || index >= quotes.length) return null;
    return quotes[index] ?? null;
  }, [quotes]);

  /**
   * Navigate to next quote
   */
  const navigateNext = useCallback(() => {
    const currentIndex = getCurrentIndex();
    const nextIndex = currentIndex < quotes.length - 1 ? currentIndex + 1 : 0;
    const nextQuote = getQuoteAtIndex(nextIndex);
    if (nextQuote) {
      setFocusedQuote(nextQuote.id);
    }
  }, [getCurrentIndex, getQuoteAtIndex, quotes.length, setFocusedQuote]);

  /**
   * Navigate to previous quote
   */
  const navigatePrevious = useCallback(() => {
    const currentIndex = getCurrentIndex();
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : quotes.length - 1;
    const prevQuote = getQuoteAtIndex(prevIndex);
    if (prevQuote) {
      setFocusedQuote(prevQuote.id);
    }
  }, [getCurrentIndex, getQuoteAtIndex, quotes.length, setFocusedQuote]);

  /**
   * Navigate to first quote
   */
  const navigateFirst = useCallback(() => {
    const firstQuote = getQuoteAtIndex(0);
    if (firstQuote) {
      setFocusedQuote(firstQuote.id);
    }
  }, [getQuoteAtIndex, setFocusedQuote]);

  /**
   * Navigate to last quote
   */
  const navigateLast = useCallback(() => {
    const lastQuote = getQuoteAtIndex(quotes.length - 1);
    if (lastQuote) {
      setFocusedQuote(lastQuote.id);
    }
  }, [getQuoteAtIndex, quotes.length, setFocusedQuote]);

  /**
   * Navigate to next unverified quote
   */
  const navigateNextUnverified = useCallback(() => {
    const currentIndex = getCurrentIndex();
    
    // Search from current position to end
    for (let i = currentIndex + 1; i < quotes.length; i++) {
      const quote = quotes[i];
      if (quote && !quote.isReviewed) {
        setFocusedQuote(quote.id);
        return;
      }
    }
    
    // Wrap around and search from beginning
    for (let i = 0; i <= currentIndex; i++) {
      const quote = quotes[i];
      if (quote && !quote.isReviewed) {
        setFocusedQuote(quote.id);
        return;
      }
    }
  }, [getCurrentIndex, quotes, setFocusedQuote]);

  /**
   * Toggle verify on current quote
   */
  const toggleVerify = useCallback(() => {
    if (!focusedQuoteId) return;
    const quote = quotes.find((q) => q.id === focusedQuoteId);
    if (quote) {
      updateQuote(focusedQuoteId, { isReviewed: !quote.isReviewed });
    }
  }, [focusedQuoteId, quotes, updateQuote]);

  /**
   * Handle escape key - cancel current operation
   */
  const handleEscape = useCallback(() => {
    // Cancel boundary drag first
    if (boundaryDrag.isDragging) {
      cancelBoundaryDrag();
      return true;
    }

    // Exit boundary edit mode
    if (context.boundaryEdit.isActive) {
      exitBoundaryEditMode();
      return true;
    }

    // Exit interjection edit mode
    if (interjectionEdit.isActive) {
      exitInterjectionEditMode();
      return true;
    }

    return false;
  }, [
    boundaryDrag.isDragging,
    context.boundaryEdit.isActive,
    interjectionEdit.isActive,
    cancelBoundaryDrag,
    exitBoundaryEditMode,
    exitInterjectionEditMode,
  ]);

  /**
   * Handle keydown event
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enabled) return;

    // Check for modifier keys
    const hasModifier = event.metaKey || event.ctrlKey;
    const hasShift = event.shiftKey;

    switch (event.key) {
      case 'ArrowDown':
      case 'j':
        if (!hasModifier) {
          event.preventDefault();
          navigateNext();
        }
        break;

      case 'ArrowUp':
      case 'k':
        if (!hasModifier) {
          event.preventDefault();
          navigatePrevious();
        }
        break;

      case 'Home':
        if (!hasModifier) {
          event.preventDefault();
          navigateFirst();
        }
        break;

      case 'End':
        if (!hasModifier) {
          event.preventDefault();
          navigateLast();
        }
        break;

      case 'n':
        if (!hasModifier) {
          event.preventDefault();
          navigateNextUnverified();
        }
        break;

      case 'Enter':
      case ' ':
        if (!hasModifier && focusedQuoteId) {
          event.preventDefault();
          toggleVerify();
        }
        break;

      case 'e':
        if (!hasModifier && focusedQuoteId && onEditBoundaries) {
          event.preventDefault();
          onEditBoundaries(focusedQuoteId);
        }
        break;

      case 'Delete':
      case 'Backspace':
        if ((hasModifier || hasShift) && focusedQuoteId && onDelete) {
          event.preventDefault();
          onDelete(focusedQuoteId);
        }
        break;

      case 'l':
        if (event[MOD_KEY] && focusedQuoteId && onLookupVerse) {
          event.preventDefault();
          const quote = quotes.find((q) => q.id === focusedQuoteId);
          if (quote?.reference) {
            onLookupVerse(quote.reference);
          }
        }
        break;

      case 'Escape':
        if (handleEscape()) {
          event.preventDefault();
        }
        break;
    }
  }, [
    enabled,
    focusedQuoteId,
    quotes,
    navigateNext,
    navigatePrevious,
    navigateFirst,
    navigateLast,
    navigateNextUnverified,
    toggleVerify,
    onEditBoundaries,
    onDelete,
    onLookupVerse,
    handleEscape,
  ]);

  /**
   * Get list of shortcuts for help display
   */
  const getShortcuts = useCallback((): Array<{ key: string; description: string }> => {
    return [
      { key: '↓ / j', description: 'Next quote' },
      { key: '↑ / k', description: 'Previous quote' },
      { key: 'Home', description: 'First quote' },
      { key: 'End', description: 'Last quote' },
      { key: 'n', description: 'Next unverified' },
      { key: 'Enter / Space', description: 'Toggle verified' },
      { key: 'e', description: 'Edit boundaries' },
      { key: '⇧+Delete', description: 'Delete quote' },
      { key: '⌘/Ctrl+l', description: 'Lookup verse' },
      { key: 'Escape', description: 'Cancel / exit' },
    ];
  }, []);

  // Focus the first quote when entering review mode
  useEffect(() => {
    if (enabled && quotes.length > 0 && !focusedQuoteId) {
      const firstQuote = quotes[0];
      if (firstQuote) {
        setFocusedQuote(firstQuote.id);
      }
    }
  }, [enabled, quotes, focusedQuoteId, setFocusedQuote]);

  // Focus trap: keep focus within container
  useEffect(() => {
    if (!enabled || !containerRef?.current) return;

    const container = containerRef.current;

    const handleFocusOut = (event: FocusEvent) => {
      if (!container.contains(event.relatedTarget as Node)) {
        // Focus is leaving container, save it
        lastFocusedRef.current = event.relatedTarget as Element;
      }
    };

    container.addEventListener('focusout', handleFocusOut);

    return () => {
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, [enabled, containerRef]);

  return {
    navigateNext,
    navigatePrevious,
    navigateFirst,
    navigateLast,
    navigateNextUnverified,
    toggleVerify,
    getShortcuts,
    handleKeyDown,
  };
}

export default useQuoteKeyboardNavigation;
