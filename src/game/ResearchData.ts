import type { WorldId } from './GameData';

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
};

function fmtBonusNumber(val: number): string {
  if (val >= 1e9) return `${(val / 1e9).toFixed(val % 1e9 === 0 ? 0 : 1)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(val % 1e6 === 0 ? 0 : 1)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(val % 1e3 === 0 ? 0 : 1)}K`;
  return String(Math.round(val));
}

export function formatNodeEffectLine(node: ResearchNodeDef, level: number): string {
  const effectiveLvl = Math.max(1, level);
  const total = node.perLevel * effectiveLvl;
  const pct = Math.round(total * 100);
  switch (node.effectType) {
    case 'tapDamageFlat':
      return `+${fmtBonusNumber(total)} tap damage`;
    case 'minerDmgPct':
      return `+${pct}% miner damage`;
    case 'oreOutputPct':
      return `+${pct}% ore drops`;
    case 'denseOreScale': {
      const hpMult = Math.pow(DENSE_ORE_HP_MULT, effectiveLvl);
      const dropMult = Math.pow(DENSE_ORE_DROP_MULT, effectiveLvl);
      return `Ore HP ×${fmtBonusNumber(hpMult)} • Ore Drops ×${fmtBonusNumber(dropMult)}`;
    }
    case 'respawnSpeedPct':
      return `+${pct}% rock respawn speed`;
    case 'findChancePct':
      return `+${(total * 100).toFixed(1).replace(/\.0$/, '')}% miner & gem find`;
    case 'oreLuckPct':
      return `+${pct}% luck for rare ores`;
    case 'charLuckPct':
      return `+${pct}% luck for rare miners`;
    case 'oreValuePct':
      return `+${pct}% ore sell value`;
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
  // Col 0: Global Tap Mastery (Strike I–VI tuned to ~8–12 clicks per normal rock across W2-W6)
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
    perLevel: 6,
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
    perLevel: 700,
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
    perLevel: 55_000,
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
    perLevel: 3_600_000,
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
    perLevel: 180_000_000,
    baseCost: 60_000_000_000,
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
    perLevel: 7_200_000_000,
    baseCost: 12_000_000_000_000,
    costMult: 2.55,
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
    perLevel: 0.04,
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
    perLevel: 0.25,
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
    perLevel: 0.2,
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
    perLevel: 0.5,
    baseCost: 15_000_000_000,
    costMult: 3.0,
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
    perLevel: 0.35,
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
    perLevel: 0.25,
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
    perLevel: 0.3,
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
    baseCost: 2_500_000_000,
    costMult: 2.5,
    descTemplate: 'Void-forged storage expansion up to +300K total Core capacity.',
  },
];

// ============================================================================
// STANDARDIZED 12-NODE WORLD TREE BUILDER (5x4 symmetric, 58 points/world)
// ============================================================================
interface WorldTreeSpec {
  treeId: WorldId;
  worldLabel: string;
  prefix: string;
  rootId?: string;
  respawnId?: string;
  valueId?: string;
  denseId?: string;
  names: {
    root: string;
    dmg: string;
    oreLuck: string;
    respawn: string;
    value: string;
    fragility: string;
    dense: string;
    output: string;
    charLuck: string;
    find: string;
    chest: string;
    apex: string;
  };
  stats: {
    dmgPerLv: number;
    oreLuckPerLv: number;
    respawnPerLv: number;
    valuePerLv: number;
    fragilityPerLv: number;
    outputPerLv: number;
    charLuckPerLv: number;
    findPerLv: number;
    chestPerLv: number;
    apexDmgPerLv: number;
  };
  costs: {
    root: number;
    tier1: number;
    dense: number;
    tier2: number;
    apex: number;
  };
}

