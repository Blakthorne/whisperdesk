/**
 * Quote-Aware Sermon Editor
 *
 * Wraps SermonEditor to add in-document quote editing features:
 * - Visual quote rendering with metadata
 * - Selection-based quote creation (SelectionAdder)
 * - Drag-based boundary editing (QuoteBoundaryEditor)
 * - Quote detail toolbar (FloatingEditBar)
 * - Right-click context menu
 *
 * AST-ONLY ARCHITECTURE:
 * - DocumentState is the single source of truth
 * - All content flows through the AST (no HTML state)
 * - Changes propagate: TipTap edit → tipTapJsonToAst → onAstChange → Context
 */

import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import type { SermonDocument } from '../../../../types';
import type { DocumentState, DocumentRootNode } from '../../../../../shared/documentModel';
import { SelectionAdder } from '../../../quote-review/components/SelectionAdder';
import { FloatingEditBar } from '../../../quote-review/components/FloatingEditBar';
import { QuoteBoundaryEditor } from '../../../quote-review/components/QuoteBoundaryEditor';
import { useQuoteReview, useEditorActionsOptional } from '../../../../contexts';
import { SermonEditor } from './SermonEditor';
import './QuoteAwareSermonEditor.css';

export interface QuoteAwareSermonEditorProps {
  /** Sermon document data from pipeline processing */
  document: SermonDocument | null;
  /** Optional document state (AST) - THE SOURCE OF TRUTH for quote-aware rendering */
  documentState?: DocumentState;
  /** Callback when AST changes (debounced) - replaces onHtmlChange */
  onAstChange?: (newRoot: DocumentRootNode) => void;
}

/**
 * Quote-aware sermon editor with in-document editing features.
 *
 * Note: Action buttons (save, copy, undo, redo, review quotes) are now handled
 * by UnifiedEditorActions in RightPanel for consistency across editor modes.
 */
