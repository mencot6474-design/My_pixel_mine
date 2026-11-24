import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import {
  ANOMALY_CHIBI_DEFS,
  type AnomalyChibiId,
  getAnomalyChibiById,
  getAnomalyPassiveStarScale,
  RIFT_PASS_GEM_COST,
  RIFT_SHARD_PITY_COST,
} from '../game/AnomalyData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import { type RiftBreachClaimResult } from '../game/RiftDomain';
import { getChibiById } from '../game3d/ChibiCatalog';
import {
  chibiPortraitHtml,
  formatCountdownTimer,
  rarityCardClasses,
  rarityVars,
  renderModalShell,
  renderRarityBadgeHtml,
  TW_SHOP_MODAL_RESP,
} from './HudShared';

export type BreachCellKind = 'empty' | 'true' | 'crit' | 'meteor' | 'mimic';

export interface BreachCell {
  kind: BreachCellKind;
  ttlSec: number;
  maxTtlSec: number;
}

export class RiftModalUi {
  private selectedChibiId: AnomalyChibiId = ANOMALY_CHIBI_DEFS[0].chibiId;
  private breachActive = false;
  private coreChargePct = 0;
  private cells: BreachCell[] = Array.from({ length: 9 }, () => ({
    kind: 'empty',
    ttlSec: 0,
    maxTtlSec: 1,
  }));
  private spawnCooldownSec = 0.4;
  private lastClaimBanner: (RiftBreachClaimResult & { atMs: number }) | null = null;

  constructor(
    private readonly state: GameState,
    private readonly onRender: () => void,
    private readonly onToast: (msg: string) => void
  ) {}

  public isBreachActive(): boolean {
    return this.breachActive;
  }

  public resetBreachView(): void {
    this.breachActive = false;
  }

  private seedInitialCells(anomalyId: string): void {
    this.cells = Array.from({ length: 9 }, () => ({ kind: 'empty', ttlSec: 0, maxTtlSec: 1 }));
    for (let i = 0; i < 4; i++) {
      this.spawnOneCell(anomalyId);
    }
  }

