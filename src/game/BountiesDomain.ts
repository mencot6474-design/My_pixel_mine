import { getWorldById, getWorldIndex, WorldId } from './GameData';

export const BOUNTY_SLOT_COUNT = 3;

export type BountyKind =
  | 'mine_ores'
  | 'break_rare_ore'
  | 'sell_ores'
  | 'upgrade_chibi'
  | 'roll_enchant_or_mut'
  | 'clear_tower_wave'
  | 'shatter_meteor';

export type BountyRewardKind = 'gems' | 'dice' | 'cash';

export interface BountyEntry {
  id: string;
  kind: BountyKind;
  title: string;
  target: number;
  progress: number;
  rewardKind: BountyRewardKind;
  rewardAmount: number;
}

export interface BountyClaimResult {
  title: string;
  rewardKind: BountyRewardKind;
  rewardAmount: number;
}

export interface BountiesContext {
  cash: number;
  gems: number;
  enchantDice: number;
  activeWorldId: WorldId;
  bounties: BountyEntry[];
  bountiesCompleted: number;
}

interface BountyTemplate {
  kind: BountyKind;
  label: (target: number) => string;
  baseTarget: number;
  targetStep: number;
  rewardKind: BountyRewardKind;
  baseReward: number;
}

const BOUNTY_TEMPLATES: readonly BountyTemplate[] = [
  {
    kind: 'mine_ores',
    label: (t) => `Break ${t} Ore Nodes`,
    baseTarget: 12,
    targetStep: 6,
    rewardKind: 'gems',
    baseReward: 35,
  },
  {
    kind: 'break_rare_ore',
    label: (t) => `Break ${t} Veins or Geodes`,
    baseTarget: 4,
    targetStep: 2,
    rewardKind: 'gems',
    baseReward: 50,
  },
  {
    kind: 'sell_ores',
    label: (t) => `Sell Ores ${t} Times`,
    baseTarget: 2,
    targetStep: 1,
    rewardKind: 'cash',
    baseReward: 600,
  },
  {
    kind: 'upgrade_chibi',
    label: (t) => `Upgrade Chibi Stats ${t}x`,
    baseTarget: 3,
    targetStep: 2,
    rewardKind: 'gems',
    baseReward: 40,
  },
  {
    kind: 'roll_enchant_or_mut',
    label: (t) => `Roll Mutation or Enchant ${t}x`,
    baseTarget: 2,
    targetStep: 1,
    rewardKind: 'dice',
    baseReward: 1,
  },
  {
    kind: 'clear_tower_wave',
    label: (t) => `Clear ${t} Tower Waves`,
    baseTarget: 3,
    targetStep: 2,
    rewardKind: 'gems',
    baseReward: 65,
  },
  {
    kind: 'shatter_meteor',
    label: (t) => `Shatter ${t} Weather Meteor${t > 1 ? 's' : ''}`,
    baseTarget: 1,
    targetStep: 0,
    rewardKind: 'dice',
    baseReward: 1,
  },
];

let bountySeq = 1;

export function isValidBountyEntry(raw: unknown): raw is BountyEntry {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  const validKind = BOUNTY_TEMPLATES.some((t) => t.kind === obj.kind);
  const validReward = obj.rewardKind === 'gems' || obj.rewardKind === 'dice' || obj.rewardKind === 'cash';
  return (
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    validKind &&
    typeof obj.title === 'string' &&
    typeof obj.target === 'number' &&
    Number.isFinite(obj.target) &&
    obj.target >= 1 &&
    typeof obj.progress === 'number' &&
    Number.isFinite(obj.progress) &&
    obj.progress >= 0 &&
    validReward &&
    typeof obj.rewardAmount === 'number' &&
    Number.isFinite(obj.rewardAmount) &&
    obj.rewardAmount >= 1
  );
}

