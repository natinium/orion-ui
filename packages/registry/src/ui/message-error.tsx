'use client';

import { cva } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '../lib/utils';

/** Alert glyph — a circle with an exclamation, for the failed kind. */
function AlertCircleIcon(props: React.ComponentProps<'svg'>) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

/** Stop glyph — a filled square, for the stopped kind. */
function StopIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect width="12" height="12" x="6" y="6" rx="1" />
    </svg>
  );
}

type MessageErrorKind = 'failed' | 'stopped';

/**
 * Variant classes for the card's one real variant set — the two terminal
 * kinds. Mirrored onto the root as `data-variant` for tests and consumer
 * CSS; both arms are token-only, so dark and light stay in parity.
 */
const messageErrorVariants = cva('flex items-start gap-3 rounded-lg border p-3.5', {
  variants: {
    kind: {
      failed: 'border-destructive/30 bg-destructive/10 text-destructive',
      stopped: 'border-border bg-muted/40 text-foreground',
    },
  },
  defaultVariants: {
    kind: 'failed',
  },
});

/**
 * User-facing strings of the card, overridable for localization via the
 * `labels` prop. English defaults.
 */
export type MessageErrorLabels = {
  /** Title of the failed kind. */
  failed: string;
  /** Title of the stopped kind. */
  stopped: string;
  /** Retry button. */
  retry: string;
  /** Keep-partial-answer button. */
  keepPartial: string;
};

const DEFAULT_LABELS: MessageErrorLabels = {
  failed: 'Failed',
  stopped: 'Stopped',
  retry: 'Retry',
  keepPartial: 'Keep partial answer',
};

interface MessageErrorProps extends React.ComponentProps<'div'> {
  /**
   * `failed` renders a destructive tint and is announced assertively
   * (`role="alert"`); `stopped` renders a neutral tint and is announced
   * politely (`role="status"`).
   */
  kind: MessageErrorKind;
  /** Renders the Retry button and fires when it is activated. */
  onRetry?: () => void;
  /** Renders the Keep-partial button and fires when it is activated. */
  onKeep?: () => void;
  /** Detail line under the title; defaults per kind. */
  message?: string;
  /** Overrides for the user-facing strings (English defaults). */
  labels?: Partial<MessageErrorLabels>;
}

const DEFAULT_MESSAGES: Record<MessageErrorKind, string> = {
  failed: 'Something went wrong while generating this response.',
  stopped: 'The response was stopped before it finished.',
};

/**
 * Message Error — the terminal states of a run that did not complete:
 * a failed generation (destructive tint, assertively announced) or a stopped
 * one (neutral tint). Both offer Retry and, when there is partial output
 * worth keeping, Keep partial answer.
 *
 * Buttons render only when their handler is provided, so the card never
 * shows a dead action. User-facing strings are English by default and
 * overridable via the `labels` prop.
 *
 * @example
 * <MessageError kind="failed" onRetry={retry} onKeep={keepPartial} />
 * @example
 * <MessageError kind="stopped" onRetry={retry} onKeep={keepPartial} message="Paused by the user." />
 */
function MessageError({
  kind,
  onRetry,
  onKeep,
  message,
  labels,
  className,
  ...props
}: MessageErrorProps) {
  const failed = kind === 'failed';
  const Icon = failed ? AlertCircleIcon : StopIcon;
  const label = { ...DEFAULT_LABELS, ...labels };

  return (
    <div
      data-slot="message-error"
      data-variant={kind}
      role={failed ? 'alert' : 'status'}
      className={cn(messageErrorVariants({ kind }), className)}
      {...props}
    >
      <Icon data-slot="message-error-icon" className="mt-0.5 size-4 shrink-0" />
      <div data-slot="message-error-body" className="flex flex-col gap-1">
        <span data-slot="message-error-title" className="text-sm font-semibold leading-none">
          {failed ? label.failed : label.stopped}
        </span>
        <p data-slot="message-error-message" className="text-sm leading-relaxed">
          {message ?? DEFAULT_MESSAGES[kind]}
        </p>
        {onRetry || onKeep ? (
          <div data-slot="message-error-actions" className="mt-1.5 flex items-center gap-2">
            {onRetry ? (
              <button
                type="button"
                data-slot="message-error-retry"
                onClick={onRetry}
                className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {label.retry}
              </button>
            ) : null}
            {onKeep ? (
              <button
                type="button"
                data-slot="message-error-keep"
                onClick={onKeep}
                className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {label.keepPartial}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { MessageErrorKind, MessageErrorProps };
export { MessageError, messageErrorVariants };
