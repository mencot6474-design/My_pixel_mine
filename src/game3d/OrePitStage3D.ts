import * as THREE from 'three';
import { getOresByWorld, type OreDef, type WorldId } from '../game/GameData';
import { type PitEventKind } from '../game/PitEventsDomain';
import { createChamferSlabGeometry, mergeStaticMeshesByMaterial } from './MeshHelpers3D';
import {
  BASE_PIT_NODE_COUNT,
  type MineWorldPalette,
  type OreVariantDef,
  type OreVariantKey,
  WORLD_PALETTES,
} from './MineWorldPalette';
import { getWeatherById, type WeatherId } from '../game/WeatherData';
import type { AttackImpactFxController } from './AttackImpactFx3D';
import type { OreBillboard2D } from './OreBillboard3D';
import { getSoftContactShadowTexture } from './OreBillboard3D';
import {
  getCircularNexusPoolTexture,
  getCyberColosseumDeckTexture,
  getShockwaveRingTexture,
} from './ProceduralTextures3D';

export const PIT_NODE_COUNT = BASE_PIT_NODE_COUNT;
export const PIT_CENTER_Z = 1.65;
export const PIT_FLOOR_Y = -0.42;
export const PIT_RADIUS = 6.4;
export const PIT_HALF_W = 5.2;
export const PIT_HALF_D = 5.2;

/** Balanced 25% nerf from 500 -> 375 so Weather Meteors feel rewarding without dragging. */
export const METEOR_HP_MULT = 375;
export const BASE_ORE_RESPAWN_SEC = 3.5;
export const SWEET_SPOT_MIN_PROGRESS = 0.56;
export const SWEET_SPOT_MAX_PROGRESS = 0.90;
export const SWEET_SPOT_DURATION_SEC = 2.25;
export const SWEET_SPOT_DMG_MULT = 4.5;

/** Returns true when a shrinking Sweet-Spot ring progress (0..1) sits inside the Perfect Strike window. */
export function isSweetSpotWindowPure(progress: number): boolean {
  return Number.isFinite(progress) && progress >= SWEET_SPOT_MIN_PROGRESS && progress <= SWEET_SPOT_MAX_PROGRESS;
}

/** Computes dynamic minimum Meteor HP from current team DPS & tap damage (25% nerfed). */
export function computeMeteorDynamicHp(totalPlotDps: number, tapDamage: number): number {
  return Math.round((totalPlotDps * 45 + tapDamage * 150) * 0.75);
}

export interface DamageableOreState {
  hp: number;
  alive: boolean;
}

export interface PureOreHitResult {
  broken: boolean;
  dmgDealt: number;
}

const BARRAGE_PACED_SHARES = [
  0.08 / 1.0,
  0.1 / 0.92,
  0.11 / 0.82,
  0.13 / 0.71,
  0.15 / 0.58,
  0.18 / 0.43,
] as const;

/** Applies pure damage to a pit ore node and returns hit/break status. When preventBreak is true, paces lethal damage across barrage beats and clamps at 1 HP until Finisher. */
export function applyNodeDamagePure(
  node: DamageableOreState,
  dmg: number,
  preventBreak = false,
  beatIndex?: number
): PureOreHitResult | null {
  if (!node.alive || node.hp <= 0 || dmg <= 0) return null;
  if (preventBreak) {
    if (node.hp <= 1) {
      return {
        broken: false,
        dmgDealt: 0,
      };
    }
    let maxAllowed = node.hp - 1;
    if (beatIndex !== undefined && beatIndex >= 0 && beatIndex < BARRAGE_PACED_SHARES.length && dmg >= node.hp) {
      const paced = Math.max(1, Math.floor(node.hp * BARRAGE_PACED_SHARES[beatIndex]));
      maxAllowed = Math.min(maxAllowed, paced);
    }
    const dmgDealt = Math.min(maxAllowed, dmg);
    node.hp = Math.max(1, node.hp - dmgDealt);
    return {
      broken: false,
      dmgDealt,
    };
  }
  const dmgDealt = Math.min(node.hp, dmg);
  node.hp = Math.max(0, node.hp - dmg);
  if (node.hp > 0) {
    return {
      broken: false,
      dmgDealt,
    };
  }

  node.alive = false;
  return {
    broken: true,
    dmgDealt,
  };
}

