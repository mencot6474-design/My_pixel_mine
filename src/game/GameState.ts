import { OreVariantKey, STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import {
  AchievementClaimResult,
  AchievementProgressSnapshot,
  CareerStats,
  claimAchievementTierDomain,
  createDefaultCareerStats,
  getAchievementAllDmgBonusDomain,
  getReadyAchievementCountDomain,
} from './AchievementsDomain';
import {
  claimIndexRewardDomain,
  getActiveIndexPassiveBonusesDomain,
  getIndexMilestonesForTab,
  getIndexTabProgressDomain,
  getReadyIndexRewardCountDomain,
  getTabReadyIndexRewardCountDomain,
  IndexMilestoneDef,
  IndexPassiveBonuses,
  IndexRewardClaimResult,
  IndexTabId,
  IndexTabProgress,
} from './IndexRewardsDomain';
import {
  applyTeamPresetDomain,
  ApplyTeamPresetResult,
  createEmptyTeamPresets,
  saveTeamPresetDomain,
  TeamPresetSlots,
} from './TeamPresetsDomain';
import {
  DEFAULT_PICKAXE_STOCK,
  ENCHANT_DICE_GEM_COST,
  EnchantDef,
  ItemRarity,
  PICKAXE_RESTOCK_MS,
  rollEnchantDef,
  WorldId,
  WorldResonanceStatus,
} from './GameData';
import {
  getActiveOreNodeCountDomain,
  getCharacterLuckMultDomain,
  getDiscoveredCountDomain,
  getEffectiveOreSellValueDomain,
  getFindChanceBonusDomain,
  getMaxChestCapacityDomain,
  getMutationLuckMultDomain,
  getOreHpScaleDomain,
  getOreLuckMultDomain,
  getOreOutputMultDomain,
  getOreValueMultDomain,
  getRespawnSpeedMultDomain,
  getTapDamageDomain,
  getTotalIndexCountDomain,
  getTotalOreDropMultDomain,
  getWorldIndexProgressDomain,
} from './GameMultipliersDomain';
import {
  getResearchTreeMaxPoints,
  ResearchEffectType,
  ResearchTreeId,
} from './ResearchData';
import { RelicEffectStat } from './RelicData';
import {
  canCraftRelicDomain,
  canUnlockWorldDomain,
  canUpgradeResearchDomain,
  craftRelicDomain,
  getActiveResearchBonusDomain,
  getAffordableResearchCountDomain,
  getRelicBonusDomain,
  getResearchLevelDomain,
  getTotalOwnedOreCountDomain,
  getTreeSpentPointsDomain,
  isNodePrereqMetDomain,
  isTreeCompleteDomain,
  isWorldUnlockedDomain,
  setActiveWorldDomain,
  toggleEquipRelicDomain,
  unlockWorldDomain,
  upgradeResearchDomain,
} from './ResearchRelicsDomain';
import { FusionRecipeDef } from './FusionData';
import {
  canFuseRecipeDomain,
  fuseChibiRecipeDomain,
  FusionDomainContext,
  FusionPassiveBonuses,
  getActiveFusionPassiveBonuses,
  getAvailableFusionMinerCount,
  getFusionOreCount,
  getReadyFusionCountDomain,
} from './FusionDomain';
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
  hitTowerBossShieldSweetSpotDomain,
  quickSweepTowerDomain,
  rerollTowerBlessingsDomain,
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
  getActiveEnchantBonuses,
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
  trimStashedUnits,
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
  refreshPickaxeStockIfDueDomain,
  sellAllOresDomain,
  sellBatchDomain,
  sellMinerDomain,
  sellOreDomain,
  sellPickaxeDomain,
  syncWeatherDomain,
  useGemPotionDomain,
} from './ShopWeatherDomain';

