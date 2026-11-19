import * as THREE from 'three';
import { ENCHANTS } from '../game/GameData';
import {
  AltarClockDialParts,
  AltarClockHandParts,
  AltarParticleSystem,
  createAltarClockDial,
  createAltarClockHand,
  createAltarSubHand,
} from './AltarSpinFx3D';
import { ArtBillboard2D, EnchantBillboard2D } from './AuraModels3D';
import { getChibiById } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import {
  createCyberCrystalCluster,
  createCyberMonolithForkFinial,
  disposeCyberProp,
} from './CyberProps3D';
import { HellAltarEyeController } from './HellAltarEye3D';
import {
  createAnimeAuraShaderMaterial,
  createAnimeParticlePoints,
  ENCHANT_SECONDARY_COLOR,
  getEnchantSigilTexture,
  getPedestalHoloRingTexture,
} from './PlotPedestal3D';
import { createShopCyberPlaza, ShopCyberPlazaHandle } from './ShopCyberPlaza3D';

export type ShopStationId = 'pickaxe' | 'sell' | 'gems' | 'altar' | 'tower' | 'forge';

export interface ShopChibiBubbleAnchor {
  id: string;
  x: number;
  y: number;
  text: string;
}

interface PlazaWaypoint {
  x: number;
  z: number;
  shopId: ShopStationId | 'walk';
}

interface PlazaWalker {
  slotKey: string;
  chibiId: string;
  sprite: ChibiSprite3D;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  targetShop: ShopStationId | 'walk';
  pauseTimer: number;
  bubbleText: string | null;
  bubbleTimer: number;
  nextBubbleCooldown: number;
  facingRight: boolean;
}

const PLAZA_WAYPOINTS: readonly PlazaWaypoint[] = [
  { x: -9.2, z: -6.4, shopId: 'pickaxe' },
  { x: -7.0, z: 1.4, shopId: 'sell' },
  { x: 9.2, z: -6.4, shopId: 'gems' },
  { x: -2.3, z: -2.1, shopId: 'altar' },
  { x: 2.3, z: 2.1, shopId: 'altar' },
  { x: 0.0, z: -6.4, shopId: 'tower' },
  { x: 7.0, z: 1.4, shopId: 'forge' },
  { x: 0.5, z: 6.2, shopId: 'walk' },
  { x: 5.2, z: 3.9, shopId: 'walk' },
];

const PLAZA_BUBBLE_LINES: Record<ShopStationId | 'walk', readonly string[]> = {
  pickaxe: [
    'Ooh, shiny pickaxes!',
    'Can I hold the big one?!',
    'So sharp!',
    'Upgrade my pickaxe!',
  ],
  sell: [
    'Time to get rich!',
    'Sell! Sell! Sell!',
    'Look at all that Cash!',
    'No discounts today!',
  ],
  gems: [
    'Ooh, glowing potions!',
    'Do they sell soda?!',
    'I want the shiny pink one!',
    'Gem shopping spree!',
  ],
  altar: [
    'Magic sparkles!',
    'Give me a lucky enchant!',
    'Spin the wheel!',
    'Whoa, floating runes!',
  ],
  tower: [
    'That tower is huge!',
    'Ready for the Boss!',
    'Who lives up there?!',
    'Let us climb the Tower!',
  ],
  forge: [
    'Clang! Clang! Forging!',
    'Hot anvil, shiny relics!',
    'Time to craft a Relic!',
    'Smells like molten gold!',
  ],
  walk: [
    'Nice weather today!',
    'Wait, I am broke!',
    'Where is the snack shop?!',
    'Don’t forget to upgrade me!',
    'Ooh, pretty plaza!',
    'My feet are tired!',
  ],
};

export interface ShopStationAnchor {
  id: ShopStationId;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  visible: boolean;
}

export interface AltarPedestalAnchor {
  id: string;
  name: string;
  chancePct: number;
  color: string;
  x: number;
  y: number;
  visible: boolean;
  highlighted: boolean;
}

interface AltarPedestalEntry {
  id: string;
  group: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
  holoDiscMat: THREE.MeshBasicMaterial;
  sigilMesh: THREE.Mesh;
  sigilMat: THREE.MeshBasicMaterial;
  auraVeilMat: THREE.ShaderMaterial;
  auraOuterVeilMat: THREE.ShaderMaterial;
  particleMat: THREE.ShaderMaterial;
  conduitMat: THREE.MeshBasicMaterial;
  conduitPulses: THREE.Mesh[];
  curLift: number;
  prop: THREE.Object3D;
  billboard: EnchantBillboard2D;
  baseY: number;
  needleAngle: number;
  worldX: number;
  worldZ: number;
  anchorLocal: THREE.Vector3;
}

interface AltarFloatingIslandEntry {
  group: THREE.Group;
  baseY: number;
  phase: number;
  bobSpeed: number;
}

function createAltarChamferPadGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
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
  const innerH = Math.max(0.015, height - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerH,
    bevelEnabled: true,
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

function createAltarPodiumPlaqueTexture(label: string, accentHex: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#09111f';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, c.width - 6, c.height - 6);
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.28;
  ctx.fillRect(8, 12, 6, 24);
  ctx.fillRect(c.width - 14, 12, 6, 24);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 20px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, c.width * 0.5, c.height * 0.52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class ShopWorld3D {
  public readonly shopGroup = new THREE.Group();
  public readonly altarGroup = new THREE.Group();
  public readonly shopClickables: THREE.Object3D[] = [];

  private readonly shopEmblems: ArtBillboard2D[] = [];
  private readonly altarPedestals: AltarPedestalEntry[] = [];
  private readonly floatingShards: THREE.Mesh[] = [];
  private readonly floatingIslands: AltarFloatingIslandEntry[] = [];
  private readonly ownedAltarTextures: THREE.Texture[] = [];
  private readonly customAltarDisposers: Array<() => void> = [];
  private readonly altarParticles = new AltarParticleSystem();
  private readonly plazaWalkers = new Map<string, PlazaWalker>();
  private readonly plazaProjVec = new THREE.Vector3();
  private readonly hellEye = new HellAltarEyeController();
  private cyberPlaza!: ShopCyberPlazaHandle;
  private clockDial!: AltarClockDialParts;
  private clockHand!: AltarClockHandParts;
  private clockSubHand!: THREE.Group;
  private outerEllipseMat!: THREE.MeshBasicMaterial;

  private spinTimer = 0;
  private spinDuration = 1.9;
  private spinTargetIndex = -1;
  private activeHighlightIndex = -1;
  private needleAngle = Math.PI * 0.5;
  private subHandAngle = Math.PI * 0.5;
  private spinStartAngle = Math.PI * 0.5;
  private spinEndAngle = Math.PI * 0.5;
  private onSpinEnd?: () => void;

  private readonly stationPositions: Array<{
    id: ShopStationId;
    title: string;
    subtitle: string;
    pos: THREE.Vector3;
  }> = [
    { id: 'pickaxe', title: 'Pickaxes!', subtitle: 'Buy Pickaxes', pos: new THREE.Vector3(-11.4, 7.05, -9.6) },
    { id: 'sell', title: 'Sell Items!', subtitle: 'Sell Ores & Chibi', pos: new THREE.Vector3(-10.2, 5.9, 0.8) },
    { id: 'gems', title: 'Gem Shop!', subtitle: 'Elixirs & Potions', pos: new THREE.Vector3(11.4, 8.55, -9.6) },
    { id: 'altar', title: 'Enchant Altar', subtitle: 'Spin Enchants', pos: new THREE.Vector3(0, 4.65, -0.5) },
    { id: 'tower', title: 'Gem Tower', subtitle: 'Grind Gems & Dice', pos: new THREE.Vector3(0, 9.75, -11.4) },
    { id: 'forge', title: 'Relic Forge', subtitle: 'Craft & Equip Relics', pos: new THREE.Vector3(10.2, 5.9, 0.8) },
  ];

  constructor() {
    this.shopGroup.visible = false;
    this.altarGroup.visible = false;
    this.buildShopPlaza();
    this.buildEnchantAltar();
  }

  private buildShopPlaza(): void {
    this.cyberPlaza = createShopCyberPlaza();
    this.shopGroup.add(this.cyberPlaza.group);

    // Preserve exact clickable hitboxes & lift floating 2.5D icons cleanly above taller cyber storefronts
    this.addShopEmblem('/hud/enchant.webp', '#e879f9', 0, 3.45, -0.5, 1.55, 2.5);
    const altarHit = this.createHitbox(0, 1.55, -0.5, 5.8, 3.0, 5.8, 'shop-altar');
    this.shopGroup.add(altarHit);
    this.shopClickables.push(altarHit);

    this.addShopEmblem('/pickaxes/sunwheel.webp', '#38bdf8', -11.4, 5.85, -9.6, 1.55, 0);
    const pickHit = this.createHitbox(-11.4, 2.2, -9.6, 5.4, 4.6, 4.6, 'shop-pickaxe');
    this.shopGroup.add(pickHit);
    this.shopClickables.push(pickHit);

    this.addShopEmblem('/hud/trade.webp', '#4ade80', -10.2, 4.95, 0.8, 1.42, 1.0);
    const sellHit = this.createHitbox(-10.2, 2.0, 0.8, 5.2, 4.2, 3.8, 'shop-sell');
    this.shopGroup.add(sellHit);
    this.shopClickables.push(sellHit);

    this.addShopEmblem('/relics/ember_gauntlet.webp', '#f97316', 10.2, 4.95, 0.8, 1.38, 1.0);
    const forgeHit = this.createHitbox(10.2, 2.0, 0.8, 4.8, 4.2, 3.6, 'shop-forge');
    this.shopGroup.add(forgeHit);
    this.shopClickables.push(forgeHit);

    this.addShopEmblem('/hud/gem.webp', '#f472b6', 11.4, 7.3, -9.6, 1.55, 1.8);
    const gemHit = this.createHitbox(11.4, 2.3, -9.6, 5.4, 5.0, 4.6, 'shop-gems');
    this.shopGroup.add(gemHit);
    this.shopClickables.push(gemHit);

    this.addShopEmblem('/hud/tower.webp', '#38bdf8', 0, 8.85, -11.4, 1.78, 0.8);
    const towerHit = this.createHitbox(0, 4.5, -11.4, 8.2, 7.8, 7.2, 'shop-tower');
    this.shopGroup.add(towerHit);
    this.shopClickables.push(towerHit);
  }

  private addShopEmblem(
    publicPath: string,
    color: string,
    x: number,
    y: number,
    z: number,
    baseSize: number,
    phase: number
  ): ArtBillboard2D {
    const emblem = new ArtBillboard2D(publicPath, color, {
      baseSize,
      phase,
      centerY: 0,
      showPedestalBase: false,
      bobAmp: 0.14,
      swayAmp: 0.048,
      haloScale: 1.48,
    });
    emblem.root.position.set(x, y, z);
    this.shopGroup.add(emblem.root);
    this.shopEmblems.push(emblem);
    return emblem;
  }

  private createHitbox(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    kind: string
  ): THREE.Mesh {
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.position.set(x, y, z);
    hit.userData = { kind };
    return hit;
  }

  private buildEnchantAltar(): void {
    const armorDarkMat = new THREE.MeshStandardMaterial({
      color: '#131b2b',
      roughness: 0.52,
      metalness: 0.44,
      flatShading: true,
    });
    const armorSteelMat = new THREE.MeshStandardMaterial({
      color: '#1e2c44',
      roughness: 0.42,
      metalness: 0.52,
      flatShading: true,
    });
    const brightSteelMat = new THREE.MeshStandardMaterial({
      color: '#354764',
      roughness: 0.3,
      metalness: 0.62,
      flatShading: true,
    });
    const centerNeonVioletMat = new THREE.MeshStandardMaterial({
      color: '#c084fc',
      emissive: '#a855f7',
      emissiveIntensity: 1.25,
      roughness: 0.24,
      metalness: 0.45,
      flatShading: true,
    });
    const centerNeonCyanMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#22d3ee',
      emissiveIntensity: 1.15,
      roughness: 0.24,
      metalness: 0.45,
      flatShading: true,
    });

    // Center ZZZ/HSR Cyber-Chrono Core Podium supporting the Altar Clock Dial at (0, 0.28, -2.4)
    const centerPodiumGroup = new THREE.Group();
    centerPodiumGroup.position.set(0, 0, -2.4);
    const centerDockBay = new THREE.Mesh(
      createAltarChamferPadGeometry(3.48, 0.16, 3.48, 0.72, 0.018),
      armorDarkMat
    );
    centerDockBay.position.y = 0.04;
    centerDockBay.castShadow = true;
    centerDockBay.receiveShadow = true;
    const centerMachineryPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.56, 1.72, 0.14, 8),
      armorSteelMat
    );
    centerMachineryPlinth.position.y = 0.21;
    centerMachineryPlinth.rotation.y = Math.PI / 8;
    centerMachineryPlinth.castShadow = true;
    centerMachineryPlinth.receiveShadow = true;
    const centerSeamStrip = new THREE.Mesh(
      new THREE.CylinderGeometry(1.74, 1.76, 0.032, 8),
      centerNeonVioletMat
    );
    centerSeamStrip.position.y = 0.15;
    centerSeamStrip.rotation.y = Math.PI / 8;
    const centerUnderCone = new THREE.Mesh(
      new THREE.CylinderGeometry(1.48, 0.64, 1.08, 8),
      armorDarkMat
    );
    centerUnderCone.position.y = -0.5;
    centerUnderCone.rotation.y = Math.PI / 8;
    centerUnderCone.castShadow = true;
    const centerThrusterRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.045, 6, 8),
      centerNeonCyanMat
    );
    centerThrusterRing.rotation.x = Math.PI / 2;
    centerThrusterRing.rotation.z = Math.PI / 8;
    centerThrusterRing.position.y = -0.98;
    centerPodiumGroup.add(
      centerDockBay,
      centerMachineryPlinth,
      centerSeamStrip,
      centerUnderCone,
      centerThrusterRing
    );
    const centerFinGeo = new THREE.BoxGeometry(0.14, 0.82, 0.48);
    for (let f = 0; f < 4; f++) {
      const fa = (f * Math.PI) / 2 + Math.PI / 4;
      const fin = new THREE.Mesh(centerFinGeo, brightSteelMat);
      fin.position.set(Math.cos(fa) * 1.15, -0.44, Math.sin(fa) * 1.15);
      fin.rotation.y = -fa + Math.PI / 2;
      centerPodiumGroup.add(fin);
    }
    this.altarGroup.add(centerPodiumGroup);

    // Outer Elliptical Synchro Ring linking all 10 Enchant Podiums in space (flat horizontal plane)
    this.outerEllipseMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerEllipseRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.008, 6, 64),
      this.outerEllipseMat
    );
    outerEllipseRing.rotation.x = Math.PI / 2;
    outerEllipseRing.scale.set(5.4, 3.9, 1);
    outerEllipseRing.position.set(0, 0.12, -2.4);
    this.altarGroup.add(outerEllipseRing);

    // Shared ZZZ/HSR Cyber-Showcase Podium geometries for the 10 Enchant Pedestals
    const bayDockGeo = createAltarChamferPadGeometry(1.88, 0.095, 1.62, 0.34, 0.015);
    const guardGeo = createAltarChamferPadGeometry(0.14, 0.11, 1.04, 0.04, 0.012);
    const ventGeo = new THREE.BoxGeometry(0.04, 0.06, 0.16);
    const edgeSeamGeo = new THREE.CylinderGeometry(0.79, 0.81, 0.024, 8);
    const plinthGeo = new THREE.CylinderGeometry(0.68, 0.78, 0.128, 8);
    const topRimGeo = new THREE.CylinderGeometry(0.63, 0.69, 0.036, 8);
    const frontApronGeo = createAltarChamferPadGeometry(0.58, 0.095, 0.24, 0.05, 0.012);
    const plaqueFaceGeo = new THREE.PlaneGeometry(0.44, 0.16);
    const rearManifoldGeo = createAltarChamferPadGeometry(1.18, 0.18, 0.26, 0.08, 0.014);
    const manifoldGlowGeo = createAltarChamferPadGeometry(0.84, 0.035, 0.06, 0.01, 0.006);
    const stanchionGeo = createAltarChamferPadGeometry(0.14, 0.56, 0.18, 0.03, 0.012);
    const stanchionCapGeo = createAltarChamferPadGeometry(0.18, 0.06, 0.22, 0.04, 0.01);
    const stanchionBladeGeo = new THREE.BoxGeometry(0.035, 0.44, 0.045);
    const ringTorusGeo = new THREE.TorusGeometry(0.59, 0.025, 6, 8);
    const clawGeo = new THREE.CylinderGeometry(0.04, 0.056, 0.072, 6);
    const diodeGeo = new THREE.CylinderGeometry(0.024, 0.028, 0.028, 6);
    const underHullGeo = new THREE.CylinderGeometry(0.74, 0.34, 0.56, 8);
    const underFinGeo = new THREE.BoxGeometry(0.08, 0.44, 0.28);
    const underThrusterRingGeo = new THREE.TorusGeometry(0.42, 0.028, 6, 8);
    const conduitBeamGeo = new THREE.CylinderGeometry(0.028, 0.028, 1, 6);
    const conduitPulseGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const pedHoloTex = getPedestalHoloRingTexture();
    const holoLensGeo = pedHoloTex
      ? new THREE.PlaneGeometry(1.18, 1.18)
      : new THREE.RingGeometry(0.24, 0.54, 24);
    const sigilTex = getEnchantSigilTexture();
    const sigilGeo = sigilTex
      ? new THREE.PlaneGeometry(1.88, 1.88)
      : new THREE.RingGeometry(0.56, 0.82, 32);
    const veilGeo1 = new THREE.CylinderGeometry(0.74, 0.56, 1.48, 24, 1, true);
    const veilGeo2 = new THREE.CylinderGeometry(0.88, 0.62, 1.56, 24, 1, true);

    const podiumScale = 0.92;
    const daisTopY = 0.285 * podiumScale;
    const centerOrigin = new THREE.Vector3(0, 0.16, -2.4);
    const upAxis = new THREE.Vector3(0, 1, 0);

    // 10 floating ZZZ/HSR Cyber-Showcase Enchant Pedestals in an ellipse ring
    const count = ENCHANTS.length;
    const pedestalTargets: Array<{ x: number; z: number; color: string }> = [];
    for (let i = 0; i < count; i++) {
      const enc = ENCHANTS[i];
      const secondaryHex = ENCHANT_SECONDARY_COLOR[enc.id] ?? '#ffffff';
      const angle = (i / count) * Math.PI * 2 + Math.PI * 0.18;
      const rx = 5.4;
      const rz = 3.9;
      const px = Math.cos(angle) * rx;
      const pz = Math.sin(angle) * rz - 2.4;
      const py = Math.sin(angle) < 0 ? 0.55 : -0.15;
      const needleAngle = Math.atan2(-(pz - -2.4), px);
      pedestalTargets.push({ x: px, z: pz, color: enc.color });

      // Radial Energy Conduit Bridge + 3 Traveling Energy Pulses from Center Clock to Podium
      const conduitMat = new THREE.MeshBasicMaterial({
        color: enc.color,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pedConduitEnd = new THREE.Vector3(px, py - 0.12, pz);
      const conduitDist = centerOrigin.distanceTo(pedConduitEnd);
      const conduitBeam = new THREE.Mesh(conduitBeamGeo, conduitMat);
      conduitBeam.position.copy(centerOrigin).lerp(pedConduitEnd, 0.5);
      conduitBeam.scale.set(1, conduitDist, 1);
      conduitBeam.quaternion.setFromUnitVectors(
        upAxis,
        pedConduitEnd.clone().sub(centerOrigin).normalize()
      );
      this.altarGroup.add(conduitBeam);

      const conduitPulses: THREE.Mesh[] = [];
      for (let pIdx = 0; pIdx < 3; pIdx++) {
        const pulseMesh = new THREE.Mesh(conduitPulseGeo, conduitMat);
        pulseMesh.position.copy(centerOrigin).lerp(pedConduitEnd, pIdx / 3);
        this.altarGroup.add(pulseMesh);
        conduitPulses.push(pulseMesh);
      }

      const pg = new THREE.Group();
      pg.position.set(px, py, pz);

      const podiumGroup = new THREE.Group();
      podiumGroup.scale.setScalar(podiumScale);
      pg.add(podiumGroup);

      const ringMat = new THREE.MeshStandardMaterial({
        color: enc.color,
        emissive: enc.color,
        emissiveIntensity: 1.0,
        roughness: 0.2,
        metalness: 0.45,
        flatShading: true,
      });

      // Tier 0: Floating Cyber-Thruster Under-Hull (y < 0)
      const underHull = new THREE.Mesh(underHullGeo, armorDarkMat);
      underHull.position.y = -0.28;
      underHull.rotation.y = Math.PI / 8;
      underHull.castShadow = true;
      const underThruster = new THREE.Mesh(underThrusterRingGeo, ringMat);
      underThruster.rotation.x = Math.PI / 2;
      underThruster.rotation.z = Math.PI / 8;
      underThruster.position.y = -0.54;
      podiumGroup.add(underHull, underThruster);
      for (let f = 0; f < 4; f++) {
        const fa = (f * Math.PI) / 2 + Math.PI / 4;
        const fin = new THREE.Mesh(underFinGeo, brightSteelMat);
        fin.position.set(Math.cos(fa) * 0.56, -0.24, Math.sin(fa) * 0.56);
        fin.rotation.y = -fa + Math.PI / 2;
        podiumGroup.add(fin);
      }

      // Tier 1: Chamfered Dock Bay + Flank Armor Bumpers + Cooling Louver Vents
      const bayDock = new THREE.Mesh(bayDockGeo, armorDarkMat);
      bayDock.receiveShadow = true;
      bayDock.castShadow = true;
      podiumGroup.add(bayDock);
      for (const sx of [-1, 1]) {
        const guard = new THREE.Mesh(guardGeo, armorSteelMat);
        guard.position.set(sx * 0.92, 0.055, -0.02);
        guard.castShadow = true;
        guard.receiveShadow = true;
        podiumGroup.add(guard);
        for (const vz of [-0.32, 0, 0.32]) {
          const vent = new THREE.Mesh(ventGeo, brightSteelMat);
          vent.position.set(sx * 0.995, 0.105, vz);
          podiumGroup.add(vent);
        }
      }

      // Recessed Edge-Lit Acrylic Seam Strip + Tier 2 Stepped Octagonal Machinery Dais
      const edgeSeamRing = new THREE.Mesh(edgeSeamGeo, ringMat);
      edgeSeamRing.position.y = 0.1;
      edgeSeamRing.rotation.y = Math.PI / 8;
      const machineryPlinth = new THREE.Mesh(plinthGeo, armorSteelMat);
      machineryPlinth.position.y = 0.176;
      machineryPlinth.rotation.y = Math.PI / 8;
      machineryPlinth.receiveShadow = true;
      machineryPlinth.castShadow = true;
      const topBevelRim = new THREE.Mesh(topRimGeo, brightSteelMat);
      topBevelRim.position.y = 0.256;
      topBevelRim.rotation.y = Math.PI / 8;
      topBevelRim.receiveShadow = true;
      podiumGroup.add(edgeSeamRing, machineryPlinth, topBevelRim);

      // Tier 3: Sleek Front-Angled Slot Plaque ("01".."10")
      const frontApron = new THREE.Mesh(frontApronGeo, brightSteelMat);
      frontApron.position.set(0, 0.02, 0.84);
      frontApron.rotation.x = 0.34;
      frontApron.castShadow = true;
      const plaqueTex = createAltarPodiumPlaqueTexture(String(i + 1).padStart(2, '0'), enc.color);
      if (plaqueTex) this.ownedAltarTextures.push(plaqueTex);
      const plaqueMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        ...(plaqueTex ? { map: plaqueTex } : { color: 0x0f172a }),
      });
      const plaqueFace = new THREE.Mesh(plaqueFaceGeo, plaqueMat);
      plaqueFace.position.set(0, 0.099, 0);
      plaqueFace.rotation.x = -Math.PI / 2;
      frontApron.add(plaqueFace);
      podiumGroup.add(frontApron);

      // Tier 4: ZZZ/HSR Low-Profile Rear Holographic Display Stanchions & Power Manifold
      const rearManifold = new THREE.Mesh(rearManifoldGeo, armorDarkMat);
      rearManifold.position.set(0, 0.04, -0.78);
      rearManifold.castShadow = true;
      rearManifold.receiveShadow = true;
      const manifoldGlow = new THREE.Mesh(manifoldGlowGeo, ringMat);
      manifoldGlow.position.set(0, 0.22, -0.78);
      podiumGroup.add(rearManifold, manifoldGlow);
      for (const sx of [-1, 1]) {
        const pylonPivot = new THREE.Group();
        pylonPivot.position.set(sx * 0.76, 0.08, -0.68);
        pylonPivot.rotation.z = -sx * 0.12;
        pylonPivot.rotation.x = 0.08;
        const body = new THREE.Mesh(stanchionGeo, armorSteelMat);
        body.castShadow = true;
        body.receiveShadow = true;
        const cap = new THREE.Mesh(stanchionCapGeo, brightSteelMat);
        cap.position.y = 0.56;
        cap.castShadow = true;
        const glowBlade = new THREE.Mesh(stanchionBladeGeo, ringMat);
        glowBlade.position.set(-sx * 0.072, 0.28, 0.045);
        pylonPivot.add(body, cap, glowBlade);
        podiumGroup.add(pylonPivot);
      }

      // Tier 5: Core Frosted Emitter Lens + Recessed Octagonal Neon Collar + 4 Corner Claws & Diodes
      const holoDiscMat = new THREE.MeshBasicMaterial({
        color: enc.color,
        ...(pedHoloTex ? { map: pedHoloTex } : {}),
        transparent: true,
        opacity: pedHoloTex ? 0.72 : 0.36,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const holoLensDisc = new THREE.Mesh(holoLensGeo, holoDiscMat);
      holoLensDisc.rotation.x = -Math.PI / 2;
      holoLensDisc.position.y = 0.282;
      holoLensDisc.renderOrder = 2;
      const ringMesh = new THREE.Mesh(ringTorusGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.rotation.z = Math.PI / 8;
      ringMesh.position.y = 0.286;
      for (let c = 0; c < 4; c++) {
        const ang = Math.PI / 4 + (c * Math.PI) / 2;
        const cx = Math.cos(ang) * 0.635;
        const cz = Math.sin(ang) * 0.635;
        const claw = new THREE.Mesh(clawGeo, brightSteelMat);
        claw.position.set(cx, 0.254, cz);
        claw.castShadow = true;
        const diode = new THREE.Mesh(diodeGeo, ringMat);
        diode.position.set(cx, 0.295, cz);
        podiumGroup.add(claw, diode);
      }
      podiumGroup.add(holoLensDisc, ringMesh);

      // Anime-RPG Ground Sigil + Dual-Shell Fresnel Rim Aura + GPU Star-Ember Particles
      const sigilMat = new THREE.MeshBasicMaterial({
        color: enc.color,
        ...(sigilTex ? { map: sigilTex } : {}),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: sigilTex ? 0.56 : 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const sigilMesh = new THREE.Mesh(sigilGeo, sigilMat);
      sigilMesh.rotation.x = -Math.PI / 2;
      sigilMesh.position.y = 0.298;
      sigilMesh.renderOrder = 3;
      const auraVeilMat = createAnimeAuraShaderMaterial(enc.color, secondaryHex, 0.32);
      const auraOuterVeilMat = createAnimeAuraShaderMaterial(secondaryHex, enc.color, 0.18);
      const auraVeil = new THREE.Mesh(veilGeo1, auraVeilMat);
      auraVeil.position.y = 1.02;
      const outerAuraVeil = new THREE.Mesh(veilGeo2, auraOuterVeilMat);
      outerAuraVeil.position.y = 1.06;
      const particles = createAnimeParticlePoints(enc.color, secondaryHex, {
        count: 20,
        minRadius: 0.42,
        maxRadius: 0.74,
        baseY: 0.28,
        sizeScale: podiumScale,
      });
      podiumGroup.add(sigilMesh, auraVeil, outerAuraVeil, particles.points);

      const billboard = new EnchantBillboard2D(enc.id, enc.color, 1.38, i * 0.7);
      billboard.root.position.y = daisTopY + 0.02;
      pg.add(billboard.root);

      this.altarGroup.add(pg);
      this.altarPedestals.push({
        id: enc.id,
        group: pg,
        ringMat,
        holoDiscMat,
        sigilMesh,
        sigilMat,
        auraVeilMat,
        auraOuterVeilMat,
        particleMat: particles.mat,
        conduitMat,
        conduitPulses,
        curLift: 0,
        prop: billboard.root,
        billboard,
        baseY: py,
        needleAngle,
        worldX: px,
        worldZ: pz,
        anchorLocal: new THREE.Vector3(px, py + 1.86, pz),
      });
    }

    // 6 Outer Floating Cosmic Crystal Islands + 4 Perimeter Chrono-Monolith Pylons
    const islandSpecs: ReadonlyArray<readonly [number, number, number, number]> = [
      [-8.6, 1.25, -4.8, 1.08],
      [8.6, 1.35, -4.8, 1.12],
      [-7.8, 0.45, 1.4, 0.92],
      [7.8, 0.55, 1.4, 0.95],
      [-5.4, 2.25, -8.2, 1.18],
      [5.4, 2.15, -8.2, 1.15],
    ];
    const islandDeckGeo = new THREE.CylinderGeometry(1.18, 0.95, 0.24, 8);
    const islandConeGeo = new THREE.ConeGeometry(0.95, 1.42, 7);
    const islandTrimGeo = new THREE.TorusGeometry(1.18, 0.036, 6, 8);
    const satShardGeo = new THREE.OctahedronGeometry(0.16, 0);
    for (let i = 0; i < islandSpecs.length; i++) {
      const [ix, iy, iz, scale] = islandSpecs[i];
      const islandGroup = new THREE.Group();
      islandGroup.position.set(ix, iy, iz);
      islandGroup.scale.setScalar(scale);

      const deck = new THREE.Mesh(islandDeckGeo, armorSteelMat);
      deck.castShadow = true;
      deck.receiveShadow = true;
      const underCone = new THREE.Mesh(islandConeGeo, armorDarkMat);
      underCone.rotation.x = Math.PI;
      underCone.position.y = -0.82;
      const neonMat = i % 2 === 0 ? centerNeonCyanMat : centerNeonVioletMat;
      const trim = new THREE.Mesh(islandTrimGeo, neonMat);
      trim.rotation.x = Math.PI / 2;
      trim.rotation.z = Math.PI / 8;
      trim.position.y = 0.08;

      const crystalCluster = createCyberCrystalCluster({
        frameMat: brightSteelMat,
        crystalMat: neonMat,
        accentMat: i % 2 === 0 ? centerNeonVioletMat : centerNeonCyanMat,
        scale: 0.92,
        shardCount: 5,
      });
      crystalCluster.position.y = 0.12;
      this.customAltarDisposers.push(() => disposeCyberProp(crystalCluster));

      const shard = new THREE.Mesh(satShardGeo, neonMat);
      shard.position.set(1.42, 0.55, 0);
      shard.scale.set(0.85, 1.45, 0.85);
      this.floatingShards.push(shard);

      islandGroup.add(deck, underCone, trim, crystalCluster, shard);
      this.altarGroup.add(islandGroup);
      this.floatingIslands.push({
        group: islandGroup,
        baseY: iy,
        phase: i * 1.15,
        bobSpeed: 1.35 + (i % 3) * 0.25,
      });
    }

    const pylonSpecs: ReadonlyArray<readonly [number, number, number]> = [
      [-6.8, -6.4, 0.55],
      [6.8, -6.4, -0.55],
      [-7.2, 0.2, 0.25],
      [7.2, 0.2, -0.25],
    ];
    const pylonShaftGeo = new THREE.CylinderGeometry(0.28, 0.42, 2.8, 8);
    const pylonCollarGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.18, 8);
    for (let i = 0; i < pylonSpecs.length; i++) {
      const [px, pz, rotY] = pylonSpecs[i];
      const pylonGroup = new THREE.Group();
      pylonGroup.position.set(px, -0.65, pz);
      pylonGroup.rotation.y = rotY;
      const neonMat = i % 2 === 0 ? centerNeonCyanMat : centerNeonVioletMat;
      const shaft = new THREE.Mesh(pylonShaftGeo, armorSteelMat);
      shaft.position.y = 1.4;
      const collar = new THREE.Mesh(pylonCollarGeo, brightSteelMat);
      collar.position.y = 2.4;
      const finial = createCyberMonolithForkFinial({
        frameMat: armorSteelMat,
        steelMat: brightSteelMat,
        coreMat: neonMat,
        scale: 1.35,
      });
      finial.position.y = 2.8;
      this.customAltarDisposers.push(() => disposeCyberProp(finial));
      pylonGroup.add(shaft, collar, finial);
      this.altarGroup.add(pylonGroup);
    }

    this.clockDial = createAltarClockDial(pedestalTargets);
    this.clockHand = createAltarClockHand();
    this.clockSubHand = createAltarSubHand();
    this.needleAngle = this.altarPedestals[0]?.needleAngle ?? Math.PI * 0.5;
    this.subHandAngle = this.needleAngle;
    this.clockHand.group.rotation.y = this.needleAngle;
    this.clockSubHand.rotation.y = this.subHandAngle;
    this.altarGroup.add(
      this.hellEye.root,
      this.clockDial.group,
      this.clockHand.group,
      this.clockSubHand,
      this.altarParticles.group
    );
  }

  public isSpinning(): boolean {
    return this.spinTimer > 0;
  }

  public cancelSpin(): void {
    this.spinTimer = 0;
    const cb = this.onSpinEnd;
    this.onSpinEnd = undefined;
    cb?.();
  }

  public triggerSpin(targetEnchantId: string, onComplete?: () => void): boolean {
    if (this.spinTimer > 0) return false;
    const idx = this.altarPedestals.findIndex((p) => p.id === targetEnchantId);
    this.spinTargetIndex = idx >= 0 ? idx : 0;
    const targetAngle = this.altarPedestals[this.spinTargetIndex]?.needleAngle ?? 0;
    const twoPi = Math.PI * 2;
    const curMod = ((this.needleAngle % twoPi) + twoPi) % twoPi;
    const tgtMod = ((targetAngle % twoPi) + twoPi) % twoPi;
    let cwDiff = curMod - tgtMod;
    if (cwDiff <= 0.05) cwDiff += twoPi;
    this.spinStartAngle = this.needleAngle;
    this.spinEndAngle = this.needleAngle - (twoPi * 3 + cwDiff);
    this.spinTimer = this.spinDuration;
    this.onSpinEnd = onComplete;
    this.activeHighlightIndex = -1;
    this.altarParticles.spawnBurst(0, 0.72, -2.4, '#c084fc', 36, 1.15);
    return true;
  }

  public update(
    dt: number,
    elapsed: number,
    mode: 'mine' | 'shop' | 'altar' | 'tower',
    camera?: THREE.Camera
  ): void {
    const safeDt = Math.min(Math.max(0, dt), 0.1);
    this.shopGroup.visible = mode === 'shop';
    this.altarGroup.visible = mode === 'altar';

    if (mode === 'shop') {
      this.cyberPlaza.update(safeDt, elapsed);
      for (let i = 0; i < this.shopEmblems.length; i++) {
        this.shopEmblems[i].updateTransform(safeDt, elapsed, false, false, camera);
      }
      this.updatePlazaWalkers(safeDt, elapsed, camera);
    }

    if (mode === 'altar') {
      const isSpinning = this.spinTimer > 0;
      const spinRatio = isSpinning ? this.spinTimer / this.spinDuration : 0;

      this.clockDial.gearRing.rotation.y = -elapsed * (isSpinning ? 4.2 : 0.7);
      if (this.clockDial.outerTrackRing) {
        this.clockDial.outerTrackRing.rotation.y = elapsed * (isSpinning ? 2.4 : 0.36);
      }
      this.clockDial.centerOrb.rotation.y = elapsed * (isSpinning ? 5.5 : 2.2);
      this.clockDial.centerOrb.position.y = 0.72 + Math.sin(elapsed * 2.6) * 0.06;

      if (isSpinning) {
        const prevHighlight = this.activeHighlightIndex;
        this.spinTimer = Math.max(0, this.spinTimer - dt);
        const progress = 1 - this.spinTimer / this.spinDuration;
        const ease = 1 - Math.pow(1 - progress, 3.1);
        this.needleAngle = this.spinStartAngle + (this.spinEndAngle - this.spinStartAngle) * ease;
        this.subHandAngle = this.needleAngle + (1 - ease) * Math.PI * 6;

        let bestIdx = 0;
        let bestDiff = Infinity;
        for (let i = 0; i < this.altarPedestals.length; i++) {
          const d = Math.abs(
            Math.atan2(
              Math.sin(this.needleAngle - this.altarPedestals[i].needleAngle),
              Math.cos(this.needleAngle - this.altarPedestals[i].needleAngle)
            )
          );
          if (d < bestDiff) {
            bestDiff = d;
            bestIdx = i;
          }
        }
        this.activeHighlightIndex = bestIdx;

        const passEnc = ENCHANTS[bestIdx] ?? ENCHANTS[0];
        if (bestIdx !== prevHighlight && this.altarPedestals[bestIdx]) {
          const hp = this.altarPedestals[bestIdx];
          this.altarParticles.spawnBurst(hp.worldX, hp.baseY + 0.35, hp.worldZ, passEnc.color, 18, 0.85);
        }

        const tipX = Math.cos(this.needleAngle) * 3.15;
        const tipZ = -2.4 - Math.sin(this.needleAngle) * 3.15;
        this.altarParticles.spawnNeedleTrail(tipX, 0.6, tipZ, passEnc.color, 5);

        if (this.spinTimer === 0 && this.spinTargetIndex >= 0) {
          this.activeHighlightIndex = this.spinTargetIndex;
          const winP = this.altarPedestals[this.spinTargetIndex];
          const winEnc = ENCHANTS[this.spinTargetIndex] ?? ENCHANTS[0];
          if (winP) {
            this.needleAngle = winP.needleAngle;
            this.subHandAngle = winP.needleAngle;
            this.hellEye.glanceAtWorldX(winP.worldX);
            this.altarParticles.spawnBurst(winP.worldX, winP.baseY + 0.45, winP.worldZ, winEnc.color, 85, 1.35);
            this.altarParticles.spawnBurst(0, 0.72, -2.4, winEnc.color, 45, 1.1);
            this.altarParticles.triggerWinShockwave(winP.worldX, winP.baseY, winP.worldZ, winEnc.color);
          }
          const cb = this.onSpinEnd;
          this.onSpinEnd = undefined;
          cb?.();
        }
      } else if (this.activeHighlightIndex < 0) {
        this.needleAngle -= dt * 0.42;
        this.subHandAngle += dt * 0.85;
      } else {
        this.subHandAngle = this.needleAngle + Math.sin(elapsed * 2.2) * 0.04;
      }

      const activeEnc = this.activeHighlightIndex >= 0 ? ENCHANTS[this.activeHighlightIndex] : undefined;
      const activeHex = activeEnc?.color ?? '#38bdf8';
      this.clockHand.group.rotation.y = this.needleAngle;
      this.clockSubHand.rotation.y = this.subHandAngle;
      this.clockHand.tipGlowMat.color.set(activeHex);
      this.clockHand.beamMat.color.set(activeHex);
      this.clockHand.beamMat.opacity = isSpinning
        ? 0.48
        : this.activeHighlightIndex >= 0
          ? 0.3 + Math.sin(elapsed * 4.5) * 0.08
          : 0.14;
      if (this.clockDial.skyBeamMat) {
        this.clockDial.skyBeamMat.color.set(activeHex);
        this.clockDial.skyBeamMat.opacity = isSpinning
          ? 0.22
          : 0.12 + Math.sin(elapsed * 3.2) * 0.04;
      }
      if (this.clockDial.outerRuneMat) {
        this.clockDial.outerRuneMat.color.set(activeHex);
        this.clockDial.outerRuneMat.opacity = isSpinning
          ? 0.78
          : 0.46 + Math.sin(elapsed * 2.8) * 0.1;
      }
      this.outerEllipseMat.color.set(activeHex);
      this.outerEllipseMat.opacity = isSpinning ? 0.56 : 0.28 + Math.sin(elapsed * 2.2) * 0.08;

      this.altarParticles.update(dt, elapsed, spinRatio, activeHex);

      const liftDamp = 1 - Math.exp(-Math.max(0.001, safeDt) * 12);
      const centerConduitOrigin = { x: 0, y: 0.16, z: -2.4 };
      for (let i = 0; i < this.altarPedestals.length; i++) {
        const p = this.altarPedestals[i];
        const isHi = i === this.activeHighlightIndex;
        const targetLift = isHi ? 0.38 : 0;
        p.curLift += (targetLift - p.curLift) * liftDamp;
        p.group.position.y = p.baseY + Math.sin(elapsed * 1.85 + i * 0.7) * 0.11 + p.curLift;
        p.ringMat.emissiveIntensity = isHi ? 2.25 : 0.98 + Math.sin(elapsed * 2.5 + i * 0.6) * 0.2;
        p.holoDiscMat.opacity = isHi ? 0.98 : 0.68;
        p.sigilMesh.rotation.z = elapsed * (isHi ? 0.95 : 0.32) + i * 0.5;
        p.sigilMat.opacity = isHi ? 0.95 : 0.54;
        p.auraVeilMat.uniforms.uTime.value = elapsed;
        p.auraVeilMat.uniforms.uOpacity.value = isHi ? 0.86 : 0.34;
        p.auraOuterVeilMat.uniforms.uTime.value = elapsed;
        p.auraOuterVeilMat.uniforms.uOpacity.value = isHi ? 0.52 : 0.2;
        p.particleMat.uniforms.uTime.value = elapsed;

        // Radial Energy Conduit & Traveling Energy Pulses from Center Clock to Podium
        p.conduitMat.opacity = isHi
          ? 0.72
          : isSpinning
            ? 0.38
            : 0.2 + Math.sin(elapsed * 2.4 + i * 0.7) * 0.06;
        const pulseSpeed = isHi ? 1.65 : isSpinning ? 1.15 : 0.55;
        const endY = p.group.position.y - 0.12;
        for (let k = 0; k < p.conduitPulses.length; k++) {
          const pulse = p.conduitPulses[k];
          const t = (elapsed * pulseSpeed + k / p.conduitPulses.length + i * 0.13) % 1;
          pulse.position.set(
            centerConduitOrigin.x + (p.worldX - centerConduitOrigin.x) * t,
            centerConduitOrigin.y + (endY - centerConduitOrigin.y) * t,
            centerConduitOrigin.z + (p.worldZ - centerConduitOrigin.z) * t
          );
          const edgeFade = Math.sin(t * Math.PI);
          pulse.scale.setScalar((isHi ? 1.45 : 0.92) * (0.45 + edgeFade * 0.75));
        }

        p.billboard.updateTransform(dt, elapsed, isHi, isSpinning, camera);
      }

      for (let i = 0; i < this.floatingIslands.length; i++) {
        const isl = this.floatingIslands[i];
        isl.group.position.y = isl.baseY + Math.sin(elapsed * isl.bobSpeed + isl.phase) * 0.22;
      }

      for (let i = 0; i < this.floatingShards.length; i++) {
        this.floatingShards[i].rotation.y = elapsed * 0.9 + i;
        this.floatingShards[i].position.y = 0.55 + Math.sin(elapsed * 2.4 + i) * 0.12;
      }

      this.hellEye.update(dt, elapsed, isSpinning, this.needleAngle);
    }
  }

  public getShopAnchors(
    camera: THREE.Camera,
    width: number,
    height: number,
    projVec: THREE.Vector3
  ): ShopStationAnchor[] {
    return this.stationPositions.map((st) => {
      projVec.copy(st.pos).project(camera);
      const visible = projVec.z >= -1 && projVec.z <= 1;
      return {
        id: st.id,
        title: st.title,
        subtitle: st.subtitle,
        x: (projVec.x * 0.5 + 0.5) * width,
        y: (-projVec.y * 0.5 + 0.5) * height,
        visible,
      };
    });
  }

  public getAltarAnchors(
    camera: THREE.Camera,
    width: number,
    height: number,
    projVec: THREE.Vector3
  ): AltarPedestalAnchor[] {
    return this.altarPedestals.map((p, idx) => {
      const enc = ENCHANTS[idx];
      const highlighted = idx === this.activeHighlightIndex;
      projVec
        .set(p.worldX, p.group.position.y + (highlighted ? 2.34 : 1.86), p.worldZ)
        .project(camera);
      const visible = projVec.z >= -1 && projVec.z <= 1;
      return {
        id: enc.id,
        name: enc.name,
        chancePct: enc.chancePct,
        color: enc.color,
        x: (projVec.x * 0.5 + 0.5) * width,
        y: (-projVec.y * 0.5 + 0.5) * height,
        visible,
        highlighted,
      };
    });
  }

  public syncPlazaMiners(chibiIds: (string | null)[]): void {
    const activeKeys = new Set<string>();
    for (let i = 0; i < chibiIds.length; i++) {
      const id = chibiIds[i];
      if (!id) continue;
      const def = getChibiById(id);
      if (!def) continue;
      const key = `${i}:${id}`;
      activeKeys.add(key);

      if (!this.plazaWalkers.has(key)) {
        const sprite = new ChibiSprite3D(def, 1.55);
        const startWp = PLAZA_WAYPOINTS[i % PLAZA_WAYPOINTS.length];
        const nextWp = PLAZA_WAYPOINTS[(i + 2) % PLAZA_WAYPOINTS.length];
        const startX = startWp.x + ((i % 3) - 1) * 0.7;
        const startZ = startWp.z + (i % 2 === 0 ? 0.5 : -0.5);
        sprite.group.position.set(startX, 0.08, startZ);
        sprite.setAnimState('dash');
        this.shopGroup.add(sprite.group);

        this.plazaWalkers.set(key, {
          slotKey: key,
          chibiId: id,
          sprite,
          x: startX,
          z: startZ,
          targetX: nextWp.x + (Math.random() - 0.5) * 1.1,
          targetZ: nextWp.z + (Math.random() - 0.5) * 1.1,
          targetShop: nextWp.shopId,
          pauseTimer: 0,
          bubbleText: null,
          bubbleTimer: 0,
          nextBubbleCooldown: 1.5 + i * 1.3 + Math.random() * 2.5,
          facingRight: true,
        });
      }
    }

    for (const [key, walker] of this.plazaWalkers.entries()) {
      if (!activeKeys.has(key)) {
        this.shopGroup.remove(walker.sprite.group);
        walker.sprite.dispose();
        this.plazaWalkers.delete(key);
      }
    }
  }

  private pickBubbleLine(shopId: ShopStationId | 'walk'): string {
    const pool = PLAZA_BUBBLE_LINES[shopId];
    return pool[Math.floor(Math.random() * pool.length)] ?? 'So cool!';
  }

  private updatePlazaWalkers(dt: number, elapsed: number, camera?: THREE.Camera): void {
    const walkSpeed = 2.05;
    for (const w of this.plazaWalkers.values()) {
      if (w.bubbleTimer > 0) {
        w.bubbleTimer = Math.max(0, w.bubbleTimer - dt);
        if (w.bubbleTimer <= 0) {
          w.bubbleText = null;
        }
      }
      if (w.nextBubbleCooldown > 0) {
        w.nextBubbleCooldown -= dt;
      }

      if (w.pauseTimer > 0) {
        w.pauseTimer -= dt;
        w.sprite.setAnimState('idle');
        if (w.pauseTimer <= 0) {
          const next = PLAZA_WAYPOINTS[Math.floor(Math.random() * PLAZA_WAYPOINTS.length)];
          w.targetX = next.x + (Math.random() - 0.5) * 1.3;
          w.targetZ = next.z + (Math.random() - 0.5) * 1.3;
          w.targetShop = next.shopId;
          w.sprite.setAnimState('dash');
        }
      } else {
        const dx = w.targetX - w.x;
        const dz = w.targetZ - w.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.2) {
          w.pauseTimer = 2.0 + Math.random() * 2.4;
          w.sprite.setAnimState('idle');
          if (w.nextBubbleCooldown <= 0) {
            w.bubbleText = this.pickBubbleLine(w.targetShop);
            w.bubbleTimer = 3.2;
            w.nextBubbleCooldown = 5.5 + Math.random() * 4.5;
          }
        } else {
          const step = Math.min(dist, walkSpeed * dt);
          const vx = (dx / dist) * step;
          const vz = (dz / dist) * step;
          w.x += vx;
          w.z += vz;
          const screenDx = camera ? camera.matrixWorld.elements[0] * dx + camera.matrixWorld.elements[2] * dz : dx;
          if (Math.abs(screenDx) > 0.04) {
            w.facingRight = screenDx >= 0;
          }
          w.sprite.setAnimState('dash');
          if (w.nextBubbleCooldown <= 0 && Math.random() < dt * 0.25) {
            w.bubbleText = this.pickBubbleLine('walk');
            w.bubbleTimer = 2.9;
            w.nextBubbleCooldown = 6.0 + Math.random() * 4.5;
          }
        }
      }

      w.sprite.group.position.set(w.x, 0.08, w.z);
      w.sprite.setFacing(w.facingRight ? 1 : -1);
      if (camera) {
        w.sprite.update(dt, elapsed, camera);
      }
    }
  }

  public getPlazaBubbleAnchors(
    camera: THREE.Camera,
    width: number,
    height: number
  ): ShopChibiBubbleAnchor[] {
    const out: ShopChibiBubbleAnchor[] = [];
    for (const w of this.plazaWalkers.values()) {
      if (!w.bubbleText || w.bubbleTimer <= 0) continue;
      this.plazaProjVec.set(w.x, 2.02, w.z).project(camera);
      if (this.plazaProjVec.z <= -1 || this.plazaProjVec.z >= 1) continue;
      out.push({
        id: w.slotKey,
        x: (this.plazaProjVec.x * 0.5 + 0.5) * width,
        y: (-this.plazaProjVec.y * 0.5 + 0.5) * height,
        text: w.bubbleText,
      });
    }
    return out;
  }

  public dispose(): void {
    this.cyberPlaza.dispose();
    for (const walker of this.plazaWalkers.values()) {
      walker.sprite.dispose();
    }
    this.plazaWalkers.clear();
    for (const tex of this.ownedAltarTextures) {
      tex.dispose();
    }
    this.ownedAltarTextures.length = 0;
    for (const disposeFn of this.customAltarDisposers) {
      disposeFn();
    }
    this.customAltarDisposers.length = 0;

    const disposedGeos = new Set<THREE.BufferGeometry>();
    const disposedMats = new Set<THREE.Material>();
    for (const root of [this.shopGroup, this.altarGroup]) {
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Points)) return;
        if (!disposedGeos.has(child.geometry)) {
          disposedGeos.add(child.geometry);
          child.geometry.dispose();
        }
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (disposedMats.has(mat)) continue;
          disposedMats.add(mat);
          mat.dispose();
        }
      });
    }
  }
}
