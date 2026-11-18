import { audio } from '../audio/AudioManager';
import { GameState } from '../game/GameState';
import { CG_ADS_ENABLED, cgRequestRewardedAd } from '../sdk/crazygames';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import {
  getGlobalGemGainBonus,
  getTowerCheckpoints,
  getTowerFloorDef,
  getTowerSweepGemReward,
  getTowerWaveDef,
  TOWER_KEY_GEM_COST,
  TOWER_MAX_KEYS,
  TOWER_MILESTONES,
  TOWER_ORE_ROCKS_PER_WAVE,
  TOWER_WAVES_PER_FLOOR,
} from '../game/TowerData';
import { hudIconHtml, towerIconHtml } from './HudIcons';
import { ModalKind, renderModalShell, TW_SHOPS_PILL, TW_TOP_CENTER } from './HudShared';

export class TowerUi {
  private selectedCheckpoint = 1;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onOpenModal: (kind: ModalKind) => void,
    private readonly onEnterTowerArena: () => void,
    private readonly onExitTowerArena: () => void,
    private readonly onRequestRender: () => void
  ) {}

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

    const headerExtraHtml = `
      <div class="flex items-center gap-2 flex-wrap">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-cyan-300/35 bg-[rgba(12,18,34,0.85)] text-[13px] font-extrabold text-cyan-200" data-tower-keys-pill="true">
          <span>🔑 ${this.state.towerKeys}/${TOWER_MAX_KEYS}</span>
          <span class="text-[11px] text-slate-400 font-bold" data-tower-regen="true">(${regenStr})</span>
        </div>
        ${
          this.state.towerKeys < TOWER_MAX_KEYS
            ? `<button class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-amber-300/45 bg-[linear-gradient(135deg,rgba(245,158,11,0.85),rgba(180,83,9,0.92))] text-white text-[12px] font-black cursor-pointer hover:brightness-110 active:scale-95" data-action="tower-buy-key">+1 Key (${hudIconHtml('gem', 13, 'Gems')} ${fmtInt(TOWER_KEY_GEM_COST)})</button>${
                CG_ADS_ENABLED
                  ? `<button class="px-2.5 py-1 rounded-xl border border-emerald-300/45 bg-[linear-gradient(135deg,rgba(16,185,129,0.88),rgba(4,120,87,0.94))] text-white text-[12px] font-black cursor-pointer hover:brightness-110 active:scale-95" data-action="tower-ad-key">🎬 +1 Key (Ad)</button>`
                  : ''
              }`
            : ''
        }
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-pink-400/35 bg-[rgba(24,14,38,0.85)] text-[13px] font-black text-pink-200" data-tower-gems-pill="true">
          ${hudIconHtml('gem', 16, 'Gems')}
          <span>${fmtInt(this.state.gems)}</span>
        </div>
      </div>
    `;

    const summaryBannerHtml = summary
      ? `
        <div class="rounded-xl border border-cyan-400/40 bg-[linear-gradient(135deg,rgba(56,189,248,0.14),rgba(139,92,246,0.14))] px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="text-[12px] font-black uppercase tracking-wider text-cyan-300">Last Run Summary</span>
              ${summary.newRecord ? '<span class="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/50 text-[10px] font-black text-amber-200">NEW RECORD</span>' : ''}
            </div>
            <div class="text-[13px] font-bold text-slate-200">
              Cleared <span class="text-white font-black">${summary.floorsCleared}</span> floor(s) (${summary.wavesCleared} waves) • Reached <span class="text-cyan-200 font-black">Floor ${summary.highestReached} • Wave ${summary.highestWave}/${TOWER_WAVES_PER_FLOOR}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 text-[13px] font-black">
            <span class="px-2.5 py-1 rounded-lg bg-pink-500/20 border border-pink-300/40 text-pink-200">+${fmtInt(summary.gemsEarned)} Gems</span>
            ${summary.diceEarned > 0 ? `<span class="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-300/40 text-purple-200">+${summary.diceEarned} Dice</span>` : ''}
          </div>
        </div>
      `
      : '';

    const checkpointChips = cps
      .map((cp) => {
        const active = cp === startFloor;
        const cls = active
          ? 'border-cyan-300/75 bg-[linear-gradient(135deg,rgba(56,189,248,0.34),rgba(139,92,246,0.34))] text-white shadow-[0_0_12px_rgba(56,189,248,0.32)]'
          : 'border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]';
        return `<button class="px-3 py-1.5 rounded-xl border text-[12px] font-black cursor-pointer transition-all duration-150 active:scale-95 ${cls}" data-tower-cp="${cp}">Floor ${cp}</button>`;
      })
      .join('');

    const milestonesHtml = TOWER_MILESTONES.map((m) => {
      const done = this.state.towerBestFloor >= m.floor;
      return `
        <div class="w-full rounded-xl border px-3 py-2 flex items-center justify-between gap-2 ${
          done ? 'border-emerald-400/45 bg-emerald-500/10' : 'border-white/12 bg-white/[0.03]'
        }">
          <div class="flex flex-col text-left">
            <div class="text-[12px] font-black ${done ? 'text-emerald-300' : 'text-white'}">Floor ${m.floor} • ${m.title}</div>
            <div class="text-[11px] font-semibold text-slate-300">+${fmtInt(m.gemBonus)} Gems • +${m.diceBonus} Dice • +${Math.round(m.globalGemPct * 100)}% Global Gems</div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            done ? 'bg-emerald-400/20 border border-emerald-300/50 text-emerald-200' : 'bg-white/[0.06] border border-white/15 text-slate-400'
          }">${done ? 'CLAIMED' : `${Math.min(this.state.towerBestFloor, m.floor)}/${m.floor}`}</span>
        </div>
      `;
    }).join('');

    const bodyHtml = `
      <div class="flex-1 min-h-0 flex items-stretch gap-3 @max-[860px]:flex-col overflow-x-hidden overflow-y-auto mam-no-scrollbar">
        <div class="flex-1 min-w-0 flex flex-col gap-3">
          ${summaryBannerHtml}

          <div class="mam-inspector-well rounded-xl p-3.5 flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div class="text-[11px] font-black uppercase tracking-wider text-cyan-300">Starting Checkpoint</div>
                <div class="text-[12px] font-semibold text-slate-300">Best Floor: <span class="text-white font-black">${this.state.towerBestFloor}</span> • Every 5 floors unlocks a Checkpoint & Spire Milestone</div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">${checkpointChips}</div>
          </div>

          <div class="mam-inspector-well rounded-xl p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div class="text-[18px] font-black text-white">${previewDef.title} • 10 Waves</div>
                <div class="text-[12px] font-bold" style="color:${previewDef.anomaly.color}">Anomaly: ${previewDef.anomaly.name} — ${previewDef.anomaly.desc}</div>
                <div class="text-[11px] font-semibold text-slate-300 mt-0.5">Waves 1–9: Break ${TOWER_ORE_ROCKS_PER_WAVE} Random Ore Rocks/Wave • Wave 10: Floor Boss</div>
              </div>
              <span class="px-2.5 py-1 rounded-full border text-[11px] font-black ${
                previewDef.isBoss
                  ? 'border-amber-300/60 bg-amber-500/20 text-amber-200'
                  : 'border-cyan-300/40 bg-cyan-500/15 text-cyan-200'
              }">${previewDef.isBoss ? 'CHECKPOINT BOSS' : '9 WAVES + BOSS'}</span>
            </div>

            <div class="grid grid-cols-3 @max-[560px]:grid-cols-1 gap-2">
              <div class="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wave 1 Rock / W10 Boss</div>
                <div class="text-[14px] font-black text-white">${fmtShort(wave1Def.rockBaseHp)} / ${fmtShort(previewDef.hp)} HP</div>
              </div>
              <div class="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timer (Ore / Boss)</div>
                <div class="text-[14px] font-black text-cyan-200">${wave1Def.durationSec}s / ${previewDef.durationSec}s</div>
              </div>
              <div class="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Boss Clear Reward</div>
                <div class="text-[14px] font-black text-pink-300">+${fmtInt(Math.round(previewDef.gemReward * globalMult))} Gems${previewDef.diceDropChance > 0 ? ' + Dice%' : ''}</div>
              </div>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap pt-1">
              <button
                class="mam-sheen-hover relative overflow-hidden flex-1 min-w-[200px] h-11 px-5 rounded-xl border ${
                  this.state.towerKeys > 0
                    ? 'border-cyan-300/55 bg-[linear-gradient(135deg,#0ea5e9_0%,#7c3aed_100%)] shadow-[0_8px_22px_rgba(56,189,248,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] text-white cursor-pointer hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5'
                    : 'border-white/15 bg-white/[0.06] text-slate-400 cursor-not-allowed'
                } text-[15px] font-black transition-[transform,filter] duration-150"
                data-action="tower-enter-run"
                ${this.state.towerKeys <= 0 ? 'disabled' : ''}
              >
                ${this.state.towerKeys > 0 ? `Enter Floor ${startFloor} (1 Key)` : 'Out of Tower Keys'}
              </button>

              <button
                class="h-11 px-4 rounded-xl border ${
                  this.state.towerBestFloor >= 1 && this.state.towerKeys > 0
                    ? 'border-emerald-300/45 bg-[linear-gradient(135deg,rgba(16,185,129,0.85),rgba(5,150,105,0.92))] text-white cursor-pointer hover:brightness-110 active:scale-95'
                    : 'border-white/12 bg-white/[0.04] text-slate-500 cursor-not-allowed'
                } text-[13px] font-black transition-all duration-150"
                data-action="tower-quick-sweep"
                ${this.state.towerBestFloor < 1 || this.state.towerKeys <= 0 ? 'disabled' : ''}
              >
                Quick Sweep (+${fmtInt(Math.round(sweepGems * globalMult))} Gems)
              </button>
            </div>
          </div>
        </div>

        <div class="mam-inspector-well w-[300px] @max-[860px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col gap-2.5 overflow-x-hidden overflow-y-auto mam-no-scrollbar">
          <div class="text-[12px] font-black uppercase tracking-wider text-purple-300">Combat Readiness</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-2">
              <div class="text-[10px] font-bold text-slate-400">ACTIVE MINERS</div>
              <div class="text-[14px] font-black text-white">${placedCount}/5</div>
            </div>
            <div class="rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-2">
              <div class="text-[10px] font-bold text-slate-400">TEAM DPS</div>
              <div class="text-[14px] font-black text-cyan-300">${fmtShort(teamDps)}/s</div>
            </div>
            <div class="rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-2">
              <div class="text-[10px] font-bold text-slate-400">TAP DAMAGE</div>
              <div class="text-[14px] font-black text-emerald-300">${fmtShort(tapDmg)}</div>
            </div>
            <div class="rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-2">
              <div class="text-[10px] font-bold text-slate-400">GLOBAL GEM BONUS</div>
              <div class="text-[14px] font-black text-pink-300">+${globalBonusPct}%</div>
            </div>
          </div>

          <div class="text-[12px] font-black uppercase tracking-wider text-purple-300 pt-1">Milestones (Every 5 Floors)</div>
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

  private renderOrePipsHtml(): string {
    const run = this.state.towerRun;
    if (!run || run.isBossWave) return '';
    return run.waveOres
      .map((ore) => {
        const bg = ore.alive ? ore.color : 'rgba(255,255,255,0.12)';
        const border = ore.alive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)';
        return `<span class="w-3 h-3 rounded-full border transition-all duration-150 ${
          ore.alive ? 'scale-100 shadow-[0_0_8px_rgba(255,255,255,0.35)]' : 'scale-75 opacity-40'
        }" style="background:${bg};border-color:${border}" title="${ore.name} (${ore.variantKey})"></span>`;
      })
      .join('');
  }

  public renderTowerArenaHud(currencyRailHtml: string, toastStackHtml: string): string {
    const run = this.state.towerRun;
    if (!run) return '';
    const floorDef = getTowerFloorDef(run.floor);
    const hpPct = run.maxHp > 0 ? Math.max(0, Math.min(100, (run.hp / run.maxHp) * 100)) : 0;
    const timerDanger = run.timeLeft <= 5;
    const effDps = this.state.getTowerEffectiveDps();
    const effTap = this.state.getTowerEffectiveTapDamage();
    const aliveOres = run.waveOres.filter((o) => o.alive).length;

    const blessingsStrip =
      run.blessings.length > 0
        ? run.blessings
            .map(
              (b) =>
                `<span class="px-2 py-0.5 rounded-full border border-white/20 bg-white/[0.08] text-[10px] font-black" style="color:${b.color}">${b.name}</span>`
            )
            .join('')
        : `<span class="text-[11px] font-semibold text-slate-400">Defeat Wave 10 Boss to pick a Spire Blessing</span>`;

    const blessingOverlay = run.pendingBlessings
      ? `
        <div class="fixed inset-0 z-40 bg-[rgba(4,7,15,0.68)] backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div class="mam-modal w-[min(780px,100%)] p-5 flex flex-col gap-3.5" data-modal-theme="tower">
            <div class="mam-modal-surface" aria-hidden="true"></div>
            <div class="mam-modal-rails" aria-hidden="true">
              <span class="mam-rail-stud is-tl"></span><span class="mam-rail-stud is-tr"></span>
              <span class="mam-rail-stud is-bl"></span><span class="mam-rail-stud is-br"></span>
            </div>
            <div class="text-center pt-1">
              <div class="text-[11px] font-black uppercase tracking-widest text-cyan-300">Floor ${run.floor} Boss Defeated!</div>
              <div class="text-[24px] font-black text-white">Choose 1 Spire Blessing</div>
              <div class="mt-0.5 text-[12px] font-bold text-amber-300 tabular-nums" data-tower-blessing-timer="true">
                Auto-pick random in ${(run.blessingTimerLeft ?? 5).toFixed(1)}s
              </div>
            </div>
            <div class="grid grid-cols-3 @max-[720px]:grid-cols-1 gap-3">
              ${run.pendingBlessings
                .map(
                  (b) => `
                  <button class="mam-inspector-well rounded-2xl p-4 flex flex-col items-center text-center gap-2 cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:border-cyan-300/60 active:scale-95" data-tower-blessing="${b.id}">
                    <div class="w-11 h-11 rounded-2xl border border-white/20 bg-white/[0.06] flex items-center justify-center text-[20px] font-black" style="color:${b.color}">✦</div>
                    <div class="text-[16px] font-black text-white">${b.name}</div>
                    <div class="text-[12px] font-bold text-slate-300">${b.desc}</div>
                    <span class="mt-1 px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-300/40 text-[11px] font-black text-cyan-200">Enter Floor ${run.floor + 1}</span>
                  </button>
                `
                )
                .join('')}
            </div>
          </div>
        </div>
      `
      : '';

    const waveBadge = run.isBossWave
      ? `<span class="px-3 py-1 rounded-full border border-amber-300/60 bg-amber-950/80 backdrop-blur-md text-[12px] font-black text-amber-200">BOSS WAVE</span>`
      : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-300/40 bg-[rgba(10,16,32,0.84)] backdrop-blur-md text-[12px] font-black text-cyan-200" data-tower-ores-badge="true">
          <span>${aliveOres}/${TOWER_ORE_ROCKS_PER_WAVE} ORES</span>
          <span class="inline-flex items-center gap-1" data-tower-ore-pips="true">${this.renderOrePipsHtml()}</span>
        </span>`;

    const invulLeft = run.isBossWave ? Math.max(0, run.bossInvulLeft ?? 0) : 0;
    const hpPctLabel = Math.max(0, Math.min(100, Math.round(hpPct)));
    const hpLabel = `${fmtShort(Math.ceil(run.hp))} / ${fmtShort(run.maxHp)} HP (${hpPctLabel}%)`;
    const bossShieldBadge = run.isBossWave
      ? invulLeft > 0
        ? `<span class="px-2 py-0.5 rounded-full border border-cyan-300/70 bg-cyan-950/90 text-cyan-200 text-[10px] font-black tracking-wider animate-pulse" data-tower-boss-shield="true">🛡️ SHIELD ${invulLeft.toFixed(1)}s</span>`
        : `<span class="px-2 py-0.5 rounded-full border border-rose-400/70 bg-rose-950/90 text-rose-200 text-[10px] font-black tracking-wider" data-tower-boss-shield="true">⚡ VULNERABLE</span>`
      : `<span class="px-2 py-0.5 rounded-full border border-cyan-300/60 bg-cyan-950/90 text-cyan-200 text-[10px] font-black tracking-wider" data-tower-wave-rocks="true">⛏️ ${aliveOres}/${TOWER_ORE_ROCKS_PER_WAVE} ROCKS LEFT</span>`;
    const barHeaderHtml = `
      <div class="w-full flex items-center justify-between gap-2 px-1">
        <div class="inline-flex items-center gap-2">
          <span class="w-2 h-2 rounded-full ${
            run.isBossWave
              ? 'bg-rose-400 shadow-[0_0_8px_#fb7185] animate-ping'
              : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse'
          }"></span>
          <span class="text-[12px] font-black uppercase tracking-wider ${
            run.isBossWave ? 'text-amber-200' : 'text-cyan-200'
          } [text-shadow:0_2px_6px_rgba(0,0,0,0.9)]">${
            run.isBossWave ? 'SERAPHIM AI OVERLORD' : `WAVE ${run.wave}/9 • DATA NODES`
          }</span>
        </div>
        ${bossShieldBadge}
      </div>
    `;
    const barFillBg = run.isBossWave
      ? invulLeft > 0
        ? 'linear-gradient(90deg,#0891b2,#22d3ee,#38bdf8)'
        : 'linear-gradient(90deg,#be123c,#ef4444,#f59e0b)'
      : 'linear-gradient(90deg,#0284c7,#38bdf8,#8b5cf6)';
    const barFrameCls = run.isBossWave
      ? 'h-8 rounded-xl border-2 border-amber-300/70 shadow-[0_8px_24px_rgba(244,63,94,0.35),inset_0_2px_6px_rgba(0,0,0,0.75)]'
      : 'h-8 rounded-xl border-2 border-cyan-300/60 shadow-[0_8px_22px_rgba(56,189,248,0.28),inset_0_2px_6px_rgba(0,0,0,0.75)]';

    return `
      <div class="${TW_TOP_CENTER}">
        <button class="${TW_SHOPS_PILL} mam-outline" data-action="tower-exit">
          ${towerIconHtml(24)}
          <span>Exit Tower</span>
        </button>
      </div>

      ${currencyRailHtml}

      <div class="fixed top-[66px] left-1/2 -translate-x-1/2 w-[min(600px,calc(100%-24px))] flex flex-col items-center gap-1.5 pointer-events-none z-20">
        <div class="flex items-center gap-2 flex-wrap justify-center">
          <span class="px-3 py-1 rounded-full border border-cyan-300/45 bg-[rgba(10,16,32,0.86)] backdrop-blur-md text-[13px] font-black text-white">
            FLOOR ${run.floor} • WAVE ${run.wave}/${run.maxWaves}
          </span>
          ${waveBadge}
          <span class="px-3 py-1 rounded-full border border-white/20 bg-[rgba(10,16,32,0.84)] backdrop-blur-md text-[12px] font-extrabold" style="color:${floorDef.anomaly.color}">
            ${floorDef.anomaly.name}
          </span>
          <span class="px-3 py-1 rounded-full border ${
            timerDanger ? 'border-rose-400/75 bg-rose-950/85 text-rose-200' : 'border-white/20 bg-[rgba(10,16,32,0.84)] text-cyan-200'
          } backdrop-blur-md text-[13px] font-black tabular-nums" data-tower-timer="true">
            ⏱ ${run.timeLeft.toFixed(1)}s
          </span>
        </div>

        ${barHeaderHtml}

        <div class="relative w-full ${barFrameCls} bg-[rgba(8,12,24,0.92)] overflow-hidden flex items-center justify-center">
          <div class="absolute left-0 top-0 bottom-0 transition-[width] duration-75" data-tower-hp-fill="true" style="width:${hpPct}%;background:${barFillBg}"></div>
          <div class="absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-white/25 to-transparent pointer-events-none"></div>
          <div class="absolute inset-0 flex justify-evenly pointer-events-none">
            <span class="w-px h-full bg-black/35"></span>
            <span class="w-px h-full bg-black/35"></span>
            <span class="w-px h-full bg-black/35"></span>
          </div>
          <div class="relative z-[2] text-[13px] font-black tabular-nums text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]" data-tower-hp-text="true">
            ${hpLabel}
          </div>
        </div>
      </div>

      <div class="fixed bottom-3.5 left-1/2 -translate-x-1/2 w-[min(760px,calc(100%-24px))] rounded-2xl border border-white/15 bg-[rgba(10,14,26,0.84)] backdrop-blur-xl px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap shadow-[0_14px_34px_rgba(0,0,0,0.6)] pointer-events-auto z-20">
        <div class="flex items-center gap-3 flex-wrap text-[13px] font-black tabular-nums">
          <span class="text-pink-300" data-tower-run-gems="true">+${fmtInt(run.gemsEarned)} Gems</span>
          <span class="text-purple-300" data-tower-run-dice="true">+${run.diceEarned} Dice</span>
          <span class="text-cyan-300">${fmtShort(effDps)}/s DPS</span>
          <span class="text-emerald-300">${fmtShort(effTap)} Tap</span>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">${blessingsStrip}</div>
      </div>

      ${blessingOverlay}
      ${toastStackHtml}
    `;
  }

  public updateLiveValues(root: HTMLElement): void {
    const run = this.state.towerRun;
    if (!run) return;
    const hpPct = run.maxHp > 0 ? Math.max(0, Math.min(100, (run.hp / run.maxHp) * 100)) : 0;
    const aliveOres = run.waveOres.filter((o) => o.alive).length;
    const fill = root.querySelector<HTMLElement>('[data-tower-hp-fill="true"]');
    const invulLeft = run.isBossWave ? Math.max(0, run.bossInvulLeft ?? 0) : 0;
    if (fill) {
      fill.style.width = `${hpPct}%`;
      if (run.isBossWave) {
        fill.style.background =
          invulLeft > 0
            ? 'linear-gradient(90deg,#0891b2,#22d3ee,#38bdf8)'
            : 'linear-gradient(90deg,#be123c,#ef4444,#f59e0b)';
      }
    }
    const hpText = root.querySelector<HTMLElement>('[data-tower-hp-text="true"]');
    if (hpText) {
      const hpPctLabel = Math.max(0, Math.min(100, Math.round(hpPct)));
      hpText.textContent = `${fmtShort(Math.ceil(run.hp))} / ${fmtShort(run.maxHp)} HP (${hpPctLabel}%)`;
    }
    const waveRocksBadge = root.querySelector<HTMLElement>('[data-tower-wave-rocks="true"]');
    if (waveRocksBadge && !run.isBossWave) {
      waveRocksBadge.textContent = `⛏️ ${aliveOres}/${TOWER_ORE_ROCKS_PER_WAVE} ROCKS LEFT`;
    }
    const shieldBadge = root.querySelector<HTMLElement>('[data-tower-boss-shield="true"]');
    if (shieldBadge && run.isBossWave) {
      if (invulLeft > 0) {
        shieldBadge.className =
          'px-2 py-0.5 rounded-full border border-cyan-300/70 bg-cyan-950/90 text-cyan-200 text-[10px] font-black tracking-wider animate-pulse';
        shieldBadge.textContent = `🛡️ SHIELD ${invulLeft.toFixed(1)}s`;
      } else {
        shieldBadge.className =
          'px-2 py-0.5 rounded-full border border-rose-400/70 bg-rose-950/90 text-rose-200 text-[10px] font-black tracking-wider';
        shieldBadge.textContent = '⚡ VULNERABLE';
      }
    }
    const oresBadge = root.querySelector<HTMLElement>('[data-tower-ores-badge="true"]');
    if (oresBadge && !run.isBossWave) {
      const countSpan = oresBadge.firstElementChild;
      if (countSpan) countSpan.textContent = `${aliveOres}/${TOWER_ORE_ROCKS_PER_WAVE} ORES`;
      const pips = oresBadge.querySelector<HTMLElement>('[data-tower-ore-pips="true"]');
      if (pips) pips.innerHTML = this.renderOrePipsHtml();
    }
    const timer = root.querySelector<HTMLElement>('[data-tower-timer="true"]');
    if (timer) {
      timer.textContent = `⏱ ${run.timeLeft.toFixed(1)}s`;
      timer.classList.toggle('border-rose-400/75', run.timeLeft <= 5);
      timer.classList.toggle('text-rose-200', run.timeLeft <= 5);
    }
    const gemsEl = root.querySelector<HTMLElement>('[data-tower-run-gems="true"]');
    if (gemsEl) gemsEl.textContent = `+${fmtInt(run.gemsEarned)} Gems`;
    const diceEl = root.querySelector<HTMLElement>('[data-tower-run-dice="true"]');
    if (diceEl) diceEl.textContent = `+${run.diceEarned} Dice`;
    const blessingTimerEl = root.querySelector<HTMLElement>('[data-tower-blessing-timer="true"]');
    if (blessingTimerEl && run.pendingBlessings) {
      blessingTimerEl.textContent = `Auto-pick random in ${Math.max(0, run.blessingTimerLeft ?? 5).toFixed(1)}s`;
    }
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
    root.querySelector('[data-action="tower-exit"]')?.addEventListener('click', () => {
      audio.playSfx('ui-close');
      this.state.abandonTowerRun();
      this.onExitTowerArena();
      this.onOpenModal('tower');
    });

    root.querySelectorAll('[data-tower-blessing]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.towerBlessing;
        if (!id) return;
        if (this.state.chooseTowerBlessing(id)) {
          audio.playSfx('rare-fanfare', { volume: 0.65 });
          this.pushToast('Spire Blessing activated!');
          this.onRequestRender();
        }
      });
    });
  }
}
