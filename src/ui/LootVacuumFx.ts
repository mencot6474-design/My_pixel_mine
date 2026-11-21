import { fmtInt, fmtMoney } from '../game/NumberFormat';

export type LootVacuumBreakKind = 'ore' | 'geode' | 'meteor' | 'crystal_surge' | 'golden_vein';
export type LootOrbKind = 'ore' | 'gem' | 'fever';

const MAX_ACTIVE_ORBS = 24;

interface ActiveLootOrb {
  el: HTMLElement;
  startX: number;
  startY: number;
  ctrlX: number;
  ctrlY: number;
  endX: number;
  endY: number;
  startMs: number;
  durMs: number;
  targetEl: HTMLElement | null;
}

interface RollState {
  displayed: number;
  target: number;
  rafId: number;
}

const activeOrbs: ActiveLootOrb[] = [];
let orbLoopRaf = 0;
let orbLayerEl: HTMLElement | null = null;
const rollStates = new WeakMap<HTMLElement, RollState>();

/** Pure burst particle plan for ore/meteor/event breaks (3-6 flying orbs). */
export function getLootVacuumBurstPlan(kind: LootVacuumBreakKind): readonly LootOrbKind[] {
  switch (kind) {
    case 'meteor':
      return ['gem', 'gem', 'fever', 'fever', 'ore', 'gem'];
    case 'crystal_surge':
      return ['gem', 'gem', 'fever', 'fever', 'ore'];
    case 'golden_vein':
      return ['ore', 'ore', 'ore', 'fever', 'gem'];
    case 'geode':
      return ['ore', 'ore', 'gem', 'fever'];
    default:
      return ['ore', 'ore', 'fever'];
  }
}

function ensureOrbLayer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (orbLayerEl && orbLayerEl.isConnected) return orbLayerEl;
  orbLayerEl = document.createElement('div');
  orbLayerEl.id = 'mamLootVacuumLayer';
  orbLayerEl.className = 'fixed inset-0 pointer-events-none z-[18] overflow-hidden';
  orbLayerEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(orbLayerEl);
  return orbLayerEl;
}

/** Triggers a snappy Sticker-Pop bounce (`scale(1.12)`) on a HUD pill element. */
export function bounceHudPill(target: HTMLElement | null): void {
  if (!target) return;
  target.classList.remove('is-hud-bounce');
  void target.offsetWidth;
  target.classList.add('is-hud-bounce');
}

function resolveOrbTarget(
  root: HTMLElement,
  kind: LootOrbKind
): { x: number; y: number; bounceEl: HTMLElement | null } {
  const vw = typeof window !== 'undefined' ? window.innerWidth || 1280 : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight || 720 : 720;

  let el: HTMLElement | null = null;
  let bounceEl: HTMLElement | null = null;
  if (kind === 'gem') {
    el = root.querySelector<HTMLElement>('[data-hud-gems="true"]');
    bounceEl = el?.closest<HTMLElement>('.rounded-full') ?? el;
  } else if (kind === 'fever') {
    el = root.querySelector<HTMLElement>('[data-hud-overclock="true"] .mam-fever-shell');
    bounceEl = el;
  } else {
    el = root.querySelector<HTMLElement>('[data-action="open-chest"]');
    bounceEl = el;
  }

  if (el && typeof el.getBoundingClientRect === 'function') {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5, bounceEl };
    }
  }

  if (kind === 'fever') return { x: vw * 0.5, y: 42, bounceEl: null };
  return { x: vw - 110, y: vh * 0.44, bounceEl: null };
}

