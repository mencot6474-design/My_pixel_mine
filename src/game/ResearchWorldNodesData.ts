import type { WorldId } from './GameData';
import type { ResearchNodeDef } from './ResearchData';

// ============================================================================
// STANDARDIZED 12-NODE WORLD TREE BUILDER (5x4 symmetric, 62 points/world)
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
    gemGain: string;
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
    gemGainPerLv: number;
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
      name: names.gemGain,
      maxLevel: 5,
      row: 1,
      col: 4,
      requires: [rootId],
      icon: 'gemGain',
      effectType: 'gemGainPct',
      perLevel: stats.gemGainPerLv,
      baseCost: Math.round(costs.tier1 * 1.05),
      costMult: 1.9,
      descTemplate: `Increases Gems dropped from rocks in ${worldLabel}.`,
    },
    // Row 2 (Tier 2): 5 specialized follow-up nodes directly beneath each pillar
    {
      id: denseId,
      treeId,
      name: names.dense,
      maxLevel: 5,
      row: 2,
      col: 0,
      requires: [dmgId],
      icon: 'toughness',
      effectType: 'denseOreScale',
      perLevel: 1,
      baseCost: costs.dense,
      costMult: 2.1,
      descTemplate: `Compresses ${worldLabel} rocks into Dense Ores up to 5 stacks (Ore HP ×10, Ore Drops ×3 per stack).`,
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
    gemGain: 'Gem Seams',
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
    gemGainPerLv: 0.15,
    outputPerLv: 0.15,
    charLuckPerLv: 0.2,
    findPerLv: 0.04,
    chestPerLv: 3_000,
    apexDmgPerLv: 0.45,
  },
  costs: {
    root: 6_000,
    tier1: 20_000,
    dense: 480_000,
    tier2: 80_000,
    apex: 600_000,
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
    gemGain: 'Crystal Geodes',
    dense: 'Dense Crystal',
    output: 'Rich Clusters',
    charLuck: 'Prism Beacon',
    find: 'Celestium Lens',
    chest: 'Geode Satchel',
    apex: 'Prism Mastery',
  },
  stats: {
    dmgPerLv: 0.35,
    oreLuckPerLv: 0.3,
    respawnPerLv: 0.25,
    valuePerLv: 0.22,
    gemGainPerLv: 0.18,
    outputPerLv: 0.17,
    charLuckPerLv: 0.3,
    findPerLv: 0.05,
    chestPerLv: 15_000,
    apexDmgPerLv: 0.55,
  },
  costs: {
    root: 15_000_000,
    tier1: 50_000_000,
    dense: 1_200_000_000,
    tier2: 200_000_000,
    apex: 1_500_000_000,
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
    gemGain: 'Ember Gems',
    dense: 'Dense Basalt',
    output: 'Lava Clusters',
    charLuck: 'Inferno Call',
    find: 'Core Compass',
    chest: 'Crucible Vault',
    apex: 'Caldera Mastery',
  },
  stats: {
    dmgPerLv: 0.4,
    oreLuckPerLv: 0.45,
    respawnPerLv: 0.3,
    valuePerLv: 0.24,
    gemGainPerLv: 0.21,
    outputPerLv: 0.19,
    charLuckPerLv: 0.4,
    findPerLv: 0.06,
    chestPerLv: 50_000,
    apexDmgPerLv: 0.65,
  },
  costs: {
    root: 36_000_000_000,
    tier1: 120_000_000_000,
    dense: 2_880_000_000_000,
    tier2: 480_000_000_000,
    apex: 3_600_000_000_000,
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
    gemGain: 'Runic Gems',
    dense: 'Dense Monolith',
    output: 'Gildium Cache',
    charLuck: 'Seraph Beacon',
    find: 'Temple Compass',
    chest: 'Sanctum Coffer',
    apex: 'Immortite Mastery',
  },
  stats: {
    dmgPerLv: 0.45,
    oreLuckPerLv: 0.65,
    respawnPerLv: 0.35,
    valuePerLv: 0.26,
    gemGainPerLv: 0.24,
    outputPerLv: 0.21,
    charLuckPerLv: 0.55,
    findPerLv: 0.07,
    chestPerLv: 150_000,
    apexDmgPerLv: 0.75,
  },
  costs: {
    root: 90_000_000_000_000,
    tier1: 300_000_000_000_000,
    dense: 7_200_000_000_000_000,
    tier2: 1_200_000_000_000_000,
    apex: 9_000_000_000_000_000,
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
    gemGain: 'Void Gems',
    dense: 'Dense Singularity',
    output: 'Cosmite Swarm',
    charLuck: 'Archon Signal',
    find: 'Astral Rift Lens',
    chest: 'Dimensional Bag',
    apex: 'Void Singularity',
  },
  stats: {
    dmgPerLv: 0.5,
    oreLuckPerLv: 0.9,
    respawnPerLv: 0.4,
    valuePerLv: 0.28,
    gemGainPerLv: 0.27,
    outputPerLv: 0.23,
    charLuckPerLv: 0.7,
    findPerLv: 0.08,
    chestPerLv: 375_000,
    apexDmgPerLv: 0.85,
  },
  costs: {
    root: 210_000_000_000_000_000,
    tier1: 700_000_000_000_000_000,
    dense: 16_800_000_000_000_000_000,
    tier2: 2_800_000_000_000_000_000,
    apex: 21_000_000_000_000_000_000,
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
    gemGain: 'Starlight Gems',
    dense: 'Dense Starcore',
    output: 'Aurorine Cascade',
    charLuck: 'Prism Beacon',
    find: 'Celestial Lens',
    chest: 'Skyvault Bag',
    apex: 'Crown of Dawn',
  },
  stats: {
    dmgPerLv: 0.55,
    oreLuckPerLv: 1.2,
    respawnPerLv: 0.45,
    valuePerLv: 0.3,
    gemGainPerLv: 0.3,
    outputPerLv: 0.25,
    charLuckPerLv: 0.9,
    findPerLv: 0.09,
    chestPerLv: 750_000,
    apexDmgPerLv: 0.95,
  },
  costs: {
    root: 480_000_000_000_000_000_000,
    tier1: 1_600_000_000_000_000_000_000,
    dense: 38_400_000_000_000_000_000_000,
    tier2: 6_400_000_000_000_000_000_000,
    apex: 48_000_000_000_000_000_000_000,
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
    gemGain: 'Abyssal Gems',
    dense: 'Dense Trench Core',
    output: 'Prismarine Flow',
    charLuck: 'Biolume Lure',
    find: 'Sonar Eye',
    chest: 'Abyssal Vault',
    apex: 'Leviathan Crown',
  },
  stats: {
    dmgPerLv: 0.6,
    oreLuckPerLv: 1.5,
    respawnPerLv: 0.5,
    valuePerLv: 0.32,
    gemGainPerLv: 0.33,
    outputPerLv: 0.27,
    charLuckPerLv: 1.1,
    findPerLv: 0.1,
    chestPerLv: 1_250_000,
    apexDmgPerLv: 1.05,
  },
  costs: {
    root: 1_080_000_000_000_000_000_000_000,
    tier1: 3_600_000_000_000_000_000_000_000,
    dense: 86_400_000_000_000_000_000_000_000,
    tier2: 14_400_000_000_000_000_000_000_000,
    apex: 108_000_000_000_000_000_000_000_000,
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
    gemGain: 'Chrono Gems',
    dense: 'Dense Hourglass Core',
    output: 'Aether Cascade',
    charLuck: 'Timeless Beacon',
    find: 'Astrolabe Lens',
    chest: 'Eternity Vault',
    apex: 'Chronocrown Mastery',
  },
  stats: {
    dmgPerLv: 0.65,
    oreLuckPerLv: 1.9,
    respawnPerLv: 0.55,
    valuePerLv: 0.35,
    gemGainPerLv: 0.36,
    outputPerLv: 0.3,
    charLuckPerLv: 1.35,
    findPerLv: 0.12,
    chestPerLv: 2_000_000,
    apexDmgPerLv: 1.15,
  },
  costs: {
    root: 2_400_000_000_000_000_000_000_000_000,
    tier1: 8_000_000_000_000_000_000_000_000_000,
    dense: 192_000_000_000_000_000_000_000_000_000,
    tier2: 32_000_000_000_000_000_000_000_000_000,
    apex: 240_000_000_000_000_000_000_000_000_000,
  },
});

