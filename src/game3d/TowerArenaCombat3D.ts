import * as THREE from 'three';
import type { AttackImpactFxController } from './AttackImpactFx3D';
import type { ChibiDef } from './ChibiCatalog';
import type { ChibiSprite3D } from './ChibiSprite3D';
import type { ChibiFieldFxController } from './FieldMiner3D';
import type { OreVariantKey } from './MineWorldPalette';
import { getGeodeGlowTexture, OreBillboard2D } from './OrePit3D';
import {
  type PlotAttackStyle,
  type SignatureProjectileArrival,
  type SignatureProjectilePool3D,
} from './SignatureProjectilePool3D';
import {
  BARRAGE_BEAT_WEIGHTS,
  BARRAGE_FOLLOWUP_DELAYS,
  CHIBI_ATTACK_ANIM_SEC,
  computeAttackVfxSpeedScale,
  computeSpotlightMaxChargeSec,
  SpotlightAttackQueue,
  ULT_CHARGE_BASIC_ATTACKS,
  ULT_SPOTLIGHT_LOCK_SEC,
  type TierAttackVfxPool3D,
  type WorldPoint3,
} from './TierAttackVfx3D';

const BASIC_ATTACK_DPS_SHARE = 0.65;

export interface TowerFighterConfig {
  slotIndex: number;
  def: ChibiDef;
  enchantId: string | null;
  dmg: number;
  speed: number;
  miningMult: number;
}

export interface TowerStrikeEvent {
  slotIndex: number;
  targetOreIndex: number | null;
  attackInterval: number;
  dmg: number;
  wx: number;
  wy: number;
  wz: number;
  accentColor?: string;
  comboStep?: number;
  attackerX?: number;
  attackerZ?: number;
  beatIndex?: number;
  isFinisher?: boolean;
}

export interface TowerOreBarScreen {
  index: number;
  name: string;
  color: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  variantKey: OreVariantKey;
}

export interface TowerWaveRockSlot {
  index: number;
  x: number;
  z: number;
  root: THREE.Group;
  oreSprite: OreBillboard2D;
  hitMesh: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  ringMesh: THREE.Mesh;
  alive: boolean;
  hp: number;
  maxHp: number;
  name: string;
  color: string;
  variantKey: OreVariantKey;
  squashAmt: number;
  recoilAmt: number;
  recoilDirX: number;
  flashTimer: number;
  spawnScale: number;
  phase: number;
}

export interface TowerChibiFighter {
  slotIndex: number;
  def: ChibiDef;
  style: PlotAttackStyle;
  sprite: ChibiSprite3D;
  fx: ChibiFieldFxController;
  spawnPos: THREE.Vector3;
  targetOreIndex: number;
  dmg: number;
  attackInterval: number;
  attackCooldown: number;
  chargeSec: number;
  ultCharge: number;
  ultBankSec: number;
  ultArmed: boolean;
  ultActiveTimer: number;
  comboStep: number;
  enchantId: string | null;
  colorHex: string;
}

