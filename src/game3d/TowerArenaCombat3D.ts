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
  computeAttackVfxSpeedScale,
  type TierAttackVfxPool3D,
  type WorldPoint3,
} from './TierAttackVfx3D';

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
export const TOWER_BOSS_CENTER_Z = TOWER_ARENA_CENTER_Z - 3.25;
export const TOWER_SUMMON_RADIUS = 5.55;

export const TOWER_WAVE_ORE_POSITIONS: ReadonlyArray<[number, number]> = [
  [-3.7, TOWER_ARENA_CENTER_Z + 1.55],
  [3.7, TOWER_ARENA_CENTER_Z + 1.55],
  [-4.25, TOWER_ARENA_CENTER_Z - 1.35],
  [4.25, TOWER_ARENA_CENTER_Z - 1.35],
  [0, TOWER_ARENA_CENTER_Z - 2.35],
];

export function createTowerWaveOreSlot(index: number): TowerWaveRockSlot {
  const [x, z] = TOWER_WAVE_ORE_POSITIONS[index];
  const root = new THREE.Group();
  root.position.set(x, 0.08, z);
  root.visible = false;

  const oreSprite = new OreBillboard2D(1.58);
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
    geodeTex ? new THREE.PlaneGeometry(2.12, 2.12) : new THREE.RingGeometry(0.82, 1.04, 24),
    ringMat
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.032;
  root.add(ringMesh);

  const hitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.15, 2.2, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hitMesh.position.y = 1.0;
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

  const existing = aliveRocks.find((r) => r.index === fighter.targetOreIndex);
  if (existing) return existing;

  const targetCounts = new Map<number, number>();
  for (const r of aliveRocks) targetCounts.set(r.index, 0);
  for (const other of fighters.values()) {
    if (other.slotIndex === fighter.slotIndex) continue;
    if (targetCounts.has(other.targetOreIndex)) {
      targetCounts.set(other.targetOreIndex, (targetCounts.get(other.targetOreIndex) ?? 0) + 1);
    }
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
  const resolveBarrageBeat = (b: TowerPendingBarrage): void => {
    if (ctx.paused || b.isBoss !== ctx.bossWave) return;
    if (b.isBoss) {
      ctx.triggerBossBounce();
      ctx.impactFx.spawnImpact({
        targetX: b.ex,
        targetY: 2.45,
        targetZ: TOWER_BOSS_CENTER_Z + 1.05,
        accentColor: b.accentColor,
        comboStep: b.comboStep,
        attackerX: b.sx,
        attackerZ: b.sz,
        shockwaveScale: b.beatIndex === 2 ? 1.65 : 1.25,
      });
      ctx.spawnTowerShardsAt(b.ex, 2.2, TOWER_BOSS_CENTER_Z + 1.05, b.accentColor, b.beatIndex === 2 ? 5 : 3, false, true);
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
      });
    } else {
      let rock = ctx.waveRocks[b.targetOreIndex];
      if (!rock || !rock.alive) {
        rock = ctx.waveRocks.find((r) => r.alive) ?? rock;
      }
      if (!rock || !rock.alive) return;
      ctx.impactFx.spawnImpact({
        targetX: rock.x,
        targetY: 1.05,
        targetZ: rock.z,
        accentColor: b.accentColor,
        comboStep: b.comboStep,
        attackerX: b.sx,
        attackerZ: b.sz,
        shockwaveScale: b.beatIndex === 2 ? 1.35 : 0.95,
      });
      ctx.spawnTowerShardsAt(rock.x, 0.85, rock.z, b.accentColor, b.beatIndex === 2 ? 5 : 3, false);
      ctx.onFighterStrike?.({
        slotIndex: b.slotIndex,
        targetOreIndex: rock.index,
        attackInterval: b.beatInterval,
        dmg: b.dmg,
        wx: rock.x,
        wy: 1.05,
        wz: rock.z,
        accentColor: b.accentColor,
        comboStep: b.comboStep,
        attackerX: b.sx,
        attackerZ: b.sz,
      });
    }
  };

  const handleProjectileArrival = (a: SignatureProjectileArrival): void => {
    if (ctx.paused) return;
    const fighter = ctx.fighters.get(a.slotIndex);
    const speedScale = computeAttackVfxSpeedScale(a.attackInterval);
    const beat0Interval = a.attackInterval * BARRAGE_BEAT_WEIGHTS[0];
    const beat0Dmg = Math.max(1, Math.round(a.dmg * BARRAGE_BEAT_WEIGHTS[0]));

    for (let bi = 1; bi <= 2; bi++) {
      const w = BARRAGE_BEAT_WEIGHTS[bi];
      ctx.pendingBarrages.push({
        slotIndex: a.slotIndex,
        targetOreIndex: a.targetId,
        isBoss: a.isBoss,
        beatIndex: bi,
        delayLeft: BARRAGE_FOLLOWUP_DELAYS[bi - 1],
        beatInterval: a.attackInterval * w,
        dmg: Math.max(1, Math.round(a.dmg * w)),
        accentColor: a.accentColor,
        comboStep: (a.comboStep + bi) % 3,
        sx: a.sx,
        sz: a.sz,
        ex: a.ex,
        ey: a.ey,
        ez: a.ez,
      });
    }

    if (a.isBoss) {
      if (!ctx.bossWave) return;
      ctx.triggerBossBounce();
      if (fighter) {
        const bossPt: WorldPoint3 = { x: 0, y: 0.8, z: TOWER_BOSS_CENTER_Z + 0.85 };
        ctx.tierVfx.fireTierAttack({
          rarity: fighter.def.rarity,
          chibiId: fighter.def.id,
          colorHex: a.accentColor,
          target: bossPt,
          allTargets: [bossPt],
          comboStep: a.comboStep,
          speedScale,
        });
      }
      ctx.impactFx.spawnImpact({
        targetX: a.ex,
        targetY: 2.45,
        targetZ: TOWER_BOSS_CENTER_Z + 1.05,
        accentColor: a.accentColor,
        comboStep: a.comboStep,
        attackerX: a.sx,
        attackerZ: a.sz,
        shockwaveScale: 1.45,
      });
      ctx.spawnTowerShardsAt(a.ex, 2.2, TOWER_BOSS_CENTER_Z + 1.05, a.accentColor, 4, false, true);
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
      });
    } else {
      if (ctx.bossWave) return;
      let rock = ctx.waveRocks[a.targetId];
      if (!rock || !rock.alive) {
        rock = ctx.waveRocks.find((r) => r.alive) ?? rock;
      }
      if (!rock || !rock.alive) return;
      if (fighter) {
        ctx.targetPtsScratch.length = 0;
        for (let ri = 0; ri < ctx.waveRocks.length; ri++) {
          const wr = ctx.waveRocks[ri];
          if (wr.alive) ctx.targetPtsScratch.push({ x: wr.x, y: 0.45, z: wr.z });
        }
        ctx.tierVfx.fireTierAttack({
          rarity: fighter.def.rarity,
          chibiId: fighter.def.id,
          colorHex: a.accentColor,
          target: { x: rock.x, y: 0.45, z: rock.z },
          allTargets: ctx.targetPtsScratch,
          comboStep: a.comboStep,
          speedScale,
        });
      }
      ctx.onFighterStrike?.({
        slotIndex: a.slotIndex,
        targetOreIndex: rock.index,
        attackInterval: beat0Interval,
        dmg: beat0Dmg,
        wx: rock.x,
        wy: 1.05,
        wz: rock.z,
        accentColor: a.accentColor,
        comboStep: a.comboStep,
        attackerX: a.sx,
        attackerZ: a.sz,
      });
    }
  };

  for (const f of ctx.fighters.values()) {
    f.fx.update(ctx.elapsed);
    f.colorHex = f.fx.getAccentColor();
    f.sprite.setAccentColor(f.colorHex);
    const pos = f.sprite.group.position;
    pos.copy(f.spawnPos);

    f.sprite.setAnimState('idle');
    if (ctx.paused) {
      // Keep podium chibi idle while paused
    } else if (!ctx.bossWave) {
      const targetRock = pickTowerTargetOreForFighter(f, ctx.waveRocks, ctx.fighters);
      if (targetRock) {
        f.attackCooldown -= ctx.safeDt;
        if (f.attackCooldown <= 0) {
          f.attackCooldown = f.attackInterval;
          const step = f.comboStep;
          f.comboStep = (f.comboStep + 1) % 3;
          ctx.targetPtsScratch.length = 0;
          for (let ri = 0; ri < ctx.waveRocks.length; ri++) {
            const wr = ctx.waveRocks[ri];
            if (wr.alive) ctx.targetPtsScratch.push({ x: wr.x, y: 0.45, z: wr.z });
          }
          const targetPt: WorldPoint3 = { x: targetRock.x, y: 0.45, z: targetRock.z };

          f.sprite.triggerPodiumCast(0.45);
          ctx.tierVfx.firePodiumWeaponCast({
            rarity: f.def.rarity,
            chibiId: f.def.id,
            colorHex: f.colorHex,
            origin: { x: pos.x, y: pos.y, z: pos.z },
            target: targetPt,
            allTargets: ctx.targetPtsScratch,
          });
          ctx.tierVfx.fireAnticipation(f.def.rarity, f.colorHex, targetPt, ctx.targetPtsScratch);

          ctx.projectiles.launch(
            {
              style: f.style,
              slotIndex: f.slotIndex,
              targetId: targetRock.index,
              dmg: Math.max(1, Math.round(f.dmg * f.attackInterval)),
              comboStep: step,
              accentColor: f.colorHex,
              sx: pos.x,
              sy: pos.y + 1.25,
              sz: pos.z,
              ex: targetRock.x,
              ey: 1.05,
              ez: targetRock.z,
              attackInterval: f.attackInterval,
              isBoss: false,
            },
            handleProjectileArrival
          );
        }
      }
    } else {
      f.attackCooldown -= ctx.safeDt;
      if (f.attackCooldown <= 0) {
        f.attackCooldown = f.attackInterval;
        const step = f.comboStep;
        f.comboStep = (f.comboStep + 1) % 3;
        const bossPt: WorldPoint3 = { x: 0, y: 0.8, z: TOWER_BOSS_CENTER_Z + 0.85 };

        f.sprite.triggerPodiumCast(0.45);
        ctx.tierVfx.firePodiumWeaponCast({
          rarity: f.def.rarity,
          chibiId: f.def.id,
          colorHex: f.colorHex,
          origin: { x: pos.x, y: pos.y, z: pos.z },
          target: bossPt,
          allTargets: [bossPt],
        });
        ctx.tierVfx.fireAnticipation(f.def.rarity, f.colorHex, bossPt, [bossPt]);

        const bossTargetX = (Math.random() - 0.5) * 0.65;
        const bossTargetY = 2.15 + Math.random() * 0.45;
        ctx.projectiles.launch(
          {
            style: f.style,
            slotIndex: f.slotIndex,
            targetId: -1,
            dmg: Math.max(1, Math.round(f.dmg * f.attackInterval)),
            comboStep: step,
            accentColor: f.colorHex,
            sx: pos.x,
            sy: pos.y + 1.25,
            sz: pos.z,
            ex: bossTargetX,
            ey: bossTargetY,
            ez: TOWER_BOSS_CENTER_Z + 0.85,
            attackInterval: f.attackInterval,
            isBoss: true,
          },
          handleProjectileArrival
        );
      }
    }

    if (ctx.camera) {
      f.sprite.update(ctx.safeDt, ctx.elapsed, ctx.camera);
    }
  }

  if (!ctx.paused) {
    ctx.projectiles.step(ctx.safeDt, ctx.camera, handleProjectileArrival);
    for (let i = ctx.pendingBarrages.length - 1; i >= 0; i--) {
      const b = ctx.pendingBarrages[i];
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
