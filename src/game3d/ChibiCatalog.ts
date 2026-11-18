export type ChibiAnimState = 'idle' | 'dash' | 'attack' | 'aura';

export type ChibiRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'rainbow'
  | 'mythic'
  | 'exotic'
  | 'secret';

export interface ChibiPoseUrls {
  idle: string;
  walk: string;
  attack: string;
  pose: string;
}

export interface ChibiDef {
  id: string;
  name: string;
  spriteUrl: string;
  poses: ChibiPoseUrls;
  frames: number;
  rarity: ChibiRarity;
  accentColor: string;
  baseDps: number;
  poseScale?: number;
  smoothFilter?: boolean;
  walkFacesLeft?: boolean;
}

export const LEFT_FACING_WALK_IDS = new Set<string>([
  'astral-recruit',
  'solar-striker',
  'seraph-paladin',
  'chrono-sovereign',
  'cyber-ki-brawler',
  'tidebound-corsair',
]);

export const LEFT_FACING_ATTACK_IDS = new Set<string>([]);

function makePoses(id: string): ChibiPoseUrls {
  return {
    idle: `/chibi/${id}/idle.webp`,
    walk: `/chibi/${id}/walk.webp`,
    attack: `/chibi/${id}/attack.webp`,
    pose: `/chibi/${id}/pose.webp`,
  };
}

export const CHIBI_FRAME_INDEX: Record<ChibiAnimState, number> = {
  idle: 0,
  dash: 1,
  attack: 2,
  aura: 3,
};

