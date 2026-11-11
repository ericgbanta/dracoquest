import { useRef, useState } from 'preact/hooks';
import { prefersReducedMotion } from '../bits';
import { Stage } from '../stage/Stage';
import { breath, claw, enemyAttack, riderAttack, type BeatOpts } from '../stage/choreo';
import { demo, demoFighters, StageBar, useDemoArt, type DemoHp } from './demo';

type RiderPick = 'attack' | 'spell' | 'item' | 'defend';
type DragonPick = 'claw' | 'breath' | 'guard';

const full: DemoHp = { rider: demo.rider.hp, dragon: demo.dragon.hp, enemy: demo.enemy.hp };
const perRound = 20;

/**
 * B0 mock battle (#/dev/mock): the new stage with the order panel. Not wired
 * to the engine; the numbers are fixed demo values from stage.json.
 */
export function MockBattle() {
  const [look, setLook] = useState<'a' | 'b'>('a');
  const art = useDemoArt(look);
  const stageRef = useRef<HTMLDivElement>(null);
  const [hp, setHp] = useState<DemoHp>(full);
  const [breathMeter, setBreath] = useState(demo.dragon.breath);
  const [rider, setRider] = useState<RiderPick>('attack');
  const [dragon, setDragon] = useState<DragonPick>('breath');
  const [fast, setFast] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState(1);
  const [targeted, setTargeted] = useState(true);
  const [log, setLog] = useState<string[]>(['Storm Roc appears!']);
  const [logOpen, setLogOpen] = useState(false);
  const [played, setPlayed] = useState(false);
  const ready = breathMeter >= 100;

  const say = (line: string) => setLog((l) => [...l, line].slice(-30));
  const hurt = (who: keyof DemoHp, n: number) => setHp((h) => ({ ...h, [who]: Math.max(0, h[who] - n) }));

  const go = async () => {
    const stage = stageRef.current;
    if (playing || !stage) return;
    setPlaying(true);
    setPlayed(true);
    const base: Omit<BeatOpts, 'onImpact'> = { fast, reduced: prefersReducedMotion() };
    const h = demo.hits;
    if (rider === 'attack') {
      await riderAttack(stage, { actor: 'rider', target: 'e0', text: `-${h.riderAttack}` }, {
        ...base, onImpact: () => { hurt('enemy', h.riderAttack); say(`${demo.rider.name} slashes the Storm Roc for ${h.riderAttack}.`); },
      });
    } else {
      say(`(Mock) ${rider[0]!.toUpperCase()}${rider.slice(1)} isn't acted out yet. Try Attack.`);
    }
    if (dragon === 'breath' && ready) {
      setBreath(0);
      await breath(stage, { actor: 'dragon', target: 'e0', text: `-${h.breath}` }, {
        ...base, onImpact: () => { hurt('enemy', h.breath); say(`${demo.dragon.name}'s Fire Breath hits the Storm Roc for ${h.breath}!`); },
      });
      setDragon('claw');
    } else if (dragon === 'claw') {
      await claw(stage, { actor: 'dragon', target: 'e0', text: `-${h.claw}` }, {
        ...base, onImpact: () => { hurt('enemy', h.claw); say(`${demo.dragon.name}'s Claw hits the Storm Roc for ${h.claw}.`); },
      });
    } else {
      say(`${demo.dragon.name} guards.`);
    }
    await enemyAttack(stage, { actor: 'e0', target: 'dragon', text: `-${h.enemyAttack}` }, {
      ...base, onImpact: () => { hurt('dragon', h.enemyAttack); say(`The Storm Roc's Talon Rake hits ${demo.dragon.name} for ${h.enemyAttack}.`); },
    });
    setBreath((b) => Math.min(100, b + perRound));
    setRound((r) => r + 1);
    // A mock never ends: top everyone back up when someone runs low.
    setHp((cur) => (cur.enemy < demo.enemy.maxHp * 0.2 || cur.dragon < demo.dragon.maxHp * 0.3 ? full : cur));
    setPlaying(false);
  };

  return (
    <div class="app app--battle">
      <main class="content content--battle content--stage">
        <section class="battle battle--stage" aria-label="Mock battle" data-testid="mock-battle">
          <div class="battle-field">
            <div class="stage-box">
              {art ? (
                <Stage stageRef={stageRef} look={look} backdrop={art.backdrop} effects={art.effects}
                  fighters={demoFighters(art, hp, { targeted, onTarget: () => setTargeted(true) })}
                  header={(
                    <div class="stage-header">
                      <span>{demo.zoneName} · Boss · Round {round}</span>
                      <button type="button" class="chip-button" aria-pressed={fast} onClick={() => setFast(!fast)} data-testid="speed">{fast ? '2x' : '1x'}</button>
                    </div>
                  )} />
              ) : (
                <div class="stage stage--loading"><p class="placeholder">Loading the stage…</p></div>
              )}
            </div>

            <div class="status-strip" data-testid="status-strip">
              <span class="who">{demo.rider.name}</span>
              <StageBar kind="hp" value={hp.rider} max={demo.rider.maxHp} label="HP" />
              <StageBar kind="mp" value={demo.rider.mp} max={demo.rider.maxMp} label="MP" />
              <span class="who">{demo.dragon.name}</span>
              <StageBar kind="hp" value={hp.dragon} max={demo.dragon.maxHp} label="HP" />
              <StageBar kind="breath" value={breathMeter} max={100} label={ready ? 'Breath READY' : 'Breath'} numbers={false} />
            </div>

            <button type="button" class={`log${logOpen ? ' log--open' : ''}`} onClick={() => setLogOpen(!logOpen)}
              aria-label="Combat log, tap to expand" aria-expanded={logOpen} data-testid="log">
              <span aria-live="polite">{(logOpen ? log : log.slice(-2)).map((line, i) => <span key={i} class="log-line">{line}</span>)}</span>
            </button>
          </div>

          <div class="actions" aria-label="Orders">
            <div class="action-row" role="group" aria-label="Rider">
              <span class="row-label">Rider</span>
              <Act label="Attack" on={rider === 'attack'} disabled={playing} onClick={() => setRider('attack')} testid="act-attack" />
              <Act label="Spell" on={rider === 'spell'} disabled={playing} onClick={() => setRider('spell')} testid="act-spell" />
              <Act label="Item" on={rider === 'item'} disabled={playing} onClick={() => setRider('item')} testid="act-item" />
              <Act label="Defend" on={rider === 'defend'} disabled={playing} onClick={() => setRider('defend')} testid="act-defend" />
            </div>
            <div class="action-row" role="group" aria-label="Dragon">
              <span class="row-label">Dragon</span>
              <Act label="Claw" on={dragon === 'claw'} disabled={playing} onClick={() => setDragon('claw')} testid="act-claw" />
              <Act label="Breath" on={dragon === 'breath'} disabled={!ready || playing} onClick={() => setDragon('breath')}
                sub={ready ? 'Ready!' : `${breathMeter}%`} testid="act-breath" />
              <Act label="Guard" on={dragon === 'guard'} disabled={playing} onClick={() => setDragon('guard')} testid="act-guard" />
            </div>
            <div class="go-row">
              {played && <button type="button" class="button button--ghost repeat" onClick={go} disabled={playing} data-testid="repeat">Repeat</button>}
              <button type="button" class="button button--go" onClick={go} disabled={playing || !art} data-testid="go">{playing ? '…' : 'Go!'}</button>
            </div>
            <div class="look-row" role="group" aria-label="Art look">
              <button type="button" class="chip-button" aria-pressed={look === 'a'} onClick={() => setLook('a')} data-testid="look-a">Look A</button>
              <button type="button" class="chip-button" aria-pressed={look === 'b'} onClick={() => setLook('b')} data-testid="look-b">Look B</button>
              <a class="dev-link" href="#/dev/bench">Open the bench</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Act({ label, sub, on, disabled, onClick, testid }: {
  label: string; sub?: string; on: boolean; disabled?: boolean; onClick(): void; testid: string;
}) {
  return (
    <button type="button" class={`act${on ? ' act--on' : ''}`} aria-pressed={on} disabled={disabled} onClick={onClick} data-testid={testid}>
      <span>{label}</span>
      {sub && <span class="act-sub">{sub}</span>}
    </button>
  );
}
