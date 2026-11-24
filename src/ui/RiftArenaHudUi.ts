import { assetUrl } from '../game/AssetUrl';
import {
  getAnomalyChibiById,
  getRiftTierProgress,
  RIFT_ANOMALIES,
  RIFT_TIER_DEFS,
} from '../game/AnomalyData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import type { RiftBattleSummary } from '../game/RiftDomain';
import { getChibiById } from '../game3d/ChibiCatalog';
import { hudIconHtml, riftShardIconHtml } from './HudIcons';
import { TW_CLOSE_BTN } from './HudShared';

export class RiftArenaHudUi {
  constructor(
    private readonly state: GameState,
    private readonly onRetreat: () => void,
    private readonly onRetry: () => void,
    private readonly onReturnHub: () => void
  ) {}

  public renderRiftArenaHud(): string {
    const battle = this.state.riftBattle;
    if (!battle) {
      const summary = this.state.riftLastSummary;
      if (!summary) return '';
      return this.renderSummaryPopup(summary);
    }

    const bossDef = getAnomalyChibiById(battle.bossId);
    const bossChibi = getChibiById(battle.bossId);
    const anomaly = RIFT_ANOMALIES.find((a) => a.id === battle.anomalyId) ?? RIFT_ANOMALIES[0];
    const prog = getRiftTierProgress(battle.damageDealt);
    const timerDanger = battle.timeRemainingSec <= 5;
    const portraitHtml = bossChibi
      ? `<img src="${assetUrl(bossChibi.poses.pose)}" alt="${bossDef?.name ?? battle.bossId}" class="w-full h-full object-contain" />`
      : `<img src="${assetUrl('/badges/anomaly.svg')}" alt="Rift" class="w-7 h-7 object-contain" />`;

    const tierPipsHtml = RIFT_TIER_DEFS.map((t) => {
      const reached = prog.tier >= t.tier;
      return `
        <div
          data-rift-pip="${t.tier}"
          class="flex-1 h-5 rounded-md border-[1.5px] border-[#14111d] flex items-center justify-center text-[9.5px] font-black tabular-nums transition-colors ${
            reached
              ? 'bg-[#22d3ee] text-[#14111d]'
              : 'bg-[#1e1b2e]/85 text-[#94a3b8]'
          }"
          title="Tier ${t.tier}: ${fmtShort(t.damageTarget)} DMG → ${t.shards} Shard${t.shards > 1 ? 's' : ''}"
        >T${t.tier}</div>
      `;
    }).join('');

    const nextTargetLabel =
      prog.nextTarget !== null
        ? `${fmtShort(battle.damageDealt)} / ${fmtShort(prog.nextTarget)}`
        : `${fmtShort(battle.damageDealt)} (MAX TIER!)`;

    return `
      <div class="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-3">
        <div class="flex items-start justify-between gap-2 w-full">
          <button
            type="button"
            data-rift-arena-exit="true"
            class="pointer-events-auto px-3 h-9 rounded-xl border-[2.5px] border-[#14111d] bg-[#fff8e7] hover:bg-white text-[#14111d] text-[12px] font-black cursor-pointer shrink-0"
          >← Retreat</button>

          <div class="pointer-events-auto flex-1 max-w-[660px] mx-auto rounded-2xl border-[2.5px] border-[#14111d] bg-[#fff8e7]/95 px-3 py-2 flex flex-col gap-1.5">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-9 h-9 rounded-xl border-2 border-[#14111d] bg-[#14111d]/10 p-0.5 shrink-0 overflow-hidden">
                  ${portraitHtml}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[13.5px] font-black text-[#14111d] truncate">${bossDef?.name ?? battle.bossId}</span>
                    <span class="mam-pill-xs bg-[#14111d] text-[#67e8f9]">${anomaly.name}</span>
                  </div>
                  <div class="text-[10.5px] font-bold text-[#475569] truncate">${anomaly.summary}</div>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span
                  data-rift-hud-tier="true"
                  class="px-2.5 py-1 rounded-xl border-2 border-[#14111d] bg-[#c4b5fd] text-[#14111d] text-[12px] font-black tabular-nums"
                >TIER ${prog.tier}</span>
                <span
                  data-rift-hud-timer="true"
                  class="px-2.5 py-1 rounded-xl border-2 border-[#14111d] ${
                    timerDanger ? 'bg-[#ef4444] text-white animate-pulse' : 'bg-[#14111d] text-[#22d3ee]'
                  } text-[14px] font-black tabular-nums min-w-[64px] text-center"
                >${battle.timeRemainingSec.toFixed(1)}s</span>
              </div>
            </div>

            <div class="flex items-center justify-between gap-2 text-[11px] font-black text-[#14111d]">
              <span data-rift-hud-dmg="true" class="tabular-nums">DMG: ${nextTargetLabel}</span>
              <span data-rift-hud-reward="true" class="text-[#6d28d9] tabular-nums inline-flex items-center gap-1">${riftShardIconHtml(15, 'Shard')}<span>+${prog.shards} Shard${prog.shards === 1 ? '' : 's'} • ${Math.round(prog.dropChance * 1000) / 10}% Drop</span></span>
            </div>

            <div class="w-full h-3 rounded-full border-2 border-[#14111d] bg-[#1e1b2e] overflow-hidden">
              <div
                data-rift-hud-bar="true"
                class="h-full bg-[linear-gradient(90deg,#22d3ee_0%,#a855f7_55%,#f472b6_100%)] transition-[width] duration-100"
                style="width:${prog.progressPct.toFixed(1)}%"
              ></div>
            </div>

            <div class="flex items-center gap-1">${tierPipsHtml}</div>
          </div>

          <div class="w-[74px] shrink-0 hidden sm:block"></div>
        </div>

        <div class="flex justify-center pb-1">
          <div class="px-3.5 py-1 rounded-full border-2 border-[#14111d] bg-[#14111d]/85 text-[#e0f2fe] text-[11px] font-black tracking-wide">
            TAP RIFT BOSS TO ADD DAMAGE • CLIMB TIER 1–10 IN 30s!
          </div>
        </div>
      </div>
    `;
  }

