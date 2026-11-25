import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import { CHIBI_MAX_STARS } from './GameData';
import {
  getOmegaBossById,
  getOmegaTierDef,
  getOmegaTierProgress,
  OMEGA_BATTLE_DURATION_SEC,
  OMEGA_KEY_GEM_COST,
  OMEGA_KEY_REGEN_MS,
  OMEGA_MAX_KEYS,
  OmegaBossId,
} from './OmegaData';

export interface OmegaBattleState {
  bossId: OmegaBossId;
  timeRemainingSec: number;
  durationSec: number;
  damageDealt: number;
  currentTier: 0 | 1 | 2 | 3 | 4 | 5;
  tapCount: number;
}

export interface OmegaBattleSummary {
  bossId: OmegaBossId;
  tierReached: 0 | 1 | 2 | 3 | 4 | 5;
  damageDealt: number;
  timeUsedSec: number;
  coresAwarded: number;
  gemsAwarded: number;
  diceAwarded: number;
  firstClear: boolean;
  isNewBest: boolean;
  retreated: boolean;
}

export interface OmegaStrikeResult {
  dmgDealt: number;
  isCrit: boolean;
  newTier: 0 | 1 | 2 | 3 | 4 | 5;
  tierUp: boolean;
}

export interface OmegaBossContext {
  gems: number;
  enchantDice: number;
  plotMiners: (string | null)[];
  miners: Record<string, number>;
  hotbar: (string | null)[];
  discovered: Set<string>;
  chibiStars: Record<string, number>;
  omegaKeys: number;
  omegaLastKeyRegenAt: number;
  omegaCoreTokens: number;
  omegaBestTier: Record<string, number>;
  omegaBestDamage: Record<string, number>;
  omegaKills: Record<string, number>;
  omegaClaimedFirstClears: string[];
  omegaBattle: OmegaBattleState | null;
  omegaLastSummary: OmegaBattleSummary | null;
  getPlotUnitStats(
    slotIndex: number,
    nowMs?: number,
    includeOverclock?: boolean
  ): { dmg: number; critChance?: number; critMult?: number } | null;
}

/** Regenerates Omega Boss Keys based on elapsed 60-minute (1-hour) intervals. */
export function syncOmegaKeysDomain(
  ctx: Pick<OmegaBossContext, 'omegaKeys' | 'omegaLastKeyRegenAt'>,
  now = Date.now(),
  save: () => void = () => {}
): void {
  if (ctx.omegaKeys >= OMEGA_MAX_KEYS) {
    ctx.omegaLastKeyRegenAt = now;
    return;
  }
  const elapsed = Math.max(0, now - ctx.omegaLastKeyRegenAt);
  const gained = Math.floor(elapsed / OMEGA_KEY_REGEN_MS);
  if (gained > 0) {
    ctx.omegaKeys = Math.min(OMEGA_MAX_KEYS, ctx.omegaKeys + gained);
    ctx.omegaLastKeyRegenAt =
      ctx.omegaKeys >= OMEGA_MAX_KEYS ? now : ctx.omegaLastKeyRegenAt + gained * OMEGA_KEY_REGEN_MS;
    save();
  }
}

export function getOmegaNextKeyRegenSecDomain(
  ctx: Pick<OmegaBossContext, 'omegaKeys' | 'omegaLastKeyRegenAt'>,
  now = Date.now(),
  save: () => void = () => {}
): number {
  syncOmegaKeysDomain(ctx, now, save);
  if (ctx.omegaKeys >= OMEGA_MAX_KEYS) return 0;
  const remMs = Math.max(0, OMEGA_KEY_REGEN_MS - (now - ctx.omegaLastKeyRegenAt));
  return Math.ceil(remMs / 1000);
}

