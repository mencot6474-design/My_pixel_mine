import { WORLDS, WorldId, getWorldById, getWorldIndex, getWorldStarterChibiId } from './GameData';
import {
  RESEARCH_NODES,
  ResearchEffectType,
  ResearchTreeId,
  getNodeNextCost,
  getResearchNodeById,
  getResearchNodesForTree,
  getResearchTreeMaxPoints,
} from './ResearchData';
import { MAX_EQUIPPED_RELICS, RelicEffectStat, getRelicById } from './RelicData';
import type { ResearchLevelsMap } from './GameStateSave';
import { removeFromHotbarDomain, type LootChestContext } from './LootChestDomain';

export interface ResearchRelicsContext extends LootChestContext {
  cash: number;
  gems: number;
  activeWorldId: WorldId;
  unlockedWorlds: WorldId[];
  researchLevels: ResearchLevelsMap;
  craftedRelics: Set<string>;
  equippedRelics: string[];
}

export function isWorldUnlockedDomain(ctx: ResearchRelicsContext, worldId: WorldId): boolean {
  return ctx.unlockedWorlds.includes(worldId);
}

export function getResearchLevelDomain(ctx: ResearchRelicsContext, nodeId: string): number {
  const node = getResearchNodeById(nodeId);
  if (!node) return 0;
  return ctx.researchLevels[node.treeId]?.[node.id] ?? 0;
}

export function getTreeSpentPointsDomain(ctx: ResearchRelicsContext, treeId: ResearchTreeId): number {
  let sum = 0;
  for (const node of getResearchNodesForTree(treeId)) {
    sum += Math.min(node.maxLevel, getResearchLevelDomain(ctx, node.id));
  }
  return sum;
}

export function isTreeCompleteDomain(ctx: ResearchRelicsContext, treeId: ResearchTreeId): boolean {
  const maxPts = getResearchTreeMaxPoints(treeId);
  return maxPts > 0 && getTreeSpentPointsDomain(ctx, treeId) >= maxPts;
}

export function isNodePrereqMetDomain(ctx: ResearchRelicsContext, nodeId: string): boolean {
  const node = getResearchNodeById(nodeId);
  if (!node) return false;
  if (node.treeId !== 'core' && !isWorldUnlockedDomain(ctx, node.treeId)) return false;
  for (const reqId of node.requires) {
    if (getResearchLevelDomain(ctx, reqId) < 1) return false;
  }
  return true;
}

export function canUpgradeResearchDomain(
  ctx: ResearchRelicsContext,
  nodeId: string
): 'ok' | 'locked-world' | 'locked-prereq' | 'maxed' | 'no-cash' {
  const node = getResearchNodeById(nodeId);
  if (!node) return 'locked-prereq';
  if (node.treeId !== 'core' && !isWorldUnlockedDomain(ctx, node.treeId)) return 'locked-world';
  const lvl = getResearchLevelDomain(ctx, nodeId);
  if (lvl >= node.maxLevel) return 'maxed';
  if (!isNodePrereqMetDomain(ctx, nodeId)) return 'locked-prereq';
  const cost = getNodeNextCost(node, lvl);
  if (ctx.cash < cost) return 'no-cash';
  return 'ok';
}

export function upgradeResearchDomain(
  ctx: ResearchRelicsContext,
  nodeId: string,
  emit: () => void
): boolean {
  if (canUpgradeResearchDomain(ctx, nodeId) !== 'ok') return false;
  const node = getResearchNodeById(nodeId)!;
  const lvl = getResearchLevelDomain(ctx, nodeId);
  const cost = getNodeNextCost(node, lvl);
  ctx.cash -= cost;
  ctx.researchLevels[node.treeId][node.id] = lvl + 1;
  emit();
  return true;
}

export function getAffordableResearchCountDomain(ctx: ResearchRelicsContext): number {
  let count = 0;
  for (const node of RESEARCH_NODES) {
    if (canUpgradeResearchDomain(ctx, node.id) === 'ok') count++;
  }
  return count;
}

export function canUnlockWorldDomain(
  ctx: ResearchRelicsContext,
  worldId: WorldId
): 'ok' | 'unlocked' | 'locked-prereq' | 'no-cash' {
  if (isWorldUnlockedDomain(ctx, worldId)) return 'unlocked';
  const idx = getWorldIndex(worldId);
  if (idx <= 0) return 'unlocked';
  const prevWorld = WORLDS[idx - 1];
  if (!isWorldUnlockedDomain(ctx, prevWorld.id) || !isTreeCompleteDomain(ctx, prevWorld.id)) {
    return 'locked-prereq';
  }
  const target = WORLDS[idx];
  if (ctx.cash < target.unlockCost) return 'no-cash';
  return 'ok';
}

