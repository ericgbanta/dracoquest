import { gameData } from '../core/data';
import type { ElementId, VariantId } from '../core/types';
import { useSprite } from './art';
import { useDragonRig, useEnemyRig } from './stage/Scene';
import { RigView } from './stage/Stage';

interface DragonSpriteProps {
  element: ElementId;
  /** A hybrid's second element: a glow around the tail tip. */
  element2?: ElementId | null;
  /** A rare finish. */
  variant?: VariantId | null;
  /** Body shape: its own painted art when the manifest has it. */
  breed?: string;
  stage: string;
  primary: string;
  secondary: string;
  size?: number;
  class?: string;
  /** Skip the rig and draw the placeholder shape (used as the rig's own fallback). */
  plain?: boolean;
}

/**
 * A dragon in the player's colors. Uses the gray base sprite from the
 * manifest, tinted at runtime, or a placeholder shape if the art is missing.
 */
export function DragonSprite({ element, element2, variant, breed, stage, primary, secondary, size = 160, class: cls = '', plain }: DragonSpriteProps) {
  const rig = useDragonRig(plain ? null : { element, element2, variant, breed, stage, colors: { primary, secondary } });
  const url = useSprite(`dragon.${element}.${stage}`);
  if (rig) {
    return (
      <div class={`sprite sprite--rig ${cls}`} style={{ width: size, height: size }} role="img" aria-label={`${gameData.elements.info[element].name} dragon`}>
        <RigView rig={rig} facing="right" />
      </div>
    );
  }
  const accent = gameData.elements.info[element].color;
  // Placeholder grows with the life stage: bigger body, longer horns.
  const grown = ['hatchling', 'juvenile', 'adult', 'elder'].indexOf(stage);
  const scale = [0.78, 0.9, 1, 1.05][grown] ?? 1;
  if (url) {
    return (
      <div class={`sprite ${cls}`} style={{ width: size, height: size }} role="img" aria-label={`${gameData.elements.info[element].name} dragon`}>
        <img src={url} alt="" width={size} height={size} />
        <div class="sprite-tint" style={{ backgroundColor: primary, maskImage: `url(${url})`, WebkitMaskImage: `url(${url})` }} />
      </div>
    );
  }
  return (
    <svg class={`sprite ${cls}`} width={size} height={size} viewBox="0 0 120 120" role="img"
      aria-label={`${gameData.elements.info[element].name} dragon`}>
      <g transform={`translate(${60 - 60 * scale} ${120 - 120 * scale}) scale(${scale})`}>
      {/* wings */}
      <path d="M44 52 L14 26 L22 58 L8 62 L40 72 Z" fill={secondary} stroke="#0003" stroke-width="2" />
      <path d="M72 50 L104 20 L98 54 L114 58 L80 70 Z" fill={secondary} stroke="#0003" stroke-width="2" />
      {/* tail */}
      <path d="M38 88 Q14 98 12 80 Q20 90 34 80 Z" fill={primary} stroke="#0003" stroke-width="2" />
      <path d="M12 80 l-6 -6 l10 0 z" fill={accent} />
      {/* body */}
      <ellipse cx="58" cy="80" rx="28" ry="24" fill={primary} stroke="#0003" stroke-width="2" />
      <ellipse cx="60" cy="86" rx="16" ry="14" fill={secondary} opacity="0.85" />
      {/* head */}
      <circle cx="64" cy="46" r="18" fill={primary} stroke="#0003" stroke-width="2" />
      <path d="M54 32 l-4 -12 l9 8 z M72 30 l4 -12 l-1 12 z" fill={accent} />
      <ellipse cx="76" cy="52" rx="9" ry="6" fill={secondary} />
      <circle cx="68" cy="42" r="4" fill="#fff" />
      <circle cx="69" cy="42" r="2" fill="#1d1a2b" />
      {/* feet */}
      <ellipse cx="46" cy="102" rx="8" ry="4" fill={primary} stroke="#0003" stroke-width="2" />
      <ellipse cx="72" cy="102" rx="8" ry="4" fill={primary} stroke="#0003" stroke-width="2" />
      {grown >= 1 && <path d="M50 64 l-4 -6 l8 2 z M58 60 l0 -7 l5 6 z M66 62 l4 -6 l1 7 z" fill={accent} />}
      {grown >= 2 && <path d="M50 28 l-10 -16 l14 10 z M74 26 l10 -16 l-6 18 z" fill={accent} stroke="#0003" stroke-width="1" />}
      </g>
    </svg>
  );
}

