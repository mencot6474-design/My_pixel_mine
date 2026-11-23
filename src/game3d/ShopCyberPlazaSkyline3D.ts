import * as THREE from 'three';
import {
  createSkyscraperShaftGeometry,
  getSkyscraperVariantTexture,
} from './SkyMetropolisAssets3D';

export interface PlazaSkylineHandle {
  apply: () => void;
}

interface PlazaSkylineSeed {
  x: number;
  z: number;
  w: number;
  d: number;
  topY: number;
  rotY: number;
}

/**
 * Builds the distant Golden-Blue Hour cyberpunk skyline ring around the Plaza island
 * with multi-part architectural setbacks, dark penthouse caps, hollow neon parapet trims,
 * and tapered rooftop spires with aviation beacons.
 */
export function addPlazaDistantSkyline(opts: {
  group: THREE.Group;
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  ownedInstanced: THREE.InstancedMesh[];
}): void {
  const { group, ownedGeos, ownedMats, ownedInstanced } = opts;
  const seeds: PlazaSkylineSeed[] = [];
  const rings: Array<{ count: number; rx: number; rz: number; minTop: number; maxTop: number }> = [
    { count: 18, rx: 38.0, rz: 30.0, minTop: -9.0, maxTop: -3.2 },
    { count: 22, rx: 50.0, rz: 38.0, minTop: -6.5, maxTop: -0.5 },
  ];

  let seedIdx = 0;
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    for (let i = 0; i < ring.count; i++) {
      const angle = (i / ring.count) * Math.PI * 2 + r * 0.37;
      const jitter = 0.88 + ((seedIdx * 13) % 5) * 0.06;
      const sx = Math.cos(angle) * ring.rx * jitter;
      const sz = -4.0 + Math.sin(angle) * ring.rz * jitter;
      if (sz > 10.0 && Math.abs(sx) < 28.0) {
        seedIdx++;
        continue;
      }
      let topY = ring.minTop + (((seedIdx * 19 + 3) % 9) / 8) * (ring.maxTop - ring.minTop);
      if (Math.abs(sx) >= 24.0 && sz < 4.0) {
        topY = Math.min(3.5, topY + 2.8 + ((seedIdx * 11) % 4) * 0.6);
      } else if (Math.abs(sx) < 16.0 && sz < -18.0) {
        topY = Math.min(-1.2, topY + 1.4);
      }
      const w = 3.2 + ((seedIdx * 7) % 4) * 0.65;
      const d = w * (0.85 + ((seedIdx * 5) % 3) * 0.12);
      seeds.push({ x: sx, z: sz, w, d, topY, rotY: (seedIdx % 4) * (Math.PI * 0.25) });
      seedIdx++;
    }
  }

  if (seeds.length === 0) return;

  const skylineBaseY = -36.0;
  const facadeTex = getSkyscraperVariantTexture('megacorp', '#7dd3fc');
  const shaftGeo = createSkyscraperShaftGeometry();
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0x223052,
    map: facadeTex,
    emissive: 0x38bdf8,
    emissiveMap: facadeTex,
    emissiveIntensity: 0.68,
    roughness: 0.58,
    metalness: 0.24,
    flatShading: true,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x162038,
    roughness: 0.64,
    metalness: 0.38,
    flatShading: true,
  });
  const trimGeo = new THREE.RingGeometry(0.41, 0.49, 4);
  trimGeo.rotateX(-Math.PI / 2);
  trimGeo.rotateY(Math.PI / 4);
  const trimMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.86,
  });
  const spireGeo = new THREE.CylinderGeometry(0.03, 0.09, 1, 6);
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0x52688a,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.55,
    flatShading: true,
  });
  const beaconGeo = new THREE.OctahedronGeometry(0.15, 0);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });

  ownedGeos.push(shaftGeo, trimGeo, spireGeo, beaconGeo);
  ownedMats.push(shaftMat, roofMat, trimMat, spireMat, beaconMat);

  let spireCount = 0;
  for (let i = 0; i < seeds.length; i++) {
    if (i % 2 === 0 || Math.abs(seeds[i].x) >= 22) spireCount++;
  }

  const shaftsInst = new THREE.InstancedMesh(shaftGeo, shaftMat, seeds.length);
  const setbacksInst = new THREE.InstancedMesh(shaftGeo, roofMat, seeds.length);
  const capsInst = new THREE.InstancedMesh(shaftGeo, roofMat, seeds.length);
  const trimsInst = new THREE.InstancedMesh(trimGeo, trimMat, seeds.length);
  const spiresInst = new THREE.InstancedMesh(spireGeo, spireMat, Math.max(1, spireCount));
  const beaconsInst = new THREE.InstancedMesh(beaconGeo, beaconMat, Math.max(1, spireCount));
  spiresInst.count = spireCount;
  beaconsInst.count = spireCount;

  for (const inst of [shaftsInst, setbacksInst, capsInst, trimsInst, spiresInst, beaconsInst]) {
    inst.raycast = () => {};
  }

  const dummy = new THREE.Object3D();
  const trimPalette = [0x38bdf8, 0xfbbf24, 0xe879f9, 0x67e8f9];
  const tmpColor = new THREE.Color();
  let spireIdx = 0;

  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    const setbackH = 1.6 + (i % 3) * 0.65;
    const capH = 0.65 + (i % 2) * 0.35;
    const shaftTop = s.topY - setbackH;
    const shaftH = Math.max(8.0, shaftTop - skylineBaseY);

    dummy.position.set(s.x, skylineBaseY + shaftH * 0.5, s.z);
    dummy.rotation.set(0, s.rotY, 0);
    dummy.scale.set(s.w, shaftH, s.d);
    dummy.updateMatrix();
    shaftsInst.setMatrixAt(i, dummy.matrix);

    const setW = s.w * 0.72;
    const setD = s.d * 0.72;
    dummy.position.set(s.x, shaftTop + setbackH * 0.5, s.z);
    dummy.scale.set(setW, setbackH, setD);
    dummy.updateMatrix();
    setbacksInst.setMatrixAt(i, dummy.matrix);

    const capW = setW * 0.58;
    const capD = setD * 0.58;
    dummy.position.set(s.x, s.topY + capH * 0.5, s.z);
    dummy.scale.set(capW, capH, capD);
    dummy.updateMatrix();
    capsInst.setMatrixAt(i, dummy.matrix);

    // Hollow neon bezel frame sitting along the setback parapet rim (no glowing solid plate)
    dummy.position.set(s.x, s.topY + 0.04, s.z);
    dummy.scale.set(setW * 1.44, 1, setD * 1.44);
    dummy.updateMatrix();
    trimsInst.setMatrixAt(i, dummy.matrix);
    trimsInst.setColorAt(i, tmpColor.setHex(trimPalette[i % trimPalette.length]));

    if (i % 2 === 0 || Math.abs(s.x) >= 22) {
      const spireH = 2.1 + (i % 4) * 0.65;
      const spireBaseY = s.topY + capH;
      dummy.position.set(s.x, spireBaseY + spireH * 0.5, s.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, spireH, 1);
      dummy.updateMatrix();
      spiresInst.setMatrixAt(spireIdx, dummy.matrix);

      dummy.position.set(s.x, spireBaseY + spireH + 0.08, s.z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      beaconsInst.setMatrixAt(spireIdx, dummy.matrix);
      spireIdx++;
    }
  }

  for (const inst of [shaftsInst, setbacksInst, capsInst, trimsInst, spiresInst, beaconsInst]) {
    inst.instanceMatrix.needsUpdate = true;
  }
  if (trimsInst.instanceColor) trimsInst.instanceColor.needsUpdate = true;
  group.add(shaftsInst, setbacksInst, capsInst, trimsInst, spiresInst, beaconsInst);
  ownedInstanced.push(shaftsInst, setbacksInst, capsInst, trimsInst, spiresInst, beaconsInst);
}
