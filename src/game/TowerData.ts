import { ItemRarity, ORES } from './GameData';
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
  title: string;
  hp: number;
  durationSec: number;
  gemReward: number;
  diceDropChance: number;
  anomaly: TowerAnomalyDef;
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

export interface TowerBlessingDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  dpsBonusPct?: number;
  tapBonusPct?: number;
  gemBonusPct?: number;
  extraTimerSec?: number;
}

export interface TowerMilestoneDef {
  floor: number;
  gemBonus: number;
  diceBonus: number;
  globalGemPct: number;
  title: string;
}

export const TOWER_MAX_KEYS = 5;
export const TOWER_KEY_REGEN_MS = 10 * 60 * 1000; // 10 minutes per key
export const TOWER_CHECKPOINT_STEP = 5;
export const TOWER_WAVES_PER_FLOOR = 10;
export const TOWER_ORE_ROCKS_PER_WAVE = 5;
export const TOWER_BOSS_WAVE = 10;
export const TOWER_BLESSING_AUTO_PICK_SEC = 5;
export const TOWER_BOSS_INVUL_SEC = 5;

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
    dpsBonusPct: 0.35,
  },
  {
    id: 'gem-magnet',
    name: 'Crystal Greed',
    desc: '+30% Gems earned in this run',
    color: '#f472b6',
    gemBonusPct: 0.3,
  },
  {
    id: 'chrono-shard',
    name: 'Chrono Shard',
    desc: '+5s Timer on every wave in this run',
    color: '#facc15',
    extraTimerSec: 5,
  },
  {
    id: 'breaker-click',
    name: 'Core Breaker',
    desc: '+150% Click Damage in this run',
    color: '#4ade80',
    tapBonusPct: 1.5,
  },
];

export const TOWER_MILESTONES: readonly TowerMilestoneDef[] = [
  { floor: 5, gemBonus: 80, diceBonus: 1, globalGemPct: 0.1, title: 'Spire Initiate' },
  { floor: 10, gemBonus: 180, diceBonus: 2, globalGemPct: 0.2, title: 'Crystal Warden' },
  { floor: 15, gemBonus: 300, diceBonus: 2, globalGemPct: 0.3, title: 'Vein Breaker' },
  { floor: 20, gemBonus: 460, diceBonus: 3, globalGemPct: 0.4, title: 'Astral Climber' },
  { floor: 25, gemBonus: 650, diceBonus: 3, globalGemPct: 0.5, title: 'Eclipse Striker' },
  { floor: 30, gemBonus: 900, diceBonus: 4, globalGemPct: 0.6, title: 'Obsidian Sentinel' },
  { floor: 35, gemBonus: 1200, diceBonus: 4, globalGemPct: 0.7, title: 'Void Challenger' },
  { floor: 40, gemBonus: 1550, diceBonus: 5, globalGemPct: 0.8, title: 'Monolith Lord' },
  { floor: 45, gemBonus: 1950, diceBonus: 5, globalGemPct: 0.9, title: 'Apex Sovereign' },
  { floor: 50, gemBonus: 2500, diceBonus: 7, globalGemPct: 1.0, title: 'Spire Sovereign' },
];

export function getAnomalyForFloor(floor: number): TowerAnomalyDef {
  if (floor <= 2 || floor % 2 === 1) return TOWER_ANOMALIES[0];
  const rotating = TOWER_ANOMALIES.slice(1);
  return rotating[(Math.floor(floor / 2) - 1) % rotating.length];
}

export function getTowerFloorDef(floor: number): TowerFloorDef {
  const f = Math.max(1, Math.floor(floor));
  const isBoss = f % TOWER_CHECKPOINT_STEP === 0;
  const anomaly = getAnomalyForFloor(f);
  const rawBossHp = 280 * Math.pow(1.52, f - 1) * (isBoss ? 1.4 : 1) * anomaly.hpMult;
  const hp = Math.max(150, Math.round(rawBossHp));
  const baseDur = isBoss ? 38 : 34;
  const durationSec = Math.max(16, baseDur + anomaly.timerDeltaSec);
  const gemReward = Math.max(
    18,
    Math.round((22 + f * 9) * (isBoss ? 1.85 : 1) * anomaly.gemMult)
  );
  const diceDropChance = isBoss ? Math.min(0.75, 0.25 + f * 0.01) : 0.1;
  const title = isBoss ? `Checkpoint Floor ${f}` : `Floor ${f}`;

  return {
    floor: f,
    isBoss,
    title,
    hp,
    durationSec,
    gemReward,
    diceDropChance,
    anomaly,
  };
}

export function getTowerWaveDef(floor: number, wave: number): TowerWaveDef {
  const f = Math.max(1, Math.floor(floor));
  const w = Math.max(1, Math.min(TOWER_WAVES_PER_FLOOR, Math.floor(wave)));
  const floorDef = getTowerFloorDef(f);
  const isBoss = w === TOWER_BOSS_WAVE;
  const floorScale = Math.pow(1.52, f - 1);
  const waveScale = 1 + (w - 1) * 0.14;
  const rockBaseHp = Math.max(18, Math.round(32 * floorScale * waveScale));
  const bossHp = floorDef.hp;
  const baseDur = isBoss ? floorDef.durationSec : Math.max(14, 24 + floorDef.anomaly.timerDeltaSec);
  const waveGemReward = isBoss
    ? floorDef.gemReward
    : Math.max(3, Math.round((3 + f * 1.4) * floorDef.anomaly.gemMult));

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
  const ores: TowerWaveOreState[] = [];
  for (let i = 0; i < TOWER_ORE_ROCKS_PER_WAVE; i++) {
    const oreIdx = Math.min(ORES.length - 1, Math.max(0, Math.floor(rng() * ORES.length)));
    const oreDef = ORES[oreIdx];
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
  const list = [1];
  for (let f = TOWER_CHECKPOINT_STEP; f <= bestFloor; f += TOWER_CHECKPOINT_STEP) {
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
  return Math.max(18, Math.round(total * 0.8));
}

export interface TowerSaveData {
  bestFloor: number;
  keys: number;
  lastKeyRegenAt: number;
  claimedMilestones: number[];
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
  floorsCleared: number;
  wavesCleared: number;
  blessings: TowerBlessingDef[];
  pendingBlessings: TowerBlessingDef[] | null;
  blessingTimerLeft?: number;
  bossInvulLeft?: number;
}

export interface TowerRunSummary {
  startFloor: number;
  highestReached: number;
  highestWave: number;
  floorsCleared: number;
  wavesCleared: number;
  gemsEarned: number;
  diceEarned: number;
  newRecord: boolean;
  reason: 'timeout' | 'exit';
}

export function pickTowerBlessingChoices(rng: () => number = Math.random): TowerBlessingDef[] {
  const pool = [...TOWER_BLESSINGS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, 3);
}

export function getGlobalGemGainBonus(bestFloor: number): number {
  let pct = 0;
  for (const m of TOWER_MILESTONES) {
    if (bestFloor >= m.floor) pct = m.globalGemPct;
  }
  return pct;
}
