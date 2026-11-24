import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import type { ChibiAnimState, ChibiDef, ChibiRarity } from './ChibiCatalog';
import { applySharpSpriteTexture } from './MeshHelpers3D';
import {
  createAbyssalGreatswordGeometry,
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
  createClockworkChronoChassisShaderMaterial,
  createClockworkDialShaderMaterial,
  createClockworkGearGeometry,
  createClockworkScytheHandGeometry,
  createCommonCompassHaloShaderMaterial,
  createCommonCompassVaneGeometry,
  createCommonVaneShaderMaterial,
  createCrimsonKatanaShaderMaterial,
  createCrimsonTsubaHaloShaderMaterial,
  createEnergyWeaponMaterial,
  createEpicBoltWingGeometry,
  createEpicBoltWingShaderMaterial,
  createEpicStormHaloShaderMaterial,
  createExoticBiolumeHaloShaderMaterial,
  createExoticHydroOrbGeometry,
  createExoticLeviathanFinGeometry,
  createExoticLeviathanFinShaderMaterial,
  createHalcyonMechanicalWingBladeGeometry,
  createHalcyonRailBowGeometry,
  createHalcyonRailBowShaderMaterial,
  createHalcyonValkyrieHaloShaderMaterial,
  createLegendaryPinionShaderMaterial,
  createLegendarySolarHaloShaderMaterial,
  createLegendarySolarPinionGeometry,
  createLimitedImperialCrownGeometry,
  createLimitedOcularHaloShaderMaterial,
  createLimitedRelicBladeGeometry,
  createLimitedSovereignShaderMaterial,
  createLullabyMoonCradleArchGeometry,
  createLullabyMoonCradleShaderMaterial,
  createLullabyPinkAuraShaderMaterial,
  createLullabyWingFeatherGeometry,
  createLullabyWingFeatherShaderMaterial,
  createMonochromeCruciformBackShaderMaterial,
  createMonochromeCruciformSwordGeometry,
  createMonochromeSumiBackHaloShaderMaterial,
  createMythicCrescentCrownGeometry,
  createMythicLotusHaloShaderMaterial,
  createMythicQuillWingGeometry,
  createMythicSeraphShaderMaterial,
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
  createRainbowKaleidoHaloShaderMaterial,
  createRainbowPrismFeatherGeometry,
  createRainbowPrismFeatherShaderMaterial,
  createRareArcaneHaloShaderMaterial,
  createRareCrystalPylonGeometry,
  createRareCrystalPylonShaderMaterial,
  createRoninKatanaGeometry,
  createSecretMonolithNeedleGeometry,
  createSecretMonolithNeedleShaderMaterial,
  createSecretSingularityHaloShaderMaterial,
  createSpikedHaloGeometry,
  createThornBrambleSpikeBladeGeometry,
  createThornGothicBrambleBackShaderMaterial,
  createThornIronWheelBackHaloShaderMaterial,
  createThornSpiritCrownGeometry,
  createUncommonGaleHaloShaderMaterial,
  createUncommonWindFinGeometry,
  createUncommonWindFinShaderMaterial,
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
  tierRarity: ChibiRarity | null;
}

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

