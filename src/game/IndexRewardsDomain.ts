import { getDailyLoginLimitedChibiIds } from './DailyLoginData';
import { FUSION_RECIPES } from './FusionData';
import {
  getMinersByWorld,
  getOresByWorld,
  getWeatherLimitedMiners,
  WEATHER_ORES,
  WorldId,
  WORLDS,
} from './GameData';
import { PREMIUM_SHOP_ITEMS } from './PremiumShopData';
import { OMEGA_BOSS_DEFS } from './OmegaData';
import { ANOMALY_CHIBI_DEFS } from './AnomalyData';

export type IndexTabId = WorldId | 'weather' | 'fusion' | 'limited' | 'twin' | 'omega' | 'anomaly';

export type IndexPassiveKind = 'oreSellPct' | 'oreDropPct' | 'allDmgPct';

export interface IndexMilestonePassive {
  kind: IndexPassiveKind;
  value: number;
  label: string;
}

export interface IndexMilestoneDef {
  id: string;
  tabId: IndexTabId;
  thresholdPct: 50 | 100;
  gems: number;
  enchantDice: number;
  passive?: IndexMilestonePassive;
}

export interface IndexPassiveBonuses {
  oreSellPct: number;
  oreDropPct: number;
  allDmgPct: number;
}

export interface IndexTabProgress {
  found: number;
  total: number;
  pct: number;
}

export interface IndexRewardClaimResult {
  milestone: IndexMilestoneDef;
  gemsGranted: number;
  diceGranted: number;
}

export interface IndexRewardClaimContext {
  discovered: ReadonlySet<string>;
  claimedIndexRewards: Set<string>;
  gems: number;
  enchantDice: number;
}

export const ALL_INDEX_TABS: readonly IndexTabId[] = [
  ...WORLDS.map((w) => w.id),
  'weather',
  'fusion',
  'limited',
  'twin',
  'omega',
  'anomaly',
];

const TAB_MILESTONE_CONFIG: Record<
  IndexTabId,
  {
    half: { gems: number; enchantDice: number };
    full: { gems: number; enchantDice: number; passive: IndexMilestonePassive };
  }
