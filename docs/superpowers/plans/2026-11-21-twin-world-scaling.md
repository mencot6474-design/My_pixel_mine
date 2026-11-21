# Twin Tier Auto-Scaling & Non-Sellable Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically scale `twin` tier `baseDps` and `upgradeCostScale` to match the latest World in `WORLDS` / `WORLD_MINERS` whenever new Worlds (`W9+`) are added, while guaranteeing all `twin` Chibis remain non-sellable.

**Architecture:** Store `dpsMult` and `upgradeCostMult` on `PREMIUM_SHOP_ITEMS` in `PremiumShopData.ts`, compute the latest-world anchor (`WORLDS[last]` highest miner `baseDps` + progressive `WORLD_UPGRADE_COST_SCALE`) in `GameData.ts` using pure helpers, and sync `CHIBI_CATALOG` `twin` entries at module initialization without circular imports. `PlotUnitsDomain.ts` consumes `getWorldUpgradeCostScale` and `getTwinUpgradeCostScale`, while `DailyLoginData.ts` reinforces `isNonSellableChibi` for `rarity === 'twin'`.

**Tech Stack:** TypeScript (strict), Vitest (`npm.cmd test`), Vite (`npm.cmd run build`)

**Spec:** [docs/superpowers/specs/2026-11-21-twin-world-scaling-design.md](file:///c:/Users/HDD/Documents/my_chibi_mine/docs/superpowers/specs/2026-11-21-twin-world-scaling-design.md)

## Global Constraints

- Strict TypeScript (no `any`), zero circular imports across `ChibiCatalog.ts`, `PremiumShopData.ts`, `DailyLoginData.ts`, `GameData.ts`, and `PlotUnitsDomain.ts`.
- Only tier `twin` auto-scales; `fusion` and `limited` remain unchanged.
- `twin` `baseDps` multipliers against latest-world Secret DPS: `2.3`, `2.75`, `3.2`, `3.65`, `4.1` with 2-significant-digit nice rounding (yields `10M`, `12M`, `14M`, `16M`, `18M` at W8 `4.4M`).
- `twin` `upgradeCostScale` multipliers against latest-world upgrade scale: `11`, `14`, `17.5`, `21`, `25` (yields `220B..500B` at W8 `20B`), with `×30` progressive fallback per world beyond W8.
- Every `twin` Chibi (`rarity === 'twin'` or `isPremiumShopChibi`) must be non-sellable (`getSellableMinerCountDomain === 0`, `sellMinerDomain === 0`).
- Verify with `npm.cmd test` and `npm.cmd run build`, and update `GAME_MAP.md`.

## Review Focus

- Adding a new World `W9` to `WORLDS` before adding its miners to `WORLD_MINERS` must gracefully walk backward to the latest populated world's highest miner DPS instead of returning `0` or `NaN`.
- Powers-of-10 boundary values in `computeTwinScaledBaseDps` (e.g., `1000`, `10_000_000`) must avoid floating-point `Math.log10` precision off-by-one errors.
- Calling `getWorldUpgradeCostScale` for a future WorldId beyond W8 (absent from `WORLD_UPGRADE_COST_SCALE`) must return `20_000_000_000 * 30^(delta)` instead of falling back to `1`.
- Importing `ChibiCatalog.ts` alone must keep valid W8 default `baseDps` values, and importing `GameData.ts` must sync `CHIBI_CATALOG` immediately with zero circular dependency errors.
- A hypothetical `rarity: 'twin'` Chibi even outside `PREMIUM_SHOP_ITEMS` (plus all 5 shop Twins) must return `true` from `isNonSellableChibi`, `0` from `getSellableMinerCount`, and `0` from `sellMiner` (even with `sellAll = true` and excess duplicates).

---

### Task 1: Pure Twin Scaling Helpers, World Cost Scale Anchor & Non-Sellable Guard

**Files:**
- Modify: `src/game/PremiumShopData.ts:3-88`
- Modify: `src/game/GameData.ts:1-130,340-350,735-747`
- Modify: `src/game/PlotUnitsDomain.ts:84-125`
- Modify: `src/game/DailyLoginData.ts:1-92`
- Test: `tests/state-modules.test.ts`

**Interfaces:**
- Produces in `src/game/PremiumShopData.ts`:
  - `PremiumShopItemDef` with `dpsMult: number` and `upgradeCostMult: number`
  - `computeTwinScaledBaseDps(secretBaseDps: number, dpsMult: number): number`
  - `computeTwinUpgradeCostScale(worldCostScale: number, upgradeCostMult: number): number`
- Produces in `src/game/GameData.ts`:
  - `WORLD_UPGRADE_COST_SCALE: Record<string, number>`
  - `getWorldUpgradeCostScale(worldId: WorldId, worlds?: readonly WorldDef[]): number`
  - `getLatestWorldScaleAnchor(worlds?: readonly WorldDef[], worldMiners?: readonly WorldMinerEntry[]): { worldId: WorldId; secretBaseDps: number; upgradeCostScale: number }`
  - `syncTwinCatalogDpsFromAnchor(anchor?: { secretBaseDps: number }): void`
- Consumes in `src/game/PlotUnitsDomain.ts`:
  - `getWorldUpgradeCostScale`, `getLatestWorldScaleAnchor` from `./GameData`
  - `computeTwinUpgradeCostScale` from `./PremiumShopData`
- Produces in `src/game/DailyLoginData.ts`:
  - `isNonSellableChibi(chibiId: string): boolean` checking `NON_SELLABLE_CHIBI_IDS`, `getFusionRecipeByResultChibiId`, `isPremiumShopChibi`, and `getChibiById(chibiId)?.rarity === 'twin'`.

- [ ] **Step 1: Write the failing unit tests in `tests/state-modules.test.ts`**

Add a new `describe` block (or extend the Premium Shop `describe` block) in `tests/state-modules.test.ts` testing:
1. Current W8 scaling matches exact values: `yukikage-twins`..`clockwork-twins` `baseDps` = `10_000_000`, `12_000_000`, `14_000_000`, `16_000_000`, `18_000_000`, and `getChibiUpgradeCostMult` = `220B`, `280B`, `350B`, `420B`, `500B`.
2. Pure `computeTwinScaledBaseDps` handles normal numbers, W9 simulation (`25_000_000 * 2.3` -> `58_000_000`), powers-of-10 boundaries (`1000`), and invalid/non-positive inputs (`0` -> `1`).
3. Simulated W9 anchor in `getLatestWorldScaleAnchor` + `syncTwinCatalogDpsFromAnchor` (e.g., adding a fake W9 world + miner with `25_000_000` DPS) scales anchor `secretBaseDps` to `25_000_000`, `upgradeCostScale` to `600_000_000_000` (`20B * 30`), and falls back gracefully if W9 has no miners yet.
4. `fusion` Chibis (`glitch-cheshire`..`aether-monarch`) remain unaffected when W9 anchor is simulated.
5. `twin` Chibis (even with `miners[id] = 5` and unplaced) remain non-sellable (`isNonSellableChibi`, `getSellableMinerCount === 0`, `sellMiner(id, true) === 0`, and `sellBatch([{ kind: 'miner', id }])` earns `0`).

- [ ] **Step 2: Run Vitest on `tests/state-modules.test.ts` to verify failure**

Run: `npx.cmd vitest run tests/state-modules.test.ts`
Expected: FAIL because `computeTwinScaledBaseDps`, `getWorldUpgradeCostScale`, and `getLatestWorldScaleAnchor` are not exported yet.

- [ ] **Step 3: Implement `dpsMult`, `upgradeCostMult`, `computeTwinScaledBaseDps`, and `computeTwinUpgradeCostScale` in `src/game/PremiumShopData.ts`**

Replace hardcoded `upgradeCostScale` on `PremiumShopItemDef` / `PREMIUM_SHOP_ITEMS` with `dpsMult` (`2.3`, `2.75`, `3.2`, `3.65`, `4.1`) and `upgradeCostMult` (`11`, `14`, `17.5`, `21`, `25`), and export the two pure calculation helpers using 2-significant-digit nice rounding (`Math.floor(Math.log10(raw) + 1e-12)`).

- [ ] **Step 4: Implement `WORLD_UPGRADE_COST_SCALE`, `getWorldUpgradeCostScale`, `getLatestWorldScaleAnchor`, and `syncTwinCatalogDpsFromAnchor` in `src/game/GameData.ts`**

Move `WORLD_UPGRADE_COST_SCALE` into `GameData.ts`, add progressive `×30` fallback for any world index beyond the last explicit entry, compute `getLatestWorldScaleAnchor` walking backward from the last world in `WORLDS` with populated `WORLD_MINERS`, and invoke `syncTwinCatalogDpsFromAnchor()` right after `WORLD_MINERS` is defined.

- [ ] **Step 5: Wire `PlotUnitsDomain.ts` and `DailyLoginData.ts`**

Update `getChibiUpgradeCostMult` in `PlotUnitsDomain.ts` to import `getWorldUpgradeCostScale` and `getLatestWorldScaleAnchor` from `./GameData` and compute `twin` upgrade cost scale via `computeTwinUpgradeCostScale(anchor.upgradeCostScale, premiumItem.upgradeCostMult)`. Update `isNonSellableChibi` in `DailyLoginData.ts` to also return `true` when `getChibiById(chibiId)?.rarity === 'twin'`.

- [ ] **Step 6: Run tests to verify Task 1 passes**

Run: `npx.cmd vitest run tests/state-modules.test.ts`
Expected: PASS

---

### Task 2: Full Verification & `GAME_MAP.md` Documentation Sync

**Files:**
- Modify: `GAME_MAP.md`

- [ ] **Step 1: Run full Vitest suite and production build**

Run: `npm.cmd test` and `npm.cmd run build`
Expected: All test suites pass (`tests/hud-modules.test.ts`, `tests/state-modules.test.ts`, `tests/world-3d.test.ts`) and `tsc --noEmit && vite build` succeeds with exit code 0.

- [ ] **Step 2: Update `GAME_MAP.md` line counts & symbols**

Re-measure line counts for `PremiumShopData.ts`, `GameData.ts`, `PlotUnitsDomain.ts`, `DailyLoginData.ts`, and `tests/state-modules.test.ts` with `Get-Content`/`Select-String` and document `getLatestWorldScaleAnchor`, `computeTwinScaledBaseDps`, `getWorldUpgradeCostScale`, and `twin` auto-scaling in `GAME_MAP.md`.

- [ ] **Step 3: Re-run `npm.cmd test` and `npm.cmd run build` after final edit**

Run: `npm.cmd test && npm.cmd run build`
Expected: Clean pass, zero TypeScript or build errors.
