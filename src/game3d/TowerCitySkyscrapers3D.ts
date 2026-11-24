import * as THREE from 'three';
import { createChamferSlabGeometry, enableShadows } from './MeshHelpers3D';
import { createCrackedGlassTexture, createShatteredGlassShardGeometry } from './TowerCityAssets3D';

export interface TowerSkyscraperFlickerRef {
  mat: THREE.MeshStandardMaterial;
  phase: number;
  speed: number;
  baseIntensity: number;
}

export interface TowerSkyscrapersCtx {
  group: THREE.Group;
  ownedTextures: THREE.Texture[];
  flickers: TowerSkyscraperFlickerRef[];
  concreteMat: THREE.MeshStandardMaterial;
  concreteDarkMat: THREE.MeshStandardMaterial;
  rebarMat: THREE.MeshStandardMaterial;
  steelMat: THREE.MeshStandardMaterial;
  skyscraperMat: THREE.MeshStandardMaterial;
  skyscraperAltMat: THREE.MeshStandardMaterial;
}

function createExtrudedChamferSlab(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevel = 0.025
): THREE.ExtrudeGeometry {
  return createChamferSlabGeometry(width, height, depth, chamfer, bevel, {
    minInnerH: 0.02,
    maxChamferRatio: 0.4,
  });
}

