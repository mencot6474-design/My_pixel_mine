import * as THREE from 'three';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { ChibiSprite3D } from './ChibiSprite3D';
import type { CyberShowcasePodiumHandle } from './FusionWorldPodium3D';

export interface FusionMaterialSlotRef {
  podium: CyberShowcasePodiumHandle;
  holoGridRing: THREE.Mesh;
  conduitPulseMeshes: THREE.Mesh[];
  sprite: ChibiSprite3D | null;
  ready: boolean;
}

export interface FusionOreClusterRef {
  crystalMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  floatingShards: THREE.Mesh[];
  ready: boolean;
  phase: number;
}

export interface FusionFloatingIslandRef {
  group: THREE.Group;
  baseY: number;
  phase: number;
  bobSpeed: number;
}

export interface FusionEnergyOrb {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  from: THREE.Vector3;
  to: THREE.Vector3;
  age: number;
  dur: number;
  arcH: number;
}

export interface FusionSeqState {
  allRequirementsReady: boolean;
  fusionAnimTimer: number;
  readonly fusionAnimDur: number;
  portalFlashTimer: number;
  revealPopTimer: number;
  revealHold: boolean;
  portalBurstFired: boolean;
  fusionBurstFired: boolean;
  landingEchoFired: boolean;
  fusionAccentHex: string;
  fusionGlowHex: string;
  onFusionAnimComplete: (() => void) | null;
}

export interface FusionUpdateCtx {
  seq: FusionSeqState;
  group: THREE.Group;
  impactFx: AttackImpactFxController;
  orbGeo: THREE.BufferGeometry;
  energyOrbs: FusionEnergyOrb[];
  materialSlots: FusionMaterialSlotRef[];
  oreClusters: FusionOreClusterRef[];
  floatingIslands: FusionFloatingIslandRef[];
  apexPodium: CyberShowcasePodiumHandle;
  magicCircleMesh: THREE.Mesh;
  magicCircleMat: THREE.MeshBasicMaterial;
  innerRingMesh: THREE.Mesh;
  outerRingMesh: THREE.Mesh;
  portalOuterGroup: THREE.Group;
  portalMidGroup: THREE.Group;
  portalInnerGroup: THREE.Group;
  portalOuterMat: THREE.MeshStandardMaterial;
  portalMidMat: THREE.MeshStandardMaterial;
  portalInnerMat: THREE.MeshStandardMaterial;
  portalVortexMesh: THREE.Mesh;
  portalFlashMesh: THREE.Mesh;
  portalFlashMat: THREE.MeshBasicMaterial;
  stageNeonMat: THREE.MeshStandardMaterial;
  lightBeamOuterMat: THREE.MeshBasicMaterial;
  lightBeamInnerMat: THREE.MeshBasicMaterial;
  resultMount: THREE.Group;
  resultSprite: ChibiSprite3D | null;
}

const PORTAL_CENTER = new THREE.Vector3(0, 5.45, -7.15);
const STAGE_CENTER_Z = -2.85;
const STAGE_DECK_Y = 0.76;
const APEX_PODIUM_SCALE = 1.68;
const DAIS_TOP_Y = STAGE_DECK_Y + 0.285 * APEX_PODIUM_SCALE;

function stepPodiumAura(podium: CyberShowcasePodiumHandle, elapsed: number): void {
  if (!podium.auraGroup.visible) return;
  podium.sigilMesh.rotation.z = elapsed * 0.16;
  podium.auraVeilMat.uniforms.uTime.value = elapsed;
  podium.auraOuterVeilMat.uniforms.uTime.value = elapsed * 0.85;
  podium.particleMat.uniforms.uTime.value = elapsed;
}

