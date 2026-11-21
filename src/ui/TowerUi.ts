import { audio } from '../audio/AudioManager';
import { WORLDS } from '../game/GameData';
import { GameState } from '../game/GameState';
import { CG_ADS_ENABLED, cgRequestRewardedAd } from '../sdk/crazygames';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import {
  getGlobalGemGainBonus,
  getTowerCheckpoints,
  getTowerFloorDef,
  getTowerSweepGemReward,
  getTowerWaveDef,
  getTowerWorldTier,
  TOWER_DICE_PITY_MAX,
  TOWER_KEY_GEM_COST,
  TOWER_MAX_FLOOR,
  TOWER_MAX_KEYS,
  TOWER_MILESTONES,
  TOWER_ORE_ROCKS_PER_WAVE,
  TOWER_WAVES_PER_FLOOR,
} from '../game/TowerData';
import { hudIconHtml, spireCoinIconHtml, towerIconHtml } from './HudIcons';
import { ModalKind, renderModalShell } from './HudShared';
import { TowerArenaHudUi } from './TowerArenaHudUi';

export class TowerUi {
  private selectedCheckpoint = 1;
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

  private ensureValidCheckpoint(): number {
    const cps = getTowerCheckpoints(this.state.towerBestFloor);
    if (!cps.includes(this.selectedCheckpoint)) {
      this.selectedCheckpoint = cps[cps.length - 1] ?? 1;
    }
    return this.selectedCheckpoint;
  }

  public syncDefaultCheckpoint(): void {
    const cps = getTowerCheckpoints(this.state.towerBestFloor);
    this.selectedCheckpoint = cps[cps.length - 1] ?? 1;
  }

