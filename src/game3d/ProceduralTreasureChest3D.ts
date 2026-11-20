import * as THREE from 'three';

export interface ProceduralChestOptions {
  scale?: number;
  woodColor?: number;
  trimColor?: number;
  ironColor?: number;
  gemColor?: number | string;
}

export interface ProceduralChestHandle {
  group: THREE.Group;
  lidPivot: THREE.Group;
  setAccentColor: (color: number | string) => void;
  setInteraction: (hovered: boolean, bounce: number, elapsed: number) => void;
  dispose: () => void;
}

export function disposeObject3D(
  root: THREE.Object3D,
  excludedMaterials?: ReadonlySet<THREE.Material>
): void {
  const disposedGeos = new Set<THREE.BufferGeometry>();
  const disposedMats = new Set<THREE.Material>();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    if (!disposedGeos.has(child.geometry)) {
      disposedGeos.add(child.geometry);
      child.geometry.dispose();
    }

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (excludedMaterials?.has(mat) || disposedMats.has(mat)) continue;
      disposedMats.add(mat);
      mat.dispose();
    }
  });
}


function createChamferRectShape(width: number, depth: number, chamfer: number): THREE.Shape {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const c = Math.min(chamfer, hw * 0.45, hd * 0.45);
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
  return shape;
}

export function createExtrudedSlabGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevelSize = 0.03
): THREE.ExtrudeGeometry {
  const shape = createChamferRectShape(width, depth, chamfer);
  const innerDepth = Math.max(0.02, height - bevelSize * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 1,
    curveSegments: 1,
  });
  // Extrude runs along +Z; rotate -90 deg around X so extrusion rises along +Y, bottom at y = 0
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevelSize, 0);
  geo.computeVertexNormals();
  return geo;
}

export function createVaultArchProfileGeometry(
  spanX: number,
  archWidthZ: number,
  archHeight: number,
  bevel = 0.022
): THREE.ExtrudeGeometry {
  const hz = archWidthZ * 0.5;
  const shoulderY = archHeight * 0.46;
  const topHalfZ = hz * 0.52;

  const shape = new THREE.Shape();
  shape.moveTo(-hz, 0);
  shape.lineTo(hz, 0);
  shape.lineTo(hz * 0.94, shoulderY);
  shape.lineTo(topHalfZ, archHeight);
  shape.lineTo(-topHalfZ, archHeight);
  shape.lineTo(-hz * 0.94, shoulderY);
  shape.closePath();

  const innerX = Math.max(0.04, spanX - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerX,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  // Rotate so extrusion span runs centered along X, arch width along Z, height from y = 0 upward
  geo.rotateY(Math.PI / 2);
  geo.translate(-innerX * 0.5, bevel, 0);
  geo.computeVertexNormals();
  return geo;
}


/**
 * Creates the full Right-Wing Plasma Ore Refinery & Cyber Vault Escalator Bridge:
 * - Dark Steel Pit Intake Hopper (anchored at pit floor y = -0.68)
 * - Continuous Inclined Plasma-Lit Ore Escalator with animated InstancedMesh cleats
 * - Overhead Intake Purification Arch & Slide into the Vault Dais
 * - 3-Tiered Dark Basalt & Gunmetal Vault Sanctuary (x = 8.45, z = 1.7) + Multi-Part Plasma Refinery Reactors & Tubes
 */

function createShieldLockGeometry(w: number, h: number, depth: number): THREE.ExtrudeGeometry {
  const hw = w * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, h * 0.5);
  shape.lineTo(hw, h * 0.5);
  shape.lineTo(hw * 0.92, -h * 0.08);
  shape.lineTo(0, -h * 0.55);
  shape.lineTo(-hw * 0.92, -h * 0.08);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.014,
    bevelSegments: 1,
  });
  geo.computeVertexNormals();
  return geo;
}


