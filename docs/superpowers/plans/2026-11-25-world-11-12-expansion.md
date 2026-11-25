# World 11 (`Nightmare Hollow`) & World 12 (`Eclipse Singularity`) + Rift Tiers 11–12 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add World 11 (`Nightmare Hollow`) and World 12 (`Eclipse Singularity`) across assets, economy/drop scaling, Research trees, Index milestones, 3D arenas/sky/floor, Rift Tiers 11–12, and Fever Ult Cut-In verification.

**Architecture:** Follows the established World 9–10 pattern by extending data tables (`GameData.ts`, `ChibiCatalog.ts`, `ResearchData.ts`, `ResearchWorldNodesData.ts`, `IndexRewardsDomain.ts`, `AnomalyData.ts`), 3D biome/palette/floor registries (`MineWorldPalette.ts`, `ColosseumBiome3D.ts`, `ProceduralTextures3D.ts`), and asset directories (`public/chibi/`, `public/ores/`, `public/worlds/`) while keeping Rift UI tier bounds dynamic via `RIFT_TIER_DEFS.length`.

**Tech Stack:** TypeScript, Vite, Three.js, Tailwind CSS v4, Vitest, Python (Pillow/NumPy) for sprite/banner asset processing.

**Spec:** `docs/superpowers/specs/2026-11-25-world-11-12-expansion-design.md`

## Global Constraints

- Strict TypeScript (`no any`), all tests in `npm.cmd test` (`vitest run`) and `npm.cmd run build` (`tsc --noEmit && vite build`) must pass.
- World 11 (`id: 'nightmare'`, name `'Nightmare Hollow'`): `unlockCost: 2.4e37`, `oreHpMult: 3.99168e37`, `grindScale: 4_500`, `upgradeCostScale: 4.5e33`, `dropScale: 0.13`, `resonanceScale: 3.6`.
- World 12 (`id: 'singularity'`, name `'Eclipse Singularity'`): `unlockCost: 5.4e40`, `oreHpMult: 4.790016e41`, `grindScale: 10_000`, `upgradeCostScale: 1e37`, `dropScale: 0.105`, `resonanceScale: 4.0`.
- World 11 Ores (`bramblethorn`, `bloodmoonite`, `mawfang`, `oculite`, `vortexspire`) and Chibis (`bramble-cat`, `cleaver-bunny`, `maw-devourer`, `abyss-watcher`, `spiral-ringmaster`).
- World 12 Ores (`azurespiral`, `crimsongaze`, `duallance`, `eventhorizon`, `sovereigneclipse`) and Chibis (`azure-esper`, `crimson-esper`, `fate-duelist`, `horizon-walker`, `eclipse-monarch`).
- `CHIBI_CATALOG` expands `79 → 89`; `ORES` expands `73 → 83`; Index expands `152 → 172` entries (`18` tabs); `RIFT_TIER_DEFS` expands `10 → 12` tiers (`T11` `5e34`/`11`, `T12` `5e37`/`12`).

## Review Focus

- **Ore white-background removal erasing interior white details** (e.g. crescent crystal highlights on `bloodmoonite`, spiral rings on `azurespiral`/`crimsongaze`, fangs on `mawfang`) -> must use border-connected flood fill + edge feathering, verified visually and via non-zero center alpha check.
- **`spiral-ringmaster` (`1dbmso`) `attack` pose chair seam** -> white vertical slit on armchair right edge must be repaired/merged into the 3rd pose before WebP export so pose slicing yields exactly 4 frames without cropping the armchair.
- **Large W11–W12 numbers (`1e37`–`1e42`) across save/load & formatting** -> `GameStateSave.ts` serialization/deserialization round-trip test for W11–W12 `cash` (`5.4e40`+) and `unlockedWorlds` must preserve exact finite values.
- **`WORLD_ARENA_BIOMES` distinct `capHex` invariant** -> `nightmare` (`#d8b4fe`) and `singularity` (`#fca5a5`) must not collide with any existing W1–W10 `capHex`.
- **Rift UI dynamic tier ceiling** -> `RiftModalUi.ts` and `RiftArenaHudUi.ts` must display `1–12` and `/ 12` dynamically from `RIFT_TIER_DEFS.length`, never hardcoded `10`.

---

### Task 1: Process Chibi, Ore, and Banner Assets into `public/`

