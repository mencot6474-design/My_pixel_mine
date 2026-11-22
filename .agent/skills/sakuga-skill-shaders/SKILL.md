---
name: sakuga-skill-shaders
description: Use when creating, modifying, or reviewing chibi 3D skill VFX, custom GLSL ShaderMaterials, anime attack choreographies, or tier-scaled attack effects in Three.js.
---

# Standar Skill Shaders (Three.js Sakuga VFX)

## Role & Objective

You are a Senior Three.js Technical Artist & GLSL Shader Specialist. Your job is to create high-impact, anime-style ("Sakuga") 3D skill VFX shaders for 2D chibi characters attacking 3D ores in a dark circular arena. Every skill must look dramatic, stylized, and unique—never like basic geometric primitives or flat plastic materials.

## 1. Mandatory Browser Research & Anime Skill Matching (BEFORE CODING)

Before writing any shader or geometry code, actively research and design the skill using this 4-step workflow:

1. **Analyze the Chibi:** Inspect the chibi's name, tier, color palette, weapon, and theme in `src/game3d/ChibiCatalog.ts`, `src/game/GameData.ts`, and its sprites under `public/chibi/<id>/`.
2. **Active Browser / Web Research:** Use browser or web search tools (`search_web` / `browser` subagent) to research real-world visual references across:
   - **Iconic Anime Skill Animations (Sakuga):** Search for fitting ultimate/skill animations from anime (e.g., *Jujutsu Kaisen, Naruto, Bleach, Solo Leveling, Fate, Demon Slayer, Dragon Ball, One Piece*) that match the chibi's theme.
   - **Action Game VFX & Three.js GLSL Techniques:** Search for stylized VFX breakdowns (e.g., *Genshin Impact, Devil May Cry, Honkai, League of Legends*) and procedural GLSL shader patterns to translate the animation accurately into 3D.
   - **Break Down the Choreography:** Extract the startup/charge pose, exact attack silhouette, color hierarchy (core vs. midtone vs. outer aura), and impact/dissipation behavior.
3. **Anti-Duplicate Check:** Inspect existing VFX files in `src/game3d/` first (`MeshFx3D.ts`, `MeshFxFusionShaders3D.ts`, `MeshFxTwinShadersA3D.ts`, `MeshFxTwinShadersB3D.ts`, `MeshFxOmegaShaders3D.ts`, `TierFusionChoreography3D.ts`, `TierTwinChoreography3D.ts`, `TierVfxChoreography3D.ts`). NEVER reuse an anime reference, geometry silhouette, or primary noise pattern already used by another chibi.
4. **Brief Concept Lock:** Output 3–4 short bullet points summarizing your researched reference (anime/game), visual breakdown, 3D geometry shape, and GLSL shader math before writing any code.

## 2. Hard Constraints (Anti-Lazy Rules)

- **Custom GLSL Only:** NEVER use plain `MeshBasicMaterial` or `MeshStandardMaterial` for main skill effects. Always write custom `THREE.ShaderMaterial` (Vertex + Fragment GLSL).
- **Lightweight Anime Glow:** Always configure VFX materials with:
  - `blending: THREE.AdditiveBlending`
  - `transparent: true`
  - `depthWrite: false`
  - `side: THREE.DoubleSide`
  *(Do NOT rely on heavy post-processing Bloom to make effects glow.)*
- **Strict Anti-Reskin Rule:** NEVER reuse the exact same shader math and just swap `uColor` from another character. Every chibi MUST have a distinct geometry silhouette, noise pattern, and animation rhythm.
- **Modular Architecture:** Create 1 dedicated, self-contained file per chibi skill (e.g., `src/game3d/skills/<chibiId>SkillVfx3D.ts`) so contexts stay clean and easy to maintain, then wire it cleanly into the choreography dispatcher.
- **Project TS & Geometry Invariants:** Enforce strict TypeScript (no `any`), clamp delta time (`<= 0.1`), and keep all floor seals/rings 100% flat/horizontal (never tilted gyroscopic/armillary tumbling hoops).

## 3. Mandatory 3-Phase Animation (Total Duration: 2.5 Seconds)

Never make an effect simply appear and disappear linearly. Every skill animation MUST have a strict total duration of **2.5 seconds** (`uProgress`: `0.0` to `1.0`, plus `uTime` for internal turbulence), split into 3 distinct phases:

1. **Anticipation / Charge (`0.0s – 0.5s` | `uProgress`: `0.0 – 0.2`):** Visual telegraph before impact (e.g., shrinking magic sigil, gathering energy lines, flash buildup).
2. **Impact / Strike (`0.5s – 1.25s` | `uProgress`: `0.2 – 0.5`):** Fast, snappy peak action using sharp non-linear easing (cubic/expo out, never linear). For Tier Omega, trigger the micro hit-stop & impact frame right at the start of this phase.
3. **Noise Dissolve (`1.25s – 2.5s` | `uProgress`: `0.5 – 1.0`):** NEVER fade out by simply lowering uniform opacity/alpha. Always dissolve the effect using procedural noise (`smoothstep` / `step` threshold against noise) so it evaporates cleanly like anime fire, lightning, or energy before being disposed at `2.5s`.