export interface OreHitResult {
  broken: boolean;
  variantKey: OreVariantKey;
  dmgDealt: number;
  isMeteor?: boolean;
  meteorWeatherId?: WeatherId;
  pitEventKind?: PitEventKind;
  isPerfect?: boolean;
}

export interface OreAttackFxOptions {
  accentColor?: string;
  attackerX?: number;
  attackerZ?: number;
  comboStep?: number;
  isPerfect?: boolean;
  preventBreak?: boolean;
  beatIndex?: number;
}

export interface SweetSpotPitState {
  nodeId: number;
  progress: number;
  inWindow: boolean;
  worldX: number;
  worldY: number;
  worldZ: number;
  isMeteor: boolean;
}

export interface InternalOreNode {
  id: number;
  root: THREE.Group;
  oreSprite: OreBillboard2D;
  hitMesh: THREE.Mesh;
  geodeRing: THREE.Mesh;
  oreDef: OreDef;
  variant: OreVariantDef;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  squashAmt: number;
  recoilAmt: number;
  recoilDirX: number;
  flashTimer: number;
  spawnScale: number;
  x: number;
  z: number;
  phase: number;
  isMeteor?: boolean;
  meteorWeatherId?: WeatherId | null;
  pitEventKind?: PitEventKind;
  dropY?: number;
  dropProgress?: number;
  dropDuration?: number;
  trailTimer?: number;
}

export function resolveWorldIdFromPalette(palette: MineWorldPalette): WorldId {
  for (const [id, p] of Object.entries(WORLD_PALETTES) as Array<[WorldId, MineWorldPalette]>) {
    if (p === palette) return id;
  }
  return 'underground';
}

export function pickWorldOreForVariant(worldId: WorldId, variantKey: OreVariantKey): OreDef {
  const ores = getOresByWorld(worldId);
  const pool =
    ores.length <= 5
      ? variantKey === 'geode'
        ? ores.slice(Math.max(0, ores.length - 2))
        : variantKey === 'vein'
          ? ores.slice(1, Math.min(ores.length, 4))
          : ores.slice(0, 2)
      : variantKey === 'geode'
        ? ores.slice(5, 8)
        : variantKey === 'vein'
          ? ores.slice(2, 5)
          : ores.slice(0, 2);
  const list = pool.length > 0 ? pool : ores;
  return list[Math.floor(Math.random() * list.length)] ?? ores[0];
}

