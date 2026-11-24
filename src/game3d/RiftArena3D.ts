import * as THREE from 'three';
import type { AnomalyChibiId } from '../game/AnomalyData';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { type ChibiDef, getChibiById } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { type CyberShowcasePodiumHandle, createCyberShowcasePodium, type FusionPodiumBuildCtx } from './FusionWorldPodium3D';
import { disposeObject3D } from './MeshHelpers3D';
import {
  applyOmegaPodiumColors,
  OMEGA_PLAYER_PAD_POSITIONS,
  type OmegaConduitFlowEntry,
  type OmegaFighterEntry,
  syncOmegaFighterEntries,
} from './OmegaArenaStage3D';
import type { PlotAnchorScreen } from './MineSceneStage3D';
import {
  buildRiftPlazaArchitecture,
  createRiftCityEnvironment,
  type RiftCityEnvironmentHandle,
  type RiftEmberSeed,
} from './RiftCityEnvironment3D';
import { type SignatureProjectileArrival, SignatureProjectilePool3D } from './SignatureProjectilePool3D';
import {
  BARRAGE_BEAT_WEIGHTS,
  BARRAGE_FOLLOWUP_DELAYS,
  computeAttackVfxSpeedScale,
  computeSpotlightMaxChargeSec,
  SpotlightAttackQueue,
  TierAttackVfxPool3D,
  type TierVfxHooks,
  ULT_CHARGE_BASIC_ATTACKS,
  ULT_SPOTLIGHT_LOCK_SEC,
  type WorldPoint3,
} from './TierAttackVfx3D';
import type { TowerFighterConfig } from './TowerArena3D';

const RIFT_BOSS_POS_Z = -4.2;
const RIFT_BOSS_DAIS_Y = 0.56;
const RIFT_BOSS_SCALE = 3.2;
const BASIC_ATTACK_DPS_SHARE = 0.65;

export interface RiftStrikeEvent {
  slotIndex: number;
  attackInterval: number;
  isUltimate: boolean;
  beatIndex: number;
  isFinisher: boolean;
  dmg: number;
  wx: number;
  wy: number;
  wz: number;
  accentColor: string;
}

/** Dedicated 3D Subterranean Cyber-Metro Citadel Arena for 30s Rift Boss DPS-Check battles. */
export class RiftArena3D {
  public readonly group = new THREE.Group();
  public readonly clickables: THREE.Object3D[] = [];

  private bossId: AnomalyChibiId = 'void-asura';
  private surgeActive = false;
  private bossSprite: ChibiSprite3D | null = null;
  private readonly cityEnv: RiftCityEnvironmentHandle;
  private readonly bossHitMesh: THREE.Mesh;
  private readonly bossPodium: CyberShowcasePodiumHandle;
  private readonly bossStageY: number;
  private readonly playerPodiums: CyberShowcasePodiumHandle[] = [];
  private readonly conduitFlows: OmegaConduitFlowEntry[] = [];
  private readonly primaryNeonMat: THREE.MeshBasicMaterial;
  private readonly secondaryNeonMat: THREE.MeshBasicMaterial;
  private readonly daisSealMat: THREE.MeshBasicMaterial;
  private readonly shockwaveRing: THREE.Mesh;
  private readonly shockwaveMat: THREE.MeshBasicMaterial;
  private readonly emberPoints: THREE.Points;
  private readonly emberPosAttr: THREE.BufferAttribute;
  private readonly emberSeeds: RiftEmberSeed[];
  private readonly fanBlades: THREE.Object3D[];
  private readonly voidLight: THREE.PointLight;
  private readonly squadLight: THREE.PointLight;

  private readonly ownedGeos: THREE.BufferGeometry[] = [];
  private readonly ownedMats: THREE.Material[] = [];
  private readonly ownedTexs: THREE.Texture[] = [];