function buildStandardWorldTree(spec: WorldTreeSpec): readonly ResearchNodeDef[] {
  const { treeId, worldLabel, prefix, names, stats, costs } = spec;
  const rootId = spec.rootId ?? `${prefix}-root`;
  const dmgId = `${prefix}-dmg`;
  const oreLuckId = `${prefix}-luck`;
  const respawnId = spec.respawnId ?? `${prefix}-speed`;
  const valueId = spec.valueId ?? `${prefix}-val`;
  const fragilityId = `${prefix}-crack`;
  const denseId = spec.denseId ?? `${prefix}-dense`;
  const outputId = `${prefix}-out`;
  const charLuckId = `${prefix}-char`;
  const findId = `${prefix}-find`;
  const chestId = `${prefix}-chest`;
  const apexId = `${prefix}-apex`;

  return [
    // Row 0 Col 2: Root — Extra Ore Nodes (+8 max)
    {
      id: rootId,
      treeId,
      name: names.root,
      maxLevel: 8,
      row: 0,
      col: 2,
      requires: [],
      icon: 'oreDeposit',
      effectType: 'extraOreNodes',
      perLevel: 1,
      baseCost: costs.root,
      costMult: 1.7,
      descTemplate: `Spawns extra rock nodes in ${worldLabel}.`,
    },
    // Row 1 (Tier 1): 5 parallel pillars from Root
    {
      id: dmgId,
      treeId,
      name: names.dmg,
      maxLevel: 5,
      row: 1,
      col: 0,
      requires: [rootId],
      icon: 'pickaxePower',
      effectType: 'minerDmgPct',
      perLevel: stats.dmgPerLv,
      baseCost: costs.tier1,
      costMult: 1.9,
      descTemplate: `Boosts Chibi miner damage inside ${worldLabel}.`,
    },
    {
      id: oreLuckId,
      treeId,
      name: names.oreLuck,
      maxLevel: 5,
      row: 1,
      col: 1,
      requires: [rootId],
      icon: 'clover',
      effectType: 'oreLuckPct',
      perLevel: stats.oreLuckPerLv,
      baseCost: Math.round(costs.tier1 * 1.1),
      costMult: 1.9,
      descTemplate: `Improves rare ore odds inside ${worldLabel}.`,
    },
    {
      id: respawnId,
      treeId,
      name: names.respawn,
      maxLevel: 5,
      row: 1,
      col: 2,
      requires: [rootId],
      icon: 'speedPlay',
      effectType: 'respawnSpeedPct',
      perLevel: stats.respawnPerLv,
      baseCost: Math.round(costs.tier1 * 0.9),
      costMult: 1.85,
      descTemplate: `Rocks respawn faster in ${worldLabel}.`,
    },
    {
      id: valueId,
      treeId,
      name: names.value,
      maxLevel: 5,
      row: 1,
      col: 3,
      requires: [rootId],
      icon: 'oreValue',
      effectType: 'oreValuePct',
      perLevel: stats.valuePerLv,
      baseCost: Math.round(costs.tier1 * 1.15),
      costMult: 1.9,
      descTemplate: `Increases sell price of ${worldLabel} ores.`,
    },
    {
      id: fragilityId,
      treeId,
      name: names.fragility,
      maxLevel: 5,
      row: 1,
      col: 4,
      requires: [rootId],
      icon: 'crack',
      effectType: 'oreFragilityPct',
      perLevel: stats.fragilityPerLv,
      baseCost: Math.round(costs.tier1 * 1.05),
      costMult: 1.9,
      descTemplate: `Reduces rock toughness in ${worldLabel} for faster breaks.`,
    },
    // Row 2 (Tier 2): 5 specialized follow-up nodes directly beneath each pillar
    {
      id: denseId,
      treeId,
      name: names.dense,
      maxLevel: 1,
      row: 2,
      col: 0,
      requires: [dmgId],
      icon: 'toughness',
      effectType: 'denseOreScale',
      perLevel: 1,
      baseCost: costs.dense,
      costMult: 1,
      descTemplate: `Compresses ${worldLabel} rocks into Dense Ores (Ore HP ×10, Ore Drops ×3).`,
    },
    {
      id: outputId,
      treeId,
      name: names.output,
      maxLevel: 5,
      row: 2,
      col: 1,
      requires: [oreLuckId],
      icon: 'crystalVein',
      effectType: 'oreOutputPct',
      perLevel: stats.outputPerLv,
      baseCost: costs.tier2,
      costMult: 2.0,
      descTemplate: `Increases ore dropped per broken rock in ${worldLabel}.`,
    },
    {
      id: charLuckId,
      treeId,
      name: names.charLuck,
      maxLevel: 5,
      row: 2,
      col: 2,
      requires: [respawnId],
      icon: 'goldClover',
      effectType: 'charLuckPct',
      perLevel: stats.charLuckPerLv,
      baseCost: Math.round(costs.tier2 * 0.95),
      costMult: 2.0,
      descTemplate: `Higher chance of rare Chibi miners in ${worldLabel}.`,
    },
    {
      id: findId,
      treeId,
      name: names.find,
      maxLevel: 5,
      row: 2,
      col: 3,
      requires: [valueId],
      icon: 'oreVein',
      effectType: 'findChancePct',
      perLevel: stats.findPerLv,
      baseCost: Math.round(costs.tier2 * 1.05),
      costMult: 2.0,
      descTemplate: `Increases Chibi & Gem discovery rate in ${worldLabel}.`,
    },
    {
      id: chestId,
      treeId,
      name: names.chest,
      maxLevel: 5,
      row: 2,
      col: 4,
      requires: [fragilityId],
      icon: 'chestCap',
      effectType: 'chestCapacityFlat',
      perLevel: stats.chestPerLv,
      baseCost: costs.tier2,
      costMult: 2.0,
      descTemplate: `Adds bonus chest capacity while mining in ${worldLabel}.`,
    },
    // Row 3 Col 2: Apex World Mastery Keystone
    {
      id: apexId,
      treeId,
      name: names.apex,
      maxLevel: 4,
      row: 3,
      col: 2,
      requires: [outputId, charLuckId, findId],
      icon: 'worldMastery',
      effectType: 'minerDmgPct',
      perLevel: stats.apexDmgPerLv,
      baseCost: costs.apex,
      costMult: 2.15,
      descTemplate: `Ultimate ${worldLabel} Chibi combat mastery.`,
    },
  ];
}

