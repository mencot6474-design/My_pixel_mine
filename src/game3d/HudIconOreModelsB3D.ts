import * as THREE from 'three';
import { ItemRarity } from '../game/GameData';
import {
  buildAncientRuinsOreModel,
  buildCrystalCavesOreModel,
  buildMagmaHollowsOreModel,
  toonMat,
} from './HudIconOreModelsA3D';

function hashOreSeed(oreId: string): number {
  let h = 2166136261;
  for (let i = 0; i < oreId.length; i++) {
    h ^= oreId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}


function buildVoidreachOreModel(oreId: string, _color: string, secondary: string): THREE.Group | null {
  const g = new THREE.Group();
  const voidRock = toonMat(secondary || 0x1e1b4b, 0.72, 0.18);

  if (oreId === 'voidshard') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), voidRock);
    base.scale.set(1.26, 0.72, 0.96);
    base.position.y = -0.24;
    g.add(base);
    const violetTip = toonMat(0xa855f7, 0.14, 0.28, 0xc084fc, 0.65);
    const magentaSpark = toonMat(0xec4899, 0.08, 0.2, 0xf472b6, 0.92);
    for (const [x, y, h, rz] of [
      [-0.36, 0.26, 0.74, 0.42],
      [0.02, 0.36, 0.88, -0.06],
      [0.36, 0.24, 0.72, -0.44],
    ] as Array<[number, number, number, number]>) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.19, h, 4), violetTip);
      horn.position.set(x, y, 0.02);
      horn.rotation.z = rz;
      g.add(horn);
    }
    for (const [x, y, z, s] of [
      [-0.22, -0.14, 0.56, 0.13],
      [0.14, -0.06, 0.58, 0.14],
      [0.38, -0.24, 0.44, 0.11],
    ] as Array<[number, number, number, number]>) {
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), magentaSpark);
      spark.position.set(x, y, z);
      g.add(spark);
    }
    g.rotation.set(0.18, -0.32, 0);
    return g;
  }

  if (oreId === 'gloomite') {
    const indigoStone = toonMat(0x1e1b4b, 0.55, 0.25, 0x312e81, 0.15);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.56, 0.88), indigoStone);
    crown.position.y = 0.22;
    g.add(crown);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.3, 0.78), toonMat(0x09090b, 0.7, 0.1));
    lower.position.y = -0.38;
    g.add(lower);
    const fangMat = toonMat(0x6366f1, 0.12, 0.3, 0x818cf8, 0.78);
    for (let i = 0; i < 4; i++) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 4), fangMat);
      fang.position.set(-0.36 + i * 0.24, -0.1, 0.36);
      fang.rotation.x = Math.PI;
      g.add(fang);
    }
    g.rotation.set(0.18, -0.3, 0);
    return g;
  }

  if (oreId === 'nullite') {
    const abyssCube = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 1.12, 0.94),
      toonMat(0x09090b, 0.65, 0.12, 0x3b0764, 0.15)
    );
    g.add(abyssCube);
    const frameMat = toonMat(0xa855f7, 0.08, 0.25, 0xc084fc, 0.95);
    const borderSize = 0.74;
    const thick = 0.11;
    for (const [x, y, w, h] of [
      [0, borderSize / 2, borderSize + thick, thick],
      [0, -borderSize / 2, borderSize + thick, thick],
      [-borderSize / 2, 0, thick, borderSize],
      [borderSize / 2, 0, thick, borderSize],
    ] as Array<[number, number, number, number]>) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat);
      bar.position.set(x, y, 0.47);
      g.add(bar);
    }
    g.rotation.set(0.18, -0.34, 0);
    return g;
  }

  if (oreId === 'riftglass') {
    const obsidian = toonMat(0x0f172a, 0.26, 0.42);
    const leftBlock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), obsidian);
    leftBlock.scale.set(0.75, 1.18, 0.85);
    leftBlock.position.set(-0.28, 0, 0);
    g.add(leftBlock);
    const rightBlock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), obsidian);
    rightBlock.scale.set(0.75, 1.15, 0.85);
    rightBlock.position.set(0.28, -0.02, 0);
    g.add(rightBlock);
    const riftMat = toonMat(0x22d3ee, 0.06, 0.15, 0x67e8f9, 0.98);
    const riftCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), riftMat);
    riftCore.scale.set(0.55, 1.55, 0.85);
    riftCore.position.set(0, 0.04, 0.24);
    riftCore.rotation.z = -0.22;
    g.add(riftCore);
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.18, 0.26), riftMat);
    bolt.position.set(0.02, 0.02, 0.34);
    bolt.rotation.z = 0.18;
    g.add(bolt);
    g.rotation.set(0.18, -0.3, 0);
    return g;
  }

  if (oreId === 'starcore') {
    const pedestal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), voidRock);
    pedestal.scale.set(1.32, 0.56, 1.02);
    pedestal.position.y = -0.34;
    g.add(pedestal);
    const starMat = toonMat(0xfde047, 0.08, 0.45, 0xfacc15, 0.92);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + Math.PI / 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 4), starMat);
      ray.position.set(Math.cos(ang) * 0.28, 0.18 + Math.sin(ang) * 0.28, 0.06);
      ray.rotation.z = ang - Math.PI / 2;
      g.add(ray);
    }
    const hub = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), starMat);
    hub.position.set(0, 0.18, 0.08);
    g.add(hub);
    g.rotation.set(0.2, -0.28, 0);
    return g;
  }

  if (oreId === 'cosmite') {
    const planet = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.52, 1),
      toonMat(0xf472b6, 0.12, 0.28, 0x38bdf8, 0.55)
    );
    g.add(planet);
    const ringCyan = new THREE.Mesh(
      new THREE.TorusGeometry(0.84, 0.08, 10, 28),
      toonMat(0x22d3ee, 0.08, 0.25, 0x67e8f9, 0.92)
    );
    ringCyan.rotation.set(1.1, 0.35, -0.2);
    g.add(ringCyan);
    const ringPink = new THREE.Mesh(
      new THREE.TorusGeometry(0.74, 0.065, 10, 26),
      toonMat(0xec4899, 0.08, 0.25, 0xfacc15, 0.85)
    );
    ringPink.rotation.set(-0.75, 0.45, 0.42);
    g.add(ringPink);
    for (const [x, y, rz] of [[-0.45, 0.48, 0.52], [0.46, -0.42, -2.5]] as Array<[number, number, number]>) {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.46, 4),
        toonMat(0x38bdf8, 0.08, 0.25, 0x67e8f9, 0.9)
      );
      shard.position.set(x, y, 0.12);
      shard.rotation.z = rz;
      g.add(shard);
    }
    g.rotation.set(0.2, -0.28, 0);
    return g;
  }

  if (oreId === 'singularite') {
    const blackHole = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 18, 14),
      toonMat(0x050507, 0.18, 0.15, 0x3b0764, 0.25)
    );
    g.add(blackHole);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 1.78, 10),
      toonMat(0x38bdf8, 0.06, 0.15, 0x818cf8, 0.98)
    );
    g.add(beam);
    const diskGold = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.085, 10, 28),
      toonMat(0xfacc15, 0.08, 0.2, 0xf97316, 0.94)
    );
    diskGold.rotation.set(1.36, 0.12, 0.16);
    g.add(diskGold);
    const diskPink = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.055, 8, 28),
      toonMat(0xec4899, 0.08, 0.2, 0x22d3ee, 0.88)
    );
    diskPink.rotation.set(1.34, 0.1, 0.14);
    g.add(diskPink);
    g.rotation.set(0.14, -0.22, -0.14);
    return g;
  }

  if (oreId === 'duskcrown') {
    const abyssBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.44, 0.56, 7),
      toonMat(0x09090b, 0.35, 0.25, 0x4c1d95, 0.3)
    );
    abyssBase.position.y = -0.18;
    g.add(abyssBase);
    const magentaAura = toonMat(0xec4899, 0.06, 0.22, 0xf472b6, 0.96);
    const goldJewel = toonMat(0xfacc15, 0.12, 0.55, 0xf59e0b, 0.88);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 4 - 0.5) * 1.45;
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.72 + (i === 2 ? 0.24 : 0), 5), magentaAura);
      plume.position.set(Math.sin(ang) * 0.42, 0.38, Math.cos(ang) * 0.08);
      plume.rotation.z = -ang * 0.42;
      g.add(plume);
      const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), goldJewel);
      jewel.position.set(Math.sin(ang) * 0.46, 0.04, 0.4);
      g.add(jewel);
    }
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.07, 10, 28), magentaAura);
    halo.rotation.set(1.12, 0.24, -0.2);
    g.add(halo);
    g.rotation.set(0.2, -0.3, 0);
    return g;
  }

  return null;
}

