import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  buildMonthGrid,
  CalendarScheduler,
  type CalendarSchedulerEvent,
  moveEventStart,
  parseEventDate,
} from '../src/ui/calendar-scheduler';

// The clock is frozen for the whole file: every helper, render and assertion
// below derives from this instant, so a midnight or month-boundary rollover
// between helper evaluation, render and assertion cannot desync dates.
const FROZEN_NOW = new Date(2026, 10, 15, 12, 0, 0); // 2026-11-15 12:00 local

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FROZEN_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD HH:mm" for `day` of the current month — local, timezone-deterministic. */
const eventDate = (day: number, hour = 14, minute = 30) => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
};

/** "YYYY-MM-DD HH:mm" relative to today (rolls over month/year edges). */
const offsetDate = (days: number, hour = 9, minute = 0) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, minute);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(hour)}:${pad(minute)}`;
};

const ymd = (day: number) => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(day)}`;
};

/** Accessible name of a day cell, e.g. "November 15, 2026". */
const cellName = (day: number) => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(now.getFullYear(), now.getMonth(), day));
};

/** Visible month title for a month offset from the current one, e.g. "November 2026". */
const monthTitle = (monthOffset: number) => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
  );
};

const ev = (
  id: string,
  title: string,
  start: string,
  end: string,
  color?: string,
): CalendarSchedulerEvent =>
  color === undefined ? { id, title, start, end } : { id, title, start, end, color };

const makeDataTransfer = () => {
  const data = new Map<string, string>();
  return {
    setData: (type: string, value: string) => void data.set(type, value),
    getData: (type: string) => data.get(type) ?? '',
    effectAllowed: 'all',
  };
};

/** Any literal Tailwind palette color class — components must ship tokens only. */
const HARDCODED_COLOR_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|caret|decoration|from|via|to|accent)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;

