import * as THREE from 'three';
import type { FusionChibiVariant } from './MeshFxFusionShaders3D';
import { easeInQuad, easeOutBack, easeOutCubic } from './TierMotionPath3D';

export interface SlashSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  s0: number;
  s1: number;
  spinSpeed: number;
}
export interface DomeSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  s0: number;
  s1: number;
  yScale: number;
}
export interface BeamSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  radius: number;
  height: number;
}
export interface VortexSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  sx: number;
  sy: number;
  spin: number;
}
export interface RiftSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  len: number;
  height: number;
}
export interface WeaponSlot {
  kind: 'blade' | 'spear' | 'crystal' | 'greatsword' | 'gear' | 'clockhand' | 'katana' | 'kunai' | 'arrow';
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startRot: THREE.Euler;
  endRot: THREE.Euler;
  scaleTarget: number;
  mode: 'plunge' | 'erupt' | 'swing';
  onArrive: (() => void) | null;
  arrived: boolean;
}
export interface ClockDialSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  s0: number;
  s1: number;
}
export interface FusionPropSlot {
  variant: FusionChibiVariant;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startRot: THREE.Euler;
  endRot: THREE.Euler;
  scaleTarget: number;
  mode: 'erupt' | 'plunge' | 'hover' | 'crown';
  spinY: number;
  onArrive: (() => void) | null;
  arrived: boolean;
}
export interface HalcyonPillarSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  baseY: number;
  baseScale: number;
  charge: number;
}
export interface HalcyonRainSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  arriveFrac: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  arrived: boolean;
  onArrive: (() => void) | null;
}
export interface NocturneEclipseSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  baseY: number;
  baseScale: number;
  severTriggered: boolean;
  onSever: (() => void) | null;
}
export interface NocturneCraterSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  s0: number;
  s1: number;
}
export interface LullabyMirrorCageSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  lockDur: number;
  shatterDur: number;
  baseScale: number;
  shattering: boolean;
  shatterAge: number;
  onShatter: (() => void) | null;
}
export interface LullabyCrescentMoonSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  approachDur: number;
  cleaveHoldDur: number;
  slashThroughDur: number;
  baseScale: number;
  startPos: THREE.Vector3;
  midPos: THREE.Vector3;
  endPos: THREE.Vector3;
  hitCage: boolean;
  onHitCage: (() => void) | null;
}
export interface ClocktowerSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  fallDur: number;
  holdDur: number;
  explodeDur: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  baseScale: number;
  landed: boolean;
  exploded: boolean;
  onLand: (() => void) | null;
  onExplode: (() => void) | null;
}
export interface BoltSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  life: number;
}
export interface DebrisSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  life: number;
  floorY: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  s0: number;
}
export interface QuadSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  life: number;
  floorY: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  drag: number;
  s0: number;
  s1: number;
  spin: number;
  billboard: boolean;
  flatFloor: boolean;
  baseRotZ: number;
  baseAlpha: number;
}
export interface OrbSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  s0: number;
  s1: number;
  trailTimer: number;
  trailColor: string;
  onArrive: (() => void) | null;
  arrived: boolean;
}

export interface TierVfxPoolUpdateState {
  disposed: boolean;
  time: number;
  events: Array<{ delay: number; fn: () => void }>;
  slashes: SlashSlot[];
  domes: DomeSlot[];
  beams: BeamSlot[];
  vortices: VortexSlot[];
  rifts: RiftSlot[];
  weapons: WeaponSlot[];
  clockDials: ClockDialSlot[];
  frostSeals: ClockDialSlot[];
  lullabySeals: ClockDialSlot[];
  halcyonSeals: ClockDialSlot[];
  fusionSeals: Record<FusionChibiVariant, ClockDialSlot[]>;
  fusionProps: FusionPropSlot[];
  halcyonPillars: HalcyonPillarSlot[];
  halcyonRain: HalcyonRainSlot[];
  nocturneEclipses: NocturneEclipseSlot[];
  nocturneCraters: NocturneCraterSlot[];
  lullabyMirrorCages: LullabyMirrorCageSlot[];
  lullabyCrescentMoons: LullabyCrescentMoonSlot[];
  clocktowers: ClocktowerSlot[];
  boltSegs: BoltSlot[];
  debris: DebrisSlot[];
  quads: QuadSlot[];
  orbs: OrbSlot[];
  flameTex: THREE.Texture;
  tmpDir: THREE.Vector3;
  tmpUp: THREE.Vector3;
  spawnDebrisBurst: (x: number, y: number, z: number, color: string, secondary: string, count?: number) => void;
  spawnQuad: (opts: {
    tex: THREE.Texture; x: number; y: number; z: number; color?: string;
    s0?: number; s1?: number; life?: number; floorY?: number;
    vx?: number; vy?: number; vz?: number; gravity?: number; drag?: number;
    spin?: number; billboard?: boolean; flatFloor?: boolean; rotZ?: number; alpha?: number;
  }) => void;
}