export function buildOrePitEnvironmentMeshes(ctx: {
  group: THREE.Group;
  palette: MineWorldPalette;
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
}): {
  floorMat: THREE.MeshStandardMaterial;
  wallMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  pitNeonMat: THREE.MeshStandardMaterial;
} {
  const { palette } = ctx;
  const pitEnvGroup = new THREE.Group();
    // Open Cyber Sky-Stage Battle Court Floor (local y = 0 = world PIT_FLOOR_Y = -0.42)
    const floorMat = new THREE.MeshStandardMaterial({
      map: getCircularNexusPoolTexture(palette.pitFloorColor, palette.crystalColor),
      roughness: 0.72,
      metalness: 0.18,
    });
    const floorGeo = new THREE.CircleGeometry(PIT_RADIUS, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0;
    floor.receiveShadow = true;
    pitEnvGroup.add(floor);

    // Sleek Low-Profile Cyber Sky-Stage Hull + Stepped Tournament Ring Deck
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d6b,
      roughness: 0.42,
      metalness: 0.48,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      map: getCyberColosseumDeckTexture(palette.crystalColor),
      roughness: 0.3,
      metalness: 0.55,
    });
    const pitNeonMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 1.12,
      roughness: 0.2,
      metalness: 0.25,
      flatShading: true,
    });

    const bowlProfile = [
      new THREE.Vector2(PIT_RADIUS - 0.05, -0.06),
      new THREE.Vector2(PIT_RADIUS, 0.0),
      new THREE.Vector2(PIT_RADIUS + 0.16, 0.21),
      new THREE.Vector2(PIT_RADIUS + 0.42, 0.22),
      new THREE.Vector2(PIT_RADIUS + 0.54, 0.42),
      new THREE.Vector2(PIT_RADIUS + 2.25, 0.42),
      new THREE.Vector2(PIT_RADIUS + 2.45, 0.24),
      new THREE.Vector2(PIT_RADIUS + 2.15, -0.18),
      new THREE.Vector2(PIT_RADIUS + 0.65, -0.68),
      new THREE.Vector2(4.2, -1.06),
      new THREE.Vector2(2.1, -1.18),
      new THREE.Vector2(0.01, -1.22),
    ];
    const bowlMesh = new THREE.Mesh(new THREE.LatheGeometry(bowlProfile, 48), wallMat);
    bowlMesh.castShadow = true;
    bowlMesh.receiveShadow = true;
    pitEnvGroup.add(bowlMesh);

    const thetaSegs = 48;
    const collarGeo = new THREE.RingGeometry(PIT_RADIUS + 0.54, PIT_RADIUS + 2.22, thetaSegs, 1);
    // Remap RingGeometry UVs monotonically along thetaSegments so deck armor & rails wrap cleanly 360 deg without seam artifacts
    const collarPos = collarGeo.attributes.position;
    const collarUv = collarGeo.attributes.uv;
    const innerR = PIT_RADIUS + 0.54;
    const spanR = Math.max(0.01, 2.22 - 0.54);
    const cols = thetaSegs + 1;
    for (let i = 0; i < collarPos.count; i++) {
      const x = collarPos.getX(i);
      const y = collarPos.getY(i);
      const u = (i % cols) / thetaSegs;
      const radT = (Math.hypot(x, y) - innerR) / spanR;
      collarUv.setXY(i, u, radT);
    }
    collarUv.needsUpdate = true;
    const upperDeckCollar = new THREE.Mesh(collarGeo, trimMat);
    upperDeckCollar.rotation.x = -Math.PI / 2;
    upperDeckCollar.position.y = 0.43;
    upperDeckCollar.receiveShadow = true;
    pitEnvGroup.add(upperDeckCollar);

    // 3 Concentric Flat Horizontal Neon Rings (battle court rim, riser step, outer stadium bevel)
    const neonRings: Array<[number, number, number]> = [
      [PIT_RADIUS - 0.05, 0.055, 0.04],
      [PIT_RADIUS + 0.38, 0.042, 0.23],
      [PIT_RADIUS + 2.2, 0.065, 0.44],
    ];
    for (const [ringR, tubeR, ringY] of neonRings) {
      const neonTorus = new THREE.Mesh(new THREE.TorusGeometry(ringR, tubeR, 6, 48), pitNeonMat);
      neonTorus.rotation.x = Math.PI / 2;
      neonTorus.position.y = ringY;
      pitEnvGroup.add(neonTorus);
    }

    // 8 Sleek Low-Profile Stage Light Clamps & Swept Under-Hull Aero Fins
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x26354d,
      roughness: 0.36,
      metalness: 0.55,
      flatShading: true,
    });
    const steelCapMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.65,
      roughness: 0.26,
      flatShading: true,
    });
    ctx.ownedMats.push(armorMat, steelCapMat);

    const emitterCapGeo = createChamferSlabGeometry(0.95, 0.14, 0.58, 0.12, 0.014);
    const emitterNeonGeo = new THREE.BoxGeometry(0.64, 0.05, 0.1);
    const hullFinGeo = createChamferSlabGeometry(0.28, 0.46, 1.45, 0.08, 0.014);
    const underVentGeo = new THREE.CylinderGeometry(0.56, 0.34, 0.22, 8);

    const nodeAnglesDeg = [45, 90, 135, 165, -45, -90, -135, -165];
    const rimR = PIT_RADIUS + 1.56;
    for (let i = 0; i < nodeAnglesDeg.length; i++) {
      const rad = (nodeAnglesDeg[i] * Math.PI) / 180;
      const sinA = Math.sin(rad);
      const cosA = -Math.cos(rad);

      const cap = new THREE.Mesh(emitterCapGeo, steelCapMat);
      cap.position.set(sinA * rimR, 0.44, cosA * rimR);
      cap.rotation.y = -rad;
      cap.castShadow = true;

      const capLed = new THREE.Mesh(emitterNeonGeo, pitNeonMat);
      capLed.position.set(sinA * (rimR - 0.18), 0.54, cosA * (rimR - 0.18));
      capLed.rotation.y = -rad;
      pitEnvGroup.add(cap, capLed);

      const fin = new THREE.Mesh(hullFinGeo, armorMat);
      fin.position.set(sinA * (PIT_RADIUS + 1.68), -0.18, cosA * (PIT_RADIUS + 1.68));
      fin.rotation.y = -rad;
      fin.castShadow = true;
      pitEnvGroup.add(fin);

      if (i % 2 === 1) {
        const vent = new THREE.Mesh(underVentGeo, pitNeonMat);
        vent.position.set(sinA * (PIT_RADIUS + 1.1), -0.58, cosA * (PIT_RADIUS + 1.1));
        pitEnvGroup.add(vent);
      }
    }
    mergeStaticMeshesByMaterial(pitEnvGroup);
    pitEnvGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && !ctx.ownedGeos.includes(child.geometry)) {
        ctx.ownedGeos.push(child.geometry);
      }
    });
    ctx.group.add(pitEnvGroup);
  return { floorMat, wallMat, trimMat, pitNeonMat };
}

