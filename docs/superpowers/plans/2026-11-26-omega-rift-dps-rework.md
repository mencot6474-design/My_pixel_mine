# Omega Rift-Style 30s DPS Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Omega Duel Sanctum battle system into a 30-second Rift-style DPS check with Tier 1–5 targets starting at World 6 (`5e19`), boss multipliers (`1×/10×/20×` targets, `1×/2×/3×` shared Omega Core drops), and buffed unlock/awaken costs (`100`/`250`/`500` Cores).

**Architecture:** Refactor `OmegaData.ts` and `OmegaBossDomain.ts` around cumulative 30s damage progression (`getOmegaTierProgress`, `applyOmegaSquadStrikeDomain`, `applyOmegaTapDamageDomain`, `stepOmegaBossTickDomain`) and a single shared `omegaCoreTokens` currency with save migration in `GameStateSave.ts`. Update `OmegaArena3D`/`OmegaArenaCombat3D`/`MineScene3D`/`MineSceneInput` for immediate 30s combat and boss tapping, and align `OmegaBossModalUi`/`OmegaArenaHudUi`/`HudOmegaBridge`/`HudActionRouter` to the Rift hub/HUD/summary pattern.

**Tech Stack:** TypeScript, Three.js, Tailwind CSS v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-26-omega-rift-dps-rework-design.md`

## Global Constraints
- `OMEGA_BATTLE_DURATION_SEC = 30`.
- Tier 1–5 targets start at World 6 (`5e19`, `5e22`, `5e25`, `5e28`, `5e31`) for Crimson Ronin, `10×` for Obsidian Sovereign (`5e20..5e32`), and `20×` for Abyssal Leviathan (`1e21..1e33`).
- Core drops per Tier 1–5: Crimson `[1, 2, 3, 4, 5]`, Obsidian `[2, 4, 6, 8, 10]`, Leviathan `[3, 6, 9, 12, 15]`.
- Shared `omegaCoreTokens` currency; unlock costs `100` (Crimson), `250` (Obsidian), `500` (Leviathan); awaken costs `[40, 60, 90, 120]`, `[100, 150, 220, 300]`, `[200, 300, 440, 600]`.
- 1 Boss Key consumed on `startOmegaBoss`; retreat still settles reached Tier rewards.
- No `any` anywhere in `src/` or `tests/`; run `npm.cmd test` and `npm.cmd run build` after completion.

## Review Focus
- Legacy save migration sums existing per-boss `omegaCores` into `omegaCoreTokens` without data loss.
- Entering Omega battle with 0 keys or 0 deployed Chibis fails cleanly without consuming keys.
- Reaching Tier `T` on a first run awards First Clear Gems/Dice for every unclaimed tier `1..T` rather than skipping earlier tiers.
- Tapping anywhere in the Omega arena (boss mesh or backdrop) deals tap damage + tap charge without opening stale Parry/Target overlays.
- `omegaLastSummary` triggers `New Best!` / `Retreated` / `Battle Again` states accurately and updates `omegaBestDamage` & `omegaBestTier`.

---

### Task 1: Data, Domain, GameState & Save Migration
**Files:**
- Modify: `src/game/OmegaData.ts`
- Modify: `src/game/OmegaBossDomain.ts`
- Modify: `src/game/GameState.ts`
- Modify: `src/game/GameStateSave.ts`
- Test: `tests/state-modules.test.ts`

- [ ] Update `OmegaData.ts` with `OMEGA_BATTLE_DURATION_SEC = 30`, `OmegaTierDef` (`worldLabel`, `damageTarget`, `cores`, `firstClearGems`, `firstClearDice`, `repeatGems`), `targetMult`/`coreMult` (`1/1`, `10/2`, `20/3`), `unlockCoreCost` (`100`/`250`/`500`), `awakenCoreCosts`, `getOmegaTierProgress`, and updated boss mechanic summaries.
- [ ] Refactor `OmegaBossDomain.ts` to 30s DPS check (`startOmegaBossDomain` consumes 1 key on entry, `applyOmegaSquadStrikeDomain`, `applyOmegaTapDamageDomain`, `stepOmegaBossTickDomain`, `finishOmegaBossDomain` granting `omegaCoreTokens` + unclaimed 1st-clear tiers + repeat gems + `omegaBestDamage`/`omegaBestTier`, and `unlockOmegaChibiDomain`/`awakenOmegaChibiDomain` spending `omegaCoreTokens`).
- [ ] Update `GameState.ts` and `GameStateSave.ts` (`omegaCoreTokens`, `omegaBestDamage`, save serialization, and legacy `cores` object sum migration).
- [ ] Update `OmegaBossDomain` spec in `tests/state-modules.test.ts` and run `npx vitest run tests/state-modules.test.ts`.

### Task 2: 3D Arena & Input Integration
**Files:**
- Modify: `src/game3d/OmegaArena3D.ts`
- Modify: `src/game3d/OmegaArenaCombat3D.ts`
- Modify: `src/game3d/MineScene3D.ts`
- Modify: `src/game3d/MineSceneInput.ts`
- Modify: `src/game3d/MineSceneProjector.ts`
- Modify: `src/main.ts`
- Test: `tests/world-3d.test.ts`

- [ ] Simplify `OmegaArena3D.ts` & `OmegaArenaCombat3D.ts` to Rift-style immediate active 30s combat (`setBattleActive(active)`, `recordPlayerTapCharge()`, `triggerTierShockwave(tier)`, `getBossWorldPos()`, `onStrike` passing `isUltimate`), hiding invul shield/entrance drop meshes.
- [ ] Update `MineScene3D.ts`, `MineSceneInput.ts`, `MineSceneProjector.ts`, and `main.ts` for `onOmegaBossTap` (click boss or arena backdrop), `onOmegaFighterStrike` w/ `isUltimate`, `triggerOmegaTierShockwave`, `recordOmegaPlayerTapCharge`, and removing stale Parry/Target overlay plumbing.
- [ ] Verify Omega 3D arena tests in `tests/world-3d.test.ts`.

### Task 3: UI, Bridges & HUD Integration
**Files:**
- Modify: `src/ui/OmegaBossModalUi.ts`
- Modify: `src/ui/OmegaArenaHudUi.ts`
- Modify: `src/ui/HudOmegaBridge.ts`
- Modify: `src/ui/HudActionRouter.ts`
- Modify: `src/ui/HudWiring.ts`
- Modify: `src/ui/GameHud.ts`
- Modify: `src/ui/WorldOverlayHudUi.ts`
- Test: `tests/hud-modules.test.ts`

- [ ] Update `OmegaBossModalUi.ts` to display shared `omegaCoreTokens`, Tier 1–5 damage targets & Core rewards (`1–5` / `2–10` / `3–15`), Boss Best Tier & Best Damage, single `ENTER OMEGA BATTLE (30s)` CTA, and buffed Forge unlock (`100/250/500`) & Awaken costs.
- [ ] Redesign `OmegaArenaHudUi.ts` into the Rift-style 30s HUD (`← Retreat`, Boss portrait, `TIER X`, `30.0s` timer, `DMG / NextTarget`, projected `+X Omega Cores`, progress bar, `T1..T5` pips, bottom `TAP BOSS` banner, and post-battle Summary popup).
- [ ] Update `HudOmegaBridge.ts`, `HudActionRouter.ts`, `HudWiring.ts`, `GameHud.ts`, and `WorldOverlayHudUi.ts` (clean up obsolete Parry/Target overlay hooks; wire `omegaBridge.stepTick(0.1)` and `handleOmegaBossTap`).
- [ ] Update Omega UI/HUD tests in `tests/hud-modules.test.ts` and run full verification (`npm.cmd test && npm.cmd run build`).

### Task 4: Update `GAME_MAP.md`
- [ ] Update `GAME_MAP.md` header, recent changelog, module summaries/line counts, and run final verification.
