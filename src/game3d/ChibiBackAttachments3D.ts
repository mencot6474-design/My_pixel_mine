import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import type { ChibiAnimState, ChibiDef } from './ChibiCatalog';
import { applySharpSpriteTexture } from './MeshHelpers3D';
import {
  createAbyssalGreatswordGeometry,
  createClockworkChronoChassisShaderMaterial,
  createClockworkDialShaderMaterial,
  createClockworkGearGeometry,
  createClockworkScytheHandGeometry,
  createCrimsonKatanaShaderMaterial,
  createCrimsonTsubaHaloShaderMaterial,
  createEnergyWeaponMaterial,
  createHalcyonMechanicalWingBladeGeometry,
  createHalcyonRailBowGeometry,
  createHalcyonRailBowShaderMaterial,
  createHalcyonValkyrieHaloShaderMaterial,
  createKunaiGeometry,
  createLullabyMoonCradleArchGeometry,
  createLullabyMoonCradleShaderMaterial,
  createLullabyPinkAuraShaderMaterial,
  createNocturneEclipseHaloShaderMaterial,
  createNocturneWingGeometry,
  createNocturneWingShaderMaterial,
  createObsidianCrownHaloShaderMaterial,
  createObsidianGreatswordShaderMaterial,
  createRoninKatanaGeometry,
  createSpikedHaloGeometry,
  createYukikageKunaiShaderMaterial,
  createYukikageShrineRingShaderMaterial,
} from './MeshFx3D';

export interface RoninFanKatanaSlot {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  baseRotZ: number;
  outX: number;
  outY: number;
  phase: number;
}

export interface ChibiBackAttachmentHandle {
  omegaAuraGroup: THREE.Group | null;
  omegaAuraMat: THREE.ShaderMaterial | null;
  omegaAuraGeo: THREE.BufferGeometry | null;
  omegaHaloMesh: THREE.Mesh | null;
  omegaOrbitKatanas: THREE.Mesh[];
  roninFanKatanas: RoninFanKatanaSlot[];
  twinWingMeshes: THREE.Mesh[];
  twinGearMeshes: THREE.Mesh[];
  twinCustomMats: THREE.ShaderMaterial[];
  twinCustomGeos: THREE.BufferGeometry[];
  omegaHandPivot: THREE.Group | null;
  omegaHandWeaponMesh: THREE.Mesh | null;
  omegaHandWeaponMat: THREE.ShaderMaterial | null;
  omegaHandWeaponGeo: THREE.BufferGeometry | null;
}

