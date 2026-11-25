import { BASE_PIT_NODE_COUNT, MAX_PIT_NODE_COUNT } from '../game3d/MineWorldPalette';
import {
  getMinersByWorld,
  getOreById,
  getOresByWorld,
  getWorldById,
  WorldId,
} from './GameData';
import type { FusionPassiveBonuses } from './FusionDomain';
import type { ActiveOmegaPassives } from './OmegaData';
import type { ActivePremiumPassives } from './PremiumShopData';
import {
  ALL_INDEX_TABS,
  getIndexTabEntryIds,
  type IndexPassiveBonuses,
} from './IndexRewardsDomain';
import {
  getOverclockTierBuffs,
  type OverclockTier,
} from './OverclockDomain';
import type { RelicEffectStat } from './RelicData';
import {
  DENSE_ORE_DROP_MULT,
  DENSE_ORE_HP_MULT,
  type ResearchEffectType,
} from './ResearchData';
import { isBoostActiveDomain } from './ShopWeatherDomain';

export interface GameMultipliersContext {
  activeWorldId: WorldId;
  chestCapacity: number;
  activeBoosts: Record<string, number>;
  discovered: Set<string>;
  getRelicBonus: (stat: RelicEffectStat) => number;
  getActiveFusionPassives: () => FusionPassiveBonuses;
  getActivePremiumPassives?: () => ActivePremiumPassives;
  getActiveOmegaPassives?: () => ActiveOmegaPassives;
  getActiveAnomalyPassives?: () => { teamDmgPct: number; oreDropPct: number; oreSellPct: number };
  getActiveIndexPassiveBonuses: () => IndexPassiveBonuses;
  getAchievementAllDmgBonus: () => number;
  getActiveResearchBonus: (effectType: ResearchEffectType) => number;
  getWeatherDamageMult: () => number;
  getWeatherOreDropMult: () => number;
  getBasePlotDps?: () => number;
  isOverclockActive: (nowMs?: number) => boolean;
  getOverclockTier?: (nowMs?: number) => 0 | OverclockTier;
  getActiveStarDropAndGemBonus: () => { oreDropBonusPct: number; sellBonusPct: number; gemBonusPct: number };
  getActiveEnchantBonuses: () => { oreDropPct: number; sellValuePct: number };
  getActivePickaxeSellBonusPct?: () => number;
}

export function getTotalIndexCountDomain(): number {
  let total = 0;
  for (const tabId of ALL_INDEX_TABS) {
    total += getIndexTabEntryIds(tabId).length;
  }
  return total;
}

export function getDiscoveredCountDomain(discovered: ReadonlySet<string>): number {
  let count = 0;
  for (const tabId of ALL_INDEX_TABS) {
    for (const id of getIndexTabEntryIds(tabId)) {
      if (discovered.has(id)) count++;
    }
  }
  return count;
}

export function getWorldIndexProgressDomain(
  discovered: ReadonlySet<string>,
  worldId: WorldId
): { found: number; total: number; pct: number } {
  const ores = getOresByWorld(worldId);
  const miners = getMinersByWorld(worldId);
  const total = ores.length + miners.length;
  let found = 0;
  for (const o of ores) {
    if (discovered.has(o.id)) found++;
  }
  for (const m of miners) {
    if (discovered.has(m.entry.chibiId)) found++;
  }
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;
  return { found, total, pct };
}

export function getTapDamageDomain(
  ctx: GameMultipliersContext,
  nowMs = Date.now(),
  includeOverclock = true
): number {
  const tapMult =
    1 +
    ctx.getActiveIndexPassiveBonuses().allDmgPct +
    ctx.getAchievementAllDmgBonus();
  const tier: 0 | OverclockTier = !includeOverclock
    ? 0
    : ctx.getOverclockTier
      ? ctx.getOverclockTier(nowMs)
      : ctx.isOverclockActive(nowMs)
        ? 1
        : 0;
  const overclockMult = getOverclockTierBuffs(tier).tapMult;
  const basePlotShare = Math.round((ctx.getBasePlotDps ? ctx.getBasePlotDps() : 0) * 0.03);
  const preOverclock = Math.max(
    1,
    Math.round(
      (20 + ctx.getActiveResearchBonus('tapDamageFlat') + basePlotShare) *
        tapMult *
        ctx.getWeatherDamageMult()
    )
  );
  return Math.max(1, Math.round(preOverclock * overclockMult));
}

export function getMaxChestCapacityDomain(ctx: GameMultipliersContext): number {
  return ctx.chestCapacity + Math.round(ctx.getActiveResearchBonus('chestCapacityFlat'));
}

export function getActiveOreNodeCountDomain(ctx: GameMultipliersContext): number {
  return Math.min(MAX_PIT_NODE_COUNT, BASE_PIT_NODE_COUNT + Math.round(ctx.getActiveResearchBonus('extraOreNodes')));
}

export function getOreHpScaleDomain(ctx: GameMultipliersContext): number {
  const worldDef = getWorldById(ctx.activeWorldId);
  const denseStacks = Math.max(0, Math.round(ctx.getActiveResearchBonus('denseOreScale')));
  const denseHpMult = denseStacks > 0 ? Math.pow(DENSE_ORE_HP_MULT, denseStacks) : 1;
  return Math.max(0.25, worldDef.oreHpMult * denseHpMult);
}

