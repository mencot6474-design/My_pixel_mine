import * as THREE from 'three';
import { ENCHANTS } from '../game/GameData';
import {
  AltarClockDialParts,
  AltarClockHandParts,
  AltarParticleSystem,
  createAltarClockDial,
  createAltarClockHand,
  createAltarSubHand,
} from './AltarSpinFx3D';
import { EnchantBillboard2D } from './AuraModels3D';
import { createCyberCrystalCluster, createCyberMonolithForkFinial, disposeCyberProp } from './CyberProps3D';
import { HellAltarEyeController } from './HellAltarEye3D';
import {
  createAnimeAuraShaderMaterial,
  createAnimeParticlePoints,
  ENCHANT_SECONDARY_COLOR,
  getEnchantSigilTexture,
  getPedestalHoloRingTexture,
} from './PlotAuraFx3D';

export interface AltarPedestalEntry {
  id: string;
  group: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
  holoDiscMat: THREE.MeshBasicMaterial;
  sigilMesh: THREE.Mesh;
  sigilMat: THREE.MeshBasicMaterial;
  auraVeilMat: THREE.ShaderMaterial;
  auraOuterVeilMat: THREE.ShaderMaterial;
  particleMat: THREE.ShaderMaterial;
  conduitMat: THREE.MeshBasicMaterial;
  conduitPulses: THREE.Mesh[];
  curLift: number;
  prop: THREE.Object3D;
  billboard: EnchantBillboard2D;
  baseY: number;
  needleAngle: number;
  worldX: number;
  worldZ: number;
  anchorLocal: THREE.Vector3;
}

export interface AltarFloatingIslandEntry {
  group: THREE.Group;
  baseY: number;
  phase: number;
  bobSpeed: number;
}

function createAltarChamferPadGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevel = 0.014
): THREE.ExtrudeGeometry {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const c = Math.min(chamfer, hw * 0.42, hd * 0.42);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + c, -hd);
  shape.lineTo(hw - c, -hd);
  shape.lineTo(hw, -hd + c);
  shape.lineTo(hw, hd - c);
  shape.lineTo(hw - c, hd);
  shape.lineTo(-hw + c, hd);
  shape.lineTo(-hw, hd - c);
  shape.lineTo(-hw, -hd + c);
  shape.closePath();
  const innerH = Math.max(0.015, height - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerH,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  geo.computeVertexNormals();
  return geo;
}

function createAltarPodiumPlaqueTexture(label: string, accentHex: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#09111f';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, c.width - 6, c.height - 6);
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.28;
  ctx.fillRect(8, 12, 6, 24);
  ctx.fillRect(c.width - 14, 12, 6, 24);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 20px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, c.width * 0.5, c.height * 0.52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}


export interface EnchantAltarBuildCtx {
  altarGroup: THREE.Group;
  altarPedestals: AltarPedestalEntry[];
  floatingShards: THREE.Mesh[];
  floatingIslands: AltarFloatingIslandEntry[];
  ownedAltarTextures: THREE.Texture[];
  customAltarDisposers: Array<() => void>;
  altarParticles: AltarParticleSystem;
  hellEye: HellAltarEyeController;
}

