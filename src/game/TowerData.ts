import { ItemRarity, ORES, WorldDef, WORLDS } from './GameData';
import { OreVariantKey, rollOreVariant } from '../game3d/MineWorldPalette';

export interface TowerAnomalyDef {
  id: 'none' | 'gem-surge' | 'overclock' | 'enchant-res' | 'weakpoint';
  name: string;
  desc: string;
  color: string;
  hpMult: number;
  dpsMult: number;
  tapMult: number;
  enchantPowerMult: number;
  gemMult: number;
  timerDeltaSec: number;
}

export interface TowerFloorDef {
  floor: number;
  isBoss: boolean;
  isFinalBoss: boolean;
  title: string;
  hp: number;
  durationSec: number;
  gemReward: number;
  diceDropChance: number;
  anomaly: TowerAnomalyDef;
  worldIndex: number;
  world: WorldDef;
  floorInWorld: number;
}

export interface TowerWaveOreState {
  index: number;
  oreId: string;
  name: string;
  color: string;
  secondaryColor: string;
  rarity: ItemRarity;
  variantKey: OreVariantKey;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface TowerWaveDef {
  floor: number;
  wave: number;
  isBoss: boolean;
  title: string;
  durationSec: number;
  waveGemReward: number;
  rockBaseHp: number;
  bossHp: number;
}

export type TowerBlessingRarity = 'core' | 'tactical' | 'prismatic';

export interface TowerBlessingDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  rarity?: TowerBlessingRarity;
  tag?: string;
  maxStacks?: number;
  dpsBonusPct?: number;
  tapBonusPct?: number;
  gemBonusPct?: number;
  extraTimerSec?: number;
  overkillPct?: number;
  chainTargets?: number;
  chainPct?: number;
  critChanceBonus?: number;
  critDmgBonus?: number;
  bossDmgPct?: number;
  diceChanceBonus?: number;
  extraStrikeChance?: number;
  extraStrikePct?: number;
}

export interface TowerBlessingAggregate {
  dpsBonusPct: number;
  tapBonusPct: number;
  gemBonusPct: number;
  extraTimerSec: number;
  overkillPct: number;
  chainTargets: number;
  chainPct: number;
  critChanceBonus: number;
  critDmgBonus: number;
  bossDmgPct: number;
  diceChanceBonus: number;
  extraStrikeChance: number;
  extraStrikePct: number;
}

export interface GroupedTowerBlessing {
  def: TowerBlessingDef;
  count: number;
  maxed: boolean;
  totalLabel: string;
}

export interface TowerRunBuffPill {
  id: string;
  label: string;
  bgClass: string;
  textClass: string;
}

export interface TowerMilestoneDef {
  floor: number;
  gemBonus: number;
  diceBonus: number;
  globalGemPct: number;
  title: string;
}

export const TOWER_MAX_FLOOR = 80;
export const TOWER_MAX_KEYS = 5;
export const TOWER_KEY_REGEN_MS = 10 * 60 * 1000; // 10 minutes per key
export const TOWER_KEY_GEM_COST = 1000;
export const TOWER_CHECKPOINT_STEP = 5;
export const TOWER_WAVES_PER_FLOOR = 10;
export const TOWER_ORE_ROCKS_PER_WAVE = 5;
export const TOWER_BOSS_WAVE = 10;
export const TOWER_BLESSING_AUTO_PICK_SEC = 5;
export const TOWER_BLESSING_REROLL_GEM_COST = 75;
export const TOWER_BOSS_INVUL_SEC = 5;
export const TOWER_BOSS_SHIELD_SHAVE_SEC = 2.5;
export const TOWER_BOSS_EXPOSE_SEC = 4.0;
export const TOWER_BOSS_EXPOSE_DMG_MULT = 1.5;
export const TOWER_BOSS_SWEETSPOT_DURATION_SEC = 1.45;
export const TOWER_DICE_PITY_MAX = 4;
export const TOWER_STREAK_GEM_STEP = 0.25;
export const TOWER_STREAK_MAX_BONUS = 2.0;
export const TOWER_ORE_COIN_CHANCE = 0.005; // 0.5% per broken ore rock in waves 1-9
export const TOWER_BOSS_COIN_CHANCE = 0.05; // 5% chance on Boss defeat
export const TOWER_BOSS_COIN_DROP = 5; // +5 Spire Coins on Boss drop
export const TOWER_GEM_DROP_MULT = 0.2; // -80% Tower wave/boss/sweep Gem drop balance scale

