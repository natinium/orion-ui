import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueuedNotice, StreamingText, ThinkingIndicator } from '../src/ui/streaming-states';

// Same contract as the chat-shell suite: every surface is themed by tokens
// (bg-*, text-*, border-* referencing CSS variables), never by a hardcoded
// palette step — that is what keeps dark and light in parity.
const HARDCODED_COLOR_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|caret|decoration|from|via|to|accent)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;

afterEach(() => {
  vi.useRealTimers();
});

describe('StreamingText', () => {
  it('renders the arriving text with a CSS-animated cursor and no JS timers', () => {
    vi.useFakeTimers();
    render(<StreamingText>Generating tokens…</StreamingText>);
    const text = screen.getByText(/generating tokens/i);
    expect(text).toHaveAttribute('data-slot', 'streaming-text');
    expect(text).toHaveAttribute('role', 'status');
    expect(text).toHaveAttribute('aria-busy', 'true');
    const cursor = text.querySelector('[data-slot="streaming-text-cursor"]');
    expect(cursor).toHaveAttribute('aria-hidden', 'true');
    expect(cursor).toHaveClass('animate-pulse'); // blinking is pure CSS
    expect(vi.getTimerCount()).toBe(0); // no interval, no timer leak
  });
});

describe('ThinkingIndicator', () => {
  it('ticks elapsed seconds while thinking and cleans up its interval on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<ThinkingIndicator />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('data-slot', 'thinking-indicator');
    expect(screen.getByText('Thinking…')).toBeInTheDocument();
    expect(screen.getByText('0s')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('3s')).toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders a controlled elapsed value without running any timer', () => {
    vi.useFakeTimers();
    render(<ThinkingIndicator label="Reviewing files" elapsed={7} />);
    expect(screen.getByText('Reviewing files…')).toBeInTheDocument();
    expect(screen.getByText('7s')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('7s')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('QueuedNotice', () => {
  it('shows the position in the queue and cancels through the labeled button', () => {
    const onCancel = vi.fn();
    const { rerender } = render(<QueuedNotice position={2} onCancel={onCancel} />);
    expect(screen.getByText(/queued — position 2/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    // Without onCancel there is nothing to cancel — the button is not rendered.
    rerender(<QueuedNotice position={1} />);
    expect(screen.getByText(/queued — position 1/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});

describe('streaming states shared contract', () => {
  it('merges consumer className last and renders theme tokens only (dark/light parity)', () => {
    document.documentElement.classList.add('dark');
    try {
      const { container } = render(
        <>
          <StreamingText className="mt-2">partial answer</StreamingText>
          <ThinkingIndicator className="mt-2" />
          <QueuedNotice position={3} onCancel={() => {}} className="mt-2" />
        </>,
      );
      expect(container.querySelector('[data-slot="streaming-text"]')).toHaveClass(
        'mt-2',
        'whitespace-pre-wrap',
        'break-words', // long pasted URLs wrap instead of overflowing
      );
      expect(container.querySelector('[data-slot="thinking-indicator"]')).toHaveClass(
        'mt-2',
        'flex',
      );
      expect(container.querySelector('[data-slot="queued-notice"]')).toHaveClass(
        'mt-2',
        'rounded-lg',
      );
      expect(screen.getAllByRole('status')).toHaveLength(3);
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