export function QuoteAwareSermonEditor({
  document,
  documentState,
  onAstChange,
}: QuoteAwareSermonEditorProps): React.JSX.Element {
  const quoteReview = useQuoteReview();
  const editorActions = useEditorActionsOptional();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [focusedQuoteId, setFocusedQuoteId] = useState<string | null>(null);
  const [floatingBarPosition, setFloatingBarPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; quoteId: string } | null>(
    null
  );

  // Get all quotes from documentState if available
  const quotes = useMemo(() => {
    if (!documentState?.root) return [];

    const extractedQuotes: Array<{
      id: string;
      text: string;
      reference?: string;
      isVerified: boolean;
    }> = [];

    function traverse(node: any): void {
      if (node.type === 'quote_block' && node.id) {
        const text = node.children?.map((child: any) => child.content || '').join('') || '';
        extractedQuotes.push({
          id: node.id,
          text,
          reference: node.metadata?.reference?.displayReference,
          isVerified: node.metadata?.userVerified || false,
        });
      }

      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
    }

    traverse(documentState.root);
    return extractedQuotes;
  }, [documentState]);

  // Handle selection for quote creation
  const handleCreateQuoteFromSelection = useCallback(
    (selectedText: string, _range: Range) => {
      if (!quoteReview) return;

      // This would integrate with the quote creation flow
      // For now, we'll just open the quote creation UI
      quoteReview.startQuoteCreation(selectedText, null, []);
    },
    [quoteReview]
  );

  // Cast containerRef to HTMLElement for SelectionAdder compatibility
  const containerRefAsHTMLElement = editorContainerRef as React.RefObject<HTMLElement>;

  // Handle reference change for focused quote - update both context and editor
  const handleReferenceChange = useCallback(
    (reference: string) => {
      if (focusedQuoteId) {
        // Update context state
        quoteReview?.updateQuote(focusedQuoteId, { reference });
        // Update editor state
        editorActions?.quoteActions.updateQuoteReference(focusedQuoteId, reference);
      }
    },
    [focusedQuoteId, quoteReview, editorActions]
  );

  // Handle verify toggle for focused quote - update both context and editor
  const handleVerifyQuote = useCallback(() => {
    if (focusedQuoteId) {
      const quote = quotes.find((q) => q.id === focusedQuoteId);
      if (quote) {
        const newVerifiedState = !quote.isVerified;
        // Update context state
        quoteReview?.updateQuote(focusedQuoteId, {
          isReviewed: newVerifiedState,
        });
        // Update editor state
        editorActions?.quoteActions.toggleQuoteVerification(focusedQuoteId, newVerifiedState);
      }
    }
  }, [focusedQuoteId, quotes, quoteReview, editorActions]);

  // Handle boundary editing
  const handleEditBoundaries = useCallback(() => {
    if (focusedQuoteId) {
      quoteReview?.enterBoundaryEditMode(focusedQuoteId);
      // Focus the quote in editor
      editorActions?.quoteActions.focusQuote(focusedQuoteId);
    }
  }, [focusedQuoteId, quoteReview, editorActions]);

  // Feature 2: Quote click detection and FloatingEditBar positioning
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) {
      return;
    }

    const handleQuoteClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const quoteBlock = target.closest('blockquote[data-quote-id]') as HTMLElement;

      if (quoteBlock && editorContainerRef.current) {
        const quoteId = quoteBlock.getAttribute('data-quote-id');
        if (quoteId) {
          setFocusedQuoteId(quoteId);

          // Calculate position for FloatingEditBar (above the quote)
          const rect = quoteBlock.getBoundingClientRect();
          const containerRect = editorContainerRef.current.getBoundingClientRect();

          setFloatingBarPosition({
            top: rect.top - containerRect.top - 50, // 50px above quote
            left: rect.left - containerRect.left + rect.width / 2,
          });
        }
      } else {
        // Clicked outside quote - clear focus
        setFocusedQuoteId(null);
        setFloatingBarPosition(null);
      }
    };

    container.addEventListener('click', handleQuoteClick);
    return () => container.removeEventListener('click', handleQuoteClick);
  }, []);

  // Feature 4: Right-click context menu
  useEffect(() => {
    // Guard against missing document/window (SSR or testing environments)
    if (typeof window === 'undefined' || !window.document) {
      return;
    }

    const container = editorContainerRef.current;
    if (!container) {
      return;
    }

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const quoteBlock = target.closest('blockquote[data-quote-id]') as HTMLElement;

      if (quoteBlock) {
        e.preventDefault();
        const quoteId = quoteBlock.getAttribute('data-quote-id');
        if (quoteId) {
          setContextMenu({ x: e.clientX, y: e.clientY, quoteId });
        }
      }
    };

    const handleCloseContextMenu = () => setContextMenu(null);

    container.addEventListener('contextmenu', handleContextMenu);
    window.document.addEventListener('click', handleCloseContextMenu);
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
      window.document.removeEventListener('click', handleCloseContextMenu);
    };
  }, []);

  // Feature 5: Keyboard shortcuts
  useEffect(() => {
    // Guard against missing document/window (SSR or testing environments)
    if (typeof window === 'undefined' || !window.document) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux) - Create quote from selection
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          const selectedText = selection.toString().trim();
          if (selectedText.length >= 10) {
            handleCreateQuoteFromSelection(selectedText, selection.getRangeAt(0));
          }
        }
      }

      // Delete - Remove focused quote (update both context and editor)
      if (e.key === 'Delete' && focusedQuoteId) {
        e.preventDefault();
        // Delete from editor first
        editorActions?.quoteActions.deleteQuote(focusedQuoteId);
        // Then remove from context
        quoteReview?.removeQuote(focusedQuoteId);
        setFocusedQuoteId(null);
        setFloatingBarPosition(null);
      }

      // Escape - Close panels and clear focus
      if (e.key === 'Escape') {
        setFocusedQuoteId(null);
        setFloatingBarPosition(null);
        setContextMenu(null);
        if (quoteReview?.boundaryDrag.isDragging) {
          quoteReview.exitBoundaryEditMode();
        }
      }

      // Cmd+Shift+V - Verify focused quote
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v' && focusedQuoteId) {
        e.preventDefault();
        handleVerifyQuote();
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    focusedQuoteId,
    quoteReview,
    editorActions,
    handleCreateQuoteFromSelection,
    handleVerifyQuote,
  ]);

  // Handle context menu actions - update both context and editor
  const handleContextMenuAction = useCallback(
    (action: string, quoteId: string) => {
      setContextMenu(null);
      setFocusedQuoteId(quoteId);

      switch (action) {
        case 'verify': {
          // Update context state
          quoteReview?.updateQuote(quoteId, { isReviewed: true });
          // Update editor state
          editorActions?.quoteActions.toggleQuoteVerification(quoteId, true);
          break;
        }
        case 'edit-bounds':
          quoteReview?.enterBoundaryEditMode(quoteId);
          editorActions?.quoteActions.focusQuote(quoteId);
          break;
        case 'delete':
          // Delete from editor first
          editorActions?.quoteActions.deleteQuote(quoteId);
          // Then remove from context
          quoteReview?.removeQuote(quoteId);
          setFocusedQuoteId(null);
          break;
        case 'lookup':
          // Open verse lookup modal
          break;
        case 'toggle-non-biblical': {
          const quote = quotes.find((q) => q.id === quoteId);
          if (quote) {
            const newNonBiblicalState = !quote.isVerified; // Assuming isVerified tracks this
            quoteReview?.updateQuote(quoteId, { isNonBiblical: newNonBiblicalState });
            editorActions?.quoteActions.toggleQuoteNonBiblical(quoteId, newNonBiblicalState);
          }
          break;
        }
      }
    },
    [quoteReview, editorActions, quotes]
  );

  // Render base SermonEditor with quote features overlay
  return (
    <div ref={editorContainerRef} className="quote-aware-sermon-editor">
      <SermonEditor document={document} documentState={documentState} onAstChange={onAstChange} />

      {/* Selection-based quote creation */}
      {documentState && editorContainerRef.current && (
        <SelectionAdder
          containerRef={containerRefAsHTMLElement}
          onCreateQuote={handleCreateQuoteFromSelection}
          isReviewModeActive={quoteReview?.review.isReviewModeActive ?? false}
          minSelectionLength={10}
        />
      )}

      {/* Feature 3: Boundary editing for focused quote */}
      {focusedQuoteId &&
        quoteReview?.boundaryEdit.isActive &&
        (() => {
          // Find the quote element in the DOM
          const quoteElement = editorContainerRef.current?.querySelector(
            `blockquote[data-quote-id="${focusedQuoteId}"]`
          ) as HTMLElement | null;
          const quoteData = quotes.find((q) => q.id === focusedQuoteId);

          if (!quoteElement || !quoteData) return null;

          return (
            <QuoteBoundaryEditor
              quoteElement={quoteElement}
              quoteText={quoteData.text}
              isActive={quoteReview.boundaryEdit.isActive}
              onBoundaryChange={(_newText, startOffset, endOffset) => {
                // Update the quote boundaries through the context
                quoteReview.updateBoundaryPreview(startOffset, endOffset);
              }}
              onEditStart={() => {
                quoteReview.startBoundaryDrag(focusedQuoteId, 'start', 0);
              }}
              onEditEnd={() => {
                quoteReview.commitBoundaryChange();
                quoteReview.exitBoundaryEditMode();
              }}
              onCrossParagraphDrag={(direction, targetParagraph) => {
                // Handle cross-paragraph drag - could merge paragraphs
                console.log('Cross-paragraph drag:', direction, targetParagraph);
              }}
            />
          );
        })()}

      {/* Feature 2: Floating toolbar for focused quote */}
      {focusedQuoteId && floatingBarPosition && (
        <FloatingEditBar
          reference={quotes.find((q) => q.id === focusedQuoteId)?.reference || ''}
          isVerified={quotes.find((q) => q.id === focusedQuoteId)?.isVerified || false}
          isBoundaryEditActive={
            quoteReview?.boundaryDrag.isDragging &&
            quoteReview.boundaryDrag.quoteId === focusedQuoteId
          }
          isNonBiblical={false}
          position={floatingBarPosition}
          onReferenceChange={handleReferenceChange}
          onVerify={handleVerifyQuote}
          onEditBounds={handleEditBoundaries}
          onDelete={() => {
            quoteReview?.removeQuote(focusedQuoteId);
            setFocusedQuoteId(null);
            setFloatingBarPosition(null);
          }}
          onEditInterjections={() => quoteReview?.enterInterjectionEditMode(focusedQuoteId)}
          onToggleNonBiblical={() => {
            // Toggle non-biblical status
          }}
          onLookupVerse={() => {
            // Open verse lookup
          }}
        />
      )}

      {/* Feature 4: Context menu for quotes */}
      {contextMenu && (
        <div
          className="quote-context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 2000,
          }}
        >
          <button
            className="quote-context-menu-item"
            onClick={() => handleContextMenuAction('verify', contextMenu.quoteId)}
          >
            ✓ Verify Quote
          </button>
          <button
            className="quote-context-menu-item"
            onClick={() => handleContextMenuAction('edit-bounds', contextMenu.quoteId)}
          >
            ↔ Edit Boundaries
          </button>
          <button
            className="quote-context-menu-item"
            onClick={() => handleContextMenuAction('lookup', contextMenu.quoteId)}
          >
            🔍 Lookup Verse
          </button>
          <button
            className="quote-context-menu-item"
            onClick={() => handleContextMenuAction('toggle-non-biblical', contextMenu.quoteId)}
          >
            ⚠ Toggle Non-Biblical
          </button>
          <div className="quote-context-menu-divider" />
          <button
            className="quote-context-menu-item danger"
            onClick={() => handleContextMenuAction('delete', contextMenu.quoteId)}
          >
            🗑 Delete Quote
          </button>
        </div>
      )}
    </div>
  );
}

export default QuoteAwareSermonEditor;
