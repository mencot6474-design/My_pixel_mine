import * as THREE from 'three';
import {
  createCyberShowcasePodium,
  type CyberShowcasePodiumHandle,
  type FusionPodiumBuildCtx,
} from './FusionWorldPodium3D';
import { getPedestalHoloRingTexture } from './PlotAuraFx3D';

export interface BossGravityRockSeed {
  radius: number;
  angle: number;
  speed: number;
  baseY: number;
  scale: [number, number, number];
  rotSpeedX: number;
  rotSpeedY: number;
  phase: number;
}

export interface BossHaloArcHandle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  phase: number;
  period: number;
}

export interface TowerArenaStageCtx {
  group: THREE.Group;
  monolithGroup: THREE.Group;
  bossFeetFxGroup: THREE.Group;
  bossGravityRockSeeds: BossGravityRockSeed[];
  bossArcs: BossHaloArcHandle[];
  summonPads: THREE.Mesh[];
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  ownedTextures: THREE.Texture[];
  bossCenterZ: number;
  getSpawnPos: (slotIndex: number) => THREE.Vector3;
}

export interface TowerArenaStageParts {
  spawnPodiums: CyberShowcasePodiumHandle[];
  bossGravityRocksInst: THREE.InstancedMesh;
  bossFloorPulseMesh: THREE.Mesh;
  bossFloorPulseMat: THREE.MeshBasicMaterial;
  eclipseCoronaRing: THREE.Mesh;
  eclipseOuterHalo: THREE.Mesh;
  eclipseCoronaMat: THREE.MeshBasicMaterial;
  eclipseHaloMat: THREE.MeshBasicMaterial;
  aiWireframeSphere: THREE.Mesh;
  aiGyroRing1: THREE.Mesh;
  aiGyroRing2: THREE.Mesh;
}

