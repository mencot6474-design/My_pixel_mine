import * as THREE from 'three';
import { ENCHANTS, GEM_SHOP_ITEMS, GemPotionShape, ItemRarity, ORES, PICKAXES } from '../game/GameData';
import { WEATHERS, WeatherId } from '../game/WeatherData';
import { createEnchantAura3D, createEnchantDice3D } from './AuraModels3D';

export type Hud3dIconKey =
  | 'shops'
  | 'shopBasket'
  | 'hourglass'
  | 'indexBook'
  | 'gem'
  | 'backpack'
  | 'daily'
  | 'chest'
  | 'quest'
  | 'trade'
  | 'sparkle'
  | 'pickaxe'
  | 'stats'
  | 'mutation'
  | 'enchant'
  | 'lock'
  | 'other_gems'
  | 'other_scroll'
  | 'other_potion'
  | 'other_charm';

const iconCache = new Map<string, string>();
let initialized = false;

function toonMat(
  color: THREE.ColorRepresentation,
  roughness = 0.32,
  metalness = 0.15,
  emissive: THREE.ColorRepresentation = 0x000000,
  emissiveIntensity = 0
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
  });
}

function buildShopsModel(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.9), toonMat(0x92400e, 0.55));
  base.position.y = -0.35;
  g.add(base);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.14, 1.02), toonMat(0xfef08a, 0.35));
  counter.position.y = 0.04;
  g.add(counter);

  const pillarMat = toonMat(0x78350f, 0.5);
  for (const x of [-0.62, 0.62]) {
    for (const z of [-0.36, 0.36]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 10), pillarMat);
      p.position.set(x, 0.38, z);
      g.add(p);
    }
  }

  for (let i = 0; i < 5; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.16, 1.15),
      toonMat(i % 2 === 0 ? 0xef4444 : 0xf8fafc, 0.3)
    );
    stripe.position.set(-0.64 + i * 0.32, 0.76, 0.04);
    stripe.rotation.x = 0.18;
    g.add(stripe);
  }

  g.rotation.set(0.22, -0.45, 0);
  return g;
}

function buildShopBasketModel(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.55, 0.72, 16), toonMat(0xef4444, 0.32, 0.1));
  body.position.y = -0.18;
  g.add(body);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.09, 10, 24), toonMat(0xfca5a5, 0.28));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.18;
  g.add(rim);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 10, 20, Math.PI), toonMat(0xe2e8f0, 0.25, 0.65));
  handle.position.y = 0.18;
  g.add(handle);

  g.rotation.set(0.28, -0.35, 0);
  return g;
}

function buildHourglassModel(): THREE.Group {
  const g = new THREE.Group();
  const gold = toonMat(0xfacc15, 0.25, 0.7);
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.16, 18), gold);
  topCap.position.y = 0.78;
  g.add(topCap);

  const botCap = topCap.clone();
  botCap.position.y = -0.78;
  g.add(botCap);

  for (const ang of [0.6, 2.5, 3.7, 5.6]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.48, 8), gold);
    rod.position.set(Math.cos(ang) * 0.52, 0, Math.sin(ang) * 0.52);
    g.add(rod);
  }

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
  });
  const topCone = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.74, 16), glassMat);
  topCone.rotation.x = Math.PI;
  topCone.position.y = 0.36;
  g.add(topCone);

  const botCone = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.74, 16), glassMat);
  botCone.position.y = -0.36;
  g.add(botCone);

  const sand = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.48, 16), toonMat(0x38bdf8, 0.35, 0.1, 0x0ea5e9, 0.35));
  sand.position.y = -0.45;
  g.add(sand);

  g.rotation.set(0.18, -0.4, -0.14);
  return g;
}

function buildIndexBookModel(): THREE.Group {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.45, 0.36), toonMat(0x2563eb, 0.35, 0.15));
  g.add(cover);

  const pages = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.32, 0.26), toonMat(0xfef3c7, 0.65));
  pages.position.x = 0.08;
  g.add(pages);

  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.48, 0.4), toonMat(0x1d4ed8, 0.35, 0.2));
  spine.position.x = -0.5;
  g.add(spine);

  const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), toonMat(0xfacc15, 0.22, 0.75, 0xf59e0b, 0.25));
  badge.position.set(0.06, 0.05, 0.21);
  badge.scale.z = 0.45;
  g.add(badge);

  g.rotation.set(0.25, -0.52, 0.1);
  return g;
}

function buildGemModel(color: THREE.ColorRepresentation = 0xec4899): THREE.Group {
  const g = new THREE.Group();
  const gemMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.12,
    metalness: 0.25,
    emissive: color,
    emissiveIntensity: 0.22,
    flatShading: true,
  });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.78, 0.42, 6), gemMat);
  top.position.y = 0.32;
  g.add(top);

  const bottom = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.92, 6), gemMat);
  bottom.rotation.x = Math.PI;
  bottom.position.y = -0.35;
  g.add(bottom);

  g.rotation.set(0.32, 0.4, -0.15);
  return g;
}

function buildBackpackModel(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.22, 0.62), toonMat(0xb45309, 0.5));
  g.add(body);

  const flap = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.46, 0.68), toonMat(0xd97706, 0.42));
  flap.position.y = 0.36;
  g.add(flap);

  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.48, 0.22), toonMat(0x92400e, 0.5));
  pocket.position.set(0, -0.24, 0.36);
  g.add(pocket);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.12), toonMat(0xfacc15, 0.25, 0.8));
  buckle.position.set(0, 0.12, 0.36);
  g.add(buckle);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 16, Math.PI), toonMat(0x78350f, 0.5));
  handle.position.y = 0.6;
  g.add(handle);

  g.rotation.set(0.22, -0.45, 0);
  return g;
}

function buildDailyModel(): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.92, 1.08), toonMat(0x3b82f6, 0.35, 0.1));
  box.position.y = -0.1;
  g.add(box);

  const ribbonMat = toonMat(0xfacc15, 0.25, 0.55);
  const rib1 = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.98, 0.22), ribbonMat);
  rib1.position.y = -0.1;
  g.add(rib1);
  const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.98, 1.14), ribbonMat);
  rib2.position.y = -0.1;
  g.add(rib2);

  const bow = new THREE.Mesh(new THREE.TorusKnotGeometry(0.24, 0.08, 32, 8), ribbonMat);
  bow.position.y = 0.52;
  g.add(bow);

  g.rotation.set(0.32, -0.55, 0);
  return g;
}

