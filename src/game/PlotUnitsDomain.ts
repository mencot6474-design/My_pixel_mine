import { CHIBI_CATALOG, getChibiById } from '../game3d/ChibiCatalog';
import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import {
  CHIBI_MAX_STARS,
  computeWorldResonances,
  ENCHANTS,
  getChibiStarTier,
  getEffectiveChibiBaseDps,
  getEnchantById,
  getLatestWorldScaleAnchor,
  getMinersByWorld,
  getMinerWorldId,
  getMutationById,
  getNextChibiStarTier,
  getPickaxeById,
  getUnlockedWorldScaleAnchor,
  getWorldUpgradeCostScale,
  ItemRarity,
  PICKAXES,
  rollMutation,
  WEATHER_METEOR_CHIBIS,
  WorldId,
  WorldResonanceStatus,
} from './GameData';
import { compactHotbarSlots, PlotUnitState } from './GameStateSave';
import { getDailyLoginRewardByChibiId } from './DailyLoginData';
import { RelicEffectStat } from './RelicData';
import { getFusionRecipeByResultChibiId } from './FusionData';
import {
  computeOmegaUpgradeCostScale,
  getActiveOmegaPassiveBonuses,
  getOmegaBossByChibiId,
} from './OmegaData';
import {
  computeAnomalyUpgradeCostScale,
  getActiveAnomalyPassiveBonuses,
  getAnomalyChibiById,
} from './AnomalyData';
import {
  computeTwinUpgradeCostScale,
  getActivePremiumPassiveBonuses,
  getPremiumShopItemByChibiId,
} from './PremiumShopData';
import { getAchievementAllDmgBonusDomain } from './AchievementsDomain';
import { getActiveFusionPassiveBonuses } from './FusionDomain';
import { getActiveIndexPassiveBonusesDomain } from './IndexRewardsDomain';
import { RETURN_RUSH_BOOST_ID, RETURN_RUSH_SPEED_BONUS } from './OfflineEarningsDomain';
import { OverclockTier } from './OverclockDomain';
import { getOverclockTierBuffs } from './OverclockDomain';
import { ResearchEffectType } from './ResearchData';
import { getPermanentMinerCount, getTrialOwnedCount, type TwinTrialState } from './TwinTrialDomain';
import { WeatherId } from './WeatherData';

export const CHIBI_DMG_MULT_PER_LEVEL = 0.12;
export const CHIBI_BASE_CRIT_CHANCE = 0.05;
export const CHIBI_CRIT_PER_LEVEL = 0.03;
export const CHIBI_MAX_CRIT_CHANCE = 0.8;
export const CHIBI_CRIT_DMG_MULT = 2.25;

export interface PlotUnitStatsResult {
  dmg: number;
  nextDmg: number;
  dmgMult: number;
  nextDmgMult: number;
  critChance: number;
  nextCritChance: number;
  critMult: number;
  speed: number;
  miningMult: number;
  worth: number;
  dmgCost: number;
  speedCost: number;
  miningCost: number;
  mutationCost: number;
}

export interface DpsBreakdownUnitEntry {
  slotIndex: number;
  chibiId: string;
  name: string;
  rarity: ItemRarity;
  dps: number;
  pct: number;
  stars: number;
  enchantId: string | null;
}

export interface DpsBreakdownResult {
  tapDamage: number;
  totalPlotDps: number;
  units: DpsBreakdownUnitEntry[];
}

export interface PlotUnitsContext {
  cash: number;
  gems: number;
  miners: Record<string, number>;
  hotbar: (string | null)[];
  selectedHotbarSlot: number;
  plotMiners: (string | null)[];
  plotUnits: (PlotUnitState | null)[];
  stashedUnits: Record<string, PlotUnitState[]>;
  chibiStars: Record<string, number>;
  ownedPickaxes: Record<string, number>;
  ownedEnchants: Record<string, number>;
  activeBoosts?: Record<string, number>;
  claimedIndexRewards?: ReadonlySet<string>;
  claimedAchievements?: ReadonlySet<string>;
  unlockedWorlds?: readonly WorldId[];
  discovered?: ReadonlySet<string>;
  twinTrial?: TwinTrialState;
  getActiveResearchBonus(effectType: ResearchEffectType): number;
  getRelicBonus(stat: RelicEffectStat): number;
  getWeatherDamageMult(): number;
  getTapDamage(): number;
  getMutationLuckMult(): number;
  isOverclockActive?: (nowMs?: number) => boolean;
  getOverclockTier?: (nowMs?: number) => 0 | OverclockTier;
}

const WEATHER_UPGRADE_COST_SCALE: Record<WeatherId, number> = {
  light_rain: 2,
  snow_rain: 2_000,
  bloodmoon: 2_000_000,
  void: 2_000_000_000_000,
  celestial: 2_000_000_000_000_000,
};