export function buildTowerRuinedSkyscrapers(ctx: TowerSkyscrapersCtx): void {
  const {
    group,
    ownedTextures,
    flickers,
    concreteMat,
    concreteDarkMat,
    rebarMat,
    steelMat,
    skyscraperMat,
    skyscraperAltMat,
  } = ctx;

  // =========================================================================
  // 4. RUINED CYBER CITY SKYSCRAPERS WITH VARIED WINDOW GRIDS & SHATTERED GLASS
  // =========================================================================
  interface TowerBuildingDef {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    ruined: boolean;
    hasStairs: boolean;
    hasHvac: boolean;
    antenna: boolean;
    cols: number;
    rows: number;
    winW: number;
    winH: number;
  }

  const buildings: TowerBuildingDef[] = [
    // Left Skyscrapers (x <= -15.0 so the wide 11.45m Overpass Plaza & outer lights stay 100% clear)
    { x: -15.2, z: 5.2, w: 5.2, d: 5.0, h: 11.2, ruined: true, hasStairs: true, hasHvac: false, antenna: false, cols: 3, rows: 6, winW: 0.72, winH: 0.78 },
    { x: -15.4, z: -2.2, w: 5.6, d: 5.8, h: 15.8, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 9, winW: 0.62, winH: 0.72 },
    { x: -15.2, z: -10.2, w: 5.4, d: 5.4, h: 13.6, ruined: true, hasStairs: true, hasHvac: false, antenna: true, cols: 3, rows: 7, winW: 0.8, winH: 0.85 },
    { x: -14.8, z: -18.5, w: 5.8, d: 5.6, h: 19.5, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 11, winW: 0.68, winH: 0.76 },
    { x: -14.6, z: -27.0, w: 5.8, d: 5.8, h: 16.5, ruined: true, hasStairs: false, hasHvac: true, antenna: false, cols: 3, rows: 8, winW: 0.85, winH: 0.92 },
    { x: -22.2, z: -5.5, w: 6.4, d: 6.4, h: 22.0, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 11, winW: 0.76, winH: 0.84 },
    { x: -22.2, z: -15.5, w: 6.4, d: 6.4, h: 24.5, ruined: true, hasStairs: false, hasHvac: false, antenna: true, cols: 4, rows: 12, winW: 0.74, winH: 0.82 },
    { x: -21.8, z: -25.0, w: 6.0, d: 6.0, h: 20.5, ruined: false, hasStairs: false, hasHvac: true, antenna: false, cols: 3, rows: 9, winW: 0.88, winH: 0.96 },

    // Right Skyscrapers (x >= +15.0)
    { x: 15.2, z: 5.2, w: 5.2, d: 5.0, h: 11.8, ruined: true, hasStairs: true, hasHvac: false, antenna: false, cols: 3, rows: 6, winW: 0.72, winH: 0.78 },
    { x: 15.4, z: -2.2, w: 5.6, d: 5.8, h: 16.4, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 9, winW: 0.62, winH: 0.72 },
    { x: 15.2, z: -10.2, w: 5.4, d: 5.4, h: 13.2, ruined: true, hasStairs: true, hasHvac: false, antenna: true, cols: 3, rows: 7, winW: 0.8, winH: 0.85 },
    { x: 14.8, z: -18.5, w: 5.8, d: 5.6, h: 20.0, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 11, winW: 0.68, winH: 0.76 },
    { x: 14.6, z: -27.0, w: 5.8, d: 5.8, h: 17.0, ruined: true, hasStairs: false, hasHvac: true, antenna: false, cols: 3, rows: 8, winW: 0.85, winH: 0.92 },
    { x: 22.2, z: -5.5, w: 6.4, d: 6.4, h: 23.0, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 11, winW: 0.76, winH: 0.84 },
    { x: 22.2, z: -15.5, w: 6.4, d: 6.4, h: 25.0, ruined: true, hasStairs: false, hasHvac: false, antenna: true, cols: 4, rows: 12, winW: 0.74, winH: 0.82 },
    { x: 21.8, z: -25.0, w: 6.0, d: 6.0, h: 21.0, ruined: false, hasStairs: false, hasHvac: true, antenna: false, cols: 3, rows: 9, winW: 0.88, winH: 0.96 },

    // Background Horizon Towers Flanking Highway End (center lane open for elevated AI Core)
    { x: -11.4, z: -35.5, w: 5.6, d: 5.6, h: 23.5, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 3, rows: 10, winW: 0.78, winH: 0.84 },
    { x: 11.4, z: -35.5, w: 5.6, d: 5.6, h: 24.0, ruined: true, hasStairs: false, hasHvac: false, antenna: true, cols: 3, rows: 10, winW: 0.78, winH: 0.84 },
    { x: -17.6, z: -37.5, w: 6.2, d: 6.0, h: 27.0, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 12, winW: 0.74, winH: 0.82 },
    { x: 17.6, z: -37.5, w: 6.2, d: 6.0, h: 26.5, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 12, winW: 0.74, winH: 0.82 },
    { x: -7.8, z: -44.5, w: 4.8, d: 4.8, h: 18.0, ruined: true, hasStairs: false, hasHvac: false, antenna: false, cols: 3, rows: 8, winW: 0.72, winH: 0.78 },
    { x: 7.8, z: -44.5, w: 4.8, d: 4.8, h: 17.5, ruined: true, hasStairs: false, hasHvac: false, antenna: false, cols: 3, rows: 8, winW: 0.72, winH: 0.78 },
  ];

  // Collect window instance matrices by architectural state (non-uniform varied bays!)
  interface WinTransform {
    pos: THREE.Vector3;
    rotY: number;
    w: number;
    h: number;
  }
  const frameTransforms: WinTransform[] = [];
  const litWarmTransforms: WinTransform[] = [];
  const litCoolTransforms: WinTransform[] = [];
  const darkGlassTransforms: WinTransform[] = [];
  const brokenVoidTransforms: WinTransform[] = [];
  const shardTransforms: WinTransform[] = [];

  const antennaMastGeo = new THREE.CylinderGeometry(0.05, 0.14, 4.0, 5);
  const antennaCrossGeo = new THREE.BoxGeometry(0.95, 0.08, 0.08);
  const beaconGeo = new THREE.OctahedronGeometry(0.15, 0);

  for (let bIdx = 0; bIdx < buildings.length; bIdx++) {
    const b = buildings[bIdx];
    const bGroup = new THREE.Group();
    bGroup.position.set(b.x, -0.55, b.z);
    group.add(bGroup);

    const baseH = Math.min(3.2, b.h * 0.24);
    const bodyMat = bIdx % 2 === 0 ? skyscraperMat : skyscraperAltMat;

    // Ground Plinth Base
    const plinth = new THREE.Mesh(
      createExtrudedChamferSlab(b.w + 0.55, baseH, b.d + 0.55, 0.25, 0.04),
      concreteDarkMat
    );
    enableShadows(plinth, true, true);
    bGroup.add(plinth);

    // Main Tower Shaft
    const mainH = b.h - baseH;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(b.w, mainH, b.d), bodyMat);
    shaft.position.y = baseH + mainH * 0.5;
    enableShadows(shaft, true, true);
    bGroup.add(shaft);

    // Roof Details: Ruined Collapsed Slab & Rubble OR Mechanical Penthouse + Ventilation Pipes
    if (b.ruined) {
      const capSlab = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.9, 0.45, b.d * 0.9), concreteMat);
      capSlab.position.y = b.h + 0.12;
      capSlab.rotation.set(b.x < 0 ? 0.16 : -0.14, 0.08, b.x < 0 ? -0.22 : 0.22);
      bGroup.add(capSlab);

      // Broken collapsed concrete chunk & exposed bent rebar spikes
      const collapseBlock = new THREE.Mesh(
        new THREE.BoxGeometry(b.w * 0.45, 0.9, b.d * 0.45),
        concreteDarkMat
      );
      collapseBlock.position.set(b.x < 0 ? 0.45 : -0.45, b.h + 0.3, 0.35);
      collapseBlock.rotation.set(0.24, 0.3, -0.28);
      bGroup.add(collapseBlock);

      for (let s = 0; s < 5; s++) {
        const spike = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.055, 1.4 + (s % 2) * 0.65, 5),
          rebarMat
        );
        spike.position.set(
          ((s % 3) - 1) * b.w * 0.28,
          b.h + 0.6,
          (s < 2 ? -1 : 1) * b.d * 0.26
        );
        spike.rotation.set((s - 2) * 0.16, 0, (s % 2 === 0 ? -1 : 1) * 0.22);
        bGroup.add(spike);
      }
    } else {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.72, 1.4, b.d * 0.72), concreteDarkMat);
      crown.position.y = b.h + 0.7;
      bGroup.add(crown);
    }

    if (b.hasHvac) {
      // Rooftop HVAC Units + Ventilation Duct Pipes
      const hvacY = b.h + (b.ruined ? 0.35 : 1.4);
      const acBox = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 1.0), concreteMat);
      acBox.position.set(-b.w * 0.16, hvacY + 0.42, -0.3);
      const ductPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.9, 6), steelMat);
      ductPipe.rotation.z = Math.PI / 2;
      ductPipe.position.set(0.45, hvacY + 0.22, -0.3);
      const ventStack = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.9, 6), steelMat);
      ventStack.position.set(1.25, hvacY + 0.55, -0.3);
      bGroup.add(acBox, ductPipe, ventStack);
    }

    if (b.antenna) {
      const mastBaseY = b.h + (b.ruined ? 0.55 : 1.4);
      const mastGroup = new THREE.Group();
      mastGroup.position.set(0.25, mastBaseY, 0.2);
      // Damaged buildings get bent broken antenna towers!
      if (b.ruined) {
        mastGroup.rotation.set(0.12, 0.2, b.x < 0 ? -0.34 : 0.34);
      }
      const mast = new THREE.Mesh(antennaMastGeo, steelMat);
      mast.position.y = 2.0;
      const cross = new THREE.Mesh(antennaCrossGeo, steelMat);
      cross.position.y = 2.9;
      const beaconMat = new THREE.MeshStandardMaterial({
        color: bIdx % 2 === 0 ? 0xf43f5e : 0x38bdf8,
        emissive: bIdx % 2 === 0 ? 0xe11d48 : 0x0284c7,
        emissiveIntensity: 1.5,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 4.08;
      mastGroup.add(mast, cross, beacon);
      bGroup.add(mastGroup);
      flickers.push({ mat: beaconMat, phase: bIdx * 1.4, speed: 3.1 + (bIdx % 3), baseIntensity: 1.4 });
    }

    if (b.hasStairs) {
      // Exterior Fire-Escape Steel Staircase on lower inward facade
      const inwardSign = b.x < 0 ? 1 : -1;
      const wallX = inwardSign * (b.w * 0.5 + 0.28);
      for (let tier = 0; tier < 3; tier++) {
        const ty = baseH + 0.6 + tier * 2.1;
        const landing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 2.2), steelMat);
        landing.position.set(wallX, ty, 0);
        const stairFlight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 2.35), steelMat);
        stairFlight.position.set(wallX + inwardSign * 0.08, ty + 1.05, 0);
        stairFlight.rotation.x = tier % 2 === 0 ? 0.68 : -0.68;
        bGroup.add(landing, stairFlight);
      }
    }

    // Populate Square / Rectangular Window Grid Across Both Highway-Facing (+X/-X) and Camera-Facing (+Z) Facades
    const rowSpacing = (mainH - 1.1) / Math.max(1, b.rows);
    const inwardSign = b.x < 0 ? 1 : -1;
    const sideFaceX = b.x + inwardSign * (b.w * 0.5 + 0.025);
    const sideRotY = inwardSign > 0 ? Math.PI / 2 : -Math.PI / 2;
    const frontFaceZ = b.z + b.d * 0.5 + 0.025;

    const pushWindowBay = (wx: number, wy: number, wz: number, rotY: number, seed: number): void => {
      const tr: WinTransform = {
        pos: new THREE.Vector3(wx, wy, wz),
        rotY,
        w: b.winW,
        h: b.winH,
      };
      frameTransforms.push(tr);

      // Non-uniform deterministic window state per bay
      const hash = Math.abs((seed * 73856093) ^ (bIdx * 19349663)) % 100;
      if (hash < 35) {
        // Blown-out hollow dark window + jagged shattered glass splinters on frame edge!
        brokenVoidTransforms.push(tr);
        shardTransforms.push(tr);
      } else if (hash < 47) {
        // Dim warm room glow
        litWarmTransforms.push(tr);
      } else if (hash < 58) {
        // Dim cool/cyan monitor room glow
        litCoolTransforms.push(tr);
      } else {
        // Dead / cracked dark window pane
        darkGlassTransforms.push(tr);
      }
    };

    for (let r = 0; r < b.rows; r++) {
      const wy = -0.55 + baseH + 0.8 + r * rowSpacing;
      // Highway-facing side facade columns
      const sideColSpacing = (b.d - 0.9) / Math.max(1, b.cols);
      for (let c = 0; c < b.cols; c++) {
        const wz = b.z - (b.d - 0.9) * 0.5 + sideColSpacing * (c + 0.5);
        pushWindowBay(sideFaceX, wy, wz, sideRotY, bIdx * 101 + r * 17 + c * 7);
      }
      // Front camera-facing facade columns
      const frontColSpacing = (b.w - 0.9) / Math.max(1, b.cols);
      for (let c = 0; c < b.cols; c++) {
        const wx = b.x - (b.w - 0.9) * 0.5 + frontColSpacing * (c + 0.5);
        pushWindowBay(wx, wy, frontFaceZ, 0, bIdx * 131 + r * 23 + c * 11 + 500);
      }
    }
  }

  // Instantiate All Window Grid Bays & Shattered Glass Shards (6 Draw Calls Total for 1,500+ Windows!)
  const frameGeo = new THREE.BoxGeometry(1, 1, 0.08);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.78,
    metalness: 0.25,
    flatShading: true,
  });

  const paneGeo = new THREE.PlaneGeometry(0.84, 0.84);
  const crackedTex = createCrackedGlassTexture();
  if (crackedTex) ownedTextures.push(crackedTex);

  const darkGlassMat = new THREE.MeshStandardMaterial({
    ...(crackedTex ? { map: crackedTex } : {}),
    color: 0xffffff,
    roughness: 0.16,
    metalness: 0.82,
  });
  const litWarmMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  const litCoolMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x0284c7,
    emissiveIntensity: 0.38,
    roughness: 0.35,
  });
  const brokenVoidMat = new THREE.MeshBasicMaterial({
    color: 0x02040a,
  });
  const shardGeo = createShatteredGlassShardGeometry();
  const glassShardMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.52,
    roughness: 0.08,
    metalness: 0.88,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  const buildWindowLayer = (
    list: WinTransform[],
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    zOffset: number,
    scaleMult = 1.0
  ): void => {
    if (list.length === 0) return;
    const inst = new THREE.InstancedMesh(geo, mat, list.length);
    const wd = new THREE.Object3D();
    list.forEach((item, idx) => {
      wd.position.copy(item.pos);
      wd.position.x += Math.sin(item.rotY) * zOffset;
      wd.position.z += Math.cos(item.rotY) * zOffset;
      wd.rotation.set(0, item.rotY, 0);
      wd.scale.set(item.w * scaleMult, item.h * scaleMult, 1);
      wd.updateMatrix();
      inst.setMatrixAt(idx, wd.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  };

  buildWindowLayer(frameTransforms, frameGeo, frameMat, 0.0, 1.08);
  buildWindowLayer(darkGlassTransforms, paneGeo, darkGlassMat, 0.045, 0.92);
  buildWindowLayer(litWarmTransforms, paneGeo, litWarmMat, 0.045, 0.92);
  buildWindowLayer(litCoolTransforms, paneGeo, litCoolMat, 0.045, 0.92);
  buildWindowLayer(brokenVoidTransforms, paneGeo, brokenVoidMat, 0.042, 0.95);
  buildWindowLayer(shardTransforms, shardGeo, glassShardMat, 0.056, 0.9);

}
