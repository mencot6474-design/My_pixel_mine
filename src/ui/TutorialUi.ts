import { assetUrl } from '../game/AssetUrl';
import { audio } from '../audio/AudioManager';
import { enchantDiceIconHtml, hudIconHtml } from './HudIcons';

export const TUTORIAL_REWARD_GEMS = 150;
export const TUTORIAL_REWARD_DICE = 1;

export type TutorialStep =
  | 'welcome'
  | 'mine-ore'
  | 'click-plot'
  | 'upgrade-dmg'
  | 'exit-plot'
  | 'click-chest'
  | 'take-all-chest'
  | 'close-chest'
  | 'go-shop'
  | 'click-sell-shop'
  | 'select-ore-sell'
  | 'click-sell-btn'
  | 'close-sell-shop'
  | 'congrats'
  | 'done';

export interface TutorialStageMeta {
  stage: number;
  total: number;
  label: string;
}

const TUTORIAL_STORAGE_KEY = 'mam_tutorial_done_v1';
const TUTORIAL_REWARD_KEY = 'mam_tutorial_rewarded_v1';

type ArrowPlacement = 'above' | 'below' | 'beside';

interface TutorialDialogCopy {
  stage: number;
  stageLabel: string;
  text: string;
  cta?: string;
  hint?: string;
  badge?: string;
  domSelector?: string;
  allowCanvas?: boolean;
  arrowPlacement?: ArrowPlacement;
  topCard?: boolean;
}

const DIALOG_COPY: Record<Exclude<TutorialStep, 'done'>, TutorialDialogCopy> = {
  welcome: {
    stage: 1,
    stageLabel: 'Mine',
    text: 'Welcome, Miner! Ready to strike your first fortune and build your Chibi squad?',
    cta: 'Start Mining!',
  },
  'mine-ore': {
    stage: 1,
    stageLabel: 'Mine',
    text: 'Tap the glowing Ore in the center until it shatters!',
    hint: 'Tap the ore rock in the pit',
    badge: 'TAP THIS ORE',
    allowCanvas: true,
    topCard: true,
  },
  'click-plot': {
    stage: 2,
    stageLabel: 'Upgrade',
    text: 'Awesome drop! Now click Plot #1 where the arrow points to power up Onee.',
    hint: 'Click Onee on Plot #1',
    badge: 'PLOT #1',
    allowCanvas: true,
  },
  'upgrade-dmg': {
    stage: 2,
    stageLabel: 'Upgrade',
    text: "Hit Upgrade DMG to boost Onee's mining power!",
    hint: 'Click Upgrade DMG',
    badge: 'UPGRADE DMG',
    domSelector: '[data-inspect-action="up-dmg"]',
    topCard: true,
  },
  'exit-plot': {
    stage: 2,
    stageLabel: 'Upgrade',
    text: 'Power boosted! Click Exit to return to the Mine.',
    hint: 'Click Exit',
    badge: 'EXIT',
    domSelector: '[data-inspect-action="exit"]',
    arrowPlacement: 'beside',
  },
  'click-chest': {
    stage: 3,
    stageLabel: 'Collect',
    text: 'Your mined ores are stored safely in your Chest. Click the 3D Chest to open it!',
    hint: 'Click the 3D Chest',
    badge: 'OPEN CHEST',
    allowCanvas: true,
    topCard: true,
  },
  'take-all-chest': {
    stage: 3,
    stageLabel: 'Collect',
    text: 'Click Take All to move your mined ores into your Backpack!',
    hint: 'Click Take All',
    badge: 'TAKE ALL',
    domSelector: '[data-action="chest-take-all"]',
    topCard: true,
  },
  'close-chest': {
    stage: 3,
    stageLabel: 'Collect',
    text: 'Loot secured! Close the Chest window.',
    hint: 'Click × to close',
    badge: 'CLOSE',
    domSelector: '[data-action="close-modal"]',
    arrowPlacement: 'beside',
  },
  'go-shop': {
    stage: 4,
    stageLabel: 'Sell',
    text: 'Time to cash in! Click Plaza at the top to travel to the Shop Plaza.',
    hint: 'Click Plaza',
    badge: 'PLAZA',
    domSelector: '[data-action="shops-pill"]',
    arrowPlacement: 'below',
  },
  'click-sell-shop': {
    stage: 4,
    stageLabel: 'Sell',
    text: 'Welcome to Shop Plaza! Click the Sell Items shop building to trade ores.',
    hint: 'Click Sell Items shop',
    badge: 'SELL SHOP',
    domSelector: '[data-shop-station="sell"]',
    allowCanvas: true,
    topCard: true,
  },
  'select-ore-sell': {
    stage: 4,
    stageLabel: 'Sell',
    text: 'Click an Ore card in your list to select it for selling!',
    hint: 'Click an Ore card',
    badge: 'SELECT ORE',
    domSelector: '[data-sell-key]',
    topCard: true,
  },
  'click-sell-btn': {
    stage: 4,
    stageLabel: 'Sell',
    text: 'Now hit Sell to trade your ore for Cash!',
    hint: 'Click Sell',
    badge: 'SELL ORE',
    domSelector: '[data-action="sell-selected"]',
    topCard: true,
  },
  'close-sell-shop': {
    stage: 4,
    stageLabel: 'Sell',
    text: 'Cha-ching! Close the Sell Shop to claim your Miner Starter Bonus.',
    hint: 'Click × to close',
    badge: 'CLOSE',
    domSelector: '[data-action="close-modal"]',
    arrowPlacement: 'beside',
  },
  congrats: {
    stage: 5,
    stageLabel: 'Reward',
    text: 'Tutorial Complete! Claim your Starter Bonus to supercharge your mining empire!',
    cta: 'Claim &amp; Start Playing!',
  },
};

