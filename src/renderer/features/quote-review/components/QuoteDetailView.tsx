import React, { useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Trash2,
  Edit2,
  BookOpen,
  Search,
  Plus,
  X,
  AlertTriangle
} from 'lucide-react';
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
  /** Callback when edit interjections is clicked (Legacy/Modal) - replaced by inline */
  onEditInterjections: () => void;
  /** Callback when delete is clicked */
  onDelete: () => void;
  /** Callback when toggle non-biblical is clicked */
  onToggleNonBiblical: () => void;
  /** Callback when lookup verse is clicked */
  onLookupVerse: (reference: string) => void;
  /** Callback when text is updated */
  onUpdateText: (text: string) => void;
  /** Callback when interjections are updated */
  onUpdateInterjections: (interjections: string[]) => void;
  /** Callback to close the detail view */
  onClose: () => void;
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
  onEditInterjections: _onEditInterjectionsLegacy,
  onDelete,
  onToggleNonBiblical,
  onLookupVerse,
  onUpdateText,
  onUpdateInterjections,
  onClose,
  isBoundaryEditing,
}: QuoteDetailViewProps): React.JSX.Element {
  // Reference Edit State
  const [isEditingReference, setIsEditingReference] = useState(false);
  const [localReference, setLocalReference] = useState(quote.reference || '');
  const [chapterVerse, setChapterVerse] = useState('');

  // Text Edit State
  const [isEditingText, setIsEditingText] = useState(false);
  const [localText, setLocalText] = useState(quote.text);

  // Interjection Edit State
  const [newInterjection, setNewInterjection] = useState('');
  const [isAddingInterjection, setIsAddingInterjection] = useState(false);

  // Sync state when quote changes
  useEffect(() => {
    setLocalText(quote.text);
    setLocalReference(quote.reference || '');
    const match = (quote.reference || '').match(/\s*(\d+:\d+(-\d+)?)$/);
    if (match && match[1]) {
      setChapterVerse(match[1]);
    } else {
      setChapterVerse('');
    }
  }, [quote]);


  // --- Reference Handlers ---

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


  // --- Text Handlers ---

  const handleTextSave = useCallback(() => {
    if (localText !== quote.text) {
        onUpdateText(localText);
    }
    setIsEditingText(false);
  }, [localText, quote.text, onUpdateText]);

  const handleTextCancel = useCallback(() => {
    setLocalText(quote.text);
    setIsEditingText(false);
  }, [quote.text]);


  // --- Interjection Handlers ---

  const handleAddInterjection = useCallback(() => {
    if (!newInterjection.trim()) return;
    const currentList = quote.interjections || [];
    onUpdateInterjections([...currentList, newInterjection.trim()]);
    setNewInterjection('');
    setIsAddingInterjection(false);
  }, [newInterjection, quote.interjections, onUpdateInterjections]);

  const handleRemoveInterjection = useCallback((indexToRemove: number) => {
    const currentList = quote.interjections || [];
    const newList = currentList.filter((_, idx) => idx !== indexToRemove);
    onUpdateInterjections(newList);
  }, [quote.interjections, onUpdateInterjections]);


  // --- Render ---

  return (
    <div className="quote-detail-view">
      {/* Header */}
      <div className="quote-detail-header">
        <button className="quote-detail-back-btn" onClick={onClose}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="quote-detail-id">ID: {quote.id.slice(0, 8)}</div>
      </div>

      {/* Quote Text Section */}
      <div className="quote-detail-section">
        <div className="quote-detail-label">
          <span>Quote Text</span>
          {!isEditingText && (
            <button
                className="quote-icon-btn"
                onClick={() => setIsEditingText(true)}
                title="Edit text"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>

        {isEditingText ? (
          <div className="quote-detail-text-editor">
            <textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              autoFocus
            />
            <div className="quote-detail-edit-actions">
              <button className="quote-btn-secondary" onClick={handleTextCancel}>Cancel</button>
              <button className="quote-btn-primary" onClick={handleTextSave}>Save Changes</button>
            </div>
          </div>
        ) : (
          <div className="quote-detail-text-container">
            <div className="quote-detail-text">
              <span className="quote-detail-quote-mark">“</span>
              {quote.text}
              <span className="quote-detail-quote-mark">”</span>
            </div>
          </div>
        )}
      </div>

      {/* Reference Section */}
      <div className="quote-detail-section">
        <div className="quote-detail-label">Reference</div>

        {quote.isNonBiblical ? (
          <div className="quote-detail-reference-display">
             <span className="non-biblical-badge">Non-Biblical Quote</span>
             <button
                className="quote-icon-btn"
                onClick={onToggleNonBiblical}
                title="Mark as Biblical"
             >
                 <BookOpen size={16} />
             </button>
          </div>
        ) : isEditingReference ? (
          <div className="quote-detail-reference-editor">
             <div className="quote-detail-reference-inputs">
                <div>
                     <BookAutocomplete
                        value={localReference.replace(/\s*\d+:\d+(-\d+)?$/, '')}
                        onChange={(val) => {
                            const newRef = chapterVerse ? `${val} ${chapterVerse}` : val;
                            setLocalReference(newRef);
                        }}
                        placeholder="Book name"
                        autoFocus
                    />
                </div>
                <input
                    type="text"
                    className="quote-detail-chapter-input"
                    value={chapterVerse}
                    onChange={handleChapterVerseChange}
                    placeholder="3:16"
                />
             </div>
             <div className="quote-detail-edit-actions">
                <button className="quote-btn-secondary" onClick={() => setIsEditingReference(false)}>Cancel</button>
                <button className="quote-btn-primary" onClick={handleReferenceSubmit}>Save</button>
             </div>
          </div>
        ) : (
          <div className="quote-detail-reference-display">
            <BookOpen size={18} className="text-slate-400" />
            <span className={quote.reference ? "quote-detail-reference-text" : "quote-detail-reference-missing"}>
                {quote.reference || "No reference set"}
            </span>

            <div className="quote-detail-actions-row">
                <button className="quote-icon-btn" onClick={() => setIsEditingReference(true)} title="Edit Reference">
                    <Edit2 size={14} />
                </button>
                {quote.reference && (
                    <button className="quote-icon-btn" onClick={() => onLookupVerse(quote.reference!)} title="Lookup Verse">
                        <Search size={14} />
                    </button>
                )}
                 <button
                    className="quote-icon-btn"
                    onClick={onToggleNonBiblical}
                    title="Mark as Non-Biblical"
                 >
                     <AlertTriangle size={14} />
                 </button>
            </div>
          </div>
        )}
      </div>

      {/* Interjections Section */}
      <div className="quote-detail-section">
        <div className="quote-detail-label">
            <span>Interjections</span>
            <button className="quote-icon-btn" onClick={() => setIsAddingInterjection(true)} title="Add Interjection">
                <Plus size={14} />
            </button>
        </div>

        <div className="quote-detail-interjections-list">
            {(quote.interjections || []).length === 0 && !isAddingInterjection && (
                <span className="quote-detail-empty-state">No interjections</span>
            )}

            {(quote.interjections || []).map((interjection, idx) => (
                <div key={idx} className="quote-detail-interjection-tag">
                    <span>{interjection}</span>
                    <button
                        className="quote-interjection-remove-btn"
                        onClick={() => handleRemoveInterjection(idx)}
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>

        {isAddingInterjection && (
            <div className="quote-detail-add-interjection">
                <input
                    type="text"
                    value={newInterjection}
                    onChange={(e) => setNewInterjection(e.target.value)}
                    placeholder="e.g. 'um', 'like'"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddInterjection();
                        if (e.key === 'Escape') setIsAddingInterjection(false);
                    }}
                />
                <button className="quote-btn-primary" onClick={handleAddInterjection}>Add</button>
                <button className="quote-icon-btn" onClick={() => setIsAddingInterjection(false)}><X size={14} /></button>
            </div>
        )}
      </div>

      {/* Main Actions Footer */}
      <div className="quote-detail-main-actions">
        {/* Verify Button */}
        <button
            className={`verify-btn-large ${quote.isReviewed ? 'verified' : ''}`}
            onClick={onVerify}
        >
            {quote.isReviewed ? (
                <>
                    <Check size={20} strokeWidth={3} /> Verified
                </>
            ) : (
                <>Mark as Verified</>
            )}
        </button>

        {/* Create/Delete Row */}
        <div className="quote-action-row">
             <button
                className={`boundary-btn ${isBoundaryEditing ? 'editing' : ''}`}
                onClick={onEditBoundaries}
             >
                <Edit2 size={16} />
                {isBoundaryEditing ? 'Editing Boundaries...' : 'Adjust Boundaries'}
             </button>

             <button
                className="delete-btn-large"
                onClick={onDelete}
                title="Delete Quote"
            >
                <Trash2 size={18} />
            </button>
        </div>
      </div>
    </div>
  );
}

export default QuoteDetailView;
