import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MultiSelect, TagsInput } from '../src/ui/input-extras';

const OPTIONS = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
];

describe('MultiSelect', () => {
  it('renders the trigger with placeholder and data-slot', () => {
    render(<MultiSelect options={OPTIONS} placeholder="Pick frameworks…" />);
    expect(screen.getByRole('button', { name: /pick frameworks/i })).toHaveAttribute(
      'data-slot',
      'multi-select-trigger',
    );
  });

  it('opens the listbox and filters options as you type', () => {
    render(<MultiSelect options={OPTIONS} />);
    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Filter options…'), { target: { value: 'vue' } });
    expect(screen.getByRole('option', { name: 'Vue' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'React' })).not.toBeInTheDocument();
  });

  it('selects an option and renders a removable badge', () => {
    const onValueChange = vi.fn();
    render(<MultiSelect options={OPTIONS} value={['react']} onValueChange={onValueChange} />);
    expect(screen.getByText('React')).toHaveAttribute('data-slot', 'multi-select-badge');
    fireEvent.click(screen.getByRole('button', { name: 'Remove React' }));
    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it('toggle-selects from the open listbox', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <MultiSelect options={OPTIONS} value={['react']} onValueChange={onValueChange} />,
    );
    fireEvent.click(container.querySelector('[data-slot="multi-select-trigger"]') as HTMLElement);
    fireEvent.click(screen.getByRole('option', { name: 'Vue' }));
    expect(onValueChange).toHaveBeenCalledWith(['react', 'vue']);
  });

  it('Backspace on an empty filter removes the last selection', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <MultiSelect options={OPTIONS} value={['react', 'vue']} onValueChange={onValueChange} />,
    );
    fireEvent.click(container.querySelector('[data-slot="multi-select-trigger"]') as HTMLElement);
    fireEvent.keyDown(screen.getByPlaceholderText('Filter options…'), { key: 'Backspace' });
    expect(onValueChange).toHaveBeenCalledWith(['react']);
  });
});

describe('TagsInput', () => {
  it('adds a tag on Enter and renders it as a removable badge', () => {
    const onValueChange = vi.fn();
    render(<TagsInput value={[]} onValueChange={onValueChange} />);
    const input = screen.getByPlaceholderText('Add tag…');
    fireEvent.change(input, { target: { value: 'design' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalledWith(['design']);
  });

  it('does not add duplicate or empty tags', () => {
    const onValueChange = vi.fn();
    render(<TagsInput value={['design']} onValueChange={onValueChange} />);
    const input = screen.getByPlaceholderText('Add tag…');
    fireEvent.change(input, { target: { value: 'design' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('removes a tag via its remove button', () => {
    const onValueChange = vi.fn();
    render(<TagsInput value={['design']} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove design' }));
    expect(onValueChange).toHaveBeenCalledWith([]);
  });
});
