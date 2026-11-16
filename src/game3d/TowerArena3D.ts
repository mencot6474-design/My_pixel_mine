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

  // Deep Megacorp Cyberspace gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#01030a');
  grad.addColorStop(0.28, '#030b1c');
  grad.addColorStop(0.54, '#071736');
  grad.addColorStop(0.72, '#0c1e42');
  grad.addColorStop(0.86, '#050e24');
  grad.addColorStop(1.0, '#01040c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Cyberspace wireframe latitude & meridian grid lines
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.22)';
  ctx.lineWidth = 1.2;
  for (let x = 0; x <= 1024; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 420);
    ctx.stroke();
  }
  for (let y = 24; y <= 400; y += 28) {
    ctx.strokeStyle = y % 56 === 24 ? 'rgba(56, 189, 248, 0.26)' : 'rgba(217, 70, 239, 0.16)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Vertical digital data stream rain columns in the sky dome
  for (let i = 0; i < 64; i++) {
    const sx = (i * 173 + 19) % 1024;
    const sy = (i * 97 + 14) % 300;
    const sh = 45 + (i % 5) * 28;
    const sGrad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    const isMag = i % 4 === 0;
    sGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    sGrad.addColorStop(0.7, isMag ? 'rgba(232, 121, 249, 0.45)' : 'rgba(34, 211, 238, 0.45)');
    sGrad.addColorStop(1, isMag ? 'rgba(250, 232, 255, 0.9)' : 'rgba(207, 250, 254, 0.9)');
    ctx.fillStyle = sGrad;
    ctx.fillRect(sx - 1.5, sy, 3, sh);
  }

  // Glowing cyberspace data nodes at grid intersections
  for (let i = 0; i < 180; i++) {
    const sx = ((i * 293 + 47) % 32) * 32;
    const sy = 24 + ((i * 157 + 23) % 13) * 28;
    ctx.fillStyle = i % 4 === 0 ? 'rgba(244, 114, 182, 0.85)' : 'rgba(56, 189, 248, 0.85)';
    ctx.fillRect(sx - 2, sy - 2, 4, 4);
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

function createArenaRuneFloorTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const cx = 256;
  const cy = 256;
  const bg = ctx.createRadialGradient(cx, cy, 18, cx, cy, 256);
  bg.addColorStop(0.0, '#082f49');
  bg.addColorStop(0.42, '#071329');
  bg.addColorStop(0.82, '#030816');
  bg.addColorStop(1.0, '#01040c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // Fine PCB cyber-grid lines
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 512; g += 24) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, 512);
    ctx.moveTo(0, g);
    ctx.lineTo(512, g);
    ctx.stroke();
  }

  // Concentric mainframe timing rings
  for (const [r, col, w] of [
    [68, 'rgba(34, 211, 238, 0.68)', 3],
    [128, 'rgba(232, 121, 249, 0.48)', 2.5],
    [188, 'rgba(56, 189, 248, 0.55)', 3],
    [236, 'rgba(34, 211, 238, 0.72)', 3.5],
  ] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 16 Radial PCB circuit bus traces with glowing solder nodes
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r0 = i % 2 === 0 ? 58 : 128;
    const r1 = 236;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(34, 211, 238, 0.55)' : 'rgba(232, 121, 249, 0.45)';
    ctx.lineWidth = i % 2 === 0 ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();

    const nx = cx + Math.cos(a) * 188;
    const ny = cy + Math.sin(a) * 188;
    ctx.fillStyle = i % 2 === 0 ? '#22d3ee' : '#f472b6';
    ctx.beginPath();
    ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
    ctx.fill();
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
  private readonly seraphCage: THREE.Mesh;
  private readonly seraphWings: Array<{ pivot: THREE.Group; side: number; pairIdx: number; baseZRot: number }> = [];
  private readonly seraphDrones: Array<{ group: THREE.Group; angleOffset: number }> = [];
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
  private readonly aiWireframeSphere: THREE.Mesh;
  private readonly aiGyroRing1: THREE.Mesh;
  private readonly aiGyroRing2: THREE.Mesh;
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

    // 1. Megacorp Cyberspace Grid Sky Dome
    const skyTex = createVoidEclipseSkyTexture();
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(96, 32, 20),
      new THREE.MeshBasicMaterial({
        map: skyTex ?? undefined,
        color: skyTex ? 0xffffff : 0x030b1c,
        side: THREE.BackSide,
        fog: false,
      })
    );
    this.group.add(skyDome);

    // 2. Colossal Holographic AI Mainframe Core in the Upper-Rear Sky
    const eclipseGroup = new THREE.Group();
    eclipseGroup.position.set(0, 1.35, -32);

    const coronaGlowTex = createEclipseCoronaGlowTexture();
    this.eclipseHaloMat = new THREE.MeshBasicMaterial({
      map: coronaGlowTex ?? undefined,
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

    // 3. Megacorp Server Monolith Skyscrapers & Vertical Data Stream Laser Columns
    this.abyssRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(13.2, 0.11, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.62 })
    );
    this.abyssRing1.position.set(0, 0.2, ARENA_CENTER_Z);
    this.abyssRing1.rotation.x = Math.PI / 2 - 0.08;

    this.abyssRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(15.4, 0.08, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xe879f9, transparent: true, opacity: 0.48 })
    );
    this.abyssRing2.position.set(0, -0.4, ARENA_CENTER_Z);
    this.abyssRing2.rotation.x = Math.PI / 2 + 0.1;
    this.group.add(this.abyssRing1, this.abyssRing2);

    const serverTowerMat = new THREE.MeshStandardMaterial({
      color: 0x050b18,
      roughness: 0.3,
      metalness: 0.75,
    });
    const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, fog: false });
    const magNeonMat = new THREE.MeshBasicMaterial({ color: 0xe879f9, fog: false });
    const cyanBeamMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const magBeamMat = new THREE.MeshBasicMaterial({
      color: 0xd946ef,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });

    // Background arc of Megacorp Server Monoliths + Vertical Data Stream Pillars
    for (let i = 0; i < 16; i++) {
      const ang = Math.PI * 0.82 + (i / 15) * Math.PI * 1.36;
      const dist = 21 + (i % 3) * 3.8;
      const tx = Math.cos(ang) * dist;
      const tz = ARENA_CENTER_Z + Math.sin(ang) * dist;
      const th = 14 + (i % 4) * 4.5;
      const tw = 1.6 + (i % 2) * 0.6;

      const tower = new THREE.Mesh(new THREE.BoxGeometry(tw, th, tw), serverTowerMat);
      tower.position.set(tx, th * 0.32 - 6, tz);
      tower.lookAt(0, tower.position.y, ARENA_CENTER_Z);

      const ledStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, th * 0.92, 0.08),
        i % 2 === 0 ? cyanNeonMat : magNeonMat
      );
      ledStrip.position.z = tw * 0.5 + 0.03;
      tower.add(ledStrip);
      this.group.add(tower);

      // Vertical Data Stream Pillar shooting into cyberspace
      if (i % 2 === 0) {
        const beamX = Math.cos(ang + 0.05) * (dist - 3.2);
        const beamZ = ARENA_CENTER_Z + Math.sin(ang + 0.05) * (dist - 3.2);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 38, 8),
          i % 4 === 0 ? cyanBeamMat : magBeamMat
        );
        beam.position.set(beamX, 7.0, beamZ);
        this.group.add(beam);
      }
    }

    // Floating Holographic Data Cubes orbiting the mainframe abyss
    for (let i = 0; i < 8; i++) {
      const cubeMat = new THREE.MeshStandardMaterial({
        color: 0x08142c,
        emissive: i % 2 === 0 ? 0x06b6d4 : 0xd946ef,
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.8,
        wireframe: i % 2 === 1,
      });
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), cubeMat);
      this.group.add(cube);
      this.abyssDebris.push({
        mesh: cube,
        radius: 13.8 + (i % 3) * 1.9,
        angle: (i / 8) * Math.PI * 2,
        speed: 0.07 + (i % 2) * 0.03,
        baseY: -0.8 + (i % 4) * 1.15,
        rotSpeedX: 0.45 + (i % 3) * 0.15,
        rotSpeedY: 0.55 + (i % 2) * 0.2,
      });
    }

    // 4. Stepped Cyber-Carbon Mainframe Platform + PCB Circuit Floor
    const plinthLower = new THREE.Mesh(
      new THREE.CylinderGeometry(10.2, 7.8, 2.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x050b18, roughness: 0.4, metalness: 0.7 })
    );
    plinthLower.position.set(0, -1.25, ARENA_CENTER_Z);
    this.group.add(plinthLower);

    const runeTex = createArenaRuneFloorTexture();
    const floorDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(10.6, 10.8, 0.32, 32),
      new THREE.MeshStandardMaterial({
        map: runeTex ?? undefined,
        color: runeTex ? 0xffffff : 0x071329,
        roughness: 0.28,
        metalness: 0.55,
      })
    );
    floorDeck.position.set(0, -0.08, ARENA_CENTER_Z);
    floorDeck.receiveShadow = true;
    this.group.add(floorDeck);

    this.trimRingMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide });
    const trimRing = new THREE.Mesh(new THREE.RingGeometry(9.7, 10.15, 48), this.trimRingMat);
    trimRing.rotation.x = -Math.PI / 2;
    trimRing.position.set(0, 0.09, ARENA_CENTER_Z);
    this.group.add(trimRing);

    this.baseRingMat = new THREE.MeshBasicMaterial({ color: 0xe879f9, side: THREE.DoubleSide });
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.55, 36), this.baseRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.set(0, 0.1, ARENA_CENTER_Z);
    this.group.add(innerRing);

    // 5. Eight Cyber-Server Pylon Towers with Neon LED Strips & Hologram Data Nodes
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x070e20, roughness: 0.28, metalness: 0.78 });
    this.pillarCapMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.95,
      roughness: 0.15,
      wireframe: true,
    });
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4 + Math.PI / 8;
      const isFrontLane = Math.sin(ang) > 0.5;
      const colHeight = isFrontLane ? 2.4 : 4.4 + (i % 2) * 0.8;
      const px = Math.cos(ang) * 9.0;
      const pz = ARENA_CENTER_Z + Math.sin(ang) * 9.0;

      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.68, colHeight, 0.68), pillarMat);
      pillar.position.set(px, colHeight * 0.5, pz);
      pillar.lookAt(0, pillar.position.y, ARENA_CENTER_Z);
      pillar.castShadow = true;

      // Glowing vertical LED strip on the inner face of each server pylon
      const pylonLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, colHeight * 0.86, 0.06),
        i % 2 === 0 ? cyanNeonMat : magNeonMat
      );
      pylonLed.position.z = 0.35;
      pillar.add(pylonLed);

      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), this.pillarCapMat);
      cap.position.set(px, colHeight + 0.56, pz);
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

    // 7. Central Boss: 3D Seraphim AI Overlord (active on Wave 10 Boss)
    this.monolithPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 2.25, 0.72, 12),
      new THREE.MeshStandardMaterial({ color: 0x070e20, roughness: 0.28, metalness: 0.78 })
    );
    this.monolithPedestal.position.set(0, 0.42, ARENA_CENTER_Z);
    this.group.add(this.monolithPedestal);

    this.monolithCoreMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xdc2626,
      emissiveIntensity: 0.95,
      roughness: 0.14,
      metalness: 0.45,
    });

    const bossArmorMat = new THREE.MeshStandardMaterial({
      color: 0x0b132b,
      roughness: 0.24,
      metalness: 0.85,
    });
    const bossGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.82,
    });
    const cyanLaserMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, fog: false });

    // 7a. Armored Spherical AI Chassis + Top/Bottom Mecha Spire Crowns
    const chassisSphere = new THREE.Mesh(new THREE.SphereGeometry(1.12, 28, 22), bossArmorMat);
    chassisSphere.castShadow = true;
    this.monolithGroup.add(chassisSphere);

    const topCrown = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.85, 8), bossArmorMat);
    topCrown.position.y = 1.32;
    const botCrown = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.95, 8), bossArmorMat);
    botCrown.rotation.x = Math.PI;
    botCrown.position.y = -1.35;
    this.monolithGroup.add(topCrown, botCrown);

    // Geodesic wireframe shield cage around the AI chassis
    this.seraphCage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.32, 1),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      })
    );
    this.monolithGroup.add(this.seraphCage);

    // 7b. Mechanical Cyber-Optic Lens (Front Seraphim Eye facing the arena)
    const opticBezel = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.11, 12, 32), bossGoldMat);
    opticBezel.position.z = 0.96;
    const opticIris = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.12, 28), this.monolithCoreMat);
    opticIris.rotation.x = Math.PI / 2;
    opticIris.position.z = 0.95;
    const opticPupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0x020617 })
    );
    opticPupil.position.z = 1.02;
    const opticLaserDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    opticLaserDot.position.z = 1.3;
    this.monolithGroup.add(opticBezel, opticIris, opticPupil, opticLaserDot);

    // 7c. 6 Articulated Laser-Blade Seraphim Wings (3 pairs on Left & Right)
    const wingSpecs: ReadonlyArray<{ y: number; span: number; zAngle: number; len: number }> = [
      { y: 0.72, span: 1.25, zAngle: 0.42, len: 2.35 },
      { y: 0.04, span: 1.38, zAngle: 0.05, len: 2.65 },
      { y: -0.64, span: 1.2, zAngle: -0.38, len: 2.15 },
    ];
    for (let pairIdx = 0; pairIdx < wingSpecs.length; pairIdx++) {
      const spec = wingSpecs[pairIdx];
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * spec.span, spec.y, -0.18);
        const baseZRot = side * spec.zAngle;
        pivot.rotation.z = baseZRot;
        pivot.rotation.y = -side * 0.22;

        // Mechanical thruster mount
        const mount = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.24, 0.28), bossArmorMat);
        mount.position.x = side * 0.22;
        pivot.add(mount);

        const jointNode = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), bossGoldMat);
        jointNode.position.set(side * 0.42, 0, 0.08);
        pivot.add(jointNode);

        // Primary swept laser blade feather
        const mainBlade = new THREE.Mesh(new THREE.ConeGeometry(0.24, spec.len, 4), this.monolithCoreMat);
        mainBlade.rotation.z = -side * (Math.PI / 2);
        mainBlade.scale.set(0.45, 1, 1.35);
        mainBlade.position.set(side * (0.45 + spec.len * 0.5), 0, 0);
        pivot.add(mainBlade);

        // Secondary neon cyan plasma edge feather
        const subBlade = new THREE.Mesh(new THREE.ConeGeometry(0.13, spec.len * 0.78, 4), cyanLaserMat);
        subBlade.rotation.z = -side * (Math.PI / 2);
        subBlade.position.set(side * (0.5 + spec.len * 0.38), -0.18, 0.06);
        pivot.add(subBlade);

        this.monolithGroup.add(pivot);
        this.seraphWings.push({ pivot, side, pairIdx, baseZRot });
      }
    }

    // 7d. Interlocking Ophanim Gyroscope Rings + 4 Orbital Attack Drones
    this.haloRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.07, 10, 40),
      bossGoldMat
    );
    this.haloRing1.rotation.x = 1.05;
    this.haloRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.52, 0.055, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.75, metalness: 0.6 })
    );
    this.haloRing2.rotation.y = 1.1;
    this.monolithGroup.add(this.haloRing1, this.haloRing2);

    for (let d = 0; d < 4; d++) {
      const droneGroup = new THREE.Group();
      const dBody = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), bossArmorMat);
      const dRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 20), cyanLaserMat);
      dRing.rotation.x = Math.PI / 2;
      const dEye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), this.monolithCoreMat);
      dEye.position.z = 0.24;
      droneGroup.add(dBody, dRing, dEye);
      this.monolithGroup.add(droneGroup);
      this.seraphDrones.push({ group: droneGroup, angleOffset: (d / 4) * Math.PI * 2 });
    }

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
    this.trimRingMat.color.set(opts.isBossWave ? '#f43f5e' : '#22d3ee');
    this.pillarCapMat.color.set(opts.isBossWave ? '#facc15' : opts.anomalyColorHex);
    this.pillarCapMat.emissive.set(opts.isBossWave ? '#ef4444' : '#06b6d4');
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
      const hitFactor = this.bounceTimer > 0 ? this.bounceTimer / 0.24 : 0;
      const pulse = 1 + hitFactor * 0.14;
      const bossScale = this.bossMode ? 1.18 : 1.0;
      this.monolithGroup.scale.setScalar(bossScale * pulse);
      this.monolithGroup.position.y = 3.15 + Math.sin(elapsed * 2.1) * 0.18;
      this.monolithGroup.rotation.y = Math.sin(elapsed * 1.35) * 0.26;
      this.monolithGroup.rotation.z = Math.cos(elapsed * 1.1) * 0.05;
      this.seraphCage.rotation.y = elapsed * 0.85;
      this.seraphCage.rotation.x = -elapsed * 0.55;
      this.haloRing1.rotation.z = elapsed * 1.4;
      this.haloRing2.rotation.x = elapsed * -1.1;

      for (const w of this.seraphWings) {
        const flap = Math.sin(elapsed * 3.4 - w.pairIdx * 0.65) * 0.16 + hitFactor * 0.28;
        w.pivot.rotation.z = w.baseZRot + w.side * flap;
      }
      for (const d of this.seraphDrones) {
        const a = d.angleOffset + elapsed * 1.75;
        d.group.position.set(Math.cos(a) * 3.1, Math.sin(elapsed * 2.8 + d.angleOffset) * 0.45, Math.sin(a) * 1.85);
        d.group.rotation.y = -a + Math.PI / 2;
      }
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

    this.eclipseOuterHalo.rotation.z = elapsed * 0.18;
    this.aiWireframeSphere.rotation.y = elapsed * 0.45;
    this.aiWireframeSphere.rotation.x = Math.sin(elapsed * 0.3) * 0.25;
    this.aiGyroRing1.rotation.z = elapsed * 0.65;
    this.aiGyroRing2.rotation.x = -elapsed * 0.52;
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
              f.sprite.triggerAttack(Math.min(0.44, f.attackInterval * 0.75));
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
              pos.x = desiredX + (toRockX / len) * t * 0.1;
              pos.z = desiredZ + (toRockZ / len) * t * 0.1;
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
            f.sprite.triggerAttack(Math.min(0.44, f.attackInterval * 0.75));
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
