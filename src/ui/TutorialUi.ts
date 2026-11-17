import { assetUrl } from '../game/AssetUrl';
import { audio } from '../audio/AudioManager';

export type TutorialStep =
  | 'welcome'
  | 'ready'
  | 'mine-ore'
  | 'ore-broken'
  | 'click-plot'
  | 'upgrade-dmg'
  | 'exit-plot'
  | 'chest-intro'
  | 'click-chest'
  | 'take-all-chest'
  | 'close-chest'
  | 'go-shop-intro'
  | 'go-shop'
  | 'shop-plaza-intro'
  | 'click-sell-shop'
  | 'select-ore-sell'
  | 'click-sell-btn'
  | 'close-sell-shop'
  | 'congrats'
  | 'done';

const TUTORIAL_STORAGE_KEY = 'mam_tutorial_done_v1';

type ArrowPlacement = 'above' | 'below' | 'beside';

interface TutorialDialogCopy {
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
    text: 'Welcome, Miner! Are you ready to start mining?',
    cta: "Let's Go! ▶",
  },
  ready: {
    text: "Awesome! Follow my lead and let's dig in!",
    cta: 'Next ▶',
  },
  'mine-ore': {
    text: 'Tap the glowing Geode ore in the center until it breaks!',
    hint: 'Tap the ore rock (~10x taps)',
    badge: 'TAP THIS ORE',
    allowCanvas: true,
  },
  'ore-broken': {
    text: 'Nice job! Broken ores are stored safely inside your Chest.',
    cta: 'Next ▶',
  },
  'click-plot': {
    text: 'Time to upgrade your Chibi, Miner! Click Plot #1 where the arrow points.',
    hint: 'Click Onee on Plot #1',
    badge: 'PLOT #1',
    allowCanvas: true,
  },
  'upgrade-dmg': {
    text: "Hit the Upgrade DMG button to boost Onee's mining power!",
    hint: 'Click Upgrade DMG',
    badge: 'UPGRADE DMG',
    domSelector: '[data-inspect-action="up-dmg"]',
    topCard: true,
  },
  'exit-plot': {
    text: 'Great! Now click Exit to return to the Mine.',
    hint: 'Click Exit',
    badge: 'EXIT',
    domSelector: '[data-inspect-action="exit"]',
    arrowPlacement: 'beside',
  },
  'chest-intro': {
    text: "Now let's collect your mined ores from the Chest!",
    cta: 'Next ▶',
  },
  'click-chest': {
    text: 'Click the Chest where the arrow points to open it!',
    hint: 'Click the 3D Chest',
    badge: 'OPEN CHEST',
    allowCanvas: true,
  },
  'take-all-chest': {
    text: 'Click Take All to move your mined ores into your Backpack!',
    hint: 'Click Take All',
    badge: 'TAKE ALL',
    domSelector: '[data-action="chest-take-all"]',
    topCard: true,
  },
  'close-chest': {
    text: 'Awesome! Now close the Chest window.',
    hint: 'Click × to close',
    badge: 'CLOSE',
    domSelector: '[data-action="close-modal"]',
    arrowPlacement: 'beside',
  },
  'go-shop-intro': {
    text: "Now it's time to sell your ores for Cash at the Shop Plaza!",
    cta: 'Next ▶',
  },
  'go-shop': {
    text: 'Click Shops at the top to travel to the Shop Plaza!',
    hint: 'Click Shops',
    badge: 'SHOPS',
    domSelector: '[data-action="shops-pill"]',
    arrowPlacement: 'below',
  },
  'shop-plaza-intro': {
    text: 'You are now at the Shop Plaza! Let’s visit the Sell Items shop.',
    cta: 'Next ▶',
  },
  'click-sell-shop': {
    text: 'Click the Sell Items shop building where the arrow points!',
    hint: 'Click Sell Items shop',
    badge: 'SELL SHOP',
    domSelector: '[data-shop-station="sell"]',
    allowCanvas: true,
  },
  'select-ore-sell': {
    text: 'Click on an Ore in the list to select it for selling!',
    hint: 'Click an Ore card',
    badge: 'SELECT ORE',
    domSelector: '[data-sell-key]',
    topCard: true,
  },
  'click-sell-btn': {
    text: 'Now click the Sell button to trade your ore for Cash!',
    hint: 'Click Sell',
    badge: 'SELL ORE',
    domSelector: '[data-action="sell-selected"]',
    topCard: true,
  },
  'close-sell-shop': {
    text: 'Cha-ching! Now close the Sell Shop window.',
    hint: 'Click × to close',
    badge: 'CLOSE',
    domSelector: '[data-action="close-modal"]',
    arrowPlacement: 'beside',
  },
  congrats: {
    text: 'Congratulations! You have completed the Miner Tutorial. Keep mining, upgrading, and unlocking new Worlds!',
    cta: 'Start Playing! ✔',
  },
};