export const SOLARIS_NODES = buildStandardWorldTree({
  treeId: 'solaris',
  worldLabel: 'Solaris Sanctum',
  prefix: 'sl',
  names: {
    root: 'Corona Seams',
    dmg: 'Solar Flare Strike',
    oreLuck: 'Sunburst Fortune',
    respawn: 'Plasma Cycle',
    value: 'Solaris Appraisal',
    gemGain: 'Solar Gems',
    dense: 'Dense Sun Core',
    output: 'Prism Surge',
    charLuck: 'Helios Beacon',
    find: 'Corona Lens',
    chest: 'Sunforge Vault',
    apex: 'Solarcrown Mastery',
  },
  stats: {
    dmgPerLv: 0.7,
    oreLuckPerLv: 2.3,
    respawnPerLv: 0.6,
    valuePerLv: 0.38,
    gemGainPerLv: 0.39,
    outputPerLv: 0.33,
    charLuckPerLv: 1.6,
    findPerLv: 0.14,
    chestPerLv: 3_500_000,
    apexDmgPerLv: 1.25,
  },
  costs: {
    root: 5_400_000_000_000_000_000_000_000_000_000,
    tier1: 18_000_000_000_000_000_000_000_000_000_000,
    dense: 432_000_000_000_000_000_000_000_000_000_000,
    tier2: 72_000_000_000_000_000_000_000_000_000_000,
    apex: 540_000_000_000_000_000_000_000_000_000_000,
  },
});

