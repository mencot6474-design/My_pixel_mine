import * as THREE from 'three';

export interface CyberArchitecturalFinialOptions {
  frameMat: THREE.Material;
  steelMat: THREE.Material;
  coreMat: THREE.Material;
  scale?: number;
}

export interface CyberTreeCanopyOptions {
  barkMat: THREE.Material;
  foliageMat: THREE.Material;
  accentMat: THREE.Material;
  scale?: number;
}

export interface CyberCrystalClusterOptions {
  frameMat: THREE.Material;
  crystalMat: THREE.Material;
  accentMat?: THREE.Material;
  scale?: number;
  shardCount?: number;
}

export function disposeCyberProp(root: THREE.Object3D): void {
  const seenGeos = new Set<THREE.BufferGeometry>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (!seenGeos.has(child.geometry)) {
      seenGeos.add(child.geometry);
      child.geometry.dispose();
    }
  });
}

function setStructuralShadow(mesh: THREE.Object3D, cast = true, receive = true): void {
  if (mesh instanceof THREE.Mesh) {
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
  }
}

function makeBeveledProfile(
  pts: ReadonlyArray<readonly [number, number]>,
  depth: number,
  bevel = 0.014
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

function makeChamferPrism(
  width: number,
  height: number,
  depth: number,
  chamfer = 0.05,
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

  const innerH = Math.max(0.01, height - bevel * 2);
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

function makeLathePoints(pts: ReadonlyArray<readonly [number, number]>): THREE.Vector2[] {
  return pts.map(([r, y]) => new THREE.Vector2(r, y));
}

/**
 * Neo-Tokyo / Industrial Armored Lantern Bollard Crown (y = 0 base pivot).
 * Solid chamfered base collar, 4 structural corner mullions, recessed glowing lamp core,
 * and overhanging stepped turret roof hood (NO flying wings, NO floating rings).
 */
export function createCyberLanternBollardFinial(
  opts: CyberArchitecturalFinialOptions
): THREE.Group {
  const { frameMat, steelMat, coreMat, scale = 1 } = opts;
  const g = new THREE.Group();
  g.scale.setScalar(scale);

  // Heavy Chamfered Collar Plinth
  const plinth = new THREE.Mesh(makeChamferPrism(0.46, 0.09, 0.46, 0.11, 0.014), steelMat);
  setStructuralShadow(plinth);

  // Recessed Glowing Lamp Chamber Core
  const lampCore = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 0.28, 6), coreMat);
  lampCore.position.y = 0.22;

  // 4 Armored Corner Mullion Struts framing the lamp chamber cleanly
  const mullionGeo = makeChamferPrism(0.065, 0.29, 0.065, 0.014, 0.008);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const m = new THREE.Mesh(mullionGeo, frameMat);
      m.position.set(sx * 0.145, 0.08, sz * 0.145);
      setStructuralShadow(m);
      g.add(m);
    }
  }

  // Overhanging Tiered Armor Hood Cap (Pagoda / Industrial Turret Silhouette)
  const lowerHood = new THREE.Mesh(makeChamferPrism(0.52, 0.09, 0.52, 0.13, 0.015), frameMat);
  lowerHood.position.y = 0.36;
  setStructuralShadow(lowerHood);

  const upperHood = new THREE.Mesh(makeChamferPrism(0.34, 0.08, 0.34, 0.09, 0.012), steelMat);
  upperHood.position.y = 0.44;
  setStructuralShadow(upperHood);

  const apexCap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.11, 0.1, 6), frameMat);
  apexCap.position.y = 0.56;
  setStructuralShadow(apexCap);

  g.add(plinth, lampCore, lowerHood, upperHood, apexCap);
  return g;
}

/**
 * Brutalist Cyberpunk Split Twin-Prong Monolith Finial (y = 0 base pivot).
 * Flanking beveled armor prongs cradle a sleek recessed vertical energy core —
 * clean architectural silhouette inspired by Halo/Valorant/Cyberpunk monoliths.
 */
export function createCyberMonolithForkFinial(
  opts: CyberArchitecturalFinialOptions
): THREE.Group {
  const { frameMat, steelMat, coreMat, scale = 1 } = opts;
  const g = new THREE.Group();
  g.scale.setScalar(scale);

  // Octagonal Stepped Mounting Socket
  const socket = new THREE.Mesh(makeChamferPrism(0.46, 0.1, 0.34, 0.09, 0.014), steelMat);
  setStructuralShadow(socket);

  // Recessed Vertical Energy Blade Core nestled between twin prongs
  const coreBlade = new THREE.Mesh(makeChamferPrism(0.11, 0.44, 0.11, 0.025, 0.008), coreMat);
  coreBlade.position.y = 0.1;

  // Twin Symmetrical Chamfered Armor Prongs (inward-tapered monolithic shoulders)
  const prongGeo = makeBeveledProfile(
    [
      [0.06, 0.06],
      [0.2, 0.06],
      [0.18, 0.52],
      [0.08, 0.66],
      [0.06, 0.48],
    ],
    0.16,
    0.015
  );
  for (const sx of [-1, 1]) {
    const prong = new THREE.Mesh(prongGeo, frameMat);
    if (sx < 0) prong.rotation.y = Math.PI;
    setStructuralShadow(prong);
    g.add(prong);
  }

  g.add(socket, coreBlade);
  return g;
}

