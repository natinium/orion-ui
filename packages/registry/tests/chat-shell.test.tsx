import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ChatComposer,
  ChatMessage,
  ChatMessageList,
  ChatShell,
  ChatThreadItem,
  ChatThreadList,
} from '../src/ui/chat-shell';

const THREADS = [
  { id: 't1', title: 'Design review', preview: 'Can you check the latest mock?', unread: 2 },
  { id: 't2', title: 'Release notes', preview: 'Draft for v0.9 is ready' },
];

// Same contract as the calendar-scheduler suite: every surface is themed by
// tokens (bg-*, text-*, border-* referencing CSS variables), never by a
// hardcoded palette step — that is what keeps dark and light in parity.
const HARDCODED_COLOR_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|caret|decoration|from|via|to|accent)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;

/**
 * jsdom has no layout engine, so scroll geometry is mocked per element.
 * Returns the list of values written to `scrollTop` — the observable
 * contract of the pin-to-bottom logic. Pixel-level behavior is verified
 * against the real component in a browser.
 */
function mockScrollGeometry(
  el: HTMLElement,
  geometry: { scrollTop: number; clientHeight: number; scrollHeight: number },
) {
  const scrollTopWrites: number[] = [];
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => geometry.scrollTop,
    set: (value: number) => {
      geometry.scrollTop = value;
      scrollTopWrites.push(value);
    },
  });
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    get: () => geometry.clientHeight,
  });
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    get: () => geometry.scrollHeight,
  });
  return scrollTopWrites;
}

