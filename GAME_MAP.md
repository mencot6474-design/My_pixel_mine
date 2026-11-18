# PETA STRUKTUR GAME — My Pixel Mine

3D voxel/chibi mining idle game built with **TypeScript + Vite + Three.js + Tailwind CSS v4** (`my_pixel_mine`).
Read this map first to locate modules and line anchors quickly instead of reading large files end-to-end.
Line numbers measured on **2026-11-18** after **Unified Chibi 3-Beat Attack Combo & 4-Layer Cyber-Anime Impact VFX Overhaul (`AttackImpactFx3D.ts`, 3-beat `ChibiSprite3D` + afterimages + glint, `FieldMiner3D` / `TowerArena3D` live Enchant/Rainbow color sync, `OreBillboard2D` recoil)**, **Plot Pedestals, Aura VFX, 2.5D Ore Grounding & Field Chibi Rings Overhaul (ZZZ/HSR Cyber-Showcase Podiums + Dual-Shell Fresnel Aura, 3D Basalt/Crystal Ore Collars + AO Crater Sockets + Feathered Geode Glows, Unified `ChibiFieldFxController`)**, **Mine Visual Polish & Responsive Bugfix Pass (Box-Free Outlined Chibi Nameplates + Narrow-Viewport Clamping/Offscreen Hiding, Track-Centered Chamfered Cyan Energy Portal Arch, Non-Diamond Cyber Holoprojector/Plasma Beacons & Hex-Prism Gem SVGs, Zero-Alloc `PlotPedestal3D` + `dt` Clamp)**, **Cyber-Industrial MineScene3D Redesign**, **Neo-Cyber City Plaza Roundabout Curb**, **Sculpted Non-Box `SeraphimBoss3D.ts`**, **CrazyGames SDK v3 Startup Hardening**, & **Ruined Cyber City Battle Tower**; re-measure with `Select-String` if files change.

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
package.json                    Dependencies: three, @types/three, @tailwindcss/vite, tailwindcss, typescript, vitest, @types/node
package-lock.json               NPM dependency lockfile
vite.config.ts                  Standalone Vite + Tailwind CSS v4 config (`base: './'`)
tsconfig.json                   TypeScript strict config
GAME_MAP.md                     Peta struktur file & anchor (dokumen ini)
docs/superpowers/               Design specs & implementation plans (`specs/`, `plans/`)

=== AGENT RULES & SKILLS (`.agent/`) ===
.agent/rules/threejs-ts-standards.md        Aturan wajib `.ts`: strict TypeScript (no `any`), delta clamp `<= 0.1`, `THREE.Clock`/explicit `Timer`, `InstancedMesh`, `.dispose()`, `SRGBColorSpace`
.agent/skills/crazygames-sdk-v3/SKILL.md    Standar lifecycle hooks SDK v3, pause/audio mute pada `adStarted`/`adFinished`/`adError`, & larangan external links
.agent/skills/ui-hud-design/SKILL.md        Standar Dark-Glass 1px, `tabular-nums`, viewport-first HUD, `pointer-events` discipline, & responsivitas iframe/desktop
.agent/skills/procedural-3d-assets/SKILL.md Standar seni & arsitektur 3D prosedural multi-part, PBR material + emissive, pivot `y = 0`, `InstancedMesh`, & `.dispose()`

=== ENTRY & TESTS ===
src/main.ts                     266 baris — Bootstrap Three.js scene (`MineScene3D`), `GameState`, `GameHud` (+ plot drop & 3D label sync ops, `'limit'` toast,
                                            weather & CC0 `AudioManager` sync, tutorial-guarded `spawnMeteorIfAllowed`), CrazyGames SDK init & ad-pause lifecycle, Tower callbacks & game loop
