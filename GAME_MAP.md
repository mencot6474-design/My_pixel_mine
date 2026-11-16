# PETA STRUKTUR GAME — My Pixel Mine

3D voxel/chibi mining idle game built with **TypeScript + Vite + Three.js + Tailwind CSS v4** (`my_pixel_mine`).
Read this map first to locate modules and line anchors quickly instead of reading large files end-to-end.
Line numbers measured on **2026-11-16** after adding **5-Weather System + GLSL Atmospheric Sky Shader + 3D HUD icons**, **Shop World Kenney 3D plaza buildings & elevated station badges**, **World Teleport full-bleed banners (`public/worlds/*.jpg`)**, **world- & chibi-scaled plot upgrade costs (`getChibiUpgradeCostMult`)**, **Frozen+ Mutation roll confirmation warning modal**, **Gem Tower 10-wave/floor (5 random ore rocks + Boss) + 5-floor checkpoints/milestones + real strike-only damage**, and **Core-only Tap Damage (`Strike I–VI`) + standardized World 1–5 `denseOreScale` (Ore HP ×10 / Drops ×3)**; re-measure with `Select-String` if files change.

## 1. ATURAN KERJA SINGKAT

1. **Verifikasi wajib setelah edit**: jalankan `npm.cmd test` (Vitest) dan `npm.cmd run build` (`tsc --noEmit && vite build`), plus smoke-test browser jika UI/3D berubah.
2. **UI Styling**: gunakan utility classes Tailwind CSS v4 (atau helper constants `TW_*` di `src/ui/HudShared.ts`). Tema UI menggunakan **Modern Dark-Glass + Luminous Gradient Rails** (`data-modal-theme`, `.mam-modal`, `.mam-modal-rails`, `.mam-title-plaque`, `.mam-inspector-well`, `.mam-no-scrollbar`, `@media (forced-colors: active)`) yang tersimpan di `src/styles/hud.css`.
3. **Jaga kebersihan modul UI**: jangan tumbuhkan file UI di atas ~800–1.000 baris; pecah layar/modal baru ke domain module terpisah di `src/ui/` lalu delegasikan dari `GameHud.ts`.
4. **Pure game logic & 3D invariants**: pertahankan pure helper (`applyNodeDamagePure`, `rollEnchantDef`, dll.) agar unit test Vitest (`tests/world-3d.test.ts`) tidak butuh WebGL/DOM penuh.
5. **Aset `.glb` & sprites (`public/`)**: jangan timpa/hapus model atau sprite tanpa permintaan eksplisit user.

---

## 2. PETA FILE (`my_pixel_mine`)

