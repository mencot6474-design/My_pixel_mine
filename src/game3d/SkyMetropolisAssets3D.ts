import * as THREE from 'three';
import {
  createChamferSlabGeometry,
  createExtrudedProfileGeometry,
  createLatheProfileGeometry,
} from './MeshHelpers3D';
import { paintCachedTexture } from './ProceduralTextures3D';

export type SkyscraperFacadeVariant = 'curtain' | 'diagrid' | 'megacorp';
export type HoloBillboardLabel = 'MINE' | 'CYBER' | 'NEXUS';

export interface CyberZeppelinBuildResult {
  fanRotors: THREE.Group[];
  escortDrones: Array<{ group: THREE.Group; basePos: THREE.Vector3; phase: number }>;
  holoBeamMat: THREE.MeshBasicMaterial;
}

/** Procedural architectural facade variants so Neo-Tokyo skyscrapers never look copy-pasted. */
export function getSkyscraperVariantTexture(
  variant: SkyscraperFacadeVariant,
  accentHex: string
): THREE.Texture {
  const key = `sky-facade-var-v1|${variant}|${accentHex}`;
  const tex = paintCachedTexture(key, 256, 512, 1, 3, [14, 22, 40, 255], (ctx) => {
    const W = 256;
    const H = 512;

    if (variant === 'diagrid') {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0.0, '#162544');
      grad.addColorStop(0.55, '#0b1429');
      grad.addColorStop(1.0, '#050914');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Diagonal structural truss lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 4;
      for (let y = -256; y < H + 256; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y + 128);
        ctx.moveTo(W, y);
        ctx.lineTo(0, y + 128);
        ctx.stroke();
      }

      // Horizontal cyber data bands + staggered illuminated bays
      for (let r = 0; r < 24; r++) {
        const py = r * (H / 24);
        if (r % 6 === 1) {
          ctx.fillStyle = accentHex;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(0, py + 4, W, 5);
          ctx.globalAlpha = 1;
          continue;
        }
        for (let c = 0; c < 8; c++) {
          const h = (r * 41 + c * 23 + 5) % 13;
          if (h < 5) continue;
          ctx.fillStyle = h >= 10 ? accentHex : h >= 8 ? '#38bdf8' : '#fef08a';
          ctx.globalAlpha = h >= 10 ? 0.78 : 0.56;
          ctx.fillRect(c * 32 + 5, py + 4, 22, 11);
        }
      }
      ctx.globalAlpha = 1;
      return;
    }

    // 'megacorp': Dark obsidian armor cladding with glowing vertical light blades & penthouse bands
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.0, '#10182d');
    grad.addColorStop(0.6, '#080e1d');
    grad.addColorStop(1.0, '#03060f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle dark armor panel seams
    ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
    for (let y = 0; y < H; y += 32) {
      ctx.fillRect(0, y, W, 2);
    }

    // Twin vertical neon light blades running up the facade
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(24, 0, 7, H);
    ctx.fillRect(W - 31, 0, 7, H);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.72;
    ctx.fillRect(26.5, 0, 2, H);
    ctx.fillRect(W - 28.5, 0, 2, H);

    // Sparse executive slit windows in the central core
    for (let r = 0; r < 20; r++) {
      const py = r * (H / 20) + 6;
      const hash = (r * 31 + 9) % 11;
      if (hash < 4) continue;
      ctx.fillStyle = hash >= 9 ? accentHex : '#bae6fd';
      ctx.globalAlpha = hash >= 9 ? 0.85 : 0.54;
      ctx.fillRect(58, py, 60, 7);
      ctx.fillRect(138, py, 60, 7);
    }
    ctx.globalAlpha = 1;
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Holographic rooftop neon billboard sign texture (MINE / CYBER / NEXUS). */
export function getRooftopHoloSignTexture(label: HoloBillboardLabel, accentHex: string): THREE.Texture {
  const key = `sky-holo-sign-v1|${label}|${accentHex}`;
  return paintCachedTexture(key, 256, 128, 1, 1, [12, 24, 48, 220], (ctx) => {
    const W = 256;
    const H = 128;
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0.0, 'rgba(6, 14, 32, 0.88)');
    bg.addColorStop(0.5, 'rgba(12, 28, 58, 0.82)');
    bg.addColorStop(1.0, 'rgba(6, 14, 32, 0.88)');
    ctx.fillStyle = bg;
    ctx.fillRect(6, 8, W - 12, H - 16);

    // Neon chamfer-feel outer border + corner brackets
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 10, W - 16, H - 20);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 10, 18, 4);
    ctx.fillRect(W - 26, H - 14, 18, 4);

    // Horizontal holo scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (let y = 16; y < H - 16; y += 6) {
      ctx.fillRect(12, y, W - 24, 2);
    }

    // Crystal diamond icon on left
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(42, H * 0.5 - 20);
    ctx.lineTo(58, H * 0.5);
    ctx.lineTo(42, H * 0.5 + 20);
    ctx.lineTo(26, H * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = '900 44px "Fredoka", "Rubik", "Segoe UI", sans-serif';
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 72, H * 0.52);
    ctx.shadowBlur = 0;
  });
}

