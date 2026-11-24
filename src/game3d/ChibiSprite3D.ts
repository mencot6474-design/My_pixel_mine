import * as THREE from 'three';
import {
  ChibiAnimState,
  ChibiDef,
  LEFT_FACING_ATTACK_IDS,
  LEFT_FACING_WALK_IDS,
} from './ChibiCatalog';
import { getWindupGlintTexture } from './ProceduralTextures3D';
import {
  type ChibiBackAttachmentHandle,
  createChibiBackAttachments,
  disposeChibiBackAttachments,
  getSoftContactShadowTexture,
  type LoadedPoseMeta,
  loadPoseMeta,
  stateToPoseUrl,
  stepChibiAttackComboKinematics,
  updateChibiBackAttachmentGroup,
  updateOmegaHandBlitzWeapon,
} from './ChibiBackAttachments3D';
import {
  buildTierMotionWaypoints,
  getRaritySecondaryColor,
  sampleTierMotionWaypoints,
  type TierMotionWaypoint,
  type WorldPoint3,
} from './TierAttackVfx3D';

const BASE_CHIBI_PIXEL_HEIGHT = 350;

export class ChibiSprite3D {
  public readonly group = new THREE.Group();
  private readonly spritePivot = new THREE.Group();
  private readonly animGroup = new THREE.Group();
  private sharedSpriteGeo: THREE.PlaneGeometry;
  private readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly depthMaterial: THREE.MeshDepthMaterial;
  private readonly shadowDisc: THREE.Mesh;
  private readonly shadowMat: THREE.MeshBasicMaterial;
  private readonly baseShadowOpacity: number;
  private readonly ghostMeshes: THREE.Mesh[] = [];
  private readonly ghostMats: THREE.MeshBasicMaterial[] = [];
  private readonly blitzGhosts: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    life: number;
    maxLife: number;
    face: 1 | -1;
    rz: number;
    baseScale: number;
  }> = [];
  private readonly blitzCloneMesh: THREE.Mesh;
  private readonly blitzCloneMat: THREE.MeshBasicMaterial;
  private readonly blitzHeroPivot = new THREE.Group();
  private readonly blitzHeroMesh: THREE.Mesh;
  private readonly blitzHeroMat: THREE.MeshBasicMaterial;
  private readonly defaultBlitzHeroGeo: THREE.PlaneGeometry;
  private readonly blitzPoseMetas: Partial<Record<ChibiAnimState, LoadedPoseMeta>> = {};
  private readonly blitzPoseGeos: Partial<Record<ChibiAnimState, THREE.PlaneGeometry>> = {};
  private readonly glintMesh: THREE.Mesh;
  private readonly glintMat: THREE.MeshBasicMaterial;
  private readonly backAttachments: ChibiBackAttachmentHandle;

  private readonly def: ChibiDef;
  private readonly spriteHeight: number;
  private readonly phaseOffset: number;
  private readonly worldPos = new THREE.Vector3();
  private readonly blitzAnchorWorld = new THREE.Vector3();
  private readonly blitzScaleWorld = new THREE.Vector3(1, 1, 1);

  private animState: ChibiAnimState = 'idle';
  private facing: 1 | -1 = 1;
  private accentColorHex: string;
  private secondaryColorHex: string;
  private showcaseTimer = 0;
  private castPulseTimer = 0;
  private castPulseDuration = 0.42;
  private ultOpenTimer = 0;
  private ultOpenDuration = 0.52;
  private attackSwingTimer = 0;
  private attackSwingDuration = 0.42;
  private attackComboStep = 0;
  private nextComboStep = 0;
  private blitzActive = false;
  private blitzShadowOnly = true;
  private blitzLastPoseApplied: ChibiAnimState | null = null;
  private blitzTimer = 0;
  private blitzDuration = 0.65;
  private blitzGhostAccum = 0;
  private blitzTracks: { hero: TierMotionWaypoint[]; clone?: TierMotionWaypoint[] } | null = null;
  private idlePixelHeight: number | null = null;
  private currentSpriteHeight: number;
  private topTrimRatio = 0;
  private hologramMode = false;
  private hologramTintHex = '#38bdf8';
  private lowQuality = false;
  private blitzPosesPreloaded = false;
  private disposed = false;

  constructor(def: ChibiDef, spriteHeight = 1.24, phaseOffset = 0) {
    this.def = def;
    this.spriteHeight = spriteHeight;
    this.currentSpriteHeight = spriteHeight;
    this.phaseOffset = phaseOffset;
    this.accentColorHex = def.accentColor;
    this.secondaryColorHex = getRaritySecondaryColor(def.rarity);

    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
      depthWrite: true,
      opacity: 0,
    });

    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
    });

    this.sharedSpriteGeo = new THREE.PlaneGeometry(spriteHeight * 0.85, spriteHeight);
    this.mesh = new THREE.Mesh(this.sharedSpriteGeo, this.material);
    this.mesh.position.y = spriteHeight * 0.5;
    this.mesh.customDepthMaterial = this.depthMaterial;
    this.mesh.castShadow = false;
    this.animGroup.add(this.mesh);

    this.glintMat = new THREE.MeshBasicMaterial({
      map: getWindupGlintTexture(),
      color: this.accentColorHex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.glintMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.48), this.glintMat);
    this.glintMesh.position.set(0, spriteHeight * 0.56, 0.04);
    this.glintMesh.visible = false;
    this.animGroup.add(this.glintMesh);

    this.spritePivot.add(this.animGroup);

    for (let i = 0; i < 2; i++) {
      const gMat = new THREE.MeshBasicMaterial({
        color: this.accentColorHex,
        transparent: true,
        opacity: 0,
        blending: THREE.NormalBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const gMesh = new THREE.Mesh(this.sharedSpriteGeo, gMat);
      gMesh.position.set(0, spriteHeight * 0.5, -0.04 - i * 0.03);
      gMesh.visible = false;
      this.ghostMats.push(gMat);
      this.ghostMeshes.push(gMesh);
      this.spritePivot.add(gMesh);
    }

    this.group.add(this.spritePivot);

    for (let i = 0; i < 6; i++) {
      const bgMat = new THREE.MeshBasicMaterial({
        color: this.accentColorHex,
        transparent: true,
        opacity: 0,
        blending: THREE.NormalBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const bgMesh = new THREE.Mesh(this.sharedSpriteGeo, bgMat);
      bgMesh.visible = false;
      this.group.add(bgMesh);
      this.blitzGhosts.push({ mesh: bgMesh, mat: bgMat, life: 0, maxLife: 0.3, face: 1, rz: 0, baseScale: 1 });
    }

    this.blitzCloneMat = new THREE.MeshBasicMaterial({
      color: this.secondaryColorHex,
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.blitzCloneMesh = new THREE.Mesh(
      this.sharedSpriteGeo,
      this.blitzCloneMat
    );
    this.blitzCloneMesh.visible = false;
    this.group.add(this.blitzCloneMesh);

    this.blitzHeroPivot.name = 'chibiBlitzHeroPivot';
    this.blitzHeroPivot.visible = false;
    this.blitzHeroMat = new THREE.MeshBasicMaterial({
      color: this.accentColorHex,
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.defaultBlitzHeroGeo = new THREE.PlaneGeometry(spriteHeight * 0.85, spriteHeight);
    this.blitzHeroMesh = new THREE.Mesh(this.defaultBlitzHeroGeo, this.blitzHeroMat);
    this.blitzHeroMesh.name = 'chibiBlitzHeroShadow';
    this.blitzHeroMesh.position.y = spriteHeight * 0.5;
    this.blitzHeroMesh.visible = false;
    this.blitzHeroPivot.add(this.blitzHeroMesh);
    this.group.add(this.blitzHeroPivot);

    const shadowTex = getSoftContactShadowTexture();
    this.baseShadowOpacity = shadowTex ? 0.85 : 0.3;
    this.shadowMat = new THREE.MeshBasicMaterial({
      ...(shadowTex ? { map: shadowTex } : {}),
      color: shadowTex ? 0xffffff : 0x020617,
      transparent: true,
      opacity: this.baseShadowOpacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.shadowDisc = new THREE.Mesh(
      shadowTex ? new THREE.PlaneGeometry(1.18, 0.74) : new THREE.CircleGeometry(0.42, 20),
      this.shadowMat
    );
    this.shadowDisc.rotation.order = 'YXZ';
    this.shadowDisc.rotation.x = -Math.PI / 2;
    this.shadowDisc.position.y = 0.012;
    this.group.add(this.shadowDisc);

    // Bespoke Omega/Twin/Fusion & tier-scaled (Common..Limited) 3D back-shader attachments
    this.backAttachments = createChibiBackAttachments(
      this.def.id,
      spriteHeight,
      this.spritePivot,
      this.blitzHeroPivot,
      this.def.rarity,
      this.def.accentColor
    );

    // Preload idle pose immediately; blitz/combat poses are loaded lazily on demand
    const smooth = Boolean(this.def.smoothFilter);
    void loadPoseMeta(this.def.poses.idle, smooth).then(
      (meta) => {
        if (this.disposed) return;
        this.idlePixelHeight = meta.pixelHeight;
        this.blitzPoseMetas.idle = meta;
      },
      () => {}
    );
    void this.applyPose('idle');
  }

  private ensureBlitzPosesPreloaded(): void {
    if (this.blitzPosesPreloaded) return;
    this.blitzPosesPreloaded = true;
    const smooth = Boolean(this.def.smoothFilter);
    void loadPoseMeta(this.def.poses.walk, smooth).then(
      (meta) => {
        if (!this.disposed) this.blitzPoseMetas.dash = meta;
      },
      () => {}
    );
    void loadPoseMeta(this.def.poses.attack, smooth).then(
      (meta) => {
        if (!this.disposed) this.blitzPoseMetas.attack = meta;
      },
      () => {}
    );
    void loadPoseMeta(this.def.poses.pose, smooth).then(
      (meta) => {
        if (!this.disposed) this.blitzPoseMetas.aura = meta;
      },
      () => {}
    );
  }

  private async applyPose(state: ChibiAnimState): Promise<void> {
    try {
      const url = stateToPoseUrl(this.def, state);
      const smooth = Boolean(this.def.smoothFilter);
      const [meta, idleMeta] = await Promise.all([
        loadPoseMeta(url, smooth),
        this.idlePixelHeight !== null ? Promise.resolve(null) : loadPoseMeta(this.def.poses.idle, smooth),
      ]);
      if (idleMeta && this.idlePixelHeight === null) {
        this.idlePixelHeight = idleMeta.pixelHeight;
      }
      if (this.disposed || this.animState !== state) return;
      this.blitzPoseMetas[state] = meta;

      const h = this.computeNormalizedHeight(meta, state);
      const width = h * (meta.pixelWidth / Math.max(1, meta.pixelHeight));
      this.currentSpriteHeight = h;
      this.topTrimRatio = meta.topTrimRatio;

      const nextGeo = new THREE.PlaneGeometry(width, h);
      this.sharedSpriteGeo.dispose();
      this.sharedSpriteGeo = nextGeo;
      this.mesh.geometry = nextGeo;
      this.mesh.position.y = h * 0.5;
      this.glintMesh.position.y = h * 0.56;

      for (let i = 0; i < this.ghostMeshes.length; i++) {
        const gm = this.ghostMeshes[i];
        gm.geometry = nextGeo;
        gm.position.y = h * 0.5;
        this.ghostMats[i].map = meta.texture;
        this.ghostMats[i].needsUpdate = true;
      }

      for (let i = 0; i < this.blitzGhosts.length; i++) {
        const bg = this.blitzGhosts[i];
        bg.mesh.geometry = nextGeo;
        bg.mat.map = meta.texture;
        bg.mat.needsUpdate = true;
      }
      this.blitzCloneMesh.geometry = nextGeo;
      this.blitzCloneMat.map = meta.texture;
      this.blitzCloneMat.needsUpdate = true;

      this.material.map = meta.texture;
      this.material.color.set(this.hologramMode ? this.hologramTintHex : '#ffffff');
      this.material.opacity = this.hologramMode ? 0.52 : 1;
      this.material.depthWrite = !this.hologramMode;
      this.material.needsUpdate = true;

      this.depthMaterial.map = meta.texture;
      this.depthMaterial.needsUpdate = true;
      this.mesh.castShadow = !this.hologramMode;
    } catch {
      // Keep previous texture if asset fails to load
    }
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    if (low) {
      for (let i = 0; i < this.ghostMeshes.length; i++) {
        this.ghostMeshes[i].visible = false;
      }
    }
  }

  public getAnimState(): ChibiAnimState {
    return this.animState;
  }

  public setAnimState(state: ChibiAnimState): void {
    if (state === 'idle' && this.castPulseTimer > 0 && !this.hologramMode) return;
    if (this.animState === state) return;
    this.animState = state;
    if (state !== 'attack') {
      this.attackSwingTimer = 0;
    }
    this.applyFacing();
    void this.applyPose(state);
  }

  public setFacing(sign: 1 | -1): void {
    this.facing = sign;
    this.applyFacing();
  }

  private isPoseLeftFacing(state: ChibiAnimState): boolean {
    if (state === 'dash') {
      return this.def.walkFacesLeft ?? LEFT_FACING_WALK_IDS.has(this.def.id);
    }
    if (state === 'attack') {
      return LEFT_FACING_ATTACK_IDS.has(this.def.id);
    }
    return false;
  }

  private computeNormalizedHeight(meta: LoadedPoseMeta, state: ChibiAnimState): number {
    const idlePx = this.idlePixelHeight ?? meta.pixelHeight;
    const refPx = idlePx * 0.65 + BASE_CHIBI_PIXEL_HEIGHT * 0.35;
    const unitPerPx = this.spriteHeight / Math.max(1, refPx);
    const rawH = meta.pixelHeight * unitPerPx;
    return state === 'aura'
      ? Math.min(Math.max(rawH, this.spriteHeight * 1.02), this.spriteHeight * 1.18)
      : Math.min(Math.max(rawH, this.spriteHeight * 0.96), this.spriteHeight * 1.14);
  }

  private syncBlitzShadowPose(state: ChibiAnimState): void {
    const meta = this.blitzPoseMetas[state] ?? this.blitzPoseMetas.attack ?? this.blitzPoseMetas.idle;
    if (!meta) {
      if (this.material.map && this.blitzHeroMat.map !== this.material.map) {
        this.blitzHeroMat.map = this.material.map;
        this.blitzHeroMat.needsUpdate = true;
      }
      return;
    }
    let geo = this.blitzPoseGeos[state];
    if (!geo) {
      const h = this.computeNormalizedHeight(meta, state);
      const w = h * (meta.pixelWidth / Math.max(1, meta.pixelHeight));
      geo = new THREE.PlaneGeometry(w, h);
      this.blitzPoseGeos[state] = geo;
    }
    if (this.blitzHeroMesh.geometry !== geo) {
      this.blitzHeroMesh.geometry = geo;
      const h = (geo.parameters as { height?: number }).height ?? this.currentSpriteHeight;
      this.blitzHeroMesh.position.y = h * 0.5;
    }
    if (this.blitzHeroMat.map !== meta.texture) {
      this.blitzHeroMat.map = meta.texture;
      this.blitzHeroMat.needsUpdate = true;
    }
    if (this.blitzCloneMat.map !== meta.texture) {
      this.blitzCloneMat.map = meta.texture;
      this.blitzCloneMat.needsUpdate = true;
    }
  }

  private applyFacing(): void {
    const invert = this.isPoseLeftFacing(this.animState);
    this.mesh.scale.x = invert ? -this.facing : this.facing;
  }

  public setAccentColor(hex: string): void {
    if (this.accentColorHex === hex) return;
    this.accentColorHex = hex;
    this.glintMat.color.set(hex);
    for (const gm of this.ghostMats) {
      gm.color.set(hex);
    }
  }

  public setHologramMode(enabled: boolean, tintHex = '#38bdf8'): void {
    this.hologramMode = enabled;
    this.hologramTintHex = tintHex;
    this.material.color.set(enabled ? tintHex : '#ffffff');
    this.material.depthWrite = !enabled;
    if (this.material.map) {
      this.material.opacity = enabled ? 0.52 : 1;
    } else if (enabled) {
      this.material.opacity = 0.52;
    }
    this.mesh.castShadow = !enabled && Boolean(this.material.map);
    this.material.needsUpdate = true;
    if (this.backAttachments.omegaAuraGroup) {
      this.backAttachments.omegaAuraGroup.visible = this.shouldShowBackAttachment();
    }
  }

  private shouldShowBackAttachment(): boolean {
    return !this.hologramMode && Boolean(this.backAttachments.omegaAuraGroup);
  }

  public isHologramMode(): boolean {
    return this.hologramMode;
  }

  public getPoseDisplayMeta(): { texture: THREE.Texture | null; width: number; height: number } {
    const tex = this.material.map ?? null;
    const h = this.currentSpriteHeight;
    const img = tex?.image as { width?: number; height?: number } | undefined;
    const w = img?.width && img?.height ? h * (img.width / img.height) : h * 0.85;
    return { texture: tex, width: w, height: h };
  }

  /** Computes steady world-space anchor just above the tilted chibi sprite top. */
  public getLabelAnchorWorldPosition(
    out: THREE.Vector3,
    extraLocalClearance = 0.13,
    forceMatrixUpdate = true
  ): THREE.Vector3 {
    if (forceMatrixUpdate) {
      this.spritePivot.updateWorldMatrix(true, false);
    }
    const peakPosY = this.animState === 'aura' ? 0.19 : 0.035;
    const peakScaleY = this.animState === 'aura' ? 1.04 : 1.032;
    const visibleRatio = Math.max(0.55, 1 - this.topTrimRatio);
    const localTopY = peakPosY + this.currentSpriteHeight * peakScaleY * visibleRatio + extraLocalClearance;
    out.set(0, localTopY, 0);
    return this.spritePivot.localToWorld(out);
  }

  public getComboStep(): number {
    return this.attackComboStep;
  }

  public triggerAttack(durationSec = 0.42, comboStep?: number): void {
    this.attackComboStep =
      comboStep !== undefined ? ((comboStep % 3) + 3) % 3 : this.nextComboStep;
    this.nextComboStep = (this.attackComboStep + 1) % 3;
    this.attackSwingDuration = Math.max(0.22, durationSec);
    this.attackSwingTimer = this.attackSwingDuration;
  }

  public triggerShowcase(durationSec = 1.4): void {
    this.showcaseTimer = durationSec;
  }

  /** Switches podium chibi from idle -> attack pose briefly on cast, then snaps straight back to idle. */
  public triggerPodiumCast(durationSec = 0.36): void {
    if (this.hologramMode) return;
    this.ensureBlitzPosesPreloaded();
    this.castPulseDuration = Math.max(0.22, durationSec);
    this.castPulseTimer = this.castPulseDuration;
    this.setAnimState('attack');
  }

  /** Plays a dramatic Sakuga power-up & ascent opening animation on the podium when triggering Ultimate. */
  public triggerUltOpening(durationSec = 0.52): void {
    if (this.hologramMode) return;
    this.ensureBlitzPosesPreloaded();
    this.ultOpenDuration = Math.max(0.32, durationSec);
    this.ultOpenTimer = this.ultOpenDuration;
    this.triggerPodiumCast(Math.max(0.45, durationSec));
  }

  /**
   * Triggers Rainbow-standard world-space multi-teleport blitz choreography across
   * pit / tower / boss arenas without disturbing animGroup tests or pedestal scaling.
   */
  public triggerBlitz(opts: {
    rarity: string;
    targetX: number;
    targetY: number;
    targetZ: number;
    allTargets?: readonly WorldPoint3[];
    durationSec: number;
    colorHex?: string;
    secondaryHex?: string;
    wideCenter?: WorldPoint3;
    motionScale?: number;
    shadowOnly?: boolean;
  }): void {
    if (this.hologramMode) return;
    this.ensureBlitzPosesPreloaded();
    this.group.updateWorldMatrix(true, false);
    this.group.getWorldPosition(this.blitzAnchorWorld);
    this.group.getWorldScale(this.blitzScaleWorld);

    const col = opts.colorHex ?? this.accentColorHex;
    const sec = opts.secondaryHex ?? getRaritySecondaryColor(opts.rarity);
    this.secondaryColorHex = sec;
    this.blitzCloneMat.color.set(sec);

    this.blitzShadowOnly = opts.shadowOnly ?? true;
    this.blitzLastPoseApplied = null;
    this.blitzDuration = Math.max(0.28, opts.durationSec);
    this.blitzTimer = 0;
    this.blitzGhostAccum = 0;
    this.blitzActive = true;
    this.blitzTracks = buildTierMotionWaypoints(
      opts.rarity,
      { x: this.blitzAnchorWorld.x, y: this.blitzAnchorWorld.y, z: this.blitzAnchorWorld.z },
      { x: opts.targetX, y: opts.targetY, z: opts.targetZ },
      opts.allTargets ?? [{ x: opts.targetX, y: opts.targetY, z: opts.targetZ }],
      col,
      sec,
      opts.wideCenter,
      opts.motionScale ?? 1.0,
      this.def.id
    );
  }

  private spawnBlitzGhost(
    lx: number,
    ly: number,
    lz: number,
    rz: number,
    face: 1 | -1,
    col: string,
    baseScale = 1,
    poseTex: THREE.Texture | null = null
  ): void {
    const maxSlots = this.lowQuality ? Math.min(4, this.blitzGhosts.length) : this.blitzGhosts.length;
    for (let i = 0; i < maxSlots; i++) {
      const g = this.blitzGhosts[i];
      if (poseTex && g.mat.map !== poseTex) {
        g.mat.map = poseTex;
        g.mat.needsUpdate = true;
      }
      if (!g.mat.map) continue;
      if (g.life <= 0) {
        g.life = this.lowQuality ? 0.24 : 0.28;
        g.maxLife = g.life;
        g.face = face;
        g.rz = rz;
        g.baseScale = baseScale;
        g.mesh.position.set(lx, ly + this.currentSpriteHeight * 0.5 * baseScale, lz);
        g.mat.color.set(col);
        g.mat.opacity = 0.72;
        g.mesh.visible = true;
        return;
      }
    }
  }

  public update(dtSec: number, elapsed: number, camera: THREE.Camera): void {
    this.group.getWorldPosition(this.worldPos);
    const dx = camera.position.x - this.worldPos.x;
    const dy = camera.position.y - this.worldPos.y;
    const dz = camera.position.z - this.worldPos.z;
    const horizDist = Math.max(0.001, Math.hypot(dx, dz));
    const camPitch = Math.atan2(dy, horizDist);

    // Partial spherical billboard: tilt back slightly toward elevated camera so chibis
    // stand squarely upright toward the viewer without foreshortening ("gepeng").
    this.spritePivot.rotation.order = 'YXZ';
    this.spritePivot.rotation.y = Math.atan2(dx, dz);
    this.spritePivot.rotation.x = -Math.max(0, Math.min(0.66, camPitch * 0.72));

    if (this.showcaseTimer > 0) {
      this.showcaseTimer = Math.max(0, this.showcaseTimer - dtSec);
      if (this.showcaseTimer > 0.7) {
        if (this.animState !== 'attack') {
          this.setAnimState('attack');
          this.triggerAttack(0.45);
        }
      } else if (this.showcaseTimer > 0) {
        this.setAnimState('aura');
      }
      if (this.showcaseTimer === 0) {
        this.setAnimState('idle');
      }
    }

    const t = elapsed * 2.8 + this.phaseOffset;
    let posX = 0;
    let posY = 0;
    let rotZ = 0;
    let scaleX = 1;
    let scaleY = 1;
    let shadowScale = 1;
    let showGlint = false;
    let glintProgress = 0;
    let showGhosts = false;
    let ghostAlpha = 0;

    if (this.animState === 'aura') {
      const hover = Math.sin(t * 1.7) * 0.05;
      posY = 0.14 + hover;
      rotZ = Math.sin(t * 0.9) * 0.025;
      scaleX = 1.02;
      scaleY = 1.04;
      shadowScale = 0.82 - hover * 0.4;
    } else if (this.animState === 'attack') {
      if (this.attackSwingTimer > 0) {
        this.attackSwingTimer = Math.max(0, this.attackSwingTimer - dtSec);
        const p = 1 - this.attackSwingTimer / this.attackSwingDuration;

        if (p >= 0.02 && p <= 0.24) {
          showGlint = true;
          glintProgress = (p - 0.02) / 0.22;
        }
        if (p >= 0.16 && p <= 0.64) {
          showGhosts = true;
          ghostAlpha = 1 - (p - 0.16) / 0.48;
        }

        const stepK = stepChibiAttackComboKinematics(p, this.attackComboStep, this.facing);
        posX = stepK.posX;
        posY = stepK.posY;
        rotZ = stepK.rotZ;
        scaleX = stepK.scaleX;
        scaleY = stepK.scaleY;
        shadowScale = stepK.shadowScale;
      } else {
        // Alert upright combat-ready bounce between swings
        const ready = (Math.sin(t * 2.5) + 1) * 0.5;
        posY = 0.02 + ready * 0.035;
        rotZ = -this.facing * 0.035 + Math.sin(t * 2.5) * 0.025;
        scaleY = 1.0 + ready * 0.03;
        scaleX = 1.0 - ready * 0.015;
        shadowScale = 1.02;
      }
    } else if (this.animState === 'dash') {
      // Crisp 2-beat chibi stride: alternating lean + hop + tall mid-stride stretch
      const stepPhase = elapsed * 10.5 + this.phaseOffset;
      const sinStep = Math.sin(stepPhase);
      const hop = Math.pow(Math.abs(sinStep), 0.78);
      const stretch = (hop - 0.3) * 0.055;
      posY = hop * 0.14;
      rotZ = sinStep * 0.075 - this.facing * 0.045;
      scaleY = 1.0 + stretch;
      scaleX = 1.0 - stretch * 0.5;
      shadowScale = 1.0 - hop * 0.14;
    } else {
      // Upright breathing idle & gentle weight shift (never squashed flat)
      const breath = (Math.sin(elapsed * 2.5 + this.phaseOffset) + 1) * 0.5;
      posY = breath * 0.026;
      rotZ = Math.sin(elapsed * 1.25 + this.phaseOffset) * 0.022;
      scaleY = 1.0 + breath * 0.032;
      scaleX = 1.0 - breath * 0.014;
      shadowScale = 1.0 - breath * 0.04;
    }

    let ultOpenPulse = 0;
    if (this.ultOpenTimer > 0) {
      this.ultOpenTimer = Math.max(0, this.ultOpenTimer - dtSec);
      const up = 1 - this.ultOpenTimer / this.ultOpenDuration;
      ultOpenPulse = Math.sin(up * Math.PI);
      if (up < 0.34) {
        const c = Math.sin((up / 0.34) * Math.PI * 0.5);
        posY -= 0.08 * c;
        posX += Math.sin(up * 85) * 0.032;
        scaleX *= 1 + 0.14 * c;
        scaleY *= 1 - 0.11 * c;
      } else {
        const r = (up - 0.34) / 0.66;
        const arc = Math.sin(r * Math.PI);
        posY += arc * 0.34;
        scaleY *= 1 + arc * 0.16;
        scaleX *= 1 - arc * 0.07;
        rotZ += -this.facing * arc * 0.085;
        shadowScale *= 1 - arc * 0.22;
      }
    }

    this.animGroup.position.set(posX, posY, 0);
    this.animGroup.rotation.z = rotZ;
    this.animGroup.scale.set(scaleX, scaleY, 1);

    let castPulseAmt = 0;
    if (this.castPulseTimer > 0) {
      this.castPulseTimer = Math.max(0, this.castPulseTimer - dtSec);
      const cp = 1 - this.castPulseTimer / this.castPulseDuration;
      castPulseAmt = Math.sin(cp * Math.PI);
      showGlint = true;
      glintProgress = cp;
      if (
        this.castPulseTimer <= 0 &&
        this.animState === 'attack' &&
        this.attackSwingTimer <= 0 &&
        this.showcaseTimer <= 0
      ) {
        this.setAnimState('idle');
      }
    }

    this.glintMesh.visible = showGlint;
    if (showGlint) {
      const pulse = Math.sin(glintProgress * Math.PI);
      this.glintMesh.position.x = castPulseAmt > 0 ? 0 : -this.facing * 0.16;
      this.glintMesh.rotation.z = glintProgress * Math.PI * (ultOpenPulse > 0 ? 1.55 : 0.75);
      const baseGlint = ultOpenPulse > 0 ? 0.92 : castPulseAmt > 0 ? 0.55 : 0.36;
      const pulseBoost = ultOpenPulse > 0 ? 1.45 : 0.92;
      this.glintMesh.scale.setScalar(baseGlint + pulse * pulseBoost);
      this.glintMat.opacity = Math.min(1, (ultOpenPulse > 0 ? 1.0 : 0.94) * pulse);
    }

    const baseHeightOffset = this.mesh.position.y;
    const renderGhosts = showGhosts;
    for (let i = 0; i < this.ghostMeshes.length; i++) {
      const gm = this.ghostMeshes[i];
      const gMat = this.ghostMats[i];
      gm.visible = renderGhosts;
      if (renderGhosts) {
        const trailDist = 0.14 + i * 0.15;
        gm.position.set(
          posX - this.facing * trailDist,
          baseHeightOffset + posY * (0.72 - i * 0.2),
          -0.04 - i * 0.03
        );
        gm.rotation.z = rotZ * (0.65 - i * 0.22);
        gm.scale.set(this.mesh.scale.x * scaleX, scaleY, 1);
        gMat.opacity = gMat.map ? Math.max(0, (0.78 - i * 0.24) * ghostAlpha) : 0;
      }
    }

    // Fade world-anchored blitz afterimages
    for (let i = 0; i < this.blitzGhosts.length; i++) {
      const bg = this.blitzGhosts[i];
      if (bg.life > 0) {
        bg.life = Math.max(0, bg.life - dtSec);
        const gp = bg.life / bg.maxLife;
        bg.mesh.quaternion.copy(this.spritePivot.quaternion);
        bg.mesh.rotateZ(bg.rz);
        bg.mat.opacity = gp * 0.88;
        const sc = bg.baseScale * (1 + (1 - gp) * 0.18);
        bg.mesh.scale.set(bg.face * sc, sc, 1);
        if (bg.life <= 0) bg.mesh.visible = false;
      }
    }

    if (this.blitzActive && this.blitzTracks) {
      this.blitzTimer += dtSec;
      const bp = Math.min(1, this.blitzTimer / this.blitzDuration);
      const cur = sampleTierMotionWaypoints(this.blitzTracks.hero, bp);
      const invX = 1 / Math.max(0.01, this.blitzScaleWorld.x);
      const invY = 1 / Math.max(0.01, this.blitzScaleWorld.y);
      const invZ = 1 / Math.max(0.01, this.blitzScaleWorld.z);
      const lx = (cur.x - this.blitzAnchorWorld.x) * invX;
      const ly = (cur.y - this.blitzAnchorWorld.y) * invY;
      const lz = (cur.z - this.blitzAnchorWorld.z) * invZ;

      // Shrink chibi slightly as it moves forward (+Z) toward the camera into the pit
      // to counter perspective bloat and make aerial/blitz leaps look sleek and agile.
      const forwardDz = Math.max(0, cur.z - this.blitzAnchorWorld.z);
      const combatScale = 1.0 - Math.min(1, forwardDz / 7.5) * 0.42;

      this.blitzHeroPivot.position.set(lx, ly, lz);
      this.blitzHeroPivot.scale.setScalar(combatScale);
      this.blitzHeroPivot.quaternion.copy(this.spritePivot.quaternion);

      if (this.blitzLastPoseApplied !== cur.pose) {
        this.blitzLastPoseApplied = cur.pose;
        this.syncBlitzShadowPose(cur.pose);
      }

      const heroFaceFlip = this.isPoseLeftFacing(cur.pose) ? (-cur.face as 1 | -1) : cur.face;
      if (this.blitzShadowOnly) {
        this.spritePivot.position.set(0, 0, 0);
        this.spritePivot.scale.set(1, 1, 1);
        this.blitzHeroPivot.visible = true;
        this.blitzHeroMesh.visible = Boolean(this.blitzHeroMat.map);
        this.blitzHeroMesh.rotation.z = cur.rz;
        this.blitzHeroMesh.scale.set(heroFaceFlip, 1, 1);
        this.blitzHeroMat.color.set(cur.col);
        const fade = bp < 0.08 ? bp / 0.08 : bp > 0.86 ? Math.max(0, (1 - bp) / 0.14) : 1;
        this.blitzHeroMat.opacity = fade * 0.96;
      } else {
        this.blitzHeroMesh.visible = false;
        this.blitzHeroPivot.visible = Boolean(this.backAttachments.omegaHandPivot);
        this.spritePivot.position.set(lx, ly, lz);
        this.spritePivot.scale.setScalar(combatScale);
        if (this.facing !== cur.face) this.setFacing(cur.face);
        if (this.animState !== cur.pose) this.setAnimState(cur.pose);
      }

      if (bp > 0.08 && bp < 0.88) {
        this.blitzGhostAccum += dtSec;
        const spawnEvery = this.lowQuality ? 0.048 : cur.snapping ? 0.02 : 0.036;
        if (this.blitzGhostAccum >= spawnEvery) {
          this.blitzGhostAccum = 0;
          const faceFlip = this.blitzShadowOnly
            ? heroFaceFlip
            : this.mesh.scale.x < 0
              ? -1
              : 1;
          this.spawnBlitzGhost(
            lx,
            ly,
            lz,
            cur.rz,
            faceFlip,
            cur.col,
            combatScale,
            this.blitzHeroMat.map
          );
        }
      }

      if (this.blitzTracks.clone) {
        const cCur = sampleTierMotionWaypoints(this.blitzTracks.clone, bp);
        this.blitzCloneMesh.visible = cCur.opacity > 0.05 && Boolean(this.blitzCloneMat.map);
        if (this.blitzCloneMesh.visible) {
          const clx = (cCur.x - this.blitzAnchorWorld.x) * invX;
          const cly = (cCur.y - this.blitzAnchorWorld.y) * invY;
          const clz = (cCur.z - this.blitzAnchorWorld.z) * invZ;
          const cForwardDz = Math.max(0, cCur.z - this.blitzAnchorWorld.z);
          const cCombatScale = 1.0 - Math.min(1, cForwardDz / 7.5) * 0.42;
          const cloneScale = cCombatScale * Math.min(1.06, cCur.scale);
          this.blitzCloneMesh.position.set(clx, cly + this.currentSpriteHeight * 0.5 * cloneScale, clz);
          this.blitzCloneMesh.quaternion.copy(this.spritePivot.quaternion);
          this.blitzCloneMesh.rotateZ(cCur.rz);
          this.blitzCloneMesh.scale.set(cCur.face * cloneScale, cloneScale, 1);
          this.blitzCloneMat.opacity = cCur.opacity;
        }
      } else {
        this.blitzCloneMesh.visible = false;
      }

      if (!this.blitzShadowOnly) {
        this.shadowDisc.rotation.y = this.spritePivot.rotation.y;
        this.shadowDisc.position.set(lx, 0.012, lz);
        this.shadowDisc.scale.setScalar(combatScale * Math.max(0.45, 1 - Math.max(0, ly) * 0.25));
        this.shadowMat.opacity = this.baseShadowOpacity * Math.max(0.25, 1 - Math.max(0, ly) * 0.35);
      }

      // Animate Omega & Twin unit-specific 3D back-shader attachments
      if (this.backAttachments.omegaAuraGroup && this.backAttachments.omegaAuraMat) {
        const showAura = this.shouldShowBackAttachment();
        this.backAttachments.omegaAuraGroup.visible = showAura;
        if (showAura) {
          this.updateBackAttachmentGroup(elapsed, 0.96);
        }
      }

      const handFace = this.blitzShadowOnly ? cur.face : this.facing;
      updateOmegaHandBlitzWeapon(
        this.backAttachments,
        bp,
        elapsed,
        handFace,
        this.currentSpriteHeight
      );

      if (bp >= 1) {
        this.blitzActive = false;
        this.blitzTracks = null;
        this.blitzHeroPivot.visible = false;
        this.blitzHeroMesh.visible = false;
        this.blitzCloneMesh.visible = false;
        if (this.backAttachments.omegaAuraGroup) {
          this.backAttachments.omegaAuraGroup.visible = this.shouldShowBackAttachment();
        }
        if (this.backAttachments.omegaHandPivot) this.backAttachments.omegaHandPivot.visible = false;
        this.spritePivot.position.set(0, 0, 0);
        this.spritePivot.scale.set(1, 1, 1);
        if (!this.blitzShadowOnly) {
          this.setAnimState('attack');
        }
      }
      if (!this.blitzShadowOnly) return;
    } else {
      this.blitzHeroPivot.visible = false;
      this.blitzHeroMesh.visible = false;
      this.blitzCloneMesh.visible = false;
      if (this.backAttachments.omegaHandPivot) this.backAttachments.omegaHandPivot.visible = false;
      if (this.backAttachments.omegaAuraGroup) {
        if (this.shouldShowBackAttachment()) {
          this.backAttachments.omegaAuraGroup.visible = true;
          this.backAttachments.omegaAuraGroup.scale.setScalar(1 + castPulseAmt * 0.14);
          this.updateBackAttachmentGroup(elapsed, Math.min(1, 0.90 + castPulseAmt * 0.10));
        } else {
          this.backAttachments.omegaAuraGroup.visible = false;
          this.backAttachments.omegaAuraGroup.scale.setScalar(1);
        }
      }
    }

    const yaw = this.spritePivot.rotation.y;
    const heightFactor = Math.max(0.42, 1 - posY * 1.45);
    this.spritePivot.position.set(0, 0, 0);
    this.spritePivot.scale.set(1, 1, 1);
    this.shadowDisc.rotation.y = yaw;
    this.shadowDisc.position.x = Math.cos(yaw) * posX * 0.65;
    this.shadowDisc.position.z = -Math.sin(yaw) * posX * 0.65;
    this.shadowDisc.scale.setScalar(shadowScale * (0.86 + 0.14 * heightFactor));
    this.shadowMat.opacity = this.baseShadowOpacity * heightFactor * (this.hologramMode ? 0.32 : 1);
    if (this.hologramMode && this.material.map) {
      this.material.opacity = 0.45 + Math.sin(elapsed * 4.5 + this.phaseOffset) * 0.1;
    }
  }

  private updateBackAttachmentGroup(elapsed: number, opacity: number): void {
    updateChibiBackAttachmentGroup(this.backAttachments, this.def.id, elapsed, opacity);
  }

  public dispose(): void {
    this.disposed = true;
    this.sharedSpriteGeo.dispose();
    this.material.dispose();
    this.depthMaterial.dispose();
    this.glintMesh.geometry.dispose();
    this.glintMat.dispose();
    for (let i = 0; i < this.ghostMats.length; i++) {
      this.ghostMats[i].dispose();
    }
    for (let i = 0; i < this.blitzGhosts.length; i++) {
      this.blitzGhosts[i].mat.dispose();
    }
    this.blitzCloneMat.dispose();
    this.defaultBlitzHeroGeo.dispose();
    for (const geo of Object.values(this.blitzPoseGeos)) {
      geo?.dispose();
    }
    this.blitzHeroMat.dispose();
    this.shadowDisc.geometry.dispose();
    this.shadowMat.dispose();
    disposeChibiBackAttachments(this.backAttachments);
  }
}
