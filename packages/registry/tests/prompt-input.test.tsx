import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PromptInput } from '../src/ui/prompt-input';

const COMMANDS = [
  { name: 'doc', prompt: 'Draft documentation for ' },
  { name: 'deploy', prompt: 'Deploy the app to ' },
  { name: 'image', prompt: 'Generate an image of ' },
];

const MENTIONS = ['alice', 'amir', 'bob'];

// Same contract as the chat-shell suite: every surface is themed by tokens
// (bg-*, text-*, border-* referencing CSS variables), never by a hardcoded
// palette step — that is what keeps dark and light in parity.
const HARDCODED_COLOR_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|caret|decoration|from|via|to|accent)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;

describe('PromptInput', () => {
  it('renders the textarea inside a data-slot root, merging className last and forwarding props', () => {
    render(<PromptInput data-testid="pi" className="mt-2" placeholder="Custom prompt" />);
    const root = screen.getByTestId('pi');
    expect(root).toHaveAttribute('data-slot', 'prompt-input');
    expect(root).toHaveClass('mt-2');
    expect(root).toHaveClass('rounded-xl');
    expect(screen.getByRole('combobox', { name: 'Custom prompt' })).toHaveAttribute(
      'data-slot',
      'prompt-input-textarea',
    );
  });

  it('keeps the draft internally in uncontrolled mode and reports every change via onValueChange', () => {
    const onValueChange = vi.fn();
    render(<PromptInput onValueChange={onValueChange} />);
    const textarea = screen.getByRole('combobox');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    expect(textarea).toHaveValue('hello');
    expect(onValueChange).toHaveBeenCalledWith('hello');
  });

  it('supports controlled drafts — the consumer owns the value end to end', () => {
    const onValueChange = vi.fn();
    const onSend = vi.fn();
    const { rerender } = render(
      <PromptInput value="draft" onValueChange={onValueChange} onSend={onSend} />,
    );
    const textarea = screen.getByRole('combobox');
    expect(textarea).toHaveValue('draft');
    fireEvent.change(textarea, { target: { value: 'draft two' } });
    expect(onValueChange).toHaveBeenCalledWith('draft two');
    expect(textarea).toHaveValue('draft'); // unchanged until the consumer re-renders
    rerender(<PromptInput value="draft two" onValueChange={onValueChange} onSend={onSend} />);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('draft two');
    expect(textarea).toHaveValue('draft two'); // never cleared internally when controlled
  });

  it('sends on Enter and clears the draft, but rejects empty and whitespace-only sends', () => {
    const onSend = vi.fn();
    const { unmount } = render(<PromptInput onSend={onSend} />);
    const textarea = screen.getByRole('combobox');
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    unmount();

    render(<PromptInput onSend={onSend} />);
    const second = screen.getByRole('combobox');
    fireEvent.change(second, { target: { value: 'hello' } });
    expect(screen.getByRole('button', { name: 'Send prompt' })).toBeEnabled();
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('hello');
    expect(second).toHaveValue('');
  });

  it('never sends on Shift+Enter and leaves the newline insertion to the browser', () => {
    const onSend = vi.fn();
    render(<PromptInput onSend={onSend} />);
    const textarea = screen.getByRole('combobox');
    fireEvent.change(textarea, { target: { value: 'first line' } });
    const defaultAllowed = fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(defaultAllowed).toBe(true); // default action survives → browser inserts the newline
    expect(onSend).not.toHaveBeenCalled();
  });

  it('opens a filtered slash-command hint row as the user types "/"', () => {
    render(<PromptInput commands={COMMANDS} />);
    const textarea = screen.getByRole('combobox');
    fireEvent.change(textarea, { target: { value: '/' } });
    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /doc/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /deploy/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /image/i })).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: '/d' } });
    expect(screen.getByRole('option', { name: /doc/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /deploy/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /image/i })).not.toBeInTheDocument();
  });

  it('accepts a slash command by click or Enter — filling the prompt without sending', () => {
    const onSend = vi.fn();
    const onValueChange = vi.fn();
    const { unmount } = render(
      <PromptInput commands={COMMANDS} onSend={onSend} onValueChange={onValueChange} />,
    );
    const textarea = screen.getByRole('combobox');
    fireEvent.change(textarea, { target: { value: '/de' } });
    fireEvent.click(screen.getByRole('option', { name: /deploy/i }));
    expect(textarea).toHaveValue('Deploy the app to ');
    expect(onValueChange).toHaveBeenCalledWith('Deploy the app to ');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    unmount();

    render(<PromptInput commands={COMMANDS} onSend={onSend} />);
    const second = screen.getByRole('combobox');
    fireEvent.change(second, { target: { value: '/de' } });
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect(second).toHaveValue('Deploy the app to ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('dismisses the hint row on Escape and reopens only when the text changes again', () => {
    render(<PromptInput commands={COMMANDS} />);
    const textarea = screen.getByRole('combobox');
    textarea.focus(); // simulate the typing user — jsdom does not focus on change
    fireEvent.change(textarea, { target: { value: '/d' } });
    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(textarea).toHaveFocus(); // dismissal never moves focus
    fireEvent.change(textarea, { target: { value: '/de' } });
    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();
  });

  it('does not send the Enter that commits an IME composition, on Chrome-style or Safari-style engines', () => {
    const onSend = vi.fn();
    render(<PromptInput onSend={onSend} />);
    const textarea = screen.getByRole('combobox');
    fireEvent.change(textarea, { target: { value: 'おはよう' } });
    fireEvent.compositionStart(textarea);
    // Chrome/Firefox: the committing keydown reports isComposing (keyCode 229).
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
    expect(onSend).not.toHaveBeenCalled();
    // Safari (WebKit bug 165004): compositionend fires BEFORE the committing
    // keydown — the legacy keyCode 229 is the only marker on that path.
    fireEvent.compositionEnd(textarea);
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
    expect(onSend).not.toHaveBeenCalled();
    // The next genuine Enter sends the committed draft.
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13 });
    expect(onSend).toHaveBeenCalledWith('おはよう');
  });

  it('leaves Escape to the IME while a composition is active — the hint row stays open', () => {
    render(<PromptInput commands={COMMANDS} />);
    const textarea = screen.getByRole('combobox');
    fireEvent.change(textarea, { target: { value: '/d' } });
    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();
    fireEvent.compositionStart(textarea);
    // Japanese/Chinese/Korean IME: Escape cancels the candidate window — the
    // composer must not swallow it, so the suggestion row stays put.
    fireEvent.keyDown(textarea, { key: 'Escape', keyCode: 229 });
    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();
    fireEvent.compositionEnd(textarea);
    // Once the composition has ended, Escape dismisses the row again.
    fireEvent.keyDown(textarea, { key: 'Escape', keyCode: 27 });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('returns focus to the textarea after a suggestion is accepted by click', () => {
    render(<PromptInput commands={COMMANDS} />);
    const textarea = screen.getByRole('combobox');
    fireEvent.change(textarea, { target: { value: '/de' } });
    const option = screen.getByRole('option', { name: /deploy/i });
    option.focus(); // browsers move focus to the clicked button before it unmounts
    expect(option).toHaveFocus();
    fireEvent.click(option);
    expect(textarea).toHaveValue('Deploy the app to ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(textarea).toHaveFocus(); // focus must not fall to <body>
  });

  it('renders a chat/agent/search mode toggle and reports changes', () => {
    const onModeChange = vi.fn();
    const { rerender } = render(<PromptInput onModeChange={onModeChange} />);
    const group = screen.getByRole('group', { name: 'Mode' });
    expect(group).toHaveAttribute('data-slot', 'prompt-input-mode-selector');
    const chat = screen.getByRole('button', { name: 'chat' });
    expect(chat).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'agent' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'agent' }));
    expect(onModeChange).toHaveBeenCalledWith('agent');
    rerender(<PromptInput mode="agent" onModeChange={onModeChange} />);
    expect(screen.getByRole('button', { name: 'agent' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the model chip only when one is provided', () => {
    const { rerender, container } = render(<PromptInput modelChip="orion-large" />);
    expect(screen.getByText('orion-large')).toHaveAttribute('data-slot', 'prompt-input-model-chip');
    rerender(<PromptInput />);
    // Queried through the component's data-slot hook (it renders no
    // data-testid) — unlike a queryByTestId against data-slot, this fails if
    // the chip ever renders unconditionally.
    expect(
      container.querySelector('[data-slot="prompt-input-model-chip"]'),
    ).not.toBeInTheDocument();
  });

  it('filters mention candidates on "@" and highlights inserted mentions as chips', () => {
    render(<PromptInput mentions={MENTIONS} />);
    const textarea = screen.getByRole('combobox');
    fireEvent.change(textarea, { target: { value: 'ping @a' } });
    expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /@alice/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /@amir/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /@bob/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /@alice/ }));
    expect(textarea).toHaveValue('ping @alice ');
    const chip = screen.getByText('@alice');
    expect(chip).toHaveAttribute('data-slot', 'prompt-input-mention');
  });

  it('auto-grows with the draft (height tracks content, capped by CSS)', () => {
    render(<PromptInput />);
    const textarea = screen.getByRole('combobox') as HTMLTextAreaElement;
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, get: () => 96 });
    fireEvent.change(textarea, { target: { value: 'one\ntwo\nthree' } });
    expect(textarea.style.height).toBe('96px');
  });

  it('renders every surface with theme tokens only (dark/light parity)', () => {
    document.documentElement.classList.add('dark');
    try {
      render(
        <PromptInput
          commands={COMMANDS}
          mentions={MENTIONS}
          modelChip="orion-large"
          mode="agent"
          value="hi @alice /d"
        />,
      );
      // Popup (mention/command row), chips and selector are all mounted here.
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
