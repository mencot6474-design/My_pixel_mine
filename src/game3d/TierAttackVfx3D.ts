import * as THREE from 'three';
import type { FusionChibiVariant } from './MeshFx3D';
import {
  getFlamePuffTexture,
  getGroundCrackTexture,
  getHitSparkStarTexture,
  getRuneSealTexture,
  getShockwaveRingTexture,
  getSparkStreakTexture,
} from './ProceduralTextures3D';
import {
  BARRAGE_BEAT_WEIGHTS,
  BARRAGE_FOLLOWUP_DELAYS,
  buildTierMotionWaypoints,
  CHIBI_ATTACK_ANIM_SEC,
  CHIBI_BLITZ_SHADOW_SEC,
  computeAttackVfxSpeedScale,
  computeSpotlightMaxChargeSec,
  getRaritySecondaryColor,
  isWideAoeRarity,
  resolvePitBounds,
  sampleTierMotionWaypoints,
  splitBarrageDamage,
  SpotlightAttackQueue,
  type SampledMotionFrame,
  type TierAttackFireOpts,
  type TierMotionWaypoint,
  type TierVfxHooks,
  type WorldPoint3,
} from './TierMotionPath3D';
import {
  fireTierAttackChoreography,
  type TierVfxChoreoContext,
} from './TierVfxChoreography3D';
import {
  createPitArenaClipUniforms,
  patchShaderMaterialWithPitClip,
  patchTierVfxPoolMaterialsWithPitClip,
  type PitArenaClipUniforms,
} from './TierVfxPitClip3D';
import { CrimsonRoninSkillVfxPool } from './skills/crimsonRoninSkillVfx3D';
import { ObsidianSovereignSkillVfxPool } from './skills/obsidianSovereignSkillVfx3D';
import { ClockworkTwinsSkillVfxPool } from './skills/clockworkTwinsSkillVfx3D';
import { LullabyTwinsSkillVfxPool } from './skills/lullabyTwinsSkillVfx3D';
import { NocturneTwinsSkillVfxPool } from './skills/nocturneTwinsSkillVfx3D';
import { HalcyonTwinsSkillVfxPool } from './skills/halcyonTwinsSkillVfx3D';
import { YukikageTwinsSkillVfxPool } from './skills/yukikageTwinsSkillVfx3D';
import {
  createTierVfxPoolCollections,
  firePodiumWeaponCastChoreography,
  type PodiumWeaponCastOpts,
} from './TierVfxPoolsInit3D';
import {
  type BeamSlot,
  type BoltSlot,
  type ClockDialSlot,
  type ClocktowerSlot,
  type DebrisSlot,
  type DomeSlot,
  type FusionPropSlot,
  type HalcyonPillarSlot,
  type HalcyonRainSlot,
  type LullabyCrescentMoonSlot,
  type LullabyMirrorCageSlot,
  type NocturneCraterSlot,
  type NocturneEclipseSlot,
  type OrbSlot,
  type QuadSlot,
  type RiftSlot,
  type SlashSlot,
  stepTierAttackVfxPool,
  type TierVfxPoolUpdateState,
  type VortexSlot,
  type WeaponSlot,
} from './TierVfxUpdate3D';

export {
  BARRAGE_BEAT_WEIGHTS,
  BARRAGE_FOLLOWUP_DELAYS,
  buildTierMotionWaypoints,
  CHIBI_ATTACK_ANIM_SEC,
  CHIBI_BLITZ_SHADOW_SEC,
  computeAttackVfxSpeedScale,
  computeSpotlightMaxChargeSec,
  getRaritySecondaryColor,
  isWideAoeRarity,
  sampleTierMotionWaypoints,
  splitBarrageDamage,
  SpotlightAttackQueue,
};
export type {
  SampledMotionFrame,
  TierAttackFireOpts,
  TierMotionWaypoint,
  TierVfxHooks,
  WorldPoint3,
};

/**
 * Pooled multi-primitive 3D Anime-Vanguard Tier VFX System reused across Mine Pit, Tower & Omega arenas.
 * Uses pure THREE.Mesh pools (zero InstancedMesh side-effects) + dt-scaled timeline cues.
 */
export class TierAttackVfxPool3D {
  public readonly group = new THREE.Group();

  private readonly starTex: THREE.Texture;
  private readonly streakTex: THREE.Texture;
  private readonly ringTex: THREE.Texture;
  private readonly runeTex: THREE.Texture;
  private readonly crackTex: THREE.Texture;
  private readonly flameTex: THREE.Texture;

  private readonly sharedGeos: THREE.BufferGeometry[];
  private readonly slashes: SlashSlot[];
  private readonly domes: DomeSlot[];
  private readonly beams: BeamSlot[];
  private readonly vortices: VortexSlot[];
  private readonly rifts: RiftSlot[];
  private readonly weapons: WeaponSlot[];
  private readonly clockDials: ClockDialSlot[];
  private readonly frostSeals: ClockDialSlot[];
  private readonly lullabySeals: ClockDialSlot[];
  private readonly halcyonSeals: ClockDialSlot[];
  private readonly fusionSeals: Record<FusionChibiVariant, ClockDialSlot[]>;
  private readonly fusionProps: FusionPropSlot[];
  private readonly halcyonPillars: HalcyonPillarSlot[];
  private readonly halcyonRain: HalcyonRainSlot[];
  private readonly nocturneEclipses: NocturneEclipseSlot[];
  private readonly nocturneCraters: NocturneCraterSlot[];
  private readonly lullabyMirrorCages: LullabyMirrorCageSlot[];
  private readonly lullabyCrescentMoons: LullabyCrescentMoonSlot[];
  private readonly clocktowers: ClocktowerSlot[];
  private readonly arrowGeo: THREE.BufferGeometry;
  private readonly bladeGeo: THREE.BufferGeometry;
  private readonly boltSegs: BoltSlot[];
  private readonly debris: DebrisSlot[];
  private readonly quads: QuadSlot[];
  private readonly orbs: OrbSlot[];

