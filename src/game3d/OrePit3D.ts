import * as THREE from 'three';
import { getOresByWorld, type OreDef, type WorldId } from '../game/GameData';
import { getWeatherById, type WeatherId } from '../game/WeatherData';
import { PIT_EVENT_DEFS, type PitEventKind } from '../game/PitEventsDomain';
import {
  MAX_PIT_NODE_COUNT,
  type MineWorldPalette,
  ORE_VARIANTS,
  type OreVariantDef,
  type OreVariantKey,
  rollOreVariant,
  WORLD_PALETTES,
} from './MineWorldPalette';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { createCyberLanternBollardFinial } from './CyberProps3D';
import {
  getGeodeGlowTexture,
  getSoftContactShadowTexture,
  loadPublicSpriteTexture,
  OreBillboard2D,
} from './OreBillboard3D';
import {
  getHazardStripeTexture,
  getQuarryFloorTexture,
  getShockwaveRingTexture,
} from './ProceduralTextures3D';

export {
  getGeodeGlowTexture,
  getSoftContactShadowTexture,
  loadPublicSpriteTexture,
  OreBillboard2D,
};

export const PIT_NODE_COUNT = 1;
export const PIT_CENTER_Z = 0.65;
export const PIT_FLOOR_Y = -0.68;
export const PIT_HALF_W = 4.55;
export const PIT_HALF_D = 2.25;

const BASE_ORE_HP = 180;
/** Balanced 25% nerf from 500 -> 375 so Weather Meteors feel rewarding without dragging. */
export const METEOR_HP_MULT = 375;
export const BASE_ORE_RESPAWN_SEC = 4.0;

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

export function applyNodeDamagePure(
  node: DamageableOreState,
  dmg: number
): PureOreHitResult | null {
  if (!node.alive || node.hp <= 0 || dmg <= 0) return null;
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
}

export interface OreAttackFxOptions {
  accentColor?: string;
  attackerX?: number;
  attackerZ?: number;
  comboStep?: number;
}

