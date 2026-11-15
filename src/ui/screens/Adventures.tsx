import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { bountiesForDay, bountyBoard, bountyDone, bountyKey, storiesFor, storyStatus } from '../../core/adventures';
import { chooseStory, claimBounty, claimLogGoal, GameError, startStory } from '../../core/game';
import { logFor, logProgress, zoneTitle } from '../../core/hunterLog';
import type { SaveData } from '../../core/save';
import type { ZoneData } from '../../core/types';
import { rewardText } from '../bits';
import { Sheet } from '../Sheet';

interface Props {
  zone: ZoneData;
  save: SaveData;
  update(change: (s: SaveData) => SaveData): void;
  today: string;
  onClose(): void;
}

/** A zone's story quests: done, ready to play, or locked, plus any choice still to make. */
export function StorySheet({ zone, save, update, today, onClose }: Props) {
  const [notice, setNotice] = useState('');
  const act = (fn: (s: SaveData) => SaveData, after?: () => void) => {
    try {
      const next = fn(save);
      update(() => next);
      after?.();
    } catch (e) {
      setNotice(e instanceof GameError ? e.message : 'That did not work.');
    }
  };
  return (
    <Sheet title={`${zone.name} story`} onClose={onClose}>
      {notice && <p class="notice notice--error" role="status">{notice}</p>}
      <div class="list">
        {storiesFor(data, zone.id).map((q, i) => {
          const status = storyStatus(data, save, q);
          return (
            <div key={q.id} class={`story-row story-row--${status.state}`} data-testid={`story-${q.id}`}>
              <div class="story-info">
                <strong>{i + 1}. {q.name}{status.state === 'done' ? ' ✓' : ''}</strong>
                <span class="muted">{q.description}</span>
                <span class="muted">Level {q.minLevel} · Reward: {rewardText(q.reward)}</span>
                {status.state === 'locked' && <span class="muted">{status.reason}.</span>}
              </div>
              {status.state === 'available' && (
                <button type="button" class="button" disabled={!!save.run} data-testid={`start-story-${q.id}`}
                  onClick={() => act((s) => startStory(data, s, q.id, today), onClose)}>Play</button>
              )}
              {status.state === 'done' && status.choicePending && q.choice && (
                <div class="story-choice" data-testid={`pending-${q.id}`}>
                  <span class="muted">{q.choice.prompt}</span>
                  {q.choice.options.map((o) => (
                    <button key={o.id} type="button" class="button button--ghost" data-testid={`choice-${o.id}`}
                      onClick={() => act((s) => chooseStory(data, s, q.id, o.id))}>{o.label}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/** Today's bounty board for a zone. */
export function BountySheet({ zone, save, update, today, onClose }: Props) {
  const [notice, setNotice] = useState('');
  const state = bountiesForDay(save.bounties, today);
  const board = bountyBoard(data, zone.id, today);
  return (
    <Sheet title={`${zone.name} bounties`} onClose={onClose}>
      <p class="muted">Three new jobs every day. Hunts and story quests here count toward them.</p>
      {notice && <p class="notice notice--ok" role="status" data-testid="bounty-notice">{notice}</p>}
      <div class="list">
        {board.map((b) => {
          const key = bountyKey(zone.id, b.id);
          const have = state.progress[key] ?? 0;
          const done = bountyDone(state, zone.id, b);
          const claimed = state.claimed.includes(key);
          return (
            <div key={b.id} class="story-row" data-testid={`bounty-${b.id}`}>
              <div class="story-info">
                <strong>{b.text}{claimed ? ' ✓' : ''}</strong>
                <span class="muted">{Math.min(have, b.count)} of {b.count} · Reward: {rewardText(b.reward)}</span>
              </div>
              <button type="button" class="button" disabled={!done || claimed} data-testid={`claim-${b.id}`}
                onClick={() => {
                  try {
                    const next = claimBounty(data, save, zone.id, b.id, today);
                    update(() => next);
                    setNotice(`Bounty done: ${rewardText(b.reward)}.`);
                  } catch (e) { setNotice(e instanceof GameError ? e.message : 'That did not work.'); }
                }}>{claimed ? 'Claimed' : 'Claim'}</button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/** The hunter's log for a zone (VARIETY_PLAN V4): one row per regular enemy with its next goal. */
export function LogSheet({ zone, save, update, onClose }: Omit<Props, 'today'>) {
  const [notice, setNotice] = useState('');
  const entries = logFor(data, save, zone);
  const progress = logProgress(data, save, zone);
  const title = zoneTitle(data, save, zone);
  const titleName = data.hunterLog.title.replace('{zone}', zone.name);
  return (
    <Sheet title={`${zone.name} hunter's log`} onClose={onClose}>
      <p class="muted" data-testid="log-progress">
        Defeat each of the zone's creatures {data.hunterLog.tiers.map((t) => t.count).join(', ')} times. {progress.claimed} of {progress.total} goals claimed.
        {' '}{title ? '' : `Claim them all to become ${titleName}.`}
      </p>
      {title && <p class="notice notice--ok" data-testid="log-title">Title earned: {title}</p>}
      {notice && <p class="notice notice--ok" role="status" data-testid="log-notice">{notice}</p>}
      <div class="list">
        {entries.map((e) => {
          const enemy = data.enemies[e.enemyId]!;
          const ready = e.goals.find((g) => g.state === 'ready');
          const next = ready ?? e.goals.find((g) => g.state === 'open');
          const claimed = e.goals.filter((g) => g.state === 'claimed').length;
          const seen = (save.bestiary[e.enemyId]?.fought ?? 0) > 0;
          return (
            <div key={e.enemyId} class="story-row" data-testid={`log-${e.enemyId}`}>
              <div class="story-info">
                <strong>{seen ? enemy.name : '???'}{claimed === e.goals.length ? ' ✓' : ''}</strong>
                <span class="muted">
                  {e.defeated} defeated · {claimed}/{e.goals.length} goals
                  {next ? ` · Next: ${next.count} for ${rewardText(next.reward)}` : ' · All done'}
                </span>
              </div>
              <button type="button" class="button" disabled={!ready} data-testid={`log-claim-${e.enemyId}`}
                onClick={() => {
                  if (!ready) return;
                  try {
                    const after = claimLogGoal(data, save, zone.id, e.enemyId, ready.count);
                    update(() => after);
                    const t = zoneTitle(data, after, zone);
                    setNotice(`${enemy.name} x${ready.count}: ${rewardText(ready.reward)}.${t ? ` You are now ${t}!` : ''}`);
                  } catch (err) { setNotice(err instanceof GameError ? err.message : 'That did not work.'); }
                }}>{ready ? 'Claim' : claimed === e.goals.length ? 'Done' : 'Claim'}</button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