  private readonly events: Array<{ delay: number; fn: () => void }> = [];
  private hooks: TierVfxHooks = {};
  private lowQuality = false;
  private time = 0;
  private activeTargetFloorY = 0;
  private disposed = false;

  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3(0, 1, 0);
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly pitClipUniforms: PitArenaClipUniforms = createPitArenaClipUniforms();
  private readonly crimsonRoninSkillPool: CrimsonRoninSkillVfxPool;
  private readonly obsidianSovereignSkillPool: ObsidianSovereignSkillVfxPool;
  private readonly clockworkTwinsSkillPool: ClockworkTwinsSkillVfxPool;
  private readonly lullabyTwinsSkillPool: LullabyTwinsSkillVfxPool;
  private readonly nocturneTwinsSkillPool: NocturneTwinsSkillVfxPool;
  private readonly halcyonTwinsSkillPool: HalcyonTwinsSkillVfxPool;
  private readonly yukikageTwinsSkillPool: YukikageTwinsSkillVfxPool;
  private readonly updateState: TierVfxPoolUpdateState;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    this.starTex = getHitSparkStarTexture();
    this.streakTex = getSparkStreakTexture();
    this.ringTex = getShockwaveRingTexture();
    this.runeTex = getRuneSealTexture();
    this.crackTex = getGroundCrackTexture();
    this.flameTex = getFlamePuffTexture();

    const pools = createTierVfxPoolCollections(this.group, this.streakTex);
    this.sharedGeos = pools.sharedGeos;
    this.slashes = pools.slashes;
    this.domes = pools.domes;
    this.beams = pools.beams;
    this.vortices = pools.vortices;
    this.rifts = pools.rifts;
    this.weapons = pools.weapons;
    this.clockDials = pools.clockDials;
    this.frostSeals = pools.frostSeals;
    this.lullabySeals = pools.lullabySeals;
    this.halcyonSeals = pools.halcyonSeals;
    this.fusionSeals = pools.fusionSeals;
    this.fusionProps = pools.fusionProps;
    this.halcyonPillars = pools.halcyonPillars;
    this.halcyonRain = pools.halcyonRain;
    this.nocturneEclipses = pools.nocturneEclipses;
    this.nocturneCraters = pools.nocturneCraters;
    this.lullabyMirrorCages = pools.lullabyMirrorCages;
    this.lullabyCrescentMoons = pools.lullabyCrescentMoons;
    this.clocktowers = pools.clocktowers;
    this.arrowGeo = pools.arrowGeo;
    this.bladeGeo = pools.bladeGeo;
    this.boltSegs = pools.boltSegs;
    this.debris = pools.debris;
    this.quads = pools.quads;
    this.orbs = pools.orbs;

    this.updateState = {
      disposed: false,
      time: 0,
      events: this.events,
      slashes: this.slashes,
      domes: this.domes,
      beams: this.beams,
      vortices: this.vortices,
      rifts: this.rifts,
      weapons: this.weapons,
      clockDials: this.clockDials,
      frostSeals: this.frostSeals,
      lullabySeals: this.lullabySeals,
      halcyonSeals: this.halcyonSeals,
      fusionSeals: this.fusionSeals,
      fusionProps: this.fusionProps,
      halcyonPillars: this.halcyonPillars,
      halcyonRain: this.halcyonRain,
      nocturneEclipses: this.nocturneEclipses,
      nocturneCraters: this.nocturneCraters,
      lullabyMirrorCages: this.lullabyMirrorCages,
      lullabyCrescentMoons: this.lullabyCrescentMoons,
      clocktowers: this.clocktowers,
      boltSegs: this.boltSegs,
      debris: this.debris,
      quads: this.quads,
      orbs: this.orbs,
      flameTex: this.flameTex,
      tmpDir: this.tmpDir,
      tmpUp: this.tmpUp,
      spawnDebrisBurst: (x, y, z, c, s, cnt) => this.spawnDebrisBurst(x, y, z, c, s, cnt),
      spawnQuad: (o) => this.spawnQuad(o),
    };

    patchTierVfxPoolMaterialsWithPitClip(pools, this.pitClipUniforms);

