# Rift Boss Battle (30s DPS Check & Tier 1–10 Meter) Design

**Date:** 2026-11-25  
**Status:** Draft (Pending Builder Check & User Approval)

---

## 1. Intent & Why

The current Dimensional Rift (`RiftModalUi.ts`) uses a 3×3 click minigame (`BreachCell`) that grants flat Rift Shards (`18–27`) regardless of squad strength. This disconnects Rift progression from the player's core progression (World unlocks, Chibis, Stars, Pickaxes, Enchants, Relics, and Research).

Replacing the minigame with a **30-second 3D Rift Boss Battle (DPS Check)** turns the Rift into a true combat benchmark:
- The player's 5 deployed Chibis plus manual taps attack an immortal Dimensional Rift Boss (`Void Asura` or `Null Singularity`) for **30 seconds**.
- Total cumulative damage fills a **10-Tier Damage Meter (Tier 1 – Tier 10)** aligned with the game's World 1–10 progression ladder.
- Reaching a higher Tier before time runs out awards more **Rift Shards** (starting at **1 Shard** for Tier 1) and a higher chance at an instant Anomaly Chibi drop.
- Each 15-minute Rift window (`:00–:15` hourly or `500K` Gems Force Open) allows **3 attempts**, keeping Rift Shards earned as meaningful hourly milestones toward the **100-Shard Pity Claim**.

---

## 2. Goals, Non-Goals, & Anti-Goals

### Goals
- **30s 3D Rift Boss Combat (`RiftArena3D`, `sceneMode: 'rift'`)**: Dedicated Dimensional Void 3D arena where 5 Chibis fight alongside player taps against a giant Rift Boss (`void-asura` / `null-singularity`).
- **Tier 1–10 Global Damage Ladder**: Fixed W1–W10 progression thresholds (`5K` up to `50No`) so early-game players cap out around Tier 1 (`1` Shard) and climb Tiers 2–10 as they unlock higher Worlds and stronger squads.
- **3 Attempts per 15-Minute Session**: Strict persisted quota (`3/3` per hourly `:00–:15` window, or `3/3` refreshed upon purchasing a `500K` Gems Force Open pass).
- **Live Tier 1–10 HUD & Summary**: Real-time damage counter, segmented `T1..T10` progress meter, countdown timer (`30.0s`), projected Shards/Drop rate, and post-battle summary with Retry / Return to Hub.
- **Active Combat Anomalies**: Re-purpose the 4 hourly `RIFT_ANOMALIES` (`hyper-crit`, `meteor-storm`, `overclock-surge`, `mirror-echo`) as real combat modifiers during the 30s Rift Battle.

### Non-Goals
- **No killable Boss HP / Parry / Invul Shield mechanics**: Those remain exclusive to `OmegaArena3D`. The Rift Boss never dies during the 30 seconds; only total cumulative damage matters.
- **No Overclock Fever or Pit Events inside the Rift Arena**: Keeps the 30s DPS check deterministic and consistent across runs (same isolation as `TowerArena3D` and `OmegaArena3D`).
- **No retention of the old 3×3 `BreachCell` minigame**: It is fully replaced by the 30s 3D Rift Boss Battle.

### Anti-Goals
- **Do not bloat `OmegaArena3D.ts`** (already 968 lines) with `if (isRift)` branches.
- **Do not allow page-refresh or retreat exploits** to bypass the 3-attempt cap: attempts are persisted in `GameStateSave.ts` and deducted when entering battle.

---

## 3. Constraints

- **TypeScript & 3D Standards** (`.agent/rules/threejs-ts-standards.md`): Strict TypeScript (no `any`), `dt <= 0.1` clamp, `InstancedMesh` for repeated environment elements, `SRGBColorSpace` for canvas textures, complete `.dispose()` cleanup, and zero gyroscopic/armillary rings.
- **UI Theme** (`.agent/skills/ui-hud-design/SKILL.md`): Sticker-Pop Deluxe (`#fff8e7` warm cream, `#14111d` borders, zero outer drop shadows, `tabular-nums`, Tailwind v4 / `TW_*` shared constants, `hud-battle.css`).
- **Module Size & Purity**: Keep new files well under 1,000 lines; keep all damage/tier/attempt/reward rules in pure functions inside `AnomalyData.ts` and `RiftDomain.ts` so Vitest specs run without WebGL or DOM.

---

## 4. Approaches Considered

