import { audio } from '../audio/AudioManager';
import { cgHappyTime } from '../sdk/crazygames';
import { getChibiById } from '../game3d/ChibiCatalog';
import {
  ENCHANTS,
  getEnchantById,
  getMinerRarity,
  getMinerWorldId,
  getMutationById,
  getWorldById,
  isHighTierMutation,
  MUTATIONS,
  PICKAXES,
  RARITY_BORDER,
} from '../game/GameData';
import { getFusionRecipeByResultChibiId } from '../game/FusionData';
import { GameState, getChibiUpgradeCostMult } from '../game/GameState';
import {
  computeBulkUpgradePlan,
  getPlotStatUpgradeCost,
  type UpgradeBuyMode,
} from '../game/UpgradeBulkHelper';
import { fmtInt, fmtMoney, fmtPct, fmtShort } from '../game/NumberFormat';
import { enchantAuraIconHtml, hudIconHtml, pickaxeIconHtml } from './HudIcons';
import {
  bindEnchantHoverInspector,
  InspectTab,
  rarityVars,
  TW_INSPECT_ARROW,
  TW_INSPECT_TAB,
  TW_STAT_BTN,
  TW_STAT_CARD,
  TW_STRIP_CARD,
} from './HudShared';

export function shouldStopAutoMutationRoll(opts: {
  mutationId: string;
  gems: number;
  cost: number;
}): 'high-tier' | 'no-gems' | null {
  if (isHighTierMutation(opts.mutationId)) return 'high-tier';
  if (opts.gems < opts.cost) return 'no-gems';
  return null;
}