export function buyOmegaKeyWithGemsDomain(
  ctx: Pick<OmegaBossContext, 'omegaKeys' | 'omegaLastKeyRegenAt' | 'gems'>,
  hooks: { save?: () => void; emit?: () => void } = {}
): 'bought' | 'full' | 'no_gems' {
  syncOmegaKeysDomain(ctx, Date.now(), hooks.save);
  if (ctx.omegaKeys >= OMEGA_MAX_KEYS) return 'full';
  if (ctx.gems < OMEGA_KEY_GEM_COST) return 'no_gems';
  ctx.gems -= OMEGA_KEY_GEM_COST;
  ctx.omegaKeys += 1;
  hooks.emit?.();
  return 'bought';
}

export function grantFreeOmegaKeyDomain(
  ctx: Pick<OmegaBossContext, 'omegaKeys' | 'omegaLastKeyRegenAt'>,
  hooks: { save?: () => void; emit?: () => void } = {}
): boolean {
  syncOmegaKeysDomain(ctx, Date.now(), hooks.save);
  if (ctx.omegaKeys >= OMEGA_MAX_KEYS) return false;
  ctx.omegaKeys += 1;
  hooks.emit?.();
  return true;
}

/** Computes total effective Squad DPS (excluding Overclock Fever) for Omega 30s DPS check. */
export function getOmegaSquadEffectiveDpsDomain(ctx: Pick<OmegaBossContext, 'getPlotUnitStats'>): number {
  let total = 0;
  for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
    const st = ctx.getPlotUnitStats(i, Date.now(), false);
    if (st) total += st.dmg;
  }
  return total;
}

/** Starts a 30-second Rift-style Omega Boss DPS Check and consumes 1 Boss Key immediately. */
export function startOmegaBossDomain(
  ctx: OmegaBossContext,
  bossId: OmegaBossId,
  now = Date.now(),
  hooks: { save?: () => void; emit?: () => void } = {}
): boolean {
  syncOmegaKeysDomain(ctx, now, hooks.save);
  if (ctx.omegaKeys <= 0) return false;
  const hasDeployed = ctx.plotMiners.some((id) => Boolean(id));
  if (!hasDeployed && getOmegaSquadEffectiveDpsDomain(ctx) <= 0) return false;
  if (getOmegaSquadEffectiveDpsDomain(ctx) <= 0) return false;

  if (ctx.omegaKeys >= OMEGA_MAX_KEYS) {
    ctx.omegaLastKeyRegenAt = now;
  }
  ctx.omegaKeys = Math.max(0, ctx.omegaKeys - 1);

  ctx.omegaLastSummary = null;
  ctx.omegaBattle = {
    bossId,
    timeRemainingSec: OMEGA_BATTLE_DURATION_SEC,
    durationSec: OMEGA_BATTLE_DURATION_SEC,
    damageDealt: 0,
    currentTier: 0,
    tapCount: 0,
  };
  hooks.save?.();
  hooks.emit?.();
  return true;
}

function addOmegaBattleDamage(
  battle: OmegaBattleState,
  amount: number
): { newTier: 0 | 1 | 2 | 3 | 4 | 5; tierUp: boolean } {
  const prevTier = battle.currentTier;
  battle.damageDealt = Math.max(0, battle.damageDealt + Math.max(0, amount));
  const prog = getOmegaTierProgress(battle.bossId, battle.damageDealt);
  battle.currentTier = prog.tier;
  return { newTier: prog.tier, tierUp: prog.tier > prevTier };
}

/** Applies a Chibi squad basic or Ult strike against the Omega Boss during the 30s DPS check. */
export function applyOmegaSquadStrikeDomain(
  ctx: Pick<OmegaBossContext, 'omegaBattle' | 'getPlotUnitStats'>,
  slotIndex: number,
  attackIntervalSec = 0.85,
  rng: () => number = Math.random
): OmegaStrikeResult {
  const battle = ctx.omegaBattle;
  if (!battle) {
    return { dmgDealt: 0, isCrit: false, newTier: 0, tierUp: false };
  }
  const st = ctx.getPlotUnitStats(slotIndex, Date.now(), false);
  if (!st || st.dmg <= 0) {
    return { dmgDealt: 0, isCrit: false, newTier: battle.currentTier, tierUp: false };
  }

  const critChance = Math.min(0.95, st.critChance ?? 0.22);
  const isCrit = rng() < critChance;
  const critMult = isCrit ? (st.critMult ?? 1.85) : 1.0;

  const dmgDealt = Math.max(
    1,
    Math.round(st.dmg * Math.max(0.05, attackIntervalSec) * critMult)
  );
  const { newTier, tierUp } = addOmegaBattleDamage(battle, dmgDealt);
  return { dmgDealt, isCrit, newTier, tierUp };
}

