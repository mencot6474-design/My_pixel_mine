import * as THREE from 'three';
import { TOWER_BOSS_SWEETSPOT_DURATION_SEC, TowerWaveOreState } from '../game/TowerData';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { CHIBI_CATALOG, ChibiDef, getChibiById } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { ChibiFieldFxController } from './FieldMiner3D';
import { OreVariantKey } from './MineWorldPalette';
import { getGeodeGlowTexture, isSweetSpotWindowPure, OreBillboard2D } from './OrePit3D';
import { createTowerCityEnvironment, TowerCityEnvironmentHandle } from './TowerCityEnvironment3D';
import type { CyberShowcasePodiumHandle } from './FusionWorldPodium3D';
import {
  getChibiAttackStyle,
  type PlotAttackStyle,
  type SignatureProjectileArrival,
  SignatureProjectilePool3D,
} from './SignatureProjectilePool3D';
import { TierAttackVfxPool3D, type TierVfxHooks, type WorldPoint3 } from './TierAttackVfx3D';
import {
  BossGravityRockSeed,
  BossHaloArcHandle,
  buildTowerArenaStage,
  spawnTowerArenaShards,
  stepTowerBossFeetFx,
  stepTowerShardPool,
  stepTowerSpawnPodiums,
  type TowerShardParticle,
} from './TowerArenaStage3D';
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

const ARENA_CENTER_Z = -1.6;
const BOSS_CENTER_Z = ARENA_CENTER_Z - 3.25;
const SUMMON_RADIUS = 5.55;

const WAVE_ORE_POSITIONS: ReadonlyArray<[number, number]> = [
  [-3.7, ARENA_CENTER_Z + 1.55],
  [3.7, ARENA_CENTER_Z + 1.55],
  [-4.25, ARENA_CENTER_Z - 1.35],
  [4.25, ARENA_CENTER_Z - 1.35],
  [0, ARENA_CENTER_Z - 2.35],
];

export class TowerArena3D {
  public readonly group = new THREE.Group();
  public readonly clickables: THREE.Object3D[] = [];

  private readonly cityEnv: TowerCityEnvironmentHandle;
  private readonly monolithGroup = new THREE.Group();
  private bossChibiDef!: ChibiDef;
  private bossSprite!: ChibiSprite3D;
  private lastBossFloor = 0;
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

  private readonly eclipseOuterHalo: THREE.Mesh;
  private readonly eclipseCoronaMat: THREE.MeshBasicMaterial;
  private readonly eclipseHaloMat: THREE.MeshBasicMaterial;
  private readonly aiWireframeSphere: THREE.Mesh;
  private readonly aiGyroRing1: THREE.Mesh;
  private readonly aiGyroRing2: THREE.Mesh;
  private readonly summonPads: THREE.Mesh[] = [];
  private readonly spawnPodiums: CyberShowcasePodiumHandle[] = [];
  private readonly ownedGeos: THREE.BufferGeometry[] = [];
  private readonly ownedMats: THREE.Material[] = [];
  private readonly ownedTextures: THREE.Texture[] = [];

  private readonly fightersGroup = new THREE.Group();
  private readonly fighters = new Map<number, TowerChibiFighter>();
  private readonly impactFx = new AttackImpactFxController({ floorY: 0.11 });
  private readonly projectiles = new SignatureProjectilePool3D();
  private readonly tierVfx = new TierAttackVfxPool3D();
  private readonly targetPtsScratch: WorldPoint3[] = [];
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
  private readonly shardPool: TowerShardParticle[] = [];
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
  private lowQuality = false;

