export interface FusionMinerIngredient {
  chibiId: string;
  count: number;
}

export interface FusionOreIngredient {
  oreId: string;
  count: number;
}

export type FusionPassiveStat = 'teamDmgPct' | 'oreSellPct' | 'oreDropPct';

export interface FusionPassiveDef {
  stat: FusionPassiveStat;
  value: number;
  label: string;
}

export interface FusionRecipeDef {
  id: string;
  resultChibiId: string;
  title: string;
  subtitle: string;
  accentColor: string;
  glowColor: string;
  upgradeCostScale: number;
  passive: FusionPassiveDef;
  requiredMiners: readonly FusionMinerIngredient[];
  requiredOres: readonly FusionOreIngredient[];
  gemCost: number;
}

export const FUSION_RECIPES: readonly FusionRecipeDef[] = [
  {
    id: 'fusion-glitch-cheshire',
    resultChibiId: 'glitch-cheshire',
    title: 'Glitch Cheshire',
    subtitle: 'Cyber-Phantom Synchro • 2-Unit Fusion',
    accentColor: '#22d3ee',
    glowColor: '#d946ef',
    upgradeCostScale: 1_500,
    passive: {
      stat: 'teamDmgPct',
      value: 0.3,
      label: '+30% Team DMG',
    },
    requiredMiners: [
      { chibiId: 'cyber-ki-brawler', count: 1 },
      { chibiId: 'zephyr-esper', count: 1 },
    ],
    requiredOres: [
      { oreId: 'azurine', count: 12 },
      { oreId: 'glimmerite', count: 8 },
    ],
    gemCost: 3_500,
  },
  {
    id: 'fusion-thorn-maiden',
    resultChibiId: 'thorn-maiden',
    title: 'Thorn Maiden',
    subtitle: 'Crimson Sovereign Synchro • 3-Unit Fusion',
    accentColor: '#f43f5e',
    glowColor: '#fb7185',
    upgradeCostScale: 1_500_000_000,
    passive: {
      stat: 'oreDropPct',
      value: 1.5,
      label: '+150% Ore Drop',
    },
    requiredMiners: [
      { chibiId: 'vesper-ward', count: 1 },
      { chibiId: 'seraph-paladin', count: 1 },
      { chibiId: 'lotus-frost', count: 1 },
    ],
    requiredOres: [
      { oreId: 'pyroclast', count: 12 },
      { oreId: 'oathstone', count: 10 },
    ],
    gemCost: 12_000,
  },
  {
    id: 'fusion-monochrome-saint',
    resultChibiId: 'monochrome-saint',
    title: 'Monochrome Saint',
    subtitle: 'Void Ascetic Synchro • 3-Unit Fusion',
    accentColor: '#e2e8f0',
    glowColor: '#94a3b8',
    upgradeCostScale: 1_500_000_000_000,
    passive: {
      stat: 'oreSellPct',
      value: 2.0,
      label: '+200% Ore Sell',
    },
    requiredMiners: [
      { chibiId: 'rime-duchess', count: 1 },
      { chibiId: 'chrono-sovereign', count: 1 },
      { chibiId: 'zephyr-raven', count: 1 },
    ],
    requiredOres: [
      { oreId: 'cosmite', count: 12 },
      { oreId: 'singularite', count: 8 },
    ],
    gemCost: 35_000,
  },
  {
    id: 'fusion-prism-seraph',
    resultChibiId: 'prism-seraph',
    title: 'Prism Seraph',
    subtitle: 'Apex Celestial Synchro • 3-Unit Fusion',
    accentColor: '#facc15',
    glowColor: '#38bdf8',
    upgradeCostScale: 1_500_000_000_000_000,
    passive: {
      stat: 'teamDmgPct',
      value: 0.5,
      label: '+50% Team DMG',
    },
    requiredMiners: [
      { chibiId: 'nebula-hex', count: 1 },
      { chibiId: 'vesper-reaver', count: 1 },
      { chibiId: 'null-prism', count: 1 },
    ],
    requiredOres: [
      { oreId: 'zenithite', count: 14 },
      { oreId: 'caelite', count: 10 },
    ],
    gemCost: 85_000,
  },
  {
    id: 'fusion-aether-monarch',
    resultChibiId: 'aether-monarch',
    title: 'Aether Monarch',
    subtitle: 'Nexus Crown Synchro • 3-Unit Fusion',
    accentColor: '#fbbf24',
    glowColor: '#22d3ee',
    upgradeCostScale: 1_500_000_000_000_000_000_000,
    passive: {
      stat: 'teamDmgPct',
      value: 0.75,
      label: '+75% Team DMG',
    },
    requiredMiners: [
      { chibiId: 'trench-oracle', count: 1 },
      { chibiId: 'crimson-king', count: 1 },
      { chibiId: 'chrono-seraph', count: 1 },
    ],
    requiredOres: [
      { oreId: 'abyssalite', count: 12 },
      { oreId: 'aetherium', count: 12 },
    ],
    gemCost: 160_000,
  },
] as const;

export function getFusionRecipeById(id: string): FusionRecipeDef | undefined {
  return FUSION_RECIPES.find((r) => r.id === id);
}

export function getFusionRecipeByResultChibiId(chibiId: string): FusionRecipeDef | undefined {
  return FUSION_RECIPES.find((r) => r.resultChibiId === chibiId);
}

export function isFusionExclusiveChibi(chibiId: string): boolean {
  return FUSION_RECIPES.some((r) => r.resultChibiId === chibiId);
}
