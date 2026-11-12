import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { autoOrders } from '../src/core/ai';
import {
  bountiesForDay, bountyBoard, bountyKey, countBounties, planStory, storiesFor, storyById, storyProgress, storyStatus,
} from '../src/core/adventures';
import { chooseStory, claimBounty, GameError, playRound, startFight, startRun, startStory, type FightReport } from '../src/core/game';
import { CURRENT_VERSION, parseSave, type BountyState, type SaveData } from '../src/core/save';
import { createBattle } from '../src/core/battle';
import fixtureV8 from './fixtures/save-v8.json';

const data = gameData;
const DAY = '2026-11-12';

/** The level 15 Juvenile from the v8 fixture, migrated, at full health. */
function keeper(): SaveData {
  return parseSave(JSON.stringify(fixtureV8));
}

/** Play the current run to its end with the auto-battler. Returns the last fight's report. */
function playOut(s: SaveData): { save: SaveData; report: FightReport | null; reports: FightReport[] } {
  const reports: FightReport[] = [];
  for (let i = 0; i < 400 && s.run; i++) {
    if (!s.run.battle) s = startFight(data, s);
    const r = playRound(data, s, autoOrders(data, s.run!.battle!));
    s = r.save;
    if (r.report) {
      reports.push(r.report);
      if (r.report.outcome !== 'won') break;
    }
  }
  return { save: s, report: reports[reports.length - 1] ?? null, reports };
}

describe('story data', () => {
  it('Mossy Hollow and Saltmarsh Shore each have a four-quest chain ending at the boss', () => {
    for (const zone of ['mossy-hollow', 'saltmarsh-shore']) {
      const list = storiesFor(data, zone);
      expect(list).toHaveLength(4);
      list.slice(1).forEach((q, i) => expect(q.requires).toBe(list[i]!.id));
      const last = list[list.length - 1]!;
      const z = data.zones.find((x) => x.id === zone)!;
      expect(last.steps.some((st) => st.boss && st.enemies.includes(z.boss.enemy))).toBe(true);
      expect(list.filter((q) => q.choice).length).toBe(1);
    }
  });

  it('plans boss and mini-boss steps as those fights, at fixed levels', () => {
    const fights = planStory(storyById(data, 'the-bramble-troll')!);
    expect(fights.map((f) => f.kind)).toEqual(['story', 'boss']);
    expect(fights[1]!.enemies[0]).toEqual({ enemyId: 'bramble-troll', level: 8 });
    expect(planStory(storyById(data, 'elder-of-the-thicket')!).map((f) => f.kind)).toEqual(['story', 'mini']);
  });
});

describe('story quests', () => {
  it('unlock in order and by level', () => {
    const s = keeper();
    const [first, second] = storiesFor(data, 'mossy-hollow');
    expect(storyStatus(data, s, first!)).toEqual({ state: 'available' });
    expect(storyStatus(data, s, second!)).toMatchObject({ state: 'locked' });
    const low = { ...s, rider: { ...s.rider, level: 1 } };
    expect(storyStatus(data, low, first!)).toEqual({ state: 'locked', reason: 'Reach rider level 2' });
    expect(() => startStory(data, low, first!.id)).toThrow(GameError);
    expect(() => startStory(data, s, second!.id)).toThrow('Finish "Wren\'s Garden" first');
  });

  it('playing one through gives its reward once and marks it done (fixed seed)', () => {
    const s = keeper();
    let run = startStory(data, s, 'wrens-garden', DAY);
    expect(run.run?.storyId).toBe('wrens-garden');
    expect(run.run?.battle).toBeNull();
    const { save, report, reports } = playOut(run);
    expect(reports).toHaveLength(2);
    expect(report?.outcome).toBe('won');
    expect(report?.story?.id).toBe('wrens-garden');
    expect(save.questsDone).toContain('wrens-garden');
    expect(save.rider.inventory.potion).toBe((s.rider.inventory.potion ?? 0) + 2);
    // The quest's reward XP rides on the last fight's XP.
    expect(report!.rewards!.xp).toBeGreaterThanOrEqual(storyById(data, 'wrens-garden')!.reward.xp!);
    expect(storyProgress(data, save, 'mossy-hollow')).toEqual({ done: 1, total: 4 });
    expect(() => startStory(data, save, 'wrens-garden')).toThrow('already finished');
    run = save;
    expect(storyStatus(data, run, storiesFor(data, 'mossy-hollow')[1]!)).toEqual({ state: 'available' });
  });

  it('a choice gives its reward and temperament once', () => {
    const s = { ...keeper(), questsDone: [...keeper().questsDone, 'wrens-garden', 'the-spore-cloud'] };
    const q = storyById(data, 'the-spore-cloud')!;
    expect(storyStatus(data, s, q)).toEqual({ state: 'done', choicePending: true });
    const lead = s.dragons.find((d) => d.id === s.activeDragonId)!;
    const after = chooseStory(data, s, q.id, 'give');
    expect(after.embers).toBe(s.embers + 3);
    expect(after.storyChoices[q.id]).toBe('give');
    expect(after.dragons.find((d) => d.id === lead.id)!.temper.gentle).toBe(lead.temper.gentle + data.progression.storyChoiceTemper);
    expect(storyStatus(data, after, q)).toEqual({ state: 'done', choicePending: false });
    expect(() => chooseStory(data, after, q.id, 'sell')).toThrow('already chose');
    expect(() => chooseStory(data, keeper(), q.id, 'give')).toThrow('Finish the quest first');
  });

  it('the last quest fights the boss: it counts as beating the boss (fixed seed)', () => {
    const base = keeper();
    const s = { ...base, bossesDefeated: base.bossesDefeated.filter((z) => z !== 'mossy-hollow'), questsDone: [...base.questsDone, 'wrens-garden', 'the-spore-cloud', 'elder-of-the-thicket'] };
    const { save, report } = playOut(startStory(data, s, 'the-bramble-troll', DAY));
    expect(report?.outcome).toBe('won');
    expect(report?.kind).toBe('boss');
    expect(save.bossesDefeated).toContain('mossy-hollow');
    expect(save.questsDone).toContain('the-bramble-troll');
  });
});

