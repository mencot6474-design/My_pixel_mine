import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import { getOresByWorld, type OreDef, type WorldId } from '../game/GameData';
import { getWeatherById, type WeatherId } from '../game/WeatherData';
import {
  MAX_PIT_NODE_COUNT,
  type MineWorldPalette,
  ORE_VARIANTS,
  type OreVariantDef,
  type OreVariantKey,
  rollOreVariant,
  WORLD_PALETTES,
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
  meteorWeatherId?: WeatherId;
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

const spriteTexCache = new Map<string, Promise<THREE.Texture>>();
const spriteTexLoader = new THREE.TextureLoader();
let softContactShadowTex: THREE.CanvasTexture | null | undefined;

export function getSoftContactShadowTexture(): THREE.CanvasTexture | null {
  if (softContactShadowTex !== undefined) return softContactShadowTex;
  if (typeof document === 'undefined') {
    softContactShadowTex = null;
    return null;
  }
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    softContactShadowTex = null;
    return null;
  }
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.45, 'rgba(2, 6, 23, 0.42)');
  grad.addColorStop(0.78, 'rgba(2, 6, 23, 0.14)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  softContactShadowTex = tex;
  return tex;
}

export function loadPublicSpriteTexture(publicPath: string): Promise<THREE.Texture> {
  const url = assetUrl(publicPath);
  const cached = spriteTexCache.get(url);
  if (cached) return cached;

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('No DOM Image available'));
      return;
    }
    spriteTexLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.generateMipmaps = true;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      (err) => reject(err)
    );
  });
  spriteTexCache.set(url, promise);
  return promise;
}

function resolveWorldIdFromPalette(palette: MineWorldPalette): WorldId {
  for (const [id, p] of Object.entries(WORLD_PALETTES) as Array<[WorldId, MineWorldPalette]>) {
    if (p === palette) return id;
  }
  return 'underground';
}

function pickWorldOreForVariant(worldId: WorldId, variantKey: OreVariantKey): OreDef {
  const ores = getOresByWorld(worldId);
  const pool =
    variantKey === 'geode'
      ? ores.slice(5, 8)
      : variantKey === 'vein'
        ? ores.slice(2, 5)
        : ores.slice(0, 2);
  const list = pool.length > 0 ? pool : ores;
  return list[Math.floor(Math.random() * list.length)] ?? ores[0];
}

/**
 * Reusable 2D illustrated ore billboard sprite with directional + contact shadows
 * and squash-on-hit ("gepeng") animation shared by OrePit3D and TowerArena3D.
 */
export class OreBillboard2D {
  public readonly root = new THREE.Group();
  private readonly spritePivot = new THREE.Group();
  private readonly visualGroup = new THREE.Group();
  private readonly spriteMesh: THREE.Mesh;
  private readonly spriteMat: THREE.MeshBasicMaterial;
  private readonly depthMat: THREE.MeshDepthMaterial;
  private readonly shadowDisc: THREE.Mesh;
  private readonly tmpWorldPos = new THREE.Vector3();

  private baseSize = 1.45;
  private oreId = '';

