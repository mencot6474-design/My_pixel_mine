import * as THREE from 'three';
import { ENCHANTS, GEM_SHOP_ITEMS, GemPotionShape, ItemRarity, ORES, PICKAXES } from '../game/GameData';
import { WEATHERS, WeatherId } from '../game/WeatherData';
import { createEnchantAura3D, createEnchantDice3D } from './AuraModels3D';
import { toonMat } from './HudIconOreModelsA3D';
import { buildOreModel } from './HudIconOreModelsB3D';

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

function buildPickaxeModel(headColor: THREE.ColorRepresentation = 0x38bdf8, rarity?: ItemRarity): THREE.Group {
  const g = new THREE.Group();
  const isEndgame = rarity === 'exotic' || rarity === 'secret' || rarity === 'mythic';
  const handleColor = isEndgame ? 0x1e293b : 0x92400e;
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 1.55, 10),
    toonMat(handleColor, isEndgame ? 0.35 : 0.6, isEndgame ? 0.5 : 0)
  );
  handle.position.y = -0.1;
  g.add(handle);

  const emissiveHex = isEndgame || rarity === 'rainbow' ? headColor : 0x000000;
  const emissiveInt = rarity === 'secret' ? 0.45 : isEndgame ? 0.3 : rarity === 'rainbow' ? 0.2 : 0;
  const headMat = toonMat(headColor, 0.22, 0.72, emissiveHex, emissiveInt);
  const center = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.28), headMat);
  center.position.y = 0.55;
  g.add(center);

  if (isEndgame) {
    const crest = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.15, 0),
      toonMat(0xffffff, 0.1, 0.5, headColor, 0.7)
    );
    crest.position.set(0, 0.55, 0.16);
    crest.scale.set(0.9, 1.15, 0.6);
    g.add(crest);
  }

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
      renderAndCache(`pickaxe:${p.id}`, buildPickaxeModel(p.color, p.rarity));
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
