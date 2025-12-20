import React, { useMemo } from 'react';
import { Zap, Files } from 'lucide-react';
import { Button } from '../../../../components/ui';
import { useAppTranscription } from '../../../../contexts';

export interface TranscriptionActionsProps {
  isFFmpegAvailable: boolean | null;
}

function TranscriptionActions({ isFFmpegAvailable }: TranscriptionActionsProps): React.JSX.Element {
  const {
    selectedFile,
    isTranscribing,
    modelDownloaded,
    handleTranscribe,
    handleCancel,
    queue,
    isBatchMode,
    handleBatchTranscribe,
    handleBatchCancel,
  } = useAppTranscription();

  const { pendingCount, retryableCount } = useMemo(() => {
    let pending = 0;
    let retryable = 0;
    for (const item of queue) {
      if (item.status === 'pending') {
        pending++;
        retryable++;
      } else if (item.status === 'cancelled' || item.status === 'error') {
        retryable++;
      }
    }
    return { pendingCount: pending, retryableCount: retryable };
  }, [queue]);

  const canTranscribeSingle = selectedFile && modelDownloaded && isFFmpegAvailable === true;
  const canTranscribeBatch =
    isBatchMode && retryableCount > 0 && modelDownloaded && isFFmpegAvailable === true;
  const canTranscribe = isBatchMode ? canTranscribeBatch : canTranscribeSingle;

  const getDisabledReason = (): string => {
    if (!isFFmpegAvailable) return 'Please install FFmpeg first';
    if (!modelDownloaded) return 'Please download the selected model first';
    if (isBatchMode && retryableCount === 0) return 'All files have been transcribed';
    return '';
  };

  const handleTranscribeClick = (): void => {
    if (isBatchMode) {
      handleBatchTranscribe();
    } else {
      handleTranscribe();
    }
  };

  const handleCancelClick = (): void => {
    if (isBatchMode) {
      handleBatchCancel();
    } else {
      handleCancel();
    }
  };

  const getButtonLabel = (): string => {
    if (isBatchMode) {
      return pendingCount > 0 ? `Transcribe All (${pendingCount})` : 'Transcribe All';
    }
    return 'Transcribe';
  };

  return (
    <div className="actions">
      {!isTranscribing ? (
        <Button
          variant="primary"
          size="lg"
          icon={isBatchMode ? <Files size={18} /> : <Zap size={18} />}
          onClick={handleTranscribeClick}
          disabled={!canTranscribe}
          aria-label={isBatchMode ? 'Start batch transcription' : 'Start transcription'}
          title={getDisabledReason()}
          fullWidth
        >
          {getButtonLabel()}
        </Button>
      ) : (
        <Button
          variant="danger"
          size="lg"
          onClick={handleCancelClick}
          aria-label="Cancel ongoing transcription"
          fullWidth
        >
          Cancel
        </Button>
      )}
    </div>
  );
}

export { TranscriptionActions };
