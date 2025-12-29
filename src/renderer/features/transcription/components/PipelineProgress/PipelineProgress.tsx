import React, { useMemo } from 'react';
import type { PipelineStage } from '../../../../types';
import type { PipelineProgress as PipelineProgressType } from '../../../../services/electronAPI';
import './PipelineProgress.css';

export interface PipelineProgressProps {
  progress: PipelineProgressType | null;
  isActive: boolean;
  isComplete?: boolean;
}

// Stage definitions with descriptions
const STAGES: { id: number; name: string; description: string }[] = [
  {
    id: 1,
    name: 'Transcribe',
    description: 'Converting speech to text',
  },
  {
    id: 2,
    name: 'Metadata',
    description: 'Extracting title and Bible reference',
  },
  {
    id: 3,
    name: 'Bible Quotes',
    description: 'Detecting and looking up Bible references',
  },
  {
    id: 4,
    name: 'Paragraphs',
    description: 'Segmenting into logical sections',
  },
  {
    id: 5,
    name: 'Tags',
    description: 'Extracting topics and keywords',
  },
];

type StageStatus = 'pending' | 'active' | 'completed';

function getStageStatus(
  stageId: number,
  currentStage: PipelineStage | undefined,
  isComplete: boolean
): StageStatus {
  // If processing is complete, all stages are completed
  if (isComplete) return 'completed';

  if (!currentStage) return 'pending';

  const stageIndex = STAGES.findIndex((s) => s.id === stageId);
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage.id);

  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) return 'active';
  return 'pending';
}

/**
 * Visual indicator for the 5-stage sermon processing pipeline.
 * Shows each stage with its status, progress, and current message.
 * Includes checkmarks for completed stages and per-stage progress bars.
 */
export function PipelineProgress({
  progress,
  isActive,
  isComplete = false,
}: PipelineProgressProps): React.JSX.Element | null {
  if (!isActive && !progress && !isComplete) {
    return null;
  }

  const currentStage = progress?.currentStage;

  // Calculate overall progress based on weighted stages
  // Stage weights: Transcribe=60%, Metadata=5%, Bible Quotes=25%, Paragraphs=5%, Tags=5%
  const overallProgress = useMemo(() => {
    if (isComplete) return 100;
    if (!progress) return 0;

    const stageWeights: Record<number, { start: number; end: number }> = {
      1: { start: 0, end: 60 },
      2: { start: 60, end: 65 },
      3: { start: 65, end: 90 },
      4: { start: 90, end: 95 },
      5: { start: 95, end: 100 },
    };

    const stageId = currentStage?.id;
    if (!stageId || !stageWeights[stageId]) return 0;

    const weight = stageWeights[stageId];
    const stageContribution = (progress.stageProgress / 100) * (weight.end - weight.start);

    return Math.min(100, Math.round(weight.start + stageContribution));
  }, [progress, currentStage, isComplete]);

  // Determine if we should show pulsing animation
  const showPulse = isActive && !isComplete;

  return (
    <div className={`pipeline-progress ${isComplete ? 'complete' : ''}`}>
      <div className="pipeline-progress-header">
        <h4 className="pipeline-progress-title">
          {isComplete ? '✓ Processing Complete' : 'Sermon Processing'}
        </h4>
        <span className="pipeline-progress-percent">{overallProgress}%</span>
      </div>

      {/* Overall progress bar */}
      <div className="pipeline-overall-progress">
        <div
          className={`pipeline-overall-progress-fill ${showPulse ? 'pulse' : ''}`}
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Stage list with checkmarks and individual progress */}
      <div className="pipeline-stages-list">
        {STAGES.map((stage) => {
          const status = getStageStatus(stage.id, currentStage, isComplete);
          const isCurrentStage = currentStage?.id === stage.id && !isComplete;
          const stageProgress = isCurrentStage
            ? (progress?.stageProgress ?? 0)
            : status === 'completed'
              ? 100
              : 0;

          return (
            <div
              key={stage.id}
              className={`pipeline-stage-row ${status}`}
              role="listitem"
              aria-current={isCurrentStage ? 'step' : undefined}
            >
              <div className="pipeline-stage-indicator">
                {status === 'completed' ? (
                  <span className="pipeline-checkmark">✓</span>
                ) : status === 'active' ? (
                  <span className="pipeline-stage-number active">{stage.id}</span>
                ) : (
                  <span className="pipeline-stage-number">{stage.id}</span>
                )}
              </div>

              <div className="pipeline-stage-details">
                <div className="pipeline-stage-header">
                  <span className="pipeline-stage-name">{stage.name}</span>
                  {isCurrentStage && (
                    <span className="pipeline-stage-percent">{stageProgress}%</span>
                  )}
                </div>

                {/* Per-stage progress bar */}
                <div className="pipeline-stage-progress-bar">
                  <div
                    className={`pipeline-stage-progress-fill ${status}`}
                    style={{ width: `${stageProgress}%` }}
                  />
                </div>

                {/* Description or current message */}
                <span className="pipeline-stage-description">
                  {isCurrentStage && progress?.message
                    ? progress.message
                    : status === 'completed'
                      ? 'Complete'
                      : stage.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