function buildChestModel(): THREE.Group {
  const g = new THREE.Group();
  const wood = toonMat(0x7c2d12, 0.55);
  const gold = toonMat(0xfacc15, 0.25, 0.78);

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.66, 0.86), wood);
  base.position.y = -0.22;
  g.add(base);

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 1.25, 14, 1, false, 0, Math.PI), wood);
  lid.rotation.z = Math.PI / 2;
  lid.rotation.y = Math.PI / 2;
  lid.position.y = 0.12;
  g.add(lid);

  for (const x of [-0.46, 0.46]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 0.92), gold);
    band.position.set(x, -0.18, 0);
    g.add(band);
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.16), gold);
  lock.position.set(0, 0.05, 0.46);
  g.add(lock);

  g.rotation.set(0.28, -0.5, 0);
  return g;
}

function buildScrollModel(paperColor = 0xfde68a, rodColor = 0xd97706): THREE.Group {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.15, 16), toonMat(paperColor, 0.55));
  g.add(paper);

  const rodMat = toonMat(rodColor, 0.35, 0.4);
  for (const y of [-0.62, 0.62]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 12), rodMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.y = y;
    g.add(rod);
  }
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 14), toonMat(0xef4444, 0.3));
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, 0, 0.38);
  g.add(seal);

  g.rotation.set(0.25, -0.3, -0.35);
  return g;
}

function buildTradeModel(): THREE.Group {
  const g = new THREE.Group();
  const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 20), toonMat(0xfacc15, 0.22, 0.78));
  c1.rotation.x = Math.PI / 2;
  c1.position.set(-0.24, 0.22, 0.14);
  g.add(c1);

  const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 20), toonMat(0x38bdf8, 0.22, 0.55));
  c2.rotation.x = Math.PI / 2;
  c2.position.set(0.26, -0.22, -0.14);
  g.add(c2);

  g.rotation.set(0.2, -0.35, 0);
  return g;
}

function buildSparkleModel(): THREE.Group {
  const g = new THREE.Group();
  const mat = toonMat(0xfde047, 0.2, 0.65, 0xf59e0b, 0.35);
  const v = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), mat);
  v.scale.set(0.45, 1.35, 0.45);
  g.add(v);
  const h = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), mat);
  h.scale.set(1.35, 0.45, 0.45);
  g.add(h);
  g.rotation.set(0.2, -0.25, 0);
  return g;
}

function buildPickaxeModel(headColor: THREE.ColorRepresentation = 0x38bdf8): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.55, 10), toonMat(0x92400e, 0.6));
  handle.position.y = -0.1;
  g.add(handle);

  const headMat = toonMat(headColor, 0.22, 0.72);
  const center = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.28), headMat);
  center.position.y = 0.55;
  g.add(center);

  const leftBlade = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.72, 6), headMat);
  leftBlade.rotation.z = Math.PI / 2 + 0.28;
  leftBlade.position.set(-0.44, 0.46, 0);
  g.add(leftBlade);

  const rightBlade = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.72, 6), headMat);
  rightBlade.rotation.z = -Math.PI / 2 - 0.28;
  rightBlade.position.set(0.44, 0.46, 0);
  g.add(rightBlade);

  g.rotation.set(0.2, -0.35, -0.42);
  return g;
}

function buildStatsModel(): THREE.Group {
  const g = new THREE.Group();
  const colors = [0xef4444, 0xfacc15, 0x22c55e];
  const heights = [0.55, 0.9, 1.3];
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, heights[i], 0.34), toonMat(colors[i], 0.25, 0.2));
    bar.position.set((i - 1) * 0.44, -0.65 + heights[i] / 2, 0);
    g.add(bar);
  }
  g.rotation.set(0.25, -0.45, 0);
  return g;
}

function buildMutationModel(): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.54, 1), toonMat(0xa855f7, 0.2, 0.35, 0x9333ea, 0.4));
  g.add(core);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.08, 10, 24), toonMat(0x22d3ee, 0.2, 0.6));
  ring1.rotation.set(0.8, 0.4, 0);
  g.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.08, 10, 24), toonMat(0xf472b6, 0.2, 0.6));
  ring2.rotation.set(-0.7, 0.6, 0.4);
  g.add(ring2);
  return g;
}

function buildLockModel(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.78, 0.44), toonMat(0x64748b, 0.42, 0.55));
  body.position.y = -0.25;
  g.add(body);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 10, 20, Math.PI), toonMat(0xcbd5e1, 0.25, 0.75));
  shackle.position.y = 0.14;
  g.add(shackle);
  g.rotation.set(0.22, -0.35, 0);
  return g;
}

function buildPotionModel(liquidColor = 0x38bdf8): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 18, 16),
    toonMat(liquidColor, 0.15, 0.1, liquidColor, 0.35)
  );
  body.position.y = -0.22;
  g.add(body);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.48, 14), toonMat(0xe2e8f0, 0.15, 0.2));
  neck.position.y = 0.48;
  g.add(neck);

  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.24, 12), toonMat(0xb45309, 0.65));
  cork.position.y = 0.78;
  g.add(cork);

  g.rotation.set(0.2, -0.35, -0.12);
  return g;
}

function buildGemPotionModel(shape: GemPotionShape, colorHex: string): THREE.Group {
  const g = new THREE.Group();
  const liqMat = toonMat(colorHex, 0.14, 0.12, colorHex, 0.35);
  const rimMat = toonMat(0xe2e8f0, 0.18, 0.25);
  const goldMat = toonMat(0xfacc15, 0.22, 0.75);
  const corkMat = toonMat(0xb45309, 0.65);

  if (shape === 'jar') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.86, 16), liqMat);
    body.position.y = -0.18;
    g.add(body);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), goldMat);
    crown.position.y = 0.34;
    g.add(crown);
  } else if (shape === 'vial') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.05, 16), liqMat);
    body.position.y = -0.12;
    g.add(body);
    const leaf = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), toonMat(0x86efac, 0.2, 0.1));
    leaf.position.set(0.36, 0.2, 0.22);
    g.add(leaf);
  } else if (shape === 'prism') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.04, 0.62), liqMat);
    body.position.y = -0.12;
    g.add(body);
    const fossil = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 18), toonMat(0xfef3c7, 0.3));
    fossil.position.set(0, -0.12, 0.33);
    g.add(fossil);
  } else if (shape === 'crystal') {
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), liqMat);
    body.scale.set(0.86, 1.15, 0.86);
    body.position.y = -0.15;
    g.add(body);
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 6), rimMat);
    shard.position.set(0.35, 0.42, 0.12);
    shard.rotation.z = -0.45;
    g.add(shard);
  } else if (shape === 'clover') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 16), liqMat);
    body.position.y = -0.2;
    g.add(body);
    const charm = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 8, 18), goldMat);
    charm.position.set(0.45, 0.22, 0.22);
    g.add(charm);
  } else if (shape === 'star') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.64, 18, 16), liqMat);
    body.scale.set(1.04, 0.9, 1.04);
    body.position.y = -0.2;
    g.add(body);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldMat);
    star.position.set(0, -0.18, 0.54);
    g.add(star);
  } else {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 16), liqMat);
    body.position.y = -0.22;
    g.add(body);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.4, 14), rimMat);
  neck.position.y = 0.48;
  g.add(neck);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 8, 16), goldMat);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.34;
  g.add(band);

  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.26, 12), corkMat);
  cork.position.y = 0.78;
  g.add(cork);

  g.rotation.set(0.18, -0.35, -0.1);
  return g;
}