function crystalPointerSvg(dir: 'down' | 'up' | 'left' | 'right', accent = '#fbbf24'): string {
  const rot =
    dir === 'down' ? 0 : dir === 'up' ? 180 : dir === 'left' ? 90 : -90;
  return `
  <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"
    style="transform:rotate(${rot}deg)" class="drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]">
    <path d="M20 35L7 17L14.5 17L14.5 6L25.5 6L25.5 17L33 17L20 35Z" fill="${accent}" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M20 31L11.5 19.5H17V9H23V19.5H28.5L20 31Z" fill="white" fill-opacity="0.28"/>
  </svg>`;
}

function badgePillHtml(text: string, variant: 'amber' | 'cyan' = 'amber'): string {
  const palette =
    variant === 'cyan'
      ? 'border-cyan-200/80 bg-[linear-gradient(135deg,#0891b2,#0284c7)] shadow-[0_6px_18px_rgba(6,182,212,0.55),inset_0_1px_0_rgba(255,255,255,0.45)]'
      : 'border-amber-200/80 bg-[linear-gradient(135deg,#f59e0b,#ea580c)] shadow-[0_6px_18px_rgba(245,158,11,0.55),inset_0_1px_0_rgba(255,255,255,0.45)]';
  return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full border ${palette} text-white text-[11px] font-black tracking-wider uppercase whitespace-nowrap [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">✦ ${text}</span>`;
}

export class TutorialUi {
  private step: TutorialStep = 'done';
  private overlayEl: HTMLElement | null = null;
  private arrowEl: HTMLElement | null = null;
  private plotAnchorPos = { x: 0, y: 0, visible: false };
  private chestAnchorPos = { x: 0, y: 0, visible: false };
  private guardBound = false;

  constructor(
    private readonly onSetPitZoom: (zoomed: boolean) => void,
    private readonly onSetChestZoom: (zoomed: boolean) => void,
    private readonly onSetSellShopZoom: (zoomed: boolean) => void
  ) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.step = 'done';
      return;
    }
    try {
      const done = localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1';
      this.step = done ? 'done' : 'welcome';
    } catch {
      this.step = 'done';
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
    if (this.step === 'done' || !this.arrowEl) return;
    const copy = DIALOG_COPY[this.step];
    if (!copy.domSelector) return;
    const el = document.querySelector<HTMLElement>(copy.domSelector);
    if (!el) {
      this.arrowEl.style.display = 'none';
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      this.arrowEl.style.display = 'none';
      return;
    }
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
      this.step = 'chest-intro';
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
      this.step = 'go-shop-intro';
      this.render();
      return;
    }
    if (this.step === 'go-shop' && sceneMode === 'shop') {
      this.step = 'shop-plaza-intro';
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
    this.step = 'ore-broken';
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
      audio.playSfx('ui-click');
      this.step = 'ready';
      this.render();
      return;
    }
    if (this.step === 'ready') {
      audio.playSfx('ui-open');
      this.onSetPitZoom(true);
      this.step = 'mine-ore';
      this.render();
      return;
    }
    if (this.step === 'ore-broken') {
      audio.playSfx('ui-open');
      this.onSetPitZoom(false);
      this.step = 'click-plot';
      this.render();
      return;
    }
    if (this.step === 'chest-intro') {
      audio.playSfx('ui-open');
      this.onSetChestZoom(true);
      this.step = 'click-chest';
      this.render();
      return;
    }
    if (this.step === 'go-shop-intro') {
      audio.playSfx('ui-click');
      this.onSetChestZoom(false);
      this.step = 'go-shop';
      this.render();
      return;
    }
    if (this.step === 'shop-plaza-intro') {
      audio.playSfx('ui-open');
      this.onSetSellShopZoom(true);
      this.step = 'click-sell-shop';
      this.render();
      return;
    }
    if (this.step === 'congrats') {
      this.complete();
    }
  }

  public complete(): void {
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
  }

  public render(): void {
    if (!this.overlayEl) return;
    if (this.step === 'done') {
      this.overlayEl.innerHTML = '';
      this.arrowEl = null;
      return;
    }

    const copy = DIALOG_COPY[this.step];
    const hasCta = Boolean(copy.cta);
    const oneeUrl = assetUrl('/chibi/astral-recruit/idle.webp');

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
      ? 'top-[14px] left-1/2 -translate-x-1/2'
      : 'bottom-[96px] @max-[720px]:bottom-[84px] left-1/2 -translate-x-1/2';

    this.overlayEl.innerHTML = `
      ${hasCta ? '<div class="fixed inset-0 bg-slate-950/35 pointer-events-auto" data-tutorial-backdrop="true"></div>' : ''}
      ${pointerArrowHtml}
      <div class="fixed ${positionClass} w-[min(560px,calc(100vw-24px))] pointer-events-auto z-10">
        <div class="relative flex items-end gap-3 rounded-2xl border-2 border-cyan-300/65 bg-[linear-gradient(155deg,rgba(15,23,42,0.96),rgba(30,41,59,0.95))] px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.65),0_0_24px_rgba(56,189,248,0.22)] backdrop-blur-md ${hasCta ? 'cursor-pointer' : ''}" data-tutorial-card="true">
          <div class="w-[74px] h-[74px] @max-[720px]:w-[60px] @max-[720px]:h-[60px] shrink-0 rounded-xl border border-cyan-300/45 bg-[radial-gradient(circle_at_50%_65%,rgba(56,189,248,0.24),rgba(15,23,42,0.9))] flex items-center justify-center overflow-hidden">
            <img src="${oneeUrl}" alt="Onee" class="w-[68px] h-[68px] @max-[720px]:w-[54px] @max-[720px]:h-[54px] object-contain" />
          </div>
          <div class="flex-1 min-w-0 flex flex-col gap-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-cyan-300">
                <span>✦ Onee</span>
                <span class="text-[10px] font-bold text-slate-400 normal-case tracking-normal">Guide</span>
              </span>
            </div>
            <p class="text-[14px] @max-[720px]:text-[13px] font-bold leading-snug text-white m-0">${copy.text}</p>
            <div class="flex items-center justify-between gap-2 mt-0.5">
              ${
                copy.hint
                  ? `<span class="text-[11px] font-extrabold text-amber-300 animate-pulse">● ${copy.hint}</span>`
                  : '<span class="text-[11px] font-bold text-slate-400">Click anywhere to continue</span>'
              }
              ${
                copy.cta
                  ? `<button class="px-3 py-1 rounded-xl border border-cyan-300/60 bg-[linear-gradient(135deg,#0284c7,#0ea5e9)] text-white text-[12px] font-black shadow-[0_3px_10px_rgba(14,165,233,0.4)] hover:brightness-110 active:scale-95 cursor-pointer" data-tutorial-next="true">${copy.cta}</button>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>
    `;

    this.arrowEl = this.overlayEl.querySelector('#tutorialArrow');

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