export function getTutorialStageMeta(step: Exclude<TutorialStep, 'done'>): TutorialStageMeta {
  const copy = DIALOG_COPY[step];
  return { stage: copy.stage, total: 5, label: copy.stageLabel };
}

function crystalPointerSvg(dir: 'down' | 'up' | 'left' | 'right', accent = '#fbbf24'): string {
  const rot = dir === 'down' ? 0 : dir === 'up' ? 180 : dir === 'left' ? 90 : -90;
  return `
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"
    style="transform:rotate(${rot}deg)">
    <path d="M20 35L7 17L14.5 17L14.5 6L25.5 6L25.5 17L33 17L20 35Z" fill="${accent}" stroke="#14111d" stroke-width="3" stroke-linejoin="round"/>
    <path d="M20 31L11.5 19.5H17V9H23V19.5H28.5L20 31Z" fill="white" fill-opacity="0.32"/>
  </svg>`;
}

function badgePillHtml(text: string, variant: 'amber' | 'cyan' = 'amber'): string {
  const palette =
    variant === 'cyan'
      ? 'border-[#14111d] bg-[#38bdf8] text-[#14111d]'
      : 'border-[#14111d] bg-[#fde047] text-[#14111d]';
  return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 ${palette} text-[11px] font-black tracking-wider uppercase whitespace-nowrap">${text}</span>`;
}