export function getOreValueMultDomain(ctx: GameMultipliersContext, includeBoosts = true): number {
  const { sellBonusPct } = ctx.getActiveStarDropAndGemBonus();
  const premSell = ctx.getActivePremiumPassives?.().oreSellPct ?? 0;
  const omegaSell = ctx.getActiveOmegaPassives?.().oreSellPct ?? 0;
  const anomalySell = ctx.getActiveAnomalyPassives?.().oreSellPct ?? 0;
  const baseMult =
    1 +
    ctx.getActiveResearchBonus('oreValuePct') +
    sellBonusPct +
    ctx.getRelicBonus('oreValuePct') +
    ctx.getActiveFusionPassives().oreSellPct +
    premSell +
    omegaSell +
    anomalySell +
    ctx.getActiveEnchantBonuses().sellValuePct +
    ctx.getActiveIndexPassiveBonuses().oreSellPct;
  const pickaxeMult = 1 + (ctx.getActivePickaxeSellBonusPct?.() ?? 0);
  let potionMult = 1;
  if (includeBoosts) {
    if (isBoostActiveDomain(ctx, 'midas-elixir-1')) potionMult *= 1.5;
    if (isBoostActiveDomain(ctx, 'midas-elixir-2')) potionMult *= 2.0;
    if (isBoostActiveDomain(ctx, 'midas-elixir-3')) potionMult *= 3.0;
  }
  return baseMult * pickaxeMult * potionMult;
}

export function getEffectiveOreSellValueDomain(
  ctx: GameMultipliersContext,
  oreId: string,
  includeBoosts = true
): number {
  const def = getOreById(oreId);
  if (!def) return 0;
  return Math.round(def.sellValue * getOreValueMultDomain(ctx, includeBoosts));
}

export function getOreOutputMultDomain(ctx: GameMultipliersContext, includeBoosts = true): number {
  const { oreDropBonusPct } = ctx.getActiveStarDropAndGemBonus();
  const premDrop = ctx.getActivePremiumPassives?.().oreDropPct ?? 0;
  const omegaDrop = ctx.getActiveOmegaPassives?.().oreDropPct ?? 0;
  const anomalyDrop = ctx.getActiveAnomalyPassives?.().oreDropPct ?? 0;
  let mult =
    1 +
    ctx.getActiveResearchBonus('oreOutputPct') +
    oreDropBonusPct +
    ctx.getRelicBonus('oreDropPct') +
    ctx.getActiveFusionPassives().oreDropPct +
    premDrop +
    omegaDrop +
    anomalyDrop +
    ctx.getActiveEnchantBonuses().oreDropPct +
    ctx.getActiveIndexPassiveBonuses().oreDropPct;
  if (includeBoosts) {
    if (isBoostActiveDomain(ctx, 'ore-elixir-1')) mult += 0.5;
    if (isBoostActiveDomain(ctx, 'ore-elixir-2')) mult += 1.25;
    if (isBoostActiveDomain(ctx, 'ore-elixir-3')) mult += 2.5;
  }
  const denseStacks = Math.max(0, Math.round(ctx.getActiveResearchBonus('denseOreScale')));
  if (denseStacks > 0) mult *= Math.pow(DENSE_ORE_DROP_MULT, denseStacks);
  return mult;
}

export function getTotalOreDropMultDomain(ctx: GameMultipliersContext, nowMs = Date.now()): number {
  const tier: 0 | OverclockTier = ctx.getOverclockTier
    ? ctx.getOverclockTier(nowMs)
    : ctx.isOverclockActive(nowMs)
      ? 1
      : 0;
  const overclockMult = getOverclockTierBuffs(tier).dropMult;
  return getOreOutputMultDomain(ctx) * ctx.getWeatherOreDropMult() * overclockMult;
}

export function getRespawnSpeedMultDomain(ctx: GameMultipliersContext): number {
  const boost = isBoostActiveDomain(ctx, 'regrowth-potion') ? 6.0 : 1.0;
  return boost + ctx.getActiveResearchBonus('respawnSpeedPct');
}

export function getFindChanceBonusDomain(ctx: GameMultipliersContext): number {
  return (isBoostActiveDomain(ctx, 'unearth-elixir') ? 0.5 : 0) + ctx.getActiveResearchBonus('findChancePct');
}

export function getCharacterLuckMultDomain(ctx: GameMultipliersContext): number {
  const base = isBoostActiveDomain(ctx, 'character-luck-potion') ? 3.5 : 1.0;
  return base + ctx.getActiveResearchBonus('charLuckPct');
}

export function getOreLuckMultDomain(ctx: GameMultipliersContext, includeBoosts = true): number {
  const base = includeBoosts && isBoostActiveDomain(ctx, 'ore-luck-potion') ? 6.0 : 1.0;
  return base + ctx.getActiveResearchBonus('oreLuckPct');
}

export function getMutationLuckMultDomain(ctx: GameMultipliersContext): number {
  return isBoostActiveDomain(ctx, 'mutation-luck-1') ? 6.0 : 1.0;
}
