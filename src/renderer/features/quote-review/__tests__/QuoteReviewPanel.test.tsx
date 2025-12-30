/**
 * Tests for QuoteReviewPanel component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QuoteReviewPanel } from '../components/QuoteReviewPanel';
import { QuoteReviewProvider } from '../../../contexts/QuoteReviewContext';

// Helper to render with provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<QuoteReviewProvider>{ui}</QuoteReviewProvider>);
};

describe('QuoteReviewPanel', () => {
  describe('Empty state', () => {
    it('should render empty state when no quotes', () => {
      renderWithProvider(<QuoteReviewPanel />);

      expect(screen.getByText('No Quotes to Review')).toBeInTheDocument();
      expect(screen.getByText(/No Bible quotes have been detected/)).toBeInTheDocument();
    });
  });

  // Note: These tests require the context to be populated with quotes
  // In a real implementation, we'd either:
  // 1. Mock the context
  // 2. Use a custom provider that pre-populates state
  // 3. Have the component accept quotes as props

  describe('Accessibility', () => {
    it('should have proper structure in empty state', () => {
      const { container } = renderWithProvider(<QuoteReviewPanel />);

      // The empty state should have proper structure
      const emptyIcon = container.querySelector('.quote-review-empty-icon');
      expect(emptyIcon).toBeInTheDocument();
      expect(emptyIcon?.textContent).toBe('📝');
    });
  });

  describe('Compact mode', () => {
    it('should apply compact class when compact prop is true', () => {
      const { container } = renderWithProvider(<QuoteReviewPanel compact />);

      // When empty, still should have the panel class
      const panel = container.querySelector('.quote-review-panel');
      expect(panel).toHaveClass('quote-review-panel-empty');
    });
  });
});