/** Applies a player manual tap hit against the Omega Boss. */
export function applyOmegaTapDamageDomain(
  ctx: Pick<OmegaBossContext, 'omegaBattle'>,
  baseTapDmg: number,
  baseCritChance = 0.15,
  baseCritMult = 2.5,
  rng: () => number = Math.random
): OmegaStrikeResult {
  const battle = ctx.omegaBattle;
  if (!battle || baseTapDmg <= 0) {
    return { dmgDealt: 0, isCrit: false, newTier: battle?.currentTier ?? 0, tierUp: false };
  }
  const critChance = Math.min(0.95, baseCritChance);
  const isCrit = rng() < critChance;
  const critMult = isCrit ? baseCritMult : 1;
  const dmgDealt = Math.max(1, Math.round(baseTapDmg * critMult));
  battle.tapCount += 1;
  const { newTier, tierUp } = addOmegaBattleDamage(battle, dmgDealt);
  return { dmgDealt, isCrit, newTier, tierUp };
}

/** Advances the 30s Omega Boss countdown and settles rewards at 0s. */
export function stepOmegaBossTickDomain(
  ctx: OmegaBossContext,
  dtSec: number,
  emit: () => void = () => {}
): { finished: boolean; summary: OmegaBattleSummary | null } {
  const battle = ctx.omegaBattle;
  if (!battle) return { finished: false, summary: null };

  const safeDt = Math.max(0, Math.min(30, Number.isFinite(dtSec) ? dtSec : 0));
  battle.timeRemainingSec = Math.max(0, battle.timeRemainingSec - safeDt);

  if (battle.timeRemainingSec <= 0) {
    const summary = finishOmegaBossDomain(ctx, false, emit);
    return { finished: true, summary };
  }
  return { finished: false, summary: null };
}

/** Resolves a finished (or retreated) 30s Omega Boss battle and grants shared Omega Cores + Gems/Dice. */
export function finishOmegaBossDomain(
  ctx: OmegaBossContext,
  retreated = false,
  emit: () => void = () => {}
): OmegaBattleSummary | null {
  const battle = ctx.omegaBattle;
  if (!battle) return null;

  const prog = getOmegaTierProgress(battle.bossId, battle.damageDealt);
  const tierReached = prog.tier;
  const coresAwarded = prog.cores;
  let gemsAwarded = 0;
  let diceAwarded = 0;
  let firstClear = false;

  if (tierReached > 0) {
    ctx.omegaCoreTokens = Math.max(0, Math.floor(ctx.omegaCoreTokens) + coresAwarded);
    ctx.omegaKills[battle.bossId] = (ctx.omegaKills[battle.bossId] || 0) + 1;

    for (let t = 1; t <= tierReached; t++) {
      const clearKey = `${battle.bossId}:${t}`;
      if (!ctx.omegaClaimedFirstClears.includes(clearKey)) {
        ctx.omegaClaimedFirstClears.push(clearKey);
        const tDef = getOmegaTierDef(battle.bossId, t);
        firstClear = true;
        gemsAwarded += tDef.firstClearGems;
        diceAwarded += tDef.firstClearDice;
      }
    }
    if (!firstClear) {
      gemsAwarded = prog.repeatGems;
    }

    ctx.gems += gemsAwarded;
    ctx.enchantDice += diceAwarded;
  }

  const prevBestDmg = ctx.omegaBestDamage[battle.bossId] || 0;
  const prevBestTier = ctx.omegaBestTier[battle.bossId] || 0;
  const isNewBest = battle.damageDealt > prevBestDmg || tierReached > prevBestTier;
  if (battle.damageDealt > prevBestDmg) {
    ctx.omegaBestDamage[battle.bossId] = battle.damageDealt;
  }
  if (tierReached > prevBestTier) {
    ctx.omegaBestTier[battle.bossId] = tierReached;
  }

  const summary: OmegaBattleSummary = {
    bossId: battle.bossId,
    tierReached,
    damageDealt: battle.damageDealt,
    timeUsedSec: Math.max(0, Math.round(battle.durationSec - battle.timeRemainingSec)),
    coresAwarded,
    gemsAwarded,
    diceAwarded,
    firstClear,
    isNewBest,
    retreated,
  };
  ctx.omegaBattle = null;
  ctx.omegaLastSummary = summary;
  emit();
  return summary;
}

