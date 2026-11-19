import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { ENCHANT_DICE_GEM_COST, ENCHANTS } from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt } from '../game/NumberFormat';
import { SceneMode } from '../game3d/MineScene3D';
import { ShopStationId } from '../game3d/ShopWorld3D';
import { enchantAuraIconHtml, enchantDiceIconHtml, hudIconHtml, towerIconHtml } from './HudIcons';
import {
  TW_ALTAR_AUTO_BTN,
  TW_ALTAR_ROLL_BTN,
  TW_SHOP_DOCK_BTN_BASE,
  TW_SHOPS_PILL,
  TW_TOP_CENTER,
} from './HudShared';

export interface AltarRollButtonState {
  disabled: boolean;
  extraClass: string;
  labelHtml: string;
}

/** Computes button label, disabled state, and modifier class for the Enchant Altar roll button. */
export function getAltarRollButtonState(
  enchantDice: number,
  enchantSpinning: boolean
): AltarRollButtonState {
  const outOfRolls = enchantDice <= 0;
  return {
    disabled: enchantSpinning,
    extraClass: enchantSpinning ? 'is-spinning' : outOfRolls ? 'is-empty' : '',
    labelHtml: enchantSpinning
      ? '<span class="inline-block animate-[mamSpinPulse_0.65s_ease-in-out_infinite_alternate]">Spinning...</span>'
      : outOfRolls
        ? 'Out of Rolls'
        : 'Roll',
  };
}

/** Builds HTML for the 10 Enchant Altar cards along the bottom roll strip. */
export function renderAltarStripCardsHtml(state: GameState): string {
  return ENCHANTS.map((e) => {
    const qty = state.ownedEnchants[e.id] || 0;
    const borderBg =
      e.rarity === 'rainbow'
        ? 'rarity-rainbow'
        : 'border-[2.5px] border-[var(--rarity-border,#64748b)] bg-[radial-gradient(circle_at_50%_45%,var(--rarity-bg,rgba(100,116,139,0.3)),#0f172a_85%)]';
    return `
        <div class="mam-altar-card relative h-[102px] @max-[920px]:h-[86px] rounded-[7px] flex flex-col items-center justify-between py-[5px] px-1 transition-[transform,filter] duration-[140ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-[3px] hover:scale-[1.04] hover:brightness-[1.08] ${borderBg}" style="--rarity-border:${e.color};--rarity-bg:${e.color}33" data-altar-card="${e.id}">
          <div class="w-full flex items-center justify-center gap-1">
            <span class="text-[12px] font-black mam-outline-sm" style="color:${e.color}">${e.name}</span>
            <span class="text-[11px] font-black tabular-nums text-[#facc15] mam-outline-sm" data-altar-qty="${e.id}">${qty > 0 ? `x${fmtInt(qty)}` : ''}</span>
          </div>
          <div class="flex-1 min-h-0 flex items-center justify-center pointer-events-none [&>.mam-3d-icon]:w-[46px] [&>.mam-3d-icon]:h-[46px]">${enchantAuraIconHtml(e.id, e.color, 46, e.name)}</div>
          <div class="text-[11px] font-black tabular-nums text-[#f8fafc] mam-outline-sm">${e.chancePct}%</div>
        </div>
      `;
  }).join('');
}

