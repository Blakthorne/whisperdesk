/**
 * Quote Review Context
 *
 * Provides state management for the quote boundary review feature including:
 * - Review mode state (panel visibility, focused quote, reviewed quotes)
 * - Boundary editing state (drag operations, previews)
 * - Quote creation state (selection, reference input, API lookup)
 * - Interjection editing state
 * - Panel filtering state
 *
 * State is persisted per-document to localStorage.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';

import type { NodeId } from '../../shared/documentModel';
import type {
  QuoteReviewContextState,
  QuoteReviewContextActions,
  QuoteReviewContextValue,
  QuoteReviewState,
  BoundaryEditModeState,
  QuoteBoundaryDragState,
  QuoteCreationState,
  InterjectionEditState,
  QuotePanelFilterState,
  QuotePanelFilterMode,
  BibleLookupResult,
  InterjectionCandidate,
  PersistedQuoteReviewState,
  QuoteReviewItem,
} from '../types/quoteReview';
import { DEFAULT_PANEL_WIDTH, BOUNDARY_CHANGE_DEBOUNCE_MS } from '../types/quoteReview';

import { STORAGE_KEYS } from '../utils/storage';
import { logger } from '../services';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialReviewState: QuoteReviewState = {
  isReviewModeActive: false,
  focusedQuoteId: null,
  reviewedQuoteIds: new Set(),
  panelOpen: false,
  panelWidth: DEFAULT_PANEL_WIDTH,
  bannerDismissed: false,
};

const initialBoundaryEditState: BoundaryEditModeState = {
  isActive: false,
  quoteId: null,
  previewStartOffset: null,
  previewEndOffset: null,
  lastChangeTimestamp: null,
};

const initialBoundaryDragState: QuoteBoundaryDragState = {
  isDragging: false,
  edge: null,
  originalOffset: 0,
  currentOffset: 0,
  quoteId: null,
  wouldMergeParagraphs: false,
  paragraphsToMerge: [],
};

const initialCreationState: QuoteCreationState = {
  isCreating: false,
  selectedText: '',
  selectedRange: null,
  referenceInput: '',
  lookupResult: null,
  isLookingUp: false,
  isNonBiblical: false,
  spannedParagraphIds: [],
};

const initialInterjectionEditState: InterjectionEditState = {
  isActive: false,
  quoteId: null,
  pendingCandidates: [],
  selectedText: null,
  selectionRange: null,
};

const initialPanelFilterState: QuotePanelFilterState = {
  mode: 'all',
  selectedBook: null,
  searchQuery: '',
};

const initialState: QuoteReviewContextState = {
  quotes: [],
  review: initialReviewState,
  boundaryEdit: initialBoundaryEditState,
  boundaryDrag: initialBoundaryDragState,
  creation: initialCreationState,
  interjectionEdit: initialInterjectionEditState,
  panelFilter: initialPanelFilterState,
};

// ============================================================================
// ACTION TYPES
// ============================================================================

type QuoteReviewAction =
  // Quote list actions
  | { type: 'SET_QUOTES'; payload: QuoteReviewItem[] }
  | { type: 'ADD_QUOTE'; payload: QuoteReviewItem }
  | { type: 'UPDATE_QUOTE'; payload: { quoteId: NodeId; updates: Partial<QuoteReviewItem> } }
  | { type: 'REMOVE_QUOTE'; payload: NodeId }
  // Review state actions
  | { type: 'SET_REVIEW_MODE_ACTIVE'; payload: boolean }
  | { type: 'SET_FOCUSED_QUOTE'; payload: NodeId | null }
  | { type: 'MARK_QUOTE_REVIEWED'; payload: NodeId }
  | { type: 'TOGGLE_PANEL' }
  | { type: 'SET_PANEL_OPEN'; payload: boolean }
  | { type: 'SET_PANEL_WIDTH'; payload: number }
  | { type: 'DISMISS_BANNER' }
  // Boundary edit actions
  | { type: 'ENTER_BOUNDARY_EDIT_MODE'; payload: NodeId }
  | { type: 'EXIT_BOUNDARY_EDIT_MODE' }
  | {
      type: 'UPDATE_BOUNDARY_PREVIEW';
      payload: { startOffset: number | null; endOffset: number | null };
    }
  | { type: 'COMMIT_BOUNDARY_CHANGE' }
  // Boundary drag actions
  | {
      type: 'START_BOUNDARY_DRAG';
      payload: { quoteId: NodeId; edge: 'start' | 'end'; offset: number };
    }
  | {
      type: 'UPDATE_BOUNDARY_DRAG';
      payload: { offset: number; wouldMerge: boolean; paragraphsToMerge: NodeId[] };
    }
  | { type: 'END_BOUNDARY_DRAG' }
  | { type: 'CANCEL_BOUNDARY_DRAG' }
  // Quote creation actions
  | {
      type: 'START_QUOTE_CREATION';
      payload: {
        selectedText: string;
        range: QuoteCreationState['selectedRange'];
        spannedParagraphIds: NodeId[];
      };
    }
  | { type: 'UPDATE_REFERENCE_INPUT'; payload: string }
  | { type: 'SET_LOOKUP_RESULT'; payload: BibleLookupResult | null }
  | { type: 'SET_IS_LOOKING_UP'; payload: boolean }
  | { type: 'SET_IS_NON_BIBLICAL'; payload: boolean }
  | { type: 'CANCEL_QUOTE_CREATION' }
  | { type: 'CONFIRM_QUOTE_CREATION' }
  // Interjection edit actions
  | { type: 'ENTER_INTERJECTION_EDIT_MODE'; payload: NodeId }
  | { type: 'EXIT_INTERJECTION_EDIT_MODE' }
  | { type: 'SET_PENDING_INTERJECTION_CANDIDATES'; payload: InterjectionCandidate[] }
  | { type: 'CONFIRM_INTERJECTION_CANDIDATE'; payload: number }
  | { type: 'REJECT_INTERJECTION_CANDIDATE'; payload: number }
  | {
      type: 'SET_INTERJECTION_SELECTION';
      payload: { text: string | null; range: { start: number; end: number } | null };
    }
  // Panel filter actions
  | { type: 'SET_FILTER_MODE'; payload: QuotePanelFilterMode }
  | { type: 'SET_SELECTED_BOOK'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  // Persistence actions
  | { type: 'LOAD_PERSISTED_STATE'; payload: PersistedQuoteReviewState }
  | { type: 'RESET_STATE' };

// ============================================================================
// REDUCER
// ============================================================================

function quoteReviewReducer(
  state: QuoteReviewContextState,
  action: QuoteReviewAction
): QuoteReviewContextState {
  switch (action.type) {
    // Quote list actions
    case 'SET_QUOTES':
      return {
        ...state,
        quotes: action.payload,
      };

    case 'ADD_QUOTE':
      return {
        ...state,
        quotes: [...state.quotes, action.payload],
      };

    case 'UPDATE_QUOTE': {
      const { quoteId, updates } = action.payload;
      return {
        ...state,
        quotes: state.quotes.map((q) => (q.id === quoteId ? { ...q, ...updates } : q)),
      };
    }

    case 'REMOVE_QUOTE':
      return {
        ...state,
        quotes: state.quotes.filter((q) => q.id !== action.payload),
        review: {
          ...state.review,
          focusedQuoteId:
            state.review.focusedQuoteId === action.payload ? null : state.review.focusedQuoteId,
        },
      };

    // Review state
    case 'SET_REVIEW_MODE_ACTIVE':
      return {
        ...state,
        review: { ...state.review, isReviewModeActive: action.payload },
      };

    case 'SET_FOCUSED_QUOTE':
      return {
        ...state,
        review: { ...state.review, focusedQuoteId: action.payload },
      };

    case 'MARK_QUOTE_REVIEWED': {
      const newReviewedIds = new Set(state.review.reviewedQuoteIds);
      newReviewedIds.add(action.payload);
      return {
        ...state,
        review: { ...state.review, reviewedQuoteIds: newReviewedIds },
      };
    }

    case 'TOGGLE_PANEL':
      return {
        ...state,
        review: { ...state.review, panelOpen: !state.review.panelOpen },
      };

    case 'SET_PANEL_OPEN':
      return {
        ...state,
        review: { ...state.review, panelOpen: action.payload },
      };

    case 'SET_PANEL_WIDTH':
      return {
        ...state,
        review: { ...state.review, panelWidth: action.payload },
      };

    case 'DISMISS_BANNER':
      return {
        ...state,
        review: { ...state.review, bannerDismissed: true },
      };

    // Boundary edit
    case 'ENTER_BOUNDARY_EDIT_MODE':
      return {
        ...state,
        boundaryEdit: {
          ...state.boundaryEdit,
          isActive: true,
          quoteId: action.payload,
          previewStartOffset: null,
          previewEndOffset: null,
          lastChangeTimestamp: null,
        },
      };

    case 'EXIT_BOUNDARY_EDIT_MODE':
      return {
        ...state,
        boundaryEdit: initialBoundaryEditState,
      };

    case 'UPDATE_BOUNDARY_PREVIEW':
      return {
        ...state,
        boundaryEdit: {
          ...state.boundaryEdit,
          previewStartOffset: action.payload.startOffset,
          previewEndOffset: action.payload.endOffset,
          lastChangeTimestamp: Date.now(),
        },
      };

    case 'COMMIT_BOUNDARY_CHANGE':
      return {
        ...state,
        boundaryEdit: {
          ...state.boundaryEdit,
          previewStartOffset: null,
          previewEndOffset: null,
          lastChangeTimestamp: null,
        },
      };

    // Boundary drag
    case 'START_BOUNDARY_DRAG':
      return {
        ...state,
        boundaryDrag: {
          isDragging: true,
          edge: action.payload.edge,
          originalOffset: action.payload.offset,
          currentOffset: action.payload.offset,
          quoteId: action.payload.quoteId,
          wouldMergeParagraphs: false,
          paragraphsToMerge: [],
        },
      };

    case 'UPDATE_BOUNDARY_DRAG':
      return {
        ...state,
        boundaryDrag: {
          ...state.boundaryDrag,
          currentOffset: action.payload.offset,
          wouldMergeParagraphs: action.payload.wouldMerge,
          paragraphsToMerge: action.payload.paragraphsToMerge,
        },
      };

    case 'END_BOUNDARY_DRAG':
    case 'CANCEL_BOUNDARY_DRAG':
      return {
        ...state,
        boundaryDrag: initialBoundaryDragState,
      };

    // Quote creation
    case 'START_QUOTE_CREATION':
      return {
        ...state,
        creation: {
          isCreating: true,
          selectedText: action.payload.selectedText,
          selectedRange: action.payload.range,
          referenceInput: '',
          lookupResult: null,
          isLookingUp: false,
          isNonBiblical: false,
          spannedParagraphIds: action.payload.spannedParagraphIds,
        },
      };

    case 'UPDATE_REFERENCE_INPUT':
      return {
        ...state,
        creation: { ...state.creation, referenceInput: action.payload },
      };

    case 'SET_LOOKUP_RESULT':
      return {
        ...state,
        creation: { ...state.creation, lookupResult: action.payload },
      };

    case 'SET_IS_LOOKING_UP':
      return {
        ...state,
        creation: { ...state.creation, isLookingUp: action.payload },
      };

    case 'SET_IS_NON_BIBLICAL':
      return {
        ...state,
        creation: { ...state.creation, isNonBiblical: action.payload },
      };

    case 'CANCEL_QUOTE_CREATION':
    case 'CONFIRM_QUOTE_CREATION':
      return {
        ...state,
        creation: initialCreationState,
      };

    // Interjection edit
    case 'ENTER_INTERJECTION_EDIT_MODE':
      return {
        ...state,
        interjectionEdit: {
          isActive: true,
          quoteId: action.payload,
          pendingCandidates: [],
          selectedText: null,
          selectionRange: null,
        },
      };

    case 'EXIT_INTERJECTION_EDIT_MODE':
      return {
        ...state,
        interjectionEdit: initialInterjectionEditState,
      };

    case 'SET_PENDING_INTERJECTION_CANDIDATES':
      return {
        ...state,
        interjectionEdit: {
          ...state.interjectionEdit,
          pendingCandidates: action.payload,
        },
      };

    case 'CONFIRM_INTERJECTION_CANDIDATE': {
      const candidates = [...state.interjectionEdit.pendingCandidates];
      const candidate = candidates[action.payload];
      if (candidate) {
        candidates[action.payload] = {
          ...candidate,
          confirmed: true,
          rejected: false,
        };
      }
      return {
        ...state,
        interjectionEdit: { ...state.interjectionEdit, pendingCandidates: candidates },
      };
    }

    case 'REJECT_INTERJECTION_CANDIDATE': {
      const candidates = [...state.interjectionEdit.pendingCandidates];
      const candidate = candidates[action.payload];
      if (candidate) {
        candidates[action.payload] = {
          ...candidate,
          confirmed: false,
          rejected: true,
        };
      }
      return {
        ...state,
        interjectionEdit: { ...state.interjectionEdit, pendingCandidates: candidates },
      };
    }

    case 'SET_INTERJECTION_SELECTION':
      return {
        ...state,
        interjectionEdit: {
          ...state.interjectionEdit,
          selectedText: action.payload.text,
          selectionRange: action.payload.range,
        },
      };

    // Panel filter
    case 'SET_FILTER_MODE':
      return {
        ...state,
        panelFilter: { ...state.panelFilter, mode: action.payload },
      };

    case 'SET_SELECTED_BOOK':
      return {
        ...state,
        panelFilter: { ...state.panelFilter, selectedBook: action.payload },
      };

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        panelFilter: { ...state.panelFilter, searchQuery: action.payload },
      };

    // Persistence
    case 'LOAD_PERSISTED_STATE':
      return {
        ...state,
        review: {
          ...state.review,
          panelOpen: action.payload.panelOpen,
          panelWidth: action.payload.panelWidth,
          reviewedQuoteIds: new Set(action.payload.reviewedQuoteIds),
          bannerDismissed: action.payload.bannerDismissed,
        },
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const QuoteReviewContext = createContext<QuoteReviewContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface QuoteReviewProviderProps {
  children: ReactNode;
  documentId?: string;
}

export function QuoteReviewProvider({ children, documentId }: QuoteReviewProviderProps) {
  const [state, dispatch] = useReducer(quoteReviewReducer, initialState);

  // Load persisted state when documentId changes
  useEffect(() => {
    if (documentId) {
      try {
        const key = `${STORAGE_KEYS.QUOTE_REVIEW_PREFIX}${documentId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const persisted = JSON.parse(saved) as PersistedQuoteReviewState;
          dispatch({ type: 'LOAD_PERSISTED_STATE', payload: persisted });
        }
      } catch (error) {
        logger.warn('Failed to load quote review state:', error);
      }
    } else {
      dispatch({ type: 'RESET_STATE' });
    }
  }, [documentId]);

  // Persist state function
  const persistState = useCallback(
    (docId: string) => {
      try {
        const key = `${STORAGE_KEYS.QUOTE_REVIEW_PREFIX}${docId}`;
        const persisted: PersistedQuoteReviewState = {
          panelOpen: state.review.panelOpen,
          panelWidth: state.review.panelWidth,
          reviewedQuoteIds: Array.from(state.review.reviewedQuoteIds),
          bannerDismissed: state.review.bannerDismissed,
        };
        localStorage.setItem(key, JSON.stringify(persisted));
      } catch (error) {
        logger.warn('Failed to persist quote review state:', error);
      }
    },
    [
      state.review.panelOpen,
      state.review.panelWidth,
      state.review.reviewedQuoteIds,
      state.review.bannerDismissed,
    ]
  );

  // Auto-persist when relevant state changes
  useEffect(() => {
    if (documentId) {
      persistState(documentId);
    }
  }, [documentId, persistState]);

  // ============================================================================
  // ACTION CREATORS
  // ============================================================================

  const actions: QuoteReviewContextActions = useMemo(
    () => ({
      // Quote list actions
      setQuotes: (quotes: QuoteReviewItem[]) => dispatch({ type: 'SET_QUOTES', payload: quotes }),
      addQuote: (quote: QuoteReviewItem) => dispatch({ type: 'ADD_QUOTE', payload: quote }),
      updateQuote: (quoteId: NodeId, updates: Partial<QuoteReviewItem>) =>
        dispatch({ type: 'UPDATE_QUOTE', payload: { quoteId, updates } }),
      removeQuote: (quoteId: NodeId) => dispatch({ type: 'REMOVE_QUOTE', payload: quoteId }),

      // Review state actions
      setReviewModeActive: (active: boolean) =>
        dispatch({ type: 'SET_REVIEW_MODE_ACTIVE', payload: active }),
      setFocusedQuote: (quoteId: NodeId | null) =>
        dispatch({ type: 'SET_FOCUSED_QUOTE', payload: quoteId }),
      markQuoteReviewed: (quoteId: NodeId) =>
        dispatch({ type: 'MARK_QUOTE_REVIEWED', payload: quoteId }),
      togglePanel: () => dispatch({ type: 'TOGGLE_PANEL' }),
      setPanelOpen: (open: boolean) => dispatch({ type: 'SET_PANEL_OPEN', payload: open }),
      setPanelWidth: (width: number) => dispatch({ type: 'SET_PANEL_WIDTH', payload: width }),
      dismissBanner: () => dispatch({ type: 'DISMISS_BANNER' }),

      // Boundary edit actions
      enterBoundaryEditMode: (quoteId: NodeId) =>
        dispatch({ type: 'ENTER_BOUNDARY_EDIT_MODE', payload: quoteId }),
      exitBoundaryEditMode: () => dispatch({ type: 'EXIT_BOUNDARY_EDIT_MODE' }),
      updateBoundaryPreview: (startOffset: number | null, endOffset: number | null) =>
        dispatch({ type: 'UPDATE_BOUNDARY_PREVIEW', payload: { startOffset, endOffset } }),
      commitBoundaryChange: () => dispatch({ type: 'COMMIT_BOUNDARY_CHANGE' }),

      // Boundary drag actions
      startBoundaryDrag: (quoteId: NodeId, edge: 'start' | 'end', offset: number) =>
        dispatch({ type: 'START_BOUNDARY_DRAG', payload: { quoteId, edge, offset } }),
      updateBoundaryDrag: (offset: number, wouldMerge: boolean, paragraphsToMerge: NodeId[]) =>
        dispatch({
          type: 'UPDATE_BOUNDARY_DRAG',
          payload: { offset, wouldMerge, paragraphsToMerge },
        }),
      endBoundaryDrag: () => dispatch({ type: 'END_BOUNDARY_DRAG' }),
      cancelBoundaryDrag: () => dispatch({ type: 'CANCEL_BOUNDARY_DRAG' }),

      // Quote creation actions
      startQuoteCreation: (
        selectedText: string,
        range: QuoteCreationState['selectedRange'],
        spannedParagraphIds: NodeId[]
      ) =>
        dispatch({
          type: 'START_QUOTE_CREATION',
          payload: { selectedText, range, spannedParagraphIds },
        }),
      updateReferenceInput: (input: string) =>
        dispatch({ type: 'UPDATE_REFERENCE_INPUT', payload: input }),
      setLookupResult: (result: BibleLookupResult | null) =>
        dispatch({ type: 'SET_LOOKUP_RESULT', payload: result }),
      setIsLookingUp: (isLookingUp: boolean) =>
        dispatch({ type: 'SET_IS_LOOKING_UP', payload: isLookingUp }),
      setIsNonBiblical: (isNonBiblical: boolean) =>
        dispatch({ type: 'SET_IS_NON_BIBLICAL', payload: isNonBiblical }),
      cancelQuoteCreation: () => dispatch({ type: 'CANCEL_QUOTE_CREATION' }),
      confirmQuoteCreation: () => dispatch({ type: 'CONFIRM_QUOTE_CREATION' }),

      // Interjection edit actions
      enterInterjectionEditMode: (quoteId: NodeId) =>
        dispatch({ type: 'ENTER_INTERJECTION_EDIT_MODE', payload: quoteId }),
      exitInterjectionEditMode: () => dispatch({ type: 'EXIT_INTERJECTION_EDIT_MODE' }),
      setPendingInterjectionCandidates: (candidates: InterjectionCandidate[]) =>
        dispatch({ type: 'SET_PENDING_INTERJECTION_CANDIDATES', payload: candidates }),
      confirmInterjectionCandidate: (index: number) =>
        dispatch({ type: 'CONFIRM_INTERJECTION_CANDIDATE', payload: index }),
      rejectInterjectionCandidate: (index: number) =>
        dispatch({ type: 'REJECT_INTERJECTION_CANDIDATE', payload: index }),
      setInterjectionSelection: (
        text: string | null,
        range: { start: number; end: number } | null
      ) => dispatch({ type: 'SET_INTERJECTION_SELECTION', payload: { text, range } }),

      // Panel filter actions
      setFilterMode: (mode: QuotePanelFilterMode) =>
        dispatch({ type: 'SET_FILTER_MODE', payload: mode }),
      setSelectedBook: (book: string | null) =>
        dispatch({ type: 'SET_SELECTED_BOOK', payload: book }),
      setSearchQuery: (query: string) => dispatch({ type: 'SET_SEARCH_QUERY', payload: query }),

      // Persistence
      loadPersistedState: (docId: string) => {
        try {
          const key = `${STORAGE_KEYS.QUOTE_REVIEW_PREFIX}${docId}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            const persisted = JSON.parse(saved) as PersistedQuoteReviewState;
            dispatch({ type: 'LOAD_PERSISTED_STATE', payload: persisted });
          }
        } catch (error) {
          logger.warn('Failed to load quote review state:', error);
        }
      },
      persistState,
    }),
    [persistState]
  );

  const value: QuoteReviewContextValue = useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [state, actions]
  );

  // Global keyboard shortcuts for quote review
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+Q (Mac) or Ctrl+Shift+Q (Windows/Linux) to toggle panel
      const isMod = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey;
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        actions.setPanelOpen(!state.review.panelOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.review.panelOpen, actions]);

  return <QuoteReviewContext.Provider value={value}>{children}</QuoteReviewContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useQuoteReview(): QuoteReviewContextValue {
  const context = useContext(QuoteReviewContext);
  if (!context) {
    throw new Error('useQuoteReview must be used within a QuoteReviewProvider');
  }
  return context;
}

// Optional hook that returns null if not in provider (for conditional usage)
export function useQuoteReviewOptional(): QuoteReviewContextValue | null {
  return useContext(QuoteReviewContext);
}

// ============================================================================
// SELECTORS (derived state helpers)
// ============================================================================

/**
 * Check if a specific quote is currently being edited
 */
export function isQuoteBeingEdited(state: QuoteReviewContextState, quoteId: NodeId): boolean {
  return (
    (state.boundaryEdit.isActive && state.boundaryEdit.quoteId === quoteId) ||
    (state.interjectionEdit.isActive && state.interjectionEdit.quoteId === quoteId)
  );
}

/**
 * Check if a specific quote has been reviewed
 */
export function isQuoteReviewed(state: QuoteReviewContextState, quoteId: NodeId): boolean {
  return state.review.reviewedQuoteIds.has(quoteId);
}

/**
 * Get the debounce delay for boundary changes
 */
export function getBoundaryChangeDebounceMs(): number {
  return BOUNDARY_CHANGE_DEBOUNCE_MS;
}
