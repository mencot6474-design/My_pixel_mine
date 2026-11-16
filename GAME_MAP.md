# PETA STRUKTUR GAME — My Pixel Mine

3D voxel/chibi mining idle game built with **TypeScript + Vite + Three.js + Tailwind CSS v4** (`my_pixel_mine`).
Read this map first to locate modules and line anchors quickly instead of reading large files end-to-end.
Line numbers measured on **2026-11-16** after replacing **World 1 & World 2 Chibis with non-pixel anime art + `smoothFilter: true` (`Mistveil Shinobi`, `Oni Brawler`, `Inkcloud`, `Ashenhorn`, `Ashflare`, `Blindveil`, `Chainwrath`, `Clops Blazing`)**, **2D fantasy PNG HUD/potion/weather/enchant/ore icons**, **Enchant Altar Auto Roll / Stop button & Outer Space + Distant Pitch-Black Black Hole (`HellAltarEye3D.ts`)**, **procedural Web Audio Mutation & Enchant Spin SFX (`AudioManager.ts`)**, **World 6 (`Starwell`, 8 ores + `starwell.jpg` banner + `STARWELL_NODES` research tree + 3D ore icons)**, **15 new sliced Chibis (30 total)**, **new `Exotic` & `Secret` rarity tiers (`W1–W6`, animated CSS cards)**, **buffed chibi drop trigger & `WORLD_MINERS` rates**, **Core `Vault Expansion I–II` up to `+300K` chest capacity**, **5-Weather System + GLSL Atmospheric Sky Shader + 3D HUD icons**, **Shop World Kenney 3D plaza buildings & elevated station badges**, **World Teleport full-bleed banners (`public/worlds/*.jpg`)**, **world- & chibi-scaled plot upgrade costs (`getChibiUpgradeCostMult`)**, **Frozen+ Mutation roll confirmation warning modal**, **Gem Tower 10-wave/floor (5 random ore rocks + Boss) + 5-floor checkpoints/milestones + real strike-only damage**, and **Core-only Tap Damage (`Strike I–VI`) + standardized World 1–6 `denseOreScale` (Ore HP ×10 / Drops ×3)**; re-measure with `Select-String` if files change.

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
tests/world-3d.test.ts        1.340 baris — 33 Vitest unit & integration specs (3D world, Altar dial/dice,
                                            Equip Best stat preservation, pure ore damage, research trees
                                            incl. Core-only tap damage, +300K Core Vault Expansion, & W1-W6
                                            denseOreScale HP x10 / Drop x3, Gem Tower 10-wave 5-ore + 3D Seraphim Boss
                                            + 5s Boss Invulnerability + 5s Blessing Auto-Pick + strike-only damage
                                            + 5-floor milestones, Shop Plaza, Megacorp Mainframe Arena, background mining,
                                            hotbar drag reorder & hotbar-to-plot swap/equip, 5-Weather 5% Celestial buffs,
                                            world/chibi-scaled upgrade costs, Frozen+ mutation roll protection, 30 chibis,
                                            Exotic/Secret tiers, buffed miner drops, & World 6 Starwell)

=== GAME DATA & STATE ===
src/game/GameData.ts            472 baris — World (`underground`..`starwell` W1-W6), `ORES` 111 (48 ores),
                                            `WORLD_MINERS` 173 (30 miners: 5/world incl. Exotic & Secret),
                                            `PICKAXES` 219 (12 tiers W1–W6), `MUTATIONS` 234, `ENCHANTS` 248 (`ENCHANT_DICE_GEM_COST` 246),
                                            `isHighTierMutation` 310 (`frozen`..`unreal`), `GEM_SHOP_ITEMS` 320,
                                            `rollMutation` 436, `rollWorldOre` 463, `rollWorldMiner` 468
