import type { WorldId } from './GameData';
import type { ResearchNodeDef } from './ResearchData';

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
export const UNDERGROUND_NODES = buildStandardWorldTree({
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
    chestPerLv: 3_000,
    apexDmgPerLv: 0.45,
  },
  costs: {
    root: 1_600,
    tier1: 7_000,
    dense: 300_000,
    tier2: 36_000,
    apex: 360_000,
  },
});

export const CRYSTAL_NODES = buildStandardWorldTree({
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
    dmgPerLv: 0.65,
    oreLuckPerLv: 0.35,
    respawnPerLv: 0.3,
    valuePerLv: 0.35,
    fragilityPerLv: 0.1,
    outputPerLv: 0.25,
    charLuckPerLv: 0.35,
    findPerLv: 0.06,
    chestPerLv: 15_000,
    apexDmgPerLv: 1.0,
  },
  costs: {
    root: 1_000_000,
    tier1: 2_400_000,
    dense: 30_000_000,
    tier2: 9_000_000,
    apex: 96_000_000,
  },
});

export const MAGMA_NODES = buildStandardWorldTree({
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
    dmgPerLv: 1.75,
    oreLuckPerLv: 0.6,
    respawnPerLv: 0.4,
    valuePerLv: 0.8,
    fragilityPerLv: 0.12,
    outputPerLv: 0.35,
    charLuckPerLv: 0.5,
    findPerLv: 0.08,
    chestPerLv: 50_000,
    apexDmgPerLv: 2.75,
  },
  costs: {
    root: 200_000_000,
    tier1: 480_000_000,
    dense: 6_400_000_000,
    tier2: 2_100_000_000,
    apex: 22_000_000_000,
  },
});

export const RUINS_NODES = buildStandardWorldTree({
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
    dmgPerLv: 5.5,
    oreLuckPerLv: 1.0,
    respawnPerLv: 0.55,
    valuePerLv: 2.1,
    fragilityPerLv: 0.14,
    outputPerLv: 0.5,
    charLuckPerLv: 0.75,
    findPerLv: 0.1,
    chestPerLv: 150_000,
    apexDmgPerLv: 9.0,
  },
  costs: {
    root: 30_000_000_000,
    tier1: 64_000_000_000,
    dense: 900_000_000_000,
    tier2: 280_000_000_000,
    apex: 2_800_000_000_000,
  },
});

export const VOIDREACH_NODES = buildStandardWorldTree({
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
    dmgPerLv: 16.0,
    oreLuckPerLv: 1.8,
    respawnPerLv: 0.7,
    valuePerLv: 6.0,
    fragilityPerLv: 0.15,
    outputPerLv: 0.7,
    charLuckPerLv: 1.1,
    findPerLv: 0.12,
    chestPerLv: 375_000,
    apexDmgPerLv: 26.0,
  },
  costs: {
    root: 900_000_000_000,
    tier1: 1_800_000_000_000,
    dense: 24_000_000_000_000,
    tier2: 9_000_000_000_000,
    apex: 90_000_000_000_000,
  },
});

export const STARWELL_NODES = buildStandardWorldTree({
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
    dmgPerLv: 80.0,
    oreLuckPerLv: 3.0,
    respawnPerLv: 0.85,
    valuePerLv: 42.0,
    fragilityPerLv: 0.15,
    outputPerLv: 0.9,
    charLuckPerLv: 1.6,
    findPerLv: 0.15,
    chestPerLv: 750_000,
    apexDmgPerLv: 130.0,
  },
  costs: {
    root: 180_000_000_000_000,
    tier1: 360_000_000_000_000,
    dense: 4_400_000_000_000_000,
    tier2: 1_800_000_000_000_000,
    apex: 18_000_000_000_000_000,
  },
});

export const ABYSSAL_NODES = buildStandardWorldTree({
  treeId: 'abyssal',
  worldLabel: 'Abyssal Biolume',
  prefix: 'ab',
  names: {
    root: 'Trench Veins',
    dmg: 'Leviathan Force',
    oreLuck: 'Pearl Fortune',
    respawn: 'Tidal Surge',
    value: 'Abyssal Worth',
    fragility: 'Pressure Fracture',
    dense: 'Dense Trench Core',
    output: 'Prismarine Flow',
    charLuck: 'Biolume Lure',
    find: 'Sonar Eye',
    chest: 'Abyssal Vault',
    apex: 'Leviathan Crown',
  },
  stats: {
    dmgPerLv: 220.0,
    oreLuckPerLv: 5.0,
    respawnPerLv: 1.0,
    valuePerLv: 120.0,
    fragilityPerLv: 0.15,
    outputPerLv: 1.2,
    charLuckPerLv: 2.2,
    findPerLv: 0.18,
    chestPerLv: 1_250_000,
    apexDmgPerLv: 360.0,
  },
  costs: {
    root: 6_400_000_000_000_000,
    tier1: 12_800_000_000_000_000,
    dense: 160_000_000_000_000_000,
    tier2: 64_000_000_000_000_000,
    apex: 640_000_000_000_000_000,
  },
});

export const CHRONO_NODES = buildStandardWorldTree({
  treeId: 'chrono',
  worldLabel: 'Chrono Nexus',
  prefix: 'cn',
  names: {
    root: 'Temporal Seams',
    dmg: 'Chrono Strike',
    oreLuck: 'Aether Fortune',
    respawn: 'Clockwork Loop',
    value: 'Nexus Appraisal',
    fragility: 'Paradox Shear',
    dense: 'Dense Hourglass Core',
    output: 'Aether Cascade',
    charLuck: 'Timeless Beacon',
    find: 'Astrolabe Lens',
    chest: 'Eternity Vault',
    apex: 'Chronocrown Mastery',
  },
  stats: {
    dmgPerLv: 750.0,
    oreLuckPerLv: 8.0,
    respawnPerLv: 1.2,
    valuePerLv: 600.0,
    fragilityPerLv: 0.15,
    outputPerLv: 1.5,
    charLuckPerLv: 3.0,
    findPerLv: 0.22,
    chestPerLv: 2_000_000,
    apexDmgPerLv: 1200.0,
  },
  costs: {
    root: 190_000_000_000_000_000,
    tier1: 380_000_000_000_000_000,
    dense: 4_800_000_000_000_000_000,
    tier2: 1_900_000_000_000_000_000,
    apex: 19_000_000_000_000_000_000,
  },
});