  public updateLiveValues(root: HTMLElement): void {
    const battle = this.state.riftBattle;
    if (!battle) return;
    const prog = getRiftTierProgress(battle.damageDealt);

    const timerEl = root.querySelector<HTMLElement>('[data-rift-hud-timer="true"]');
    if (timerEl) {
      timerEl.textContent = `${battle.timeRemainingSec.toFixed(1)}s`;
      const danger = battle.timeRemainingSec <= 5;
      timerEl.className = `px-2.5 py-1 rounded-xl border-2 border-[#14111d] ${
        danger ? 'bg-[#ef4444] text-white animate-pulse' : 'bg-[#14111d] text-[#22d3ee]'
      } text-[14px] font-black tabular-nums min-w-[64px] text-center`;
    }

    const tierEl = root.querySelector<HTMLElement>('[data-rift-hud-tier="true"]');
    if (tierEl) tierEl.textContent = `TIER ${prog.tier}`;

    const dmgEl = root.querySelector<HTMLElement>('[data-rift-hud-dmg="true"]');
    if (dmgEl) {
      dmgEl.textContent =
        prog.nextTarget !== null
          ? `DMG: ${fmtShort(battle.damageDealt)} / ${fmtShort(prog.nextTarget)}`
          : `DMG: ${fmtShort(battle.damageDealt)} (MAX TIER!)`;
    }

    const rewardEl = root.querySelector<HTMLElement>('[data-rift-hud-reward="true"]');
    if (rewardEl) {
      rewardEl.innerHTML = `${riftShardIconHtml(15, 'Shard')}<span>+${prog.shards} Shard${prog.shards === 1 ? '' : 's'} • ${Math.round(prog.dropChance * 1000) / 10}% Drop</span>`;
    }

    const barEl = root.querySelector<HTMLElement>('[data-rift-hud-bar="true"]');
    if (barEl) barEl.style.width = `${prog.progressPct.toFixed(1)}%`;

    root.querySelectorAll<HTMLElement>('[data-rift-pip]').forEach((pip) => {
      const t = Number(pip.dataset.riftPip ?? 0);
      const reached = prog.tier >= t;
      pip.className = `flex-1 h-5 rounded-md border-[1.5px] border-[#14111d] flex items-center justify-center text-[9.5px] font-black tabular-nums transition-colors ${
        reached ? 'bg-[#22d3ee] text-[#14111d]' : 'bg-[#1e1b2e]/85 text-[#94a3b8]'
      }`;
    });
  }

