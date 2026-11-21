import * as THREE from 'three';
import { getOresByWorld, type OreDef, type WorldId } from '../game/GameData';
import { createCyberLanternBollardFinial } from './CyberProps3D';
import { type MineWorldPalette, type OreVariantKey, WORLD_PALETTES } from './MineWorldPalette';
import { getWeatherById, type WeatherId } from '../game/WeatherData';
import type { AttackImpactFxController } from './AttackImpactFx3D';
import type { OreBillboard2D } from './OreBillboard3D';
import { getSoftContactShadowTexture } from './OreBillboard3D';
import {
  getHazardStripeTexture,
  getQuarryFloorTexture,
  getShockwaveRingTexture,
} from './ProceduralTextures3D';

export function resolveWorldIdFromPalette(palette: MineWorldPalette): WorldId {
  for (const [id, p] of Object.entries(WORLD_PALETTES) as Array<[WorldId, MineWorldPalette]>) {
    if (p === palette) return id;
  }
  return 'underground';
}

export function pickWorldOreForVariant(worldId: WorldId, variantKey: OreVariantKey): OreDef {
  const ores = getOresByWorld(worldId);
  const pool =
    ores.length <= 5
      ? variantKey === 'geode'
        ? ores.slice(Math.max(0, ores.length - 2))
        : variantKey === 'vein'
          ? ores.slice(1, Math.min(ores.length, 4))
          : ores.slice(0, 2)
      : variantKey === 'geode'
        ? ores.slice(5, 8)
        : variantKey === 'vein'
          ? ores.slice(2, 5)
          : ores.slice(0, 2);
  const list = pool.length > 0 ? pool : ores;
  return list[Math.floor(Math.random() * list.length)] ?? ores[0];
}

