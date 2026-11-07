'use client';

import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * A thread as rendered by {@link ThreadList}. `updatedAt` accepts anything
 * `Date` understands (ISO string, epoch number, `Date`) and drives the
 * pinned-first / most-recent-first ordering; threads without one sort last.
 */
export interface ThreadListThread {
  id: string;
  title: string;
  /** Secondary line under the title (last message snippet, status, …). */
  preview?: string;
  /** Renders the unread badge when true. */
  unread?: boolean;
  /** Pinned threads sort before unpinned ones. */
  pinned?: boolean;
  updatedAt?: string | number | Date;
}

const ThreadListContext = React.createContext<{
  query: string;
  setQuery: (query: string) => void;
} | null>(null);

/** Coerces any supported `updatedAt` value to a comparable timestamp (0 when missing/invalid). */
function threadUpdatedAt(thread: ThreadListThread): number {
  const value = thread.updatedAt;
  if (value == null) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Pin icon — filled when the thread is pinned, outline otherwise.
 */
function ThreadListPinIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      data-slot="thread-list-icon-pin"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
    </svg>
  );
}

/**
 * Trash icon for the delete action.
 */
function ThreadListTrashIcon() {
  return (
    <svg
      data-slot="thread-list-icon-trash"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/**
 * Magnifier icon for the search field.
 */
function ThreadListSearchIcon() {
  return (
    <svg
      data-slot="thread-list-icon-search"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/**
 * Orion Thread List — conversation sidebar with search, pins, inline rename,
 * unread states and thread actions.
 *
 * Data-driven: pass `threads` and callbacks; the list sorts pinned threads
 * first, then by `updatedAt` descending. Place a {@link ThreadListSearch}
 * anywhere inside to filter by title. The active thread is highlighted via
 * `activeId` (announced with `aria-current`).
 *
 * Per-item actions: click the row to select, double-click the title to rename
 * inline (Enter/blur commits, Escape cancels), pin and delete buttons carry
 * `aria-label`s — delete asks `window.confirm` before firing `onDelete`.
 *
 * @example
 * <ThreadList
 *   threads={threads}
 *   activeId={activeId}
 *   onSelect={setActiveId}
 *   onPinToggle={(id) => togglePin(id)}
 *   onRename={(id, title) => renameThread(id, title)}
 *   onDelete={(id) => deleteThread(id)}
 * >
 *   <ThreadListSearch />
 * </ThreadList>
 */
function ThreadList({
  threads,
  activeId,
  onSelect,
  onPinToggle,
  onRename,
  onDelete,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  /** Threads to render — sorted pinned-first, then most recently updated. */
  threads: ThreadListThread[];
  /** Id of the current thread; its row gets `data-active` + `aria-current="true"`. */
  activeId?: string;
  /** Row click (the title area) — open/switch to a thread. */
  onSelect?: (id: string) => void;
  /** Pin button on each row. */
  onPinToggle?: (id: string) => void;
  /** Inline rename commit (double-click a title, edit, Enter or blur). */
  onRename?: (id: string, title: string) => void;
  /** Delete button on each row, fired only after the confirm dialog is accepted. */
  onDelete?: (id: string) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');

  const context = React.useMemo(() => ({ query, setQuery }), [query]);

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? threads.filter((thread) => thread.title.toLowerCase().includes(needle))
      : threads;
    return [...filtered].sort((a, b) => {
      const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinDiff !== 0) return pinDiff;
      return threadUpdatedAt(b) - threadUpdatedAt(a);
    });
  }, [threads, query]);

  const startRename = (thread: ThreadListThread) => {
    setRenamingId(thread.id);
    setDraft(thread.title);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setDraft('');
  };

  const commitRename = (thread: ThreadListThread) => {
    const title = draft.trim();
    if (title && title !== thread.title) onRename?.(thread.id, title);
    cancelRename();
  };

  const handleDelete = (thread: ThreadListThread) => {
    if (window.confirm(`Delete "${thread.title}"?`)) onDelete?.(thread.id);
  };

  return (
    <div
      data-slot="thread-list"
      className={cn('flex flex-col gap-2 text-foreground', className)}
      {...props}
    >
      <ThreadListContext.Provider value={context}>
        {children}
        <ul data-slot="thread-list-items" className="flex flex-col gap-0.5">
          {visible.map((thread) => {
            const isActive = thread.id === activeId;
            const isRenaming = thread.id === renamingId;
            return (
              <li
                key={thread.id}
                data-slot="thread-list-item"
                data-active={isActive ? 'true' : undefined}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'group flex items-center gap-1 rounded-lg p-1 transition-colors',
                  'hover:bg-accent/60 focus-within:bg-accent/60',
                  'data-[active=true]:bg-accent data-[active=true]:text-accent-foreground',
                )}
              >
                {isRenaming ? (
                  <input
                    data-slot="thread-list-rename-input"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      // IME guard: while a composition is active
                      // (`isComposing`, or the legacy IME keyCode 229) Enter
                      // commits the composition text and Escape cancels it —
                      // neither may commit or cancel the rename.
                      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
                        return;
                      }
                      if (event.key === 'Enter') commitRename(thread);
                      if (event.key === 'Escape') cancelRename();
                    }}
                    onBlur={() => commitRename(thread)}
                    onFocus={(event) => event.currentTarget.select()}
                    // Mount-guarded focus: the input exists only after the user's double-click, so moving focus into it is the requested action (not a page-load hijack).
                    ref={(node) => {
                      if (node && document.activeElement !== node) node.focus();
                    }}
                    aria-label={`Rename ${thread.title}`}
                    className={cn(
                      'h-8 w-full min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none',
                      'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    )}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      data-slot="thread-list-open"
                      onClick={() => onSelect?.(thread.id)}
                      onDoubleClick={() => startRename(thread)}
                      className={cn(
                        'flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-1 text-left outline-none',
                        'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      )}
                    >
                      <span
                        data-slot="thread-list-title"
                        className="w-full truncate text-sm font-medium"
                      >
                        {thread.title}
                      </span>
                      {thread.preview ? (
                        <span
                          data-slot="thread-list-preview"
                          className="w-full truncate text-xs text-muted-foreground"
                        >
                          {thread.preview}
                        </span>
                      ) : null}
                    </button>
                    {thread.unread ? (
                      <span
                        data-slot="thread-list-unread"
                        className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      >
                        Unread
                      </span>
                    ) : null}
                    <button
                      type="button"
                      data-slot="thread-list-pin"
                      aria-pressed={Boolean(thread.pinned)}
                      aria-label={thread.pinned ? `Unpin ${thread.title}` : `Pin ${thread.title}`}
                      onClick={() => onPinToggle?.(thread.id)}
                      className={cn(
                        'inline-flex size-7 shrink-0 items-center justify-center rounded-md outline-none transition-colors',
                        'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        thread.pinned
                          ? 'text-primary hover:bg-accent'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <ThreadListPinIcon filled={Boolean(thread.pinned)} />
                    </button>
                    <button
                      type="button"
                      data-slot="thread-list-delete"
                      aria-label={`Delete ${thread.title}`}
                      onClick={() => handleDelete(thread)}
                      className={cn(
                        'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors',
                        'hover:bg-accent hover:text-destructive focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      )}
                    >
                      <ThreadListTrashIcon />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {visible.length === 0 ? (
          <div
            data-slot="thread-list-empty"
            role="status"
            className="rounded-md px-2 py-3 text-center text-sm text-muted-foreground"
          >
            No threads found.
          </div>
        ) : null}
      </ThreadListContext.Provider>
    </div>
  );
}

/**
 * Search field for {@link ThreadList} — filters the visible threads by title,
 * case-insensitively. Must be rendered inside a `<ThreadList>`; the query
 * state is owned by the list.
 *
 * `className` styles the field wrapper; every other prop forwards to the
 * native `<input>`.
 *
 * @example
 * <ThreadList threads={threads}>
 *   <ThreadListSearch />
 * </ThreadList>
 */
function ThreadListSearch({ className, ...props }: React.ComponentProps<'input'>) {
  const context = React.useContext(ThreadListContext);
  if (!context) {
    throw new Error('ThreadListSearch must be rendered inside <ThreadList>.');
  }
  return (
    <div data-slot="thread-list-search" className={cn('relative flex items-center', className)}>
      <span
        data-slot="thread-list-search-icon"
        className="pointer-events-none absolute left-2.5 text-muted-foreground"
      >
        <ThreadListSearchIcon />
      </span>
      <input
        data-slot="thread-list-search-input"
        type="search"
        placeholder="Search threads…"
        aria-label="Search threads"
        {...props}
        value={context.query}
        onChange={(event) => context.setQuery(event.target.value)}
        className={cn(
          'h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none',
          'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        )}
      />
    </div>
  );
}

export { ThreadList, ThreadListSearch };