export const ELYSIUM_NODES = buildStandardWorldTree({
  treeId: 'elysium',
  worldLabel: 'Elysium Core',
  prefix: 'el',
  names: {
    root: 'Origin Veins',
    dmg: 'Genesis Force',
    oreLuck: 'Elysian Fortune',
    respawn: 'Aurora Revival',
    value: 'Genesis Appraisal',
    gemGain: 'Elysian Gems',
    dense: 'Dense Origin Core',
    output: 'Seraphic Cascade',
    charLuck: 'Elysium Halo',
    find: 'Origin Sight',
    chest: 'Celestial Treasury',
    apex: 'Genesisheart Mastery',
  },
  stats: {
    dmgPerLv: 0.75,
    oreLuckPerLv: 2.75,
    respawnPerLv: 0.65,
    valuePerLv: 0.42,
    gemGainPerLv: 0.42,
    outputPerLv: 0.36,
    charLuckPerLv: 1.9,
    findPerLv: 0.16,
    chestPerLv: 6_000_000,
    apexDmgPerLv: 1.35,
  },
  costs: {
    root: 12_000_000_000_000_000_000_000_000_000_000_000,
    tier1: 40_000_000_000_000_000_000_000_000_000_000_000,
    dense: 960_000_000_000_000_000_000_000_000_000_000_000,
    tier2: 160_000_000_000_000_000_000_000_000_000_000_000,
    apex: 1_200_000_000_000_000_000_000_000_000_000_000_000,
  },
});

export const NIGHTMARE_NODES = buildStandardWorldTree({
  treeId: 'nightmare',
  worldLabel: 'Nightmare Hollow',
  prefix: 'nm',
  names: {
    root: 'Bramble Veins',
    dmg: 'Dread Cleaver',
    oreLuck: 'Bloodmoon Luck',
    respawn: 'Maw Revival',
    value: 'Nightmare Appraisal',
    gemGain: 'Dread Gems',
    dense: 'Dense Dread Core',
    output: 'Oculite Surge',
    charLuck: 'Shadow Whisper',
    find: 'Abyssal Gaze',
    chest: 'Manor Crypt Vault',
    apex: 'Vortexspire Mastery',
  },
  stats: {
    dmgPerLv: 0.8,
    oreLuckPerLv: 3.1,
    respawnPerLv: 0.7,
    valuePerLv: 0.45,
    gemGainPerLv: 0.45,
    outputPerLv: 0.39,
    charLuckPerLv: 2.15,
    findPerLv: 0.18,
    chestPerLv: 10_000_000,
    apexDmgPerLv: 1.45,
  },
  costs: {
    root: 27_000_000_000_000_000_000_000_000_000_000_000_000,
    tier1: 90_000_000_000_000_000_000_000_000_000_000_000_000,
    dense: 2_160_000_000_000_000_000_000_000_000_000_000_000_000,
    tier2: 360_000_000_000_000_000_000_000_000_000_000_000_000,
    apex: 2_700_000_000_000_000_000_000_000_000_000_000_000_000,
  },
});

export const SINGULARITY_NODES = buildStandardWorldTree({
  treeId: 'singularity',
  worldLabel: 'Eclipse Singularity',
  prefix: 'sg',
  names: {
    root: 'Horizon Seams',
    dmg: 'Singularity Crush',
    oreLuck: 'Spiral Fortune',
    respawn: 'Eclipse Cycle',
    value: 'Sovereign Appraisal',
    gemGain: 'Horizon Gems',
    dense: 'Dense Horizon Core',
    output: 'Dual-Lance Surge',
    charLuck: 'Monarch Call',
    find: 'Spiral Gaze',
    chest: 'Eclipse Treasury',
    apex: 'Sovereign Mastery',
  },
  stats: {
    dmgPerLv: 0.85,
    oreLuckPerLv: 3.5,
    respawnPerLv: 0.75,
    valuePerLv: 0.48,
    gemGainPerLv: 0.48,
    outputPerLv: 0.42,
    charLuckPerLv: 2.4,
    findPerLv: 0.2,
    chestPerLv: 16_000_000,
    apexDmgPerLv: 1.55,
  },
  costs: {
    root: 60_000_000_000_000_000_000_000_000_000_000_000_000_000,
    tier1: 200_000_000_000_000_000_000_000_000_000_000_000_000_000,
    dense: 4_800_000_000_000_000_000_000_000_000_000_000_000_000_000,
    tier2: 800_000_000_000_000_000_000_000_000_000_000_000_000_000,
    apex: 6_000_000_000_000_000_000_000_000_000_000_000_000_000_000,
  },
});

