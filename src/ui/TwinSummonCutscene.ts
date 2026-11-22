import * as THREE from 'three';
import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import { getPremiumShopItemByChibiId, PREMIUM_SHOP_ITEMS, PremiumShopItemDef } from '../game/PremiumShopData';
import { ChibiDef, getChibiById } from '../game3d/ChibiCatalog';
import { renderRarityBadgeHtml } from './HudShared';

export interface TwinSummonCutsceneState {
  chibiId: string;
  ownedCount: number;
  phase: 'animating' | 'confirm';
}

interface TwinCutscenePalette {
  colorA: string;
  colorB: string;
  ribbonClass: string;
}

const IMPACT_AT_SEC = 1.05;
const COLOR_POP_AT_SEC = 1.62;
const CONFIRM_AT_SEC = 2.7;

const TWIN_CUTSCENE_PALETTES: Record<string, TwinCutscenePalette> = {
  'yukikage-twins': { colorA: '#38bdf8', colorB: '#f472b6', ribbonClass: 'text-[#38bdf8]' },
  'halcyon-twins': { colorA: '#22d3ee', colorB: '#fde047', ribbonClass: 'text-[#22d3ee]' },
  'nocturne-twins': { colorA: '#a855f7', colorB: '#fb7185', ribbonClass: 'text-[#c084fc]' },
  'lullaby-twins': { colorA: '#e879f9', colorB: '#38bdf8', ribbonClass: 'text-[#e879f9]' },
  'clockwork-twins': { colorA: '#f59e0b', colorB: '#2dd4bf', ribbonClass: 'text-[#fbbf24]' },
};

const DEFAULT_TWIN_PALETTE: TwinCutscenePalette = {
  colorA: '#38bdf8',
  colorB: '#f472b6',
  ribbonClass: 'text-[#38bdf8]',
};

export function getTwinCutscenePalette(chibiId: string): TwinCutscenePalette {
  return TWIN_CUTSCENE_PALETTES[chibiId] ?? DEFAULT_TWIN_PALETTE;
}

