/**
 * useQuoteCreation Hook
 *
 * Handles the quote creation workflow:
 * - Text selection to quote conversion
 * - Reference input and validation
 * - Bible verse lookup integration
 * - Paragraph merge handling for multi-paragraph selections
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQuoteReview } from '../../../contexts';
import type { NodeId } from '../../../../shared/documentModel';
import type {
  BibleLookupResult,
  QuoteCreationState,
  QuoteReviewItem,
} from '../../../types/quoteReview';

// Reference pattern: "Book Chapter:Verse" or "Book Chapter:Verse-Verse"
const REFERENCE_PATTERN = /^([1-3]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s*(\d+):(\d+)(?:-(\d+))?$/;

// Debounce delay for lookup
const LOOKUP_DEBOUNCE_MS = 500;

interface UseQuoteCreationOptions {
  /** Callback to lookup Bible verse via IPC */
  onLookupVerse?: (reference: string) => Promise<BibleLookupResult>;
  /** Callback when quote is created */
  onQuoteCreated?: (quote: QuoteReviewItem) => void;
  /** Callback when paragraphs need to be merged */
  onParagraphMerge?: (paragraphIds: NodeId[]) => void;
}

interface QuoteCreationActions {
  /** Start creating a quote from selected text */
  startCreation: (
    selectedText: string,
    range: QuoteCreationState['selectedRange'],
    spannedParagraphIds: NodeId[]
  ) => void;
  /** Update the reference input */
  updateReference: (input: string) => void;
  /** Mark as non-biblical quote */
  setNonBiblical: (isNonBiblical: boolean) => void;
  /** Confirm and create the quote */
  confirm: () => Promise<void>;
  /** Cancel quote creation */
  cancel: () => void;
  /** Parse a reference string */
  parseReference: (reference: string) => {
    valid: boolean;
    book?: string;
    chapter?: number;
    verseStart?: number;
    verseEnd?: number;
  };
  /** Check if selection spans multiple paragraphs */
  checkMultiParagraph: () => boolean;
}

/**
 * Hook for managing quote creation workflow.
 */
export function useQuoteCreation(
  options: UseQuoteCreationOptions = {}
): QuoteCreationActions {
  const { onLookupVerse, onQuoteCreated, onParagraphMerge } = options;

  const context = useQuoteReview();
  const {
    creation,
    startQuoteCreation,
    updateReferenceInput,
    setLookupResult,
    setIsLookingUp,
    setIsNonBiblical,
    cancelQuoteCreation,
    confirmQuoteCreation,
    addQuote,
  } = context;

  // Debounce timer for lookup
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lookupTimerRef.current) {
        clearTimeout(lookupTimerRef.current);
      }
    };
  }, []);

  /**
   * Parse a reference string into components
   */
  const parseReference = useCallback((reference: string): {
    valid: boolean;
    book?: string;
    chapter?: number;
    verseStart?: number;
    verseEnd?: number;
  } => {
    const match = reference.trim().match(REFERENCE_PATTERN);
    if (!match) {
      return { valid: false };
    }

    const [, book, chapter, verseStart, verseEnd] = match;
    // All captured groups should be defined since the regex matched
    return {
      valid: true,
      book: book?.trim() ?? '',
      chapter: chapter ? parseInt(chapter, 10) : 0,
      verseStart: verseStart ? parseInt(verseStart, 10) : 0,
      verseEnd: verseEnd ? parseInt(verseEnd, 10) : undefined,
    };
  }, []);

  /**
   * Perform Bible verse lookup with debounce
   */
  const performLookup = useCallback(async (reference: string) => {
    if (!onLookupVerse) return;

    const parsed = parseReference(reference);
    if (!parsed.valid) {
      setLookupResult({
        success: false,
        error: 'Invalid reference format. Use "Book Chapter:Verse" format.',
      });
      return;
    }

    setIsLookingUp(true);

    try {
      const result = await onLookupVerse(reference);
      setLookupResult(result);
    } catch (error) {
      setLookupResult({
        success: false,
        error: error instanceof Error ? error.message : 'Lookup failed',
      });
    } finally {
      setIsLookingUp(false);
    }
  }, [onLookupVerse, parseReference, setIsLookingUp, setLookupResult]);

  /**
   * Start quote creation from selection
   */
  const startCreation = useCallback((
    selectedText: string,
    range: QuoteCreationState['selectedRange'],
    spannedParagraphIds: NodeId[]
  ) => {
    startQuoteCreation(selectedText, range, spannedParagraphIds);
  }, [startQuoteCreation]);

  /**
   * Update reference input with debounced lookup
   */
  const updateReference = useCallback((input: string) => {
    updateReferenceInput(input);

    // Clear existing timer
    if (lookupTimerRef.current) {
      clearTimeout(lookupTimerRef.current);
    }

    // Clear previous result immediately
    setLookupResult(null);

    // If input is non-empty and looks like a reference, schedule lookup
    if (input.trim() && parseReference(input).valid) {
      lookupTimerRef.current = setTimeout(() => {
        performLookup(input);
      }, LOOKUP_DEBOUNCE_MS);
    }
  }, [updateReferenceInput, setLookupResult, parseReference, performLookup]);

  /**
   * Set non-biblical flag
   */
  const setNonBiblicalFlag = useCallback((isNonBiblical: boolean) => {
    setIsNonBiblical(isNonBiblical);
    if (isNonBiblical) {
      // Clear any lookup result
      setLookupResult(null);
    }
  }, [setIsNonBiblical, setLookupResult]);

  /**
   * Confirm and create the quote
   */
  const confirm = useCallback(async () => {
    if (!creation.isCreating) return;

    const {
      selectedText,
      selectedRange,
      referenceInput,
      lookupResult,
      isNonBiblical,
      spannedParagraphIds,
    } = creation;

    // Generate unique ID
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create the quote item
    const newQuote: QuoteReviewItem = {
      id: quoteId,
      text: selectedText,
      reference: isNonBiblical ? undefined : (lookupResult?.normalizedReference || referenceInput),
      isNonBiblical,
      isReviewed: false,
      interjections: [],
      startOffset: selectedRange?.startOffset,
      endOffset: selectedRange?.endOffset,
      paragraphId: selectedRange?.startNodeId,
    };

    // Handle paragraph merging if selection spans multiple paragraphs
    if (spannedParagraphIds.length > 1 && onParagraphMerge) {
      onParagraphMerge(spannedParagraphIds);
    }

    // Add to quote list
    addQuote(newQuote);

    // Notify callback
    if (onQuoteCreated) {
      onQuoteCreated(newQuote);
    }

    // Confirm in context (resets creation state)
    confirmQuoteCreation();
  }, [creation, addQuote, onParagraphMerge, onQuoteCreated, confirmQuoteCreation]);

  /**
   * Cancel quote creation
   */
  const cancel = useCallback(() => {
    if (lookupTimerRef.current) {
      clearTimeout(lookupTimerRef.current);
      lookupTimerRef.current = null;
    }
    cancelQuoteCreation();
  }, [cancelQuoteCreation]);

  /**
   * Check if selection spans multiple paragraphs
   */
  const checkMultiParagraph = useCallback((): boolean => {
    return creation.spannedParagraphIds.length > 1;
  }, [creation.spannedParagraphIds]);

  return {
    startCreation,
    updateReference,
    setNonBiblical: setNonBiblicalFlag,
    confirm,
    cancel,
    parseReference,
    checkMultiParagraph,
  };
}

export default useQuoteCreation;
