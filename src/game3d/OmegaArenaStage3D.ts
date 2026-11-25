import * as THREE from 'three';
import { ChibiDef } from './ChibiCatalog';

export interface OmegaTargetObject {
  id: string;
  kind: 'phantom_blade' | 'obsidian_pillar' | 'rune_seal';
  hp: number;
  maxHp: number;
  xOffset: number;
  zOffset: number;
}
import { ChibiSprite3D } from './ChibiSprite3D';
import { ChibiFieldFxController } from './FieldMiner3D';
import {
  createCyberShowcasePodium,
  type CyberShowcasePodiumHandle,
  type FusionPodiumBuildCtx,
} from './FusionWorldPodium3D';
import { createChamferSlabGeometry, createLatheProfileGeometry, disposeObject3D, enableShadows } from './MeshHelpers3D';
import { buildRooftopCommandBackdrop } from './OmegaRooftopAssets3D';
import { getChibiAttackStyle, type PlotAttackStyle } from './SignatureProjectilePool3D';
import { getBasicAttackIntervalSec } from './TierAttackVfx3D';
import type { TowerFighterConfig } from './TowerArena3D';

export const OMEGA_BOSS_POS_Z = -3.4;
export const OMEGA_BOSS_DAIS_Y = 0.52;
export const OMEGA_EMBER_COUNT = 54;
export const OMEGA_PLAYER_PAD_POSITIONS: ReadonlyArray<[number, number]> = [
  [-5.8, 2.9],
  [-2.9, 4.15],
  [0, 4.75],
  [2.9, 4.15],
  [5.8, 2.9],
];

export interface OmegaStrikeEvent {
  slotIndex: number;
  attackInterval: number;
  isUltimate: boolean;
  dmg: number;
  wx: number;
  wy: number;
  wz: number;
  accentColor?: string;
  beatIndex?: number;
  isFinisher?: boolean;
}

export interface OmegaTargetScreenAnchor {
  id: string;
  kind: OmegaTargetObject['kind'];
  x: number;
  y: number;
}

export interface OmegaFighterEntry {
  slotIndex: number;
  chibiId: string;
  rarity: ChibiDef['rarity'];
  style: PlotAttackStyle;
  sprite: ChibiSprite3D;
  fx: ChibiFieldFxController;
  spawnPos: THREE.Vector3;
  dmg: number;
  attackInterval: number;
  attackCooldown: number;
  chargeSec: number;
  ultCharge: number;
  ultBankSec: number;
  ultArmed: boolean;
  ultActiveTimer: number;
  comboStep: number;
  colorHex: string;
}

export interface OmegaTargetMeshEntry {
  id: string;
  kind: OmegaTargetObject['kind'];
  root: THREE.Group;
  hitMesh: THREE.Mesh;
  x: number;
  z: number;
}

export interface OmegaConduitFlowEntry {
  slotIndex: number;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  coreMat: THREE.MeshBasicMaterial;
  pulses: THREE.Mesh[];
}

export function buildOmegaTargetPropMesh(
  kind: OmegaTargetObject['kind'],
  accentHex: number,
  darkMat: THREE.Material,
  goldMat: THREE.Material
): THREE.Group {
  const prop = new THREE.Group();
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.5,
    roughness: 0.22,
    metalness: 0.45,
    flatShading: true,
  });

  if (kind === 'obsidian_pillar') {
    const plinth = new THREE.Mesh(createChamferSlabGeometry(1.18, 0.34, 1.18, 0.22, 0.03), darkMat);
    plinth.position.y = 0.17;
    const shaft = new THREE.Mesh(createChamferSlabGeometry(0.76, 2.05, 0.76, 0.16, 0.03), darkMat);
    shaft.position.y = 1.32;
    const runeCollar = new THREE.Mesh(createChamferSlabGeometry(0.94, 0.22, 0.94, 0.18, 0.02), glowMat);
    runeCollar.position.y = 1.68;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.68, 6), glowMat);
    cap.position.y = 2.68;
    enableShadows(plinth);
    enableShadows(shaft);
    prop.add(plinth, shaft, runeCollar, cap);
    return prop;
  }

  if (kind === 'phantom_blade') {
    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.78, 20),
      new THREE.MeshBasicMaterial({ color: accentHex, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.04;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.75, 4), glowMat);
    blade.position.y = 1.15;
    blade.rotation.x = Math.PI;
    const tsuba = new THREE.Mesh(createChamferSlabGeometry(0.72, 0.14, 0.28, 0.06, 0.015), goldMat);
    tsuba.position.y = 2.02;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.48, 6), darkMat);
    hilt.position.y = 2.3;
    enableShadows(blade);
    enableShadows(tsuba);
    prop.add(floorRing, blade, tsuba, hilt);
    return prop;
  }

  const floorSeal = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.86, 24),
    new THREE.MeshBasicMaterial({ color: accentHex, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
  );
  floorSeal.rotation.x = -Math.PI / 2;
  floorSeal.position.y = 0.04;
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.055, 6, 20), goldMat);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 1.25;
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), glowMat);
  core.position.y = 1.25;
  const spireTop = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.48, 5), goldMat);
  spireTop.position.y = 1.92;
  enableShadows(core);
  prop.add(floorSeal, innerRing, core, spireTop);
  return prop;
}