export function unlockWorldDomain(
  ctx: ResearchRelicsContext,
  worldId: WorldId,
  emit: () => void
): boolean {
  if (canUnlockWorldDomain(ctx, worldId) !== 'ok') return false;
  const def = getWorldById(worldId);
  ctx.cash -= def.unlockCost;
  if (!ctx.unlockedWorlds.includes(worldId)) {
    ctx.unlockedWorlds.push(worldId);
  }
  const starterId = getWorldStarterChibiId(worldId);
  if (starterId) {
    ctx.miners[starterId] = (ctx.miners[starterId] || 0) + 1;
    ctx.discovered?.add(starterId);
  }
  ctx.activeWorldId = worldId;
  emit();
  return true;
}

/** Core research applies everywhere; world research is strictly isolated to activeWorldId. */
export function getActiveResearchBonusDomain(
  ctx: ResearchRelicsContext,
  effectType: ResearchEffectType
): number {
  let total = 0;
  for (const node of RESEARCH_NODES) {
    if (node.effectType !== effectType) continue;
    if (node.treeId !== 'core' && node.treeId !== ctx.activeWorldId) continue;
    const lvl = Math.min(node.maxLevel, ctx.researchLevels[node.treeId]?.[node.id] ?? 0);
    if (lvl > 0) total += node.perLevel * lvl;
  }
  return total;
}

export function setActiveWorldDomain(
  ctx: ResearchRelicsContext,
  worldId: WorldId,
  emit: () => void
): boolean {
  if (!isWorldUnlockedDomain(ctx, worldId)) return false;
  if (ctx.activeWorldId === worldId) return true;
  ctx.activeWorldId = worldId;
  emit();
  return true;
}

export function getTotalOwnedOreCountDomain(ctx: ResearchRelicsContext, oreId: string): number {
  return (ctx.ores[oreId] || 0) + (ctx.chestOres[oreId] || 0);
}

export function canCraftRelicDomain(ctx: ResearchRelicsContext, relicId: string): boolean {
  const def = getRelicById(relicId);
  if (!def || ctx.craftedRelics.has(relicId)) return false;
  if (ctx.gems < def.gemCost) return false;
  for (const ing of def.ingredients) {
    if (getTotalOwnedOreCountDomain(ctx, ing.oreId) < ing.amount) return false;
  }
  return true;
}

export function craftRelicDomain(
  ctx: ResearchRelicsContext,
  relicId: string,
  emit: () => void
): boolean {
  const def = getRelicById(relicId);
  if (!def || !canCraftRelicDomain(ctx, relicId)) return false;
  ctx.gems -= def.gemCost;
  for (const ing of def.ingredients) {
    let rem = ing.amount;
    const inBag = ctx.ores[ing.oreId] || 0;
    if (inBag > 0) {
      const takeBag = Math.min(inBag, rem);
      ctx.ores[ing.oreId] = inBag - takeBag;
      if (ctx.ores[ing.oreId] <= 0) {
        delete ctx.ores[ing.oreId];
        removeFromHotbarDomain(ctx, ing.oreId);
      }
      rem -= takeBag;
    }
    if (rem > 0) {
      const inChest = ctx.chestOres[ing.oreId] || 0;
      const takeChest = Math.min(inChest, rem);
      ctx.chestOres[ing.oreId] = inChest - takeChest;
      if (ctx.chestOres[ing.oreId] <= 0) delete ctx.chestOres[ing.oreId];
    }
  }
  ctx.craftedRelics.add(relicId);
  if (ctx.equippedRelics.length < MAX_EQUIPPED_RELICS && !ctx.equippedRelics.includes(relicId)) {
    ctx.equippedRelics.push(relicId);
  }
  emit();
  return true;
}

export function toggleEquipRelicDomain(
  ctx: ResearchRelicsContext,
  relicId: string,
  emit: () => void
): 'equipped' | 'unequipped' | 'full' | 'not-crafted' {
  if (!ctx.craftedRelics.has(relicId)) return 'not-crafted';
  const idx = ctx.equippedRelics.indexOf(relicId);
  if (idx >= 0) {
    ctx.equippedRelics.splice(idx, 1);
    emit();
    return 'unequipped';
  }
  if (ctx.equippedRelics.length >= MAX_EQUIPPED_RELICS) return 'full';
  ctx.equippedRelics.push(relicId);
  emit();
  return 'equipped';
}

export function getRelicBonusDomain(ctx: ResearchRelicsContext, stat: RelicEffectStat): number {
  let total = 0;
  for (const id of ctx.equippedRelics) {
    const def = getRelicById(id);
    if (!def) continue;
    total += def.effects[stat] ?? 0;
  }
  return total;
}
