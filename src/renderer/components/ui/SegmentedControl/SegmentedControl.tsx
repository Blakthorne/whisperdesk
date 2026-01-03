import React, { useRef, useEffect, useState } from 'react';
import './SegmentedControl.css';

export interface SegmentedControlOption {
  /** Unique value identifier for the option */
  value: string;
  /** Display label for the option */
  label: string;
  /** Optional icon (e.g., Lucide React icon) */
  icon?: React.ReactNode;
  /** Optional tooltip text (shown on hover) */
  tooltip?: string;
}

export interface SegmentedControlProps {
  /** Array of options to display */
  options: SegmentedControlOption[];
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS class name */
  className?: string;
  /** Accessible label for the control */
  'aria-label'?: string;
}

/**
 * Horizontal segmented control with sliding background indicator.
 * Follows Apple-style design with smooth animations and keyboard support.
 */
function SegmentedControl({
  options,
  value,
  onChange,
  size = 'sm',
  className = '',
  'aria-label': ariaLabel = 'View selector',
}: SegmentedControlProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

  // Calculate and update the sliding indicator position
  useEffect(() => {
    if (!containerRef.current) return;

    const activeIndex = options.findIndex((opt) => opt.value === value);
    if (activeIndex === -1) return;

    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>(
      '.segmented-control-button'
    );
    const activeButton = buttons[activeIndex];

    if (activeButton) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setIndicatorStyle({
        width: buttonRect.width,
        transform: `translateX(${buttonRect.left - containerRect.left - 2}px)`,
      });
    }
  }, [value, options]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = options.length - 1;
    }

    if (newIndex !== currentIndex) {
      const option = options[newIndex];
      if (option) {
        onChange(option.value);
        // Focus the new button
        const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>(
          '.segmented-control-button'
        );
        buttons?.[newIndex]?.focus();
      }
    }
  };

  const classNames = ['segmented-control', `segmented-control-${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={containerRef} className={classNames} role="tablist" aria-label={ariaLabel}>
      {/* Sliding background indicator */}
      <div className="segmented-control-indicator" style={indicatorStyle} aria-hidden="true" />

      {options.map((option, index) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`segmented-control-button ${isActive ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            title={option.tooltip}
          >
            {option.icon && (
              <span className="segmented-control-icon" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span className="segmented-control-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
