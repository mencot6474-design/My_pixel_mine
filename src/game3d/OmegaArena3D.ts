import * as THREE from 'three';
import type { OmegaBossId } from '../game/OmegaData';
import type { OmegaBattlePhase, OmegaTargetObject } from '../game/OmegaBossDomain';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { type ChibiDef, getChibiById } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { type CyberShowcasePodiumHandle } from './FusionWorldPodium3D';
import { disposeObject3D } from './MeshHelpers3D';
import { createOmegaBossCircleTexture } from './OmegaRooftopAssets3D';
import {
  createOmegaRooftopEnvironment,
  type OmegaRooftopEnvironmentHandle,
} from './OmegaRooftopEnvironment3D';
import {
  applyOmegaPodiumColors,
  buildOmegaArenaStage,
  createOmegaEmberDotTexture,
  OMEGA_BOSS_DAIS_Y as BOSS_DAIS_Y,
  OMEGA_BOSS_POS_Z as BOSS_POS_Z,
  type OmegaConduitFlowEntry,
  OMEGA_EMBER_COUNT as EMBER_COUNT,
  type OmegaFighterEntry,
  type OmegaStrikeEvent,
  type OmegaTargetMeshEntry,
  type OmegaTargetScreenAnchor,
  syncOmegaBattleTargetMeshes,
  syncOmegaFighterEntries,
} from './OmegaArenaStage3D';
import type { TowerFighterConfig } from './TowerArena3D';
import {
  type SignatureProjectileArrival,
  SignatureProjectilePool3D,
} from './SignatureProjectilePool3D';
import {
  BARRAGE_BEAT_WEIGHTS,
  BARRAGE_FOLLOWUP_DELAYS,
  computeAttackVfxSpeedScale,
  TierAttackVfxPool3D,
  type TierVfxHooks,
  type WorldPoint3,
} from './TierAttackVfx3D';

export type { OmegaStrikeEvent, OmegaTargetScreenAnchor };

/** Dedicated 3D "Omega Duel Sanctum" arena for 1v5 Boss battles against Crimson Ronin & Obsidian Sovereign. */
export class OmegaArena3D {
  public readonly group = new THREE.Group();
  public readonly clickables: THREE.Object3D[] = [];

  private bossId: OmegaBossId = 'crimson-ronin';
  private bossSprite: ChibiSprite3D | null = null;
  private readonly bossHitMesh: THREE.Mesh;
  private readonly bossDaisRingMat: THREE.MeshBasicMaterial;
  private readonly trimNeonMat: THREE.MeshBasicMaterial;
  private readonly secondaryNeonMat: THREE.MeshBasicMaterial;
  private readonly goldTrimMat: THREE.MeshStandardMaterial;
  private readonly darkArmorMat: THREE.MeshStandardMaterial;
  private readonly shrineLight: THREE.PointLight;
  private readonly squadFillLight: THREE.PointLight;
  private readonly breakFloorRing: THREE.Mesh;
  private readonly breakFloorMat: THREE.MeshBasicMaterial;
  private readonly daisSigilMesh: THREE.Mesh;
  private readonly daisOuterRingMesh: THREE.Mesh;
  private readonly outerSealRingMesh: THREE.Mesh;
  private readonly outerFloorSealMat: THREE.MeshBasicMaterial;
  private readonly shrineCrownCrystal: THREE.Mesh;
  private readonly shrineCrownCrystalBaseY: number;
  private readonly bossPodium: CyberShowcasePodiumHandle;
  private readonly bossStageY: number;
  private readonly playerPodiums: CyberShowcasePodiumHandle[] = [];
  private readonly conduitFlows: OmegaConduitFlowEntry[] = [];
  private readonly podiumGeos: THREE.BufferGeometry[] = [];
  private readonly podiumMats: THREE.Material[] = [];
  private readonly podiumTextures: THREE.Texture[] = [];
  private readonly rooftopEnv: OmegaRooftopEnvironmentHandle;
  private readonly entranceDropBeam: THREE.Mesh;
  private readonly entranceDropMat: THREE.MeshBasicMaterial;
  private readonly entranceTargetRing: THREE.Mesh;
  private readonly entranceTargetMat: THREE.MeshBasicMaterial;
  private readonly invulShieldMesh: THREE.Mesh;
  private readonly invulShieldMat: THREE.MeshBasicMaterial;
  private readonly emberPoints: THREE.Points;
  private readonly emberPositions: Float32Array;
  private readonly emberTexture: THREE.CanvasTexture | null;

