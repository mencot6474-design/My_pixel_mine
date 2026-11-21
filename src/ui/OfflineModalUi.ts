import { audio } from '../audio/AudioManager';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney, fmtShort } from '../game/NumberFormat';
import { formatOfflineDuration } from '../game/OfflineEarningsDomain';
import { CG_ADS_ENABLED, cgRequestRewardedAd } from '../sdk/crazygames';
import { hudIconHtml } from './HudIcons';
import { renderModalShell } from './HudShared';

const CLOCK_ICON_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
  <circle cx="12" cy="12" r="9" fill="#ffffff" stroke="#14111d" stroke-width="2"/>
  <path d="M12 7v5l3.2 2" stroke="#ea580c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export class OfflineModalUi {
  private claimingAd = false;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (msg: string) => void = () => undefined,
    private readonly closeModal: () => void = () => undefined,
    private readonly adsEnabled: boolean = CG_ADS_ENABLED
  ) {}

  public renderModal(): string {
    const summary = this.state.pendingOfflineEarnings;
    if (!summary) return '';

    const durStr = formatOfflineDuration(summary.elapsedSec);
    const capBadge = summary.capped
      ? `<span class="px-2 py-0.5 rounded-full bg-[#fde047] border-2 border-[#14111d] text-[10px] font-black uppercase text-[#14111d]">Max 8h</span>`
      : '';

    const oresBrokenStr =
      summary.oresBroken >= 100_000 ? fmtShort(summary.oresBroken) : fmtInt(summary.oresBroken);
    const gemsStr = summary.gems >= 100_000 ? fmtShort(summary.gems) : fmtInt(summary.gems);

    const oresRow =
      summary.totalBonusOres > 0
        ? `
          <div class="min-w-0 overflow-hidden flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#ffffff] border-2 border-[#14111d]">
            <span class="text-[11px] font-black uppercase tracking-wider text-[#5b526e]">Chest Ores</span>
            <span class="max-w-full truncate text-[18px] font-black tabular-nums text-[#0284c7]">+${fmtInt(summary.totalBonusOres)}</span>
          </div>
        `
        : '';

    const gridCols = summary.totalBonusOres > 0 ? 'grid-cols-3' : 'grid-cols-2';
    const adBtnHtml = this.adsEnabled
      ? `
        <button
          type="button"
          class="flex-1 py-3 px-4 rounded-xl border-[2.5px] border-[#14111d] bg-[#fde047] text-[#14111d] text-[15px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.97] hover:rotate-1 active:scale-[0.94]"
          data-offline-claim="2"
        >
          2x Claim (Watch Ad)
        </button>
      `
      : '';

    const rushHtml = summary.returnRushEligible
      ? `
        <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#fef08a] border-2 border-[#14111d] text-left" data-offline-return-rush="true">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-7 h-7 rounded-lg bg-[#ff4d2e] border-2 border-[#14111d] text-white flex items-center justify-center text-[14px] font-black shrink-0" aria-hidden="true">⚡</span>
            <div class="min-w-0 flex flex-col leading-tight">
              <span class="text-[12px] font-black uppercase tracking-wide text-[#14111d]">Return Rush • 10m</span>
              <span class="text-[11px] font-bold text-[#9a3412]">+50% Fever Charge &amp; +25% Speed on Claim!</span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full bg-[#14111d] text-[#fde047] text-[10px] font-black uppercase shrink-0">Bonus</span>
        </div>
      `
      : '';

    const bodyHtml = `
      <div class="w-full flex flex-col gap-3.5 text-center">
        <div class="mam-inspector-well p-3.5 rounded-2xl flex flex-col items-center gap-1.5">
          <div class="text-[12px] font-black uppercase tracking-wider text-[#b45309]">
            Your Chibis kept mining in ${summary.worldName}!
          </div>
          <div class="flex items-center justify-center gap-2">
            <span class="text-[22px] font-black tabular-nums text-[#14111d]">${durStr}</span>
            ${capBadge}
          </div>
          <div class="text-[12px] font-bold text-[#5b526e] tabular-nums">
            ~${oresBrokenStr} ores mined while away
          </div>
        </div>

        <div class="grid ${gridCols} gap-2">
          <div class="min-w-0 overflow-hidden flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#ffffff] border-2 border-[#14111d]">
            <span class="text-[11px] font-black uppercase tracking-wider text-[#5b526e]">Cash</span>
            <span class="max-w-full truncate text-[18px] font-black tabular-nums text-[#059669]">+${fmtMoney(summary.cash)}</span>
          </div>
          <div class="min-w-0 overflow-hidden flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#ffffff] border-2 border-[#14111d]">
            <span class="text-[11px] font-black uppercase tracking-wider text-[#5b526e]">Gems</span>
            <span class="max-w-full truncate inline-flex items-center gap-1 text-[18px] font-black tabular-nums text-[#0284c7]">
              ${hudIconHtml('gem', 18, 'Gems')} +${gemsStr}
            </span>
          </div>
          ${oresRow}
        </div>

        ${rushHtml}

        <div class="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            class="flex-1 py-3 px-4 rounded-xl border-[2.5px] border-[#14111d] bg-[#2ee59d] text-[#14111d] text-[15px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.97] hover:-rotate-1 active:scale-[0.94]"
            data-offline-claim="1"
          >
            Claim
          </button>
          ${adBtnHtml}
        </div>
      </div>
    `;

    return renderModalShell({
      title: 'Welcome Back!',
      theme: 'offline',
      iconHtml: CLOCK_ICON_SVG,
      boxClass: 'w-[480px] max-w-[94%]',
      autoHeight: true,
      bodyHtml,
    });
  }

  public bindEvents(root: HTMLElement): void {
    const finishClaim = (mult: 1 | 2): void => {
      const res = this.state.claimOfflineEarnings(mult);
      if (res) {
        audio.playSfx('coin-alt', { volume: 0.65 });
        const extras = [
          `+${fmtMoney(res.cash)}`,
          res.gems > 0 ? `+${fmtInt(res.gems)} Gems` : null,
          res.totalOresAdded > 0 ? `+${fmtInt(res.totalOresAdded)} Ores` : null,
          res.returnRushActivated ? '⚡ Return Rush 10m!' : null,
        ].filter(Boolean);
        this.pushToast(`${mult === 2 ? '2x ' : ''}Offline Reward: ${extras.join(' • ')}`);
      }
      this.closeModal();
    };

    root.querySelector<HTMLElement>('[data-offline-claim="1"]')?.addEventListener('click', () => {
      if (this.claimingAd) return;
      finishClaim(1);
    });

    root.querySelector<HTMLElement>('[data-offline-claim="2"]')?.addEventListener('click', () => {
      if (this.claimingAd) return;
      this.claimingAd = true;
      cgRequestRewardedAd(
        () => {
          this.claimingAd = false;
          finishClaim(2);
        },
        () => {
          this.claimingAd = false;
          this.pushToast('Ad unavailable right now — try Claim instead!');
        }
      );
    });
  }
}
