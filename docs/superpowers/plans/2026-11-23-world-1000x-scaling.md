# Inter-World 1,000× Capability Scaling & Starter Chibi Grant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 1,000× per-World capability ladder (`1K–1M` through `1Sp–1Oc`), automatic lowest-tier starter Chibi grant on World unlock, and dynamic unlocked-World capping for non-world special Chibis (`Twin`, `Omega`, `Limited`) across game data, domain logic, UI, and tests.

**Architecture:** Scale World miners (`ChibiCatalog.ts`), World ore HP/values/unlock costs/upgrade scales (`GameData.ts`), World research trees (`ResearchWorldNodesData.ts`), and Fusion/Weather/Omega scales by `1,000×` per World (`2,000×` on `oreHpMult` to absorb global Pickaxe multipliers). Introduce progression-aware effective `baseDps` / `upgradeCostScale` resolution in domain/state/UI helpers so `Twin`, `Omega`, and `Limited` units scale strictly with the player's highest unlocked World (and discovered tier within it), while `unlockWorldDomain` grants 1× of the newly unlocked World's lowest-tier Chibi.

**Tech Stack:** TypeScript (`strict`), Vite 7, Vitest 3, Three.js (`ChibiCatalog.ts`), Tailwind UI modules.

**Spec:** [`docs/superpowers/specs/2026-11-23-world-1000x-scaling-design.md`](../specs/2026-11-23-world-1000x-scaling-design.md)

## Global Constraints
- Preserve `PICKAXES` cost (`0`..`1.2e21`) and `dmgMult` (`1`..`20_000`) progression unchanged.
- Capability tiers per World (`w = 0..7`): W1 `1K–1M`, W2 `1M–1B`, W3 `1B–1T`, W4 `1T–1Qa`, W5 `1Qa–1Qi`, W6 `1Qi–1Sx`, W7 `1Sx–1Sp`, W8 `1Sp–1Oc`.
- World `unlockCost`: `0`, `1e6`, `1e9`, `1e12`, `1e15`, `1e18`, `1e21`, `1e24`.
- World `oreHpMult`: `2000^w` (`1`, `2_000`, `4_000_000`, ..., `1.28e23`).
- World miner `baseDps`: `[10, 20, 35, 65, 100] * Math.pow(1000, w)`.
- Strict TypeScript (`tsc --noEmit` must pass with zero unused locals/params or implicit `any`).
- Run commands via `cmd /c "npm run build && npm test"` or `cmd /c "npx vitest run ..."` on Windows PowerShell.

## Review Focus
- **Early-Game Gem Economy Cliff on `mutationCost`:** `Math.pow(baseDps, 0.35)` would charge ~246M Gems at `100Sx` (`1e23`); replace with bounded logarithmic scaling on effective `baseDps` (pinned by unit test in Task 5).
- **Double Starter Grant / Missing Index Entry:** Re-calling or saving/loading after unlocking `W2`–`W8` must grant the starter Chibi once per unlock, add it to `discovered`, and avoid overwriting occupied plot slots (pinned by tests in Task 4).
- **Early `Twin` / `Omega` / `Limited` Carryover Exploit:** Claiming Day-7 `Limited` or buying a `Twin` in `W1` or immediately upon entering `W2` must cap `baseDps` and `upgradeCostScale` to the player's highest unlocked World's discovered anchor (or starter if none discovered yet), while keeping W8 static catalog values synced (pinned by tests in Task 2 & Task 5).
- **Save Migration Compatibility (`unlockedWorlds` only `['underground']` vs multi-world saves):** Legacy saves with `activeWorldId` / `plotUnits` must load cleanly without `NaN` stats or broken upgrade costs, and `getWorldUpgradeCostScale` fallback must extrapolate `×1_000` beyond W8 (pinned by tests in Task 1 & Task 5).
- **Manual Tapping / Omega Parry Unresponsiveness at High Worlds:** Flat `20` tap damage becomes `0%` against `1e6`–`1e23` rocks; adding a small fraction (`3%`) of `getTotalPlotDps()` keeps tapping responsive without out-DPSing Chibis (pinned by test in Task 5).

---

### Task 1: Rescale World Miners, Worlds, Ores, and Upgrade Cost Multipliers

**Files:**
- Modify: `src/game3d/ChibiCatalog.ts:70-792`
- Modify: `src/game/GameData.ts:112-357`
- Test: `tests/state-modules.test.ts` and `tests/world-3d.test.ts`

