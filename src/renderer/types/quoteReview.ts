/**
 * Quote Review Types
 *
 * Type definitions for the quote boundary review feature.
 * This includes state for the review panel, boundary editing, and quote creation.
 */

import type { NodeId, BibleTranslation } from '../../shared/documentModel';

// ============================================================================
// QUOTE ITEM TYPE (for UI display)
// ============================================================================

/**
 * Represents a quote item in the review list.
 * This is derived from the document model but enriched with UI state.
 */
export interface QuoteReviewItem {
  /** Quote node ID */
  id: NodeId;
  /** Quote text content */
  text: string;
  /** Bible reference (e.g., "John 3:16") */
  reference?: string;
  /** Whether this is a non-biblical quote */
  isNonBiblical: boolean;
  /** Whether the quote has been reviewed/verified */
  isReviewed: boolean;
  /** List of interjections within the quote */
  interjections?: string[];
  /** Quote start offset in document */
  startOffset?: number;
  /** Quote end offset in document */
  endOffset?: number;
  /** Paragraph ID containing this quote */
  paragraphId?: NodeId;
}

// ============================================================================
// REVIEW STATE
// ============================================================================

/**
 * State for the quote review feature.
 */
export interface QuoteReviewState {
  /** Whether review mode is currently active */
  isReviewModeActive: boolean;
  /** ID of the currently focused quote (for editing/navigation) */
  focusedQuoteId: NodeId | null;
  /** Set of quote IDs that have been reviewed in this session */
  reviewedQuoteIds: Set<NodeId>;
  /** Whether the side panel is open */
  panelOpen: boolean;
  /** Current width of the side panel in pixels */
  panelWidth: number;
  /** Whether the banner has been dismissed for this document */
  bannerDismissed: boolean;
}

/**
 * Persisted state that survives across sessions.
 */
export interface PersistedQuoteReviewState {
  /** Whether the panel is open */
  panelOpen: boolean;
  /** Panel width */
  panelWidth: number;
  /** IDs of quotes that have been reviewed */
  reviewedQuoteIds: string[];
  /** Whether banner was dismissed */
  bannerDismissed: boolean;
}

// ============================================================================
// BOUNDARY EDITING STATE
// ============================================================================

/**
 * State for boundary drag operations.
 */
export interface QuoteBoundaryDragState {
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** Which edge is being dragged */
  edge: 'start' | 'end' | null;
  /** Original offset before drag started */
  originalOffset: number;
  /** Current offset during drag */
  currentOffset: number;
  /** Quote ID being edited */
  quoteId: NodeId | null;
  /** Whether the drag would cause a paragraph merge */
  wouldMergeParagraphs: boolean;
  /** IDs of paragraphs that would be merged */
  paragraphsToMerge: NodeId[];
}

/**
 * State for boundary edit mode (not just dragging).
 */
export interface BoundaryEditModeState {
  /** Whether boundary edit mode is active */
  isActive: boolean;
  /** Quote being edited */
  quoteId: NodeId | null;
  /** Preview of start offset (may differ from committed) */
  previewStartOffset: number | null;
  /** Preview of end offset (may differ from committed) */
  previewEndOffset: number | null;
  /** Timestamp of last boundary change (for debouncing) */
  lastChangeTimestamp: number | null;
}

// ============================================================================
// QUOTE CREATION STATE
// ============================================================================

/**
 * Result from Bible verse lookup.
 */
export interface BibleLookupResult {
  success: boolean;
  verseText?: string;
  normalizedReference?: string;
  book?: string;
  chapter?: number;
  verseStart?: number | null;
  verseEnd?: number | null;
  translation?: BibleTranslation;
  error?: string;
}

/**
 * State for quote creation flow.
 */
export interface QuoteCreationState {
  /** Whether quote creation is in progress */
  isCreating: boolean;
  /** The selected text to be converted to a quote */
  selectedText: string;
  /** Selection range in the document */
  selectedRange: {
    /** Starting node ID */
    startNodeId: NodeId;
    /** Starting offset within node */
    startOffset: number;
    /** Ending node ID */
    endNodeId: NodeId;
    /** Ending offset within node */
    endOffset: number;
  } | null;
  /** Current reference input value */
  referenceInput: string;
  /** Result from Bible API lookup */
  lookupResult: BibleLookupResult | null;
  /** Whether lookup is in progress */
  isLookingUp: boolean;
  /** Whether this is a non-biblical quote */
  isNonBiblical: boolean;
  /** Paragraph IDs that selection spans (for merge detection) */
  spannedParagraphIds: NodeId[];
}

// ============================================================================
// INTERJECTION EDITING STATE
// ============================================================================

/**
 * Detected interjection candidate.
 */
export interface InterjectionCandidate {
  /** Text of the interjection */
  text: string;
  /** Start offset within quote */
  startOffset: number;
  /** End offset within quote */
  endOffset: number;
  /** Whether user has confirmed this interjection */
  confirmed: boolean;
  /** Whether user has rejected this interjection */
  rejected: boolean;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Surrounding context for display */
  context?: string;
}

