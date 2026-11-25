import { assetUrl } from '../game/AssetUrl';
import { ENCHANTS, GEM_SHOP_ITEMS, ItemRarity, ORES, PICKAXES, WEATHER_ORES } from '../game/GameData';
import type { ResearchIconKind } from '../game/ResearchData';
import { WEATHERS, type WeatherId } from '../game/WeatherData';
import {
  get3dHudIconUrl,
  get3dOreIconUrl,
  Hud3dIconKey,
} from '../game3d/HudIcon3DRenderer';

const PICKAXE_ART_IDS = new Set(PICKAXES.map((p) => p.id));
const POTION_ART_IDS = new Set(GEM_SHOP_ITEMS.map((item) => item.id));
const ENCHANT_ART_IDS = new Set(ENCHANTS.map((e) => e.id));
const WEATHER_ART_IDS = new Set<WeatherId>(WEATHERS.map((w) => w.id));
const HUD_ART_KEYS = new Set([
  'shops',
  'shopBasket',
  'hourglass',
  'indexBook',
  'gem',
  'backpack',
  'chest',
  'sparkle',
  'daily',
  'quest',
  'trade',
  'tower',
  'stats',
  'mutation',
  'enchant',
  'lock',
]);
const ORE_ART_IDS = new Set([...ORES.map((o) => o.id), ...WEATHER_ORES.map((o) => o.id)]);