src/game/ResearchData.ts      1.533 baris — `ResearchTreeId` (`core` | WorldId) 3, `DENSE_ORE_HP_MULT` (10) /
                                            `DENSE_ORE_DROP_MULT` (3) 19–20, `RESEARCH_TREE_META` 63,
                                            `formatNodeEffectLine` 129, `getNodeNextCost` 164, `CORE_NODES` 172
                                            (Strike I–VI sole `tapDamageFlat`, Vault Expansion I–II `+300K`),
                                            `STARWELL_NODES` 1326, `RESEARCH_NODES` 1509
src/game/TowerData.ts           359 baris — `TOWER_MAX_KEYS` (5), `TOWER_KEY_REGEN_MS` (10m), `TOWER_WAVES_PER_FLOOR` (10),
                                            `TOWER_ORE_ROCKS_PER_WAVE` (5), `TOWER_BLESSING_AUTO_PICK_SEC` (5), `TOWER_BOSS_INVUL_SEC` (5),
                                            `TOWER_CHECKPOINT_STEP` (5), `TOWER_ANOMALIES`, `TOWER_BLESSINGS`,
                                            `TOWER_MILESTONES` (per 5 floor: 5..50), `getTowerFloorDef`, `getTowerWaveDef`,
                                            `rollTowerWaveOres`, `getTowerCheckpoints`, `getTowerSweepGemReward`, `getGlobalGemGainBonus`
src/game/WeatherData.ts         187 baris — `WeatherId` (`light_rain` | `snow_rain` | `bloodmoon` | `void` | `celestial`) 1,
                                            `WEATHER_DURATION_MS` (3m) 3, `WEATHERS` 33 (Celestial 5%: 10x Ore / 4x Gem / 5x DMG),
                                            `getWeatherById` 175, `rollWeatherDef` 179
src/game/GameState.ts         1.823 baris — `PlotUnitState` 129, `SavePayload` 139, `getChibiUpgradeCostMult` 176
                                            (skala biaya upgrade per harga world & `baseDps`), `GameState` 193: plot loadout/
                                            leveling, `rollPlotMutation` 546, buffed `onOreBroken` miner drops 708,
                                            chests, inventory/ore stack, hotbar 1..9, shop stock, potions, research,
                                            altar enchant, weather sync/timer/buffs, `getOreHpScale` 1131 /
                                            `getOreOutputMult` 1149 (`denseOreScale`), global gem bonus, Gem Tower
                                            10-wave/strike-only state/keys/runs/sweep (+ 5s Boss Invul & 5s Blessing Auto-Pick), localStorage save
src/game/AssetUrl.ts             11 baris — `assetUrl` (resolusi URL aset `public/` terhadap `BASE_URL` `./` agar aman di subpath)
src/game/NumberFormat.ts         45 baris — `fmtShort` 22, `fmtMoney` 33, `fmtInt` 37, `fmtPct` 41
src/audio/AudioManager.ts       582 baris — Web Audio SFX pool + synth (`playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`,
                                            `playEnchantEquip`) & HTMLAudio BGM switcher (`audio` singleton, `setSceneMode`,
                                            `playOreHit`, `playOreBreak`, `playSfx`, mute persistence & tab/ad auto-mute)
src/sdk/crazygames.ts           180 baris — CrazyGames SDK v3 wrapper (`isCrazyGamesEnv` 36, `cgLoadingStart` 64,
                                            `cgGameplayStart` 80, `cgHappyTime` 100, `cgRequestRewardedAd` 108)

=== UI HUD, MODALS & CSS (Modular Architecture) ===
src/ui/GameHud.ts             1.803 baris — `GameHud`: Thin UI coordinator; manages 3D overlay layers (incl. Tower ore bars),
                                            viewport scaling (`updateViewportScale`), currency rail + audio mute toggle, Weather top-left
                                            3D HUD (`renderWeatherHud`), hotbar 1..9 (click + drag reorder + plot drop),
                                            active potion pills, Shop Plaza HUD, Altar HUD + Auto Roll (`triggerSingleEnchantRoll`),
                                            100ms Tower timer tick (incl. 5s Blessing auto-pick) & real chibi strike dispatch
