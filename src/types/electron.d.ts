/**
 * WhisperDesk - Electron API Type Definitions
 *
 * This file provides TypeScript type definitions for the Electron preload API
 * exposed via contextBridge. It ensures type safety when communicating between
 * the renderer process (React) and main process (Electron).
 */

import type {
  TranscriptionProgress,
  TranscriptionOptions,
  TranscriptionResult,
  ModelDownloadProgress,
  UpdateInfo,
  UpdateDownloadProgress,
  SaveFileOptions,
  SaveFileResult,
  GpuInfo,
  ModelInfo,
  SelectedFile,
  AppInfo,
  MemoryUsage,
  Unsubscribe,
} from './index';

/**
 * Models list response from the main process
 */
export interface ModelsListResponse {
  models: ModelInfo[];
}

/**
 * Update check result
 */
export interface UpdateCheckResult {
  success?: boolean;
  error?: string;
}

/**
 * Download update result
 */
export interface DownloadUpdateResult {
  success?: boolean;
  error?: string;
}

/**
 * Transcription cancel result
 */
export interface CancelResult {
  success: boolean;
  message?: string;
}

/**
 * Whisper installation check result
 */
export interface WhisperCheckResult {
  available: boolean;
  whisperPath?: string;
  backend?: string;
  gpu?: GpuInfo;
  error?: string;
}

/**
 * The Electron API exposed to the renderer process via preload.js
 * All methods are optional because they may not be available in non-Electron environments
 */
export interface ElectronAPI {
  // =========================================================================
  // Dialog Operations
  // =========================================================================

  /**
   * Open a file dialog and return the selected file path
   * @returns The selected file path, or null if cancelled
   */
  openFile: () => Promise<string | null>;

  /**
   * Save content to a file with a save dialog
   * @param options - Save options including filename, content, and format
   * @returns Result of the save operation
   */
  saveFile: (options: SaveFileOptions) => Promise<SaveFileResult>;

  // =========================================================================
  // File Operations
  // =========================================================================

  /**
   * Get information about a file
   * @param filePath - Path to the file
   * @returns File information or null if not found
   */
  getFileInfo: (filePath: string) => Promise<SelectedFile | null>;

  // =========================================================================
  // Model Management
  // =========================================================================

  /**
   * List all available models with their download status
   * @returns List of models
   */
  listModels: () => Promise<ModelsListResponse>;

  /**
   * Get GPU/acceleration status
   * @returns GPU information
   */
  getGpuStatus: () => Promise<GpuInfo>;

  /**
   * Download a specific model
   * @param modelName - Name of the model to download
   * @returns Download result
   */
  downloadModel: (modelName: string) => Promise<{ success: boolean; model: string; path: string }>;

  /**
   * Subscribe to model download progress events
   * @param callback - Called with download progress updates
   * @returns Unsubscribe function
   */
  onModelDownloadProgress: (callback: (data: ModelDownloadProgress) => void) => Unsubscribe;

  // =========================================================================
  // Transcription Operations
  // =========================================================================

  /**
   * Start a transcription job
   * @param options - Transcription options
   * @returns Transcription result
   */
  startTranscription: (options: TranscriptionOptions) => Promise<TranscriptionResult>;

  /**
   * Cancel the current transcription
   * @returns Cancel result
   */
  cancelTranscription: () => Promise<CancelResult>;

  /**
   * Subscribe to transcription progress events
   * @param callback - Called with progress updates
   * @returns Unsubscribe function
   */
  onTranscriptionProgress: (callback: (data: TranscriptionProgress) => void) => Unsubscribe;

  // =========================================================================
  // App Info
  // =========================================================================

  /**
   * Get application information
   * @returns App info including version and platform
   */
  getAppInfo: () => Promise<AppInfo>;

  /**
   * Get current memory usage statistics
   * @returns Memory usage info
   */
  getMemoryUsage: () => Promise<MemoryUsage>;

  // =========================================================================
  // Auto-Updater
  // =========================================================================

  /**
   * Check for application updates
   * @returns Check result
   */
  checkForUpdates: () => Promise<UpdateCheckResult>;

  /**
   * Download available update
   * @returns Download result
   */
  downloadUpdate: () => Promise<DownloadUpdateResult>;

  /**
   * Install downloaded update and restart
   */
  installUpdate: () => void;

  /**
   * Subscribe to update checking event
   * @param callback - Called when checking starts
   * @returns Unsubscribe function
   */
  onUpdateChecking: (callback: () => void) => Unsubscribe;

  /**
   * Subscribe to update available event
   * @param callback - Called with update info
   * @returns Unsubscribe function
   */
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => Unsubscribe;

  /**
   * Subscribe to no update available event
   * @param callback - Called when no update is available
   * @returns Unsubscribe function
   */
  onUpdateNotAvailable: (callback: () => void) => Unsubscribe;

  /**
   * Subscribe to update download progress event
   * @param callback - Called with download progress
   * @returns Unsubscribe function
   */
  onUpdateProgress: (callback: (progress: UpdateDownloadProgress) => void) => Unsubscribe;

  /**
   * Subscribe to update downloaded event
   * @param callback - Called with update info when download completes
   * @returns Unsubscribe function
   */
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => Unsubscribe;

  /**
   * Subscribe to update error event
   * @param callback - Called with error message
   * @returns Unsubscribe function
   */
  onUpdateError: (callback: (message: string) => void) => Unsubscribe;

  // =========================================================================
  // Menu Event Listeners
  // =========================================================================

  /**
   * Subscribe to menu "Open File" event (Cmd+O)
   * @param callback - Called when menu item is triggered
   * @returns Unsubscribe function
   */
  onMenuOpenFile: (callback: () => void) => Unsubscribe;

  /**
   * Subscribe to menu "Save File" event (Cmd+S)
   * @param callback - Called when menu item is triggered
   * @returns Unsubscribe function
   */
  onMenuSaveFile: (callback: () => void) => Unsubscribe;

  /**
   * Subscribe to menu "Copy Transcription" event (Cmd+Shift+C)
   * @param callback - Called when menu item is triggered
   * @returns Unsubscribe function
   */
  onMenuCopyTranscription: (callback: () => void) => Unsubscribe;

  /**
   * Subscribe to menu "Start Transcription" event (Cmd+Return)
   * @param callback - Called when menu item is triggered
   * @returns Unsubscribe function
   */
  onMenuStartTranscription: (callback: () => void) => Unsubscribe;

  /**
   * Subscribe to menu "Cancel Transcription" event (Escape)
   * @param callback - Called when menu item is triggered
   * @returns Unsubscribe function
   */
  onMenuCancelTranscription: (callback: () => void) => Unsubscribe;

  /**
   * Subscribe to menu "Toggle History" event (Cmd+H)
   * @param callback - Called when menu item is triggered
   * @returns Unsubscribe function
   */
  onMenuToggleHistory: (callback: () => void) => Unsubscribe;
}

/**
 * Extend the global Window interface to include electronAPI
 */
declare global {
  interface Window {
    /**
     * The Electron API exposed via preload.js
     * This is undefined when running outside of Electron (e.g., in a browser)
     */
    electronAPI?: ElectronAPI;
  }
}

export {};