export function enableShadows(mesh: THREE.Object3D, cast = true, receive = true): void {
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Creates a multi-part low-poly stylized procedural Treasure Chest with pivot at y = 0.
 * Features beveled hardwood hull, iron corner skids, arched ribbed lid, gold lockplate,
 * inner glowing loot hoard, and interactive lid-peek animation.
 */
export function createProceduralTreasureChest(
  options: ProceduralChestOptions = {}
): ProceduralChestHandle {
  const group = new THREE.Group();
  const scale = options.scale ?? 1;
  group.scale.setScalar(scale);

  const woodMat = new THREE.MeshStandardMaterial({
    color: options.woodColor ?? 0x7c3f1d,
    roughness: 0.76,
    metalness: 0.05,
    flatShading: true,
  });
  const woodDarkMat = new THREE.MeshStandardMaterial({
    color: 0x542812,
    roughness: 0.82,
    metalness: 0.04,
    flatShading: true,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: options.ironColor ?? 0x334155,
    roughness: 0.36,
    metalness: 0.78,
    flatShading: true,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: options.trimColor ?? 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.14,
    roughness: 0.24,
    metalness: 0.86,
    flatShading: true,
  });
  const gemMat = new THREE.MeshStandardMaterial({
    color: options.gemColor ?? 0x38bdf8,
    emissive: options.gemColor ?? 0x38bdf8,
    emissiveIntensity: 0.9,
    roughness: 0.14,
    metalness: 0.35,
    flatShading: true,
  });
  const innerHoardMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.82,
    flatShading: true,
  });

  // 1. Iron Skid Runners & Flared Corner Feet (grounded cleanly at y = 0)
  for (const sx of [-0.42, 0.42]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.76), ironMat);
    skid.position.set(sx, 0.0275, 0);
    enableShadows(skid);
    group.add(skid);
  }
  const footGeo = new THREE.CylinderGeometry(0.06, 0.085, 0.075, 6);
  for (const sx of [-0.44, 0.44]) {
    for (const sz of [-0.31, 0.31]) {
      const foot = new THREE.Mesh(footGeo, goldMat);
      foot.position.set(sx, 0.0375, sz);
      enableShadows(foot);
      group.add(foot);
    }
  }

  // 2. Main Beveled Hardwood Body (y = 0.05 .. 0.47)
  const hullGeo = createExtrudedSlabGeometry(0.98, 0.42, 0.68, 0.08, 0.025);
  const hullMesh = new THREE.Mesh(hullGeo, woodMat);
  hullMesh.position.y = 0.05;
  enableShadows(hullMesh);
  group.add(hullMesh);

  // Recessed Horizontal Plank Ribs on Front & Back
  const slatGeo = new THREE.BoxGeometry(0.84, 0.045, 0.71);
  for (const sy of [0.16, 0.27, 0.38]) {
    const slat = new THREE.Mesh(slatGeo, woodDarkMat);
    slat.position.y = sy;
    enableShadows(slat);
    group.add(slat);
  }

  // Lower Gold Belt Trim & Upper Rim Collar
  const lowerTrim = new THREE.Mesh(
    createExtrudedSlabGeometry(1.03, 0.075, 0.73, 0.08, 0.015),
    goldMat
  );
  lowerTrim.position.y = 0.065;
  const upperCollar = new THREE.Mesh(
    createExtrudedSlabGeometry(1.05, 0.085, 0.75, 0.08, 0.018),
    goldMat
  );
  upperCollar.position.y = 0.415;
  enableShadows(lowerTrim);
  enableShadows(upperCollar);
  group.add(lowerTrim, upperCollar);

  // Vertical Iron Corner Pillars + Twin Brass Strap Bands
  const pillarGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.43, 6);
  for (const sx of [-0.455, 0.455]) {
    for (const sz of [-0.305, 0.305]) {
      const pillar = new THREE.Mesh(pillarGeo, ironMat);
      pillar.position.set(sx, 0.265, sz);
      enableShadows(pillar);
      group.add(pillar);
    }
  }
  const strapGeo = new THREE.BoxGeometry(0.11, 0.42, 0.755);
  for (const sx of [-0.27, 0.27]) {
    const strap = new THREE.Mesh(strapGeo, goldMat);
    strap.position.set(sx, 0.265, 0);
    enableShadows(strap);
    group.add(strap);
  }

  // Side Heavy Forged Carry Rings
  const ringMountGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.045, 6);
  const carryRingGeo = new THREE.TorusGeometry(0.085, 0.022, 6, 10);
  for (const sx of [-1, 1]) {
    const mount = new THREE.Mesh(ringMountGeo, ironMat);
    mount.rotation.z = Math.PI / 2;
    mount.position.set(sx * 0.515, 0.28, 0);
    const ring = new THREE.Mesh(carryRingGeo, goldMat);
    ring.rotation.y = Math.PI / 2;
    ring.rotation.x = sx * 0.18;
    ring.position.set(sx * 0.545, 0.23, 0);
    enableShadows(mount);
    enableShadows(ring);
    group.add(mount, ring);
  }

  // Inner Treasure Mound & Crystal Gems (revealed when lid slightly peeks on hover/click!)
  const hoardBed = new THREE.Mesh(
    createExtrudedSlabGeometry(0.84, 0.09, 0.54, 0.06, 0.02),
    innerHoardMat
  );
  hoardBed.position.y = 0.41;
  group.add(hoardBed);

  const innerCrystalGeo = new THREE.CylinderGeometry(0.025, 0.075, 0.2, 6);
  const innerShardOffsets: [number, number, number, number][] = [
    [-0.18, 0.5, 0.06, 0.35],
    [0.02, 0.52, -0.04, -0.2],
    [0.21, 0.5, 0.05, 0.5],
  ];
  for (const [cx, cy, cz, rz] of innerShardOffsets) {
    const shard = new THREE.Mesh(innerCrystalGeo, gemMat);
    shard.position.set(cx, cy, cz);
    shard.rotation.set(0.2, rz, rz);
    group.add(shard);
  }

  // 3. Hinged Vaulted Lid Sub-Group (pivots along rear hinge at y = 0.495, z = -0.355)
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.495, -0.355);
  group.add(lidPivot);

  // Rear Hinges on Pivot Line
  const hingeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 6);
  for (const sx of [-0.27, 0.27]) {
    const hinge = new THREE.Mesh(hingeGeo, ironMat);
    hinge.rotation.z = Math.PI / 2;
    group.add(hinge);
    hinge.position.set(sx, 0.495, -0.365);
    enableShadows(hinge);
  }

  // Lid children sit offset forward by +0.355 so lid centers cleanly over body
  const lidCenterOffsetZ = 0.355;

  const lidWoodGeo = createVaultArchProfileGeometry(1.0, 0.7, 0.32, 0.022);
  const lidWoodMesh = new THREE.Mesh(lidWoodGeo, woodMat);
  lidWoodMesh.position.set(0, -0.01, lidCenterOffsetZ);
  enableShadows(lidWoodMesh);
  lidPivot.add(lidWoodMesh);

  // Arched Gold Crown Ribs on Lid
  const lidRibGeo = createVaultArchProfileGeometry(0.115, 0.74, 0.35, 0.016);
  for (const sx of [-0.27, 0.27]) {
    const rib = new THREE.Mesh(lidRibGeo, goldMat);
    rib.position.set(sx, -0.015, lidCenterOffsetZ);
    enableShadows(rib);
    lidPivot.add(rib);
  }
  for (const sx of [-0.46, 0.46]) {
    const endCap = new THREE.Mesh(createVaultArchProfileGeometry(0.095, 0.73, 0.34, 0.015), ironMat);
    endCap.position.set(sx, -0.015, lidCenterOffsetZ);
    enableShadows(endCap);
    lidPivot.add(endCap);
  }

  // Top Crown Crest Plate + Hex Cyber Energy Core
  const crestPlate = new THREE.Mesh(
    createExtrudedSlabGeometry(0.32, 0.055, 0.24, 0.05, 0.012),
    goldMat
  );
  crestPlate.position.set(0, 0.325, lidCenterOffsetZ);
  const crestGem = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.055, 6), gemMat);
  crestGem.scale.set(1.2, 1.0, 0.92);
  crestGem.position.set(0, 0.382, lidCenterOffsetZ);
  enableShadows(crestPlate);
  lidPivot.add(crestPlate, crestGem);

  // Lid Front Latch Hasps
  const lidHasp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.055), goldMat);
  lidHasp.position.set(0, -0.01, lidCenterOffsetZ + 0.365);
  enableShadows(lidHasp);
  lidPivot.add(lidHasp);

  // 4. Front Ornate Escutcheon Shield Lock + Hexagonal Core Emissive Lock
  const lockPlate = new THREE.Mesh(createShieldLockGeometry(0.24, 0.24, 0.038), goldMat);
  lockPlate.position.set(0, 0.34, 0.345);
  const frontBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.04, 6), ironMat);
  frontBezel.rotation.x = Math.PI / 2;
  frontBezel.position.set(0, 0.35, 0.382);
  const frontGem = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.042, 6), gemMat);
  frontGem.rotation.x = Math.PI / 2;
  frontGem.position.set(0, 0.35, 0.402);
  enableShadows(lockPlate);
  enableShadows(frontBezel);
  group.add(lockPlate, frontBezel, frontGem);

  // Instanced Gold Rivet Studs across Front & Lid Ribs (Single Draw Call)
  const rivetPositions: [number, number, number][] = [
    [-0.27, 0.14, 0.385],
    [-0.27, 0.36, 0.385],
    [0.27, 0.14, 0.385],
    [0.27, 0.36, 0.385],
    [-0.27, 0.14, -0.385],
    [-0.27, 0.36, -0.385],
    [0.27, 0.14, -0.385],
    [0.27, 0.36, -0.385],
  ];
  const rivetGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.024, 6);
  const rivets = new THREE.InstancedMesh(rivetGeo, ironMat, rivetPositions.length);
  const dummy = new THREE.Object3D();
  rivetPositions.forEach(([rx, ry, rz], idx) => {
    dummy.position.set(rx, ry, rz);
    dummy.rotation.set(Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    rivets.setMatrixAt(idx, dummy.matrix);
  });
  rivets.instanceMatrix.needsUpdate = true;
  group.add(rivets);

  const setAccentColor = (color: number | string): void => {
    gemMat.color.set(color);
    gemMat.emissive.set(color);
  };

  const setInteraction = (hovered: boolean, bounce: number, elapsed: number): void => {
    const hoverBoost = hovered ? 0.09 : 0;
    const bounceOpen = bounce * 0.36;
    const idleBreath = Math.sin(elapsed * 2.4) * 0.012;
    lidPivot.rotation.x = -Math.max(0, hoverBoost + bounceOpen + idleBreath);

    goldMat.emissiveIntensity = hovered ? 0.45 : 0.14 + bounce * 0.35;
    gemMat.emissiveIntensity = (hovered ? 1.55 : 0.9) + bounce * 0.8 + Math.sin(elapsed * 3.2) * 0.12;
    innerHoardMat.emissiveIntensity = hovered || bounce > 0.02 ? 1.15 : 0.45;
  };

  const dispose = (): void => {
    disposeObject3D(group);
  };

  return {
    group,
    lidPivot,
    setAccentColor,
    setInteraction,
    dispose,
  };
}
