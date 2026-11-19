import './styles/global.css';
import './styles/hud.css';
import { audio } from './audio/AudioManager';
import { assetUrl } from './game/AssetUrl';
import { gameSettings, type GameSettingsData } from './game/GameSettings';
import { GameState } from './game/GameState';
import { OVERCLOCK_TAP_CHARGE } from './game/OverclockDomain';
import { getWeatherById, type WeatherId } from './game/WeatherData';
import { getChibiById } from './game3d/ChibiCatalog';
import { init3dHudIcons } from './game3d/HudIcon3DRenderer';
import { MineScene3D } from './game3d/MineScene3D';
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

async function bootstrap(): Promise<void> {
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  await cgInit();
  cgBindAudioMuteListener((muted) => audio.setPortalMuted(muted));
  cgLoadingStart();
  init3dHudIcons();

  const pickaxeCursorEl = document.createElement('div');
  pickaxeCursorEl.id = 'mamPickaxeCursor';
  pickaxeCursorEl.style.display = 'none';
  pickaxeCursorEl.innerHTML = `<img src="${assetUrl('/pickaxes/sunwheel.webp')}" alt="" />`;
  document.body.appendChild(pickaxeCursorEl);

  const threeRoot = document.getElementById('threeRoot');
  const hudRoot = document.getElementById('hudRoot');
  if (!threeRoot || !hudRoot) return;

  const syncPickaxeCursor = (e: PointerEvent): void => {
    if (isAdPlaying()) {
      pickaxeCursorEl.style.display = 'none';
      return;
    }
    const canvas = threeRoot.querySelector('canvas');
    const active = Boolean(canvas && e.target === canvas && canvas.classList.contains('mam-mining-cursor'));
    if (!active) {
      pickaxeCursorEl.style.display = 'none';
      return;
    }
    pickaxeCursorEl.style.display = 'block';
    pickaxeCursorEl.style.left = `${e.clientX}px`;
    pickaxeCursorEl.style.top = `${e.clientY}px`;
  };
  window.addEventListener('pointermove', syncPickaxeCursor, true);
  window.addEventListener(
    'pointerdown',
    (e) => {
      syncPickaxeCursor(e);
      if (pickaxeCursorEl.style.display === 'block') {
        pickaxeCursorEl.classList.remove('is-swinging');
        void pickaxeCursorEl.offsetWidth;
        pickaxeCursorEl.classList.add('is-swinging');
      }
    },
    true
  );

  const gameState = new GameState();
  let hud: GameHud | null = null;

  const scene = new MineScene3D(threeRoot, {
    onOreBroken: (variantKey, meteorWeatherId) => {
      if (meteorWeatherId) {
        const reward = gameState.onMeteorBroken(meteorWeatherId);
        audio.playOreBreak('geode');
        audio.playSfx('rare-fanfare', { volume: 0.55 });
        const chibiName = reward.chibiId ? (getChibiById(reward.chibiId)?.name ?? reward.chibiId) : null;
        const extras = [
          `+${reward.weatherOreQty} ${reward.weatherOre.name}`,
          `+${reward.gemsAwarded} Gems`,
          reward.diceAwarded > 0 ? `+${reward.diceAwarded} Enchant Dice` : null,
          chibiName ? `+1 ${chibiName}` : null,
        ].filter(Boolean);
        hud?.pushToast(`☄️ ${reward.weatherOre.meteorName} shattered! ${extras.join(' • ')}`);
        hud?.notifyTutorialOreBroken();
        return;
      }
      gameState.onOreBroken(variantKey);
      audio.playOreBreak(variantKey);
      hud?.notifyTutorialOreBroken();
    },
    onOreDamage: (dmg, sx, sy, isClick) => {
      hud?.spawnDamagePopup(dmg, sx, sy, isClick);
      audio.playOreHit(isClick);
      if (isClick) {
        gameState.chargeOverclock(OVERCLOCK_TAP_CHARGE);
      }
    },
    onChestClick: () => {
      audio.playSfx('ui-open');
      hud?.openModal('chest');
    },
    onPedestalClick: (slotIndex) => {
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
    onTowerTargetClick: (targetOreIndex) => hud?.handleTowerTargetClick(targetOreIndex),
    onTowerFighterStrike: (slotIndex, targetOreIndex, attackInterval) =>
      hud?.handleTowerFighterStrike(slotIndex, targetOreIndex, attackInterval),
    onTowerOreBars: (bars) => {
      hud?.updateTowerOreBars(bars);
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
    const minBossHp = Math.round(gameState.getTotalPlotDps() * 90 + gameState.getTapDamage() * 300);
    scene.spawnWeatherMeteor(weatherId, gameState.getOreHpScale(), minBossHp);
    if (toastText) hud?.pushToast(toastText);
  };

  hud = new GameHud(
    hudRoot,
    gameState,
    (ids) => {
      scene.syncPlotMiners(ids);
      syncWorldToScene();
      for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
        const unit = gameState.getPlotUnit(i);
        const st = gameState.getPlotUnitStats(i);
        scene.syncPlotEnchant(i, unit?.enchantId ?? null);
        if (st) {
          scene.syncPlotUnitStats(i, st.dmg, st.speed, st.miningMult);
        }
      }
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
    (overclockActive) => {
      scene.setOverclockActive(overclockActive);
      syncWorldToScene();
    },
    {
      syncFusionRecipe: (recipe, readyFlags, oreReadyFlags, canFuse) =>
        scene.syncFusionRecipe(recipe, readyFlags, oreReadyFlags, canFuse),
      triggerFusionAnimation: (recipe, onComplete) => scene.triggerFusionAnimation(recipe, onComplete),
    }
  );

  const applySettings = (s: GameSettingsData): void => {
    audio.setBgmVolumeScale(s.bgmVolume);
    audio.setSfxVolumeScale(s.sfxVolume);
    scene.setGraphicsQuality(s.graphicsQuality);
  };
  applySettings(gameSettings.get());
  gameSettings.subscribe(applySettings);

  cgBindAdLifecycle({
    setPaused: (paused) => {
      scene.setAdPaused(paused);
      hud?.setAdPaused(paused);
      if (paused) {
        pickaxeCursorEl.style.display = 'none';
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