### Approach A — Dedicated `RiftArena3D` (`sceneMode: 'rift'`) + `RiftArenaHudUi` + `HudRiftBridge` *(Selected)*
- Build a dedicated `RiftArena3D.ts` in a Dimensional Void setting reusing existing combat primitives (`SpotlightAttackQueue`, `TierAttackVfxPool3D`, `SignatureProjectilePool3D`, `AttackImpactFxController`, `CyberShowcasePodium`, `createEnchantAuraSheetHandle`), paired with `RiftArenaHudUi.ts` and `HudRiftBridge.ts`.
- **Trade-offs**: Adds ~3–4 focused modules, but keeps `OmegaArena3D.ts` clean (<1,000 lines), isolates 30s DPS-meter rules from 45s kill-boss mechanics, and gives the Rift a distinct Dimensional Void visual identity.

### Approach B — Reuse `OmegaArena3D` with `isRiftMode` Flag *(Rejected)*
- Reuse `OmegaArena3D` and `OmegaRooftopEnvironment3D`, hiding Invul Shield/Parry/Targets and swapping the boss sprite.
- **Trade-offs**: Saves one 3D arena file, but pushes `OmegaArena3D.ts` past 1,000 lines, couples two incompatible battle modes, and forces the sunset rooftop aesthetic onto the Dimensional Rift.

---

## 5. Detailed Design

### 5.1. Tier 1–10 Damage Ladder & Rewards (`src/game/AnomalyData.ts`)

Constants:
- `RIFT_BATTLE_DURATION_SEC = 30`
- `RIFT_MAX_ATTEMPTS_PER_WINDOW = 3`

Global W1–W10 Threshold Table (`RIFT_TIER_DEFS`, 10 entries — **1 Shard per Tier**, `shards = tier`):

| Tier | World Anchor | Cumulative Damage Target | Rift Shards | Instant Anomaly Drop Chance |
|---|---|---|---|---|
| Tier 1 | W1 Underground | `5,000` (`5K`) | `1` | `2.0%` |
| Tier 2 | W2 Crystal | `50,000,000` (`50M`) | `2` | `2.5%` |
| Tier 3 | W3 Magma | `50,000,000,000` (`50B`) | `3` | `3.0%` |
| Tier 4 | W4 Ruins | `50,000,000,000,000` (`50T`) | `4` | `4.0%` |
| Tier 5 | W5 Voidreach | `50,000,000,000,000,000` (`50Qa`) | `5` | `5.0%` |
| Tier 6 | W6 Starwell | `5e19` (`50Qi`) | `6` | `6.0%` |
| Tier 7 | W7 Abyssal | `5e22` (`50Sx`) | `7` | `7.0%` |
| Tier 8 | W8 Chrono | `5e25` (`50Sp`) | `8` | `8.0%` |
| Tier 9 | W9 Solaris | `5e28` (`50Oc`) | `9` | `10.0%` |
| Tier 10 | W10 Elysium | `5e31` (`50No`) | `10` | `12.0%` |

- Below `5,000` damage = **Tier 0** (`0` Shards, `0%` drop chance).
- `getRiftTierProgress(damage)` returns `{ tier, currentTarget, nextTarget, progressPct, shards, dropChance }`.

### 5.2. Hourly Rift Bosses & Combat Anomalies (`src/game/AnomalyData.ts`)

- **Active Boss Rotation**: Alternates hourly by `hourIndex % 2` (`void-asura` on even hours, `null-singularity` on odd hours). Instant drop rolls from `ANOMALY_CHIBI_DEFS` (50/50 split between the two Anomaly Chibis).
- **4 Combat Anomalies (`RIFT_ANOMALIES`)** updated for 30s Boss Battle *(design calls)*:
  1. `hyper-crit`: `+25%` Crit Chance & `1.5×` Crit Damage multiplier for all squad & tap hits.
  2. `meteor-storm`: Void Meteors automatically strike the Boss every `4s` for bonus damage equal to `4 × totalSquadDps` (helping push higher Tiers).
  3. `overclock-surge`: Squad basic attack cadence `+30%` faster (`attackCooldown / 1.3`), Ult Charge requires `3` basic attacks instead of `5`, **and** applies a `1.3×` squad damage multiplier in `applyRiftSquadStrikeDomain` (so `chargeSec` DPS-integration does not cancel out the speed boost).
  4. `mirror-echo`: Every Chibi Ult strike/beat (`isUltimate === true`) deals `+35%` Echo Strike bonus damage in `applyRiftSquadStrikeDomain` (totaling `+35%` extra damage across the 7-beat Ult barrage).

### 5.3. Attempt Quota, Persistence & Battle Lifecycle (`src/game/RiftDomain.ts`, `GameState.ts`, `GameStateSave.ts`)

