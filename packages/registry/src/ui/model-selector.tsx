'use client';

import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * A selectable model as rendered by {@link ModelSelector}. Options are grouped
 * under one header per distinct `provider` (first-appearance order), and each
 * `capabilities` entry renders as a small badge (e.g. `vision`, `tools`, `fast`).
 */
export interface ModelSelectorModel {
  id: string;
  /** Display name shown in the trigger and the option row. */
  label: string;
  /** Grouping key — one header per distinct provider. */
  provider: string;
  /** Capability badges rendered on the option row. */
  capabilities?: string[];
}

/**
 * Chevron-down icon for the trigger.
 */
function ModelSelectorChevronIcon() {
  return (
    <svg
      data-slot="model-selector-icon-chevron"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Magnifier icon for the search field.
 */
function ModelSelectorSearchIcon() {
  return (
    <svg
      data-slot="model-selector-icon-search"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/**
 * Check mark shown on the selected option.
 */
function ModelSelectorCheckIcon() {
  return (
    <svg
      data-slot="model-selector-icon-check"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Orion Model Selector — searchable, provider-grouped model picker with
 * capability badges.
 *
 * Both `value` and `open` are controlled: pass `value`/`onValueChange` for the
 * selection and `open`/`onOpenChange` for the panel so callers (and tests)
 * drive it. Without an `open` prop the component falls back to internal state.
 *
 * The panel renders a search field (matches label **or** provider,
 * case-insensitive) above a `listbox` of provider `group`s. Keyboard: the
 * search field is a combobox — ArrowDown/ArrowUp move the active option,
 * Enter selects it, Escape closes. Selecting fires `onValueChange` and closes
 * the panel.
 *
 * @example
 * <ModelSelector
 *   models={models}
 *   value={modelId}
 *   onValueChange={setModelId}
 *   open={open}
 *   onOpenChange={setOpen}
 * />
 */
function ModelSelector({
  models,
  value,
  onValueChange,
  open,
  onOpenChange,
  placeholder = 'Select a model',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  /** Models to pick from, grouped by `provider` in first-appearance order. */
  models: ModelSelectorModel[];
  /** Selected model id; the trigger shows the matching label. */
  value?: string;
  /** Fired when an option is chosen, right before the panel closes. */
  onValueChange?: (id: string) => void;
  /** Controlled panel visibility — when omitted, internal state is used. */
  open?: boolean;
  /** Open-state change notifications (trigger click, Escape, outside click, selection). */
  onOpenChange?: (open: boolean) => void;
  /** Trigger label when nothing is selected. */
  placeholder?: string;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = isControlled ? Boolean(open) : internalOpen;

  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);

  const setOpen = React.useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!isControlled) setInternalOpen(next);
    },
    [isControlled, onOpenChange],
  );

  // A fresh search on every open; nothing to preserve while closed.
  React.useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Close on outside clicks (notify the controller in controlled mode too).
  React.useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, setOpen]);

  const selected = models.find((model) => model.id === value);

  const groups = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? models.filter(
          (model) =>
            model.label.toLowerCase().includes(needle) ||
            model.provider.toLowerCase().includes(needle),
        )
      : models;
    const byProvider = new Map<string, ModelSelectorModel[]>();
    for (const model of filtered) {
      const bucket = byProvider.get(model.provider);
      if (bucket) {
        bucket.push(model);
      } else {
        byProvider.set(model.provider, [model]);
      }
    }
    return [...byProvider.entries()].map(([provider, items]) => ({ provider, items }));
  }, [models, query]);

  const flat = groups.flatMap((group) => group.items);
  const activeItem = flat.length > 0 ? flat[Math.min(activeIndex, flat.length - 1)] : undefined;

  const listboxId = React.useId();
  const optionId = (model: ModelSelectorModel) => `${listboxId}-option-${model.id}`;

  const select = (id: string) => {
    onValueChange?.(id);
    setOpen(false);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // IME guard: while a composition is active (`isComposing`, or the legacy
    // IME keyCode 229) the input method owns ArrowDown/ArrowUp (candidate
    // navigation), Enter (commit) and Escape (cancel) — the listbox must not
    // preventDefault them or move/select/close in response.
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flat.length > 0) {
        setActiveIndex((index) => (Math.min(index, flat.length - 1) + 1) % flat.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flat.length > 0) {
        setActiveIndex((index) => {
          const base = Math.min(index, flat.length - 1);
          return (base - 1 + flat.length) % flat.length;
        });
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeItem) select(activeItem.id);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      data-slot="model-selector"
      className={cn('relative flex w-full flex-col gap-1', className)}
      {...props}
    >
      <button
        type="button"
        data-slot="model-selector-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        onClick={() => setOpen(!isOpen)}
        onKeyDown={(event) => {
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !isOpen) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors',
          'hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        )}
      >
        <span data-slot="model-selector-trigger-label" className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <span data-slot="model-selector-trigger-icon" className="text-muted-foreground">
          <ModelSelectorChevronIcon />
        </span>
      </button>
      {isOpen ? (
        <div
          data-slot="model-selector-panel"
          className="absolute top-full left-0 z-50 mt-1 flex w-full flex-col gap-1 rounded-lg border border-input bg-background p-1 shadow-md"
        >
          <div data-slot="model-selector-search" className="relative flex items-center px-1">
            <span
              data-slot="model-selector-search-icon"
              className="pointer-events-none absolute left-3 text-muted-foreground"
            >
              <ModelSelectorSearchIcon />
            </span>
            <input
              data-slot="model-selector-search-input"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded
              aria-controls={flat.length > 0 ? listboxId : undefined}
              aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
              aria-autocomplete="list"
              aria-label="Search models"
              // Mount-guarded focus: the panel opens on user action (trigger click / ArrowDown) and the combobox pattern requires focus in the field on open — not an unrequested page-load focus.
              ref={(node) => {
                if (node && document.activeElement !== node) node.focus();
              }}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search models…"
              className={cn(
                'h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none',
                'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              )}
            />
          </div>
          {flat.length === 0 ? (
            <div
              data-slot="model-selector-empty"
              role="status"
              className="px-2 py-4 text-center text-sm text-muted-foreground"
            >
              No models found.
            </div>
          ) : (
            <div
              data-slot="model-selector-options"
              role="listbox"
              id={listboxId}
              aria-label="Models"
              className="flex max-h-72 flex-col gap-1 overflow-y-auto"
            >
              {groups.map((group, groupIndex) => (
                // biome-ignore lint/a11y/useSemanticElements: group is a required owned element of listbox, a fieldset would break the listbox structure for assistive tech
                <div
                  key={group.provider}
                  data-slot="model-selector-group"
                  role="group"
                  aria-labelledby={`${listboxId}-group-${groupIndex}`}
                  className="flex flex-col"
                >
                  <span
                    id={`${listboxId}-group-${groupIndex}`}
                    data-slot="model-selector-group-label"
                    className="px-2 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {group.provider}
                  </span>
                  {group.items.map((model) => {
                    const isSelected = model.id === value;
                    const isActive = activeItem?.id === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        tabIndex={-1}
                        id={optionId(model)}
                        data-slot="model-selector-option"
                        role="option"
                        aria-selected={isSelected}
                        data-selected={isSelected ? 'true' : undefined}
                        data-active={isActive ? 'true' : undefined}
                        onClick={() => select(model.id)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none',
                          'hover:bg-accent/60 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground',
                        )}
                      >
                        <span data-slot="model-selector-option-label" className="truncate">
                          {model.label}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {model.capabilities?.map((capability) => (
                            <span
                              key={capability}
                              data-slot="model-selector-capability"
                              className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground"
                            >
                              {capability}
                            </span>
                          ))}
                          {isSelected ? <ModelSelectorCheckIcon /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export { ModelSelector };
