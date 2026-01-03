/**
 * Document History Integration
 *
 * Phase D: Integrates DocumentState persistence with the existing
 * history service. Provides utilities for:
 *
 * - Saving document state with history items
 * - Restoring document state from history
 * - Migrating legacy history items to new format
 */

import type { DocumentState } from '../../../../shared/documentModel';
import type { HistoryItem } from '../../../../shared/types';
import {
  compactSerialize,
  compactDeserialize,
} from '../serialization';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended history item with serialized document state.
 */
export interface HistoryItemWithState extends HistoryItem {
  /** Serialized document state (compact format) */
  documentStateJson?: string;
}

/**
 * Options for saving to history.
 */
export interface SaveToHistoryOptions {
  /** Whether to include event log (default: true) */
  includeEventLog?: boolean;
  /** Maximum events to store (default: 100) */
  maxEvents?: number;
}

/**
 * Result from restoring history.
 * 
 * AST-ONLY ARCHITECTURE: The state field contains the DocumentState (AST).
 * HTML is no longer stored; it can be generated on-demand from AST when needed.
 */
export interface RestoreFromHistoryResult {
  success: boolean;
  state?: DocumentState;
  error?: string;
  /** Whether the history item uses legacy format (deprecated) */
  isLegacy?: boolean;
}

// ============================================================================
// SAVE TO HISTORY
// ============================================================================

/**
 * Create history item data with serialized document state.
 */
export function createHistoryItemWithState(
  baseItem: Omit<HistoryItem, 'id'>,
  documentState: DocumentState | null,
  options: SaveToHistoryOptions = {}
): Omit<HistoryItemWithState, 'id'> {
  const { includeEventLog = true, maxEvents = 100 } = options;

  let documentStateJson: string | undefined;

  if (documentState) {
    documentStateJson = compactSerialize(documentState, {
      includeEventLog,
      maxEvents,
    });
  }

  return {
    ...baseItem,
    documentStateJson,
  };
}

/**
 * Update an existing history item with new document state.
 * 
 * AST-ONLY ARCHITECTURE: The DocumentState is the single source of truth.
 * HTML is no longer stored; it can be generated on-demand from AST when needed.
 */
export function updateHistoryItemState(
  item: HistoryItem,
  documentState: DocumentState,
  options: SaveToHistoryOptions = {}
): HistoryItemWithState {
  const { includeEventLog = true, maxEvents = 100 } = options;

  const documentStateJson = compactSerialize(documentState, {
    includeEventLog,
    maxEvents,
  });

  return {
    ...item,
    documentStateJson,
  };
}

// ============================================================================
// RESTORE FROM HISTORY
// ============================================================================

/**
 * Restore document state from a history item.
 */
export function restoreFromHistoryItem(
  item: HistoryItem | HistoryItemWithState
): RestoreFromHistoryResult {
  // Check for new format first (serialized DocumentState)
  const extendedItem = item as HistoryItemWithState;
  if (extendedItem.documentStateJson) {
    const result = compactDeserialize(extendedItem.documentStateJson);
    if (result.success && result.state) {
      return {
        success: true,
        state: result.state,
        isLegacy: false,
      };
    }
    return {
      success: false,
      error: result.error || 'Failed to deserialize document state',
      isLegacy: false,
    };
  }

  // Check for documentState in sermonDocument (from Python pipeline)
  if (item.sermonDocument?.documentState) {
    return {
      success: true,
      state: item.sermonDocument.documentState,
      isLegacy: false,
    };
  }

  // No document data available
  // Note: Legacy documentHtml support removed in AST-only architecture
  return {
    success: false,
    error: 'No document state available in history item',
    isLegacy: false,
  };
}

/**
 * Check if a history item has document state.
 * 
 * AST-ONLY ARCHITECTURE: Only checks for DocumentState; 
 * legacy documentHtml is no longer supported.
 */
export function hasDocumentState(item: HistoryItem | HistoryItemWithState): boolean {
  const extendedItem = item as HistoryItemWithState;
  return !!(
    extendedItem.documentStateJson ||
    item.sermonDocument?.documentState
  );
}

/**
 * Check if a history item uses the new format (DocumentState).
 */
export function hasNewFormatState(item: HistoryItem | HistoryItemWithState): boolean {
  const extendedItem = item as HistoryItemWithState;
  return !!(extendedItem.documentStateJson || item.sermonDocument?.documentState);
}

// ============================================================================
// MIGRATION (DEPRECATED)
// ============================================================================

/**
 * @deprecated Legacy migration removed in AST-only architecture.
 * History items without DocumentState are no longer supported.
 * This function is kept for reference but simply returns the item unchanged
 * if it already has DocumentState, or null if it doesn't.
 */
export function migrateHistoryItem(
  item: HistoryItem,
  _convertHtmlToState: (html: string) => DocumentState | null
): HistoryItemWithState | null {
  // Already has new format - return as-is
  if (hasNewFormatState(item)) {
    return item as HistoryItemWithState;
  }

  // Cannot migrate - legacy items without DocumentState are not supported
  return null;
}

// ============================================================================
// STORAGE SIZE UTILITIES
// ============================================================================

/**
 * Estimate the storage size of a history item in bytes.
 */
export function estimateStorageSize(item: HistoryItemWithState): number {
  const json = JSON.stringify(item);
  // UTF-16 encoding: 2 bytes per character
  return json.length * 2;
}

/**
 * Prune event log to fit within storage constraints.
 */
export function pruneEventLog(
  documentState: DocumentState,
  maxEvents: number
): DocumentState {
  if (documentState.eventLog.length <= maxEvents) {
    return documentState;
  }

  return {
    ...documentState,
    eventLog: documentState.eventLog.slice(-maxEvents),
    // Clear undo/redo since events were pruned
    undoStack: [],
    redoStack: [],
  };
}

/**
 * Calculate the storage size of the event log.
 */
export function eventLogSize(eventLog: DocumentState['eventLog']): number {
  const json = JSON.stringify(eventLog);
  return json.length * 2;
}
