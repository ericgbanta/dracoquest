import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

/** A bottom sheet, the phone-friendly menu. Tap outside or Close to dismiss. */
export function Sheet({ title, onClose, children }: { title: string; onClose(): void; children: ComponentChildren }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div class="sheet-header">
          <h2>{title}</h2>
          <button type="button" class="icon-button" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div class="sheet-body">{children}</div>
      </div>
    </div>
  );
}
