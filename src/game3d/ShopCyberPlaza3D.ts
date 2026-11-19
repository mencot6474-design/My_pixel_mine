import * as THREE from 'three';
import {
  createCyberBotanicalCanopy,
  createCyberCrystalCluster,
  createCyberMonolithForkFinial,
} from './CyberProps3D';

export interface ShopCyberPlazaHandle {
  group: THREE.Group;
  animatedCrystals: THREE.Object3D[];
  animatedRings: THREE.Object3D[];
  update: (dtSec: number, elapsed: number) => void;
  dispose: () => void;
}

interface PulseMaterialSpec {
  mat: THREE.MeshStandardMaterial;
  base: number;
  amp: number;
  speed: number;
  phase: number;
}

function enableShadows(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function createChamferSlabGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer = 0.2,
  bevel = 0.025
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
    bevelEnabled: bevel > 0,
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

function createExtrudedProfileGeometry(
  pts: ReadonlyArray<readonly [number, number]>,
  depth: number,
  bevel = 0.018
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  if (pts.length > 0) {
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i][0], pts[i][1]);
    }
    shape.closePath();
  }
  const innerD = Math.max(0.01, depth - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerD,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.translate(0, 0, -innerD * 0.5);
  geo.computeVertexNormals();
  return geo;
}

function createChamferPanelXYGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer = 0.08,
  bevel = 0.015
): THREE.ExtrudeGeometry {
  const hw = width * 0.5;
  const hh = height * 0.5;
  const c = Math.min(chamfer, hw * 0.42, hh * 0.42);
  return createExtrudedProfileGeometry(
    [
      [-hw + c, -hh],
      [hw - c, -hh],
      [hw, -hh + c],
      [hw, hh - c],
      [hw - c, hh],
      [-hw + c, hh],
      [-hw, hh - c],
      [-hw, -hh + c],
    ],
    depth,
    bevel
  );
}

function createLatheProfileGeometry(
  profile: ReadonlyArray<readonly [number, number]>,
  radialSegments = 10
): THREE.LatheGeometry {
  const vecs = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
  const geo = new THREE.LatheGeometry(vecs, radialSegments);
  geo.computeVertexNormals();
  return geo;
}

function createCyberPlazaFloorTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#1b2436';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const alt = (x / step + y / step) % 2 === 0;
      ctx.fillStyle = alt ? 'rgba(30, 41, 59, 0.28)' : 'rgba(15, 23, 42, 0.22)';
      ctx.fillRect(x + 3, y + 3, step - 6, step - 6);
      if (((x * 3 + y * 5) / step) % 5 === 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.fillRect(x + 8, y + 8, 8, 2);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 6);
  tex.needsUpdate = true;
  return tex;
}

function createHologramSignTexture(
  title: string,
  subtitle: string,
  accentHex: string
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'rgba(8, 15, 32, 0.94)';
  ctx.fillRect(0, 0, 256, 96);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
  for (let y = 0; y < 96; y += 4) {
    ctx.fillRect(0, y, 256, 1);
  }

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 88);

  ctx.fillStyle = accentHex;
  ctx.fillRect(12, 14, 6, 68);
  ctx.fillRect(238, 14, 6, 68);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(title, 128, 36);

  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillStyle = accentHex;
  ctx.fillText(subtitle, 128, 68);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Creates a radial contact-shadow gradient texture around a circular curb perimeter. */