/** Soft vertical fade texture for searchlight beams so cones dissolve cleanly into the sky. */
export function getSearchlightBeamTexture(): THREE.Texture {
  return paintCachedTexture('sky-searchlight-grad-v1', 32, 128, 1, 1, [255, 255, 255, 180], (ctx) => {
    const grad = ctx.createLinearGradient(0, 128, 0, 0);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.12)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 128);
  });
}

/** Lightweight radial haze ring texture separating foreground sky arena from deep city canyons. */
export function getCityMistTexture(accentHex: string): THREE.Texture {
  return paintCachedTexture(`sky-city-mist-v1|${accentHex}`, 256, 256, 1, 1, [20, 40, 80, 90], (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 126);
    grad.addColorStop(0.0, 'rgba(15, 23, 42, 0.0)');
    grad.addColorStop(0.35, accentHex + '38');
    grad.addColorStop(0.68, '#1e3a8a44');
    grad.addColorStop(1.0, 'rgba(15, 23, 42, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  });
}

/** Builds a normalized 1x1x1 chamfered architectural tower shaft centered at origin. */
export function createSkyscraperShaftGeometry(): THREE.BufferGeometry {
  const geo = createChamferSlabGeometry(1, 1, 1, 0.14, 0.014, { minInnerH: 0.94, maxChamferRatio: 0.35 });
  geo.translate(0, -0.5, 0);
  geo.computeVertexNormals();
  return geo;
}

/** Builds the multi-part Cyber Zeppelin + Curved Wrap-Around LED Banner + 2 Escort Cyber-Drones. */
export function buildCyberZeppelin(opts: {
  blimpGroup: THREE.Group;
  hullMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  darkFrameMat: THREE.MeshStandardMaterial;
  screenMat: THREE.MeshBasicMaterial;
  beaconMat: THREE.MeshBasicMaterial;
  fadableMats: Array<{ mat: THREE.Material; baseOpacity: number }>;
}): CyberZeppelinBuildResult {
  const { blimpGroup, hullMat, trimMat, darkFrameMat, screenMat, beaconMat, fadableMats } = opts;

  const holoBeamMat = new THREE.MeshBasicMaterial({
    color: trimMat.color.clone(),
    map: getSearchlightBeamTexture(),
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  fadableMats.push({ mat: holoBeamMat, baseOpacity: 0.16 });

  // 1. Sculpted Ribbed Dirigible Envelope (LatheGeometry aligned along X; nose points -X)
  const hullProfile: ReadonlyArray<readonly [number, number]> = [
    [0.01, -7.8],
    [0.52, -7.25],
    [1.06, -5.85],
    [1.46, -4.15],
    [1.56, -4.05], // rib 1
    [1.5, -3.9],
    [1.68, -2.0],
    [1.76, -1.9], // rib 2
    [1.7, -1.75],
    [1.78, 0.0],
    [1.85, 0.1], // rib 3 (center belt)
    [1.77, 0.25],
    [1.68, 2.1],
    [1.75, 2.22], // rib 4
    [1.66, 2.38],
    [1.4, 4.35],
    [1.46, 4.48], // rib 5
    [1.34, 4.62],
    [0.92, 6.35],
    [0.36, 7.45],
    [0.01, 7.85],
  ];
  const hullGeo = createLatheProfileGeometry(hullProfile, 16);
  hullGeo.rotateZ(Math.PI / 2); // +Y -> -X nose
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.scale.set(1.0, 0.94, 1.14);
  blimpGroup.add(hull);

  // Dorsal cyber spine + illuminated top keel strip + forward nose lance
  const dorsalSpine = new THREE.Mesh(createChamferSlabGeometry(9.6, 0.34, 0.68, 0.14, 0.02), darkFrameMat);
  dorsalSpine.position.set(0.2, 1.56, 0);
  const dorsalNeon = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.1, 0.22), trimMat);
  dorsalNeon.position.set(0.2, 1.76, 0);

  const noseVisor = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.75, 10), trimMat);
  noseVisor.rotation.z = Math.PI / 2;
  noseVisor.position.set(-8.05, 0, 0);

  const noseLance = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 1.35, 6), darkFrameMat);
  noseLance.rotation.z = Math.PI / 2;
  noseLance.position.set(-9.15, 0, 0);

  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), beaconMat);
  beacon.position.set(-0.8, 2.02, 0);
  blimpGroup.add(dorsalSpine, dorsalNeon, noseVisor, noseLance, beacon);

  // 2. Swept X-Tail Stabilizer Wings (ExtrudeGeometry w/ bevel)
  const finGeo = createExtrudedProfileGeometry(
    [
      [0, -0.15],
      [2.55, -0.55],
      [3.15, 1.85],
      [1.45, 1.75],
    ],
    0.16,
    0.02
  );
  const finEdgeGeo = new THREE.BoxGeometry(0.14, 2.15, 0.22);
  for (const angle of [Math.PI * 0.22, -Math.PI * 0.22, Math.PI * 0.78, -Math.PI * 0.78]) {
    const finGroup = new THREE.Group();
    finGroup.position.set(5.45, 0, 0);
    finGroup.rotation.x = angle;
    const fin = new THREE.Mesh(finGeo, darkFrameMat);
    fin.position.set(-0.3, 0.78, -0.08);
    const finNeon = new THREE.Mesh(finEdgeGeo, trimMat);
    finNeon.position.set(2.45, 1.68, 0);
    finNeon.rotation.z = -0.26;
    finGroup.add(fin, finNeon);
    blimpGroup.add(finGroup);
  }

  // 3. Four Articulated Side Turbofan Nacelles with Spinning Rotors + Thruster Plumes
  const fanRotors: THREE.Group[] = [];
  const podGeo = new THREE.CylinderGeometry(0.36, 0.42, 2.05, 10);
  podGeo.rotateZ(Math.PI / 2);
  const shroudRingGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.38, 12, 1, true);
  shroudRingGeo.rotateZ(Math.PI / 2);
  const thrusterGeo = new THREE.CylinderGeometry(0.3, 0.22, 0.42, 10);
  thrusterGeo.rotateZ(Math.PI / 2);
  const bladeGeo = new THREE.BoxGeometry(0.06, 0.72, 0.14);

  const nacelleSpots: Array<[number, number, number]> = [
    [-1.4, -0.35, -2.32],
    [-1.4, -0.35, 2.32],
    [2.35, -0.22, -2.18],
    [2.35, -0.22, 2.18],
  ];
  for (const [nx, ny, nz] of nacelleSpots) {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, Math.abs(nz) * 0.55), darkFrameMat);
    pylon.position.set(nx, ny + 0.12, nz * 0.72);

    const pod = new THREE.Mesh(podGeo, darkFrameMat);
    pod.position.set(nx, ny, nz);

    const shroud = new THREE.Mesh(shroudRingGeo, trimMat);
    shroud.position.set(nx - 0.85, ny, nz);

    const glow = new THREE.Mesh(thrusterGeo, trimMat);
    glow.position.set(nx + 1.15, ny, nz);

    const rotor = new THREE.Group();
    rotor.position.set(nx - 0.92, ny, nz);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, hullMat);
      blade.rotation.x = (b / 3) * Math.PI * 2;
      rotor.add(blade);
    }
    fanRotors.push(rotor);
    blimpGroup.add(pylon, pod, shroud, glow, rotor);
  }

  // 4. Panoramic Command Gondola + Curved Wrap-Around LED Billboard ("MyChibiMine")
  const gondola = new THREE.Mesh(createChamferSlabGeometry(10.6, 0.62, 1.85, 0.26, 0.03), darkFrameMat);
  gondola.position.set(-0.2, -1.58, 0.15);
  blimpGroup.add(gondola);

  const curveRadius = 16.0;
  const arcTheta = 0.72; // ~11.2m wide wrap-around banner
  const tvBoard = new THREE.Group();
  tvBoard.position.set(0, -1.78, 1.52);
  tvBoard.rotation.x = 0.16;

  const backShieldGeo = new THREE.CylinderGeometry(
    curveRadius - 0.08,
    curveRadius - 0.08,
    3.15,
    24,
    1,
    true,
    -arcTheta * 0.5 - 0.015,
    arcTheta + 0.03
  );
  backShieldGeo.translate(0, 0, -curveRadius);
  const backShield = new THREE.Mesh(backShieldGeo, darkFrameMat);

  const railGeo = new THREE.CylinderGeometry(
    curveRadius + 0.05,
    curveRadius + 0.05,
    0.16,
    24,
    1,
    true,
    -arcTheta * 0.5 - 0.02,
    arcTheta + 0.04
  );
  railGeo.translate(0, 0, -curveRadius);
  const topRail = new THREE.Mesh(railGeo, trimMat);
  topRail.position.y = 1.56;
  const botRail = new THREE.Mesh(railGeo, trimMat);
  botRail.position.y = -1.56;

  const screenGeo = new THREE.CylinderGeometry(
    curveRadius,
    curveRadius,
    2.92,
    24,
    1,
    true,
    -arcTheta * 0.5,
    arcTheta
  );
  screenGeo.translate(0, 0, -curveRadius);
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);

  // Subtle downward holographic light projection fan below the banner
  const holoFanGeo = new THREE.PlaneGeometry(9.2, 3.6);
  const holoFan = new THREE.Mesh(holoFanGeo, holoBeamMat);
  holoFan.position.set(0, -3.35, -0.45);
  holoFan.rotation.x = -0.22;

  tvBoard.add(backShield, topRail, botRail, screenMesh, holoFan);
  blimpGroup.add(tvBoard);

  // 5. Two Escort Cyber-Drones flying in formation
  const escortDrones: Array<{ group: THREE.Group; basePos: THREE.Vector3; phase: number }> = [];
  const droneWingGeo = createExtrudedProfileGeometry(
    [
      [-1.05, 0],
      [0.45, 0.72],
      [0.85, 0.16],
      [0.85, -0.16],
      [0.45, -0.72],
    ],
    0.16,
    0.02
  );
  droneWingGeo.rotateX(Math.PI / 2);

  const droneOffsets: Array<[number, number, number, number]> = [
    [-10.8, 1.45, 1.65, 0.4],
    [8.8, -0.85, 2.45, 2.3],
  ];
  for (const [dx, dy, dz, phase] of droneOffsets) {
    const dg = new THREE.Group();
    const basePos = new THREE.Vector3(dx, dy, dz);
    dg.position.copy(basePos);
    const body = new THREE.Mesh(droneWingGeo, darkFrameMat);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), trimMat);
    core.position.set(0.55, 0, 0);
    dg.add(body, core);
    blimpGroup.add(dg);
    escortDrones.push({ group: dg, basePos, phase });
  }

  return { fanRotors, escortDrones, holoBeamMat };
}
