import * as THREE from 'three';
import { type WorldId } from '../game/GameData';
import { getWeatherById, type WeatherId } from '../game/WeatherData';
import { PIT_EVENT_DEFS, type PitEventKind } from '../game/PitEventsDomain';
import {
  MAX_PIT_NODE_COUNT,
  type MineWorldPalette,
  ORE_VARIANTS,
  type OreVariantKey,
  rollOreVariant,
} from './MineWorldPalette';
import { AttackImpactFxController } from './AttackImpactFx3D';
import {
  getGeodeGlowTexture,
  getSoftContactShadowTexture,
  loadPublicSpriteTexture,
  OreBillboard2D,
} from './OreBillboard3D';
import {
  getCircularNexusPoolTexture,
  getHazardStripeTexture,
} from './ProceduralTextures3D';
import {
  applyNodeDamagePure,
  BASE_ORE_RESPAWN_SEC,
  buildOrePitEnvironmentMeshes,
  buildOrePitMeteorAndSpotFx,
  computeMeteorDynamicHp,
  type DamageableOreState,
  type InternalOreNode,
  isSweetSpotWindowPure,
  METEOR_HP_MULT,
  type OreAttackFxOptions,
  type OreHitResult,
  pickWorldOreForVariant,
  PIT_CENTER_Z,
  PIT_FLOOR_Y,
  PIT_HALF_D,
  PIT_HALF_W,
  PIT_NODE_COUNT,
  PIT_RADIUS,
  type PureOreHitResult,
  resolveWorldIdFromPalette,
  spawnOrePitShards,
  stepOrePitMeteorDrop,
  stepOrePitShards,
  SWEET_SPOT_DMG_MULT,
  SWEET_SPOT_DURATION_SEC,
  SWEET_SPOT_MAX_PROGRESS,
  SWEET_SPOT_MIN_PROGRESS,
  type SweetSpotPitState,
  updateSweetSpotRingMesh,
  type OrePitShardParticle,
} from './OrePitStage3D';
export {
  applyNodeDamagePure,
  BASE_ORE_RESPAWN_SEC,
  computeMeteorDynamicHp,
  getGeodeGlowTexture,
  getSoftContactShadowTexture,
  isSweetSpotWindowPure,
  loadPublicSpriteTexture,
  METEOR_HP_MULT,
  OreBillboard2D,
  PIT_CENTER_Z,
  PIT_FLOOR_Y,
  PIT_HALF_D,
  PIT_HALF_W,
  PIT_NODE_COUNT,
  PIT_RADIUS,
  SWEET_SPOT_DMG_MULT,
  SWEET_SPOT_DURATION_SEC,
  SWEET_SPOT_MAX_PROGRESS,
  SWEET_SPOT_MIN_PROGRESS,
};
export type {
  DamageableOreState,
  OreAttackFxOptions,
  OreHitResult,
  PureOreHitResult,
  SweetSpotPitState,
};

