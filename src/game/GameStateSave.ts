import { getChibiById } from '../game3d/ChibiCatalog';
import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import {
  CHIBI_MAX_STARS,
  getOreById,
  ItemRarity,
  WorldId,
  WORLDS,
} from './GameData';
import { getRelicById, MAX_EQUIPPED_RELICS } from './RelicData';
import {
  CareerStats,
  createDefaultCareerStats,
  isValidAchievementTierId,
} from './AchievementsDomain';
import { BountyEntry, isValidBountyEntry } from './BountiesDomain';
import { isValidIndexMilestoneId } from './IndexRewardsDomain';
import { ResearchTreeId } from './ResearchData';
import { createEmptyTeamPresets, TEAM_PRESET_COUNT, TeamPresetSlots } from './TeamPresetsDomain';
import { TOWER_MAX_KEYS, TowerSaveData } from './TowerData';
import { isValidWeatherId, WeatherId } from './WeatherData';

export const SAVE_KEY = 'my_anime_mine_v2_save_v1';

const LEGACY_ORE_ID_MAP: Record<string, string> = {
  // Legacy World 2 -> Crystal Caves Index
  topaz: 'glowquartz',
  sapphire: 'frostquartz',
  ruby: 'prismite',
  emerald: 'hushstone',
  amethyst: 'azurine',
  diamond: 'glimmerite',
  prismarine: 'spectrine',
  starlight: 'spectrine',
  // Legacy World 3 -> Magma Hollows Index
  ashstone: 'emberstone',
  cinderite: 'ashglass',
  brimslate: 'magmite',
  obsidiarch: 'scorchgold',
  solarium: 'pyroclast',
  infernite: 'moltenite',
  coreheart: 'pyrecore',
  // Legacy World 4 -> Ancient Ruins Index
  mossrock: 'runestone',
  aetherite: 'sanctite',
  chronogem: 'gildium',
  voidglass: 'oathstone',
  astralith: 'idolshard',
  eternium: 'immortite',
  // Legacy World 5 -> Voidreach Index
  stardust: 'voidshard',
  lunaglass: 'gloomite',
  novashard: 'nullite',
  eclipseon: 'riftglass',
  celestflare: 'cosmite',
  prismavoid: 'singularite',
  singularity: 'duskcrown',
};

const LEGACY_REMOVED_OTHER_IDS = [
  'summon-scroll',
  'gems-pouch',
  'quaking-potion',
  'glacial-potion',
  'blazing-potion',
  'diamondbound-charm',
] as const;

export type ResearchLevelsMap = Record<ResearchTreeId, Record<string, number>>;

export interface PlotUnitState {
  chibiId: string;
  damageLevel: number;
  speedLevel: number;
  miningSpeedLevel: number;
  pickaxeId: string;
  mutationId: string;
  enchantId: string | null;
}

export interface SavePayload {
  cash: number;
  gems: number;
  activeWorldId: WorldId;
  miners: Record<string, number>;
  ores: Record<string, number>;
  others: Record<string, number>;
  hotbar: (string | null)[];
  plotMiners: (string | null)[];
  plotUnits: (PlotUnitState | null)[];
  ownedPickaxes: Record<string, number>;
  ownedEnchants: Record<string, number>;
  enchantDice: number;
  selectedHotbarSlot: number;
  chestMiners: Record<string, number>;
  chestOres: Record<string, number>;
  chestCapacity: number;
  autoSell: boolean;
  autoSellRarities?: ItemRarity[];
  lockedOreIds?: string[];
  autoMeteor?: boolean;
  discovered: string[];
  activeBoosts?: Record<string, number>;
  unlockedWorlds?: WorldId[];
  researchLevels?: Partial<ResearchLevelsMap>;
  chibiStars?: Record<string, number>;
  stashedUnits?: Record<string, PlotUnitState[]>;
  craftedRelics?: string[];
  equippedRelics?: string[];
  tower?: TowerSaveData;
  weather?: {
    id: WeatherId;
    expiresAt: number;
  };
  lastSavedAt?: number;
  bounties?: BountyEntry[];
  bountiesCompleted?: number;
  dailyLoginLastClaimDate?: string;
  dailyLoginClaimedDays?: number[];
  claimedIndexRewards?: string[];
  teamPresets?: TeamPresetSlots[];
  careerStats?: Partial<CareerStats>;
  claimedAchievements?: string[];
}

