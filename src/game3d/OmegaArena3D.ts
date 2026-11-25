import * as THREE from 'three';
import type { OmegaBossId } from '../game/OmegaData';
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
  syncOmegaFighterEntries,
} from './OmegaArenaStage3D';
import type { TowerFighterConfig } from './TowerArena3D';
import type { PlotAnchorScreen } from './MineSceneStage3D';
import { SignatureProjectilePool3D } from './SignatureProjectilePool3D';
import {
  ARENA_ULT_CHARGE_BASIC_ATTACKS,
  ARENA_ULT_OPENING_PRECHARGE,
  RIFT_TAP_CHARGE_STEP,
  SpotlightAttackQueue,
  TierAttackVfxPool3D,
  type TierVfxHooks,
} from './TierAttackVfx3D';
import {
  type OmegaPendingBarrage,
  stepOmegaCombatAndBarrages,
} from './OmegaArenaCombat3D';

export type { OmegaStrikeEvent };

/** Dedicated 3D "Omega Duel Sanctum" rooftop arena for 30s Rift-style Boss DPS Check battles. */
export class OmegaArena3D {
  public readonly group = new THREE.Group();
  public readonly clickables: THREE.Object3D[] = [];

  private bossId: OmegaBossId = 'crimson-ronin';
  private bossSprite: ChibiSprite3D | null = null;
  private readonly bossHitMesh: THREE.Mesh;
  private readonly bossDaisRingMat: THREE.MeshBasicMaterial;
  private readonly trimNeonMat: THREE.MeshBasicMaterial;
  private readonly secondaryNeonMat: THREE.MeshBasicMaterial;
  private readonly shrineLight: THREE.PointLight;
  private readonly squadFillLight: THREE.PointLight;
  private readonly shockwaveRing: THREE.Mesh;
  private readonly shockwaveMat: THREE.MeshBasicMaterial;
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
  private readonly emberPoints: THREE.Points;
  private readonly emberPositions: Float32Array;
  private readonly emberTexture: THREE.CanvasTexture | null;

  private readonly fighters = new Map<number, OmegaFighterEntry>();
  private readonly impactFx = new AttackImpactFxController();
  private readonly projectiles = new SignatureProjectilePool3D();
  private readonly spotlight = new SpotlightAttackQueue();
  private readonly pendingBarrages: OmegaPendingBarrage[] = [];
  private readonly tierVfx = new TierAttackVfxPool3D();
  private readonly projVec = new THREE.Vector3();
  private readonly prechargedSlots = new Set<number>();
  private tapChargeCounter = 0;
  private lowQuality = false;

  private battleActive = true;
  private bossHitBounce = 0;
  private tierShockwaveTimer = 0;