**Interfaces:**
- Produces: updated `CHIBI_CATALOG`, `WORLDS`, `WORLD_UPGRADE_COST_SCALE`, `getWorldUpgradeCostScale`, `ORES`, `WEATHER_ORES` matching `[10, 20, 35, 65, 100] * 1000^w`, `unlockCost = 1000^w * 1e6` (for `w >= 1`), `oreHpMult = 2000^w`, and `getWorldStarterChibiId(worldId: WorldId): string | null`.

- [ ] **Step 1: Write failing tests for the 1,000× World ladder, `oreHpMult = 2000^w`, and `getWorldStarterChibiId`**

In `tests/state-modules.test.ts`, add a `describe('1000x World Scaling Ladder')` block verifying:
- `WORLDS[w].unlockCost` equals `0` for `w=0` and `Math.pow(1000, w + 1)` for `w=1..7`.
- `WORLDS[w].oreHpMult` equals `Math.pow(2000, w)` for `w=0..7`.
- `getWorldUpgradeCostScale(WORLDS[w].id)` equals `Math.pow(1000, w)`, and an extrapolated simulated W9 (`index 8`) returns `1e24`.
- For each world `w = 0..7`, sorted `getMinersByWorld(WORLDS[w].id).map(m => m.chibi.baseDps)` equals `[10, 20, 35, 65, 100].map(v => v * Math.pow(1000, w))`.
- `getWorldStarterChibiId('crystal') === 'volt-kensei'` and `getWorldStarterChibiId('chrono') === 'glitch-warden'`.

- [ ] **Step 2: Run the new test block to verify it fails**

Run: `cmd /c "npx vitest run tests/state-modules.test.ts -t \"1000x World Scaling Ladder\""`
Expected: FAIL (`getWorldStarterChibiId` missing / old scale values).

- [ ] **Step 3: Rescale World/Weather/Fusion/Limited `baseDps` in `src/game3d/ChibiCatalog.ts`**

- Update all 40 `WORLD_MINERS` entries across W1–W8 to `[10, 20, 35, 65, 100] * Math.pow(1000, w)`.
- Update the 5 Weather Chibis to match their meteor's World (`light_rain` W1 `80`, `snow_rain` W2 `80_000`, `bloodmoon` W3 `80_000_000`, `void` W5 `80_000_000_000_000`, `celestial` W6 `80_000_000_000_000_000`).
- Update the 5 Fusion Chibis to match their recipe's target World capability (`glitch-cheshire` W2 `150_000`, `thorn-maiden` W4 `150_000_000_000`, `monochrome-saint` W5 `150_000_000_000_000`, `prism-seraph` W6 `150_000_000_000_000_000`, `aether-monarch` W8 `150_000_000_000_000_000_000_000`).
- Set baseline Day 1–7 `Limited` `baseDps` sequentially (`15`..`1.5e20` fallback, later capped dynamically at runtime in Task 2).

- [ ] **Step 4: Rescale `WORLDS`, `WORLD_UPGRADE_COST_SCALE`, `ORES`, `WEATHER_ORES` and add `getWorldStarterChibiId` in `src/game/GameData.ts`**

- Set `WORLDS` `unlockCost` (`0`, `1e6`..`1e24`) and `oreHpMult` (`2000^w`, `1`..`1.28e23`).
- Set `WORLD_UPGRADE_COST_SCALE` to `Math.pow(1000, w)` (`1`..`1e21`) and extrapolate by `Math.pow(1000, targetIdx - lastExplicitIdx)` in `getWorldUpgradeCostScale`.
- Rescale `ORES` `sellValue` by `1,000^w`: base tier curve `[15, 50, 135, 340, 880, 2_400, 8_500, 55_000] * 1000^w` for W1–W6, and `[150, 450, 1_500, 7_500, 55_000] * 1000^w` (preserving 5 endgame ores climbing to Exotic & Secret) for W7–W8.
- Rescale `WEATHER_ORES` `sellValue` (`12_000`, `12_000_000`, `12_000_000_000`, `12_000_000_000_000_000`, `12_000_000_000_000_000_000`) to align with `light_rain`..`celestial` Worlds.
- Implement `export function getWorldStarterChibiId(worldId: WorldId): string | null` picking the lowest-`baseDps` miner in `WORLD_MINERS` for `worldId`.

- [ ] **Step 5: Run Vitest on the new ladder test**

