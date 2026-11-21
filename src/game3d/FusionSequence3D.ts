import * as THREE from 'three';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { ChibiSprite3D } from './ChibiSprite3D';
import type { LabBunkerAnimHandles } from './FusionLabBunker3D';
import type { CyberShowcasePodiumHandle } from './FusionWorldPodium3D';

export interface FusionMaterialSlotRef {
  podium: CyberShowcasePodiumHandle;
  holoGridRing: THREE.Mesh;
  conduitPulseMeshes: THREE.Mesh[];
  sprite: ChibiSprite3D | null;
  ready: boolean;
  pos: THREE.Vector3;
}

export interface FusionOreClusterRef {
  crystalMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  floatingShards: THREE.Mesh[];
  ready: boolean;
  phase: number;
}

export interface FusionFloatingIslandRef {
  group: THREE.Group;
  baseY: number;
  phase: number;
  bobSpeed: number;
}

export interface FusionGlassShard {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  localOffset: THREE.Vector2;
  fromScale: THREE.Vector2;
  targetScale: THREE.Vector2;
  fromPos: THREE.Vector3;
  scatterPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  spinAxis: THREE.Vector3;
  spinSpeed: number;
  departTime: number;
  lockTime: number;
  lockFlash: number;
  locked: boolean;
}

export interface FusionSeqState {
  allRequirementsReady: boolean;
  fusionAnimTimer: number;
  readonly fusionAnimDur: number;
  portalFlashTimer: number;
  revealPopTimer: number;
  revealHold: boolean;
  materialShattered: boolean;
  portalBurstFired: boolean;
  fusionBurstFired: boolean;
  landingEchoFired: boolean;
  fusionAccentHex: string;
  fusionGlowHex: string;
  onFusionAnimComplete: (() => void) | null;
}

export interface FusionUpdateCtx {
  seq: FusionSeqState;
  group: THREE.Group;
  impactFx: AttackImpactFxController;
  glassShards: FusionGlassShard[];
  materialSlots: FusionMaterialSlotRef[];
  oreClusters: FusionOreClusterRef[];
  floatingIslands: FusionFloatingIslandRef[];
  apexPodium: CyberShowcasePodiumHandle;
  magicCircleMesh: THREE.Mesh;
  magicCircleMat: THREE.MeshBasicMaterial;
  innerRingMesh: THREE.Mesh;
  outerRingMesh: THREE.Mesh;
  stageNeonMat: THREE.MeshStandardMaterial;
  labAnim: LabBunkerAnimHandles;
  resultMount: THREE.Group;
  resultSprite: ChibiSprite3D | null;
}

const STAGE_CENTER_Z = -6.45;
const STAGE_DECK_Y = 0.76;
const APEX_PODIUM_SCALE = 2.8;
const MAT_PODIUM_SCALE = 1.48;
const DAIS_TOP_Y = STAGE_DECK_Y + 0.285 * APEX_PODIUM_SCALE;
const MOSAIC_BASE_Y = DAIS_TOP_Y + 0.45;

interface ShardCellDef {
  cx: number;
  cy: number;
  corners: ReadonlyArray<readonly [number, number]>;
  distSq: number;
}

function createChibiShardShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
    uniforms: {
      tTexA: { value: null as THREE.Texture | null },
      tTexB: { value: null as THREE.Texture | null },
      uHasTexA: { value: 0 },
      uHasTexB: { value: 0 },
      uMorph: { value: 0 },
      uFlash: { value: 0 },
      uEdgeAlpha: { value: 1 },
      uFade: { value: 1 },
      uAccent: { value: new THREE.Color('#22d3ee') },
      uGlow: { value: new THREE.Color('#fef08a') },
    },
    vertexShader: `
      attribute float aEdgeDist;
      varying vec2 vUv;
      varying float vEdgeDist;

      void main() {
        vUv = uv;
        vEdgeDist = aEdgeDist;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tTexA;
      uniform sampler2D tTexB;
      uniform float uHasTexA;
      uniform float uHasTexB;
      uniform float uMorph;
      uniform float uFlash;
      uniform float uEdgeAlpha;
      uniform float uFade;
      uniform vec3 uAccent;
      uniform vec3 uGlow;

      varying vec2 vUv;
      varying float vEdgeDist;

      void main() {
        vec4 colA = uHasTexA > 0.5
          ? texture2D(tTexA, vUv)
          : vec4(mix(uAccent, vec3(0.95), 0.35), 0.88);
        vec4 colB = uHasTexB > 0.5
          ? texture2D(tTexB, vUv)
          : vec4(mix(uGlow, vec3(0.98), 0.35), 0.92);

        vec4 spriteCol = mix(colA, colB, clamp(uMorph, 0.0, 1.0));
        float crackEdge = 1.0 - smoothstep(0.0, 0.16, vEdgeDist);
        float bevelSheen = smoothstep(0.15, 0.45, vEdgeDist) * 0.12;
        float glassOutline = crackEdge * 0.32 * uEdgeAlpha;
        float alpha = max(spriteCol.a, glassOutline) * uFade;
        if (alpha < 0.06) discard;

        vec3 prismColor = mix(uAccent, uGlow, 0.45 + uFlash * 0.55);
        vec3 rgb = spriteCol.rgb;
        if (spriteCol.a < 0.12) {
          rgb = prismColor;
        } else {
          rgb = mix(rgb, prismColor, crackEdge * 0.62 * uEdgeAlpha + bevelSheen * uEdgeAlpha);
        }
        rgb = mix(rgb, vec3(1.0, 0.98, 0.88), clamp(uFlash * 0.82, 0.0, 0.9));

        gl_FragColor = vec4(rgb, clamp(alpha, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function buildJitteredPortraitGridCells(): ShardCellDef[] {
  const cols = 4;
  const rows = 4;
  const minX = -0.45;
  const maxX = 0.45;
  const minY = -0.48;
  const maxY = 0.48;

  const grid: Array<Array<readonly [number, number]>> = [];
  for (let c = 0; c <= cols; c++) {
    const colPts: Array<readonly [number, number]> = [];
    for (let r = 0; r <= rows; r++) {
      const baseX = minX + (c / cols) * (maxX - minX);
      const baseY = minY + (r / rows) * (maxY - minY);
      const jx = c === 0 || c === cols ? 0 : Math.sin(c * 3.1 + r * 5.7) * 0.044;
      const jy = r === 0 || r === rows ? 0 : Math.cos(c * 4.3 + r * 2.9) * 0.048;
      colPts.push([baseX + jx, baseY + jy]);
    }
    grid.push(colPts);
  }

  const cells: ShardCellDef[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const bl = grid[c][r];
      const br = grid[c + 1][r];
      const tr = grid[c + 1][r + 1];
      const tl = grid[c][r + 1];
      const cx = (bl[0] + br[0] + tr[0] + tl[0]) * 0.25;
      const cy = (bl[1] + br[1] + tr[1] + tl[1]) * 0.25;
      const dx = cx;
      const dy = cy - 0.04;
      cells.push({
        cx,
        cy,
        corners: [bl, br, tr, tl],
        distSq: dx * dx + dy * dy,
      });
    }
  }
  // Sort center-out so core body shards lock in first, then head/wings/legs connect 1-by-1
  cells.sort((a, b) => a.distSq - b.distSq);
  return cells;
}

function createShardFanGeometry(cell: ShardCellDef): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const edgeDists: number[] = [];
  const [bl, br, tr, tl] = cell.corners;
  const pairs: ReadonlyArray<readonly [readonly [number, number], readonly [number, number]]> = [
    [bl, br],
    [br, tr],
    [tr, tl],
    [tl, bl],
  ];

  const cu = cell.cx + 0.5;
  const cv = cell.cy + 0.5;
  for (const [p1, p2] of pairs) {
    // 4% slight visual bevel gap toward cell centroid for crisp stained-glass seam separation
    const p1x = (p1[0] - cell.cx) * 0.96;
    const p1y = (p1[1] - cell.cy) * 0.96;
    const p2x = (p2[0] - cell.cx) * 0.96;
    const p2y = (p2[1] - cell.cy) * 0.96;

    positions.push(0, 0, 0, p1x, p1y, 0, p2x, p2y, 0);
    uvs.push(cu, cv, p1[0] + 0.5, p1[1] + 0.5, p2[0] + 0.5, p2[1] + 0.5);
    edgeDists.push(1.0, 0.0, 0.0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aEdgeDist', new THREE.Float32BufferAttribute(edgeDists, 1));
  geo.computeVertexNormals();
  return geo;
}

/** Builds the reusable pool of 16 jagged Chibi-art mirror shard meshes. */
export function buildFusionGlassShards(
  parentGroup: THREE.Group,
  ownedGeos: THREE.BufferGeometry[],
  ownedMats: THREE.Material[]
): FusionGlassShard[] {
  const cells = buildJitteredPortraitGridCells();
  const shards: FusionGlassShard[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const geo = createShardFanGeometry(cell);
    const mat = createChibiShardShaderMaterial();
    ownedGeos.push(geo);
    ownedMats.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.renderOrder = 6;
    parentGroup.add(mesh);

    const angle = (i * 2.39996) % (Math.PI * 2);
    shards.push({
      mesh,
      mat,
      localOffset: new THREE.Vector2(cell.cx, cell.cy),
      fromScale: new THREE.Vector2(2.5, 2.95),
      targetScale: new THREE.Vector2(3.25, 3.85),
      fromPos: new THREE.Vector3(),
      scatterPos: new THREE.Vector3(),
      targetPos: new THREE.Vector3(),
      spinAxis: new THREE.Vector3(
        Math.cos(angle) * 0.45,
        Math.sin(angle * 1.3),
        Math.sin(angle) * 0.55
      ).normalize(),
      spinSpeed: 3.4 + (i % 4) * 1.1,
      departTime: 0.76 + i * 0.095,
      lockTime: 1.12 + i * 0.095,
      lockFlash: 0,
      locked: false,
    });
  }
  return shards;
}

/** Seeds the 16 Chibi-art glass shards from the active Ingredient Chibis toward the Result Chibi silhouette. */
export function initFusionGlassShards(
  shards: FusionGlassShard[],
  materialSlots: readonly FusionMaterialSlotRef[],
  activeSlotCount: number,
  resultSprite: ChibiSprite3D | null,
  accentHex: string,
  glowHex: string
): void {
  const safeCount = Math.max(1, Math.min(activeSlotCount, materialSlots.length));
  const resMeta = resultSprite?.getPoseDisplayMeta() ?? { texture: null, width: 3.25, height: 3.85 };
  const resCenterY = MOSAIC_BASE_Y + resMeta.height * 0.5;

  for (let i = 0; i < shards.length; i++) {
    const sh = shards[i];
    const slot = materialSlots[i % safeCount];
    const srcPos = slot?.pos ?? new THREE.Vector3(0, 0.42, 1.0);
    const ingMeta = slot?.sprite?.getPoseDisplayMeta() ?? {
      texture: null,
      width: 2.5 / MAT_PODIUM_SCALE,
      height: 2.95 / MAT_PODIUM_SCALE,
    };
    const ingW = ingMeta.width * MAT_PODIUM_SCALE;
    const ingH = ingMeta.height * MAT_PODIUM_SCALE;
    const ingCenterY = srcPos.y + ingH * 0.5;

    const spreadAng = (i * 2.1 + (i % safeCount) * 1.3) % (Math.PI * 2);
    const spreadR = 0.52 + (i % 3) * 0.28;

    sh.fromScale.set(ingW, ingH);
    sh.targetScale.set(resMeta.width, resMeta.height);
    sh.fromPos.set(
      srcPos.x + sh.localOffset.x * ingW,
      ingCenterY + sh.localOffset.y * ingH,
      srcPos.z
    );
    sh.scatterPos.set(
      sh.fromPos.x + Math.cos(spreadAng) * spreadR,
      sh.fromPos.y + 0.42 + (i % 3) * 0.22,
      sh.fromPos.z + Math.sin(spreadAng) * spreadR * 0.55
    );
    sh.targetPos.set(
      sh.localOffset.x * resMeta.width,
      resCenterY + sh.localOffset.y * resMeta.height,
      STAGE_CENTER_Z + 0.04
    );

    sh.departTime = 0.74 + i * 0.095;
    sh.lockTime = sh.departTime + 0.34;
    sh.lockFlash = 0;
    sh.locked = false;

    sh.mat.uniforms.tTexA.value = ingMeta.texture;
    sh.mat.uniforms.tTexB.value = resMeta.texture;
    sh.mat.uniforms.uHasTexA.value = ingMeta.texture ? 1 : 0;
    sh.mat.uniforms.uHasTexB.value = resMeta.texture ? 1 : 0;
    sh.mat.uniforms.uMorph.value = 0;
    sh.mat.uniforms.uFlash.value = 0;
    sh.mat.uniforms.uEdgeAlpha.value = 1;
    sh.mat.uniforms.uFade.value = 1;
    sh.mat.uniforms.uAccent.value.set(accentHex);
    sh.mat.uniforms.uGlow.value.set(glowHex);

    sh.mesh.position.copy(sh.fromPos);
    sh.mesh.rotation.set(0, 0, 0);
    sh.mesh.scale.set(ingW, ingH, 1);
    sh.mesh.visible = false;
  }
}

export function hideFusionGlassShards(shards: FusionGlassShard[]): void {
  for (const sh of shards) {
    sh.mesh.visible = false;
    sh.locked = false;
    sh.lockFlash = 0;
  }
}

function stepPodiumAura(podium: CyberShowcasePodiumHandle, elapsed: number): void {
  if (!podium.auraGroup.visible) return;
  podium.sigilMesh.rotation.z = elapsed * 0.16;
  podium.auraVeilMat.uniforms.uTime.value = elapsed;
  podium.auraOuterVeilMat.uniforms.uTime.value = elapsed * 0.85;
  podium.particleMat.uniforms.uTime.value = elapsed;
}

const tmpVec = new THREE.Vector3();

function stepGlassShardsSequence(
  ctx: FusionUpdateCtx,
  curAnim: number,
  dt: number,
  camera?: THREE.Camera
): void {
  const SHATTER_MAT_T = 0.52;
  const SOLIDIFY_T = 2.78;

  if (curAnim < SHATTER_MAT_T) return;

  if (curAnim >= SOLIDIFY_T) {
    // Dissolve fracture seams smoothly as the solid live Result Chibi takes over in place
    const fadeOut = Math.max(0, 1 - (curAnim - SOLIDIFY_T) / 0.28);
    for (const sh of ctx.glassShards) {
      sh.mesh.visible = fadeOut > 0.01;
      sh.mat.uniforms.uMorph.value = 1;
      sh.mat.uniforms.uEdgeAlpha.value = fadeOut;
      sh.mat.uniforms.uFade.value = fadeOut;
      sh.mat.uniforms.uFlash.value = fadeOut * 0.65;
    }
    return;
  }

  for (let i = 0; i < ctx.glassShards.length; i++) {
    const sh = ctx.glassShards[i];
    sh.mesh.visible = true;

    if (curAnim < sh.departTime) {
      // Phase 2a: Shatter outward right where the Ingredient Chibi stood, keeping its art slices visible
      const scatterP = Math.min(1, (curAnim - SHATTER_MAT_T) / 0.22);
      const easeOut = 1 - Math.pow(1 - scatterP, 3);
      sh.mesh.position.lerpVectors(sh.fromPos, sh.scatterPos, easeOut);
      const hoverT = curAnim - SHATTER_MAT_T;
      sh.mesh.position.y += Math.sin(hoverT * 3.5 + i) * 0.05;
      sh.mesh.rotation.set(
        sh.spinAxis.x * hoverT * sh.spinSpeed,
        sh.spinAxis.y * hoverT * sh.spinSpeed,
        sh.spinAxis.z * hoverT * sh.spinSpeed
      );
      sh.mesh.scale.set(sh.fromScale.x, sh.fromScale.y, 1);
      sh.mat.uniforms.uMorph.value = 0;
    } else if (curAnim < sh.lockTime) {
      // Phase 2b: Fly smoothly into the Apex Chibi puzzle silhouette
      const p = (curAnim - sh.departTime) / (sh.lockTime - sh.departTime);
      const ease = p * p * (3 - 2 * p);
      tmpVec.lerpVectors(sh.scatterPos, sh.targetPos, ease);
      tmpVec.y += Math.sin(p * Math.PI) * 0.55;
      tmpVec.z += Math.sin(p * Math.PI) * 0.45;
      sh.mesh.position.copy(tmpVec);

      const remRot = 1 - ease;
      sh.mesh.rotation.set(
        sh.spinAxis.x * sh.departTime * sh.spinSpeed * remRot,
        sh.spinAxis.y * sh.departTime * sh.spinSpeed * remRot,
        sh.spinAxis.z * sh.departTime * sh.spinSpeed * remRot
      );
      const curW = THREE.MathUtils.lerp(sh.fromScale.x, sh.targetScale.x, ease);
      const curH = THREE.MathUtils.lerp(sh.fromScale.y, sh.targetScale.y, ease);
      sh.mesh.scale.set(curW, curH, 1);
      sh.mat.uniforms.uMorph.value = Math.max(0, (p - 0.65) / 0.35) * 0.45;
    } else {
      // Phase 3: LOCKED 1-by-1 flush into the Result Chibi's actual sprite puzzle!
      if (!sh.locked) {
        sh.locked = true;
        sh.lockFlash = 1.0;
        ctx.impactFx.spawnImpact({
          targetX: sh.targetPos.x,
          targetY: sh.targetPos.y,
          targetZ: sh.targetPos.z + 0.12,
          accentColor: i % 2 === 0 ? '#fef08a' : ctx.seq.fusionAccentHex,
          comboStep: i % 3,
          camera,
        });
      }
      sh.lockFlash = Math.max(0, sh.lockFlash - dt * 5.0);
      const lockMorph = Math.min(1, 0.45 + ((curAnim - sh.lockTime) / 0.12) * 0.55);
      sh.mesh.position.copy(sh.targetPos);
      sh.mesh.rotation.set(0, 0, 0);
      const snapBoost = 1 + sh.lockFlash * 0.18;
      sh.mesh.scale.set(sh.targetScale.x * snapBoost, sh.targetScale.y * snapBoost, 1);
      sh.mat.uniforms.uMorph.value = lockMorph;
      sh.mat.uniforms.uFlash.value = sh.lockFlash;
    }
  }
}

export function stepFusionWorldUpdate(
  ctx: FusionUpdateCtx,
  dtSec: number,
  elapsed: number,
  camera?: THREE.Camera
): void {
  if (!ctx.group.visible) return;
  const dt = Math.min(0.1, Math.max(0, dtSec));
  const isFusing = ctx.seq.fusionAnimTimer > 0;
  const readyPulse = ctx.seq.allRequirementsReady ? 0.5 + 0.5 * Math.sin(elapsed * 4.6) : 0;
  const spinBoost = isFusing ? 7.2 : ctx.seq.allRequirementsReady ? 1.85 : 0.75;

  // 1. Rotate Floor Magic Circle & Podium Auras
  ctx.magicCircleMesh.rotation.z = elapsed * 0.14 * (ctx.seq.allRequirementsReady ? 1.6 : 0.6);
  ctx.innerRingMesh.rotation.z += dt * 0.78 * spinBoost;
  ctx.outerRingMesh.rotation.z -= dt * 0.46 * spinBoost;
  stepPodiumAura(ctx.apexPodium, elapsed);

  // 2. Dynamic Readiness Pulse on 2x APEX Tube & Floor Circuit
  if (ctx.seq.allRequirementsReady && !isFusing) {
    const pulseIntensity = 1.2 + readyPulse * 0.65;
    ctx.apexPodium.ringMat.emissiveIntensity = pulseIntensity;
    ctx.stageNeonMat.emissiveIntensity = pulseIntensity;
    ctx.magicCircleMat.opacity = 0.52 + readyPulse * 0.26;
  }
  if (ctx.seq.portalFlashTimer > 0) {
    ctx.seq.portalFlashTimer = Math.max(0, ctx.seq.portalFlashTimer - dt);
    ctx.apexPodium.ringMat.emissiveIntensity = 1.4 + (ctx.seq.portalFlashTimer / 0.55) * 2.2;
  }

  // 3. Material Podiums + Chibi Fracture Choreography
  const elapsedAnim = isFusing ? ctx.seq.fusionAnimDur - ctx.seq.fusionAnimTimer : 0;
  if (isFusing && elapsedAnim >= 2.38 && elapsedAnim < 2.78) {
    ctx.apexPodium.ringMat.emissiveIntensity = 2.6;
  }

  for (let i = 0; i < ctx.materialSlots.length; i++) {
    const slot = ctx.materialSlots[i];
    if (!slot.podium.group.visible) continue;
    stepPodiumAura(slot.podium, elapsed + i * 0.65);
    slot.holoGridRing.rotation.z = elapsed * 1.4;
    const flowSpeed = isFusing ? 4.2 : ctx.seq.allRequirementsReady ? 1.7 : slot.ready ? 1.0 : 0.35;
    for (let p = 0; p < slot.conduitPulseMeshes.length; p++) {
      const pulseMesh = slot.conduitPulseMeshes[p];
      const phase = ((elapsed * flowSpeed + p * 0.5 + i * 0.25) % 1 + 1) % 1;
      pulseMesh.position.z = 0.45 - phase * 0.9;
      pulseMesh.visible = slot.ready || ctx.seq.allRequirementsReady || isFusing;
    }
    if (slot.sprite) {
      if (isFusing) {
        if (elapsedAnim < 0.52) {
          const lp = elapsedAnim / 0.52;
          const vib = Math.sin(elapsed * 62 + i) * 0.055 * lp;
          slot.sprite.group.position.set(vib, 0.285 + lp * 0.45, 0);
          slot.sprite.group.scale.setScalar(1 + lp * 0.12);
        } else {
          slot.sprite.group.scale.setScalar(0.001);
        }
      } else if (ctx.seq.revealHold) {
        slot.sprite.group.scale.setScalar(0.001);
      } else {
        slot.sprite.group.position.set(0, 0.285, 0);
        slot.sprite.group.scale.setScalar(1);
      }
      if (camera) {
        slot.sprite.update(dt, elapsed, camera);
      }
    }
  }

  // 4. Animate Ore Vats + Lab Bunker Iris, Cryo Bubbles, Cryo Mist & Emitter Arms
  for (const node of ctx.oreClusters) {
    const orePulse = node.ready ? 1.35 + Math.sin(elapsed * 4.2 + node.phase) * 0.4 : 0.26;
    node.crystalMat.emissiveIntensity = orePulse;
    node.accentMat.emissiveIntensity = node.ready ? orePulse * 1.2 : 0.32;
    const orbitSpeed = node.ready ? 2.6 : 0.8;
    for (let s = 0; s < node.floatingShards.length; s++) {
      const shard = node.floatingShards[s];
      const a = elapsed * orbitSpeed + node.phase + s * Math.PI;
      shard.position.set(
        Math.cos(a) * 0.38,
        1.02 + s * 0.22 + Math.sin(elapsed * 3.0 + s) * 0.08,
        Math.sin(a) * 0.38
      );
      shard.rotation.y = a;
      shard.rotation.x = elapsed * 1.5;
    }
  }
  if (ctx.labAnim.irisRotorGroup) {
    ctx.labAnim.irisRotorGroup.rotation.y -= dt * (isFusing ? 4.2 : ctx.seq.allRequirementsReady ? 1.5 : 0.65);
  }
  for (const tipMat of ctx.labAnim.emitterTipMats) {
    tipMat.emissive.set(isFusing || ctx.seq.allRequirementsReady ? ctx.seq.fusionAccentHex : '#22d3ee');
    tipMat.emissiveIntensity = isFusing ? 2.2 : ctx.seq.allRequirementsReady ? 1.4 + readyPulse * 0.45 : 0.9;
  }
  for (const bub of ctx.labAnim.cryoBubbleGroups) {
    bub.group.position.y = bub.baseY + ((elapsed * 0.45 + bub.phase) % 0.85);
  }
  for (let m = 0; m < ctx.labAnim.cryoMistMats.length; m++) {
    ctx.labAnim.cryoMistMats[m].opacity = 0.26 + Math.sin(elapsed * 1.4 + m * 1.1) * 0.1;
  }

  // 5. Result Fusion Chibi Mount (seamless hand-off at 2.78s, descends onto Apex Dais at 3.16s)
  const popScale =
    ctx.seq.revealPopTimer > 0 ? 1 + Math.sin((ctx.seq.revealPopTimer / 0.58) * Math.PI) * 0.22 : 1;
  if (ctx.seq.revealPopTimer > 0) ctx.seq.revealPopTimer = Math.max(0, ctx.seq.revealPopTimer - dt);
  if (isFusing && elapsedAnim >= 2.78) {
    const descendP = Math.min(1, (elapsedAnim - 2.78) / 0.38);
    const easeOut = 1 - Math.pow(1 - descendP, 3);
    ctx.resultMount.position.y = THREE.MathUtils.lerp(MOSAIC_BASE_Y, DAIS_TOP_Y + 0.04, easeOut);
  } else {
    ctx.resultMount.position.y = DAIS_TOP_Y + 0.04 + Math.sin(elapsed * 2.4) * 0.08;
  }
  ctx.resultMount.scale.setScalar(popScale);
  if (camera && ctx.resultSprite) {
    ctx.resultSprite.update(dt, elapsed, camera);
  }

  // 6. Step Chibi-Art Glass Fracture & 1-by-1 Stained-Glass Merge + Solidification
  if (ctx.seq.fusionAnimTimer > 0) {
    ctx.seq.fusionAnimTimer = Math.max(0, ctx.seq.fusionAnimTimer - dt);
    const curAnim = ctx.seq.fusionAnimDur - ctx.seq.fusionAnimTimer;

    if (!ctx.seq.materialShattered && curAnim >= 0.52) {
      ctx.seq.materialShattered = true;
      for (const slot of ctx.materialSlots) {
        if (!slot.podium.group.visible) continue;
        ctx.impactFx.spawnShatter({
          targetX: slot.pos.x,
          targetY: slot.pos.y + 1.35,
          targetZ: slot.pos.z,
          oreColor: '#bae6fd',
          secondaryColor: ctx.seq.fusionAccentHex,
          isMeteor: false,
          camera,
        });
      }
    }

    stepGlassShardsSequence(ctx, curAnim, dt, camera);

    if (!ctx.seq.portalBurstFired && curAnim >= 2.4) {
      ctx.seq.portalBurstFired = true;
      ctx.seq.portalFlashTimer = 0.55;
      ctx.impactFx.spawnShatter({
        targetX: 0,
        targetY: MOSAIC_BASE_Y + 2.4,
        targetZ: STAGE_CENTER_Z + 0.4,
        oreColor: '#fef08a',
        secondaryColor: ctx.seq.fusionAccentHex,
        isMeteor: true,
        camera,
      });
    }

    if (!ctx.seq.fusionBurstFired && curAnim >= 2.78) {
      ctx.seq.fusionBurstFired = true;
      ctx.resultMount.visible = true;
      ctx.seq.revealPopTimer = 0.58;
      ctx.impactFx.spawnShatter({
        targetX: 0,
        targetY: MOSAIC_BASE_Y + 1.85,
        targetZ: STAGE_CENTER_Z,
        oreColor: ctx.seq.fusionAccentHex,
        secondaryColor: '#fef08a',
        isMeteor: true,
        camera,
      });
    }

    if (!ctx.seq.landingEchoFired && curAnim >= 3.16) {
      ctx.seq.landingEchoFired = true;
      ctx.impactFx.spawnShatter({
        targetX: 0,
        targetY: DAIS_TOP_Y + 0.65,
        targetZ: STAGE_CENTER_Z,
        oreColor: '#fef08a',
        secondaryColor: ctx.seq.fusionAccentHex,
        isMeteor: true,
        camera,
      });
    }

    if (ctx.seq.fusionAnimTimer <= 0) {
      hideFusionGlassShards(ctx.glassShards);
      ctx.resultMount.visible = true;
      ctx.seq.revealHold = true;
      const cb = ctx.seq.onFusionAnimComplete;
      ctx.seq.onFusionAnimComplete = null;
      cb?.();
    }
  }

  ctx.impactFx.update(dt, camera);
}