export const TOWER_ANOMALIES: readonly TowerAnomalyDef[] = [
  {
    id: 'none',
    name: 'Stable Spire',
    desc: 'Standard spire conditions.',
    color: '#38bdf8',
    hpMult: 1,
    dpsMult: 1,
    tapMult: 1,
    enchantPowerMult: 1,
    gemMult: 1,
    timerDeltaSec: 0,
  },
  {
    id: 'gem-surge',
    name: 'Gem Surge',
    desc: '+45% Gem Drops, +20% Target HP',
    color: '#f472b6',
    hpMult: 1.2,
    dpsMult: 1,
    tapMult: 1,
    enchantPowerMult: 1,
    gemMult: 1.45,
    timerDeltaSec: 0,
  },
  {
    id: 'overclock',
    name: 'Overclocked',
    desc: '+35% Miner DPS, -4s Timer',
    color: '#f97316',
    hpMult: 1,
    dpsMult: 1.35,
    tapMult: 1,
    enchantPowerMult: 1,
    gemMult: 1.15,
    timerDeltaSec: -4,
  },
  {
    id: 'enchant-res',
    name: 'Enchant Resonance',
    desc: 'Altar Enchant bonus +50% stronger',
    color: '#c084fc',
    hpMult: 1.1,
    dpsMult: 1,
    tapMult: 1,
    enchantPowerMult: 1.5,
    gemMult: 1.2,
    timerDeltaSec: 0,
  },
  {
    id: 'weakpoint',
    name: 'Weakpoint Exposed',
    desc: 'Manual Click DMG 3x stronger',
    color: '#4ade80',
    hpMult: 1.05,
    dpsMult: 1,
    tapMult: 3,
    enchantPowerMult: 1,
    gemMult: 1.15,
    timerDeltaSec: 0,
  },
];

export const TOWER_BLESSINGS: readonly TowerBlessingDef[] = [
  {
    id: 'astral-surge',
    name: 'Astral Surge',
    desc: '+35% All Tower DPS for this run',
    color: '#38bdf8',
    rarity: 'core',
    tag: 'DPS',
    dpsBonusPct: 0.35,
  },
  {
    id: 'gem-magnet',
    name: 'Crystal Greed',
    desc: '+30% Gems earned in this run',
    color: '#f472b6',
    rarity: 'core',
    tag: 'LOOT',
    gemBonusPct: 0.3,
  },
  {
    id: 'chrono-shard',
    name: 'Chrono Shard',
    desc: '+5s Timer on every wave in this run',
    color: '#facc15',
    rarity: 'core',
    tag: 'TIME',
    maxStacks: 5,
    extraTimerSec: 5,
  },
  {
    id: 'breaker-click',
    name: 'Core Breaker',
    desc: '+150% Click Damage in this run',
    color: '#4ade80',
    rarity: 'core',
    tag: 'CLICK',
    tapBonusPct: 1.5,
  },
  {
    id: 'overkill-splash',
    name: 'Overkill Splash',
    desc: '80% excess damage on ore break splashes to the next ore',
    color: '#fb923c',
    rarity: 'tactical',
    tag: 'SPLASH',
    maxStacks: 3,
    overkillPct: 0.8,
  },
  {
    id: 'chain-spark',
    name: 'Chain Spark',
    desc: 'Every strike arcs 35% lightning DMG to 2 other ores',
    color: '#22d3ee',
    rarity: 'tactical',
    tag: 'CHAIN',
    maxStacks: 2,
    chainTargets: 2,
    chainPct: 0.35,
  },
  {
    id: 'crit-burst',
    name: 'Crit Burst',
    desc: '+25% Crit Chance & +60% Crit Damage in Tower',
    color: '#f59e0b',
    rarity: 'tactical',
    tag: 'CRIT',
    maxStacks: 3,
    critChanceBonus: 0.25,
    critDmgBonus: 0.6,
  },
  {
    id: 'boss-slayer',
    name: 'Seraphim Bane',
    desc: '+55% Damage dealt to Wave 10 Bosses',
    color: '#f43f5e',
    rarity: 'tactical',
    tag: 'BOSS',
    bossDmgPct: 0.55,
  },
  {
    id: 'dice-hunter',
    name: 'Fortune Seeker',
    desc: '+18% Enchant Dice drop chance from Bosses',
    color: '#c084fc',
    rarity: 'tactical',
    tag: 'DICE',
    maxStacks: 5,
    diceChanceBonus: 0.18,
  },
  {
    id: 'tempo-surge',
    name: 'Tempo Surge',
    desc: '+20% DPS, +40% Click DMG & +2s Wave Timer',
    color: '#2dd4bf',
    rarity: 'core',
    tag: 'TEMPO',
    dpsBonusPct: 0.2,
    tapBonusPct: 0.4,
    extraTimerSec: 2,
  },
  {
    id: 'prismatic-echo',
    name: 'Prismatic Echo',
    desc: '28% chance for strikes & taps to echo an extra 65% hit',
    color: '#a855f7',
    rarity: 'prismatic',
    tag: 'ECHO',
    maxStacks: 3,
    extraStrikeChance: 0.28,
    extraStrikePct: 0.65,
  },
  {
    id: 'cursed-greed',
    name: 'Blood Pact',
    desc: '+85% Gems earned in this run, -3s Wave Timer',
    color: '#e11d48',
    rarity: 'prismatic',
    tag: 'PACT',
    maxStacks: 5,
    gemBonusPct: 0.85,
    extraTimerSec: -3,
  },
];