  public renderTowerHubModal(): string {
    this.state.syncTowerKeys();
    const startFloor = this.ensureValidCheckpoint();
    const cps = getTowerCheckpoints(this.state.towerBestFloor);
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
    const summaryBg = isVictory ? 'bg-[#fef3c7]' : 'bg-[#e0f2fe]';
    const summaryTitle = isVictory ? '🏆 SPIRE CONQUERED • FLOOR 80 TAMAT!' : 'Last Run Summary';
    const summaryTitleColor = isVictory ? 'text-[#b45309]' : 'text-[#0369a1]';

    const summaryBannerHtml = summary
      ? `
        <div class="rounded-xl border-[2.5px] border-[#14111d] ${summaryBg} px-3.5 py-2.5 flex items-center justify-between gap-2.5 flex-wrap">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[12px] font-black uppercase tracking-wider ${summaryTitleColor}">${summaryTitle}</span>
              ${summary.newRecord ? '<span class="mam-tower-pill bg-[#fde047] text-[#14111d]">NEW RECORD</span>' : ''}
              ${(summary.bestStreakMult ?? 1) > 1 ? `<span class="mam-tower-pill bg-[#ffedd5] text-[#9a3412]">🔥 ${(summary.bestStreakMult ?? 1).toFixed(2).replace(/\.00$/, '')}× STREAK</span>` : ''}
            </div>
            <div class="text-[13px] font-bold text-[#334155] mt-0.5">
              Cleared <span class="text-[#14111d] font-black">${summary.floorsCleared}</span> floor(s) (${summary.wavesCleared} waves) • Reached <span class="text-[#0369a1] font-black">Floor ${summary.highestReached}/${TOWER_MAX_FLOOR} • Wave ${summary.highestWave}/${TOWER_WAVES_PER_FLOOR}</span>
            </div>
            ${nearMissHtml}
          </div>
          <div class="flex items-center gap-1.5 flex-wrap shrink-0">
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
              data-retry-floor="${summary.startFloor}"
              ${this.state.towerKeys <= 0 ? 'disabled' : ''}
            >⚡ ${isVictory ? `Replay Fl ${summary.startFloor}` : `Retry Floor ${summary.startFloor}`}</button>
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

    const checkpointChips = cps
      .map((cp) => {
        const active = cp === startFloor;
        const tier = getTowerWorldTier(cp);
        const cls = active
          ? 'bg-[#38bdf8] text-[#14111d]'
          : 'bg-[#fcecc8] text-[#14111d] hover:bg-[#fde047]';
        return `<button class="mam-tower-cp-btn ${cls}" data-tower-cp="${cp}"><span class="w-2 h-2 rounded-full border border-[#14111d] shrink-0" style="background:${tier.world.iconColor}"></span><span>Fl ${cp}</span></button>`;
      })
      .join('');

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
      <div class="flex-1 min-h-0 flex items-stretch gap-3 @max-[860px]:flex-col overflow-x-hidden overflow-y-auto mam-no-scrollbar">
        <div class="flex-1 min-w-0 flex flex-col gap-3">
          ${summaryBannerHtml}

          <div class="mam-inspector-well rounded-xl p-3 flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] font-black uppercase tracking-wider text-[#0284c7]">Spire Campaign (W1–W8)</span>
                ${spireConquered ? '<span class="mam-tower-pill bg-[#fde047] text-[#14111d]">🏆 80/80 TAMAT!</span>' : ''}
              </div>
              <div class="text-[12px] font-bold text-[#475569]">Best Floor: <span class="text-[#14111d] font-black tabular-nums">${this.state.towerBestFloor}/${TOWER_MAX_FLOOR}</span></div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">${worldCampaignStripHtml}</div>
            <div class="text-[11px] font-bold text-[#64748b] pt-0.5">Select Checkpoint (every 5 floors unlocks a Checkpoint &amp; Spire Milestone):</div>
            <div class="flex items-center gap-1.5 flex-wrap">${checkpointChips}</div>
          </div>

          <div class="mam-inspector-well rounded-xl p-4 flex flex-col gap-3">
            <div class="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div class="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span class="mam-tower-pill bg-[#fff8e7] text-[#14111d]">
                    <span class="w-2 h-2 rounded-full border border-[#14111d] shrink-0" style="background:${previewDef.world.iconColor}"></span>
                    <span>W${previewDef.worldIndex + 1} • ${previewDef.world.name.toUpperCase()}</span>
                  </span>
                  <span class="mam-tower-pill bg-[#fcecc8] text-[#475569]">Stage ${previewDef.floorInWorld}/10</span>
                </div>
                <div class="text-[18px] font-black text-[#14111d]">${previewDef.title} • 10 Waves</div>
                <div class="text-[12px] font-black text-[#7c3aed]">Anomaly: ${previewDef.anomaly.name} — ${previewDef.anomaly.desc}</div>
                <div class="text-[11px] font-bold text-[#475569] mt-0.5">Waves 1–9: Break ${TOWER_ORE_ROCKS_PER_WAVE} ${previewDef.world.name} Ores/Wave • Wave 10: ${previewDef.isFinalBoss ? 'FINAL SPIRE OVERLORD' : 'Floor Boss'}</div>
              </div>
              <span class="mam-tower-pill ${
                previewDef.isFinalBoss
                  ? 'bg-[#f43f5e] text-white'
                  : previewDef.isBoss
                    ? 'bg-[#fde047] text-[#14111d]'
                    : 'bg-[#bae6fd] text-[#14111d]'
              }">${previewDef.isFinalBoss ? 'FINAL BOSS 80' : previewDef.isBoss ? 'CHECKPOINT BOSS' : '9 WAVES + BOSS'}</span>
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

        <div class="mam-inspector-well w-[300px] @max-[860px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col gap-2.5 overflow-x-hidden overflow-y-auto mam-no-scrollbar">
          <div class="text-[12px] font-black uppercase tracking-wider text-[#7c3aed]">Combat Readiness</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-2">
              <div class="text-[10px] font-black text-[#64748b]">ACTIVE MINERS</div>
              <div class="text-[14px] font-black text-[#14111d]">${placedCount}/5</div>
            </div>
            <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-2">
              <div class="text-[10px] font-black text-[#64748b]">TEAM DPS</div>
              <div class="text-[14px] font-black text-[#0284c7]">${fmtShort(teamDps)}/s</div>
            </div>
            <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-2">
              <div class="text-[10px] font-black text-[#64748b]">TAP DAMAGE</div>
              <div class="text-[14px] font-black text-[#15803d]">${fmtShort(tapDmg)}</div>
            </div>
            <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-2">
              <div class="text-[10px] font-black text-[#64748b]">GLOBAL GEM BONUS</div>
              <div class="text-[14px] font-black text-[#db2777]">+${globalBonusPct}%</div>
            </div>
          </div>

          <div class="text-[12px] font-black uppercase tracking-wider text-[#7c3aed] pt-1">Milestones (Every 5 Floors)</div>
          <div class="flex flex-col gap-1.5">${milestonesHtml}</div>
        </div>
      </div>
    `;

    return renderModalShell({
      title: 'Gem Tower',
      theme: 'tower',
      iconHtml: towerIconHtml(22),
      boxClass: 'w-[960px] h-[min(640px,calc(100%-16px))] @max-[920px]:w-full @max-[920px]:h-full',
      headerExtraHtml,
      bodyHtml,
    });
  }


  public renderTowerArenaHud(currencyRailHtml: string, toastStackHtml: string): string {
    return this.arenaHudUi.renderTowerArenaHud(currencyRailHtml, toastStackHtml);
  }

  public updateLiveValues(root: HTMLElement): void {
    this.arenaHudUi.updateLiveValues(root);
  }


  public bindHubEvents(root: HTMLElement): void {
    root.querySelectorAll('[data-tower-cp]').forEach((el) => {
      el.addEventListener('click', () => {
        const cp = Number((el as HTMLElement).dataset.towerCp || 1);
        if (cp >= 1) {
          audio.playSfx('ui-tab');
          this.selectedCheckpoint = cp;
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
      const cp = this.ensureValidCheckpoint();
      if (!this.state.startTowerRun(cp)) {
        audio.playSfx('ui-error');
        this.pushToast('Out of Tower Keys!');
        return;
      }
      audio.playSfx('teleport');
      this.onOpenModal('none');
      this.onEnterTowerArena();
    });

    root.querySelector('[data-action="tower-retry-run"]')?.addEventListener('click', (e) => {
      const floorAttr = Number((e.currentTarget as HTMLElement).dataset.retryFloor || 0);
      const cp = floorAttr >= 1 ? floorAttr : this.ensureValidCheckpoint();
      this.selectedCheckpoint = cp;
      if (!this.state.startTowerRun(cp)) {
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