**Files:**
- Create: `public/worlds/nightmare.webp`, `public/worlds/singularity.webp`
- Create: `public/ores/{bramblethorn,bloodmoonite,mawfang,oculite,vortexspire,azurespiral,crimsongaze,duallance,eventhorizon,sovereigneclipse}.webp`
- Create: `public/chibi/{bramble-cat,cleaver-bunny,maw-devourer,abyss-watcher,spiral-ringmaster,azure-esper,crimson-esper,fate-duelist,horizon-walker,eclipse-monarch}/{idle,walk,attack,pose}.webp`
- Test: `tests/world-3d.test.ts` (asset existence check via Task 2/5)

**Interfaces:**
- Produces: 2 `1376×768` RGB `.webp` world banners, 10 `256×256` RGBA transparent `.webp` ores, and 40 `~300px`-tall RGBA `.webp` chibi pose sprites matching `ChibiCatalog.ts` and `GameData.ts` IDs.

- [ ] **Step 1: Write temporary Python asset processor in `.gemini/.../scratch/`**
  - Process the 2 uploaded JPG banners (`media_1795603336474_add89c0b.jpg` → `nightmare.webp`, `media_1795603697358_1966f9a3.jpg` → `singularity.webp`) to `1376×768` RGB WebP (`quality=90`).
  - Process the 10 uploaded Ore JPGs using border-connected BFS/flood-fill white-background removal (`luma >= 242` & low saturation connected to edges, plus 1px soft alpha anti-alias fringe), trim to tight opaque bbox, pad/center onto `256×256` RGBA canvas, save as WebP (`lossless=False, quality=92`).
  - Process the 10 Chibi sheets in `C:\Users\HDD\Downloads\world 11 dan 12\*.png`: compute horizontal alpha projection, group into 4 pose regions (explicitly handling `1dbmso` armchair right-edge fragment so it merges into pose 3 and inpainting/cleaning the white seam), trim tight bbox, scale each pose proportionally to `height = 300px` (`LANCZOS`), and save `{idle,walk,attack,pose}.webp`.
- [ ] **Step 2: Run the script and visually inspect outputs**
  - Run `python <scratch_script>.py` and verify dimensions/modes (`(1376, 768) RGB`, `(256, 256) RGBA`, `(*, 300) RGBA`) plus `read_file` visual spot-check on `nightmare.webp`, `singularity.webp`, `bloodmoonite.webp`, `azurespiral.webp`, and `spiral-ringmaster/attack.webp`.

---

### Task 2: Add W11–W12 Chibis, Worlds, Ores, Economy Scaling & Resonance to `ChibiCatalog.ts` & `GameData.ts`

**Files:**
- Modify: `src/game3d/ChibiCatalog.ts`
- Modify: `src/game/GameData.ts`
- Test: `tests/world-3d.test.ts`, `tests/state-modules.test.ts`

**Interfaces:**
- Consumes: Task 1 asset file paths (`/chibi/<id>/*.webp`, `/ores/<id>.webp`).
- Produces:
  - `WorldId` union including `'nightmare' | 'singularity'`
  - `CHIBI_CATALOG` (`89` entries)
  - `WORLDS` (`12` entries), `ORES` (`83` entries), `WORLD_MINERS` (`60` miners across 12 worlds), `WORLD_GRIND_SCALE`, `WORLD_UPGRADE_COST_SCALE`, `WORLD_MINER_DROP_SCALE`, `WORLD_RESONANCE_WORLD_SCALES`

- [ ] **Step 1: Write failing tests in `tests/world-3d.test.ts` and `tests/state-modules.test.ts`**
  - Update `CHIBI_CATALOG.length` expectation to `89` and add W11 (`Nightmare Hollow`) & W12 (`Eclipse Singularity`) ore assertions (5 ores each, exact names/rarities, `chancePct` sum `100`, monotonic `sellValue`) in `tests/world-3d.test.ts`.
  - Extend `grindSteps` in `tests/state-modules.test.ts` to `[1, 2.5, 6, 15, 35, 80, 180, 400, 900, 2_000, 4_500, 10_000]`, add starter Chibi assertions (`getWorldStarterChibiId('nightmare') === 'bramble-cat'`, `getWorldStarterChibiId('singularity') === 'azure-esper'`), update `getLatestWorldScaleAnchor()` expectation to `'singularity'` (`1e35`), and add `GameStateSave` round-trip test with `cash = 5.4e40` + `unlockedWorlds` containing `'nightmare'` & `'singularity'`.
