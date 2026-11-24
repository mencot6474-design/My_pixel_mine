# Rift Boss Battle (30s DPS Check & Tier 1–10 Meter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3×3 Rift Breach minigame with a 30-second 3D Dimensional Rift Boss Battle that measures cumulative squad + tap damage against a global Tier 1–10 ladder (`1` Rift Shard per Tier, `3` attempts per 15-minute window).

**Architecture:** Pure game rules, Tier 1–10 thresholds, dual-bucket attempt quotas, and battle state live in `AnomalyData.ts` and `RiftDomain.ts` (wired through `GameState.ts` and `GameStateSave.ts`). A dedicated `RiftArena3D.ts` (`sceneMode: 'rift'`) reuses `CyberShowcasePodium`, `SpotlightAttackQueue`, `TierAttackVfxPool3D`, `SignatureProjectilePool3D`, and `AttackImpactFxController` in a Dimensional Void arena, driven by `HudRiftBridge.ts` and `RiftArenaHudUi.ts` while `RiftModalUi.ts` serves as the Rift Hub & Tier preview.

**Tech Stack:** TypeScript (strict), Three.js, Vite, Tailwind CSS v4, Vitest

**Spec:** `docs/superpowers/specs/2026-11-25-rift-boss-battle-design.md`

## Global Constraints

- Strict TypeScript (`no any`), `dt <= 0.1` clamp, `InstancedMesh` for repeated props, `SRGBColorSpace` for canvas textures, complete `.dispose()`, zero gyroscopic/armillary rings (`.agent/rules/threejs-ts-standards.md`).
- Sticker-Pop Deluxe UI (`#fff8e7` warm cream, `#14111d` ink borders, `tabular-nums`, zero outer drop shadows, Tailwind v4 / `TW_*` constants, `.agent/skills/ui-hud-design/SKILL.md`).
- Keep new modules cleanly scoped and under 1,000 lines; keep all domain rules pure and testable in Vitest without WebGL/DOM.
- All Rift Shards strictly equal `tierReached` (`0` for Tier 0, `1..10` for Tier 1..10); `RIFT_BATTLE_DURATION_SEC = 30`; `RIFT_MAX_ATTEMPTS_PER_WINDOW = 3`.
- Verify every task via `npm.cmd test` and final build via `npm.cmd run build`; sync `GAME_MAP.md` at completion.

## Review Focus

- **Force Open (`500K` Gems) bought at `:05` after exhausting 3 hourly attempts and crossing `:15`**: Pass attempts must remain at their exact remaining count after `:15` instead of resetting to 3.
- **Force Open (`500K` Gems) bought at `:55` and crossing `:00`**: Player must receive 3 fresh hourly attempts at `:00` while unspent pass attempts stay tracked under the pass bucket until `riftPassExpiresAt`.
- **`overclock-surge` with `chargeSec` DPS-integration**: `applyRiftSquadStrikeDomain` must apply the `1.3×` multiplier so faster cadence translates into actual `+30%` DPS instead of cancelling out.
- **Mid-battle Retreat or Window Expiry during 30s fight**: Retreating or having the 15-minute window close mid-fight must still settle and award Rift Shards for the Tier already reached without refunding the consumed attempt.
- **Empty Squad / Zero Attempts guard & Save Reload**: Reloading mid-battle or after 3 attempts must not restore spent attempts, and entering without at least 1 deployed Chibi on plots must fail cleanly.

---

### Task 1: Rift Tier 1–10 Ladder, Boss Rotation & Combat Anomaly Definitions

**Files:**
- Modify: `src/game/AnomalyData.ts`
- Test: `tests/state-modules.test.ts`

