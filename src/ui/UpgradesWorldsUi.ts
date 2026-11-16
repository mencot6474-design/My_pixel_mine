import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { getWorldById, getWorldIndex, WorldId, WORLDS } from '../game/GameData';
import {
  formatNodeEffectLine,
  getNodeNextCost,
  getResearchNodeById,
  getResearchNodesForTree,
  RESEARCH_TREE_META,
  ResearchTreeId,
} from '../game/ResearchData';
import { GameState } from '../game/GameState';
import { fmtMoney } from '../game/NumberFormat';
import { hudIconHtml, researchIconHtml } from './HudIcons';
import { ModalKind, renderModalShell, TW_CLOSE_BTN, TW_SHOP_BUY_BTN, TW_SHOP_MODAL_RESP } from './HudShared';

export class UpgradesWorldsUi {
  private researchTab: ResearchTreeId = 'underground';
  private selectedResearchNodeId: string | null = 'ug-deposits-1';
  private lastUpgradesStateKey = '';
  private lastWorldsListHtml = '';
  private animateNodeSelectId: string | null = null;
  private animateResearchTabId: ResearchTreeId | null = null;
  private animateUpgradeBurstId: string | null = null;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onOpenModal: (kind: ModalKind) => void,
    private readonly onRequestRender: () => void
  ) {}

  public syncActiveWorldTab(): void {
    this.researchTab = this.state.activeWorldId;
  }

  private focusWorldTree(wid: WorldId): void {
    this.researchTab = wid;
    this.selectedResearchNodeId = getResearchNodesForTree(wid)[0]?.id ?? null;
  }

  private getSelectedNodeForTab(treeId: ResearchTreeId) {
    const nodes = getResearchNodesForTree(treeId);
    const existing = this.selectedResearchNodeId ? getResearchNodeById(this.selectedResearchNodeId) : undefined;
    if (existing && existing.treeId === treeId) return existing;
    return nodes[0];
  }

  private getUpgradesStateKey(): string {
    const nodes = getResearchNodesForTree(this.researchTab);
    const affordableKey = nodes
      .map((n) => `${n.id}:${this.state.getResearchLevel(n.id)}:${this.state.canUpgradeResearch(n.id)}`)
      .join(',');
    const worldKey = WORLDS.map((w) => `${w.id}:${this.state.isWorldUnlocked(w.id)}:${this.state.canUnlockWorld(w.id)}`).join(',');
    return `${this.researchTab}|${this.selectedResearchNodeId ?? ''}|${this.state.activeWorldId}|${affordableKey}|${worldKey}`;
  }

  public renderUpgradesModal(): string {
    this.lastUpgradesStateKey = this.getUpgradesStateKey();
    const animNodeSelectId = this.animateNodeSelectId;
    const animTabId = this.animateResearchTabId;
    const animUpgradeId = this.animateUpgradeBurstId;
    this.animateNodeSelectId = null;
    this.animateResearchTabId = null;
    this.animateUpgradeBurstId = null;

    const tabMeta = RESEARCH_TREE_META[this.researchTab];
    const isCore = this.researchTab === 'core';
    const tabColor = isCore ? '#38bdf8' : getWorldById(this.researchTab as WorldId).iconColor;
    const nodes = getResearchNodesForTree(this.researchTab);
    const selNode = this.getSelectedNodeForTab(this.researchTab);
    this.selectedResearchNodeId = selNode?.id ?? null;

    const coreSpent = this.state.getTreeSpentPoints('core');
    const coreMax = this.state.getTreeMaxPoints('core');
    const coreActiveCls = this.researchTab === 'core' ? 'ring-2 ring-[#38bdf8] border-[#38bdf8]' : 'border-[#334155]';

    const worldSidebarCards = WORLDS.map((w, idx) => {
      const unlocked = this.state.isWorldUnlocked(w.id);
      const isActiveWorld = this.state.activeWorldId === w.id;
      const isSelectedTab = this.researchTab === w.id;
      const spent = this.state.getTreeSpentPoints(w.id);
      const maxPts = this.state.getTreeMaxPoints(w.id);
      const complete = this.state.isTreeComplete(w.id);
      const unlockStatus = this.state.canUnlockWorld(w.id);
      const prevWorld = idx > 0 ? WORLDS[idx - 1] : null;
      const prevMax = prevWorld ? this.state.getTreeMaxPoints(prevWorld.id) : 0;

      const borderCls = isSelectedTab
        ? 'ring-2 ring-[#38bdf8] border-[#38bdf8]'
        : unlocked
          ? 'border-[#334155]'
          : 'border-[#1e293b] opacity-85';

      let footerHtml = '';
      if (isActiveWorld) {
        footerHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[rgba(34,197,94,0.22)] border border-[#4ade80]/60 text-[10px] font-black text-[#4ade80]">ACTIVE WORLD${complete ? ' • FULL' : ''}</span>`;
      } else if (unlocked) {
        footerHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded bg-[rgba(148,163,184,0.16)] border border-[#94a3b8]/45 text-[10px] font-black text-[#cbd5e1]">UNLOCKED${complete ? ' • FULL' : ''}</span>`;
      } else if (unlockStatus === 'ok' || unlockStatus === 'no-cash') {
        footerHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded bg-[rgba(250,204,21,0.16)] border border-[#facc15]/50 text-[10px] font-black text-[#fde047]">Ready in Teleport</span>`;
      } else {
        footerHtml = `<span class="text-[10px] font-bold text-[#94a3b8]">Need ${prevWorld?.name ?? ''} (${prevMax}/${prevMax})</span>`;
      }

      return `
        <div class="relative rounded-xl border-2 ${borderCls} ${animTabId === w.id ? 'mam-pop-click' : ''} bg-[linear-gradient(180deg,rgba(30,41,59,0.94)_0%,rgba(15,23,42,0.97)_100%)] p-2.5 flex flex-col items-center gap-1 cursor-pointer transition-[transform,filter,box-shadow] duration-[120ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.96] active:brightness-95" data-research-tab="${w.id}">
          <div class="flex items-center gap-1.5 text-[14px] font-black text-white mam-outline-sm">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${w.iconColor};box-shadow:0 0 8px ${w.iconColor}"></span>
            <span>${w.name}</span>
          </div>
          <div class="text-[12px] font-extrabold text-[#cbd5e1] mam-outline-sm">Research ${spent}/${maxPts}</div>
          <div class="mt-0.5">${footerHtml}</div>
        </div>
      `;
    }).join('');

    const cellW = 88;
    const cellH = 88;
    const nodeSize = 62;
    const padX = 18;
    const padY = 14;
    const maxCol = nodes.reduce((m, n) => Math.max(m, n.col), 0);
    const maxRow = nodes.reduce((m, n) => Math.max(m, n.row), 0);
    const canvasW = (maxCol + 1) * cellW + padX * 2;
    const canvasH = (maxRow + 1) * cellH + padY * 2;

    const nodeCenter = (row: number, col: number) => ({
      x: padX + col * cellW + cellW / 2,
      y: padY + row * cellH + cellH / 2,
    });

    const edgesSvg = nodes
      .flatMap((n) =>
        n.requires.map((reqId) => {
          const parent = getResearchNodeById(reqId);
          if (!parent) return '';
          const p1 = nodeCenter(parent.row, parent.col);
          const p2 = nodeCenter(n.row, n.col);
          const midY = Math.round((p1.y + p2.y) / 2);
          const unlocked = this.state.getResearchLevel(reqId) >= 1;
          const stroke = unlocked ? '#67e8f9' : '#334155';
          const opacity = unlocked ? '0.95' : '0.7';
          return `<path d="M ${p1.x} ${p1.y} V ${midY} H ${p2.x} V ${p2.y}" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />`;
        })
      )
      .join('');

    const nodesHtml = nodes
      .map((n) => {
        const c = nodeCenter(n.row, n.col);
        const left = Math.round(c.x - nodeSize / 2);
        const top = Math.round(c.y - nodeSize / 2);
        const lvl = this.state.getResearchLevel(n.id);
        const maxed = lvl >= n.maxLevel;
        const status = this.state.canUpgradeResearch(n.id);
        const selected = selNode?.id === n.id;

        const isLocked = status === 'locked-world' || status === 'locked-prereq';
        const cardStyle = maxed
          ? 'border-[#14532d] bg-[linear-gradient(180deg,#4ade80_0%,#16c64f_55%,#15803d_100%)] shadow-[0_4px_0_#14532d,0_6px_14px_rgba(0,0,0,0.45)]'
          : isLocked
            ? 'border-[#263142] bg-[#131923] shadow-[0_4px_0_#090d14]'
            : 'border-[#15803d] bg-[linear-gradient(180deg,#334155_0%,#1e293b_100%)] shadow-[0_4px_0_#0f172a,0_6px_12px_rgba(0,0,0,0.4)]';
        const ringCls = selected ? 'ring-[3px] ring-[#7dd3fc] scale-[1.06]' : '';
        const nodeAnimCls =
          animUpgradeId === n.id
            ? 'mam-upgrade-pop'
            : animNodeSelectId === n.id
              ? selected
                ? 'mam-pop-selected'
                : 'mam-pop-click'
              : '';
        const badgeCls = isLocked
          ? 'bg-[#0b101b] border-[#334155] text-[#94a3b8]'
          : 'bg-[#0f172a] border-white/25 text-white';

        return `
          <button
            class="absolute z-[2] rounded-[10px] border-[2.5px] ${cardStyle} ${ringCls} ${nodeAnimCls} flex flex-col items-center justify-center p-1 cursor-pointer transition-[transform,filter,box-shadow] duration-[120ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.07] hover:brightness-110 active:translate-y-0.5 active:scale-[0.92] active:brightness-95"
            style="left:${left}px;top:${top}px;width:${nodeSize}px;height:${nodeSize}px"
            data-research-node="${n.id}"
            title="${n.name} (${lvl}/${n.maxLevel})"
          >
            ${animUpgradeId === n.id ? '<span class="mam-upgrade-ring"></span>' : ''}
            ${status === 'ok' ? '<span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#4ade80] border-2 border-[#0f172a] shadow-[0_0_8px_#4ade80]"></span>' : ''}
            <div class="pointer-events-none flex items-center justify-center ${isLocked ? 'opacity-45 saturate-50' : ''}">${researchIconHtml(n.icon, 34, tabColor)}</div>
            <span class="absolute -bottom-2 px-1.5 py-[1px] rounded border ${badgeCls} text-[10px] font-black leading-tight mam-outline-sm">${lvl}/${n.maxLevel}</span>
          </button>
        `;
      })
      .join('');

    let inspectorHtml = '';
    if (selNode) {
      const lvl = this.state.getResearchLevel(selNode.id);
      const maxLvl = selNode.maxLevel;
      const pct = Math.round((lvl / Math.max(1, maxLvl)) * 100);
      const status = this.state.canUpgradeResearch(selNode.id);
      const cost = getNodeNextCost(selNode, lvl);
      const reqNames = selNode.requires.map((id) => getResearchNodeById(id)?.name ?? id).join(', ');
      const worldIdIfWorld = selNode.treeId === 'core' ? null : (selNode.treeId as WorldId);
      const isWorldInactive = Boolean(worldIdIfWorld && worldIdIfWorld !== this.state.activeWorldId);

      const scopePill = isCore
        ? `<span class="px-2.5 py-0.5 rounded-full bg-[rgba(56,189,248,0.18)] border border-[#38bdf8]/50 text-[11px] font-black text-[#7dd3fc]">Global • Active in All Worlds</span>`
        : isWorldInactive
          ? `<span class="px-2.5 py-0.5 rounded-full bg-[rgba(244,63,94,0.16)] border border-[#fb7185]/45 text-[11px] font-black text-[#fda4af]">Isolated • Only Active in ${tabMeta.title}</span>`
          : `<span class="px-2.5 py-0.5 rounded-full bg-[rgba(74,222,128,0.18)] border border-[#4ade80]/50 text-[11px] font-black text-[#4ade80]">Isolated • Active in ${tabMeta.title}</span>`;

      let actionBtnHtml = '';
      if (status === 'maxed') {
        actionBtnHtml = `<button class="w-full h-11 rounded-xl border border-[#facc15]/50 bg-[rgba(250,204,21,0.14)] text-[#fde047] text-[16px] font-black cursor-default" data-research-locked-btn="true">Maxed Out</button>`;
      } else if (status === 'locked-world') {
        const wDef = getWorldById(selNode.treeId as WorldId);
        const wUnlock = this.state.canUnlockWorld(wDef.id);
        if (wUnlock === 'ok' || wUnlock === 'no-cash') {
          actionBtnHtml = `<button class="mam-sheen-hover relative overflow-hidden w-full h-11 rounded-xl border border-[#38bdf8]/60 bg-[linear-gradient(135deg,#38bdf8_0%,#0284c7_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_16px_-2px_rgba(56,189,248,0.4)] text-white text-[14px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:scale-95" data-open-teleport="true">Unlock in Teleport (${fmtMoney(wDef.unlockCost)})</button>`;
        } else {
          const prevW = WORLDS[Math.max(0, getWorldIndex(wDef.id) - 1)];
          actionBtnHtml = `<button class="w-full h-11 rounded-xl border border-white/15 bg-white/[0.05] text-[#94a3b8] text-[13px] font-bold cursor-pointer transition-transform duration-100 active:scale-[0.96]" data-research-locked-btn="true">Complete ${prevW.name} First</button>`;
        }
      } else if (status === 'locked-prereq') {
        actionBtnHtml = `<button class="w-full h-11 rounded-xl border border-white/15 bg-white/[0.05] text-[#94a3b8] text-[13px] font-bold cursor-pointer transition-transform duration-100 active:scale-[0.96]" data-research-locked-btn="true">Need ${reqNames}</button>`;
      } else if (status === 'no-cash') {
        actionBtnHtml = `<button class="${TW_SHOP_BUY_BTN} disabled !h-11 !text-[16px]" data-upgrade-node="${selNode.id}">${fmtMoney(cost)}</button>`;
      } else {
        actionBtnHtml = `<button class="${TW_SHOP_BUY_BTN} ${animUpgradeId === selNode.id ? 'mam-pop-click' : ''} !h-11 !text-[17px]" data-upgrade-node="${selNode.id}">Upgrade • ${fmtMoney(cost)}</button>`;
      }

      const inspIconAnim =
        animUpgradeId === selNode.id ? 'mam-upgrade-pop' : animNodeSelectId === selNode.id ? 'mam-pop-click' : '';

      inspectorHtml = `
        <div class="flex items-center justify-center p-2 ${inspIconAnim}">${researchIconHtml(selNode.icon, 68, tabColor)}</div>
        <div class="text-[22px] font-black text-white leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">${selNode.name}</div>
        ${scopePill}
        <div class="relative w-full h-6 rounded-full bg-white/[0.06] border border-[#38bdf8]/45 overflow-hidden flex items-center justify-center mt-0.5">
          <div class="absolute left-0 top-0 bottom-0 bg-[linear-gradient(90deg,#38bdf8,#22d3ee)] transition-[width] duration-200" style="width:${pct}%"></div>
          <span class="relative z-[2] text-[12px] font-black text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">${lvl}/${maxLvl}</span>
        </div>
        <div class="text-[15px] font-black text-[#4ade80]">${lvl > 0 ? formatNodeEffectLine(selNode, lvl) : `Next: ${formatNodeEffectLine(selNode, 1)}`}</div>
        ${lvl > 0 && lvl < maxLvl ? `<div class="text-[12px] font-extrabold text-[#7dd3fc]">Next Lv: ${formatNodeEffectLine(selNode, lvl + 1)}</div>` : ''}
        <div class="text-[12px] font-medium text-[#cbd5e1] leading-snug">${selNode.descTemplate}</div>
        <div class="w-full mt-1">${actionBtnHtml}</div>
      `;
    }

    const activeIdx = getWorldIndex(this.state.activeWorldId);
    const nextWorld = activeIdx >= 0 && activeIdx < WORLDS.length - 1 ? WORLDS[activeIdx + 1] : null;
    const nextWorldCta =
      nextWorld && !this.state.isWorldUnlocked(nextWorld.id) && this.state.isTreeComplete(this.state.activeWorldId)
        ? `<button class="mam-sheen-hover relative overflow-hidden h-9 px-4 rounded-xl border border-[#38bdf8]/60 bg-[linear-gradient(135deg,#38bdf8_0%,#0284c7_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_-2px_rgba(56,189,248,0.45)] text-white text-[13px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:scale-95" data-open-teleport="true">Open Teleport (${nextWorld.name})</button>`
        : '';

    return `
      <div class="fixed inset-0 z-40 bg-[rgba(4,7,15,0.58)] backdrop-blur-[5px] flex items-center justify-center p-3 pt-7 @max-[720px]:p-2 @max-[720px]:pt-6 pointer-events-auto" data-backdrop="true" data-upgrades-shell="true">
        <div class="mam-modal w-[min(1180px,100%)] h-[min(740px,calc(100%-14px))] flex flex-col pt-3 px-4 pb-3.5 gap-2.5 @max-[720px]:px-2.5 @max-[720px]:pb-2.5" data-modal-theme="upgrades" role="dialog" aria-modal="true" aria-label="Upgrades">
          <div class="mam-modal-surface" aria-hidden="true"></div>
          <div class="mam-modal-rails" aria-hidden="true">
            <span class="mam-rail-stud is-tl"></span>
            <span class="mam-rail-stud is-tr"></span>
            <span class="mam-rail-stud is-bl"></span>
            <span class="mam-rail-stud is-br"></span>
          </div>
          <div class="mam-modal-rail-head">
            <div class="mam-title-plaque">
              <span class="mam-title-plaque-icon shrink-0 [&>img]:w-5 [&>img]:h-5">${hudIconHtml('hourglass', 22, 'Upgrades')}</span>
              <span>Upgrades</span>
            </div>
            <button class="${TW_CLOSE_BTN} mam-close-rail-btn" data-action="close-modal" aria-label="Close Upgrades">✕</button>
          </div>
          <div class="flex items-center justify-end gap-3 flex-wrap w-full">
            <div class="text-[20px] font-black text-[#facc15] [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]" data-upgrades-cash="true">${fmtMoney(this.state.cash)}</div>
            ${nextWorldCta}
          </div>
          <div class="flex-1 min-h-0 flex items-stretch gap-3 @max-[920px]:flex-col @max-[920px]:overflow-x-hidden @max-[920px]:overflow-y-auto mam-no-scrollbar">
            <div class="w-[216px] @max-[920px]:w-full @max-[920px]:grid @max-[920px]:grid-cols-3 @max-[560px]:grid-cols-2 shrink-0 flex flex-col gap-2 overflow-x-hidden overflow-y-auto mam-no-scrollbar px-2 py-1">
              <div class="relative rounded-xl border ${coreActiveCls} ${animTabId === 'core' ? 'mam-pop-click' : ''} bg-white/[0.05] p-2.5 flex flex-col items-center gap-1 cursor-pointer transition-[transform,filter,background-color] duration-150 hover:bg-white/[0.09] active:scale-[0.97]" data-research-tab="core">
                <div class="flex items-center gap-1.5 text-[15px] font-black text-white">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]"></span>
                  <span>Core</span>
                </div>
                <div class="text-[12px] font-bold text-[#cbd5e1]">Research ${coreSpent}/${coreMax}</div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-[rgba(56,189,248,0.16)] border border-[#38bdf8]/45 text-[10px] font-black text-[#7dd3fc]">Global • All Worlds</span>
              </div>
              ${worldSidebarCards}
            </div>

            <div class="mam-inspector-well flex-1 min-w-0 min-h-0 rounded-xl flex items-center justify-center overflow-auto mam-no-scrollbar">
              <div class="relative shrink-0" style="width:${canvasW}px;height:${canvasH}px">
                <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 ${canvasW} ${canvasH}">
                  ${edgesSvg}
                </svg>
                ${nodesHtml}
              </div>
            </div>

            <div class="mam-inspector-well w-[258px] @max-[920px]:w-full shrink-0 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center overflow-x-hidden overflow-y-auto mam-no-scrollbar">
              ${inspectorHtml}
            </div>
          </div>
        </div>
      </div>
    `;
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
        ? 'border-[#4ade80] shadow-[0_0_18px_rgba(74,222,128,0.25)]'
        : unlocked
          ? 'border-white/25 hover:border-sky-400/75'
          : unlockStatus === 'ok'
            ? 'border-[#facc15] shadow-[0_0_16px_rgba(250,204,21,0.25)]'
            : 'border-white/15';

      let ctaHtml = '';
      if (isActive) {
        ctaHtml = `<span class="relative z-[2] px-4 h-10 rounded-lg border-2 border-[#14532d] bg-[rgba(15,40,26,0.88)] text-[#4ade80] text-[14px] font-black inline-flex items-center justify-center shrink-0 mam-outline-sm shadow-lg">Current World</span>`;
      } else if (unlocked) {
        ctaHtml = `<button class="relative z-[2] px-5 h-10 rounded-lg border-2 border-[#0369a1] bg-[linear-gradient(180deg,#38bdf8_0%,#0284c7_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.4),0_4px_0_#075985] text-white text-[15px] font-black cursor-pointer hover:brightness-110 active:translate-y-0.5 active:shadow-[0_1px_0_#075985] shrink-0 mam-outline-sm" data-teleport-world="${w.id}">Teleport</button>`;
      } else if (unlockStatus === 'ok') {
        ctaHtml = `<button class="relative z-[2] px-4 h-10 rounded-lg border-2 border-[#14532d] bg-[linear-gradient(180deg,#4ade80_0%,#16a34a_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.4),0_4px_0_#14532d] text-white text-[14px] font-black cursor-pointer hover:brightness-110 active:translate-y-0.5 active:shadow-[0_1px_0_#14532d] shrink-0 mam-outline-sm" data-teleport-unlock="${w.id}">Unlock &amp; Teleport (${fmtMoney(w.unlockCost)})</button>`;
      } else if (unlockStatus === 'no-cash') {
        ctaHtml = `<button class="relative z-[2] px-4 h-10 rounded-xl border border-purple-300/45 bg-[rgba(15,10,30,0.78)] text-[#e9d5ff] text-[14px] font-black cursor-pointer hover:bg-[rgba(30,20,55,0.9)] shrink-0 mam-outline-sm" data-teleport-unlock="${w.id}">Unlock (${fmtMoney(w.unlockCost)})</button>`;
      } else {
        ctaHtml = `<span class="relative z-[2] px-3.5 h-10 rounded-xl border border-white/20 bg-[rgba(8,6,18,0.78)] text-[#cbd5e1] text-[12px] font-bold inline-flex items-center justify-center shrink-0 text-center mam-outline-sm">Locked • Max ${prevWorld?.name ?? ''} (${prevSpent}/${prevMax})</span>`;
      }

      const imgClass = unlocked
        ? 'absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none transition-transform duration-300 group-hover:scale-[1.03]'
        : 'absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none brightness-[0.72] saturate-[0.78]';

      return `
        <div class="group relative overflow-hidden rounded-xl border-2 ${cardBorder} min-h-[104px] px-4 py-3.5 flex items-center justify-between gap-3 @max-[680px]:flex-col @max-[680px]:items-stretch">
          <img src="${assetUrl(`/worlds/${w.id}.jpg`)}" alt="${w.name}" class="${imgClass}" />
          <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,18,0.88)_0%,rgba(6,8,18,0.58)_52%,rgba(6,8,18,0.28)_100%)] pointer-events-none"></div>
          <div class="relative z-[2] min-w-0 flex-1">
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="text-[11px] font-black uppercase tracking-wider text-[#d8b4fe] mam-outline-sm">World ${idx + 1}</span>
              <span class="text-[20px] font-black text-white leading-tight mam-outline">${w.name}</span>
            </div>
            <div class="mt-2 flex items-center gap-2.5 flex-wrap">
              <div class="relative flex-1 min-w-[160px] max-w-[220px] h-4 rounded-full bg-[rgba(14,8,30,0.88)] border border-[#7e22ce] overflow-hidden flex items-center justify-center">
                <div class="absolute left-0 top-0 bottom-0 bg-[linear-gradient(90deg,#38bdf8,#22d3ee)] transition-[width] duration-200" style="width:${pct}%"></div>
                <span class="relative z-[2] text-[10px] font-black text-white mam-outline-sm">Research ${spent}/${maxPts}</span>
              </div>
              ${!unlocked && w.unlockCost > 0 ? `<span class="text-[12px] font-black text-[#facc15] mam-outline-sm">Cost: ${fmtMoney(w.unlockCost)}</span>` : ''}
            </div>
          </div>
          ${ctaHtml}
        </div>
      `;
    }).join('');
  }

  public renderWorldsModal(): string {
    const rowsHtml = this.buildWorldsListHtml();
    this.lastWorldsListHtml = rowsHtml;

    const worldIconSvg = `
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="#1e1b4b" stroke="#fde047" stroke-width="2"/>
        <ellipse cx="12" cy="12" rx="4.5" ry="7.5" fill="none" stroke="#67e8f9" stroke-width="2"/>
        <circle cx="12" cy="12" r="2.2" fill="#facc15"/>
      </svg>
    `;

    return renderModalShell({
      title: 'World Teleport',
      theme: 'worlds',
      iconHtml: worldIconSvg,
      boxClass: `w-[740px] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: `<div class="text-[20px] font-black text-[#facc15] mam-outline mr-1" data-worlds-cash="true">${fmtMoney(this.state.cash)}</div>`,
      bodyHtml: `
        <div class="text-[13px] font-bold text-[#e9d5ff] -mt-1">Complete 100% of your current World's Research to unlock the next World. Core Research stays active across all Worlds.</div>
        <div class="flex flex-col gap-2.5 overflow-x-hidden overflow-y-auto mam-no-scrollbar flex-1 min-h-0 px-1 py-0.5" data-worlds-list="true">
          ${rowsHtml}
        </div>
      `,
    });
  }

  public bindUpgradesEvents(root: HTMLElement, bindClose = false): void {
    const shell = root.querySelector<HTMLElement>('[data-upgrades-shell="true"]');
    if (!shell) return;

    if (bindClose) {
      shell.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) this.onOpenModal('none');
      });
      shell.querySelector('[data-action="close-modal"]')?.addEventListener('click', () => {
        this.onOpenModal('none');
      });
    }

    const triggerShake = (btn: HTMLElement) => {
      btn.classList.remove('mam-btn-shake');
      void btn.offsetWidth;
      btn.classList.add('mam-btn-shake');
      btn.addEventListener('animationend', () => btn.classList.remove('mam-btn-shake'), { once: true });
    };

    shell.querySelectorAll('[data-research-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        const nextTab = (el as HTMLElement).dataset.researchTab as ResearchTreeId;
        if (!nextTab) return;
        this.researchTab = nextTab;
        this.selectedResearchNodeId = getResearchNodesForTree(nextTab)[0]?.id ?? null;
        this.animateResearchTabId = nextTab;
        this.onRequestRender();
      });
    });

    shell.querySelectorAll('[data-research-node]').forEach((el) => {
      el.addEventListener('click', () => {
        const nodeId = (el as HTMLElement).dataset.researchNode;
        if (!nodeId) return;
        audio.playSfx('ui-tab');
        this.selectedResearchNodeId = nodeId;
        this.animateNodeSelectId = nodeId;
        this.onRequestRender();
      });
    });

    shell.querySelectorAll('[data-upgrade-node]').forEach((el) => {
      el.addEventListener('click', () => {
        const nodeId = (el as HTMLElement).dataset.upgradeNode;
        if (!nodeId) return;
        const status = this.state.canUpgradeResearch(nodeId);
        if (status === 'ok') {
          audio.playSfx('upgrade');
          this.animateUpgradeBurstId = nodeId;
          this.state.upgradeResearch(nodeId);
          if (this.animateUpgradeBurstId !== null) this.onRequestRender();
        } else {
          audio.playSfx('ui-error');
          triggerShake(el as HTMLElement);
          if (status === 'no-cash') {
            this.pushToast('Not enough Cash!');
          } else if (status === 'locked-world') {
            this.pushToast('Unlock this World first!');
          } else if (status === 'locked-prereq') {
            this.pushToast('Upgrade previous node first!');
          }
        }
      });
    });

    shell.querySelectorAll('[data-research-locked-btn]').forEach((el) => {
      el.addEventListener('click', () => {
        audio.playSfx('ui-error');
        triggerShake(el as HTMLElement);
      });
    });

    shell.querySelectorAll('[data-unlock-world]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const wid = (el as HTMLElement).dataset.unlockWorld as WorldId;
        if (!wid) return;
        const status = this.state.canUnlockWorld(wid);
        if (status === 'ok') {
          if (this.state.unlockWorld(wid)) {
            audio.playSfx('unlock');
            this.focusWorldTree(wid);
            this.pushToast(`Unlocked ${getWorldById(wid).name}!`);
            this.onRequestRender();
          }
        } else if (status === 'no-cash') {
          audio.playSfx('ui-error');
          this.pushToast(`Need ${fmtMoney(getWorldById(wid).unlockCost)} Cash!`);
        } else if (status === 'locked-prereq') {
          audio.playSfx('ui-error');
          const prevIdx = Math.max(0, getWorldIndex(wid) - 1);
          this.pushToast(`Max ${WORLDS[prevIdx].name} Research first!`);
        }
      });
    });

    shell.querySelectorAll('[data-open-teleport]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onOpenModal('worlds');
      });
    });

    shell.querySelectorAll('[data-travel-world]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const wid = (el as HTMLElement).dataset.travelWorld as WorldId;
        if (!wid) return;
        if (this.state.setActiveWorld(wid)) {
          audio.playSfx('teleport');
          this.focusWorldTree(wid);
          this.pushToast(`Traveled to ${getWorldById(wid).name}!`);
          this.onRequestRender();
        } else {
          audio.playSfx('ui-error');
          this.pushToast('World is locked!');
        }
      });
    });
  }

  public bindWorldsEvents(root: HTMLElement, scope: ParentNode = root): void {
    scope.querySelectorAll('[data-teleport-world]').forEach((el) => {
      el.addEventListener('click', () => {
        const wid = (el as HTMLElement).dataset.teleportWorld as WorldId;
        if (!wid) return;
        if (this.state.setActiveWorld(wid)) {
          audio.playSfx('teleport');
          this.focusWorldTree(wid);
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
            this.focusWorldTree(wid);
            this.onOpenModal('none');
            this.pushToast(`Unlocked & Teleported to ${wDef.name}!`);
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

  public updateWorldsModalLive(root: HTMLElement): void {
    const cashEl = root.querySelector<HTMLElement>('[data-worlds-cash="true"]');
    if (cashEl) cashEl.textContent = fmtMoney(this.state.cash);

    const listEl = root.querySelector<HTMLElement>('[data-worlds-list="true"]');
    if (!listEl) return;
    const nextHtml = this.buildWorldsListHtml();
    if (nextHtml === this.lastWorldsListHtml) return;
    this.lastWorldsListHtml = nextHtml;
    listEl.innerHTML = nextHtml;
    this.bindWorldsEvents(root, listEl);
  }

  public updateUpgradesLive(root: HTMLElement): void {
    const cashEl = root.querySelector<HTMLElement>('[data-upgrades-cash="true"]');
    if (cashEl) cashEl.textContent = fmtMoney(this.state.cash);

    const nextKey = this.getUpgradesStateKey();
    if (nextKey === this.lastUpgradesStateKey) return;

    const shell = root.querySelector<HTMLElement>('[data-upgrades-shell="true"]');
    if (!shell) return;
    shell.outerHTML = this.renderUpgradesModal();
    this.bindUpgradesEvents(root, true);
  }

  public updateUpgradesBadgeLive(root: HTMLElement): void {
    const badge = root.querySelector<HTMLElement>('[data-upgrades-badge="true"]');
    if (!badge) return;
    const count = this.state.getAffordableResearchCount();
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count <= 0);
  }
}
