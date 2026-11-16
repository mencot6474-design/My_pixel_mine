import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetUrl } from '../game/AssetUrl';

const loader = new GLTFLoader();
const sceneCache = new Map<string, Promise<THREE.Group>>();

function loadGlbTemplate(url: string): Promise<THREE.Group> {
  const resolved = assetUrl(url);
  let pending = sceneCache.get(resolved);
  if (!pending) {
    pending = loader.loadAsync(resolved).then((gltf) => {
      const root = gltf.scene;
      root.updateMatrixWorld(true);
      return root;
    });
    sceneCache.set(resolved, pending);
  }
  return pending;
}

export interface GlbMountOptions {
  position?: [number, number, number];
  rotationY?: number;
  rotationX?: number;
  rotationZ?: number;
  targetHeight?: number;
  targetWidth?: number;
  targetDepth?: number;
  uniformScale?: number;
  scaleMultiplier?: [number, number, number];
  alignBottomY?: number;
  centerXZ?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tintHex?: number;
  onReady?: (mounted: THREE.Group) => void;
}

/**
 * Loads a Kenney CC0 .glb once from /models/<kit>/<file>.glb, clones it,
 * measures its exact world bounding box, normalizes scale & floor alignment
 * so it never floats or sinks, and mounts it cleanly inside `parent`.
 */
export function mountGlbProp(
  url: string,
  parent: THREE.Object3D,
  opts: GlbMountOptions = {}
): THREE.Group {
  const host = new THREE.Group();
  const [px, py, pz] = opts.position ?? [0, 0, 0];
  host.position.set(px, py, pz);
  host.rotation.set(opts.rotationX ?? 0, opts.rotationY ?? 0, opts.rotationZ ?? 0);
  parent.add(host);

  void loadGlbTemplate(url)
    .then((template) => {
      const clone = template.clone(true);
      const castShadow = opts.castShadow ?? true;
      const receiveShadow = opts.receiveShadow ?? true;

      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = castShadow;
          mesh.receiveShadow = receiveShadow;
          if (opts.tintHex !== undefined && mesh.material) {
            const mat = Array.isArray(mesh.material)
              ? mesh.material[0].clone()
              : mesh.material.clone();
            if ('color' in mat && (mat as THREE.MeshStandardMaterial).color) {
              (mat as THREE.MeshStandardMaterial).color.setHex(opts.tintHex);
            }
            mesh.material = mat;
          }
        }
      });

      clone.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(clone);
      const rawSize = new THREE.Vector3();
      const rawCenter = new THREE.Vector3();
      rawBox.getSize(rawSize);
      rawBox.getCenter(rawCenter);

      let s = opts.uniformScale ?? 1;
      if (opts.targetHeight && rawSize.y > 0.0001) {
        s = opts.targetHeight / rawSize.y;
      } else if (opts.targetWidth && rawSize.x > 0.0001) {
        s = opts.targetWidth / rawSize.x;
      } else if (opts.targetDepth && rawSize.z > 0.0001) {
        s = opts.targetDepth / rawSize.z;
      }

      const [mx, my, mz] = opts.scaleMultiplier ?? [1, 1, 1];
      clone.scale.set(s * mx, s * my, s * mz);

      const alignY = opts.alignBottomY ?? 0;
      const centerXZ = opts.centerXZ ?? true;
      clone.position.set(
        centerXZ ? -rawCenter.x * s * mx : 0,
        alignY - rawBox.min.y * s * my,
        centerXZ ? -rawCenter.z * s * mz : 0
      );

      host.add(clone);
      opts.onReady?.(host);
    })
    .catch((err) => {
      console.warn(`[GlbAssets3D] Failed to load ${url}`, err);
    });

  return host;
}

export function preloadCommonMineModels(): void {
  const urls = [
    '/models/train/track-detailed.glb',
    '/models/train/train-carriage-coal.glb',
    '/models/fantasy-town/lantern.glb',
    '/models/fantasy-town/tree-high-round.glb',
    '/models/fantasy-town/tree-crooked.glb',
    '/models/mini-dungeon/chest.glb',
    '/models/mini-dungeon/rocks.glb',
    '/models/mini-dungeon/column.glb',
    '/models/fantasy-town/stairs-wide-stone.glb',
    '/models/mini-dungeon/banner.glb',
    '/models/mini-dungeon/wood-support.glb',
    '/models/factory/conveyor-long.glb',
    '/models/platformer/jewel.glb',
  ];
  for (const url of urls) {
    void loadGlbTemplate(url);
  }
}
