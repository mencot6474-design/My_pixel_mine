import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { ENCHANT_DICE_GEM_COST, ENCHANTS } from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt } from '../game/NumberFormat';
import { SceneMode } from '../game3d/MineScene3D';
import { ShopStationId } from '../game3d/ShopWorld3D';
import { enchantAuraIconHtml, enchantDiceIconHtml, hudIconHtml, towerIconHtml } from './HudIcons';
import {
  bindEnchantHoverInspector,
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
    const orePct = Math.round(e.oreDropPct * 100);
    const sellPct = Math.round(e.sellValuePct * 100);
    const spdPct = Math.round(e.miningSpeedPct * 100);
    const tint = e.id === 'timeless' ? '#a5b4fc' : e.color;
    const isRainbow = e.rarity === 'rainbow';
    const cardStyle = isRainbow
      ? ''
      : `background:repeating-conic-gradient(from 0deg at 50% 48%,rgba(255,255,255,0.42) 0deg 15deg,transparent 15deg 30deg),radial-gradient(circle at 50% 45%,${tint}7a 0%,${tint}38 88%),#fff8e7;`;
    const borderBg = isRainbow ? 'rarity-rainbow' : 'border-[2.5px] border-[#14111d]';
    return `
        <div class="mam-altar-card relative h-[102px] @max-[920px]:h-[86px] rounded-xl flex flex-col items-center justify-between py-[5px] px-1 cursor-pointer transition-transform duration-[140ms] ease-out hover:scale-[0.96] even:hover:rotate-[1.2deg] odd:hover:-rotate-[1.2deg] ${borderBg}" style="${cardStyle}" data-altar-card="${e.id}" tabindex="0" title="${e.name} • ${e.dmgMult}x DMG • +${orePct}% Ore Drop • +${sellPct}% Sell • +${spdPct}% Spd (${e.chancePct}%)">
          <div class="w-full flex items-center justify-center gap-1 px-1">
            <span class="text-[11.5px] font-black text-[#14111d] truncate">${e.name}</span>
            <span class="empty:hidden text-[10.5px] font-black tabular-nums px-1 rounded bg-[#fde047] border border-[#14111d] text-[#14111d]" data-altar-qty="${e.id}">${qty > 0 ? `x${fmtInt(qty)}` : ''}</span>
          </div>
          <div class="flex-1 min-h-0 flex items-center justify-center pointer-events-none [&>.mam-3d-icon]:w-[44px] [&>.mam-3d-icon]:h-[44px]">${enchantAuraIconHtml(e.id, e.color, 46, e.name)}</div>
          <div class="text-[10.5px] font-black tabular-nums text-[#14111d]">${e.chancePct}%</div>
        </div>
      `;
  }).join('');
}

