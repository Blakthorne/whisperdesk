import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BookAutocomplete } from './BookAutocomplete';
import type { BibleBookInfo } from '../../../types/electron';
import './FloatingEditBar.css';

interface FloatingEditBarProps {
  /** Current quote reference (e.g., "John 3:16") */
  reference: string;
  /** Whether the quote has been verified */
  isVerified: boolean;
  /** Whether boundary edit mode is active */
  isBoundaryEditActive: boolean;
  /** Whether this is a non-biblical quote */
  isNonBiblical: boolean;
  /** Position coordinates */
  position: { top: number; left: number };
  /** Callback when reference changes */
  onReferenceChange: (reference: string) => void;
  /** Callback when verify button clicked */
  onVerify: () => void;
  /** Callback when edit bounds button clicked */
  onEditBounds: () => void;
  /** Callback when delete is clicked */
  onDelete: () => void;
  /** Callback when edit interjections is clicked */
  onEditInterjections: () => void;
  /** Callback when mark as non-biblical is clicked */
  onToggleNonBiblical: () => void;
  /** Callback when lookup verse is clicked */
  onLookupVerse: () => void;
}

type MenuState = 'closed' | 'reference' | 'more';

/**
 * Floating toolbar that appears when a quote is focused.
 * Provides quick access to verify, edit bounds, and more actions.
 */