function buildCharmModel(): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 12, 24), toonMat(0x22d3ee, 0.2, 0.7));
  ring.position.y = -0.15;
  g.add(ring);

  const gem = buildGemModel(0x67e8f9);
  gem.scale.setScalar(0.55);
  gem.position.y = 0.52;
  g.add(gem);

  g.rotation.set(0.25, -0.4, 0);
  return g;
}

function hashOreSeed(oreId: string): number {
  let h = 2166136261;
  for (let i = 0; i < oreId.length; i++) {
    h ^= oreId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildCrystalCavesOreModel(oreId: string, color: string, secondary: string): THREE.Group | null {
  const g = new THREE.Group();
  const darkRock = toonMat(secondary, 0.72, 0.14);

  if (oreId === 'glowquartz') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), darkRock);
    base.scale.set(1.28, 0.56, 1.05);
    base.position.y = -0.38;
    g.add(base);
    const iceMat = toonMat(color, 0.14, 0.25, color, 0.45);
    const tipMat = toonMat(0xf8fafc, 0.1, 0.35, 0xbae6fd, 0.72);
    for (const [x, z, h, r, rz, rx, useTip] of [
      [-0.36, 0.06, 0.76, 0.17, 0.28, 0.08, false],
      [0.34, 0.08, 0.7, 0.16, -0.32, 0.06, false],
      [-0.14, -0.18, 0.9, 0.19, 0.12, -0.14, false],
      [0.06, 0.08, 1.18, 0.23, -0.05, 0.08, true],
      [0.2, -0.22, 0.62, 0.14, -0.22, -0.18, false],
    ] as Array<[number, number, number, number, number, number, boolean]>) {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), useTip ? tipMat : iceMat);
      spire.position.set(x, -0.04 + h * 0.28, z);
      spire.rotation.set(rx, 0, rz);
      g.add(spire);
    }
    const glowOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), tipMat);
    glowOrb.position.set(0.06, 0.72, 0.1);
    g.add(glowOrb);
    g.rotation.set(0.22, -0.38, 0);
    return g;
  }

  if (oreId === 'frostquartz') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.66, 0), darkRock);
    base.scale.set(1.25, 0.58, 1.05);
    base.position.y = -0.36;
    g.add(base);
    const frostMat = toonMat(0x22d3ee, 0.12, 0.25, 0x67e8f9, 0.6);
    const branchSpecs: Array<[number, number, number, number, number, number]> = [
      [0, -0.02, 0.02, 1.15, 0.13, 0],
      [-0.24, 0.24, 0.06, 0.74, 0.1, 0.62],
      [0.24, 0.26, 0.06, 0.74, 0.1, -0.62],
      [-0.36, 0.44, 0.08, 0.48, 0.08, 0.98],
      [0.36, 0.46, 0.08, 0.48, 0.08, -0.98],
      [0, 0.36, -0.12, 0.58, 0.09, 0.22],
    ];
    for (const [x, y, z, h, r, rz] of branchSpecs) {
      const shard = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r, h, 6), frostMat);
      shard.position.set(x, y, z);
      shard.rotation.z = rz;
      g.add(shard);
    }
    g.rotation.set(0.2, -0.35, 0);
    return g;
  }

  if (oreId === 'prismite') {
    const slab = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), darkRock);
    slab.scale.set(1.42, 0.46, 0.92);
    slab.position.y = -0.4;
    g.add(slab);
    const rainbow = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x06b6d4, 0x3b82f6, 0xa855f7];
    for (let i = 0; i < rainbow.length; i++) {
      const t = i / (rainbow.length - 1) - 0.5;
      const h = 0.78 + (1 - Math.abs(t) * 1.6) * 0.42;
      const mat = toonMat(rainbow[i], 0.14, 0.25, rainbow[i], 0.48);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, h, 5), mat);
      spike.position.set(t * 1.18, -0.02 + h * 0.28, (i % 2 === 0 ? 0.04 : -0.05));
      spike.rotation.z = -t * 0.46;
      g.add(spike);
    }
    g.rotation.set(0.24, -0.32, 0);
    return g;
  }

  if (oreId === 'hushstone') {
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78, 0), darkRock);
    body.scale.set(1.18, 0.94, 0.96);
    body.position.y = -0.08;
    g.add(body);
    const visorMat = toonMat(0x22d3ee, 0.1, 0.2, 0x38bdf8, 0.92);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.26), visorMat);
    visor.position.set(0.06, 0.08, 0.64);
    visor.rotation.z = -0.06;
    g.add(visor);
    for (const [x, y, z, s] of [
      [-0.58, -0.24, 0.34, 0.14],
      [0.54, 0.34, 0.22, 0.12],
      [-0.22, 0.56, 0.18, 0.11],
    ] as Array<[number, number, number, number]>) {
      const fleck = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), visorMat);
      fleck.position.set(x, y, z);
      g.add(fleck);
    }
    g.rotation.set(0.2, -0.38, 0);
    return g;
  }

  if (oreId === 'azurine') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), darkRock);
    base.scale.set(1.3, 0.52, 1.05);
    base.position.y = -0.4;
    g.add(base);
    const deepAzure = toonMat(0x2563eb, 0.14, 0.3, 0x1d4ed8, 0.42);
    const brightAzure = toonMat(0x38bdf8, 0.12, 0.28, 0x60a5fa, 0.55);
    const prisms: Array<[number, number, number, number, number, boolean]> = [
      [-0.38, 0.8, 0.19, 0.42, 0.12, false],
      [-0.14, 1.18, 0.24, 0.14, -0.08, true],
      [0.16, 1.08, 0.22, -0.18, 0.1, false],
      [0.42, 0.72, 0.17, -0.45, -0.06, true],
      [0.02, 0.72, 0.16, 0.04, 0.28, true],
    ];
    for (const [x, h, r, rz, z, bright] of prisms) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), bright ? brightAzure : deepAzure);
      p.position.set(x, -0.06 + h * 0.32, z);
      p.rotation.z = rz;
      g.add(p);
    }
    g.rotation.set(0.22, -0.38, 0);
    return g;
  }

  if (oreId === 'glimmerite') {
    const quartzBase = toonMat(0xe2e8f0, 0.48, 0.15, 0xf8fafc, 0.08);
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), quartzBase);
    base.scale.set(1.32, 0.56, 1.08);
    base.position.y = -0.36;
    g.add(base);
    const goldMat = toonMat(0xfacc15, 0.14, 0.55, 0xf59e0b, 0.52);
    const center = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), goldMat);
    center.scale.set(0.85, 1.48, 0.85);
    center.position.set(0, 0.26, 0.04);
    g.add(center);
    for (const [x, z, h, rz] of [
      [-0.42, 0.12, 0.64, 0.48],
      [0.42, 0.08, 0.68, -0.44],
      [-0.18, -0.22, 0.56, 0.2],
      [0.2, -0.22, 0.54, -0.22],
    ] as Array<[number, number, number, number]>) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.16, h, 5), goldMat);
      shard.position.set(x, 0.06, z);
      shard.rotation.z = rz;
      g.add(shard);
    }
    g.rotation.set(0.22, -0.36, 0);
    return g;
  }

  if (oreId === 'spectrine') {
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.56, 0), toonMat(0x0f172a, 0.35, 0.4, 0x312e81, 0.25));
    g.add(core);
    const neonColors = [0xec4899, 0x22d3ee, 0xfacc15, 0xa855f7, 0x38bdf8, 0xf43f5e];
    for (let i = 0; i < neonColors.length; i++) {
      const ang = (i / neonColors.length) * Math.PI * 2;
      const mat = toonMat(neonColors[i], 0.12, 0.3, neonColors[i], 0.72);
      const seg = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.085, 8, 12, Math.PI / 3.1), mat);
      seg.rotation.z = ang;
      g.add(seg);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 4), mat);
      spike.position.set(Math.cos(ang) * 0.86, Math.sin(ang) * 0.86, 0);
      spike.rotation.z = ang - Math.PI / 2;
      g.add(spike);
    }
    g.rotation.set(0.32, -0.28, 0.18);
    return g;
  }

  if (oreId === 'celestium') {
    const darkCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), toonMat(0x09090b, 0.45, 0.25, 0xec4899, 0.25));
    darkCore.scale.set(0.95, 1.24, 0.95);
    g.add(darkCore);
    const auraPink = toonMat(0xec4899, 0.12, 0.35, 0xf472b6, 0.82);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.075, 10, 28), auraPink);
    halo.rotation.set(1.12, 0.26, 0.22);
    g.add(halo);
    const halo2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 8, 24), toonMat(0xa855f7, 0.14, 0.35, 0xc084fc, 0.68));
    halo2.rotation.set(-0.85, 0.5, -0.35);
    g.add(halo2);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + 0.4;
      const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), auraPink);
      sat.position.set(Math.cos(ang) * 0.82, Math.sin(ang) * 0.46, Math.sin(ang * 2) * 0.2);
      g.add(sat);
    }
    g.rotation.set(0.22, -0.36, 0);
    return g;
  }

  return null;
}

