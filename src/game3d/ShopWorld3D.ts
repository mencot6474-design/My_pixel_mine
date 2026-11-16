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
import { mountGlbProp } from './GlbAssets3D';
import { HellAltarEyeController } from './HellAltarEye3D';

export type ShopStationId = 'pickaxe' | 'sell' | 'gems' | 'altar' | 'tower';

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
  ringMat: THREE.MeshBasicMaterial;
  prop: THREE.Object3D;
  billboard: EnchantBillboard2D;
  baseY: number;
  needleAngle: number;
  worldX: number;
  worldZ: number;
  anchorLocal: THREE.Vector3;
}

export class ShopWorld3D {
  public readonly shopGroup = new THREE.Group();
  public readonly altarGroup = new THREE.Group();
  public readonly shopClickables: THREE.Object3D[] = [];

  private readonly shopEmblems: ArtBillboard2D[] = [];
  private readonly plazaCrystals: THREE.Mesh[] = [];
  private readonly altarPedestals: AltarPedestalEntry[] = [];
  private readonly floatingShards: THREE.Mesh[] = [];
  private readonly altarParticles = new AltarParticleSystem();
  private readonly hellEye = new HellAltarEyeController();
  private clockDial!: AltarClockDialParts;
  private clockHand!: AltarClockHandParts;
  private clockSubHand!: THREE.Group;

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
    { id: 'pickaxe', title: 'Pickaxes!', subtitle: 'Buy Pickaxes', pos: new THREE.Vector3(-11.2, 5.95, -3.6) },
    { id: 'sell', title: 'Sell Items!', subtitle: 'Sell Ores & Chibi', pos: new THREE.Vector3(-6.95, 5.15, 2.8) },
    { id: 'gems', title: 'Gem Shop!', subtitle: 'Elixirs & Potions', pos: new THREE.Vector3(11.0, 8.15, -3.6) },
    { id: 'altar', title: 'Enchant Altar', subtitle: 'Spin Enchants', pos: new THREE.Vector3(0, 4.15, -0.5) },
    { id: 'tower', title: 'Gem Tower', subtitle: 'Grind Gems & Dice', pos: new THREE.Vector3(0, 9.75, -11.4) },
  ];

  constructor() {
    this.shopGroup.visible = false;
    this.altarGroup.visible = false;
    this.buildShopPlaza();
    this.buildEnchantAltar();
  }

  private buildShopPlaza(): void {
    this.buildPlazaTerrainAndRoads();
    this.buildCentralAltarShrine();
    this.buildPickaxeBlacksmith();
    this.buildSellMarketPavilion();
    this.buildGemEmporium();
    this.buildGemTowerCitadel();
  }

  private buildPlazaTerrainAndRoads(): void {
    // 1. Multi-tier Floating Highland Island Base (Stone Cliff Skirt + Lush Grass Wings + Paved Plaza)
    const lowerPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(37.6, 2.2, 27.6),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88 })
    );
    lowerPlinth.position.set(0, -2.5, -2);
    this.shopGroup.add(lowerPlinth);

    const cliffRim = new THREE.Mesh(
      new THREE.BoxGeometry(42.4, 1.4, 32.4),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.84 })
    );
    cliffRim.position.set(0, -0.7, -2);
    cliffRim.receiveShadow = true;
    this.shopGroup.add(cliffRim);

    const plazaFloor = new THREE.Mesh(
      new THREE.BoxGeometry(41.2, 0.24, 31.2),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.78 })
    );
    plazaFloor.position.set(0, 0.02, -2);
    plazaFloor.receiveShadow = true;
    this.shopGroup.add(plazaFloor);

    // Grassy town lawns around outer wings matching Kenney stylized olive-emerald turf
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x4d9e58, roughness: 0.92 });
    for (const [lx, lz, lw, ld] of [
      [-14.2, -9.8, 12.2, 14.8],
      [14.2, -9.8, 12.2, 14.8],
      [-14.2, 6.2, 12.2, 13.8],
      [14.2, 6.2, 12.2, 13.8],
    ]) {
      const lawn = new THREE.Mesh(new THREE.BoxGeometry(lw, 0.08, ld), lawnMat);
      lawn.position.set(lx, 0.14, lz);
      lawn.receiveShadow = true;
      this.shopGroup.add(lawn);
    }

    // Subtle stone perimeter border curb
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.65 });
    for (const [bx, bz, bw, bd] of [
      [0, -17.5, 41.2, 0.55],
      [-20.4, -2.0, 0.55, 31.2],
      [20.4, -2.0, 0.55, 31.2],
    ]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.22, bd), borderMat);
      curb.position.set(bx, 0.14, bz);
      this.shopGroup.add(curb);
    }

    // Kenney Cobblestone Road Tiles along the main cross avenues & front promenade
    const roadScale = 2.0;
    for (let x = -12; x <= 12; x += 2) {
      mountGlbProp('/models/fantasy-town/road.glb', this.shopGroup, {
        position: [x, 0.14, -3.6],
        uniformScale: roadScale,
      });
    }
    for (let z = -6; z <= 10; z += 2) {
      if (Math.abs(z + 0.5) < 2.2) continue;
      mountGlbProp('/models/fantasy-town/road.glb', this.shopGroup, {
        position: [0, 0.14, z],
        uniformScale: roadScale,
      });
    }
    for (let x = -10; x <= 10; x += 2) {
      mountGlbProp('/models/fantasy-town/road.glb', this.shopGroup, {
        position: [x, 0.14, 5.2],
        uniformScale: roadScale,
      });
    }

    // Kenney Fantasy Town Street Lanterns framing the central plaza promenade
    for (const [lx, lz] of [
      [-4.6, 2.2],
      [4.6, 2.2],
      [-4.6, -5.0],
      [4.6, -5.0],
      [-4.6, 7.0],
      [4.6, 7.0],
    ]) {
      mountGlbProp('/models/fantasy-town/lantern.glb', this.shopGroup, {
        position: [lx, 0.14, lz],
        targetHeight: 2.8,
      });
    }

    // Front Plaza Stone Fence & Gate Opening
    for (const fx of [-13.5, -11.0, -8.5, -6.0, 6.0, 8.5, 11.0, 13.5]) {
      mountGlbProp('/models/fantasy-town/fence.glb', this.shopGroup, {
        position: [fx, 0.14, 13.15],
        rotationY: Math.PI / 2,
        targetHeight: 0.95,
      });
    }
    mountGlbProp('/models/fantasy-town/fence-gate.glb', this.shopGroup, {
      position: [0, 0.14, 13.15],
      rotationY: Math.PI / 2,
      targetHeight: 1.35,
    });

    // Kenney Hedges framing the Central Crosswalk Gardens
    for (const [hx, hz, rot] of [
      [-6.8, -6.0, 0],
      [6.8, -6.0, 0],
      [-5.6, 8.8, 0],
      [5.6, 8.8, 0],
    ]) {
      mountGlbProp('/models/fantasy-town/hedge.glb', this.shopGroup, {
        position: [hx, 0.16, hz],
        rotationY: rot,
        targetHeight: 0.85,
      });
    }

    // 4 Corner Raised Stone & Grass Gardens with Kenney Trees, Rocks, Grass Tufts & Flowers
    const planterCurbMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.65 });
    const turfMat = new THREE.MeshStandardMaterial({ color: 0x3b8c47, roughness: 0.88 });
    for (const [px, pz, treeModel] of [
      [-10.4, -14.2, '/models/fantasy-town/tree-high-round.glb'],
      [10.4, -14.2, '/models/fantasy-town/tree-high.glb'],
      [-17.4, 10.6, '/models/fantasy-town/tree-high-round.glb'],
      [17.4, 10.6, '/models/fantasy-town/tree-crooked.glb'],
    ] as Array<[number, number, string]>) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.34, 5.2), planterCurbMat);
      curb.position.set(px, 0.2, pz);
      curb.receiveShadow = true;
      this.shopGroup.add(curb);

      const turf = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.16, 4.5), turfMat);
      turf.position.set(px, 0.34, pz);
      turf.receiveShadow = true;
      this.shopGroup.add(turf);

      mountGlbProp(treeModel, this.shopGroup, {
        position: [px, 0.42, pz],
        targetHeight: 3.9,
      });
      mountGlbProp('/models/nature/plant_bushLarge.glb', this.shopGroup, {
        position: [px + (px < 0 ? 1.35 : -1.35), 0.42, pz + 1.2],
        targetHeight: 0.78,
      });
      mountGlbProp('/models/nature/grass_large.glb', this.shopGroup, {
        position: [px + (px < 0 ? -1.3 : 1.3), 0.42, pz - 1.1],
        targetHeight: 0.55,
      });
      mountGlbProp('/models/nature/flower_yellowA.glb', this.shopGroup, {
        position: [px - (px < 0 ? 1.25 : -1.25), 0.42, pz + 1.35],
        targetHeight: 0.48,
      });
      mountGlbProp('/models/nature/rock_smallA.glb', this.shopGroup, {
        position: [px + (px < 0 ? 1.2 : -1.2), 0.42, pz - 1.3],
        targetHeight: 0.52,
      });
    }

    // Perimeter Cliff Rocks, Grass Tufts & Pine Clusters around Island Flanks (Tanah, Rumput, Batu)
    for (const [rx, rz, model, h, rot] of [
      [-18.8, -14.8, '/models/fantasy-town/rock-large.glb', 2.4, 0.3],
      [-16.4, -15.6, '/models/nature/rock_largeA.glb', 1.4, -0.5],
      [18.8, -14.8, '/models/fantasy-town/rock-wide.glb', 2.2, -0.4],
      [16.2, -15.6, '/models/nature/rock_largeB.glb', 1.3, 0.8],
      [-18.8, 3.6, '/models/nature/stone_largeA.glb', 1.15, 0.4],
      [-17.8, -8.2, '/models/nature/tree_pineTallA.glb', 4.0, 0.2],
      [17.8, -8.2, '/models/nature/tree_pineTallA.glb', 4.0, -0.3],
      [-16.5, 6.2, '/models/nature/grass_large.glb', 0.65, 0.1],
      [-14.0, 8.2, '/models/nature/grass.glb', 0.55, 0.9],
      [16.5, 6.2, '/models/nature/grass_large.glb', 0.65, 0.6],
      [14.2, -9.2, '/models/nature/grass.glb', 0.55, -0.4],
      [-14.2, -9.2, '/models/nature/grass.glb', 0.55, 0.5],
      [-14.5, 9.5, '/models/nature/flower_purpleA.glb', 0.5, 0.2],
      [14.5, 9.5, '/models/nature/flower_yellowA.glb', 0.5, -0.2],
    ] as Array<[number, number, string, number, number]>) {
      mountGlbProp(model, this.shopGroup, {
        position: [rx, 0.18, rz],
        rotationY: rot,
        targetHeight: h,
      });
    }

    // Two Scenic Outpost Crystal Islets connected with Bridges (Left & Right)
    for (const side of [-1, 1]) {
      const bx = side * 22.8;
      mountGlbProp('/models/nature/bridge_stoneRound.glb', this.shopGroup, {
        position: [bx, -0.15, -2.2],
        rotationY: Math.PI / 2,
        targetWidth: 3.4,
      });

      const isletX = side * 28.4;
      const islet = new THREE.Mesh(
        new THREE.CylinderGeometry(4.8, 2.6, 2.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, flatShading: true })
      );
      islet.position.set(isletX, -1.0, -2.2);
      this.shopGroup.add(islet);

      const isletTop = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.7, 0.22, 12), turfMat);
      isletTop.position.set(isletX, 0.22, -2.2);
      this.shopGroup.add(isletTop);

      mountGlbProp('/models/fantasy-town/tree-high-round.glb', this.shopGroup, {
        position: [isletX + side * 1.4, 0.32, -3.5],
        targetHeight: 3.8,
      });
      mountGlbProp('/models/nature/grass_large.glb', this.shopGroup, {
        position: [isletX - side * 1.1, 0.32, -3.2],
        targetHeight: 0.65,
      });
      mountGlbProp('/models/nature/rock_largeA.glb', this.shopGroup, {
        position: [isletX - side * 1.3, 0.32, -1.2],
        targetWidth: 2.0,
      });
      mountGlbProp('/models/nature/stone_largeB.glb', this.shopGroup, {
        position: [isletX + side * 1.2, 0.32, -0.8],
        targetWidth: 1.5,
      });

      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.9, 0),
        new THREE.MeshStandardMaterial({
          color: side < 0 ? 0x38bdf8 : 0xe879f9,
          emissive: side < 0 ? 0x0284c7 : 0xa855f7,
          emissiveIntensity: 0.55,
          roughness: 0.15,
        })
      );
      shard.position.set(isletX, 2.1, -2.2);
      this.shopGroup.add(shard);
      this.plazaCrystals.push(shard);
    }

    // Front-Right Decorative Cargo & Ore Train Depot (balances Sell Pavilion on Front-Left)
    mountGlbProp('/models/nature/platform_stone.glb', this.shopGroup, {
      position: [9.2, 0.14, 5.4],
      targetWidth: 6.8,
    });
    mountGlbProp('/models/train/track-detailed.glb', this.shopGroup, {
      position: [9.4, 0.28, 5.4],
      rotationY: Math.PI / 2,
      targetWidth: 4.2,
    });
    mountGlbProp('/models/train/train-carriage-coal.glb', this.shopGroup, {
      position: [9.4, 0.38, 5.4],
      rotationY: Math.PI / 2,
      targetHeight: 2.0,
    });
    mountGlbProp('/models/survival/barrel.glb', this.shopGroup, {
      position: [5.8, 0.18, 5.9],
      targetHeight: 0.95,
    });
    mountGlbProp('/models/platformer/crate-item.glb', this.shopGroup, {
      position: [6.75, 0.18, 6.1],
      targetHeight: 0.95,
    });
  }

  private buildCentralAltarShrine(): void {
    // Central Plaza Medallion upgraded with Kenney Fountain Shrine + 4 Corner Pillars (x=0, z=-0.5)
    mountGlbProp('/models/fantasy-town/fountain-round-detail.glb', this.shopGroup, {
      position: [0, 0.14, -0.5],
      targetWidth: 6.4,
    });

    const medRing = new THREE.Mesh(
      new THREE.RingGeometry(2.55, 2.95, 36),
      new THREE.MeshBasicMaterial({ color: 0xd946ef, side: THREE.DoubleSide })
    );
    medRing.rotation.x = -Math.PI / 2;
    medRing.position.set(0, 0.22, -0.5);
    this.shopGroup.add(medRing);

    for (const [cx, cz] of [
      [-2.5, -3.0],
      [2.5, -3.0],
      [-2.5, 2.0],
      [2.5, 2.0],
    ]) {
      mountGlbProp('/models/mini-dungeon/column.glb', this.shopGroup, {
        position: [cx, 0.14, cz],
        targetHeight: 1.85,
      });
    }

    const altarEmblem = this.addShopEmblem('/hud/enchant.png', '#e879f9', 0, 2.7, -0.5, 1.55, 2.5);
    void altarEmblem;

    const altarHit = this.createHitbox(0, 1.55, -0.5, 5.8, 3.0, 5.8, 'shop-altar');
    this.shopGroup.add(altarHit);
    this.shopClickables.push(altarHit);
  }

  private buildPickaxeBlacksmith(): void {
    // === 1. PICKAXE BLACKSMITH WORKSHOP (Left Wing: x=-11.2, z=-3.6) ===
    const cx = -11.2;
    const cz = -3.6;
    const u = 1.95; // 2x1 modular Kenney building = 3.9 wide x 1.95 deep
    const baseY = 0.24;

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.2, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72 })
    );
    pad.position.set(cx, 0.14, cz + 0.3);
    pad.receiveShadow = true;
    this.shopGroup.add(pad);

    // Front wooden porch deck
    for (const dx of [-u * 0.5, u * 0.5]) {
      mountGlbProp('/models/fantasy-town/planks.glb', this.shopGroup, {
        position: [cx + dx, baseY, cz + u * 0.92],
        uniformScale: u,
      });
    }

    // Walls (Front faces +Z via -PI/2; Back faces -Z via +PI/2; Sides face +-X)
    mountGlbProp('/models/fantasy-town/wall-doorway-square.glb', this.shopGroup, {
      position: [cx - u * 0.5, baseY, cz + u * 0.45],
      rotationY: -Math.PI / 2,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/wall-window-stone.glb', this.shopGroup, {
      position: [cx + u * 0.5, baseY, cz + u * 0.45],
      rotationY: -Math.PI / 2,
      uniformScale: u,
    });
    for (const dx of [-u * 0.5, u * 0.5]) {
      mountGlbProp('/models/fantasy-town/wall-wood.glb', this.shopGroup, {
        position: [cx + dx, baseY, cz - u * 0.45],
        rotationY: Math.PI / 2,
        uniformScale: u,
      });
    }
    mountGlbProp('/models/fantasy-town/wall-wood-detail-cross.glb', this.shopGroup, {
      position: [cx - u * 0.95, baseY, cz],
      rotationY: Math.PI,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/wall-wood-detail-cross.glb', this.shopGroup, {
      position: [cx + u * 0.95, baseY, cz],
      rotationY: 0,
      uniformScale: u,
    });

    // Corner stone pillars sealing the 2x1 shell
    for (const [px, pz] of [
      [cx - u * 0.96, cz - u * 0.46],
      [cx + u * 0.96, cz - u * 0.46],
      [cx - u * 0.96, cz + u * 0.46],
      [cx + u * 0.96, cz + u * 0.46],
    ]) {
      mountGlbProp('/models/fantasy-town/pillar-stone.glb', this.shopGroup, {
        position: [px, baseY, pz],
        uniformScale: u,
      });
    }

    // Watertight 2x1 Pitched Roof sitting flush on top of the walls (y = baseY + u)
    const roofY = baseY + u;
    mountGlbProp('/models/fantasy-town/roof-gable-end.glb', this.shopGroup, {
      position: [cx - u * 0.5, roofY, cz],
      rotationY: Math.PI,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/roof-gable-end.glb', this.shopGroup, {
      position: [cx + u * 0.5, roofY, cz],
      rotationY: 0,
      uniformScale: u,
    });

    // Stone Chimney stack on the left forge flank
    mountGlbProp('/models/fantasy-town/chimney-base.glb', this.shopGroup, {
      position: [cx - u * 1.08, baseY, cz - 0.1],
      rotationY: Math.PI,
      targetHeight: 1.45,
    });
    mountGlbProp('/models/fantasy-town/chimney.glb', this.shopGroup, {
      position: [cx - u * 1.08, baseY + 1.45, cz - 0.1],
      rotationY: Math.PI,
      targetHeight: 1.75,
    });
    mountGlbProp('/models/fantasy-town/chimney-top.glb', this.shopGroup, {
      position: [cx - u * 1.08, baseY + 3.2, cz - 0.1],
      rotationY: Math.PI,
      targetHeight: 0.75,
    });

    // Front Porch Awning + Blacksmith Anvil, Pickaxe & Props
    mountGlbProp('/models/fantasy-town/overhang.glb', this.shopGroup, {
      position: [cx + u * 0.5, baseY + 1.18, cz + u * 0.78],
      rotationY: -Math.PI / 2,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/banner-red.glb', this.shopGroup, {
      position: [cx - u * 0.85, baseY + 0.9, cz + u * 0.56],
      rotationY: -Math.PI / 2,
      targetHeight: 1.25,
    });
    mountGlbProp('/models/survival/workbench-anvil.glb', this.shopGroup, {
      position: [cx - 0.85, baseY + 0.04, cz + 1.65],
      rotationY: 0.25,
      targetHeight: 0.98,
    });
    mountGlbProp('/models/survival/tool-pickaxe-upgraded.glb', this.shopGroup, {
      position: [cx + 0.85, baseY + 0.04, cz + 1.65],
      rotationY: -0.3,
      targetHeight: 1.05,
    });
    mountGlbProp('/models/survival/barrel.glb', this.shopGroup, {
      position: [cx + 1.75, baseY + 0.04, cz + 1.45],
      targetHeight: 0.9,
    });

    this.addShopEmblem('/pickaxes/sunwheel.png', '#38bdf8', cx, 4.7, cz, 1.55, 0);

    const pickHit = this.createHitbox(cx, 2.2, cz, 5.4, 4.6, 4.6, 'shop-pickaxe');
    this.shopGroup.add(pickHit);
    this.shopClickables.push(pickHit);
  }

  private buildSellMarketPavilion(): void {
    // === 2. SELL MARKET PAVILION (Front-Left Courtyard: x=-6.95, z=2.8) ===
    const sx = -6.95;
    const sz = 2.8;
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.2, 4.2),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
    );
    pad.position.set(sx, 0.14, sz);
    pad.receiveShadow = true;
    this.shopGroup.add(pad);

    // Twin Kenney Market Stalls facing +Z
    mountGlbProp('/models/fantasy-town/stall-green.glb', this.shopGroup, {
      position: [sx - 1.25, 0.24, sz - 0.15],
      rotationY: Math.PI / 2,
      targetHeight: 2.75,
    });
    mountGlbProp('/models/fantasy-town/stall-red.glb', this.shopGroup, {
      position: [sx + 1.25, 0.24, sz - 0.15],
      rotationY: Math.PI / 2,
      targetHeight: 2.75,
    });
    mountGlbProp('/models/fantasy-town/cart-high.glb', this.shopGroup, {
      position: [sx - 3.35, 0.16, sz + 0.55],
      rotationY: 0.55,
      targetHeight: 1.4,
    });
    mountGlbProp('/models/fantasy-town/stall-bench.glb', this.shopGroup, {
      position: [sx + 0.2, 0.24, sz + 1.35],
      rotationY: Math.PI / 2,
      targetHeight: 0.52,
    });
    mountGlbProp('/models/platformer/crate-item.glb', this.shopGroup, {
      position: [sx - 1.35, 0.24, sz + 1.15],
      targetHeight: 0.85,
    });
    mountGlbProp('/models/mini-dungeon/chest.glb', this.shopGroup, {
      position: [sx + 1.45, 0.24, sz + 1.15],
      rotationY: -0.35,
      targetHeight: 0.75,
    });
    mountGlbProp('/models/platformer/coin-gold.glb', this.shopGroup, {
      position: [sx - 1.35, 1.09, sz + 1.15],
      targetHeight: 0.65,
    });

    this.addShopEmblem('/hud/trade.png', '#4ade80', sx, 4.05, sz, 1.48, 1.0);

    const sellHit = this.createHitbox(sx, 2.1, sz, 5.6, 4.4, 4.4, 'shop-sell');
    this.shopGroup.add(sellHit);
    this.shopClickables.push(sellHit);
  }

  private buildGemEmporium(): void {
    // === 3. GEM & POTION EMPORIUM (Right Wing: x=11.0, z=-3.6 — 2-Story Arcane Shop) ===
    const gx = 11.0;
    const gz = -3.6;
    const u = 1.9;
    const baseY = 0.24;

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.2, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.58 })
    );
    pad.position.set(gx, 0.14, gz + 0.3);
    pad.receiveShadow = true;
    this.shopGroup.add(pad);

    // Left 1-story Counter Wing + Right 2-story Arcane Tower Bay
    const wingX = gx - u * 0.5;
    const towerX = gx + u * 0.5;

    // Ground Floor Walls
    mountGlbProp('/models/fantasy-town/wall-window-round.glb', this.shopGroup, {
      position: [wingX, baseY, gz + u * 0.45],
      rotationY: -Math.PI / 2,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/wall-doorway-round.glb', this.shopGroup, {
      position: [towerX, baseY, gz + u * 0.45],
      rotationY: -Math.PI / 2,
      uniformScale: u,
    });
    for (const bx of [wingX, towerX]) {
      mountGlbProp('/models/fantasy-town/wall.glb', this.shopGroup, {
        position: [bx, baseY, gz - u * 0.45],
        rotationY: Math.PI / 2,
        uniformScale: u,
      });
    }
    mountGlbProp('/models/fantasy-town/wall-wood-detail-diagonal.glb', this.shopGroup, {
      position: [wingX - u * 0.45, baseY, gz],
      rotationY: Math.PI,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/wall-wood-detail-diagonal.glb', this.shopGroup, {
      position: [towerX + u * 0.45, baseY, gz],
      rotationY: 0,
      uniformScale: u,
    });
    for (const [px, pz] of [
      [wingX - u * 0.46, gz - u * 0.46],
      [wingX - u * 0.46, gz + u * 0.46],
      [towerX + u * 0.46, gz - u * 0.46],
      [towerX + u * 0.46, gz + u * 0.46],
    ]) {
      mountGlbProp('/models/fantasy-town/pillar-stone.glb', this.shopGroup, {
        position: [px, baseY, pz],
        uniformScale: u,
      });
    }

    // Wing Gable Roof flush on 1st story (y = baseY + u)
    const floor2Y = baseY + u;
    mountGlbProp('/models/fantasy-town/roof-gable-end.glb', this.shopGroup, {
      position: [wingX, floor2Y, gz],
      rotationY: Math.PI,
      uniformScale: u,
    });

    // Second Story Arcane Tower Bay (at towerX, y = floor2Y)
    mountGlbProp('/models/fantasy-town/wall-wood-window-round.glb', this.shopGroup, {
      position: [towerX, floor2Y, gz + u * 0.45],
      rotationY: -Math.PI / 2,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/wall-wood.glb', this.shopGroup, {
      position: [towerX, floor2Y, gz - u * 0.45],
      rotationY: Math.PI / 2,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/wall-wood-detail-cross.glb', this.shopGroup, {
      position: [towerX - u * 0.45, floor2Y, gz],
      rotationY: Math.PI,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/wall-wood-detail-cross.glb', this.shopGroup, {
      position: [towerX + u * 0.45, floor2Y, gz],
      rotationY: 0,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/roof-high-point.glb', this.shopGroup, {
      position: [towerX, floor2Y + u, gz],
      uniformScale: u,
    });

    // Front Potion Display Table + Glowing Elixirs + Jewel
    mountGlbProp('/models/fantasy-town/overhang.glb', this.shopGroup, {
      position: [wingX, baseY + 0.45, gz + u * 0.72],
      rotationY: -Math.PI / 2,
      uniformScale: u,
    });
    mountGlbProp('/models/fantasy-town/stall.glb', this.shopGroup, {
      position: [wingX, baseY, gz + 1.5],
      rotationY: Math.PI / 2,
      targetHeight: 0.68,
    });
    const bottleColors = [0xf97316, 0xfacc15, 0x22c55e, 0x06b6d4, 0xec4899];
    for (let i = 0; i < bottleColors.length; i++) {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.14, 0.34, 10),
        new THREE.MeshStandardMaterial({
          color: bottleColors[i],
          emissive: bottleColors[i],
          emissiveIntensity: 0.45,
          roughness: 0.15,
        })
      );
      bottle.position.set(wingX - 0.6 + i * 0.3, baseY + 0.85, gz + 1.5);
      this.shopGroup.add(bottle);
    }
    mountGlbProp('/models/platformer/crate-item.glb', this.shopGroup, {
      position: [towerX + 0.35, baseY, gz + 1.55],
      targetHeight: 0.48,
    });
    mountGlbProp('/models/platformer/jewel.glb', this.shopGroup, {
      position: [towerX + 0.35, baseY + 0.48, gz + 1.55],
      targetHeight: 0.72,
    });

    this.addShopEmblem('/hud/gem.png', '#f472b6', gx, 6.85, gz, 1.55, 1.8);

    const gemHit = this.createHitbox(gx, 2.3, gz, 5.4, 5.0, 4.6, 'shop-gems');
    this.shopGroup.add(gemHit);
    this.shopClickables.push(gemHit);
  }

  private buildGemTowerCitadel(): void {
    // === 4. GEM TOWER CITADEL (Elevated Rear Terrace: x=0, z=-11.4 — Kenney Castle Kit) ===
    const purpleTrimMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.35, metalness: 0.2 });
    const slateTerraceMat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.48, metalness: 0.2 });

    const lowerTerrace = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.75, 8.8), purpleTrimMat);
    lowerTerrace.position.set(0, 0.38, -11.4);
    lowerTerrace.receiveShadow = true;
    this.shopGroup.add(lowerTerrace);

    const upperTerrace = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.7, 8.0), slateTerraceMat);
    upperTerrace.position.set(0, 1.05, -11.4);
    upperTerrace.receiveShadow = true;
    this.shopGroup.add(upperTerrace);

    const terraceTopY = 1.4;

    // Wide Ceremonial Staircase seated flush against the terrace with stone plinth & flanking posts
    const stairPlinth = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.72, 1.15), slateTerraceMat);
    stairPlinth.position.set(0, 0.5, -6.92);
    stairPlinth.receiveShadow = true;
    this.shopGroup.add(stairPlinth);
    mountGlbProp('/models/fantasy-town/stairs-wide-stone.glb', this.shopGroup, {
      position: [0, 0.14, -6.78],
      rotationY: Math.PI / 2,
      targetHeight: 1.28,
      scaleMultiplier: [1.35, 1.0, 2.3],
    });
    for (const px of [-1.72, 1.72]) {
      mountGlbProp('/models/fantasy-town/pillar-stone.glb', this.shopGroup, {
        position: [px, 0.14, -6.08],
        targetHeight: 1.08,
      });
    }

    // Flanking Arcane Crystal Obelisks
    for (const sx of [-4.9, 4.9]) {
      this.shopGroup.add(this.createArcaneObelisk(sx, terraceTopY, -14.1));
    }

    // Central Kenney Castle Hexagon Spire Stack (uniformScale = 2.15 -> total height ~5.87 -> apex y=7.27)
    const hexScale = 2.15;
    const hBase = 1.31 * hexScale;
    const hMid = 0.46 * hexScale;
    const hTop = 0.13 * hexScale;

    mountGlbProp('/models/castle/tower-hexagon-base.glb', this.shopGroup, {
      position: [0, terraceTopY, -11.4],
      uniformScale: hexScale,
    });
    mountGlbProp('/models/castle/tower-hexagon-mid.glb', this.shopGroup, {
      position: [0, terraceTopY + hBase, -11.4],
      uniformScale: hexScale,
    });
    mountGlbProp('/models/castle/tower-hexagon-top.glb', this.shopGroup, {
      position: [0, terraceTopY + hBase + hMid, -11.4],
      uniformScale: hexScale,
    });
    mountGlbProp('/models/castle/tower-hexagon-roof.glb', this.shopGroup, {
      position: [0, terraceTopY + hBase + hMid + hTop, -11.4],
      uniformScale: hexScale,
    });

    // Two Flanking Square Castle Side Turrets
    const sqScale = 1.55;
    const sqBaseH = 1.01 * sqScale;
    for (const tx of [-2.25, 2.25]) {
      mountGlbProp('/models/castle/tower-square-base.glb', this.shopGroup, {
        position: [tx, terraceTopY, -11.7],
        uniformScale: sqScale,
      });
      mountGlbProp('/models/castle/tower-square-mid-windows.glb', this.shopGroup, {
        position: [tx, terraceTopY + sqBaseH, -11.7],
        rotationY: -Math.PI / 2,
        uniformScale: sqScale,
      });
      mountGlbProp('/models/castle/tower-square-top-roof-high.glb', this.shopGroup, {
        position: [tx, terraceTopY + sqBaseH * 2, -11.7],
        uniformScale: sqScale,
      });
      mountGlbProp('/models/castle/flag-banner-long.glb', this.shopGroup, {
        position: [tx, terraceTopY + 1.15, -10.85],
        rotationY: -Math.PI / 2,
        targetHeight: 1.55,
      });
    }

    // Castle Doorway mounted flush on the front face of the central Hexagon Keep + Arcane Ring
    mountGlbProp('/models/castle/door.glb', this.shopGroup, {
      position: [0, terraceTopY, -10.5],
      rotationY: -Math.PI / 2,
      targetHeight: 1.55,
    });

    const towerRing = new THREE.Mesh(
      new THREE.RingGeometry(2.45, 2.85, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    towerRing.rotation.x = -Math.PI / 2;
    towerRing.position.set(0, 1.43, -11.4);
    this.shopGroup.add(towerRing);

    this.addShopEmblem('/hud/tower.png', '#38bdf8', 0, 8.55, -11.4, 1.78, 0.8);

    const towerHit = this.createHitbox(0, 4.5, -11.4, 8.2, 7.8, 7.2, 'shop-tower');
    this.shopGroup.add(towerHit);
    this.shopClickables.push(towerHit);
  }

  private createArcaneObelisk(x: number, y: number, z: number): THREE.Group {
    const ob = new THREE.Group();
    ob.position.set(x, y, z);

    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.55, metalness: 0.2 });
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.35, metalness: 0.4 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.75 });

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.36, 1.1), plinthMat);
    plinth.position.y = 0.18;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.0, 6), shaftMat);
    shaft.position.y = 1.36;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.18, 6), trimMat);
    crown.position.y = 2.42;
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34, 0),
      new THREE.MeshStandardMaterial({
        color: 0xf0abfc,
        emissive: 0xc026d3,
        emissiveIntensity: 0.9,
        roughness: 0.15,
      })
    );
    crystal.position.y = 2.95;

    ob.add(plinth, shaft, crown, crystal);
    this.plazaCrystals.push(crystal);
    return ob;
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
    // Center dark cosmic pedestal
    const centerRock = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 0.85, 1.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.45 })
    );
    centerRock.position.set(0, -0.5, -2.4);
    this.altarGroup.add(centerRock);

    const centerRing = new THREE.Mesh(
      new THREE.RingGeometry(1.36, 1.54, 32),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide })
    );
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.set(0, 0.27, -2.4);
    this.altarGroup.add(centerRing);

    // 10 floating Enchant pedestals in an ellipse ring
    const count = ENCHANTS.length;
    const pedestalTargets: Array<{ x: number; z: number; color: string }> = [];
    for (let i = 0; i < count; i++) {
      const enc = ENCHANTS[i];
      const angle = (i / count) * Math.PI * 2 + Math.PI * 0.18;
      const rx = 5.4;
      const rz = 3.9;
      const px = Math.cos(angle) * rx;
      const pz = Math.sin(angle) * rz - 2.4;
      const py = Math.sin(angle) < 0 ? 0.55 : -0.15;
      const needleAngle = Math.atan2(-(pz - -2.4), px);
      pedestalTargets.push({ x: px, z: pz, color: enc.color });

      const pg = new THREE.Group();
      pg.position.set(px, py, pz);

      const rock = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 0.52, 1.35, 7),
        new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.55 })
      );
      rock.position.y = -0.68;
      pg.add(rock);

      const topDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(1.08, 1.08, 0.12, 24),
        new THREE.MeshStandardMaterial({ color: 0x090b1a, roughness: 0.35 })
      );
      pg.add(topDisc);

      const ringMat = new THREE.MeshBasicMaterial({ color: enc.color, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.14, 28), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.08;
      pg.add(ring);

      const billboard = new EnchantBillboard2D(enc.id, enc.color, 1.38, i * 0.7);
      billboard.root.position.y = 0.08;
      pg.add(billboard.root);

      this.altarGroup.add(pg);
      this.altarPedestals.push({
        id: enc.id,
        group: pg,
        ringMat,
        prop: billboard.root,
        billboard,
        baseY: py,
        needleAngle,
        worldX: px,
        worldZ: pz,
        anchorLocal: new THREE.Vector3(px, py + 1.72, pz),
      });
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
    this.shopGroup.visible = mode === 'shop';
    this.altarGroup.visible = mode === 'altar';

    if (mode === 'shop') {
      for (let i = 0; i < this.shopEmblems.length; i++) {
        this.shopEmblems[i].updateTransform(dt, elapsed, false, false, camera);
      }
      for (let i = 0; i < this.plazaCrystals.length; i++) {
        this.plazaCrystals[i].rotation.y = elapsed * 0.9 + i;
      }
    }

    if (mode === 'altar') {
      const isSpinning = this.spinTimer > 0;
      const spinRatio = isSpinning ? this.spinTimer / this.spinDuration : 0;

      this.clockDial.gearRing.rotation.y = -elapsed * (isSpinning ? 4.2 : 0.7);
      this.clockDial.centerOrb.rotation.y = elapsed * 2.2;
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

      this.altarParticles.update(dt, elapsed, spinRatio, activeHex);

      for (let i = 0; i < this.altarPedestals.length; i++) {
        const p = this.altarPedestals[i];
        const isHi = i === this.activeHighlightIndex;
        p.group.position.y = p.baseY + Math.sin(elapsed * 1.8 + i * 0.7) * 0.12 + (isHi ? 0.34 : 0);
        p.billboard.updateTransform(dt, elapsed, isHi, isSpinning, camera);
      }

      for (let i = 0; i < this.floatingShards.length; i++) {
        this.floatingShards[i].rotation.y = elapsed * 0.4 + i;
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
        .set(p.worldX, p.group.position.y + (highlighted ? 2.15 : 1.66), p.worldZ)
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
}