export function buildOrePitEnvironmentMeshes(ctx: {
  group: THREE.Group;
  palette: MineWorldPalette;
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
}): {
  floorMat: THREE.MeshStandardMaterial;
  wallMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  pitNeonMat: THREE.MeshStandardMaterial;
} {
  const { palette } = ctx;
    // Sunlit Textured Sunken Quarry Floor (sits cleanly 0.68m below courtyard deck y=0)
    const floorMat = new THREE.MeshStandardMaterial({
      map: getQuarryFloorTexture(palette.pitFloorColor, palette.crystalColor),
      roughness: 0.85,
      metalness: 0.05,
    });
    const floorGeo = new THREE.BoxGeometry(11.8, 0.14, 6.8);
    ctx.ownedGeos.push(floorGeo);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    ctx.group.add(floor);

    // Full-Height Excavated Cyber-Slate Retaining Walls + Hazard Collar + Thin Neon Rim
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2a3952,
      roughness: 0.76,
      metalness: 0.1,
      flatShading: true,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      map: getHazardStripeTexture(palette.crystalColor),
      roughness: 0.42,
      metalness: 0.25,
    });
    const pitNeonMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 1.05,
      roughness: 0.2,
      metalness: 0.25,
      flatShading: true,
    });

    const pitW = 11.8;
    const pitD = 6.8;
    const wallH = 0.86;
    // Open portals:
    // - North center (x in [-1.3, +1.3]) for stepped cyber stairwell descending from deck
    // - Left spur (z in [-1.25, +0.25] -> world z=0.15) for sloped Drop Shaft shuttle entry
    // - Right chute (z in [-1.25, +0.25] -> world z=0.15) for inclined Plasma Refinery conveyor exit
    const wallSpecs: [number, number, number, number, number][] = [
      [-3.6, -pitD / 2, 4.6, wallH, 0.36],
      [3.6, -pitD / 2, 4.6, wallH, 0.36],
      [0, pitD / 2, pitW, wallH, 0.36],
      [-pitW / 2, -2.325, 0.36, wallH, 2.15],
      [-pitW / 2, 1.825, 0.36, wallH, 3.15],
      [pitW / 2, -2.325, 0.36, wallH, 2.15],
      [pitW / 2, 1.825, 0.36, wallH, 3.15],
    ];
    for (const [wx, wz, ww, wh, wd] of wallSpecs) {
      const wallGeo = new THREE.BoxGeometry(ww, wh, wd);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(wx, wh * 0.5, wz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      ctx.group.add(wall);

      const trimGeo = new THREE.BoxGeometry(ww > wd ? ww : 0.34, 0.11, wd > ww ? wd : 0.34);
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(wx, wh + 0.04, wz);
      trim.castShadow = true;
      ctx.group.add(trim);

      const isHoriz = ww > wd;
      const neonGeo = new THREE.BoxGeometry(isHoriz ? ww + 0.04 : 0.06, 0.035, isHoriz ? 0.06 : wd + 0.04);
      const neonRim = new THREE.Mesh(neonGeo, pitNeonMat);
      neonRim.position.set(wx, wh + 0.115, wz);
      ctx.group.add(neonRim);
      ctx.ownedGeos.push(wallGeo, trimGeo, neonGeo);
    }

    // Stepped inner basalt retaining ledge along bottom perimeter
    const benchSpecs: [number, number, number, number][] = [
      [-3.6, -pitD / 2 + 0.26, 4.4, 0.28],
      [3.6, -pitD / 2 + 0.26, 4.4, 0.28],
      [0, pitD / 2 - 0.26, 11.4, 0.28],
    ];
    for (const [bx, bz, bw, bd] of benchSpecs) {
      const benchGeo = new THREE.BoxGeometry(bw, 0.26, bd);
      ctx.ownedGeos.push(benchGeo);
      const bench = new THREE.Mesh(benchGeo, wallMat);
      bench.position.set(bx, 0.13, bz);
      bench.receiveShadow = true;
      bench.castShadow = true;
      ctx.group.add(bench);
    }

    // Corner Cyber Steel Anchor Pylons + Glowing Beacon Collars framing the excavated pit rim
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x223047,
      roughness: 0.44,
      metalness: 0.42,
      flatShading: true,
    });
    const steelCapMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d6b,
      metalness: 0.48,
      roughness: 0.34,
      flatShading: true,
    });
    const postGeo = new THREE.CylinderGeometry(0.24, 0.28, 1.04, 8);
    ctx.ownedGeos.push(postGeo);
    ctx.ownedMats.push(postMat, steelCapMat);
    const trackedCornerGeos = new Set<THREE.BufferGeometry>();
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = sx * (pitW / 2);
        const pz = sz * (pitD / 2);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, 0.52, pz);
        post.castShadow = true;
        const finial = createCyberLanternBollardFinial({
          frameMat: postMat,
          steelMat: steelCapMat,
          coreMat: pitNeonMat,
          scale: 0.86,
        });
        finial.position.set(px, 1.02, pz);
        finial.traverse((child) => {
          if (child instanceof THREE.Mesh && !trackedCornerGeos.has(child.geometry)) {
            trackedCornerGeos.add(child.geometry);
            ctx.ownedGeos.push(child.geometry);
          }
        });
        ctx.group.add(post, finial);
      }
    }
  return { floorMat, wallMat, trimMat, pitNeonMat };
}

