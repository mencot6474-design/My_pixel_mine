import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let activeTextureAnisotropy = 4;

const MATERIAL_TEXTURE_SLOTS = [
  'map',
  'emissiveMap',
  'roughnessMap',
  'metalnessMap',
  'normalMap',
  'bumpMap',
  'alphaMap',
] as const;

/**
 * Returns the active anisotropic filtering level clamped to the current GPU capability.
 */
export function getActiveTextureAnisotropy(): number {
  return activeTextureAnisotropy;
}

/**
 * Configures crisp HD Mip-0 billboard/sprite texture filtering with mipmaps disabled
 * so 2D Chibi and Ore sprites always sample 100% native resolution without dropping to half-res mip levels.
 */
export function applySharpSpriteTexture<T extends THREE.Texture>(tex: T, pixelArt = false): T {
  tex.generateMipmaps = false;
  if (pixelArt) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
  } else {
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.anisotropy = activeTextureAnisotropy;
  }
  tex.needsUpdate = true;
  return tex;
}

/**
 * Configures global texture anisotropy on the renderer and upgrades existing mipmapped textures in a scene.
 */
export function configureSceneTextureSharpness(
  renderer: THREE.WebGLRenderer,
  root?: THREE.Object3D,
  maxCap = 8
): number {
  const gpuMax =
    typeof renderer.capabilities?.getMaxAnisotropy === 'function'
      ? renderer.capabilities.getMaxAnisotropy()
      : 1;
  activeTextureAnisotropy = Math.max(1, Math.min(maxCap, gpuMax || 1));
  THREE.Texture.DEFAULT_ANISOTROPY = activeTextureAnisotropy;

  if (root) {
    const visited = new Set<THREE.Texture>();
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat) continue;
        for (const slot of MATERIAL_TEXTURE_SLOTS) {
          const tex: unknown = Reflect.get(mat, slot);
          if (
            tex instanceof THREE.Texture &&
            !(tex instanceof THREE.DataTexture) &&
            tex.generateMipmaps &&
            tex.minFilter !== THREE.NearestFilter &&
            tex.minFilter !== THREE.NearestMipmapNearestFilter &&
            !visited.has(tex)
          ) {
            visited.add(tex);
            tex.anisotropy = activeTextureAnisotropy;
            tex.needsUpdate = true;
          }
        }
      }
    });
  }

  return activeTextureAnisotropy;
}

/**
 * Enables shadow casting and/or receiving on all Mesh descendants of a 3D object.
 */