    this.crimsonRoninSkillPool = new CrimsonRoninSkillVfxPool(this.hooks);
    this.obsidianSovereignSkillPool = new ObsidianSovereignSkillVfxPool(this.hooks);
    this.clockworkTwinsSkillPool = new ClockworkTwinsSkillVfxPool(this.hooks);
    this.lullabyTwinsSkillPool = new LullabyTwinsSkillVfxPool(this.hooks);
    this.nocturneTwinsSkillPool = new NocturneTwinsSkillVfxPool(this.hooks);
    this.halcyonTwinsSkillPool = new HalcyonTwinsSkillVfxPool(this.hooks);
    this.yukikageTwinsSkillPool = new YukikageTwinsSkillVfxPool(this.hooks);
    this.group.add(
      this.crimsonRoninSkillPool.group,
      this.obsidianSovereignSkillPool.group,
      this.clockworkTwinsSkillPool.group,
      this.lullabyTwinsSkillPool.group,
      this.nocturneTwinsSkillPool.group,
      this.halcyonTwinsSkillPool.group,
      this.yukikageTwinsSkillPool.group
    );
    for (const mat of this.crimsonRoninSkillPool.getMaterials()) {
      patchShaderMaterialWithPitClip(mat, this.pitClipUniforms);
    }
    for (const mat of this.obsidianSovereignSkillPool.getMaterials()) {
      patchShaderMaterialWithPitClip(mat, this.pitClipUniforms);
    }
    for (const mat of this.clockworkTwinsSkillPool.getMaterials()) {
      patchShaderMaterialWithPitClip(mat, this.pitClipUniforms);
    }
    for (const mat of this.lullabyTwinsSkillPool.getMaterials()) {
      patchShaderMaterialWithPitClip(mat, this.pitClipUniforms);
    }
    for (const mat of this.nocturneTwinsSkillPool.getMaterials()) {
      patchShaderMaterialWithPitClip(mat, this.pitClipUniforms);
    }
    for (const mat of this.halcyonTwinsSkillPool.getMaterials()) {
      patchShaderMaterialWithPitClip(mat, this.pitClipUniforms);
    }
    for (const mat of this.yukikageTwinsSkillPool.getMaterials()) {
      patchShaderMaterialWithPitClip(mat, this.pitClipUniforms);
    }
  }

  /** Enables or disables circular pit wall/floor shader clipping (enabled in Mine Pit, disabled in Tower/Omega). */
  public setPitBounds(bounds: { centerX: number; floorY: number; centerZ: number; radius: number } | null): void {
    if (!bounds) {
      this.pitClipUniforms.uPitClipActive.value = 0;
      this.pitClipUniforms.uPitRadius.value = 999;
      this.pitClipUniforms.uPitFloorY.value = -999;
      return;
    }
    this.pitClipUniforms.uPitCenter.value.set(bounds.centerX, bounds.floorY, bounds.centerZ);
    this.pitClipUniforms.uPitFloorY.value = bounds.floorY;
    this.pitClipUniforms.uPitRadius.value = bounds.radius;
    this.pitClipUniforms.uPitClipActive.value = 1;
  }

  private getChoreoContext(): TierVfxChoreoContext {
    return {
      lowQuality: this.lowQuality,
      hooks: this.hooks,
      ringTex: this.ringTex,
      crackTex: this.crackTex,
      after: (delay, fn) => this.after(delay, fn),
      spawnSlash: (o) => this.spawnSlash(o),
      spawnClockDial: (o) => this.spawnClockDial(o),
      spawnFrostSeal: (o) => this.activateFloorSeal(this.frostSeals, o),
      spawnLullabySeal: (o) => this.activateFloorSeal(this.lullabySeals, o),
      spawnHalcyonSeal: (o) => this.activateFloorSeal(this.halcyonSeals, o),
      spawnFusionSeal: (o) => this.activateFloorSeal(this.fusionSeals[o.variant], o),
      spawnFusionProp: (o) => this.spawnFusionProp(o),
      spawnHalcyonRailPillars: (o) => this.spawnHalcyonRailPillars(o),
      spawnHalcyonRainWeapon: (o) => this.spawnHalcyonRainWeapon(o),
      spawnNocturneEclipseMonolith: (o) => this.spawnNocturneEclipseMonolith(o),
      spawnNocturneCrater: (o) => this.spawnNocturneCrater(o),
      spawnLullabyMirrorMoonCataclysm: (o) => this.spawnLullabyMirrorMoonCataclysm(o),
      spawnInvertedClocktower: (o) => this.spawnInvertedClocktower(o),
      spawnDome: (o) => this.spawnDome(o),
      spawnBeam: (o) => this.spawnBeam(o),
      spawnVortex: (o) => this.spawnVortex(o),
      spawnRift: (o) => this.spawnRift(o),
      spawnWeapon: (o) => this.spawnWeapon(o),
      spawnDirectedWeapon: (k, f, t, c, s, l, cb) => this.spawnDirectedWeapon(k, f, t, c, s, l, cb),
      spawnLightning: (a, b, c, w, l) => this.spawnLightning(a, b, c, w, l),
      spawnDebrisBurst: (x, y, z, c, s, cnt) => this.spawnDebrisBurst(x, y, z, c, s, cnt),
      spawnQuad: (o) => this.spawnQuad(o),
      spawnOrb: (o) => this.spawnOrb(o),
      spawnSparks: (x, y, z, c, s, cnt, spd) => this.spawnSparks(x, y, z, c, s, cnt, spd),
      fireCrimsonRoninSakuga: (o) => this.crimsonRoninSkillPool.fire(o),
      fireObsidianSovereignSakuga: (o) => this.obsidianSovereignSkillPool.fire(o),
      fireClockworkTwinsSakuga: (o) => this.clockworkTwinsSkillPool.fire(o),
      fireLullabyTwinsSakuga: (o) => this.lullabyTwinsSkillPool.fire(o),
      fireNocturneTwinsSakuga: (o) => this.nocturneTwinsSkillPool.fire(o),
      fireHalcyonTwinsSakuga: (o) => this.halcyonTwinsSkillPool.fire(o),
      fireYukikageTwinsSakuga: (o) => this.yukikageTwinsSkillPool.fire(o),
    };
  }

  public setHooks(hooks: TierVfxHooks): void {
    this.hooks = hooks;
    this.crimsonRoninSkillPool.setHooks(hooks);
    this.obsidianSovereignSkillPool.setHooks(hooks);
    this.clockworkTwinsSkillPool.setHooks(hooks);
    this.lullabyTwinsSkillPool.setHooks(hooks);
    this.nocturneTwinsSkillPool.setHooks(hooks);
    this.halcyonTwinsSkillPool.setHooks(hooks);
    this.yukikageTwinsSkillPool.setHooks(hooks);
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.crimsonRoninSkillPool.setLowQuality(low);
    this.obsidianSovereignSkillPool.setLowQuality(low);
    this.clockworkTwinsSkillPool.setLowQuality(low);
    this.lullabyTwinsSkillPool.setLowQuality(low);
    this.nocturneTwinsSkillPool.setLowQuality(low);
    this.halcyonTwinsSkillPool.setLowQuality(low);
    this.yukikageTwinsSkillPool.setLowQuality(low);
  }

  public clear(): void {
    this.events.length = 0;
    const resetArr = (arr: ReadonlyArray<{ active: boolean; mesh: THREE.Object3D }>): void => {
      for (let i = 0; i < arr.length; i++) {
        arr[i].active = false;
        arr[i].mesh.visible = false;
      }
    };
    resetArr(this.slashes);
    resetArr(this.domes);
    resetArr(this.beams);
    resetArr(this.vortices);
    resetArr(this.rifts);
    resetArr(this.weapons);
    resetArr(this.clockDials);
    resetArr(this.frostSeals);
    resetArr(this.lullabySeals);
    resetArr(this.halcyonSeals);
    for (const sealList of Object.values(this.fusionSeals)) resetArr(sealList);
    resetArr(this.fusionProps);
    resetArr(this.halcyonPillars);
    resetArr(this.halcyonRain);
    resetArr(this.nocturneEclipses);
    resetArr(this.nocturneCraters);
    resetArr(this.lullabyMirrorCages);
    resetArr(this.lullabyCrescentMoons);
    resetArr(this.clocktowers);
    resetArr(this.boltSegs);
    resetArr(this.debris);
    resetArr(this.quads);
    resetArr(this.orbs);
    this.crimsonRoninSkillPool.clear();
    this.obsidianSovereignSkillPool.clear();
    this.clockworkTwinsSkillPool.clear();
    this.lullabyTwinsSkillPool.clear();
    this.nocturneTwinsSkillPool.clear();
    this.halcyonTwinsSkillPool.clear();
    this.yukikageTwinsSkillPool.clear();
  }

  private after(delay: number, fn: () => void): void {
    if (delay <= 0.001) fn();
    else this.events.push({ delay, fn });
  }

  private spawnSlash(opts: {
    x: number; y: number; z: number; color: string; coreColor?: string;
    rx?: number; ry?: number; rz?: number; s0?: number; s1?: number; life?: number; spinSpeed?: number; darkCore?: boolean; shaderMode?: number;
  }): void {
    const slot = this.slashes.find((s) => !s.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.34;
    slot.s0 = opts.s0 ?? 1.5;
    slot.s1 = opts.s1 ?? 2.7;
    slot.spinSpeed = opts.spinSpeed ?? 3.0;
    const minY =
      this.pitClipUniforms.uPitClipActive.value > 0.5
        ? this.pitClipUniforms.uPitFloorY.value + Math.min(slot.s1, 5.6) * 0.2 + 0.16
        : -Infinity;
    slot.mesh.position.set(opts.x, Math.max(opts.y, minY), opts.z);
    slot.mesh.rotation.set(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0);
    slot.mesh.scale.setScalar(slot.s0);
    const mode = opts.shaderMode ?? (opts.darkCore ? 1 : 0);
    slot.mat.blending = THREE.NormalBlending;
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uProgress.value = 0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mat.uniforms.uSeed.value = Math.random() * 20;
    if (slot.mat.uniforms.uDarkCore) slot.mat.uniforms.uDarkCore.value = opts.darkCore ? 1.0 : 0.0;
    if (slot.mat.uniforms.uMode) slot.mat.uniforms.uMode.value = mode;
    slot.mesh.visible = true;
  }

  private spawnClockDial(opts: {
    x: number; y: number; z: number; color?: string; coreColor?: string; s0?: number; s1?: number; life?: number;
  }): void {
    const slot = this.clockDials.find((d) => !d.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.9;
    slot.s0 = opts.s0 ?? 2.0;
    slot.s1 = opts.s1 ?? 7.4;
    slot.mesh.position.set(opts.x, opts.y, opts.z);
    slot.mesh.scale.setScalar(slot.s0);
    slot.mat.uniforms.uColor.value.set(opts.color ?? '#f59e0b');
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#2dd4bf');
    slot.mat.uniforms.uProgress.value = 0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private activateFloorSeal(
    pool: ClockDialSlot[],
    opts: { x: number; y: number; z: number; s0?: number; s1?: number; life?: number }
  ): void {
    const slot = pool.find((d) => !d.active) ?? pool[0];
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 1.15;
    slot.s0 = opts.s0 ?? 2.0;
    slot.s1 = opts.s1 ?? 9.2;
    slot.mat.uniforms.uTime.value = this.time;
    slot.mat.uniforms.uProgress.value = 0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.position.set(opts.x, opts.y, opts.z);
    slot.mesh.scale.setScalar(slot.s0);
    slot.mesh.visible = true;
  }

  private spawnFusionProp(opts: {
    variant: FusionChibiVariant;
    mode: 'erupt' | 'plunge' | 'hover' | 'crown';
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startRot?: THREE.Euler;
    endRot?: THREE.Euler;
    scale?: number;
    life?: number;
    spinY?: number;
    seed?: number;
    onArrive?: () => void;
  }): void {
    const slot = this.fusionProps.find((f) => !f.active && f.variant === opts.variant)
      ?? this.fusionProps.find((f) => f.variant === opts.variant);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.65;
    slot.mode = opts.mode;
    slot.scaleTarget = opts.scale ?? 1;
    slot.spinY = opts.spinY ?? 0;
    slot.onArrive = opts.onArrive ?? null;
    slot.arrived = false;
    slot.startPos.copy(opts.startPos);
    slot.endPos.copy(opts.endPos);
    if (this.pitClipUniforms.uPitClipActive.value > 0.5 && slot.mode === 'plunge') {
      slot.endPos.y = Math.max(slot.endPos.y, this.pitClipUniforms.uPitFloorY.value + 0.12);
    }
    slot.startRot.copy(opts.startRot ?? new THREE.Euler());
    slot.endRot.copy(opts.endRot ?? slot.startRot);
    slot.mesh.position.copy(slot.startPos);
    slot.mesh.rotation.copy(slot.startRot);
    slot.mesh.scale.setScalar(opts.mode === 'erupt' ? 0.15 * slot.scaleTarget : slot.scaleTarget);
    slot.mat.uniforms.uTime.value = this.time;
    slot.mat.uniforms.uProgress.value = 0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mat.uniforms.uSeed.value = opts.seed ?? Math.random() * 6.28;
    slot.mesh.visible = true;
  }

  private spawnHalcyonRailPillars(opts: {
    cx: number; cy: number; cz: number; areaScale: number; life: number;
  }): THREE.Vector3[] {
    const crownCoords: THREE.Vector3[] = [];
    const as = opts.areaScale;
    const offsets: ReadonlyArray<[number, number]> = [
      [-3.15, -2.0],
      [3.15, -2.0],
      [-3.15, 2.0],
      [3.15, 2.0],
    ];
    for (let i = 0; i < 4; i++) {
      const [ox, oz] = offsets[i];
      const px = opts.cx + ox * as;
      const pz = opts.cz + oz * as;
      const p = this.halcyonPillars[i];
      p.active = true;
      p.age = 0;
      p.life = opts.life;
      p.baseY = opts.cy;
      p.baseScale = 0.96 * Math.max(0.75, as);
      p.charge = 0.5;
      p.mesh.position.set(px, opts.cy, pz);
      p.mesh.rotation.set(0, Math.atan2(opts.cx - px, opts.cz - pz), 0);
      p.mesh.scale.setScalar(p.baseScale * 0.4);
      p.mat.uniforms.uOpacity.value = 1;
      p.mat.uniforms.uCharge.value = 0.5;
      p.mesh.visible = true;
      crownCoords.push(new THREE.Vector3(px, opts.cy + 3.05 * p.baseScale, pz));
    }
    return crownCoords;
  }

  private spawnHalcyonRainWeapon(opts: {
    kind: 'arrow' | 'blade';
    fromVec: THREE.Vector3;
    toVec: THREE.Vector3;
    color: string;
    accentColor: string;
    scale: number;
    life: number;
    arriveFrac?: number;
    seed?: number;
    onArrive?: () => void;
  }): void {
    const slot = this.halcyonRain.find((r) => !r.active) ?? this.halcyonRain[0];
    if (!slot) return;
    slot.mesh.geometry = opts.kind === 'blade' ? this.bladeGeo : this.arrowGeo;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life;
    slot.arriveFrac = opts.arriveFrac ?? 0.26;
    slot.startPos.copy(opts.fromVec);
    slot.endPos.copy(opts.toVec);
    slot.arrived = false;
    slot.onArrive = opts.onArrive ?? null;

    this.tmpDir.subVectors(opts.toVec, opts.fromVec).normalize();
    this.tmpQuat.setFromUnitVectors(this.tmpUp, this.tmpDir);
    const twist = new THREE.Quaternion().setFromAxisAngle(this.tmpUp, (opts.seed ?? 0) * Math.PI * 2);
    this.tmpQuat.multiply(twist);
    slot.mesh.quaternion.copy(this.tmpQuat);
    slot.mesh.position.copy(opts.fromVec);
    slot.mesh.scale.setScalar(opts.scale);

    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uAccentColor.value.set(opts.accentColor);
    slot.mat.uniforms.uImpact.value = 0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mat.uniforms.uSeed.value = opts.seed ?? 0;
    slot.mesh.visible = true;
  }

  private spawnNocturneEclipseMonolith(opts: {
    cx: number; cy: number; cz: number; areaScale: number; life: number; onSever?: () => void;
  }): void {
    const ec = this.nocturneEclipses.find((slot) => !slot.active) ?? this.nocturneEclipses[0];
    if (!ec) return;
    ec.active = true;
    ec.age = 0;
    ec.life = opts.life;
    ec.baseY = opts.cy;
    ec.baseScale = 0.96 * Math.max(0.75, opts.areaScale);
    ec.severTriggered = false;
    ec.onSever = opts.onSever ?? null;
    ec.mesh.position.set(opts.cx, opts.cy, opts.cz - 0.85 * opts.areaScale);
    ec.mesh.rotation.set(0, 0, 0);
    ec.mesh.scale.setScalar(ec.baseScale * 0.4);
    ec.mat.uniforms.uCharge.value = 0;
    ec.mat.uniforms.uSever.value = 0;
    ec.mat.uniforms.uOpacity.value = 1;
    ec.mesh.visible = true;
  }

  private spawnNocturneCrater(opts: {
    x: number; y: number; z: number; s0: number; s1: number; life: number;
  }): void {
    const c = this.nocturneCraters.find((slot) => !slot.active) ?? this.nocturneCraters[0];
    if (!c) return;
    c.active = true;
    c.age = 0;
    c.life = opts.life;
    c.s0 = opts.s0;
    c.s1 = opts.s1;
    c.mat.uniforms.uProgress.value = 0;
    c.mat.uniforms.uOpacity.value = 1;
    c.mesh.position.set(opts.x, opts.y, opts.z);
    c.mesh.scale.setScalar(opts.s0);
    c.mesh.visible = true;
  }

  private spawnLullabyMirrorMoonCataclysm(opts: {
    cx: number; cy: number; cz: number; areaScale: number;
    lockDur: number; shatterDur: number;
    onMoonStrike?: () => void; onShatter?: () => void;
  }): void {
    const as = opts.areaScale;
    const cage = this.lullabyMirrorCages[0];
    if (cage) {
      cage.active = true;
      cage.age = 0;
      cage.lockDur = opts.lockDur;
      cage.shatterDur = opts.shatterDur;
      cage.baseScale = 0.88 * as;
      cage.shattering = false;
      cage.shatterAge = 0;
      cage.onShatter = opts.onShatter ?? null;
      cage.mat.uniforms.uCrack.value = 0;
      cage.mat.uniforms.uShatter.value = 0;
      cage.mat.uniforms.uOpacity.value = 1;
      cage.mesh.position.set(opts.cx, opts.cy + 0.04, opts.cz);
      cage.mesh.rotation.set(0, 0.2, 0);
      cage.mesh.scale.setScalar(0.15 * as);
      cage.mesh.visible = true;
    }

    const moon = this.lullabyCrescentMoons[0];
    if (moon) {
      moon.active = true;
      moon.age = -0.08 * opts.lockDur;
      moon.approachDur = opts.lockDur * 0.36;
      moon.cleaveHoldDur = opts.lockDur * 0.56;
      moon.slashThroughDur = opts.shatterDur * 0.85;
      moon.baseScale = 1.05 * as;
      moon.hitCage = false;
      moon.onHitCage = opts.onMoonStrike ?? null;
      moon.startPos.set(opts.cx + 0.8 * as, opts.cy + 6.8, opts.cz - 0.15);
      moon.midPos.set(opts.cx, opts.cy + 2.1, opts.cz + 0.1);
      moon.endPos.set(opts.cx, opts.cy + 0.45, opts.cz + 0.15);
      moon.mesh.position.copy(moon.startPos);
      moon.mesh.rotation.set(0.12, 0.1, 0);
      moon.mesh.scale.setScalar(moon.baseScale);
      moon.mat.uniforms.uCharge.value = 0;
      moon.mat.uniforms.uOpacity.value = 0;
      moon.mesh.visible = true;
    }
  }

  private spawnInvertedClocktower(opts: {
    cx: number; cy: number; cz: number; areaScale: number;
    fallDur: number; holdDur: number; explodeDur: number;
    onLand?: () => void; onExplode?: () => void;
  }): void {
    const t = this.clocktowers[0];
    if (!t) return;
    t.active = true;
    t.age = 0;
    t.fallDur = opts.fallDur;
    t.holdDur = opts.holdDur;
    t.explodeDur = opts.explodeDur;
    t.landed = false;
    t.exploded = false;
    t.baseScale = 0.98 * opts.areaScale;
    t.onLand = opts.onLand ?? null;
    t.onExplode = opts.onExplode ?? null;

    t.startPos.set(opts.cx, opts.cy + 8.8, opts.cz - 0.4);
    t.endPos.set(opts.cx, opts.cy + 0.08, opts.cz + 0.1);
    t.mesh.position.copy(t.startPos);
    t.mesh.rotation.set(0.08, 0.38, -0.06);
    t.mesh.scale.setScalar(t.baseScale);
    t.mat.uniforms.uEmbedProgress.value = 0;
    t.mat.uniforms.uExplode.value = 0;
    t.mat.uniforms.uOpacity.value = 1;
    t.mesh.visible = true;
  }

  private spawnDome(opts: {
    x: number; y?: number; z: number; color: string; coreColor?: string;
    s0?: number; s1?: number; yScale?: number; life?: number;
  }): void {
    let activeDomes = 0;
    let slot: DomeSlot | null = null;
    for (let i = 0; i < this.domes.length; i++) {
      if (this.domes[i].active) activeDomes++;
      else if (!slot) slot = this.domes[i];
    }
    if (!slot || activeDomes >= 3) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.48;
    slot.s0 = opts.s0 ?? 0.45;
    slot.s1 = opts.s1 ?? 3.8;
    slot.yScale = opts.yScale ?? 0.72;
    slot.mesh.position.set(opts.x, opts.y ?? 0.04, opts.z);
    slot.mesh.scale.set(slot.s0, slot.s0 * slot.yScale, slot.s0);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uProgress.value = 0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private spawnBeam(opts: {
    x: number; y?: number; z: number; color: string; coreColor?: string;
    radius?: number; height?: number; life?: number;
  }): void {
    let activeBeams = 0;
    let slot: BeamSlot | null = null;
    for (let i = 0; i < this.beams.length; i++) {
      if (this.beams[i].active) activeBeams++;
      else if (!slot) slot = this.beams[i];
    }
    if (!slot || activeBeams >= 2) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.56;
    slot.radius = opts.radius ?? 0.8;
    slot.height = opts.height ?? 1.0;
    slot.mesh.position.set(opts.x, opts.y ?? 0.0, opts.z);
    slot.mesh.scale.set(slot.radius, slot.height, slot.radius);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private spawnVortex(opts: {
    x: number; y?: number; z: number; color: string; coreColor?: string;
    sx?: number; sy?: number; twist?: number; spin?: number; life?: number;
  }): void {
    const slot = this.vortices.find((v) => !v.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.65;
    slot.sx = opts.sx ?? 1.4;
    slot.sy = opts.sy ?? 1.8;
    slot.spin = opts.spin ?? 9;
    slot.mesh.position.set(opts.x, opts.y ?? 0.05, opts.z);
    slot.mesh.scale.set(slot.sx, slot.sy, slot.sx);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uTwist.value = opts.twist ?? 7.0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private spawnRift(opts: {
    x: number; y: number; z: number; color: string; coreColor?: string;
    rx?: number; ry?: number; rz?: number; len?: number; height?: number; life?: number;
  }): void {
    const slot = this.rifts.find((r) => !r.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.58;
    slot.len = opts.len ?? 5.5;
    slot.height = opts.height ?? 1.0;
    const minY =
      this.pitClipUniforms.uPitClipActive.value > 0.5
        ? this.pitClipUniforms.uPitFloorY.value + 0.85
        : -Infinity;
    slot.mesh.position.set(opts.x, Math.max(opts.y, minY), opts.z);
    slot.mesh.rotation.set(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0);
    slot.mesh.scale.set(slot.len, slot.height, 1);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uProgress.value = 0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mat.uniforms.uSeed.value = Math.random() * 15;
    slot.mesh.visible = true;
  }

  private spawnWeapon(opts: {
    kind: WeaponSlot['kind'];
    color: string;
    coreColor?: string;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startRot: THREE.Euler;
    endRot: THREE.Euler;
    scale?: number;
    mode?: 'plunge' | 'erupt' | 'swing';
    life?: number;
    onArrive?: () => void;
  }): void {
    const slot = this.weapons.find((w) => !w.active && w.kind === opts.kind);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.45;
    slot.mode = opts.mode ?? 'plunge';
    slot.scaleTarget = opts.scale ?? 1;
    slot.onArrive = opts.onArrive ?? null;
    slot.arrived = false;
    slot.startPos.copy(opts.startPos);
    slot.endPos.copy(opts.endPos);
    if (this.pitClipUniforms.uPitClipActive.value > 0.5 && slot.mode === 'plunge') {
      slot.endPos.y = Math.max(slot.endPos.y, this.pitClipUniforms.uPitFloorY.value + 0.12);
    }
    slot.startRot.copy(opts.startRot);
    slot.endRot.copy(opts.endRot);
    slot.mesh.position.copy(opts.startPos);
    slot.mesh.rotation.copy(opts.startRot);
    slot.mesh.scale.setScalar(slot.mode === 'erupt' ? slot.scaleTarget * 0.15 : slot.scaleTarget);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private spawnDirectedWeapon(
    kind: 'blade' | 'spear' | 'katana' | 'kunai' | 'arrow' | 'greatsword' | 'crystal' | 'clockhand',
    fromVec: THREE.Vector3,
    toVec: THREE.Vector3,
    color: string,
    scale = 1.2,
    life = 0.2,
    onArrive?: () => void
  ): void {
    this.tmpDir.subVectors(toVec, fromVec).normalize();
    this.tmpQuat.setFromUnitVectors(this.tmpUp, this.tmpDir);
    const euler = new THREE.Euler().setFromQuaternion(this.tmpQuat);
    this.spawnWeapon({
      kind,
      color,
      coreColor: '#ffffff',
      startPos: fromVec,
      endPos: toVec,
      startRot: euler,
      endRot: euler,
      scale,
      mode: 'plunge',
      life,
      onArrive,
    });
  }

  private spawnLightning(a: THREE.Vector3, b: THREE.Vector3, color: string, width = 0.22, life = 0.22): void {
    const steps = 4;
    let prev = a.clone();
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const cur = new THREE.Vector3().lerpVectors(a, b, t);
      if (s < steps) {
        cur.x += (Math.random() - 0.5) * 0.72;
        cur.y += (Math.random() - 0.5) * 0.4 + 0.14;
        cur.z += (Math.random() - 0.5) * 0.72;
      }
      const slot = this.boltSegs.find((bSeg) => !bSeg.active);
      if (slot) {
        slot.active = true;
        slot.age = 0;
        slot.life = life;
        this.tmpDir.subVectors(cur, prev);
        const len = this.tmpDir.length();
        slot.mesh.position.copy(prev);
        if (len > 0.001) {
          this.tmpDir.normalize();
          slot.mesh.quaternion.setFromUnitVectors(this.tmpUp, this.tmpDir);
        }
        slot.mesh.scale.set(width, len, 1);
        slot.mat.color.set(s % 2 === 0 ? '#ffffff' : color);
        slot.mat.opacity = 1;
        slot.mesh.visible = true;
      }
      prev = cur;
    }
  }

  private resolveParticleFloorY(y: number, minFloorOffset = 0.06): number {
    if (this.pitClipUniforms.uPitClipActive.value > 0.5) {
      return this.pitClipUniforms.uPitFloorY.value + minFloorOffset;
    }
    const baseFloor = this.activeTargetFloorY < -0.1 ? this.activeTargetFloorY : y < -0.1 ? y - 0.15 : 0;
    return Math.min(baseFloor + minFloorOffset, y);
  }

  private spawnDebrisBurst(x: number, y: number, z: number, color: string, secondary: string, count = 5): void {
    const cap = this.lowQuality ? Math.max(1, Math.ceil(count * 0.4)) : count;
    for (let i = 0; i < cap; i++) {
      const slot = this.debris.find((d) => !d.active);
      if (!slot) break;
      const a = Math.random() * Math.PI * 2;
      const spd = 2.6 + Math.random() * 4.2;
      slot.active = true;
      slot.age = 0;
      slot.life = 0.45 + Math.random() * 0.22;
      slot.floorY = this.resolveParticleFloorY(y, 0.08);
      slot.vx = Math.cos(a) * spd;
      slot.vy = 3.2 + Math.random() * 3.8;
      slot.vz = Math.sin(a) * spd;
      slot.rx = (Math.random() - 0.5) * 18;
      slot.ry = (Math.random() - 0.5) * 18;
      slot.s0 = 0.65 + Math.random() * 0.8;
      slot.mesh.position.set(x, y + 0.25, z);
      slot.mesh.scale.setScalar(slot.s0);
      slot.mat.color.set(i % 2 === 0 ? color : secondary);
      slot.mesh.visible = true;
    }
  }

  private spawnQuad(opts: {
    tex: THREE.Texture; x: number; y: number; z: number; color?: string;
    s0?: number; s1?: number; life?: number; floorY?: number;
    vx?: number; vy?: number; vz?: number; gravity?: number; drag?: number;
    spin?: number; billboard?: boolean; flatFloor?: boolean; rotZ?: number; alpha?: number;
  }): void {
    const slot = this.quads.find((q) => !q.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.34;
    slot.floorY = opts.floorY ?? this.resolveParticleFloorY(opts.y, 0.06);
    slot.vx = opts.vx ?? 0;
    slot.vy = opts.vy ?? 0;
    slot.vz = opts.vz ?? 0;
    slot.gravity = opts.gravity ?? 0;
    slot.drag = opts.drag ?? 1;
    slot.s0 = opts.s0 ?? 1;
    slot.s1 = opts.s1 ?? 1;
    slot.spin = opts.spin ?? 0;
    slot.billboard = opts.billboard ?? true;
    slot.flatFloor = opts.flatFloor ?? false;
    let qy = opts.y;
    if (slot.flatFloor && this.pitClipUniforms.uPitClipActive.value > 0.5) {
      const pc = this.pitClipUniforms.uPitCenter.value;
      const dist = Math.hypot(opts.x - pc.x, opts.z - pc.z);
      const maxDia = Math.max(1.2, (this.pitClipUniforms.uPitRadius.value - dist) * 1.92);
      slot.s1 = Math.min(slot.s1, maxDia);
      slot.s0 = Math.min(slot.s0, slot.s1);
      qy = Math.max(qy, this.pitClipUniforms.uPitFloorY.value + 0.04);
    }
    slot.baseRotZ = opts.rotZ ?? 0;
    slot.baseAlpha = opts.alpha ?? 1;
    slot.mesh.position.set(opts.x, qy, opts.z);
    slot.mesh.scale.setScalar(slot.s0);
    if (slot.flatFloor) slot.mesh.rotation.set(-Math.PI / 2, 0, slot.baseRotZ);
    else slot.mesh.rotation.set(0, 0, slot.baseRotZ);
    slot.mat.map = opts.tex;
    slot.mat.color.set(opts.color ?? '#ffffff');
    slot.mat.opacity = slot.baseAlpha;
    slot.mat.needsUpdate = true;
    slot.mesh.visible = true;
  }

  private spawnOrb(opts: {
    p0: THREE.Vector3; p1: THREE.Vector3; color: string; coreColor?: string;
    trailColor?: string; s0?: number; s1?: number; life?: number; onArrive?: () => void;
  }): void {
    const slot = this.orbs.find((o) => !o.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.34;
    slot.p0.copy(opts.p0);
    slot.p1.copy(opts.p1);
    slot.s0 = opts.s0 ?? 0.9;
    slot.s1 = opts.s1 ?? 1.25;
    slot.trailColor = opts.trailColor ?? opts.color;
    slot.trailTimer = 0;
    slot.onArrive = opts.onArrive ?? null;
    slot.arrived = false;
    slot.mesh.position.copy(opts.p0);
    slot.mesh.scale.setScalar(slot.s0);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private spawnSparks(x: number, y: number, z: number, color: string, secondary: string, count = 6, speed = 4.4): void {
    const cap = this.lowQuality ? Math.max(2, Math.ceil(count * 0.4)) : count;
    for (let i = 0; i < cap; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.45 + Math.random() * 0.85);
      this.spawnQuad({
        tex: i % 3 === 0 ? this.starTex : this.streakTex,
        x,
        y: y + 0.25,
        z,
        color: i % 2 === 0 ? color : secondary,
        s0: 0.45 + Math.random() * 0.32,
        s1: 0.06,
        life: 0.24 + Math.random() * 0.2,
        floorY: this.resolveParticleFloorY(y, 0.06),
        vx: Math.cos(a) * spd,
        vy: 1.8 + Math.random() * 3.6,
        vz: Math.sin(a) * spd,
        gravity: 9.8,
        drag: 0.94,
        rotZ: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 11,
      });
    }
  }

  public fireAnticipation(
    rarity: string,
    colorHex: string,
    target: WorldPoint3,
    allTargets: readonly WorldPoint3[] = [],
    areaScale = 1,
    wideCenter?: WorldPoint3
  ): void {
    const wide = isWideAoeRarity(rarity);
    const as = Math.max(0.45, Math.min(1.2, areaScale));
    const { cx, cy, cz } = wide
      ? resolvePitBounds(allTargets, target, wideCenter)
      : { cx: target.x, cy: target.y, cz: target.z };

    if (rarity === 'secret' || wide) {
      this.hooks.onArenaDim?.(wide ? 0.55 : 0.42, rarity === 'omega' ? '#160307' : '#050b18', 0.65);
      this.hooks.onSpeedLines?.(0.65, 0.28);
      if (rarity !== 'omega' && rarity !== 'twin' && rarity !== 'fusion') {
        this.spawnQuad({
          tex: this.runeTex,
          x: cx,
          y: cy + 0.08,
          z: cz,
          color: colorHex,
          s0: 0.9,
          s1: wide ? 10.5 * as : 3.4,
          life: 0.52,
          flatFloor: true,
          spin: 4.0,
        });
      }
    } else if (rarity !== 'common') {
      this.hooks.onSpeedLines?.(0.35, 0.18);
    }
  }


  /** Launches bespoke 3D weapons directly from behind the podium chibi toward the target(s). */
  public firePodiumWeaponCast(opts: PodiumWeaponCastOpts): void {
    firePodiumWeaponCastChoreography(this.getChoreoContext(), opts);
  }

  public fireTierAttack(opts: TierAttackFireOpts): void {
    this.activeTargetFloorY = opts.target.y;
    fireTierAttackChoreography(this.getChoreoContext(), opts);
  }

  public update(dtSec: number, camera: THREE.Camera): void {
    this.updateState.disposed = this.disposed;
    this.updateState.time = this.time;
    stepTierAttackVfxPool(this.updateState, dtSec, camera);
    this.time = this.updateState.time;
    this.crimsonRoninSkillPool.update(dtSec, this.time);
    this.obsidianSovereignSkillPool.update(dtSec, this.time);
    this.clockworkTwinsSkillPool.update(dtSec, this.time);
    this.lullabyTwinsSkillPool.update(dtSec, this.time);
    this.nocturneTwinsSkillPool.update(dtSec, this.time);
    this.halcyonTwinsSkillPool.update(dtSec, this.time);
    this.yukikageTwinsSkillPool.update(dtSec, this.time);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.crimsonRoninSkillPool.dispose();
    this.obsidianSovereignSkillPool.dispose();
    this.clockworkTwinsSkillPool.dispose();
    this.lullabyTwinsSkillPool.dispose();
    this.nocturneTwinsSkillPool.dispose();
    this.halcyonTwinsSkillPool.dispose();
    this.yukikageTwinsSkillPool.dispose();
    const mats = new Set<THREE.Material>();
    for (const s of this.slashes) mats.add(s.mat);
    for (const d of this.domes) mats.add(d.mat);
    for (const b of this.beams) mats.add(b.mat);
    for (const v of this.vortices) mats.add(v.mat);
    for (const r of this.rifts) mats.add(r.mat);
    for (const w of this.weapons) mats.add(w.mat);
    for (const d of this.clockDials) mats.add(d.mat);
    for (const f of this.frostSeals) mats.add(f.mat);
    for (const ls of this.lullabySeals) mats.add(ls.mat);
    for (const hs of this.halcyonSeals) mats.add(hs.mat);
    for (const sealList of Object.values(this.fusionSeals)) {
      for (const fs of sealList) mats.add(fs.mat);
    }
    for (const fp of this.fusionProps) mats.add(fp.mat);
    for (const hp of this.halcyonPillars) mats.add(hp.mat);
    for (const r of this.halcyonRain) mats.add(r.mat);
    for (const ec of this.nocturneEclipses) mats.add(ec.mat);
    for (const c of this.nocturneCraters) mats.add(c.mat);
    for (const cage of this.lullabyMirrorCages) mats.add(cage.mat);
    for (const moon of this.lullabyCrescentMoons) mats.add(moon.mat);
    for (const ct of this.clocktowers) mats.add(ct.mat);
    for (const b of this.boltSegs) mats.add(b.mat);
    for (const d of this.debris) mats.add(d.mat);
    for (const q of this.quads) mats.add(q.mat);
    for (const o of this.orbs) mats.add(o.mat);
    mats.forEach((m) => m.dispose());
    this.sharedGeos.forEach((g) => g.dispose());
  }
}
