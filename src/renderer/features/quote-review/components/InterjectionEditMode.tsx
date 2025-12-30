import React, { useState, useCallback, useEffect } from 'react';
import type { InterjectionCandidate } from '../../../types/quoteReview';
import './InterjectionEditMode.css';

interface InterjectionEditModeProps {
  /** List of detected interjection candidates */
  candidates: InterjectionCandidate[];
  /** Currently confirmed interjections */
  confirmedInterjections: string[];
  /** Callback when interjection is confirmed/rejected */
  onInterjectionToggle: (text: string, isConfirmed: boolean) => void;
  /** Callback when all interjections are processed */
  onComplete: () => void;
  /** Callback to exit interjection edit mode */
  onCancel: () => void;
  /** Whether auto-detection prompt is shown */
  showAutoDetectPrompt?: boolean;
  /** Auto-detected interjection for prompt */
  autoDetectedText?: string;
  /** Callback when auto-detect prompt is answered */
  onAutoDetectResponse?: (confirmed: boolean) => void;
}

/**
 * UI for editing interjections within a quote.
 * Shows candidates for confirmation and allows manual marking.
 */
export function InterjectionEditMode({
  candidates,
  confirmedInterjections,
  onInterjectionToggle,
  onComplete,
  onCancel,
  showAutoDetectPrompt = false,
  autoDetectedText = '',
  onAutoDetectResponse,
}: InterjectionEditModeProps): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localConfirmed, setLocalConfirmed] = useState<Set<string>>(
    new Set(confirmedInterjections)
  );

  // Sync with external confirmed list
  useEffect(() => {
    setLocalConfirmed(new Set(confirmedInterjections));
  }, [confirmedInterjections]);

  // Handle toggle for a candidate
  const handleToggle = useCallback(
    (text: string) => {
      const newConfirmed = new Set(localConfirmed);
      const isCurrentlyConfirmed = newConfirmed.has(text);

      if (isCurrentlyConfirmed) {
        newConfirmed.delete(text);
      } else {
        newConfirmed.add(text);
      }

      setLocalConfirmed(newConfirmed);
      onInterjectionToggle(text, !isCurrentlyConfirmed);
    },
    [localConfirmed, onInterjectionToggle]
  );

  // Handle step-through mode
  const handleNext = useCallback(() => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  }, [currentIndex, candidates.length, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'y':
        case 'Y':
          if (showAutoDetectPrompt && onAutoDetectResponse) {
            onAutoDetectResponse(true);
          } else if (candidates[currentIndex]) {
            handleToggle(candidates[currentIndex].text);
            handleNext();
          }
          break;
        case 'n':
        case 'N':
          if (showAutoDetectPrompt && onAutoDetectResponse) {
            onAutoDetectResponse(false);
          } else {
            handleNext();
          }
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'Escape':
          onCancel();
          break;
        case 'Enter':
          if (e.shiftKey) {
            onComplete();
          }
          break;
      }
    },
    [
      showAutoDetectPrompt,
      onAutoDetectResponse,
      candidates,
      currentIndex,
      handleToggle,
      handleNext,
      handlePrevious,
      onCancel,
      onComplete,
    ]
  );

  // Auto-detect prompt UI
  if (showAutoDetectPrompt && autoDetectedText) {
    return (
      <div
        className="interjection-auto-prompt"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="alertdialog"
        aria-labelledby="interjection-prompt-title"
      >
        <div className="interjection-prompt-content">
          <h4 id="interjection-prompt-title">Interjection Detected</h4>
          <p className="interjection-prompt-text">
            Mark "<span className="interjection-highlight">{autoDetectedText}</span>" as
            interjection?
          </p>
          <div className="interjection-prompt-actions">
            <button
              className="interjection-btn interjection-btn-yes"
              onClick={() => onAutoDetectResponse?.(true)}
              autoFocus
            >
              <span className="interjection-btn-key">Y</span>
              Yes
            </button>
            <button
              className="interjection-btn interjection-btn-no"
              onClick={() => onAutoDetectResponse?.(false)}
            >
              <span className="interjection-btn-key">N</span>
              No
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full interjection edit mode UI
  return (
    <div
      className="interjection-edit-mode"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Interjection editor"
    >
      <div className="interjection-header">
        <h4>Edit Interjections</h4>
        <span className="interjection-count">{localConfirmed.size} marked</span>
      </div>

      {candidates.length === 0 ? (
        <div className="interjection-empty">
          <p>No interjection candidates detected.</p>
          <p className="interjection-hint">
            Common interjections include "Amen", "Hallelujah", audience responses, etc.
          </p>
        </div>
      ) : (
        <>
          {/* Step-through view */}
          <div className="interjection-step-view">
            {candidates[currentIndex] && (
              <>
                <div className="interjection-candidate-card">
                  <div className="interjection-candidate-text">
                    "{candidates[currentIndex].text}"
                  </div>
                  <div className="interjection-candidate-context">
                    {candidates[currentIndex].context || 'In quote context'}
                  </div>
                  <div className="interjection-candidate-confidence">
                    Confidence: {Math.round((candidates[currentIndex].confidence || 0) * 100)}%
                  </div>
                </div>

                <div className="interjection-step-actions">
                  <button
                    className={`interjection-btn interjection-btn-mark ${
                      localConfirmed.has(candidates[currentIndex].text) ? 'marked' : ''
                    }`}
                    onClick={() => {
                      const currentCandidate = candidates[currentIndex];
                      if (currentCandidate) {
                        handleToggle(currentCandidate.text);
                      }
                    }}
                  >
                    {localConfirmed.has(candidates[currentIndex].text)
                      ? '✓ Marked'
                      : 'Mark as Interjection'}
                  </button>
                </div>
              </>
            )}

            <div className="interjection-step-nav">
              <button
                className="interjection-nav-btn"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                ← Previous
              </button>
              <span className="interjection-step-progress">
                {currentIndex + 1} / {candidates.length}
              </span>
              <button className="interjection-nav-btn" onClick={handleNext}>
                {currentIndex === candidates.length - 1 ? 'Done' : 'Next →'}
              </button>
            </div>
          </div>

          {/* List view */}
          <div className="interjection-list-view">
            <div className="interjection-list-header">
              <span>All Candidates</span>
            </div>
            <ul className="interjection-list">
              {candidates.map((candidate, index) => (
                <li
                  key={`${candidate.text}-${index}`}
                  className={`interjection-list-item ${
                    localConfirmed.has(candidate.text) ? 'confirmed' : ''
                  } ${index === currentIndex ? 'current' : ''}`}
                >
                  <label className="interjection-checkbox-label">
                    <input
                      type="checkbox"
                      checked={localConfirmed.has(candidate.text)}
                      onChange={() => handleToggle(candidate.text)}
                      className="interjection-checkbox"
                    />
                    <span className="interjection-item-text">{candidate.text}</span>
                    <span className="interjection-item-confidence">
                      {Math.round(candidate.confidence * 100)}%
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="interjection-footer">
        <button className="interjection-btn interjection-btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button className="interjection-btn interjection-btn-done" onClick={onComplete}>
          Done (Shift+Enter)
        </button>
      </div>

      <div className="interjection-shortcuts">
        <span>
          <kbd>Y</kbd> Mark
        </span>
        <span>
          <kbd>N</kbd> Skip
        </span>
        <span>
          <kbd>←</kbd>
          <kbd>→</kbd> Navigate
        </span>
        <span>
          <kbd>Esc</kbd> Cancel
        </span>
      </div>
    </div>
  );
}

export default InterjectionEditMode;
