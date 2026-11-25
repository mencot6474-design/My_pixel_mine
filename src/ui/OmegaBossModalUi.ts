import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { GameState } from '../game/GameState';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import {
  getOmegaBossById,
  getOmegaPassiveStarScale,
  OMEGA_BOSS_DEFS,
  OMEGA_KEY_GEM_COST,
  OMEGA_MAX_KEYS,
  OmegaBossId,
} from '../game/OmegaData';
import { CG_ADS_ENABLED, cgRequestRewardedAd } from '../sdk/crazygames';
import { getChibiById } from '../game3d/ChibiCatalog';
import { bossKeyIconHtml, hudIconHtml, omegaCrestIconHtml } from './HudIcons';
import {
  buildFullscreenRevealDomHtml,
  OmegaForgeCutsceneController,
  OmegaForgeCutsceneState,
} from './OmegaForgeCutscene';
import {
  chibiPortraitHtml,
  formatCountdownTimer,
  rarityCardClasses,
  rarityVars,
  renderModalShell,
  renderRarityBadgeHtml,
  TW_SHOP_MODAL_RESP,
} from './HudShared';

export type { OmegaForgeCutsceneState };

export class OmegaBossModalUi {
  private selectedBossId: OmegaBossId = 'crimson-ronin';
  private selectedTier = 1;
  private readonly forgeCutscene = new OmegaForgeCutsceneController();

  constructor(
    private readonly state: GameState,
    private readonly onRequestRender: () => void,
    private readonly onStartOmegaBattle: (bossId: OmegaBossId, tier: number) => void,
    private readonly onCloseModal: () => void,
    private readonly onToast?: (msg: string) => void
  ) {}

  public openForBoss(bossId: OmegaBossId): void {
    this.selectedBossId = bossId;
    this.selectedTier = this.state.getOmegaUnlockedMaxTier(bossId);
  }

  public getSelectedBossId(): OmegaBossId {
    return this.selectedBossId;
  }

  public getForgeCutsceneState(): OmegaForgeCutsceneState | null {
    return this.forgeCutscene.getState();
  }

  public clearForgeCutscene(): void {
    this.forgeCutscene.clear();
  }

  public finishForgeCutsceneToConfirm(): void {
    this.forgeCutscene.skipToConfirm();
  }

  public triggerForgeUnlock(id: OmegaBossId): boolean {
    const res = this.state.unlockOmegaChibi(id);
    if (res === 'unlocked') {
      this.startForgeCutscene('unlock', id, 1);
      return true;
    }
    audio.playSfx('ui-error');
    this.onRequestRender();
    return false;
  }

  public triggerForgeAwaken(id: OmegaBossId): boolean {
    const res = this.state.awakenOmegaChibi(id);
    if (res === 'awakened') {
      const b = getOmegaBossById(id);
      const stars = Math.max(1, (b ? this.state.chibiStars[b.chibiId] : 1) || 1);
      this.startForgeCutscene('awaken', id, stars);
      return true;
    }
    audio.playSfx('ui-error');
    this.onRequestRender();
    return false;
  }

  public replayUnlockedCutscene(id: OmegaBossId): boolean {
    const b = getOmegaBossById(id);
    if (!b || (this.state.miners[b.chibiId] || 0) <= 0) return false;
    const stars = Math.max(1, this.state.chibiStars[b.chibiId] || 1);
    this.startForgeCutscene('unlock', id, stars);
    return true;
  }

  public confirmForgeOverlay(): void {
    const kind = this.forgeCutscene.getState()?.kind;
    audio.playSfx('ui-click');
    this.forgeCutscene.clear();
    this.onToast?.(kind === 'awaken' ? 'OMEGA Awakened! Passives Boosted!' : 'OMEGA Chibi Forged & Unlocked!');
    this.onRequestRender();
  }

  /** Renders fullscreen cutscene/confirm DOM markup for diagnostics and unit tests. */
  public renderFullscreenCutsceneHtml(): string {
    const cs = this.forgeCutscene.getState();
    if (!cs) return '';
    const boss = getOmegaBossById(cs.bossId) ?? OMEGA_BOSS_DEFS[0];
    return buildFullscreenRevealDomHtml(
      cs,
      boss,
      getChibiById(boss.chibiId),
      this.state.getEffectiveChibiDps(boss.chibiId)
    );
  }