/**
 * Sculpted Cluster of Asymmetric Staggered Hex Crystal Shards seated inside a chamfered
 * metal collar (replaces generic octahedrons & floating rings on Fountain/Pods/Helipads).
 */
export function createCyberCrystalCluster(opts: CyberCrystalClusterOptions): THREE.Group {
  const { frameMat, crystalMat, accentMat = crystalMat, scale = 1, shardCount = 5 } = opts;
  const g = new THREE.Group();
  g.scale.setScalar(scale);

  const collar = new THREE.Mesh(
    new THREE.LatheGeometry(
      makeLathePoints([
        [0.001, -0.06],
        [0.24, -0.06],
        [0.28, 0.04],
        [0.2, 0.12],
        [0.001, 0.12],
      ]),
      6
    ),
    frameMat
  );
  setStructuralShadow(collar);
  g.add(collar);

  const makeShardGeo = (rBot: number, rMid: number, h: number): THREE.LatheGeometry =>
    new THREE.LatheGeometry(
      makeLathePoints([
        [0.001, 0.0],
        [rBot, 0.0],
        [rMid, h * 0.72],
        [0.001, h],
      ]),
      6
    );

  // Tall central crystal spire
  const centerShard = new THREE.Mesh(makeShardGeo(0.14, 0.11, 0.82), crystalMat);
  centerShard.position.y = 0.06;
  g.add(centerShard);

  // Asymmetric tilted satellite crystal spires
  const count = Math.max(2, shardCount - 1);
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + 0.35;
    const h = 0.44 + (i % 2) * 0.16;
    const shard = new THREE.Mesh(
      makeShardGeo(0.085, 0.065, h),
      i % 2 === 0 ? accentMat : crystalMat
    );
    shard.position.set(Math.cos(ang) * 0.13, 0.05, Math.sin(ang) * 0.13);
    shard.rotation.z = -Math.cos(ang) * 0.32;
    shard.rotation.x = Math.sin(ang) * 0.32;
    g.add(shard);
  }

  return g;
}

/**
 * Stylized Low-Poly Cyber-Botanical Tree Canopy with forked dark branches & layered
 * organic faceted foliage clusters (replaces diamond octahedrons / tilted ring trees).
 */
export function createCyberBotanicalCanopy(opts: CyberTreeCanopyOptions): THREE.Group {
  const { barkMat, foliageMat, accentMat, scale = 1 } = opts;
  const g = new THREE.Group();
  g.scale.setScalar(scale);

  // 3 Angled Branch Forks supporting distinct canopy lobes
  const branchGeo = new THREE.CylinderGeometry(0.055, 0.095, 0.72, 6);
  const lobeMainGeo = new THREE.DodecahedronGeometry(0.62, 0);
  const lobeSubGeo = new THREE.DodecahedronGeometry(0.44, 0);
  const blossomGeo = new THREE.DodecahedronGeometry(0.24, 0);

  // Lower central foliage cushion + crown
  const crownTop = new THREE.Mesh(lobeMainGeo, foliageMat);
  crownTop.position.set(0, 0.72, 0);
  crownTop.scale.set(1.22, 0.74, 1.22);
  setStructuralShadow(crownTop);
  g.add(crownTop);

  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + 0.35;
    const bx = Math.cos(ang) * 0.34;
    const bz = Math.sin(ang) * 0.34;

    const branch = new THREE.Mesh(branchGeo, barkMat);
    branch.position.set(bx * 0.55, 0.24, bz * 0.55);
    branch.rotation.z = -Math.cos(ang) * 0.52;
    branch.rotation.x = Math.sin(ang) * 0.52;
    setStructuralShadow(branch);

    const lobe = new THREE.Mesh(lobeSubGeo, i === 1 ? accentMat : foliageMat);
    lobe.position.set(bx * 1.65, 0.44 + (i % 2) * 0.14, bz * 1.65);
    lobe.rotation.set(0.2 * i, ang, 0.15);
    lobe.scale.set(1.28, 0.72, 1.15);
    setStructuralShadow(lobe);

    const blossom = new THREE.Mesh(blossomGeo, accentMat);
    blossom.position.set(bx * 2.15, 0.62 + (i % 2) * 0.12, bz * 2.15);
    blossom.scale.set(1.1, 0.75, 1.1);

    g.add(branch, lobe, blossom);
  }

  return g;
}