Run: `cmd /c "npx vitest run tests/state-modules.test.ts -t \"1000x World Scaling Ladder\""`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game3d/ChibiCatalog.ts src/game/GameData.ts tests/state-modules.test.ts
git commit -m "feat: rescale world miners, ores, unlock costs, and ore HP to 1000x ladder"
```

---

### Task 2: Unlocked-World Progression Anchor & Runtime Cap for `Twin`, `Omega`, and `Limited`

**Files:**
- Modify: `src/game/GameData.ts:157-205`
- Modify: `src/game/DailyLoginData.ts:1-112`
- Modify: `src/game/FusionData.ts:33-153`
- Modify: `src/game/OmegaData.ts:111-173`
- Test: `tests/state-modules.test.ts`

**Interfaces:**
- Consumes: `getWorldStarterChibiId` from Task 1, `isWorldUnlockedDomain` pattern.
- Produces:
  - `getUnlockedWorldScaleAnchor(unlockedWorlds: readonly WorldId[], discovered?: ReadonlySet<string>): LatestWorldScaleAnchor`
  - `getEffectiveChibiBaseDps(chibiId: string, unlockedWorlds?: readonly WorldId[], discovered?: ReadonlySet<string>): number`
  - Updated `FUSION_RECIPES` `upgradeCostScale` (`1_000`, `1e9`, `1e12`, `1e15`, `1e21` × `1.5`), `DAILY_LOGIN_REWARDS` multipliers, and `OMEGA_BOSS_DEFS` Tier 1–5 `bossHp` calibrated to `W8` (`1Sp–1Oc`).

- [ ] **Step 1: Write failing tests for dynamic unlocked-world anchor and special unit caps**

In `tests/state-modules.test.ts`:
- Assert `getLatestWorldScaleAnchor().secretBaseDps === 100_000_000_000_000_000_000_000` (`1e23`) and `yukikage-twins` catalog `baseDps` equals `computeTwinScaledBaseDps(1e23, 2.3)`.
- Assert `getEffectiveChibiBaseDps('yukikage-twins', ['underground'], new Set(['astral-recruit']))` caps at W1 anchor (`10 * 2.3 = 23`), rises to W1 Secret anchor (`100 * 2.3 = 230`) when `'cyber-ki-brawler'` is discovered, and scales up to W2 Starter (`10_000 * 2.3 = 23_000`) when `'crystal'` is first unlocked with only `'volt-kensei'` discovered.
- Assert `getEffectiveChibiBaseDps('ink-seraph', ['underground'], new Set())` caps to W1 capability instead of W7 (`1e20+`), and returns `<= getChibiById('ink-seraph')!.baseDps` across all unlocked worlds.
- Assert regular World miners return their exact catalog `baseDps` from `getEffectiveChibiBaseDps`.

- [ ] **Step 2: Run the tests to verify failure**

Run: `cmd /c "npx vitest run tests/state-modules.test.ts -t \"unlocked-world anchor\""`
Expected: FAIL.

- [ ] **Step 3: Implement `getUnlockedWorldScaleAnchor` and `getEffectiveChibiBaseDps` + rescale `FusionData` & `OmegaData` HP**

- Add `getUnlockedWorldScaleAnchor` in `src/game/GameData.ts`: finds highest unlocked `WorldId` in `WORLDS`; searches discovered `WORLD_MINERS` in that world for max `baseDps`, falling back to that world's starter `baseDps`.
- Add `getEffectiveChibiBaseDps(chibiId, unlockedWorlds, discovered)` in `src/game/GameData.ts` (if `unlockedWorlds` omitted, returns static `getChibiById(chibiId)?.baseDps ?? 0`; for `twin` / `omega` / `limited` when `unlockedWorlds` provided, scales from `getUnlockedWorldScaleAnchor(unlockedWorlds, discovered)` using `dpsMult` for Twin/Omega or tiered `[1.2..2.2]` for Daily Login Day 1–7).
- Align `FUSION_RECIPES` `upgradeCostScale` with each recipe's target world (`1.5e3`, `1.5e9`, `1.5e12`, `1.5e15`, `1.5e21`), and rescale `OMEGA_BOSS_DEFS` `tiers` `bossHp` to match `W8` capability (`[2e25, 2e26, 2e27, 2e28, 2e29]` & `1.5×`).

- [ ] **Step 4: Run tests and update existing `syncTwinCatalogDpsFromAnchor` unit test assertions in `tests/state-modules.test.ts`**

Run: `cmd /c "npx vitest run tests/state-modules.test.ts"`
Expected: PASS (with updated W8 `secretBaseDps = 1e23` expectations in `state-modules.test.ts:1357-1430`).

- [ ] **Step 5: Commit**

```bash
git add src/game/GameData.ts src/game/DailyLoginData.ts src/game/FusionData.ts src/game/OmegaData.ts tests/state-modules.test.ts
git commit -m "feat: add unlocked-world progression anchor and align Fusion/Omega scales"
```

---

### Task 3: Rescale World Research Tree Costs (`ResearchWorldNodesData.ts`)

**Files:**
- Modify: `src/game/ResearchWorldNodesData.ts:255-571`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `WORLDS[w].unlockCost` ladder (`1M`..`1Sp`).
- Produces: balanced 1,000× per-World `costs` (`root`, `tier1`, `dense`, `tier2`, `apex`) for Worlds `W1`–`W8`.

- [ ] **Step 1: Write test checking Research tree completion affordability inside each World's capability bracket**

In `tests/world-3d.test.ts` (or `tests/state-modules.test.ts`), assert that for each World `w = 0..7`:
- World `w` `root` node `baseCost` is monotonically `1,000×` scaled (`1_500` in W1 up to `1.5e24` in W8) and `apex` cost is below next world's `unlockCost` (`apex < WORLDS[w+1].unlockCost` for `w < 7`).

- [ ] **Step 2: Run test to verify failure**

Run: `cmd /c "npx vitest run tests/state-modules.test.ts -t \"Research tree\""`
Expected: FAIL.

- [ ] **Step 3: Update W1–W8 `costs` blocks in `src/game/ResearchWorldNodesData.ts`**

Apply clean `[root, tier1, tier2, dense, apex] = [1_500, 5_000, 20_000, 120_000, 150_000] * Math.pow(1000, w)` across all 8 World tree specs (`underground` through `chrono`).

- [ ] **Step 4: Run test to verify pass**

Run: `cmd /c "npx vitest run tests/state-modules.test.ts -t \"Research tree\""`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/ResearchWorldNodesData.ts tests/state-modules.test.ts
git commit -m "balance: align world research costs with 1000x per-world ladder"
```