src/ui/HudShared.ts             240 baris — `chibiPortraitHtml` 6 (smooth/pixel portrait), shared types (`ModalKind` 16,
                                            `ModalThemeId` 28, `InvTab` 30), rarity/ring helpers (`rarityCardClasses` 33 incl.
                                            `exotic`/`secret`, `rarityVars`, `applyInspectRing`), `refreshPotionTimersInDom`,
                                            dark-glass Tailwind `TW_*` constants, shared shell builders (`renderModalShell` 148,
                                            `renderInspectorPanel` 184)
src/ui/CollectionModalsUi.ts    776 baris — `CollectionModalsUi` 33: Index modal (6 worlds + Inspector),
                                            Backpack/Inventory (Equip Best / Search / Inspect), Chest modal & live updaters
src/ui/ShopModalsUi.ts          632 baris — `ShopModalsUi` 42: Pickaxe Shop, Gem Shop, Sell Shop + Inspectors & updaters
src/ui/TowerUi.ts               479 baris — `TowerUi` 19: Gem Tower Hub Dark-Glass modal (`renderTowerHubModal` 44:
                                            Keys, 5-Floor Checkpoints & Milestones, Anomalies, Quick Sweep, Run Summary) &
                                            3D Arena HUD (`renderTowerArenaHud`, 5s Boss Invul shield label, 5s Blessing auto-pick timer)
src/ui/UpgradesWorldsUi.ts      596 baris — `UpgradesWorldsUi` 17: Research/Upgrades tree & World Teleport full-banner
                                            modal (`buildWorldsListHtml` 308 pakai `public/worlds/*.jpg`) & live updaters
src/ui/PlotInspectUi.ts         398 baris — `PlotInspectUi` 25: Plot Inspector overlay, live updater & modal
                                            konfirmasi peringatan roll mutasi Frozen+ (`renderMutationConfirmOverlay`
                                            209: `Stop (Keep)` / `Continue`, proteksi obtain & overwrite)
src/ui/HudIcons.ts              366 baris — SVG, 2D fantasy art (`public/{enchants,hud,ores,pickaxes,potions,weathers}/*.png`), & 3D-thumbnail icon helpers (`HUD_ICONS`, `hudIconHtml`,
                                            `weatherIconHtml`, `towerIconHtml`, `pickaxeIconHtml`, `gemPotionIconHtml`,
                                            `enchantAuraIconHtml`, `enchantDiceIconHtml`, `researchIconHtml`)
src/styles/global.css            40 baris — Tailwind v4 entry (`@import "tailwindcss";`) + base font/reset
src/styles/hud.css              935 baris — Modern Dark-Glass + Luminous Gradient Rail system (`[data-modal-theme]`,
                                            `.mam-modal`, `.mam-modal-rails`, `.mam-no-scrollbar`, `.mam-chibi-smooth`,
                                            `.rarity-exotic`, `.rarity-secret`, `.mam-hotbar-dragging` / `.mam-hotbar-drop-target`, keyframes, a11y)

=== 3D WORLD & RENDERERS ===
src/game3d/MineScene3D.ts       823 baris — Main Three.js scene controller: switches `mine` / `shop` / `altar` / `tower`,
                                            runs background pit/miner ticks, weather sky/fog/lighting (`setWeather` 683,
                                            `applyWeatherAtmosphere` 667), raycasts & emits plot/station/tower-ore anchors
src/game3d/MineEnvironment3D.ts 529 baris — Surrounding terrain, sky dome (`skyHandle` `WeatherSkyMaterialHandle` 32,
                                            `setWeatherSky` 496), cliff walls & world lighting
src/game3d/WeatherSkyShader.ts  237 baris — Animated GLSL Atmospheric Sky Shader (`createWeatherSkyMaterial` 184:
                                            sky gradient, layered FBM clouds, stars/nebula, Bloodmoon & Celestial moons)
src/game3d/WeatherFx3D.ts       213 baris — `WeatherFx3D` 74: 3D weather particles (rain/snow/embers/void/starfall)
                                            with soft radial/streak canvas textures
