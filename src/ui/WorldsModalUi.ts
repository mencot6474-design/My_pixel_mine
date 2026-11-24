import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import {
  getWorldById,
  getWorldResonanceScale,
  getWorldStarterChibiId,
  WORLD_RESONANCE_TIERS,
  WorldId,
  WORLDS,
} from '../game/GameData';
import { getChibiById } from '../game3d/ChibiCatalog';
import { GameState } from '../game/GameState';
import { fmtMoney } from '../game/NumberFormat';
import { ModalKind, renderModalShell, TW_CLOSE_BTN, TW_SHOP_MODAL_RESP } from './HudShared';

export class WorldsModalUi {
  private lastWorldsListHtml = '';
  private worldsSynergyInfoOpen = false;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onOpenModal: (kind: ModalKind) => void,
    private readonly onRequestRender: () => void,
    private readonly onFocusWorldTree: (wid: WorldId) => void
  ) {}

  public closeSynergyInfoModal(): void {
    this.worldsSynergyInfoOpen = false;
  }

  private buildWorldsListHtml(): string {
    return WORLDS.map((w, idx) => {
      const prevWorld = idx > 0 ? WORLDS[idx - 1] : null;
      const isActive = this.state.activeWorldId === w.id;
      const unlocked = this.state.isWorldUnlocked(w.id);
      const spent = this.state.getTreeSpentPoints(w.id);
      const maxPts = this.state.getTreeMaxPoints(w.id);
      const pct = maxPts > 0 ? Math.min(100, Math.round((spent / maxPts) * 100)) : 100;
      const unlockStatus = this.state.canUnlockWorld(w.id);
      const prevSpent = prevWorld ? this.state.getTreeSpentPoints(prevWorld.id) : 0;
      const prevMax = prevWorld ? this.state.getTreeMaxPoints(prevWorld.id) : 0;

      const cardBorder = isActive
        ? 'border-[#14111d] ring-[3px] ring-inset ring-[#4ade80]'
        : unlocked
          ? 'border-[#14111d] hover:border-[#0284c7]'
          : unlockStatus === 'ok'
            ? 'border-[#14111d] ring-[3px] ring-inset ring-[#facc15]'
            : 'border-[#14111d]';

      let ctaHtml = '';
      if (isActive) {
        ctaHtml = `<span class="relative z-[2] px-4 h-10 rounded-xl border-[2.5px] border-[#14111d] bg-[#bbf7d0] text-[#14532d] text-[14px] font-black inline-flex items-center justify-center shrink-0">Current World</span>`;
      } else if (unlocked) {
        ctaHtml = `<button class="relative z-[2] px-5 h-10 rounded-xl border-[2.5px] border-[#14111d] bg-[#38bdf8] text-[#14111d] text-[15px] font-black cursor-pointer hover:bg-[#7dd3fc] hover:scale-[0.97] hover:rotate-[1.2deg] active:scale-[0.94] transition-transform duration-150 shrink-0" data-teleport-world="${w.id}">Teleport</button>`;
      } else if (unlockStatus === 'ok') {
        ctaHtml = `<button class="relative z-[2] px-4 h-10 rounded-xl border-[2.5px] border-[#14111d] bg-[#4ade80] text-[#14111d] text-[14px] font-black cursor-pointer hover:bg-[#86efac] hover:scale-[0.97] hover:-rotate-[1.2deg] active:scale-[0.94] transition-transform duration-150 shrink-0" data-teleport-unlock="${w.id}">Unlock &amp; Teleport (${fmtMoney(w.unlockCost)})</button>`;
      } else if (unlockStatus === 'no-cash') {
        ctaHtml = `<button class="relative z-[2] px-4 h-10 rounded-xl border-[2.5px] border-[#14111d] bg-[#fef08a] text-[#14111d] text-[14px] font-black cursor-pointer hover:bg-[#fde047] shrink-0" data-teleport-unlock="${w.id}">Unlock (${fmtMoney(w.unlockCost)})</button>`;
      } else {
        ctaHtml = `<span class="relative z-[2] px-3.5 h-10 rounded-xl border-[2.5px] border-[#14111d] bg-[#fff8e7] text-[#334155] text-[12px] font-black inline-flex items-center justify-center shrink-0 text-center">Locked • Max ${prevWorld?.name ?? ''} (${prevSpent}/${prevMax})</span>`;
      }

      const imgClass = unlocked
        ? 'absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none transition-transform duration-300 group-hover:scale-[1.03]'
        : 'absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none brightness-[0.72] saturate-[0.78]';

      return `
        <div class="group relative overflow-hidden rounded-xl border-[3px] ${cardBorder} min-h-[104px] px-4 py-3.5 flex items-center justify-between gap-3 @max-[680px]:flex-col @max-[680px]:items-stretch">
          <img src="${assetUrl(`/worlds/${w.id}.webp`)}" alt="${w.name}" class="${imgClass}" onerror="this.style.display='none'" />
          <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,17,29,0.88)_0%,rgba(20,17,29,0.58)_52%,rgba(20,17,29,0.28)_100%)] pointer-events-none"></div>
          <div class="relative z-[2] min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="mam-pill-xs rounded-md bg-[#fde047] border-[1.5px] border-[#14111d] text-[10px] uppercase tracking-wider text-[#14111d]">World ${idx + 1}</span>
              <span class="text-[20px] font-black text-white leading-tight mam-outline">${w.name}</span>
            </div>
            <div class="mt-2 flex items-center gap-2.5 flex-wrap">
              <div class="relative flex-1 min-w-[160px] max-w-[220px] h-5 rounded-full bg-[#fff8e7] border-2 border-[#14111d] overflow-hidden flex items-center justify-center">
                <div class="absolute left-0 top-0 bottom-0 bg-[#38bdf8] transition-[width] duration-200" style="width:${pct}%"></div>
                <span class="relative z-[2] text-[10px] font-black text-[#14111d] leading-none">Research ${spent}/${maxPts}</span>
              </div>
              ${!unlocked && w.unlockCost > 0 ? `<span class="mam-pill-xs rounded-md bg-[#fff8e7] border-[1.5px] border-[#14111d] text-[10.5px] text-[#14111d] tabular-nums">Cost: ${fmtMoney(w.unlockCost)}</span>` : ''}
            </div>
          </div>
          ${ctaHtml}
        </div>
      `;
    }).join('');
  }

  private renderWorldsSynergyInfoOverlay(): string {
    if (!this.worldsSynergyInfoOpen) return '';
    const activeResonances = this.state.getActiveWorldResonances();
    const totalOrePct = Math.round(
      activeResonances.reduce((sum, r) => sum + r.tier.oreDropBonusPct, 0) * 100
    );
    const totalSellPct = Math.round(
      activeResonances.reduce((sum, r) => sum + r.tier.sellBonusPct, 0) * 100
    );
    const totalGemPct = Math.round(
      activeResonances.reduce((sum, r) => sum + r.tier.gemBonusPct, 0) * 100
    );

    const activeHtml = activeResonances.length
      ? `
        <div class="flex flex-col gap-1.5">
          ${activeResonances
            .map((r) => {
              const wDef = getWorldById(r.worldId);
              const dmgPct = Math.round(r.tier.dmgBonusPct * 100);
              const orePct = Math.round(r.tier.oreDropBonusPct * 100);
              const sellPct = Math.round(r.tier.sellBonusPct * 100);
              const gemPct = Math.round(r.tier.gemBonusPct * 100);
              return `
                <div class="px-2.5 py-2 rounded-xl bg-white border-2 border-[#14111d] flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-3 h-3 rounded-full border-[1.5px] border-[#14111d] shrink-0" style="background:${wDef.iconColor}"></span>
                    <span class="text-[12.5px] font-black text-[#14111d] truncate">${r.worldName}</span>
                    <span class="mam-pill-xs rounded-md bg-[#14111d] text-[#fde047] text-[10px] tabular-nums">${r.count}/5 • ${r.worldScale}×</span>
                  </div>
                  <div class="flex items-center gap-1 text-[10px] font-black tabular-nums flex-wrap">
                    <span class="mam-pill-xs rounded bg-[#fee2e2] border border-[#14111d] text-[#dc2626]">+${dmgPct}% DMG</span>
                    <span class="mam-pill-xs rounded bg-[#fef08a] border border-[#14111d] text-[#b45309]">+${orePct}% Ore</span>
                    <span class="mam-pill-xs rounded bg-[#dcfce7] border border-[#14111d] text-[#15803d]">+${sellPct}% Sell</span>
                    ${gemPct > 0 ? `<span class="mam-pill-xs rounded bg-[#f3e8ff] border border-[#14111d] text-[#7e22ce]">+${gemPct}% Gem</span>` : ''}
                  </div>
                </div>
              `;
            })
            .join('')}
          <div class="px-2.5 py-1.5 rounded-xl bg-[#fcecc8] border-2 border-[#14111d] flex items-center justify-between gap-2 flex-wrap text-[11px] font-black tabular-nums">
            <span class="text-[#14111d]">Total Global Combo Buff:</span>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[#b45309]">+${totalOrePct}% Ore Drop</span>
              <span class="text-[#5b526e]">•</span>
              <span class="text-[#15803d]">+${totalSellPct}% Ore Sell</span>
              ${totalGemPct > 0 ? `<span class="text-[#5b526e]">•</span><span class="text-[#7e22ce]">+${totalGemPct}% Gem</span>` : ''}
            </div>
          </div>
        </div>
      `
      : `<div class="px-3 py-2.5 rounded-xl bg-white border-2 border-dashed border-[#14111d]/45 text-[12px] font-bold text-[#5b526e] text-center">No World Synergy active yet — place 2+ Chibis from the same World on your Mine Plots!</div>`;

    const tiersHtml = WORLD_RESONANCE_TIERS.map((t) => {
      const dmg = Math.round(t.dmgBonusPct * 100);
      const ore = Math.round(t.oreDropBonusPct * 100);
      const sell = Math.round(t.sellBonusPct * 100);
      const gem = Math.round(t.gemBonusPct * 100);
      return `
        <div class="px-2.5 py-2 rounded-xl bg-white border-2 border-[#14111d] flex flex-col gap-1">
          <div class="flex items-center justify-between gap-1.5">
            <span class="text-[12px] font-black text-[#14111d]">${t.label}</span>
            <span class="mam-pill-xs rounded-md bg-[#ede9fe] border border-[#14111d] text-[#6d28d9] text-[10px] tabular-nums">${t.minCount}/5 Same World</span>
          </div>
          <div class="flex items-center gap-1 flex-wrap text-[10px] font-black tabular-nums">
            <span class="mam-pill-xs rounded bg-[#fee2e2] border border-[#14111d] text-[#dc2626]">+${dmg}% DMG</span>
            <span class="mam-pill-xs rounded bg-[#fef08a] border border-[#14111d] text-[#b45309]">+${ore}% Ore</span>
            <span class="mam-pill-xs rounded bg-[#dcfce7] border border-[#14111d] text-[#15803d]">+${sell}% Sell</span>
            ${gem > 0 ? `<span class="mam-pill-xs rounded bg-[#f3e8ff] border border-[#14111d] text-[#7e22ce]">+${gem}% Gem</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const fullTier = WORLD_RESONANCE_TIERS[WORLD_RESONANCE_TIERS.length - 1];
    const worldScaleRowsHtml = WORLDS.map((w, idx) => {
      const scale = getWorldResonanceScale(w.id);
      const fullDmg = Math.round(fullTier.dmgBonusPct * scale * 100);
      const fullOre = Math.round(fullTier.oreDropBonusPct * scale * 100);
      const fullSell = Math.round(fullTier.sellBonusPct * scale * 100);
      const fullGem = Math.round(fullTier.gemBonusPct * scale * 100);
      return `
        <div class="px-2.5 py-1.5 rounded-xl bg-white border-2 border-[#14111d] flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="mam-pill-xs rounded bg-[#fde047] border border-[#14111d] text-[9.5px] text-[#14111d] tabular-nums">W${idx + 1}</span>
            <span class="text-[12px] font-black text-[#14111d] truncate">${w.name}</span>
            <span class="mam-pill-xs rounded bg-[#e0f2fe] border border-[#14111d] text-[#0369a1] text-[10px] tabular-nums">${scale.toFixed(1)}×</span>
          </div>
          <div class="text-[10.5px] font-black tabular-nums text-[#334155]">
            5/5 Max: <span class="text-[#dc2626]">+${fullDmg}% DMG</span> • <span class="text-[#b45309]">+${fullOre}% Ore</span> • <span class="text-[#15803d]">+${fullSell}% Sell</span> • <span class="text-[#7e22ce]">+${fullGem}% Gem</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="absolute inset-0 z-50 flex items-center justify-center bg-[#14111d]/64 p-3 pointer-events-auto" data-action="worlds-synergy-close" role="dialog" aria-modal="true" aria-label="World Synergy Combo">
        <div class="w-[min(640px,100%)] max-h-[min(590px,calc(100vh-24px))] rounded-2xl border-[3.5px] border-[#14111d] bg-[#fff8e7] text-[#14111d] p-4 flex flex-col gap-3 min-h-0" data-synergy-info-dialog="true" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between gap-2 shrink-0">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#ede9fe] border-[2.5px] border-[#14111d]">
              <span class="text-[15px] leading-none text-[#7c3aed]">✦</span>
              <span class="text-[16px] font-black text-[#14111d]">World Synergy Combo</span>
            </div>
            <button type="button" class="${TW_CLOSE_BTN}" data-action="worlds-synergy-close" aria-label="Close Synergy Info">✕</button>
          </div>

          <div class="text-[12.5px] font-bold text-[#334155] leading-snug shrink-0">
            Deploy <b class="text-[#14111d]">2–5 Chibis</b> from the same World on your Mine Plots to trigger a <b class="text-[#6d28d9]">World Synergy</b>! Higher Worlds &amp; bigger combos grant stronger <b class="text-[#dc2626]">DMG</b>, <b class="text-[#b45309]">Ore Drop</b>, <b class="text-[#15803d]">Ore Sell</b> &amp; <b class="text-[#7e22ce]">Gem</b> buffs—and multiple active Worlds stack globally.
          </div>

          <div class="flex flex-col gap-3 overflow-y-auto mam-no-scrollbar min-h-0 pr-0.5">
            <div class="flex flex-col gap-1.5">
              <div class="text-[11px] font-black uppercase tracking-wider text-[#5b526e]">Active On Your Plots (${activeResonances.length})</div>
              ${activeHtml}
            </div>

            <div class="flex flex-col gap-1.5">
              <div class="text-[11px] font-black uppercase tracking-wider text-[#5b526e]">Combo Tiers (Base World 1 • 1.0×)</div>
              <div class="grid grid-cols-2 @max-[560px]:grid-cols-1 gap-2">
                ${tiersHtml}
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <div class="text-[11px] font-black uppercase tracking-wider text-[#5b526e]">Higher World Multipliers (W1 → W6)</div>
              <div class="flex flex-col gap-1.5">
                ${worldScaleRowsHtml}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  public renderModal(): string {
    const rowsHtml = this.buildWorldsListHtml();
    this.lastWorldsListHtml = rowsHtml;
    const activeCount = this.state.getActiveWorldResonances().length;

    const worldIconSvg = `
      <svg viewBox="0 0 32 32" width="22" height="22" class="shrink-0" aria-hidden="true">
        <defs>
          <radialGradient id="mam-wtp-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="32%" stop-color="#67e8f9"/>
            <stop offset="68%" stop-color="#6366f1"/>
            <stop offset="100%" stop-color="#1e1b4b"/>
          </radialGradient>
          <linearGradient id="mam-wtp-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e0f2fe"/>
            <stop offset="50%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#c084fc"/>
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#mam-wtp-core)" stroke="url(#mam-wtp-ring)" stroke-width="2.4"/>
        <ellipse cx="16" cy="16" rx="12" ry="5.4" transform="rotate(-26 16 16)" fill="none" stroke="#bae6fd" stroke-width="1.8"/>
        <ellipse cx="16" cy="16" rx="11" ry="4.4" transform="rotate(34 16 16)" fill="none" stroke="#e879f9" stroke-width="1.4" opacity="0.9"/>
        <path d="M16 7.5L17.9 14.1L24.5 16L17.9 17.9L16 24.5L14.1 17.9L7.5 16L14.1 14.1Z" fill="#ffffff"/>
        <circle cx="25.5" cy="7.5" r="1.7" fill="#fde047"/>
        <circle cx="6.5" cy="24.5" r="1.3" fill="#67e8f9"/>
      </svg>
    `;

    return `
      ${renderModalShell({
        title: 'World Teleport',
        theme: 'worlds',
        iconHtml: worldIconSvg,
        boxClass: `w-[740px] ${TW_SHOP_MODAL_RESP}`,
        headerExtraHtml: `
          <div class="w-full flex items-center justify-between gap-2 flex-wrap">
            <div class="inline-flex items-center gap-1.5">
              <button type="button" class="w-7 h-7 rounded-full border-2 border-[#14111d] bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#14111d] text-[14px] font-black italic font-serif inline-flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95" data-action="worlds-synergy-info" title="World Synergy Combo Info" aria-label="World Synergy Combo Info">i</button>
              <span class="inline-flex items-center gap-1.5 text-[12px] font-black text-[#5b526e]">Combo Synergy${activeCount > 0 ? `<span class="mam-pill-xs rounded-full bg-[#ede9fe] border border-[#14111d] text-[#6d28d9] text-[10px] tabular-nums">${activeCount} Active</span>` : ''}</span>
            </div>
            <div class="mam-pill-lg rounded-full bg-[#fef08a] border-2 border-[#14111d] text-[14.5px] text-[#14111d] tabular-nums mr-1" data-worlds-cash="true">${fmtMoney(this.state.cash)}</div>
          </div>
        `,
        bodyHtml: `
          <div class="text-[13px] font-bold text-[#334155] -mt-1">Complete 100% of your current World's Research to unlock the next World. Core Research stays active across all Worlds.</div>
          <div class="flex flex-col gap-2.5 overflow-x-hidden overflow-y-auto mam-no-scrollbar flex-1 min-h-0 px-1 py-0.5" data-worlds-list="true">
            ${rowsHtml}
          </div>
        `,
      })}
      ${this.renderWorldsSynergyInfoOverlay()}
    `;
  }

  public bindEvents(root: HTMLElement, scope: ParentNode = root): void {
    scope.querySelectorAll('[data-action="worlds-synergy-info"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.playSfx('ui-open');
        this.worldsSynergyInfoOpen = true;
        this.onRequestRender();
      });
    });

    scope.querySelectorAll('[data-action="worlds-synergy-close"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.playSfx('ui-close');
        this.worldsSynergyInfoOpen = false;
        this.onRequestRender();
      });
    });

    scope.querySelectorAll('[data-teleport-world]').forEach((el) => {
      el.addEventListener('click', () => {
        const wid = (el as HTMLElement).dataset.teleportWorld as WorldId;
        if (!wid) return;
        if (this.state.setActiveWorld(wid)) {
          audio.playSfx('teleport');
          this.onFocusWorldTree(wid);
          this.onOpenModal('none');
          this.pushToast(`Teleported to ${getWorldById(wid).name}!`);
        } else {
          audio.playSfx('ui-error');
          this.pushToast('World is locked!');
        }
      });
    });

    scope.querySelectorAll('[data-teleport-unlock]').forEach((el) => {
      el.addEventListener('click', () => {
        const wid = (el as HTMLElement).dataset.teleportUnlock as WorldId;
        if (!wid) return;
        const wDef = getWorldById(wid);
        const status = this.state.canUnlockWorld(wid);
        if (status === 'ok') {
          if (this.state.unlockWorld(wid)) {
            audio.playSfx('unlock');
            this.state.setActiveWorld(wid);
            this.onFocusWorldTree(wid);
            this.onOpenModal('none');
            const starterId = getWorldStarterChibiId(wid);
            const starterName = starterId ? getChibiById(starterId)?.name : undefined;
            this.pushToast(
              starterName
                ? `Unlocked ${wDef.name}! Starter Chibi gained: ${starterName}`
                : `Unlocked & Teleported to ${wDef.name}!`
            );
          }
        } else if (status === 'no-cash') {
          audio.playSfx('ui-error');
          this.pushToast(`Need ${fmtMoney(wDef.unlockCost)} Cash!`);
        } else if (status === 'locked-prereq') {
          audio.playSfx('ui-error');
          this.pushToast('Complete previous World research first!');
        } else if (status === 'unlocked') {
          audio.playSfx('teleport');
          this.state.setActiveWorld(wid);
          this.onOpenModal('none');
        }
      });
    });
  }

  public updateLive(root: HTMLElement): void {
    const cashEl = root.querySelector<HTMLElement>('[data-worlds-cash="true"]');
    if (cashEl) cashEl.textContent = fmtMoney(this.state.cash);

    const listEl = root.querySelector<HTMLElement>('[data-worlds-list="true"]');
    if (!listEl) return;
    const nextHtml = this.buildWorldsListHtml();
    if (nextHtml === this.lastWorldsListHtml) return;
    this.lastWorldsListHtml = nextHtml;
    listEl.innerHTML = nextHtml;
    this.bindEvents(root, listEl);
  }
}