export const CHIBI_CATALOG: readonly ChibiDef[] = [
  {
    id: 'astral-recruit',
    name: 'Onee',
    spriteUrl: '/chibi/astral-recruit/idle.webp',
    poses: makePoses('astral-recruit'),
    frames: 4,
    rarity: 'common',
    accentColor: '#38bdf8',
    baseDps: 8,
    smoothFilter: true,
  },
  {
    id: 'solar-striker',
    name: 'DreamQueen',
    spriteUrl: '/chibi/solar-striker/idle.webp',
    poses: makePoses('solar-striker'),
    frames: 4,
    rarity: 'uncommon',
    accentColor: '#f59e0b',
    baseDps: 16,
    smoothFilter: true,
  },
  {
    id: 'frost-vanguard',
    name: 'Antagonis',
    spriteUrl: '/chibi/frost-vanguard/idle.webp',
    poses: makePoses('frost-vanguard'),
    frames: 4,
    rarity: 'rare',
    accentColor: '#60a5fa',
    baseDps: 22,
    smoothFilter: true,
  },
  {
    id: 'volt-kensei',
    name: 'BladeGhost',
    spriteUrl: '/chibi/volt-kensei/idle.webp',
    poses: makePoses('volt-kensei'),
    frames: 4,
    rarity: 'uncommon',
    accentColor: '#facc15',
    baseDps: 75,
    smoothFilter: true,
  },
  {
    id: 'pyre-kitsune',
    name: 'Shadow',
    spriteUrl: '/chibi/pyre-kitsune/idle.webp',
    poses: makePoses('pyre-kitsune'),
    frames: 4,
    rarity: 'rare',
    accentColor: '#fb7185',
    baseDps: 95,
    smoothFilter: true,
  },
  {
    id: 'zephyr-esper',
    name: 'Doom',
    spriteUrl: '/chibi/zephyr-esper/idle.webp',
    poses: makePoses('zephyr-esper'),
    frames: 4,
    rarity: 'epic',
    accentColor: '#34d399',
    baseDps: 120,
    smoothFilter: true,
  },
  {
    id: 'mantis-monarch',
    name: 'KuboJin',
    spriteUrl: '/chibi/mantis-monarch/idle.webp',
    poses: makePoses('mantis-monarch'),
    frames: 4,
    rarity: 'rare',
    accentColor: '#4ade80',
    baseDps: 340,
    smoothFilter: true,
  },
  {
    id: 'vortex-mimic',
    name: 'CrazyMan',
    spriteUrl: '/chibi/vortex-mimic/idle.webp',
    poses: makePoses('vortex-mimic'),
    frames: 4,
    rarity: 'epic',
    accentColor: '#22d3ee',
    baseDps: 430,
    smoothFilter: true,
  },
  {
    id: 'vesper-ward',
    name: 'holychill',
    spriteUrl: '/chibi/vesper-ward/idle.webp',
    poses: makePoses('vesper-ward'),
    frames: 4,
    rarity: 'legendary',
    accentColor: '#818cf8',
    baseDps: 550,
    smoothFilter: true,
  },
  {
    id: 'tempest-drake',
    name: 'Dekok',
    spriteUrl: '/chibi/tempest-drake/idle.webp',
    poses: makePoses('tempest-drake'),
    frames: 4,
    rarity: 'epic',
    accentColor: '#22d3ee',
    baseDps: 1_500,
    smoothFilter: true,
  },
  {
    id: 'titan-dread',
    name: 'danuu.D',
    spriteUrl: '/chibi/titan-dread/idle.webp',
    poses: makePoses('titan-dread'),
    frames: 4,
    rarity: 'legendary',
    accentColor: '#f87171',
    baseDps: 1_950,
    smoothFilter: true,
  },
  {
    id: 'seraph-paladin',
    name: 'Perryy.B',
    spriteUrl: '/chibi/seraph-paladin/idle.webp',
    poses: makePoses('seraph-paladin'),
    frames: 4,
    rarity: 'mythic',
    accentColor: '#fde047',
    baseDps: 2_500,
    smoothFilter: true,
  },
  {
    id: 'nebula-archon',
    name: 'VoidClaw',
    spriteUrl: '/chibi/nebula-archon/idle.webp',
    poses: makePoses('nebula-archon'),
    frames: 4,
    rarity: 'legendary',
    accentColor: '#ef4444',
    baseDps: 7_000,
    smoothFilter: true,
  },
  {
    id: 'eclipse-warlord',
    name: 'BangJoo',
    spriteUrl: '/chibi/eclipse-warlord/idle.webp',
    poses: makePoses('eclipse-warlord'),
    frames: 4,
    rarity: 'rainbow',
    accentColor: '#f59e0b',
    baseDps: 9_200,
    smoothFilter: true,
  },
  {
    id: 'chrono-sovereign',
    name: 'LouisBerg',
    spriteUrl: '/chibi/chrono-sovereign/idle.webp',
    poses: makePoses('chrono-sovereign'),
    frames: 4,
    rarity: 'mythic',
    accentColor: '#38bdf8',
    baseDps: 12_000,
    smoothFilter: true,
  },

  // === Worlds 1–5 Exotic & Secret Additions (10) ===
  {
    id: 'tropic-blaze',
    name: 'IMbot',
    spriteUrl: '/chibi/tropic-blaze/idle.webp',
    poses: makePoses('tropic-blaze'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#fb923c',
    baseDps: 38,
    smoothFilter: true,
  },
  {
    id: 'cyber-ki-brawler',
    name: 'TheOne',
    spriteUrl: '/chibi/cyber-ki-brawler/idle.webp',
    poses: makePoses('cyber-ki-brawler'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#22d3ee',
    baseDps: 60,
    smoothFilter: true,
  },
  {
    id: 'aqua-blitz',
    name: 'Chainwrath',
    spriteUrl: '/chibi/aqua-blitz/idle.webp',
    poses: makePoses('aqua-blitz'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#38bdf8',
    baseDps: 190,
    smoothFilter: true,
  },
  {
    id: 'glacier-tide',
    name: 'Clops Blazing',
    spriteUrl: '/chibi/glacier-tide/idle.webp',
    poses: makePoses('glacier-tide'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#67e8f9',
    baseDps: 290,
    smoothFilter: true,
  },
  {
    id: 'tidebound-corsair',
    name: 'BocilKematian',
    spriteUrl: '/chibi/tidebound-corsair/idle.webp',
    poses: makePoses('tidebound-corsair'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#f59e0b',
    baseDps: 850,
    smoothFilter: true,
  },
  {
    id: 'chroma-quill',
    name: 'AkaneFlare',
    spriteUrl: '/chibi/chroma-quill/idle.webp',
    poses: makePoses('chroma-quill'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#fb7185',
    baseDps: 1_250,
    smoothFilter: true,
  },
  {
    id: 'lotus-frost',
    name: 'Ibnuu.G',
    spriteUrl: '/chibi/lotus-frost/idle.webp',
    poses: makePoses('lotus-frost'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#fb7185',
    baseDps: 3_800,
    smoothFilter: true,
  },
  {
    id: 'rime-duchess',
    name: 'BlackDragon',
    spriteUrl: '/chibi/rime-duchess/idle.webp',
    poses: makePoses('rime-duchess'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#7dd3fc',
    baseDps: 5_600,
    smoothFilter: true,
  },
  {
    id: 'zephyr-raven',
    name: 'VoidRaven',
    spriteUrl: '/chibi/zephyr-raven/idle.webp',
    poses: makePoses('zephyr-raven'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#a855f7',
    baseDps: 18_500,
    smoothFilter: true,
  },
  {
    id: 'nebula-hex',
    name: 'VoidWarlord',
    spriteUrl: '/chibi/nebula-hex/idle.webp',
    poses: makePoses('nebula-hex'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#c084fc',
    baseDps: 28_000,
    smoothFilter: true,
  },

  // === World 6 Roster (5 Chibis — reserved for World 6) ===
  {
    id: 'draconic-blademaster',
    name: 'RunicBlade',
    spriteUrl: '/chibi/draconic-blademaster/idle.webp',
    poses: makePoses('draconic-blademaster'),
    frames: 4,
    rarity: 'legendary',
    accentColor: '#38bdf8',
    baseDps: 36_000,
    smoothFilter: true,
  },
  {
    id: 'aegis-wyrm',
    name: 'TheFools',
    spriteUrl: '/chibi/aegis-wyrm/idle.webp',
    poses: makePoses('aegis-wyrm'),
    frames: 4,
    rarity: 'rainbow',
    accentColor: '#ef4444',
    baseDps: 48_000,
    smoothFilter: true,
  },
  {
    id: 'ashen-titan',
    name: 'VoidBugs',
    spriteUrl: '/chibi/ashen-titan/idle.webp',
    poses: makePoses('ashen-titan'),
    frames: 4,
    rarity: 'mythic',
    accentColor: '#fbbf24',
    baseDps: 65_000,
    smoothFilter: true,
  },
  {
    id: 'vesper-reaver',
    name: 'High Entity',
    spriteUrl: '/chibi/vesper-reaver/idle.webp',
    poses: makePoses('vesper-reaver'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#a855f7',
    baseDps: 95_000,
    smoothFilter: true,
  },
  {
    id: 'null-prism',
    name: 'TheBoss',
    spriteUrl: '/chibi/null-prism/idle.webp',
    poses: makePoses('null-prism'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#ef4444',
    baseDps: 140_000,
    smoothFilter: true,
  },

  // === Weather Meteor Limited Chibis ===
  {
    id: 'stormwraith',
    name: 'Stormwraith',
    spriteUrl: '/chibi/stormwraith/idle.webp',
    poses: makePoses('stormwraith'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#38bdf8',
    baseDps: 8_500,
    smoothFilter: true,
  },
  {
    id: 'frostblood',
    name: 'Frostblood',
    spriteUrl: '/chibi/frostblood/idle.webp',
    poses: makePoses('frostblood'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#bae6fd',
    baseDps: 18_000,
    smoothFilter: true,
  },
  {
    id: 'glitch-monarch',
    name: 'Glitch Monarch',
    spriteUrl: '/chibi/glitch-monarch/idle.webp',
    poses: makePoses('glitch-monarch'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#f43f5e',
    baseDps: 55_000,
    smoothFilter: true,
  },
  {
    id: 'singularity',
    name: 'Singularity',
    spriteUrl: '/chibi/singularity/idle.webp',
    poses: makePoses('singularity'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#c084fc',
    baseDps: 110_000,
    smoothFilter: true,
  },
  {
    id: 'eclipse-seraph',
    name: 'Eclipse Seraph',
    spriteUrl: '/chibi/eclipse-seraph/idle.webp',
    poses: makePoses('eclipse-seraph'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#fde047',
    baseDps: 180_000,
    smoothFilter: true,
  },
] as const;

export function getChibiById(id: string): ChibiDef | undefined {
  return CHIBI_CATALOG.find((c) => c.id === id);
}

export function getChibiFrameUvOffset(frameIndex: number, totalFrames: number): number {
  const safeFrames = Math.max(1, totalFrames);
  const clamped = ((Math.floor(frameIndex) % safeFrames) + safeFrames) % safeFrames;
  return clamped / safeFrames;
}