export function oreIconSvg(
  color: string,
  secondary: string,
  rarity: ItemRarity = 'common',
  idSeed = '',
  oreId = ''
): string {
  const inferredId = oreId || (idSeed.includes('_') ? idSeed.slice(idSeed.lastIndexOf('_') + 1) : idSeed);
  if (ORE_ART_IDS.has(inferredId)) {
    const artUrl = assetUrl(`/ores/${inferredId}.webp`);
    return `<img class="mam-3d-icon drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]" src="${artUrl}" width="64" height="64" alt="${inferredId}" />`;
  }
  const url3d = get3dOreIconUrl(color, secondary, rarity, inferredId);
  if (url3d) {
    return `<img class="mam-3d-icon" src="${url3d}" width="64" height="64" alt="ore" />`;
  }
  const uid = idSeed.replace(/[^a-z0-9]/gi, '') || 'ore';

  if (rarity === 'common') {
    // Rough matte rock chunk
    return `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <polygon points="12,42 18,22 34,16 50,24 53,44 36,52 18,50" fill="${color}" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="18,22 34,16 40,32 24,36" fill="#ffffff" opacity="0.14"/>
      <polygon points="40,32 50,24 53,44 36,52" fill="${secondary}" opacity="0.55"/>
    </svg>`;
  }

  if (rarity === 'uncommon') {
    // Layered ore slab with mineral seams
    return `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <polygon points="8,44 16,24 38,18 54,30 52,48 26,53" fill="${secondary}" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="14,34 26,16 44,20 38,38" fill="${color}" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="36,36 46,24 54,32 46,44" fill="${color}" stroke="#0f172a" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M20 40 L30 28 L42 32" fill="none" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
    </svg>`;
  }

  if (rarity === 'rare') {
    // Branching mineral / twin crystal vein
    return `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <polygon points="12,46 20,30 44,30 54,46 34,54" fill="${secondary}" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/>
      <path d="M24 34 L18 16 M24 26 L12 22 M36 34 L42 14 M39 24 L50 20" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
      <path d="M24 34 L18 16 M24 26 L12 22 M36 34 L42 14 M39 24 L50 20" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.65"/>
      <polygon points="28,38 33,16 40,36" fill="${color}" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/>
    </svg>`;
  }

  if (rarity === 'epic') {
    // Sharp multi-spire crystal crown + sparkles
    return `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <polygon points="10,46 18,32 46,32 54,46 32,54" fill="${secondary}" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="18,38 14,18 26,30" fill="${color}" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="24,38 32,8 40,38" fill="${color}" stroke="#0f172a" stroke-width="2.6" stroke-linejoin="round"/>
      <polygon points="38,34 49,16 48,38" fill="${color}" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="28,36 32,12 34,36" fill="#ffffff" opacity="0.45"/>
      <path d="M16 14l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#fff"/>
    </svg>`;
  }

  if (rarity === 'legendary') {
    // Dramatic 5-pillar crystal cluster with glowing aura
    return `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <circle cx="32" cy="34" r="22" fill="${color}" opacity="0.22"/>
      <polygon points="10,46 18,34 46,34 54,46 32,55" fill="${secondary}" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="14,42 10,20 24,34" fill="${color}" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="22,40 24,10 34,38" fill="${color}" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="30,40 38,8 44,40" fill="${color}" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="42,40 54,18 50,42" fill="${color}" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="25,36 27,14 30,36" fill="#ffffff" opacity="0.5"/>
      <path d="M48 12l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" fill="#fde047"/>
    </svg>`;
  }

  if (rarity === 'rainbow') {
    // Radiant prismatic gem core with solar ring
    return `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <defs>
        <linearGradient id="rb_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f43f5e"/>
          <stop offset="33%" stop-color="#facc15"/>
          <stop offset="66%" stop-color="#22c55e"/>
          <stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="24" fill="url(#rb_${uid})" opacity="0.28"/>
      <circle cx="32" cy="32" r="20" fill="none" stroke="url(#rb_${uid})" stroke-width="3" stroke-dasharray="6 4"/>
      <polygon points="12,48 20,34 44,34 52,48 32,54" fill="${secondary}" stroke="#0f172a" stroke-width="2.8" stroke-linejoin="round"/>
      <polygon points="32,8 48,26 40,44 24,44 16,26" fill="url(#rb_${uid})" stroke="#0f172a" stroke-width="2.8" stroke-linejoin="round"/>
      <polygon points="32,12 42,26 32,40 22,26" fill="#ffffff" opacity="0.45"/>
      <path d="M14 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/>
      <path d="M50 12l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#fde047"/>
    </svg>`;
  }

  // Mythic: Celestial floating geode with halo & orbiting shards
  return `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
    <circle cx="32" cy="32" r="26" fill="${secondary}" opacity="0.32"/>
    <ellipse cx="32" cy="34" rx="24" ry="12" fill="none" stroke="#fde047" stroke-width="2.6" transform="rotate(-18 32 34)"/>
    <polygon points="32,6 46,22 44,44 32,56 20,44 18,22" fill="${color}" stroke="#0f172a" stroke-width="2.8" stroke-linejoin="round"/>
    <polygon points="32,10 42,24 32,46 22,24" fill="#ffffff" opacity="0.5"/>
    <polygon points="10,24 14,16 18,24 14,32" fill="#f472b6" stroke="#0f172a" stroke-width="2"/>
    <polygon points="46,26 50,18 54,26 50,34" fill="#38bdf8" stroke="#0f172a" stroke-width="2"/>
    <path d="M14 10l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/>
    <path d="M50 44l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" fill="#fde047"/>
  </svg>`;
}