describe('bounties', () => {
  it('posts three different bounties a day, the same for the same day', () => {
    const a = bountyBoard(data, 'mossy-hollow', DAY);
    expect(a).toHaveLength(data.bounties.perDay);
    expect(new Set(a.map((b) => b.id)).size).toBe(a.length);
    expect(bountyBoard(data, 'mossy-hollow', DAY)).toEqual(a);
    const days = ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16'].map((d) => bountyBoard(data, 'mossy-hollow', d).map((b) => b.id).join());
    expect(new Set([a.map((b) => b.id).join(), ...days]).size).toBeGreaterThan(1);
    expect(bountyBoard(data, 'cinder-pass', DAY)).toEqual([]);
    expect(bountyBoard(data, 'mossy-hollow', '')).toEqual([]);
  });

  it('a new day starts an empty board', () => {
    const old = { day: '2026-11-11', progress: { 'mossy-hollow:x': 2 }, claimed: ['mossy-hollow:y'] };
    expect(bountiesForDay(old, '2026-11-11')).toBe(old);
    expect(bountiesForDay(old, DAY)).toEqual({ day: DAY, progress: {}, claimed: [] });
  });

  it('counts defeats, wins and cleared runs, up to the target', () => {
    // Find a day whose Mossy board has a "wins" bounty, so all kinds can be checked.
    const day = Array.from({ length: 60 }, (_, i) => `2026-12-${String((i % 28) + 1).padStart(2, '0')}-${i}`)
      .find((d) => bountyBoard(data, 'mossy-hollow', d).some((b) => b.kind === 'wins'))!;
    const board = bountyBoard(data, 'mossy-hollow', day);
    const wins = board.find((b) => b.kind === 'wins')!;
    const s = keeper();
    const battle = createBattle(data, { rider: s.rider, dragon: null, enemies: [{ enemyId: 'thornling', level: 3 }], seed: 1, canFlee: true });
    battle.enemies[0]!.hp = 0;
    let state: BountyState = { day, progress: {}, claimed: [] };
    for (let i = 0; i < wins.count + 3; i++) state = countBounties(data, state, 'mossy-hollow', battle, i === 0);
    expect(state.progress[bountyKey('mossy-hollow', wins.id)]).toBe(wins.count);
    for (const b of board) {
      const got = state.progress[bountyKey('mossy-hollow', b.id)] ?? 0;
      if (b.kind === 'clear') expect(got).toBe(1);
      if (b.kind === 'defeat') expect(got).toBe(b.enemy === 'thornling' ? Math.min(b.count, wins.count + 3) : 0);
    }
  });

  it('hunts count toward the board, and a finished bounty is claimed once', () => {
    const s = keeper();
    const board = bountyBoard(data, 'mossy-hollow', DAY);
    const { save } = playOut(startRun(data, s, 'mossy-hollow', DAY));
    expect(save.bounties.day).toBe(DAY);
    const total = Object.values(save.bounties.progress).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
    // Finish the first bounty by hand and claim it.
    const b = board[0]!;
    const ready = { ...save, bounties: { ...save.bounties, progress: { ...save.bounties.progress, [bountyKey('mossy-hollow', b.id)]: b.count } } };
    const claimed = claimBounty(data, ready, 'mossy-hollow', b.id, DAY);
    expect(claimed.rider.gold).toBe(ready.rider.gold + (b.reward.gold ?? 0));
    expect(claimed.embers).toBe(ready.embers + (b.reward.embers ?? 0));
    expect(() => claimBounty(data, claimed, 'mossy-hollow', b.id, DAY)).toThrow('Already claimed');
    const notDone = board.find((x) => (save.bounties.progress[bountyKey('mossy-hollow', x.id)] ?? 0) < x.count && x.id !== b.id);
    if (notDone) expect(() => claimBounty(data, save, 'mossy-hollow', notDone.id, DAY)).toThrow('Not finished');
    expect(() => claimBounty(data, save, 'mossy-hollow', 'nope', DAY)).toThrow('not on today');
  });
});

describe('save v8 to v9', () => {
  it('migrates the version 8 fixture: no story choices, an empty bounty board', () => {
    expect(fixtureV8.version).toBe(8);
    const s = parseSave(JSON.stringify(fixtureV8));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Eight');
    expect(s.rider.materials).toEqual({ ore: 3 });
    expect(s.storyChoices).toEqual({});
    expect(s.bounties).toEqual({ day: '', progress: {}, claimed: [] });
    expect(s.questsDone).toEqual(fixtureV8.questsDone);
  });
});
