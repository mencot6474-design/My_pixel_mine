import * as THREE from 'three';
import type { ChibiBackAttachmentHandle } from './ChibiBackAttachments3D';
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
  createLullabyMoonCradleArchGeometry,
  createLullabyMoonCradleShaderMaterial,
  createLullabyPinkAuraShaderMaterial,
  createLullabyWingFeatherGeometry,
  createLullabyWingFeatherShaderMaterial,
  createNocturneEclipseHaloShaderMaterial,
  createNocturneWingGeometry,
  createNocturneWingShaderMaterial,
  createObsidianCrownHaloShaderMaterial,
  createObsidianGreatswordShaderMaterial,
  createObsidianMonolithShardShaderMaterial,
  createObsidianShatterMonolithGeometry,
  createRoninKatanaGeometry,
  createSpikedHaloGeometry,
  createYukikageGlacialClusterGeometry,
  createYukikageHitodamaLanternGeometry,
  createYukikageKunaiShaderMaterial,
  createYukikageShrineRingShaderMaterial,
  createYukikageWagasaShaderMaterial,
  createYukikageWagasaUmbrellaGeometry,
} from './MeshFx3D';
import {
  createParadoxChainSpikeGeometry,
  createParadoxCrimsonChainShaderMaterial,
  createParadoxDualHaloShaderMaterial,
  createParadoxGoldGearGeometry,
  createParadoxGoldGearShaderMaterial,
} from './skills/paradoxTwinsSkillVfx3D';
import {
  createLeviathanHydroClawShaderMaterial,
  createLeviathanHydroFinGeometry,
  createLeviathanMaelstromHaloShaderMaterial,
} from './skills/abyssalLeviathanSkillVfx3D';
import {
  createVoidAsuraClawGeometry,
  createVoidAsuraClawShaderMaterial,
  createVoidAsuraHaloShaderMaterial,
  createVoidAsuraObsidianShardGeometry,
} from './skills/voidAsuraSkillVfx3D';
import {
  createNullCrystalGeometry,
  createNullMirrorCardGeometry,
  createNullMirrorCardShaderMaterial,
  createNullSingularityHaloShaderMaterial,
} from './skills/nullSingularitySkillVfx3D';

