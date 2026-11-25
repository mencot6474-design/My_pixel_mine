import * as THREE from 'three';
import type { ChibiRarity } from './ChibiCatalog';
import type { ChibiBackAttachmentHandle } from './ChibiBackAttachments3D';
import {
  createAetherDivineBroadSwordGeometry,
  createAetherSpectrumSwordBackShaderMaterial,
  createAetherSunburstBackHaloShaderMaterial,
  createCheshireCyberBackHaloShaderMaterial,
  createCheshireGlitchClawBackShaderMaterial,
  createCheshireGlitchPixelWingGeometry,
  createChronoCrystallisBrassGearGeometry,
  createChronoCrystallisClockHaloBackShaderMaterial,
  createChronoCrystallisCrystalShardGeometry,
  createChronoCrystallisShardBackShaderMaterial,
  createCommonCompassHaloShaderMaterial,
  createCommonCompassVaneGeometry,
  createCommonVaneShaderMaterial,
  createEpicBoltWingGeometry,
  createEpicBoltWingShaderMaterial,
  createEpicStormHaloShaderMaterial,
  createExoticBiolumeHaloShaderMaterial,
  createExoticHydroOrbGeometry,
  createExoticLeviathanFinGeometry,
  createExoticLeviathanFinShaderMaterial,
  createLegendaryPinionShaderMaterial,
  createLegendarySolarHaloShaderMaterial,
  createLegendarySolarPinionGeometry,
  createLimitedImperialCrownGeometry,
  createLimitedOcularHaloShaderMaterial,
  createLimitedRelicBladeGeometry,
  createLimitedSovereignShaderMaterial,
  createMonochromeCruciformBackShaderMaterial,
  createMonochromeCruciformSwordGeometry,
  createMonochromeSumiBackHaloShaderMaterial,
  createMythicCrescentCrownGeometry,
  createMythicLotusHaloShaderMaterial,
  createMythicQuillWingGeometry,
  createMythicSeraphShaderMaterial,
  createPrismHexagramBackHaloShaderMaterial,
  createPrismIridescentBackShaderMaterial,
  createPrismTriangleCrownHaloGeometry,
  createPrismWingDiamondGeometry,
  createRainbowKaleidoHaloShaderMaterial,
  createRainbowPrismFeatherGeometry,
  createRainbowPrismFeatherShaderMaterial,
  createRareArcaneHaloShaderMaterial,
  createRareCrystalPylonGeometry,
  createRareCrystalPylonShaderMaterial,
  createSecretMonolithNeedleGeometry,
  createSecretMonolithNeedleShaderMaterial,
  createSecretSingularityHaloShaderMaterial,
  createThornBrambleSpikeBladeGeometry,
  createThornGothicBrambleBackShaderMaterial,
  createThornIronWheelBackHaloShaderMaterial,
  createThornSpiritCrownGeometry,
  createUncommonGaleHaloShaderMaterial,
  createUncommonWindFinGeometry,
  createUncommonWindFinShaderMaterial,
} from './MeshFx3D';

type TierBackAttachmentRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'rainbow'
  | 'mythic'
  | 'exotic'
  | 'secret'
  | 'limited';

const TIER_BACK_SCALE: Record<TierBackAttachmentRarity, number> = {
  common: 0.66,
  uncommon: 0.72,
  rare: 0.78,
  epic: 0.84,
  legendary: 0.90,
  rainbow: 0.94,
  mythic: 0.97,
  exotic: 1.00,
  secret: 1.03,
  limited: 1.06,
};

function isTierBackAttachmentRarity(rarity: ChibiRarity | undefined): rarity is TierBackAttachmentRarity {
  return (
    rarity === 'common' ||
    rarity === 'uncommon' ||
    rarity === 'rare' ||
    rarity === 'epic' ||
    rarity === 'legendary' ||
    rarity === 'rainbow' ||
    rarity === 'mythic' ||
    rarity === 'exotic' ||
    rarity === 'secret' ||
    rarity === 'limited'
  );
}

