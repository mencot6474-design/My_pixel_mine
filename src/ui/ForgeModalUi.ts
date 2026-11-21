import { audio } from '../audio/AudioManager';
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
  rarityCardClasses,
  rarityVars,
  renderEmptyInspectorPanel,
  renderInspectorPanel,
  renderModalShell,
  renderRarityBadgeHtml,
  TW_MODAL_GRID_BASE,
  TW_SHOP_MODAL_RESP,
  TW_TAB_BTN,
} from './HudShared';

export type ForgeTab = 'all' | RelicCategory;

const VALID_FORGE_TABS = new Set<ForgeTab>(['all', 'world', 'weather', 'tower']);
const FORGE_ACTIONS = new Set([
  'forge-tab',
  'inspect-forge',
  'forge-ore-info',
  'forge-ore-info-close',
  'forge-craft',
  'forge-equip-toggle',
  'forge-unequip',
]);

export class ForgeModalUi {
  public forgeTab: ForgeTab = 'all';
  public inspectedRelicId: string | null = RELICS[0]?.id ?? null;
  public inspectedOreSourceId: string | null = null;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onRequestRender: () => void
  ) {}

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
          <div class="h-[52px] flex items-center gap-2.5 px-2.5 rounded-xl border-2 border-dashed border-[#14111d]/35 bg-[#fcecc8] min-w-0">
            <div class="w-9 h-9 rounded-lg bg-[#fff8e7] border-2 border-[#14111d] flex items-center justify-center text-[#5b526e] text-[12px] font-black shrink-0">${idx + 1}</div>
            <div class="flex flex-col min-w-0">
              <span class="text-[11px] font-black text-[#14111d] truncate">Empty Relic Slot</span>
              <span class="text-[10px] font-bold text-[#5b526e] truncate">Craft &amp; equip below</span>
            </div>
          </div>
        `;
      }
      const border = RARITY_BORDER[def.rarity];
      return `
        <button
          class="mam-sheen-hover relative overflow-hidden h-[52px] flex items-center gap-2.5 px-2.5 rounded-xl border-2 border-[#14111d] bg-[#ffffff] hover:bg-[#fef08a] transition-[transform,filter,background-color] duration-150 ease-out hover:scale-[0.98] active:scale-[0.96] cursor-pointer min-w-0 text-left"
          data-action="forge-unequip"
          data-id="${def.id}"
          title="Click to unequip ${def.name}"
        >
          <div class="w-9 h-9 rounded-lg bg-[#fcecc8] border-2 border-[#14111d] flex items-center justify-center shrink-0 p-0.5" style="border-color:${border}">
            <img src="${assetUrl(def.iconPath)}" alt="${def.name}" class="w-full h-full object-contain" />
          </div>
          <div class="flex flex-col min-w-0 flex-1">
            <span class="text-[11px] font-black text-[#14111d] truncate">${def.name}</span>
            <span class="text-[10px] font-bold text-[#b45309] truncate">${formatRelicEffects(def)[0] ?? ''}</span>
          </div>
          <span class="mam-pill-xs bg-[#ff3b5c] text-white">✕</span>
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
        const statusPill = equipped
          ? `<div class="w-full mt-auto mam-pill bg-[#2ee59d] text-[#14111d] uppercase tracking-wide">Equipped</div>`
          : crafted
            ? `<div class="w-full mt-auto mam-pill bg-[#bae6fd] text-[#14111d] uppercase tracking-wide">Owned</div>`
            : craftable
              ? `<div class="w-full mt-auto mam-pill bg-[#fde047] text-[#14111d] uppercase tracking-wide">⚒️ Ready</div>`
              : `<div class="w-full mt-auto mam-pill bg-[#fcecc8] text-[#5b526e] uppercase tracking-wide">Locked</div>`;
        return `
          <div
            class="${rarityCardClasses(
              relic.rarity,
              `${inspected ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : ''} ${
                !crafted && !craftable ? 'opacity-90' : ''
              }`
            )} !aspect-auto min-h-[158px] pt-2.5 px-2 pb-2 gap-1.5 !justify-start"
            style="${rarityVars(relic.rarity)}"
            data-action="inspect-forge"
            data-id="${relic.id}"
            title="${relic.name}"
          >
            <div class="mam-card-art !relative !inset-auto w-full h-[62px] shrink-0 flex items-center justify-center">
              <img src="${assetUrl(relic.iconPath)}" alt="${relic.name}" class="w-[54px] h-[54px] object-contain" />
            </div>
            <div class="w-full flex flex-col items-center gap-0.5 min-w-0">
              <div class="w-full px-0.5 text-center text-[12px] font-black leading-[1.18] text-[#14111d] whitespace-nowrap overflow-hidden text-ellipsis">${relic.name}</div>
              <div class="w-full px-0.5 text-center text-[10.5px] font-extrabold leading-[1.15] text-[#b45309] whitespace-nowrap overflow-hidden text-ellipsis">${primaryEffect}</div>
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
          <span class="text-[11px] font-black text-[#b45309]">Equipped Relics (${equippedIds.length}/${MAX_EQUIPPED_RELICS}) · Crafted (${this.state.craftedRelics.size}/${RELICS.length})</span>
          <span class="text-[11px] font-bold text-[#5b526e]">Uses ores from Bag &amp; Chest</span>
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
      'text-[#059669]',
    ]);
    stats.push(['Status', equipped ? 'Equipped' : crafted ? 'Crafted' : 'Locked', equipped ? 'text-[#059669]' : 'text-[#b45309]']);

    const ingredientsHtml = relic.ingredients
      .map((ing) => {
        const ore = getOreById(ing.oreId);
        const owned = this.state.getTotalOwnedOreCount(ing.oreId);
        const met = owned >= ing.amount;
        const infoActive = this.inspectedOreSourceId === ing.oreId;
        return `
          <div class="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-[#fcecc8] border-2 ${infoActive ? 'border-[#0284c7] bg-[#bae6fd]' : 'border-[#14111d]'}">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="w-5 h-5 shrink-0 flex items-center justify-center [&>img]:w-5 [&>img]:h-5 [&>svg]:w-5 [&>svg]:h-5">${ore ? oreIconSvg(ore.color, ore.secondaryColor, ore.rarity, ore.id, ore.id) : ''}</span>
              <span class="text-[11px] font-black text-[#14111d] truncate">${ore?.name ?? ing.oreId}</span>
              <button
                type="button"
                class="w-[16px] h-[16px] rounded-full border border-[#14111d] shrink-0 flex items-center justify-center text-[9.5px] font-black leading-none cursor-pointer transition-[transform,filter,background-color] duration-150 ease-out hover:scale-115 active:scale-90 ${
                  infoActive
                    ? 'bg-[#38bdf8] text-[#14111d]'
                    : 'bg-[#ffffff] text-[#14111d] hover:bg-[#fde047]'
                }"
                data-action="forge-ore-info"
                data-ore-id="${ing.oreId}"
                title="Where to find ${ore?.name ?? ing.oreId}"
                aria-label="Where to find ${ore?.name ?? ing.oreId}"
              >?</button>
            </div>
            <span class="text-[11px] font-black shrink-0 ${met ? 'text-[#059669]' : 'text-[#dc2626]'}">${fmtInt(owned)}/${fmtInt(ing.amount)}</span>
          </div>
        `;
      })
      .join('');

    const gemMet = this.state.gems >= relic.gemCost;
    const recipeBlock = crafted
      ? `<div class="px-2.5 py-2 rounded-xl bg-[#d1fae5] border-2 border-[#14111d] text-[11px] font-black text-[#14111d] text-center">${relic.tagline}</div>`
      : `
        <div class="w-full flex flex-col gap-1 text-left">
          <div class="text-[10px] font-black uppercase tracking-wider text-[#5b526e]">Forge Recipe</div>
          ${ingredientsHtml}
          <div class="flex items-center justify-between px-2 py-1 rounded-lg bg-[#fcecc8] border-2 border-[#14111d]">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="w-5 h-5 shrink-0 flex items-center justify-center [&>img]:w-[18px] [&>img]:h-[18px]">${hudIconHtml('gem', 18, 'Gems')}</span>
              <span class="text-[11px] font-black text-[#0284c7]">Gems</span>
            </div>
            <span class="text-[11px] font-black ${gemMet ? 'text-[#059669]' : 'text-[#dc2626]'}">${fmtInt(this.state.gems)}/${fmtInt(relic.gemCost)}</span>
          </div>
        </div>
      `;

    const orePopupHtml = this.renderOreSourcePopup();

    let actionBtn = '';
    if (!crafted) {
      actionBtn = `
        <button
          class="mam-sheen-hover relative overflow-hidden w-full h-[38px] rounded-xl border-2 text-[13px] font-black transition-[transform,filter] duration-150 ease-out ${
            canCraft
              ? 'border-[#14111d] bg-[#fde047] text-[#14111d] cursor-pointer hover:scale-[0.98] active:scale-[0.95]'
              : 'disabled border-[#94a3b8] bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
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
          class="mam-sheen-hover relative overflow-hidden w-full h-[38px] rounded-xl border-2 border-[#14111d] bg-[#ff3b5c] text-white text-[13px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.98] active:scale-[0.95]"
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
          class="mam-sheen-hover relative overflow-hidden w-full h-[38px] rounded-xl border-2 text-[13px] font-black transition-[transform,filter] duration-150 ease-out ${
            slotsFull
              ? 'disabled border-[#94a3b8] bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
              : 'border-[#14111d] bg-[#2ee59d] text-[#14111d] cursor-pointer hover:scale-[0.98] active:scale-[0.95]'
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
    const inBag = this.state.ores[ore.id] || 0;
    const inChest = this.state.chestOres[ore.id] || 0;

    let locationHtml = '';
    if (weatherOre) {
      const weatherDef = getWeatherById(weatherOre.weatherId);
      locationHtml = `
        <div class="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#e0f2fe] border-2 border-[#14111d] text-left">
          <span class="w-7 h-7 shrink-0 flex items-center justify-center [&>img]:w-7 [&>img]:h-7">${weatherIconHtml(weatherDef.id, 28, weatherDef.name)}</span>
          <div class="flex flex-col min-w-0">
            <span class="text-[11px] font-black text-[#0369a1] leading-tight">${weatherDef.name} Weather</span>
            <span class="text-[10.5px] font-bold text-[#14111d] leading-tight mt-0.5">Break <b>${weatherOre.meteorName}</b> in Mine Pit</span>
          </div>
        </div>
        <div class="text-[10.5px] font-bold text-[#475569] text-left leading-snug">
          • Drops guaranteed from its Weather Meteor.<br/>
          • Enable <b>Auto Meteor</b> on the top-left Weather HUD!
        </div>
      `;
    } else {
      const worldDef = getWorldById(ore.worldId);
      const worldNum = getWorldIndex(ore.worldId) + 1;
      const unlocked = this.state.unlockedWorlds.includes(ore.worldId);
      locationHtml = `
        <div class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[#fcecc8] border-2 border-[#14111d] text-left">
          <div class="flex flex-col min-w-0">
            <span class="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Mine Location</span>
            <span class="text-[12px] font-black text-[#14111d] leading-tight mt-0.5">World ${worldNum} · ${worldDef.name}</span>
          </div>
          <span class="mam-pill uppercase ${unlocked ? 'bg-[#bbf7d0] text-[#14532d]' : 'bg-[#fecdd3] text-[#881337]'}">
            ${unlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-1.5 text-left">
          <div class="px-2 py-1.5 rounded-lg bg-[#fff8e7] border-2 border-[#14111d]">
            <div class="text-[9.5px] font-black uppercase text-[#64748b]">Drop Chance</div>
            <div class="text-[12px] font-black text-[#14111d]">${ore.chancePct}%</div>
          </div>
          <div class="px-2 py-1.5 rounded-lg bg-[#fff8e7] border-2 border-[#14111d]">
            <div class="text-[9.5px] font-black uppercase text-[#64748b]">Sell Value</div>
            <div class="text-[12px] font-black text-[#15803d]">${fmtMoney(ore.sellValue)}</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="absolute inset-0 z-30 bg-[#14111d]/55 flex items-center justify-center p-2.5 rounded-xl" data-action="forge-ore-info-close">
        <div class="w-full rounded-xl border-[3px] border-[#14111d] bg-[#fff8e7] p-3 flex flex-col gap-2" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-7 h-7 shrink-0 flex items-center justify-center [&>img]:w-7 [&>img]:h-7 [&>svg]:w-7 [&>svg]:h-7">${oreIconSvg(ore.color, ore.secondaryColor, ore.rarity, ore.id, ore.id)}</span>
              <div class="flex flex-col items-start gap-0.5 min-w-0">
                <span class="text-[12.5px] font-black text-[#14111d] truncate max-w-full">${ore.name}</span>
                ${renderRarityBadgeHtml(ore.rarity, 'is-compact !ml-0')}
              </div>
            </div>
            <button type="button" class="w-6 h-6 rounded-lg bg-[#f43f5e] border-2 border-[#14111d] hover:bg-[#e11d48] text-white text-[11px] font-black cursor-pointer shrink-0 transition-transform duration-150 hover:scale-110 active:scale-90" data-action="forge-ore-info-close">✕</button>
          </div>
          ${locationHtml}
          <div class="flex items-center justify-between px-2 py-1 rounded-lg bg-white border-2 border-[#14111d] text-[10.5px] font-bold text-[#475569]">
            <span>Bag: <b class="text-[#14111d]">${fmtInt(inBag)}</b></span>
            <span>Chest: <b class="text-[#14111d]">${fmtInt(inChest)}</b></span>
          </div>
        </div>
      </div>
    `;
  }

  public handleAction(
    action: string | undefined,
    dataset: { id?: string; tab?: string; oreId?: string }
  ): boolean {
    if (action === 'forge-tab') {
      audio.playSfx('ui-tab');
      const nextTab = dataset.tab as ForgeTab | undefined;
      this.forgeTab = nextTab && VALID_FORGE_TABS.has(nextTab) ? nextTab : 'all';
      this.onRequestRender();
      return true;
    }
    if (action === 'inspect-forge') {
      audio.playSfx('ui-click');
      this.inspectedRelicId = dataset.id ?? null;
      this.inspectedOreSourceId = null;
      this.onRequestRender();
      return true;
    }
    if (action === 'forge-ore-info') {
      audio.playSfx('ui-click');
      const oreId = dataset.oreId ?? null;
      this.inspectedOreSourceId = this.inspectedOreSourceId === oreId ? null : oreId;
      this.onRequestRender();
      return true;
    }
    if (action === 'forge-ore-info-close') {
      audio.playSfx('ui-close');
      this.inspectedOreSourceId = null;
      this.onRequestRender();
      return true;
    }
    if (action === 'forge-craft') {
      const id = dataset.id;
      if (id && this.state.craftRelic(id)) {
        audio.playSfx('coin-alt');
        this.pushToast('Relic forged!');
        this.onRequestRender();
      } else {
        audio.playSfx('ui-error');
        this.pushToast('Missing materials or Gems!');
      }
      return true;
    }
    if (action === 'forge-equip-toggle' || action === 'forge-unequip') {
      const id = dataset.id;
      if (id) {
        const res = this.state.toggleEquipRelic(id);
        if (res === 'equipped') {
          audio.playSfx('ui-open');
          this.pushToast('Relic equipped!');
        } else if (res === 'unequipped') {
          audio.playSfx('ui-close');
          this.pushToast('Relic unequipped');
        } else if (res === 'full') {
          audio.playSfx('ui-error');
          this.pushToast('All 3 Relic slots full!');
        }
        this.onRequestRender();
      }
      return true;
    }
    return false;
  }

  public bindEvents(modalRoot: HTMLElement): void {
    modalRoot.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
      const action = el.dataset.action;
      if (!action || !FORGE_ACTIONS.has(action)) return;
      el.addEventListener('click', (e) => {
        if (action === 'forge-ore-info-close') e.stopPropagation();
        this.handleAction(action, {
          id: el.dataset.id,
          tab: el.dataset.tab,
          oreId: el.dataset.oreId,
        });
      });
    });
  }
}
