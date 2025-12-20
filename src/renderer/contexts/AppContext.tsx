import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useTranscription, useBatchQueue } from '../features/transcription';
import { useHistory } from '../features/history';
import { useTheme, useCopyToClipboard, useElectronMenu } from '../hooks';
import type { HistoryItem, SelectedFile } from '../types';
import {
  ThemeContext,
  HistoryContext,
  TranscriptionStateContext,
  TranscriptionActionsContext,
} from './contexts';
import type {
  ThemeContextValue,
  HistoryContextValue,
  TranscriptionStateContextValue,
  TranscriptionActionsContextValue,
} from './types';

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps): React.JSX.Element {
  const { theme, toggleTheme, isDark } = useTheme();

  const { copySuccess, copyToClipboard } = useCopyToClipboard();

  const {
    history,
    showHistory,
    setShowHistory,
    toggleHistory,
    addHistoryItem,
    clearHistory,
    removeHistoryItem,
  } = useHistory();

  const {
    selectedFile,
    settings,
    isTranscribing,
    transcription,
    error,
    modelDownloaded,
    setSelectedFile,
    setSettings,
    setModelDownloaded,
    setTranscription,
    handleFileSelect,
    handleFileSelectFromMenu,
    handleTranscribe,
    handleCancel,
    handleSave,
    handleCopy,
  } = useTranscription({
    onHistoryAdd: addHistoryItem,
  });

  const [selectedQueueItemId, setSelectedQueueItemId] = useState<string | null>(null);

  const {
    queue,
    isProcessing: isBatchProcessing,
    addFiles,
    removeFile,
    clearCompleted,
    startProcessing,
    cancelProcessing,
    getCompletedTranscription,
  } = useBatchQueue({
    settings,
    onHistoryAdd: addHistoryItem,
    onFirstComplete: (id, text) => {
      setSelectedQueueItemId(id);
      setTranscription(text);
    },
  });

  const isBatchMode = queue.length > 0;

  const selectHistoryItem = useCallback(
    (item: HistoryItem): void => {
      setTranscription(item.fullText);
      setSelectedFile({ name: item.fileName, path: item.filePath });
      setShowHistory(false);
    },
    [setTranscription, setSelectedFile, setShowHistory]
  );

  const onCopy = useCallback(async (): Promise<void> => {
    await handleCopy(copyToClipboard);
  }, [handleCopy, copyToClipboard]);

  const handleFilesSelect = useCallback(
    (files: SelectedFile[]): void => {
      addFiles(files);
    },
    [addFiles]
  );

  const handleBatchTranscribe = useCallback(async (): Promise<void> => {
    await startProcessing();
  }, [startProcessing]);

  const handleBatchCancel = useCallback(async (): Promise<void> => {
    await cancelProcessing();
  }, [cancelProcessing]);

  const removeFromQueue = useCallback(
    (id: string): void => {
      removeFile(id);
      if (selectedQueueItemId === id) {
        setSelectedQueueItemId(null);
      }
    },
    [removeFile, selectedQueueItemId]
  );

  const clearCompletedFromQueue = useCallback((): void => {
    clearCompleted();
    setSelectedQueueItemId(null);
  }, [clearCompleted]);

  const selectQueueItem = useCallback(
    (id: string): void => {
      setSelectedQueueItemId(id);
      const transcriptionText = getCompletedTranscription(id);
      if (transcriptionText) {
        setTranscription(transcriptionText);
      }
    },
    [getCompletedTranscription, setTranscription]
  );

  useElectronMenu({
    onOpenFile: () => {
      if (!isTranscribing && !isBatchProcessing) {
        handleFileSelectFromMenu();
      }
    },
    onSaveFile: () => {
      if (transcription && !isTranscribing && !isBatchProcessing) {
        handleSave();
      }
    },
    onCopyTranscription: () => {
      if (transcription) {
        onCopy();
      }
    },
    onStartTranscription: () => {
      if (isBatchMode && queue.some((item) => item.status === 'pending') && !isBatchProcessing) {
        handleBatchTranscribe();
      } else if (selectedFile && !isTranscribing) {
        handleTranscribe();
      }
    },
    onCancelTranscription: () => {
      if (isBatchProcessing) {
        handleBatchCancel();
      } else if (isTranscribing) {
        handleCancel();
      }
    },
    onToggleHistory: toggleHistory,
  });

  const themeContextValue = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme, isDark }),
    [theme, toggleTheme, isDark]
  );

  const historyContextValue = useMemo<HistoryContextValue>(
    () => ({
      history,
      showHistory,
      setShowHistory,
      toggleHistory,
      clearHistory,
      removeHistoryItem,
      selectHistoryItem,
    }),
    [
      history,
      showHistory,
      setShowHistory,
      toggleHistory,
      clearHistory,
      removeHistoryItem,
      selectHistoryItem,
    ]
  );

  const transcriptionStateValue = useMemo<TranscriptionStateContextValue>(
    () => ({
      selectedFile,
      settings,
      isTranscribing: isTranscribing || isBatchProcessing,
      transcription,
      error,
      modelDownloaded,
      copySuccess,
      queue,
      isBatchMode,
      selectedQueueItemId,
    }),
    [
      selectedFile,
      settings,
      isTranscribing,
      isBatchProcessing,
      transcription,
      error,
      modelDownloaded,
      copySuccess,
      queue,
      isBatchMode,
      selectedQueueItemId,
    ]
  );

  const transcriptionActionsValue = useMemo<TranscriptionActionsContextValue>(
    () => ({
      setSelectedFile,
      setSettings,
      setModelDownloaded,
      handleFileSelect,
      handleTranscribe,
      handleCancel,
      handleSave,
      handleCopy: onCopy,
      handleFilesSelect,
      handleBatchTranscribe,
      handleBatchCancel,
      removeFromQueue,
      clearCompletedFromQueue,
      selectQueueItem,
    }),
    [
      setSelectedFile,
      setSettings,
      setModelDownloaded,
      handleFileSelect,
      handleTranscribe,
      handleCancel,
      handleSave,
      onCopy,
      handleFilesSelect,
      handleBatchTranscribe,
      handleBatchCancel,
      removeFromQueue,
      clearCompletedFromQueue,
      selectQueueItem,
    ]
  );

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <HistoryContext.Provider value={historyContextValue}>
        <TranscriptionStateContext.Provider value={transcriptionStateValue}>
          <TranscriptionActionsContext.Provider value={transcriptionActionsValue}>
            {children}
          </TranscriptionActionsContext.Provider>
        </TranscriptionStateContext.Provider>
      </HistoryContext.Provider>
    </ThemeContext.Provider>
  );
}
