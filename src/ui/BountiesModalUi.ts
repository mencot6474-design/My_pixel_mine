import { audio } from '../audio/AudioManager';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney } from '../game/NumberFormat';
import { enchantDiceIconHtml, hudIconHtml } from './HudIcons';
import { renderModalShell } from './HudShared';

const SCROLL_ICON_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
  <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Z" fill="#ffffff" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
  <path d="M8.5 9h7M8.5 13h7M8.5 17h4.5" stroke="#059669" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export class BountiesModalUi {
  constructor(
    private readonly state: GameState,
    private readonly pushToast: (msg: string) => void = () => undefined,
    private readonly requestRender: () => void = () => undefined
  ) {}

  public renderModal(): string {
    const cardsHtml = this.state.bounties
      .map((b) => {
        const pct = Math.max(0, Math.min(100, Math.round((b.progress / Math.max(1, b.target)) * 100)));
        const ready = b.progress >= b.target;

        const rewardHtml =
          b.rewardKind === 'gems'
            ? `<span class="inline-flex items-center gap-1 text-[#0284c7]">${hudIconHtml('gem', 16, 'Gems')} +${fmtInt(b.rewardAmount)}</span>`
            : b.rewardKind === 'dice'
              ? `<span class="inline-flex items-center gap-1 text-[#7e22ce]">${enchantDiceIconHtml(16)} +${fmtInt(b.rewardAmount)} Dice</span>`
              : `<span class="text-[#059669]">+${fmtMoney(b.rewardAmount)}</span>`;

        const actionBtn = ready
          ? `<button
              type="button"
              class="mam-pill-lg min-w-[96px] h-[34px] bg-[#2ee59d] text-[#14111d] uppercase tracking-wide cursor-pointer transition-[transform,filter] duration-150 hover:scale-[0.96] active:scale-[0.94]"
              data-bounty-claim="${b.id}"
            >
              Claim
            </button>`
          : `<span class="mam-pill-lg min-w-[96px] h-[34px] bg-[#fcecc8] text-[#5b526e] text-[11.5px] uppercase tracking-wide">
              In Progress
            </span>`;

        const cardBorder = ready ? 'border-[#14111d] bg-[#d1fae5]' : 'border-[#14111d] bg-[#ffffff]';
        const barFill = ready ? 'bg-[#2ee59d]' : 'bg-[#38bdf8]';

        return `
          <div class="p-3.5 rounded-2xl border-[2.5px] ${cardBorder} flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0 flex flex-col gap-1.5 text-left">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="text-[14px] font-black text-[#14111d] leading-tight">${b.title}</span>
                <span class="mam-pill bg-[#fcecc8] text-[11.5px]">${rewardHtml}</span>
              </div>
              <div class="relative w-full h-3 rounded-full bg-[#fcecc8] border-2 border-[#14111d] overflow-hidden">
                <div class="h-full ${barFill} transition-[width] duration-200 ease-out" style="width:${pct}%"></div>
              </div>
              <div class="flex items-center justify-between text-[11px] font-black text-[#5b526e] tabular-nums">
                <span>${fmtInt(b.progress)} / ${fmtInt(b.target)}</span>
                <span>${pct}%</span>
              </div>
            </div>
            ${actionBtn}
          </div>
        `;
      })
      .join('');

    const headerExtraHtml = `
      <span class="mam-pill-lg bg-[#6ee7b7] text-[#14111d]">
        Completed: ${fmtInt(this.state.bountiesCompleted)}
      </span>
    `;

    const bodyHtml = `
      <div class="w-full flex flex-col gap-2.5">
        <div class="text-[12px] font-bold text-[#5b526e] text-left">
          Complete active contracts to earn Gems, Enchant Dice & Cash. Claimed slots refresh automatically!
        </div>
        ${cardsHtml}
      </div>
    `;

    return renderModalShell({
      title: 'Mining Bounties',
      theme: 'bounties',
      iconHtml: SCROLL_ICON_SVG,
      boxClass: 'w-[540px] max-w-[95%]',
      autoHeight: true,
      headerExtraHtml,
      bodyHtml,
    });
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-bounty-claim]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.bountyClaim;
        if (!id) return;
        const res = this.state.claimBounty(id);
        if (!res) return;
        audio.playSfx('coin-alt', { volume: 0.65 });
        const rewardText =
          res.rewardKind === 'gems'
            ? `+${fmtInt(res.rewardAmount)} Gems`
            : res.rewardKind === 'dice'
              ? `+${fmtInt(res.rewardAmount)} Enchant Dice`
              : `+${fmtMoney(res.rewardAmount)}`;
        this.pushToast(`Bounty Claimed: ${rewardText}!`);
        this.requestRender();
      });
    });
  }
}