/** Builds complete Shop Plaza HUD HTML around injected shared HUD slots. */
export function renderShopWorldHudHtml(opts: {
  weatherHtml: string;
  currencyRailHtml: string;
  activePotionsHtml: string;
  dpsMeterHtml: string;
  modalHtml: string;
  toastStackHtml: string;
}): string {
  const dockBtnPickaxe = `${TW_SHOP_DOCK_BTN_BASE} border-2 border-orange-400 bg-[linear-gradient(160deg,#ea580c_0%,#431407_100%)]`;
  const dockBtnSell = `${TW_SHOP_DOCK_BTN_BASE} border-2 border-emerald-400 bg-[linear-gradient(160deg,#10b981_0%,#064e3b_100%)]`;
  const dockBtnGem = `${TW_SHOP_DOCK_BTN_BASE} border-2 border-cyan-400 bg-[linear-gradient(160deg,#06b6d4_0%,#164e63_100%)]`;
  const dockBtnRainbow = `${TW_SHOP_DOCK_BTN_BASE} border-2 border-transparent [background:linear-gradient(160deg,#581c87_0%,#111827_100%)_padding-box,linear-gradient(135deg,#f43f5e,#f59e0b,#22c55e,#38bdf8,#c084fc)_border-box]`;
  const dockBtnTower = `${TW_SHOP_DOCK_BTN_BASE} border-2 border-sky-400 bg-[linear-gradient(160deg,#0e7490_0%,#1e1b4b_100%)]`;

  return `
      ${opts.weatherHtml}
      <div class="${TW_TOP_CENTER}">
        <button class="${TW_SHOPS_PILL} mam-outline" data-action="back-to-mine">
          ${hudIconHtml('shops', 28, 'Mine')}
          <span>Back to Mine</span>
        </button>
      </div>

      <div class="mam-no-scrollbar absolute left-1/2 bottom-[14px] -translate-x-1/2 flex flex-wrap justify-center items-center gap-2 @max-[760px]:gap-1.5 px-3 py-2 @max-[760px]:px-2 @max-[760px]:py-1.5 rounded-2xl bg-[linear-gradient(180deg,#151e34_0%,#0b101e_100%)] border-2 border-[#2b3c5e] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_36px_rgba(0,0,0,0.75)] w-max max-w-[calc(100%-24px)]">
        <button class="${dockBtnPickaxe}" data-action="open-pickaxe-shop">
          ${hudIconHtml('pickaxe', 28, 'Pickaxe')}
          <span class="mam-outline-sm">Pickaxes</span>
        </button>
        <button class="${dockBtnSell}" data-action="open-sell-shop">
          ${hudIconHtml('trade', 28, 'Sell')}
          <span class="mam-outline-sm">Sell</span>
        </button>
        <button class="${dockBtnPickaxe}" data-action="open-relic-forge">
          <img src="${assetUrl('/relics/ember_gauntlet.webp')}" alt="Relic Forge" class="w-[28px] h-[28px] object-contain" />
          <span class="mam-outline-sm">Forge</span>
        </button>
        <button class="${dockBtnGem}" data-action="open-gem-shop">
          ${hudIconHtml('gem', 28, 'Gem Shop')}
          <span class="mam-outline-sm">Gem Shop</span>
        </button>
        <button class="${dockBtnRainbow}" data-action="open-enchant-altar">
          ${hudIconHtml('enchant', 28, 'Enchant')}
          <span class="mam-outline-sm">Enhance</span>
        </button>
        <button class="${dockBtnTower}" data-action="open-gem-tower">
          ${towerIconHtml(26)}
          <span class="mam-outline-sm">Tower</span>
        </button>
      </div>

      ${opts.currencyRailHtml}

      ${opts.activePotionsHtml}
      ${opts.dpsMeterHtml}
      ${opts.modalHtml}
      ${opts.toastStackHtml}
    `;
}