- **Persisted Fields** in `SavePayload` / `SaveableGameState`:
  - Existing: `riftShards`, `riftPassExpiresAt`, `riftBreachesCompleted` (now counts completed Rift Battles with `tierReached >= 1`).
  - New: `riftHourlyKey: string` (default `''`), `riftHourlyAttemptsUsed: number` (default `0`), `riftPassAttemptsUsed: number` (default `0`), `riftBestDamage: number` (default `0`), `riftBestTier: number` (default `0`).
- **Dual-Bucket Session Precedence & Attempt Reset** *(design call — prevents `:00–:15` / pass overlap exploits)*:
  - Hourly `:00–:15` bucket key: `'hourly:' + hourIndex`. When `ctx.riftHourlyKey !== currentHourlyKey`, hourly attempts used resets virtually to `0` (and updates `riftHourlyKey` on start).
  - Pass bucket: tied to `ctx.riftPassExpiresAt > nowMs` and `ctx.riftPassAttemptsUsed` (`0..3`).
  - **Active Source Resolution (`getRiftWindowSnapshot` / `getRiftRemainingAttempts`)**:
    1. If `:00–:15` is open **and** hourly attempts remaining `> 0` → active source is `'hourly'` (uses hourly attempts first).
    2. Else if `riftPassExpiresAt > nowMs` **and** pass attempts remaining `> 0` → active source is `'pass'` (also applies if `:00–:15` is open with `0/3` hourly attempts left and an active pass was purchased).
    3. Else if `:00–:15` is open (`0/3` hourly left, no active pass with attempts) → `isOpen: true, source: 'hourly', attemptsRemaining: 0`.
    4. Else → `isOpen: false, source: 'closed', attemptsRemaining: 0`.
  - **Force Open (`buyRiftPassDomain`, `500K` Gems)**: Allowed whenever `attemptsRemaining === 0` (either Rift is closed, or all 3 hourly attempts were spent). Sets `riftPassExpiresAt = nowMs + RIFT_PASS_DURATION_MS` and resets `riftPassAttemptsUsed = 0`, guaranteeing exactly 3 fresh attempts without ever double-granting across the `:15` boundary.
- **Battle State (`RiftBattleState`, transient)** & Lifecycle:
  - `startRiftBattleDomain(ctx, nowMs)`:
    - Requires `snap.isOpen === true`, `attemptsRemaining > 0`, and at least 1 deployed Chibi on plots.
    - Deducts 1 attempt from whichever bucket is active (`'hourly'` increments `riftHourlyAttemptsUsed` & syncs `riftHourlyKey`; `'pass'` increments `riftPassAttemptsUsed`) and saves immediately (prevents reload-scumming).
    - Initializes `RiftBattleState` with `timeRemainingSec = 30`, `damageDealt = 0`, `currentTier = 0`, `meteorTimerSec = 4`.
  - `applyRiftSquadStrikeDomain(ctx, slotIndex, attackInterval, isUltimate, rng)`:
    - Reads `ctx.getPlotUnitStats(slotIndex)` (`dmg`, `critChance`, `critMult`).
    - Applies `overclock-surge` (`×1.3` squad damage), `hyper-crit` (`+0.25` crit chance, `×1.5` crit mult), and `mirror-echo` (`×1.35` when `isUltimate === true`).
    - Adds damage to `damageDealt`, recomputes `currentTier`, returns `{ dmgDealt, isCrit, tierUpTo }`.
  - `applyRiftTapDamageDomain(ctx, tapDamage, isCrit, rng)`:
    - Uses `getTapDamageDomain` value (plus `hyper-crit` bonus if active), adds to `damageDealt`, recomputes `currentTier`.
  - `stepRiftBattleTickDomain(ctx, dtSec, totalSquadDps, rng)`:
    - Decrements `timeRemainingSec`.
    - For `meteor-storm`, triggers a meteor burst every `4s` dealing `totalSquadDps * 4`.
    - When `timeRemainingSec <= 0`, calls `finishRiftBattleDomain` to settle rewards.
  - `retreatRiftBattleDomain(ctx)`:
    - Ends the battle early and calls `finishRiftBattleDomain` so the player still keeps rewards for any Tier already reached (attempt was already consumed at start).
  - `finishRiftBattleDomain(ctx, rng)`:
    - Evaluates `tierReached` (`0..10`), sets `shardsEarned = tierReached` (`1` Shard per Tier reached; `0` if Tier 0), rolls `tierDef.dropChance` for an Anomaly Chibi (`void-asura` / `null-singularity`), updates `riftShards`, `riftBreachesCompleted` (if `tierReached >= 1`), `riftBestDamage`, `riftBestTier`, stores `riftLastSummary`, clears `riftBattle = null`, and saves.

### 5.4. 3D Arena (`src/game3d/RiftArena3D.ts` & `MineScene*` Wiring)