import {
  claimOfflineEarningsDomain,
  computeOfflineEarningsDomain,
  RETURN_RUSH_BOOST_ID,
  RETURN_RUSH_FEVER_CHARGE_BONUS,
  type OfflineClaimResult,
  type OfflineEarningsSummary,
} from './OfflineEarningsDomain';
import {
  type BountyClaimResult,
  type BountyEntry,
  claimBountyDomain,
  ensureBountiesPopulatedDomain,
  getReadyBountyCountDomain,
  recordBountyProgressDomain,
} from './BountiesDomain';
import {
  chargeOverclockDomain,
  createInitialOverclockState,
  extendOverclockDomain,
  getOverclockSnapshotDomain,
  isOverclockActiveDomain,
  OVERCLOCK_BREAK_CHARGE,
  OVERCLOCK_GEODE_EXTEND_SEC,
  OVERCLOCK_METEOR_BREAK_CHARGE,
  OVERCLOCK_METEOR_EXTEND_SEC,
  OVERCLOCK_PIT_EVENT_CHARGE,
  OVERCLOCK_PIT_EVENT_EXTEND_SEC,
  type OverclockExtendResult,
  type OverclockSnapshot,
  type OverclockState,
  type OverclockTier,
  stepOverclockDomain,
} from './OverclockDomain';
import {
  canClaimDailyLoginDomain,
  claimDailyLoginDomain,
  type DailyLoginSnapshot,
  getDailyLoginSnapshotDomain,
} from './DailyLoginDomain';
import type { DailyLoginRewardDef } from './DailyLoginData';