// ============================================================================
// WORLDS 1–6 (Unified 12-node layout, 58 points each)
// ============================================================================
const UNDERGROUND_NODES = buildStandardWorldTree({
  treeId: 'underground',
  worldLabel: 'The Underground',
  prefix: 'ug',
  rootId: 'ug-deposits-1',
  respawnId: 'ug-respawn-1',
  valueId: 'ug-value-1',
  denseId: 'ug-rich-seam',
  names: {
    root: 'Deposits I',
    dmg: 'Prospecting',
    oreLuck: 'Coalite Luck',
    respawn: 'Swift Respawn',
    value: 'Refined Smelt',
    fragility: 'Fault Lines',
    dense: 'Dense Seam',
    output: 'Abundant Ore',
    charLuck: 'Subterranean Call',
    find: 'Finder Eye',
    chest: 'Tunnel Cache',
    apex: 'Underground Mastery',
  },
  stats: {
    dmgPerLv: 0.3,
    oreLuckPerLv: 0.2,
    respawnPerLv: 0.2,
    valuePerLv: 0.2,
    fragilityPerLv: 0.08,
    outputPerLv: 0.18,
    charLuckPerLv: 0.2,
    findPerLv: 0.04,
    chestPerLv: 600,
    apexDmgPerLv: 0.45,
  },
  costs: {
    root: 80,
    tier1: 350,
    dense: 15_000,
    tier2: 1_800,
    apex: 18_000,
  },
});

const CRYSTAL_NODES = buildStandardWorldTree({
  treeId: 'crystal',
  worldLabel: 'Crystal Caves',
  prefix: 'cc',
  names: {
    root: 'Crystal Nodes',
    dmg: 'Sapphire Edge',
    oreLuck: 'Prismatic Luck',
    respawn: 'Crystal Pulse',
    value: 'Facet Cut',
    fragility: 'Shatter Seam',
    dense: 'Dense Crystal',
    output: 'Rich Clusters',
    charLuck: 'Prism Beacon',
    find: 'Celestium Lens',
    chest: 'Geode Satchel',
    apex: 'Prism Mastery',
  },
  stats: {
    dmgPerLv: 0.45,
    oreLuckPerLv: 0.24,
    respawnPerLv: 0.25,
    valuePerLv: 0.25,
    fragilityPerLv: 0.08,
    outputPerLv: 0.22,
    charLuckPerLv: 0.25,
    findPerLv: 0.05,
    chestPerLv: 2_000,
    apexDmgPerLv: 0.7,
  },
  costs: {
    root: 50_000,
    tier1: 120_000,
    dense: 1_500_000,
    tier2: 450_000,
    apex: 4_800_000,
  },
});

const MAGMA_NODES = buildStandardWorldTree({
  treeId: 'magma',
  worldLabel: 'Magma Hollows',
  prefix: 'mg',
  names: {
    root: 'Ember Veins',
    dmg: 'Forge Heat',
    oreLuck: 'Ash Sifter',
    respawn: 'Magma Surge',
    value: 'Molten Gold',
    fragility: 'Thermal Shock',
    dense: 'Dense Basalt',
    output: 'Lava Clusters',
    charLuck: 'Inferno Call',
    find: 'Core Compass',
    chest: 'Crucible Vault',
    apex: 'Caldera Mastery',
  },
  stats: {
    dmgPerLv: 0.6,
    oreLuckPerLv: 0.28,
    respawnPerLv: 0.3,
    valuePerLv: 0.3,
    fragilityPerLv: 0.08,
    outputPerLv: 0.26,
    charLuckPerLv: 0.3,
    findPerLv: 0.06,
    chestPerLv: 6_000,
    apexDmgPerLv: 0.95,
  },
  costs: {
    root: 10_000_000,
    tier1: 24_000_000,
    dense: 320_000_000,
    tier2: 105_000_000,
    apex: 1_100_000_000,
  },
});

