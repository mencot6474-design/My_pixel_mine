# Tahap C `GameState.ts` Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memecah [GameState.ts](../../../src/game/GameState.ts) (`2,467` baris) menjadi thin facade (`~480–620` baris) dengan mengekstrak 5 modul domain kohesif di `src/game/` (`GameStateSave.ts`, `PlotUnitsDomain.ts`, `TowerRunDomain.ts`, `LootChestDomain.ts`, `ShopWeatherDomain.ts`) tanpa mengubah public API, save format, RNG semantics, maupun perilaku gameplay.

**Architecture:** Setiap modul domain mendefinisikan narrow structural context interface (`*Context`) tanpa mengimpor `GameState` saat runtime (anti-circular DAG). `GameState` menyimpan state fields, event `subscribe`/`emit`, research/world/relic multipliers, serta mendelegasikan method ke masing-masing modul domain. Re-export tipe lama (`PlotUnitState`, `SavePayload`, `ResearchLevelsMap`) dan `getChibiUpgradeCostMult` tetap dipertahankan di `GameState.ts`.

**Tech Stack:** TypeScript 5.8 (strict, zero `any`, `noUnusedLocals`), Vite 7, Vitest 3.

**Spec:** [docs/superpowers/specs/2026-11-18-tahap-c-gamestate-modularization-design.md](../specs/2026-11-18-tahap-c-gamestate-modularization-design.md)

## Global Constraints

- Strict TypeScript tanpa `any`, patuhi `noUnusedLocals` & `noUnusedParameters`.
- Zero breaking changes: semua caller (`src/main.ts`, `src/ui/*.ts`, `tests/world-3d.test.ts`, `tests/hud-modules.test.ts`) tetap berjalan 100% tanpa ubah signature.
- Jangan jalankan `git commit` / `git push` sebelum user meminta.

## Review Focus