  constructor(initialSize = 1.45) {
    this.baseSize = initialSize;
    this.spritePivot.rotation.order = 'YXZ';
    this.visualGroup.scale.set(initialSize, initialSize, 1);
    this.spritePivot.add(this.visualGroup);
    this.root.add(this.spritePivot);

    this.spriteMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
      depthWrite: true,
      opacity: 0,
    });
    this.depthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
    });

    this.spriteMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.spriteMat);
    this.spriteMesh.position.y = 0.45;
    this.spriteMesh.customDepthMaterial = this.depthMat;
    this.spriteMesh.castShadow = false;
    this.visualGroup.add(this.spriteMesh);

    const shadowTex = getSoftContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      color: shadowTex ? 0xffffff : 0x020617,
      transparent: true,
      opacity: shadowTex ? 0.8 : 0.28,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.shadowDisc = new THREE.Mesh(
      shadowTex ? new THREE.PlaneGeometry(1.35, 0.84) : new THREE.CircleGeometry(0.55, 20),
      shadowMat
    );
    this.shadowDisc.rotation.x = -Math.PI / 2;
    this.shadowDisc.position.y = 0.015;
    this.root.add(this.shadowDisc);
  }

  public setOre(oreId: string, baseSize: number): void {
    this.setSprite(`ore:${oreId}`, `/ores/${oreId}.webp`, baseSize);
  }

  public setMeteor(weatherId: WeatherId, baseSize: number): void {
    this.setSprite(`meteor:${weatherId}`, `/meteors/${weatherId}.webp`, baseSize);
  }

  private setSprite(spriteKey: string, urlPath: string, baseSize: number): void {
    this.baseSize = baseSize;
    this.shadowDisc.scale.setScalar(baseSize / 1.45);
    if (spriteKey === this.oreId) return;
    this.oreId = spriteKey;

    void loadPublicSpriteTexture(urlPath)
      .then((tex) => {
        if (this.oreId !== spriteKey) return;
        this.spriteMat.map = tex;
        this.spriteMat.opacity = 1;
        this.spriteMat.needsUpdate = true;
        this.depthMat.map = tex;
        this.depthMat.needsUpdate = true;
        this.spriteMesh.castShadow = true;
      })
      .catch(() => {
        // Safe no-op in headless tests
      });
  }

  public updateTransform(
    elapsed: number,
    phase: number,
    squashAmt: number,
    scaleMult: number,
    flashActive: boolean,
    camera?: THREE.Camera
  ): void {
    if (camera) {
      this.root.getWorldPosition(this.tmpWorldPos);
      const dx = camera.position.x - this.tmpWorldPos.x;
      const dy = camera.position.y - this.tmpWorldPos.y;
      const dz = camera.position.z - this.tmpWorldPos.z;
      const horizDist = Math.max(0.001, Math.hypot(dx, dz));
      const camPitch = Math.atan2(dy, horizDist);
      this.spritePivot.rotation.y = Math.atan2(dx, dz);
      this.spritePivot.rotation.x = -Math.max(0, Math.min(0.62, camPitch * 0.65));
    }

    const sy = Math.max(0.32, 1 - squashAmt) * this.baseSize * scaleMult;
    const sx = (1 + squashAmt * 0.85) * this.baseSize * scaleMult;
    const tremor = squashAmt > 0.005 ? Math.sin(elapsed * 64 + phase) * squashAmt * 0.14 : 0;
    this.visualGroup.scale.set(sx, sy, 1);
    this.visualGroup.position.set(tremor, Math.sin(elapsed * 2.2 + phase) * 0.02, 0);
    this.shadowDisc.scale.setScalar((this.baseSize / 1.45) * (1 + squashAmt * 0.35));
    this.spriteMat.color.setHex(flashActive ? 0xffe4b5 : 0xffffff);
  }
}

interface InternalOreNode {
  id: number;
  root: THREE.Group;
  oreSprite: OreBillboard2D;
  hitMesh: THREE.Mesh;
  geodeRing: THREE.Mesh;
  oreDef: OreDef;
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
  isMeteor?: boolean;
  meteorWeatherId?: WeatherId | null;
  dropY?: number;
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
  private activeWorldId: WorldId = 'underground';
  private hoveredNodeId = -1;
  private respawnSpeedMult = 1;
  private activeNodeCount = PIT_NODE_COUNT;
  private hpScale = 1;
  private meteorNode: InternalOreNode;

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

    this.meteorNode = this.createNodeSlot(999);
    this.meteorNode.isMeteor = true;
    this.meteorNode.meteorWeatherId = null;
    this.meteorNode.alive = false;
    this.meteorNode.root.visible = false;
    this.meteorNode.hitMesh.visible = false;
    this.meteorNode.hitMesh.scale.set(1.85, 1.65, 1.85);
    this.meteorNode.geodeRing.scale.setScalar(1.95);
    this.group.add(this.meteorNode.root);
    this.clickableMeshes.push(this.meteorNode.hitMesh);

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
    const oreSprite = new OreBillboard2D(1.45);
    root.add(oreSprite.root);

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
    const oreDef = pickWorldOreForVariant(this.activeWorldId, variant.key);
    return {
      id,
      root,
      oreSprite,
      hitMesh,
      geodeRing,
      oreDef,
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
    this.activeWorldId = resolveWorldIdFromPalette(palette);

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
    if (this.meteorNode.alive) {
      this.meteorNode.maxHp = Math.max(1000, Math.round(this.meteorNode.maxHp * ratio));
      this.meteorNode.hp = Math.max(1, Math.min(this.meteorNode.maxHp, Math.round(this.meteorNode.hp * ratio)));
    }
  }