tests/world-3d.test.ts        2.330 baris — 56 Vitest unit & integration specs (3D world, Altar dial/dice & 2.5D billboard pedestals,
                                            Unified 3-beat `ChibiSprite3D` combo/afterimage/glint + 4-layer `AttackImpactFxController` + `FieldMiner3D` & `TowerArena3D` accent/rainbow sync,
                                            Cyber-Industrial Mine (`MineEnvironment3D` + Drop Shaft + Plasma Refinery + Void sky clearance + `PlotPedestal3D.dispose`),
                                            Neo-Cyber City Plaza (`ShopCyberPlaza3D` roundabout shadow & trimmed lane clearance + `ShopWorld3D.dispose` + `WeatherFx3D`),
                                            Full 3D Sculpted Non-Box Seraphim Boss (`SeraphimBoss3D` + `TowerCityEnvironment3D` + `TowerArena3D.dispose`),
                                            procedural Chest Vault + Escalator & Cave Railway + hollow minecart, CrazyGames SDK v3 & ad-mute preservation,
                                            Equip Best stat preservation, Chibi/Enchant 1-per-unit plot exclusivity, pure ore damage, research trees
                                            incl. Core-only tap damage, +300K Core Vault Expansion, & W1-W6
                                            denseOreScale HP x10 / Drop x3, Gem Tower 10-wave 5-ore + Boss
                                            + 5s Boss Invulnerability + 5s Blessing Auto-Pick + strike-only damage + anti-one-hit boss cap
                                            + 5-floor milestones, Shop Plaza, Megacorp Mainframe Arena, background mining,
                                            hotbar drag reorder & hotbar-to-plot swap/equip, 5-Weather 5% Celestial buffs,
                                            Weather Meteor & Weather Limited Ores/Chibis, world/chibi-scaled upgrade costs,
                                            Frozen+ mutation roll protection, 35 chibis, Exotic/Secret tiers, buffed miner drops,
                                            World 6 Starwell, Chibi Star-Up, World Resonance synergy, & Relic Forge crafting/slots/buffs)

=== GAME DATA & STATE ===
src/game/GameData.ts            668 baris — World (`underground`..`starwell` W1-W6), `ORES` 112 (48 world + 5 `WEATHER_ORES` = 53 ores),
                                            `WORLD_MINERS` 261 (30 world miners: 5/world incl. Exotic & Secret + 5 `getWeatherLimitedMiners`),
                                            `PICKAXES` 307 (12 tiers W1–W6), `MUTATIONS` 322, `ENCHANTS` 336 (`ENCHANT_DICE_GEM_COST` 334),
                                            `isHighTierMutation` 398 (`frozen`..`unreal`), `GEM_SHOP_ITEMS` 408,
                                            `rollMutation` 524, `CHIBI_STAR_TIERS` 596, `WORLD_RESONANCE_TIERS` 624,
                                            `computeWorldResonances` 637, `rollWorldOre` 659, `rollWorldMiner` 664
src/game/RelicData.ts           289 baris — `MAX_EQUIPPED_RELICS` (3), `RELICS` (12 relics: 6 World, 3 Weather, 3 Tower; `5K`–`300K` Gems),
                                            `getRelicById`, `formatRelicEffects`
src/game/ResearchData.ts      1.598 baris — `ResearchTreeId` (`core` | WorldId) 3, `DENSE_ORE_HP_MULT` (10) /
                                            `DENSE_ORE_DROP_MULT` (3) 19–20, `RESEARCH_TREE_META` 63,
                                            `formatNodeEffectLine` 129, `getNodeNextCost` 164, `CORE_NODES` 172
                                            (Strike I–VI sole `tapDamageFlat`, Vault Expansion I–II `+300K`),
                                            `STARWELL_NODES` 1391, `RESEARCH_NODES` 1574
src/game/TowerData.ts           360 baris — `TOWER_MAX_KEYS` (5), `TOWER_KEY_REGEN_MS` (10m), `TOWER_WAVES_PER_FLOOR` (10),
                                            `TOWER_ORE_ROCKS_PER_WAVE` (5), `TOWER_BLESSING_AUTO_PICK_SEC` (5), `TOWER_BOSS_INVUL_SEC` (5),
                                            `TOWER_CHECKPOINT_STEP` (5), `TOWER_ANOMALIES`, `TOWER_BLESSINGS`,
                                            `TOWER_MILESTONES` (per 5 floor: 5..50), `getTowerFloorDef`, `getTowerWaveDef`,
                                            `rollTowerWaveOres`, `getTowerCheckpoints`, `getTowerSweepGemReward`, `getGlobalGemGainBonus`
