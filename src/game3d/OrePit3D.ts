import * as THREE from 'three';
import {
  MAX_PIT_NODE_COUNT,
  type MineWorldPalette,
  type OreVariantDef,
  type OreVariantKey,
  rollOreVariant,
} from './MineWorldPalette';
import {
  getHazardStripeTexture,
  getQuarryFloorTexture,
  getSlashArcTexture,
  getWoodPlankTexture,
} from './ProceduralTextures3D';
import { mountGlbProp } from './GlbAssets3D';

export const PIT_NODE_COUNT = 1;
export const PIT_CENTER_Z = 0.65;
export const PIT_FLOOR_Y = -0.68;
export const PIT_HALF_W = 4.55;
export const PIT_HALF_D = 2.25;

const BASE_ORE_HP = 180;
export const BASE_ORE_RESPAWN_SEC = 4.0;

export interface DamageableOreState {
  hp: number;
  alive: boolean;
}

export interface PureOreHitResult {
  broken: boolean;
  dmgDealt: number;
}

export function applyNodeDamagePure(
  node: DamageableOreState,
  dmg: number
): PureOreHitResult | null {
  if (!node.alive || node.hp <= 0 || dmg <= 0) return null;
  const dmgDealt = Math.min(node.hp, dmg);
  node.hp = Math.max(0, node.hp - dmg);
  if (node.hp > 0) {
    return {
      broken: false,
      dmgDealt,
    };
  }

  node.alive = false;
  return {
    broken: true,
    dmgDealt,
  };
}

export interface OreHitResult {
  broken: boolean;
  variantKey: OreVariantKey;
  dmgDealt: number;
}

interface ShardParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  dur: number;
}

interface SlashFx {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  dur: number;
}

interface InternalOreNode {
  id: number;
  root: THREE.Group;
  visualGroup: THREE.Group;
  hitMesh: THREE.Mesh;
  rockMat: THREE.MeshStandardMaterial;
  crystalMat: THREE.MeshStandardMaterial;
  geodeRing: THREE.Mesh;
  commonMesh: THREE.Group;
  veinMesh: THREE.Group;
  geodeMesh: THREE.Group;
  variant: OreVariantDef;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  squashAmt: number;
  flashTimer: number;
  spawnScale: number;
  x: number;
  z: number;
  phase: number;
}

export class OrePit3D {
  public readonly group = new THREE.Group();
  public readonly clickableMeshes: THREE.Mesh[] = [];

  private readonly floorMat: THREE.MeshStandardMaterial;
  private readonly wallMat: THREE.MeshStandardMaterial;
  private readonly trimMat: THREE.MeshStandardMaterial;
  private readonly shardMat: THREE.MeshStandardMaterial;
  private readonly sharedShardGeo = new THREE.OctahedronGeometry(0.11, 0);
  private readonly shardPool: ShardParticle[] = [];
  private readonly slashPool: SlashFx[] = [];
  private readonly slashGeo = new THREE.PlaneGeometry(1.6, 1.6);
  private readonly nodes: InternalOreNode[] = [];

  private activePalette!: MineWorldPalette;
  private hoveredNodeId = -1;
  private respawnSpeedMult = 1;
  private activeNodeCount = PIT_NODE_COUNT;
  private hpScale = 1;