  private startForgeCutscene(kind: 'unlock' | 'awaken', bossId: OmegaBossId, targetStars: number): void {
    const boss = getOmegaBossById(bossId) ?? OMEGA_BOSS_DEFS[0];
    this.forgeCutscene.start(
      kind,
      bossId,
      targetStars,
      () => {
        audio.playSfx('ui-click');
        this.onToast?.(kind === 'awaken' ? 'OMEGA Awakened! Passives Boosted!' : 'OMEGA Chibi Forged & Unlocked!');
        this.onRequestRender();
      },
      this.state.getEffectiveChibiDps(boss.chibiId)
    );
    this.onRequestRender();
  }

  public renderOmegaModal(): string {
    this.state.syncOmegaKeys();
    const boss = getOmegaBossById(this.selectedBossId) ?? OMEGA_BOSS_DEFS[0];
    const chibi = getChibiById(boss.chibiId);
    const maxTier = this.state.getOmegaUnlockedMaxTier(boss.id);
    if (this.selectedTier > maxTier) this.selectedTier = maxTier;
    if (this.selectedTier < 1) this.selectedTier = 1;

    const regenSec = this.state.getOmegaNextKeyRegenSec();
    const squadDps = this.state.getOmegaSquadEffectiveDps();
    const coresOwned = this.state.omegaCores[boss.id] || 0;
    const totalKills = this.state.omegaKills[boss.id] || 0;
    const bestTier = this.state.omegaBestTier[boss.id] || 0;
    const isUnlocked = (this.state.miners[boss.chibiId] || 0) > 0;
    const currentStars = Math.max(1, this.state.chibiStars[boss.chibiId] || 1);
    const awakenCost =
      currentStars < 5
        ? boss.awakenCoreCosts[currentStars - 1] ?? boss.awakenCoreCosts[boss.awakenCoreCosts.length - 1]
        : 0;
    const starScale = getOmegaPassiveStarScale(currentStars);

    const bossTabsHtml = OMEGA_BOSS_DEFS.map((b) => {
      const active = b.id === boss.id;
      const bCores = this.state.omegaCores[b.id] || 0;
      return `
        <button
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-[2.5px] border-[#14111d] font-black text-[12px] cursor-pointer transition-transform duration-150 ease-out hover:scale-[0.98] ${
            active ? 'bg-[#fde047] text-[#14111d]' : 'bg-[#fff8e7] text-[#475569] hover:bg-white'
          }"
          data-omega-tab="${b.id}"
        >
          <span class="w-2.5 h-2.5 rounded-full border border-[#14111d]" style="background:${b.accentColor}"></span>
          <span>${b.name}</span>
          <span class="mam-pill-xs bg-white text-[#14111d]">${fmtInt(bCores)} Core</span>
        </button>
      `;
    }).join('');

    const summary = this.state.omegaLastSummary;
    const summaryHtml =
      summary && summary.bossId === boss.id
        ? `<div class="shrink-0 px-3 py-2 rounded-2xl border-[2.5px] border-[#14111d] flex items-center justify-between gap-2.5 flex-wrap ${
            summary.victory ? 'bg-[#dcfce7]' : 'bg-[#fee2e2]'
          }">
            <div class="flex flex-col gap-0.5 min-w-0">
              <div class="text-[12px] font-black text-[#14111d]">
                ${
                  summary.victory
                    ? `VICTORY! Tier ${summary.tier} Cleared in ${summary.timeUsedSec}s`
                    : `TIME UP / RETREAT (Tier ${summary.tier}) — 0 Keys Lost`
                }
              </div>
              <div class="text-[10.5px] font-bold text-[#334155] tabular-nums">
                DMG: ${fmtShort(summary.damageDealt)} • Parries: ${summary.parriesLanded} • Shattered: ${summary.targetsShattered}${
                  summary.victory
                    ? ` • +${fmtInt(summary.gemsAwarded)} Gems${summary.diceAwarded > 0 ? ` +${summary.diceAwarded} Dice` : ''}${
                        summary.coresAwarded > 0 ? ` • +${summary.coresAwarded} ${boss.coreName}!` : ' • No Core Drop'
                      }`
                    : ''
                }
              </div>
            </div>
            <button
              class="px-3 py-1 rounded-xl border-2 border-[#14111d] bg-[#fb923c] hover:bg-[#fdba74] text-[#14111d] text-[11px] font-black cursor-pointer shrink-0"
              data-omega-retry="${summary.tier}"
            >Retry Tier ${summary.tier}</button>
          </div>`
        : '';

    const tiersHtml = boss.tiers
      .map((t) => {
        const unlocked = t.tier <= maxTier;
        const selected = t.tier === this.selectedTier;
        const cleared = this.state.omegaClaimedFirstClears.includes(`${boss.id}:${t.tier}`);
        const dropPct = Number((t.coreDropChance * 100).toFixed(1));
        const coreRange = t.minCores === t.maxCores ? `${t.minCores} Core` : `${t.minCores}–${t.maxCores} Cores`;
        return `
          <button
            class="w-full text-left px-3 py-2 rounded-xl border-[2.5px] border-[#14111d] flex items-center justify-between gap-2 transition-transform duration-150 ease-out ${
              !unlocked
                ? 'bg-[#e2e8f0] opacity-60 cursor-not-allowed'
                : selected
                  ? 'bg-[#fef9c3] ring-[2.5px] ring-inset ring-[#ef4444] cursor-pointer'
                  : 'bg-white hover:bg-[#fff8e7] cursor-pointer hover:scale-[0.99]'
            }"
            data-omega-tier="${t.tier}"
            ${unlocked ? '' : 'disabled'}
          >
            <div class="flex flex-col gap-0.5 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[12px] font-black text-[#14111d]">${t.label}</span>
                ${
                  cleared
                    ? `<span class="mam-pill-xs bg-[#86efac] text-[#14111d]">Cleared</span>`
                    : unlocked
                      ? `<span class="mam-pill-xs bg-[#fde047] text-[#14111d] inline-flex items-center gap-1">1st: +${fmtInt(t.firstClearGems)}${hudIconHtml('gem', 12, 'Gems')}</span>`
                      : `<span class="mam-pill-xs bg-[#cbd5e1] text-[#475569]">Locked</span>`
                }
              </div>
              <span class="text-[11px] font-black text-[#dc2626] tabular-nums">HP ${fmtShort(t.bossHp)}</span>
            </div>
            <span class="mam-pill-xs bg-[#ffe4e6] text-[#9f1239] border-[1.5px] border-[#14111d] shrink-0">${dropPct}% • ${coreRange}</span>
          </button>
        `;
      })
      .join('');

    const passiveCards = [
      { label: 'Team DMG', value: `+${Math.round(boss.teamDmgPct * starScale * 100)}%`, bg: 'bg-[#fee2e2]', text: 'text-[#b91c1c]' },
      { label: 'Drop Ore', value: `+${Math.round(boss.oreDropPct * starScale * 100)}%`, bg: 'bg-[#e0f2fe]', text: 'text-[#0369a1]' },
      { label: 'Sell Ore', value: `+${Math.round(boss.oreSellPct * starScale * 100)}%`, bg: 'bg-[#dcfce7]', text: 'text-[#15803d]' },
    ]
      .map(
        (p) => `
          <div class="px-2 py-1.5 rounded-xl border-2 border-[#14111d] ${p.bg} flex flex-col items-center text-center">
            <span class="text-[9px] font-black uppercase tracking-wider text-[#475569]">${p.label}</span>
            <span class="text-[13px] font-black tabular-nums ${p.text} leading-tight">${p.value}</span>
          </div>
        `
      )
      .join('');

    const forgeActionHtml = isUnlocked
      ? `
        <div class="flex flex-col gap-1.5 shrink-0">
          <div class="flex items-center justify-between text-[11px] font-black text-[#14111d]">
            <span>Awakening ★${currentStars}/5</span>
            <span class="mam-pill-xs bg-[#fde047] text-[#14111d]">+${Math.round((getOmegaPassiveStarScale(currentStars) - 1) * 100)}% Passives</span>
          </div>
          ${
            currentStars >= 5
              ? `<div class="w-full py-2 rounded-xl border-2 border-[#14111d] bg-[#86efac] text-center text-[12px] font-black text-[#14111d]">MAX AWAKENED ★5</div>`
              : `<button
                  class="w-full py-2 rounded-xl border-[2.5px] border-[#14111d] font-black text-[12px] cursor-pointer ${
                    coresOwned >= awakenCost
                      ? 'bg-[#fde047] hover:bg-[#fef08a] text-[#14111d]'
                      : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
                  }"
                  data-omega-awaken="${boss.id}"
                  ${coresOwned >= awakenCost ? '' : 'disabled'}
                >Awaken ★${currentStars} → ★${currentStars + 1} (${awakenCost} ${boss.coreName}s)</button>`
          }
        </div>
      `
      : `
        <div class="flex flex-col gap-1.5 shrink-0">
          <div class="flex items-center justify-between text-[11px] font-black text-[#14111d]">
            <span>Unlock Progress</span>
            <span class="tabular-nums">${fmtInt(coresOwned)} / ${boss.unlockCoreCost} ${boss.coreName}s</span>
          </div>
          <div class="w-full h-3 rounded-full border-2 border-[#14111d] bg-white overflow-hidden">
            <div class="h-full bg-[#ef4444]" style="width:${Math.min(100, Math.round((coresOwned / boss.unlockCoreCost) * 100))}%"></div>
          </div>
          <button
            class="w-full py-2 rounded-xl border-[2.5px] border-[#14111d] font-black text-[12px] cursor-pointer ${
              coresOwned >= boss.unlockCoreCost
                ? 'bg-[#ef4444] hover:bg-[#f87171] text-white'
                : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
            }"
            data-omega-unlock="${boss.id}"
            ${coresOwned >= boss.unlockCoreCost ? '' : 'disabled'}
          >Forge & Unlock ${boss.name} (${boss.unlockCoreCost} Cores)</button>
        </div>
      `;