> = {
  underground: {
    half: { gems: 500, enchantDice: 0 },
    full: {
      gems: 1500,
      enchantDice: 1,
      passive: { kind: 'oreSellPct', value: 0.05, label: '+5% Ore Sell' },
    },
  },
  crystal: {
    half: { gems: 1200, enchantDice: 0 },
    full: {
      gems: 3000,
      enchantDice: 1,
      passive: { kind: 'oreSellPct', value: 0.05, label: '+5% Ore Sell' },
    },
  },
  magma: {
    half: { gems: 2500, enchantDice: 0 },
    full: {
      gems: 6000,
      enchantDice: 2,
      passive: { kind: 'oreDropPct', value: 0.05, label: '+5% Ore Drop' },
    },
  },
  ruins: {
    half: { gems: 5000, enchantDice: 0 },
    full: {
      gems: 12000,
      enchantDice: 2,
      passive: { kind: 'oreDropPct', value: 0.05, label: '+5% Ore Drop' },
    },
  },
  astral: {
    half: { gems: 10000, enchantDice: 0 },
    full: {
      gems: 25000,
      enchantDice: 3,
      passive: { kind: 'allDmgPct', value: 0.05, label: '+5% All DMG' },
    },
  },
  starwell: {
    half: { gems: 20000, enchantDice: 0 },
    full: {
      gems: 50000,
      enchantDice: 4,
      passive: { kind: 'allDmgPct', value: 0.05, label: '+5% All DMG' },
    },
  },
  abyssal: {
    half: { gems: 35000, enchantDice: 1 },
    full: {
      gems: 85000,
      enchantDice: 5,
      passive: { kind: 'oreDropPct', value: 0.05, label: '+5% Ore Drop' },
    },
  },
  chrono: {
    half: { gems: 60000, enchantDice: 2 },
    full: {
      gems: 150000,
      enchantDice: 6,
      passive: { kind: 'allDmgPct', value: 0.05, label: '+5% All DMG' },
    },
  },
  solaris: {
    half: { gems: 100000, enchantDice: 3 },
    full: {
      gems: 250000,
      enchantDice: 8,
      passive: { kind: 'oreDropPct', value: 0.05, label: '+5% Ore Drop' },
    },
  },
  elysium: {
    half: { gems: 160000, enchantDice: 4 },
    full: {
      gems: 400000,
      enchantDice: 10,
      passive: { kind: 'allDmgPct', value: 0.05, label: '+5% All DMG' },
    },
  },
  nightmare: {
    half: { gems: 250000, enchantDice: 5 },
    full: {
      gems: 650000,
      enchantDice: 12,
      passive: { kind: 'oreDropPct', value: 0.05, label: '+5% Ore Drop' },
    },
  },
  singularity: {
    half: { gems: 400000, enchantDice: 6 },
    full: {
      gems: 1000000,
      enchantDice: 15,
      passive: { kind: 'allDmgPct', value: 0.05, label: '+5% All DMG' },
    },
  },
  weather: {
    half: { gems: 5000, enchantDice: 1 },
    full: {
      gems: 15000,
      enchantDice: 3,
      passive: { kind: 'oreSellPct', value: 0.05, label: '+5% Ore Sell' },
    },
  },
  fusion: {
    half: { gems: 8000, enchantDice: 1 },
    full: {
      gems: 25000,
      enchantDice: 3,
      passive: { kind: 'allDmgPct', value: 0.05, label: '+5% All DMG' },
    },
  },
  limited: {
    half: { gems: 3000, enchantDice: 1 },
    full: {
      gems: 10000,
      enchantDice: 2,
      passive: { kind: 'oreDropPct', value: 0.05, label: '+5% Ore Drop' },
    },
  },
  twin: {
    half: { gems: 6000, enchantDice: 1 },
    full: {
      gems: 20000,
      enchantDice: 3,
      passive: { kind: 'oreSellPct', value: 0.05, label: '+5% Ore Sell' },
    },
  },
  omega: {
    half: { gems: 10000, enchantDice: 2 },
    full: {
      gems: 35000,
      enchantDice: 4,
      passive: { kind: 'allDmgPct', value: 0.1, label: '+10% All DMG' },
    },
  },
  anomaly: {
    half: { gems: 50000, enchantDice: 2 },
    full: {
      gems: 150000,
      enchantDice: 5,
      passive: { kind: 'allDmgPct', value: 0.15, label: '+15% All DMG' },
    },
  },
};

export const INDEX_MILESTONES: readonly IndexMilestoneDef[] = ALL_INDEX_TABS.flatMap((tabId) => {
  const cfg = TAB_MILESTONE_CONFIG[tabId];
  return [
    {
      id: `${tabId}:50`,
      tabId,
      thresholdPct: 50 as const,
      gems: cfg.half.gems,
      enchantDice: cfg.half.enchantDice,
    },
    {
      id: `${tabId}:100`,
      tabId,
      thresholdPct: 100 as const,
      gems: cfg.full.gems,
      enchantDice: cfg.full.enchantDice,
      passive: cfg.full.passive,
    },
  ];
});

const MILESTONE_BY_ID = new Map<string, IndexMilestoneDef>(
  INDEX_MILESTONES.map((m) => [m.id, m])
);

export function isValidIndexMilestoneId(id: string): boolean {
  return MILESTONE_BY_ID.has(id);
}

export function getIndexMilestoneById(id: string): IndexMilestoneDef | undefined {
  return MILESTONE_BY_ID.get(id);
}

export function getIndexMilestonesForTab(tabId: IndexTabId): IndexMilestoneDef[] {
  return INDEX_MILESTONES.filter((m) => m.tabId === tabId);
}