**Interfaces:**
- Produces:
  - `RIFT_BATTLE_DURATION_SEC = 30`, `RIFT_MAX_ATTEMPTS_PER_WINDOW = 3`
  - `export interface RiftTierDef { readonly tier: number; readonly worldLabel: string; readonly damageTarget: number; readonly shards: number; readonly dropChance: number; }`
  - `export const RIFT_TIER_DEFS: readonly RiftTierDef[]` (10 entries: `5_000`..`5e31`, `shards: 1..10`, `dropChance: 0.02..0.12`)
  - `export interface RiftTierProgress { tier: number; currentTarget: number; nextTarget: number | null; progressPct: number; shards: number; dropChance: number; }`
  - `export function getRiftTierProgress(damage: number): RiftTierProgress`
  - `export function getRiftHourlyBossId(hourIndex: number): AnomalyChibiId`
  - Updated combat-oriented `RIFT_ANOMALIES` summaries

- [ ] **Step 1: Write failing tests for Tier 1–10 thresholds, progress math, and boss rotation**

Add assertions in `tests/state-modules.test.ts` verifying `RIFT_TIER_DEFS` has 10 tiers (`tier === shards` from `1..10`, `damageTarget` from `5_000` to `5e31`), `getRiftTierProgress(0)` returns `tier: 0, shards: 0, nextTarget: 5_000`, `getRiftTierProgress(5_000)` returns `tier: 1, shards: 1`, `getRiftTierProgress(5e13)` returns `tier: 4, shards: 4`, `getRiftTierProgress(5e31)` returns `tier: 10, shards: 10, nextTarget: null, progressPct: 100`, and `getRiftHourlyBossId(0) !== getRiftHourlyBossId(1)`.

- [ ] **Step 2: Run targeted Vitest test to confirm failure**

Run: `npx.cmd vitest run tests/state-modules.test.ts -t "Rift"`
Expected: FAIL (`RIFT_TIER_DEFS` / `getRiftTierProgress` not exported).

- [ ] **Step 3: Implement Tier 1–10 ladder, helpers, and updated combat `RIFT_ANOMALIES` in `src/game/AnomalyData.ts`**

Add `RIFT_BATTLE_DURATION_SEC`, `RIFT_MAX_ATTEMPTS_PER_WINDOW`, `RIFT_TIER_DEFS`, `getRiftTierProgress(damage)` (using `Math.max(0, damage)` and percentage progress between `currentTarget` and `nextTarget`), `getRiftHourlyBossId(hourIndex)`, and update `RIFT_ANOMALIES` summaries to describe the 30s boss battle modifiers (`hyper-crit`, `meteor-storm`, `overclock-surge`, `mirror-echo`).

- [ ] **Step 4: Run tests to verify pass**

Run: `npx.cmd vitest run tests/state-modules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/AnomalyData.ts tests/state-modules.test.ts
git commit -m "feat(rift): add Tier 1-10 damage ladder and combat anomaly definitions"
```

---

### Task 2: Rift Battle State Machine, Dual-Bucket 3-Attempt Quota & Save Persistence

**Files:**
- Modify: `src/game/RiftDomain.ts`
- Modify: `src/game/GameState.ts`
- Modify: `src/game/GameStateSave.ts`
- Test: `tests/state-modules.test.ts`