src/game/WeatherData.ts         187 baris — `WeatherId` (`light_rain` | `snow_rain` | `bloodmoon` | `void` | `celestial`) 1,
                                            `WEATHER_DURATION_MS` (3m) 3, `WEATHERS` 33 (Celestial 5%: 10x Ore / 4x Gem / 5x DMG),
                                            `getWeatherById` 175, `rollWeatherDef` 179
src/game/GameState.ts         2.467 baris — `PlotUnitState` 145, `SavePayload` 155, `getChibiUpgradeCostMult` 215
                                            (skala biaya upgrade per world & mild rarity premium), `GameState` 242: plot loadout/
                                            leveling, Chibi Star-Up (`getChibiStar` 491, `starUpChibi` 511, `autoStarUpAll` 527),
                                            World Resonance synergy (`getActiveWorldResonances` 543), 1-per-unit Chibi & Enchant plot limits
                                            (`equipChibiOnPlot` `'limit'`, `getAvailableEnchantCount`, `togglePlotEnchant`, `clearHotbarSelection`),
                                            `rollPlotMutation`, buffed `onOreBroken` miner drops, chests (+35% Full-Chest `sellAllChestOres`),
                                            inventory/ore stack, hotbar 1..9, shop stock, potions, research, altar enchant, weather sync/timer/buffs,
                                            Weather Meteor event & Auto Meteor toggle, Relic Forge (`canCraftRelic` 1693, `craftRelic` 1703,
                                            `toggleEquipRelic` 1734, `getRelicBonus` 1748), `getOreHpScale` / `getOreOutputMult` (`denseOreScale`),
                                            global gem bonus, Gem Tower 10-wave/strike-only state/keys/runs/sweep (+ 5s Boss Invul,
                                            5s Blessing Auto-Pick & anti-one-hit boss cap), localStorage save (+ excess plot sanitization)
src/game/AssetUrl.ts             11 baris — `assetUrl` (resolusi URL aset `public/` terhadap `BASE_URL` `./` agar aman di subpath)
src/game/NumberFormat.ts         45 baris — `fmtShort` 22, `fmtMoney` 33, `fmtInt` 37, `fmtPct` 41
src/audio/AudioManager.ts       591 baris — Web Audio SFX pool + synth (`playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`,
                                            `playEnchantEquip`) & HTMLAudio BGM switcher (`audio` 591, `setSceneMode`,
                                            `playOreHit`, `playOreBreak`, `playSfx`, mute persistence, `setAdMuted` 141 & `isEffectivelyMuted` 120)
src/sdk/crazygames.ts           259 baris — CrazyGames SDK v3 wrapper (`isAdPlaying`, `cgInit` uninitialized-domain guard, `cgBindAdLifecycle`, `isCrazyGamesEnv`,
                                            `cgLoadingStart`, `cgGameplayStart`, `cgHappyTime`, `cgRequestRewardedAd`, `cgTryMidgameAd`)

=== UI HUD, MODALS & CSS (Modular Architecture) ===
src/ui/GameHud.ts             2.353 baris — `GameHud`: Thin UI coordinator; syncs compact 3D world-space Chibi nameplates (`PlotLabelInfo`) ke pedestal, manages Tower/Meteor/Shop HUD,
                                            viewport scaling (`updateViewportScale`), currency rail + upgraded audio mute toggle, Weather top-left
                                            3D HUD (`renderWeatherWidget`, Forecast drop inspector, Auto Meteor toggle), hotbar 1..9 (click + drag
                                            reorder + plot drop + auto-clear on outside click), modal scroll preservation, active potion pills,
                                            World Resonance HUD badges, Shop Plaza HUD (+ `Forge` dock shortcut & responsive wrap), Altar HUD + Auto Roll (`triggerSingleEnchantRoll`),
                                            100ms Tower timer tick (incl. 5s Blessing auto-pick), `isTutorialActive` & real chibi strike dispatch
