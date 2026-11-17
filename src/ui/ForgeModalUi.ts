import { assetUrl } from '../game/AssetUrl';
import {
  getOreById,
  getWorldById,
  getWorldIndex,
  RARITY_BORDER,
  WEATHER_ORES,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney } from '../game/NumberFormat';
import {
  formatRelicEffects,
  getRelicById,
  MAX_EQUIPPED_RELICS,
  RelicCategory,
  RELICS,
} from '../game/RelicData';
import { getWeatherById } from '../game/WeatherData';
import { hudIconHtml, oreIconSvg, weatherIconHtml } from './HudIcons';
import {
  applyInspectRing,
  rarityCardClasses,
  rarityVars,
  renderEmptyInspectorPanel,
  renderInspectorPanel,
  renderModalShell,
  TW_MODAL_GRID_BASE,
  TW_SHOP_MODAL_RESP,
  TW_TAB_BTN,
} from './HudShared';

export type ForgeTab = 'all' | RelicCategory;

export class ForgeModalUi {
  public forgeTab: ForgeTab = 'all';
  public inspectedRelicId: string | null = RELICS[0]?.id ?? null;
  public inspectedOreSourceId: string | null = null;

  constructor(private readonly state: GameState) {}

  public resetInspect(): void {
    this.inspectedOreSourceId = null;
    if (!this.inspectedRelicId || !getRelicById(this.inspectedRelicId)) {
      this.inspectedRelicId = RELICS[0]?.id ?? null;
    }
  }

