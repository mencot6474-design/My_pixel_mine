export interface CareerStats {
  oresBroken: number;
  critTaps: number;
  highestCrit: number;
  overclockTriggers: number;
  fusionsCompleted: number;
}

export type AchievementCategoryId =
  | 'ore_breaker'
  | 'crit_striker'
  | 'overclock_surge'
  | 'index_collector'
  | 'tower_conqueror'
  | 'relic_forgemaster'
  | 'bounty_hunter'
  | 'world_explorer';

export interface AchievementTierDef {
  id: string;
  categoryId: AchievementCategoryId;
  tier: 1 | 2 | 3 | 4 | 5;
  target: number;
  gems: number;
  enchantDice: number;
}

export interface AchievementCategoryDef {
  id: AchievementCategoryId;
  title: string;
  description: string;
  iconKind: 'pickaxe' | 'crit' | 'overclock' | 'index' | 'tower' | 'relic' | 'bounty' | 'world';
  tiers: readonly AchievementTierDef[];
}

export interface AchievementProgressSnapshot {
  oresBroken: number;
  critTaps: number;
  overclockTriggers: number;
  discoveredCount: number;
  towerBestFloor: number;
  craftedRelicsCount: number;
  bountiesCompleted: number;
  unlockedWorldsCount: number;
}

export interface AchievementClaimContext {
  claimedAchievements: Set<string>;
  gems: number;
  enchantDice: number;
  getAchievementSnapshot(): AchievementProgressSnapshot;
}

export interface AchievementClaimResult {
  tier: AchievementTierDef;
  category: AchievementCategoryDef;
  gemsGranted: number;
  diceGranted: number;
}

export const ACHIEVEMENT_DMG_BONUS_PER_TIER = 0.01; // +1% All DMG per claimed tier

export function createDefaultCareerStats(): CareerStats {
  return {
    oresBroken: 0,
    critTaps: 0,
    highestCrit: 0,
    overclockTriggers: 0,
    fusionsCompleted: 0,
  };
}

function buildTiers(
  categoryId: AchievementCategoryId,
  targets: readonly [number, number, number, number, number],
  gems: readonly [number, number, number, number, number],
  dice: readonly [number, number, number, number, number]
): readonly AchievementTierDef[] {
  return ([1, 2, 3, 4, 5] as const).map((tier, idx) => ({
    id: `${categoryId}:${tier}`,
    categoryId,
    tier,
    target: targets[idx],
    gems: gems[idx],
    enchantDice: dice[idx],
  }));
}

export const ACHIEVEMENT_CATEGORIES: readonly AchievementCategoryDef[] = [
  {
    id: 'ore_breaker',
    title: 'Ore Breaker',
    description: 'Break ores in the Mine pit',
    iconKind: 'pickaxe',
    tiers: buildTiers(
      'ore_breaker',
      [25, 150, 750, 3000, 12000],
      [300, 800, 2000, 5000, 12000],
      [0, 0, 1, 2, 3]
    ),
  },
  {
    id: 'crit_striker',
    title: 'Critical Striker',
    description: 'Land Critical Tap hits on ores',
    iconKind: 'crit',
    tiers: buildTiers(
      'crit_striker',
      [10, 50, 200, 750, 2500],
      [300, 900, 2200, 5500, 14000],
      [0, 0, 1, 2, 3]
    ),
  },
  {
    id: 'overclock_surge',
    title: 'Overclock Surge',
    description: 'Trigger Overclock Fever mode',
    iconKind: 'overclock',
    tiers: buildTiers(
      'overclock_surge',
      [1, 5, 15, 40, 100],
      [400, 1000, 2500, 6000, 15000],
      [0, 0, 1, 2, 3]
    ),
  },
  {
    id: 'index_collector',
    title: 'Index Collector',
    description: 'Discover unique Ores & Chibis',
    iconKind: 'index',
    tiers: buildTiers(
      'index_collector',
      [12, 30, 55, 80, 105],
      [500, 1500, 4000, 12000, 35000],
      [0, 1, 1, 2, 4]
    ),
  },
  {
    id: 'tower_conqueror',
    title: 'Tower Conqueror',
    description: 'Clear Gem Tower floors',
    iconKind: 'tower',
    tiers: buildTiers(
      'tower_conqueror',
      [1, 5, 15, 30, 50],
      [600, 2000, 5000, 12000, 25000],
      [0, 1, 2, 3, 4]
    ),
  },
  {
    id: 'relic_forgemaster',
    title: 'Relic Forgemaster',
    description: 'Craft unique Relics in the Forge',
    iconKind: 'relic',
    tiers: buildTiers(
      'relic_forgemaster',
      [1, 3, 6, 9, 12],
      [800, 2500, 6000, 14000, 25000],
      [0, 1, 2, 3, 4]
    ),
  },
  {
    id: 'bounty_hunter',
    title: 'Bounty Hunter',
    description: 'Complete Mining Bounties',
    iconKind: 'bounty',
    tiers: buildTiers(
      'bounty_hunter',
      [1, 5, 15, 35, 75],
      [400, 1200, 3000, 7500, 18000],
      [0, 0, 1, 2, 3]
    ),
  },
  {
    id: 'world_explorer',
    title: 'World Explorer',
    description: 'Unlock new Mining Worlds',
    iconKind: 'world',
    tiers: buildTiers(
      'world_explorer',
      [2, 3, 5, 7, 8],
      [600, 1800, 4500, 15000, 40000],
      [0, 1, 2, 3, 5]
    ),
  },
];