export const TOWER_MILESTONES: readonly TowerMilestoneDef[] = [
  { floor: 5, gemBonus: 80, diceBonus: 1, globalGemPct: 0.1, title: 'Spire Initiate' },
  { floor: 10, gemBonus: 180, diceBonus: 2, globalGemPct: 0.2, title: 'Underground Warden' },
  { floor: 15, gemBonus: 300, diceBonus: 2, globalGemPct: 0.3, title: 'Crystal Breaker' },
  { floor: 20, gemBonus: 460, diceBonus: 3, globalGemPct: 0.4, title: 'Cavern Champion' },
  { floor: 25, gemBonus: 650, diceBonus: 3, globalGemPct: 0.5, title: 'Magma Striker' },
  { floor: 30, gemBonus: 900, diceBonus: 4, globalGemPct: 0.6, title: 'Caldera Sentinel' },
  { floor: 35, gemBonus: 1200, diceBonus: 4, globalGemPct: 0.7, title: 'Relic Challenger' },
  { floor: 40, gemBonus: 1550, diceBonus: 5, globalGemPct: 0.85, title: 'Ruins Overlord' },
  { floor: 45, gemBonus: 1950, diceBonus: 5, globalGemPct: 1.0, title: 'Void Walker' },
  { floor: 50, gemBonus: 2500, diceBonus: 7, globalGemPct: 1.15, title: 'Eclipse Sovereign' },
  { floor: 55, gemBonus: 3200, diceBonus: 7, globalGemPct: 1.3, title: 'Starwell Knight' },
  { floor: 60, gemBonus: 4000, diceBonus: 8, globalGemPct: 1.45, title: 'Astral Monarch' },
  { floor: 65, gemBonus: 5000, diceBonus: 9, globalGemPct: 1.6, title: 'Abyssal Diver' },
  { floor: 70, gemBonus: 6200, diceBonus: 10, globalGemPct: 1.75, title: 'Leviathan Bane' },
  { floor: 75, gemBonus: 7800, diceBonus: 12, globalGemPct: 1.9, title: 'Chrono Vanguard' },
  { floor: 80, gemBonus: 10000, diceBonus: 15, globalGemPct: 2.1, title: 'Spire Conqueror' },
];

export function clampTowerFloor(floor: number): number {
  return Math.max(1, Math.min(TOWER_MAX_FLOOR, Math.floor(floor)));
}