export function otherItemSvg(kind: 'scroll' | 'gems' | 'potion' | 'charm', color: string): string {
  const mapKey: Record<'scroll' | 'gems' | 'potion' | 'charm', Hud3dIconKey> = {
    gems: 'other_gems',
    scroll: 'other_scroll',
    potion: 'other_potion',
    charm: 'other_charm',
  };
  const url3d = get3dHudIconUrl(mapKey[kind]);
  if (url3d) {
    return `<img class="mam-3d-icon" src="${url3d}" width="56" height="56" alt="${kind}" />`;
  }
  if (kind === 'gems') {
    return `<svg viewBox="0 0 64 64" width="60" height="60" aria-hidden="true">
      <polygon points="32,8 50,18 52,42 32,56 12,42 14,18" fill="${color}" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="32,14 43,22 44,39 32,48 20,39 21,22" fill="#fbcfe8" opacity="0.45"/>
      <polygon points="32,21 38,27 32,41 26,27" fill="#ffffff" opacity="0.65"/>
    </svg>`;
  }
  if (kind === 'scroll') {
    return `<svg viewBox="0 0 64 64" width="60" height="60" aria-hidden="true">
      <rect x="16" y="14" width="32" height="36" rx="4" fill="#fde68a" stroke="#0f172a" stroke-width="3"/>
      <rect x="12" y="12" width="40" height="8" rx="4" fill="#d97706" stroke="#0f172a" stroke-width="2.5"/>
      <rect x="12" y="44" width="40" height="8" rx="4" fill="#d97706" stroke="#0f172a" stroke-width="2.5"/>
      <line x1="23" y1="26" x2="41" y2="26" stroke="#92400e" stroke-width="3" stroke-linecap="round"/>
      <line x1="23" y1="34" x2="37" y2="34" stroke="#92400e" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  }
  if (kind === 'charm') {
    return `<svg viewBox="0 0 64 64" width="60" height="60" aria-hidden="true">
      <circle cx="32" cy="34" r="16" fill="none" stroke="${color}" stroke-width="5"/>
      <polygon points="24,14 40,14 44,22 32,32 20,22" fill="#67e8f9" stroke="#0f172a" stroke-width="2.5"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 64 64" width="60" height="60" aria-hidden="true">
    <rect x="26" y="10" width="12" height="8" rx="2" fill="#cbd5e1" stroke="#0f172a" stroke-width="2.5"/>
    <path d="M25 18 L39 18 L48 38 C50 45 45 52 38 52 L26 52 C19 52 14 45 16 38 Z" fill="${color}" stroke="#0f172a" stroke-width="3"/>
    <circle cx="28" cy="36" r="3" fill="#fff" opacity="0.7"/>
  </svg>`;
}

export const HUD_ICONS = {
  shops: `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10z" fill="#fef08a" stroke="#14532d" stroke-width="2"/></svg>`,
  shopBasket: `<svg viewBox="0 0 36 36" width="38" height="38"><path d="M6 15h24l-3 14H9L6 15z" fill="#ef4444" stroke="#0f172a" stroke-width="2.4"/><path d="M12 15l6-8 6 8" fill="none" stroke="#f8fafc" stroke-width="2.6" stroke-linecap="round"/><rect x="4" y="13" width="28" height="4" rx="2" fill="#f87171" stroke="#0f172a" stroke-width="2"/></svg>`,
  hourglass: `<svg viewBox="0 0 36 36" width="38" height="38"><path d="M10 6h16M10 30h16M12 6c0 7 6 9 6 12s-6 5-6 12M24 6c0 7-6 9-6 12s6 5 6 12" fill="none" stroke="#fde047" stroke-width="2.8" stroke-linecap="round"/><polygon points="14,28 22,28 18,22" fill="#38bdf8"/></svg>`,
  indexBook: `<svg viewBox="0 0 36 36" width="38" height="38"><path d="M6 9c4-2 8-1 12 2 4-3 8-4 12-2v19c-4-2-8-1-12 2-4-3-8-4-12-2V9z" fill="#fef3c7" stroke="#1e3a8a" stroke-width="2.6"/><path d="M6 9v19l12 2V11L6 9z" fill="#3b82f6" stroke="#1e3a8a" stroke-width="2"/></svg>`,
  gem: `<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,2 20,7 20,17 12,22 4,17 4,7" fill="#ec4899" stroke="#831843" stroke-width="1.8"/><polygon points="12,5 17,8.5 17,15.5 12,19 7,15.5 7,8.5" fill="#f9a8d4" opacity="0.55"/><polygon points="12,7 14.5,12 12,16.5 9.5,12" fill="#ffffff" opacity="0.7"/></svg>`,
  backpack: `<svg viewBox="0 0 40 40" width="38" height="38"><rect x="9" y="12" width="22" height="22" rx="6" fill="#b45309" stroke="#451a03" stroke-width="2.4"/><rect x="12" y="20" width="16" height="10" rx="3" fill="#d97706" stroke="#451a03" stroke-width="2"/><path d="M15 12V9a5 5 0 0 1 10 0v3" fill="none" stroke="#78350f" stroke-width="2.6"/><path d="M26 7l8 8" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/></svg>`,
  sparkle: `<svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 1l2.2 6.8L19 10l-6.8 2.2L10 19l-2.2-6.8L1 10l6.8-2.2z" fill="#fde047"/></svg>`,
  daily: `<svg viewBox="0 0 24 24" width="20" height="20"><rect x="4" y="5" width="16" height="15" rx="3" fill="#3b82f6" stroke="#1e3a8a" stroke-width="2"/><rect x="10" y="5" width="4" height="15" fill="#facc15"/><rect x="4" y="10" width="16" height="4" fill="#facc15"/></svg>`,
  chest: `<svg viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="8" width="18" height="12" rx="3" fill="#92400e" stroke="#451a03" stroke-width="2"/><rect x="3" y="12" width="18" height="3" fill="#facc15"/></svg>`,
  quest: `<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="4" width="12" height="16" rx="2" fill="#fef3c7" stroke="#92400e" stroke-width="2"/><circle cx="12" cy="12" r="2.5" fill="#ef4444"/></svg>`,
  trade: `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="9" cy="10" r="5" fill="#facc15" stroke="#854d0e" stroke-width="1.8"/><circle cx="15" cy="14" r="5" fill="#38bdf8" stroke="#075985" stroke-width="1.8"/></svg>`,
  pickaxe: `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 19l9-9M8 5c4-1 8 1 11 4l-3 3c-2-2-5-3-8-3V5z" stroke="#38bdf8" stroke-width="2.2" fill="none"/></svg>`,
  stats: `<svg viewBox="0 0 24 24" width="20" height="20"><rect x="4" y="13" width="4" height="7" fill="#ef4444"/><rect x="10" y="9" width="4" height="11" fill="#facc15"/><rect x="16" y="4" width="4" height="16" fill="#22c55e"/></svg>`,
  mutation: `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="7" fill="#a855f7" stroke="#581c87" stroke-width="2"/></svg>`,
  enchant: `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="7" fill="#c084fc" stroke="#facc15" stroke-width="2"/></svg>`,
  tower: `<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,2 16,7 14,7 17,19 7,19 10,7 8,7" fill="#38bdf8" stroke="#c084fc" stroke-width="1.6" stroke-linejoin="round"/><rect x="5" y="19" width="14" height="3" rx="1" fill="#312e81" stroke="#38bdf8" stroke-width="1.2"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="10" width="12" height="10" rx="2" fill="#64748b"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#cbd5e1" stroke-width="2"/></svg>`,
} as const;

export function towerIconHtml(sizePx = 22): string {
  const artUrl = assetUrl('/hud/tower.webp');
  return `<img class="mam-3d-icon drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]" src="${artUrl}" width="${sizePx}" height="${sizePx}" alt="Gem Tower" />`;
}

export function riftShardIconHtml(sizePx = 18, alt = 'Rift Shard'): string {
  const artUrl = assetUrl('/hud/rift_shard.webp');
  return `<img class="mam-3d-icon" src="${artUrl}" width="${sizePx}" height="${sizePx}" alt="${alt}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;display:inline-block;vertical-align:middle;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.55));flex-shrink:0;" draggable="false" />`;
}

/** Crisp crimson-gold Omega crest SVG for Victory/Forge slots, Duel Sanctum modal plaque, and Plaza dock button. */
export function omegaCrestIconHtml(sizePx = 22): string {
  return `<svg viewBox="0 0 28 28" width="${sizePx}" height="${sizePx}" fill="none" aria-hidden="true" class="shrink-0">
    <path d="M4.2 23.8L8.4 19.6M23.8 23.8L19.6 19.6" stroke="#14111d" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M4.2 23.8L8.4 19.6M23.8 23.8L19.6 19.6" stroke="#fde047" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M6.4 18L10 21.6M21.6 18L18 21.6" stroke="#14111d" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M6.4 18L10 21.6M21.6 18L18 21.6" stroke="#fde047" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M8.8 19.2L22.2 5.8L24.5 3.5L21 7L10.4 20.6Z" fill="#e2e8f0" stroke="#14111d" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M19.2 19.2L5.8 5.8L3.5 3.5L7 7L17.6 20.6Z" fill="#f8fafc" stroke="#14111d" stroke-width="1.6" stroke-linejoin="round"/>
    <polygon points="14,3.2 22.8,9.8 20.4,22.2 14,25.6 7.6,22.2 5.2,9.8" fill="#ef4444" stroke="#14111d" stroke-width="2.1" stroke-linejoin="round"/>
    <polygon points="14,3.2 22.8,9.8 20.4,22.2 14,25.6" fill="#991b1b" fill-opacity="0.45"/>
    <polygon points="14,5.6 20.3,10.6 18.4,20.4 14,23 9.6,20.4 7.7,10.6" fill="none" stroke="#fca5a5" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="14" cy="14" r="5.3" fill="#fde047" stroke="#14111d" stroke-width="1.9"/>
    <path d="M10.4 16.5H12.2C11.1 15.1 11.4 11.7 14 11.7C16.6 11.7 16.9 15.1 15.8 16.5H17.6" fill="none" stroke="#7f1d1d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/** Crisp Sticker-Pop Boss Key SVG icon for Omega Duel Sanctum and Tower key pills. */
export function bossKeyIconHtml(sizePx = 15): string {
  return `<svg viewBox="0 0 24 24" width="${sizePx}" height="${sizePx}" fill="none" aria-hidden="true" class="shrink-0">
    <circle cx="8" cy="12" r="4.8" fill="#fde047" stroke="#14111d" stroke-width="2.2"/>
    <circle cx="8" cy="12" r="1.6" fill="#14111d"/>
    <path d="M12.5 12H21.5M18 12V16M21 12V15" stroke="#14111d" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12.5 12H21.5M18 12V16M21 12V15" stroke="#fde047" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function hudIconHtml(key: keyof typeof HUD_ICONS & Hud3dIconKey, sizePx: number, alt = ''): string {
  if (key === 'pickaxe') {
    return pickaxeIconHtml('sunwheel', sizePx, alt || 'Pickaxe');
  }
  if (HUD_ART_KEYS.has(key)) {
    const artUrl = assetUrl(`/hud/${key}.webp`);
    return `<img class="mam-3d-icon drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]" src="${artUrl}" width="${sizePx}" height="${sizePx}" alt="${alt}" />`;
  }
  const url3d = get3dHudIconUrl(key);
  if (url3d) {
    return `<img class="mam-3d-icon" src="${url3d}" width="${sizePx}" height="${sizePx}" alt="${alt}" />`;
  }
  return HUD_ICONS[key];
}

export function pickaxeIconHtml(pickaxeId: string, sizePx: number, alt = 'Pickaxe'): string {
  const safeId = PICKAXE_ART_IDS.has(pickaxeId) ? pickaxeId : 'starter';
  const artUrl = assetUrl(`/pickaxes/${safeId}.webp`);
  return `<img class="mam-3d-icon drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]" src="${artUrl}" width="${sizePx}" height="${sizePx}" alt="${alt}" />`;
}

export function gemPotionIconHtml(potionId: string, sizePx: number, alt = 'Potion', color = '#38bdf8'): string {
  if (POTION_ART_IDS.has(potionId)) {
    const artUrl = assetUrl(`/potions/${potionId}.webp`);
    return `<img class="mam-3d-icon drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]" src="${artUrl}" width="${sizePx}" height="${sizePx}" alt="${alt}" />`;
  }
  return otherItemSvg('potion', color);
}

export function enchantAuraIconHtml(enchantId: string, color: string, sizePx: number, alt = 'Aura'): string {
  if (ENCHANT_ART_IDS.has(enchantId)) {
    const artUrl = assetUrl(`/enchants/${enchantId}.webp`);
    return `<img class="mam-3d-icon drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]" src="${artUrl}" width="${sizePx}" height="${sizePx}" alt="${alt}" />`;
  }
  return `<svg viewBox="0 0 40 40" width="${sizePx}" height="${sizePx}" aria-hidden="true">
    <circle cx="20" cy="20" r="16" fill="${color}" opacity="0.22" stroke="${color}" stroke-width="2.5"/>
    <circle cx="20" cy="20" r="8" fill="${color}"/>
  </svg>`;
}

export function enchantDiceIconHtml(sizePx = 34): string {
  const artUrl = assetUrl('/enchants/enchant_dice.webp');
  return `<img class="mam-3d-icon shrink-0 drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]" src="${artUrl}" width="${sizePx}" height="${sizePx}" style="width:${sizePx}px;height:${sizePx}px" alt="Dice" />`;
}

export function weatherIconHtml(weatherId: WeatherId, sizePx = 38, alt = 'Weather'): string {
  if (WEATHER_ART_IDS.has(weatherId)) {
    const artUrl = assetUrl(`/weathers/${weatherId}.webp`);
    return `<img class="mam-3d-icon drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]" src="${artUrl}" width="${sizePx}" height="${sizePx}" alt="${alt}" />`;
  }
  switch (weatherId) {
    case 'light_rain':
      return `<svg viewBox="0 0 36 36" width="${sizePx}" height="${sizePx}" aria-hidden="true">
        <path d="M9 19a6 6 0 0 1 2-11.6A7 7 0 0 1 24.5 9a5 5 0 0 1 .5 10H9z" fill="#93c5fd" stroke="#0284c7" stroke-width="1.8"/>
        <path d="M12 23l-1.5 5M18 23l-1.5 6M24 23l-1.5 5" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
      </svg>`;
    case 'snow_rain':
      return `<svg viewBox="0 0 36 36" width="${sizePx}" height="${sizePx}" aria-hidden="true">
        <path d="M9 18a6 6 0 0 1 2-11.6A7 7 0 0 1 24.5 8a5 5 0 0 1 .5 10H9z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.8"/>
        <path d="M18 21v9M14 23.5l8 4M22 23.5l-8 4" stroke="#bae6fd" stroke-width="2.2" stroke-linecap="round"/>
      </svg>`;
    case 'bloodmoon':
      return `<svg viewBox="0 0 36 36" width="${sizePx}" height="${sizePx}" aria-hidden="true">
        <circle cx="18" cy="18" r="10" fill="#ef4444" stroke="#7f1d1d" stroke-width="2"/>
        <ellipse cx="18" cy="18" rx="14" ry="5" fill="none" stroke="#fca5a5" stroke-width="1.8" transform="rotate(-20 18 18)"/>
      </svg>`;
    case 'void':
      return `<svg viewBox="0 0 36 36" width="${sizePx}" height="${sizePx}" aria-hidden="true">
        <circle cx="18" cy="18" r="6" fill="#1e1b4b" stroke="#c084fc" stroke-width="2.2"/>
        <ellipse cx="18" cy="18" rx="13" ry="5" fill="none" stroke="#a855f7" stroke-width="2" transform="rotate(-25 18 18)"/>
        <ellipse cx="18" cy="18" rx="13" ry="5" fill="none" stroke="#38bdf8" stroke-width="1.6" transform="rotate(35 18 18)"/>
      </svg>`;
    case 'celestial':
      return `<svg viewBox="0 0 36 36" width="${sizePx}" height="${sizePx}" aria-hidden="true">
        <polygon points="18,4 21.5,14.5 32,18 21.5,21.5 18,32 14.5,21.5 4,18 14.5,14.5" fill="#fde047" stroke="#f59e0b" stroke-width="1.8"/>
        <circle cx="18" cy="18" r="4" fill="#fffbeb"/>
      </svg>`;
  }
}

const RESEARCH_ART_FILE_MAP: Record<ResearchIconKind, string> = {
  strike: 'strike',
  pickaxePower: 'chibi_power',
  oreDeposit: 'ore_deposit',
  crystalVein: 'ore_output',
  oreValue: 'ore_value',
  gemGain: 'find_chance',
  crack: 'crack',
  speedPlay: 'respawn_speed',
  toughness: 'dense_ore',
  clover: 'ore_luck',
  goldClover: 'char_luck',
  luckAura: 'char_luck',
  oreVein: 'find_chance',
  chestCap: 'chest_cap',
  geode: 'world_mastery',
  worldMastery: 'world_mastery',
};

export function researchIconHtml(kind: ResearchIconKind, sizePx: number, _accent = '#38bdf8'): string {
  if (kind === 'gemGain') {
    return `<img class="mam-3d-icon drop-shadow-[0_3px_8px_rgba(0,0,0,0.65)]" src="${assetUrl('/hud/gem.webp')}" width="${sizePx}" height="${sizePx}" alt="${kind}" draggable="false" />`;
  }
  const file = RESEARCH_ART_FILE_MAP[kind] ?? 'ore_deposit';
  const artUrl = assetUrl(`/research/${file}.webp`);
  return `<img class="mam-3d-icon drop-shadow-[0_3px_8px_rgba(0,0,0,0.65)]" src="${artUrl}" width="${sizePx}" height="${sizePx}" alt="${kind}" draggable="false" />`;
}

export function meteorIconHtml(weatherId: WeatherId = 'celestial', sizePx = 20, alt = 'Meteor'): string {
  const src = assetUrl(`/meteors/${weatherId}.webp`);
  return `<img src="${src}" width="${sizePx}" height="${sizePx}" alt="${alt}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;display:inline-block;vertical-align:middle;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.65));flex-shrink:0;" draggable="false" />`;
}

export function spireCoinIconHtml(sizePx = 18): string {
  return `<svg viewBox="0 0 24 24" width="${sizePx}" height="${sizePx}" class="shrink-0" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#fde047" stroke="#14111d" stroke-width="2.2"/>
    <circle cx="12" cy="12" r="7.2" fill="#f59e0b" stroke="#14111d" stroke-width="1.3"/>
    <path d="M12 6.2L13.7 10.3L17.8 12L13.7 13.7L12 17.8L10.3 13.7L6.2 12L10.3 10.3Z" fill="#fffbeb" stroke="#14111d" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`;
}

const TOWER_BLESSING_ICON_BODIES: Readonly<Record<string, string>> = {
  // 1. Astral Surge: 4-point astral starburst + rising power core
  'astral-surge': `
    <path d="M12 2.2L14.8 9.2L21.8 12L14.8 14.8L12 21.8L9.2 14.8L2.2 12L9.2 9.2Z" fill="#38bdf8" stroke="#14111d" stroke-width="1.9" stroke-linejoin="round"/>
    <path d="M12 6.8L13.5 10.5L17.2 12L13.5 13.5L12 17.2L10.5 13.5L6.8 12L10.5 10.5Z" fill="#e0f2fe"/>
  `,
  // 2. Crystal Greed: faceted pink gem crystal
  'gem-magnet': `
    <polygon points="7,4.2 17,4.2 21.2,9.8 12,20.8 2.8,9.8" fill="#f472b6" stroke="#14111d" stroke-width="1.9" stroke-linejoin="round"/>
    <polygon points="7,4.2 17,4.2 15.2,9.8 8.8,9.8" fill="#fbcfe8" stroke="#14111d" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M8.8 9.8L12 20.8L15.2 9.8" fill="#ec4899" stroke="#14111d" stroke-width="1.3" stroke-linejoin="round"/>
  `,
  // 3. Chrono Shard: golden hourglass
  'chrono-shard': `
    <path d="M6 3.5H18M6 20.5H18" stroke="#14111d" stroke-width="2.3" stroke-linecap="round"/>
    <path d="M7.5 3.5H16.5V7.5L12 12L16.5 16.5V20.5H7.5V16.5L12 12L7.5 7.5Z" fill="#fef08a" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M9.4 6.2H14.6L12 9.4Z" fill="#f59e0b"/>
    <path d="M9.2 18.6H14.8L12 15.2Z" fill="#f59e0b"/>
  `,
  // 4. Core Breaker: emerald power pickaxe
  'breaker-click': `
    <path d="M14.2 9.8L4.5 19.5" stroke="#b45309" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M14.2 9.8L4.5 19.5" stroke="#14111d" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M7.2 4.2C11.8 3.1 16.8 5 20 8.5C20.9 9.5 21.4 10.7 21.5 12L17.4 12.6C16.7 11.1 15.6 9.8 14.3 8.9L11.4 11.8L9.6 10L12.5 7.1C11 6.4 9.2 6.2 7.6 6.6Z" fill="#4ade80" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
  `,
  // 5. Overkill Splash: explosive fiery blast burst
  'overkill-splash': `
    <path d="M12 2.4L14.3 7.1L19.4 5.2L17.2 10.1L21.8 12.6L16.8 14.7L18.4 19.8L13.4 17.5L11.5 22L9.4 17.2L4.2 19L6.5 14L2.2 11.4L7.2 9.5L5.8 4.4L10.6 7Z" fill="#fb923c" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="3.4" fill="#fef08a" stroke="#14111d" stroke-width="1.4"/>
  `,
  // 6. Chain Spark: twin forked cyan lightning bolt
  'chain-spark': `
    <path d="M14 2.2L5.2 12.6H11.2L9.6 21.8L18.8 10.8H12.8Z" fill="#22d3ee" stroke="#14111d" stroke-width="1.9" stroke-linejoin="round"/>
    <circle cx="5" cy="5.5" r="1.8" fill="#fde047" stroke="#14111d" stroke-width="1.2"/>
    <circle cx="19" cy="18.5" r="1.8" fill="#fde047" stroke="#14111d" stroke-width="1.2"/>
  `,
  // 7. Crit Burst: golden sniper crosshair reticle
  'crit-burst': `
    <circle cx="12" cy="12" r="7.5" fill="#fef3c7" stroke="#14111d" stroke-width="2"/>
    <circle cx="12" cy="12" r="3.2" fill="#f59e0b" stroke="#14111d" stroke-width="1.6"/>
    <path d="M12 2.2V6.2M12 17.8V21.8M2.2 12H6.2M17.8 12H21.8" stroke="#14111d" stroke-width="2.1" stroke-linecap="round"/>
  `,
  // 8. Seraphim Bane: crimson boss-slayer crown + piercing blade
  'boss-slayer': `
    <path d="M3.5 17.5L5.5 7.5L10 11.5L12 6L14 11.5L18.5 7.5L20.5 17.5Z" fill="#f43f5e" stroke="#14111d" stroke-width="1.9" stroke-linejoin="round"/>
    <path d="M4.5 19.8H19.5" stroke="#14111d" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="12" cy="14" r="1.8" fill="#fde047" stroke="#14111d" stroke-width="1.2"/>
  `,
  // 9. Fortune Seeker: violet lucky die
  'dice-hunter': `
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#c084fc" stroke="#14111d" stroke-width="2"/>
    <circle cx="8.2" cy="8.2" r="1.5" fill="#14111d"/>
    <circle cx="15.8" cy="8.2" r="1.5" fill="#14111d"/>
    <circle cx="12" cy="12" r="1.6" fill="#fef08a" stroke="#14111d" stroke-width="1"/>
    <circle cx="8.2" cy="15.8" r="1.5" fill="#14111d"/>
    <circle cx="15.8" cy="15.8" r="1.5" fill="#14111d"/>
  `,
  // 10. Tempo Surge: teal double speed chevrons
  'tempo-surge': `
    <path d="M4.5 6.5L11 12L4.5 17.5H9.2L15.7 12L9.2 6.5Z" fill="#2dd4bf" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M11.5 6.5L18 12L11.5 17.5H16.2L21.5 12L16.2 6.5Z" fill="#99f6e4" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
  `,
  // 11. Prismatic Echo: twin overlapping prism diamonds
  'prismatic-echo': `
    <polygon points="9.5,3.5 15.5,12 9.5,20.5 3.5,12" fill="#38bdf8" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <polygon points="14.5,3.5 20.5,12 14.5,20.5 8.5,12" fill="#a855f7" fill-opacity="0.92" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="14.5" cy="12" r="2.1" fill="#f5d0fe"/>
  `,
  // 12. Blood Pact: crimson cursed blood drop + gold fang ring
  'cursed-greed': `
    <path d="M12 2.8C12 2.8 5.2 10.2 5.2 14.8C5.2 18.6 8.2 21.4 12 21.4C15.8 21.4 18.8 18.6 18.8 14.8C18.8 10.2 12 2.8 12 2.8Z" fill="#e11d48" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
    <path d="M9.6 14.6C9.6 16.4 10.8 17.8 12.4 18.1" stroke="#fecdd3" stroke-width="1.9" stroke-linecap="round"/>
    <circle cx="14.5" cy="11.2" r="1.4" fill="#fde047"/>
  `,
};

export function towerBlessingIconHtml(blessingId: string, sizePx = 24): string {
  const body =
    TOWER_BLESSING_ICON_BODIES[blessingId] ??
    `<path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5Z" fill="#fde047" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 24 24" width="${sizePx}" height="${sizePx}" class="shrink-0" fill="none" data-blessing-icon="${blessingId}" aria-hidden="true">${body}</svg>`;
}
