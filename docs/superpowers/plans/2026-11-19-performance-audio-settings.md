# Performance & Audio Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Dark-Glass Settings modal with Graphics Quality (`Low`/`Medium`/`High`), independent BGM/SFX volume sliders, Mute All sync, and Damage Popups toggle.

**Architecture:** Introduce a standalone device-local `GameSettings` store (`src/game/GameSettings.ts`, `localStorage` key `mam_settings_v1`) decoupled from gameplay saves. Wire live subscriptions in `src/main.ts` to update `AudioManager` volume scales, `MineScene3D` renderer/shadow/weather quality, and `WorldOverlayHudUi` damage popup gating, exposed via `src/ui/SettingsModalUi.ts` and a compact gear button beside the top-right audio button in `GameHud.ts`.

**Tech Stack:** TypeScript (strict, no `any`), Three.js, Tailwind CSS v4, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-11-19-performance-audio-settings-design.md`

## Global Constraints
- Strict TypeScript (`no any`), delta clamp `<= 0.1`, clean `.dispose()` discipline.
- No Export/Import Save Code; keep settings completely separate from `GameState` / `SavePayload`.
- Keep `GameHud.ts` thin; place modal rendering and event binding in `src/ui/SettingsModalUi.ts`.
- Preserve CrazyGames SDK v3 mute precedence (`userMuted || adMuted || portalMuted || hiddenMuted`).
- Verify with `npm.cmd test` and `npm.cmd run build` after implementation.

## Review Focus
- Corrupted or partial JSON in `localStorage` under `mam_settings_v1` (e.g. `bgmVolume: "loud"`, `graphicsQuality: "ultra"`, or invalid JSON) must safely normalize back to valid defaults without throwing.
- Out-of-range volume inputs (`-0.5`, `2.5`, `NaN`) passed to `GameSettings.update` or `AudioManager.setBgmVolumeScale` / `setSfxVolumeScale` must clamp cleanly to `[0, 1]`.
- Dragging a volume slider while `adMuted` or `portalMuted` is active must persist the chosen volume scale without unmuting playback during an ad or portal mute.
- Switching `WeatherFx3D` quality to `0` (`low`) and back to `0.5` (`medium`) or `1` (`high`) must restore `group.visible` and `geometry.drawRange.count` accurately without mutating buffer lengths.
- Toggling `showDamagePopups` off must prevent new DOM popups in `WorldOverlayHudUi.spawnDamagePopup` without throwing if `dmgLayerEl` is missing or inspected slot is open.

---

### Task 1: `GameSettings` Store & Pure Preset Mapping

**Files:**
- Create: `src/game/GameSettings.ts`
- Test: `tests/hud-modules.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `export type GraphicsQuality = 'low' | 'medium' | 'high';`
  - `export interface GraphicsPreset { maxPixelRatio: number; shadowsEnabled: boolean; weatherParticleScale: number; }`
  - `export interface GameSettingsData { graphicsQuality: GraphicsQuality; bgmVolume: number; sfxVolume: number; showDamagePopups: boolean; }`
  - `export const SETTINGS_STORAGE_KEY = 'mam_settings_v1';`
  - `export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsPreset>`
  - `export const DEFAULT_GAME_SETTINGS: GameSettingsData`
  - `export function normalizeGameSettings(raw: unknown): GameSettingsData`
  - `export class GameSettings` (`get(): GameSettingsData`, `update(patch: Partial<GameSettingsData>): GameSettingsData`, `subscribe(fn: (s: GameSettingsData) => void): () => void`, `reset(): GameSettingsData`)
  - `export const gameSettings: GameSettings`

- [ ] **Step 1: Write failing tests for `GameSettings` & `normalizeGameSettings`**

Add a `describe('GameSettings', ...)` block in `tests/hud-modules.test.ts` testing:
- `GRAPHICS_PRESETS` exact values (`high`: `2 / true / 1`, `medium`: `1.25 / true / 0.5`, `low`: `1 / false / 0`).
- `normalizeGameSettings` returns `DEFAULT_GAME_SETTINGS` for `null`, invalid types, invalid `graphicsQuality: 'ultra'`, and clamps `bgmVolume: -0.5` -> `0`, `sfxVolume: 2.5` -> `1`, `NaN` -> `1`.
- `GameSettings.update` notifies subscribers, clamps values, and persists to/loads from a mock storage.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hud-modules.test.ts -t "GameSettings"`
Expected: FAIL (`Cannot find module '../src/game/GameSettings'`)

- [ ] **Step 3: Implement `src/game/GameSettings.ts`**

Implement the exact exported types, `GRAPHICS_PRESETS`, `DEFAULT_GAME_SETTINGS` (`graphicsQuality: 'high'`, `bgmVolume: 1`, `sfxVolume: 1`, `showDamagePopups: true`), `normalizeGameSettings(raw: unknown)`, and `GameSettings` (accepting optional `Storage` injection for deterministic testing, defaulting to `globalThis.localStorage` guarded by `try/catch`), plus singleton `export const gameSettings = new GameSettings();`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hud-modules.test.ts -t "GameSettings"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/GameSettings.ts tests/hud-modules.test.ts
git commit -m "feat: add GameSettings store with graphics presets and normalization"
```

