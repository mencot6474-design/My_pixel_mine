import { audio } from '../audio/AudioManager';
import { getChibiById } from '../game3d/ChibiCatalog';
import { GameState } from '../game/GameState';
import { fmtShort } from '../game/NumberFormat';
import { getPremiumShopItemByChibiId, PREMIUM_SHOP_ITEMS } from '../game/PremiumShopData';
import { assetUrl } from '../game/AssetUrl';
import {
  applyInspectRing,
  chibiPortraitHtml,
  formatCountdownTimer,
  rarityCardClasses,
  rarityVars,
  renderEmptyInspectorPanel,
  renderInspectorPanel,
  renderModalShell,
  renderRarityBadgeHtml,
  TW_MODAL_GRID_BASE,
  TW_SHOP_BUY_BTN,
  TW_SHOP_MODAL_RESP,
} from './HudShared';

/** Modal allowing post-tutorial players to pick 1 of 5 Twin Tier Chibis for a 20-minute read-only trial. */
export class TwinTrialModalUi {
  private inspectChibiId = PREMIUM_SHOP_ITEMS[0]?.chibiId ?? 'yukikage-twins';
  private lastInspectorHtml = '';

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onClaimSuccess: (chibiId: string) => void,
    private readonly onRender: () => void
  ) {}

  public claimSelectedTwin(chibiId: string): boolean {
    const ok = this.state.claimTwinTrial(chibiId);
    if (!ok) {
      audio.playSfx('ui-error');
      this.pushToast('Twin Trial is no longer available!');
      return false;
    }
    const chibi = getChibiById(chibiId);
    audio.playSfx('rare-fanfare', { volume: 0.7 });
    this.pushToast(`✨ 20:00 Twin Trial Started: ${chibi?.name ?? chibiId}!`);
    this.onClaimSuccess(chibiId);
    return true;
  }

  private buildInspectorHtml(): string {
    const activeId = this.state.twinTrial.status === 'active' ? this.state.twinTrial.chibiId : null;
    const targetId = activeId && this.inspectChibiId === activeId ? activeId : this.inspectChibiId;
    const def = getPremiumShopItemByChibiId(targetId) ?? PREMIUM_SHOP_ITEMS[0];
    if (!def) {
      return renderEmptyInspectorPanel('Select any Twin Chibi to inspect its trial stats.');
    }
    this.inspectChibiId = def.chibiId;
    const chibi = getChibiById(def.chibiId);
    if (!chibi) return renderEmptyInspectorPanel('Chibi data not found.');

    const isTrialActive = this.state.isTwinTrialActive();
    const isThisActive = isTrialActive && this.state.twinTrial.chibiId === def.chibiId;
    const remText = isTrialActive ? formatCountdownTimer(this.state.getTwinTrialRemainingSec()) : '20:00';

    const actionHtml =
      this.state.twinTrial.status === 'available'
        ? `
          <div class="w-full rounded-xl border-2 border-[#14111d] bg-[#fef9c3] px-2.5 py-1.5 text-[11px] font-extrabold leading-snug text-[#78350f]">
            Read-Only Showcase: No Upgrades, Pickaxes, Enchants, or Index unlock. Auto-expires in 20:00.
          </div>
          <button
            class="${TW_SHOP_BUY_BTN} !h-10 !text-[14px] !bg-[#fde047] hover:!bg-[#fef08a] inline-flex items-center justify-center gap-1.5"
            data-claim-twin-trial="${def.chibiId}"
          >
            <span>⚡ Claim 20m Trial</span>
          </button>
        `
        : isThisActive
          ? `
            <div class="w-full rounded-xl border-2 border-[#14111d] bg-[#dcfce7] px-2.5 py-2 text-[12px] font-black text-[#14532d] tabular-nums">
              ⏱ Active Trial • <span data-twin-trial-modal-timer="true">${remText}</span> left
            </div>
            <div class="text-[11px] font-extrabold text-[#5b526e] leading-snug">
              Drag from Hotbar or Backpack onto any Plot pedestal! Read-Only until timer ends.
            </div>
          `
          : `
            <div class="w-full rounded-xl border-2 border-[#14111d] bg-[#e2e8f0] px-2.5 py-2 text-[11.5px] font-black text-[#475569]">
              Another Twin Trial is currently active (<span data-twin-trial-modal-timer="true">${remText}</span> left).
            </div>
          `;

    return renderInspectorPanel({
      rarity: def.rarity,
      title: chibi.name,
      subtitle: `${def.titleTag} • Trial`,
      badgesHtml: `<span class="mam-pill rounded-full bg-[#fef08a] border-2 border-[#14111d] text-[10px] font-black text-[#14111d]">${def.passiveSummary}</span>`,
      artHtml: chibiPortraitHtml(chibi, { usePose: true }),
      stats: [
        ['Trial DPS', `${fmtShort(this.state.getEffectiveChibiDps(chibi.id))}/s`, 'text-[#dc2626]'],
        ['Duration', isThisActive ? remText : '20:00', 'text-[#0284c7]'],
        ['Mode', 'Read-Only', 'text-[#b45309]'],
        ['Index', 'Not Added', 'text-[#64748b]'],
      ],
      actionHtml,
    });
  }

  public renderModal(): string {
    if (!getPremiumShopItemByChibiId(this.inspectChibiId) && PREMIUM_SHOP_ITEMS[0]) {
      this.inspectChibiId = PREMIUM_SHOP_ITEMS[0].chibiId;
    }
    const isAvailable = this.state.twinTrial.status === 'available';
    const isActive = this.state.isTwinTrialActive();
    const activeChibiId = isActive ? this.state.twinTrial.chibiId : null;
    const remSec = this.state.getTwinTrialRemainingSec();

    const cards = PREMIUM_SHOP_ITEMS.map((item) => {
      const chibi = getChibiById(item.chibiId);
      if (!chibi) return '';
      const isInspected = this.inspectChibiId === item.chibiId;
      const isThisActive = activeChibiId === item.chibiId;
      const btnCls = isAvailable
        ? '!bg-[#fde047] hover:!bg-[#fef08a]'
        : isThisActive
          ? '!bg-[#6ee7b7] cursor-default'
          : 'disabled';
      const btnLabel = isAvailable
        ? 'Claim 20:00'
        : isThisActive
          ? `Active ${formatCountdownTimer(remSec)}`
          : 'Locked';

      return `
        <div class="${rarityCardClasses(item.rarity, `is-holo-foil ${isInspected ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : ''}`)} !aspect-auto min-h-[252px] pt-2.5 px-2.5 pb-[10px] gap-1.5 !justify-between" style="${rarityVars(item.rarity)}" data-inspect-trial-twin="${item.chibiId}">
          <div class="w-full flex items-center justify-center min-h-[34px] shrink-0">
            ${renderRarityBadgeHtml(item.rarity, 'is-compact')}
          </div>
          <div class="mam-card-art !relative !inset-auto w-full h-[94px] shrink-0 flex items-center justify-center [&_.mam-chibi-portrait_img]:max-w-[104px] [&_.mam-chibi-portrait_img]:max-h-[92px]">
            ${chibiPortraitHtml(chibi, { usePose: true })}
          </div>
          <div class="w-full flex flex-col items-center gap-0.5 min-h-0">
            <div class="w-full px-0.5 text-center text-[14.5px] font-black leading-[1.15] whitespace-nowrap overflow-hidden text-ellipsis text-[#14111d]" title="${chibi.name}">${chibi.name}</div>
            <div class="text-[11px] font-extrabold leading-[1.2] text-center text-[#5b526e]">
              ${fmtShort(this.state.getEffectiveChibiDps(chibi.id))} DPS • ${item.passiveSummary}
            </div>
            <div class="min-h-[14px] text-[10.5px] font-black text-center ${isThisActive ? 'text-[#059669]' : 'text-[#0284c7]'}">
              ${isThisActive ? 'Trial Active on Squad' : 'Read-Only • 20:00'}
            </div>
          </div>
          <button
            class="${TW_SHOP_BUY_BTN} ${btnCls} inline-flex items-center justify-center gap-1"
            ${isAvailable ? `data-claim-twin-trial="${item.chibiId}"` : ''}
          >
            <span>${btnLabel}</span>
          </button>
        </div>
      `;
    }).join('');

    const inspHtml = this.buildInspectorHtml();
    this.lastInspectorHtml = inspHtml;
    const badgeUrl = assetUrl('/badges/twin.svg');
    const headerPill = isActive
      ? `<div class="ml-auto mr-1 mam-pill-lg rounded-full bg-[#bbf7d0] border-2 border-[#14111d] text-[13px] font-black tabular-nums text-[#14532d]" data-twin-trial-modal-timer="true">${formatCountdownTimer(remSec)}</div>`
      : `<div class="ml-auto mr-1 mam-pill-lg rounded-full bg-[#fef08a] border-2 border-[#14111d] text-[13px] font-black tabular-nums text-[#14111d]">20:00 Free Trial • Read-Only</div>`;

    return renderModalShell({
      title: 'Twin Tier Trial',
      theme: 'premium-shop',
      iconHtml: `<img src="${badgeUrl}" alt="Twin" class="w-6 h-6 object-contain" />`,
      boxClass: `w-[min(960px,calc(100%-16px))] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: headerPill,
      bodyHtml: `
        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto mam-no-scrollbar" data-twin-trial-modal="true">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-3 gap-2.5 flex-1 min-h-[240px] @max-[920px]:flex-none @max-[920px]:max-h-[360px] p-0.5 @max-[720px]:grid-cols-2">
            ${cards}
          </div>
          <div class="mam-inspector-well mam-no-scrollbar w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-twin-trial-inspector="true">
            ${inspHtml}
          </div>
        </div>
      `,
    });
  }

  public refreshInspectorLive(root: HTMLElement): void {
    const panel = root.querySelector<HTMLElement>('[data-twin-trial-inspector="true"]');
    if (!panel) return;
    root.querySelectorAll<HTMLElement>('[data-inspect-trial-twin]').forEach((el) => {
      applyInspectRing(el, el.dataset.inspectTrialTwin === this.inspectChibiId);
    });
    const nextHtml = this.buildInspectorHtml();
    if (this.lastInspectorHtml !== nextHtml) {
      this.lastInspectorHtml = nextHtml;
      panel.innerHTML = nextHtml;
      this.bindClaimButtons(root, panel);
    }
  }

  private bindClaimButtons(root: HTMLElement, scope: ParentNode): void {
    scope.querySelectorAll<HTMLElement>('[data-claim-twin-trial]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.claimTwinTrial;
        if (!id) return;
        this.inspectChibiId = id;
        if (!this.claimSelectedTwin(id)) {
          this.onRender();
          return;
        }
        void root;
      });
    });
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-inspect-trial-twin]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.inspectTrialTwin;
        if (!id) return;
        audio.playSfx('ui-tab');
        this.inspectChibiId = id;
        this.refreshInspectorLive(root);
      });
    });

    const panel = root.querySelector<HTMLElement>('[data-twin-trial-inspector="true"]');
    if (panel) this.lastInspectorHtml = panel.innerHTML;
    this.bindClaimButtons(root, root);
  }
}