export function stepTierAttackVfxPool(
  state: TierVfxPoolUpdateState,
  dtSec: number,
  camera: THREE.Camera
): void {
  if (state.disposed) return;
const dt = Math.min(Math.max(0, dtSec), 0.1);
state.time += dt;

for (let i = state.events.length - 1; i >= 0; i--) {
  state.events[i].delay -= dt;
  if (state.events[i].delay <= 0) {
    const fn = state.events[i].fn;
    state.events.splice(i, 1);
    fn();
  }
}

for (let i = 0; i < state.slashes.length; i++) {
  const s = state.slashes[i];
  if (!s.active) continue;
  s.age += dt;
  const p = Math.min(1, s.age / s.life);
  s.mat.uniforms.uProgress.value = p;
  s.mat.uniforms.uOpacity.value = Math.min(1, Math.sin(Math.min(1, p * 1.1) * Math.PI) * 1.35);
  const sc = s.s0 + (s.s1 - s.s0) * easeOutCubic(p);
  s.mesh.scale.setScalar(sc);
  s.mesh.rotation.y += s.spinSpeed * dt;
  if (p >= 1) { s.active = false; s.mesh.visible = false; }
}

for (let i = 0; i < state.domes.length; i++) {
  const d = state.domes[i];
  if (!d.active) continue;
  d.age += dt;
  const p = Math.min(1, d.age / d.life);
  const sc = d.s0 + (d.s1 - d.s0) * easeOutCubic(p);
  d.mesh.scale.set(sc, sc * d.yScale, sc);
  d.mat.uniforms.uProgress.value = p;
  d.mat.uniforms.uOpacity.value = 1 - easeInQuad(p);
  if (p >= 1) { d.active = false; d.mesh.visible = false; }
}

for (let i = 0; i < state.beams.length; i++) {
  const b = state.beams[i];
  if (!b.active) continue;
  b.age += dt;
  const p = Math.min(1, b.age / b.life);
  const pop = easeOutCubic(Math.min(1, p / 0.14));
  const shrink = p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
  b.mesh.scale.set(b.radius * (0.4 + 0.6 * pop) * shrink, b.height, b.radius * (0.4 + 0.6 * pop) * shrink);
  b.mat.uniforms.uTime.value = state.time;
  b.mat.uniforms.uProgress.value = p;
  b.mat.uniforms.uOpacity.value = shrink;
  if (p >= 1) { b.active = false; b.mesh.visible = false; }
}

for (let i = 0; i < state.vortices.length; i++) {
  const v = state.vortices[i];
  if (!v.active) continue;
  v.age += dt;
  const p = Math.min(1, v.age / v.life);
  const pop = easeOutBack(Math.min(1, p / 0.22));
  const fade = p > 0.72 ? 1 - (p - 0.72) / 0.28 : 1;
  v.mesh.scale.set(v.sx * pop, v.sy * pop, v.sx * pop);
  v.mesh.rotation.y += v.spin * dt;
  v.mat.uniforms.uTime.value = state.time;
  v.mat.uniforms.uOpacity.value = Math.max(0, fade);
  if (p >= 1) { v.active = false; v.mesh.visible = false; }
}

for (let i = 0; i < state.rifts.length; i++) {
  const r = state.rifts[i];
  if (!r.active) continue;
  r.age += dt;
  const p = Math.min(1, r.age / r.life);
  const pop = easeOutCubic(Math.min(1, p / 0.16));
  r.mesh.scale.set(r.len * pop, r.height * (1 - p * 0.32), 1);
  r.mat.uniforms.uProgress.value = p;
  r.mat.uniforms.uOpacity.value = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
  if (p >= 1) { r.active = false; r.mesh.visible = false; }
}

const stepFloorSealSlots = (slots: ClockDialSlot[]): void => {
  for (let i = 0; i < slots.length; i++) {
    const d = slots[i];
    if (!d.active) continue;
    d.age += dt;
    const p = Math.min(1, d.age / d.life);
    const sc = d.s0 + (d.s1 - d.s0) * easeOutCubic(Math.min(1, p / 0.4));
    d.mesh.scale.setScalar(sc);
    d.mat.uniforms.uTime.value = state.time;
    d.mat.uniforms.uProgress.value = p;
    d.mat.uniforms.uOpacity.value = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
    if (p >= 1) { d.active = false; d.mesh.visible = false; }
  }
};
stepFloorSealSlots(state.clockDials);
stepFloorSealSlots(state.frostSeals);
stepFloorSealSlots(state.lullabySeals);
stepFloorSealSlots(state.halcyonSeals);
for (const sealList of Object.values(state.fusionSeals)) {
  stepFloorSealSlots(sealList);
}

for (let i = 0; i < state.fusionProps.length; i++) {
  const fp = state.fusionProps[i];
  if (!fp.active) continue;
  fp.age += dt;
  const p = Math.min(1, fp.age / fp.life);
  fp.mat.uniforms.uTime.value = state.time;
  fp.mat.uniforms.uProgress.value = p;
  if (fp.mode === 'erupt') {
    const up = easeOutBack(Math.min(1, p / 0.26));
    fp.mesh.scale.setScalar(fp.scaleTarget * (0.2 + 0.8 * up));
    fp.mesh.position.lerpVectors(fp.startPos, fp.endPos, Math.min(1, p * 4.2));
    fp.mat.uniforms.uOpacity.value = p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
  } else if (fp.mode === 'plunge') {
    const moveT = easeInQuad(Math.min(1, p / 0.44));
    fp.mesh.position.lerpVectors(fp.startPos, fp.endPos, moveT);
    fp.mesh.scale.setScalar(fp.scaleTarget);
    if (!fp.arrived && p >= 0.44) {
      fp.arrived = true;
      fp.onArrive?.();
    }
    fp.mat.uniforms.uOpacity.value = p > 0.68 ? 1 - (p - 0.68) / 0.32 : 1;
  } else if (fp.mode === 'crown') {
    const descendT = easeOutCubic(Math.min(1, p / 0.34));
    const pop = easeOutBack(Math.min(1, p / 0.22));
    fp.mesh.position.lerpVectors(fp.startPos, fp.endPos, descendT);
    fp.mesh.position.y += Math.sin(state.time * 4.0) * 0.08;
    fp.mesh.scale.setScalar(fp.scaleTarget * (0.35 + 0.65 * pop));
    fp.mesh.rotation.y += fp.spinY * dt;
    if (!fp.arrived && p >= 0.34) {
      fp.arrived = true;
      fp.onArrive?.();
    }
    fp.mat.uniforms.uOpacity.value = p > 0.72 ? 1 - (p - 0.72) / 0.28 : 1;
  } else {
    const snapT = easeOutCubic(Math.min(1, p / 0.36));
    fp.mesh.position.lerpVectors(fp.startPos, fp.endPos, snapT);
    fp.mesh.rotation.set(
      fp.startRot.x + (fp.endRot.x - fp.startRot.x) * snapT,
      fp.startRot.y + (fp.endRot.y - fp.startRot.y) * snapT + fp.spinY * fp.age,
      fp.startRot.z + (fp.endRot.z - fp.startRot.z) * snapT
    );
    fp.mesh.scale.setScalar(fp.scaleTarget * (0.4 + 0.6 * easeOutBack(Math.min(1, p / 0.2))));
    if (!fp.arrived && p >= 0.36) {
      fp.arrived = true;
      fp.onArrive?.();
    }
    fp.mat.uniforms.uOpacity.value = p > 0.66 ? 1 - (p - 0.66) / 0.34 : 1;
  }
  if (p >= 1) { fp.active = false; fp.mesh.visible = false; }
}

for (let i = 0; i < state.halcyonPillars.length; i++) {
  const pl = state.halcyonPillars[i];
  if (!pl.active) continue;
  pl.age += dt;
  const prog = Math.min(1, pl.age / pl.life);
  const pop = easeOutBack(Math.min(1, prog / 0.18));
  pl.mesh.position.y = pl.baseY - (1 - pop) * 1.4;
  pl.mesh.scale.set(pl.baseScale * (0.5 + 0.5 * pop), pl.baseScale * (0.25 + 0.75 * pop), pl.baseScale * (0.5 + 0.5 * pop));
  pl.charge = Math.max(pl.charge * 0.9, prog > 0.3 ? Math.sin(prog * Math.PI) : 0);
  pl.mat.uniforms.uTime.value = state.time;
  pl.mat.uniforms.uCharge.value = pl.charge;
  pl.mat.uniforms.uOpacity.value = prog > 0.78 ? 1 - (prog - 0.78) / 0.22 : 1;
  if (prog >= 1) { pl.active = false; pl.mesh.visible = false; }
}

for (let i = 0; i < state.halcyonRain.length; i++) {
  const r = state.halcyonRain[i];
  if (!r.active) continue;
  r.age += dt;
  r.mat.uniforms.uTime.value = state.time;
  const p = Math.min(1, r.age / r.life);
  if (p < r.arriveFrac) {
    const diveT = easeInQuad(p / r.arriveFrac);
    r.mesh.position.lerpVectors(r.startPos, r.endPos, diveT);
    r.mat.uniforms.uImpact.value = 0;
    r.mat.uniforms.uOpacity.value = Math.min(1, p / 0.08);
  } else {
    if (!r.arrived) {
      r.arrived = true;
      r.mesh.position.copy(r.endPos);
      r.onArrive?.();
    }
    const imp = (p - r.arriveFrac) / Math.max(0.001, 1 - r.arriveFrac);
    r.mat.uniforms.uImpact.value = imp;
    r.mat.uniforms.uOpacity.value = imp > 0.68 ? 1 - (imp - 0.68) / 0.32 : 1;
    r.mesh.position.copy(r.endPos);
    r.mesh.position.y += Math.sin(imp * 28.0) * 0.03 * Math.max(0, 1 - imp * 2.5);
  }
  if (p >= 1) { r.active = false; r.mesh.visible = false; }
}

for (let i = 0; i < state.nocturneEclipses.length; i++) {
  const ec = state.nocturneEclipses[i];
  if (!ec.active) continue;
  ec.age += dt;
  const p = Math.min(1, ec.age / ec.life);
  const rise = easeOutBack(Math.min(1, p / 0.22));
  ec.mesh.position.y = ec.baseY - (1 - rise) * 1.6;
  ec.mesh.scale.setScalar(ec.baseScale * (0.4 + 0.6 * rise));
  ec.mat.uniforms.uTime.value = state.time;
  ec.mat.uniforms.uCharge.value = Math.sin(Math.min(1, p / 0.55) * Math.PI);
  if (!ec.severTriggered && p >= 0.48) {
    ec.severTriggered = true;
    ec.onSever?.();
  }
  const severT = p >= 0.48 ? Math.max(0, 1 - (p - 0.48) / 0.24) : 0;
  ec.mat.uniforms.uSever.value = severT;
  ec.mat.uniforms.uOpacity.value = p > 0.78 ? 1 - (p - 0.78) / 0.22 : 1;
  if (p >= 1) { ec.active = false; ec.mesh.visible = false; }
}

for (let i = 0; i < state.nocturneCraters.length; i++) {
  const c = state.nocturneCraters[i];
  if (!c.active) continue;
  c.age += dt;
  const p = Math.min(1, c.age / c.life);
  c.mesh.scale.setScalar(c.s0 + (c.s1 - c.s0) * easeOutCubic(Math.min(1, p / 0.42)));
  c.mat.uniforms.uTime.value = state.time;
  c.mat.uniforms.uProgress.value = p;
  c.mat.uniforms.uOpacity.value = p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
  if (p >= 1) { c.active = false; c.mesh.visible = false; }
}

for (let i = 0; i < state.lullabyMirrorCages.length; i++) {
  const cage = state.lullabyMirrorCages[i];
  if (!cage.active) continue;
  cage.age += dt;
  cage.mat.uniforms.uTime.value = state.time;
  if (!cage.shattering) {
    const pop = easeOutCubic(Math.min(1, cage.age / 0.14)) * cage.baseScale;
    cage.mesh.scale.set(pop, pop, pop);
    cage.mesh.rotation.y += dt * 1.45;
    const crackAmt = Math.max(0, (cage.age - cage.lockDur * 0.35) / Math.max(0.01, cage.lockDur * 0.65));
    cage.mat.uniforms.uCrack.value = Math.min(1, crackAmt);
    cage.mat.uniforms.uShatter.value = 0;
    if (cage.age >= cage.lockDur) {
      cage.shattering = true;
      cage.shatterAge = 0;
      cage.onShatter?.();
    }
  } else {
    cage.shatterAge += dt;
    const sp = Math.min(1, cage.shatterAge / cage.shatterDur);
    cage.mat.uniforms.uCrack.value = 1;
    cage.mat.uniforms.uShatter.value = sp;
    cage.mat.uniforms.uOpacity.value = 1 - sp * sp;
    cage.mesh.scale.setScalar(cage.baseScale * (1 + sp * 0.48));
    if (sp >= 1) { cage.active = false; cage.mesh.visible = false; }
  }
}

for (let i = 0; i < state.lullabyCrescentMoons.length; i++) {
  const moon = state.lullabyCrescentMoons[i];
  if (!moon.active) continue;
  moon.age += dt;
  if (moon.age < 0) {
    moon.mat.uniforms.uOpacity.value = 0;
    continue;
  }
  moon.mat.uniforms.uTime.value = state.time;
  const totalLife = moon.approachDur + moon.cleaveHoldDur + moon.slashThroughDur;
  if (moon.age < moon.approachDur) {
    const ap = easeInQuad(moon.age / moon.approachDur);
    moon.mesh.position.lerpVectors(moon.startPos, moon.midPos, ap);
    moon.mesh.rotation.z = -0.15 + (-0.78 - -0.15) * ap;
    moon.mat.uniforms.uOpacity.value = Math.min(1, ap * 3.0);
    moon.mat.uniforms.uCharge.value = ap * 0.5;
  } else if (moon.age < moon.approachDur + moon.cleaveHoldDur) {
    if (!moon.hitCage) {
      moon.hitCage = true;
      moon.onHitCage?.();
    }
    const hp = (moon.age - moon.approachDur) / moon.cleaveHoldDur;
    const vib = Math.sin(state.time * 62.0) * 0.05;
    moon.mesh.position.set(moon.midPos.x + vib - hp * 0.2, moon.midPos.y - hp * 0.12, moon.midPos.z);
    moon.mesh.rotation.z = -0.78 + (-1.05 - -0.78) * hp;
    moon.mat.uniforms.uCharge.value = 0.5 + hp * 0.5;
    moon.mat.uniforms.uOpacity.value = 1;
  } else {
    const sp = Math.min(1, (moon.age - moon.approachDur - moon.cleaveHoldDur) / moon.slashThroughDur);
    moon.mesh.position.lerpVectors(moon.midPos, moon.endPos, easeOutCubic(sp));
    moon.mesh.rotation.z = -1.05 + (-2.15 - -1.05) * easeOutCubic(sp);
    moon.mesh.scale.setScalar(moon.baseScale * (1 + sp * 0.22));
    moon.mat.uniforms.uCharge.value = 1;
    moon.mat.uniforms.uOpacity.value = 1 - sp * sp;
  }
  if (moon.age >= totalLife) {
    moon.active = false;
    moon.mesh.visible = false;
  }
}

for (let i = 0; i < state.clocktowers.length; i++) {
  const ct = state.clocktowers[i];
  if (!ct.active) continue;
  ct.age += dt;
  ct.mat.uniforms.uTime.value = state.time;
  const totalLife = ct.fallDur + ct.holdDur + ct.explodeDur;
  if (ct.age < ct.fallDur) {
    const fp = easeInQuad(ct.age / ct.fallDur);
    ct.mesh.position.lerpVectors(ct.startPos, ct.endPos, fp);
    ct.mat.uniforms.uEmbedProgress.value = 0;
    ct.mat.uniforms.uExplode.value = 0;
  } else if (ct.age < ct.fallDur + ct.holdDur) {
    if (!ct.landed) {
      ct.landed = true;
      ct.mesh.position.copy(ct.endPos);
      ct.onLand?.();
    }
    const hp = (ct.age - ct.fallDur) / ct.holdDur;
    ct.mat.uniforms.uEmbedProgress.value = hp;
    ct.mat.uniforms.uExplode.value = 0;
    const settle = Math.sin(hp * 28.0) * 0.08 * Math.max(0, 1 - hp * 2.2);
    ct.mesh.position.set(ct.endPos.x, ct.endPos.y + settle, ct.endPos.z);
    ct.mesh.scale.setScalar(ct.baseScale * (1 + hp * 0.08));
  } else {
    if (!ct.exploded) {
      ct.exploded = true;
      ct.onExplode?.();
    }
    const ep = Math.min(1, (ct.age - ct.fallDur - ct.holdDur) / ct.explodeDur);
    ct.mat.uniforms.uEmbedProgress.value = 1;
    ct.mat.uniforms.uExplode.value = ep;
    ct.mat.uniforms.uOpacity.value = 1 - ep * ep;
    ct.mesh.scale.setScalar(ct.baseScale * (1.08 + ep * 0.42));
  }
  if (ct.age >= totalLife) {
    ct.active = false;
    ct.mesh.visible = false;
  }
}

for (let i = 0; i < state.weapons.length; i++) {
  const w = state.weapons[i];
  if (!w.active) continue;
  w.age += dt;
  w.mat.uniforms.uTime.value = state.time;
  const p = Math.min(1, w.age / w.life);
  if (w.mode === 'erupt') {
    const up = easeOutBack(Math.min(1, p / 0.24));
    w.mesh.scale.setScalar(w.scaleTarget * (0.2 + 0.8 * up));
    w.mesh.position.lerpVectors(w.startPos, w.endPos, Math.min(1, p * 4));
    w.mat.uniforms.uOpacity.value = p > 0.58 ? 1 - (p - 0.58) / 0.42 : 1;
  } else if (w.mode === 'swing') {
    const k = easeInQuad(Math.min(1, p * 1.15));
    w.mesh.position.lerpVectors(w.startPos, w.endPos, k);
    w.mesh.rotation.x = w.startRot.x + (w.endRot.x - w.startRot.x) * k;
    w.mesh.rotation.y = w.startRot.y + (w.endRot.y - w.startRot.y) * k;
    w.mesh.rotation.z = w.startRot.z + (w.endRot.z - w.startRot.z) * k;
    w.mat.uniforms.uOpacity.value = p > 0.72 ? 1 - (p - 0.72) / 0.28 : 1;
    if (!w.arrived && p >= 0.76) {
      w.arrived = true;
      w.onArrive?.();
    }
  } else {
    const moveT = easeInQuad(Math.min(1, p / 0.58));
    w.mesh.position.lerpVectors(w.startPos, w.endPos, moveT);
    if (!w.arrived && p >= 0.58) {
      w.arrived = true;
      w.onArrive?.();
    }
    w.mat.uniforms.uOpacity.value = p > 0.62 ? 1 - (p - 0.62) / 0.38 : 1;
  }
  if (p >= 1) { w.active = false; w.mesh.visible = false; }
}

for (let i = 0; i < state.boltSegs.length; i++) {
  const b = state.boltSegs[i];
  if (!b.active) continue;
  b.age += dt;
  const p = Math.min(1, b.age / b.life);
  b.mat.opacity = 1 - p * p;
  if (p >= 1) { b.active = false; b.mesh.visible = false; }
}

for (let i = 0; i < state.debris.length; i++) {
  const db = state.debris[i];
  if (!db.active) continue;
  db.age += dt;
  const p = Math.min(1, db.age / db.life);
  db.vy -= 14.5 * dt;
  db.mesh.position.x += db.vx * dt;
  db.mesh.position.y += db.vy * dt;
  db.mesh.position.z += db.vz * dt;
  if (db.mesh.position.y < db.floorY) {
    db.mesh.position.y = db.floorY;
    db.vy = Math.abs(db.vy) * 0.42;
    db.vx *= 0.75;
    db.vz *= 0.75;
  }
  db.mesh.rotation.x += db.rx * dt;
  db.mesh.rotation.y += db.ry * dt;
  db.mesh.scale.setScalar(db.s0 * (1 - p * 0.85));
  if (p >= 1) { db.active = false; db.mesh.visible = false; }
}

for (let i = 0; i < state.orbs.length; i++) {
  const o = state.orbs[i];
  if (!o.active) continue;
  o.age += dt;
  o.mat.uniforms.uTime.value = state.time;
  const p = Math.min(1, o.age / o.life);
  o.mesh.position.lerpVectors(o.p0, o.p1, easeInQuad(p));
  o.mesh.rotation.x += dt * 11;
  o.mesh.rotation.y += dt * 9;
  o.mesh.scale.setScalar(o.s0 + (o.s1 - o.s0) * p);
  o.trailTimer += dt;
  if (o.trailTimer >= 0.025) {
    o.trailTimer = 0;
    state.spawnQuad({
      tex: state.flameTex,
      x: o.mesh.position.x + (Math.random() - 0.5) * 0.25,
      y: o.mesh.position.y + (Math.random() - 0.5) * 0.25,
      z: o.mesh.position.z + (Math.random() - 0.5) * 0.25,
      color: o.trailColor,
      s0: o.s0 * 1.4,
      s1: 0.12,
      life: 0.22,
    });
  }
  if (!o.arrived && p >= 1) {
    o.arrived = true;
    o.onArrive?.();
    o.active = false;
    o.mesh.visible = false;
  }
}

for (let i = 0; i < state.quads.length; i++) {
  const q = state.quads[i];
  if (!q.active) continue;
  q.age += dt;
  const p = Math.min(1, q.age / q.life);
  q.vy -= q.gravity * dt;
  q.vx *= q.drag;
  q.vz *= q.drag;
  q.mesh.position.x += q.vx * dt;
  q.mesh.position.y += q.vy * dt;
  q.mesh.position.z += q.vz * dt;
  if (q.mesh.position.y < q.floorY && q.gravity > 0) {
    q.mesh.position.y = q.floorY;
    q.vy = Math.abs(q.vy) * 0.35;
  }
  const sc = q.s0 + (q.s1 - q.s0) * easeOutCubic(p);
  q.mesh.scale.setScalar(Math.max(0.01, sc));
  if (q.billboard && !q.flatFloor) {
    q.mesh.quaternion.copy(camera.quaternion);
    if (q.spin !== 0 || q.baseRotZ !== 0) q.mesh.rotateZ(q.baseRotZ + q.spin * q.age);
  } else if (q.flatFloor) {
    q.mesh.rotation.z = q.baseRotZ + q.spin * q.age;
  }
  q.mat.opacity = q.baseAlpha * (1 - p * p);
  if (p >= 1) { q.active = false; q.mesh.visible = false; }
}
}
