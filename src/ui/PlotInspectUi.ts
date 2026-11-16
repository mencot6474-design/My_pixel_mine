import { audio } from '../audio/AudioManager';
import { getChibiById } from '../game3d/ChibiCatalog';
import {
  ENCHANTS,
  getMinerRarity,
  getMutationById,
  isHighTierMutation,
  MUTATIONS,
  PICKAXES,
  RARITY_BORDER,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney, fmtPct, fmtShort } from '../game/NumberFormat';
import { enchantAuraIconHtml, hudIconHtml, pickaxeIconHtml } from './HudIcons';
import {
  InspectTab,
  rarityVars,
  TW_INSPECT_ARROW,
  TW_INSPECT_TAB,
  TW_STAT_BTN,
  TW_STAT_CARD,
  TW_STRIP_CARD,
} from './HudShared';

export class PlotInspectUi {
  private inspectTab: InspectTab = 'stats';
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

  public render(root: HTMLElement, slot: number): void {
    const unit = this.state.getPlotUnit(slot);
    const stats = this.state.getPlotUnitStats(slot);
    const chibi = unit ? getChibiById(unit.chibiId) : null;
    if (!unit || !stats || !chibi) {
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

    root.innerHTML = `
      <button class="absolute top-4 @max-[720px]:top-2.5 left-1/2 -translate-x-1/2 px-[34px] py-[7px] rounded-[6px] border-2 border-[#7c2d12] bg-[linear-gradient(180deg,#fb923c,#ea580c)] shadow-[0_3px_0_#7c2d12] text-white text-[19px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-[140ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-[1.08] active:translate-y-0.5 active:scale-[0.97] active:shadow-[0_1px_0_#7c2d12] mam-outline-sm" data-inspect-action="exit">Exit</button>

      <div class="absolute left-7 @max-[920px]:left-3 top-[38%] @max-[920px]:top-14 -translate-y-1/2 @max-[920px]:translate-y-0 w-[245px] @max-[920px]:w-[208px] px-3.5 py-3 rounded-2xl bg-[rgba(12,16,28,0.84)] backdrop-blur-xl border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_36px_rgba(0,0,0,0.55)] flex flex-col gap-[3px]">
        <div class="text-[20px] font-black leading-[1.1] mam-outline-sm">${chibi.name}</div>
        <div class="text-[15px] font-extrabold mam-outline-sm" style="color:${rColor}">
          ${rarity[0].toUpperCase() + rarity.slice(1)} <span style="color:#fff">•</span> <span class="${mut.id === 'rainbow' ? 'mam-rainbow-text' : ''}" style="${mut.id === 'rainbow' ? '' : `color:${mut.color}`}">${mut.name}</span>
        </div>
        <div class="text-[13px] font-bold text-[#e2e8f0] mt-0.5 mam-outline-sm">
          Lv. ${unit.damageLevel} • Speed ${stats.speed} • Mining x${stats.miningMult}
        </div>
        <div class="text-[24px] font-black text-[#f87171] leading-[1.1] mt-1.5 mam-outline">${fmtShort(stats.dmg)} dmg</div>
        <div class="text-[14px] font-extrabold text-[#4ade80] mam-outline-sm">Worth ${fmtMoney(stats.worth)}</div>
        <button class="mt-2 px-3 py-1.5 rounded-[7px] border-2 border-[#7f1d1d] bg-[linear-gradient(180deg,#f87171_0%,#dc2626_55%,#991b1b_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.32),0_4px_0_#7f1d1d,0_6px_12px_rgba(0,0,0,0.4)] text-white text-[13px] font-extrabold cursor-pointer self-start transition-[transform,box-shadow] duration-100 ease-out active:translate-y-[3px] active:shadow-[0_1px_0_#7f1d1d] mam-outline-sm" data-inspect-action="pickup">Pick Up from Plot</button>
      </div>

      <button class="${TW_INSPECT_ARROW} left-[31%] @max-[920px]:left-3" data-inspect-action="prev">&lt;</button>
      <button class="${TW_INSPECT_ARROW} right-[31%] @max-[920px]:right-3" data-inspect-action="next">&gt;</button>

      <div class="absolute right-[22px] @max-[920px]:right-3 top-[48%] @max-[920px]:top-3 -translate-y-1/2 @max-[920px]:translate-y-0 flex flex-col items-end gap-1">
        <div class="flex items-center gap-1.5 text-[22px] font-black text-[#67e8f9] mam-outline-sm" data-inspect-gems="true">${hudIconHtml('gem', 24, 'Gems')} <span>${fmtInt(this.state.gems)}</span></div>
        <div class="text-[24px] font-black text-[#4ade80] mam-outline" data-inspect-cash="true">${fmtMoney(this.state.cash)}</div>
      </div>

      <div class="absolute bottom-[14px] left-1/2 -translate-x-1/2 w-[860px] max-w-[calc(100%-24px)] flex flex-col items-center gap-2 pointer-events-auto">
        <div class="grid grid-cols-[repeat(4,150px)] @max-[920px]:grid-cols-4 @max-[920px]:w-full gap-2 @max-[920px]:gap-1.5">
          <button class="${TW_INSPECT_TAB} mam-outline-sm ${this.inspectTab === 'pickaxe' ? 'active' : ''}" data-inspect-tab="pickaxe">${hudIconHtml('pickaxe', 20, 'Pickaxe')} Pickaxe</button>
          <button class="${TW_INSPECT_TAB} mam-outline-sm ${this.inspectTab === 'stats' ? 'active' : ''}" data-inspect-tab="stats">${hudIconHtml('stats', 20, 'Stats')} Stats</button>
          <button class="${TW_INSPECT_TAB} mam-outline-sm ${this.inspectTab === 'mutation' ? 'active' : ''}" data-inspect-tab="mutation">${hudIconHtml('mutation', 20, 'Mutation')} Mutation</button>
          <button class="${TW_INSPECT_TAB} mam-outline-sm ${this.inspectTab === 'enchants' ? 'active' : ''}" data-inspect-tab="enchants">${hudIconHtml('enchant', 20, 'Enchants')} Enchants</button>
        </div>

        <div class="mam-inspect-panel w-full p-2.5 rounded-2xl bg-[rgba(12,16,28,0.86)] backdrop-blur-xl border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_36px_rgba(0,0,0,0.6)] flex items-stretch gap-2 overflow-x-hidden [&.is-stats]:flex-wrap [&.is-pickaxe]:grid [&.is-pickaxe]:grid-cols-7 @max-[760px]:[&.is-pickaxe]:grid-cols-4 [&.is-pickaxe]:gap-1.5 [&.is-enchants]:grid [&.is-enchants]:grid-cols-10 @max-[760px]:[&.is-enchants]:grid-cols-5 [&.is-enchants]:gap-1.5 [&.is-mutation]:gap-1.5 @max-[760px]:[&.is-mutation]:flex-wrap [&_.mam-strip-card]:min-w-0 [&_.mam-strip-card]:w-auto [&_.mam-strip-card_.mam-card-name]:text-[11px] [&_.mam-strip-card_.mam-card-name]:leading-tight [&_.mam-strip-card_.mam-card-name]:whitespace-nowrap [&_.mam-strip-card_.mam-card-name]:overflow-hidden [&_.mam-strip-card_.mam-card-name]:text-ellipsis [&.is-mutation_.mam-strip-card]:flex-1 [&.is-mutation_.mam-strip-card]:h-[82px] [&.is-mutation_.mam-strip-card]:py-1 [&.is-mutation_.mam-strip-card]:px-0.5 [&.is-enchants_.mam-strip-card]:h-[84px] [&.is-enchants_.mam-strip-card]:py-1 [&.is-enchants_.mam-strip-card]:px-0.5 [&.is-pickaxe_.mam-strip-card]:h-[86px] [&.is-pickaxe_.mam-strip-card]:py-1 [&.is-pickaxe_.mam-strip-card]:px-0.5 ${
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
      return `
        <div class="${TW_STAT_CARD}">
          <div class="text-[14px] font-extrabold text-[#e2e8f0] mam-outline-sm">Damage Level ${unit.damageLevel} / 100</div>
          <div class="text-[16px] font-black mam-outline-sm">
            <span style="color:#ef4444">${fmtShort(stats.dmg)}</span> &gt; <span style="color:#4ade80">${fmtShort(stats.nextDmg)}</span>
          </div>
          <button class="${TW_STAT_BTN} mam-outline-sm ${dmgMax ? 'maxed' : ''}" data-inspect-action="up-dmg">
            ${dmgMax ? 'Max' : fmtMoney(stats.dmgCost)}
          </button>
        </div>
        <div class="${TW_STAT_CARD}">
          <div class="text-[14px] font-extrabold text-[#e2e8f0] mam-outline-sm">Speed Level ${unit.speedLevel} / 17</div>
          <div class="text-[16px] font-black mam-outline-sm" style="color:#4ade80">${stats.speed}</div>
          <button class="${TW_STAT_BTN} mam-outline-sm ${spdMax ? 'maxed' : ''}" data-inspect-action="up-spd">
            ${spdMax ? 'Max' : fmtMoney(stats.speedCost)}
          </button>
        </div>
        <div class="${TW_STAT_CARD}">
          <div class="text-[14px] font-extrabold text-[#e2e8f0] mam-outline-sm">Mining Speed Level ${unit.miningSpeedLevel} / 16</div>
          <div class="text-[16px] font-black mam-outline-sm" style="color:#4ade80">x${stats.miningMult}</div>
          <button class="${TW_STAT_BTN} mam-outline-sm ${minMax ? 'maxed' : ''}" data-inspect-action="up-mine">
            ${minMax ? 'Max' : fmtMoney(stats.miningCost)}
          </button>
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
            <div class="mam-outline-sm" style="font-size:15px;font-weight:900;color:#fca5a5">${m.mult}X</div>
            <div class="mam-card-qty mam-outline-sm">${fmtPct(m.chancePct)}</div>
          </div>
        `
        )
        .join('');

      return `
        ${mutCards}
        <div class="flex-[0_0_132px] py-1 px-2 flex flex-col items-center justify-center gap-1">
          <div class="mam-outline-sm ${curMut.id === 'rainbow' ? 'mam-rainbow-text' : ''}" style="font-size:18px;font-weight:900;${curMut.id === 'rainbow' ? '' : `color:${curMut.color}`}">${curMut.name}</div>
          <div class="mam-outline-sm" style="display:flex;align-items:center;gap:4px;font-size:15px;font-weight:800;color:#f9a8d4">${hudIconHtml('gem', 20, 'Gems')} ${fmtInt(stats.mutationCost)}</div>
          <button class="w-full h-9 rounded-[6px] border-2 border-[#7c2d12] bg-[linear-gradient(180deg,#fb923c,#ea580c)] shadow-[0_3px_0_#7c2d12] text-white text-[16px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-[120ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 active:translate-y-0.5 active:scale-[0.96] active:shadow-[0_1px_0_#7c2d12] mam-outline-sm" data-inspect-action="roll-mut">Roll</button>
        </div>
      `;
    }

    return ENCHANTS.map((e) => {
      const owned = this.state.ownedEnchants[e.id] || 0;
      const eq = owned > 0 && unit.enchantId === e.id;
      return `
        <div class="${TW_STRIP_CARD} ${eq ? 'equipped' : ''} ${owned <= 0 ? 'locked' : ''}" style="${rarityVars(e.rarity)}" data-enchant-id="${e.id}" title="${owned > 0 ? 'Click to Equip' : 'Locked — Obtain from Enchant Roll'}">
          ${eq ? '<span class="absolute top-0.5 right-1 text-[13px] font-black text-[#4ade80] [text-shadow:0_1px_2px_#000]">✓</span>' : ''}
          <div class="mam-card-name mam-outline-sm">${e.name}</div>
          <div class="flex-1 min-h-0 flex items-center justify-center pointer-events-none">${enchantAuraIconHtml(e.id, e.color, 36, e.name)}</div>
          <div class="mam-card-bottom">
            <span class="mam-card-qty mam-outline-sm">${owned > 0 ? `x${owned}` : 'Locked'}</span>
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
        <div class="w-[min(420px,100%)] rounded-2xl border-2 bg-[rgba(12,16,28,0.96)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_50px_rgba(0,0,0,0.75)] p-5 flex flex-col items-center gap-3.5 text-center" style="border-color:${mut.color}" data-mut-confirm-dialog="true">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[12px] font-black tracking-wide uppercase mam-outline-sm">
            <span>&#9888;&#65039;</span> ${title}
          </div>
          <div class="w-full py-3 px-4 rounded-xl bg-white/[0.05] border flex flex-col items-center gap-0.5" style="border-color:${mut.color}66">
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
      audio.playSfx('rare-fanfare', { volume: 0.7 });
      this.pendingMutationConfirm = {
        slot,
        mutId: updated.mutationId,
        mode: 'obtained',
      };
    } else {
      audio.playSfx('magic-roll', { volume: 0.55 });
      this.pendingMutationConfirm = null;
    }
    this.onRequestRender();
  }