/** Builds complete Shop Plaza HUD HTML around injected shared HUD slots. */
export function renderShopWorldHudHtml(opts: {
  weatherHtml: string;
  currencyRailHtml: string;
  activePotionsHtml: string;
  modalHtml: string;
  toastStackHtml: string;
}): string {
  const dockBtnPickaxe = `${TW_SHOP_DOCK_BTN_BASE} border-[2.5px] border-[#14111d] bg-[#fb923c] hover:bg-[#fdba74] text-[#14111d]`;
  const dockBtnSell = `${TW_SHOP_DOCK_BTN_BASE} border-[2.5px] border-[#14111d] bg-[#4ade80] hover:bg-[#86efac] text-[#14111d]`;
  const dockBtnForge = `${TW_SHOP_DOCK_BTN_BASE} border-[2.5px] border-[#14111d] bg-[#fde047] hover:bg-[#fef08a] text-[#14111d]`;
  const dockBtnGem = `${TW_SHOP_DOCK_BTN_BASE} border-[2.5px] border-[#14111d] bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#14111d]`;
  const dockBtnRainbow = `${TW_SHOP_DOCK_BTN_BASE} border-[2.5px] border-[#14111d] bg-[linear-gradient(135deg,#fda4af,#fde047,#86efac,#7dd3fc,#d8b4fe)] text-[#14111d]`;
  const dockBtnTower = `${TW_SHOP_DOCK_BTN_BASE} border-[2.5px] border-[#14111d] bg-[#c084fc] hover:bg-[#d8b4fe] text-[#14111d]`;

  return `
      ${opts.weatherHtml}
      <div class="${TW_TOP_CENTER}">
        <button class="${TW_SHOPS_PILL}" data-action="back-to-mine">
          ${hudIconHtml('shops', 28, 'Mine')}
          <span>Back to Mine</span>
        </button>
      </div>

      <div class="mam-no-scrollbar absolute left-1/2 bottom-[14px] -translate-x-1/2 flex flex-wrap justify-center items-center gap-2 @max-[760px]:gap-1.5 px-3 py-2 @max-[760px]:px-2 @max-[760px]:py-1.5 rounded-2xl bg-[#fff8e7] border-[3px] border-[#14111d] w-max max-w-[calc(100%-24px)]">
        <button class="${dockBtnPickaxe}" data-action="open-pickaxe-shop">
          ${hudIconHtml('pickaxe', 28, 'Pickaxe')}
          <span>Pickaxes</span>
        </button>
        <button class="${dockBtnSell}" data-action="open-sell-shop">
          ${hudIconHtml('trade', 28, 'Sell')}
          <span>Sell</span>
        </button>
        <button class="${dockBtnForge}" data-action="open-relic-forge">
          <img src="${assetUrl('/relics/ember_gauntlet.webp')}" alt="Relic Forge" class="w-[28px] h-[28px] object-contain" />
          <span>Forge</span>
        </button>
        <button class="${dockBtnGem}" data-action="open-gem-shop">
          ${hudIconHtml('gem', 28, 'Gem Shop')}
          <span>Gem Shop</span>
        </button>
        <button class="${dockBtnRainbow}" data-action="open-enchant-altar">
          ${hudIconHtml('enchant', 28, 'Enchant')}
          <span>Enhance</span>
        </button>
        <button class="${dockBtnTower}" data-action="open-gem-tower">
          ${towerIconHtml(26)}
          <span>Tower</span>
        </button>
      </div>

      ${opts.currencyRailHtml}

      ${opts.activePotionsHtml}
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
      <div class="${TW_TOP_CENTER} flex items-center gap-2.5 @max-[720px]:gap-1.5">
        <button class="h-11 @max-[720px]:h-9 min-w-[148px] @max-[720px]:min-w-[108px] px-5 @max-[720px]:px-3.5 rounded-2xl border-[3px] border-[#14111d] bg-[#fb923c] hover:bg-[#fdba74] text-[#14111d] text-[17px] @max-[720px]:text-[14px] font-black cursor-pointer inline-flex items-center justify-center whitespace-nowrap transition-transform duration-150 ease-out hover:scale-[0.97] active:scale-[0.94]" data-action="altar-back">Back</button>
        <button class="h-11 @max-[720px]:h-9 min-w-[148px] @max-[720px]:min-w-[108px] px-5 @max-[720px]:px-3.5 rounded-2xl border-[3px] border-[#14111d] bg-[#7dd3fc] hover:bg-[#bae6fd] text-[#14111d] text-[17px] @max-[720px]:text-[14px] font-black cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-transform duration-150 ease-out hover:scale-[0.97] active:scale-[0.94]" data-action="switch-to-fusion">
          <span>✦ Chibi Fusion</span>
        </button>
      </div>

      ${opts.audioBtnHtml}
      ${opts.currencyRailHtml}

      <div class="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(1240px,calc(100%-24px))] flex flex-col items-center gap-2 pointer-events-auto">
        <div class="flex items-stretch gap-2.5 flex-wrap justify-center">
          <div class="min-w-[92px] rounded-xl border-[2.5px] border-[#14111d] bg-[#fff8e7] flex flex-col items-center justify-between gap-0.5 px-2.5 py-[6px] text-center">
            <div class="text-[11.5px] font-black text-[#14111d] leading-[1.1]">Enchanted<br/>Dice</div>
            <div class="flex items-center justify-center h-[34px] [&>.mam-3d-icon]:w-[34px] [&>.mam-3d-icon]:h-[34px]">${enchantDiceIconHtml(34)}</div>
            <div class="text-[14px] font-black tabular-nums" data-altar-dice-count="true" style="color:${outOfRolls ? '#dc2626' : '#15803d'}">${fmtInt(this.state.enchantDice)}/1</div>
          </div>
          <div class="flex flex-col gap-2 items-stretch justify-center">
            <button class="mam-sheen-hover relative overflow-hidden w-full px-[18px] py-2 rounded-xl border-[2.5px] border-[#14111d] bg-[#4ade80] hover:bg-[#86efac] text-[#14111d] text-[15px] font-black tabular-nums cursor-pointer transition-transform duration-150 ease-out hover:scale-[0.97] active:scale-[0.94]" data-action="buy-dice">Buy Dice (${ENCHANT_DICE_GEM_COST} Gems)</button>
            <button class="${TW_ALTAR_AUTO_BTN} ${this.enchantAutoRolling ? 'is-active' : ''}" data-action="toggle-auto-enchant">${this.enchantAutoRolling ? 'Stop' : 'Auto Roll'}</button>
          </div>
        </div>

        <button
          class="${TW_ALTAR_ROLL_BTN} ${rollBtn.extraClass}"
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

    bindEnchantHoverInspector({
      root,
      cardSelector: '[data-altar-card]',
      getEnchantId: (el) => el.dataset.altarCard,
      getCardProps: (enchantId) => ({
        owned: this.state.ownedEnchants[enchantId] || 0,
      }),
      allowTapToggle: true,
    });
  }

  public updateAltarLiveValues(root: HTMLElement): void {
    const outOfRolls = this.state.enchantDice <= 0;
    const spinning = this.enchantSpinning;
    const rollBtnState = getAltarRollButtonState(this.state.enchantDice, spinning);

    const diceCount = root.querySelector<HTMLElement>('[data-altar-dice-count="true"]');
    if (diceCount) {
      diceCount.textContent = `${fmtInt(this.state.enchantDice)}/1`;
      diceCount.style.color = outOfRolls ? '#dc2626' : '#15803d';
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