export function getTowerWorldTier(floor: number): {
  worldIndex: number;
  world: WorldDef;
  floorInWorld: number;
} {
  const f = clampTowerFloor(floor);
  const worldIndex = Math.min(WORLDS.length - 1, Math.floor((f - 1) / 10));
  return {
    worldIndex,
    world: WORLDS[worldIndex],
    floorInWorld: ((f - 1) % 10) + 1,
  };
}

/**
 * Scales Tower floor HP smoothly across Worlds 1..8 (10 floors per World)
 * so Floors 1-10 match Underground progression up to Floor 71-80 matching Chrono Nexus.
 */
export function getTowerWorldScale(floor: number): number {
  const { worldIndex, floorInWorld } = getTowerWorldTier(floor);
  const step = floorInWorld - 1;
  const prevMult = WORLDS[worldIndex].oreHpMult;
  const nextMult =
    worldIndex < WORLDS.length - 1
      ? WORLDS[worldIndex + 1].oreHpMult
      : WORLDS[worldIndex].oreHpMult * 40;
  return prevMult * Math.pow(nextMult / prevMult, step / 10);
}

export function getAnomalyForFloor(floor: number): TowerAnomalyDef {
  const f = clampTowerFloor(floor);
  if (f <= 2 || f % 2 === 1) return TOWER_ANOMALIES[0];
  const rotating = TOWER_ANOMALIES.slice(1);
  return rotating[(Math.floor(f / 2) - 1) % rotating.length];
}

export function getTowerFloorDef(floor: number): TowerFloorDef {
  const f = clampTowerFloor(floor);
  const isBoss = f % TOWER_CHECKPOINT_STEP === 0;
  const isFinalBoss = f === TOWER_MAX_FLOOR;
  const anomaly = getAnomalyForFloor(f);
  const tier = getTowerWorldTier(f);
  const worldScale = getTowerWorldScale(f);
  const rawBossHp = 520 * worldScale * (isBoss ? 1.35 : 1) * (isFinalBoss ? 1.25 : 1) * anomaly.hpMult;
  const hp = Math.max(150, Math.round(rawBossHp));
  const baseDur = isFinalBoss ? 44 : isBoss ? 38 : 34;
  const durationSec = Math.max(16, baseDur + anomaly.timerDeltaSec);
  const gemReward = Math.max(
    4,
    Math.round((24 + f * 12) * (isBoss ? 1.85 : 1) * (isFinalBoss ? 1.5 : 1) * anomaly.gemMult * TOWER_GEM_DROP_MULT)
  );
  const diceDropChance = isFinalBoss ? 1.0 : isBoss ? Math.min(0.85, 0.25 + f * 0.008) : 0.12;
  const title = isFinalBoss
    ? `Final Floor ${f}`
    : isBoss
      ? `Checkpoint Floor ${f}`
      : `Floor ${f}`;

  return {
    floor: f,
    isBoss,
    isFinalBoss,
    title,
    hp,
    durationSec,
    gemReward,
    diceDropChance,
    anomaly,
    worldIndex: tier.worldIndex,
    world: tier.world,
    floorInWorld: tier.floorInWorld,
  };
}

export function getTowerWaveDef(floor: number, wave: number): TowerWaveDef {
  const f = clampTowerFloor(floor);
  const w = Math.max(1, Math.min(TOWER_WAVES_PER_FLOOR, Math.floor(wave)));
  const floorDef = getTowerFloorDef(f);
  const isBoss = w === TOWER_BOSS_WAVE;
  const worldScale = getTowerWorldScale(f);
  const waveScale = 1 + (w - 1) * 0.14;
  const rockBaseHp = Math.max(18, Math.round(45 * worldScale * waveScale));
  const bossHp = floorDef.hp;
  const baseDur = isBoss ? floorDef.durationSec : Math.max(14, 24 + floorDef.anomaly.timerDeltaSec);
  const waveGemReward = isBoss
    ? floorDef.gemReward
    : Math.max(1, Math.round((3 + f * 1.6) * floorDef.anomaly.gemMult * TOWER_GEM_DROP_MULT));

  return {
    floor: f,
    wave: w,
    isBoss,
    title: isBoss ? `Floor ${f} Boss (Wave ${w}/${TOWER_WAVES_PER_FLOOR})` : `Floor ${f} • Wave ${w}/${TOWER_WAVES_PER_FLOOR}`,
    durationSec: baseDur,
    waveGemReward,
    rockBaseHp,
    bossHp,
  };
}

