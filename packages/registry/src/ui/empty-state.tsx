import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * Empty State — zero-data placeholder with icon, title, description and an
 * action slot. Compose it: media/title/description/actions as children.
 *
 * @example
 * <EmptyState>
 *   <EmptyStateMedia>📄</EmptyStateMedia>
 *   <EmptyStateTitle>No files yet</EmptyStateTitle>
 *   <EmptyStateDescription>Upload your first file to get started.</EmptyStateDescription>
 *   <EmptyStateAction><Button>Upload</Button></EmptyStateAction>
 * </EmptyState>
 */
function EmptyState({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'relative flex min-h-52 w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** The icon/media slot — a muted circular holder for an icon or image. */
function EmptyStateMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-state-media"
      className={cn(
        'flex size-11 items-center justify-center rounded-full border bg-muted/40 text-muted-foreground [&_svg:not([class*="size-"])]:size-5',
        className,
      )}
      {...props}
    />
  );
}

/** The title slot — the short "what is empty" statement. */
function EmptyStateTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="empty-state-title"
      className={cn('text-base font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

/** The description slot — one or two lines of guidance. */
function EmptyStateDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn('max-w-sm text-balance text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/** The action slot — primary and secondary actions for the next step. */
function EmptyStateAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-state-action"
      className={cn('flex flex-wrap items-center justify-center gap-2', className)}
      {...props}
    />
  );
}

export {
  EmptyState,
  EmptyStateAction,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
};