function buildOrbMarkup(kind: LootOrbKind): string {
  if (kind === 'gem') {
    return `<svg viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="M10 2L17 7.5L14 17.5H6L3 7.5L10 2Z" fill="#38bdf8" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/><path d="M10 2L13 7.5L10 17.5L7 7.5L10 2Z" fill="#bae6fd"/></svg>`;
  }
  if (kind === 'fever') {
    return `<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M11.5 1.5L4.5 11H10L8.5 18.5L15.5 9H10L11.5 1.5Z" fill="#fde047" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  }
  return `<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M10 2.5L16.5 6.5L15 15.5L10 18L5 15.5L3.5 6.5L10 2.5Z" fill="#2ee59d" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

function stepOrbs(nowMs: number): void {
  for (let i = activeOrbs.length - 1; i >= 0; i--) {
    const orb = activeOrbs[i];
    const t = Math.min(1, Math.max(0, (nowMs - orb.startMs) / orb.durMs));
    if (t >= 1) {
      orb.el.remove();
      bounceHudPill(orb.targetEl);
      activeOrbs.splice(i, 1);
      continue;
    }
    // Ease-in-out cubic flight along quadratic Bezier curve
    const u = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) * 0.5;
    const inv = 1 - u;
    const x = inv * inv * orb.startX + 2 * inv * u * orb.ctrlX + u * u * orb.endX;
    const y = inv * inv * orb.startY + 2 * inv * u * orb.ctrlY + u * u * orb.endY;
    const scale = t < 0.2 ? 0.65 + (t / 0.2) * 0.45 : t > 0.8 ? 1.1 - ((t - 0.8) / 0.2) * 0.3 : 1.1;
    orb.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(2)})`;
    orb.el.style.opacity = t > 0.88 ? String((1 - t) / 0.12) : '1';
  }

  if (activeOrbs.length > 0 && typeof requestAnimationFrame === 'function') {
    orbLoopRaf = requestAnimationFrame(stepOrbs);
  } else {
    orbLoopRaf = 0;
  }
}

/** Spawns 3-6 curved flying loot orbs toward HUD Chest, Gems, and Fever Gauge pills. */
export function spawnLootVacuumParticles(
  root: HTMLElement,
  originX: number,
  originY: number,
  kind: LootVacuumBreakKind
): void {
  if (typeof document === 'undefined' || typeof requestAnimationFrame !== 'function') return;
  const layer = ensureOrbLayer();
  if (!layer) return;

  const plan = getLootVacuumBurstPlan(kind);
  const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();

  plan.forEach((orbKind, idx) => {
    if (activeOrbs.length >= MAX_ACTIVE_ORBS) {
      const oldest = activeOrbs.shift();
      oldest?.el.remove();
    }
    const target = resolveOrbTarget(root, orbKind);
    const el = document.createElement('div');
    el.className = 'mam-vacuum-orb';
    el.innerHTML = buildOrbMarkup(orbKind);
    const sx = originX + (Math.random() - 0.5) * 34;
    const sy = originY + (Math.random() - 0.5) * 26;
    const arcSide = idx % 2 === 0 ? -1 : 1;
    const ctrlX = (sx + target.x) * 0.5 + arcSide * (48 + Math.random() * 52);
    const ctrlY = Math.min(sy, target.y) - (52 + Math.random() * 44);
    el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%) scale(0.65)`;
    layer.appendChild(el);
    activeOrbs.push({
      el,
      startX: sx,
      startY: sy,
      ctrlX,
      ctrlY,
      endX: target.x,
      endY: target.y,
      startMs: nowMs + idx * 36,
      durMs: 460 + idx * 35,
      targetEl: target.bounceEl,
    });
  });

  if (!orbLoopRaf) {
    orbLoopRaf = requestAnimationFrame(stepOrbs);
  }
}

/** Triggers a brief, potato-safe peripheral flash on Perfect Strike. */
export function triggerPerfectStrikeFlash(): void {
  if (typeof document === 'undefined') return;
  const flash = document.createElement('div');
  flash.className = 'mam-perfect-flash';
  flash.setAttribute('aria-hidden', 'true');
  flash.addEventListener('animationend', () => flash.remove(), { once: true });
  document.body.appendChild(flash);
}

/** Smoothly rolls HUD Cash/Gems counters upward when gaining currency (snaps immediately on spend or headless tests). */
export function rollHudCurrencyValue(
  el: HTMLElement | null,
  targetVal: number,
  kind: 'gems' | 'cash'
): void {
  if (!el) return;
  const format = kind === 'cash' ? fmtMoney : fmtInt;
  const safeTarget = Math.max(0, Math.round(targetVal));
  const existing = rollStates.get(el);

  if (typeof requestAnimationFrame !== 'function' || !el.isConnected) {
    if (existing?.rafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(existing.rafId);
    }
    rollStates.set(el, { displayed: safeTarget, target: safeTarget, rafId: 0 });
    el.textContent = format(safeTarget);
    return;
  }

  if (!existing) {
    rollStates.set(el, { displayed: safeTarget, target: safeTarget, rafId: 0 });
    el.textContent = format(safeTarget);
    return;
  }

  if (safeTarget === existing.target && existing.rafId === 0) {
    const formatted = format(safeTarget);
    if (el.textContent !== formatted) el.textContent = formatted;
    return;
  }

  // Snap down immediately when spending
  if (safeTarget <= existing.displayed) {
    if (existing.rafId) cancelAnimationFrame(existing.rafId);
    existing.displayed = safeTarget;
    existing.target = safeTarget;
    existing.rafId = 0;
    el.textContent = format(safeTarget);
    return;
  }

  const from = existing.displayed;
  existing.target = safeTarget;
  if (existing.rafId) cancelAnimationFrame(existing.rafId);
  bounceHudPill(el.closest<HTMLElement>('.rounded-full'));

  const startMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const durMs = 280;
  const tick = (nowMs: number): void => {
    const p = Math.min(1, Math.max(0, (nowMs - startMs) / durMs));
    const eased = 1 - Math.pow(1 - p, 3);
    const val = Math.round(from + (existing.target - from) * eased);
    existing.displayed = val;
    el.textContent = format(val);
    if (p < 1 && el.isConnected) {
      existing.rafId = requestAnimationFrame(tick);
    } else {
      existing.displayed = existing.target;
      existing.rafId = 0;
      el.textContent = format(existing.target);
    }
  };
  existing.rafId = requestAnimationFrame(tick);
}
