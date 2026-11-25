import { audio } from '../audio/AudioManager';
import { GameState } from '../game/GameState';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import { getOmegaBossById, type OmegaBossId } from '../game/OmegaData';
import type { SceneMode } from '../game3d/MineScene3D';
import type { ModalKind } from './HudShared';
import type { OmegaArenaHudUi } from './OmegaArenaHudUi';

export interface OmegaSceneOps {
  setBossConfig: (bossId: OmegaBossId) => void;
  setBattleActive?: (active: boolean) => void;
  triggerBossHit: (color?: string, isCrit?: boolean) => void;
  triggerTierShockwave?: (tier: number) => void;
  recordTapCharge?: () => boolean;
  grantSquadUltCharge?: (fillFull?: boolean) => void;
}

/** Coordinates 30s Rift-style Omega Boss DPS-check combat between GameState, OmegaArena3D, and GameHud. */
export class HudOmegaBridge {
  constructor(
    private readonly root: HTMLElement,
    private readonly state: GameState,
    private readonly omegaArenaUi: OmegaArenaHudUi,
    private readonly getSceneMode: () => SceneMode,
    private readonly setSceneMode: (mode: SceneMode) => void,
    private readonly openModal: (kind: ModalKind) => void,
    private readonly pushToast: (msg: string) => void,
    private readonly render: () => void,
    private readonly omegaOps?: OmegaSceneOps,
    private readonly onOpenBossHub?: (bossId: OmegaBossId) => void
  ) {}

  public startOmegaBattle(bossId: OmegaBossId): void {
    if (!this.state.startOmegaBoss(bossId)) {
      audio.playSfx('ui-error');
      this.pushToast('Deploy Chibis & ensure at least 1 Boss Key!');
      this.render();
      return;
    }
    this.omegaOps?.setBossConfig(bossId);
    this.omegaOps?.setBattleActive?.(true);
    audio.playSfx('teleport', { volume: 0.55 });
    this.setSceneMode('omega');
    this.omegaOps?.setBattleActive?.(true);
  }

  public handleOmegaBossTap(_sx: number, _sy: number): { dmg: number; isCrit?: boolean } | undefined {
    if (this.getSceneMode() !== 'omega' || !this.state.omegaBattle) return undefined;
    const tapBase = this.state.getTapDamage(Date.now(), false);
    const res = this.state.applyOmegaTapDamage(tapBase, 0.15, 2.5);
    this.omegaOps?.recordTapCharge?.();
    if (res.tierUp) {
      this.onTierReached(res.newTier);
    }
    this.omegaArenaUi.updateLiveValues(this.root);
    return { dmg: res.dmgDealt, isCrit: res.isCrit };
  }

  public handleOmegaFighterStrike(
    slotIndex: number,
    attackInterval: number,
    _isUltimate: boolean,
    beatIndex = 0,
    isFinisher = false
  ): { dmg: number; isCrit?: boolean } | undefined {
    if (this.getSceneMode() !== 'omega' || !this.state.omegaBattle) return undefined;
    const res = this.state.applyOmegaSquadStrike(slotIndex, attackInterval);
    if (res.dmgDealt > 0) {
      audio.playBarrageHitSfx(beatIndex, Boolean(res.isCrit), isFinisher);
    }
    if (res.tierUp) {
      this.onTierReached(res.newTier);
    }
    this.omegaArenaUi.updateLiveValues(this.root);
    return { dmg: res.dmgDealt, isCrit: res.isCrit };
  }

  public stepTick(dtSec: number): void {
    if (this.getSceneMode() !== 'omega' || !this.state.omegaBattle) return;
    const res = this.state.stepOmegaBossTick(dtSec);
    if (res.finished) {
      this.omegaOps?.setBattleActive?.(false);
      const sum = res.summary;
      audio.playSfx(sum && sum.tierReached > 0 ? 'rare-fanfare' : 'ui-close', { volume: 0.78 });
      if (sum && sum.tierReached > 0) {
        this.pushToast(
          `OMEGA COMPLETE! Tier ${sum.tierReached}/5 • +${fmtInt(sum.coresAwarded)} Omega Cores (${fmtShort(sum.damageDealt)} DMG)`
        );
      } else if (sum) {
        this.pushToast(`OMEGA COMPLETE! ${fmtShort(sum.damageDealt)} DMG`);
      }
      this.render();
      return;
    }
    this.omegaArenaUi.updateLiveValues(this.root);
  }

  public retreatOmegaBattle(): void {
    this.omegaOps?.setBattleActive?.(false);
    const sum = this.state.retreatOmegaBoss();
    if (sum) {
      audio.playSfx(sum.coresAwarded > 0 ? 'rare-fanfare' : 'ui-close', { volume: 0.65 });
    }
    this.render();
  }

  public returnToHub(): void {
    const bossId = this.state.omegaLastSummary?.bossId;
    this.state.clearOmegaSummary();
    if (bossId) this.onOpenBossHub?.(bossId);
    this.setSceneMode('shop');
    this.openModal('omega-boss');
  }

  private onTierReached(tier: number): void {
    const battle = this.state.omegaBattle;
    const boss = battle ? getOmegaBossById(battle.bossId) : undefined;
    const tierDef = boss?.tiers[Math.max(0, Math.min(4, tier - 1))];
    this.omegaOps?.triggerTierShockwave?.(tier);
    audio.playCrystalScaleNote(Math.min(8, tier + 2));
    this.pushToast(
      `⚡ OMEGA TIER ${tier} REACHED! (${fmtInt(tierDef?.cores ?? tier)} Omega Cores)`
    );
  }
}
