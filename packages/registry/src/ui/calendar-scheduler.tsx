'use client';

import * as React from 'react';

import { cn } from '../lib/utils';

/** The two available views of the scheduler. */
type CalendarView = 'month' | 'agenda';

/**
 * A single schedulable event.
 *
 * `start`/`end` accept ISO strings or local `'YYYY-MM-DD'` plus optional
 * `'HH:mm'` forms — `'2026-11-15'`, `'2026-11-15 14:30'`, `'2026-11-15T14:30'`
 * and `'2026-11-15T14:30:00Z'` all parse. `color` is a consumer-supplied CSS
 * color applied as the chip accent; text contrast always comes from tokens.
 */
interface CalendarSchedulerEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Event chips shown per day cell before collapsing into a "+N more" button. */
const MAX_VISIBLE_CHIPS = 3;

/** Arrow-key rescheduling on a focused chip: horizontal by day, vertical by week. */
const KEYBOARD_MOVE_DELTAS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar key for a date, e.g. "2026-11-15". */
const ymdKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Canonical local event timestamp, e.g. "2026-11-15T14:30". */
const formatEventDate = (date: Date) =>
  `${ymdKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** 24h clock label, e.g. "09:05". */
const formatTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const fullDateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const longDateFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const monthTitleFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

/** Accessible name of a day cell, e.g. "November 15, 2026". */
const cellLabel = (date: Date) => fullDateFormat.format(date);

/** Number of days in `month` (1–12) of `year`, leap years included. */
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

/**
 * "Today"/"Tomorrow" where applicable, otherwise the long date
 * (e.g. "Saturday, November 15").
 */
const relativeDayLabel = (date: Date, today: Date) => {
  const key = ymdKey(date);
  if (key === ymdKey(today)) return 'Today';
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (key === ymdKey(tomorrow)) return 'Tomorrow';
  return longDateFormat.format(date);
};

/**
 * Parse an event date string into a local `Date`.
 *
 * Accepts `'YYYY-MM-DD'`, `'YYYY-MM-DD HH:mm'`, `'YYYY-MM-DDTHH:mm(:ss)'`
 * (treated as local time) and anything `new Date()` understands (full ISO).
 * Out-of-range calendar fields are rejected — `'2026-02-30'`, `'2026-13-01'`
 * or `'2026-11-15 25:99'` return `null` instead of silently rolling over.
 * Returns `null` for unparseable input — the scheduler skips such events
 * instead of crashing.
 */
function parseEventDate(input: string): Date | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(
    input.trim(),
  );
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4] ?? 0);
    const minute = Number(match[5] ?? 0);
    const second = Number(match[6] ?? 0);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > daysInMonth(year, month)) return null;
    if (hour > 23 || minute > 59 || second > 59) return null;
    const date = new Date(year, month - 1, day, hour, minute, second);
    // Round-trip guard: reject values the local constructor normalized away
    // (e.g. wall times that do not exist on DST spring-forward days).
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute ||
      date.getSeconds() !== second
    ) {
      return null;
    }
    return date;
  }
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Build the visible month grid: 42 dates (six weeks) starting on the Sunday
 * on or before the 1st, so leading/trailing days of adjacent months are
 * included. Pure — no side effects, no dependency on the current date.
 */
function buildMonthGrid(year: number, month: number): Date[] {
  const firstDayOffset = new Date(year, month, 1).getDay();
  return Array.from(
    { length: 42 },
    (_, index) => new Date(year, month, 1 - firstDayOffset + index),
  );
}

/**
 * Compute the new `start` for an event dropped on `targetDay`: the target date
 * combined with the event's original time-of-day, in the canonical
 * `"YYYY-MM-DDTHH:mm"` local form. Returns `null` when the event's start is
 * unparseable.
 */
function moveEventStart(event: Pick<CalendarSchedulerEvent, 'start'>, targetDay: Date) {
  const start = parseEventDate(event.start);
  if (!start) return null;
  return formatEventDate(
    new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      start.getHours(),
      start.getMinutes(),
    ),
  );
}

const toolbarButtonClass =
  'inline-flex h-8 items-center justify-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

interface CalendarToolbarProps extends React.ComponentProps<'fieldset'> {
  /** Title of the visible month, e.g. "November 2026". */
  title: string;
  /** The active view; drives `aria-pressed` on the two view buttons. */
  view: CalendarView;
  /** Called with the month/previous/next/today navigation intent. */
  onPrevious?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  /** Called when the user switches between month and agenda. */
  onViewChange?: (view: CalendarView) => void;
}

/**
 * The scheduler toolbar: a labeled group of navigation controls (previous,
 * today, next), an aria-live month title and a Month/Agenda view switch.
 * A native `<fieldset>` — its implicit group role labels the controls without
 * implying the APG toolbar pattern. Composed by `CalendarScheduler`, but
 * exported so consumers can compose custom chrome around their own grid.
 */
function CalendarToolbar({
  title,
  view,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  className,
  ...props
}: CalendarToolbarProps) {
  return (
    <fieldset
      aria-label="Calendar toolbar"
      data-slot="calendar-scheduler-toolbar"
      className={cn('flex flex-wrap items-center justify-between gap-2', className)}
      {...props}
    >
      <h2
        aria-live="polite"
        data-slot="calendar-scheduler-title"
        className="text-sm font-semibold text-foreground"
      >
        {title}
      </h2>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-slot="calendar-scheduler-previous"
            aria-label="Previous month"
            onClick={onPrevious}
            className={toolbarButtonClass}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <path d="m10 3-5 5 5 5" />
            </svg>
          </button>
          <button
            type="button"
            data-slot="calendar-scheduler-today"
            onClick={onToday}
            className={toolbarButtonClass}
          >
            Today
          </button>
          <button
            type="button"
            data-slot="calendar-scheduler-next"
            aria-label="Next month"
            onClick={onNext}
            className={toolbarButtonClass}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <path d="m6 3 5 5-5 5" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-slot="calendar-scheduler-view-month"
            aria-pressed={view === 'month'}
            onClick={() => onViewChange?.('month')}
            className={cn(
              toolbarButtonClass,
              view === 'month' && 'bg-accent text-accent-foreground',
            )}
          >
            Month
          </button>
          <button
            type="button"
            data-slot="calendar-scheduler-view-agenda"
            aria-pressed={view === 'agenda'}
            onClick={() => onViewChange?.('agenda')}
            className={cn(
              toolbarButtonClass,
              view === 'agenda' && 'bg-accent text-accent-foreground',
            )}
          >
            Agenda
          </button>
        </div>
      </div>
    </fieldset>
  );
}

interface CalendarAgendaListProps extends React.ComponentProps<'div'> {
  /** Events to group by day and sort chronologically. */
  events: CalendarSchedulerEvent[];
  /** Reference date for the "Today"/"Tomorrow" labels. Defaults to now. */
  today?: Date;
}

/**
 * The agenda view: events grouped per day in chronological order, each day a
 * section headed by a relative label ("Today", "Tomorrow", or the long date)
 * and its events listed with a 24h time range. Rendered by
 * `CalendarScheduler` in agenda view, and exported for standalone use.
 */
function CalendarAgendaList({
  events,
  today = new Date(),
  className,
  ...props
}: CalendarAgendaListProps) {
  const groups = React.useMemo(() => {
    const parsed = events
      .map((event) => ({
        event,
        start: parseEventDate(event.start),
        end: parseEventDate(event.end),
      }))
      .filter(
        (item): item is { event: CalendarSchedulerEvent; start: Date; end: Date } =>
          item.start !== null && item.end !== null,
      )
      .sort(
        (a, b) =>
          a.start.getTime() - b.start.getTime() ||
          a.end.getTime() - b.end.getTime() ||
          a.event.title.localeCompare(b.event.title),
      );

    const out: Array<{ key: string; date: Date; items: typeof parsed }> = [];
    for (const item of parsed) {
      const key = ymdKey(item.start);
      const last = out[out.length - 1];
      if (last && last.key === key) {
        last.items.push(item);
      } else {
        out.push({ key, date: item.start, items: [item] });
      }
    }
    return out;
  }, [events]);

  return (
    <div
      data-slot="calendar-scheduler-agenda"
      className={cn(
        'flex flex-col divide-y divide-input overflow-hidden rounded-lg border border-input bg-background',
        className,
      )}
      {...props}
    >
      {groups.length === 0 ? (
        <p
          data-slot="calendar-scheduler-agenda-empty"
          className="p-6 text-center text-sm text-muted-foreground"
        >
          No events scheduled.
        </p>
      ) : (
        groups.map((group) => {
          const label = relativeDayLabel(group.date, today);
          const isRelative = label === 'Today' || label === 'Tomorrow';
          return (
            <section
              key={group.key}
              data-slot="calendar-scheduler-agenda-day"
              className="flex flex-col gap-2 p-3"
            >
              <div className="flex items-baseline gap-2">
                <h3
                  data-slot="calendar-scheduler-agenda-date"
                  className="text-sm font-semibold text-foreground"
                >
                  {label}
                </h3>
                {isRelative && (
                  <span className="text-xs text-muted-foreground">
                    {longDateFormat.format(group.date)}
                  </span>
                )}
              </div>
              <ul data-slot="calendar-scheduler-agenda-items" className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.event.id}
                    data-slot="calendar-scheduler-agenda-item"
                    className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-2 py-1.5"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        item.event.color ? 'bg-(--event-color)' : 'bg-primary',
                      )}
                      style={
                        item.event.color
                          ? ({ '--event-color': item.event.color } as React.CSSProperties)
                          : undefined
                      }
                    />
                    <span
                      data-slot="calendar-scheduler-agenda-item-time"
                      className="shrink-0 text-xs tabular-nums text-muted-foreground"
                    >
                      {formatTime(item.start)} – {formatTime(item.end)}
                    </span>
                    <span
                      data-slot="calendar-scheduler-agenda-item-title"
                      className="truncate text-sm font-medium text-foreground"
                    >
                      {item.event.title}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

interface CalendarSchedulerProps extends React.ComponentProps<'div'> {
  /** The events to schedule. Chips render on each event's start day. */
  events: CalendarSchedulerEvent[];
  /** Initial (uncontrolled) view. Defaults to `'month'`. */
  defaultView?: CalendarView;
  /** Called when the user switches between month and agenda view. */
  onViewChange?: (view: CalendarView) => void;
  /**
   * Called when an event is rescheduled — dropped on a day cell, or moved
   * with the arrow keys from a focused chip — with the canonical local
   * `"YYYY-MM-DDTHH:mm"` start (target date, original time-of-day). The
   * component never mutates `events` — apply the move in your state.
   */
  onEventMove?: (eventId: string, newStart: string) => void;
  /** Called when an event chip is clicked/keyboard-activated. */
  onSelectEvent?: (event: CalendarSchedulerEvent) => void;
}

/**
 * Calendar Scheduler — a month/agenda scheduler with real Date math,
 * draggable event chips (max 3 per day, then "+N more"), a highlighted today
 * cell and a labeled toolbar. Events are controlled; view state is
 * uncontrolled (`defaultView` + `onViewChange`).
 *
 * Rescheduling works with pointer and keyboard: chips are draggable and carry
 * the event id on `dataTransfer` (`text/plain`), and day cells report the
 * drop as `onEventMove`. On the keyboard, a focused chip activates
 * `onSelectEvent` with Enter/Space and reschedules with the arrow keys
 * (left/right by a day, up/down by a week) — focus follows the moved chip, or
 * lands on the target day cell when the moved chip is collapsed behind
 * "+N more", and a live region announces the move. Days with more than three
 * chips collapse into a "+N more" button that opens a focusable panel with
 * that day's hidden events; Close or Escape returns focus to the button.
 *
 * @example
 * <CalendarScheduler
 *   events={[{ id: '1', title: 'Standup', start: '2026-11-16 09:00', end: '2026-11-16 09:15', color: '#0ea5e9' }]}
 *   onEventMove={(id, newStart) => reschedule(id, newStart)}
 *   defaultView="month"
 * />
 */
function CalendarScheduler({
  events,
  defaultView = 'month',
  onViewChange,
  onEventMove,
  onSelectEvent,
  className,
  ...props
}: CalendarSchedulerProps) {
  const [view, setView] = React.useState<CalendarView>(defaultView);
  const today = new Date();
  // Bumped by the effect below right after local midnight so `today` (read per
  // render) never goes stale while the page sits mounted across a rollover.
  const [, setTodayTick] = React.useState(0);
  const [openDayKey, setOpenDayKey] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState('');
  const [visibleMonth, setVisibleMonth] = React.useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  const chipRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const cellRefs = React.useRef(new Map<string, HTMLTableCellElement>());
  const moreButtonRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const dayPanelRef = React.useRef<HTMLElement | null>(null);
  const dayPanelId = React.useId();
  /** Set when a keyboard move needs focus restoration after the re-render. */
  const pendingFocusRef = React.useRef<{ id: string; fromKey: string } | null>(null);
  const pendingPanelFocusRef = React.useRef(false);

  // Re-render just after each local midnight so the today highlight and the
  // Today button stay correct without waiting for an unrelated re-render.
  React.useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = window.setTimeout(
      () => setTodayTick((tick) => tick + 1),
      nextMidnight.getTime() - now.getTime() + 50,
    );
    return () => window.clearTimeout(timer);
  });

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const seen = new Set<string>();
    for (const event of events) {
      if (seen.has(event.id)) {
        console.error(
          `[calendar-scheduler] Duplicate event id "${event.id}". Chips are keyed by id and a move targets the last one with that id — give every event a unique id.`,
        );
      }
      seen.add(event.id);
    }
  }, [events]);

  // Focus the day panel once it mounts so keyboard and screen-reader users
  // land inside it instead of losing focus to <body>.
  React.useEffect(() => {
    if (!pendingPanelFocusRef.current) return;
    pendingPanelFocusRef.current = false;
    dayPanelRef.current?.focus();
  });

  const changeView = (next: CalendarView) => {
    setView(next);
    setOpenDayKey(null);
    setAnnouncement(next === 'month' ? 'Month view' : 'Agenda view');
    onViewChange?.(next);
  };

  const shiftMonth = (delta: number) => {
    setOpenDayKey(null);
    setVisibleMonth((current) => {
      const shifted = new Date(current.year, current.month + delta, 1);
      return { year: shifted.getFullYear(), month: shifted.getMonth() };
    });
  };
  const goToday = () => {
    const now = new Date();
    setVisibleMonth({ year: now.getFullYear(), month: now.getMonth() });
  };

  const parsed = React.useMemo(
    () =>
      events
        .map((event) => ({
          event,
          start: parseEventDate(event.start),
          end: parseEventDate(event.end),
        }))
        .filter(
          (item): item is { event: CalendarSchedulerEvent; start: Date; end: Date } =>
            item.start !== null && item.end !== null,
        ),
    [events],
  );

  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, Array<{ event: CalendarSchedulerEvent; start: Date }>>();
    for (const item of parsed) {
      const key = ymdKey(item.start);
      const list = map.get(key);
      if (list) {
        list.push(item);
      } else {
        map.set(key, [item]);
      }
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          a.start.getTime() - b.start.getTime() || a.event.title.localeCompare(b.event.title),
      );
    }
    return map;
  }, [parsed]);

  const eventsById = React.useMemo(() => {
    const map = new Map<string, CalendarSchedulerEvent>();
    for (const item of parsed) map.set(item.event.id, item.event);
    return map;
  }, [parsed]);

  const grid = React.useMemo(
    () => buildMonthGrid(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );
  const todayKey = ymdKey(today);

  // Keyboard moves re-render with the event in a new cell; move focus along so
  // it never drops to <body>. It lands back on the chip, or on the new day
  // cell when the moved chip is hidden behind "+N more". The pending record
  // carries the origin day so the effect acts only once the consumer's
  // controlled update has actually moved the event.
  React.useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    const moved = parsed.find((item) => item.event.id === pending.id);
    if (!moved) {
      pendingFocusRef.current = null;
      return;
    }
    const toKey = ymdKey(moved.start);
    if (toKey === pending.fromKey) return; // consumer has not applied the move yet
    pendingFocusRef.current = null;
    const chip = chipRefs.current.get(pending.id);
    if (chip) {
      chip.focus();
    } else {
      cellRefs.current.get(toKey)?.focus();
    }
    setAnnouncement(`${moved.event.title} moved to ${cellLabel(moved.start)}`);
  });

  const handleDrop = (event: React.DragEvent<HTMLTableCellElement>, day: Date) => {
    event.preventDefault();
    const id = event.dataTransfer?.getData('text/plain');
    if (!id) return;
    const dragged = eventsById.get(id);
    if (!dragged) return;
    const newStart = moveEventStart(dragged, day);
    if (newStart) onEventMove?.(id, newStart);
  };

  const handleChipKeyDown = (
    keyEvent: React.KeyboardEvent<HTMLButtonElement>,
    event: CalendarSchedulerEvent,
    day: Date,
  ) => {
    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
      // Handle activation explicitly and preventDefault so browsers that
      // synthesize the click on keyboard activation don't fire it twice.
      keyEvent.preventDefault();
      onSelectEvent?.(event);
      return;
    }
    const delta = KEYBOARD_MOVE_DELTAS[keyEvent.key];
    if (delta === undefined || !onEventMove) return;
    keyEvent.preventDefault();
    const target = new Date(day.getFullYear(), day.getMonth(), day.getDate() + delta);
    const newStart = moveEventStart(event, target);
    if (!newStart) return;
    pendingFocusRef.current = { id: event.id, fromKey: ymdKey(day) };
    onEventMove(event.id, newStart);
  };

  const openDayPanel = (key: string) => {
    pendingPanelFocusRef.current = true;
    setOpenDayKey(key);
  };

  const closeDayPanel = () => {
    const dayKey = openDayKey;
    setOpenDayKey(null);
    // The month grid stays mounted, so the originating button is still there —
    // hand focus back to it instead of dropping the user at <body>.
    if (dayKey) moreButtonRefs.current.get(dayKey)?.focus();
  };

  const openDay = openDayKey ? grid.find((day) => ymdKey(day) === openDayKey) : undefined;
  const openDayHiddenEvents = openDayKey
    ? (eventsByDay.get(openDayKey) ?? []).slice(MAX_VISIBLE_CHIPS).map((item) => item.event)
    : [];

  return (
    <div
      data-slot="calendar-scheduler"
      data-view={view}
      className={cn('flex w-full flex-col gap-3', className)}
      {...props}
    >
      <CalendarToolbar
        title={monthTitleFormat.format(new Date(visibleMonth.year, visibleMonth.month, 1))}
        view={view}
        onPrevious={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        onToday={goToday}
        onViewChange={changeView}
      />
      {view === 'month' ? (
        <>
          <div
            data-slot="calendar-scheduler-grid"
            className="overflow-hidden rounded-lg border border-input bg-background"
          >
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr>
                  {WEEKDAYS.map((weekday) => (
                    <th
                      key={weekday}
                      data-slot="calendar-scheduler-weekday"
                      className="border-b border-l border-input bg-muted/40 px-1 py-1.5 text-center text-[11px] font-medium text-muted-foreground first:border-l-0"
                    >
                      {weekday}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, week) => (
                  <tr key={grid[week * 7].getTime()}>
                    {grid.slice(week * 7, week * 7 + 7).map((day) => {
                      const key = ymdKey(day);
                      const isToday = key === todayKey;
                      const isOutside = day.getMonth() !== visibleMonth.month;
                      const dayEvents = eventsByDay.get(key) ?? [];
                      const visible = dayEvents.slice(0, MAX_VISIBLE_CHIPS);
                      const hiddenCount = dayEvents.length - visible.length;

                      return (
                        <td
                          key={key}
                          ref={(node) => {
                            if (node) cellRefs.current.set(key, node);
                            else cellRefs.current.delete(key);
                          }}
                          // Programmatic focus target only (keyboard-move
                          // fallback); deliberately out of the tab order.
                          tabIndex={-1}
                          data-slot="calendar-scheduler-cell"
                          data-today={isToday || undefined}
                          data-outside={isOutside || undefined}
                          aria-current={isToday ? 'date' : undefined}
                          aria-label={cellLabel(day)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => handleDrop(event, day)}
                          className={cn(
                            'h-20 border-b border-l border-input p-1 align-top first:border-l-0 outline-none',
                            isOutside && 'bg-muted/30',
                          )}
                        >
                          <span
                            data-slot="calendar-scheduler-day-number"
                            className={cn(
                              'inline-flex size-5 items-center justify-center rounded-full text-[11px] font-medium',
                              isOutside ? 'text-muted-foreground/60' : 'text-foreground',
                              isToday && 'bg-primary text-primary-foreground',
                            )}
                          >
                            {day.getDate()}
                          </span>
                          {visible.length > 0 && (
                            <div
                              data-slot="calendar-scheduler-chips"
                              className="mt-0.5 flex flex-col gap-0.5"
                            >
                              {visible.map(({ event }) => {
                                const hasColor = Boolean(event.color);
                                return (
                                  <button
                                    key={event.id}
                                    ref={(node) => {
                                      if (node) chipRefs.current.set(event.id, node);
                                      else chipRefs.current.delete(event.id);
                                    }}
                                    type="button"
                                    draggable
                                    data-slot="calendar-scheduler-chip"
                                    data-event-id={event.id}
                                    title={event.title}
                                    aria-label={`${event.title} on ${cellLabel(day)}`}
                                    aria-keyshortcuts="Enter Space ArrowLeft ArrowRight ArrowUp ArrowDown"
                                    onDragStart={(dragEvent) => {
                                      if (!dragEvent.dataTransfer) return;
                                      dragEvent.dataTransfer.setData('text/plain', event.id);
                                      dragEvent.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onClick={() => onSelectEvent?.(event)}
                                    onKeyDown={(keyEvent) =>
                                      handleChipKeyDown(keyEvent, event, day)
                                    }
                                    className={cn(
                                      'flex w-full cursor-grab items-center gap-1 rounded-md border border-input bg-muted/50 px-1.5 py-0.5 text-left text-[11px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60 active:cursor-grabbing',
                                      hasColor && 'border-(--event-color) bg-transparent',
                                    )}
                                    style={
                                      hasColor
                                        ? ({ '--event-color': event.color } as React.CSSProperties)
                                        : undefined
                                    }
                                  >
                                    <span
                                      aria-hidden="true"
                                      data-slot="calendar-scheduler-chip-dot"
                                      className={cn(
                                        'size-1.5 shrink-0 rounded-full',
                                        hasColor ? 'bg-(--event-color)' : 'bg-primary',
                                      )}
                                    />
                                    <span className="truncate">{event.title}</span>
                                  </button>
                                );
                              })}
                              {hiddenCount > 0 && (
                                <button
                                  type="button"
                                  ref={(node) => {
                                    if (node) moreButtonRefs.current.set(key, node);
                                    else moreButtonRefs.current.delete(key);
                                  }}
                                  data-slot="calendar-scheduler-more"
                                  aria-label={`Show ${hiddenCount} more ${
                                    hiddenCount === 1 ? 'event' : 'events'
                                  } on ${cellLabel(day)}`}
                                  aria-expanded={openDayKey === key}
                                  aria-controls={openDayKey === key ? dayPanelId : undefined}
                                  onClick={() => openDayPanel(key)}
                                  className="w-full rounded-md px-1 text-left text-[11px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                                >
                                  +{hiddenCount} more
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {openDay && openDayHiddenEvents.length > 0 && (
            <section
              id={dayPanelId}
              ref={dayPanelRef}
              aria-label={`More events on ${cellLabel(openDay)}`}
              tabIndex={-1}
              data-slot="calendar-scheduler-day-panel"
              data-day={openDayKey ?? undefined}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === 'Escape') {
                  keyEvent.preventDefault();
                  closeDayPanel();
                }
              }}
              className="rounded-lg border border-input bg-background p-3 outline-none"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3
                  data-slot="calendar-scheduler-day-panel-title"
                  className="text-sm font-semibold text-foreground"
                >
                  More events on {cellLabel(openDay)}
                </h3>
                <button
                  type="button"
                  data-slot="calendar-scheduler-day-panel-close"
                  aria-label={`Close more events on ${cellLabel(openDay)}`}
                  onClick={closeDayPanel}
                  className={toolbarButtonClass}
                >
                  Close
                </button>
              </div>
              <CalendarAgendaList
                events={openDayHiddenEvents}
                today={today}
                className="rounded-none border-0"
              />
            </section>
          )}
        </>
      ) : (
        <CalendarAgendaList events={events} today={today} />
      )}
      <p role="status" data-slot="calendar-scheduler-announcer" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

export type { CalendarSchedulerEvent, CalendarView };
export {
  buildMonthGrid,
  CalendarAgendaList,
  CalendarScheduler,
  CalendarToolbar,
  moveEventStart,
  parseEventDate,
};