const BASE_ORE_HP = 180;

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
  private readonly shardPool: OrePitShardParticle[] = [];
  private readonly shardFreeCrystal: THREE.Mesh[] = [];
  private readonly shardFreeRock: THREE.Mesh[] = [];
  private readonly impactFx = new AttackImpactFxController({ floorY: 0.045 });
  private readonly ownedGeos: THREE.BufferGeometry[] = [];
  private readonly ownedMats: THREE.Material[] = [];
  private readonly nodes: InternalOreNode[] = [];
  private readonly aliveNodesSnapshot: Array<{
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
  }> = [];

  private activePalette!: MineWorldPalette;
  private activeWorldId: WorldId = 'underground';
  private hoveredNodeId = -1;
  private respawnSpeedMult = 1;
  private activeNodeCount = PIT_NODE_COUNT;
  private hpScale = 1;
  private lowQuality = false;
  private meteorNode: InternalOreNode;
  private readonly meteorEntryGroup = new THREE.Group();
  private readonly meteorCoreMat: THREE.MeshBasicMaterial;
  private readonly meteorBowMat: THREE.MeshBasicMaterial;
  private readonly meteorTailOuterMat: THREE.MeshBasicMaterial;
  private readonly meteorTailOuterMesh: THREE.Mesh;
  private readonly meteorTailInnerMesh: THREE.Mesh;
  private readonly meteorTargetGroup = new THREE.Group();
  private readonly meteorTargetShadow: THREE.Mesh;
  private readonly meteorTargetShadowMat: THREE.MeshBasicMaterial;
  private readonly meteorTargetRing: THREE.Mesh;
  private readonly meteorTargetRingMat: THREE.MeshBasicMaterial;
  private readonly sweetSpotFloorRing: THREE.Mesh;
  private readonly sweetSpotFloorMat: THREE.MeshBasicMaterial;
  private sweetSpot: { nodeId: number; age: number; duration: number } | null = null;
  private sweetSpotCooldownSec = 4.5;
  private skillPulseTimer = 0;
  private skillPulsePeakIntensity = 1.05;
  private readonly skillPulseColor = new THREE.Color();
  private readonly paletteColorHelper = new THREE.Color();

  constructor(palette: MineWorldPalette) {
    this.activePalette = palette;
    this.group.position.set(0, PIT_FLOOR_Y, PIT_CENTER_Z);

    const envMeshes = buildOrePitEnvironmentMeshes({
      group: this.group,
      palette,
      ownedGeos: this.ownedGeos,
      ownedMats: this.ownedMats,
    });
    this.floorMat = envMeshes.floorMat;
    this.wallMat = envMeshes.wallMat;
    this.trimMat = envMeshes.trimMat;
    this.pitNeonMat = envMeshes.pitNeonMat;

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

    const spotFx = buildOrePitMeteorAndSpotFx({
      group: this.group,
      meteorRoot: this.meteorNode.root,
      meteorEntryGroup: this.meteorEntryGroup,
      meteorTargetGroup: this.meteorTargetGroup,
      ownedGeos: this.ownedGeos,
      ownedMats: this.ownedMats,
      meteorTargetX: METEOR_TARGET_X,
      meteorTargetZ: METEOR_TARGET_Z,
      meteorStartX: METEOR_START_X,
      meteorStartY: METEOR_START_Y,
      meteorStartZ: METEOR_START_Z,
    });
    this.meteorCoreMat = spotFx.meteorCoreMat;
    this.meteorBowMat = spotFx.meteorBowMat;
    this.meteorTailOuterMat = spotFx.meteorTailOuterMat;
    this.meteorTailOuterMesh = spotFx.meteorTailOuterMesh;
    this.meteorTailInnerMesh = spotFx.meteorTailInnerMesh;
    this.meteorTargetShadow = spotFx.meteorTargetShadow;
    this.meteorTargetShadowMat = spotFx.meteorTargetShadowMat;
    this.meteorTargetRing = spotFx.meteorTargetRing;
    this.meteorTargetRingMat = spotFx.meteorTargetRingMat;
    this.sweetSpotFloorRing = spotFx.sweetSpotFloorRing;
    this.sweetSpotFloorMat = spotFx.sweetSpotFloorMat;

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
    this.floorMat.map = getCircularNexusPoolTexture(palette.pitFloorColor, palette.crystalColor);
    this.floorMat.needsUpdate = true;
    this.wallMat.color.setHex(0x161f30);
    this.trimMat.map = getHazardStripeTexture(palette.crystalColor);
    this.trimMat.needsUpdate = true;
    this.pitNeonMat.color.copy(cColor);
    this.pitNeonMat.emissive.copy(cColor);
    this.pitNeonMat.emissiveIntensity = 1.05;
    this.skillPulseTimer = 0;
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
    if (this.sweetSpot?.nodeId === n.id) {
      this.clearSweetSpot();
    }
  }

  public hasAliveMeteor(): boolean {
    return this.meteorNode.alive;
  }

  private pickNonOverlappingSpot(excludeId: number): { x: number; z: number } {
    const maxR = Math.max(1.5, PIT_RADIUS - 1.05);
    const r0 = Math.sqrt(Math.random()) * maxR;
    const a0 = Math.random() * Math.PI * 2;
    let bestX = Math.cos(a0) * r0;
    let bestZ = Math.sin(a0) * r0;
    let bestMinDist = -1;
    const desiredMinDist = this.activeNodeCount > 14 ? 1.85 : 2.25;

    for (let attempt = 0; attempt < 28; attempt++) {
      const r = Math.sqrt(Math.random()) * maxR;
      const ang = Math.random() * Math.PI * 2;
      const cx = Math.cos(ang) * r;
      const cz = Math.sin(ang) * r;
      let minDist = 999;
      for (const other of this.nodes) {
        if (other.id === excludeId || other.id >= this.activeNodeCount) continue;
        const d = Math.hypot(cx - other.x, cz - other.z);
        if (d < minDist) minDist = d;
      }
      if (minDist >= desiredMinDist) return { x: cx, z: cz };
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

    const isPerfect = Boolean(attackFx?.isPerfect);
    const meteorCap = isPerfect ? 0.08 : 0.03;
    const effectiveDmg = node.isMeteor
      ? Math.min(dmg, Math.max(1, Math.ceil(node.maxHp * meteorCap)))
      : dmg;
    const pure = applyNodeDamagePure(node, effectiveDmg);
    if (!pure) return null;

    node.squashAmt = isPerfect ? 0.56 : heavy ? 0.46 : 0.34;
    node.recoilDirX =
      attackFx?.attackerX !== undefined
        ? Math.sign(node.x - attackFx.attackerX) || 1
        : Math.random() < 0.5
          ? 1
          : -1;
    node.recoilAmt = isPerfect ? 0.28 : heavy ? 0.24 : 0.16;
    node.flashTimer = isPerfect ? 0.14 : 0.09;
    const pitEventKind = node.pitEventKind;
    if (this.group.visible) {
      const eventColor = pitEventKind ? PIT_EVENT_DEFS[pitEventKind].colorHex : undefined;
      const fxAccent = isPerfect
        ? '#fde047'
        : eventColor ?? attackFx?.accentColor ?? (heavy ? '#fbbf24' : this.activePalette.crystalColor);
      const lowShardCount = pure.broken ? (node.isMeteor ? 5 : 3) : 1;
      const normalShardCount = pure.broken ? (node.isMeteor ? 16 : 9) : isPerfect ? 7 : shardCount;
      this.spawnShardsAt(
        node.x,
        node.z,
        this.lowQuality ? lowShardCount : normalShardCount,
        pure.broken || isPerfect,
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
      if (this.sweetSpot?.nodeId === node.id) {
        this.clearSweetSpot();
      }
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
      isPerfect,
    };
  }

  public getImpactFxCounts(): { slashes: number; hitsparks: number; streaks: number; shockwaves: number } {
    return this.impactFx.getActiveCounts();
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.impactFx.setLowQuality(low);
  }

  private spawnShardsAt(lx: number, lz: number, count: number, isShatter = false, isMeteor = false): void {
    spawnOrePitShards(lx, lz, count, isShatter, isMeteor, {
      group: this.group,
      shardPool: this.shardPool,
      shardFreeCrystal: this.shardFreeCrystal,
      shardFreeRock: this.shardFreeRock,
      shardMat: this.shardMat,
      rockChipMat: this.rockChipMat,
      sharedShardGeo: this.sharedShardGeo,
      sharedRockGeo: this.sharedRockGeo,
      maxCap: this.lowQuality ? 8 : 36,
    });
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
    const list = this.aliveNodesSnapshot;
    list.length = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (!n.alive) continue;
      list.push({
        id: n.id,
        worldX: n.x,
        worldY: PIT_FLOOR_Y,
        worldZ: PIT_CENTER_Z + n.z,
        hp: n.hp,
        maxHp: n.maxHp,
        variantKey: n.variant.key,
        pitEventKind: n.pitEventKind,
      });
    }
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

  public triggerSkillPulse(colorHex: string, strength = 1): void {
    this.skillPulseColor.set(colorHex);
    this.skillPulseTimer = 0.45;
    this.skillPulsePeakIntensity = 1.05 + Math.min(1.4, Math.max(0.4, strength) * 1.15);
    this.pitNeonMat.color.copy(this.skillPulseColor);
    this.pitNeonMat.emissive.copy(this.skillPulseColor);
    this.pitNeonMat.emissiveIntensity = this.skillPulsePeakIntensity;
  }

  public setRespawnSpeedMult(mult: number): void {
    this.respawnSpeedMult = Math.max(0.5, mult);
  }

  public update(dtSec: number, elapsed: number, camera?: THREE.Camera, renderVisuals = true): void {
    const nodeCount = this.nodes.length + (this.meteorNode.alive ? 1 : 0);
    for (let idx = 0; idx < nodeCount; idx++) {
      const node = idx < this.nodes.length ? this.nodes[idx] : this.meteorNode;
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
        const dropRes = stepOrePitMeteorDrop({
          node,
          dtSec,
          elapsed,
          camera,
          dropDuration: METEOR_DROP_DURATION,
          startX: METEOR_START_X,
          startY: METEOR_START_Y,
          startZ: METEOR_START_Z,
          targetX: METEOR_TARGET_X,
          targetZ: METEOR_TARGET_Z,
          meteorEntryGroup: this.meteorEntryGroup,
          meteorTargetGroup: this.meteorTargetGroup,
          meteorTailOuterMesh: this.meteorTailOuterMesh,
          meteorTailInnerMesh: this.meteorTailInnerMesh,
          meteorTargetShadow: this.meteorTargetShadow,
          meteorTargetShadowMat: this.meteorTargetShadowMat,
          meteorTargetRing: this.meteorTargetRing,
          meteorTargetRingMat: this.meteorTargetRingMat,
          group: this.group,
          impactFx: this.impactFx,
          spawnShardsAt: (lx, lz, count, s, m) => this.spawnShardsAt(lx, lz, count, s, m),
          onMeteorLanded: this.onMeteorLanded,
        });
        meteorRoll = dropRes.meteorRoll;
        meteorStretchY = dropRes.meteorStretchY;
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

      const flashing = node.flashTimer > 0;
      if (flashing) {
        node.flashTimer -= dtSec;
      }

      if (renderVisuals) {
        const hoverMult = (node.id === this.hoveredNodeId ? 1.1 : 1.0) * node.spawnScale;
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
    }

    if (renderVisuals) {
      if (this.skillPulseTimer > 0) {
        this.skillPulseTimer = Math.max(0, this.skillPulseTimer - Math.min(dtSec, 0.1));
        const t = this.skillPulseTimer / 0.45;
        this.paletteColorHelper.set(this.activePalette.crystalColor);
        this.pitNeonMat.color.copy(this.paletteColorHelper).lerp(this.skillPulseColor, t);
        this.pitNeonMat.emissive.copy(this.pitNeonMat.color);
        this.pitNeonMat.emissiveIntensity = 1.05 + (this.skillPulsePeakIntensity - 1.05) * t;
      }
      stepOrePitShards(dtSec, {
        group: this.group,
        shardPool: this.shardPool,
        shardFreeCrystal: this.shardFreeCrystal,
        shardFreeRock: this.shardFreeRock,
        shardMat: this.shardMat,
      });
      this.impactFx.update(dtSec, camera);
      this.stepSweetSpot(dtSec, elapsed);
    }
  }

  private findNodeById(nodeId: number): InternalOreNode | undefined {
    return nodeId === this.meteorNode.id ? this.meteorNode : this.nodes.find((n) => n.id === nodeId);
  }

  public spawnSweetSpot(targetNodeId?: number, durationSec = SWEET_SPOT_DURATION_SEC): boolean {
    if (this.sweetSpot) return false;
    let picked: InternalOreNode | undefined;
    if (targetNodeId !== undefined) {
      const candidate = this.findNodeById(targetNodeId);
      if (candidate && candidate.alive && (!candidate.isMeteor || (candidate.dropProgress ?? 1) >= 1)) {
        picked = candidate;
      }
    } else if (this.meteorNode.alive && (this.meteorNode.dropProgress ?? 1) >= 1) {
      picked = this.meteorNode;
    } else {
      const alive = this.nodes.filter((n) => n.id < this.activeNodeCount && n.alive);
      if (alive.length > 0) {
        picked = alive[Math.floor(Math.random() * alive.length)];
      }
    }
    if (!picked) return false;
    this.sweetSpot = { nodeId: picked.id, age: 0, duration: Math.max(0.8, durationSec) };
    return true;
  }

  public clearSweetSpot(): void {
    this.sweetSpot = null;
    this.sweetSpotFloorRing.visible = false;
    this.sweetSpotCooldownSec = 6.0 + Math.random() * 4.0;
  }

  public consumeSweetSpotTap(nodeId: number): boolean {
    if (!this.sweetSpot || this.sweetSpot.nodeId !== nodeId) return false;
    const progress = this.sweetSpot.age / this.sweetSpot.duration;
    if (!isSweetSpotWindowPure(progress)) return false;
    this.clearSweetSpot();
    return true;
  }

  public getSweetSpotState(): SweetSpotPitState | null {
    if (!this.sweetSpot) return null;
    const node = this.findNodeById(this.sweetSpot.nodeId);
    if (!node || !node.alive) {
      this.clearSweetSpot();
      return null;
    }
    const progress = Math.max(0, Math.min(1, this.sweetSpot.age / this.sweetSpot.duration));
    return {
      nodeId: node.id,
      progress,
      inWindow: isSweetSpotWindowPure(progress),
      worldX: node.x,
      worldY: PIT_FLOOR_Y + (node.dropY ?? 0),
      worldZ: PIT_CENTER_Z + node.z,
      isMeteor: Boolean(node.isMeteor),
    };
  }

  private stepSweetSpot(dtSec: number, elapsed: number): void {
    if (this.sweetSpot) {
      const node = this.findNodeById(this.sweetSpot.nodeId);
      if (!node || !node.alive) {
        this.clearSweetSpot();
        return;
      }
      this.sweetSpot.age += dtSec;
      if (this.sweetSpot.age >= this.sweetSpot.duration) {
        this.clearSweetSpot();
        return;
      }
      const progress = this.sweetSpot.age / this.sweetSpot.duration;
      const inWindow = isSweetSpotWindowPure(progress);
      updateSweetSpotRingMesh({
        ring: this.sweetSpotFloorRing,
        mat: this.sweetSpotFloorMat,
        x: node.x,
        z: node.z,
        isMeteor: Boolean(node.isMeteor),
        progress,
        inWindow,
        elapsed,
      });
      return;
    }

    this.sweetSpotFloorRing.visible = false;
    this.sweetSpotCooldownSec -= dtSec;
    if (this.sweetSpotCooldownSec <= 0) {
      if (!this.spawnSweetSpot()) {
        this.sweetSpotCooldownSec = 2.0;
      }
    }
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
