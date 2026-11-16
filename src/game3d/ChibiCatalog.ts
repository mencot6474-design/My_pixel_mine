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
}

function makePoses(id: string): ChibiPoseUrls {
  return {
    idle: `/chibi/${id}/idle.png`,
    walk: `/chibi/${id}/walk.png`,
    attack: `/chibi/${id}/attack.png`,
    pose: `/chibi/${id}/pose.png`,
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
    name: 'Astral Recruit',
    spriteUrl: '/chibi/astral-recruit/idle.png',
    poses: makePoses('astral-recruit'),
    frames: 4,
    rarity: 'common',
    accentColor: '#38bdf8',
    baseDps: 8,
    smoothFilter: true,
  },
  {
    id: 'solar-striker',
    name: 'Solar Striker',
    spriteUrl: '/chibi/solar-striker/idle.png',
    poses: makePoses('solar-striker'),
    frames: 4,
    rarity: 'uncommon',
    accentColor: '#f59e0b',
    baseDps: 16,
    smoothFilter: true,
  },
  {
    id: 'frost-vanguard',
    name: 'Mistveil Shinobi',
    spriteUrl: '/chibi/frost-vanguard/idle.png',
    poses: makePoses('frost-vanguard'),
    frames: 4,
    rarity: 'rare',
    accentColor: '#60a5fa',
    baseDps: 22,
    smoothFilter: true,
  },
  {
    id: 'volt-kensei',
    name: 'Volt Kensei',
    spriteUrl: '/chibi/volt-kensei/idle.png',
    poses: makePoses('volt-kensei'),
    frames: 4,
    rarity: 'uncommon',
    accentColor: '#facc15',
    baseDps: 75,
  },
  {
    id: 'pyre-kitsune',
    name: 'Pyre Kitsune',
    spriteUrl: '/chibi/pyre-kitsune/idle.png',
    poses: makePoses('pyre-kitsune'),
    frames: 4,
    rarity: 'rare',
    accentColor: '#fb7185',
    baseDps: 95,
  },
  {
    id: 'zephyr-esper',
    name: 'Zephyr Esper',
    spriteUrl: '/chibi/zephyr-esper/idle.png',
    poses: makePoses('zephyr-esper'),
    frames: 4,
    rarity: 'epic',
    accentColor: '#34d399',
    baseDps: 120,
  },
  {
    id: 'mantis-monarch',
    name: 'Mantis Monarch',
    spriteUrl: '/chibi/mantis-monarch/idle.png',
    poses: makePoses('mantis-monarch'),
    frames: 4,
    rarity: 'rare',
    accentColor: '#4ade80',
    baseDps: 340,
  },
  {
    id: 'vortex-mimic',
    name: 'Vortex Mimic',
    spriteUrl: '/chibi/vortex-mimic/idle.png',
    poses: makePoses('vortex-mimic'),
    frames: 4,
    rarity: 'epic',
    accentColor: '#a78bfa',
    baseDps: 430,
  },
  {
    id: 'vesper-ward',
    name: 'Vesper Ward',
    spriteUrl: '/chibi/vesper-ward/idle.png',
    poses: makePoses('vesper-ward'),
    frames: 4,
    rarity: 'legendary',
    accentColor: '#818cf8',
    baseDps: 550,
  },
  {
    id: 'tempest-drake',
    name: 'Tempest Drake',
    spriteUrl: '/chibi/tempest-drake/idle.png',
    poses: makePoses('tempest-drake'),
    frames: 4,
    rarity: 'epic',
    accentColor: '#22d3ee',
    baseDps: 1_500,
  },
  {
    id: 'titan-dread',
    name: 'Titan Dread',
    spriteUrl: '/chibi/titan-dread/idle.png',
    poses: makePoses('titan-dread'),
    frames: 4,
    rarity: 'legendary',
    accentColor: '#f87171',
    baseDps: 1_950,
  },
  {
    id: 'seraph-paladin',
    name: 'Seraph Paladin',
    spriteUrl: '/chibi/seraph-paladin/idle.png',
    poses: makePoses('seraph-paladin'),
    frames: 4,
    rarity: 'mythic',
    accentColor: '#fde047',
    baseDps: 2_500,
  },
  {
    id: 'nebula-archon',
    name: 'Nebula Archon',
    spriteUrl: '/chibi/nebula-archon/idle.png',
    poses: makePoses('nebula-archon'),
    frames: 4,
    rarity: 'legendary',
    accentColor: '#c084fc',
    baseDps: 7_000,
  },
  {
    id: 'eclipse-warlord',
    name: 'Eclipse Warlord',
    spriteUrl: '/chibi/eclipse-warlord/idle.png',
    poses: makePoses('eclipse-warlord'),
    frames: 4,
    rarity: 'rainbow',
    accentColor: '#e879f9',
    baseDps: 9_200,
  },
  {
    id: 'chrono-sovereign',
    name: 'Chrono Sovereign',
    spriteUrl: '/chibi/chrono-sovereign/idle.png',
    poses: makePoses('chrono-sovereign'),
    frames: 4,
    rarity: 'mythic',
    accentColor: '#a855f7',
    baseDps: 12_000,
  },

  // === Worlds 1–5 Exotic & Secret Additions (10) ===
  {
    id: 'tropic-blaze',
    name: 'Oni Brawler',
    spriteUrl: '/chibi/tropic-blaze/idle.png',
    poses: makePoses('tropic-blaze'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#fb923c',
    baseDps: 38,
    smoothFilter: true,
  },
  {
    id: 'cyber-ki-brawler',
    name: 'Inkcloud',
    spriteUrl: '/chibi/cyber-ki-brawler/idle.png',
    poses: makePoses('cyber-ki-brawler'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#22d3ee',
    baseDps: 60,
    smoothFilter: true,
  },
  {
    id: 'aqua-blitz',
    name: 'Aqua Blitz',
    spriteUrl: '/chibi/aqua-blitz/idle.png',
    poses: makePoses('aqua-blitz'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#38bdf8',
    baseDps: 190,
  },
  {
    id: 'glacier-tide',
    name: 'Glacier Tide',
    spriteUrl: '/chibi/glacier-tide/idle.png',
    poses: makePoses('glacier-tide'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#67e8f9',
    baseDps: 290,
  },
  {
    id: 'tidebound-corsair',
    name: 'Tidebound Corsair',
    spriteUrl: '/chibi/tidebound-corsair/idle.png',
    poses: makePoses('tidebound-corsair'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#f59e0b',
    baseDps: 850,
  },
  {
    id: 'chroma-quill',
    name: 'Chroma Quill',
    spriteUrl: '/chibi/chroma-quill/idle.png',
    poses: makePoses('chroma-quill'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#f472b6',
    baseDps: 1_250,
  },
  {
    id: 'lotus-frost',
    name: 'Lotus Frost',
    spriteUrl: '/chibi/lotus-frost/idle.png',
    poses: makePoses('lotus-frost'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#fb7185',
    baseDps: 3_800,
  },
  {
    id: 'rime-duchess',
    name: 'Rime Duchess',
    spriteUrl: '/chibi/rime-duchess/idle.png',
    poses: makePoses('rime-duchess'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#7dd3fc',
    baseDps: 5_600,
  },
  {
    id: 'zephyr-raven',
    name: 'Zephyr Raven',
    spriteUrl: '/chibi/zephyr-raven/idle.png',
    poses: makePoses('zephyr-raven'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#94a3b8',
    baseDps: 18_500,
  },
  {
    id: 'nebula-hex',
    name: 'Nebula Hex',
    spriteUrl: '/chibi/nebula-hex/idle.png',
    poses: makePoses('nebula-hex'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#c084fc',
    baseDps: 28_000,
  },

  // === World 6 Roster (5 Chibis — reserved for World 6) ===
  {
    id: 'draconic-blademaster',
    name: 'Draconic Blademaster',
    spriteUrl: '/chibi/draconic-blademaster/idle.png',
    poses: makePoses('draconic-blademaster'),
    frames: 4,
    rarity: 'legendary',
    accentColor: '#ef4444',
    baseDps: 36_000,
  },
  {
    id: 'aegis-wyrm',
    name: 'Aegis Wyrm',
    spriteUrl: '/chibi/aegis-wyrm/idle.png',
    poses: makePoses('aegis-wyrm'),
    frames: 4,
    rarity: 'rainbow',
    accentColor: '#22d3ee',
    baseDps: 48_000,
  },
  {
    id: 'ashen-titan',
    name: 'Ashen Titan',
    spriteUrl: '/chibi/ashen-titan/idle.png',
    poses: makePoses('ashen-titan'),
    frames: 4,
    rarity: 'mythic',
    accentColor: '#10b981',
    baseDps: 65_000,
  },
  {
    id: 'vesper-reaver',
    name: 'Vesper Reaver',
    spriteUrl: '/chibi/vesper-reaver/idle.png',
    poses: makePoses('vesper-reaver'),
    frames: 4,
    rarity: 'exotic',
    accentColor: '#a855f7',
    baseDps: 95_000,
  },
  {
    id: 'null-prism',
    name: 'Null Prism',
    spriteUrl: '/chibi/null-prism/idle.png',
    poses: makePoses('null-prism'),
    frames: 4,
    rarity: 'secret',
    accentColor: '#e879f9',
    baseDps: 140_000,
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
