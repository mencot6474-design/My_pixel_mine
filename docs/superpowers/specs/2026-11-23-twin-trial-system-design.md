# Post-Tutorial Twin Tier Chibi Trial System — Design Spec

**Date:** 2026-11-23
**Status:** Approved

## Intent & Why
Give players who finish or skip the FTUE tutorial an immediate taste of an endgame **Twin Tier** Chibi (`Yukikage Twins`, `Halcyon Twins`, `Nocturne Twins`, `Lullaby Twins`, or `Clockwork Twins`) for **20 minutes**, surfaced via a dedicated **Trial** icon directly beneath the top-right Audio icon. Players can experience the Twin's 3D Sakuga VFX, back attachments, and team passives right away without permanently unlocking Index progress, wasting upgrade resources on a temporary unit, or breaking World progression (since Twin base DPS is already capped by `getEffectiveChibiBaseDps`).

## Goals
- Unlock the Twin Trial (`status: 'available'`) as soon as the tutorial ends — both on **Claim & Start Playing!** and on **Skip** (plus retroactive unlock on startup for existing saves where `mam_tutorial_done_v1 === '1'` and no trial has been claimed/expired yet).
- Render a **Trial** button directly beneath the top-right Audio control button (`renderAudioControlsHtml` in `HudChromeRenderer.ts`), showing a `"FREE"` badge when `'available'` and a live `mm:ss` countdown when `'active'`, and **completely disappearing** once `'expired'` (or before tutorial completion).
- Provide a **Twin Trial Modal** (`TwinTrialModalUi.ts`, theme `premium-shop`) letting the player pick and claim **1 of the 5 Twin Chibis** (`PREMIUM_SHOP_ITEMS`) for a 20-minute (`20 * 60 * 1000 ms`) real-time trial (`expiresAt`).
- Place the claimed Twin into `miners` (`+1`) and the first empty `hotbar` slot (if available) so it works across Backpack, Hotbar, Mine Plots (3D + Sakuga VFX), Tower, and Omega.
- Treat the trial copy as **Read-Only** (`PlotUnitState.isTrial = true`): no DMG/SPD/CRIT upgrades, no Pickaxe equipping, no Enchant equipping, no Mutation rolling, no Star-Up, no selling, and **never registered in Index (`discovered`)**.
- Automatically expire the trial at `nowMs >= expiresAt` (both live via 1s HUD tick and on save load): remove the trial unit from `plotMiners`/`plotUnits`, `stashedUnits`, `hotbar`, `miners`, and `teamPresets` (defensively returning any pickaxe if ever attached), close any open trial inspector/modal, sync 3D plots, hide the Trial icon, and notify the player via toast.

## Non-Goals
- No Pickaxe/Enchant/Cash/Gem upgrades on the temporary trial unit (prevents players from sinking resources into a 20-minute unit; defensive return logic is still kept in expiry cleanup).
- No Index (`discovered`) credit or Index milestone rewards from claiming/using a trial Twin.
- No repeatable or multi-claim trial after the single 20-minute trial expires.

## Approaches Considered
1. **Approach A — Full Normal Unit + Trial Guards (Rejected):** Allows Cash/Gem upgrades, Pickaxes, Enchants, and Mutations on the trial unit and refunds/returns gear on expiry. Rejected because upgrading a 20-minute temporary unit wastes player Cash/Gems and adds unnecessary complexity for a short showcase.
2. **Approach B — Virtual/Isolated Trial Slot (Rejected):** Stores the trial unit completely outside `miners`/`hotbar`/`plotUnits` and injects it virtually everywhere. Rejected because too many UI, combat, and 3D systems read `miners` and `plotUnits` directly.
3. **Approach C — Dedicated `twinTrial` State + Read-Only Trial Unit (Chosen):** Stores `twinTrial` metadata in `GameState` & `SavePayload`, grants 1 `miners` entry marked read-only (`isTrial: true` on `PlotUnitState`), blocks Index registration, upgrades, gear, and Star-Up, and cleanly removes the unit + Trial icon when `expiresAt` passes.

## Architecture & Behavior Details

### 1. Data & Domain (`src/game/TwinTrialDomain.ts`, `GameStateSave.ts`, `GameState.ts`)
- **`TWIN_TRIAL_DURATION_MS = 20 * 60 * 1000`** (20 minutes, real-time `expiresAt` timestamp consistent with Weather & Potion timers).
- **`TwinTrialStatus = 'locked' | 'available' | 'active' | 'expired'`**.
- **`TwinTrialState`**: `{ status: TwinTrialStatus; chibiId: string | null; startedAt: number; expiresAt: number }`, persisted on `SavePayload.twinTrial` and `SaveableGameState.twinTrial`.
- **Unlock trigger (`unlockTwinTrialDomain`)**: transitions `'locked' -> 'available'` idempotently. Triggered on `TutorialUi` completion (`Claim` or `Skip`) and on startup if `TutorialUi.isDone()` is already true.
- **Claim (`claimTwinTrialDomain(ctx, chibiId, nowMs)`)**:
  - Allowed only when `status === 'available'` and `isPremiumShopChibi(chibiId)`.
  - Sets `status = 'active'`, `chibiId`, `startedAt = nowMs`, `expiresAt = nowMs + TWIN_TRIAL_DURATION_MS`.
  - Increments `miners[chibiId]` by `1` and inserts `chibiId` into the first empty `hotbar` slot if not already present. Does **not** call `discovered.add(chibiId)`.
