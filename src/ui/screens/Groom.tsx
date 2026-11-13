import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { groomBond } from '../../core/care';
import { createRng } from '../../core/rng';
import type { DragonState } from '../../core/types';
import { DragonSprite } from '../Sprites';
import { vibrate } from '../bits';

/**
 * Groom and Play: sparkly itchy spots pop up on the dragon for 10 seconds.
 * Tap as many as you can.
 */
export function Groom({ dragon, onDone }: { dragon: DragonState; onDone(taps: number): void }) {
  const g = data.care.groom;
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(g.durationSeconds);
  const [taps, setTaps] = useState(0);
  const rng = useMemo(() => createRng(Date.now() >>> 0), []);
  const spot = () => ({ id: rng.next(), x: rng.int(12, 82), y: rng.int(12, 78) });
  const [spots, setSpots] = useState(() => Array.from({ length: g.targets }, spot));
  const finished = started && left <= 0;
  const tapsRef = useRef(0);

  useEffect(() => {
    if (!started || finished) return;
    const t = window.setInterval(() => setLeft((n) => n - 1), 1000);
    return () => window.clearInterval(t);
  }, [started, finished]);

  const hit = (id: number) => {
    if (finished) return;
    if (!started) setStarted(true);
    tapsRef.current += 1;
    setTaps(tapsRef.current);
    vibrate(10);
    setSpots((all) => all.map((s) => (s.id === id ? spot() : s)));
  };

  return (
    <div class="groom">
      <p class="center" aria-live="polite">
        {!started ? 'Tap the sparkles to scratch the itchy spots!' : finished ? `Done! ${taps} scratches.` : `${left}s left · ${taps} scratches`}
      </p>
      <div class="groom-area">
        <DragonSprite element={dragon.element} element2={dragon.element2} variant={dragon.variant} breed={dragon.breed} stage={dragon.stage} primary={dragon.colors.primary} secondary={dragon.colors.secondary} size={220} />
        {!finished && spots.map((s) => (
          <button key={s.id} type="button" class="groom-spot" style={{ left: `${s.x}%`, top: `${s.y}%` }}
            aria-label="Scratch here" onClick={() => hit(s.id)} data-testid="groom-spot">✦</button>
        ))}
      </div>
      {finished && (
        <button type="button" class="button button--big" onClick={() => onDone(taps)} data-testid="groom-done">
          {dragon.name} loved it! +{groomBond(data, taps)} bond
        </button>
      )}
    </div>
  );
}
