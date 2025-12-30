/**
 * useInterjectionDetection Hook
 *
 * Handles automatic interjection detection in quote text:
 * - Pattern-based detection (Amen, Hallelujah, etc.)
 * - Confidence scoring
 * - User confirmation workflow
 */

import { useCallback } from 'react';
import { useQuoteReview } from '../../../contexts';
import type { InterjectionCandidate } from '../../../types/quoteReview';

// Common interjection patterns with their confidence weights
const INTERJECTION_PATTERNS = [
  // High confidence patterns
  { pattern: /\b(amen)\b/gi, confidence: 0.95, context: 'Common affirmation' },
  { pattern: /\b(hallelujah|alleluia)\b/gi, confidence: 0.95, context: 'Praise expression' },
  { pattern: /\b(praise the lord|praise god)\b/gi, confidence: 0.90, context: 'Praise expression' },
  { pattern: /\b(glory to god|glory be)\b/gi, confidence: 0.85, context: 'Glorification' },
  
  // Medium confidence patterns (might be part of quote)
  { pattern: /\b(yes lord)\b/gi, confidence: 0.75, context: 'Affirmation' },
  { pattern: /\b(thank you jesus|thank you lord)\b/gi, confidence: 0.80, context: 'Thanksgiving' },
  { pattern: /\b(come on|c'mon)\b/gi, confidence: 0.60, context: 'Encouragement' },
  { pattern: /\b(that's right)\b/gi, confidence: 0.55, context: 'Agreement' },
  
  // Lower confidence patterns (context-dependent)
  { pattern: /\b(mmhmm|mhm|uh-huh)\b/gi, confidence: 0.70, context: 'Verbal affirmation' },
  { pattern: /\b(wow|oh|ah)\b/gi, confidence: 0.40, context: 'Exclamation' },
];

// Minimum confidence threshold for auto-detection
const AUTO_DETECT_THRESHOLD = 0.50;

// Minimum confidence for high-confidence indicators
const HIGH_CONFIDENCE_THRESHOLD = 0.80;

interface UseInterjectionDetectionOptions {
  /** Minimum confidence threshold for detection */
  threshold?: number;
  /** Whether to only return high-confidence matches */
  highConfidenceOnly?: boolean;
}

interface InterjectionMatch {
  text: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
  context: string;
  pattern: string;
}

interface InterjectionDetectionActions {
  /** Detect interjections in text */
  detectInterjections: (text: string) => InterjectionCandidate[];
  /** Get high-confidence matches only */
  getHighConfidenceMatches: (text: string) => InterjectionCandidate[];
  /** Check if text contains likely interjections */
  hasLikelyInterjections: (text: string) => boolean;
  /** Start interjection editing for a quote */
  startEditing: (quoteId: string, text: string) => void;
  /** Confirm a detected interjection */
  confirmInterjection: (index: number) => void;
  /** Reject a detected interjection */
  rejectInterjection: (index: number) => void;
  /** Manually mark a selection as interjection */
  markSelectionAsInterjection: (text: string, startOffset: number, endOffset: number) => void;
  /** Exit interjection editing mode */
  exitEditing: () => void;
}

/**
 * Hook for interjection detection and management.
 */
export function useInterjectionDetection(
  options: UseInterjectionDetectionOptions = {}
): InterjectionDetectionActions {
  const { threshold = AUTO_DETECT_THRESHOLD, highConfidenceOnly = false } = options;

  const context = useQuoteReview();
  const {
    interjectionEdit,
    enterInterjectionEditMode,
    exitInterjectionEditMode,
    setPendingInterjectionCandidates,
    confirmInterjectionCandidate,
    rejectInterjectionCandidate,
    setInterjectionSelection,
  } = context;

  /**
   * Find all interjection matches in text
   */
  const findMatches = useCallback((text: string): InterjectionMatch[] => {
    const matches: InterjectionMatch[] = [];

    for (const { pattern, confidence, context } of INTERJECTION_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          text: match[0],
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          confidence,
          context,
          pattern: pattern.source,
        });
      }
    }

    // Sort by position
    matches.sort((a, b) => a.startOffset - b.startOffset);

    // Remove overlapping matches (keep higher confidence)
    const filteredMatches: InterjectionMatch[] = [];
    for (const match of matches) {
      const overlapping = filteredMatches.find(
        (m) =>
          (match.startOffset >= m.startOffset && match.startOffset < m.endOffset) ||
          (match.endOffset > m.startOffset && match.endOffset <= m.endOffset)
      );

      if (!overlapping) {
        filteredMatches.push(match);
      } else if (match.confidence > overlapping.confidence) {
        // Replace with higher confidence match
        const index = filteredMatches.indexOf(overlapping);
        filteredMatches[index] = match;
      }
    }

    return filteredMatches;
  }, []);

  /**
   * Detect interjections in text
   */
  const detectInterjections = useCallback((text: string): InterjectionCandidate[] => {
    const matches = findMatches(text);
    const effectiveThreshold = highConfidenceOnly ? HIGH_CONFIDENCE_THRESHOLD : threshold;

    return matches
      .filter((m) => m.confidence >= effectiveThreshold)
      .map((m) => ({
        text: m.text,
        startOffset: m.startOffset,
        endOffset: m.endOffset,
        confirmed: false,
        rejected: false,
        confidence: m.confidence,
        context: m.context,
      }));
  }, [findMatches, threshold, highConfidenceOnly]);

  /**
   * Get only high-confidence matches
   */
  const getHighConfidenceMatches = useCallback((text: string): InterjectionCandidate[] => {
    const matches = findMatches(text);

    return matches
      .filter((m) => m.confidence >= HIGH_CONFIDENCE_THRESHOLD)
      .map((m) => ({
        text: m.text,
        startOffset: m.startOffset,
        endOffset: m.endOffset,
        confirmed: false,
        rejected: false,
        confidence: m.confidence,
        context: m.context,
      }));
  }, [findMatches]);

  /**
   * Check if text likely contains interjections
   */
  const hasLikelyInterjections = useCallback((text: string): boolean => {
    const matches = findMatches(text);
    return matches.some((m) => m.confidence >= threshold);
  }, [findMatches, threshold]);

  /**
   * Start interjection editing for a quote
   */
  const startEditing = useCallback((quoteId: string, text: string) => {
    const candidates = detectInterjections(text);
    enterInterjectionEditMode(quoteId);
    setPendingInterjectionCandidates(candidates);
  }, [detectInterjections, enterInterjectionEditMode, setPendingInterjectionCandidates]);

  /**
   * Confirm a detected interjection
   */
  const confirmInterjection = useCallback((index: number) => {
    confirmInterjectionCandidate(index);
  }, [confirmInterjectionCandidate]);

  /**
   * Reject a detected interjection
   */
  const rejectInterjection = useCallback((index: number) => {
    rejectInterjectionCandidate(index);
  }, [rejectInterjectionCandidate]);

  /**
   * Manually mark a selection as interjection
   */
  const markSelectionAsInterjection = useCallback((
    text: string,
    startOffset: number,
    endOffset: number
  ) => {
    // Store the selection in state
    setInterjectionSelection(text, { start: startOffset, end: endOffset });

    // Add as a new confirmed candidate
    const newCandidate: InterjectionCandidate = {
      text,
      startOffset,
      endOffset,
      confirmed: true,
      rejected: false,
      confidence: 1.0, // Manual selection = full confidence
      context: 'Manually marked',
    };

    // Add to existing candidates
    const currentCandidates = [...interjectionEdit.pendingCandidates];
    
    // Insert in sorted position
    let insertIndex = currentCandidates.findIndex((c) => c.startOffset > startOffset);
    if (insertIndex === -1) {
      insertIndex = currentCandidates.length;
    }
    
    currentCandidates.splice(insertIndex, 0, newCandidate);
    setPendingInterjectionCandidates(currentCandidates);
  }, [interjectionEdit.pendingCandidates, setPendingInterjectionCandidates, setInterjectionSelection]);

  /**
   * Exit interjection editing mode
   */
  const exitEditing = useCallback(() => {
    exitInterjectionEditMode();
  }, [exitInterjectionEditMode]);

  return {
    detectInterjections,
    getHighConfidenceMatches,
    hasLikelyInterjections,
    startEditing,
    confirmInterjection,
    rejectInterjection,
    markSelectionAsInterjection,
    exitEditing,
  };
}

/**
 * Memoized list of common interjection words for display
 */
export const COMMON_INTERJECTIONS = [
  'Amen',
  'Hallelujah',
  'Praise the Lord',
  'Glory to God',
  'Yes Lord',
  'Thank you Jesus',
] as const;

export default useInterjectionDetection;
