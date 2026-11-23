import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import type { ChibiAnimState, ChibiDef } from './ChibiCatalog';
import { applySharpSpriteTexture } from './MeshHelpers3D';
import {
  createAbyssalGreatswordGeometry,
  createAetherDivineBroadSwordGeometry,
  createAetherSpectrumSwordBackShaderMaterial,
  createAetherSunburstBackHaloShaderMaterial,
  createCheshireCyberBackHaloShaderMaterial,
  createCheshireGlitchClawBackShaderMaterial,
  createCheshireGlitchPixelWingGeometry,
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
  createLullabyMoonCradleArchGeometry,
  createLullabyMoonCradleShaderMaterial,
  createLullabyPinkAuraShaderMaterial,
  createMonochromeCruciformBackShaderMaterial,
  createMonochromeCruciformSwordGeometry,
  createMonochromeSumiBackHaloShaderMaterial,
  createNocturneEclipseHaloShaderMaterial,
  createNocturneWingGeometry,
  createNocturneWingShaderMaterial,
  createObsidianCrownHaloShaderMaterial,
  createObsidianGreatswordShaderMaterial,
  createObsidianMonolithShardShaderMaterial,
  createObsidianShatterMonolithGeometry,
  createPrismHexagramBackHaloShaderMaterial,
  createPrismIridescentBackShaderMaterial,
  createPrismTriangleCrownHaloGeometry,
  createPrismWingDiamondGeometry,
  createRoninKatanaGeometry,
  createSpikedHaloGeometry,
  createThornBrambleSpikeBladeGeometry,
  createThornGothicBrambleBackShaderMaterial,
  createThornIronWheelBackHaloShaderMaterial,
  createThornSpiritCrownGeometry,
  createYukikageGlacialClusterGeometry,
  createYukikageHitodamaLanternGeometry,
  createYukikageKunaiShaderMaterial,
  createYukikageShrineRingShaderMaterial,
  createYukikageWagasaShaderMaterial,
  createYukikageWagasaUmbrellaGeometry,
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
    const monolithMat = createObsidianMonolithShardShaderMaterial();
    handle.omegaAuraMat = greatswordMat;
    handle.twinCustomMats.push(crownHaloMat, monolithMat);

    const discGeo = new THREE.PlaneGeometry(2.26, 2.26);
    const spikedCrownGeo = createSpikedHaloGeometry();
    const monolithGeo = createObsidianShatterMonolithGeometry();
    handle.twinCustomGeos.push(discGeo, spikedCrownGeo, monolithGeo);

    const crownDisc = new THREE.Mesh(discGeo, crownHaloMat);
    crownDisc.position.set(0, 0.04, -0.11);
    handle.omegaAuraGroup.add(crownDisc);

    // 9-Spearhead Forged Iron Halo Ring behind the head (upright & steady, not a spinning wheel)
    handle.omegaHaloMesh = new THREE.Mesh(spikedCrownGeo, greatswordMat);
    handle.omegaHaloMesh.position.set(0, 0.14, -0.06);
    handle.omegaHaloMesh.scale.setScalar(0.74);
    handle.omegaAuraGroup.add(handle.omegaHaloMesh);

    // Single Colossal Diagonal Abyssal Greatsword with Pommel Chain Charm (matching idle.webp)
    handle.omegaAuraGeo = createAbyssalGreatswordGeometry();
    const colossalSword = new THREE.Mesh(handle.omegaAuraGeo, greatswordMat);
    colossalSword.position.set(0.28, -0.34, -0.02);
    colossalSword.rotation.set(0.04, -0.08, 0.72);
    colossalSword.scale.setScalar(0.60);
    handle.omegaAuraGroup.add(colossalSword);
    handle.roninFanKatanas.push({
      mesh: colossalSword,
      baseX: 0.28,
      baseY: -0.34,
      baseZ: -0.02,
      baseRotZ: 0.72,
      outX: -0.12,
      outY: 0.38,
      phase: 0.2,
    });

    // 4 Levitating Shattered Obsidian Monolith Crags flanking the black-flame cloak (matching pose.webp)
    const monolithSpecs: ReadonlyArray<{ x: number; y: number; z: number; rz: number; sc: number; phase: number }> = [
      { x: -0.86, y: -0.18, z: -0.03, rz: 0.22, sc: 0.56, phase: 0.0 },
      { x: -0.74, y: 0.28, z: -0.05, rz: 0.14, sc: 0.44, phase: 1.35 },
      { x: 0.86, y: -0.16, z: -0.03, rz: -0.22, sc: 0.54, phase: 0.68 },
      { x: 0.74, y: 0.26, z: -0.05, rz: -0.14, sc: 0.42, phase: 2.05 },
    ];
    for (let i = 0; i < monolithSpecs.length; i++) {
      const ms = monolithSpecs[i];
      const mm = new THREE.Mesh(monolithGeo, monolithMat);
      mm.position.set(ms.x, ms.y, ms.z);
      mm.rotation.set(0.06, ms.x < 0 ? 0.16 : -0.16, ms.rz);
      mm.scale.setScalar(ms.sc);
      handle.omegaAuraGroup.add(mm);
      handle.roninFanKatanas.push({
        mesh: mm,
        baseX: ms.x,
        baseY: ms.y,
        baseZ: ms.z,
        baseRotZ: ms.rz,
        outX: ms.x < 0 ? -0.25 : 0.25,
        outY: 0.95,
        phase: ms.phase,
      });
    }

    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);

    handle.omegaHandPivot = new THREE.Group();
    handle.omegaHandPivot.position.set(0.22, spriteHeight * 0.52, 0.16);
    handle.omegaHandWeaponMat = createEnergyWeaponMaterial();
    handle.omegaHandWeaponMat.uniforms.uColor.value.set('#64748b');
    handle.omegaHandWeaponMat.uniforms.uCoreColor.value.set('#ffffff');
    handle.omegaHandWeaponGeo = createAbyssalGreatswordGeometry();
    handle.omegaHandWeaponMesh = new THREE.Mesh(handle.omegaHandWeaponGeo, handle.omegaHandWeaponMat);
    handle.omegaHandPivot.add(handle.omegaHandWeaponMesh);
    handle.omegaHandPivot.visible = false;
    blitzHeroPivot.add(handle.omegaHandPivot);
  } else if (defId === 'yukikage-twins') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const shrineRingMat = createYukikageShrineRingShaderMaterial();
    const cryoClusterMat = createYukikageKunaiShaderMaterial();
    const wagasaMat = createYukikageWagasaShaderMaterial();
    handle.omegaAuraMat = cryoClusterMat;
    handle.twinCustomMats.push(shrineRingMat, cryoClusterMat, wagasaMat);

    const discGeo = new THREE.PlaneGeometry(2.04, 2.04);
    const wagasaGeo = createYukikageWagasaUmbrellaGeometry();
    const hitodamaGeo = createYukikageHitodamaLanternGeometry();
    handle.twinCustomGeos.push(discGeo, wagasaGeo, hitodamaGeo);

    // 1. Sakuga 24-Ribbed Wagasa Canopy, Dual Frost-Ink Crescent & Hitodama Halo Disc
    const shrineDisc = new THREE.Mesh(discGeo, shrineRingMat);
    shrineDisc.position.set(0, 0.04, -0.09);
    handle.omegaAuraGroup.add(shrineDisc);

    // 2. 3D Bamboo Wagasa Umbrella Canopy behind the left twin (flat XY profile so it never clips the 2D sprite)
    const wagasaMesh = new THREE.Mesh(wagasaGeo, wagasaMat);
    wagasaMesh.position.set(-0.26, 0.26, -0.065);
    wagasaMesh.rotation.set(0, 0, 0.28);
    wagasaMesh.scale.set(0.84, 0.84, 0.55);
    handle.omegaAuraGroup.add(wagasaMesh);
    handle.omegaHaloMesh = wagasaMesh;

    // 3 & 4. Two Floating Hitodama Spirit Flame & Shinto Tōrō Lantern Wisps (idle.webp & pose.webp)
    const wispSpecs: ReadonlyArray<{ x: number; y: number; z: number; rz: number; sc: number; phase: number }> = [
      { x: -0.84, y: -0.06, z: -0.02, rz: 0.12, sc: 0.72, phase: 0.0 },
      { x: 0.84, y: 0.18, z: -0.02, rz: -0.12, sc: 0.72, phase: 1.57 },
    ];
    for (let i = 0; i < wispSpecs.length; i++) {
      const ws = wispSpecs[i];
      const wm = new THREE.Mesh(hitodamaGeo, wagasaMat);
      wm.position.set(ws.x, ws.y, ws.z);
      wm.rotation.z = ws.rz;
      wm.scale.setScalar(ws.sc);
      handle.omegaAuraGroup.add(wm);
      handle.roninFanKatanas.push({
        mesh: wm,
        baseX: ws.x,
        baseY: ws.y,
        baseZ: ws.z,
        baseRotZ: ws.rz,
        outX: ws.x < 0 ? -0.35 : 0.35,
        outY: 0.85,
        phase: ws.phase,
      });
    }

    // 5, 6, 7. Three Erupting Voronoi Glacial Ice-Crystal Clusters (attack.webp)
    handle.omegaAuraGeo = createYukikageGlacialClusterGeometry();
    const glacialSpecs: ReadonlyArray<{ x: number; y: number; z: number; rz: number; sc: number; phase: number }> = [
      { x: -0.58, y: -0.34, z: -0.03, rz: 0.42, sc: 0.64, phase: 0.45 },
      { x: 0.58, y: -0.32, z: -0.03, rz: -0.42, sc: 0.64, phase: 1.15 },
      { x: 0.68, y: 0.42, z: -0.045, rz: -0.68, sc: 0.56, phase: 2.1 },
    ];
    for (let i = 0; i < glacialSpecs.length; i++) {
      const gs = glacialSpecs[i];
      const gm = new THREE.Mesh(handle.omegaAuraGeo, cryoClusterMat);
      gm.position.set(gs.x, gs.y, gs.z);
      gm.rotation.set(0.06, gs.x < 0 ? 0.14 : -0.14, gs.rz);
      gm.scale.setScalar(gs.sc);
      handle.omegaAuraGroup.add(gm);
      handle.roninFanKatanas.push({
        mesh: gm,
        baseX: gs.x,
        baseY: gs.y,
        baseZ: gs.z,
        baseRotZ: gs.rz,
        outX: gs.x < 0 ? -0.45 : 0.45,
        outY: 0.55,
        phase: gs.phase,
      });
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
  } else if (defId === 'glitch-cheshire') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.55, -0.15);
    const cyberHaloMat = createCheshireCyberBackHaloShaderMaterial();
    const clawMat = createCheshireGlitchClawBackShaderMaterial();
    handle.omegaAuraMat = clawMat;
    handle.twinCustomMats.push(cyberHaloMat, clawMat);

    const discGeo = new THREE.PlaneGeometry(1.94, 1.94);
    handle.twinCustomGeos.push(discGeo);
    const haloDisc = new THREE.Mesh(discGeo, cyberHaloMat);
    haloDisc.position.set(0, 0.04, -0.09);
    handle.omegaAuraGroup.add(haloDisc);

    handle.omegaAuraGeo = createCheshireGlitchPixelWingGeometry();
    const clawAngles = [0.44, 0.86, 1.28, -0.44, -0.86, -1.28];
    for (let i = 0; i < clawAngles.length; i++) {
      const ang = clawAngles[i];
      const isLeft = ang > 0;
      const tierIdx = i % 3;
      const rad = 0.68 + (tierIdx % 2) * 0.12;
      const baseX = -Math.sin(ang) * rad * 1.12;
      const baseY = 0.05 + Math.cos(ang) * rad * 0.78;
      const baseZ = tierIdx % 2 === 0 ? -0.02 : -0.05;
      const baseRotZ = ang * 0.88;
      const s = 0.62 - tierIdx * 0.04;

      const cm = new THREE.Mesh(handle.omegaAuraGeo, clawMat);
      cm.position.set(baseX, baseY, baseZ);
      cm.rotation.set(0.05, isLeft ? -0.14 : 0.14, baseRotZ);
      cm.scale.set(isLeft ? -s : s, s, s);
      handle.omegaAuraGroup.add(cm);
      handle.roninFanKatanas.push({
        mesh: cm,
        baseX,
        baseY,
        baseZ,
        baseRotZ,
        outX: -Math.sin(ang),
        outY: Math.cos(ang),
        phase: tierIdx * 0.85 + (isLeft ? 0 : 0.45),
      });
    }
    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
  } else if (defId === 'thorn-maiden') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const wheelHaloMat = createThornIronWheelBackHaloShaderMaterial();
    const brambleMat = createThornGothicBrambleBackShaderMaterial();
    handle.omegaAuraMat = brambleMat;
    handle.twinCustomMats.push(wheelHaloMat, brambleMat);

    const discGeo = new THREE.PlaneGeometry(2.02, 2.02);
    const crownGeo = createThornSpiritCrownGeometry();
    handle.twinCustomGeos.push(discGeo, crownGeo);

    const wheelDisc = new THREE.Mesh(discGeo, wheelHaloMat);
    wheelDisc.position.set(0, 0.04, -0.09);
    handle.omegaAuraGroup.add(wheelDisc);

    const spiritCrown = new THREE.Mesh(crownGeo, brambleMat);
    spiritCrown.position.set(0.32, 0.36, -0.04);
    spiritCrown.rotation.set(0.06, -0.12, -0.22);
    spiritCrown.scale.setScalar(0.84);
    handle.omegaAuraGroup.add(spiritCrown);
    handle.roninFanKatanas.push({
      mesh: spiritCrown,
      baseX: 0.32,
      baseY: 0.36,
      baseZ: -0.04,
      baseRotZ: -0.22,
      outX: 0.25,
      outY: 0.65,
      phase: 0.35,
    });

    handle.omegaAuraGeo = createThornBrambleSpikeBladeGeometry();
    const thornAngles = [0.40, 0.82, 1.24, -0.40, -0.82, -1.24];
    for (let i = 0; i < thornAngles.length; i++) {
      const ang = thornAngles[i];
      const tierIdx = i % 3;
      const rad = 0.70 + (tierIdx % 2) * 0.12;
      const baseX = -Math.sin(ang) * rad * 1.12;
      const baseY = 0.04 + Math.cos(ang) * rad * 0.78;
      const baseZ = tierIdx % 2 === 0 ? -0.025 : -0.055;
      const baseRotZ = ang * 0.94;
      const s = 0.64 - tierIdx * 0.04;

      const tm = new THREE.Mesh(handle.omegaAuraGeo, brambleMat);
      tm.position.set(baseX, baseY, baseZ);
      tm.rotation.set(0.05, ang >= 0 ? -0.12 : 0.12, baseRotZ);
      tm.scale.setScalar(s);
      handle.omegaAuraGroup.add(tm);
      handle.roninFanKatanas.push({
        mesh: tm,
        baseX,
        baseY,
        baseZ,
        baseRotZ,
        outX: -Math.sin(ang),
        outY: Math.cos(ang),
        phase: tierIdx * 0.9 + (ang < 0 ? 0.5 : 0),
      });
    }
    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
  } else if (defId === 'monochrome-saint') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const sumiHaloMat = createMonochromeSumiBackHaloShaderMaterial();
    const crossMat = createMonochromeCruciformBackShaderMaterial();
    handle.omegaAuraMat = crossMat;
    handle.twinCustomMats.push(sumiHaloMat, crossMat);

    const discGeo = new THREE.PlaneGeometry(1.96, 1.96);
    handle.twinCustomGeos.push(discGeo);
    const sumiDisc = new THREE.Mesh(discGeo, sumiHaloMat);
    sumiDisc.position.set(0, 0.05, -0.09);
    handle.omegaAuraGroup.add(sumiDisc);

    handle.omegaAuraGeo = createMonochromeCruciformSwordGeometry();
    const crossSlots: ReadonlyArray<{ x: number; y: number; z: number; sc: number; phase: number }> = [
      { x: -0.52, y: 0.48, z: -0.02, sc: 0.62, phase: 0.0 },
      { x: -0.78, y: 0.14, z: -0.04, sc: 0.54, phase: 1.05 },
      { x: -0.64, y: -0.22, z: -0.02, sc: 0.58, phase: 2.1 },
      { x: 0.54, y: 0.36, z: -0.02, sc: 0.64, phase: 0.52 },
      { x: 0.80, y: 0.02, z: -0.04, sc: 0.54, phase: 1.57 },
      { x: 0.62, y: -0.26, z: -0.02, sc: 0.58, phase: 2.62 },
    ];
    for (let i = 0; i < crossSlots.length; i++) {
      const cs = crossSlots[i];
      const cm = new THREE.Mesh(handle.omegaAuraGeo, crossMat);
      cm.position.set(cs.x, cs.y, cs.z);
      cm.scale.setScalar(cs.sc);
      handle.omegaAuraGroup.add(cm);
      handle.roninFanKatanas.push({
        mesh: cm,
        baseX: cs.x,
        baseY: cs.y,
        baseZ: cs.z,
        baseRotZ: 0,
        outX: cs.x >= 0 ? 0.35 : -0.35,
        outY: 0.85,
        phase: cs.phase,
      });
    }
    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
  } else if (defId === 'prism-seraph') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const hexHaloMat = createPrismHexagramBackHaloShaderMaterial();
    const prismMat = createPrismIridescentBackShaderMaterial();
    handle.omegaAuraMat = prismMat;
    handle.twinCustomMats.push(hexHaloMat, prismMat);

    const discGeo = new THREE.PlaneGeometry(1.98, 1.98);
    const triCrownGeo = createPrismTriangleCrownHaloGeometry();
    handle.twinCustomGeos.push(discGeo, triCrownGeo);

    const hexDisc = new THREE.Mesh(discGeo, hexHaloMat);
    hexDisc.position.set(0, 0.04, -0.09);
    handle.omegaAuraGroup.add(hexDisc);

    const triCrown = new THREE.Mesh(triCrownGeo, prismMat);
    triCrown.position.set(0.02, 0.56, -0.02);
    triCrown.rotation.set(0.32, -0.12, -0.18);
    triCrown.scale.setScalar(0.86);
    handle.omegaAuraGroup.add(triCrown);
    handle.omegaHaloMesh = triCrown;

    handle.omegaAuraGeo = createPrismWingDiamondGeometry();
    const diamondWings: ReadonlyArray<{ sx: number; sc: number; x: number; y: number; z: number; rz: number }> = [
      { sx: -1, sc: 0.78, x: -0.62, y: 0.26, z: -0.02, rz: 0.34 },
      { sx: 1, sc: 0.78, x: 0.62, y: 0.26, z: -0.02, rz: -0.34 },
      { sx: -1, sc: 0.68, x: -0.78, y: 0.02, z: -0.035, rz: 0.82 },
      { sx: 1, sc: 0.68, x: 0.78, y: 0.02, z: -0.035, rz: -0.82 },
      { sx: -1, sc: 0.56, x: -0.58, y: -0.22, z: -0.05, rz: 1.18 },
      { sx: 1, sc: 0.56, x: 0.58, y: -0.22, z: -0.05, rz: -1.18 },
    ];
    for (const dw of diamondWings) {
      const dm = new THREE.Mesh(handle.omegaAuraGeo, prismMat);
      dm.scale.set(dw.sx * dw.sc, dw.sc, dw.sc);
      dm.position.set(dw.x, dw.y, dw.z);
      dm.rotation.z = dw.rz;
      handle.omegaAuraGroup.add(dm);
      handle.twinWingMeshes.push(dm);
    }
    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
  } else if (defId === 'aether-monarch') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const sunburstHaloMat = createAetherSunburstBackHaloShaderMaterial();
    const swordMat = createAetherSpectrumSwordBackShaderMaterial();
    handle.omegaAuraMat = swordMat;
    handle.twinCustomMats.push(sunburstHaloMat, swordMat);

    const discGeo = new THREE.PlaneGeometry(2.14, 2.14);
    handle.twinCustomGeos.push(discGeo);
    const sunDisc = new THREE.Mesh(discGeo, sunburstHaloMat);
    sunDisc.position.set(0, 0.05, -0.1);
    handle.omegaAuraGroup.add(sunDisc);

    handle.omegaAuraGeo = createAetherDivineBroadSwordGeometry();
    const crownAngles = [0, 0.36, 0.72, 1.10, 1.48, -0.36, -0.72, -1.10, -1.48];
    for (let i = 0; i < crownAngles.length; i++) {
      const ang = crownAngles[i];
      const isApex = i === 0;
      const tierIdx = isApex ? 0 : (i - 1) % 4;
      const rad = isApex ? 0.76 : 0.70 + (tierIdx % 2) * 0.08;
      const baseX = -Math.sin(ang) * rad * 1.14;
      const baseY = 0.06 + Math.cos(ang) * rad * 0.84;
      const baseZ = isApex ? -0.015 : tierIdx % 2 === 0 ? -0.03 : -0.055;
      const baseRotZ = ang * 0.96;
      const s = isApex ? 0.68 : 0.60 - tierIdx * 0.025;

      const sm = new THREE.Mesh(handle.omegaAuraGeo, swordMat);
      sm.position.set(baseX, baseY, baseZ);
      sm.rotation.set(0.05, ang === 0 ? 0 : ang > 0 ? -0.12 : 0.12, baseRotZ);
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
        phase: i * 0.65,
      });
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
    const isCheshire = defId === 'glitch-cheshire';
    const isMonochrome = defId === 'monochrome-saint';
    const isObsidianMonolith = defId === 'obsidian-sovereign';
    for (let k = 0; k < handle.roninFanKatanas.length; k++) {
      const slot = handle.roninFanKatanas[k];
      const hover = Math.sin(elapsed * 2.4 + slot.phase);
      const expand = Math.sin(elapsed * 1.8 + slot.phase) * 0.032;
      const glitchJump =
        isCheshire && Math.sin(elapsed * 19.0 + k * 2.7) > 0.86
          ? (k % 2 === 0 ? 1 : -1) * 0.042
          : 0;
      const monolithTremor =
        isObsidianMonolith && k >= 1 ? Math.sin(elapsed * 26.0 + k * 3.1) * 0.008 : 0;
      slot.mesh.position.set(
        slot.baseX + slot.outX * expand + glitchJump + monolithTremor,
        slot.baseY + hover * (isObsidianMonolith && k >= 1 ? 0.068 : 0.044) + slot.outY * expand,
        slot.baseZ
      );
      slot.mesh.rotation.z = isMonochrome
        ? Math.sin(elapsed * 1.4 + slot.phase) * 0.014
        : slot.baseRotZ + Math.sin(elapsed * 1.6 + slot.phase) * 0.034;
    }
    if (handle.omegaHaloMesh) {
      if (defId === 'obsidian-sovereign') {
        handle.omegaHaloMesh.position.y = 0.14 + Math.sin(elapsed * 2.1) * 0.022;
        handle.omegaHaloMesh.rotation.z = Math.sin(elapsed * 1.5) * 0.032;
      } else if (defId === 'yukikage-twins') {
        handle.omegaHaloMesh.position.y = 0.26 + Math.sin(elapsed * 2.2) * 0.024;
        handle.omegaHaloMesh.rotation.set(0, 0, elapsed * 0.55);
      } else {
        handle.omegaHaloMesh.rotation.z = elapsed * 0.45;
      }
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
    if (handle.omegaHaloMesh && defId === 'prism-seraph') {
      handle.omegaHaloMesh.position.y = 0.56 + Math.sin(elapsed * 2.6) * 0.032;
      handle.omegaHaloMesh.rotation.z = -0.18 + Math.sin(elapsed * 1.8) * 0.045;
    }
  } else if (handle.omegaHaloMesh) {
    handle.omegaHaloMesh.rotation.z = elapsed * 2.2;
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