---

### Task 2: `AudioManager` Independent BGM & SFX Volume Scales

**Files:**
- Modify: `src/audio/AudioManager.ts:94-160`
- Test: `tests/hud-modules.test.ts`

**Interfaces:**
- Consumes: none
- Produces on `AudioManager`:
  - `public getBgmVolumeScale(): number` (0..1, default 1)
  - `public getSfxVolumeScale(): number` (0..1, default 1)
  - `public setBgmVolumeScale(scale: number): void`
  - `public setSfxVolumeScale(scale: number): void`

- [ ] **Step 1: Write failing tests for `AudioManager` volume scaling**

In `tests/hud-modules.test.ts`, add tests on a fresh `new AudioManager()` verifying:
- `setBgmVolumeScale(0.5)` and `setSfxVolumeScale(0.25)` store normalized values, and out-of-range (`-1`, `3`, `NaN`) clamp to `[0, 1]`.
- Calling `setBgmVolumeScale(0.8)` while `setAdMuted(true)` or `setPortalMuted(true)` keeps `isEffectivelyMuted() === true`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hud-modules.test.ts -t "AudioManager volume"`
Expected: FAIL (`setBgmVolumeScale is not a function`)

- [ ] **Step 3: Implement BGM/SFX scale methods in `src/audio/AudioManager.ts`**

Keep base `BASE_BGM_VOLUME = 0.28` and `BASE_SFX_VOLUME = 0.58`. Add `bgmVolumeScale = 1` and `sfxVolumeScale = 1`, compute `this.bgmVolume = BASE_BGM_VOLUME * this.bgmVolumeScale` and `this.sfxVolume = BASE_SFX_VOLUME * this.sfxVolumeScale`, and apply immediately via `syncAudioState()` (updating `bgmAudio.volume` only when not effectively muted, and updating `sfxGain.gain.value` when not effectively muted).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hud-modules.test.ts -t "AudioManager volume"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/audio/AudioManager.ts tests/hud-modules.test.ts
git commit -m "feat: add independent BGM and SFX volume scaling to AudioManager"
```

---

### Task 3: 3D Graphics Quality Hooks (`WeatherFx3D` & `MineScene3D`)

**Files:**
- Modify: `src/game3d/WeatherFx3D.ts:74-230`
- Modify: `src/game3d/MineScene3D.ts:130-165` and public methods
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `GraphicsQuality`, `GRAPHICS_PRESETS` from `src/game/GameSettings.ts`
- Produces:
  - `WeatherFx3D.setQualityScale(scale: number): void`
  - `WeatherFx3D.getActiveParticleCount(): number`
  - `MineScene3D.setGraphicsQuality(quality: GraphicsQuality): void`

- [ ] **Step 1: Write failing test for `WeatherFx3D.setQualityScale`**