- [ ] **Step 2: Run tests to verify failure**
  - Run: `npx.cmd vitest run tests/state-modules.test.ts tests/world-3d.test.ts`
  - Expected: FAIL (`CHIBI_CATALOG.length` is `79`, `WORLDS.length` is `10`).
- [ ] **Step 3: Implement W11–W12 Chibis and World/Ore/Scaling entries**
  - Append the 10 new `ChibiDef` entries to `CHIBI_CATALOG` in `src/game3d/ChibiCatalog.ts` (`baseDps` `1e31..1e32` for W11, `1e34..1e35` for W12).
  - Extend `WorldId`, `WORLD_GRIND_SCALE`, `WORLDS`, `WORLD_UPGRADE_COST_SCALE`, `ORES`, `WORLD_MINER_DROP_SCALE`, `WORLD_MINERS`, and `WORLD_RESONANCE_WORLD_SCALES` in `src/game/GameData.ts`.
- [ ] **Step 4: Run tests to verify data/catalog checks pass**
  - Run: `npx.cmd vitest run tests/world-3d.test.ts -t "CHIBI_CATALOG|World 9|World 11|World 12"` (or full relevant block after Task 3).

---

### Task 3: Add Research Trees, Index Milestones, Save Support & Dev Unlocker

**Files:**
- Modify: `src/game/ResearchData.ts`
- Modify: `src/game/ResearchWorldNodesData.ts`
- Modify: `src/game/GameStateSave.ts`
- Modify: `src/game/IndexRewardsDomain.ts`
- Modify: `src/main.ts`
- Test: `tests/state-modules.test.ts`

**Interfaces:**
- Consumes: `WorldId` (`'nightmare' | 'singularity'`), `WORLDS`, `ORES`, `CHIBI_CATALOG` from Task 2.
- Produces: `NIGHTMARE_NODES`, `SINGULARITY_NODES`, `RESEARCH_TREE_META` entries, `createEmptyResearchLevels()` entries, `TAB_MILESTONE_CONFIG` entries (`172` Index entries / `18` tabs).

- [ ] **Step 1: Add Index `172` and W11–W12 Research tests in `tests/state-modules.test.ts`**
  - Assert `getTotalIndexCountDomain() === 172` and `ALL_INDEX_TABS` includes `'nightmare'` & `'singularity'`, while Research ladder test automatically validates all 12 worlds.
- [ ] **Step 2: Implement Research trees, Save defaults, Index milestones, and Dev unlocker**
  - Add `'nightmare' | 'singularity'` to `ResearchTreeId`, `RESEARCH_TREE_META`, and `RESEARCH_NODES` in `src/game/ResearchData.ts`.
  - Add `NIGHTMARE_NODES` (`nm`, `root: 2.7e37`, `apex: 2.7e39`, `valuePerLv: 0.45`) and `SINGULARITY_NODES` (`sg`, `root: 6e40`, `apex: 6e42`, `valuePerLv: 0.48`) in `src/game/ResearchWorldNodesData.ts`.
  - Add `nightmare: {}` and `singularity: {}` to `createEmptyResearchLevels()` in `src/game/GameStateSave.ts` (and update JSDoc `13 research trees`).
  - Add `nightmare` and `singularity` milestone configs to `TAB_MILESTONE_CONFIG` in `src/game/IndexRewardsDomain.ts`.
  - Append the 10 new W11–W12 Chibi IDs to `LOCAL_DEV_NEW_CHIBI_IDS` in `src/main.ts`.
- [ ] **Step 3: Run `tests/state-modules.test.ts` to verify economy, Research, Save & Index pass**
  - Run: `npx.cmd vitest run tests/state-modules.test.ts`

---

### Task 4: Extend Dimensional Rift to Tiers 11–12 & Dynamic UI Bounds

**Files:**
- Modify: `src/game/AnomalyData.ts`
- Modify: `src/ui/RiftModalUi.ts`
- Modify: `src/ui/RiftArenaHudUi.ts`
- Test: `tests/state-modules.test.ts`, `tests/hud-modules.test.ts`

**Interfaces:**
- Consumes: `RIFT_TIER_DEFS` in `src/game/AnomalyData.ts`.
- Produces: `RIFT_TIER_DEFS` (`12` entries ending at `T12 W12 Singularity`), dynamic UI tier strings in `RiftModalUi.ts` & `RiftArenaHudUi.ts`, plus Fever Ult Cut-In verification test for W11–W12 Chibis in `tests/hud-modules.test.ts`.

