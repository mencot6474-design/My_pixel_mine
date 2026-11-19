import * as THREE from 'three';
import { FUSION_RECIPES, FusionRecipeDef } from '../game/FusionData';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { getChibiById } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';

interface MaterialPedestalSlot {
  group: THREE.Group;
  rimMat: THREE.MeshStandardMaterial;
  conduitMesh: THREE.Mesh;
  conduitMat: THREE.MeshBasicMaterial;
  sprite: ChibiSprite3D | null;
  chibiId: string | null;
  pos: THREE.Vector3;
}

interface EnergyOrb {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  from: THREE.Vector3;
  age: number;
  dur: number;
  arcH: number;
}

const MAX_MAT_SLOTS = 3;

/**
 * 3D Outer-Space Cyber-Synchro Fusion Chamber:
 * 2-3 material pedestals with live 3D Chibis wired by energy conduits into a central
 * Fusion Core pedestal displaying the target Fusion Chibi, complete with convergence
 * animation and 5-layer AttackImpactFxController shatter reveal.
 */
export class FusionWorld3D {
  public readonly group = new THREE.Group();

  private readonly impactFx = new AttackImpactFxController({ floorY: 0.14 });
  private readonly ownedGeos: THREE.BufferGeometry[] = [];
  private readonly ownedMats: THREE.Material[] = [];

  private readonly centerRimMat: THREE.MeshStandardMaterial;
  private readonly innerRingMesh: THREE.Mesh;
  private readonly outerRingMesh: THREE.Mesh;
  private readonly haloRingMesh: THREE.Mesh;
  private readonly innerRingMat: THREE.MeshBasicMaterial;
  private readonly outerRingMat: THREE.MeshBasicMaterial;
  private readonly haloRingMat: THREE.MeshBasicMaterial;
  private readonly starField: THREE.Points;

  private readonly materialSlots: MaterialPedestalSlot[] = [];
  private readonly resultMount = new THREE.Group();
  private resultSprite: ChibiSprite3D | null = null;
  private resultChibiId: string | null = null;
  private activeRecipeId: string | null = null;

  private readonly orbGeo = new THREE.SphereGeometry(0.14, 10, 10);
  private readonly energyOrbs: EnergyOrb[] = [];
  private fusionAnimTimer = 0;
  private fusionAnimDur = 1.15;
  private fusionBurstFired = false;
  private fusionAccentHex = '#22d3ee';
  private fusionGlowHex = '#d946ef';
  private onFusionAnimComplete: (() => void) | null = null;
  private revealPopTimer = 0;

