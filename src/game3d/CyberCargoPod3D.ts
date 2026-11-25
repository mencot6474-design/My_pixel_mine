import * as THREE from 'three';
import {
  createChamferSlabGeometry,
  createExtrudedProfileGeometry,
  disposeObject3D,
  enableShadows,
} from './MeshHelpers3D';
import { paintCachedTexture } from './ProceduralTextures3D';

export interface ProceduralChestHandle {
  group: THREE.Group;
  lidPivot: THREE.Group;
  setAccentColor: (color: number | string) => void;
  setInteraction: (hovered: boolean, bounce: number, elapsed: number) => void;
  dispose: () => void;
}

export interface CyberCargoPodOptions {
  scale?: number;
  hullColor?: number;
  trimColor?: number;
  accentColor?: number | string;
}

function getCargoHoloIconTexture(accentHex: string): THREE.Texture {
  const key = `cyber-cargo-holo-v1|${accentHex}`;
  return paintCachedTexture(key, 128, 128, 1, 1, [56, 189, 248, 220], (ctx) => {
    ctx.clearRect(0, 0, 128, 128);

    // Outer hexagonal frame
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const px = 64 + Math.cos(a) * 48;
      const py = 64 + Math.sin(a) * 48;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(8, 20, 42, 0.72)';
    ctx.fill();
    ctx.stroke();

    // Inner isometric crate cube glyph
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(64, 34);
    ctx.lineTo(90, 48);
    ctx.lineTo(64, 62);
    ctx.lineTo(38, 48);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(38, 52);
    ctx.lineTo(62, 65);
    ctx.lineTo(62, 92);
    ctx.lineTo(38, 79);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(90, 52);
    ctx.lineTo(66, 65);
    ctx.lineTo(66, 92);
    ctx.lineTo(90, 79);
    ctx.closePath();
    ctx.fill();
  });
}

/**
 * Builds a Sci-Fi Hover Cargo Pod replacing the classic treasure chest on the Vault Hover-Pad.
 * Pivot sits flush at y = 0 with dual mechanical sliding hatches, front LED bars, and holo emblem.
 */
