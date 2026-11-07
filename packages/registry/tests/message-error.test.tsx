import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageError, messageErrorVariants } from '../src/ui/message-error';

// Same contract as the chat-shell suite: every surface is themed by tokens
// (bg-*, text-*, border-* referencing CSS variables), never by a hardcoded
// palette step — that is what keeps dark and light in parity.
const HARDCODED_COLOR_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|caret|decoration|from|via|to|accent)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;

describe('MessageError', () => {
  it('renders the failed kind with a destructive tint, asserted as an alert', () => {
    render(<MessageError kind="failed" />);
    const root = screen.getByRole('alert');
    expect(root).toHaveAttribute('data-slot', 'message-error');
    expect(root).toHaveAttribute('data-variant', 'failed');
    expect(root).toHaveClass('border-destructive/30');
    expect(root).toHaveClass('bg-destructive/10');
    expect(screen.getByText('Failed')).toHaveAttribute('data-slot', 'message-error-title');
    expect(
      screen.getByText('Something went wrong while generating this response.'),
    ).toHaveAttribute('data-slot', 'message-error-message');
  });

  it('renders the stopped kind with a neutral tint, announced politely', () => {
    render(<MessageError kind="stopped" />);
    const root = screen.getByRole('status');
    expect(root).toHaveAttribute('data-variant', 'stopped');
    expect(root).not.toHaveClass('border-destructive/30');
    expect(root).toHaveClass('border-border');
    expect(screen.getByText('Stopped')).toBeInTheDocument();
    expect(screen.getByText('The response was stopped before it finished.')).toBeInTheDocument();
  });

  it('both kinds wire Retry and Keep-partial callbacks', () => {
    const onRetry = vi.fn();
    const onKeep = vi.fn();
    const { rerender } = render(<MessageError kind="failed" onRetry={onRetry} onKeep={onKeep} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep partial answer' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onKeep).toHaveBeenCalledTimes(1);

    rerender(<MessageError kind="stopped" onRetry={onRetry} onKeep={onKeep} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep partial answer' }));
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onKeep).toHaveBeenCalledTimes(2);
  });

  it('lets the caller override the detail line', () => {
    render(<MessageError kind="failed" message="Rate limit reached for gpt-4o." />);
    expect(screen.getByText('Rate limit reached for gpt-4o.')).toHaveAttribute(
      'data-slot',
      'message-error-message',
    );
  });

  it('omits buttons whose handler was not provided', () => {
    render(<MessageError kind="failed" onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Keep partial answer' })).not.toBeInTheDocument();
  });

  it('renders no action row at all without handlers, and merges className', () => {
    render(<MessageError kind="stopped" className="mt-3" data-testid="err-el" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('err-el')).toHaveClass('mt-3');
    expect(screen.getByTestId('err-el')).toHaveClass('items-start');
  });

  it('builds the failed and stopped class sets via messageErrorVariants (cva)', () => {
    expect(messageErrorVariants({ kind: 'failed' })).toContain('border-destructive/30');
    expect(messageErrorVariants({ kind: 'failed' })).toContain('bg-destructive/10');
    expect(messageErrorVariants({ kind: 'failed' })).toContain('text-destructive');
    expect(messageErrorVariants({ kind: 'stopped' })).toContain('border-border');
    expect(messageErrorVariants({ kind: 'stopped' })).toContain('bg-muted/40');
  });

  it('localizes every user-facing string via labels', () => {
    render(
      <MessageError
        kind="failed"
        onRetry={() => {}}
        onKeep={() => {}}
        labels={{
          failed: 'Fehlgeschlagen',
          stopped: 'Angehalten',
          retry: 'Erneut versuchen',
          keepPartial: 'Teilantwort behalten',
        }}
      />,
    );
    expect(screen.getByText('Fehlgeschlagen')).toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Teilantwort behalten' })).toBeInTheDocument();
  });

  it('renders every surface with theme tokens only (dark/light parity)', () => {
    document.documentElement.classList.add('dark');
    try {
      const { container } = render(
        <>
          <MessageError kind="failed" onRetry={() => {}} onKeep={() => {}} />
          <MessageError kind="stopped" onRetry={() => {}} />
        </>,
      );
      for (const element of container.querySelectorAll<HTMLElement>('*')) {
        expect(element.getAttribute('class') ?? '', element.dataset.slot).not.toMatch(
          HARDCODED_COLOR_CLASS,
        );
      }
    } finally {
      document.documentElement.classList.remove('dark');
    }
  });
});
