'use client';

import { cva } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '../lib/utils';

/** Upload state of one staged attachment. */
export type AttachmentStatus = 'queued' | 'uploading' | 'done' | 'error';

/**
 * Class generator for the per-row upload-state label — the tray's variant
 * set, keyed 1:1 by `AttachmentStatus` (`error` is the emphasized/destructive
 * state). Exported so consumers can render matching status text outside the
 * tray.
 */
const attachmentStagingStatusVariants = cva('shrink-0 text-xs', {
  variants: {
    status: {
      queued: 'text-muted-foreground',
      uploading: 'text-muted-foreground',
      done: 'text-muted-foreground',
      error: 'font-medium text-destructive',
    },
  },
  defaultVariants: {
    status: 'queued',
  },
});

/**
 * One row of the staging tray. `progress` (0–100) is read while the row is
 * `uploading`; the other states ignore it.
 */
export interface StagedAttachment {
  id: string;
  name: string;
  /** Size in bytes — rendered human-readable. */
  size: number;
  status: AttachmentStatus;
  progress?: number;
}

/**
 * Formats a byte count for display ("512 B", "2.0 KB", "5.0 MB", "3.0 GB").
 * Non-finite or negative sizes render as an empty string.
 */
function formatAttachmentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 'B';
  for (const next of units) {
    value /= 1024;
    unit = next;
    if (value < 1024) break;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}`;
}

/**
 * Derives the generic type badge from the file extension (v0: one badge per
 * mime family, no per-format artwork).
 */
function attachmentType(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1) : '';
  return ext ? ext.toUpperCase().slice(0, 4) : 'FILE';
}

/**
 * AttachmentStaging — the tray of staged attachments under a composer:
 * one row per file with its name, human-readable size, upload state
 * (`queued` / `uploading N%` with a real progressbar / `done` / `error`),
 * a remove button on every row and a retry button on errored rows.
 *
 * Presentational only: the tray renders the `attachments` array as given
 * and reports intent through `onRemove`/`onRetry` — the consumer owns the
 * upload pipeline that moves rows through the states.
 *
 * @example
 * <AttachmentStaging
 *   attachments={[{ id: 'a1', name: 'report.pdf', size: 512, status: 'uploading', progress: 42 }]}
 *   onRemove={(id) => unstage(id)}
 *   onRetry={(id) => uploadAgain(id)}
 * />
 */
function AttachmentStaging({
  attachments,
  onRemove,
  onRetry,
  className,
  ...props
}: React.ComponentProps<'ul'> & {
  /** The staged rows, in display order. */
  attachments: StagedAttachment[];
  /** Called with the attachment id when its remove button is pressed. */
  onRemove?: (id: string) => void;
  /** Called with the attachment id when a failed row's retry button is pressed. */
  onRetry?: (id: string) => void;
}) {
  return (
    <ul
      data-slot="attachment-staging"
      aria-label="Staged attachments"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      {attachments.map((item) => (
        <li
          key={item.id}
          data-slot="attachment-staging-item"
          data-status={item.status}
          data-variant={item.status}
          className="flex items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <span
            data-slot="attachment-staging-icon"
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground"
          >
            {attachmentType(item.name)}
          </span>
          <div data-slot="attachment-staging-info" className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span data-slot="attachment-staging-name" className="truncate font-medium">
                {item.name}
              </span>
              <span
                data-slot="attachment-staging-size"
                className="shrink-0 text-xs text-muted-foreground"
              >
                {formatAttachmentSize(item.size)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                data-slot="attachment-staging-status"
                data-status={item.status}
                className={attachmentStagingStatusVariants({ status: item.status })}
              >
                {item.status === 'uploading' && `uploading ${item.progress ?? 0}%`}
                {item.status === 'queued' && 'queued'}
                {item.status === 'done' && 'done'}
                {item.status === 'error' && 'error'}
              </span>
              {item.status === 'uploading' && (
                <div
                  role="progressbar"
                  aria-label={`Upload progress: ${item.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.progress ?? 0}
                  data-slot="attachment-staging-progress"
                  className="h-1 min-w-16 flex-1 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${item.progress ?? 0}%` }}
                  />
                </div>
              )}
            </div>
          </div>
          {item.status === 'error' && (
            <button
              type="button"
              data-slot="attachment-staging-retry"
              aria-label={`Retry ${item.name}`}
              onClick={() => onRetry?.(item.id)}
              className="shrink-0 rounded-md px-1.5 py-1 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              retry
            </button>
          )}
          <button
            type="button"
            data-slot="attachment-staging-remove"
            aria-label={`Remove ${item.name}`}
            onClick={() => onRemove?.(item.id)}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

export { AttachmentStaging, attachmentStagingStatusVariants };