export function createChibiBackAttachments(
  defId: string,
  spriteHeight: number,
  spritePivot: THREE.Group,
  blitzHeroPivot: THREE.Group
): ChibiBackAttachmentHandle {
  const handle: ChibiBackAttachmentHandle = {
    omegaAuraGroup: null,
    omegaAuraMat: null,
    omegaAuraGeo: null,
    omegaHaloMesh: null,
    omegaOrbitKatanas: [],
    roninFanKatanas: [],
    twinWingMeshes: [],
    twinGearMeshes: [],
    twinCustomMats: [],
    twinCustomGeos: [],
    omegaHandPivot: null,
    omegaHandWeaponMesh: null,
    omegaHandWeaponMat: null,
    omegaHandWeaponGeo: null,
  };

  if (defId === 'crimson-ronin') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.name = 'chibiBackAttachmentGroup';
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);

    const tsubaHaloMat = createCrimsonTsubaHaloShaderMaterial();
    const katanaMat = createCrimsonKatanaShaderMaterial();
    handle.omegaAuraMat = katanaMat;
    handle.twinCustomMats.push(tsubaHaloMat);

    const discGeo = new THREE.PlaneGeometry(2.12, 2.12);
    handle.twinCustomGeos.push(discGeo);
    const tsubaDisc = new THREE.Mesh(discGeo, tsubaHaloMat);
    tsubaDisc.position.set(0, 0.04, -0.1);
    handle.omegaAuraGroup.add(tsubaDisc);

    handle.omegaAuraGeo = createRoninKatanaGeometry();
    const fanAngles = [0.36, 0.72, 1.06, 1.38, -0.36, -0.72, -1.06, -1.38];
    for (let i = 0; i < fanAngles.length; i++) {
      const ang = fanAngles[i];
      const tierIdx = i % 4;
      const rad = 0.66 + (tierIdx % 2) * 0.14;
      const baseX = -Math.sin(ang) * rad * 1.12;
      const baseY = 0.06 + Math.cos(ang) * rad * 0.78;
      const baseZ = tierIdx % 2 === 0 ? -0.02 : -0.055;
      const baseRotZ = ang * 0.92;
      const s = 0.62 - tierIdx * 0.03;

      const km = new THREE.Mesh(handle.omegaAuraGeo, katanaMat);
      km.position.set(baseX, baseY, baseZ);
      km.rotation.set(0.06, ang >= 0 ? -0.14 : 0.14, baseRotZ);
      km.scale.set(ang >= 0 ? -s : s, s, s);
      handle.omegaAuraGroup.add(km);
      handle.roninFanKatanas.push({
        mesh: km,
        baseX,
        baseY,
        baseZ,
        baseRotZ,
        outX: -Math.sin(ang),
        outY: Math.cos(ang),
        phase: tierIdx * 0.85 + (ang < 0 ? 0.45 : 0),
      });
    }
    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
  } else if (defId === 'obsidian-sovereign') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.name = 'chibiBackAttachmentGroup';
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.16);

    const crownHaloMat = createObsidianCrownHaloShaderMaterial();
    const greatswordMat = createObsidianGreatswordShaderMaterial();
    handle.omegaAuraMat = greatswordMat;
    handle.twinCustomMats.push(crownHaloMat);

    const discGeo = new THREE.PlaneGeometry(2.22, 2.22);
    handle.twinCustomGeos.push(discGeo);
    const crownDisc = new THREE.Mesh(discGeo, crownHaloMat);
    crownDisc.position.set(0, 0.04, -0.11);
    handle.omegaAuraGroup.add(crownDisc);

    const spikedCrownGeo = createSpikedHaloGeometry();
    handle.twinCustomGeos.push(spikedCrownGeo);
    handle.omegaHaloMesh = new THREE.Mesh(spikedCrownGeo, greatswordMat);
    handle.omegaHaloMesh.position.set(0, 0.04, -0.06);
    handle.omegaHaloMesh.scale.setScalar(0.78);
    handle.omegaAuraGroup.add(handle.omegaHaloMesh);

    handle.omegaAuraGeo = createAbyssalGreatswordGeometry();

    const colossalSword = new THREE.Mesh(handle.omegaAuraGeo, greatswordMat);
    colossalSword.position.set(0.24, -0.36, -0.02);
    colossalSword.rotation.set(0.04, -0.08, 0.62);
    colossalSword.scale.setScalar(0.56);
    handle.omegaAuraGroup.add(colossalSword);
    handle.roninFanKatanas.push({
      mesh: colossalSword,
      baseX: 0.24,
      baseY: -0.36,
      baseZ: -0.02,
      baseRotZ: 0.62,
      outX: -0.15,
      outY: 0.45,
      phase: 0.2,
    });

    const fanAngles = [0.64, 1.12, -0.64, -1.12];
    for (let i = 0; i < fanAngles.length; i++) {
      const ang = fanAngles[i];
      const tierIdx = i % 2;
      const rad = 0.72 + tierIdx * 0.14;
      const baseX = -Math.sin(ang) * rad * 1.16;
      const baseY = -0.14 + Math.cos(ang) * rad * 0.68;
      const baseZ = tierIdx === 0 ? -0.03 : -0.055;
      const baseRotZ = ang * 0.9;
      const s = 0.36 - tierIdx * 0.03;

      const sm = new THREE.Mesh(handle.omegaAuraGeo, greatswordMat);
      sm.position.set(baseX, baseY, baseZ);
      sm.rotation.set(0.05, ang >= 0 ? -0.12 : 0.12, baseRotZ);
      sm.scale.setScalar(s);
      handle.omegaAuraGroup.add(sm);
      handle.roninFanKatanas.push({
        mesh: sm,
        baseX,
        baseY,
        baseZ,
        baseRotZ,
        outX: -Math.sin(ang),
        outY: Math.cos(ang),
        phase: 0.8 + i * 0.75,
      });
    }

    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);

    handle.omegaHandPivot = new THREE.Group();
    handle.omegaHandPivot.position.set(0.22, spriteHeight * 0.52, 0.16);
    handle.omegaHandWeaponMat = createEnergyWeaponMaterial();
    handle.omegaHandWeaponMat.uniforms.uColor.value.set('#a855f7');
    handle.omegaHandWeaponMat.uniforms.uCoreColor.value.set('#ffffff');
    handle.omegaHandWeaponGeo = createAbyssalGreatswordGeometry();
    handle.omegaHandWeaponMesh = new THREE.Mesh(handle.omegaHandWeaponGeo, handle.omegaHandWeaponMat);
    handle.omegaHandPivot.add(handle.omegaHandWeaponMesh);
    handle.omegaHandPivot.visible = false;
    blitzHeroPivot.add(handle.omegaHandPivot);
  } else if (defId === 'yukikage-twins') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.54, -0.14);
    const shrineRingMat = createYukikageShrineRingShaderMaterial();
    const kunaiMat = createYukikageKunaiShaderMaterial();
    handle.omegaAuraMat = kunaiMat;
    handle.twinCustomMats.push(shrineRingMat, kunaiMat);

    const discGeo = new THREE.PlaneGeometry(1.92, 1.92);
    handle.twinCustomGeos.push(discGeo);
    const shrineDisc = new THREE.Mesh(discGeo, shrineRingMat);
    shrineDisc.position.set(0, 0.04, -0.08);
    handle.omegaAuraGroup.add(shrineDisc);

    handle.omegaAuraGeo = createKunaiGeometry();
    for (let i = 0; i < 8; i++) {
      const km = new THREE.Mesh(handle.omegaAuraGeo, kunaiMat);
      km.scale.setScalar(0.52);
      handle.omegaAuraGroup.add(km);
      handle.omegaOrbitKatanas.push(km);
    }
    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
  } else if (defId === 'halcyon-twins') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const valkHaloMat = createHalcyonValkyrieHaloShaderMaterial();
    const railMat = createHalcyonRailBowShaderMaterial();
    handle.omegaAuraMat = railMat;
    handle.twinCustomMats.push(valkHaloMat, railMat);

    const discGeo = new THREE.PlaneGeometry(1.94, 1.94);
    const railBowGeo = createHalcyonRailBowGeometry();
    handle.twinCustomGeos.push(discGeo, railBowGeo);

    const valkHalo = new THREE.Mesh(discGeo, valkHaloMat);
    valkHalo.position.set(0, 0.04, -0.09);
    handle.omegaAuraGroup.add(valkHalo);

    handle.omegaAuraGeo = createHalcyonMechanicalWingBladeGeometry();
    const wingPairs: Array<{ sx: number; sc: number; x: number; y: number; z: number; rz: number }> = [
      { sx: -1, sc: 0.72, x: -0.16, y: 0.14, z: -0.01, rz: 0.08 },
      { sx: 1, sc: 0.72, x: 0.16, y: 0.14, z: -0.01, rz: -0.08 },
      { sx: -1, sc: 0.56, x: -0.14, y: -0.10, z: -0.025, rz: 0.36 },
      { sx: 1, sc: 0.56, x: 0.14, y: -0.10, z: -0.025, rz: -0.36 },
    ];
    for (const wp of wingPairs) {
      const wm = new THREE.Mesh(handle.omegaAuraGeo, railMat);
      wm.scale.set(wp.sx * wp.sc, wp.sc, wp.sc);
      wm.position.set(wp.x, wp.y, wp.z);
      wm.rotation.z = wp.rz;
      handle.omegaAuraGroup.add(wm);
      handle.twinWingMeshes.push(wm);
    }

    for (const sx of [-1, 1]) {
      const bow = new THREE.Mesh(railBowGeo, railMat);
      bow.scale.set(sx * 0.66, 0.66, 0.66);
      bow.position.set(sx * 0.54, 0.04, -0.04);
      handle.omegaAuraGroup.add(bow);
    }

    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
  } else if (defId === 'lullaby-twins') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const musicBoxHaloMat = createLullabyPinkAuraShaderMaterial();
    const cradleMat = createLullabyMoonCradleShaderMaterial();
    handle.omegaAuraMat = cradleMat;
    handle.twinCustomMats.push(musicBoxHaloMat, cradleMat);

    const discGeo = new THREE.PlaneGeometry(1.92, 1.92);
    const cradleGeo = createLullabyMoonCradleArchGeometry();
    handle.twinCustomGeos.push(discGeo, cradleGeo);

    const auraDisc = new THREE.Mesh(discGeo, musicBoxHaloMat);
    auraDisc.position.set(0, 0.06, -0.09);
    const moonCradle = new THREE.Mesh(cradleGeo, cradleMat);
    moonCradle.scale.setScalar(1.06);
    moonCradle.position.set(0, 0.08, -0.04);
    handle.omegaAuraGroup.add(auraDisc, moonCradle);

    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
  } else if (defId === 'nocturne-twins') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const eclipseHaloMat = createNocturneEclipseHaloShaderMaterial();
    const whiteBladeMat = createNocturneWingShaderMaterial(false);
    const blackBladeMat = createNocturneWingShaderMaterial(true);
    handle.omegaAuraMat = blackBladeMat;
    handle.twinCustomMats.push(eclipseHaloMat, whiteBladeMat, blackBladeMat);

    const haloGeo = new THREE.PlaneGeometry(1.98, 1.98);
    handle.twinCustomGeos.push(haloGeo);
    const haloDisc = new THREE.Mesh(haloGeo, eclipseHaloMat);
    haloDisc.position.set(0, 0.04, -0.09);
    handle.omegaAuraGroup.add(haloDisc);

    handle.omegaAuraGeo = createNocturneWingGeometry();
    const bladeAngles = [0.42, 0.84, 1.24, -0.42, -0.84, -1.24];
    for (let i = 0; i < bladeAngles.length; i++) {
      const ang = bladeAngles[i];
      const isLeft = ang > 0;
      const tierIdx = i % 3;
      const rad = 0.68 + (tierIdx % 2) * 0.12;
      const baseX = -Math.sin(ang) * rad * 1.12;
      const baseY = 0.06 + Math.cos(ang) * rad * 0.78;
      const baseZ = tierIdx % 2 === 0 ? -0.02 : -0.05;
      const baseRotZ = ang * 0.92;
      const s = 0.58 - tierIdx * 0.03;

      const bm = new THREE.Mesh(handle.omegaAuraGeo, isLeft ? blackBladeMat : whiteBladeMat);
      bm.position.set(baseX, baseY, baseZ);
      bm.rotation.set(0.05, isLeft ? -0.12 : 0.12, baseRotZ);
      bm.scale.set(isLeft ? -s : s, s, s);
      handle.omegaAuraGroup.add(bm);
      handle.roninFanKatanas.push({
        mesh: bm,
        baseX,
        baseY,
        baseZ,
        baseRotZ,
        outX: -Math.sin(ang),
        outY: Math.cos(ang),
        phase: tierIdx * 0.9 + (isLeft ? 0 : 0.45),
      });
    }
    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
  } else if (defId === 'clockwork-twins') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const dialHaloMat = createClockworkDialShaderMaterial();
    const chassisMat = createClockworkChronoChassisShaderMaterial();
    handle.omegaAuraMat = chassisMat;
    handle.twinCustomMats.push(dialHaloMat, chassisMat);

    const dialGeo = new THREE.PlaneGeometry(2.04, 2.04);
    const handGeo = createClockworkScytheHandGeometry();
    handle.twinCustomGeos.push(dialGeo, handGeo);
    const dialMesh = new THREE.Mesh(dialGeo, dialHaloMat);
    dialMesh.position.set(0, 0.05, -0.1);
    handle.omegaAuraGroup.add(dialMesh);

    handle.omegaAuraGeo = createClockworkGearGeometry();
    const gearSpecs: Array<{ x: number; y: number; z: number; sc: number }> = [
      { x: -0.44, y: 0.16, z: -0.02, sc: 0.56 },
      { x: 0.44, y: -0.08, z: 0.01, sc: 0.46 },
      { x: 0.02, y: 0.54, z: -0.04, sc: 0.36 },
    ];
    for (const gs of gearSpecs) {
      const gm = new THREE.Mesh(handle.omegaAuraGeo, chassisMat);
      gm.scale.setScalar(gs.sc);
      gm.position.set(gs.x, gs.y, gs.z);
      handle.omegaAuraGroup.add(gm);
      handle.twinGearMeshes.push(gm);
    }

    for (const sx of [-1, 1]) {
      const hand = new THREE.Mesh(handGeo, chassisMat);
      hand.scale.setScalar(0.68);
      hand.position.set(sx * 0.14, 0.04, -0.05);
      hand.rotation.z = sx * -0.46;
      handle.omegaAuraGroup.add(hand);
    }

    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
  }

  if (handle.omegaAuraGroup) {
    handle.omegaAuraGroup.name = 'chibiBackAttachmentGroup';
  }

  return handle;
}