function buildMagmaHollowsOreModel(oreId: string, _color: string, secondary: string): THREE.Group | null {
  const g = new THREE.Group();
  const basalt = toonMat(secondary || 0x1c1917, 0.78, 0.14);

  if (oreId === 'emberstone') {
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 0), basalt);
    boulder.scale.set(1.16, 0.96, 0.98);
    g.add(boulder);
    const fissureMat = toonMat(0xf97316, 0.15, 0.1, 0xfb923c, 0.85);
    const tipMat = toonMat(0xfef08a, 0.1, 0.1, 0xfacc15, 0.95);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.24), fissureMat);
    stem.position.set(0.02, -0.22, 0.62);
    g.add(stem);
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.24), fissureMat);
    leftArm.position.set(-0.18, 0.14, 0.63);
    leftArm.rotation.z = -0.62;
    g.add(leftArm);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.24), tipMat);
    rightArm.position.set(0.18, 0.12, 0.64);
    rightArm.rotation.z = 0.56;
    g.add(rightArm);
    g.rotation.set(0.18, -0.26, 0);
    return g;
  }

  if (oreId === 'ashglass') {
    const obsidian = toonMat(0x18181b, 0.24, 0.45, 0x0f172a, 0.15);
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), obsidian);
    base.scale.set(1.22, 0.82, 0.95);
    base.position.y = -0.18;
    g.add(base);
    for (const [x, y, h, rz] of [
      [-0.3, 0.22, 0.82, 0.36],
      [0.06, 0.34, 0.98, -0.08],
      [0.36, 0.18, 0.74, -0.44],
    ] as Array<[number, number, number, number]>) {
      const glassShard = new THREE.Mesh(new THREE.ConeGeometry(0.24, h, 4), obsidian);
      glassShard.position.set(x, y, 0.04);
      glassShard.rotation.z = rz;
      g.add(glassShard);
    }
    const tealFleck = toonMat(0x2dd4bf, 0.12, 0.2, 0x14b8a6, 0.8);
    const emberFleck = toonMat(0xf97316, 0.12, 0.2, 0xef4444, 0.85);
    for (const [x, y, z, s, isTeal] of [
      [-0.44, -0.14, 0.42, 0.13, true],
      [-0.24, 0.28, 0.3, 0.11, true],
      [0.24, 0.16, 0.4, 0.12, false],
      [0.42, -0.18, 0.36, 0.14, false],
      [0.04, -0.06, 0.56, 0.12, true],
    ] as Array<[number, number, number, number, boolean]>) {
      const bit = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), isTeal ? tealFleck : emberFleck);
      bit.position.set(x, y, z);
      g.add(bit);
    }
    g.rotation.set(0.2, -0.34, 0);
    return g;
  }

  if (oreId === 'magmite') {
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.9, 0.96), basalt);
    block.position.y = -0.14;
    block.rotation.set(0.08, -0.18, -0.06);
    g.add(block);
    const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.54, 0), basalt);
    cap.scale.set(1.25, 0.52, 1.0);
    cap.position.set(0, 0.26, 0);
    g.add(cap);
    const magmaMat = toonMat(0xef4444, 0.12, 0.2, 0xf97316, 0.88);
    for (const [x, y, z, r] of [
      [-0.36, 0.36, 0.28, 0.14],
      [-0.08, 0.42, 0.24, 0.16],
      [0.2, 0.4, 0.2, 0.15],
      [0.42, 0.28, 0.3, 0.13],
      [-0.18, 0.04, 0.52, 0.13],
      [0.26, -0.08, 0.5, 0.12],
    ] as Array<[number, number, number, number]>) {
      const orb = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), magmaMat);
      orb.position.set(x, y, z);
      g.add(orb);
    }
    g.rotation.set(0.22, -0.34, 0);
    return g;
  }

  if (oreId === 'cindershard') {
    const slab = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), basalt);
    slab.scale.set(1.38, 0.48, 0.98);
    slab.position.y = -0.38;
    g.add(slab);
    const hornBase = toonMat(0x991b1b, 0.35, 0.2, 0xef4444, 0.5);
    const hornTip = toonMat(0xfb923c, 0.12, 0.2, 0xf97316, 0.92);
    for (const [x, z, h, rz, rx, bright] of [
      [-0.44, 0.06, 0.78, 0.42, 0.08, false],
      [-0.2, -0.04, 1.08, 0.22, -0.06, true],
      [0.06, 0.08, 1.18, -0.04, 0.1, true],
      [0.32, -0.02, 0.96, -0.26, -0.08, false],
      [0.48, 0.1, 0.68, -0.48, 0.05, true],
    ] as Array<[number, number, number, number, number, boolean]>) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, h, 5), bright ? hornTip : hornBase);
      horn.position.set(x, -0.06 + h * 0.34, z);
      horn.rotation.set(rx, 0, rz);
      g.add(horn);
    }
    g.rotation.set(0.2, -0.32, 0);
    return g;
  }

  if (oreId === 'scorchgold') {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.74, 0.96), basalt);
    slab.position.set(0, -0.14, 0);
    slab.rotation.set(0.18, -0.22, 0.16);
    g.add(slab);
    const goldFire = toonMat(0xfacc15, 0.12, 0.45, 0xf59e0b, 0.85);
    const lavaGlow = toonMat(0xf97316, 0.1, 0.2, 0xea580c, 0.92);
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.52), i % 2 === 0 ? goldFire : lavaGlow);
      bar.position.set(-0.34 + i * 0.23, 0.34 - i * 0.03, 0.18);
      bar.rotation.set(0.28, -0.12, 0.16);
      g.add(bar);
    }
    const moltenPool = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), goldFire);
    moltenPool.scale.set(1.25, 0.72, 0.8);
    moltenPool.position.set(-0.08, -0.18, 0.52);
    g.add(moltenPool);
    g.rotation.set(0.18, -0.26, 0);
    return g;
  }

  if (oreId === 'pyroclast') {
    const sunCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.58, 1),
      toonMat(0xfef08a, 0.08, 0.2, 0xf59e0b, 0.98)
    );
    sunCore.position.set(0, 0.02, 0.12);
    g.add(sunCore);
    const ringGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.14, 8, 18),
      toonMat(0xf97316, 0.12, 0.15, 0xea580c, 0.88)
    );
    ringGlow.position.z = -0.02;
    g.add(ringGlow);
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + 0.35;
      const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + (i % 2) * 0.08, 0), basalt);
      chunk.position.set(Math.cos(ang) * 0.68, Math.sin(ang) * 0.62, -0.14 + (i % 2) * 0.14);
      chunk.rotation.set(ang, ang * 0.7, 0);
      g.add(chunk);
    }
    g.rotation.set(0.16, -0.28, 0);
    return g;
  }

  if (oreId === 'moltenite') {
    const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 0), basalt);
    crag.scale.set(1.22, 0.95, 0.95);
    crag.position.set(0.06, -0.08, -0.06);
    g.add(crag);
    const brightLava = toonMat(0xfacc15, 0.1, 0.15, 0xf97316, 0.92);
    const deepLava = toonMat(0xef4444, 0.12, 0.15, 0xf97316, 0.85);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.96, 8), brightLava);
    stream.position.set(-0.08, -0.02, 0.5);
    stream.rotation.z = 0.24;
    g.add(stream);
    const pool = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), deepLava);
    pool.scale.set(1.35, 0.42, 0.85);
    pool.position.set(-0.22, -0.46, 0.56);
    g.add(pool);
    for (const [x, y, z, r] of [
      [-0.14, 0.56, 0.24, 0.16],
      [0.14, 0.62, 0.16, 0.18],
      [0.36, 0.46, 0.2, 0.14],
    ] as Array<[number, number, number, number]>) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), brightLava);
      bubble.position.set(x, y, z);
      g.add(bubble);
    }
    g.rotation.set(0.2, -0.32, 0);
    return g;
  }

  if (oreId === 'pyrecore') {
    const darkCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), toonMat(0x09090b, 0.4, 0.25, 0x991b1b, 0.35));
    g.add(darkCore);
    const flameMat = toonMat(0xef4444, 0.12, 0.25, 0xf97316, 0.86);
    const pinkAura = toonMat(0xec4899, 0.1, 0.3, 0xf472b6, 0.9);
    for (const [x, y, h, rz] of [
      [-0.36, 0.42, 0.72, 0.36],
      [-0.08, 0.6, 0.92, 0.08],
      [0.24, 0.54, 0.82, -0.22],
      [0.44, 0.28, 0.62, -0.52],
    ] as Array<[number, number, number, number]>) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, h, 5), flameMat);
      spike.position.set(x, y * 0.7, 0.06);
      spike.rotation.z = rz;
      g.add(spike);
    }
    const vortex = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.08, 10, 28), pinkAura);
    vortex.rotation.set(1.06, 0.22, -0.28);
    g.add(vortex);
    const vortex2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 24), toonMat(0xf472b6, 0.12, 0.3, 0xe879f9, 0.78));
    vortex2.rotation.set(-0.78, 0.42, 0.35);
    g.add(vortex2);
    for (const [x, y, z] of [
      [-0.64, -0.3, 0.35],
      [0.62, 0.24, 0.3],
      [0.12, -0.54, 0.46],
    ] as Array<[number, number, number]>) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), pinkAura);
      shard.position.set(x, y, z);
      g.add(shard);
    }
    g.rotation.set(0.22, -0.32, 0);
    return g;
  }

  return null;
}

