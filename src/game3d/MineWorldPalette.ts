import type { WorldId } from '../game/GameData';

export interface MineWorldPalette {
  crystalColor: string;
  rockColor: string;
  skyTop: string;
  skyBottom: string;
  fogColor: string;
  terrainColor: string;
  cliffColor: string;
  pitFloorColor: string;
  foliageColor: string;
}

export const DEFAULT_WORLD_PALETTE: MineWorldPalette = {
  crystalColor: '#38bdf8',
  rockColor: '#525b66',
  skyTop: '#38bdf8',
  skyBottom: '#e0f2fe',
  fogColor: '#bae6fd',
  terrainColor: '#4ade80',
  cliffColor: '#78716c',
  pitFloorColor: '#b8b2a6',
  foliageColor: '#16a34a',
};

export const WORLD_PALETTES: Record<WorldId, MineWorldPalette> = {
  underground: DEFAULT_WORLD_PALETTE,
  crystal: {
    crystalColor: '#22d3ee',
    rockColor: '#475569',
    skyTop: '#1d4ed8',
    skyBottom: '#bfdbfe',
    fogColor: '#93c5fd',
    terrainColor: '#60a5fa',
    cliffColor: '#334155',
    pitFloorColor: '#cbd5e1',
    foliageColor: '#0284c7',
  },
  magma: {
    crystalColor: '#f97316',
    rockColor: '#3f3f46',
    skyTop: '#7c2d12',
    skyBottom: '#fdba74',
    fogColor: '#fb923c',
    terrainColor: '#57534e',
    cliffColor: '#292524',
    pitFloorColor: '#78716c',
    foliageColor: '#dc2626',
  },
  ruins: {
    crystalColor: '#c084fc',
    rockColor: '#57534e',
    skyTop: '#4c1d95',
    skyBottom: '#ddd6fe',
    fogColor: '#c4b5fd',
    terrainColor: '#34d399',
    cliffColor: '#44403c',
    pitFloorColor: '#a8a29e',
    foliageColor: '#059669',
  },
  astral: {
    crystalColor: '#e879f9',
    rockColor: '#312e81',
    skyTop: '#1e1b4b',
    skyBottom: '#818cf8',
    fogColor: '#4338ca',
    terrainColor: '#3b0764',
    cliffColor: '#1e1b4b',
    pitFloorColor: '#6d28d9',
    foliageColor: '#a855f7',
  },
  starwell: {
    crystalColor: '#38bdf8',
    rockColor: '#64748b',
    skyTop: '#0369a1',
    skyBottom: '#bae6fd',
    fogColor: '#7dd3fc',
    terrainColor: '#e2e8f0',
    cliffColor: '#475569',
    pitFloorColor: '#cbd5e1',
    foliageColor: '#0ea5e9',
  },
  abyssal: {
    crystalColor: '#2dd4bf',
    rockColor: '#1e293b',
    skyTop: '#042f2e',
    skyBottom: '#134e4a',
    fogColor: '#0f766e',
    terrainColor: '#0f172a',
    cliffColor: '#042f2e',
    pitFloorColor: '#115e59',
    foliageColor: '#fb7185',
  },
  chrono: {
    crystalColor: '#fbbf24',
    rockColor: '#27272a',
    skyTop: '#1e1b4b',
    skyBottom: '#78350f',
    fogColor: '#451a03',
    terrainColor: '#292524',
    cliffColor: '#18181b',
    pitFloorColor: '#44403c',
    foliageColor: '#06b6d4',
  },
  solaris: {
    crystalColor: '#fb7185',
    rockColor: '#3f2c2e',
    skyTop: '#4c0519',
    skyBottom: '#fed7aa',
    fogColor: '#9f1239',
    terrainColor: '#451a03',
    cliffColor: '#271418',
    pitFloorColor: '#57262d',
    foliageColor: '#fde047',
  },
  elysium: {
    crystalColor: '#c084fc',
    rockColor: '#312e81',
    skyTop: '#0f172a',
    skyBottom: '#f5d0fe',
    fogColor: '#581c87',
    terrainColor: '#1e1b4b',
    cliffColor: '#1e1b4b',
    pitFloorColor: '#3b2d68',
    foliageColor: '#22d3ee',
  },
};

export const STAGE_PEDESTAL_COUNT = 5;
export const BASE_PIT_NODE_COUNT = 5;
export const MAX_PIT_NODE_COUNT = 20;

export interface CrescentSlotTransform {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly visualYaw: number;
}

/** 3-tier floating curved crescent slots hovering around the northern rim of the circular arena pool. */
export const STAGE_CRESCENT_SLOTS: readonly CrescentSlotTransform[] = [
  { x: -7.35, y: 0.72, z: -3.15, visualYaw: 0.58 },
  { x: -3.85, y: 1.04, z: -5.1, visualYaw: 0.3 },
  { x: 0, y: 1.38, z: -5.9, visualYaw: 0 },
  { x: 3.85, y: 1.04, z: -5.1, visualYaw: -0.3 },
  { x: 7.35, y: 0.72, z: -3.15, visualYaw: -0.58 },
] as const;

export type OreVariantKey = 'common' | 'vein' | 'geode';

export interface OreVariantDef {
  key: OreVariantKey;
  weight: number;
  hpMult: number;
  scale: number;
}

export const ORE_VARIANTS: OreVariantDef[] = [
  { key: 'common', weight: 0.55, hpMult: 0.55, scale: 0.72 },
  { key: 'vein', weight: 0.32, hpMult: 1.15, scale: 1.0 },
  { key: 'geode', weight: 0.13, hpMult: 2.4, scale: 1.35 },
];

export function rollOreVariant(rng: () => number = Math.random): OreVariantDef {
  const roll = Math.max(0, Math.min(0.999999, rng()));
  let acc = 0;
  for (const variant of ORE_VARIANTS) {
    acc = Math.round((acc + variant.weight) * 1e6) / 1e6;
    if (roll < acc) return variant;
  }
  return ORE_VARIANTS[ORE_VARIANTS.length - 1];
}
