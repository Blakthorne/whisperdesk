/**
 * Tests for BookAutocomplete component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookAutocomplete } from '../components/BookAutocomplete';

// Mock the electronAPI
vi.mock('../../../services/electronAPI', () => ({
  getBibleBookNames: vi.fn().mockResolvedValue([
    { name: 'Genesis', abbreviations: ['Gen', 'Ge', 'Gn'] },
    { name: 'Exodus', abbreviations: ['Ex', 'Exod', 'Exo'] },
    { name: 'John', abbreviations: ['Jn', 'Joh'] },
    { name: '1 John', abbreviations: ['1Jn', '1Jo', '1 Jn'] },
    { name: '2 John', abbreviations: ['2Jn', '2Jo', '2 Jn'] },
    { name: '3 John', abbreviations: ['3Jn', '3Jo', '3 Jn'] },
  ]),
}));

describe('BookAutocomplete', () => {
  const mockOnSelect = vi.fn();
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    mockOnChange.mockClear();
  });

  it('should render with placeholder', () => {
    render(<BookAutocomplete value="" onChange={mockOnChange} onSelect={mockOnSelect} />);

    expect(screen.getByPlaceholderText('Book name...')).toBeInTheDocument();
  });

  it('should call onChange when typing', async () => {
    render(<BookAutocomplete value="" onChange={mockOnChange} onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText('Book name...');
    fireEvent.change(input, { target: { value: 'Jo' } });

    expect(mockOnChange).toHaveBeenCalledWith('Jo');
  });

  it('should show dropdown when focused with input', async () => {
    render(<BookAutocomplete value="John" onChange={mockOnChange} onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText('Book name...');
    fireEvent.focus(input);

    // Wait for dropdown to appear
    await waitFor(() => {
      const dropdown = document.querySelector('.book-autocomplete-dropdown');
      expect(dropdown).toBeInTheDocument();
    });
  });

  it('should filter books based on input', async () => {
    render(<BookAutocomplete value="Gen" onChange={mockOnChange} onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText('Book name...');
    fireEvent.focus(input);

    await waitFor(() => {
      // Should show Genesis but not unrelated books
      expect(screen.getByText('Genesis')).toBeInTheDocument();
    });
  });

  it('should call onSelect when a book is clicked', async () => {
    render(<BookAutocomplete value="Gen" onChange={mockOnChange} onSelect={mockOnSelect} />);

    const input = screen.getByPlaceholderText('Book name...');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Genesis')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Genesis'));

    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<BookAutocomplete value="" onChange={mockOnChange} onSelect={mockOnSelect} disabled />);

    const input = screen.getByPlaceholderText('Book name...');
    expect(input).toBeDisabled();
  });
});
