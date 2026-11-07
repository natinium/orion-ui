import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageRevisions } from '../src/ui/message-revisions';

// Same contract as the chat-shell suite: every surface is themed by tokens
// (bg-*, text-*, border-* referencing CSS variables), never by a hardcoded
// palette step — that is what keeps dark and light in parity.
const HARDCODED_COLOR_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|divide|outline|caret|decoration|from|via|to|accent)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;

describe('MessageRevisions', () => {
  it('renders the content with data-slot and merges className', () => {
    render(<MessageRevisions content="First draft." className="mt-2" data-testid="rev-el" />);
    const content = screen.getByText('First draft.');
    expect(content).toHaveAttribute('data-slot', 'message-revisions-content');
    expect(screen.getByTestId('rev-el')).toHaveClass('mt-2');
    expect(screen.getByTestId('rev-el')).toHaveClass('flex-col');
  });

  it('hides the branch picker when there is nothing to branch between', () => {
    render(<MessageRevisions content="Only one." />);
    render(<MessageRevisions content="Also one." total={1} />);
    expect(screen.queryByRole('button', { name: 'Previous branch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next branch' })).not.toBeInTheDocument();
  });

  it('starts on the latest branch (index defaults to total) and shows the position', () => {
    render(<MessageRevisions content="Answer." total={3} />);
    expect(screen.getByText('3/3')).toHaveAttribute('data-slot', 'message-revisions-position');
    expect(screen.getByRole('button', { name: 'Next branch' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous branch' })).toBeEnabled();
  });

  it('honors the index prop as the starting branch', () => {
    render(<MessageRevisions content="Answer." total={3} index={1} />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous branch' })).toBeDisabled();
  });

  it('navigates with clamping and reports each change', () => {
    const onBranchChange = vi.fn();
    render(<MessageRevisions content="Answer." total={3} onBranchChange={onBranchChange} />);
    const next = screen.getByRole('button', { name: 'Next branch' });
    const prev = screen.getByRole('button', { name: 'Previous branch' });

    // At 3/3 the next button is disabled — clamping, not wrapping.
    fireEvent.click(next);
    expect(onBranchChange).not.toHaveBeenCalled();
    expect(screen.getByText('3/3')).toBeInTheDocument();

    fireEvent.click(prev);
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(onBranchChange).toHaveBeenLastCalledWith(2);

    fireEvent.click(prev);
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(onBranchChange).toHaveBeenLastCalledWith(1);
    expect(prev).toBeDisabled();

    fireEvent.click(next);
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(onBranchChange).toHaveBeenLastCalledWith(2);
  });

  it('enters edit mode with the current text in a labeled textarea', () => {
    render(<MessageRevisions content="Deploy finished in 42s." total={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const textarea = screen.getByRole('textbox', { name: 'Edit message' });
    expect(textarea).toHaveValue('Deploy finished in 42s.');
    // The picker stands down while editing; save/cancel take the toolbar.
    expect(screen.queryByRole('button', { name: 'Previous branch' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('save commits the edited text through onEdit and echoes it in place', () => {
    const onEdit = vi.fn();
    render(<MessageRevisions content="Deploy finished in 42s." onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const textarea = screen.getByRole('textbox', { name: 'Edit message' });
    fireEvent.change(textarea, { target: { value: 'Deploy finished in 41s.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith('Deploy finished in 41s.');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Deploy finished in 41s.')).toBeInTheDocument();
  });

  it('escape cancels editing: no onEdit call, original text stays', () => {
    const onEdit = vi.fn();
    render(<MessageRevisions content="Original text." onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit message' }), {
      target: { value: 'Half-typed revision' },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Edit message' }), { key: 'Escape' });
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Original text.')).toBeInTheDocument();
  });

  it('the visible Cancel button cancels without saving', () => {
    const onEdit = vi.fn();
    render(<MessageRevisions content="Original text." onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText('Original text.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('moves focus into the textarea when editing starts, and back to the Edit button on Escape', () => {
    render(<MessageRevisions content="Original text." onEdit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('textbox', { name: 'Edit message' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Edit message' }), { key: 'Escape' });
    // The textarea unmounted — keyboard users must not land on <body>.
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();
  });

  it('restores focus to the Edit button after Save and after Cancel', () => {
    const onEdit = vi.fn();
    render(<MessageRevisions content="Original text." onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('follows the content prop on rerender until a local edit exists', () => {
    const { rerender } = render(<MessageRevisions content="Version 1." />);
    expect(screen.getByText('Version 1.')).toBeInTheDocument();
    rerender(<MessageRevisions content="Version 2." />);
    expect(screen.getByText('Version 2.')).toBeInTheDocument();

    // A saved local edit wins over later content changes.
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit message' }), {
      target: { value: 'My edit.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    rerender(<MessageRevisions content="Version 3." />);
    expect(screen.getByText('My edit.')).toBeInTheDocument();
  });

  it('localizes every user-facing string via labels', () => {
    render(
      <MessageRevisions
        content="Réponse."
        total={2}
        labels={{
          edit: 'Modifier',
          save: 'Enregistrer',
          cancel: 'Annuler',
          editMessage: 'Modifier le message',
          previousBranch: 'Branche précédente',
          nextBranch: 'Branche suivante',
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Branche précédente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Branche suivante' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByRole('textbox', { name: 'Modifier le message' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });

  it('renders every surface with theme tokens only (dark/light parity)', () => {
    document.documentElement.classList.add('dark');
    try {
      const { container } = render(
        <MessageRevisions content="Answer." total={2} onBranchChange={() => {}} />,
      );
      for (const element of container.querySelectorAll<HTMLElement>('*')) {
        expect(element.getAttribute('class') ?? '', element.dataset.slot).not.toMatch(
          HARDCODED_COLOR_CLASS,
        );
      }
    } finally {
      document.documentElement.classList.remove('dark');
    }
  });
});