/** Manages Shop Plaza dock HUD, Enchant Altar HUD, and Enchant spin/auto-roll timers. */
export class AltarShopHudUi {
  private enchantSpinning = false;
  private enchantSpinSafetyTimer: number | null = null;
  private enchantAutoRolling = false;
  private enchantAutoTimer: number | null = null;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onSetSceneMode: (mode: SceneMode) => void,
    private readonly onOpenShopStation: (station: ShopStationId) => void,
    private readonly getSceneMode: () => SceneMode,
    private readonly onTriggerEnchantSpin?: (enchantId: string, onComplete: () => void) => void
  ) {}

  public cancelSpinOnSceneExit(): void {
    if (this.enchantSpinSafetyTimer !== null) {
      window.clearTimeout(this.enchantSpinSafetyTimer);
      this.enchantSpinSafetyTimer = null;
    }
    if (this.enchantAutoTimer !== null) {
      window.clearTimeout(this.enchantAutoTimer);
      this.enchantAutoTimer = null;
    }
    this.enchantSpinning = false;
    this.enchantAutoRolling = false;
    audio.cancelEnchantSpinSfx();
  }

  public renderShopWorldHud(opts: {
    weatherHtml: string;
    currencyRailHtml: string;
    activePotionsHtml: string;
    dpsMeterHtml: string;
    modalHtml: string;
    toastStackHtml: string;
  }): string {
    return renderShopWorldHudHtml(opts);
  }

  public renderAltarHud(opts: {
    weatherHtml: string;
    audioBtnHtml: string;
    currencyRailHtml: string;
    toastStackHtml: string;
  }): string {
    const outOfRolls = this.state.enchantDice <= 0;
    const rollBtn = getAltarRollButtonState(this.state.enchantDice, this.enchantSpinning);
    const stripCards = renderAltarStripCardsHtml(this.state);

    return `
      ${opts.weatherHtml}
      <div class="${TW_TOP_CENTER} flex items-center gap-2.5">
        <button class="px-[42px] py-2 rounded-2xl border-2 border-orange-300 bg-[linear-gradient(135deg,#ea580c_0%,#9a3412_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_0_#431407,0_8px_22px_-4px_rgba(234,88,12,0.45)] text-white text-[19px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.97] mam-outline" data-action="altar-back">Back</button>
        <button class="px-4 py-2 rounded-2xl border-2 border-cyan-300 bg-[linear-gradient(135deg,#0284c7_0%,#7c3aed_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_0_#1e1b4b,0_8px_22px_-4px_rgba(56,189,248,0.45)] text-white text-[16px] font-black cursor-pointer inline-flex items-center gap-1.5 transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.97] mam-outline-sm" data-action="switch-to-fusion">
          <span>✦ Chibi Fusion</span>
        </button>
      </div>

      ${opts.audioBtnHtml}
      ${opts.currencyRailHtml}

      <div class="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(1240px,calc(100%-24px))] flex flex-col items-center gap-2 pointer-events-auto">
        <div class="flex items-stretch gap-2.5 flex-wrap justify-center">
          <div class="min-w-[88px] rounded-xl border-2 border-[#7c3aed] bg-[radial-gradient(circle_at_50%_55%,#2e1654,#0f172a_80%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_6px_16px_rgba(0,0,0,0.6)] flex flex-col items-center justify-between gap-0.5 px-2 py-[5px] text-center">
            <div class="text-[12px] font-extrabold text-[#e2e8f0] leading-[1.1] mam-outline-sm">Enchanted<br/>Dice</div>
            <div class="flex items-center justify-center h-[34px] [&>.mam-3d-icon]:w-[34px] [&>.mam-3d-icon]:h-[34px]">${enchantDiceIconHtml(34)}</div>
            <div class="text-[14px] font-black tabular-nums mam-outline-sm" data-altar-dice-count="true" style="color:${outOfRolls ? '#f87171' : '#4ade80'}">${fmtInt(this.state.enchantDice)}/1</div>
          </div>
          <div class="flex flex-col gap-2 items-stretch justify-center">
            <button class="mam-sheen-hover relative overflow-hidden w-full px-[18px] py-2 rounded-xl border-2 border-emerald-300 bg-[linear-gradient(135deg,#22c55e_0%,#15803d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_0_#052e16,0_8px_20px_-4px_rgba(34,197,94,0.45)] text-white text-[15px] font-black tabular-nums cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.97] mam-outline-sm" data-action="buy-dice">Buy Dice (${ENCHANT_DICE_GEM_COST} Gems)</button>
            <button class="${TW_ALTAR_AUTO_BTN} mam-outline-sm ${this.enchantAutoRolling ? 'is-active' : ''}" data-action="toggle-auto-enchant">${this.enchantAutoRolling ? 'Stop' : 'Auto Roll'}</button>
          </div>
        </div>

        <button
          class="${TW_ALTAR_ROLL_BTN} mam-outline ${rollBtn.extraClass}"
          data-action="roll-enchant"
          ${rollBtn.disabled ? 'disabled' : ''}
        >
          ${rollBtn.labelHtml}
        </button>

        <div class="w-full grid grid-cols-10 @max-[920px]:grid-cols-5 gap-2 @max-[920px]:gap-1.5">
          ${stripCards}
        </div>
      </div>

      ${opts.toastStackHtml}
    `;
  }

  public bindEvents(root: HTMLElement): void {
    const shopActions: Array<{ selector: string; onClick: () => void }> = [
      {
        selector: '[data-action="back-to-mine"]',
        onClick: () => {
          audio.playSfx('teleport', { volume: 0.45 });
          this.onSetSceneMode('mine');
        },
      },
      {
        selector: '[data-action="altar-back"]',
        onClick: () => {
          audio.playSfx('ui-close');
          this.onSetSceneMode('shop');
        },
      },
      {
        selector: '[data-action="switch-to-fusion"]',
        onClick: () => {
          audio.playSfx('teleport', { volume: 0.45 });
          this.onSetSceneMode('fusion');
        },
      },
      {
        selector: '[data-action="open-pickaxe-shop"]',
        onClick: () => this.onOpenShopStation('pickaxe'),
      },
      {
        selector: '[data-action="open-sell-shop"]',
        onClick: () => this.onOpenShopStation('sell'),
      },
      {
        selector: '[data-action="open-gem-shop"]',
        onClick: () => this.onOpenShopStation('gems'),
      },
      {
        selector: '[data-action="open-enchant-altar"]',
        onClick: () => {
          audio.playSfx('ui-open');
          this.onOpenShopStation('altar');
        },
      },
      {
        selector: '[data-action="open-gem-tower"]',
        onClick: () => this.onOpenShopStation('tower'),
      },
      {
        selector: '[data-action="open-relic-forge"]',
        onClick: () => {
          audio.playSfx('ui-open');
          this.onOpenShopStation('forge');
        },
      },
      {
        selector: '[data-action="buy-dice"]',
        onClick: () => {
          if (this.state.buyEnchantDice(1)) {
            audio.playSfx('coin-alt');
            this.pushToast('+1 Enchanted Dice!');
          } else {
            audio.playSfx('ui-error');
            this.pushToast(`Need ${ENCHANT_DICE_GEM_COST} Gems!`);
          }
        },
      },
      {
        selector: '[data-action="roll-enchant"]',
        onClick: () => {
          this.triggerSingleEnchantRoll(root);
        },
      },
      {
        selector: '[data-action="toggle-auto-enchant"]',
        onClick: () => {
          if (this.enchantAutoRolling) {
            audio.playSfx('ui-click');
            this.stopEnchantAutoRoll(root, 'Auto Roll stopped');
          } else if (this.state.enchantDice <= 0 && !this.enchantSpinning) {
            audio.playSfx('ui-error');
            this.pushToast('Out of Enchanted Dice!');
          } else {
            this.enchantAutoRolling = true;
            audio.playSfx('ui-tab');
            this.updateAltarLiveValues(root);
            if (!this.enchantSpinning) {
              this.triggerSingleEnchantRoll(root);
            }
          }
        },
      },
    ];

    for (const item of shopActions) {
      root.querySelectorAll<HTMLElement>(item.selector).forEach((el) => {
        el.addEventListener('click', item.onClick);
      });
    }
  }

  public updateAltarLiveValues(root: HTMLElement): void {
    const outOfRolls = this.state.enchantDice <= 0;
    const spinning = this.enchantSpinning;
    const rollBtnState = getAltarRollButtonState(this.state.enchantDice, spinning);

    const diceCount = root.querySelector<HTMLElement>('[data-altar-dice-count="true"]');
    if (diceCount) {
      diceCount.textContent = `${fmtInt(this.state.enchantDice)}/1`;
      diceCount.style.color = outOfRolls ? '#f87171' : '#4ade80';
    }

    const rollBtn = root.querySelector<HTMLButtonElement>('[data-action="roll-enchant"]');
    if (rollBtn) {
      rollBtn.disabled = rollBtnState.disabled;
      rollBtn.classList.toggle('is-spinning', spinning);
      rollBtn.classList.toggle('is-empty', !spinning && outOfRolls);
      rollBtn.innerHTML = rollBtnState.labelHtml;
    }

    const autoBtn = root.querySelector<HTMLButtonElement>('[data-action="toggle-auto-enchant"]');
    if (autoBtn) {
      autoBtn.classList.toggle('is-active', this.enchantAutoRolling);
      autoBtn.textContent = this.enchantAutoRolling ? 'Stop' : 'Auto Roll';
    }

    for (const e of ENCHANTS) {
      const qty = this.state.ownedEnchants[e.id] || 0;
      const qtyEl = root.querySelector<HTMLElement>(`[data-altar-qty="${e.id}"]`);
      if (qtyEl) qtyEl.textContent = qty > 0 ? `x${fmtInt(qty)}` : '';
    }
  }

  private finishEnchantSpin(root: HTMLElement): void {
    if (this.enchantSpinSafetyTimer !== null) {
      window.clearTimeout(this.enchantSpinSafetyTimer);
      this.enchantSpinSafetyTimer = null;
    }
    if (!this.enchantSpinning) return;
    this.enchantSpinning = false;
    if (this.getSceneMode() === 'altar') {
      this.updateAltarLiveValues(root);
    }
  }

  private stopEnchantAutoRoll(root: HTMLElement, reasonToast?: string): void {
    if (this.enchantAutoTimer !== null) {
      window.clearTimeout(this.enchantAutoTimer);
      this.enchantAutoTimer = null;
    }
    this.enchantAutoRolling = false;
    if (this.getSceneMode() === 'altar') {
      this.updateAltarLiveValues(root);
    }
    if (reasonToast) {
      this.pushToast(reasonToast);
    }
  }

  private handleOutOfDice(root: HTMLElement): false {
    audio.playSfx('ui-error');
    if (this.enchantAutoRolling) {
      this.stopEnchantAutoRoll(root, 'Auto Roll stopped: Out of Enchanted Dice!');
    } else {
      this.pushToast('Out of Enchanted Dice!');
    }
    return false;
  }

  private triggerSingleEnchantRoll(root: HTMLElement): boolean {
    if (this.enchantSpinning) return false;
    if (this.state.enchantDice <= 0) {
      return this.handleOutOfDice(root);
    }

    this.enchantSpinning = true;
    const rolled = this.state.rollEnchant();
    if (!rolled) {
      this.enchantSpinning = false;
      return this.handleOutOfDice(root);
    }

    audio.playEnchantSpinStart(1.9);
    if (this.enchantSpinSafetyTimer !== null) {
      window.clearTimeout(this.enchantSpinSafetyTimer);
    }
    let finalized = false;
    const settle = () => {
      if (finalized) return;
      finalized = true;
      this.finishEnchantSpin(root);
      const isRare =
        rolled.rarity === 'epic' ||
        rolled.rarity === 'legendary' ||
        rolled.rarity === 'rainbow' ||
        rolled.rarity === 'mythic' ||
        rolled.rarity === 'exotic' ||
        rolled.rarity === 'secret';
      audio.playEnchantSpinLand(isRare);
      this.pushToast(`Rolled ${rolled.name} (${rolled.dmgMult}x DMG)!`);

      if (this.enchantAutoRolling && this.getSceneMode() === 'altar') {
        if (this.state.enchantDice <= 0) {
          this.stopEnchantAutoRoll(root, 'Auto Roll finished: Out of Enchanted Dice!');
          return;
        }
        if (this.enchantAutoTimer !== null) {
          window.clearTimeout(this.enchantAutoTimer);
        }
        this.enchantAutoTimer = window.setTimeout(() => {
          this.enchantAutoTimer = null;
          if (this.enchantAutoRolling && this.getSceneMode() === 'altar' && !this.enchantSpinning) {
            this.triggerSingleEnchantRoll(root);
          }
        }, 260);
      }
    };

    if (this.onTriggerEnchantSpin) {
      this.enchantSpinSafetyTimer = window.setTimeout(settle, 2500);
      this.onTriggerEnchantSpin(rolled.id, settle);
    } else {
      settle();
    }
    return true;
  }
}