---

### Task 4: Grant Lowest-Tier Starter Chibi on World Unlock + UI Notification

**Files:**
- Modify: `src/game/ResearchRelicsDomain.ts:15-24, 112-127`
- Modify: `src/game/GameState.ts:386-389`
- Modify: `src/ui/WorldsModalUi.ts:315-340`
- Modify: `src/ui/UpgradesWorldsUi.ts:456-469`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `getWorldStarterChibiId` from Task 1, `getChibiById` from `ChibiCatalog.ts`.
- Produces:
  - `unlockWorldDomain(ctx: ResearchRelicsContext, worldId: WorldId, emit: () => void): boolean` (grants `+1` starter Chibi in `ctx.miners` and marks discovered in `ctx.discovered`).
  - `GameState.getLastUnlockedStarterChibiId(worldId: WorldId): string | null` or toast message using `getWorldStarterChibiId(wid)`.

- [ ] **Step 1: Write failing tests for automatic Starter Chibi grant on World unlock**

In `tests/world-3d.test.ts`, write tests proving:
1. Unlocking `crystal` grants `+1` `'volt-kensei'` in `gs.miners`, adds `'volt-kensei'` to `gs.discovered`, leaves existing `plotUnits` untouched (no accidental overwrite of custom units), and returns `true`.
2. Calling `gs.unlockWorld('crystal')` a second time returns `false` and does NOT grant a duplicate `'volt-kensei'`.

- [ ] **Step 2: Run tests to verify failure**

Run: `cmd /c "npx vitest run tests/world-3d.test.ts -t \"Starter Chibi\""`
Expected: FAIL (`gs.miners['volt-kensei']` is undefined).

- [ ] **Step 3: Update `unlockWorldDomain` and World Unlock UI toasts**

- Ensure `ResearchRelicsContext` inherits `discovered?: Set<string>` (already present on `LootChestContext`, confirm in `LootChestDomain.ts`).
- Inside `unlockWorldDomain`: when unlocking `worldId`, resolve `starterId = getWorldStarterChibiId(worldId)`; if found, `ctx.miners[starterId] = (ctx.miners[starterId] || 0) + 1` and `ctx.discovered?.add(starterId)`.
- In `WorldsModalUi.ts` and `UpgradesWorldsUi.ts`, include the granted Starter Chibi name in the unlock toast (`Unlocked <World>! Starter Chibi gained: <Chibi Name>`).

