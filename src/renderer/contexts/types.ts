import type {
  HistoryItem,
  SelectedFile,
  TranscriptionSettings,
  OutputFormat,
  QueueItem,
  SermonDocument,
} from '../types';
import type { Theme } from '../hooks';
import type { PipelineProgress } from '../services/electronAPI';
import type { DocumentRootNode } from '../../shared/documentModel';

/** Document save state for UI indicators */
export type DocumentSaveState = 'saved' | 'unsaved' | 'saving' | 'auto-saving';

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

export interface HistoryContextValue {
  history: HistoryItem[];
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  toggleHistory: () => void;
  clearHistory: () => void;
  removeHistoryItem: (itemId: string) => void;
  selectHistoryItem: (item: HistoryItem) => void;
  updateHistoryItem: (itemId: string, updates: Partial<HistoryItem>) => void;
  /** ID of the currently selected history item (if viewing from history) */
  currentHistoryItemId: string | null;
}

export interface TranscriptionStateContextValue {
  selectedFile: SelectedFile | null;
  settings: TranscriptionSettings;
  isTranscribing: boolean;
  transcription: string;
  error: string | null;
  modelDownloaded: boolean;
  copySuccess: boolean;
  queue: QueueItem[];
  selectedQueueItemId: string | null;
  /** Sermon document from sermon processing pipeline (AST is the single source of truth) */
  sermonDocument: SermonDocument | null;
  /** Draft AST JSON from Monaco editor (for persistence across tab switches) */
  draftAstJson: string | null;
  /** Pipeline progress for sermon processing */
  pipelineProgress: PipelineProgress | null;
  /** Current save state of the document */
  documentSaveState: DocumentSaveState;
  /** Timestamp of last successful save */
  lastSavedAt: Date | null;
  /** Edit version counter - incremented on each AST change for dirty detection */
  editVersion: number;
  /** Saved version - the editVersion when document was last saved */
  savedVersion: number;
  /** Whether the app is running in development mode */
  isDev: boolean;
  /** Whether Developer Tools are currently open */
  isDevToolsOpen: boolean;
  /** The ID of the node currently visible at the top of the viewport (for scroll sync) */
  visibleNodeId: string | null;
  /** Whether undo is available (has snapshots in undo stack) */
  canUndo: boolean;
  /** Whether redo is available (has snapshots in redo stack) */
  canRedo: boolean;
}

export interface TranscriptionActionsContextValue {
  setSelectedFile: (file: SelectedFile | null) => void;
  setSettings: (settings: TranscriptionSettings) => void;
  setModelDownloaded: (downloaded: boolean) => void;
  handleTranscribe: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handleSave: (format?: OutputFormat) => Promise<void>;
  handleCopy: () => Promise<void>;
  handleFilesSelect: (files: SelectedFile[]) => void;
  removeFromQueue: (id: string) => void;
  clearCompletedFromQueue: () => void;
  selectQueueItem: (id: string) => void;
  /** Set sermon document from processing pipeline */
  setSermonDocument: (doc: SermonDocument | null) => void;
  /** Update draft AST JSON from Monaco editor */
  setDraftAstJson: (json: string | null) => void;
  /** Update document state (AST) from root node - triggers debounced autosave */
  updateDocumentState: (newRoot: DocumentRootNode) => void;
  /** 
   * Handle AST changes from the editor (debounced) 
   * This is called by the TipTap editor when content changes
   */
  handleAstChange: (newRoot: DocumentRootNode) => void;
  handleMetadataChange: (updates: Partial<Pick<DocumentRootNode, 'title' | 'speaker' | 'biblePassage' | 'tags'>>) => void;
  /** Set the ID of the currently visible node (for scroll sync) */
  setVisibleNodeId: (nodeId: string | null) => void;
  /** Version counter for document state changes (for detecting external AST updates) */
  documentStateVersion: number;
  /** 
   * Version counter for EXTERNAL AST changes only (DevASTPanel, undo/redo).
   * TipTap watches this to know when to sync AST→TipTap.
   * Changes from TipTap itself do NOT bump this counter.
   */
  externalAstVersion: number;
  /** Undo the last AST change */
  handleUndo: () => void;
  /** Redo a previously undone AST change */
  handleRedo: () => void;
}

export interface TranscriptionContextValue
  extends TranscriptionStateContextValue, TranscriptionActionsContextValue { }