src/ui/HudShared.ts             241 baris — `chibiPortraitHtml` 6 (smooth/pixel portrait), shared types (`ModalKind` 16 incl. `'forge'`,
                                            `ModalThemeId` 29, `InvTab` 31), rarity/ring helpers (`rarityCardClasses` 34 incl.
                                            `exotic`/`secret`, `rarityVars`, `applyInspectRing`), `refreshPotionTimersInDom`,
                                            dark-glass Tailwind `TW_*` constants (`TW_MODAL_BOX` 119 fixed modal height, `TW_SHOP_DOCK_BTN_BASE`), shared shell builders (`renderModalShell` 149,
                                            `renderInspectorPanel` 185)
src/ui/CollectionModalsUi.ts  1.185 baris — `CollectionModalsUi` 43: Index modal (6 worlds + Weather Index tab + Inspector + Chibi 4-pose `Review` `<dialog>`),
                                            Backpack/Inventory (Equip Best / Auto Star-Up / Star-Up Miner / Search / Inspect), Chest modal & live updaters
src/ui/ForgeModalUi.ts          367 baris — `ForgeModalUi` 34: Relic Forge Dark-Glass modal (`renderForgeModal`: 3 equipped slots, All/World/Weather/Tower tabs,
                                            12-relic grid, `renderForgeInspector` + `?` Ore Source Pop-up `renderOreSourcePopup`)
src/ui/ShopModalsUi.ts          653 baris — `ShopModalsUi` 43: Pickaxe Shop, Gem Shop, Sell Shop + Inspectors & updaters
src/ui/TowerUi.ts               561 baris — `TowerUi` 20: Gem Tower Hub Dark-Glass modal (`renderTowerHubModal` 45:
                                            Keys, 5-Floor Checkpoints & Milestones, Anomalies, Quick Sweep, Run Summary) &
                                            3D Arena HUD (`renderTowerArenaHud`, unified Boss & Wave HP bar styling, 5s Boss Invul shield, 5s Blessing auto-pick)
src/ui/TutorialUi.ts            555 baris — `TutorialUi`: Interactive step-by-step onboarding spotlight, arrow guide & `onComplete` callback
src/ui/UpgradesWorldsUi.ts      596 baris — `UpgradesWorldsUi` 17: Research/Upgrades tree & World Teleport full-banner
                                            modal (`buildWorldsListHtml` 308 pakai `public/worlds/*.webp`) & live updaters
src/ui/PlotInspectUi.ts         412 baris — `PlotInspectUi` 28: Plot Inspector overlay (incl. ★Star, World Resonance & per-unit Enchant `In Use`/`Equipped` status), live updater & modal
                                            konfirmasi peringatan roll mutasi Frozen+ (`renderMutationConfirmOverlay`
                                            222: `Stop (Keep)` / `Continue`, proteksi obtain & overwrite)
src/ui/HudIcons.ts              372 baris — SVG, 2D fantasy art (`public/{enchants,hud,meteors,ores,pickaxes,potions,weathers}/*.webp`), & 3D-thumbnail icon helpers (`HUD_ICONS`, `hudIconHtml`,
                                            `weatherIconHtml`, `towerIconHtml`, `pickaxeIconHtml`, `gemPotionIconHtml`,
                                            `enchantAuraIconHtml`, `enchantDiceIconHtml`, `researchIconHtml`)
src/styles/global.css            73 baris — Tailwind v4 entry (`@import "tailwindcss";`) + base font/reset + pickaxe cursor styles
src/styles/hud.css            1.040 baris — Modern Dark-Glass + Luminous Gradient Rail system (`[data-modal-theme]` incl. `forge`,
                                            `.mam-modal` + anti-flicker entrance, `.mam-modal-rails`, `dialog.mam-review-dialog`, `.mam-grid` `max-content` rows, `.mam-no-scrollbar`, `.mam-chibi-smooth`,
                                            `.rarity-exotic`, `.rarity-secret`, `.mam-hotbar-dragging` / `.mam-hotbar-drop-target`, keyframes, a11y)

