'use client';

import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * Left chevron for the previous branch. An inline SVG keeps the component
 * self-contained (no icon dependency, no registry imports).
 */
function ChevronLeftIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

/** Right chevron for the next branch. */
function ChevronRightIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/**
 * User-facing strings of the picker and editor, overridable for
 * localization via the `labels` prop. English defaults.
 */
export type MessageRevisionsLabels = {
  /** Edit button (visible text and `title`). */
  edit: string;
  /** Save button. */
  save: string;
  /** Cancel button. */
  cancel: string;
  /** Accessible name of the edit textarea (and the Edit button's `title`). */
  editMessage: string;
  /** Previous-branch button (icon-only, so this is its accessible name). */
  previousBranch: string;
  /** Next-branch button (icon-only, so this is its accessible name). */
  nextBranch: string;
};

const DEFAULT_LABELS: MessageRevisionsLabels = {
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  editMessage: 'Edit message',
  previousBranch: 'Previous branch',
  nextBranch: 'Next branch',
};

interface MessageRevisionsProps extends React.ComponentProps<'div'> {
  /**
   * The message text. Shown until the user saves a local edit — from then on
   * the local edit wins over later `content` changes.
   */
  content: string;
  /** Total number of regeneration branches. The picker renders at 2+. */
  total?: number;
  /**
   * 1-based **initial** active branch — navigation is internal afterwards.
   * Defaults to `total` (the latest regeneration).
   */
  index?: number;
  /**
   * Called with the 1-based branch index after navigation. Navigation clamps
   * at the bounds (1 and `total`) — the buttons disable there — it never wraps.
   */
  onBranchChange?: (index: number) => void;
  /** Called with the edited text when Save is activated. */
  onEdit?: (newText: string) => void;
  /** Overrides for the user-facing strings (English defaults). */
  labels?: Partial<MessageRevisionsLabels>;
}

/**
 * Message Revisions — the branch picker for regenerated answers (`‹ 2/3 ›`)
 * plus inline edit-and-resend of a sent message.
 *
 * Navigation is clamped, not wrapping: at the first branch "previous"
 * disables, at the last branch "next" disables. The picker only renders when
 * there is something to switch between (`total >= 2`).
 *
 * Editing swaps the message text for a textarea — focus moves into it, and
 * returns to the Edit button when editing ends. Save commits via `onEdit`
 * and echoes the new text in place; Escape or Cancel reverts and closes
 * without calling `onEdit`. User-facing strings are English by default and
 * overridable via the `labels` prop.
 *
 * @example
 * <MessageRevisions
 *   content="Deploy finished in 42s."
 *   total={3}
 *   onBranchChange={(branch) => loadBranch(branch)}
 *   onEdit={(text) => resend(text)}
 * />
 */
function MessageRevisions({
  content,
  total,
  index,
  onBranchChange,
  onEdit,
  labels,
  className,
  ...props
}: MessageRevisionsProps) {
  const [active, setActive] = React.useState(() => index ?? total ?? 1);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [edited, setEdited] = React.useState<string | null>(null);
  const editButtonRef = React.useRef<HTMLButtonElement>(null);
  const wasEditing = React.useRef(false);
  const branchCount = Math.max(total ?? 1, 1);
  const showPicker = branchCount >= 2;
  const label = { ...DEFAULT_LABELS, ...labels };
  const displayed = edited ?? content;

  React.useEffect(() => {
    // Focus restoration: the textarea unmounts on commit/cancel, so send
    // focus back to the Edit button instead of dropping keyboard users on
    // <body> (WCAG 2.4.3).
    if (wasEditing.current && !editing) editButtonRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(next, 1), branchCount);
    if (clamped === active) return;
    setActive(clamped);
    onBranchChange?.(clamped);
  };

  const startEdit = () => {
    setDraft(displayed);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft('');
    setEditing(false);
  };

  const saveEdit = () => {
    setEdited(draft);
    setEditing(false);
    onEdit?.(draft);
  };

  return (
    <div data-slot="message-revisions" className={cn('flex flex-col gap-2', className)} {...props}>
      {editing ? (
        <textarea
          data-slot="message-revisions-textarea"
          aria-label={label.editMessage}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              cancelEdit();
            }
          }}
          rows={3}
          // Mount-guarded focus: the textarea exists only after the user activated Edit, so moving focus into it is the requested action (not a page-load hijack).
          ref={(node) => {
            if (node && document.activeElement !== node) node.focus();
          }}
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      ) : (
        <div
          data-slot="message-revisions-content"
          className="rounded-lg px-1 py-0.5 text-sm leading-relaxed text-foreground"
        >
          {displayed}
        </div>
      )}
      <div data-slot="message-revisions-toolbar" className="flex items-center gap-1.5">
        {showPicker && !editing ? (
          <div
            data-slot="message-revisions-picker"
            className="inline-flex items-center gap-0.5 rounded-md border border-input bg-background"
          >
            <button
              type="button"
              data-slot="message-revisions-prev"
              title={label.previousBranch}
              aria-label={label.previousBranch}
              disabled={active <= 1}
              onClick={() => goTo(active - 1)}
              className="inline-flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none"
            >
              <ChevronLeftIcon data-slot="message-revisions-prev-icon" className="size-3.5" />
            </button>
            <span
              data-slot="message-revisions-position"
              aria-live="polite"
              className="min-w-10 text-center text-xs font-medium tabular-nums text-muted-foreground"
            >
              {active}/{branchCount}
            </span>
            <button
              type="button"
              data-slot="message-revisions-next"
              title={label.nextBranch}
              aria-label={label.nextBranch}
              disabled={active >= branchCount}
              onClick={() => goTo(active + 1)}
              className="inline-flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none"
            >
              <ChevronRightIcon data-slot="message-revisions-next-icon" className="size-3.5" />
            </button>
          </div>
        ) : null}
        {editing ? (
          <div data-slot="message-revisions-edit-actions" className="flex items-center gap-1.5">
            <button
              type="button"
              data-slot="message-revisions-save"
              onClick={saveEdit}
              className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {label.save}
            </button>
            <button
              type="button"
              data-slot="message-revisions-cancel"
              onClick={cancelEdit}
              className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {label.cancel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-slot="message-revisions-edit"
            ref={editButtonRef}
            title={label.editMessage}
            onClick={startEdit}
            className="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {label.edit}
          </button>
        )}
      </div>
    </div>
  );
}

export type { MessageRevisionsProps };
export { MessageRevisions };
