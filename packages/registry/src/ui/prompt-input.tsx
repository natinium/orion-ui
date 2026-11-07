'use client';

import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * A slash command. `name` is the verb the user types after `/`; `prompt`
 * is the text that fills the composer when the command is accepted.
 */
export interface PromptCommand {
  name: string;
  prompt: string;
}

/** The working mode advertised by the built-in mode selector. */
export type PromptInputMode = 'chat' | 'agent' | 'search';

const MODES: PromptInputMode[] = ['chat', 'agent', 'search'];

/**
 * The trailing `/command` or `@mention` token the user is currently typing
 * (the last whitespace-delimited token, if it starts with `/` or `@`).
 */
function activeToken(value: string): { kind: 'command' | 'mention'; query: string } | null {
  const match = /(?:^|\s)([/@][^\s]*)$/.exec(value);
  if (!match) return null;
  const raw = match[1];
  return { kind: raw.startsWith('/') ? 'command' : 'mention', query: raw.slice(1) };
}

/**
 * Replaces the trailing `@mention` token with the accepted mention.
 */
function insertMention(value: string, mention: string): string {
  return value.replace(/@[^\s]*$/, `@${mention} `);
}

/**
 * PromptInput — the unified composer: auto-growing textarea, model chip,
 * chat/agent/search mode selector, slash commands, @mentions and a send
 * action. Children render as extra rows between the textarea and the
 * footer — compose `AttachmentStaging` there.
 *
 * Behavior:
 * - **Enter** sends (blank drafts are rejected — the button is disabled and
 *   a blank Enter is swallowed, never inserted as a newline);
 *   **Shift+Enter** is left to the browser and inserts a newline.
 * - **IME-safe** on every engine: committing Enters are skipped when
 *   `isComposing` is set (Chrome/Firefox) and via the legacy IME keyCode
 *   229 plus tracked composition state on Safari, which fires
 *   `compositionend` before the committing keydown (WebKit bug 165004).
 * - **Slash commands** (`commands` prop): typing `/` opens a filtered hint
 *   row of `{name, prompt}` matches; ArrowDown/ArrowUp move, Enter or a
 *   click accepts and fills the composer with the command's `prompt`.
 *   Escape dismisses until the text changes again.
 * - **@mentions** (`mentions` prop): typing `@` opens a filtered candidate
 *   row; accepting inserts `@name ` and detected mentions are highlighted
 *   as chips in the footer.
 * - **Draft restore**: pass `value` for a controlled composer the consumer
 *   owns (restored drafts survive thread switches), or omit it for an
 *   internal draft reported through `onValueChange`.
 *
 * The suggestion row renders inline (no portal), so the composer behaves
 * identically inside dialogs, sheets and shadow roots.
 *
 * @example
 * <PromptInput
 *   commands={[{ name: 'doc', prompt: 'Draft documentation for ' }]}
 *   mentions={['alice', 'bob']}
 *   modelChip="orion-large"
 *   onSend={(text) => run(text)}
 * />
 * @example
 * <PromptInput value={draft} onValueChange={setDraft} onSend={run}>
 *   <AttachmentStaging attachments={staged} onRemove={unstage} />
 * </PromptInput>
 */