export function createChibiBackAttachments(
  defId: string,
  spriteHeight: number,
  spritePivot: THREE.Group,
  blitzHeroPivot: THREE.Group,
  rarity?: ChibiRarity,
  accentColor?: string
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
    tierRarity: null,
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
  } else if (defId === 'abyssal-leviathan') {
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
  } else if (defId === 'void-asura') {
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
  } else if (defId === 'null-singularity') {
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
  } else if (defId === 'paradox-twins') {
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
  } else if (defId === 'chrono-crystallis') {
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
  } else if (rarity && isTierBackAttachmentRarity(rarity)) {
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
    const isCheshire = defId === 'glitch-cheshire' || defId === 'null-singularity';
    const isMonochrome = defId === 'monochrome-saint';
    const isObsidianMonolith = defId === 'obsidian-sovereign' || defId === 'void-asura';
    const isLeviathanTide = defId === 'abyssal-leviathan';
    const isEpicTier = handle.tierRarity === 'epic';
    const isSecretTier = handle.tierRarity === 'secret';
    const isRareTier = handle.tierRarity === 'rare';
    const isCommonTier = handle.tierRarity === 'common';
    for (let k = 0; k < handle.roninFanKatanas.length; k++) {
      const slot = handle.roninFanKatanas[k];
      const hover = Math.sin(elapsed * (isCommonTier ? 1.9 : isLeviathanTide ? 2.2 : 2.4) + slot.phase);
      const expand = Math.sin(elapsed * 1.8 + slot.phase) * (isCommonTier ? 0.018 : isLeviathanTide ? 0.044 : 0.032);
      const glitchJump =
        isCheshire && Math.sin(elapsed * 19.0 + k * 2.7) > 0.86
          ? (k % 2 === 0 ? 1 : -1) * 0.042
          : 0;
      const epicSnap =
        isEpicTier && Math.sin(elapsed * 22.0 + k * 2.3) > 0.90
          ? (k % 2 === 0 ? 1 : -1) * 0.026
          : 0;
      const monolithTremor =
        isObsidianMonolith || isSecretTier
          ? Math.sin(elapsed * 26.0 + k * 3.1) * 0.007
          : 0;
      slot.mesh.position.set(
        slot.baseX + slot.outX * expand + glitchJump + epicSnap + monolithTremor,
        slot.baseY + hover * (isObsidianMonolith ? 0.068 : isLeviathanTide ? 0.056 : isCommonTier ? 0.024 : 0.044) + slot.outY * expand,
        slot.baseZ
      );
      slot.mesh.rotation.z = isMonochrome
        ? Math.sin(elapsed * 1.4 + slot.phase) * 0.014
        : slot.baseRotZ + Math.sin(elapsed * 1.6 + slot.phase) * (isCommonTier ? 0.018 : isLeviathanTide ? 0.048 : 0.034);
      if (isRareTier) {
        slot.mesh.rotation.y = elapsed * (k % 2 === 0 ? 0.85 : -0.85);
      }
    }
    if (handle.omegaHaloMesh) {
      if (defId === 'obsidian-sovereign') {
        handle.omegaHaloMesh.position.y = 0.14 + Math.sin(elapsed * 2.1) * 0.022;
        handle.omegaHaloMesh.rotation.z = Math.sin(elapsed * 1.5) * 0.032;
      } else if (defId === 'abyssal-leviathan') {
        handle.omegaHaloMesh.position.y = 0.08 + Math.sin(elapsed * 2.0) * 0.024;
        handle.omegaHaloMesh.rotation.z = elapsed * 0.42;
      } else if (defId === 'yukikage-twins') {
        handle.omegaHaloMesh.position.y = 0.26 + Math.sin(elapsed * 2.2) * 0.024;
        handle.omegaHaloMesh.rotation.set(0, 0, elapsed * 0.55);
      } else if (handle.tierRarity === 'limited') {
        handle.omegaHaloMesh.position.y = 0.44 + Math.sin(elapsed * 2.0) * 0.026;
        handle.omegaHaloMesh.rotation.z = Math.sin(elapsed * 1.4) * 0.028;
      } else {
        handle.omegaHaloMesh.rotation.z = elapsed * 0.45;
      }
    }
    if ((handle.tierRarity === 'exotic' || defId === 'paradox-twins' || defId === 'chrono-crystallis') && handle.twinGearMeshes.length >= 2) {
      for (let g = 0; g < handle.twinGearMeshes.length; g++) {
        if (defId === 'paradox-twins' || defId === 'chrono-crystallis') {
          handle.twinGearMeshes[g].rotation.z = elapsed * (g % 2 === 0 ? 1 : -1) * (2.6 + g * 0.9);
        } else {
          handle.twinGearMeshes[g].position.y = 0.42 + Math.sin(elapsed * 2.6 + g * 1.5) * 0.04;
          handle.twinGearMeshes[g].rotation.y = elapsed * (g % 2 === 0 ? 1.4 : -1.4);
        }
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
    const isUncommon = handle.tierRarity === 'uncommon';
    const isMythic = handle.tierRarity === 'mythic';
    const isLullaby = defId === 'lullaby-twins';
    const flapSpeed = isUncommon ? 6.0 : isLullaby ? 6.2 : isMythic ? 7.5 : 10.5;
    const flapAmp = isUncommon ? 0.10 : isLullaby ? 0.16 : isMythic ? 0.14 : 0.18;
    const flap = Math.sin(elapsed * flapSpeed) * flapAmp;
    handle.twinWingMeshes[0].rotation.y = -0.14 + flap;
    handle.twinWingMeshes[1].rotation.y = 0.14 - flap;
    if (handle.twinWingMeshes.length >= 4) {
      const subFlap = Math.sin(elapsed * flapSpeed - 0.55) * (flapAmp * 0.8);
      handle.twinWingMeshes[2].rotation.y = -0.10 + subFlap;
      handle.twinWingMeshes[3].rotation.y = 0.10 - subFlap;
    }
    if (handle.twinWingMeshes.length >= 6) {
      const thirdFlap = Math.sin(elapsed * flapSpeed - 1.1) * (flapAmp * 0.7);
      handle.twinWingMeshes[4].rotation.y = -0.08 + thirdFlap;
      handle.twinWingMeshes[5].rotation.y = 0.08 - thirdFlap;
    }
    if (handle.omegaHaloMesh && defId === 'prism-seraph') {
      handle.omegaHaloMesh.position.y = 0.56 + Math.sin(elapsed * 2.6) * 0.032;
      handle.omegaHaloMesh.rotation.z = -0.18 + Math.sin(elapsed * 1.8) * 0.045;
    } else if (handle.omegaHaloMesh && isMythic) {
      handle.omegaHaloMesh.position.y = 0.42 + Math.sin(elapsed * 2.0) * 0.024;
      handle.omegaHaloMesh.rotation.z = Math.sin(elapsed * 1.3) * 0.024;
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