/** Ends an active Omega battle early while still awarding shared Cores/Gems for any Tier already reached. */
export function retreatOmegaBossDomain(
  ctx: OmegaBossContext,
  emit: () => void = () => {}
): OmegaBattleSummary | null {
  return finishOmegaBossDomain(ctx, true, emit);
}

/** Unlocks an OMEGA Chibi using shared Omega Cores (places in bag/hotbar & Index). */
export function unlockOmegaChibiDomain(
  ctx: Pick<OmegaBossContext, 'omegaCoreTokens' | 'miners' | 'hotbar' | 'discovered' | 'chibiStars'>,
  bossId: OmegaBossId,
  hooks: { save?: () => void; emit?: () => void } = {}
): 'unlocked' | 'owned' | 'no_cores' | 'invalid' {
  const def = getOmegaBossById(bossId);
  if (!def) return 'invalid';
  if ((ctx.miners[def.chibiId] || 0) > 0) return 'owned';
  const cores = Math.max(0, Math.floor(ctx.omegaCoreTokens || 0));
  if (cores < def.unlockCoreCost) return 'no_cores';

  ctx.omegaCoreTokens = cores - def.unlockCoreCost;
  ctx.miners[def.chibiId] = 1;
  ctx.chibiStars[def.chibiId] = Math.max(1, ctx.chibiStars[def.chibiId] || 1);
  ctx.discovered.add(def.chibiId);
  if (!ctx.hotbar.includes(def.chibiId)) {
    const emptyIdx = ctx.hotbar.indexOf(null);
    if (emptyIdx !== -1) ctx.hotbar[emptyIdx] = def.chibiId;
  }
  hooks.save?.();
  hooks.emit?.();
  return 'unlocked';
}

/** Awakens an owned OMEGA Chibi from 1★ toward 5★ using shared Omega Cores (+20% passives/star). */
export function awakenOmegaChibiDomain(
  ctx: Pick<OmegaBossContext, 'omegaCoreTokens' | 'miners' | 'chibiStars'>,
  bossId: OmegaBossId,
  hooks: { save?: () => void; emit?: () => void } = {}
): 'awakened' | 'not_owned' | 'maxed' | 'no_cores' | 'invalid' {
  const def = getOmegaBossById(bossId);
  if (!def) return 'invalid';
  if ((ctx.miners[def.chibiId] || 0) <= 0) return 'not_owned';

  const curStars = Math.max(1, ctx.chibiStars[def.chibiId] || 1);
  if (curStars >= CHIBI_MAX_STARS) return 'maxed';
  const cost = def.awakenCoreCosts[curStars - 1] ?? def.awakenCoreCosts[def.awakenCoreCosts.length - 1];
  const cores = Math.max(0, Math.floor(ctx.omegaCoreTokens || 0));
  if (cores < cost) return 'no_cores';

  ctx.omegaCoreTokens = cores - cost;
  ctx.chibiStars[def.chibiId] = curStars + 1;
  hooks.save?.();
  hooks.emit?.();
  return 'awakened';
}