  private readonly fighters = new Map<number, OmegaFighterEntry>();
  private readonly impactFx = new AttackImpactFxController();
  private readonly projectiles = new SignatureProjectilePool3D();
  private readonly spotlight = new SpotlightAttackQueue();
  private readonly tierVfx = new TierAttackVfxPool3D();
  private readonly projVec = new THREE.Vector3();
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

  private lowQuality = false;
  private battleActive = false;
  private bossHitBounce = 0;
  private tierShockwaveTimer = 0;

  constructor() {
    this.group.visible = false;

    this.primaryNeonMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.secondaryNeonMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    this.daisSealMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x263147,
      roughness: 0.48,
      metalness: 0.48,
      flatShading: true,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x3b4963,
      roughness: 0.36,
      metalness: 0.58,
      flatShading: true,
    });
    const brightMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.28,
      metalness: 0.58,
      flatShading: true,
    });
    this.ownedMats.push(
      this.primaryNeonMat,
      this.secondaryNeonMat,
      this.daisSealMat,
      this.shockwaveMat,
      armorMat,
      steelMat,
      brightMat
    );

    // Subterranean Cyber-Metro Canyon Environment
    this.cityEnv = createRiftCityEnvironment();
    this.group.add(this.cityEnv.group);

    this.voidLight = new THREE.PointLight(0x6366f1, 18, 32, 1.25);
    this.voidLight.position.set(0, 5.6, RIFT_BOSS_POS_Z);
    this.squadLight = new THREE.PointLight(0x22d3ee, 15, 26, 1.25);
    this.squadLight.position.set(0, 4.6, 4.4);
    this.group.add(this.voidLight, this.squadLight);

    const plazaStage = buildRiftPlazaArchitecture({
      group: this.group,
      armorMat,
      steelMat,
      brightMat,
      primaryNeonMat: this.primaryNeonMat,
      secondaryNeonMat: this.secondaryNeonMat,
      daisSealMat: this.daisSealMat,
      shockwaveMat: this.shockwaveMat,
      bossPosZ: RIFT_BOSS_POS_Z,
      bossDaisY: RIFT_BOSS_DAIS_Y,
      ownedGeos: this.ownedGeos,
      ownedMats: this.ownedMats,
      ownedTexs: this.ownedTexs,
    });
    this.shockwaveRing = plazaStage.shockwaveRing;
    this.emberPoints = plazaStage.emberPoints;
    this.emberPosAttr = plazaStage.emberPosAttr;
    this.emberSeeds = plazaStage.emberSeeds;
    this.fanBlades = plazaStage.fanBlades;

    const podiumCtx: FusionPodiumBuildCtx = {
      armorDarkMat: armorMat,
      armorSteelMat: steelMat,
      brightSteelMat: brightMat,
      ownedGeos: this.ownedGeos,
      ownedMats: this.ownedMats,
      ownedTextures: this.ownedTexs,
    };

    this.bossPodium = createCyberShowcasePodium(podiumCtx, 'RIFT', 1.85, true);
    this.bossPodium.group.position.set(0, RIFT_BOSS_DAIS_Y + 0.04, RIFT_BOSS_POS_Z);
    this.group.add(this.bossPodium.group);
    this.bossStageY = RIFT_BOSS_DAIS_Y + 0.04 + this.bossPodium.topY;

    const pulseGeo = new THREE.OctahedronGeometry(0.085, 0);
    pulseGeo.scale(0.85, 0.55, 2.2);
    this.ownedGeos.push(pulseGeo);

    for (let i = 0; i < OMEGA_PLAYER_PAD_POSITIONS.length; i++) {
      const [sx, sz] = OMEGA_PLAYER_PAD_POSITIONS[i];
      const podium = createCyberShowcasePodium(podiumCtx, `0${i + 1}`, 0.92, false);
      podium.group.position.set(sx, 0, sz);
      applyOmegaPodiumColors(podium, '#22d3ee', '#a855f7', false, 0.72);
      this.group.add(podium.group);
      this.playerPodiums.push(podium);

      // Straight illuminated energy conduit from player pad to Boss plinth
      const dx = -sx;
      const dz = RIFT_BOSS_POS_Z - sz;
      const totalDist = Math.hypot(dx, dz);
      const startOff = 0.92;
      const endOff = 3.25;
      const segLen = totalDist - startOff - endOff;
      if (segLen > 0.4) {
        const nx = dx / totalDist;
        const nz = dz / totalDist;
        const startX = sx + nx * startOff;
        const startZ = sz + nz * startOff;
        const endX = sx + nx * (totalDist - endOff);
        const endZ = sz + nz * (totalDist - endOff);
        const yaw = Math.atan2(dx, dz);

        const conduitGroup = new THREE.Group();
        conduitGroup.position.set((startX + endX) * 0.5, 0, (startZ + endZ) * 0.5);
        conduitGroup.rotation.y = yaw;

        const channelGeo = new THREE.BoxGeometry(0.28, 0.026, segLen);
        const coreGeo = new THREE.BoxGeometry(0.095, 0.02, Math.max(0.2, segLen - 0.06));
        const railGeo = new THREE.BoxGeometry(0.024, 0.016, Math.max(0.2, segLen - 0.02));
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.42 });
        this.ownedGeos.push(channelGeo, coreGeo, railGeo);
        this.ownedMats.push(coreMat);

        const channel = new THREE.Mesh(channelGeo, armorMat);
        channel.position.y = 0.024;
        const coreVein = new THREE.Mesh(coreGeo, coreMat);
        coreVein.position.y = 0.042;
        conduitGroup.add(channel, coreVein);

        for (const rx of [-0.125, 0.125]) {
          const rail = new THREE.Mesh(railGeo, this.secondaryNeonMat);
          rail.position.set(rx, 0.043, 0);
          conduitGroup.add(rail);
        }
        this.group.add(conduitGroup);

        const pulses: THREE.Mesh[] = [];
        for (let p = 0; p < 2; p++) {
          const pulse = new THREE.Mesh(pulseGeo, coreMat);
          pulse.rotation.y = yaw;
          pulse.position.set(startX, 0.065, startZ);
          pulse.visible = false;
          this.group.add(pulse);
          pulses.push(pulse);
        }
        this.conduitFlows.push({ slotIndex: i, startX, startZ, endX, endZ, coreMat, pulses });
      }
    }

    // Boss click hitbox
    const hitGeo = new THREE.CylinderGeometry(2.4, 2.4, 4.8, 12);
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    this.ownedGeos.push(hitGeo);
    this.ownedMats.push(hitMat);
    this.bossHitMesh = new THREE.Mesh(hitGeo, hitMat);
    this.bossHitMesh.position.set(0, this.bossStageY + 2.2, RIFT_BOSS_POS_Z);
    this.bossHitMesh.userData = { kind: 'rift-boss' };
    this.group.add(this.bossHitMesh);
    this.clickables.push(this.bossHitMesh);

    this.group.add(this.impactFx.group, this.projectiles.group, this.tierVfx.group);
    this.setBossConfig('void-asura');
  }

  public setBossConfig(bossId: AnomalyChibiId): void {
    this.bossId = bossId;
    const isAsura = bossId === 'void-asura';
    const primaryHex = isAsura ? '#ef4444' : '#a855f7';
    const secHex = isAsura ? '#fbbf24' : '#22d3ee';

    this.primaryNeonMat.color.set(primaryHex);
    this.secondaryNeonMat.color.set(secHex);
    this.daisSealMat.color.set(secHex);
    this.shockwaveMat.color.set(secHex);
    this.voidLight.color.set(primaryHex);
    this.squadLight.color.set(secHex);
    this.cityEnv.setAccentPalette(primaryHex, secHex);
    applyOmegaPodiumColors(this.bossPodium, primaryHex, secHex, true, 1.35);

    if (this.bossSprite) {
      this.group.remove(this.bossSprite.group);
      this.bossSprite.dispose();
      this.bossSprite = null;
    }

    const chibiDef: ChibiDef | undefined = getChibiById(bossId);
    if (chibiDef) {
      this.bossSprite = new ChibiSprite3D(chibiDef);
      this.bossSprite.group.position.set(0, this.bossStageY, RIFT_BOSS_POS_Z);
      this.bossSprite.group.scale.setScalar(RIFT_BOSS_SCALE);
      this.bossSprite.setFacing(-1);
      this.bossSprite.setLowQuality(this.lowQuality);
      this.group.add(this.bossSprite.group);
    }
  }

  public setSurgeActive(active: boolean): void {
    this.surgeActive = active;
  }

  public setBattleActive(active: boolean): void {
    this.battleActive = active;
    if (!active) {
      this.resetCombatState();
    }
  }

  public setTierVfxHooks(hooks: TierVfxHooks): void {
    this.tierVfx.setHooks(hooks);
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.cityEnv.setLowQuality(low);
    this.emberPoints.visible = !low;
    this.impactFx.setLowQuality(low);
    this.projectiles.setLowQuality(low);
    this.tierVfx.setLowQuality(low);
    this.bossSprite?.setLowQuality(low);
    this.bossPodium.setLowQuality(low);
    for (const p of this.playerPodiums) p.setLowQuality(low);
    for (const f of this.fighters.values()) {
      f.sprite.setLowQuality(low);
      f.fx.setLowQuality(low);
    }
  }

  public resetCombatState(): void {
    this.projectiles.clear();
    this.pendingBarrages.length = 0;
    this.tierVfx.clear();
    this.spotlight.reset();
    this.tierShockwaveTimer = 0;
    this.shockwaveMat.opacity = 0;
    for (const f of this.fighters.values()) {
      f.sprite.setAnimState('idle');
      f.sprite.group.position.copy(f.spawnPos);
      f.attackCooldown = 0.08 + f.slotIndex * 0.14;
      f.chargeSec = 0;
      f.ultCharge = 0;
      f.ultBankSec = 0;
      f.ultArmed = false;
      f.ultActiveTimer = 0;
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

  public triggerBossHit(accentColor?: string, isCrit = false): void {
    this.bossHitBounce = 0.24;
    this.impactFx.spawnImpact({
      targetX: (Math.random() - 0.5) * 0.6,
      targetY: this.bossStageY + 1.5,
      targetZ: RIFT_BOSS_POS_Z + 0.35,
      accentColor: accentColor ?? (this.bossId === 'void-asura' ? '#ef4444' : '#22d3ee'),
      heavy: isCrit,
      shockwaveScale: isCrit ? 1.65 : 1.15,
    });
  }

  public triggerTierShockwave(tier: number): void {
    this.tierShockwaveTimer = 0.65;
    this.shockwaveRing.scale.setScalar(1);
    this.shockwaveMat.color.setHex(tier >= 8 ? 0xfde047 : tier >= 4 ? 0xa855f7 : 0x22d3ee);
    this.impactFx.spawnImpact({
      targetX: 0,
      targetY: this.bossStageY + 0.6,
      targetZ: RIFT_BOSS_POS_Z + 0.4,
      accentColor: tier >= 8 ? '#fde047' : '#22d3ee',
      heavy: true,
      shockwaveScale: 2.3,
    });
  }

  public getBossWorldPos(): { x: number; y: number; z: number } {
    return { x: 0, y: this.bossStageY + 1.75, z: RIFT_BOSS_POS_Z + 0.3 };
  }

  public getFighterPlotAnchors(
    camera: THREE.Camera,
    width: number,
    height: number
  ): PlotAnchorScreen[] {
    const out: PlotAnchorScreen[] = [];
    if (!this.group.visible) return out;
    const ultReq = this.surgeActive ? 3 : ULT_CHARGE_BASIC_ATTACKS;
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
        ultCharge: Math.min(ultReq, f.ultCharge),
        ultMaxCharge: ultReq,
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
    onStrike?: (ev: RiftStrikeEvent) => void
  ): void {
    if (!this.group.visible) return;
    const safeDt = Math.min(Math.max(0, dt), 0.1);
    const ultReq = this.surgeActive ? 3 : ULT_CHARGE_BASIC_ATTACKS;
    const cadenceMult = this.surgeActive ? 1.3 : 1;

    if (this.bossHitBounce > 0) this.bossHitBounce = Math.max(0, this.bossHitBounce - safeDt);

    if (this.tierShockwaveTimer > 0) {
      this.tierShockwaveTimer = Math.max(0, this.tierShockwaveTimer - safeDt);
      const p = 1 - this.tierShockwaveTimer / 0.65;
      this.shockwaveRing.scale.setScalar(1 + p * 3.4);
      this.shockwaveMat.opacity = (1 - p) * 0.85;
    } else {
      this.shockwaveMat.opacity = 0;
    }

    this.cityEnv.update(safeDt, elapsed);
    for (const blade of this.fanBlades) {
      blade.rotation.y += safeDt * 7.5;
    }

    if (this.emberPoints.visible) {
      const arr = this.emberPosAttr.array as Float32Array;
      for (let i = 0; i < this.emberSeeds.length; i++) {
        const seed = this.emberSeeds[i];
        const y = -15 + ((elapsed * seed.speed + seed.phase) % 1) * 18.0;
        arr[i * 3] = seed.baseX + Math.cos(elapsed * 0.9 + seed.phase) * seed.radius;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = seed.baseZ + Math.sin(elapsed * 0.9 + seed.phase) * seed.radius;
      }
      this.emberPosAttr.needsUpdate = true;
    }

    const pulseSpeed = this.battleActive ? (this.surgeActive ? 1.55 : 1.1) : 0.45;
    for (let i = 0; i < this.conduitFlows.length; i++) {
      const cf = this.conduitFlows[i];
      for (let p = 0; p < cf.pulses.length; p++) {
        const pulse = cf.pulses[p];
        if (!pulse.visible) continue;
        const frac = (elapsed * pulseSpeed + i * 0.17 + p * 0.5) % 1;
        pulse.position.set(
          cf.startX + (cf.endX - cf.startX) * frac,
          0.065,
          cf.startZ + (cf.endZ - cf.startZ) * frac
        );
      }
    }

    if (this.bossSprite) {
      const bob = Math.sin(elapsed * 2.3) * 0.1;
      const bounceZ = this.bossHitBounce > 0 ? -Math.sin((this.bossHitBounce / 0.24) * Math.PI) * 0.18 : 0;
      this.bossSprite.group.position.set(0, this.bossStageY + bob, RIFT_BOSS_POS_Z + bounceZ);
      this.bossSprite.group.scale.setScalar(RIFT_BOSS_SCALE);
      this.bossSprite.update(safeDt, elapsed, camera);
    }

    const animatePodium = (pod: CyberShowcasePodiumHandle, phaseOffset: number): void => {
      const pTime = elapsed + phaseOffset;
      pod.sigilMesh.rotation.z = pTime * 0.32;
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

    const handleRiftArrival = (a: SignatureProjectileArrival): void => {
      const fighter = this.fighters.get(a.slotIndex);
      const isUlt = a.isUltimate;
      if (isUlt && fighter) {
        const lateralX = Math.max(-0.95, Math.min(0.95, fighter.spawnPos.x * 0.22));
        const bossPt: WorldPoint3 = { x: lateralX, y: this.bossStageY, z: RIFT_BOSS_POS_Z + 0.25 };
        const speedScale = computeAttackVfxSpeedScale(fighter.attackInterval / cadenceMult);
        this.tierVfx.fireTierAttack({
          rarity: fighter.rarity,
          chibiId: fighter.chibiId,
          colorHex: a.accentColor,
          target: bossPt,
          allTargets: [bossPt],
          comboStep: a.comboStep,
          speedScale,
          areaScale: 0.92,
          wideCenter: { x: lateralX * 0.75, y: this.bossStageY, z: RIFT_BOSS_POS_Z + 0.25 },
        });
      }
      if (isUlt) {
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
      }
      this.tierVfx.fireBarrageHitSlash({
        x: a.ex,
        y: a.ey,
        z: a.ez,
        colorHex: a.accentColor,
        beatIndex: 0,
        isFinisher: false,
        scale: isUlt ? 1.38 : 1.0,
      });
      if (!isUlt) {
        this.impactFx.spawnImpact({
          targetX: a.ex,
          targetY: a.ey,
          targetZ: a.ez,
          accentColor: a.accentColor,
          heavy: false,
          comboStep: a.comboStep % 2,
          attackerX: a.sx,
          attackerZ: a.sz,
          shockwaveScale: 0.72,
        });
      }
      onStrike?.({
        slotIndex: a.slotIndex,
        attackInterval: isUlt ? a.attackInterval * BARRAGE_BEAT_WEIGHTS[0] : a.attackInterval,
        isUltimate: isUlt,
        beatIndex: 0,
        isFinisher: false,
        dmg: isUlt ? Math.max(1, Math.round(a.dmg * BARRAGE_BEAT_WEIGHTS[0])) : a.dmg,
        wx: a.ex,
        wy: a.ey,
        wz: a.ez,
        accentColor: a.accentColor,
      });
    };

    const maxChargeSec = computeSpotlightMaxChargeSec(this.fighters.size);
    if (this.battleActive) {
      this.spotlight.step(safeDt);
    }

    for (const f of this.fighters.values()) {
      f.fx.update(elapsed, camera);
      f.colorHex = f.fx.getAccentColor();
      f.sprite.setAccentColor(f.colorHex);
      f.sprite.group.position.copy(f.spawnPos);
      f.sprite.setAnimState('idle');
      if (this.battleActive) {
        f.attackCooldown = Math.max(0, f.attackCooldown - safeDt);
        if (f.ultActiveTimer > 0) f.ultActiveTimer = Math.max(0, f.ultActiveTimer - safeDt);
        f.chargeSec = Math.min(maxChargeSec, f.chargeSec + safeDt);
        const effInterval = f.attackInterval / cadenceMult;
        if (f.ultCharge >= ultReq && !f.ultArmed && f.attackCooldown <= effInterval * 0.55) {
          f.ultArmed = true;
        }
      }
      f.sprite.update(safeDt, elapsed, camera);
    }

    if (!this.battleActive) {
      this.impactFx.update(safeDt, camera);
      return;
    }

    const launchRiftAttack = (f: OmegaFighterEntry, isUltimate: boolean, effectiveSec: number): void => {
      const step = f.comboStep;
      f.comboStep = (f.comboStep + 1) % 3;
      const bossPt: WorldPoint3 = { x: 0, y: this.bossStageY, z: RIFT_BOSS_POS_Z + 0.25 };
      if (isUltimate) {
        f.sprite.triggerUltOpening(0.52);
        this.tierVfx.fireUltOpeningBurst({
          x: f.spawnPos.x,
          y: f.spawnPos.y,
          z: f.spawnPos.z,
          colorHex: f.colorHex,
        });
      } else {
        f.sprite.triggerPodiumCast(0.24);
      }
      this.tierVfx.firePodiumWeaponCast({
        rarity: isUltimate ? f.rarity : 'common',
        chibiId: f.chibiId,
        colorHex: f.colorHex,
        origin: { x: f.spawnPos.x, y: f.spawnPos.y, z: f.spawnPos.z },
        target: bossPt,
        allTargets: [bossPt],
      });
      if (isUltimate) {
        this.tierVfx.fireAnticipation(f.rarity, f.colorHex, bossPt, [bossPt]);
      }
      this.projectiles.launch(
        {
          style: f.style,
          slotIndex: f.slotIndex,
          targetId: -1,
          dmg: Math.max(1, Math.round(f.dmg * effectiveSec)),
          comboStep: step,
          accentColor: f.colorHex,
          sx: f.spawnPos.x,
          sy: f.spawnPos.y + 1.25,
          sz: f.spawnPos.z,
          ex: (Math.random() - 0.5) * 0.9,
          ey: this.bossStageY + 1.85,
          ez: RIFT_BOSS_POS_Z + 0.25,
          attackInterval: effectiveSec,
          isBoss: true,
          isUltimate,
        },
        handleRiftArrival
      );
    };

    const activeUltFighter = this.spotlight.pickNextReady(this.fighters.values(), (f) => (f.ultArmed ? 0 : 1));
    if (activeUltFighter) {
      const ultSec = Math.max(0.01, activeUltFighter.ultBankSec + activeUltFighter.chargeSec);
      const effInterval = activeUltFighter.attackInterval / cadenceMult;
      activeUltFighter.attackCooldown = Math.max(effInterval, ULT_SPOTLIGHT_LOCK_SEC);
      activeUltFighter.chargeSec = 0;
      activeUltFighter.ultBankSec = 0;
      activeUltFighter.ultCharge = 0;
      activeUltFighter.ultArmed = false;
      activeUltFighter.ultActiveTimer = ULT_SPOTLIGHT_LOCK_SEC;
      this.spotlight.claim(activeUltFighter.slotIndex, ULT_SPOTLIGHT_LOCK_SEC);
      launchRiftAttack(activeUltFighter, true, ultSec);
    }

    for (const f of this.fighters.values()) {
      if (f.attackCooldown > 0 || f.ultActiveTimer > 0) continue;
      const elapsedSec = Math.max(0.01, f.chargeSec);
      const basicSec = elapsedSec * BASIC_ATTACK_DPS_SHARE;
      f.ultBankSec = Math.min(maxChargeSec, f.ultBankSec + elapsedSec * (1 - BASIC_ATTACK_DPS_SHARE));
      f.chargeSec = 0;
      f.attackCooldown = f.attackInterval / cadenceMult;
      f.ultCharge = Math.min(ultReq, f.ultCharge + 1);
      launchRiftAttack(f, false, basicSec);
    }

    this.projectiles.step(safeDt, camera, handleRiftArrival);
    for (let i = this.pendingBarrages.length - 1; i >= 0; i--) {
      if (this.pendingBarrages.length === 0) break;
      if (i >= this.pendingBarrages.length) i = this.pendingBarrages.length - 1;
      const b = this.pendingBarrages[i];
      if (!b) continue;
      b.delayLeft -= safeDt;
      if (b.delayLeft <= 0) {
        this.pendingBarrages.splice(i, 1);
        const isFinisher = b.beatIndex === BARRAGE_BEAT_WEIGHTS.length - 1;
        this.bossHitBounce = Math.max(this.bossHitBounce, isFinisher ? 0.14 : 0.08);
        this.tierVfx.fireBarrageHitSlash({
          x: b.ex,
          y: b.ey,
          z: b.ez,
          colorHex: b.accentColor,
          beatIndex: b.beatIndex,
          isFinisher,
          scale: 1.38,
        });
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
          isUltimate: true,
          beatIndex: b.beatIndex,
          isFinisher,
          dmg: b.dmg,
          wx: b.ex,
          wy: b.ey,
          wz: b.ez,
          accentColor: b.accentColor,
        });
      }
    }

    this.tierVfx.update(safeDt, camera);
    this.impactFx.update(safeDt, camera);
  }

  public dispose(): void {
    this.cityEnv.dispose();
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
    for (const g of this.ownedGeos) g.dispose();
    for (const m of this.ownedMats) m.dispose();
    for (const t of this.ownedTexs) t.dispose();
    this.ownedGeos.length = 0;
    this.ownedMats.length = 0;
    this.ownedTexs.length = 0;
    this.playerPodiums.length = 0;
    this.conduitFlows.length = 0;
    disposeObject3D(this.group);
  }
}