  public renderForgeModal(): string {
    const equippedIds = this.state.equippedRelics;
    const slotsHtml = Array.from({ length: MAX_EQUIPPED_RELICS }, (_, idx) => {
      const relicId = equippedIds[idx];
      const def = relicId ? getRelicById(relicId) : undefined;
      if (!def) {
        return `
          <div class="h-[52px] flex items-center gap-2.5 px-2.5 rounded-xl border border-dashed border-white/18 bg-white/[0.03] min-w-0">
            <div class="w-9 h-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-[#64748b] text-[12px] font-black shrink-0">${idx + 1}</div>
            <div class="flex flex-col min-w-0">
              <span class="text-[11px] font-black text-[#94a3b8] truncate">Empty Relic Slot</span>
              <span class="text-[10px] font-bold text-[#64748b] truncate">Craft &amp; equip below</span>
            </div>
          </div>
        `;
      }
      const border = RARITY_BORDER[def.rarity];
      return `
        <button
          class="mam-sheen-hover relative overflow-hidden h-[52px] flex items-center gap-2.5 px-2.5 rounded-xl border bg-white/[0.06] hover:bg-white/[0.11] transition-[transform,filter,background-color] duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.97] cursor-pointer min-w-0 text-left"
          style="border-color:${border}88;"
          data-action="forge-unequip"
          data-id="${def.id}"
          title="Click to unequip ${def.name}"
        >
          <div class="w-9 h-9 rounded-lg bg-black/40 border border-white/12 flex items-center justify-center shrink-0 p-0.5">
            <img src="${assetUrl(def.iconPath)}" alt="${def.name}" class="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]" />
          </div>
          <div class="flex flex-col min-w-0 flex-1">
            <span class="text-[11px] font-black text-white truncate">${def.name}</span>
            <span class="text-[10px] font-bold text-[#fbbf24] truncate">${formatRelicEffects(def)[0] ?? ''}</span>
          </div>
          <span class="text-[10px] font-black text-rose-300/90 px-1.5 py-0.5 rounded bg-rose-500/15 shrink-0">✕</span>
        </button>
      `;
    }).join('');

    const filtered = RELICS.filter((r) => this.forgeTab === 'all' || r.category === this.forgeTab);
    const cards = filtered
      .map((relic) => {
        const crafted = this.state.hasCraftedRelic(relic.id);
        const equipped = this.state.isRelicEquipped(relic.id);
        const craftable = !crafted && this.state.canCraftRelic(relic.id);
        const inspected = this.inspectedRelicId === relic.id;
        const primaryEffect = formatRelicEffects(relic)[0] ?? '';
        const bgCls =
          relic.rarity === 'rainbow' || relic.rarity === 'exotic' || relic.rarity === 'secret'
            ? ''
            : 'bg-[radial-gradient(circle_at_50%_26%,var(--rarity-bg,rgba(71,85,105,0.28)),rgba(20,24,31,0.96)_72%)]';
        const statusPill = equipped
          ? `<div class="w-full mt-auto py-1 rounded-lg bg-[#22c55e]/22 border border-[#4ade80]/60 text-[#86efac] text-[10.5px] font-black text-center uppercase tracking-wide">Equipped</div>`
          : crafted
            ? `<div class="w-full mt-auto py-1 rounded-lg bg-[#38bdf8]/18 border border-[#38bdf8]/50 text-[#7dd3fc] text-[10.5px] font-black text-center uppercase tracking-wide">Owned</div>`
            : craftable
              ? `<div class="w-full mt-auto py-1 rounded-lg bg-[linear-gradient(135deg,#f59e0b,#d97706)] text-[#1c1917] text-[10.5px] font-black text-center uppercase tracking-wide shadow-[0_2px_10px_rgba(245,158,11,0.4)]">⚒️ Ready</div>`
              : `<div class="w-full mt-auto py-1 rounded-lg bg-white/[0.05] border border-white/10 text-[#94a3b8] text-[10.5px] font-black text-center uppercase tracking-wide">Locked</div>`;
        return `
          <div
            class="${rarityCardClasses(
              relic.rarity,
              `${inspected ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_14px_rgba(56,189,248,0.45)]' : ''} ${
                !crafted && !craftable ? 'opacity-85' : ''
              }`
            )} !aspect-auto min-h-[158px] pt-2.5 px-2 pb-2 gap-1.5 !justify-start ${bgCls}"
            style="${rarityVars(relic.rarity)}"
            data-action="inspect-forge"
            data-id="${relic.id}"
            title="${relic.name}"
          >
            <div class="mam-card-art !relative !inset-auto w-full h-[62px] shrink-0 flex items-center justify-center">
              <img src="${assetUrl(relic.iconPath)}" alt="${relic.name}" class="w-[54px] h-[54px] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.75)]" />
            </div>
            <div class="w-full flex flex-col items-center gap-0.5 min-w-0">
              <div class="w-full px-0.5 text-center text-[12px] font-black leading-[1.18] text-white whitespace-nowrap overflow-hidden text-ellipsis mam-outline-sm">${relic.name}</div>
              <div class="w-full px-0.5 text-center text-[10.5px] font-extrabold leading-[1.15] text-[#fde68a] whitespace-nowrap overflow-hidden text-ellipsis mam-outline-sm">${primaryEffect}</div>
            </div>
            ${statusPill}
          </div>
        `;
      })
      .join('');

    const tabsHtml = `
      <div class="flex items-center gap-1.5 flex-wrap">
        <button class="${TW_TAB_BTN} ${this.forgeTab === 'all' ? 'active' : ''}" data-action="forge-tab" data-tab="all">All (${RELICS.length})</button>
        <button class="${TW_TAB_BTN} ${this.forgeTab === 'world' ? 'active' : ''}" data-action="forge-tab" data-tab="world">World (6)</button>
        <button class="${TW_TAB_BTN} ${this.forgeTab === 'weather' ? 'active' : ''}" data-action="forge-tab" data-tab="weather">Weather (3)</button>
        <button class="${TW_TAB_BTN} ${this.forgeTab === 'tower' ? 'active' : ''}" data-action="forge-tab" data-tab="tower">Tower (3)</button>
      </div>
    `;

