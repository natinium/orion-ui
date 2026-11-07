import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MessagePair } from '../src/ui/message-pair';

// Same contract as the chat-shell suite: every surface is themed by tokens
// (bg-*, text-*, border-* referencing CSS variables), never by a hardcoded
// palette step — that is what keeps dark and light in parity.
const HARDCODED_COLOR_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|caret|decoration|from|via|to|accent)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;

describe('MessagePair', () => {
  it('renders both bubbles with data-slot and list semantics', () => {
    render(
      <MessagePair
        userMessage="What changed in v4?"
        assistantContent={<p>Tailwind v4 is CSS-first.</p>}
      />,
    );
    const user = screen.getByText('What changed in v4?');
    expect(user).toHaveAttribute('data-slot', 'message-pair-user-bubble');
    const reply = screen
      .getByText('Tailwind v4 is CSS-first.')
      .closest('[data-slot="message-pair-assistant-content"]');
    expect(reply).toBeInTheDocument();
    // The turn is one unit for screen readers: a list of two messages.
    expect(screen.getByRole('list')).toHaveAttribute('data-slot', 'message-pair');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('aligns the user bubble right with the primary tint, assistant plain on the left', () => {
    render(<MessagePair userMessage="Hi" assistantContent="Hello" />);
    const row = screen.getByText('Hi').closest('[data-slot="message-pair-user"]');
    expect(row).toHaveClass('justify-end');
    expect(screen.getByText('Hi')).toHaveClass('bg-primary');
    expect(screen.getByText('Hello')).not.toHaveClass('bg-primary');
    const assistantRow = screen.getByText('Hello').closest('[data-slot="message-pair-assistant"]');
    expect(assistantRow).toHaveClass('justify-start');
  });

  it('formats Date timestamps to hour+minute and exposes dateTime', () => {
    render(
      <MessagePair
        userMessage="Hi"
        assistantContent="Hello"
        userAt={new Date(2026, 10, 7, 14, 32)}
        assistantAt={new Date(2026, 10, 7, 9, 5)}
      />,
    );
    const userTime = screen.getByText('14:32');
    expect(userTime).toHaveAttribute('data-slot', 'message-pair-user-time');
    expect(userTime).toHaveAttribute('dateTime', '14:32');
    expect(screen.getByText('09:05')).toHaveAttribute('dateTime', '09:05');
  });

  it('passes preformatted timestamp strings through untouched', () => {
    render(<MessagePair userMessage="Hi" assistantContent="Hello" userAt="08:03" />);
    expect(screen.getByText('08:03')).toHaveAttribute('dateTime', '08:03');
  });

  it('omits timestamps when not provided', () => {
    render(<MessagePair userMessage="Hi" assistantContent="Hello" />);
    expect(screen.queryByTestId('message-pair-user-time')).not.toBeInTheDocument();
  });

  it('derives speaker initials with an accessible name, overridable via names', () => {
    render(
      <MessagePair
        userMessage="Hi"
        assistantContent="Hello"
        names={{ user: 'Ada Lovelace', assistant: 'Orion' }}
      />,
    );
    const user = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(user).toHaveAttribute('data-slot', 'message-pair-user-avatar');
    expect(user).toHaveTextContent('A');
    expect(screen.getByRole('img', { name: 'Orion' })).toHaveTextContent('O');
  });

  it('falls back to children as the assistant reply slot', () => {
    render(
      <MessagePair userMessage="Hi">
        <p>Streamed reply</p>
      </MessagePair>,
    );
    const slot = screen
      .getByText('Streamed reply')
      .closest('[data-slot="message-pair-assistant-content"]');
    expect(slot).toBeInTheDocument();
  });

  it('prefers the assistantContent prop over children and merges className', () => {
    render(
      <MessagePair userMessage="Hi" assistantContent="Prop wins" className="mt-6">
        Children lose
      </MessagePair>,
    );
    expect(screen.getByText('Prop wins')).toBeInTheDocument();
    expect(screen.queryByText('Children lose')).not.toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveClass('mt-6');
    expect(screen.getByRole('list')).toHaveClass('flex-col');
  });

  it('forwards native props to the root', () => {
    render(<MessagePair userMessage="Hi" data-testid="pair-el" />);
    expect(screen.getByTestId('pair-el')).toBeInTheDocument();
  });

  it('renders every surface with theme tokens only (dark/light parity)', () => {
    document.documentElement.classList.add('dark');
    try {
      const { container } = render(
        <MessagePair
          userMessage="Hi"
          assistantContent="Hello"
          userAt={new Date(2026, 10, 7, 14, 32)}
          names={{ user: 'Ada', assistant: 'Orion' }}
        />,
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