/**
 * Scales plot upgrade costs by the chibi's home world (or weather meteor) economy
 * and a mild intra-world rarity premium (`+12%` per baseDps multiple above anchor)
 * so Exotic/Secret chibis stay slightly pricier without punishing progression.
 * Global progression units (`Twin`, `Omega`, `Limited`) honor unlocked-world scaling when provided.
 */
export function getChibiUpgradeCostMult(
  chibiId: string,
  unlockedWorlds?: readonly WorldId[],
  discovered?: ReadonlySet<string>
): number {
  const chibi = getChibiById(chibiId);
  if (!chibi) return 1;
  const worldId = getMinerWorldId(chibiId);
  if (!worldId) {
    const fusionRecipe = getFusionRecipeByResultChibiId(chibiId);
    if (fusionRecipe) {
      return fusionRecipe.upgradeCostScale;
    }
    const anchor =
      unlockedWorlds && unlockedWorlds.length > 0
        ? getUnlockedWorldScaleAnchor(unlockedWorlds, discovered)
        : getLatestWorldScaleAnchor();
    const premiumItem = getPremiumShopItemByChibiId(chibiId);
    if (premiumItem) {
      return computeTwinUpgradeCostScale(anchor.upgradeCostScale, premiumItem.upgradeCostMult);
    }
    const omegaBoss = getOmegaBossByChibiId(chibiId);
    if (omegaBoss) {
      return computeOmegaUpgradeCostScale(anchor.upgradeCostScale, omegaBoss.upgradeCostMult);
    }
    const anomalyChibi = getAnomalyChibiById(chibiId);
    if (anomalyChibi) {
      return computeAnomalyUpgradeCostScale(anchor.upgradeCostScale, anomalyChibi.upgradeCostMult);
    }
    const dailyReward = getDailyLoginRewardByChibiId(chibiId);
    if (dailyReward?.upgradeCostScale !== undefined) {
      if (unlockedWorlds && unlockedWorlds.length > 0) {
        return Math.min(dailyReward.upgradeCostScale, Math.max(2, anchor.upgradeCostScale * 2));
      }
      return dailyReward.upgradeCostScale;
    }
    for (const [weatherId, entries] of Object.entries(WEATHER_METEOR_CHIBIS) as Array<
      [WeatherId, readonly { chibiId: string; chancePct: number; rarity: string }[]]
    >) {
      if (entries.some((e) => e.chibiId === chibiId)) {
        return WEATHER_UPGRADE_COST_SCALE[weatherId] ?? 1;
      }
    }
    return 1;
  }

  const worldScale = getWorldUpgradeCostScale(worldId);
  const worldMiners = getMinersByWorld(worldId);
  let anchorBaseDps = chibi.baseDps;
  for (const m of worldMiners) {
    if (m.chibi.baseDps < anchorBaseDps) anchorBaseDps = m.chibi.baseDps;
  }
  const charRatio = anchorBaseDps > 0 ? chibi.baseDps / anchorBaseDps : 1;
  const mildRarityFactor = 1 + Math.max(0, charRatio - 1) * 0.12;
  return worldScale * mildRarityFactor;
}

