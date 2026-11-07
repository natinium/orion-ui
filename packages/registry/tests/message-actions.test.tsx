import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageActions } from '../src/ui/message-actions';

// Same contract as the chat-shell suite: every surface is themed by tokens
// (bg-*, text-*, border-* referencing CSS variables), never by a hardcoded
// palette step — that is what keeps dark and light in parity.
const HARDCODED_COLOR_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|caret|decoration|from|via|to|accent)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

describe('MessageActions', () => {
  beforeEach(() => {
    stubClipboard();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the toolbar with data-slot and merges className on the root', () => {
    render(<MessageActions content="Hi" className="mt-2" data-testid="actions-el" />);
    const bar = screen.getByRole('toolbar', { name: 'Message actions' });
    expect(bar).toHaveAttribute('data-slot', 'message-actions-bar');
    const root = bar.closest('[data-slot="message-actions"]');
    expect(root).toHaveClass('mt-2');
    expect(root).toHaveClass('group');
    expect(screen.getByTestId('actions-el')).toBeInTheDocument();
  });

  it('hides the bar until hover or keyboard focus reaches it', () => {
    render(<MessageActions content="Hi" />);
    const bar = screen.getByRole('toolbar', { name: 'Message actions' });
    expect(bar).toHaveClass('opacity-0');
    expect(bar).toHaveClass('group-hover:opacity-100');
    // Keyboard parity: focus inside the bar must reveal it too.
    expect(bar).toHaveClass('focus-within:opacity-100');
  });

  it('writes the content to the clipboard and shows Copied', async () => {
    const writeText = stubClipboard();
    render(<MessageActions content="Revenue grew 12%." />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await act(async () => {});
    expect(writeText).toHaveBeenCalledWith('Revenue grew 12%.');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  it('reverts the Copied confirmation after 2 seconds', async () => {
    vi.useFakeTimers();
    stubClipboard();
    render(<MessageActions content="Hi" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copied' })).not.toBeInTheDocument();
  });

  it('stays silent (no crash, no Copied) when the clipboard rejects', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    render(<MessageActions content="Hi" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    expect(screen.queryByRole('button', { name: 'Copied' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('does not crash when no clipboard API exists', async () => {
    Object.defineProperty(window.navigator, 'clipboard', { value: undefined, configurable: true });
    render(<MessageActions content="Hi" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    expect(screen.queryByRole('button', { name: 'Copied' })).not.toBeInTheDocument();
  });

  it('fires the regenerate callback', () => {
    const onRegenerate = vi.fn();
    render(<MessageActions content="Hi" onRegenerate={onRegenerate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate response' }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('shows the selected rating as pressed and moves it on re-rate', () => {
    const onRate = vi.fn();
    render(<MessageActions content="Hi" onRate={onRate} />);
    const up = screen.getByRole('button', { name: 'Good response' });
    const down = screen.getByRole('button', { name: 'Bad response' });

    fireEvent.click(up);
    expect(up).toHaveAttribute('aria-pressed', 'true');
    expect(down).toHaveAttribute('aria-pressed', 'false');
    expect(onRate).toHaveBeenCalledWith('up');

    fireEvent.click(down);
    expect(down).toHaveAttribute('aria-pressed', 'true');
    expect(up).toHaveAttribute('aria-pressed', 'false');
    expect(onRate).toHaveBeenLastCalledWith('down');
  });

  it('deselects a rating on second click without firing the callback again', () => {
    const onRate = vi.fn();
    render(<MessageActions content="Hi" onRate={onRate} />);
    const up = screen.getByRole('button', { name: 'Good response' });
    fireEvent.click(up);
    fireEvent.click(up);
    expect(up).toHaveAttribute('aria-pressed', 'false');
    expect(onRate).toHaveBeenCalledTimes(1);
  });

  it('localizes every user-facing string via labels', async () => {
    const writeText = stubClipboard();
    render(
      <MessageActions
        content="Bonjour"
        labels={{
          toolbar: 'Actions du message',
          copy: 'Copier',
          copied: 'Copié',
          regenerate: 'Régénérer la réponse',
          rateUp: 'Bonne réponse',
          rateDown: 'Mauvaise réponse',
        }}
      />,
    );
    expect(screen.getByRole('toolbar', { name: 'Actions du message' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copier' }));
    await act(async () => {});
    expect(writeText).toHaveBeenCalledWith('Bonjour');
    expect(screen.getByRole('button', { name: 'Copié' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copier' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Régénérer la réponse' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bonne réponse' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mauvaise réponse' })).toBeInTheDocument();
  });

  it('renders every surface with theme tokens only (dark/light parity)', () => {
    document.documentElement.classList.add('dark');
    try {
      const { container } = render(
        <MessageActions content="Hi" onRegenerate={() => {}} onRate={() => {}} />,
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