describe('CalendarScheduler', () => {
  it('renders the root with its data-slot and forwards native props', () => {
    render(<CalendarScheduler events={[]} data-testid="scheduler-root" id="my-calendar" />);
    const root = screen.getByTestId('scheduler-root');
    expect(root).toHaveAttribute('data-slot', 'calendar-scheduler');
    expect(root).toHaveAttribute('id', 'my-calendar');
  });

  it('merges consumer className without losing the base classes', () => {
    render(<CalendarScheduler events={[]} className="mt-2" />);
    const root = document.querySelector('[data-slot="calendar-scheduler"]');
    expect(root).toHaveClass('mt-2');
    expect(root).toHaveClass('flex');
  });

  it('renders the month title, a labeled toolbar group and the seven weekday headers', () => {
    render(<CalendarScheduler events={[]} />);
    expect(screen.getByRole('group', { name: 'Calendar toolbar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: monthTitle(0) })).toBeInTheDocument();
    const weekdays = screen.getAllByRole('columnheader');
    expect(weekdays).toHaveLength(7);
    expect(weekdays.map((wd) => wd.textContent)).toEqual([
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ]);
  });

  it('renders an event chip inside the correct day cell', () => {
    render(
      <CalendarScheduler
        events={[ev('evt-1', 'Design review', eventDate(15), eventDate(15, 16))]}
      />,
    );
    const cell = screen.getByRole('cell', { name: cellName(15) });
    expect(within(cell).getByText('Design review')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Design review on ${cellName(15)}` }),
    ).toBeInTheDocument();
  });

  it('builds the month grid with real date math (6 weeks, dimmed outside days)', () => {
    const now = new Date();
    render(<CalendarScheduler events={[]} />);
    const cells = screen.getAllByRole('cell');
    expect(cells).toHaveLength(42);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const outside = document.querySelectorAll('[data-outside="true"]');
    expect(outside).toHaveLength(42 - daysInMonth);

    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const gridStart = new Date(now.getFullYear(), now.getMonth(), 1 - firstOfMonth.getDay());
    expect(cells[0]).toHaveAccessibleName(
      new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
        gridStart,
      ),
    );
  });

  it('highlights today with aria-current="date"', () => {
    render(<CalendarScheduler events={[]} />);
    const todayCell = document.querySelector('[aria-current="date"]');
    expect(todayCell).not.toBeNull();
    expect(todayCell).toHaveAttribute('data-today', 'true');
    expect(todayCell).toHaveAccessibleName(cellName(new Date().getDate()));
  });

  it('navigates previous/next/today from the toolbar', () => {
    render(<CalendarScheduler events={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { level: 2, name: monthTitle(1) })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('heading', { level: 2, name: monthTitle(0) })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByRole('heading', { level: 2, name: monthTitle(0) })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: monthTitle(1) }),
    ).not.toBeInTheDocument();
  });

  it('stores the dragged event id on dataTransfer during dragstart', () => {
    const dataTransfer = makeDataTransfer();
    render(
      <CalendarScheduler
        events={[ev('evt-1', 'Design review', eventDate(15), eventDate(15, 16))]}
      />,
    );
    const chip = screen.getByRole('button', { name: `Design review on ${cellName(15)}` });
    fireEvent.dragStart(chip, { dataTransfer });
    expect(dataTransfer.getData('text/plain')).toBe('evt-1');
    expect(dataTransfer.effectAllowed).toBe('move');
  });

  it('fires onEventMove with the new date (time preserved) when a chip is dropped on a day cell', () => {
    const onEventMove = vi.fn();
    const dataTransfer = makeDataTransfer();
    render(
      <CalendarScheduler
        events={[ev('evt-1', 'Design review', eventDate(15, 14, 30), eventDate(15, 16))]}
        onEventMove={onEventMove}
      />,
    );
    fireEvent.dragStart(screen.getByRole('button', { name: `Design review on ${cellName(15)}` }), {
      dataTransfer,
    });
    fireEvent.drop(screen.getByRole('cell', { name: cellName(20) }), { dataTransfer });
    expect(onEventMove).toHaveBeenCalledTimes(1);
    expect(onEventMove).toHaveBeenCalledWith('evt-1', `${ymd(20)}T14:30`);
  });

  it('ignores drops whose dataTransfer holds an unknown event id', () => {
    const onEventMove = vi.fn();
    render(<CalendarScheduler events={[]} onEventMove={onEventMove} />);
    fireEvent.drop(screen.getByRole('cell', { name: cellName(10) }), {
      dataTransfer: { getData: () => 'nope' },
    });
    expect(onEventMove).not.toHaveBeenCalled();
  });

  describe('keyboard support', () => {
    it('activates onSelectEvent with Enter and Space on a focused chip', () => {
      const onSelectEvent = vi.fn();
      const event = ev('evt-1', 'Design review', eventDate(15), eventDate(15, 16));
      render(<CalendarScheduler events={[event]} onSelectEvent={onSelectEvent} />);
      const chip = screen.getByRole('button', { name: `Design review on ${cellName(15)}` });
      chip.focus();
      fireEvent.keyDown(chip, { key: 'Enter' });
      expect(onSelectEvent).toHaveBeenCalledTimes(1);
      expect(onSelectEvent).toHaveBeenCalledWith(event);
      fireEvent.keyDown(chip, { key: ' ' });
      expect(onSelectEvent).toHaveBeenCalledTimes(2);
    });

    it('reschedules with arrow keys from a focused chip (day/week deltas, time preserved)', () => {
      const onEventMove = vi.fn();
      render(
        <CalendarScheduler
          events={[ev('evt-1', 'Design review', eventDate(15, 14, 30), eventDate(15, 16))]}
          onEventMove={onEventMove}
        />,
      );
      const chip = screen.getByRole('button', { name: `Design review on ${cellName(15)}` });
      chip.focus();
      fireEvent.keyDown(chip, { key: 'ArrowRight' });
      fireEvent.keyDown(chip, { key: 'ArrowDown' });
      fireEvent.keyDown(chip, { key: 'ArrowLeft' });
      fireEvent.keyDown(chip, { key: 'ArrowUp' });
      expect(onEventMove).toHaveBeenCalledTimes(4);
      expect(onEventMove).toHaveBeenNthCalledWith(1, 'evt-1', `${ymd(16)}T14:30`);
      expect(onEventMove).toHaveBeenNthCalledWith(2, 'evt-1', `${ymd(22)}T14:30`);
      expect(onEventMove).toHaveBeenNthCalledWith(3, 'evt-1', `${ymd(14)}T14:30`);
      expect(onEventMove).toHaveBeenNthCalledWith(4, 'evt-1', `${ymd(8)}T14:30`);
      expect(chip).toHaveFocus();
    });

    it('ignores keys that are not activation or move keys', () => {
      const onEventMove = vi.fn();
      const onSelectEvent = vi.fn();
      render(
        <CalendarScheduler
          events={[ev('evt-1', 'Design review', eventDate(15), eventDate(15, 16))]}
          onEventMove={onEventMove}
          onSelectEvent={onSelectEvent}
        />,
      );
      const chip = screen.getByRole('button', { name: `Design review on ${cellName(15)}` });
      fireEvent.keyDown(chip, { key: 'End' });
      fireEvent.keyDown(chip, { key: 'a' });
      expect(onEventMove).not.toHaveBeenCalled();
      expect(onSelectEvent).not.toHaveBeenCalled();
    });

    it('does not reschedule with arrow keys when onEventMove is not provided', () => {
      render(
        <CalendarScheduler
          events={[ev('evt-1', 'Design review', eventDate(15), eventDate(15, 16))]}
        />,
      );
      const chip = screen.getByRole('button', { name: `Design review on ${cellName(15)}` });
      expect(() => fireEvent.keyDown(chip, { key: 'ArrowRight' })).not.toThrow();
      expect(
        document.querySelector('[data-slot="calendar-scheduler-announcer"]'),
      ).toHaveTextContent('');
    });

    it('keeps focus on the moved chip after the consumer applies the keyboard move', () => {
      const onEventMove = vi.fn();
      const props = {
        onEventMove,
        events: [ev('evt-1', 'Design review', eventDate(15, 14, 30), eventDate(15, 16))],
      };
      const { rerender } = render(<CalendarScheduler {...props} />);
      const chip = screen.getByRole('button', { name: `Design review on ${cellName(15)}` });
      chip.focus();
      fireEvent.keyDown(chip, { key: 'ArrowRight' });
      const newStart = onEventMove.mock.calls[0][1] as string;
      rerender(
        <CalendarScheduler
          onEventMove={onEventMove}
          events={[
            { id: 'evt-1', title: 'Design review', start: newStart, end: eventDate(16, 16) },
          ]}
        />,
      );
      expect(
        screen.getByRole('button', { name: `Design review on ${cellName(16)}` }),
      ).toHaveFocus();
      expect(
        document.querySelector('[data-slot="calendar-scheduler-announcer"]'),
      ).toHaveTextContent(`Design review moved to ${cellName(16)}`);
    });

    it('moves focus to the target day cell when the moved chip is hidden behind "+N more"', () => {
      const onEventMove = vi.fn();
      const busyDay = [
        ev('a', 'Standup', eventDate(16, 9), eventDate(16, 9, 15)),
        ev('b', 'Planning', eventDate(16, 10), eventDate(16, 11)),
        ev('c', 'Lunch', eventDate(16, 12), eventDate(16, 13)),
        ev('d', 'Retro', eventDate(16, 16), eventDate(16, 17)),
      ];
      const props = {
        onEventMove,
        events: [
          ev('mover', 'Design review', eventDate(15, 14, 30), eventDate(15, 16)),
          ...busyDay,
        ],
      };
      const { rerender } = render(<CalendarScheduler {...props} />);
      const chip = screen.getByRole('button', { name: `Design review on ${cellName(15)}` });
      chip.focus();
      fireEvent.keyDown(chip, { key: 'ArrowRight' });
      const newStart = onEventMove.mock.calls[0][1] as string;
      rerender(
        <CalendarScheduler
          onEventMove={onEventMove}
          events={[
            { id: 'mover', title: 'Design review', start: newStart, end: eventDate(16, 16) },
            ...busyDay,
          ]}
        />,
      );
      // The moved chip became the 4th event of its day, so it collapsed behind
      // "+N more" — focus must land on the target day cell, not on <body>.
      expect(screen.queryByRole('button', { name: `Design review on ${cellName(16)}` })).toBeNull();
      expect(screen.getByRole('cell', { name: cellName(16) })).toHaveFocus();
    });
  });

  it('shows at most 3 chips per day and "+N more" expands that day\'s hidden events in a panel', () => {
    const onViewChange = vi.fn();
    render(
      <CalendarScheduler
        onViewChange={onViewChange}
        events={[
          ev('a', 'Standup', eventDate(15, 9), eventDate(15, 9, 15)),
          ev('b', 'Planning', eventDate(15, 10), eventDate(15, 11)),
          ev('c', 'Lunch', eventDate(15, 12), eventDate(15, 13)),
          ev('d', 'Retro', eventDate(15, 16), eventDate(15, 17)),
        ]}
      />,
    );
    const cell = screen.getByRole('cell', { name: cellName(15) });
    expect(within(cell).getAllByRole('button')).toHaveLength(4); // 3 chips + the "+N more"
    const more = within(cell).getByRole('button', { name: /more events? on/i });
    expect(more).toHaveTextContent('+1 more');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Retro')).not.toBeInTheDocument();

    fireEvent.click(more);
    // The panel is scoped to the day and shows the hidden event — not the
    // unscoped agenda of every event in every month.
    const panel = screen.getByRole('region', { name: `More events on ${cellName(15)}` });
    expect(panel).toHaveFocus();
    expect(within(panel).getByText('Retro')).toBeInTheDocument();
    expect(more).toHaveAttribute('aria-expanded', 'true');
    // The month grid stays mounted; no view switch happens or is reported.
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(onViewChange).not.toHaveBeenCalled();

    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(
      screen.queryByRole('region', { name: `More events on ${cellName(15)}` }),
    ).not.toBeInTheDocument();
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveFocus();

    // Reopening and closing via the Close button restores focus the same way.
    fireEvent.click(more);
    expect(screen.getByRole('region', { name: `More events on ${cellName(15)}` })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: `Close more events on ${cellName(15)}` }));
    expect(more).toHaveFocus();
  });

  it('applies the event color as a chip accent without palette classes', () => {
    render(
      <CalendarScheduler
        events={[ev('evt-1', 'Brand sync', eventDate(15), eventDate(15, 16), '#0ea5e9')]}
      />,
    );
    const chip = screen.getByRole('button', { name: `Brand sync on ${cellName(15)}` });
    expect(chip.style.getPropertyValue('--event-color')).toBe('#0ea5e9');
  });

  it('renders a moved event under its new date once the consumer applies onEventMove', () => {
    const onEventMove = vi.fn();
    const dataTransfer = makeDataTransfer();
    const props = {
      onEventMove,
      events: [ev('evt-1', 'Design review', eventDate(15, 9), eventDate(15, 10))],
    };
    const { rerender } = render(<CalendarScheduler {...props} />);
    fireEvent.dragStart(screen.getByRole('button', { name: `Design review on ${cellName(15)}` }), {
      dataTransfer,
    });
    fireEvent.drop(screen.getByRole('cell', { name: cellName(20) }), { dataTransfer });
    const newStart = onEventMove.mock.calls[0][1] as string;

    rerender(
      <CalendarScheduler
        onEventMove={onEventMove}
        events={[{ id: 'evt-1', title: 'Design review', start: newStart, end: eventDate(20, 10) }]}
      />,
    );
    expect(
      within(screen.getByRole('cell', { name: cellName(20) })).getByText('Design review'),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: cellName(15) })).not.toHaveTextContent('Design review');
  });

  it('fires onSelectEvent with the event when a chip is clicked', () => {
    const onSelectEvent = vi.fn();
    const event = ev('evt-1', 'Design review', eventDate(15), eventDate(15, 16));
    render(<CalendarScheduler events={[event]} onSelectEvent={onSelectEvent} />);
    fireEvent.click(screen.getByRole('button', { name: `Design review on ${cellName(15)}` }));
    expect(onSelectEvent).toHaveBeenCalledWith(event);
  });

  it('fires onViewChange when the view is toggled, reflects it with aria-pressed and announces it', () => {
    const onViewChange = vi.fn();
    render(<CalendarScheduler events={[]} onViewChange={onViewChange} />);
    const monthButton = screen.getByRole('button', { name: 'Month' });
    const agendaButton = screen.getByRole('button', { name: 'Agenda' });
    expect(monthButton).toHaveAttribute('aria-pressed', 'true');
    expect(agendaButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(agendaButton);
    expect(onViewChange).toHaveBeenCalledWith('agenda');
    expect(document.querySelector('[data-slot="calendar-scheduler-agenda"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="calendar-scheduler-announcer"]')).toHaveTextContent(
      'Agenda view',
    );
    fireEvent.click(monthButton);
    expect(onViewChange).toHaveBeenCalledWith('month');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="calendar-scheduler-announcer"]')).toHaveTextContent(
      'Month view',
    );
  });

  it('warns in development when events carry duplicate ids', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <CalendarScheduler
          events={[
            ev('dup', 'First', eventDate(15), eventDate(15, 16)),
            ev('dup', 'Second', eventDate(16), eventDate(16, 17)),
          ]}
        />,
      );
      expect(
        errorSpy.mock.calls.some((args) =>
          args.some((arg) => typeof arg === 'string' && arg.includes('Duplicate event id "dup"')),
        ),
      ).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('renders month grid, day panel and agenda exclusively with theme tokens (dark/light parity)', () => {
    document.documentElement.classList.add('dark');
    try {
      const events = [
        ev('brand', 'Brand sync', eventDate(15, 9), eventDate(15, 10), '#0ea5e9'),
        ev('a', 'Standup', eventDate(15, 11), eventDate(15, 11, 15)),
        ev('b', 'Planning', eventDate(15, 12), eventDate(15, 13)),
        ev('d', 'Retro', eventDate(15, 16), eventDate(15, 17)),
      ];
      render(<CalendarScheduler events={events} data-testid="month-scheduler" />);
      fireEvent.click(
        within(screen.getByTestId('month-scheduler')).getByRole('button', {
          name: /more events? on/i,
        }),
      );
      render(
        <CalendarScheduler events={events} defaultView="agenda" data-testid="agenda-scheduler" />,
      );

      // No element in month view, the "+N more" day panel or the agenda view
      // may hardcode a palette color — parity comes from tokens in both themes.
      for (const element of document.querySelectorAll<HTMLElement>('*')) {
        expect(element.getAttribute('class') ?? '', element.dataset.slot).not.toMatch(
          HARDCODED_COLOR_CLASS,
        );
      }

      // Consumer colors ride a CSS variable, never an inline color, so text
      // contrast stays token-driven in dark and light alike.
      const chip = within(screen.getByTestId('month-scheduler')).getByRole('button', {
        name: `Brand sync on ${cellName(15)}`,
      });
      expect(chip.style.getPropertyValue('--event-color')).toBe('#0ea5e9');
      expect(chip.style.color).toBe('');
      expect(chip.style.backgroundColor).toBe('');
    } finally {
      document.documentElement.classList.remove('dark');
    }
  });

  describe('agenda view', () => {
    it('lists events grouped by date in chronological order', () => {
      render(
        <CalendarScheduler
          defaultView="agenda"
          events={[
            ev('far', 'Quarterly roadmap', offsetDate(3, 13), offsetDate(3, 14)),
            ev('today', 'Standup', offsetDate(0, 9), offsetDate(0, 9, 15)),
            ev('tomorrow', 'Design review', offsetDate(1, 14, 30), offsetDate(1, 16)),
          ]}
        />,
      );
      const headings = screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent);
      expect(headings[0]).toBe('Today');
      expect(headings[1]).toBe('Tomorrow');
      expect(headings[2]).toBeDefined();
      expect(headings[2]).not.toBe('Today');
      expect(headings[2]).not.toBe('Tomorrow');
      expect(screen.getByText('Standup')).toBeInTheDocument();
      expect(screen.getByText('Design review')).toBeInTheDocument();
      expect(screen.getByText('Quarterly roadmap')).toBeInTheDocument();
    });

    it('sorts events within a day by start time', () => {
      render(
        <CalendarScheduler
          defaultView="agenda"
          events={[
            ev('late', 'Roadmap review', offsetDate(0, 13), offsetDate(0, 15)),
            ev('early', 'Morning standup', offsetDate(0, 9), offsetDate(0, 9, 15)),
          ]}
        />,
      );
      const day = document.querySelector('[data-slot="calendar-scheduler-agenda-day"]');
      expect(day).not.toBeNull();
      const items = within(day as HTMLElement).getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('Morning standup');
      expect(items[1]).toHaveTextContent('Roadmap review');
      expect(within(items[0] as HTMLElement).getByText('09:00 – 09:15')).toBeInTheDocument();
    });

    it('shows an empty message without events', () => {
      render(<CalendarScheduler defaultView="agenda" events={[]} />);
      expect(
        document.querySelector('[data-slot="calendar-scheduler-agenda-empty"]'),
      ).toHaveTextContent('No events scheduled.');
    });
  });

  describe('sub-slots', () => {
    it('carries data-slot attributes on the month view parts', () => {
      render(
        <CalendarScheduler
          events={[ev('evt-1', 'Design review', eventDate(15, 9), eventDate(15, 10))]}
        />,
      );
      for (const slot of [
        'calendar-scheduler',
        'calendar-scheduler-toolbar',
        'calendar-scheduler-title',
        'calendar-scheduler-previous',
        'calendar-scheduler-next',
        'calendar-scheduler-today',
        'calendar-scheduler-view-month',
        'calendar-scheduler-view-agenda',
        'calendar-scheduler-grid',
        'calendar-scheduler-weekday',
        'calendar-scheduler-cell',
        'calendar-scheduler-day-number',
        'calendar-scheduler-chip',
        'calendar-scheduler-chip-dot',
        'calendar-scheduler-announcer',
      ]) {
        expect(document.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
      }
    });

    it('carries data-slot attributes on the day panel parts', () => {
      render(
        <CalendarScheduler
          events={[
            ev('a', 'Standup', eventDate(15, 9), eventDate(15, 9, 15)),
            ev('b', 'Planning', eventDate(15, 10), eventDate(15, 11)),
            ev('c', 'Lunch', eventDate(15, 12), eventDate(15, 13)),
            ev('d', 'Retro', eventDate(15, 16), eventDate(15, 17)),
          ]}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /more events? on/i }));
      for (const slot of [
        'calendar-scheduler-day-panel',
        'calendar-scheduler-day-panel-title',
        'calendar-scheduler-day-panel-close',
      ]) {
        expect(document.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
      }
    });

    it('carries data-slot attributes on the agenda parts', () => {
      render(
        <CalendarScheduler
          defaultView="agenda"
          events={[ev('evt-1', 'Design review', offsetDate(0, 9), offsetDate(0, 10))]}
        />,
      );
      for (const slot of [
        'calendar-scheduler-agenda',
        'calendar-scheduler-agenda-day',
        'calendar-scheduler-agenda-date',
        'calendar-scheduler-agenda-items',
        'calendar-scheduler-agenda-item',
        'calendar-scheduler-agenda-item-time',
        'calendar-scheduler-agenda-item-title',
      ]) {
        expect(document.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
      }
    });
  });

  describe('pure helpers', () => {
    it('buildMonthGrid returns six Sunday-started weeks fully covering each month', () => {
      for (const year of [2026, 2028]) {
        for (let month = 0; month < 12; month++) {
          const grid = buildMonthGrid(year, month);
          expect(grid).toHaveLength(42);
          expect(grid[0].getDay()).toBe(0);
          const first = new Date(year, month, 1);
          const last = new Date(year, month + 1, 0);
          expect(grid[0].getTime()).toBeLessThanOrEqual(first.getTime());
          expect(grid[41].getTime()).toBeGreaterThanOrEqual(last.getTime());
          for (let i = 1; i < grid.length; i++) {
            expect(Math.round((grid[i].getTime() - grid[i - 1].getTime()) / 86_400_000)).toBe(1);
          }
        }
      }
    });

    it('moveEventStart keeps the original time-of-day and handles date-only starts', () => {
      expect(moveEventStart({ start: '2026-03-05 14:30' }, new Date(2026, 2, 20))).toBe(
        '2026-03-20T14:30',
      );
      expect(moveEventStart({ start: '2026-03-05' }, new Date(2026, 2, 20))).toBe(
        '2026-03-20T00:00',
      );
      expect(moveEventStart({ start: '2026-03-05T08:05' }, new Date(2026, 2, 20))).toBe(
        '2026-03-20T08:05',
      );
      expect(moveEventStart({ start: 'not a date' }, new Date(2026, 2, 20))).toBeNull();
    });

    it('parseEventDate parses supported local forms', () => {
      expect(parseEventDate('2026-11-15')).toEqual(new Date(2026, 10, 15));
      expect(parseEventDate('2026-11-15 14:30')).toEqual(new Date(2026, 10, 15, 14, 30));
      expect(parseEventDate('2026-11-15T14:30')).toEqual(new Date(2026, 10, 15, 14, 30));
      expect(parseEventDate('2026-11-15T14:30:05')).toEqual(new Date(2026, 10, 15, 14, 30, 5));
      expect(parseEventDate(' 2026-11-15 14:30 ')).toEqual(new Date(2026, 10, 15, 14, 30));
    });

    it('parseEventDate falls back to Date for full ISO strings and unparseable input', () => {
      expect(parseEventDate('2026-11-15T14:30:00Z')).toEqual(new Date('2026-11-15T14:30:00Z'));
      expect(parseEventDate('not a date')).toBeNull();
    });

    it('parseEventDate rejects out-of-range fields instead of rolling over', () => {
      expect(parseEventDate('2026-02-30')).toBeNull();
      expect(parseEventDate('2026-13-01')).toBeNull();
      expect(parseEventDate('2026-0-0')).toBeNull();
      expect(parseEventDate('2026-11-15 25:99')).toBeNull();
      expect(parseEventDate('2026-11-31')).toBeNull();
      expect(parseEventDate('2026-11-15 23:60')).toBeNull();
      expect(parseEventDate('2026-02-29')).toBeNull(); // 2026 is not a leap year
      expect(parseEventDate('2028-02-29')).toEqual(new Date(2028, 1, 29)); // leap day is valid
      expect(parseEventDate('2026-11-15 00:00')).toEqual(new Date(2026, 10, 15, 0, 0));
    });
  });
});