const RUINS_NODES = buildStandardWorldTree({
  treeId: 'ruins',
  worldLabel: 'Ancient Ruins',
  prefix: 'rn',
  names: {
    root: 'Rune Pillars',
    dmg: 'Titan Might',
    oreLuck: 'Relic Luck',
    respawn: 'Chrono Haste',
    value: 'Aether Appraisal',
    fragility: 'Shattered Seal',
    dense: 'Dense Monolith',
    output: 'Gildium Cache',
    charLuck: 'Seraph Beacon',
    find: 'Temple Compass',
    chest: 'Sanctum Coffer',
    apex: 'Immortite Mastery',
  },
  stats: {
    dmgPerLv: 0.8,
    oreLuckPerLv: 0.32,
    respawnPerLv: 0.35,
    valuePerLv: 0.35,
    fragilityPerLv: 0.09,
    outputPerLv: 0.3,
    charLuckPerLv: 0.35,
    findPerLv: 0.07,
    chestPerLv: 15_000,
    apexDmgPerLv: 1.25,
  },
  costs: {
    root: 1_500_000_000,
    tier1: 3_200_000_000,
    dense: 45_000_000_000,
    tier2: 14_000_000_000,
    apex: 140_000_000_000,
  },
});

const VOIDREACH_NODES = buildStandardWorldTree({
  treeId: 'astral',
  worldLabel: 'Voidreach',
  prefix: 'vr',
  names: {
    root: 'Void Fractures',
    dmg: 'Nebula Edge',
    oreLuck: 'Duskcrown Luck',
    respawn: 'Warp Cycle',
    value: 'Eclipse Worth',
    fragility: 'Gravity Crush',
    dense: 'Dense Singularity',
    output: 'Cosmite Swarm',
    charLuck: 'Archon Signal',
    find: 'Astral Rift Lens',
    chest: 'Dimensional Bag',
    apex: 'Void Singularity',
  },
  stats: {
    dmgPerLv: 1.0,
    oreLuckPerLv: 0.36,
    respawnPerLv: 0.4,
    valuePerLv: 0.4,
    fragilityPerLv: 0.09,
    outputPerLv: 0.35,
    charLuckPerLv: 0.4,
    findPerLv: 0.08,
    chestPerLv: 45_000,
    apexDmgPerLv: 1.6,
  },
  costs: {
    root: 45_000_000_000,
    tier1: 90_000_000_000,
    dense: 1_200_000_000_000,
    tier2: 450_000_000_000,
    apex: 4_500_000_000_000,
  },
});

const STARWELL_NODES = buildStandardWorldTree({
  treeId: 'starwell',
  worldLabel: 'Starwell',
  prefix: 'sw',
  names: {
    root: 'Skyfall Veins',
    dmg: 'Zenith Strike',
    oreLuck: 'Dawncrown Luck',
    respawn: 'Aurora Cycle',
    value: 'Caelite Worth',
    fragility: 'Starlight Shear',
    dense: 'Dense Starcore',
    output: 'Aurorine Cascade',
    charLuck: 'Prism Beacon',
    find: 'Celestial Lens',
    chest: 'Skyvault Bag',
    apex: 'Crown of Dawn',
  },
  stats: {
    dmgPerLv: 1.25,
    oreLuckPerLv: 0.4,
    respawnPerLv: 0.45,
    valuePerLv: 0.45,
    fragilityPerLv: 0.09,
    outputPerLv: 0.4,
    charLuckPerLv: 0.45,
    findPerLv: 0.1,
    chestPerLv: 120_000,
    apexDmgPerLv: 2.0,
  },
  costs: {
    root: 9_000_000_000_000,
    tier1: 18_000_000_000_000,
    dense: 220_000_000_000_000,
    tier2: 90_000_000_000_000,
    apex: 900_000_000_000_000,
  },
});

export const RESEARCH_NODES: readonly ResearchNodeDef[] = [
  ...CORE_NODES,
  ...UNDERGROUND_NODES,
  ...CRYSTAL_NODES,
  ...MAGMA_NODES,
  ...RUINS_NODES,
  ...VOIDREACH_NODES,
  ...STARWELL_NODES,
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
