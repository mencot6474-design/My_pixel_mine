import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import {
  ANOMALY_CHIBI_DEFS,
  type AnomalyChibiId,
  getAnomalyChibiById,
  getAnomalyPassiveStarScale,
  getAnomalyShardCost,
  RIFT_PASS_GEM_COST,
  RIFT_TIER_DEFS,
} from '../game/AnomalyData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import { getChibiById } from '../game3d/ChibiCatalog';
import { riftShardIconHtml } from './HudIcons';
import {
  chibiPortraitHtml,
  formatCountdownTimer,
  rarityCardClasses,
  rarityVars,
  renderModalShell,
  renderRarityBadgeHtml,
  TW_SHOP_MODAL_RESP,
} from './HudShared';

export class RiftModalUi {
  private selectedChibiId: AnomalyChibiId = ANOMALY_CHIBI_DEFS[0].chibiId;
  private lastSnapKey = '';

  constructor(
    private readonly state: GameState,
    private readonly onRender: () => void,
    private readonly onToast: (msg: string) => void,
    private readonly onStartBattle?: () => void
  ) {}

  private buildSnapKey(snap: ReturnType<GameState['getRiftWindowSnapshot']>): string {
    return `${snap.isOpen ? 1 : 0}:${snap.source}:${snap.attemptsRemaining}:${snap.bossId}:${snap.anomaly.id}`;
  }

  /** Updates the open/closed Rift Gate timer and refreshes modal on window/quota state transitions. */
  public stepTick(_dtSec: number, root: HTMLElement): void {
    const snap = this.state.getRiftWindowSnapshot();
    const nextKey = this.buildSnapKey(snap);
    if (this.lastSnapKey && nextKey !== this.lastSnapKey) {
      this.lastSnapKey = nextKey;
      this.onRender();
      return;
    }
    const timerEl = root.querySelector<HTMLElement>('[data-rift-timer="true"]');
    if (timerEl) {
      timerEl.textContent = formatCountdownTimer(snap.isOpen ? snap.remainingSec : snap.nextOpenSec);
    }
  }