const TIER_BY_ID = new Map<string, { category: AchievementCategoryDef; tier: AchievementTierDef }>();
for (const cat of ACHIEVEMENT_CATEGORIES) {
  for (const tier of cat.tiers) {
    TIER_BY_ID.set(tier.id, { category: cat, tier });
  }
}

export const TOTAL_ACHIEVEMENT_TIERS = TIER_BY_ID.size;

export function isValidAchievementTierId(id: string): boolean {
  return TIER_BY_ID.has(id);
}

export function getAchievementProgressValue(
  snapshot: AchievementProgressSnapshot,
  categoryId: AchievementCategoryId
): number {
  switch (categoryId) {
    case 'ore_breaker':
      return snapshot.oresBroken;
    case 'crit_striker':
      return snapshot.critTaps;
    case 'overclock_surge':
      return snapshot.overclockTriggers;
    case 'index_collector':
      return snapshot.discoveredCount;
    case 'tower_conqueror':
      return snapshot.towerBestFloor;
    case 'relic_forgemaster':
      return snapshot.craftedRelicsCount;
    case 'bounty_hunter':
      return snapshot.bountiesCompleted;
    case 'world_explorer':
      return snapshot.unlockedWorldsCount;
  }
}

export function getActiveAchievementTierForCategory(
  category: AchievementCategoryDef,
  claimed: ReadonlySet<string>
): AchievementTierDef {
  for (const t of category.tiers) {
    if (!claimed.has(t.id)) return t;
  }
  return category.tiers[category.tiers.length - 1];
}

export function getReadyAchievementCountDomain(
  snapshot: AchievementProgressSnapshot,
  claimed: ReadonlySet<string>
): number {
  let ready = 0;
  for (const cat of ACHIEVEMENT_CATEGORIES) {
    const val = getAchievementProgressValue(snapshot, cat.id);
    for (const t of cat.tiers) {
      if (!claimed.has(t.id) && val >= t.target) {
        ready++;
      }
    }
  }
  return ready;
}

export function claimAchievementTierDomain(
  ctx: AchievementClaimContext,
  tierId: string
): AchievementClaimResult | null {
  const entry = TIER_BY_ID.get(tierId);
  if (!entry) return null;
  if (ctx.claimedAchievements.has(tierId)) return null;
  const val = getAchievementProgressValue(ctx.getAchievementSnapshot(), entry.category.id);
  if (val < entry.tier.target) return null;

  ctx.claimedAchievements.add(tierId);
  ctx.gems += entry.tier.gems;
  ctx.enchantDice += entry.tier.enchantDice;
  return {
    tier: entry.tier,
    category: entry.category,
    gemsGranted: entry.tier.gems,
    diceGranted: entry.tier.enchantDice,
  };
}

export function getAchievementAllDmgBonusDomain(claimed: ReadonlySet<string>): number {
  let count = 0;
  for (const id of claimed) {
    if (TIER_BY_ID.has(id)) count++;
  }
  return count * ACHIEVEMENT_DMG_BONUS_PER_TIER;
}