  constructor(palette: MineWorldPalette) {
    this.activePalette = palette;
    this.group.position.set(0, PIT_FLOOR_Y, PIT_CENTER_Z);

    // Sunlit Textured Sunken Quarry Floor (sits cleanly 0.68m below courtyard deck y=0)
    this.floorMat = new THREE.MeshStandardMaterial({
      map: getQuarryFloorTexture(palette.pitFloorColor, palette.crystalColor),
      roughness: 0.85,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.14, 6.8), this.floorMat);
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Embedded Minecart Rail Spur inside left pit portal
    this.buildInnerPitRails();

    // Full-Height Excavated Quarry Retaining Walls (rising from pit bed y=0 up to y=+0.86, above courtyard y=+0.68)
    this.wallMat = new THREE.MeshStandardMaterial({
      color: palette.cliffColor,
      roughness: 0.8,
      metalness: 0.12,
    });
    this.trimMat = new THREE.MeshStandardMaterial({
      map: getHazardStripeTexture(palette.crystalColor),
      roughness: 0.4,
      metalness: 0.25,
    });

    const pitW = 11.8;
    const pitD = 6.8;
    const wallH = 0.86;
    // Open portals:
    // - North center (x in [-1.3, +1.3]) for stepped quarry stairs descending from deck
    // - Left spur (z in [-1.15, +0.15]) for sloped minecart railway entry
    // - Right chute (z in [+0.38, +1.72] -> world z=1.70) for inclined ore conveyor exit
    const wallSpecs: [number, number, number, number, number][] = [
      [-3.6, -pitD / 2, 4.6, wallH, 0.36],
      [3.6, -pitD / 2, 4.6, wallH, 0.36],
      [0, pitD / 2, pitW, wallH, 0.36],
      [-pitW / 2, -2.325, 0.36, wallH, 2.15],
      [-pitW / 2, 1.825, 0.36, wallH, 3.15],
      [pitW / 2, -1.51, 0.36, wallH, 3.78],
      [pitW / 2, 2.56, 0.36, wallH, 1.68],
    ];
    for (const [wx, wz, ww, wh, wd] of wallSpecs) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, wd), this.wallMat);
      wall.position.set(wx, wh * 0.5, wz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);

      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(ww > wd ? ww : 0.28, 0.1, wd > ww ? wd : 0.28),
        this.trimMat
      );
      trim.position.set(wx, wh + 0.04, wz);
      trim.castShadow = true;
      this.group.add(trim);
    }

    // Stepped inner quarry stone bench along bottom perimeter to emphasize true depth
    const benchSpecs: [number, number, number, number][] = [
      [-3.6, -pitD / 2 + 0.26, 4.4, 0.28],
      [3.6, -pitD / 2 + 0.26, 4.4, 0.28],
      [0, pitD / 2 - 0.26, 11.4, 0.28],
    ];
    for (const [bx, bz, bw, bd] of benchSpecs) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.26, bd), this.wallMat);
      bench.position.set(bx, 0.13, bz);
      bench.receiveShadow = true;
      bench.castShadow = true;
      this.group.add(bench);
    }

    // Corner Steel-Capped Stone Corner Piers framing the excavated pit rim
    const postMat = new THREE.MeshStandardMaterial({
      map: getWoodPlankTexture(),
      roughness: 0.78,
    });
    const steelCapMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.65,
      roughness: 0.3,
    });
    const postGeo = new THREE.BoxGeometry(0.44, 1.02, 0.44);
    const capGeo = new THREE.BoxGeometry(0.52, 0.14, 0.52);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = sx * (pitW / 2);
        const pz = sz * (pitD / 2);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, 0.51, pz);
        post.castShadow = true;
        const cap = new THREE.Mesh(capGeo, steelCapMat);
        cap.position.set(px, 1.06, pz);
        cap.castShadow = true;
        this.group.add(post, cap);
      }
    }

    this.shardMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 0.45,
      flatShading: true,
    });

    // Build reusable ore node slots inside the pit (up to MAX_PIT_NODE_COUNT unlocked by Deposits upgrades)
    for (let i = 0; i < MAX_PIT_NODE_COUNT; i++) {
      const node = this.createNodeSlot(i);
      this.nodes.push(node);
      this.group.add(node.root);
      this.clickableMeshes.push(node.hitMesh);
    }

    this.setPalette(palette, true);
  }

  private buildInnerPitRails(): void {
    const railGroup = new THREE.Group();
    const sleeperMat = new THREE.MeshStandardMaterial({
      map: getWoodPlankTexture(),
      roughness: 0.85,
    });

    // Short spur rail cleanly entering through the left portal wall with an unloading stop
    mountGlbProp('/models/train/track-detailed.glb', railGroup, {
      position: [-5.4, 0.02, -0.5],
      rotationY: Math.PI / 2,
      targetWidth: 1.02,
      alignBottomY: 0,
    });
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.88), sleeperMat);
    bumper.position.set(-4.84, 0.12, -0.5);
    bumper.castShadow = true;
    railGroup.add(bumper);

    this.group.add(railGroup);
  }

  private createNodeSlot(id: number): InternalOreNode {
    const root = new THREE.Group();
    const visualGroup = new THREE.Group();
    root.add(visualGroup);

    const rockMat = new THREE.MeshStandardMaterial({
      color: this.activePalette.rockColor,
      roughness: 0.78,
      metalness: 0.08,
      flatShading: true,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: this.activePalette.crystalColor,
      emissive: this.activePalette.crystalColor,
      emissiveIntensity: 0.4,
      roughness: 0.16,
      metalness: 0.35,
      flatShading: true,
    });

    // 3 Distinct Ore Silhouettes backed by Kenney CC0 Low-Poly Boulders + Dynamic Crystal Spires
    const buildCommonOre = (): THREE.Group => {
      const g = new THREE.Group();
      mountGlbProp('/models/mini-dungeon/rocks.glb', g, {
        position: [0, 0.02, 0],
        rotationY: id * 1.1,
        targetHeight: 0.52,
        alignBottomY: 0,
      });

      const gleam = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), crystalMat);
      gleam.position.set(-0.08, 0.56, 0.06);
      gleam.scale.set(0.85, 1.35, 0.85);
      gleam.rotation.set(0.25, 0.7, 0.35);
      g.add(gleam);
      return g;
    };

    const buildCrystalVein = (): THREE.Group => {
      const g = new THREE.Group();
      mountGlbProp('/models/mini-dungeon/rocks.glb', g, {
        position: [0, 0.02, 0],
        rotationY: id * 1.7 + 0.5,
        targetHeight: 0.72,
        alignBottomY: 0,
      });

      const prismSpecs: [number, number, number, number, number, number][] = [
        [0, 0.94, 0, 0.15, 0.86, 0.08],
        [0.32, 0.72, 0.18, 0.11, 0.62, 0.48],
        [-0.28, 0.7, -0.16, 0.1, 0.58, -0.45],
        [0.14, 0.66, -0.28, 0.1, 0.52, 0.34],
      ];
      for (const [px, py, pz, r, h, tilt] of prismSpecs) {
        const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.03, r, h, 6), crystalMat);
        prism.position.set(px, py, pz);
        prism.rotation.set(tilt * 0.7, px * 2, -tilt);
        prism.castShadow = true;
        g.add(prism);
      }
      return g;
    };

    const buildRareGeode = (): THREE.Group => {
      const g = new THREE.Group();
      mountGlbProp('/models/mini-dungeon/rocks.glb', g, {
        position: [0, 0.02, 0],
        rotationY: id * 0.9,
        targetHeight: 0.78,
        alignBottomY: 0,
      });

      const coreHeart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), crystalMat);
      coreHeart.position.y = 0.76;
      coreHeart.scale.set(1.0, 1.28, 1.0);
      coreHeart.castShadow = true;
      g.add(coreHeart);

      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.12, 0.68, 6), crystalMat);
        spire.position.set(Math.cos(ang) * 0.42, 0.68, Math.sin(ang) * 0.42);
        spire.rotation.set(Math.sin(ang) * 0.55, ang, -Math.cos(ang) * 0.55);
        spire.castShadow = true;
        g.add(spire);
      }
      return g;
    };

    const commonMesh = buildCommonOre();
    const veinMesh = buildCrystalVein();
    const geodeMesh = buildRareGeode();
    visualGroup.add(commonMesh, veinMesh, geodeMesh);

    const geodeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 0.98, 24),
      new THREE.MeshBasicMaterial({
        color: this.activePalette.crystalColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    geodeRing.rotation.x = -Math.PI / 2;
    geodeRing.position.y = 0.045;
    root.add(geodeRing);

    const hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.94, 1.0, 1.9, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitMesh.position.y = 0.95;
    hitMesh.userData = { kind: 'ore-node', nodeId: id };
    root.add(hitMesh);

    const variant = rollOreVariant();
    return {
      id,
      root,
      visualGroup,
      hitMesh,
      rockMat,
      crystalMat,
      geodeRing,
      commonMesh,
      veinMesh,
      geodeMesh,
      variant,
      hp: 100,
      maxHp: 100,
      alive: true,
      respawnTimer: 0,
      squashAmt: 0,
      flashTimer: 0,
      spawnScale: 1,
      x: 0,
      z: 0,
      phase: id * 0.7,
    };
  }

  public setPalette(palette: MineWorldPalette, forceRespawnAll = false): void {
    this.activePalette = palette;

    const cColor = new THREE.Color(palette.crystalColor);
    this.floorMat.map = getQuarryFloorTexture(palette.pitFloorColor, palette.crystalColor);
    this.floorMat.needsUpdate = true;
    this.wallMat.color.set(palette.cliffColor);
    this.trimMat.map = getHazardStripeTexture(palette.crystalColor);
    this.trimMat.needsUpdate = true;
    this.shardMat.color.copy(cColor);
    this.shardMat.emissive.copy(cColor);

    if (forceRespawnAll) {
      for (const node of this.nodes) {
        if (node.id < this.activeNodeCount) {
          this.spawnNode(node, true);
        } else {
          this.deactivateNode(node);
        }
      }
    }
  }

  private deactivateNode(node: InternalOreNode): void {
    node.alive = false;
    node.hp = 0;
    node.respawnTimer = 0;
    node.root.visible = false;
    node.hitMesh.visible = false;
  }

  public setActiveNodeCount(count: number): void {
    const next = Math.max(1, Math.min(MAX_PIT_NODE_COUNT, Math.round(count)));
    if (next === this.activeNodeCount) return;
    this.activeNodeCount = next;
    for (const node of this.nodes) {
      if (node.id < this.activeNodeCount) {
        if (!node.alive && node.respawnTimer <= 0) {
          this.spawnNode(node, false);
        }
      } else {
        this.deactivateNode(node);
      }
    }
  }

  public setHpScale(scale: number): void {
    const next = Math.max(0.25, scale);
    if (Math.abs(next - this.hpScale) < 1e-4) return;
    const ratio = next / this.hpScale;
    this.hpScale = next;
    for (const node of this.nodes) {
      if (node.id >= this.activeNodeCount || !node.alive) continue;
      node.maxHp = Math.max(10, Math.round(BASE_ORE_HP * this.hpScale * node.variant.hpMult));
      node.hp = Math.max(1, Math.min(node.maxHp, Math.round(node.hp * ratio)));
    }
  }

  private pickNonOverlappingSpot(excludeId: number): { x: number; z: number } {
    let bestX = (Math.random() - 0.5) * (PIT_HALF_W * 1.8);
    let bestZ = (Math.random() - 0.5) * (PIT_HALF_D * 1.75);
    let bestMinDist = -1;

    for (let attempt = 0; attempt < 22; attempt++) {
      const cx = (Math.random() * 2 - 1) * PIT_HALF_W;
      const cz = (Math.random() * 2 - 1) * PIT_HALF_D;
      let minDist = 999;
      for (const other of this.nodes) {
        if (other.id === excludeId || other.id >= this.activeNodeCount) continue;
        const d = Math.hypot(cx - other.x, cz - other.z);
        if (d < minDist) minDist = d;
      }
      if (minDist >= 1.9) return { x: cx, z: cz };
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestX = cx;
        bestZ = cz;
      }
    }
    return { x: bestX, z: bestZ };
  }

  private spawnNode(node: InternalOreNode, instant = false): void {
    if (node.id >= this.activeNodeCount) {
      this.deactivateNode(node);
      return;
    }
    const spot = this.pickNonOverlappingSpot(node.id);
    const variant = rollOreVariant();
    const maxHp = Math.max(10, Math.round(BASE_ORE_HP * this.hpScale * variant.hpMult));

    node.variant = variant;
    node.x = spot.x;
    node.z = spot.z;
    node.hp = maxHp;
    node.maxHp = maxHp;
    node.alive = true;
    node.respawnTimer = 0;
    node.squashAmt = instant ? 0 : 0.18;
    node.flashTimer = 0;
    node.spawnScale = instant ? 1 : 0.08;

    node.root.position.set(node.x, 0, node.z);
    node.root.visible = true;
    node.hitMesh.visible = true;

    node.rockMat.color.set(this.activePalette.rockColor);
    const crystalColor =
      variant.key === 'geode'
        ? new THREE.Color(this.activePalette.crystalColor).lerp(new THREE.Color('#ffffff'), 0.18)
        : new THREE.Color(this.activePalette.crystalColor);
    node.crystalMat.color.copy(crystalColor);
    node.crystalMat.emissive.copy(crystalColor);
    node.crystalMat.emissiveIntensity = variant.key === 'geode' ? 0.65 : variant.key === 'vein' ? 0.45 : 0.32;

    node.commonMesh.visible = variant.key === 'common';
    node.veinMesh.visible = variant.key === 'vein';
    node.geodeMesh.visible = variant.key === 'geode';
    node.geodeRing.visible = variant.key === 'geode';
    (node.geodeRing.material as THREE.MeshBasicMaterial).color.copy(crystalColor);

    node.visualGroup.rotation.y = Math.random() * Math.PI * 2;
  }

  public setHoveredNode(nodeId: number): void {
    this.hoveredNodeId = nodeId;
  }

  public hitNode(
    nodeId: number,
    dmg: number,
    heavy: boolean,
    shardCount = heavy ? 9 : 4
  ): OreHitResult | null {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node || !node.alive) return null;

    const pure = applyNodeDamagePure(node, dmg);
    if (!pure) return null;

    node.squashAmt = heavy ? 0.28 : 0.16;
    node.flashTimer = 0.08;
    if (this.group.visible) {
      this.spawnShardsAt(node.x, node.z, pure.broken ? 14 : shardCount);
      this.spawnSlashAt(node.x, node.z, heavy);
    }

    if (pure.broken) {
      node.root.visible = false;
      node.hitMesh.visible = false;
      node.respawnTimer = BASE_ORE_RESPAWN_SEC;
    }

    return {
      broken: pure.broken,
      variantKey: node.variant.key,
      dmgDealt: pure.dmgDealt,
    };
  }

  private spawnSlashAt(lx: number, lz: number, heavy: boolean): void {
    if (this.slashPool.length >= 10) return;
    const mat = new THREE.MeshBasicMaterial({
      map: getSlashArcTexture(),
      color: heavy ? 0xfbbf24 : 0xffffff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.slashGeo, mat);
    mesh.position.set(lx, 0.9, lz);
    mesh.rotation.set(
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.8,
      Math.random() * Math.PI * 2
    );
    const s = heavy ? 1.15 : 0.78;
    mesh.scale.setScalar(s);
    this.group.add(mesh);
    this.slashPool.push({ mesh, mat, age: 0, dur: 0.16 });
  }

  private spawnShardsAt(lx: number, lz: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.shardPool.length >= 54) break;
      const mesh = new THREE.Mesh(this.sharedShardGeo, this.shardMat);
      mesh.position.set(
        lx + (Math.random() - 0.5) * 0.55,
        0.65 + Math.random() * 0.55,
        lz + (Math.random() - 0.5) * 0.55
      );
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.0 + Math.random() * 3.2;
      this.group.add(mesh);
      this.shardPool.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: 2.6 + Math.random() * 3.2,
        vz: Math.sin(ang) * spd,
        age: 0,
        dur: 0.48 + Math.random() * 0.22,
      });
    }
  }

  public getAliveNodeIds(): number[] {
    return this.nodes.filter((n) => n.alive).map((n) => n.id);
  }

  public getAliveNodesInfo(): Array<{
    id: number;
    worldX: number;
    worldY: number;
    worldZ: number;
    hp: number;
    maxHp: number;
    variantKey: OreVariantKey;
  }> {
    return this.nodes
      .filter((n) => n.alive)
      .map((n) => ({
        id: n.id,
        worldX: n.x,
        worldY: PIT_FLOOR_Y,
        worldZ: PIT_CENTER_Z + n.z,
        hp: n.hp,
        maxHp: n.maxHp,
        variantKey: n.variant.key,
      }));
  }

  public setRespawnSpeedMult(mult: number): void {
    this.respawnSpeedMult = Math.max(0.5, mult);
  }

  public update(dtSec: number, elapsed: number): void {
    for (const node of this.nodes) {
      if (node.id >= this.activeNodeCount) continue;
      if (!node.alive) {
        if (node.respawnTimer > 0) {
          node.respawnTimer -= dtSec * this.respawnSpeedMult;
          if (node.respawnTimer <= 0) {
            this.spawnNode(node, false);
          }
        }
        continue;
      }

      if (node.spawnScale < 1) {
        node.spawnScale = Math.min(1, node.spawnScale + dtSec * 4.5);
      }

      if (node.squashAmt > 0.001) {
        node.squashAmt = Math.max(0, node.squashAmt - dtSec * 1.9);
      }

      const hoverMult = (node.id === this.hoveredNodeId ? 1.1 : 1.0) * node.spawnScale;
      const sy = Math.max(0.05, (1 - node.squashAmt) * hoverMult);
      const sxz = (1 + node.squashAmt * 0.48) * hoverMult;
      const tremor = node.squashAmt > 0.005 ? Math.sin(elapsed * 58 + node.phase) * node.squashAmt * 0.14 : 0;
      node.visualGroup.scale.set(sxz, sy, sxz);
      node.visualGroup.position.set(tremor, Math.sin(elapsed * 2.2 + node.phase) * 0.02, -tremor * 0.65);

      if (node.geodeRing.visible) {
        node.geodeRing.rotation.z = elapsed * 0.8 + node.phase;
      }

      if (node.flashTimer > 0) {
        node.flashTimer -= dtSec;
        node.crystalMat.emissive.setHex(0xffffff);
        node.crystalMat.emissiveIntensity = 1.8;
      } else {
        const baseColor =
          node.variant.key === 'geode'
            ? new THREE.Color(this.activePalette.crystalColor).lerp(new THREE.Color('#ffffff'), 0.18)
            : new THREE.Color(this.activePalette.crystalColor);
        node.crystalMat.emissive.copy(baseColor);
        const pulse = node.variant.key === 'geode' ? 0.65 + Math.sin(elapsed * 4 + node.phase) * 0.2 : 0.36;
        node.crystalMat.emissiveIntensity = node.id === this.hoveredNodeId ? pulse + 0.28 : pulse;
      }
    }

    for (let i = this.shardPool.length - 1; i >= 0; i--) {
      const p = this.shardPool[i];
      p.age += dtSec;
      if (p.age >= p.dur) {
        this.group.remove(p.mesh);
        this.shardPool.splice(i, 1);
        continue;
      }
      p.vy -= 14 * dtSec;
      p.mesh.position.x += p.vx * dtSec;
      p.mesh.position.y = Math.max(0.08, p.mesh.position.y + p.vy * dtSec);
      p.mesh.position.z += p.vz * dtSec;
      p.mesh.rotation.x += dtSec * 8;
      p.mesh.rotation.z += dtSec * 6;
      p.mesh.scale.setScalar(1 - p.age / p.dur);
    }

    for (let i = this.slashPool.length - 1; i >= 0; i--) {
      const fx = this.slashPool[i];
      fx.age += dtSec;
      if (fx.age >= fx.dur) {
        this.group.remove(fx.mesh);
        fx.mat.dispose();
        this.slashPool.splice(i, 1);
        continue;
      }
      const p = fx.age / fx.dur;
      fx.mat.opacity = 1 - p;
      fx.mesh.scale.setScalar(0.8 + p * 0.65);
    }
  }
}
