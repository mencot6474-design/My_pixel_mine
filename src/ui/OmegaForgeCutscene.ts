import * as THREE from 'three';
import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { fmtShort } from '../game/NumberFormat';
import { getOmegaBossById, getOmegaPassiveStarScale, OMEGA_BOSS_DEFS, OmegaBossDef, OmegaBossId } from '../game/OmegaData';
import { ChibiDef, getChibiById } from '../game3d/ChibiCatalog';
import { renderRarityBadgeHtml } from './HudShared';

export interface OmegaForgeCutsceneState {
  kind: 'unlock' | 'awaken';
  bossId: OmegaBossId;
  targetStars: number;
  phase: 'animating' | 'confirm';
}

const IMPACT_AT_SEC = 1.05;
const COLOR_POP_AT_SEC = 1.62;
const CONFIRM_AT_SEC = 2.75;

const OMEGA_CUTSCENE_VERTEX_SHADER = `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const OMEGA_CUTSCENE_FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uAccent;
  uniform vec3 uGold;

  #define PI 3.14159265359

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 st) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += amp * noise(st);
      st = rot * st * 2.05;
      amp *= 0.5;
    }
    return v;
  }

  float starField(vec2 uv, float scale, float speed) {
    vec2 gv = fract(uv * scale + vec2(0.0, -uTime * speed)) - 0.5;
    vec2 id = floor(uv * scale + vec2(0.0, -uTime * speed));
    float rnd = hash21(id);
    if (rnd < 0.82) return 0.0;
    vec2 offset = vec2(fract(rnd * 31.7) - 0.5, fract(rnd * 71.3) - 0.5) * 0.65;
    float d = length(gv - offset);
    float twinkle = 0.55 + 0.45 * sin(uTime * 5.0 + rnd * 40.0);
    return smoothstep(0.09, 0.0, d) * twinkle;
  }

  void main() {
    float minRes = min(uResolution.x, uResolution.y);
    vec2 centerPx = vec2(0.5 * uResolution.x, 0.66 * uResolution.y);
    vec2 st = (gl_FragCoord.xy - centerPx) / max(1.0, minRes);
    float t = uTime;

    // Subtle Sakuga micro-shake during Impact Frame & Shockwave Burst
    bool isImpactFrame = (t >= 1.05 && t < 1.14);
    if (isImpactFrame) {
      st += (vec2(hash21(vec2(t * 97.0, 1.0)), hash21(vec2(2.0, t * 83.0))) - 0.5) * 0.048;
    } else if (t >= 1.14 && t < 1.62) {
      float shakeDecay = 1.0 - (t - 1.14) / 0.48;
      st += vec2(sin(t * 78.0), cos(t * 64.0)) * 0.012 * shakeDecay;
    }

    // Space-time shockwave radial distortion after climax cut
    if (t >= 1.12 && t < 1.95) {
      float wt = (t - 1.12) / 0.83;
      float rr = length(st) + 0.0001;
      float waveFront = wt * 1.15;
      float waveMask = smoothstep(0.14, 0.0, abs(rr - waveFront)) * (1.0 - wt);
      st -= normalize(st) * waveMask * 0.065;
    }

    float r = length(st) + 0.0001;
    float theta = atan(st.y, st.x);

    // Base cosmic void gradient
    vec3 col = mix(uAccent * 0.16, vec3(0.025, 0.014, 0.045), smoothstep(0.05, 0.95, r));

    // PHASE 1: Black Hole Singularity Vortex + Convene Frequency Rings (0.0 .. 1.14s)
    if (t < 1.24) {
      float p = clamp(t / 1.05, 0.0, 1.0);
      float implode = p * p;
      float vortexMask = 1.0 - smoothstep(1.05, 1.24, t);

      float spiral = theta + (1.75 / (r + 0.13)) - t * (3.6 + implode * 7.0);
      float swirlNoise = fbm(vec2(cos(spiral) * 2.2 + r * 3.0, sin(spiral) * 2.2 - t * 2.8));
      float arms = smoothstep(0.32, 0.82, sin(spiral * 3.0 + swirlNoise * 3.6) * 0.5 + 0.5);

      float horizonR = mix(0.16, 0.035, implode);
      float eventHorizon = smoothstep(horizonR * 0.72, horizonR * 1.25, r);
      float ringGlow = smoothstep(0.04, 0.0, abs(r - horizonR * 1.18));

      // Compressing Wuthering Waves style frequency ring
      float freqR = mix(0.68, 0.05, implode);
      float freqRing = smoothstep(0.012, 0.0, abs(r - freqR)) * smoothstep(0.0, 0.25, p);

      vec3 vortexCol = mix(uAccent, uGold, swirlNoise * 0.75) * arms * smoothstep(0.85, 0.06, r);
      col += vortexCol * (0.95 + implode * 0.8) * vortexMask;
      col += (uGold * 1.4 + vec3(0.8)) * ringGlow * vortexMask;
      col += mix(uGold, vec3(1.0), 0.5) * freqRing * 1.5 * vortexMask;
      col *= mix(1.0, eventHorizon, vortexMask * 0.92);

      // Diagonal falling Omega Lance / Meteor plunging into core
      if (t >= 0.15 && t <= 1.06) {
        float mp = clamp((t - 0.15) / 0.90, 0.0, 1.0);
        vec2 mOrigin = vec2(0.72, 0.54);
        vec2 mPos = mix(mOrigin, vec2(0.0), mp * mp);
        vec2 seg = st - mPos;
        vec2 dir = normalize(-mOrigin);
        float along = dot(seg, dir);
        float perp = length(seg - dir * clamp(along, -0.45, 0.04));
        float meteorGlow = smoothstep(0.065, 0.0, perp) * step(-0.45, along);
        float meteorCore = smoothstep(0.018, 0.0, perp) * step(-0.35, along);
        col += uAccent * meteorGlow * 1.6 + vec3(1.0, 0.95, 0.8) * meteorCore * 2.2;
      }
    }

    // PHASE 2 & 3: Volumetric Light Pillar, Dimensional Cross-Cut & Expanding Shockwaves (1.05s+)
    if (t >= 1.05) {
      float pt = t - 1.05;
      float beamDecay = exp(-pt * 1.15);

      // Vertical Volumetric Energy Pillar with fBm plasma striations
      float pillarWidth = 0.065 / (abs(st.y) + 0.34) + beamDecay * 0.09;
      float pillarNoise = fbm(vec2(st.x * 10.0, st.y * 4.5 - t * 9.0));
      float pillar = smoothstep(pillarWidth, 0.0, abs(st.x)) * (0.65 + 0.55 * pillarNoise);
      float pillarCore = smoothstep(pillarWidth * 0.32, 0.0, abs(st.x));

      col += uAccent * pillar * (0.42 + beamDecay * 1.45);
      col += mix(uGold, vec3(1.0), 0.7) * pillarCore * (0.28 + beamDecay * 1.65);

      // Diagonal anime blade tear across screen (fade over 0.65s)
      if (pt < 0.75) {
        float slashFade = 1.0 - pt / 0.75;
        float d1 = abs(st.y - st.x * 0.42);
        float d2 = abs(st.y + st.x * 0.46);
        float s1 = smoothstep(0.016 * slashFade + 0.002, 0.0, d1) * slashFade;
        float s2 = smoothstep(0.014 * slashFade + 0.002, 0.0, d2) * slashFade * step(0.08, pt);
        col += mix(uGold, vec3(1.0), 0.75) * (s1 + s2) * 2.1;
      }

      // Twin Shockwave Rings + Second Color-Pop Shockwave at t=1.62s
      float ring1 = smoothstep(0.032, 0.0, abs(r - pt * 1.35)) * max(0.0, 1.0 - pt * 1.1);
      col += mix(uGold, vec3(1.0), 0.6) * ring1 * 1.5;

      if (t >= 1.62) {
        float ct = t - 1.62;
        float ring2 = smoothstep(0.038, 0.0, abs(r - ct * 1.55)) * max(0.0, 1.0 - ct * 1.35);
        col += mix(uAccent, vec3(1.0), 0.5) * ring2 * 1.7;
      }

      // Living Sol's RNG Celestial Sanctuary Aura behind Hero Showcase
      float auraFade = smoothstep(1.15, 1.75, t);
      float haloR = 0.27 + 0.012 * sin(t * 2.4);
      float haloDist = abs(r - haloR);
      float glyphSpokes = smoothstep(0.4, 0.85, sin(theta * 12.0 + t * 1.4));
      float outerRune = smoothstep(0.014, 0.0, haloDist) * (0.45 + 0.55 * glyphSpokes);
      float innerRune = smoothstep(0.01, 0.0, abs(r - (haloR - 0.055))) * (0.5 + 0.5 * sin(-theta * 8.0 + t * 2.1));

      // Soft seamless cel-banded horizon plasma nebula (periodic unit-circle coords eliminate atan branch seam)
      float ang = theta + t * 0.28;
      float aurora = fbm(vec2(cos(ang) * 1.9 + r * 1.35, sin(ang) * 1.9 - t * 0.55));
      float horizonGlow = smoothstep(0.82, 0.10, r) * smoothstep(0.32, 0.74, aurora);

      col += uAccent * horizonGlow * 0.85 * auraFade;
      col += uGold * (outerRune * 0.95 + innerRune * 0.7) * auraFade;
    }

    // Crisp Star Sparkles across cosmos
    float stars = starField(st, 6.5, 0.09) + starField(st + 0.37, 11.0, 0.16) * 0.7;
    col += mix(vec3(1.0), uGold, 0.45) * stars * 0.85;

    // SAKUGA IMPACT FRAME: Sudden high-contrast B&W radial ink burst (~90ms)
    if (isImpactFrame) {
      float inkRays = sin(theta * 26.0 + fbm(vec2(theta * 4.0, r * 6.0)) * 4.0);
      float hardCut = step(0.18, inkRays * smoothstep(0.08, 0.45, r));
      float coreWhite = smoothstep(0.24, 0.04, r);
      vec3 impactCol = mix(vec3(0.04, 0.02, 0.05), vec3(1.0, 0.96, 0.88), max(hardCut, coreWhite));
      col = mix(impactCol, vec3(1.0) - clamp(col, 0.0, 1.0), 0.18);
    }

    // Tone-map cleanly to prevent harsh clipping
    col = col / (col + vec3(0.65));
    col = pow(max(col, 0.0), vec3(0.92));

    gl_FragColor = vec4(col, 1.0);
  }
`;

function hexToRgbVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

/** Builds the fullscreen anime splash hero (silhouette -> color) + confirmation UI HTML. */
export function buildFullscreenRevealDomHtml(
  cs: OmegaForgeCutsceneState,
  boss: OmegaBossDef,
  chibi: ChibiDef | undefined,
  effectiveBaseDps?: number
): string {
  const displayBaseDps = effectiveBaseDps ?? chibi?.baseDps ?? 0;
  const starScale = getOmegaPassiveStarScale(cs.targetStars);
  const poseSrc = chibi ? assetUrl(chibi.poses.pose) : '';
  const omegaBadgeHtml = renderRarityBadgeHtml('omega', 'is-compact !ml-0');
  const passiveChips = [
    { label: 'TEAM DMG', val: `+${Math.round(boss.teamDmgPct * starScale * 100)}%`, bg: 'bg-[#fee2e2]', text: 'text-[#b91c1c]' },
    { label: 'DROP ORE', val: `+${Math.round(boss.oreDropPct * starScale * 100)}%`, bg: 'bg-[#e0f2fe]', text: 'text-[#0369a1]' },
    { label: 'SELL ORE', val: `+${Math.round(boss.oreSellPct * starScale * 100)}%`, bg: 'bg-[#dcfce7]', text: 'text-[#15803d]' },
  ]
    .map(
      (p) => `
        <div class="px-2.5 py-1.5 rounded-xl border-2 border-[#14111d] ${p.bg} flex flex-col items-center">
          <span class="text-[9.5px] font-black tracking-wider text-[#475569]">${p.label}</span>
          <span class="text-[14px] font-black tabular-nums ${p.text}">${p.val}</span>
        </div>
      `
    )
    .join('');

  const starsStr = '★'.repeat(cs.targetStars) + '☆'.repeat(Math.max(0, 5 - cs.targetStars));

  return `
    <div class="relative z-10 w-full h-full flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
      <div class="pointer-events-none hidden fixed inset-0 z-20 bg-white mam-omega-flash-veil" data-omega-fs-flash="true"></div>

      <div class="w-full flex items-center justify-between gap-2 relative z-30">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-[#fde047]/65 bg-[#14111d]/85 text-[#fde047] text-[11px] font-black tracking-[0.14em] uppercase">
          <span class="w-2 h-2 rounded-full bg-[#ef4444] animate-ping"></span>
          <span>${cs.kind === 'awaken' ? `OMEGA AWAKENING // ★${cs.targetStars}` : 'OMEGA SANCTUM // VESSEL FORGE'}</span>
        </div>
        <button
          type="button"
          class="pointer-events-auto px-3.5 py-1.5 rounded-xl border-2 border-[#14111d] bg-[#fff8e7] hover:bg-[#fde047] text-[#14111d] text-[12px] font-black cursor-pointer transition-transform hover:scale-95 ${
            cs.phase === 'confirm' ? 'hidden' : ''
          }"
          data-omega-cutscene-skip="true"
        >SKIP &gt;&gt;</button>
      </div>

      <div class="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-y-auto mam-no-scrollbar py-2 relative z-10">
        <div class="hidden flex-col items-center gap-2.5" data-omega-fs-hero="true">
          ${
            poseSrc
              ? `<div class="mam-omega-hero-slam relative w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] flex items-center justify-center">
                  <img
                    src="${poseSrc}"
                    alt=""
                    aria-hidden="true"
                    data-omega-fs-sil="true"
                    class="absolute inset-0 w-full h-full object-contain brightness-0 invert-[0.04] drop-shadow-[0_0_24px_rgba(253,224,71,0.9)]"
                  />
                  <img
                    src="${poseSrc}"
                    alt="${boss.name}"
                    data-omega-fs-color="true"
                    class="hidden relative w-full h-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.85)]"
                  />
                </div>`
              : ''
          }
          <div class="hidden mam-omega-banner-sweep px-6 py-2 rounded-2xl border-[3px] border-[#14111d] bg-[#fff8e7] items-center gap-3 flex-wrap justify-center" data-omega-fs-banner="true">
            ${omegaBadgeHtml}
            <span class="text-[22px] sm:text-[28px] font-black italic tracking-tight uppercase text-[#14111d] leading-none">${boss.name}</span>
            <span class="px-2.5 py-0.5 rounded-lg border-2 border-[#14111d] bg-[#fde047] text-[#14111d] text-[13px] font-black tracking-wider">${starsStr}</span>
          </div>
        </div>

        <div
          class="${
            cs.phase === 'confirm' ? 'flex' : 'hidden'
          } mam-omega-confirm-rise pointer-events-auto w-[min(470px,100%)] rounded-2xl border-[3.5px] border-[#14111d] bg-[#fff8e7] p-4 flex-col items-center text-center gap-2.5"
          data-omega-forge-confirm="true"
          role="dialog"
          aria-label="Omega Forge Confirmation"
        >
          <div class="flex items-center gap-2 flex-wrap justify-center">
            <span class="mam-pill rounded-full bg-[#fde047] text-[#14111d] tracking-wider uppercase">
              ${cs.kind === 'awaken' ? `✦ OMEGA AWAKENING ★${cs.targetStars} COMPLETE! ✦` : '✦ OMEGA FORGE COMPLETE! ✦'}
            </span>
            ${chibi ? `<span class="mam-pill-xs bg-white text-[#b45309] border-[1.5px] border-[#14111d]">⚡ ${fmtShort(displayBaseDps)}/s Base</span>` : ''}
          </div>
          <div class="w-full grid grid-cols-3 gap-2">${passiveChips}</div>
          <div class="text-[11.5px] font-black text-[#15803d] leading-snug">
            ${
              cs.kind === 'awaken'
                ? `Awakened to ★${cs.targetStars}! All 3 Omega Passives boosted (+${(cs.targetStars - 1) * 15}%).`
                : 'Added to your Hotbar & Inventory! Equip on a Mine Plot to activate all 3 Omega Passives.'
            }
          </div>
          <button
            type="button"
            class="mam-sheen-hover relative overflow-hidden w-full py-2.5 px-5 rounded-xl border-[2.5px] border-[#14111d] bg-[#2ee59d] hover:bg-[#4ade80] text-[#14111d] text-[14.5px] font-black uppercase tracking-wider cursor-pointer transition-transform duration-150 hover:scale-[0.98] active:scale-[0.95]"
            data-omega-confirm-close="true"
          >
            Confirm &amp; Collect
          </button>
        </div>
      </div>

      <div class="text-center text-[11px] font-black tracking-[0.16em] uppercase text-white/65 relative z-10" data-omega-fs-caption="true">
        ${
          cs.phase === 'confirm'
            ? `${boss.name} Ready for Deployment`
            : cs.kind === 'awaken'
              ? `Channeling ${boss.coreName} Resonance...`
              : `Converging ${boss.unlockCoreCost} ${boss.coreName}s...`
        }
      </div>
    </div>
  `;
}

/**
 * Owns the full-viewport (`fixed inset-0`) Three.js GLSL anime summon/forge shader cutscene
 * (Singularity Vortex -> Sakuga Impact Frame -> Volumetric Pillar Silhouette -> Color Pop -> Confirm).
 */
export class OmegaForgeCutsceneController {
  private layerEl: HTMLElement | null = null;
  private state: OmegaForgeCutsceneState | null = null;
  private rafId = 0;
  private elapsedSec = 0;
  private lastFrameMs = 0;
  private meteorCueFired = false;
  private impactCueFired = false;
  private colorCueFired = false;
  private onConfirmHandler: (() => void) | null = null;
  private effectiveBaseDps: number | undefined;

  private glRenderer: THREE.WebGLRenderer | null = null;
  private glScene: THREE.Scene | null = null;
  private glCamera: THREE.OrthographicCamera | null = null;
  private glMaterial: THREE.ShaderMaterial | null = null;
  private glGeo: THREE.PlaneGeometry | null = null;

  public getState(): OmegaForgeCutsceneState | null {
    return this.state;
  }

  public start(
    kind: 'unlock' | 'awaken',
    bossId: OmegaBossId,
    targetStars: number,
    onConfirm: () => void,
    effectiveBaseDps?: number
  ): void {
    this.clear();
    this.state = { kind, bossId, targetStars, phase: 'animating' };
    this.onConfirmHandler = onConfirm;
    this.effectiveBaseDps = effectiveBaseDps;
    this.elapsedSec = 0;
    this.lastFrameMs = 0;
    this.meteorCueFired = false;
    this.impactCueFired = false;
    this.colorCueFired = false;

    const boss = getOmegaBossById(bossId) ?? OMEGA_BOSS_DEFS[0];
    audio.playSfx('ui-open');
    this.mountFullscreenDom(boss);
    this.startLoop();
  }

  public skipToConfirm(): void {
    if (!this.state) return;
    if (this.state.phase !== 'confirm') {
      this.state = { ...this.state, phase: 'confirm' };
      this.elapsedSec = Math.max(this.elapsedSec, CONFIRM_AT_SEC);
      audio.playCrystalChord();
      this.syncSilhouettePhase(true);
      this.syncConfirmDom();
    }
  }

  public clear(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.glGeo) {
      this.glGeo.dispose();
      this.glGeo = null;
    }
    if (this.glMaterial) {
      this.glMaterial.dispose();
      this.glMaterial = null;
    }
    if (this.glRenderer) {
      this.glRenderer.dispose();
      this.glRenderer.forceContextLoss();
      this.glRenderer = null;
    }
    this.glScene = null;
    this.glCamera = null;

    if (this.layerEl) {
      this.layerEl.remove();
      this.layerEl = null;
    }
    this.state = null;
    this.onConfirmHandler = null;
    this.effectiveBaseDps = undefined;
  }

  private mountFullscreenDom(boss: OmegaBossDef): void {
    if (typeof document === 'undefined' || !this.state) return;
    const chibi = getChibiById(boss.chibiId);
    const layer = document.createElement('div');
    layer.id = 'omegaCutsceneLayer';
    layer.className = 'fixed inset-0 z-[70] bg-[#06030a] overflow-hidden select-none pointer-events-auto';
    layer.setAttribute('data-omega-forge-cutscene', 'true');

    this.initWebGlShaderLayer(layer, boss);

    const uiWrap = document.createElement('div');
    uiWrap.className = 'relative z-10 w-full h-full';
    uiWrap.innerHTML = buildFullscreenRevealDomHtml(this.state, boss, chibi, this.effectiveBaseDps);
    layer.appendChild(uiWrap);

    document.body.appendChild(layer);
    this.layerEl = layer;

    layer.querySelector<HTMLElement>('[data-omega-cutscene-skip]')?.addEventListener('click', () => {
      this.skipToConfirm();
    });
    layer.querySelector<HTMLElement>('[data-omega-confirm-close]')?.addEventListener('click', () => {
      const cb = this.onConfirmHandler;
      this.clear();
      cb?.();
    });
  }

  private initWebGlShaderLayer(layer: HTMLElement, boss: OmegaBossDef): void {
    if (typeof window === 'undefined') return;
    try {
      const w = Math.max(320, window.innerWidth || 1280);
      const h = Math.max(240, window.innerHeight || 720);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);

      const renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      renderer.domElement.className = 'absolute inset-0 w-full h-full pointer-events-none';
      layer.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geo = new THREE.PlaneGeometry(2, 2);
      const shaderAccent =
        boss.id === 'abyssal-leviathan'
          ? '#06b6d4'
          : boss.id === 'obsidian-sovereign'
            ? '#a855f7'
            : '#ef4444';
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(w * dpr, h * dpr) },
          uAccent: { value: hexToRgbVec3(shaderAccent) },
          uGold: { value: hexToRgbVec3('#fde047') },
        },
        vertexShader: OMEGA_CUTSCENE_VERTEX_SHADER,
        fragmentShader: OMEGA_CUTSCENE_FRAGMENT_SHADER,
        depthTest: false,
        depthWrite: false,
      });

      scene.add(new THREE.Mesh(geo, mat));
      this.glRenderer = renderer;
      this.glScene = scene;
      this.glCamera = camera;
      this.glMaterial = mat;
      this.glGeo = geo;
    } catch {
      // Headless / WebGL-unavailable environment: DOM reveal remains clean
    }
  }

  private resizeWebGlIfNeeded(): void {
    if (!this.glRenderer || !this.glMaterial || typeof window === 'undefined') return;
    const w = Math.max(320, window.innerWidth || 1280);
    const h = Math.max(240, window.innerHeight || 720);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const el = this.glRenderer.domElement;
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (el.width !== targetW || el.height !== targetH) {
      this.glRenderer.setPixelRatio(dpr);
      this.glRenderer.setSize(w, h, false);
      (this.glMaterial.uniforms.uResolution.value as THREE.Vector2).set(targetW, targetH);
    }
  }

  private syncSilhouettePhase(showFullColor: boolean): void {
    if (!this.layerEl) return;
    const heroEl = this.layerEl.querySelector<HTMLElement>('[data-omega-fs-hero]');
    if (heroEl) {
      heroEl.classList.remove('hidden');
      heroEl.classList.add('flex');
    }
    const silEl = this.layerEl.querySelector<HTMLElement>('[data-omega-fs-sil]');
    const colEl = this.layerEl.querySelector<HTMLElement>('[data-omega-fs-color]');
    const bannerEl = this.layerEl.querySelector<HTMLElement>('[data-omega-fs-banner]');
    const flashEl = this.layerEl.querySelector<HTMLElement>('[data-omega-fs-flash]');

    if (showFullColor) {
      silEl?.classList.add('hidden');
      if (colEl) {
        colEl.classList.remove('hidden');
        colEl.classList.add('mam-omega-hero-color-pop');
      }
      if (bannerEl) {
        bannerEl.classList.remove('hidden');
        bannerEl.classList.add('flex');
      }
      if (flashEl) {
        flashEl.classList.remove('hidden');
      }
    }
  }

  private syncConfirmDom(): void {
    if (!this.layerEl || !this.state) return;
    const skipBtn = this.layerEl.querySelector<HTMLElement>('[data-omega-cutscene-skip]');
    if (skipBtn && this.state.phase === 'confirm') {
      skipBtn.classList.add('hidden');
    }
    const confirmCard = this.layerEl.querySelector<HTMLElement>('[data-omega-forge-confirm]');
    if (confirmCard && this.state.phase === 'confirm') {
      confirmCard.classList.remove('hidden');
      confirmCard.classList.add('flex');
    }
    const cap = this.layerEl.querySelector<HTMLElement>('[data-omega-fs-caption]');
    if (cap && this.state.phase === 'confirm') {
      const boss = getOmegaBossById(this.state.bossId) ?? OMEGA_BOSS_DEFS[0];
      cap.textContent = `${boss.name} Ready for Deployment`;
    }
  }

  private startLoop(): void {
    if (typeof window === 'undefined') return;
    this.lastFrameMs = performance.now();
    const tick = (nowMs: number): void => {
      if (!this.state || !this.layerEl) return;
      const dt = Math.min(0.05, Math.max(0, (nowMs - this.lastFrameMs) / 1000));
      this.lastFrameMs = nowMs;
      this.elapsedSec += dt;

      if (this.state.phase === 'animating') {
        if (!this.meteorCueFired && this.elapsedSec >= 0.25) {
          this.meteorCueFired = true;
          audio.playSfx('ui-tab');
        }
        if (!this.impactCueFired && this.elapsedSec >= IMPACT_AT_SEC) {
          this.impactCueFired = true;
          audio.playCrystalChord();
          audio.playSfx('coin-alt');
          this.syncSilhouettePhase(false);
        }
        if (!this.colorCueFired && this.elapsedSec >= COLOR_POP_AT_SEC) {
          this.colorCueFired = true;
          audio.playSfx('place-chibi');
          audio.playCrystalChord();
          this.syncSilhouettePhase(true);
        }
        if (this.elapsedSec >= CONFIRM_AT_SEC) {
          this.state = { ...this.state, phase: 'confirm' };
          this.syncConfirmDom();
        }
      }

      if (this.glRenderer && this.glScene && this.glCamera && this.glMaterial) {
        this.resizeWebGlIfNeeded();
        this.glMaterial.uniforms.uTime.value = this.elapsedSec;
        this.glRenderer.render(this.glScene, this.glCamera);
      }

      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