export function buildOrePitMeteorAndSpotFx(ctx: {
  group: THREE.Group;
  meteorRoot: THREE.Group;
  meteorEntryGroup: THREE.Group;
  meteorTargetGroup: THREE.Group;
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  meteorTargetX: number;
  meteorTargetZ: number;
  meteorStartX: number;
  meteorStartY: number;
  meteorStartZ: number;
}): {
  meteorCoreMat: THREE.MeshBasicMaterial;
  meteorBowMat: THREE.MeshBasicMaterial;
  meteorTailOuterMat: THREE.MeshBasicMaterial;
  meteorTailInnerMat: THREE.MeshBasicMaterial;
  meteorTailOuterMesh: THREE.Mesh;
  meteorTailInnerMesh: THREE.Mesh;
  meteorTargetShadow: THREE.Mesh;
  meteorTargetShadowMat: THREE.MeshBasicMaterial;
  meteorTargetRing: THREE.Mesh;
  meteorTargetRingMat: THREE.MeshBasicMaterial;
  sweetSpotFloorRing: THREE.Mesh;
  sweetSpotFloorMat: THREE.MeshBasicMaterial;
} {
  const {
    meteorTargetX: METEOR_TARGET_X,
    meteorTargetZ: METEOR_TARGET_Z,
    meteorStartX: METEOR_START_X,
    meteorStartY: METEOR_START_Y,
    meteorStartZ: METEOR_START_Z,
  } = ctx;
    // 3D Atmospheric Entry Plasma Envelope & Tail Plume (oriented along dive trajectory)
    const entryBackDir = new THREE.Vector3(
      METEOR_START_X - METEOR_TARGET_X,
      METEOR_START_Y,
      METEOR_START_Z - METEOR_TARGET_Z
    ).normalize();
    ctx.meteorEntryGroup.position.set(0, 1.4, 0);
    ctx.meteorEntryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), entryBackDir);
    ctx.meteorEntryGroup.visible = false;

    const coreGeo = new THREE.IcosahedronGeometry(0.92, 1);
    const bowGeo = new THREE.ConeGeometry(1.36, 1.75, 9, 1, true);
    const tailOuterGeo = new THREE.ConeGeometry(1.06, 5.4, 9, 1, true);
    const tailInnerGeo = new THREE.ConeGeometry(0.54, 4.1, 7, 1, true);
    ctx.ownedGeos.push(coreGeo, bowGeo, tailOuterGeo, tailInnerGeo);

    const meteorCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const meteorBowMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const meteorTailOuterMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const meteorTailInnerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    ctx.ownedMats.push(
      meteorCoreMat,
      meteorBowMat,
      meteorTailOuterMat,
      meteorTailInnerMat
    );

    const coreMesh = new THREE.Mesh(coreGeo, meteorCoreMat);
    const bowMesh = new THREE.Mesh(bowGeo, meteorBowMat);
    bowMesh.rotation.x = Math.PI;
    bowMesh.position.y = -0.35;

    const meteorTailOuterMesh = new THREE.Mesh(tailOuterGeo, meteorTailOuterMat);
    meteorTailOuterMesh.position.y = 2.6;
    const meteorTailInnerMesh = new THREE.Mesh(tailInnerGeo, meteorTailInnerMat);
    meteorTailInnerMesh.position.y = 2.1;

    ctx.meteorEntryGroup.add(coreMesh, bowMesh, meteorTailOuterMesh, meteorTailInnerMesh);
    ctx.meteorRoot.add(ctx.meteorEntryGroup);

    // Ground Strike Telegraph Shadow & Contracting Target Ring
    ctx.meteorTargetGroup.position.set(METEOR_TARGET_X, 0.038, METEOR_TARGET_Z);
    ctx.meteorTargetGroup.visible = false;
    const targetShadowGeo = new THREE.CircleGeometry(1.55, 24);
    const targetRingGeo = new THREE.PlaneGeometry(3.6, 3.6);
    ctx.ownedGeos.push(targetShadowGeo, targetRingGeo);

    const shadowTex = getSoftContactShadowTexture();
    const meteorTargetShadowMat = new THREE.MeshBasicMaterial({
      ...(shadowTex ? { map: shadowTex } : {}),
      color: 0x020617,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const ringTex = getShockwaveRingTexture();
    const meteorTargetRingMat = new THREE.MeshBasicMaterial({
      ...(ringTex ? { map: ringTex } : {}),
      color: 0xf472b6,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    ctx.ownedMats.push(meteorTargetShadowMat, meteorTargetRingMat);

    const meteorTargetShadow = new THREE.Mesh(targetShadowGeo, meteorTargetShadowMat);
    meteorTargetShadow.rotation.x = -Math.PI / 2;
    const meteorTargetRing = new THREE.Mesh(targetRingGeo, meteorTargetRingMat);
    meteorTargetRing.rotation.x = -Math.PI / 2;
    meteorTargetRing.position.y = 0.008;
    ctx.meteorTargetGroup.add(meteorTargetShadow, meteorTargetRing);
    ctx.group.add(ctx.meteorTargetGroup);

    // Flat horizontal Weak-Spot / Sweet-Spot floor ring (never tilted/tumbling)
    const sweetRingGeo = new THREE.PlaneGeometry(2.75, 2.75);
    ctx.ownedGeos.push(sweetRingGeo);
    const sweetSpotFloorMat = new THREE.MeshBasicMaterial({
      ...(ringTex ? { map: ringTex } : {}),
      color: 0xfde047,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    ctx.ownedMats.push(sweetSpotFloorMat);
    const sweetSpotFloorRing = new THREE.Mesh(sweetRingGeo, sweetSpotFloorMat);
    sweetSpotFloorRing.rotation.x = -Math.PI / 2;
    sweetSpotFloorRing.position.y = 0.042;
    sweetSpotFloorRing.visible = false;
    ctx.group.add(sweetSpotFloorRing);

  return {
    meteorCoreMat,
    meteorBowMat,
    meteorTailOuterMat,
    meteorTailInnerMat,
    meteorTailOuterMesh,
    meteorTailInnerMesh,
    meteorTargetShadow,
    meteorTargetShadowMat,
    meteorTargetRing,
    meteorTargetRingMat,
    sweetSpotFloorRing,
    sweetSpotFloorMat,
  };
}

export interface OrePitShardParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  baseScale: number;
  bounces: number;
  age: number;
  dur: number;
}

  export function spawnOrePitShards(lx: number, lz: number, count: number, isShatter = false, isMeteor: boolean,
    ctx: {
      group: THREE.Group;
      shardPool: OrePitShardParticle[];
      shardFreeCrystal: THREE.Mesh[];
      shardFreeRock: THREE.Mesh[];
      shardMat: THREE.Material;
      rockChipMat: THREE.Material;
      sharedShardGeo: THREE.BufferGeometry;
      sharedRockGeo: THREE.BufferGeometry;
      maxCap?: number;
    }
  ): void {
    const maxCap = ctx.maxCap ?? 36;
    for (let i = 0; i < count; i++) {
      if (ctx.shardPool.length >= maxCap) {
        const oldest = ctx.shardPool.shift();
        if (oldest) {
          ctx.group.remove(oldest.mesh);
          const freeArr = oldest.mesh.material === ctx.shardMat ? ctx.shardFreeCrystal : ctx.shardFreeRock;
          if (freeArr.length < maxCap) freeArr.push(oldest.mesh);
        }
      }
      const isCrystal = isShatter ? i % 3 !== 2 : i % 2 === 0;
      const freeArr = isCrystal ? ctx.shardFreeCrystal : ctx.shardFreeRock;
      const mesh =
        freeArr.pop() ??
        new THREE.Mesh(
          isCrystal ? ctx.sharedShardGeo : ctx.sharedRockGeo,
          isCrystal ? ctx.shardMat : ctx.rockChipMat
        );
      mesh.position.set(
        lx + (Math.random() - 0.5) * (isShatter ? 0.8 : 0.5),
        0.55 + Math.random() * (isShatter ? 0.85 : 0.5),
        lz + (Math.random() - 0.5) * (isShatter ? 0.8 : 0.5)
      );
      const ang = Math.random() * Math.PI * 2;
      const spd = (isShatter ? (isMeteor ? 3.8 : 2.8) : 1.8) + Math.random() * (isShatter ? 4.4 : 2.8);
      const baseScale = (isShatter ? (isMeteor ? 1.15 : 0.85) : 0.65) + Math.random() * (isShatter ? 0.65 : 0.42);
      mesh.scale.setScalar(baseScale);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      ctx.group.add(mesh);
      ctx.shardPool.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: (isShatter ? (isMeteor ? 4.4 : 3.4) : 2.5) + Math.random() * (isShatter ? 4.0 : 2.6),
        vz: Math.sin(ang) * spd,
        rx: (Math.random() - 0.5) * 16,
        ry: (Math.random() - 0.5) * 14,
        rz: (Math.random() - 0.5) * 16,
        baseScale,
        bounces: 0,
        age: 0,
        dur: (isShatter ? 0.68 : 0.48) + Math.random() * 0.28,
      });
    }
  }


export function stepOrePitShards(
  dtSec: number,
  ctx: {
    group: THREE.Group;
    shardPool: OrePitShardParticle[];
    shardFreeCrystal: THREE.Mesh[];
    shardFreeRock: THREE.Mesh[];
    shardMat: THREE.Material;
  }
): void {
    for (let i = ctx.shardPool.length - 1; i >= 0; i--) {
      const p = ctx.shardPool[i];
      p.age += dtSec;
      if (p.age >= p.dur) {
        ctx.group.remove(p.mesh);
        const freeArr = p.mesh.material === ctx.shardMat ? ctx.shardFreeCrystal : ctx.shardFreeRock;
        if (freeArr.length < 72) freeArr.push(p.mesh);
        ctx.shardPool.splice(i, 1);
        continue;
      }
      p.vy -= 15.5 * dtSec;
      p.mesh.position.x += p.vx * dtSec;
      let nextY = p.mesh.position.y + p.vy * dtSec;
      if (nextY <= 0.09) {
        nextY = 0.09;
        if (p.vy < -0.6 && p.bounces < 2) {
          p.vy = -p.vy * 0.42;
          p.vx *= 0.72;
          p.vz *= 0.72;
          p.rx *= 0.65;
          p.rz *= 0.65;
          p.bounces++;
        } else {
          p.vy = 0;
          p.vx *= Math.max(0.2, 1 - dtSec * 6);
          p.vz *= Math.max(0.2, 1 - dtSec * 6);
        }
      }
      p.mesh.position.y = nextY;
      p.mesh.position.z += p.vz * dtSec;
      p.mesh.rotation.x += p.rx * dtSec;
      p.mesh.rotation.y += p.ry * dtSec;
      p.mesh.rotation.z += p.rz * dtSec;
      const lifeRatio = p.age / p.dur;
      const shrink = lifeRatio < 0.62 ? 1 : Math.max(0.04, 1 - (lifeRatio - 0.62) / 0.38);
      p.mesh.scale.setScalar(p.baseScale * shrink);
    }

}

export function updateSweetSpotRingMesh(opts: {
  ring: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  x: number;
  z: number;
  isMeteor: boolean;
  progress: number;
  inWindow: boolean;
  elapsed: number;
}): void {
  opts.ring.visible = true;
  opts.ring.position.set(opts.x, 0.042, opts.z);
  const scaleBase = opts.isMeteor ? 1.55 : 1.0;
  const contractScale = Math.max(0.32, 1.38 - opts.progress * 0.96) * scaleBase;
  opts.ring.scale.setScalar(contractScale);
  opts.ring.rotation.z = -opts.elapsed * 1.4;
  opts.mat.color.setHex(opts.inWindow ? 0x38bdf8 : 0xfde047);
  opts.mat.opacity = opts.inWindow ? 0.92 : 0.62;
}

export interface MeteorDropNodeLike {
  x: number;
  z: number;
  dropY?: number;
  dropProgress?: number;
  dropDuration?: number;
  trailTimer?: number;
  spawnScale: number;
  squashAmt: number;
  flashTimer: number;
  meteorWeatherId?: WeatherId | null;
  root: THREE.Group;
  oreSprite: OreBillboard2D;
  geodeRing: THREE.Mesh;
}

export function stepOrePitMeteorDrop(ctx: {
  node: MeteorDropNodeLike;
  dtSec: number;
  elapsed: number;
  camera?: THREE.Camera;
  dropDuration: number;
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  meteorEntryGroup: THREE.Group;
  meteorTargetGroup: THREE.Group;
  meteorTailOuterMesh: THREE.Mesh;
  meteorTailInnerMesh: THREE.Mesh;
  meteorTargetShadow: THREE.Mesh;
  meteorTargetShadowMat: THREE.MeshBasicMaterial;
  meteorTargetRing: THREE.Mesh;
  meteorTargetRingMat: THREE.MeshBasicMaterial;
  group: THREE.Group;
  impactFx: AttackImpactFxController;
  spawnShardsAt: (lx: number, lz: number, count: number, isShatter: boolean, isMeteor: boolean) => void;
  onMeteorLanded?: () => void;
}): { meteorRoll: number; meteorStretchY: number } {
  const { node, dtSec, elapsed, camera } = ctx;
  let meteorRoll = 0;
  let meteorStretchY = 1;
        const prevP = node.dropProgress ?? 0;
        const dur = node.dropDuration ?? ctx.dropDuration;
        const nextP = Math.min(1, prevP + dtSec / dur);
        node.dropProgress = nextP;
        // Accelerating atmospheric dive curve toward impact center
        const ease = nextP * nextP * (0.35 + 0.65 * nextP);
        node.x = ctx.startX + (ctx.targetX - ctx.startX) * ease;
        node.z = ctx.startZ + (ctx.targetZ - ctx.startZ) * ease;
        node.dropY = ctx.startY * (1 - ease);
        node.root.position.set(node.x, node.dropY, node.z);
        node.spawnScale = 0.62 + ease * 0.38;

        const accent = node.meteorWeatherId
          ? getWeatherById(node.meteorWeatherId).accentColor
          : '#f472b6';

        if (nextP < 1) {
          ctx.meteorEntryGroup.visible = true;
          ctx.meteorTargetGroup.visible = true;
          ctx.meteorTailOuterMesh.rotation.y += dtSec * 10;
          ctx.meteorTailInnerMesh.rotation.y -= dtSec * 15;
          const flamePulse = 0.88 + Math.sin(elapsed * 48) * 0.16;
          ctx.meteorTailOuterMesh.scale.set(1, flamePulse, 1);
          ctx.meteorTailInnerMesh.scale.set(1, 0.92 + Math.cos(elapsed * 56) * 0.14, 1);

          ctx.meteorTargetShadow.scale.setScalar(1.85 - ease * 0.95);
          ctx.meteorTargetShadowMat.opacity = 0.16 + ease * 0.72;
          const ringPulse = 1 + Math.sin(elapsed * 18) * 0.08;
          ctx.meteorTargetRing.scale.setScalar((1.55 - ease * 0.78) * ringPulse);
          ctx.meteorTargetRing.rotation.z -= dtSec * 2.4;
          ctx.meteorTargetRingMat.opacity = 0.35 + ease * 0.55;

          meteorRoll = -0.28 * (1 - ease) + Math.sin(elapsed * 42) * 0.06;
          meteorStretchY = 1 + (1 - ease) * 0.24;

          node.trailTimer = (node.trailTimer ?? 0) - dtSec;
          if (nextP < 0.94 && (node.trailTimer ?? 0) <= 0 && ctx.group.visible) {
            node.trailTimer = 0.04;
            ctx.impactFx.spawnMeteorTrail({
              x: node.x,
              y: node.dropY + 1.35,
              z: node.z,
              accentColor: accent,
              camera,
            });
          }
        } else {
          node.x = ctx.targetX;
          node.z = ctx.targetZ;
          node.dropY = 0;
          node.spawnScale = 1;
          node.root.position.set(node.x, 0, node.z);
          ctx.meteorEntryGroup.visible = false;
          ctx.meteorTargetGroup.visible = false;
          node.oreSprite.setCollarVisible(true);
          node.geodeRing.visible = true;
          node.squashAmt = 0.56;
          node.flashTimer = 0.14;
          if (ctx.group.visible) {
            ctx.impactFx.spawnMeteorLanding({
              targetX: node.x,
              targetZ: node.z,
              accentColor: accent,
              camera,
            });
            ctx.spawnShardsAt(node.x, node.z, 18, true, true);
            ctx.onMeteorLanded?.();
          }
        }
  return { meteorRoll, meteorStretchY };
}