export function updateChibiBackAttachmentGroup(
  handle: ChibiBackAttachmentHandle,
  defId: string,
  elapsed: number,
  opacity: number
): void {
  if (handle.omegaAuraMat) {
    handle.omegaAuraMat.uniforms.uTime.value = elapsed;
    handle.omegaAuraMat.uniforms.uOpacity.value = opacity;
  }
  for (let i = 0; i < handle.twinCustomMats.length; i++) {
    handle.twinCustomMats[i].uniforms.uTime.value = elapsed;
    handle.twinCustomMats[i].uniforms.uOpacity.value = opacity;
  }
  if (handle.roninFanKatanas.length > 0) {
    for (let k = 0; k < handle.roninFanKatanas.length; k++) {
      const slot = handle.roninFanKatanas[k];
      const hover = Math.sin(elapsed * 2.4 + slot.phase);
      const expand = Math.sin(elapsed * 1.8 + slot.phase) * 0.032;
      slot.mesh.position.set(
        slot.baseX + slot.outX * expand,
        slot.baseY + hover * 0.044 + slot.outY * expand,
        slot.baseZ
      );
      slot.mesh.rotation.z = slot.baseRotZ + Math.sin(elapsed * 1.6 + slot.phase) * 0.034;
    }
    if (handle.omegaHaloMesh) {
      handle.omegaHaloMesh.rotation.z = elapsed * 0.45;
    }
  } else if (handle.omegaOrbitKatanas.length > 0) {
    const isYukikage = defId === 'yukikage-twins';
    for (let k = 0; k < handle.omegaOrbitKatanas.length; k++) {
      const ang = elapsed * (isYukikage ? 2.4 : 2.8) + (k / handle.omegaOrbitKatanas.length) * Math.PI * 2;
      const rad = isYukikage ? 0.86 + Math.sin(elapsed * 5.0 + k) * 0.04 : 0.82;
      handle.omegaOrbitKatanas[k].position.set(
        Math.cos(ang) * rad,
        isYukikage ? 0.04 + Math.sin(ang) * rad * 0.88 : Math.sin(ang) * rad * 0.72,
        isYukikage ? -0.04 : 0
      );
      handle.omegaOrbitKatanas[k].rotation.set(0, 0, ang - Math.PI * 0.5);
    }
  } else if (handle.omegaHaloMesh) {
    handle.omegaHaloMesh.rotation.z = elapsed * 2.2;
  } else if (handle.twinWingMeshes.length >= 2) {
    const flap = Math.sin(elapsed * 12) * 0.2;
    handle.twinWingMeshes[0].rotation.y = -0.16 + flap;
    handle.twinWingMeshes[1].rotation.y = 0.16 - flap;
    if (handle.twinWingMeshes.length >= 4) {
      const subFlap = Math.sin(elapsed * 12 - 0.55) * 0.16;
      handle.twinWingMeshes[2].rotation.y = -0.12 + subFlap;
      handle.twinWingMeshes[3].rotation.y = 0.12 - subFlap;
    }
    if (handle.twinWingMeshes.length >= 6) {
      const thirdFlap = Math.sin(elapsed * 12 - 1.1) * 0.14;
      handle.twinWingMeshes[4].rotation.y = -0.10 + thirdFlap;
      handle.twinWingMeshes[5].rotation.y = 0.10 - thirdFlap;
    }
  } else if (handle.twinGearMeshes.length >= 2) {
    for (let g = 0; g < handle.twinGearMeshes.length; g++) {
      handle.twinGearMeshes[g].rotation.z = elapsed * (g % 2 === 0 ? 1 : -1) * (3.2 + g * 1.1);
    }
  }
}

