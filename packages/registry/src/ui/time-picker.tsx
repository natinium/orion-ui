import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * TimePicker — time selection with hour/minute (and optional seconds)
 * selects, a 12/24h toggle and an optional timezone hint. Controlled:
 * `value` is a "HH:mm" (or "HH:mm:ss") string, `onValueChange` emits the
 * same shape.
 *
 * @example
 * <TimePicker value={time} onValueChange={setTime} hour12 timeZone="GMT+3 Addis Ababa" />
 */
function TimePicker({
  value = '09:00',
  onValueChange,
  hour12 = false,
  withSeconds = false,
  timeZone,
  className,
  ...props
}: TimePickerProps) {
  const [h, m, s] = value.split(':');
  const hour = Number(h ?? 0);
  const minute = Number(m ?? 0);
  const second = Number(s ?? 0);

  const pad = (n: number) => String(n).padStart(2, '0');
  const emit = (nh: number, nm: number, ns = second) => {
    const parts = [pad(nh), pad(nm)];
    if (withSeconds) parts.push(pad(ns));
    onValueChange?.(parts.join(':'));
  };

  const hours = hour12
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const ampm = hour >= 12 ? 'PM' : 'AM';

  return (
    <div
      data-slot="time-picker"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      <div data-slot="time-picker-fields" className="flex items-center gap-2">
        <select
          data-slot="time-picker-hour"
          aria-label="Hour"
          value={hour12 ? (hour % 12 === 0 ? 12 : hour % 12) : hour}
          onChange={(e) => {
            const picked = Number(e.target.value);
            const next = hour12
              ? (picked % 12) + (ampm === 'PM' ? 12 : 0)
              : picked;
            emit(next, minute);
          }}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {hours.map((hr) => (
            <option key={hr} value={hour12 ? hr : pad(hr)}>
              {hour12 ? hr : pad(hr)}
            </option>
          ))}
        </select>
        <span className="text-muted-foreground">:</span>
        <select
          data-slot="time-picker-minute"
          aria-label="Minute"
          value={minute}
          onChange={(e) => emit(hour, Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {minutes.map((min) => (
            <option key={min} value={min}>
              {pad(min)}
            </option>
          ))}
        </select>
        {withSeconds && (
          <select
            data-slot="time-picker-second"
            aria-label="Second"
            value={second}
            onChange={(e) => emit(hour, minute, Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {minutes.map((sec) => (
              <option key={sec} value={sec}>
                {pad(sec)}
              </option>
            ))}
          </select>
        )}
        {hour12 && (
          <select
            data-slot="time-picker-ampm"
            aria-label="AM or PM"
            value={ampm}
            onChange={(e) => {
              const next = e.target.value === 'PM' ? (hour % 12) + 12 : hour % 12;
              emit(next, minute);
            }}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        )}
      </div>
      {timeZone && (
        <p data-slot="time-picker-tz" className="text-xs text-muted-foreground">
          {timeZone}
        </p>
      )}
    </div>
  );
}

interface TimePickerProps extends React.ComponentProps<'div'> {
  /** "HH:mm" or "HH:mm:ss" (with withSeconds) */
  value?: string;
  onValueChange?: (value: string) => void;
  hour12?: boolean;
  withSeconds?: boolean;
  timeZone?: string;
}

export { TimePicker };
