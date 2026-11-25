import * as THREE from 'three';
import type { OmegaBossId } from '../game/OmegaData';
import type { AttackImpactFxController } from './AttackImpactFx3D';
import type { OmegaFighterEntry, OmegaStrikeEvent } from './OmegaArenaStage3D';
import type {
  SignatureProjectileArrival,
  SignatureProjectilePool3D,
} from './SignatureProjectilePool3D';
import {
  ARENA_ULT_CHARGE_BASIC_ATTACKS,
  ARENA_ULT_SELF_COOLDOWN_SEC,
  ARENA_ULT_SPOTLIGHT_LOCK_SEC,
  BARRAGE_BEAT_WEIGHTS,
  BARRAGE_FOLLOWUP_DELAYS,
  computeAttackVfxSpeedScale,
  computeSpotlightMaxChargeSec,
  type SpotlightAttackQueue,
  type TierAttackVfxPool3D,
  type WorldPoint3,
} from './TierAttackVfx3D';

const BASIC_ATTACK_DPS_SHARE = 0.65;

export interface OmegaPendingBarrage {
  slotIndex: number;
  beatIndex: number;
  delayLeft: number;
  beatInterval: number;
  dmg: number;
  accentColor: string;
  comboStep: number;
  sx: number;
  sz: number;
  ex: number;
  ey: number;
  ez: number;
}

export interface OmegaCombatStepContext {
  safeDt: number;
  elapsed: number;
  camera: THREE.Camera;
  bossId: OmegaBossId;
  bossStageY: number;
  bossPosZ: number;
  getBattleActive: () => boolean;
  fighters: Map<number, OmegaFighterEntry>;
  projectiles: SignatureProjectilePool3D;
  pendingBarrages: OmegaPendingBarrage[];
  tierVfx: TierAttackVfxPool3D;
  impactFx: AttackImpactFxController;
  spotlight: SpotlightAttackQueue;
  onBossHitBounce: (bounce: number) => void;
  onStrike?: (ev: OmegaStrikeEvent) => void;
}