- **Permanent vs. Trial copy accounting**:
  - `getTrialOwnedCount(state, chibiId)` = `1` when `twinTrial.status === 'active' && twinTrial.chibiId === chibiId`, else `0`.
  - `getPermanentMinerCount(state, chibiId)` = `Math.max(0, (miners[chibiId] || 0) - getTrialOwnedCount(state, chibiId))`.
  - On `loadFromLocalStorage`, skip auto-adding `id` to `discovered` unless `getPermanentMinerCount(state, id) > 0` (or already in saved `discovered`).
- **Read-Only Trial PlotUnit (`PlotUnitState.isTrial?: boolean`)**:
  - In `equipChibiOnPlotSlot` & `equipBestUnitsToPlots`: if the number of non-trial placed instances of `chibiId` already meets `getPermanentMinerCount`, the newly placed/popped `PlotUnitState` gets `isTrial = true` (and `equipBestUnitsToPlots` always puts permanent copies ahead of the trial copy).
  - In `PlotUnitsDomain`: `upgradeUnitDamage`, `upgradeUnitSpeed`, `upgradeUnitMiningSpeed`, `buyOrEquipUnitPickaxe`, `rollUnitMutation`, `toggleUnitEnchant` return `false`/`null`/`'locked'` when `unit.isTrial === true`. `starUpUnit` checks `getPermanentMinerCount` so the trial copy cannot be spent or counted toward Star-Up.
- **Expiry (`syncTwinTrialDomain(ctx, nowMs)`)**:
  - If `status === 'active'` and `nowMs >= expiresAt`:
    - Transitions `status = 'expired'`.
    - Decrements `miners[chibiId]` by `1` (deletes key if `<= 0`).
    - Removes the trial `PlotUnitState` (`unit.isTrial === true`, or last matching slot if permanent count is `0`) from `plotMiners`/`plotUnits` (defensively returning any `pickaxeId` to `ownedPickaxes`).
    - Trims `stashedUnits[chibiId]` (`isTrial` entries removed first via `trimStashedUnits`).
    - If remaining `miners[chibiId] <= 0`: removes `chibiId` from `hotbar` and `teamPresets` (note: non-empty check remains clean).
    - Returns `{ expired: true, chibiId }` so UI/3D can refresh plots, close `twin-trial` modal or trial `inspectedSlot`, and push a toast.

### 2. HUD, Trial Modal & UI Badges (`src/ui/`)
- **Trial Icon under Audio (`HudChromeRenderer.ts`)**:
  - Wrap top-right audio controls (`renderAudioControlsHtml`) in a right-aligned column (`flex flex-col items-end gap-1.5`) so when `twinTrial` is `'available'` or `'active'`, the **Trial button** sits directly underneath the Audio icon.
  - Visual: Sticker-Pop Deluxe square/pill button (`border-[2.5px] border-[#14111d]`, Twin gradient accent `#e0f2fe`/`#bae6fd`) with Twin star/crest icon + `"TRIAL"` badge (`'available'`) or live `mm:ss` timer (`'active'`, updated smoothly via `[data-twin-trial-timer]` in slow tick without full re-render). Disappears completely when `'locked'` or `'expired'`.
  - Compact viewport safety (`data-hud-compact="true"`): shift the compact currency rail downward (`top-[128px]`) whenever the Trial button is visible so it never overlaps.
- **Twin Trial Modal (`TwinTrialModalUi.ts`, `ModalKind = 'twin-trial'`)**:
  - Uses `renderModalShell` (`themeId: 'premium-shop'`, `title: 'Twin Tier Free Trial'`, `subtitle: 'Pick 1 of 5 Twin Chibis • 20:00 Active Showcase'`).
  - Left/main grid: 5 Twin cards (`Yukikage Twins`..`Clockwork Twins`) with `chibiPortraitHtml`, `renderRarityBadgeHtml('twin')`, title tag, and effective Base DPS (`getEffectiveChibiBaseDps` capped to player's unlocked World).
  - Right inspector (`renderInspectorPanel`): selected Twin preview, passive bonuses (`teamDmgPct`, `oreDropPct`, `oreSellPct`), clear read-only rule callout (`"20:00 Free Trial • Read-Only (No Upgrades/Gear/Index)"`), and primary CTA **"Claim 20m Trial"** (when `'available'`) or live countdown + **"Currently Active"** status (when `'active'`).
- **Trial Badges in Existing UI**:
  - `InventoryModalUi.ts` & `HotbarHudUi.ts`: show a crisp `TRIAL` / `mm:ss` tag on the trial Twin card/slot when `getPermanentMinerCount === 0` (or on the trial entry).
  - `PlotInspectUi.ts`: when inspecting a slot where `unit.isTrial === true`, display a prominent `20:00 Trial (Read-Only)` banner with live `mm:ss` countdown and disable/hide Upgrade, Pickaxe, Mutation, Enchant, and Star-Up controls (keeping `Remove` available).

### 3. Verification
- Unit tests in `tests/state-modules.test.ts` covering: unlock on tutorial complete/skip, claim grants 1 unit without `discovered`, read-only guards (upgrades/pickaxe/enchant/mutation/star-up blocked), permanent + trial coexistence (buying permanent Twin during trial keeps permanent copy & Index on expiry), and expiry cleanup from `plotUnits`/`plotMiners`/`stashedUnits`/`hotbar`/`teamPresets` + defensive gear return.
- Unit tests in `tests/hud-modules.test.ts` covering: Trial button placement below audio controls, hiding on `'locked'`/`'expired'`, `TwinTrialModalUi` rendering & claim flow, and `PlotInspectUi` read-only state for trial units.
- Run `npm.cmd test`, `npm.cmd run build`, browser smoke test, and update `GAME_MAP.md`.