/** Placeholder shapes for enemies, one silhouette per enemy so they read differently. */
const crab = (f: string, big = 1) => (<><ellipse cx="60" cy="72" rx={34 * big} ry={22 * big} fill={f} /><circle cx={30 - 4 * big} cy="46" r={12 * big} fill={f} /><circle cx={90 + 4 * big} cy="46" r={12 * big} fill={f} /><path d="M22 40 l-6 -8 M98 40 l6 -8" stroke="#0006" stroke-width="4" /><circle cx="52" cy="60" r="4" fill="#fff" /><circle cx="68" cy="60" r="4" fill="#fff" /></>);
const bird = (f: string, big = 1) => (<><path d={`M60 ${50 - 10 * big} L${60 - 50 * big} 40 L48 70 Z M60 ${50 - 10 * big} L${60 + 50 * big} 40 L72 70 Z`} fill={f} opacity="0.85" /><ellipse cx="60" cy="68" rx={16 * big} ry={22 * big} fill={f} /><path d="M60 52 l10 6 l-10 4 z" fill="#f2a541" /><circle cx="56" cy="54" r="3" fill="#fff" /></>);
const blob = (f: string) => (<><path d="M24 92 Q20 40 60 36 Q100 40 96 92 Z" fill={f} /><circle cx="48" cy="62" r="5" fill="#fff" /><circle cx="72" cy="62" r="5" fill="#fff" /></>);
const imp = (f: string) => (<><circle cx="60" cy="56" r="22" fill={f} /><path d="M42 40 l-6 -16 l14 10 z M78 40 l6 -16 l-14 10 z" fill={f} /><rect x="48" y="76" width="24" height="24" rx="8" fill={f} /><path d="M86 50 L100 30 L100 96" stroke="#8a6a44" stroke-width="4" fill="none" /><circle cx="52" cy="54" r="4" fill="#fff" /><circle cx="68" cy="54" r="4" fill="#fff" /></>);
const lizard = (f: string, big = 1) => (<><ellipse cx="56" cy="70" rx={34 * big} ry={16 * big} fill={f} /><circle cx={92 + 6 * big} cy="62" r={12 * big} fill={f} /><path d={`M22 70 Q4 ${80 + 8 * big} 10 100`} stroke={f} stroke-width={8 * big} fill="none" /><circle cx={96 + 6 * big} cy="58" r="3" fill="#fff" />{big > 1 && <path d="M30 56 l6 -12 l6 12 M48 54 l6 -12 l6 12 M66 54 l6 -12 l6 12" fill={f} stroke="#0004" />}</>);
const goat = (f: string) => (<><ellipse cx="58" cy="70" rx="32" ry="20" fill={f} /><circle cx="90" cy="50" r="14" fill={f} /><path d="M84 38 Q70 20 86 18 M96 38 Q110 20 94 18" stroke="#a58c6a" stroke-width="6" fill="none" /><path d="M36 88 v14 M52 88 v14 M66 88 v14 M80 88 v14" stroke={f} stroke-width="6" /><circle cx="94" cy="48" r="3" fill="#fff" /></>);
const cloud = (f: string) => (<><circle cx="44" cy="58" r="22" fill={f} /><circle cx="70" cy="50" r="26" fill={f} /><circle cx="88" cy="66" r="18" fill={f} /><path d="M58 80 l-8 16 l10 -4 l-6 16" stroke="#f5e27a" stroke-width="4" fill="none" /><circle cx="60" cy="54" r="4" fill="#fff" /><circle cx="78" cy="54" r="4" fill="#fff" /></>);