- **`RiftArena3D.ts`** (target ~650–800 lines, lazily instantiated by `MineScene3D`):
  - **Dimensional Void Environment**: Deep indigo/violet cyber-void sky dome & fog, floating fractured basalt/crystal arena platform (`InstancedMesh` orbiting void monolith shards + concentric energy rings around the Boss dais), and a glowing dimensional rift portal ring backdrop behind the Boss.
  - **Entities**:
    - 1 giant stationary Rift Boss (`void-asura` or `null-singularity`, `scale ~3.2`) on a raised Boss Dais at `z = -4.8` with an invisible raycast cylinder (`userData = { kind: 'rift-boss' }`).
    - 5 `CyberShowcasePodium` squad slots arranged in a semi-circle facing the Boss (`STAGE_PEDESTAL_COUNT = 5`), displaying each deployed Chibi, its 14 FPS sprite-sheet Enchant Aura, and animated cast/attack poses.
  - **Combat Loop**:
    - 5× parallel basic attacks (`BASIC_ATTACK_DPS_SHARE = 0.65`, accelerated `+30%` under `overclock-surge`) + `SpotlightAttackQueue` `1.5s` Ult Relay (`ULT_CHARGE_BASIC_ATTACKS = 5`, or `3` under `overclock-surge`).
    - Reuses `TierAttackVfxPool3D` (2.5s Sakuga skill VFX + `barrageLines` razor slashes), `SignatureProjectilePool3D`, and `AttackImpactFxController`.
    - Reaching a new Tier (`1..10`) triggers `triggerTierShockwave(tier)` — expanding a bright neon ring across the arena floor and briefly pulsing the Boss & portal glow.
  - **Camera & Projector (`MineSceneStage3D.ts`, `MineSceneInput.ts`, `MineSceneProjector.ts`)**:
    - Add `'rift'` to `SceneMode`, default orbit pitch (`-0.21`), zoom radius (`~21.0`, clamp `14..28`).
    - `MineSceneInput` handles click/tap on `kind === 'rift-boss'` (and optionally clicking anywhere on the arena floor/boss hitbox) to invoke `callbacks.onRiftBossTap(screenX, screenY)`.
    - `MineSceneProjector` emits `onPlotAnchors` for the 5 Rift squad podiums (showing tier badges + 5-segment Ult charge bars) when `sceneMode === 'rift'`.

### 5.5. UI & HUD (`RiftModalUi.ts`, `RiftArenaHudUi.ts`, `HudRiftBridge.ts`)

- **`RiftModalUi.ts`** (Hub Modal):
  - Keeps the 2-column Omega-style Chibi Inspector (`void-asura` & `null-singularity`) + `100` Shard Pity Claim.
  - Replaces the old `Breach` tab/grid with:
    - Active Hourly Boss & Combat Anomaly banner.
    - Attempt badge (`3 / 3 Attempts Remaining` for current window).
    - Compact **Tier 1–10 Ladder Strip / Preview** + Personal Best (`Best: Tier X • Y DMG`).
    - Primary CTA: `ENTER RIFT BATTLE (30s)` (when open & attempts > 0), or `FORCE OPEN 15m (500K Gems)` (when closed or out of attempts).
- **`RiftArenaHudUi.ts`** & **`HudRiftBridge.ts`**:
  - **Top HUD**: Boss Portrait + Name, `30.0s` big countdown timer (pulsing red `<= 5.0s`), Active Anomaly pill, and `Exit` button.
  - **10-Tier Damage Meter**: Prominent segmented bar (`T1` through `T10` markers) showing current Tier badge, formatted total Damage (`tabular-nums`), progress toward the next Tier threshold (`X / Y`), and live Projected Rewards (`+N Shards • P% Drop`).
  - **Post-Battle Summary Popup**: Displays Tier Reached (`TIER X / 10`), Total Damage, `NEW BEST!` pill if beaten, Rift Shards Earned, Instant Drop banner if triggered, remaining attempts (`X / 3`), `BATTLE AGAIN (30s)` (if attempts > 0 and window open), and `RETURN TO HUB`.

---

## 6. Left to the Builder

- Exact vertex layout, shader uniforms, and color tuning of the Dimensional Void environment inside `RiftArena3D.ts`.
- Responsive CSS rules for the segmented Tier 1–10 Damage Meter inside `src/styles/hud-battle.css`.
- Wiring `RiftArena3D` hooks in `src/main.ts` and `src/ui/GameHud.ts` / `HudActionRouter.ts`, plus unit tests in `tests/state-modules.test.ts`, `tests/hud-modules.test.ts`, and `tests/world-3d.test.ts`.
- Updating `GAME_MAP.md` after implementation completes.