/**
 * State for interjection edit mode.
 */
export interface InterjectionEditState {
  /** Whether interjection edit mode is active */
  isActive: boolean;
  /** Quote being edited */
  quoteId: NodeId | null;
  /** Auto-detected interjection candidates pending confirmation */
  pendingCandidates: InterjectionCandidate[];
  /** Currently selected text for marking as interjection */
  selectedText: string | null;
  /** Selection range for marking */
  selectionRange: { start: number; end: number } | null;
}

// ============================================================================
// PANEL FILTER STATE
// ============================================================================

/**
 * Filter mode for the quote panel.
 */
export type QuotePanelFilterMode = 'all' | 'unverified' | 'by-book';

/**
 * State for quote panel filtering.
 */
export interface QuotePanelFilterState {
  /** Current filter mode */
  mode: QuotePanelFilterMode;
  /** Selected book for 'by-book' filter */
  selectedBook: string | null;
  /** Search query (optional) */
  searchQuery: string;
}

// ============================================================================
// COMBINED CONTEXT STATE
// ============================================================================

/**
 * Complete state for the quote review context.
 */
export interface QuoteReviewContextState {
  /** List of quotes for the UI */
  quotes: QuoteReviewItem[];
  /** Main review state */
  review: QuoteReviewState;
  /** Boundary editing state */
  boundaryEdit: BoundaryEditModeState;
  /** Boundary drag state */
  boundaryDrag: QuoteBoundaryDragState;
  /** Quote creation state */
  creation: QuoteCreationState;
  /** Interjection editing state */
  interjectionEdit: InterjectionEditState;
  /** Panel filter state */
  panelFilter: QuotePanelFilterState;
}

/**
 * Actions for the quote review context.
 */
export interface QuoteReviewContextActions {
  // Quote list actions
  setQuotes: (quotes: QuoteReviewItem[]) => void;
  addQuote: (quote: QuoteReviewItem) => void;
  updateQuote: (quoteId: NodeId, updates: Partial<QuoteReviewItem>) => void;
  removeQuote: (quoteId: NodeId) => void;
  
  // Review state actions
  setReviewModeActive: (active: boolean) => void;
  setFocusedQuote: (quoteId: NodeId | null) => void;
  markQuoteReviewed: (quoteId: NodeId) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setPanelWidth: (width: number) => void;
  dismissBanner: () => void;

  // Boundary edit actions
  enterBoundaryEditMode: (quoteId: NodeId) => void;
  exitBoundaryEditMode: () => void;
  updateBoundaryPreview: (startOffset: number | null, endOffset: number | null) => void;
  commitBoundaryChange: () => void;

  // Boundary drag actions
  startBoundaryDrag: (quoteId: NodeId, edge: 'start' | 'end', offset: number) => void;
  updateBoundaryDrag: (offset: number, wouldMerge: boolean, paragraphsToMerge: NodeId[]) => void;
  endBoundaryDrag: () => void;
  cancelBoundaryDrag: () => void;

  // Quote creation actions
  startQuoteCreation: (
    selectedText: string,
    range: QuoteCreationState['selectedRange'],
    spannedParagraphIds: NodeId[]
  ) => void;
  updateReferenceInput: (input: string) => void;
  setLookupResult: (result: BibleLookupResult | null) => void;
  setIsLookingUp: (isLookingUp: boolean) => void;
  setIsNonBiblical: (isNonBiblical: boolean) => void;
  cancelQuoteCreation: () => void;
  confirmQuoteCreation: () => void;

  // Interjection edit actions
  enterInterjectionEditMode: (quoteId: NodeId) => void;
  exitInterjectionEditMode: () => void;
  setPendingInterjectionCandidates: (candidates: InterjectionCandidate[]) => void;
  confirmInterjectionCandidate: (index: number) => void;
  rejectInterjectionCandidate: (index: number) => void;
  setInterjectionSelection: (text: string | null, range: { start: number; end: number } | null) => void;

  // Panel filter actions
  setFilterMode: (mode: QuotePanelFilterMode) => void;
  setSelectedBook: (book: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Persistence
  loadPersistedState: (documentId: string) => void;
  persistState: (documentId: string) => void;
}

/**
 * Complete quote review context value.
 */
export interface QuoteReviewContextValue extends QuoteReviewContextState, QuoteReviewContextActions {}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default panel width in pixels.
 */
export const DEFAULT_PANEL_WIDTH = 320;

/**
 * Minimum panel width in pixels.
 */
export const MIN_PANEL_WIDTH = 240;

/**
 * Maximum panel width in pixels.
 */
export const MAX_PANEL_WIDTH = 600;

/**
 * Collapsed panel width in pixels.
 */
export const COLLAPSED_PANEL_WIDTH = 40;

/**
 * Debounce delay for boundary changes (ms).
 */
export const BOUNDARY_CHANGE_DEBOUNCE_MS = 500;