export function createOmegaEmberDotTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(253,224,71,0.75)');
  g.addColorStop(1, 'rgba(253,224,71,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export function applyOmegaPodiumColors(
  podium: CyberShowcasePodiumHandle,
  primaryHex: string,
  secondaryHex: string,
  activeAura: boolean,
  intensity = 1.15
): void {
  podium.ringMat.color.set(primaryHex);
  podium.ringMat.emissive.set(primaryHex);
  podium.ringMat.emissiveIntensity = intensity;
  podium.holoDiscMat.color.set(primaryHex);
  podium.sigilMat.color.set(primaryHex);
  podium.auraGroup.visible = activeAura;
  if (activeAura) {
    podium.auraVeilMat.uniforms.uColorA.value.set(primaryHex);
    podium.auraVeilMat.uniforms.uColorB.value.set(secondaryHex);
    podium.auraOuterVeilMat.uniforms.uColorA.value.set(secondaryHex);
    podium.auraOuterVeilMat.uniforms.uColorB.value.set(primaryHex);
    podium.particleMat.uniforms.uColorA.value.set(primaryHex);
    podium.particleMat.uniforms.uColorB.value.set(secondaryHex);
  }
}

export function buildOmegaArenaStage(ctx: {
  group: THREE.Group;
  trimNeonMat: THREE.MeshBasicMaterial;
  secondaryNeonMat: THREE.MeshBasicMaterial;
  bossDaisRingMat: THREE.MeshBasicMaterial;
  outerFloorSealMat: THREE.MeshBasicMaterial;
  podiumGeos: THREE.BufferGeometry[];
  podiumMats: THREE.Material[];
  podiumTextures: THREE.Texture[];
  playerPodiums: CyberShowcasePodiumHandle[];
  conduitFlows: OmegaConduitFlowEntry[];
}): {
  daisSigil: THREE.Mesh;
  daisOuterRing: THREE.Mesh;
  outerSealRing: THREE.Mesh;
  shrineCrownCrystal: THREE.Mesh;
  crystalBaseY: number;
  bossPodium: CyberShowcasePodiumHandle;
} {
  const darkDeckMat = new THREE.MeshStandardMaterial({ color: 0x3b4963, roughness: 0.64, metalness: 0.22, flatShading: true });
  const rimMetalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.62, flatShading: true });
  const podiumSteelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.38, metalness: 0.48, flatShading: true });
  const podiumBrightMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.52, flatShading: true });
  ctx.podiumMats.push(darkDeckMat, rimMetalMat, podiumSteelMat, podiumBrightMat);

  const podiumCtx: FusionPodiumBuildCtx = {
    armorDarkMat: rimMetalMat,
    armorSteelMat: podiumSteelMat,
    brightSteelMat: podiumBrightMat,
    ownedGeos: ctx.podiumGeos,
    ownedMats: ctx.podiumMats,
    ownedTextures: ctx.podiumTextures,
  };

  const circularDaisGeo = createLatheProfileGeometry(
    [
      [0.01, 0],
      [3.45, 0],
      [3.34, 0.22],
      [3.12, 0.26],
      [3.0, 0.48],
      [2.88, OMEGA_BOSS_DAIS_Y],
      [0.01, OMEGA_BOSS_DAIS_Y],
    ],
    24
  );
  const circularDais = new THREE.Mesh(circularDaisGeo, rimMetalMat);
  circularDais.position.set(0, 0, OMEGA_BOSS_POS_Z);
  enableShadows(circularDais);

  const daisTopCapGeo = new THREE.CylinderGeometry(2.84, 2.84, 0.02, 24);
  const daisTopCap = new THREE.Mesh(daisTopCapGeo, darkDeckMat);
  daisTopCap.position.set(0, OMEGA_BOSS_DAIS_Y, OMEGA_BOSS_POS_Z);
  daisTopCap.receiveShadow = true;

  const midAccentRingGeo = new THREE.RingGeometry(3.06, 3.24, 32);
  const midAccentRing = new THREE.Mesh(midAccentRingGeo, ctx.trimNeonMat);
  midAccentRing.rotation.x = -Math.PI / 2;
  midAccentRing.position.set(0, 0.265, OMEGA_BOSS_POS_Z);

  const cleatGeo = createChamferSlabGeometry(0.46, 0.3, 0.56, 0.08, 0.02);
  ctx.podiumGeos.push(circularDaisGeo, daisTopCapGeo, midAccentRingGeo, cleatGeo);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const cleat = new THREE.Mesh(cleatGeo, podiumBrightMat);
    cleat.position.set(Math.cos(ang) * 3.26, 0, OMEGA_BOSS_POS_Z + Math.sin(ang) * 3.26);
    cleat.rotation.y = -ang + Math.PI / 2;
    enableShadows(cleat);
    ctx.group.add(cleat);
  }

  const hasCircleTex = Boolean(ctx.bossDaisRingMat.map);
  const daisSigil = new THREE.Mesh(
    hasCircleTex ? new THREE.PlaneGeometry(5.2, 5.2) : new THREE.RingGeometry(2.1, 2.48, 32),
    ctx.bossDaisRingMat
  );
  daisSigil.rotation.x = -Math.PI / 2;
  daisSigil.position.set(0, OMEGA_BOSS_DAIS_Y + 0.016, OMEGA_BOSS_POS_Z);
  daisSigil.renderOrder = 2;

  const daisOuterRing = new THREE.Mesh(
    new THREE.RingGeometry(2.62, 2.8, 32),
    ctx.secondaryNeonMat
  );
  daisOuterRing.rotation.x = -Math.PI / 2;
  daisOuterRing.position.set(0, OMEGA_BOSS_DAIS_Y + 0.025, OMEGA_BOSS_POS_Z);

  const bossPodium = createCyberShowcasePodium(podiumCtx, 'OMEGA', 1.85, true);
  bossPodium.group.position.set(0, OMEGA_BOSS_DAIS_Y + 0.04, OMEGA_BOSS_POS_Z);
  ctx.group.add(bossPodium.group);

  const outerSealRing = new THREE.Mesh(
    hasCircleTex ? new THREE.PlaneGeometry(9.2, 9.2) : new THREE.RingGeometry(3.98, 4.18, 48),
    ctx.outerFloorSealMat
  );
  outerSealRing.rotation.x = -Math.PI / 2;
  outerSealRing.position.set(0, 0.008, OMEGA_BOSS_POS_Z);
  outerSealRing.renderOrder = 1;

  ctx.group.add(circularDais, daisTopCap, midAccentRing, daisSigil, daisOuterRing, outerSealRing);

  const backdrop = buildRooftopCommandBackdrop(
    rimMetalMat,
    podiumSteelMat,
    podiumBrightMat,
    ctx.trimNeonMat,
    ctx.secondaryNeonMat,
    ctx.podiumGeos
  );
  backdrop.group.position.set(0, 0, -7.35);
  ctx.group.add(backdrop.group);
  const shrineCrownCrystal = backdrop.crystalMesh;
  const crystalBaseY = backdrop.crystalBaseY;

  const pulseGeo = new THREE.OctahedronGeometry(0.085, 0);
  pulseGeo.scale(0.85, 0.55, 2.2);
  ctx.podiumGeos.push(pulseGeo);

  for (let i = 0; i < OMEGA_PLAYER_PAD_POSITIONS.length; i++) {
    const [sx, sz] = OMEGA_PLAYER_PAD_POSITIONS[i];
    const podium = createCyberShowcasePodium(podiumCtx, `0${i + 1}`, 1.35, false);
    podium.group.position.set(sx, 0, sz);
    applyOmegaPodiumColors(podium, '#38bdf8', '#a855f7', false, 0.65);
    ctx.group.add(podium.group);
    ctx.playerPodiums.push(podium);

    const dx = -sx;
    const dz = OMEGA_BOSS_POS_Z - sz;
    const totalDist = Math.hypot(dx, dz);
    const startOff = 1.35;
    const endOff = 3.42;
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
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
      ctx.podiumGeos.push(channelGeo, coreGeo, railGeo);
      ctx.podiumMats.push(coreMat);

      const channel = new THREE.Mesh(channelGeo, rimMetalMat);
      channel.position.y = 0.024;
      const coreVein = new THREE.Mesh(coreGeo, coreMat);
      coreVein.position.y = 0.042;
      conduitGroup.add(channel, coreVein);

      for (const rx of [-0.125, 0.125]) {
        const rail = new THREE.Mesh(railGeo, ctx.secondaryNeonMat);
        rail.position.set(rx, 0.043, 0);
        conduitGroup.add(rail);
      }
      ctx.group.add(conduitGroup);

      const pulses: THREE.Mesh[] = [];
      for (let p = 0; p < 2; p++) {
        const pulse = new THREE.Mesh(pulseGeo, coreMat);
        pulse.rotation.y = yaw;
        pulse.position.set(startX, 0.065, startZ);
        pulse.visible = false;
        ctx.group.add(pulse);
        pulses.push(pulse);
      }
      ctx.conduitFlows.push({ slotIndex: i, startX, startZ, endX, endZ, coreMat, pulses });
    }
  }

  return { daisSigil, daisOuterRing, outerSealRing, shrineCrownCrystal, crystalBaseY, bossPodium };
}