  constructor() {
    this.group.visible = false;

    this.trimNeonMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.secondaryNeonMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
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
    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.shrineLight = new THREE.PointLight(0xe879f9, 18, 26, 1.3);
    this.shrineLight.position.set(0, 5.2, -3.6);
    this.squadFillLight = new THREE.PointLight(0x93c5fd, 14, 24, 1.3);
    this.squadFillLight.position.set(0, 4.4, 4.8);
    this.group.add(this.shrineLight, this.squadFillLight);

    this.rooftopEnv = createOmegaRooftopEnvironment();
    this.group.add(this.rooftopEnv.group);

    const stageHandles = buildOmegaArenaStage({
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
    this.daisSigilMesh = stageHandles.daisSigil;
    this.daisOuterRingMesh = stageHandles.daisOuterRing;
    this.outerSealRingMesh = stageHandles.outerSealRing;
    this.shrineCrownCrystal = stageHandles.shrineCrownCrystal;
    this.shrineCrownCrystalBaseY = stageHandles.crystalBaseY;
    this.bossPodium = stageHandles.bossPodium;
    this.bossStageY = BOSS_DAIS_Y + 0.04 + this.bossPodium.topY;

    const emberGeo = new THREE.BufferGeometry();
    this.emberPositions = new Float32Array(EMBER_COUNT * 3);
    for (let i = 0; i < EMBER_COUNT; i++) {
      this.emberPositions[i * 3] = ((i * 37) % 18) - 9;
      this.emberPositions[i * 3 + 1] = ((i * 19) % 8);
      this.emberPositions[i * 3 + 2] = ((i * 29) % 14) - 7;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));
    this.emberTexture = createOmegaEmberDotTexture();
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

    const hitGeo = new THREE.CylinderGeometry(2.35, 2.35, 4.6, 12);
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    this.podiumGeos.push(hitGeo);
    this.podiumMats.push(hitMat);
    this.bossHitMesh = new THREE.Mesh(hitGeo, hitMat);
    this.bossHitMesh.position.set(0, this.bossStageY + 2.2, BOSS_POS_Z);
    this.bossHitMesh.userData = { kind: 'omega-boss' };
    this.group.add(this.bossHitMesh);
    this.clickables.push(this.bossHitMesh);

    const ringGeo = new THREE.RingGeometry(2.75, 3.12, 48);
    this.podiumGeos.push(ringGeo);
    this.podiumMats.push(this.shockwaveMat);
    this.shockwaveRing = new THREE.Mesh(ringGeo, this.shockwaveMat);
    this.shockwaveRing.rotation.x = -Math.PI / 2;
    this.shockwaveRing.position.set(0, BOSS_DAIS_Y + 0.035, BOSS_POS_Z);
    this.group.add(this.shockwaveRing);

    this.group.add(this.impactFx.group, this.projectiles.group, this.tierVfx.group);
    this.setBossId('crimson-ronin');
  }

  public setBossId(bossId: OmegaBossId): void {
    this.bossId = bossId;
    const isSovereign = bossId === 'obsidian-sovereign';
    const isLeviathan = bossId === 'abyssal-leviathan';
    const accentHex = isLeviathan ? '#06b6d4' : isSovereign ? '#a855f7' : '#ef4444';
    const secHex = isLeviathan ? '#67e8f9' : isSovereign ? '#38bdf8' : '#fde047';

    this.trimNeonMat.color.set(accentHex);
    this.secondaryNeonMat.color.set(secHex);
    this.bossDaisRingMat.color.set(accentHex);
    this.outerFloorSealMat.color.set(secHex);
    this.shrineLight.color.set(accentHex);
    this.squadFillLight.color.set(secHex);
    applyOmegaPodiumColors(this.bossPodium, accentHex, secHex, true, 1.35);

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

  public setBattleActive(active: boolean): void {
    this.battleActive = active;
    if (!active) {
      this.resetCombatState();
    } else {
      this.applyOpeningPrecharge();
    }
  }

  public resetCombatState(): void {
    this.projectiles.clear();
    this.pendingBarrages.length = 0;
    this.tierVfx.clear();
    this.spotlight.reset();
    this.tierShockwaveTimer = 0;
    this.shockwaveMat.opacity = 0;
    this.prechargedSlots.clear();
    this.tapChargeCounter = 0;
    for (const f of this.fighters.values()) {
      f.sprite.setAnimState('idle');
      f.sprite.group.position.copy(f.spawnPos);
      f.attackCooldown = 0.08 + f.slotIndex * 0.16;
      f.chargeSec = 0;
      f.ultCharge = 0;
      f.ultBankSec = 0;
      f.ultArmed = false;
      f.ultActiveTimer = 0;
    }
  }

  private applyOpeningPrecharge(): void {
    const precharge = Math.min(Math.max(1, ARENA_ULT_CHARGE_BASIC_ATTACKS - 1), ARENA_ULT_OPENING_PRECHARGE);
    for (const f of this.fighters.values()) {
      if (this.prechargedSlots.has(f.slotIndex)) continue;
      this.prechargedSlots.add(f.slotIndex);
      f.ultCharge = Math.max(f.ultCharge, precharge);
    }
  }

  public recordPlayerTapCharge(): boolean {
    if (!this.battleActive || this.fighters.size === 0) return false;
    this.tapChargeCounter += 1;
    if (this.tapChargeCounter < RIFT_TAP_CHARGE_STEP) return false;
    this.tapChargeCounter = 0;

    let target: OmegaFighterEntry | null = null;
    for (const f of this.fighters.values()) {
      if (f.ultActiveTimer > 0 || f.ultArmed || f.ultCharge >= ARENA_ULT_CHARGE_BASIC_ATTACKS) continue;
      if (!target || f.ultCharge < target.ultCharge) {
        target = f;
      }
    }
    if (!target) return false;
    target.ultCharge = Math.min(ARENA_ULT_CHARGE_BASIC_ATTACKS, target.ultCharge + 1);
    if (target.ultCharge >= ARENA_ULT_CHARGE_BASIC_ATTACKS) {
      target.ultArmed = true;
    }
    return true;
  }

  public grantSquadUltCharge(fillFull = true, amount = 1): void {
    const safeAmt = Math.max(1, Math.round(amount));
    for (const f of this.fighters.values()) {
      if (f.ultActiveTimer > 0) continue;
      f.ultCharge = fillFull
        ? ARENA_ULT_CHARGE_BASIC_ATTACKS
        : Math.min(ARENA_ULT_CHARGE_BASIC_ATTACKS, f.ultCharge + safeAmt);
      if (f.ultCharge >= ARENA_ULT_CHARGE_BASIC_ATTACKS) {
        f.ultArmed = true;
      }
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
    if (this.battleActive) {
      this.applyOpeningPrecharge();
    }
  }

  public triggerBossHitEffect(accentColor?: string, isCrit = false): void {
    this.bossHitBounce = 0.24;
    this.impactFx.spawnImpact({
      targetX: (Math.random() - 0.5) * 0.5,
      targetY: this.bossStageY + 1.45,
      targetZ: BOSS_POS_Z + 0.35,
      accentColor:
        accentColor ??
        (this.bossId === 'abyssal-leviathan'
          ? '#06b6d4'
          : this.bossId === 'obsidian-sovereign'
            ? '#e879f9'
            : '#ef4444'),
      heavy: isCrit,
      shockwaveScale: isCrit ? 1.55 : 1.1,
    });
  }

  public triggerTierShockwave(tier: number): void {
    this.tierShockwaveTimer = 0.65;
    this.shockwaveRing.scale.setScalar(1);
    this.shockwaveMat.color.setHex(tier >= 4 ? 0xfde047 : tier >= 2 ? 0xe879f9 : 0xef4444);
    this.impactFx.spawnImpact({
      targetX: 0,
      targetY: this.bossStageY + 0.6,
      targetZ: BOSS_POS_Z + 0.4,
      accentColor: tier >= 4 ? '#fde047' : '#ef4444',
      heavy: true,
      shockwaveScale: 2.3,
    });
  }

  public getBossWorldPos(): { x: number; y: number; z: number } {
    return { x: 0, y: this.bossStageY + 1.85, z: BOSS_POS_Z + 0.2 };
  }

  public getBossHeadScreenAnchor(camera: THREE.Camera, width: number, height: number): { x: number; y: number } | null {
    this.projVec.set(0, this.bossStageY + 3.45, BOSS_POS_Z).project(camera);
    if (this.projVec.z <= -1 || this.projVec.z >= 1) return null;
    return {
      x: (this.projVec.x * 0.5 + 0.5) * width,
      y: (-this.projVec.y * 0.5 + 0.5) * height,
    };
  }

  public getFighterPlotAnchors(
    camera: THREE.Camera,
    width: number,
    height: number
  ): PlotAnchorScreen[] {
    const out: PlotAnchorScreen[] = [];
    if (!this.group.visible) return out;
    for (const f of this.fighters.values()) {
      f.sprite.getLabelAnchorWorldPosition(this.projVec, 0.14, true).project(camera);
      const visible = this.projVec.z > -1 && this.projVec.z < 1;
      const labelX = (this.projVec.x * 0.5 + 0.5) * width;
      const labelY = (-this.projVec.y * 0.5 + 0.5) * height;
      out.push({
        slotIndex: f.slotIndex,
        labelX,
        labelY,
        btnX: labelX,
        btnY: labelY,
        visible,
        rarity: f.rarity,
        ultCharge: f.ultCharge,
        ultMaxCharge: ARENA_ULT_CHARGE_BASIC_ATTACKS,
        ultArmed: f.ultArmed,
        ulting: f.ultActiveTimer > 0,
      });
    }
    return out;
  }

  public update(
    dt: number,
    elapsed: number,
    camera: THREE.Camera,
    onStrike?: (ev: OmegaStrikeEvent) => void
  ): void {
    if (!this.group.visible) return;
    const safeDt = Math.min(Math.max(0, dt), 0.1);

    if (this.bossHitBounce > 0) {
      this.bossHitBounce = Math.max(0, this.bossHitBounce - safeDt);
    }
    if (this.tierShockwaveTimer > 0) {
      this.tierShockwaveTimer = Math.max(0, this.tierShockwaveTimer - safeDt);
      const p = 1 - this.tierShockwaveTimer / 0.65;
      this.shockwaveRing.scale.setScalar(1 + p * 2.2);
      this.shockwaveMat.opacity = Math.max(0, (1 - p) * 0.85);
    } else {
      this.shockwaveMat.opacity = 0;
    }

    if (this.bossSprite) {
      const bob = Math.sin(elapsed * 2.4) * 0.08;
      const bounceZ = this.bossHitBounce > 0 ? -Math.sin((this.bossHitBounce / 0.24) * Math.PI) * 0.16 : 0;
      this.bossSprite.group.position.set(0, this.bossStageY + bob, BOSS_POS_Z + bounceZ);
      this.bossSprite.group.scale.setScalar(3.15);
      this.bossSprite.update(safeDt, elapsed, camera);
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

    this.bossDaisRingMat.opacity = 0.72 + Math.sin(elapsed * 3) * 0.14;
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

    for (const flow of this.conduitFlows) {
      if (!flow.pulses[0]?.visible) continue;
      for (let pIdx = 0; pIdx < flow.pulses.length; pIdx++) {
        const frac = (elapsed * 0.85 + flow.slotIndex * 0.19 + pIdx * 0.5) % 1;
        const pulse = flow.pulses[pIdx];
        pulse.position.x = flow.startX + (flow.endX - flow.startX) * frac;
        pulse.position.z = flow.startZ + (flow.endZ - flow.startZ) * frac;
      }
    }

    stepOmegaCombatAndBarrages({
      safeDt,
      elapsed,
      camera,
      bossId: this.bossId,
      bossStageY: this.bossStageY,
      bossPosZ: BOSS_POS_Z,
      getBattleActive: () => this.battleActive,
      fighters: this.fighters,
      projectiles: this.projectiles,
      pendingBarrages: this.pendingBarrages,
      tierVfx: this.tierVfx,
      impactFx: this.impactFx,
      spotlight: this.spotlight,
      onBossHitBounce: (bounce) => {
        this.bossHitBounce = Math.max(this.bossHitBounce, bounce);
      },
      onStrike,
    });

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