1. [src/game/GameState.ts](../../../src/game/GameState.ts) `< ~650` baris dan setiap modul domain baru di `src/game/` berada di kisaran `~270–480` baris dengan zero circular import.
2. Urutan `emit()` / `save()` (note: `GameState.emit()` otomatis menyimpan & memberitahu listener) dipertahankan persis di setiap mutasi state.
3. Migrasi save legacy (`LEGACY_ORE_ID_MAP`), sanitasi excess plot pickaxe refund, sanitasi corrupt `localStorage`, dan `discovered` resync pada `load()` tidak mengalami regresi.
4. `npm.cmd test`, `npm.cmd run build`, dan fresh final code review lulus bersih tanpa temuan *Critical*/*Important*.

---

### Task 1: Ekstrak `src/game/GameStateSave.ts` (Save/Load & Legacy Migration)

**Files:**
- Create: `src/game/GameStateSave.ts`
- Modify: `src/game/GameState.ts`
- Test: `tests/state-modules.test.ts`

- [ ] **Step 1: Write failing tests in `tests/state-modules.test.ts`**
  Uji `migrateOreId`, `isValidIndexId`, `createEmptyResearchLevels`, `serializeGameSave`, dan `deserializeGameSave` (migrasi legacy ore ID di `ores`/`chestOres`/`lockedOreIds`/`discovered`, refund pickaxe dari plot berlebih, clamp `towerKeys`, invalid weather guard, corrupt JSON fallback).
- [ ] **Step 2: Run `.\node_modules\.bin\vitest.cmd run tests/state-modules.test.ts` -> expect FAIL**
- [ ] **Step 3: Create `src/game/GameStateSave.ts` & delegate `save()`/`load()` in `src/game/GameState.ts`**
- [ ] **Step 4: Run `vitest` & `tsc --noEmit` -> expect PASS**

---

### Task 2: Ekstrak `src/game/PlotUnitsDomain.ts` (Stats, DPS, Star-Up, Plot Ops & `equipBestMiners`)

**Files:**
- Create: `src/game/PlotUnitsDomain.ts`
- Modify: `src/game/GameState.ts`
- Test: `tests/state-modules.test.ts`

- [ ] **Step 1: Write failing tests for `PlotUnitsDomain` in `tests/state-modules.test.ts`**
  Uji `getChibiUpgradeCostMult`, `computePlotUnitStats`, `computeDpsBreakdown`, `starUpChibi` (`invalid`/`insufficient`/`max`), `stash`/`pop` preservation via `equipBestMiners`, dan batas eksklusivitas 1-per-unit Enchant/Chibi.
- [ ] **Step 2: Run `vitest` -> expect FAIL**
- [ ] **Step 3: Implement `src/game/PlotUnitsDomain.ts` & delegate from `src/game/GameState.ts`**
- [ ] **Step 4: Run `vitest` & `tsc --noEmit` -> expect PASS**

---

### Task 3: Ekstrak `src/game/TowerRunDomain.ts` (Battle Tower Keys, Wave/Boss Combat & Sweep)

**Files:**
- Create: `src/game/TowerRunDomain.ts`
- Modify: `src/game/GameState.ts`
- Test: `tests/state-modules.test.ts`

- [ ] **Step 1: Write failing tests for `TowerRunDomain` in `tests/state-modules.test.ts`**
  Uji key regen calculation, Tower start run / fail on 0 keys, Wave 10 Boss invulnerability guard + anti-one-hit damage cap, 5s blessing auto-pick on `stepTowerTick`, dan `quickSweepTower` checkpoint guard.
- [ ] **Step 2: Run `vitest` -> expect FAIL**
- [ ] **Step 3: Implement `src/game/TowerRunDomain.ts` & delegate from `src/game/GameState.ts`**
- [ ] **Step 4: Run `vitest` & `tsc --noEmit` -> expect PASS**

---

### Task 4: Ekstrak `src/game/LootChestDomain.ts` (Hotbar 1–9, Ore/Meteor Drops & Chest Auto-Sell)

**Files:**
- Create: `src/game/LootChestDomain.ts`
- Modify: `src/game/GameState.ts`
- Test: `tests/state-modules.test.ts`

- [ ] **Step 1: Write failing tests for `LootChestDomain` in `tests/state-modules.test.ts`**
  Uji `compactHotbarSlots`, `swapHotbarSlots`, auto-sell rarity & ore lock interaction pada `onOreBroken`, +35% Full-Chest Bonus pada `sellAllChestOres`, serta reward `onMeteorBroken`.
- [ ] **Step 2: Run `vitest` -> expect FAIL**
- [ ] **Step 3: Implement `src/game/LootChestDomain.ts` & delegate from `src/game/GameState.ts`**
- [ ] **Step 4: Run `vitest` & `tsc --noEmit` -> expect PASS**

---

### Task 5: Ekstrak `src/game/ShopWeatherDomain.ts` (Pickaxe, Gem Shop/Potions, Sell Batch & Weather)

**Files:**
- Create: `src/game/ShopWeatherDomain.ts`
- Modify: `src/game/GameState.ts`
- Test: `tests/state-modules.test.ts`

- [ ] **Step 1: Write failing tests for `ShopWeatherDomain` in `tests/state-modules.test.ts`**
  Uji `refreshPickaxeStockIfDue`, `buyPickaxe` (`bought`/`sold_out`/`no_cash`), `sellBatch` (ore/miner/pickaxe keys), `useGemPotion` stacking duration, dan `syncWeather`/`scaleWeatherMult` dengan relic buff.
- [ ] **Step 2: Run `vitest` -> expect FAIL**
- [ ] **Step 3: Implement `src/game/ShopWeatherDomain.ts` & delegate from `src/game/GameState.ts`**
- [ ] **Step 4: Run `vitest` & `tsc --noEmit` -> expect PASS**

---

### Task 6: Audit Ukuran & Dependencies, Full Test & Build, Fresh Review & `GAME_MAP.md` Update

**Files:**
- Modify: `GAME_MAP.md`

- [ ] **Step 1: Audit line counts (`GameState.ts < 650`), zero `any`, zero circular imports across `src/game/*.ts`**
- [ ] **Step 2: Run `npm.cmd test && npm.cmd run build`**
- [ ] **Step 3: Run fresh code reviewer (`self`) against Tahap C diff & design spec; fix any issues found**
- [ ] **Step 4: Update `GAME_MAP.md` inventory & line counts; re-run `npm.cmd test && npm.cmd run build` after final edit**