export function createCyberCargoPod(options: CyberCargoPodOptions = {}): ProceduralChestHandle {
  const scale = options.scale ?? 1.05;
  const accentHex =
    typeof options.accentColor === 'string'
      ? options.accentColor
      : '#' + new THREE.Color(options.accentColor ?? 0x38bdf8).getHexString();

  const group = new THREE.Group();
  const root = new THREE.Group();
  root.scale.setScalar(scale);
  group.add(root);

  const hullMat = new THREE.MeshStandardMaterial({
    color: options.hullColor ?? 0x162238,
    roughness: 0.44,
    metalness: 0.52,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: options.trimColor ?? 0x4b6082,
    roughness: 0.3,
    metalness: 0.72,
    flatShading: true,
  });
  const darkInnerMat = new THREE.MeshStandardMaterial({
    color: 0x09101f,
    roughness: 0.58,
    metalness: 0.35,
    flatShading: true,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.25,
    roughness: 0.18,
    metalness: 0.25,
    flatShading: true,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: accentHex,
    emissiveIntensity: 1.75,
    roughness: 0.12,
    metalness: 0.1,
    flatShading: true,
  });
  const holoMat = new THREE.MeshBasicMaterial({
    map: getCargoHoloIconTexture(accentHex),
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
  });

  // 1. Grounded Chamfered Cargo Chassis Base (y = 0..0.24)
  const basePlate = new THREE.Mesh(
    createChamferSlabGeometry(1.78, 0.22, 1.42, 0.24, 0.022),
    trimMat
  );
  basePlate.position.y = 0;
  root.add(basePlate);

  // 2. Main Armored Vault Body (y = 0.20..0.94)
  const bodyHull = new THREE.Mesh(
    createChamferSlabGeometry(1.58, 0.74, 1.22, 0.2, 0.024),
    hullMat
  );
  bodyHull.position.y = 0.2;
  root.add(bodyHull);

  // 4 Sculpted Side Bumper Ribs (ExtrudeGeometry)
  const ribGeo = createExtrudedProfileGeometry(
    [
      [-0.14, 0],
      [0.14, 0],
      [0.1, 0.68],
      [-0.08, 0.68],
    ],
    0.16,
    0.018
  );
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const rib = new THREE.Mesh(ribGeo, trimMat);
      rib.position.set(sx * 0.56, 0.22, sz * 0.6);
      rib.rotation.z = sx * -0.08;
      root.add(rib);
    }
  }

  // Front Recessed Status Console + 5 Instanced LED Capacity Segments (+Z face)
  const consoleFrame = new THREE.Mesh(
    createChamferSlabGeometry(0.92, 0.34, 0.12, 0.06, 0.012),
    darkInnerMat
  );
  consoleFrame.position.set(0, 0.4, 0.61);
  root.add(consoleFrame);

  const ledGeo = new THREE.BoxGeometry(0.11, 0.14, 0.05);
  const ledInst = new THREE.InstancedMesh(ledGeo, neonMat, 5);
  const ledDummy = new THREE.Object3D();
  for (let i = 0; i < 5; i++) {
    ledDummy.position.set((i - 2) * 0.155, 0.57, 0.67);
    ledDummy.updateMatrix();
    ledInst.setMatrixAt(i, ledDummy.matrix);
  }
  ledInst.instanceMatrix.needsUpdate = true;
  root.add(ledInst);

  // Side neon accent strips
  const sideNeonGeo = new THREE.BoxGeometry(0.08, 0.08, 0.78);
  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(sideNeonGeo, neonMat);
    strip.position.set(sx * 0.8, 0.62, 0);
    root.add(strip);
  }

  // 3. Illuminated Inner Loot Core Bay (visible when sliding hatches part)
  const bayRim = new THREE.Mesh(
    createChamferSlabGeometry(1.26, 0.09, 0.96, 0.16, 0.012),
    darkInnerMat
  );
  bayRim.position.set(0, 0.9, 0);
  root.add(bayRim);

  const lootCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), coreMat);
  lootCore.scale.set(1.15, 0.85, 1.0);
  lootCore.position.set(0, 1.0, 0);
  root.add(lootCore);

  // 4. Dual Mechanical Sliding Top Hatch Doors (attached under lidPivot for test & animation parity)
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.96, 0);
  root.add(lidPivot);

  const hatchGeo = createChamferSlabGeometry(0.7, 0.18, 1.06, 0.14, 0.018);
  const hatchTrimGeo = new THREE.BoxGeometry(0.1, 0.06, 0.78);

  const leftHatch = new THREE.Mesh(hatchGeo, trimMat);
  leftHatch.position.set(-0.36, 0, 0);
  const leftHatchLed = new THREE.Mesh(hatchTrimGeo, neonMat);
  leftHatchLed.position.set(-0.06, 0.19, 0);
  leftHatch.add(leftHatchLed);

  const rightHatch = new THREE.Mesh(hatchGeo, trimMat);
  rightHatch.position.set(0.36, 0, 0);
  const rightHatchLed = new THREE.Mesh(hatchTrimGeo, neonMat);
  rightHatchLed.position.set(0.06, 0.19, 0);
  rightHatch.add(rightHatchLed);

  lidPivot.add(leftHatch, rightHatch);

  // 5. Floating Holographic Storage Emblem above the pod
  const holoBadge = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86), holoMat);
  holoBadge.position.set(0, 1.62, 0.06);
  root.add(holoBadge);

  enableShadows(group, true, true);
  holoBadge.castShadow = false;
  holoBadge.receiveShadow = false;
  lootCore.castShadow = false;

  return {
    group,
    lidPivot,
    setAccentColor(color: number | string): void {
      const nextHex =
        typeof color === 'string' ? color : '#' + new THREE.Color(color).getHexString();
      neonMat.color.set(nextHex);
      neonMat.emissive.set(nextHex);
      coreMat.emissive.set(nextHex);
      holoMat.map = getCargoHoloIconTexture(nextHex);
      holoMat.needsUpdate = true;
    },
    setInteraction(hovered: boolean, bounce: number, elapsed: number): void {
      const openAmt = Math.min(1, (hovered ? 0.65 : 0) + bounce * 1.1);
      // Part the sliding hatches outward & lift slightly, while tilting lidPivot for visual pop
      leftHatch.position.x = -0.36 - openAmt * 0.28;
      rightHatch.position.x = 0.36 + openAmt * 0.28;
      lidPivot.position.y = 0.96 + openAmt * 0.08;
      lidPivot.rotation.x = -openAmt * 0.16;

      const hoverScale = hovered ? 1.04 : 1.0;
      const bounceY = Math.sin(bounce * Math.PI) * 0.18;
      const squashX = 1 + Math.sin(bounce * Math.PI) * 0.06;
      const squashY = 1 - Math.sin(bounce * Math.PI) * 0.05;
      root.position.y = bounceY;
      root.scale.set(scale * hoverScale * squashX, scale * hoverScale * squashY, scale * hoverScale * squashX);

      lootCore.rotation.y = elapsed * (1.8 + openAmt * 3.0);
      lootCore.scale.setScalar(0.85 + openAmt * 0.35);
      coreMat.emissiveIntensity = 1.45 + openAmt * 1.4 + Math.sin(elapsed * 4.5) * 0.2;
      neonMat.emissiveIntensity = hovered
        ? 1.8 + Math.sin(elapsed * 8) * 0.25
        : 1.2 + Math.sin(elapsed * 3) * 0.12;

      holoBadge.position.y = 1.62 + openAmt * 0.18 + Math.sin(elapsed * 2.5) * 0.07;
      holoBadge.rotation.y = Math.sin(elapsed * 1.2) * 0.14;
    },
    dispose(): void {
      ledInst.dispose();
      holoMat.dispose();
      disposeObject3D(group);
    },
  };
}