```
index.html                      Entry HTML (Vite root)
.gitignore                      Ignore `node_modules/`, `dist/`, `.vite/`, local/OS files
.github/workflows/deploy.yml    GitHub Actions auto test, Vite build & deploy ke GitHub Pages (`main`)
package.json                    Dependencies: three, vite, typescript, vitest, @tailwindcss/vite
vite.config.ts                  Standalone Vite + Tailwind CSS v4 config (`base: './'`)
tsconfig.json                   TypeScript strict config
GAME_MAP.md                     Peta struktur file & anchor (dokumen ini)

=== ENTRY & TESTS ===
src/main.ts                     139 baris — Bootstrap Three.js scene (`MineScene3D`), `GameState`, `GameHud` (+ plot drop ops,
                                            weather & CC0 `AudioManager` sync), CrazyGames SDK init, Tower callbacks & game loop
tests/world-3d.test.ts        1.087 baris — 25 Vitest unit & integration specs (3D world, Altar dial/dice,
                                            Equip Best stat preservation, pure ore damage, research trees
                                            incl. Core-only tap damage & W1-W5 denseOreScale HP x10 / Drop x3,
                                            Gem Tower 10-wave 5-ore + Boss + strike-only damage + 5-floor milestones,
                                            Shop Plaza, Void/Eclipse Arena, background mining,
                                            hotbar drag reorder & hotbar-to-plot swap/equip, 5-Weather 5% Celestial buffs,
                                            world/chibi-scaled upgrade costs, & Frozen+ mutation roll protection)

=== GAME DATA & STATE ===
src/game/GameData.ts            439 baris — World (`underground`..`astral` L99), `ORES` 115, `WORLD_MINERS` 167,
                                            `PICKAXES` 196, `MUTATIONS` 206, `ENCHANTS` 220 (`ENCHANT_DICE_GEM_COST` 218),
                                            `isHighTierMutation` 277 (`frozen`..`unreal`), `GEM_SHOP_ITEMS` 287,
                                            `rollMutation` 403, `rollWorldOre` 430, `rollWorldMiner` 435
src/game/ResearchData.ts      1.338 baris — `ResearchTreeId` (`core` | WorldId) 3, `DENSE_ORE_HP_MULT` (10) /
                                            `DENSE_ORE_DROP_MULT` (3) 19–20, `RESEARCH_TREE_META` 63,
                                            `formatNodeEffectLine` 121, `getNodeNextCost` 156, `CORE_NODES` 164
                                            (Strike I–VI sole `tapDamageFlat` source; W1–W5 `denseOreScale`),
                                            `RESEARCH_NODES` 1315
src/game/TowerData.ts           355 baris — `TOWER_MAX_KEYS` (5), `TOWER_KEY_REGEN_MS` (10m), `TOWER_WAVES_PER_FLOOR` (10),
                                            `TOWER_ORE_ROCKS_PER_WAVE` (5), `TOWER_CHECKPOINT_STEP` (5), `TOWER_ANOMALIES`,
                                            `TOWER_BLESSINGS`, `TOWER_MILESTONES` (per 5 floor: 5..50), `getTowerFloorDef`,
                                            `getTowerWaveDef`, `rollTowerWaveOres`, `getTowerCheckpoints`,
                                            `getTowerSweepGemReward`, `getGlobalGemGainBonus`
src/game/WeatherData.ts         187 baris — `WeatherId` (`light_rain` | `snow_rain` | `bloodmoon` | `void` | `celestial`) 1,
                                            `WEATHER_DURATION_MS` (3m) 3, `WEATHERS` 33 (Celestial 5%: 10x Ore / 4x Gem / 5x DMG),
                                            `getWeatherById` 175, `rollWeatherDef` 179
src/game/GameState.ts         1.792 baris — `PlotUnitState` 125, `SavePayload` 135, `getChibiUpgradeCostMult` 172
                                            (skala biaya upgrade per harga world & `baseDps`), `GameState` 189: plot loadout/
                                            leveling, `rollPlotMutation` 542, chests, inventory/ore stack, hotbar 1..9,
                                            shop stock, potions, research, altar enchant, weather sync/timer/buffs,
                                            `getOreHpScale` 1127 / `getOreOutputMult` 1145 (`denseOreScale`),
                                            global gem bonus, Gem Tower 10-wave/strike-only state/keys/runs/sweep, localStorage save
src/game/AssetUrl.ts             10 baris — `assetUrl` (resolusi URL aset `public/` terhadap `BASE_URL` `./` agar aman di subpath)
src/game/NumberFormat.ts         45 baris — `fmtShort` 22, `fmtMoney` 33, `fmtInt` 37, `fmtPct` 41
src/audio/AudioManager.ts       349 baris — Web Audio SFX pool + HTMLAudio BGM switcher (`audio` singleton, `setSceneMode`,
                                            `playOreHit`, `playOreBreak`, `playSfx`, mute persistence & tab/ad auto-mute)
src/sdk/crazygames.ts           180 baris — CrazyGames SDK v3 wrapper (`isCrazyGamesEnv` 36, `cgLoadingStart` 64,
                                            `cgGameplayStart` 80, `cgHappyTime` 100, `cgRequestRewardedAd` 108)

=== UI HUD, MODALS & CSS (Modular Architecture) ===
src/ui/GameHud.ts             1.711 baris — `GameHud`: Thin UI coordinator; manages 3D overlay layers (incl. Tower ore bars),
                                            viewport scaling (`updateViewportScale`), currency rail + audio mute toggle, Weather top-left
                                            3D HUD (`renderWeatherHud`), hotbar 1..9 (click + drag reorder + plot drop),
                                            active potion pills, Shop Plaza HUD, Altar HUD, 100ms Tower timer tick &
                                            real chibi strike dispatch, delegates modals, Plot Inspector & `TowerUi`
src/ui/HudShared.ts             220 baris — Shared types (`ModalKind` 4, `ModalThemeId` 15, `InvTab` 17),
                                            rarity/ring helpers (`rarityCardClasses`, `rarityVars`, `applyInspectRing`),
                                            `refreshPotionTimersInDom`, dark-glass Tailwind `TW_*` constants,
                                            shared shell builders (`renderModalShell` 132, `renderInspectorPanel` 168)
src/ui/CollectionModalsUi.ts    777 baris — `CollectionModalsUi` 31: Index modal (5 worlds + Inspector),
                                            Backpack/Inventory (Equip Best / Search / Inspect), Chest modal & live updaters
src/ui/ShopModalsUi.ts          634 baris — `ShopModalsUi` 40: Pickaxe Shop, Gem Shop, Sell Shop + Inspectors & updaters
src/ui/TowerUi.ts               466 baris — `TowerUi` 15: Gem Tower Hub Dark-Glass modal (`renderTowerHubModal` 40:
                                            Keys, 5-Floor Checkpoints & Milestones, Anomalies, Quick Sweep, Run Summary) &
                                            3D Arena HUD (`renderTowerArenaHud`, wave/ore pips, `updateLiveValues`, Blessings)
src/ui/UpgradesWorldsUi.ts      595 baris — `UpgradesWorldsUi` 15: Research/Upgrades tree & World Teleport full-banner
                                            modal (`buildWorldsListHtml` 306 pakai `public/worlds/*.jpg`) & live updaters
src/ui/PlotInspectUi.ts         398 baris — `PlotInspectUi` 24: Plot Inspector overlay, live updater & modal
                                            konfirmasi peringatan roll mutasi Frozen+ (`renderMutationConfirmOverlay`
                                            211: `Stop (Keep)` / `Continue`, proteksi obtain & overwrite)
src/ui/HudIcons.ts              346 baris — SVG & 3D-thumbnail icon helpers (`HUD_ICONS`, `hudIconHtml`,
                                            `weatherIconHtml`, `towerIconHtml`, `pickaxeIconHtml`, `gemPotionIconHtml`,
                                            `enchantAuraIconHtml`, `enchantDiceIconHtml`, `researchIconHtml`)
src/styles/global.css            40 baris — Tailwind v4 entry (`@import "tailwindcss";`) + base font/reset
src/styles/hud.css              891 baris — Modern Dark-Glass + Luminous Gradient Rail system (`[data-modal-theme]`,
                                            `.mam-modal`, `.mam-modal-rails`, `.mam-no-scrollbar`,
                                            `.mam-hotbar-dragging` / `.mam-hotbar-drop-target`, keyframes, a11y)

=== 3D WORLD & RENDERERS ===
src/game3d/MineScene3D.ts       823 baris — Main Three.js scene controller: switches `mine` / `shop` / `altar` / `tower`,
                                            runs background pit/miner ticks, weather sky/fog/lighting (`setWeather` 641,
                                            `applyWeatherAtmosphere` 625), raycasts & emits plot/station/tower-ore anchors
src/game3d/MineEnvironment3D.ts 529 baris — Surrounding terrain, sky dome (`skyHandle` `WeatherSkyMaterialHandle` 32,
                                            `setWeatherSky` 496), cliff walls & world lighting
src/game3d/WeatherSkyShader.ts  237 baris — Animated GLSL Atmospheric Sky Shader (`createWeatherSkyMaterial` 184:
                                            sky gradient, layered FBM clouds, stars/nebula, Bloodmoon & Celestial moons)
src/game3d/WeatherFx3D.ts       213 baris — `WeatherFx3D` 74: 3D weather particles (rain/snow/embers/void/starfall)
                                            with soft radial/streak canvas textures
src/game3d/MineWorldPalette.ts   99 baris — `WORLD_PALETTES` 25 (5 worlds), `ORE_VARIANTS` 85, `rollOreVariant` 91
src/game3d/OrePit3D.ts          724 baris — Pit floor, ore crystal/rock nodes (incl. World 5 `astral` ores),
                                            hit VFX (skipped when hidden) & `applyNodeDamagePure` 36
src/game3d/PlotPedestal3D.ts    240 baris — Plot pedestals around the pit & visual upgrade rings
src/game3d/FieldMiner3D.ts      175 baris — Active chibi miner placement, swing/background mining tick & movement in mine
src/game3d/ChibiCatalog.ts      201 baris — `CHIBI_CATALOG` 40 (15 chibi spritesheets, poses, baseDps, world roster)
src/game3d/ChibiSprite3D.ts     186 baris — Animated 2D-in-3D billboard sprite mesh (`getChibiFrameUvOffset`)
src/game3d/ShopWorld3D.ts     1.252 baris — 3D Shop Plaza dengan aset Kenney (`fantasy-town/`, `castle/`, `nature/`):
                                            Pickaxe Shop, Sell Stall, Gem Tower Citadel, Enchant Altar medallion,
                                            floating station icons yang ditinggikan di atas atap, & Altar clock room
src/game3d/TowerArena3D.ts    1.292 baris — Cosmic Void/Eclipse 3D Colosseum Arena: sky dome nebula/stars, Total Solar
                                            Eclipse corona, arcane rune deck, 8 obsidian pillars, 5 random wave ore rock slots
                                            (Waves 1–9), Boss Monolith (Wave 10), & Chibi Fighters (`dash` -> melee `attack` strike)
src/game3d/AltarSpinFx3D.ts     537 baris — `createAltarClockDial` 34, `createAltarClockHand` 161,
                                            `createAltarSubHand` 262, `AltarParticleSystem` 316
src/game3d/AuraModels3D.ts      362 baris — `createEnchantAura3D` 275 & `createEnchantDice3D` 317
src/game3d/HudIcon3DRenderer.ts 1.818 baris — Offscreen WebGL renderer generating cached data-URL 3D icons & 5
                                            3D weather icons (`init3dHudIcons`)
src/game3d/ProceduralTextures3D.ts 441 baris — Procedural canvas textures (sky dome, terrain, quarry floor, cobble, etc.)
src/game3d/GlbAssets3D.ts       133 baris — Async GLTF/GLB loader & cache (`mountGlbProp` 43, `preloadCommonMineModels` 114)

=== ASSETS (`public/`) ===
public/audio/                   CC0 BGM (`bgm/{mine,shop,tower,boss}.mp3`) & 24 SFX (`sfx/*.ogg|wav|mp3`) + `LICENSE.txt`
public/chibi/                   15 chibi (`*-spritesheet-alpha.png` + `<id>/{attack,idle,pose,walk}.png`)
public/models/                  Kenney & fantasy `.glb` packs (`castle/`, `fantasy-town/`, `nature/`, `platformer/`,
                                `retro-fantasy/`, `survival/`, `train/`)
public/worlds/                  5 full-bleed teleport banner JPGs (`underground`, `crystal`, `magma`, `ruins`, `astral`)
```

---

## 3. QUICK TARGET LOOKUP (Edit cepat)

| Tugas / Area | File & Simbol |
|---|---|
| Ore, Pickaxe, Mutation (`Frozen+` flag), World, Gem Shop | `src/game/GameData.ts` (`ORES`, `PICKAXES`, `MUTATIONS`, `isHighTierMutation`, `ENCHANTS`) |
| Research tree nodes, Core Strike & `denseOreScale` scaling | `src/game/ResearchData.ts` (`CORE_NODES`, `RESEARCH_NODES`, `DENSE_ORE_HP_MULT`, `getNodeNextCost`) |
| Gem Tower scaling, Anomalies, Blessings, Milestones | `src/game/TowerData.ts` (`getTowerFloorDef`, `TOWER_BLESSINGS`, `TOWER_MILESTONES`) |
| Weather config, probabilities & multipliers | `src/game/WeatherData.ts` (`WEATHERS`, `WEATHER_DURATION_MS`, `rollWeatherDef`) |
| State, Upgrade cost nerf, Save/Load, Hotbar/Plot, Weather | `src/game/GameState.ts` (`GameState`, `getChibiUpgradeCostMult`, `getOreHpScale`, `getOreOutputMult`, `rollPlotMutation`, `syncWeather`) |
| Responsive HUD scale, Topbar, Weather HUD, Hotbar Drag/Drop | `src/ui/GameHud.ts` (`updateViewportScale`, `render`, `setSceneMode`) |
| Shared Modal Shell, Inspector Shell, Tailwind `TW_*` | `src/ui/HudShared.ts` (`renderModalShell`, `renderInspectorPanel`, `TW_*`) |
| Pickaxe Shop, Gem Shop, Sell Shop + Inspectors | `src/ui/ShopModalsUi.ts` (`ShopModalsUi`) |
| Gem Tower Hub Modal, 3D Arena HUD, Blessings picker | `src/ui/TowerUi.ts` (`TowerUi`) |
| Index (5 Worlds), Backpack/Inventory, Chest + Inspectors | `src/ui/CollectionModalsUi.ts` (`CollectionModalsUi`) |
| Research/Upgrades Tree & World Teleport Banner Modal | `src/ui/UpgradesWorldsUi.ts` (`UpgradesWorldsUi`, `buildWorldsListHtml`) |
| Plot Inspector Overlay & Frozen+ Mutation Confirm Modal | `src/ui/PlotInspectUi.ts` (`PlotInspectUi`, `renderMutationConfirmOverlay`) |
| Modal/HUD CSS & Responsive Breakpoints | `src/styles/hud.css` + `src/ui/HudShared.ts` (`TW_*`) |
| Audio (BGM switcher, SFX pool, Mute toggle) | `src/audio/AudioManager.ts` (`audio`, `playOreHit`, `playOreBreak`, `playSfx`) + `public/audio/` |
| 3D Sky Shader, Weather FX, Ore Pit & 3D HUD Icons | `src/game3d/WeatherSkyShader.ts`, `WeatherFx3D.ts`, `OrePit3D.ts`, `HudIcon3DRenderer.ts` |
| 3D Shop Plaza (Kenney GLBs), Enchant Altar & Tower Arena | `src/game3d/ShopWorld3D.ts` + `src/game3d/TowerArena3D.ts` |
