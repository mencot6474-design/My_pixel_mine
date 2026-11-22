import * as THREE from 'three';

export interface PitArenaClipUniforms {
  uPitCenter: { value: THREE.Vector3 };
  uPitRadius: { value: number };
  uPitFloorY: { value: number };
  uPitClipActive: { value: number };
}

export interface PitClipPatchOptions {
  /** Extra vertical margin below uPitFloorY before clipping (useful for erupting floor props). */
  floorGrace?: number;
  /** Softness width in world meters along the circular bowl wall. */
  radialFade?: number;
}

/** Shared uniform handles bound across all pooled ShaderMaterials in a TierAttackVfxPool3D. */
export function createPitArenaClipUniforms(): PitArenaClipUniforms {
  return {
    uPitCenter: { value: new THREE.Vector3(0, 0, 0) },
    uPitRadius: { value: 999 },
    uPitFloorY: { value: -999 },
    uPitClipActive: { value: 0 },
  };
}

/**
 * Patches any existing Three.js ShaderMaterial with world-space circular pit wall & floor clipping
 * so slashes, floor seals, domes, and beams dissolve smoothly at the colosseum rim instead of poking outside.
 */
export function patchShaderMaterialWithPitClip(
  mat: THREE.ShaderMaterial,
  sharedUniforms: PitArenaClipUniforms,
  opts: PitClipPatchOptions = {}
): void {
  if (mat.userData.__pitClipPatched) return;

  const floorGrace = (opts.floorGrace ?? (mat.depthWrite ? 0.14 : 0.04)).toFixed(3);
  const radialFade = (opts.radialFade ?? 0.52).toFixed(3);

  mat.uniforms.uPitCenter = sharedUniforms.uPitCenter;
  mat.uniforms.uPitRadius = sharedUniforms.uPitRadius;
  mat.uniforms.uPitFloorY = sharedUniforms.uPitFloorY;
  mat.uniforms.uPitClipActive = sharedUniforms.uPitClipActive;

  // 1. Patch Vertex Shader to export exact world-space position
  const posMatch = /modelViewMatrix\s*\*\s*vec4\(\s*([a-zA-Z_]\w*)\s*,\s*1\.0\s*\)/.exec(mat.vertexShader);
  const posExpr = posMatch?.[1] ?? 'position';
  const glPosRegex = /gl_Position\s*=/;
  if (glPosRegex.test(mat.vertexShader)) {
    mat.vertexShader =
      `varying vec3 vPitWorldPos;\n` +
      mat.vertexShader.replace(
        glPosRegex,
        `vPitWorldPos = (modelMatrix * vec4(${posExpr}, 1.0)).xyz;\n  gl_Position =`
      );
  }

  // 2. Patch Fragment Shader to apply smooth circular colosseum wall + floor boundary mask
  const fragHeader =
    `uniform vec3 uPitCenter;\n` +
    `uniform float uPitRadius;\n` +
    `uniform float uPitFloorY;\n` +
    `uniform float uPitClipActive;\n` +
    `varying vec3 vPitWorldPos;\n`;

  const clipSnippet = mat.depthWrite
    ? `
  if (uPitClipActive > 0.5) {
    float pitH = clamp(vPitWorldPos.y - uPitFloorY, 0.0, 1.95);
    float wallR = uPitRadius + pitH * 0.42;
    float pitR = length(vPitWorldPos.xz - uPitCenter.xz);
    if (pitR > wallR || vPitWorldPos.y < (uPitFloorY - ${floorGrace})) discard;
  }`
    : `
  if (uPitClipActive > 0.5) {
    float pitH = clamp(vPitWorldPos.y - uPitFloorY, 0.0, 1.95);
    float wallR = uPitRadius + pitH * 0.42;
    float pitR = length(vPitWorldPos.xz - uPitCenter.xz);
    float wallMask = smoothstep(wallR, wallR - ${radialFade}, pitR);
    float floorMask = smoothstep(uPitFloorY - ${floorGrace}, uPitFloorY - ${floorGrace} + 0.16, vPitWorldPos.y);
    float pitMask = wallMask * floorMask;
    if (pitMask < 0.01) discard;
    gl_FragColor.rgb *= pitMask;
    gl_FragColor.a *= pitMask;
  }`;

  const lastFragAssignIdx = mat.fragmentShader.lastIndexOf('gl_FragColor');
  if (lastFragAssignIdx >= 0) {
    const semiIdx = mat.fragmentShader.indexOf(';', lastFragAssignIdx);
    if (semiIdx >= 0) {
      mat.fragmentShader =
        fragHeader +
        mat.fragmentShader.slice(0, semiIdx + 1) +
        clipSnippet +
        mat.fragmentShader.slice(semiIdx + 1);
    }
  }

  mat.userData.__pitClipPatched = true;
  mat.needsUpdate = true;
}

export interface PatchableTierVfxPools {
  slashes: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  domes: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  beams: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  vortices: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  rifts: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  weapons: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  clockDials: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  frostSeals: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  lullabySeals: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  halcyonSeals: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  fusionSeals: Record<string, ReadonlyArray<{ mat: THREE.ShaderMaterial }>>;
  fusionProps: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  halcyonPillars: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  halcyonRain: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  nocturneEclipses: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  nocturneCraters: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  lullabyMirrorCages: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  lullabyCrescentMoons: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  clocktowers: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
  orbs: ReadonlyArray<{ mat: THREE.ShaderMaterial }>;
}

/** Patches every pooled ShaderMaterial inside TierAttackVfxPool3D with shared pit clip uniforms. */
export function patchTierVfxPoolMaterialsWithPitClip(
  pools: PatchableTierVfxPools,
  uniforms: PitArenaClipUniforms
): void {
  const patchList = (list: ReadonlyArray<{ mat: THREE.ShaderMaterial }>, floorGrace?: number): void => {
    for (let i = 0; i < list.length; i++) {
      patchShaderMaterialWithPitClip(list[i].mat, uniforms, floorGrace !== undefined ? { floorGrace } : {});
    }
  };
  patchList(pools.slashes);
  patchList(pools.domes);
  patchList(pools.beams);
  patchList(pools.vortices);
  patchList(pools.rifts);
  patchList(pools.weapons, 0.16);
  patchList(pools.clockDials);
  patchList(pools.frostSeals);
  patchList(pools.lullabySeals);
  patchList(pools.halcyonSeals);
  for (const list of Object.values(pools.fusionSeals)) patchList(list);
  patchList(pools.fusionProps, 0.16);
  patchList(pools.halcyonPillars, 0.2);
  patchList(pools.halcyonRain, 0.12);
  patchList(pools.nocturneEclipses, 0.16);
  patchList(pools.nocturneCraters);
  patchList(pools.lullabyMirrorCages);
  patchList(pools.lullabyCrescentMoons, 0.16);
  patchList(pools.clocktowers, 0.22);
  patchList(pools.orbs);
}