/** Creates a baseline Lv.1 plot unit with default equipment and no mutation/enchant. */
export function createFreshPlotUnit(chibiId: string): PlotUnitState {
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

/** Returns true when a plot unit carries non-default upgrades, mutation, or enchant worth stashing. */
export function isUpgradedPlotUnit(u: PlotUnitState): boolean {
  return (
    u.damageLevel > 1 ||
    u.speedLevel > 1 ||
    u.miningSpeedLevel > 1 ||
    u.mutationId !== 'normal' ||
    u.enchantId !== null
  );
}

export function getChibiStarCount(ctx: Pick<PlotUnitsContext, 'chibiStars'>, chibiId: string): number {
  const raw = ctx.chibiStars[chibiId] ?? 0;
  return Math.max(0, Math.min(CHIBI_MAX_STARS, Math.floor(raw)));
}

export function getSpareChibiDuplicateCount(
  ctx: Pick<PlotUnitsContext, 'miners' | 'plotMiners' | 'plotUnits' | 'twinTrial'>,
  chibiId: string
): number {
  const permOwned = ctx.twinTrial
    ? getPermanentMinerCount(ctx.miners, ctx.twinTrial, chibiId)
    : ctx.miners[chibiId] || 0;
  if (permOwned <= 1) return 0;
  let placedPermCount = 0;
  for (let i = 0; i < ctx.plotMiners.length; i++) {
    if (ctx.plotMiners[i] === chibiId && !ctx.plotUnits?.[i]?.isTrial) {
      placedPermCount++;
    }
  }
  const minKeep = Math.max(1, placedPermCount);
  return Math.max(0, permOwned - minKeep);
}

export function canStarUpUnit(ctx: PlotUnitsContext, chibiId: string): boolean {
  if (!getChibiById(chibiId)) return false;
  const next = getNextChibiStarTier(getChibiStarCount(ctx, chibiId));
  if (!next) return false;
  return getSpareChibiDuplicateCount(ctx, chibiId) >= next.dupCost;
}

export function starUpUnit(
  ctx: PlotUnitsContext,
  chibiId: string,
  emit: () => void = () => {}
): { ok: true; newStar: number } | { ok: false; reason: 'max' | 'insufficient' | 'invalid' } {
  if (!getChibiById(chibiId) || (ctx.miners[chibiId] || 0) <= 0) {
    return { ok: false, reason: 'invalid' };
  }
  const current = getChibiStarCount(ctx, chibiId);
  const next = getNextChibiStarTier(current);
  if (!next) return { ok: false, reason: 'max' };
  if (getSpareChibiDuplicateCount(ctx, chibiId) < next.dupCost) {
    return { ok: false, reason: 'insufficient' };
  }
  const trialCount = ctx.twinTrial ? getTrialOwnedCount(ctx.twinTrial, chibiId) : 0;
  ctx.miners[chibiId] = Math.max(1 + trialCount, (ctx.miners[chibiId] || 0) - next.dupCost);
  ctx.chibiStars[chibiId] = next.star;
  emit();
  return { ok: true, newStar: next.star };
}

export function autoStarUpAllUnits(ctx: PlotUnitsContext, emit: () => void = () => {}): number {
  let upgrades = 0;
  for (const chibiId of Object.keys(ctx.miners)) {
    if (!getChibiById(chibiId) || (ctx.miners[chibiId] || 0) <= 1) continue;
    const trialCount = ctx.twinTrial ? getTrialOwnedCount(ctx.twinTrial, chibiId) : 0;
    let next = getNextChibiStarTier(getChibiStarCount(ctx, chibiId));
    while (next && getSpareChibiDuplicateCount(ctx, chibiId) >= next.dupCost) {
      ctx.miners[chibiId] = Math.max(1 + trialCount, (ctx.miners[chibiId] || 0) - next.dupCost);
      ctx.chibiStars[chibiId] = next.star;
      upgrades++;
      next = getNextChibiStarTier(next.star);
    }
  }
  if (upgrades > 0) emit();
  return upgrades;
}

export function getActiveWorldResonancesList(
  ctx: Pick<PlotUnitsContext, 'plotMiners'>
): WorldResonanceStatus[] {
  return computeWorldResonances(ctx.plotMiners);
}

export function getWorldResonanceDmgPct(
  ctx: Pick<PlotUnitsContext, 'plotMiners'>,
  worldId: WorldId | null
): number {
  if (!worldId) return 0;
  const match = computeWorldResonances(ctx.plotMiners).find((r) => r.worldId === worldId);
  return match ? match.tier.dmgBonusPct : 0;
}

export function getActiveStarAndResonanceBonuses(
  ctx: Pick<PlotUnitsContext, 'plotUnits' | 'plotMiners' | 'chibiStars'>
): { oreDropBonusPct: number; sellBonusPct: number; gemBonusPct: number } {
  let oreDropBonusPct = 0;
  let sellBonusPct = 0;
  let gemBonusPct = 0;
  for (const unit of ctx.plotUnits) {
    if (!unit) continue;
    const tier = getChibiStarTier(getChibiStarCount(ctx, unit.chibiId));
    if (tier.dropBonusPct > 0) {
      oreDropBonusPct += tier.dropBonusPct;
      gemBonusPct += tier.dropBonusPct;
    }
  }
  for (const res of computeWorldResonances(ctx.plotMiners)) {
    oreDropBonusPct += res.tier.oreDropBonusPct;
    sellBonusPct += res.tier.sellBonusPct;
    gemBonusPct += res.tier.gemBonusPct;
  }
  return { oreDropBonusPct, sellBonusPct, gemBonusPct };
}

/** Sums global Ore Drop and Sell Value bonuses from Enchants equipped on active plot Chibis. */
export function getActiveEnchantBonuses(
  ctx: Pick<PlotUnitsContext, 'plotUnits'>
): { oreDropPct: number; sellValuePct: number } {
  let oreDropPct = 0;
  let sellValuePct = 0;
  for (const unit of ctx.plotUnits) {
    if (!unit?.enchantId) continue;
    const enc = getEnchantById(unit.enchantId);
    if (!enc) continue;
    oreDropPct += enc.oreDropPct;
    sellValuePct += enc.sellValuePct;
  }
  return { oreDropPct, sellValuePct };
}

/** Computes pre-weather, pre-overclock effective base damage for a placed slot unit. */
function computeUnitBaseDmgParts(
  ctx: PlotUnitsContext,
  unit: PlotUnitState
): { effBaseDps: number; baseDmg: number; nextBaseDmg: number; dmgMult: number; nextDmgMult: number } | null {
  const chibi = getChibiById(unit.chibiId);
  if (!chibi) return null;
  const effBaseDps = getEffectiveChibiBaseDps(chibi.id, ctx.unlockedWorlds, ctx.discovered);
  const pick = unit.pickaxeId ? getPickaxeById(unit.pickaxeId) : null;
  const pickMult = pick ? pick.dmgMult : 1;
  const mut = getMutationById(unit.mutationId);
  const enc = getEnchantById(unit.enchantId);
  const encMult = enc ? enc.dmgMult : 1;
  const lvlScale = (lvl: number) => Math.pow(1.12, lvl - 1);
  const dmgResearchMult = 1 + ctx.getActiveResearchBonus('minerDmgPct') + ctx.getRelicBonus('minerDmgPct');
  const starTier = getChibiStarTier(getChibiStarCount(ctx, chibi.id));
  const resonanceDmgMult = 1 + getWorldResonanceDmgPct(ctx, getMinerWorldId(chibi.id));
  const fusionTeamDmgMult =
    1 +
    getActiveFusionPassiveBonuses(ctx.plotMiners, ctx.chibiStars).teamDmgPct +
    getActivePremiumPassiveBonuses(ctx.plotMiners, ctx.chibiStars).teamDmgPct +
    getActiveOmegaPassiveBonuses(ctx.plotMiners, ctx.chibiStars).teamDmgPct +
    getActiveAnomalyPassiveBonuses(ctx.plotMiners, ctx.chibiStars).teamDmgPct;
  const indexAllDmgMult =
    1 +
    (ctx.claimedIndexRewards ? getActiveIndexPassiveBonusesDomain(ctx.claimedIndexRewards).allDmgPct : 0) +
    (ctx.claimedAchievements ? getAchievementAllDmgBonusDomain(ctx.claimedAchievements) : 0);
  const dmgMult = Number((1 + (unit.speedLevel - 1) * CHIBI_DMG_MULT_PER_LEVEL).toFixed(2));
  const nextDmgMult =
    unit.speedLevel >= 17
      ? dmgMult
      : Number((1 + unit.speedLevel * CHIBI_DMG_MULT_PER_LEVEL).toFixed(2));
  const sharedMult =
    effBaseDps *
    dmgMult *
    pickMult *
    mut.mult *
    encMult *
    dmgResearchMult *
    starTier.dmgMult *
    resonanceDmgMult *
    fusionTeamDmgMult *
    indexAllDmgMult;
  return {
    effBaseDps,
    baseDmg: sharedMult * lvlScale(unit.damageLevel),
    nextBaseDmg: sharedMult * lvlScale(unit.damageLevel + 1),
    dmgMult,
    nextDmgMult,
  };
}

/** Computes effective DPS, next level DPS, speed, mining multiplier, worth, and upgrade costs for a plot slot. */
export function computePlotUnitStats(
  ctx: PlotUnitsContext,
  slotIndex: number,
  nowMs = Date.now()
): PlotUnitStatsResult | null {
  const unit = ctx.plotUnits[slotIndex];
  if (!unit) return null;
  const chibi = getChibiById(unit.chibiId);
  if (!chibi) return null;
  const parts = computeUnitBaseDmgParts(ctx, unit);
  if (!parts) return null;
  const { effBaseDps, baseDmg, nextBaseDmg, dmgMult, nextDmgMult } = parts;

  const enc = getEnchantById(unit.enchantId);
  const weatherDmgMult = ctx.getWeatherDamageMult();
  const starTier = getChibiStarTier(getChibiStarCount(ctx, chibi.id));
  const ocActive = ctx.isOverclockActive ? ctx.isOverclockActive(nowMs) : false;
  const ocTier = ocActive ? (ctx.getOverclockTier ? ctx.getOverclockTier(nowMs) : 1) : 0;
  const ocChibiDmgMult = ocActive ? getOverclockTierBuffs(ocTier || 1).chibiDmgMult : 1;
  const dmg = Math.round(baseDmg * weatherDmgMult * ocChibiDmgMult);
  const nextDmg = Math.round(nextBaseDmg * weatherDmgMult * ocChibiDmgMult);
  const returnRushSpeed =
    (ctx.activeBoosts?.[RETURN_RUSH_BOOST_ID] ?? 0) > nowMs ? RETURN_RUSH_SPEED_BONUS : 0;
  const speed = Math.round((10 + (unit.speedLevel - 1) * 2) * (1 + returnRushSpeed));
  const miningMult = Number(
    (
      1 +
      (unit.miningSpeedLevel - 1) * 0.1 +
      starTier.miningSpeedBonus +
      (enc ? enc.miningSpeedPct : 0) +
      returnRushSpeed
    ).toFixed(2)
  );
  const baseCrit =
    CHIBI_BASE_CRIT_CHANCE +
    starTier.miningSpeedBonus +
    (enc ? enc.miningSpeedPct * 0.25 : 0) +
    (returnRushSpeed > 0 ? 0.1 : 0);
  const critChance = Number(
    Math.min(CHIBI_MAX_CRIT_CHANCE, baseCrit + (unit.miningSpeedLevel - 1) * CHIBI_CRIT_PER_LEVEL).toFixed(3)
  );
  const nextCritChance =
    unit.miningSpeedLevel >= 16
      ? critChance
      : Number(
          Math.min(CHIBI_MAX_CRIT_CHANCE, baseCrit + unit.miningSpeedLevel * CHIBI_CRIT_PER_LEVEL).toFixed(3)
        );
  const critMult = CHIBI_CRIT_DMG_MULT;
  const worth = Math.round(baseDmg * 12);

  const upgradeCostMult = getChibiUpgradeCostMult(chibi.id, ctx.unlockedWorlds, ctx.discovered);
  const dmgCost = Math.round(50 * Math.pow(1.36, unit.damageLevel - 1) * upgradeCostMult);
  const speedCost = Math.round(75 * Math.pow(1.42, unit.speedLevel - 1) * upgradeCostMult);
  const miningCost = Math.round(90 * Math.pow(1.45, unit.miningSpeedLevel - 1) * upgradeCostMult);
  const mutationCost = Math.max(
    10,
    Math.round(12 + Math.pow(Math.max(0, Math.log10(Math.max(10, effBaseDps))), 2.35) * 0.8)
  );

  return {
    dmg,
    nextDmg,
    dmgMult,
    nextDmgMult,
    critChance,
    nextCritChance,
    critMult,
    speed,
    miningMult,
    worth,
    dmgCost,
    speedCost,
    miningCost,
    mutationCost,
  };
}

export function computeBasePlotDps(ctx: PlotUnitsContext): number {
  let total = 0;
  for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
    const unit = ctx.plotUnits[i];
    if (!unit) continue;
    const parts = computeUnitBaseDmgParts(ctx, unit);
    if (parts) total += Math.round(parts.baseDmg);
  }
  return total;
}

