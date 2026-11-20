import './styles/global.css';
import './styles/hud.css';
import { audio } from './audio/AudioManager';
import { assetUrl } from './game/AssetUrl';
import { gameSettings, type GameSettingsData } from './game/GameSettings';
import { GameState } from './game/GameState';
import {
  OVERCLOCK_CHIBI_METEOR_CHARGE,
  OVERCLOCK_METEOR_TAP_MULT,
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
import { getChibiById } from './game3d/ChibiCatalog';
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
    void pickaxeCursorEl.offsetWidth;
    pickaxeCursorEl.classList.add('is-swinging');
  };

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
      pickaxeCursorEl.style.left = `${Math.round(sx)}px`;
      pickaxeCursorEl.style.top = `${Math.round(sy)}px`;
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
    void pickaxeComboEl.offsetWidth;
    pickaxeComboEl.classList.add('is-pop', 'is-draining');
  };

  const syncPickaxeCursor = (e: PointerEvent): void => {
    lastPointerType = e.pointerType || 'mouse';
    if (isAdPlaying()) {
      pickaxeCursorEl.style.display = 'none';
      return;
    }
    if (lastPointerType === 'touch') {
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
    syncComboEdgeFlip(e.clientX, e.clientY);
  };
  window.addEventListener('pointermove', syncPickaxeCursor, true);
  window.addEventListener(
    'pointerdown',
    (e) => {
      syncPickaxeCursor(e);
      if (lastPointerType !== 'touch' && pickaxeCursorEl.style.display === 'block') {
        triggerPickaxeSwing();
      }
    },
    true
  );

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
    onOreBroken: (variantKey, meteorWeatherId, pitEventKind) => {
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
      if (pitEventKind === 'golden_vein') {
        const drops = PIT_EVENT_DEFS.golden_vein.oreDropMult;
        for (let i = 0; i < drops; i++) {
          gameState.onOreBroken(variantKey);
        }
        activePitEvent = null;
        nextPitEventAt = Date.now() + rollNextPitEventCooldownSec() * 1000;
        audio.playOreBreak('geode');
        audio.playSfx('rare-fanfare', { volume: 0.5 });
        hud?.pushToast(`★ GOLDEN VEIN shattered! ${drops}× Ore Drops!`);
        hud?.notifyTutorialOreBroken();
        return;
      }
      if (pitEventKind === 'crystal_surge') {
        gameState.onOreBroken(variantKey);
        const worldIdx = Math.max(0, WORLDS.findIndex((w) => w.id === gameState.activeWorldId));
        const bonusGems = computePitEventBonusGems(worldIdx, 'crystal_surge');
        if (bonusGems > 0) gameState.grantAdGems(bonusGems);
        activePitEvent = null;
        nextPitEventAt = Date.now() + rollNextPitEventCooldownSec() * 1000;
        audio.playOreBreak('geode');
        audio.playSfx('rare-fanfare', { volume: 0.5 });
        hud?.pushToast(`⚡ CRYSTAL SURGE shattered! +${bonusGems} Gems!`);
        hud?.notifyTutorialOreBroken();
        return;
      }
      gameState.onOreBroken(variantKey);
      audio.playOreBreak(variantKey);
      hud?.notifyTutorialOreBroken();
    },
    onOreDamage: (dmg, sx, sy, isClick, isCrit, pitEventKind, isMeteor) => {
      hud?.spawnDamagePopup(dmg, sx, sy, isClick, isCrit);
      audio.playOreHit(isClick);
      if (isClick) {
        triggerTapCombo(Boolean(isCrit), sx, sy);
        if (holdMiningVisualActive) {
          spawnElectricSpark(sx, sy);
        }
        if (isCrit) gameState.recordCritTap(dmg);
        const eventFeverMult = pitEventKind ? PIT_EVENT_DEFS[pitEventKind].feverChargeMult : 1;
        const meteorFeverMult = isMeteor ? OVERCLOCK_METEOR_TAP_MULT : 1;
        gameState.chargeOverclock(
          (isCrit ? OVERCLOCK_TAP_CHARGE * 1.5 : OVERCLOCK_TAP_CHARGE) * eventFeverMult * meteorFeverMult
        );
      } else if (isMeteor) {
        gameState.chargeOverclock(OVERCLOCK_CHIBI_METEOR_CHARGE);
      }
    },
    onHoldMineChange: (active) => {
      holdMiningVisualActive = active;
      pickaxeCursorEl.classList.toggle('is-hold-mining', active);
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
    const minBossHp = computeMeteorDynamicHp(gameState.getTotalPlotDps(), gameState.getTapDamage());
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
      setFusionRevealHold: (active) => scene.setFusionRevealHold(active),
    }
  );

  const applySettings = (s: GameSettingsData): void => {
    audio.setBgmVolumeScale(s.bgmVolume);
    audio.setSfxVolumeScale(s.sfxVolume);
    scene.setGraphicsQuality(s.graphicsQuality);
    scene.setCameraLocked(s.cameraLocked);
  };
  applySettings(gameSettings.get());
  gameSettings.subscribe(applySettings);

  cgBindAdLifecycle({
    setPaused: (paused) => {
      scene.setAdPaused(paused);
      hud?.setAdPaused(paused);
      if (paused) {
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
  window.setInterval(() => {
    if (isAdPlaying() || hud?.isTutorialActive()) return;
    const now = Date.now();
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
