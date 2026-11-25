import { OreVariantKey, STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import * as Achievements from './AchievementsDomain';
import type { AchievementClaimResult, AchievementProgressSnapshot, CareerStats } from './AchievementsDomain';
import * as IndexRewards from './IndexRewardsDomain';
import type { IndexMilestoneDef, IndexPassiveBonuses, IndexRewardClaimResult, IndexTabId, IndexTabProgress } from './IndexRewardsDomain';
import * as TeamPresets from './TeamPresetsDomain';
import type { ApplyTeamPresetResult, TeamPresetSlots } from './TeamPresetsDomain';
import { DEFAULT_PICKAXE_STOCK, ENCHANT_DICE_GEM_COST, EnchantDef, getEffectiveChibiBaseDps, ItemRarity, PICKAXE_RESTOCK_MS, rollEnchantDef, WorldId, WorldResonanceStatus } from './GameData';
import * as Multipliers from './GameMultipliersDomain';
import { getResearchTreeMaxPoints, ResearchEffectType, ResearchTreeId } from './ResearchData';
import { RelicEffectStat } from './RelicData';
import * as ResearchRelics from './ResearchRelicsDomain';
import { FusionRecipeDef } from './FusionData';
import * as FusionDom from './FusionDomain';
import type { FusionDomainContext, FusionPassiveBonuses } from './FusionDomain';
import { TOWER_MAX_KEYS, TowerRunState, TowerRunSummary } from './TowerData';
import { rollWeatherDef, WEATHER_DURATION_MS, WeatherDef, WeatherId } from './WeatherData';
import { createEmptyResearchLevels, loadFromLocalStorage, PlotUnitState, ResearchLevelsMap, SavePayload, saveToLocalStorage } from './GameStateSave';
import * as LootChest from './LootChestDomain';
import * as TowerRun from './TowerRunDomain';
import type { TowerRunMeta } from './TowerRunDomain';
import * as PlotUnits from './PlotUnitsDomain';
import * as ShopWeather from './ShopWeatherDomain';

import * as OfflineDom from './OfflineEarningsDomain';
import type { OfflineClaimResult, OfflineEarningsSummary } from './OfflineEarningsDomain';
import * as BountiesDom from './BountiesDomain';
import type { BountyClaimResult, BountyEntry } from './BountiesDomain';
import * as OverclockDom from './OverclockDomain';
import type { OverclockExtendResult, OverclockSnapshot, OverclockState, OverclockTier } from './OverclockDomain';
import * as DailyLoginDom from './DailyLoginDomain';
import type { DailyLoginSnapshot } from './DailyLoginDomain';
import type { DailyLoginRewardDef } from './DailyLoginData';
import { type ActivePremiumPassives, buyPremiumShopChibiDomain, getActivePremiumPassiveBonuses } from './PremiumShopData';
import { type ActiveOmegaPassives, getActiveOmegaPassiveBonuses, OMEGA_MAX_KEYS, type OmegaBossId } from './OmegaData';
import * as OmegaDom from './OmegaBossDomain';
import type { OmegaBattleState, OmegaBattleSummary, OmegaStrikeResult, OmegaTargetObject } from './OmegaBossDomain';
import * as TwinTrialDom from './TwinTrialDomain';
import type { TwinTrialState } from './TwinTrialDomain';
import { type ActiveAnomalyPassives, getActiveAnomalyPassiveBonuses } from './AnomalyData';
import * as RiftDom from './RiftDomain';
import type {
  RiftBattleState,
  RiftBattleSummary,
  RiftBreachClaimResult,
  RiftWindowSnapshot,
} from './RiftDomain';

export type {
  PlotUnitState,
  ResearchLevelsMap,
  SavePayload,
  OfflineClaimResult,
  OfflineEarningsSummary,
  BountyClaimResult,
  BountyEntry,
  OmegaBattleState,
  OmegaBattleSummary,
  OmegaStrikeResult,
  OmegaTargetObject,
};
export const getChibiUpgradeCostMult = PlotUnits.getChibiUpgradeCostMult;

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
    PlotUnits.createFreshPlotUnit('astral-recruit'),
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
  public autoMeteor = false;
  public discovered = new Set<string>(['astral-recruit']);
  public activeBoosts: Record<string, number> = {};
  public towerBestFloor = 0;
  public towerKeys = TOWER_MAX_KEYS;
  public towerLastKeyRegenAt = Date.now();
  public towerClaimedMilestones: number[] = [];
  public towerDicePity = 0;
  public towerCoins = 0;
  public towerRun: TowerRunState | null = null;
  public towerLastSummary: TowerRunSummary | null = null;
  public readonly towerRunMeta: TowerRunMeta = { startFloor: 1, newRecord: false };
  public omegaKeys = OMEGA_MAX_KEYS;
  public omegaLastKeyRegenAt = Date.now();
  public omegaCores: Record<string, number> = {};
  public omegaBestTier: Record<string, number> = {};
  public omegaKills: Record<string, number> = {};
  public omegaClaimedFirstClears: string[] = [];
  public omegaBattle: OmegaBattleState | null = null;
  public omegaLastSummary: OmegaBattleSummary | null = null;
  public weatherId: WeatherId = rollWeatherDef().id;
  public weatherExpiresAt = Date.now() + WEATHER_DURATION_MS;
  public lastSavedAt = 0;
  public pendingOfflineEarnings: OfflineEarningsSummary | null = null;
  public bounties: BountyEntry[] = [];
  public bountiesCompleted = 0;
  public dailyLoginLastClaimDate = '';
  public dailyLoginClaimedDays: number[] = [];
  public claimedIndexRewards = new Set<string>();
  public teamPresets: TeamPresetSlots[] = TeamPresets.createEmptyTeamPresets();
  public careerStats: CareerStats = Achievements.createDefaultCareerStats();
  public claimedAchievements = new Set<string>();
  public readonly overclock: OverclockState = OverclockDom.createInitialOverclockState();
  public twinTrial: TwinTrialState = TwinTrialDom.createInitialTwinTrialState();
  public riftShards = 0;
  public riftPassExpiresAt = 0;
  public riftBreachesCompleted = 0;
  public riftHourlyKey = '';
  public riftHourlyAttemptsUsed = 0;
  public riftPassAttemptsUsed = 0;
  public riftBestDamage = 0;
  public riftBestTier = 0;
  public riftBattle: RiftBattleState | null = null;
  public riftLastSummary: RiftBattleSummary | null = null;
  private loadedLastSavedAt = 0;

  private readonly listeners = new Set<StateListener>();
  private readonly saveHooks = { save: () => this.save(), emit: () => this.emit() };

  constructor() {
    this.load();
    this.loadedLastSavedAt = this.lastSavedAt;
    BountiesDom.ensureBountiesPopulatedDomain(this);
    this.syncTowerKeys();
    this.syncOmegaKeys();
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
    return Multipliers.getTotalIndexCountDomain();
  }

  public getDiscoveredCount(): number {
    return Multipliers.getDiscoveredCountDomain(this.discovered);
  }

  public getWorldIndexProgress(worldId: WorldId): { found: number; total: number; pct: number } {
    return Multipliers.getWorldIndexProgressDomain(this.discovered, worldId);
  }

  public getIndexTabProgress(tabId: IndexTabId): IndexTabProgress {
    return IndexRewards.getIndexTabProgressDomain(this.discovered, tabId);
  }

  public getIndexMilestones(tabId: IndexTabId): IndexMilestoneDef[] {
    return IndexRewards.getIndexMilestonesForTab(tabId);
  }

  public getReadyIndexRewardCount(): number {
    return IndexRewards.getReadyIndexRewardCountDomain(this.discovered, this.claimedIndexRewards);
  }

  public getTabReadyIndexRewardCount(tabId: IndexTabId): number {
    return IndexRewards.getTabReadyIndexRewardCountDomain(this.discovered, this.claimedIndexRewards, tabId);
  }

  public claimIndexReward(milestoneId: string): IndexRewardClaimResult | null {
    const res = IndexRewards.claimIndexRewardDomain(this, milestoneId);
    if (!res) return null;
    this.emit();
    return res;
  }

  public getActiveIndexPassiveBonuses(): IndexPassiveBonuses {
    return IndexRewards.getActiveIndexPassiveBonusesDomain(this.claimedIndexRewards);
  }

  public saveTeamPreset(presetIndex: number): boolean {
    const ok = TeamPresets.saveTeamPresetDomain(this, presetIndex);
    if (ok) this.emit();
    return ok;
  }

  public applyTeamPreset(presetIndex: number): ApplyTeamPresetResult | null {
    const res = TeamPresets.applyTeamPresetDomain(this, presetIndex);
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
    return Achievements.getReadyAchievementCountDomain(this.getAchievementSnapshot(), this.claimedAchievements);
  }

  public claimAchievementTier(tierId: string): AchievementClaimResult | null {
    const res = Achievements.claimAchievementTierDomain(this, tierId);
    if (!res) return null;
    this.emit();
    return res;
  }

  public getAchievementAllDmgBonus(): number {
    return Achievements.getAchievementAllDmgBonusDomain(this.claimedAchievements);
  }

  public getChestItemCount(): number {
    return LootChest.getChestItemCountDomain(this);
  }

  public getEquippedPlotMinerIds(): (string | null)[] {
    return this.plotMiners;
  }

  public getPlotUnit(slotIndex: number): PlotUnitState | null {
    return this.plotUnits[slotIndex] ?? null;
  }

  public getPlotUnitStats(slotIndex: number, nowMs = Date.now(), includeOverclock = true) {
    return PlotUnits.computePlotUnitStats(this, slotIndex, nowMs, includeOverclock);
  }

  public getBasePlotDps(): number {
    return PlotUnits.computeBasePlotDps(this);
  }

  public getEffectiveChibiDps(chibiId: string): number {
    return getEffectiveChibiBaseDps(chibiId, this.unlockedWorlds, this.discovered);
  }

  public getTotalPlotDps(): number {
    return PlotUnits.computeTotalPlotDps(this);
  }

  public getPermanentPlotDps(): number {
    return PlotUnits.computeTotalPlotDps(this, false);
  }

  public getDpsBreakdown() {
    return PlotUnits.computeDpsBreakdown(this);
  }

  public getChibiStar(chibiId: string): number {
    return PlotUnits.getChibiStarCount(this, chibiId);
  }

  public getSpareChibiDuplicates(chibiId: string): number {
    return PlotUnits.getSpareChibiDuplicateCount(this, chibiId);
  }

  public canStarUpChibi(chibiId: string): boolean {
    return PlotUnits.canStarUpUnit(this, chibiId);
  }

  public starUpChibi(chibiId: string) {
    return PlotUnits.starUpUnit(this, chibiId, () => this.emit());
  }

  public autoStarUpAll(): number {
    return PlotUnits.autoStarUpAllUnits(this, () => this.emit());
  }

  public getActiveWorldResonances(): WorldResonanceStatus[] {
    return PlotUnits.getActiveWorldResonancesList(this);
  }

  public getWorldResonanceDmgBonusPct(worldId: WorldId | null): number {
    return PlotUnits.getWorldResonanceDmgPct(this, worldId);
  }

  public getActiveStarDropAndGemBonus(): { oreDropBonusPct: number; sellBonusPct: number; gemBonusPct: number } {
    return PlotUnits.getActiveStarAndResonanceBonuses(this);
  }

  public getActiveEnchantBonuses(): { oreDropPct: number; sellValuePct: number } {
    return PlotUnits.getActiveEnchantBonuses(this);
  }

  public placeHotbarItemOnPlot(hotbarSlot: number, plotSlotIndex: number) {
    return PlotUnits.placeHotbarItemOnPlotSlot(this, hotbarSlot, plotSlotIndex, () => this.emit());
  }

  public placeSelectedOnPlot(slotIndex: number) {
    return PlotUnits.placeSelectedOnPlotSlot(this, slotIndex, () => this.emit());
  }

  public removeMinerFromPlot(slotIndex: number): void {
    PlotUnits.removeMinerFromPlotSlot(this, slotIndex, () => this.emit());
  }

  public upgradePlotDamage(slotIndex: number): boolean {
    const ok = PlotUnits.upgradeUnitDamage(this, slotIndex, () => this.emit());
    if (ok) BountiesDom.recordBountyProgressDomain(this, 'upgrade_chibi', 1);
    return ok;
  }

  public upgradePlotSpeed(slotIndex: number): boolean {
    const ok = PlotUnits.upgradeUnitSpeed(this, slotIndex, () => this.emit());
    if (ok) BountiesDom.recordBountyProgressDomain(this, 'upgrade_chibi', 1);
    return ok;
  }

  public upgradePlotMiningSpeed(slotIndex: number): boolean {
    const ok = PlotUnits.upgradeUnitMiningSpeed(this, slotIndex, () => this.emit());
    if (ok) BountiesDom.recordBountyProgressDomain(this, 'upgrade_chibi', 1);
    return ok;
  }

  public buyOrEquipPickaxe(slotIndex: number, pickaxeId: string) {
    return PlotUnits.buyOrEquipUnitPickaxe(this, slotIndex, pickaxeId, () => this.emit());
  }

  public rollPlotMutation(slotIndex: number, rng: () => number = Math.random): string | null {
    const res = PlotUnits.rollUnitMutation(this, slotIndex, rng, () => this.emit());
    if (res) BountiesDom.recordBountyProgressDomain(this, 'roll_enchant_or_mut', 1);
    return res;
  }

  public getAvailableEnchantCount(enchantId: string): number {
    return PlotUnits.getAvailableEnchantUnitsCount(this, enchantId);
  }

  public togglePlotEnchant(slotIndex: number, enchantId: string): boolean {
    return PlotUnits.toggleUnitEnchant(this, slotIndex, enchantId, () => this.emit());
  }

  public isWorldUnlocked(worldId: WorldId): boolean {
    return ResearchRelics.isWorldUnlockedDomain(this, worldId);
  }

  public getResearchLevel(nodeId: string): number {
    return ResearchRelics.getResearchLevelDomain(this, nodeId);
  }

  public getTreeSpentPoints(treeId: ResearchTreeId): number {
    return ResearchRelics.getTreeSpentPointsDomain(this, treeId);
  }

  public getTreeMaxPoints(treeId: ResearchTreeId): number {
    return getResearchTreeMaxPoints(treeId);
  }

  public isTreeComplete(treeId: ResearchTreeId): boolean {
    return ResearchRelics.isTreeCompleteDomain(this, treeId);
  }

  public isNodePrereqMet(nodeId: string): boolean {
    return ResearchRelics.isNodePrereqMetDomain(this, nodeId);
  }

  public canUpgradeResearch(nodeId: string): 'ok' | 'locked-world' | 'locked-prereq' | 'maxed' | 'no-cash' {
    return ResearchRelics.canUpgradeResearchDomain(this, nodeId);
  }

  public upgradeResearch(nodeId: string): boolean {
    return ResearchRelics.upgradeResearchDomain(this, nodeId, () => this.emit());
  }

  public getAffordableResearchCount(): number {
    return ResearchRelics.getAffordableResearchCountDomain(this);
  }

  public canUnlockWorld(worldId: WorldId): 'ok' | 'unlocked' | 'locked-prereq' | 'no-cash' {
    return ResearchRelics.canUnlockWorldDomain(this, worldId);
  }

  public unlockWorld(worldId: WorldId): boolean {
    return ResearchRelics.unlockWorldDomain(this, worldId, () => this.emit());
  }

  /** Core research applies everywhere; world research is strictly isolated to activeWorldId. */
  public getActiveResearchBonus(effectType: ResearchEffectType): number {
    return ResearchRelics.getActiveResearchBonusDomain(this, effectType);
  }

  public setActiveWorld(worldId: WorldId): boolean {
    return ResearchRelics.setActiveWorldDomain(this, worldId, () => this.emit());
  }

  public selectHotbarSlot(slot: number): void {
    LootChest.selectHotbarSlotDomain(this, slot, () => this.emit());
  }

  public clearHotbarSelection(): void {
    LootChest.clearHotbarSelectionDomain(this, () => this.emit());
  }

  public swapHotbarSlots(fromIndex: number, toIndex: number): boolean {
    return LootChest.swapHotbarSlotsDomain(this, fromIndex, toIndex, () => this.emit());
  }

  public onOreBroken(variantKey: OreVariantKey, rng: () => number = Math.random): void {
    this.careerStats.oresBroken += 1;
    BountiesDom.recordBountyProgressDomain(this, 'mine_ores', 1);
    if (variantKey === 'vein' || variantKey === 'geode') {
      BountiesDom.recordBountyProgressDomain(this, 'break_rare_ore', 1);
    }
    if (this.isOverclockActive()) {
      if (variantKey === 'geode') {
        this.extendOverclock(OverclockDom.OVERCLOCK_GEODE_EXTEND_SEC, false);
        this.chargeOverclock(OverclockDom.OVERCLOCK_GEODE_FEVER_CHARGE);
      } else {
        this.chargeOverclock(OverclockDom.OVERCLOCK_BREAK_CHARGE);
      }
    } else {
      this.chargeOverclock(OverclockDom.OVERCLOCK_BREAK_CHARGE);
    }
    LootChest.onOreBrokenDomain(this, variantKey, rng, () => this.emit());
  }

  public onMeteorBroken(weatherId: WeatherId, rng: () => number = Math.random) {
    BountiesDom.recordBountyProgressDomain(this, 'shatter_meteor', 1);
    if (this.isOverclockActive()) {
      this.extendOverclock(OverclockDom.OVERCLOCK_METEOR_EXTEND_SEC, true);
    } else {
      this.chargeOverclock(OverclockDom.OVERCLOCK_METEOR_BREAK_CHARGE);
    }
    return LootChest.onMeteorBrokenDomain(this, weatherId, rng, () => this.emit());
  }

  public onPitEventBroken(nowMs = Date.now()): OverclockExtendResult {
    if (this.isOverclockActive(nowMs)) {
      return this.extendOverclock(OverclockDom.OVERCLOCK_PIT_EVENT_EXTEND_SEC, true, nowMs);
    }
    this.chargeOverclock(OverclockDom.OVERCLOCK_PIT_EVENT_CHARGE, nowMs);
    return { extended: false, tierUp: false, tier: 1, addedSec: 0 };
  }

  public takeAllFromChest(): number {
    return LootChest.takeAllFromChestDomain(this, () => this.emit());
  }

  public isChestFullBonusReady(): boolean {
    return LootChest.isChestFullBonusReadyDomain(this);
  }

  public isOreLocked(oreId: string): boolean {
    return LootChest.isOreLockedDomain(this, oreId);
  }

  public toggleOreLock(oreId: string): boolean {
    return LootChest.toggleOreLockDomain(this, oreId, () => this.emit());
  }

  public isAutoSellRarity(rarity: ItemRarity): boolean {
    return this.autoSellRarities.has(rarity);
  }

  public shouldAutoSellOre(oreId: string): boolean {
    return LootChest.shouldAutoSellOreDomain(this, oreId);
  }

  public toggleAutoSellRarity(rarity: ItemRarity): { active: boolean; earned: number } {
    return LootChest.toggleAutoSellRarityDomain(this, rarity, () => this.emit());
  }

  public sellAllChestOres(): { earned: number; bonusApplied: boolean } {
    const res = LootChest.sellAllChestOresDomain(this, () => this.emit());
    if (res.earned > 0) BountiesDom.recordBountyProgressDomain(this, 'sell_ores', 1);
    return res;
  }

  public toggleAutoMeteor(): boolean {
    this.autoMeteor = !this.autoMeteor;
    this.emit();
    return this.autoMeteor;
  }

  public toggleAutoSell(): number {
    return LootChest.toggleAutoSellDomain(this, () => this.emit());
  }

  public toggleEquipMiner(chibiId: string): void {
    if ((this.miners[chibiId] || 0) <= 0) return;
    LootChest.toggleHotbarItemDomain(this, chibiId, () => this.emit());
  }

  public toggleEquipOre(_oreId: string): void {
    // Hotbar is reserved for Chibi miners only.
  }

  public equipBestMiners(): void {
    PlotUnits.equipBestUnitsToPlots(this, () => this.emit());
  }

  public sellOre(oreId: string, sellAll = true): number {
    const earned = ShopWeather.sellOreDomain(this, oreId, sellAll, () => this.emit());
    if (earned > 0) BountiesDom.recordBountyProgressDomain(this, 'sell_ores', 1);
    return earned;
  }

  public sellAllOres(): number {
    const earned = ShopWeather.sellAllOresDomain(this, () => this.emit());
    if (earned > 0) BountiesDom.recordBountyProgressDomain(this, 'sell_ores', 1);
    return earned;
  }

  public getSellableMinerCount(chibiId: string): number {
    return ShopWeather.getSellableMinerCountDomain(this, chibiId);
  }

  public sellMiner(chibiId: string, sellAll = false): number {
    return ShopWeather.sellMinerDomain(this, chibiId, sellAll, () => this.emit());
  }

  public refreshPickaxeStockIfDue(): boolean {
    return ShopWeather.refreshPickaxeStockIfDueDomain(this, Date.now(), () => this.emit());
  }

  public getPickaxeRestockRemainingSec(): number {
    return ShopWeather.getPickaxeRestockRemainingSecDomain(this, Date.now(), () => this.emit());
  }

  public buyPickaxe(pickaxeId: string): 'bought' | 'sold_out' | 'no_cash' | 'locked' {
    return ShopWeather.buyPickaxeDomain(this, pickaxeId, Date.now(), () => this.emit());
  }

  public sellPickaxe(pickaxeId: string, sellAll = false): number {
    return ShopWeather.sellPickaxeDomain(this, pickaxeId, sellAll, () => this.emit());
  }

  /** Sells multiple selected `kind:id` entries and notifies listeners once. */
  public sellBatch(keys: readonly string[]): number {
    return ShopWeather.sellBatchDomain(this, keys, () => this.emit());
  }

  public buyGemShopItem(itemId: string): 'bought' | 'no_gems' {
    return ShopWeather.buyGemShopItemDomain(this, itemId, () => this.emit());
  }

  public useGemPotion(itemId: string): boolean {
    return ShopWeather.useGemPotionDomain(this, itemId, Date.now(), () => this.emit());
  }

  public getBoostRemainingSec(itemId: string, now = Date.now()): number {
    return ShopWeather.getBoostRemainingSecDomain(this, itemId, now);
  }

  public getActiveWeather(): WeatherDef {
    return ShopWeather.getActiveWeatherDomain(this);
  }

  public getWeatherRemainingSec(now = Date.now()): number {
    return ShopWeather.getWeatherRemainingSecDomain(this, now);
  }

  public getWeatherDamageMult(): number {
    return ShopWeather.getWeatherDamageMultDomain(this);
  }

  public getWeatherOreDropMult(): number {
    return ShopWeather.getWeatherOreDropMultDomain(this);
  }

  public getWeatherGemDropMult(): number {
    return ShopWeather.getWeatherGemDropMultDomain(this);
  }

  public syncWeather(
    now = Date.now(),
    rng: () => number = Math.random,
    emitChanges = true
  ): WeatherDef | null {
    return ShopWeather.syncWeatherDomain(this, now, rng, emitChanges, {
      emit: () => this.emit(),
      save: () => this.save(),
    });
  }

  public forceWeather(weatherId: WeatherId, now = Date.now(), emitChanges = true): WeatherDef {
    return ShopWeather.forceWeatherDomain(this, weatherId, now, emitChanges, {
      emit: () => this.emit(),
      save: () => this.save(),
    });
  }

  public getActiveFusionPassives(): FusionPassiveBonuses {
    return FusionDom.getActiveFusionPassiveBonuses(this.plotMiners, this.chibiStars);
  }

  public getActivePremiumPassives(): ActivePremiumPassives {
    return getActivePremiumPassiveBonuses(this.plotMiners, this.chibiStars);
  }

  public getActiveOmegaPassives(): ActiveOmegaPassives {
    return getActiveOmegaPassiveBonuses(this.plotMiners, this.chibiStars);
  }

  public getActiveAnomalyPassives(): ActiveAnomalyPassives {
    return getActiveAnomalyPassiveBonuses(this.plotMiners, this.chibiStars);
  }

  public getRiftWindowSnapshot(nowMs = Date.now()): RiftWindowSnapshot {
    return RiftDom.getRiftWindowSnapshot(nowMs, this.riftPassExpiresAt, this);
  }

  public getRiftSquadEffectiveDps(): number {
    return RiftDom.getRiftSquadEffectiveDpsDomain(this);
  }

  public buyRiftPass(nowMs = Date.now()): 'bought' | 'no_gems' | 'already_has_attempts' {
    return RiftDom.buyRiftPassDomain(this, nowMs, () => this.emit());
  }

  public startRiftBattle(nowMs = Date.now()): boolean {
    return RiftDom.startRiftBattleDomain(this, nowMs, () => this.emit());
  }

  public applyRiftSquadStrike(
    slotIndex: number,
    attackInterval = 0.85,
    isUltimate = false,
    rng: () => number = Math.random
  ) {
    return RiftDom.applyRiftSquadStrikeDomain(this, slotIndex, attackInterval, isUltimate, rng);
  }

  public applyRiftTapDamage(
    baseTapDmg = this.getTapDamage(Date.now(), false),
    baseCritChance = 0.15,
    baseCritMult = 2.5,
    rng: () => number = Math.random
  ) {
    return RiftDom.applyRiftTapDamageDomain(this, baseTapDmg, baseCritChance, baseCritMult, rng);
  }

  public stepRiftBattleTick(
    dtSec: number,
    totalSquadDps = this.getRiftSquadEffectiveDps(),
    nowMs = Date.now(),
    rng: () => number = Math.random
  ) {
    return RiftDom.stepRiftBattleTickDomain(this, dtSec, totalSquadDps, nowMs, rng, () => this.emit());
  }

  public retreatRiftBattle(nowMs = Date.now(), rng: () => number = Math.random): RiftBattleSummary | null {
    return RiftDom.retreatRiftBattleDomain(this, nowMs, rng, () => this.emit());
  }

  public clearRiftSummary(): void {
    this.riftLastSummary = null;
  }

  public claimRiftBreachReward(nowMs = Date.now(), rng?: () => number): RiftBreachClaimResult {
    return RiftDom.claimRiftBreachRewardDomain(this, nowMs, rng, () => this.emit());
  }

  public redeemAnomalyChibi(chibiId: string): 'redeemed' | 'no_shards' | 'invalid' {
    return RiftDom.redeemAnomalyChibiDomain(this, chibiId, () => this.emit());
  }

  public buyPremiumShopItem(chibiId: string): 'bought' | 'no_coins' | 'invalid' {
    const self = this;
    return buyPremiumShopChibiDomain(
      {
        get towerCoins() { return self.towerCoins; },
        set towerCoins(v: number) { self.towerCoins = v; },
        miners: this.miners,
        hotbar: this.hotbar,
        discovered: this.discovered,
        ...this.saveHooks,
      },
      chibiId
    );
  }

  public getTapDamage(nowMs = Date.now(), includeOverclock = true): number {
    return Multipliers.getTapDamageDomain(this, nowMs, includeOverclock);
  }

  public getMaxChestCapacity(): number {
    return Multipliers.getMaxChestCapacityDomain(this);
  }

  public getActiveOreNodeCount(): number {
    return Multipliers.getActiveOreNodeCountDomain(this);
  }

  public getOreHpScale(): number {
    return Multipliers.getOreHpScaleDomain(this);
  }

  public getOreValueMult(): number {
    return Multipliers.getOreValueMultDomain(this);
  }

  public getEffectiveOreSellValue(oreId: string): number {
    return Multipliers.getEffectiveOreSellValueDomain(this, oreId);
  }

  public getOreOutputMult(): number {
    return Multipliers.getOreOutputMultDomain(this);
  }

  public getPermanentOreDropMult(): number {
    return Multipliers.getOreOutputMultDomain(this, false);
  }

  public getTotalOreDropMult(nowMs = Date.now()): number {
    return Multipliers.getTotalOreDropMultDomain(this, nowMs);
  }

  public getRespawnSpeedMult(): number {
    return Multipliers.getRespawnSpeedMultDomain(this);
  }

  public getFindChanceBonus(): number {
    return Multipliers.getFindChanceBonusDomain(this);
  }

  public getCharacterLuckMult(): number {
    return Multipliers.getCharacterLuckMultDomain(this);
  }

  public getOreLuckMult(): number {
    return Multipliers.getOreLuckMultDomain(this);
  }

  public getPermanentOreLuckMult(): number {
    return Multipliers.getOreLuckMultDomain(this, false);
  }

  public getMutationLuckMult(): number {
    return Multipliers.getMutationLuckMultDomain(this);
  }

  // === RELIC FORGE ===
  public hasCraftedRelic(relicId: string): boolean {
    return this.craftedRelics.has(relicId);
  }

  public isRelicEquipped(relicId: string): boolean {
    return this.equippedRelics.includes(relicId);
  }

  public getTotalOwnedOreCount(oreId: string): number {
    return ResearchRelics.getTotalOwnedOreCountDomain(this, oreId);
  }

  public canCraftRelic(relicId: string): boolean {
    return ResearchRelics.canCraftRelicDomain(this, relicId);
  }

  public craftRelic(relicId: string): boolean {
    return ResearchRelics.craftRelicDomain(this, relicId, () => this.emit());
  }

  public toggleEquipRelic(relicId: string): 'equipped' | 'unequipped' | 'full' | 'not-crafted' {
    return ResearchRelics.toggleEquipRelicDomain(this, relicId, () => this.emit());
  }

  public getRelicBonus(stat: RelicEffectStat): number {
    return ResearchRelics.getRelicBonusDomain(this, stat);
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
    BountiesDom.recordBountyProgressDomain(this, 'roll_enchant_or_mut', 1);
    this.emit();
    return rolled;
  }

  public syncTowerKeys(now = Date.now()): void {
    TowerRun.syncTowerKeysDomain(this, now, () => this.save());
  }

  public getTowerNextKeyRegenSec(now = Date.now()): number {
    return TowerRun.getTowerNextKeyRegenSecDomain(this, now, () => this.save());
  }

  public getTowerUnitEffectiveDps(slotIndex: number): number {
    return TowerRun.getTowerUnitEffectiveDpsDomain(this, slotIndex);
  }

  public getTowerSlotStrikeDamage(slotIndex: number, attackIntervalSec = 0.85): number {
    return TowerRun.getTowerSlotStrikeDamageDomain(this, slotIndex, attackIntervalSec);
  }

  public getTowerEffectiveDps(): number {
    return TowerRun.getTowerEffectiveDpsDomain(this);
  }

  public getTowerEffectiveTapDamage(): number {
    return TowerRun.getTowerEffectiveTapDamageDomain(this);
  }

  public startTowerRun(startFloor = 1, now = Date.now(), rng: () => number = Math.random): boolean {
    return TowerRun.startTowerRunDomain(this, startFloor, now, rng, this.saveHooks);
  }

  public stepTowerTick(dtSec: number, rng: () => number = Math.random) {
    return TowerRun.stepTowerTickDomain(this, dtSec, rng, () => this.emit());
  }

  public applyTowerTargetDamage(
    targetOreIndex: number | null,
    rawDmg: number,
    rng: () => number = Math.random
  ) {
    const res = TowerRun.applyTowerTargetDamageDomain(this, targetOreIndex, rawDmg, rng, () => this.emit());
    if (res.waveCleared) {
      BountiesDom.recordBountyProgressDomain(this, 'clear_tower_wave', 1);
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
    return TowerRun.chooseTowerBlessingDomain(this, blessingId, rng, () => this.emit());
  }

  public rerollTowerBlessings(rng: () => number = Math.random): { ok: boolean; usedFree: boolean; costGems: number } {
    return TowerRun.rerollTowerBlessingsDomain(this, rng, this.saveHooks);
  }

  public hitTowerBossShieldSweetSpot() {
    return TowerRun.hitTowerBossShieldSweetSpotDomain(this, () => this.emit());
  }

  public abandonTowerRun(): TowerRunSummary | null {
    return TowerRun.finishTowerRunDomain(this, 'exit', () => this.emit());
  }

  public quickSweepTower(now = Date.now()): { ok: boolean; gemsAwarded: number } {
    return TowerRun.quickSweepTowerDomain(this, now, this.saveHooks);
  }

  public buyTowerKeyWithGems(): 'bought' | 'full' | 'no_gems' {
    return TowerRun.buyTowerKeyWithGemsDomain(this, this.saveHooks);
  }

  public grantFreeTowerKey(): boolean {
    return TowerRun.grantFreeTowerKeyDomain(this, this.saveHooks);
  }

  // === OMEGA BOSS SANCTUM ===
  public syncOmegaKeys(now = Date.now()): void { OmegaDom.syncOmegaKeysDomain(this, now, () => this.save()); }
  public getOmegaNextKeyRegenSec(now = Date.now()): number { return OmegaDom.getOmegaNextKeyRegenSecDomain(this, now, () => this.save()); }
  public getOmegaUnlockedMaxTier(bossId: OmegaBossId): 1 | 2 | 3 | 4 | 5 { return OmegaDom.getOmegaUnlockedMaxTierDomain(this, bossId); }
  public getOmegaSquadEffectiveDps(): number { return OmegaDom.getOmegaSquadEffectiveDpsDomain(this); }
  public buyOmegaKeyWithGems(): 'bought' | 'full' | 'no_gems' { return OmegaDom.buyOmegaKeyWithGemsDomain(this, this.saveHooks); }
  public grantFreeOmegaKey(): boolean { return OmegaDom.grantFreeOmegaKeyDomain(this, this.saveHooks); }
  public startOmegaBoss(bossId: OmegaBossId, tier: number, now = Date.now()): boolean { return OmegaDom.startOmegaBossDomain(this, bossId, tier, now, this.saveHooks); }
  public stepOmegaBossTick(dtSec: number, rng: () => number = Math.random) { return OmegaDom.stepOmegaBossTickDomain(this, dtSec, rng, () => this.emit()); }
  public tapOmegaInvulShield() { return OmegaDom.tapOmegaInvulShieldDomain(this, () => this.emit()); }
  public applyOmegaSquadStrike(slotIndex: number, attackIntervalSec = 0.85, rng: () => number = Math.random): OmegaStrikeResult { return OmegaDom.applyOmegaSquadStrikeDomain(this, slotIndex, attackIntervalSec, rng, () => this.emit()); }
  public triggerOmegaParry(rng: () => number = Math.random) { return OmegaDom.triggerOmegaParryDomain(this, rng, () => this.emit()); }
  public hitOmegaTargetObject(targetId: string, rng: () => number = Math.random) { return OmegaDom.hitOmegaTargetObjectDomain(this, targetId, rng, () => this.emit()); }
  public abandonOmegaBoss(): OmegaBattleSummary | null { return OmegaDom.finishOmegaBossDomain(this, 'retreat', Math.random, () => this.emit()); }
  public unlockOmegaChibi(bossId: OmegaBossId) { return OmegaDom.unlockOmegaChibiDomain(this, bossId, this.saveHooks); }
  public awakenOmegaChibi(bossId: OmegaBossId) { return OmegaDom.awakenOmegaChibiDomain(this, bossId, this.saveHooks); }

  public spendTowerCoins(amount: number): boolean {
    const safeCost = Math.max(0, Math.floor(amount));
    if (safeCost <= 0 || this.towerCoins < safeCost) return false;
    this.towerCoins -= safeCost;
    this.emit();
    return true;
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
    const summary = OfflineDom.computeOfflineEarningsDomain(this, nowMs, rng);
    this.lastSavedAt = prev;
    this.loadedLastSavedAt = 0;
    this.pendingOfflineEarnings = summary;
    return summary;
  }

  public claimOfflineEarnings(multiplier: 1 | 2 = 1, nowMs = Date.now()): OfflineClaimResult | null {
    const summary = this.pendingOfflineEarnings;
    if (!summary) return null;
    this.pendingOfflineEarnings = null;
    return OfflineDom.claimOfflineEarningsDomain(this, summary, multiplier, () => this.emit(), nowMs);
  }

  public isReturnRushActive(nowMs = Date.now()): boolean {
    return (this.activeBoosts[OfflineDom.RETURN_RUSH_BOOST_ID] ?? 0) > nowMs;
  }

  public getReturnRushRemainingSec(nowMs = Date.now()): number {
    const exp = this.activeBoosts[OfflineDom.RETURN_RUSH_BOOST_ID] ?? 0;
    return Math.max(0, Math.ceil((exp - nowMs) / 1000));
  }

  public getReadyBountyCount(): number { return BountiesDom.getReadyBountyCountDomain(this.bounties); }
  public claimBounty(bountyId: string, rng: () => number = Math.random): BountyClaimResult | null { return BountiesDom.claimBountyDomain(this, bountyId, rng, () => this.emit()); }
  public canClaimDailyLogin(now = Date.now()): boolean { return DailyLoginDom.canClaimDailyLoginDomain(this, now); }
  public getDailyLoginSnapshot(now = Date.now()): DailyLoginSnapshot { return DailyLoginDom.getDailyLoginSnapshotDomain(this, now); }
  public claimDailyLogin(now = Date.now()): DailyLoginRewardDef | null { return DailyLoginDom.claimDailyLoginDomain(this, now, () => this.emit()); }

  public chargeOverclock(amount: number, nowMs = Date.now()): boolean {
    if (this.riftBattle) return this.isOverclockActive(nowMs);
    const wasActive = this.isOverclockActive(nowMs);
    const mult = this.isReturnRushActive(nowMs) ? 1 + OfflineDom.RETURN_RUSH_FEVER_CHARGE_BONUS : 1;
    const activated = OverclockDom.chargeOverclockDomain(this.overclock, amount * mult, nowMs);
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
    return OverclockDom.extendOverclockDomain(this.overclock, extendSec, advanceTier, nowMs);
  }

  public stepOverclock(nowMs = Date.now()): boolean {
    return OverclockDom.stepOverclockDomain(this.overclock, nowMs);
  }

  public consumeOverclockEncoreUlt(
    nowMs = Date.now()
  ): { remaining: number; completed: number; total: number } {
    return OverclockDom.consumeOverclockEncoreUltDomain(this.overclock, nowMs);
  }

  public finishOverclockEncore(nowMs = Date.now()): boolean {
    const finished = OverclockDom.finishOverclockEncoreDomain(this.overclock, nowMs);
    if (finished) {
      this.emit();
    }
    return finished;
  }

  public isOverclockActive(nowMs = Date.now()): boolean { return OverclockDom.isOverclockActiveDomain(this.overclock, nowMs); }
  public getOverclockTier(nowMs = Date.now()): 0 | OverclockTier { return OverclockDom.getOverclockSnapshotDomain(this.overclock, nowMs).tier; }
  public getOverclockSnapshot(nowMs = Date.now()): OverclockSnapshot { return OverclockDom.getOverclockSnapshotDomain(this.overclock, nowMs); }
  public getAvailableFusionMinerCount(chibiId: string): number { return FusionDom.getAvailableFusionMinerCount(this.fusionCtx(), chibiId); }
  public getFusionOreCount(oreId: string): number { return FusionDom.getFusionOreCount(this.fusionCtx(), oreId); }
  public canFuseRecipe(recipeId: string): boolean { return FusionDom.canFuseRecipeDomain(this.fusionCtx(), recipeId); }
  public getReadyFusionCount(): number { return FusionDom.getReadyFusionCountDomain(this.fusionCtx()); }

  public fuseChibiRecipe(recipeId: string): FusionRecipeDef | null {
    const res = FusionDom.fuseChibiRecipeDomain(this.fusionCtx(), recipeId);
    if (res) {
      this.careerStats.fusionsCompleted += 1;
    }
    return res;
  }

  private fusionCtx(): FusionDomainContext {
    const self = this;
    return {
      get gems() { return self.gems; },
      set gems(v: number) { self.gems = v; },
      miners: self.miners,
      chestMiners: self.chestMiners,
      ores: self.ores,
      chestOres: self.chestOres,
      plotMiners: self.plotMiners,
      hotbar: self.hotbar,
      discovered: self.discovered,
      trimStashedUnitsFor: (id: string) => PlotUnits.trimStashedUnits(self, id),
      ...this.saveHooks,
    };
  }

  /** Unlocks the given Chibi IDs in `miners` and `discovered`, then saves and notifies listeners. */
  public unlockChibisByIds(chibiIds: readonly string[]): number {
    let newlyUnlocked = 0;
    for (const id of chibiIds) {
      if (!id) continue;
      if ((this.miners[id] || 0) < 1) newlyUnlocked++;
      this.miners[id] = Math.max(1, this.miners[id] || 0);
      this.discovered.add(id);
    }
    this.emit();
    return newlyUnlocked;
  }

  public isTwinTrialVisible(): boolean {
    return this.twinTrial.status === 'available' || this.twinTrial.status === 'active';
  }

  public isTwinTrialActive(nowMs = Date.now()): boolean {
    return this.twinTrial.status === 'active' && nowMs < this.twinTrial.expiresAt;
  }

  public getTwinTrialRemainingSec(nowMs = Date.now()): number {
    return TwinTrialDom.getTwinTrialRemainingSec(this.twinTrial, nowMs);
  }

  public isTrialPlotSlot(slotIndex: number): boolean {
    return Boolean(this.plotUnits[slotIndex]?.isTrial);
  }

  public isTrialOnlyChibi(chibiId: string): boolean {
    return (
      TwinTrialDom.getTrialOwnedCount(this.twinTrial, chibiId) > 0 &&
      TwinTrialDom.getPermanentMinerCount(this.miners, this.twinTrial, chibiId) <= 0
    );
  }

  public unlockTwinTrial(): boolean {
    const unlocked = TwinTrialDom.unlockTwinTrialDomain(this);
    if (unlocked) this.emit();
    return unlocked;
  }

  public claimTwinTrial(chibiId: string, nowMs = Date.now()): boolean {
    const claimed = TwinTrialDom.claimTwinTrialDomain(this, chibiId, nowMs);
    if (claimed) this.emit();
    return claimed;
  }

  public syncTwinTrial(nowMs = Date.now()): { expired: boolean; chibiId: string | null } {
    const res = TwinTrialDom.syncTwinTrialDomain(this, nowMs);
    if (res.expired) this.emit();
    return res;
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