export function syncOmegaFighterEntries(ctx: {
  configs: TowerFighterConfig[];
  group: THREE.Group;
  fighters: Map<number, OmegaFighterEntry>;
  playerPodiums: CyberShowcasePodiumHandle[];
  conduitFlows: OmegaConduitFlowEntry[];
  lowQuality: boolean;
}): void {
  const incomingSlots = new Set<number>(ctx.configs.map((c) => c.slotIndex));
  for (const [slot, entry] of ctx.fighters.entries()) {
    if (!incomingSlots.has(slot)) {
      ctx.group.remove(entry.sprite.group);
      entry.fx.dispose();
      entry.sprite.dispose();
      ctx.fighters.delete(slot);
      const pod = ctx.playerPodiums[slot % ctx.playerPodiums.length];
      if (pod) applyOmegaPodiumColors(pod, '#38bdf8', '#a855f7', false, 0.55);
      const flow = ctx.conduitFlows.find((cf) => cf.slotIndex === slot % OMEGA_PLAYER_PAD_POSITIONS.length);
      if (flow) {
        flow.coreMat.color.set('#38bdf8');
        flow.coreMat.opacity = 0.35;
        flow.pulses.forEach((p) => {
          p.visible = false;
        });
      }
    }
  }

  for (const cfg of ctx.configs) {
    const podIdx = cfg.slotIndex % ctx.playerPodiums.length;
    const playerPod = ctx.playerPodiums[podIdx];
    if (playerPod) {
      applyOmegaPodiumColors(playerPod, cfg.def.accentColor, '#38bdf8', true, 1.15);
    }
    const flow = ctx.conduitFlows.find((cf) => cf.slotIndex === podIdx);
    if (flow) {
      flow.coreMat.color.set(cfg.def.accentColor);
      flow.coreMat.opacity = 0.92;
      flow.pulses.forEach((p) => {
        p.visible = true;
      });
    }
    const existing = ctx.fighters.get(cfg.slotIndex);
    if (existing && existing.chibiId === cfg.def.id) {
      existing.dmg = cfg.dmg;
      existing.attackInterval = getBasicAttackIntervalSec(cfg.miningMult);
      existing.fx.setEnchant(cfg.enchantId);
      existing.sprite.setAccentColor(cfg.def.accentColor);
      existing.sprite.setAnimState('idle');
      continue;
    }
    if (existing) {
      ctx.group.remove(existing.sprite.group);
      existing.fx.dispose();
      existing.sprite.dispose();
      ctx.fighters.delete(cfg.slotIndex);
    }
    const [sx, sz] = OMEGA_PLAYER_PAD_POSITIONS[cfg.slotIndex % OMEGA_PLAYER_PAD_POSITIONS.length];
    const standY = playerPod ? playerPod.topY : 0.38;
    const sprite = new ChibiSprite3D(cfg.def, 2.85, cfg.slotIndex * 0.9);
    sprite.group.position.set(sx, standY, sz);
    sprite.setAnimState('idle');
    sprite.setFacing(sx <= 0 ? 1 : -1);
    sprite.setLowQuality(ctx.lowQuality);
    const fx = new ChibiFieldFxController(sprite.group, cfg.def.accentColor, cfg.slotIndex, 2.85);
    fx.setEnchant(cfg.enchantId);
    fx.setLowQuality(ctx.lowQuality);
    ctx.group.add(sprite.group);

    ctx.fighters.set(cfg.slotIndex, {
      slotIndex: cfg.slotIndex,
      chibiId: cfg.def.id,
      rarity: cfg.def.rarity,
      style: getChibiAttackStyle(cfg.def),
      sprite,
      fx,
      spawnPos: new THREE.Vector3(sx, standY, sz),
      dmg: cfg.dmg,
      attackInterval: getBasicAttackIntervalSec(cfg.miningMult),
      attackCooldown: 0.08 + cfg.slotIndex * 0.16,
      chargeSec: 0,
      ultCharge: 0,
      ultBankSec: 0,
      ultArmed: false,
      ultActiveTimer: 0,
      comboStep: 0,
      colorHex: cfg.def.accentColor,
    });
  }
}