=== 3D WORLD & RENDERERS ===
src/game3d/MineScene3D.ts     1.132 baris — Main Three.js scene controller: switches `mine` / `shop` / `altar` / `tower`, `SRGBColorSpace` renderer,
                                            cyber-holographic rear `"My Chibi"` stage (`2.44m` pedestal pitch, steel bay dividers, rear busbar & illuminated cyber stairwell), procedural Cyber Loot Chest on Refinery Dais,
                                            `setAdPaused` pause/resume, background pit/miner ticks, pit-floor click auto-target, Tower strike FX pass-through,
                                            weather sky/fog/safe-zone shop lighting (`setWeather`, `applyWeatherAtmosphere`), syncs 3D pedestal labels (`syncPlotLabel`) & plot/station/tower-ore anchors, & `destroy()` (`pedestals`, `pit`, `shopWorld`, `towerArena`, `weatherFx.dispose`)
src/game3d/MineEnvironment3D.ts 618 baris — Dark basalt / cyber-industrial deck terrain + thin perimeter neon trims (`skyHandle`, `setWeatherSky`),
                                            elevated gunmetal & cyan Holo-Display `"My Chibi Minerr"` Gantry, sculpted cyber holoprojector beacons, GPU bokeh mana motes (`dustMat` ShaderMaterial), lateral distant city support pillars & socket-anchored catenary cables
                                            (unobstructed Void black-hole sky window), integrates `CaveRailway3D` (left) & `ChestVaultStation3D` (right), & `dispose()`
src/game3d/CaveRailway3D.ts     902 baris — Left-wing Futuristic Cyber Mine Elevator / Drop Shaft tower (`createCaveRailway` 320) with hollow open shaft well & vertical lift cage,
                                            cool steel-blue turret crown + gyro-antenna beacon + Track-Centered Chamfered Cyan Energy Portal Arch, non-overlapping maglev guideway (`InstancedMesh`), & 1 Cyber Ore Pod shuttle
src/game3d/ChestVaultStation3D.ts 1.015 baris — Right-wing Plasma Ore Refinery (`createChestVaultStation` 469: cyclotron smelter drum, socket-coupled plasma conduits routed behind chest, cyber plasma lanterns & neon escalator `InstancedMesh` cleats)
                                            & stylized Loot Chest (`createProceduralTreasureChest` 187, `disposeObject3D` 52)
src/game3d/WeatherSkyShader.ts  237 baris — Animated GLSL Atmospheric Sky Shader (`createWeatherSkyMaterial` 184:
                                            sky gradient, layered FBM clouds, stars/nebula, Bloodmoon & Celestial moons)
src/game3d/WeatherFx3D.ts       238 baris — `WeatherFx3D` 74: 3D weather particles (rain/snow/embers/void/starfall)
                                            with `setShopMode()` safe-zone boost (`fog: false`), radial/streak canvas textures & `dispose()`
src/game3d/MineWorldPalette.ts  113 baris — `WORLD_PALETTES` 25 (6 worlds incl. `starwell`), `ORE_VARIANTS` 99, `rollOreVariant` 105
src/game3d/OrePit3D.ts         1.285 baris — Dark basalt pit floor, basalt retaining walls + diagonal yellow/black hazard stripe collar + thin neon rim + corner beacon piers,
                                            2.5D-grounded `OreBillboard2D` (3D basalt rubble + crystal collar skirt, horizontal hit recoil, cracked crater AO socket decal, feathered Geode glow seams, Weather Meteor crater impact),
                                            4-layer `AttackImpactFxController` (`hitNode`, `getImpactFxCounts`), `getAliveNodesInfo`, `applyNodeDamagePure` 39, & `dispose()`
