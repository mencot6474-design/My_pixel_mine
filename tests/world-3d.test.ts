import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  PIT_EVENT_COOLDOWN_MAX_SEC,
  PIT_EVENT_COOLDOWN_MIN_SEC,
  PIT_EVENT_DEFS,
  computePitEventBonusGems,
  rollNextPitEventCooldownSec,
  rollPitEventKind,
} from '../src/game/PitEventsDomain';
import {
  applyCameraOrbitDrag,
  clampCameraZoomRadius,
  HOLD_MINE_INITIAL_DELAY_SEC,
  HOLD_MINE_INTERVAL_SEC,
  stepHoldMineTimer,
} from '../src/game3d/MineScene3D';
import { AudioManager } from '../src/audio/AudioManager';
import {
  cgBindAdLifecycle,
  cgBindAudioMuteListener,
  cgGameplayStart,
  cgGameplayStop,
  cgHappyTime,
  cgInit,
  cgLoadingStart,
  cgLoadingStop,
  cgRequestRewardedAd,
  cgTryMidgameAd,
  isAdPlaying,
  isCrazyGamesEnv,
} from '../src/sdk/crazygames';
import {
  DEFAULT_PICKAXE_STOCK,
  ENCHANT_DICE_GEM_COST,
  ENCHANTS,
  GEM_SHOP_ITEMS,
  getOresByWorld,
  getMinerRarity,
  getMinersByWorld,
  getOreById,
  getPickaxeSellValue,
  getWorldById,
  isHighTierMutation,
  MUTATIONS,
  ORES,
  PICKAXES,
  RARITY_BORDER,
  WORLD_MINERS,
  WORLDS,
} from '../src/game/GameData';
import {
  formatNodeEffectLine,
  getResearchNodesForTree,
  getResearchTreeMaxPoints,
  RESEARCH_NODES,
} from '../src/game/ResearchData';
import { GameState, getChibiUpgradeCostMult } from '../src/game/GameState';
import { FUSION_RECIPES } from '../src/game/FusionData';
import { MAX_EQUIPPED_RELICS, RELICS } from '../src/game/RelicData';
import { rollWeatherDef, WEATHER_DURATION_MS, WEATHERS } from '../src/game/WeatherData';
import { fmtMoney, fmtShort } from '../src/game/NumberFormat';
import { createEnchantAura3D, createEnchantDice3D, EnchantBillboard2D } from '../src/game3d/AuraModels3D';
import {
  AltarParticleSystem,
  createAltarClockDial,
  createAltarClockHand,
  createAltarSubHand,
} from '../src/game3d/AltarSpinFx3D';
import { AttackImpactFxController } from '../src/game3d/AttackImpactFx3D';
import {
  CHIBI_CATALOG,
  CHIBI_FRAME_INDEX,
  getChibiById,
  getChibiFrameUvOffset,
} from '../src/game3d/ChibiCatalog';
import {
  createCaveRailway,
  CaveRailwayHandle,
} from '../src/game3d/CaveRailway3D';
import {
  createChestVaultStation,
  createProceduralTreasureChest,
} from '../src/game3d/ChestVaultStation3D';
import { ChibiSprite3D } from '../src/game3d/ChibiSprite3D';
import { ChibiFieldFxController, FieldMiner3D } from '../src/game3d/FieldMiner3D';
import { FusionWorld3D } from '../src/game3d/FusionWorld3D';
import { MineEnvironment3D } from '../src/game3d/MineEnvironment3D';
import { DEFAULT_WORLD_PALETTE, rollOreVariant, STAGE_PEDESTAL_COUNT } from '../src/game3d/MineWorldPalette';
import {
  applyNodeDamagePure,
  BASE_ORE_RESPAWN_SEC,
  computeMeteorDynamicHp,
  METEOR_HP_MULT,
  OrePit3D,
  PIT_NODE_COUNT,
} from '../src/game3d/OrePit3D';
import { PlotPedestal3D } from '../src/game3d/PlotPedestal3D';
import {
  getDualSlashArcTexture,
  getFusionMagicCircuitTexture,
  getHitSparkStarTexture,
  getShockwaveRingTexture,
  getSparkStreakTexture,
  getWindupGlintTexture,
} from '../src/game3d/ProceduralTextures3D';
import { createShopCyberPlaza } from '../src/game3d/ShopCyberPlaza3D';
import { ShopWorld3D } from '../src/game3d/ShopWorld3D';
import { createSeraphimBoss3D } from '../src/game3d/SeraphimBoss3D';
import { TowerArena3D } from '../src/game3d/TowerArena3D';
import { createTowerCityEnvironment } from '../src/game3d/TowerCityEnvironment3D';
import { WeatherFx3D } from '../src/game3d/WeatherFx3D';
import { enchantAuraIconHtml, enchantDiceIconHtml, gemPotionIconHtml, hudIconHtml, oreIconSvg, pickaxeIconHtml, towerIconHtml, weatherIconHtml } from '../src/ui/HudIcons';
import {
  getGlobalGemGainBonus,
  getTowerCheckpoints,
  getTowerFloorDef,
  getTowerSweepGemReward,
  getTowerWaveDef,
  rollTowerWaveOres,
  TOWER_KEY_GEM_COST,
  TOWER_MAX_KEYS,
  TOWER_MILESTONES,
  TOWER_ORE_ROCKS_PER_WAVE,
  TOWER_WAVES_PER_FLOOR,
} from '../src/game/TowerData';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