    return renderModalShell({
      title: 'Relic Forge',
      theme: 'forge',
      iconHtml: `<img src="${assetUrl('/relics/ember_gauntlet.webp')}" alt="Relic Forge" class="w-5 h-5 object-contain" />`,
      boxClass: `w-[940px] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: `
        <div class="flex items-center justify-between gap-2 w-full flex-wrap">
          <span class="text-[11px] font-bold text-[#fde68a]">Equipped Relics (${equippedIds.length}/${MAX_EQUIPPED_RELICS}) · Crafted (${this.state.craftedRelics.size}/${RELICS.length})</span>
          <span class="text-[11px] font-bold text-[#94a3b8]">Uses ores from Bag &amp; Chest</span>
        </div>
      `,
      bodyHtml: `
        <div class="grid grid-cols-3 @max-[720px]:grid-cols-1 gap-2 w-full">
          ${slotsHtml}
        </div>
        ${tabsHtml}
        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto mam-no-scrollbar">
          <div class="${TW_MODAL_GRID_BASE} mam-no-scrollbar grid-cols-4 gap-2.5 flex-1 min-h-[220px] @max-[920px]:flex-none @max-[920px]:max-h-[340px] p-0.5 @max-[720px]:grid-cols-2">${cards}</div>
          <div class="mam-inspector-well mam-no-scrollbar relative w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-forge-inspector="true">${this.renderForgeInspector()}</div>
        </div>
      `,
    });
  }

  public renderForgeInspector(): string {
    const relic = this.inspectedRelicId ? getRelicById(this.inspectedRelicId) : undefined;
    if (!relic) return renderEmptyInspectorPanel('Select a Relic to inspect its recipe and buffs.');

    const crafted = this.state.hasCraftedRelic(relic.id);
    const equipped = this.state.isRelicEquipped(relic.id);
    const canCraft = this.state.canCraftRelic(relic.id);
    const effectLines = formatRelicEffects(relic);
    const stats: Array<[string, string, string?]> = effectLines.map((line, i) => [
      `Bonus ${i + 1}`,
      line,
      'text-[#4ade80]',
    ]);
    stats.push(['Status', equipped ? 'Equipped' : crafted ? 'Crafted' : 'Locked', equipped ? 'text-[#4ade80]' : 'text-[#fbbf24]']);

    const ingredientsHtml = relic.ingredients
      .map((ing) => {
        const ore = getOreById(ing.oreId);
        const owned = this.state.getTotalOwnedOreCount(ing.oreId);
        const met = owned >= ing.amount;
        const infoActive = this.inspectedOreSourceId === ing.oreId;
        return `
          <div class="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border ${infoActive ? 'border-sky-400/60 bg-sky-500/10' : 'border-white/10'}">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="w-5 h-5 shrink-0 flex items-center justify-center [&>img]:w-5 [&>img]:h-5 [&>svg]:w-5 [&>svg]:h-5">${ore ? oreIconSvg(ore.color, ore.secondaryColor, ore.rarity, ore.id, ore.id) : ''}</span>
              <span class="text-[11px] font-bold text-white truncate">${ore?.name ?? ing.oreId}</span>
              <button
                type="button"
                class="w-[16px] h-[16px] rounded-full border shrink-0 flex items-center justify-center text-[9.5px] font-black leading-none cursor-pointer transition-[transform,filter,background-color] duration-150 ease-out hover:scale-115 active:scale-90 ${
                  infoActive
                    ? 'border-sky-300 bg-sky-400 text-[#082f49]'
                    : 'border-sky-400/45 bg-sky-500/15 text-sky-300 hover:bg-sky-500/30'
                }"
                data-action="forge-ore-info"
                data-ore-id="${ing.oreId}"
                title="Where to find ${ore?.name ?? ing.oreId}"
                aria-label="Where to find ${ore?.name ?? ing.oreId}"
              >?</button>
            </div>
            <span class="text-[11px] font-black shrink-0 ${met ? 'text-[#4ade80]' : 'text-rose-400'}">${fmtInt(owned)}/${fmtInt(ing.amount)}</span>
          </div>
        `;
      })
      .join('');

    const gemMet = this.state.gems >= relic.gemCost;
    const recipeBlock = crafted
      ? `<div class="px-2.5 py-2 rounded-xl bg-[#22c55e]/12 border border-[#22c55e]/35 text-[11px] font-bold text-[#86efac] text-center">${relic.tagline}</div>`
      : `
        <div class="w-full flex flex-col gap-1 text-left">
          <div class="text-[10px] font-black uppercase tracking-wider text-[#94a3b8]">Forge Recipe</div>
          ${ingredientsHtml}
          <div class="flex items-center justify-between px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="w-5 h-5 shrink-0 flex items-center justify-center [&>img]:w-[18px] [&>img]:h-[18px]">${hudIconHtml('gem', 18, 'Gems')}</span>
              <span class="text-[11px] font-bold text-[#67e8f9]">Gems</span>
            </div>
            <span class="text-[11px] font-black ${gemMet ? 'text-[#4ade80]' : 'text-rose-400'}">${fmtInt(this.state.gems)}/${fmtInt(relic.gemCost)}</span>
          </div>
        </div>
      `;

    const orePopupHtml = this.renderOreSourcePopup();

    let actionBtn = '';
    if (!crafted) {
      actionBtn = `
        <button
          class="mam-sheen-hover relative overflow-hidden w-full h-[38px] rounded-xl border text-[13px] font-black transition-[transform,filter,box-shadow] duration-150 ease-out ${
            canCraft
              ? 'border-[#fbbf24]/70 bg-[linear-gradient(135deg,#f59e0b,#d97706)] text-[#1c1917] shadow-[0_6px_18px_-4px_rgba(245,158,11,0.55)] cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-110 active:translate-y-0.5 active:scale-[0.96]'
              : 'disabled border-white/15 bg-white/[0.06] text-[#94a3b8] cursor-not-allowed'
          }"
          data-action="forge-craft"
          data-id="${relic.id}"
          ${canCraft ? '' : 'disabled'}
        >
          ${canCraft ? '⚒️ Forge Relic' : 'Need Materials'}
        </button>
      `;
    } else if (equipped) {
      actionBtn = `
        <button
          class="mam-sheen-hover relative overflow-hidden w-full h-[38px] rounded-xl border border-rose-400/55 bg-rose-500/20 text-rose-200 text-[13px] font-black cursor-pointer transition-[transform,filter,background-color] duration-150 ease-out hover:-translate-y-0.5 hover:bg-rose-500/30 hover:brightness-110 active:translate-y-0.5 active:scale-[0.96]"
          data-action="forge-equip-toggle"
          data-id="${relic.id}"
        >
          Unequip Relic
        </button>
      `;
    } else {
      const slotsFull = this.state.equippedRelics.length >= MAX_EQUIPPED_RELICS;
      actionBtn = `
        <button
          class="mam-sheen-hover relative overflow-hidden w-full h-[38px] rounded-xl border text-[13px] font-black transition-[transform,filter,box-shadow] duration-150 ease-out ${
            slotsFull
              ? 'disabled border-white/15 bg-white/[0.06] text-[#94a3b8] cursor-not-allowed'
              : 'border-[#4ade80]/70 bg-[linear-gradient(135deg,#22c55e,#059669)] text-white shadow-[0_6px_18px_-4px_rgba(34,197,94,0.45)] cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-110 active:translate-y-0.5 active:scale-[0.96]'
          }"
          data-action="forge-equip-toggle"
          data-id="${relic.id}"
          ${slotsFull ? 'disabled' : ''}
        >
          ${slotsFull ? `Slots Full (${MAX_EQUIPPED_RELICS}/${MAX_EQUIPPED_RELICS})` : 'Equip Relic'}
        </button>
      `;
    }

    return `
      ${renderInspectorPanel({
        rarity: relic.rarity,
        title: relic.name,
        subtitle: `${relic.category.toUpperCase()} RELIC`,
        artHtml: `<img src="${assetUrl(relic.iconPath)}" alt="${relic.name}" class="w-[82px] h-[82px] object-contain" />`,
        stats,
        actionHtml: `${recipeBlock}${actionBtn}`,
      })}
      ${orePopupHtml}
    `;
  }

  private renderOreSourcePopup(): string {
    if (!this.inspectedOreSourceId) return '';
    const ore = getOreById(this.inspectedOreSourceId);
    if (!ore) return '';
    const weatherOre = WEATHER_ORES.find((w) => w.id === ore.id);
    const borderColor = RARITY_BORDER[ore.rarity];
    const inBag = this.state.ores[ore.id] || 0;
    const inChest = this.state.chestOres[ore.id] || 0;

    let locationHtml = '';
    if (weatherOre) {
      const weatherDef = getWeatherById(weatherOre.weatherId);
      locationHtml = `
        <div class="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-sky-500/12 border border-sky-400/35 text-left">
          <span class="w-7 h-7 shrink-0 flex items-center justify-center [&>img]:w-7 [&>img]:h-7">${weatherIconHtml(weatherDef.id, 28, weatherDef.name)}</span>
          <div class="flex flex-col min-w-0">
            <span class="text-[11px] font-black text-sky-300 leading-tight">${weatherDef.name} Weather</span>
            <span class="text-[10.5px] font-bold text-[#e2e8f0] leading-tight mt-0.5">Break <b>${weatherOre.meteorName}</b> in Mine Pit</span>
          </div>
        </div>
        <div class="text-[10.5px] font-bold text-[#94a3b8] text-left leading-snug">
          • Drops guaranteed from its Weather Meteor.<br/>
          • Enable <b>Auto Meteor</b> on the top-left Weather HUD!
        </div>
      `;
    } else {
      const worldDef = getWorldById(ore.worldId);
      const worldNum = getWorldIndex(ore.worldId) + 1;
      const unlocked = this.state.unlockedWorlds.includes(ore.worldId);
      locationHtml = `
        <div class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-left">
          <div class="flex flex-col min-w-0">
            <span class="text-[10px] font-black uppercase tracking-wider text-[#94a3b8]">Mine Location</span>
            <span class="text-[12px] font-black leading-tight mt-0.5" style="color:${worldDef.iconColor}">World ${worldNum} · ${worldDef.name}</span>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase shrink-0 ${unlocked ? 'bg-[#22c55e]/20 text-[#4ade80] border border-[#4ade80]/40' : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'}">
            ${unlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-1.5 text-left">
          <div class="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10">
            <div class="text-[9.5px] font-bold uppercase text-[#94a3b8]">Drop Chance</div>
            <div class="text-[12px] font-black text-white">${ore.chancePct}%</div>
          </div>
          <div class="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10">
            <div class="text-[9.5px] font-bold uppercase text-[#94a3b8]">Sell Value</div>
            <div class="text-[12px] font-black text-[#4ade80]">${fmtMoney(ore.sellValue)}</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="absolute inset-0 z-30 bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-2.5 rounded-xl" data-action="forge-ore-info-close">
        <div class="w-full rounded-xl border bg-[#0f1422]/98 p-3 shadow-[0_14px_32px_rgba(0,0,0,0.85)] flex flex-col gap-2" style="border-color:${borderColor}99" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-7 h-7 shrink-0 flex items-center justify-center [&>img]:w-7 [&>img]:h-7 [&>svg]:w-7 [&>svg]:h-7">${oreIconSvg(ore.color, ore.secondaryColor, ore.rarity, ore.id, ore.id)}</span>
              <div class="flex flex-col items-start min-w-0">
                <span class="text-[12.5px] font-black text-white truncate max-w-full">${ore.name}</span>
                <span class="text-[9.5px] font-black uppercase" style="color:${borderColor}">${ore.rarity}</span>
              </div>
            </div>
            <button type="button" class="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-black cursor-pointer shrink-0 transition-[transform,background-color] duration-150 hover:scale-110 active:scale-90" data-action="forge-ore-info-close">✕</button>
          </div>
          ${locationHtml}
          <div class="flex items-center justify-between px-2 py-1 rounded-lg bg-black/35 border border-white/10 text-[10.5px] font-bold text-[#cbd5e1]">
            <span>Bag: <b class="text-white">${fmtInt(inBag)}</b></span>
            <span>Chest: <b class="text-white">${fmtInt(inChest)}</b></span>
          </div>
        </div>
      </div>
    `;
  }

  public updateForgeInspectorDom(modalRoot: HTMLElement): void {
    const inspector = modalRoot.querySelector<HTMLElement>('[data-forge-inspector="true"]');
    if (!inspector) return;
    inspector.innerHTML = this.renderForgeInspector();
    modalRoot.querySelectorAll<HTMLElement>('[data-action="inspect-forge"]').forEach((el) => {
      applyInspectRing(el, el.dataset.id === this.inspectedRelicId);
    });
  }
}