describe('ChatShell', () => {
  it('renders with the data-slot attribute', () => {
    render(<ChatShell>Content</ChatShell>);
    expect(screen.getByText('Content')).toHaveAttribute('data-slot', 'chat-shell');
  });

  it('merges custom className without losing the base classes', () => {
    render(<ChatShell className="mt-2">C</ChatShell>);
    const el = screen.getByText('C');
    expect(el).toHaveClass('mt-2');
    expect(el).toHaveClass('flex');
  });

  it('lets consumer className override conflicting utilities (merged last)', () => {
    render(<ChatShell className="max-w-5xl">C</ChatShell>);
    const el = screen.getByText('C');
    expect(el).toHaveClass('max-w-5xl');
    expect(el).not.toHaveClass('max-w-3xl');
  });

  it('forwards native props', () => {
    render(<ChatShell data-testid="chat-shell-el">P</ChatShell>);
    expect(screen.getByTestId('chat-shell-el')).toBeInTheDocument();
  });

  it('defaults to the classic variant and exposes it via data-variant', () => {
    render(<ChatShell data-testid="shell">C</ChatShell>);
    expect(screen.getByTestId('shell')).toHaveAttribute('data-variant', 'classic');
  });

  it('renders the workspace variant with the sidebar, log and composer as direct children', () => {
    render(
      <ChatShell variant="workspace" data-testid="shell">
        <ChatThreadList threads={THREADS} activeId="t1" />
        <ChatMessageList>
          <ChatMessage sender="assistant" author="Assistant">
            Hello
          </ChatMessage>
        </ChatMessageList>
        <ChatComposer />
      </ChatShell>,
    );
    const shell = screen.getByTestId('shell');
    expect(shell).toHaveAttribute('data-variant', 'workspace');
    // The grid places children via [data-slot] selectors — the sidebar must
    // be a direct child, with the pane (log + composer) following it.
    const nav = shell.querySelector(':scope > [data-slot="chat-thread-list"]');
    const log = shell.querySelector(':scope > [data-slot="chat-message-list"]');
    const composer = shell.querySelector(':scope > [data-slot="chat-composer"]');
    expect(nav).toBeInTheDocument();
    expect(log).toBeInTheDocument();
    expect(composer).toBeInTheDocument();
    expect(shell.firstElementChild).toBe(nav);
  });

  it('renders the focus variant as an overlay chrome shell with its nav as a direct child', () => {
    render(
      <ChatShell variant="focus" data-testid="shell">
        <ChatThreadList threads={THREADS} activeId="t1" />
        <ChatMessageList>
          <ChatMessage sender="assistant" author="Assistant">
            Hello
          </ChatMessage>
        </ChatMessageList>
      </ChatShell>,
    );
    const shell = screen.getByTestId('shell');
    expect(shell).toHaveAttribute('data-variant', 'focus');
    expect(shell.querySelector(':scope > [data-slot="chat-thread-list"]')).toBeInTheDocument();
    // Reveal-on-hover/focus and the hidden chrome's pointer transparency are
    // computed-style contracts; they are verified against the real component
    // in a browser (jsdom applies no CSS).
  });

  it('renders every surface with theme tokens only (dark/light parity)', () => {
    document.documentElement.classList.add('dark');
    try {
      render(
        <ChatShell variant="workspace" data-testid="shell" className="h-96">
          <ChatThreadList
            threads={[...THREADS, { id: 't3', title: 'No preview yet', unread: 5 }]}
            activeId="t1"
          />
          <ChatMessageList streaming>
            <ChatMessage sender="user" author="Natnael" timestamp="09:38">
              Can you summarize the Q3 metrics?
            </ChatMessage>
            <ChatMessage sender="assistant" author="Assistant" timestamp="09:41" streaming>
              Generating the breakdown…
            </ChatMessage>
          </ChatMessageList>
          <ChatComposer actions={<button type="button">Attach</button>} />
        </ChatShell>,
      );
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

describe('ChatThreadList', () => {
  it('renders every thread with title and preview', () => {
    render(<ChatThreadList threads={THREADS} activeId="t1" />);
    expect(screen.getByRole('button', { name: /design review/i })).toBeInTheDocument();
    expect(screen.getByText('Can you check the latest mock?')).toBeInTheDocument();
    expect(screen.getByText('Draft for v0.9 is ready')).toBeInTheDocument();
  });

  it('marks the active thread with aria-current and data-active', () => {
    render(<ChatThreadList threads={THREADS} activeId="t2" />);
    const active = screen.getByRole('button', { name: /release notes/i });
    expect(active).toHaveAttribute('aria-current', 'true');
    expect(active).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('button', { name: /design review/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('shows the unread badge only for threads with unread messages', () => {
    render(<ChatThreadList threads={THREADS} activeId="t1" />);
    const badge = screen.getByText('2');
    expect(badge).toHaveAttribute('data-slot', 'chat-thread-item-unread');
    // Screen readers get the state, not just the number.
    expect(screen.getByText('unread')).toHaveClass('sr-only');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows the unread badge even when the thread has no preview', () => {
    render(<ChatThreadList threads={[{ id: 'x', title: 'No preview', unread: 3 }]} />);
    const badge = screen.getByText('3');
    expect(badge).toHaveAttribute('data-slot', 'chat-thread-item-unread');
    expect(screen.getByText('unread')).toHaveClass('sr-only');
    expect(screen.getByRole('button', { name: /no preview/i })).toBeInTheDocument();
  });

  it('calls onSelect with the thread id on click', () => {
    const onSelect = vi.fn();
    render(<ChatThreadList threads={THREADS} activeId="t1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /release notes/i }));
    expect(onSelect).toHaveBeenCalledWith('t2');
  });

  it('is keyboard operable — items are native buttons with an accessible nav label', () => {
    const onSelect = vi.fn();
    render(<ChatThreadList threads={THREADS} activeId="t1" onSelect={onSelect} />);
    const nav = screen.getByRole('navigation', { name: /chat threads/i });
    expect(nav).toBeInTheDocument();
    const item = screen.getByRole('button', { name: /design review/i });
    expect(item.tagName).toBe('BUTTON');
    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledWith('t1');
  });

  it('renders a standalone ChatThreadItem with its own data-slot', () => {
    render(
      <ChatThreadItem id="solo" title="Standalone" preview="Just one thread" onSelect={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /standalone/i })).toHaveAttribute(
      'data-slot',
      'chat-thread-item',
    );
  });
});

describe('ChatMessageList', () => {
  it('renders messages with their roles as a polite live log', () => {
    render(
      <ChatMessageList>
        <ChatMessage sender="user" author="Natnael">
          Summarize Q3
        </ChatMessage>
        <ChatMessage sender="assistant" author="Assistant">
          Here is the summary
        </ChatMessage>
      </ChatMessageList>,
    );
    const list = screen.getByRole('log');
    expect(list).toHaveAttribute('aria-live', 'polite');
    expect(list).toHaveAttribute('data-slot', 'chat-message-list');
    expect(screen.getByText('Summarize Q3').closest('[data-slot="chat-message"]')).toHaveAttribute(
      'data-role',
      'user',
    );
    expect(
      screen.getByText('Here is the summary').closest('[data-slot="chat-message"]'),
    ).toHaveAttribute('data-role', 'assistant');
  });

  it('is keyboard-scrollable — the scrollable log region is focusable', () => {
    render(
      <ChatMessageList>
        <ChatMessage sender="user" author="Natnael">
          Hello
        </ChatMessage>
      </ChatMessageList>,
    );
    const log = screen.getByRole('log');
    expect(log.tabIndex).toBe(0);
    log.focus();
    expect(log).toHaveFocus();
  });

  it('marks the log busy while streaming and clears it when the stream ends', () => {
    const { rerender } = render(
      <ChatMessageList streaming>
        <ChatMessage sender="assistant" author="Assistant">
          Partial…
        </ChatMessage>
      </ChatMessageList>,
    );
    expect(screen.getByRole('log')).toHaveAttribute('aria-busy', 'true');
    rerender(
      <ChatMessageList>
        <ChatMessage sender="assistant" author="Assistant">
          Done.
        </ChatMessage>
      </ChatMessageList>,
    );
    expect(screen.getByRole('log')).not.toHaveAttribute('aria-busy');
  });

  it('keeps following the latest content while the reader sits at the bottom', () => {
    const { rerender } = render(
      <ChatMessageList>
        <ChatMessage sender="assistant" author="Assistant">
          First
        </ChatMessage>
      </ChatMessageList>,
    );
    const el = screen.getByRole('log');
    const geometry = { scrollTop: 0, clientHeight: 300, scrollHeight: 300 };
    const writes = mockScrollGeometry(el, geometry);
    fireEvent.scroll(el); // distance to bottom: 0 → stays pinned
    writes.length = 0;
    rerender(
      <ChatMessageList>
        <ChatMessage sender="assistant" author="Assistant">
          First
        </ChatMessage>
        <ChatMessage sender="user" author="Natnael">
          Second
        </ChatMessage>
      </ChatMessageList>,
    );
    expect(writes).toEqual([300]);
    expect(geometry.scrollTop).toBe(300);
  });

  it('never yanks the scroll position back down once the reader has scrolled up', () => {
    const { rerender } = render(
      <ChatMessageList>
        <ChatMessage sender="assistant" author="Assistant">
          First
        </ChatMessage>
      </ChatMessageList>,
    );
    const el = screen.getByRole('log');
    // A long log (jsdom-free numbers), the reader parked at the top.
    const geometry = { scrollTop: 0, clientHeight: 300, scrollHeight: 2596 };
    const writes = mockScrollGeometry(el, geometry);
    fireEvent.scroll(el); // distance to bottom: 2296 → pinning disengages
    writes.length = 0;
    // A no-op parent re-render (e.g. a streaming token chunk) must not move
    // the view.
    rerender(
      <ChatMessageList>
        <ChatMessage sender="assistant" author="Assistant">
          First
        </ChatMessage>
        <ChatMessage sender="assistant" author="Assistant">
          Second
        </ChatMessage>
      </ChatMessageList>,
    );
    expect(writes).toEqual([]);
    expect(geometry.scrollTop).toBe(0);
  });

  it('resumes following the latest content when the reader returns to the bottom', () => {
    const { rerender } = render(
      <ChatMessageList>
        <ChatMessage sender="assistant" author="Assistant">
          First
        </ChatMessage>
      </ChatMessageList>,
    );
    const el = screen.getByRole('log');
    const geometry = { scrollTop: 0, clientHeight: 300, scrollHeight: 2596 };
    const writes = mockScrollGeometry(el, geometry);
    geometry.scrollTop = 2516; // distance to bottom: 20 → re-engages
    fireEvent.scroll(el);
    writes.length = 0;
    rerender(
      <ChatMessageList>
        <ChatMessage sender="assistant" author="Assistant">
          First
        </ChatMessage>
        <ChatMessage sender="assistant" author="Assistant">
          Second
        </ChatMessage>
      </ChatMessageList>,
    );
    expect(writes).toEqual([2596]);
  });

  it('shows the streaming cursor when the list is streaming', () => {
    const { container } = render(
      <ChatMessageList streaming>
        <ChatMessage sender="assistant" author="Assistant">
          …
        </ChatMessage>
      </ChatMessageList>,
    );
    const cursor = container.querySelector('[data-slot="chat-streaming-cursor"]');
    expect(cursor).not.toBeNull();
    expect(cursor).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the streaming cursor inline on a streaming message', () => {
    render(
      <ChatMessageList>
        <ChatMessage sender="assistant" author="Assistant" streaming>
          Working on it
        </ChatMessage>
      </ChatMessageList>,
    );
    const content = screen.getByText('Working on it');
    expect(content).toHaveAttribute('data-slot', 'chat-message-content');
    expect(content.querySelector('[data-slot="chat-streaming-cursor"]')).not.toBeNull();
  });

  it('does not show a cursor when nothing is streaming', () => {
    render(
      <ChatMessageList>
        <ChatMessage sender="assistant" author="Assistant">
          Done
        </ChatMessage>
      </ChatMessageList>,
    );
    expect(document.querySelector('[data-slot="chat-streaming-cursor"]')).not.toBeInTheDocument();
  });

  it('lets consumer className override conflicting utilities (merged last)', () => {
    render(
      <ChatMessageList className="p-8">
        <ChatMessage sender="user" author="Natnael">
          Hi
        </ChatMessage>
      </ChatMessageList>,
    );
    const log = screen.getByRole('log');
    expect(log).toHaveClass('p-8');
    expect(log).not.toHaveClass('p-4');
  });
});

describe('ChatMessage', () => {
  it('renders author, avatar initial and timestamp', () => {
    render(
      <ChatMessage sender="assistant" author="Assistant" timestamp="09:41">
        Hello there
      </ChatMessage>,
    );
    expect(screen.getByText('Assistant')).toBeInTheDocument();
    expect(screen.getByText('A')).toHaveAttribute('data-slot', 'chat-message-avatar');
    expect(screen.getByText('09:41')).toHaveAttribute('data-slot', 'chat-message-time');
  });

  it('honors a custom avatar initial and a date timestamp', () => {
    const { container } = render(
      <ChatMessage sender="user" author="Natnael" avatarInitial="N" timestamp="2026-11-07T09:41:00">
        Hi
      </ChatMessage>,
    );
    expect(screen.getByText('N')).toHaveAttribute('data-slot', 'chat-message-avatar');
    expect(container.querySelector('[data-slot="chat-message-time"]')).toBeInTheDocument();
  });

  it('renders nothing for an invalid timestamp', () => {
    const { container } = render(
      <ChatMessage sender="user" author="Natnael" timestamp="not-a-date">
        Hi
      </ChatMessage>,
    );
    expect(container.querySelector('[data-slot="chat-message-time"]')).toBeNull();
  });
});

describe('ChatComposer', () => {
  it('sends on Enter with non-empty text and clears the textarea', () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Type a message…');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('hello');
    expect(textarea).toHaveValue('');
  });

  it('does not send empty or whitespace-only text', () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Type a message…');
    fireEvent.keyDown(textarea, { key: 'Enter' });
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('   ');
  });

  it('leaves Shift+Enter to the browser (newline insertion) and never sends it', () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Type a message…');
    fireEvent.change(textarea, { target: { value: 'first line' } });
    // The suite has no user-event dependency; the contract that is ours is
    // the keydown one: Shift+Enter must NOT be intercepted (dispatchEvent
    // returns true when the default action survives) so the browser inserts
    // the newline — emulated below with a native change event.
    const shiftEnterAllowed = fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(shiftEnterAllowed).toBe(true);
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.change(textarea, { target: { value: 'first line\nsecond line' } });
    const plainEnterAllowed = fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(plainEnterAllowed).toBe(false); // the send path intercepts plain Enter
    expect(onSend).toHaveBeenCalledWith('first line\nsecond line');
  });

  it('does not send the Enter that commits an IME composition (Chrome/Firefox)', () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Type a message…');
    fireEvent.change(textarea, { target: { value: 'おはよう' } });
    fireEvent.compositionStart(textarea);
    // The committing keydown while composing: isComposing true, keyCode 229.
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.compositionEnd(textarea);
    // The next plain Enter really sends the committed text.
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13 });
    expect(onSend).toHaveBeenCalledWith('おはよう');
  });

  it('does not send the Safari committing Enter, where compositionend precedes keydown', () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Type a message…');
    fireEvent.change(textarea, { target: { value: 'こんにちは' } });
    fireEvent.compositionStart(textarea);
    // Safari (WebKit bug 165004): the composition is committed before the
    // final keydown is dispatched, so that keydown reports isComposing
    // false — only the legacy IME keyCode 229 still marks it.
    fireEvent.compositionEnd(textarea);
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
    expect(onSend).not.toHaveBeenCalled();
    // The next genuine Enter sends the committed draft.
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13 });
    expect(onSend).toHaveBeenCalledWith('こんにちは');
  });

  it('still notifies consumers of keydown and composition lifecycle events', () => {
    const onKeyDown = vi.fn();
    const onCompositionStart = vi.fn();
    const onCompositionEnd = vi.fn();
    render(
      <ChatComposer
        onKeyDown={onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      />,
    );
    const textarea = screen.getByPlaceholderText('Type a message…');
    fireEvent.keyDown(textarea, { key: 'Enter' });
    fireEvent.compositionStart(textarea);
    fireEvent.compositionEnd(textarea);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onCompositionStart).toHaveBeenCalledTimes(1);
    expect(onCompositionEnd).toHaveBeenCalledTimes(1);
  });

  it('supports controlled value/onChange — the consumer owns the draft and the clearing', () => {
    const onChange = vi.fn();
    const onSend = vi.fn();
    const { rerender } = render(<ChatComposer value="draft" onChange={onChange} onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Type a message…');
    expect(textarea).toHaveValue('draft');
    fireEvent.change(textarea, { target: { value: 'draft two' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue('draft'); // unchanged until the consumer re-renders
    rerender(<ChatComposer value="draft two" onChange={onChange} onSend={onSend} />);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('draft two');
    expect(textarea).toHaveValue('draft two'); // not cleared internally
  });

  it('auto-grows with the draft and shrinks back after a send', () => {
    const onSend = vi.fn();
    let contentHeight = 24;
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Type a message…');
    // jsdom has no layout: the observable contract here is that the inline
    // height tracks the content height (scrollHeight) on every draft change;
    // the pixel-level growth against max-h-40 is verified in a browser.
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      get: () => contentHeight,
    });
    contentHeight = 96; // a three-line draft
    fireEvent.change(textarea, { target: { value: 'one\ntwo\nthree' } });
    expect(textarea.style.height).toBe('96px');
    contentHeight = 24; // the send clears the draft
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13 });
    expect(onSend).toHaveBeenCalledWith('one\ntwo\nthree');
    expect(textarea.style.height).toBe('24px');
  });

  it('sends via the labeled send button', () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const send = screen.getByRole('button', { name: /send message/i });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('Type a message…'), { target: { value: 'hi' } });
    expect(send).toBeEnabled();
    fireEvent.click(send);
    expect(onSend).toHaveBeenCalledWith('hi');
  });

  it('renders the actions slot next to the send button', () => {
    render(<ChatComposer actions={<button type="button">Attach</button>} />);
    const slot = screen.getByRole('button', { name: 'Attach' }).parentElement;
    expect(slot).toHaveAttribute('data-slot', 'chat-composer-actions');
  });

  it('does not send when disabled', () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} disabled />);
    const textarea = screen.getByPlaceholderText('Type a message…');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });
});