export function updateOmegaHandBlitzWeapon(
  handle: ChibiBackAttachmentHandle,
  bp: number,
  elapsed: number,
  handFace: 1 | -1,
  currentSpriteHeight: number
): void {
  if (!handle.omegaHandPivot || !handle.omegaHandWeaponMesh || !handle.omegaHandWeaponMat) return;
  let showHand = false;
  let swScale = 1.0;
  let rx = 0.7;
  let ry = 0.2;
  let rz = 0;

  if (bp >= 0.05 && bp < 0.19) {
    showHand = true;
    const k = (bp - 0.05) / 0.14;
    swScale = 0.95;
    rz = 1.6 - 3.3 * (k * k);
  } else if (bp >= 0.19 && bp < 0.32) {
    showHand = true;
    const k = (bp - 0.19) / 0.13;
    swScale = 1.02;
    ry = -0.2;
    rz = -1.6 + 3.3 * (k * k);
  } else if (bp >= 0.32 && bp < 0.44) {
    showHand = true;
    const k = (bp - 0.32) / 0.12;
    swScale = 1.12;
    rx = 0.4;
    rz = -1.4 + 3.4 * (k * k);
  } else if (bp >= 0.44 && bp < 0.72) {
    showHand = true;
    swScale = 1.75;
    rx = 0.15;
    ry = 0.12;
    if (bp < 0.56) {
      rz = 2.35;
    } else {
      const k = Math.min(1, (bp - 0.56) / 0.12);
      rz = 2.35 - 4.0 * (k * k);
    }
  }

  handle.omegaHandPivot.visible = showHand;
  if (showHand) {
    handle.omegaHandPivot.position.set(handFace * 0.22, currentSpriteHeight * 0.54, 0.16);
    handle.omegaHandPivot.rotation.set(rx, ry, rz);
    handle.omegaHandWeaponMesh.scale.setScalar(swScale);
    handle.omegaHandWeaponMat.uniforms.uTime.value = elapsed;
    handle.omegaHandWeaponMat.uniforms.uOpacity.value = bp > 0.68 ? Math.max(0, 1 - (bp - 0.68) / 0.04) : 1.0;
  }
}