export function syncOmegaBattleTargetMeshes(ctx: {
  targets: readonly OmegaTargetObject[];
  targetsGroup: THREE.Group;
  targetEntries: Map<string, OmegaTargetMeshEntry>;
  clickables: THREE.Object3D[];
  darkArmorMat: THREE.Material;
  goldTrimMat: THREE.Material;
}): void {
  const aliveIds = new Set(ctx.targets.map((t) => t.id));
  for (const [id, entry] of ctx.targetEntries.entries()) {
    if (!aliveIds.has(id)) {
      ctx.targetsGroup.remove(entry.root);
      const cIdx = ctx.clickables.indexOf(entry.hitMesh);
      if (cIdx >= 0) ctx.clickables.splice(cIdx, 1);
      disposeObject3D(entry.root);
      ctx.targetEntries.delete(id);
    }
  }

  for (const t of ctx.targets) {
    if (ctx.targetEntries.has(t.id)) continue;
    const root = new THREE.Group();
    const tx = t.xOffset;
    const tz = OMEGA_BOSS_POS_Z + t.zOffset + 1.5;
    root.position.set(tx, 0.1, tz);

    const colorHex = t.kind === 'phantom_blade' ? 0xf43f5e : t.kind === 'obsidian_pillar' ? 0xa855f7 : 0x38bdf8;
    const prop = buildOmegaTargetPropMesh(t.kind, colorHex, ctx.darkArmorMat, ctx.goldTrimMat);

    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 2.8, 1.65),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitMesh.position.y = 1.4;
    hitMesh.userData = { kind: 'omega-target', targetId: t.id };

    root.add(prop, hitMesh);
    ctx.targetsGroup.add(root);
    ctx.clickables.push(hitMesh);
    ctx.targetEntries.set(t.id, { id: t.id, kind: t.kind, root, hitMesh, x: tx, z: tz });
  }
}
