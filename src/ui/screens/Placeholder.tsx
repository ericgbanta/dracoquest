import type { ComponentChildren } from 'preact';

export function Placeholder({ title, note, children }: { title: string; note: string; children?: ComponentChildren }) {
  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header">
        <h1 id="screen-title">{title}</h1>
        {children}
      </header>
      <div class="card placeholder">
        <p>{note}</p>
      </div>
    </section>
  );
}
