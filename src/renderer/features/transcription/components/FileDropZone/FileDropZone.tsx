import React, { useCallback, type DragEvent, type KeyboardEvent } from 'react';
import { X, FolderOpen, Files } from 'lucide-react';
import { Button } from '../../../../components/ui';
import { isValidMediaFile, formatFileSize } from '../../../../utils';
import type { SelectedFile } from '../../../../types';
import {
  openFileDialog,
  openMultipleFilesDialog,
  getPathForFile,
  getFileInfo,
} from '../../../../services/electronAPI';
import './FileDropZone.css';

export interface FileDropZoneProps {
  onFileSelect: (file: SelectedFile) => void;
  onFilesSelect?: (files: SelectedFile[]) => void;
  selectedFile: SelectedFile | null;
  queueCount?: number;
  disabled: boolean;
  onClear?: () => void;
}

function FileDropZone({
  onFileSelect,
  onFilesSelect,
  selectedFile,
  queueCount = 0,
  disabled,
  onClear,
}: FileDropZoneProps): React.JSX.Element {
  const isBatchMode = !!onFilesSelect;

  const handleClick = async (): Promise<void> => {
    if (disabled) return;

    if (isBatchMode) {
      const filePaths = await openMultipleFilesDialog();
      if (filePaths && filePaths.length > 0) {
        const filesWithInfo: SelectedFile[] = [];
        for (const filePath of filePaths) {
          const fileInfo = await getFileInfo(filePath);
          if (fileInfo && isValidMediaFile(fileInfo.name)) {
            filesWithInfo.push(fileInfo);
          }
        }
        if (filesWithInfo.length > 0) {
          onFilesSelect(filesWithInfo);
        }
      }
    } else {
      const filePath = await openFileDialog();
      if (filePath) {
        const fileName = filePath.split('/').pop();
        if (fileName && isValidMediaFile(fileName)) {
          const fileInfo = await getFileInfo(filePath);
          if (fileInfo) {
            onFileSelect(fileInfo);
          }
        }
      }
    }
  };

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>): Promise<void> => {
      e.preventDefault();
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const validFiles: SelectedFile[] = [];

      for (const file of files) {
        if (isValidMediaFile(file.name)) {
          const filePath = getPathForFile(file);
          if (filePath) {
            const fileInfo = await getFileInfo(filePath);
            if (fileInfo) {
              validFiles.push(fileInfo);
            }
          }
        }
      }

      if (validFiles.length === 0) return;

      if (isBatchMode && validFiles.length > 0) {
        onFilesSelect(validFiles);
      } else {
        const firstFile = validFiles[0];
        if (firstFile) {
          onFileSelect(firstFile);
        }
      }
    },
    [disabled, onFileSelect, onFilesSelect, isBatchMode]
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      handleClick();
    }
  };

  const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    onClear?.();
  };

  const showSingleFileView = !isBatchMode && selectedFile;

  return (
    <div
      className={`dropzone ${disabled ? 'disabled' : ''} ${selectedFile && !isBatchMode ? 'has-file' : ''}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={
        showSingleFileView
          ? `Selected file: ${selectedFile.name}. Click to change file.`
          : isBatchMode
            ? 'Drop audio or video files here, or click to browse. Multiple files supported.'
            : 'Drop audio or video file here, or click to browse'
      }
      onKeyDown={handleKeyDown}
    >
      {showSingleFileView ? (
        <div className="file-info">
          <Button
            variant="ghost"
            size="sm"
            icon={<X size={16} />}
            iconOnly
            onClick={handleRemoveClick}
            title="Remove file"
            aria-label="Remove selected file"
            className="file-remove"
          />
          <span className="file-icon">📁</span>
          <div className="file-details">
            <span className="file-name">{selectedFile.name}</span>
            {selectedFile.size && (
              <span className="file-size">{formatFileSize(selectedFile.size)}</span>
            )}
          </div>
          <span className="file-change">Click to change</span>
        </div>
      ) : (
        <div className="dropzone-content">
          {isBatchMode ? (
            <Files size={40} className="dropzone-icon-svg" />
          ) : (
            <FolderOpen size={40} className="dropzone-icon-svg" />
          )}
          <span className="dropzone-text">
            {isBatchMode ? 'Drop audio/video files here' : 'Drop audio/video file here'}
          </span>
          <span className="dropzone-subtext">
            {isBatchMode ? 'or click to browse (multiple files)' : 'or click to browse'}
          </span>
          <span className="dropzone-formats">
            MP3, WAV, M4A, FLAC, OGG, MP4, MOV, AVI, MKV, WEBM
          </span>
          {isBatchMode && queueCount > 0 && (
            <span className="dropzone-queue-badge">{queueCount} files in queue</span>
          )}
        </div>
      )}
    </div>
  );
}

export { FileDropZone };
