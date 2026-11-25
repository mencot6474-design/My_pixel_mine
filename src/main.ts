import './styles/global.css';
import './styles/hud.css';
import { audio } from './audio/AudioManager';
import { assetUrl } from './game/AssetUrl';
import { gameSettings, type GameSettingsData } from './game/GameSettings';
import { GameState } from './game/GameState';
import {
  OVERCLOCK_CHIBI_METEOR_CHARGE,
  OVERCLOCK_METEOR_TAP_MULT,
  OVERCLOCK_PERFECT_EXTEND_SEC,
  OVERCLOCK_SWEET_SPOT_CHARGE,
  OVERCLOCK_TAP_CHARGE,
} from './game/OverclockDomain';
import { WORLDS } from './game/GameData';
import {
  PIT_EVENT_DEFS,
  computePitEventBonusGems,
  rollNextPitEventCooldownSec,
  rollPitEventKind,
  type PitEventKind,
} from './game/PitEventsDomain';
import {
  TAP_COMBO_WINDOW_MS,
  getTapComboTier,
  stepTapCombo,
  type TapComboState,
} from './game/TapComboHelper';
import { getWeatherById, type WeatherId } from './game/WeatherData';
import { CHIBI_CATALOG, getChibiById } from './game3d/ChibiCatalog';
import { init3dHudIcons } from './game3d/HudIcon3DRenderer';
import { MineScene3D } from './game3d/MineScene3D';
import { computeMeteorDynamicHp } from './game3d/OrePit3D';
import { STAGE_PEDESTAL_COUNT, WORLD_PALETTES } from './game3d/MineWorldPalette';
import {
  cgBindAdLifecycle,
  cgBindAudioMuteListener,
  cgGameplayStart,
  cgGameplayStop,
  cgInit,
  cgLoadingStart,
  cgLoadingStop,
  isAdPlaying,
} from './sdk/crazygames';
import { GameHud } from './ui/GameHud';
import { triggerPerfectStrikeFlash } from './ui/LootVacuumFx';