export function getIndexTabEntryIds(tabId: IndexTabId): string[] {
  if (tabId === 'anomaly') {
    return ANOMALY_CHIBI_DEFS.map((c) => c.chibiId);
  }
  if (tabId === 'omega') {
    return OMEGA_BOSS_DEFS.map((b) => b.chibiId);
  }
  if (tabId === 'twin') {
    return PREMIUM_SHOP_ITEMS.map((item) => item.chibiId);
  }
  if (tabId === 'limited') {
    return getDailyLoginLimitedChibiIds();
  }
  if (tabId === 'fusion') {
    return FUSION_RECIPES.map((r) => r.resultChibiId);
  }
  if (tabId === 'weather') {
    const weatherMiners = getWeatherLimitedMiners();
    return [...WEATHER_ORES.map((o) => o.id), ...weatherMiners.map((m) => m.chibi.id)];
  }
  const ores = getOresByWorld(tabId);
  const miners = getMinersByWorld(tabId);
  return [...ores.map((o) => o.id), ...miners.map((m) => m.chibi.id)];
}

export function getIndexTabProgressDomain(
  discovered: ReadonlySet<string>,
  tabId: IndexTabId
): IndexTabProgress {
  const ids = getIndexTabEntryIds(tabId);
  const total = ids.length;
  let found = 0;
  for (const id of ids) {
    if (discovered.has(id)) found++;
  }
  const pct = total > 0 ? Math.floor((found / total) * 100) : 0;
  return { found, total, pct };
}

export function isIndexMilestoneUnlocked(
  discovered: ReadonlySet<string>,
  milestone: IndexMilestoneDef
): boolean {
  const progress = getIndexTabProgressDomain(discovered, milestone.tabId);
  if (progress.total <= 0) return false;
  if (milestone.thresholdPct === 100) {
    return progress.found >= progress.total;
  }
  return progress.found * 100 >= progress.total * milestone.thresholdPct;
}

export function canClaimIndexMilestoneDomain(
  discovered: ReadonlySet<string>,
  claimed: ReadonlySet<string>,
  milestoneId: string
): boolean {
  const def = MILESTONE_BY_ID.get(milestoneId);
  if (!def) return false;
  if (claimed.has(def.id)) return false;
  return isIndexMilestoneUnlocked(discovered, def);
}

export function getTabReadyIndexRewardCountDomain(
  discovered: ReadonlySet<string>,
  claimed: ReadonlySet<string>,
  tabId: IndexTabId
): number {
  let ready = 0;
  for (const m of getIndexMilestonesForTab(tabId)) {
    if (!claimed.has(m.id) && isIndexMilestoneUnlocked(discovered, m)) {
      ready++;
    }
  }
  return ready;
}

export function getReadyIndexRewardCountDomain(
  discovered: ReadonlySet<string>,
  claimed: ReadonlySet<string>
): number {
  let ready = 0;
  for (const m of INDEX_MILESTONES) {
    if (!claimed.has(m.id) && isIndexMilestoneUnlocked(discovered, m)) {
      ready++;
    }
  }
  return ready;
}

export function claimIndexRewardDomain(
  ctx: IndexRewardClaimContext,
  milestoneId: string
): IndexRewardClaimResult | null {
  const def = MILESTONE_BY_ID.get(milestoneId);
  if (!def) return null;
  if (ctx.claimedIndexRewards.has(def.id)) return null;
  if (!isIndexMilestoneUnlocked(ctx.discovered, def)) return null;

  ctx.claimedIndexRewards.add(def.id);
  ctx.gems += def.gems;
  ctx.enchantDice += def.enchantDice;
  return {
    milestone: def,
    gemsGranted: def.gems,
    diceGranted: def.enchantDice,
  };
}

export function getActiveIndexPassiveBonusesDomain(
  claimed: ReadonlySet<string>
): IndexPassiveBonuses {
  let oreSellPct = 0;
  let oreDropPct = 0;
  let allDmgPct = 0;
  for (const id of claimed) {
    const def = MILESTONE_BY_ID.get(id);
    if (!def?.passive) continue;
    if (def.passive.kind === 'oreSellPct') oreSellPct += def.passive.value;
    else if (def.passive.kind === 'oreDropPct') oreDropPct += def.passive.value;
    else if (def.passive.kind === 'allDmgPct') allDmgPct += def.passive.value;
  }
  return { oreSellPct, oreDropPct, allDmgPct };
}