function buildAncientRuinsOreModel(oreId: string, _color: string, secondary: string): THREE.Group | null {
  const g = new THREE.Group();
  const ruinStone = toonMat(secondary || 0x334155, 0.72, 0.14);

  if (oreId === 'runestone') {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.32, 0.56), ruinStone);
    pillar.position.y = -0.02;
    g.add(pillar);
    const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), ruinStone);
    cap.scale.set(1.05, 0.44, 0.65);
    cap.position.y = 0.62;
    g.add(cap);
    const runeMat = toonMat(0x2dd4bf, 0.1, 0.2, 0x5eead4, 0.92);
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.78, 0.12), runeMat);
    vBar.position.set(0, -0.02, 0.28);
    g.add(vBar);
    const diag1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.12), runeMat);
    diag1.position.set(0.14, 0.2, 0.28);
    diag1.rotation.z = -0.55;
    g.add(diag1);
    const diag2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.12), runeMat);
    diag2.position.set(-0.14, -0.06, 0.28);
    diag2.rotation.z = 0.62;
    g.add(diag2);
    g.rotation.set(0.16, -0.3, 0);
    return g;
  }

  if (oreId === 'dustglyph') {
    const sandStone = toonMat(0x57534e, 0.8, 0.08);
    const mossAccent = toonMat(0x4d7c0f, 0.76, 0.08);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.02, 0.54), sandStone);
    slab.position.y = -0.04;
    slab.rotation.z = -0.06;
    g.add(slab);
    const moss = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.56), mossAccent);
    moss.position.set(0.16, 0.42, 0.01);
    moss.rotation.z = -0.06;
    g.add(moss);
    const goldGlyph = toonMat(0xfacc15, 0.1, 0.25, 0xeab308, 0.95);
    const glyphOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), goldGlyph);
    glyphOrb.position.set(-0.28, -0.14, 0.28);
    g.add(glyphOrb);
    const glyphBar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.1), goldGlyph);
    glyphBar.position.set(-0.14, -0.28, 0.28);
    glyphBar.rotation.z = 0.35;
    g.add(glyphBar);
    g.rotation.set(0.16, -0.34, 0);
    return g;
  }

  if (oreId === 'relicore') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 0), ruinStone);
    base.scale.set(1.25, 0.82, 0.88);
    base.position.y = -0.1;
    g.add(base);
    const bronzeMat = toonMat(0xb45309, 0.38, 0.55);
    const relicGlow = toonMat(0x22d3ee, 0.08, 0.2, 0x67e8f9, 0.96);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 10, 22), relicGlow);
    outerRing.position.set(-0.08, 0.02, 0.46);
    g.add(outerRing);
    const innerCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), relicGlow);
    innerCore.position.set(-0.08, 0.02, 0.48);
    g.add(innerCore);
    const cog = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 8), bronzeMat);
    cog.rotation.x = Math.PI / 2;
    cog.position.set(0.42, 0.22, 0.3);
    g.add(cog);
    g.rotation.set(0.18, -0.28, 0);
    return g;
  }

  if (oreId === 'sanctite') {
    const jadeStone = toonMat(0x99f6e4, 0.22, 0.25, 0x5eead4, 0.28);
    const mossBase = toonMat(0x365314, 0.72, 0.1);
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), mossBase);
    base.scale.set(1.26, 0.48, 0.96);
    base.position.y = -0.38;
    g.add(base);
    for (const [x, z, h, r, rz] of [
      [-0.36, 0.06, 0.68, 0.15, 0.2],
      [0.36, 0.04, 0.64, 0.15, -0.22],
      [-0.14, -0.14, 0.84, 0.18, 0.08],
      [0.16, -0.12, 0.78, 0.17, -0.1],
      [0, 0.08, 1.06, 0.22, 0],
    ] as Array<[number, number, number, number, number]>) {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), jadeStone);
      spire.position.set(x, -0.06 + h * 0.28, z);
      spire.rotation.z = rz;
      g.add(spire);
    }
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 12, 10),
      toonMat(0xf0fdfa, 0.06, 0.2, 0x67e8f9, 0.96)
    );
    beacon.position.set(0, 0.68, 0.08);
    g.add(beacon);
    g.rotation.set(0.2, -0.3, 0);
    return g;
  }

  if (oreId === 'gildium') {
    const mossRock = toonMat(0x3f6212, 0.68, 0.12);
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 0), mossRock);
    boulder.scale.set(1.3, 0.78, 1.02);
    boulder.position.y = -0.16;
    g.add(boulder);
    const goldMat = toonMat(0xfacc15, 0.16, 0.72, 0xd97706, 0.35);
    for (const [x, y, z, rx, ry, rz] of [
      [-0.34, 0.14, 0.24, 0.2, 0.3, 0.18],
      [0.28, 0.18, 0.2, -0.15, -0.25, -0.2],
      [0.02, -0.04, 0.44, 0.3, 0.1, 0.05],
    ] as Array<[number, number, number, number, number, number]>) {
      const ingot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.32), goldMat);
      ingot.position.set(x, y, z);
      ingot.rotation.set(rx, ry, rz);
      g.add(ingot);
    }
    const emerald = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      toonMat(0x22c55e, 0.1, 0.25, 0x4ade80, 0.85)
    );
    emerald.scale.set(0.9, 1.35, 0.9);
    emerald.position.set(0, 0.48, 0.04);
    g.add(emerald);
    g.rotation.set(0.2, -0.34, 0);
    return g;
  }

  if (oreId === 'oathstone') {
    const slate = toonMat(0x1e293b, 0.48, 0.32);
    const goldTrim = toonMat(0xf59e0b, 0.2, 0.75, 0xfbbf24, 0.25);
    const aquaRune = toonMat(0x22d3ee, 0.08, 0.2, 0x38bdf8, 0.95);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.14, 0.78), slate);
    body.position.y = -0.06;
    g.add(body);
    const crestL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.82), goldTrim);
    crestL.position.set(-0.36, 0.44, 0);
    crestL.rotation.z = 0.22;
    g.add(crestL);
    const crestR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.82), goldTrim);
    crestR.position.set(0.36, 0.44, 0);
    crestR.rotation.z = -0.22;
    g.add(crestR);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.14, 0.84), goldTrim);
    belt.position.y = -0.5;
    g.add(belt);
    for (const [x, rz] of [[-0.22, 0.32], [0.22, -0.32]]) {
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.12), aquaRune);
      glyph.position.set(x, -0.04, 0.4);
      glyph.rotation.z = rz;
      g.add(glyph);
    }
    const centerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), aquaRune);
    centerGem.position.set(0, -0.04, 0.43);
    g.add(centerGem);
    g.rotation.set(0.18, -0.34, 0);
    return g;
  }

  if (oreId === 'idolshard') {
    const headStone = toonMat(0x4d7c0f, 0.65, 0.12);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.02, 0.72), headStone);
    head.position.y = -0.14;
    g.add(head);
    const limeMat = toonMat(0x4ade80, 0.08, 0.25, 0x22c55e, 0.92);
    for (let i = 0; i < 5; i++) {
      const t = i / 4 - 0.5;
      const h = 0.54 + (1 - Math.abs(t)) * 0.28;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.13, h, 5), limeMat);
      crown.position.set(t * 0.72, 0.48 + h * 0.2, 0.04);
      crown.rotation.z = -t * 0.3;
      g.add(crown);
    }
    for (const x of [-0.2, 0.2]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.12), limeMat);
      eye.position.set(x, 0.04, 0.36);
      g.add(eye);
      const tear = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.1), limeMat);
      tear.position.set(x, -0.22, 0.36);
      g.add(tear);
    }
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.18), ruinStone);
    nose.position.set(0, -0.1, 0.38);
    g.add(nose);
    g.rotation.set(0.16, -0.3, 0);
    return g;
  }

  if (oreId === 'immortite') {
    const relicBase = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.62, 0),
      toonMat(0x3f6212, 0.6, 0.18)
    );
    relicBase.scale.set(1.24, 0.6, 0.96);
    relicBase.position.y = -0.28;
    g.add(relicBase);
    const goldEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.18, 0.64),
      toonMat(0xf59e0b, 0.18, 0.72, 0xfacc15, 0.3)
    );
    goldEdge.position.y = -0.06;
    g.add(goldEdge);
    const immortalGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 0),
      toonMat(0x2dd4bf, 0.08, 0.25, 0x5eead4, 0.94)
    );
    immortalGem.scale.set(0.95, 1.32, 0.95);
    immortalGem.position.set(0, 0.3, 0.06);
    g.add(immortalGem);
    const auraPink = toonMat(0xec4899, 0.08, 0.25, 0xf472b6, 0.92);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.075, 10, 28), auraPink);
    ring.rotation.set(1.08, 0.28, -0.22);
    g.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.045, 8, 24),
      toonMat(0xfef08a, 0.1, 0.3, 0xf472b6, 0.72)
    );
    ring2.rotation.set(-0.76, 0.45, 0.3);
    g.add(ring2);
    g.rotation.set(0.2, -0.32, 0);
    return g;
  }

  return null;
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