**Interfaces:**
- Consumes: `RIFT_BATTLE_DURATION_SEC`, `RIFT_MAX_ATTEMPTS_PER_WINDOW`, `getRiftTierProgress`, `getRiftHourlyBossId` from `src/game/AnomalyData.ts`
- Produces in `src/game/RiftDomain.ts`:
  - `RiftBattleState`: `{ bossId: AnomalyChibiId; anomalyId: RiftAnomalyId; source: 'hourly' | 'pass'; timeRemainingSec: number; durationSec: number; damageDealt: number; currentTier: number; tapCount: number; meteorTimerSec: number }`
  - `RiftBattleSummary`: `{ bossId: AnomalyChibiId; anomalyId: RiftAnomalyId; damageDealt: number; tierReached: number; shardsEarned: number; droppedChibiId: AnomalyChibiId | null; isNewBest: boolean; attemptsRemaining: number; retreated: boolean }`
  - `RiftWindowSnapshot`: `{ isOpen: boolean; source: 'hourly' | 'pass' | 'closed'; activeBucket: 'hourly' | 'pass' | 'none'; remainingSec: number; nextOpenSec: number; attemptsRemaining: number; maxAttempts: number; bossId: AnomalyChibiId; anomaly: RiftAnomalyDef }`
  - `getRiftWindowSnapshot(nowMs, riftPassExpiresAt, quota?)`
  - `buyRiftPassDomain(ctx, nowMs?, onSave?) -> 'bought' | 'no_gems' | 'already_has_attempts'`
  - `startRiftBattleDomain(ctx, nowMs?, onSave?) -> boolean`
  - `applyRiftSquadStrikeDomain(ctx, slotIndex, attackInterval, isUltimate?, rng?) -> { dmgDealt: number; isCrit: boolean; newTier: number; tierUp: boolean }`
  - `applyRiftTapDamageDomain(ctx, baseTapDmg, baseCritChance, baseCritMult, rng?) -> { dmgDealt: number; isCrit: boolean; newTier: number; tierUp: boolean }`
  - `stepRiftBattleTickDomain(ctx, dtSec, totalSquadDps, nowMs?, rng?, onSave?) -> { meteorDmg: number; finished: boolean; summary: RiftBattleSummary | null; tierUp: boolean }`
  - `retreatRiftBattleDomain(ctx, nowMs?, rng?, onSave?) -> RiftBattleSummary | null`
- Produces in `src/game/GameState.ts` & `src/game/GameStateSave.ts`:
  - Persisted fields: `riftHourlyKey`, `riftHourlyAttemptsUsed`, `riftPassAttemptsUsed`, `riftBestDamage`, `riftBestTier`
  - Transient fields on `GameState`: `riftBattle: RiftBattleState | null`, `riftLastSummary: RiftBattleSummary | null`
  - Delegator methods on `GameState`: `getRiftWindowSnapshot`, `buyRiftPass`, `startRiftBattle`, `applyRiftSquadStrike`, `applyRiftTapDamage`, `stepRiftBattleTick`, `retreatRiftBattle`, `clearRiftSummary`, `getRiftSquadEffectiveDps`

- [ ] **Step 1: Write failing tests for dual-bucket quota, `:05`/`:15` & `:55`/`:00` edge cases, 30s battle tick, anomalies, retreat, and save persistence**

In `tests/state-modules.test.ts`, add specs covering:
1. Hourly window gives 3 attempts; starting 3 battles decrements `attemptsRemaining` to `0` and 4th `startRiftBattle` returns `false`; empty plot squad returns `false`.
2. Force Open (`buyRiftPass`) when `attemptsRemaining === 0` at `:05` opens `'pass'` bucket (`3` attempts); crossing `:15` preserves exact remaining pass attempts (`no double grant`); buying at `:55` and crossing `:00` grants 3 fresh hourly attempts while keeping unused pass attempts separate.
3. `applyRiftSquadStrike` applies `1.3×` DPS under `overclock-surge`, `+25%` crit / `1.5×` crit mult under `hyper-crit`, and `×1.35` when `isUltimate === true` under `mirror-echo`.
4. `stepRiftBattleTick` triggers `meteor-storm` every `4s` (`4 * totalSquadDps`) and finishes at `30s`, awarding exact `shardsEarned === tierReached` (`4` shards at Tier 4), updating `riftBestDamage`/`riftBestTier`, and rolling drop chance.
5. `retreatRiftBattle` settles Tier reached so far without refunding the attempt.
6. `serializeSavePayload` / `deserializeSaveJson` round-trips `riftHourlyKey`, `riftHourlyAttemptsUsed`, `riftPassAttemptsUsed`, `riftBestDamage`, `riftBestTier`.

