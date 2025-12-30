/**
 * ResizablePanel Component
 *
 * A panel that can be resized by dragging its edge, and optionally collapsed.
 * Used for the quote review side panel.
 */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';
import './ResizablePanel.css';

export interface ResizablePanelProps {
  /** Panel content */
  children: ReactNode;
  /** Default width in pixels */
  defaultWidth?: number;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Whether the panel can be collapsed */
  collapsible?: boolean;
  /** Whether the panel is currently collapsed */
  collapsed?: boolean;
  /** Callback when collapsed state changes */
  onCollapse?: (collapsed: boolean) => void;
  /** Callback when width changes */
  onResize?: (width: number) => void;
  /** Position of the panel */
  position?: 'left' | 'right';
  /** Width of the collapsed state */
  collapsedWidth?: number;
  /** Additional class name */
  className?: string;
  /** Panel header content (shown when collapsed too) */
  header?: ReactNode;
  /** Aria label for the panel */
  ariaLabel?: string;
}

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 240;
const MAX_WIDTH = 600;
const COLLAPSED_WIDTH = 40;

export function ResizablePanel({
  children,
  defaultWidth = DEFAULT_WIDTH,
  minWidth = MIN_WIDTH,
  maxWidth = MAX_WIDTH,
  collapsible = true,
  collapsed = false,
  onCollapse,
  onResize,
  position = 'right',
  collapsedWidth = COLLAPSED_WIDTH,
  className = '',
  header,
  ariaLabel = 'Resizable panel',
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed) return;

      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [collapsed, width]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const delta =
        position === 'right' ? startXRef.current - e.clientX : e.clientX - startXRef.current;

      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
      setWidth(newWidth);
      onResize?.(newWidth);
    },
    [isResizing, position, minWidth, maxWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleToggleCollapse = useCallback(() => {
    onCollapse?.(!collapsed);
  }, [collapsed, onCollapse]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggleCollapse();
      }
    },
    [handleToggleCollapse]
  );

  const panelStyle: CSSProperties = {
    width: collapsed ? collapsedWidth : width,
    minWidth: collapsed ? collapsedWidth : minWidth,
    maxWidth: collapsed ? collapsedWidth : maxWidth,
  };

  const resizeHandlePosition = position === 'right' ? 'left' : 'right';

  return (
    <div
      ref={panelRef}
      className={`resizable-panel resizable-panel--${position} ${collapsed ? 'resizable-panel--collapsed' : ''} ${isResizing ? 'resizable-panel--resizing' : ''} ${className}`}
      style={panelStyle}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Resize handle */}
      {!collapsed && (
        <div
          className={`resizable-panel__handle resizable-panel__handle--${resizeHandlePosition}`}
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          tabIndex={0}
        />
      )}

      {/* Collapse toggle button */}
      {collapsible && (
        <button
          className="resizable-panel__collapse-btn"
          onClick={handleToggleCollapse}
          onKeyDown={handleKeyDown}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <span className="resizable-panel__collapse-icon">
            {position === 'right' ? (collapsed ? '◀' : '▶') : collapsed ? '▶' : '◀'}
          </span>
        </button>
      )}

      {/* Panel content */}
      <div className="resizable-panel__content">
        {header && <div className="resizable-panel__header">{header}</div>}
        {!collapsed && <div className="resizable-panel__body">{children}</div>}
      </div>
    </div>
  );
}

export default ResizablePanel;