export function stepFusionWorldUpdate(
  ctx: FusionUpdateCtx,
  dtSec: number,
  elapsed: number,
  camera?: THREE.Camera
): void {
    if (!ctx.group.visible) return;
    const dt = Math.min(0.1, Math.max(0, dtSec));
    const isFusing = ctx.seq.fusionAnimTimer > 0;
    const readyPulse = ctx.seq.allRequirementsReady ? 0.5 + 0.5 * Math.sin(elapsed * 4.6) : 0;
    const spinBoost = isFusing ? 7.2 : ctx.seq.allRequirementsReady ? 1.85 : 0.75;
    // 1. Rotate Floor Magic Circle, Podium Auras & Triple Synchro Portal Rings
    ctx.magicCircleMesh.rotation.z = elapsed * 0.14 * (ctx.seq.allRequirementsReady ? 1.6 : 0.6);
    ctx.innerRingMesh.rotation.z += dt * 0.78 * spinBoost;
    ctx.outerRingMesh.rotation.z -= dt * 0.46 * spinBoost;
    stepPodiumAura(ctx.apexPodium, elapsed);
    ctx.portalOuterGroup.rotation.z += dt * 0.42 * spinBoost;
    ctx.portalMidGroup.rotation.z -= dt * 0.68 * spinBoost;
    ctx.portalInnerGroup.rotation.z += dt * 1.15 * spinBoost;
    ctx.portalVortexMesh.rotation.z = -elapsed * 0.9 * spinBoost;
    // 2. Dynamic Readiness Pulse on Portal, Floor Circuit & Central Skyward Light Beam
    if (ctx.seq.allRequirementsReady && !isFusing) {
      const pulseIntensity = 1.2 + readyPulse * 0.65;
      ctx.portalOuterMat.emissiveIntensity = pulseIntensity;
      ctx.portalMidMat.emissiveIntensity = pulseIntensity * 0.95;
      ctx.portalInnerMat.emissiveIntensity = pulseIntensity * 1.05;
      ctx.apexPodium.ringMat.emissiveIntensity = pulseIntensity;
      ctx.stageNeonMat.emissiveIntensity = pulseIntensity;
      ctx.magicCircleMat.opacity = 0.52 + readyPulse * 0.26;
      ctx.lightBeamOuterMat.opacity = 0.16 + readyPulse * 0.1;
      ctx.lightBeamInnerMat.opacity = 0.22 + readyPulse * 0.14;
    } else if (!isFusing) {
      ctx.lightBeamOuterMat.opacity = 0.07 + Math.sin(elapsed * 2.2) * 0.02;
      ctx.lightBeamInnerMat.opacity = 0.09 + Math.sin(elapsed * 2.2) * 0.025;
    } else {
      ctx.lightBeamOuterMat.opacity = 0.34;
      ctx.lightBeamInnerMat.opacity = 0.48;
    }
    if (ctx.seq.portalFlashTimer > 0) {
      ctx.seq.portalFlashTimer = Math.max(0, ctx.seq.portalFlashTimer - dt);
      const fp = ctx.seq.portalFlashTimer / 0.55;
      ctx.portalFlashMesh.visible = fp > 0;
      ctx.portalFlashMesh.scale.setScalar(1.0 + (1 - fp) * 2.1);
      ctx.portalFlashMat.opacity = fp * 0.96;
    }
    // 3. Animate Travelling Floor Conduit Pulses & ZZZ/HSR Material Podiums
    const elapsedAnim = isFusing ? ctx.seq.fusionAnimDur - ctx.seq.fusionAnimTimer : 0;
    if (isFusing && elapsedAnim >= 1.35 && elapsedAnim < 1.72) {
      // Anime Singularity Implosion hold right before portal supernova
      const imp = (elapsedAnim - 1.35) / 0.37;
      ctx.portalVortexMesh.scale.setScalar(1 - Math.sin(imp * Math.PI * 0.5) * 0.46);
    } else {
      ctx.portalVortexMesh.scale.setScalar(1);
    }
    for (let i = 0; i < ctx.materialSlots.length; i++) {
      const slot = ctx.materialSlots[i];
      if (!slot.podium.group.visible) continue;
      stepPodiumAura(slot.podium, elapsed + i * 0.65);
      slot.holoGridRing.rotation.z = elapsed * 1.4;
      const flowSpeed = isFusing ? 4.2 : ctx.seq.allRequirementsReady ? 1.7 : slot.ready ? 1.0 : 0.35;
      for (let p = 0; p < slot.conduitPulseMeshes.length; p++) {
        const pulseMesh = slot.conduitPulseMeshes[p];
        const phase = ((elapsed * flowSpeed + p * 0.5 + i * 0.25) % 1 + 1) % 1;
        pulseMesh.position.z = 0.45 - phase * 0.9;
        pulseMesh.visible = slot.ready || ctx.seq.allRequirementsReady || isFusing;
      }
      if (slot.sprite) {
        if (isFusing) {
          if (elapsedAnim < 0.85) {
            // Act 1: Dramatic levitation & overdrive charge
            const lp = elapsedAnim / 0.85;
            const ease = lp * (2 - lp);
            slot.sprite.group.position.set(0, 0.285 + ease * 1.65, 0);
            slot.sprite.group.scale.setScalar(1 + ease * 0.16);
          } else if (elapsedAnim < 1.45) {
            // Act 2: Morph into light streams & suction into the Synchro Gate
            const sp = (elapsedAnim - 0.85) / 0.6;
            slot.sprite.group.position.set(0, 1.93 + sp * 0.75, -sp * 1.45);
            slot.sprite.group.scale.setScalar(Math.max(0.01, 1.16 * (1 - sp)));
          } else {
            slot.sprite.group.scale.setScalar(0.001);
          }
        } else if (ctx.seq.revealHold) {
          slot.sprite.group.scale.setScalar(0.001);
        } else {
          slot.sprite.group.position.set(0, 0.285, 0);
          slot.sprite.group.scale.setScalar(1);
        }
        if (camera) {
          slot.sprite.update(dt, elapsed, camera);
        }
      }
    }
    // 4. Animate Physical Ore Crystal Clusters & Floating Cosmic Islands
    for (const node of ctx.oreClusters) {
      const orePulse = node.ready ? 1.35 + Math.sin(elapsed * 4.2 + node.phase) * 0.4 : 0.26;
      node.crystalMat.emissiveIntensity = orePulse;
      node.accentMat.emissiveIntensity = node.ready ? orePulse * 1.2 : 0.32;
      const orbitSpeed = node.ready ? 2.6 : 0.8;
      for (let s = 0; s < node.floatingShards.length; s++) {
        const shard = node.floatingShards[s];
        const a = elapsed * orbitSpeed + node.phase + s * Math.PI;
        shard.position.set(
          Math.cos(a) * 0.38,
          1.02 + s * 0.22 + Math.sin(elapsed * 3.0 + s) * 0.08,
          Math.sin(a) * 0.38
        );
        shard.rotation.y = a;
        shard.rotation.x = elapsed * 1.5;
      }
    }
    for (const isl of ctx.floatingIslands) {
      isl.group.position.y = isl.baseY + Math.sin(elapsed * isl.bobSpeed + isl.phase) * 0.28;
      isl.group.rotation.y = Math.sin(elapsed * 0.25 + isl.phase) * 0.12;
    }
    // 5. Levitate or Descend Result Fusion Chibi on Grand Apex Podium
    const popScale =
      ctx.seq.revealPopTimer > 0 ? 1 + Math.sin((ctx.seq.revealPopTimer / 0.58) * Math.PI) * 0.28 : 1;
    if (ctx.seq.revealPopTimer > 0) ctx.seq.revealPopTimer = Math.max(0, ctx.seq.revealPopTimer - dt);
    if (isFusing && elapsedAnim >= 1.98) {
      const descendP = Math.min(1, (elapsedAnim - 1.98) / 0.42);
      const easeOut = 1 - Math.pow(1 - descendP, 3);
      ctx.resultMount.position.y = THREE.MathUtils.lerp(4.95, DAIS_TOP_Y + 0.04, easeOut);
    } else {
      ctx.resultMount.position.y = DAIS_TOP_Y + 0.04 + Math.sin(elapsed * 2.4) * 0.08;
    }
    ctx.resultMount.scale.setScalar(popScale);
    if (camera && ctx.resultSprite) {
      ctx.resultSprite.update(dt, elapsed, camera);
    }
    // 7. Step Converging Energy Orbs (Material Podiums -> Synchro Portal -> Grand Apex Podium)
    for (let i = ctx.energyOrbs.length - 1; i >= 0; i--) {
      const orb = ctx.energyOrbs[i];
      orb.age += dt;
      if (orb.age < 0) {
        orb.mesh.visible = false;
        continue;
      }
      orb.mesh.visible = true;
      const p = orb.age / orb.dur;
      if (p >= 1) {
        ctx.group.remove(orb.mesh);
        orb.mat.dispose();
        ctx.energyOrbs.splice(i, 1);
        continue;
      }
      const ease = p * p;
      orb.mesh.position.set(
        THREE.MathUtils.lerp(orb.from.x, orb.to.x, ease),
        THREE.MathUtils.lerp(orb.from.y, orb.to.y, ease) + Math.sin(p * Math.PI) * orb.arcH,
        THREE.MathUtils.lerp(orb.from.z, orb.to.z, ease)
      );
      orb.mesh.scale.setScalar(1.35 - p * 0.55);
      orb.mat.opacity = 1 - p * 0.28;
    }
    // 8. Step 4-Act Fusion Climax Sequence
    if (ctx.seq.fusionAnimTimer > 0) {
      ctx.seq.fusionAnimTimer = Math.max(0, ctx.seq.fusionAnimTimer - dt);
      const curAnim = ctx.seq.fusionAnimDur - ctx.seq.fusionAnimTimer;
      // Act 2 Climax (1.72s): Portal Supernova Eruption + discharge stream from Portal to Grand Apex Podium
      if (!ctx.seq.portalBurstFired && curAnim >= 1.72) {
        ctx.seq.portalBurstFired = true;
        ctx.seq.portalFlashTimer = 0.55;
        ctx.portalFlashMesh.visible = true;
        ctx.impactFx.spawnShatter({
          targetX: PORTAL_CENTER.x,
          targetY: PORTAL_CENTER.y,
          targetZ: PORTAL_CENTER.z + 0.35,
          oreColor: '#fef08a',
          secondaryColor: ctx.seq.fusionAccentHex,
          isMeteor: true,
          camera,
        });
        for (let k = 0; k < 8; k++) {
          const mat = new THREE.MeshBasicMaterial({
            color: k % 2 === 0 ? '#ffffff' : ctx.seq.fusionAccentHex,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const mesh = new THREE.Mesh(ctx.orbGeo, mat);
          mesh.position.copy(PORTAL_CENTER);
          ctx.group.add(mesh);
          ctx.energyOrbs.push({
            mesh,
            mat,
            from: PORTAL_CENTER.clone(),
            to: new THREE.Vector3(0, DAIS_TOP_Y + 1.05, STAGE_CENTER_Z),
            age: -k * 0.035,
            dur: 0.32,
            arcH: 0.75,
          });
        }
      }
      // Act 3 Climax (2.02s): Result unit descends into the skyward beam + initial Shatter Nova
      if (!ctx.seq.fusionBurstFired && curAnim >= 2.02) {
        ctx.seq.fusionBurstFired = true;
        ctx.resultMount.visible = true;
        ctx.seq.revealPopTimer = 0.58;
        ctx.impactFx.spawnShatter({
          targetX: 0,
          targetY: DAIS_TOP_Y + 1.15,
          targetZ: STAGE_CENTER_Z,
          oreColor: ctx.seq.fusionAccentHex,
          secondaryColor: ctx.seq.fusionGlowHex,
          isMeteor: true,
          camera,
        });
      }
      // Act 3 Hero Landing Impact (2.38s): Second 5-layer Shatter Nova as feet touch down on APEX podium
      if (!ctx.seq.landingEchoFired && curAnim >= 2.38) {
        ctx.seq.landingEchoFired = true;
        ctx.impactFx.spawnShatter({
          targetX: 0,
          targetY: DAIS_TOP_Y + 0.65,
          targetZ: STAGE_CENTER_Z,
          oreColor: '#fef08a',
          secondaryColor: ctx.seq.fusionAccentHex,
          isMeteor: true,
          camera,
        });
      }
      if (ctx.seq.fusionAnimTimer <= 0) {
        ctx.resultMount.visible = true;
        ctx.seq.revealHold = true;
        const cb = ctx.seq.onFusionAnimComplete;
        ctx.seq.onFusionAnimComplete = null;
        cb?.();
      }
    }
    ctx.impactFx.update(dt, camera);
}
