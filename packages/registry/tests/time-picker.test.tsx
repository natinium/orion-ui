import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimePicker } from '../src/ui/time-picker';

describe('TimePicker', () => {
  it('renders 24h hour and minute fields by default, no seconds', () => {
    render(<TimePicker value="13:45" />);
    expect(screen.getByLabelText('Hour')).toHaveValue('13');
    expect(screen.getByLabelText('Minute')).toHaveValue('45');
    expect(screen.queryByLabelText('Second')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('AM or PM')).not.toBeInTheDocument();
  });

  it('emits the padded value on change', () => {
    const onValueChange = vi.fn();
    render(<TimePicker value="09:05" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText('Hour'), { target: { value: '14' } });
    expect(onValueChange).toHaveBeenCalledWith('14:05');
    fireEvent.change(screen.getByLabelText('Minute'), { target: { value: '7' } });
    expect(onValueChange).toHaveBeenCalledWith('09:07');
  });

  it('renders seconds granularity when withSeconds', () => {
    const onValueChange = vi.fn();
    render(<TimePicker value="09:05:30" onValueChange={onValueChange} withSeconds />);
    expect(screen.getByLabelText('Second')).toHaveValue('30');
    fireEvent.change(screen.getByLabelText('Second'), { target: { value: '59' } });
    expect(onValueChange).toHaveBeenCalledWith('09:05:59');
  });

  it('handles 12h mode with an AM/PM select', () => {
    const onValueChange = vi.fn();
    render(<TimePicker value="13:45" onValueChange={onValueChange} hour12 />);
    expect(screen.getByLabelText('AM or PM')).toHaveValue('PM');
    expect(screen.getByLabelText('Hour')).toHaveValue('1');
    fireEvent.change(screen.getByLabelText('AM or PM'), { target: { value: 'AM' } });
    expect(onValueChange).toHaveBeenCalledWith('01:45');
  });

  it('shows the timezone hint when provided', () => {
    render(<TimePicker timeZone="GMT+3 · Addis Ababa" />);
    expect(screen.getByText('GMT+3 · Addis Ababa')).toHaveAttribute(
      'data-slot',
      'time-picker-tz',
    );
  });
});