    const headerExtraHtml = `
      <div class="w-full flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-1.5 flex-wrap">${bossTabsHtml}</div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="mam-pill bg-[#fff8e7] text-[#14111d] inline-flex items-center gap-1" data-omega-keys-pill>
            ${bossKeyIconHtml(14)}
            <span data-omega-keys-text>${this.state.omegaKeys}/${OMEGA_MAX_KEYS} Keys${regenSec > 0 ? ` (${formatCountdownTimer(regenSec)})` : ''}</span>
          </span>
          <button
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border-2 border-[#14111d] bg-[#bae6fd] hover:bg-[#7dd3fc] text-[#14111d] text-[11px] font-black cursor-pointer"
            data-omega-buy-key="true"
          ><span>+1 Key</span>${hudIconHtml('gem', 13, 'Gems')}<span>${fmtShort(OMEGA_KEY_GEM_COST)}</span></button>
          <span class="mam-pill bg-[#fce7f3] text-[#14111d] inline-flex items-center gap-1" data-omega-gems-pill>
            ${hudIconHtml('gem', 13, 'Gems')}
            <span>${fmtShort(this.state.gems)}</span>
          </span>
          ${
            CG_ADS_ENABLED
              ? `<button class="px-2.5 py-1 rounded-xl border-2 border-[#14111d] bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] text-[11px] font-black cursor-pointer" data-omega-ad-key="true">+1 Free (Ad)</button>`
              : ''
          }
        </div>
      </div>
    `;

