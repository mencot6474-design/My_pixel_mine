# Performance & Audio Settings — Design Spec

**Date:** 2026-11-19
**Status:** Approved

## Intent & Why
My Pixel Mine is live in CrazyGames Basic Launch. Players on lower-end devices (Chromebooks, mobile webviews, budget laptops) need a quick way to lower 3D rendering cost (pixel ratio, shadows, weather particles) and DOM overhead (damage popups) to maintain smooth FPS, plus independent BGM/SFX volume controls.

## Goals
- Provide a clean Dark-Glass Settings modal accessible via a compact gear button next to the existing top-right audio toggle button.
- Support 3 Graphics Quality presets (`low`, `medium`, `high`, default `high`) applied live to Three.js renderer, shadows, and `WeatherFx3D`.
- Support independent BGM and SFX volume sliders (`0`–`100%`) plus Mute All, synced with `AudioManager` and respecting CrazyGames ad/portal mute states.
- Support toggling floating Damage Popups (`showDamagePopups`, default `true`) in `WorldOverlayHudUi`.
- Persist settings locally in `localStorage` (`mam_settings_v1`) without modifying gameplay save payloads.

## Non-Goals
- No Export/Import Save Code (CrazyGames handles save/prefs).
- No per-mesh LOD or shader recompilation toggles beyond pixel ratio, shadows, and weather particle density.

## Constraints
- Keep `GameHud.ts` thin; place modal rendering/binding in `src/ui/SettingsModalUi.ts`.
- Strict TypeScript (no `any`), clean Tailwind CSS v4 + existing `.mam-modal` Dark-Glass theme.
- Unit tests must pass in Vitest without WebGL/DOM errors (`npm.cmd test` & `npm.cmd run build`).

## Approaches Considered
1. **Dedicated `src/game/GameSettings.ts` store (`localStorage` key `mam_settings_v1`)** *(Selected)*
   - Clean separation between device-local preferences (FPS/audio) and gameplay progression (`GameState`).
   - Immediately readable on boot before `MineScene3D` and `AudioManager` finish initializing.
2. **Embed settings inside `GameState` / `SavePayload`** *(Rejected)*
   - Couples device performance preferences to gameplay save state and increases `GameState.ts` complexity unnecessarily.

## Component Design
- **`src/game/GameSettings.ts`**:
  - `GraphicsQuality = 'low' | 'medium' | 'high'`
  - `GameSettingsData`: `{ graphicsQuality: GraphicsQuality; bgmVolume: number; sfxVolume: number; showDamagePopups: boolean }`
  - `GRAPHICS_PRESETS`: pure mapping for `maxPixelRatio`, `shadowsEnabled`, `weatherParticleScale` (`high`: 2 / true / 1, `medium`: 1.25 / true / 0.5, `low`: 1 / false / 0).
  - `GameSettings` class with `get()`, `update(partial)`, `subscribe(fn)`, `load()`, `save()`.
- **`src/audio/AudioManager.ts`**:
  - Add `setBgmGainScale(0..1)` & `setSfxGainScale(0..1)` (multiplying base `0.28` / `0.58`), plus getters, applying live to `bgmAudio.volume` and `sfxGain.gain.value`.
- **`src/game3d/WeatherFx3D.ts` & `src/game3d/MineScene3D.ts`**:
  - `WeatherFx3D.setQualityScale(scale: number)` controls `group.visible` (`scale > 0`) and `geometry.setDrawRange(0, Math.floor(count * scale))`.
  - `MineScene3D.applyGraphicsQuality(quality: GraphicsQuality)` updates `renderer.setPixelRatio(Math.min(dpr, preset.maxPixelRatio))`, `renderer.shadowMap.enabled`, `sunLight.castShadow`, `renderer.shadowMap.needsUpdate = true`, and `weatherFx.setQualityScale(...)`.
- **`src/ui/SettingsModalUi.ts`, `src/ui/HudShared.ts`, `src/ui/WorldOverlayHudUi.ts`, `src/ui/GameHud.ts`, `src/styles/hud.css`**:
  - Add `'settings'` to `ModalKind` and `[data-modal-theme="settings"]` accent tokens in `hud.css`.
  - Render compact gear button beside the audio mute button in `GameHud.ts`.
  - `SettingsModalUi` renders quality segmented selector, BGM/SFX range sliders with live `%` readout, Mute All toggle, and Damage Popups toggle.
  - `WorldOverlayHudUi.spawnDamagePopup` returns early if `!gameSettings.get().showDamagePopups`.
- **`src/main.ts`**:
  - Apply initial `gameSettings` to `audio` and `scene3d` on boot, and subscribe so live changes take effect immediately.
