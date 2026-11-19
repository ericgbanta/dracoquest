import { ArtSheet } from './ArtSheet';
import { Bench } from './Bench';
import { MockBattle } from './MockBattle';
import { SpellSheet } from './SpellSheet';
import './dev.css';

/** Hidden developer pages, loaded only when their hash is opened. */
export function Dev({ page }: { page: string }) {
  if (page === 'bench') return <Bench />;
  if (page === 'art') return <ArtSheet />;
  if (page === 'spells') return <SpellSheet />;
  return <MockBattle />;
}
