import React, { useCallback, useRef, useEffect, useState } from 'react';
import { BOUNDARY_CHANGE_DEBOUNCE_MS } from '../../../types/quoteReview';
import './QuoteBoundaryEditor.css';

interface QuoteBoundaryEditorProps {
  /** The quote element to wrap with boundary handles */
  quoteElement: HTMLElement;
  /** Current quote text */
  quoteText: string;
  /** Whether boundary editing is active */
  isActive: boolean;
  /** Callback when boundary changes (after debounce) */
  onBoundaryChange: (newText: string, startOffset: number, endOffset: number) => void;
  /** Callback when boundary editing starts */
  onEditStart: () => void;
  /** Callback when boundary editing ends */
  onEditEnd: () => void;
  /** Callback when user drags across paragraph boundary */
  onCrossParagraphDrag: (direction: 'start' | 'end', targetParagraph: HTMLElement) => void;
}

type DragHandle = 'start' | 'end' | null;

interface DragState {
  handle: DragHandle;
  startX: number;
  startY: number;
  originalRange: Range | null;
}

/**
 * Component that provides drag handles and keyboard controls for editing quote boundaries.
 * Renders as an overlay on the quote element.
 */
export function QuoteBoundaryEditor({
  quoteElement,
  quoteText,
  isActive,
  onBoundaryChange,
  onEditStart,
  onEditEnd,
  onCrossParagraphDrag,
}: QuoteBoundaryEditorProps): React.JSX.Element | null {
  const [dragState, setDragState] = useState<DragState>({
    handle: null,
    startX: 0,
    startY: 0,
    originalRange: null,
  });
  const [position, setPosition] = useState<{ start: DOMRect | null; end: DOMRect | null }>({
    start: null,
    end: null,
  });

  const debounceTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate handle positions based on quote element bounds
  const updateHandlePositions = useCallback(() => {
    if (!quoteElement) return;

    const range = document.createRange();
    const textNode = quoteElement.firstChild;

    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      // Fall back to element bounds
      const rect = quoteElement.getBoundingClientRect();
      setPosition({
        start: new DOMRect(rect.left, rect.top, 0, rect.height),
        end: new DOMRect(rect.right, rect.top, 0, rect.height),
      });
      return;
    }

    // Get start position
    range.setStart(textNode, 0);
    range.setEnd(textNode, 1);
    const startRect = range.getBoundingClientRect();

    // Get end position
    const textLength = textNode.textContent?.length || 0;
    if (textLength > 0) {
      range.setStart(textNode, textLength - 1);
      range.setEnd(textNode, textLength);
    }
    const endRect = range.getBoundingClientRect();

    setPosition({ start: startRect, end: endRect });
  }, [quoteElement]);

  // Update positions when active or quote changes
  useEffect(() => {
    if (isActive) {
      updateHandlePositions();
      onEditStart();

      // Update on resize/scroll
      const handleUpdate = (): void => updateHandlePositions();
      window.addEventListener('resize', handleUpdate);
      window.addEventListener('scroll', handleUpdate, true);

      return () => {
        window.removeEventListener('resize', handleUpdate);
        window.removeEventListener('scroll', handleUpdate, true);
        onEditEnd();
      };
    }
    return undefined;
  }, [isActive, quoteText, updateHandlePositions, onEditStart, onEditEnd]);

  // Handle mouse down on drag handle
  const handleMouseDown = useCallback(
    (handle: DragHandle) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setDragState({
        handle,
        startX: e.clientX,
        startY: e.clientY,
        originalRange: null, // Could store original selection here
      });

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    []
  );

  // Handle mouse move during drag
  useEffect(() => {
    if (!dragState.handle) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      // Get the text node under the cursor
      // Note: caretPositionFromPoint is not standard in all browsers
      const caretPosition = (
        document as Document & {
          caretPositionFromPoint?: (
            x: number,
            y: number
          ) => { offsetNode: Node; offset: number } | null;
        }
      ).caretPositionFromPoint?.(e.clientX, e.clientY);
      const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);

      if (!caretPosition && !range) return;

      // Check if we're crossing paragraph boundaries
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      const targetParagraph = targetElement?.closest('p, div[data-paragraph]');
      const quoteParagraph = quoteElement.closest('p, div[data-paragraph]');

      if (targetParagraph && quoteParagraph && targetParagraph !== quoteParagraph) {
        onCrossParagraphDrag(dragState.handle!, targetParagraph as HTMLElement);
        return;
      }

      // Visual feedback during drag - highlight potential new boundary
      if (range) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Get final position
      const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);

      if (range && quoteElement.contains(range.startContainer)) {
        // Calculate new boundary
        const newOffset = dragState.handle === 'start' ? range.startOffset : range.endOffset;

        // Debounce the boundary change
        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = window.setTimeout(() => {
          // Calculate new text based on boundary change
          const textNode = quoteElement.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const fullText = textNode.textContent || '';
            const newText =
              dragState.handle === 'start'
                ? fullText.slice(newOffset)
                : fullText.slice(0, newOffset + 1);

            const startOffset = dragState.handle === 'start' ? newOffset : 0;
            const endOffset = dragState.handle === 'end' ? newOffset + 1 : fullText.length;

            onBoundaryChange(newText, startOffset, endOffset);
          }
        }, BOUNDARY_CHANGE_DEBOUNCE_MS);
      }

      // Clear selection
      window.getSelection()?.removeAllRanges();

      setDragState({ handle: null, startX: 0, startY: 0, originalRange: null });
      updateHandlePositions();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, quoteElement, onBoundaryChange, onCrossParagraphDrag, updateHandlePositions]);

  // Handle keyboard navigation for boundary adjustment
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isActive) return;

      const isShift = e.shiftKey;
      const step = e.ctrlKey || e.metaKey ? 5 : 1; // Larger step with modifier

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          // Move start boundary left (expand) or end boundary left (shrink)
          if (isShift) {
            // Shrink from end
            const textNode = quoteElement.firstChild;
            if (textNode?.textContent && textNode.textContent.length > step) {
              const newText = textNode.textContent.slice(0, -step);
              onBoundaryChange(newText, 0, newText.length);
            }
          } else {
            // TODO: Expand from start (requires accessing preceding text)
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          // Move start boundary right (shrink) or end boundary right (expand)
          if (isShift) {
            // TODO: Expand from end (requires accessing following text)
          } else {
            // Shrink from start
            const textNode = quoteElement.firstChild;
            if (textNode?.textContent && textNode.textContent.length > step) {
              const newText = textNode.textContent.slice(step);
              onBoundaryChange(newText, step, step + newText.length);
            }
          }
          break;
        case 'Escape':
          onEditEnd();
          break;
        case 'Enter':
          onEditEnd();
          break;
      }
    },
    [isActive, quoteElement, onBoundaryChange, onEditEnd]
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (!isActive || !quoteElement) {
    return null;
  }

  const quoteRect = quoteElement.getBoundingClientRect();
  const containerRect = containerRef.current?.parentElement?.getBoundingClientRect();

  // Calculate relative positions
  const getRelativePos = (rect: DOMRect | null, isStart: boolean) => {
    if (!rect || !containerRect) {
      return { top: 0, left: 0 };
    }
    return {
      top: rect.top - containerRect.top - 4, // Slight offset above
      left: isStart ? rect.left - containerRect.left - 8 : rect.right - containerRect.left + 2,
    };
  };

  return (
    <div
      ref={containerRef}
      className="quote-boundary-editor"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Quote boundary editor. Use arrow keys to adjust boundaries."
    >
      {/* Start handle */}
      <div
        className={`boundary-handle boundary-handle-start ${dragState.handle === 'start' ? 'dragging' : ''}`}
        style={getRelativePos(position.start, true)}
        onMouseDown={handleMouseDown('start')}
        role="slider"
        aria-label="Adjust quote start boundary"
        aria-valuetext="Drag to adjust start"
        tabIndex={0}
      >
        <div className="boundary-handle-grip">
          <span className="boundary-handle-line" />
          <span className="boundary-handle-line" />
        </div>
      </div>

      {/* End handle */}
      <div
        className={`boundary-handle boundary-handle-end ${dragState.handle === 'end' ? 'dragging' : ''}`}
        style={getRelativePos(position.end, false)}
        onMouseDown={handleMouseDown('end')}
        role="slider"
        aria-label="Adjust quote end boundary"
        aria-valuetext="Drag to adjust end"
        tabIndex={0}
      >
        <div className="boundary-handle-grip">
          <span className="boundary-handle-line" />
          <span className="boundary-handle-line" />
        </div>
      </div>

      {/* Highlight overlay */}
      <div
        className="boundary-highlight"
        style={{
          top: quoteRect.top - (containerRect?.top || 0) - 2,
          left: quoteRect.left - (containerRect?.left || 0) - 2,
          width: quoteRect.width + 4,
          height: quoteRect.height + 4,
        }}
      />

      {/* Instructions tooltip */}
      <div className="boundary-instructions">
        Drag handles to adjust • Arrow keys for fine control • Enter to confirm
      </div>
    </div>
  );
}

export default QuoteBoundaryEditor;
