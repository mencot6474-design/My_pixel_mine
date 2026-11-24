import { audio } from '../audio/AudioManager';
import { getChibiById } from '../game3d/ChibiCatalog';
import { SceneMode } from '../game3d/MineScene3D';
import { GameState } from '../game/GameState';
import { fmtInt } from '../game/NumberFormat';
import { getTowerFloorDef, TowerWaveOreState } from '../game/TowerData';
import { cgHappyTime } from '../sdk/crazygames';
import { ModalKind } from './HudShared';
import { triggerPerfectStrikeFlash } from './LootVacuumFx';
import { TowerUi } from './TowerUi';

export type TowerVisualSyncCallback = (opts: {
  floor: number;
  wave: number;
  isBossWave: boolean;
  isCheckpointFloor: boolean;
  waveOres: readonly TowerWaveOreState[];
  anomalyColorHex: string;
  equippedMinerCount: number;
  paused: boolean;
  bossShieldActive?: boolean;
  bossChibiId?: string;
}) => void;

export class HudTowerBridge {
  constructor(
    private readonly root: HTMLElement,
    private readonly state: GameState,
    private readonly towerUi: TowerUi,
    private readonly getSceneMode: () => SceneMode,
    private readonly setSceneMode: (mode: SceneMode) => void,
    private readonly openModal: (kind: ModalKind) => void,
    private readonly pushToast: (text: string) => void,
    private readonly render: () => void,
    private readonly onSyncTowerVisual?: TowerVisualSyncCallback
  ) {}

  public syncTowerSceneVisual(): void {
    const run = this.state.towerRun;
    const floor = run?.floor ?? 1;
    const def = getTowerFloorDef(floor);
    const placedCount = this.state.plotMiners.filter(Boolean).length;
    const paused = Boolean(run?.pendingBlessings);
    if (this.getSceneMode() === 'tower') {
      audio.setSceneMode('tower', Boolean(run?.isBossWave));
    }
    this.onSyncTowerVisual?.({
      floor,
      wave: run?.wave ?? 1,
      isBossWave: Boolean(run?.isBossWave),
      isCheckpointFloor: def.isBoss,
      waveOres: run?.waveOres ?? [],
      anomalyColorHex: def.anomaly.color,
      equippedMinerCount: placedCount,
      paused,
      bossShieldActive: Boolean(run?.isBossWave && (run.bossInvulLeft ?? 0) > 0),
      bossChibiId: run?.bossChibiId,
    });
  }

  private handleTowerHitResolution(res: {
    dmgDealt: number;
    rockBroken: boolean;
    waveCleared: boolean;
    floorCleared: boolean;
    towerCompleted?: boolean;
    clearedFloor: number | null;
    clearedWave: number | null;
    gemsAwarded: number;
    diceAwarded: number;
    coinsAwarded?: number;
    twinsAwarded?: string[];
    milestoneUnlocked: number | null;
    isCrit?: boolean;
    pityTriggered?: boolean;
  }): { dmg: number; broken: boolean; isCrit?: boolean } | undefined {
    if (res.dmgDealt <= 0 && !res.waveCleared && !res.floorCleared) return undefined;
    const coins = res.coinsAwarded ?? 0;
    const twins = res.twinsAwarded ?? [];
    if (twins.length > 0) {
      audio.playSfx('rare-fanfare', { volume: 0.92 });
      audio.playCrystalChord('perfect');
      triggerPerfectStrikeFlash();
      cgHappyTime();
      for (const twinId of twins) {
        const twinName = getChibiById(twinId)?.name ?? twinId;
        this.pushToast(`✦ JACKPOT 0.01% DROP! ${twinName} (TWIN) joined your roster!`);
      }
    }
    if (res.towerCompleted) {
      audio.playSfx('rare-fanfare', { volume: 0.85 });
      const diceTxt = res.diceAwarded > 0 ? ` +${res.diceAwarded} Dice` : '';
      const coinTxt = coins > 0 ? ` +${fmtInt(coins)} Spire Coins` : '';
      this.pushToast(`🏆 TOWER CONQUERED! Floor 80 Final Boss Defeated! +${fmtInt(res.gemsAwarded)} Gems${diceTxt}${coinTxt}`);
      if (res.milestoneUnlocked) {
        this.pushToast(`Tower Milestone Floor ${res.milestoneUnlocked} Unlocked!`);
      }
      cgHappyTime();
      this.setSceneMode('shop');
      this.openModal('tower');
      return { dmg: res.dmgDealt, broken: res.rockBroken, isCrit: res.isCrit };
    }
    if (res.floorCleared) {
      audio.playSfx('rare-fanfare', { volume: 0.72 });
      const diceTxt = res.diceAwarded > 0 ? ` +${res.diceAwarded} Dice` : '';
      this.pushToast(`Floor ${res.clearedFloor} Cleared! +${fmtInt(res.gemsAwarded)} Gems${diceTxt}`);
      if (coins > 0) {
        audio.playCrystalChord('perfect');
        this.pushToast(`🪙 BOSS DROP! +${fmtInt(coins)} Spire Coins!`);
      }
      if (res.pityTriggered) {
        this.pushToast('🎲 Boss Pity Triggered! Guaranteed Enchant Dice!');
      }
      if (res.milestoneUnlocked) {
        this.pushToast(`Tower Milestone Floor ${res.milestoneUnlocked} Unlocked!`);
      }
      cgHappyTime();
      this.syncTowerSceneVisual();
      this.render();
    } else if (res.waveCleared) {
      audio.playSfx('wave-clear', { volume: 0.58 });
      const nextWave = this.state.towerRun?.wave ?? 1;
      const bossHint = nextWave === 10 ? ' • Boss Incoming!' : '';
      this.pushToast(`Wave ${res.clearedWave}/9 Cleared! +${fmtInt(res.gemsAwarded)} Gems${bossHint}`);
      if (coins > 0) {
        audio.playCrystalChord('perfect');
        this.pushToast(`🪙 RARE DROP! +${fmtInt(coins)} Spire Coin${coins > 1 ? 's' : ''}!`);
      }
      this.syncTowerSceneVisual();
      this.render();
    } else {
      if (res.rockBroken) {
        audio.playOreBreak('tower');
        if (coins > 0) {
          audio.playCrystalChord('perfect');
          this.pushToast(`🪙 RARE DROP! +${fmtInt(coins)} Spire Coin${coins > 1 ? 's' : ''}!`);
        }
        this.syncTowerSceneVisual();
      }
      if (twins.length > 0) {
        this.render();
      } else {
        this.towerUi.updateLiveValues(this.root);
      }
    }
    return { dmg: res.dmgDealt, broken: res.rockBroken, isCrit: res.isCrit };
  }