function buildOreModel(color: string, secondary: string, rarity: ItemRarity, oreId = ''): THREE.Group {
  if (oreId) {
    const customCrystal = buildCrystalCavesOreModel(oreId, color, secondary);
    if (customCrystal) return customCrystal;
    const customMagma = buildMagmaHollowsOreModel(oreId, color, secondary);
    if (customMagma) return customMagma;
    const customRuins = buildAncientRuinsOreModel(oreId, color, secondary);
    if (customRuins) return customRuins;
    const customVoid = buildVoidreachOreModel(oreId, color, secondary);
    if (customVoid) return customVoid;
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
    emissive: rarity === 'mythic' || rarity === 'legendary' || rarity === 'rainbow' ? color : '#000000',
    emissiveIntensity: rarity === 'mythic' ? 0.35 : rarity === 'legendary' ? 0.22 : 0.12,
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

function buildModelForKey(key: Hud3dIconKey): THREE.Group {
  switch (key) {
    case 'shops':
      return buildShopsModel();
    case 'shopBasket':
      return buildShopBasketModel();
    case 'hourglass':
      return buildHourglassModel();
    case 'indexBook':
      return buildIndexBookModel();
    case 'gem':
      return buildGemModel(0xec4899);
    case 'backpack':
      return buildBackpackModel();
    case 'daily':
      return buildDailyModel();
    case 'chest':
      return buildChestModel();
    case 'quest':
      return buildScrollModel(0xfef3c7, 0xd97706);
    case 'trade':
      return buildTradeModel();
    case 'sparkle':
      return buildSparkleModel();
    case 'pickaxe':
      return buildPickaxeModel(0x38bdf8);
    case 'stats':
      return buildStatsModel();
    case 'mutation':
      return buildMutationModel();
    case 'enchant':
      return createEnchantAura3D('spellbound', 0.96);
    case 'lock':
      return buildLockModel();
    case 'other_gems':
      return buildGemModel(0xf472b6);
    case 'other_scroll':
      return buildScrollModel(0xf5d0fe, 0xa855f7);
    case 'other_potion':
      return buildPotionModel(0x38bdf8);
    case 'other_charm':
      return buildCharmModel();
  }
}

function buildWeatherCloudCluster(colorHex: number, emissiveHex: number): THREE.Group {
  const cloud = new THREE.Group();
  const mat = toonMat(colorHex, 0.34, 0.08, emissiveHex, 0.22);
  const puffs: [number, number, number, number][] = [
    [0, 0.3, 0, 0.44],
    [-0.4, 0.18, 0.04, 0.33],
    [0.4, 0.2, -0.02, 0.35],
    [0.12, 0.44, 0.06, 0.3],
  ];
  for (const [x, y, z, r] of puffs) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
    m.position.set(x, y, z);
    cloud.add(m);
  }
  return cloud;
}

function buildWeatherModel(weatherId: WeatherId): THREE.Group {
  const g = new THREE.Group();
  if (weatherId === 'light_rain') {
    g.add(buildWeatherCloudCluster(0x93c5fd, 0x0284c7));
    const dropMat = toonMat(0x38bdf8, 0.14, 0.3, 0x0ea5e9, 0.45);
    for (const [dx, dy, dz] of [
      [-0.36, -0.36, 0.1],
      [0.02, -0.52, 0.18],
      [0.36, -0.32, 0.06],
    ]) {
      const drop = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 10), dropMat);
      drop.position.set(dx, dy, dz);
      drop.rotation.z = -0.18;
      g.add(drop);
    }
    g.rotation.set(0.16, -0.32, 0);
    return g;
  }

  if (weatherId === 'snow_rain') {
    g.add(buildWeatherCloudCluster(0xe0f2fe, 0x7dd3fc));
    const iceMat = toonMat(0xffffff, 0.15, 0.35, 0x38bdf8, 0.45);
    for (const [sx, sy, sz, sc] of [
      [-0.38, -0.38, 0.16, 1.0],
      [0.04, -0.54, 0.2, 1.15],
      [0.42, -0.34, 0.1, 0.9],
    ]) {
      const flake = new THREE.Group();
      for (let a = 0; a < 3; a++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.05), iceMat);
        bar.rotation.z = (a * Math.PI) / 3;
        flake.add(bar);
      }
      flake.position.set(sx, sy, sz);
      flake.scale.setScalar(sc);
      g.add(flake);
    }
    g.rotation.set(0.15, -0.28, 0);
    return g;
  }

  if (weatherId === 'bloodmoon') {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 22, 16),
      toonMat(0xef4444, 0.25, 0.2, 0xb91c1c, 0.65)
    );
    g.add(moon);
    const craterMat = toonMat(0x7f1d1d, 0.45, 0.1, 0x450a0a, 0.3);
    for (const [cx, cy, cz, r] of [
      [-0.22, 0.2, 0.52, 0.15],
      [0.24, -0.14, 0.54, 0.12],
      [0.05, 0.34, 0.48, 0.1],
    ]) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), craterMat);
      c.position.set(cx, cy, cz);
      g.add(c);
    }
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.075, 10, 32),
      toonMat(0xfca5a5, 0.18, 0.4, 0xdc2626, 0.65)
    );
    halo.rotation.set(1.08, 0.35, 0);
    g.add(halo);
    g.rotation.set(0.18, -0.25, 0);
    return g;
  }

  if (weatherId === 'void') {
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.48, 1),
      toonMat(0x1e1b4b, 0.12, 0.6, 0x581c87, 0.55)
    );
    g.add(core);
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.08, 10, 32),
      toonMat(0xc084fc, 0.18, 0.35, 0x9333ea, 0.75)
    );
    ring1.rotation.set(1.15, 0.4, 0);
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.055, 10, 32),
      toonMat(0x38bdf8, 0.2, 0.35, 0x7c3aed, 0.6)
    );
    ring2.rotation.set(-0.8, 0.9, 0.4);
    g.add(ring1, ring2);
    const shardMat = toonMat(0xe879f9, 0.15, 0.4, 0xa855f7, 0.6);
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + 0.4;
      const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), shardMat);
      sh.position.set(Math.cos(ang) * 0.85, Math.sin(ang) * 0.5, Math.sin(ang) * 0.25);
      g.add(sh);
    }
    g.rotation.set(0.15, -0.2, 0);
    return g;
  }

  // Celestial: golden radiant star-core + twin astral halos + orbiting stars
  const sunCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.5, 0),
    toonMat(0xfef08a, 0.1, 0.35, 0xf59e0b, 0.85)
  );
  sunCore.scale.set(1.0, 1.28, 1.0);
  g.add(sunCore);

  const astralRing1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.07, 10, 32),
    toonMat(0xfde047, 0.14, 0.75, 0xf59e0b, 0.6)
  );
  astralRing1.rotation.set(1.1, 0.35, 0);
  const astralRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.05, 10, 32),
    toonMat(0x67e8f9, 0.15, 0.4, 0x06b6d4, 0.65)
  );
  astralRing2.rotation.set(-0.95, 0.7, -0.3);
  g.add(astralRing1, astralRing2);

  const starMat = toonMat(0xffffff, 0.1, 0.3, 0xfde047, 0.8);
  for (const [sx, sy, sz] of [
    [-0.78, 0.46, 0.25],
    [0.82, 0.38, -0.15],
    [0.0, 0.88, 0.1],
    [-0.65, -0.58, 0.2],
    [0.72, -0.52, 0.15],
  ]) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), starMat);
    star.position.set(sx, sy, sz);
    g.add(star);
  }
  g.rotation.set(0.12, -0.25, 0);
  return g;
}

