import { useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';

/**
 * Remembered UI state (which folds are open, which sub-tab is picked), per device.
 * This is a viewer convenience only, never game state, so storage failures are ignored.
 */
function readPref(key: string): string | null {
  try { return window.localStorage.getItem(`dracoquest.ui.${key}`); } catch { return null; }
}
function writePref(key: string, value: string): void {
  try { window.localStorage.setItem(`dracoquest.ui.${key}`, value); } catch { /* storage blocked: just don't remember */ }
}

/** A string preference remembered per device. */
export function usePref<T extends string>(key: string, fallback: T, allowed?: readonly T[]): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const v = readPref(key) as T | null;
    return v !== null && (!allowed || allowed.includes(v)) ? v : fallback;
  });
  return [value, (v: T) => { setValue(v); writePref(key, v); }];
}

interface FoldProps {
  /** Remembers open or closed under this id. */
  id: string;
  title: ComponentChildren;
  /** One line shown in the header, so a closed fold still says what's inside. */
  summary?: ComponentChildren;
  defaultOpen?: boolean;
  /** Open regardless of the remembered state (something needs attention). */
  forceOpen?: boolean;
  class?: string;
  testid?: string;
  /** No card of its own (a fold inside a card). */
  plain?: boolean;
  children: ComponentChildren;
}

/** A card that folds away behind its header. */
export function Fold({ id, title, summary, defaultOpen = false, forceOpen = false, class: cls = '', testid, plain = false, children }: FoldProps) {
  const [pref, setPref] = usePref<'open' | 'closed'>(`fold.${id}`, defaultOpen ? 'open' : 'closed', ['open', 'closed']);
  const [forced, setForced] = useState(forceOpen);
  const open = forced || pref === 'open';
  const toggle = () => {
    setForced(false);
    setPref(open ? 'closed' : 'open');
  };
  const bodyId = `fold-body-${id}`;
  return (
    <section class={`${plain ? 'fold--plain ' : 'card '}fold${open ? ' fold--open' : ''}${cls ? ` ${cls}` : ''}`} data-testid={testid}>
      <button type="button" class="fold-head" aria-expanded={open} aria-controls={bodyId} onClick={toggle} data-testid={`fold-${id}`}>
        <span class="fold-title">{title}</span>
        {summary && <span class="fold-summary muted">{summary}</span>}
        <span class="fold-chevron" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && <div class="fold-body" id={bodyId}>{children}</div>}
    </section>
  );
}

export interface SubTab<T extends string> { id: T; label: string; badge?: number }

/** A row of tab pills that remembers the chosen tab. */
export function SubTabs<T extends string>({ id, tabs, value, onChange, label }: {
  id: string; tabs: SubTab<T>[]; value: T; onChange(v: T): void; label: string;
}): JSX.Element {
  return (
    <div class="tabs subtabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id}
          class={`tab-pill${value === t.id ? ' tab-pill--on' : ''}`} onClick={() => onChange(t.id)} data-testid={`${id}-tab-${t.id}`}>
          {t.label}{t.badge ? <span class="count-pill" aria-label={`${t.badge} waiting`}>{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