export function createBossLightningArcGeometry(
  start: THREE.Vector3,
  end: THREE.Vector3,
  seed: number
): THREE.BufferGeometry {
  const segs = 5;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = new THREE.Vector3().lerpVectors(start, end, t);
    if (i > 0 && i < segs) {
      const env = Math.sin(t * Math.PI);
      const jx = ((((seed * (i + 2) * 19) % 15) - 7) / 7) * 0.24 * env;
      const jy = ((((seed * (i + 5) * 23) % 15) - 7) / 7) * 0.24 * env;
      p.x += jx;
      p.y += jy;
    }
    pts.push(p);
  }

  const verts: number[] = [];
  const halfW = 0.032;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const perp = new THREE.Vector3(-(b.y - a.y), b.x - a.x, 0).normalize().multiplyScalar(halfW * (1 - (i / pts.length) * 0.35));
    verts.push(
      a.x + perp.x, a.y + perp.y, a.z,
      b.x + perp.x, b.y + perp.y, b.z,
      a.x - perp.x, a.y - perp.y, a.z,

      a.x - perp.x, a.y - perp.y, a.z,
      b.x + perp.x, b.y + perp.y, b.z,
      b.x - perp.x, b.y - perp.y, b.z
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createEclipseCoronaGlowTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(128, 128, 28, 128, 128, 126);
  grad.addColorStop(0.0, 'rgba(34, 211, 238, 0.92)');
  grad.addColorStop(0.32, 'rgba(56, 189, 248, 0.55)');
  grad.addColorStop(0.64, 'rgba(217, 70, 239, 0.24)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Segmented holographic HUD reticle ring
  ctx.strokeStyle = 'rgba(165, 243, 252, 0.75)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2 + 0.06;
    const a1 = ((i + 0.65) / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(128, 128, 92, a0, a1);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildTowerArenaStage(ctx: TowerArenaStageCtx): TowerArenaStageParts {
  const { getSpawnPos, bossCenterZ: BOSS_CENTER_Z } = ctx;
    // 2. Colossal Holographic AI Mainframe Core Hovering Above the Vanishing Cyber Highway
    const eclipseGroup = new THREE.Group();
    eclipseGroup.position.set(0, 7.6, -42);

    const coronaGlowTex = createEclipseCoronaGlowTexture();
    if (coronaGlowTex) ctx.ownedTextures.push(coronaGlowTex);
    const eclipseHaloMat = new THREE.MeshBasicMaterial({
      ...(coronaGlowTex ? { map: coronaGlowTex } : {}),
      color: 0x06b6d4,
      transparent: true,
      opacity: coronaGlowTex ? 0.85 : 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const eclipseOuterHalo = new THREE.Mesh(
      coronaGlowTex ? new THREE.PlaneGeometry(17.5, 17.5) : new THREE.RingGeometry(3.2, 6.4, 64),
      eclipseHaloMat
    );
    eclipseOuterHalo.position.z = -0.1;

    const eclipseCoronaMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const eclipseCoronaRing = new THREE.Mesh(new THREE.RingGeometry(3.15, 3.72, 48), eclipseCoronaMat);

    // Dark obsidian inner AI kernel sphere
    const aiCoreSphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.65, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x020617, fog: false })
    );

    // Rotating 3D Geodesic Wireframe AI Hologram Shell
    const aiWireframeSphere = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.12, 2),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
        fog: false,
      })
    );

    // Counter-rotating cyber-gyroscope data rings around the AI Core
    const aiGyroRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.065, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0xe879f9,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    aiGyroRing1.rotation.x = 0.42;

    const aiGyroRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(4.75, 0.05, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    aiGyroRing2.rotation.y = 0.55;

    eclipseGroup.add(
      eclipseOuterHalo,
      aiCoreSphere,
      aiWireframeSphere,
      eclipseCoronaRing,
      aiGyroRing1,
      aiGyroRing2
    );
    ctx.group.add(eclipseGroup);

    // 3. Five Front-Arc Chibi Spawn Cyber-Showcase Podiums & Ground Halo Rings (Crater Floor y = 0.08)
    const armorDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.48,
      metalness: 0.34,
      flatShading: true,
    });
    const armorSteelMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.38,
      metalness: 0.42,
      flatShading: true,
    });
    const brightSteelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.3,
      metalness: 0.48,
      flatShading: true,
    });
    ctx.ownedMats.push(armorDarkMat, armorSteelMat, brightSteelMat);
    const podiumCtx: FusionPodiumBuildCtx = {
      armorDarkMat,
      armorSteelMat,
      brightSteelMat,
      ownedGeos: ctx.ownedGeos,
      ownedMats: ctx.ownedMats,
      ownedTextures: ctx.ownedTextures,
    };

    const spawnPodiums: CyberShowcasePodiumHandle[] = [];
    const summonHoloTex = getPedestalHoloRingTexture();
    const conduitMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    ctx.ownedMats.push(conduitMat);
    const arenaCenterVec = new THREE.Vector3(0, 0.088, -1.6);

    for (let i = 0; i < 5; i++) {
      const sp = getSpawnPos(i);
      // 50% larger podium scale (0.78 -> 1.17) for commanding Chibi presence
      const podium = createCyberShowcasePodium(podiumCtx, `0${i + 1}`, 1.17, false);
      podium.group.position.set(sp.x, 0.08, sp.z);
      podium.group.rotation.y = Math.atan2(-sp.x, BOSS_CENTER_Z - sp.z);
      podium.auraGroup.visible = false;
      ctx.group.add(podium.group);
      spawnPodiums.push(podium);

      const pad = new THREE.Mesh(
        summonHoloTex ? new THREE.PlaneGeometry(2.625, 2.625) : new THREE.RingGeometry(0.87, 1.23, 24),
        new THREE.MeshBasicMaterial({
          ...(summonHoloTex ? { map: summonHoloTex } : {}),
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(sp.x, 0.095, sp.z);
      ctx.group.add(pad);
      ctx.summonPads.push(pad);

      // Flush floor energy conduit connecting each podium inward to the central battle court
      const toCenterX = arenaCenterVec.x - sp.x;
      const toCenterZ = arenaCenterVec.z - sp.z;
      const totalDist = Math.hypot(toCenterX, toCenterZ);
      const conduitLen = Math.max(0.5, totalDist - 2.35);
      const conduitGeo = new THREE.PlaneGeometry(0.14, conduitLen);
      ctx.ownedGeos.push(conduitGeo);
      const conduitMesh = new THREE.Mesh(conduitGeo, conduitMat);
      conduitMesh.rotation.x = -Math.PI / 2;
      conduitMesh.rotation.z = Math.atan2(-toCenterX, -toCenterZ);
      const midDist = 1.45 + conduitLen * 0.5;
      conduitMesh.position.set(
        sp.x + (toCenterX / Math.max(0.01, totalDist)) * midDist,
        0.088,
        sp.z + (toCenterZ / Math.max(0.01, totalDist)) * midDist
      );
      ctx.group.add(conduitMesh);
    }

    // 4. Central Boss Dais & Anchor Group (Populated with 2D Twin Chibi Boss Sprite in TowerArena3D)
    const bossDaisBaseGeo = new THREE.CylinderGeometry(2.15, 2.42, 0.08, 8);
    const bossDaisTrimGeo = new THREE.CylinderGeometry(2.2, 2.24, 0.03, 8);
    ctx.ownedGeos.push(bossDaisBaseGeo, bossDaisTrimGeo);
    const bossDaisBase = new THREE.Mesh(bossDaisBaseGeo, armorDarkMat);
    bossDaisBase.position.set(0, 0.115, BOSS_CENTER_Z);
    bossDaisBase.rotation.y = Math.PI / 8;
    bossDaisBase.receiveShadow = true;
    const bossDaisTrim = new THREE.Mesh(bossDaisTrimGeo, armorSteelMat);
    bossDaisTrim.position.set(0, 0.165, BOSS_CENTER_Z);
    bossDaisTrim.rotation.y = Math.PI / 8;
    bossDaisTrim.receiveShadow = true;
    ctx.group.add(bossDaisBase, bossDaisTrim);

    ctx.monolithGroup.position.set(0, 0.16, BOSS_CENTER_Z);
    ctx.group.add(ctx.monolithGroup);

    // 4b. Crater Floor Boss Feet Aura: Contact Shadow, Dim Red-Orange Shockwave, Anti-Gravity Rocks & Ground-to-Body Sparks
    ctx.bossFeetFxGroup.position.set(0, 0.08, BOSS_CENTER_Z);
    ctx.group.add(ctx.bossFeetFxGroup);

    const bossShadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.18, 24),
      new THREE.MeshBasicMaterial({
        color: 0x020306,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    );
    bossShadowMesh.rotation.x = -Math.PI / 2;
    bossShadowMesh.position.y = 0.008;
    ctx.bossFeetFxGroup.add(bossShadowMesh);

    const bossFloorPulseMat = new THREE.MeshBasicMaterial({
      color: 0xea580c,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const bossFloorPulseMesh = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.82, 36), bossFloorPulseMat);
    bossFloorPulseMesh.rotation.x = -Math.PI / 2;
    bossFloorPulseMesh.position.y = 0.014;
    ctx.bossFeetFxGroup.add(bossFloorPulseMesh);

    const GRAVITY_ROCK_COUNT = 9;
    const gravRockGeo = new THREE.DodecahedronGeometry(1.0, 0);
    const gravRockMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e2a,
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
    });
    const bossGravityRocksInst = new THREE.InstancedMesh(gravRockGeo, gravRockMat, GRAVITY_ROCK_COUNT);
    bossGravityRocksInst.castShadow = true;
    bossGravityRocksInst.receiveShadow = true;
    for (let i = 0; i < GRAVITY_ROCK_COUNT; i++) {
      ctx.bossGravityRockSeeds.push({
        radius: 1.45 + (i % 3) * 0.34,
        angle: (i / GRAVITY_ROCK_COUNT) * Math.PI * 2,
        speed: 0.28 + (i % 3) * 0.07,
        baseY: 0.2 + (i % 4) * 0.09,
        scale: [0.15 + (i % 3) * 0.03, 0.11 + (i % 2) * 0.03, 0.13 + ((i + 1) % 3) * 0.03],
        rotSpeedX: 0.7 + (i % 3) * 0.25,
        rotSpeedY: 0.8 + (i % 2) * 0.35,
        phase: i * 0.9,
      });
    }
    ctx.bossFeetFxGroup.add(bossGravityRocksInst);

    // Asymmetrical Short Lightning Arcs Crackling Between Crater Floor Fissures & Elevated Lower Boss Body
    const groundArcSpecs: [THREE.Vector3, THREE.Vector3, number][] = [
      [new THREE.Vector3(-1.35, 0.02, 0.25), new THREE.Vector3(-0.48, 1.08, 0.04), 13],
      [new THREE.Vector3(1.42, 0.02, 0.18), new THREE.Vector3(0.52, 1.2, 0.04), 29],
      [new THREE.Vector3(-0.88, 0.02, -0.55), new THREE.Vector3(-0.36, 1.46, -0.05), 41],
      [new THREE.Vector3(1.05, 0.02, -0.48), new THREE.Vector3(0.42, 0.98, 0.02), 59],
      [new THREE.Vector3(-0.22, 0.02, 0.85), new THREE.Vector3(0.16, 0.94, 0.08), 73],
    ];
    groundArcSpecs.forEach(([p0, p1, seed], idx) => {
      const arcMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0xfb923c : 0xfde68a,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const arcMesh = new THREE.Mesh(createBossLightningArcGeometry(p0, p1, seed), arcMat);
      arcMesh.visible = false;
      ctx.bossFeetFxGroup.add(arcMesh);
      ctx.bossArcs.push({
        mesh: arcMesh,
        mat: arcMat,
        phase: idx * 0.74,
        period: 1.35 + (idx % 3) * 0.55,
      });
    });
  return {
    spawnPodiums,
    bossGravityRocksInst,
    bossFloorPulseMesh,
    bossFloorPulseMat,
    eclipseCoronaRing,
    eclipseOuterHalo,
    eclipseCoronaMat,
    eclipseHaloMat,
    aiWireframeSphere,
    aiGyroRing1,
    aiGyroRing2,
  };
}