  constructor() {
    this.group.visible = false;

    // 1. Ruined Cyber City Highway, Central Meteor Crater, & Skyscraper Horizon
    this.cityEnv = createTowerCityEnvironment();
    this.group.add(this.cityEnv.group);

    const stage = buildTowerArenaStage({
      group: this.group,
      monolithGroup: this.monolithGroup,
      bossFeetFxGroup: this.bossFeetFxGroup,
      bossGravityRockSeeds: this.bossGravityRockSeeds,
      bossArcs: this.bossArcs,
      summonPads: this.summonPads,
      ownedGeos: this.ownedGeos,
      ownedMats: this.ownedMats,
      ownedTextures: this.ownedTextures,
      bossCenterZ: BOSS_CENTER_Z,
      getSpawnPos: (i) => this.getSpawnPos(i),
    });
    this.spawnPodiums.push(...stage.spawnPodiums);
    for (const f of this.fighters.values()) {
      f.spawnPos.copy(this.getSpawnPos(f.slotIndex));
    }
    this.bossGravityRocksInst = stage.bossGravityRocksInst;
    this.bossFloorPulseMesh = stage.bossFloorPulseMesh;
    this.bossFloorPulseMat = stage.bossFloorPulseMat;
    this.setBossChibi();
    this.eclipseOuterHalo = stage.eclipseOuterHalo;
    this.eclipseCoronaMat = stage.eclipseCoronaMat;
    this.eclipseHaloMat = stage.eclipseHaloMat;
    this.aiWireframeSphere = stage.aiWireframeSphere;
    this.aiGyroRing1 = stage.aiGyroRing1;
    this.aiGyroRing2 = stage.aiGyroRing2;

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
    this.group.add(this.projectiles.group);
    this.group.add(this.tierVfx.group);
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
    const topY = this.spawnPodiums[slotIndex]?.topY ?? 0.22;
    return new THREE.Vector3(
      Math.cos(ang) * SUMMON_RADIUS,
      0.08 + topY,
      ARENA_CENTER_Z + Math.sin(ang) * SUMMON_RADIUS
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
        sprite.group.position.copy(spawnPos);
        sprite.setAnimState('attack');
        sprite.setFacing(spawnPos.x <= 0 ? 1 : -1);
        sprite.setAccentColor(cfg.def.accentColor);
        sprite.setLowQuality(this.lowQuality);
        this.fightersGroup.add(sprite.group);
        const fx = new ChibiFieldFxController(sprite.group, cfg.def.accentColor, cfg.slotIndex);
        fx.setLowQuality(this.lowQuality);

        existing = {
          slotIndex: cfg.slotIndex,
          def: cfg.def,
          style: getChibiAttackStyle(cfg.def),
          sprite,
          fx,
          spawnPos,
          targetOreIndex: -1,
          dmg: cfg.dmg,
          attackInterval: Math.max(0.32, 0.85 / Math.max(1, cfg.miningMult)),
          attackCooldown: 0.14 + cfg.slotIndex * 0.08,
          comboStep: 0,
          enchantId: null,
          colorHex: cfg.def.accentColor,
        };
        this.fighters.set(cfg.slotIndex, existing);
      } else {
        existing.dmg = Math.max(1, cfg.dmg);
        existing.attackInterval = Math.max(0.32, 0.85 / Math.max(1, cfg.miningMult));
      }

      this.applyFighterEnchant(existing, cfg.enchantId);
    }

    for (let i = 0; i < this.summonPads.length; i++) {
      const mat = this.summonPads[i].material as THREE.MeshBasicMaterial;
      const fighter = this.fighters.get(i);
      const active = Boolean(fighter);
      mat.opacity = active ? 0.34 : 0.12;
      if (fighter) mat.color.set(fighter.colorHex);

      const pod = this.spawnPodiums[i];
      if (pod) {
        const accent = fighter?.colorHex ?? '#38bdf8';
        pod.ringMat.color.set(accent);
        pod.ringMat.emissive.set(accent);
        pod.ringMat.emissiveIntensity = active ? 1.15 : 0.55;
        pod.holoDiscMat.color.set(accent);
        pod.sigilMat.color.set(accent);
        pod.auraGroup.visible = active;
        if (active) {
          pod.auraVeilMat.uniforms.uColorA.value.set(accent);
          pod.auraOuterVeilMat.uniforms.uColorB.value.set(accent);
          pod.particleMat.uniforms.uColorA.value.set(accent);
        }
      }
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
    this.projectiles.clear();
    for (const f of this.fighters.values()) {
      f.sprite.group.position.copy(f.spawnPos);
      f.sprite.setAnimState(this.paused ? 'aura' : 'attack');
      f.sprite.setFacing(f.spawnPos.x <= 0 ? 1 : -1);
      f.targetOreIndex = -1;
      f.attackCooldown = 0.14 + f.slotIndex * 0.08;
    }
  }