  constructor() {
    this.group.visible = false;
    this.group.add(this.impactFx.group);

    // 1. Cosmic Starfield
    const starCount = 260;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 18 + Math.random() * 28;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.7 + 1.5;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 2;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: '#bae6fd',
      size: 0.22,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ownedGeos.push(starGeo);
    this.ownedMats.push(starMat);
    this.starField = new THREE.Points(starGeo, starMat);
    this.group.add(this.starField);

    // 2. Main Cyber-Synchro Deck Floor
    const deckGeo = new THREE.CylinderGeometry(7.2, 7.8, 0.4, 8);
    const deckMat = new THREE.MeshStandardMaterial({
      color: '#0b1121',
      roughness: 0.65,
      metalness: 0.45,
      flatShading: true,
    });
    this.ownedGeos.push(deckGeo);
    this.ownedMats.push(deckMat);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = -0.2;
    this.group.add(deck);

    // 3. Central Elevated Fusion Core Pedestal
    const baseGeo = new THREE.CylinderGeometry(1.55, 1.9, 0.56, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: '#15203b',
      roughness: 0.42,
      metalness: 0.6,
      flatShading: true,
    });
    const rimGeo = new THREE.TorusGeometry(1.58, 0.08, 10, 32);
    this.centerRimMat = new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#22d3ee',
      emissiveIntensity: 1.15,
      roughness: 0.2,
      metalness: 0.3,
    });
    this.ownedGeos.push(baseGeo, rimGeo);
    this.ownedMats.push(baseMat, this.centerRimMat);

    const centerBase = new THREE.Mesh(baseGeo, baseMat);
    centerBase.position.y = 0.28;
    this.group.add(centerBase);

    const centerRim = new THREE.Mesh(rimGeo, this.centerRimMat);
    centerRim.rotation.x = Math.PI / 2;
    centerRim.position.y = 0.56;
    this.group.add(centerRim);

    // Rotating Synchro Rings
    const innerRingGeo = new THREE.RingGeometry(2.05, 2.22, 40);
    this.innerRingMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.innerRingMesh = new THREE.Mesh(innerRingGeo, this.innerRingMat);
    this.innerRingMesh.rotation.x = -Math.PI / 2;
    this.innerRingMesh.position.y = 0.06;
    this.group.add(this.innerRingMesh);

    const outerRingGeo = new THREE.RingGeometry(4.45, 4.62, 48);
    this.outerRingMat = new THREE.MeshBasicMaterial({
      color: '#d946ef',
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.outerRingMesh = new THREE.Mesh(outerRingGeo, this.outerRingMat);
    this.outerRingMesh.rotation.x = -Math.PI / 2;
    this.outerRingMesh.position.y = 0.05;
    this.group.add(this.outerRingMesh);

    // Vertical Distant Astrolabe Halo Ring behind Center Core
    const haloGeo = new THREE.TorusGeometry(3.4, 0.06, 10, 48);
    this.haloRingMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloRingMesh = new THREE.Mesh(haloGeo, this.haloRingMat);
    this.haloRingMesh.position.set(0, 3.1, -3.2);
    this.group.add(this.haloRingMesh);

    this.ownedGeos.push(innerRingGeo, outerRingGeo, haloGeo);
    this.ownedMats.push(this.innerRingMat, this.outerRingMat, this.haloRingMat);

    // Result Chibi mount above center pedestal
    this.resultMount.position.set(0, 0.62, 0);
    this.group.add(this.resultMount);

    // 4. Create 3 Outer Material Pedestals + Energy Conduits
    const matBaseGeo = new THREE.CylinderGeometry(0.95, 1.18, 0.36, 8);
    const matRimGeo = new THREE.TorusGeometry(0.98, 0.055, 8, 24);
    const conduitGeo = new THREE.PlaneGeometry(0.18, 1.0);
    this.ownedGeos.push(matBaseGeo, matRimGeo, conduitGeo);

    for (let i = 0; i < MAX_MAT_SLOTS; i++) {
      const slotGroup = new THREE.Group();
      const base = new THREE.Mesh(matBaseGeo, baseMat);
      base.position.y = 0.18;
      slotGroup.add(base);

      const rimMat = new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#38bdf8',
        emissiveIntensity: 0.9,
        roughness: 0.25,
        metalness: 0.3,
      });
      this.ownedMats.push(rimMat);
      const rim = new THREE.Mesh(matRimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.36;
      slotGroup.add(rim);

      const conduitMat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.ownedMats.push(conduitMat);
      const conduitMesh = new THREE.Mesh(conduitGeo, conduitMat);
      conduitMesh.rotation.x = -Math.PI / 2;
      conduitMesh.position.y = 0.04;
      this.group.add(conduitMesh);
      this.group.add(slotGroup);

      this.materialSlots.push({
        group: slotGroup,
        rimMat,
        conduitMesh,
        conduitMat,
        sprite: null,
        chibiId: null,
        pos: new THREE.Vector3(),
      });
    }

    // Default initial preview
    if (FUSION_RECIPES[0]) {
      this.syncRecipe(FUSION_RECIPES[0], [false, false]);
    }
  }

  public isAnimating(): boolean {
    return this.fusionAnimTimer > 0;
  }

  public cancelAnimation(): void {
    this.fusionAnimTimer = 0;
    this.fusionBurstFired = false;
    this.onFusionAnimComplete = null;
    for (const orb of this.energyOrbs) {
      this.group.remove(orb.mesh);
      orb.mat.dispose();
    }
    this.energyOrbs.length = 0;
  }

  public syncRecipe(recipe: FusionRecipeDef, ingredientReadyFlags: readonly boolean[]): void {
    const recipeChanged = this.activeRecipeId !== recipe.id;
    this.activeRecipeId = recipe.id;
    this.fusionAccentHex = recipe.accentColor;
    this.fusionGlowHex = recipe.glowColor;

    this.centerRimMat.color.set(recipe.accentColor);
    this.centerRimMat.emissive.set(recipe.accentColor);
    this.innerRingMat.color.set(recipe.accentColor);
    this.outerRingMat.color.set(recipe.glowColor);
    this.haloRingMat.color.set(recipe.accentColor);

    // Position 2 or 3 material pedestals symmetrically around center
    const count = recipe.requiredMiners.length;
    const coords: Array<[number, number]> =
      count === 2
        ? [
            [-3.55, 1.1],
            [3.55, 1.1],
          ]
        : [
            [-3.75, 1.25],
            [3.75, 1.25],
            [0, -3.35],
          ];

    for (let i = 0; i < MAX_MAT_SLOTS; i++) {
      const slot = this.materialSlots[i];
      if (i >= count) {
        slot.group.visible = false;
        slot.conduitMesh.visible = false;
        continue;
      }
      const ing = recipe.requiredMiners[i];
      const ready = Boolean(ingredientReadyFlags[i]);
      const [px, pz] = coords[i];
      slot.pos.set(px, 0.38, pz);
      slot.group.position.set(px, 0, pz);
      slot.group.visible = true;

      // Orient floor energy conduit from pedestal to center (0, 0)
      const dist = Math.hypot(px, pz);
      slot.conduitMesh.visible = true;
      slot.conduitMesh.position.set(px * 0.5, 0.04, pz * 0.5);
      slot.conduitMesh.scale.set(1, Math.max(0.5, dist - 2.1), 1);
      slot.conduitMesh.rotation.set(-Math.PI / 2, 0, Math.atan2(px, pz));

      const ringColor = ready ? '#4ade80' : '#475569';
      slot.rimMat.color.set(ringColor);
      slot.rimMat.emissive.set(ringColor);
      slot.rimMat.emissiveIntensity = ready ? 1.15 : 0.35;
      slot.conduitMat.color.set(ready ? recipe.accentColor : '#334155');
      slot.conduitMat.opacity = ready ? 0.72 : 0.25;

      if (slot.chibiId !== ing.chibiId || recipeChanged) {
        if (slot.sprite) {
          slot.group.remove(slot.sprite.group);
          slot.sprite.dispose();
          slot.sprite = null;
        }
        slot.chibiId = ing.chibiId;
        const def = getChibiById(ing.chibiId);
        if (def) {
          const sp = new ChibiSprite3D(def, 2.05);
          sp.group.position.set(0, 0.38, 0);
          sp.setAccentColor(def.accentColor);
          slot.group.add(sp.group);
          slot.sprite = sp;
        }
      }
    }

    // Update Center Result Fusion Chibi
    if (this.resultChibiId !== recipe.resultChibiId) {
      if (this.resultSprite) {
        this.resultMount.remove(this.resultSprite.group);
        this.resultSprite.dispose();
        this.resultSprite = null;
      }
      this.resultChibiId = recipe.resultChibiId;
      const resDef = getChibiById(recipe.resultChibiId);
      if (resDef) {
        const sp = new ChibiSprite3D(resDef, 2.85);
        sp.setAccentColor(recipe.accentColor);
        this.resultMount.add(sp.group);
        this.resultSprite = sp;
      }
    }
  }

  public triggerFusionAnimation(recipe: FusionRecipeDef, onComplete: () => void): void {
    this.cancelAnimation();
    this.fusionAccentHex = recipe.accentColor;
    this.fusionGlowHex = recipe.glowColor;
    this.fusionAnimTimer = this.fusionAnimDur;
    this.fusionBurstFired = false;
    this.onFusionAnimComplete = onComplete;

    // Spawn converging energy orbs from each active material pedestal toward center
    const count = recipe.requiredMiners.length;
    for (let s = 0; s < count; s++) {
      const slot = this.materialSlots[s];
      for (let k = 0; k < 5; k++) {
        const mat = new THREE.MeshBasicMaterial({
          color: k % 2 === 0 ? recipe.accentColor : '#ffffff',
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(this.orbGeo, mat);
        mesh.position.copy(slot.pos).add(new THREE.Vector3(0, 0.9, 0));
        this.group.add(mesh);
        this.energyOrbs.push({
          mesh,
          mat,
          from: slot.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5)),
          age: -k * 0.11,
          dur: 0.65,
          arcH: 1.2 + Math.random() * 0.9,
        });
      }
    }
  }

  public update(dtSec: number, elapsed: number, camera?: THREE.Camera): void {
    if (!this.group.visible) return;
    const dt = Math.min(0.1, Math.max(0, dtSec));
    const spinBoost = this.fusionAnimTimer > 0 ? 5.5 : 1.0;

    this.starField.rotation.y = elapsed * 0.025;
    this.innerRingMesh.rotation.z += dt * 0.75 * spinBoost;
    this.outerRingMesh.rotation.z -= dt * 0.45 * spinBoost;
    this.haloRingMesh.rotation.z = elapsed * 0.32 * spinBoost;

    // Levitate center Fusion Chibi
    const popScale = this.revealPopTimer > 0 ? 1 + Math.sin((this.revealPopTimer / 0.45) * Math.PI) * 0.24 : 1;
    if (this.revealPopTimer > 0) this.revealPopTimer = Math.max(0, this.revealPopTimer - dt);
    this.resultMount.position.y = 0.66 + Math.sin(elapsed * 2.4) * 0.12;
    this.resultMount.scale.setScalar(popScale);

    if (camera) {
      if (this.resultSprite) {
        this.resultSprite.update(dt, elapsed, camera);
      }
      for (const slot of this.materialSlots) {
        if (slot.group.visible && slot.sprite) {
          slot.sprite.update(dt, elapsed, camera);
        }
      }
    }

    // Step converging energy orbs
    for (let i = this.energyOrbs.length - 1; i >= 0; i--) {
      const orb = this.energyOrbs[i];
      orb.age += dt;
      if (orb.age < 0) {
        orb.mesh.visible = false;
        continue;
      }
      orb.mesh.visible = true;
      const p = orb.age / orb.dur;
      if (p >= 1) {
        this.group.remove(orb.mesh);
        orb.mat.dispose();
        this.energyOrbs.splice(i, 1);
        continue;
      }
      const ease = p * p;
      orb.mesh.position.set(
        THREE.MathUtils.lerp(orb.from.x, 0, ease),
        THREE.MathUtils.lerp(orb.from.y, 1.55, ease) + Math.sin(p * Math.PI) * orb.arcH,
        THREE.MathUtils.lerp(orb.from.z, 0, ease)
      );
      orb.mesh.scale.setScalar(1.25 - p * 0.55);
      orb.mat.opacity = 1 - p * 0.35;
    }

    // Step Fusion convergence timer & shatter climax
    if (this.fusionAnimTimer > 0) {
      this.fusionAnimTimer = Math.max(0, this.fusionAnimTimer - dt);
      const elapsedAnim = this.fusionAnimDur - this.fusionAnimTimer;
      if (!this.fusionBurstFired && elapsedAnim >= 0.78) {
        this.fusionBurstFired = true;
        this.revealPopTimer = 0.45;
        this.impactFx.spawnShatter({
          targetX: 0,
          targetY: 1.65,
          targetZ: 0,
          oreColor: this.fusionAccentHex,
          secondaryColor: this.fusionGlowHex,
          isMeteor: true,
          camera,
        });
      }
      if (this.fusionAnimTimer <= 0) {
        const cb = this.onFusionAnimComplete;
        this.onFusionAnimComplete = null;
        cb?.();
      }
    }

    this.impactFx.update(dt, camera);
  }

  public dispose(): void {
    this.cancelAnimation();
    this.impactFx.dispose();
    if (this.resultSprite) {
      this.resultMount.remove(this.resultSprite.group);
      this.resultSprite.dispose();
      this.resultSprite = null;
    }
    for (const slot of this.materialSlots) {
      if (slot.sprite) {
        slot.group.remove(slot.sprite.group);
        slot.sprite.dispose();
        slot.sprite = null;
      }
    }
    this.orbGeo.dispose();
    for (const g of this.ownedGeos) g.dispose();
    for (const m of this.ownedMats) m.dispose();
    this.ownedGeos.length = 0;
    this.ownedMats.length = 0;
  }
}
