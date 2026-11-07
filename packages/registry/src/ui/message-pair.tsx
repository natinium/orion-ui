'use client';

import type * as React from 'react';

import { cn } from '../lib/utils';

/**
 * Hour+minute formatter used for message timestamps. 24-hour, locale-aware
 * (`Intl.DateTimeFormat`), so "14:32" in `en-US`, "14:32" in `de-DE`, etc.
 */
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

/**
 * Resolves a timestamp prop. A `Date` is formatted to hour+minute with the
 * machine locale and paired with a `dateTime` attribute; a string is treated
 * as already formatted ("HH:mm") and passes through unchanged.
 */
function resolveTimestamp(value: Date | string): { text: string; dateTime: string } {
  if (typeof value === 'string') return { text: value, dateTime: value };
  return {
    text: timeFormatter.format(value),
    dateTime: `${pad2(value.getHours())}:${pad2(value.getMinutes())}`,
  };
}

/** The speaker chip — an initials circle identifying who sent the row. */
function SpeakerAvatar({
  name,
  slot,
  className,
}: {
  name: string;
  slot: string;
  className?: string;
}) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div
      data-slot={slot}
      role="img"
      aria-label={name}
      className={cn(
        'flex size-8 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold',
        className,
      )}
    >
      {initial}
    </div>
  );
}

/** Props for {@link MessagePair} — native `<ol>` attributes plus the turn content. */
interface MessagePairProps extends React.ComponentProps<'ol'> {
  /** The user's message text, rendered in the right-aligned primary bubble. */
  userMessage: string;
  /** The assistant reply; when omitted, `children` becomes the reply slot. */
  assistantContent?: React.ReactNode;
  /**
   * When the user message was sent — a `Date` (formatted to hour+minute via
   * `Intl.DateTimeFormat`) or a preformatted "HH:mm" string.
   */
  userAt?: Date | string;
  /** When the assistant reply landed — same semantics as `userAt`. */
  assistantAt?: Date | string;
  /** Speaker names; the first character seeds each initials circle. */
  names?: { user?: string; assistant?: string };
}

/**
 * Message Pair — one turn of the conversation: the user's message as a
 * right-aligned primary-tinted bubble, the assistant reply as a plain
 * left-aligned block, each with a speaker initials circle and an optional
 * hour+minute timestamp.
 *
 * The pair renders as an ordered list (`<ol>`/`<li>`) so screen readers hear
 * one turn as a unit of two messages in order. There are no hardcoded UI
 * strings: speaker labels come from `names`, and timestamps follow the
 * machine locale via `Intl.DateTimeFormat`.
 *
 * @example
 * <MessagePair
 *   userMessage="Summarize the Q3 report"
 *   assistantContent={<p>Revenue grew 12% quarter over quarter…</p>}
 *   userAt={new Date('2026-11-07T14:32:00')}
 *   assistantAt={new Date('2026-11-07T14:32:07')}
 *   names={{ user: 'Ada', assistant: 'Orion' }}
 * />
 */
function MessagePair({
  userMessage,
  assistantContent,
  userAt,
  assistantAt,
  names,
  className,
  children,
  ...props
}: MessagePairProps) {
  const userName = names?.user ?? 'You';
  const assistantName = names?.assistant ?? 'Assistant';
  const reply = assistantContent ?? children;
  const userStamp = userAt === undefined ? undefined : resolveTimestamp(userAt);
  const assistantStamp = assistantAt === undefined ? undefined : resolveTimestamp(assistantAt);

  return (
    <ol data-slot="message-pair" className={cn('flex flex-col gap-4 py-2', className)} {...props}>
      <li data-slot="message-pair-user" className="flex items-end justify-end gap-2.5">
        <div
          data-slot="message-pair-user-body"
          className="flex max-w-[75%] flex-col items-end gap-1"
        >
          <div
            data-slot="message-pair-user-bubble"
            className="rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground"
          >
            {userMessage}
          </div>
          {userStamp ? (
            <time
              data-slot="message-pair-user-time"
              dateTime={userStamp.dateTime}
              className="px-1 text-xs text-muted-foreground"
            >
              {userStamp.text}
            </time>
          ) : null}
        </div>
        <SpeakerAvatar
          name={userName}
          slot="message-pair-user-avatar"
          className="bg-primary text-primary-foreground"
        />
      </li>
      <li data-slot="message-pair-assistant" className="flex items-start justify-start gap-2.5">
        <SpeakerAvatar
          name={assistantName}
          slot="message-pair-assistant-avatar"
          className="bg-muted text-muted-foreground"
        />
        <div
          data-slot="message-pair-assistant-body"
          className="flex max-w-[80%] flex-col items-start gap-1"
        >
          <div
            data-slot="message-pair-assistant-content"
            className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed text-foreground"
          >
            {reply}
          </div>
          {assistantStamp ? (
            <time
              data-slot="message-pair-assistant-time"
              dateTime={assistantStamp.dateTime}
              className="px-1 text-xs text-muted-foreground"
            >
              {assistantStamp.text}
            </time>
          ) : null}
        </div>
      </li>
    </ol>
  );
}

export type { MessagePairProps };
export { MessagePair };
