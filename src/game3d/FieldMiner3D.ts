import * as THREE from 'three';
import { getEnchantById } from '../game/GameData';
import { createEnchantAura3D } from './AuraModels3D';
import { ChibiDef } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { OreVariantKey, STAGE_PEDESTAL_COUNT } from './MineWorldPalette';
import { OrePit3D, PIT_FLOOR_Y } from './OrePit3D';

export class FieldMiner3D {
  public readonly sprite: ChibiSprite3D;
  public readonly def: ChibiDef;
  public readonly slotIndex: number;

  private targetNodeId = -1;
  private attackCooldown = 0;
  private dmg = 10;
  private walkSpeed = 2.6;
  private attackInterval = 0.85;
  private enchantId: string | null = null;
  private auraGroup: THREE.Group | null = null;
  private auraCrest: THREE.Group | null = null;

  constructor(def: ChibiDef, slotIndex: number) {
    this.def = def;
    this.dmg = def.baseDps;
    this.slotIndex = slotIndex;
    this.sprite = new ChibiSprite3D(def, 1.95, slotIndex * 1.1);

    const spreadX = (slotIndex - (STAGE_PEDESTAL_COUNT - 1) / 2) * 1.15;
    this.sprite.group.position.set(spreadX, PIT_FLOOR_Y, -1.05);
    this.sprite.setAnimState('idle');
  }

  public setEnchant(enchantId: string | null): void {
    if (enchantId === this.enchantId) return;
    if (this.auraGroup) {
      this.sprite.group.remove(this.auraGroup);
      this.auraGroup = null;
      this.auraCrest = null;
    }
    this.enchantId = enchantId;
    if (!enchantId) return;

    const enc = getEnchantById(enchantId);
    if (!enc) return;

    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.68, 24),
      new THREE.MeshBasicMaterial({
        color: enc.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    g.add(ring);

    const crest = createEnchantAura3D(enc.id, 0.44);
    crest.position.set(0, 2.38, 0);
    g.add(crest);
    this.auraCrest = crest;

    this.auraGroup = g;
    this.sprite.group.add(g);
  }

  public setCombatStats(dmg: number, speed: number, miningMult: number): void {
    this.dmg = Math.max(1, dmg);
    this.walkSpeed = 2.2 + (speed - 10) * 0.12;
    this.attackInterval = Math.max(0.28, 0.85 / Math.max(1, miningMult));
  }

  public update(
    dtSec: number,
    elapsed: number,
    camera: THREE.Camera,
    pit: OrePit3D,
    onOreBroken?: (variantKey: OreVariantKey) => void,
    onOreHit?: (dmg: number, wx: number, wy: number, wz: number) => void,
    renderVisuals = true
  ): void {
    const aliveNodes = pit.getAliveNodesInfo();
    let target = aliveNodes.find((n) => n.id === this.targetNodeId);

    if (!target && aliveNodes.length > 0) {
      // Pick nearest or slot-distributed live ore node
      const pos = this.sprite.group.position;
      let best = aliveNodes[0];
      let bestDist = Infinity;
      for (const n of aliveNodes) {
        const dx = n.worldX - pos.x;
        const dz = n.worldZ - pos.z;
        const d = dx * dx + dz * dz;
        if (d < bestDist) {
          bestDist = d;
          best = n;
        }
      }
      this.targetNodeId = best.id;
      target = best;
    }

    if (!target) {
      this.targetNodeId = -1;
      if (renderVisuals) {
        this.sprite.setAnimState('idle');
        if (this.auraCrest) {
          this.auraCrest.rotation.y = elapsed * 2.0 + this.slotIndex;
          this.auraCrest.position.y = 2.38 + Math.sin(elapsed * 2.8 + this.slotIndex) * 0.06;
        }
        this.sprite.update(dtSec, elapsed, camera);
      }
      return;
    }

    const pos = this.sprite.group.position;
    // Stand on the left/right flanking edge of the ore so the chibi body stays cleanly outside
    // the boulder mesh and only the horizontal slash arc enters the ore.
    const flankSlots: readonly { side: 1 | -1; rx: number; oz: number }[] = [
      { side: -1, rx: 1.26, oz: 0.36 },
      { side: 1, rx: 1.26, oz: 0.36 },
      { side: -1, rx: 1.32, oz: 0.54 },
      { side: 1, rx: 1.32, oz: 0.54 },
      { side: -1, rx: 1.44, oz: 0.22 },
    ];
    const flank = flankSlots[this.slotIndex % flankSlots.length];
    const geodeExtra = target.variantKey === 'geode' ? 0.14 : 0;
    const radiusX = flank.rx + geodeExtra;
    let side = flank.side;
    if (target.worldX + side * radiusX < -4.95 || target.worldX + side * radiusX > 4.95) {
      side = (side * -1) as 1 | -1;
    }
    const desiredX = target.worldX + side * radiusX;
    const desiredZ = target.worldZ + flank.oz + geodeExtra * 0.5;

    const dx = desiredX - pos.x;
    const dz = desiredZ - pos.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.22) {
      if (renderVisuals && Math.abs(dx) > 0.05) {
        this.sprite.setFacing(dx >= 0 ? 1 : -1);
      }
      const step = Math.min(dist, this.walkSpeed * dtSec);
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
      pos.y = PIT_FLOOR_Y;
      if (renderVisuals) {
        this.sprite.setAnimState('dash'); // walk.png
      }
    } else {
      if (renderVisuals && Math.abs(target.worldX - pos.x) > 0.05) {
        this.sprite.setFacing(target.worldX >= pos.x ? 1 : -1);
      }
      if (renderVisuals) {
        this.sprite.setAnimState('attack'); // attack.png
      }
      this.attackCooldown -= dtSec;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.attackInterval;
        if (renderVisuals) {
          this.sprite.triggerAttack(Math.min(0.44, this.attackInterval * 0.75));
        }
        const res = pit.hitNode(target.id, this.dmg * this.attackInterval, false);
        if (res) {
          if (renderVisuals) {
            onOreHit?.(res.dmgDealt, target.worldX, target.worldY + 0.95, target.worldZ);
          }
          if (res.broken) {
            this.targetNodeId = -1;
            onOreBroken?.(res.variantKey);
          }
        }
      }
    }

    if (renderVisuals) {
      if (this.auraCrest) {
        this.auraCrest.rotation.y = elapsed * 2.0 + this.slotIndex;
        this.auraCrest.position.y = 2.38 + Math.sin(elapsed * 2.8 + this.slotIndex) * 0.06;
      }
      this.sprite.update(dtSec, elapsed, camera);
    }
  }

  public dispose(): void {
    this.sprite.dispose();
  }
}