export function init3dHudIcons(): void {
  if (initialized) return;
  initialized = true;
  if (typeof document === 'undefined' || typeof WebGLRenderingContext === 'undefined') return;

  let renderer: THREE.WebGLRenderer | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(128, 128, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0.35, 3.6);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.35));
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyLight.position.set(2.8, 4.2, 3.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.15);
    rimLight.position.set(-3.2, -1.5, -2.5);
    scene.add(rimLight);

    const renderAndCache = (cacheKey: string, model: THREE.Group): void => {
      scene.add(model);
      renderer!.render(scene, camera);
      iconCache.set(cacheKey, canvas.toDataURL('image/png'));
      scene.remove(model);
    };

    const keys: Hud3dIconKey[] = [
      'shops',
      'shopBasket',
      'hourglass',
      'indexBook',
      'gem',
      'backpack',
      'daily',
      'chest',
      'quest',
      'trade',
      'sparkle',
      'pickaxe',
      'stats',
      'mutation',
      'enchant',
      'lock',
      'other_gems',
      'other_scroll',
      'other_potion',
      'other_charm',
    ];

    for (const key of keys) {
      renderAndCache(key, buildModelForKey(key));
    }

    for (const ore of ORES) {
      const idKey = `ore:id:${ore.id}`;
      if (!iconCache.has(idKey)) {
        renderAndCache(idKey, buildOreModel(ore.color, ore.secondaryColor, ore.rarity, ore.id));
      }
      const oreKey = `ore:${ore.rarity}:${ore.color}:${ore.secondaryColor}`;
      if (!iconCache.has(oreKey)) {
        renderAndCache(oreKey, buildOreModel(ore.color, ore.secondaryColor, ore.rarity, ore.id));
      }
    }

    for (const p of PICKAXES) {
      renderAndCache(`pickaxe:${p.id}`, buildPickaxeModel(p.color));
    }

    for (const item of GEM_SHOP_ITEMS) {
      renderAndCache(`gem_potion:${item.id}`, buildGemPotionModel(item.shape, item.color));
    }

    for (const enc of ENCHANTS) {
      renderAndCache(`aura:${enc.id}`, createEnchantAura3D(enc.id, 1.02));
    }
    for (const w of WEATHERS) {
      renderAndCache(`weather:${w.id}`, buildWeatherModel(w.id));
    }
    renderAndCache('enchant_dice', createEnchantDice3D());

    // 48x48 3D Pickaxe cursor oriented with tip pointing top-left (hotspot 4,4)
    const cursorCanvas = document.createElement('canvas');
    cursorCanvas.width = 48;
    cursorCanvas.height = 48;
    const cursorRenderer = new THREE.WebGLRenderer({
      canvas: cursorCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    cursorRenderer.setSize(48, 48, false);
    cursorRenderer.outputColorSpace = THREE.SRGBColorSpace;
    cursorRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    cursorRenderer.toneMappingExposure = 1.2;

    const cursorPick = buildPickaxeModel(0x38bdf8);
    cursorPick.rotation.set(0.18, -0.32, 0.72);
    cursorPick.scale.setScalar(1.08);
    scene.add(cursorPick);
    cursorRenderer.render(scene, camera);
    iconCache.set('cursor_pickaxe', cursorCanvas.toDataURL('image/png'));
    scene.remove(cursorPick);
    cursorRenderer.dispose();
  } catch {
    // Headless / WebGL-unavailable environment: fallback SVGs will be used cleanly
  } finally {
    renderer?.dispose();
  }
}