export function rollTowerWaveOres(
  floor: number,
  wave: number,
  anomaly: TowerAnomalyDef = getAnomalyForFloor(floor),
  rng: () => number = Math.random
): TowerWaveOreState[] {
  const waveDef = getTowerWaveDef(floor, wave);
  if (waveDef.isBoss) return [];
  const tier = getTowerWorldTier(floor);
  const worldOres = ORES.filter((o) => o.worldId === tier.world.id);
  const orePool = worldOres.length > 0 ? worldOres : ORES;
  const ores: TowerWaveOreState[] = [];
  for (let i = 0; i < TOWER_ORE_ROCKS_PER_WAVE; i++) {
    const oreIdx = Math.min(orePool.length - 1, Math.max(0, Math.floor(rng() * orePool.length)));
    const oreDef = orePool[oreIdx];
    const variant = rollOreVariant(rng);
    const maxHp = Math.max(12, Math.round(waveDef.rockBaseHp * variant.hpMult * anomaly.hpMult));
    ores.push({
      index: i,
      oreId: oreDef.id,
      name: oreDef.name,
      color: oreDef.color,
      secondaryColor: oreDef.secondaryColor,
      rarity: oreDef.rarity,
      variantKey: variant.key,
      hp: maxHp,
      maxHp,
      alive: true,
    });
  }
  return ores;
}

export function getTowerCheckpoints(bestFloor: number): number[] {
  const cappedBest = Math.min(TOWER_MAX_FLOOR, Math.max(0, Math.floor(bestFloor)));
  const list = [1];
  for (let f = TOWER_CHECKPOINT_STEP; f <= cappedBest; f += TOWER_CHECKPOINT_STEP) {
    list.push(f);
  }
  return list;
}

export function getTowerKeyCashCost(bestFloor: number): number {
  return Math.round(1500 * Math.pow(1.85, Math.min(20, Math.floor(bestFloor / 5))));
}

export function getTowerSweepFloor(bestFloor: number): number {
  if (bestFloor <= 0) return 0;
  return Math.max(1, bestFloor);
}

export function getTowerSweepGemReward(bestFloor: number): number {
  if (bestFloor <= 0) return 0;
  let total = 0;
  const start = Math.max(1, bestFloor - 4);
  for (let f = start; f <= bestFloor; f++) {
    total += getTowerFloorDef(f).gemReward;
  }
  return Math.max(2, Math.round(total * 0.4));
}

export interface TowerSaveData {
  bestFloor: number;
  keys: number;
  lastKeyRegenAt: number;
  claimedMilestones: number[];
  dicePity?: number;
  coins?: number;
}

export interface TowerRunState {
  floor: number;
  wave: number;
  maxWaves: number;
  isBossWave: boolean;
  waveOres: TowerWaveOreState[];
  hp: number;
  maxHp: number;
  timeLeft: number;
  maxTime: number;
  gemsEarned: number;
  diceEarned: number;
  coinsEarned: number;
  floorsCleared: number;
  wavesCleared: number;
  blessings: TowerBlessingDef[];
  pendingBlessings: TowerBlessingDef[] | null;
  blessingTimerLeft?: number;
  bossInvulLeft?: number;
  bossExposeLeft?: number;
  freeBlessingRerolls?: number;
}

export interface TowerRunSummary {
  startFloor: number;
  highestReached: number;
  highestWave: number;
  floorsCleared: number;
  wavesCleared: number;
  gemsEarned: number;
  diceEarned: number;
  coinsEarned?: number;
  newRecord: boolean;
  reason: 'timeout' | 'exit' | 'victory';
  remainingHpPct?: number;
  wasBossWave?: boolean;
  bestStreakMult?: number;
}

