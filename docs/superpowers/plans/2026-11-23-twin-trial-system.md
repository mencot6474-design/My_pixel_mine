# Twin Tier Chibi Trial System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a post-tutorial 20-minute **Twin Tier Chibi Trial** unlocked upon tutorial completion or skip, accessed via a Trial icon directly beneath the top-right Audio icon, letting players claim 1 of 5 Twin Chibis as a read-only showcase unit that auto-removes completely when expired.

**Architecture:** Introduce a pure domain module (`src/game/TwinTrialDomain.ts`) managing `twinTrial` lifecycle (`'locked' | 'available' | 'active' | 'expired'`), real-time 20-minute `expiresAt` timestamps, permanent-vs-trial copy accounting, and expiry cleanup across `miners`/`plotUnits`/`stashedUnits`/`hotbar`/`teamPresets`. Mark trial `PlotUnitState` entries with `isTrial?: boolean` so `PlotUnitsDomain` & `PlotInspectUi` enforce read-only restrictions and `GameStateSave` skips `discovered` auto-registration for trial-only copies. Surface the Trial icon below `renderAudioControlsHtml` in `HudChromeRenderer` and the selector modal in `src/ui/TwinTrialModalUi.ts`.

**Tech Stack:** TypeScript (strict, no `any`), Tailwind CSS v4 (Sticker-Pop Deluxe theme), Vitest, Vite.