    const bodyHtml = `
      <div class="flex flex-col gap-2.5 flex-1 min-h-0 overflow-hidden">
        ${summaryHtml}
        <div class="grid grid-cols-[minmax(0,1.25fr)_minmax(270px,0.95fr)] @max-[860px]:grid-cols-1 gap-3 flex-1 min-h-0 @max-[860px]:overflow-y-auto mam-no-scrollbar">
          <div class="flex flex-col gap-2 min-h-0">
            <div class="shrink-0 p-2.5 rounded-2xl border-[2.5px] border-[#14111d] bg-[#fcecc8] flex items-center gap-3">
              ${
                chibi
                  ? `<div class="w-16 h-16 shrink-0 rounded-xl border-2 border-[#14111d] bg-white flex items-center justify-center overflow-hidden p-1">
                      <img class="w-full h-full object-contain" src="${assetUrl(chibi.poses.pose)}" alt="${boss.name}" />
                    </div>`
                  : ''
              }
              <div class="flex flex-col gap-0.5 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[16px] font-black text-[#14111d] leading-tight">${boss.name}</span>
                  ${renderRarityBadgeHtml('omega', 'is-compact !ml-0')}
                </div>
                <div class="text-[11px] font-black text-[#b91c1c]">${boss.mechanicTitle}</div>
                <div class="text-[10.5px] font-bold text-[#475569] leading-snug">${boss.mechanicSummary}</div>
                <div class="text-[10.5px] font-black text-[#0369a1] tabular-nums mt-0.5">Your Squad Team DPS: ${fmtShort(squadDps)}/s</div>
              </div>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto mam-no-scrollbar flex flex-col gap-1.5 pr-0.5 @max-[860px]:flex-none @max-[860px]:max-h-[250px]">
              ${tiersHtml}
            </div>

            <button
              class="shrink-0 w-full py-2.5 rounded-2xl border-[3px] border-[#14111d] text-[13.5px] font-black cursor-pointer transition-transform duration-150 ease-out hover:scale-[0.98] active:scale-[0.95] ${
                this.state.omegaKeys > 0 && squadDps > 0
                  ? 'bg-[#ef4444] hover:bg-[#f87171] text-white'
                  : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
              }"
              data-omega-fight="true"
              ${this.state.omegaKeys > 0 && squadDps > 0 ? '' : 'disabled'}
            >
              ${
                squadDps <= 0
                  ? 'Deploy at least 1 Chibi to Challenge'
                  : this.state.omegaKeys <= 0
                    ? 'No Boss Keys (Wait or Buy Key)'
                    : `CHALLENGE ${boss.name.toUpperCase()} — TIER ${this.selectedTier} (Win uses 1 Key)`
              }
            </button>
          </div>

          <div class="mam-inspector-well mam-no-scrollbar rounded-2xl p-3 flex flex-col justify-between gap-2.5 min-h-0 overflow-y-auto @max-[860px]:overflow-visible">
            <div class="flex items-center justify-between gap-2 shrink-0 flex-wrap">
              <span class="text-[12.5px] font-black tracking-wide text-[#14111d]">OMEGA SANCTUM FORGE</span>
              <div class="flex items-center gap-1.5">
                ${
                  isUnlocked
                    ? `<button
                        type="button"
                        class="mam-pill-xs bg-[#bae6fd] hover:bg-[#7dd3fc] text-[#14111d] border-[1.5px] border-[#14111d] cursor-pointer transition-transform hover:scale-95"
                        data-omega-replay-cutscene="${boss.id}"
                        title="Replay Fullscreen Omega Forge Cutscene"
                      >▶ Cutscene</button>`
                    : ''
                }
                <span class="mam-pill-xs bg-[#14111d] text-[#fde047]">${fmtInt(coresOwned)} ${boss.coreName}s</span>
              </div>
            </div>

            ${
              chibi
                ? `<div class="${rarityCardClasses('omega', 'is-holo-foil !aspect-auto w-full py-2.5 px-3 flex flex-col items-center gap-1 shrink-0')}" style="${rarityVars('omega')}">
                    <div class="w-full h-[96px] flex items-center justify-center [&_.mam-chibi-portrait_img]:max-h-[92px]">
                      ${chibiPortraitHtml(chibi, { usePose: true })}
                    </div>
                    <div class="flex items-center gap-2">
                      ${renderRarityBadgeHtml('omega', 'is-compact !ml-0')}
                      <span class="mam-pill-xs bg-white text-[#b45309] border-[1.5px] border-[#14111d]">${fmtShort(this.state.getEffectiveChibiDps(chibi.id))}/s Base</span>
                    </div>
                  </div>`
                : ''
            }

            <div class="flex flex-col gap-1 shrink-0">
              <div class="text-[9.5px] font-black uppercase tracking-[0.06em] text-[#475569] text-center">All-3 Dopamine Passives (Active on Plot)</div>
              <div class="grid grid-cols-3 gap-1.5">${passiveCards}</div>
            </div>

            <div class="grid grid-cols-2 gap-1.5 shrink-0">
              <div class="px-2.5 py-1 rounded-xl border-2 border-[#14111d] bg-white flex items-center justify-between text-[10.5px] font-black">
                <span class="text-[#64748b]">Best Tier</span>
                <span class="text-[#14111d]">${bestTier > 0 ? `Tier ${bestTier}` : '—'}</span>
              </div>
              <div class="px-2.5 py-1 rounded-xl border-2 border-[#14111d] bg-white flex items-center justify-between text-[10.5px] font-black">
                <span class="text-[#64748b]">Boss Kills</span>
                <span class="text-[#14111d] tabular-nums">${fmtInt(totalKills)}</span>
              </div>
            </div>

            ${forgeActionHtml}
          </div>
        </div>
      </div>
    `;