  public spawnWeatherMeteor(weatherId: WeatherId, hpScale = this.hpScale, minBossHp = 0): void {
    this.hpScale = Math.max(0.25, hpScale);
    const weather = getWeatherById(weatherId);
    const baseMeteorHp = Math.max(1000, Math.round(BASE_ORE_HP * this.hpScale * 1000));
    const meteorHp = Math.max(baseMeteorHp, Math.round(minBossHp));
    const n = this.meteorNode;
    n.meteorWeatherId = weatherId;
    n.variant = ORE_VARIANTS.find((v) => v.key === 'geode') ?? ORE_VARIANTS[0];
    n.x = 0;
    n.z = -0.25;
    n.hp = meteorHp;
    n.maxHp = meteorHp;
    n.alive = true;
    n.respawnTimer = 0;
    n.squashAmt = 0.25;
    n.flashTimer = 0.14;
    n.spawnScale = 1;
    n.dropY = 12;

    n.root.position.set(n.x, n.dropY, n.z);
    n.root.visible = true;
    n.hitMesh.visible = true;
    n.geodeRing.visible = true;
    (n.geodeRing.material as THREE.MeshBasicMaterial).color.set(weather.accentColor);
    n.oreSprite.setMeteor(weatherId, 3.15);
  }

  public clearWeatherMeteor(): void {
    const n = this.meteorNode;
    n.alive = false;
    n.meteorWeatherId = null;
    n.respawnTimer = 0;
    n.root.visible = false;
    n.hitMesh.visible = false;
  }

  public hasAliveMeteor(): boolean {
    return this.meteorNode.alive;
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
    const oreDef = pickWorldOreForVariant(this.activeWorldId, variant.key);
    const maxHp = Math.max(10, Math.round(BASE_ORE_HP * this.hpScale * variant.hpMult));
    const baseSize = variant.key === 'geode' ? 1.9 : variant.key === 'vein' ? 1.58 : 1.32;

    node.variant = variant;
    node.oreDef = oreDef;
    node.x = spot.x;
    node.z = spot.z;
    node.hp = maxHp;
    node.maxHp = maxHp;
    node.alive = true;
    node.respawnTimer = 0;
    node.squashAmt = instant ? 0 : 0.24;
    node.flashTimer = 0;
    node.spawnScale = instant ? 1 : 0.08;

    node.root.position.set(node.x, 0, node.z);
    node.root.visible = true;
    node.hitMesh.visible = true;

    const ringColor =
      variant.key === 'geode'
        ? new THREE.Color(oreDef.color).lerp(new THREE.Color('#ffffff'), 0.15)
        : new THREE.Color(this.activePalette.crystalColor);
    node.geodeRing.visible = variant.key === 'geode';
    (node.geodeRing.material as THREE.MeshBasicMaterial).color.copy(ringColor);

    node.oreSprite.setOre(oreDef.id, baseSize);
  }

