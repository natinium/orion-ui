'use client';

import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * StreamingText — assistant text while tokens are still arriving: the
 * content renders as-is with a blinking cursor after it. The blink is pure
 * CSS (`animate-pulse`, disabled under `prefers-reduced-motion`) — no JS
 * timer runs. The element is a polite `status` region marked `aria-busy`,
 * so screen readers defer announcing until the parent stops streaming
 * (set `aria-busy={false}` on completion, or swap the node out) instead of
 * re-reading the growing message per chunk.
 *
 * @example
 * {streaming ? <StreamingText>{partialAnswer}</StreamingText> : <p>{answer}</p>}
 */
function StreamingText({ className, children, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="streaming-text"
      role="status"
      aria-busy="true"
      className={cn('break-words whitespace-pre-wrap text-sm text-foreground', className)}
      {...props}
    >
      {children}
      <span
        data-slot="streaming-text-cursor"
        aria-hidden="true"
        className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse rounded-full bg-current align-text-bottom motion-reduce:animate-none"
      />
    </p>
  );
}

/**
 * ThinkingIndicator — "the run is working" state with a live elapsed-seconds
 * readout. Without `elapsed` the indicator ticks internally (one-second
 * interval, cleared on unmount); pass `elapsed` to control the readout from
 * your own clock — then no timer is started. The seconds span is
 * `aria-hidden`: the status announces the label once, not every tick.
 *
 * @example
 * {phase === 'thinking' && <ThinkingIndicator />}
 * @example
 * <ThinkingIndicator label="Reviewing files" elapsed={startedAt && Date.now() - startedAt} />
 */
function ThinkingIndicator({
  label = 'Thinking',
  elapsed: elapsedProp,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  /** Label announced with the status. */
  label?: string;
  /** Controlled elapsed seconds — omit to tick internally from 0. */
  elapsed?: number;
}) {
  const [internalElapsed, setInternalElapsed] = React.useState(0);

  React.useEffect(() => {
    if (elapsedProp !== undefined) return;
    const id = window.setInterval(() => setInternalElapsed((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(id);
  }, [elapsedProp]);

  const elapsed = elapsedProp ?? internalElapsed;

  return (
    <div
      data-slot="thinking-indicator"
      role="status"
      className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="thinking-indicator-dots"
        className="flex items-center gap-0.5"
      >
        <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.3s] motion-reduce:animate-none" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s] motion-reduce:animate-none" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary/70 motion-reduce:animate-none" />
      </span>
      <span data-slot="thinking-indicator-label">{label}…</span>
      <span data-slot="thinking-indicator-elapsed" aria-hidden="true" className="tabular-nums">
        {elapsed}s
      </span>
    </div>
  );
}

/**
 * QueuedNotice — "your prompt is waiting behind a running one" state: shows
 * the 1-based position in the queue and, when `onCancel` is provided, a
 * cancel button that reports it. Polite `status` region.
 *
 * @example
 * <QueuedNotice position={2} onCancel={() => dequeue(messageId)} />
 */
function QueuedNotice({
  position,
  onCancel,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  /** 1-based position in the queue. */
  position: number;
  /** Called when the cancel button is pressed; omit to hide the button. */
  onCancel?: () => void;
}) {
  return (
    <div
      data-slot="queued-notice"
      role="status"
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground',
        className,
      )}
      {...props}
    >
      <span data-slot="queued-notice-position">Queued — position {position}</span>
      {onCancel && (
        <button
          type="button"
          data-slot="queued-notice-cancel"
          onClick={onCancel}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

export { QueuedNotice, StreamingText, ThinkingIndicator };
