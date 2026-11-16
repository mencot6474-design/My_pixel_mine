import './styles/global.css';
import './styles/hud.css';
import { audio } from './audio/AudioManager';
import { GameState } from './game/GameState';
import { get3dPickaxeCursorUrl, init3dHudIcons } from './game3d/HudIcon3DRenderer';
import { MineScene3D } from './game3d/MineScene3D';
import { STAGE_PEDESTAL_COUNT, WORLD_PALETTES } from './game3d/MineWorldPalette';
import {
  cgGameplayStart,
  cgInit,
  cgLoadingStart,
  cgLoadingStop,
} from './sdk/crazygames';
import { GameHud } from './ui/GameHud';

async function bootstrap(): Promise<void> {
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  cgLoadingStart();
  await cgInit();
  init3dHudIcons();
  const cursorUrl = get3dPickaxeCursorUrl();
  if (cursorUrl) {
    document.documentElement.style.setProperty('--mam-cursor', `url("${cursorUrl}") 4 4, auto`);
  }

  const threeRoot = document.getElementById('threeRoot');
  const hudRoot = document.getElementById('hudRoot');
  if (!threeRoot || !hudRoot) return;

  const gameState = new GameState();
  let hud: GameHud | null = null;

  const scene = new MineScene3D(threeRoot, {
    onOreBroken: (variantKey) => {
      gameState.onOreBroken(variantKey);
      audio.playOreBreak(variantKey);
    },
    onOreDamage: (dmg, sx, sy, isClick) => {
      hud?.spawnDamagePopup(dmg, sx, sy, isClick);
      audio.playOreHit(isClick);
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
      } else if (res === 'inspect') {
        audio.playSfx('ui-open');
        hud?.openPlotInspector(slotIndex);
      }
    },
    onPlotAnchors: (anchors) => {
      hud?.updatePlotAnchors(anchors);
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
    },
    (weatherId) => {
      scene.setWeather(weatherId);
      if (weatherId === 'celestial') {
        audio.playSfx('rare-fanfare', { volume: 0.65 });
      }
    }
  );

  audio.setSceneMode('mine');
  cgLoadingStop();
  cgGameplayStart();
}

void bootstrap();