  public spawnTutorialCenterOre(hp: number): void {
    const node = this.nodes[0];
    if (!node) return;
    const variant = ORE_VARIANTS.find((v) => v.key === 'geode') ?? rollOreVariant();
    const oreDef = pickWorldOreForVariant(this.activeWorldId, variant.key);
    const safeHp = Math.max(10, Math.round(hp));
    const baseSize = 2.05;

    node.variant = variant;
    node.oreDef = oreDef;
    node.x = 0;
    node.z = 0;
    node.hp = safeHp;
    node.maxHp = safeHp;
    node.alive = true;
    node.respawnTimer = 0;
    node.squashAmt = 0.2;
    node.flashTimer = 0;
    node.spawnScale = 1;

    node.root.position.set(0, 0, 0);
    node.root.visible = true;
    node.hitMesh.visible = true;

    const ringColor = new THREE.Color(oreDef.color).lerp(new THREE.Color('#ffffff'), 0.15);
    node.geodeRing.visible = true;
    (node.geodeRing.material as THREE.MeshBasicMaterial).color.copy(ringColor);
    node.oreSprite.setOre(oreDef.id, baseSize);
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
    const node =
      nodeId === this.meteorNode.id ? this.meteorNode : this.nodes.find((n) => n.id === nodeId);
    if (!node || !node.alive) return null;

    const effectiveDmg = node.isMeteor
      ? Math.min(dmg, Math.max(1, Math.ceil(node.maxHp * 0.015)))
      : dmg;
    const pure = applyNodeDamagePure(node, effectiveDmg);
    if (!pure) return null;

    node.squashAmt = heavy ? 0.46 : 0.34;
    node.flashTimer = 0.09;
    if (this.group.visible) {
      this.spawnShardsAt(node.x, node.z, pure.broken ? (node.isMeteor ? 28 : 14) : shardCount);
      this.spawnSlashAt(node.x, node.z, heavy);
    }

    const meteorWeatherId = node.isMeteor && pure.broken ? (node.meteorWeatherId ?? undefined) : undefined;
    if (pure.broken) {
      node.root.visible = false;
      node.hitMesh.visible = false;
      if (node.isMeteor) {
        node.respawnTimer = 0;
        node.meteorWeatherId = null;
      } else {
        node.respawnTimer = BASE_ORE_RESPAWN_SEC;
      }
    }

    return {
      broken: pure.broken,
      variantKey: node.variant.key,
      dmgDealt: pure.dmgDealt,
      meteorWeatherId,
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
    isMeteor?: boolean;
    meteorWeatherId?: WeatherId;
  }> {
    const list: Array<{
      id: number;
      worldX: number;
      worldY: number;
      worldZ: number;
      hp: number;
      maxHp: number;
      variantKey: OreVariantKey;
      isMeteor?: boolean;
      meteorWeatherId?: WeatherId;
    }> = this.nodes
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
    if (this.meteorNode.alive) {
      list.push({
        id: this.meteorNode.id,
        worldX: this.meteorNode.x,
        worldY: PIT_FLOOR_Y,
        worldZ: PIT_CENTER_Z + this.meteorNode.z,
        hp: this.meteorNode.hp,
        maxHp: this.meteorNode.maxHp,
        variantKey: this.meteorNode.variant.key,
        isMeteor: true,
        meteorWeatherId: this.meteorNode.meteorWeatherId ?? undefined,
      });
    }
    return list;
  }

  public setRespawnSpeedMult(mult: number): void {
    this.respawnSpeedMult = Math.max(0.5, mult);
  }

  public update(dtSec: number, elapsed: number, camera?: THREE.Camera): void {
    const allNodes = this.meteorNode.alive ? [...this.nodes, this.meteorNode] : this.nodes;
    for (const node of allNodes) {
      if (!node.isMeteor && node.id >= this.activeNodeCount) continue;
      if (!node.alive) {
        if (node.respawnTimer > 0) {
          node.respawnTimer -= dtSec * this.respawnSpeedMult;
          if (node.respawnTimer <= 0) {
            this.spawnNode(node, false);
          }
        }
        continue;
      }

      if (node.isMeteor && (node.dropY ?? 0) > 0) {
        node.dropY = Math.max(0, (node.dropY ?? 0) - dtSec * 28);
        node.root.position.y = node.dropY;
        if (node.dropY === 0 && this.group.visible) {
          node.squashAmt = 0.48;
          this.spawnShardsAt(node.x, node.z, 22);
        }
      }

      if (node.spawnScale < 1) {
        node.spawnScale = Math.min(1, node.spawnScale + dtSec * 4.5);
      }

      if (node.squashAmt > 0.001) {
        node.squashAmt = Math.max(0, node.squashAmt - dtSec * 2.5);
      }

      const hoverMult = (node.id === this.hoveredNodeId ? 1.1 : 1.0) * node.spawnScale;
      const flashing = node.flashTimer > 0;
      if (flashing) {
        node.flashTimer -= dtSec;
      }

      node.oreSprite.updateTransform(elapsed, node.phase, node.squashAmt, hoverMult, flashing, camera);

      if (node.geodeRing.visible) {
        node.geodeRing.rotation.z = elapsed * 0.8 + node.phase;
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
