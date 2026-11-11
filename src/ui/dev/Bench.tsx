import { useEffect, useRef, useState } from 'preact/hooks';
import layout from '../../data/stage.json';
import { prefersReducedMotion } from '../bits';
import { Stage } from '../stage/Stage';
import { breath, claw, enemyAttack, riderAttack } from '../stage/choreo';
import { demo, demoFighters, useDemoArt, type DemoHp } from './demo';
import { FrameMeter, type FrameSnapshot } from './frames';

const full: DemoHp = { rider: demo.rider.hp, dragon: demo.dragon.hp, enemy: demo.enemy.hp };
const RESULT_ROUNDS = 10;
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/**
 * Bench (#/dev/bench): loops a demo round on the stage and shows frame
 * numbers in big text, so they can be read off a phone. Restart clears them.
 */
export function Bench() {
  const art = useDemoArt();
  const stageRef = useRef<HTMLDivElement>(null);
  const meter = useRef(new FrameMeter());
  const [hp, setHp] = useState<DemoHp>(full);
  const [stats, setStats] = useState<FrameSnapshot>(meter.current.snapshot());
  const [rounds, setRounds] = useState(0);
  const [result, setResult] = useState<FrameSnapshot | null>(null);
  const [fast, setFast] = useState(false);
  const [nodes, setNodes] = useState(0);
  const [longTasks, setLongTasks] = useState<number | null>(null);
  const run = useRef(0);
  const fastRef = useRef(fast);
  fastRef.current = fast;
  // 2 vs 2 is the busiest stage the game can show: two dragons and two enemies.
  const [busy, setBusy] = useState(false);

  // Count frames for as long as the bench is open.
  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => { meter.current.frame(t); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const show = window.setInterval(() => setStats(meter.current.snapshot()), 250);
    const onVis = () => meter.current.skip();
    document.addEventListener('visibilitychange', onVis);
    let observer: PerformanceObserver | null = null;
    try {
      if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        setLongTasks(0);
        observer = new PerformanceObserver((list) => setLongTasks((n) => (n ?? 0) + list.getEntries().length));
        observer.observe({ type: 'longtask' });
      }
    } catch { /* not supported, shown as n/a */ }
    return () => { cancelAnimationFrame(raf); window.clearInterval(show); document.removeEventListener('visibilitychange', onVis); observer?.disconnect(); };
  }, []);

  // The demo round, on a loop: rider attack, breath, the Roc's counter, claw.
  const [restarts, setRestarts] = useState(0);
  useEffect(() => {
    if (!art) return;
    const id = ++run.current;
    const alive = () => run.current === id;
    setNodes(stageRef.current?.querySelectorAll('*').length ?? 0);
    (async () => {
      let n = 0;
      while (alive()) {
        const stage = stageRef.current;
        if (!stage) return;
        const o = { fast: fastRef.current, reduced: false };
        const h = demo.hits;
        const hurt = (who: keyof DemoHp, v: number) => () => setHp((cur) => ({ ...cur, [who]: Math.max(0, cur[who] - v) }));
        await riderAttack(stage, { actor: 'rider', target: 'e0', text: `-${h.riderAttack}` }, { ...o, onImpact: hurt('enemy', h.riderAttack) });
        if (!alive()) return;
        await breath(stage, { actor: 'dragon', target: 'e0', text: `-${h.breath}`, kind: 'crit' }, { ...o, onImpact: hurt('enemy', h.breath) });
        if (!alive()) return;
        await enemyAttack(stage, { actor: 'e0', target: 'dragon', text: `-${h.enemyAttack}` }, { ...o, onImpact: hurt('dragon', h.enemyAttack) });
        if (!alive()) return;
        await claw(stage, { actor: 'dragon', target: 'e0', text: `-${h.claw}` }, { ...o, onImpact: hurt('enemy', h.claw) });
        if (busy) {
          if (!alive()) return;
          await claw(stage, { actor: 'dragon2', target: 'e1', text: `-${h.claw}` }, o);
          if (!alive()) return;
          await enemyAttack(stage, { actor: 'e1', target: 'dragon2', text: `-${h.enemyAttack}` }, o);
        }
        await sleep(layout.beats.slotMs);
        if (!alive()) return;
        n++;
        setRounds(n);
        setHp((cur) => (cur.enemy < demo.enemy.maxHp * 0.3 ? full : cur));
        if (n === RESULT_ROUNDS) setResult(meter.current.snapshot());
      }
    })();
    return () => { run.current++; };
  }, [art, restarts, busy]);

  const switchScene = () => { setBusy(!busy); restart(); };
  const restart = () => {
    meter.current.reset();
    setStats(meter.current.snapshot());
    setResult(null);
    setRounds(0);
    setHp(full);
    setLongTasks((n) => (n === null ? null : 0));
    // The round-loop effect above restarts from the top.
    setRestarts((k) => k + 1);
  };
  const standalone = typeof window !== 'undefined'
    && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
  const ok = stats.droppedPct < 5;

  return (
    <div class="app">
      <main class="content bench" data-testid="bench">
        <div class="bench-stats" data-testid="bench-stats" data-fps={stats.fps} data-dropped-pct={stats.droppedPct.toFixed(2)} data-frames={stats.frames} data-nodes={nodes}>
          <div class="bench-big">
            <span class="bench-num" data-testid="bench-fps">{stats.fps}</span><span class="bench-unit">fps</span>
          </div>
          <div class={`bench-big bench-big--${ok ? 'ok' : 'bad'}`}>
            <span class="bench-num" data-testid="bench-dropped">{stats.droppedPct.toFixed(1)}%</span><span class="bench-unit">dropped</span>
          </div>
          <ul class="bench-list">
            <li>Dropped frames: <b>{stats.dropped}</b> of {stats.frames + stats.dropped}</li>
            <li>Worst frame: <b>{Math.round(stats.worstMs)} ms</b></li>
            <li>Display: <b>{stats.hz} Hz</b> · Time: <b>{Math.round(stats.seconds)} s</b></li>
            <li>Rounds: <b>{rounds}</b> · Speed: <b>{fast ? '2x' : '1x'}</b> · Scene: <b>{busy ? '2 vs 2' : '1 vs 1'}</b></li>
            <li>Long tasks: <b>{longTasks ?? 'n/a in this browser'}</b></li>
            <li>Stage nodes: <b>{nodes}</b> of {layout.maxNodes} · <b>{standalone ? 'Home Screen app' : 'Browser'}</b></li>
            {prefersReducedMotion() && <li class="bench-warn">Reduce Motion is on. Idle loops are off, so the numbers will look better than real play.</li>}
          </ul>
          {result && (
            <p class="bench-result" data-testid="bench-result">
              After {RESULT_ROUNDS} rounds ({busy ? '2 vs 2' : '1 vs 1'}): <b>{result.fps} fps, {result.droppedPct.toFixed(1)}% dropped</b>, worst frame {Math.round(result.worstMs)} ms, {result.hz} Hz.
            </p>
          )}
        </div>
        <div class="bench-stage">
          {art ? <Stage stageRef={stageRef} backdrop={art.backdrop} effects={art.effects} fighters={demoFighters(art, hp, { targeted: true, busy })} />
            : <div class="stage stage--loading"><p class="placeholder">Loading the stage…</p></div>}
        </div>
        <div class="bench-buttons">
          <button type="button" class="button" onClick={restart} data-testid="bench-restart">Restart</button>
          <button type="button" class="button button--ghost" aria-pressed={fast} onClick={() => setFast(!fast)}>Speed {fast ? '2x' : '1x'}</button>
          <button type="button" class="button button--ghost" onClick={switchScene} data-testid="bench-scene">{busy ? 'Scene: 2 vs 2' : 'Scene: 1 vs 1'}</button>
          <a class="button button--ghost" href="#/dev/mock">Mock battle</a>
          <a class="button button--ghost" href="#/roost">Back to the game</a>
        </div>
      </main>
    </div>
  );
}
