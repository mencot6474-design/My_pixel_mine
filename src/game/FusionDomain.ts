import {
  FUSION_RECIPES,
  FusionPassiveStat,
  FusionRecipeDef,
  getFusionRecipeById,
  getFusionRecipeByResultChibiId,
} from './FusionData';

export type FusionPassiveBonuses = Record<FusionPassiveStat, number>;

/**
 * Computes active global Fusion Passive bonuses from unique Fusion Chibis currently
 * deployed on plots (each unique Fusion Chibi activates its signature passive once).
 */
export function getActiveFusionPassiveBonuses(plotMiners: readonly (string | null)[]): FusionPassiveBonuses {
  const totals: FusionPassiveBonuses = {
    teamDmgPct: 0,
    oreSellPct: 0,
    oreDropPct: 0,
  };
  const seen = new Set<string>();
  for (const chibiId of plotMiners) {
    if (!chibiId || seen.has(chibiId)) continue;
    const recipe = getFusionRecipeByResultChibiId(chibiId);
    if (!recipe) continue;
    seen.add(chibiId);
    totals[recipe.passive.stat] += recipe.passive.value;
  }
  return totals;
}

export interface FusionDomainContext {
  gems: number;
  miners: Record<string, number>;
  chestMiners: Record<string, number>;
  ores: Record<string, number>;
  chestOres: Record<string, number>;
  plotMiners: (string | null)[];
  hotbar: (string | null)[];
  discovered: Set<string>;
  trimStashedUnitsFor: (chibiId: string) => void;
  save: () => void;
  emit: () => void;
}

export function countPlacedMiners(plotMiners: readonly (string | null)[], chibiId: string): number {
  let placed = 0;
  for (const id of plotMiners) {
    if (id === chibiId) placed++;
  }
  return placed;
}

/** Total unplaced copies of a chibi (bag + chest minus copies currently deployed on plots). */
export function getAvailableFusionMinerCount(ctx: FusionDomainContext, chibiId: string): number {
  const owned = (ctx.miners[chibiId] || 0) + (ctx.chestMiners[chibiId] || 0);
  const placed = countPlacedMiners(ctx.plotMiners, chibiId);
  return Math.max(0, owned - placed);
}

/** Total owned copies of an ore across bag + chest. */
export function getFusionOreCount(ctx: FusionDomainContext, oreId: string): number {
  return (ctx.ores[oreId] || 0) + (ctx.chestOres[oreId] || 0);
}

export function canFuseRecipeDomain(ctx: FusionDomainContext, recipeId: string): boolean {
  const recipe = getFusionRecipeById(recipeId);
  if (!recipe) return false;
  if (ctx.gems < recipe.gemCost) return false;
  for (const ing of recipe.requiredMiners) {
    if (getAvailableFusionMinerCount(ctx, ing.chibiId) < ing.count) return false;
  }
  for (const ing of recipe.requiredOres) {
    if (getFusionOreCount(ctx, ing.oreId) < ing.count) return false;
  }
  return true;
}

export function getReadyFusionCountDomain(ctx: FusionDomainContext): number {
  let count = 0;
  for (const r of FUSION_RECIPES) {
    if (canFuseRecipeDomain(ctx, r.id)) count++;
  }
  return count;
}

export function fuseChibiRecipeDomain(ctx: FusionDomainContext, recipeId: string): FusionRecipeDef | null {
  const recipe = getFusionRecipeById(recipeId);
  if (!recipe || !canFuseRecipeDomain(ctx, recipeId)) return null;

  ctx.gems -= recipe.gemCost;

  for (const ing of recipe.requiredMiners) {
    let rem = ing.count;
    const bagAvail = Math.max(0, (ctx.miners[ing.chibiId] || 0) - countPlacedMiners(ctx.plotMiners, ing.chibiId));
    const takeBag = Math.min(bagAvail, rem);
    if (takeBag > 0) {
      ctx.miners[ing.chibiId] = Math.max(0, (ctx.miners[ing.chibiId] || 0) - takeBag);
      if (ctx.miners[ing.chibiId] === 0) delete ctx.miners[ing.chibiId];
      rem -= takeBag;
    }
    if (rem > 0) {
      const chestHave = ctx.chestMiners[ing.chibiId] || 0;
      const takeChest = Math.min(chestHave, rem);
      if (takeChest > 0) {
        ctx.chestMiners[ing.chibiId] = Math.max(0, chestHave - takeChest);
        if (ctx.chestMiners[ing.chibiId] === 0) delete ctx.chestMiners[ing.chibiId];
        rem -= takeChest;
      }
    }
    ctx.trimStashedUnitsFor(ing.chibiId);
    if (!ctx.miners[ing.chibiId]) {
      for (let i = 0; i < ctx.hotbar.length; i++) {
        if (ctx.hotbar[i] === ing.chibiId) ctx.hotbar[i] = null;
      }
    }
  }

  for (const ing of recipe.requiredOres) {
    let rem = ing.count;
    const bagHave = ctx.ores[ing.oreId] || 0;
    const takeBag = Math.min(bagHave, rem);
    if (takeBag > 0) {
      ctx.ores[ing.oreId] = Math.max(0, bagHave - takeBag);
      if (ctx.ores[ing.oreId] === 0) delete ctx.ores[ing.oreId];
      rem -= takeBag;
    }
    if (rem > 0) {
      const chestHave = ctx.chestOres[ing.oreId] || 0;
      const takeChest = Math.min(chestHave, rem);
      if (takeChest > 0) {
        ctx.chestOres[ing.oreId] = Math.max(0, chestHave - takeChest);
        if (ctx.chestOres[ing.oreId] === 0) delete ctx.chestOres[ing.oreId];
      }
    }
    if (!ctx.ores[ing.oreId]) {
      for (let i = 0; i < ctx.hotbar.length; i++) {
        if (ctx.hotbar[i] === ing.oreId) ctx.hotbar[i] = null;
      }
    }
  }

  ctx.miners[recipe.resultChibiId] = (ctx.miners[recipe.resultChibiId] || 0) + 1;
  ctx.discovered.add(recipe.resultChibiId);
  if (!ctx.hotbar.includes(recipe.resultChibiId)) {
    const emptyIdx = ctx.hotbar.indexOf(null);
    if (emptyIdx !== -1) ctx.hotbar[emptyIdx] = recipe.resultChibiId;
  }

  ctx.save();
  ctx.emit();
  return recipe;
}