src/game3d/AttackImpactFx3D.ts  380 baris — Shared 4-layer cyber-anime impact VFX pool (`AttackImpactFxController` 66: directional dual-pass slash arc, 4-point anime hitspark star, directional spark streaks, ground shockwave ring, oldest-recycling caps & `dispose()`)
src/game3d/PlotPedestal3D.ts  1.252 baris — ZZZ/HSR Cyber-Showcase Plot Podiums (chamfered dock bay w/ cooling fins, edge-lit seam strip, titanium dais, front `01..05` numeric apron plaque, waist-high rear projector stanchions, dual-shell outward-flaring thick Anime-RPG Aura + 34 GPU star embers/streak wisps via shared `createAnimeParticlePoints`, world-space nametag sejajar di `y = 2.68m`) & `dispose()`
src/game3d/FieldMiner3D.ts      342 baris — Active chibi miner placement & shared `ChibiFieldFxController` (calm RPG feathered ground halo + Enchant ground sigil, live `def.accentColor`/Enchant/Rainbow sync, rising GPU particles via `createAnimeParticlePoints`, tanpa aura shell vertikal), 3-beat swing/background mining tick & `dispose()`
src/game3d/ChibiCatalog.ts      465 baris — `CHIBI_CATALOG` 63 (35 chibi poses WebP: 30 world + 5 weather-limited, `ChibiRarity` `common`..`secret`,
                                            baseDps, `smoothFilter` W1–W6, world roster, `getChibiFrameUvOffset`)
src/game3d/ChibiSprite3D.ts     567 baris — Animated 2D-in-3D upright billboard sprite (3-beat combo `triggerAttack`, 2 tinted ghost afterimages, wind-up glint, `setAccentColor`, `smoothFilter` linear/mipmap vs nearest, camera-pitch tilt, normalized pose sizing, alpha-clipped directional shadow + soft AO contact shadow, & `dispose()`)
src/game3d/ShopCyberPlaza3D.ts 1.731 baris — Procedural "Neo-Cyber City Plaza" 3D Lobby (`createShopCyberPlaza` 249):
                                            open sky Gem Tower skyscraper + access terminals, circular roundabout curb + thin neon trim + radial contact shadow (`createRoundaboutShadowTexture`) + Neon Reactor Fountain,
                                            4 high-clearance container kiosks (Pickaxes, Sell, Gem Shop, Plasma Relic Forge, `createShopPadMeshes`) + vending machines & hologram signs,
                                            dark concrete plaza deck + trimmed neon road lanes, modern barriers/benches/streetlights (`InstancedMesh`), safe-zone lighting, & `dispose()`
src/game3d/ShopWorld3D.ts       701 baris — 3D Neo-Cyber Shop Plaza controller (`ShopWorld3D` 140, `ShopCyberPlaza3D`), Plaza walkers, &
                                            6 emblem bangunan 2.5D tinggi (`ArtBillboard2D`), preserved hitboxes & elevated `stationPositions` badges,
                                            Outer Space Altar clock room (10 pedestal 2.5D `EnchantBillboard2D`), & `dispose()`
src/game3d/SeraphimBoss3D.ts  1.722 baris — Full 3D hard-surface Corrupted Seraphim AI Overlord Boss (`createSeraphimBoss3D`, zero `BoxGeometry`):
                                            beveled `ExtrudeGeometry` + `LatheGeometry` + tapered `TubeGeometry` armor, V-fin visor helmet + curved horns,
                                            curved layered pauldrons + aerodynamic arms + 5-clawed hands, dangling cables, & 6 curved feather-blade wings + `update()` + `dispose()`
src/game3d/TowerArena3D.ts    1.130 baris — Battle Tower combat/entity controller (coordinates `TowerCityEnvironment3D` + `SeraphimBoss3D`), elevated Holographic AI Core,
                                            full 3D Seraphim Boss mounted slightly behind crater center (`BOSS_CENTER_Z`), feet-level crater shockwave + anti-gravity rocks + ground-to-body sparks,
                                            5 wave ore slots (Waves 1–9 dengan 2.5D basalt collar, horizontal recoil & feathered `getGeodeGlowTexture`), Chibi Fighters (`ChibiFieldFxController`: ground halo/sigil + live Enchant/Rainbow color sync + rising GPU particles), feathered summon pads, unified 4-layer `AttackImpactFxController`, & `dispose()`
src/game3d/TowerCityEnvironment3D.ts 1.575 baris — Procedural "Ruined Cyber City & Deep Central Meteor Crater" (`createTowerCityEnvironment`):
                                            raised holed highway (`y = 0.52`), recessed crater (`y = 0.08`) with jagged charred fissures + core embers,
                                            crater fire embers + dark ash flakes (`InstancedMesh`) + street electric sparks, dented guardrails,
                                            flickering streetlights, & 22 ruined skyscrapers (`InstancedMesh` varied/shattered window grids + glass shards + rooftop ducts/stairs)
