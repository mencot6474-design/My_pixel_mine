import * as THREE from 'three';
import { getEnchantById } from '../game/GameData';
import { ChibiAnimState, ChibiDef } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';

export class PlotPedestal3D {
  public readonly group = new THREE.Group();
  public readonly hitMesh: THREE.Mesh;
  public readonly index: number;

  private readonly ringMat: THREE.MeshStandardMaterial;
  private hovered = false;
  private chibiDef: ChibiDef | null = null;
  private chibiSprite: ChibiSprite3D | null = null;

  private enchantId: string | null = null;
  private auraGroup: THREE.Group | null = null;
  private auraHalo: THREE.Mesh | null = null;
  private auraGroundMat: THREE.MeshBasicMaterial | null = null;
  private auraMoteGeo: THREE.BufferGeometry | null = null;
  private auraMotes: THREE.Points | null = null;

  constructor(index: number, x: number, z: number) {
    this.index = index;
    this.group.position.set(x, 0, z);

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.58,
      metalness: 0.12,
    });
    const lowerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.76, 0.14, 10), baseMat);
    lowerBase.position.y = 0.07;
    lowerBase.receiveShadow = true;
    lowerBase.castShadow = true;

    const upperCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.64, 0.14, 10),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.1 })
    );
    upperCap.position.y = 0.21;
    upperCap.receiveShadow = true;
    upperCap.castShadow = true;
    this.group.add(lowerBase, upperCap);

    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.25,
    });
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.038, 8, 24), this.ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.29;
    this.group.add(ringMesh);

    const hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.76, 1.9, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitMesh.position.y = 0.95;
    hitMesh.userData = { kind: 'pedestal', slotIndex: index };
    this.hitMesh = hitMesh;
    this.group.add(hitMesh);
  }

  public setChibi(def: ChibiDef | null): void {
    if (this.chibiSprite) {
      this.group.remove(this.chibiSprite.group);
      this.chibiSprite.dispose();
      this.chibiSprite = null;
    }

    this.chibiDef = def;
    if (!def) {
      this.setEnchant(null);
      this.ringMat.color.setHex(0xf59e0b);
      this.ringMat.emissive.setHex(0xf59e0b);
      return;
    }

    if (!this.enchantId) {
      this.ringMat.color.set(def.accentColor);
      this.ringMat.emissive.set(def.accentColor);
    }

    const sprite = new ChibiSprite3D(def, 2.05, this.index * 0.75);
    sprite.group.position.y = 0.28;
    sprite.setAnimState('aura');
    this.chibiSprite = sprite;
    this.group.add(sprite.group);
  }

  public setEnchant(enchantId: string | null): void {
    const targetId = this.chibiDef ? enchantId : null;
    if (targetId === this.enchantId) return;

    if (this.auraGroup) {
      this.group.remove(this.auraGroup);
      this.auraGroup = null;
      this.auraHalo = null;
      this.auraGroundMat = null;
      this.auraMoteGeo?.dispose();
      this.auraMoteGeo = null;
      this.auraMotes = null;
    }

    this.enchantId = targetId;
    if (!targetId || !this.chibiDef) {
      if (this.chibiDef) {
        this.ringMat.color.set(this.chibiDef.accentColor);
        this.ringMat.emissive.set(this.chibiDef.accentColor);
      } else {
        this.ringMat.color.setHex(0xf59e0b);
        this.ringMat.emissive.setHex(0xf59e0b);
      }
      this.ringMat.emissiveIntensity = this.hovered ? 0.85 : 0.35;
      return;
    }

    const enc = getEnchantById(targetId);
    if (!enc) return;

    this.ringMat.color.set(enc.color);
    this.ringMat.emissive.set(enc.color);
    this.ringMat.emissiveIntensity = 0.82;

    const auraGroup = new THREE.Group();

    const groundMat = new THREE.MeshBasicMaterial({
      color: enc.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const groundRing = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.88, 32), groundMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.305;
    auraGroup.add(groundRing);
    this.auraGroundMat = groundMat;

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.032, 8, 32),
      new THREE.MeshBasicMaterial({
        color: enc.color,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.rotation.x = Math.PI * 0.42;
    halo.position.y = 0.78;
    auraGroup.add(halo);
    this.auraHalo = halo;

    // Lightweight rising enchant aura sparks around the Chibi
    const moteCount = 18;
    const pos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const a = (i / moteCount) * Math.PI * 2;
      const r = 0.45 + (i % 3) * 0.14;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.36 + (i / moteCount) * 1.65;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const motes = new THREE.Points(
      moteGeo,
      new THREE.PointsMaterial({
        color: enc.color,
        size: 0.16,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    auraGroup.add(motes);
    this.auraMoteGeo = moteGeo;
    this.auraMotes = motes;

    this.auraGroup = auraGroup;
    this.group.add(auraGroup);
  }

  public getChibi(): ChibiDef | null {
    return this.chibiDef;
  }

  public getEnchantId(): string | null {
    return this.enchantId;
  }

  public setChibiAnimState(state: ChibiAnimState): void {
    this.chibiSprite?.setAnimState(state);
  }

  public triggerChibiShowcase(_durationSec = 1.4): void {
    this.chibiSprite?.setAnimState('aura');
  }

  public setHovered(hover: boolean): void {
    this.hovered = hover;
    this.ringMat.emissiveIntensity = hover ? 0.95 : this.enchantId ? 0.82 : 0.35;
  }

  public update(dtSec: number, elapsed = 0, camera?: THREE.Camera): void {
    const targetScale = this.hovered ? 1.07 : 1;
    this.group.scale.lerp(new THREE.Vector3(targetScale, 1, targetScale), Math.min(1, dtSec * 12));
    if (this.chibiSprite && camera) {
      this.chibiSprite.update(dtSec, elapsed, camera);
    }
    if (this.auraGroup) {
      const phase = elapsed + this.index * 0.65;
      if (this.auraHalo) {
        this.auraHalo.rotation.z = phase * 1.9;
        this.auraHalo.position.y = 0.78 + Math.sin(phase * 2.0) * 0.06;
      }
      if (this.auraGroundMat) {
        this.auraGroundMat.opacity = 0.42 + Math.sin(phase * 3.2) * 0.16;
      }
      if (this.auraMoteGeo && this.auraMotes) {
        const attr = this.auraMoteGeo.attributes.position as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const count = arr.length / 3;
        for (let i = 0; i < count; i++) {
          let y = arr[i * 3 + 1] + dtSec * (0.65 + (i % 3) * 0.22);
          if (y > 2.05) y = 0.34;
          arr[i * 3 + 1] = y;
        }
        attr.needsUpdate = true;
        this.auraMotes.rotation.y = phase * 0.8;
      }
    }
  }
}