  private renderSummaryPopup(summary: RiftBattleSummary): string {
    const bossDef = getAnomalyChibiById(summary.bossId);
    const bossChibi = getChibiById(summary.bossId);
    const snap = this.state.getRiftWindowSnapshot();
    const canRetry = snap.isOpen && snap.attemptsRemaining > 0;
    const portraitHtml = bossChibi
      ? `<img src="${assetUrl(bossChibi.poses.pose)}" alt="${bossDef?.name ?? summary.bossId}" class="w-full h-full object-contain" />`
      : `<img src="${assetUrl('/badges/anomaly.svg')}" alt="" class="w-8 h-8 object-contain" />`;

    const dropChibi = summary.droppedChibiId ? getChibiById(summary.droppedChibiId) : undefined;
    const dropBannerHtml = summary.droppedChibiId
      ? `
        <div class="rounded-2xl border-[2.5px] border-[#14111d] bg-[linear-gradient(135deg,#cffafe,#e9d5ff)] px-3 py-2 flex items-center gap-2.5">
          ${dropChibi ? `<img src="${assetUrl(dropChibi.poses.pose)}" alt="${dropChibi.name}" class="w-11 h-11 object-contain shrink-0" />` : ''}
          <div class="min-w-0">
            <div class="text-[10.5px] font-black uppercase text-[#6d28d9]">RIFT JACKPOT DROP!</div>
            <div class="text-[14px] font-black text-[#14111d] truncate">+1 ${dropChibi?.name ?? summary.droppedChibiId} (ANOMALY)</div>
          </div>
        </div>
      `
      : '';

    return `
      <div class="pointer-events-auto fixed inset-0 z-40 bg-[rgba(12,10,18,0.72)] flex items-center justify-center p-3 mam-backdrop-enter" data-rift-summary-popup="true">
        <div class="mam-modal mam-modal-enter w-[min(450px,calc(100%-12px))] max-h-[calc(100%-12px)] overflow-y-auto p-4 flex flex-col gap-3" data-modal-theme="bounties">
          <div class="rounded-2xl border-[2.5px] border-[#14111d] px-3.5 py-2.5 flex items-center justify-between gap-2.5" style="background:linear-gradient(135deg,#cffafe 0%,#e9d5ff 55%,#fde68a 100%)">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-13 h-13 rounded-2xl border-[2.5px] border-[#14111d] bg-[#fff8e7] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                ${portraitHtml}
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="mam-pill-xs bg-[#14111d] text-[#22d3ee]">TIER ${summary.tierReached} / 10</span>
                  ${summary.isNewBest ? `<span class="mam-pill-xs bg-[#fde047] text-[#14111d]">NEW BEST!</span>` : ''}
                  ${summary.retreated ? `<span class="mam-pill-xs bg-[#e2e8f0] text-[#475569]">RETREATED</span>` : ''}
                </div>
                <div class="text-[16px] font-black uppercase leading-tight text-[#14111d] truncate">${bossDef?.name ?? summary.bossId} Challenge</div>
                <div class="text-[11px] font-extrabold text-[#334155] tabular-nums">Total DMG: ${fmtShort(summary.damageDealt)}</div>
              </div>
            </div>
            <button type="button" class="${TW_CLOSE_BTN}" data-rift-summary-hub="true" aria-label="Return to Rift Hub">✕</button>
          </div>

          ${dropBannerHtml}

          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-xl border-2 border-[#14111d] bg-white px-3 py-2 flex items-center gap-2">
              ${riftShardIconHtml(30, 'Rift Shards')}
              <div class="flex flex-col min-w-0">
                <span class="text-[9.5px] font-black uppercase text-[#64748b]">Rift Shards</span>
                <span class="text-[16px] font-black text-[#6d28d9] tabular-nums">+${fmtInt(summary.shardsEarned)}</span>
              </div>
            </div>
            <div class="rounded-xl border-2 border-[#14111d] bg-white px-3 py-2 flex items-center gap-2">
              <span class="shrink-0">${hudIconHtml('chest', 26, 'Vault')}</span>
              <div class="flex flex-col min-w-0">
                <span class="text-[9.5px] font-black uppercase text-[#64748b]">Vault Total</span>
                <span class="text-[15px] font-black text-[#14111d] tabular-nums">${fmtInt(this.state.riftShards)} / 100</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              data-rift-summary-hub="true"
              class="flex-1 h-11 rounded-2xl border-[2.5px] border-[#14111d] bg-[#fff8e7] hover:bg-white active:scale-95 text-[#14111d] text-[13.5px] font-black cursor-pointer transition-transform"
            >RETURN TO HUB</button>
            <button
              type="button"
              data-rift-summary-retry="true"
              class="flex-1 h-11 rounded-2xl border-[2.5px] border-[#14111d] ${
                canRetry
                  ? 'bg-[linear-gradient(135deg,#22d3ee,#a855f7)] text-white cursor-pointer active:scale-95'
                  : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
              } text-[13.5px] font-black transition-transform"
              ${canRetry ? '' : 'disabled'}
            >${canRetry ? `BATTLE AGAIN (${snap.attemptsRemaining}/3)` : !snap.isOpen ? 'RIFT CLOSED' : 'NO ATTEMPTS (0/3)'}</button>
          </div>
        </div>
      </div>
    `;
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelector<HTMLElement>('[data-rift-arena-exit="true"]')?.addEventListener('click', () => {
      this.onRetreat();
    });
    root.querySelectorAll<HTMLElement>('[data-rift-summary-hub="true"]').forEach((btn) => {
      btn.addEventListener('click', () => this.onReturnHub());
    });
    root.querySelector<HTMLElement>('[data-rift-summary-retry="true"]')?.addEventListener('click', () => {
      this.onRetry();
    });
  }
}