src/game3d/AltarSpinFx3D.ts     529 baris — `createAltarClockDial` 34, `createAltarClockHand` 156,
                                            `createAltarSubHand` 254, `AltarParticleSystem` 308
src/game3d/HellAltarEye3D.ts    373 baris — `HellAltarEyeController` 151: Outer Space starfield, cosmic astrolabe floor ring (`dt`-clamped `update`),
                                            & distant Pitch-Black Black Hole (`#000000` event horizon, photon ring, lensing arches, accretion disk)
src/game3d/AuraModels3D.ts      586 baris — `createEnchantAura3D` 276, `createEnchantDice3D` 318, `ArtBillboard2D` 413 & `EnchantBillboard2D` 577 (2.5D sprites)
src/game3d/HudIcon3DRenderer.ts 2.002 baris — Offscreen WebGL renderer generating cached data-URL 3D icons (`buildStarwellOreModel` 1351)
                                            & 5 3D weather icons (`init3dHudIcons` 1842)
src/game3d/ProceduralTextures3D.ts 600 baris — Procedural cyber-basalt/hazard & cyber-anime VFX canvas textures (`paintCachedTexture` + `DataTexture` Node fallback for sky dome, cyber deck, basalt pavers, hazard stripes, dual slash, hitspark star, shockwave ring, wind-up glint, spark streak)
src/game3d/GlbAssets3D.ts       135 baris — Async GLTF/GLB loader & cache (`mountGlbProp` 45, `preloadCommonMineModels` 116)

=== ASSETS (`public/`) ===
public/audio/                   CC0 BGM (`bgm/bgm-{mine,shop,tower,boss}.mp3`) & 24 SFX (`sfx/*.ogg|wav|mp3`) + `LICENSE.txt`
public/chibi/                   35 chibi (`<id>/{attack,idle,pose,walk}.webp` W1–W6 + 5 weather-limited non-pixel anime art, 140 files)
public/enchants/                11 transparent WebP fantasy aura & dice icons (`blazing`..`spellbound`, `enchant_dice`)
public/hud/                     18 HUD & modal art icons (`shops`..`lock`, incl. `tower_boss.webp` & `game_banner.webp` 3:1 Mine banner)
public/meteors/                 5 Weather Meteor `.webp` sprites (`light_rain`, `snow_rain`, `bloodmoon`, `void`, `celestial`)
public/models/                  Kenney & fantasy `.glb` packs (`castle/`, `factory/`, `fantasy-town/`, `mini-dungeon/`,
                                `modular-cave/`, `nature/`, `platformer/`, `retro-fantasy/`, `survival/`, `train/`)