  public renderModal(): string {
    const snap = this.state.getRiftWindowSnapshot();
    this.lastSnapKey = this.buildSnapKey(snap);
    const timerStr = formatCountdownTimer(snap.isOpen ? snap.remainingSec : snap.nextOpenSec);
    const statusPill = snap.isOpen
      ? `<span class="mam-pill bg-[#67e8f9] text-[#14111d]">OPEN • <span data-rift-timer="true">${timerStr}</span></span>`
      : `<span class="mam-pill bg-[#e2e8f0] text-[#475569]">OPENS IN <span data-rift-timer="true">${timerStr}</span></span>`;
    const attemptsPill = `<span class="mam-pill ${
      snap.attemptsRemaining > 0 ? 'bg-[#bbf7d0] text-[#14532d]' : 'bg-[#fecdd3] text-[#881337]'
    }" data-rift-attempts="true">${snap.attemptsRemaining}/${snap.maxAttempts} Attempts</span>`;
    const shardsPill = `<span class="mam-pill bg-[#e9d5ff] text-[#4c1d95] inline-flex items-center gap-1" data-rift-shards="true">${riftShardIconHtml(16, 'Shards')}<span>${fmtInt(this.state.riftShards)} Shards</span></span>`;

    return renderModalShell({
      title: 'Dimensional Rift Gate',
      theme: 'bounties',
      iconHtml: `<img class="w-7 h-7 object-contain" src="${assetUrl('/badges/anomaly.svg')}" alt="" />`,
      boxClass: `w-[min(940px,calc(100%-16px))] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: `${statusPill}${attemptsPill}${shardsPill}`,
      bodyHtml: this.renderHubBody(snap),
    });
  }

  private renderHubBody(snap: ReturnType<GameState['getRiftWindowSnapshot']>): string {
    const canBuyPass = this.state.gems >= RIFT_PASS_GEM_COST;
    const canEnter = snap.isOpen && snap.attemptsRemaining > 0;
    const enterOrPassBtn = canEnter
      ? `<button type="button" data-rift-action="enter-battle" class="mam-sheen-hover relative overflow-hidden shrink-0 w-full py-2.5 rounded-2xl border-[3px] border-[#14111d] bg-[linear-gradient(135deg,#22d3ee,#a855f7)] text-white text-[14px] font-black cursor-pointer transition-transform duration-150 ease-out hover:scale-[0.98] active:scale-[0.95]">ENTER RIFT BATTLE (30s) • ${snap.attemptsRemaining}/${snap.maxAttempts} →</button>`
      : `<button type="button" data-rift-action="buy-pass" class="mam-sheen-hover relative overflow-hidden shrink-0 w-full py-2.5 rounded-2xl border-[3px] border-[#14111d] ${canBuyPass ? 'bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] cursor-pointer transition-transform duration-150 ease-out hover:scale-[0.98] active:scale-[0.95]' : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'} text-[13.5px] font-black">FORCE OPEN 15m • 3 ATTEMPTS (${fmtShort(RIFT_PASS_GEM_COST)} Gems)</button>`;

    const activeBossDef = getAnomalyChibiById(snap.bossId) ?? ANOMALY_CHIBI_DEFS[0];

    const rosterHtml = ANOMALY_CHIBI_DEFS.map((anom) => {
      const chibi = getChibiById(anom.chibiId);
      if (!chibi) return '';
      const owned = this.state.miners[anom.chibiId] || 0;
      const isSelected = this.selectedChibiId === anom.chibiId;
      const isActiveBoss = snap.bossId === anom.chibiId;
      const ringCls = isSelected ? 'ring-[3px] ring-inset ring-[#22d3ee] brightness-[1.03]' : 'opacity-95 hover:opacity-100';
      return `
        <button
          type="button"
          data-rift-select="${anom.chibiId}"
          class="${rarityCardClasses('anomaly', `!aspect-auto !flex-row !items-center !justify-start !gap-3 !p-2.5 min-h-[78px] shrink-0 text-left cursor-pointer ${ringCls}`)}"
          style="${rarityVars('anomaly')}"
        >
          <div class="w-14 h-14 rounded-xl border-2 border-[#14111d] bg-[#fff8e7]/95 flex items-center justify-center shrink-0 overflow-hidden [&_.mam-chibi-portrait_img]:max-h-12">
            ${chibiPortraitHtml(chibi, { usePose: true })}
          </div>
          <div class="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[14px] font-black text-[#14111d] leading-tight truncate">${anom.name}</span>
              ${renderRarityBadgeHtml('anomaly', 'is-compact !ml-0')}
              ${isActiveBoss ? `<span class="mam-pill-xs bg-[#14111d] text-[#22d3ee]">ACTIVE BOSS</span>` : ''}
            </div>
            <div class="text-[10.5px] font-bold text-[#14111d]/80 leading-tight truncate">${anom.title}</div>
            <div class="text-[11px] font-black text-[#14111d] tabular-nums leading-tight">Base DPS: ${fmtShort(this.state.getEffectiveChibiDps(anom.chibiId))}/s • Owned: ${fmtInt(owned)} • ${anom.shardCost} Shards</div>
          </div>
        </button>
      `;
    }).join('');

    const tierLadderHtml = RIFT_TIER_DEFS.map((t) => {
      const beaten = this.state.riftBestTier >= t.tier;
      return `
        <div class="px-2 py-0.5 rounded-lg border-[1.5px] border-[#14111d] ${beaten ? 'bg-[#cffafe] ring-1 ring-inset ring-[#06b6d4]' : 'bg-white'} flex items-center justify-between gap-1 text-[10.5px] font-black tabular-nums">
          <span class="${beaten ? 'text-[#0e7490]' : 'text-[#14111d]'} inline-flex items-center gap-1">${beaten ? '<span class="text-[#059669]">✓</span>' : ''}Tier ${t.tier}</span>
          <span class="text-[#475569]">${fmtShort(t.damageTarget)}</span>
          <span class="text-[#6d28d9] inline-flex items-center gap-0.5">+${t.shards}${riftShardIconHtml(13, 'Shard')}</span>
        </div>
      `;
    }).join('');

    const selectedDef = getAnomalyChibiById(this.selectedChibiId) ?? ANOMALY_CHIBI_DEFS[0];
    const selectedChibi = getChibiById(selectedDef.chibiId);
    const selectedOwned = this.state.miners[selectedDef.chibiId] || 0;
    const selectedStars = this.state.getChibiStar(selectedDef.chibiId) || 1;
    const starScale = getAnomalyPassiveStarScale(selectedStars);
    const teamPct = Math.round(selectedDef.passiveTeamDmgPct * starScale * 100);
    const dropPct = Math.round(selectedDef.passiveOreDropPct * starScale * 100);
    const sellPct = Math.round(selectedDef.passiveOreSellPct * starScale * 100);
    const shardCost = selectedDef.shardCost;
    const canRedeem = this.state.riftShards >= shardCost;

    const passiveCards = [
      ['Team DMG', `+${teamPct}%`, 'text-[#b91c1c]'],
      ['Drop Ore', `+${dropPct}%`, 'text-[#0369a1]'],
      ['Sell Ore', `+${sellPct}%`, 'text-[#b45309]'],
    ]
      .map(
        ([lbl, val, cls]) => `
        <div class="px-2 py-1.5 rounded-xl border-2 border-[#14111d] bg-white flex flex-col items-center text-center">
          <span class="text-[9px] font-black uppercase tracking-wider text-[#64748b] leading-none">${lbl}</span>
          <span class="text-[12.5px] font-black tabular-nums leading-tight mt-0.5 ${cls}">${val}</span>
        </div>
      `
      )
      .join('');

    return `
      <div class="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto mam-no-scrollbar">
        <div class="grid grid-cols-[minmax(0,1.18fr)_minmax(290px,0.88fr)] @max-[860px]:grid-cols-1 gap-3 flex-1 min-h-0">
          <div class="flex flex-col justify-between gap-2 min-h-0">
            <div class="shrink-0 p-2.5 rounded-2xl border-[2.5px] border-[#14111d] bg-[linear-gradient(135deg,#fef3c7,#fde68a)] flex flex-col gap-1">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="text-[10.5px] font-black uppercase tracking-wider text-[#5b526e]">30s Boss DPS Check • Boss: ${activeBossDef.name}</span>
                <span class="mam-pill-xs bg-[#14111d] text-[#67e8f9]">2%–12% Instant Drop</span>
              </div>
              <div class="text-[14.5px] font-black text-[#14111d] leading-tight">${snap.anomaly.name}</div>
              <div class="text-[11px] font-bold text-[#475569] leading-snug">${snap.anomaly.summary}</div>
            </div>

            <div class="shrink-0 rounded-2xl border-2 border-[#14111d] bg-[#fff8e7] p-2 flex flex-col gap-1">
              <div class="flex items-center justify-between text-[10.5px] font-black text-[#14111d]">
                <span>TIER 1–10 DAMAGE TARGETS (1 SHARD / TIER)</span>
                <span class="text-[#0369a1] tabular-nums">Best: Tier ${this.state.riftBestTier} (${fmtShort(this.state.riftBestDamage)})</span>
              </div>
              <div class="grid grid-cols-2 gap-1">${tierLadderHtml}</div>
            </div>

            <div class="shrink-0 flex flex-col gap-2">
              ${rosterHtml}
            </div>

            ${enterOrPassBtn}
          </div>

          <div class="mam-inspector-well mam-no-scrollbar rounded-2xl p-3 flex flex-col justify-between gap-2.5 min-h-0 overflow-y-auto @max-[860px]:overflow-visible">
            <div class="flex items-center justify-between gap-2 shrink-0 flex-wrap">
              <span class="text-[12.5px] font-black tracking-wide text-[#14111d]">ANOMALY RIFT VAULT</span>
              <span class="mam-pill-xs bg-[#14111d] text-[#67e8f9] inline-flex items-center gap-1">${riftShardIconHtml(14, 'Shards')}<span>${fmtInt(this.state.riftShards)} / ${shardCost} Shards</span></span>
            </div>

            ${
              selectedChibi
                ? `<div class="${rarityCardClasses('anomaly', 'is-holo-foil !aspect-auto w-full py-2.5 px-3 flex flex-col items-center gap-1 shrink-0')}" style="${rarityVars('anomaly')}">
                    <div class="w-full h-[96px] flex items-center justify-center [&_.mam-chibi-portrait_img]:max-h-[92px]">
                      ${chibiPortraitHtml(selectedChibi, { usePose: true })}
                    </div>
                    <div class="text-[14.5px] font-black text-[#14111d] leading-tight">${selectedDef.name}</div>
                    <div class="flex items-center gap-2">
                      ${renderRarityBadgeHtml('anomaly', 'is-compact !ml-0')}
                      <span class="mam-pill-xs bg-white text-[#b45309] border-[1.5px] border-[#14111d]">${fmtShort(this.state.getEffectiveChibiDps(selectedDef.chibiId))}/s Base</span>
                    </div>
                  </div>`
                : ''
            }

            <div class="flex flex-col gap-1 shrink-0">
              <div class="text-[9.5px] font-black uppercase tracking-[0.06em] text-[#475569] text-center">Triple Anomaly Passives (Active on Plot)</div>
              <div class="grid grid-cols-3 gap-1.5">${passiveCards}</div>
            </div>

            <div class="grid grid-cols-2 gap-1.5 shrink-0">
              <div class="px-2.5 py-1 rounded-xl border-2 border-[#14111d] bg-white flex items-center justify-between text-[10.5px] font-black">
                <span class="text-[#64748b]">Owned</span>
                <span class="text-[#14111d] tabular-nums">${fmtInt(selectedOwned)}</span>
              </div>
              <div class="px-2.5 py-1 rounded-xl border-2 border-[#14111d] bg-white flex items-center justify-between text-[10.5px] font-black">
                <span class="text-[#64748b]">Clears</span>
                <span class="text-[#14111d] tabular-nums">${fmtInt(this.state.riftBreachesCompleted)}</span>
              </div>
            </div>

            <button
              type="button"
              data-rift-redeem="${selectedDef.chibiId}"
              class="shrink-0 w-full h-10 rounded-xl border-[2.5px] border-[#14111d] inline-flex items-center justify-center gap-1.5 ${canRedeem ? 'bg-[#2ee59d] hover:brightness-105 text-[#14111d] cursor-pointer active:scale-95' : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'} text-[13px] font-black"
            >
              ${riftShardIconHtml(18, 'Shard')}
              <span>PITY CLAIM (${shardCost} Shards)</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelector<HTMLElement>('[data-rift-action="enter-battle"]')?.addEventListener('click', () => {
      this.onStartBattle?.();
    });

    root.querySelector<HTMLElement>('[data-rift-action="buy-pass"]')?.addEventListener('click', () => {
      const res = this.state.buyRiftPass();
      if (res === 'bought') {
        audio.playSfx('rare-fanfare', { volume: 0.7 });
        this.onToast('Rift Gate Forced Open for 15 minutes (3 Attempts)!');
        this.onRender();
      } else if (res === 'already_has_attempts') {
        this.onRender();
      } else {
        audio.playSfx('ui-error');
        this.onToast(`Need ${fmtShort(RIFT_PASS_GEM_COST)} Gems!`);
      }
    });

    root.querySelectorAll<HTMLElement>('[data-rift-select]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chibiId = btn.dataset.riftSelect as AnomalyChibiId | undefined;
        if (!chibiId || !getAnomalyChibiById(chibiId)) return;
        audio.playSfx('ui-tab');
        this.selectedChibiId = chibiId;
        this.onRender();
      });
    });

    root.querySelectorAll<HTMLElement>('[data-rift-redeem]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chibiId = btn.dataset.riftRedeem;
        if (!chibiId) return;
        const res = this.state.redeemAnomalyChibi(chibiId);
        if (res === 'redeemed') {
          const chibi = getChibiById(chibiId);
          audio.playSfx('rare-fanfare', { volume: 0.75 });
          this.onToast(`Claimed ${chibi?.name ?? chibiId}!`);
          this.onRender();
        } else {
          audio.playSfx('ui-error');
          this.onToast(`Need ${getAnomalyShardCost(chibiId)} Rift Shards!`);
        }
      });
    });
  }
}