/** Builds Omega, Anomaly, and Twin bespoke 3D Sakuga back-attachments. */
export function buildApexBackAttachment(
  handle: ChibiBackAttachmentHandle,
  defId: string,
  spriteHeight: number,
  spritePivot: THREE.Group,
  blitzHeroPivot: THREE.Group
): boolean {
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
    return true;
  }

  if (defId === 'obsidian-sovereign') {
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
    return true;
  }

  if (defId === 'abyssal-leviathan') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.52, -0.14);
    const haloMat = createLeviathanMaelstromHaloShaderMaterial();
    const hydroFinMat = createLeviathanHydroClawShaderMaterial();
    handle.omegaAuraMat = haloMat;
    handle.twinCustomMats.push(hydroFinMat);

    const haloGeo = new THREE.PlaneGeometry(2.75, 2.75);
    const finGeo = createLeviathanHydroFinGeometry();
    handle.omegaAuraGeo = haloGeo;
    handle.twinCustomGeos.push(finGeo);

    // 1 swirling Abyssal Maelstrom Halo disc behind the chibi
    handle.omegaHaloMesh = new THREE.Mesh(haloGeo, haloMat);
    handle.omegaHaloMesh.position.set(0, 0.08, -0.11);
    handle.omegaAuraGroup.add(handle.omegaHaloMesh);

    // 6 Fanned Curved Hydro-Fin Crests flanking the Sovereign's tide mantle (7 children total)
    const finSpecs: ReadonlyArray<{ x: number; y: number; z: number; rz: number; sc: number; phase: number }> = [
      { x: -0.78, y: 0.44, z: -0.05, rz: 0.52, sc: 0.52, phase: 0.0 },
      { x: -0.92, y: 0.06, z: -0.04, rz: 0.92, sc: 0.62, phase: 0.9 },
      { x: -0.82, y: -0.32, z: -0.03, rz: 1.32, sc: 0.54, phase: 1.8 },
      { x: 0.78, y: 0.44, z: -0.05, rz: -0.52, sc: 0.52, phase: 0.45 },
      { x: 0.92, y: 0.06, z: -0.04, rz: -0.92, sc: 0.62, phase: 1.35 },
      { x: 0.82, y: -0.32, z: -0.03, rz: -1.32, sc: 0.54, phase: 2.25 },
    ];
    for (let i = 0; i < finSpecs.length; i++) {
      const fs = finSpecs[i];
      const fm = new THREE.Mesh(finGeo, hydroFinMat);
      fm.position.set(fs.x, fs.y, fs.z);
      fm.rotation.set(0.05, fs.x < 0 ? 0.14 : -0.14, fs.rz);
      fm.scale.set(fs.x < 0 ? fs.sc : -fs.sc, fs.sc, fs.sc);
      handle.omegaAuraGroup.add(fm);
      handle.roninFanKatanas.push({
        mesh: fm,
        baseX: fs.x,
        baseY: fs.y,
        baseZ: fs.z,
        baseRotZ: fs.rz,
        outX: fs.x < 0 ? -0.35 : 0.35,
        outY: 0.45,
        phase: fs.phase,
      });
    }

    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);

    handle.omegaHandPivot = new THREE.Group();
    handle.omegaHandPivot.position.set(0.22, spriteHeight * 0.52, 0.16);
    handle.omegaHandWeaponMat = createEnergyWeaponMaterial();
    handle.omegaHandWeaponMat.uniforms.uColor.value.set('#06b6d4');
    handle.omegaHandWeaponMat.uniforms.uCoreColor.value.set('#ecfeff');
    handle.omegaHandWeaponGeo = createLeviathanHydroFinGeometry();
    handle.omegaHandWeaponMesh = new THREE.Mesh(handle.omegaHandWeaponGeo, handle.omegaHandWeaponMat);
    handle.omegaHandWeaponMesh.scale.setScalar(1.08);
    handle.omegaHandPivot.add(handle.omegaHandWeaponMesh);
    handle.omegaHandPivot.visible = false;
    blitzHeroPivot.add(handle.omegaHandPivot);
    return true;
  }

  if (defId === 'void-asura') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.52, -0.14);
    const haloMat = createVoidAsuraHaloShaderMaterial();
    const clawMat = createVoidAsuraClawShaderMaterial();
    handle.omegaAuraMat = haloMat;
    handle.twinCustomMats.push(clawMat);

    const haloGeo = new THREE.PlaneGeometry(2.85, 2.85);
    const clawGeo = createVoidAsuraClawGeometry();
    const hornGeo = createVoidAsuraObsidianShardGeometry();
    handle.omegaAuraGeo = haloGeo;
    handle.twinCustomGeos.push(clawGeo, hornGeo);

    handle.omegaHaloMesh = new THREE.Mesh(haloGeo, haloMat);
    handle.omegaHaloMesh.position.set(0, 0.1, -0.12);
    handle.omegaAuraGroup.add(handle.omegaHaloMesh);

    const clawSpecs: ReadonlyArray<{ x: number; y: number; z: number; rz: number; sc: number; phase: number }> = [
      { x: -0.78, y: 0.48, z: -0.05, rz: 0.52, sc: 0.54, phase: 0.0 },
      { x: -0.94, y: 0.08, z: -0.04, rz: 0.96, sc: 0.64, phase: 0.8 },
      { x: -0.82, y: -0.32, z: -0.03, rz: 1.38, sc: 0.56, phase: 1.6 },
      { x: 0.78, y: 0.48, z: -0.05, rz: -0.52, sc: 0.54, phase: 0.4 },
      { x: 0.94, y: 0.08, z: -0.04, rz: -0.96, sc: 0.64, phase: 1.2 },
      { x: 0.82, y: -0.32, z: -0.03, rz: -1.38, sc: 0.56, phase: 2.0 },
    ];
    for (let i = 0; i < clawSpecs.length; i++) {
      const cs = clawSpecs[i];
      const cm = new THREE.Mesh(clawGeo, clawMat);
      cm.position.set(cs.x, cs.y, cs.z);
      cm.rotation.set(0.06, cs.x < 0 ? 0.16 : -0.16, cs.rz);
      cm.scale.set(cs.x < 0 ? cs.sc : -cs.sc, cs.sc, cs.sc);
      handle.omegaAuraGroup.add(cm);
      handle.roninFanKatanas.push({
        mesh: cm,
        baseX: cs.x,
        baseY: cs.y,
        baseZ: cs.z,
        baseRotZ: cs.rz,
        outX: Math.sign(cs.x) * 0.75,
        outY: cs.y * 0.48,
        phase: cs.phase,
      });
    }
    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
    return true;
  }

  if (defId === 'null-singularity') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.54, -0.14);
    const haloMat = createNullSingularityHaloShaderMaterial();
    const cardMat = createNullMirrorCardShaderMaterial();
    handle.omegaAuraMat = haloMat;
    handle.twinCustomMats.push(cardMat);

    const haloGeo = new THREE.PlaneGeometry(2.85, 2.85);
    const cardGeo = createNullMirrorCardGeometry();
    const cryGeo = createNullCrystalGeometry();
    handle.omegaAuraGeo = haloGeo;
    handle.twinCustomGeos.push(cardGeo, cryGeo);

    handle.omegaHaloMesh = new THREE.Mesh(haloGeo, haloMat);
    handle.omegaHaloMesh.position.set(0, 0.08, -0.12);
    handle.omegaAuraGroup.add(handle.omegaHaloMesh);

    const cardSpecs: ReadonlyArray<{ x: number; y: number; z: number; rz: number; phase: number }> = [
      { x: -0.92, y: 0.36, z: -0.05, rz: 0.24, phase: 0.0 },
      { x: -0.78, y: -0.26, z: -0.03, rz: -0.18, phase: 1.1 },
      { x: 0.92, y: 0.36, z: -0.05, rz: -0.24, phase: 0.55 },
      { x: 0.78, y: -0.26, z: -0.03, rz: 0.18, phase: 1.65 },
    ];
    for (let i = 0; i < cardSpecs.length; i++) {
      const cs = cardSpecs[i];
      const cm = new THREE.Mesh(cardGeo, cardMat);
      cm.position.set(cs.x, cs.y, cs.z);
      cm.rotation.set(0.08, cs.x < 0 ? 0.22 : -0.22, cs.rz);
      handle.omegaAuraGroup.add(cm);
      handle.roninFanKatanas.push({
        mesh: cm,
        baseX: cs.x,
        baseY: cs.y,
        baseZ: cs.z,
        baseRotZ: cs.rz,
        outX: Math.sign(cs.x) * 0.55,
        outY: cs.y * 0.4,
        phase: cs.phase,
      });
    }
    for (let g = 0; g < 2; g++) {
      const cry = new THREE.Mesh(cryGeo, cardMat);
      cry.position.set(g === 0 ? -0.56 : 0.56, 0.76, -0.06);
      cry.scale.set(0.6, 1.1, 0.6);
      handle.omegaAuraGroup.add(cry);
      handle.twinGearMeshes.push(cry);
    }
    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
    return true;
  }

  if (defId === 'yukikage-twins') {
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
    return true;
  }

  if (defId === 'halcyon-twins') {
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
    return true;
  }

  if (defId === 'lullaby-twins') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const gothicHaloMat = createLullabyPinkAuraShaderMaterial();
    const crownMat = createLullabyMoonCradleShaderMaterial();
    const demonWingMat = createLullabyWingFeatherShaderMaterial(false);
    const angelWingMat = createLullabyWingFeatherShaderMaterial(true);
    handle.omegaAuraMat = crownMat;
    handle.twinCustomMats.push(gothicHaloMat, crownMat, demonWingMat, angelWingMat);

    const discGeo = new THREE.PlaneGeometry(2.08, 2.08);
    const crownGeo = createLullabyMoonCradleArchGeometry();
    const wingPinionGeo = createLullabyWingFeatherGeometry();
    handle.omegaAuraGeo = wingPinionGeo;
    handle.twinCustomGeos.push(discGeo, crownGeo);

    const auraDisc = new THREE.Mesh(discGeo, gothicHaloMat);
    auraDisc.position.set(0, 0.06, -0.10);
    const sanctuaryCrown = new THREE.Mesh(crownGeo, crownMat);
    sanctuaryCrown.scale.setScalar(1.06);
    sanctuaryCrown.position.set(0, 0.08, -0.05);
    handle.omegaAuraGroup.add(auraDisc, sanctuaryCrown);

    // 4 Asymmetric Animated Wings (Left = Black-Ink Sakura Demon Pinions, Right = Porcelain-White Violet Angel Pinions)
    const lullabyWingSpecs: Array<{
      isRight: boolean;
      x: number;
      y: number;
      z: number;
      rz: number;
      sc: number;
    }> = [
      { isRight: false, x: -0.24, y: 0.22, z: -0.02, rz: 0.28, sc: 0.92 },
      { isRight: true, x: 0.24, y: 0.22, z: -0.02, rz: -0.28, sc: 0.92 },
      { isRight: false, x: -0.20, y: -0.04, z: -0.04, rz: 0.62, sc: 0.74 },
      { isRight: true, x: 0.20, y: -0.04, z: -0.04, rz: -0.62, sc: 0.74 },
    ];
    for (const ws of lullabyWingSpecs) {
      const wm = new THREE.Mesh(wingPinionGeo, ws.isRight ? angelWingMat : demonWingMat);
      wm.scale.set(ws.isRight ? ws.sc : -ws.sc, ws.sc, ws.sc);
      wm.position.set(ws.x, ws.y, ws.z);
      wm.rotation.z = ws.rz;
      handle.omegaAuraGroup.add(wm);
      handle.twinWingMeshes.push(wm);
    }

    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
    return true;
  }

  if (defId === 'nocturne-twins') {
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
    return true;
  }

  if (defId === 'clockwork-twins') {
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
    return true;
  }

  if (defId === 'paradox-twins') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const dualHaloMat = createParadoxDualHaloShaderMaterial();
    const goldGearMat = createParadoxGoldGearShaderMaterial();
    const crimsonChainMat = createParadoxCrimsonChainShaderMaterial();
    handle.omegaAuraMat = goldGearMat;
    handle.twinCustomMats.push(dualHaloMat, goldGearMat, crimsonChainMat);

    const haloGeo = new THREE.PlaneGeometry(2.06, 2.06);
    const gearGeo = createParadoxGoldGearGeometry();
    const spikeGeo = createParadoxChainSpikeGeometry();
    handle.twinCustomGeos.push(haloGeo, gearGeo, spikeGeo);

    const haloDisc = new THREE.Mesh(haloGeo, dualHaloMat);
    haloDisc.position.set(0, 0.05, -0.1);
    handle.omegaHaloMesh = haloDisc;
    handle.omegaAuraGroup.add(haloDisc);

    const gearSpecs: Array<{ x: number; y: number; z: number; sc: number }> = [
      { x: -0.56, y: 0.34, z: -0.04, sc: 0.48 },
      { x: -0.62, y: -0.18, z: -0.06, sc: 0.36 },
    ];
    for (const gs of gearSpecs) {
      const gm = new THREE.Mesh(gearGeo, goldGearMat);
      gm.scale.setScalar(gs.sc);
      gm.position.set(gs.x, gs.y, gs.z);
      handle.omegaAuraGroup.add(gm);
      handle.twinGearMeshes.push(gm);
    }

    const spikeAngles = [-0.46, -0.94, 0.52, -1.32];
    for (let i = 0; i < spikeAngles.length; i++) {
      const ang = spikeAngles[i];
      const baseX = -Math.sin(ang) * 0.72;
      const baseY = 0.08 + Math.cos(ang) * 0.52;
      const baseZ = i % 2 === 0 ? -0.02 : -0.05;
      const baseRotZ = ang * 0.88;
      const sm = new THREE.Mesh(spikeGeo, crimsonChainMat);
      sm.position.set(baseX, baseY, baseZ);
      sm.rotation.set(0.04, i % 2 === 0 ? 0.12 : -0.12, baseRotZ);
      sm.scale.setScalar(0.56 - (i % 2) * 0.08);
      handle.omegaAuraGroup.add(sm);
      handle.roninFanKatanas.push({
        mesh: sm,
        baseX,
        baseY,
        baseZ,
        baseRotZ,
        outX: -Math.sin(ang),
        outY: Math.cos(ang),
        phase: i * 0.75,
      });
    }

    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
    return true;
  }

  return false;
}