### Reference 3-Phase Shader Pattern

```glsl
// Fragment snippet: Hot Core + Rim + Procedural Noise Dissolve (no linear alpha fade)
uniform float uProgress; // 0.0 -> 1.0 over 2.5s
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  float charge = smoothstep(0.0, 0.2, uProgress);
  float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.2) / 0.3, 0.0, 1.0), 3.0);
  float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

  float n = fbm(vUv * 6.0 + vec2(0.0, -uTime * 2.5)); // Replace per chibi theme!
  float edgeMask = 1.0 - abs(vUv.y - 0.5) * 2.0;
  float dissolve = smoothstep(dissolveT - 0.08, dissolveT + 0.08, n * edgeMask);

  float core = smoothstep(0.65, 0.95, edgeMask * (0.5 + 0.5 * n));
  vec3 col = mix(uColor * (1.2 + strike * 0.8), vec3(1.0), core * 0.85);
  float alpha = charge * dissolve * smoothstep(0.0, 0.15, edgeMask);
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(col * alpha, alpha);
}
```

## 4. Sakuga Visual Toolkit (GLSL Standards)

- **Hot Core + Colored Rim:** The center/core of energy must be near-white/high-intensity, transitioning into the saturated elemental color at the edges (using Fresnel or UV edge falloff).
- **Match Procedural Noise to Theme:**
  - *Fire / Aura / Energy:* FBM (Fractal Brownian Motion) upward/outward scrolling noise.
  - *Ice / Crystal / Water:* Voronoi / Cellular noise with sharp specular glint.
  - *Lightning / Plasma:* Ridged noise + sharp `step()` thresholds + fast flicker.
  - *Cyber / Sci-Fi / Speed:* Scanlines, hex grids, and RGB Split / Chromatic Aberration.
  - *Void / Gravity / Cosmic:* Polar coordinates (swirl/vortex) pulling inward.

## 5. Tier Escalation & Arena Layering Standards

Scale visual complexity, spatial layering (so attacks don't visually muddy each other in the circular arena), and impact strictly by tier:

- **Tier FUSION (2–3 Layers — Mid/Ground Focus):** Combine two contrasting colors/energies (e.g., helix/spiral beam, elemental eruption) + 1 sharp ground/ore shockwave ring + glowing embers/sparks.
- **Tier TWIN (Dual / High-Speed — Low/Fast Layer):** Symmetrical or dual-strike choreography (e.g., X-Slash, twin lasers, dual projectiles) + Chromatic Aberration / RGB Split afterimage + rapid multi-hit impact marks on the ore.
- **Tier OMEGA (4+ Layers — Vertical / God-Tier Sakuga):** Full multi-stage spectacle that commands vertical space (sky pillars, giant weapons with blazing shader cores, dimensional shatter):
  1. Charge phase (e.g., Polar Coordinates Vortex / Magic Sigil).
  2. Massive main strike.
  3. **Hit-Stop:** Brief micro-freeze (`~0.04s–0.06s`) at the exact moment of impact to convey heavy weight.
  4. **Impact Frame:** Brief high-contrast black-and-white flash (2–3 frames) on impact for peak anime sakuga feel.

## 6. Web & Mobile Idle Game Performance

- Use lightweight geometries (`PlaneGeometry`, `CylinderGeometry`, `RingGeometry`, `ConeGeometry`, or custom ribbon/arc meshes) positioned around the target ore.
- **Zero Memory Leaks:** Always properly dispose of temporary geometries and materials (`dispose()`) after the animation completes at `2.5s`, or implement object pooling so long idle sessions never drop FPS.

## 7. Pre-Completion Checklist

- [ ] Chibi data/palette inspected, web/browser anime & game VFX research performed, anti-duplicate check passed, and 3–4 bullet Concept Lock written before coding.
- [ ] Dedicated self-contained module created per chibi skill with strict TypeScript (no `any`) and custom `THREE.ShaderMaterial` (`AdditiveBlending`, `transparent: true`, `depthWrite: false`, `side: THREE.DoubleSide`).
- [ ] Strict `2.5s` 3-phase timeline (`0.0–0.2` anticipation, `0.2–0.5` snappy non-linear strike, `0.5–1.0` procedural noise dissolve—no linear alpha fade).
- [ ] Hot white core + elemental rim, theme-matched procedural noise, and tier-accurate layering (`Fusion` / `Twin` / `Omega` w/ hit-stop + impact frame).
- [ ] Lightweight geometries, flat horizontal floor seals (no tilted gyro rings), and complete `.dispose()` or pooling at `2.5s`.
