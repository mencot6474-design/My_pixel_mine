import { audio } from '../audio/AudioManager';
import { getChibiById } from '../game3d/ChibiCatalog';
import { assetUrl } from '../game/AssetUrl';
import { WORLDS } from '../game/GameData';
import { GameState } from '../game/GameState';
import { PREMIUM_SHOP_ITEMS } from '../game/PremiumShopData';
import { CG_ADS_ENABLED, cgRequestRewardedAd } from '../sdk/crazygames';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import {
  getGlobalGemGainBonus,
  getTowerFloorDef,
  getTowerSweepGemReward,
  getTowerWaveDef,
  TOWER_DICE_PITY_MAX,
  TOWER_KEY_GEM_COST,
  TOWER_MAX_FLOOR,
  TOWER_MAX_KEYS,
  TOWER_MILESTONES,
  TOWER_ORE_ROCKS_PER_WAVE,
  TOWER_WAVES_PER_FLOOR,
} from '../game/TowerData';
import { hudIconHtml, spireCoinIconHtml, towerIconHtml } from './HudIcons';
import { chibiPortraitHtml, ModalKind, renderModalShell, TW_TAB_BTN } from './HudShared';
import { TowerArenaHudUi } from './TowerArenaHudUi';

export class TowerUi {
  private rightTab: 'drops' | 'milestones' = 'drops';
  private readonly arenaHudUi: TowerArenaHudUi;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onOpenModal: (kind: ModalKind) => void,
    private readonly onEnterTowerArena: () => void,
    private readonly onExitTowerArena: () => void,
    private readonly onRequestRender: () => void
  ) {
    this.arenaHudUi = new TowerArenaHudUi(
      this.state,
      this.pushToast,
      this.onOpenModal,
      this.onExitTowerArena,
      this.onRequestRender
    );
  }

  public renderTowerHubModal(): string {
    this.state.syncTowerKeys();
    const startFloor = 1;
    const previewDef = getTowerFloorDef(startFloor);
    const wave1Def = getTowerWaveDef(startFloor, 1);
    const regenSec = this.state.getTowerNextKeyRegenSec();
    const regenStr =
      regenSec > 0 ? `+1 in ${Math.floor(regenSec / 60)}:${String(regenSec % 60).padStart(2, '0')}` : 'Full';
    const sweepGems = getTowerSweepGemReward(this.state.towerBestFloor);
    const globalBonusPct = Math.round(getGlobalGemGainBonus(this.state.towerBestFloor) * 100);
    const globalMult = 1 + getGlobalGemGainBonus(this.state.towerBestFloor);
    const teamDps = this.state.getTotalPlotDps();
    const tapDmg = this.state.getTapDamage();
    const placedCount = this.state.plotMiners.filter(Boolean).length;
    const summary = this.state.towerLastSummary;
    const pity = Math.max(0, Math.min(TOWER_DICE_PITY_MAX - 1, this.state.towerDicePity ?? 0));
    const pityReady = pity + 1 >= TOWER_DICE_PITY_MAX;
    const spireConquered = this.state.towerBestFloor >= TOWER_MAX_FLOOR;
    const pityPipsHtml = Array.from({ length: TOWER_DICE_PITY_MAX }, (_, idx) => {
      const filled = idx < pity || (pityReady && idx === TOWER_DICE_PITY_MAX - 1);
      const cls = filled
        ? pityReady
          ? 'bg-[#a855f7]'
          : 'bg-[#c084fc]'
        : 'bg-[#e2e8f0]';
      return `<span class="w-4 h-2.5 rounded-sm border-[1.5px] border-[#14111d] ${cls}"></span>`;
    }).join('');

    const headerExtraHtml = `
      <div class="flex items-center gap-2 flex-wrap">
        <div class="mam-tower-hub-chip bg-[#e0f2fe] text-[#14111d]" data-tower-keys-pill="true">
          <span>🔑 ${this.state.towerKeys}/${TOWER_MAX_KEYS}</span>
          <span class="text-[11px] text-[#475569] font-bold" data-tower-regen="true">(${regenStr})</span>
        </div>
        ${
          this.state.towerKeys < TOWER_MAX_KEYS
            ? `<button class="mam-tower-hub-chip bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] cursor-pointer hover:scale-[0.97] active:scale-95 transition-transform" data-action="tower-buy-key"><span>+1 Key</span>${hudIconHtml('gem', 14, 'Gems')}<span>${fmtInt(TOWER_KEY_GEM_COST)}</span></button>${
                CG_ADS_ENABLED
                  ? `<button class="mam-tower-hub-chip bg-[#4ade80] hover:bg-[#86efac] text-[#14111d] cursor-pointer hover:scale-[0.97] active:scale-95 transition-transform" data-action="tower-ad-key">🎬 +1 Key (Ad)</button>`
                  : ''
              }`
            : ''
        }
        <div class="mam-tower-hub-chip bg-[#fef08a] text-[#14111d]" data-tower-coins-pill="true" title="Spire Coins">
          ${spireCoinIconHtml(15)}
          <span>${fmtInt(this.state.towerCoins)}</span>
        </div>
        <button class="mam-tower-hub-chip bg-[linear-gradient(135deg,#e0f2fe,#fce7f3)] hover:bg-[#fef08a] text-[#14111d] cursor-pointer hover:scale-[0.97] active:scale-95 transition-transform" data-action="tower-open-twin-shop" title="Open Twin Shop (Spire Coin Exchange)">
          <img class="w-4 h-4 object-contain shrink-0" src="${assetUrl('/badges/twin.svg')}" alt="" aria-hidden="true" draggable="false" />
          <span>Twin Shop →</span>
        </button>
        <div class="mam-tower-hub-chip bg-[#fce7f3] text-[#14111d]" data-tower-gems-pill="true">
          ${hudIconHtml('gem', 15, 'Gems')}
          <span>${fmtInt(this.state.gems)}</span>
        </div>
      </div>
    `;

    const nearMissHtml =
      summary && summary.reason === 'timeout' && (summary.remainingHpPct ?? 0) > 0
        ? `<div class="mt-1.5 mam-tower-pill ${
            (summary.remainingHpPct ?? 100) <= 25
              ? 'bg-[#fecdd3] text-[#881337]'
              : 'bg-[#fef3c7] text-[#92400e]'
          } w-fit">
            <span>${(summary.remainingHpPct ?? 100) <= 25 ? '🔥 SO CLOSE!' : '⏱ TIME UP!'}</span>
            <span>${summary.wasBossWave ? 'Boss' : `Wave ${summary.highestWave}`} had ${summary.remainingHpPct}% HP left!</span>
          </div>`
        : '';

    const isVictory = summary?.reason === 'victory';
    const summaryTwins = summary?.twinsEarned ?? [];
    const hasTwinJackpot = summaryTwins.length > 0;
    const summaryBg = hasTwinJackpot
      ? 'is-holo-foil bg-[linear-gradient(125deg,#e0f2fe,#fef9c3_48%,#fce7f3)]'
      : isVictory
        ? 'bg-[#fef3c7]'
        : 'bg-[#e0f2fe]';
    const summaryTitle = isVictory
      ? '🏆 SPIRE CONQUERED • FLOOR 80 TAMAT!'
      : hasTwinJackpot
        ? '✦ JACKPOT 0.01% TWIN DROP!'
        : 'Last Run Summary';
    const summaryTitleColor = hasTwinJackpot
      ? 'text-[#9d174d]'
      : isVictory
        ? 'text-[#b45309]'
        : 'text-[#0369a1]';

    const summaryTwinCounts = new Map<string, number>();
    for (const tid of summaryTwins) {
      summaryTwinCounts.set(tid, (summaryTwinCounts.get(tid) ?? 0) + 1);
    }
    const summaryTwinChipsHtml =
      summaryTwinCounts.size > 0
        ? `<div class="flex items-center gap-1.5 flex-wrap mt-1.5">
            ${Array.from(summaryTwinCounts.entries())
              .map(([tid, qty]) => {
                const def = getChibiById(tid);
                if (!def) return '';
                return `<span class="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#14111d] bg-[#fff8e7] px-2 py-0.5 text-[11px] font-black text-[#14111d]">
                  <span class="w-5 h-5 shrink-0 inline-flex items-center justify-center [&_.mam-chibi-portrait]:w-full [&_.mam-chibi-portrait]:h-full [&_img]:w-full [&_img]:h-full [&_img]:object-contain">${chibiPortraitHtml(def, { draggable: false })}</span>
                  <span>${def.name}${qty > 1 ? ` ×${qty}` : ''}</span>
                </span>`;
              })
              .join('')}
          </div>`
        : '';

    const summaryBannerHtml = summary
      ? `
        <div class="relative overflow-hidden rounded-xl border-[2.5px] border-[#14111d] ${summaryBg} px-3.5 py-2.5 flex items-center justify-between gap-2.5 flex-wrap shrink-0">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[12px] font-black uppercase tracking-wider ${summaryTitleColor}">${summaryTitle}</span>
              ${hasTwinJackpot ? '<span class="mam-tower-pill bg-[#ec4899] text-white">0.01% TWIN</span>' : ''}
              ${summary.newRecord ? '<span class="mam-tower-pill bg-[#fde047] text-[#14111d]">NEW RECORD</span>' : ''}
              ${(summary.bestStreakMult ?? 1) > 1 ? `<span class="mam-tower-pill bg-[#ffedd5] text-[#9a3412]">🔥 ${(summary.bestStreakMult ?? 1).toFixed(2).replace(/\.00$/, '')}× STREAK</span>` : ''}
            </div>
            <div class="text-[13px] font-bold text-[#334155] mt-0.5">
              Cleared <span class="text-[#14111d] font-black">${summary.floorsCleared}</span> floor(s) (${summary.wavesCleared} waves) • Reached <span class="text-[#0369a1] font-black">Floor ${summary.highestReached}/${TOWER_MAX_FLOOR} • Wave ${summary.highestWave}/${TOWER_WAVES_PER_FLOOR}</span>
            </div>
            ${summaryTwinChipsHtml}
            ${nearMissHtml}
          </div>
          <div class="flex items-center gap-1.5 flex-wrap max-w-full shrink-0">
            <span class="mam-tower-hub-chip bg-[#fce7f3] text-[#9d174d]">+${fmtInt(summary.gemsEarned)} Gems</span>
            ${summary.diceEarned > 0 ? `<span class="mam-tower-hub-chip bg-[#f3e8ff] text-[#6b21a8]">+${summary.diceEarned} Dice</span>` : ''}
            ${(summary.coinsEarned ?? 0) > 0 ? `<span class="mam-tower-hub-chip bg-[#fef08a] text-[#14111d]">+${fmtInt(summary.coinsEarned ?? 0)} Spire Coins</span>` : ''}
            <button
              class="mam-tower-hub-chip ${
                this.state.towerKeys > 0
                  ? 'bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] cursor-pointer hover:scale-[0.97] active:scale-95'
                  : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
              } transition-transform"
              data-action="tower-retry-run"
              data-retry-floor="1"
              ${this.state.towerKeys <= 0 ? 'disabled' : ''}
            >⚡ ${isVictory ? 'Replay Floor 1' : 'Retry Floor 1'}</button>
          </div>
        </div>
      `
      : '';

    const worldCampaignStripHtml = WORLDS.map((w, idx) => {
      const minFl = idx * 10 + 1;
      const maxFl = (idx + 1) * 10;
      const cleared = this.state.towerBestFloor >= maxFl;
      const activeTier = previewDef.worldIndex === idx;
      return `
        <div class="flex-1 min-w-[64px] h-[44px] rounded-xl border-2 border-[#14111d] px-1.5 flex flex-col items-center justify-center text-center transition-colors ${
          activeTier ? 'bg-[#e0f2fe] ring-2 ring-inset ring-[#0284c7]' : cleared ? 'bg-[#dcfce7]' : 'bg-[#fff8e7]'
        }">
          <div class="flex items-center justify-center gap-1 leading-none">
            <span class="w-2 h-2 rounded-full border border-[#14111d] shrink-0" style="background:${w.iconColor}"></span>
            <span class="text-[10.5px] font-black text-[#14111d]">W${idx + 1}${cleared ? ' ✓' : ''}</span>
          </div>
          <span class="text-[9.5px] font-bold text-[#475569] tabular-nums leading-tight mt-0.5">F${minFl}-${maxFl}</span>
        </div>
      `;
    }).join('');

    const milestonesHtml = TOWER_MILESTONES.map((m) => {
      const done = this.state.towerBestFloor >= m.floor;
      return `
        <div class="w-full rounded-xl border-2 border-[#14111d] px-3 py-2 flex items-center justify-between gap-2 ${
          done ? 'bg-[#dcfce7]' : 'bg-[#fcecc8]'
        }">
          <div class="flex flex-col text-left min-w-0">
            <div class="text-[12px] font-black truncate ${done ? 'text-[#14532d]' : 'text-[#14111d]'}">Floor ${m.floor} • ${m.title}</div>
            <div class="text-[10.5px] font-bold text-[#475569] truncate">+${fmtShort(m.gemBonus)} Gems • +${m.diceBonus} Dice • +${Math.round(m.globalGemPct * 100)}% Global</div>
          </div>
          <span class="mam-tower-pill min-w-[66px] ${
            done ? 'bg-[#4ade80] text-[#14111d]' : 'bg-white text-[#475569]'
          }">${done ? 'CLAIMED' : `${Math.min(this.state.towerBestFloor, m.floor)}/${m.floor}`}</span>
        </div>
      `;
    }).join('');

    const bodyHtml = `
      <div class="flex-1 min-h-0 flex items-stretch gap-3 @max-[860px]:flex-col overflow-hidden @max-[860px]:overflow-y-auto mam-no-scrollbar">
        <div class="flex-1 min-w-0 min-h-0 flex flex-col gap-3 overflow-x-hidden overflow-y-auto mam-no-scrollbar pr-0.5 @max-[860px]:flex-none @max-[860px]:overflow-visible">
          ${summaryBannerHtml}

          <div class="mam-inspector-well rounded-xl p-3 flex flex-col gap-2 shrink-0">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] font-black uppercase tracking-wider text-[#0284c7]">Spire Campaign (W1–W8)</span>
                ${spireConquered ? '<span class="mam-tower-pill bg-[#fde047] text-[#14111d]">🏆 80/80 TAMAT!</span>' : ''}
              </div>
              <div class="text-[12px] font-bold text-[#475569]">Best Floor: <span class="text-[#14111d] font-black tabular-nums">${this.state.towerBestFloor}/${TOWER_MAX_FLOOR}</span></div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">${worldCampaignStripHtml}</div>
            <div class="text-[11px] font-bold text-[#64748b] pt-0.5">Every run climbs from Floor 1 • Every 5 floors clears a Spire Milestone &amp; permanent Global Gem Bonus.</div>
          </div>

          <div class="mam-inspector-well rounded-xl p-3.5 flex flex-col gap-3 shrink-0">
            <div class="relative overflow-hidden rounded-xl border-2 border-[#14111d] bg-[#0f172a] p-3.5 bg-cover bg-center" style="background-image: linear-gradient(102deg, rgba(15, 23, 42, 0.92) 0%, rgba(20, 17, 29, 0.74) 58%, rgba(15, 23, 42, 0.88) 100%), url('${assetUrl(`/worlds/${previewDef.world.id}.webp`)}')">
              <div class="relative z-[1] flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <span class="mam-tower-pill bg-[#fff8e7] text-[#14111d]">
                      <span class="w-2 h-2 rounded-full border border-[#14111d] shrink-0" style="background:${previewDef.world.iconColor}"></span>
                      <span>W${previewDef.worldIndex + 1} • ${previewDef.world.name.toUpperCase()}</span>
                    </span>
                    <span class="mam-tower-pill bg-[#fcecc8] text-[#14111d]">Stage ${previewDef.floorInWorld}/10</span>
                    <span class="mam-tower-pill ${
                      previewDef.isFinalBoss
                        ? 'bg-[#f43f5e] text-white'
                        : previewDef.isBoss
                          ? 'bg-[#fde047] text-[#14111d]'
                          : 'bg-[#bae6fd] text-[#14111d]'
                    }">${previewDef.isFinalBoss ? 'FINAL BOSS 80' : previewDef.isBoss ? 'MILESTONE BOSS' : '9 WAVES + BOSS'}</span>
                  </div>
                  <div class="text-[19px] font-black !text-white leading-tight drop-shadow-[0_2px_0_rgba(20,17,29,0.9)]">${previewDef.title} • 10 Waves</div>
                  <div class="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-black/45 px-2 py-0.5 text-[11.5px] font-black text-[#e9d5ff]">
                    <span>⚡ Anomaly: ${previewDef.anomaly.name}</span>
                    <span class="!text-white/85 font-bold">— ${previewDef.anomaly.desc}</span>
                  </div>
                  <div class="text-[11px] font-bold !text-[#cbd5e1] mt-1">Waves 1–9: Break ${TOWER_ORE_ROCKS_PER_WAVE} ${previewDef.world.name} Ores/Wave • Wave 10: ${previewDef.isFinalBoss ? 'FINAL SPIRE OVERLORD' : 'Floor Boss'}</div>
                </div>
                <div class="shrink-0 w-16 h-16 rounded-xl border-2 border-[#14111d] bg-[#1e1b2e]/90 p-1.5 flex items-center justify-center @max-[560px]:hidden">
                  <img class="w-full h-full object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]" src="${assetUrl('/hud/tower_boss.webp')}" alt="Spire Boss" draggable="false" />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-3 @max-[560px]:grid-cols-1 gap-2">
              <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-3 py-2">
                <div class="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Wave 1 Rock / W10 Boss</div>
                <div class="text-[14px] font-black text-[#14111d] tabular-nums">${fmtShort(wave1Def.rockBaseHp)} / ${fmtShort(previewDef.hp)} HP</div>
              </div>
              <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-3 py-2">
                <div class="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Timer (Ore / Boss)</div>
                <div class="text-[14px] font-black text-[#0369a1] tabular-nums">${wave1Def.durationSec}s / ${previewDef.durationSec}s</div>
              </div>
              <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-3 py-2">
                <div class="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Boss Clear Reward</div>
                <div class="text-[14px] font-black text-[#db2777] tabular-nums">+${fmtInt(Math.round(previewDef.gemReward * globalMult))} Gems${previewDef.diceDropChance >= 1 ? ' + 1 Dice' : previewDef.diceDropChance > 0 ? ' + Dice%' : ''}</div>
              </div>
            </div>

            <div class="rounded-xl border-2 border-[#14111d] ${pityReady ? 'bg-[#f3e8ff]' : 'bg-[#fff8e7]'} px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
              <div class="flex items-center gap-2">
                <span class="text-[12px] font-black text-[#6b21a8]">🎲 Boss Dice Pity</span>
                <span class="text-[11px] font-bold text-[#475569]">${
                  pityReady
                    ? 'Next Boss defeat guarantees +1 Enchant Dice!'
                    : `Every Boss clear without Dice builds pity (${pity}/${TOWER_DICE_PITY_MAX})`
                }</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div class="inline-flex items-center gap-1">${pityPipsHtml}</div>
                <span class="text-[11px] font-black ${pityReady ? 'text-[#7c3aed]' : 'text-[#14111d]'} tabular-nums">${
                  pityReady ? 'GUARANTEED!' : `${pity}/${TOWER_DICE_PITY_MAX}`
                }</span>
              </div>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap pt-1">
              <button
                class="mam-sheen-hover relative overflow-hidden flex-1 min-w-[200px] h-11 px-5 rounded-xl border-[2.5px] border-[#14111d] ${
                  this.state.towerKeys > 0
                    ? 'bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#14111d] cursor-pointer hover:scale-[0.98] active:scale-[0.95]'
                    : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
                } text-[15px] font-black transition-transform duration-150"
                data-action="tower-enter-run"
                ${this.state.towerKeys <= 0 ? 'disabled' : ''}
              >
                ${this.state.towerKeys > 0 ? `Enter Floor ${startFloor} (1 Key)` : 'Out of Tower Keys'}
              </button>

              <button
                class="h-11 px-4 rounded-xl border-[2.5px] border-[#14111d] ${
                  this.state.towerBestFloor >= 1 && this.state.towerKeys > 0
                    ? 'bg-[#4ade80] hover:bg-[#86efac] text-[#14111d] cursor-pointer hover:scale-[0.97] active:scale-95'
                    : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
                } text-[13px] font-black transition-transform duration-150"
                data-action="tower-quick-sweep"
                ${this.state.towerBestFloor < 1 || this.state.towerKeys <= 0 ? 'disabled' : ''}
              >
                Quick Sweep (+${fmtInt(Math.round(sweepGems * globalMult))} Gems)
              </button>
            </div>
          </div>
        </div>

        <div class="mam-inspector-well w-[324px] @max-[860px]:w-full shrink-0 min-h-0 rounded-xl p-3 flex flex-col gap-2.5 overflow-x-hidden overflow-y-auto @max-[860px]:overflow-visible mam-no-scrollbar">
          <div class="grid grid-cols-2 gap-1.5 shrink-0">
            <button
              class="${TW_TAB_BTN} h-8 text-[11px] ${
                this.rightTab === 'drops'
                  ? 'bg-[#38bdf8] text-[#14111d]'
                  : 'bg-[#fcecc8] text-[#475569] hover:bg-[#fde047]'
              }"
              data-tower-right-tab="drops"
            >Drops &amp; Stats</button>
            <button
              class="${TW_TAB_BTN} h-8 text-[11px] ${
                this.rightTab === 'milestones'
                  ? 'bg-[#38bdf8] text-[#14111d]'
                  : 'bg-[#fcecc8] text-[#475569] hover:bg-[#fde047]'
              }"
              data-tower-right-tab="milestones"
            >Milestones (${TOWER_MILESTONES.filter((m) => this.state.towerBestFloor >= m.floor).length}/${TOWER_MILESTONES.length})</button>
          </div>
          ${this.renderRightSidebarBody(placedCount, teamDps, tapDmg, globalBonusPct, milestonesHtml)}
        </div>
      </div>
    `;

    return renderModalShell({
      title: 'Gem Tower',
      theme: 'tower',
      iconHtml: towerIconHtml(22),
      boxClass: 'w-[980px] h-[min(650px,calc(100%-16px))] @max-[920px]:w-full @max-[920px]:h-full',
      headerExtraHtml,
      bodyHtml,
    });
  }

  private renderRightSidebarBody(
    placedCount: number,
    teamDps: number,
    tapDmg: number,
    globalBonusPct: number,
    milestonesHtml: string
  ): string {
    if (this.rightTab === 'milestones') {
      return `<div class="flex flex-col gap-1.5 overflow-y-auto mam-no-scrollbar pr-0.5">${milestonesHtml}</div>`;
    }

    const twinRosterHtml = PREMIUM_SHOP_ITEMS.map((item) => {
      const def = getChibiById(item.chibiId);
      if (!def) return '';
      const count = this.state.miners[item.chibiId] ?? 0;
      const owned = count > 0;
      return `
        <div
          class="relative rounded-lg border-2 border-[#14111d] ${
            owned ? 'bg-[#fff8e7]' : 'bg-[#e2e8f0]/80 opacity-80'
          } p-1 flex flex-col items-center justify-center"
          title="${def.name} (${item.passiveSummary})${owned ? ` — Owned ×${count}` : ' — Not Owned'}"
        >
          <div class="w-9 h-9 flex items-center justify-center [&_.mam-chibi-portrait]:w-full [&_.mam-chibi-portrait]:h-full [&_img]:w-full [&_img]:h-full [&_img]:object-contain ${
            owned ? '' : 'grayscale contrast-125'
          }">${chibiPortraitHtml(def, { draggable: false })}</div>
          <span class="mt-0.5 text-[9px] font-black leading-none px-1 py-0.5 rounded border border-[#14111d] ${
            owned ? 'bg-[#4ade80] text-[#14111d]' : 'bg-white text-[#64748b]'
          }">${owned ? `×${count}` : '0.01%'}</span>
        </div>
      `;
    }).join('');

    const nextMilestone = TOWER_MILESTONES.find((m) => this.state.towerBestFloor < m.floor) ?? null;
    const nextMilestoneHtml = nextMilestone
      ? (() => {
          const pct = Math.max(0, Math.min(100, Math.round((this.state.towerBestFloor / nextMilestone.floor) * 100)));
          return `
            <div class="rounded-xl border-2 border-[#14111d] bg-[#fff8e7] p-2.5 flex flex-col gap-1.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10.5px] font-black uppercase tracking-wider text-[#7c3aed]">Next Milestone</span>
                <span class="text-[10.5px] font-black text-[#14111d] tabular-nums">${this.state.towerBestFloor}/${nextMilestone.floor}</span>
              </div>
              <div class="text-[12px] font-black text-[#14111d] truncate">Floor ${nextMilestone.floor} • ${nextMilestone.title}</div>
              <div class="h-2 w-full rounded-full border-[1.5px] border-[#14111d] bg-[#e2e8f0] overflow-hidden">
                <div class="h-full bg-[#38bdf8]" style="width:${pct}%"></div>
              </div>
              <div class="text-[10.5px] font-bold text-[#475569]">+${fmtShort(nextMilestone.gemBonus)} Gems • +${nextMilestone.diceBonus} Dice • +${Math.round(nextMilestone.globalGemPct * 100)}% Global</div>
            </div>
          `;
        })()
      : `
        <div class="rounded-xl border-2 border-[#14111d] bg-[#dcfce7] p-2.5 flex items-center justify-between gap-2">
          <div class="text-[11.5px] font-black text-[#14532d]">🏆 All 16/16 Milestones Cleared!</div>
          <span class="mam-tower-pill bg-[#4ade80] text-[#14111d]">MAXED</span>
        </div>
      `;

    return `
      <div class="flex flex-col gap-2.5">
        <div class="text-[11px] font-black uppercase tracking-wider text-[#7c3aed]">Combat Readiness</div>
        <div class="grid grid-cols-2 gap-1.5">
          <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-1.5">
            <div class="text-[9.5px] font-black text-[#64748b]">ACTIVE MINERS</div>
            <div class="text-[13.5px] font-black text-[#14111d]">${placedCount}/5</div>
          </div>
          <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-1.5">
            <div class="text-[9.5px] font-black text-[#64748b]">TEAM DPS</div>
            <div class="text-[13.5px] font-black text-[#0284c7]">${fmtShort(teamDps)}/s</div>
          </div>
          <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-1.5">
            <div class="text-[9.5px] font-black text-[#64748b]">TAP DAMAGE</div>
            <div class="text-[13.5px] font-black text-[#15803d]">${fmtShort(tapDmg)}</div>
          </div>
          <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-1.5">
            <div class="text-[9.5px] font-black text-[#64748b]">GLOBAL GEM BONUS</div>
            <div class="text-[13.5px] font-black text-[#db2777]">+${globalBonusPct}%</div>
          </div>
        </div>

        <div class="text-[11px] font-black uppercase tracking-wider text-[#7c3aed]">Spire Loot &amp; Jackpot Drops</div>
        <div class="rounded-xl border-2 border-[#14111d] bg-[#fef9c3] px-2.5 py-2 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            ${spireCoinIconHtml(20)}
            <div class="min-w-0">
              <div class="text-[11.5px] font-black text-[#14111d] leading-tight">Spire Coins</div>
              <div class="text-[10px] font-bold text-[#475569]">0.5% / Wave Ore • 5% (+5) / Boss</div>
            </div>
          </div>
          <button class="mam-tower-pill bg-[#fff8e7] hover:bg-[#fde047] text-[#14111d] cursor-pointer shrink-0" data-action="tower-open-twin-shop">Exchange →</button>
        </div>

        <div class="relative overflow-hidden is-holo-foil rounded-xl border-2 border-[#14111d] bg-[linear-gradient(135deg,#e0f2fe,#fef3c7_50%,#fce7f3)] p-2.5 flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <img class="h-6 w-auto object-contain shrink-0" src="${assetUrl('/badges/twin.svg')}" alt="TWIN" draggable="false" />
              <div class="min-w-0">
                <div class="text-[11.5px] font-black text-[#14111d] leading-tight">Jackpot TWIN Chibi</div>
                <div class="text-[10px] font-bold text-[#9d174d]">0.01% / Broken Wave 1–9 Ore</div>
              </div>
            </div>
            <span class="mam-tower-pill bg-[#ec4899] text-white shrink-0">0.01%</span>
          </div>
          <div class="grid grid-cols-5 gap-1">${twinRosterHtml}</div>
        </div>

        ${nextMilestoneHtml}
      </div>
    `;
  }


  public renderTowerArenaHud(currencyRailHtml: string, toastStackHtml: string): string {
    return this.arenaHudUi.renderTowerArenaHud(currencyRailHtml, toastStackHtml);
  }

  public updateLiveValues(root: HTMLElement): void {
    this.arenaHudUi.updateLiveValues(root);
  }


  public bindHubEvents(root: HTMLElement): void {
    root.querySelectorAll('[data-action="tower-open-twin-shop"]').forEach((el) => {
      el.addEventListener('click', () => {
        audio.playSfx('ui-open');
        this.onOpenModal('premium-shop');
      });
    });

    root.querySelectorAll('[data-tower-right-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        const tab = (el as HTMLElement).dataset.towerRightTab === 'milestones' ? 'milestones' : 'drops';
        if (this.rightTab !== tab) {
          audio.playSfx('ui-tab');
          this.rightTab = tab;
          this.onRequestRender();
        }
      });
    });

    root.querySelector('[data-action="tower-buy-key"]')?.addEventListener('click', () => {
      const res = this.state.buyTowerKeyWithGems();
      if (res === 'bought') {
        audio.playSfx('coin-alt');
        this.pushToast('+1 Tower Key purchased!');
      } else if (res === 'full') {
        audio.playSfx('ui-error');
        this.pushToast('Tower Keys are already full!');
      } else {
        audio.playSfx('ui-error');
        this.pushToast('Not enough Gems!');
      }
      this.onRequestRender();
    });

    root.querySelector('[data-action="tower-ad-key"]')?.addEventListener('click', () => {
      if (this.state.towerKeys >= TOWER_MAX_KEYS) {
        audio.playSfx('ui-error');
        this.pushToast('Tower Keys are already full!');
        return;
      }
      cgRequestRewardedAd(
        () => {
          if (this.state.grantFreeTowerKey()) {
            audio.playSfx('coin-alt');
            this.pushToast('+1 Free Tower Key!');
          }
          this.onRequestRender();
        },
        () => {
          audio.playSfx('ui-error');
          this.pushToast('Ad not available right now.');
        },
        (muted) => audio.setAdMuted(muted)
      );
    });

    root.querySelector('[data-action="tower-enter-run"]')?.addEventListener('click', () => {
      if (!this.state.startTowerRun(1)) {
        audio.playSfx('ui-error');
        this.pushToast('Out of Tower Keys!');
        return;
      }
      audio.playSfx('teleport');
      this.onOpenModal('none');
      this.onEnterTowerArena();
    });

    root.querySelector('[data-action="tower-retry-run"]')?.addEventListener('click', () => {
      if (!this.state.startTowerRun(1)) {
        audio.playSfx('ui-error');
        this.pushToast('Out of Tower Keys!');
        return;
      }
      audio.playSfx('teleport');
      this.onOpenModal('none');
      this.onEnterTowerArena();
    });

    root.querySelector('[data-action="tower-quick-sweep"]')?.addEventListener('click', () => {
      const res = this.state.quickSweepTower();
      if (res.ok) {
        audio.playSfx('coin');
        this.pushToast(`Quick Sweep: +${fmtInt(res.gemsAwarded)} Gems!`);
      } else {
        audio.playSfx('ui-error');
        this.pushToast('Clear Floor 1 first or need a Tower Key!');
      }
      this.onRequestRender();
    });
  }

  public bindArenaEvents(root: HTMLElement): void {
    this.arenaHudUi.bindArenaEvents(root);
  }
}
