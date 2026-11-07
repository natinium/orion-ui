import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModelSelector, type ModelSelectorModel } from '../src/ui/model-selector';

const models: ModelSelectorModel[] = [
  { id: 'gpt-5', label: 'GPT-5', provider: 'OpenAI', capabilities: ['vision', 'tools'] },
  { id: 'gpt-5-mini', label: 'GPT-5 mini', provider: 'OpenAI', capabilities: ['fast'] },
  {
    id: 'claude-sonnet',
    label: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    capabilities: ['vision'],
  },
  { id: 'gemini-pro', label: 'Gemini 3 Pro', provider: 'Google', capabilities: ['tools'] },
];

function optionOf(label: string): HTMLElement {
  // Scope to the listbox so the trigger (which shows the selected label) never matches.
  const labelEl = within(screen.getByRole('listbox')).getByText(label);
  const option = labelEl.closest('[data-slot="model-selector-option"]');
  expect(option).not.toBeNull();
  return option as HTMLElement;
}

// Floor contract for model-selector — extended with real behavioral cases.
describe('ModelSelector', () => {
  it('renders with the data-slot attribute', () => {
    render(<ModelSelector models={[]}>Content</ModelSelector>);
    expect(screen.getByText('Content')).toHaveAttribute('data-slot', 'model-selector');
  });

  it('merges custom className without losing the base classes', () => {
    render(
      <ModelSelector models={[]} className="mt-2">
        C
      </ModelSelector>,
    );
    const el = screen.getByText('C');
    expect(el).toHaveClass('mt-2');
    expect(el).toHaveClass('flex');
  });

  it('forwards native props', () => {
    render(
      <ModelSelector models={[]} data-testid="model-selector-el">
        P
      </ModelSelector>,
    );
    expect(screen.getByTestId('model-selector-el')).toBeInTheDocument();
  });

  it('groups options under provider headers in first-appearance order', () => {
    render(<ModelSelector models={models} open />);
    const openAi = screen.getByRole('group', { name: 'OpenAI' });
    expect(within(openAi).getByText('GPT-5')).toBeInTheDocument();
    expect(within(openAi).getByText('GPT-5 mini')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Anthropic' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Google' })).toBeInTheDocument();
    // OpenAI was first in the models array, so its header leads the listbox.
    const labels = screen.getAllByText(/^(OpenAI|Anthropic|Google)$/).map((el) => el.textContent);
    expect(labels).toEqual(['OpenAI', 'Anthropic', 'Google']);
  });

  it('filters options by label or provider as you search', () => {
    render(<ModelSelector models={models} open />);
    const search = screen.getByRole('combobox');
    fireEvent.change(search, { target: { value: 'claude' } });
    expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument();
    expect(screen.queryByText('GPT-5')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'openai' } });
    expect(screen.getByText('GPT-5')).toBeInTheDocument();
    expect(screen.getByText('GPT-5 mini')).toBeInTheDocument();
    expect(screen.queryByText('Claude Sonnet 4.5')).not.toBeInTheDocument();
  });

  it('shows an empty status and no listbox when nothing matches', () => {
    render(<ModelSelector models={models} open />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz' } });
    expect(screen.getByRole('status')).toHaveTextContent('No models found.');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('fires onValueChange and closes through onOpenChange when an option is chosen', () => {
    const onValueChange = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ModelSelector
        models={models}
        open
        onValueChange={onValueChange}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.click(screen.getByText('Claude Sonnet 4.5'));
    expect(onValueChange).toHaveBeenCalledWith('claude-sonnet');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders capability badges on each option row', () => {
    render(<ModelSelector models={models} open />);
    const gpt5 = optionOf('GPT-5');
    expect(within(gpt5).getByText('vision')).toBeInTheDocument();
    expect(within(gpt5).getByText('tools')).toBeInTheDocument();
    expect(within(gpt5).queryByText('fast')).not.toBeInTheDocument();
    expect(within(optionOf('GPT-5 mini')).getByText('fast')).toBeInTheDocument();
  });

  it('stays closed while controlled and notifies onOpenChange from the trigger', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ModelSelector models={models} open={false} onOpenChange={onOpenChange} />,
    );
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select a model' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Still controlled — the panel only opens when the prop flips.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    rerender(<ModelSelector models={models} open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('renders the selected model label in the trigger', () => {
    render(<ModelSelector models={models} value="claude-sonnet" />);
    expect(screen.getByRole('button', { name: 'Claude Sonnet 4.5' })).toHaveAttribute(
      'aria-haspopup',
      'listbox',
    );
  });

  it('shows the placeholder in the trigger when nothing is selected', () => {
    render(<ModelSelector models={models} />);
    expect(screen.getByRole('button', { name: 'Select a model' })).toBeInTheDocument();
  });

  it('moves the active option with ArrowDown and selects it with Enter', () => {
    const onValueChange = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ModelSelector
        models={models}
        open
        onValueChange={onValueChange}
        onOpenChange={onOpenChange}
      />,
    );
    const search = screen.getByRole('combobox');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    const option = optionOf('GPT-5 mini');
    expect(option).toHaveAttribute('data-active', 'true');
    expect(search.getAttribute('aria-activedescendant')).toBe(option.id);
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalledWith('gpt-5-mini');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes through onOpenChange when Escape is pressed', () => {
    const onOpenChange = vi.fn();
    render(<ModelSelector models={models} open onOpenChange={onOpenChange} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('ignores IME composition keys instead of moving, selecting or closing', () => {
    const onValueChange = vi.fn();
    render(<ModelSelector models={models} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select a model' }));
    const search = screen.getByRole('combobox');
    // Chrome/Firefox mark composition-phase keydowns with isComposing (and
    // the legacy IME keyCode 229): the input method owns ArrowDown/ArrowUp
    // (candidate navigation), Enter (commit) and Escape (cancel), so the
    // listbox must not preventDefault them or react to them.
    const arrow = createEvent.keyDown(search, { key: 'ArrowDown', isComposing: true });
    fireEvent(search, arrow);
    expect(arrow.defaultPrevented).toBe(false);
    expect(search.getAttribute('aria-activedescendant')).toBe(optionOf('GPT-5').id);
    const enter = createEvent.keyDown(search, { key: 'Enter', isComposing: true });
    fireEvent(search, enter);
    expect(enter.defaultPrevented).toBe(false);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const escapeKeyDown = createEvent.keyDown(search, { key: 'Escape', keyCode: 229 });
    fireEvent(search, escapeKeyDown);
    expect(escapeKeyDown.defaultPrevented).toBe(false);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // Once the composition is over, the keys drive the listbox again.
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(search.getAttribute('aria-activedescendant')).toBe(optionOf('GPT-5 mini').id);
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalledWith('gpt-5-mini');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('falls back to internal open state when open is uncontrolled', () => {
    render(<ModelSelector models={models} />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select a model' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select a model' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marks the selected option with aria-selected and data-selected', () => {
    render(<ModelSelector models={models} value="gpt-5" open />);
    const selected = optionOf('GPT-5');
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(selected).toHaveAttribute('data-selected', 'true');
    expect(optionOf('GPT-5 mini')).toHaveAttribute('aria-selected', 'false');
  });
});