export function FloatingEditBar({
  reference,
  isVerified,
  isBoundaryEditActive,
  isNonBiblical,
  position,
  onReferenceChange,
  onVerify,
  onEditBounds,
  onDelete,
  onEditInterjections,
  onToggleNonBiblical,
  onLookupVerse,
}: FloatingEditBarProps): React.JSX.Element {
  const [menuState, setMenuState] = useState<MenuState>('closed');
  const [localReference, setLocalReference] = useState(reference);
  const [chapterVerse, setChapterVerse] = useState('');

  const barRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  // Sync local reference with prop
  useEffect(() => {
    setLocalReference(reference);
    // Parse chapter:verse if reference exists
    const match = reference.match(/\d+:\d+(-\d+)?$/);
    if (match) {
      setChapterVerse(match[0]);
    } else {
      setChapterVerse('');
    }
  }, [reference]);

  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setMenuState('closed');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setMenuState('closed');
    }
  }, []);

  // Toggle reference editor
  const toggleReferenceEditor = useCallback(() => {
    setMenuState((prev) => (prev === 'reference' ? 'closed' : 'reference'));
  }, []);

  // Toggle more menu
  const toggleMoreMenu = useCallback(() => {
    setMenuState((prev) => (prev === 'more' ? 'closed' : 'more'));
  }, []);

  // Handle book selection from autocomplete
  const handleBookSelect = useCallback(
    (book: BibleBookInfo) => {
      const newRef = chapterVerse ? `${book.name} ${chapterVerse}` : book.name;
      setLocalReference(newRef);
      onReferenceChange(newRef);
      // Focus chapter:verse input after book selection
      setTimeout(() => referenceInputRef.current?.focus(), 50);
    },
    [chapterVerse, onReferenceChange]
  );

  // Handle chapter:verse change
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
        onReferenceChange(newRef);
      }
    },
    [localReference, onReferenceChange]
  );

  // Handle verify with keyboard
  const handleVerifyKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onVerify();
      }
    },
    [onVerify]
  );

  return (
    <div
      ref={barRef}
      className={`floating-edit-bar ${isBoundaryEditActive ? 'boundary-edit-active' : ''}`}
      style={{ top: position.top, left: position.left }}
      onKeyDown={handleKeyDown}
      role="toolbar"
      aria-label="Quote editing toolbar"
    >
      {/* Reference display/editor */}
      <div className="edit-bar-reference">
        {menuState === 'reference' ? (
          <div className="edit-bar-reference-editor">
            <BookAutocomplete
              value={localReference.replace(/\s*\d+:\d+(-\d+)?$/, '')}
              onChange={(val) => {
                const newRef = chapterVerse ? `${val} ${chapterVerse}` : val;
                setLocalReference(newRef);
                onReferenceChange(newRef);
              }}
              onSelect={handleBookSelect}
              placeholder="Book"
              autoFocus
              className="edit-bar-book-input"
            />
            <input
              ref={referenceInputRef}
              type="text"
              value={chapterVerse}
              onChange={handleChapterVerseChange}
              placeholder="3:16"
              className="edit-bar-verse-input"
              aria-label="Chapter and verse"
            />
            <button
              className="edit-bar-lookup-btn"
              onClick={onLookupVerse}
              title="Lookup verse text"
              aria-label="Lookup verse text"
            >
              🔍
            </button>
          </div>
        ) : (
          <button
            className="edit-bar-reference-btn"
            onClick={toggleReferenceEditor}
            title={isNonBiblical ? 'Non-biblical quote' : 'Click to edit reference'}
          >
            {isNonBiblical ? (
              <span className="reference-non-biblical">Non-biblical</span>
            ) : reference ? (
              <span className="reference-text">{reference}</span>
            ) : (
              <span className="reference-placeholder">Add reference...</span>
            )}
          </button>
        )}
      </div>

      {/* Verify button */}
      <button
        className={`edit-bar-btn edit-bar-verify ${isVerified ? 'verified' : ''}`}
        onClick={onVerify}
        onKeyDown={handleVerifyKeyDown}
        title={isVerified ? 'Verified' : 'Mark as verified'}
        aria-pressed={isVerified}
      >
        <span className="edit-bar-btn-icon">{isVerified ? '✓' : '○'}</span>
        <span className="edit-bar-btn-text">{isVerified ? 'Verified' : 'Verify'}</span>
      </button>

      {/* Edit bounds button */}
      <button
        className={`edit-bar-btn edit-bar-bounds ${isBoundaryEditActive ? 'active' : ''}`}
        onClick={onEditBounds}
        title={isBoundaryEditActive ? 'Exit boundary edit mode' : 'Edit quote boundaries'}
        aria-pressed={isBoundaryEditActive}
      >
        <span className="edit-bar-btn-icon">✎</span>
        <span className="edit-bar-btn-text">{isBoundaryEditActive ? 'Done' : 'Edit Bounds'}</span>
      </button>

      {/* More menu */}
      <div className="edit-bar-more-container">
        <button
          className={`edit-bar-btn edit-bar-more ${menuState === 'more' ? 'active' : ''}`}
          onClick={toggleMoreMenu}
          title="More options"
          aria-expanded={menuState === 'more'}
          aria-haspopup="menu"
        >
          <span className="edit-bar-btn-icon">⋯</span>
        </button>

        {menuState === 'more' && (
          <div ref={moreMenuRef} className="edit-bar-more-menu" role="menu">
            <button
              className="edit-bar-menu-item"
              onClick={() => {
                onEditInterjections();
                setMenuState('closed');
              }}
              role="menuitem"
            >
              <span className="menu-item-icon">💬</span>
              Edit Interjections
            </button>
            <button
              className="edit-bar-menu-item"
              onClick={() => {
                onToggleNonBiblical();
                setMenuState('closed');
              }}
              role="menuitem"
            >
              <span className="menu-item-icon">{isNonBiblical ? '📖' : '📝'}</span>
              {isNonBiblical ? 'Mark as Biblical' : 'Mark as Non-Biblical'}
            </button>
            <div className="edit-bar-menu-divider" />
            <button
              className="edit-bar-menu-item edit-bar-menu-item-danger"
              onClick={() => {
                onDelete();
                setMenuState('closed');
              }}
              role="menuitem"
            >
              <span className="menu-item-icon">🗑</span>
              Delete Quote
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FloatingEditBar;