export function computeTotalPlotDps(ctx: PlotUnitsContext): number {
  let total = 0;
  for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
    const st = computePlotUnitStats(ctx, i);
    if (st) total += st.dmg;
  }
  return total;
}

export function computeDpsBreakdown(ctx: PlotUnitsContext): DpsBreakdownResult {
  const tapDamage = ctx.getTapDamage();
  const units: DpsBreakdownUnitEntry[] = [];
  let totalPlotDps = 0;
  for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
    const unit = ctx.plotUnits[i];
    const st = computePlotUnitStats(ctx, i);
    if (!unit || !st) continue;
    const chibi = getChibiById(unit.chibiId);
    if (!chibi) continue;
    totalPlotDps += st.dmg;
    units.push({
      slotIndex: i,
      chibiId: unit.chibiId,
      name: chibi.name,
      rarity: chibi.rarity,
      dps: st.dmg,
      pct: 0,
      stars: getChibiStarCount(ctx, chibi.id),
      enchantId: unit.enchantId,
    });
  }
  units.sort((a, b) => b.dps - a.dps);
  if (totalPlotDps > 0) {
    for (const u of units) {
      u.pct = (u.dps / totalPlotDps) * 100;
    }
  }
  return { tapDamage, totalPlotDps, units };
}

function getUnitRankScore(
  ctx: Pick<PlotUnitsContext, 'chibiStars' | 'unlockedWorlds' | 'discovered'>,
  u: PlotUnitState
): number {
  const chibi = getChibiById(u.chibiId) ?? CHIBI_CATALOG[0];
  const effBaseDps = getEffectiveChibiBaseDps(chibi.id, ctx.unlockedWorlds, ctx.discovered);
  const pick = u.pickaxeId ? getPickaxeById(u.pickaxeId) : null;
  const pickMult = pick ? pick.dmgMult : 1;
  const mut = getMutationById(u.mutationId);
  const enc = getEnchantById(u.enchantId);
  const encMult = enc ? enc.dmgMult : 1;
  const starMult = getChibiStarTier(getChibiStarCount(ctx, u.chibiId)).dmgMult;
  const lvlScale = Math.pow(1.22, u.damageLevel - 1);
  return effBaseDps * lvlScale * pickMult * mut.mult * encMult * starMult;
}