function buildStarwellOreModel(oreId: string, color: string, secondary: string): THREE.Group | null {
  const g = new THREE.Group();
  const skyStone = toonMat(secondary || '#334155', 0.65, 0.2);

  if (oreId === 'cloudgrit') {
    const cloudMat = toonMat(0x7dd3fc, 0.72, 0.08);
    for (const [x, y, z, r] of [
      [-0.22, -0.08, 0.06, 0.5],
      [0.24, -0.06, -0.04, 0.46],
      [0, 0.22, 0.02, 0.48],
    ] as Array<[number, number, number, number]>) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), cloudMat);
      rock.position.set(x, y, z);
      g.add(rock);
    }
    g.rotation.set(0.18, -0.25, 0);
    return g;
  }

  if (oreId === 'skyshale') {
    const shaleMat = toonMat(0x38bdf8, 0.35, 0.28, 0x0284c7, 0.22);
    for (let i = 0; i < 3; i++) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.15 - i * 0.18, 0.26, 0.88 - i * 0.12), shaleMat);
      slab.position.set((i - 1) * 0.06, -0.28 + i * 0.28, 0);
      slab.rotation.y = (i - 1) * 0.14;
      g.add(slab);
    }
    const twin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 4), shaleMat);
    twin.position.set(0.22, 0.48, 0);
    g.add(twin);
    g.rotation.set(0.22, -0.28, 0);
    return g;
  }

  if (oreId === 'sunvein') {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), toonMat(0x1e293b, 0.7, 0.2));
    rock.scale.set(1.18, 0.9, 1.0);
    g.add(rock);
    const goldMat = toonMat(0xfacc15, 0.14, 0.55, 0xf59e0b, 0.85);
    const bolt1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.92, 0.32), goldMat);
    bolt1.position.set(-0.08, 0.06, 0.36);
    bolt1.rotation.z = -0.35;
    g.add(bolt1);
    const bolt2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.28), goldMat);
    bolt2.position.set(0.16, -0.1, 0.38);
    bolt2.rotation.z = 0.45;
    g.add(bolt2);
    g.rotation.set(0.18, -0.25, 0);
    return g;
  }

  if (oreId === 'gleamstone') {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.88, 0.88),
      toonMat(0xa5f3fc, 0.18, 0.32, 0x38bdf8, 0.55)
    );
    cube.rotation.set(0.18, 0.35, 0.06);
    g.add(cube);
    const starMat = toonMat(0xffffff, 0.05, 0.1, 0xe0f2fe, 0.95);
    const vBar = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), starMat);
    vBar.scale.set(0.35, 1.3, 0.35);
    vBar.position.set(0, 0.06, 0.5);
    g.add(vBar);
    const hBar = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), starMat);
    hBar.scale.set(1.3, 0.35, 0.35);
    hBar.position.set(0, 0.06, 0.5);
    g.add(hBar);
    return g;
  }

  if (oreId === 'aurorine') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), skyStone);
    base.scale.set(1.25, 0.52, 1.0);
    base.position.y = -0.36;
    g.add(base);
    const hues = [0x22d3ee, 0xa855f7, 0x34d399, 0xe879f9];
    for (let i = 0; i < 4; i++) {
      const ang = (i / 3 - 0.5) * 1.15;
      const mat = toonMat(hues[i], 0.1, 0.25, hues[i], 0.75);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85 + (i % 2) * 0.25, 5), mat);
      spire.position.set(ang * 0.48, 0.16 + (i % 2) * 0.1, (i % 2) * 0.12);
      spire.rotation.z = -ang * 0.24;
      g.add(spire);
    }
    g.rotation.set(0.18, -0.26, 0);
    return g;
  }

  if (oreId === 'zenithite') {
    const obsidian = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), toonMat(0x09090b, 0.35, 0.2));
    obsidian.scale.set(1.26, 0.58, 1.02);
    obsidian.position.y = -0.34;
    g.add(obsidian);
    const elec = toonMat(0x0ea5e9, 0.08, 0.22, 0x38bdf8, 0.94);
    for (const [x, h, rz] of [[-0.26, 0.82, 0.22], [0.02, 1.12, -0.04], [0.28, 0.78, -0.26]] as Array<[number, number, number]>) {
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.2, h, 5), elec);
      crystal.position.set(x, h * 0.28 - 0.04, 0.06);
      crystal.rotation.z = rz;
      g.add(crystal);
    }
    g.rotation.set(0.2, -0.28, 0);
    return g;
  }

  if (oreId === 'caelite') {
    const prism = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.64, 0),
      toonMat(0x38bdf8, 0.08, 0.3, 0x67e8f9, 0.92)
    );
    prism.scale.set(0.86, 1.24, 0.86);
    g.add(prism);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.07, 10, 28),
      toonMat(0xf472b6, 0.08, 0.25, 0xfacc15, 0.9)
    );
    ring.rotation.set(1.08, 0.32, -0.2);
    g.add(ring);
    g.rotation.set(0.18, -0.28, 0);
    return g;
  }

  if (oreId === 'dawncrown') {
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.46, 0),
      toonMat(0xfbbf24, 0.08, 0.4, 0xf97316, 0.96)
    );
    g.add(core);
    const crownMat = toonMat(0xfde047, 0.08, 0.45, 0xf59e0b, 0.92);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 4 - 0.5) * 1.4;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.65 + (i === 2 ? 0.22 : 0), 5), crownMat);
      spike.position.set(Math.sin(ang) * 0.4, 0.34, 0.05);
      spike.rotation.z = -ang * 0.4;
      g.add(spike);
    }
    const dawnRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.07, 10, 28),
      toonMat(0xec4899, 0.08, 0.25, 0xf472b6, 0.94)
    );
    dawnRing.rotation.set(1.12, 0.26, -0.18);
    g.add(dawnRing);
    g.rotation.set(0.2, -0.28, 0);
    return g;
  }

  void color;
  return null;
}