src/game3d/MineWorldPalette.ts  113 baris — `WORLD_PALETTES` 25 (6 worlds incl. `starwell`), `ORE_VARIANTS` 99, `rollOreVariant` 105
src/game3d/OrePit3D.ts          724 baris — Pit floor, ore crystal/rock nodes (incl. World 5 `astral` & W6 `starwell` palettes),
                                            hit VFX (skipped when hidden) & `applyNodeDamagePure` 36
src/game3d/PlotPedestal3D.ts    240 baris — Plot pedestals around the pit & visual upgrade rings
src/game3d/FieldMiner3D.ts      194 baris — Active chibi miner placement, swing/background mining tick & movement in mine
src/game3d/ChibiCatalog.ts      375 baris — `CHIBI_CATALOG` 50 (30 chibi poses, `ChibiRarity` `common`..`secret`, baseDps, `smoothFilter` W1–W2, world roster, `getChibiFrameUvOffset`)
src/game3d/ChibiSprite3D.ts     374 baris — Animated 2D-in-3D upright billboard sprite (`triggerAttack`, `smoothFilter` linear/mipmap vs nearest, camera-pitch tilt, normalized pose sizing, alpha-clipped directional shadow + soft AO contact shadow)
src/game3d/ShopWorld3D.ts     1.243 baris — 3D Shop Plaza dengan aset Kenney (`fantasy-town/`, `castle/`, `nature/`):
                                            Pickaxe Shop, Sell Stall, Gem Tower Citadel, Enchant Altar medallion,
                                            floating station icons yang ditinggikan di atas atap, & Outer Space Altar clock room
src/game3d/TowerArena3D.ts    1.598 baris — Megacorp Mainframe Core 3D Cyber-Arena: cyberspace wireframe grid dome,
                                            Holographic AI Core, server monolith towers + vertical data stream beams, PCB circuit deck,
                                            8 server pylons, 5 random wave ore rock slots (Waves 1–9), 3D Seraphim AI Overlord Boss (Wave 10), & Chibi Fighters
src/game3d/AltarSpinFx3D.ts     529 baris — `createAltarClockDial` 34, `createAltarClockHand` 156,
                                            `createAltarSubHand` 254, `AltarParticleSystem` 308
src/game3d/HellAltarEye3D.ts    372 baris — `HellAltarEyeController` 151: Outer Space starfield, cosmic astrolabe floor ring,
                                            & distant Pitch-Black Black Hole (`#000000` event horizon, photon ring, lensing arches, accretion disk)
src/game3d/AuraModels3D.ts      362 baris — `createEnchantAura3D` 275 & `createEnchantDice3D` 317
src/game3d/HudIcon3DRenderer.ts 2.002 baris — Offscreen WebGL renderer generating cached data-URL 3D icons (`buildStarwellOreModel` 1351)
                                            & 5 3D weather icons (`init3dHudIcons` 1842)
src/game3d/ProceduralTextures3D.ts 441 baris — Procedural canvas textures (sky dome, terrain, quarry floor, cobble, etc.)
src/game3d/GlbAssets3D.ts       135 baris — Async GLTF/GLB loader & cache (`mountGlbProp` 45, `preloadCommonMineModels` 116)

=== ASSETS (`public/`) ===
public/audio/                   CC0 BGM (`bgm/bgm-{mine,shop,tower,boss}.mp3`) & 24 SFX (`sfx/*.ogg|wav|mp3`) + `LICENSE.txt`
public/chibi/                   30 chibi (`<id>/{attack,idle,pose,walk}.png` W1–W2 non-pixel anime art + 9 legacy `*-spritesheet-alpha.png`)
public/enchants/                11 transparent PNG fantasy aura & dice icons (`blazing`..`spellbound`, `enchant_dice`)
public/hud/                     16 transparent PNG fantasy HUD & modal art icons (`shops`..`lock`)
public/models/                  Kenney & fantasy `.glb` packs (`castle/`, `factory/`, `fantasy-town/`, `mini-dungeon/`,
                                `modular-cave/`, `nature/`, `platformer/`, `retro-fantasy/`, `survival/`, `train/`)