- [ ] **Step 1: Write failing tests in `tests/state-modules.test.ts` and `tests/hud-modules.test.ts`**
  - Update `RIFT_TIER_DEFS` test to assert length `12`, `tier 11` (`damageTarget: 5e34`, `shards: 11`, `dropChance: 0.14`), and `tier 12` (`damageTarget: 5e37`, `shards: 12`, `dropChance: 0.16`).
  - Add HUD assertions in `tests/hud-modules.test.ts`: `RiftModalUi` renders `TIER 1–12 DAMAGE TARGETS` & `Tier 12`, `RiftArenaHudUi` renders `CLIMB TIER 1–12` & `TIER ... / 12`, and `triggerFeverUltCutInDom` renders W11 (`spiral-ringmaster`) and W12 (`eclipse-monarch`) cleanly with `attack.webp` and `Secret` badge.
- [ ] **Step 2: Run targeted tests to confirm failure**
  - Run: `npx.cmd vitest run tests/hud-modules.test.ts -t "Rift|cut-in"`
- [ ] **Step 3: Implement Rift T11–T12 data & dynamic UI labels**
  - Add Tier 11 & 12 to `RIFT_TIER_DEFS` and update `getRiftTierProgress` JSDoc in `src/game/AnomalyData.ts`.
  - Replace hardcoded `10` with `${RIFT_TIER_DEFS.length}` in `src/ui/RiftModalUi.ts` and `src/ui/RiftArenaHudUi.ts`.
- [ ] **Step 4: Run `tests/hud-modules.test.ts` and `tests/state-modules.test.ts`**
  - Run: `npx.cmd vitest run tests/hud-modules.test.ts tests/state-modules.test.ts`

---

### Task 5: Add 3D Biomes, Palettes & Pit Rune Floor Motifs for W11–W12 + Full Verification

**Files:**
- Modify: `src/game3d/MineWorldPalette.ts`
- Modify: `src/game3d/ColosseumBiome3D.ts`
- Modify: `src/game3d/ProceduralTextures3D.ts`
- Modify: `GAME_MAP.md`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `WorldId` (`'nightmare' | 'singularity'`).
- Produces: `WORLD_PALETTES` (`12` entries), `WORLD_ARENA_BIOMES` (`12` entries with distinct `capHex`), and `getCircularNexusPoolTexture` motifs for `'nightmare'` & `'singularity'`.

- [ ] **Step 1: Add W11–W12 3D biome & palette assertions to `tests/world-3d.test.ts`**
  - Assert `WORLD_PALETTES.nightmare` & `WORLD_PALETTES.singularity` exist and `getCircularNexusPoolTexture(WORLD_PALETTES.nightmare, 'nightmare')` / `singularity` generate valid textures without throwing.
- [ ] **Step 2: Implement 3D palettes, Colosseum biomes & rune textures**
  - Add `nightmare` and `singularity` to `WORLD_PALETTES` in `src/game3d/MineWorldPalette.ts`.
  - Add `nightmare` (`capHex: '#d8b4fe'`) and `singularity` (`capHex: '#fca5a5'`) to `WORLD_ARENA_BIOMES` in `src/game3d/ColosseumBiome3D.ts`.
  - Add `'nightmare'` (spiral rings & gothic thorns) and `'singularity'` (crimson-cyan eclipse accretion ring & 12 radial shards) branches to `getCircularNexusPoolTexture` in `src/game3d/ProceduralTextures3D.ts`.
- [ ] **Step 3: Run full test suite & TypeScript/Vite production build**
  - Run: `npm.cmd test && npm.cmd run build`
  - Expected: All test files pass (`0` failures) and `tsc --noEmit && vite build` exits with code `0`.
- [ ] **Step 4: Update `GAME_MAP.md` & perform browser smoke test**
  - Update line counts, `89` Chibis, `83` Ores, `172` Index entries, `12` Worlds, `T1–T12` Rift Tiers, and asset counts in `GAME_MAP.md`.
  - Verify live rendering in headless/built-in browser (`http://localhost:5173/?unlock=1`) covering W11 & W12 world teleport banners, pit ores, Chibi sprites, and Fever Ult cut-in.