export function buildEnchantAltarRoom(ctx: EnchantAltarBuildCtx): {
  clockDial: AltarClockDialParts;
  clockHand: AltarClockHandParts;
  clockSubHand: THREE.Group;
  outerEllipseMat: THREE.MeshBasicMaterial;
  needleAngle: number;
} {
    const armorDarkMat = new THREE.MeshStandardMaterial({
      color: '#131b2b',
      roughness: 0.52,
      metalness: 0.44,
      flatShading: true,
    });
    const armorSteelMat = new THREE.MeshStandardMaterial({
      color: '#1e2c44',
      roughness: 0.42,
      metalness: 0.52,
      flatShading: true,
    });
    const brightSteelMat = new THREE.MeshStandardMaterial({
      color: '#354764',
      roughness: 0.3,
      metalness: 0.62,
      flatShading: true,
    });
    const centerNeonVioletMat = new THREE.MeshStandardMaterial({
      color: '#c084fc',
      emissive: '#a855f7',
      emissiveIntensity: 1.25,
      roughness: 0.24,
      metalness: 0.45,
      flatShading: true,
    });
    const centerNeonCyanMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#22d3ee',
      emissiveIntensity: 1.15,
      roughness: 0.24,
      metalness: 0.45,
      flatShading: true,
    });

    // Center ZZZ/HSR Cyber-Chrono Core Podium supporting the Altar Clock Dial at (0, 0.28, -2.4)
    const centerPodiumGroup = new THREE.Group();
    centerPodiumGroup.position.set(0, 0, -2.4);
    const centerDockBay = new THREE.Mesh(
      createAltarChamferPadGeometry(3.48, 0.16, 3.48, 0.72, 0.018),
      armorDarkMat
    );
    centerDockBay.position.y = 0.04;
    centerDockBay.castShadow = true;
    centerDockBay.receiveShadow = true;
    const centerMachineryPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.56, 1.72, 0.14, 8),
      armorSteelMat
    );
    centerMachineryPlinth.position.y = 0.21;
    centerMachineryPlinth.rotation.y = Math.PI / 8;
    centerMachineryPlinth.castShadow = true;
    centerMachineryPlinth.receiveShadow = true;
    const centerSeamStrip = new THREE.Mesh(
      new THREE.CylinderGeometry(1.74, 1.76, 0.032, 8),
      centerNeonVioletMat
    );
    centerSeamStrip.position.y = 0.15;
    centerSeamStrip.rotation.y = Math.PI / 8;
    const centerUnderCone = new THREE.Mesh(
      new THREE.CylinderGeometry(1.48, 0.64, 1.08, 8),
      armorDarkMat
    );
    centerUnderCone.position.y = -0.5;
    centerUnderCone.rotation.y = Math.PI / 8;
    centerUnderCone.castShadow = true;
    const centerThrusterRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.045, 6, 8),
      centerNeonCyanMat
    );
    centerThrusterRing.rotation.x = Math.PI / 2;
    centerThrusterRing.rotation.z = Math.PI / 8;
    centerThrusterRing.position.y = -0.98;
    centerPodiumGroup.add(
      centerDockBay,
      centerMachineryPlinth,
      centerSeamStrip,
      centerUnderCone,
      centerThrusterRing
    );
    const centerFinGeo = new THREE.BoxGeometry(0.14, 0.82, 0.48);
    for (let f = 0; f < 4; f++) {
      const fa = (f * Math.PI) / 2 + Math.PI / 4;
      const fin = new THREE.Mesh(centerFinGeo, brightSteelMat);
      fin.position.set(Math.cos(fa) * 1.15, -0.44, Math.sin(fa) * 1.15);
      fin.rotation.y = -fa + Math.PI / 2;
      centerPodiumGroup.add(fin);
    }
    ctx.altarGroup.add(centerPodiumGroup);

    // Outer Elliptical Synchro Ring linking all 10 Enchant Podiums in space (flat horizontal plane)
    const outerEllipseMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerEllipseRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.008, 6, 64),
      outerEllipseMat
    );
    outerEllipseRing.rotation.x = Math.PI / 2;
    outerEllipseRing.scale.set(5.4, 3.9, 1);
    outerEllipseRing.position.set(0, 0.12, -2.4);
    ctx.altarGroup.add(outerEllipseRing);

    // Shared ZZZ/HSR Cyber-Showcase Podium geometries for the 10 Enchant Pedestals
    const bayDockGeo = createAltarChamferPadGeometry(1.88, 0.095, 1.62, 0.34, 0.015);
    const guardGeo = createAltarChamferPadGeometry(0.14, 0.11, 1.04, 0.04, 0.012);
    const ventGeo = new THREE.BoxGeometry(0.04, 0.06, 0.16);
    const edgeSeamGeo = new THREE.CylinderGeometry(0.79, 0.81, 0.024, 8);
    const plinthGeo = new THREE.CylinderGeometry(0.68, 0.78, 0.128, 8);
    const topRimGeo = new THREE.CylinderGeometry(0.63, 0.69, 0.036, 8);
    const frontApronGeo = createAltarChamferPadGeometry(0.58, 0.095, 0.24, 0.05, 0.012);
    const plaqueFaceGeo = new THREE.PlaneGeometry(0.44, 0.16);
    const rearManifoldGeo = createAltarChamferPadGeometry(1.18, 0.18, 0.26, 0.08, 0.014);
    const manifoldGlowGeo = createAltarChamferPadGeometry(0.84, 0.035, 0.06, 0.01, 0.006);
    const stanchionGeo = createAltarChamferPadGeometry(0.14, 0.56, 0.18, 0.03, 0.012);
    const stanchionCapGeo = createAltarChamferPadGeometry(0.18, 0.06, 0.22, 0.04, 0.01);
    const stanchionBladeGeo = new THREE.BoxGeometry(0.035, 0.44, 0.045);
    const ringTorusGeo = new THREE.TorusGeometry(0.59, 0.025, 6, 8);
    const clawGeo = new THREE.CylinderGeometry(0.04, 0.056, 0.072, 6);
    const diodeGeo = new THREE.CylinderGeometry(0.024, 0.028, 0.028, 6);
    const underHullGeo = new THREE.CylinderGeometry(0.74, 0.34, 0.56, 8);
    const underFinGeo = new THREE.BoxGeometry(0.08, 0.44, 0.28);
    const underThrusterRingGeo = new THREE.TorusGeometry(0.42, 0.028, 6, 8);
    const conduitBeamGeo = new THREE.CylinderGeometry(0.028, 0.028, 1, 6);
    const conduitPulseGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const pedHoloTex = getPedestalHoloRingTexture();
    const holoLensGeo = pedHoloTex
      ? new THREE.PlaneGeometry(1.18, 1.18)
      : new THREE.RingGeometry(0.24, 0.54, 24);
    const sigilTex = getEnchantSigilTexture();
    const sigilGeo = sigilTex
      ? new THREE.PlaneGeometry(1.88, 1.88)
      : new THREE.RingGeometry(0.56, 0.82, 32);
    const veilGeo1 = new THREE.CylinderGeometry(0.74, 0.56, 1.48, 24, 1, true);
    const veilGeo2 = new THREE.CylinderGeometry(0.88, 0.62, 1.56, 24, 1, true);

    const podiumScale = 0.92;
    const daisTopY = 0.285 * podiumScale;
    const centerOrigin = new THREE.Vector3(0, 0.16, -2.4);
    const upAxis = new THREE.Vector3(0, 1, 0);

    // 10 floating ZZZ/HSR Cyber-Showcase Enchant Pedestals in an ellipse ring
    const count = ENCHANTS.length;
    const pedestalTargets: Array<{ x: number; z: number; color: string }> = [];
    for (let i = 0; i < count; i++) {
      const enc = ENCHANTS[i];
      const secondaryHex = ENCHANT_SECONDARY_COLOR[enc.id] ?? '#ffffff';
      const angle = (i / count) * Math.PI * 2 + Math.PI * 0.18;
      const rx = 5.4;
      const rz = 3.9;
      const px = Math.cos(angle) * rx;
      const pz = Math.sin(angle) * rz - 2.4;
      const py = Math.sin(angle) < 0 ? 0.55 : -0.15;
      const needleAngle = Math.atan2(-(pz - -2.4), px);
      pedestalTargets.push({ x: px, z: pz, color: enc.color });

      // Radial Energy Conduit Bridge + 3 Traveling Energy Pulses from Center Clock to Podium
      const conduitMat = new THREE.MeshBasicMaterial({
        color: enc.color,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pedConduitEnd = new THREE.Vector3(px, py - 0.12, pz);
      const conduitDist = centerOrigin.distanceTo(pedConduitEnd);
      const conduitBeam = new THREE.Mesh(conduitBeamGeo, conduitMat);
      conduitBeam.position.copy(centerOrigin).lerp(pedConduitEnd, 0.5);
      conduitBeam.scale.set(1, conduitDist, 1);
      conduitBeam.quaternion.setFromUnitVectors(
        upAxis,
        pedConduitEnd.clone().sub(centerOrigin).normalize()
      );
      ctx.altarGroup.add(conduitBeam);

      const conduitPulses: THREE.Mesh[] = [];
      for (let pIdx = 0; pIdx < 3; pIdx++) {
        const pulseMesh = new THREE.Mesh(conduitPulseGeo, conduitMat);
        pulseMesh.position.copy(centerOrigin).lerp(pedConduitEnd, pIdx / 3);
        ctx.altarGroup.add(pulseMesh);
        conduitPulses.push(pulseMesh);
      }

      const pg = new THREE.Group();
      pg.position.set(px, py, pz);

      const podiumGroup = new THREE.Group();
      podiumGroup.scale.setScalar(podiumScale);
      pg.add(podiumGroup);

      const ringMat = new THREE.MeshStandardMaterial({
        color: enc.color,
        emissive: enc.color,
        emissiveIntensity: 1.0,
        roughness: 0.2,
        metalness: 0.45,
        flatShading: true,
      });

      // Tier 0: Floating Cyber-Thruster Under-Hull (y < 0)
      const underHull = new THREE.Mesh(underHullGeo, armorDarkMat);
      underHull.position.y = -0.28;
      underHull.rotation.y = Math.PI / 8;
      underHull.castShadow = true;
      const underThruster = new THREE.Mesh(underThrusterRingGeo, ringMat);
      underThruster.rotation.x = Math.PI / 2;
      underThruster.rotation.z = Math.PI / 8;
      underThruster.position.y = -0.54;
      podiumGroup.add(underHull, underThruster);
      for (let f = 0; f < 4; f++) {
        const fa = (f * Math.PI) / 2 + Math.PI / 4;
        const fin = new THREE.Mesh(underFinGeo, brightSteelMat);
        fin.position.set(Math.cos(fa) * 0.56, -0.24, Math.sin(fa) * 0.56);
        fin.rotation.y = -fa + Math.PI / 2;
        podiumGroup.add(fin);
      }

      // Tier 1: Chamfered Dock Bay + Flank Armor Bumpers + Cooling Louver Vents
      const bayDock = new THREE.Mesh(bayDockGeo, armorDarkMat);
      bayDock.receiveShadow = true;
      bayDock.castShadow = true;
      podiumGroup.add(bayDock);
      for (const sx of [-1, 1]) {
        const guard = new THREE.Mesh(guardGeo, armorSteelMat);
        guard.position.set(sx * 0.92, 0.055, -0.02);
        guard.castShadow = true;
        guard.receiveShadow = true;
        podiumGroup.add(guard);
        for (const vz of [-0.32, 0, 0.32]) {
          const vent = new THREE.Mesh(ventGeo, brightSteelMat);
          vent.position.set(sx * 0.995, 0.105, vz);
          podiumGroup.add(vent);
        }
      }

      // Recessed Edge-Lit Acrylic Seam Strip + Tier 2 Stepped Octagonal Machinery Dais
      const edgeSeamRing = new THREE.Mesh(edgeSeamGeo, ringMat);
      edgeSeamRing.position.y = 0.1;
      edgeSeamRing.rotation.y = Math.PI / 8;
      const machineryPlinth = new THREE.Mesh(plinthGeo, armorSteelMat);
      machineryPlinth.position.y = 0.176;
      machineryPlinth.rotation.y = Math.PI / 8;
      machineryPlinth.receiveShadow = true;
      machineryPlinth.castShadow = true;
      const topBevelRim = new THREE.Mesh(topRimGeo, brightSteelMat);
      topBevelRim.position.y = 0.256;
      topBevelRim.rotation.y = Math.PI / 8;
      topBevelRim.receiveShadow = true;
      podiumGroup.add(edgeSeamRing, machineryPlinth, topBevelRim);

      // Tier 3: Sleek Front-Angled Slot Plaque ("01".."10")
      const frontApron = new THREE.Mesh(frontApronGeo, brightSteelMat);
      frontApron.position.set(0, 0.02, 0.84);
      frontApron.rotation.x = 0.34;
      frontApron.castShadow = true;
      const plaqueTex = createAltarPodiumPlaqueTexture(String(i + 1).padStart(2, '0'), enc.color);
      if (plaqueTex) ctx.ownedAltarTextures.push(plaqueTex);
      const plaqueMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        ...(plaqueTex ? { map: plaqueTex } : { color: 0x0f172a }),
      });
      const plaqueFace = new THREE.Mesh(plaqueFaceGeo, plaqueMat);
      plaqueFace.position.set(0, 0.099, 0);
      plaqueFace.rotation.x = -Math.PI / 2;
      frontApron.add(plaqueFace);
      podiumGroup.add(frontApron);

      // Tier 4: ZZZ/HSR Low-Profile Rear Holographic Display Stanchions & Power Manifold
      const rearManifold = new THREE.Mesh(rearManifoldGeo, armorDarkMat);
      rearManifold.position.set(0, 0.04, -0.78);
      rearManifold.castShadow = true;
      rearManifold.receiveShadow = true;
      const manifoldGlow = new THREE.Mesh(manifoldGlowGeo, ringMat);
      manifoldGlow.position.set(0, 0.22, -0.78);
      podiumGroup.add(rearManifold, manifoldGlow);
      for (const sx of [-1, 1]) {
        const pylonPivot = new THREE.Group();
        pylonPivot.position.set(sx * 0.76, 0.08, -0.68);
        pylonPivot.rotation.z = -sx * 0.12;
        pylonPivot.rotation.x = 0.08;
        const body = new THREE.Mesh(stanchionGeo, armorSteelMat);
        body.castShadow = true;
        body.receiveShadow = true;
        const cap = new THREE.Mesh(stanchionCapGeo, brightSteelMat);
        cap.position.y = 0.56;
        cap.castShadow = true;
        const glowBlade = new THREE.Mesh(stanchionBladeGeo, ringMat);
        glowBlade.position.set(-sx * 0.072, 0.28, 0.045);
        pylonPivot.add(body, cap, glowBlade);
        podiumGroup.add(pylonPivot);
      }

      // Tier 5: Core Frosted Emitter Lens + Recessed Octagonal Neon Collar + 4 Corner Claws & Diodes
      const holoDiscMat = new THREE.MeshBasicMaterial({
        color: enc.color,
        ...(pedHoloTex ? { map: pedHoloTex } : {}),
        transparent: true,
        opacity: pedHoloTex ? 0.72 : 0.36,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const holoLensDisc = new THREE.Mesh(holoLensGeo, holoDiscMat);
      holoLensDisc.rotation.x = -Math.PI / 2;
      holoLensDisc.position.y = 0.282;
      holoLensDisc.renderOrder = 2;
      const ringMesh = new THREE.Mesh(ringTorusGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.rotation.z = Math.PI / 8;
      ringMesh.position.y = 0.286;
      for (let c = 0; c < 4; c++) {
        const ang = Math.PI / 4 + (c * Math.PI) / 2;
        const cx = Math.cos(ang) * 0.635;
        const cz = Math.sin(ang) * 0.635;
        const claw = new THREE.Mesh(clawGeo, brightSteelMat);
        claw.position.set(cx, 0.254, cz);
        claw.castShadow = true;
        const diode = new THREE.Mesh(diodeGeo, ringMat);
        diode.position.set(cx, 0.295, cz);
        podiumGroup.add(claw, diode);
      }
      podiumGroup.add(holoLensDisc, ringMesh);

      // Anime-RPG Ground Sigil + Dual-Shell Fresnel Rim Aura + GPU Star-Ember Particles
      const sigilMat = new THREE.MeshBasicMaterial({
        color: enc.color,
        ...(sigilTex ? { map: sigilTex } : {}),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: sigilTex ? 0.56 : 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const sigilMesh = new THREE.Mesh(sigilGeo, sigilMat);
      sigilMesh.rotation.x = -Math.PI / 2;
      sigilMesh.position.y = 0.298;
      sigilMesh.renderOrder = 3;
      const auraVeilMat = createAnimeAuraShaderMaterial(enc.color, secondaryHex, 0.32);
      const auraOuterVeilMat = createAnimeAuraShaderMaterial(secondaryHex, enc.color, 0.18);
      const auraVeil = new THREE.Mesh(veilGeo1, auraVeilMat);
      auraVeil.position.y = 1.02;
      const outerAuraVeil = new THREE.Mesh(veilGeo2, auraOuterVeilMat);
      outerAuraVeil.position.y = 1.06;
      const particles = createAnimeParticlePoints(enc.color, secondaryHex, {
        count: 20,
        minRadius: 0.42,
        maxRadius: 0.74,
        baseY: 0.28,
        sizeScale: podiumScale,
      });
      podiumGroup.add(sigilMesh, auraVeil, outerAuraVeil, particles.points);

      const billboard = new EnchantBillboard2D(enc.id, enc.color, 1.38, i * 0.7);
      billboard.root.position.y = daisTopY + 0.02;
      pg.add(billboard.root);

      ctx.altarGroup.add(pg);
      ctx.altarPedestals.push({
        id: enc.id,
        group: pg,
        ringMat,
        holoDiscMat,
        sigilMesh,
        sigilMat,
        auraVeilMat,
        auraOuterVeilMat,
        particleMat: particles.mat,
        conduitMat,
        conduitPulses,
        curLift: 0,
        prop: billboard.root,
        billboard,
        baseY: py,
        needleAngle,
        worldX: px,
        worldZ: pz,
        anchorLocal: new THREE.Vector3(px, py + 1.86, pz),
      });
    }

    // 6 Outer Floating Cosmic Crystal Islands + 4 Perimeter Chrono-Monolith Pylons
    const islandSpecs: ReadonlyArray<readonly [number, number, number, number]> = [
      [-8.6, 1.25, -4.8, 1.08],
      [8.6, 1.35, -4.8, 1.12],
      [-7.8, 0.45, 1.4, 0.92],
      [7.8, 0.55, 1.4, 0.95],
      [-5.4, 2.25, -8.2, 1.18],
      [5.4, 2.15, -8.2, 1.15],
    ];
    const islandDeckGeo = new THREE.CylinderGeometry(1.18, 0.95, 0.24, 8);
    const islandConeGeo = new THREE.ConeGeometry(0.95, 1.42, 7);
    const islandTrimGeo = new THREE.TorusGeometry(1.18, 0.036, 6, 8);
    const satShardGeo = new THREE.OctahedronGeometry(0.16, 0);
    for (let i = 0; i < islandSpecs.length; i++) {
      const [ix, iy, iz, scale] = islandSpecs[i];
      const islandGroup = new THREE.Group();
      islandGroup.position.set(ix, iy, iz);
      islandGroup.scale.setScalar(scale);

      const deck = new THREE.Mesh(islandDeckGeo, armorSteelMat);
      deck.castShadow = true;
      deck.receiveShadow = true;
      const underCone = new THREE.Mesh(islandConeGeo, armorDarkMat);
      underCone.rotation.x = Math.PI;
      underCone.position.y = -0.82;
      const neonMat = i % 2 === 0 ? centerNeonCyanMat : centerNeonVioletMat;
      const trim = new THREE.Mesh(islandTrimGeo, neonMat);
      trim.rotation.x = Math.PI / 2;
      trim.rotation.z = Math.PI / 8;
      trim.position.y = 0.08;

      const crystalCluster = createCyberCrystalCluster({
        frameMat: brightSteelMat,
        crystalMat: neonMat,
        accentMat: i % 2 === 0 ? centerNeonVioletMat : centerNeonCyanMat,
        scale: 0.92,
        shardCount: 5,
      });
      crystalCluster.position.y = 0.12;
      ctx.customAltarDisposers.push(() => disposeCyberProp(crystalCluster));

      const shard = new THREE.Mesh(satShardGeo, neonMat);
      shard.position.set(1.42, 0.55, 0);
      shard.scale.set(0.85, 1.45, 0.85);
      ctx.floatingShards.push(shard);

      islandGroup.add(deck, underCone, trim, crystalCluster, shard);
      ctx.altarGroup.add(islandGroup);
      ctx.floatingIslands.push({
        group: islandGroup,
        baseY: iy,
        phase: i * 1.15,
        bobSpeed: 1.35 + (i % 3) * 0.25,
      });
    }

    const pylonSpecs: ReadonlyArray<readonly [number, number, number]> = [
      [-6.8, -6.4, 0.55],
      [6.8, -6.4, -0.55],
      [-7.2, 0.2, 0.25],
      [7.2, 0.2, -0.25],
    ];
    const pylonShaftGeo = new THREE.CylinderGeometry(0.28, 0.42, 2.8, 8);
    const pylonCollarGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.18, 8);
    for (let i = 0; i < pylonSpecs.length; i++) {
      const [px, pz, rotY] = pylonSpecs[i];
      const pylonGroup = new THREE.Group();
      pylonGroup.position.set(px, -0.65, pz);
      pylonGroup.rotation.y = rotY;
      const neonMat = i % 2 === 0 ? centerNeonCyanMat : centerNeonVioletMat;
      const shaft = new THREE.Mesh(pylonShaftGeo, armorSteelMat);
      shaft.position.y = 1.4;
      const collar = new THREE.Mesh(pylonCollarGeo, brightSteelMat);
      collar.position.y = 2.4;
      const finial = createCyberMonolithForkFinial({
        frameMat: armorSteelMat,
        steelMat: brightSteelMat,
        coreMat: neonMat,
        scale: 1.35,
      });
      finial.position.y = 2.8;
      ctx.customAltarDisposers.push(() => disposeCyberProp(finial));
      pylonGroup.add(shaft, collar, finial);
      ctx.altarGroup.add(pylonGroup);
    }

    const clockDial = createAltarClockDial(pedestalTargets);
    const clockHand = createAltarClockHand();
    const clockSubHand = createAltarSubHand();
    ctx.altarGroup.add(
      ctx.hellEye.root,
      clockDial.group,
      clockHand.group,
      clockSubHand,
      ctx.altarParticles.group
    );
  const initialNeedleAngle = ctx.altarPedestals[0]?.needleAngle ?? Math.PI * 0.5;
  clockHand.group.rotation.y = initialNeedleAngle;
  clockSubHand.rotation.y = initialNeedleAngle;
  return { clockDial, clockHand, clockSubHand, outerEllipseMat, needleAngle: initialNeedleAngle };
}