  private bindEvents(root: HTMLElement, slot: number): void {
    root.querySelectorAll('[data-inspect-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.playSfx('ui-tab');
        this.pendingMutationConfirm = null;
        this.inspectTab = (btn as HTMLElement).dataset.inspectTab as InspectTab;
        this.onRequestRender();
      });
    });

    root.querySelector('[data-mut-confirm-backdrop]')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.pendingMutationConfirm = null;
        this.onRequestRender();
      }
    });

    root.querySelectorAll('[data-inspect-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = (btn as HTMLElement).dataset.inspectAction;
        if (act === 'exit') {
          audio.playSfx('ui-close');
          this.pendingMutationConfirm = null;
          this.onOpenPlotInspector(null);
        } else if (act === 'pickup') {
          audio.playSfx('place-chibi');
          this.pendingMutationConfirm = null;
          this.state.removeMinerFromPlot(slot);
          this.onOpenPlotInspector(null);
        } else if (act === 'prev' || act === 'next') {
          const occupied = this.state.plotMiners
            .map((id, idx) => (id ? idx : -1))
            .filter((idx) => idx >= 0);
          if (occupied.length <= 1) return;
          audio.playSfx('ui-tab');
          this.pendingMutationConfirm = null;
          const pos = occupied.indexOf(slot);
          const nextIdx =
            act === 'next'
              ? occupied[(pos + 1) % occupied.length]
              : occupied[(pos - 1 + occupied.length) % occupied.length];
          this.onOpenPlotInspector(nextIdx);
        } else if (act === 'up-dmg') {
          if (!this.state.upgradePlotDamage(slot)) {
            audio.playSfx('ui-error');
            this.pushToast('Not enough Cash!');
          } else {
            audio.playSfx('upgrade');
            this.onRequestRender();
          }
        } else if (act === 'up-spd') {
          if (!this.state.upgradePlotSpeed(slot)) {
            audio.playSfx('ui-error');
            this.pushToast('Not enough Cash!');
          } else {
            audio.playSfx('upgrade');
            this.onRequestRender();
          }
        } else if (act === 'up-mine') {
          if (!this.state.upgradePlotMiningSpeed(slot)) {
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
        } else if (act === 'mut-stop') {
          audio.playSfx('ui-close');
          this.pendingMutationConfirm = null;
          this.onRequestRender();
        } else if (act === 'mut-continue') {
          this.executeMutationRoll(slot);
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
          this.pushToast('Locked! Obtain from Enchant Roll (coming soon)');
        } else {
          audio.playSfx('magic-roll', { volume: 0.45 });
          this.onRequestRender();
        }
      });
    });
  }

  public updateLiveValues(root: HTMLElement): void {
    const gemsEl = root.querySelector('[data-inspect-gems="true"] span');
    if (gemsEl) gemsEl.textContent = fmtInt(this.state.gems);
    const cashEl = root.querySelector('[data-inspect-cash="true"]');
    if (cashEl) cashEl.textContent = fmtMoney(this.state.cash);
  }
}