export function buildTutorialCardHtml(step: Exclude<TutorialStep, 'done'>): string {
  const copy = DIALOG_COPY[step];
  const meta = getTutorialStageMeta(step);
  const hasCta = Boolean(copy.cta);
  const oneePoseUrl = assetUrl('/chibi/astral-recruit/pose.webp');

  const stageBarsHtml = Array.from({ length: meta.total }, (_, idx) => {
    const filled = idx + 1 <= meta.stage;
    const active = idx + 1 === meta.stage;
    const barCls = active
      ? 'bg-[linear-gradient(90deg,#38bdf8,#fde047)] border border-[#14111d]'
      : filled
        ? 'bg-[#38bdf8] border border-[#14111d]'
        : 'bg-[#fcecc8] border border-[#14111d]/35';
    return `<span class="flex-1 h-2 rounded-full ${barCls}"></span>`;
  }).join('');

  const rewardStripHtml =
    step === 'congrats'
      ? `
        <div class="flex items-center gap-2 flex-wrap my-0.5">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 border-[#14111d] bg-[#e0f2fe] text-[12px] font-black text-[#14111d] tabular-nums">
            ${hudIconHtml('gem', 18, 'Gems')} +${TUTORIAL_REWARD_GEMS} Gems
          </span>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 border-[#14111d] bg-[#f3e8ff] text-[12px] font-black text-[#14111d] tabular-nums">
            ${enchantDiceIconHtml(18)} +${TUTORIAL_REWARD_DICE} Enchant Dice
          </span>
        </div>
      `
      : '';

  const ctaBtnCls =
    step === 'congrats'
      ? 'border-[#14111d] bg-[#fde047] hover:bg-[#fef08a] text-[#14111d]'
      : 'border-[#14111d] bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#14111d]';

  const skipBtnHtml =
    step !== 'congrats'
      ? `<button type="button" class="pointer-events-auto px-2.5 py-0.5 rounded-lg border-2 border-[#14111d] bg-white hover:bg-[#fde047] text-[10.5px] font-black text-[#14111d] cursor-pointer transition-colors" data-tutorial-skip="true" title="Skip Tutorial">Skip</button>`
      : '';

  const compactCls = hasCta ? '' : 'is-compact';
  const textSizeCls = hasCta ? 'text-[14px] @max-[720px]:text-[13px]' : 'text-[12.5px] @max-[720px]:text-[12px]';

  return `
    <div class="mam-tut-card ${compactCls} ${hasCta ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'}" data-tutorial-card="true">
      <div class="mam-tut-portrait-wrap">
        <div class="mam-tut-portrait-halo" aria-hidden="true"></div>
        <img src="${oneePoseUrl}" alt="Onee" class="mam-tut-portrait-img" />
      </div>
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="mam-tut-nameplate">
              <span class="text-[11px] font-black uppercase tracking-[0.08em] text-[#14111d]">ONEE</span>
              <span class="text-[9.5px] font-black uppercase tracking-wider text-[#0369a1]">GUIDE</span>
            </span>
            <span class="text-[10.5px] font-black uppercase tracking-wider text-[#b45309] tabular-nums">Stage ${meta.stage}/${meta.total} • ${meta.label}</span>
          </div>
          ${skipBtnHtml}
        </div>
        <div class="flex items-center gap-1 w-full" aria-hidden="true">${stageBarsHtml}</div>
        <p class="${textSizeCls} font-extrabold leading-snug text-[#14111d] m-0">${copy.text}</p>
        ${rewardStripHtml}
        <div class="flex items-center justify-between gap-2 mt-0.5">
          ${
            copy.hint
              ? `<span class="inline-flex items-center gap-1.5 text-[11px] font-black text-[#b45309] animate-pulse"><span class="w-1.5 h-1.5 rounded-full bg-[#ea580c]"></span>${copy.hint}</span>`
              : '<span class="text-[11px] font-bold text-[#64748b]">Click anywhere to continue</span>'
          }
          ${
            copy.cta
              ? `<button type="button" class="pointer-events-auto px-4 py-1.5 rounded-xl border-2 ${ctaBtnCls} text-[12.5px] font-black hover:scale-[0.97] active:scale-95 cursor-pointer transition-transform duration-150" data-tutorial-next="true">${copy.cta}</button>`
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

export class TutorialUi {
  private step: TutorialStep = 'done';
  private overlayEl: HTMLElement | null = null;
  private arrowEl: HTMLElement | null = null;
  private highlightedEl: HTMLElement | null = null;
  private plotAnchorPos = { x: 0, y: 0, visible: false };
  private chestAnchorPos = { x: 0, y: 0, visible: false };
  private guardBound = false;

  constructor(
    private readonly onSetPitZoom: (zoomed: boolean) => void,
    private readonly onSetChestZoom: (zoomed: boolean) => void,
    private readonly onSetSellShopZoom: (zoomed: boolean) => void,
    private readonly onComplete?: () => void,
    private readonly onClaimReward?: () => void
  ) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.step = 'done';
      return;
    }
    try {
      const force = window.location.search.includes('tutorial=1');
      const done = localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1';
      this.step = force || !done ? 'welcome' : 'done';
    } catch {
      this.step = 'done';
    }
  }

  public static isStoredDone(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      return localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  public isActive(): boolean {
    return this.step !== 'done';
  }

  public mount(): void {
    if (typeof document === 'undefined' || this.overlayEl) return;
    const layer = document.createElement('div');
    layer.id = 'tutorialOverlayLayer';
    layer.className = 'fixed inset-0 pointer-events-none z-[65]';
    document.body.appendChild(layer);
    this.overlayEl = layer;
    this.bindInputGuard();
    this.render();
  }

  private clearTargetHighlight(): void {
    if (this.highlightedEl) {
      this.highlightedEl.classList.remove('mam-tut-target-ring');
      this.highlightedEl = null;
    }
  }

  private applyTargetHighlight(el: HTMLElement | null): void {
    if (this.highlightedEl === el) return;
    this.clearTargetHighlight();
    if (el) {
      el.classList.add('mam-tut-target-ring');
      this.highlightedEl = el;
    }
  }

  private bindInputGuard(): void {
    if (this.guardBound || typeof document === 'undefined') return;
    this.guardBound = true;
    const guard = (e: Event) => {
      if (this.step === 'done') return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('#tutorialOverlayLayer')) return;

      const copy = DIALOG_COPY[this.step];
      if (copy.cta) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }
      if (copy.domSelector && target.closest(copy.domSelector)) {
        return;
      }
      if (copy.allowCanvas && target.closest('#threeRoot')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    document.addEventListener('pointerdown', guard, true);
    document.addEventListener('click', guard, true);
  }

  public updatePlotAnchor(x: number, y: number, visible: boolean): void {
    this.plotAnchorPos = { x, y, visible };
    if (this.step !== 'click-plot' || !this.arrowEl) return;
    this.positionArrow(x, y - 30, visible);
  }

  public updateChestAnchor(x: number, y: number, visible: boolean): void {
    this.chestAnchorPos = { x, y, visible };
    if (this.step !== 'click-chest' || !this.arrowEl) return;
    this.positionArrow(x, y - 20, visible);
  }

  private positionArrow(x: number, y: number, visible: boolean): void {
    if (!this.arrowEl) return;
    if (!visible) {
      this.arrowEl.style.display = 'none';
      return;
    }
    this.arrowEl.style.display = 'block';
    this.arrowEl.style.transform = 'translate(-50%, -100%)';
    this.arrowEl.style.left = `${Math.round(x)}px`;
    this.arrowEl.style.top = `${Math.round(Math.max(72, y))}px`;
  }

  public syncDomArrow(): void {
    if (this.step === 'done' || !this.arrowEl) {
      this.clearTargetHighlight();
      return;
    }
    const copy = DIALOG_COPY[this.step];
    if (!copy.domSelector) {
      this.clearTargetHighlight();
      return;
    }
    const el = document.querySelector<HTMLElement>(copy.domSelector);
    if (!el) {
      this.clearTargetHighlight();
      this.arrowEl.style.display = 'none';
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      this.clearTargetHighlight();
      this.arrowEl.style.display = 'none';
      return;
    }
    this.applyTargetHighlight(el);
    const placement = copy.arrowPlacement ?? 'above';
    if (placement === 'below') {
      this.arrowEl.style.display = 'block';
      this.arrowEl.style.transform = 'translate(-50%, 0)';
      this.arrowEl.style.left = `${Math.round(r.left + r.width / 2)}px`;
      this.arrowEl.style.top = `${Math.round(r.bottom + 8)}px`;
      return;
    }
    if (placement === 'beside') {
      const placeOnLeft = r.right + 150 > window.innerWidth;
      this.arrowEl.style.display = 'block';
      this.arrowEl.style.top = `${Math.round(r.top + r.height / 2)}px`;
      if (placeOnLeft) {
        this.arrowEl.style.transform = 'translate(-100%, -50%)';
        this.arrowEl.style.left = `${Math.round(r.left - 12)}px`;
        this.arrowEl.innerHTML = `<div class="flex flex-row items-center gap-1.5 animate-bounce">${badgePillHtml(copy.badge ?? '')}${crystalPointerSvg('right')}</div>`;
      } else {
        this.arrowEl.style.transform = 'translate(0, -50%)';
        this.arrowEl.style.left = `${Math.round(r.right + 12)}px`;
        this.arrowEl.innerHTML = `<div class="flex flex-row items-center gap-1.5 animate-bounce">${crystalPointerSvg('left')}${badgePillHtml(copy.badge ?? '')}</div>`;
      }
      return;
    }
    this.positionArrow(r.left + r.width / 2, r.top - 10, true);
  }

  public syncView(sceneMode: string, activeModal: string, inspectedSlot: number | null): void {
    if (this.step === 'done') return;

    if (this.step === 'click-plot' && inspectedSlot !== null) {
      audio.playSfx('ui-click');
      this.step = 'upgrade-dmg';
      this.render();
      return;
    }
    if (this.step === 'exit-plot' && inspectedSlot === null) {
      audio.playSfx('ui-close');
      this.onSetChestZoom(true);
      this.step = 'click-chest';
      this.render();
      return;
    }
    if (this.step === 'click-chest' && activeModal === 'chest') {
      audio.playSfx('ui-open');
      this.onSetChestZoom(false);
      this.step = 'take-all-chest';
      this.render();
      return;
    }
    if (this.step === 'close-chest' && activeModal === 'none') {
      this.onSetChestZoom(false);
      this.step = 'go-shop';
      this.render();
      return;
    }
    if (this.step === 'go-shop' && sceneMode === 'shop') {
      this.onSetSellShopZoom(true);
      this.step = 'click-sell-shop';
      this.render();
      return;
    }
    if (this.step === 'click-sell-shop' && activeModal === 'sell-shop') {
      this.onSetSellShopZoom(false);
      this.step = 'select-ore-sell';
      this.render();
      return;
    }
    if (this.step === 'close-sell-shop' && activeModal === 'none') {
      audio.playSfx('rare-fanfare', { volume: 0.65 });
      this.step = 'congrats';
      this.render();
      return;
    }

    if (DIALOG_COPY[this.step].domSelector) {
      window.requestAnimationFrame(() => this.syncDomArrow());
    }
  }

  public notifyOreBroken(): void {
    if (this.step !== 'mine-ore') return;
    audio.playSfx('rare-fanfare', { volume: 0.55 });
    this.onSetPitZoom(false);
    this.step = 'click-plot';
    this.render();
  }

  public notifyUpgraded(): void {
    if (this.step !== 'upgrade-dmg') return;
    this.step = 'exit-plot';
    this.render();
  }

  public notifyChestTaken(): void {
    if (this.step !== 'take-all-chest') return;
    this.step = 'close-chest';
    this.render();
  }

  public notifySellOreSelected(): void {
    if (this.step !== 'select-ore-sell') return;
    this.step = 'click-sell-btn';
    this.render();
  }

  public notifySellCompleted(): void {
    if (this.step !== 'click-sell-btn') return;
    this.step = 'close-sell-shop';
    this.render();
  }

  public advance(): void {
    if (this.step === 'welcome') {
      audio.playSfx('ui-open');
      this.onSetPitZoom(true);
      this.step = 'mine-ore';
      this.render();
      return;
    }
    if (this.step === 'congrats') {
      let alreadyRewarded = false;
      try {
        alreadyRewarded = localStorage.getItem(TUTORIAL_REWARD_KEY) === '1';
        if (!alreadyRewarded) {
          localStorage.setItem(TUTORIAL_REWARD_KEY, '1');
        }
      } catch {
        // ignore storage errors
      }
      if (!alreadyRewarded) {
        this.onClaimReward?.();
      }
      this.complete();
    }
  }

  public skip(): void {
    audio.playSfx('ui-close');
    this.complete();
  }

  public complete(): void {
    this.clearTargetHighlight();
    this.onSetPitZoom(false);
    this.onSetChestZoom(false);
    this.onSetSellShopZoom(false);
    this.step = 'done';
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    this.render();
    this.onComplete?.();
  }

  public render(): void {
    if (!this.overlayEl) return;
    this.clearTargetHighlight();
    if (this.step === 'done') {
      this.overlayEl.innerHTML = '';
      this.arrowEl = null;
      return;
    }

    const copy = DIALOG_COPY[this.step];
    const hasCta = Boolean(copy.cta);

    let pointerArrowHtml = '';
    if (copy.badge) {
      if (this.step === 'mine-ore') {
        pointerArrowHtml = `
          <div class="fixed left-1/2 top-[34%] -translate-x-1/2 -translate-y-full pointer-events-none z-20">
            <div class="flex flex-col items-center gap-1 animate-bounce">
              ${badgePillHtml(copy.badge, 'cyan')}
              ${crystalPointerSvg('down', '#22d3ee')}
            </div>
          </div>`;
      } else if (this.step === 'click-plot') {
        pointerArrowHtml = `
          <div id="tutorialArrow" class="fixed pointer-events-none z-20" style="display:${this.plotAnchorPos.visible ? 'block' : 'none'};transform:translate(-50%,-100%);left:${Math.round(this.plotAnchorPos.x)}px;top:${Math.round(Math.max(72, this.plotAnchorPos.y - 30))}px;">
            <div class="flex flex-col items-center gap-1 animate-bounce">
              ${badgePillHtml(copy.badge)}
              ${crystalPointerSvg('down')}
            </div>
          </div>`;
      } else if (this.step === 'click-chest') {
        pointerArrowHtml = `
          <div id="tutorialArrow" class="fixed pointer-events-none z-20" style="display:${this.chestAnchorPos.visible ? 'block' : 'none'};transform:translate(-50%,-100%);left:${Math.round(this.chestAnchorPos.x)}px;top:${Math.round(Math.max(72, this.chestAnchorPos.y - 20))}px;">
            <div class="flex flex-col items-center gap-1 animate-bounce">
              ${badgePillHtml(copy.badge)}
              ${crystalPointerSvg('down')}
            </div>
          </div>`;
      } else if (copy.domSelector) {
        const placement = copy.arrowPlacement ?? 'above';
        const innerHtml =
          placement === 'below'
            ? `<div class="flex flex-col items-center gap-1 animate-bounce">${crystalPointerSvg('up')}${badgePillHtml(copy.badge)}</div>`
            : `<div class="flex flex-col items-center gap-1 animate-bounce">${badgePillHtml(copy.badge)}${crystalPointerSvg('down')}</div>`;
        pointerArrowHtml = `
          <div id="tutorialArrow" class="fixed pointer-events-none z-20" style="display:none;left:0px;top:0px;">
            ${innerHtml}
          </div>`;
      }
    }

    const positionClass = copy.topCard
      ? 'top-[12px] left-1/2 mam-tut-scale-wrap is-top'
      : hasCta
        ? 'bottom-[90px] @max-[720px]:bottom-[74px] left-1/2 mam-tut-scale-wrap is-bottom'
        : 'bottom-[14px] left-1/2 mam-tut-scale-wrap is-bottom';

    const cardWidthCls = hasCta ? 'w-[min(540px,calc(100vw-24px))]' : 'w-[min(450px,calc(100vw-20px))]';

    this.overlayEl.innerHTML = `
      ${hasCta ? '<div class="fixed inset-0 bg-slate-950/48 pointer-events-auto" data-tutorial-backdrop="true"></div>' : ''}
      ${pointerArrowHtml}
      <div class="fixed ${positionClass} ${cardWidthCls} ${hasCta ? 'pointer-events-auto' : 'pointer-events-none'} z-10">
        ${buildTutorialCardHtml(this.step)}
      </div>
    `;

    this.arrowEl = this.overlayEl.querySelector('#tutorialArrow');

    this.overlayEl.querySelector('[data-tutorial-skip]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.skip();
    });

    this.overlayEl.querySelector('[data-tutorial-next]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.advance();
    });

    if (hasCta) {
      this.overlayEl.querySelector('[data-tutorial-card]')?.addEventListener('click', () => {
        this.advance();
      });
      this.overlayEl.querySelector('[data-tutorial-backdrop]')?.addEventListener('click', () => {
        this.advance();
      });
    } else if (copy.domSelector) {
      window.requestAnimationFrame(() => this.syncDomArrow());
    }
  }
}
