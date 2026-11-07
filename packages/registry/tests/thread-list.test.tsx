import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreadList, ThreadListSearch, type ThreadListThread } from '../src/ui/thread-list';

const baseThreads: ThreadListThread[] = [
  {
    id: 't1',
    title: 'Refactor auth flow',
    preview: 'Split the token refresh out of the middleware',
    unread: true,
    updatedAt: '2026-11-03T10:00:00Z',
  },
  {
    id: 't2',
    title: 'Billing migration',
    preview: 'Move invoices to D1',
    pinned: true,
    updatedAt: '2026-11-01T09:00:00Z',
  },
  {
    id: 't3',
    title: 'Onboarding copy',
    preview: 'Tighten step two',
    updatedAt: '2026-11-05T08:00:00Z',
  },
];

function itemOf(title: string): HTMLElement {
  const titleEl = screen.getByText(title);
  const item = titleEl.closest('[data-slot="thread-list-item"]');
  expect(item).not.toBeNull();
  return item as HTMLElement;
}

// Floor contract for thread-list — extended with real behavioral cases.
describe('ThreadList', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with the data-slot attribute', () => {
    render(<ThreadList threads={[]}>Content</ThreadList>);
    expect(screen.getByText('Content')).toHaveAttribute('data-slot', 'thread-list');
  });

  it('merges custom className without losing the base classes', () => {
    render(
      <ThreadList threads={[]} className="mt-2">
        C
      </ThreadList>,
    );
    const el = screen.getByText('C');
    expect(el).toHaveClass('mt-2');
    expect(el).toHaveClass('flex');
  });

  it('forwards native props', () => {
    render(
      <ThreadList threads={[]} data-testid="thread-list-el">
        P
      </ThreadList>,
    );
    expect(screen.getByTestId('thread-list-el')).toBeInTheDocument();
  });

  it('renders every thread with its title and preview line', () => {
    render(<ThreadList threads={baseThreads} />);
    expect(screen.getByText('Refactor auth flow')).toBeInTheDocument();
    expect(screen.getByText('Split the token refresh out of the middleware')).toBeInTheDocument();
    expect(screen.getByText('Billing migration')).toBeInTheDocument();
    expect(screen.getByText('Move invoices to D1')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('sorts pinned threads first, then by updatedAt descending', () => {
    render(<ThreadList threads={baseThreads} />);
    const titles = screen
      .getAllByRole('listitem')
      .map((item) => item.querySelector('[data-slot="thread-list-title"]')?.textContent);
    // t2 is pinned (even though oldest), then t3 (Nov 5) beats t1 (Nov 3).
    expect(titles).toEqual(['Billing migration', 'Onboarding copy', 'Refactor auth flow']);
  });

  it('filters by title through ThreadListSearch, case-insensitively', () => {
    render(
      <ThreadList threads={baseThreads}>
        <ThreadListSearch />
      </ThreadList>,
    );
    const search = screen.getByLabelText('Search threads');
    fireEvent.change(search, { target: { value: 'BILLING' } });
    expect(screen.getByText('Billing migration')).toBeInTheDocument();
    expect(screen.queryByText('Refactor auth flow')).not.toBeInTheDocument();
    expect(screen.queryByText('Onboarding copy')).not.toBeInTheDocument();
  });

  it('announces an empty search result through a status region', () => {
    render(
      <ThreadList threads={baseThreads}>
        <ThreadListSearch />
      </ThreadList>,
    );
    fireEvent.change(screen.getByLabelText('Search threads'), { target: { value: 'zzz' } });
    expect(screen.getByRole('status')).toHaveTextContent('No threads found.');
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('shows the unread badge only on unread threads', () => {
    render(<ThreadList threads={baseThreads} />);
    const badge = screen.getByText('Unread');
    expect(badge.closest('[data-slot="thread-list-item"]')).toBe(itemOf('Refactor auth flow'));
    expect(within(itemOf('Billing migration')).queryByText('Unread')).not.toBeInTheDocument();
    expect(within(itemOf('Onboarding copy')).queryByText('Unread')).not.toBeInTheDocument();
  });

  it('toggles the pin through onPinToggle with pressed state', () => {
    const onPinToggle = vi.fn();
    render(<ThreadList threads={baseThreads} onPinToggle={onPinToggle} />);
    const pinned = screen.getByRole('button', { name: 'Unpin Billing migration' });
    expect(pinned).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Pin Refactor auth flow' }));
    expect(onPinToggle).toHaveBeenCalledWith('t1');
  });

  it('renames inline on double-click and commits on Enter', () => {
    const onRename = vi.fn();
    render(<ThreadList threads={baseThreads} onRename={onRename} />);
    fireEvent.doubleClick(screen.getByText('Refactor auth flow'));
    const input = screen.getByLabelText('Rename Refactor auth flow');
    expect(input).toHaveValue('Refactor auth flow');
    fireEvent.change(input, { target: { value: 'Auth flow v2' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('t1', 'Auth flow v2');
    expect(screen.queryByLabelText('Rename Refactor auth flow')).not.toBeInTheDocument();
  });

  it('cancels the rename on Escape without firing onRename', () => {
    const onRename = vi.fn();
    render(<ThreadList threads={baseThreads} onRename={onRename} />);
    fireEvent.doubleClick(screen.getByText('Onboarding copy'));
    const input = screen.getByLabelText('Rename Onboarding copy');
    fireEvent.change(input, { target: { value: 'Never saved' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Rename Onboarding copy')).not.toBeInTheDocument();
    expect(screen.getByText('Onboarding copy')).toBeInTheDocument();
  });

  it('commits the rename on blur', () => {
    const onRename = vi.fn();
    render(<ThreadList threads={baseThreads} onRename={onRename} />);
    fireEvent.doubleClick(screen.getByText('Billing migration'));
    const input = screen.getByLabelText('Rename Billing migration');
    fireEvent.change(input, { target: { value: 'Billing migration v2' } });
    fireEvent.blur(input);
    expect(onRename).toHaveBeenCalledWith('t2', 'Billing migration v2');
  });

  it('does not commit the rename from IME composition keys', () => {
    const onRename = vi.fn();
    render(<ThreadList threads={baseThreads} onRename={onRename} />);
    fireEvent.doubleClick(screen.getByText('Refactor auth flow'));
    const input = screen.getByLabelText('Rename Refactor auth flow');
    fireEvent.change(input, { target: { value: '認証フロー' } });
    // Chrome/Firefox mark the committing keydown itself with isComposing:
    // that Enter commits the composition text, not the rename.
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Rename Refactor auth flow')).toBeInTheDocument();
    // The legacy IME keyCode 229 is equally ignored.
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Rename Refactor auth flow')).toBeInTheDocument();
    // Once the composition is over, a plain Enter commits normally.
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('t1', '認証フロー');
    expect(screen.queryByLabelText('Rename Refactor auth flow')).not.toBeInTheDocument();
  });

  it('does not cancel the rename from IME composition keys', () => {
    const onRename = vi.fn();
    render(<ThreadList threads={baseThreads} onRename={onRename} />);
    fireEvent.doubleClick(screen.getByText('Onboarding copy'));
    const input = screen.getByLabelText('Rename Onboarding copy');
    fireEvent.change(input, { target: { value: '下書き' } });
    // Escape during a composition cancels the composition, not the rename.
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
    fireEvent.keyDown(input, { key: 'Escape', keyCode: 229 });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Rename Onboarding copy')).toBeInTheDocument();
    // A plain Escape (composition over) still cancels the rename.
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByLabelText('Rename Onboarding copy')).not.toBeInTheDocument();
    expect(screen.getByText('Onboarding copy')).toBeInTheDocument();
  });

  it('deletes only after the confirm dialog is accepted', () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ThreadList threads={baseThreads} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Refactor auth flow' }));
    expect(confirmSpy).toHaveBeenCalledWith('Delete "Refactor auth flow"?');
    expect(onDelete).toHaveBeenCalledWith('t1');
  });

  it('keeps the thread when the confirm dialog is dismissed', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ThreadList threads={baseThreads} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Billing migration' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('highlights the active thread with aria-current and data-active', () => {
    render(<ThreadList threads={baseThreads} activeId="t3" />);
    const active = itemOf('Onboarding copy');
    expect(active).toHaveAttribute('aria-current', 'true');
    expect(active).toHaveAttribute('data-active', 'true');
    expect(itemOf('Billing migration')).not.toHaveAttribute('aria-current');
    expect(itemOf('Refactor auth flow')).not.toHaveAttribute('data-active');
  });

  it('fires onSelect when a thread row is clicked', () => {
    const onSelect = vi.fn();
    render(<ThreadList threads={baseThreads} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Billing migration'));
    expect(onSelect).toHaveBeenCalledWith('t2');
  });
});
