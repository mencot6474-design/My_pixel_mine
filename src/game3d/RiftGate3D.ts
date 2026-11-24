import * as THREE from 'three';
import { createChamferSlabGeometry, disposeObject3D } from './MeshHelpers3D';

export interface RiftGateHandle {
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  update: (dt: number, elapsed: number, isOpen: boolean, labelText: string) => void;
  setLowQuality: (low: boolean) => void;
  dispose: () => void;
}

/** Creates an arched portal Path/Shape centered horizontally at x=0, starting at yBottom. */
function makeArchContour(
  halfW: number,
  yBottom: number,
  ySpring: number,
  archRx: number,
  archRy: number,
  steps = 20
): THREE.Path {
  const path = new THREE.Path();
  path.moveTo(-halfW, yBottom);
  path.lineTo(halfW, yBottom);
  path.lineTo(halfW, ySpring);
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI;
    path.lineTo(Math.cos(a) * archRx, ySpring + Math.sin(a) * archRy);
  }
  path.lineTo(-halfW, ySpring);
  path.closePath();
  return path;
}

function createRiftPortalShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpen: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vLocalPos;
      void main() {
        vLocalPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpen;
      varying vec2 vLocalPos;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        // Normalize portal space around center (0, 1.22)
        vec2 p = (vLocalPos - vec2(0.0, 1.22)) / vec2(0.84, 1.04);
        float r = length(p);
        float ang = atan(p.y, p.x);

        // Sealed state: sleek dark-indigo energy barrier with subtle cyber scan shimmer
        float scan = 0.5 + 0.5 * sin(vLocalPos.y * 28.0 - uTime * 3.2);
        float hexGrid = smoothstep(0.85, 1.0, sin(vLocalPos.x * 18.0) * sin(vLocalPos.y * 18.0));
        float rim = smoothstep(0.55, 1.02, r);
        vec3 sealedCol = mix(vec3(0.06, 0.08, 0.20), vec3(0.42, 0.20, 0.72), rim * 0.65 + scan * 0.14);
        sealedCol += vec3(0.22, 0.65, 0.95) * hexGrid * 0.22;
        float sealedAlpha = 0.72 + rim * 0.20;

        // Open state: swirling dimensional rift vortex
        float swirl = ang + 3.4 / (r + 0.28) - uTime * 2.6;
        float spiralA = 0.5 + 0.5 * sin(swirl * 3.0 + sin(r * 9.0 - uTime * 4.0));
        float spiralB = 0.5 + 0.5 * cos(swirl * 5.0 - uTime * 3.2);
        float coreGlow = exp(-r * r * 4.8);
        vec3 openCol = mix(vec3(0.10, 0.05, 0.28), vec3(0.66, 0.33, 0.97), spiralA);
        openCol = mix(openCol, vec3(0.13, 0.83, 0.93), spiralB * (0.55 + 0.45 * (1.0 - r)));
        openCol += vec3(0.95, 0.98, 1.0) * coreGlow * 1.15;
        openCol += vec3(0.13, 0.83, 0.93) * rim * 0.55;
        float openAlpha = clamp(0.84 + coreGlow * 0.16, 0.0, 1.0);

        vec3 col = mix(sealedCol, openCol, uOpen);
        float alpha = mix(sealedAlpha, openAlpha, uOpen);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function paintRiftLabelCanvas(canvas: HTMLCanvasElement | null, text: string, isOpen: boolean): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  if (isOpen) {
    grad.addColorStop(0, '#071b36');
    grad.addColorStop(0.5, '#1e1042');
    grad.addColorStop(1, '#310a34');
  } else {
    grad.addColorStop(0, '#0f162b');
    grad.addColorStop(1, '#1a1535');
  }
  ctx.fillStyle = grad;
  ctx.strokeStyle = isOpen ? '#22d3ee' : '#a855f7';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(6, 6, w - 12, h - 12, 14);
  ctx.fill();
  ctx.stroke();

  // Micro header
  ctx.font = '800 20px "Rubik", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isOpen ? '#67e8f9' : '#c4b5fd';
  ctx.fillText('DIMENSIONAL RIFT', w / 2, 36);

  // Main bold timer
  const cleanTimer = text.replace(/^RIFT\s+(OPEN|IN)\s*/i, '');
  const displayLine = isOpen ? `OPEN • ${cleanTimer}` : `OPENS IN ${cleanTimer}`;
  ctx.font = '900 46px "Rubik", "Arial Black", sans-serif';
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#090d1a';
  ctx.strokeText(displayLine, w / 2, 88);
  ctx.fillStyle = isOpen ? '#ffffff' : '#f1f5f9';
  ctx.fillText(displayLine, w / 2, 88);
}

