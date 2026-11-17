import { CHIBI_CATALOG, getChibiById } from '../game3d/ChibiCatalog';
import { MAX_PIT_NODE_COUNT, OreVariantKey, STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import {
  DEFAULT_PICKAXE_STOCK,
  ENCHANT_DICE_GEM_COST,
  EnchantDef,
  ENCHANTS,
  getEnchantById,
  getGemShopItemById,
  getMinerSellValue,
  getMinersByWorld,
  getMutationById,
  getOreById,
  getOresByWorld,
  getPickaxeById,
  getPickaxeSellValue,
  getWorldById,
  getWorldIndex,
  ORES,
  PICKAXE_RESTOCK_MS,
  PICKAXES,
  rollEnchantDef,
  rollMutation,
  rollWorldMiner,
  rollWorldOre,
  WORLD_MINERS,
  WorldId,
  WORLDS,
} from './GameData';
import {
  DENSE_ORE_DROP_MULT,
  DENSE_ORE_HP_MULT,
  getNodeNextCost,
  getResearchNodeById,
  getResearchNodesForTree,
  getResearchTreeMaxPoints,
  RESEARCH_NODES,
  ResearchEffectType,
  ResearchTreeId,
} from './ResearchData';
import {
  getGlobalGemGainBonus,
  getTowerCheckpoints,
  getTowerFloorDef,
  getTowerKeyCashCost,
  getTowerSweepGemReward,
  getTowerWaveDef,
  pickTowerBlessingChoices,
  rollTowerWaveOres,
  TOWER_BLESSING_AUTO_PICK_SEC,
  TOWER_BOSS_INVUL_SEC,
  TOWER_KEY_REGEN_MS,
  TOWER_MAX_KEYS,
  TOWER_MILESTONES,
  TOWER_WAVES_PER_FLOOR,
  TowerBlessingDef,
  TowerRunState,
  TowerRunSummary,
  TowerSaveData,
} from './TowerData';
import {
  getWeatherById,
  isValidWeatherId,
  rollWeatherDef,
  WEATHER_DURATION_MS,
  WeatherDef,
  WeatherId,
} from './WeatherData';

const SAVE_KEY = 'my_anime_mine_v2_save_v1';

const LEGACY_ORE_ID_MAP: Record<string, string> = {
  // Legacy World 2 -> Crystal Caves Index
  topaz: 'glowquartz',
  sapphire: 'frostquartz',
  ruby: 'prismite',
  emerald: 'hushstone',
  amethyst: 'azurine',
  diamond: 'glimmerite',
  prismarine: 'spectrine',
  starlight: 'spectrine',
  // Legacy World 3 -> Magma Hollows Index
  ashstone: 'emberstone',
  cinderite: 'ashglass',
  brimslate: 'magmite',
  obsidiarch: 'scorchgold',
  solarium: 'pyroclast',
  infernite: 'moltenite',
  coreheart: 'pyrecore',
  // Legacy World 4 -> Ancient Ruins Index
  mossrock: 'runestone',
  aetherite: 'sanctite',
  chronogem: 'gildium',
  voidglass: 'oathstone',
  astralith: 'idolshard',
  eternium: 'immortite',
  // Legacy World 5 -> Voidreach Index
  stardust: 'voidshard',
  lunaglass: 'gloomite',
  novashard: 'nullite',
  eclipseon: 'riftglass',
  celestflare: 'cosmite',
  prismavoid: 'singularite',
  singularity: 'duskcrown',
};

function migrateOreId(id: string): string {
  return LEGACY_ORE_ID_MAP[id] ?? id;
}

function isValidIndexId(id: string): boolean {
  return ORES.some((o) => o.id === id) || WORLD_MINERS.some((m) => m.chibiId === id);
}

export type ResearchLevelsMap = Record<ResearchTreeId, Record<string, number>>;

function createEmptyResearchLevels(): ResearchLevelsMap {
  return {
    core: {},
    underground: {},
    crystal: {},
    magma: {},
    ruins: {},
    astral: {},
    starwell: {},
  };
}

export interface PlotUnitState {
  chibiId: string;
  damageLevel: number;
  speedLevel: number;
  miningSpeedLevel: number;
  pickaxeId: string;
  mutationId: string;
  enchantId: string | null;
}

export interface SavePayload {
  cash: number;
  gems: number;
  activeWorldId: WorldId;
  miners: Record<string, number>;
  ores: Record<string, number>;
  others: Record<string, number>;
  hotbar: (string | null)[];
  plotMiners: (string | null)[];
  plotUnits: (PlotUnitState | null)[];
  ownedPickaxes: Record<string, number>;
  ownedEnchants: Record<string, number>;
  enchantDice: number;
  selectedHotbarSlot: number;
  chestMiners: Record<string, number>;
  chestOres: Record<string, number>;
  chestCapacity: number;
  autoSell: boolean;
  discovered: string[];
  activeBoosts?: Record<string, number>;
  unlockedWorlds?: WorldId[];
  researchLevels?: Partial<ResearchLevelsMap>;
  stashedUnits?: Record<string, PlotUnitState[]>;
  tower?: TowerSaveData;
  weather?: {
    id: WeatherId;
    expiresAt: number;
  };
}

export type StateListener = (state: GameState) => void;

const WORLD_UPGRADE_COST_SCALE: Record<WorldId, number> = {
  underground: 1,
  crystal: 40,
  magma: 1_000,
  ruins: 25_000,
  astral: 750_000,
  starwell: 22_500_000,
};

/**
 * Scales plot upgrade costs by the chibi's home world economy and a mild
 * intra-world rarity premium (`+12%` per baseDps multiple above anchor)
 * so Exotic/Secret chibis stay slightly pricier without punishing progression.
 */
export function getChibiUpgradeCostMult(chibiId: string): number {
  const chibi = getChibiById(chibiId);
  const minerEntry = WORLD_MINERS.find((wm) => wm.chibiId === chibiId);
  if (!chibi || !minerEntry) return 1;

  const worldScale = WORLD_UPGRADE_COST_SCALE[minerEntry.worldId] ?? 1;

  const worldMiners = getMinersByWorld(minerEntry.worldId);
  let anchorBaseDps = chibi.baseDps;
  for (const m of worldMiners) {
    if (m.chibi.baseDps < anchorBaseDps) anchorBaseDps = m.chibi.baseDps;
  }
  const charRatio = anchorBaseDps > 0 ? chibi.baseDps / anchorBaseDps : 1;
  const mildRarityFactor = 1 + Math.max(0, charRatio - 1) * 0.12;
  return worldScale * mildRarityFactor;
}

export class GameState {
  public cash = 250;
  public gems = 120;
  public activeWorldId: WorldId = 'underground';
  public unlockedWorlds: WorldId[] = ['underground'];
  public researchLevels: ResearchLevelsMap = createEmptyResearchLevels();
  public miners: Record<string, number> = {
    'astral-recruit': 1,
  };
  public ores: Record<string, number> = {};
  public others: Record<string, number> = {};
  public hotbar: (string | null)[] = Array(9).fill(null);
  public plotMiners: (string | null)[] = Array(STAGE_PEDESTAL_COUNT).fill(null);
  public plotUnits: (PlotUnitState | null)[] = Array(STAGE_PEDESTAL_COUNT).fill(null);
  public stashedUnits: Record<string, PlotUnitState[]> = {};
  public ownedPickaxes: Record<string, number> = {};
  public ownedEnchants: Record<string, number> = {
    blazing: 2,
    glacial: 1,
    quaking: 1,
  };
  public enchantDice = 1;
  public pickaxeStock: Record<string, number> = { ...DEFAULT_PICKAXE_STOCK };
  public pickaxeRestockAt = Date.now() + PICKAXE_RESTOCK_MS;
  public selectedHotbarSlot = -1;
  public chestMiners: Record<string, number> = {};
  public chestOres: Record<string, number> = {};
  public chestCapacity = 5000;
  public autoSell = false;
  public discovered = new Set<string>(['astral-recruit']);
  public activeBoosts: Record<string, number> = {};
  public towerBestFloor = 0;
  public towerKeys = TOWER_MAX_KEYS;
  public towerLastKeyRegenAt = Date.now();
  public towerClaimedMilestones: number[] = [];
  public towerRun: TowerRunState | null = null;
  public towerLastSummary: TowerRunSummary | null = null;
  private towerStartFloor = 1;
  private towerRunNewRecord = false;
  public weatherId: WeatherId = rollWeatherDef().id;
  public weatherExpiresAt = Date.now() + WEATHER_DURATION_MS;

  private readonly listeners = new Set<StateListener>();

  constructor() {
    this.load();
    this.syncTowerKeys();
    this.syncWeather(Date.now(), Math.random, false);
  }

  public subscribe(fn: StateListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.save();
    for (const fn of this.listeners) fn(this);
  }

  public getTotalIndexCount(): number {
    return ORES.length + WORLD_MINERS.length;
  }

  public getDiscoveredCount(): number {
    let count = 0;
    for (const ore of ORES) {
      if (this.discovered.has(ore.id)) count++;
    }
    for (const wm of WORLD_MINERS) {
      if (this.discovered.has(wm.chibiId)) count++;
    }
    return count;
  }

  public getWorldIndexProgress(worldId: WorldId): { found: number; total: number; pct: number } {
    const ores = getOresByWorld(worldId);
    const miners = getMinersByWorld(worldId);
    const total = ores.length + miners.length;
    let found = 0;
    for (const o of ores) {
      if (this.discovered.has(o.id)) found++;
    }
    for (const m of miners) {
      if (this.discovered.has(m.entry.chibiId)) found++;
    }
    const pct = total > 0 ? Math.round((found / total) * 100) : 0;
    return { found, total, pct };
  }

  public getChestItemCount(): number {
    let sum = 0;
    for (const v of Object.values(this.chestMiners)) sum += v;
    for (const v of Object.values(this.chestOres)) sum += v;
    return sum;
  }

  public getEquippedPlotMinerIds(): (string | null)[] {
    return this.plotMiners;
  }

  public getPlotUnit(slotIndex: number): PlotUnitState | null {
    return this.plotUnits[slotIndex] ?? null;
  }

  public getPlotUnitStats(slotIndex: number): {
    dmg: number;
    nextDmg: number;
    speed: number;
    miningMult: number;
    worth: number;
    dmgCost: number;
    speedCost: number;
    miningCost: number;
    mutationCost: number;
  } | null {
    const unit = this.plotUnits[slotIndex];
    if (!unit) return null;
    const chibi = getChibiById(unit.chibiId);
    if (!chibi) return null;

    const pick = unit.pickaxeId ? getPickaxeById(unit.pickaxeId) : null;
    const pickMult = pick ? pick.dmgMult : 1;
    const mut = getMutationById(unit.mutationId);
    const enc = getEnchantById(unit.enchantId);
    const encMult = enc ? enc.dmgMult : 1;

    const lvlScale = (lvl: number) => Math.pow(1.28, lvl - 1);
    const dmgResearchMult = 1 + this.getActiveResearchBonus('minerDmgPct');
    const weatherDmgMult = this.getWeatherDamageMult();
    const baseDmg = chibi.baseDps * lvlScale(unit.damageLevel) * pickMult * mut.mult * encMult * dmgResearchMult;
    const dmg = Math.round(baseDmg * weatherDmgMult);
    const nextDmg = Math.round(
      chibi.baseDps * lvlScale(unit.damageLevel + 1) * pickMult * mut.mult * encMult * dmgResearchMult * weatherDmgMult
    );
    const speed = 10 + (unit.speedLevel - 1) * 2;
    const miningMult = Number((1 + (unit.miningSpeedLevel - 1) * 0.1).toFixed(1));
    const worth = Math.round(baseDmg * 12);

    const upgradeCostMult = getChibiUpgradeCostMult(chibi.id);
    const dmgCost = Math.round(50 * Math.pow(1.32, unit.damageLevel - 1) * upgradeCostMult);
    const speedCost = Math.round(75 * Math.pow(1.42, unit.speedLevel - 1) * upgradeCostMult);
    const miningCost = Math.round(90 * Math.pow(1.45, unit.miningSpeedLevel - 1) * upgradeCostMult);
    const mutationCost = Math.max(10, Math.round(8 + Math.pow(chibi.baseDps, 0.35) * 2.2));

    return {
      dmg,
      nextDmg,
      speed,
      miningMult,
      worth,
      dmgCost,
      speedCost,
      miningCost,
      mutationCost,
    };
  }

  public getTotalPlotDps(): number {
    let total = 0;
    for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
      const st = this.getPlotUnitStats(i);
      if (st) total += st.dmg;
    }
    return total;
  }

  private equipChibiOnPlot(slotIndex: number, chibiId: string): 'placed' | 'replaced' | 'same' {
    if (this.plotMiners[slotIndex] === chibiId && !(this.stashedUnits[chibiId]?.length)) {
      return 'same';
    }
    const prevUnit = this.plotUnits[slotIndex];
    const hadPrev = Boolean(this.plotMiners[slotIndex]);
    const nextUnit = this.popStashedUnit(chibiId) ?? GameState.createFreshUnit(chibiId);
    this.plotMiners[slotIndex] = chibiId;
    this.plotUnits[slotIndex] = nextUnit;
    this.stashPlotUnit(prevUnit);
    this.emit();
    return hadPrev ? 'replaced' : 'placed';
  }

  public placeHotbarItemOnPlot(
    hotbarSlot: number,
    plotSlotIndex: number
  ): 'placed' | 'replaced' | 'same' | 'not-miner' | 'invalid' {
    if (!Number.isInteger(hotbarSlot) || hotbarSlot < 0 || hotbarSlot >= 9) return 'invalid';
    if (!Number.isInteger(plotSlotIndex) || plotSlotIndex < 0 || plotSlotIndex >= STAGE_PEDESTAL_COUNT) {
      return 'invalid';
    }
    const itemId = this.hotbar[hotbarSlot];
    if (!itemId) return 'invalid';
    if (!getChibiById(itemId) || (this.miners[itemId] || 0) <= 0) return 'not-miner';
    return this.equipChibiOnPlot(plotSlotIndex, itemId);
  }

  public placeSelectedOnPlot(slotIndex: number): 'placed' | 'inspect' | 'need-select' {
    if (slotIndex < 0 || slotIndex >= STAGE_PEDESTAL_COUNT) return 'need-select';
    const selectedId =
      this.selectedHotbarSlot >= 0 && this.selectedHotbarSlot < 9
        ? this.hotbar[this.selectedHotbarSlot]
        : null;

    if (selectedId && getChibiById(selectedId)) {
      this.equipChibiOnPlot(slotIndex, selectedId);
      return 'placed';
    }

    if (this.plotMiners[slotIndex]) {
      return 'inspect';
    }

    return 'need-select';
  }

  public removeMinerFromPlot(slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= STAGE_PEDESTAL_COUNT) return;
    const prevUnit = this.plotUnits[slotIndex];
    this.plotMiners[slotIndex] = null;
    this.plotUnits[slotIndex] = null;
    this.stashPlotUnit(prevUnit);
    this.emit();
  }

  private static createFreshUnit(chibiId: string): PlotUnitState {
    return {
      chibiId,
      damageLevel: 1,
      speedLevel: 1,
      miningSpeedLevel: 1,
      pickaxeId: '',
      mutationId: 'normal',
      enchantId: null,
    };
  }

  private static isUpgradedUnit(u: PlotUnitState): boolean {
    return (
      u.damageLevel > 1 ||
      u.speedLevel > 1 ||
      u.miningSpeedLevel > 1 ||
      u.mutationId !== 'normal' ||
      u.enchantId !== null
    );
  }

  private getUnitRankScore(u: PlotUnitState): number {
    const chibi = getChibiById(u.chibiId) ?? CHIBI_CATALOG[0];
    const pick = u.pickaxeId ? getPickaxeById(u.pickaxeId) : null;
    const pickMult = pick ? pick.dmgMult : 1;
    const mut = getMutationById(u.mutationId);
    const enc = getEnchantById(u.enchantId);
    const encMult = enc ? enc.dmgMult : 1;
    const lvlScale = Math.pow(1.22, u.damageLevel - 1);
    return chibi.baseDps * lvlScale * pickMult * mut.mult * encMult;
  }

  private stashPlotUnit(unit: PlotUnitState | null): void {
    if (!unit) return;
    if (unit.pickaxeId) {
      this.ownedPickaxes[unit.pickaxeId] = (this.ownedPickaxes[unit.pickaxeId] || 0) + 1;
      unit.pickaxeId = '';
    }
    if (!GameState.isUpgradedUnit(unit)) return;
    const arr = this.stashedUnits[unit.chibiId] ?? [];
    arr.push(unit);
    arr.sort((a, b) => this.getUnitRankScore(b) - this.getUnitRankScore(a));
    this.stashedUnits[unit.chibiId] = arr;
    this.trimStashedUnits(unit.chibiId);
  }

  private popStashedUnit(chibiId: string): PlotUnitState | null {
    const arr = this.stashedUnits[chibiId];
    if (!arr || arr.length === 0) return null;
    const unit = arr.shift() ?? null;
    if (arr.length === 0) delete this.stashedUnits[chibiId];
    return unit;
  }

  private trimStashedUnits(chibiId: string): void {
    const arr = this.stashedUnits[chibiId];
    if (!arr || arr.length === 0) {
      delete this.stashedUnits[chibiId];
      return;
    }
    const owned = this.miners[chibiId] || 0;
    const onPlot = this.plotMiners.filter((id) => id === chibiId).length;
    const maxStash = Math.max(0, owned - onPlot);
    if (maxStash <= 0) {
      delete this.stashedUnits[chibiId];
    } else if (arr.length > maxStash) {
      arr.sort((a, b) => this.getUnitRankScore(b) - this.getUnitRankScore(a));
      this.stashedUnits[chibiId] = arr.slice(0, maxStash);
    }
  }

  public upgradePlotDamage(slotIndex: number): boolean {
    const unit = this.plotUnits[slotIndex];
    const stats = this.getPlotUnitStats(slotIndex);
    if (!unit || !stats || unit.damageLevel >= 100 || this.cash < stats.dmgCost) return false;
    this.cash -= stats.dmgCost;
    unit.damageLevel++;
    this.emit();
    return true;
  }

  public upgradePlotSpeed(slotIndex: number): boolean {
    const unit = this.plotUnits[slotIndex];
    const stats = this.getPlotUnitStats(slotIndex);
    if (!unit || !stats || unit.speedLevel >= 17 || this.cash < stats.speedCost) return false;
    this.cash -= stats.speedCost;
    unit.speedLevel++;
    this.emit();
    return true;
  }

  public upgradePlotMiningSpeed(slotIndex: number): boolean {
    const unit = this.plotUnits[slotIndex];
    const stats = this.getPlotUnitStats(slotIndex);
    if (!unit || !stats || unit.miningSpeedLevel >= 16 || this.cash < stats.miningCost) return false;
    this.cash -= stats.miningCost;
    unit.miningSpeedLevel++;
    this.emit();
    return true;
  }

  public buyOrEquipPickaxe(slotIndex: number, pickaxeId: string): 'equipped' | 'unequipped' | 'locked' {
    const unit = this.plotUnits[slotIndex];
    const pick = PICKAXES.find((p) => p.id === pickaxeId);
    if (!unit || !pick) return 'locked';

    // Unequip current pickaxe and return it to inventory
    if (unit.pickaxeId === pickaxeId) {
      this.ownedPickaxes[pickaxeId] = (this.ownedPickaxes[pickaxeId] || 0) + 1;
      unit.pickaxeId = '';
      this.emit();
      return 'unequipped';
    }

    const owned = this.ownedPickaxes[pickaxeId] || 0;
    if (owned <= 0) return 'locked';

    // Return previous pickaxe if one was equipped on this Chibi
    if (unit.pickaxeId) {
      this.ownedPickaxes[unit.pickaxeId] = (this.ownedPickaxes[unit.pickaxeId] || 0) + 1;
    }
    // Consume 1 pickaxe for this 1 Chibi
    this.ownedPickaxes[pickaxeId] = owned - 1;
    if (this.ownedPickaxes[pickaxeId] <= 0) delete this.ownedPickaxes[pickaxeId];
    unit.pickaxeId = pickaxeId;
    this.emit();
    return 'equipped';
  }

  public rollPlotMutation(slotIndex: number, rng: () => number = Math.random): string | null {
    const unit = this.plotUnits[slotIndex];
    const stats = this.getPlotUnitStats(slotIndex);
    if (!unit || !stats || this.gems < stats.mutationCost) return null;
    this.gems -= stats.mutationCost;
    const mut = rollMutation(rng, this.getMutationLuckMult());
    unit.mutationId = mut.id;
    this.emit();
    return mut.name;
  }

  public togglePlotEnchant(slotIndex: number, enchantId: string): boolean {
    const unit = this.plotUnits[slotIndex];
    const enc = ENCHANTS.find((e) => e.id === enchantId);
    if (!unit || !enc) return false;
    const owned = this.ownedEnchants[enchantId] || 0;
    if (owned <= 0) return false;
    unit.enchantId = unit.enchantId === enchantId ? null : enchantId;
    this.emit();
    return true;
  }

  public isWorldUnlocked(worldId: WorldId): boolean {
    return this.unlockedWorlds.includes(worldId);
  }

  public getResearchLevel(nodeId: string): number {
    const node = getResearchNodeById(nodeId);
    if (!node) return 0;
    return this.researchLevels[node.treeId]?.[node.id] ?? 0;
  }

  public getTreeSpentPoints(treeId: ResearchTreeId): number {
    let sum = 0;
    for (const node of getResearchNodesForTree(treeId)) {
      sum += Math.min(node.maxLevel, this.getResearchLevel(node.id));
    }
    return sum;
  }

  public getTreeMaxPoints(treeId: ResearchTreeId): number {
    return getResearchTreeMaxPoints(treeId);
  }

  public isTreeComplete(treeId: ResearchTreeId): boolean {
    const maxPts = this.getTreeMaxPoints(treeId);
    return maxPts > 0 && this.getTreeSpentPoints(treeId) >= maxPts;
  }

  public isNodePrereqMet(nodeId: string): boolean {
    const node = getResearchNodeById(nodeId);
    if (!node) return false;
    if (node.treeId !== 'core' && !this.isWorldUnlocked(node.treeId)) return false;
    for (const reqId of node.requires) {
      if (this.getResearchLevel(reqId) < 1) return false;
    }
    return true;
  }

  public canUpgradeResearch(nodeId: string): 'ok' | 'locked-world' | 'locked-prereq' | 'maxed' | 'no-cash' {
    const node = getResearchNodeById(nodeId);
    if (!node) return 'locked-prereq';
    if (node.treeId !== 'core' && !this.isWorldUnlocked(node.treeId)) return 'locked-world';
    const lvl = this.getResearchLevel(nodeId);
    if (lvl >= node.maxLevel) return 'maxed';
    if (!this.isNodePrereqMet(nodeId)) return 'locked-prereq';
    const cost = getNodeNextCost(node, lvl);
    if (this.cash < cost) return 'no-cash';
    return 'ok';
  }

  public upgradeResearch(nodeId: string): boolean {
    if (this.canUpgradeResearch(nodeId) !== 'ok') return false;
    const node = getResearchNodeById(nodeId)!;
    const lvl = this.getResearchLevel(nodeId);
    const cost = getNodeNextCost(node, lvl);
    this.cash -= cost;
    this.researchLevels[node.treeId][node.id] = lvl + 1;
    this.emit();
    return true;
  }

  public getAffordableResearchCount(): number {
    let count = 0;
    for (const node of RESEARCH_NODES) {
      if (this.canUpgradeResearch(node.id) === 'ok') count++;
    }
    return count;
  }

  public canUnlockWorld(worldId: WorldId): 'ok' | 'unlocked' | 'locked-prereq' | 'no-cash' {
    if (this.isWorldUnlocked(worldId)) return 'unlocked';
    const idx = getWorldIndex(worldId);
    if (idx <= 0) return 'unlocked';
    const prevWorld = WORLDS[idx - 1];
    if (!this.isWorldUnlocked(prevWorld.id) || !this.isTreeComplete(prevWorld.id)) {
      return 'locked-prereq';
    }
    const target = WORLDS[idx];
    if (this.cash < target.unlockCost) return 'no-cash';
    return 'ok';
  }

  public unlockWorld(worldId: WorldId): boolean {
    if (this.canUnlockWorld(worldId) !== 'ok') return false;
    const def = getWorldById(worldId);
    this.cash -= def.unlockCost;
    if (!this.unlockedWorlds.includes(worldId)) {
      this.unlockedWorlds.push(worldId);
    }
    this.activeWorldId = worldId;
    this.emit();
    return true;
  }

  /** Core research applies everywhere; world research is strictly isolated to activeWorldId. */
  public getActiveResearchBonus(effectType: ResearchEffectType): number {
    let total = 0;
    for (const node of RESEARCH_NODES) {
      if (node.effectType !== effectType) continue;
      if (node.treeId !== 'core' && node.treeId !== this.activeWorldId) continue;
      const lvl = Math.min(node.maxLevel, this.researchLevels[node.treeId]?.[node.id] ?? 0);
      if (lvl > 0) total += node.perLevel * lvl;
    }
    return total;
  }

  public setActiveWorld(worldId: WorldId): boolean {
    if (!this.isWorldUnlocked(worldId)) return false;
    if (this.activeWorldId === worldId) return true;
    this.activeWorldId = worldId;
    this.emit();
    return true;
  }

  public selectHotbarSlot(slot: number): void {
    if (slot < 0 || slot >= 9) return;
    this.selectedHotbarSlot = this.selectedHotbarSlot === slot ? -1 : slot;
    this.emit();
  }

  public swapHotbarSlots(fromIndex: number, toIndex: number): boolean {
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return false;
    if (fromIndex < 0 || fromIndex >= 9 || toIndex < 0 || toIndex >= 9) return false;
    if (fromIndex === toIndex) return false;
    const fromItem = this.hotbar[fromIndex];
    if (!fromItem) return false;

    const toItem = this.hotbar[toIndex];
    this.hotbar[fromIndex] = toItem;
    this.hotbar[toIndex] = fromItem;

    if (this.selectedHotbarSlot === fromIndex) {
      this.selectedHotbarSlot = toIndex;
    } else if (this.selectedHotbarSlot === toIndex) {
      this.selectedHotbarSlot = fromIndex;
    }

    this.emit();
    return true;
  }

  public onOreBroken(variantKey: OreVariantKey, rng: () => number = Math.random): void {
    const baseRolls = variantKey === 'geode' ? 3 : variantKey === 'vein' ? 2 : 1;
    const outputMult = this.getTotalOreDropMult();
    const wholeRolls = Math.floor(baseRolls * outputMult);
    const frac = baseRolls * outputMult - wholeRolls;
    const oreRolls = wholeRolls + (frac > 0 && rng() < frac ? 1 : 0);

    const oreLuck = this.getOreLuckMult();
    const charLuck = this.getCharacterLuckMult();
    const findBonus = this.getFindChanceBonus();

    const capLeft = Math.max(0, this.getMaxChestCapacity() - this.getChestItemCount());
    let added = 0;

    for (let i = 0; i < oreRolls; i++) {
      const ore = rollWorldOre(this.activeWorldId, rng, oreLuck);
      this.discovered.add(ore.id);
      if (added < capLeft) {
        this.chestOres[ore.id] = (this.chestOres[ore.id] || 0) + 1;
        added++;
      }
    }

    // Balanced chance to drop a Miner from Rock / Vein / Geode
    const minerChance = (variantKey === 'geode' ? 0.12 : variantKey === 'vein' ? 0.045 : 0.014) * (1 + findBonus);
    if (rng() < minerChance && added < capLeft) {
      const miner = rollWorldMiner(this.activeWorldId, rng, charLuck);
      if (miner) {
        this.discovered.add(miner.id);
        this.chestMiners[miner.id] = (this.chestMiners[miner.id] || 0) + 1;
        added++;
      }
    }

    if (variantKey === 'geode' || rng() < 0.18 + findBonus * 0.5) {
      const baseGem = variantKey === 'geode' ? 3 : 1;
      const mult = (1 + getGlobalGemGainBonus(this.towerBestFloor)) * this.getWeatherGemDropMult();
      this.gems += Math.max(baseGem, Math.round(baseGem * mult));
    }

    this.emit();
  }

  private addItemToHotbarIfSpace(itemId: string): void {
    if (this.hotbar.includes(itemId)) return;
    const emptyIdx = this.hotbar.indexOf(null);
    if (emptyIdx !== -1) {
      this.hotbar[emptyIdx] = itemId;
    }
  }

  private removeFromHotbar(itemId: string): void {
    for (let i = 0; i < this.hotbar.length; i++) {
      if (this.hotbar[i] === itemId) this.hotbar[i] = null;
    }
  }

  public takeAllFromChest(): number {
    let taken = 0;
    for (const [id, qty] of Object.entries(this.chestMiners)) {
      if (qty <= 0) continue;
      this.miners[id] = (this.miners[id] || 0) + qty;
      this.discovered.add(id);
      this.addItemToHotbarIfSpace(id);
      taken += qty;
    }
    for (const [id, qty] of Object.entries(this.chestOres)) {
      if (qty <= 0) continue;
      this.ores[id] = (this.ores[id] || 0) + qty;
      this.discovered.add(id);
      this.addItemToHotbarIfSpace(id);
      taken += qty;
    }
    this.chestMiners = {};
    this.chestOres = {};
    if (taken > 0) this.emit();
    return taken;
  }

  public isChestFullBonusReady(): boolean {
    const cap = this.getMaxChestCapacity();
    return cap > 0 && this.getChestItemCount() >= Math.floor(cap * 0.95);
  }

  public sellAllChestOres(): { earned: number; bonusApplied: boolean } {
    const bonusApplied = this.isChestFullBonusReady();
    const mult = bonusApplied ? 1.35 : 1;
    let baseTotal = 0;
    let soldAny = false;
    for (const [id, qty] of Object.entries(this.chestOres)) {
      if (qty <= 0) continue;
      const ore = getOreById(id);
      if (ore) {
        baseTotal += this.getEffectiveOreSellValue(ore.id) * qty;
        this.discovered.add(id);
        soldAny = true;
      }
    }
    if (!soldAny) return { earned: 0, bonusApplied: false };
    const earned = Math.round(baseTotal * mult);
    this.chestOres = {};
    this.cash += earned;
    this.emit();
    return { earned, bonusApplied };
  }

  public toggleAutoSell(): number {
    this.autoSell = !this.autoSell;
    let earned = 0;
    if (this.autoSell) {
      for (const [id, qty] of Object.entries(this.chestOres)) {
        if (qty <= 0) continue;
        const ore = getOreById(id);
        if (ore) {
          earned += this.getEffectiveOreSellValue(ore.id) * qty;
          this.discovered.add(id);
        }
      }
      this.chestOres = {};
      this.cash += earned;
    }
    this.emit();
    return earned;
  }

  private toggleHotbarItem(itemId: string): void {
    const existingIdx = this.hotbar.indexOf(itemId);
    if (existingIdx !== -1) {
      this.hotbar[existingIdx] = null;
      this.emit();
      return;
    }

    const emptyIdx = this.hotbar.indexOf(null);
    if (emptyIdx !== -1) {
      this.hotbar[emptyIdx] = itemId;
      this.emit();
    } else if (this.selectedHotbarSlot >= 0 && this.selectedHotbarSlot < 9) {
      this.hotbar[this.selectedHotbarSlot] = itemId;
      this.emit();
    }
  }

  public toggleEquipMiner(chibiId: string): void {
    if ((this.miners[chibiId] || 0) <= 0) return;
    this.toggleHotbarItem(chibiId);
  }

  public toggleEquipOre(oreId: string): void {
    if ((this.ores[oreId] || 0) <= 0) return;
    this.toggleHotbarItem(oreId);
  }

  public equipBestMiners(): void {
    const poolByChibi = new Map<string, PlotUnitState[]>();
    const pushPool = (unit: PlotUnitState | null) => {
      if (!unit) return;
      const list = poolByChibi.get(unit.chibiId) ?? [];
      list.push(unit);
      poolByChibi.set(unit.chibiId, list);
    };

    for (const u of this.plotUnits) pushPool(u);
    for (const arr of Object.values(this.stashedUnits)) {
      if (Array.isArray(arr)) {
        for (const u of arr) pushPool(u);
      }
    }
    this.stashedUnits = {};

    for (const list of poolByChibi.values()) {
      list.sort((a, b) => {
        const diff = this.getUnitRankScore(b) - this.getUnitRankScore(a);
        if (diff !== 0) return diff;
        const lvlB = b.damageLevel + b.speedLevel + b.miningSpeedLevel;
        const lvlA = a.damageLevel + a.speedLevel + a.miningSpeedLevel;
        return lvlB - lvlA;
      });
    }

    const candidates: Array<{ chibiId: string; unit: PlotUnitState; score: number; baseDps: number }> = [];
    for (const [id, qty] of Object.entries(this.miners)) {
      if (qty <= 0) continue;
      const def = getChibiById(id) ?? CHIBI_CATALOG[0];
      const pool = poolByChibi.get(id) ?? [];
      for (let q = 0; q < qty; q++) {
        const unit = pool.shift() ?? GameState.createFreshUnit(def.id);
        candidates.push({
          chibiId: def.id,
          unit,
          score: this.getUnitRankScore(unit),
          baseDps: def.baseDps,
        });
      }
    }

    // Return pickaxes from any orphaned pool entries no longer owned
    for (const leftovers of poolByChibi.values()) {
      for (const u of leftovers) {
        if (u.pickaxeId) {
          this.ownedPickaxes[u.pickaxeId] = (this.ownedPickaxes[u.pickaxeId] || 0) + 1;
          u.pickaxeId = '';
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score || b.baseDps - a.baseDps);

    const nextPlotMiners: (string | null)[] = Array(STAGE_PEDESTAL_COUNT).fill(null);
    const nextPlotUnits: (PlotUnitState | null)[] = Array(STAGE_PEDESTAL_COUNT).fill(null);
    const displacedUnits: PlotUnitState[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      if (i < STAGE_PEDESTAL_COUNT) {
        nextPlotMiners[i] = cand.chibiId;
        nextPlotUnits[i] = cand.unit;
      } else {
        displacedUnits.push(cand.unit);
      }
    }

    this.plotMiners = nextPlotMiners;
    this.plotUnits = nextPlotUnits;
    for (const u of displacedUnits) {
      this.stashPlotUnit(u);
    }
    this.emit();
  }

  private applySellOre(oreId: string, sellAll: boolean): number {
    const qty = this.ores[oreId] || 0;
    if (qty <= 0) return 0;
    const def = getOreById(oreId);
    if (!def) return 0;
    const count = sellAll ? qty : 1;
    const earned = this.getEffectiveOreSellValue(oreId) * count;
    this.ores[oreId] = qty - count;
    if (this.ores[oreId] <= 0) {
      delete this.ores[oreId];
      this.removeFromHotbar(oreId);
    }
    this.cash += earned;
    return earned;
  }

  public sellOre(oreId: string, sellAll = true): number {
    const earned = this.applySellOre(oreId, sellAll);
    if (earned > 0) this.emit();
    return earned;
  }

  public sellAllOres(): number {
    let total = 0;
    for (const [id, qty] of Object.entries(this.ores)) {
      if (qty <= 0) continue;
      const def = getOreById(id);
      if (!def) continue;
      total += this.getEffectiveOreSellValue(id) * qty;
      delete this.ores[id];
      this.removeFromHotbar(id);
    }
    if (total > 0) {
      this.cash += total;
      this.emit();
    }
    return total;
  }

  public getSellableMinerCount(chibiId: string): number {
    const owned = this.miners[chibiId] || 0;
    const onPlot = this.plotMiners.filter((id) => id === chibiId).length;
    return Math.max(0, owned - onPlot);
  }

  private applySellMiner(chibiId: string, sellAll: boolean): number {
    const sellable = this.getSellableMinerCount(chibiId);
    if (sellable <= 0) return 0;
    const count = sellAll ? sellable : 1;
    const earned = getMinerSellValue(chibiId) * count;
    this.miners[chibiId] = Math.max(0, (this.miners[chibiId] || 0) - count);
    if (this.miners[chibiId] <= 0) {
      delete this.miners[chibiId];
      delete this.stashedUnits[chibiId];
      this.removeFromHotbar(chibiId);
    } else {
      this.trimStashedUnits(chibiId);
    }
    this.cash += earned;
    return earned;
  }

  public sellMiner(chibiId: string, sellAll = false): number {
    const earned = this.applySellMiner(chibiId, sellAll);
    if (earned > 0) this.emit();
    return earned;
  }

  public refreshPickaxeStockIfDue(): boolean {
    if (Date.now() < this.pickaxeRestockAt) return false;
    this.pickaxeStock = { ...DEFAULT_PICKAXE_STOCK };
    this.pickaxeRestockAt = Date.now() + PICKAXE_RESTOCK_MS;
    this.emit();
    return true;
  }

  public getPickaxeRestockRemainingSec(): number {
    this.refreshPickaxeStockIfDue();
    return Math.max(0, Math.ceil((this.pickaxeRestockAt - Date.now()) / 1000));
  }

  public buyPickaxe(pickaxeId: string): 'bought' | 'sold_out' | 'no_cash' {
    this.refreshPickaxeStockIfDue();
    const p = getPickaxeById(pickaxeId);
    if (!p || p.id !== pickaxeId) return 'sold_out';
    const stock = this.pickaxeStock[p.id] ?? 0;
    if (stock <= 0) return 'sold_out';
    if (this.cash < p.cost) return 'no_cash';
    this.cash -= p.cost;
    this.pickaxeStock[p.id] = stock - 1;
    this.ownedPickaxes[p.id] = (this.ownedPickaxes[p.id] || 0) + 1;
    this.emit();
    return 'bought';
  }

  private applySellPickaxe(pickaxeId: string, sellAll: boolean): number {
    const owned = this.ownedPickaxes[pickaxeId] || 0;
    if (owned <= 0) return 0;
    const count = sellAll ? owned : 1;
    const earned = getPickaxeSellValue(pickaxeId) * count;
    this.ownedPickaxes[pickaxeId] = owned - count;
    if (this.ownedPickaxes[pickaxeId] <= 0) delete this.ownedPickaxes[pickaxeId];
    this.cash += earned;
    return earned;
  }

  public sellPickaxe(pickaxeId: string, sellAll = false): number {
    const earned = this.applySellPickaxe(pickaxeId, sellAll);
    if (earned > 0) this.emit();
    return earned;
  }

  /** Sells multiple selected `kind:id` entries and notifies listeners once. */
  public sellBatch(keys: readonly string[]): number {
    let totalEarned = 0;
    for (const key of keys) {
      const sep = key.indexOf(':');
      if (sep === -1) continue;
      const kind = key.slice(0, sep);
      const id = key.slice(sep + 1);
      if (kind === 'ore') totalEarned += this.applySellOre(id, true);
      else if (kind === 'miner') totalEarned += this.applySellMiner(id, true);
      else if (kind === 'pickaxe') totalEarned += this.applySellPickaxe(id, true);
    }
    if (totalEarned > 0) this.emit();
    return totalEarned;
  }

  public buyGemShopItem(itemId: string): 'bought' | 'no_gems' {
    const def = getGemShopItemById(itemId);
    if (!def || this.gems < def.gemCost) return 'no_gems';
    this.gems -= def.gemCost;
    this.others[def.id] = (this.others[def.id] || 0) + 1;
    this.emit();
    return 'bought';
  }

  public useGemPotion(itemId: string): boolean {
    const def = getGemShopItemById(itemId);
    const qty = this.others[itemId] || 0;
    if (!def || qty <= 0) return false;
    if (qty <= 1) delete this.others[itemId];
    else this.others[itemId] = qty - 1;
    const now = Date.now();
    const cur = this.activeBoosts[def.id] ?? 0;
    this.activeBoosts[def.id] = Math.max(now, cur) + def.durationSec * 1000;
    this.emit();
    return true;
  }

  public getBoostRemainingSec(itemId: string, now = Date.now()): number {
    const exp = this.activeBoosts[itemId] ?? 0;
    return Math.max(0, Math.ceil((exp - now) / 1000));
  }

  private isBoostActive(itemId: string): boolean {
    return (this.activeBoosts[itemId] ?? 0) > Date.now();
  }

  public getActiveWeather(): WeatherDef {
    return getWeatherById(this.weatherId);
  }

  public getWeatherRemainingSec(now = Date.now()): number {
    return Math.max(0, Math.ceil((this.weatherExpiresAt - now) / 1000));
  }

  public getWeatherDamageMult(): number {
    return this.getActiveWeather().damageMult;
  }

  public getWeatherOreDropMult(): number {
    return this.getActiveWeather().oreDropMult;
  }

  public getWeatherGemDropMult(): number {
    return this.getActiveWeather().gemDropMult;
  }

  public syncWeather(
    now = Date.now(),
    rng: () => number = Math.random,
    emitChanges = true
  ): WeatherDef | null {
    if (now < this.weatherExpiresAt) return null;
    const next = rollWeatherDef(rng);
    this.weatherId = next.id;
    this.weatherExpiresAt = now + WEATHER_DURATION_MS;
    if (emitChanges) {
      this.emit();
    } else {
      this.save();
    }
    return next;
  }

  public forceWeather(weatherId: WeatherId, now = Date.now(), emitChanges = true): WeatherDef {
    const def = getWeatherById(weatherId);
    this.weatherId = def.id;
    this.weatherExpiresAt = now + WEATHER_DURATION_MS;
    if (emitChanges) {
      this.emit();
    } else {
      this.save();
    }
    return def;
  }

  public getTapDamage(): number {
    return Math.max(1, Math.round((20 + this.getActiveResearchBonus('tapDamageFlat')) * this.getWeatherDamageMult()));
  }

  public getMaxChestCapacity(): number {
    return this.chestCapacity + Math.round(this.getActiveResearchBonus('chestCapacityFlat'));
  }

  public getActiveOreNodeCount(): number {
    return Math.min(MAX_PIT_NODE_COUNT, 1 + Math.round(this.getActiveResearchBonus('extraOreNodes')));
  }

  public getOreHpScale(): number {
    const worldDef = getWorldById(this.activeWorldId);
    const fragility = Math.min(0.75, Math.max(0, this.getActiveResearchBonus('oreFragilityPct')));
    const denseStacks = Math.max(0, Math.round(this.getActiveResearchBonus('denseOreScale')));
    const denseHpMult = denseStacks > 0 ? Math.pow(DENSE_ORE_HP_MULT, denseStacks) : 1;
    return Math.max(0.25, worldDef.oreHpMult * (1 - fragility) * denseHpMult);
  }

  public getOreValueMult(): number {
    return 1 + this.getActiveResearchBonus('oreValuePct');
  }

  public getEffectiveOreSellValue(oreId: string): number {
    const def = getOreById(oreId);
    if (!def) return 0;
    return Math.round(def.sellValue * this.getOreValueMult());
  }

  public getOreOutputMult(): number {
    let mult = 1 + this.getActiveResearchBonus('oreOutputPct');
    if (this.isBoostActive('ore-elixir-1')) mult += 0.1;
    if (this.isBoostActive('ore-elixir-2')) mult += 0.25;
    if (this.isBoostActive('ore-elixir-3')) mult += 0.5;
    const denseStacks = Math.max(0, Math.round(this.getActiveResearchBonus('denseOreScale')));
    if (denseStacks > 0) mult *= Math.pow(DENSE_ORE_DROP_MULT, denseStacks);
    return mult;
  }

  public getTotalOreDropMult(): number {
    return this.getOreOutputMult() * this.getWeatherOreDropMult();
  }

  public getRespawnSpeedMult(): number {
    const boost = this.isBoostActive('regrowth-potion') ? 2.0 : 1.0;
    return boost + this.getActiveResearchBonus('respawnSpeedPct');
  }

  public getFindChanceBonus(): number {
    return (this.isBoostActive('unearth-elixir') ? 0.1 : 0) + this.getActiveResearchBonus('findChancePct');
  }

  public getCharacterLuckMult(): number {
    const base = this.isBoostActive('character-luck-potion') ? 1.5 : 1.0;
    return base + this.getActiveResearchBonus('charLuckPct');
  }

  public getOreLuckMult(): number {
    const base = this.isBoostActive('ore-luck-potion') ? 2.0 : 1.0;
    return base + this.getActiveResearchBonus('oreLuckPct');
  }

  public getMutationLuckMult(): number {
    return this.isBoostActive('mutation-luck-1') ? 2.0 : 1.0;
  }

  public buyEnchantDice(amount = 1): boolean {
    const cost = ENCHANT_DICE_GEM_COST * amount;
    if (amount <= 0 || this.gems < cost) return false;
    this.gems -= cost;
    this.enchantDice += amount;
    this.emit();
    return true;
  }

  public rollEnchant(rng: () => number = Math.random): EnchantDef | null {
    if (this.enchantDice <= 0) return null;
    this.enchantDice -= 1;
    const rolled = rollEnchantDef(rng);
    this.ownedEnchants[rolled.id] = (this.ownedEnchants[rolled.id] || 0) + 1;
    this.emit();
    return rolled;
  }

  public syncTowerKeys(now = Date.now()): void {
    if (this.towerKeys >= TOWER_MAX_KEYS) {
      this.towerLastKeyRegenAt = now;
      return;
    }
    const elapsed = Math.max(0, now - this.towerLastKeyRegenAt);
    const gained = Math.floor(elapsed / TOWER_KEY_REGEN_MS);
    if (gained > 0) {
      this.towerKeys = Math.min(TOWER_MAX_KEYS, this.towerKeys + gained);
      this.towerLastKeyRegenAt =
        this.towerKeys >= TOWER_MAX_KEYS ? now : this.towerLastKeyRegenAt + gained * TOWER_KEY_REGEN_MS;
      this.save();
    }
  }

  public getTowerNextKeyRegenSec(now = Date.now()): number {
    this.syncTowerKeys(now);
    if (this.towerKeys >= TOWER_MAX_KEYS) return 0;
    const remMs = Math.max(0, TOWER_KEY_REGEN_MS - (now - this.towerLastKeyRegenAt));
    return Math.ceil(remMs / 1000);
  }

  public getTowerUnitEffectiveDps(slotIndex: number): number {
    const floor = this.towerRun?.floor ?? 1;
    const def = getTowerFloorDef(floor);
    const unit = this.plotUnits[slotIndex];
    const st = this.getPlotUnitStats(slotIndex);
    if (!unit || !st) return 0;
    let unitDps = st.dmg;
    if (def.anomaly.enchantPowerMult !== 1 && unit.enchantId) {
      const enc = getEnchantById(unit.enchantId);
      if (enc && enc.dmgMult > 1) {
        const boosted = 1 + (enc.dmgMult - 1) * def.anomaly.enchantPowerMult;
        unitDps = Math.round((unitDps / enc.dmgMult) * boosted);
      }
    }
    const blessingPct = (this.towerRun?.blessings ?? []).reduce((s, b) => s + (b.dpsBonusPct ?? 0), 0);
    return Math.max(1, Math.round(unitDps * def.anomaly.dpsMult * (1 + blessingPct)));
  }

  public getTowerSlotStrikeDamage(slotIndex: number, attackIntervalSec = 0.85): number {
    const unitDps = this.getTowerUnitEffectiveDps(slotIndex);
    if (unitDps <= 0) return 0;
    return Math.max(1, Math.round(unitDps * Math.max(0.15, attackIntervalSec)));
  }

  public getTowerEffectiveDps(): number {
    let total = 0;
    for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
      total += this.getTowerUnitEffectiveDps(i);
    }
    return total;
  }

  public getTowerEffectiveTapDamage(): number {
    const floor = this.towerRun?.floor ?? 1;
    const def = getTowerFloorDef(floor);
    const blessingPct = (this.towerRun?.blessings ?? []).reduce((s, b) => s + (b.tapBonusPct ?? 0), 0);
    return Math.max(1, Math.round(this.getTapDamage() * def.anomaly.tapMult * (1 + blessingPct)));
  }

  private getTowerExtraTimerSec(): number {
    return (this.towerRun?.blessings ?? []).reduce((s, b) => s + (b.extraTimerSec ?? 0), 0);
  }

  private setupTowerWave(floor: number, wave: number, rng: () => number = Math.random): void {
    if (!this.towerRun) return;
    const floorDef = getTowerFloorDef(floor);
    const waveDef = getTowerWaveDef(floor, wave);
    const maxTime = waveDef.durationSec + this.getTowerExtraTimerSec();
    const waveOres = waveDef.isBoss ? [] : rollTowerWaveOres(floorDef.floor, waveDef.wave, floorDef.anomaly, rng);
    const totalHp = waveDef.isBoss
      ? waveDef.bossHp
      : waveOres.reduce((sum, ore) => sum + ore.hp, 0);

    this.towerRun.floor = floorDef.floor;
    this.towerRun.wave = waveDef.wave;
    this.towerRun.maxWaves = TOWER_WAVES_PER_FLOOR;
    this.towerRun.isBossWave = waveDef.isBoss;
    this.towerRun.waveOres = waveOres;
    this.towerRun.hp = totalHp;
    this.towerRun.maxHp = totalHp;
    this.towerRun.timeLeft = maxTime;
    this.towerRun.maxTime = maxTime;
    this.towerRun.bossInvulLeft = waveDef.isBoss ? TOWER_BOSS_INVUL_SEC : 0;
  }

  public startTowerRun(startFloor = 1, now = Date.now(), rng: () => number = Math.random): boolean {
    this.syncTowerKeys(now);
    if (this.towerKeys <= 0) return false;
    const checkpoints = getTowerCheckpoints(this.towerBestFloor);
    const validStart = checkpoints.includes(startFloor) ? startFloor : 1;
    if (this.towerKeys === TOWER_MAX_KEYS) {
      this.towerLastKeyRegenAt = now;
    }
    this.towerKeys -= 1;
    this.towerStartFloor = validStart;
    this.towerRunNewRecord = false;
    this.towerLastSummary = null;
    this.towerRun = {
      floor: validStart,
      wave: 1,
      maxWaves: TOWER_WAVES_PER_FLOOR,
      isBossWave: false,
      waveOres: [],
      hp: 0,
      maxHp: 0,
      timeLeft: 24,
      maxTime: 24,
      gemsEarned: 0,
      diceEarned: 0,
      floorsCleared: 0,
      wavesCleared: 0,
      blessings: [],
      pendingBlessings: null,
    };
    this.setupTowerWave(validStart, 1, rng);
    this.emit();
    return true;
  }

  private completeCurrentTowerWaveOrFloor(rng: () => number): {
    waveCleared: boolean;
    floorCleared: boolean;
    clearedFloor: number;
    clearedWave: number;
    gemsAwarded: number;
    diceAwarded: number;
    milestoneUnlocked: number | null;
  } {
    const run = this.towerRun!;
    const currentFloor = run.floor;
    const currentWave = run.wave;
    const floorDef = getTowerFloorDef(currentFloor);
    const waveDef = getTowerWaveDef(currentFloor, currentWave);
    const runGemPct = run.blessings.reduce((s, b) => s + (b.gemBonusPct ?? 0), 0);
    const globalGemPct = getGlobalGemGainBonus(Math.max(this.towerBestFloor, currentFloor));
    const gemMult = (1 + runGemPct + globalGemPct) * this.getWeatherGemDropMult();

    run.wavesCleared += 1;

    if (currentWave < TOWER_WAVES_PER_FLOOR) {
      const gemsAwarded = Math.max(1, Math.round(waveDef.waveGemReward * gemMult));
      this.gems += gemsAwarded;
      run.gemsEarned += gemsAwarded;
      this.setupTowerWave(currentFloor, currentWave + 1, rng);
      this.emit();
      return {
        waveCleared: true,
        floorCleared: false,
        clearedFloor: currentFloor,
        clearedWave: currentWave,
        gemsAwarded,
        diceAwarded: 0,
        milestoneUnlocked: null,
      };
    }

    // Wave 10 Boss defeated -> Floor Cleared!
    const gemsAwarded = Math.max(1, Math.round(floorDef.gemReward * gemMult));
    let diceAwarded = floorDef.diceDropChance > 0 && rng() < floorDef.diceDropChance ? 1 : 0;

    this.gems += gemsAwarded;
    run.gemsEarned += gemsAwarded;
    run.floorsCleared += 1;

    if (currentFloor > this.towerBestFloor) {
      this.towerBestFloor = currentFloor;
      this.towerRunNewRecord = true;
    }

    let milestoneUnlocked: number | null = null;
    for (const m of TOWER_MILESTONES) {
      if (this.towerBestFloor >= m.floor && !this.towerClaimedMilestones.includes(m.floor)) {
        this.towerClaimedMilestones.push(m.floor);
        this.gems += m.gemBonus;
        run.gemsEarned += m.gemBonus;
        diceAwarded += m.diceBonus;
        milestoneUnlocked = m.floor;
      }
    }

    if (diceAwarded > 0) {
      this.enchantDice += diceAwarded;
      run.diceEarned += diceAwarded;
    }

    run.hp = 0;
    run.pendingBlessings = pickTowerBlessingChoices(rng);
    run.blessingTimerLeft = TOWER_BLESSING_AUTO_PICK_SEC;
    this.emit();
    return {
      waveCleared: true,
      floorCleared: true,
      clearedFloor: currentFloor,
      clearedWave: currentWave,
      gemsAwarded,
      diceAwarded,
      milestoneUnlocked,
    };
  }

  private finishTowerRun(reason: 'timeout' | 'exit'): TowerRunSummary | null {
    if (!this.towerRun) return null;
    const run = this.towerRun;
    const summary: TowerRunSummary = {
      startFloor: this.towerStartFloor,
      highestReached: run.floor,
      highestWave: run.wave,
      floorsCleared: run.floorsCleared,
      wavesCleared: run.wavesCleared,
      gemsEarned: run.gemsEarned,
      diceEarned: run.diceEarned,
      newRecord: this.towerRunNewRecord,
      reason,
    };
    this.towerRun = null;
    this.towerRunNewRecord = false;
    this.towerLastSummary = summary;
    this.emit();
    return summary;
  }

  public stepTowerTick(
    dtSec: number,
    rng: () => number = Math.random
  ): {
    status: 'idle' | 'paused' | 'active' | 'timeout' | 'blessing-auto-picked';
    summary?: TowerRunSummary | null;
    autoPickedBlessing?: TowerBlessingDef;
  } {
    if (!this.towerRun) return { status: 'idle' };
    if (this.towerRun.pendingBlessings) {
      const prevLeft = this.towerRun.blessingTimerLeft ?? TOWER_BLESSING_AUTO_PICK_SEC;
      const nextLeft = Math.max(0, prevLeft - dtSec);
      this.towerRun.blessingTimerLeft = nextLeft;
      if (nextLeft <= 0 && this.towerRun.pendingBlessings.length > 0) {
        const choices = this.towerRun.pendingBlessings;
        const randIdx = Math.min(choices.length - 1, Math.max(0, Math.floor(rng() * choices.length)));
        const picked = choices[randIdx];
        this.chooseTowerBlessing(picked.id, rng);
        return { status: 'blessing-auto-picked', autoPickedBlessing: picked };
      }
      return { status: 'paused' };
    }

    if ((this.towerRun.bossInvulLeft ?? 0) > 0) {
      this.towerRun.bossInvulLeft = Math.max(0, (this.towerRun.bossInvulLeft ?? 0) - dtSec);
      return { status: 'active' };
    }

    // Only advance the wave countdown timer; HP drops exclusively from real chibi strikes or player taps.
    this.towerRun.timeLeft = Math.max(0, this.towerRun.timeLeft - dtSec);
    if (this.towerRun.timeLeft <= 0) {
      const summary = this.finishTowerRun('timeout');
      return { status: 'timeout', summary };
    }
    return { status: 'active' };
  }

  public applyTowerTargetDamage(
    targetOreIndex: number | null,
    rawDmg: number,
    rng: () => number = Math.random
  ): {
    dmgDealt: number;
    rockBroken: boolean;
    targetOreIndex: number | null;
    waveCleared: boolean;
    floorCleared: boolean;
    clearedFloor: number | null;
    clearedWave: number | null;
    gemsAwarded: number;
    diceAwarded: number;
    milestoneUnlocked: number | null;
  } {
    const emptyRes = {
      dmgDealt: 0,
      rockBroken: false,
      targetOreIndex: null,
      waveCleared: false,
      floorCleared: false,
      clearedFloor: null,
      clearedWave: null,
      gemsAwarded: 0,
      diceAwarded: 0,
      milestoneUnlocked: null,
    };
    const run = this.towerRun;
    if (!run || run.pendingBlessings || rawDmg <= 0) return emptyRes;

    const dmg = Math.max(1, Math.round(rawDmg));
    if (run.isBossWave) {
      if ((run.bossInvulLeft ?? 0) > 0) {
        return emptyRes;
      }
      const dmgDealt = Math.min(run.hp, dmg);
      run.hp = Math.max(0, run.hp - dmgDealt);
      if (run.hp <= 0) {
        const res = this.completeCurrentTowerWaveOrFloor(rng);
        return {
          dmgDealt,
          rockBroken: true,
          targetOreIndex: null,
          ...res,
        };
      }
      this.emit();
      return {
        ...emptyRes,
        dmgDealt,
      };
    }

    const target =
      (targetOreIndex !== null
        ? run.waveOres.find((o) => o.index === targetOreIndex && o.alive)
        : undefined) ?? run.waveOres.find((o) => o.alive);
    if (!target) {
      const res = this.completeCurrentTowerWaveOrFloor(rng);
      return {
        dmgDealt: 0,
        rockBroken: false,
        targetOreIndex: null,
        ...res,
      };
    }

    const dmgDealt = Math.min(target.hp, dmg);
    target.hp = Math.max(0, target.hp - dmgDealt);
    const rockBroken = target.hp <= 0;
    if (rockBroken) {
      target.alive = false;
    }
    run.hp = run.waveOres.reduce((sum, o) => sum + (o.alive ? o.hp : 0), 0);

    const allBroken = run.waveOres.every((o) => !o.alive);
    if (allBroken) {
      const res = this.completeCurrentTowerWaveOrFloor(rng);
      return {
        dmgDealt,
        rockBroken,
        targetOreIndex: target.index,
        ...res,
      };
    }

    this.emit();
    return {
      ...emptyRes,
      dmgDealt,
      rockBroken,
      targetOreIndex: target.index,
    };
  }

  public applyTowerChibiStrike(
    slotIndex: number,
    targetOreIndex: number | null,
    attackIntervalSec = 0.85,
    rng: () => number = Math.random
  ) {
    const strikeDmg = this.getTowerSlotStrikeDamage(slotIndex, attackIntervalSec);
    return this.applyTowerTargetDamage(targetOreIndex, strikeDmg, rng);
  }

  public tapTowerTarget(targetOreIndex: number | null = null, rng: () => number = Math.random) {
    const dmg = this.getTowerEffectiveTapDamage();
    return this.applyTowerTargetDamage(targetOreIndex, dmg, rng);
  }

  public tapTowerMonolith(rng: () => number = Math.random): {
    dmg: number;
    cleared: boolean;
    waveCleared: boolean;
    gemsAwarded: number;
    diceAwarded: number;
    milestoneUnlocked: number | null;
  } {
    const res = this.tapTowerTarget(null, rng);
    return {
      dmg: res.dmgDealt,
      cleared: res.floorCleared,
      waveCleared: res.waveCleared,
      gemsAwarded: res.gemsAwarded,
      diceAwarded: res.diceAwarded,
      milestoneUnlocked: res.milestoneUnlocked,
    };
  }

  public chooseTowerBlessing(blessingId: string, rng: () => number = Math.random): boolean {
    if (!this.towerRun || !this.towerRun.pendingBlessings) return false;
    const picked = this.towerRun.pendingBlessings.find((b) => b.id === blessingId) ?? this.towerRun.pendingBlessings[0];
    if (!picked) return false;
    this.towerRun.blessings.push(picked);
    this.towerRun.pendingBlessings = null;
    this.towerRun.blessingTimerLeft = 0;
    this.setupTowerWave(this.towerRun.floor + 1, 1, rng);
    this.emit();
    return true;
  }

  public abandonTowerRun(): TowerRunSummary | null {
    return this.finishTowerRun('exit');
  }

  public quickSweepTower(now = Date.now()): { ok: boolean; gemsAwarded: number } {
    this.syncTowerKeys(now);
    if (this.towerBestFloor < 1 || this.towerKeys <= 0) {
      return { ok: false, gemsAwarded: 0 };
    }
    if (this.towerKeys === TOWER_MAX_KEYS) {
      this.towerLastKeyRegenAt = now;
    }
    this.towerKeys -= 1;
    const baseGems = getTowerSweepGemReward(this.towerBestFloor);
    const gemsAwarded = Math.max(1, Math.round(baseGems * (1 + getGlobalGemGainBonus(this.towerBestFloor))));
    this.gems += gemsAwarded;
    this.emit();
    return { ok: true, gemsAwarded };
  }

  public buyTowerKeyWithCash(): 'bought' | 'full' | 'no_cash' {
    this.syncTowerKeys();
    if (this.towerKeys >= TOWER_MAX_KEYS) return 'full';
    const cost = getTowerKeyCashCost(this.towerBestFloor);
    if (this.cash < cost) return 'no_cash';
    this.cash -= cost;
    this.towerKeys += 1;
    this.emit();
    return 'bought';
  }

  private save(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const payload: SavePayload = {
        cash: this.cash,
        gems: this.gems,
        activeWorldId: this.activeWorldId,
        miners: this.miners,
        ores: this.ores,
        others: this.others,
        hotbar: this.hotbar,
        plotMiners: this.plotMiners,
        plotUnits: this.plotUnits,
        stashedUnits: this.stashedUnits,
        ownedPickaxes: this.ownedPickaxes,
        ownedEnchants: this.ownedEnchants,
        enchantDice: this.enchantDice,
        selectedHotbarSlot: this.selectedHotbarSlot,
        chestMiners: this.chestMiners,
        chestOres: this.chestOres,
        chestCapacity: this.chestCapacity,
        autoSell: this.autoSell,
        discovered: Array.from(this.discovered),
        activeBoosts: this.activeBoosts,
        unlockedWorlds: this.unlockedWorlds,
        researchLevels: this.researchLevels,
        tower: {
          bestFloor: this.towerBestFloor,
          keys: this.towerKeys,
          lastKeyRegenAt: this.towerLastKeyRegenAt,
          claimedMilestones: this.towerClaimedMilestones,
        },
        weather: {
          id: this.weatherId,
          expiresAt: this.weatherExpiresAt,
        },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<SavePayload>;
      if (typeof data.cash === 'number') this.cash = data.cash;
      if (typeof data.gems === 'number') this.gems = data.gems;
      if (Array.isArray(data.unlockedWorlds) && data.unlockedWorlds.length > 0) {
        const valid = data.unlockedWorlds.filter((w): w is WorldId => WORLDS.some((def) => def.id === w));
        this.unlockedWorlds = valid.includes('underground') ? valid : ['underground', ...valid];
      }
      if (data.researchLevels && typeof data.researchLevels === 'object') {
        const next = createEmptyResearchLevels();
        for (const treeId of Object.keys(next) as ResearchTreeId[]) {
          const src = data.researchLevels[treeId];
          if (src && typeof src === 'object') {
            next[treeId] = { ...src };
          }
        }
        this.researchLevels = next;
      }
      if (data.activeWorldId && this.unlockedWorlds.includes(data.activeWorldId)) {
        this.activeWorldId = data.activeWorldId;
      } else {
        this.activeWorldId = 'underground';
      }
      if (data.miners) this.miners = data.miners;
      if (data.ores) {
        const nextOres: Record<string, number> = {};
        for (const [rawId, count] of Object.entries(data.ores)) {
          if (typeof count !== 'number' || count <= 0) continue;
          const mapped = migrateOreId(rawId);
          if (getOreById(mapped)) {
            nextOres[mapped] = (nextOres[mapped] || 0) + count;
          }
        }
        this.ores = nextOres;
      }
      if (data.others) {
        this.others = { ...data.others };
        for (const legacyId of [
          'summon-scroll',
          'gems-pouch',
          'quaking-potion',
          'glacial-potion',
          'blazing-potion',
          'diamondbound-charm',
        ]) {
          delete this.others[legacyId];
        }
      }
      if (Array.isArray(data.hotbar) && data.hotbar.length === 9) {
        this.hotbar = data.hotbar.map((slot) => (slot ? migrateOreId(slot) : null));
      }
      if (data.ownedPickaxes) this.ownedPickaxes = data.ownedPickaxes;
      if (Array.isArray(data.plotMiners)) {
        this.plotMiners = Array.from({ length: STAGE_PEDESTAL_COUNT }, (_, i) => data.plotMiners?.[i] ?? null);
      }
      if (Array.isArray(data.plotUnits)) {
        for (let i = STAGE_PEDESTAL_COUNT; i < data.plotUnits.length; i++) {
          const trimmed = data.plotUnits[i];
          if (trimmed?.pickaxeId) {
            this.ownedPickaxes[trimmed.pickaxeId] = (this.ownedPickaxes[trimmed.pickaxeId] || 0) + 1;
          }
        }
        this.plotUnits = Array.from({ length: STAGE_PEDESTAL_COUNT }, (_, i) => data.plotUnits?.[i] ?? null);
      }
      if (data.stashedUnits && typeof data.stashedUnits === 'object') {
        const nextStash: Record<string, PlotUnitState[]> = {};
        for (const [cid, arr] of Object.entries(data.stashedUnits)) {
          if (Array.isArray(arr) && arr.length > 0 && (this.miners[cid] || 0) > 0) {
            nextStash[cid] = arr.map((u) => ({ ...u, pickaxeId: '' }));
          }
        }
        this.stashedUnits = nextStash;
      }
      if (data.ownedEnchants) this.ownedEnchants = data.ownedEnchants;
      if (typeof data.enchantDice === 'number') this.enchantDice = data.enchantDice;
      if (typeof data.selectedHotbarSlot === 'number') this.selectedHotbarSlot = data.selectedHotbarSlot;
      if (data.chestMiners) this.chestMiners = data.chestMiners;
      if (data.chestOres) {
        const nextChestOres: Record<string, number> = {};
        for (const [rawId, count] of Object.entries(data.chestOres)) {
          if (typeof count !== 'number' || count <= 0) continue;
          const mapped = migrateOreId(rawId);
          if (getOreById(mapped)) {
            nextChestOres[mapped] = (nextChestOres[mapped] || 0) + count;
          }
        }
        this.chestOres = nextChestOres;
      }
      if (typeof data.chestCapacity === 'number') this.chestCapacity = data.chestCapacity;
      if (typeof data.autoSell === 'boolean') this.autoSell = data.autoSell;
      if (Array.isArray(data.discovered)) {
        const cleaned = new Set<string>();
        for (const rawId of data.discovered) {
          const mapped = migrateOreId(rawId);
          if (isValidIndexId(mapped)) cleaned.add(mapped);
        }
        this.discovered = cleaned;
      }
      // Keep discovered synchronized with all currently owned valid index items
      for (const id of Object.keys(this.ores)) {
        if ((this.ores[id] || 0) > 0 && isValidIndexId(id)) this.discovered.add(id);
      }
      for (const id of Object.keys(this.chestOres)) {
        if ((this.chestOres[id] || 0) > 0 && isValidIndexId(id)) this.discovered.add(id);
      }
      for (const id of Object.keys(this.miners)) {
        if ((this.miners[id] || 0) > 0 && isValidIndexId(id)) this.discovered.add(id);
      }
      for (const id of Object.keys(this.chestMiners)) {
        if ((this.chestMiners[id] || 0) > 0 && isValidIndexId(id)) this.discovered.add(id);
      }
      for (const slotId of [...this.hotbar, ...this.plotMiners]) {
        if (slotId && isValidIndexId(slotId)) this.discovered.add(slotId);
      }
      if (data.activeBoosts) this.activeBoosts = data.activeBoosts;
      if (data.tower && typeof data.tower === 'object') {
        if (typeof data.tower.bestFloor === 'number') this.towerBestFloor = Math.max(0, Math.floor(data.tower.bestFloor));
        if (typeof data.tower.keys === 'number') {
          this.towerKeys = Math.max(0, Math.min(TOWER_MAX_KEYS, Math.floor(data.tower.keys)));
        }
        if (typeof data.tower.lastKeyRegenAt === 'number') {
          this.towerLastKeyRegenAt = data.tower.lastKeyRegenAt;
        }
        if (Array.isArray(data.tower.claimedMilestones)) {
          this.towerClaimedMilestones = data.tower.claimedMilestones.filter((v): v is number => typeof v === 'number');
        }
      }
      if (data.weather && typeof data.weather === 'object') {
        if (isValidWeatherId(data.weather.id)) {
          this.weatherId = data.weather.id;
        }
        if (typeof data.weather.expiresAt === 'number' && Number.isFinite(data.weather.expiresAt)) {
          this.weatherExpiresAt = data.weather.expiresAt;
        }
      }
    } catch {
      // Ignore corrupt saves
    }
  }
}