export function getTowerStreakGemMult(floorsCleared: number): number {
  return 1 + Math.min(TOWER_STREAK_MAX_BONUS, Math.max(0, floorsCleared) * TOWER_STREAK_GEM_STEP);
}

export function summarizeTowerBlessings(blessings: readonly TowerBlessingDef[]): TowerBlessingAggregate {
  const acc: TowerBlessingAggregate = {
    dpsBonusPct: 0,
    tapBonusPct: 0,
    gemBonusPct: 0,
    extraTimerSec: 0,
    overkillPct: 0,
    chainTargets: 0,
    chainPct: 0,
    critChanceBonus: 0,
    critDmgBonus: 0,
    bossDmgPct: 0,
    diceChanceBonus: 0,
    extraStrikeChance: 0,
    extraStrikePct: 0,
  };
  for (const b of blessings) {
    acc.dpsBonusPct += b.dpsBonusPct ?? 0;
    acc.tapBonusPct += b.tapBonusPct ?? 0;
    acc.gemBonusPct += b.gemBonusPct ?? 0;
    acc.extraTimerSec += b.extraTimerSec ?? 0;
    acc.overkillPct += b.overkillPct ?? 0;
    acc.chainTargets += b.chainTargets ?? 0;
    acc.chainPct = Math.max(acc.chainPct, b.chainPct ?? 0);
    acc.critChanceBonus += b.critChanceBonus ?? 0;
    acc.critDmgBonus += b.critDmgBonus ?? 0;
    acc.bossDmgPct += b.bossDmgPct ?? 0;
    acc.diceChanceBonus += b.diceChanceBonus ?? 0;
    acc.extraStrikeChance += b.extraStrikeChance ?? 0;
    acc.extraStrikePct = Math.max(acc.extraStrikePct, b.extraStrikePct ?? 0);
  }
  return acc;
}

export function countTowerBlessingStacks(blessings: readonly TowerBlessingDef[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const b of blessings) {
    counts[b.id] = (counts[b.id] ?? 0) + 1;
  }
  return counts;
}