export function stepChibiAttackComboKinematics(
  p: number,
  attackComboStep: number,
  facing: 1 | -1
): { posX: number; posY: number; rotZ: number; scaleX: number; scaleY: number; shadowScale: number } {
  if (attackComboStep === 1) {
    if (p < 0.18) {
      const k = p / 0.18;
      const ease = k * k;
      return {
        posX: -facing * 0.13 * ease,
        posY: 0.01 * ease,
        rotZ: facing * 0.14 * ease,
        scaleY: 1 - 0.06 * ease,
        scaleX: 1 + 0.05 * ease,
        shadowScale: 1.04,
      };
    }
    if (p < 0.44) {
      const k = (p - 0.18) / 0.26;
      const snap = 1 - (1 - k) * (1 - k);
      const arc = Math.sin(k * Math.PI);
      return {
        posX: facing * (-0.13 + 0.34 * snap),
        posY: 0.01 + 0.06 * arc,
        rotZ: facing * (0.14 - 0.38 * snap),
        scaleY: 0.94 + 0.08 * arc,
        scaleX: 1.05 + 0.06 * arc,
        shadowScale: 1.1,
      };
    }
    const k = (p - 0.44) / 0.56;
    const rem = 1 - (1 - Math.pow(1 - k, 3));
    return {
      posX: facing * 0.21 * rem,
      posY: 0.015 * rem,
      rotZ: -facing * 0.24 * rem,
      scaleY: 1 + 0.025 * rem,
      scaleX: 1 - 0.02 * rem,
      shadowScale: 1.07 - 0.05 * (1 - rem),
    };
  }
  if (attackComboStep === 2) {
    if (p < 0.22) {
      const k = p / 0.22;
      const ease = k * k;
      return {
        posX: -facing * 0.14 * ease,
        posY: 0,
        rotZ: facing * 0.2 * ease,
        scaleY: 1 - 0.1 * ease,
        scaleX: 1 + 0.08 * ease,
        shadowScale: 1.06,
      };
    }
    if (p < 0.48) {
      const k = (p - 0.22) / 0.26;
      const snap = 1 - (1 - k) * (1 - k);
      const arc = Math.sin(k * Math.PI);
      return {
        posX: facing * (-0.14 + 0.36 * snap),
        posY: 0.19 * arc,
        rotZ: facing * (0.2 - 0.48 * snap),
        scaleY: 0.9 + 0.2 * arc,
        scaleX: 1.08 - 0.11 * arc,
        shadowScale: 1.02 - 0.12 * arc,
      };
    }
    const k = (p - 0.48) / 0.52;
    const rem = 1 - (1 - Math.pow(1 - k, 3));
    const landing = Math.sin(Math.min(1, k * 2.2) * Math.PI);
    return {
      posX: facing * 0.22 * rem,
      posY: 0.02 * rem,
      rotZ: -facing * 0.28 * rem,
      scaleY: 1 - 0.05 * landing + 0.03 * rem,
      scaleX: 1 + 0.04 * landing,
      shadowScale: 1.1 - 0.08 * (1 - rem),
    };
  }
  if (p < 0.2) {
    const k = p / 0.2;
    const ease = k * k;
    return {
      posX: -facing * 0.11 * ease,
      posY: 0.02 * ease,
      rotZ: facing * 0.16 * ease,
      scaleY: 1 - 0.04 * ease,
      scaleX: 1 + 0.03 * ease,
      shadowScale: 1.02,
    };
  }
  if (p < 0.44) {
    const k = (p - 0.2) / 0.24;
    const snap = 1 - (1 - k) * (1 - k);
    const arc = Math.sin(k * Math.PI);
    return {
      posX: facing * (-0.11 + 0.27 * snap),
      posY: 0.02 + 0.1 * arc,
      rotZ: facing * (0.16 - 0.4 * snap),
      scaleY: 0.96 + 0.12 * arc,
      scaleX: 1.03 - 0.07 * arc,
      shadowScale: 1.08,
    };
  }
  const k = (p - 0.44) / 0.56;
  const settle = 1 - Math.pow(1 - k, 3);
  const rem = 1 - settle;
  return {
    posX: facing * 0.16 * rem,
    posY: 0.02 * rem,
    rotZ: -facing * 0.24 * rem,
    scaleY: 1 + 0.03 * rem,
    scaleX: 1 - 0.015 * rem,
    shadowScale: 1.06 - 0.05 * settle,
  };
}