export function generateBountyEntry(
  ctx: Pick<BountiesContext, 'activeWorldId' | 'bountiesCompleted'>,
  excludeKinds: ReadonlySet<BountyKind>,
  rng: () => number = Math.random
): BountyEntry {
  const pool = BOUNTY_TEMPLATES.filter((t) => !excludeKinds.has(t.kind));
  const candidates = pool.length > 0 ? pool : BOUNTY_TEMPLATES;
  const idx = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
  const tpl = candidates[idx];

  const worldIdx = Math.max(0, getWorldIndex(ctx.activeWorldId));
  const tier = Math.min(4, Math.floor(ctx.bountiesCompleted / 6));
  const target = Math.max(1, tpl.baseTarget + tpl.targetStep * Math.min(3, tier));

  let rewardAmount = tpl.baseReward;
  if (tpl.rewardKind === 'gems') {
    rewardAmount = Math.round(tpl.baseReward * (1 + worldIdx * 0.45 + tier * 0.25));
  } else if (tpl.rewardKind === 'cash') {
    const world = getWorldById(ctx.activeWorldId);
    const worldBase = Math.max(600, Math.round(world.unlockCost * 0.08));
    rewardAmount = Math.round(worldBase * (1 + tier * 0.35));
  } else {
    rewardAmount = tpl.baseReward + (worldIdx >= 3 ? 1 : 0);
  }

  const id = `bty_${tpl.kind}_${bountySeq++}_${Math.floor(rng() * 100_000)}`;
  return {
    id,
    kind: tpl.kind,
    title: tpl.label(target),
    target,
    progress: 0,
    rewardKind: tpl.rewardKind,
    rewardAmount,
  };
}

export function ensureBountiesPopulatedDomain(
  ctx: BountiesContext,
  rng: () => number = Math.random
): void {
  const valid: BountyEntry[] = [];
  const usedKinds = new Set<BountyKind>();
  for (const b of ctx.bounties) {
    if (isValidBountyEntry(b) && !usedKinds.has(b.kind) && valid.length < BOUNTY_SLOT_COUNT) {
      valid.push({
        ...b,
        progress: Math.max(0, Math.min(b.target, Math.floor(b.progress))),
      });
      usedKinds.add(b.kind);
    }
  }
  while (valid.length < BOUNTY_SLOT_COUNT) {
    const next = generateBountyEntry(ctx, usedKinds, rng);
    valid.push(next);
    usedKinds.add(next.kind);
  }
  ctx.bounties = valid;
}

export function recordBountyProgressDomain(
  ctx: Pick<BountiesContext, 'bounties'>,
  kind: BountyKind,
  amount = 1
): number {
  const delta = Math.max(0, Math.floor(amount));
  if (delta <= 0) return 0;
  let newlyReady = 0;
  for (const b of ctx.bounties) {
    if (b.kind !== kind || b.progress >= b.target) continue;
    b.progress = Math.min(b.target, b.progress + delta);
    if (b.progress >= b.target) {
      newlyReady++;
    }
  }
  return newlyReady;
}

export function getReadyBountyCountDomain(bounties: readonly BountyEntry[]): number {
  let count = 0;
  for (const b of bounties) {
    if (b.progress >= b.target) count++;
  }
  return count;
}

export function claimBountyDomain(
  ctx: BountiesContext,
  bountyId: string,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): BountyClaimResult | null {
  const idx = ctx.bounties.findIndex((b) => b.id === bountyId);
  if (idx < 0) return null;
  const bounty = ctx.bounties[idx];
  if (bounty.progress < bounty.target) return null;

  if (bounty.rewardKind === 'gems') {
    ctx.gems += bounty.rewardAmount;
  } else if (bounty.rewardKind === 'dice') {
    ctx.enchantDice += bounty.rewardAmount;
  } else {
    ctx.cash += bounty.rewardAmount;
  }

  ctx.bountiesCompleted += 1;

  const exclude = new Set<BountyKind>(ctx.bounties.map((b) => b.kind));
  ctx.bounties[idx] = generateBountyEntry(ctx, exclude, rng);

  emit();
  return {
    title: bounty.title,
    rewardKind: bounty.rewardKind,
    rewardAmount: bounty.rewardAmount,
  };
}
