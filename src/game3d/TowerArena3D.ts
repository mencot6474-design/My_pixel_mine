import * as THREE from 'three';
import { TOWER_BOSS_SWEETSPOT_DURATION_SEC, TowerWaveOreState } from '../game/TowerData';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { ChibiDef } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { ChibiFieldFxController } from './FieldMiner3D';
import { OreVariantKey } from './MineWorldPalette';
import { getGeodeGlowTexture, isSweetSpotWindowPure, OreBillboard2D } from './OrePit3D';
import { getPedestalHoloRingTexture } from './PlotPedestal3D';
import { createSeraphimBoss3D, SeraphimBossHandle } from './SeraphimBoss3D';
import { createTowerCityEnvironment, TowerCityEnvironmentHandle } from './TowerCityEnvironment3D';

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

interface BossGravityRockSeed {
  radius: number;
  angle: number;
  speed: number;
  baseY: number;
  scale: [number, number, number];
  rotSpeedX: number;
  rotSpeedY: number;
  phase: number;
}

interface BossHaloArcHandle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  phase: number;
  period: number;
}

interface TowerWaveRockSlot {
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

interface TowerChibiFighter {
  slotIndex: number;
  sprite: ChibiSprite3D;
  fx: ChibiFieldFxController;
  spawnPos: THREE.Vector3;
  attackPos: THREE.Vector3;
  targetOreIndex: number;
  dmg: number;
  walkSpeed: number;
  attackInterval: number;
  attackCooldown: number;
  comboStep: number;
  lungeTimer: number;
  enchantId: string | null;
  colorHex: string;
}

const ARENA_CENTER_Z = -1.6;
const BOSS_CENTER_Z = ARENA_CENTER_Z - 1.35;
const SUMMON_RADIUS = 6.3;
const ATTACK_RADIUS = 2.65;

const WAVE_ORE_POSITIONS: ReadonlyArray<[number, number]> = [
  [-3.7, ARENA_CENTER_Z + 1.55],
  [3.7, ARENA_CENTER_Z + 1.55],
  [-4.25, ARENA_CENTER_Z - 1.35],
  [4.25, ARENA_CENTER_Z - 1.35],
  [0, ARENA_CENTER_Z - 2.35],
];

function createBossLightningArcGeometry(
  start: THREE.Vector3,
  end: THREE.Vector3,
  seed: number
): THREE.BufferGeometry {
  const segs = 5;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = new THREE.Vector3().lerpVectors(start, end, t);
    if (i > 0 && i < segs) {
      const env = Math.sin(t * Math.PI);
      const jx = ((((seed * (i + 2) * 19) % 15) - 7) / 7) * 0.24 * env;
      const jy = ((((seed * (i + 5) * 23) % 15) - 7) / 7) * 0.24 * env;
      p.x += jx;
      p.y += jy;
    }
    pts.push(p);
  }