describe('Pure 3D Mine World', () => {
  it('defines a valid daylight palette for the 3D quarry island', () => {
    expect(DEFAULT_WORLD_PALETTE.skyTop).toMatch(HEX_RE);
    expect(DEFAULT_WORLD_PALETTE.skyBottom).toMatch(HEX_RE);
    expect(DEFAULT_WORLD_PALETTE.fogColor).toMatch(HEX_RE);
    expect(DEFAULT_WORLD_PALETTE.terrainColor).toMatch(HEX_RE);
    expect(DEFAULT_WORLD_PALETTE.cliffColor).toMatch(HEX_RE);
    expect(DEFAULT_WORLD_PALETTE.pitFloorColor).toMatch(HEX_RE);
    expect(DEFAULT_WORLD_PALETTE.foliageColor).toMatch(HEX_RE);
    expect(DEFAULT_WORLD_PALETTE.pitFloorColor.toLowerCase()).not.toBe(
      DEFAULT_WORLD_PALETTE.rockColor.toLowerCase()
    );
  });

  it('rolls 3D ore variants across cumulative weight boundaries', () => {
    expect(rollOreVariant(() => 0).key).toBe('common');
    expect(rollOreVariant(() => 0.549).key).toBe('common');
    expect(rollOreVariant(() => 0.55).key).toBe('vein');
    expect(rollOreVariant(() => 0.869).key).toBe('vein');
    expect(rollOreVariant(() => 0.87).key).toBe('geode');
    expect(rollOreVariant(() => 0.9999).key).toBe('geode');
  });

  it('breaks an ore node cleanly once when HP reaches zero', () => {
    const node = { hp: 50, alive: true };
    const hit = applyNodeDamagePure(node, 80);
    expect(hit?.broken).toBe(true);
    expect(hit?.dmgDealt).toBe(50);
    expect(node.alive).toBe(false);
    expect(node.hp).toBe(0);

    expect(applyNodeDamagePure(node, 20)).toBeNull();
  });

  it('registers all 59 chibi spritesheets and slices 4-frame UV offsets cleanly', () => {
    expect(CHIBI_CATALOG.length).toBe(59);
    expect(getChibiById('solar-striker')?.spriteUrl).toBe('/chibi/solar-striker/idle.webp');
    expect(getChibiById('solar-striker')?.poses.attack).toBe('/chibi/solar-striker/attack.webp');
    expect(getChibiFrameUvOffset(CHIBI_FRAME_INDEX.idle, 4)).toBe(0);
    expect(getChibiFrameUvOffset(CHIBI_FRAME_INDEX.dash, 4)).toBe(0.25);
    expect(getChibiFrameUvOffset(CHIBI_FRAME_INDEX.attack, 4)).toBe(0.5);
    expect(getChibiFrameUvOffset(CHIBI_FRAME_INDEX.aura, 4)).toBe(0.75);
  });

  it('formats Roblox My Anime Mine suffixes and populates Index/Inventory/Chest flows', () => {
    expect(fmtShort(1500)).toBe('1.5K');
    expect(fmtMoney(16.7e45)).toBe('$16.7Qad');
    expect(ORES.length).toBe(58);
    expect(WORLD_MINERS.length).toBe(40);
    expect(getOresByWorld('underground').map((o) => o.name)).toContain('Coalite');
    const crystalOres = getOresByWorld('crystal');
    expect(crystalOres.map((o) => o.name)).toEqual([
      'Glowquartz',
      'Frostquartz',
      'Prismite',
      'Hushstone',
      'Azurine',
      'Glimmerite',
      'Spectrine',
      'Celestium',
    ]);
    expect(crystalOres.reduce((acc, o) => acc + o.chancePct, 0)).toBeCloseTo(100, 4);
    expect(crystalOres[0].sellValue).toBeGreaterThan(getOresByWorld('underground')[0].sellValue * 10);

    const magmaOres = getOresByWorld('magma');
    expect(magmaOres.map((o) => o.name)).toEqual([
      'Emberstone',
      'Ashglass',
      'Magmite',
      'Cindershard',
      'Scorchgold',
      'Pyroclast',
      'Moltenite',
      'Pyrecore',
    ]);
    expect(magmaOres.reduce((acc, o) => acc + o.chancePct, 0)).toBeCloseTo(100, 4);
    expect(magmaOres[0].sellValue).toBeGreaterThan(crystalOres[0].sellValue);
    expect(magmaOres[7].sellValue).toBeGreaterThan(crystalOres[7].sellValue);

    const ruinsOres = getOresByWorld('ruins');
    expect(ruinsOres.map((o) => o.name)).toEqual([
      'Runestone',
      'Dustglyph',
      'Relicore',
      'Sanctite',
      'Gildium',
      'Oathstone',
      'Idolshard',
      'Immortite',
    ]);
    expect(ruinsOres.reduce((acc, o) => acc + o.chancePct, 0)).toBeCloseTo(100, 4);
    expect(ruinsOres[0].sellValue).toBeGreaterThan(magmaOres[0].sellValue);
    expect(ruinsOres[7].sellValue).toBeGreaterThan(magmaOres[7].sellValue);

    const voidOres = getOresByWorld('astral');
    expect(voidOres.map((o) => o.name)).toEqual([
      'Voidshard',
      'Gloomite',
      'Nullite',
      'Riftglass',
      'Starcore',
      'Cosmite',
      'Singularite',
      'Duskcrown',
    ]);
    expect(voidOres.reduce((acc, o) => acc + o.chancePct, 0)).toBeCloseTo(100, 4);
    expect(voidOres[0].sellValue).toBeGreaterThan(ruinsOres[0].sellValue);
    expect(voidOres[7].sellValue).toBeGreaterThan(ruinsOres[7].sellValue);

    const starwellOres = getOresByWorld('starwell');
    expect(starwellOres.map((o) => o.name)).toEqual([
      'Cloudgrit',
      'Skyshale',
      'Sunvein',
      'Gleamstone',
      'Aurorine',
      'Zenithite',
      'Caelite',
      'Dawncrown',
    ]);
    expect(starwellOres.reduce((acc, o) => acc + o.chancePct, 0)).toBeCloseTo(100, 4);
    expect(starwellOres[0].sellValue).toBeGreaterThan(voidOres[0].sellValue);
    expect(starwellOres[7].sellValue).toBeGreaterThan(voidOres[7].sellValue);

    const abyssalOres = getOresByWorld('abyssal');
    expect(abyssalOres.map((o) => o.name)).toEqual([
      'Trenchslate',
      'Prismarine',
      'Pelagium',
      'Abyssalite',
      'Leviapearl',
    ]);
    expect(abyssalOres.map((o) => o.rarity)).toEqual(['legendary', 'rainbow', 'mythic', 'exotic', 'secret']);
    expect(abyssalOres.reduce((acc, o) => acc + o.chancePct, 0)).toBeCloseTo(100, 4);
    expect(abyssalOres[0].sellValue).toBeGreaterThan(starwellOres[0].sellValue);
    expect(abyssalOres[4].sellValue).toBeGreaterThan(starwellOres[7].sellValue);

    const chronoOres = getOresByWorld('chrono');
    expect(chronoOres.map((o) => o.name)).toEqual([
      'Mithrilite',
      'Orichalcite',
      'Adamantite',
      'Aetherium',
      'Chronocrown',
    ]);
    expect(chronoOres.map((o) => o.rarity)).toEqual(['legendary', 'rainbow', 'mythic', 'exotic', 'secret']);
    expect(chronoOres.reduce((acc, o) => acc + o.chancePct, 0)).toBeCloseTo(100, 4);
    expect(chronoOres[0].sellValue).toBeGreaterThan(abyssalOres[0].sellValue);
    expect(chronoOres[4].sellValue).toBeGreaterThan(abyssalOres[4].sellValue);

    expect(getMinersByWorld('underground').length).toBe(5);
    expect(getMinersByWorld('crystal').length).toBe(5);
    expect(getMinersByWorld('magma').length).toBe(5);
    expect(getMinersByWorld('ruins').length).toBe(5);
    expect(getMinersByWorld('astral').length).toBe(5);
    expect(getMinersByWorld('starwell').length).toBe(5);
    expect(getMinersByWorld('abyssal').length).toBe(5);
    expect(getMinersByWorld('chrono').length).toBe(5);

    const gs = new GameState();
    expect(gs.getTotalIndexCount()).toBe(120);
    gs.discovered.add('stormwater-opal');
    gs.discovered.add('glitch-cheshire');
    gs.discovered.add('cosmic-monarch');
    expect(gs.getDiscoveredCount()).toBe(4);
    expect(gs.getWorldIndexProgress('astral')).toEqual({ found: 0, total: 13, pct: 0 });
    expect(gs.getWorldIndexProgress('starwell')).toEqual({ found: 0, total: 13, pct: 0 });
    expect(gs.getWorldIndexProgress('abyssal')).toEqual({ found: 0, total: 10, pct: 0 });
    expect(gs.getWorldIndexProgress('chrono')).toEqual({ found: 0, total: 10, pct: 0 });
    expect(gs.hotbar.every((s) => s === null)).toBe(true);
    expect(gs.plotMiners[0]).toBe('astral-recruit');
    expect(gs.plotMiners.slice(1).every((s) => s === null)).toBe(true);
    gs.onOreBroken('geode', () => 0.01);
    expect(gs.getChestItemCount()).toBeGreaterThan(0);
    const taken = gs.takeAllFromChest();
    expect(taken).toBeGreaterThan(0);
    expect(gs.getChestItemCount()).toBe(0);
    gs.equipBestMiners();
    expect(gs.plotMiners[0]).not.toBeNull();
    expect(gs.getPlotUnitStats(0)?.dmg).toBeGreaterThan(0);
    gs.cash = 10000;
    expect(gs.upgradePlotDamage(0)).toBe(true);
    expect(gs.getPlotUnit(0)?.damageLevel).toBe(2);
    // takeAllFromChest auto-populated collected miner & ore into hotbar; toggling un-equips and re-equips cleanly
    expect(gs.hotbar.some((s) => s !== null)).toBe(true);
    const firstPlotMiner = gs.plotMiners[0]!;
    if (gs.hotbar.includes(firstPlotMiner)) {
      gs.toggleEquipMiner(firstPlotMiner);
      expect(gs.hotbar).not.toContain(firstPlotMiner);
    }
    gs.toggleEquipMiner(firstPlotMiner);
    expect(gs.hotbar).toContain(firstPlotMiner);
  });

  it('buys pickaxes and batch-sells ores/miners/pickaxes with live subscriber updates', () => {
    const gs = new GameState();
    let emitCount = 0;
    gs.subscribe(() => {
      emitCount++;
    });

    gs.cash = 1000;
    const beforeStock = gs.pickaxeStock.sunwheel;
    expect(gs.buyPickaxe('sunwheel')).toBe('bought');
    expect(emitCount).toBe(1);
    expect(gs.pickaxeStock.sunwheel).toBe(beforeStock - 1);
    expect(gs.ownedPickaxes.sunwheel).toBe(1);
    expect(gs.cash).toBe(550);

    gs.ores.coalite = 2;
    gs.miners['solar-striker'] = 2;
    const cashBeforeSell = gs.cash;
    const earned = gs.sellBatch(['ore:coalite', 'miner:solar-striker', 'pickaxe:sunwheel']);
    expect(earned).toBeGreaterThan(0);
    expect(gs.cash).toBe(cashBeforeSell + earned);
    expect(gs.ores.coalite).toBeUndefined();
    expect(gs.miners['solar-striker']).toBeUndefined();
    expect(gs.ownedPickaxes.sunwheel).toBeUndefined();
    expect(emitCount).toBe(2);
  });

  it('buys Gem Shop potions into Backpack, activates via useGemPotion, and applies gameplay multipliers', () => {
    expect(GEM_SHOP_ITEMS.length).toBe(8);
    for (const pot of GEM_SHOP_ITEMS) {
      expect(existsSync(resolve(process.cwd(), 'public', 'potions', `${pot.id}.webp`))).toBe(true);
      expect(gemPotionIconHtml(pot.id, 64, pot.name, pot.color)).toContain(`potions/${pot.id}.webp`);
    }
    const gs = new GameState();
    let emits = 0;
    gs.subscribe(() => {
      emits++;
    });

    gs.gems = 1500;
    expect(gs.buyGemShopItem('ore-elixir-1')).toBe('bought');
    expect(gs.buyGemShopItem('regrowth-potion')).toBe('bought');
    expect(gs.buyGemShopItem('ore-luck-potion')).toBe('bought');
    expect(gs.buyGemShopItem('mutation-luck-1')).toBe('bought');
    expect(emits).toBe(4);
    expect(gs.gems).toBe(1500 - 100 - 300 - 500 - 600);

    // Purchased potions go to Backpack (others), not immediately active
    expect(gs.others['ore-elixir-1']).toBe(1);
    expect(gs.others['regrowth-potion']).toBe(1);
    expect(gs.others['ore-luck-potion']).toBe(1);
    expect(gs.others['mutation-luck-1']).toBe(1);
    expect(gs.getBoostRemainingSec('ore-elixir-1')).toBe(0);
    expect(gs.getOreOutputMult()).toBe(1);
    expect(gs.getRespawnSpeedMult()).toBe(1);

    // Using potion from Backpack consumes 1 and starts the timer + multiplier
    expect(gs.useGemPotion('ore-elixir-1')).toBe(true);
    expect(gs.useGemPotion('regrowth-potion')).toBe(true);
    expect(gs.useGemPotion('ore-luck-potion')).toBe(true);
    expect(gs.useGemPotion('mutation-luck-1')).toBe(true);
    expect(gs.others['ore-elixir-1']).toBeUndefined();
    expect(gs.useGemPotion('ore-elixir-1')).toBe(false);

    expect(gs.getOreOutputMult()).toBeCloseTo(1.1);
    expect(gs.getRespawnSpeedMult()).toBe(2.0);
    expect(gs.getOreLuckMult()).toBe(2.0);
    expect(gs.getMutationLuckMult()).toBe(2.0);
    expect(gs.getBoostRemainingSec('ore-elixir-1')).toBeGreaterThan(590);
    expect(gs.buyGemShopItem('ore-elixir-3')).toBe('no_gems');
  });

  it('builds unique non-empty 3D Aura models for all 10 enchants and the Enchanted Dice', () => {
    expect(ENCHANTS).toHaveLength(10);
    for (const enc of ENCHANTS) {
      const aura = createEnchantAura3D(enc.id);
      expect(aura).toBeInstanceOf(THREE.Group);
      expect(aura.children.length).toBeGreaterThan(0);
    }
    const dice = createEnchantDice3D();
    expect(dice).toBeInstanceOf(THREE.Group);
    expect(dice.children.length).toBeGreaterThan(0);
  });

  it('builds Altar clock dial, clock hands, and updates spin particle buffers safely', () => {
    const dial = createAltarClockDial(
      ENCHANTS.map((e, i) => ({
        x: Math.cos((i / ENCHANTS.length) * Math.PI * 2) * 5.4,
        z: Math.sin((i / ENCHANTS.length) * Math.PI * 2) * 3.9 - 2.4,
        color: e.color,
      }))
    );
    expect(dial.group.children.length).toBeGreaterThan(10);

    const mainHand = createAltarClockHand();
    expect(mainHand.group.children.length).toBeGreaterThan(5);
    const subHand = createAltarSubHand();
    expect(subHand.children.length).toBeGreaterThan(1);

    const fx = new AltarParticleSystem();
    expect(fx.group.children.length).toBeGreaterThanOrEqual(2);
    fx.spawnNeedleTrail(2.8, 0.6, -2.4, '#38bdf8', 5);
    fx.spawnBurst(0, 0.7, -2.4, '#a855f7', 30, 1.2);
    fx.triggerWinShockwave(2, 0, -2, '#facc15');
    expect(() => fx.update(0.016, 1.5, 0.8, '#f97316')).not.toThrow();
  });

  it('uses 5 plot slots in state and equips/syncs enchants cleanly', () => {
    expect(STAGE_PEDESTAL_COUNT).toBe(5);
    const gs = new GameState();
    expect(gs.plotMiners).toHaveLength(5);
    expect(gs.plotUnits).toHaveLength(5);

    gs.miners['astral-recruit'] = 7;
    gs.equipBestMiners();
    expect(gs.plotMiners.filter(Boolean)).toHaveLength(5);
    expect(gs.placeSelectedOnPlot(5)).toBe('need-select');

    expect(gs.togglePlotEnchant(0, 'blazing')).toBe(true);
    expect(gs.getPlotUnit(0)?.enchantId).toBe('blazing');
    expect(gs.getPlotUnitStats(0)?.dmg).toBeGreaterThan(CHIBI_CATALOG[0].baseDps);

    const ped = new PlotPedestal3D(0, 0, -4.25);
    expect(ped.getEnchantId()).toBeNull();
    expect(ped.group.children.length).toBeGreaterThan(0);
    expect(() => ped.update(0.016, 1.0)).not.toThrow();

    const auraMesh = createEnchantAura3D('blazing', 0.62);
    expect(auraMesh.children.length).toBeGreaterThan(0);
  });

  it('preserves character stats, mutations, enchants, and pickaxes across equipBestMiners and pickup/re-place', () => {
    const gs = new GameState();
    const c0 = CHIBI_CATALOG[0].id;
    const strong1 = CHIBI_CATALOG[10].id;
    const strong2 = CHIBI_CATALOG[11].id;
    const strong3 = CHIBI_CATALOG[12].id;
    const strong4 = CHIBI_CATALOG[13].id;
    const strong5 = CHIBI_CATALOG[14].id;

    // Place and heavily upgrade c0 in slot 2
    gs.miners[c0] = 1;
    gs.plotMiners[2] = c0;
    gs.plotUnits[2] = {
      chibiId: c0,
      damageLevel: 5,
      speedLevel: 4,
      miningSpeedLevel: 3,
      pickaxeId: 'iron-pick',
      mutationId: 'golden',
      enchantId: 'blazing',
    };

    // Add a stronger miner strong1 and run Equip Best -> strong1 takes slot 0, c0 shifts to slot 1 without losing stats
    gs.miners[strong1] = 1;
    gs.equipBestMiners();

    const c0SlotAfterFirst = gs.plotMiners.indexOf(c0);
    expect(c0SlotAfterFirst).toBe(1);
    const c0UnitAfterFirst = gs.getPlotUnit(c0SlotAfterFirst);
    expect(c0UnitAfterFirst).toMatchObject({
      chibiId: c0,
      damageLevel: 5,
      speedLevel: 4,
      miningSpeedLevel: 3,
      pickaxeId: 'iron-pick',
      mutationId: 'golden',
      enchantId: 'blazing',
    });

    // Add 4 more top-tier miners (strong2..strong5) so 5 stronger miners displace c0 to stash
    gs.miners[strong2] = 1;
    gs.miners[strong3] = 1;
    gs.miners[strong4] = 1;
    gs.miners[strong5] = 1;
    gs.equipBestMiners();

    // Strongest 5 should now occupy the plot, c0 displaced with pickaxe safely returned to inventory
    expect(gs.plotMiners.includes(c0)).toBe(false);
    expect(gs.ownedPickaxes['iron-pick']).toBe(1);
    expect(gs.stashedUnits[c0]?.length).toBe(1);
    expect(gs.stashedUnits[c0]?.[0]).toMatchObject({
      chibiId: c0,
      damageLevel: 5,
      speedLevel: 4,
      miningSpeedLevel: 3,
      pickaxeId: '',
      mutationId: 'golden',
      enchantId: 'blazing',
    });

    // Manually remove slot 4 and re-place c0 -> restored with all upgrades intact
    gs.removeMinerFromPlot(4);
    if (!gs.hotbar.includes(c0)) gs.toggleEquipMiner(c0);
    gs.selectHotbarSlot(gs.hotbar.indexOf(c0));
    expect(gs.placeSelectedOnPlot(4)).toBe('placed');
    expect(gs.getPlotUnit(4)).toMatchObject({
      chibiId: c0,
      damageLevel: 5,
      speedLevel: 4,
      miningSpeedLevel: 3,
      mutationId: 'golden',
      enchantId: 'blazing',
    });
    expect(gs.stashedUnits[c0] ?? []).toHaveLength(0);

    // Pick up c0 via removeMinerFromPlot and place on slot 4 again -> stats remain preserved
    gs.removeMinerFromPlot(4);
    expect(gs.stashedUnits[c0]?.length).toBe(1);
    expect(gs.placeSelectedOnPlot(4)).toBe('placed');
    expect(gs.getPlotUnit(4)).toMatchObject({
      chibiId: c0,
      damageLevel: 5,
      speedLevel: 4,
      miningSpeedLevel: 3,
      mutationId: 'golden',
      enchantId: 'blazing',
    });
  });

  it('prices Enchanted Dice at 250 gems and locks Altar wheel spin until animation completes', async () => {
    expect(ENCHANT_DICE_GEM_COST).toBe(250);
    const gs = new GameState();
    gs.gems = 249;
    expect(gs.buyEnchantDice(1)).toBe(false);
    expect(gs.gems).toBe(249);

    gs.gems = 250;
    const diceBefore = gs.enchantDice;
    expect(gs.buyEnchantDice(1)).toBe(true);
    expect(gs.gems).toBe(0);
    expect(gs.enchantDice).toBe(diceBefore + 1);

    const { ShopWorld3D } = await import('../src/game3d/ShopWorld3D');
    const shop = new ShopWorld3D();
    let completed = 0;
    expect(shop.isSpinning()).toBe(false);
    expect(
      shop.triggerSpin('blazing', () => {
        completed++;
      })
    ).toBe(true);
    expect(shop.isSpinning()).toBe(true);

    // Spamming triggerSpin mid-animation must be rejected
    expect(shop.triggerSpin('glacial')).toBe(false);
    expect(completed).toBe(0);

    // Advance until spin duration (1.9s) finishes
    for (let i = 0; i < 40; i++) {
      shop.update(0.05, (i + 1) * 0.05, 'altar');
    }
    expect(shop.isSpinning()).toBe(false);
    expect(completed).toBe(1);
  });

  it('starts with no legacy placeholder items in backpack others', async () => {
    const { OTHER_ITEMS } = await import('../src/game/GameData');
    expect(OTHER_ITEMS).toHaveLength(0);

    const gs = new GameState();
    for (const legacyId of [
      'summon-scroll',
      'gems-pouch',
      'quaking-potion',
      'glacial-potion',
      'blazing-potion',
      'diamondbound-charm',
    ]) {
      expect(gs.others[legacyId]).toBeUndefined();
    }
  });

  it('enforces sequential world unlock gates, Voidreach naming, global Core upgrades, and per-world tree isolation', () => {
    expect(WORLDS).toHaveLength(8);
    expect(getWorldById('astral').name).toBe('Voidreach');
    expect(getWorldById('starwell').name).toBe('Starwell');
    expect(getWorldById('abyssal').name).toBe('Abyssal Biolume');
    expect(getWorldById('chrono').name).toBe('Chrono Nexus');
    expect(PIT_NODE_COUNT).toBe(1);
    expect(BASE_ORE_RESPAWN_SEC).toBeGreaterThanOrEqual(3.5);

    for (const wid of ['underground', 'crystal', 'magma', 'ruins', 'astral', 'starwell', 'abyssal', 'chrono'] as const) {
      expect(getResearchNodesForTree(wid)).toHaveLength(12);
      expect(getResearchTreeMaxPoints(wid)).toBe(58);
      expect(existsSync(resolve(process.cwd(), 'public', 'worlds', `${wid}.webp`))).toBe(true);
    }

    // Tap damage must live strictly in Core; Worlds 1-8 replace tap nodes with standardized denseOreScale (HP x10, Drops x3)
    for (const wid of ['underground', 'crystal', 'magma', 'ruins', 'astral', 'starwell', 'abyssal', 'chrono'] as const) {
      const treeNodes = getResearchNodesForTree(wid);
      expect(treeNodes.some((n) => n.effectType === 'tapDamageFlat')).toBe(false);
      const denseNodes = treeNodes.filter((n) => n.effectType === 'denseOreScale');
      expect(denseNodes).toHaveLength(1);
      expect(denseNodes[0].maxLevel).toBe(1);
      expect(denseNodes[0].perLevel).toBe(1);
      expect(formatNodeEffectLine(denseNodes[0], 1)).toContain('Ore HP ×10');
      expect(formatNodeEffectLine(denseNodes[0], 1)).toContain('Ore Drops ×3');
    }
    expect(RESEARCH_NODES.some((n) => n.treeId === 'core' && n.effectType === 'tapDamageFlat')).toBe(true);
    expect(getResearchNodesForTree('core').filter((n) => n.effectType === 'tapDamageFlat')).toHaveLength(6);

    const gs = new GameState();
    expect(gs.activeWorldId).toBe('underground');
    expect(gs.setActiveWorld('crystal')).toBe(false);
    expect(gs.canUnlockWorld('crystal')).toBe('locked-prereq');

    // Global Core Strike I applies in World 1 and stays active in World 2
    const baseTap = gs.getTapDamage();
    gs.cash = 1_000_000_000;
    expect(gs.upgradeResearch('core-strike-1')).toBe(true);
    expect(gs.getTapDamage()).toBeGreaterThan(baseTap);
    const tapWithCore = gs.getTapDamage();

    // Start at 1 ore node; upgrade World 1 node (Deposits I: +1 ore node per lvl)
    expect(gs.getActiveOreNodeCount()).toBe(1);
    expect(gs.upgradeResearch('ug-deposits-1')).toBe(true);
    expect(gs.getActiveOreNodeCount()).toBe(2);

    // Partial World 1 tree still blocks Crystal Caves unlock
    expect(gs.isTreeComplete('underground')).toBe(false);
    expect(gs.canUnlockWorld('crystal')).toBe('locked-prereq');

    // Upgrade World 1 prerequisite path to Dense Seam and verify HP x10 + Ore Drops x3
    expect(gs.upgradeResearch('ug-dmg')).toBe(true);
    const hpScaleBeforeDense = gs.getOreHpScale();
    const dropMultBeforeDense = gs.getTotalOreDropMult();
    expect(gs.upgradeResearch('ug-rich-seam')).toBe(true);
    expect(gs.getOreHpScale()).toBeCloseTo(hpScaleBeforeDense * 10, 6);
    expect(gs.getTotalOreDropMult()).toBeCloseTo(dropMultBeforeDense * 3, 6);

    // Max every node in The Underground (58/58)
    for (const node of getResearchNodesForTree('underground')) {
      while (gs.getResearchLevel(node.id) < node.maxLevel) {
        expect(gs.upgradeResearch(node.id)).toBe(true);
      }
    }
    expect(gs.getTreeSpentPoints('underground')).toBe(58);
    expect(gs.isTreeComplete('underground')).toBe(true);
    expect(gs.canUnlockWorld('crystal')).toBe('ok');

    // Unlock Crystal Caves and verify World 1 research is isolated (resets pit to 1 node and clears W1 denseOreScale!)
    expect(gs.unlockWorld('crystal')).toBe(true);
    expect(gs.activeWorldId).toBe('crystal');
    expect(gs.getActiveOreNodeCount()).toBe(1); // World 1 Deposits (+8) did NOT carry over to Crystal Caves!
    expect(gs.getOreHpScale()).toBe(getWorldById('crystal').oreHpMult);
    expect(getWorldById('crystal').oreHpMult).toBeGreaterThanOrEqual(150);
    expect((getChibiById('volt-kensei')?.baseDps ?? 0)).toBeGreaterThanOrEqual(
      (getChibiById('frost-vanguard')?.baseDps ?? 0) * 3
    );
    expect(gs.getTapDamage()).toBe(tapWithCore); // Global Core Strike I STILL active in World 2!

    // Magma Hollows stays gated behind Crystal Caves (44/44)
    expect(gs.canUnlockWorld('magma')).toBe('locked-prereq');
    // Travel back to World 1 restores World 1's Deposits (+8 => 9 nodes)
    expect(gs.setActiveWorld('underground')).toBe(true);
    expect(gs.getActiveOreNodeCount()).toBe(9);
  });

  it('auto-populates hotbar 1-9 with Chibis and Ores on chest takeAll and clears sold ores', () => {
    const gs = new GameState();
    gs.chestMiners = { 'solar-striker': 1 };
    gs.chestOres = { coalite: 3, ochrite: 2 };

    const taken = gs.takeAllFromChest();
    expect(taken).toBe(6);
    expect(gs.hotbar.slice(0, 3)).toEqual(['solar-striker', 'coalite', 'ochrite']);

    // Selecting an ore slot must not place it on an empty plot pedestal
    gs.selectHotbarSlot(1);
    expect(gs.placeSelectedOnPlot(1)).toBe('need-select');
    expect(gs.plotMiners[1]).toBeNull();

    // Selling out an ore clears it from the hotbar
    expect(gs.sellOre('coalite', true)).toBeGreaterThan(0);
    expect(gs.hotbar).not.toContain('coalite');
    expect(gs.hotbar).toContain('ochrite');

    expect(gs.sellAllOres()).toBeGreaterThan(0);
    expect(gs.hotbar).not.toContain('ochrite');
  });

  it('scales Gem Tower floors, 10 waves per floor, 5-floor checkpoints/milestones, anomalies, and global gem bonus', () => {
    const f1 = getTowerFloorDef(1);
    const f4 = getTowerFloorDef(4);
    const f5 = getTowerFloorDef(5);

    expect(f1.isBoss).toBe(false);
    expect(f4.anomaly.id).not.toBe('none');
    expect(f5.isBoss).toBe(true);
    expect(f5.hp).toBeGreaterThan(f4.hp);
    expect(f5.diceDropChance).toBeGreaterThan(0);

    // Waves 1..9 have 5 random ore rocks; Wave 10 is the Floor Boss
    const w1 = getTowerWaveDef(1, 1);
    const w10 = getTowerWaveDef(1, TOWER_WAVES_PER_FLOOR);
    expect(w1.isBoss).toBe(false);
    expect(w10.isBoss).toBe(true);
    const w1Ores = rollTowerWaveOres(1, 1, f1.anomaly);
    expect(w1Ores).toHaveLength(TOWER_ORE_ROCKS_PER_WAVE);
    expect(w1Ores.every((o) => o.alive && o.hp > 0)).toBe(true);
    expect(rollTowerWaveOres(1, TOWER_WAVES_PER_FLOOR, f1.anomaly)).toHaveLength(0);

    // Checkpoints and Milestones every 5 floors up to Floor 80 (W1..W8)
    expect(getTowerCheckpoints(0)).toEqual([1]);
    expect(getTowerCheckpoints(5)).toEqual([1, 5]);
    expect(getTowerCheckpoints(12)).toEqual([1, 5, 10]);
    expect(getTowerCheckpoints(99)).toContain(80);
    expect(getTowerCheckpoints(99).at(-1)).toBe(80);
    expect(TOWER_MILESTONES.map((m) => m.floor)).toEqual([
      5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80,
    ]);

    // World-tiered difficulty scaling (Floors 1-10 W1 -> Floors 71-80 W8)
    expect(getTowerFloorDef(1).world.id).toBe('underground');
    expect(getTowerFloorDef(10).world.id).toBe('underground');
    expect(getTowerFloorDef(11).world.id).toBe('crystal');
    expect(getTowerFloorDef(80).world.id).toBe('chrono');
    expect(getTowerFloorDef(80).isFinalBoss).toBe(true);
    expect(getTowerFloorDef(80).hp).toBeGreaterThan(getTowerFloorDef(70).hp);

    expect(getGlobalGemGainBonus(0)).toBe(0);
    expect(getGlobalGemGainBonus(5)).toBeCloseTo(0.1);
    expect(getGlobalGemGainBonus(10)).toBeCloseTo(0.2);

    expect(getTowerSweepGemReward(0)).toBe(0);
    expect(getTowerSweepGemReward(10)).toBeGreaterThan(getTowerSweepGemReward(5));
  });

  it('runs full Gem Tower 10-wave loop: no passive HP drain, 5 rocks per wave, wave 10 boss, blessing, milestone 5, sweep & key buy', () => {
    const gs = new GameState();
    const startNow = 1_700_000_000_000;
    expect(gs.towerKeys).toBe(TOWER_MAX_KEYS);

    // Put a real miner onto Plot 1 so chibi strike damage is non-zero
    gs.miners['solar-striker'] = 1;
    gs.hotbar[0] = 'solar-striker';
    gs.selectHotbarSlot(0);
    expect(gs.placeSelectedOnPlot(0)).toBe('placed');

    // Start run from Floor 1 Wave 1 with 5 random ore rocks
    expect(gs.startTowerRun(1, startNow)).toBe(true);
    expect(gs.towerKeys).toBe(TOWER_MAX_KEYS - 1);
    expect(gs.towerRun?.floor).toBe(1);
    expect(gs.towerRun?.wave).toBe(1);
    expect(gs.towerRun?.isBossWave).toBe(false);
    expect(gs.towerRun?.waveOres).toHaveLength(5);

    // Stepping the timer MUST NOT drain HP before a chibi actually strikes
    const initialHp = gs.towerRun!.hp;
    const initialRockHps = gs.towerRun!.waveOres.map((o) => o.hp);
    const tickRes = gs.stepTowerTick(1.0);
    expect(tickRes.status).toBe('active');
    expect(gs.towerRun?.hp).toBe(initialHp);
    expect(gs.towerRun?.waveOres.map((o) => o.hp)).toEqual(initialRockHps);

    // Breaking 4 of 5 rocks keeps player on Wave 1 until the 5th rock breaks
    for (let idx = 0; idx < 4; idx++) {
      while (gs.towerRun!.waveOres[idx].alive) {
        gs.applyTowerChibiStrike(0, idx, 0.85, () => 0.99);
      }
    }
    expect(gs.towerRun?.wave).toBe(1);
    expect(gs.towerRun?.waveOres.filter((o) => o.alive)).toHaveLength(1);

    // Break the 5th rock -> advances to Wave 2 with 5 fresh ore rocks
    while (gs.towerRun?.wave === 1) {
      gs.applyTowerChibiStrike(0, 4, 0.85, () => 0.99);
    }
    expect(gs.towerRun?.floor).toBe(1);
    expect(gs.towerRun?.wave).toBe(2);
    expect(gs.towerRun?.waveOres).toHaveLength(5);
    expect(gs.gems).toBeGreaterThan(0);

    // Clear Waves 2..9 to reach Wave 10 Boss
    let guard = 0;
    while (gs.towerRun && !gs.towerRun.isBossWave && guard < 1500) {
      gs.tapTowerTarget(null, () => 0.99);
      guard++;
    }
    expect(gs.towerRun?.floor).toBe(1);
    expect(gs.towerRun?.wave).toBe(10);
    expect(gs.towerRun?.isBossWave).toBe(true);
    expect(gs.towerRun?.waveOres).toHaveLength(0);
    expect(gs.towerRun?.bossInvulLeft).toBe(5);

    // Boss is invulnerable for the first 5 seconds so it cannot be insta-hit
    const bossMaxHp = gs.towerRun!.maxHp;
    expect(gs.tapTowerTarget(null, () => 0.99).dmgDealt).toBe(0);
    expect(gs.towerRun?.hp).toBe(bossMaxHp);
    gs.stepTowerTick(5.0);
    expect(gs.towerRun?.bossInvulLeft).toBe(0);

    // Defeat Wave 10 Boss -> Floor 1 cleared & 3-card Spire Blessing pause
    guard = 0;
    while (gs.towerRun && !gs.towerRun.pendingBlessings && guard < 500) {
      gs.tapTowerTarget(null, () => 0.99);
      guard++;
    }
    expect(gs.towerBestFloor).toBeGreaterThanOrEqual(1);
    expect(gs.towerRun?.pendingBlessings).toHaveLength(3);
    const chosenId = gs.towerRun!.pendingBlessings![0].id;
    expect(gs.chooseTowerBlessing(chosenId)).toBe(true);
    expect(gs.towerRun?.pendingBlessings).toBeNull();
    expect(gs.towerRun?.floor).toBe(2);
    expect(gs.towerRun?.wave).toBe(1);
    expect(gs.towerRun?.blessings.some((b) => b.id === chosenId)).toBe(true);

    // Clear Floors 2..5 (10 waves each, verifying 5s boss invul + 5s random blessing auto-pick) -> unlocks Milestone 5 + Dice
    const diceBeforeBoss = gs.enchantDice;
    guard = 0;
    while (gs.towerRun && gs.towerBestFloor < 5 && guard < 6000) {
      if (gs.towerRun.pendingBlessings) {
        expect(gs.stepTowerTick(2.5).status).toBe('paused');
        const autoTick = gs.stepTowerTick(2.6, () => 0.65);
        expect(autoTick.status).toBe('blessing-auto-picked');
        expect(autoTick.autoPickedBlessing).toBeDefined();
        expect(gs.towerRun.pendingBlessings).toBeNull();
      } else if (gs.towerRun.isBossWave && (gs.towerRun.bossInvulLeft ?? 0) > 0) {
        gs.stepTowerTick(5.0);
      } else {
        gs.tapTowerTarget(null, () => 0.01); // triggers boss dice drop too
      }
      guard++;
    }
    expect(gs.towerBestFloor).toBeGreaterThanOrEqual(5);
    expect(gs.towerClaimedMilestones).toContain(5);
    expect(gs.enchantDice).toBeGreaterThan(diceBeforeBoss);

    // Exit run -> produces accurate summary
    const summary = gs.abandonTowerRun();
    expect(summary).not.toBeNull();
    expect(summary!.newRecord).toBe(true);
    expect(summary!.floorsCleared).toBeGreaterThanOrEqual(5);
    expect(summary!.wavesCleared).toBeGreaterThanOrEqual(50);
    expect(gs.towerRun).toBeNull();

    // Quick Sweep consumes 1 key & awards scaled Gems
    const gemsBeforeSweep = gs.gems;
    const expectedSweepBase = getTowerSweepGemReward(gs.towerBestFloor);
    expect(expectedSweepBase).toBeGreaterThanOrEqual(9);
    const sweep = gs.quickSweepTower();
    expect(sweep.ok).toBe(true);
    expect(sweep.gemsAwarded).toBeGreaterThan(0);
    expect(gs.gems).toBe(gemsBeforeSweep + sweep.gemsAwarded);

    // Buy +1 Key with 1000 Gems
    expect(TOWER_KEY_GEM_COST).toBe(1000);
    gs.gems = TOWER_KEY_GEM_COST - 1;
    expect(gs.buyTowerKeyWithGems()).toBe('no_gems');
    gs.gems = TOWER_KEY_GEM_COST;
    const keysBeforeBuy = gs.towerKeys;
    expect(gs.buyTowerKeyWithGems()).toBe('bought');
    expect(gs.towerKeys).toBe(keysBeforeBuy + 1);
    expect(gs.gems).toBe(0);
  });

  it('places Sell Shop off the main path, Enchant Altar in the central plaza medallion, and Gem Tower on the rear terrace', () => {
    const shop = new ShopWorld3D();
    shop.shopGroup.updateMatrixWorld(true);
    const byStation = new Map<string, THREE.Vector3>();
    for (const obj of shop.shopClickables) {
      const vals = [obj.name, ...Object.values(obj.userData ?? {}).map(String)];
      const tag = vals.find((v) =>
        ['sell', 'shop-sell', 'altar', 'shop-altar', 'tower', 'shop-tower'].includes(v)
      );
      if (!tag) continue;
      const key = tag.replace(/^shop-/, '');
      const box = new THREE.Box3().setFromObject(obj);
      const center = new THREE.Vector3();
      box.getCenter(center);
      byStation.set(key, center);
    }

    expect(byStation.has('sell')).toBe(true);
    expect(byStation.has('altar')).toBe(true);
    expect(byStation.has('tower')).toBe(true);

    const sellPos = byStation.get('sell')!;
    const altarPos = byStation.get('altar')!;
    const towerPos = byStation.get('tower')!;

    // Sell shop shifted far left off the foreground road
    expect(sellPos.x).toBeLessThan(-6);
    // Enchant Altar stands in the central circular medallion (x≈0, z≈-0.5)
    expect(Math.abs(altarPos.x)).toBeLessThan(1.0);
    expect(altarPos.z).toBeCloseTo(-0.5, 0);
    // Gem Tower rises on the rear terrace (x≈0, z≈-11.4) well behind the central altar
    expect(Math.abs(towerPos.x)).toBeLessThan(1.0);
    expect(towerPos.z).toBeLessThan(-9);

    // Floating shop station anchors project cleanly with vertical badge separation
    const cam = new THREE.PerspectiveCamera(48, 1280 / 720, 0.1, 200);
    cam.position.set(0, 12.2, 22.8);
    cam.lookAt(0, 1.0, -2.6);
    cam.updateMatrixWorld(true);
    const anchors = shop.getShopAnchors(cam, 1280, 720, new THREE.Vector3());
    const anchorIds = anchors.map((a) => a.id);
    expect(anchorIds).toContain('sell');
    expect(anchorIds).toContain('altar');
    expect(anchorIds).toContain('tower');
    const altarA = anchors.find((a) => a.id === 'altar')!;
    const towerA = anchors.find((a) => a.id === 'tower')!;
    expect(towerA.visible).toBe(true);
    expect(altarA.visible).toBe(true);
    expect(Math.abs(towerA.y - altarA.y)).toBeGreaterThan(20);
  });

  it('builds Void/Eclipse TowerArena3D with 5 wave ores, Boss Monolith, and only strikes after chibis reach targets', () => {
    const arena = new TowerArena3D();
    arena.group.visible = true;
    expect(arena.clickables.length).toBeGreaterThanOrEqual(6);
    expect(arena.clickables[0].userData?.kind).toBe('tower-core');

    arena.syncFighters([
      { slotIndex: 0, def: CHIBI_CATALOG[0], enchantId: 'blazing', dmg: 35, speed: 12, miningMult: 1.2 },
      { slotIndex: 2, def: CHIBI_CATALOG[1], enchantId: null, dmg: 20, speed: 10, miningMult: 1.0 },
    ]);
    expect(arena.getConfiguredFighterCount()).toBe(2);

    const wave1Ores = rollTowerWaveOres(1, 1);
    arena.syncWaveState({
      floor: 1,
      wave: 1,
      isBossWave: false,
      isCheckpointFloor: false,
      waveOres: wave1Ores,
      anomalyColorHex: '#38bdf8',
      equippedMinerCount: 2,
      paused: false,
    });
    expect(arena.getActiveClickables()).toHaveLength(5);

    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 9.2, 14.8);
    cam.lookAt(0, 2.2, -1.6);

    // First brief dash tick: chibis are still running from spawn pads, so zero strikes fire yet
    let oreStrikes: Array<number | null> = [];
    arena.update(0.05, 0.05, cam, (ev) => {
      oreStrikes.push(ev.targetOreIndex);
    });
    expect(oreStrikes).toHaveLength(0);

    // Advance until chibis reach their assigned ore rocks and attack
    for (let i = 1; i < 45; i++) {
      arena.update(0.05, (i + 1) * 0.05, cam, (ev) => {
        oreStrikes.push(ev.targetOreIndex);
      });
    }
    expect(oreStrikes.length).toBeGreaterThan(0);
    expect(oreStrikes.every((idx) => idx !== null && idx >= 0 && idx < 5)).toBe(true);

    // Switch to Wave 10 Boss Monolith
    arena.setFloorVisual(true, '#facc15', 2, 5, false);
    arena.triggerHitBounce(0.24, true);
    expect(arena.getActiveClickables()).toHaveLength(1);
    expect(arena.getActiveClickables()[0].userData?.kind).toBe('tower-core');

    let strikeCount = 0;
    for (let i = 0; i < 45; i++) {
      arena.update(0.05, (i + 1) * 0.05, cam, () => {
        strikeCount++;
      });
    }
    expect(strikeCount).toBeGreaterThan(0);

    // Paused (e.g. Blessing pick) stops new swings cleanly
    const beforePauseStrikes = strikeCount;
    arena.setFloorVisual(true, '#facc15', 2, 5, true);
    arena.update(0.5, 3.0, cam, () => {
      strikeCount++;
    });
    expect(strikeCount).toBe(beforePauseStrikes);
  });

  it('keeps FieldMiner3D mining and breaking ores in background mode when player is in Shop/Altar/Tower', () => {
    const pitNode = {
      id: 0,
      hp: 80,
      maxHp: 80,
      alive: true,
      worldX: 0,
      worldY: 0.1,
      worldZ: -1.0,
      variantKey: 'vein' as const,
    };
    let respawnTimer = 0;
    const fakePit = {
      getAliveNodesInfo: () => (pitNode.alive ? [pitNode] : []),
      hitNode: (_id: number, dmg: number) => {
        if (!pitNode.alive) return null;
        const pure = applyNodeDamagePure(pitNode, dmg);
        if (!pure) return null;
        if (pure.broken) respawnTimer = 1.0;
        return { ...pure, variantKey: pitNode.variantKey };
      },
    } as unknown as OrePit3D;

    const fm = new FieldMiner3D(CHIBI_CATALOG[0], 0);
    fm.setCombatStats(50, 14, 1.5);

    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    let broken = 0;
    let visualHits = 0;
    for (let i = 0; i < 60; i++) {
      if (!pitNode.alive) {
        respawnTimer -= 0.1;
        if (respawnTimer <= 0) {
          pitNode.hp = 80;
          pitNode.alive = true;
        }
      }
      fm.update(
        0.1,
        (i + 1) * 0.1,
        cam,
        fakePit,
        () => {
          broken++;
        },
        () => {
          visualHits++;
        },
        false
      );
    }

    expect(broken).toBeGreaterThanOrEqual(2);
    expect(visualHits).toBe(0);
  });

  it('swapHotbarSlots moves/swaps items across hotbar 1..9 and tracks selectedHotbarSlot', () => {
    const state = new GameState();
    state.hotbar = Array(9).fill(null);
    state.hotbar[0] = 'chibi_1';
    state.hotbar[2] = 'stone';
    state.selectedHotbarSlot = 0;

    // Move filled slot 0 -> empty slot 4
    expect(state.swapHotbarSlots(0, 4)).toBe(true);
    expect(state.hotbar[0]).toBeNull();
    expect(state.hotbar[4]).toBe('chibi_1');
    expect(state.selectedHotbarSlot).toBe(4);

    // Swap filled slot 4 <-> filled slot 2 (selection follows slot 2 -> 4 or 4 -> 2)
    expect(state.swapHotbarSlots(4, 2)).toBe(true);
    expect(state.hotbar[2]).toBe('chibi_1');
    expect(state.hotbar[4]).toBe('stone');
    expect(state.selectedHotbarSlot).toBe(2);

    // Selecting target slot follows too when source isn't selected
    expect(state.swapHotbarSlots(4, 2)).toBe(true);
    expect(state.hotbar[4]).toBe('chibi_1');
    expect(state.hotbar[2]).toBe('stone');
    expect(state.selectedHotbarSlot).toBe(4);

    // Rejects dragging an empty slot, self-drop, or out-of-bounds indices
    expect(state.swapHotbarSlots(0, 1)).toBe(false);
    expect(state.swapHotbarSlots(4, 4)).toBe(false);
    expect(state.swapHotbarSlots(-1, 2)).toBe(false);
    expect(state.swapHotbarSlots(4, 9)).toBe(false);
  });

  it('placeHotbarItemOnPlot equips/swaps miners onto plots while preserving replaced unit upgrades', () => {
    const state = new GameState();
    const firstChibi = CHIBI_CATALOG[0].id;
    const secondChibi = CHIBI_CATALOG[1].id;
    state.miners[firstChibi] = 1;
    state.miners[secondChibi] = 1;
    state.ores['stone'] = 3;
    state.hotbar = Array(9).fill(null);
    state.hotbar[0] = firstChibi;
    state.hotbar[1] = secondChibi;
    state.hotbar[2] = 'stone';
    state.plotMiners = Array(5).fill(null);
    state.plotUnits = Array(5).fill(null);

    // Equip onto empty plot #0
    expect(state.placeHotbarItemOnPlot(0, 0)).toBe('placed');
    expect(state.plotMiners[0]).toBe(firstChibi);
    expect(state.plotUnits[0]).not.toBeNull();
    state.plotUnits[0]!.damageLevel = 7;

    // Dropping the exact same single miner onto the same plot does not reset upgrades
    expect(state.placeHotbarItemOnPlot(0, 0)).toBe('same');
    expect(state.plotUnits[0]?.damageLevel).toBe(7);

    // Drag-replacing plot #0 with a different miner immediately swaps & stashes the upgraded first unit
    expect(state.placeHotbarItemOnPlot(1, 0)).toBe('replaced');
    expect(state.plotMiners[0]).toBe(secondChibi);
    expect(state.stashedUnits[firstChibi]?.[0]?.damageLevel).toBe(7);

    // Dragging an ore onto a plot returns 'not-miner' and leaves the plot intact
    expect(state.placeHotbarItemOnPlot(2, 0)).toBe('not-miner');
    expect(state.plotMiners[0]).toBe(secondChibi);
  });

  it('rolls 5 weathers every 3 minutes with 5% Celestial granting 10x Ore, 4x Gems, and 5x Damage', async () => {
    expect(WEATHER_DURATION_MS).toBe(180_000);
    expect(WEATHERS.map((w) => w.id)).toEqual(['light_rain', 'snow_rain', 'bloodmoon', 'void', 'celestial']);
    for (const w of WEATHERS) {
      expect(existsSync(resolve(process.cwd(), 'public', 'weathers', `${w.id}.webp`))).toBe(true);
      expect(weatherIconHtml(w.id, 38, w.name)).toContain(`weathers/${w.id}.webp`);
    }
    const totalChance = WEATHERS.reduce((sum, w) => sum + w.chancePct, 0);
    expect(totalChance).toBe(100);

    expect(rollWeatherDef(() => 0.0).id).toBe('light_rain');
    expect(rollWeatherDef(() => 0.35).id).toBe('snow_rain');
    expect(rollWeatherDef(() => 0.65).id).toBe('bloodmoon');
    expect(rollWeatherDef(() => 0.85).id).toBe('void');
    const cel = rollWeatherDef(() => 0.96);
    expect(cel.id).toBe('celestial');
    expect(cel.chancePct).toBe(5);
    expect(cel.oreDropMult).toBe(10);
    expect(cel.gemDropMult).toBe(4);
    expect(cel.damageMult).toBe(5);

    const state = new GameState();
    const t0 = 1_700_000_000_000;
    state.forceWeather('light_rain', t0);
    expect(state.getActiveWeather().id).toBe('light_rain');

    // Before 3 minutes elapse, syncWeather keeps active weather
    expect(state.syncWeather(t0 + 179_000, () => 0.97)).toBeNull();
    expect(state.weatherId).toBe('light_rain');

    // At 3 minutes, syncWeather rolls a new weather (rng=0.97 -> Celestial 5% bucket)
    const rolled = state.syncWeather(t0 + 180_000, () => 0.97);
    expect(rolled?.id).toBe('celestial');
    expect(state.weatherId).toBe('celestial');
    expect(state.weatherExpiresAt).toBe(t0 + 360_000);

    // Put a miner on Plot 0 so we verify both tap DMG and miner DMG scale 5x under Celestial vs 1x
    const firstChibi = CHIBI_CATALOG[0].id;
    state.miners[firstChibi] = 1;
    state.hotbar[0] = firstChibi;
    state.placeHotbarItemOnPlot(0, 0);

    const celestialTap = state.getTapDamage();
    const celestialMinerDmg = state.getPlotUnitStats(0)!.dmg;
    const celestialOreMult = state.getTotalOreDropMult();

    // Check actual ore & gem drops from breaking a Geode (3 base ores, 3 base gems)
    state.chestOres = {};
    const gemsBefore = state.gems;
    state.onOreBroken('geode', () => 0.05);
    const oresDropped = Object.values(state.chestOres).reduce((a, b) => a + b, 0);
    expect(oresDropped).toBe(30); // 3 base geode rolls * 10x Celestial ore drop
    expect(state.gems - gemsBefore).toBe(12); // 3 base geode gems * 4x Celestial gem drop

    // Compare against Bloodmoon (3x Ore, 2x Gem, 2.5x DMG)
    state.forceWeather('bloodmoon', t0);
    expect(celestialOreMult / state.getTotalOreDropMult()).toBeCloseTo(10 / 3, 4);
    expect(celestialTap).toBeGreaterThan(state.getTapDamage());
    expect(celestialMinerDmg).toBeGreaterThan(state.getPlotUnitStats(0)!.dmg);

    // 3D WeatherFx switches all 5 modes cleanly
    const { WeatherFx3D } = await import('../src/game3d/WeatherFx3D');
    const fx = new WeatherFx3D();
    for (const w of WEATHERS) {
      fx.setWeather(w.id);
      fx.update(0.016, 1.0, true);
    }
    fx.update(0.016, 1.0, false);
    expect(fx.group.visible).toBe(false);
  });

  it('scales chibi plot upgrade costs by character strength and world unlock price', () => {
    const state = new GameState();
    const inspectCosts = (chibiId: string) => {
      state.miners[chibiId] = 1;
      state.hotbar[0] = chibiId;
      state.plotUnits[0] = null;
      state.plotMiners[0] = null;
      state.placeHotbarItemOnPlot(0, 0);
      return state.getPlotUnitStats(0)!;
    };

    const starter = inspectCosts('astral-recruit');
    expect(starter.dmgCost).toBe(50);
    expect(starter.speedCost).toBe(75);
    expect(starter.miningCost).toBe(90);

    const solar = inspectCosts('solar-striker');
    const frost = inspectCosts('frost-vanguard');
    expect(solar.dmgCost).toBe(56);
    expect(frost.dmgCost).toBeGreaterThan(solar.dmgCost);
    expect(frost.dmgCost).toBeLessThan(starter.dmgCost * 2);
    expect(solar.speedCost).toBeGreaterThan(starter.speedCost);
    expect(frost.miningCost).toBeGreaterThan(solar.miningCost);

    const volt = inspectCosts('volt-kensei');
    const zephyr = inspectCosts('zephyr-esper');
    const vesper = inspectCosts('vesper-ward');
    const seraph = inspectCosts('seraph-paladin');
    const nebula = inspectCosts('nebula-archon');
    const chrono = inspectCosts('chrono-sovereign');

    expect(volt.dmgCost).toBe(2_000);
    expect(nebula.dmgCost).toBe(37_500_000);
    expect(zephyr.dmgCost).toBeGreaterThan(volt.dmgCost);
    expect(vesper.dmgCost).toBeGreaterThan(zephyr.dmgCost);
    expect(seraph.dmgCost).toBeGreaterThan(vesper.dmgCost);
    expect(chrono.dmgCost).toBeGreaterThan(seraph.dmgCost);
  });

  it('applies +35% Full-Chest Sell Bonus when selling chest ores at >=95% capacity', () => {
    const gs = new GameState();
    gs.cash = 0;
    gs.chestCapacity = 100;
    gs.chestOres = { runestone: 95 };
    const fullRes = gs.sellAllChestOres();
    expect(fullRes.bonusApplied).toBe(true);
    expect(fullRes.earned).toBe(Math.round(200_000 * 95 * 1.35));
    expect(gs.chestOres).toEqual({});

    gs.cash = 0;
    gs.chestOres = { runestone: 50 };
    const partialRes = gs.sellAllChestOres();
    expect(partialRes.bonusApplied).toBe(false);
    expect(partialRes.earned).toBe(200_000 * 50);
  });

  it('flags Frozen and higher mutations as protected high-tier rolls', () => {
    const expectedProtected = new Set(['frozen', 'inferno', 'nightmare', 'unreal']);
    for (const mut of MUTATIONS) {
      expect(isHighTierMutation(mut.id)).toBe(expectedProtected.has(mut.id));
    }

    const state = new GameState();
    const firstChibi = CHIBI_CATALOG[0].id;
    state.miners[firstChibi] = 1;
    state.hotbar[0] = firstChibi;
    state.placeHotbarItemOnPlot(0, 0);
    state.gems = 10_000;

    // Roll near top of cumulative probability (Frozen = last ~2.5% band -> 0.98 hits Frozen)
    const rolledName = state.rollPlotMutation(0, () => 0.98);
    expect(rolledName).toBe('Frozen');
    expect(isHighTierMutation(state.getPlotUnit(0)!.mutationId)).toBe(true);
  });

  it('adds 2 Exotic & Secret chibis to Worlds 1–5 and wires all 5 World 6 Starwell chibis', () => {
    expect(RARITY_BORDER.exotic).toBeTruthy();
    expect(RARITY_BORDER.secret).toBeTruthy();

    for (const w of WORLDS) {
      const miners = getMinersByWorld(w.id);
      expect(miners.length).toBe(5);
      expect(miners[3].entry.rarity).toBe('exotic');
      expect(miners[4].entry.rarity).toBe('secret');
      expect(miners[3].chibi.rarity).toBe('exotic');
      expect(miners[4].chibi.rarity).toBe('secret');
      expect(miners[3].entry.chancePct).toBeLessThan(miners[2].entry.chancePct);
      expect(miners[4].entry.chancePct).toBeLessThan(miners[3].entry.chancePct);
      expect(miners[3].chibi.baseDps).toBeGreaterThan(miners[2].chibi.baseDps);
      expect(miners[4].chibi.baseDps).toBeGreaterThan(miners[3].chibi.baseDps);
      expect(getMinerRarity(miners[3].chibi.id)).toBe('exotic');
      expect(getMinerRarity(miners[4].chibi.id)).toBe('secret');
    }

    const w6Ids = ['draconic-blademaster', 'aegis-wyrm', 'ashen-titan', 'vesper-reaver', 'null-prism'];
    expect(getMinersByWorld('starwell').map((m) => m.chibi.id)).toEqual(w6Ids);
    for (const id of w6Ids) {
      const def = getChibiById(id);
      expect(def).toBeDefined();
      expect(def?.poses.idle).toBe(`/chibi/${id}/idle.webp`);
      expect(def?.poses.pose).toBe(`/chibi/${id}/pose.webp`);
    }
  });

  it('buffs chibi drop trigger rate and scales Core Vault Expansion up to +300K capacity', () => {
    const gs = new GameState();
    // Buffed common rock drop trigger (1.4%): rng=0.01 must drop a miner
    gs.onOreBroken('common', () => 0.01);
    expect(Object.values(gs.chestMiners).reduce((a, b) => a + b, 0)).toBe(1);

    // Core Vault Expansion I (+20K) + Vault Expansion II (+280K) = +300K upgrade (+5K base = 305K)
    const coreNodes = getResearchNodesForTree('core');
    const v1 = coreNodes.find((n) => n.id === 'core-chest-1')!;
    const v2 = coreNodes.find((n) => n.id === 'core-chest-2')!;
    expect(v1.maxLevel * v1.perLevel + v2.maxLevel * v2.perLevel).toBe(300_000);

    gs.cash = 1e24;
    for (const nodeId of [
      'core-chest-1',
      'core-power-1',
      'core-value-1',
      'core-luck-1',
      'core-chest-2',
    ]) {
      const node = coreNodes.find((n) => n.id === nodeId)!;
      for (let i = 0; i < node.maxLevel; i++) {
        expect(gs.upgradeResearch(nodeId)).toBe(true);
      }
    }
    expect(gs.getMaxChestCapacity()).toBe(305_000);
  });

  it('tilts ChibiSprite3D toward elevated camera and animates idle, walk, and attack swings without squashing', () => {
    const sprite = new ChibiSprite3D(CHIBI_CATALOG[0], 1.95, 0);
    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 11.7, 15.6);

    const pivot = sprite.group.children[0] as THREE.Group;
    const animGroup = pivot.children[0] as THREE.Group;
    const spriteMesh = animGroup.children[0] as THREE.Mesh;
    const depthMat = spriteMesh.customDepthMaterial as THREE.MeshDepthMaterial;
    expect(depthMat).toBeInstanceOf(THREE.MeshDepthMaterial);
    expect(depthMat.alphaTest).toBe(0.15);
    expect(depthMat.side).toBe(THREE.DoubleSide);

    sprite.setAnimState('idle');
    sprite.update(0.016, 0.8, cam);
    expect(pivot.rotation.x).toBeLessThan(-0.2);
    expect(animGroup.scale.y).toBeGreaterThanOrEqual(1);

    sprite.setAnimState('dash');
    sprite.update(0.016, 0.2, cam);
    expect(animGroup.position.y).toBeGreaterThan(0);
    expect(Math.abs(animGroup.rotation.z)).toBeGreaterThan(0.01);

    sprite.setFacing(1);
    sprite.setAnimState('attack');
    sprite.triggerAttack(0.4);
    // Advance into wind-up (p=0.1 -> t=0.04) then strike snap (p=0.35 -> t=0.14)
    sprite.update(0.04, 1.0, cam);
    expect(animGroup.position.x).toBeLessThan(0);
    sprite.update(0.1, 1.1, cam);
    expect(animGroup.position.x).toBeGreaterThan(0.05);
    expect(animGroup.rotation.z).toBeLessThan(0);

    sprite.dispose();
  });

  it('cycles 3-beat attack combos with tinted ghost afterimages and wind-up glint while preserving child indices', () => {
    const sprite = new ChibiSprite3D(CHIBI_CATALOG[1], 1.95, 0);
    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 11.7, 15.6);

    const pivot = sprite.group.children[0] as THREE.Group;
    const animGroup = pivot.children[0] as THREE.Group;
    const primaryMesh = animGroup.children[0] as THREE.Mesh;
    expect(primaryMesh.customDepthMaterial).toBeInstanceOf(THREE.MeshDepthMaterial);
    expect(pivot.children.length).toBeGreaterThanOrEqual(3); // animGroup + 2 afterimages
    expect(animGroup.children.length).toBeGreaterThanOrEqual(2); // mesh + wind-up glint

    const ghost0 = pivot.children[1] as THREE.Mesh;
    const glintMesh = animGroup.children[1] as THREE.Mesh;

    sprite.setAccentColor('#f59e0b');
    sprite.setFacing(1);
    sprite.setAnimState('attack');

    for (const expectedStep of [0, 1, 2]) {
      sprite.triggerAttack(0.4);
      expect(sprite.getComboStep()).toBe(expectedStep);
      sprite.update(0.04, 1.0 + expectedStep, cam); // p = 0.10 (wind-up)
      expect(animGroup.position.x).toBeLessThan(0);
      expect(glintMesh.visible).toBe(true);

      sprite.update(0.1, 1.1 + expectedStep, cam); // p = 0.35 (strike lunge)
      expect(animGroup.position.x).toBeGreaterThan(0.05);
      expect(ghost0.visible).toBe(true);
      expect((ghost0.material as THREE.MeshBasicMaterial).color.getHexString()).toBe('f59e0b');
    }

    sprite.update(0.4, 5.0, cam); // settle finished
    expect(ghost0.visible).toBe(false);
    expect(glintMesh.visible).toBe(false);
    expect(() => sprite.dispose()).not.toThrow();
  });

  it('positions FieldMiner3D on the flanking edge of an ore node when attacking so the chibi body does not clip inside', () => {
    const oreNode = {
      id: 0,
      hp: 5000,
      maxHp: 5000,
      alive: true,
      worldX: 0,
      worldY: 0,
      worldZ: 0.65,
      variantKey: 'common' as const,
    };
    const fakePit = {
      getAliveNodesInfo: () => [oreNode],
      hitNode: () => ({ broken: false, dmgDealt: 10, variantKey: 'common' as const }),
    } as unknown as OrePit3D;
    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 11.7, 15.6);

    for (let slot = 0; slot < STAGE_PEDESTAL_COUNT; slot++) {
      const fm = new FieldMiner3D(CHIBI_CATALOG[0], slot);
      for (let i = 0; i < 40; i++) {
        fm.update(0.1, (i + 1) * 0.1, cam, fakePit, undefined, undefined, true);
      }
      expect(Math.abs(fm.sprite.group.position.x - oreNode.worldX)).toBeGreaterThanOrEqual(1.1);
      expect(fm.sprite.group.position.z).toBeGreaterThan(oreNode.worldZ);
      fm.dispose();
    }
  });

  it('returns chibi def.accentColor when unenchanted, cycles rainbow accent, and forwards combo/attackFx from FieldMiner3D', () => {
    const chibi = CHIBI_CATALOG[1]; // solar-striker (#f59e0b)
    const host = new THREE.Group();
    const fx = new ChibiFieldFxController(host, chibi.accentColor, 0);
    expect(fx.getAccentColor()).toBe(chibi.accentColor);

    fx.setEnchant('blazing');
    expect(fx.getAccentColor()).toBe('#f97316');

    fx.setEnchant(null);
    expect(fx.getAccentColor()).toBe(chibi.accentColor);

    fx.setEnchant('spellbound'); // rainbow
    fx.update(0.1);
    const c1 = fx.getAccentColor();
    fx.update(1.2);
    const c2 = fx.getAccentColor();
    expect(c1).not.toBe(c2);
    fx.dispose();

    const receivedFx: Array<{ accentColor?: string; attackerX?: number; comboStep?: number } | undefined> = [];
    const oreNode = {
      id: 0,
      hp: 9999,
      maxHp: 9999,
      alive: true,
      worldX: 0,
      worldY: 0,
      worldZ: 0.65,
      variantKey: 'common' as const,
    };
    const fakePit = {
      getAliveNodesInfo: () => [oreNode],
      hitNode: (
        _id: number,
        _dmg: number,
        _heavy: boolean,
        _shards?: number,
        attackFx?: { accentColor?: string; attackerX?: number; comboStep?: number }
      ) => {
        receivedFx.push(attackFx);
        return { broken: false, dmgDealt: 10, variantKey: 'common' as const, isMeteor: true };
      },
    } as unknown as OrePit3D;

    const fm = new FieldMiner3D(chibi, 0);
    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 11.7, 15.6);
    const hitFlags: Array<boolean | undefined> = [];
    for (let i = 0; i < 30; i++) {
      fm.update(
        0.1,
        (i + 1) * 0.1,
        cam,
        fakePit,
        undefined,
        (_dmg, _wx, _wy, _wz, isMeteor) => hitFlags.push(isMeteor),
        true
      );
    }
    expect(receivedFx.length).toBeGreaterThanOrEqual(2);
    expect(hitFlags.length).toBeGreaterThanOrEqual(2);
    expect(hitFlags[0]).toBe(true);
    expect(receivedFx[0]?.accentColor).toBe(chibi.accentColor);
    expect(typeof receivedFx[0]?.attackerX).toBe('number');
    expect(receivedFx.slice(0, 3).map((x) => x?.comboStep)).toEqual(
      [0, 1, 2].slice(0, Math.min(3, receivedFx.length))
    );
    fm.dispose();
  });

  it('updates FieldMiner3D rainbow accent color on the same frame before striking', () => {
    const chibi = CHIBI_CATALOG[0];
    const oreNode = {
      id: 0,
      hp: 9999,
      maxHp: 9999,
      alive: true,
      worldX: 0,
      worldY: 0,
      worldZ: 0.65,
      variantKey: 'common' as const,
    };
    const struckColors: Array<string | undefined> = [];
    const fakePit = {
      getAliveNodesInfo: () => [oreNode],
      hitNode: (
        _id: number,
        _dmg: number,
        _heavy: boolean,
        _shards?: number,
        attackFx?: { accentColor?: string }
      ) => {
        struckColors.push(attackFx?.accentColor);
        return { broken: false, dmgDealt: 10, variantKey: 'common' as const };
      },
    } as unknown as OrePit3D;

    const fm = new FieldMiner3D(chibi, 0);
    fm.setEnchant('spellbound');
    const refFx = new ChibiFieldFxController(new THREE.Group(), chibi.accentColor, 0);
    refFx.setEnchant('spellbound');

    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 11.7, 15.6);

    // Walk into range and fire first strike at elapsed=0.1..1.5
    let t = 0;
    for (let i = 0; i < 15; i++) {
      t += 0.1;
      fm.update(0.1, t, cam, fakePit, undefined, undefined, true);
    }
    const strikesBeforeJump = struckColors.length;
    expect(strikesBeforeJump).toBeGreaterThanOrEqual(1);

    // Jump elapsed on the exact tick a strike triggers (dt=0.9 > attackInterval 0.85)
    const jumpElapsed = 4.25;
    refFx.update(jumpElapsed);
    const expectedSameFrameColor = refFx.getAccentColor();
    fm.update(0.9, jumpElapsed, cam, fakePit, undefined, undefined, true);
    expect(struckColors.length).toBeGreaterThan(strikesBeforeJump);
    expect(struckColors[strikesBeforeJump]).toBe(expectedSameFrameColor);

    refFx.dispose();
    fm.dispose();
  });

  it('scales all 12 Shop Pickaxes monotonically in cost, DMG multiplier, and stock without exploits', () => {
    expect(PICKAXES.length).toBe(12);
    expect(PICKAXES.map((p) => p.id).slice(-5)).toEqual([
      'cinderforge',
      'runebreaker',
      'voidcleaver',
      'astralsiphon',
      'starwellcrown',
    ]);

    let prevCostPerDmg = 0;
    for (let i = 0; i < PICKAXES.length; i++) {
      const p = PICKAXES[i];
      expect(DEFAULT_PICKAXE_STOCK[p.id]).toBeGreaterThanOrEqual(1);
      expect(existsSync(resolve(process.cwd(), 'public', 'pickaxes', `${p.id}.webp`))).toBe(true);
      expect(pickaxeIconHtml(p.id, 64, p.name)).toContain(`pickaxes/${p.id}.webp`);
      if (i > 0) {
        const prev = PICKAXES[i - 1];
        expect(p.cost).toBeGreaterThan(prev.cost);
        expect(p.dmgMult).toBeGreaterThan(prev.dmgMult);
        const stepRatio = p.dmgMult / prev.dmgMult;
        expect(stepRatio).toBeGreaterThanOrEqual(1.8);
        expect(stepRatio).toBeLessThanOrEqual(2.5);
        const costPerDmg = p.cost / p.dmgMult;
        expect(costPerDmg).toBeGreaterThan(prevCostPerDmg);
        prevCostPerDmg = costPerDmg;
        expect(getPickaxeSellValue(p.id)).toBeLessThan(p.cost);
      }
    }

    const gs = new GameState();
    gs.cash = 1e18;
    expect(gs.buyPickaxe('starwellcrown')).toBe('bought');
    expect(gs.ownedPickaxes.starwellcrown).toBe(1);
    expect(gs.buyPickaxe('starwellcrown')).toBe('sold_out');
  });

  it('serves 2D fantasy PNG art for all 16 HUD & Modal icons', () => {
    const hudKeys = [
      'shops',
      'shopBasket',
      'hourglass',
      'indexBook',
      'gem',
      'backpack',
      'chest',
      'sparkle',
      'daily',
      'quest',
      'trade',
      'stats',
      'mutation',
      'enchant',
      'lock',
    ] as const;

    for (const k of hudKeys) {
      expect(existsSync(resolve(process.cwd(), 'public', 'hud', `${k}.webp`))).toBe(true);
      expect(hudIconHtml(k, 28, k)).toContain(`hud/${k}.webp`);
    }
    expect(existsSync(resolve(process.cwd(), 'public', 'hud', 'tower.webp'))).toBe(true);
    expect(towerIconHtml(24)).toContain('hud/tower.webp');
  });

  it('serves 2D fantasy PNG art for all 10 Enchant Auras and Enchanted Dice', () => {
    for (const enc of ENCHANTS) {
      expect(existsSync(resolve(process.cwd(), 'public', 'enchants', `${enc.id}.webp`))).toBe(true);
      expect(enchantAuraIconHtml(enc.id, enc.color, 46, enc.name)).toContain(`enchants/${enc.id}.webp`);
    }
    expect(existsSync(resolve(process.cwd(), 'public', 'enchants', 'enchant_dice.webp'))).toBe(true);
    expect(enchantDiceIconHtml(34)).toContain('enchants/enchant_dice.webp');
  });

  it('serves 2D fantasy PNG art for all 58 World 1–8 ores', () => {
    expect(ORES.length).toBe(58);
    for (const ore of ORES) {
      expect(existsSync(resolve(process.cwd(), 'public', 'ores', `${ore.id}.webp`))).toBe(true);
      expect(oreIconSvg(ore.color, ore.secondaryColor, ore.rarity, `ix_${ore.id}`)).toContain(`ores/${ore.id}.webp`);
    }
  });

  it('builds 2.5D EnchantBillboard2D sprites with camera billboarding and updates Altar pedestals safely', () => {
    const bb = new EnchantBillboard2D('blazing', '#f97316', 1.38, 0.5);
    expect(bb.root.children.length).toBeGreaterThanOrEqual(3);

    const cam = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 200);
    cam.position.set(2, 6, 10);
    cam.updateMatrixWorld(true);
    bb.root.position.set(-1, 0.5, -2);
    bb.root.updateMatrixWorld(true);
    bb.updateTransform(0.05, 1.0, false, false, cam);
    expect(bb.spritePivot.rotation.y).not.toBe(0);
    expect(bb.spritePivot.rotation.x).toBeLessThan(0);

    const shop = new ShopWorld3D();
    shop.update(0.05, 1.0, 'altar', cam);
    const anchors = shop.getAltarAnchors(cam, 1280, 720, new THREE.Vector3());
    expect(anchors).toHaveLength(ENCHANTS.length);

    shop.update(0.05, 1.0, 'shop', cam);
    const shopAnchors = shop.getShopAnchors(cam, 1280, 720, new THREE.Vector3());
    expect(shopAnchors).toHaveLength(6);
    expect(existsSync(resolve(process.cwd(), 'public', 'pickaxes', 'sunwheel.webp'))).toBe(true);
  });

  it('supports Chibi Star-Up (★0–★5) while protecting placed plot units and boosting DPS/mining speed', () => {
    const state = new GameState();
    state.miners['astral-recruit'] = 4;
    state.hotbar[0] = 'astral-recruit';
    state.selectedHotbarSlot = 0;
    state.placeSelectedOnPlot(0);

    // 1 placed on plot -> 3 spare duplicates available (keeps at least 1)
    expect(state.getSpareChibiDuplicates('astral-recruit')).toBe(3);
    const baseStats = state.getPlotUnitStats(0)!;
    expect(baseStats).toBeTruthy();

    // ★1 costs 2 duplicates -> leaves 2 owned (1 placed + 1 spare)
    const r1 = state.starUpChibi('astral-recruit');
    expect(r1).toEqual({ ok: true, newStar: 1 });
    expect(state.getChibiStar('astral-recruit')).toBe(1);
    expect(state.miners['astral-recruit']).toBe(2);
    expect(state.getSpareChibiDuplicates('astral-recruit')).toBe(1);

    const star1Stats = state.getPlotUnitStats(0)!;
    expect(star1Stats.dmg).toBeGreaterThan(baseStats.dmg);

    // Cannot ★2 (needs 4 spares, only 1 spare left)
    expect(state.starUpChibi('astral-recruit')).toEqual({ ok: false, reason: 'insufficient' });

    // Give plenty of spares and auto-star-up to ★5
    state.miners['astral-recruit'] = 100;
    const upgraded = state.autoStarUpAll();
    expect(upgraded).toBe(4); // ★2, ★3, ★4, ★5
    expect(state.getChibiStar('astral-recruit')).toBe(5);
    const star5Stats = state.getPlotUnitStats(0)!;
    expect(star5Stats.miningMult).toBeGreaterThan(baseStats.miningMult);
    expect(state.getActiveStarDropAndGemBonus().oreDropBonusPct).toBeCloseTo(0.1, 5);
  });

  it('activates World Resonance synergy buffs for 2, 3, and 5 same-world Chibis on plots', () => {
    const state = new GameState();
    const ugIds = ['astral-recruit', 'solar-striker', 'frost-vanguard', 'tropic-blaze', 'cyber-ki-brawler'];
    for (const id of ugIds) {
      state.miners[id] = 1;
    }

    state.hotbar[0] = ugIds[0];
    state.selectedHotbarSlot = 0;
    state.placeSelectedOnPlot(0);
    expect(state.getActiveWorldResonances()).toHaveLength(0);

    // 2 Underground chibis -> Duo Resonance (+15% DMG, +5% Ore Drop, +8% Ore Sell)
    state.hotbar[0] = ugIds[1];
    state.placeSelectedOnPlot(1);
    let res = state.getActiveWorldResonances();
    expect(res).toHaveLength(1);
    expect(res[0].worldId).toBe('underground');
    expect(res[0].tier.dmgBonusPct).toBeCloseTo(0.15, 5);
    expect(res[0].tier.oreDropBonusPct).toBeCloseTo(0.05, 5);
    expect(res[0].tier.sellBonusPct).toBeCloseTo(0.08, 5);
    expect(state.getOreValueMult()).toBeCloseTo(1.08, 5);

    // 3 Underground chibis -> Trio Resonance (+30% DMG, +10% Ore Drop, +18% Ore Sell)
    state.hotbar[0] = ugIds[2];
    state.placeSelectedOnPlot(2);
    res = state.getActiveWorldResonances();
    expect(res[0].tier.dmgBonusPct).toBeCloseTo(0.3, 5);
    expect(res[0].tier.oreDropBonusPct).toBeCloseTo(0.1, 5);
    expect(res[0].tier.sellBonusPct).toBeCloseTo(0.18, 5);
    expect(state.getOreOutputMult()).toBeCloseTo(1.1, 5);
    expect(state.getOreValueMult()).toBeCloseTo(1.18, 5);

    // 5 Underground chibis -> Full World Roster (+60% DMG, +25% Ore Drop, +40% Ore Sell, +15% Gem Gain)
    state.hotbar[0] = ugIds[3];
    state.placeSelectedOnPlot(3);
    state.hotbar[0] = ugIds[4];
    state.placeSelectedOnPlot(4);
    res = state.getActiveWorldResonances();
    expect(res[0].count).toBe(5);
    expect(res[0].tier.dmgBonusPct).toBeCloseTo(0.6, 5);
    expect(res[0].tier.oreDropBonusPct).toBeCloseTo(0.25, 5);
    expect(res[0].tier.sellBonusPct).toBeCloseTo(0.4, 5);
    expect(res[0].tier.gemBonusPct).toBeCloseTo(0.15, 5);
    expect(state.getActiveStarDropAndGemBonus().gemBonusPct).toBeCloseTo(0.15, 5);
    expect(state.getOreValueMult()).toBeCloseTo(1.4, 5);
  });

  it('scales World Synergy buffs higher on advanced Worlds (e.g. Starwell 2.0x vs Underground 1.0x)', () => {
    const state = new GameState();
    const starIds = ['draconic-blademaster', 'aegis-wyrm', 'ashen-titan', 'vesper-reaver', 'null-prism'];
    starIds.forEach((id, idx) => {
      state.miners[id] = 1;
      state.hotbar[0] = id;
      state.selectedHotbarSlot = 0;
      state.placeSelectedOnPlot(idx);
    });
    const res = state.getActiveWorldResonances();
    expect(res).toHaveLength(1);
    expect(res[0].worldId).toBe('starwell');
    expect(res[0].worldScale).toBeCloseTo(2.0, 5);
    expect(res[0].tier.dmgBonusPct).toBeCloseTo(1.2, 5);
    expect(res[0].tier.oreDropBonusPct).toBeCloseTo(0.5, 5);
    expect(res[0].tier.sellBonusPct).toBeCloseTo(0.8, 5);
    expect(res[0].tier.gemBonusPct).toBeCloseTo(0.3, 5);
    expect(state.getOreOutputMult()).toBeCloseTo(1.5, 5);
    expect(state.getOreValueMult()).toBeCloseTo(1.8, 5);
  });

  it('prevents deploying 1 owned Chibi or 1 owned Enchant onto multiple plots', () => {
    const state = new GameState();
    state.removeMinerFromPlot(0);
    const chibiId = CHIBI_CATALOG[0].id;
    const secondChibiId = CHIBI_CATALOG[1].id;

    state.miners[chibiId] = 1;
    state.miners[secondChibiId] = 1;
    state.hotbar[0] = chibiId;
    state.hotbar[1] = secondChibiId;

    // 1 owned Chibi -> can place on Plot 0, blocked on Plot 1
    expect(state.placeHotbarItemOnPlot(0, 0)).toBe('placed');
    expect(state.placeHotbarItemOnPlot(0, 1)).toBe('limit');
    expect(state.plotMiners[1]).toBeNull();

    // Increasing owned count to 2 allows placing on Plot 1
    state.miners[chibiId] = 2;
    expect(state.placeHotbarItemOnPlot(0, 1)).toBe('placed');
    expect(state.plotMiners[1]).toBe(chibiId);

    // Swap Plot 1 to secondChibiId and test 1 owned Enchant exclusivity
    expect(state.placeHotbarItemOnPlot(1, 1)).toBe('replaced');
    state.ownedEnchants['blazing'] = 1;
    expect(state.getAvailableEnchantCount('blazing')).toBe(1);
    expect(state.togglePlotEnchant(0, 'blazing')).toBe(true);
    expect(state.getAvailableEnchantCount('blazing')).toBe(0);
    expect(state.togglePlotEnchant(1, 'blazing')).toBe(false);
    expect(state.getPlotUnit(1)?.enchantId).toBeNull();

    // Unequipping from Plot 0 makes it available for Plot 1
    expect(state.togglePlotEnchant(0, 'blazing')).toBe(true);
    expect(state.getAvailableEnchantCount('blazing')).toBe(1);
    expect(state.togglePlotEnchant(1, 'blazing')).toBe(true);
    expect(state.getPlotUnit(1)?.enchantId).toBe('blazing');
  });

  it('spawns 375x HP Weather Meteor in OrePit3D (25% nerf) and awards Weather Limited Ores on break', () => {
    const noop = () => {};
    const fakeCtx = new Proxy(
      { createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }) },
      { get: (t, p) => (p in t ? (t as any)[p] : noop) }
    );
    const prevDoc = (globalThis as any).document;
    (globalThis as any).document = {
      createElement: () => ({ width: 256, height: 256, getContext: () => fakeCtx }),
    };
    try {
      const pit = new OrePit3D(DEFAULT_WORLD_PALETTE);
      let meteorLandedCount = 0;
      pit.onMeteorLanded = () => {
        meteorLandedCount += 1;
      };
      expect(pit.hasAliveMeteor()).toBe(false);

      pit.spawnWeatherMeteor('celestial', 2);
      expect(pit.hasAliveMeteor()).toBe(true);

      const meteorInfo = pit.getAliveNodesInfo().find((n) => n.isMeteor);
      expect(meteorInfo).toBeDefined();
      expect(meteorInfo?.worldX).toBeLessThan(0);
      expect(meteorInfo?.worldY).toBeGreaterThan(5);
      expect(meteorInfo?.maxHp).toBe(180 * 2 * METEOR_HP_MULT);
      expect(meteorInfo?.meteorWeatherId).toBe('celestial');

      for (let i = 0; i < 16; i++) {
        pit.update(0.05, (i + 1) * 0.05);
      }
      const landedInfo = pit.getAliveNodesInfo().find((n) => n.isMeteor);
      expect(landedInfo?.worldX).toBeCloseTo(0, 3);
      expect(meteorLandedCount).toBe(1);
      expect(pit.getImpactFxCounts().shockwaves).toBeGreaterThan(0);

      const firstHit = pit.hitNode(meteorInfo!.id, meteorInfo!.maxHp, true);
      expect(firstHit?.broken).toBe(false);
      expect(firstHit?.isMeteor).toBe(true);
      expect(firstHit?.dmgDealt).toBe(Math.ceil(meteorInfo!.maxHp * 0.03));
      expect(pit.hasAliveMeteor()).toBe(true);

      let hitRes = firstHit;
      let guard = 0;
      while (pit.hasAliveMeteor() && guard < 100) {
        hitRes = pit.hitNode(meteorInfo!.id, meteorInfo!.maxHp, true);
        guard++;
      }
      expect(hitRes?.broken).toBe(true);
      expect(hitRes?.meteorWeatherId).toBe('celestial');
      expect(pit.hasAliveMeteor()).toBe(false);
    } finally {
      (globalThis as any).document = prevDoc;
    }

    const gs = new GameState();
    const gemsBefore = gs.gems;
    expect(gs.getOverclockSnapshot().chargePct).toBe(0);
    const reward = gs.onMeteorBroken('celestial', () => 0.1);
    expect(gs.getOverclockSnapshot().chargePct).toBe(40);
    expect(reward.weatherOre.id).toBe('astral-nova-fragment');
    expect(reward.chibiId).toBe('eclipse-seraph');
    expect(gs.discovered.has('eclipse-seraph')).toBe(true);
    expect(reward.weatherOreQty).toBeGreaterThanOrEqual(3);
    expect(gs.discovered.has('astral-nova-fragment')).toBe(true);
    expect(gs.chestOres['astral-nova-fragment']).toBe(reward.weatherOreQty);
    expect(gs.gems).toBeGreaterThan(gemsBefore);
    expect(gs.enchantDice).toBeGreaterThanOrEqual(2);

    const voidReward = gs.onMeteorBroken('void', () => 0.05);
    expect(gs.getOverclockSnapshot().chargePct).toBe(80);
    expect(voidReward.chibiId).toBe('singularity');
    expect(gs.discovered.has('singularity')).toBe(true);

    // Weather Limited Chibi upgrade cost scales monotonically by tier instead of falling back to 1
    expect(getChibiUpgradeCostMult('stormwraith')).toBeGreaterThan(1000);
    expect(getChibiUpgradeCostMult('frostblood')).toBeGreaterThan(getChibiUpgradeCostMult('stormwraith'));
    expect(getChibiUpgradeCostMult('glitch-monarch')).toBeGreaterThan(getChibiUpgradeCostMult('frostblood'));
    expect(getChibiUpgradeCostMult('singularity')).toBeGreaterThan(getChibiUpgradeCostMult('glitch-monarch'));
    expect(getChibiUpgradeCostMult('eclipse-seraph')).toBeGreaterThan(getChibiUpgradeCostMult('singularity'));
  });

  it('supports Core middle utility branch, Auto-Sell rarity filter, Ore Lock, and DPS breakdown', () => {
    const gs = new GameState();
    gs.cash = 1e24;

    // Core middle branch requires Strike I -> Prospector's Eye -> Chibi Magnetism -> Deep Extraction
    expect(gs.upgradeResearch('core-find-1')).toBe(false);
    expect(gs.upgradeResearch('core-strike-1')).toBe(true);
    expect(gs.upgradeResearch('core-find-1')).toBe(true);
    expect(gs.upgradeResearch('core-charluck-1')).toBe(true);
    expect(gs.upgradeResearch('core-output-1')).toBe(true);

    // Auto-Sell rarity filter sells matching unlocked ores directly into cash
    gs.cash = 0;
    gs.chestOres = { coalite: 4, ochrite: 2 };
    const filterRes = gs.toggleAutoSellRarity('common');
    expect(filterRes.active).toBe(true);
    expect(filterRes.earned).toBe(4 * gs.getEffectiveOreSellValue('coalite'));
    expect(gs.chestOres['coalite']).toBeUndefined();
    expect(gs.chestOres['ochrite']).toBe(2);

    // Locked ores are protected from both Auto-Sell and Sell Ores
    expect(gs.toggleOreLock('ochrite')).toBe(true);
    const sellRes = gs.sellAllChestOres();
    expect(sellRes.earned).toBe(0);
    expect(gs.chestOres['ochrite']).toBe(2);

    // onOreBroken auto-sells common ore directly when common auto-sell is active
    const cashBeforeBreak = gs.cash;
    gs.onOreBroken('common', () => 0.01); // rolls coalite (common)
    expect(gs.chestOres['coalite']).toBeUndefined();
    expect(gs.cash).toBeGreaterThan(cashBeforeBreak);

    // DPS breakdown sorts placed chibis descending and sums percentages to ~100%
    const c0 = CHIBI_CATALOG[0].id;
    const c1 = CHIBI_CATALOG[1].id;
    gs.miners[c0] = 1;
    gs.miners[c1] = 1;
    gs.equipBestMiners();
    const bd = gs.getDpsBreakdown();
    expect(bd.units.length).toBe(2);
    expect(bd.units[0].dps).toBeGreaterThanOrEqual(bd.units[1].dps);
    expect(bd.totalPlotDps).toBe(bd.units[0].dps + bd.units[1].dps);
    expect(Math.round(bd.units[0].pct + bd.units[1].pct)).toBe(100);
    expect(bd.tapDamage).toBe(gs.getTapDamage());

    // Hotbar auto-compacts 1..9 when an item is removed/unequipped or sold
    gs.ores = { coalite: 5, ochrite: 3, copperine: 2 };
    gs.hotbar = ['coalite', 'ochrite', 'copperine', null, null, null, null, null, null];
    gs.selectedHotbarSlot = 2; // copperine
    gs.toggleEquipOre('coalite'); // unequips slot 0 -> shifts ochrite->0, copperine->1
    expect(gs.hotbar.slice(0, 3)).toEqual(['ochrite', 'copperine', null]);
    expect(gs.selectedHotbarSlot).toBe(1);
    gs.sellOre('ochrite', true); // removes slot 0 -> shifts copperine->0
    expect(gs.hotbar.slice(0, 2)).toEqual(['copperine', null]);
    expect(gs.selectedHotbarSlot).toBe(0);

    // Equip Best fills hotbar neatly starting from slot 1 (index 0) in rank order, followed by existing ores
    gs.equipBestMiners();
    expect(gs.hotbar[0]).toBe(gs.plotMiners[0]);
    expect(gs.hotbar[1]).toBe(gs.plotMiners[1]);
    expect(gs.hotbar[2]).toBe('copperine');
    expect(gs.hotbar[3]).toBeNull();
  });

  it('supports Relic Forge recipes, bag+chest consumption, 3-slot equip cap, and stat bonuses', () => {
    expect(RELICS.length).toBe(12);
    for (const relic of RELICS) {
      expect(existsSync(resolve(process.cwd(), 'public', relic.iconPath.replace(/^\//, '')))).toBe(true);
      for (const ing of relic.ingredients) {
        expect(getOreById(ing.oreId)).toBeDefined();
        expect(ing.amount).toBeGreaterThan(0);
      }
    }

    const gs = new GameState();
    const baseTap = gs.getTapDamage();
    const baseCap = gs.getMaxChestCapacity();
    const baseValue = gs.getOreValueMult();

    // Provide materials split across bag (ores) and chest (chestOres)
    gs.gems = 200000;
    gs.ores = { coalite: 100, copperine: 20, glowquartz: 100, prismite: 30 };
    gs.chestOres = { coalite: 140, copperine: 25, ironshard: 8, runestone: 80, relicore: 20, scorchgold: 10, emberstone: 90, magmite: 25, frostquartz: 15 };

    expect(gs.canCraftRelic('miner_lantern')).toBe(true);
    expect(gs.craftRelic('miner_lantern')).toBe(true);
    expect(gs.hasCraftedRelic('miner_lantern')).toBe(true);
    expect(gs.isRelicEquipped('miner_lantern')).toBe(true);
    expect(gs.getTapDamage()).toBeGreaterThan(baseTap);

    // Craft 2nd & 3rd relics (auto-equipped into slots 2 & 3)
    expect(gs.craftRelic('prism_heart')).toBe(true);
    expect(gs.craftRelic('chrono_compass')).toBe(true);
    expect(gs.equippedRelics.length).toBe(MAX_EQUIPPED_RELICS);
    expect(gs.getMaxChestCapacity()).toBe(baseCap + 3000);
    expect(gs.getOreValueMult()).toBeGreaterThan(baseValue);

    // 4th relic crafts but cannot equip until a slot is freed
    expect(gs.craftRelic('ember_gauntlet')).toBe(true);
    expect(gs.isRelicEquipped('ember_gauntlet')).toBe(false);
    expect(gs.toggleEquipRelic('ember_gauntlet')).toBe('full');
    expect(gs.toggleEquipRelic('prism_heart')).toBe('unequipped');
    expect(gs.toggleEquipRelic('ember_gauntlet')).toBe('equipped');
  });

  it('guards CrazyGames SDK v3 hooks safely on localhost and preserves user mute across ad mute', async () => {
    await expect(cgInit()).resolves.toBeUndefined();
    expect(() => {
      cgLoadingStart();
      cgLoadingStop();
      cgGameplayStart();
      cgHappyTime();
      cgGameplayStop();
    }).not.toThrow();

    let pauseState = false;
    cgBindAdLifecycle({
      setPaused: (paused) => {
        pauseState = paused;
      },
    });

    let unavailableCalled = false;
    let midgameDoneCalled = false;
    expect(
      cgRequestRewardedAd(
        () => {},
        () => {
          unavailableCalled = true;
        }
      )
    ).toBe(false);
    expect(unavailableCalled).toBe(true);
    cgTryMidgameAd(() => {
      midgameDoneCalled = true;
    });
    expect(midgameDoneCalled).toBe(true);
    expect(isAdPlaying()).toBe(false);
    expect(pauseState).toBe(false);

    const mgr = new AudioManager();
    expect(mgr.isMuted()).toBe(false);
    expect(mgr.isEffectivelyMuted()).toBe(false);
    mgr.setAdMuted(true);
    expect(mgr.isEffectivelyMuted()).toBe(true);
    mgr.setAdMuted(false);
    expect(mgr.isEffectivelyMuted()).toBe(false);

    // User mute must remain preserved after ad unmutes
    expect(mgr.toggleMuted()).toBe(true);
    mgr.setAdMuted(true);
    expect(mgr.isEffectivelyMuted()).toBe(true);
    mgr.setAdMuted(false);
    expect(mgr.isMuted()).toBe(true);
    expect(mgr.isEffectivelyMuted()).toBe(true);

    // Uninitialized CrazyGames SDK on external hosts (e.g. GitHub Pages) where init() rejects
    // and .game / .ad getters throw must never crash startup
    const prevWin = (globalThis as any).window;
    let gameGetterAccessCount = 0;
    const mockSdk = {
      environment: 'crazygames',
      init: () => Promise.reject(new Error('Unauthorized domain')),
      get game() {
        gameGetterAccessCount++;
        throw new Error('CrazySDK is not initialized yet.');
      },
      get ad() {
        gameGetterAccessCount++;
        throw new Error('CrazySDK is not initialized yet.');
      },
    };
    (globalThis as any).window = {
      CrazyGames: { SDK: mockSdk },
      setTimeout,
      clearTimeout,
      location: { search: '' },
      self: {},
      top: {},
    };
    try {
      await expect(cgInit()).resolves.toBeUndefined();
      expect(isCrazyGamesEnv()).toBe(false);
      expect(() => {
        cgBindAudioMuteListener(() => {});
        cgLoadingStart();
        cgLoadingStop();
        cgGameplayStart();
        cgHappyTime();
        cgGameplayStop();
      }).not.toThrow();
      expect(gameGetterAccessCount).toBe(0);
    } finally {
      (globalThis as any).window = prevWin;
    }
  });

  it('builds grounded multi-part procedural chest & connected escalator vault station with instanced cleats and dispose cleanup', () => {
    const chest = createProceduralTreasureChest({ scale: 1.08, gemColor: '#38bdf8' });
    chest.group.updateMatrixWorld(true);
    const chestBox = new THREE.Box3().setFromObject(chest.group);
    expect(chestBox.min.y).toBeGreaterThanOrEqual(-0.02);
    expect(chestBox.min.y).toBeLessThanOrEqual(0.02);

    let chestMeshCount = 0;
    let chestInstancedCount = 0;
    chest.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) chestInstancedCount += 1;
      if (obj instanceof THREE.Mesh) chestMeshCount += 1;
    });
    expect(chestMeshCount).toBeGreaterThan(10);
    expect(chestInstancedCount).toBe(1);

    chest.setInteraction(true, 1.0, 0);
    expect(chest.lidPivot.rotation.x).toBeLessThan(-0.2);

    const station = createChestVaultStation({ crystalColor: '#38bdf8', cliffColor: '#78716c' });
    station.group.updateMatrixWorld(true);
    const stationCenter = new THREE.Box3().setFromObject(station.group).getCenter(new THREE.Vector3());
    expect(stationCenter.z).toBeCloseTo(0.15, 1);
    let stationInstancedCount = 0;
    station.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) stationInstancedCount += 1;
    });
    expect(stationInstancedCount).toBe(1);

    expect(() => {
      station.setPalette('#f97316', '#292524');
      station.update(0.016, 1.2, true, 0.5);
      chest.setAccentColor('#f97316');
      chest.dispose();
      station.dispose();
    }).not.toThrow();
  });

  it('builds grand procedural cave cliff, continuous railway, and animated 2-car minecart train with dispose cleanup', () => {
    const cave: CaveRailwayHandle = createCaveRailway({
      crystalColor: '#38bdf8',
      cliffColor: '#78716c',
      foliageColor: '#16a34a',
    });
    cave.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cave.group);
    expect(box.max.y).toBeGreaterThan(3.5);

    let instancedCount = 0;
    cave.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) instancedCount += 1;
    });
    expect(instancedCount).toBe(1);

    expect(() => {
      cave.setPalette('#c084fc', '#44403c', '#059669');
      cave.update(0.05, 2.5);
      cave.update(0.05, 6.0);
      cave.dispose();
    }).not.toThrow();
  });

  it('builds ruined Cyber City highway, central meteor crater, instanced skyline & billboards for Battle Tower with full dispose cleanup', () => {
    const cityEnv = createTowerCityEnvironment();
    cityEnv.group.updateMatrixWorld(true);
    let instancedCount = 0;
    cityEnv.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) instancedCount += 1;
    });
    // Rubble + Rebar + 6 Instanced Window Grid layers + Crater Embers + Ash Flakes
    expect(instancedCount).toBe(10);

    expect(() => {
      cityEnv.setBossState(false, false, '#22d3ee');
      cityEnv.update(0.016, 1.5);
      cityEnv.setBossState(true, true, '#f43f5e');
      cityEnv.update(0.05, 3.0);
      cityEnv.dispose();
    }).not.toThrow();

    const arena = new TowerArena3D();
    arena.group.visible = true;
    arena.setFloorVisual(true, '#f43f5e', 5, 10, false);
    arena.update(0.016, 1.2);
    let arenaInstancedCount = 0;
    arena.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) arenaInstancedCount += 1;
    });
    // 10 from cityEnv + 1 Boss anti-gravity crater rocks
    expect(arenaInstancedCount).toBe(11);
    expect(() => arena.dispose()).not.toThrow();
  });

  it('builds procedural 3D hard-surface Corrupted Seraphim Boss with zero BoxGeometry, 6 curved wing pivots, 5-clawed hands, and elevated rear positioning', () => {
    const boss = createSeraphimBoss3D({ scale: 1.02 });
    boss.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(boss.group);
    expect(box.min.y).toBeGreaterThanOrEqual(0.6);
    expect(box.max.y).toBeGreaterThan(4.5);
    expect(boss.wingPivots.length).toBe(6);

    let boxCount = 0;
    let extrudeCount = 0;
    let latheCount = 0;
    let tubeCount = 0;
    let hasNaN = false;
    boss.group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const geo = obj.geometry;
      if (geo instanceof THREE.BoxGeometry) boxCount++;
      if (geo instanceof THREE.ExtrudeGeometry) extrudeCount++;
      if (geo instanceof THREE.LatheGeometry) latheCount++;
      if (geo instanceof THREE.TubeGeometry) tubeCount++;
      const pos = geo.getAttribute('position');
      if (pos) {
        for (let i = 0; i < pos.count; i++) {
          if (!Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getY(i)) || !Number.isFinite(pos.getZ(i))) {
            hasNaN = true;
            break;
          }
        }
      }
    });
    expect(boxCount).toBe(0);
    expect(extrudeCount).toBeGreaterThan(20);
    expect(latheCount).toBeGreaterThan(8);
    expect(tubeCount).toBeGreaterThan(15);
    expect(hasNaN).toBe(false);

    const arena = new TowerArena3D();
    expect(arena.getMonolithWorldPos().z).toBeLessThan(-1.6);
    arena.dispose();

    const prevOuterRot = boss.reactorRingOuter.rotation.z;
    const prevWingYaw = boss.wingPivots[0].rotation.y;
    boss.update(0.016, 1.4, 0.5);
    expect(boss.reactorRingOuter.rotation.z).not.toBe(prevOuterRot);
    expect(boss.wingPivots[0].rotation.y).not.toBe(prevWingYaw);
    expect(() => boss.dispose()).not.toThrow();
  });

  it('builds procedural Neo-Cyber City Plaza lobby with preserved 6-station hitboxes, instanced street props, Snow Rain shop visibility, and clean dispose', () => {
    const plaza = createShopCyberPlaza();
    plaza.group.updateMatrixWorld(true);
    let instancedCount = 0;
    let lightCount = 0;
    let roundaboutShadowCount = 0;
    const roadLaneMinClearance = 4.65;
    const laneBox = new THREE.Box3();
    const laneSize = new THREE.Vector3();
    plaza.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) instancedCount++;
      if (obj instanceof THREE.Light) lightCount++;
      if (obj instanceof THREE.Mesh) {
        if (
          obj.geometry instanceof THREE.RingGeometry &&
          obj.material instanceof THREE.MeshBasicMaterial &&
          obj.material.transparent &&
          obj.material.depthWrite === false
        ) {
          roundaboutShadowCount++;
        }
        laneBox.setFromObject(obj);
        laneBox.getSize(laneSize);
        if (
          laneBox.min.y >= 0.175 &&
          laneBox.max.y <= 0.225 &&
          laneSize.y <= 0.06 &&
          Math.min(laneSize.x, laneSize.z) <= 0.25 &&
          Math.max(laneSize.x, laneSize.z) >= 0.8
        ) {
          const cx = Math.max(laneBox.min.x, Math.min(0, laneBox.max.x));
          const cz = Math.max(laneBox.min.z, Math.min(-0.5, laneBox.max.z));
          expect(Math.hypot(cx, cz + 0.5)).toBeGreaterThanOrEqual(roadLaneMinClearance);
        }
      }
    });
    expect(roundaboutShadowCount).toBeGreaterThanOrEqual(1);
    expect(instancedCount).toBeGreaterThanOrEqual(6);
    expect(lightCount).toBeGreaterThanOrEqual(5);
    expect(plaza.animatedCrystals.length).toBeGreaterThan(4);
    expect(plaza.animatedRings.length).toBeGreaterThanOrEqual(4);
    expect(() => {
      plaza.update(0.016, 1.25);
      plaza.dispose();
    }).not.toThrow();

    const shop = new ShopWorld3D();
    const kinds = new Set(shop.shopClickables.map((c) => String(c.userData?.kind)));
    expect(kinds).toEqual(
      new Set(['shop-altar', 'shop-pickaxe', 'shop-sell', 'shop-forge', 'shop-gems', 'shop-tower'])
    );
    expect(() => shop.dispose()).not.toThrow();

    const wx = new WeatherFx3D();
    wx.setWeather('snow_rain');
    wx.setShopMode(true);
    expect(wx.group.scale.x).toBeGreaterThan(1.1);
    expect(() => {
      wx.update(0.016, 2.0, true);
      wx.dispose();
    }).not.toThrow();
  });

  it('builds cyber-industrial MineEnvironment3D dark basalt deck, Drop Shaft, Plasma Refinery, holographic pedestals & keeps central Void sky window unobstructed with dispose', () => {
    const env = new MineEnvironment3D(DEFAULT_WORLD_PALETTE);
    env.group.updateMatrixWorld(true);

    let meshCount = 0;
    let rearSkyOccluderCount = 0;
    const box = new THREE.Box3();
    env.group.traverse((obj) => {
      if (obj === env.skyDome) return;
      if (obj instanceof THREE.Mesh) {
        let vis = true;
        let cur: THREE.Object3D | null = obj;
        while (cur) {
          if (!cur.visible) {
            vis = false;
            break;
          }
          cur = cur.parent;
        }
        if (!vis) return;
        meshCount += 1;
        box.setFromObject(obj);
        // Distant lateral city support pillars must never intrude into central upper-sky Void/Bloodmoon band
        if (box.min.z < -7.5 && box.max.y > 4.2 && Math.abs(box.getCenter(new THREE.Vector3()).x) < 14.0) {
          rearSkyOccluderCount += 1;
        }
      }
    });
    expect(meshCount).toBeGreaterThan(50);
    expect(rearSkyOccluderCount).toBe(0);

    expect(() => {
      env.setWeatherSky('void', '#d8b4fe');
      env.updateSky(1.0, new THREE.Vector3(0, 11.7, 15.6));
      env.update(0.016, 1.5, true, 0.35);
      env.dispose();
    }).not.toThrow();

    const ped = new PlotPedestal3D(2, 0, -4.28);
    expect(ped.group.children.length).toBeGreaterThanOrEqual(5);
    expect(() => {
      ped.setHovered(true);
      ped.update(0.016, 2.2);
      ped.dispose();
    }).not.toThrow();
  });

  it('caches headless-safe SRGB cyber-anime VFX textures in ProceduralTextures3D', () => {
    const slashA = getDualSlashArcTexture();
    const slashB = getDualSlashArcTexture();
    const spark = getHitSparkStarTexture();
    const ring = getShockwaveRingTexture();
    const glint = getWindupGlintTexture();
    const streak = getSparkStreakTexture();

    expect(slashA).toBe(slashB);
    for (const tex of [slashA, spark, ring, glint, streak]) {
      expect(tex).toBeInstanceOf(THREE.Texture);
      expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
    }
  });

  it('spawns 4-layer AttackImpactFxController pools with oldest-recycling caps and full dispose', () => {
    const fx = new AttackImpactFxController({ floorY: 0.045 });
    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(6, 11.7, 15.6);
    cam.lookAt(0, 0, 0);

    // Cache tilted camera via update(), then verify frame-0 orientation right on spawnImpact()
    fx.update(0.016, cam);
    fx.spawnImpact({
      targetX: 0,
      targetY: 0.95,
      targetZ: 0,
      accentColor: '#f59e0b',
      comboStep: 2,
      heavy: true,
      attackerX: -1.3,
      attackerZ: 0.36,
    });
    const afterOne = fx.getActiveCounts();
    expect(afterOne.slashes).toBe(2);
    expect(afterOne.hitsparks).toBe(1);
    expect(afterOne.streaks).toBeGreaterThanOrEqual(8);
    expect(afterOne.shockwaves).toBe(1);

    // Verify frame-0 slash, hitspark, and streak meshes already received camera+velocity alignment on spawn
    for (const idx of [0, 2, 3]) {
      const q = fx.group.children[idx]?.quaternion;
      expect(q).toBeDefined();
      expect(Math.abs(q.x) + Math.abs(q.y)).toBeGreaterThan(0.01);
    }

    // Verify fresh controller handles no-camera safely and honors explicit opts.camera without prior update()
    const freshNoCam = new AttackImpactFxController({ floorY: 0.045 });
    expect(() =>
      freshNoCam.spawnImpact({ targetX: 0, targetY: 1.0, targetZ: 0, accentColor: '#38bdf8', comboStep: 0 })
    ).not.toThrow();
    freshNoCam.dispose();

    const freshWithCam = new AttackImpactFxController({ floorY: 0.045 });
    freshWithCam.spawnImpact({
      targetX: 0,
      targetY: 1.0,
      targetZ: 0,
      accentColor: '#38bdf8',
      comboStep: 0,
      camera: cam,
    });
    for (const idx of [0, 1, 2]) {
      const q = freshWithCam.group.children[idx]?.quaternion;
      expect(q).toBeDefined();
      expect(Math.abs(q.x) + Math.abs(q.y)).toBeGreaterThan(0.01);
    }
    freshWithCam.dispose();

    for (let i = 0; i < 20; i++) {
      fx.spawnImpact({ targetX: 0, targetY: 1.0, targetZ: 0, accentColor: '#38bdf8', comboStep: i % 3 });
    }
    const capped = fx.getActiveCounts();
    expect(capped.slashes).toBe(18);
    expect(capped.hitsparks).toBe(16);
    expect(capped.streaks).toBe(64);
    expect(capped.shockwaves).toBe(12);
    expect(fx.group.children.length).toBeLessThanOrEqual(158);

    let instanced = 0;
    fx.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) instanced++;
    });
    expect(instanced).toBe(0);

    fx.update(0.12, cam);
    fx.update(0.8, cam);
    const expired = fx.getActiveCounts();
    expect(expired.slashes + expired.hitsparks + expired.streaks + expired.shockwaves).toBe(0);

    fx.spawnShatter({ targetX: 0, targetY: 1.0, targetZ: 0, oreColor: '#38bdf8', secondaryColor: '#fde047', camera: cam });
    const shatterCounts = fx.getActiveCounts();
    expect(shatterCounts.hitsparks).toBe(2);
    expect(shatterCounts.shockwaves).toBe(2);
    expect(shatterCounts.streaks).toBe(14);
    expect(fx.group.children.length).toBeGreaterThan(20);

    expect(() => fx.dispose()).not.toThrow();
  });

  it('drives 4-layer AttackImpactFxController and OreBillboard2D horizontal recoil from OrePit3D.hitNode', () => {
    const pit = new OrePit3D(DEFAULT_WORLD_PALETTE);
    pit.group.visible = true;
    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 11.7, 15.6);

    const info = pit.getAliveNodesInfo()[0];
    expect(info).toBeDefined();

    const res = pit.hitNode(info.id, 10, false, undefined, {
      accentColor: '#fb7185',
      attackerX: info.worldX - 1.3,
      attackerZ: info.worldZ + 0.36,
      comboStep: 2,
    });
    expect(res?.dmgDealt).toBe(10);
    const counts = pit.getImpactFxCounts();
    expect(counts.slashes).toBe(2);
    expect(counts.hitsparks).toBe(1);
    expect(counts.streaks).toBeGreaterThanOrEqual(8);
    expect(counts.shockwaves).toBe(1);

    pit.update(0.016, 0.5, cam);
    expect(() => pit.dispose()).not.toThrow();
  });

  it('resets residual ore recoilAmt to 0 when OrePit3D nodes respawn or TowerArena3D spawns a new wave', () => {
    const pit = new OrePit3D(DEFAULT_WORLD_PALETTE);
    pit.group.visible = true;
    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 11.7, 15.6);

    const info = pit.getAliveNodesInfo()[0];
    const broke = pit.hitNode(info.id, info.maxHp + 100, true, undefined, {
      attackerX: info.worldX - 1.3,
    });
    expect(broke?.broken).toBe(true);

    // Respawn the broken node and tick transform once
    pit.update(BASE_ORE_RESPAWN_SEC + 0.1, 1.0, cam);
    pit.update(0.016, 1.016, cam);

    const respawned = pit.getAliveNodesInfo()[0];
    expect(respawned).toBeDefined();
    // Locate the active OreBillboard2D visualGroup inside pit.group (position matches respawned x, z)
    const nodeRoot = pit.group.children.find(
      (c) =>
        c.visible &&
        Math.abs(c.position.x - respawned.worldX) < 0.01 &&
        Math.abs(c.position.z - (respawned.worldZ - 0.65)) < 0.01 &&
        c.children[0]?.children[0]?.children[0] instanceof THREE.Group
    );
    const visualGroup = nodeRoot?.children[0]?.children[0]?.children[0] as THREE.Group | undefined;
    expect(visualGroup).toBeDefined();
    expect(visualGroup!.rotation.z).toBe(0);
    pit.dispose();

    const arena = new TowerArena3D();
    arena.group.visible = true;
    arena.syncWaveState({
      floor: 1,
      wave: 1,
      isBossWave: false,
      isCheckpointFloor: false,
      waveOres: rollTowerWaveOres(1, 1),
      anomalyColorHex: '#38bdf8',
      equippedMinerCount: 1,
      paused: false,
    });
    arena.triggerOreHitBounce(0, false, { attackerX: -6.0 });
    // Advance to wave 2 immediately (newlySpawned = true)
    arena.syncWaveState({
      floor: 1,
      wave: 2,
      isBossWave: false,
      isCheckpointFloor: false,
      waveOres: rollTowerWaveOres(1, 2),
      anomalyColorHex: '#38bdf8',
      equippedMinerCount: 1,
      paused: false,
    });
    arena.update(0.016, 0.5, cam);
    const rock0Hit = arena.getActiveClickables()[0];
    const rock0Root = rock0Hit?.parent;
    const rock0Visual = rock0Root?.children[0]?.children[0]?.children[0] as THREE.Group | undefined;
    expect(rock0Visual).toBeDefined();
    expect(rock0Visual!.rotation.z).toBe(0);
    arena.dispose();
  });

  it('unifies 4-layer AttackImpactFxController and fighter accent color sync in TowerArena3D while keeping 11 InstancedMeshes', () => {
    const arena = new TowerArena3D();
    arena.group.visible = true;
    arena.syncFighters([
      { slotIndex: 0, def: CHIBI_CATALOG[1], enchantId: null, dmg: 30, speed: 12, miningMult: 1.2 }, // solar-striker #f59e0b
    ]);
    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 9.2, 14.8);
    cam.lookAt(0, 2.2, -1.6);

    const wave1Ores = rollTowerWaveOres(1, 1);
    arena.syncWaveState({
      floor: 1,
      wave: 1,
      isBossWave: false,
      isCheckpointFloor: false,
      waveOres: wave1Ores,
      anomalyColorHex: '#38bdf8',
      equippedMinerCount: 1,
      paused: false,
    });

    const strikes: Array<{ accentColor?: string; comboStep?: number }> = [];
    for (let i = 0; i < 45; i++) {
      arena.update(0.05, (i + 1) * 0.05, cam, (ev) => {
        strikes.push({ accentColor: ev.accentColor, comboStep: ev.comboStep });
        if (ev.targetOreIndex !== null) {
          arena.triggerOreHitBounce(ev.targetOreIndex, false, ev);
        }
      });
    }
    expect(strikes.length).toBeGreaterThan(0);
    expect(strikes[0].accentColor).toBe(CHIBI_CATALOG[1].accentColor);

    arena.setFloorVisual(true, '#facc15', 2, 5, false);
    arena.triggerHitBounce(0.24, true);

    let instanced = 0;
    arena.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) instanced++;
    });
    expect(instanced).toBe(11);
    expect(() => arena.dispose()).not.toThrow();
  });

  it('tints Wave 10 Boss fighter impact VFX with fighter accent/enchant color instead of hardcoded gold', () => {
    const arena = new TowerArena3D();
    arena.group.visible = true;
    const chibi = CHIBI_CATALOG[4]; // pyre-kitsune (#fb7185)
    arena.syncFighters([{ slotIndex: 0, def: chibi, enchantId: null, dmg: 30, speed: 12, miningMult: 1.2 }]);
    arena.setFloorVisual(true, '#facc15', 1, 5, false);

    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 9.2, 14.8);
    cam.lookAt(0, 2.2, -1.6);

    // Clear any leftover FX, then advance until the first Boss fighter strike fires
    arena.update(0.5, 0.5, cam);
    let struck = false;
    for (let i = 0; i < 45 && !struck; i++) {
      arena.update(0.05, 0.6 + i * 0.05, cam, () => {
        struck = true;
      });
    }
    expect(struck).toBe(true);

    const slashTex = getDualSlashArcTexture();
    const slashColors: string[] = [];
    arena.group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material;
      if (mat instanceof THREE.MeshBasicMaterial && mat.map === slashTex) {
        slashColors.push(`#${mat.color.getHexString()}`);
      }
    });
    expect(slashColors).toContain(chibi.accentColor);
    arena.dispose();
  });

  it('keeps ghost afterimage opacity at 0 before pose texture loads so untextured quads never flash', () => {
    const sprite = new ChibiSprite3D(CHIBI_CATALOG[1], 1.95, 0);
    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 11.7, 15.6);

    const pivot = sprite.group.children[0] as THREE.Group;
    const ghost0 = pivot.children[1] as THREE.Mesh;
    const ghostMat = ghost0.material as THREE.MeshBasicMaterial;
    expect(ghostMat.map).toBeNull();

    sprite.setFacing(1);
    sprite.setAnimState('attack');
    sprite.triggerAttack(0.4, 0);
    sprite.update(0.14, 1.0, cam); // p = 0.35 (ghost window)
    expect(ghost0.visible).toBe(true);
    expect(ghostMat.opacity).toBe(0);

    sprite.dispose();
  });

  it('scales WeatherFx3D active particle draw range and visibility across graphics quality presets', () => {
    const fx = new WeatherFx3D();
    expect(fx.getActiveParticleCount()).toBe(120);

    fx.setQualityScale(0.5);
    fx.update(0.05, 1.0, true);
    expect(fx.group.visible).toBe(true);
    expect(fx.getActiveParticleCount()).toBe(60);

    fx.setQualityScale(0);
    fx.update(0.05, 1.1, true);
    expect(fx.group.visible).toBe(false);
    expect(fx.getActiveParticleCount()).toBe(0);

    fx.setQualityScale(1);
    fx.update(0.05, 1.2, true);
    expect(fx.group.visible).toBe(true);
    expect(fx.getActiveParticleCount()).toBe(120);

    fx.dispose();
  });

  it('builds FusionWorld3D with Synchro Portal triple rings, ore crystal clusters, floating islands, hologram preview, NPC bubbles, and 3-phase fusion animation', () => {
    expect(getFusionMagicCircuitTexture()).toBeInstanceOf(THREE.Texture);

    const fusionWorld = new FusionWorld3D();
    fusionWorld.group.visible = true;
    const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
    cam.position.set(0, 6.2, 11.4);
    cam.lookAt(0, 1.3, -0.35);
    cam.updateMatrixWorld();

    // Unready recipe -> hologram mode on missing slot, dormant crimson status, no walking NPC speech bubbles
    const recipe = FUSION_RECIPES[0];
    fusionWorld.syncRecipe(recipe, [false, true], [false, true], false);
    fusionWorld.update(0.05, 0.5, cam);

    const bubbles = fusionWorld.getNpcBubbleAnchors(cam, 1280, 720);
    expect(bubbles).toEqual([]);

    // Ready recipe -> switches to ready cyan/gold state
    fusionWorld.syncRecipe(recipe, [true, true], [true, true], true);
    fusionWorld.update(0.05, 1.0, cam);

    // Trigger 4-act Fusion animation -> levitation -> portal supernova -> central descent & dual shatter -> complete callback + reveal hold
    let completed = false;
    fusionWorld.triggerFusionAnimation(recipe, () => {
      completed = true;
    });
    expect(fusionWorld.isAnimating()).toBe(true);
    expect(fusionWorld.getCameraFocusState().active).toBe(true);

    for (let i = 0; i < 80; i++) {
      fusionWorld.update(0.05, 1.1 + i * 0.05, cam);
    }
    expect(completed).toBe(true);
    expect(fusionWorld.isAnimating()).toBe(false);
    expect(fusionWorld.isRevealHolding()).toBe(true);
    expect(fusionWorld.getCameraFocusState().active).toBe(true);
    fusionWorld.setRevealHold(false);
    expect(fusionWorld.getCameraFocusState().active).toBe(false);

    expect(() => fusionWorld.dispose()).not.toThrow();
  });

  it('locks camera orbit to front-facing (yaw=0, pitch=0) when cameraLocked is true while keeping zoom clamping active', () => {
    const unlocked = applyCameraOrbitDrag({
      cameraLocked: false,
      yaw: 0,
      pitch: 0,
      dx: 120,
      dy: 50,
    });
    expect(unlocked.yaw).toBeLessThan(0);
    expect(unlocked.pitch).toBeGreaterThan(0);

    const locked = applyCameraOrbitDrag({
      cameraLocked: true,
      yaw: unlocked.yaw,
      pitch: unlocked.pitch,
      dx: 240,
      dy: -120,
    });
    expect(locked).toEqual({ yaw: 0, pitch: 0 });

    expect(clampCameraZoomRadius(5, 'mine')).toBe(9);
    expect(clampCameraZoomRadius(22, 'mine')).toBe(22);
    expect(clampCameraZoomRadius(40, 'mine')).toBe(28);
    expect(clampCameraZoomRadius(36, 'shop')).toBe(36);
  });

  it('applies the 25% Meteor HP nerf across both base scaling and dynamic team DPS scaling', () => {
    expect(METEOR_HP_MULT).toBe(375);
    expect(computeMeteorDynamicHp(1000, 100)).toBe(Math.round((1000 * 45 + 100 * 150) * 0.75));

    const pit = new OrePit3D(DEFAULT_WORLD_PALETTE);
    pit.spawnWeatherMeteor('void', 2, 0);
    const meteor = pit.getAliveNodesInfo().find((n) => n.isMeteor);
    expect(meteor?.maxHp).toBe(180 * 2 * 375);
    pit.dispose();
  });

  it('buffs top Enchant Altar drop rates to sum to 100% with Spellbound at 0.01%', () => {
    const totalPct = ENCHANTS.reduce((sum, e) => sum + e.chancePct, 0);
    expect(totalPct).toBeCloseTo(100, 6);
    for (let i = 1; i < ENCHANTS.length; i++) {
      expect(ENCHANTS[i].chancePct).toBeLessThan(ENCHANTS[i - 1].chancePct);
    }
    const byId = Object.fromEntries(ENCHANTS.map((e) => [e.id, e.chancePct]));
    expect(byId.thundering).toBe(2.0);
    expect(byId.cataclysmic).toBe(0.6);
    expect(byId.sundering).toBe(0.2);
    expect(byId.timeless).toBe(0.05);
    expect(byId.spellbound).toBe(0.01);
  });

  it('triggers Hold-to-Mine after initial delay and repeats at steady interval until released', () => {
    // Before initial delay: no swing yet
    let state = stepHoldMineTimer({ holding: true, elapsedSec: 0, firedInitial: false, dtSec: 0.1 });
    expect(state.shouldMine).toBe(false);
    expect(state.firedInitial).toBe(false);

    // Crossing initial delay: fires first hold swing
    state = stepHoldMineTimer({
      holding: true,
      elapsedSec: state.elapsedSec,
      firedInitial: state.firedInitial,
      dtSec: HOLD_MINE_INITIAL_DELAY_SEC,
    });
    expect(state.shouldMine).toBe(true);
    expect(state.firedInitial).toBe(true);

    // Subsequent swings use HOLD_MINE_INTERVAL_SEC
    state = stepHoldMineTimer({
      holding: true,
      elapsedSec: 0,
      firedInitial: true,
      dtSec: HOLD_MINE_INTERVAL_SEC,
    });
    expect(state.shouldMine).toBe(true);

    // Releasing resets timer cleanly
    const released = stepHoldMineTimer({
      holding: false,
      elapsedSec: 0.12,
      firedInitial: true,
      dtSec: 0.05,
    });
    expect(released).toEqual({ elapsedSec: 0, firedInitial: false, shouldMine: false });
  });

  it('activates, exposes, and clears Random Pit Events (Golden Vein & Crystal Surge) on OrePit3D', () => {
    expect(rollNextPitEventCooldownSec(() => 0)).toBe(PIT_EVENT_COOLDOWN_MIN_SEC);
    expect(rollNextPitEventCooldownSec(() => 1)).toBe(PIT_EVENT_COOLDOWN_MAX_SEC);
    expect(rollPitEventKind(() => 0.1)).toBe('golden_vein');
    expect(rollPitEventKind(() => 0.9)).toBe('crystal_surge');
    expect(computePitEventBonusGems(0, 'crystal_surge')).toBe(PIT_EVENT_DEFS.crystal_surge.baseBonusGems);
    expect(computePitEventBonusGems(5, 'crystal_surge')).toBe(PIT_EVENT_DEFS.crystal_surge.baseBonusGems * 6);
    expect(computePitEventBonusGems(3, 'golden_vein')).toBe(0);

    const pit = new OrePit3D(DEFAULT_WORLD_PALETTE);
    const nodeId = pit.activatePitEvent('golden_vein');
    expect(nodeId).not.toBeNull();
    const info = pit.getAliveNodesInfo().find((n) => n.id === nodeId);
    expect(info?.pitEventKind).toBe('golden_vein');

    const hitRes = pit.hitNode(nodeId!, 999_999, true);
    expect(hitRes?.broken).toBe(true);
    expect(hitRes?.pitEventKind).toBe('golden_vein');

    pit.clearPitEvent();
    expect(pit.getAliveNodesInfo().some((n) => n.pitEventKind !== undefined)).toBe(false);
    pit.dispose();
  });

  it('spawns, tracks, and evaluates Sweet-Spot / Weak-Spot Ring Perfect Strikes on OrePit3D', async () => {
    const {
      OrePit3D,
      isSweetSpotWindowPure,
      SWEET_SPOT_DMG_MULT,
      SWEET_SPOT_DURATION_SEC,
      SWEET_SPOT_MAX_PROGRESS,
      SWEET_SPOT_MIN_PROGRESS,
    } = await import('../src/game3d/OrePit3D');

    expect(isSweetSpotWindowPure(SWEET_SPOT_MIN_PROGRESS - 0.05)).toBe(false);
    expect(isSweetSpotWindowPure(SWEET_SPOT_MIN_PROGRESS)).toBe(true);
    expect(isSweetSpotWindowPure(SWEET_SPOT_MAX_PROGRESS)).toBe(true);
    expect(isSweetSpotWindowPure(SWEET_SPOT_MAX_PROGRESS + 0.05)).toBe(false);

    const pit = new OrePit3D(DEFAULT_WORLD_PALETTE);
    const aliveIds = pit.getAliveNodeIds();
    expect(aliveIds.length).toBeGreaterThan(0);
    const targetId = aliveIds[0];

    expect(pit.spawnSweetSpot(targetId, SWEET_SPOT_DURATION_SEC)).toBe(true);
    // Early tap before window does NOT consume or trigger Perfect Strike
    expect(pit.consumeSweetSpotTap(targetId)).toBe(false);

    // Advance into the Sweet-Spot window
    pit.update(SWEET_SPOT_DURATION_SEC * 0.72, 1.0);
    const spot = pit.getSweetSpotState();
    expect(spot).not.toBeNull();
    expect(spot!.nodeId).toBe(targetId);
    expect(spot!.inWindow).toBe(true);

    // Tapping inside the window consumes it and returns true for Perfect Strike (4.5x DMG)
    expect(pit.consumeSweetSpotTap(targetId)).toBe(true);
    expect(pit.getSweetSpotState()).toBeNull();

    const hitRes = pit.hitNode(targetId, Math.round(50 * SWEET_SPOT_DMG_MULT), true, 4, {
      isPerfect: true,
    });
    expect(hitRes?.isPerfect).toBe(true);
    expect(hitRes?.dmgDealt).toBeGreaterThan(0);

    pit.dispose();
  });
});