- [ ] **Step 2: Run targeted Vitest tests to verify failure**

Run: `npx.cmd vitest run tests/state-modules.test.ts -t "Rift"`
Expected: FAIL.

- [ ] **Step 3: Implement `RiftDomain.ts`, update `GameStateSave.ts` and `GameState.ts`**

Implement dual-bucket snapshot resolution, attempt deduction on `startRiftBattleDomain`, combat strike/tap/meteor/finish/retreat handlers in `src/game/RiftDomain.ts`, persist the 5 new Rift fields cleanly in `src/game/GameStateSave.ts`, and expose delegators on `src/game/GameState.ts` (preserving `redeemAnomalyChibi` and keeping any legacy `claimRiftBreachReward` compatibility or replacing unused breach calls cleanly after updating tests).

- [ ] **Step 4: Run `tests/state-modules.test.ts` to verify pass**

Run: `npx.cmd vitest run tests/state-modules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/RiftDomain.ts src/game/GameState.ts src/game/GameStateSave.ts tests/state-modules.test.ts
git commit -m "feat(rift): implement 30s rift boss domain, 3-attempt dual-bucket quota, and save persistence"
```

---

### Task 3: 3D Dimensional Void Arena (`RiftArena3D.ts`) & `MineScene` Wiring

**Files:**
- Create: `src/game3d/RiftArena3D.ts`
- Modify: `src/game3d/MineSceneStage3D.ts`
- Modify: `src/game3d/MineSceneInput.ts`
- Modify: `src/game3d/MineSceneProjector.ts`
- Modify: `src/game3d/MineScene3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Produces in `src/game3d/RiftArena3D.ts`:
  - `export interface RiftStrikeEvent { slotIndex: number; attackInterval: number; isUltimate: boolean; beatIndex: number; isFinisher: boolean; dmg: number; accentColor: string; screenX: number; screenY: number; }`
  - `export class RiftArena3D` with `group: THREE.Group`, `clickables: THREE.Object3D[]`, `setBossConfig(bossId: AnomalyChibiId)`, `setSurgeActive(active: boolean)`, `syncFighters(configs: (TowerFighterConfig | null)[], enchants: (string | null)[], slotStats: Map<number, ...>)`, `triggerBossHit(color?: string, isCrit?: boolean)`, `triggerTierShockwave(tier: number)`, `getFighterPlotAnchors(projVec, projectFn)`, `getBossTapScreenPosition(projVec, projectFn)`, `setLowQuality(low: boolean)`, `update(dt, elapsed, projVec, projectFn, onStrike, onUltFired?)`, `dispose()`
- Modifies `SceneMode` in `src/game3d/MineSceneStage3D.ts` to include `'rift'`; adds `onRiftBossTap?: (screenX: number, screenY: number) => { dmg: number; isCrit?: boolean } | void` and `onRiftFighterStrike?: (slotIndex: number, attackInterval: number, isUltimate: boolean, beatIndex: number, isFinisher: boolean) => { dmg: number; isCrit?: boolean } | void` to `MineSceneCallbacks`.

- [ ] **Step 1: Write failing tests in `tests/world-3d.test.ts`**

Add Vitest specs testing:
1. `RiftArena3D` initializes cleanly, switches boss config (`void-asura` / `null-singularity`), triggers `triggerBossHit` and `triggerTierShockwave(4)`, toggles `setLowQuality(true/false)`, and calls `dispose()` without throwing.
2. `getDefaultOrbitPitchForMode('rift')` and `clampCameraZoomRadius(NaN, 'rift')` return valid finite Rift camera bounds.
3. `applyMineSceneModeTransition` with `mode: 'rift'` hides mine/shop/tower/omega/fusion worlds and reveals `riftArena.group`.

- [ ] **Step 2: Run targeted Vitest test to confirm failure**

Run: `npx.cmd vitest run tests/world-3d.test.ts -t "RiftArena"`
Expected: FAIL (`RiftArena3D` not found).

- [ ] **Step 3: Implement `RiftArena3D.ts` and wire `'rift'` mode into `MineSceneStage3D.ts`, `MineSceneInput.ts`, `MineSceneProjector.ts`, and `MineScene3D.ts`**

Build `RiftArena3D.ts` (~650–800 lines) with:
- Dimensional Void sky backdrop, octagonal void dais, `InstancedMesh` floating void crystal/monolith shards, glowing rift ring behind Boss (`z = -4.8`, Boss `ChibiSprite3D` scaled `3.2`), invisible raycast cylinder (`userData = { kind: 'rift-boss' }`), and expanding tier-break shockwave ring (`triggerTierShockwave`).
- 5 `CyberShowcasePodium` squad slots in semi-circle facing Boss, 14 FPS sprite-sheet Enchant Auras, parallel basic attacks + `1.5s` `SpotlightAttackQueue` Ult Relay (with `overclock-surge` `1.3×` attack cadence & `3`-hit Ult charge threshold), `TierAttackVfxPool3D`, `SignatureProjectilePool3D`, and `AttackImpactFxController`.
- Wire lazy `riftArena` lifecycle, camera framing, `rift-boss` click raycast, and `emitPlotAnchors` for `'rift'` mode across `MineSceneStage3D.ts`, `MineSceneInput.ts`, `MineSceneProjector.ts`, and `MineScene3D.ts`.

- [ ] **Step 4: Run `tests/world-3d.test.ts` to verify pass**

Run: `npx.cmd vitest run tests/world-3d.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game3d/RiftArena3D.ts src/game3d/MineSceneStage3D.ts src/game3d/MineSceneInput.ts src/game3d/MineSceneProjector.ts src/game3d/MineScene3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): add RiftArena3D Dimensional Void arena and wire sceneMode rift"
```

---

### Task 4: Rift Hub Overhaul, 30s Battle HUD, Bridge & App Loop Wiring

**Files:**
- Modify: `src/ui/RiftModalUi.ts`
- Create: `src/ui/RiftArenaHudUi.ts`
- Create: `src/ui/HudRiftBridge.ts`
- Modify: `src/ui/GameHud.ts`
- Modify: `src/ui/HudActionRouter.ts`
- Modify: `src/ui/HudShared.ts`
- Modify: `src/main.ts`
- Modify: `src/styles/hud-battle.css`
- Test: `tests/hud-modules.test.ts`

**Interfaces:**
- Consumes: `RiftDomain` / `GameState` Rift methods (`Task 2`) and `MineScene3D` Rift ops (`Task 3`).
- Produces:
  - `RiftArenaHudUi`: `renderRiftArenaHud(): string`, `updateLiveValues(root: HTMLElement): void`, `bindEvents(root: HTMLElement, onRetry: () => void, onReturnHub: () => void, onExitRetreat: () => void): void`
  - `HudRiftBridge`: `startRiftBattle(): void`, `handleRiftBossTap(sx, sy): { dmg: number; isCrit?: boolean } | undefined`, `handleRiftFighterStrike(slotIndex, attackInterval, isUltimate, beatIndex, isFinisher): { dmg: number; isCrit?: boolean } | undefined`, `stepTick(dtSec): void`, `retreatRiftBattle(): void`, `returnToHub(): void`

- [ ] **Step 1: Write failing HUD tests in `tests/hud-modules.test.ts`**

Replace old 3×3 `BreachCell` expectations (if any) and add specs testing:
1. `RiftModalUi` renders Active Boss, Combat Anomaly, `X / 3 Attempts` badge, Tier 1–10 reward ladder (`Tier 1 -> 1 Shard`, `Tier 4 -> 4 Shards`, `Tier 10 -> 10 Shards`), Personal Best, `ENTER RIFT BATTLE (30s)` when open & attempts > 0, and `FORCE OPEN 15m` when closed or at `0 / 3` attempts.
2. `RiftArenaHudUi` renders the `30.0s` timer, Boss name/portrait, segmented `T1..T10` Damage Meter, live Tier/Damage/Projected Shards, and post-battle summary popup with `RETRY` (when attempts > 0) and `RETURN TO HUB`.
3. `HudRiftBridge` starts Rift battle -> switches `sceneMode` to `'rift'`, accumulates squad/tap strikes, plays tier-up feedback, and transitions cleanly to summary when 30s expires or on retreat.

- [ ] **Step 2: Run targeted Vitest test to confirm failure**

Run: `npx.cmd vitest run tests/hud-modules.test.ts -t "Rift"`
Expected: FAIL.

- [ ] **Step 3: Implement `RiftModalUi.ts`, `RiftArenaHudUi.ts`, `HudRiftBridge.ts`, CSS & app wiring**

- Overhaul `RiftModalUi.ts` to remove `BreachCell` 3×3 minigame and present the Hub + Tier 1–10 preview + `3/3` Attempts + `ENTER RIFT BATTLE (30s)` button (calling `onStartRiftBattle` callback).
- Create `RiftArenaHudUi.ts` (top boss/timer bar, segmented `T1..T10` meter, projected Shards/Drop, summary popup) and `HudRiftBridge.ts` (connecting `GameState`, `RiftArena3D`, audio SFX, and `RiftArenaHudUi`).
- Wire `sceneMode === 'rift'` into `GameHud.ts`, `HudActionRouter.ts`, `HudShared.ts` (if `ModalKind` / overlay checks need `'rift'` mode hiding Mine/Shop/Tower chrome), `src/main.ts` (`MineSceneCallbacks` + `stepRiftBattleTick` in main loop + `'boss'` BGM mode + damage popups), and add responsive Tier 1–10 meter styling in `src/styles/hud-battle.css`.

- [ ] **Step 4: Run `tests/hud-modules.test.ts` to verify pass**

Run: `npx.cmd vitest run tests/hud-modules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/RiftModalUi.ts src/ui/RiftArenaHudUi.ts src/ui/HudRiftBridge.ts src/ui/GameHud.ts src/ui/HudActionRouter.ts src/ui/HudShared.ts src/main.ts src/styles/hud-battle.css tests/hud-modules.test.ts
git commit -m "feat(ui): replace 3x3 breach with 30s Rift Boss Battle HUD and Tier 1-10 meter"
```

---

### Task 5: Full Suite Verification, Browser Smoke Check & `GAME_MAP.md` Sync

**Files:**
- Modify: `GAME_MAP.md`

- [ ] **Step 1: Run full Vitest suite and TypeScript + Vite production build**

Run: `npm.cmd test && npm.cmd run build`
Expected: All Vitest specs pass (`0` failures) and `tsc --noEmit && vite build` exits `0`.

- [ ] **Step 2: Smoke test in dev browser (optional/if needed via Vite + browser subagent)**

Verify opening Rift modal from Left Wing Stargate, entering 30s Rift Boss Battle, tapping Boss, seeing Tier 1–10 meter climb, timer ending -> Summary popup -> returning to Hub with updated Shards & remaining attempts.

- [ ] **Step 3: Sync `GAME_MAP.md`**

Update line counts, watchlist (ensure `RiftArena3D.ts` stays under 1,000 lines), new files (`RiftArena3D.ts`, `RiftArenaHudUi.ts`, `HudRiftBridge.ts`), and Quick Target Lookup for the new 30s Rift Boss Battle system.

- [ ] **Step 4: Final verification & Commit**

Run: `npm.cmd test && npm.cmd run build`
```bash
git add GAME_MAP.md
git commit -m "docs: sync GAME_MAP.md for 30s Rift Boss Battle"
```