export function get3dHudIconUrl(key: Hud3dIconKey): string | null {
  return iconCache.get(key) ?? null;
}

export function get3dOreIconUrl(
  color: string,
  secondary: string,
  rarity: ItemRarity,
  oreId = ''
): string | null {
  if (oreId) {
    const byId = iconCache.get(`ore:id:${oreId}`);
    if (byId) return byId;
  }
  return iconCache.get(`ore:${rarity}:${color}:${secondary}`) ?? null;
}

export function get3dPickaxeCursorUrl(): string | null {
  return iconCache.get('cursor_pickaxe') ?? null;
}

export function get3dPickaxeIconUrl(pickaxeId: string): string | null {
  return iconCache.get(`pickaxe:${pickaxeId}`) ?? null;
}

export function get3dGemPotionIconUrl(potionId: string): string | null {
  return iconCache.get(`gem_potion:${potionId}`) ?? null;
}

export function get3dAuraIconUrl(enchantId: string): string | null {
  return iconCache.get(`aura:${enchantId}`) ?? null;
}

export function get3dEnchantDiceIconUrl(): string | null {
  return iconCache.get('enchant_dice') ?? null;
}

export function get3dWeatherIconUrl(weatherId: WeatherId): string | null {
  return iconCache.get(`weather:${weatherId}`) ?? null;
}