  private pickRandomTwinBossDef(excludeId?: string): ChibiDef {
    const twins = CHIBI_CATALOG.filter((c) => c.rarity === 'twin');
    const pool = excludeId && twins.length > 1 ? twins.filter((c) => c.id !== excludeId) : twins;
    const list = pool.length > 0 ? pool : CHIBI_CATALOG;
    return list[Math.floor(Math.random() * list.length)] ?? CHIBI_CATALOG[0];
  }

  public setBossChibi(bossChibiId?: string): void {
    const requested = bossChibiId ? getChibiById(bossChibiId) : undefined;
    const nextDef =
      requested && requested.rarity === 'twin'
        ? requested
        : this.pickRandomTwinBossDef(this.bossChibiDef?.id);
    if (this.bossSprite && this.bossChibiDef?.id === nextDef.id) return;

    if (this.bossSprite) {
      this.monolithGroup.remove(this.bossSprite.group);
      this.bossSprite.dispose();
    }
    this.bossChibiDef = nextDef;
    const sprite = new ChibiSprite3D(nextDef, 1.24, 0);
    sprite.group.position.set(0, 0.04, 0);
    sprite.group.scale.setScalar(3.35);
    sprite.setFacing(-1);
    sprite.setAnimState('aura');
    sprite.setLowQuality(this.lowQuality);
    sprite.setAccentColor(nextDef.accentColor);
    this.monolithGroup.add(sprite.group);
    this.bossSprite = sprite;

    this.bossFloorPulseMat.color.set(nextDef.accentColor);
    for (let i = 0; i < this.bossArcs.length; i++) {
      this.bossArcs[i].mat.color.set(i % 2 === 0 ? nextDef.accentColor : '#fde68a');
    }
  }