**Spec:** [docs/superpowers/specs/2026-11-23-twin-trial-system-design.md](file:///c:/Users/HDD/Documents/my_chibi_mine/docs/superpowers/specs/2026-11-23-twin-trial-system-design.md)

## Global Constraints
- `TWIN_TRIAL_DURATION_MS = 20 * 60 * 1000` (20 minutes, real-time `expiresAt` timestamp).
- Unlocks (`'locked' -> 'available'`) on both tutorial `Claim` and `Skip`, plus startup if `mam_tutorial_done_v1 === '1'`.
- Claimed trial Twin does NOT register in `discovered` (Index), cannot be upgraded (DMG/SPD/CRIT), cannot equip Pickaxe or Enchant, cannot roll Mutation, cannot Star-Up, and cannot be sold.
- Trial icon appears directly beneath the top-right Audio control button when `'available'` or `'active'`, and disappears permanently when `'locked'` or `'expired'`.
- Strict TypeScript (no `any`), no circular imports against `GameState`, verify with `npm.cmd test`, `npm.cmd run build`, and update `GAME_MAP.md`.

## Review Focus
1. **Permanent + Trial coexistence:** Buying or winning a permanent copy of the same Twin Chibi during an active 20m trial must keep the permanent copy, its Index `discovered` state, and its slot intact when the trial expires.
2. **Offline / reload expiry:** Loading a save after `nowMs >= expiresAt` must purge the expired trial unit from `miners`, `plotMiners`, `plotUnits`, `stashedUnits`, `hotbar`, and `teamPresets` without ever adding it to `discovered`.
3. **`equipBestUnitsToPlots` & plot swapping:** Re-equipping or swapping plots must preserve `isTrial: true` on the trial unit (and rank/assign permanent copies ahead of the trial copy).
4. **Live expiry during active UI inspection:** Expiring while `activeModal === 'twin-trial'` or `inspectedSlot` points to the expired trial slot must close the modal/inspector, re-sync 3D plots, and avoid stale DOM.
5. **Compact HUD spacing (`< 920px`):** Showing the Trial button beneath the Audio icon must shift the compact currency rail downward so it never overlaps on narrow screens.

---

### Task 1: `TwinTrialDomain.ts` & `GameStateSave.ts` Persistence

**Files:**
- Create: `src/game/TwinTrialDomain.ts`
- Modify: `src/game/GameStateSave.ts:71-188,495-510,600-663`
- Test: `tests/state-modules.test.ts`

**Interfaces:**
- Produces in `src/game/TwinTrialDomain.ts`:
  - `TWIN_TRIAL_DURATION_MS = 20 * 60 * 1000`
  - `TwinTrialStatus = 'locked' | 'available' | 'active' | 'expired'`
  - `TwinTrialState = { status: TwinTrialStatus; chibiId: string | null; startedAt: number; expiresAt: number }`
  - `createInitialTwinTrialState(): TwinTrialState`
  - `getTrialOwnedCount(twinTrial: TwinTrialState, chibiId: string): number`
  - `getPermanentMinerCount(miners: Readonly<Record<string, number>>, twinTrial: TwinTrialState, chibiId: string): number`
  - `getTwinTrialRemainingSec(twinTrial: TwinTrialState, nowMs?: number): number`
  - `unlockTwinTrialDomain(ctx: TwinTrialContext): boolean`
  - `claimTwinTrialDomain(ctx: TwinTrialContext, chibiId: string, nowMs?: number): boolean`
  - `syncTwinTrialDomain(ctx: TwinTrialContext, nowMs?: number): { expired: boolean; chibiId: string | null }`
- Produces in `src/game/GameStateSave.ts`:
  - `PlotUnitState.isTrial?: boolean`
  - `SavePayload.twinTrial?: TwinTrialState`
  - `SaveableGameState.twinTrial: TwinTrialState`

- [ ] **Step 1: Write failing tests in `tests/state-modules.test.ts`**
  Add a `describe('TwinTrialDomain', ...)` block testing:
  1. `unlockTwinTrialDomain` transitions `'locked' -> 'available'` once and returns `false` if already `'available' | 'active' | 'expired'`.
  2. `claimTwinTrialDomain` rejects non-twin IDs, rejects when `'locked'` or `'expired'`, grants `1` copy to `miners[chibiId]` + first empty `hotbar` slot, sets `expiresAt = nowMs + 1_200_000`, and leaves `discovered` untouched.
  3. `syncTwinTrialDomain` purges the trial unit when `nowMs >= expiresAt` from `miners`, `plotMiners`/`plotUnits` (returning any defensive `pickaxeId` to `ownedPickaxes`), `stashedUnits`, `hotbar`, and `teamPresets`, sets `status = 'expired'`, and returns `{ expired: true, chibiId }`.
  4. Permanent + trial coexistence: if `miners[id] === 2` (1 permanent + 1 trial) and `plotUnits` has 1 non-trial + 1 `isTrial` unit, `syncTwinTrialDomain` at expiry decrements `miners[id]` to `1`, removes only the `isTrial` plot slot, and keeps `hotbar`, `teamPresets`, and permanent slot intact.
  5. `serializeSavePayload` + `deserializeSaveJson` / `loadFromLocalStorage`: reloading an expired trial save purges the trial unit and does NOT add `chibiId` to `discovered`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/state-modules.test.ts -t "TwinTrialDomain"`
  Expected: FAIL (`TwinTrialDomain` module not found).

- [ ] **Step 3: Implement `src/game/TwinTrialDomain.ts` and update `src/game/GameStateSave.ts`**
  - Create `src/game/TwinTrialDomain.ts` with `TwinTrialContext` (`twinTrial`, `miners`, `hotbar`, `selectedHotbarSlot`, `plotMiners`, `plotUnits`, `stashedUnits`, `ownedPickaxes`, `teamPresets`) and all pure helpers above. Ensure `syncTwinTrialDomain` handles `selectedHotbarSlot` reset if pointing to a cleared hotbar slot, compacts nothing unrequested (`hotbar[i] = null`), and cleanly filters `isTrial` from `stashedUnits`.
  - Update `src/game/GameStateSave.ts`: add `isTrial?: boolean` to `PlotUnitState`, `twinTrial?: TwinTrialState` to `SavePayload`, `twinTrial: TwinTrialState` to `SaveableGameState`, serialize & deserialize `twinTrial` with validation (`isPremiumShopChibi` check when `'active'`/`'expired'`), sanitize `isTrial` boolean on `plotUnits` & `stashedUnits`, run `syncTwinTrialDomain` on load before auto-discover, and guard lines `495-509` so `trialOwnedCount` alone never triggers `state.discovered.add(id)`.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run tests/state-modules.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/game/TwinTrialDomain.ts src/game/GameStateSave.ts tests/state-modules.test.ts
  git commit -m "feat(trial): add TwinTrialDomain and save persistence with expiry cleanup"
  ```

---

### Task 2: `PlotUnitsDomain.ts` Read-Only Guards & `GameState.ts` Integration

**Files:**
- Modify: `src/game/PlotUnitsDomain.ts:87-111,180-262,512-576,630-849`
- Modify: `src/game/GameState.ts:18-138,240-360,940-992`
- Test: `tests/state-modules.test.ts`

**Interfaces:**
- Consumes from Task 1: `TwinTrialState`, `getPermanentMinerCount`, `getTrialOwnedCount`, `unlockTwinTrialDomain`, `claimTwinTrialDomain`, `syncTwinTrialDomain`, `getTwinTrialRemainingSec`, `createInitialTwinTrialState`.
- Produces on `PlotUnitsContext`: optional `twinTrial?: TwinTrialState`.
- Produces on `GameState`:
  - `public twinTrial: TwinTrialState`
  - `public isTwinTrialVisible(nowMs?: number): boolean`
  - `public isTwinTrialActive(nowMs?: number): boolean`
  - `public getTwinTrialRemainingSec(nowMs?: number): number`
  - `public isTrialPlotSlot(slotIndex: number): boolean`
  - `public isTrialOnlyChibi(chibiId: string): boolean`
  - `public unlockTwinTrial(): boolean`
  - `public claimTwinTrial(chibiId: string, nowMs?: number): boolean`
  - `public syncTwinTrial(nowMs?: number): { expired: boolean; chibiId: string | null }`

- [ ] **Step 1: Write failing tests in `tests/state-modules.test.ts`**
  Add tests verifying:
  1. When `claimTwinTrial('yukikage-twins')` is active and placed on Plot 0: `plotUnits[0]?.isTrial === true`, `upgradeUnitDamage`, `upgradeUnitSpeed`, `upgradeUnitMiningSpeed`, `buyOrEquipUnitPickaxe`, `rollUnitMutation`, and `toggleUnitEnchant` all return `false`/`null`/`'locked'` without spending Cash/Gems/Pickaxes/Enchants.
  2. `starUpUnit` and `autoStarUpAllUnits` do not consume or count the trial copy (e.g. `1` permanent + `1` trial has `0` spare dupes; `starUpUnit` returns `{ ok: false, reason: 'insufficient' }`).
  3. `equipBestUnitsToPlots` preserves `isTrial: true` on the trial unit (and places permanent copies before any `isTrial` copy when both exist).
  4. `GameState` exposes `unlockTwinTrial`, `claimTwinTrial`, `syncTwinTrial`, `isTrialPlotSlot`, `isTrialOnlyChibi`, and `getTwinTrialRemainingSec`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/state-modules.test.ts -t "read-only trial"`
  Expected: FAIL.

- [ ] **Step 3: Update `src/game/PlotUnitsDomain.ts` and `src/game/GameState.ts`**
  - In `PlotUnitsDomain.ts`:
    - Add `twinTrial?: TwinTrialState` to `PlotUnitsContext`.
    - Helper `isTrialUnit(u)` (`Boolean(u?.isTrial)`).
    - In `getSpareChibiDuplicateCount(ctx, chibiId)`: compute `totalOwned` via `ctx.twinTrial ? getPermanentMinerCount(ctx.miners, ctx.twinTrial, chibiId) : (ctx.miners[chibiId] || 0)` so trial copies never count toward `starUpUnit` or `autoStarUpAllUnits`.
    - In `equipChibiOnPlotSlot` and `equipBestUnitsToPlots`: track permanent vs trial copies (`permCount`), assign permanent copies first (`isTrial` omitted/false), and mark the trial copy with `isTrial: true` (and in `trimStashedUnits`, discard `isTrial` entries before permanent stashed units).
    - Block `upgradeUnitDamage`, `upgradeUnitSpeed`, `upgradeUnitMiningSpeed`, `buyOrEquipUnitPickaxe`, `rollUnitMutation`, and `toggleUnitEnchant` early when `unit.isTrial` is `true`.
    - Note in `stashPlotUnit`: if `unit.isTrial` is true and un-upgraded, it simply isn't stashed (same as default).
  - In `GameState.ts`:
    - Add `public twinTrial: TwinTrialState = createInitialTwinTrialState();` and wire `syncTwinTrial()` in constructor after `this.load()`.
    - Add `isTwinTrialVisible`, `isTwinTrialActive`, `getTwinTrialRemainingSec`, `isTrialPlotSlot`, `isTrialOnlyChibi`, `unlockTwinTrial`, `claimTwinTrial`, and `syncTwinTrial` delegators (emitting & saving on state change).

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run tests/state-modules.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/game/PlotUnitsDomain.ts src/game/GameState.ts tests/state-modules.test.ts
  git commit -m "feat(trial): enforce read-only trial unit guards in PlotUnitsDomain and GameState"
  ```

---

### Task 3: `TwinTrialModalUi.ts` & HUD Chrome Button Below Audio Icon

**Files:**
- Create: `src/ui/TwinTrialModalUi.ts`
- Modify: `src/ui/HudShared.ts:26-48,295-360` (add `'twin-trial'` to `ModalKind` & `MODAL_THEME_CONFIG`)
- Modify: `src/ui/HudChromeRenderer.ts:19-167,405-445` (add Trial button directly below Audio button + `data-hud-trial` compact spacing)
- Modify: `src/ui/HudActionRouter.ts:34-49,101-165,246-285` (modal route, `'open-twin-trial'` action, 1s timer & expiry handling)
- Modify: `src/ui/GameHud.ts:67-268,709-745,830-860` (`twinTrialUi` instance, `data-hud-trial` attr, tutorial complete unlock)
- Modify: `src/main.ts` (startup retroactive unlock if `TutorialUi.isDone()` and on `onTutorialComplete`)
- Test: `tests/hud-modules.test.ts`

**Interfaces:**
- Produces in `src/ui/TwinTrialModalUi.ts`:
  - `export class TwinTrialModalUi` with `constructor(state, pushToast, onClaimSuccess, onRender)`
  - `public renderModal(): string`
  - `public bindEvents(root: HTMLElement): void`
- Produces in `src/ui/HudChromeRenderer.ts`:
  - `renderAudioControlsHtml` accepts optional `twinTrial?: { visible: boolean; active: boolean; remainingSec: number }` and renders `[data-action="open-twin-trial"]` with `[data-twin-trial-timer="true"]` directly beneath the audio row inside a `flex flex-col items-end gap-1.5` container.
  - `renderCurrencyRailHtml` accepts optional `trialBelowAudio?: boolean` (or `data-hud-trial="true"` on root) so compact mode (`< 920px`) offsets `top-[128px]` when the Trial button is visible.

- [ ] **Step 1: Write failing tests in `tests/hud-modules.test.ts`**
  Add tests verifying:
  1. `renderAudioControlsHtml` renders `[data-action="open-twin-trial"]` directly below the audio controls when `twinTrial.visible` is `true` (showing `"FREE"` when `!active` and formatted `mm:ss` when `active`), and omits it completely when `visible` is `false`.
  2. `TwinTrialModalUi.renderModal()` renders all 5 Twin Chibis from `PREMIUM_SHOP_ITEMS`, shows effective world-capped DPS and passive bonuses, and clicking `Claim 20m Trial` invokes `state.claimTwinTrial(chibiId)`.
  3. Calling `stepHudSlowTick` when `twinTrial` expires closes `twin-trial` modal (or clears `inspectedSlot` if inspecting the trial unit), calls `onSyncPlots`, triggers `render()`, and pushes an expiry toast.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/hud-modules.test.ts -t "TwinTrial"`
  Expected: FAIL.

- [ ] **Step 3: Implement `TwinTrialModalUi.ts` and wire HUD/Router/Tutorial/Main**
  - Create `src/ui/TwinTrialModalUi.ts` using `renderModalShell` (`themeId: 'premium-shop'`, `title: 'Twin Tier Free Trial'`), 5 Twin cards (`yukikage-twins`..`clockwork-twins`) with `chibiPortraitHtml`, `renderRarityBadgeHtml('twin')`, effective DPS, and `renderInspectorPanel` showing passives + `"Read-Only 20:00 Trial (No Upgrades, Gear, or Index)"` + `"Claim 20m Trial"` CTA (or live `[data-twin-trial-modal-timer]` countdown if `'active'`).
  - Add `'twin-trial'` to `ModalKind` and `MODAL_THEME_CONFIG` in `src/ui/HudShared.ts`.
  - Update `renderAudioControlsHtml` & `renderCurrencyRailHtml` in `src/ui/HudChromeRenderer.ts` to stack the Trial button directly below the Audio button, plus compact viewport offset `[[data-hud-compact=true][data-hud-trial=true]_&]:top-[128px]`.
  - Update `src/ui/HudActionRouter.ts`: route `'twin-trial'`, bind `'open-twin-trial'`, and in `stepHudSlowTick` call `state.syncTwinTrial()`, update `[data-twin-trial-timer]` / `[data-twin-trial-modal-timer]` DOM text live, and on `{ expired: true }` close `'twin-trial'` modal / clear trial `inspectedSlot`, call `onSyncPlots`, `pushToast`, and `render()`.
  - Update `src/ui/GameHud.ts` and `src/main.ts`: pass `twinTrial` state into `renderAudioToggleBtn`, set `this.root.dataset.hudTrial`, call `this.state.unlockTwinTrial()` inside `GameHud` tutorial completion handler AND on startup in `src/main.ts` when `TutorialUi.isDone()` is true (retroactive for existing saves). Also sync `this.inspectedSlot` closure in `GameHud` slow tick when trial expires on that slot.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run tests/hud-modules.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/ui/TwinTrialModalUi.ts src/ui/HudShared.ts src/ui/HudChromeRenderer.ts src/ui/HudActionRouter.ts src/ui/GameHud.ts src/main.ts tests/hud-modules.test.ts
  git commit -m "feat(trial): add Trial button below audio controls and TwinTrialModalUi"
  ```

---

### Task 4: Trial Badges & Read-Only UI in `PlotInspectUi`, `InventoryModalUi`, & `HotbarHudUi`

**Files:**
- Modify: `src/ui/PlotInspectUi.ts:178-370,580-768`
- Modify: `src/ui/InventoryModalUi.ts:135-280`
- Modify: `src/ui/HotbarHudUi.ts:120-260`
- Test: `tests/hud-modules.test.ts`

- [ ] **Step 1: Write failing tests in `tests/hud-modules.test.ts`**
  Add tests verifying:
  1. `PlotInspectUi.render` for a trial unit slot displays the `TRIAL` read-only banner (`data-twin-trial-timer`) and disables/locks upgrade, pickaxe, mutation, and enchant actions (while keeping `Pick Up from Plot` and `Exit` functional).
  2. `InventoryModalUi` shows a `TRIAL` badge on the trial-only Twin card and disables Star-Up when no permanent dupes exist.
  3. `HotbarHudUi` displays a `TRIAL` tag on a trial-only Twin hotbar slot.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/hud-modules.test.ts -t "Trial Badges"`
  Expected: FAIL.

- [ ] **Step 3: Update `PlotInspectUi.ts`, `InventoryModalUi.ts`, and `HotbarHudUi.ts`**
  - In `PlotInspectUi.ts`: when `unit.isTrial` is `true`, render a prominent `20:00 TRIAL • READ-ONLY` pill with `[data-twin-trial-timer="true"]` in the left card, and in `renderTabContent` render a clean read-only notice card (`"Trial Chibi — Upgrades, Pickaxes, Mutations, and Enchants are locked during the 20-minute free trial."`) instead of active upgrade/gear actions (and guard click handlers against `unit.isTrial`).
  - In `InventoryModalUi.ts`: if `state.isTrialOnlyChibi(def.id)` is `true`, display a `TRIAL` badge (with remaining `mm:ss`) on the card & inspector and note `"Trial Unit • Not in Index"` on the inspector action area.
  - In `HotbarHudUi.ts`: if `state.isTrialOnlyChibi(id)` is `true`, render a small `TRIAL` badge pill on the hotbar slot.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run tests/hud-modules.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/ui/PlotInspectUi.ts src/ui/InventoryModalUi.ts src/ui/HotbarHudUi.ts tests/hud-modules.test.ts
  git commit -m "feat(trial): show trial badges and read-only PlotInspectUi state"
  ```

---

### Task 5: Full Verification, Browser Smoke Test & `GAME_MAP.md` Update

**Files:**
- Modify: `GAME_MAP.md`

- [ ] **Step 1: Run full Vitest suite and production build**
  Run: `npm.cmd test && npm.cmd run build`
  Expected: All Vitest specs pass (`0` failures), `tsc --noEmit` & `vite build` succeed with `0` errors.

- [ ] **Step 2: Browser smoke test (tutorial finish/skip -> Trial icon below audio -> Twin Trial modal -> claim -> place on plot -> read-only inspector)**
  Start Vite dev server (`npm.cmd run dev`), verify via browser subagent (no console errors, Trial button visible below audio icon after tutorial complete/skip, modal claims 1 Twin, countdown ticks, Plot inspector shows read-only trial state).

- [ ] **Step 3: Update `GAME_MAP.md` with new files, updated line counts, and lookup entries**
  Measure line counts with PowerShell (`Get-Content ... | Measure-Object -Line`), update `GAME_MAP.md` table rows for `TwinTrialDomain.ts`, `TwinTrialModalUi.ts`, and modified files + `Quick Target Lookup`.

- [ ] **Step 4: Final commit**
  ```bash
  git add GAME_MAP.md
  git commit -m "docs: update GAME_MAP.md for Twin Trial system"
  ```
