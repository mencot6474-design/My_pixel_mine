import { audio } from '../audio/AudioManager';
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
import { computeBulkUpgradePlan, type UpgradeBuyMode } from '../game/UpgradeBulkHelper';
import { fmtMoney } from '../game/NumberFormat';
import { hudIconHtml, researchIconHtml } from './HudIcons';
import { ModalKind, TW_CLOSE_BTN, TW_SHOP_BUY_BTN } from './HudShared';
import { WorldsModalUi } from './WorldsModalUi';

export class UpgradesWorldsUi {
  private researchTab: ResearchTreeId = 'underground';
  private selectedResearchNodeId: string | null = 'ug-deposits-1';
  private buyMode: UpgradeBuyMode = '1';
  private lastUpgradesStateKey = '';
  private animateNodeSelectId: string | null = null;
  private animateResearchTabId: ResearchTreeId | null = null;
  private animateUpgradeBurstId: string | null = null;
  private readonly worldsUi: WorldsModalUi;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onOpenModal: (kind: ModalKind) => void,
    private readonly onRequestRender: () => void
  ) {
    this.worldsUi = new WorldsModalUi(
      this.state,
      this.pushToast,
      this.onOpenModal,
      this.onRequestRender,
      (wid) => this.focusWorldTree(wid)
    );
  }

  public syncActiveWorldTab(): void {
    this.researchTab = this.state.activeWorldId;
  }

  public closeSynergyInfoModal(): void {
    this.worldsUi.closeSynergyInfoModal();
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
    const coreActiveCls = this.researchTab === 'core' ? 'ring-[2.5px] ring-[#38bdf8] bg-[#bae6fd]' : 'bg-[#ffffff]';

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
        ? 'ring-[2.5px] ring-[#38bdf8] bg-[#fef08a]'
        : unlocked
          ? 'bg-[#ffffff]'
          : 'bg-[#fcecc8] opacity-85';

      let footerHtml = '';
      if (isActiveWorld) {
        footerHtml = `<span class="mam-pill-xs rounded bg-[#2ee59d] border border-[#14111d] text-[10px] text-[#14111d]">ACTIVE WORLD${complete ? ' • FULL' : ''}</span>`;
      } else if (unlocked) {
        footerHtml = `<span class="mam-pill-xs rounded bg-[#e2e8f0] border border-[#14111d] text-[10px] text-[#14111d]">UNLOCKED${complete ? ' • FULL' : ''}</span>`;
      } else if (unlockStatus === 'ok' || unlockStatus === 'no-cash') {
        footerHtml = `<span class="mam-pill-xs rounded bg-[#fde047] border border-[#14111d] text-[10px] text-[#14111d]">Ready in Teleport</span>`;
      } else {
        footerHtml = `<span class="text-[10px] font-bold text-[#5b526e]">Need ${prevWorld?.name ?? ''} (${prevMax}/${prevMax})</span>`;
      }

      return `
        <div class="relative rounded-xl border-2 border-[#14111d] ${borderCls} ${animTabId === w.id ? 'mam-pop-click' : ''} p-2.5 flex flex-col items-center gap-1 cursor-pointer transition-[transform,filter] duration-[120ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[0.97] active:scale-[0.94]" data-research-tab="${w.id}">
          <div class="flex items-center gap-1.5 text-[14px] font-black text-[#14111d]">
            <span class="w-2.5 h-2.5 rounded-full shrink-0 border border-[#14111d]" style="background:${w.iconColor}"></span>
            <span>${w.name}</span>
          </div>
          <div class="text-[12px] font-extrabold text-[#5b526e]">Research ${spent}/${maxPts}</div>
          <div class="mt-0.5">${footerHtml}</div>
        </div>
      `;
    }).join('');

    const cellW = 94;
    const cellH = 92;
    const nodeSize = 68;
    const halfNode = nodeSize / 2;
    const padX = 18;
    const padY = 16;
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
          const startY = p2.y > p1.y ? p1.y + halfNode : p2.y < p1.y ? p1.y - halfNode : p1.y;
          const endY = p2.y > p1.y ? p2.y - halfNode : p2.y < p1.y ? p2.y + halfNode : p2.y;
          const midY = Math.round((startY + endY) / 2);
          const unlocked = this.state.getResearchLevel(reqId) >= 1;
          const bothMaxed = unlocked && this.state.getResearchLevel(n.id) >= n.maxLevel;
          const stroke = bothMaxed ? '#facc15' : unlocked ? tabColor : '#334155';
          const opacity = unlocked ? '0.92' : '0.6';
          return `<path d="M ${p1.x} ${startY} V ${midY} H ${p2.x} V ${endY}" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="4" stroke-linecap="butt" stroke-linejoin="round" fill="none" />`;
        })
      )
      .join('');

    const nodesHtml = nodes
      .map((n) => {
        const c = nodeCenter(n.row, n.col);
        const left = Math.round(c.x - halfNode);
        const top = Math.round(c.y - halfNode);
        const lvl = this.state.getResearchLevel(n.id);
        const maxed = lvl >= n.maxLevel;
        const status = this.state.canUpgradeResearch(n.id);
        const selected = selNode?.id === n.id;

        const isLocked = status === 'locked-world' || status === 'locked-prereq';
        const cardStyle = maxed
          ? 'border-[#14111d] bg-[#d1fae5]'
          : isLocked
            ? 'border-[#94a3b8] bg-[#e2e8f0]'
            : 'border-[#14111d] bg-[#fff8e7]';
        const unlockedBorderStyle = '';
        const ringCls = selected ? 'ring-[3px] ring-[#38bdf8] scale-[1.04]' : '';
        const nodeAnimCls =
          animUpgradeId === n.id
            ? 'mam-upgrade-pop'
            : animNodeSelectId === n.id
              ? selected
                ? 'mam-pop-selected'
                : 'mam-pop-click'
              : '';
        const badgeCls = isLocked
          ? 'bg-[#e2e8f0] border-[#14111d] text-[#5b526e]'
          : maxed
            ? 'bg-[#fde047] border-[#14111d] text-[#14111d]'
            : 'bg-[#14111d] border-[#14111d] text-[#fff8e7]';

        return `
          <button
            class="absolute z-[2] rounded-xl border-2 ${cardStyle} ${ringCls} ${nodeAnimCls} flex flex-col items-center justify-center px-1.5 pt-1 pb-2.5 cursor-pointer transition-[transform,filter] duration-[120ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.06] active:scale-[0.92]"
            style="left:${left}px;top:${top}px;width:${nodeSize}px;height:${nodeSize}px;${unlockedBorderStyle}"
            data-research-node="${n.id}"
            title="${n.name} (${lvl}/${n.maxLevel})"
          >
            ${animUpgradeId === n.id ? '<span class="mam-upgrade-ring"></span>' : ''}
            ${status === 'ok' ? '<span class="absolute -top-1.5 -right-1.5 z-[3] w-3.5 h-3.5 rounded-full bg-[#2ee59d] border-2 border-[#14111d]"></span>' : ''}
            <div class="pointer-events-none flex items-center justify-center ${isLocked ? 'opacity-40 saturate-50' : ''}">${researchIconHtml(n.icon, 40, tabColor)}</div>
            <span class="absolute -bottom-2 z-[3] mam-pill-xs rounded border ${badgeCls} text-[10px] tabular-nums">${lvl}/${n.maxLevel}</span>
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
      const bulkPlan = computeBulkUpgradePlan({
        currentLevel: lvl,
        maxLevel: maxLvl,
        currency: this.state.cash,
        mode: this.buyMode,
        costAtLevel: (l) => getNodeNextCost(selNode, l),
      });
      const reqNames = selNode.requires.map((id) => getResearchNodeById(id)?.name ?? id).join(', ');
      const worldIdIfWorld = selNode.treeId === 'core' ? null : (selNode.treeId as WorldId);
      const isWorldInactive = Boolean(worldIdIfWorld && worldIdIfWorld !== this.state.activeWorldId);

      const scopePill = isCore
        ? `<span class="mam-pill rounded-full bg-[#bae6fd] border-2 border-[#14111d] text-[10.5px] text-[#14111d]">Global • Active in All Worlds</span>`
        : isWorldInactive
          ? `<span class="mam-pill rounded-full bg-[#fda4af] border-2 border-[#14111d] text-[10.5px] text-[#14111d]">Isolated • Only Active in ${tabMeta.title}</span>`
          : `<span class="mam-pill rounded-full bg-[#6ee7b7] border-2 border-[#14111d] text-[10.5px] text-[#14111d]">Isolated • Active in ${tabMeta.title}</span>`;

      let actionBtnHtml = '';
      if (status === 'maxed') {
        actionBtnHtml = `<button class="w-full h-11 rounded-xl border-2 border-[#14111d] bg-[#fde047] text-[#14111d] text-[16px] font-black cursor-default" data-research-locked-btn="true">Maxed Out</button>`;
      } else if (status === 'locked-world') {
        const wDef = getWorldById(selNode.treeId as WorldId);
        const wUnlock = this.state.canUnlockWorld(wDef.id);
        if (wUnlock === 'ok' || wUnlock === 'no-cash') {
          actionBtnHtml = `<button class="mam-sheen-hover relative overflow-hidden w-full h-11 rounded-xl border-2 border-[#14111d] bg-[#38bdf8] text-[#14111d] text-[14px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:brightness-105 active:scale-95" data-open-teleport="true">Unlock in Teleport (${fmtMoney(wDef.unlockCost)})</button>`;
        } else {
          const prevW = WORLDS[Math.max(0, getWorldIndex(wDef.id) - 1)];
          actionBtnHtml = `<button class="w-full h-11 rounded-xl border-2 border-[#94a3b8] bg-[#e2e8f0] text-[#5b526e] text-[13px] font-black cursor-pointer transition-transform duration-100 active:scale-[0.96]" data-research-locked-btn="true">Complete ${prevW.name} First</button>`;
        }
      } else if (status === 'locked-prereq') {
        actionBtnHtml = `<button class="w-full h-11 rounded-xl border-2 border-[#94a3b8] bg-[#e2e8f0] text-[#5b526e] text-[13px] font-black cursor-pointer transition-transform duration-100 active:scale-[0.96]" data-research-locked-btn="true">Need ${reqNames}</button>`;
      } else if (status === 'no-cash') {
        actionBtnHtml = `<button class="${TW_SHOP_BUY_BTN} disabled !h-11 !text-[16px]" data-upgrade-node="${selNode.id}">${fmtMoney(cost)}</button>`;
      } else {
        const buyLabel =
          bulkPlan.levels > 1
            ? `Upgrade +${bulkPlan.levels} • ${fmtMoney(bulkPlan.totalCost)}`
            : `Upgrade • ${fmtMoney(bulkPlan.totalCost)}`;
        actionBtnHtml = `<button class="${TW_SHOP_BUY_BTN} ${animUpgradeId === selNode.id ? 'mam-pop-click' : ''} !h-11 !text-[16px]" data-upgrade-node="${selNode.id}">${buyLabel}</button>`;
      }

      const showBuyToggle = status === 'ok' || status === 'no-cash';
      const buyModes: { id: UpgradeBuyMode; label: string }[] = [
        { id: '1', label: '×1' },
        { id: '10', label: '×10' },
        { id: 'max', label: 'MAX' },
      ];
      const buyToggleHtml = showBuyToggle
        ? `<div class="grid grid-cols-3 gap-1.5 w-full">
            ${buyModes
              .map(
                (m) => `
              <button class="h-7 rounded-lg border-2 border-[#14111d] text-[11px] font-black cursor-pointer transition-colors ${
                this.buyMode === m.id
                  ? 'bg-[#fde047] text-[#14111d]'
                  : 'bg-[#fcecc8] text-[#5b526e] hover:bg-[#fef08a] hover:text-[#14111d]'
              }" data-research-buy-mode="${m.id}">${m.label}</button>
            `
              )
              .join('')}
          </div>`
        : '';

      const inspIconAnim =
        animUpgradeId === selNode.id ? 'mam-upgrade-pop' : animNodeSelectId === selNode.id ? 'mam-pop-click' : '';

      inspectorHtml = `
        <div class="flex items-center justify-center p-1.5 ${inspIconAnim}">${researchIconHtml(selNode.icon, 74, tabColor)}</div>
        <div class="text-[22px] font-black text-[#14111d] leading-tight">${selNode.name}</div>
        ${scopePill}
        <div class="relative w-full h-6 rounded-full bg-[#fcecc8] border-2 border-[#14111d] overflow-hidden flex items-center justify-center mt-0.5">
          <div class="absolute left-0 top-0 bottom-0 bg-[#38bdf8] transition-[width] duration-200" style="width:${pct}%"></div>
          <span class="relative z-[2] text-[12px] font-black text-[#14111d]">${lvl}/${maxLvl}</span>
        </div>
        <div class="text-[15px] font-black text-[#059669]">${lvl > 0 ? formatNodeEffectLine(selNode, lvl) : `Next: ${formatNodeEffectLine(selNode, 1)}`}</div>
        ${lvl > 0 && lvl < maxLvl ? `<div class="text-[12px] font-extrabold text-[#0284c7]">Next Lv: ${formatNodeEffectLine(selNode, lvl + 1)}</div>` : ''}
        <div class="text-[12px] font-bold text-[#5b526e] leading-snug">${selNode.descTemplate}</div>
        ${buyToggleHtml}
        <div class="w-full mt-1">${actionBtnHtml}</div>
      `;
    }

    const activeIdx = getWorldIndex(this.state.activeWorldId);
    const nextWorld = activeIdx >= 0 && activeIdx < WORLDS.length - 1 ? WORLDS[activeIdx + 1] : null;
    const nextWorldCta =
      nextWorld && !this.state.isWorldUnlocked(nextWorld.id) && this.state.isTreeComplete(this.state.activeWorldId)
        ? `<button class="mam-sheen-hover relative overflow-hidden h-9 px-4 rounded-xl border-[2.5px] border-[#14111d] bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#14111d] text-[13px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.97] active:scale-95" data-open-teleport="true">Open Teleport (${nextWorld.name})</button>`
        : '';

    return `
      <div class="absolute inset-0 z-40 bg-[rgba(4,7,15,0.62)] flex items-center justify-center p-3 pt-7 @max-[720px]:p-2 @max-[720px]:pt-6 pointer-events-auto" data-backdrop="true" data-upgrades-shell="true">
        <div class="mam-modal w-[min(1180px,100%)] h-[min(740px,calc(100%-14px))] flex flex-col pt-3 px-4 pb-3.5 gap-2.5 @max-[720px]:px-2.5 @max-[720px]:pb-2.5" data-modal-theme="upgrades" role="dialog" aria-modal="true" aria-label="Upgrades">
          <div class="mam-modal-surface" aria-hidden="true"></div>
          <div class="mam-modal-rails" aria-hidden="true">
            <span class="mam-rail-stud is-tl"></span>
            <span class="mam-rail-stud is-tr"></span>
            <span class="mam-rail-stud is-bl"></span>
            <span class="mam-rail-stud is-br"></span>
          </div>
          <div class="mam-modal-rail-head">
            <span class="mam-wing-rail is-left" aria-hidden="true"></span>
            <div class="mam-title-plaque">
              <span class="mam-title-plaque-icon shrink-0 [&>img]:w-5 [&>img]:h-5">${hudIconHtml('hourglass', 22, 'Upgrades')}</span>
              <span>Upgrades</span>
            </div>
            <span class="mam-wing-rail is-right" aria-hidden="true"></span>
            <button class="${TW_CLOSE_BTN} mam-close-rail-btn" data-action="close-modal" aria-label="Close Upgrades">✕</button>
          </div>
          <div class="flex items-center justify-end gap-3 flex-wrap w-full">
            <div class="mam-pill-lg rounded-full bg-[#14111d] text-[16px] tabular-nums text-[#fde047]" data-upgrades-cash="true">${fmtMoney(this.state.cash)}</div>
            ${nextWorldCta}
          </div>
          <div class="flex-1 min-h-0 flex items-stretch gap-3 @max-[920px]:flex-col @max-[920px]:overflow-x-hidden @max-[920px]:overflow-y-auto mam-no-scrollbar">
            <div class="w-[216px] @max-[920px]:w-full @max-[920px]:grid @max-[920px]:grid-cols-3 @max-[560px]:grid-cols-2 shrink-0 flex flex-col gap-2 overflow-x-hidden overflow-y-auto mam-no-scrollbar px-2 py-1" data-upgrades-sidebar-scroll="true">
              <div class="relative rounded-xl border-2 border-[#14111d] ${coreActiveCls} ${animTabId === 'core' ? 'mam-pop-click' : ''} p-2.5 flex flex-col items-center gap-1 cursor-pointer transition-[transform,filter,background-color] duration-150 hover:scale-[0.97] active:scale-[0.94]" data-research-tab="core">
                <div class="flex items-center gap-1.5 text-[15px] font-black text-[#14111d]">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#38bdf8] border border-[#14111d]"></span>
                  <span>Core</span>
                </div>
                <div class="text-[12px] font-bold text-[#5b526e]">Research ${coreSpent}/${coreMax}</div>
                <span class="mam-pill-xs rounded-full bg-[#bae6fd] border border-[#14111d] text-[10px] text-[#14111d]">Global • All Worlds</span>
              </div>
              ${worldSidebarCards}
            </div>

            <div class="mam-inspector-well flex-1 min-w-0 min-h-0 rounded-xl flex overflow-auto mam-no-scrollbar p-2" data-upgrades-tree-scroll="true">
              <div class="relative shrink-0 m-auto" style="width:${canvasW}px;height:${canvasH}px">
                <svg class="absolute inset-0 z-[1] w-full h-full pointer-events-none" viewBox="0 0 ${canvasW} ${canvasH}">
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

  public renderWorldsModal(): string {
    return this.worldsUi.renderModal();
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

    shell.querySelectorAll<HTMLElement>('[data-research-buy-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.researchBuyMode as UpgradeBuyMode | undefined;
        if (mode && mode !== this.buyMode) {
          this.buyMode = mode;
          audio.playSfx('ui-tab');
          this.onRequestRender();
        }
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
          const maxSteps = this.buyMode === '1' ? 1 : this.buyMode === '10' ? 10 : 100;
          for (let i = 0; i < maxSteps; i++) {
            if (this.state.canUpgradeResearch(nodeId) !== 'ok') break;
            if (!this.state.upgradeResearch(nodeId)) break;
          }
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
    this.worldsUi.bindEvents(root, scope);
  }

  public updateWorldsModalLive(root: HTMLElement): void {
    this.worldsUi.updateLive(root);
  }

  public updateUpgradesLive(root: HTMLElement): void {
    const cashEl = root.querySelector<HTMLElement>('[data-upgrades-cash="true"]');
    if (cashEl) cashEl.textContent = fmtMoney(this.state.cash);

    const nextKey = this.getUpgradesStateKey();
    if (nextKey === this.lastUpgradesStateKey) return;

    const shell = root.querySelector<HTMLElement>('[data-upgrades-shell="true"]');
    if (!shell) return;
    const prevTree = shell.querySelector<HTMLElement>('[data-upgrades-tree-scroll="true"]');
    const prevSide = shell.querySelector<HTMLElement>('[data-upgrades-sidebar-scroll="true"]');
    const treeTop = prevTree?.scrollTop ?? 0;
    const treeLeft = prevTree?.scrollLeft ?? 0;
    const sideTop = prevSide?.scrollTop ?? 0;
    shell.outerHTML = this.renderUpgradesModal();
    const nextShell = root.querySelector<HTMLElement>('[data-upgrades-shell="true"]');
    const nextTree = nextShell?.querySelector<HTMLElement>('[data-upgrades-tree-scroll="true"]');
    const nextSide = nextShell?.querySelector<HTMLElement>('[data-upgrades-sidebar-scroll="true"]');
    if (nextTree) {
      nextTree.scrollTop = treeTop;
      nextTree.scrollLeft = treeLeft;
    }
    if (nextSide) nextSide.scrollTop = sideTop;
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