    return renderModalShell({
      theme: 'omega-boss',
      title: 'Omega Duel Sanctum',
      headerExtraHtml,
      iconHtml: omegaCrestIconHtml(22),
      bodyHtml,
      boxClass: `w-[min(940px,calc(100%-16px))] ${TW_SHOP_MODAL_RESP}`,
    });
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-omega-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.omegaTab as OmegaBossId | undefined;
        if (!id) return;
        audio.playSfx('ui-tab');
        this.clearForgeCutscene();
        this.openForBoss(id);
        this.onRequestRender();
      });
    });

    root.querySelectorAll<HTMLElement>('[data-omega-tier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = Number(btn.dataset.omegaTier || 0);
        if (t >= 1 && t <= 5) {
          audio.playSfx('ui-click');
          this.selectedTier = t;
          this.onRequestRender();
        }
      });
    });

    root.querySelector<HTMLElement>('[data-omega-buy-key]')?.addEventListener('click', () => {
      const res = this.state.buyOmegaKeyWithGems();
      if (res === 'bought') {
        audio.playSfx('coin');
        this.onToast?.('+1 Boss Key!');
      } else if (res === 'full') {
        this.onToast?.('Boss Keys already full!');
      } else {
        this.onToast?.(`Need ${fmtShort(OMEGA_KEY_GEM_COST)} Gems!`);
      }
      this.onRequestRender();
    });

    root.querySelector<HTMLElement>('[data-omega-ad-key]')?.addEventListener('click', () => {
      cgRequestRewardedAd(
        () => {
          if (this.state.grantFreeOmegaKey()) {
            audio.playSfx('coin');
            this.onToast?.('+1 Free Boss Key!');
          }
          this.onRequestRender();
        },
        () => this.onToast?.('Ad unavailable.')
      );
    });

    root.querySelector<HTMLElement>('[data-omega-fight]')?.addEventListener('click', () => {
      audio.playSfx('ui-click');
      this.onCloseModal();
      this.onStartOmegaBattle(this.selectedBossId, this.selectedTier);
    });

    root.querySelector<HTMLElement>('[data-omega-retry]')?.addEventListener('click', (e) => {
      const tier = Number((e.currentTarget as HTMLElement).dataset.omegaRetry || this.selectedTier);
      audio.playSfx('ui-click');
      this.onCloseModal();
      this.onStartOmegaBattle(this.selectedBossId, tier);
    });

    root.querySelector<HTMLElement>('[data-omega-unlock]')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.omegaUnlock as OmegaBossId | undefined;
      if (!id) return;
      this.triggerForgeUnlock(id);
    });

    root.querySelector<HTMLElement>('[data-omega-awaken]')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.omegaAwaken as OmegaBossId | undefined;
      if (!id) return;
      this.triggerForgeAwaken(id);
    });

    root.querySelector<HTMLElement>('[data-omega-replay-cutscene]')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.omegaReplayCutscene as OmegaBossId | undefined;
      if (!id) return;
      this.replayUnlockedCutscene(id);
    });
  }
}
