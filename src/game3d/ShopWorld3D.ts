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
import { HellAltarEyeController } from './HellAltarEye3D';
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
  private readonly altarPedestals: AltarPedestalEntry[] = [];
  private readonly floatingShards: THREE.Mesh[] = [];
  private readonly altarParticles = new AltarParticleSystem();
  private readonly plazaWalkers = new Map<string, PlazaWalker>();
  private readonly plazaProjVec = new THREE.Vector3();
  private readonly hellEye = new HellAltarEyeController();
  private cyberPlaza!: ShopCyberPlazaHandle;
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

    const disposedGeos = new Set<THREE.BufferGeometry>();
    const disposedMats = new Set<THREE.Material>();
    for (const root of [this.shopGroup, this.altarGroup]) {
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
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