/**
 * Builds a solid, architectural Cyber-Stargate Archway on the Left Wing Hover-Pad
 * with readable titanium-slate bevels, a GLSL dimensional portal, and an elevated LED timer board.
 */
export function createRiftGate3D(): RiftGateHandle {
  const group = new THREE.Group();
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const ownedTexs: THREE.Texture[] = [];

  // Readable bright stylized titanium-slate materials (no pitch-black silhouettes)
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0xc2d0e6,
    roughness: 0.42,
    metalness: 0.32,
  });
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x2b3954,
    roughness: 0.48,
    metalness: 0.35,
  });
  const recessMat = new THREE.MeshStandardMaterial({
    color: 0x161f33,
    roughness: 0.55,
    metalness: 0.25,
  });
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
  const portalMat = createRiftPortalShaderMaterial();
  ownedMats.push(armorMat, chassisMat, recessMat, neonMat, portalMat);

  // 1. Grounded Stepped Base Threshold (y = 0..0.22)
  const plinthBotGeo = createChamferSlabGeometry(2.76, 0.14, 1.04, 0.16, 0.02);
  const plinthTopGeo = createChamferSlabGeometry(2.42, 0.12, 0.82, 0.12, 0.015);
  ownedGeos.push(plinthBotGeo, plinthTopGeo);

  const plinthBot = new THREE.Mesh(plinthBotGeo, chassisMat);
  plinthBot.position.set(0, 0.05, 0);
  plinthBot.receiveShadow = true;
  plinthBot.castShadow = true;

  const plinthTop = new THREE.Mesh(plinthTopGeo, armorMat);
  plinthTop.position.set(0, 0.17, 0);
  plinthTop.receiveShadow = true;
  plinthTop.castShadow = true;

  // 2. Solid Watertight Cyber-Archway (ExtrudeGeometry with arched inner cutout)
  const outerShape = new THREE.Shape();
  outerShape.moveTo(-1.26, 0.20);
  outerShape.lineTo(1.26, 0.20);
  outerShape.lineTo(1.18, 1.88);
  outerShape.lineTo(0.82, 2.52);
  outerShape.lineTo(-0.82, 2.52);
  outerShape.lineTo(-1.18, 1.88);
  outerShape.closePath();

  const innerHole = makeArchContour(0.84, 0.24, 1.44, 0.84, 0.84, 24);
  outerShape.holes.push(innerHole);

  const archGeo = new THREE.ExtrudeGeometry(outerShape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.035,
    bevelSegments: 2,
  });
  archGeo.translate(0, 0, -0.21);
  ownedGeos.push(archGeo);

  const archMesh = new THREE.Mesh(archGeo, armorMat);
  archMesh.castShadow = true;
  archMesh.receiveShadow = true;

  // Inner Gunmetal Collar Ring (slightly deeper to frame the portal opening)
  const collarShape = makeArchContour(0.92, 0.22, 1.44, 0.92, 0.92, 24) as unknown as THREE.Shape;
  const collarOuter = new THREE.Shape(collarShape.getPoints());
  collarOuter.holes.push(makeArchContour(0.82, 0.24, 1.44, 0.82, 0.82, 24));
  const collarGeo = new THREE.ExtrudeGeometry(collarOuter, {
    depth: 0.50,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  collarGeo.translate(0, 0, -0.25);
  ownedGeos.push(collarGeo);

  const collarMesh = new THREE.Mesh(collarGeo, chassisMat);
  collarMesh.castShadow = true;

  // Flush Recessed Neon Trim tracing the inner arch
  const trimOuter = new THREE.Shape(makeArchContour(0.85, 0.23, 1.44, 0.85, 0.85, 24).getPoints());
  trimOuter.holes.push(makeArchContour(0.80, 0.24, 1.44, 0.80, 0.80, 24));
  const trimGeo = new THREE.ExtrudeGeometry(trimOuter, {
    depth: 0.52,
    bevelEnabled: false,
  });
  trimGeo.translate(0, 0, -0.26);
  ownedGeos.push(trimGeo);

  const trimMesh = new THREE.Mesh(trimGeo, neonMat);

  // 2 Grounded Side Anchor Buttresses (flush with base, zero floating parts)
  const buttressGeo = createChamferSlabGeometry(0.26, 0.84, 0.62, 0.06, 0.015);
  ownedGeos.push(buttressGeo);

  const leftButtress = new THREE.Mesh(buttressGeo, chassisMat);
  leftButtress.position.set(-1.24, 0.58, 0);
  leftButtress.rotation.z = -0.14;
  leftButtress.castShadow = true;

  const rightButtress = new THREE.Mesh(buttressGeo, chassisMat);
  rightButtress.position.set(1.24, 0.58, 0);
  rightButtress.rotation.z = 0.14;
  rightButtress.castShadow = true;

  // 3. GLSL Dimensional Portal Surface inside the arch opening
  const portalShape = new THREE.Shape(makeArchContour(0.81, 0.24, 1.44, 0.81, 0.81, 24).getPoints());
  const portalGeo = new THREE.ShapeGeometry(portalShape, 24);
  ownedGeos.push(portalGeo);

  const portalMesh = new THREE.Mesh(portalGeo, portalMat);
  portalMesh.position.set(0, 0, 0);

  // 4. Elevated Physical LED Timer Scoreboard Mounted Cleanly ABOVE the Arch (zero clipping / zero z-fighting)
  const strutGeo = new THREE.BoxGeometry(0.14, 0.36, 0.16);
  const housingGeo = createChamferSlabGeometry(2.38, 0.68, 0.16, 0.06, 0.015);
  housingGeo.center();
  const screenGeo = new THREE.PlaneGeometry(2.22, 0.56);
  ownedGeos.push(strutGeo, housingGeo, screenGeo);

  const leftStrut = new THREE.Mesh(strutGeo, chassisMat);
  leftStrut.position.set(-0.66, 2.65, 0);
  const rightStrut = new THREE.Mesh(strutGeo, chassisMat);
  rightStrut.position.set(0.66, 2.65, 0);

  const signHousing = new THREE.Mesh(housingGeo, armorMat);
  signHousing.position.set(0, 3.12, 0);
  signHousing.castShadow = true;

  const labelCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  let labelTex: THREE.Texture;
  if (labelCanvas) {
    labelCanvas.width = 512;
    labelCanvas.height = 136;
    paintRiftLabelCanvas(labelCanvas, 'RIFT IN 00:00', false);
    labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;
  } else {
    labelTex = new THREE.DataTexture(new Uint8Array([34, 211, 238, 255]), 1, 1, THREE.RGBAFormat);
    labelTex.needsUpdate = true;
  }
  ownedTexs.push(labelTex);

  const labelMat = new THREE.MeshBasicMaterial({
    map: labelTex,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    fog: false,
  });
  ownedMats.push(labelMat);

  const labelScreen = new THREE.Mesh(screenGeo, labelMat);
  labelScreen.position.set(0, 3.12, 0.125);

  // Invisible Raycast Hitbox
  const hitGeo = new THREE.BoxGeometry(2.8, 3.5, 1.4);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  ownedGeos.push(hitGeo);
  ownedMats.push(hitMat);
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.position.set(0, 1.7, 0);
  hitMesh.userData = { kind: 'rift-gate' };

  group.add(
    plinthBot,
    plinthTop,
    archMesh,
    collarMesh,
    trimMesh,
    leftButtress,
    rightButtress,
    portalMesh,
    leftStrut,
    rightStrut,
    signHousing,
    labelScreen,
    hitMesh
  );

  let openBlend = 0;
  let lastLabelKey = '';

  return {
    group,
    hitMesh,
    update: (dt: number, elapsed: number, isOpen: boolean, labelText: string) => {
      const targetOpen = isOpen ? 1 : 0;
      openBlend += (targetOpen - openBlend) * Math.min(1, dt * 6);
      portalMat.uniforms.uTime.value = elapsed;
      portalMat.uniforms.uOpen.value = openBlend;
      neonMat.color.setHex(isOpen ? 0x22d3ee : 0xa855f7);

      const nextKey = `${isOpen ? '1' : '0'}:${labelText}`;
      if (nextKey !== lastLabelKey) {
        lastLabelKey = nextKey;
        paintRiftLabelCanvas(labelCanvas, labelText, isOpen);
        labelTex.needsUpdate = true;
      }
    },
    setLowQuality: (low: boolean) => {
      plinthBot.castShadow = !low;
      plinthTop.castShadow = !low;
      archMesh.castShadow = !low;
      collarMesh.castShadow = !low;
      leftButtress.castShadow = !low;
      rightButtress.castShadow = !low;
      signHousing.castShadow = !low;
    },
    dispose: () => {
      disposeObject3D(group);
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      for (const t of ownedTexs) t.dispose();
    },
  };
}