  private spawnOneCell(anomalyId: string): void {
    const emptyIndices: number[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i].kind === 'empty') emptyIndices.push(i);
    }
    if (emptyIndices.length === 0) return;
    const slot = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    const r = Math.random();
    const mimicChance = anomalyId === 'overclock-surge' ? 0.28 : 0.18;
    const meteorChance = anomalyId === 'meteor-storm' ? 0.3 : 0.08;
    const critChance = anomalyId === 'hyper-crit' ? 0.34 : 0.16;

    if (r < mimicChance) {
      this.cells[slot] = { kind: 'mimic', ttlSec: 3.6, maxTtlSec: 3.6 };
    } else if (r < mimicChance + meteorChance) {
      this.cells[slot] = { kind: 'meteor', ttlSec: 5.0, maxTtlSec: 5.0 };
    } else if (r < mimicChance + meteorChance + critChance) {
      this.cells[slot] = { kind: 'crit', ttlSec: 4.5, maxTtlSec: 4.5 };
    } else {
      this.cells[slot] = { kind: 'true', ttlSec: 6.5, maxTtlSec: 6.5 };
    }
  }

  /** Advances the Anomaly Breach 3x3 board every 100ms while the Rift modal is in Breach mode. */
  public stepTick(dtSec: number, root: HTMLElement): void {
    if (!this.breachActive) return;
    const snap = this.state.getRiftWindowSnapshot();
    if (!snap.isOpen) {
      this.breachActive = false;
      this.onToast('Hourly Rift window closed!');
      this.onRender();
      return;
    }

    let changed = false;
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (cell.kind === 'empty') continue;
      cell.ttlSec -= dtSec;
      if (cell.ttlSec <= 0) {
        if (cell.kind === 'mimic') {
          this.coreChargePct = Math.max(0, this.coreChargePct - 10);
          audio.playSfx('ui-error', { volume: 0.4 });
        }
        this.cells[i] = { kind: 'empty', ttlSec: 0, maxTtlSec: 1 };
        changed = true;
      }
    }

    this.spawnCooldownSec -= dtSec;
    if (this.spawnCooldownSec <= 0) {
      this.spawnOneCell(snap.anomaly.id);
      this.spawnCooldownSec = snap.anomaly.id === 'overclock-surge' ? 0.65 : 0.95;
      changed = true;
    }

    if (changed) {
      this.updateBreachDom(root, snap);
    } else {
      const timerEl = root.querySelector<HTMLElement>('[data-rift-timer="true"]');
      if (timerEl) {
        timerEl.textContent = formatCountdownTimer(snap.remainingSec);
      }
    }
  }

  private clickCell(index: number, root: HTMLElement): void {
    const cell = this.cells[index];
    if (!cell || cell.kind === 'empty') return;
    const snap = this.state.getRiftWindowSnapshot();
    if (!snap.isOpen) {
      this.breachActive = false;
      this.onRender();
      return;
    }

    let gain = 0;
    if (cell.kind === 'mimic') {
      audio.playSfx('ui-tab');
      this.cells[index] = { kind: 'empty', ttlSec: 0, maxTtlSec: 1 };
    } else if (cell.kind === 'crit') {
      gain = snap.anomaly.id === 'hyper-crit' ? 30 : 25;
      audio.playSfx('ore-hit-3', { volume: 0.65 });
      this.cells[index] = { kind: 'empty', ttlSec: 0, maxTtlSec: 1 };
    } else if (cell.kind === 'meteor') {
      gain = snap.anomaly.id === 'meteor-storm' ? 28 : 22;
      audio.playSfx('ore-hit-3', { volume: 0.65 });
      this.cells[index] = { kind: 'empty', ttlSec: 0, maxTtlSec: 1 };
    } else {
      gain = 15;
      audio.playSfx('ore-hit-1');
      this.cells[index] = { kind: 'empty', ttlSec: 0, maxTtlSec: 1 };
      if (snap.anomaly.id === 'mirror-echo') {
        const adj = [index - 1, index + 1, index - 3, index + 3].find(
          (ni) => ni >= 0 && ni < 9 && this.cells[ni].kind === 'true'
        );
        if (adj !== undefined) {
          this.cells[adj] = { kind: 'empty', ttlSec: 0, maxTtlSec: 1 };
          gain += 12;
        }
      }
    }

    this.coreChargePct = Math.min(100, this.coreChargePct + gain);
    if (this.coreChargePct >= 100) {
      this.coreChargePct = 0;
      const res = this.state.claimRiftBreachReward();
      this.lastClaimBanner = { ...res, atMs: Date.now() };
      audio.playSfx('rare-fanfare', { volume: 0.72 });
      if (res.droppedChibiId) {
        const chibi = getChibiById(res.droppedChibiId);
        this.onToast(`RIFT JACKPOT! Unlocked ${chibi?.name ?? res.droppedChibiId} + ${res.shardsEarned} Shards!`);
      } else {
        this.onToast(`RIFT BREACH! +${res.shardsEarned} Rift Shards`);
      }
      this.onRender();
      return;
    }

    this.updateBreachDom(root, snap);
  }

  private renderCellHtml(cell: BreachCell, idx: number): string {
    if (cell.kind === 'empty') {
      return `
        <button type="button" class="h-[88px] rounded-2xl border-2 border-dashed border-[#14111d]/25 bg-[#14111d]/5 text-[#5b526e] text-[11px] font-black flex items-center justify-center cursor-default" disabled>
          VOID
        </button>
      `;
    }
    if (cell.kind === 'mimic') {
      return `
        <button type="button" data-rift-cell="${idx}" class="h-[88px] rounded-2xl border-[2.5px] border-[#14111d] bg-[linear-gradient(135deg,#fee2e2,#fca5a5)] text-[#7f1d1d] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform active:scale-95">
          <span class="text-[18px] leading-none">⚠</span>
          <span class="text-[12px] font-black uppercase">Glitch Mimic</span>
          <span class="text-[10px] font-bold">Tap to Purge (${cell.ttlSec.toFixed(1)}s)</span>
        </button>
      `;
    }
    if (cell.kind === 'crit') {
      return `
        <button type="button" data-rift-cell="${idx}" class="h-[88px] rounded-2xl border-[2.5px] border-[#14111d] bg-[linear-gradient(135deg,#fef08a,#fde047)] text-[#14111d] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform hover:scale-[0.98] active:scale-95">
          <span class="text-[18px] leading-none">✦</span>
          <span class="text-[12px] font-black uppercase">Crit Crystal</span>
          <span class="text-[10px] font-bold">+25–30% Core</span>
        </button>
      `;
    }
    if (cell.kind === 'meteor') {
      return `
        <button type="button" data-rift-cell="${idx}" class="h-[88px] rounded-2xl border-[2.5px] border-[#14111d] bg-[linear-gradient(135deg,#fecdd3,#fb7185)] text-[#14111d] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform hover:scale-[0.98] active:scale-95">
          <span class="text-[18px] leading-none">☄</span>
          <span class="text-[12px] font-black uppercase">Rift Meteor</span>
          <span class="text-[10px] font-bold">+22–28% Core</span>
        </button>
      `;
    }
    return `
      <button type="button" data-rift-cell="${idx}" class="h-[88px] rounded-2xl border-[2.5px] border-[#14111d] bg-[linear-gradient(135deg,#cffafe,#67e8f9,#c4b5fd)] text-[#14111d] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform hover:scale-[0.98] active:scale-95">
        <span class="text-[18px] leading-none">◆</span>
        <span class="text-[12px] font-black uppercase">True Crystal</span>
        <span class="text-[10px] font-bold">+15% Core</span>
      </button>
    `;
  }

  private updateBreachDom(root: HTMLElement, snap: ReturnType<GameState['getRiftWindowSnapshot']>): void {
    const gridEl = root.querySelector<HTMLElement>('[data-rift-grid="true"]');
    if (gridEl) {
      gridEl.innerHTML = this.cells.map((c, i) => this.renderCellHtml(c, i)).join('');
      gridEl.querySelectorAll<HTMLElement>('[data-rift-cell]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.riftCell);
          if (Number.isInteger(idx)) this.clickCell(idx, root);
        });
      });
    }
    const barEl = root.querySelector<HTMLElement>('[data-rift-core-bar="true"]');
    if (barEl) barEl.style.width = `${this.coreChargePct}%`;
    const pctEl = root.querySelector<HTMLElement>('[data-rift-core-pct="true"]');
    if (pctEl) pctEl.textContent = `${this.coreChargePct}%`;
    const timerEl = root.querySelector<HTMLElement>('[data-rift-timer="true"]');
    if (timerEl) timerEl.textContent = formatCountdownTimer(snap.remainingSec);
  }

  public renderModal(): string {
    const snap = this.state.getRiftWindowSnapshot();
    const timerStr = formatCountdownTimer(snap.isOpen ? snap.remainingSec : snap.nextOpenSec);
    const statusPill = snap.isOpen
      ? `<span class="mam-pill bg-[#67e8f9] text-[#14111d]">OPEN • <span data-rift-timer="true">${timerStr}</span></span>`
      : `<span class="mam-pill bg-[#e2e8f0] text-[#475569]">OPENS IN <span data-rift-timer="true">${timerStr}</span></span>`;
    const shardsPill = `<span class="mam-pill bg-[#e9d5ff] text-[#4c1d95]" data-rift-shards="true">◆ ${fmtInt(this.state.riftShards)} Shards</span>`;

    const bodyHtml = this.breachActive && snap.isOpen
      ? this.renderBreachBody(snap)
      : this.renderHubBody(snap);

    return renderModalShell({
      title: 'Dimensional Rift Gate',
      theme: 'bounties',
      iconHtml: `<img class="w-7 h-7 object-contain" src="${assetUrl('/badges/anomaly.svg')}" alt="" />`,
      boxClass: `w-[min(940px,calc(100%-16px))] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: `${statusPill}${shardsPill}`,
      bodyHtml,
    });
  }

  private renderHubBody(snap: ReturnType<GameState['getRiftWindowSnapshot']>): string {
    const canBuyPass = this.state.gems >= RIFT_PASS_GEM_COST;
    const enterOrPassBtn = snap.isOpen
      ? `<button type="button" data-rift-action="enter-breach" class="mam-sheen-hover relative overflow-hidden w-full py-2.5 rounded-2xl border-[3px] border-[#14111d] bg-[linear-gradient(135deg,#22d3ee,#a855f7)] text-white text-[14px] font-black cursor-pointer transition-transform duration-150 ease-out hover:scale-[0.98] active:scale-[0.95]">ENTER ANOMALY BREACH →</button>`
      : `<button type="button" data-rift-action="buy-pass" class="mam-sheen-hover relative overflow-hidden w-full py-2.5 rounded-2xl border-[3px] border-[#14111d] ${canBuyPass ? 'bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] cursor-pointer transition-transform duration-150 ease-out hover:scale-[0.98] active:scale-[0.95]' : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'} text-[13.5px] font-black">FORCE OPEN 15m (${fmtShort(RIFT_PASS_GEM_COST)} Gems)</button>`;

    const rosterHtml = ANOMALY_CHIBI_DEFS.map((anom) => {
      const chibi = getChibiById(anom.chibiId);
      if (!chibi) return '';
      const owned = this.state.miners[anom.chibiId] || 0;
      const isSelected = this.selectedChibiId === anom.chibiId;
      const ringCls = isSelected ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : '';
      return `
        <button
          type="button"
          data-rift-select="${anom.chibiId}"
          class="${rarityCardClasses('anomaly', `!aspect-auto p-2.5 flex items-center gap-2.5 text-left cursor-pointer ${ringCls}`)}"
          style="${rarityVars('anomaly')}"
        >
          <div class="w-14 h-14 rounded-xl border-2 border-[#14111d] bg-[#fff8e7]/90 flex items-center justify-center shrink-0 overflow-hidden [&_.mam-chibi-portrait_img]:max-h-12">
            ${chibiPortraitHtml(chibi, { usePose: true })}
          </div>
          <div class="min-w-0 flex-1 flex flex-col gap-0.5">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[13.5px] font-black text-[#14111d] truncate">${anom.name}</span>
              ${renderRarityBadgeHtml('anomaly', 'is-compact !ml-0')}
            </div>
            <div class="text-[10.5px] font-bold text-[#14111d]/80 truncate">${anom.title}</div>
            <div class="text-[11px] font-black text-[#14111d] tabular-nums">Base DPS: ${fmtShort(this.state.getEffectiveChibiDps(anom.chibiId))}/s • Owned: ${fmtInt(owned)}</div>
          </div>
        </button>
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
    const canRedeem = this.state.riftShards >= RIFT_SHARD_PITY_COST;

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
      <div class="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden @max-[860px]:overflow-y-auto">
        <div class="grid grid-cols-[minmax(0,1.15fr)_minmax(290px,0.9fr)] @max-[860px]:grid-cols-1 gap-3 flex-1 min-h-0">
          <div class="flex flex-col gap-2 min-h-0">
            <div class="shrink-0 p-2.5 rounded-2xl border-[2.5px] border-[#14111d] bg-[#fcecc8] flex flex-col gap-1">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="text-[10.5px] font-black uppercase tracking-wider text-[#5b526e]">Hourly Rotation (:00–:15 Real-Time)</span>
                <span class="mam-pill-xs bg-[#14111d] text-[#67e8f9]">8% Instant Drop</span>
              </div>
              <div class="text-[15px] font-black text-[#14111d] leading-tight">${snap.anomaly.name}</div>
              <div class="text-[11.5px] font-bold text-[#475569] leading-snug">${snap.anomaly.summary}</div>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto mam-no-scrollbar flex flex-col gap-2 pr-0.5">
              ${rosterHtml}
            </div>

            ${enterOrPassBtn}
          </div>

          <div class="mam-inspector-well mam-no-scrollbar rounded-2xl p-3 flex flex-col justify-between gap-2.5 min-h-0 overflow-y-auto @max-[860px]:overflow-visible">
            <div class="flex items-center justify-between gap-2 shrink-0 flex-wrap">
              <span class="text-[12.5px] font-black tracking-wide text-[#14111d]">ANOMALY RIFT VAULT</span>
              <span class="mam-pill-xs bg-[#14111d] text-[#67e8f9]">${fmtInt(this.state.riftShards)} / ${RIFT_SHARD_PITY_COST} Shards</span>
            </div>

            ${
              selectedChibi
                ? `<div class="${rarityCardClasses('anomaly', 'is-holo-foil !aspect-auto w-full py-2.5 px-3 flex flex-col items-center gap-1 shrink-0')}" style="${rarityVars('anomaly')}">
                    <div class="w-full h-[96px] flex items-center justify-center [&_.mam-chibi-portrait_img]:max-h-[92px]">
                      ${chibiPortraitHtml(selectedChibi, { usePose: true })}
                    </div>
                    <div class="text-[14px] font-black text-[#14111d] leading-tight">${selectedDef.name}</div>
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
                <span class="text-[#64748b]">Breaches</span>
                <span class="text-[#14111d] tabular-nums">${fmtInt(this.state.riftBreachesCompleted)}</span>
              </div>
            </div>

            <button
              type="button"
              data-rift-redeem="${selectedDef.chibiId}"
              class="shrink-0 w-full h-10 rounded-xl border-[2.5px] border-[#14111d] ${canRedeem ? 'bg-[#2ee59d] hover:brightness-105 text-[#14111d] cursor-pointer active:scale-95' : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'} text-[13px] font-black"
            >
              PITY CLAIM (${RIFT_SHARD_PITY_COST} Shards)
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderBreachBody(snap: ReturnType<GameState['getRiftWindowSnapshot']>): string {
    const banner =
      this.lastClaimBanner && Date.now() - this.lastClaimBanner.atMs < 6000
        ? `<div class="px-3 py-1.5 rounded-xl border-2 border-[#14111d] bg-[#bbf7d0] text-[#14532d] text-[12px] font-black text-center">BREACH COMPLETE! +${this.lastClaimBanner.shardsEarned} Shards${this.lastClaimBanner.droppedChibiId ? ` + DROPPED ${getChibiById(this.lastClaimBanner.droppedChibiId)?.name ?? this.lastClaimBanner.droppedChibiId}!` : ''}</div>`
        : '';

    return `
      <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-0.5">
        <div class="p-2.5 rounded-2xl border-[2.5px] border-[#14111d] bg-[#fcecc8] flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between text-[12px] font-black text-[#14111d] mb-1">
              <span>${snap.anomaly.name} • Core Charge</span>
              <span data-rift-core-pct="true">${this.coreChargePct}%</span>
            </div>
            <div class="w-full h-3.5 rounded-full border-2 border-[#14111d] bg-white overflow-hidden">
              <div data-rift-core-bar="true" class="h-full bg-[linear-gradient(90deg,#22d3ee,#a855f7,#ff2e93)] transition-[width] duration-150" style="width:${this.coreChargePct}%"></div>
            </div>
          </div>
          <button type="button" data-rift-action="exit-breach" class="px-3 h-9 rounded-xl border-2 border-[#14111d] bg-[#fff8e7] text-[#14111d] text-[12px] font-black cursor-pointer hover:brightness-95">Hub</button>
        </div>
        ${banner}
        <div data-rift-grid="true" class="grid grid-cols-3 gap-2">
          ${this.cells.map((c, i) => this.renderCellHtml(c, i)).join('')}
        </div>
      </div>
    `;
  }

  public bindEvents(root: HTMLElement): void {
    const enterBtn = root.querySelector<HTMLElement>('[data-rift-action="enter-breach"]');
    enterBtn?.addEventListener('click', () => {
      const snap = this.state.getRiftWindowSnapshot();
      if (!snap.isOpen) return;
      audio.playSfx('ui-open');
      this.breachActive = true;
      this.coreChargePct = 0;
      this.seedInitialCells(snap.anomaly.id);
      this.onRender();
    });

    const exitBtn = root.querySelector<HTMLElement>('[data-rift-action="exit-breach"]');
    exitBtn?.addEventListener('click', () => {
      audio.playSfx('ui-tab');
      this.breachActive = false;
      this.onRender();
    });

    const passBtn = root.querySelector<HTMLElement>('[data-rift-action="buy-pass"]');
    passBtn?.addEventListener('click', () => {
      const res = this.state.buyRiftPass();
      if (res === 'bought') {
        audio.playSfx('rare-fanfare', { volume: 0.7 });
        this.onToast('Rift Gate Forced Open for 15 minutes!');
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
          this.onToast(`Need ${RIFT_SHARD_PITY_COST} Rift Shards!`);
        }
      });
    });

    root.querySelectorAll<HTMLElement>('[data-rift-cell]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.riftCell);
        if (Number.isInteger(idx)) this.clickCell(idx, root);
      });
    });
  }
}
