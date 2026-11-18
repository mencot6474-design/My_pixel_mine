import { MAX_PIT_NODE_COUNT, OreVariantKey, STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import {
  DEFAULT_PICKAXE_STOCK,
  ENCHANT_DICE_GEM_COST,
  EnchantDef,
  getMinersByWorld,
  getOreById,
  getOresByWorld,
  getWorldById,
  getWorldIndex,
  ItemRarity,
  ORES,
  PICKAXE_RESTOCK_MS,
  rollEnchantDef,
  WORLD_MINERS,
  WorldId,
  WorldResonanceStatus,
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
  getRelicById,
  MAX_EQUIPPED_RELICS,
  RelicEffectStat,
} from './RelicData';
import {
  TOWER_MAX_KEYS,
  TowerRunState,
  TowerRunSummary,
} from './TowerData';
import {
  rollWeatherDef,
  WEATHER_DURATION_MS,
  WeatherDef,
  WeatherId,
} from './WeatherData';
import {
  createEmptyResearchLevels,
  loadFromLocalStorage,
  PlotUnitState,
  ResearchLevelsMap,
  SavePayload,
  saveToLocalStorage,
} from './GameStateSave';
import {
  clearHotbarSelectionDomain,
  getChestItemCountDomain,
  isChestFullBonusReadyDomain,
  isOreLockedDomain,
  onMeteorBrokenDomain,
  onOreBrokenDomain,
  removeFromHotbarDomain,
  selectHotbarSlotDomain,
  sellAllChestOresDomain,
  shouldAutoSellOreDomain,
  swapHotbarSlotsDomain,
  takeAllFromChestDomain,
  toggleAutoSellDomain,
  toggleAutoSellRarityDomain,
  toggleHotbarItemDomain,
  toggleOreLockDomain,
} from './LootChestDomain';
import {
  applyTowerTargetDamageDomain,
  buyTowerKeyWithGemsDomain,
  chooseTowerBlessingDomain,
  finishTowerRunDomain,
  getTowerEffectiveDpsDomain,
  getTowerEffectiveTapDamageDomain,
  getTowerNextKeyRegenSecDomain,
  getTowerSlotStrikeDamageDomain,
  getTowerUnitEffectiveDpsDomain,
  grantFreeTowerKeyDomain,
  quickSweepTowerDomain,
  startTowerRunDomain,
  stepTowerTickDomain,
  syncTowerKeysDomain,
  TowerRunMeta,
} from './TowerRunDomain';
import {
  autoStarUpAllUnits,
  buyOrEquipUnitPickaxe,
  canStarUpUnit,
  computeDpsBreakdown,
  computePlotUnitStats,
  computeTotalPlotDps,
  createFreshPlotUnit,
  equipBestUnitsToPlots,
  getActiveStarAndResonanceBonuses,
  getActiveWorldResonancesList,
  getAvailableEnchantUnitsCount,
  getChibiStarCount,
  getChibiUpgradeCostMult,
  getSpareChibiDuplicateCount,
  getWorldResonanceDmgPct,
  placeHotbarItemOnPlotSlot,
  placeSelectedOnPlotSlot,
  removeMinerFromPlotSlot,
  rollUnitMutation,
  starUpUnit,
  toggleUnitEnchant,
  upgradeUnitDamage,
  upgradeUnitMiningSpeed,
  upgradeUnitSpeed,
} from './PlotUnitsDomain';
import {
  buyGemShopItemDomain,
  buyPickaxeDomain,
  forceWeatherDomain,
  getActiveWeatherDomain,
  getBoostRemainingSecDomain,
  getPickaxeRestockRemainingSecDomain,
  getSellableMinerCountDomain,
  getWeatherDamageMultDomain,
  getWeatherGemDropMultDomain,
  getWeatherOreDropMultDomain,
  getWeatherRemainingSecDomain,
  isBoostActiveDomain,
  refreshPickaxeStockIfDueDomain,
  sellAllOresDomain,
  sellBatchDomain,
  sellMinerDomain,
  sellOreDomain,
  sellPickaxeDomain,
  syncWeatherDomain,
  useGemPotionDomain,
} from './ShopWeatherDomain';

export type { PlotUnitState, ResearchLevelsMap, SavePayload };
export { getChibiUpgradeCostMult };

export type StateListener = (state: GameState) => void;

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
  public plotMiners: (string | null)[] = ['astral-recruit', ...Array(STAGE_PEDESTAL_COUNT - 1).fill(null)];
  public plotUnits: (PlotUnitState | null)[] = [
    createFreshPlotUnit('astral-recruit'),
    ...Array(STAGE_PEDESTAL_COUNT - 1).fill(null),
  ];
  public stashedUnits: Record<string, PlotUnitState[]> = {};
  public chibiStars: Record<string, number> = {};
  public craftedRelics = new Set<string>();
  public equippedRelics: string[] = [];
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
  public autoSellRarities = new Set<ItemRarity>();
  public lockedOreIds = new Set<string>();
  public autoMeteor = true;
  public discovered = new Set<string>(['astral-recruit']);
  public activeBoosts: Record<string, number> = {};
  public towerBestFloor = 0;
  public towerKeys = TOWER_MAX_KEYS;
  public towerLastKeyRegenAt = Date.now();
  public towerClaimedMilestones: number[] = [];
  public towerRun: TowerRunState | null = null;
  public towerLastSummary: TowerRunSummary | null = null;
  public readonly towerRunMeta: TowerRunMeta = { startFloor: 1, newRecord: false };
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
    return getChestItemCountDomain(this);
  }

  public getEquippedPlotMinerIds(): (string | null)[] {
    return this.plotMiners;
  }

  public getPlotUnit(slotIndex: number): PlotUnitState | null {
    return this.plotUnits[slotIndex] ?? null;
  }

  public getPlotUnitStats(slotIndex: number) {
    return computePlotUnitStats(this, slotIndex);
  }

  public getTotalPlotDps(): number {
    return computeTotalPlotDps(this);
  }

  public getDpsBreakdown() {
    return computeDpsBreakdown(this);
  }

  public getChibiStar(chibiId: string): number {
    return getChibiStarCount(this, chibiId);
  }

  public getSpareChibiDuplicates(chibiId: string): number {
    return getSpareChibiDuplicateCount(this, chibiId);
  }

  public canStarUpChibi(chibiId: string): boolean {
    return canStarUpUnit(this, chibiId);
  }

  public starUpChibi(chibiId: string) {
    return starUpUnit(this, chibiId, () => this.emit());
  }

  public autoStarUpAll(): number {
    return autoStarUpAllUnits(this, () => this.emit());
  }

  public getActiveWorldResonances(): WorldResonanceStatus[] {
    return getActiveWorldResonancesList(this);
  }

  public getWorldResonanceDmgBonusPct(worldId: WorldId | null): number {
    return getWorldResonanceDmgPct(this, worldId);
  }

  public getActiveStarDropAndGemBonus(): { oreDropBonusPct: number; gemBonusPct: number } {
    return getActiveStarAndResonanceBonuses(this);
  }

  public placeHotbarItemOnPlot(hotbarSlot: number, plotSlotIndex: number) {
    return placeHotbarItemOnPlotSlot(this, hotbarSlot, plotSlotIndex, () => this.emit());
  }

  public placeSelectedOnPlot(slotIndex: number) {
    return placeSelectedOnPlotSlot(this, slotIndex, () => this.emit());
  }

  public removeMinerFromPlot(slotIndex: number): void {
    removeMinerFromPlotSlot(this, slotIndex, () => this.emit());
  }

  public upgradePlotDamage(slotIndex: number): boolean {
    return upgradeUnitDamage(this, slotIndex, () => this.emit());
  }

  public upgradePlotSpeed(slotIndex: number): boolean {
    return upgradeUnitSpeed(this, slotIndex, () => this.emit());
  }

  public upgradePlotMiningSpeed(slotIndex: number): boolean {
    return upgradeUnitMiningSpeed(this, slotIndex, () => this.emit());
  }

  public buyOrEquipPickaxe(slotIndex: number, pickaxeId: string) {
    return buyOrEquipUnitPickaxe(this, slotIndex, pickaxeId, () => this.emit());
  }

  public rollPlotMutation(slotIndex: number, rng: () => number = Math.random): string | null {
    return rollUnitMutation(this, slotIndex, rng, () => this.emit());
  }

  public getAvailableEnchantCount(enchantId: string): number {
    return getAvailableEnchantUnitsCount(this, enchantId);
  }

  public togglePlotEnchant(slotIndex: number, enchantId: string): boolean {
    return toggleUnitEnchant(this, slotIndex, enchantId, () => this.emit());
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
    selectHotbarSlotDomain(this, slot, () => this.emit());
  }

  public clearHotbarSelection(): void {
    clearHotbarSelectionDomain(this, () => this.emit());
  }

  public swapHotbarSlots(fromIndex: number, toIndex: number): boolean {
    return swapHotbarSlotsDomain(this, fromIndex, toIndex, () => this.emit());
  }

  public onOreBroken(variantKey: OreVariantKey, rng: () => number = Math.random): void {
    onOreBrokenDomain(this, variantKey, rng, () => this.emit());
  }

  public onMeteorBroken(weatherId: WeatherId, rng: () => number = Math.random) {
    return onMeteorBrokenDomain(this, weatherId, rng, () => this.emit());
  }

  public takeAllFromChest(): number {
    return takeAllFromChestDomain(this, () => this.emit());
  }

  public isChestFullBonusReady(): boolean {
    return isChestFullBonusReadyDomain(this);
  }

  public isOreLocked(oreId: string): boolean {
    return isOreLockedDomain(this, oreId);
  }

  public toggleOreLock(oreId: string): boolean {
    return toggleOreLockDomain(this, oreId, () => this.emit());
  }

  public isAutoSellRarity(rarity: ItemRarity): boolean {
    return this.autoSellRarities.has(rarity);
  }

  public shouldAutoSellOre(oreId: string): boolean {
    return shouldAutoSellOreDomain(this, oreId);
  }

  public toggleAutoSellRarity(rarity: ItemRarity): { active: boolean; earned: number } {
    return toggleAutoSellRarityDomain(this, rarity, () => this.emit());
  }

  public sellAllChestOres(): { earned: number; bonusApplied: boolean } {
    return sellAllChestOresDomain(this, () => this.emit());
  }

  public toggleAutoMeteor(): boolean {
    this.autoMeteor = !this.autoMeteor;
    this.emit();
    return this.autoMeteor;
  }

  public toggleAutoSell(): number {
    return toggleAutoSellDomain(this, () => this.emit());
  }

  public toggleEquipMiner(chibiId: string): void {
    if ((this.miners[chibiId] || 0) <= 0) return;
    toggleHotbarItemDomain(this, chibiId, () => this.emit());
  }

  public toggleEquipOre(oreId: string): void {
    if ((this.ores[oreId] || 0) <= 0) return;
    toggleHotbarItemDomain(this, oreId, () => this.emit());
  }

  public equipBestMiners(): void {
    equipBestUnitsToPlots(this, () => this.emit());
  }

  public sellOre(oreId: string, sellAll = true): number {
    return sellOreDomain(this, oreId, sellAll, () => this.emit());
  }

  public sellAllOres(): number {
    return sellAllOresDomain(this, () => this.emit());
  }

  public getSellableMinerCount(chibiId: string): number {
    return getSellableMinerCountDomain(this, chibiId);
  }

  public sellMiner(chibiId: string, sellAll = false): number {
    return sellMinerDomain(this, chibiId, sellAll, () => this.emit());
  }

  public refreshPickaxeStockIfDue(): boolean {
    return refreshPickaxeStockIfDueDomain(this, Date.now(), () => this.emit());
  }

  public getPickaxeRestockRemainingSec(): number {
    return getPickaxeRestockRemainingSecDomain(this, Date.now(), () => this.emit());
  }

  public buyPickaxe(pickaxeId: string): 'bought' | 'sold_out' | 'no_cash' {
    return buyPickaxeDomain(this, pickaxeId, Date.now(), () => this.emit());
  }

  public sellPickaxe(pickaxeId: string, sellAll = false): number {
    return sellPickaxeDomain(this, pickaxeId, sellAll, () => this.emit());
  }

  /** Sells multiple selected `kind:id` entries and notifies listeners once. */
  public sellBatch(keys: readonly string[]): number {
    return sellBatchDomain(this, keys, () => this.emit());
  }

  public buyGemShopItem(itemId: string): 'bought' | 'no_gems' {
    return buyGemShopItemDomain(this, itemId, () => this.emit());
  }

  public useGemPotion(itemId: string): boolean {
    return useGemPotionDomain(this, itemId, Date.now(), () => this.emit());
  }

  public getBoostRemainingSec(itemId: string, now = Date.now()): number {
    return getBoostRemainingSecDomain(this, itemId, now);
  }

  public getActiveWeather(): WeatherDef {
    return getActiveWeatherDomain(this);
  }

  public getWeatherRemainingSec(now = Date.now()): number {
    return getWeatherRemainingSecDomain(this, now);
  }

  public getWeatherDamageMult(): number {
    return getWeatherDamageMultDomain(this);
  }

  public getWeatherOreDropMult(): number {
    return getWeatherOreDropMultDomain(this);
  }

  public getWeatherGemDropMult(): number {
    return getWeatherGemDropMultDomain(this);
  }

  public syncWeather(
    now = Date.now(),
    rng: () => number = Math.random,
    emitChanges = true
  ): WeatherDef | null {
    return syncWeatherDomain(this, now, rng, emitChanges, {
      emit: () => this.emit(),
      save: () => this.save(),
    });
  }

  public forceWeather(weatherId: WeatherId, now = Date.now(), emitChanges = true): WeatherDef {
    return forceWeatherDomain(this, weatherId, now, emitChanges, {
      emit: () => this.emit(),
      save: () => this.save(),
    });
  }

  public getTapDamage(): number {
    const tapMult = 1 + this.getRelicBonus('tapDmgPct');
    return Math.max(
      1,
      Math.round((20 + this.getActiveResearchBonus('tapDamageFlat')) * tapMult * this.getWeatherDamageMult())
    );
  }

  public getMaxChestCapacity(): number {
    return (
      this.chestCapacity +
      Math.round(this.getActiveResearchBonus('chestCapacityFlat') + this.getRelicBonus('chestCapacityFlat'))
    );
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
    return 1 + this.getActiveResearchBonus('oreValuePct') + this.getRelicBonus('oreValuePct');
  }

  public getEffectiveOreSellValue(oreId: string): number {
    const def = getOreById(oreId);
    if (!def) return 0;
    return Math.round(def.sellValue * this.getOreValueMult());
  }

  public getOreOutputMult(): number {
    const { oreDropBonusPct } = this.getActiveStarDropAndGemBonus();
    let mult = 1 + this.getActiveResearchBonus('oreOutputPct') + oreDropBonusPct + this.getRelicBonus('oreDropPct');
    if (isBoostActiveDomain(this, 'ore-elixir-1')) mult += 0.1;
    if (isBoostActiveDomain(this, 'ore-elixir-2')) mult += 0.25;
    if (isBoostActiveDomain(this, 'ore-elixir-3')) mult += 0.5;
    const denseStacks = Math.max(0, Math.round(this.getActiveResearchBonus('denseOreScale')));
    if (denseStacks > 0) mult *= Math.pow(DENSE_ORE_DROP_MULT, denseStacks);
    return mult;
  }

  public getTotalOreDropMult(): number {
    return this.getOreOutputMult() * this.getWeatherOreDropMult();
  }

  public getRespawnSpeedMult(): number {
    const boost = isBoostActiveDomain(this, 'regrowth-potion') ? 2.0 : 1.0;
    return boost + this.getActiveResearchBonus('respawnSpeedPct');
  }

  public getFindChanceBonus(): number {
    return (isBoostActiveDomain(this, 'unearth-elixir') ? 0.1 : 0) + this.getActiveResearchBonus('findChancePct');
  }

  public getCharacterLuckMult(): number {
    const base = isBoostActiveDomain(this, 'character-luck-potion') ? 1.5 : 1.0;
    return base + this.getActiveResearchBonus('charLuckPct');
  }

  public getOreLuckMult(): number {
    const base = isBoostActiveDomain(this, 'ore-luck-potion') ? 2.0 : 1.0;
    return base + this.getActiveResearchBonus('oreLuckPct') + this.getRelicBonus('oreLuckPct');
  }

  public getMutationLuckMult(): number {
    const base = isBoostActiveDomain(this, 'mutation-luck-1') ? 2.0 : 1.0;
    return base + this.getRelicBonus('mutationLuckPct');
  }

  // === RELIC FORGE ===
  public hasCraftedRelic(relicId: string): boolean {
    return this.craftedRelics.has(relicId);
  }

  public isRelicEquipped(relicId: string): boolean {
    return this.equippedRelics.includes(relicId);
  }

  public getTotalOwnedOreCount(oreId: string): number {
    return (this.ores[oreId] || 0) + (this.chestOres[oreId] || 0);
  }

  public canCraftRelic(relicId: string): boolean {
    const def = getRelicById(relicId);
    if (!def || this.craftedRelics.has(relicId)) return false;
    if (this.gems < def.gemCost) return false;
    for (const ing of def.ingredients) {
      if (this.getTotalOwnedOreCount(ing.oreId) < ing.amount) return false;
    }
    return true;
  }

  public craftRelic(relicId: string): boolean {
    const def = getRelicById(relicId);
    if (!def || !this.canCraftRelic(relicId)) return false;
    this.gems -= def.gemCost;
    for (const ing of def.ingredients) {
      let rem = ing.amount;
      const inBag = this.ores[ing.oreId] || 0;
      if (inBag > 0) {
        const takeBag = Math.min(inBag, rem);
        this.ores[ing.oreId] = inBag - takeBag;
        if (this.ores[ing.oreId] <= 0) {
          delete this.ores[ing.oreId];
          removeFromHotbarDomain(this, ing.oreId);
        }
        rem -= takeBag;
      }
      if (rem > 0) {
        const inChest = this.chestOres[ing.oreId] || 0;
        const takeChest = Math.min(inChest, rem);
        this.chestOres[ing.oreId] = inChest - takeChest;
        if (this.chestOres[ing.oreId] <= 0) delete this.chestOres[ing.oreId];
      }
    }
    this.craftedRelics.add(relicId);
    if (this.equippedRelics.length < MAX_EQUIPPED_RELICS && !this.equippedRelics.includes(relicId)) {
      this.equippedRelics.push(relicId);
    }
    this.emit();
    return true;
  }

  public toggleEquipRelic(relicId: string): 'equipped' | 'unequipped' | 'full' | 'not-crafted' {
    if (!this.craftedRelics.has(relicId)) return 'not-crafted';
    const idx = this.equippedRelics.indexOf(relicId);
    if (idx >= 0) {
      this.equippedRelics.splice(idx, 1);
      this.emit();
      return 'unequipped';
    }
    if (this.equippedRelics.length >= MAX_EQUIPPED_RELICS) return 'full';
    this.equippedRelics.push(relicId);
    this.emit();
    return 'equipped';
  }

  public getRelicBonus(stat: RelicEffectStat): number {
    let total = 0;
    for (const id of this.equippedRelics) {
      const def = getRelicById(id);
      if (!def) continue;
      total += def.effects[stat] ?? 0;
    }
    return total;
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
    syncTowerKeysDomain(this, now, () => this.save());
  }

  public getTowerNextKeyRegenSec(now = Date.now()): number {
    return getTowerNextKeyRegenSecDomain(this, now, () => this.save());
  }

  public getTowerUnitEffectiveDps(slotIndex: number): number {
    return getTowerUnitEffectiveDpsDomain(this, slotIndex);
  }

  public getTowerSlotStrikeDamage(slotIndex: number, attackIntervalSec = 0.85): number {
    return getTowerSlotStrikeDamageDomain(this, slotIndex, attackIntervalSec);
  }

  public getTowerEffectiveDps(): number {
    return getTowerEffectiveDpsDomain(this);
  }

  public getTowerEffectiveTapDamage(): number {
    return getTowerEffectiveTapDamageDomain(this);
  }

  public startTowerRun(startFloor = 1, now = Date.now(), rng: () => number = Math.random): boolean {
    return startTowerRunDomain(this, startFloor, now, rng, {
      save: () => this.save(),
      emit: () => this.emit(),
    });
  }

  public stepTowerTick(dtSec: number, rng: () => number = Math.random) {
    return stepTowerTickDomain(this, dtSec, rng, () => this.emit());
  }

  public applyTowerTargetDamage(
    targetOreIndex: number | null,
    rawDmg: number,
    rng: () => number = Math.random
  ) {
    return applyTowerTargetDamageDomain(this, targetOreIndex, rawDmg, rng, () => this.emit());
  }

  public applyTowerChibiStrike(
    slotIndex: number,
    targetOreIndex: number | null,
    attackIntervalSec = 0.85,
    rng: () => number = Math.random
  ) {
    return this.applyTowerTargetDamage(
      targetOreIndex,
      this.getTowerSlotStrikeDamage(slotIndex, attackIntervalSec),
      rng
    );
  }

  public tapTowerTarget(targetOreIndex: number | null = null, rng: () => number = Math.random) {
    return this.applyTowerTargetDamage(targetOreIndex, this.getTowerEffectiveTapDamage(), rng);
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
    return chooseTowerBlessingDomain(this, blessingId, rng, () => this.emit());
  }

  public abandonTowerRun(): TowerRunSummary | null {
    return finishTowerRunDomain(this, 'exit', () => this.emit());
  }

  public quickSweepTower(now = Date.now()): { ok: boolean; gemsAwarded: number } {
    return quickSweepTowerDomain(this, now, {
      save: () => this.save(),
      emit: () => this.emit(),
    });
  }

  public buyTowerKeyWithGems(): 'bought' | 'full' | 'no_gems' {
    return buyTowerKeyWithGemsDomain(this, {
      save: () => this.save(),
      emit: () => this.emit(),
    });
  }

  public grantFreeTowerKey(): boolean {
    return grantFreeTowerKeyDomain(this, {
      save: () => this.save(),
      emit: () => this.emit(),
    });
  }

  public grantAdGems(amount = 150): number {
    const safeAmount = Math.max(1, Math.floor(amount));
    this.gems += safeAmount;
    this.emit();
    return safeAmount;
  }

  private save(): void {
    saveToLocalStorage(this);
  }

  private load(): void {
    loadFromLocalStorage(this);
  }
}