export function trimStashedUnits(
  ctx: Pick<PlotUnitsContext, 'miners' | 'plotMiners' | 'stashedUnits' | 'chibiStars'>,
  chibiId: string
): void {
  const arr = ctx.stashedUnits[chibiId];
  if (!arr || arr.length === 0) {
    delete ctx.stashedUnits[chibiId];
    return;
  }
  const owned = ctx.miners[chibiId] || 0;
  const onPlot = ctx.plotMiners.filter((id) => id === chibiId).length;
  const maxStash = Math.max(0, owned - onPlot);
  if (maxStash <= 0) {
    delete ctx.stashedUnits[chibiId];
  } else if (arr.length > maxStash) {
    arr.sort((a, b) => getUnitRankScore(ctx, b) - getUnitRankScore(ctx, a));
    ctx.stashedUnits[chibiId] = arr.slice(0, maxStash);
  }
}

function stashPlotUnit(ctx: PlotUnitsContext, unit: PlotUnitState | null): void {
  if (!unit) return;
  if (unit.pickaxeId) {
    ctx.ownedPickaxes[unit.pickaxeId] = (ctx.ownedPickaxes[unit.pickaxeId] || 0) + 1;
    unit.pickaxeId = '';
  }
  if (!isUpgradedPlotUnit(unit)) return;
  const arr = ctx.stashedUnits[unit.chibiId] ?? [];
  arr.push(unit);
  arr.sort((a, b) => getUnitRankScore(ctx, b) - getUnitRankScore(ctx, a));
  ctx.stashedUnits[unit.chibiId] = arr;
  trimStashedUnits(ctx, unit.chibiId);
}

