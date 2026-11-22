import * as THREE from 'three';
import { disposeObject3D } from './ChestVaultStation3D';
import { createCyberMonolithForkFinial } from './CyberProps3D';
import { createChamferSlabGeometry, mergeStaticMeshesByMaterial } from './MeshHelpers3D';

export interface ArenaWingOptions {
  crystalColor?: string;
  cliffColor?: string;
}

export interface NexusLeftGateHandle {
  group: THREE.Group;
  cableSocketWorld: THREE.Vector3;
  setPalette: (crystalHex: string, cliffHex: string) => void;
  setLowQuality: (low: boolean) => void;
  update: (dtSec: number, elapsed: number) => void;
  dispose: () => void;
}

export interface VaultCoreDaisHandle {
  group: THREE.Group;
  cableSocketWorld: THREE.Vector3;
  setPalette: (crystalHex: string, cliffHex: string) => void;
  setLowQuality: (low: boolean) => void;
  update: (dtSec: number, elapsed: number, chestHovered?: boolean, chestBounce?: number) => void;
  dispose: () => void;
}

function makePortalVeilMaterial(crystalHex: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(crystalHex) },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float edgeX = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
        float edgeY = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.86, vUv.y);
        float scan = 0.55 + 0.45 * sin(vUv.y * 36.0 - uTime * 3.4);
        float chev = 0.5 + 0.5 * sin((vUv.y * 14.0 - abs(vUv.x - 0.5) * 8.0) - uTime * 2.4);
        float core = exp(-pow((vUv.x - 0.5) * 2.6, 2.0));
        float alpha = edgeX * edgeY * (0.14 + 0.24 * core + 0.12 * scan * chev);
        vec3 col = mix(uColor, vec3(1.0), core * 0.35 + chev * 0.15);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/** Builds the Left Floating Satellite Nexus Gate replacing legacy minecart railway. */
