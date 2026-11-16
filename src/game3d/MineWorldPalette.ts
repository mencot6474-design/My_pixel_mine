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

export const WORLD_PALETTES: Record<
  'underground' | 'crystal' | 'magma' | 'ruins' | 'astral' | 'starwell',
  MineWorldPalette
> = {
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
};

export const STAGE_PEDESTAL_COUNT = 5;
export const MAX_PIT_NODE_COUNT = 12;

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
