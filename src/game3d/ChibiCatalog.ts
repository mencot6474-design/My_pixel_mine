export type ChibiAnimState = 'idle' | 'dash' | 'attack' | 'aura';

export type ChibiRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'astral';

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
  },
  {
    id: 'solar-striker',
    name: 'Solar Striker',
    spriteUrl: '/chibi/solar-striker/idle.png',
    poses: makePoses('solar-striker'),
    frames: 4,
    rarity: 'rare',
    accentColor: '#f59e0b',
    baseDps: 16,
  },
  {
    id: 'frost-vanguard',
    name: 'Frost Vanguard',
    spriteUrl: '/chibi/frost-vanguard/idle.png',
    poses: makePoses('frost-vanguard'),
    frames: 4,
    rarity: 'rare',
    accentColor: '#60a5fa',
    baseDps: 22,
  },
  {
    id: 'volt-kensei',
    name: 'Volt Kensei',
    spriteUrl: '/chibi/volt-kensei/idle.png',
    poses: makePoses('volt-kensei'),
    frames: 4,
    rarity: 'epic',
    accentColor: '#facc15',
    baseDps: 75,
  },
  {
    id: 'pyre-kitsune',
    name: 'Pyre Kitsune',
    spriteUrl: '/chibi/pyre-kitsune/idle.png',
    poses: makePoses('pyre-kitsune'),
    frames: 4,
    rarity: 'epic',
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
    rarity: 'legendary',
    accentColor: '#4ade80',
    baseDps: 340,
  },
  {
    id: 'vortex-mimic',
    name: 'Vortex Mimic',
    spriteUrl: '/chibi/vortex-mimic/idle.png',
    poses: makePoses('vortex-mimic'),
    frames: 4,
    rarity: 'legendary',
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
    rarity: 'mythic',
    accentColor: '#22d3ee',
    baseDps: 1_500,
  },
  {
    id: 'titan-dread',
    name: 'Titan Dread',
    spriteUrl: '/chibi/titan-dread/idle.png',
    poses: makePoses('titan-dread'),
    frames: 4,
    rarity: 'mythic',
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
    rarity: 'astral',
    accentColor: '#c084fc',
    baseDps: 7_000,
  },
  {
    id: 'eclipse-warlord',
    name: 'Eclipse Warlord',
    spriteUrl: '/chibi/eclipse-warlord/idle.png',
    poses: makePoses('eclipse-warlord'),
    frames: 4,
    rarity: 'astral',
    accentColor: '#e879f9',
    baseDps: 9_200,
  },
  {
    id: 'chrono-sovereign',
    name: 'Chrono Sovereign',
    spriteUrl: '/chibi/chrono-sovereign/idle.png',
    poses: makePoses('chrono-sovereign'),
    frames: 4,
    rarity: 'astral',
    accentColor: '#a855f7',
    baseDps: 12_000,
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