export interface LoadedPoseMeta {
  texture: THREE.Texture;
  pixelWidth: number;
  pixelHeight: number;
  topTrimRatio: number;
}

const poseCache = new Map<string, Promise<LoadedPoseMeta>>();
const textureLoader = new THREE.TextureLoader();
let contactShadowTex: THREE.CanvasTexture | null | undefined;

export function getSoftContactShadowTexture(): THREE.CanvasTexture | null {
  if (contactShadowTex !== undefined) return contactShadowTex;
  if (typeof document === 'undefined') {
    contactShadowTex = null;
    return null;
  }
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    contactShadowTex = null;
    return null;
  }
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.4, 'rgba(2, 6, 23, 0.44)');
  grad.addColorStop(0.74, 'rgba(2, 6, 23, 0.14)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  contactShadowTex = tex;
  return tex;
}

let trimScratchCanvas: HTMLCanvasElement | null = null;
let trimScratchCtx: CanvasRenderingContext2D | null = null;

function measureTopTrimRatio(img: HTMLImageElement): number {
  if (typeof document === 'undefined' || !img.width || !img.height) return 0;
  try {
    const sw = Math.min(64, img.width);
    const sh = Math.min(64, img.height);
    if (!trimScratchCanvas) {
      trimScratchCanvas = document.createElement('canvas');
      trimScratchCanvas.width = 64;
      trimScratchCanvas.height = 64;
      trimScratchCtx = trimScratchCanvas.getContext('2d', { willReadFrequently: true });
    }
    const ctx = trimScratchCtx;
    if (!ctx) return 0;
    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(img, 0, 0, sw, sh);
    const data = ctx.getImageData(0, 0, sw, sh).data;
    for (let y = 0; y < sh; y++) {
      const rowOffset = y * sw * 4;
      for (let x = 0; x < sw; x++) {
        if (data[rowOffset + x * 4 + 3] > 20) {
          return Math.min(0.45, Math.max(0, y / sh));
        }
      }
    }
  } catch {
    // Fallback cleanly when canvas pixel readback is unavailable
  }
  return 0;
}

