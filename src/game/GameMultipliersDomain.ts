import { MAX_PIT_NODE_COUNT } from '../game3d/MineWorldPalette';
import {
  getMinersByWorld,
  getOreById,
  getOresByWorld,
  getWorldById,
  WorldId,
} from './GameData';
import type { FusionPassiveBonuses } from './FusionDomain';
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
  getActiveIndexPassiveBonuses: () => IndexPassiveBonuses;
  getAchievementAllDmgBonus: () => number;
  getActiveResearchBonus: (effectType: ResearchEffectType) => number;
  getWeatherDamageMult: () => number;
  getWeatherOreDropMult: () => number;
  isOverclockActive: (nowMs?: number) => boolean;
  getOverclockTier?: (nowMs?: number) => 0 | OverclockTier;
  getActiveStarDropAndGemBonus: () => { oreDropBonusPct: number; sellBonusPct: number; gemBonusPct: number };
  getActiveEnchantBonuses: () => { oreDropPct: number; sellValuePct: number };
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

export function getTapDamageDomain(ctx: GameMultipliersContext, nowMs = Date.now()): number {
  const tapMult =
    1 +
    ctx.getRelicBonus('tapDmgPct') +
    ctx.getActiveFusionPassives().tapDmgPct +
    ctx.getActiveIndexPassiveBonuses().allDmgPct +
    ctx.getAchievementAllDmgBonus();
  const tier: 0 | OverclockTier = ctx.getOverclockTier
    ? ctx.getOverclockTier(nowMs)
    : ctx.isOverclockActive(nowMs)
      ? 1
      : 0;
  const overclockMult = getOverclockTierBuffs(tier).tapMult;
  return Math.max(
    1,
    Math.round((20 + ctx.getActiveResearchBonus('tapDamageFlat')) * tapMult * ctx.getWeatherDamageMult() * overclockMult)
  );
}

export function getMaxChestCapacityDomain(ctx: GameMultipliersContext): number {
  return (
    ctx.chestCapacity +
    Math.round(ctx.getActiveResearchBonus('chestCapacityFlat') + ctx.getRelicBonus('chestCapacityFlat'))
  );
}

export function getActiveOreNodeCountDomain(ctx: GameMultipliersContext): number {
  return Math.min(MAX_PIT_NODE_COUNT, 1 + Math.round(ctx.getActiveResearchBonus('extraOreNodes')));
}

export function getOreHpScaleDomain(ctx: GameMultipliersContext): number {
  const worldDef = getWorldById(ctx.activeWorldId);
  const fragility = Math.min(0.75, Math.max(0, ctx.getActiveResearchBonus('oreFragilityPct')));
  const denseStacks = Math.max(0, Math.round(ctx.getActiveResearchBonus('denseOreScale')));
  const denseHpMult = denseStacks > 0 ? Math.pow(DENSE_ORE_HP_MULT, denseStacks) : 1;
  return Math.max(0.25, worldDef.oreHpMult * (1 - fragility) * denseHpMult);
}

export function getOreValueMultDomain(ctx: GameMultipliersContext): number {
  const { sellBonusPct } = ctx.getActiveStarDropAndGemBonus();
  return (
    1 +
    ctx.getActiveResearchBonus('oreValuePct') +
    sellBonusPct +
    ctx.getRelicBonus('oreValuePct') +
    ctx.getActiveFusionPassives().oreSellPct +
    ctx.getActiveEnchantBonuses().sellValuePct +
    ctx.getActiveIndexPassiveBonuses().oreSellPct
  );
}

export function getEffectiveOreSellValueDomain(ctx: GameMultipliersContext, oreId: string): number {
  const def = getOreById(oreId);
  if (!def) return 0;
  return Math.round(def.sellValue * getOreValueMultDomain(ctx));
}

export function getOreOutputMultDomain(ctx: GameMultipliersContext): number {
  const { oreDropBonusPct } = ctx.getActiveStarDropAndGemBonus();
  let mult =
    1 +
    ctx.getActiveResearchBonus('oreOutputPct') +
    oreDropBonusPct +
    ctx.getRelicBonus('oreDropPct') +
    ctx.getActiveFusionPassives().oreDropPct +
    ctx.getActiveEnchantBonuses().oreDropPct +
    ctx.getActiveIndexPassiveBonuses().oreDropPct;
  if (isBoostActiveDomain(ctx, 'ore-elixir-1')) mult += 0.1;
  if (isBoostActiveDomain(ctx, 'ore-elixir-2')) mult += 0.25;
  if (isBoostActiveDomain(ctx, 'ore-elixir-3')) mult += 0.5;
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
  const boost = isBoostActiveDomain(ctx, 'regrowth-potion') ? 2.0 : 1.0;
  return boost + ctx.getActiveResearchBonus('respawnSpeedPct');
}

export function getFindChanceBonusDomain(ctx: GameMultipliersContext): number {
  return (isBoostActiveDomain(ctx, 'unearth-elixir') ? 0.1 : 0) + ctx.getActiveResearchBonus('findChancePct');
}

export function getCharacterLuckMultDomain(ctx: GameMultipliersContext): number {
  const base = isBoostActiveDomain(ctx, 'character-luck-potion') ? 1.5 : 1.0;
  return base + ctx.getActiveResearchBonus('charLuckPct');
}

export function getOreLuckMultDomain(ctx: GameMultipliersContext): number {
  const base = isBoostActiveDomain(ctx, 'ore-luck-potion') ? 2.0 : 1.0;
  return base + ctx.getActiveResearchBonus('oreLuckPct') + ctx.getRelicBonus('oreLuckPct');
}

export function getMutationLuckMultDomain(ctx: GameMultipliersContext): number {
  const base = isBoostActiveDomain(ctx, 'mutation-luck-1') ? 2.0 : 1.0;
  return base + ctx.getRelicBonus('mutationLuckPct');
}