- [ ] **Step 4: Run tests to verify pass**

Run: `cmd /c "npx vitest run tests/world-3d.test.ts -t \"Starter Chibi\""`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/ResearchRelicsDomain.ts src/game/GameState.ts src/ui/WorldsModalUi.ts src/ui/UpgradesWorldsUi.ts tests/world-3d.test.ts
git commit -m "feat: grant lowest-tier starter chibi and index discovery on world unlock"
```

---

### Task 5: Wire Runtime Effective `baseDps`, Log `mutationCost`, Tap Scaling & Update UI / Regression Tests

**Files:**
- Modify: `src/game/PlotUnitsDomain.ts:85-169, 307-425, 470-480, 755-790`
- Modify: `src/game/GameMultipliersDomain.ts:85-100`
- Modify: `src/ui/ShopModalsUi.ts:250-305`
- Modify: `src/ui/IndexModalUi.ts`, `src/ui/IndexInspectorUi.ts`
- Modify: `tests/world-3d.test.ts`, `tests/hud-modules.test.ts`

**Interfaces:**
- Consumes: `getEffectiveChibiBaseDps`, `getUnlockedWorldScaleAnchor` from Task 2.
- Produces:
  - `PlotUnitsContext` extended with optional `unlockedWorlds?: readonly WorldId[]` and `discovered?: ReadonlySet<string>`.
  - `computePlotUnitStats`, `unitScore`, `equipBestMiners`, and `getChibiUpgradeCostMult` using effective progression-capped stats when `unlockedWorlds` is present.
  - Bounded `mutationCost` formula (`Math.max(10, Math.round(12 + Math.pow(Math.max(0, Math.log10(Math.max(10, effBaseDps))), 2.35) * 0.8))`).
  - `getTapDamageDomain` including `+ Math.round(totalPlotDps * 0.03)` while keeping flat `20 + tapDamageFlat` floor.

- [ ] **Step 1: Write failing tests for log `mutationCost`, `equipBestMiners` after World unlock, tap scaling, and capped UI inspection**

In `tests/state-modules.test.ts` and `tests/world-3d.test.ts`:
- Assert W8 unit `mutationCost` is `< 5_000` Gems (not millions) and W1 unit `mutationCost` stays between `10` and `50` Gems.
- Assert `equipBestMiners()` immediately prioritizes newly granted `'volt-kensei'` (`W2`) over maxed W1 units upon unlocking W2.
- Assert `getTapDamage()` increases alongside high-tier plot DPS without out-DPSing plot units.

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `cmd /c "npx vitest run tests/world-3d.test.ts -t \"equipBestMiners|mutationCost|getTapDamage\""`
Expected: FAIL.

- [ ] **Step 3: Update `PlotUnitsDomain.ts`, `GameMultipliersDomain.ts`, and Shop/Index UI displays**

- Wire `unlockedWorlds` / `discovered` into `getChibiUpgradeCostMult` (for `Twin` & `Omega` & `DailyLogin`) and `computePlotUnitStats` / `unitScore` / `equipBestMiners`.
- Switch `mutationCost` to bounded logarithmic formula.
- Add `0.03 * getTotalPlotDps()` scaling contribution in `getTapDamageDomain` (adding `getTotalPlotDps?: () => number` on `GameMultipliersContext`, implemented by `GameState`).
- Update `ShopModalsUi.ts` (`renderPremiumShopModal` & inspector) and Index UI cards where `chibi.baseDps` is formatted to call `getEffectiveChibiBaseDps(chibi.id, this.state.unlockedWorlds, this.state.discovered)`.

- [ ] **Step 4: Run full build and full test suite, updating any hardcoded old-scale test literals in `tests/*.test.ts`**

Run: `cmd /c "npm run build && npm test"`
Fix any stale numerical assertions in `tests/world-3d.test.ts` (`oreHpMult` >= 150 still passes, check exact literals in `world-3d.test.ts` / `hud-modules.test.ts`) and re-run until exit code `0` and all tests pass.

- [ ] **Step 5: Update `GAME_MAP.md` & Commit**

Update changed line numbers/descriptions in `GAME_MAP.md`, re-run `cmd /c "npm run build && npm test"`, and commit cleanly.
