import * as THREE from 'three';
import { getEnchantById } from '../game/GameData';
import { TowerWaveOreState } from '../game/TowerData';
import { createEnchantAura3D } from './AuraModels3D';
import { ChibiDef } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { mountGlbProp } from './GlbAssets3D';
import { OreVariantKey } from './MineWorldPalette';

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

interface ShardOrbiter {
  mesh: THREE.Mesh;
  radius: number;
  speed: number;
  angle: number;
  baseY: number;
}

interface VoidDebrisRock {
  mesh: THREE.Mesh;
  radius: number;
  angle: number;
  speed: number;
  baseY: number;
  rotSpeedX: number;
  rotSpeedY: number;
}

interface SlashVfx {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  baseScale: number;
}

interface TowerWaveRockSlot {
  index: number;
  x: number;
  z: number;
  root: THREE.Group;
  visualGroup: THREE.Group;
  hitMesh: THREE.Mesh;
  rockMat: THREE.MeshStandardMaterial;
  crystalMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshBasicMaterial;
  ringMesh: THREE.Mesh;
  commonMesh: THREE.Group;
  veinMesh: THREE.Group;
  geodeMesh: THREE.Group;
  alive: boolean;
  hp: number;
  maxHp: number;
  name: string;
  color: string;
  variantKey: OreVariantKey;
  squashAmt: number;
  flashTimer: number;
  spawnScale: number;
  phase: number;
}

interface TowerChibiFighter {
  slotIndex: number;
  sprite: ChibiSprite3D;
  spawnPos: THREE.Vector3;
  attackPos: THREE.Vector3;
  targetOreIndex: number;
  dmg: number;
  walkSpeed: number;
  attackInterval: number;
  attackCooldown: number;
  lungeTimer: number;
  enchantId: string | null;
  colorHex: string;
  auraGroup: THREE.Group | null;
  auraCrest: THREE.Group | null;
}

const ARENA_CENTER_Z = -1.6;
const SUMMON_RADIUS = 6.3;
const ATTACK_RADIUS = 2.65;

const WAVE_ORE_POSITIONS: ReadonlyArray<[number, number]> = [
  [-3.7, ARENA_CENTER_Z + 1.55],
  [3.7, ARENA_CENTER_Z + 1.55],
  [-4.25, ARENA_CENTER_Z - 1.35],
  [4.25, ARENA_CENTER_Z - 1.35],
  [0, ARENA_CENTER_Z - 2.35],
];

function createVoidEclipseSkyTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#020109');
  grad.addColorStop(0.28, '#09031c');
  grad.addColorStop(0.52, '#1e0b3e');
  grad.addColorStop(0.68, '#3b0a45');
  grad.addColorStop(0.8, '#17072c');
  grad.addColorStop(1.0, '#04010c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 6; i++) {
    const nx = 140 + i * 165;
    const ny = 240 + (i % 2) * 35;
    const nGrad = ctx.createRadialGradient(nx, ny, 10, nx, ny, 130);
    nGrad.addColorStop(0, i % 2 === 0 ? 'rgba(139, 92, 246, 0.14)' : 'rgba(244, 63, 94, 0.1)');
    nGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nGrad;
    ctx.beginPath();
    ctx.arc(nx, ny, 130, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 240; i++) {
    const sx = (i * 293 + 47) % 1024;
    const sy = (i * 157 + 23) % 330;
    const r = i % 9 === 0 ? 1.4 : 0.8;
    ctx.fillStyle = i % 5 === 0 ? 'rgba(216,180,254,0.88)' : 'rgba(224,242,254,0.75)';
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createEclipseCoronaGlowTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(128, 128, 42, 128, 128, 126);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.24, 'rgba(255, 220, 180, 0.65)');
  grad.addColorStop(0.55, 'rgba(217, 70, 239, 0.25)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createArenaRuneFloorTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const cx = 256;
  const cy = 256;
  const bg = ctx.createRadialGradient(cx, cy, 24, cx, cy, 256);
  bg.addColorStop(0.0, '#1e1b4b');
  bg.addColorStop(0.45, '#0f172a');
  bg.addColorStop(0.85, '#090d1a');
  bg.addColorStop(1.0, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 3;
  for (const r of [76, 138, 198, 236]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(168, 85, 247, 0.32)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58);
    ctx.lineTo(cx + Math.cos(a) * 238, cy + Math.sin(a) * 238);
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

  private readonly monolithGroup = new THREE.Group();
  private readonly monolithPedestal: THREE.Mesh;
  private readonly monolithCoreMat: THREE.MeshStandardMaterial;
  private readonly haloRing1: THREE.Mesh;
  private readonly haloRing2: THREE.Mesh;
  private readonly baseRingMat: THREE.MeshBasicMaterial;
  private readonly trimRingMat: THREE.MeshBasicMaterial;
  private readonly pillarCapMat: THREE.MeshStandardMaterial;
  private readonly hitMesh: THREE.Mesh;

  private readonly waveOresGroup = new THREE.Group();
  private readonly waveRocks: TowerWaveRockSlot[] = [];

  private readonly eclipseCoronaRing: THREE.Mesh;
  private readonly eclipseOuterHalo: THREE.Mesh;
  private readonly eclipseCoronaMat: THREE.MeshBasicMaterial;
  private readonly eclipseHaloMat: THREE.MeshBasicMaterial;
  private readonly abyssRing1: THREE.Mesh;
  private readonly abyssRing2: THREE.Mesh;
  private readonly abyssDebris: VoidDebrisRock[] = [];
  private readonly emberMotes: ShardOrbiter[] = [];
  private readonly orbiters: ShardOrbiter[] = [];
  private readonly summonPads: THREE.Mesh[] = [];

  private readonly fightersGroup = new THREE.Group();
  private readonly fighters = new Map<number, TowerChibiFighter>();
  private readonly slashGroup = new THREE.Group();
  private readonly slashes: SlashVfx[] = [];
  private fighterConfigs: TowerFighterConfig[] = [];

  private bounceTimer = 0;
  private bossMode = true;
  private bossWave = true;
  private paused = false;
  private anomalyColorHex = '#38bdf8';
  private lastFloor = 0;
  private lastWave = 0;
  private activeMiners = 0;

  constructor() {
    this.group.visible = false;

    // 1. Void Eclipse Sky Dome
    const skyTex = createVoidEclipseSkyTexture();
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(96, 32, 20),
      new THREE.MeshBasicMaterial({
        map: skyTex ?? undefined,
        color: skyTex ? 0xffffff : 0x09031c,
        side: THREE.BackSide,
        fog: false,
      })
    );
    this.group.add(skyDome);

    // 2. Colossal Total Solar Eclipse in the Upper-Rear Sky
    const eclipseGroup = new THREE.Group();
    eclipseGroup.position.set(0, 4.0, -32);

    const coronaGlowTex = createEclipseCoronaGlowTexture();
    this.eclipseHaloMat = new THREE.MeshBasicMaterial({
      map: coronaGlowTex ?? undefined,
      color: 0xa855f7,
      transparent: true,
      opacity: coronaGlowTex ? 0.78 : 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.eclipseOuterHalo = new THREE.Mesh(
      coronaGlowTex ? new THREE.PlaneGeometry(16.8, 16.8) : new THREE.RingGeometry(3.2, 6.4, 64),
      this.eclipseHaloMat
    );
    this.eclipseOuterHalo.position.z = -0.05;

    this.eclipseCoronaMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.eclipseCoronaRing = new THREE.Mesh(new THREE.RingGeometry(3.02, 3.65, 64), this.eclipseCoronaMat);

    const blackMoonDisc = new THREE.Mesh(
      new THREE.CircleGeometry(3.04, 48),
      new THREE.MeshBasicMaterial({ color: 0x020107, fog: false })
    );
    blackMoonDisc.position.z = 0.04;

    const coronalFlareRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.15, 0.055, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    coronalFlareRing.rotation.x = 0.25;

    eclipseGroup.add(this.eclipseOuterHalo, this.eclipseCoronaRing, blackMoonDisc, coronalFlareRing);
    this.group.add(eclipseGroup);

    // 3. Outer Abyss Gyroscope Rings & Levitating Shattered Obsidian Rocks
    this.abyssRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(13.2, 0.12, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.55 })
    );
    this.abyssRing1.position.set(0, 0.2, ARENA_CENTER_Z);
    this.abyssRing1.rotation.x = Math.PI / 2 - 0.12;

    this.abyssRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(15.4, 0.08, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42 })
    );
    this.abyssRing2.position.set(0, -0.4, ARENA_CENTER_Z);
    this.abyssRing2.rotation.x = Math.PI / 2 + 0.16;
    this.group.add(this.abyssRing1, this.abyssRing2);

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.72, metalness: 0.28 });
    for (let i = 0; i < 8; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65 + (i % 3) * 0.35, 0), rockMat);
      rock.scale.set(1, 1.45 + (i % 2) * 0.5, 0.9);
      this.group.add(rock);
      this.abyssDebris.push({
        mesh: rock,
        radius: 13.8 + (i % 3) * 1.9,
        angle: (i / 8) * Math.PI * 2,
        speed: 0.06 + (i % 2) * 0.03,
        baseY: -1.4 + (i % 4) * 1.15,
        rotSpeedX: 0.25 + (i % 3) * 0.1,
        rotSpeedY: 0.3 + (i % 2) * 0.15,
      });
    }

    // 4. Stepped Obsidian Sanctuary Platform + Arcane Rune Floor
    const plinthLower = new THREE.Mesh(
      new THREE.CylinderGeometry(10.0, 7.6, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x090d1a, roughness: 0.75, metalness: 0.25 })
    );
    plinthLower.position.set(0, -1.25, ARENA_CENTER_Z);
    this.group.add(plinthLower);

    const runeTex = createArenaRuneFloorTexture();
    const floorDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(10.6, 10.8, 0.32, 32),
      new THREE.MeshStandardMaterial({
        map: runeTex ?? undefined,
        color: runeTex ? 0xffffff : 0x0f172a,
        roughness: 0.45,
        metalness: 0.25,
      })
    );
    floorDeck.position.set(0, -0.08, ARENA_CENTER_Z);
    floorDeck.receiveShadow = true;
    this.group.add(floorDeck);

    this.trimRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const trimRing = new THREE.Mesh(new THREE.RingGeometry(9.7, 10.1, 48), this.trimRingMat);
    trimRing.rotation.x = -Math.PI / 2;
    trimRing.position.set(0, 0.09, ARENA_CENTER_Z);
    this.group.add(trimRing);

    this.baseRingMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide });
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.55, 36), this.baseRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.set(0, 0.1, ARENA_CENTER_Z);
    this.group.add(innerRing);

    // 5. Eight Obsidian Colosseum Pillars with Pulsing Eclipse Crystals
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.42, metalness: 0.4 });
    this.pillarCapMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.85,
      roughness: 0.18,
    });
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4 + Math.PI / 8;
      const isFrontLane = Math.sin(ang) > 0.5;
      const colHeight = isFrontLane ? 2.4 : 4.2 + (i % 2) * 0.7;
      const px = Math.cos(ang) * 9.0;
      const pz = ARENA_CENTER_Z + Math.sin(ang) * 9.0;

      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.52, colHeight, 6), pillarMat);
      pillar.position.set(px, colHeight * 0.5, pz);
      pillar.castShadow = true;

      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), this.pillarCapMat);
      cap.position.set(px, colHeight + 0.52, pz);
      this.group.add(pillar, cap);
    }

    // 6. Five Front-Arc Chibi Summoning Runes
    for (let i = 0; i < 5; i++) {
      const sp = this.getSpawnPos(i);
      const pad = new THREE.Mesh(
        new THREE.RingGeometry(0.46, 0.68, 20),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.25,
        })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(sp.x, 0.095, sp.z);
      this.group.add(pad);
      this.summonPads.push(pad);
    }

    // 7. Central Boss Monolith Core (active on Wave 10 Boss)
    this.monolithPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 2.2, 0.72, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.35, metalness: 0.45 })
    );
    this.monolithPedestal.position.set(0, 0.42, ARENA_CENTER_Z);
    this.group.add(this.monolithPedestal);

    this.monolithCoreMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xdc2626,
      emissiveIntensity: 0.85,
      roughness: 0.12,
      metalness: 0.3,
    });
    const mainCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.55, 0), this.monolithCoreMat);
    mainCrystal.scale.set(0.88, 1.48, 0.88);
    mainCrystal.castShadow = true;
    this.monolithGroup.add(mainCrystal);

    this.haloRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.075, 10, 36),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xea580c, emissiveIntensity: 0.7, metalness: 0.6 })
    );
    this.haloRing1.rotation.x = 1.05;
    this.haloRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.48, 0.06, 10, 36),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xa855f7, emissiveIntensity: 0.6, metalness: 0.6 })
    );
    this.haloRing2.rotation.y = 1.1;
    this.monolithGroup.add(this.haloRing1, this.haloRing2);
    this.monolithGroup.position.set(0, 3.15, ARENA_CENTER_Z);
    this.group.add(this.monolithGroup);

    // 7b. Five Wave Ore Rock Slots (active on Waves 1..9)
    this.group.add(this.waveOresGroup);
    for (let i = 0; i < WAVE_ORE_POSITIONS.length; i++) {
      const slot = this.createWaveOreSlot(i);
      this.waveRocks.push(slot);
      this.waveOresGroup.add(slot.root);
      this.clickables.push(slot.hitMesh);
    }

    // 8. Astral Orbiters + Drifting Void Embers
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.24, 0),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0x38bdf8 : 0xf472b6,
          emissive: i % 2 === 0 ? 0x0284c7 : 0xdb2777,
          emissiveIntensity: 0.6,
          roughness: 0.18,
        })
      );
      this.group.add(mesh);
      this.orbiters.push({
        mesh,
        radius: 3.1 + (i % 3) * 0.9,
        speed: 0.6 + (i % 4) * 0.18,
        angle: (i / 8) * Math.PI * 2,
        baseY: 1.95 + (i % 3) * 0.78,
      });
    }

    for (let i = 0; i < 16; i++) {
      const mote = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11, 0),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xc084fc : 0xfbbf24, transparent: true, opacity: 0.68 })
      );
      this.group.add(mote);
      this.emberMotes.push({
        mesh: mote,
        radius: 8.4 + (i % 4) * 1.15,
        speed: 0.22 + (i % 3) * 0.09,
        angle: (i / 16) * Math.PI * 2,
        baseY: 0.4 + (i % 5) * 0.85,
      });
    }

    // 9. Animated Chibi Fighters & Slash VFX Layers
    this.group.add(this.fightersGroup);
    this.group.add(this.slashGroup);

    // 10. Boss Monolith Raycast Hitbox (keep at index 0 of clickables)
    this.hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 5.2, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    this.hitMesh.position.set(0, 3.0, ARENA_CENTER_Z);
    this.hitMesh.userData = { kind: 'tower-core' };
    this.group.add(this.hitMesh);
    this.clickables.unshift(this.hitMesh);
  }

  private createWaveOreSlot(index: number): TowerWaveRockSlot {
    const [x, z] = WAVE_ORE_POSITIONS[index];
    const root = new THREE.Group();
    root.position.set(x, 0.08, z);
    root.visible = false;

    const visualGroup = new THREE.Group();
    root.add(visualGroup);

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.78,
      metalness: 0.12,
      flatShading: true,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
      roughness: 0.16,
      metalness: 0.35,
      flatShading: true,
    });

    const buildCommon = (): THREE.Group => {
      const g = new THREE.Group();
      mountGlbProp('/models/mini-dungeon/rocks.glb', g, {
        position: [0, 0.02, 0],
        rotationY: index * 1.2,
        targetHeight: 0.72,
        alignBottomY: 0,
      });
      const baseBoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.56, 0), rockMat);
      baseBoulder.position.y = 0.42;
      baseBoulder.scale.set(1.05, 0.78, 1.0);
      g.add(baseBoulder);

      const gleam = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), crystalMat);
      gleam.position.set(-0.08, 0.78, 0.06);
      gleam.scale.set(0.85, 1.35, 0.85);
      g.add(gleam);
      return g;
    };

    const buildVein = (): THREE.Group => {
      const g = new THREE.Group();
      mountGlbProp('/models/mini-dungeon/rocks.glb', g, {
        position: [0, 0.02, 0],
        rotationY: index * 1.7 + 0.5,
        targetHeight: 0.86,
        alignBottomY: 0,
      });
      const baseBoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), rockMat);
      baseBoulder.position.y = 0.46;
      baseBoulder.scale.set(1.1, 0.82, 1.05);
      g.add(baseBoulder);

      const prismSpecs: [number, number, number, number, number, number][] = [
        [0, 1.04, 0, 0.17, 0.92, 0.08],
        [0.34, 0.82, 0.18, 0.12, 0.68, 0.48],
        [-0.3, 0.78, -0.16, 0.11, 0.62, -0.45],
      ];
      for (const [px, py, pz, r, h, tilt] of prismSpecs) {
        const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.03, r, h, 6), crystalMat);
        prism.position.set(px, py, pz);
        prism.rotation.set(tilt * 0.7, px * 2, -tilt);
        g.add(prism);
      }
      return g;
    };

    const buildGeode = (): THREE.Group => {
      const g = new THREE.Group();
      mountGlbProp('/models/mini-dungeon/rocks.glb', g, {
        position: [0, 0.02, 0],
        rotationY: index * 0.9,
        targetHeight: 0.98,
        alignBottomY: 0,
      });
      const baseBoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 0), rockMat);
      baseBoulder.position.y = 0.52;
      baseBoulder.scale.set(1.15, 0.85, 1.1);
      g.add(baseBoulder);

      const coreHeart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 0), crystalMat);
      coreHeart.position.y = 0.96;
      coreHeart.scale.set(1.0, 1.32, 1.0);
      g.add(coreHeart);

      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.13, 0.76, 6), crystalMat);
        spire.position.set(Math.cos(ang) * 0.46, 0.82, Math.sin(ang) * 0.46);
        spire.rotation.set(Math.sin(ang) * 0.55, ang, -Math.cos(ang) * 0.55);
        g.add(spire);
      }
      return g;
    };

    const commonMesh = buildCommon();
    const veinMesh = buildVein();
    const geodeMesh = buildGeode();
    visualGroup.add(commonMesh, veinMesh, geodeMesh);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.04, 24), ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.03;
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
      visualGroup,
      hitMesh,
      rockMat,
      crystalMat,
      ringMat,
      ringMesh,
      commonMesh,
      veinMesh,
      geodeMesh,
      alive: false,
      hp: 0,
      maxHp: 100,
      name: 'Ore',
      color: '#38bdf8',
      variantKey: 'common',
      squashAmt: 0,
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
        this.fightersGroup.remove(f.sprite.group);
        f.sprite.dispose();
        this.fighters.delete(slot);
      }
    }

    for (const cfg of configs) {
      let existing = this.fighters.get(cfg.slotIndex);
      if (existing && existing.sprite.group.userData?.chibiId !== cfg.def.id) {
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
        this.fightersGroup.add(sprite.group);

        existing = {
          slotIndex: cfg.slotIndex,
          sprite,
          spawnPos,
          attackPos,
          targetOreIndex: -1,
          dmg: cfg.dmg,
          walkSpeed: 4.1 + Math.max(0, cfg.speed - 10) * 0.14,
          attackInterval: Math.max(0.32, 0.85 / Math.max(1, cfg.miningMult)),
          attackCooldown: 0.14 + cfg.slotIndex * 0.08,
          lungeTimer: 0,
          enchantId: null,
          colorHex: '#38bdf8',
          auraGroup: null,
          auraCrest: null,
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
      mat.opacity = active ? 0.72 : 0.16;
    }
  }

  private applyFighterEnchant(f: TowerChibiFighter, enchantId: string | null): void {
    if (f.enchantId === enchantId) return;
    if (f.auraGroup) {
      f.sprite.group.remove(f.auraGroup);
      f.auraGroup = null;
      f.auraCrest = null;
    }
    f.enchantId = enchantId;
    if (!enchantId) {
      f.colorHex = '#38bdf8';
      return;
    }
    const enc = getEnchantById(enchantId);
    if (!enc) return;
    f.colorHex = enc.color;

    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.68, 24),
      new THREE.MeshBasicMaterial({
        color: enc.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.56,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    g.add(ring);

    const crest = createEnchantAura3D(enc.id, 0.44);
    crest.position.set(0, 2.38, 0);
    g.add(crest);
    f.auraCrest = crest;
    f.auraGroup = g;
    f.sprite.group.add(g);
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
  }): void {
    const floorChanged = opts.floor !== this.lastFloor;
    const waveChanged = opts.wave !== this.lastWave;

    this.bossWave = opts.isBossWave;
    this.bossMode = opts.isBossWave || opts.isCheckpointFloor;
    this.anomalyColorHex = opts.anomalyColorHex;
    this.paused = opts.paused;
    this.activeMiners = Math.max(0, Math.min(5, opts.equippedMinerCount));

    if (floorChanged || waveChanged) {
      this.lastFloor = opts.floor;
      this.lastWave = opts.wave;
      if (!opts.paused) {
        if (floorChanged) {
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
    this.monolithPedestal.visible = opts.isBossWave;
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

      slot.commonMesh.visible = state.variantKey === 'common';
      slot.veinMesh.visible = state.variantKey === 'vein';
      slot.geodeMesh.visible = state.variantKey === 'geode';
      slot.crystalMat.color.set(state.color);
      slot.crystalMat.emissive.set(state.color);
      slot.rockMat.color.set(state.secondaryColor);
      slot.ringMat.color.set(state.color);

      if (newlySpawned) {
        slot.spawnScale = 0.12;
        slot.squashAmt = 0.15;
        slot.visualGroup.rotation.y = (i * 1.37 + opts.wave * 0.9) % (Math.PI * 2);
      }
    }

    const useBossColors = opts.isBossWave && opts.isCheckpointFloor;
    this.monolithCoreMat.color.set(useBossColors ? '#f59e0b' : opts.isBossWave ? '#f43f5e' : '#38bdf8');
    this.monolithCoreMat.emissive.set(opts.isBossWave ? '#dc2626' : opts.anomalyColorHex);
    this.baseRingMat.color.set(opts.isBossWave ? '#facc15' : opts.anomalyColorHex);
    this.trimRingMat.color.set(opts.isBossWave ? '#f43f5e' : '#38bdf8');
    this.pillarCapMat.color.set(opts.isBossWave ? '#facc15' : opts.anomalyColorHex);
    this.pillarCapMat.emissive.set(opts.isBossWave ? '#ef4444' : '#7c3aed');
    this.eclipseCoronaMat.color.set(opts.isBossWave ? '#ef4444' : '#f97316');
    this.eclipseHaloMat.color.set(opts.isBossWave ? '#f43f5e' : opts.anomalyColorHex);

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

  public triggerHitBounce(intensity = 0.24, spawnSlash = true): void {
    this.bounceTimer = Math.max(this.bounceTimer, intensity);
    if (spawnSlash) {
      const slashColor = this.bossMode ? '#facc15' : this.anomalyColorHex;
      this.spawnSlashArc(slashColor, (Math.random() - 0.5) * 1.4, 1.35, (Math.random() - 0.5) * 0.45, 2.75, ARENA_CENTER_Z + 1.05);
      this.spawnSlashArc('#e879f9', (Math.random() - 0.5) * 1.4 + Math.PI * 0.5, 1.15, (Math.random() - 0.5) * 0.45, 2.75, ARENA_CENTER_Z + 1.05);
    }
  }

  public triggerOreHitBounce(oreIndex: number, broken = false): void {
    const rock = this.waveRocks[oreIndex];
    if (!rock) return;
    rock.squashAmt = broken ? 0.34 : 0.22;
    rock.flashTimer = 0.09;
    this.spawnSlashArc(rock.color, (Math.random() - 0.5) * 1.8, broken ? 1.18 : 0.88, rock.x, 1.05, rock.z + 0.45);
  }

  private spawnSlashArc(
    colorHex: string,
    rollAngle: number,
    baseScale = 1.0,
    wx = 0,
    wy = 2.75,
    wz = ARENA_CENTER_Z + 1.05
  ): void {
    if (this.slashes.length >= 16) {
      const oldest = this.slashes.shift();
      if (oldest) {
        this.slashGroup.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        oldest.mat.dispose();
      }
    }
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.55, 22, 1, 0, Math.PI * 1.15), mat);
    mesh.position.set(wx + (Math.random() - 0.5) * 0.3, wy + (Math.random() - 0.5) * 0.35, wz);
    mesh.rotation.z = rollAngle;
    mesh.rotation.x = (Math.random() - 0.5) * 0.45;
    mesh.scale.setScalar(baseScale * 0.5);
    this.slashGroup.add(mesh);
    this.slashes.push({ mesh, mat, age: 0, maxAge: 0.22, baseScale });
  }

  public getMonolithWorldPos(): THREE.Vector3 {
    return new THREE.Vector3(0, 3.15, ARENA_CENTER_Z);
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
    if (this.bounceTimer > 0) {
      this.bounceTimer = Math.max(0, this.bounceTimer - dt);
    }

    if (this.bossWave) {
      const pulse = this.bounceTimer > 0 ? 1 + (this.bounceTimer / 0.24) * 0.14 : 1;
      const bossScale = this.bossMode ? 1.18 : 1.0;
      this.monolithGroup.scale.setScalar(bossScale * pulse);
      this.monolithGroup.position.y = 3.15 + Math.sin(elapsed * 2.1) * 0.18;
      this.monolithGroup.rotation.y = elapsed * (this.bossMode ? 1.35 : 0.85);
      this.haloRing1.rotation.z = elapsed * 1.4;
      this.haloRing2.rotation.x = elapsed * -1.1;
    } else {
      for (const rock of this.waveRocks) {
        if (!rock.alive) continue;
        if (rock.spawnScale < 1) {
          rock.spawnScale = Math.min(1, rock.spawnScale + dt * 5.2);
        }
        if (rock.squashAmt > 0.001) {
          rock.squashAmt = Math.max(0, rock.squashAmt - dt * 2.1);
        }
        const sy = Math.max(0.08, (1 - rock.squashAmt) * rock.spawnScale);
        const sxz = (1 + rock.squashAmt * 0.45) * rock.spawnScale;
        const tremor = rock.squashAmt > 0.005 ? Math.sin(elapsed * 58 + rock.phase) * rock.squashAmt * 0.14 : 0;
        rock.visualGroup.scale.set(sxz, sy, sxz);
        rock.visualGroup.position.set(tremor, Math.sin(elapsed * 2.2 + rock.phase) * 0.02, -tremor * 0.65);

        if (rock.flashTimer > 0) {
          rock.flashTimer -= dt;
          rock.crystalMat.emissive.setHex(0xffffff);
          rock.crystalMat.emissiveIntensity = 1.8;
        } else {
          rock.crystalMat.emissive.set(rock.color);
          rock.crystalMat.emissiveIntensity = 0.45 + Math.sin(elapsed * 3.5 + rock.phase) * 0.12;
        }
      }
    }

    const coronaPulse = 1 + Math.sin(elapsed * 2.4) * 0.035;
    this.eclipseCoronaRing.scale.setScalar(coronaPulse);
    this.eclipseOuterHalo.scale.setScalar(1 + Math.sin(elapsed * 1.4 + 0.8) * 0.06);
    this.abyssRing1.rotation.z = elapsed * 0.14;
    this.abyssRing2.rotation.z = -elapsed * 0.11;

    for (const r of this.abyssDebris) {
      const a = r.angle + elapsed * r.speed;
      r.mesh.position.set(
        Math.cos(a) * r.radius,
        r.baseY + Math.sin(elapsed * 1.1 + r.angle) * 0.45,
        ARENA_CENTER_Z + Math.sin(a) * r.radius
      );
      r.mesh.rotation.x += dt * r.rotSpeedX;
      r.mesh.rotation.y += dt * r.rotSpeedY;
    }

    for (const o of this.orbiters) {
      const a = o.angle + elapsed * o.speed;
      o.mesh.position.set(
        Math.cos(a) * o.radius,
        o.baseY + Math.sin(elapsed * 2 + o.angle) * 0.25,
        ARENA_CENTER_Z + Math.sin(a) * o.radius
      );
      o.mesh.rotation.y = elapsed * 1.6 + o.angle;
    }

    for (const m of this.emberMotes) {
      const a = m.angle + elapsed * m.speed;
      m.mesh.position.set(
        Math.cos(a) * m.radius,
        m.baseY + ((elapsed * 0.65 + m.angle) % 3.4),
        ARENA_CENTER_Z + Math.sin(a) * m.radius
      );
      m.mesh.rotation.y = elapsed * 2.2 + m.angle;
    }

    // Update Active Slash VFX
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.age += dt;
      const p = Math.min(1, s.age / s.maxAge);
      s.mesh.scale.setScalar(s.baseScale * (0.5 + p * 0.75));
      s.mat.opacity = Math.max(0, (1 - p) * 0.95);
      if (p >= 1) {
        this.slashGroup.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mat.dispose();
        this.slashes.splice(i, 1);
      }
    }

    // Update Animated Chibi Fighters (dash to target -> attack -> deal damage ONLY on real swing)
    for (const f of this.fighters.values()) {
      const pos = f.sprite.group.position;

      if (this.paused) {
        f.sprite.setAnimState('aura');
      } else if (!this.bossWave) {
        const targetRock = this.pickTargetOreForFighter(f);
        if (!targetRock) {
          f.sprite.setAnimState('idle');
        } else {
          const angle = (0.16 + (f.slotIndex / 4) * 0.68) * Math.PI;
          const desiredX = targetRock.x + Math.cos(angle) * 1.05;
          const desiredZ = targetRock.z + Math.sin(angle) * 0.95;
          const dx = desiredX - pos.x;
          const dz = desiredZ - pos.z;
          const dist = Math.hypot(dx, dz);

          if (Math.abs(targetRock.x - pos.x) > 0.04) {
            f.sprite.setFacing(targetRock.x >= pos.x ? 1 : -1);
          }

          if (dist > 0.22 && f.lungeTimer <= 0) {
            const step = Math.min(dist, f.walkSpeed * dt);
            pos.x += (dx / dist) * step;
            pos.z += (dz / dist) * step;
            pos.y = 0.08;
            f.sprite.setAnimState('dash');
          } else {
            f.sprite.setAnimState('attack');
            f.attackCooldown -= dt;
            if (f.attackCooldown <= 0) {
              f.attackCooldown = f.attackInterval;
              f.lungeTimer = 0.18;
              onFighterStrike?.({
                slotIndex: f.slotIndex,
                targetOreIndex: targetRock.index,
                attackInterval: f.attackInterval,
                dmg: Math.max(1, Math.round(f.dmg * f.attackInterval)),
                wx: targetRock.x,
                wy: 1.05,
                wz: targetRock.z,
              });
            }

            if (f.lungeTimer > 0) {
              f.lungeTimer = Math.max(0, f.lungeTimer - dt);
              const t = Math.sin((f.lungeTimer / 0.18) * Math.PI);
              const toRockX = targetRock.x - desiredX;
              const toRockZ = targetRock.z - desiredZ;
              const len = Math.max(0.01, Math.hypot(toRockX, toRockZ));
              pos.x = desiredX + (toRockX / len) * t * 0.36;
              pos.z = desiredZ + (toRockZ / len) * t * 0.36;
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
          const step = Math.min(dist, f.walkSpeed * dt);
          pos.x += (dx / dist) * step;
          pos.z += (dz / dist) * step;
          pos.y = 0.08;
          f.sprite.setAnimState('dash');
        } else {
          f.sprite.setAnimState('attack');
          f.attackCooldown -= dt;
          if (f.attackCooldown <= 0) {
            f.attackCooldown = f.attackInterval;
            f.lungeTimer = 0.18;
            this.bounceTimer = Math.max(this.bounceTimer, 0.09);
            this.spawnSlashArc(
              this.bossMode ? '#facc15' : f.colorHex,
              (Math.random() - 0.5) * 1.9,
              0.92,
              (Math.random() - 0.5) * 0.45,
              2.75,
              ARENA_CENTER_Z + 1.05
            );
            onFighterStrike?.({
              slotIndex: f.slotIndex,
              targetOreIndex: null,
              attackInterval: f.attackInterval,
              dmg: Math.max(1, Math.round(f.dmg * f.attackInterval)),
              wx: (Math.random() - 0.5) * 0.9,
              wy: 2.6 + Math.random() * 0.8,
              wz: ARENA_CENTER_Z + 0.5,
            });
          }

          if (f.lungeTimer > 0) {
            f.lungeTimer = Math.max(0, f.lungeTimer - dt);
            const t = Math.sin((f.lungeTimer / 0.18) * Math.PI);
            const toCenterX = -f.attackPos.x;
            const toCenterZ = ARENA_CENTER_Z - f.attackPos.z;
            const len = Math.max(0.01, Math.hypot(toCenterX, toCenterZ));
            pos.x = f.attackPos.x + (toCenterX / len) * t * 0.45;
            pos.z = f.attackPos.z + (toCenterZ / len) * t * 0.45;
          } else {
            pos.x = f.attackPos.x;
            pos.z = f.attackPos.z;
          }
        }
      }

      if (f.auraCrest) {
        f.auraCrest.rotation.y = elapsed * 2.1 + f.slotIndex;
        f.auraCrest.position.y = 2.38 + Math.sin(elapsed * 2.8 + f.slotIndex) * 0.06;
      }
      if (camera) {
        f.sprite.update(dt, elapsed, camera);
      }
    }
  }
}
