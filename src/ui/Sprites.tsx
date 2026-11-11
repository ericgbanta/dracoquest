import { gameData } from '../core/data';
import type { ElementId } from '../core/types';
import { useSprite } from './art';

interface DragonSpriteProps {
  element: ElementId;
  stage: string;
  primary: string;
  secondary: string;
  size?: number;
  class?: string;
}

/**
 * A dragon in the player's colors. Uses the gray base sprite from the
 * manifest, tinted at runtime, or a placeholder shape if the art is missing.
 */
export function DragonSprite({ element, stage, primary, secondary, size = 160, class: cls = '' }: DragonSpriteProps) {
  const url = useSprite(`dragon.${element}.${stage}`);
  const accent = gameData.elements.info[element].color;
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
    </svg>
  );
}

/** Placeholder shapes for enemies, one silhouette per enemy so they read differently. */
const ENEMY_SHAPES: Record<string, (fill: string) => preact.JSX.Element> = {
  thornling: (f) => (<><path d="M60 20 L72 50 L100 46 L78 66 L92 96 L60 80 L28 96 L42 66 L20 46 L48 50 Z" fill={f} /><circle cx="52" cy="58" r="4" fill="#fff" /><circle cx="68" cy="58" r="4" fill="#fff" /></>),
  'elder-thornling': (f) => (<><path d="M60 8 L76 44 L112 38 L84 64 L102 106 L60 86 L18 106 L36 64 L8 38 L44 44 Z" fill={f} /><circle cx="50" cy="56" r="5" fill="#fff" /><circle cx="70" cy="56" r="5" fill="#fff" /></>),
  'bog-hopper': (f) => (<><ellipse cx="60" cy="74" rx="40" ry="28" fill={f} /><circle cx="42" cy="44" r="12" fill={f} /><circle cx="78" cy="44" r="12" fill={f} /><circle cx="42" cy="42" r="5" fill="#fff" /><circle cx="78" cy="42" r="5" fill="#fff" /><path d="M36 80 Q60 92 84 80" stroke="#0005" stroke-width="3" fill="none" /></>),
  'moss-wisp': (f) => (<><circle cx="60" cy="56" r="26" fill={f} opacity="0.9" /><path d="M40 72 Q48 100 60 84 Q72 100 80 72" fill={f} opacity="0.7" /><circle cx="52" cy="52" r="4" fill="#fff" /><circle cx="68" cy="52" r="4" fill="#fff" /></>),
  'barkback-boar': (f) => (<><ellipse cx="60" cy="70" rx="44" ry="26" fill={f} /><path d="M24 54 L40 40 L56 52 L72 38 L90 52 L100 46" stroke="#0006" stroke-width="5" fill="none" /><circle cx="24" cy="72" r="12" fill={f} /><path d="M14 80 l-8 -8 M18 84 l-6 4" stroke="#fff" stroke-width="3" /><circle cx="26" cy="66" r="3" fill="#fff" /></>),
  'spore-puffer': (f) => (<><path d="M20 62 Q60 6 100 62 Z" fill={f} /><rect x="46" y="60" width="28" height="34" rx="8" fill="#e9e4da" /><circle cx="44" cy="44" r="5" fill="#fff8" /><circle cx="72" cy="36" r="6" fill="#fff8" /><circle cx="54" cy="74" r="3" fill="#1d1a2b" /><circle cx="66" cy="74" r="3" fill="#1d1a2b" /></>),
  'bramble-troll': (f) => (<><rect x="28" y="40" width="64" height="62" rx="20" fill={f} /><circle cx="60" cy="34" r="22" fill={f} /><path d="M26 30 L40 24 M80 24 L94 30 M50 14 L54 4 M66 14 L70 4" stroke="#0006" stroke-width="5" /><circle cx="52" cy="32" r="4" fill="#fff" /><circle cx="68" cy="32" r="4" fill="#fff" /><path d="M48 44 L54 48 L60 44 L66 48 L72 44" stroke="#fff" stroke-width="3" fill="none" /><rect x="94" y="40" width="10" height="56" rx="5" fill="#8a6a44" /></>),
};

export function EnemySprite({ enemyId, element, size = 96 }: { enemyId: string; element: ElementId; size?: number }) {
  const url = useSprite(`enemy.${enemyId}`);
  const name = gameData.enemies[enemyId]?.name ?? 'Enemy';
  if (url) return <img class="sprite" src={url} width={size} height={size} alt={name} />;
  const fill = gameData.elements.info[element].color;
  const shape = ENEMY_SHAPES[enemyId] ?? ((f: string) => <circle cx="60" cy="60" r="40" fill={f} />);
  return (
    <svg class="sprite" width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={name}>
      {shape(fill)}
    </svg>
  );
}
