import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from '../src/ui/empty-state';

describe('EmptyState', () => {
  it('renders with the data-slot attribute and dashed border', () => {
    render(<EmptyState>Content</EmptyState>);
    const el = screen.getByText('Content');
    expect(el).toHaveAttribute('data-slot', 'empty-state');
    expect(el).toHaveClass('border-dashed');
  });

  it('merges custom className without losing the base classes', () => {
    render(<EmptyState className="mt-2">C</EmptyState>);
    const el = screen.getByText('C');
    expect(el).toHaveClass('mt-2');
    expect(el).toHaveClass('flex-col');
  });

  it('forwards native props', () => {
    render(<EmptyState data-testid="empty-state-el">P</EmptyState>);
    expect(screen.getByTestId('empty-state-el')).toBeInTheDocument();
  });
});

describe('EmptyState sub-slots', () => {
  it('composes media, title, description and action with their own data-slots', () => {
    render(
      <EmptyState>
        <EmptyStateMedia>📄</EmptyStateMedia>
        <EmptyStateTitle>No files yet</EmptyStateTitle>
        <EmptyStateDescription>Upload your first file.</EmptyStateDescription>
        <EmptyStateAction>
          <button>Upload</button>
        </EmptyStateAction>
      </EmptyState>,
    );
    expect(screen.getByText('No files yet')).toHaveAttribute('data-slot', 'empty-state-title');
    expect(screen.getByText('Upload your first file.')).toHaveAttribute(
      'data-slot',
      'empty-state-description',
    );
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
  });
});