export function buildOreModel(color: string, secondary: string, rarity: ItemRarity, oreId = ''): THREE.Group {
  if (oreId) {
    const customCrystal = buildCrystalCavesOreModel(oreId, color, secondary);
    if (customCrystal) return customCrystal;
    const customMagma = buildMagmaHollowsOreModel(oreId, color, secondary);
    if (customMagma) return customMagma;
    const customRuins = buildAncientRuinsOreModel(oreId, color, secondary);
    if (customRuins) return customRuins;
    const customVoid = buildVoidreachOreModel(oreId, color, secondary);
    if (customVoid) return customVoid;
    const customStarwell = buildStarwellOreModel(oreId, color, secondary);
    if (customStarwell) return customStarwell;
  }

  const seed = oreId ? hashOreSeed(oreId) : 0;
  const variant = seed % 3;
  const rotBias = ((seed % 11) - 5) * 0.045;

  const g = new THREE.Group();
  const baseMat = toonMat(secondary, 0.7, 0.15);
  const oreMat = new THREE.MeshStandardMaterial({
    color,
    roughness: rarity === 'common' ? 0.75 : 0.22,
    metalness: rarity === 'common' ? 0.1 : 0.35,
    emissive:
      rarity === 'secret' ||
      rarity === 'exotic' ||
      rarity === 'mythic' ||
      rarity === 'legendary' ||
      rarity === 'rainbow'
        ? color
        : '#000000',
    emissiveIntensity:
      rarity === 'secret'
        ? 0.48
        : rarity === 'exotic'
          ? 0.42
          : rarity === 'mythic'
            ? 0.35
            : rarity === 'legendary'
              ? 0.22
              : 0.12,
    flatShading: true,
  });

  if (rarity === 'common') {
    const rock = new THREE.Mesh(
      variant === 1 ? new THREE.IcosahedronGeometry(0.72, 0) : new THREE.DodecahedronGeometry(0.74, 0),
      oreMat
    );
    rock.scale.set(1.15 + variant * 0.06, 0.88 - variant * 0.05, 1.0);
    g.add(rock);
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), baseMat);
    chunk.position.set(variant === 2 ? -0.44 : 0.42, -0.22, 0.28);
    g.add(chunk);
  } else if (rarity === 'uncommon') {
    const slab = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), baseMat);
    slab.scale.set(1.2, 0.75, 1.0);
    slab.position.y = -0.18;
    g.add(slab);
    if (variant === 1) {
      for (const [x, rz] of [[-0.22, 0.34], [0.24, -0.34]]) {
        const nub = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), oreMat);
        nub.position.set(x, 0.22, 0.08);
        nub.rotation.z = rz;
        g.add(nub);
      }
    } else {
      const vein = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.24, 0.65), oreMat);
      vein.position.y = 0.2;
      vein.rotation.z = variant === 2 ? -0.26 : 0.22;
      g.add(vein);
    }
  } else if (rarity === 'rare') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), baseMat);
    base.scale.set(1.2, 0.65, 1.05);
    base.position.y = -0.32;
    g.add(base);
    const count = variant === 2 ? 4 : 3;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1) - 0.5;
      const h = 0.74 + (1 - Math.abs(t)) * 0.34;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.2, h, 5 + (variant % 2)), oreMat);
      spire.position.set(t * 0.66, 0.08, (i % 2 === 0 ? 0.08 : -0.06));
      spire.rotation.z = -t * 0.55;
      g.add(spire);
    }
  } else if (rarity === 'epic') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), baseMat);
    base.scale.set(1.25, 0.6, 1.05);
    base.position.y = -0.35;
    g.add(base);
    const specs: Array<[number, number, number, number]> =
      variant === 1
        ? [[-0.4, 0.85, 0.38, 0.18], [-0.1, 1.18, 0.12, 0.24], [0.22, 1.05, -0.18, 0.22], [0.44, 0.72, -0.4, 0.16]]
        : [[-0.36, 0.75, 0.35, 0.18], [0, 1.15, 0, 0.26], [0.36, 0.82, -0.32, 0.18], [-0.14, 0.68, 0.12, 0.15]];
    for (const [x, h, rz, r] of specs) {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), oreMat);
      spire.position.set(x, 0.1, 0);
      spire.rotation.z = rz;
      g.add(spire);
    }
  } else if (rarity === 'legendary') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.66, 0), baseMat);
    base.scale.set(1.25, 0.56, 1.1);
    base.position.y = -0.38;
    g.add(base);
    const nSpires = 5 + (variant === 2 ? 1 : 0);
    for (let i = 0; i < nSpires; i++) {
      const ang = (i / nSpires) * Math.PI * 2 + rotBias;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9 + (i % 2) * 0.32, 6), oreMat);
      spire.position.set(Math.cos(ang) * 0.26, 0.1, Math.sin(ang) * 0.24);
      spire.rotation.z = -Math.cos(ang) * 0.28;
      spire.rotation.x = Math.sin(ang) * 0.28;
      g.add(spire);
    }
  } else if (rarity === 'rainbow') {
    const rbColors = [0xf43f5e, 0xfacc15, 0x22c55e, 0x38bdf8, 0xa855f7];
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), toonMat(0xffffff, 0.12, 0.4, 0xf472b6, 0.25));
    g.add(core);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + rotBias * 2;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.72, 5), toonMat(rbColors[i], 0.15, 0.3, rbColors[i], 0.35));
      shard.position.set(Math.cos(ang) * 0.46, Math.sin(ang) * 0.35, 0);
      shard.rotation.z = ang - Math.PI / 2;
      g.add(shard);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.06, 10, 24), toonMat(0xfde047, 0.2, 0.7));
    ring.rotation.set(0.9 + rotBias, 0.4, 0);
    g.add(ring);
  } else {
    // Mythic celestial floating geode with orbiting crystals
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), oreMat);
    core.scale.set(0.92, 1.24, 0.92);
    g.add(core);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.065, 10, 28), toonMat(0xfde047, 0.18, 0.85, 0xf59e0b, 0.3));
    halo.rotation.set(1.15, 0.3 + rotBias, 0.2);
    g.add(halo);
    for (const [x, y, c] of [[-0.78, 0.32, 0xf472b6], [0.78, -0.26, 0x38bdf8]]) {
      const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), toonMat(c, 0.15, 0.3, c, 0.4));
      sat.position.set(x, y, 0.1);
      g.add(sat);
    }
  }

  g.rotation.set(0.24, -0.4 + rotBias, 0);
  return g;
}

