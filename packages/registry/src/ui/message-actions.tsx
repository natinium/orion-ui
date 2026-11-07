'use client';

import * as React from 'react';

import { cn } from '../lib/utils';

/** Shared look for the toolbar buttons — token-only, visible focus, AA contrast. */
const actionButtonClassName =
  'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none';

/** Copy glyph — two overlapping rounded rectangles. */
function CopyIcon(props: React.ComponentProps<'svg'>) {
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
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

/** Check glyph — shown while the "Copied" confirmation is up. */
function CheckIcon(props: React.ComponentProps<'svg'>) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Regenerate glyph — a circular restart arrow. */
function RegenerateIcon(props: React.ComponentProps<'svg'>) {
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
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

/** Thumbs-up glyph for the positive rating. */
function ThumbsUpIcon(props: React.ComponentProps<'svg'>) {
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
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

/** Thumbs-down glyph for the negative rating. */
function ThumbsDownIcon(props: React.ComponentProps<'svg'>) {
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
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

/**
 * User-facing strings of the action bar, overridable for localization via
 * the `labels` prop. Each string names one action wherever it appears
 * (visible text, `title`, accessible name). English defaults.
 */
export type MessageActionsLabels = {
  /** Accessible name of the toolbar. */
  toolbar: string;
  /** Copy button while idle. */
  copy: string;
  /** Copy button during the two-second confirmation. */
  copied: string;
  /** Regenerate button. */
  regenerate: string;
  /** Positive rating button (icon-only, so this is its accessible name). */
  rateUp: string;
  /** Negative rating button (icon-only, so this is its accessible name). */
  rateDown: string;
};

const DEFAULT_LABELS: MessageActionsLabels = {
  toolbar: 'Message actions',
  copy: 'Copy',
  copied: 'Copied',
  regenerate: 'Regenerate response',
  rateUp: 'Good response',
  rateDown: 'Bad response',
};

interface MessageActionsProps extends React.ComponentProps<'div'> {
  /** The message text written to the clipboard on Copy. */
  content: string;
  /** Called when Regenerate is activated. */
  onRegenerate?: () => void;
  /**
   * Called with `'up'` or `'down'` when a rating is first selected. Selecting
   * an already-selected direction again deselects it visually and does not
   * fire the callback.
   */
  onRate?: (value: 'up' | 'down') => void;
  /** Overrides for the user-facing strings (English defaults). */
  labels?: Partial<MessageActionsLabels>;
}

/**
 * Message Actions — the hover action bar under an assistant message: Copy
 * (with a two-second "Copied" confirmation), Regenerate, and thumbs up/down
 * rating with a persistent selected state.
 *
 * The bar is invisible until the root is hovered OR one of its buttons holds
 * keyboard focus (`focus-within`), so keyboard users get the same affordance
 * as pointer users. Announced as `role="toolbar"`. User-facing strings are
 * English by default and overridable via the `labels` prop.
 *
 * @example
 * <MessageActions
 *   content="Revenue grew 12% quarter over quarter."
 *   onRegenerate={regenerate}
 *   onRate={(value) => track(value)}
 * />
 */
function MessageActions({
  content,
  onRegenerate,
  onRate,
  labels,
  className,
  ...props
}: MessageActionsProps) {
  const label = { ...DEFAULT_LABELS, ...labels };
  const [copied, setCopied] = React.useState(false);
  const [rating, setRating] = React.useState<'up' | 'down' | null>(null);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      return; // Clipboard unavailable (permissions, non-secure context) — stay quiet.
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleRate = (value: 'up' | 'down') => {
    if (rating === value) {
      setRating(null);
      return;
    }
    setRating(value);
    onRate?.(value);
  };

  return (
    <div data-slot="message-actions" className={cn('group inline-flex', className)} {...props}>
      <div
        data-slot="message-actions-bar"
        role="toolbar"
        aria-label={label.toolbar}
        className="flex items-center gap-0.5 rounded-lg border border-input bg-background p-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100"
      >
        <button
          type="button"
          data-slot="message-actions-copy"
          title={label.copy}
          aria-live="polite"
          onClick={handleCopy}
          className={cn(actionButtonClassName, copied && 'text-primary')}
        >
          {copied ? (
            <>
              <CheckIcon data-slot="message-actions-copy-icon" className="size-3.5" />
              {label.copied}
            </>
          ) : (
            <>
              <CopyIcon data-slot="message-actions-copy-icon" className="size-3.5" />
              {label.copy}
            </>
          )}
        </button>
        <button
          type="button"
          data-slot="message-actions-regenerate"
          title={label.regenerate}
          aria-label={label.regenerate}
          onClick={onRegenerate}
          className={actionButtonClassName}
        >
          <RegenerateIcon data-slot="message-actions-regenerate-icon" className="size-3.5" />
          {label.regenerate}
        </button>
        <button
          type="button"
          data-slot="message-actions-rate-up"
          title={label.rateUp}
          aria-label={label.rateUp}
          aria-pressed={rating === 'up'}
          onClick={() => handleRate('up')}
          className={cn(actionButtonClassName, rating === 'up' && 'bg-primary/10 text-primary')}
        >
          <ThumbsUpIcon data-slot="message-actions-rate-up-icon" className="size-3.5" />
        </button>
        <button
          type="button"
          data-slot="message-actions-rate-down"
          title={label.rateDown}
          aria-label={label.rateDown}
          aria-pressed={rating === 'down'}
          onClick={() => handleRate('down')}
          className={cn(actionButtonClassName, rating === 'down' && 'bg-primary/10 text-primary')}
        >
          <ThumbsDownIcon data-slot="message-actions-rate-down-icon" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export type { MessageActionsProps };
export { MessageActions };
