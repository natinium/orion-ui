import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentStaging } from '../src/ui/attachment-staging';

const ATTACHMENTS = [
  { id: 'a1', name: 'report.pdf', size: 512, status: 'queued' as const, progress: 0 },
  {
    id: 'a2',
    name: 'screenshot.png',
    size: 5 * 1024 * 1024,
    status: 'uploading' as const,
    progress: 42,
  },
  { id: 'a3', name: 'notes.txt', size: 2048, status: 'done' as const, progress: 100 },
  {
    id: 'a4',
    name: 'crash.log',
    size: 3 * 1024 * 1024 * 1024,
    status: 'error' as const,
    progress: 0,
  },
];

// Same contract as the chat-shell suite: every surface is themed by tokens
// (bg-*, text-*, border-* referencing CSS variables), never by a hardcoded
// palette step — that is what keeps dark and light in parity.
const HARDCODED_COLOR_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|caret|decoration|from|via|to|accent)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;

describe('AttachmentStaging', () => {
  it('renders one row per staged attachment with data-status, merging className last', () => {
    render(<AttachmentStaging attachments={ATTACHMENTS} data-testid="tray" className="mt-2" />);
    const root = screen.getByTestId('tray');
    expect(root).toHaveAttribute('data-slot', 'attachment-staging');
    expect(root).toHaveClass('mt-2');
    for (const attachment of ATTACHMENTS) {
      const name = screen.getByText(attachment.name);
      const row = name.closest('[data-slot="attachment-staging-item"]');
      expect(row).toHaveAttribute('data-status', attachment.status);
    }
  });

  it('renders human-readable file sizes', () => {
    render(<AttachmentStaging attachments={ATTACHMENTS} />);
    expect(screen.getByText('512 B')).toBeInTheDocument();
    expect(screen.getByText('5.0 MB')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    expect(screen.getByText('3.0 GB')).toBeInTheDocument();
  });

  it('surfaces the progress state per row, with a real progressbar while uploading', () => {
    render(<AttachmentStaging attachments={ATTACHMENTS} />);
    expect(screen.getByText('queued')).toBeInTheDocument();
    expect(screen.getByText('uploading 42%')).toBeInTheDocument();
    expect(screen.getByText('done')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: /screenshot\.png/i });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
  });

  it('removes an attachment through its labeled button', () => {
    const onRemove = vi.fn();
    render(<AttachmentStaging attachments={ATTACHMENTS} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove report.pdf' }));
    expect(onRemove).toHaveBeenCalledWith('a1');
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('offers retry only on errored rows and calls onRetry with the attachment id', () => {
    const onRetry = vi.fn();
    render(<AttachmentStaging attachments={ATTACHMENTS} onRetry={onRetry} />);
    const retry = screen.getByRole('button', { name: 'Retry crash.log' });
    expect(screen.queryByRole('button', { name: 'Retry report.pdf' })).not.toBeInTheDocument();
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledWith('a4');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('exposes the upload state as the row variant (data-variant) and styles the error state via the status cva', () => {
    render(<AttachmentStaging attachments={ATTACHMENTS} />);
    for (const attachment of ATTACHMENTS) {
      const row = screen
        .getByText(attachment.name)
        .closest('[data-slot="attachment-staging-item"]');
      expect(row).toHaveAttribute('data-variant', attachment.status);
    }
    const error = screen.getByText('error');
    expect(error).toHaveClass('font-medium', 'text-destructive');
    const queued = screen.getByText('queued');
    expect(queued).toHaveClass('text-muted-foreground');
    expect(queued).not.toHaveClass('font-medium', 'text-destructive');
  });

  it('renders every surface with theme tokens only (dark/light parity)', () => {
    document.documentElement.classList.add('dark');
    try {
      render(<AttachmentStaging attachments={ATTACHMENTS} />);
      for (const element of document.querySelectorAll<HTMLElement>('*')) {
        expect(element.getAttribute('class') ?? '', element.dataset.slot).not.toMatch(
          HARDCODED_COLOR_CLASS,
        );
      }
    } finally {
      document.documentElement.classList.remove('dark');
    }
  });
});