public/ores/                    53 transparent WebP fantasy ore icons (48 W1–W6 `underground`..`starwell` + 5 weather-limited)
public/pickaxes/                12 transparent WebP fantasy pickaxe art icons (`starter`..`starwellcrown`)
public/potions/                 8 transparent WebP fantasy potion art icons (`ore-elixir-1`..`mutation-luck-1`)
public/relics/                  12 transparent WebP 384×384 Relic Forge icons (`miner_lantern`..`commander_banner`)
public/weathers/                5 transparent WebP fantasy weather emblem icons (`light_rain`..`celestial`)
public/worlds/                  6 full-bleed teleport banner WebPs (`underground`, `crystal`, `magma`, `ruins`, `astral`, `starwell`)
```

---

## 3. QUICK TARGET LOOKUP (Edit cepat)

| Tugas / Area | File & Simbol |
|---|---|
| Ore, Miner (`Exotic`/`Secret`), Star-Up & World Resonance | `src/game/GameData.ts` (`ORES`, `WORLD_MINERS`, `CHIBI_STAR_TIERS`, `WORLD_RESONANCE_TIERS`, `computeWorldResonances`) |
| Research tree nodes, Core Strike/Vault & `denseOreScale` | `src/game/ResearchData.ts` (`CORE_NODES`, `STARWELL_NODES`, `RESEARCH_NODES`, `DENSE_ORE_HP_MULT`, `getNodeNextCost`) |
| Gem Tower scaling, Anomalies, Blessings, Milestones | `src/game/TowerData.ts` (`getTowerFloorDef`, `TOWER_BLESSINGS`, `TOWER_MILESTONES`) |
| Weather config, probabilities & multipliers | `src/game/WeatherData.ts` (`WEATHERS`, `WEATHER_DURATION_MS`, `rollWeatherDef`) |
| State, Star-Up, Resonance, Save/Load, Hotbar/Plot, Weather | `src/game/GameState.ts` (`GameState`, `starUpChibi`, `autoStarUpAll`, `getActiveWorldResonances`, `getChibiUpgradeCostMult`, `syncWeather`) |
| Responsive HUD scale, Topbar, Weather HUD, Altar Auto Roll, Hotbar | `src/ui/GameHud.ts` (`updateViewportScale`, `render`, `setSceneMode`, `triggerSingleEnchantRoll`) |
| Shared Modal Shell, Inspector Shell, Tailwind `TW_*` | `src/ui/HudShared.ts` (`renderModalShell`, `renderInspectorPanel`, `TW_*`) |
| Pickaxe Shop, Gem Shop, Sell Shop + Inspectors | `src/ui/ShopModalsUi.ts` (`ShopModalsUi`) |
| Gem Tower Hub Modal, 3D Arena HUD, Blessings picker | `src/ui/TowerUi.ts` (`TowerUi`) |
| Relic Forge (12 Relics, resep, 3 slot, Ore Source pop-up) | `src/game/RelicData.ts` (`RELICS`, `MAX_EQUIPPED_RELICS`), `src/ui/ForgeModalUi.ts` (`ForgeModalUi`), `public/relics/*.webp` |
| Index (6 Worlds), Backpack/Inventory, Chest + Inspectors | `src/ui/CollectionModalsUi.ts` (`CollectionModalsUi`) |
| Research/Upgrades Tree & World Teleport Banner Modal | `src/ui/UpgradesWorldsUi.ts` (`UpgradesWorldsUi`, `buildWorldsListHtml`) |
| Plot Inspector Overlay & Frozen+ Mutation Confirm Modal | `src/ui/PlotInspectUi.ts` (`PlotInspectUi`, `renderMutationConfirmOverlay`) |
| Modal/HUD CSS & Responsive Breakpoints | `src/styles/hud.css` + `src/ui/HudShared.ts` (`TW_*`) |
| Audio (BGM switcher, Web Audio Synth Roll/Spin SFX, Mute toggle) | `src/audio/AudioManager.ts` (`audio`, `playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`) + `public/audio/` |
| 3D Sky Shader, Weather FX, Ore Pit, Attack VFX & 3D HUD Icons | `src/game3d/WeatherSkyShader.ts`, `WeatherFx3D.ts`, `OrePit3D.ts`, `AttackImpactFx3D.ts` (`AttackImpactFxController`), `ChibiSprite3D.ts`, `ProceduralTextures3D.ts`, `HudIcon3DRenderer.ts` |
| 3D Chest Vault, Escalator, Cave Mountain & Hollow Minecart | `src/game3d/ChestVaultStation3D.ts` (`createProceduralTreasureChest`, `createChestVaultStation`), `CaveRailway3D.ts` (`createCaveRailway`), `MineEnvironment3D.ts` |
| 3D Shop Plaza, Outer Space Enchant Altar + Black Hole & Tower Arena | `src/game3d/ShopCyberPlaza3D.ts` (`createShopCyberPlaza`), `src/game3d/ShopWorld3D.ts` (`ShopWorld3D`), `src/game3d/HellAltarEye3D.ts`, `src/game3d/AltarSpinFx3D.ts`, `src/game3d/SeraphimBoss3D.ts` (`createSeraphimBoss3D`), `src/game3d/TowerArena3D.ts`, `src/game3d/TowerCityEnvironment3D.ts` (`createTowerCityEnvironment`) |
| Rules, CrazyGames SDK v3, UI/HUD & Procedural 3D Skills | `.agent/rules/threejs-ts-standards.md`, `.agent/skills/{crazygames-sdk-v3,ui-hud-design,procedural-3d-assets}/SKILL.md` |