interface ShardParticle {
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

function resolveWorldIdFromPalette(palette: MineWorldPalette): WorldId {
  for (const [id, p] of Object.entries(WORLD_PALETTES) as Array<[WorldId, MineWorldPalette]>) {
    if (p === palette) return id;
  }
  return 'underground';
}

function pickWorldOreForVariant(worldId: WorldId, variantKey: OreVariantKey): OreDef {
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

interface InternalOreNode {
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

const METEOR_TARGET_X = 0;
const METEOR_TARGET_Z = -0.25;
const METEOR_START_X = -5.4;
const METEOR_START_Y = 14.5;
const METEOR_START_Z = -4.2;
const METEOR_DROP_DURATION = 0.72;

export class OrePit3D {
  public readonly group = new THREE.Group();
  public readonly clickableMeshes: THREE.Mesh[] = [];
  public onMeteorLanded?: () => void;

  private readonly floorMat: THREE.MeshStandardMaterial;
  private readonly wallMat: THREE.MeshStandardMaterial;
  private readonly trimMat: THREE.MeshStandardMaterial;
  private readonly pitNeonMat: THREE.MeshStandardMaterial;
  private readonly shardMat: THREE.MeshStandardMaterial;
  private readonly rockChipMat: THREE.MeshStandardMaterial;
  private readonly sharedShardGeo = new THREE.OctahedronGeometry(0.14, 0);
  private readonly sharedRockGeo = new THREE.DodecahedronGeometry(0.125, 0);
  private readonly shardPool: ShardParticle[] = [];
  private readonly shardFreeCrystal: THREE.Mesh[] = [];
  private readonly shardFreeRock: THREE.Mesh[] = [];
  private readonly impactFx = new AttackImpactFxController({ floorY: 0.045 });
  private readonly ownedGeos: THREE.BufferGeometry[] = [];
  private readonly ownedMats: THREE.Material[] = [];
  private readonly nodes: InternalOreNode[] = [];

  private activePalette!: MineWorldPalette;
  private activeWorldId: WorldId = 'underground';
  private hoveredNodeId = -1;
  private respawnSpeedMult = 1;
  private activeNodeCount = PIT_NODE_COUNT;
  private hpScale = 1;
  private meteorNode: InternalOreNode;
  private readonly meteorEntryGroup = new THREE.Group();
  private readonly meteorCoreMat: THREE.MeshBasicMaterial;
  private readonly meteorBowMat: THREE.MeshBasicMaterial;
  private readonly meteorTailOuterMat: THREE.MeshBasicMaterial;
  private readonly meteorTailInnerMat: THREE.MeshBasicMaterial;
  private readonly meteorTailOuterMesh: THREE.Mesh;
  private readonly meteorTailInnerMesh: THREE.Mesh;
  private readonly meteorTargetGroup = new THREE.Group();
  private readonly meteorTargetShadow: THREE.Mesh;
  private readonly meteorTargetShadowMat: THREE.MeshBasicMaterial;
  private readonly meteorTargetRing: THREE.Mesh;
  private readonly meteorTargetRingMat: THREE.MeshBasicMaterial;

  constructor(palette: MineWorldPalette) {
    this.activePalette = palette;
    this.group.position.set(0, PIT_FLOOR_Y, PIT_CENTER_Z);

    // Sunlit Textured Sunken Quarry Floor (sits cleanly 0.68m below courtyard deck y=0)
    this.floorMat = new THREE.MeshStandardMaterial({
      map: getQuarryFloorTexture(palette.pitFloorColor, palette.crystalColor),
      roughness: 0.85,
      metalness: 0.05,
    });
    const floorGeo = new THREE.BoxGeometry(11.8, 0.14, 6.8);
    this.ownedGeos.push(floorGeo);
    const floor = new THREE.Mesh(floorGeo, this.floorMat);
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Full-Height Excavated Cyber-Slate Retaining Walls + Hazard Collar + Thin Neon Rim
    this.wallMat = new THREE.MeshStandardMaterial({
      color: 0x2a3952,
      roughness: 0.76,
      metalness: 0.1,
      flatShading: true,
    });
    this.trimMat = new THREE.MeshStandardMaterial({
      map: getHazardStripeTexture(palette.crystalColor),
      roughness: 0.42,
      metalness: 0.25,
    });
    this.pitNeonMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 1.05,
      roughness: 0.2,
      metalness: 0.25,
      flatShading: true,
    });

    const pitW = 11.8;
    const pitD = 6.8;
    const wallH = 0.86;
    // Open portals:
    // - North center (x in [-1.3, +1.3]) for stepped cyber stairwell descending from deck
    // - Left spur (z in [-1.25, +0.25] -> world z=0.15) for sloped Drop Shaft shuttle entry
    // - Right chute (z in [-1.25, +0.25] -> world z=0.15) for inclined Plasma Refinery conveyor exit
    const wallSpecs: [number, number, number, number, number][] = [
      [-3.6, -pitD / 2, 4.6, wallH, 0.36],
      [3.6, -pitD / 2, 4.6, wallH, 0.36],
      [0, pitD / 2, pitW, wallH, 0.36],
      [-pitW / 2, -2.325, 0.36, wallH, 2.15],
      [-pitW / 2, 1.825, 0.36, wallH, 3.15],
      [pitW / 2, -2.325, 0.36, wallH, 2.15],
      [pitW / 2, 1.825, 0.36, wallH, 3.15],
    ];
    for (const [wx, wz, ww, wh, wd] of wallSpecs) {
      const wallGeo = new THREE.BoxGeometry(ww, wh, wd);
      const wall = new THREE.Mesh(wallGeo, this.wallMat);
      wall.position.set(wx, wh * 0.5, wz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);

      const trimGeo = new THREE.BoxGeometry(ww > wd ? ww : 0.34, 0.11, wd > ww ? wd : 0.34);
      const trim = new THREE.Mesh(trimGeo, this.trimMat);
      trim.position.set(wx, wh + 0.04, wz);
      trim.castShadow = true;
      this.group.add(trim);

      const isHoriz = ww > wd;
      const neonGeo = new THREE.BoxGeometry(isHoriz ? ww + 0.04 : 0.06, 0.035, isHoriz ? 0.06 : wd + 0.04);
      const neonRim = new THREE.Mesh(neonGeo, this.pitNeonMat);
      neonRim.position.set(wx, wh + 0.115, wz);
      this.group.add(neonRim);
      this.ownedGeos.push(wallGeo, trimGeo, neonGeo);
    }

    // Stepped inner basalt retaining ledge along bottom perimeter
    const benchSpecs: [number, number, number, number][] = [
      [-3.6, -pitD / 2 + 0.26, 4.4, 0.28],
      [3.6, -pitD / 2 + 0.26, 4.4, 0.28],
      [0, pitD / 2 - 0.26, 11.4, 0.28],
    ];
    for (const [bx, bz, bw, bd] of benchSpecs) {
      const benchGeo = new THREE.BoxGeometry(bw, 0.26, bd);
      this.ownedGeos.push(benchGeo);
      const bench = new THREE.Mesh(benchGeo, this.wallMat);
      bench.position.set(bx, 0.13, bz);
      bench.receiveShadow = true;
      bench.castShadow = true;
      this.group.add(bench);
    }

    // Corner Cyber Steel Anchor Pylons + Glowing Beacon Collars framing the excavated pit rim
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x223047,
      roughness: 0.44,
      metalness: 0.42,
      flatShading: true,
    });
    const steelCapMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d6b,
      metalness: 0.48,
      roughness: 0.34,
      flatShading: true,
    });
    const postGeo = new THREE.CylinderGeometry(0.24, 0.28, 1.04, 8);
    this.ownedGeos.push(postGeo);
    this.ownedMats.push(postMat, steelCapMat);
    const trackedCornerGeos = new Set<THREE.BufferGeometry>();
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = sx * (pitW / 2);
        const pz = sz * (pitD / 2);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, 0.52, pz);
        post.castShadow = true;
        const finial = createCyberLanternBollardFinial({
          frameMat: postMat,
          steelMat: steelCapMat,
          coreMat: this.pitNeonMat,
          scale: 0.86,
        });
        finial.position.set(px, 1.02, pz);
        finial.traverse((child) => {
          if (child instanceof THREE.Mesh && !trackedCornerGeos.has(child.geometry)) {
            trackedCornerGeos.add(child.geometry);
            this.ownedGeos.push(child.geometry);
          }
        });
        this.group.add(post, finial);
      }
    }

    this.sharedShardGeo.scale(0.75, 1.45, 0.75);
    this.shardMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 0.78,
      roughness: 0.22,
      metalness: 0.35,
      flatShading: true,
    });
    this.rockChipMat = new THREE.MeshStandardMaterial({
      color: '#2c364d',
      emissive: '#0f172a',
      emissiveIntensity: 0.2,
      roughness: 0.78,
      metalness: 0.18,
      flatShading: true,
    });

    // Build reusable ore node slots inside the pit (up to MAX_PIT_NODE_COUNT unlocked by Deposits upgrades)
    for (let i = 0; i < MAX_PIT_NODE_COUNT; i++) {
      const node = this.createNodeSlot(i);
      this.nodes.push(node);
      this.group.add(node.root);
      this.clickableMeshes.push(node.hitMesh);
    }

    this.meteorNode = this.createNodeSlot(999);
    this.meteorNode.isMeteor = true;
    this.meteorNode.meteorWeatherId = null;
    this.meteorNode.alive = false;
    this.meteorNode.root.visible = false;
    this.meteorNode.hitMesh.visible = false;
    this.meteorNode.hitMesh.scale.set(1.85, 1.65, 1.85);
    this.meteorNode.geodeRing.scale.setScalar(1.95);
    this.group.add(this.meteorNode.root);
    this.clickableMeshes.push(this.meteorNode.hitMesh);

    // 3D Atmospheric Entry Plasma Envelope & Tail Plume (oriented along dive trajectory)
    const entryBackDir = new THREE.Vector3(
      METEOR_START_X - METEOR_TARGET_X,
      METEOR_START_Y,
      METEOR_START_Z - METEOR_TARGET_Z
    ).normalize();
    this.meteorEntryGroup.position.set(0, 1.4, 0);
    this.meteorEntryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), entryBackDir);
    this.meteorEntryGroup.visible = false;

    const coreGeo = new THREE.IcosahedronGeometry(0.92, 1);
    const bowGeo = new THREE.ConeGeometry(1.36, 1.75, 9, 1, true);
    const tailOuterGeo = new THREE.ConeGeometry(1.06, 5.4, 9, 1, true);
    const tailInnerGeo = new THREE.ConeGeometry(0.54, 4.1, 7, 1, true);
    this.ownedGeos.push(coreGeo, bowGeo, tailOuterGeo, tailInnerGeo);

    this.meteorCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.meteorBowMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.meteorTailOuterMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.meteorTailInnerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.ownedMats.push(
      this.meteorCoreMat,
      this.meteorBowMat,
      this.meteorTailOuterMat,
      this.meteorTailInnerMat
    );

    const coreMesh = new THREE.Mesh(coreGeo, this.meteorCoreMat);
    const bowMesh = new THREE.Mesh(bowGeo, this.meteorBowMat);
    bowMesh.rotation.x = Math.PI;
    bowMesh.position.y = -0.35;

    this.meteorTailOuterMesh = new THREE.Mesh(tailOuterGeo, this.meteorTailOuterMat);
    this.meteorTailOuterMesh.position.y = 2.6;
    this.meteorTailInnerMesh = new THREE.Mesh(tailInnerGeo, this.meteorTailInnerMat);
    this.meteorTailInnerMesh.position.y = 2.1;

    this.meteorEntryGroup.add(coreMesh, bowMesh, this.meteorTailOuterMesh, this.meteorTailInnerMesh);
    this.meteorNode.root.add(this.meteorEntryGroup);

    // Ground Strike Telegraph Shadow & Contracting Target Ring
    this.meteorTargetGroup.position.set(METEOR_TARGET_X, 0.038, METEOR_TARGET_Z);
    this.meteorTargetGroup.visible = false;
    const targetShadowGeo = new THREE.CircleGeometry(1.55, 24);
    const targetRingGeo = new THREE.PlaneGeometry(3.6, 3.6);
    this.ownedGeos.push(targetShadowGeo, targetRingGeo);

    const shadowTex = getSoftContactShadowTexture();
    this.meteorTargetShadowMat = new THREE.MeshBasicMaterial({
      ...(shadowTex ? { map: shadowTex } : {}),
      color: 0x020617,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const ringTex = getShockwaveRingTexture();
    this.meteorTargetRingMat = new THREE.MeshBasicMaterial({
      ...(ringTex ? { map: ringTex } : {}),
      color: 0xf472b6,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.ownedMats.push(this.meteorTargetShadowMat, this.meteorTargetRingMat);

    this.meteorTargetShadow = new THREE.Mesh(targetShadowGeo, this.meteorTargetShadowMat);
    this.meteorTargetShadow.rotation.x = -Math.PI / 2;
    this.meteorTargetRing = new THREE.Mesh(targetRingGeo, this.meteorTargetRingMat);
    this.meteorTargetRing.rotation.x = -Math.PI / 2;
    this.meteorTargetRing.position.y = 0.008;
    this.meteorTargetGroup.add(this.meteorTargetShadow, this.meteorTargetRing);
    this.group.add(this.meteorTargetGroup);

    this.group.add(this.impactFx.group);

    this.setPalette(palette, true);
  }

  private createNodeSlot(id: number): InternalOreNode {
    const root = new THREE.Group();
    const oreSprite = new OreBillboard2D(1.45);
    root.add(oreSprite.root);

    const geodeTex = getGeodeGlowTexture();
    const geodeRing = new THREE.Mesh(
      geodeTex ? new THREE.PlaneGeometry(2.15, 2.15) : new THREE.RingGeometry(0.8, 0.98, 24),
      new THREE.MeshBasicMaterial({
        ...(geodeTex ? { map: geodeTex } : {}),
        color: this.activePalette.crystalColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: geodeTex ? 0.74 : 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    geodeRing.rotation.x = -Math.PI / 2;
    geodeRing.position.y = 0.034;
    root.add(geodeRing);

    const hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.94, 1.0, 1.9, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitMesh.position.y = 0.95;
    hitMesh.userData = { kind: 'ore-node', nodeId: id };
    root.add(hitMesh);

    const variant = rollOreVariant();
    const oreDef = pickWorldOreForVariant(this.activeWorldId, variant.key);
    return {
      id,
      root,
      oreSprite,
      hitMesh,
      geodeRing,
      oreDef,
      variant,
      hp: 100,
      maxHp: 100,
      alive: true,
      respawnTimer: 0,
      squashAmt: 0,
      recoilAmt: 0,
      recoilDirX: 1,
      flashTimer: 0,
      spawnScale: 1,
      x: 0,
      z: 0,
      phase: id * 0.7,
    };
  }

  public setPalette(palette: MineWorldPalette, forceRespawnAll = false): void {
    this.activePalette = palette;
    this.activeWorldId = resolveWorldIdFromPalette(palette);

    const cColor = new THREE.Color(palette.crystalColor);
    this.floorMat.map = getQuarryFloorTexture(palette.pitFloorColor, palette.crystalColor);
    this.floorMat.needsUpdate = true;
    this.wallMat.color.setHex(0x161f30);
    this.trimMat.map = getHazardStripeTexture(palette.crystalColor);
    this.trimMat.needsUpdate = true;
    this.pitNeonMat.color.copy(cColor);
    this.pitNeonMat.emissive.copy(cColor);
    this.shardMat.color.copy(cColor);
    this.shardMat.emissive.copy(cColor);

    if (forceRespawnAll) {
      for (const node of this.nodes) {
        if (node.id < this.activeNodeCount) {
          this.spawnNode(node, true);
        } else {
          this.deactivateNode(node);
        }
      }
    } else {
      for (const node of this.nodes) {
        if (!node.alive) continue;
        node.oreSprite.setCollarAccent(
          node.variant.key === 'geode' ? node.oreDef.color : palette.crystalColor
        );
      }
    }
  }

  private deactivateNode(node: InternalOreNode): void {
    node.alive = false;
    node.hp = 0;
    node.respawnTimer = 0;
    node.root.visible = false;
    node.hitMesh.visible = false;
  }

  public setActiveNodeCount(count: number): void {
    const next = Math.max(1, Math.min(MAX_PIT_NODE_COUNT, Math.round(count)));
    if (next === this.activeNodeCount) return;
    this.activeNodeCount = next;
    for (const node of this.nodes) {
      if (node.id < this.activeNodeCount) {
        if (!node.alive && node.respawnTimer <= 0) {
          this.spawnNode(node, false);
        }
      } else {
        this.deactivateNode(node);
      }
    }
  }

  public setHpScale(scale: number): void {
    const next = Math.max(0.25, scale);
    if (Math.abs(next - this.hpScale) < 1e-4) return;
    const ratio = next / this.hpScale;
    this.hpScale = next;
    for (const node of this.nodes) {
      if (node.id >= this.activeNodeCount || !node.alive) continue;
      node.maxHp = Math.max(10, Math.round(BASE_ORE_HP * this.hpScale * node.variant.hpMult));
      node.hp = Math.max(1, Math.min(node.maxHp, Math.round(node.hp * ratio)));
    }
    if (this.meteorNode.alive) {
      this.meteorNode.maxHp = Math.max(500, Math.round(this.meteorNode.maxHp * ratio));
      this.meteorNode.hp = Math.max(1, Math.min(this.meteorNode.maxHp, Math.round(this.meteorNode.hp * ratio)));
    }
  }

  public spawnWeatherMeteor(weatherId: WeatherId, hpScale = this.hpScale, minBossHp = 0): void {
    this.hpScale = Math.max(0.25, hpScale);
    const weather = getWeatherById(weatherId);
    const baseMeteorHp = Math.max(500, Math.round(BASE_ORE_HP * this.hpScale * METEOR_HP_MULT));
    const meteorHp = Math.max(baseMeteorHp, Math.round(minBossHp));
    const n = this.meteorNode;
    n.meteorWeatherId = weatherId;
    n.variant = ORE_VARIANTS.find((v) => v.key === 'geode') ?? ORE_VARIANTS[0];
    n.x = METEOR_START_X;
    n.z = METEOR_START_Z;
    n.hp = meteorHp;
    n.maxHp = meteorHp;
    n.alive = true;
    n.respawnTimer = 0;
    n.squashAmt = 0;
    n.recoilAmt = 0;
    n.recoilDirX = 1;
    n.flashTimer = 0.14;
    n.spawnScale = 0.62;
    n.dropY = METEOR_START_Y;
    n.dropProgress = 0;
    n.dropDuration = METEOR_DROP_DURATION;
    n.trailTimer = 0;

    n.root.position.set(n.x, n.dropY, n.z);
    n.root.visible = true;
    n.hitMesh.visible = true;
    n.geodeRing.visible = false;
    (n.geodeRing.material as THREE.MeshBasicMaterial).color.set(weather.accentColor);
    n.oreSprite.setCollarVisible(false);
    n.oreSprite.setCollarAccent(weather.accentColor);
    n.oreSprite.setMeteor(weatherId, 3.15);

    this.meteorCoreMat.color.set(weather.accentColor).lerp(new THREE.Color('#ffffff'), 0.45);
    this.meteorBowMat.color.set(weather.accentColor);
    this.meteorTailOuterMat.color.set(weather.accentColor);
    this.meteorTargetRingMat.color.set(weather.accentColor);
    this.meteorEntryGroup.visible = true;
    this.meteorTargetGroup.visible = true;
    this.meteorTargetShadow.scale.setScalar(1.85);
    this.meteorTargetShadowMat.opacity = 0.16;
    this.meteorTargetRing.scale.setScalar(1.55);
    this.meteorTargetRingMat.opacity = 0.35;
  }

  public clearWeatherMeteor(): void {
    const n = this.meteorNode;
    n.alive = false;
    n.meteorWeatherId = null;
    n.respawnTimer = 0;
    n.dropProgress = 1;
    n.dropY = 0;
    n.root.visible = false;
    n.hitMesh.visible = false;
    this.meteorEntryGroup.visible = false;
    this.meteorTargetGroup.visible = false;
  }

  public hasAliveMeteor(): boolean {
    return this.meteorNode.alive;
  }

  private pickNonOverlappingSpot(excludeId: number): { x: number; z: number } {
    let bestX = (Math.random() - 0.5) * (PIT_HALF_W * 1.8);
    let bestZ = (Math.random() - 0.5) * (PIT_HALF_D * 1.75);
    let bestMinDist = -1;

    for (let attempt = 0; attempt < 22; attempt++) {
      const cx = (Math.random() * 2 - 1) * PIT_HALF_W;
      const cz = (Math.random() * 2 - 1) * PIT_HALF_D;
      let minDist = 999;
      for (const other of this.nodes) {
        if (other.id === excludeId || other.id >= this.activeNodeCount) continue;
        const d = Math.hypot(cx - other.x, cz - other.z);
        if (d < minDist) minDist = d;
      }
      if (minDist >= 1.9) return { x: cx, z: cz };
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestX = cx;
        bestZ = cz;
      }
    }
    return { x: bestX, z: bestZ };
  }

  private spawnNode(node: InternalOreNode, instant = false): void {
    if (node.id >= this.activeNodeCount) {
      this.deactivateNode(node);
      return;
    }
    const spot = this.pickNonOverlappingSpot(node.id);
    const variant = rollOreVariant();
    const oreDef = pickWorldOreForVariant(this.activeWorldId, variant.key);
    const maxHp = Math.max(10, Math.round(BASE_ORE_HP * this.hpScale * variant.hpMult));
    const baseSize = variant.key === 'geode' ? 1.9 : variant.key === 'vein' ? 1.58 : 1.32;

    node.variant = variant;
    node.oreDef = oreDef;
    node.x = spot.x;
    node.z = spot.z;
    node.hp = maxHp;
    node.maxHp = maxHp;
    node.alive = true;
    node.respawnTimer = 0;
    node.squashAmt = instant ? 0 : 0.24;
    node.recoilAmt = 0;
    node.recoilDirX = 1;
    node.flashTimer = 0;
    node.spawnScale = instant ? 1 : 0.08;

    node.root.position.set(node.x, 0, node.z);
    node.root.visible = true;
    node.hitMesh.visible = true;

    const ringColor =
      variant.key === 'geode'
        ? new THREE.Color(oreDef.color).lerp(new THREE.Color('#ffffff'), 0.15)
        : new THREE.Color(this.activePalette.crystalColor);
    node.geodeRing.visible = variant.key === 'geode';
    (node.geodeRing.material as THREE.MeshBasicMaterial).color.copy(ringColor);
    node.oreSprite.setCollarVisible(true);
    node.oreSprite.setCollarAccent(variant.key === 'geode' ? oreDef.color : this.activePalette.crystalColor);

    node.oreSprite.setOre(oreDef.id, baseSize);
  }

  public spawnTutorialCenterOre(hp: number): void {
    const node = this.nodes[0];
    if (!node) return;
    const variant = ORE_VARIANTS.find((v) => v.key === 'geode') ?? rollOreVariant();
    const oreDef = pickWorldOreForVariant(this.activeWorldId, variant.key);
    const safeHp = Math.max(10, Math.round(hp));
    const baseSize = 2.05;

    node.variant = variant;
    node.oreDef = oreDef;
    node.x = 0;
    node.z = 0;
    node.hp = safeHp;
    node.maxHp = safeHp;
    node.alive = true;
    node.respawnTimer = 0;
    node.squashAmt = 0.2;
    node.recoilAmt = 0;
    node.recoilDirX = 1;
    node.flashTimer = 0;
    node.spawnScale = 1;

    node.root.position.set(0, 0, 0);
    node.root.visible = true;
    node.hitMesh.visible = true;

    const ringColor = new THREE.Color(oreDef.color).lerp(new THREE.Color('#ffffff'), 0.15);
    node.geodeRing.visible = true;
    (node.geodeRing.material as THREE.MeshBasicMaterial).color.copy(ringColor);
    node.oreSprite.setCollarVisible(true);
    node.oreSprite.setCollarAccent(oreDef.color);
    node.oreSprite.setOre(oreDef.id, baseSize);
  }

  public setHoveredNode(nodeId: number): void {
    this.hoveredNodeId = nodeId;
  }

  public hitNode(
    nodeId: number,
    dmg: number,
    heavy: boolean,
    shardCount = heavy ? 4 : 2,
    attackFx?: OreAttackFxOptions
  ): OreHitResult | null {
    const node =
      nodeId === this.meteorNode.id ? this.meteorNode : this.nodes.find((n) => n.id === nodeId);
    if (!node || !node.alive) return null;

    const effectiveDmg = node.isMeteor
      ? Math.min(dmg, Math.max(1, Math.ceil(node.maxHp * 0.03)))
      : dmg;
    const pure = applyNodeDamagePure(node, effectiveDmg);
    if (!pure) return null;

    node.squashAmt = heavy ? 0.46 : 0.34;
    node.recoilDirX =
      attackFx?.attackerX !== undefined
        ? Math.sign(node.x - attackFx.attackerX) || 1
        : Math.random() < 0.5
          ? 1
          : -1;
    node.recoilAmt = heavy ? 0.24 : 0.16;
    node.flashTimer = 0.09;
    const pitEventKind = node.pitEventKind;
    if (this.group.visible) {
      const eventColor = pitEventKind ? PIT_EVENT_DEFS[pitEventKind].colorHex : undefined;
      const fxAccent = eventColor ?? attackFx?.accentColor ?? (heavy ? '#fbbf24' : this.activePalette.crystalColor);
      this.spawnShardsAt(
        node.x,
        node.z,
        pure.broken ? (node.isMeteor ? 16 : 9) : shardCount,
        pure.broken,
        node.isMeteor
      );
      if (pure.broken) {
        const oreBreakColor = eventColor
          ? eventColor
          : node.isMeteor
            ? (node.meteorWeatherId ? getWeatherById(node.meteorWeatherId).accentColor : '#f472b6')
            : this.activePalette.crystalColor;
        this.impactFx.spawnShatter({
          targetX: node.x,
          targetY: node.isMeteor ? 1.15 : 0.92,
          targetZ: node.z,
          oreColor: oreBreakColor,
          secondaryColor: fxAccent,
          isMeteor: node.isMeteor,
        });
      } else {
        this.impactFx.spawnImpact({
          targetX: node.x,
          targetY: 0.92,
          targetZ: node.z,
          accentColor: fxAccent,
          heavy,
          comboStep: attackFx?.comboStep,
          attackerX: attackFx?.attackerX,
          attackerZ: attackFx?.attackerZ !== undefined ? attackFx.attackerZ - PIT_CENTER_Z : undefined,
        });
      }
    }

    const meteorWeatherId = node.isMeteor && pure.broken ? (node.meteorWeatherId ?? undefined) : undefined;
    if (pure.broken) {
      node.root.visible = false;
      node.hitMesh.visible = false;
      node.pitEventKind = undefined;
      if (node.isMeteor) {
        node.respawnTimer = 0;
        node.meteorWeatherId = null;
        this.meteorEntryGroup.visible = false;
        this.meteorTargetGroup.visible = false;
      } else {
        node.respawnTimer = BASE_ORE_RESPAWN_SEC;
      }
    }

    return {
      broken: pure.broken,
      variantKey: node.variant.key,
      dmgDealt: pure.dmgDealt,
      isMeteor: node.isMeteor,
      meteorWeatherId,
      pitEventKind,
    };
  }

  public getImpactFxCounts(): { slashes: number; hitsparks: number; streaks: number; shockwaves: number } {
    return this.impactFx.getActiveCounts();
  }

  private spawnShardsAt(lx: number, lz: number, count: number, isShatter = false, isMeteor = false): void {
    const maxCap = 36;
    for (let i = 0; i < count; i++) {
      if (this.shardPool.length >= maxCap) {
        const oldest = this.shardPool.shift();
        if (oldest) {
          this.group.remove(oldest.mesh);
          const freeArr = oldest.mesh.material === this.shardMat ? this.shardFreeCrystal : this.shardFreeRock;
          if (freeArr.length < maxCap) freeArr.push(oldest.mesh);
        }
      }
      const isCrystal = isShatter ? i % 3 !== 2 : i % 2 === 0;
      const freeArr = isCrystal ? this.shardFreeCrystal : this.shardFreeRock;
      const mesh =
        freeArr.pop() ??
        new THREE.Mesh(
          isCrystal ? this.sharedShardGeo : this.sharedRockGeo,
          isCrystal ? this.shardMat : this.rockChipMat
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
      this.group.add(mesh);
      this.shardPool.push({
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

  public getAliveNodeIds(): number[] {
    return this.nodes.filter((n) => n.alive).map((n) => n.id);
  }

  public activatePitEvent(kind: PitEventKind): number | null {
    this.clearPitEvent();
    const alive = this.nodes.filter((n) => n.alive);
    if (alive.length === 0) return null;
    const picked = alive[Math.floor(Math.random() * alive.length)];
    picked.pitEventKind = kind;
    return picked.id;
  }

  public clearPitEvent(): void {
    for (const n of this.nodes) {
      n.pitEventKind = undefined;
    }
  }

  public getAliveNodesInfo(): Array<{
    id: number;
    worldX: number;
    worldY: number;
    worldZ: number;
    hp: number;
    maxHp: number;
    variantKey: OreVariantKey;
    isMeteor?: boolean;
    meteorWeatherId?: WeatherId;
    pitEventKind?: PitEventKind;
  }> {
    const list: Array<{
      id: number;
      worldX: number;
      worldY: number;
      worldZ: number;
      hp: number;
      maxHp: number;
      variantKey: OreVariantKey;
      isMeteor?: boolean;
      meteorWeatherId?: WeatherId;
      pitEventKind?: PitEventKind;
    }> = this.nodes
      .filter((n) => n.alive)
      .map((n) => ({
        id: n.id,
        worldX: n.x,
        worldY: PIT_FLOOR_Y,
        worldZ: PIT_CENTER_Z + n.z,
        hp: n.hp,
        maxHp: n.maxHp,
        variantKey: n.variant.key,
        pitEventKind: n.pitEventKind,
      }));
    if (this.meteorNode.alive) {
      list.push({
        id: this.meteorNode.id,
        worldX: this.meteorNode.x,
        worldY: PIT_FLOOR_Y + (this.meteorNode.dropY ?? 0),
        worldZ: PIT_CENTER_Z + this.meteorNode.z,
        hp: this.meteorNode.hp,
        maxHp: this.meteorNode.maxHp,
        variantKey: this.meteorNode.variant.key,
        isMeteor: true,
        meteorWeatherId: this.meteorNode.meteorWeatherId ?? undefined,
      });
    }
    return list;
  }

  public setRespawnSpeedMult(mult: number): void {
    this.respawnSpeedMult = Math.max(0.5, mult);
  }

  public update(dtSec: number, elapsed: number, camera?: THREE.Camera): void {
    const allNodes = this.meteorNode.alive ? [...this.nodes, this.meteorNode] : this.nodes;
    for (const node of allNodes) {
      if (!node.isMeteor && node.id >= this.activeNodeCount) continue;
      if (!node.alive) {
        if (node.respawnTimer > 0) {
          node.respawnTimer -= dtSec * this.respawnSpeedMult;
          if (node.respawnTimer <= 0) {
            this.spawnNode(node, false);
          }
        }
        continue;
      }

      let meteorRoll = 0;
      let meteorStretchY = 1;
      if (node.isMeteor && (node.dropProgress ?? 1) < 1) {
        const prevP = node.dropProgress ?? 0;
        const dur = node.dropDuration ?? METEOR_DROP_DURATION;
        const nextP = Math.min(1, prevP + dtSec / dur);
        node.dropProgress = nextP;
        // Accelerating atmospheric dive curve toward impact center
        const ease = nextP * nextP * (0.35 + 0.65 * nextP);
        node.x = METEOR_START_X + (METEOR_TARGET_X - METEOR_START_X) * ease;
        node.z = METEOR_START_Z + (METEOR_TARGET_Z - METEOR_START_Z) * ease;
        node.dropY = METEOR_START_Y * (1 - ease);
        node.root.position.set(node.x, node.dropY, node.z);
        node.spawnScale = 0.62 + ease * 0.38;

        const accent = node.meteorWeatherId
          ? getWeatherById(node.meteorWeatherId).accentColor
          : '#f472b6';

        if (nextP < 1) {
          this.meteorEntryGroup.visible = true;
          this.meteorTargetGroup.visible = true;
          this.meteorTailOuterMesh.rotation.y += dtSec * 10;
          this.meteorTailInnerMesh.rotation.y -= dtSec * 15;
          const flamePulse = 0.88 + Math.sin(elapsed * 48) * 0.16;
          this.meteorTailOuterMesh.scale.set(1, flamePulse, 1);
          this.meteorTailInnerMesh.scale.set(1, 0.92 + Math.cos(elapsed * 56) * 0.14, 1);

          this.meteorTargetShadow.scale.setScalar(1.85 - ease * 0.95);
          this.meteorTargetShadowMat.opacity = 0.16 + ease * 0.72;
          const ringPulse = 1 + Math.sin(elapsed * 18) * 0.08;
          this.meteorTargetRing.scale.setScalar((1.55 - ease * 0.78) * ringPulse);
          this.meteorTargetRing.rotation.z -= dtSec * 2.4;
          this.meteorTargetRingMat.opacity = 0.35 + ease * 0.55;

          meteorRoll = -0.28 * (1 - ease) + Math.sin(elapsed * 42) * 0.06;
          meteorStretchY = 1 + (1 - ease) * 0.24;

          node.trailTimer = (node.trailTimer ?? 0) - dtSec;
          if (nextP < 0.94 && (node.trailTimer ?? 0) <= 0 && this.group.visible) {
            node.trailTimer = 0.04;
            this.impactFx.spawnMeteorTrail({
              x: node.x,
              y: node.dropY + 1.35,
              z: node.z,
              accentColor: accent,
              camera,
            });
          }
        } else {
          node.x = METEOR_TARGET_X;
          node.z = METEOR_TARGET_Z;
          node.dropY = 0;
          node.spawnScale = 1;
          node.root.position.set(node.x, 0, node.z);
          this.meteorEntryGroup.visible = false;
          this.meteorTargetGroup.visible = false;
          node.oreSprite.setCollarVisible(true);
          node.geodeRing.visible = true;
          node.squashAmt = 0.56;
          node.flashTimer = 0.14;
          if (this.group.visible) {
            this.impactFx.spawnMeteorLanding({
              targetX: node.x,
              targetZ: node.z,
              accentColor: accent,
              camera,
            });
            this.spawnShardsAt(node.x, node.z, 18, true, true);
            this.onMeteorLanded?.();
          }
        }
      }

      if (node.spawnScale < 1 && !(node.isMeteor && (node.dropProgress ?? 1) < 1)) {
        node.spawnScale = Math.min(1, node.spawnScale + dtSec * 4.5);
      }

      if (node.squashAmt > 0.001) {
        node.squashAmt = Math.max(0, node.squashAmt - dtSec * 2.5);
      }

      if (node.recoilAmt > 0.001) {
        node.recoilAmt = Math.max(0, node.recoilAmt - dtSec * 1.35);
      }

      const hoverMult = (node.id === this.hoveredNodeId ? 1.1 : 1.0) * node.spawnScale;
      const flashing = node.flashTimer > 0;
      if (flashing) {
        node.flashTimer -= dtSec;
      }

      node.oreSprite.updateTransform(
        elapsed,
        node.phase,
        node.squashAmt,
        hoverMult,
        flashing,
        camera,
        node.recoilAmt * node.recoilDirX,
        meteorRoll,
        meteorStretchY
      );

      if (node.geodeRing.visible) {
        node.geodeRing.rotation.z = elapsed * 0.18 + node.phase;
      }
    }

    for (let i = this.shardPool.length - 1; i >= 0; i--) {
      const p = this.shardPool[i];
      p.age += dtSec;
      if (p.age >= p.dur) {
        this.group.remove(p.mesh);
        const freeArr = p.mesh.material === this.shardMat ? this.shardFreeCrystal : this.shardFreeRock;
        if (freeArr.length < 72) freeArr.push(p.mesh);
        this.shardPool.splice(i, 1);
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

    this.impactFx.update(dtSec, camera);
  }

  public dispose(): void {
    this.impactFx.dispose();
    for (const p of this.shardPool) {
      this.group.remove(p.mesh);
    }
    this.shardPool.length = 0;
    this.shardFreeCrystal.length = 0;
    this.shardFreeRock.length = 0;

    for (const node of [...this.nodes, this.meteorNode]) {
      node.oreSprite.dispose();
      node.geodeRing.geometry.dispose();
      (node.geodeRing.material as THREE.Material).dispose();
      node.hitMesh.geometry.dispose();
      (node.hitMesh.material as THREE.Material).dispose();
    }

    for (const geo of this.ownedGeos) {
      geo.dispose();
    }
    for (const mat of this.ownedMats) {
      mat.dispose();
    }
    this.floorMat.dispose();
    this.wallMat.dispose();
    this.trimMat.dispose();
    this.pitNeonMat.dispose();
    this.shardMat.dispose();
    this.rockChipMat.dispose();
    this.sharedShardGeo.dispose();
    this.sharedRockGeo.dispose();
  }
}
