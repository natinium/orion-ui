'use client';

import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * MultiSelect — a filterable combobox for selecting multiple options.
 * Controlled: pass `value` + `onValueChange`. Keyboard: type to filter,
 * Enter/Space toggles, Escape closes, Backspace removes the last selection.
 *
 * @example
 * <MultiSelect
 *   options={[{ value: 'react', label: 'React' }, { value: 'vue', label: 'Vue' }]}
 *   value={value}
 *   onValueChange={setValue}
 *   placeholder="Pick frameworks…"
 * />
 */
function MultiSelect({
  options,
  value = [],
  onValueChange,
  placeholder = 'Select…',
  className,
  ...props
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const selected = options.filter((o) => value.includes(o.value));
  const available = options.filter(
    (o) => !value.includes(o.value) && o.label.toLowerCase().includes(query.toLowerCase()),
  );

  const toggle = (v: string) => {
    onValueChange?.(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div ref={rootRef} data-slot="multi-select" className={cn('relative', className)} {...props}>
      <button
        type="button"
        data-slot="multi-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent/50"
      >
        {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
        {selected.map((o) => (
          <span
            key={o.value}
            data-slot="multi-select-badge"
            className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium"
          >
            {o.label}
            <span
              role="button"
              tabIndex={0}
              aria-label={`Remove ${o.label}`}
              onClick={(e) => {
                e.stopPropagation();
                toggle(o.value);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </span>
          </span>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{selected.length || ''}</span>
      </button>

      {open && (
        <div
          data-slot="multi-select-content"
          className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md"
        >
          <input
            data-slot="multi-select-filter"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Backspace' && query === '' && value.length > 0) {
                onValueChange?.(value.slice(0, -1));
              }
            }}
            placeholder="Filter options…"
            className="w-full border-b bg-transparent px-3 py-2 text-sm outline-none"
          />
          <ul role="listbox" aria-multiselectable className="max-h-56 overflow-y-auto p-1">
            {available.length === 0 && (
              <li className="px-2 py-3 text-center text-sm text-muted-foreground">No matches</li>
            )}
            {available.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => toggle(o.value)}
                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface MultiSelectProps extends React.ComponentProps<'div'> {
  options: { value: string; label: string }[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
}

/**
 * TagsInput — type and press Enter to add tags, Backspace removes the last.
 */
function TagsInput({
  value = [],
  onValueChange,
  placeholder = 'Add tag…',
  className,
  ...props
}: Omit<MultiSelectProps, 'options'>) {
  const [draft, setDraft] = React.useState('');

  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onValueChange?.([...value, v]);
    setDraft('');
  };

  return (
    <div
      data-slot="tags-input"
      className={cn(
        'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm',
        className,
      )}
      {...props}
    >
      {value.map((tag) => (
        <span
          key={tag}
          data-slot="tags-input-badge"
          className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium"
        >
          {tag}
          <span
            role="button"
            tabIndex={0}
            aria-label={`Remove ${tag}`}
            onClick={() => onValueChange?.(value.filter((x) => x !== tag))}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </span>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
          if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onValueChange?.(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={placeholder}
        className="min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export { MultiSelect, TagsInput };