const TWIN_CUTSCENE_VERTEX_SHADER = `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Distinct Cyber-Prism / Binary Star Aurora shader for TWIN Premium Shop summons:
 * Phase 1 (0..1.05s): Dual binary-star orbs spiraling inward inside a rotating diamond prism lattice
 * Climax (1.05..1.13s): Prismatic diamond-facet impact flash
 * Phase 2+ (1.05s+): Twin harmonic helix ribbons + diamond shockwaves + iridescent starlight sanctuary
 */
const TWIN_CUTSCENE_FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  #define PI 3.14159265359

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 567.21));
    p += dot(p, p + 34.45);
    return fract(p.x * p.y);
  }

  float diamondDist(vec2 p) {
    return abs(p.x) + abs(p.y);
  }

  vec2 rotate2d(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  }

  float prismStars(vec2 uv, float scale, float speed) {
    vec2 gv = fract(uv * scale + vec2(uTime * speed * 0.35, -uTime * speed)) - 0.5;
    vec2 id = floor(uv * scale + vec2(uTime * speed * 0.35, -uTime * speed));
    float rnd = hash21(id);
    if (rnd < 0.78) return 0.0;
    vec2 off = vec2(fract(rnd * 27.3) - 0.5, fract(rnd * 61.9) - 0.5) * 0.62;
    vec2 q = gv - off;
    float sparkle = max(0.0, 1.0 - diamondDist(q) * 9.0);
    float twinkle = 0.5 + 0.5 * sin(uTime * 5.8 + rnd * 36.0);
    return sparkle * sparkle * twinkle;
  }

  void main() {
    float minRes = min(uResolution.x, uResolution.y);
    vec2 centerPx = vec2(0.5 * uResolution.x, 0.65 * uResolution.y);
    vec2 st = (gl_FragCoord.xy - centerPx) / max(1.0, minRes);
    float t = uTime;

    bool isImpactFrame = (t >= 1.05 && t < 1.13);
    if (isImpactFrame) {
      st += (vec2(hash21(vec2(t * 91.0, 3.0)), hash21(vec2(7.0, t * 79.0))) - 0.5) * 0.036;
    } else if (t >= 1.13 && t < 1.58) {
      float decay = 1.0 - (t - 1.13) / 0.45;
      st += vec2(sin(t * 70.0), cos(t * 58.0)) * 0.008 * decay;
    }

    float r = length(st) + 0.0001;
    float dDia = diamondDist(st);
    float theta = atan(st.y, st.x);

    // Deep twilight indigo + cool prism radial tint
    vec3 baseBg = vec3(0.028, 0.042, 0.115);
    vec3 prismMix = mix(uColorA, uColorB, 0.5 + 0.5 * sin(theta * 2.0 + t * 1.4));
    vec3 col = mix(prismMix * 0.24, baseBg, smoothstep(0.08, 0.92, r));

    // PHASE 1: Binary Twin Star Orbit + Closing Prism Lattice (0.0 .. 1.15s)
    if (t < 1.18) {
      float p = clamp(t / 1.05, 0.0, 1.0);
      float easeIn = p * p * (0.4 + 0.6 * p);
      float mask = 1.0 - smoothstep(1.05, 1.18, t);

      float orbitR = mix(0.54, 0.0, easeIn);
      float orbitAng = t * 5.2 + easeIn * 5.4;
      vec2 starA = vec2(cos(orbitAng), sin(orbitAng)) * orbitR;
      vec2 starB = -starA;

      // Crisp faceted diamond rings closing inward
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 rotSt = rotate2d(st, t * (0.7 + fi * 0.35) * (i == 1 ? -1.0 : 1.0));
        float targetR = mix(0.68 - fi * 0.16, 0.06, easeIn);
        float diaRing = smoothstep(0.015, 0.0, abs(diamondDist(rotSt) - targetR));
        vec3 ringCol = (i == 1) ? uColorB : uColorA;
        col += ringCol * diaRing * (0.9 + p * 0.8) * mask;
      }

      // Twin Companion Orbs + Halo Flares
      float dA = length(st - starA);
      float dB = length(st - starB);
      float trailAngA = theta - orbitAng;
      float trailAngB = theta - (orbitAng + PI);
      float arcTrailA = exp(-abs(r - orbitR) * 28.0) * smoothstep(1.4, 0.0, mod(-trailAngA + 2.0 * PI, 2.0 * PI));
      float arcTrailB = exp(-abs(r - orbitR) * 28.0) * smoothstep(1.4, 0.0, mod(-trailAngB + 2.0 * PI, 2.0 * PI));

      col += uColorA * (smoothstep(0.11, 0.0, dA) * 1.45 + arcTrailA * 0.85) * mask;
      col += uColorB * (smoothstep(0.11, 0.0, dB) * 1.45 + arcTrailB * 0.85) * mask;
      col += vec3(1.0) * (smoothstep(0.026, 0.0, dA) + smoothstep(0.026, 0.0, dB)) * 1.7 * mask;
    }

    // PHASE 2 & 3: Vertical Aurora Mirror Curtain, Twin Helix Ribbons & Diamond Mandala (1.05s+)
    if (t >= 1.05) {
      float pt = t - 1.05;
      float burstDecay = exp(-pt * 1.3);

      // Iridescent center prism curtain
      float curtainW = 0.075 / (abs(st.y) + 0.35) + burstDecay * 0.095;
      float shimmer = 0.72 + 0.28 * sin(st.y * 14.0 - t * 6.5);
      float curtain = smoothstep(curtainW, 0.0, abs(st.x)) * shimmer;
      col += prismMix * curtain * (0.36 + burstDecay * 1.25);

      // Twin Weaving Helix Ribbons
      float waveAmp = 0.085 + 0.05 * burstDecay;
      float helixPhase = st.y * 7.5 - t * 4.2;
      float x1 = sin(helixPhase) * waveAmp;
      float x2 = -x1;
      float ribbon1 = smoothstep(0.026, 0.0, abs(st.x - x1)) * smoothstep(0.95, 0.05, abs(st.y));
      float ribbon2 = smoothstep(0.026, 0.0, abs(st.x - x2)) * smoothstep(0.95, 0.05, abs(st.y));
      col += uColorA * ribbon1 * (0.65 + burstDecay * 0.9);
      col += uColorB * ribbon2 * (0.65 + burstDecay * 0.9);

      // Expanding Faceted Diamond Shockwaves (t=1.05s & color-pop at t=1.62s)
      float dWave1 = smoothstep(0.036, 0.0, abs(dDia - pt * 1.65)) * max(0.0, 1.0 - pt * 1.05);
      col += mix(uColorA, vec3(1.0), 0.55) * dWave1 * 1.55;

      if (t >= 1.62) {
        float ct = t - 1.62;
        float dWave2 = smoothstep(0.04, 0.0, abs(dDia - ct * 1.85)) * max(0.0, 1.0 - ct * 1.25);
        col += mix(uColorB, vec3(1.0), 0.5) * dWave2 * 1.65;
      }

      // Twin Sanctuary Rotating Double-Diamond Filigree Mandala behind Hero
      float auraFade = smoothstep(1.12, 1.70, t);
      vec2 rot1 = rotate2d(st, t * 0.45);
      vec2 rot2 = rotate2d(st, -t * 0.45 + PI * 0.25);
      float mandalaR = 0.34 + 0.014 * sin(t * 2.8);
      float m1 = smoothstep(0.012, 0.0, abs(diamondDist(rot1) - mandalaR));
      float m2 = smoothstep(0.012, 0.0, abs(diamondDist(rot2) - mandalaR));
      float ringHalo = smoothstep(0.014, 0.0, abs(r - 0.28));

      col += uColorA * (m1 * 0.85 + ringHalo * 0.45) * auraFade;
      col += uColorB * (m2 * 0.85 + ringHalo * 0.45) * auraFade;
    }

    // Floating Prism Starlight Particles
    float stars = prismStars(st, 6.0, 0.11) + prismStars(st + 0.41, 10.5, 0.19) * 0.75;
    col += mix(uColorA, uColorB, 0.5 + 0.5 * sin(t * 2.0 + st.x * 5.0)) * stars * 1.05;

    // CLIMAX IMPACT FRAME: Prismatic Inverted Diamond Shatter Burst (~80ms)
    if (isImpactFrame) {
      float rays = sin(theta * 16.0 + dDia * 10.0);
      float facetCut = step(0.12, rays * smoothstep(0.05, 0.4, r));
      float coreBright = smoothstep(0.28, 0.03, dDia);
      vec3 flashCol = mix(uColorA * 0.35 + vec3(0.04, 0.05, 0.14), vec3(0.95, 0.99, 1.0), max(facetCut, coreBright));
      col = mix(flashCol, uColorB, 0.18 * (1.0 - coreBright));
    }

    col = col / (col + vec3(0.62));
    col = pow(max(col, 0.0), vec3(0.92));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function hexToRgbVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

/** Builds the fullscreen anime splash hero (silhouette -> color) + confirmation UI HTML for TWIN purchases. */
export function buildTwinFullscreenRevealDomHtml(
  cs: TwinSummonCutsceneState,
  item: PremiumShopItemDef,
  chibi: ChibiDef | undefined
): string {
  const poseSrc = chibi ? assetUrl(chibi.poses.pose) : '';
  const chibiName = chibi?.name ?? item.chibiId;
  const twinBadgeHtml = renderRarityBadgeHtml('twin', 'is-compact !ml-0');

  const passiveTiles: { label: string; val: string; bg: string; text: string }[] = [];
  if (item.teamDmgPct > 0) {
    passiveTiles.push({
      label: 'TEAM DMG',
      val: `+${Math.round(item.teamDmgPct * 100)}%`,
      bg: 'bg-[#fee2e2]',
      text: 'text-[#b91c1c]',
    });
  }
  if (item.oreDropPct > 0) {
    passiveTiles.push({
      label: 'DROP ORE',
      val: `+${Math.round(item.oreDropPct * 100)}%`,
      bg: 'bg-[#e0f2fe]',
      text: 'text-[#0369a1]',
    });
  }
  if (item.oreSellPct > 0) {
    passiveTiles.push({
      label: 'SELL ORE',
      val: `+${Math.round(item.oreSellPct * 100)}%`,
      bg: 'bg-[#dcfce7]',
      text: 'text-[#15803d]',
    });
  }
  passiveTiles.push({
    label: 'OWNED',
    val: `×${fmtInt(cs.ownedCount)}`,
    bg: 'bg-[#fae8ff]',
    text: 'text-[#a21caf]',
  });

  const passiveChips = passiveTiles
    .map(
      (p) => `
        <div class="px-2.5 py-1.5 rounded-xl border-2 border-[#14111d] ${p.bg} flex flex-col items-center">
          <span class="text-[9.5px] font-black tracking-wider text-[#475569]">${p.label}</span>
          <span class="text-[14px] font-black tabular-nums ${p.text}">${p.val}</span>
        </div>
      `
    )
    .join('');

  return `
    <div class="relative z-10 w-full h-full flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
      <div class="pointer-events-none hidden fixed inset-0 z-20 bg-[#e0f2fe] mam-omega-flash-veil" data-twin-fs-flash="true"></div>

      <div class="w-full flex items-center justify-between gap-2 relative z-30">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-[#38bdf8]/70 bg-[#0b1026]/85 text-[#7dd3fc] text-[11px] font-black tracking-[0.14em] uppercase">
          <span class="w-2 h-2 rounded-full bg-[#f472b6] animate-ping"></span>
          <span>TWIN RESONANCE // PREMIUM SUMMON</span>
        </div>
        <button
          type="button"
          class="pointer-events-auto px-3.5 py-1.5 rounded-xl border-2 border-[#14111d] bg-[#f0f9ff] hover:bg-[#bae6fd] text-[#14111d] text-[12px] font-black cursor-pointer transition-transform hover:scale-95 ${
            cs.phase === 'confirm' ? 'hidden' : ''
          }"
          data-twin-cutscene-skip="true"
        >SKIP &gt;&gt;</button>
      </div>

      <div class="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-y-auto mam-no-scrollbar py-2 relative z-10">
        <div class="hidden flex-col items-center gap-2.5" data-twin-fs-hero="true">
          ${
            poseSrc
              ? `<div class="mam-omega-hero-slam relative w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] flex items-center justify-center">
                  <img
                    src="${poseSrc}"
                    alt=""
                    aria-hidden="true"
                    data-twin-fs-sil="true"
                    class="absolute inset-0 w-full h-full object-contain brightness-0 invert-[0.06] drop-shadow-[0_0_26px_rgba(56,189,248,0.95)]"
                  />
                  <img
                    src="${poseSrc}"
                    alt="${chibiName}"
                    data-twin-fs-color="true"
                    class="hidden relative w-full h-full object-contain drop-shadow-[0_14px_26px_rgba(0,0,0,0.85)]"
                  />
                </div>`
              : ''
          }
          <div class="hidden mam-omega-banner-sweep px-6 py-2 rounded-2xl border-[3px] border-[#14111d] bg-[#f0f9ff] items-center gap-3 flex-wrap justify-center" data-twin-fs-banner="true">
            ${twinBadgeHtml}
            <span class="text-[22px] sm:text-[28px] font-black italic tracking-tight uppercase text-[#14111d] leading-none">${chibiName}</span>
            <span class="px-2.5 py-0.5 rounded-lg border-2 border-[#14111d] bg-gradient-to-r from-[#38bdf8] to-[#f472b6] text-white text-[12px] font-black tracking-wider">
              ${cs.ownedCount <= 1 ? 'NEW DUO!' : `OWNED ×${fmtInt(cs.ownedCount)}`}
            </span>
          </div>
        </div>

        <div
          class="${
            cs.phase === 'confirm' ? 'flex' : 'hidden'
          } mam-omega-confirm-rise pointer-events-auto w-[min(470px,100%)] rounded-2xl border-[3.5px] border-[#14111d] bg-[#f0f9ff] p-4 flex-col items-center text-center gap-2.5"
          data-twin-confirm="true"
          role="dialog"
          aria-label="Twin Summon Confirmation"
        >
          <div class="flex items-center gap-2 flex-wrap justify-center">
            <span class="mam-pill rounded-full bg-[#e0f2fe] text-[#0369a1] tracking-wider uppercase">
              ✦ ${item.titleTag} ✦
            </span>
            ${chibi ? `<span class="mam-pill-xs bg-white text-[#b45309] border-[1.5px] border-[#14111d]">⚡ ${fmtShort(chibi.baseDps)}/s Base</span>` : ''}
          </div>
          <div class="w-full grid grid-cols-3 gap-2">${passiveChips}</div>
          <div class="text-[11.5px] font-black text-[#0369a1] leading-snug">
            Added to your Hotbar &amp; Inventory! Equip on a Mine Plot to activate Dual Passives.
          </div>
          <button
            type="button"
            class="mam-sheen-hover relative overflow-hidden w-full py-2.5 px-5 rounded-xl border-[2.5px] border-[#14111d] bg-[#2ee59d] hover:bg-[#4ade80] text-[#14111d] text-[14.5px] font-black uppercase tracking-wider cursor-pointer transition-transform duration-150 hover:scale-[0.98] active:scale-[0.95]"
            data-twin-confirm-close="true"
          >
            Confirm &amp; Collect
          </button>
        </div>
      </div>

      <div class="text-center text-[11px] font-black tracking-[0.16em] uppercase text-[#bae6fd]/75 relative z-10" data-twin-fs-caption="true">
        ${
          cs.phase === 'confirm'
            ? `${chibiName} Ready for Deployment`
            : `Synchronizing ${item.coinCost} Spire Coins Resonance...`
        }
      </div>
    </div>
  `;
}

/**
 * Owns the full-viewport (`fixed inset-0`) Three.js GLSL Cyber-Prism / Binary Star cutscene
 * played when purchasing a TWIN duo from the Premium Shop.
 */
export class TwinSummonCutsceneController {
  private layerEl: HTMLElement | null = null;
  private state: TwinSummonCutsceneState | null = null;
  private rafId = 0;
  private elapsedSec = 0;
  private lastFrameMs = 0;
  private orbitCueFired = false;
  private impactCueFired = false;
  private colorCueFired = false;
  private onConfirmHandler: (() => void) | null = null;

  private glRenderer: THREE.WebGLRenderer | null = null;
  private glScene: THREE.Scene | null = null;
  private glCamera: THREE.OrthographicCamera | null = null;
  private glMaterial: THREE.ShaderMaterial | null = null;
  private glGeo: THREE.PlaneGeometry | null = null;

  public getState(): TwinSummonCutsceneState | null {
    return this.state;
  }

  public start(chibiId: string, ownedCount: number, onConfirm: () => void): void {
    this.clear();
    const item = getPremiumShopItemByChibiId(chibiId) ?? PREMIUM_SHOP_ITEMS[0];
    if (!item) {
      onConfirm();
      return;
    }
    this.state = { chibiId: item.chibiId, ownedCount, phase: 'animating' };
    this.onConfirmHandler = onConfirm;
    this.elapsedSec = 0;
    this.lastFrameMs = 0;
    this.orbitCueFired = false;
    this.impactCueFired = false;
    this.colorCueFired = false;

    audio.playSfx('ui-open');
    this.mountFullscreenDom(item);
    this.startLoop();
  }

  public skipToConfirm(): void {
    if (!this.state) return;
    if (this.state.phase !== 'confirm') {
      this.state = { ...this.state, phase: 'confirm' };
      this.elapsedSec = Math.max(this.elapsedSec, CONFIRM_AT_SEC);
      audio.playCrystalChord('perfect');
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
  }

  private mountFullscreenDom(item: PremiumShopItemDef): void {
    if (typeof document === 'undefined' || !this.state) return;
    const chibi = getChibiById(item.chibiId);
    const layer = document.createElement('div');
    layer.id = 'twinCutsceneLayer';
    layer.className = 'fixed inset-0 z-[70] bg-[#070b1a] overflow-hidden select-none pointer-events-auto';
    layer.setAttribute('data-twin-summon-cutscene', 'true');

    this.initWebGlShaderLayer(layer, item.chibiId);

    const uiWrap = document.createElement('div');
    uiWrap.className = 'relative z-10 w-full h-full';
    uiWrap.innerHTML = buildTwinFullscreenRevealDomHtml(this.state, item, chibi);
    layer.appendChild(uiWrap);

    document.body.appendChild(layer);
    this.layerEl = layer;

    layer.querySelector<HTMLElement>('[data-twin-cutscene-skip]')?.addEventListener('click', () => {
      this.skipToConfirm();
    });
    layer.querySelector<HTMLElement>('[data-twin-confirm-close]')?.addEventListener('click', () => {
      const cb = this.onConfirmHandler;
      this.clear();
      cb?.();
    });
  }

  private initWebGlShaderLayer(layer: HTMLElement, chibiId: string): void {
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

      const palette = getTwinCutscenePalette(chibiId);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geo = new THREE.PlaneGeometry(2, 2);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(w * dpr, h * dpr) },
          uColorA: { value: hexToRgbVec3(palette.colorA) },
          uColorB: { value: hexToRgbVec3(palette.colorB) },
        },
        vertexShader: TWIN_CUTSCENE_VERTEX_SHADER,
        fragmentShader: TWIN_CUTSCENE_FRAGMENT_SHADER,
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
    const heroEl = this.layerEl.querySelector<HTMLElement>('[data-twin-fs-hero]');
    if (heroEl) {
      heroEl.classList.remove('hidden');
      heroEl.classList.add('flex');
    }
    const silEl = this.layerEl.querySelector<HTMLElement>('[data-twin-fs-sil]');
    const colEl = this.layerEl.querySelector<HTMLElement>('[data-twin-fs-color]');
    const bannerEl = this.layerEl.querySelector<HTMLElement>('[data-twin-fs-banner]');
    const flashEl = this.layerEl.querySelector<HTMLElement>('[data-twin-fs-flash]');

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
      flashEl?.classList.remove('hidden');
    }
  }

  private syncConfirmDom(): void {
    if (!this.layerEl || !this.state) return;
    const skipBtn = this.layerEl.querySelector<HTMLElement>('[data-twin-cutscene-skip]');
    if (skipBtn && this.state.phase === 'confirm') {
      skipBtn.classList.add('hidden');
    }
    const confirmCard = this.layerEl.querySelector<HTMLElement>('[data-twin-confirm]');
    if (confirmCard && this.state.phase === 'confirm') {
      confirmCard.classList.remove('hidden');
      confirmCard.classList.add('flex');
    }
    const cap = this.layerEl.querySelector<HTMLElement>('[data-twin-fs-caption]');
    if (cap && this.state.phase === 'confirm') {
      const chibi = getChibiById(this.state.chibiId);
      cap.textContent = `${chibi?.name ?? this.state.chibiId} Ready for Deployment`;
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
        if (!this.orbitCueFired && this.elapsedSec >= 0.22) {
          this.orbitCueFired = true;
          audio.playSfx('ui-tab');
        }
        if (!this.impactCueFired && this.elapsedSec >= IMPACT_AT_SEC) {
          this.impactCueFired = true;
          audio.playCrystalChord('perfect');
          audio.playSfx('coin-alt');
          this.syncSilhouettePhase(false);
        }
        if (!this.colorCueFired && this.elapsedSec >= COLOR_POP_AT_SEC) {
          this.colorCueFired = true;
          audio.playSfx('rare-fanfare', { volume: 0.72 });
          audio.playCrystalChord('perfect');
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
