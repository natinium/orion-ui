'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * How close (px) to the bottom the log must sit for pin-to-bottom to stay
 * engaged — past this the reader has scrolled up to reread and must not be
 * yanked back down on the next render.
 */
const PIN_THRESHOLD_PX = 80;

/**
 * A conversation entry in the thread sidebar. `unread` is the number of
 * unseen messages — the badge only renders when it is greater than zero,
 * with or without a `preview`.
 */
export interface ChatThread {
  id: string;
  title: string;
  preview?: string;
  unread?: number;
  timestamp?: string | Date;
}

/** Which side of the conversation a message sits on. Drives `data-role`. */
export type ChatMessageRole = 'user' | 'assistant';

/**
 * Pads a number to two digits (native Date math — no date dependency).
 */
function pad2(value: number) {
  return String(value).padStart(2, '0');
}

/**
 * Formats a timestamp for display. Native Date math only:
 * - bare "HH:mm" strings pass through untouched (static previews),
 * - timestamps from today render as local "HH:mm",
 * - anything else renders as a short date ("Nov 7"),
 * - invalid values render as an empty string (element is omitted).
 */
function formatChatTimestamp(value: string | Date): string {
  if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) return value;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Builds a valid `dateTime` attribute for `<time>` from the same inputs.
 */
function toDateTimeAttribute(value: string | Date): string {
  if (typeof value === 'string') return value;
  return Number.isNaN(value.getTime()) ? '' : value.toISOString();
}

/**
 * The blinking caret shown at the end of a streaming response. Decorative —
 * the log is marked `aria-busy` while tokens arrive, so screen readers do
 * not re-announce the growing message per chunk; the completed message is
 * announced once when the stream ends.
 */
function StreamingCursor() {
  return (
    <span
      data-slot="chat-streaming-cursor"
      aria-hidden="true"
      className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse rounded-full bg-current align-text-bottom motion-reduce:animate-none"
    />
  );
}

/**
 * Class generator for the ChatShell layout — exported so consumers can
 * compose shell-styled custom containers. Variants map 1:1 to the docs:
 * - `classic`: one centered column,
 * - `workspace`: thread sidebar + chat pane on a two-column grid — below
 *   the `md` breakpoint the sidebar hides and the pane takes the full
 *   width, so pair the shell with your own mobile thread switcher,
 * - `focus`: immersive — the sidebar is chrome, revealed on hover/keyboard
 *   and pointer-transparent while hidden.
 */
const chatShellVariants = cva('flex h-full min-h-0 w-full flex-col bg-background text-foreground', {
  variants: {
    variant: {
      classic: 'mx-auto max-w-3xl',
      workspace:
        'grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-input max-md:[&>[data-slot=chat-thread-list]]:hidden [&>*:not([data-slot=chat-thread-list])]:col-start-2 [&>[data-slot=chat-thread-list]]:col-start-1 [&>[data-slot=chat-thread-list]]:row-span-2 [&>[data-slot=chat-thread-list]]:row-start-1',
      focus:
        'relative overflow-hidden [&:focus-within>[data-slot=chat-thread-list]]:opacity-100 [&:focus-within>[data-slot=chat-thread-list]]:pointer-events-auto [&:hover>[data-slot=chat-thread-list]]:opacity-100 [&:hover>[data-slot=chat-thread-list]]:pointer-events-auto [&>[data-slot=chat-thread-list]]:pointer-events-none [&>[data-slot=chat-thread-list]]:absolute [&>[data-slot=chat-thread-list]]:inset-y-0 [&>[data-slot=chat-thread-list]]:left-0 [&>[data-slot=chat-thread-list]]:z-20 [&>[data-slot=chat-thread-list]]:opacity-0 [&>[data-slot=chat-thread-list]]:shadow-xl [&>[data-slot=chat-thread-list]]:transition-opacity [&>[data-slot=chat-thread-list]]:duration-200',
    },
  },
  defaultVariants: {
    variant: 'classic',
  },
});