export interface TowerPendingBarrage {
  slotIndex: number;
  targetOreIndex: number;
  isBoss: boolean;
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

export const TOWER_ARENA_CENTER_Z = -1.6;
export const TOWER_BOSS_CENTER_Z = TOWER_ARENA_CENTER_Z - 4.35;
export const TOWER_SUMMON_RADIUS = 7.45;

export const TOWER_WAVE_ORE_POSITIONS: ReadonlyArray<[number, number]> = [
  [-4.6, TOWER_ARENA_CENTER_Z + 1.15],
  [4.6, TOWER_ARENA_CENTER_Z + 1.15],
  [-5.25, TOWER_ARENA_CENTER_Z - 2.05],
  [5.25, TOWER_ARENA_CENTER_Z - 2.05],
  [0, TOWER_ARENA_CENTER_Z - 3.35],
];

export function createTowerWaveOreSlot(index: number): TowerWaveRockSlot {
  const [x, z] = TOWER_WAVE_ORE_POSITIONS[index];
  const root = new THREE.Group();
  root.position.set(x, 0.08, z);
  root.visible = false;

  const oreSprite = new OreBillboard2D(2.37);
  root.add(oreSprite.root);

  const geodeTex = getGeodeGlowTexture();
  const ringMat = new THREE.MeshBasicMaterial({
    ...(geodeTex ? { map: geodeTex } : {}),
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: geodeTex ? 0.72 : 0.56,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ringMesh = new THREE.Mesh(
    geodeTex ? new THREE.PlaneGeometry(3.18, 3.18) : new THREE.RingGeometry(1.23, 1.56, 24),
    ringMat
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.032;
  root.add(ringMesh);

  const hitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.68, 3.25, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hitMesh.position.y = 1.55;
  hitMesh.userData = { kind: 'tower-ore', oreIndex: index };
  hitMesh.visible = false;
  root.add(hitMesh);

  return {
    index,
    x,
    z,
    root,
    oreSprite,
    hitMesh,
    ringMat,
    ringMesh,
    alive: false,
    hp: 0,
    maxHp: 100,
    name: 'Ore',
    color: '#38bdf8',
    variantKey: 'common',
    squashAmt: 0,
    recoilAmt: 0,
    recoilDirX: 1,
    flashTimer: 0,
    spawnScale: 1,
    phase: index * 1.1,
  };
}

export function pickTowerTargetOreForFighter(
  fighter: TowerChibiFighter,
  waveRocks: readonly TowerWaveRockSlot[],
  fighters: Map<number, TowerChibiFighter>
): TowerWaveRockSlot | null {
  const aliveRocks = waveRocks.filter((r) => r.alive);
  if (aliveRocks.length === 0) return null;

  const targetCounts = new Map<number, number>();
  for (const r of aliveRocks) targetCounts.set(r.index, 0);
  for (const other of fighters.values()) {
    if (other.slotIndex === fighter.slotIndex) continue;
    if (targetCounts.has(other.targetOreIndex)) {
      targetCounts.set(other.targetOreIndex, (targetCounts.get(other.targetOreIndex) ?? 0) + 1);
    }
  }

  let minCount = Infinity;
  for (const c of targetCounts.values()) {
    if (c < minCount) minCount = c;
  }

  const existing = aliveRocks.find((r) => r.index === fighter.targetOreIndex);
  if (existing && (targetCounts.get(existing.index) ?? 0) <= minCount) {
    return existing;
  }

  const pos = fighter.sprite.group.position;
  let best = aliveRocks[0];
  let bestScore = Infinity;
  for (const r of aliveRocks) {
    const count = targetCounts.get(r.index) ?? 0;
    const dist = Math.hypot(r.x - pos.x, r.z - pos.z);
    const score = count * 100 + dist;
    if (score < bestScore) {
      bestScore = score;
      best = r;
    }
  }
  fighter.targetOreIndex = best.index;
  return best;
}

export function stepTowerWaveRocks(
  safeDt: number,
  elapsed: number,
  waveRocks: readonly TowerWaveRockSlot[],
  camera?: THREE.Camera
): void {
  for (const rock of waveRocks) {
    if (!rock.alive) continue;
    if (rock.spawnScale < 1) {
      rock.spawnScale = Math.min(1, rock.spawnScale + safeDt * 5.2);
    }
    if (rock.squashAmt > 0.001) {
      rock.squashAmt = Math.max(0, rock.squashAmt - safeDt * 2.5);
    }
    if (rock.recoilAmt > 0.001) {
      rock.recoilAmt = Math.max(0, rock.recoilAmt - safeDt * 1.35);
    }
    const flashing = rock.flashTimer > 0;
    if (flashing) {
      rock.flashTimer -= safeDt;
    }
    rock.oreSprite.updateTransform(
      elapsed,
      rock.phase,
      rock.squashAmt,
      rock.spawnScale,
      flashing,
      camera,
      rock.recoilAmt * rock.recoilDirX
    );
    rock.ringMesh.rotation.z = elapsed * 0.18 + rock.phase;
  }
}

export function stepTowerFightersAndBarrages(ctx: {
  safeDt: number;
  elapsed: number;
  paused: boolean;
  bossWave: boolean;
  camera?: THREE.Camera;
  fighters: Map<number, TowerChibiFighter>;
  waveRocks: readonly TowerWaveRockSlot[];
  pendingBarrages: TowerPendingBarrage[];
  spotlight: SpotlightAttackQueue;
  targetPtsScratch: WorldPoint3[];
  projectiles: SignatureProjectilePool3D;
  tierVfx: TierAttackVfxPool3D;
  impactFx: AttackImpactFxController;
  triggerBossBounce: () => void;
  spawnTowerShardsAt: (
    x: number,
    y: number,
    z: number,
    colorHex: string,
    count: number,
    isShatter?: boolean,
    isBoss?: boolean
  ) => void;
  onFighterStrike?: (ev: TowerStrikeEvent) => void;
}): void {
  const beatCount = BARRAGE_BEAT_WEIGHTS.length;
  const resolveBarrageBeat = (b: TowerPendingBarrage): void => {
    if (ctx.paused || b.isBoss !== ctx.bossWave) return;
    const isFinisher = b.beatIndex === beatCount - 1;
    if (b.isBoss) {
      ctx.triggerBossBounce();
      ctx.tierVfx.fireBarrageHitSlash({
        x: b.ex,
        y: 2.35,
        z: TOWER_BOSS_CENTER_Z + 0.95,
        colorHex: b.accentColor,
        beatIndex: b.beatIndex,
        isFinisher,
        scale: 1.38,
      });
      ctx.impactFx.spawnImpact({
        targetX: b.ex,
        targetY: 2.45,
        targetZ: TOWER_BOSS_CENTER_Z + 1.05,
        accentColor: b.accentColor,
        heavy: isFinisher,
        comboStep: b.comboStep,
        attackerX: b.sx,
        attackerZ: b.sz,
        shockwaveScale: isFinisher ? 1.75 : 1.05,
      });
      ctx.spawnTowerShardsAt(b.ex, 2.2, TOWER_BOSS_CENTER_Z + 1.05, b.accentColor, isFinisher ? 6 : 2, false, true);
      ctx.onFighterStrike?.({
        slotIndex: b.slotIndex,
        targetOreIndex: null,
        attackInterval: b.beatInterval,
        dmg: b.dmg,
        wx: b.ex,
        wy: b.ey,
        wz: TOWER_ARENA_CENTER_Z + 0.45,
        accentColor: b.accentColor,
        comboStep: b.comboStep,
        attackerX: b.sx,
        attackerZ: b.sz,
        beatIndex: b.beatIndex,
        isFinisher,
      });
    } else {
      let rock = ctx.waveRocks[b.targetOreIndex];
      if (!rock || !rock.alive) {
        const fighter = ctx.fighters.get(b.slotIndex);
        rock =
          (fighter ? pickTowerTargetOreForFighter(fighter, ctx.waveRocks, ctx.fighters) : null) ??
          ctx.waveRocks.find((r) => r.alive) ??
          rock;
      }
      if (!rock || !rock.alive) return;
      ctx.tierVfx.fireBarrageHitSlash({
        x: rock.x,
        y: 1.3,
        z: rock.z,
        colorHex: b.accentColor,
        beatIndex: b.beatIndex,
        isFinisher,
        scale: 1.24,
      });
      ctx.impactFx.spawnImpact({
        targetX: rock.x,
        targetY: 1.35,
        targetZ: rock.z,
        accentColor: b.accentColor,
        heavy: isFinisher,
        comboStep: b.comboStep,
        attackerX: b.sx,
        attackerZ: b.sz,
        shockwaveScale: isFinisher ? 1.45 : 0.9,
      });
      ctx.spawnTowerShardsAt(rock.x, 1.1, rock.z, b.accentColor, isFinisher ? 5 : 2, false);
      ctx.onFighterStrike?.({
        slotIndex: b.slotIndex,
        targetOreIndex: rock.index,
        attackInterval: b.beatInterval,
        dmg: b.dmg,
        wx: rock.x,
        wy: 1.35,
        wz: rock.z,
        accentColor: b.accentColor,
        comboStep: b.comboStep,
        attackerX: b.sx,
        attackerZ: b.sz,
        beatIndex: b.beatIndex,
        isFinisher,
      });
    }
  };

  const handleProjectileArrival = (a: SignatureProjectileArrival): void => {
    if (ctx.paused) return;
    const fighter = ctx.fighters.get(a.slotIndex);
    const isUlt = a.isUltimate;
    const speedScale = computeAttackVfxSpeedScale(fighter ? fighter.attackInterval : CHIBI_ATTACK_ANIM_SEC);
    const beat0Interval = isUlt ? a.attackInterval * BARRAGE_BEAT_WEIGHTS[0] : a.attackInterval;
    const beat0Dmg = isUlt ? Math.max(1, Math.round(a.dmg * BARRAGE_BEAT_WEIGHTS[0])) : a.dmg;

    if (isUlt) {
      for (let bi = 1; bi < beatCount; bi++) {
        const w = BARRAGE_BEAT_WEIGHTS[bi];
        const isFinisher = bi === beatCount - 1;
        ctx.pendingBarrages.push({
          slotIndex: a.slotIndex,
          targetOreIndex: a.targetId,
          isBoss: a.isBoss,
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

    if (a.isBoss) {
      if (!ctx.bossWave) return;
      ctx.triggerBossBounce();
      if (isUlt && fighter) {
        const lateralX = Math.max(-0.95, Math.min(0.95, fighter.spawnPos.x * 0.16));
        const bossPt: WorldPoint3 = { x: lateralX, y: 0.8, z: TOWER_BOSS_CENTER_Z + 0.85 };
        ctx.tierVfx.fireTierAttack({
          rarity: fighter.def.rarity,
          chibiId: fighter.def.id,
          colorHex: a.accentColor,
          target: bossPt,
          allTargets: [bossPt],
          comboStep: a.comboStep,
          speedScale,
          areaScale: 0.92,
          wideCenter: { x: lateralX * 0.75, y: 0.45, z: TOWER_BOSS_CENTER_Z + 1.15 },
        });
      }
      ctx.tierVfx.fireBarrageHitSlash({
        x: a.ex,
        y: 2.35,
        z: TOWER_BOSS_CENTER_Z + 0.95,
        colorHex: a.accentColor,
        beatIndex: 0,
        isFinisher: false,
        scale: isUlt ? 1.38 : 1.02,
      });
      ctx.impactFx.spawnImpact({
        targetX: a.ex,
        targetY: 2.45,
        targetZ: TOWER_BOSS_CENTER_Z + 1.05,
        accentColor: a.accentColor,
        comboStep: a.comboStep % 2,
        attackerX: a.sx,
        attackerZ: a.sz,
        shockwaveScale: isUlt ? 1.15 : 0.72,
      });
      ctx.spawnTowerShardsAt(a.ex, 2.2, TOWER_BOSS_CENTER_Z + 1.05, a.accentColor, isUlt ? 4 : 2, false, true);
      ctx.onFighterStrike?.({
        slotIndex: a.slotIndex,
        targetOreIndex: null,
        attackInterval: beat0Interval,
        dmg: beat0Dmg,
        wx: a.ex,
        wy: a.ey,
        wz: TOWER_ARENA_CENTER_Z + 0.45,
        accentColor: a.accentColor,
        comboStep: a.comboStep,
        attackerX: a.sx,
        attackerZ: a.sz,
        beatIndex: 0,
        isFinisher: false,
      });
    } else {
      if (ctx.bossWave) return;
      let rock = ctx.waveRocks[a.targetId];
      if (!rock || !rock.alive) {
        rock = ctx.waveRocks.find((r) => r.alive) ?? rock;
      }
      if (!rock || !rock.alive) return;
      if (isUlt && fighter) {
        ctx.targetPtsScratch.length = 0;
        for (let ri = 0; ri < ctx.waveRocks.length; ri++) {
          const wr = ctx.waveRocks[ri];
          if (wr.alive) ctx.targetPtsScratch.push({ x: wr.x, y: 0.45, z: wr.z });
        }
        const waveBaseZ = TOWER_ARENA_CENTER_Z - 0.5;
        ctx.tierVfx.fireTierAttack({
          rarity: fighter.def.rarity,
          chibiId: fighter.def.id,
          colorHex: a.accentColor,
          target: { x: rock.x, y: 0.45, z: rock.z },
          allTargets: ctx.targetPtsScratch,
          comboStep: a.comboStep,
          speedScale,
          areaScale: 0.88,
          wideCenter: {
            x: rock.x * 0.5,
            y: 0.45,
            z: waveBaseZ + (rock.z - waveBaseZ) * 0.5,
          },
        });
      }
      ctx.tierVfx.fireBarrageHitSlash({
        x: rock.x,
        y: 1.3,
        z: rock.z,
        colorHex: a.accentColor,
        beatIndex: 0,
        isFinisher: false,
        scale: isUlt ? 1.24 : 0.88,
      });
      ctx.onFighterStrike?.({
        slotIndex: a.slotIndex,
        targetOreIndex: rock.index,
        attackInterval: beat0Interval,
        dmg: beat0Dmg,
        wx: rock.x,
        wy: 1.35,
        wz: rock.z,
        accentColor: a.accentColor,
        comboStep: a.comboStep,
        attackerX: a.sx,
        attackerZ: a.sz,
        beatIndex: 0,
        isFinisher: false,
      });
    }
  };

  let hasAliveRock = false;
  if (!ctx.bossWave) {
    for (let ri = 0; ri < ctx.waveRocks.length; ri++) {
      if (ctx.waveRocks[ri].alive) {
        hasAliveRock = true;
        break;
      }
    }
  }
  const hasTargets = ctx.bossWave || hasAliveRock;
  const maxChargeSec = computeSpotlightMaxChargeSec(ctx.fighters.size);

  if (!ctx.paused) {
    ctx.spotlight.step(ctx.safeDt);
  }

  for (const f of ctx.fighters.values()) {
    f.fx.update(ctx.elapsed);
    f.colorHex = f.fx.getAccentColor();
    f.sprite.setAccentColor(f.colorHex);
    f.sprite.group.position.copy(f.spawnPos);
    f.sprite.setAnimState('idle');
    if (!ctx.paused) {
      f.attackCooldown = Math.max(0, f.attackCooldown - ctx.safeDt);
      if (f.ultActiveTimer > 0) {
        f.ultActiveTimer = Math.max(0, f.ultActiveTimer - ctx.safeDt);
      }
      if (hasTargets) {
        f.chargeSec = Math.min(maxChargeSec, f.chargeSec + ctx.safeDt);
      }
      if (f.ultCharge >= ULT_CHARGE_BASIC_ATTACKS && !f.ultArmed && f.attackCooldown <= f.attackInterval * 0.55) {
        f.ultArmed = true;
      }
    }
  }

  const launchTowerAttack = (f: TowerChibiFighter, isUltimate: boolean, effectiveSec: number): void => {
    const pos = f.sprite.group.position;
    const step = f.comboStep;
    f.comboStep = (f.comboStep + 1) % 3;
    if (!ctx.bossWave) {
      const targetRock = pickTowerTargetOreForFighter(f, ctx.waveRocks, ctx.fighters);
      if (!targetRock) return;
      ctx.targetPtsScratch.length = 0;
      for (let ri = 0; ri < ctx.waveRocks.length; ri++) {
        const wr = ctx.waveRocks[ri];
        if (wr.alive) ctx.targetPtsScratch.push({ x: wr.x, y: 0.45, z: wr.z });
      }
      const targetPt: WorldPoint3 = { x: targetRock.x, y: 0.45, z: targetRock.z };
      const waveBaseZ = TOWER_ARENA_CENTER_Z - 0.5;
      const waveWideCenter: WorldPoint3 = {
        x: targetRock.x * 0.5,
        y: 0.45,
        z: waveBaseZ + (targetRock.z - waveBaseZ) * 0.5,
      };

      if (isUltimate) {
        f.sprite.triggerUltOpening(0.52);
        ctx.tierVfx.fireUltOpeningBurst({ x: pos.x, y: pos.y, z: pos.z, colorHex: f.colorHex });
      } else {
        f.sprite.triggerPodiumCast(0.24);
      }
      ctx.tierVfx.firePodiumWeaponCast({
        rarity: isUltimate ? f.def.rarity : 'common',
        chibiId: f.def.id,
        colorHex: f.colorHex,
        origin: { x: pos.x, y: pos.y, z: pos.z },
        target: targetPt,
        allTargets: ctx.targetPtsScratch,
        wideCenter: isUltimate ? waveWideCenter : undefined,
      });
      if (isUltimate) {
        ctx.tierVfx.fireAnticipation(
          f.def.rarity,
          f.colorHex,
          targetPt,
          ctx.targetPtsScratch,
          0.92,
          waveWideCenter
        );
      }

      ctx.projectiles.launch(
        {
          style: f.style,
          slotIndex: f.slotIndex,
          targetId: targetRock.index,
          dmg: Math.max(1, Math.round(f.dmg * effectiveSec)),
          comboStep: step,
          accentColor: f.colorHex,
          sx: pos.x,
          sy: pos.y + 1.85,
          sz: pos.z,
          ex: targetRock.x,
          ey: 1.05,
          ez: targetRock.z,
          attackInterval: effectiveSec,
          isBoss: false,
          isUltimate,
        },
        handleProjectileArrival
      );
    } else {
      const bossPt: WorldPoint3 = { x: 0, y: 0.8, z: TOWER_BOSS_CENTER_Z + 0.85 };

      if (isUltimate) {
        f.sprite.triggerUltOpening(0.52);
        ctx.tierVfx.fireUltOpeningBurst({ x: pos.x, y: pos.y, z: pos.z, colorHex: f.colorHex });
      } else {
        f.sprite.triggerPodiumCast(0.24);
      }
      ctx.tierVfx.firePodiumWeaponCast({
        rarity: isUltimate ? f.def.rarity : 'common',
        chibiId: f.def.id,
        colorHex: f.colorHex,
        origin: { x: pos.x, y: pos.y, z: pos.z },
        target: bossPt,
        allTargets: [bossPt],
      });
      if (isUltimate) {
        ctx.tierVfx.fireAnticipation(f.def.rarity, f.colorHex, bossPt, [bossPt]);
      }

      const bossTargetX = (Math.random() - 0.5) * 0.65;
      const bossTargetY = 2.15 + Math.random() * 0.45;
      ctx.projectiles.launch(
        {
          style: f.style,
          slotIndex: f.slotIndex,
          targetId: -1,
          dmg: Math.max(1, Math.round(f.dmg * effectiveSec)),
          comboStep: step,
          accentColor: f.colorHex,
          sx: pos.x,
          sy: pos.y + 1.85,
          sz: pos.z,
          ex: bossTargetX,
          ey: bossTargetY,
          ez: TOWER_BOSS_CENTER_Z + 0.85,
          attackInterval: effectiveSec,
          isBoss: true,
          isUltimate,
        },
        handleProjectileArrival
      );
    }
  };

  if (!ctx.paused && hasTargets) {
    // 1) Ult relay queue: armed Chibis (5/5 basic charge) fire 2.5s Sakuga Ult spaced 1.5s apart
    const activeUltFighter = ctx.spotlight.pickNextReady(ctx.fighters.values(), (f) => (f.ultArmed ? 0 : 1));
    if (activeUltFighter) {
      const ultSec = Math.max(0.01, activeUltFighter.ultBankSec + activeUltFighter.chargeSec);
      activeUltFighter.attackCooldown = Math.max(activeUltFighter.attackInterval, ULT_SPOTLIGHT_LOCK_SEC);
      activeUltFighter.chargeSec = 0;
      activeUltFighter.ultBankSec = 0;
      activeUltFighter.ultCharge = 0;
      activeUltFighter.ultArmed = false;
      activeUltFighter.ultActiveTimer = ULT_SPOTLIGHT_LOCK_SEC;
      ctx.spotlight.claim(activeUltFighter.slotIndex, ULT_SPOTLIGHT_LOCK_SEC);
      launchTowerAttack(activeUltFighter, true, ultSec);
    }

    // 2) Parallel basic attacks: all ready Chibis fire continuously without waiting
    for (const f of ctx.fighters.values()) {
      if (f.attackCooldown > 0 || f.ultActiveTimer > 0) continue;
      const elapsedSec = Math.max(0.01, f.chargeSec);
      const basicSec = elapsedSec * BASIC_ATTACK_DPS_SHARE;
      f.ultBankSec = Math.min(maxChargeSec, f.ultBankSec + elapsedSec * (1 - BASIC_ATTACK_DPS_SHARE));
      f.chargeSec = 0;
      f.attackCooldown = f.attackInterval;
      f.ultCharge = Math.min(ULT_CHARGE_BASIC_ATTACKS, f.ultCharge + 1);
      launchTowerAttack(f, false, basicSec);
    }
  }

  if (ctx.camera) {
    for (const f of ctx.fighters.values()) {
      f.sprite.update(ctx.safeDt, ctx.elapsed, ctx.camera);
    }
  }

  if (!ctx.paused) {
    ctx.projectiles.step(ctx.safeDt, ctx.camera, handleProjectileArrival);
    for (let i = ctx.pendingBarrages.length - 1; i >= 0; i--) {
      if (ctx.paused || ctx.pendingBarrages.length === 0) break;
      if (i >= ctx.pendingBarrages.length) {
        i = ctx.pendingBarrages.length - 1;
      }
      const b = ctx.pendingBarrages[i];
      if (!b) continue;
      b.delayLeft -= ctx.safeDt;
      if (b.delayLeft <= 0) {
        ctx.pendingBarrages.splice(i, 1);
        resolveBarrageBeat(b);
      }
    }
    if (ctx.camera) {
      ctx.tierVfx.update(ctx.safeDt, ctx.camera);
    }
  }
}