  const verts: number[] = [];
  const halfW = 0.032;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const perp = new THREE.Vector3(-(b.y - a.y), b.x - a.x, 0).normalize().multiplyScalar(halfW * (1 - (i / pts.length) * 0.35));
    verts.push(
      a.x + perp.x, a.y + perp.y, a.z,
      b.x + perp.x, b.y + perp.y, b.z,
      a.x - perp.x, a.y - perp.y, a.z,

      a.x - perp.x, a.y - perp.y, a.z,
      b.x + perp.x, b.y + perp.y, b.z,
      b.x - perp.x, b.y - perp.y, b.z
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

function createEclipseCoronaGlowTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(128, 128, 28, 128, 128, 126);
  grad.addColorStop(0.0, 'rgba(34, 211, 238, 0.92)');
  grad.addColorStop(0.32, 'rgba(56, 189, 248, 0.55)');
  grad.addColorStop(0.64, 'rgba(217, 70, 239, 0.24)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Segmented holographic HUD reticle ring
  ctx.strokeStyle = 'rgba(165, 243, 252, 0.75)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2 + 0.06;
    const a1 = ((i + 0.65) / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(128, 128, 92, a0, a1);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class TowerArena3D {
  public readonly group = new THREE.Group();
  public readonly clickables: THREE.Object3D[] = [];

  private readonly cityEnv: TowerCityEnvironmentHandle;
  private readonly monolithGroup = new THREE.Group();
  private readonly bossModel: SeraphimBossHandle;
  private readonly bossArcs: BossHaloArcHandle[] = [];
  private readonly bossFeetFxGroup = new THREE.Group();
  private readonly bossGravityRocksInst: THREE.InstancedMesh;
  private readonly bossGravityRockSeeds: BossGravityRockSeed[] = [];
  private readonly bossGravityDummy = new THREE.Object3D();
  private readonly bossFloorPulseMesh: THREE.Mesh;
  private readonly bossFloorPulseMat: THREE.MeshBasicMaterial;
  private readonly hitMesh: THREE.Mesh;

  private readonly waveOresGroup = new THREE.Group();
  private readonly waveRocks: TowerWaveRockSlot[] = [];

  private readonly eclipseCoronaRing: THREE.Mesh;
  private readonly eclipseOuterHalo: THREE.Mesh;
  private readonly eclipseCoronaMat: THREE.MeshBasicMaterial;
  private readonly eclipseHaloMat: THREE.MeshBasicMaterial;
  private readonly aiWireframeSphere: THREE.Mesh;
  private readonly aiGyroRing1: THREE.Mesh;
  private readonly aiGyroRing2: THREE.Mesh;
  private readonly summonPads: THREE.Mesh[] = [];
  private readonly ownedTextures: THREE.Texture[] = [];

  private readonly fightersGroup = new THREE.Group();
  private readonly fighters = new Map<number, TowerChibiFighter>();
  private readonly impactFx = new AttackImpactFxController({ floorY: 0.11 });
  private readonly shardGroup = new THREE.Group();
  private readonly sharedShardGeo = new THREE.OctahedronGeometry(0.14, 0);
  private readonly sharedRockGeo = new THREE.DodecahedronGeometry(0.125, 0);
  private readonly rockChipMat = new THREE.MeshStandardMaterial({
    color: '#2c364d',
    emissive: '#0f172a',
    emissiveIntensity: 0.22,
    roughness: 0.78,
    metalness: 0.18,
    flatShading: true,
  });
  private readonly shardPool: Array<{
    mesh: THREE.Mesh;
    ownsMat: boolean;
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
  }> = [];
  private fighterConfigs: TowerFighterConfig[] = [];

  private bounceTimer = 0;
  private bossMode = true;
  private bossWave = true;
  private bossShieldActive = false;
  private bossSweetSpot = { elapsed: 0, cooldown: 0.15, active: false };
  private paused = false;
  private anomalyColorHex = '#38bdf8';
  private lastFloor = 0;
  private lastWave = 0;
  private activeMiners = 0;

  constructor() {
    this.group.visible = false;

    // 1. Ruined Cyber City Highway, Central Meteor Crater, & Skyscraper Horizon
    this.cityEnv = createTowerCityEnvironment();
    this.group.add(this.cityEnv.group);

    // 2. Colossal Holographic AI Mainframe Core Hovering Above the Vanishing Cyber Highway
    const eclipseGroup = new THREE.Group();
    eclipseGroup.position.set(0, 7.6, -42);

    const coronaGlowTex = createEclipseCoronaGlowTexture();
    if (coronaGlowTex) this.ownedTextures.push(coronaGlowTex);
    this.eclipseHaloMat = new THREE.MeshBasicMaterial({
      ...(coronaGlowTex ? { map: coronaGlowTex } : {}),
      color: 0x06b6d4,
      transparent: true,
      opacity: coronaGlowTex ? 0.85 : 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.eclipseOuterHalo = new THREE.Mesh(
      coronaGlowTex ? new THREE.PlaneGeometry(17.5, 17.5) : new THREE.RingGeometry(3.2, 6.4, 64),
      this.eclipseHaloMat
    );
    this.eclipseOuterHalo.position.z = -0.1;

    this.eclipseCoronaMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.eclipseCoronaRing = new THREE.Mesh(new THREE.RingGeometry(3.15, 3.72, 48), this.eclipseCoronaMat);

    // Dark obsidian inner AI kernel sphere
    const aiCoreSphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.65, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x020617, fog: false })
    );

    // Rotating 3D Geodesic Wireframe AI Hologram Shell
    this.aiWireframeSphere = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.12, 2),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
        fog: false,
      })
    );

    // Counter-rotating cyber-gyroscope data rings around the AI Core
    this.aiGyroRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.065, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0xe879f9,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    this.aiGyroRing1.rotation.x = 0.42;