export function buildOrePitMeteorAndSpotFx(ctx: {
  group: THREE.Group;
  meteorRoot: THREE.Group;
  meteorEntryGroup: THREE.Group;
  meteorTargetGroup: THREE.Group;
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  meteorTargetX: number;
  meteorTargetZ: number;
  meteorStartX: number;
  meteorStartY: number;
  meteorStartZ: number;
}): {
  meteorCoreMat: THREE.MeshBasicMaterial;
  meteorBowMat: THREE.MeshBasicMaterial;
  meteorTailOuterMat: THREE.MeshBasicMaterial;
  meteorTailInnerMat: THREE.MeshBasicMaterial;
  meteorTailOuterMesh: THREE.Mesh;
  meteorTailInnerMesh: THREE.Mesh;
  meteorTargetShadow: THREE.Mesh;
  meteorTargetShadowMat: THREE.MeshBasicMaterial;
  meteorTargetRing: THREE.Mesh;
  meteorTargetRingMat: THREE.MeshBasicMaterial;
  sweetSpotFloorRing: THREE.Mesh;
  sweetSpotFloorMat: THREE.MeshBasicMaterial;
} {
  const {
    meteorTargetX: METEOR_TARGET_X,
    meteorTargetZ: METEOR_TARGET_Z,
    meteorStartX: METEOR_START_X,
    meteorStartY: METEOR_START_Y,
    meteorStartZ: METEOR_START_Z,
  } = ctx;
    // 3D Atmospheric Entry Plasma Envelope & Tail Plume (oriented along dive trajectory)
    const entryBackDir = new THREE.Vector3(
      METEOR_START_X - METEOR_TARGET_X,
      METEOR_START_Y,
      METEOR_START_Z - METEOR_TARGET_Z
    ).normalize();
    ctx.meteorEntryGroup.position.set(0, 1.4, 0);
    ctx.meteorEntryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), entryBackDir);
    ctx.meteorEntryGroup.visible = false;

    const coreGeo = new THREE.IcosahedronGeometry(0.92, 1);
    const bowGeo = new THREE.ConeGeometry(1.36, 1.75, 9, 1, true);
    const tailOuterGeo = new THREE.ConeGeometry(1.06, 5.4, 9, 1, true);
    const tailInnerGeo = new THREE.ConeGeometry(0.54, 4.1, 7, 1, true);
    ctx.ownedGeos.push(coreGeo, bowGeo, tailOuterGeo, tailInnerGeo);

    const meteorCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const meteorBowMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const meteorTailOuterMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const meteorTailInnerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    ctx.ownedMats.push(
      meteorCoreMat,
      meteorBowMat,
      meteorTailOuterMat,
      meteorTailInnerMat
    );

    const coreMesh = new THREE.Mesh(coreGeo, meteorCoreMat);
    const bowMesh = new THREE.Mesh(bowGeo, meteorBowMat);
    bowMesh.rotation.x = Math.PI;
    bowMesh.position.y = -0.35;

    const meteorTailOuterMesh = new THREE.Mesh(tailOuterGeo, meteorTailOuterMat);
    meteorTailOuterMesh.position.y = 2.6;
    const meteorTailInnerMesh = new THREE.Mesh(tailInnerGeo, meteorTailInnerMat);
    meteorTailInnerMesh.position.y = 2.1;

    ctx.meteorEntryGroup.add(coreMesh, bowMesh, meteorTailOuterMesh, meteorTailInnerMesh);
    ctx.meteorRoot.add(ctx.meteorEntryGroup);

    // Ground Strike Telegraph Shadow & Contracting Target Ring
    ctx.meteorTargetGroup.position.set(METEOR_TARGET_X, 0.038, METEOR_TARGET_Z);
    ctx.meteorTargetGroup.visible = false;
    const targetShadowGeo = new THREE.CircleGeometry(1.55, 24);
    const targetRingGeo = new THREE.PlaneGeometry(3.6, 3.6);
    ctx.ownedGeos.push(targetShadowGeo, targetRingGeo);

    const shadowTex = getSoftContactShadowTexture();
    const meteorTargetShadowMat = new THREE.MeshBasicMaterial({
      ...(shadowTex ? { map: shadowTex } : {}),
      color: 0x020617,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const ringTex = getShockwaveRingTexture();
    const meteorTargetRingMat = new THREE.MeshBasicMaterial({
      ...(ringTex ? { map: ringTex } : {}),
      color: 0xf472b6,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    ctx.ownedMats.push(meteorTargetShadowMat, meteorTargetRingMat);

    const meteorTargetShadow = new THREE.Mesh(targetShadowGeo, meteorTargetShadowMat);
    meteorTargetShadow.rotation.x = -Math.PI / 2;
    const meteorTargetRing = new THREE.Mesh(targetRingGeo, meteorTargetRingMat);
    meteorTargetRing.rotation.x = -Math.PI / 2;
    meteorTargetRing.position.y = 0.008;
    ctx.meteorTargetGroup.add(meteorTargetShadow, meteorTargetRing);
    ctx.group.add(ctx.meteorTargetGroup);

    // Flat horizontal Weak-Spot / Sweet-Spot floor ring (never tilted/tumbling)
    const sweetRingGeo = new THREE.PlaneGeometry(2.75, 2.75);
    ctx.ownedGeos.push(sweetRingGeo);
    const sweetSpotFloorMat = new THREE.MeshBasicMaterial({
      ...(ringTex ? { map: ringTex } : {}),
      color: 0xfde047,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    ctx.ownedMats.push(sweetSpotFloorMat);
    const sweetSpotFloorRing = new THREE.Mesh(sweetRingGeo, sweetSpotFloorMat);
    sweetSpotFloorRing.rotation.x = -Math.PI / 2;
    sweetSpotFloorRing.position.y = 0.042;
    sweetSpotFloorRing.visible = false;
    ctx.group.add(sweetSpotFloorRing);

  return {
    meteorCoreMat,
    meteorBowMat,
    meteorTailOuterMat,
    meteorTailInnerMat,
    meteorTailOuterMesh,
    meteorTailInnerMesh,
    meteorTargetShadow,
    meteorTargetShadowMat,
    meteorTargetRing,
    meteorTargetRingMat,
    sweetSpotFloorRing,
    sweetSpotFloorMat,
  };
}

export interface OrePitShardParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  baseScale: number;
  bounces: number;
  age: number;
  dur: number;
}

  export function spawnOrePitShards(lx: number, lz: number, count: number, isShatter = false, isMeteor: boolean,
    ctx: {
      group: THREE.Group;
      shardPool: OrePitShardParticle[];
      shardFreeCrystal: THREE.Mesh[];
      shardFreeRock: THREE.Mesh[];
      shardMat: THREE.Material;
      rockChipMat: THREE.Material;
      sharedShardGeo: THREE.BufferGeometry;
      sharedRockGeo: THREE.BufferGeometry;
    }
  ): void {
    const maxCap = 36;
    for (let i = 0; i < count; i++) {
      if (ctx.shardPool.length >= maxCap) {
        const oldest = ctx.shardPool.shift();
        if (oldest) {
          ctx.group.remove(oldest.mesh);
          const freeArr = oldest.mesh.material === ctx.shardMat ? ctx.shardFreeCrystal : ctx.shardFreeRock;
          if (freeArr.length < maxCap) freeArr.push(oldest.mesh);
        }
      }
      const isCrystal = isShatter ? i % 3 !== 2 : i % 2 === 0;
      const freeArr = isCrystal ? ctx.shardFreeCrystal : ctx.shardFreeRock;
      const mesh =
        freeArr.pop() ??
        new THREE.Mesh(
          isCrystal ? ctx.sharedShardGeo : ctx.sharedRockGeo,
          isCrystal ? ctx.shardMat : ctx.rockChipMat
        );
      mesh.position.set(
        lx + (Math.random() - 0.5) * (isShatter ? 0.8 : 0.5),
        0.55 + Math.random() * (isShatter ? 0.85 : 0.5),
        lz + (Math.random() - 0.5) * (isShatter ? 0.8 : 0.5)
      );
      const ang = Math.random() * Math.PI * 2;
      const spd = (isShatter ? (isMeteor ? 3.8 : 2.8) : 1.8) + Math.random() * (isShatter ? 4.4 : 2.8);
      const baseScale = (isShatter ? (isMeteor ? 1.15 : 0.85) : 0.65) + Math.random() * (isShatter ? 0.65 : 0.42);
      mesh.scale.setScalar(baseScale);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      ctx.group.add(mesh);
      ctx.shardPool.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: (isShatter ? (isMeteor ? 4.4 : 3.4) : 2.5) + Math.random() * (isShatter ? 4.0 : 2.6),
        vz: Math.sin(ang) * spd,
        rx: (Math.random() - 0.5) * 16,
        ry: (Math.random() - 0.5) * 14,
        rz: (Math.random() - 0.5) * 16,
        baseScale,
        bounces: 0,
        age: 0,
        dur: (isShatter ? 0.68 : 0.48) + Math.random() * 0.28,
      });
    }
  }


export function stepOrePitShards(
  dtSec: number,
  ctx: {
    group: THREE.Group;
    shardPool: OrePitShardParticle[];
    shardFreeCrystal: THREE.Mesh[];
    shardFreeRock: THREE.Mesh[];
    shardMat: THREE.Material;
  }
): void {
    for (let i = ctx.shardPool.length - 1; i >= 0; i--) {
      const p = ctx.shardPool[i];
      p.age += dtSec;
      if (p.age >= p.dur) {
        ctx.group.remove(p.mesh);
        const freeArr = p.mesh.material === ctx.shardMat ? ctx.shardFreeCrystal : ctx.shardFreeRock;
        if (freeArr.length < 72) freeArr.push(p.mesh);
        ctx.shardPool.splice(i, 1);
        continue;
      }
      p.vy -= 15.5 * dtSec;
      p.mesh.position.x += p.vx * dtSec;
      let nextY = p.mesh.position.y + p.vy * dtSec;
      if (nextY <= 0.09) {
        nextY = 0.09;
        if (p.vy < -0.6 && p.bounces < 2) {
          p.vy = -p.vy * 0.42;
          p.vx *= 0.72;
          p.vz *= 0.72;
          p.rx *= 0.65;
          p.rz *= 0.65;
          p.bounces++;
        } else {
          p.vy = 0;
          p.vx *= Math.max(0.2, 1 - dtSec * 6);
          p.vz *= Math.max(0.2, 1 - dtSec * 6);
        }
      }
      p.mesh.position.y = nextY;
      p.mesh.position.z += p.vz * dtSec;
      p.mesh.rotation.x += p.rx * dtSec;
      p.mesh.rotation.y += p.ry * dtSec;
      p.mesh.rotation.z += p.rz * dtSec;
      const lifeRatio = p.age / p.dur;
      const shrink = lifeRatio < 0.62 ? 1 : Math.max(0.04, 1 - (lifeRatio - 0.62) / 0.38);
      p.mesh.scale.setScalar(p.baseScale * shrink);
    }

}

export function updateSweetSpotRingMesh(opts: {
  ring: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  x: number;
  z: number;
  isMeteor: boolean;
  progress: number;
  inWindow: boolean;
  elapsed: number;
}): void {
  opts.ring.visible = true;
  opts.ring.position.set(opts.x, 0.042, opts.z);
  const scaleBase = opts.isMeteor ? 1.55 : 1.0;
  const contractScale = Math.max(0.32, 1.38 - opts.progress * 0.96) * scaleBase;
  opts.ring.scale.setScalar(contractScale);
  opts.ring.rotation.z = -opts.elapsed * 1.4;
  opts.mat.color.setHex(opts.inWindow ? 0x38bdf8 : 0xfde047);
  opts.mat.opacity = opts.inWindow ? 0.92 : 0.62;
}

export interface MeteorDropNodeLike {
  x: number;
  z: number;
  dropY?: number;
  dropProgress?: number;
  dropDuration?: number;
  trailTimer?: number;
  spawnScale: number;
  squashAmt: number;
  flashTimer: number;
  meteorWeatherId?: WeatherId | null;
  root: THREE.Group;
  oreSprite: OreBillboard2D;
  geodeRing: THREE.Mesh;
}

export function stepOrePitMeteorDrop(ctx: {
  node: MeteorDropNodeLike;
  dtSec: number;
  elapsed: number;
  camera?: THREE.Camera;
  dropDuration: number;
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  meteorEntryGroup: THREE.Group;
  meteorTargetGroup: THREE.Group;
  meteorTailOuterMesh: THREE.Mesh;
  meteorTailInnerMesh: THREE.Mesh;
  meteorTargetShadow: THREE.Mesh;
  meteorTargetShadowMat: THREE.MeshBasicMaterial;
  meteorTargetRing: THREE.Mesh;
  meteorTargetRingMat: THREE.MeshBasicMaterial;
  group: THREE.Group;
  impactFx: AttackImpactFxController;
  spawnShardsAt: (lx: number, lz: number, count: number, isShatter: boolean, isMeteor: boolean) => void;
  onMeteorLanded?: () => void;
}): { meteorRoll: number; meteorStretchY: number } {
  const { node, dtSec, elapsed, camera } = ctx;
  let meteorRoll = 0;
  let meteorStretchY = 1;
        const prevP = node.dropProgress ?? 0;
        const dur = node.dropDuration ?? ctx.dropDuration;
        const nextP = Math.min(1, prevP + dtSec / dur);
        node.dropProgress = nextP;
        // Accelerating atmospheric dive curve toward impact center
        const ease = nextP * nextP * (0.35 + 0.65 * nextP);
        node.x = ctx.startX + (ctx.targetX - ctx.startX) * ease;
        node.z = ctx.startZ + (ctx.targetZ - ctx.startZ) * ease;
        node.dropY = ctx.startY * (1 - ease);
        node.root.position.set(node.x, node.dropY, node.z);
        node.spawnScale = 0.62 + ease * 0.38;

        const accent = node.meteorWeatherId
          ? getWeatherById(node.meteorWeatherId).accentColor
          : '#f472b6';

        if (nextP < 1) {
          ctx.meteorEntryGroup.visible = true;
          ctx.meteorTargetGroup.visible = true;
          ctx.meteorTailOuterMesh.rotation.y += dtSec * 10;
          ctx.meteorTailInnerMesh.rotation.y -= dtSec * 15;
          const flamePulse = 0.88 + Math.sin(elapsed * 48) * 0.16;
          ctx.meteorTailOuterMesh.scale.set(1, flamePulse, 1);
          ctx.meteorTailInnerMesh.scale.set(1, 0.92 + Math.cos(elapsed * 56) * 0.14, 1);

          ctx.meteorTargetShadow.scale.setScalar(1.85 - ease * 0.95);
          ctx.meteorTargetShadowMat.opacity = 0.16 + ease * 0.72;
          const ringPulse = 1 + Math.sin(elapsed * 18) * 0.08;
          ctx.meteorTargetRing.scale.setScalar((1.55 - ease * 0.78) * ringPulse);
          ctx.meteorTargetRing.rotation.z -= dtSec * 2.4;
          ctx.meteorTargetRingMat.opacity = 0.35 + ease * 0.55;

          meteorRoll = -0.28 * (1 - ease) + Math.sin(elapsed * 42) * 0.06;
          meteorStretchY = 1 + (1 - ease) * 0.24;

          node.trailTimer = (node.trailTimer ?? 0) - dtSec;
          if (nextP < 0.94 && (node.trailTimer ?? 0) <= 0 && ctx.group.visible) {
            node.trailTimer = 0.04;
            ctx.impactFx.spawnMeteorTrail({
              x: node.x,
              y: node.dropY + 1.35,
              z: node.z,
              accentColor: accent,
              camera,
            });
          }
        } else {
          node.x = ctx.targetX;
          node.z = ctx.targetZ;
          node.dropY = 0;
          node.spawnScale = 1;
          node.root.position.set(node.x, 0, node.z);
          ctx.meteorEntryGroup.visible = false;
          ctx.meteorTargetGroup.visible = false;
          node.oreSprite.setCollarVisible(true);
          node.geodeRing.visible = true;
          node.squashAmt = 0.56;
          node.flashTimer = 0.14;
          if (ctx.group.visible) {
            ctx.impactFx.spawnMeteorLanding({
              targetX: node.x,
              targetZ: node.z,
              accentColor: accent,
              camera,
            });
            ctx.spawnShardsAt(node.x, node.z, 18, true, true);
            ctx.onMeteorLanded?.();
          }
        }
  return { meteorRoll, meteorStretchY };
}
