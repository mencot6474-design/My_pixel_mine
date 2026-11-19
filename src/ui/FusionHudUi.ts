import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { FUSION_RECIPES, FusionRecipeDef, getFusionRecipeById } from '../game/FusionData';
import { getMinerRarity, getOreById, RARITY_BORDER } from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import { getChibiById } from '../game3d/ChibiCatalog';
import { SceneMode } from '../game3d/MineScene3D';
import { enchantDiceIconHtml, hudIconHtml } from './HudIcons';
import { chibiPortraitHtml, renderModalShell, renderRarityBadgeHtml, TW_TOP_CENTER } from './HudShared';

const FUSION_GATE_ICON_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
  <circle cx="9" cy="12" r="5.5" stroke="#38bdf8" stroke-width="2"/>
  <circle cx="15" cy="12" r="5.5" stroke="#e879f9" stroke-width="2"/>
  <path d="M12 7.2L13.3 12L12 16.8L10.7 12L12 7.2Z" fill="#fde047"/>
</svg>`;

export class FusionHudUi {
  private selectedRecipeId: string = FUSION_RECIPES[0]?.id ?? 'fusion-glitch-cheshire';
  private fusing = false;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onRequestRender: () => void,
    private readonly onSetSceneMode: (mode: SceneMode) => void,
    private readonly onCloseModal: () => void,
    private readonly onSyncFusion3D?: (recipe: FusionRecipeDef, readyFlags: readonly boolean[]) => void,
    private readonly onTriggerFusion3D?: (recipe: FusionRecipeDef, onComplete: () => void) => void
  ) {}

  public getSelectedRecipe(): FusionRecipeDef {
    return getFusionRecipeById(this.selectedRecipeId) ?? FUSION_RECIPES[0];
  }

  public syncCurrentRecipeTo3D(): void {
    const recipe = this.getSelectedRecipe();
    const flags = recipe.requiredMiners.map(
      (ing) => this.state.getAvailableFusionMinerCount(ing.chibiId) >= ing.count
    );
    this.onSyncFusion3D?.(recipe, flags);
  }

  public resetAnimating(): void {
    this.fusing = false;
  }

  /** Choice popup shown when clicking the Plaza Altar station or Enhance dock button. */
  public renderAltarChoiceModal(): string {
    const readyFusions = this.state.getReadyFusionCount();
    const prism = getChibiById('prism-seraph');
    const fusionPreviewHtml = prism
      ? `<img src="${assetUrl(prism.poses.pose)}" alt="Chibi Fusion" class="w-[68px] h-[68px] object-contain drop-shadow-[0_4px_12px_rgba(250,204,21,0.45)]" draggable="false" />`
      : FUSION_GATE_ICON_SVG;

    const bodyHtml = `
      <div class="w-full flex flex-col gap-3">
        <div class="text-[12.5px] font-bold text-slate-300 text-center">
          Choose which Cosmic Chamber to enter through the Plaza Altar.
        </div>
        <div class="grid grid-cols-2 @max-[580px]:grid-cols-1 gap-3">
          <div class="rounded-2xl border-2 border-purple-400 bg-[linear-gradient(160deg,#231342_0%,#0d0a1f_100%)] p-4 flex flex-col items-center text-center gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_28px_rgba(0,0,0,0.65)]">
            <div class="w-[78px] h-[78px] rounded-2xl border-2 border-purple-400 bg-[radial-gradient(circle_at_50%_45%,rgba(168,85,247,0.45),#110c26_82%)] flex items-center justify-center [&>.mam-3d-icon]:w-[58px] [&>.mam-3d-icon]:h-[58px]">
              ${enchantDiceIconHtml(58)}
            </div>
            <div class="text-[19px] font-black text-white leading-tight mam-outline-sm">Enchant Altar</div>
            <div class="text-[12px] font-bold text-purple-200/90 leading-snug">
              Spin the Cosmic Clock to roll rare Auras &amp; Enchants for your Chibis.
            </div>
            <span class="px-2.5 py-0.5 rounded-lg bg-[#140d2e] border border-purple-400/70 text-[11px] font-black tabular-nums text-purple-200">
              Owned: ${fmtInt(this.state.enchantDice)} Dice
            </span>
            <button
              type="button"
              class="mam-sheen-hover relative overflow-hidden mt-auto w-full py-2.5 px-4 rounded-xl border-2 border-purple-300 bg-[linear-gradient(135deg,#9333ea_0%,#581c87_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_4px_0_#2e1065] text-white text-[14px] font-black cursor-pointer transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97] mam-outline-sm"
              data-altar-choice="enchant"
            >
              Enter Enchant Altar
            </button>
          </div>

          <div class="rounded-2xl border-2 border-cyan-400 bg-[linear-gradient(160deg,#112642_0%,#0b1024_100%)] p-4 flex flex-col items-center text-center gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_28px_rgba(0,0,0,0.65)]">
            <div class="w-[78px] h-[78px] rounded-2xl border-2 border-amber-300 bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.45),#0d152b_82%)] flex items-center justify-center">
              ${fusionPreviewHtml}
            </div>
            <div class="text-[19px] font-black text-white leading-tight mam-outline-sm">Chibi Fusion</div>
            <div class="text-[12px] font-bold text-sky-200/90 leading-snug">
              Fuse 2–3 Chibis + Ores &amp; Gems in the 3D Synchro Chamber into Apex Units.
            </div>
            <span class="px-2.5 py-0.5 rounded-lg border text-[11px] font-black tabular-nums ${
              readyFusions > 0
                ? 'bg-[#0c3324] border-emerald-400 text-emerald-200'
                : 'bg-[#0e1b33] border-cyan-400/70 text-cyan-200'
            }">
              ${readyFusions > 0 ? `${readyFusions} Fusion Ready!` : `${FUSION_RECIPES.length} Exclusive Recipes`}
            </span>
            <button
              type="button"
              class="mam-sheen-hover relative overflow-hidden mt-auto w-full py-2.5 px-4 rounded-xl border-2 border-cyan-300 bg-[linear-gradient(135deg,#0284c7_0%,#7c3aed_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_4px_0_#1e1b4b] text-white text-[14px] font-black cursor-pointer transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97] mam-outline-sm"
              data-altar-choice="fusion"
            >
              Enter Fusion World
            </button>
          </div>
        </div>
      </div>
    `;

    return renderModalShell({
      title: 'Altar Gateway',
      theme: 'worlds',
      iconHtml: FUSION_GATE_ICON_SVG,
      boxClass: 'w-[650px] max-w-[95%]',
      autoHeight: true,
      bodyHtml,
    });
  }

  public bindAltarChoiceEvents(root: HTMLElement): void {
    root.querySelector('[data-altar-choice="enchant"]')?.addEventListener('click', () => {
      audio.playSfx('teleport', { volume: 0.45 });
      this.onCloseModal();
      this.onSetSceneMode('altar');
    });
    root.querySelector('[data-altar-choice="fusion"]')?.addEventListener('click', () => {
      audio.playSfx('teleport', { volume: 0.45 });
      this.onCloseModal();
      this.syncCurrentRecipeTo3D();
      this.onSetSceneMode('fusion');
    });
  }

  /** Full 3D Fusion World HUD (rendered when sceneMode === 'fusion'). */
  public renderFusionWorldHud(opts: {
    weatherHtml: string;
    audioBtnHtml: string;
    currencyRailHtml: string;
    toastStackHtml: string;
  }): string {
    const recipe = this.getSelectedRecipe();
    const resChibi = getChibiById(recipe.resultChibiId);
    const canFuse = this.state.canFuseRecipe(recipe.id);
    const ownedRes = this.state.miners[recipe.resultChibiId] || 0;

    const recipeCardsHtml = FUSION_RECIPES.map((r) => {
      const ch = getChibiById(r.resultChibiId);
      const isSel = r.id === recipe.id;
      const isReady = this.state.canFuseRecipe(r.id);
      const rarity = getMinerRarity(r.resultChibiId);
      const rColor = RARITY_BORDER[rarity];
      return `
        <button
          type="button"
          class="relative flex items-center gap-2 px-2.5 py-2 rounded-xl border-2 text-left cursor-pointer transition-[transform,background,border-color,box-shadow] duration-150 hover:-translate-y-0.5 active:scale-[0.97] ${
            isSel ? 'bg-[#1a294a]' : 'bg-[#0e162b] border-[#26385c] hover:bg-[#15213d]'
          }"
          style="${isSel ? `border-color:${r.accentColor};box-shadow:0 0 16px -3px ${r.accentColor}88,inset 0 1px 0 rgba(255,255,255,0.2)` : ''}"
          data-fusion-select="${r.id}"
        >
          <div class="w-11 h-11 rounded-lg border-2 shrink-0 flex items-center justify-center bg-[#090e1c] overflow-hidden [&_.mam-chibi-portrait_img]:max-w-[90%] [&_.mam-chibi-portrait_img]:max-h-[90%]" style="border-color:${rColor}">
            ${ch ? chibiPortraitHtml(ch, { usePose: true, draggable: false }) : ''}
          </div>
          <div class="flex-1 min-w-0 flex flex-col">
            <div class="flex items-center justify-between gap-1">
              <span class="text-[12.5px] font-black text-white truncate mam-outline-sm">${r.title}</span>
              ${
                isReady
                  ? `<span class="px-1.5 py-0.5 rounded bg-[#0c3324] border border-emerald-400 text-[9px] font-black text-emerald-300 uppercase shrink-0">Ready</span>`
                  : ''
              }
            </div>
            <div class="flex items-center gap-1.5 mt-1">
              ${renderRarityBadgeHtml(rarity, '!px-1.5 !py-[1px] !text-[8.5px]')}
              <span class="text-[10.5px] font-black tabular-nums text-amber-300 mam-outline-sm">${ch ? `${fmtShort(ch.baseDps)}/s` : ''}</span>
            </div>
            <div class="text-[10px] font-extrabold text-cyan-300 truncate mt-0.5 mam-outline-sm">★ ${r.passive.label}</div>
          </div>
        </button>
      `;
    }).join('');

    const minerChipsHtml = recipe.requiredMiners
      .map((ing) => {
        const ch = getChibiById(ing.chibiId);
        const avail = this.state.getAvailableFusionMinerCount(ing.chibiId);
        const ok = avail >= ing.count;
        return `
          <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border-2 ${
            ok ? 'border-emerald-400 bg-[#0d2920]' : 'border-rose-400/70 bg-[#26111c]'
          }">
            <div class="w-9 h-9 rounded-lg bg-[#090e1c] border border-[#2f4369] shrink-0 flex items-center justify-center overflow-hidden [&_.mam-chibi-portrait_img]:max-w-[90%] [&_.mam-chibi-portrait_img]:max-h-[90%]">
              ${ch ? chibiPortraitHtml(ch, { usePose: true, draggable: false }) : ''}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[11.5px] font-black text-white truncate">${ch?.name ?? ing.chibiId}</span>
              <span class="text-[10.5px] font-black tabular-nums ${ok ? 'text-emerald-300' : 'text-rose-300'}">${avail}/${ing.count} unplaced</span>
            </div>
          </div>
        `;
      })
      .join('');

    const oreChipsHtml = recipe.requiredOres
      .map((ing) => {
        const ore = getOreById(ing.oreId);
        const have = this.state.getFusionOreCount(ing.oreId);
        const ok = have >= ing.count;
        return `
          <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border-2 ${
            ok ? 'border-emerald-400 bg-[#0d2920]' : 'border-[#2f4369] bg-[#10182d]'
          }">
            <img src="${assetUrl(`/ores/${ing.oreId}.webp`)}" alt="${ore?.name ?? ing.oreId}" class="w-7 h-7 object-contain shrink-0" />
            <div class="flex flex-col min-w-0">
              <span class="text-[11px] font-black text-white truncate">${ore?.name ?? ing.oreId}</span>
              <span class="text-[10.5px] font-black tabular-nums ${ok ? 'text-emerald-300' : 'text-amber-300'}">${fmtInt(have)}/${fmtInt(ing.count)}</span>
            </div>
          </div>
        `;
      })
      .join('');

    const gemsOk = this.state.gems >= recipe.gemCost;
    const fuseBtnCls = this.fusing
      ? 'border-purple-300 bg-[linear-gradient(135deg,#a855f7_0%,#6d28d9_100%)] cursor-not-allowed opacity-95'
      : canFuse
        ? 'mam-sheen-hover border-emerald-300 bg-[linear-gradient(135deg,#22c55e_0%,#059669_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_4px_0_#064e3b,0_10px_24px_-4px_rgba(34,197,94,0.55)] hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97] cursor-pointer'
        : 'border-[#33466b] bg-[#1a243b] text-slate-400 cursor-not-allowed';

    return `
      ${opts.weatherHtml}
      <div class="${TW_TOP_CENTER} flex items-center gap-2.5">
        <button class="px-[38px] py-2 rounded-2xl border-2 border-orange-300 bg-[linear-gradient(135deg,#ea580c_0%,#9a3412_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_0_#431407,0_8px_22px_-4px_rgba(234,88,12,0.45)] text-white text-[19px] font-black cursor-pointer transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97] mam-outline" data-action="fusion-back">Back</button>
        <button class="px-4 py-2 rounded-2xl border-2 border-purple-300 bg-[linear-gradient(135deg,#9333ea_0%,#581c87_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_0_#2e1065,0_8px_22px_-4px_rgba(147,51,234,0.45)] text-white text-[16px] font-black cursor-pointer inline-flex items-center gap-1.5 transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97] mam-outline-sm" data-action="switch-to-altar">
          ${hudIconHtml('enchant', 22, 'Enchant')}
          <span>Enchant Altar</span>
        </button>
      </div>

      ${opts.audioBtnHtml}
      ${opts.currencyRailHtml}

      <div class="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(1060px,calc(100%-24px))] flex flex-col gap-2 pointer-events-auto">
        <div class="rounded-2xl border-2 bg-[linear-gradient(180deg,#141e36_0%,#090e1c_100%)] p-3 flex flex-col gap-2.5 shadow-[0_0_0_1px_#04070f,0_18px_40px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(255,255,255,0.18)]" style="border-color:${recipe.accentColor}">
          <div class="flex items-center justify-between gap-2 flex-wrap border-b border-[#253657] pb-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-3 h-3 rounded-full shrink-0" style="background:${recipe.accentColor};box-shadow:0 0 10px ${recipe.accentColor}"></span>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[16px] font-black text-white leading-tight mam-outline-sm">${recipe.title}</span>
                  ${renderRarityBadgeHtml('fusion')}
                  <span class="px-2 py-0.5 rounded-lg bg-[#0d263d] border border-cyan-400 text-[11px] font-black text-cyan-200 mam-outline-sm">★ Passive: ${recipe.passive.label}</span>
                  ${resChibi ? `<span class="text-[13px] font-black tabular-nums text-amber-300 mam-outline-sm">${fmtShort(resChibi.baseDps)}/s Base DPS</span>` : ''}
                </div>
                <span class="text-[11px] font-bold text-slate-300">${recipe.subtitle} • Owned: ${fmtInt(ownedRes)}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 ${
                gemsOk ? 'border-sky-400 bg-[#0d223d] text-sky-200' : 'border-rose-400 bg-[#36101d] text-rose-200'
              } text-[13px] font-black tabular-nums mam-outline-sm">
                ${hudIconHtml('gem', 18, 'Gems')}
                <span>${fmtInt(recipe.gemCost)}</span>
              </div>
              <button
                type="button"
                class="relative overflow-hidden px-6 py-2 rounded-xl border-2 text-white text-[15px] font-black uppercase tracking-wide transition-[transform,filter] duration-150 mam-outline-sm ${fuseBtnCls}"
                data-action="execute-fusion"
                ${!canFuse || this.fusing ? 'disabled' : ''}
              >
                ${this.fusing ? 'SYNCHRONIZING...' : 'FUSE CHIBI'}
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            ${minerChipsHtml}
            ${oreChipsHtml}
          </div>
        </div>

        <div class="grid grid-cols-4 @max-[860px]:grid-cols-2 gap-2">
          ${recipeCardsHtml}
        </div>
      </div>

      ${opts.toastStackHtml}
    `;
  }

  public bindFusionWorldEvents(root: HTMLElement): void {
    root.querySelector('[data-action="fusion-back"]')?.addEventListener('click', () => {
      if (this.fusing) return;
      audio.playSfx('ui-close');
      this.onSetSceneMode('shop');
    });

    root.querySelector('[data-action="switch-to-altar"]')?.addEventListener('click', () => {
      if (this.fusing) return;
      audio.playSfx('teleport', { volume: 0.45 });
      this.onSetSceneMode('altar');
    });

    root.querySelectorAll<HTMLElement>('[data-fusion-select]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.fusing) return;
        const id = btn.dataset.fusionSelect;
        if (!id || id === this.selectedRecipeId) return;
        this.selectedRecipeId = id;
        audio.playSfx('ui-tab');
        this.syncCurrentRecipeTo3D();
        this.onRequestRender();
      });
    });

    root.querySelector('[data-action="execute-fusion"]')?.addEventListener('click', () => {
      if (this.fusing) return;
      const recipe = this.getSelectedRecipe();
      if (!this.state.canFuseRecipe(recipe.id)) {
        audio.playSfx('ui-error');
        this.pushToast('Missing required unplaced Chibis, Ores, or Gems!');
        return;
      }

      this.fusing = true;
      audio.playSfx('teleport', { volume: 0.65 });
      this.onRequestRender();

      const finish = (): void => {
        this.fusing = false;
        const result = this.state.fuseChibiRecipe(recipe.id);
        if (result) {
          audio.playSfx('coin-alt', { volume: 0.8 });
          this.pushToast(`Fused ${result.title}! Check your Hotbar / Inventory!`);
        } else {
          audio.playSfx('ui-error');
          this.pushToast('Fusion failed — requirements changed.');
        }
        this.syncCurrentRecipeTo3D();
        this.onRequestRender();
      };

      if (this.onTriggerFusion3D) {
        this.onTriggerFusion3D(recipe, finish);
      } else {
        finish();
      }
    });
  }
}