  private readonly fighters = new Map<number, OmegaFighterEntry>();
  private readonly targetEntries = new Map<string, OmegaTargetMeshEntry>();
  private readonly targetsGroup = new THREE.Group();
  private readonly impactFx = new AttackImpactFxController();
  private readonly projectiles = new SignatureProjectilePool3D();
  private readonly pendingBarrages: Array<{
    slotIndex: number;
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
  }> = [];
  private readonly tierVfx = new TierAttackVfxPool3D();
  private readonly projVec = new THREE.Vector3();
  private lowQuality = false;

  private battlePhase: OmegaBattlePhase | 'ended' = 'active';
  private entranceElapsed = 0;
  private entranceSlammed = true;
  private bossLandingBounce = 0;
  private invulShieldPulse = 0;
  private breakActive = false;
  private parryActive = false;
  private bossHitBounce = 0;

  constructor() {
    this.group.visible = false;

    this.trimNeonMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
    });
    this.secondaryNeonMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
    });
    const omegaCircleTex = createOmegaBossCircleTexture();
    if (omegaCircleTex) this.podiumTextures.push(omegaCircleTex);
    this.bossDaisRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      ...(omegaCircleTex ? { map: omegaCircleTex } : {}),
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.outerFloorSealMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      ...(omegaCircleTex ? { map: omegaCircleTex } : {}),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.breakFloorMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xca8a04,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.78,
      flatShading: true,
    });
    this.darkArmorMat = new THREE.MeshStandardMaterial({
      color: 0x26314a,
      roughness: 0.52,
      metalness: 0.45,
      flatShading: true,
    });

    this.shrineLight = new THREE.PointLight(0xe879f9, 18, 26, 1.3);
    this.shrineLight.position.set(0, 5.2, -3.6);
    this.squadFillLight = new THREE.PointLight(0x93c5fd, 14, 24, 1.3);
    this.squadFillLight.position.set(0, 4.4, 4.8);
    this.group.add(this.shrineLight, this.squadFillLight);

    this.rooftopEnv = createOmegaRooftopEnvironment();
    this.group.add(this.rooftopEnv.group);

    const stageHandles = this.buildArenaStage();
    this.daisSigilMesh = stageHandles.daisSigil;
    this.daisOuterRingMesh = stageHandles.daisOuterRing;
    this.outerSealRingMesh = stageHandles.outerSealRing;
    this.shrineCrownCrystal = stageHandles.shrineCrownCrystal;
    this.shrineCrownCrystalBaseY = stageHandles.crystalBaseY;
    this.bossPodium = stageHandles.bossPodium;
    this.bossStageY = BOSS_DAIS_Y + 0.04 + this.bossPodium.topY;

    // Rising atmospheric Sanctum embers
    const emberGeo = new THREE.BufferGeometry();
    this.emberPositions = new Float32Array(EMBER_COUNT * 3);
    for (let i = 0; i < EMBER_COUNT; i++) {
      this.emberPositions[i * 3] = ((i * 37) % 18) - 9;
      this.emberPositions[i * 3 + 1] = ((i * 19) % 8);
      this.emberPositions[i * 3 + 2] = ((i * 29) % 14) - 7;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));
    this.emberTexture = this.createEmberDotTexture();
    const emberMat = new THREE.PointsMaterial({
      color: 0xfde047,
      size: 0.28,
      ...(this.emberTexture ? { map: this.emberTexture } : {}),
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.emberPoints = new THREE.Points(emberGeo, emberMat);
    this.group.add(this.emberPoints);

    this.bossHitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.15, 4.4, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    this.bossHitMesh.position.set(0, this.bossStageY + 2.2, BOSS_POS_Z);
    this.bossHitMesh.userData = { kind: 'omega-boss' };
    this.group.add(this.bossHitMesh);
    this.clickables.push(this.bossHitMesh);

    this.breakFloorRing = new THREE.Mesh(new THREE.RingGeometry(2.82, 3.08, 48), this.breakFloorMat);
    this.breakFloorRing.rotation.x = -Math.PI / 2;
    this.breakFloorRing.position.set(0, BOSS_DAIS_Y + 0.032, BOSS_POS_Z);
    this.group.add(this.breakFloorRing);

    // Boss Sky-Drop Entrance Beam + Landing Ring + 30s Invul Energy Shield Dome
    this.entranceDropMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beamGeo = new THREE.CylinderGeometry(0.42, 1.05, 26, 12, 1, true);
    this.entranceDropBeam = new THREE.Mesh(beamGeo, this.entranceDropMat);
    this.entranceDropBeam.position.set(0, this.bossStageY + 13, BOSS_POS_Z);
    this.entranceDropBeam.visible = false;

    this.entranceTargetMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const dropRingGeo = new THREE.RingGeometry(1.5, 2.05, 32);
    this.entranceTargetRing = new THREE.Mesh(dropRingGeo, this.entranceTargetMat);
    this.entranceTargetRing.rotation.x = -Math.PI / 2;
    this.entranceTargetRing.position.set(0, BOSS_DAIS_Y + 0.045, BOSS_POS_Z);
    this.entranceTargetRing.visible = false;

    this.invulShieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const shieldGeo = new THREE.IcosahedronGeometry(2.55, 1);
    this.invulShieldMesh = new THREE.Mesh(shieldGeo, this.invulShieldMat);
    this.invulShieldMesh.position.set(0, this.bossStageY + 1.85, BOSS_POS_Z);
    this.invulShieldMesh.visible = false;

    this.podiumGeos.push(beamGeo, dropRingGeo, shieldGeo);
    this.podiumMats.push(this.entranceDropMat, this.entranceTargetMat, this.invulShieldMat);
    this.group.add(this.entranceDropBeam, this.entranceTargetRing, this.invulShieldMesh);

    this.group.add(this.targetsGroup, this.impactFx.group, this.projectiles.group, this.tierVfx.group);
    this.setBossId('crimson-ronin');
  }

  private createEmberDotTexture(): THREE.CanvasTexture | null {
    return createOmegaEmberDotTexture();
  }

  private applyPodiumColors(
    podium: CyberShowcasePodiumHandle,
    primaryHex: string,
    secondaryHex: string,
    activeAura: boolean,
    intensity = 1.15
  ): void {
    applyOmegaPodiumColors(podium, primaryHex, secondaryHex, activeAura, intensity);
  }

  private buildArenaStage(): {
    daisSigil: THREE.Mesh;
    daisOuterRing: THREE.Mesh;
    outerSealRing: THREE.Mesh;
    shrineCrownCrystal: THREE.Mesh;
    crystalBaseY: number;
    bossPodium: CyberShowcasePodiumHandle;
  } {
    return buildOmegaArenaStage({
      group: this.group,
      trimNeonMat: this.trimNeonMat,
      secondaryNeonMat: this.secondaryNeonMat,
      bossDaisRingMat: this.bossDaisRingMat,
      outerFloorSealMat: this.outerFloorSealMat,
      podiumGeos: this.podiumGeos,
      podiumMats: this.podiumMats,
      podiumTextures: this.podiumTextures,
      playerPodiums: this.playerPodiums,
      conduitFlows: this.conduitFlows,
    });
  }

  public setBossId(bossId: OmegaBossId): void {
    this.bossId = bossId;
    const isSovereign = bossId === 'obsidian-sovereign';
    const accentHex = isSovereign ? '#a855f7' : '#ef4444';
    const secHex = isSovereign ? '#38bdf8' : '#fde047';

    this.trimNeonMat.color.set(accentHex);
    this.secondaryNeonMat.color.set(secHex);
    this.bossDaisRingMat.color.set(accentHex);
    this.outerFloorSealMat.color.set(secHex);
    this.shrineLight.color.set(accentHex);
    this.squadFillLight.color.set(secHex);
    this.applyPodiumColors(this.bossPodium, accentHex, secHex, true, 1.35);

    if (this.bossSprite) {
      this.group.remove(this.bossSprite.group);
      this.bossSprite.dispose();
      this.bossSprite = null;
    }

    const chibiDef: ChibiDef | undefined = getChibiById(bossId);
    if (chibiDef) {
      this.bossSprite = new ChibiSprite3D(chibiDef);
      this.bossSprite.group.position.set(0, this.bossStageY, BOSS_POS_Z);
      this.bossSprite.group.scale.setScalar(3.15);
      this.bossSprite.setFacing(-1);
      this.bossSprite.setLowQuality(this.lowQuality);
      this.group.add(this.bossSprite.group);
    }
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
    this.bossPodium?.setLowQuality(low);
    this.emberPoints.visible = !low;
    for (let i = 0; i < this.playerPodiums.length; i++) {
      this.playerPodiums[i].setLowQuality(low);
    }
    for (const f of this.fighters.values()) {
      f.sprite.setLowQuality(low);
      f.fx.setLowQuality(low);
    }
  }

  public startEntranceCutscene(): void {
    this.battlePhase = 'entrance';
    this.entranceElapsed = 0;
    this.entranceSlammed = false;
    this.bossLandingBounce = 0;
    this.invulShieldPulse = 0;
    this.invulShieldMesh.visible = false;
    this.entranceDropBeam.visible = true;
    this.entranceTargetRing.visible = true;
    if (this.bossSprite) {
      this.bossSprite.group.position.set(0, 22, BOSS_POS_Z);
      this.bossSprite.group.scale.set(3.15 * 0.85, 3.15 * 1.25, 3.15);
      this.bossSprite.setAnimState('idle');
    }
    this.projectiles.clear();
    for (const f of this.fighters.values()) {
      f.sprite.setAnimState('idle');
      f.sprite.group.position.copy(f.spawnPos);
    }
  }

  public setBattlePhase(phase: OmegaBattlePhase | 'ended'): void {
    const prev = this.battlePhase;
    this.battlePhase = phase;
    this.invulShieldMesh.visible = phase === 'invul_shield';
    if (phase !== 'entrance') {
      this.entranceDropBeam.visible = false;
      this.entranceTargetRing.visible = false;
    }
    if (prev === 'invul_shield' && phase === 'active') {
      this.impactFx.spawnShatter({
        targetX: 0,
        targetY: this.bossStageY + 1.8,
        targetZ: BOSS_POS_Z + 0.4,
        oreColor: '#38bdf8',
        secondaryColor: '#fde047',
      });
    }
    if (phase !== 'active') {
      this.projectiles.clear();
      for (const f of this.fighters.values()) {
        f.sprite.setAnimState('idle');
        if (phase === 'ended') {
          f.sprite.group.position.copy(f.spawnPos);
        }
      }
    }
  }

  public pulseInvulShield(): void {
    this.invulShieldPulse = 0.28;
    this.impactFx.spawnImpact({
      targetX: (Math.random() - 0.5) * 1.2,
      targetY: this.bossStageY + 1.4 + Math.random() * 1.1,
      targetZ: BOSS_POS_Z + 0.8,
      accentColor: '#38bdf8',
      heavy: false,
      shockwaveScale: 1.25,
    });
  }

  public setBattleStatus(breakActive: boolean, parryActive: boolean): void {
    this.breakActive = breakActive;
    this.parryActive = parryActive;
    if (this.bossSprite) {
      this.bossSprite.setAnimState(parryActive ? 'attack' : 'idle');
    }
  }

  public syncFighters(configs: TowerFighterConfig[]): void {
    syncOmegaFighterEntries({
      configs,
      group: this.group,
      fighters: this.fighters,
      playerPodiums: this.playerPodiums,
      conduitFlows: this.conduitFlows,
      lowQuality: this.lowQuality,
    });
  }

  public syncBattleTargets(targets: readonly OmegaTargetObject[]): void {
    syncOmegaBattleTargetMeshes({
      targets,
      targetsGroup: this.targetsGroup,
      targetEntries: this.targetEntries,
      clickables: this.clickables,
      darkArmorMat: this.darkArmorMat,
      goldTrimMat: this.goldTrimMat,
    });
  }

  public triggerBossHitEffect(accentColor?: string, isCrit = false): void {
    this.bossHitBounce = 0.24;
    this.impactFx.spawnImpact({
      targetX: (Math.random() - 0.5) * 0.5,
      targetY: this.bossStageY + 1.45,
      targetZ: BOSS_POS_Z + 0.35,
      accentColor: accentColor ?? (this.bossId === 'crimson-ronin' ? '#ef4444' : '#e879f9'),
      heavy: isCrit,
      shockwaveScale: isCrit ? 1.55 : 1.1,
    });
  }

  public triggerTargetShatterFx(wx: number, wz: number, colorHex: string): void {
    this.impactFx.spawnShatter({
      targetX: wx,
      targetY: 1.1,
      targetZ: wz,
      oreColor: colorHex,
      secondaryColor: '#fde047',
    });
  }

  public getBossHeadScreenAnchor(camera: THREE.Camera, width: number, height: number): { x: number; y: number } | null {
    this.projVec.set(0, this.bossStageY + 3.45, BOSS_POS_Z).project(camera);
    if (this.projVec.z <= -1 || this.projVec.z >= 1) return null;
    return {
      x: (this.projVec.x * 0.5 + 0.5) * width,
      y: (-this.projVec.y * 0.5 + 0.5) * height,
    };
  }

  public getTargetScreenAnchors(camera: THREE.Camera, width: number, height: number): OmegaTargetScreenAnchor[] {
    const out: OmegaTargetScreenAnchor[] = [];
    for (const entry of this.targetEntries.values()) {
      const anchorY =
        entry.kind === 'obsidian_pillar' ? 3.24 : entry.kind === 'phantom_blade' ? 2.74 : 2.38;
      this.projVec.set(entry.x, anchorY, entry.z).project(camera);
      if (this.projVec.z <= -1 || this.projVec.z >= 1) continue;
      out.push({
        id: entry.id,
        kind: entry.kind,
        x: (this.projVec.x * 0.5 + 0.5) * width,
        y: (-this.projVec.y * 0.5 + 0.5) * height,
      });
    }
    return out;
  }

  public update(
    dt: number,
    elapsed: number,
    camera: THREE.Camera,
    onStrike?: (ev: OmegaStrikeEvent) => void,
    onEntranceSlam?: () => void
  ): void {
    if (!this.group.visible) return;
    const safeDt = Math.min(Math.max(0, dt), 0.1);

    if (this.bossHitBounce > 0) {
      this.bossHitBounce = Math.max(0, this.bossHitBounce - safeDt);
    }
    if (this.bossLandingBounce > 0) {
      this.bossLandingBounce = Math.max(0, this.bossLandingBounce - safeDt);
    }
    if (this.invulShieldPulse > 0) {
      this.invulShieldPulse = Math.max(0, this.invulShieldPulse - safeDt);
    }

    if (this.battlePhase === 'entrance') {
      this.entranceElapsed += safeDt;
      const t = this.entranceElapsed;
      if (t < 0.52) {
        const p = t / 0.52;
        this.entranceDropBeam.visible = true;
        this.entranceDropMat.opacity = p * 0.55;
        this.entranceDropBeam.scale.set(1.35 - p * 0.45, 1, 1.35 - p * 0.45);
        this.entranceTargetRing.visible = true;
        this.entranceTargetMat.opacity = 0.75;
        this.entranceTargetRing.scale.setScalar(1.4 - p * 0.55);
        if (this.bossSprite) {
          this.bossSprite.group.position.set(0, 22, BOSS_POS_Z);
        }
      } else if (t < 0.95) {
        const fallP = (t - 0.52) / (0.95 - 0.52);
        const eased = Math.pow(fallP, 2.3);
        const dropY = 22 + (this.bossStageY - 22) * eased;
        this.entranceDropBeam.visible = true;
        this.entranceDropMat.opacity = 0.75;
        this.entranceTargetRing.visible = true;
        this.entranceTargetMat.opacity = 0.9;
        this.entranceTargetRing.scale.setScalar(0.85 + fallP * 0.3);
        if (this.bossSprite) {
          this.bossSprite.group.position.set(0, dropY, BOSS_POS_Z);
          this.bossSprite.group.scale.set(3.15 * 0.82, 3.15 * 1.32, 3.15);
        }
      } else {
        if (!this.entranceSlammed) {
          this.entranceSlammed = true;
          this.bossLandingBounce = 0.42;
          this.impactFx.spawnShatter({
            targetX: 0,
            targetY: this.bossStageY + 0.5,
            targetZ: BOSS_POS_Z + 0.4,
            oreColor: this.bossId === 'crimson-ronin' ? '#ef4444' : '#e879f9',
            secondaryColor: '#fde047',
          });
          this.impactFx.spawnImpact({
            targetX: 0,
            targetY: this.bossStageY + 0.45,
            targetZ: BOSS_POS_Z + 0.5,
            accentColor: '#fde047',
            heavy: true,
            shockwaveScale: 2.4,
          });
          onEntranceSlam?.();
        }
        const postP = Math.min(1, (t - 0.95) / 0.55);
        this.entranceDropMat.opacity = (1 - postP) * 0.7;
        this.entranceTargetMat.opacity = (1 - postP) * 0.85;
        this.entranceTargetRing.scale.setScalar(1.15 + postP * 1.2);
        if (postP >= 1) {
          this.entranceDropBeam.visible = false;
          this.entranceTargetRing.visible = false;
        }
      }
    }

    if (this.bossSprite) {
      if (this.battlePhase !== 'entrance' || this.entranceSlammed) {
        const bob = this.breakActive ? -0.14 : Math.sin(elapsed * 2.4) * 0.08;
        const bounceZ = this.bossHitBounce > 0 ? -Math.sin((this.bossHitBounce / 0.24) * Math.PI) * 0.16 : 0;
        this.bossSprite.group.position.set(0, this.bossStageY + bob, BOSS_POS_Z + bounceZ);
        if (this.bossLandingBounce > 0) {
          const sq = Math.sin((this.bossLandingBounce / 0.42) * Math.PI);
          this.bossSprite.group.scale.set(3.15 * (1 + sq * 0.25), 3.15 * (1 - sq * 0.24), 3.15);
        } else {
          this.bossSprite.group.scale.setScalar(3.15);
        }
      }
      this.bossSprite.update(safeDt, elapsed, camera);
    }

    if (this.invulShieldMesh.visible) {
      this.invulShieldMesh.rotation.y = elapsed * 0.85;
      this.invulShieldMesh.rotation.z = Math.sin(elapsed * 1.4) * 0.08;
      const pulseFactor = this.invulShieldPulse > 0 ? this.invulShieldPulse / 0.28 : 0;
      this.invulShieldMat.opacity = 0.28 + Math.sin(elapsed * 4.5) * 0.08 + pulseFactor * 0.45;
      this.invulShieldMesh.scale.setScalar(1 + pulseFactor * 0.08);
    }

    const animatePodium = (pod: CyberShowcasePodiumHandle, phaseOffset: number): void => {
      const pTime = elapsed + phaseOffset;
      pod.sigilMesh.rotation.z = pTime * 0.28;
      if (pod.auraGroup.visible) {
        pod.auraVeilMat.uniforms.uTime.value = pTime;
        pod.auraVeilMat.uniforms.uOpacity.value = 0.65 + Math.sin(pTime * 1.8) * 0.12;
        pod.auraOuterVeilMat.uniforms.uTime.value = pTime + 0.6;
        pod.auraOuterVeilMat.uniforms.uOpacity.value = 0.36 + Math.sin(pTime * 1.8) * 0.08;
        pod.particleMat.uniforms.uTime.value = pTime;
      }
    };
    animatePodium(this.bossPodium, 0);
    for (let i = 0; i < this.playerPodiums.length; i++) {
      animatePodium(this.playerPodiums[i], i * 0.55);
    }

    this.breakFloorMat.opacity = this.breakActive ? 0.55 + Math.sin(elapsed * 12) * 0.25 : 0;
    this.bossDaisRingMat.opacity = this.parryActive ? 0.96 : 0.7 + Math.sin(elapsed * 3) * 0.14;
    this.daisSigilMesh.rotation.z = elapsed * 0.35;
    this.daisOuterRingMesh.rotation.z = Math.PI / 8 - elapsed * 0.16;
    this.outerSealRingMesh.rotation.z = -elapsed * 0.18;
    this.shrineCrownCrystal.rotation.y = elapsed * 1.3;
    this.shrineCrownCrystal.position.y = this.shrineCrownCrystalBaseY + Math.sin(elapsed * 2.2) * 0.14;
    this.rooftopEnv.update(safeDt, elapsed);

    if (!this.lowQuality) {
      const emberAttr = this.emberPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < EMBER_COUNT; i++) {
        let py = this.emberPositions[i * 3 + 1] + safeDt * (0.9 + (i % 4) * 0.22);
        if (py > 8.2) py = 0.2;
        this.emberPositions[i * 3 + 1] = py;
      }
      emberAttr.needsUpdate = true;
    }

    for (const entry of this.targetEntries.values()) {
      entry.root.rotation.y = elapsed * (entry.kind === 'obsidian_pillar' ? 0.8 : 2.2);
    }

    for (const flow of this.conduitFlows) {
      if (!flow.pulses[0]?.visible) continue;
      for (let pIdx = 0; pIdx < flow.pulses.length; pIdx++) {
        const frac = (elapsed * 0.85 + flow.slotIndex * 0.19 + pIdx * 0.5) % 1;
        const pulse = flow.pulses[pIdx];
        pulse.position.x = flow.startX + (flow.endX - flow.startX) * frac;
        pulse.position.z = flow.startZ + (flow.endZ - flow.startZ) * frac;
      }
    }

    const canAttack = this.battlePhase === 'active';
    if (!canAttack) {
      this.projectiles.clear();
      this.pendingBarrages.length = 0;
      this.tierVfx.clear();
    }

    const handleOmegaArrival = (a: SignatureProjectileArrival): void => {
      const fighter = this.fighters.get(a.slotIndex);
      if (fighter) {
        const bossPt: WorldPoint3 = { x: 0, y: this.bossStageY, z: BOSS_POS_Z + 0.25 };
        const speedScale = computeAttackVfxSpeedScale(a.attackInterval);
        this.tierVfx.fireTierAttack({
          rarity: fighter.rarity,
          chibiId: fighter.chibiId,
          colorHex: a.accentColor,
          target: bossPt,
          allTargets: [bossPt],
          comboStep: a.comboStep,
          speedScale,
        });
      }
      const beatCount = BARRAGE_BEAT_WEIGHTS.length;
      for (let bi = 1; bi < beatCount; bi++) {
        const w = BARRAGE_BEAT_WEIGHTS[bi];
        const isFinisher = bi === beatCount - 1;
        this.pendingBarrages.push({
          slotIndex: a.slotIndex,
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
      onStrike?.({
        slotIndex: a.slotIndex,
        attackInterval: a.attackInterval * BARRAGE_BEAT_WEIGHTS[0],
        dmg: Math.max(1, Math.round(a.dmg * BARRAGE_BEAT_WEIGHTS[0])),
        wx: a.ex,
        wy: a.ey,
        wz: a.ez,
        accentColor: a.accentColor,
      });
    };

    for (const f of this.fighters.values()) {
      f.fx.update(elapsed);
      f.colorHex = f.fx.getAccentColor();
      f.sprite.setAccentColor(f.colorHex);
      f.sprite.group.position.copy(f.spawnPos);
      f.sprite.setAnimState('idle');
      if (canAttack) {
        f.attackCooldown -= safeDt;
        if (f.attackCooldown <= 0) {
          f.attackCooldown = f.attackInterval;
          const step = f.comboStep;
          f.comboStep = (f.comboStep + 1) % 3;
          const bossPt: WorldPoint3 = { x: 0, y: this.bossStageY, z: BOSS_POS_Z + 0.25 };

          f.sprite.triggerPodiumCast(0.36);
          this.tierVfx.firePodiumWeaponCast({
            rarity: f.rarity,
            chibiId: f.chibiId,
            colorHex: f.colorHex,
            origin: { x: f.spawnPos.x, y: f.spawnPos.y, z: f.spawnPos.z },
            target: bossPt,
            allTargets: [bossPt],
          });
          this.tierVfx.fireAnticipation(f.rarity, f.colorHex, bossPt, [bossPt]);

          this.projectiles.launch(
            {
              style: f.style,
              slotIndex: f.slotIndex,
              targetId: -1,
              dmg: f.dmg,
              comboStep: step,
              accentColor: f.colorHex,
              sx: f.spawnPos.x,
              sy: f.spawnPos.y + 1.25,
              sz: f.spawnPos.z,
              ex: (Math.random() - 0.5) * 0.9,
              ey: this.bossStageY + 1.85,
              ez: BOSS_POS_Z + 0.25,
              attackInterval: f.attackInterval,
              isBoss: true,
            },
            handleOmegaArrival
          );
        }
      } else {
        f.sprite.setAnimState('idle');
      }
      f.sprite.update(safeDt, elapsed, camera);
    }

    if (canAttack) {
      this.projectiles.step(safeDt, camera, handleOmegaArrival);
      for (let i = this.pendingBarrages.length - 1; i >= 0; i--) {
        const b = this.pendingBarrages[i];
        b.delayLeft -= safeDt;
        if (b.delayLeft <= 0) {
          this.pendingBarrages.splice(i, 1);
          const isFinisher = b.beatIndex === BARRAGE_BEAT_WEIGHTS.length - 1;
          this.bossHitBounce = Math.max(this.bossHitBounce, isFinisher ? 0.14 : 0.08);
          this.impactFx.spawnImpact({
            targetX: b.ex,
            targetY: b.ey,
            targetZ: b.ez,
            accentColor: b.accentColor,
            heavy: isFinisher,
            comboStep: b.comboStep,
            attackerX: b.sx,
            attackerZ: b.sz,
            shockwaveScale: isFinisher ? 1.65 : 1.0,
          });
          onStrike?.({
            slotIndex: b.slotIndex,
            attackInterval: b.beatInterval,
            dmg: b.dmg,
            wx: b.ex,
            wy: b.ey,
            wz: b.ez,
            accentColor: b.accentColor,
          });
        }
      }
      if (camera) {
        this.tierVfx.update(safeDt, camera);
      }
    }

    this.impactFx.update(safeDt, camera);
  }

  public dispose(): void {
    this.projectiles.dispose();
    this.tierVfx.dispose();
    if (this.bossSprite) {
      this.bossSprite.dispose();
      this.bossSprite = null;
    }
    for (const f of this.fighters.values()) {
      f.fx.dispose();
      f.sprite.dispose();
    }
    this.fighters.clear();
    this.targetEntries.clear();
    this.impactFx.dispose();
    this.rooftopEnv.dispose();
    this.emberTexture?.dispose();
    for (const g of this.podiumGeos) g.dispose();
    for (const m of this.podiumMats) m.dispose();
    for (const t of this.podiumTextures) t.dispose();
    this.podiumGeos.length = 0;
    this.podiumMats.length = 0;
    this.podiumTextures.length = 0;
    this.playerPodiums.length = 0;
    this.conduitFlows.length = 0;
    disposeObject3D(this.group);
  }
}