function createRoundaboutShadowTexture(innerFrac: number, outerFrac: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const mid = size * 0.5;
  const grad = ctx.createRadialGradient(mid, mid, mid * innerFrac, mid, mid, mid * outerFrac);
  grad.addColorStop(0.0, 'rgba(2, 6, 15, 0.82)');
  grad.addColorStop(0.32, 'rgba(2, 6, 15, 0.56)');
  grad.addColorStop(0.68, 'rgba(2, 6, 15, 0.22)');
  grad.addColorStop(1.0, 'rgba(2, 6, 15, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds the procedural "Neo-Cyber City Plaza" lobby world matching Battle Tower's
 * cyberpunk aesthetic with safe-zone lighting, zero sky-blocking rear pillars,
 * spacious cyber kiosks with clean vending machines, and zero z-fighting surfaces.
 */
export function createShopCyberPlaza(): ShopCyberPlazaHandle {
  const group = new THREE.Group();
  const ownedTextures: THREE.Texture[] = [];
  const animatedCrystals: THREE.Object3D[] = [];
  const animatedRings: THREE.Object3D[] = [];
  const pulseMaterials: PulseMaterialSpec[] = [];

  const darkHullMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.72,
    metalness: 0.35,
    flatShading: true,
  });
  const slateConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x1f293d,
    roughness: 0.78,
    metalness: 0.16,
    flatShading: true,
  });
  const plazaFloorTex = createCyberPlazaFloorTexture();
  if (plazaFloorTex) ownedTextures.push(plazaFloorTex);
  const plazaDeckMat = new THREE.MeshStandardMaterial({
    color: plazaFloorTex ? 0xffffff : 0x1e293b,
    ...(plazaFloorTex ? { map: plazaFloorTex } : {}),
    roughness: 0.74,
    metalness: 0.18,
  });
  const recessedZoneMat = new THREE.MeshStandardMaterial({
    color: 0x151e30,
    roughness: 0.82,
    metalness: 0.15,
    flatShading: true,
  });
  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x465875,
    roughness: 0.42,
    metalness: 0.34,
    flatShading: true,
  });
  const brushedSteelMat = new THREE.MeshStandardMaterial({
    color: 0x7c90ad,
    roughness: 0.36,
    metalness: 0.4,
    flatShading: true,
  });
  const towerPanelMat = new THREE.MeshStandardMaterial({
    color: 0x21304b,
    roughness: 0.48,
    metalness: 0.3,
    flatShading: true,
  });
  const towerRibMat = new THREE.MeshStandardMaterial({
    color: 0x364866,
    roughness: 0.4,
    metalness: 0.35,
    flatShading: true,
  });
  const containerDarkMat = new THREE.MeshStandardMaterial({
    color: 0x24324a,
    roughness: 0.46,
    metalness: 0.28,
    flatShading: true,
  });
  const containerMidMat = new THREE.MeshStandardMaterial({
    color: 0x334663,
    roughness: 0.42,
    metalness: 0.26,
    flatShading: true,
  });
  const roadAsphaltMat = new THREE.MeshStandardMaterial({
    color: 0x121927,
    roughness: 0.84,
    metalness: 0.12,
    flatShading: true,
  });

  const makeNeonMat = (
    colorHex: number,
    emissiveIntensity = 1.45,
    pulseAmp = 0.14,
    speed = 2.2,
    phase = 0
  ): THREE.MeshStandardMaterial => {
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity,
      roughness: 0.2,
      metalness: 0.25,
      flatShading: true,
    });
    if (pulseAmp > 0) {
      pulseMaterials.push({ mat, base: emissiveIntensity, amp: pulseAmp, speed, phase });
    }
    return mat;
  };

  const cyanNeonMat = makeNeonMat(0x22d3ee, 1.4, 0.16, 2.1, 0);
  const blueNeonMat = makeNeonMat(0x38bdf8, 1.35, 0.12, 2.4, 0.6);
  const violetNeonMat = makeNeonMat(0xa855f7, 1.45, 0.18, 1.9, 1.2);
  const magentaNeonMat = makeNeonMat(0xe879f9, 1.5, 0.2, 2.3, 1.8);
  const emeraldNeonMat = makeNeonMat(0x4ade80, 1.35, 0.14, 2.0, 2.4);
  const amberNeonMat = makeNeonMat(0xf97316, 1.65, 0.24, 3.1, 0.4);
  const warmLampMat = makeNeonMat(0xe0f2fe, 1.6, 0.05, 1.2, 0);

  // Safe-Zone Urban Night Fill & Localized Neon Pool Lights
  const plazaSafeHemi = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.75);
  group.add(plazaSafeHemi);

  const zoneLights: Array<[number, number, number, number, number, number]> = [
    [0, 4.4, -0.5, 0xd8b4fe, 2.3, 15],
    [0, 6.4, -9.2, 0x38bdf8, 2.6, 17],
    [-11.4, 4.0, -7.8, 0x38bdf8, 2.0, 14],
    [-10.2, 3.4, 1.8, 0x4ade80, 1.9, 14],
    [11.4, 4.6, -7.8, 0xf472b6, 2.1, 14],
    [10.2, 3.4, 1.8, 0xf97316, 2.3, 14],
  ];
  for (const [lx, ly, lz, col, intensity, dist] of zoneLights) {
    const pt = new THREE.PointLight(col, intensity, dist, 1.45);
    pt.position.set(lx, ly, lz);
    group.add(pt);
  }

  const addHologramSign = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    title: string,
    subtitle: string,
    accentHexStr: string,
    accentMat: THREE.MeshStandardMaterial,
    rotY = 0
  ): void => {
    const sg = new THREE.Group();
    sg.position.set(x, y, z);
    sg.rotation.y = rotY;

    const frame = new THREE.Mesh(
      createChamferPanelXYGeometry(w + 0.24, h + 0.2, 0.14, 0.08, 0.015),
      gunmetalMat
    );
    frame.position.z = -0.02;

    const holoTex = createHologramSignTexture(title, subtitle, accentHexStr);
    if (holoTex) ownedTextures.push(holoTex);
    const screenMat = new THREE.MeshBasicMaterial({
      color: holoTex ? 0xffffff : accentHexStr,
      ...(holoTex ? { map: holoTex } : {}),
      transparent: true,
      opacity: 0.96,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    screen.position.z = 0.08;

    const topRail = new THREE.Mesh(createChamferSlabGeometry(w + 0.28, 0.06, 0.18, 0.03, 0.008), accentMat);
    topRail.position.y = h * 0.5 + 0.09;
    const botRail = new THREE.Mesh(createChamferSlabGeometry(w + 0.28, 0.06, 0.18, 0.03, 0.008), accentMat);
    botRail.position.y = -h * 0.5 - 0.15;

    enableShadows(frame);
    sg.add(frame, screen, topRail, botRail);
    parent.add(sg);
  };

  // Full-scale Cyber Vending Machine (w = 1.05, h = 1.88, d = 0.74) with clean non-clipped front display
  const buildCyberVendingMachine = (
    x: number,
    y: number,
    z: number,
    accentMat: THREE.MeshStandardMaterial,
    rotY = 0,
    itemColors: readonly number[] = [0x38bdf8, 0xf472b6, 0x4ade80, 0xfacc15]
  ): THREE.Group => {
    const vg = new THREE.Group();
    vg.position.set(x, y, z);
    vg.rotation.y = rotY;

    const body = new THREE.Mesh(createChamferSlabGeometry(1.05, 1.72, 0.74, 0.1, 0.02), containerDarkMat);
    const hood = new THREE.Mesh(createChamferSlabGeometry(1.14, 0.16, 0.82, 0.1, 0.015), gunmetalMat);
    hood.position.y = 1.72;

    const glassFrame = new THREE.Mesh(
      createChamferSlabGeometry(0.68, 1.02, 0.08, 0.05, 0.01),
      slateConcreteMat
    );
    glassFrame.position.set(-0.1, 0.56, 0.36);

    const sideStrip = new THREE.Mesh(createChamferSlabGeometry(0.08, 1.56, 0.08, 0.02, 0.008), accentMat);
    sideStrip.position.set(0.47, 0.08, 0.36);

    const keypad = new THREE.Mesh(createChamferSlabGeometry(0.2, 0.34, 0.08, 0.03, 0.008), accentMat);
    keypad.position.set(0.32, 0.94, 0.37);

    const tray = new THREE.Mesh(createChamferSlabGeometry(0.64, 0.24, 0.14, 0.04, 0.01), darkHullMat);
    tray.position.set(-0.1, 0.2, 0.38);

    const cellGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 6);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const cHex = itemColors[(row * 3 + col) % itemColors.length];
        const cellMat = makeNeonMat(cHex, 1.25, 0, 1, 0);
        const cell = new THREE.Mesh(cellGeo, cellMat);
        cell.position.set(-0.26 + col * 0.16, 0.82 + row * 0.38, 0.42);
        vg.add(cell);
      }
    }

    enableShadows(body);
    enableShadows(hood);
    vg.add(body, hood, glassFrame, sideStrip, keypad, tray);
    return vg;
  };

  // High-Clearance Cyberpunk Container Shell so awnings never clip foreground props
  const buildCyberContainerShell = (
    w: number,
    h: number,
    d: number,
    accentMat: THREE.MeshStandardMaterial
  ): THREE.Group => {
    const cg = new THREE.Group();

    const mainHull = new THREE.Mesh(createChamferSlabGeometry(w, h, d, 0.18, 0.03), containerDarkMat);
    const roofCap = new THREE.Mesh(createChamferSlabGeometry(w + 0.2, 0.22, d + 0.2, 0.18, 0.02), gunmetalMat);
    roofCap.position.y = h;

    // High-mounted slanted awning (+0.68 beyond front face, high clearance above pad)
    const awningPts: [number, number][] = [
      [-d * 0.5, 0],
      [d * 0.5 + 0.68, -0.18],
      [d * 0.5 + 0.68, -0.32],
      [-d * 0.5, -0.14],
    ];
    const awningGeo = createExtrudedProfileGeometry(awningPts, w + 0.14, 0.015);
    awningGeo.rotateY(-Math.PI / 2);
    const awning = new THREE.Mesh(awningGeo, containerMidMat);
    awning.position.set(0, h * 0.86, 0);

    const frontTrim = new THREE.Mesh(
      createChamferSlabGeometry(w + 0.18, 0.08, 0.1, 0.02, 0.008),
      accentMat
    );
    frontTrim.position.set(0, h * 0.86 - 0.34, d * 0.5 + 0.68);

    // Side structural armor ribs on outer left/right walls (cleanly clear of front storefront!)
    const ribGeo = createChamferSlabGeometry(0.14, h * 0.9, d + 0.1, 0.04, 0.01);
    for (const rx of [-w * 0.5 + 0.04, w * 0.5 - 0.04]) {
      const rib = new THREE.Mesh(ribGeo, towerRibMat);
      rib.position.set(rx, h * 0.05, 0);
      enableShadows(rib);
      cg.add(rib);
    }

    // Glowing Storefront Display Window & Security Door protruding cleanly forward
    const windowPanel = new THREE.Mesh(
      createChamferSlabGeometry(w * 0.48, h * 0.42, 0.12, 0.05, 0.012),
      accentMat
    );
    windowPanel.position.set(w * 0.18, h * 0.3, d * 0.5 + 0.06);

    const doorPanel = new THREE.Mesh(
      createChamferSlabGeometry(w * 0.28, h * 0.68, 0.12, 0.04, 0.012),
      slateConcreteMat
    );
    doorPanel.position.set(-w * 0.24, 0.04, d * 0.5 + 0.06);

    // Rooftop HVAC & Sculpted Antenna Mast Finial
    const hvac = new THREE.Mesh(createChamferSlabGeometry(w * 0.34, 0.38, d * 0.44, 0.06, 0.015), towerRibMat);
    hvac.position.set(-w * 0.2, h + 0.2, -d * 0.12);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.06, 1.05, 6), brushedSteelMat);
    mast.position.set(w * 0.32, h + 0.72, -d * 0.24);
    const beacon = createCyberMonolithForkFinial({
      frameMat: gunmetalMat,
      steelMat: brushedSteelMat,
      coreMat: accentMat,
      scale: 0.45,
    });
    beacon.position.set(w * 0.32, h + 1.22, -d * 0.24);

    enableShadows(mainHull);
    enableShadows(roofCap);
    enableShadows(awning);
    cg.add(mainHull, roofCap, awning, frontTrim, windowPanel, doorPanel, hvac, mast, beacon);
    return cg;
  };

  // =========================================================================
  // 1. FLOATING CYBER PLAZA ISLAND BASE, DARK CONCRETE DECK & NEON AVENUES
  // =========================================================================
  const lowerPlinth = new THREE.Mesh(
    createChamferSlabGeometry(37.6, 2.2, 27.6, 1.8, 0.08),
    darkHullMat
  );
  lowerPlinth.position.set(0, -3.6, -2);
  group.add(lowerPlinth);

  const hullNeonBand = new THREE.Mesh(
    createChamferSlabGeometry(38.2, 0.16, 28.2, 1.8, 0.02),
    cyanNeonMat
  );
  hullNeonBand.position.set(0, -1.52, -2);
  group.add(hullNeonBand);

  const cliffRim = new THREE.Mesh(
    createChamferSlabGeometry(42.4, 1.4, 32.4, 1.6, 0.06),
    slateConcreteMat
  );
  cliffRim.position.set(0, -1.4, -2);
  cliffRim.receiveShadow = true;
  group.add(cliffRim);

  // Main Plaza Floor (top face strictly at y = 0.14)
  const plazaFloor = new THREE.Mesh(
    createChamferSlabGeometry(41.2, 0.24, 31.2, 1.4, 0.03),
    plazaDeckMat
  );
  plazaFloor.position.set(0, -0.1, -2);
  plazaFloor.receiveShadow = true;
  group.add(plazaFloor);

  // 4 Non-Overlapping Recessed Cyber-Concrete Quadrant Pads (y = 0.14..0.18)
  for (const [lx, lz, lw, ld, borderMat] of [
    [-14.2, -11.1, 11.8, 11.8, cyanNeonMat],
    [14.2, -11.1, 11.8, 11.8, violetNeonMat],
    [-14.2, 0.7, 11.8, 5.4, emeraldNeonMat],
    [14.2, 0.7, 11.8, 5.4, amberNeonMat],
  ] as Array<[number, number, number, number, THREE.MeshStandardMaterial]>) {
    const pad = new THREE.Mesh(createChamferSlabGeometry(lw, 0.04, ld, 0.4, 0.01), recessedZoneMat);
    pad.position.set(lx, 0.14, lz);
    pad.receiveShadow = true;
    group.add(pad);

    const edgeStrip = new THREE.Mesh(
      createChamferSlabGeometry(lw - 0.4, 0.03, 0.09, 0.03, 0.006),
      borderMat
    );
    edgeStrip.position.set(lx, 0.18, lz + (lz < -4 ? ld * 0.5 - 0.1 : -ld * 0.5 + 0.1));
    group.add(edgeStrip);
  }

  // Perimeter Dark Steel Curb (y = 0.14..0.36)
  for (const [bx, bz, bw, bd] of [
    [0, -17.35, 40.6, 0.55],
    [-20.3, -2.0, 0.55, 30.6],
    [20.3, -2.0, 0.55, 30.6],
  ]) {
    const curb = new THREE.Mesh(createChamferSlabGeometry(bw, 0.22, bd, 0.12, 0.02), gunmetalMat);
    curb.position.set(bx, 0.14, bz);
    enableShadows(curb);
    group.add(curb);
  }

  // Non-Overlapping Dark Asphalt Cross Avenues (y = 0.14..0.18) + Neon Lane Guides (y = 0.18..0.21)
  const northSouthRoad = new THREE.Mesh(createChamferSlabGeometry(3.2, 0.04, 18.8, 0.15, 0.008), roadAsphaltMat);
  northSouthRoad.position.set(0, 0.14, 3.0);
  northSouthRoad.receiveShadow = true;
  group.add(northSouthRoad);

  for (const sx of [-1, 1]) {
    const sideCross = new THREE.Mesh(createChamferSlabGeometry(11.5, 0.04, 2.8, 0.15, 0.008), roadAsphaltMat);
    sideCross.position.set(sx * 7.35, 0.14, -3.6);
    sideCross.receiveShadow = true;

    const sideFront = new THREE.Mesh(createChamferSlabGeometry(10.3, 0.04, 2.6, 0.15, 0.008), roadAsphaltMat);
    sideFront.position.set(sx * 6.75, 0.14, 5.2);
    sideFront.receiveShadow = true;
    group.add(sideCross, sideFront);

    // Stop horizontal avenue lane lines cleanly before touching the central roundabout curb & shadow
    const sideCrossStripes: Array<[number, number, number]> = [
      [-4.85, 7.8, 10.3],
      [-2.35, 8.8, 8.3],
    ];
    for (const [rz, cx, len] of sideCrossStripes) {
      const lane = new THREE.Mesh(createChamferSlabGeometry(len, 0.03, 0.09, 0.02, 0.005), cyanNeonMat);
      lane.position.set(sx * cx, 0.18, rz);
      group.add(lane);
    }
    const sideFrontStripes: Array<[number, number, number]> = [
      [4.0, 7.05, 9.4],
      [6.4, 6.75, 10.0],
    ];
    for (const [rz, cx, len] of sideFrontStripes) {
      const lane = new THREE.Mesh(createChamferSlabGeometry(len, 0.03, 0.09, 0.02, 0.005), violetNeonMat);
      lane.position.set(sx * cx, 0.18, rz);
      group.add(lane);
    }
  }
  for (const rx of [-1.45, 1.45]) {
    for (const [segZ, len] of [
      [-5.765, 1.17],
      [9.425, 5.95],
    ]) {
      const lane = new THREE.Mesh(createChamferSlabGeometry(0.09, 0.03, len, 0.02, 0.005), cyanNeonMat);
      lane.position.set(rx, 0.18, segZ);
      group.add(lane);
    }
  }

  // Modern Cyberpunk Plaza Barriers & Entrance Gate (z = 13.15) via InstancedMesh
  const barrierPositions = [-15.2, -13.0, -10.8, -8.6, -6.4, -4.2, 4.2, 6.4, 8.6, 10.8, 13.0, 15.2];
  const bollardGeo = createLatheProfileGeometry(
    [
      [0.18, 0.0],
      [0.14, 0.12],
      [0.11, 0.78],
      [0.13, 0.9],
      [0.06, 0.96],
    ],
    8
  );
  const bollardInst = new THREE.InstancedMesh(bollardGeo, gunmetalMat, barrierPositions.length);
  bollardInst.castShadow = true;
  bollardInst.receiveShadow = true;

  const railGeo = createChamferSlabGeometry(2.15, 0.08, 0.1, 0.03, 0.008);
  const railInst = new THREE.InstancedMesh(railGeo, cyanNeonMat, barrierPositions.length);
  const dummy = new THREE.Object3D();

  barrierPositions.forEach((bx, idx) => {
    dummy.position.set(bx, 0.14, 13.15);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bollardInst.setMatrixAt(idx, dummy.matrix);

    const railX = bx < 0 ? bx + 1.05 : bx - 1.05;
    dummy.position.set(railX, 0.74, 13.15);
    dummy.scale.set(idx === 5 || idx === 6 ? 0.45 : 1, 1, 1);
    dummy.updateMatrix();
    railInst.setMatrixAt(idx, dummy.matrix);
  });
  bollardInst.instanceMatrix.needsUpdate = true;
  railInst.instanceMatrix.needsUpdate = true;
  group.add(bollardInst, railInst);

  // Sleek Cyber Entrance Gate Arch (x = 0, z = 13.15)
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0.14, 13.15);
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(createChamferSlabGeometry(0.46, 2.35, 0.46, 0.08, 0.02), towerRibMat);
    pillar.position.set(sx * 2.25, 0, 0);
    const glowStrip = new THREE.Mesh(createChamferSlabGeometry(0.1, 2.1, 0.5, 0.02, 0.008), cyanNeonMat);
    glowStrip.position.set(sx * 2.25, 0.1, 0);
    enableShadows(pillar);
    gateGroup.add(pillar, glowStrip);
  }
  const gateBeam = new THREE.Mesh(createChamferSlabGeometry(5.1, 0.34, 0.52, 0.1, 0.02), gunmetalMat);
  gateBeam.position.set(0, 2.28, 0);
  const gateNeon = new THREE.Mesh(createChamferSlabGeometry(4.6, 0.08, 0.58, 0.03, 0.008), violetNeonMat);
  gateNeon.position.set(0, 2.62, 0);
  enableShadows(gateBeam);
  gateGroup.add(gateBeam, gateNeon);
  group.add(gateGroup);

  // Modern Metallic Street Benches (InstancedMesh)
  const benchPositions: Array<[number, number, number]> = [
    [-6.2, 7.0, 0],
    [6.2, 7.0, 0],
    [-6.2, 3.5, Math.PI],
    [6.2, 3.5, Math.PI],
    [-6.6, -5.4, 0],
    [6.6, -5.4, 0],
  ];
  const benchSeatGeo = createChamferSlabGeometry(1.75, 0.12, 0.62, 0.08, 0.015);
  const benchFrameGeo = createChamferSlabGeometry(1.88, 0.3, 0.68, 0.08, 0.015);
  const benchSeatInst = new THREE.InstancedMesh(benchSeatGeo, brushedSteelMat, benchPositions.length);
  const benchFrameInst = new THREE.InstancedMesh(benchFrameGeo, darkHullMat, benchPositions.length);
  benchSeatInst.castShadow = true;
  benchSeatInst.receiveShadow = true;
  benchFrameInst.castShadow = true;
  benchPositions.forEach(([bx, bz, rotY], idx) => {
    dummy.position.set(bx, 0.44, bz);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    benchSeatInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(bx, 0.14, bz);
    dummy.updateMatrix();
    benchFrameInst.setMatrixAt(idx, dummy.matrix);
  });
  benchSeatInst.instanceMatrix.needsUpdate = true;
  benchFrameInst.instanceMatrix.needsUpdate = true;
  group.add(benchFrameInst, benchSeatInst);

  // Futuristic Cyberpunk Streetlights
  const lampPostSpecs: Array<[number, number, boolean]> = [
    [-4.6, 2.2, true],
    [4.6, 2.2, false],
    [-4.6, -5.0, false],
    [4.6, -5.0, true],
    [-4.6, 7.0, true],
    [4.6, 7.0, false],
    [-4.6, 11.4, false],
    [4.6, 11.4, true],
  ];
  const lampArmPts: [number, number][] = [
    [-0.08, 0.0],
    [0.08, 0.0],
    [0.08, 2.75],
    [0.72, 3.05],
    [0.72, 3.18],
    [-0.08, 2.9],
  ];
  const lampArmGeo = createExtrudedProfileGeometry(lampArmPts, 0.16, 0.015);

  for (const [lx, lz, isCyan] of lampPostSpecs) {
    const lg = new THREE.Group();
    lg.position.set(lx, 0.14, lz);
    lg.rotation.y = lx < 0 ? 0 : Math.PI;

    const base = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.24, 0.0],
          [0.22, 0.16],
          [0.14, 0.34],
        ],
        8
      ),
      towerRibMat
    );
    const pole = new THREE.Mesh(lampArmGeo, gunmetalMat);
    const lampHood = new THREE.Mesh(createChamferSlabGeometry(0.68, 0.12, 0.28, 0.05, 0.01), darkHullMat);
    lampHood.position.set(0.62, 3.06, 0);

    const bulbStrip = new THREE.Mesh(
      createChamferSlabGeometry(0.54, 0.05, 0.18, 0.02, 0.006),
      warmLampMat
    );
    bulbStrip.position.set(0.62, 2.99, 0);

    const accentRing = new THREE.Mesh(
      createChamferSlabGeometry(0.24, 0.08, 0.24, 0.04, 0.008),
      isCyan ? cyanNeonMat : violetNeonMat
    );
    accentRing.position.set(0, 1.55, 0);

    enableShadows(base);
    enableShadows(pole);
    lg.add(base, pole, lampHood, bulbStrip, accentRing);
    group.add(lg);
  }

  // 4 Corner Modern Cyber Holo-Tree Planters (Clean strictly stacked geometry, non-intersecting holo crystals!)
  for (const [px, pz, baseY, isCyan] of [
    [-17.2, -14.2, 0.18, true],
    [17.2, -14.2, 0.18, false],
    [-17.4, 10.6, 0.14, false],
    [17.4, 10.6, 0.14, true],
  ] as Array<[number, number, number, boolean]>) {
    const planter = new THREE.Group();
    planter.position.set(px, baseY, pz);

    const curb = new THREE.Mesh(createChamferSlabGeometry(4.0, 0.28, 4.0, 0.45, 0.02), towerRibMat);
    const pad = new THREE.Mesh(createChamferSlabGeometry(3.35, 0.14, 3.35, 0.35, 0.015), darkHullMat);
    pad.position.y = 0.28;
    const neonRim = new THREE.Mesh(
      createChamferSlabGeometry(2.35, 0.06, 2.35, 0.28, 0.008),
      isCyan ? cyanNeonMat : magentaNeonMat
    );
    neonRim.position.y = 0.42;

    const trunk = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.42, 0.0],
          [0.24, 0.42],
          [0.18, 1.48],
          [0.32, 1.95],
        ],
        6
      ),
      gunmetalMat
    );
    trunk.position.y = 0.48;

    const crownMat = isCyan ? cyanNeonMat : violetNeonMat;
    const crownAccentMat = isCyan ? magentaNeonMat : cyanNeonMat;
    // Stylized Cyber-Botanical Canopy with branched trunk & faceted polyhedral foliage clusters
    const canopyCrown = createCyberBotanicalCanopy({
      barkMat: gunmetalMat,
      foliageMat: crownMat,
      accentMat: crownAccentMat,
      scale: 1.25,
    });
    canopyCrown.position.set(0, 2.34, 0);
    planter.add(canopyCrown);

    enableShadows(curb);
    enableShadows(trunk);
    planter.add(curb, pad, neonRim, trunk);
    group.add(planter);
  }

  // Perimeter City Relay Pylons around Island Flanks (well clear of camera sky behind Gem Tower)
  for (const [rx, rz, baseY, h, isCyan] of [
    [-18.8, -15.4, 0.18, 2.4, true],
    [18.8, -15.4, 0.18, 2.4, false],
    [-18.8, -7.8, 0.18, 2.8, false],
    [18.8, -7.8, 0.18, 2.8, true],
    [-18.8, 3.6, 0.14, 2.2, true],
    [18.8, 3.6, 0.14, 2.2, false],
  ] as Array<[number, number, number, number, boolean]>) {
    const pylon = new THREE.Group();
    pylon.position.set(rx, baseY, rz);
    const base = new THREE.Mesh(createChamferSlabGeometry(1.3, 0.3, 1.3, 0.18, 0.02), towerRibMat);
    const tower = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.42, 0.3],
          [0.3, h * 0.7],
          [0.18, h],
        ],
        6
      ),
      containerDarkMat
    );
    const tip = createCyberMonolithForkFinial({
      frameMat: towerRibMat,
      steelMat: brushedSteelMat,
      coreMat: isCyan ? cyanNeonMat : violetNeonMat,
      scale: 1.15,
    });
    tip.position.y = h - 0.04;
    enableShadows(base);
    enableShadows(tower);
    pylon.add(base, tower, tip);
    group.add(pylon);
  }

  // Two Cyber Sky-Bridges & Hovering Helipad Relay Outposts (Left & Right)
  for (const side of [-1, 1] as const) {
    const bx = side * 22.8;
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(bx, 0.0, -2.2);

    const deck = new THREE.Mesh(createChamferSlabGeometry(4.4, 0.26, 2.5, 0.12, 0.02), gunmetalMat);
    for (const rz of [-1.12, 1.12]) {
      const sideRail = new THREE.Mesh(
        createChamferSlabGeometry(4.2, 0.1, 0.12, 0.03, 0.008),
        side < 0 ? cyanNeonMat : violetNeonMat
      );
      sideRail.position.set(0, 0.45, rz);
      bridgeGroup.add(sideRail);
    }
    enableShadows(deck);
    bridgeGroup.add(deck);
    group.add(bridgeGroup);

    const isletX = side * 28.4;
    const isletGroup = new THREE.Group();
    isletGroup.position.set(isletX, 0.0, -2.2);

    const turbineUnder = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [1.6, -2.1],
          [3.6, -1.0],
          [4.6, -0.1],
        ],
        8
      ),
      darkHullMat
    );
    const padTop = new THREE.Mesh(createChamferSlabGeometry(7.8, 0.28, 7.8, 1.8, 0.03), slateConcreteMat);
    const helipadRing = new THREE.Mesh(
      new THREE.RingGeometry(2.3, 2.65, 24),
      new THREE.MeshBasicMaterial({ color: side < 0 ? 0x22d3ee : 0xe879f9, side: THREE.DoubleSide })
    );
    helipadRing.rotation.x = -Math.PI / 2;
    helipadRing.position.y = 0.3;

    const shard = createCyberCrystalCluster({
      frameMat: towerRibMat,
      crystalMat: side < 0 ? cyanNeonMat : magentaNeonMat,
      accentMat: side < 0 ? violetNeonMat : cyanNeonMat,
      scale: 1.65,
      shardCount: 5,
    });
    shard.position.y = 1.25;
    animatedCrystals.push(shard);

    enableShadows(padTop);
    isletGroup.add(turbineUnder, padTop, helipadRing, shard);
    group.add(isletGroup);
  }

  // Front-Right Cyber Maglev Cargo Dock (x = 10.4, z = 9.0)
  const dockGroup = new THREE.Group();
  dockGroup.position.set(10.4, 0.14, 9.0);
  const dockPad = new THREE.Mesh(createChamferSlabGeometry(6.2, 0.18, 3.4, 0.35, 0.02), towerRibMat);
  const dockRail = new THREE.Mesh(createChamferSlabGeometry(5.6, 0.06, 0.14, 0.03, 0.008), cyanNeonMat);
  dockRail.position.set(0, 0.18, 1.55);

  const cargoHull = new THREE.Mesh(createChamferSlabGeometry(3.4, 1.05, 1.55, 0.28, 0.025), containerMidMat);
  cargoHull.position.set(0.35, 0.42, 0);
  const cargoWindshield = new THREE.Mesh(createChamferSlabGeometry(0.65, 0.52, 1.32, 0.12, 0.015), cyanNeonMat);
  cargoWindshield.position.set(-1.15, 0.72, 0);
  const cargoCrate = new THREE.Mesh(createChamferSlabGeometry(0.95, 0.78, 0.95, 0.12, 0.018), containerDarkMat);
  cargoCrate.position.set(-2.25, 0.18, 0.45);
  const cargoGlow = new THREE.Mesh(createChamferSlabGeometry(0.98, 0.08, 0.98, 0.12, 0.008), amberNeonMat);
  cargoGlow.position.set(-2.25, 0.96, 0.45);

  enableShadows(dockPad);
  enableShadows(cargoHull);
  enableShadows(cargoCrate);
  dockGroup.add(dockPad, dockRail, cargoHull, cargoWindshield, cargoCrate, cargoGlow);
  group.add(dockGroup);

  // =========================================================================
  // 2. MONUMEN TENGAH: CIRCULAR ROUNDABOUT + CYBER NEON FOUNTAIN (x = 0, z = -0.5)
  // =========================================================================
  const roundaboutGroup = new THREE.Group();
  roundaboutGroup.position.set(0, 0, -0.5);

  // Dark road-grade junction apron so roundabout blends cleanly into both asphalt lanes & plaza floor
  const roundaboutApron = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [4.74, 0.135],
        [4.6, 0.192],
        [4.05, 0.192],
      ],
      40
    ),
    roadAsphaltMat
  );
  roundaboutApron.receiveShadow = true;

  // Soft radial contact shadow hugging outer curb perimeter (r = 4.22 -> 4.60)
  const roundaboutShadowTex = createRoundaboutShadowTexture(4.18 / 4.64, 1.0);
  if (roundaboutShadowTex) ownedTextures.push(roundaboutShadowTex);
  const roundaboutShadowMat = new THREE.MeshBasicMaterial({
    ...(roundaboutShadowTex ? { map: roundaboutShadowTex } : {}),
    color: roundaboutShadowTex ? 0xffffff : 0x050811,
    transparent: true,
    opacity: roundaboutShadowTex ? 1.0 : 0.34,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const roundaboutContactShadow = new THREE.Mesh(
    new THREE.RingGeometry(4.06, 4.64, 48),
    roundaboutShadowMat
  );
  roundaboutContactShadow.rotation.x = -Math.PI / 2;
  roundaboutContactShadow.position.y = 0.196;

  // Raised circular curb wall (dark urban slate-steel matching plaza)
  const roundaboutCurb = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [4.24, 0.185],
        [4.2, 0.305],
        [4.12, 0.348],
        [3.98, 0.348],
        [3.96, 0.325],
      ],
      40
    ),
    towerPanelMat
  );
  enableShadows(roundaboutCurb);

  // Raised circular sidewalk deck inside curb (y = 0.35)
  const roundaboutDeck = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [3.98, 0.325],
        [3.98, 0.35],
        [0.05, 0.35],
      ],
      40
    ),
    slateConcreteMat
  );
  roundaboutDeck.receiveShadow = true;

  // Thin glowing neon trim along upper roundabout curb rim
  const roundaboutTrimMat = makeNeonMat(0x22d3ee, 0.95, 0.06, 1.8, 0.8);
  const roundaboutTrimGeo = new THREE.TorusGeometry(4.11, 0.026, 6, 56);
  roundaboutTrimGeo.rotateX(Math.PI / 2);
  const roundaboutNeonTrim = new THREE.Mesh(roundaboutTrimGeo, roundaboutTrimMat);
  roundaboutNeonTrim.position.y = 0.352;

  roundaboutGroup.add(
    roundaboutApron,
    roundaboutContactShadow,
    roundaboutCurb,
    roundaboutDeck,
    roundaboutNeonTrim
  );
  group.add(roundaboutGroup);

  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0.35, -0.5);

  const basinOuter = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [3.15, 0.0],
        [3.05, 0.26],
        [2.75, 0.44],
        [2.45, 0.44],
        [2.3, 0.18],
        [0.05, 0.18],
      ],
      16
    ),
    towerRibMat
  );
  const plasmaPool = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 2.38, 28),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.58, side: THREE.DoubleSide })
  );
  plasmaPool.rotation.x = -Math.PI / 2;
  plasmaPool.position.y = 0.24;

  const reactorPedestal = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [1.15, 0.18],
        [0.85, 0.55],
        [0.62, 0.95],
        [0.88, 1.15],
        [0.52, 1.32],
      ],
      10
    ),
    gunmetalMat
  );

  const clawPts: [number, number][] = [
    [0.55, 0.35],
    [1.05, 0.95],
    [0.82, 1.75],
    [0.64, 1.68],
    [0.82, 0.95],
    [0.42, 0.42],
  ];
  const clawGeo = createExtrudedProfileGeometry(clawPts, 0.18, 0.015);
  for (let c = 0; c < 4; c++) {
    const arm = new THREE.Mesh(clawGeo, containerMidMat);
    arm.rotation.y = (c / 4) * Math.PI * 2 + Math.PI * 0.25;
    enableShadows(arm);
    fountainGroup.add(arm);
  }

  const medRing = new THREE.Mesh(
    new THREE.RingGeometry(3.15, 3.24, 48),
    new THREE.MeshBasicMaterial({ color: 0xd946ef, side: THREE.DoubleSide })
  );
  medRing.rotation.x = -Math.PI / 2;
  medRing.position.y = 0.012;

  const outerReactorRingGeo = new THREE.TorusGeometry(1.12, 0.055, 6, 24);
  outerReactorRingGeo.rotateX(Math.PI / 2);
  const outerReactorRing = new THREE.Mesh(outerReactorRingGeo, cyanNeonMat);
  outerReactorRing.position.y = 1.38;
  animatedRings.push(outerReactorRing);

  const innerReactorRingGeo = new THREE.TorusGeometry(0.76, 0.04, 6, 20);
  innerReactorRingGeo.rotateX(Math.PI / 2);
  const innerReactorRing = new THREE.Mesh(innerReactorRingGeo, magentaNeonMat);
  innerReactorRing.position.y = 1.62;
  animatedRings.push(innerReactorRing);

  const floatingReactorCrystal = createCyberCrystalCluster({
    frameMat: towerRibMat,
    crystalMat: magentaNeonMat,
    accentMat: cyanNeonMat,
    scale: 1.25,
    shardCount: 5,
  });
  floatingReactorCrystal.position.y = 1.55;
  animatedCrystals.push(floatingReactorCrystal);

  for (const [tx, tz] of [
    [-2.5, -2.5],
    [2.5, -2.5],
    [-2.5, 2.5],
    [2.5, 2.5],
  ]) {
    const term = new THREE.Group();
    term.position.set(tx, 0, tz);
    term.lookAt(0, 0.14, 0);

    const stand = new THREE.Mesh(createChamferSlabGeometry(0.72, 1.18, 0.52, 0.08, 0.016), gunmetalMat);
    const consoleTop = new THREE.Mesh(createChamferSlabGeometry(0.84, 0.12, 0.62, 0.06, 0.012), containerDarkMat);
    consoleTop.position.y = 1.18;
    consoleTop.rotation.x = 0.38;
    const screenGlow = new THREE.Mesh(createChamferSlabGeometry(0.68, 0.04, 0.46, 0.04, 0.006), cyanNeonMat);
    screenGlow.position.set(0, 1.28, 0.02);
    screenGlow.rotation.x = 0.38;

    enableShadows(stand);
    term.add(stand, consoleTop, screenGlow);
    fountainGroup.add(term);
  }

  enableShadows(basinOuter);
  enableShadows(reactorPedestal);
  fountainGroup.add(
    basinOuter,
    plasmaPool,
    reactorPedestal,
    medRing,
    outerReactorRing,
    innerReactorRing,
    floatingReactorCrystal
  );
  group.add(fountainGroup);

  // =========================================================================
  // 3. CYBER KIOSKS: TALLER BUILDINGS, WIDE FRONT DECKS, ZERO PROP CLIPPING
  // =========================================================================

  /** Creates a non-overlapping cyber deck with an inset slate top and glowing outer perimeter skirt. */
  const createShopPadMeshes = (
    width: number,
    depth: number,
    zCenter: number,
    neonMat: THREE.MeshStandardMaterial
  ): [THREE.Mesh, THREE.Mesh] => {
    const padTrim = new THREE.Mesh(
      createChamferSlabGeometry(width + 0.22, 0.08, depth + 0.22, 0.25, 0.008),
      neonMat
    );
    padTrim.position.set(0, 0, zCenter);
    const pad = new THREE.Mesh(
      createChamferSlabGeometry(width, 0.14, depth, 0.22, 0.018),
      slateConcreteMat
    );
    pad.position.set(0, 0.08, zCenter);
    pad.receiveShadow = true;
    return [padTrim, pad];
  };

  // 3a. PICKAXE CYBER-ARMORY KIOSK (x = -11.4, z = -9.6)
  {
    const armory = new THREE.Group();
    armory.position.set(-11.4, 0.18, -9.6);

    const [padTrim, pad] = createShopPadMeshes(5.72, 4.92, 0.25, cyanNeonMat);

    const container = buildCyberContainerShell(4.4, 2.95, 2.15, cyanNeonMat);
    container.position.set(0, 0.22, -0.75);

    addHologramSign(
      armory,
      0,
      3.85,
      0.35,
      2.85,
      0.92,
      'PICKAXE ARMORY',
      'LASER DRILLS & GEAR',
      '#38bdf8',
      blueNeonMat
    );

    // Front Open Deck Props (z = +1.45, cleanly ahead of awning tip z = +1.0)
    const vending = buildCyberVendingMachine(1.65, 0.22, 1.48, blueNeonMat, -0.22, [0x38bdf8, 0x22d3ee, 0xe0f2fe]);
    const workbench = new THREE.Mesh(createChamferSlabGeometry(1.75, 0.92, 0.96, 0.1, 0.016), gunmetalMat);
    workbench.position.set(-0.95, 0.22, 1.52);
    const benchHolo = new THREE.Mesh(createChamferSlabGeometry(1.45, 0.05, 0.72, 0.05, 0.006), cyanNeonMat);
    benchHolo.position.set(-0.95, 1.14, 1.52);

    const pickDisplay = new THREE.Group();
    pickDisplay.position.set(-0.95, 1.72, 1.52);
    pickDisplay.rotation.z = 0.48;
    const pickShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 1.1, 6), brushedSteelMat);
    const pickHead = new THREE.Mesh(
      createExtrudedProfileGeometry(
        [
          [-0.54, 0.08],
          [0, 0.24],
          [0.54, 0.08],
          [0.34, -0.06],
          [0, 0.06],
          [-0.34, -0.06],
        ],
        0.1,
        0.012
      ),
      cyanNeonMat
    );
    pickHead.position.y = 0.44;
    pickDisplay.add(pickShaft, pickHead);
    animatedCrystals.push(pickDisplay);

    enableShadows(workbench);
    armory.add(pad, padTrim, container, vending, workbench, benchHolo, pickDisplay);
    group.add(armory);
  }

  // 3b. SELL ITEMS CYBER-EXCHANGE KIOSK (x = -10.2, z = 0.8)
  {
    const market = new THREE.Group();
    market.position.set(-10.2, 0.18, 0.8);

    const [padTrim, pad] = createShopPadMeshes(5.52, 4.22, 0.15, emeraldNeonMat);

    const container = buildCyberContainerShell(4.3, 2.8, 1.95, emeraldNeonMat);
    container.position.set(0, 0.22, -0.75);

    addHologramSign(
      market,
      0,
      3.62,
      0.28,
      2.75,
      0.88,
      'CYBER EXCHANGE',
      'SELL ORES & UNITS',
      '#4ade80',
      emeraldNeonMat
    );

    const termLeft = buildCyberVendingMachine(-1.68, 0.22, 1.32, emeraldNeonMat, 0.22, [0x4ade80, 0xfacc15, 0x22d3ee]);
    const crate1 = new THREE.Mesh(createChamferSlabGeometry(1.1, 0.82, 1.05, 0.1, 0.016), containerMidMat);
    crate1.position.set(-0.22, 0.22, 1.38);
    const crate1Glow = new THREE.Mesh(createChamferSlabGeometry(1.14, 0.06, 1.08, 0.1, 0.006), emeraldNeonMat);
    crate1Glow.position.set(-0.22, 1.04, 1.38);

    const creditPod = new THREE.Mesh(createChamferSlabGeometry(0.98, 0.64, 0.98, 0.1, 0.015), gunmetalMat);
    creditPod.position.set(1.48, 0.22, 1.32);
    const creditCrystal = createCyberCrystalCluster({
      frameMat: gunmetalMat,
      crystalMat: emeraldNeonMat,
      accentMat: cyanNeonMat,
      scale: 0.9,
      shardCount: 4,
    });
    creditCrystal.position.set(1.48, 1.16, 1.32);
    animatedCrystals.push(creditCrystal);

    enableShadows(crate1);
    enableShadows(creditPod);
    market.add(pad, padTrim, container, termLeft, crate1, crate1Glow, creditPod, creditCrystal);
    group.add(market);
  }

  // 3c. RELIC FORGE PLASMA FOUNDRY (x = 10.2, z = 0.8)
  {
    const forge = new THREE.Group();
    forge.position.set(10.2, 0.18, 0.8);

    const [padTrim, pad] = createShopPadMeshes(5.42, 4.22, 0.15, amberNeonMat);

    const container = buildCyberContainerShell(3.4, 2.85, 1.9, amberNeonMat);
    container.position.set(-0.75, 0.22, -0.75);

    addHologramSign(
      forge,
      -0.75,
      3.65,
      0.26,
      2.65,
      0.86,
      'PLASMA FORGE',
      'CRAFT CYBER RELICS',
      '#f97316',
      amberNeonMat
    );

    // Tall Industrial Plasma Energy Furnace cleanly beside container on the right
    const furnace = new THREE.Group();
    furnace.position.set(1.68, 0.22, -0.25);

    const furnaceBase = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.86, 0.0],
          [0.8, 0.56],
          [0.6, 0.72],
        ],
        8
      ),
      gunmetalMat
    );
    const furnaceTop = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.6, 1.68],
          [0.82, 1.92],
          [0.72, 2.55],
          [0.42, 3.0],
        ],
        8
      ),
      containerDarkMat
    );
    const plasmaCore = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), amberNeonMat);
    plasmaCore.position.y = 1.2;

    const plasmaRingGeo = new THREE.TorusGeometry(0.56, 0.05, 6, 18);
    plasmaRingGeo.rotateX(Math.PI / 2);
    const plasmaRing1 = new THREE.Mesh(plasmaRingGeo, amberNeonMat);
    plasmaRing1.position.y = 0.92;
    const plasmaRing2 = new THREE.Mesh(plasmaRingGeo, amberNeonMat);
    plasmaRing2.position.y = 1.48;
    animatedRings.push(plasmaRing1, plasmaRing2);

    for (let s = 0; s < 3; s++) {
      const ang = (s / 3) * Math.PI * 2 + 0.4;
      const strut = new THREE.Mesh(createChamferSlabGeometry(0.16, 1.25, 0.18, 0.03, 0.01), towerRibMat);
      strut.position.set(Math.cos(ang) * 0.62, 0.62, Math.sin(ang) * 0.62);
      enableShadows(strut);
      furnace.add(strut);
    }

    enableShadows(furnaceBase);
    enableShadows(furnaceTop);
    furnace.add(furnaceBase, furnaceTop, plasmaCore, plasmaRing1, plasmaRing2);

    // Laser-Anvil Calibration Table + Plasma Conduit Pipe cleanly in front
    const laserAnvil = new THREE.Mesh(createChamferSlabGeometry(1.38, 0.98, 0.92, 0.1, 0.016), gunmetalMat);
    laserAnvil.position.set(-0.75, 0.22, 1.35);
    const anvilPad = new THREE.Mesh(createChamferSlabGeometry(1.06, 0.06, 0.68, 0.05, 0.008), amberNeonMat);
    anvilPad.position.set(-0.75, 1.2, 1.35);

    const pipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.25, 0.85, 0.25),
      new THREE.Vector3(0.55, 0.45, 0.92),
      new THREE.Vector3(-0.2, 0.72, 1.32),
    ]);
    const plasmaPipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 10, 0.085, 6, false), amberNeonMat);

    enableShadows(laserAnvil);
    forge.add(pad, padTrim, container, furnace, laserAnvil, anvilPad, plasmaPipe);
    group.add(forge);
  }

  // 3d. GEM & ELIXIR CYBER-MART EMPORIUM (x = 11.4, z = -9.6)
  {
    const emporium = new THREE.Group();
    emporium.position.set(11.4, 0.18, -9.6);

    const [padTrim, pad] = createShopPadMeshes(5.72, 4.92, 0.25, magentaNeonMat);

    const lowerBay = buildCyberContainerShell(4.4, 2.85, 2.1, magentaNeonMat);
    lowerBay.position.set(0, 0.22, -0.75);

    const upperBay = new THREE.Mesh(createChamferSlabGeometry(2.95, 1.85, 1.95, 0.18, 0.025), containerMidMat);
    upperBay.position.set(0, 3.07, -0.75);
    const upperWindow = new THREE.Mesh(createChamferSlabGeometry(2.35, 0.82, 0.12, 0.06, 0.01), violetNeonMat);
    upperWindow.position.set(0, 3.55, 0.24);
    const upperCrown = new THREE.Mesh(createChamferSlabGeometry(3.1, 0.2, 2.1, 0.18, 0.015), gunmetalMat);
    upperCrown.position.set(0, 4.92, -0.75);

    addHologramSign(
      emporium,
      0,
      5.76,
      0.34,
      2.9,
      0.92,
      'CYBER GEM MART',
      'ELIXIRS & BOOSTS',
      '#f472b6',
      magentaNeonMat
    );

    const vend1 = buildCyberVendingMachine(-1.72, 0.22, 1.48, magentaNeonMat, 0.18, [0xf97316, 0xfacc15, 0x22c55e]);
    const vend2 = buildCyberVendingMachine(1.75, 0.22, 1.45, cyanNeonMat, -0.22, [0x06b6d4, 0xec4899, 0xa855f7]);

    const barCounter = new THREE.Mesh(createChamferSlabGeometry(1.95, 0.82, 0.78, 0.08, 0.014), gunmetalMat);
    barCounter.position.set(0.02, 0.22, 1.56);

    const bottleColors = [0xf97316, 0xfacc15, 0x22c55e, 0x06b6d4, 0xec4899];
    const flaskGeo = createLatheProfileGeometry(
      [
        [0.11, 0.0],
        [0.15, 0.14],
        [0.12, 0.28],
        [0.06, 0.4],
        [0.08, 0.48],
      ],
      8
    );
    for (let i = 0; i < bottleColors.length; i++) {
      const bottle = new THREE.Mesh(flaskGeo, makeNeonMat(bottleColors[i], 1.2, 0, 1, 0));
      bottle.position.set(-0.62 + i * 0.32, 1.04, 1.56);
      emporium.add(bottle);
    }

    enableShadows(upperBay);
    enableShadows(upperCrown);
    enableShadows(barCounter);
    emporium.add(pad, padTrim, lowerBay, upperBay, upperWindow, upperCrown, vend1, vend2, barCounter);
    group.add(emporium);
  }

  // =========================================================================
  // 4. GEM TOWER CYBERPUNK SKYSCRAPER & FUTURISTIC ACCESS TERMINALS (x = 0, z = -11.4)
  // =========================================================================
  {
    const towerGroup = new THREE.Group();
    group.add(towerGroup);

    const lowerTerrace = new THREE.Mesh(createChamferSlabGeometry(13.4, 0.68, 8.8, 0.85, 0.03), towerRibMat);
    lowerTerrace.position.set(0, 0.0, -11.4);
    lowerTerrace.receiveShadow = true;

    const lowerNeon = new THREE.Mesh(createChamferSlabGeometry(13.65, 0.06, 9.05, 0.85, 0.008), violetNeonMat);
    lowerNeon.position.set(0, 0.68, -11.4);

    const upperTerrace = new THREE.Mesh(createChamferSlabGeometry(12.5, 0.62, 8.1, 0.75, 0.03), towerPanelMat);
    upperTerrace.position.set(0, 0.74, -11.4);
    upperTerrace.receiveShadow = true;

    const upperNeon = new THREE.Mesh(createChamferSlabGeometry(12.75, 0.06, 8.35, 0.75, 0.008), cyanNeonMat);
    upperNeon.position.set(0, 1.36, -11.4);

    const upperDeckCap = new THREE.Mesh(createChamferSlabGeometry(12.3, 0.04, 7.9, 0.72, 0.015), slateConcreteMat);
    upperDeckCap.position.set(0, 1.42, -11.4);
    upperDeckCap.receiveShadow = true;

    const terraceTopY = 1.46;
    towerGroup.add(lowerTerrace, lowerNeon, upperTerrace, upperNeon, upperDeckCap);

    // Futuristic Cyber Staircase
    const stairSteps = 6;
    for (let s = 0; s < stairSteps; s++) {
      const sy = 0.14 + s * 0.21;
      const sz = -5.75 - s * 0.28;
      const step = new THREE.Mesh(createChamferSlabGeometry(3.2, 0.22, 0.34, 0.04, 0.012), gunmetalMat);
      step.position.set(0, sy, sz);
      const stepLed = new THREE.Mesh(createChamferSlabGeometry(3.0, 0.03, 0.05, 0.01, 0.004), cyanNeonMat);
      stepLed.position.set(0, sy + 0.2, sz + 0.14);
      enableShadows(step);
      towerGroup.add(step, stepLed);
    }
    for (const sx of [-1.72, 1.72]) {
      const railPost = new THREE.Mesh(createChamferSlabGeometry(0.28, 1.45, 0.36, 0.06, 0.015), towerRibMat);
      railPost.position.set(sx, 0.14, -5.8);
      const railGlow = new THREE.Mesh(createChamferSlabGeometry(0.12, 0.12, 2.1, 0.03, 0.008), cyanNeonMat);
      railGlow.position.set(sx, 1.35, -6.45);
      railGlow.rotation.x = 0.58;
      enableShadows(railPost);
      towerGroup.add(railPost, railGlow);
    }

    // Twin Futuristic Holographic Access Terminals in front of Terrace
    for (const tx of [-3.35, 3.35]) {
      const term = new THREE.Group();
      term.position.set(tx, 0.14, -6.2);
      term.rotation.y = tx < 0 ? 0.25 : -0.25;

      const base = new THREE.Mesh(createChamferSlabGeometry(1.15, 1.08, 0.72, 0.1, 0.018), towerRibMat);
      const holoScreen = new THREE.Mesh(createChamferSlabGeometry(0.95, 0.68, 0.08, 0.05, 0.01), cyanNeonMat);
      holoScreen.position.set(0, 1.38, 0.05);
      holoScreen.rotation.x = -0.22;
      const sideFin = new THREE.Mesh(createChamferSlabGeometry(0.14, 1.35, 0.45, 0.04, 0.01), violetNeonMat);
      sideFin.position.set(tx < 0 ? -0.55 : 0.55, 0.25, 0);

      enableShadows(base);
      term.add(base, holoScreen, sideFin);
      towerGroup.add(term);
    }

    // Flanking Cyber Data Obelisk Pylons
    for (const sx of [-4.9, 4.9]) {
      const ob = new THREE.Group();
      ob.position.set(sx, terraceTopY, -14.1);
      const plinth = new THREE.Mesh(createChamferSlabGeometry(1.2, 0.36, 1.2, 0.18, 0.02), gunmetalMat);
      const shaft = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.44, 0.36],
            [0.32, 1.5],
            [0.24, 2.45],
            [0.36, 2.6],
          ],
          6
        ),
        towerPanelMat
      );
      const obRingGeo = new THREE.TorusGeometry(0.42, 0.038, 6, 16);
      obRingGeo.rotateX(Math.PI / 2);
      const obRing = new THREE.Mesh(obRingGeo, violetNeonMat);
      obRing.position.y = 2.65;
      animatedRings.push(obRing);

      const crystal = createCyberMonolithForkFinial({
        frameMat: towerRibMat,
        steelMat: brushedSteelMat,
        coreMat: magentaNeonMat,
        scale: 1.2,
      });
      crystal.position.y = 2.58;

      enableShadows(plinth);
      enableShadows(shaft);
      ob.add(plinth, shaft, obRing, crystal);
      towerGroup.add(ob);
    }

    // Central Cyberpunk Skyscraper Tower (apex y ≈ 8.16, leaving generous room for emblem & badge below Back to Mine)
    const centralTower = new THREE.Group();
    centralTower.position.set(0, terraceTopY, -11.4);
    towerGroup.add(centralTower);

    const tier1 = new THREE.Mesh(createChamferSlabGeometry(3.55, 2.05, 3.25, 0.65, 0.04), towerPanelMat);
    const tier2 = new THREE.Mesh(createChamferSlabGeometry(2.85, 2.15, 2.6, 0.55, 0.04), containerDarkMat);
    tier2.position.y = 2.02;
    const tier3 = new THREE.Mesh(createChamferSlabGeometry(2.0, 1.48, 1.9, 0.4, 0.03), towerPanelMat);
    tier3.position.y = 4.14;
    const spireCap = new THREE.Mesh(createChamferSlabGeometry(1.25, 0.48, 1.25, 0.25, 0.02), gunmetalMat);
    spireCap.position.y = 5.6;

    for (const [rx, rz] of [
      [-1.58, 1.38],
      [1.58, 1.38],
      [-1.58, -1.38],
      [1.58, -1.38],
    ]) {
      const rib = new THREE.Mesh(createChamferSlabGeometry(0.32, 4.15, 0.32, 0.06, 0.015), towerRibMat);
      rib.position.set(rx, 0, rz);
      const neonStrip = new THREE.Mesh(
        createChamferSlabGeometry(0.1, 3.85, 0.1, 0.02, 0.008),
        rx < 0 ? cyanNeonMat : violetNeonMat
      );
      neonStrip.position.set(rx * 1.05, 0.15, rz * 1.05);
      enableShadows(rib);
      centralTower.add(rib, neonStrip);
    }

    const crownHaloGeo = new THREE.TorusGeometry(1.65, 0.06, 6, 28);
    crownHaloGeo.rotateX(Math.PI / 2);
    const crownHalo = new THREE.Mesh(crownHaloGeo, cyanNeonMat);
    crownHalo.position.y = 5.15;
    animatedRings.push(crownHalo);

    for (const ax of [-0.52, 0.52]) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.075, 0.72, 6), brushedSteelMat);
      ant.position.set(ax, 6.2, 0);
      const tip = createCyberMonolithForkFinial({
        frameMat: gunmetalMat,
        steelMat: brushedSteelMat,
        coreMat: ax < 0 ? cyanNeonMat : magentaNeonMat,
        scale: 0.5,
      });
      tip.position.set(ax, 6.54, 0);
      centralTower.add(ant, tip);
    }

    const portalArch = new THREE.Mesh(
      createExtrudedProfileGeometry(
        [
          [-1.05, 0.0],
          [-0.78, 1.72],
          [0.78, 1.72],
          [1.05, 0.0],
          [0.7, 0.0],
          [0.52, 1.4],
          [-0.52, 1.4],
          [-0.7, 0.0],
        ],
        0.48,
        0.02
      ),
      gunmetalMat
    );
    portalArch.position.set(0, 0, 1.66);
    const portalCore = new THREE.Mesh(createChamferSlabGeometry(1.08, 1.38, 0.14, 0.08, 0.01), cyanNeonMat);
    portalCore.position.set(0, 0.02, 1.68);

    const towerRing = new THREE.Mesh(
      new THREE.RingGeometry(2.45, 2.85, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    towerRing.rotation.x = -Math.PI / 2;
    towerRing.position.set(0, 0.02, 0.6);

    enableShadows(tier1);
    enableShadows(tier2);
    enableShadows(tier3);
    enableShadows(portalArch);
    centralTower.add(tier1, tier2, tier3, spireCap, crownHalo, portalArch, portalCore, towerRing);

    for (const tx of [-2.48, 2.48]) {
      const wing = new THREE.Group();
      wing.position.set(tx, terraceTopY, -11.65);

      const wingBody = new THREE.Mesh(createChamferSlabGeometry(1.45, 3.65, 1.45, 0.2, 0.025), containerDarkMat);
      const wingCrown = new THREE.Mesh(createChamferSlabGeometry(1.15, 0.68, 1.15, 0.16, 0.02), gunmetalMat);
      wingCrown.position.y = 3.62;
      const wingNeonEdge = new THREE.Mesh(
        createChamferSlabGeometry(0.12, 3.5, 0.12, 0.02, 0.008),
        tx < 0 ? cyanNeonMat : violetNeonMat
      );
      wingNeonEdge.position.set(tx < 0 ? -0.68 : 0.68, 0.08, 0.68);

      const bannerMat = tx < 0 ? blueNeonMat : magentaNeonMat;
      const holoBanner = new THREE.Mesh(createChamferSlabGeometry(0.1, 1.5, 0.68, 0.04, 0.008), bannerMat);
      holoBanner.position.set(tx < 0 ? -0.82 : 0.82, 2.25, 0.25);

      enableShadows(wingBody);
      enableShadows(wingCrown);
      wing.add(wingBody, wingCrown, wingNeonEdge, holoBanner);
      towerGroup.add(wing);
    }

    // Glowing Window Grids across Central & Flanking Gem Tower Facades (InstancedMesh)
    const gemWinGeo = new THREE.PlaneGeometry(0.42, 0.24);
    const cyanWinMatrices: THREE.Matrix4[] = [];
    const violetWinMatrices: THREE.Matrix4[] = [];
    const pushWin = (list: THREE.Matrix4[], x: number, y: number, z: number, ry = 0): void => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, ry, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    };

    for (let row = 0; row < 5; row++) {
      const wy = terraceTopY + 2.3 + row * 0.38;
      for (const wx of [-0.74, 0, 0.74]) {
        pushWin(row % 2 === 0 ? cyanWinMatrices : violetWinMatrices, wx, wy, -11.4 + 1.35, 0);
      }
      for (const wz of [-11.85, -10.95]) {
        pushWin(cyanWinMatrices, -1.46, wy, wz, -Math.PI / 2);
        pushWin(violetWinMatrices, 1.46, wy, wz, Math.PI / 2);
      }
    }
    for (let row = 0; row < 3; row++) {
      const wy = terraceTopY + 4.42 + row * 0.38;
      for (const wx of [-0.36, 0.36]) {
        pushWin(violetWinMatrices, wx, wy, -11.4 + 0.99, 0);
      }
    }
    for (const tx of [-2.48, 2.48]) {
      for (let row = 0; row < 7; row++) {
        const wy = terraceTopY + 0.58 + row * 0.44;
        for (const ox of [-0.32, 0.32]) {
          pushWin(tx < 0 ? cyanWinMatrices : violetWinMatrices, tx + ox, wy, -11.65 + 0.76, 0);
        }
      }
    }

    const gemCyanWins = new THREE.InstancedMesh(gemWinGeo, cyanNeonMat, cyanWinMatrices.length);
    cyanWinMatrices.forEach((m, i) => gemCyanWins.setMatrixAt(i, m));
    gemCyanWins.instanceMatrix.needsUpdate = true;

    const gemVioletWins = new THREE.InstancedMesh(gemWinGeo, violetNeonMat, violetWinMatrices.length);
    violetWinMatrices.forEach((m, i) => gemVioletWins.setMatrixAt(i, m));
    gemVioletWins.instanceMatrix.needsUpdate = true;

    towerGroup.add(gemCyanWins, gemVioletWins);
  }

  const update = (dtSec: number, elapsed: number): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    const t = elapsed + safeDt * 0.001;

    for (let i = 0; i < animatedCrystals.length; i++) {
      const obj = animatedCrystals[i];
      obj.rotation.y = t * 0.95 + i * 0.7;
    }

    for (let i = 0; i < animatedRings.length; i++) {
      const ring = animatedRings[i];
      ring.rotation.y = (i % 2 === 0 ? 1 : -1) * t * 0.85;
    }

    for (let i = 0; i < pulseMaterials.length; i++) {
      const pm = pulseMaterials[i];
      pm.mat.emissiveIntensity = pm.base + Math.sin(t * pm.speed + pm.phase) * pm.amp;
    }
  };

  const dispose = (): void => {
    const disposedGeos = new Set<THREE.BufferGeometry>();
    const disposedMats = new Set<THREE.Material>();

    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (!disposedGeos.has(child.geometry)) {
        disposedGeos.add(child.geometry);
        child.geometry.dispose();
      }
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (disposedMats.has(mat)) continue;
        disposedMats.add(mat);
        mat.dispose();
      }
    });

    for (const tex of ownedTextures) {
      tex.dispose();
    }
    ownedTextures.length = 0;
  };

  return {
    group,
    animatedCrystals,
    animatedRings,
    update,
    dispose,
  };
}