export interface SaveableGameState {
  cash: number;
  gems: number;
  activeWorldId: WorldId;
  unlockedWorlds: WorldId[];
  researchLevels: ResearchLevelsMap;
  miners: Record<string, number>;
  ores: Record<string, number>;
  others: Record<string, number>;
  hotbar: (string | null)[];
  plotMiners: (string | null)[];
  plotUnits: (PlotUnitState | null)[];
  stashedUnits: Record<string, PlotUnitState[]>;
  chibiStars: Record<string, number>;
  craftedRelics: Set<string>;
  equippedRelics: string[];
  ownedPickaxes: Record<string, number>;
  ownedEnchants: Record<string, number>;
  enchantDice: number;
  selectedHotbarSlot: number;
  chestMiners: Record<string, number>;
  chestOres: Record<string, number>;
  chestCapacity: number;
  autoSell: boolean;
  autoSellRarities: Set<ItemRarity>;
  lockedOreIds: Set<string>;
  autoMeteor: boolean;
  discovered: Set<string>;
  activeBoosts: Record<string, number>;
  towerBestFloor: number;
  towerKeys: number;
  towerLastKeyRegenAt: number;
  towerClaimedMilestones: number[];
  weatherId: WeatherId;
  weatherExpiresAt: number;
  lastSavedAt: number;
  bounties: BountyEntry[];
  bountiesCompleted: number;
  dailyLoginLastClaimDate: string;
  dailyLoginClaimedDays: number[];
  claimedIndexRewards: Set<string>;
  teamPresets: TeamPresetSlots[];
  careerStats: CareerStats;
  claimedAchievements: Set<string>;
}

/** Maps retired World 2–5 ore IDs onto current catalog ore IDs. */
export function migrateOreId(id: string): string {
  return LEGACY_ORE_ID_MAP[id] ?? id;
}

/** Returns true when an ID represents any catalog ore (world or weather) or chibi (world, weather, or fusion) registered in the Index. */
export function isValidIndexId(id: string): boolean {
  return Boolean(getOreById(id) || getChibiById(id));
}

/** Creates an empty per-tree research level record for all 9 research trees. */
export function createEmptyResearchLevels(): ResearchLevelsMap {
  return {
    core: {},
    underground: {},
    crystal: {},
    magma: {},
    ruins: {},
    astral: {},
    starwell: {},
    abyssal: {},
    chrono: {},
  };
}

/** Compacts occupied hotbar slots toward index 0 while preserving selection index. */
export function compactHotbarSlots(state: {
  hotbar: (string | null)[];
  selectedHotbarSlot: number;
}): void {
  const selectedItemId =
    state.selectedHotbarSlot >= 0 && state.selectedHotbarSlot < 9
      ? state.hotbar[state.selectedHotbarSlot]
      : null;
  const compact: (string | null)[] = state.hotbar.filter((id): id is string => Boolean(id));
  while (compact.length < 9) compact.push(null);
  state.hotbar = compact.slice(0, 9);
  if (selectedItemId) {
    state.selectedHotbarSlot = state.hotbar.indexOf(selectedItemId);
  } else if (state.selectedHotbarSlot >= 0 && !state.hotbar[state.selectedHotbarSlot]) {
    state.selectedHotbarSlot = -1;
  }
}

