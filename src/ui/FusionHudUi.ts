import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { FUSION_RECIPES, FusionRecipeDef, getFusionRecipeById } from '../game/FusionData';
import { getOreById } from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import { getChibiById } from '../game3d/ChibiCatalog';
import { SceneMode } from '../game3d/MineScene3D';
import { enchantDiceIconHtml, hudIconHtml } from './HudIcons';
import { chibiPortraitHtml, renderModalShell, renderRarityBadgeHtml, TW_TOP_CENTER } from './HudShared';

const FUSION_GATE_ICON_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
  <circle cx="9" cy="12" r="5.5" stroke="#0284c7" stroke-width="2.2"/>
  <circle cx="15" cy="12" r="5.5" stroke="#9333ea" stroke-width="2.2"/>
  <path d="M12 7.2L13.3 12L12 16.8L10.7 12L12 7.2Z" fill="#ff4d2e" stroke="#14111d" stroke-width="1.1"/>
</svg>`;

export class FusionHudUi {
  private selectedRecipeId: string = FUSION_RECIPES[0]?.id ?? 'fusion-glitch-cheshire';
  private fusing = false;
  private revealedRecipe: FusionRecipeDef | null = null;
  private sfxTimers: number[] = [];

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onRequestRender: () => void,
    private readonly onSetSceneMode: (mode: SceneMode) => void,
    private readonly onCloseModal: () => void,
    private readonly onSyncFusion3D?: (
      recipe: FusionRecipeDef,
      readyFlags: readonly boolean[],
      oreReadyFlags?: readonly boolean[],
      canFuse?: boolean
    ) => void,
    private readonly onTriggerFusion3D?: (recipe: FusionRecipeDef, onComplete: () => void) => void,
    private readonly onSetFusionRevealHold?: (active: boolean) => void
  ) {}

  public getSelectedRecipe(): FusionRecipeDef {
    return getFusionRecipeById(this.selectedRecipeId) ?? FUSION_RECIPES[0];
  }

  public syncCurrentRecipeTo3D(): void {
    const recipe = this.getSelectedRecipe();
    const minerFlags = recipe.requiredMiners.map(
      (ing) => this.state.getAvailableFusionMinerCount(ing.chibiId) >= ing.count
    );
    const oreFlags = recipe.requiredOres.map(
      (ing) => this.state.getFusionOreCount(ing.oreId) >= ing.count
    );
    const canFuse = this.state.canFuseRecipe(recipe.id);
    this.onSyncFusion3D?.(recipe, minerFlags, oreFlags, canFuse);
  }

  private clearSfxTimers(): void {
    for (const id of this.sfxTimers) {
      window.clearTimeout(id);
    }
    this.sfxTimers.length = 0;
  }

  public resetAnimating(): void {
    this.clearSfxTimers();
    this.fusing = false;
    this.revealedRecipe = null;
    this.onSetFusionRevealHold?.(false);
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
        <div class="text-[12.5px] font-bold text-[#334155] text-center">
          Choose which Cosmic Chamber to enter through the Plaza Altar.
        </div>
        <div class="grid grid-cols-2 @max-[580px]:grid-cols-1 gap-3">
          <div class="rounded-2xl border-[2.5px] border-[#14111d] bg-white p-4 flex flex-col items-center text-center gap-2.5">
            <div class="w-[78px] h-[78px] rounded-2xl border-[2.5px] border-[#14111d] bg-[#f3e8ff] flex items-center justify-center [&>.mam-3d-icon]:w-[58px] [&>.mam-3d-icon]:h-[58px]">
              ${enchantDiceIconHtml(58)}
            </div>
            <div class="text-[19px] font-black text-[#14111d] leading-tight">Enchant Altar</div>
            <div class="text-[12px] font-bold text-[#475569] leading-snug">
              Spin the Cosmic Clock to roll rare Auras &amp; Enchants for your Chibis.
            </div>
            <span class="px-2.5 py-0.5 rounded-lg bg-[#f3e8ff] border-2 border-[#14111d] text-[11px] font-black tabular-nums text-[#6b21a8]">
              Owned: ${fmtInt(this.state.enchantDice)} Dice
            </span>
            <button
              type="button"
              class="mam-sheen-hover relative overflow-hidden mt-auto w-full py-2.5 px-4 rounded-xl border-[2.5px] border-[#14111d] bg-[#c084fc] hover:bg-[#d8b4fe] text-[#14111d] text-[14px] font-black cursor-pointer transition-transform duration-150 hover:scale-[0.97] active:scale-[0.94]"
              data-altar-choice="enchant"
            >
              Enter Enchant Altar
            </button>
          </div>

          <div class="rounded-2xl border-[2.5px] border-[#14111d] bg-white p-4 flex flex-col items-center text-center gap-2.5">
            <div class="w-[78px] h-[78px] rounded-2xl border-[2.5px] border-[#14111d] bg-[#e0f2fe] flex items-center justify-center">
              ${fusionPreviewHtml}
            </div>
            <div class="text-[19px] font-black text-[#14111d] leading-tight">Chibi Fusion</div>
            <div class="text-[12px] font-bold text-[#475569] leading-snug">
              Fuse 2–3 Chibis + Ores &amp; Gems in the 3D Synchro Chamber into Apex Units.
            </div>
            <span class="px-2.5 py-0.5 rounded-lg border-2 border-[#14111d] text-[11px] font-black tabular-nums ${
              readyFusions > 0
                ? 'bg-[#bbf7d0] text-[#14532d]'
                : 'bg-[#e0f2fe] text-[#0369a1]'
            }">
              ${readyFusions > 0 ? `${readyFusions} Fusion Ready!` : `${FUSION_RECIPES.length} Exclusive Recipes`}
            </span>
            <button
              type="button"
              class="mam-sheen-hover relative overflow-hidden mt-auto w-full py-2.5 px-4 rounded-xl border-[2.5px] border-[#14111d] bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#14111d] text-[14px] font-black cursor-pointer transition-transform duration-150 hover:scale-[0.97] active:scale-[0.94]"
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
      return `
        <button
          type="button"
          class="relative flex items-center gap-2 px-2 py-1.5 rounded-xl border-[2.5px] border-[#14111d] text-left cursor-pointer transition-transform duration-150 hover:scale-[0.97] active:scale-[0.94] ${
            isSel ? 'bg-[#fde047] ring-[2.5px] ring-inset ring-[#14111d]' : 'bg-[#fff8e7] hover:bg-[#fcecc8]'
          }"
          data-fusion-select="${r.id}"
        >
          <div class="w-9 h-9 rounded-lg border-2 border-[#14111d] shrink-0 flex items-center justify-center bg-white overflow-hidden [&_.mam-chibi-portrait_img]:max-w-[90%] [&_.mam-chibi-portrait_img]:max-h-[90%]">
            ${ch ? chibiPortraitHtml(ch, { usePose: true, draggable: false }) : ''}
          </div>
          <div class="flex-1 min-w-0 flex flex-col">
            <div class="flex items-center justify-between gap-1">
              <span class="text-[12px] font-black text-[#14111d] truncate leading-tight">${r.title}</span>
              ${
                isReady
                  ? `<span class="px-1 py-[1px] rounded bg-[#4ade80] border border-[#14111d] text-[8.5px] font-black text-[#14111d] uppercase shrink-0 leading-none">Ready</span>`
                  : ''
              }
            </div>
            <div class="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span class="text-[10px] font-black tabular-nums text-[#b45309] shrink-0">${ch ? `${fmtShort(ch.baseDps)}/s` : ''}</span>
              <span class="text-[9.5px] font-extrabold text-[#0369a1] truncate">★ ${r.passive.label}</span>
            </div>
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
          <div class="flex items-center gap-1.5 px-2 py-1 rounded-xl border-2 border-[#14111d] ${
            ok ? 'bg-[#dcfce7]' : 'bg-[#fee2e2]'
          }">
            <div class="w-7 h-7 rounded-lg bg-white border-[1.5px] border-[#14111d] shrink-0 flex items-center justify-center overflow-hidden [&_.mam-chibi-portrait_img]:max-w-[90%] [&_.mam-chibi-portrait_img]:max-h-[90%]">
              ${ch ? chibiPortraitHtml(ch, { usePose: true, draggable: false }) : ''}
            </div>
            <div class="flex flex-col min-w-0 leading-tight">
              <span class="text-[11px] font-black text-[#14111d] truncate max-w-[118px]">${ch?.name ?? ing.chibiId}</span>
              <span class="text-[10px] font-black tabular-nums ${ok ? 'text-[#15803d]' : 'text-[#b91c1c]'}">${avail}/${ing.count} unplaced</span>
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
          <div class="flex items-center gap-1.5 px-2 py-1 rounded-xl border-2 border-[#14111d] ${
            ok ? 'bg-[#dcfce7]' : 'bg-[#fcecc8]'
          }">
            <img src="${assetUrl(`/ores/${ing.oreId}.webp`)}" alt="${ore?.name ?? ing.oreId}" class="w-6 h-6 object-contain shrink-0" />
            <div class="flex flex-col min-w-0 leading-tight">
              <span class="text-[11px] font-black text-[#14111d] truncate max-w-[110px]">${ore?.name ?? ing.oreId}</span>
              <span class="text-[10px] font-black tabular-nums ${ok ? 'text-[#15803d]' : 'text-[#b45309]'}">${fmtInt(have)}/${fmtInt(ing.count)}</span>
            </div>
          </div>
        `;
      })
      .join('');

    const gemsOk = this.state.gems >= recipe.gemCost;
    const fuseBtnCls = this.fusing
      ? 'bg-[#c084fc] text-[#14111d] cursor-not-allowed opacity-95'
      : canFuse
        ? 'mam-sheen-hover bg-[#4ade80] hover:bg-[#86efac] text-[#14111d] hover:scale-[0.97] active:scale-[0.94] cursor-pointer'
        : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed';

    const rev = this.revealedRecipe;
    const revChibi = rev ? getChibiById(rev.resultChibiId) : null;

    let bottomSectionHtml: string;
    if (this.fusing) {
      bottomSectionHtml = `
        <div class="absolute bottom-5 left-1/2 -translate-x-1/2 w-[min(560px,calc(100%-24px))] pointer-events-none">
          <div class="rounded-2xl border-[3px] border-[#14111d] px-5 py-3 bg-[#fff8e7] flex items-center justify-center gap-3">
            <span class="w-3.5 h-3.5 rounded-full animate-ping shrink-0" style="background:${recipe.accentColor}"></span>
            <span class="text-[14.5px] font-black tracking-wider uppercase text-[#14111d]">
              ✦ Synchro Fusion in Progress — Converging Quantum Cores... ✦
            </span>
          </div>
        </div>
      `;
    } else if (rev) {
      bottomSectionHtml = `
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(560px,calc(100%-24px))] pointer-events-auto" data-fusion-reveal="true">
          <div class="rarity-fusion rounded-2xl border-[3px] border-[#14111d] p-4 bg-[#fff8e7] flex flex-col items-center text-center gap-2.5">
            <div class="px-3.5 py-1 rounded-full bg-[#fde047] border-2 border-[#14111d] text-[11.5px] font-black tracking-widest uppercase text-[#14111d]">
              ✦ Synchro Fusion Complete! ✦
            </div>
            <div class="flex items-center gap-3.5 w-full bg-white border-[2.5px] border-[#14111d] rounded-2xl p-3 text-left">
              <div class="w-[76px] h-[76px] rounded-xl border-2 border-[#14111d] bg-[#fcecc8] shrink-0 flex items-center justify-center overflow-hidden [&_.mam-chibi-portrait_img]:max-w-[94%] [&_.mam-chibi-portrait_img]:max-h-[94%]">
                ${revChibi ? chibiPortraitHtml(revChibi, { usePose: true, draggable: false }) : ''}
              </div>
              <div class="flex-1 min-w-0 flex flex-col gap-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[20px] font-black text-[#14111d] leading-tight">${rev.title}</span>
                  ${renderRarityBadgeHtml('fusion')}
                </div>
                <div class="text-[11.5px] font-bold text-[#475569]">${rev.subtitle}</div>
                <div class="flex items-center gap-2 flex-wrap mt-0.5">
                  ${revChibi ? `<span class="px-2.5 py-0.5 rounded-lg bg-[#fef08a] border-[1.5px] border-[#14111d] text-[12px] font-black tabular-nums text-[#14111d]">⚡ ${fmtShort(revChibi.baseDps)}/s Base DPS</span>` : ''}
                  <span class="px-2.5 py-0.5 rounded-lg bg-[#e0f2fe] border-[1.5px] border-[#14111d] text-[12px] font-black text-[#0369a1]">★ Passive: ${rev.passive.label}</span>
                </div>
              </div>
            </div>
            <div class="text-[11.5px] font-black text-[#15803d]">
              Added to your Hotbar / Inventory — place on a Mine Plot to activate its Fusion Passive!
            </div>
            <button
              type="button"
              class="mam-sheen-hover relative overflow-hidden w-full py-2.5 px-6 rounded-xl border-[2.5px] border-[#14111d] bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] text-[15px] font-black uppercase tracking-wider cursor-pointer transition-transform duration-150 hover:scale-[0.98] active:scale-[0.95]"
              data-action="dismiss-fusion-reveal"
            >
              Awesome! (Collect)
            </button>
          </div>
        </div>
      `;
    } else {
      bottomSectionHtml = `
        <div class="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[min(940px,calc(100%-20px))] flex flex-col gap-1.5 pointer-events-auto">
          <div class="grid grid-cols-4 @max-[820px]:grid-cols-2 gap-1.5">
            ${recipeCardsHtml}
          </div>

          <div class="rounded-2xl border-[3px] border-[#14111d] bg-[#fff8e7] px-3 py-2 flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2 flex-wrap border-b-2 border-[#14111d]/12 pb-1.5">
              <div class="flex items-center gap-2 min-w-0 flex-wrap">
                <span class="w-3 h-3 rounded-full border-2 border-[#14111d] shrink-0" style="background:${recipe.accentColor}"></span>
                <span class="text-[15px] font-black text-[#14111d] leading-tight">${recipe.title}</span>
                ${renderRarityBadgeHtml('fusion', 'is-compact')}
                <span class="px-2 py-0.5 rounded-lg bg-[#e0f2fe] border-[1.5px] border-[#14111d] text-[10.5px] font-black text-[#0369a1]">★ ${recipe.passive.label}</span>
                ${resChibi ? `<span class="text-[12px] font-black tabular-nums text-[#b45309]">${fmtShort(resChibi.baseDps)}/s</span>` : ''}
                <span class="text-[11px] font-bold text-[#5b526e]">• Owned: ${fmtInt(ownedRes)}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 border-[#14111d] ${
                  gemsOk ? 'bg-[#e0f2fe] text-[#0369a1]' : 'bg-[#fee2e2] text-[#b91c1c]'
                } text-[12.5px] font-black tabular-nums">
                  ${hudIconHtml('gem', 16, 'Gems')}
                  <span>${fmtInt(recipe.gemCost)}</span>
                </div>
                <button
                  type="button"
                  class="relative overflow-hidden px-5 py-1.5 rounded-xl border-[2.5px] border-[#14111d] text-[14px] font-black uppercase tracking-wide transition-transform duration-150 ${fuseBtnCls}"
                  data-action="execute-fusion"
                  ${!canFuse || this.fusing ? 'disabled' : ''}
                >
                  ${this.fusing ? 'SYNCHRONIZING...' : 'FUSE CHIBI'}
                </button>
              </div>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              ${minerChipsHtml}
              ${oreChipsHtml}
            </div>
          </div>
        </div>
      `;
    }

    return `
      ${opts.weatherHtml}
      <div class="${TW_TOP_CENTER} flex items-center gap-2">
        <button class="h-11 @max-[720px]:h-9 px-7 @max-[720px]:px-4 rounded-2xl border-[3px] border-[#14111d] bg-[#fb923c] hover:bg-[#fdba74] text-[#14111d] text-[17px] @max-[720px]:text-[14px] font-black cursor-pointer inline-flex items-center justify-center transition-transform duration-150 hover:scale-[0.97] active:scale-[0.94]" data-action="fusion-back">Back</button>
        <button class="h-11 @max-[720px]:h-9 px-4 @max-[720px]:px-3 rounded-2xl border-[3px] border-[#14111d] bg-[#c084fc] hover:bg-[#d8b4fe] text-[#14111d] text-[15px] @max-[720px]:text-[13px] font-black cursor-pointer inline-flex items-center gap-1.5 transition-transform duration-150 hover:scale-[0.97] active:scale-[0.94]" data-action="switch-to-altar">
          ${hudIconHtml('enchant', 20, 'Enchant')}
          <span>Enchant Altar</span>
        </button>
      </div>

      ${opts.audioBtnHtml}
      ${opts.currencyRailHtml}

      ${bottomSectionHtml}

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

    root.querySelector('[data-action="dismiss-fusion-reveal"]')?.addEventListener('click', () => {
      audio.playSfx('coin-alt', { volume: 0.75 });
      this.revealedRecipe = null;
      this.onSetFusionRevealHold?.(false);
      this.syncCurrentRecipeTo3D();
      this.onRequestRender();
    });

    root.querySelector('[data-action="execute-fusion"]')?.addEventListener('click', () => {
      if (this.fusing) return;
      const recipe = this.getSelectedRecipe();
      if (!this.state.canFuseRecipe(recipe.id)) {
        audio.playSfx('ui-error');
        this.pushToast('Missing required unplaced Chibis, Ores, or Gems!');
        return;
      }

      this.clearSfxTimers();
      this.fusing = true;
      this.revealedRecipe = null;
      audio.playEnchantSpinStart();
      audio.playSfx('teleport', { volume: 0.65 });
      this.onRequestRender();

      // Multi-beat audio choreography matching Act 2 Portal Supernova (1.72s) & Act 3 Apex Landing (2.05s)
      this.sfxTimers.push(
        window.setTimeout(() => {
          if (!this.fusing) return;
          audio.playOreBreak('geode');
        }, 1720),
        window.setTimeout(() => {
          if (!this.fusing) return;
          audio.playEnchantSpinLand(true);
          audio.playSfx('rare-fanfare', { volume: 0.85 });
        }, 2050)
      );

      const finish = (): void => {
        this.clearSfxTimers();
        this.fusing = false;
        const result = this.state.fuseChibiRecipe(recipe.id);
        if (result) {
          this.revealedRecipe = result;
          this.onSetFusionRevealHold?.(true);
          this.pushToast(`✦ Fused ${result.title}! (${result.passive.label})`);
        } else {
          audio.playSfx('ui-error');
          this.onSetFusionRevealHold?.(false);
          this.pushToast('Fusion failed — requirements changed.');
          this.syncCurrentRecipeTo3D();
        }
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