function PromptInput({
  value: valueProp,
  onValueChange,
  onSend,
  commands,
  mentions,
  modelChip,
  mode: modeProp,
  onModeChange,
  placeholder = 'Ask anything…',
  disabled = false,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'onKeyDown' | 'onCompositionStart' | 'onCompositionEnd'> & {
  /** Controlled draft text; omit for internal state. */
  value?: string;
  /** Called with the draft text on every change (both modes). */
  onValueChange?: (text: string) => void;
  /** Called with the draft text on send (Enter or send button). */
  onSend?: (text: string) => void;
  /** Slash commands — typing `/` opens a filtered hint row. */
  commands?: PromptCommand[];
  /** Mentionable names — typing `@` opens a filtered hint row. */
  mentions?: string[];
  /** Optional model label rendered as a small chip in the footer. */
  modelChip?: string;
  /** Controlled working mode; omit for internal state (defaults to `chat`). */
  mode?: PromptInputMode;
  /** Called when the user picks a mode. */
  onModeChange?: (mode: PromptInputMode) => void;
  /** Placeholder and accessible label of the textarea. */
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onCompositionStart?: React.CompositionEventHandler<HTMLTextAreaElement>;
  onCompositionEnd?: React.CompositionEventHandler<HTMLTextAreaElement>;
}) {
  const [internalValue, setInternalValue] = React.useState('');
  const [internalMode, setInternalMode] = React.useState<PromptInputMode>('chat');
  const [dismissed, setDismissed] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const composingRef = React.useRef(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const listId = React.useId();

  const value = valueProp !== undefined ? valueProp : internalValue;
  const mode = modeProp !== undefined ? modeProp : internalMode;

  const setValue = (text: string) => {
    if (valueProp === undefined) setInternalValue(text);
    setDismissed(false);
    onValueChange?.(text);
  };

  const send = () => {
    if (disabled || !value.trim()) return;
    onSend?.(value);
    if (valueProp === undefined) setInternalValue('');
  };

  const token = activeToken(value);
  const suggestions = React.useMemo(() => {
    if (!token) return [];
    const query = token.query.toLowerCase();
    if (token.kind === 'command') {
      return (commands ?? [])
        .filter((command) => command.name.toLowerCase().startsWith(query))
        .map((command) => ({
          label: `/${command.name}`,
          name: command.name,
          prompt: command.prompt,
        }));
    }
    return (mentions ?? [])
      .filter((mention) => mention.toLowerCase().startsWith(query))
      .map((mention) => ({ label: `@${mention}`, name: mention, prompt: undefined }));
  }, [token, commands, mentions]);

  const popupOpen = !dismissed && suggestions.length > 0;
  const active = Math.min(activeIndex, Math.max(0, suggestions.length - 1));

  const acceptSuggestion = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    if (token?.kind === 'command') {
      setValue(suggestion.prompt ?? '');
    } else {
      setValue(insertMention(value, suggestion.name));
    }
    // Click-accept unmounts the focused option button and would drop focus to
    // <body>. Hand focus back to the textarea so typing continues (keyboard
    // accepts already run with the textarea focused — focus() is a no-op there).
    textareaRef.current?.focus();
  };

  // Auto-grow: measure the content at its natural height, then clamp to
  // `max-h-40` (the textarea scrolls inside the cap) and shrink again when
  // the draft is cleared or reset from outside.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the effect must re-run exactly when the draft (value) changes; it reads only the DOM
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const detectedMentions = React.useMemo(() => {
    if (!mentions?.length) return [];
    const used = new Set(value.match(/@([\w-]+)/g)?.map((raw) => raw.slice(1).toLowerCase()) ?? []);
    return mentions.filter((mention) => used.has(mention.toLowerCase()));
  }, [value, mentions]);

  return (
    <div
      data-slot="prompt-input"
      className={cn(
        'flex flex-col gap-1 rounded-xl border border-input bg-background p-2 transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        className,
      )}
      {...props}
    >
      <textarea
        ref={textareaRef}
        data-slot="prompt-input-textarea"
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={placeholder}
        // The textarea doubles as the combobox input while a filtered
        // suggestion listbox is open (the WAI-ARIA combobox pattern with
        // aria-activedescendant — the one cmdk/shadcn Command ships).
        role="combobox"
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-expanded={popupOpen || undefined}
        aria-controls={popupOpen ? listId : undefined}
        aria-activedescendant={popupOpen ? `${listId}-${active}` : undefined}
        onChange={(event) => {
          if (valueProp === undefined) setInternalValue(event.target.value);
          setDismissed(false);
          setActiveIndex(0);
          onValueChange?.(event.target.value);
        }}
        onCompositionStart={(event) => {
          composingRef.current = true;
          onCompositionStart?.(event);
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false;
          onCompositionEnd?.(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          // Safari commits the composition and fires `compositionend` BEFORE
          // the final keydown (WebKit bug 165004), so `isComposing` is already
          // false on the committing key — the legacy IME keyCode 229 and the
          // tracked composition state are the additional reliable signals on
          // that path. Chrome and Firefox report `isComposing` on the
          // committing keydown itself. Applies to Escape too: while the IME is
          // composing, Escape belongs to the IME (it cancels the candidate
          // window) and must never dismiss the suggestion row.
          const imeComposing =
            event.nativeEvent.isComposing ||
            event.nativeEvent.keyCode === 229 ||
            composingRef.current;
          if (popupOpen && event.key === 'Escape') {
            if (imeComposing) return;
            event.preventDefault();
            setDismissed(true);
            return;
          }
          if (popupOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            const count = suggestions.length;
            setActiveIndex((index) =>
              event.key === 'ArrowDown' ? (index + 1) % count : (index - 1 + count) % count,
            );
            return;
          }
          if (event.key !== 'Enter' || event.shiftKey) return;
          if (imeComposing) return;
          if (popupOpen) {
            event.preventDefault();
            acceptSuggestion(active);
            return;
          }
          event.preventDefault();
          send();
        }}
        className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      />
      {children}
      {popupOpen && (
        <div
          id={listId}
          role="listbox"
          data-slot="prompt-input-suggestions"
          aria-label={token?.kind === 'command' ? 'Slash commands' : 'Mentions'}
          className="max-h-40 overflow-y-auto rounded-lg border border-input bg-background p-1 shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.name}
              type="button"
              role="option"
              id={`${listId}-${index}`}
              tabIndex={-1}
              aria-selected={index === active}
              onClick={() => acceptSuggestion(index)}
              className={cn(
                'flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                index === active && 'bg-accent text-accent-foreground',
              )}
            >
              <span className="shrink-0 font-medium">{suggestion.label}</span>
              {suggestion.prompt && (
                <span className="truncate text-xs text-muted-foreground">{suggestion.prompt}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <div data-slot="prompt-input-footer" className="flex items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <fieldset
            data-slot="prompt-input-mode-selector"
            className="flex min-w-0 items-center gap-0.5 rounded-lg border-0 bg-muted p-0.5"
          >
            <legend className="sr-only">Mode</legend>
            {MODES.map((item) => (
              <button
                key={item}
                type="button"
                data-slot="prompt-input-mode"
                data-active={item === mode || undefined}
                aria-pressed={item === mode}
                disabled={disabled}
                onClick={() => {
                  if (modeProp === undefined) setInternalMode(item);
                  onModeChange?.(item);
                }}
                className="rounded-md px-2 py-1 text-xs capitalize text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:bg-background aria-pressed:text-foreground"
              >
                {item}
              </button>
            ))}
          </fieldset>
          {modelChip && (
            <span
              data-slot="prompt-input-model-chip"
              className="max-w-full shrink-0 truncate rounded-md border border-input bg-secondary px-2 py-1 text-xs text-secondary-foreground"
            >
              {modelChip}
            </span>
          )}
          {detectedMentions.length > 0 && (
            <div
              data-slot="prompt-input-mentions"
              className="flex min-w-0 flex-wrap items-center gap-1"
            >
              {detectedMentions.map((mention) => (
                <span
                  key={mention}
                  data-slot="prompt-input-mention"
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  @{mention}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          data-slot="prompt-input-send"
          aria-label="Send prompt"
          disabled={disabled || !value.trim()}
          onClick={send}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4"
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12 7-7 7 7" />
            <path d="M12 19V5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export { PromptInput };
