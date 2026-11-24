import type { WorldId } from './GameData';
import {
  ABYSSAL_NODES,
  CHRONO_NODES,
  CRYSTAL_NODES,
  ELYSIUM_NODES,
  MAGMA_NODES,
  RUINS_NODES,
  SOLARIS_NODES,
  STARWELL_NODES,
  UNDERGROUND_NODES,
  VOIDREACH_NODES,
} from './ResearchWorldNodesData';

export type ResearchTreeId = 'core' | WorldId;

export type ResearchEffectType =
  | 'tapDamageFlat'
  | 'minerDmgPct'
  | 'oreOutputPct'
  | 'denseOreScale'
  | 'respawnSpeedPct'
  | 'findChancePct'
  | 'oreLuckPct'
  | 'charLuckPct'
  | 'oreValuePct'
  | 'oreFragilityPct'
  | 'extraOreNodes'
  | 'chestCapacityFlat';

export const DENSE_ORE_HP_MULT = 10;
export const DENSE_ORE_DROP_MULT = 3;

export type ResearchIconKind =
  | 'strike'
  | 'clover'
  | 'goldClover'
  | 'oreDeposit'
  | 'oreVein'
  | 'crystalVein'
  | 'geode'
  | 'speedPlay'
  | 'crack'
  | 'toughness'
  | 'pickaxePower'
  | 'oreValue'
  | 'chestCap'
  | 'luckAura'
  | 'worldMastery';

export interface ResearchNodeDef {
  id: string;
  treeId: ResearchTreeId;
  name: string;
  maxLevel: number;
  row: number;
  col: number;
  requires: readonly string[];
  icon: ResearchIconKind;
  effectType: ResearchEffectType;
  perLevel: number;
  baseCost: number;
  costMult: number;
  descTemplate: string;
}

export interface ResearchTreeMeta {
  id: ResearchTreeId;
  title: string;
  subtitle: string;
  global: boolean;
  cols: number;
  rows: number;
}

export const RESEARCH_TREE_META: Record<ResearchTreeId, ResearchTreeMeta> = {
  core: {
    id: 'core',
    title: 'Core',
    subtitle: 'Active in all worlds',
    global: true,
    cols: 3,
    rows: 6,
  },
  underground: {
    id: 'underground',
    title: 'The Underground',
    subtitle: 'World 1 • Isolated',
    global: false,
    cols: 5,
    rows: 4,
  },
  crystal: {
    id: 'crystal',
    title: 'Crystal Caves',
    subtitle: 'World 2 • Isolated',
    global: false,
    cols: 5,
    rows: 4,
  },
  magma: {
    id: 'magma',
    title: 'Magma Hollows',
    subtitle: 'World 3 • Isolated',
    global: false,
    cols: 5,
    rows: 4,
  },
  ruins: {
    id: 'ruins',
    title: 'Ancient Ruins',
    subtitle: 'World 4 • Isolated',
    global: false,
    cols: 5,
    rows: 4,
  },
  astral: {
    id: 'astral',
    title: 'Voidreach',
    subtitle: 'World 5 • Isolated',
    global: false,
    cols: 5,
    rows: 4,
  },
  starwell: {
    id: 'starwell',
    title: 'Starwell',
    subtitle: 'World 6 • Isolated',
    global: false,
    cols: 5,
    rows: 4,
  },
  abyssal: {
    id: 'abyssal',
    title: 'Abyssal Biolume',
    subtitle: 'World 7 • Isolated',
    global: false,
    cols: 5,
    rows: 4,
  },
  chrono: {
    id: 'chrono',
    title: 'Chrono Nexus',
    subtitle: 'World 8 • Isolated',
    global: false,
    cols: 5,
    rows: 4,
  },
  solaris: {
    id: 'solaris',
    title: 'Solaris Sanctum',
    subtitle: 'World 9 • Isolated',
    global: false,
    cols: 5,
    rows: 4,
  },
  elysium: {
    id: 'elysium',
    title: 'Elysium Core',
    subtitle: 'World 10 • Isolated',
    global: false,
    cols: 5,
    rows: 4,
  },
};

function fmtBonusNumber(val: number): string {
  if (val >= 1e15) return `${(val / 1e15).toFixed(val % 1e15 === 0 ? 0 : 1)}Qa`;
  if (val >= 1e12) return `${(val / 1e12).toFixed(val % 1e12 === 0 ? 0 : 1)}T`;
  if (val >= 1e9) return `${(val / 1e9).toFixed(val % 1e9 === 0 ? 0 : 1)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(val % 1e6 === 0 ? 0 : 1)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(val % 1e3 === 0 ? 0 : 1)}K`;
  return String(Math.round(val));
}