export type {
  PlotUnitState,
  ResearchLevelsMap,
  SavePayload,
  OfflineClaimResult,
  OfflineEarningsSummary,
  BountyClaimResult,
  BountyEntry,
};
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
  public towerDicePity = 0;
  public towerRun: TowerRunState | null = null;
  public towerLastSummary: TowerRunSummary | null = null;
  public readonly towerRunMeta: TowerRunMeta = { startFloor: 1, newRecord: false };
  public weatherId: WeatherId = rollWeatherDef().id;
  public weatherExpiresAt = Date.now() + WEATHER_DURATION_MS;
  public lastSavedAt = 0;
  public pendingOfflineEarnings: OfflineEarningsSummary | null = null;
  public bounties: BountyEntry[] = [];
  public bountiesCompleted = 0;
  public dailyLoginLastClaimDate = '';
  public dailyLoginClaimedDays: number[] = [];
  public claimedIndexRewards = new Set<string>();
  public teamPresets: TeamPresetSlots[] = createEmptyTeamPresets();
  public careerStats: CareerStats = createDefaultCareerStats();
  public claimedAchievements = new Set<string>();
  public readonly overclock: OverclockState = createInitialOverclockState();
  private loadedLastSavedAt = 0;

  private readonly listeners = new Set<StateListener>();

  constructor() {
    this.load();
    this.loadedLastSavedAt = this.lastSavedAt;
    ensureBountiesPopulatedDomain(this);
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
    return getTotalIndexCountDomain();
  }

  public getDiscoveredCount(): number {
    return getDiscoveredCountDomain(this.discovered);
  }

  public getWorldIndexProgress(worldId: WorldId): { found: number; total: number; pct: number } {
    return getWorldIndexProgressDomain(this.discovered, worldId);
  }

  public getIndexTabProgress(tabId: IndexTabId): IndexTabProgress {
    return getIndexTabProgressDomain(this.discovered, tabId);
  }

  public getIndexMilestones(tabId: IndexTabId): IndexMilestoneDef[] {
    return getIndexMilestonesForTab(tabId);
  }

  public getReadyIndexRewardCount(): number {
    return getReadyIndexRewardCountDomain(this.discovered, this.claimedIndexRewards);
  }

  public getTabReadyIndexRewardCount(tabId: IndexTabId): number {
    return getTabReadyIndexRewardCountDomain(this.discovered, this.claimedIndexRewards, tabId);
  }

  public claimIndexReward(milestoneId: string): IndexRewardClaimResult | null {
    const res = claimIndexRewardDomain(this, milestoneId);
    if (!res) return null;
    this.emit();
    return res;
  }

  public getActiveIndexPassiveBonuses(): IndexPassiveBonuses {
    return getActiveIndexPassiveBonusesDomain(this.claimedIndexRewards);
  }

  public saveTeamPreset(presetIndex: number): boolean {
    const ok = saveTeamPresetDomain(this, presetIndex);
    if (ok) this.emit();
    return ok;
  }

  public applyTeamPreset(presetIndex: number): ApplyTeamPresetResult | null {
    const res = applyTeamPresetDomain(this, presetIndex);
    if (!res) return null;
    this.emit();
    return res;
  }

  public recordCritTap(damage: number): void {
    this.careerStats.critTaps += 1;
    const rounded = Math.max(1, Math.round(damage));
    if (rounded > this.careerStats.highestCrit) {
      this.careerStats.highestCrit = rounded;
    }
  }

  public getAchievementSnapshot(): AchievementProgressSnapshot {
    return {
      oresBroken: this.careerStats.oresBroken,
      critTaps: this.careerStats.critTaps,
      overclockTriggers: this.careerStats.overclockTriggers,
      discoveredCount: this.getDiscoveredCount(),
      towerBestFloor: this.towerBestFloor,
      craftedRelicsCount: this.craftedRelics.size,
      bountiesCompleted: this.bountiesCompleted,
      unlockedWorldsCount: this.unlockedWorlds.length,
    };
  }

  public getReadyAchievementCount(): number {
    return getReadyAchievementCountDomain(this.getAchievementSnapshot(), this.claimedAchievements);
  }

  public claimAchievementTier(tierId: string): AchievementClaimResult | null {
    const res = claimAchievementTierDomain(this, tierId);
    if (!res) return null;
    this.emit();
    return res;
  }

  public getAchievementAllDmgBonus(): number {
    return getAchievementAllDmgBonusDomain(this.claimedAchievements);
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

  public getPlotUnitStats(slotIndex: number, nowMs = Date.now()) {
    return computePlotUnitStats(this, slotIndex, nowMs);
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

  public getActiveStarDropAndGemBonus(): { oreDropBonusPct: number; sellBonusPct: number; gemBonusPct: number } {
    return getActiveStarAndResonanceBonuses(this);
  }

  public getActiveEnchantBonuses(): { oreDropPct: number; sellValuePct: number } {
    return getActiveEnchantBonuses(this);
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
    const ok = upgradeUnitDamage(this, slotIndex, () => this.emit());
    if (ok) recordBountyProgressDomain(this, 'upgrade_chibi', 1);
    return ok;
  }

  public upgradePlotSpeed(slotIndex: number): boolean {
    const ok = upgradeUnitSpeed(this, slotIndex, () => this.emit());
    if (ok) recordBountyProgressDomain(this, 'upgrade_chibi', 1);
    return ok;
  }

  public upgradePlotMiningSpeed(slotIndex: number): boolean {
    const ok = upgradeUnitMiningSpeed(this, slotIndex, () => this.emit());
    if (ok) recordBountyProgressDomain(this, 'upgrade_chibi', 1);
    return ok;
  }

  public buyOrEquipPickaxe(slotIndex: number, pickaxeId: string) {
    return buyOrEquipUnitPickaxe(this, slotIndex, pickaxeId, () => this.emit());
  }

  public rollPlotMutation(slotIndex: number, rng: () => number = Math.random): string | null {
    const res = rollUnitMutation(this, slotIndex, rng, () => this.emit());
    if (res) recordBountyProgressDomain(this, 'roll_enchant_or_mut', 1);
    return res;
  }

  public getAvailableEnchantCount(enchantId: string): number {
    return getAvailableEnchantUnitsCount(this, enchantId);
  }

  public togglePlotEnchant(slotIndex: number, enchantId: string): boolean {
    return toggleUnitEnchant(this, slotIndex, enchantId, () => this.emit());
  }

  public isWorldUnlocked(worldId: WorldId): boolean {
    return isWorldUnlockedDomain(this, worldId);
  }

  public getResearchLevel(nodeId: string): number {
    return getResearchLevelDomain(this, nodeId);
  }

  public getTreeSpentPoints(treeId: ResearchTreeId): number {
    return getTreeSpentPointsDomain(this, treeId);
  }

  public getTreeMaxPoints(treeId: ResearchTreeId): number {
    return getResearchTreeMaxPoints(treeId);
  }

  public isTreeComplete(treeId: ResearchTreeId): boolean {
    return isTreeCompleteDomain(this, treeId);
  }

  public isNodePrereqMet(nodeId: string): boolean {
    return isNodePrereqMetDomain(this, nodeId);
  }

  public canUpgradeResearch(nodeId: string): 'ok' | 'locked-world' | 'locked-prereq' | 'maxed' | 'no-cash' {
    return canUpgradeResearchDomain(this, nodeId);
  }

  public upgradeResearch(nodeId: string): boolean {
    return upgradeResearchDomain(this, nodeId, () => this.emit());
  }

  public getAffordableResearchCount(): number {
    return getAffordableResearchCountDomain(this);
  }

  public canUnlockWorld(worldId: WorldId): 'ok' | 'unlocked' | 'locked-prereq' | 'no-cash' {
    return canUnlockWorldDomain(this, worldId);
  }

  public unlockWorld(worldId: WorldId): boolean {
    return unlockWorldDomain(this, worldId, () => this.emit());
  }

  /** Core research applies everywhere; world research is strictly isolated to activeWorldId. */
  public getActiveResearchBonus(effectType: ResearchEffectType): number {
    return getActiveResearchBonusDomain(this, effectType);
  }

  public setActiveWorld(worldId: WorldId): boolean {
    return setActiveWorldDomain(this, worldId, () => this.emit());
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
    this.careerStats.oresBroken += 1;
    recordBountyProgressDomain(this, 'mine_ores', 1);
    if (variantKey === 'vein' || variantKey === 'geode') {
      recordBountyProgressDomain(this, 'break_rare_ore', 1);
    }
    if (this.isOverclockActive()) {
      if (variantKey === 'geode') {
        this.extendOverclock(OVERCLOCK_GEODE_EXTEND_SEC, false);
      }
    } else {
      this.chargeOverclock(OVERCLOCK_BREAK_CHARGE);
    }
    onOreBrokenDomain(this, variantKey, rng, () => this.emit());
  }

  public onMeteorBroken(weatherId: WeatherId, rng: () => number = Math.random) {
    recordBountyProgressDomain(this, 'shatter_meteor', 1);
    if (this.isOverclockActive()) {
      this.extendOverclock(OVERCLOCK_METEOR_EXTEND_SEC, true);
    } else {
      this.chargeOverclock(OVERCLOCK_METEOR_BREAK_CHARGE);
    }
    return onMeteorBrokenDomain(this, weatherId, rng, () => this.emit());
  }

  public onPitEventBroken(nowMs = Date.now()): OverclockExtendResult {
    if (this.isOverclockActive(nowMs)) {
      return this.extendOverclock(OVERCLOCK_PIT_EVENT_EXTEND_SEC, true, nowMs);
    }
    this.chargeOverclock(OVERCLOCK_PIT_EVENT_CHARGE, nowMs);
    return { extended: false, tierUp: false, tier: 1, addedSec: 0 };
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
    const res = sellAllChestOresDomain(this, () => this.emit());
    if (res.earned > 0) recordBountyProgressDomain(this, 'sell_ores', 1);
    return res;
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
    const earned = sellOreDomain(this, oreId, sellAll, () => this.emit());
    if (earned > 0) recordBountyProgressDomain(this, 'sell_ores', 1);
    return earned;
  }

  public sellAllOres(): number {
    const earned = sellAllOresDomain(this, () => this.emit());
    if (earned > 0) recordBountyProgressDomain(this, 'sell_ores', 1);
    return earned;
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

  public getActiveFusionPassives(): FusionPassiveBonuses {
    return getActiveFusionPassiveBonuses(this.plotMiners);
  }

  public getTapDamage(nowMs = Date.now()): number {
    return getTapDamageDomain(this, nowMs);
  }

  public getMaxChestCapacity(): number {
    return getMaxChestCapacityDomain(this);
  }

  public getActiveOreNodeCount(): number {
    return getActiveOreNodeCountDomain(this);
  }

  public getOreHpScale(): number {
    return getOreHpScaleDomain(this);
  }

  public getOreValueMult(): number {
    return getOreValueMultDomain(this);
  }

  public getEffectiveOreSellValue(oreId: string): number {
    return getEffectiveOreSellValueDomain(this, oreId);
  }

  public getOreOutputMult(): number {
    return getOreOutputMultDomain(this);
  }

  public getTotalOreDropMult(nowMs = Date.now()): number {
    return getTotalOreDropMultDomain(this, nowMs);
  }

  public getRespawnSpeedMult(): number {
    return getRespawnSpeedMultDomain(this);
  }

  public getFindChanceBonus(): number {
    return getFindChanceBonusDomain(this);
  }

  public getCharacterLuckMult(): number {
    return getCharacterLuckMultDomain(this);
  }

  public getOreLuckMult(): number {
    return getOreLuckMultDomain(this);
  }

  public getMutationLuckMult(): number {
    return getMutationLuckMultDomain(this);
  }

  // === RELIC FORGE ===
  public hasCraftedRelic(relicId: string): boolean {
    return this.craftedRelics.has(relicId);
  }

  public isRelicEquipped(relicId: string): boolean {
    return this.equippedRelics.includes(relicId);
  }

  public getTotalOwnedOreCount(oreId: string): number {
    return getTotalOwnedOreCountDomain(this, oreId);
  }

  public canCraftRelic(relicId: string): boolean {
    return canCraftRelicDomain(this, relicId);
  }

  public craftRelic(relicId: string): boolean {
    return craftRelicDomain(this, relicId, () => this.emit());
  }

  public toggleEquipRelic(relicId: string): 'equipped' | 'unequipped' | 'full' | 'not-crafted' {
    return toggleEquipRelicDomain(this, relicId, () => this.emit());
  }

  public getRelicBonus(stat: RelicEffectStat): number {
    return getRelicBonusDomain(this, stat);
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
    recordBountyProgressDomain(this, 'roll_enchant_or_mut', 1);
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
    const res = applyTowerTargetDamageDomain(this, targetOreIndex, rawDmg, rng, () => this.emit());
    if (res.waveCleared) {
      recordBountyProgressDomain(this, 'clear_tower_wave', 1);
    }
    return res;
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

  public rerollTowerBlessings(rng: () => number = Math.random): { ok: boolean; usedFree: boolean; costGems: number } {
    return rerollTowerBlessingsDomain(this, rng, {
      save: () => this.save(),
      emit: () => this.emit(),
    });
  }

  public hitTowerBossShieldSweetSpot() {
    return hitTowerBossShieldSweetSpotDomain(this, () => this.emit());
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

  public grantTutorialStarterReward(gems = 150, dice = 1): { gems: number; dice: number } {
    const safeGems = Math.max(0, Math.floor(gems));
    const safeDice = Math.max(0, Math.floor(dice));
    this.gems += safeGems;
    this.enchantDice += safeDice;
    this.emit();
    return { gems: safeGems, dice: safeDice };
  }

  public evaluateOfflineEarnings(nowMs = Date.now(), rng: () => number = Math.random): OfflineEarningsSummary | null {
    if (this.pendingOfflineEarnings) return this.pendingOfflineEarnings;
    const prevSavedAt = this.loadedLastSavedAt || this.lastSavedAt;
    if (prevSavedAt <= 0) return null;
    const prev = this.lastSavedAt;
    this.lastSavedAt = prevSavedAt;
    const summary = computeOfflineEarningsDomain(this, nowMs, rng);
    this.lastSavedAt = prev;
    this.loadedLastSavedAt = 0;
    this.pendingOfflineEarnings = summary;
    return summary;
  }

  public claimOfflineEarnings(multiplier: 1 | 2 = 1, nowMs = Date.now()): OfflineClaimResult | null {
    const summary = this.pendingOfflineEarnings;
    if (!summary) return null;
    this.pendingOfflineEarnings = null;
    return claimOfflineEarningsDomain(this, summary, multiplier, () => this.emit(), nowMs);
  }

  public isReturnRushActive(nowMs = Date.now()): boolean {
    return (this.activeBoosts[RETURN_RUSH_BOOST_ID] ?? 0) > nowMs;
  }

  public getReturnRushRemainingSec(nowMs = Date.now()): number {
    const exp = this.activeBoosts[RETURN_RUSH_BOOST_ID] ?? 0;
    return Math.max(0, Math.ceil((exp - nowMs) / 1000));
  }

  public getReadyBountyCount(): number {
    return getReadyBountyCountDomain(this.bounties);
  }

  public claimBounty(bountyId: string, rng: () => number = Math.random): BountyClaimResult | null {
    return claimBountyDomain(this, bountyId, rng, () => this.emit());
  }

  public canClaimDailyLogin(now = Date.now()): boolean {
    return canClaimDailyLoginDomain(this, now);
  }

  public getDailyLoginSnapshot(now = Date.now()): DailyLoginSnapshot {
    return getDailyLoginSnapshotDomain(this, now);
  }

  public claimDailyLogin(now = Date.now()): DailyLoginRewardDef | null {
    return claimDailyLoginDomain(this, now, () => this.emit());
  }

  public chargeOverclock(amount: number, nowMs = Date.now()): boolean {
    const wasActive = this.isOverclockActive(nowMs);
    const mult = this.isReturnRushActive(nowMs) ? 1 + RETURN_RUSH_FEVER_CHARGE_BONUS : 1;
    const activated = chargeOverclockDomain(this.overclock, amount * mult, nowMs);
    if (!wasActive && activated) {
      this.careerStats.overclockTriggers += 1;
    }
    return activated;
  }

  public extendOverclock(
    extendSec: number,
    advanceTier = false,
    nowMs = Date.now()
  ): OverclockExtendResult {
    return extendOverclockDomain(this.overclock, extendSec, advanceTier, nowMs);
  }

  public stepOverclock(nowMs = Date.now()): boolean {
    return stepOverclockDomain(this.overclock, nowMs);
  }

  public isOverclockActive(nowMs = Date.now()): boolean {
    return isOverclockActiveDomain(this.overclock, nowMs);
  }

  public getOverclockTier(nowMs = Date.now()): 0 | OverclockTier {
    return getOverclockSnapshotDomain(this.overclock, nowMs).tier;
  }

  public getOverclockSnapshot(nowMs = Date.now()): OverclockSnapshot {
    return getOverclockSnapshotDomain(this.overclock, nowMs);
  }

  public getAvailableFusionMinerCount(chibiId: string): number {
    return getAvailableFusionMinerCount(this.fusionCtx(), chibiId);
  }

  public getFusionOreCount(oreId: string): number {
    return getFusionOreCount(this.fusionCtx(), oreId);
  }

  public canFuseRecipe(recipeId: string): boolean {
    return canFuseRecipeDomain(this.fusionCtx(), recipeId);
  }

  public getReadyFusionCount(): number {
    return getReadyFusionCountDomain(this.fusionCtx());
  }

  public fuseChibiRecipe(recipeId: string): FusionRecipeDef | null {
    const res = fuseChibiRecipeDomain(this.fusionCtx(), recipeId);
    if (res) {
      this.careerStats.fusionsCompleted += 1;
    }
    return res;
  }

  private fusionCtx(): FusionDomainContext {
    const self = this;
    return {
      get gems() {
        return self.gems;
      },
      set gems(v: number) {
        self.gems = v;
      },
      miners: self.miners,
      chestMiners: self.chestMiners,
      ores: self.ores,
      chestOres: self.chestOres,
      plotMiners: self.plotMiners,
      hotbar: self.hotbar,
      discovered: self.discovered,
      trimStashedUnitsFor: (id: string) => trimStashedUnits(self, id),
      save: () => self.save(),
      emit: () => self.emit(),
    };
  }

  public touchSaveTimestamp(): void {
    this.save();
  }

  private save(): void {
    this.lastSavedAt = Date.now();
    saveToLocalStorage(this);
  }

  private load(): void {
    loadFromLocalStorage(this);
  }
}