export class PlotInspectUi {
  private inspectTab: InspectTab = 'stats';
  private buyMode: UpgradeBuyMode = '1';
  private autoRollMutSlot: number | null = null;
  private autoRollMutTimer: number | null = null;
  private pendingMutationConfirm: {
    slot: number;
    mutId: string;
    mode: 'obtained' | 'overwrite';
  } | null = null;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onOpenPlotInspector: (slotIndex: number | null) => void,
    private readonly onRequestRender: () => void,
    private readonly renderToastStackHtml: () => string,
    private readonly renderToasts: () => void
  ) {}

  public stopAutoRollMutation(): void {
    if (this.autoRollMutTimer !== null) {
      window.clearInterval(this.autoRollMutTimer);
      this.autoRollMutTimer = null;
    }
    this.autoRollMutSlot = null;
  }

  private startAutoRollMutation(slot: number): void {
    this.stopAutoRollMutation();
    this.autoRollMutSlot = slot;
    this.executeMutationRoll(slot);
    if (this.pendingMutationConfirm) {
      this.stopAutoRollMutation();
      return;
    }
    this.autoRollMutTimer = window.setInterval(() => {
      if (this.autoRollMutSlot !== slot || this.pendingMutationConfirm) {
        this.stopAutoRollMutation();
        return;
      }
      const unit = this.state.getPlotUnit(slot);
      const stats = this.state.getPlotUnitStats(slot);
      if (!unit || !stats) {
        this.stopAutoRollMutation();
        return;
      }
      const stopReason = shouldStopAutoMutationRoll({
        mutationId: unit.mutationId,
        gems: this.state.gems,
        cost: stats.mutationCost,
      });
      if (stopReason === 'high-tier') {
        this.stopAutoRollMutation();
        this.onRequestRender();
        return;
      }
      if (stopReason === 'no-gems') {
        this.stopAutoRollMutation();
        audio.playSfx('ui-error');
        this.pushToast('Auto Roll stopped: Not enough Gems!');
        this.onRequestRender();
        return;
      }
      this.executeMutationRoll(slot);
      if (this.pendingMutationConfirm) {
        this.stopAutoRollMutation();
      }
    }, 260);
  }

  public render(root: HTMLElement, slot: number): void {
    const unit = this.state.getPlotUnit(slot);
    const stats = this.state.getPlotUnitStats(slot);
    const chibi = unit ? getChibiById(unit.chibiId) : null;
    if (!unit || !stats || !chibi) {
      this.stopAutoRollMutation();
      this.pendingMutationConfirm = null;
      this.onOpenPlotInspector(null);
      return;
    }

    if (
      this.pendingMutationConfirm &&
      (this.pendingMutationConfirm.slot !== slot || this.inspectTab !== 'mutation')
    ) {
      this.pendingMutationConfirm = null;
    }

    const rarity = getMinerRarity(chibi.id);
    const mut = getMutationById(unit.mutationId);
    const rColor = RARITY_BORDER[rarity];
    const star = this.state.getChibiStar(chibi.id);
    const worldId = getMinerWorldId(chibi.id);
    const resBonusPct = this.state.getWorldResonanceDmgBonusPct(worldId);
    const worldName = worldId ? getWorldById(worldId).name : null;
    const fusionDef = getFusionRecipeByResultChibiId(chibi.id);
    const eqEnchant = getEnchantById(unit.enchantId);

    root.innerHTML = `
      <button class="absolute top-4 @max-[720px]:top-2.5 left-1/2 -translate-x-1/2 px-[34px] py-[7px] rounded-2xl border-2 border-orange-300 bg-[linear-gradient(135deg,#ea580c,#c2410c)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_0_#431407,0_8px_22px_-4px_rgba(234,88,12,0.45)] text-white text-[19px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.97] mam-outline-sm" data-inspect-action="exit">Exit</button>

      <div class="absolute left-7 @max-[920px]:left-3 top-[38%] @max-[920px]:top-14 -translate-y-1/2 @max-[920px]:translate-y-0 w-[245px] @max-[920px]:w-[208px] px-3.5 py-3 rounded-2xl bg-[linear-gradient(180deg,#141e36_0%,#0a1020_100%)] border-2 border-[#2a3b5c] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_36px_rgba(0,0,0,0.72)] flex flex-col gap-[3px]">
        <div class="flex items-center justify-between gap-1.5">
          <div class="text-[20px] font-black leading-[1.1] mam-outline-sm truncate">${chibi.name}</div>
          ${star > 0 ? `<span class="px-1.5 py-0.5 rounded-md bg-[#3b290a] border border-amber-400 text-amber-300 text-[11px] font-black tabular-nums shrink-0">★${star}</span>` : ''}
        </div>
        <div class="text-[15px] font-extrabold mam-outline-sm flex items-center gap-1.5 flex-wrap">
          ${
            rarity === 'fusion'
              ? `<span class="mam-fusion-badge">✦ FUSION</span>`
              : rarity === 'limited'
                ? `<span class="mam-limited-badge">✦ LIMITED</span>`
                : `<span style="color:${rColor}">${rarity[0].toUpperCase() + rarity.slice(1)}</span>`
          }
          <span style="color:#fff">•</span>
          <span class="${mut.id === 'rainbow' ? 'mam-rainbow-text' : ''}" style="${mut.id === 'rainbow' ? '' : `color:${mut.color}`}">${mut.name}</span>
        </div>
        ${resBonusPct > 0 && worldName ? `<div class="text-[11px] font-black tabular-nums text-violet-300 mam-outline-sm">✦ ${worldName} Resonance (+${Math.round(resBonusPct * 100)}% DMG)</div>` : ''}
        ${fusionDef ? `<div class="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0d263d] border border-cyan-400 text-[11px] font-black text-cyan-200 self-start mam-outline-sm">★ Passive: ${fusionDef.passive.label}</div>` : ''}
        ${eqEnchant ? `<div class="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#141132] border text-[10.5px] font-black self-start mam-outline-sm" style="border-color:${eqEnchant.color};color:${eqEnchant.color}">✦ ${eqEnchant.name}: ${eqEnchant.dmgMult}x DMG • +${Math.round(eqEnchant.oreDropPct * 100)}% Ore • +${Math.round(eqEnchant.sellValuePct * 100)}% Sell</div>` : ''}
        <div class="text-[13px] font-bold tabular-nums text-[#e2e8f0] mt-0.5 mam-outline-sm">
          Lv. ${unit.damageLevel} • Speed ${stats.speed} • Mining x${stats.miningMult}
        </div>
        <div class="text-[24px] font-black tabular-nums text-[#f87171] leading-[1.1] mt-1.5 mam-outline">${fmtShort(stats.dmg)} dmg</div>
        <div class="text-[14px] font-extrabold tabular-nums text-[#4ade80] mam-outline-sm">Worth ${fmtMoney(stats.worth)}</div>
        <button class="mt-2 px-3 py-1.5 rounded-xl border-2 border-rose-300 bg-[linear-gradient(135deg,#ef4444,#991b1b)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_3px_0_#450a0a,0_6px_16px_-2px_rgba(239,68,68,0.45)] text-white text-[13px] font-extrabold cursor-pointer self-start transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.97] mam-outline-sm" data-inspect-action="pickup">Pick Up from Plot</button>
      </div>

      <button class="${TW_INSPECT_ARROW} left-[31%] @max-[920px]:left-3" data-inspect-action="prev">&lt;</button>
      <button class="${TW_INSPECT_ARROW} right-[31%] @max-[920px]:right-3" data-inspect-action="next">&gt;</button>

      <div class="absolute right-[22px] @max-[920px]:right-3 top-[48%] @max-[920px]:top-3 -translate-y-1/2 @max-[920px]:translate-y-0 flex flex-col items-end gap-1">
        <div class="flex items-center gap-1.5 text-[22px] font-black tabular-nums text-[#67e8f9] mam-outline-sm" data-inspect-gems="true">${hudIconHtml('gem', 24, 'Gems')} <span>${fmtInt(this.state.gems)}</span></div>
        <div class="text-[24px] font-black tabular-nums text-[#4ade80] mam-outline" data-inspect-cash="true">${fmtMoney(this.state.cash)}</div>
      </div>

      <div class="absolute bottom-[14px] left-1/2 -translate-x-1/2 w-[860px] max-w-[calc(100%-24px)] flex flex-col items-center gap-2 pointer-events-auto">
        <div class="grid grid-cols-[repeat(4,150px)] @max-[920px]:grid-cols-4 @max-[920px]:w-full gap-2 @max-[920px]:gap-1.5">
          <button class="${TW_INSPECT_TAB} mam-outline-sm ${this.inspectTab === 'pickaxe' ? 'active' : ''}" data-inspect-tab="pickaxe">${hudIconHtml('pickaxe', 20, 'Pickaxe')} Pickaxe</button>
          <button class="${TW_INSPECT_TAB} mam-outline-sm ${this.inspectTab === 'stats' ? 'active' : ''}" data-inspect-tab="stats">${hudIconHtml('stats', 20, 'Stats')} Stats</button>
          <button class="${TW_INSPECT_TAB} mam-outline-sm ${this.inspectTab === 'mutation' ? 'active' : ''}" data-inspect-tab="mutation">${hudIconHtml('mutation', 20, 'Mutation')} Mutation</button>
          <button class="${TW_INSPECT_TAB} mam-outline-sm ${this.inspectTab === 'enchants' ? 'active' : ''}" data-inspect-tab="enchants">${hudIconHtml('enchant', 20, 'Enchants')} Enchants</button>
        </div>

        <div class="mam-inspect-panel w-full p-2.5 rounded-2xl bg-[linear-gradient(180deg,#141e36_0%,#0a1020_100%)] border-2 border-[#2a3b5c] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_36px_rgba(0,0,0,0.72)] flex items-stretch gap-2 overflow-x-hidden [&.is-stats]:flex-col [&.is-stats]:gap-2 [&.is-pickaxe]:grid [&.is-pickaxe]:grid-cols-6 @max-[760px]:[&.is-pickaxe]:grid-cols-4 [&.is-pickaxe]:gap-1.5 [&.is-enchants]:grid [&.is-enchants]:grid-cols-10 @max-[760px]:[&.is-enchants]:grid-cols-5 [&.is-enchants]:gap-1.5 [&.is-mutation]:items-center [&.is-mutation]:gap-1.5 @max-[760px]:[&.is-mutation]:flex-wrap [&_.mam-strip-card]:min-w-0 [&_.mam-strip-card]:w-auto [&_.mam-strip-card_.mam-card-name]:text-[11px] [&_.mam-strip-card_.mam-card-name]:leading-tight [&_.mam-strip-card_.mam-card-name]:whitespace-nowrap [&_.mam-strip-card_.mam-card-name]:overflow-hidden [&_.mam-strip-card_.mam-card-name]:text-ellipsis [&.is-mutation_.mam-strip-card]:flex-1 [&.is-mutation_.mam-strip-card]:h-[84px] [&.is-mutation_.mam-strip-card]:py-1 [&.is-mutation_.mam-strip-card]:px-0.5 [&.is-enchants_.mam-strip-card]:h-[84px] [&.is-enchants_.mam-strip-card]:py-1 [&.is-enchants_.mam-strip-card]:px-0.5 [&.is-pickaxe_.mam-strip-card]:h-[84px] [&.is-pickaxe_.mam-strip-card]:py-1 [&.is-pickaxe_.mam-strip-card]:px-0.5 ${
          this.inspectTab === 'mutation'
            ? 'is-mutation'
            : this.inspectTab === 'enchants'
              ? 'is-enchants'
              : this.inspectTab === 'pickaxe'
                ? 'is-pickaxe'
                : 'is-stats'
        }">
          ${this.renderTabContent(unit, stats)}
        </div>
      </div>

      ${this.renderMutationConfirmOverlay(chibi.name, stats.mutationCost)}
      ${this.renderToastStackHtml()}
    `;

    this.bindEvents(root, slot);
    this.renderToasts();
  }

  private renderTabContent(
    unit: NonNullable<ReturnType<GameState['getPlotUnit']>>,
    stats: NonNullable<ReturnType<GameState['getPlotUnitStats']>>
  ): string {
    if (this.inspectTab === 'stats') {
      const dmgMax = unit.damageLevel >= 100;
      const spdMax = unit.speedLevel >= 17;
      const minMax = unit.miningSpeedLevel >= 16;
      const costMult = getChibiUpgradeCostMult(unit.chibiId);
      const dmgPlan = computeBulkUpgradePlan({
        currentLevel: unit.damageLevel,
        maxLevel: 100,
        currency: this.state.cash,
        mode: this.buyMode,
        costAtLevel: (l) => getPlotStatUpgradeCost('dmg', l, costMult),
      });
      const spdPlan = computeBulkUpgradePlan({
        currentLevel: unit.speedLevel,
        maxLevel: 17,
        currency: this.state.cash,
        mode: this.buyMode,
        costAtLevel: (l) => getPlotStatUpgradeCost('speed', l, costMult),
      });
      const minPlan = computeBulkUpgradePlan({
        currentLevel: unit.miningSpeedLevel,
        maxLevel: 16,
        currency: this.state.cash,
        mode: this.buyMode,
        costAtLevel: (l) => getPlotStatUpgradeCost('mining', l, costMult),
      });
      const fmtPlanBtn = (maxed: boolean, plan: { levels: number; totalCost: number }): string => {
        if (maxed) return 'Max';
        if (plan.levels > 1) return `+${plan.levels} • ${fmtMoney(plan.totalCost)}`;
        return fmtMoney(plan.totalCost);
      };
      const buyModes: { id: UpgradeBuyMode; label: string }[] = [
        { id: '1', label: '×1' },
        { id: '10', label: '×10' },
        { id: 'max', label: 'MAX' },
      ];
      const modeToggleHtml = `
        <div class="w-full flex items-center justify-between gap-2 px-1">
          <span class="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Upgrade Amount</span>
          <div class="inline-flex items-center gap-1 p-0.5 rounded-lg border border-slate-700/90 bg-[#080d1a]">
            ${buyModes
              .map(
                (m) => `
              <button class="px-2.5 py-0.5 rounded-md text-[11px] font-black cursor-pointer transition-colors ${
                this.buyMode === m.id
                  ? 'bg-sky-400 text-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.45)]'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }" data-buy-mode="${m.id}">${m.label}</button>
            `
              )
              .join('')}
          </div>
        </div>
      `;
      return `
        ${modeToggleHtml}
        <div class="w-full grid grid-cols-3 @max-[640px]:grid-cols-1 gap-2">
          <div class="${TW_STAT_CARD}">
            <div class="text-[13px] font-extrabold tabular-nums text-[#e2e8f0] mam-outline-sm">Damage Lv. ${unit.damageLevel} / 100</div>
            <div class="text-[15px] font-black tabular-nums mam-outline-sm">
              <span style="color:#ef4444">${fmtShort(stats.dmg)}</span> &gt; <span style="color:#4ade80">${fmtShort(stats.nextDmg)}</span>
            </div>
            <button class="${TW_STAT_BTN} tabular-nums mam-outline-sm ${dmgMax ? 'maxed' : ''}" data-inspect-action="up-dmg">
              ${fmtPlanBtn(dmgMax, dmgPlan)}
            </button>
          </div>
          <div class="${TW_STAT_CARD}">
            <div class="text-[13px] font-extrabold tabular-nums text-[#e2e8f0] mam-outline-sm">Speed Lv. ${unit.speedLevel} / 17</div>
            <div class="text-[15px] font-black tabular-nums mam-outline-sm" style="color:#4ade80">${stats.speed}</div>
            <button class="${TW_STAT_BTN} tabular-nums mam-outline-sm ${spdMax ? 'maxed' : ''}" data-inspect-action="up-spd">
              ${fmtPlanBtn(spdMax, spdPlan)}
            </button>
          </div>
          <div class="${TW_STAT_CARD}">
            <div class="text-[13px] font-extrabold tabular-nums text-[#e2e8f0] mam-outline-sm">Mining Speed Lv. ${unit.miningSpeedLevel} / 16</div>
            <div class="text-[15px] font-black tabular-nums mam-outline-sm" style="color:#4ade80">x${stats.miningMult}</div>
            <button class="${TW_STAT_BTN} tabular-nums mam-outline-sm ${minMax ? 'maxed' : ''}" data-inspect-action="up-mine">
              ${fmtPlanBtn(minMax, minPlan)}
            </button>
          </div>
        </div>
      `;
    }

    if (this.inspectTab === 'pickaxe') {
      return PICKAXES.map((p) => {
        const owned = this.state.ownedPickaxes[p.id] || 0;
        const eq = unit.pickaxeId === p.id;
        const available = eq || owned > 0;
        return `
          <div class="${TW_STRIP_CARD} ${eq ? 'equipped' : ''} ${available ? '' : 'locked'}" style="${rarityVars(p.rarity)}" data-pickaxe-id="${p.id}" title="${eq ? 'Click to Unequip (returns to bag)' : owned > 0 ? 'Click to Equip (1 per Chibi)' : 'Locked — Buy in Pickaxe Shop'}">
            ${eq ? '<span class="absolute top-0.5 right-1 text-[13px] font-black text-[#4ade80] [text-shadow:0_1px_2px_#000]">✓</span>' : ''}
            <div class="mam-card-name mam-outline-sm">${p.name}</div>
            <div>${available ? pickaxeIconHtml(p.id, 36, p.name) : hudIconHtml('lock', 30, 'Locked')}</div>
            <div class="mam-card-bottom">
              <span class="mam-card-qty mam-outline-sm">${eq ? 'Equipped' : owned > 0 ? `x${owned}` : 'Locked'}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    if (this.inspectTab === 'mutation') {
      const curMut = getMutationById(unit.mutationId);
      const mutCards = MUTATIONS.filter((m) => m.chancePct > 0)
        .map(
          (m) => `
          <div class="${TW_STRIP_CARD} ${m.rarity === 'rainbow' ? 'rarity-rainbow' : ''} ${unit.mutationId === m.id ? 'equipped' : ''}" style="${rarityVars(m.rarity)}">
            <div class="mam-card-name mam-outline-sm ${m.id === 'rainbow' ? 'mam-rainbow-text' : ''}" style="${m.id === 'rainbow' ? '' : `color:${m.color}`}">${m.name}</div>
            <div class="mam-outline-sm tabular-nums" style="font-size:15px;font-weight:900;color:#fca5a5">${m.mult}X</div>
            <div class="mam-card-qty mam-outline-sm">${fmtPct(m.chancePct)}</div>
          </div>
        `
        )
        .join('');

      const isAutoRolling = this.autoRollMutSlot !== null;
      return `
        ${mutCards}
        <div class="flex-[0_0_184px] @max-[760px]:flex-[1_1_100%] h-[84px] px-2.5 py-2 rounded-xl bg-[#0a1224] border border-slate-700/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between">
          <div class="flex items-center justify-between gap-1.5">
            <div class="mam-outline-sm truncate text-[14px] font-black ${curMut.id === 'rainbow' ? 'mam-rainbow-text' : ''}" style="${curMut.id === 'rainbow' ? '' : `color:${curMut.color}`}">${curMut.name}</div>
            <div class="mam-outline-sm tabular-nums inline-flex items-center gap-1 text-[13px] font-black text-[#f9a8d4] shrink-0">${hudIconHtml('gem', 15, 'Gems')} ${fmtInt(stats.mutationCost)}</div>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <button class="mam-sheen-hover relative overflow-hidden h-9 rounded-lg border border-orange-300/70 bg-[linear-gradient(135deg,#f97316,#c2410c)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_10px_rgba(234,88,12,0.4)] text-white text-[13px] font-black cursor-pointer transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.97] mam-outline-sm" data-inspect-action="roll-mut">Roll</button>
            <button class="h-9 rounded-lg border text-[12px] font-black cursor-pointer transition-colors mam-outline-sm ${
              isAutoRolling
                ? 'border-rose-300 bg-rose-600 text-white animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                : 'border-cyan-400/70 bg-[linear-gradient(180deg,#0e3a52,#082032)] text-cyan-200 hover:brightness-125'
            }" data-inspect-action="toggle-auto-mut" title="Auto-stops on Frozen+ or when out of Gems">${isAutoRolling ? 'Stop' : 'Auto'}</button>
          </div>
        </div>
      `;
    }

    return ENCHANTS.map((e) => {
      const totalOwned = this.state.ownedEnchants[e.id] || 0;
      const spare = this.state.getAvailableEnchantCount(e.id);
      const eq = unit.enchantId === e.id;
      const available = eq || spare > 0;
      const orePct = Math.round(e.oreDropPct * 100);
      const sellPct = Math.round(e.sellValuePct * 100);
      const spdPct = Math.round(e.miningSpeedPct * 100);
      const statusHint = eq
        ? 'Click to Unequip'
        : spare > 0
          ? 'Click to Equip (1 per Chibi)'
          : totalOwned > 0
            ? 'In Use on another Chibi'
            : 'Locked — Roll in Enhance Altar';
      return `
        <div class="${TW_STRIP_CARD} ${eq ? 'equipped' : ''} ${available ? '' : 'locked'}" style="${rarityVars(e.rarity)}" data-enchant-id="${e.id}" tabindex="0" title="${e.name} • ${e.dmgMult}x DMG • +${orePct}% Ore Drop • +${sellPct}% Sell • +${spdPct}% Spd • ${statusHint}">
          ${eq ? '<span class="absolute top-0.5 right-1 text-[13px] font-black text-[#4ade80] [text-shadow:0_1px_2px_#000]">✓</span>' : ''}
          <div class="mam-card-name mam-outline-sm">${e.name}</div>
          <div class="flex-1 min-h-0 flex items-center justify-center pointer-events-none">${enchantAuraIconHtml(e.id, e.color, 36, e.name)}</div>
          <div class="mam-card-bottom">
            <span class="mam-card-qty mam-outline-sm">${eq ? 'Equipped' : spare > 0 ? `x${spare}` : totalOwned > 0 ? 'In Use' : 'Locked'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  private renderMutationConfirmOverlay(chibiName: string, mutationCost: number): string {
    if (!this.pendingMutationConfirm) return '';
    const mut = getMutationById(this.pendingMutationConfirm.mutId);
    const isObtained = this.pendingMutationConfirm.mode === 'obtained';
    const title = isObtained ? 'Rare Mutation Obtained!' : 'High Mutation Equipped!';
    const desc = isObtained
      ? `${chibiName} rolled <span class="font-black" style="color:${mut.color}">${mut.name} (${mut.mult}X)</span>! Rolling again will replace it. Keep or continue rolling?`
      : `${chibiName} already has <span class="font-black" style="color:${mut.color}">${mut.name} (${mut.mult}X)</span>! Rolling again will overwrite it. Continue rolling or stop?`;

    return `
      <div class="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pointer-events-auto" data-mut-confirm-backdrop="true" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="w-[min(420px,100%)] rounded-2xl border-2 bg-[linear-gradient(180deg,#141d34_0%,#0a0f1d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_50px_rgba(0,0,0,0.85)] p-5 flex flex-col items-center gap-3.5 text-center" style="border-color:${mut.color}" data-mut-confirm-dialog="true">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#362409] border border-amber-400 text-amber-300 text-[12px] font-black tracking-wide uppercase mam-outline-sm">
            <span>&#9888;&#65039;</span> ${title}
          </div>
          <div class="w-full py-3 px-4 rounded-xl bg-[#11192e] border flex flex-col items-center gap-0.5" style="border-color:${mut.color}">
            <div class="text-[24px] font-black leading-tight mam-outline" style="color:${mut.color}">${mut.name}</div>
            <div class="text-[16px] font-black text-[#fca5a5] mam-outline-sm">${mut.mult}X Damage &bull; ${fmtPct(mut.chancePct)}</div>
          </div>
          <p class="text-[14px] leading-snug font-bold text-[#e2e8f0] m-0">${desc}</p>
          <div class="w-full grid grid-cols-2 gap-2.5 mt-1">
            <button class="h-11 rounded-xl border-2 border-[#14532d] bg-[linear-gradient(180deg,#22c55e,#15803d)] shadow-[0_3px_0_#14532d] text-white text-[15px] font-black cursor-pointer transition-[transform,filter] duration-120 hover:brightness-110 active:translate-y-0.5 mam-outline-sm" data-inspect-action="mut-stop">Stop (Keep)</button>
            <button class="h-11 rounded-xl border-2 border-[#7c2d12] bg-[linear-gradient(180deg,#fb923c,#dc2626)] shadow-[0_3px_0_#7c2d12] text-white text-[14px] font-black cursor-pointer inline-flex items-center justify-center gap-1.5 transition-[transform,filter] duration-120 hover:brightness-110 active:translate-y-0.5 mam-outline-sm" data-inspect-action="mut-continue">
              <span>Continue</span>
              <span class="inline-flex items-center gap-0.5 text-[#fbcfe8]">${hudIconHtml('gem', 16, 'Gems')} ${fmtInt(mutationCost)}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private executeMutationRoll(slot: number): void {
    const res = this.state.rollPlotMutation(slot);
    if (!res) {
      audio.playSfx('ui-error');
      this.pendingMutationConfirm = null;
      this.pushToast('Not enough Gems!');
      this.onRequestRender();
      return;
    }
    this.pushToast(`Rolled ${res}!`);
    const updated = this.state.getPlotUnit(slot);
    if (updated && isHighTierMutation(updated.mutationId)) {
      audio.playMutationRoll(true);
      cgHappyTime();
      this.pendingMutationConfirm = {
        slot,
        mutId: updated.mutationId,
        mode: 'obtained',
      };
    } else {
      audio.playMutationRoll(false);
      this.pendingMutationConfirm = null;
    }
    this.onRequestRender();
  }

  private bindEvents(root: HTMLElement, slot: number): void {
    root.querySelectorAll('[data-inspect-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.playSfx('ui-tab');
        this.stopAutoRollMutation();
        this.pendingMutationConfirm = null;
        this.inspectTab = (btn as HTMLElement).dataset.inspectTab as InspectTab;
        this.onRequestRender();
      });
    });

    root.querySelector('[data-mut-confirm-backdrop]')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.stopAutoRollMutation();
        this.pendingMutationConfirm = null;
        this.onRequestRender();
      }
    });

    root.querySelectorAll('[data-inspect-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = (btn as HTMLElement).dataset.inspectAction;
        if (act === 'exit') {
          audio.playSfx('ui-close');
          this.stopAutoRollMutation();
          this.pendingMutationConfirm = null;
          this.onOpenPlotInspector(null);
        } else if (act === 'pickup') {
          audio.playSfx('place-chibi');
          this.stopAutoRollMutation();
          this.pendingMutationConfirm = null;
          this.state.removeMinerFromPlot(slot);
          this.onOpenPlotInspector(null);
        } else if (act === 'prev' || act === 'next') {
          const occupied = this.state.plotMiners
            .map((id, idx) => (id ? idx : -1))
            .filter((idx) => idx >= 0);
          if (occupied.length <= 1) return;
          audio.playSfx('ui-tab');
          this.stopAutoRollMutation();
          this.pendingMutationConfirm = null;
          const pos = occupied.indexOf(slot);
          const nextIdx =
            act === 'next'
              ? occupied[(pos + 1) % occupied.length]
              : occupied[(pos - 1 + occupied.length) % occupied.length];
          this.onOpenPlotInspector(nextIdx);
        } else if (act === 'up-dmg' || act === 'up-spd' || act === 'up-mine') {
          const maxSteps = this.buyMode === '1' ? 1 : this.buyMode === '10' ? 10 : 100;
          let bought = 0;
          for (let i = 0; i < maxSteps; i++) {
            const ok =
              act === 'up-dmg'
                ? this.state.upgradePlotDamage(slot)
                : act === 'up-spd'
                  ? this.state.upgradePlotSpeed(slot)
                  : this.state.upgradePlotMiningSpeed(slot);
            if (!ok) break;
            bought += 1;
          }
          if (bought === 0) {
            audio.playSfx('ui-error');
            this.pushToast('Not enough Cash!');
          } else {
            audio.playSfx('upgrade');
            this.onRequestRender();
          }
        } else if (act === 'roll-mut') {
          const unit = this.state.getPlotUnit(slot);
          const stats = this.state.getPlotUnitStats(slot);
          if (!unit || !stats) return;
          if (this.state.gems < stats.mutationCost) {
            audio.playSfx('ui-error');
            this.pushToast('Not enough Gems!');
            return;
          }
          if (isHighTierMutation(unit.mutationId)) {
            audio.playSfx('ui-tab');
            this.pendingMutationConfirm = {
              slot,
              mutId: unit.mutationId,
              mode: 'overwrite',
            };
            this.onRequestRender();
            return;
          }
          this.executeMutationRoll(slot);
        } else if (act === 'toggle-auto-mut') {
          if (this.autoRollMutSlot !== null) {
            this.stopAutoRollMutation();
            audio.playSfx('ui-close');
            this.onRequestRender();
            return;
          }
          const unit = this.state.getPlotUnit(slot);
          const stats = this.state.getPlotUnitStats(slot);
          if (!unit || !stats) return;
          if (this.state.gems < stats.mutationCost) {
            audio.playSfx('ui-error');
            this.pushToast('Not enough Gems!');
            return;
          }
          if (isHighTierMutation(unit.mutationId)) {
            audio.playSfx('ui-tab');
            this.pendingMutationConfirm = {
              slot,
              mutId: unit.mutationId,
              mode: 'overwrite',
            };
            this.onRequestRender();
            return;
          }
          this.startAutoRollMutation(slot);
        } else if (act === 'mut-stop') {
          this.stopAutoRollMutation();
          audio.playSfx('ui-close');
          this.pendingMutationConfirm = null;
          this.onRequestRender();
        } else if (act === 'mut-continue') {
          this.executeMutationRoll(slot);
        }
      });
    });

    root.querySelectorAll<HTMLElement>('[data-buy-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.buyMode as UpgradeBuyMode | undefined;
        if (mode && mode !== this.buyMode) {
          this.buyMode = mode;
          audio.playSfx('ui-tab');
          this.onRequestRender();
        }
      });
    });

    root.querySelectorAll('[data-pickaxe-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.pickaxeId;
        if (!id) return;
        const res = this.state.buyOrEquipPickaxe(slot, id);
        if (res === 'locked') {
          audio.playSfx('ui-error');
          this.pushToast('Locked! Buy Pickaxes in Pickaxe Shop');
        } else {
          audio.playSfx('equip-pick');
          this.onRequestRender();
        }
      });
    });

    root.querySelectorAll('[data-enchant-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.enchantId;
        if (!id) return;
        if (!this.state.togglePlotEnchant(slot, id)) {
          audio.playSfx('ui-error');
          this.pushToast('Locked! Roll Enchants in Enhance Altar');
        } else {
          audio.playEnchantEquip();
          this.onRequestRender();
        }
      });
    });

    bindEnchantHoverInspector({
      root,
      cardSelector: '[data-enchant-id]',
      getEnchantId: (el) => el.dataset.enchantId,
      getCardProps: (enchantId) => {
        const unit = this.state.getPlotUnit(slot);
        return {
          owned: this.state.ownedEnchants[enchantId] || 0,
          spare: this.state.getAvailableEnchantCount(enchantId),
          equipped: unit?.enchantId === enchantId,
        };
      },
    });
  }

  public updateLiveValues(root: HTMLElement): void {
    const gemsEl = root.querySelector('[data-inspect-gems="true"] span');
    if (gemsEl) gemsEl.textContent = fmtInt(this.state.gems);
    const cashEl = root.querySelector('[data-inspect-cash="true"]');
    if (cashEl) cashEl.textContent = fmtMoney(this.state.cash);
  }
}