In `tests/world-3d.test.ts`, add a test verifying:
- `fx.setQualityScale(1)` -> `fx.group.visible === true` and `fx.getActiveParticleCount() === 240` (full `PARTICLE_COUNT`).
- `fx.setQualityScale(0.5)` -> `fx.group.visible === true` and `fx.getActiveParticleCount() === 120`.
- `fx.setQualityScale(0)` -> `fx.group.visible === false` and `fx.getActiveParticleCount() === 0`, and calling `fx.update(0.05)` is a safe no-op.
- Restoring `fx.setQualityScale(1)` restores `fx.group.visible === true` and `240` draw count.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/world-3d.test.ts -t "WeatherFx3D quality"`
Expected: FAIL (`setQualityScale is not a function`)

- [ ] **Step 3: Implement `WeatherFx3D.setQualityScale` and `MineScene3D.setGraphicsQuality`**

- In `src/game3d/WeatherFx3D.ts`: add `private qualityScale = 1;` and `setQualityScale(scale: number)` clamping `0..1`, setting `this.group.visible = clamped > 0`, `this.geom.setDrawRange(0, Math.round(PARTICLE_COUNT * clamped))`, and returning early in `update()` when `this.qualityScale <= 0`.
- In `src/game3d/MineScene3D.ts`: store `private graphicsQuality: GraphicsQuality = 'high';` and add `public setGraphicsQuality(quality: GraphicsQuality): void` applying `GRAPHICS_PRESETS[quality]` (`renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio))`, `renderer.shadowMap.enabled = preset.shadowsEnabled`, `sunLight.castShadow = preset.shadowsEnabled`, `renderer.shadowMap.needsUpdate = true`, `weatherFx.setQualityScale(preset.weatherParticleScale)`). Also respect `GRAPHICS_PRESETS[this.graphicsQuality].maxPixelRatio` in `onResize()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/world-3d.test.ts -t "WeatherFx3D quality"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game3d/WeatherFx3D.ts src/game3d/MineScene3D.ts tests/world-3d.test.ts
git commit -m "feat: apply graphics quality presets to WeatherFx3D and MineScene3D"
```

---

### Task 4: `SettingsModalUi`, HUD Gear Button, Damage Popups Toggle & `main.ts` Wiring

**Files:**
- Create: `src/ui/SettingsModalUi.ts`
- Modify: `src/ui/HudShared.ts:24-38`
- Modify: `src/ui/WorldOverlayHudUi.ts:394-410`
- Modify: `src/ui/GameHud.ts` (top-right gear button next to audio toggle, `'settings'` modal route, `SettingsModalUi` delegation)
- Modify: `src/styles/hud.css` (add `[data-modal-theme="settings"]` accent tokens)
- Modify: `src/main.ts` (apply initial `gameSettings` + subscribe live changes)
- Test: `tests/hud-modules.test.ts`

**Interfaces:**
- Consumes: `gameSettings`, `GameSettings`, `GraphicsQuality` from `src/game/GameSettings.ts`; `audio` from `src/audio/AudioManager.ts`; `renderModalShell` from `src/ui/HudShared.ts`.
- Produces:
  - `export class SettingsModalUi` (`renderModal(): string`, `bindEvents(root: HTMLElement): void`)
  - `'settings'` added to `ModalKind` in `src/ui/HudShared.ts`
  - `WorldOverlayHudUi.spawnDamagePopup` checks `gameSettings.get().showDamagePopups` before creating DOM nodes.

- [ ] **Step 1: Write failing tests for `SettingsModalUi` and Damage Popups gate**

In `tests/hud-modules.test.ts`, add tests verifying:
- `SettingsModalUi.renderModal()` renders `data-modal-theme="settings"`, the 3 quality buttons (`low`, `medium`, `high`), BGM & SFX range sliders with `%` readouts, Mute All toggle, and Damage Popups toggle.
- `WorldOverlayHudUi.spawnDamagePopup` does not append a child when `showDamagePopups` is `false`, and appends one when `true`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hud-modules.test.ts -t "SettingsModalUi"`
Expected: FAIL (`Cannot find module '../src/ui/SettingsModalUi'`)

- [ ] **Step 3: Implement `SettingsModalUi.ts` and wire into `HudShared`, `WorldOverlayHudUi`, `GameHud`, `hud.css`, and `main.ts`**

- Add `'settings'` to `ModalKind` in `src/ui/HudShared.ts`.
- Add `[data-modal-theme="settings"]` cool-slate/cyan Dark-Glass theme tokens in `src/styles/hud.css`.
- Create `src/ui/SettingsModalUi.ts` using `renderModalShell` (`theme: 'settings'`, `title: 'Settings'`, compact centered card layout with Graphics Quality segmented buttons, BGM & SFX range sliders + live `%` label update on `input` event without full modal re-render flicker, Mute All toggle, and Damage Popups toggle).
- Gate `WorldOverlayHudUi.spawnDamagePopup` with `if (!gameSettings.get().showDamagePopups) return;`.
- In `src/ui/GameHud.ts`: render a compact gear button (`data-action="open-settings"`) beside the audio toggle button (`renderTopRightUtilityBtns`), route `activeModal === 'settings'` to `this.settingsUi.renderModal()`, and call `this.settingsUi.bindEvents(this.root)`.
- In `src/main.ts`: apply initial `gameSettings.get()` to `audio` (`setBgmVolumeScale`, `setSfxVolumeScale`) and `scene.setGraphicsQuality(...)`, and subscribe `gameSettings.subscribe(...)` to sync live changes.

- [ ] **Step 4: Run full verification suite & update `GAME_MAP.md`**

Run: `npm.cmd test` and `npm.cmd run build`
Expected: All Vitest suites pass and Vite production build succeeds with zero TypeScript errors.
Update `GAME_MAP.md` with `src/game/GameSettings.ts` and `src/ui/SettingsModalUi.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/SettingsModalUi.ts src/ui/HudShared.ts src/ui/WorldOverlayHudUi.ts src/ui/GameHud.ts src/styles/hud.css src/main.ts tests/hud-modules.test.ts GAME_MAP.md
git commit -m "feat: add Dark-Glass Settings modal with graphics quality, audio sliders, and damage popups toggle"
```