export function formatNodeEffectLine(node: ResearchNodeDef, level: number): string {
  const effectiveLvl = Math.max(1, level);
  const total = node.perLevel * effectiveLvl;
  const pct = Math.round(total * 100);
  const pctStr = pct >= 1000 ? fmtBonusNumber(pct) : String(pct);
  switch (node.effectType) {
    case 'tapDamageFlat':
      return `+${fmtBonusNumber(total)} tap damage`;
    case 'minerDmgPct':
      return `+${pctStr}% miner damage`;
    case 'oreOutputPct':
      return `+${pctStr}% ore drops`;
    case 'denseOreScale': {
      const hpMult = Math.pow(DENSE_ORE_HP_MULT, effectiveLvl);
      const dropMult = Math.pow(DENSE_ORE_DROP_MULT, effectiveLvl);
      return `Ore HP ×${fmtBonusNumber(hpMult)} • Ore Drops ×${fmtBonusNumber(dropMult)}`;
    }
    case 'respawnSpeedPct':
      return `+${pctStr}% rock respawn speed`;
    case 'findChancePct':
      return `+${(total * 100).toFixed(1).replace(/\.0$/, '')}% miner & gem find`;
    case 'oreLuckPct':
      return `+${pctStr}% luck for rare ores`;
    case 'charLuckPct':
      return `+${pctStr}% luck for rare miners`;
    case 'oreValuePct':
      return `+${pctStr}% ore sell value`;
    case 'oreFragilityPct':
      return `-${Math.min(75, pct)}% rock toughness`;
    case 'extraOreNodes':
      return `+${Math.round(total)} ore nodes`;
    case 'chestCapacityFlat':
      return `+${fmtBonusNumber(total)} chest capacity`;
  }
}

export function getNodeNextCost(node: ResearchNodeDef, currentLevel: number): number {
  if (currentLevel >= node.maxLevel) return 0;
  return Math.round(node.baseCost * Math.pow(node.costMult, currentLevel));
}

