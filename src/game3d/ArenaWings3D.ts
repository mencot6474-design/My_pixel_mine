import * as THREE from 'three';
import {
  createChamferSlabGeometry,
  disposeObject3D,
  mergeStaticMeshesByMaterial,
} from './MeshHelpers3D';

export interface ArenaWingOptions {
  crystalColor?: string;
  cliffColor?: string;
}

export interface VaultCoreDaisHandle {
  group: THREE.Group;
  cableSocketWorld: THREE.Vector3;
  setPalette: (crystalHex: string, cliffHex: string) => void;
  setLowQuality: (low: boolean) => void;
  update: (dtSec: number, elapsed: number, chestHovered?: boolean, chestBounce?: number) => void;
  dispose: () => void;
}

/** Builds the Right Floating Satellite Vault Core Dais framing the clickable chest. */
export function createVaultCoreDais(options: ArenaWingOptions = {}): VaultCoreDaisHandle {
  const crystalHex = options.crystalColor ?? '#38bdf8';
  const cliffHex = options.cliffColor ?? '#334155';

  const group = new THREE.Group();
  const staticGroup = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x162032).lerp(new THREE.Color(cliffHex), 0.18),
    roughness: 0.56,
    metalness: 0.34,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x3b4d6b,
    roughness: 0.34,
    metalness: 0.5,
    flatShading: true,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: crystalHex,
    emissive: crystalHex,
    emissiveIntensity: 1.1,
    roughness: 0.2,
    metalness: 0.28,
    flatShading: true,
  });

  // Floating octagonal Cyber Hover-Pad at (9.85, 0.55, 3.85) — sleek & pillar-free
  const daisX = 9.85;
  const daisY = 0.55;
  const daisZ = 3.85;

  const vaultKeel = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 0.46, 0.72, 8), baseMat);
  vaultKeel.position.set(daisX, daisY - 0.36, daisZ);
  vaultKeel.rotation.y = Math.PI / 8;
  vaultKeel.castShadow = true;

  const vaultThruster = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.34, 0.09, 8), neonMat);
  vaultThruster.position.set(daisX, daisY - 0.75, daisZ);
  vaultThruster.rotation.y = Math.PI / 8;

  const lowerOct = new THREE.Mesh(new THREE.CylinderGeometry(1.66, 1.56, 0.24, 8), baseMat);
  lowerOct.position.set(daisX, daisY + 0.12, daisZ);
  lowerOct.rotation.y = Math.PI / 8;
  lowerOct.receiveShadow = true;
  lowerOct.castShadow = true;

  const upperOct = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.52, 0.22, 8), trimMat);
  upperOct.position.set(daisX, daisY + 0.35, daisZ);
  upperOct.rotation.y = Math.PI / 8;
  upperOct.receiveShadow = true;
  upperOct.castShadow = true;

  const daisRing = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.44, 0.045, 8), neonMat);
  daisRing.position.set(daisX, daisY + 0.45, daisZ);
  daisRing.rotation.y = Math.PI / 8;

  staticGroup.add(vaultKeel, vaultThruster, lowerOct, upperOct, daisRing);

  // 4 Low-profile octagonal corner bumper clamps (no tall rear pillar/walls)
  const clampGeo = createChamferSlabGeometry(0.36, 0.18, 0.32, 0.07, 0.012);
  const clampLedGeo = new THREE.BoxGeometry(0.22, 0.05, 0.08);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const cx = daisX + Math.cos(a) * 1.44;
    const cz = daisZ + Math.sin(a) * 1.44;
    const clamp = new THREE.Mesh(clampGeo, trimMat);
    clamp.position.set(cx, daisY + 0.24, cz);
    clamp.rotation.y = -a;
    clamp.castShadow = true;

    const led = new THREE.Mesh(clampLedGeo, neonMat);
    led.position.set(cx, daisY + 0.45, cz);
    led.rotation.y = -a;
    staticGroup.add(clamp, led);
  }

  mergeStaticMeshesByMaterial(staticGroup);
  group.add(staticGroup);

  const plumeMat = new THREE.MeshBasicMaterial({
    color: crystalHex,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const plumeMesh = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.88, 12, 1, true), plumeMat);
  plumeMesh.position.set(daisX, daisY - 1.14, daisZ);
  plumeMesh.rotation.x = Math.PI;
  group.add(plumeMesh);

  const prismCount = 6;
  const prismGeo = new THREE.OctahedronGeometry(0.12, 0);
  prismGeo.scale(0.8, 1.5, 0.8);
  const prismInst = new THREE.InstancedMesh(prismGeo, neonMat, prismCount);
  group.add(prismInst);

  const dummy = new THREE.Object3D();
  let lowQuality = false;

  const updatePrisms = (elapsed: number, hoverBoost: number): void => {
    const activeCount = lowQuality ? 3 : prismCount;
    prismInst.count = activeCount;
    for (let i = 0; i < activeCount; i++) {
      const ang = (i / activeCount) * Math.PI * 2 + elapsed * 0.25;
      const px = daisX + Math.cos(ang) * 1.36;
      const pz = daisZ + Math.sin(ang) * 1.36;
      const py = daisY + 0.78 + Math.sin(elapsed * 2.4 + i * 0.9) * (0.09 + hoverBoost * 0.08);
      dummy.position.set(px, py, pz);
      dummy.rotation.set(0, elapsed * 1.1 + i * 0.7, 0);
      dummy.scale.setScalar(0.85 + hoverBoost * 0.22);
      dummy.updateMatrix();
      prismInst.setMatrixAt(i, dummy.matrix);
    }
    prismInst.instanceMatrix.needsUpdate = true;
  };
  updatePrisms(0, 0);

  return {
    group,
    cableSocketWorld: new THREE.Vector3(daisX + 2.45, daisY + 2.42, daisZ),
    setPalette(nextCrystalHex: string, nextCliffHex: string): void {
      baseMat.color.setHex(0x162032).lerp(new THREE.Color(nextCliffHex), 0.18);
      neonMat.color.set(nextCrystalHex);
      neonMat.emissive.set(nextCrystalHex);
      plumeMat.color.set(nextCrystalHex);
    },
    setLowQuality(low: boolean): void {
      lowQuality = low;
      updatePrisms(0, 0);
    },
    update(_dtSec: number, elapsed: number, chestHovered = false, chestBounce = 0): void {
      const hoverBoost = (chestHovered ? 1.0 : 0) + Math.min(1, chestBounce * 2);
      neonMat.emissiveIntensity = 1.05 + hoverBoost * 0.55 + Math.sin(elapsed * 2.6) * 0.12;
      plumeMat.opacity = 0.22 + hoverBoost * 0.2 + Math.sin(elapsed * 3.8) * 0.04;
      updatePrisms(elapsed, hoverBoost);
    },
    dispose(): void {
      plumeMat.dispose();
      prismGeo.dispose();
      prismInst.dispose();
      disposeObject3D(group);
    },
  };
}
