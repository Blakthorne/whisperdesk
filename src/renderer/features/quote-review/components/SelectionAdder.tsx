import React, { useEffect, useState, useRef, useCallback } from 'react';
import './SelectionAdder.css';

interface SelectionPosition {
  top: number;
  left: number;
  width: number;
}

interface SelectionAdderProps {
  /** Container element to listen for selection events */
  containerRef: React.RefObject<HTMLElement>;
  /** Callback when "Create Quote" is clicked */
  onCreateQuote: (selectedText: string, range: Range) => void;
  /** Whether quote review mode is active */
  isReviewModeActive: boolean;
  /** Optional: minimum text length to show the adder */
  minSelectionLength?: number;
  /** Optional: debounce delay for selection detection */
  debounceMs?: number;
}

/**
 * Floating toolbar that appears when text is selected in the editor.
 * Allows users to create new quotes from selected text.
 */
export function SelectionAdder({
  containerRef,
  onCreateQuote,
  isReviewModeActive,
  minSelectionLength = 10,
  debounceMs = 150,
}: SelectionAdderProps): React.JSX.Element | null {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<SelectionPosition | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [currentRange, setCurrentRange] = useState<Range | null>(null);

  const adderRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Calculate position for the floating toolbar
  const calculatePosition = useCallback(
    (range: Range): SelectionPosition | null => {
      const rect = range.getBoundingClientRect();
      const container = containerRef.current;

      if (!container) return null;

      const containerRect = container.getBoundingClientRect();

      // Position above the selection, centered
      const top = rect.top - containerRect.top - 44; // 44px = toolbar height + gap
      const left = rect.left - containerRect.left + rect.width / 2;

      return {
        top: Math.max(0, top), // Don't go above container
        left: Math.max(50, Math.min(left, containerRect.width - 50)), // Keep within bounds
        width: rect.width,
      };
    },
    [containerRef]
  );

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const selection = window.getSelection();

      if (!selection || selection.isCollapsed || !containerRef.current) {
        setIsVisible(false);
        setSelectedText('');
        setCurrentRange(null);
        return;
      }

      // Check if selection is within our container
      const range = selection.getRangeAt(0);
      const selectionContainer = range.commonAncestorContainer;

      if (!containerRef.current.contains(selectionContainer)) {
        setIsVisible(false);
        return;
      }

      const text = selection.toString().trim();

      // Check minimum length
      if (text.length < minSelectionLength) {
        setIsVisible(false);
        return;
      }

      // Check if selection is within a quote already
      const parentElement =
        selectionContainer.nodeType === Node.ELEMENT_NODE
          ? (selectionContainer as HTMLElement)
          : selectionContainer.parentElement;

      if (parentElement?.closest('[data-quote-id]') || parentElement?.closest('blockquote')) {
        // Don't show adder if selecting within an existing quote
        setIsVisible(false);
        return;
      }

      const pos = calculatePosition(range);
      if (pos) {
        setPosition(pos);
        setSelectedText(text);
        setCurrentRange(range.cloneRange());
        setIsVisible(true);
      }
    }, debounceMs);
  }, [containerRef, minSelectionLength, debounceMs, calculatePosition]);

  // Set up selection listener
  useEffect(() => {
    if (!isReviewModeActive) {
      setIsVisible(false);
      return;
    }

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isReviewModeActive, handleSelectionChange]);

  // Handle click outside to hide
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adderRef.current && !adderRef.current.contains(e.target as Node)) {
        // Small delay to allow button click to process
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            setIsVisible(false);
          }
        }, 100);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle create quote action
  const handleCreateQuote = useCallback(() => {
    if (selectedText && currentRange) {
      onCreateQuote(selectedText, currentRange);
      setIsVisible(false);

      // Clear the selection
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, currentRange, onCreateQuote]);

  // Handle keyboard shortcut
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCreateQuote();
      } else if (e.key === 'Escape') {
        setIsVisible(false);
      }
    },
    [handleCreateQuote]
  );

  if (!isVisible || !position || !isReviewModeActive) {
    return null;
  }

  return (
    <div
      ref={adderRef}
      className="selection-adder"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      role="toolbar"
      aria-label="Text selection actions"
    >
      <button
        className="selection-adder-btn"
        onClick={handleCreateQuote}
        onKeyDown={handleKeyDown}
        title="Create quote from selection (Enter)"
      >
        <span className="selection-adder-icon">❝</span>
        <span className="selection-adder-text">Create Quote</span>
      </button>
      <div className="selection-adder-arrow" />
    </div>
  );
}

export default SelectionAdder;