export function enableShadows(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Recursively disposes all BufferGeometries and Materials in an Object3D subtree,
 * optionally skipping shared materials in `excludedMaterials`.
 */
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

/**
 * Builds a 2D chamfered rectangle THREE.Shape centered on the origin.
 */
export function createChamferRectShape(
  width: number,
  depth: number,
  chamfer: number,
  maxChamferRatio = 0.42
): THREE.Shape {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const c = Math.min(chamfer, hw * maxChamferRatio, hd * maxChamferRatio);
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

/**
 * Extrudes a horizontal chamfered rectangular slab resting on y = 0 and rising along +Y.
 */
export function createChamferSlabGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer = 0.2,
  bevel = 0.025,
  opts: { minInnerH?: number; maxChamferRatio?: number } = {}
): THREE.ExtrudeGeometry {
  const shape = createChamferRectShape(width, depth, chamfer, opts.maxChamferRatio ?? 0.42);
  const innerH = Math.max(opts.minInnerH ?? 0.015, height - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerH,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  // Extrude runs along +Z; rotate -90 deg around X so extrusion rises along +Y, bottom at y = 0
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Extrudes a 2D polygon point list centered along Z with beveled edges.
 */
export function createExtrudedProfileGeometry(
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

/**
 * Builds an upright chamfered rectangular panel centered on XY and extruded along Z.
 */
export function createChamferPanelXYGeometry(
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

/**
 * Builds a multi-stepped faceted LatheGeometry from [radius, y] profile pairs.
 */
export function createLatheProfileGeometry(
  profile: ReadonlyArray<readonly [number, number]>,
  radialSegments = 10
): THREE.LatheGeometry {
  const vecs = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
  const geo = new THREE.LatheGeometry(vecs, radialSegments);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Merges static sibling/nested meshes sharing identical material and shadow flags
 * inside `container` into one draw call per bucket while leaving `skipObjects` intact.
 */
export function mergeStaticMeshesByMaterial(
  container: THREE.Object3D,
  skipObjects?: ReadonlySet<THREE.Object3D>
): void {
  container.updateMatrixWorld(true);
  const invRoot = container.matrixWorld.clone().invert();
  const relMatrix = new THREE.Matrix4();

  const isSkipped = (obj: THREE.Object3D): boolean => {
    if (!skipObjects || skipObjects.size === 0) return false;
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (skipObjects.has(cur)) return true;
      if (cur === container) break;
      cur = cur.parent;
    }
    return false;
  };

  interface Bucket {
    mat: THREE.Material;
    castShadow: boolean;
    receiveShadow: boolean;
    hasUv: boolean;
    meshes: THREE.Mesh[];
  }

  const buckets = new Map<string, Bucket>();
  const allMeshes: THREE.Mesh[] = [];

  container.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh) return;
    allMeshes.push(child);
    if (!child.visible || Array.isArray(child.material) || isSkipped(child)) return;
    const geo = child.geometry;
    if (!geo?.attributes?.position) return;
    const hasUv = Boolean(geo.attributes.uv);
    const key = `${child.material.uuid}|${child.castShadow ? 1 : 0}|${child.receiveShadow ? 1 : 0}|${hasUv ? 1 : 0}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        mat: child.material,
        castShadow: child.castShadow,
        receiveShadow: child.receiveShadow,
        hasUv,
        meshes: [],
      };
      buckets.set(key, b);
    }
    b.meshes.push(child);
  });

  const removedSet = new Set<THREE.Mesh>();
  const addedMeshes: THREE.Mesh[] = [];

  for (const bucket of buckets.values()) {
    if (bucket.meshes.length < 2) continue;
    const geos: THREE.BufferGeometry[] = [];
    for (const m of bucket.meshes) {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      if (!g.attributes.normal) {
        g.computeVertexNormals();
      }
      for (const attrName of Object.keys(g.attributes)) {
        if (attrName !== 'position' && attrName !== 'normal' && !(bucket.hasUv && attrName === 'uv')) {
          g.deleteAttribute(attrName);
        }
      }
      relMatrix.multiplyMatrices(invRoot, m.matrixWorld);
      g.applyMatrix4(relMatrix);
      geos.push(g);
    }

    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;

    const mergedMesh = new THREE.Mesh(merged, bucket.mat);
    mergedMesh.castShadow = bucket.castShadow;
    mergedMesh.receiveShadow = bucket.receiveShadow;
    addedMeshes.push(mergedMesh);
    for (const m of bucket.meshes) {
      m.parent?.remove(m);
      removedSet.add(m);
    }
  }

  const keptGeos = new Set<THREE.BufferGeometry>();
  for (const m of allMeshes) {
    if (!removedSet.has(m)) keptGeos.add(m.geometry);
  }
  for (const m of removedSet) {
    if (!keptGeos.has(m.geometry)) {
      keptGeos.add(m.geometry);
      m.geometry.dispose();
    }
  }
  for (const m of addedMeshes) {
    container.add(m);
  }
}

/** Merges simple un-UV'd BufferGeometries into a single non-indexed geometry and disposes inputs. */
export function mergeSimpleGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of nonIndexed) totalVerts += g.attributes.position.count;
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const g of nonIndexed) {
    g.computeVertexNormals();
    positions.set(g.attributes.position.array, offset * 3);
    normals.set(g.attributes.normal.array, offset * 3);
    offset += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return out;
}
