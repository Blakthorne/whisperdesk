import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getBibleBookNames } from '../../../services/electronAPI';
import type { BibleBookInfo } from '../../../types/electron';
import './BookAutocomplete.css';

interface BookAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (book: BibleBookInfo) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Autocomplete input for Bible book names with support for abbreviations.
 * Fetches the full list of 66 canonical books from the Bible API.
 */
export function BookAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Book name...',
  disabled = false,
  className = '',
  autoFocus = false,
}: BookAutocompleteProps): React.JSX.Element {
  const [books, setBooks] = useState<BibleBookInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Fetch books on mount
  useEffect(() => {
    let mounted = true;

    getBibleBookNames()
      .then((bookList: BibleBookInfo[]) => {
        if (mounted) {
          setBooks(bookList);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        console.error('Failed to fetch Bible books:', err);
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Filter books based on input
  const filteredBooks = useMemo(() => {
    if (!value.trim()) {
      return books;
    }

    const searchTerm = value.toLowerCase().trim();

    return books.filter((book) => {
      // Match full name
      if (book.name.toLowerCase().startsWith(searchTerm)) {
        return true;
      }
      // Match abbreviations (array)
      if (book.abbreviations.some((abbr) => abbr.toLowerCase().startsWith(searchTerm))) {
        return true;
      }
      // Match alternative abbreviations (e.g., "gen", "ex", "lev")
      const firstWord = book.name.split(' ')[0];
      if (firstWord && firstWord.toLowerCase().startsWith(searchTerm)) {
        return true;
      }
      // Match number + word (e.g., "1 cor", "2 tim")
      if (book.name.toLowerCase().includes(searchTerm)) {
        return true;
      }
      return false;
    });
  }, [value, books]);

  // Reset highlight when filtered results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredBooks.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedItem = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setIsOpen(true);
    },
    [onChange]
  );

  const handleSelect = useCallback(
    (book: BibleBookInfo) => {
      onChange(book.name);
      onSelect?.(book);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onChange, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          setIsOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < filteredBooks.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredBooks[highlightedIndex]) {
            handleSelect(filteredBooks[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'Tab':
          // Allow tab to close dropdown naturally
          setIsOpen(false);
          break;
      }
    },
    [isOpen, filteredBooks, highlightedIndex, handleSelect]
  );

  const handleFocus = useCallback(() => {
    if (value || filteredBooks.length > 0) {
      setIsOpen(true);
    }
  }, [value, filteredBooks.length]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Delay closing to allow click on dropdown item
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('.book-autocomplete-dropdown')) {
      return;
    }
    setTimeout(() => setIsOpen(false), 150);
  }, []);

  return (
    <div className={`book-autocomplete ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        autoFocus={autoFocus}
        className="book-autocomplete-input"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="book-autocomplete-listbox"
        aria-autocomplete="list"
      />

      {isLoading && (
        <div className="book-autocomplete-loading">
          <span className="book-autocomplete-spinner" />
        </div>
      )}

      {isOpen && filteredBooks.length > 0 && !isLoading && (
        <ul
          ref={listRef}
          id="book-autocomplete-listbox"
          className="book-autocomplete-dropdown"
          role="listbox"
        >
          {filteredBooks.map((book, index) => (
            <li
              key={book.name}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`book-autocomplete-option ${index === highlightedIndex ? 'highlighted' : ''}`}
              onClick={() => handleSelect(book)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className="book-autocomplete-option-name">{book.name}</span>
              <span className="book-autocomplete-option-abbrev">
                ({book.abbreviations[0] || book.name.slice(0, 3)})
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && filteredBooks.length === 0 && value && !isLoading && (
        <div className="book-autocomplete-empty">No matching books found</div>
      )}
    </div>
  );
}

export default BookAutocomplete;