/** Converts live `GameState` fields into a serializable `SavePayload`. */
export function serializeSavePayload(state: SaveableGameState): SavePayload {
  return {
    cash: state.cash,
    gems: state.gems,
    activeWorldId: state.activeWorldId,
    miners: state.miners,
    ores: state.ores,
    others: state.others,
    hotbar: state.hotbar,
    plotMiners: state.plotMiners,
    plotUnits: state.plotUnits,
    stashedUnits: state.stashedUnits,
    ownedPickaxes: state.ownedPickaxes,
    ownedEnchants: state.ownedEnchants,
    enchantDice: state.enchantDice,
    selectedHotbarSlot: state.selectedHotbarSlot,
    chestMiners: state.chestMiners,
    chestOres: state.chestOres,
    chestCapacity: state.chestCapacity,
    autoSell: state.autoSell,
    autoSellRarities: Array.from(state.autoSellRarities),
    lockedOreIds: Array.from(state.lockedOreIds),
    autoMeteor: state.autoMeteor,
    discovered: Array.from(state.discovered),
    activeBoosts: state.activeBoosts,
    unlockedWorlds: state.unlockedWorlds,
    researchLevels: state.researchLevels,
    chibiStars: state.chibiStars,
    craftedRelics: Array.from(state.craftedRelics),
    equippedRelics: state.equippedRelics,
    tower: {
      bestFloor: state.towerBestFloor,
      keys: state.towerKeys,
      lastKeyRegenAt: state.towerLastKeyRegenAt,
      claimedMilestones: state.towerClaimedMilestones,
    },
    weather: {
      id: state.weatherId,
      expiresAt: state.weatherExpiresAt,
    },
    lastSavedAt: state.lastSavedAt,
    bounties: state.bounties,
    bountiesCompleted: state.bountiesCompleted,
    dailyLoginLastClaimDate: state.dailyLoginLastClaimDate,
    dailyLoginClaimedDays: state.dailyLoginClaimedDays,
    claimedIndexRewards: [...state.claimedIndexRewards],
    teamPresets: state.teamPresets.map((p) => p.slice(0, STAGE_PEDESTAL_COUNT)),
    careerStats: { ...state.careerStats },
    claimedAchievements: [...state.claimedAchievements],
  };
}

function migrateOreCounts(rawMap: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [rawId, count] of Object.entries(rawMap)) {
    if (typeof count !== 'number' || count <= 0) continue;
    const mapped = migrateOreId(rawId);
    if (getOreById(mapped)) {
      next[mapped] = (next[mapped] || 0) + count;
    }
  }
  return next;
}