/**
 * ChatShell — the full-page layout grid for an AI chat.
 *
 * Presentational only: the consumer owns threads, messages and sending.
 * Place a `ChatThreadList` (optional) plus a `ChatMessageList` and a
 * `ChatComposer` as direct children — in the `workspace` variant the
 * sidebar is placed in column 1 and everything else in column 2, on a
 * `1fr / auto` row pair so the composer docks below the scrolling log.
 * Below the `md` breakpoint the sidebar hides and the chat pane takes the
 * full width (the empty column 1 track collapses to zero), so narrow
 * viewports need a consumer-provided mobile thread switcher instead of a
 * squeezed two-column grid.
 * In the `focus` variant the sidebar overlays the pane as chrome and is
 * revealed on hover or keyboard focus (`:focus-within`); while hidden it
 * is `pointer-events: none`, so taps and clicks pass through to the pane
 * and never activate invisible thread buttons. It stays fully reachable
 * by keyboard.
 *
 * @example
 * <ChatShell variant="workspace" className="h-dvh">
 *   <ChatThreadList threads={threads} activeId={activeId} onSelect={setActiveId} />
 *   <ChatMessageList>{messages}</ChatMessageList>
 *   <ChatComposer onSend={handleSend} />
 * </ChatShell>
 */
function ChatShell({
  variant = 'classic',
  className,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof chatShellVariants>) {
  return (
    <div
      data-slot="chat-shell"
      data-variant={variant}
      className={cn(chatShellVariants({ variant, className }))}
      {...props}
    />
  );
}

/**
 * ChatThreadItem — one thread row: title, preview, unread badge, timestamp.
 * A native `<button>` (keyboard operable), marked with `aria-current` and
 * `data-active` when it is the active thread.
 */
function ChatThreadItem({
  id,
  title,
  preview,
  unread = 0,
  active = false,
  timestamp,
  onSelect,
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'onSelect'> & {
  /** Thread id — echoed back through `onSelect`. */
  id: string;
  title: string;
  preview?: string;
  /** Unseen-message count; the badge renders only when > 0. */
  unread?: number;
  /** Marks the row as the current thread (`aria-current` + `data-active`). */
  active?: boolean;
  timestamp?: string | Date;
  onSelect?: (id: string) => void;
}) {
  const time = timestamp ? formatChatTimestamp(timestamp) : '';
  return (
    <button
      type="button"
      data-slot="chat-thread-item"
      data-active={active ? 'true' : undefined}
      aria-current={active ? 'true' : undefined}
      onClick={() => onSelect?.(id)}
      className={cn(
        'flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground',
        className,
      )}
      {...props}
    >
      <span className="flex items-center justify-between gap-2">
        <span data-slot="chat-thread-item-title" className="truncate font-medium">
          {title}
        </span>
        {time && (
          <time
            data-slot="chat-thread-item-time"
            dateTime={timestamp ? toDateTimeAttribute(timestamp) : undefined}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {time}
          </time>
        )}
      </span>
      {(preview || unread > 0) && (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {preview && <span className="truncate">{preview}</span>}
          {unread > 0 && (
            <>
              <span
                data-slot="chat-thread-item-unread"
                className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-medium leading-none text-primary-foreground"
              >
                {unread}
              </span>
              <span className="sr-only">unread</span>
            </>
          )}
        </span>
      )}
    </button>
  );
}

/**
 * ChatThreadList — the thread sidebar. A labeled `<nav>` of thread
 * buttons; `activeId` drives the active state and `onSelect` receives
 * the clicked thread's id. In `workspace` it occupies grid column 1; in
 * `focus` it renders as revealed chrome (see `ChatShell`).
 */
function ChatThreadList({
  threads,
  activeId,
  onSelect,
  label = 'Chat threads',
  className,
  ...props
}: Omit<React.ComponentProps<'nav'>, 'onSelect'> & {
  threads: ChatThread[];
  /** Id of the currently active thread. */
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Accessible name of the navigation region. */
  label?: string;
}) {
  return (
    <nav
      data-slot="chat-thread-list"
      aria-label={label}
      className={cn(
        'flex w-72 max-w-full shrink-0 flex-col overflow-hidden border-r bg-background',
        className,
      )}
      {...props}
    >
      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {threads.map((thread) => (
          <li key={thread.id}>
            <ChatThreadItem
              id={thread.id}
              title={thread.title}
              preview={thread.preview}
              unread={thread.unread}
              timestamp={thread.timestamp}
              active={thread.id === activeId}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * ChatMessageList — the scrolling conversation log. A keyboard-focusable
 * `role="log"` region with `aria-live="polite"`: new messages are announced
 * without stealing focus. While `streaming`, the log is marked `aria-busy`
 * so screen readers defer announcements instead of re-reading the growing
 * message on every token chunk; the completed message lands as a single
 * announcement when the stream ends.
 *
 * The view follows the latest content only while the reader is already at
 * (or within `PIN_THRESHOLD_PX` of) the bottom — once they scroll up to
 * reread, re-renders (streaming included) never yank the scroll position
 * until they return to the bottom. Compose `ChatMessage` children; pass
 * `streaming` to append the streaming cursor after the last child while a
 * response is being generated.
 */
function ChatMessageList({
  streaming = false,
  onScroll,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  /** Appends the streaming cursor after the message content. */
  streaming?: boolean;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);
  // Starts true so the first render pins to the latest content; the scroll
  // handler then tracks whether the reader is still near the bottom.
  const pinnedRef = React.useRef(true);

  React.useEffect(() => {
    const el = listRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  });

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= PIN_THRESHOLD_PX;
  };

  return (
    <div
      ref={listRef}
      data-slot="chat-message-list"
      role="log"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-focusable (WCAG 2.1.1, axe scrollable-region-focusable)
      tabIndex={0}
      aria-live="polite"
      aria-busy={streaming || undefined}
      aria-label="Messages"
      onScroll={(event) => {
        handleScroll();
        onScroll?.(event);
      }}
      className={cn('min-h-0 flex-1 overflow-y-auto p-4', className)}
      {...props}
    >
      <div className="flex flex-col gap-4">
        {children}
        {streaming && <StreamingCursor />}
      </div>
    </div>
  );
}

/**
 * ChatMessage — one message row: avatar initial, author, timestamp and
 * content children. Exposes the conversation side via `data-role`
 * (`user` messages align right on a primary bubble, `assistant` messages
 * sit left on a muted bubble). The prop is named `sender` — a `role` prop
 * would trip Biome's `useValidAriaRole` at every consumer call site.
 * Pass `streaming` to show the cursor at the end of this message's content.
 */
function ChatMessage({
  sender,
  author,
  avatarInitial,
  timestamp,
  streaming = false,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  /** Conversation side — rendered as `data-role` and drives alignment. */
  sender: ChatMessageRole;
  /** Display name of the author. */
  author: string;
  /** Avatar letter; defaults to the first character of `author`. */
  avatarInitial?: string;
  timestamp?: string | Date;
  /** Appends the streaming cursor after the content. */
  streaming?: boolean;
}) {
  const initial = avatarInitial ?? author.charAt(0).toUpperCase();
  const time = timestamp ? formatChatTimestamp(timestamp) : '';
  return (
    <div
      data-slot="chat-message"
      data-role={sender}
      className={cn('flex gap-2.5', sender === 'user' && 'flex-row-reverse', className)}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="chat-message-avatar"
        className={cn(
          'flex size-8 shrink-0 select-none items-center justify-center rounded-full text-xs font-medium',
          sender === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground',
        )}
      >
        {initial}
      </span>
      <div data-slot="chat-message-body" className="flex min-w-0 max-w-[75%] flex-col gap-1">
        <div
          data-slot="chat-message-meta"
          className={cn(
            'flex items-baseline gap-2 text-xs text-muted-foreground',
            sender === 'user' && 'flex-row-reverse',
          )}
        >
          <span data-slot="chat-message-author" className="font-medium text-foreground">
            {author}
          </span>
          {time && (
            <time
              data-slot="chat-message-time"
              dateTime={timestamp ? toDateTimeAttribute(timestamp) : undefined}
            >
              {time}
            </time>
          )}
        </div>
        <div
          data-slot="chat-message-content"
          className={cn(
            'w-fit whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm',
            sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          {children}
          {streaming && <StreamingCursor />}
        </div>
      </div>
    </div>
  );
}

/**
 * ChatComposer — the composer dock: auto-labeled textarea, actions slot
 * and a labeled send button. Plain Enter sends (never inserts a newline),
 * Shift+Enter inserts a newline, and IME composition is respected on every
 * engine: committing Enters are skipped when `isComposing` is set
 * (Chrome/Firefox) and via the legacy IME `keyCode` 229 plus tracked
 * composition state on Safari, which fires `compositionend` before the
 * committing keydown (WebKit bug 165004). The textarea auto-grows with the
 * draft up to `max-h-40` and scrolls inside that cap. The composer owns
 * its draft state (or is controlled via `value`/`onChange`) and clears
 * itself after a send — the consumer persists the message via `onSend`.
 * The send button is disabled while the draft is blank.
 */
function ChatComposer({
  onSend,
  actions,
  sendLabel = 'Send message',
  placeholder = 'Type a message…',
  value: valueProp,
  defaultValue,
  disabled = false,
  onChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  className,
  ...props
}: Omit<React.ComponentProps<'textarea'>, 'value' | 'defaultValue'> & {
  /** Controlled draft text; omit for internal state. */
  value?: string;
  /** Initial draft for the uncontrolled mode. */
  defaultValue?: string;
  /** Called with the draft text on send (Enter or send button). */
  onSend?: (text: string) => void;
  /** Slot rendered between the textarea and the send button. */
  actions?: React.ReactNode;
  /** Accessible label of the icon-only send button. */
  sendLabel?: string;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
  const value = valueProp !== undefined ? valueProp : internalValue;
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const composingRef = React.useRef(false);

  const send = () => {
    if (disabled || !value.trim()) return;
    onSend?.(value);
    if (valueProp === undefined) setInternalValue('');
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

  return (
    <div
      data-slot="chat-composer"
      className={cn('flex flex-col border-t bg-background p-3', className)}
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          data-slot="chat-composer-textarea"
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => {
            if (valueProp === undefined) setInternalValue(event.target.value);
            onChange?.(event);
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
            if (event.key !== 'Enter' || event.shiftKey) return;
            // Safari commits the composition and fires `compositionend`
            // BEFORE the final keydown (WebKit bug 165004), so
            // `isComposing` is already false on the committing Enter — the
            // legacy IME keyCode 229 and the tracked composition state are
            // the only reliable signals on that path. Chrome and Firefox
            // report `isComposing` on the committing keydown itself.
            if (
              event.nativeEvent.isComposing ||
              event.nativeEvent.keyCode === 229 ||
              composingRef.current
            ) {
              return;
            }
            event.preventDefault();
            send();
          }}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <div className="flex items-center gap-1">
          {actions && (
            <div data-slot="chat-composer-actions" className="flex items-center gap-1">
              {actions}
            </div>
          )}
          <button
            type="button"
            data-slot="chat-composer-send"
            aria-label={sendLabel}
            disabled={disabled || !value.trim()}
            onClick={send}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4",
            )}
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
    </div>
  );
}

export {
  ChatComposer,
  ChatMessage,
  ChatMessageList,
  ChatShell,
  ChatThreadItem,
  ChatThreadList,
  chatShellVariants,
};
