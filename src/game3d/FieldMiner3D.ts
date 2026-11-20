import * as THREE from 'three';
import { getEnchantById } from '../game/GameData';
import { type WeatherId } from '../game/WeatherData';
import { type PitEventKind } from '../game/PitEventsDomain';
import { ChibiDef } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { disposeObject3D } from './ChestVaultStation3D';
import { OreVariantKey, STAGE_PEDESTAL_COUNT } from './MineWorldPalette';
import { OrePit3D, PIT_FLOOR_Y } from './OrePit3D';
import {
  createAnimeParticlePoints,
  ENCHANT_SECONDARY_COLOR,
  getEnchantSigilTexture,
  getPedestalHoloRingTexture,
} from './PlotPedestal3D';

/**
 * Shared ground halo + Enchant sigil + rising particle emitter for field Chibis
 * (reused across Mine Pit miners and Battle Tower arena fighters; no obstructing vertical aura shell).
 */
export class ChibiFieldFxController {
  private readonly hostGroup: THREE.Group;
  private readonly slotIndex: number;
  private readonly baseHaloGroup: THREE.Group;
  private readonly baseRingMesh: THREE.Mesh;
  private readonly baseRingMat: THREE.MeshBasicMaterial;
  private readonly rainbowTmp = new THREE.Color();

  private enchantId: string | null = null;
  private enchantRainbow = false;
  private readonly defaultAccentColor: string;
  private accentColorHex: string;
  private auraGroup: THREE.Group | null = null;
  private sigilMesh: THREE.Mesh | null = null;
  private sigilMat: THREE.MeshBasicMaterial | null = null;
  private moteGeo: THREE.BufferGeometry | null = null;
  private moteMat: THREE.ShaderMaterial | null = null;