function popStashedUnit(ctx: PlotUnitsContext, chibiId: string): PlotUnitState | null {
  const arr = ctx.stashedUnits[chibiId];
  if (!arr || arr.length === 0) return null;
  const unit = arr.shift() ?? null;
  if (arr.length === 0) delete ctx.stashedUnits[chibiId];
  return unit;
}

export function equipChibiOnPlotSlot(
  ctx: PlotUnitsContext,
  slotIndex: number,
  chibiId: string,
  emit: () => void = () => {}
): 'placed' | 'replaced' | 'same' | 'limit' {
  if (ctx.plotMiners[slotIndex] === chibiId && !(ctx.stashedUnits[chibiId]?.length)) {
    return 'same';
  }
  const owned = ctx.miners[chibiId] || 0;
  const placedOther = ctx.plotMiners.filter((id, idx) => idx !== slotIndex && id === chibiId).length;
  if (placedOther >= owned) {
    return 'limit';
  }
  const prevUnit = ctx.plotUnits[slotIndex];
  const hadPrev = Boolean(ctx.plotMiners[slotIndex]);
  const nextUnit = popStashedUnit(ctx, chibiId) ?? createFreshPlotUnit(chibiId);
  if (ctx.twinTrial) {
    const permOwned = getPermanentMinerCount(ctx.miners, ctx.twinTrial, chibiId);
    let placedOtherPerm = 0;
    for (let i = 0; i < ctx.plotMiners.length; i++) {
      if (i !== slotIndex && ctx.plotMiners[i] === chibiId && !ctx.plotUnits[i]?.isTrial) {
        placedOtherPerm++;
      }
    }
    if (placedOtherPerm >= permOwned) {
      nextUnit.isTrial = true;
    } else {
      delete nextUnit.isTrial;
    }
  }
  ctx.plotMiners[slotIndex] = chibiId;
  ctx.plotUnits[slotIndex] = nextUnit;
  stashPlotUnit(ctx, prevUnit);
  emit();
  return hadPrev ? 'replaced' : 'placed';
}

export function placeHotbarItemOnPlotSlot(
  ctx: PlotUnitsContext,
  hotbarSlot: number,
  plotSlotIndex: number,
  emit: () => void = () => {}
): 'placed' | 'replaced' | 'same' | 'limit' | 'not-miner' | 'invalid' {
  if (!Number.isInteger(hotbarSlot) || hotbarSlot < 0 || hotbarSlot >= 9) return 'invalid';
  if (!Number.isInteger(plotSlotIndex) || plotSlotIndex < 0 || plotSlotIndex >= STAGE_PEDESTAL_COUNT) {
    return 'invalid';
  }
  const itemId = ctx.hotbar[hotbarSlot];
  if (!itemId) return 'invalid';
  if (!getChibiById(itemId) || (ctx.miners[itemId] || 0) <= 0) return 'not-miner';
  return equipChibiOnPlotSlot(ctx, plotSlotIndex, itemId, emit);
}