export function createNexusLeftGate(options: ArenaWingOptions = {}): NexusLeftGateHandle {
  const crystalHex = options.crystalColor ?? '#38bdf8';
  const cliffHex = options.cliffColor ?? '#334155';

  const group = new THREE.Group();
  const staticGroup = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x162032).lerp(new THREE.Color(cliffHex), 0.18),
    roughness: 0.58,
    metalness: 0.34,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x3b4d6b,
    roughness: 0.36,
    metalness: 0.48,
    flatShading: true,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: crystalHex,
    emissive: crystalHex,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    metalness: 0.28,
    flatShading: true,
  });

  const gateCenterX = -11.4;
  const gateCenterY = 0.55;
  const gateCenterZ = 1.15;
  const gateYaw = 0.26;

  const plinthGroup = new THREE.Group();
  plinthGroup.position.set(gateCenterX, gateCenterY, gateCenterZ);
  plinthGroup.rotation.y = gateYaw;

  // Floating satellite keel & thruster emitter beneath lowerPlinth
  const keelMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 0.42, 0.72, 8), baseMat);
  keelMesh.position.y = -0.36;
  keelMesh.rotation.y = Math.PI / 8;
  keelMesh.castShadow = true;

  const thrusterRing = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.34, 0.08, 8), neonMat);
  thrusterRing.position.y = -0.75;
  thrusterRing.rotation.y = Math.PI / 8;

  const lowerPlinth = new THREE.Mesh(createChamferSlabGeometry(3.2, 0.24, 5.2, 0.42, 0.02), baseMat);
  lowerPlinth.position.y = 0;
  lowerPlinth.receiveShadow = true;
  lowerPlinth.castShadow = true;

  const upperPlinth = new THREE.Mesh(createChamferSlabGeometry(2.5, 0.2, 4.4, 0.34, 0.016), trimMat);
  upperPlinth.position.y = 0.24;
  upperPlinth.receiveShadow = true;
  upperPlinth.castShadow = true;

  const thresholdStrip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 3.2), neonMat);
  thresholdStrip.position.set(0.45, 0.46, 0);

  const pillarZOffset = 1.72;
  for (const sz of [-1, 1]) {
    const pillarZ = sz * pillarZOffset;
    const pillarBase = new THREE.Mesh(createChamferSlabGeometry(0.95, 0.45, 0.95, 0.14, 0.016), baseMat);
    pillarBase.position.set(0, 0.44, pillarZ);
    pillarBase.castShadow = true;

    const pillarShaft = new THREE.Mesh(createChamferSlabGeometry(0.66, 3.16, 0.68, 0.1, 0.014), baseMat);
    pillarShaft.position.set(0, 0.89, pillarZ);
    pillarShaft.castShadow = true;

    const innerNeon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.96, 0.12), neonMat);
    innerNeon.position.set(0.24, 2.37, pillarZ - sz * 0.26);

    const finial = createCyberMonolithForkFinial({
      frameMat: baseMat,
      steelMat: trimMat,
      coreMat: neonMat,
      scale: 0.92,
    });
    finial.position.set(0, 4.32, pillarZ);
    plinthGroup.add(pillarBase, pillarShaft, innerNeon, finial);
  }

  const lintel = new THREE.Mesh(createChamferSlabGeometry(0.92, 0.36, 4.3, 0.18, 0.016), trimMat);
  lintel.position.set(0, 3.96, 0);
  lintel.castShadow = true;
  const lintelNeon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 3.35), neonMat);
  lintelNeon.position.set(0.42, 4.14, 0);

  plinthGroup.add(keelMesh, thrusterRing, lowerPlinth, upperPlinth, thresholdStrip, lintel, lintelNeon);
  staticGroup.add(plinthGroup);
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
  const plumeMesh = new THREE.Mesh(new THREE.ConeGeometry(0.66, 0.95, 12, 1, true), plumeMat);
  plumeMesh.position.set(gateCenterX, gateCenterY - 1.24, gateCenterZ);
  plumeMesh.rotation.x = Math.PI;
  group.add(plumeMesh);

  const veilMat = makePortalVeilMaterial(crystalHex);
  const veilMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 3.5), veilMat);
  veilMesh.position.set(gateCenterX, gateCenterY + 2.19, gateCenterZ);
  veilMesh.rotation.y = Math.PI / 2 + gateYaw;
  group.add(veilMesh);

  const chevronCount = 8;
  const chevronGeo = new THREE.OctahedronGeometry(0.11, 0);
  chevronGeo.scale(0.65, 1.45, 0.65);
  const chevronInst = new THREE.InstancedMesh(chevronGeo, neonMat, chevronCount);
  group.add(chevronInst);

  const dummy = new THREE.Object3D();
  let lowQuality = false;

  const updateChevrons = (elapsed: number): void => {
    const activeCount = lowQuality ? 4 : chevronCount;
    chevronInst.count = activeCount;
    for (let i = 0; i < activeCount; i++) {
      const phase = (elapsed * 0.42 + i / activeCount) % 1;
      const localZ = ((i % 4) - 1.5) * 0.62;
      const localY = gateCenterY + 0.72 + phase * 3.05;
      const localX = Math.sin(elapsed * 2.1 + i * 1.4) * 0.16;
      const sc = Math.sin(phase * Math.PI) * 1.05;
      dummy.position.set(
        gateCenterX + localX * Math.cos(gateYaw) + localZ * Math.sin(gateYaw),
        localY,
        gateCenterZ - localX * Math.sin(gateYaw) + localZ * Math.cos(gateYaw)
      );
      dummy.rotation.set(0, gateYaw + elapsed * 1.2 + i, 0);
      dummy.scale.setScalar(Math.max(0.05, sc));
      dummy.updateMatrix();
      chevronInst.setMatrixAt(i, dummy.matrix);
    }
    chevronInst.instanceMatrix.needsUpdate = true;
  };
  updateChevrons(0);

  return {
    group,
    cableSocketWorld: new THREE.Vector3(
      gateCenterX - pillarZOffset * Math.sin(gateYaw),
      gateCenterY + 4.32,
      gateCenterZ - pillarZOffset * Math.cos(gateYaw)
    ),
    setPalette(nextCrystalHex: string, nextCliffHex: string): void {
      baseMat.color.setHex(0x162032).lerp(new THREE.Color(nextCliffHex), 0.18);
      neonMat.color.set(nextCrystalHex);
      neonMat.emissive.set(nextCrystalHex);
      plumeMat.color.set(nextCrystalHex);
      (veilMat.uniforms.uColor.value as THREE.Color).set(nextCrystalHex);
    },
    setLowQuality(low: boolean): void {
      lowQuality = low;
      updateChevrons(0);
    },
    update(_dtSec: number, elapsed: number): void {
      veilMat.uniforms.uTime.value = elapsed;
      neonMat.emissiveIntensity = 1.08 + Math.sin(elapsed * 2.5) * 0.16;
      plumeMat.opacity = 0.22 + Math.sin(elapsed * 3.8) * 0.05;
      updateChevrons(elapsed);
    },
    dispose(): void {
      veilMat.dispose();
      plumeMat.dispose();
      chevronGeo.dispose();
      chevronInst.dispose();
      disposeObject3D(group);
    },
  };
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