const ENEMY_SHAPES: Record<string, (fill: string) => preact.JSX.Element> = {
  'pincher-crab': (f) => crab(f), 'big-pincher': (f) => crab(f, 1.2), 'shell-knight': (f) => (<>{crab(f, 0.9)}<path d="M60 20 v40" stroke="#e9e4da" stroke-width="4" /></>),
  'crab-king': (f) => (<>{crab(f, 1.3)}<path d="M44 44 l6 -16 l10 10 l10 -10 l6 16 z" fill="#f5e27a" /></>),
  'gull-bandit': (f) => bird(f, 0.8), 'gale-hawk': (f) => bird(f, 0.9), 'cliff-harpy': (f) => bird(f, 1),
  'storm-roc': (f) => (<>{bird(f, 1.2)}<path d="M40 100 l10 -14 l-2 10 l10 -12" stroke="#f5e27a" stroke-width="3" fill="none" /></>),
  'brine-slime': blob, 'kelp-lurker': (f) => (<>{blob(f)}<path d="M34 40 Q30 20 40 10 M60 36 Q60 16 66 6 M86 40 Q92 20 82 10" stroke={f} stroke-width="5" fill="none" /></>),
  'ember-imp': imp, 'imp-chieftain': (f) => (<>{imp(f)}<path d="M44 30 l6 -12 l10 8 l10 -8 l6 12 z" fill="#f5e27a" /></>),
  'ash-lizard': (f) => lizard(f), 'magma-wyrm': (f) => lizard(f, 1.25), 'lava-toad': (f) => ENEMY_SHAPES['bog-hopper']!(f),
  'cinder-beetle': (f) => (<><ellipse cx="60" cy="66" rx="36" ry="28" fill={f} /><path d="M60 38 v56" stroke="#0005" stroke-width="3" /><circle cx="60" cy="34" r="10" fill={f} /><path d="M30 80 l-10 10 M90 80 l10 10 M28 60 l-12 0 M92 60 l12 0" stroke={f} stroke-width="4" /></>),
  'smog-bat': (f) => (<><path d="M60 50 L10 36 L26 64 L40 56 L48 72 L60 60 L72 72 L80 56 L94 64 L110 36 Z" fill={f} /><circle cx="60" cy="58" r="12" fill={f} /><circle cx="56" cy="56" r="2" fill="#fff" /><circle cx="64" cy="56" r="2" fill="#fff" /></>),
  'spark-sprite': (f) => (<><path d="M60 16 L72 50 L104 56 L74 68 L80 102 L60 80 L40 102 L46 68 L16 56 L48 50 Z" fill={f} /><circle cx="54" cy="58" r="3" fill="#fff" /><circle cx="66" cy="58" r="3" fill="#fff" /></>),
  'frostbite-hare': (f) => (<><ellipse cx="60" cy="74" rx="26" ry="20" fill={f} /><circle cx="78" cy="56" r="14" fill={f} /><path d="M72 44 l-4 -28 l10 26 M84 44 l6 -26 l-2 28" stroke={f} stroke-width="7" stroke-linecap="round" /><circle cx="82" cy="54" r="3" fill="#1d1a2b" /></>),
  'ice-wraith': (f) => (<><path d="M60 18 C88 18 92 50 90 70 L96 102 L80 92 L70 104 L60 92 L50 104 L40 92 L24 102 L30 70 C28 50 32 18 60 18 Z" fill={f} opacity="0.85" /><circle cx="50" cy="52" r="5" fill="#fff" /><circle cx="70" cy="52" r="5" fill="#fff" /></>),
  'glacier-turtle': (f) => (<><ellipse cx="58" cy="70" rx="40" ry="26" fill={f} /><path d="M30 60 l14 -18 l14 18 l14 -18 l14 18" stroke="#fff8" stroke-width="4" fill="none" /><circle cx="100" cy="74" r="10" fill={f} /><circle cx="103" cy="71" r="2" fill="#1d1a2b" /></>),
  'yeti-cub': (f) => (<><circle cx="60" cy="68" r="34" fill={f} /><circle cx="60" cy="56" r="18" fill="#e9e4da" /><circle cx="53" cy="52" r="3" fill="#1d1a2b" /><circle cx="67" cy="52" r="3" fill="#1d1a2b" /><path d="M54 62 q6 5 12 0" stroke="#1d1a2b" stroke-width="3" fill="none" /></>),
  'rime-wolf': (f) => (<><ellipse cx="54" cy="72" rx="32" ry="16" fill={f} /><path d="M80 66 L104 52 L100 76 Z M86 56 l2 -14 l6 12" fill={f} /><path d="M24 70 Q8 60 14 46" stroke={f} stroke-width="8" fill="none" /><circle cx="94" cy="60" r="2.5" fill="#1d1a2b" /></>),
  'rime-alpha': (f) => (<><ellipse cx="52" cy="72" rx="38" ry="19" fill={f} /><path d="M82 64 L110 48 L106 78 Z M88 54 l2 -16 l7 14" fill={f} /><circle cx="98" cy="58" r="3" fill="#f5e27a" /></>),
  'glacier-hydra': (f) => (<><ellipse cx="60" cy="88" rx="40" ry="18" fill={f} /><path d="M40 80 Q26 46 34 22 M60 76 Q60 40 60 14 M80 80 Q94 46 86 22" stroke={f} stroke-width="12" fill="none" stroke-linecap="round" /><circle cx="34" cy="20" r="9" fill={f} /><circle cx="60" cy="12" r="9" fill={f} /><circle cx="86" cy="20" r="9" fill={f} /></>),
  'tunnel-mole': (f) => (<><ellipse cx="60" cy="72" rx="34" ry="24" fill={f} /><ellipse cx="92" cy="72" rx="10" ry="7" fill="#f28bd0" /><path d="M36 92 l-6 8 M48 94 l-4 8 M72 94 l4 8" stroke="#e9e4da" stroke-width="4" /></>),
  'crystal-crawler': (f) => (<><path d="M60 46 L80 66 L60 90 L40 66 Z" fill={f} /><path d="M42 62 L14 46 M42 70 L12 74 M44 78 L18 98 M78 62 L106 46 M78 70 L108 74 M76 78 L102 98" stroke={f} stroke-width="4" /><circle cx="56" cy="62" r="3" fill="#fff" /><circle cx="64" cy="62" r="3" fill="#fff" /></>),
  'lantern-gnome': (f) => (<><path d="M60 14 L80 50 L40 50 Z" fill="#c8433b" /><circle cx="60" cy="62" r="16" fill="#f7c27a" /><rect x="44" y="76" width="32" height="26" rx="6" fill={f} /><circle cx="92" cy="80" r="8" fill="#f5e27a" /><path d="M76 84 L88 80" stroke="#8a6a44" stroke-width="3" /></>),
  'gemback-lizard': (f) => lizard(f, 1.1), 'rust-sprite': (f) => ENEMY_SHAPES['spark-sprite']!(f),
  'foreman-golem': (f) => (<><rect x="30" y="40" width="60" height="60" rx="10" fill={f} /><path d="M34 40 Q60 16 86 40 Z" fill="#f2a541" /><rect x="44" y="56" width="10" height="8" fill="#f5e27a" /><rect x="66" y="56" width="10" height="8" fill="#f5e27a" /></>),
  'iron-golem': (f) => (<><rect x="24" y="36" width="72" height="70" rx="12" fill={f} /><rect x="40" y="16" width="40" height="28" rx="6" fill={f} /><rect x="46" y="26" width="10" height="6" fill="#e8603c" /><rect x="64" y="26" width="10" height="6" fill="#e8603c" /><path d="M36 60 h48 M36 76 h48" stroke="#0004" stroke-width="4" /></>),
  'dawn-sprite': (f) => (<><circle cx="60" cy="60" r="20" fill={f} /><path d="M60 20 v12 M60 88 v12 M20 60 h12 M88 60 h12 M32 32 l8 8 M80 80 l8 8 M88 32 l-8 8 M32 88 l8 -8" stroke={f} stroke-width="5" stroke-linecap="round" /><circle cx="54" cy="58" r="3" fill="#1d1a2b" /><circle cx="66" cy="58" r="3" fill="#1d1a2b" /></>),
  'dusk-bat': (f) => ENEMY_SHAPES['smog-bat']!(f),
  'sun-knight': (f) => (<><rect x="38" y="44" width="44" height="54" rx="10" fill={f} /><circle cx="60" cy="34" r="16" fill={f} /><rect x="50" y="30" width="20" height="6" fill="#1d1a2b" /><path d="M92 20 L92 100" stroke="#e9e4da" stroke-width="5" /><circle cx="92" cy="20" r="6" fill="#f5e27a" /></>),
  'shade-stalker': (f) => (<><path d="M60 14 C84 30 86 70 80 104 L60 92 L40 104 C34 70 36 30 60 14 Z" fill={f} /><path d="M48 50 l8 4 M72 50 l-8 4" stroke="#f5e27a" stroke-width="4" /></>),
  'twilight-moth': (f) => (<><path d="M60 60 C30 20 10 40 20 70 C30 90 50 80 60 60 C70 80 90 90 100 70 C110 40 90 20 60 60 Z" fill={f} /><path d="M60 40 v44" stroke="#f5e27a" stroke-width="5" /></>),
  'eclipse-herald': (f) => (<><path d="M60 16 L86 100 L34 100 Z" fill={f} /><circle cx="60" cy="40" r="14" fill="#f5e27a" /><circle cx="64" cy="38" r="14" fill={f} /><path d="M86 30 l20 -10 M86 40 l22 0" stroke="#f5e27a" stroke-width="4" /></>),
  'eclipse-dragon': (f) => (<><path d="M24 66 L4 30 L30 52 Z M96 66 L116 30 L90 52 Z" fill={f} /><ellipse cx="60" cy="74" rx="34" ry="28" fill={f} /><circle cx="60" cy="38" r="22" fill="#f5e27a" /><circle cx="67" cy="34" r="20" fill={f} /><circle cx="54" cy="70" r="5" fill="#f5e27a" /><circle cx="70" cy="70" r="5" fill="#f5e27a" /></>),
  'thunder-goat': goat, 'granite-ram': (f) => (<>{goat(f)}<circle cx="78" cy="38" r="10" fill="#a58c6a" /></>), thunderhead: cloud,
  thornling: (f) => (<><path d="M60 20 L72 50 L100 46 L78 66 L92 96 L60 80 L28 96 L42 66 L20 46 L48 50 Z" fill={f} /><circle cx="52" cy="58" r="4" fill="#fff" /><circle cx="68" cy="58" r="4" fill="#fff" /></>),
  'elder-thornling': (f) => (<><path d="M60 8 L76 44 L112 38 L84 64 L102 106 L60 86 L18 106 L36 64 L8 38 L44 44 Z" fill={f} /><circle cx="50" cy="56" r="5" fill="#fff" /><circle cx="70" cy="56" r="5" fill="#fff" /></>),
  'bog-hopper': (f) => (<><ellipse cx="60" cy="74" rx="40" ry="28" fill={f} /><circle cx="42" cy="44" r="12" fill={f} /><circle cx="78" cy="44" r="12" fill={f} /><circle cx="42" cy="42" r="5" fill="#fff" /><circle cx="78" cy="42" r="5" fill="#fff" /><path d="M36 80 Q60 92 84 80" stroke="#0005" stroke-width="3" fill="none" /></>),
  'moss-wisp': (f) => (<><circle cx="60" cy="56" r="26" fill={f} opacity="0.9" /><path d="M40 72 Q48 100 60 84 Q72 100 80 72" fill={f} opacity="0.7" /><circle cx="52" cy="52" r="4" fill="#fff" /><circle cx="68" cy="52" r="4" fill="#fff" /></>),
  'barkback-boar': (f) => (<><ellipse cx="60" cy="70" rx="44" ry="26" fill={f} /><path d="M24 54 L40 40 L56 52 L72 38 L90 52 L100 46" stroke="#0006" stroke-width="5" fill="none" /><circle cx="24" cy="72" r="12" fill={f} /><path d="M14 80 l-8 -8 M18 84 l-6 4" stroke="#fff" stroke-width="3" /><circle cx="26" cy="66" r="3" fill="#fff" /></>),
  'spore-puffer': (f) => (<><path d="M20 62 Q60 6 100 62 Z" fill={f} /><rect x="46" y="60" width="28" height="34" rx="8" fill="#e9e4da" /><circle cx="44" cy="44" r="5" fill="#fff8" /><circle cx="72" cy="36" r="6" fill="#fff8" /><circle cx="54" cy="74" r="3" fill="#1d1a2b" /><circle cx="66" cy="74" r="3" fill="#1d1a2b" /></>),
  'bramble-troll': (f) => (<><rect x="28" y="40" width="64" height="62" rx="20" fill={f} /><circle cx="60" cy="34" r="22" fill={f} /><path d="M26 30 L40 24 M80 24 L94 30 M50 14 L54 4 M66 14 L70 4" stroke="#0006" stroke-width="5" /><circle cx="52" cy="32" r="4" fill="#fff" /><circle cx="68" cy="32" r="4" fill="#fff" /><path d="M48 44 L54 48 L60 44 L66 48 L72 44" stroke="#fff" stroke-width="3" fill="none" /><rect x="94" y="40" width="10" height="56" rx="5" fill="#8a6a44" /></>),
};

export function EnemySprite({ enemyId, element, size = 96, plain }: { enemyId: string; element: ElementId; size?: number; plain?: boolean }) {
  const rig = useEnemyRig(plain ? null : enemyId);
  const url = useSprite(`enemy.${enemyId}`);
  const name = gameData.enemies[enemyId]?.name ?? 'Enemy';
  if (rig) {
    return (
      <div class="sprite sprite--rig" style={{ width: size, height: size }} role="img" aria-label={name}>
        <RigView rig={rig} facing="left" />
      </div>
    );
  }
  if (url) return <img class="sprite" src={url} width={size} height={size} alt={name} />;
  const fill = gameData.elements.info[element].color;
  const shape = ENEMY_SHAPES[enemyId] ?? ((f: string) => <circle cx="60" cy="60" r="40" fill={f} />);
  return (
    <svg class="sprite" width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={name}>
      {shape(fill)}
    </svg>
  );
}