/** Steps Omega rooftop fighter cooldowns, 1.25s Ult relay, parallel basics, projectiles, and 7-hit barrages. */
export function stepOmegaCombatAndBarrages(ctx: OmegaCombatStepContext): void {
  const {
    safeDt,
    elapsed,
    camera,
    bossStageY,
    bossPosZ,
    getBattleActive,
    fighters,
    projectiles,
    pendingBarrages,
    tierVfx,
    impactFx,
    spotlight,
    onBossHitBounce,
    onStrike,
  } = ctx;

  const canAttack = getBattleActive();
  if (!canAttack) {
    projectiles.clear();
    pendingBarrages.length = 0;
    tierVfx.clear();
  }

  const handleOmegaArrival = (a: SignatureProjectileArrival): void => {
    const fighter = fighters.get(a.slotIndex);
    const isUlt = a.isUltimate;
    if (isUlt && fighter) {
      const lateralX = Math.max(-0.95, Math.min(0.95, fighter.spawnPos.x * 0.22));
      const bossPt: WorldPoint3 = { x: lateralX, y: bossStageY, z: bossPosZ + 0.25 };
      const speedScale = computeAttackVfxSpeedScale(fighter.attackInterval);
      tierVfx.fireTierAttack({
        rarity: fighter.rarity,
        chibiId: fighter.chibiId,
        colorHex: a.accentColor,
        target: bossPt,
        allTargets: [bossPt],
        comboStep: a.comboStep,
        speedScale,
        areaScale: 0.92,
        wideCenter: { x: lateralX * 0.75, y: bossStageY, z: bossPosZ + 0.25 },
      });
    }
    if (isUlt) {
      const beatCount = BARRAGE_BEAT_WEIGHTS.length;
      for (let bi = 1; bi < beatCount; bi++) {
        const w = BARRAGE_BEAT_WEIGHTS[bi];
        const isFinisher = bi === beatCount - 1;
        pendingBarrages.push({
          slotIndex: a.slotIndex,
          beatIndex: bi,
          delayLeft: BARRAGE_FOLLOWUP_DELAYS[bi - 1],
          beatInterval: a.attackInterval * w,
          dmg: Math.max(1, Math.round(a.dmg * w)),
          accentColor: a.accentColor,
          comboStep: isFinisher ? 2 : (a.comboStep + bi) % 2,
          sx: a.sx,
          sz: a.sz,
          ex: a.ex,
          ey: a.ey,
          ez: a.ez,
        });
      }
    }
    tierVfx.fireBarrageHitSlash({
      x: a.ex,
      y: a.ey,
      z: a.ez,
      colorHex: a.accentColor,
      beatIndex: 0,
      isFinisher: false,
      scale: isUlt ? 1.38 : 1.0,
    });
    if (!isUlt) {
      impactFx.spawnImpact({
        targetX: a.ex,
        targetY: a.ey,
        targetZ: a.ez,
        accentColor: a.accentColor,
        heavy: false,
        comboStep: a.comboStep % 2,
        attackerX: a.sx,
        attackerZ: a.sz,
        shockwaveScale: 0.72,
      });
    }
    onStrike?.({
      slotIndex: a.slotIndex,
      attackInterval: isUlt ? a.attackInterval * BARRAGE_BEAT_WEIGHTS[0] : a.attackInterval,
      isUltimate: isUlt,
      dmg: isUlt ? Math.max(1, Math.round(a.dmg * BARRAGE_BEAT_WEIGHTS[0])) : a.dmg,
      wx: a.ex,
      wy: a.ey,
      wz: a.ez,
      accentColor: a.accentColor,
      beatIndex: 0,
      isFinisher: false,
    });
  };

  const maxChargeSec = computeSpotlightMaxChargeSec(fighters.size);
  if (canAttack) {
    spotlight.step(safeDt);
  }

  for (const f of fighters.values()) {
    f.fx.update(elapsed, camera);
    f.colorHex = f.fx.getAccentColor();
    f.sprite.setAccentColor(f.colorHex);
    f.sprite.group.position.copy(f.spawnPos);
    f.sprite.setAnimState('idle');
    if (canAttack) {
      f.attackCooldown = Math.max(0, f.attackCooldown - safeDt);
      if (f.ultActiveTimer > 0) {
        f.ultActiveTimer = Math.max(0, f.ultActiveTimer - safeDt);
      }
      f.chargeSec = Math.min(maxChargeSec, f.chargeSec + safeDt);
      if (f.ultCharge >= ARENA_ULT_CHARGE_BASIC_ATTACKS && !f.ultArmed && f.attackCooldown <= f.attackInterval * 0.55) {
        f.ultArmed = true;
      }
    }
    f.sprite.update(safeDt, elapsed, camera);
  }

  const launchOmegaAttack = (f: OmegaFighterEntry, isUltimate: boolean, effectiveSec: number): void => {
    const step = f.comboStep;
    f.comboStep = (f.comboStep + 1) % 3;
    const bossPt: WorldPoint3 = { x: 0, y: bossStageY, z: bossPosZ + 0.25 };

    if (isUltimate) {
      f.sprite.triggerUltOpening(0.52);
      tierVfx.fireUltOpeningBurst({
        x: f.spawnPos.x,
        y: f.spawnPos.y,
        z: f.spawnPos.z,
        colorHex: f.colorHex,
      });
    } else {
      f.sprite.triggerPodiumCast(0.24);
    }
    tierVfx.firePodiumWeaponCast({
      rarity: isUltimate ? f.rarity : 'common',
      chibiId: f.chibiId,
      colorHex: f.colorHex,
      origin: { x: f.spawnPos.x, y: f.spawnPos.y, z: f.spawnPos.z },
      target: bossPt,
      allTargets: [bossPt],
    });
    if (isUltimate) {
      tierVfx.fireAnticipation(f.rarity, f.colorHex, bossPt, [bossPt]);
    }

    projectiles.launch(
      {
        style: f.style,
        slotIndex: f.slotIndex,
        targetId: -1,
        dmg: Math.max(1, Math.round(f.dmg * effectiveSec)),
        comboStep: step,
        accentColor: f.colorHex,
        sx: f.spawnPos.x,
        sy: f.spawnPos.y + 1.85,
        sz: f.spawnPos.z,
        ex: (Math.random() - 0.5) * 0.9,
        ey: bossStageY + 1.85,
        ez: bossPosZ + 0.25,
        attackInterval: effectiveSec,
        isBoss: true,
        isUltimate,
        hideVisual: true,
      },
      handleOmegaArrival
    );
  };

  if (canAttack) {
    // 1) Ult relay queue: armed Chibis (3/3 basic charge) fire 2.5s Sakuga Ult spaced 1.25s apart
    const activeUltFighter = spotlight.pickNextReady(fighters.values(), (f) => (f.ultArmed ? 0 : 1));
    if (activeUltFighter) {
      const ultSec = Math.max(0.01, activeUltFighter.ultBankSec + activeUltFighter.chargeSec);
      activeUltFighter.attackCooldown = Math.max(activeUltFighter.attackInterval, ARENA_ULT_SELF_COOLDOWN_SEC);
      activeUltFighter.chargeSec = 0;
      activeUltFighter.ultBankSec = 0;
      activeUltFighter.ultCharge = 0;
      activeUltFighter.ultArmed = false;
      activeUltFighter.ultActiveTimer = ARENA_ULT_SELF_COOLDOWN_SEC;
      spotlight.claim(activeUltFighter.slotIndex, ARENA_ULT_SPOTLIGHT_LOCK_SEC);
      launchOmegaAttack(activeUltFighter, true, ultSec);
    }

    // 2) Parallel basic attacks: all ready Chibis attack continuously without waiting
    for (const f of fighters.values()) {
      if (f.attackCooldown > 0 || f.ultActiveTimer > 0) continue;
      const elapsedSec = Math.max(0.01, f.chargeSec);
      const basicSec = elapsedSec * BASIC_ATTACK_DPS_SHARE;
      f.ultBankSec = Math.min(maxChargeSec, f.ultBankSec + elapsedSec * (1 - BASIC_ATTACK_DPS_SHARE));
      f.chargeSec = 0;
      f.attackCooldown = f.attackInterval;
      f.ultCharge = Math.min(ARENA_ULT_CHARGE_BASIC_ATTACKS, f.ultCharge + 1);
      launchOmegaAttack(f, false, basicSec);
    }

    projectiles.step(safeDt, camera, handleOmegaArrival);
    for (let i = pendingBarrages.length - 1; i >= 0; i--) {
      if (!getBattleActive() || pendingBarrages.length === 0) break;
      if (i >= pendingBarrages.length) {
        i = pendingBarrages.length - 1;
      }
      const b = pendingBarrages[i];
      if (!b) continue;
      b.delayLeft -= safeDt;
      if (b.delayLeft <= 0) {
        pendingBarrages.splice(i, 1);
        const isFinisher = b.beatIndex === BARRAGE_BEAT_WEIGHTS.length - 1;
        onBossHitBounce(isFinisher ? 0.14 : 0.08);
        tierVfx.fireBarrageHitSlash({
          x: b.ex,
          y: b.ey,
          z: b.ez,
          colorHex: b.accentColor,
          beatIndex: b.beatIndex,
          isFinisher,
          scale: 1.38,
        });
        impactFx.spawnImpact({
          targetX: b.ex,
          targetY: b.ey,
          targetZ: b.ez,
          accentColor: b.accentColor,
          heavy: isFinisher,
          comboStep: b.comboStep,
          attackerX: b.sx,
          attackerZ: b.sz,
          shockwaveScale: isFinisher ? 1.65 : 1.0,
        });
        onStrike?.({
          slotIndex: b.slotIndex,
          attackInterval: b.beatInterval,
          isUltimate: true,
          dmg: b.dmg,
          wx: b.ex,
          wy: b.ey,
          wz: b.ez,
          accentColor: b.accentColor,
          beatIndex: b.beatIndex,
          isFinisher,
        });
      }
    }
    if (camera) {
      tierVfx.update(safeDt, camera);
    }
  }
}