export function loadPoseMeta(url: string, smoothFilter = false): Promise<LoadedPoseMeta> {
  const resolved = assetUrl(url);
  const cacheKey = `${resolved}|${smoothFilter ? 'smooth' : 'pixel'}`;
  const cached = poseCache.get(cacheKey);
  if (cached) return cached;

  const promise = new Promise<LoadedPoseMeta>((resolve, reject) => {
    textureLoader.load(
      resolved,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        applySharpSpriteTexture(tex, !smoothFilter);

        const img = tex.image as HTMLImageElement;
        resolve({
          texture: tex,
          pixelWidth: img.width,
          pixelHeight: img.height,
          topTrimRatio: measureTopTrimRatio(img),
        });
      },
      undefined,
      (err) => reject(err)
    );
  });

  poseCache.set(cacheKey, promise);
  return promise;
}

export function stateToPoseUrl(def: ChibiDef, state: ChibiAnimState): string {
  if (state === 'dash') return def.poses.walk;
  if (state === 'attack') return def.poses.attack;
  if (state === 'aura') return def.poses.pose;
  return def.poses.idle;
}

export function disposeChibiBackAttachments(handle: ChibiBackAttachmentHandle): void {
  handle.omegaAuraGeo?.dispose();
  handle.omegaAuraMat?.dispose();
  for (let i = 0; i < handle.twinCustomMats.length; i++) {
    handle.twinCustomMats[i].dispose();
  }
  for (let i = 0; i < handle.twinCustomGeos.length; i++) {
    handle.twinCustomGeos[i].dispose();
  }
  handle.omegaHandWeaponGeo?.dispose();
  handle.omegaHandWeaponMat?.dispose();
}