export function placeSelectedOnPlotSlot(
  ctx: PlotUnitsContext,
  slotIndex: number,
  emit: () => void = () => {}
): 'placed' | 'limit' | 'inspect' | 'need-select' {
  if (slotIndex < 0 || slotIndex >= STAGE_PEDESTAL_COUNT) return 'need-select';
  const selectedId =
    ctx.selectedHotbarSlot >= 0 && ctx.selectedHotbarSlot < 9
      ? ctx.hotbar[ctx.selectedHotbarSlot]
      : null;

  if (selectedId && getChibiById(selectedId)) {
    const res = equipChibiOnPlotSlot(ctx, slotIndex, selectedId, emit);
    return res === 'limit' ? 'limit' : 'placed';
  }

  if (ctx.plotMiners[slotIndex]) {
    return 'inspect';
  }

  return 'need-select';
}

export function removeMinerFromPlotSlot(
  ctx: PlotUnitsContext,
  slotIndex: number,
  emit: () => void = () => {}
): void {
  if (slotIndex < 0 || slotIndex >= STAGE_PEDESTAL_COUNT) return;
  const prevUnit = ctx.plotUnits[slotIndex];
  ctx.plotMiners[slotIndex] = null;
  ctx.plotUnits[slotIndex] = null;
  stashPlotUnit(ctx, prevUnit);
  emit();
}

export function upgradeUnitDamage(
  ctx: PlotUnitsContext,
  slotIndex: number,
  emit: () => void = () => {}
): boolean {
  const unit = ctx.plotUnits[slotIndex];
  const stats = computePlotUnitStats(ctx, slotIndex);
  if (!unit || unit.isTrial || !stats || unit.damageLevel >= 100 || ctx.cash < stats.dmgCost) return false;
  ctx.cash -= stats.dmgCost;
  unit.damageLevel++;
  emit();
  return true;
}

export function upgradeUnitSpeed(
  ctx: PlotUnitsContext,
  slotIndex: number,
  emit: () => void = () => {}
): boolean {
  const unit = ctx.plotUnits[slotIndex];
  const stats = computePlotUnitStats(ctx, slotIndex);
  if (!unit || unit.isTrial || !stats || unit.speedLevel >= 17 || ctx.cash < stats.speedCost) return false;
  ctx.cash -= stats.speedCost;
  unit.speedLevel++;
  emit();
  return true;
}

export function upgradeUnitMiningSpeed(
  ctx: PlotUnitsContext,
  slotIndex: number,
  emit: () => void = () => {}
): boolean {
  const unit = ctx.plotUnits[slotIndex];
  const stats = computePlotUnitStats(ctx, slotIndex);
  if (!unit || unit.isTrial || !stats || unit.miningSpeedLevel >= 16 || ctx.cash < stats.miningCost) return false;
  ctx.cash -= stats.miningCost;
  unit.miningSpeedLevel++;
  emit();
  return true;
}

export function buyOrEquipUnitPickaxe(
  ctx: PlotUnitsContext,
  slotIndex: number,
  pickaxeId: string,
  emit: () => void = () => {}
): 'equipped' | 'unequipped' | 'locked' {
  const unit = ctx.plotUnits[slotIndex];
  const pick = PICKAXES.find((p) => p.id === pickaxeId);
  if (!unit || unit.isTrial || !pick) return 'locked';

  if (unit.pickaxeId === pickaxeId) {
    ctx.ownedPickaxes[pickaxeId] = (ctx.ownedPickaxes[pickaxeId] || 0) + 1;
    unit.pickaxeId = '';
    emit();
    return 'unequipped';
  }

  const owned = ctx.ownedPickaxes[pickaxeId] || 0;
  if (owned <= 0) return 'locked';

  if (unit.pickaxeId) {
    ctx.ownedPickaxes[unit.pickaxeId] = (ctx.ownedPickaxes[unit.pickaxeId] || 0) + 1;
  }
  ctx.ownedPickaxes[pickaxeId] = owned - 1;
  if (ctx.ownedPickaxes[pickaxeId] <= 0) delete ctx.ownedPickaxes[pickaxeId];
  unit.pickaxeId = pickaxeId;
  emit();
  return 'equipped';
}

export function rollUnitMutation(
  ctx: PlotUnitsContext,
  slotIndex: number,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): string | null {
  const unit = ctx.plotUnits[slotIndex];
  const stats = computePlotUnitStats(ctx, slotIndex);
  if (!unit || unit.isTrial || !stats || ctx.gems < stats.mutationCost) return null;
  ctx.gems -= stats.mutationCost;
  const mut = rollMutation(rng, ctx.getMutationLuckMult());
  unit.mutationId = mut.id;
  emit();
  return mut.name;
}

