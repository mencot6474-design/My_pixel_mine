import { audio } from '../audio/AudioManager';
import type { AnomalyChibiId } from '../game/AnomalyData';
import { GameState } from '../game/GameState';
import { fmtShort } from '../game/NumberFormat';
import { getChibiById } from '../game3d/ChibiCatalog';
import { type SceneMode } from '../game3d/MineScene3D';
import type { ModalKind } from './HudShared';
import type { RiftArenaHudUi } from './RiftArenaHudUi';

export interface RiftSceneOps {
  setBossConfig: (bossId: AnomalyChibiId, surgeActive: boolean) => void;
  setBattleActive?: (active: boolean) => void;
  triggerBossHit: (color?: string, isCrit?: boolean) => void;
  triggerTierShockwave: (tier: number) => void;
}

/** Coordinates 30s Rift Boss Battle combat, Tier 1-10 shockwaves, and summary transitions. */
export class HudRiftBridge {
  constructor(
    private readonly root: HTMLElement,
    private readonly state: GameState,
    private readonly riftArenaUi: RiftArenaHudUi,
    private readonly getSceneMode: () => SceneMode,
    private readonly setSceneMode: (mode: SceneMode) => void,
    private readonly openModal: (kind: ModalKind) => void,
    private readonly pushToast: (msg: string) => void,
    private readonly render: () => void,
    private readonly riftOps?: RiftSceneOps
  ) {}

  public startRiftBattle(): void {
    if (!this.state.startRiftBattle()) {
      audio.playSfx('ui-error');
      this.pushToast('Deploy at least 1 Chibi & ensure Rift attempts remain!');
      this.render();
      return;
    }
    const b = this.state.riftBattle;
    if (b) {
      this.riftOps?.setBossConfig(b.bossId, b.anomalyId === 'overclock-surge');
      this.riftOps?.setBattleActive?.(true);
    }
    audio.playSfx('teleport', { volume: 0.55 });
    this.setSceneMode('rift');
    this.riftOps?.setBattleActive?.(true);
  }

  public handleRiftBossTap(_sx: number, _sy: number): { dmg: number; isCrit?: boolean } | undefined {
    if (this.getSceneMode() !== 'rift' || !this.state.riftBattle) return undefined;
    const tapBase = this.state.getTapDamage(Date.now(), false);
    const res = this.state.applyRiftTapDamage(tapBase, 0.15, 2.5);
    if (res.tierUp) {
      this.onTierReached(res.newTier);
    }
    this.riftArenaUi.updateLiveValues(this.root);
    return { dmg: res.dmgDealt, isCrit: res.isCrit };
  }

  public handleRiftFighterStrike(
    slotIndex: number,
    attackInterval: number,
    isUltimate: boolean,
    _beatIndex = 0,
    _isFinisher = false
  ): { dmg: number; isCrit?: boolean } | undefined {
    if (this.getSceneMode() !== 'rift' || !this.state.riftBattle) return undefined;
    const res = this.state.applyRiftSquadStrike(slotIndex, attackInterval, isUltimate);
    if (res.tierUp) {
      this.onTierReached(res.newTier);
    }
    this.riftArenaUi.updateLiveValues(this.root);
    return { dmg: res.dmgDealt, isCrit: res.isCrit };
  }

  public stepTick(dtSec: number): void {
    if (this.getSceneMode() !== 'rift' || !this.state.riftBattle) return;
    const res = this.state.stepRiftBattleTick(dtSec);
    if (res.meteorDmg > 0) {
      audio.playCrystalChord('meteor');
      this.riftOps?.triggerBossHit('#fb7185', true);
    }
    if (res.tierUp && (this.state.riftBattle || res.summary)) {
      const tier = this.state.riftBattle?.currentTier ?? res.summary?.tierReached ?? 0;
      if (tier > 0) this.onTierReached(tier);
    }
    if (res.finished) {
      this.riftOps?.setBattleActive?.(false);
      audio.playSfx('rare-fanfare', { volume: 0.78 });
      const sum = res.summary;
      if (sum?.droppedChibiId) {
        const chibi = getChibiById(sum.droppedChibiId);
        this.pushToast(`RIFT JACKPOT! Dropped ${chibi?.name ?? sum.droppedChibiId} + ${sum.shardsEarned} Shards!`);
      } else if (sum && sum.shardsEarned > 0) {
        this.pushToast(`RIFT COMPLETE! Tier ${sum.tierReached} • +${sum.shardsEarned} Shards (${fmtShort(sum.damageDealt)} DMG)`);
      }
      this.render();
      return;
    }
    this.riftArenaUi.updateLiveValues(this.root);
  }

  public retreatRiftBattle(): void {
    this.riftOps?.setBattleActive?.(false);
    const sum = this.state.retreatRiftBattle();
    if (sum) {
      audio.playSfx(sum.shardsEarned > 0 ? 'rare-fanfare' : 'ui-close', { volume: 0.6 });
    }
    this.render();
  }

  public returnToHub(): void {
    this.state.clearRiftSummary();
    this.setSceneMode('mine');
    this.openModal('rift');
  }

  private onTierReached(tier: number): void {
    this.riftOps?.triggerTierShockwave(tier);
    audio.playCrystalScaleNote(Math.min(8, tier));
    this.pushToast(`⚡ RIFT TIER ${tier} REACHED! (+${tier} Shard${tier > 1 ? 's' : ''})`);
  }
}