/** Builds Synchro Fusion and tier-scaled (common..limited) 3D Sakuga back-attachments. */
export function buildFusionOrTierBackAttachment(
  handle: ChibiBackAttachmentHandle,
  defId: string,
  spriteHeight: number,
  spritePivot: THREE.Group,
  rarity?: ChibiRarity,
  accentColor?: string
): boolean {
  if (defId === 'glitch-cheshire') {
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
    return true;
  }

  if (defId === 'thorn-maiden') {
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
    return true;
  }

  if (defId === 'monochrome-saint') {
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
    return true;
  }

  if (defId === 'prism-seraph') {
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
    return true;
  }

  if (defId === 'aether-monarch') {
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
    return true;
  }

  if (defId === 'chrono-crystallis') {
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
    const clockHaloMat = createChronoCrystallisClockHaloBackShaderMaterial();
    const crystalBackMat = createChronoCrystallisShardBackShaderMaterial();
    handle.omegaAuraMat = crystalBackMat;
    handle.twinCustomMats.push(clockHaloMat, crystalBackMat);

    const discGeo = new THREE.PlaneGeometry(2.14, 2.14);
    const gearGeo = createChronoCrystallisBrassGearGeometry();
    const shardGeo = createChronoCrystallisCrystalShardGeometry();
    handle.twinCustomGeos.push(discGeo, gearGeo, shardGeo);

    const haloDisc = new THREE.Mesh(discGeo, clockHaloMat);
    haloDisc.position.set(0, 0.05, -0.1);
    handle.omegaHaloMesh = haloDisc;
    handle.omegaAuraGroup.add(haloDisc);

    const gearSpecs: Array<{ x: number; y: number; z: number; sc: number }> = [
      { x: -0.58, y: 0.38, z: -0.04, sc: 0.62 },
      { x: 0.56, y: -0.22, z: -0.05, sc: 0.52 },
    ];
    for (const gs of gearSpecs) {
      const gm = new THREE.Mesh(gearGeo, crystalBackMat);
      gm.scale.setScalar(gs.sc);
      gm.position.set(gs.x, gs.y, gs.z);
      handle.omegaAuraGroup.add(gm);
      handle.twinGearMeshes.push(gm);
    }

    handle.omegaAuraGeo = shardGeo;
    const shardAngles = [0.32, 0.78, 1.24, -0.32, -0.78, -1.24];
    for (let i = 0; i < shardAngles.length; i++) {
      const ang = shardAngles[i];
      const tierIdx = i % 3;
      const rad = 0.68 + (tierIdx % 2) * 0.08;
      const baseX = -Math.sin(ang) * rad * 1.12;
      const baseY = 0.08 + Math.cos(ang) * rad * 0.78;
      const baseZ = tierIdx % 2 === 0 ? -0.02 : -0.05;
      const baseRotZ = ang * 0.92;
      const s = 0.66 - tierIdx * 0.04;

      const sm = new THREE.Mesh(shardGeo, crystalBackMat);
      sm.position.set(baseX, baseY, baseZ);
      sm.rotation.set(0.04, ang > 0 ? -0.12 : 0.12, baseRotZ);
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
        phase: i * 0.72,
      });
    }
    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
    return true;
  }

  if (rarity && isTierBackAttachmentRarity(rarity)) {
    handle.tierRarity = rarity;
    handle.omegaAuraGroup = new THREE.Group();
    handle.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);

    const scaleRoot = new THREE.Group();
    const rootScale = (spriteHeight / 1.95) * TIER_BACK_SCALE[rarity];
    scaleRoot.scale.setScalar(rootScale);
    handle.omegaAuraGroup.add(scaleRoot);

    const accent = accentColor ?? '#ffffff';

    if (rarity === 'common') {
      const haloMat = createCommonCompassHaloShaderMaterial(accent);
      const vaneMat = createCommonVaneShaderMaterial(accent);
      handle.omegaAuraMat = vaneMat;
      handle.twinCustomMats.push(haloMat);

      const discGeo = new THREE.PlaneGeometry(1.78, 1.78);
      handle.twinCustomGeos.push(discGeo);
      const disc = new THREE.Mesh(discGeo, haloMat);
      disc.position.set(0, 0.04, -0.09);
      scaleRoot.add(disc);

      handle.omegaAuraGeo = createCommonCompassVaneGeometry();
      for (const sx of [-1, 1]) {
        const vane = new THREE.Mesh(handle.omegaAuraGeo, vaneMat);
        const bx = sx * 0.56;
        const by = 0.08;
        const bz = -0.03;
        const brz = sx * -0.48;
        vane.position.set(bx, by, bz);
        vane.rotation.set(0.05, sx * -0.12, brz);
        vane.scale.setScalar(0.56);
        scaleRoot.add(vane);
        handle.roninFanKatanas.push({
          mesh: vane,
          baseX: bx,
          baseY: by,
          baseZ: bz,
          baseRotZ: brz,
          outX: sx * 0.45,
          outY: 0.45,
          phase: sx > 0 ? 0.0 : 0.7,
        });
      }
    } else if (rarity === 'uncommon') {
      const haloMat = createUncommonGaleHaloShaderMaterial(accent);
      const finMat = createUncommonWindFinShaderMaterial(accent);
      handle.omegaAuraMat = finMat;
      handle.twinCustomMats.push(haloMat);

      const discGeo = new THREE.PlaneGeometry(1.84, 1.84);
      handle.twinCustomGeos.push(discGeo);
      const disc = new THREE.Mesh(discGeo, haloMat);
      disc.position.set(0, 0.04, -0.09);
      scaleRoot.add(disc);

      handle.omegaAuraGeo = createUncommonWindFinGeometry();
      for (const sx of [-1, 1]) {
        const fin = new THREE.Mesh(handle.omegaAuraGeo, finMat);
        fin.position.set(sx * 0.42, 0.06, -0.025);
        fin.rotation.set(0.04, sx * -0.14, sx * -0.34);
        fin.scale.set(sx * 0.72, 0.72, 0.72);
        scaleRoot.add(fin);
        handle.twinWingMeshes.push(fin);
      }
    } else if (rarity === 'rare') {
      const haloMat = createRareArcaneHaloShaderMaterial(accent);
      const pylonMat = createRareCrystalPylonShaderMaterial(accent);
      handle.omegaAuraMat = pylonMat;
      handle.twinCustomMats.push(haloMat);

      const discGeo = new THREE.PlaneGeometry(1.88, 1.88);
      handle.twinCustomGeos.push(discGeo);
      const disc = new THREE.Mesh(discGeo, haloMat);
      disc.position.set(0, 0.04, -0.09);
      scaleRoot.add(disc);

      handle.omegaAuraGeo = createRareCrystalPylonGeometry();
      for (const sx of [-1, 1]) {
        const pylon = new THREE.Mesh(handle.omegaAuraGeo, pylonMat);
        const bx = sx * 0.66;
        const by = 0.14;
        const bz = -0.03;
        const brz = sx * -0.16;
        pylon.position.set(bx, by, bz);
        pylon.rotation.z = brz;
        pylon.scale.setScalar(0.76);
        scaleRoot.add(pylon);
        handle.roninFanKatanas.push({
          mesh: pylon,
          baseX: bx,
          baseY: by,
          baseZ: bz,
          baseRotZ: brz,
          outX: sx * 0.35,
          outY: 0.75,
          phase: sx > 0 ? 0.0 : 1.4,
        });
      }
    } else if (rarity === 'epic') {
      const haloMat = createEpicStormHaloShaderMaterial(accent);
      const boltMat = createEpicBoltWingShaderMaterial(accent);
      handle.omegaAuraMat = boltMat;
      handle.twinCustomMats.push(haloMat);

      const discGeo = new THREE.PlaneGeometry(1.94, 1.94);
      handle.twinCustomGeos.push(discGeo);
      const disc = new THREE.Mesh(discGeo, haloMat);
      disc.position.set(0, 0.04, -0.09);
      scaleRoot.add(disc);

      handle.omegaAuraGeo = createEpicBoltWingGeometry();
      const stormSpecs: ReadonlyArray<{ sx: number; x: number; y: number; z: number; rz: number; sc: number; ph: number }> = [
        { sx: -1, x: -0.62, y: 0.28, z: -0.02, rz: 0.58, sc: 0.72, ph: 0.0 },
        { sx: 1, x: 0.62, y: 0.28, z: -0.02, rz: -0.58, sc: 0.72, ph: 0.5 },
        { sx: -1, x: -0.54, y: -0.14, z: -0.04, rz: 1.08, sc: 0.58, ph: 1.1 },
        { sx: 1, x: 0.54, y: -0.14, z: -0.04, rz: -1.08, sc: 0.58, ph: 1.6 },
      ];
      for (const sp of stormSpecs) {
        const bm = new THREE.Mesh(handle.omegaAuraGeo, boltMat);
        bm.position.set(sp.x, sp.y, sp.z);
        bm.rotation.set(0.05, sp.sx * -0.12, sp.rz);
        bm.scale.set(sp.sx * sp.sc, sp.sc, sp.sc);
        scaleRoot.add(bm);
        handle.roninFanKatanas.push({
          mesh: bm,
          baseX: sp.x,
          baseY: sp.y,
          baseZ: sp.z,
          baseRotZ: sp.rz,
          outX: sp.sx * 0.65,
          outY: sp.y > 0 ? 0.55 : -0.25,
          phase: sp.ph,
        });
      }
    } else if (rarity === 'legendary') {
      const haloMat = createLegendarySolarHaloShaderMaterial(accent);
      const pinionMat = createLegendaryPinionShaderMaterial(accent);
      handle.omegaAuraMat = pinionMat;
      handle.twinCustomMats.push(haloMat);

      const discGeo = new THREE.PlaneGeometry(2.02, 2.02);
      handle.twinCustomGeos.push(discGeo);
      const disc = new THREE.Mesh(discGeo, haloMat);
      disc.position.set(0, 0.05, -0.10);
      scaleRoot.add(disc);

      handle.omegaAuraGeo = createLegendarySolarPinionGeometry();
      const solarAngles = [0.42, 0.96, -0.42, -0.96];
      for (let i = 0; i < solarAngles.length; i++) {
        const ang = solarAngles[i];
        const isLeft = ang > 0;
        const tierIdx = i % 2;
        const rad = 0.66 + tierIdx * 0.12;
        const bx = -Math.sin(ang) * rad * 1.10;
        const by = 0.06 + Math.cos(ang) * rad * 0.76;
        const bz = tierIdx === 0 ? -0.02 : -0.045;
        const brz = ang * 0.92;
        const sc = tierIdx === 0 ? 0.78 : 0.64;

        const pm = new THREE.Mesh(handle.omegaAuraGeo, pinionMat);
        pm.position.set(bx, by, bz);
        pm.rotation.set(0.05, isLeft ? -0.14 : 0.14, brz);
        pm.scale.set(isLeft ? -sc : sc, sc, sc);
        scaleRoot.add(pm);
        handle.roninFanKatanas.push({
          mesh: pm,
          baseX: bx,
          baseY: by,
          baseZ: bz,
          baseRotZ: brz,
          outX: -Math.sin(ang),
          outY: Math.cos(ang),
          phase: tierIdx * 0.8 + (isLeft ? 0 : 0.4),
        });
      }
    } else if (rarity === 'rainbow') {
      const haloMat = createRainbowKaleidoHaloShaderMaterial(accent);
      const featherMat = createRainbowPrismFeatherShaderMaterial(accent);
      handle.omegaAuraMat = featherMat;
      handle.twinCustomMats.push(haloMat);

      const discGeo = new THREE.PlaneGeometry(2.00, 2.00);
      handle.twinCustomGeos.push(discGeo);
      const disc = new THREE.Mesh(discGeo, haloMat);
      disc.position.set(0, 0.05, -0.09);
      scaleRoot.add(disc);

      handle.omegaAuraGeo = createRainbowPrismFeatherGeometry();
      const wingSpecs: ReadonlyArray<{ sx: number; x: number; y: number; z: number; rz: number; sc: number }> = [
        { sx: -1, x: -0.46, y: 0.24, z: -0.02, rz: 0.42, sc: 0.76 },
        { sx: 1, x: 0.46, y: 0.24, z: -0.02, rz: -0.42, sc: 0.76 },
        { sx: -1, x: -0.40, y: -0.14, z: -0.04, rz: 1.04, sc: 0.60 },
        { sx: 1, x: 0.40, y: -0.14, z: -0.04, rz: -1.04, sc: 0.60 },
      ];
      for (const ws of wingSpecs) {
        const wm = new THREE.Mesh(handle.omegaAuraGeo, featherMat);
        wm.position.set(ws.x, ws.y, ws.z);
        wm.rotation.z = ws.rz;
        wm.scale.set(ws.sx * ws.sc, ws.sc, ws.sc);
        scaleRoot.add(wm);
        handle.twinWingMeshes.push(wm);
      }
    } else if (rarity === 'mythic') {
      const haloMat = createMythicLotusHaloShaderMaterial(accent);
      const seraphMat = createMythicSeraphShaderMaterial(accent);
      handle.omegaAuraMat = seraphMat;
      handle.twinCustomMats.push(haloMat);

      const discGeo = new THREE.PlaneGeometry(2.04, 2.04);
      const crownGeo = createMythicCrescentCrownGeometry();
      handle.twinCustomGeos.push(discGeo, crownGeo);
      const disc = new THREE.Mesh(discGeo, haloMat);
      disc.position.set(0, 0.05, -0.09);
      scaleRoot.add(disc);

      const crown = new THREE.Mesh(crownGeo, seraphMat);
      crown.position.set(0, 0.42, -0.03);
      crown.scale.setScalar(0.86);
      scaleRoot.add(crown);
      handle.omegaHaloMesh = crown;

      handle.omegaAuraGeo = createMythicQuillWingGeometry();
      const quillSpecs: ReadonlyArray<{ sx: number; x: number; y: number; z: number; rz: number; sc: number }> = [
        { sx: -1, x: -0.42, y: 0.20, z: -0.02, rz: 0.36, sc: 0.80 },
        { sx: 1, x: 0.42, y: 0.20, z: -0.02, rz: -0.36, sc: 0.80 },
        { sx: -1, x: -0.38, y: -0.16, z: -0.04, rz: 0.96, sc: 0.64 },
        { sx: 1, x: 0.38, y: -0.16, z: -0.04, rz: -0.96, sc: 0.64 },
      ];
      for (const qs of quillSpecs) {
        const qm = new THREE.Mesh(handle.omegaAuraGeo, seraphMat);
        qm.position.set(qs.x, qs.y, qs.z);
        qm.rotation.z = qs.rz;
        qm.scale.set(qs.sx * qs.sc, qs.sc, qs.sc);
        scaleRoot.add(qm);
        handle.twinWingMeshes.push(qm);
      }
    } else if (rarity === 'exotic') {
      const haloMat = createExoticBiolumeHaloShaderMaterial(accent);
      const finMat = createExoticLeviathanFinShaderMaterial(accent);
      handle.omegaAuraMat = finMat;
      handle.twinCustomMats.push(haloMat);

      const discGeo = new THREE.PlaneGeometry(2.06, 2.06);
      const orbGeo = createExoticHydroOrbGeometry();
      handle.twinCustomGeos.push(discGeo, orbGeo);
      const disc = new THREE.Mesh(discGeo, haloMat);
      disc.position.set(0, 0.05, -0.095);
      scaleRoot.add(disc);

      handle.omegaAuraGeo = createExoticLeviathanFinGeometry();
      const finAngles = [0.48, 1.02, -0.48, -1.02];
      for (let i = 0; i < finAngles.length; i++) {
        const ang = finAngles[i];
        const isLeft = ang > 0;
        const tierIdx = i % 2;
        const rad = 0.64 + tierIdx * 0.12;
        const bx = -Math.sin(ang) * rad * 1.12;
        const by = 0.04 + Math.cos(ang) * rad * 0.74;
        const bz = tierIdx === 0 ? -0.02 : -0.045;
        const brz = ang * 0.90;
        const sc = tierIdx === 0 ? 0.78 : 0.64;

        const fm = new THREE.Mesh(handle.omegaAuraGeo, finMat);
        fm.position.set(bx, by, bz);
        fm.rotation.set(0.05, isLeft ? -0.14 : 0.14, brz);
        fm.scale.set(isLeft ? -sc : sc, sc, sc);
        scaleRoot.add(fm);
        handle.roninFanKatanas.push({
          mesh: fm,
          baseX: bx,
          baseY: by,
          baseZ: bz,
          baseRotZ: brz,
          outX: -Math.sin(ang),
          outY: Math.cos(ang),
          phase: tierIdx * 0.9 + (isLeft ? 0 : 0.45),
        });
      }

      for (const sx of [-1, 1]) {
        const orb = new THREE.Mesh(orbGeo, finMat);
        orb.position.set(sx * 0.80, 0.42, -0.02);
        orb.scale.setScalar(0.86);
        scaleRoot.add(orb);
        handle.twinGearMeshes.push(orb);
      }
    } else if (rarity === 'secret') {
      const haloMat = createSecretSingularityHaloShaderMaterial(accent);
      const needleMat = createSecretMonolithNeedleShaderMaterial(accent);
      handle.omegaAuraMat = needleMat;
      handle.twinCustomMats.push(haloMat);

      const discGeo = new THREE.PlaneGeometry(2.10, 2.10);
      handle.twinCustomGeos.push(discGeo);
      const disc = new THREE.Mesh(discGeo, haloMat);
      disc.position.set(0, 0.05, -0.10);
      scaleRoot.add(disc);

      handle.omegaAuraGeo = createSecretMonolithNeedleGeometry();
      const needleAngles = [0.34, 0.76, 1.18, -0.34, -0.76, -1.18];
      for (let i = 0; i < needleAngles.length; i++) {
        const ang = needleAngles[i];
        const isLeft = ang > 0;
        const tierIdx = i % 3;
        const rad = 0.68 + (tierIdx % 2) * 0.10;
        const bx = -Math.sin(ang) * rad * 1.14;
        const by = 0.06 + Math.cos(ang) * rad * 0.80;
        const bz = tierIdx % 2 === 0 ? -0.02 : -0.045;
        const brz = ang * 0.94;
        const sc = 0.64 - tierIdx * 0.04;

        const nm = new THREE.Mesh(handle.omegaAuraGeo, needleMat);
        nm.position.set(bx, by, bz);
        nm.rotation.set(0.05, isLeft ? -0.12 : 0.12, brz);
        nm.scale.setScalar(sc);
        scaleRoot.add(nm);
        handle.roninFanKatanas.push({
          mesh: nm,
          baseX: bx,
          baseY: by,
          baseZ: bz,
          baseRotZ: brz,
          outX: -Math.sin(ang),
          outY: Math.cos(ang),
          phase: tierIdx * 0.85 + (isLeft ? 0 : 0.45),
        });
      }
    } else if (rarity === 'limited') {
      const haloMat = createLimitedOcularHaloShaderMaterial(accent);
      const sovMat = createLimitedSovereignShaderMaterial(accent);
      handle.omegaAuraMat = sovMat;
      handle.twinCustomMats.push(haloMat);

      const discGeo = new THREE.PlaneGeometry(2.16, 2.16);
      const crownGeo = createLimitedImperialCrownGeometry();
      handle.twinCustomGeos.push(discGeo, crownGeo);
      const disc = new THREE.Mesh(discGeo, haloMat);
      disc.position.set(0, 0.05, -0.10);
      scaleRoot.add(disc);

      const crown = new THREE.Mesh(crownGeo, sovMat);
      crown.position.set(0, 0.44, -0.03);
      crown.scale.setScalar(0.88);
      scaleRoot.add(crown);
      handle.omegaHaloMesh = crown;

      handle.omegaAuraGeo = createLimitedRelicBladeGeometry();
      const relicAngles = [0.34, 0.74, 1.14, -0.34, -0.74, -1.14];
      for (let i = 0; i < relicAngles.length; i++) {
        const ang = relicAngles[i];
        const isLeft = ang > 0;
        const tierIdx = i % 3;
        const rad = 0.68 + (tierIdx % 2) * 0.10;
        const bx = -Math.sin(ang) * rad * 1.14;
        const by = 0.06 + Math.cos(ang) * rad * 0.82;
        const bz = tierIdx % 2 === 0 ? -0.02 : -0.05;
        const brz = ang * 0.94;
        const sc = 0.64 - tierIdx * 0.03;

        const rm = new THREE.Mesh(handle.omegaAuraGeo, sovMat);
        rm.position.set(bx, by, bz);
        rm.rotation.set(0.05, isLeft ? -0.12 : 0.12, brz);
        rm.scale.setScalar(sc);
        scaleRoot.add(rm);
        handle.roninFanKatanas.push({
          mesh: rm,
          baseX: bx,
          baseY: by,
          baseZ: bz,
          baseRotZ: brz,
          outX: -Math.sin(ang),
          outY: Math.cos(ang),
          phase: tierIdx * 0.75 + (isLeft ? 0 : 0.35),
        });
      }
    }

    handle.omegaAuraGroup.visible = true;
    spritePivot.add(handle.omegaAuraGroup);
    return true;
  }

  return false;
}