  constructor(hostGroup: THREE.Group, defAccentColor: string, slotIndex: number) {
    this.hostGroup = hostGroup;
    this.slotIndex = slotIndex;
    this.defaultAccentColor = defAccentColor;
    this.accentColorHex = defAccentColor;
    this.baseHaloGroup = new THREE.Group();

    const holoTex = getPedestalHoloRingTexture();
    this.baseRingMat = new THREE.MeshBasicMaterial({
      ...(holoTex ? { map: holoTex } : {}),
      color: defAccentColor,
      transparent: true,
      opacity: 0.44,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.baseRingMesh = new THREE.Mesh(
      holoTex ? new THREE.PlaneGeometry(1.42, 1.42) : new THREE.RingGeometry(0.42, 0.56, 24),
      this.baseRingMat
    );
    this.baseRingMesh.rotation.x = -Math.PI / 2;
    this.baseRingMesh.position.y = 0.022;
    this.baseHaloGroup.add(this.baseRingMesh);
    this.hostGroup.add(this.baseHaloGroup);
  }

  public getAccentColor(): string {
    return this.accentColorHex;
  }

  public setEnchant(enchantId: string | null): void {
    if (enchantId === this.enchantId) return;
    this.clearEnchantFx();
    this.enchantId = enchantId;
    this.enchantRainbow = false;
    this.accentColorHex = this.defaultAccentColor;
    this.baseRingMat.opacity = 0.44;
    if (!enchantId) return;

    const enc = getEnchantById(enchantId);
    if (!enc) return;

    this.enchantRainbow = enc.rarity === 'rainbow';
    this.accentColorHex = enc.color;
    this.baseRingMat.opacity = 0.24;

    const secHex = ENCHANT_SECONDARY_COLOR[enchantId] ?? '#ffffff';
    const g = new THREE.Group();
    const sigilTex = getEnchantSigilTexture();

    this.sigilMat = new THREE.MeshBasicMaterial({
      ...(sigilTex ? { map: sigilTex } : {}),
      color: enc.color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sigilMesh = new THREE.Mesh(
      sigilTex ? new THREE.PlaneGeometry(1.62, 1.62) : new THREE.RingGeometry(0.46, 0.72, 24),
      this.sigilMat
    );
    this.sigilMesh.rotation.x = -Math.PI / 2;
    this.sigilMesh.position.y = 0.028;
    g.add(this.sigilMesh);

    const innerWash = new THREE.Mesh(
      sigilTex ? new THREE.PlaneGeometry(1.12, 1.12) : new THREE.RingGeometry(0.24, 0.42, 20),
      new THREE.MeshBasicMaterial({
        ...(sigilTex ? { map: sigilTex } : {}),
        color: secHex,
        transparent: true,
        opacity: 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    innerWash.rotation.x = -Math.PI / 2;
    innerWash.position.y = 0.025;
    g.add(innerWash);

    // Particles only around active field chibis (keeps face & target ore unobstructed)
    const particles = createAnimeParticlePoints(enc.color, secHex, {
      count: 12,
      minRadius: 0.42,
      maxRadius: 0.68,
      baseY: 0.08,
      sizeScale: 0.92,
    });
    this.moteGeo = particles.geo;
    this.moteMat = particles.mat;
    g.add(particles.points);

    this.auraGroup = g;
    this.hostGroup.add(g);
  }

  private clearEnchantFx(): void {
    if (!this.auraGroup) return;
    this.hostGroup.remove(this.auraGroup);
    disposeObject3D(this.auraGroup);
    this.moteGeo?.dispose();
    this.moteMat?.dispose();
    this.auraGroup = null;
    this.sigilMesh = null;
    this.sigilMat = null;
    this.moteGeo = null;
    this.moteMat = null;
  }

  public update(elapsed: number): void {
    this.baseRingMesh.rotation.z = elapsed * 0.14 + this.slotIndex * 0.85;
    if (this.sigilMesh) {
      this.sigilMesh.rotation.z = -elapsed * 0.12 - this.slotIndex * 0.6;
    }
    if (this.moteMat) {
      this.moteMat.uniforms.uTime.value = elapsed;
    }
    if (this.enchantRainbow) {
      const hue = (elapsed * 0.18 + this.slotIndex * 0.14) % 1;
      this.rainbowTmp.setHSL(hue, 0.92, 0.62);
      this.accentColorHex = `#${this.rainbowTmp.getHexString()}`;
      if (this.sigilMat) {
        this.sigilMat.color.copy(this.rainbowTmp);
      }
      if (this.moteMat) {
        this.moteMat.uniforms.uColorA.value.copy(this.rainbowTmp);
        this.rainbowTmp.setHSL((hue + 0.18) % 1, 0.96, 0.72);
        this.moteMat.uniforms.uColorB.value.copy(this.rainbowTmp);
      }
    }
  }

  public dispose(): void {
    this.clearEnchantFx();
    this.hostGroup.remove(this.baseHaloGroup);
    disposeObject3D(this.baseHaloGroup);
  }
}

export class FieldMiner3D {
  public readonly sprite: ChibiSprite3D;
  public readonly def: ChibiDef;
  public readonly slotIndex: number;

  private targetNodeId = -1;
  private attackCooldown = 0;
  private comboStep = 0;
  private dmg = 10;
  private walkSpeed = 2.6;
  private attackInterval = 0.85;
  private readonly fx: ChibiFieldFxController;

  constructor(def: ChibiDef, slotIndex: number) {
    this.def = def;
    this.dmg = def.baseDps;
    this.slotIndex = slotIndex;
    this.sprite = new ChibiSprite3D(def, 1.95, slotIndex * 1.1);

    const spreadX = (slotIndex - (STAGE_PEDESTAL_COUNT - 1) / 2) * 1.15;
    this.sprite.group.position.set(spreadX, PIT_FLOOR_Y, -1.05);
    this.sprite.setAnimState('idle');

    this.fx = new ChibiFieldFxController(this.sprite.group, def.accentColor, slotIndex);
  }

  public setEnchant(enchantId: string | null): void {
    this.fx.setEnchant(enchantId);
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
    onOreBroken?: (variantKey: OreVariantKey, meteorWeatherId?: WeatherId, pitEventKind?: PitEventKind) => void,
    onOreHit?: (dmg: number, wx: number, wy: number, wz: number) => void,
    renderVisuals = true
  ): void {
    if (renderVisuals) {
      this.fx.update(elapsed);
      this.sprite.setAccentColor(this.fx.getAccentColor());
    }

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
        this.sprite.setAnimState('dash'); // walk.webp
      }
    } else {
      if (renderVisuals && Math.abs(target.worldX - pos.x) > 0.05) {
        this.sprite.setFacing(target.worldX >= pos.x ? 1 : -1);
      }
      if (renderVisuals) {
        this.sprite.setAnimState('attack'); // attack.webp
      }
      this.attackCooldown -= dtSec;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.attackInterval;
        const step = this.comboStep;
        const accentColor = this.fx.getAccentColor();
        if (renderVisuals) {
          this.comboStep = (this.comboStep + 1) % 3;
          this.sprite.triggerAttack(Math.min(0.44, this.attackInterval * 0.75), step);
        }
        const res = pit.hitNode(
          target.id,
          this.dmg * this.attackInterval,
          false,
          undefined,
          renderVisuals
            ? {
                accentColor,
                attackerX: pos.x,
                attackerZ: pos.z,
                comboStep: step,
              }
            : undefined
        );
        if (res) {
          if (renderVisuals) {
            onOreHit?.(res.dmgDealt, target.worldX, target.worldY + 0.95, target.worldZ);
          }
          if (res.broken) {
            this.targetNodeId = -1;
            onOreBroken?.(res.variantKey, res.meteorWeatherId, res.pitEventKind);
          }
        }
      }
    }

    if (renderVisuals) {
      this.sprite.update(dtSec, elapsed, camera);
    }
  }

  public dispose(): void {
    this.fx.dispose();
    this.sprite.dispose();
  }
}