public/ores/                    48 transparent PNG fantasy ore icons (W1–W6 `underground`..`starwell`)
public/pickaxes/                12 transparent PNG fantasy pickaxe art icons (`starter`..`starwellcrown`)
public/potions/                 8 transparent PNG fantasy potion art icons (`ore-elixir-1`..`mutation-luck-1`)
public/weathers/                5 transparent PNG fantasy weather emblem icons (`light_rain`..`celestial`)
public/worlds/                  6 full-bleed teleport banner JPGs (`underground`, `crystal`, `magma`, `ruins`, `astral`, `starwell`)
```

---

## 3. QUICK TARGET LOOKUP (Edit cepat)

| Tugas / Area | File & Simbol |
|---|---|
| Ore, Miner (`Exotic`/`Secret`), Pickaxe, Mutation, World | `src/game/GameData.ts` (`ORES`, `WORLD_MINERS`, `RARITY_BORDER`, `WORLDS`, `isHighTierMutation`, `ENCHANTS`) |
| Research tree nodes, Core Strike/Vault & `denseOreScale` | `src/game/ResearchData.ts` (`CORE_NODES`, `STARWELL_NODES`, `RESEARCH_NODES`, `DENSE_ORE_HP_MULT`, `getNodeNextCost`) |
| Gem Tower scaling, Anomalies, Blessings, Milestones | `src/game/TowerData.ts` (`getTowerFloorDef`, `TOWER_BLESSINGS`, `TOWER_MILESTONES`) |
| Weather config, probabilities & multipliers | `src/game/WeatherData.ts` (`WEATHERS`, `WEATHER_DURATION_MS`, `rollWeatherDef`) |
| State, Upgrade cost nerf, Save/Load, Hotbar/Plot, Weather | `src/game/GameState.ts` (`GameState`, `getChibiUpgradeCostMult`, `getOreHpScale`, `getOreOutputMult`, `rollPlotMutation`, `syncWeather`) |
| Responsive HUD scale, Topbar, Weather HUD, Altar Auto Roll, Hotbar | `src/ui/GameHud.ts` (`updateViewportScale`, `render`, `setSceneMode`, `triggerSingleEnchantRoll`) |
| Shared Modal Shell, Inspector Shell, Tailwind `TW_*` | `src/ui/HudShared.ts` (`renderModalShell`, `renderInspectorPanel`, `TW_*`) |
| Pickaxe Shop, Gem Shop, Sell Shop + Inspectors | `src/ui/ShopModalsUi.ts` (`ShopModalsUi`) |
| Gem Tower Hub Modal, 3D Arena HUD, Blessings picker | `src/ui/TowerUi.ts` (`TowerUi`) |
| Index (6 Worlds), Backpack/Inventory, Chest + Inspectors | `src/ui/CollectionModalsUi.ts` (`CollectionModalsUi`) |
| Research/Upgrades Tree & World Teleport Banner Modal | `src/ui/UpgradesWorldsUi.ts` (`UpgradesWorldsUi`, `buildWorldsListHtml`) |
| Plot Inspector Overlay & Frozen+ Mutation Confirm Modal | `src/ui/PlotInspectUi.ts` (`PlotInspectUi`, `renderMutationConfirmOverlay`) |
| Modal/HUD CSS & Responsive Breakpoints | `src/styles/hud.css` + `src/ui/HudShared.ts` (`TW_*`) |
| Audio (BGM switcher, Web Audio Synth Roll/Spin SFX, Mute toggle) | `src/audio/AudioManager.ts` (`audio`, `playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`) + `public/audio/` |
| 3D Sky Shader, Weather FX, Ore Pit & 3D HUD Icons | `src/game3d/WeatherSkyShader.ts`, `WeatherFx3D.ts`, `OrePit3D.ts`, `HudIcon3DRenderer.ts` |
| 3D Shop Plaza, Outer Space Enchant Altar + Black Hole & Tower Arena | `src/game3d/ShopWorld3D.ts`, `src/game3d/HellAltarEye3D.ts`, `src/game3d/AltarSpinFx3D.ts`, `src/game3d/TowerArena3D.ts` |