function fmtSignedPct(val: number): string {
  const pct = Math.round(val * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

function fmtSignedSec(sec: number): string {
  return `${sec >= 0 ? '+' : ''}${sec}s`;
}

export function formatBlessingTotalLabel(def: TowerBlessingDef, count: number): string {
  const c = Math.max(0, count);
  const parts: string[] = [];
  if (def.dpsBonusPct) parts.push(`${fmtSignedPct(def.dpsBonusPct * c)} DPS`);
  if (def.gemBonusPct) parts.push(`${fmtSignedPct(def.gemBonusPct * c)} Gems`);
  if (def.bossDmgPct) parts.push(`${fmtSignedPct(def.bossDmgPct * c)} Boss`);
  if (def.tapBonusPct) parts.push(`${fmtSignedPct(def.tapBonusPct * c)} Click`);
  if (def.critChanceBonus || def.critDmgBonus) {
    const cc = Math.round(Math.min(0.75, (def.critChanceBonus ?? 0) * c) * 100);
    const cd = Math.round((def.critDmgBonus ?? 0) * c * 100);
    parts.push(`+${cc}% Crit / +${cd}% DMG`);
  }
  if (def.chainTargets) {
    const targets = Math.min(TOWER_ORE_ROCKS_PER_WAVE - 1, def.chainTargets * c);
    parts.push(`Chain ${targets} Ores`);
  }
  if (def.overkillPct) parts.push(`${Math.round(def.overkillPct * c * 100)}% Splash`);
  if (def.extraStrikeChance) {
    const ec = Math.round(Math.min(0.75, def.extraStrikeChance * c) * 100);
    parts.push(`${ec}% Echo`);
  }
  if (def.diceChanceBonus) parts.push(`${fmtSignedPct(def.diceChanceBonus * c)} Dice`);
  if (def.extraTimerSec) parts.push(`${fmtSignedSec(def.extraTimerSec * c)} Time`);
  return parts.length > 0 ? parts.join(' • ') : def.desc;
}

export function formatBlessingPickPreview(def: TowerBlessingDef, ownedCount: number): string {
  const cur = Math.max(0, ownedCount);
  const next = cur + 1;
  if (def.dpsBonusPct && def.tapBonusPct && def.extraTimerSec) {
    return `DPS ${fmtSignedPct(def.dpsBonusPct * cur)} → ${fmtSignedPct(def.dpsBonusPct * next)} • ${fmtSignedSec(def.extraTimerSec * cur)} → ${fmtSignedSec(def.extraTimerSec * next)}`;
  }
  if (def.gemBonusPct && def.extraTimerSec) {
    return `Gems ${fmtSignedPct(def.gemBonusPct * cur)} → ${fmtSignedPct(def.gemBonusPct * next)} • ${fmtSignedSec(def.extraTimerSec * cur)} → ${fmtSignedSec(def.extraTimerSec * next)}`;
  }
  if (def.dpsBonusPct) {
    return `DPS ${fmtSignedPct(def.dpsBonusPct * cur)} → ${fmtSignedPct(def.dpsBonusPct * next)}`;
  }
  if (def.gemBonusPct) {
    return `Gems ${fmtSignedPct(def.gemBonusPct * cur)} → ${fmtSignedPct(def.gemBonusPct * next)}`;
  }
  if (def.bossDmgPct) {
    return `Boss DMG ${fmtSignedPct(def.bossDmgPct * cur)} → ${fmtSignedPct(def.bossDmgPct * next)}`;
  }
  if (def.tapBonusPct) {
    return `Click DMG ${fmtSignedPct(def.tapBonusPct * cur)} → ${fmtSignedPct(def.tapBonusPct * next)}`;
  }
  if (def.extraTimerSec) {
    return `Wave Timer ${fmtSignedSec(def.extraTimerSec * cur)} → ${fmtSignedSec(def.extraTimerSec * next)}`;
  }
  if (def.overkillPct) {
    return `Splash ${Math.round(def.overkillPct * cur * 100)}% → ${Math.round(def.overkillPct * next * 100)}%`;
  }
  if (def.chainTargets) {
    const beforeT = Math.min(TOWER_ORE_ROCKS_PER_WAVE - 1, def.chainTargets * cur);
    const afterT = Math.min(TOWER_ORE_ROCKS_PER_WAVE - 1, def.chainTargets * next);
    return `Chain ${beforeT} → ${afterT} Ores`;
  }
  if (def.critChanceBonus || def.critDmgBonus) {
    const beforeCc = Math.round(Math.min(0.75, (def.critChanceBonus ?? 0) * cur) * 100);
    const afterCc = Math.round(Math.min(0.75, (def.critChanceBonus ?? 0) * next) * 100);
    const afterCd = Math.round((def.critDmgBonus ?? 0) * next * 100);
    return `Crit +${beforeCc}% → +${afterCc}% (+${afterCd}% DMG)`;
  }
  if (def.extraStrikeChance) {
    const beforeEc = Math.round(Math.min(0.75, def.extraStrikeChance * cur) * 100);
    const afterEc = Math.round(Math.min(0.75, def.extraStrikeChance * next) * 100);
    return `Echo ${beforeEc}% → ${afterEc}%`;
  }
  if (def.diceChanceBonus) {
    return `Dice Drop ${fmtSignedPct(def.diceChanceBonus * cur)} → ${fmtSignedPct(def.diceChanceBonus * next)}`;
  }
  return def.desc;
}

export function groupTowerBlessings(blessings: readonly TowerBlessingDef[]): GroupedTowerBlessing[] {
  const byId = new Map<string, { def: TowerBlessingDef; count: number; order: number }>();
  let order = 0;
  for (const b of blessings) {
    const existing = byId.get(b.id);
    if (existing) {
      existing.count += 1;
    } else {
      byId.set(b.id, { def: b, count: 1, order: order++ });
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map(({ def, count }) => ({
      def,
      count,
      maxed: def.maxStacks !== undefined && count >= def.maxStacks,
      totalLabel: formatBlessingTotalLabel(def, count),
    }));
}

export function buildTowerRunBuffPills(blessings: readonly TowerBlessingDef[]): TowerRunBuffPill[] {
  const s = summarizeTowerBlessings(blessings);
  const pills: TowerRunBuffPill[] = [];
  if (s.dpsBonusPct > 0) {
    pills.push({ id: 'dps', label: `+${Math.round(s.dpsBonusPct * 100)}% DPS`, bgClass: 'bg-[#e0f2fe]', textClass: 'text-[#0369a1]' });
  }
  if (s.gemBonusPct > 0) {
    pills.push({ id: 'gems', label: `+${Math.round(s.gemBonusPct * 100)}% Gems`, bgClass: 'bg-[#fce7f3]', textClass: 'text-[#9d174d]' });
  }
  if (s.bossDmgPct > 0) {
    pills.push({ id: 'boss', label: `+${Math.round(s.bossDmgPct * 100)}% Boss`, bgClass: 'bg-[#ffe4e6]', textClass: 'text-[#be123c]' });
  }
  if (s.extraTimerSec !== 0) {
    const pos = s.extraTimerSec > 0;
    pills.push({
      id: 'time',
      label: `${fmtSignedSec(s.extraTimerSec)} Time`,
      bgClass: pos ? 'bg-[#fef9c3]' : 'bg-[#fecdd3]',
      textClass: pos ? 'text-[#854d0e]' : 'text-[#9f1239]',
    });
  }
  if (s.critChanceBonus > 0) {
    pills.push({
      id: 'crit',
      label: `+${Math.round(Math.min(0.75, s.critChanceBonus) * 100)}% Crit`,
      bgClass: 'bg-[#fef3c7]',
      textClass: 'text-[#92400e]',
    });
  }
  if (s.tapBonusPct > 0) {
    pills.push({ id: 'tap', label: `+${Math.round(s.tapBonusPct * 100)}% Click`, bgClass: 'bg-[#dcfce7]', textClass: 'text-[#15803d]' });
  }
  if (s.chainTargets > 0) {
    const t = Math.min(TOWER_ORE_ROCKS_PER_WAVE - 1, s.chainTargets);
    pills.push({ id: 'chain', label: `Chain ${t}`, bgClass: 'bg-[#cffafe]', textClass: 'text-[#0e7490]' });
  }
  if (s.overkillPct > 0) {
    pills.push({ id: 'splash', label: `Splash ${Math.round(s.overkillPct * 100)}%`, bgClass: 'bg-[#ffedd5]', textClass: 'text-[#9a3412]' });
  }
  if (s.extraStrikeChance > 0) {
    pills.push({
      id: 'echo',
      label: `Echo ${Math.round(Math.min(0.75, s.extraStrikeChance) * 100)}%`,
      bgClass: 'bg-[#f3e8ff]',
      textClass: 'text-[#6b21a8]',
    });
  }
  if (s.diceChanceBonus > 0) {
    pills.push({ id: 'dice', label: `+${Math.round(s.diceChanceBonus * 100)}% Dice`, bgClass: 'bg-[#ede9fe]', textClass: 'text-[#5b21b6]' });
  }
  return pills;
}

function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

export function pickTowerBlessingChoices(
  rng: () => number = Math.random,
  excludeIds: readonly string[] = [],
  ownedBlessings: readonly TowerBlessingDef[] = []
): TowerBlessingDef[] {
  const excluded = new Set(excludeIds);
  const ownedCounts = countTowerBlessingStacks(ownedBlessings);
  const notMaxed = TOWER_BLESSINGS.filter(
    (b) => b.maxStacks === undefined || (ownedCounts[b.id] ?? 0) < b.maxStacks
  );
  const eligible = notMaxed.length >= 3 ? notMaxed : [...TOWER_BLESSINGS];
  const preferred = shuffleInPlace(
    eligible.filter((b) => !excluded.has(b.id)),
    rng
  );
  if (preferred.length >= 3) {
    return preferred.slice(0, 3);
  }
  const fallback = shuffleInPlace(
    eligible.filter((b) => excluded.has(b.id)),
    rng
  );
  return [...preferred, ...fallback].slice(0, 3);
}

export function getGlobalGemGainBonus(bestFloor: number): number {
  let pct = 0;
  for (const m of TOWER_MILESTONES) {
    if (bestFloor >= m.floor) pct = m.globalGemPct;
  }
  return pct;
}
