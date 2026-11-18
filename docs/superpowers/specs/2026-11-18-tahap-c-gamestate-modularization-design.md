# Design Spec: Tahap C — Modularisasi `src/game/GameState.ts` (Opsi 2)

## 1. Intent & Scope
Memecah [GameState.ts](../../../src/game/GameState.ts) (`2,467` baris) menjadi thin state coordinator (`~480–620` baris, di bawah batas arsitektur `< ~800–1,000` baris) dengan mengekstrak 5 modul domain ramping di `src/game/`.

**Batasan ketat:**
- Pertahankan 100% public properties, method signatures, getter values, RNG semantics (`rng: () => number`), event `emit()` timing, dan backward-compatible re-exports (`PlotUnitState`, `SavePayload`, `ResearchLevelsMap`) dari `GameState.ts`.
- Tidak mengubah satu pun caller di `src/ui/`, `src/main.ts`, `src/game3d/`, maupun test suite yang ada (`tests/world-3d.test.ts`, `tests/hud-modules.test.ts`).
- Anti-circular dependency: setiap modul domain mendefinisikan interface context struktural miliknya sendiri dan **tidak** mengimpor `GameState` sebagai runtime dependency.

## 2. Pembagian 5 Modul Domain + Facade

1. **`src/game/GameStateSave.ts`** *(baru, estimasi ~380–420 baris)*
   - Memindahkan `SAVE_KEY`, `LEGACY_ORE_ID_MAP`, `migrateOreId`, `isValidIndexId`, `ResearchLevelsMap`, `createEmptyResearchLevels`, `PlotUnitState`, `SavePayload`.
   - Menyediakan `serializeSavePayload(state)` & `deserializeIntoGameState(state, raw)` untuk `save()` / `load()`, termasuk sanitasi plot berlebih, stash cleanup, migrasi ore legacy, dan sinkronisasi `discovered`.

2. **`src/game/PlotUnitsDomain.ts`** *(baru, estimasi ~440–480 baris)*
   - Mengekstrak `getChibiUpgradeCostMult` (di-re-export juga oleh `GameState.ts`), kalkulasi stats unit & DPS (`getPlotUnitStats`, `getTotalPlotDps`, `getDpsBreakdown`), Chibi Star-Up & World Resonance helpers (`getChibiStar`, `getSpareChibiDuplicates`, `canStarUpChibi`, `starUpChibi`, `autoStarUpAll`, `getActiveWorldResonances`, `getWorldResonanceDmgBonusPct`, `getActiveStarDropAndGemBonus`), manajemen plot/stash (`equipChibiOnPlot`, `placeHotbarItemOnPlot`, `placeSelectedOnPlot`, `removeMinerFromPlot`, `stashPlotUnit`, `popStashedUnit`, `trimStashedUnits`), upgrade/pickaxe/mutasi/enchant slot, serta `equipBestMiners`.

3. **`src/game/TowerRunDomain.ts`** *(baru, estimasi ~430–460 baris)*
   - Mengekstrak seluruh state machine & combat Gem Tower: `syncTowerKeys`, `getTowerNextKeyRegenSec`, `getTowerUnitEffectiveDps`, `getTowerSlotStrikeDamage`, `getTowerEffectiveDps`, `getTowerEffectiveTapDamage`, `setupTowerWave`, `startTowerRun`, `completeCurrentTowerWaveOrFloor`, `finishTowerRun`, `stepTowerTick`, `applyTowerTargetDamage`, `applyTowerChibiStrike`, `tapTowerTarget`, `tapTowerMonolith`, `chooseTowerBlessing`, `abandonTowerRun`, `quickSweepTower`, `buyTowerKeyWithGems`, dan `grantFreeTowerKey`.

4. **`src/game/LootChestDomain.ts`** *(baru, estimasi ~310–350 baris)*
   - Mengekstrak pengelolaan Hotbar 1–9 (`selectHotbarSlot`, `clearHotbarSelection`, `swapHotbarSlots`, `addItemToHotbarIfSpace`, `compactHotbar`, `removeFromHotbar`, `toggleHotbarItem`), drop tambang & meteor (`onOreBroken`, `onMeteorBroken`), dan Chest Vault / Auto-Sell (`getChestItemCount`, `takeAllFromChest`, `isChestFullBonusReady`, `isOreLocked`, `toggleOreLock`, `isAutoSellRarity`, `shouldAutoSellOre`, `toggleAutoSellRarity`, `sellAllChestOres`, `toggleAutoSell`).

5. **`src/game/ShopWeatherDomain.ts`** *(baru, estimasi ~270–310 baris)*
   - Mengekstrak ekonomi jual-beli & restock Pickaxe (`applySellOre`, `sellOre`, `sellAllOres`, `getSellableMinerCount`, `applySellMiner`, `sellMiner`, `refreshPickaxeStockIfDue`, `getPickaxeRestockRemainingSec`, `buyPickaxe`, `applySellPickaxe`, `sellPickaxe`, `sellBatch`), Gem Shop & potion boost (`buyGemShopItem`, `useGemPotion`, `getBoostRemainingSec`, `isBoostActive`), serta Weather state/multipliers (`getActiveWeather`, `getWeatherRemainingSec`, `scaleWeatherMult`, `getWeatherDamageMult`, `getWeatherOreDropMult`, `getWeatherGemDropMult`, `syncWeather`, `forceWeather`).

6. **[GameState.ts](../../../src/game/GameState.ts)** *(thin facade, target ~480–620 baris)*
   - Menampung seluruh public fields state, `subscribe()`/`emit()`, research trees & world unlocking (`isWorldUnlocked`..`setActiveWorld`), global multipliers (`getTapDamage`..`getMutationLuckMult`), Relic Forge & Enchant Dice roll (`hasCraftedRelic`..`rollEnchant`), `grantAdGems`, serta delegasi tipis ke 5 modul domain di atas.

## 3. Verifikasi & Aturan Kerja
- **Strict TypeScript:** nol `any`, patuhi `noUnusedLocals` & `noUnusedParameters`, bebas circular runtime import antar modul `src/game/`.
- **Unit Test Baru (`tests/state-modules.test.ts`):** menguji edge case terisolasi per modul domain (legacy save migration + corrupt save guard + plot count sanitization, Star-Up/EquipBest/stash preserve, Tower combat/blessing/sweep, Auto-Sell/Chest bonus/Hotbar swap, Pickaxe restock/Weather rotation) berdampingan dengan semua spec di `tests/world-3d.test.ts` & `tests/hud-modules.test.ts`.
- **Verifikasi Wajib:**
  1. `npm.cmd test` (semua spec `world-3d` + `hud-modules` + `state-modules` lulus)
  2. `npm.cmd run build` (`tsc --noEmit && vite build` exit 0)
  3. Fresh code review (`self`) + perbarui [GAME_MAP.md](../../../GAME_MAP.md) untuk daftar modul & line counts terbaru.
- **Git constraint:** Jangan jalankan `git commit` atau `git push` sebelum user memberi perintah eksplisit.
