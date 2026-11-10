import type { SaveData } from '../../core/save';
import { href } from '../router';
import { GearIcon } from '../icons';

export function Roost({ save }: { save: SaveData }) {
  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header">
        <h1 id="screen-title">Roost</h1>
        <a class="icon-button" href={href('settings')} aria-label="Settings" data-testid="open-settings">
          <GearIcon />
        </a>
      </header>
      <div class="card">
        <p class="welcome" data-testid="welcome">Welcome back, {save.rider.name}.</p>
        <p class="muted">The nest is empty for now. Eggs arrive in Phase 1.</p>
      </div>
    </section>
  );
}