// ============================================================================
// CORE (Global across all worlds — sole source of tap damage across Worlds 1-6)
// ============================================================================
const CORE_NODES: readonly ResearchNodeDef[] = [
  // Col 0: Global Tap Mastery (Strike I–VI)
  {
    id: 'core-strike-1',
    treeId: 'core',
    name: 'Strike I',
    maxLevel: 5,
    row: 0,
    col: 0,
    requires: [],
    icon: 'strike',
    effectType: 'tapDamageFlat',
    perLevel: 600,
    baseCost: 120,
    costMult: 2.0,
    descTemplate: 'Permanent tap damage active across all worlds.',
  },
  {
    id: 'core-strike-2',
    treeId: 'core',
    name: 'Strike II',
    maxLevel: 5,
    row: 1,
    col: 0,
    requires: ['core-strike-1'],
    icon: 'strike',
    effectType: 'tapDamageFlat',
    perLevel: 120_000,
    baseCost: 12_000,
    costMult: 2.1,
    descTemplate: 'Heavy tap mastery scaled for Crystal Caves.',
  },
  {
    id: 'core-strike-3',
    treeId: 'core',
    name: 'Strike III',
    maxLevel: 5,
    row: 2,
    col: 0,
    requires: ['core-strike-2'],
    icon: 'strike',
    effectType: 'tapDamageFlat',
    perLevel: 12_000_000,
    baseCost: 2_200_000,
    costMult: 2.2,
    descTemplate: 'Molten tap force scaled for Magma Hollows.',
  },
  {
    id: 'core-strike-4',
    treeId: 'core',
    name: 'Strike IV',
    maxLevel: 5,
    row: 3,
    col: 0,
    requires: ['core-strike-3'],
    icon: 'strike',
    effectType: 'tapDamageFlat',
    perLevel: 1_000_000_000,
    baseCost: 350_000_000,
    costMult: 2.35,
    descTemplate: 'Runic impact force tuned for Ancient Ruins.',
  },
  {
    id: 'core-strike-5',
    treeId: 'core',
    name: 'Strike V',
    maxLevel: 5,
    row: 4,
    col: 0,
    requires: ['core-strike-4'],
    icon: 'strike',
    effectType: 'tapDamageFlat',
    perLevel: 75_000_000_000,
    baseCost: 35_000_000_000,
    costMult: 2.45,
    descTemplate: 'Void-infused impact tuned for Voidreach.',
  },
  {
    id: 'core-strike-6',
    treeId: 'core',
    name: 'Strike VI',
    maxLevel: 5,
    row: 5,
    col: 0,
    requires: ['core-strike-5'],
    icon: 'strike',
    effectType: 'tapDamageFlat',
    perLevel: 6_000_000_000_000,
    baseCost: 5_000_000_000_000,
    costMult: 2.35,
    descTemplate: 'Apex Starwell tap mastery across every world.',
  },

  // Col 1: Global Utility & Chibi Synergy Branch
  {
    id: 'core-find-1',
    treeId: 'core',
    name: "Prospector's Eye",
    maxLevel: 5,
    row: 1,
    col: 1,
    requires: ['core-strike-1'],
    icon: 'oreVein',
    effectType: 'findChancePct',
    perLevel: 0.08,
    baseCost: 12_000,
    costMult: 2.5,
    descTemplate: 'Global boost to Chibi miner and Gem drop chances.',
  },
  {
    id: 'core-charluck-1',
    treeId: 'core',
    name: 'Chibi Magnetism',
    maxLevel: 5,
    row: 2,
    col: 1,
    requires: ['core-find-1'],
    icon: 'goldClover',
    effectType: 'charLuckPct',
    perLevel: 0.45,
    baseCost: 1_500_000,
    costMult: 2.7,
    descTemplate: 'Improves rare Chibi miner odds across all worlds.',
  },
  {
    id: 'core-output-1',
    treeId: 'core',
    name: 'Deep Extraction',
    maxLevel: 5,
    row: 3,
    col: 1,
    requires: ['core-charluck-1'],
    icon: 'crystalVein',
    effectType: 'oreOutputPct',
    perLevel: 0.4,
    baseCost: 250_000_000,
    costMult: 2.9,
    descTemplate: 'Increases ore drops from every rock across all worlds.',
  },
  {
    id: 'core-apex-1',
    treeId: 'core',
    name: 'Core Overdrive',
    maxLevel: 5,
    row: 4,
    col: 1,
    requires: ['core-output-1', 'core-luck-1'],
    icon: 'worldMastery',
    effectType: 'minerDmgPct',
    perLevel: 2.0,
    baseCost: 6_000_000_000,
    costMult: 2.6,
    descTemplate: 'Late-game global Chibi miner DPS surge across every world.',
  },

  // Col 2: Economy, Vault & Global Chibi Power Branch
  {
    id: 'core-chest-1',
    treeId: 'core',
    name: 'Vault Expansion I',
    maxLevel: 5,
    row: 0,
    col: 2,
    requires: [],
    icon: 'chestCap',
    effectType: 'chestCapacityFlat',
    perLevel: 4_000,
    baseCost: 400,
    costMult: 2.6,
    descTemplate: 'Expands your ore chest capacity globally.',
  },
  {
    id: 'core-power-1',
    treeId: 'core',
    name: 'Squad Resonance',
    maxLevel: 5,
    row: 1,
    col: 2,
    requires: ['core-chest-1'],
    icon: 'pickaxePower',
    effectType: 'minerDmgPct',
    perLevel: 0.65,
    baseCost: 25_000,
    costMult: 2.7,
    descTemplate: 'Global Chibi miner DPS boost across every world.',
  },
  {
    id: 'core-value-1',
    treeId: 'core',
    name: 'Global Appraisal',
    maxLevel: 5,
    row: 2,
    col: 2,
    requires: ['core-power-1'],
    icon: 'oreValue',
    effectType: 'oreValuePct',
    perLevel: 0.5,
    baseCost: 900_000,
    costMult: 2.9,
    descTemplate: 'Increases sell price of ores from every world.',
  },
  {
    id: 'core-luck-1',
    treeId: 'core',
    name: 'Astral Fortune',
    maxLevel: 5,
    row: 3,
    col: 2,
    requires: ['core-value-1'],
    icon: 'clover',
    effectType: 'oreLuckPct',
    perLevel: 0.6,
    baseCost: 50_000_000,
    costMult: 3.1,
    descTemplate: 'Permanent global ore luck across all worlds.',
  },
  {
    id: 'core-chest-2',
    treeId: 'core',
    name: 'Vault Expansion II',
    maxLevel: 7,
    row: 4,
    col: 2,
    requires: ['core-luck-1'],
    icon: 'chestCap',
    effectType: 'chestCapacityFlat',
    perLevel: 40_000,
    baseCost: 800_000_000,
    costMult: 2.2,
    descTemplate: 'Void-forged storage expansion up to +300K total Core capacity.',
  },
];

export const RESEARCH_NODES: readonly ResearchNodeDef[] = [
  ...CORE_NODES,
  ...UNDERGROUND_NODES,
  ...CRYSTAL_NODES,
  ...MAGMA_NODES,
  ...RUINS_NODES,
  ...VOIDREACH_NODES,
  ...STARWELL_NODES,
  ...ABYSSAL_NODES,
  ...CHRONO_NODES,
  ...SOLARIS_NODES,
  ...ELYSIUM_NODES,
] as const;

export function getResearchNodesForTree(treeId: ResearchTreeId): readonly ResearchNodeDef[] {
  return RESEARCH_NODES.filter((n) => n.treeId === treeId);
}

export function getResearchNodeById(nodeId: string): ResearchNodeDef | undefined {
  return RESEARCH_NODES.find((n) => n.id === nodeId);
}

export function getResearchTreeMaxPoints(treeId: ResearchTreeId): number {
  let sum = 0;
  for (const n of RESEARCH_NODES) {
    if (n.treeId === treeId) sum += n.maxLevel;
  }
  return sum;
}