  public handleTowerTargetClick(
    targetOreIndex: number | null,
    opts?: { isShieldBreak?: boolean }
  ): { dmg: number; broken?: boolean; isCrit?: boolean; shieldBroken?: boolean; shieldShaved?: boolean } | undefined {
    if (this.getSceneMode() !== 'tower' || !this.state.towerRun) return undefined;
    const run = this.state.towerRun;
    if (targetOreIndex === null && opts?.isShieldBreak && run.isBossWave && (run.bossInvulLeft ?? 0) > 0) {
      const shieldRes = this.state.hitTowerBossShieldSweetSpot();
      if (shieldRes.hit) {
        audio.playCrystalChord('perfect');
        triggerPerfectStrikeFlash();
        if (shieldRes.shieldBroken) {
          this.pushToast('⚡ SHIELD SHATTERED! Boss EXPOSED (+50% DMG for 4s)!');
        } else {
          this.pushToast('⚡ SHIELD CRACKED! -2.5s Boss Shield!');
        }
        this.syncTowerSceneVisual();
        this.towerUi.updateLiveValues(this.root);
        return { dmg: 0, shieldBroken: shieldRes.shieldBroken, shieldShaved: true };
      }
    }
    const res = this.state.tapTowerTarget(targetOreIndex);
    if (res.dmgDealt > 0) {
      audio.playOreHit(true, Boolean(res.isCrit));
    } else if (run.isBossWave && (run.bossInvulLeft ?? 0) > 0 && !run.pendingBlessings) {
      audio.playSfx('ui-error', { volume: 0.25, cooldownMs: 320, bucket: 'shield-block' });
    }
    return this.handleTowerHitResolution(res);
  }

  public handleTowerFighterStrike(
    slotIndex: number,
    targetOreIndex: number | null,
    attackInterval: number,
    beatIndex = 0,
    isFinisher = false
  ): { dmg: number; broken?: boolean; isCrit?: boolean } | undefined {
    if (this.getSceneMode() !== 'tower' || !this.state.towerRun) return undefined;
    const res = this.state.applyTowerChibiStrike(slotIndex, targetOreIndex, attackInterval);
    if (res.dmgDealt > 0) {
      audio.playBarrageHitSfx(beatIndex, Boolean(res.isCrit), isFinisher);
      if (beatIndex === 0) {
        audio.playSfx('chibi-swing', { volume: 0.24, cooldownMs: 120, bucket: 'chibi-swing' });
      }
    }
    return this.handleTowerHitResolution(res);
  }

  public handleTowerMonolithClick(): { dmg: number } | undefined {
    return this.handleTowerTargetClick(null);
  }
}