  public getCurrentBossChibi(): ChibiDef {
    return this.bossChibiDef;
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
    bossChibiId?: string;
  }): void {
    const floorChanged = opts.floor !== this.lastFloor;
    const waveChanged = opts.wave !== this.lastWave;
    if (opts.bossChibiId) {
      this.setBossChibi(opts.bossChibiId);
    } else if (opts.isBossWave && opts.floor !== this.lastBossFloor) {
      this.setBossChibi();
    }
    if (opts.isBossWave) {
      this.lastBossFloor = opts.floor;
    }

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
          this.projectiles.clear();
          for (const f of this.fighters.values()) {
            f.targetOreIndex = -1;
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

  public setTierVfxHooks(hooks: TierVfxHooks): void {
    this.tierVfx.setHooks(hooks);
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.impactFx.setLowQuality(low);
    this.projectiles.setLowQuality(low);
    this.tierVfx.setLowQuality(low);
    this.bossSprite?.setLowQuality(low);
    for (let i = 0; i < this.spawnPodiums.length; i++) {
      this.spawnPodiums[i].setLowQuality(low);
    }
    for (const f of this.fighters.values()) {
      f.sprite.setLowQuality(low);
      f.fx.setLowQuality(low);
    }
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
    const safeCount = this.lowQuality ? (isShatter ? 3 : 1) : count;
    spawnTowerArenaShards(lx, ly, lz, colorHex, safeCount, isShatter, isBoss, {
      shardPool: this.shardPool,
      shardGroup: this.shardGroup,
      sharedShardGeo: this.sharedShardGeo,
      sharedRockGeo: this.sharedRockGeo,
      rockChipMat: this.rockChipMat,
      maxCap: this.lowQuality ? 8 : 64,
    });
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
      if (camera) {
        this.bossSprite.update(safeDt, elapsed, camera);
      }

      stepTowerBossFeetFx(elapsed, {
        bossArcs: this.bossArcs,
        bossGravityRockSeeds: this.bossGravityRockSeeds,
        bossGravityDummy: this.bossGravityDummy,
        bossGravityRocksInst: this.bossGravityRocksInst,
        bossFloorPulseMesh: this.bossFloorPulseMesh,
        bossFloorPulseMat: this.bossFloorPulseMat,
      });
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

    stepTowerShardPool(safeDt, { shardPool: this.shardPool, shardGroup: this.shardGroup });
    stepTowerSpawnPodiums(elapsed, this.spawnPodiums);

    if (this.paused) {
      this.projectiles.clear();
      this.tierVfx.clear();
    }

    const handleProjectileArrival = (a: SignatureProjectileArrival): void => {
      if (this.paused) return;
      const fighter = this.fighters.get(a.slotIndex);
      const speedScale = Math.max(0.48, Math.min(1.05, a.attackInterval / 0.85));
      if (a.isBoss) {
        if (!this.bossWave) return;
        this.bounceTimer = Math.max(this.bounceTimer, 0.09);
        if (fighter) {
          const bossPt: WorldPoint3 = { x: 0, y: 0.8, z: BOSS_CENTER_Z + 0.85 };
          this.tierVfx.fireTierAttack({
            rarity: fighter.def.rarity,
            chibiId: fighter.def.id,
            colorHex: a.accentColor,
            target: bossPt,
            allTargets: [bossPt],
            comboStep: a.comboStep,
            speedScale,
          });
        }
        this.impactFx.spawnImpact({
          targetX: a.ex,
          targetY: 2.45,
          targetZ: BOSS_CENTER_Z + 1.05,
          accentColor: a.accentColor,
          comboStep: a.comboStep,
          attackerX: a.sx,
          attackerZ: a.sz,
          shockwaveScale: 1.45,
        });
        this.spawnTowerShardsAt(a.ex, 2.2, BOSS_CENTER_Z + 1.05, a.accentColor, 4, false, true);
        onFighterStrike?.({
          slotIndex: a.slotIndex,
          targetOreIndex: null,
          attackInterval: a.attackInterval,
          dmg: a.dmg,
          wx: a.ex,
          wy: a.ey,
          wz: ARENA_CENTER_Z + 0.45,
          accentColor: a.accentColor,
          comboStep: a.comboStep,
          attackerX: a.sx,
          attackerZ: a.sz,
        });
      } else {
        if (this.bossWave) return;
        let rock = this.waveRocks[a.targetId];
        if (!rock || !rock.alive) {
          rock = this.waveRocks.find((r) => r.alive) ?? rock;
        }
        if (!rock || !rock.alive) return;
        if (fighter) {
          this.targetPtsScratch.length = 0;
          for (let ri = 0; ri < this.waveRocks.length; ri++) {
            const wr = this.waveRocks[ri];
            if (wr.alive) this.targetPtsScratch.push({ x: wr.x, y: 0.45, z: wr.z });
          }
          this.tierVfx.fireTierAttack({
            rarity: fighter.def.rarity,
            chibiId: fighter.def.id,
            colorHex: a.accentColor,
            target: { x: rock.x, y: 0.45, z: rock.z },
            allTargets: this.targetPtsScratch,
            comboStep: a.comboStep,
            speedScale,
          });
        }
        onFighterStrike?.({
          slotIndex: a.slotIndex,
          targetOreIndex: rock.index,
          attackInterval: a.attackInterval,
          dmg: a.dmg,
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

    // Update Stationary Podium Chibi Fighters firing signature projectiles
    for (const f of this.fighters.values()) {
      f.fx.update(elapsed);
      f.colorHex = f.fx.getAccentColor();
      f.sprite.setAccentColor(f.colorHex);
      const pos = f.sprite.group.position;
      pos.copy(f.spawnPos);

      if (this.paused) {
        f.sprite.setAnimState('aura');
      } else if (!this.bossWave) {
        const targetRock = this.pickTargetOreForFighter(f);
        if (!targetRock) {
          f.sprite.setAnimState('idle');
        } else {
          if (Math.abs(targetRock.x - pos.x) > 0.04) {
            f.sprite.setFacing(targetRock.x >= pos.x ? 1 : -1);
          }
          f.sprite.setAnimState('attack');
          f.attackCooldown -= safeDt;
          if (f.attackCooldown <= 0) {
            f.attackCooldown = f.attackInterval;
            const step = f.comboStep;
            f.comboStep = (f.comboStep + 1) % 3;
            this.targetPtsScratch.length = 0;
            for (let ri = 0; ri < this.waveRocks.length; ri++) {
              const wr = this.waveRocks[ri];
              if (wr.alive) this.targetPtsScratch.push({ x: wr.x, y: 0.45, z: wr.z });
            }
            const targetPt: WorldPoint3 = { x: targetRock.x, y: 0.45, z: targetRock.z };
            const blitzDur = Math.min(Math.max(0.42, f.attackInterval * 0.92), f.def.rarity === 'omega' ? 1.1 : 0.82);

            f.sprite.triggerAttack(Math.min(0.44, f.attackInterval * 0.75), step);
            f.sprite.triggerBlitz({
              rarity: f.def.rarity,
              targetX: targetRock.x,
              targetY: 0.45,
              targetZ: targetRock.z,
              allTargets: this.targetPtsScratch,
              durationSec: blitzDur,
              colorHex: f.colorHex,
            });
            this.tierVfx.fireAnticipation(f.def.rarity, f.colorHex, targetPt, this.targetPtsScratch);

            this.projectiles.launch(
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
        if (Math.abs(-pos.x) > 0.04) {
          f.sprite.setFacing(pos.x <= 0 ? 1 : -1);
        }
        f.sprite.setAnimState('attack');
        f.attackCooldown -= safeDt;
        if (f.attackCooldown <= 0) {
          f.attackCooldown = f.attackInterval;
          const step = f.comboStep;
          f.comboStep = (f.comboStep + 1) % 3;
          const bossPt: WorldPoint3 = { x: 0, y: 0.8, z: BOSS_CENTER_Z + 0.85 };
          const blitzDur = Math.min(Math.max(0.42, f.attackInterval * 0.92), f.def.rarity === 'omega' ? 1.1 : 0.82);

          f.sprite.triggerAttack(Math.min(0.44, f.attackInterval * 0.75), step);
          f.sprite.triggerBlitz({
            rarity: f.def.rarity,
            targetX: bossPt.x,
            targetY: bossPt.y,
            targetZ: bossPt.z,
            allTargets: [bossPt],
            durationSec: blitzDur,
            colorHex: f.colorHex,
          });
          this.tierVfx.fireAnticipation(f.def.rarity, f.colorHex, bossPt, [bossPt]);

          const bossTargetX = (Math.random() - 0.5) * 0.65;
          const bossTargetY = 2.15 + Math.random() * 0.45;
          this.projectiles.launch(
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
              ez: BOSS_CENTER_Z + 0.85,
              attackInterval: f.attackInterval,
              isBoss: true,
            },
            handleProjectileArrival
          );
        }
      }

      if (camera) {
        f.sprite.update(safeDt, elapsed, camera);
      }
    }

    if (!this.paused) {
      this.projectiles.step(safeDt, camera, handleProjectileArrival);
      if (camera) {
        this.tierVfx.update(safeDt, camera);
      }
    }
  }

  public dispose(): void {
    this.impactFx.dispose();
    this.projectiles.dispose();
    this.tierVfx.dispose();
    for (const p of this.shardPool) {
      this.shardGroup.remove(p.mesh);
      if (p.ownsMat) (p.mesh.material as THREE.Material).dispose();
    }
    this.shardPool.length = 0;
    this.sharedShardGeo.dispose();
    this.sharedRockGeo.dispose();
    this.rockChipMat.dispose();
    this.bossSprite.dispose();
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

    for (const geo of this.ownedGeos) geo.dispose();
    for (const mat of this.ownedMats) mat.dispose();
    for (const tex of this.ownedTextures) {
      tex.dispose();
    }
    this.ownedGeos.length = 0;
    this.ownedMats.length = 0;
    this.ownedTextures.length = 0;
    this.spawnPodiums.length = 0;
  }
}