async function bootstrap(): Promise<void> {
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  await cgInit();
  cgBindAudioMuteListener((muted) => audio.setPortalMuted(muted));
  cgLoadingStart();
  init3dHudIcons();

  const pickaxeCursorEl = document.createElement('div');
  pickaxeCursorEl.id = 'mamPickaxeCursor';
  pickaxeCursorEl.style.display = 'none';
  pickaxeCursorEl.innerHTML = `
    <div class="mam-cursor-pointer" aria-hidden="true">
      <svg viewBox="0 0 44 44" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mamCursorBladeGrad" x1="5" y1="5" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="48%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#fde047"/>
          </linearGradient>
        </defs>
        <g class="mam-cursor-reticle-ring" style="transform-origin: 9px 9px;">
          <circle cx="9" cy="9" r="7.2" stroke="#14111d" stroke-width="2.8" stroke-dasharray="5 3.5" opacity="0.9"/>
          <circle cx="9" cy="9" r="7.2" stroke="#fde047" stroke-width="1.3" stroke-dasharray="5 3.5"/>
        </g>
        <path d="M5 5 L35 17.5 L23 22 L33 32 L28.5 36.5 L18.5 26.5 L14.5 38 Z"
          fill="url(#mamCursorBladeGrad)" stroke="#14111d" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M5 5 L22.5 21.5 L18.5 26.5 Z" fill="#ffffff" fill-opacity="0.55"/>
        <circle cx="5" cy="5" r="2.2" fill="#ffffff" stroke="#14111d" stroke-width="1.2"/>
      </svg>
    </div>
    <div class="mam-cursor-mine" aria-hidden="true">
      <div class="mam-cursor-target-beacon">
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="12" stroke="#14111d" stroke-width="4" stroke-dasharray="7 5"/>
          <circle cx="18" cy="18" r="12" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="7 5"/>
          <path d="M18 2 V8 M18 28 V34 M2 18 H8 M28 18 H34" stroke="#14111d" stroke-width="4" stroke-linecap="round"/>
          <path d="M18 2 V8 M18 28 V34 M2 18 H8 M28 18 H34" stroke="#fde047" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <img src="${assetUrl('/pickaxes/sunwheel.webp')}" alt="" />
    </div>
  `;
  const pickaxeComboEl = document.createElement('div');
  pickaxeComboEl.id = 'mamPickaxeCombo';
  pickaxeComboEl.className = 'mam-pickaxe-combo tier-cool';
  pickaxeComboEl.style.display = 'none';
  pickaxeComboEl.style.setProperty('--combo-ms', `${TAP_COMBO_WINDOW_MS}ms`);
  pickaxeCursorEl.appendChild(pickaxeComboEl);
  document.body.appendChild(pickaxeCursorEl);

  const threeRoot = document.getElementById('threeRoot');
  const hudRoot = document.getElementById('hudRoot');
  if (!threeRoot || !hudRoot) return;

  let lastPointerType = 'mouse';
  let tapComboState: TapComboState = { count: 0, lastTapAtMs: 0 };
  let tapComboExpireTimer: number | null = null;
  let touchCursorHideTimer: number | null = null;
  const resetTapCombo = (): void => {
    tapComboState = { count: 0, lastTapAtMs: 0 };
    if (tapComboExpireTimer !== null) {
      window.clearTimeout(tapComboExpireTimer);
      tapComboExpireTimer = null;
    }
    if (touchCursorHideTimer !== null) {
      window.clearTimeout(touchCursorHideTimer);
      touchCursorHideTimer = null;
    }
    pickaxeComboEl.style.display = 'none';
    pickaxeComboEl.classList.remove('is-pop', 'is-draining', 'is-crit');
    if (lastPointerType === 'touch') {
      pickaxeCursorEl.style.display = 'none';
    }
  };

  const syncComboEdgeFlip = (x: number, y: number): void => {
    pickaxeComboEl.classList.toggle('is-flip-left', x > window.innerWidth - 150);
    pickaxeComboEl.classList.toggle('is-flip-down', y < 64);
  };

  const triggerPickaxeSwing = (): void => {
    pickaxeCursorEl.classList.remove('is-swinging');
    requestAnimationFrame(() => {
      pickaxeCursorEl.classList.add('is-swinging');
    });
  };

  const setCursorPosition = (x: number, y: number): void => {
    pickaxeCursorEl.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  };

  const spawnCursorClickPulse = (x: number, y: number): void => {
    const pulse = document.createElement('div');
    pulse.className = 'mam-cursor-click-pulse';
    pulse.style.left = `${Math.round(x)}px`;
    pulse.style.top = `${Math.round(y)}px`;
    document.body.appendChild(pulse);
    const cleanup = (): void => pulse.remove();
    pulse.addEventListener('animationend', cleanup, { once: true });
    window.setTimeout(cleanup, 320);
  };

  const INTERACTIVE_CURSOR_SELECTOR =
    'button, a, [role="button"], [data-action], [data-teleport-world], [data-teleport-unlock], [data-equip-slot], [data-index-id], [data-inv-uid], [data-omega-ring-parry], [data-omega-hit-target], input, select, label, .cursor-pointer';

  const triggerTapCombo = (isCrit: boolean, sx: number, sy: number): void => {
    const now = performance.now();
    tapComboState = stepTapCombo(tapComboState, now, TAP_COMBO_WINDOW_MS);
    if (tapComboExpireTimer !== null) {
      window.clearTimeout(tapComboExpireTimer);
    }
    if (touchCursorHideTimer !== null) {
      window.clearTimeout(touchCursorHideTimer);
      touchCursorHideTimer = null;
    }
    tapComboExpireTimer = window.setTimeout(resetTapCombo, TAP_COMBO_WINDOW_MS + 30);

    if (lastPointerType === 'touch' || pickaxeCursorEl.style.display !== 'block') {
      pickaxeCursorEl.style.display = 'block';
      pickaxeCursorEl.classList.add('is-mining-mode');
      setCursorPosition(sx, sy);
      syncComboEdgeFlip(sx, sy);
      triggerPickaxeSwing();
    }

    if (tapComboState.count < 2) {
      pickaxeComboEl.style.display = 'none';
      if (lastPointerType === 'touch') {
        touchCursorHideTimer = window.setTimeout(() => {
          touchCursorHideTimer = null;
          if (lastPointerType === 'touch' && tapComboState.count < 2) {
            pickaxeCursorEl.style.display = 'none';
          }
        }, 260);
      }
      return;
    }

    const tier = getTapComboTier(tapComboState.count);
    pickaxeComboEl.className = `mam-pickaxe-combo tier-${tier.id}${isCrit ? ' is-crit' : ''}${
      pickaxeComboEl.classList.contains('is-flip-left') ? ' is-flip-left' : ''
    }${pickaxeComboEl.classList.contains('is-flip-down') ? ' is-flip-down' : ''}`;
    pickaxeComboEl.innerHTML = `
      <span class="mam-pickaxe-combo-row">
        <span class="mam-pickaxe-combo-num">${tapComboState.count}x</span>
        <span class="mam-pickaxe-combo-tag">${tier.badgeText}</span>
        ${isCrit ? '<span class="mam-pickaxe-combo-crit">CRIT!</span>' : ''}
      </span>
      <span class="mam-pickaxe-combo-bar"></span>
    `;
    pickaxeComboEl.style.display = 'flex';
    requestAnimationFrame(() => {
      pickaxeComboEl.classList.add('is-pop', 'is-draining');
    });
  };

  let clickFeedbackTimer: number | null = null;
  const syncPickaxeCursor = (e: PointerEvent): void => {
    lastPointerType = e.pointerType || 'mouse';
    if (isAdPlaying()) {
      document.body.classList.remove('mam-custom-cursor-active');
      pickaxeCursorEl.style.display = 'none';
      return;
    }
    if (lastPointerType === 'touch') {
      document.body.classList.remove('mam-custom-cursor-active');
      return;
    }
    document.body.classList.add('mam-custom-cursor-active');
    const canvas = threeRoot.querySelector('canvas');
    const isMining = Boolean(canvas && e.target === canvas && canvas.classList.contains('mam-mining-cursor'));
    const targetEl = e.target instanceof Element ? e.target : null;
    const isHoveringUi = !isMining && Boolean(targetEl?.closest(INTERACTIVE_CURSOR_SELECTOR));
    pickaxeCursorEl.classList.toggle('is-mining-mode', isMining);
    pickaxeCursorEl.classList.toggle('is-hovering', isHoveringUi);
    pickaxeCursorEl.style.display = 'block';
    setCursorPosition(e.clientX, e.clientY);
    syncComboEdgeFlip(e.clientX, e.clientY);
  };
  window.addEventListener('pointermove', syncPickaxeCursor, true);
  window.addEventListener(
    'pointerdown',
    (e) => {
      syncPickaxeCursor(e);
      if (lastPointerType === 'touch' || pickaxeCursorEl.style.display !== 'block') return;
      if (pickaxeCursorEl.classList.contains('is-mining-mode')) {
        triggerPickaxeSwing();
      } else {
        pickaxeCursorEl.classList.add('is-clicking');
        if (clickFeedbackTimer !== null) window.clearTimeout(clickFeedbackTimer);
        clickFeedbackTimer = window.setTimeout(() => {
          clickFeedbackTimer = null;
          pickaxeCursorEl.classList.remove('is-clicking');
        }, 115);
        spawnCursorClickPulse(e.clientX, e.clientY);
      }
    },
    true
  );
  document.addEventListener('pointerleave', () => {
    if (lastPointerType !== 'touch') {
      pickaxeCursorEl.style.display = 'none';
    }
  });
  window.addEventListener('blur', () => {
    pickaxeCursorEl.style.display = 'none';
  });

  const gameState = new GameState();
  let hud: GameHud | null = null;
  let activePitEvent: { kind: PitEventKind; expiresAt: number } | null = null;
  let nextPitEventAt = Date.now() + rollNextPitEventCooldownSec() * 1000;

  let holdMiningVisualActive = false;
  const spawnElectricSpark = (sx: number, sy: number): void => {
    const el = document.createElement('div');
    el.className = 'mam-electric-spark';
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    el.style.setProperty('--arc-rot', `${Math.round(Math.random() * 360)}deg`);
    el.innerHTML = `
      <svg viewBox="0 0 84 84" width="84" height="84" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M42 42 L26 24 L33 18 L14 6" stroke="#38bdf8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M42 42 L26 24 L33 18 L14 6" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M42 42 L62 28 L55 20 L74 10" stroke="#facc15" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M42 42 L58 60 L50 64 L68 78" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M42 42 L20 56 L27 64 L10 74" stroke="#7dd3fc" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="42" cy="42" r="6" fill="#ffffff" fill-opacity="0.9"/>
      </svg>
    `;
    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), 270);
  };

  const scene = new MineScene3D(threeRoot, {
    onOreBroken: (variantKey, meteorWeatherId, pitEventKind, screenPos) => {
      if (meteorWeatherId) {
        const wasActive = gameState.isOverclockActive();
        const reward = gameState.onMeteorBroken(meteorWeatherId);
        audio.playOreBreak('geode');
        audio.playCrystalChord('meteor');
        audio.playSfx('rare-fanfare', { volume: 0.55 });
        if (screenPos) {
          hud?.spawnLootVacuum(screenPos.x, screenPos.y, 'meteor');
        }
        const chibiName = reward.chibiId ? (getChibiById(reward.chibiId)?.name ?? reward.chibiId) : null;
        const extras = [
          `+${reward.weatherOreQty} ${reward.weatherOre.name}`,
          `+${reward.gemsAwarded} Gems`,
          reward.diceAwarded > 0 ? `+${reward.diceAwarded} Enchant Dice` : null,
          chibiName ? `+1 ${chibiName}` : null,
          wasActive ? '⚡ +5s FEVER CHAIN!' : null,
        ].filter(Boolean);
        hud?.pushToast(`☄️ ${reward.weatherOre.meteorName} shattered! ${extras.join(' • ')}`);
        hud?.notifyTutorialOreBroken();
        return;
      }
      if (pitEventKind === 'golden_vein') {
        const drops = PIT_EVENT_DEFS.golden_vein.oreDropMult;
        for (let i = 0; i < drops; i++) {
          gameState.onOreBroken(variantKey);
        }
        const ocExt = gameState.onPitEventBroken();
        activePitEvent = null;
        nextPitEventAt = Date.now() + rollNextPitEventCooldownSec() * 1000;
        audio.playOreBreak('geode');
        audio.playSfx('rare-fanfare', { volume: 0.5 });
        if (screenPos) {
          hud?.spawnLootVacuum(screenPos.x, screenPos.y, 'golden_vein');
        }
        const feverTag = ocExt.extended ? ` • ⚡ +${Math.round(ocExt.addedSec)}s FEVER!` : '';
        hud?.pushToast(`★ GOLDEN VEIN shattered! ${drops}× Ore Drops${feverTag}`);
        hud?.notifyTutorialOreBroken();
        return;
      }
      if (pitEventKind === 'crystal_surge') {
        gameState.onOreBroken(variantKey);
        const ocExt = gameState.onPitEventBroken();
        const worldIdx = Math.max(0, WORLDS.findIndex((w) => w.id === gameState.activeWorldId));
        const bonusGems = computePitEventBonusGems(worldIdx, 'crystal_surge');
        if (bonusGems > 0) gameState.grantAdGems(bonusGems);
        activePitEvent = null;
        nextPitEventAt = Date.now() + rollNextPitEventCooldownSec() * 1000;
        audio.playOreBreak('geode');
        audio.playSfx('rare-fanfare', { volume: 0.5 });
        if (screenPos) {
          hud?.spawnLootVacuum(screenPos.x, screenPos.y, 'crystal_surge');
        }
        const feverTag = ocExt.extended ? ` • ⚡ +${Math.round(ocExt.addedSec)}s FEVER!` : '';
        hud?.pushToast(`⚡ CRYSTAL SURGE shattered! +${bonusGems} Gems${feverTag}`);
        hud?.notifyTutorialOreBroken();
        return;
      }
      gameState.onOreBroken(variantKey);
      audio.playOreBreak(variantKey);
      if (screenPos) {
        hud?.spawnLootVacuum(screenPos.x, screenPos.y, variantKey === 'geode' ? 'geode' : 'ore');
      }
      hud?.notifyTutorialOreBroken();
    },
    onOreDamage: (dmg, sx, sy, isClick, isCrit, pitEventKind, isMeteor, isPerfect, beatIndex, isFinisher) => {
      hud?.spawnDamagePopup(dmg, sx, sy, isClick, isCrit, isPerfect);
      const curMode = scene.getMode();
      if (isClick) {
        if (curMode === 'mine') {
          triggerTapCombo(Boolean(isCrit || isPerfect), sx, sy);
          audio.playOreHit(true, Boolean(isPerfect), tapComboState.count);
          if (holdMiningVisualActive) {
            spawnElectricSpark(sx, sy);
          }
          if (isCrit || isPerfect) gameState.recordCritTap(dmg);
          if (isPerfect) {
            audio.playCrystalChord('perfect');
            triggerPerfectStrikeFlash();
            if (gameState.isOverclockActive()) {
              gameState.extendOverclock(OVERCLOCK_PERFECT_EXTEND_SEC, false);
              gameState.chargeOverclock(OVERCLOCK_SWEET_SPOT_CHARGE * 1.6);
            } else {
              gameState.chargeOverclock(OVERCLOCK_SWEET_SPOT_CHARGE);
            }
            hud?.pushToast('⚡ PERFECT STRIKE! +15% Fever Gauge!');
          } else {
            const eventFeverMult = pitEventKind ? PIT_EVENT_DEFS[pitEventKind].feverChargeMult : 1;
            const meteorFeverMult = isMeteor ? OVERCLOCK_METEOR_TAP_MULT : 1;
            gameState.chargeOverclock(
              (isCrit ? OVERCLOCK_TAP_CHARGE * 1.5 : OVERCLOCK_TAP_CHARGE) * eventFeverMult * meteorFeverMult
            );
          }
        } else {
          audio.playOreHit(true, Boolean(isCrit || isPerfect), tapComboState.count);
        }
      } else {
        if (beatIndex !== undefined) {
          audio.playBarrageHitSfx(beatIndex, Boolean(isCrit), Boolean(isFinisher));
        } else if (curMode === 'mine') {
          audio.playOreHit(false);
        }
        if (isMeteor && curMode === 'mine') {
          gameState.chargeOverclock(OVERCLOCK_CHIBI_METEOR_CHARGE);
        }
      }
    },
    onSweetSpot: (spot) => {
      hud?.updateSweetSpot(spot);
    },
    onFpsUpdate: (fps) => {
      hud?.updateFps(fps);
    },
    onHoldMineChange: (active) => {
      holdMiningVisualActive = active;
      pickaxeCursorEl.classList.toggle('is-hold-mining', active);
    },
    onChestClick: () => {
      if (hud && !hud.canTutorialInteract('chest')) return;
      audio.playSfx('ui-open');
      hud?.openModal('chest');
    },
    onRiftGateClick: () => {
      if (hud?.isTutorialActive()) return;
      audio.playSfx('ui-open');
      hud?.openModal('rift');
    },
    onPedestalClick: (slotIndex) => {
      if (hud && !hud.canTutorialInteract('plot', slotIndex)) return;
      const res = gameState.placeSelectedOnPlot(slotIndex);
      if (res === 'need-select') {
        audio.playSfx('ui-error', { volume: 0.45 });
        hud?.pushToast('Select a Miner in Hotbar (1-9) to place on Plot');
      } else if (res === 'placed') {
        audio.playSfx('place-chibi');
        hud?.pushToast(`Placed on Plot #${slotIndex + 1}`);
      } else if (res === 'limit') {
        audio.playSfx('ui-error');
        hud?.pushToast('All owned copies are already on Plots!');
      } else if (res === 'inspect') {
        audio.playSfx('ui-open');
        hud?.openPlotInspector(slotIndex);
      }
    },
    onPlotAnchors: (anchors) => {
      hud?.updatePlotAnchors(anchors);
    },
    onChestAnchor: (anchor) => {
      hud?.updateChestAnchor(anchor);
    },
    onOreBars: (bars) => {
      hud?.updateOreBars(bars);
    },
    onShopStationClick: (station) => {
      if (hud && !hud.canTutorialInteract('shop-station', station)) return;
      audio.playSfx('ui-open');
      hud?.openShopStation(station);
    },
    onShopAnchors: (anchors) => {
      hud?.updateShopAnchors(anchors);
    },
    onShopChibiBubbles: (bubbles) => {
      hud?.updateShopChibiBubbles(bubbles);
    },
    onAltarAnchors: (anchors) => {
      hud?.updateAltarAnchors(anchors);
    },
    onTowerTargetClick: (targetOreIndex, opts) => hud?.handleTowerTargetClick(targetOreIndex, opts),
    onTowerFighterStrike: (slotIndex, targetOreIndex, attackInterval, beatIndex, isFinisher) =>
      hud?.handleTowerFighterStrike(slotIndex, targetOreIndex, attackInterval, beatIndex, isFinisher),
    onTowerOreBars: (bars) => {
      hud?.updateTowerOreBars(bars);
    },
    onOmegaTargetClick: (targetId) => hud?.handleOmegaTargetClick(targetId),
    onOmegaBossClick: () => hud?.handleOmegaBossClick(),
    onOmegaEntranceSlam: () => {
      audio.playOreBreak('geode');
      audio.playCrystalChord('meteor');
    },
    onOmegaFighterStrike: (slotIndex, attackInterval, beatIndex, isFinisher) =>
      hud?.handleOmegaFighterStrike(slotIndex, attackInterval, beatIndex, isFinisher),
    onOmegaArenaOverlay: (data) => {
      hud?.updateOmegaArenaOverlay(data);
    },
    onRiftBossTap: (sx, sy) => hud?.handleRiftBossTap(sx, sy),
    onRiftFighterStrike: (slotIndex, attackInterval, isUltimate, beatIndex, isFinisher) =>
      hud?.handleRiftFighterStrike(slotIndex, attackInterval, isUltimate, beatIndex, isFinisher),
    onPlotUltFired: (info) => {
      hud?.triggerFeverUltCutIn(info);
    },
    onEncoreUltCompleted: () => {
      gameState.consumeOverclockEncoreUlt();
      hud?.syncOverclockHudLive();
    },
    onHyperEncoreComplete: () => {
      if (gameState.finishOverclockEncore()) {
        scene.setOverclockActive(false, 0);
        syncWorldToScene();
        syncPlotStatsToScene();
        hud?.syncOverclockHudLive();
        hud?.pushToast('★ HYPER ENCORE COMPLETE! Fever reset.');
      }
    },
  });
  scene.setWeather(gameState.weatherId);

  const syncWorldToScene = (): void => {
    scene.setWorldState(
      WORLD_PALETTES[gameState.activeWorldId],
      gameState.getOreHpScale(),
      gameState.getActiveOreNodeCount(),
      gameState.getTapDamage(),
      gameState.getRespawnSpeedMult()
    );
  };

  const spawnMeteorIfAllowed = (weatherId: WeatherId, toastText?: string): void => {
    if (!gameState.autoMeteor || hud?.isTutorialActive()) return;
    const minBossHp = computeMeteorDynamicHp(gameState.getTotalPlotDps(), gameState.getTapDamage());
    scene.spawnWeatherMeteor(weatherId, gameState.getOreHpScale(), minBossHp);
    if (toastText) hud?.pushToast(toastText);
  };

  const syncPlotStatsToScene = (): void => {
    for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
      const unit = gameState.getPlotUnit(i);
      const st = gameState.getPlotUnitStats(i);
      scene.syncPlotEnchant(i, unit?.enchantId ?? null);
      if (st) {
        scene.syncPlotUnitStats(i, st.dmg, st.speed, st.miningMult, st.critChance, st.critMult);
      }
    }
  };

  hud = new GameHud(
    hudRoot,
    gameState,
    (ids) => {
      scene.syncPlotMiners(ids);
      syncWorldToScene();
      syncPlotStatsToScene();
    },
    (slot) => {
      scene.focusPlot(slot);
    },
    (mode) => {
      scene.setMode(mode);
    },
    (enchantId, onComplete) => {
      scene.triggerEnchantSpin(enchantId, onComplete);
    },
    (opts) => {
      scene.syncTowerWave(opts);
    },
    {
      raycastPlotAt: (x, y) => scene.getPedestalAtClientPos(x, y),
      highlightPlot: (slot) => scene.setDragHoveredPedestal(slot),
      pulsePlot: (slot) => scene.pulsePedestal(slot),
      syncPlotLabel: (slotIndex, info) => scene.syncPlotLabel(slotIndex, info),
    },
    (weatherId) => {
      scene.setWeather(weatherId);
      const wDef = getWeatherById(weatherId);
      spawnMeteorIfAllowed(weatherId, `☄️ ${wDef.name} Meteor crashed into the pit!`);
      if (weatherId === 'celestial') {
        audio.playSfx('rare-fanfare', { volume: 0.65 });
      }
    },
    (zoomed) => {
      scene.setTutorialPitZoom(zoomed);
    },
    (zoomed) => {
      scene.setTutorialChestZoom(zoomed);
    },
    (zoomed) => {
      scene.setTutorialSellShopZoom(zoomed);
    },
    (enabled) => {
      if (enabled) {
        if (!scene.hasAliveMeteor()) {
          spawnMeteorIfAllowed(gameState.weatherId);
        }
        hud?.pushToast('Auto Meteor: ON');
      } else {
        scene.clearWeatherMeteor();
        hud?.pushToast('Auto Meteor: OFF');
      }
    },
    () => {
      if (!scene.hasAliveMeteor()) {
        spawnMeteorIfAllowed(gameState.weatherId);
      }
    },
    (overclockActive, overclockTier) => {
      scene.setOverclockActive(overclockActive, overclockTier);
      syncWorldToScene();
      syncPlotStatsToScene();
    },
    {
      syncFusionRecipe: (recipe, readyFlags, oreReadyFlags, canFuse) =>
        scene.syncFusionRecipe(recipe, readyFlags, oreReadyFlags, canFuse),
      triggerFusionAnimation: (recipe, onComplete) => scene.triggerFusionAnimation(recipe, onComplete),
      setFusionRevealHold: (active) => scene.setFusionRevealHold(active),
    },
    {
      setBossConfig: (bossId) => scene.setOmegaBossConfig(bossId),
      startEntrance: () => scene.startOmegaEntrance(),
      setBattlePhase: (phase) => scene.setOmegaBattlePhase(phase),
      pulseInvulShield: () => scene.pulseOmegaInvulShield(),
      syncBattleVisuals: (targets, breakActive, parryActive) =>
        scene.syncOmegaBattleVisuals(targets, breakActive, parryActive),
      triggerBossHit: (color, isCrit) => scene.triggerOmegaBossHit(color, isCrit),
      triggerTargetShatter: (wx, wz, color) => scene.triggerOmegaTargetShatter(wx, wz, color),
      grantSquadUltCharge: (fillFull) => scene.grantOmegaSquadUltCharge(fillFull),
    },
    {
      setBossConfig: (bossId, surgeActive) => scene.setRiftBossConfig(bossId, surgeActive),
      setBattleActive: (active) => scene.setRiftBattleActive(active),
      triggerBossHit: (color, isCrit) => scene.triggerRiftBossHit(color, isCrit),
      triggerTierShockwave: (tier) => scene.triggerRiftTierShockwave(tier),
      recordTapCharge: () => scene.recordRiftPlayerTapCharge(),
    },
    {
      grantSquadUltCharge: (amount) => scene.grantTowerSquadUltCharge(amount),
    }
  );
  hud.setOnModalVisibilityChange((open) => scene.setModalBackdropThrottled(open));

  const host = window.location.hostname;
  const isPrivateOrLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    host.endsWith('.local') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  const isLocalDev = Boolean(
    (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV && isPrivateOrLocalHost
  );
  if (isLocalDev) {
    interface DevDebugWindow extends Window {
      __unlockAllChibis?: () => number;
    }
    const LOCAL_DEV_NEW_CHIBI_IDS: readonly string[] = [
      'crimson-inkweaver',
      'ocular-maw',
      'crimson-adjudicator',
      'gilded-chainking',
      'solaris-queen',
      'verdant-runeborn',
      'pale-spiritcaller',
      'spiral-nightmare',
      'amethyst-dracomech',
      'elysian-seraph',
      'paradox-twins',
      'chrono-crystallis',
      'abyssal-leviathan',
      'void-asura',
      'null-singularity',
    ];
    const unlockAllLocalChibis = (): number => {
      const added = gameState.unlockChibisByIds(CHIBI_CATALOG.map((c) => c.id));
      hud?.pushToast(`Unlocked all ${CHIBI_CATALOG.length} Chibis!`);
      return added;
    };
    (window as DevDebugWindow).__unlockAllChibis = unlockAllLocalChibis;
    if (window.location.search.includes('unlock=1')) {
      unlockAllLocalChibis();
    } else {
      const missingNew = LOCAL_DEV_NEW_CHIBI_IDS.filter(
        (id) => (gameState.miners[id] || 0) < 1 || !gameState.discovered.has(id)
      );
      if (missingNew.length > 0) {
        const added = gameState.unlockChibisByIds(missingNew);
        if (added > 0) hud?.pushToast(`Unlocked ${added} new Chibi(s)!`);
      }
    }
  }

  const applySettings = (s: GameSettingsData): void => {
    audio.setBgmVolumeScale(s.bgmVolume);
    audio.setSfxVolumeScale(s.sfxVolume);
    scene.setGraphicsQuality(s.graphicsQuality);
    scene.setCameraLocked(s.cameraLocked);
    document.body.classList.toggle('mam-quality-low', s.graphicsQuality === 'low');
  };
  applySettings(gameSettings.get());
  gameSettings.subscribe(applySettings);

  cgBindAdLifecycle({
    setPaused: (paused) => {
      scene.setAdPaused(paused);
      hud?.setAdPaused(paused);
      if (paused) {
        document.body.classList.remove('mam-custom-cursor-active');
        pickaxeCursorEl.style.display = 'none';
        resetTapCombo();
      }
    },
    setAudioMuted: (muted) => audio.setAdMuted(muted),
  });

  if (!hud.isTutorialActive()) {
    const offlineSummary = gameState.evaluateOfflineEarnings(Date.now());
    if (offlineSummary) {
      hud.openModal('offline');
    }
    if (gameState.autoMeteor) {
      spawnMeteorIfAllowed(gameState.weatherId);
    }
  }
  const syncRiftGateVisual = (nowMs: number): void => {
    const snap = gameState.getRiftWindowSnapshot(nowMs);
    const sec = snap.isOpen ? snap.remainingSec : snap.nextOpenSec;
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    scene.setRiftGateStatus(snap.isOpen, snap.isOpen ? `RIFT OPEN ${mm}:${ss}` : `RIFT IN ${mm}:${ss}`);
  };
  syncRiftGateVisual(Date.now());

  window.setInterval(() => {
    const now = Date.now();
    syncRiftGateVisual(now);
    if (isAdPlaying() || hud?.isTutorialActive()) return;
    if (activePitEvent) {
      if (now >= activePitEvent.expiresAt) {
        scene.clearPitEvent();
        activePitEvent = null;
        nextPitEventAt = now + rollNextPitEventCooldownSec() * 1000;
      }
      return;
    }
    if (now >= nextPitEventAt && scene.getMode() === 'mine') {
      const kind = rollPitEventKind();
      if (scene.spawnPitEvent(kind)) {
        const def = PIT_EVENT_DEFS[kind];
        activePitEvent = { kind, expiresAt: now + def.durationSec * 1000 };
        hud?.pushToast(`${def.badgeText} appeared! ${def.subtitle}`);
      } else {
        nextPitEventAt = now + 15_000;
      }
    }
  }, 1000);

  audio.setSceneMode('mine');
  cgLoadingStop();
  if (!document.hidden) {
    cgGameplayStart();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      gameState.touchSaveTimestamp();
      cgGameplayStop();
    } else if (!isAdPlaying()) {
      cgGameplayStart();
    }
  });
  window.addEventListener('beforeunload', () => gameState.touchSaveTimestamp());
  window.addEventListener('blur', () => cgGameplayStop());
  window.addEventListener('focus', () => {
    if (!document.hidden && !isAdPlaying()) cgGameplayStart();
  });
}

void bootstrap();