/** Parses, migrates, and sanitizes a JSON save string into `state`, ignoring corrupt payloads. */
export function deserializeSaveJson(
  state: SaveableGameState,
  raw: string,
  compactHotbar: () => void = () => compactHotbarSlots(state)
): void {
  try {
    const data = JSON.parse(raw) as Partial<SavePayload>;
    if (typeof data.cash === 'number' && Number.isFinite(data.cash)) {
      state.cash = data.cash > 1e16 ? 1e12 : Math.max(0, data.cash);
    }
    if (typeof data.gems === 'number' && Number.isFinite(data.gems)) {
      state.gems = data.gems > 10_000_000 ? 250_000 : Math.max(0, Math.round(data.gems));
    }
    if (Array.isArray(data.unlockedWorlds) && data.unlockedWorlds.length > 0) {
      const valid = data.unlockedWorlds.filter((w): w is WorldId =>
        WORLDS.some((def) => def.id === w)
      );
      state.unlockedWorlds = valid.includes('underground') ? valid : ['underground', ...valid];
    }
    if (data.researchLevels && typeof data.researchLevels === 'object') {
      const next = createEmptyResearchLevels();
      for (const treeId of Object.keys(next) as ResearchTreeId[]) {
        const src = data.researchLevels[treeId];
        if (src && typeof src === 'object') {
          next[treeId] = { ...src };
        }
      }
      state.researchLevels = next;
    }
    if (data.activeWorldId && state.unlockedWorlds.includes(data.activeWorldId)) {
      state.activeWorldId = data.activeWorldId;
    } else {
      state.activeWorldId = 'underground';
    }
    if (data.miners) state.miners = data.miners;
    if (data.chibiStars && typeof data.chibiStars === 'object') {
      const nextStars: Record<string, number> = {};
      for (const [id, star] of Object.entries(data.chibiStars)) {
        if (typeof star === 'number' && star > 0 && getChibiById(id)) {
          nextStars[id] = Math.max(0, Math.min(CHIBI_MAX_STARS, Math.floor(star)));
        }
      }
      state.chibiStars = nextStars;
    }
    if (data.ores) {
      state.ores = migrateOreCounts(data.ores);
    }
    if (data.others) {
      state.others = { ...data.others };
      for (const legacyId of LEGACY_REMOVED_OTHER_IDS) {
        delete state.others[legacyId];
      }
    }
    if (Array.isArray(data.hotbar) && data.hotbar.length === 9) {
      state.hotbar = data.hotbar.map((slot) => (slot ? migrateOreId(slot) : null));
      compactHotbar();
    }
    if (data.ownedPickaxes) state.ownedPickaxes = data.ownedPickaxes;
    if (data.ownedEnchants) state.ownedEnchants = data.ownedEnchants;
    if (Array.isArray(data.plotMiners)) {
      state.plotMiners = Array.from(
        { length: STAGE_PEDESTAL_COUNT },
        (_, i) => data.plotMiners?.[i] ?? null
      );
    }
    if (Array.isArray(data.plotUnits)) {
      for (let i = STAGE_PEDESTAL_COUNT; i < data.plotUnits.length; i++) {
        const trimmed = data.plotUnits[i];
        if (trimmed?.pickaxeId) {
          state.ownedPickaxes[trimmed.pickaxeId] = (state.ownedPickaxes[trimmed.pickaxeId] || 0) + 1;
        }
      }
      state.plotUnits = Array.from({ length: STAGE_PEDESTAL_COUNT }, (_, i) => {
        const u = data.plotUnits?.[i] ?? null;
        if (!u) return null;
        return {
          ...u,
          damageLevel: Math.max(1, Math.min(65, Math.floor(u.damageLevel || 1))),
          speedLevel: Math.max(1, Math.min(35, Math.floor(u.speedLevel || 1))),
          miningSpeedLevel: Math.max(1, Math.min(35, Math.floor(u.miningSpeedLevel || 1))),
        };
      });
    }
    // Sanitize excess plot placements beyond owned chibi count
    const placedCounts: Record<string, number> = {};
    for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
      const cid = state.plotMiners[i];
      if (!cid) continue;
      const owned = state.miners[cid] || 0;
      const seen = placedCounts[cid] || 0;
      if (seen >= owned) {
        const excess = state.plotUnits[i];
        if (excess?.pickaxeId) {
          state.ownedPickaxes[excess.pickaxeId] =
            (state.ownedPickaxes[excess.pickaxeId] || 0) + 1;
        }
        state.plotMiners[i] = null;
        state.plotUnits[i] = null;
      } else {
        placedCounts[cid] = seen + 1;
      }
    }
    if (data.stashedUnits && typeof data.stashedUnits === 'object') {
      const nextStash: Record<string, PlotUnitState[]> = {};
      for (const [cid, arr] of Object.entries(data.stashedUnits)) {
        if (Array.isArray(arr) && arr.length > 0 && (state.miners[cid] || 0) > 0) {
          nextStash[cid] = arr.map((u) => ({
            ...u,
            pickaxeId: '',
            damageLevel: Math.max(1, Math.min(65, Math.floor(u.damageLevel || 1))),
            speedLevel: Math.max(1, Math.min(35, Math.floor(u.speedLevel || 1))),
            miningSpeedLevel: Math.max(1, Math.min(35, Math.floor(u.miningSpeedLevel || 1))),
          }));
        }
      }
      state.stashedUnits = nextStash;
    }
    if (typeof data.enchantDice === 'number') state.enchantDice = data.enchantDice;
    if (typeof data.selectedHotbarSlot === 'number') {
      state.selectedHotbarSlot = data.selectedHotbarSlot;
    }
    if (data.chestMiners) state.chestMiners = data.chestMiners;
    if (data.chestOres) {
      state.chestOres = migrateOreCounts(data.chestOres);
    }
    if (typeof data.chestCapacity === 'number') state.chestCapacity = data.chestCapacity;
    if (typeof data.autoSell === 'boolean') state.autoSell = data.autoSell;
    if (Array.isArray(data.autoSellRarities)) {
      state.autoSellRarities = new Set(data.autoSellRarities);
    }
    if (Array.isArray(data.lockedOreIds)) {
      state.lockedOreIds = new Set(
        data.lockedOreIds.map((id) => migrateOreId(id)).filter((id) => Boolean(getOreById(id)))
      );
    }
    if (typeof data.autoMeteor === 'boolean') state.autoMeteor = data.autoMeteor;
    if (Array.isArray(data.craftedRelics)) {
      state.craftedRelics = new Set(
        data.craftedRelics.filter((id) => Boolean(getRelicById(id)))
      );
    }
    if (Array.isArray(data.equippedRelics)) {
      const validEquipped: string[] = [];
      for (const id of data.equippedRelics) {
        if (
          state.craftedRelics.has(id) &&
          !validEquipped.includes(id) &&
          validEquipped.length < MAX_EQUIPPED_RELICS
        ) {
          validEquipped.push(id);
        }
      }
      state.equippedRelics = validEquipped;
    }
    if (Array.isArray(data.discovered)) {
      const cleaned = new Set<string>();
      for (const rawId of data.discovered) {
        const mapped = migrateOreId(rawId);
        if (isValidIndexId(mapped)) cleaned.add(mapped);
      }
      state.discovered = cleaned;
    }
    for (const id of Object.keys(state.ores)) {
      if ((state.ores[id] || 0) > 0 && isValidIndexId(id)) state.discovered.add(id);
    }
    for (const id of Object.keys(state.chestOres)) {
      if ((state.chestOres[id] || 0) > 0 && isValidIndexId(id)) state.discovered.add(id);
    }
    for (const id of Object.keys(state.miners)) {
      if ((state.miners[id] || 0) > 0 && isValidIndexId(id)) state.discovered.add(id);
    }
    for (const id of Object.keys(state.chestMiners)) {
      if ((state.chestMiners[id] || 0) > 0 && isValidIndexId(id)) state.discovered.add(id);
    }
    for (const slotId of [...state.hotbar, ...state.plotMiners]) {
      if (slotId && isValidIndexId(slotId)) state.discovered.add(slotId);
    }
    for (const id of Object.keys(state.chibiStars)) {
      if ((state.chibiStars[id] || 0) > 0 && isValidIndexId(id)) state.discovered.add(id);
    }
    for (const id of Object.keys(state.stashedUnits)) {
      if ((state.stashedUnits[id]?.length ?? 0) > 0 && isValidIndexId(id)) state.discovered.add(id);
    }
    if (data.activeBoosts) state.activeBoosts = data.activeBoosts;
    if (data.tower && typeof data.tower === 'object') {
      if (typeof data.tower.bestFloor === 'number') {
        state.towerBestFloor = Math.max(0, Math.floor(data.tower.bestFloor));
      }
      if (typeof data.tower.keys === 'number') {
        state.towerKeys = Math.max(0, Math.min(TOWER_MAX_KEYS, Math.floor(data.tower.keys)));
      }
      if (typeof data.tower.lastKeyRegenAt === 'number') {
        state.towerLastKeyRegenAt = data.tower.lastKeyRegenAt;
      }
      if (Array.isArray(data.tower.claimedMilestones)) {
        state.towerClaimedMilestones = data.tower.claimedMilestones.filter(
          (v): v is number => typeof v === 'number'
        );
      }
    }
    if (data.weather && typeof data.weather === 'object') {
      if (isValidWeatherId(data.weather.id)) {
        state.weatherId = data.weather.id;
      }
      if (typeof data.weather.expiresAt === 'number' && Number.isFinite(data.weather.expiresAt)) {
        state.weatherExpiresAt = data.weather.expiresAt;
      }
    }
    if (typeof data.lastSavedAt === 'number' && Number.isFinite(data.lastSavedAt) && data.lastSavedAt > 0) {
      state.lastSavedAt = data.lastSavedAt;
    }
    if (typeof data.bountiesCompleted === 'number' && Number.isFinite(data.bountiesCompleted) && data.bountiesCompleted >= 0) {
      state.bountiesCompleted = Math.floor(data.bountiesCompleted);
    }
    if (Array.isArray(data.bounties)) {
      state.bounties = data.bounties.filter((b): b is BountyEntry => isValidBountyEntry(b));
    }
    if (typeof data.dailyLoginLastClaimDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.dailyLoginLastClaimDate)) {
      state.dailyLoginLastClaimDate = data.dailyLoginLastClaimDate;
    }
    if (Array.isArray(data.dailyLoginClaimedDays)) {
      const validDays = new Set<number>();
      for (const d of data.dailyLoginClaimedDays) {
        if (typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 7) {
          validDays.add(d);
        }
      }
      state.dailyLoginClaimedDays = [...validDays].sort((a, b) => a - b);
    }
    if (Array.isArray(data.claimedIndexRewards)) {
      state.claimedIndexRewards = new Set(
        data.claimedIndexRewards.filter(
          (id): id is string => typeof id === 'string' && isValidIndexMilestoneId(id)
        )
      );
    }
    if (Array.isArray(data.teamPresets)) {
      const presets = createEmptyTeamPresets();
      for (let i = 0; i < TEAM_PRESET_COUNT; i++) {
        const rawPreset = data.teamPresets[i];
        if (!Array.isArray(rawPreset)) continue;
        for (let s = 0; s < STAGE_PEDESTAL_COUNT; s++) {
          const id = rawPreset[s];
          presets[i][s] = typeof id === 'string' && getChibiById(id) ? id : null;
        }
      }
      state.teamPresets = presets;
    }
    if (data.careerStats && typeof data.careerStats === 'object') {
      const defStats = createDefaultCareerStats();
      const s = data.careerStats;
      state.careerStats = {
        oresBroken: typeof s.oresBroken === 'number' && Number.isFinite(s.oresBroken) ? Math.max(0, Math.floor(s.oresBroken)) : defStats.oresBroken,
        critTaps: typeof s.critTaps === 'number' && Number.isFinite(s.critTaps) ? Math.max(0, Math.floor(s.critTaps)) : defStats.critTaps,
        highestCrit: typeof s.highestCrit === 'number' && Number.isFinite(s.highestCrit) ? Math.max(0, Math.floor(s.highestCrit)) : defStats.highestCrit,
        overclockTriggers: typeof s.overclockTriggers === 'number' && Number.isFinite(s.overclockTriggers) ? Math.max(0, Math.floor(s.overclockTriggers)) : defStats.overclockTriggers,
        fusionsCompleted: typeof s.fusionsCompleted === 'number' && Number.isFinite(s.fusionsCompleted) ? Math.max(0, Math.floor(s.fusionsCompleted)) : defStats.fusionsCompleted,
      };
    }
    if (Array.isArray(data.claimedAchievements)) {
      state.claimedAchievements = new Set(
        data.claimedAchievements.filter(
          (id): id is string => typeof id === 'string' && isValidAchievementTierId(id)
        )
      );
    }
  } catch {
    // Ignore corrupt saves
  }
}

/** Saves `state` to `localStorage` when available, ignoring storage quota errors. */
export function saveToLocalStorage(state: SaveableGameState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeSavePayload(state)));
  } catch {
    // Ignore storage quota errors
  }
}

/** Loads persisted `SavePayload` from `localStorage` into `state`. */
export function loadFromLocalStorage(
  state: SaveableGameState,
  compactHotbar: () => void = () => compactHotbarSlots(state)
): void {
  if (typeof localStorage === 'undefined') return;
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  deserializeSaveJson(state, raw, compactHotbar);
}