    this.aiGyroRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(4.75, 0.05, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    this.aiGyroRing2.rotation.y = 0.55;

    eclipseGroup.add(
      this.eclipseOuterHalo,
      aiCoreSphere,
      this.aiWireframeSphere,
      this.eclipseCoronaRing,
      this.aiGyroRing1,
      this.aiGyroRing2
    );
    this.group.add(eclipseGroup);

    // 3. Five Front-Arc Chibi Summoning Runes (Feathered Holo Rings Flush on Highway Crater Floor y = 0.08)
    const summonHoloTex = getPedestalHoloRingTexture();
    for (let i = 0; i < 5; i++) {
      const sp = this.getSpawnPos(i);
      const pad = new THREE.Mesh(
        summonHoloTex ? new THREE.PlaneGeometry(1.48, 1.48) : new THREE.RingGeometry(0.46, 0.68, 20),
        new THREE.MeshBasicMaterial({
          ...(summonHoloTex ? { map: summonHoloTex } : {}),
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(sp.x, 0.095, sp.z);
      this.group.add(pad);
      this.summonPads.push(pad);
    }

    // 4. Central Full-3D Procedural "Corrupted Seraphim AI Overlord" Boss (Slightly behind Crater Center so chibis & damage numbers stay clear)
    this.bossModel = createSeraphimBoss3D({ scale: 1.02 });
    this.monolithGroup.add(this.bossModel.group);
    this.monolithGroup.position.set(0, 0.08, BOSS_CENTER_Z);
    this.group.add(this.monolithGroup);

    // 4b. Crater Floor Boss Feet Aura: Contact Shadow, Dim Red-Orange Shockwave, Anti-Gravity Rocks & Ground-to-Body Sparks
    this.bossFeetFxGroup.position.set(0, 0.08, BOSS_CENTER_Z);
    this.group.add(this.bossFeetFxGroup);

    const bossShadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.18, 24),
      new THREE.MeshBasicMaterial({
        color: 0x020306,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    );
    bossShadowMesh.rotation.x = -Math.PI / 2;
    bossShadowMesh.position.y = 0.008;
    this.bossFeetFxGroup.add(bossShadowMesh);

    this.bossFloorPulseMat = new THREE.MeshBasicMaterial({
      color: 0xea580c,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.bossFloorPulseMesh = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.82, 36), this.bossFloorPulseMat);
    this.bossFloorPulseMesh.rotation.x = -Math.PI / 2;
    this.bossFloorPulseMesh.position.y = 0.014;
    this.bossFeetFxGroup.add(this.bossFloorPulseMesh);

    const GRAVITY_ROCK_COUNT = 9;
    const gravRockGeo = new THREE.DodecahedronGeometry(1.0, 0);
    const gravRockMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e2a,
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
    });
    this.bossGravityRocksInst = new THREE.InstancedMesh(gravRockGeo, gravRockMat, GRAVITY_ROCK_COUNT);
    this.bossGravityRocksInst.castShadow = true;
    this.bossGravityRocksInst.receiveShadow = true;
    for (let i = 0; i < GRAVITY_ROCK_COUNT; i++) {
      this.bossGravityRockSeeds.push({
        radius: 1.45 + (i % 3) * 0.34,
        angle: (i / GRAVITY_ROCK_COUNT) * Math.PI * 2,
        speed: 0.28 + (i % 3) * 0.07,
        baseY: 0.2 + (i % 4) * 0.09,
        scale: [0.15 + (i % 3) * 0.03, 0.11 + (i % 2) * 0.03, 0.13 + ((i + 1) % 3) * 0.03],
        rotSpeedX: 0.7 + (i % 3) * 0.25,
        rotSpeedY: 0.8 + (i % 2) * 0.35,
        phase: i * 0.9,
      });
    }
    this.bossFeetFxGroup.add(this.bossGravityRocksInst);

    // Asymmetrical Short Lightning Arcs Crackling Between Crater Floor Fissures & Elevated Lower Boss Body
    const groundArcSpecs: [THREE.Vector3, THREE.Vector3, number][] = [
      [new THREE.Vector3(-1.35, 0.02, 0.25), new THREE.Vector3(-0.48, 1.08, 0.04), 13],
      [new THREE.Vector3(1.42, 0.02, 0.18), new THREE.Vector3(0.52, 1.2, 0.04), 29],
      [new THREE.Vector3(-0.88, 0.02, -0.55), new THREE.Vector3(-0.36, 1.46, -0.05), 41],
      [new THREE.Vector3(1.05, 0.02, -0.48), new THREE.Vector3(0.42, 0.98, 0.02), 59],
      [new THREE.Vector3(-0.22, 0.02, 0.85), new THREE.Vector3(0.16, 0.94, 0.08), 73],
    ];
    groundArcSpecs.forEach(([p0, p1, seed], idx) => {
      const arcMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0xfb923c : 0xfde68a,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const arcMesh = new THREE.Mesh(createBossLightningArcGeometry(p0, p1, seed), arcMat);
      arcMesh.visible = false;
      this.bossFeetFxGroup.add(arcMesh);
      this.bossArcs.push({
        mesh: arcMesh,
        mat: arcMat,
        phase: idx * 0.74,
        period: 1.35 + (idx % 3) * 0.55,
      });
    });

    // 5. Five Wave Ore Rock Slots (active on Waves 1..9)
    this.group.add(this.waveOresGroup);
    for (let i = 0; i < WAVE_ORE_POSITIONS.length; i++) {
      const slot = this.createWaveOreSlot(i);
      this.waveRocks.push(slot);
      this.waveOresGroup.add(slot.root);
      this.clickables.push(slot.hitMesh);
    }

    // 6. Animated Chibi Fighters & Unified Cyber-Anime Impact VFX Layers
    this.group.add(this.fightersGroup);
    this.sharedShardGeo.scale(0.75, 1.45, 0.75);
    this.group.add(this.impactFx.group);
    this.group.add(this.shardGroup);

    // 7. Boss Monolith Raycast Hitbox (keep at index 0 of clickables)
    this.hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 2.7, 5.4, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    this.hitMesh.position.set(0, 3.15, BOSS_CENTER_Z);
    this.hitMesh.userData = { kind: 'tower-core' };
    this.group.add(this.hitMesh);
    this.clickables.unshift(this.hitMesh);
  }

  private createWaveOreSlot(index: number): TowerWaveRockSlot {
    const [x, z] = WAVE_ORE_POSITIONS[index];
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

  public getActiveClickables(): THREE.Object3D[] {
    if (this.bossWave) {
      return this.hitMesh.visible ? [this.hitMesh] : [];
    }
    return this.waveRocks.filter((r) => r.alive && r.hitMesh.visible).map((r) => r.hitMesh);
  }

  public getOreWorldPos(oreIndex: number): THREE.Vector3 {
    const rock = this.waveRocks[oreIndex];
    if (!rock) return this.getMonolithWorldPos();
    return new THREE.Vector3(rock.x, 1.05, rock.z);
  }

  private getSpawnPos(slotIndex: number): THREE.Vector3 {
    const ang = (0.17 + (slotIndex / 4) * 0.66) * Math.PI;
    return new THREE.Vector3(
      Math.cos(ang) * SUMMON_RADIUS,
      0.08,
      ARENA_CENTER_Z + Math.sin(ang) * SUMMON_RADIUS
    );
  }

  private getAttackPos(slotIndex: number): THREE.Vector3 {
    const ang = (0.14 + (slotIndex / 4) * 0.72) * Math.PI;
    return new THREE.Vector3(
      Math.cos(ang) * ATTACK_RADIUS,
      0.08,
      ARENA_CENTER_Z + Math.sin(ang) * ATTACK_RADIUS
    );
  }

  public syncFighters(configs: TowerFighterConfig[]): void {
    this.fighterConfigs = configs;
    const incoming = new Map(configs.map((c) => [c.slotIndex, c]));

    for (const [slot, f] of this.fighters.entries()) {
      if (!incoming.has(slot)) {
        f.fx.dispose();
        this.fightersGroup.remove(f.sprite.group);
        f.sprite.dispose();
        this.fighters.delete(slot);
      }
    }

    for (const cfg of configs) {
      let existing = this.fighters.get(cfg.slotIndex);
      if (existing && existing.sprite.group.userData?.chibiId !== cfg.def.id) {
        existing.fx.dispose();
        this.fightersGroup.remove(existing.sprite.group);
        existing.sprite.dispose();
        this.fighters.delete(cfg.slotIndex);
        existing = undefined;
      }

      if (!existing) {
        const sprite = new ChibiSprite3D(cfg.def, 1.92, cfg.slotIndex * 0.9);
        sprite.group.userData = { chibiId: cfg.def.id };
        const spawnPos = this.getSpawnPos(cfg.slotIndex);
        const attackPos = this.getAttackPos(cfg.slotIndex);
        sprite.group.position.copy(spawnPos);
        sprite.setAnimState('dash');
        sprite.setFacing(spawnPos.x <= 0 ? 1 : -1);
        sprite.setAccentColor(cfg.def.accentColor);
        this.fightersGroup.add(sprite.group);
        const fx = new ChibiFieldFxController(sprite.group, cfg.def.accentColor, cfg.slotIndex);

        existing = {
          slotIndex: cfg.slotIndex,
          sprite,
          fx,
          spawnPos,
          attackPos,
          targetOreIndex: -1,
          dmg: cfg.dmg,
          walkSpeed: 4.1 + Math.max(0, cfg.speed - 10) * 0.14,
          attackInterval: Math.max(0.32, 0.85 / Math.max(1, cfg.miningMult)),
          attackCooldown: 0.14 + cfg.slotIndex * 0.08,
          comboStep: 0,
          lungeTimer: 0,
          enchantId: null,
          colorHex: cfg.def.accentColor,
        };
        this.fighters.set(cfg.slotIndex, existing);
      } else {
        existing.dmg = Math.max(1, cfg.dmg);
        existing.walkSpeed = 4.1 + Math.max(0, cfg.speed - 10) * 0.14;
        existing.attackInterval = Math.max(0.32, 0.85 / Math.max(1, cfg.miningMult));
      }

      this.applyFighterEnchant(existing, cfg.enchantId);
    }

    for (let i = 0; i < this.summonPads.length; i++) {
      const mat = this.summonPads[i].material as THREE.MeshBasicMaterial;
      const active = this.fighters.has(i);
      mat.opacity = active ? 0.34 : 0.12;
    }
  }

  private applyFighterEnchant(f: TowerChibiFighter, enchantId: string | null): void {
    if (f.enchantId !== enchantId) {
      f.enchantId = enchantId;
      f.fx.setEnchant(enchantId);
    }
    f.colorHex = f.fx.getAccentColor();
    f.sprite.setAccentColor(f.colorHex);
  }

  public resetFloorCharge(): void {
    for (const f of this.fighters.values()) {
      f.sprite.group.position.copy(f.spawnPos);
      f.sprite.setAnimState('dash');
      f.sprite.setFacing(f.spawnPos.x <= 0 ? 1 : -1);
      f.targetOreIndex = -1;
      f.attackCooldown = 0.12 + f.slotIndex * 0.08;
      f.lungeTimer = 0;
    }
  }

  public syncWaveState(opts: {
    floor: number;
    wave: number;
    isBossWave: boolean;
    isCheckpointFloor: boolean;
    waveOres: readonly TowerWaveOreState[];
    anomalyColorHex: string;
    equippedMinerCount: number;
    paused: boolean;
    bossShieldActive?: boolean;
  }): void {
    const floorChanged = opts.floor !== this.lastFloor;
    const waveChanged = opts.wave !== this.lastWave;

    this.bossWave = opts.isBossWave;
    this.bossMode = opts.isBossWave || opts.isCheckpointFloor;
    this.anomalyColorHex = opts.anomalyColorHex;
    this.paused = opts.paused;
    this.activeMiners = Math.max(0, Math.min(5, opts.equippedMinerCount));
    this.setBossShieldActive(Boolean(opts.bossShieldActive && opts.isBossWave && !opts.paused), floorChanged || waveChanged);

    if (floorChanged || waveChanged) {
      this.lastFloor = opts.floor;
      this.lastWave = opts.wave;
      if (!opts.paused) {
        if (floorChanged || opts.isBossWave) {
          this.resetFloorCharge();
        } else {
          for (const f of this.fighters.values()) {
            f.targetOreIndex = -1;
            f.lungeTimer = 0;
          }
        }
      }
    }

    this.monolithGroup.visible = opts.isBossWave;
    this.bossFeetFxGroup.visible = opts.isBossWave;
    this.hitMesh.visible = opts.isBossWave;

    this.waveOresGroup.visible = !opts.isBossWave;
    for (let i = 0; i < this.waveRocks.length; i++) {
      const slot = this.waveRocks[i];
      const state = !opts.isBossWave ? opts.waveOres.find((o) => o.index === i) : undefined;
      if (!state || !state.alive) {
        slot.alive = false;
        slot.hp = 0;
        slot.root.visible = false;
        slot.hitMesh.visible = false;
        continue;
      }

      const newlySpawned = !slot.alive || floorChanged || waveChanged;
      slot.alive = true;
      slot.hp = state.hp;
      slot.maxHp = state.maxHp;
      slot.name = state.name;
      slot.color = state.color;
      slot.variantKey = state.variantKey;
      slot.root.visible = true;
      slot.hitMesh.visible = true;

      const baseSize = state.variantKey === 'geode' ? 2.02 : state.variantKey === 'vein' ? 1.7 : 1.44;
      slot.oreSprite.setOre(state.oreId, baseSize);
      slot.oreSprite.setCollarAccent(state.color);
      slot.ringMat.color.set(state.color);

      if (newlySpawned) {
        slot.spawnScale = 0.12;
        slot.squashAmt = 0.24;
        slot.recoilAmt = 0;
        slot.recoilDirX = 1;
      }
    }

    this.cityEnv.setBossState(opts.isBossWave, this.bossMode, opts.anomalyColorHex);
    this.eclipseCoronaMat.color.set(opts.isBossWave ? '#ef4444' : '#22d3ee');
    this.eclipseHaloMat.color.set(opts.isBossWave ? '#f43f5e' : opts.anomalyColorHex);
    (this.aiWireframeSphere.material as THREE.MeshBasicMaterial).color.set(
      opts.isBossWave ? '#f43f5e' : '#22d3ee'
    );

    if (opts.paused) {
      for (const f of this.fighters.values()) {
        f.sprite.setAnimState('aura');
      }
    }
  }

  public setFloorVisual(
    isBoss: boolean,
    anomalyColorHex: string,
    equippedMinerCount: number,
    floorNumber = 1,
    paused = false
  ): void {
    this.syncWaveState({
      floor: floorNumber,
      wave: isBoss ? 10 : 1,
      isBossWave: true,
      isCheckpointFloor: isBoss,
      waveOres: [],
      anomalyColorHex,
      equippedMinerCount,
      paused,
    });
  }

  private spawnTowerShardsAt(
    lx: number,
    ly: number,
    lz: number,
    colorHex: string,
    count: number,
    isShatter = false,
    isBoss = false
  ): void {
    const maxCap = 64;
    for (let i = 0; i < count; i++) {
      if (this.shardPool.length >= maxCap) {
        const oldest = this.shardPool.shift();
        if (oldest) {
          this.shardGroup.remove(oldest.mesh);
          if (oldest.ownsMat) (oldest.mesh.material as THREE.Material).dispose();
        }
      }
      const isCrystal = isBoss ? i % 4 !== 3 : isShatter ? i % 3 !== 2 : i % 2 === 0;
      const mat = isCrystal
        ? new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 0.82,
            roughness: 0.22,
            metalness: 0.35,
            flatShading: true,
          })
        : this.rockChipMat;
      const mesh = new THREE.Mesh(isCrystal ? this.sharedShardGeo : this.sharedRockGeo, mat);
      mesh.position.set(
        lx + (Math.random() - 0.5) * (isShatter ? 0.85 : 0.55),
        ly + (Math.random() - 0.3) * (isShatter ? 0.75 : 0.45),
        lz + (Math.random() - 0.5) * (isShatter ? 0.85 : 0.55)
      );
      const ang = Math.random() * Math.PI * 2;
      const spd = (isShatter ? 3.0 : 2.0) + Math.random() * (isShatter ? 4.4 : 2.8);
      const baseScale = (isShatter ? 0.9 : 0.68) + Math.random() * (isShatter ? 0.65 : 0.42);
      mesh.scale.setScalar(baseScale);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.shardGroup.add(mesh);
      this.shardPool.push({
        mesh,
        ownsMat: isCrystal,
        vx: Math.cos(ang) * spd,
        vy: (isShatter ? 3.6 : 2.5) + Math.random() * (isShatter ? 3.8 : 2.5),
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

  public setBossShieldActive(active: boolean, resetCycle = false): void {
    const next = Boolean(active && this.bossWave && !this.paused);
    if (resetCycle || (!this.bossShieldActive && next)) {
      this.bossSweetSpot.active = next;
      this.bossSweetSpot.elapsed = 0;
      this.bossSweetSpot.cooldown = 0.12;
    } else if (!next) {
      this.bossSweetSpot.active = false;
    }
    this.bossShieldActive = next;
  }

  public getBossSweetSpotState(): {
    worldX: number;
    worldY: number;
    worldZ: number;
    progress: number;
    inWindow: boolean;
  } | null {
    if (!this.bossWave || !this.bossShieldActive || !this.bossSweetSpot.active || this.paused) {
      return null;
    }
    const progress = Math.min(1, Math.max(0, this.bossSweetSpot.elapsed / TOWER_BOSS_SWEETSPOT_DURATION_SEC));
    return {
      worldX: 0,
      worldY: 2.55,
      worldZ: BOSS_CENTER_Z + 0.85,
      progress,
      inWindow: isSweetSpotWindowPure(progress),
    };
  }

  public consumeBossSweetSpotTap(): boolean {
    const state = this.getBossSweetSpotState();
    if (!state || !state.inWindow) return false;
    this.bossSweetSpot.active = false;
    this.bossSweetSpot.elapsed = 0;
    this.bossSweetSpot.cooldown = 0.25;
    return true;
  }

  public triggerBossShieldBreakFx(): void {
    this.bounceTimer = Math.max(this.bounceTimer, 0.34);
    const tz = BOSS_CENTER_Z + 1.05;
    this.impactFx.spawnImpact({
      targetX: 0,
      targetY: 2.65,
      targetZ: tz,
      accentColor: '#22d3ee',
      heavy: true,
      comboStep: 2,
      shockwaveScale: 2.35,
    });
    this.spawnTowerShardsAt(0, 2.45, tz, '#38bdf8', 14, true, true);
  }

  public triggerHitBounce(intensity = 0.24, spawnSlash = true): void {
    this.bounceTimer = Math.max(this.bounceTimer, intensity);
    if (spawnSlash) {
      const slashColor = this.bossMode ? '#facc15' : this.anomalyColorHex;
      const tx = (Math.random() - 0.5) * 0.45;
      const tz = BOSS_CENTER_Z + 1.05;
      this.impactFx.spawnImpact({
        targetX: tx,
        targetY: 2.65,
        targetZ: tz,
        accentColor: slashColor,
        heavy: true,
        comboStep: 2,
        shockwaveScale: 1.65,
      });
      this.spawnTowerShardsAt(tx, 2.35, tz, slashColor, 7, false, true);
    }
  }

  public triggerOreHitBounce(
    oreIndex: number,
    broken = false,
    attackFx?: { accentColor?: string; comboStep?: number; attackerX?: number; attackerZ?: number }
  ): void {
    const rock = this.waveRocks[oreIndex];
    if (!rock) return;
    rock.squashAmt = broken ? 0.46 : 0.36;
    rock.recoilDirX =
      attackFx?.attackerX !== undefined
        ? Math.sign(rock.x - attackFx.attackerX) || 1
        : Math.random() < 0.5
          ? 1
          : -1;
    rock.recoilAmt = broken ? 0.24 : 0.16;
    rock.flashTimer = 0.09;
    this.spawnTowerShardsAt(rock.x, 0.85, rock.z, rock.color, broken ? 18 : 5, broken, false);
    if (broken) {
      this.impactFx.spawnShatter({
        targetX: rock.x,
        targetY: 1.05,
        targetZ: rock.z,
        oreColor: rock.color,
        secondaryColor: attackFx?.accentColor ?? '#fde047',
      });
    } else {
      this.impactFx.spawnImpact({
        targetX: rock.x,
        targetY: 1.05,
        targetZ: rock.z,
        accentColor: attackFx?.accentColor ?? rock.color,
        heavy: false,
        comboStep: attackFx?.comboStep,
        attackerX: attackFx?.attackerX,
        attackerZ: attackFx?.attackerZ,
      });
    }
  }

  public getMonolithWorldPos(): THREE.Vector3 {
    return new THREE.Vector3(0, 2.85, BOSS_CENTER_Z);
  }

  public getConfiguredFighterCount(): number {
    return this.fighterConfigs.length || this.activeMiners;
  }

  public getAliveOreScreenBars(
    camera: THREE.Camera,
    width: number,
    height: number,
    projVec: THREE.Vector3
  ): TowerOreBarScreen[] {
    if (this.bossWave || !this.group.visible) return [];
    const bars: TowerOreBarScreen[] = [];
    for (const rock of this.waveRocks) {
      if (!rock.alive) continue;
      projVec.set(rock.x, 1.85, rock.z).project(camera);
      if (projVec.z <= -1 || projVec.z >= 1) continue;
      bars.push({
        index: rock.index,
        name: rock.name,
        color: rock.color,
        x: (projVec.x * 0.5 + 0.5) * width,
        y: (-projVec.y * 0.5 + 0.5) * height,
        hp: rock.hp,
        maxHp: rock.maxHp,
        variantKey: rock.variantKey,
      });
    }
    return bars;
  }

  private pickTargetOreForFighter(fighter: TowerChibiFighter): TowerWaveRockSlot | null {
    const aliveRocks = this.waveRocks.filter((r) => r.alive);
    if (aliveRocks.length === 0) return null;

    const existing = aliveRocks.find((r) => r.index === fighter.targetOreIndex);
    if (existing) return existing;

    // Count how many other fighters already target each alive rock so chibis spread out naturally
    const targetCounts = new Map<number, number>();
    for (const r of aliveRocks) targetCounts.set(r.index, 0);
    for (const other of this.fighters.values()) {
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

  public update(
    dt: number,
    elapsed: number,
    camera?: THREE.Camera,
    onFighterStrike?: (ev: TowerStrikeEvent) => void
  ): void {
    if (!this.group.visible) return;
    const safeDt = Math.min(Math.max(0, dt), 0.1);
    this.cityEnv.update(safeDt, elapsed);
    if (this.bounceTimer > 0) {
      this.bounceTimer = Math.max(0, this.bounceTimer - safeDt);
    }

    if (this.bossWave) {
      if (this.bossShieldActive && !this.paused) {
        if (this.bossSweetSpot.active) {
          this.bossSweetSpot.elapsed += safeDt;
          if (this.bossSweetSpot.elapsed >= TOWER_BOSS_SWEETSPOT_DURATION_SEC) {
            this.bossSweetSpot.active = false;
            this.bossSweetSpot.elapsed = 0;
            this.bossSweetSpot.cooldown = 0.2;
          }
        } else {
          this.bossSweetSpot.cooldown -= safeDt;
          if (this.bossSweetSpot.cooldown <= 0) {
            this.bossSweetSpot.active = true;
            this.bossSweetSpot.elapsed = 0;
          }
        }
      } else {
        this.bossSweetSpot.active = false;
      }

      const hitFactor = this.bounceTimer > 0 ? this.bounceTimer / 0.24 : 0;
      const pulse = 1 + hitFactor * 0.08;
      const bossScale = this.bossMode ? 1.08 : 1.0;
      this.monolithGroup.scale.setScalar(bossScale * pulse);
      this.monolithGroup.position.y = 0.08;
      this.bossModel.update(safeDt, elapsed, hitFactor);

      // Brief asymmetrical lightning arcs crackling between crater cracks and Boss lower body
      for (let i = 0; i < this.bossArcs.length; i++) {
        const arc = this.bossArcs[i];
        const cycle = (elapsed + arc.phase) % arc.period;
        const on = cycle < 0.1 || (cycle > 0.18 && cycle < 0.24);
        arc.mesh.visible = on;
        if (on) {
          arc.mat.opacity = 0.58 + Math.sin(elapsed * 45 + i) * 0.24;
        }
      }

      // Low anti-gravity crater rock fragments hovering slowly around Boss's feet
      for (let i = 0; i < this.bossGravityRockSeeds.length; i++) {
        const rs = this.bossGravityRockSeeds[i];
        const a = rs.angle + elapsed * rs.speed;
        this.bossGravityDummy.position.set(
          Math.cos(a) * rs.radius,
          rs.baseY + Math.sin(elapsed * 1.8 + rs.phase) * 0.075,
          Math.sin(a) * rs.radius
        );
        this.bossGravityDummy.rotation.set(
          elapsed * rs.rotSpeedX + rs.phase,
          elapsed * rs.rotSpeedY,
          rs.phase
        );
        this.bossGravityDummy.scale.set(rs.scale[0], rs.scale[1], rs.scale[2]);
        this.bossGravityDummy.updateMatrix();
        this.bossGravityRocksInst.setMatrixAt(i, this.bossGravityDummy.matrix);
      }
      this.bossGravityRocksInst.instanceMatrix.needsUpdate = true;

      // Subtle dim pulsing red-orange shockwave on crater floor beneath Boss's feet
      const wavePhase = (elapsed * 0.62) % 1;
      const waveScale = 0.85 + wavePhase * 0.45;
      this.bossFloorPulseMesh.scale.setScalar(waveScale);
      this.bossFloorPulseMat.opacity = Math.max(0, (1 - wavePhase) * 0.34);
    } else {
      for (const rock of this.waveRocks) {
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

    this.eclipseOuterHalo.rotation.z = elapsed * 0.18;
    this.aiWireframeSphere.rotation.y = elapsed * 0.45;
    this.aiWireframeSphere.rotation.x = Math.sin(elapsed * 0.3) * 0.25;
    this.aiGyroRing1.rotation.z = elapsed * 0.65;
    this.aiGyroRing2.rotation.x = -elapsed * 0.52;

    this.impactFx.update(safeDt, camera);

    for (let i = this.shardPool.length - 1; i >= 0; i--) {
      const p = this.shardPool[i];
      p.age += safeDt;
      if (p.age >= p.dur) {
        this.shardGroup.remove(p.mesh);
        if (p.ownsMat) (p.mesh.material as THREE.Material).dispose();
        this.shardPool.splice(i, 1);
        continue;
      }
      p.vy -= 15.5 * safeDt;
      p.mesh.position.x += p.vx * safeDt;
      let nextY = p.mesh.position.y + p.vy * safeDt;
      if (nextY <= 0.14) {
        nextY = 0.14;
        if (p.vy < -0.6 && p.bounces < 2) {
          p.vy = -p.vy * 0.42;
          p.vx *= 0.72;
          p.vz *= 0.72;
          p.rx *= 0.65;
          p.rz *= 0.65;
          p.bounces++;
        } else {
          p.vy = 0;
          p.vx *= Math.max(0.2, 1 - safeDt * 6);
          p.vz *= Math.max(0.2, 1 - safeDt * 6);
        }
      }
      p.mesh.position.y = nextY;
      p.mesh.position.z += p.vz * safeDt;
      p.mesh.rotation.x += p.rx * safeDt;
      p.mesh.rotation.y += p.ry * safeDt;
      p.mesh.rotation.z += p.rz * safeDt;
      const lifeRatio = p.age / p.dur;
      const shrink = lifeRatio < 0.62 ? 1 : Math.max(0.04, 1 - (lifeRatio - 0.62) / 0.38);
      p.mesh.scale.setScalar(p.baseScale * shrink);
    }

    // Update Animated Chibi Fighters (dash to target -> attack -> deal damage ONLY on real swing)
    for (const f of this.fighters.values()) {
      f.fx.update(elapsed);
      f.colorHex = f.fx.getAccentColor();
      f.sprite.setAccentColor(f.colorHex);
      const pos = f.sprite.group.position;

      if (this.paused) {
        f.sprite.setAnimState('aura');
      } else if (!this.bossWave) {
        const targetRock = this.pickTargetOreForFighter(f);
        if (!targetRock) {
          f.sprite.setAnimState('idle');
        } else {
          const flankSlots: readonly { side: 1 | -1; rx: number; oz: number }[] = [
            { side: -1, rx: 1.28, oz: 0.34 },
            { side: 1, rx: 1.28, oz: 0.34 },
            { side: -1, rx: 1.34, oz: 0.52 },
            { side: 1, rx: 1.34, oz: 0.52 },
            { side: -1, rx: 1.44, oz: 0.22 },
          ];
          const flank = flankSlots[f.slotIndex % flankSlots.length];
          const desiredX = targetRock.x + flank.side * flank.rx;
          const desiredZ = targetRock.z + flank.oz;
          const dx = desiredX - pos.x;
          const dz = desiredZ - pos.z;
          const dist = Math.hypot(dx, dz);

          if (Math.abs(targetRock.x - pos.x) > 0.04) {
            f.sprite.setFacing(targetRock.x >= pos.x ? 1 : -1);
          }

          if (dist > 0.22 && f.lungeTimer <= 0) {
            const step = Math.min(dist, f.walkSpeed * safeDt);
            pos.x += (dx / dist) * step;
            pos.z += (dz / dist) * step;
            pos.y = 0.08;
            f.sprite.setAnimState('dash');
          } else {
            f.sprite.setAnimState('attack');
            f.attackCooldown -= safeDt;
            if (f.attackCooldown <= 0) {
              f.attackCooldown = f.attackInterval;
              f.lungeTimer = 0.18;
              const step = f.comboStep;
              f.comboStep = (f.comboStep + 1) % 3;
              f.sprite.triggerAttack(Math.min(0.44, f.attackInterval * 0.75), step);
              onFighterStrike?.({
                slotIndex: f.slotIndex,
                targetOreIndex: targetRock.index,
                attackInterval: f.attackInterval,
                dmg: Math.max(1, Math.round(f.dmg * f.attackInterval)),
                wx: targetRock.x,
                wy: 1.05,
                wz: targetRock.z,
                accentColor: f.colorHex,
                comboStep: step,
                attackerX: pos.x,
                attackerZ: pos.z,
              });
            }

            if (f.lungeTimer > 0) {
              f.lungeTimer = Math.max(0, f.lungeTimer - safeDt);
              const t = Math.sin((f.lungeTimer / 0.18) * Math.PI);
              const toRockX = targetRock.x - desiredX;
              const toRockZ = targetRock.z - desiredZ;
              const len = Math.max(0.01, Math.hypot(toRockX, toRockZ));
              pos.x = desiredX + (toRockX / len) * t * 0.08;
              pos.z = desiredZ + (toRockZ / len) * t * 0.08;
            } else {
              pos.x = desiredX;
              pos.z = desiredZ;
            }
          }
        }
      } else {
        if (Math.abs(-pos.x) > 0.04) {
          f.sprite.setFacing(pos.x <= 0 ? 1 : -1);
        }

        const dx = f.attackPos.x - pos.x;
        const dz = f.attackPos.z - pos.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.2 && f.lungeTimer <= 0) {
          const step = Math.min(dist, f.walkSpeed * safeDt);
          pos.x += (dx / dist) * step;
          pos.z += (dz / dist) * step;
          pos.y = 0.08;
          f.sprite.setAnimState('dash');
        } else {
          f.sprite.setAnimState('attack');
          f.attackCooldown -= safeDt;
          if (f.attackCooldown <= 0) {
            f.attackCooldown = f.attackInterval;
            f.lungeTimer = 0.18;
            const step = f.comboStep;
            f.comboStep = (f.comboStep + 1) % 3;
            f.sprite.triggerAttack(Math.min(0.44, f.attackInterval * 0.75), step);
            this.bounceTimer = Math.max(this.bounceTimer, 0.09);
            this.impactFx.spawnImpact({
              targetX: (Math.random() - 0.5) * 0.55,
              targetY: 2.45,
              targetZ: BOSS_CENTER_Z + 1.05,
              accentColor: f.colorHex,
              comboStep: step,
              attackerX: pos.x,
              attackerZ: pos.z,
              shockwaveScale: 1.45,
            });
            this.spawnTowerShardsAt((Math.random() - 0.5) * 0.55, 2.2, BOSS_CENTER_Z + 1.05, f.colorHex, 4, false, true);
            onFighterStrike?.({
              slotIndex: f.slotIndex,
              targetOreIndex: null,
              attackInterval: f.attackInterval,
              dmg: Math.max(1, Math.round(f.dmg * f.attackInterval)),
              wx: (Math.random() - 0.5) * 1.1,
              wy: 2.15 + Math.random() * 0.45,
              wz: ARENA_CENTER_Z + 0.45,
              accentColor: f.colorHex,
              comboStep: step,
              attackerX: pos.x,
              attackerZ: pos.z,
            });
          }

          if (f.lungeTimer > 0) {
            f.lungeTimer = Math.max(0, f.lungeTimer - safeDt);
            const t = Math.sin((f.lungeTimer / 0.18) * Math.PI);
            const toCenterX = -f.attackPos.x;
            const toCenterZ = ARENA_CENTER_Z - f.attackPos.z;
            const len = Math.max(0.01, Math.hypot(toCenterX, toCenterZ));
            pos.x = f.attackPos.x + (toCenterX / len) * t * 0.26;
            pos.z = f.attackPos.z + (toCenterZ / len) * t * 0.26;
          } else {
            pos.x = f.attackPos.x;
            pos.z = f.attackPos.z;
          }
        }
      }

      if (camera) {
        f.sprite.update(safeDt, elapsed, camera);
      }
    }
  }

  public dispose(): void {
    this.impactFx.dispose();
    for (const p of this.shardPool) {
      this.shardGroup.remove(p.mesh);
      if (p.ownsMat) (p.mesh.material as THREE.Material).dispose();
    }
    this.shardPool.length = 0;
    this.sharedShardGeo.dispose();
    this.sharedRockGeo.dispose();
    this.rockChipMat.dispose();
    this.bossModel.dispose();
    this.cityEnv.dispose();
    for (const f of this.fighters.values()) {
      f.fx.dispose();
      f.sprite.dispose();
    }
    this.fighters.clear();

    const disposedGeos = new Set<THREE.BufferGeometry>();
    const disposedMats = new Set<THREE.Material>();
    this.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (!disposedGeos.has(child.geometry)) {
        disposedGeos.add(child.geometry);
        child.geometry.dispose();
      }
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (disposedMats.has(mat)) continue;
        disposedMats.add(mat);
        mat.dispose();
      }
    });

    for (const tex of this.ownedTextures) {
      tex.dispose();
    }
    this.ownedTextures.length = 0;
  }
}
