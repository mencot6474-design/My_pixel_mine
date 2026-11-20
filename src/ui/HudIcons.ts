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
  const file = RESEARCH_ART_FILE_MAP[kind] ?? 'ore_deposit';
  const artUrl = assetUrl(`/research/${file}.webp`);
  return `<img class="mam-3d-icon drop-shadow-[0_3px_8px_rgba(0,0,0,0.65)]" src="${artUrl}" width="${sizePx}" height="${sizePx}" alt="${kind}" draggable="false" />`;
}

export function meteorIconHtml(weatherId: WeatherId = 'celestial', sizePx = 20, alt = 'Meteor'): string {
  const src = assetUrl(`/meteors/${weatherId}.webp`);
  return `<img src="${src}" width="${sizePx}" height="${sizePx}" alt="${alt}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;display:inline-block;vertical-align:middle;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.65));flex-shrink:0;" draggable="false" />`;
}