export function getAvailableEnchantUnitsCount(
  ctx: Pick<PlotUnitsContext, 'ownedEnchants' | 'plotUnits' | 'stashedUnits'>,
  enchantId: string
): number {
  const totalOwned = ctx.ownedEnchants[enchantId] || 0;
  if (totalOwned <= 0) return 0;
  let used = 0;
  for (const u of ctx.plotUnits) {
    if (u?.enchantId === enchantId) used++;
  }
  for (const arr of Object.values(ctx.stashedUnits)) {
    if (!Array.isArray(arr)) continue;
    for (const u of arr) {
      if (u?.enchantId === enchantId) used++;
    }
  }
  return Math.max(0, totalOwned - used);
}

export function toggleUnitEnchant(
  ctx: PlotUnitsContext,
  slotIndex: number,
  enchantId: string,
  emit: () => void = () => {}
): boolean {
  const unit = ctx.plotUnits[slotIndex];
  const enc = ENCHANTS.find((e) => e.id === enchantId);
  if (!unit || unit.isTrial || !enc) return false;

  if (unit.enchantId === enchantId) {
    unit.enchantId = null;
    emit();
    return true;
  }

  if (getAvailableEnchantUnitsCount(ctx, enchantId) <= 0) return false;
  unit.enchantId = enchantId;
  emit();
  return true;
}

/** Places the highest-ranked owned chibi units across plot pedestals and updates hotbar slots. */
export function equipBestUnitsToPlots(
  ctx: PlotUnitsContext,
  emit: () => void = () => {}
): void {
  const poolByChibi = new Map<string, PlotUnitState[]>();
  const pushPool = (unit: PlotUnitState | null) => {
    if (!unit) return;
    const list = poolByChibi.get(unit.chibiId) ?? [];
    list.push(unit);
    poolByChibi.set(unit.chibiId, list);
  };

  for (const u of ctx.plotUnits) pushPool(u);
  for (const arr of Object.values(ctx.stashedUnits)) {
    if (Array.isArray(arr)) {
      for (const u of arr) pushPool(u);
    }
  }
  ctx.stashedUnits = {};

  for (const list of poolByChibi.values()) {
    list.sort((a, b) => {
      if (Boolean(a.isTrial) !== Boolean(b.isTrial)) return a.isTrial ? 1 : -1;
      const diff = getUnitRankScore(ctx, b) - getUnitRankScore(ctx, a);
      if (diff !== 0) return diff;
      const lvlB = b.damageLevel + b.speedLevel + b.miningSpeedLevel;
      const lvlA = a.damageLevel + a.speedLevel + a.miningSpeedLevel;
      return lvlB - lvlA;
    });
  }

  const candidates: Array<{ chibiId: string; unit: PlotUnitState; score: number; baseDps: number }> = [];
  for (const [id, qty] of Object.entries(ctx.miners)) {
    if (qty <= 0) continue;
    const def = getChibiById(id) ?? CHIBI_CATALOG[0];
    const pool = poolByChibi.get(id) ?? [];
    const permCount = ctx.twinTrial ? getPermanentMinerCount(ctx.miners, ctx.twinTrial, id) : qty;
    for (let q = 0; q < qty; q++) {
      const unit = pool.shift() ?? createFreshPlotUnit(def.id);
      if (ctx.twinTrial) {
        if (q < permCount) delete unit.isTrial;
        else unit.isTrial = true;
      }
      candidates.push({
        chibiId: def.id,
        unit,
        score: getUnitRankScore(ctx, unit),
        baseDps: getEffectiveChibiBaseDps(def.id, ctx.unlockedWorlds, ctx.discovered),
      });
    }
  }

  // Return pickaxes from any orphaned pool entries no longer owned
  for (const leftovers of poolByChibi.values()) {
    for (const u of leftovers) {
      if (u.pickaxeId) {
        ctx.ownedPickaxes[u.pickaxeId] = (ctx.ownedPickaxes[u.pickaxeId] || 0) + 1;
        u.pickaxeId = '';
      }
    }
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.baseDps - a.baseDps ||
      (a.unit.isTrial ? 1 : 0) - (b.unit.isTrial ? 1 : 0)
  );

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

  ctx.plotMiners = nextPlotMiners;
  ctx.plotUnits = nextPlotUnits;
  for (const u of displacedUnits) {
    stashPlotUnit(ctx, u);
  }

  const nextHotbar: (string | null)[] = Array(9).fill(null);
  let hbIdx = 0;
  for (const cand of candidates) {
    if (hbIdx >= 9) break;
    if (!nextHotbar.includes(cand.chibiId)) {
      nextHotbar[hbIdx++] = cand.chibiId;
    }
  }
  ctx.hotbar = nextHotbar;
  compactHotbarSlots(ctx);
  emit();
}