export interface TowerShardParticle {
  mesh: THREE.Mesh;
  ownsMat: boolean;
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

  export function spawnTowerArenaShards(
    lx: number,
    ly: number,
    lz: number,
    colorHex: string,
    count: number,
    isShatter = false,
    isBoss = false,
    ctx: {
      shardPool: TowerShardParticle[];
      shardGroup: THREE.Group;
      sharedShardGeo: THREE.BufferGeometry;
      sharedRockGeo: THREE.BufferGeometry;
      rockChipMat: THREE.Material;
      maxCap?: number;
    }
  ): void {
    const maxCap = ctx.maxCap ?? 64;
    for (let i = 0; i < count; i++) {
      if (ctx.shardPool.length >= maxCap) {
        const oldest = ctx.shardPool.shift();
        if (oldest) {
          ctx.shardGroup.remove(oldest.mesh);
          if (oldest.ownsMat) (oldest.mesh.material as THREE.Material).dispose();
        }
      }
      const isCrystal = isBoss ? i % 4 !== 3 : isShatter ? i % 3 !== 2 : i % 2 === 0;
      const mat = isCrystal
        ? new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 0.82,
            roughness: 0.22,
            metalness: 0.35,
            flatShading: true,
          })
        : ctx.rockChipMat;
      const mesh = new THREE.Mesh(isCrystal ? ctx.sharedShardGeo : ctx.sharedRockGeo, mat);
      mesh.position.set(
        lx + (Math.random() - 0.5) * (isShatter ? 0.85 : 0.55),
        ly + (Math.random() - 0.3) * (isShatter ? 0.75 : 0.45),
        lz + (Math.random() - 0.5) * (isShatter ? 0.85 : 0.55)
      );
      const ang = Math.random() * Math.PI * 2;
      const spd = (isShatter ? 3.0 : 2.0) + Math.random() * (isShatter ? 4.4 : 2.8);
      const baseScale = (isShatter ? 0.9 : 0.68) + Math.random() * (isShatter ? 0.65 : 0.42);
      mesh.scale.setScalar(baseScale);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      ctx.shardGroup.add(mesh);
      ctx.shardPool.push({
        mesh,
        ownsMat: isCrystal,
        vx: Math.cos(ang) * spd,
        vy: (isShatter ? 3.6 : 2.5) + Math.random() * (isShatter ? 3.8 : 2.5),
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


export function stepTowerBossFeetFx(
  elapsed: number,
  ctx: {
    bossArcs: BossHaloArcHandle[];
    bossGravityRockSeeds: BossGravityRockSeed[];
    bossGravityDummy: THREE.Object3D;
    bossGravityRocksInst: THREE.InstancedMesh;
    bossFloorPulseMesh: THREE.Mesh;
    bossFloorPulseMat: THREE.MeshBasicMaterial;
  }
): void {
      // Brief asymmetrical lightning arcs crackling between crater cracks and Boss lower body
      for (let i = 0; i < ctx.bossArcs.length; i++) {
        const arc = ctx.bossArcs[i];
        const cycle = (elapsed + arc.phase) % arc.period;
        const on = cycle < 0.1 || (cycle > 0.18 && cycle < 0.24);
        arc.mesh.visible = on;
        if (on) {
          arc.mat.opacity = 0.58 + Math.sin(elapsed * 45 + i) * 0.24;
        }
      }

      // Low anti-gravity crater rock fragments hovering slowly around Boss's feet
      for (let i = 0; i < ctx.bossGravityRockSeeds.length; i++) {
        const rs = ctx.bossGravityRockSeeds[i];
        const a = rs.angle + elapsed * rs.speed;
        ctx.bossGravityDummy.position.set(
          Math.cos(a) * rs.radius,
          rs.baseY + Math.sin(elapsed * 1.8 + rs.phase) * 0.075,
          Math.sin(a) * rs.radius
        );
        ctx.bossGravityDummy.rotation.set(
          elapsed * rs.rotSpeedX + rs.phase,
          elapsed * rs.rotSpeedY,
          rs.phase
        );
        ctx.bossGravityDummy.scale.set(rs.scale[0], rs.scale[1], rs.scale[2]);
        ctx.bossGravityDummy.updateMatrix();
        ctx.bossGravityRocksInst.setMatrixAt(i, ctx.bossGravityDummy.matrix);
      }
      ctx.bossGravityRocksInst.instanceMatrix.needsUpdate = true;

      // Subtle dim pulsing red-orange shockwave on crater floor beneath Boss's feet
      const wavePhase = (elapsed * 0.62) % 1;
      const waveScale = 0.85 + wavePhase * 0.45;
      ctx.bossFloorPulseMesh.scale.setScalar(waveScale);
      ctx.bossFloorPulseMat.opacity = Math.max(0, (1 - wavePhase) * 0.34);
}

export function stepTowerShardPool(
  safeDt: number,
  ctx: { shardPool: TowerShardParticle[]; shardGroup: THREE.Group }
): void {
    for (let i = ctx.shardPool.length - 1; i >= 0; i--) {
      const p = ctx.shardPool[i];
      p.age += safeDt;
      if (p.age >= p.dur) {
        ctx.shardGroup.remove(p.mesh);
        if (p.ownsMat) (p.mesh.material as THREE.Material).dispose();
        ctx.shardPool.splice(i, 1);
        continue;
      }
      p.vy -= 15.5 * safeDt;
      p.mesh.position.x += p.vx * safeDt;
      let nextY = p.mesh.position.y + p.vy * safeDt;
      if (nextY <= 0.14) {
        nextY = 0.14;
        if (p.vy < -0.6 && p.bounces < 2) {
          p.vy = -p.vy * 0.42;
          p.vx *= 0.72;
          p.vz *= 0.72;
          p.rx *= 0.65;
          p.rz *= 0.65;
          p.bounces++;
        } else {
          p.vy = 0;
          p.vx *= Math.max(0.2, 1 - safeDt * 6);
          p.vz *= Math.max(0.2, 1 - safeDt * 6);
        }
      }
      p.mesh.position.y = nextY;
      p.mesh.position.z += p.vz * safeDt;
      p.mesh.rotation.x += p.rx * safeDt;
      p.mesh.rotation.y += p.ry * safeDt;
      p.mesh.rotation.z += p.rz * safeDt;
      const lifeRatio = p.age / p.dur;
      const shrink = lifeRatio < 0.62 ? 1 : Math.max(0.04, 1 - (lifeRatio - 0.62) / 0.38);
      p.mesh.scale.setScalar(p.baseScale * shrink);
    }
}

export function stepTowerSpawnPodiums(
  elapsed: number,
  podiums: readonly CyberShowcasePodiumHandle[]
): void {
  for (let i = 0; i < podiums.length; i++) {
    const pod = podiums[i];
    const pTime = elapsed + i * 0.55;
    pod.sigilMesh.rotation.z = pTime * 0.28;
    if (pod.auraGroup.visible) {
      pod.auraVeilMat.uniforms.uTime.value = pTime;
      pod.auraVeilMat.uniforms.uOpacity.value = 0.42 + Math.sin(pTime * 1.8) * 0.08;
      pod.auraOuterVeilMat.uniforms.uTime.value = pTime + 0.6;
      pod.auraOuterVeilMat.uniforms.uOpacity.value = 0.22 + Math.sin(pTime * 1.8) * 0.05;
      pod.particleMat.uniforms.uTime.value = pTime;
    }
  }
}
