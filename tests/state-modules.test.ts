import { describe, expect, it } from 'vitest';
import { isNonSellableChibi } from '../src/game/DailyLoginData';
import {
  TOWER_BOSS_COIN_CHANCE,
  TOWER_BOSS_COIN_DROP,
  TOWER_ORE_COIN_CHANCE,
} from '../src/game/TowerData';
import { computeBulkUpgradePlan, getPlotStatUpgradeCost } from '../src/game/UpgradeBulkHelper';
import { getIndexTabEntryIds } from '../src/game/IndexRewardsDomain';
import { rollTapCriticalDamage, TAP_CRIT_MULT } from '../src/game3d/MineScene3D';
import {
  getLatestWorldScaleAnchor,
  getOreById,
  getWorldUpgradeCostScale,
  ORES,
  syncTwinCatalogDpsFromAnchor,
  WORLDS,
  WORLD_MINERS,
} from '../src/game/GameData';
import {
  computeTwinScaledBaseDps,
  computeTwinUpgradeCostScale,
  PREMIUM_SHOP_ITEMS,
} from '../src/game/PremiumShopData';
import { FUSION_RECIPES } from '../src/game/FusionData';
import { OMEGA_BOSS_DEFS, OMEGA_MAX_KEYS } from '../src/game/OmegaData';
import { CHIBI_CATALOG, getChibiById } from '../src/game3d/ChibiCatalog';
import { GameState, getChibiUpgradeCostMult } from '../src/game/GameState';
import {
  createEmptyResearchLevels,
  deserializeSaveJson,
  isValidIndexId,
  migrateOreId,
  serializeSavePayload,
} from '../src/game/GameStateSave';
import {
  BOUNTY_SLOT_COUNT,
  claimBountyDomain,
  getReadyBountyCountDomain,
  recordBountyProgressDomain,
} from '../src/game/BountiesDomain';
import {
  chargeOverclockDomain,
  createInitialOverclockState,
  extendOverclockDomain,
  getOverclockSnapshotDomain,
  OVERCLOCK_DURATION_SEC,
  OVERCLOCK_MAX_DURATION_SEC,
  stepOverclockDomain,
} from '../src/game/OverclockDomain';
import {
  claimOfflineEarningsDomain,
  computeOfflineEarningsDomain,
  formatOfflineDuration,
  MAX_OFFLINE_GEMS,
  MAX_OFFLINE_ORES_PER_SEC,
  OFFLINE_MAX_SEC,
  OFFLINE_MIN_SEC,
  RETURN_RUSH_BOOST_ID,
  RETURN_RUSH_DURATION_SEC,
  RETURN_RUSH_FEVER_CHARGE_BONUS,
  RETURN_RUSH_MIN_OFFLINE_SEC,
  RETURN_RUSH_SPEED_BONUS,
} from '../src/game/OfflineEarningsDomain';
import {
  autoStarUpAllUnits,
  computeDpsBreakdown,
  computePlotUnitStats,
  createFreshPlotUnit,
  equipBestUnitsToPlots,
  getAvailableEnchantUnitsCount,
  starUpUnit,
  toggleUnitEnchant,
} from '../src/game/PlotUnitsDomain';
import { RELICS } from '../src/game/RelicData';
import {
  buildTowerRunBuffPills,
  formatBlessingPickPreview,
  getTowerFloorDef,
  getTowerStreakGemMult,
  getTowerWaveDef,
  groupTowerBlessings,
  pickTowerBlessingChoices,
  TOWER_BLESSINGS,
  TOWER_BLESSING_REROLL_GEM_COST,
  TOWER_BOSS_EXPOSE_DMG_MULT,
  TOWER_BOSS_EXPOSE_SEC,
  TOWER_BOSS_INVUL_SEC,
  TOWER_DICE_PITY_MAX,
  TOWER_GEM_DROP_MULT,
  TOWER_KEY_REGEN_MS,
  TOWER_MAX_FLOOR,
  TOWER_MAX_KEYS,
} from '../src/game/TowerData';
import {
  applyTowerTargetDamageDomain,
  getTowerEffectiveDpsDomain,
  hitTowerBossShieldSweetSpotDomain,
  quickSweepTowerDomain,
  rerollTowerBlessingsDomain,
  startTowerRunDomain,
  stepTowerTickDomain,
  syncTowerKeysDomain,
} from '../src/game/TowerRunDomain';
import {
  onMeteorBrokenDomain,
  onOreBrokenDomain,
  sellAllChestOresDomain,
  shouldAutoSellOreDomain,
  swapHotbarSlotsDomain,
} from '../src/game/LootChestDomain';
import {
  buyPickaxeDomain,
  getWeatherDamageMultDomain,
  refreshPickaxeStockIfDueDomain,
  scaleWeatherMultDomain,
  sellBatchDomain,
  syncWeatherDomain,
  useGemPotionDomain,
} from '../src/game/ShopWeatherDomain';

describe('Tahap C GameState Domain Modules', () => {
  describe('GameStateSave (Task 1)', () => {
    it('migrates legacy ore IDs, validates index entries, and creates empty research maps', () => {
      expect(migrateOreId('topaz')).toBe('glowquartz');
      expect(migrateOreId('eternium')).toBe('immortite');
      expect(migrateOreId(ORES[0].id)).toBe(ORES[0].id);

      expect(isValidIndexId(ORES[0].id)).toBe(true);
      expect(isValidIndexId('astral-recruit')).toBe(true);
      expect(isValidIndexId('stormwraith')).toBe(true);
      expect(isValidIndexId('prism-seraph')).toBe(true);
      expect(isValidIndexId('non-existent-item')).toBe(false);

      const empty = createEmptyResearchLevels();
      expect(Object.keys(empty).sort()).toEqual([
        'abyssal',
        'astral',
        'chrono',
        'core',
        'crystal',
        'magma',
        'ruins',
        'starwell',
        'underground',
      ]);
    });

    it('serializes, migrates legacy saves, refunds excess plot pickaxes, and ignores corrupt JSON', () => {
      const state = new GameState();
      const firstOre = ORES[0].id;
      const relic0 = RELICS[0].id;
      const relic1 = RELICS[1].id;

      const legacyPayload = {
        cash: 999,
        gems: 555,
        miners: { 'astral-recruit': 1 },
        ores: { topaz: 4, [firstOre]: 2 },
        chestOres: { sapphire: 3 },
        others: { 'summon-scroll': 2, 'ore-elixir-1': 1 },
        hotbar: ['topaz', null, null, null, null, null, null, null, null],
        plotMiners: ['astral-recruit', 'astral-recruit', null, null, null, null, null, null],
        plotUnits: [
          null,
          {
            chibiId: 'astral-recruit',
            damageLevel: 2,
            speedLevel: 1,
            miningSpeedLevel: 1,
            pickaxeId: 'copper',
            mutationId: 'normal',
            enchantId: null,
          },
          null,
          null,
          null,
          {
            chibiId: 'astral-recruit',
            damageLevel: 1,
            speedLevel: 1,
            miningSpeedLevel: 1,
            pickaxeId: 'iron',
            mutationId: 'normal',
            enchantId: null,
          },
        ],
        stashedUnits: {
          'astral-recruit': [
            {
              chibiId: 'astral-recruit',
              damageLevel: 3,
              speedLevel: 1,
              miningSpeedLevel: 1,
              pickaxeId: 'gold',
              mutationId: 'normal',
              enchantId: null,
            },
          ],
        },
        lockedOreIds: ['ruby'],
        craftedRelics: [relic0],
        equippedRelics: [relic1, relic0, relic0],
        discovered: ['topaz', 'fake-item'],
        tower: { bestFloor: 12, keys: 99, lastKeyRegenAt: 1000, claimedMilestones: [5, 'bad'] },
        weather: { id: 'not-a-weather', expiresAt: 5000 },
      };

      const compactCalled = { count: 0 };
      deserializeSaveJson(state, JSON.stringify(legacyPayload), () => {
        compactCalled.count++;
      });

      expect(compactCalled.count).toBe(1);
      expect(state.cash).toBe(999);
      expect(state.ores['glowquartz']).toBe(4);
      expect(state.ores[firstOre]).toBe(2);
      expect(state.chestOres['frostquartz']).toBe(3);
      expect(state.others['summon-scroll']).toBeUndefined();
      expect(state.others['ore-elixir-1']).toBe(1);
      expect(state.hotbar[0]).toBe('glowquartz');
      // Slot 1 exceeded owned count (1) and slot 5 was trimmed beyond pedestal count
      expect(state.plotMiners[1]).toBeNull();
      expect(state.ownedPickaxes['copper']).toBe(1);
      expect(state.ownedPickaxes['iron']).toBe(1);
      expect(state.stashedUnits['astral-recruit']?.[0].pickaxeId).toBe('');
      expect(state.lockedOreIds.has('prismite')).toBe(true);
      expect(state.equippedRelics).toEqual([relic0]);
      expect(state.discovered.has('glowquartz')).toBe(true);
      expect(state.discovered.has('fake-item')).toBe(false);
      expect(state.towerKeys).toBe(TOWER_MAX_KEYS);
      expect(state.towerClaimedMilestones).toEqual([5]);
      expect(state.weatherId).not.toBe('not-a-weather');

      const serialized = serializeSavePayload(state);
      expect(serialized.cash).toBe(999);
      expect(serialized.craftedRelics).toEqual([relic0]);

      // Corrupt JSON leaves current state untouched without throwing
      deserializeSaveJson(state, '{corrupt json', () => {});
      expect(state.cash).toBe(999);
    });
  });

  describe('PlotUnitsDomain (Task 2)', () => {
    it('computes upgrade scaling, unit stats, DPS breakdown, and fresh unit defaults', () => {
      const state = new GameState();
      expect(getChibiUpgradeCostMult('astral-recruit')).toBeGreaterThanOrEqual(1);
      expect(createFreshPlotUnit('astral-recruit')).toEqual({
        chibiId: 'astral-recruit',
        damageLevel: 1,
        speedLevel: 1,
        miningSpeedLevel: 1,
        pickaxeId: '',
        mutationId: 'normal',
        enchantId: null,
      });

      const stats = computePlotUnitStats(state, 0);
      expect(stats).not.toBeNull();
      expect(stats?.dmg).toBeGreaterThan(0);

      const dps = computeDpsBreakdown(state);
      expect(dps.units).toHaveLength(1);
      expect(dps.totalPlotDps).toBe(dps.units[0].dps);
    });

    it('handles Star-Up validation, 1-per-unit Enchant exclusivity, and stash preservation in equipBest', () => {
      const state = new GameState();
      expect(starUpUnit(state, 'non-existent')).toEqual({ ok: false, reason: 'invalid' });
      expect(starUpUnit(state, 'astral-recruit')).toEqual({ ok: false, reason: 'insufficient' });

      state.miners['astral-recruit'] = 10;
      expect(starUpUnit(state, 'astral-recruit')).toEqual({ ok: true, newStar: 1 });
      expect(autoStarUpAllUnits(state)).toBeGreaterThanOrEqual(1);

      state.miners['solar-striker'] = 1;
      state.cash = 1_000_000;
      state.upgradePlotDamage(0);
      if (state.plotUnits[0]) state.plotUnits[0].enchantId = 'blazing';
      state.ownedEnchants['blazing'] = 1;
      expect(getAvailableEnchantUnitsCount(state, 'blazing')).toBe(0);

      state.removeMinerFromPlot(0);
      // Stashed upgraded unit keeps its enchant reservation
      expect(getAvailableEnchantUnitsCount(state, 'blazing')).toBe(0);

      equipBestUnitsToPlots(state);
      const astralSlot = state.plotMiners.indexOf('astral-recruit');
      expect(astralSlot).toBeGreaterThanOrEqual(0);
      expect(state.plotUnits[astralSlot]?.damageLevel).toBeGreaterThanOrEqual(2);
      expect(toggleUnitEnchant(state, astralSlot, 'blazing')).toBe(true);
      expect(getAvailableEnchantUnitsCount(state, 'blazing')).toBe(1);
    });
  });

  describe('TowerRunDomain (Task 3)', () => {
    it('regenerates Tower keys on elapsed interval and enforces key guards on start & sweep', () => {
      const state = new GameState();
      state.towerKeys = 1;
      state.towerLastKeyRegenAt = 1_000;
      let savedCount = 0;
      syncTowerKeysDomain(state, 1_000 + TOWER_KEY_REGEN_MS * 2 + 50, () => {
        savedCount++;
      });
      expect(state.towerKeys).toBe(3);
      expect(savedCount).toBe(1);

      expect(quickSweepTowerDomain(state, 5000)).toEqual({ ok: false, gemsAwarded: 0 });
      state.towerBestFloor = 5;
      const sweep = quickSweepTowerDomain(state, 5000);
      expect(sweep.ok).toBe(true);
      expect(sweep.gemsAwarded).toBeGreaterThan(0);

      state.towerKeys = 0;
      expect(startTowerRunDomain(state, 1, 5000)).toBe(false);
    });

    it('enforces Wave 10 Boss invulnerability, blessing auto-pick, and tower DPS calculation', () => {
      const state = new GameState();
      const t0 = 10_000;
      expect(startTowerRunDomain(state, 1, t0, () => 0.1)).toBe(true);
      expect(getTowerEffectiveDpsDomain(state)).toBeGreaterThan(0);

      // Jump to Wave 10 Boss manually inside towerRun
      if (state.towerRun) {
        state.towerRun.wave = 10;
        state.towerRun.isBossWave = true;
        state.towerRun.hp = 500;
        state.towerRun.maxHp = 500;
        state.towerRun.bossInvulLeft = TOWER_BOSS_INVUL_SEC;
      }

      // Blocked while invulnerable
      const invulHit = applyTowerTargetDamageDomain(state, null, 9999);
      expect(invulHit.dmgDealt).toBe(0);

      // Step down boss invulnerability, then defeat boss -> triggers pendingBlessings
      stepTowerTickDomain(state, TOWER_BOSS_INVUL_SEC + 0.1);
      expect(state.towerRun?.bossInvulLeft).toBe(0);
      const bossKill = applyTowerTargetDamageDomain(state, null, 9999, () => 0.1);
      expect(bossKill.floorCleared).toBe(true);
      expect(state.towerRun?.pendingBlessings).not.toBeNull();

      // Blessing auto-picks after 5s countdown
      const autoRes = stepTowerTickDomain(state, 5.5, () => 0);
      expect(autoRes.status).toBe('blessing-auto-picked');
      expect(state.towerRun?.floor).toBe(2);
      expect(state.towerRun?.wave).toBe(1);
    });

    it('supports Boss Shield-Break Sweet-Spot (+50% Exposed DMG), 12 Blessings (Overkill/Chain/Reroll), Streak Mult, Dice Pity & Near-Miss Summary', () => {
      expect(TOWER_BLESSINGS.length).toBeGreaterThanOrEqual(12);
      expect(getTowerStreakGemMult(0)).toBe(1);
      expect(getTowerStreakGemMult(2)).toBe(1.5);
      expect(getTowerStreakGemMult(10)).toBe(3);

      const state = new GameState();
      state.gems = TOWER_BLESSING_REROLL_GEM_COST;
      expect(startTowerRunDomain(state, 1, 20_000, () => 0.1)).toBe(true);

      // Jump to Boss Wave -> 2 Sweet-Spot hits shatter 5s shield and trigger 4s EXPOSED (+50% DMG)
      if (state.towerRun) {
        state.towerRun.wave = 10;
        state.towerRun.isBossWave = true;
        state.towerRun.hp = 10_000;
        state.towerRun.maxHp = 10_000;
        state.towerRun.bossInvulLeft = TOWER_BOSS_INVUL_SEC;
      }
      const firstCrack = hitTowerBossShieldSweetSpotDomain(state);
      expect(firstCrack.hit).toBe(true);
      expect(firstCrack.shieldBroken).toBe(false);
      expect(firstCrack.remainingShieldSec).toBeCloseTo(2.5, 5);

      const shatter = hitTowerBossShieldSweetSpotDomain(state);
      expect(shatter.hit).toBe(true);
      expect(shatter.shieldBroken).toBe(true);
      expect(shatter.bossExposeLeft).toBe(TOWER_BOSS_EXPOSE_SEC);

      const exposedHit = applyTowerTargetDamageDomain(state, null, 1000, () => 0.99);
      expect(exposedHit.dmgDealt).toBe(Math.round(1000 * TOWER_BOSS_EXPOSE_DMG_MULT));

      // Kill Boss -> test free reroll + paid gem reroll
      const bossKill = applyTowerTargetDamageDomain(state, null, 50_000, () => 0.99);
      expect(bossKill.floorCleared).toBe(true);
      expect(state.towerDicePity).toBe(1); // missed dice drop increments pity

      const firstSet = state.towerRun!.pendingBlessings!.map((b) => b.id);
      const freeReroll = rerollTowerBlessingsDomain(state, () => 0.25);
      expect(freeReroll).toEqual({ ok: true, usedFree: true, costGems: 0 });
      const secondSet = state.towerRun!.pendingBlessings!.map((b) => b.id);
      expect(secondSet.some((id) => !firstSet.includes(id))).toBe(true);

      const gemsBeforePaid = state.gems;
      const paidReroll = rerollTowerBlessingsDomain(state, () => 0.5);
      expect(paidReroll).toEqual({ ok: true, usedFree: false, costGems: TOWER_BLESSING_REROLL_GEM_COST });
      expect(state.gems).toBe(gemsBeforePaid - TOWER_BLESSING_REROLL_GEM_COST);

      // Test Overkill Splash & Chain Spark on normal wave
      stepTowerTickDomain(state, 5.5, () => 0); // enter Floor 2 Wave 1
      const splashDef = TOWER_BLESSINGS.find((b) => b.id === 'overkill-splash')!;
      const chainDef = TOWER_BLESSINGS.find((b) => b.id === 'chain-spark')!;
      state.towerRun!.blessings = [splashDef, chainDef];
      for (const ore of state.towerRun!.waveOres) {
        ore.hp = 100;
        ore.maxHp = 100;
        ore.alive = true;
      }
      applyTowerTargetDamageDomain(state, 0, 200, () => 0.99);
      // Ore 0 breaks (excess 100 * 0.8 = 80 splashed to Ore 1), plus Chain Spark hits 2 other alive ores for 70
      expect(state.towerRun!.waveOres[0].alive).toBe(false);
      expect(state.towerRun!.waveOres[1].hp).toBeLessThan(100);
      expect(state.towerRun!.waveOres[2].hp).toBeLessThan(100);

      // Verify Dice Pity guarantees dice on the 4th Boss miss and resets to 0
      state.towerDicePity = TOWER_DICE_PITY_MAX - 1;
      const diceBeforePity = state.enchantDice;
      state.towerRun!.wave = 10;
      state.towerRun!.isBossWave = true;
      state.towerRun!.bossInvulLeft = 0;
      state.towerRun!.hp = 100;
      state.towerRun!.maxHp = 100;
      const pityKill = applyTowerTargetDamageDomain(state, null, 500, () => 0.99); // rng=0.99 fails normal roll
      expect(pityKill.pityTriggered).toBe(true);
      expect(pityKill.diceAwarded).toBeGreaterThanOrEqual(1);
      expect(state.enchantDice).toBeGreaterThan(diceBeforePity);
      expect(state.towerDicePity).toBe(0);

      // Verify Near-Miss Summary when timer expires
      stepTowerTickDomain(state, 5.5, () => 0); // enter Floor 3 Wave 1
      state.towerRun!.hp = 20;
      state.towerRun!.maxHp = 200;
      const timeoutRes = stepTowerTickDomain(state, state.towerRun!.timeLeft + 1);
      expect(timeoutRes.status).toBe('timeout');
      expect(timeoutRes.summary?.remainingHpPct).toBe(10);
      expect(timeoutRes.summary?.bestStreakMult).toBe(getTowerStreakGemMult(2));

      // Verify Floor 80 Final Boss victory completes the Tower ("tamat") without advancing to Floor 81
      state.towerBestFloor = TOWER_MAX_FLOOR;
      state.towerKeys = 3;
      expect(startTowerRunDomain(state, TOWER_MAX_FLOOR, 30_000, () => 0.1)).toBe(true);
      state.towerRun!.wave = 10;
      state.towerRun!.isBossWave = true;
      state.towerRun!.bossInvulLeft = 0;
      state.towerRun!.hp = 1000;
      state.towerRun!.maxHp = 1000;
      const finalWin = applyTowerTargetDamageDomain(state, null, 5000, () => 0.5);
      expect(finalWin.floorCleared).toBe(true);
      expect(finalWin.towerCompleted).toBe(true);
      expect(state.towerRun).toBeNull();
      expect(state.towerLastSummary?.reason).toBe('victory');
      expect(state.towerLastSummary?.highestReached).toBe(TOWER_MAX_FLOOR);
      expect(getTowerFloorDef(99).floor).toBe(TOWER_MAX_FLOOR);
      expect(TOWER_GEM_DROP_MULT).toBeCloseTo(0.2, 6);
      expect(getTowerFloorDef(1).gemReward).toBe(7);
      expect(getTowerFloorDef(50).gemReward).toBe(335); // includes Floor 50 Gem Surge (1.45x) at 0.2x scale
      expect(getTowerWaveDef(1, 1).waveGemReward).toBe(1);
      expect(getTowerWaveDef(49, 1).waveGemReward).toBe(16);
    });

    it('filters maxed mechanical blessings out of RNG & reroll pools and summarizes grouped buffs & previews', () => {
      const cappedDefs = TOWER_BLESSINGS.filter((b) => b.maxStacks !== undefined);
      expect(cappedDefs.length).toBeGreaterThanOrEqual(6);

      // Fill every capped mechanical blessing to its maxStacks
      const maxedOwned = cappedDefs.flatMap((def) =>
        Array.from({ length: def.maxStacks! }, () => def)
      );
      const cappedIds = new Set(cappedDefs.map((b) => b.id));

      for (let i = 0; i < 10; i++) {
        const choices = pickTowerBlessingChoices(() => (i * 0.17) % 1, [], maxedOwned);
        expect(choices).toHaveLength(3);
        expect(choices.every((c) => !cappedIds.has(c.id))).toBe(true);
      }

      // Even when rerolling excludes 3 uncapped choices, maxed blessings stay excluded
      const state = new GameState();
      state.gems = TOWER_BLESSING_REROLL_GEM_COST * 2;
      expect(startTowerRunDomain(state, 1, 40_000, () => 0.1)).toBe(true);
      state.towerRun!.blessings = [...maxedOwned];
      state.towerRun!.pendingBlessings = pickTowerBlessingChoices(() => 0.2, [], state.towerRun!.blessings);
      const reroll = rerollTowerBlessingsDomain(state, () => 0.7);
      expect(reroll.ok).toBe(true);
      expect(state.towerRun!.pendingBlessings).toHaveLength(3);
      expect(state.towerRun!.pendingBlessings!.every((c) => !cappedIds.has(c.id))).toBe(true);

      // Verify grouping, MAX flag, before->after preview, and run buff summary pills
      const gemMagnet = TOWER_BLESSINGS.find((b) => b.id === 'gem-magnet')!;
      const chainSpark = TOWER_BLESSINGS.find((b) => b.id === 'chain-spark')!;
      const grouped = groupTowerBlessings([gemMagnet, chainSpark, gemMagnet, chainSpark, gemMagnet]);
      expect(grouped[0]).toMatchObject({ def: gemMagnet, count: 3, maxed: false, totalLabel: '+90% Gems' });
      expect(grouped[1]).toMatchObject({ def: chainSpark, count: 2, maxed: true, totalLabel: 'Chain 4 Ores' });

      expect(formatBlessingPickPreview(gemMagnet, 6)).toBe('Gems +180% → +210%');
      expect(formatBlessingPickPreview(chainSpark, 1)).toBe('Chain 2 → 4 Ores');

      const pills = buildTowerRunBuffPills([gemMagnet, gemMagnet, chainSpark]);
      expect(pills.map((p) => p.label)).toEqual(['+60% Gems', 'Chain 2']);
    });
  });

  describe('LootChestDomain (Task 4)', () => {
    it('swaps hotbar slots while tracking selection and obeys ore lock over auto-sell', () => {
      const state = new GameState();
      state.hotbar = ['item-a', 'item-b', null, null, null, null, null, null, null];
      state.selectedHotbarSlot = 0;

      expect(swapHotbarSlotsDomain(state, 0, 1)).toBe(true);
      expect(state.hotbar[0]).toBe('item-b');
      expect(state.hotbar[1]).toBe('item-a');
      expect(state.selectedHotbarSlot).toBe(1);
      expect(swapHotbarSlotsDomain(state, 2, 0)).toBe(false);

      const firstOre = ORES[0];
      state.autoSellRarities.add(firstOre.rarity);
      expect(shouldAutoSellOreDomain(state, firstOre.id)).toBe(true);
      state.lockedOreIds.add(firstOre.id);
      expect(shouldAutoSellOreDomain(state, firstOre.id)).toBe(false);
    });

    it('processes ore/meteor drops, respects chest lock, and applies +35% full-chest bonus', () => {
      const state = new GameState();
      state.cash = 0;
      const lockedOre = ORES[0];
      const unlockedOre = ORES[1];
      state.chestOres[lockedOre.id] = 10;
      state.lockedOreIds.add(lockedOre.id);
      state.chestOres[unlockedOre.id] = state.getMaxChestCapacity();

      const sale = sellAllChestOresDomain(state);
      expect(sale.bonusApplied).toBe(true);
      expect(sale.earned).toBeGreaterThan(0);
      expect(state.chestOres[lockedOre.id]).toBe(10);
      expect(state.chestOres[unlockedOre.id]).toBeUndefined();

      state.chestOres = {};
      onOreBrokenDomain(state, 'geode', () => 0);
      expect(Object.keys(state.chestOres).length).toBeGreaterThanOrEqual(1);

      const meteorRes = onMeteorBrokenDomain(state, 'celestial', () => 0);
      expect(meteorRes.weatherOreQty).toBeGreaterThanOrEqual(1);
      expect(meteorRes.gemsAwarded).toBeGreaterThanOrEqual(10);
    });
  });

  describe('ShopWeatherDomain (Task 5)', () => {
    it('refreshes pickaxe stock when due, validates pickaxe purchases, and sells mixed batches once', () => {
      const state = new GameState();
      state.pickaxeStock['sunwheel'] = 0;
      state.pickaxeRestockAt = 10_000;
      expect(refreshPickaxeStockIfDueDomain(state, 9_999)).toBe(false);
      expect(refreshPickaxeStockIfDueDomain(state, 10_000)).toBe(true);
      expect(state.pickaxeStock['sunwheel']).toBeGreaterThan(0);

      state.cash = 0;
      expect(buyPickaxeDomain(state, 'sunwheel', 10_001)).toBe('no_cash');
      state.pickaxeStock['sunwheel'] = 0;
      expect(buyPickaxeDomain(state, 'sunwheel', 10_001)).toBe('sold_out');

      state.pickaxeStock['sunwheel'] = 1;
      state.cash = 100_000;
      expect(buyPickaxeDomain(state, 'sunwheel', 10_001)).toBe('bought');
      expect(state.ownedPickaxes['sunwheel']).toBe(1);

      const firstOre = ORES[0].id;
      state.ores[firstOre] = 2;
      state.miners['astral-recruit'] = 2; // 1 on plot, 1 sellable
      let emitted = 0;
      const earned = sellBatchDomain(
        state,
        [`ore:${firstOre}`, 'miner:astral-recruit', 'pickaxe:sunwheel'],
        () => {
          emitted++;
        }
      );
      expect(earned).toBeGreaterThan(0);
      expect(emitted).toBe(1);
      expect(state.ores[firstOre]).toBeUndefined();
      expect(state.miners['astral-recruit']).toBe(1);
      expect(state.ownedPickaxes['sunwheel']).toBeUndefined();
    });

    it('stacks gem potion durations and scales positive weather buffs with equipped relics', () => {
      const state = new GameState();
      state.others['ore-elixir-1'] = 2;
      expect(useGemPotionDomain(state, 'ore-elixir-1', 50_000)).toBe(true);
      const firstExpiry = state.activeBoosts['ore-elixir-1'];
      expect(firstExpiry).toBeGreaterThan(50_000);
      expect(useGemPotionDomain(state, 'ore-elixir-1', 55_000)).toBe(true);
      expect(state.activeBoosts['ore-elixir-1']).toBe(firstExpiry + (firstExpiry - 50_000));
      expect(useGemPotionDomain(state, 'ore-elixir-1', 60_000)).toBe(false);

      state.weatherExpiresAt = 100_000;
      expect(syncWeatherDomain(state, 99_999)).toBeNull();
      const rolled = syncWeatherDomain(state, 100_000, () => 0.95);
      expect(rolled).not.toBeNull();
      expect(scaleWeatherMultDomain(state, 0.8)).toBe(0.8);
      expect(scaleWeatherMultDomain(state, 1.5)).toBe(1.5);
      expect(getWeatherDamageMultDomain(state)).toBeGreaterThanOrEqual(1);

      // All 12 Relics strictly use the 3 core dopamine passives: Team DMG, Sell Ore, Drop Ore
      const allowedRelicStats = new Set(['minerDmgPct', 'oreValuePct', 'oreDropPct']);
      for (const relic of RELICS) {
        const keys = Object.keys(relic.effects);
        expect(keys.length).toBeGreaterThanOrEqual(2);
        for (const key of keys) {
          expect(allowedRelicStats.has(key)).toBe(true);
        }
      }
    });
  });

  describe('OfflineEarningsDomain', () => {
    it('returns null when away < 2m, clock skew is negative, or no plot DPS, and caps duration at 8h', () => {
      const state = new GameState();
      const baseNow = 1_000_000_000;

      // < 2 minutes -> null
      state.lastSavedAt = baseNow - (OFFLINE_MIN_SEC - 10) * 1000;
      expect(computeOfflineEarningsDomain(state, baseNow, () => 0.5)).toBeNull();

      // future timestamp (clock skew) -> null
      state.lastSavedAt = baseNow + 60_000;
      expect(computeOfflineEarningsDomain(state, baseNow, () => 0.5)).toBeNull();

      // no miners on plots -> null
      state.plotMiners = [null, null, null, null, null];
      state.plotUnits = [null, null, null, null, null];
      state.lastSavedAt = baseNow - 3600 * 1000;
      expect(computeOfflineEarningsDomain(state, baseNow, () => 0.5)).toBeNull();

      // restore 1 miner and test 12h away -> capped at 8h
      state.miners['astral-recruit'] = 1;
      state.plotMiners[0] = 'astral-recruit';
      state.plotUnits[0] = createFreshPlotUnit('astral-recruit');
      state.lastSavedAt = baseNow - 12 * 3600 * 1000;

      const summary = computeOfflineEarningsDomain(state, baseNow, () => 0.5);
      expect(summary).not.toBeNull();
      expect(summary!.elapsedSec).toBe(OFFLINE_MAX_SEC);
      expect(summary!.capped).toBe(true);
      expect(summary!.cash).toBeGreaterThan(0);
      expect(summary!.oresBroken).toBeGreaterThan(0);
      expect(formatOfflineDuration(summary!.elapsedSec)).toBe('8h 00m');
      expect(formatOfflineDuration(135)).toBe('2m 15s');
    });

    it('claims 1x or 2x offline rewards, respects chest capacity, and persists lastSavedAt in save payload', () => {
      const state = new GameState();
      const baseNow = 2_000_000_000;
      state.lastSavedAt = baseNow - 3600 * 1000; // 1h away

      const summary = computeOfflineEarningsDomain(state, baseNow, () => 0.25);
      expect(summary).not.toBeNull();

      const startCash = state.cash;
      const startGems = state.gems;
      const startChest = state.getChestItemCount();

      const claimed = claimOfflineEarningsDomain(state, summary!, 2);
      expect(claimed.cash).toBe(summary!.cash * 2);
      expect(claimed.gems).toBe(summary!.gems * 2);
      expect(state.cash).toBe(startCash + claimed.cash);
      expect(state.gems).toBe(startGems + claimed.gems);
      expect(state.getChestItemCount()).toBe(startChest + claimed.totalOresAdded);
      expect(state.getChestItemCount()).toBeLessThanOrEqual(state.getMaxChestCapacity());

      state.lastSavedAt = baseNow;
      const raw = JSON.stringify(serializeSavePayload(state));
      const restored = new GameState();
      deserializeSaveJson(restored, raw);
      expect(restored.lastSavedAt).toBe(baseNow);

      // High-DPS unit in World 1 must respect physical rock-break rate & gem cap (never 10^21 ores)
      state.miners['prism-seraph'] = 1;
      state.plotMiners[0] = 'prism-seraph';
      state.plotUnits[0] = { ...createFreshPlotUnit('prism-seraph'), damageLevel: 60 };
      state.activeWorldId = 'underground';
      state.lastSavedAt = baseNow - 406 * 1000; // 6m 46s away
      const cappedSummary = computeOfflineEarningsDomain(state, baseNow, () => 0.5);
      expect(cappedSummary).not.toBeNull();
      expect(cappedSummary!.oresBroken).toBe(Math.floor(MAX_OFFLINE_ORES_PER_SEC * 406));
      expect(cappedSummary!.gems).toBeLessThanOrEqual(MAX_OFFLINE_GEMS);
    });
  });

  describe('BountiesDomain', () => {
    it('populates 3 unique contracts, tracks clamped progress, claims rewards with refill, and persists via save', () => {
      const state = new GameState();
      expect(state.bounties).toHaveLength(BOUNTY_SLOT_COUNT);
      expect(new Set(state.bounties.map((b) => b.kind)).size).toBe(BOUNTY_SLOT_COUNT);

      const first = state.bounties[0];
      expect(claimBountyDomain(state, first.id, () => 0.3)).toBeNull();

      const newlyReady = recordBountyProgressDomain(state, first.kind, first.target + 5);
      expect(newlyReady).toBe(1);
      expect(first.progress).toBe(first.target);
      expect(getReadyBountyCountDomain(state.bounties)).toBe(1);

      const startGems = state.gems;
      const startCash = state.cash;
      const startDice = state.enchantDice;

      const claimed = claimBountyDomain(state, first.id, () => 0.4);
      expect(claimed).not.toBeNull();
      expect(state.bountiesCompleted).toBe(1);
      if (claimed!.rewardKind === 'gems') {
        expect(state.gems).toBe(startGems + claimed!.rewardAmount);
      } else if (claimed!.rewardKind === 'dice') {
        expect(state.enchantDice).toBe(startDice + claimed!.rewardAmount);
      } else {
        expect(state.cash).toBe(startCash + claimed!.rewardAmount);
      }

      // Slot refilled with a fresh contract keeping all 3 kinds unique
      expect(state.bounties).toHaveLength(BOUNTY_SLOT_COUNT);
      expect(new Set(state.bounties.map((b) => b.kind)).size).toBe(BOUNTY_SLOT_COUNT);
      expect(state.bounties[0].id).not.toBe(first.id);

      const raw = JSON.stringify(serializeSavePayload(state));
      const restored = new GameState();
      deserializeSaveJson(restored, raw);
      expect(restored.bountiesCompleted).toBe(1);
      expect(restored.bounties).toEqual(state.bounties);
    });
  });

  describe('OverclockDomain', () => {
    it('charges, decays after idle delay, auto-activates at 100% for 15s, and boosts tap/drop multipliers', () => {
      const oc = createInitialOverclockState();
      let now = 10_000;

      // Charge 40%
      expect(chargeOverclockDomain(oc, 40, now)).toBe(false);
      expect(oc.charge).toBe(40);

      // No decay during first 5s
      stepOverclockDomain(oc, now + 4_000);
      expect(oc.charge).toBe(40);

      // Decay after 5s idle (2s past delay -> -3%)
      stepOverclockDomain(oc, now + 7_000);
      expect(oc.charge).toBeCloseTo(37, 2);

      // Push to 100% -> auto-activates
      now += 7_500;
      expect(chargeOverclockDomain(oc, 70, now)).toBe(true);
      expect(oc.activeUntil).toBe(now + OVERCLOCK_DURATION_SEC * 1000);

      // Verify GameState multipliers boost while active and return to normal after expiry
      const state = new GameState();
      const baseTap = state.getTapDamage();
      const baseDrop = state.getTotalOreDropMult();

      expect(state.chargeOverclock(100, now)).toBe(true);
      expect(state.isOverclockActive(now + 1000)).toBe(true);
      expect(state.getTapDamage(now + 1000)).toBe(baseTap * 2);
      expect(state.getTotalOreDropMult(now + 1000)).toBeCloseTo(baseDrop * 1.5, 6);

      // Expires after 15s
      state.stepOverclock(now + OVERCLOCK_DURATION_SEC * 1000 + 100);
      expect(state.isOverclockActive(now + OVERCLOCK_DURATION_SEC * 1000 + 100)).toBe(false);
      expect(state.getTapDamage(now + OVERCLOCK_DURATION_SEC * 1000 + 100)).toBe(baseTap);
    });

    it('chains Overclock Fever Tier 1 -> Tier 2 -> Tier 3 with time extension capped at 25s and scales buffs', () => {
      const oc = createInitialOverclockState();
      const t0 = 50_000;
      expect(chargeOverclockDomain(oc, 100, t0)).toBe(true);
      expect(getOverclockSnapshotDomain(oc, t0 + 1000).tier).toBe(1);

      // Extend without tier jump (e.g. Geode break +1.5s)
      const geodeExt = extendOverclockDomain(oc, 1.5, false, t0 + 2_000);
      expect(geodeExt.extended).toBe(true);
      expect(geodeExt.tierUp).toBe(false);
      expect(geodeExt.tier).toBe(1);

      // Advance to Tier 2 (SUPER FEVER)
      const t2Ext = extendOverclockDomain(oc, 4, true, t0 + 3_000);
      expect(t2Ext.tierUp).toBe(true);
      expect(t2Ext.tier).toBe(2);
      const snap2 = getOverclockSnapshotDomain(oc, t0 + 3_000);
      expect(snap2.speedMult).toBe(2.5);
      expect(snap2.tapMult).toBe(2.75);
      expect(snap2.dropMult).toBe(2.0);
      expect(snap2.critChance).toBe(0.4);

      // Advance to Tier 3 (HYPER FEVER) & verify remaining time cap (25s)
      const t3Ext = extendOverclockDomain(oc, 20, true, t0 + 3_500);
      expect(t3Ext.tierUp).toBe(true);
      expect(t3Ext.tier).toBe(3);
      const snap3 = getOverclockSnapshotDomain(oc, t0 + 3_500);
      expect(snap3.remainingSec).toBeCloseTo(OVERCLOCK_MAX_DURATION_SEC, 2);
      expect(snap3.speedMult).toBe(3.0);
      expect(snap3.tapMult).toBe(3.5);
      expect(snap3.dropMult).toBe(2.5);
      expect(snap3.critChance).toBe(0.5);

      // GameState pit event & expiry reset tier back to 1
      const state = new GameState();
      const baseTap = state.getTapDamage();
      const baseDrop = state.getTotalOreDropMult();
      expect(state.chargeOverclock(100, t0)).toBe(true);
      const pitExt = state.onPitEventBroken(t0 + 1_000);
      expect(pitExt.tierUp).toBe(true);
      expect(pitExt.tier).toBe(2);
      expect(state.getTapDamage(t0 + 1_000)).toBe(Math.round(baseTap * 2.75));
      expect(state.getTotalOreDropMult(t0 + 1_000)).toBeCloseTo(baseDrop * 2.0, 6);

      // After expiry, tier resets to 0 (inactive) and next trigger starts at Tier 1
      state.stepOverclock(t0 + 30_000);
      expect(state.getOverclockTier(t0 + 30_000)).toBe(0);
      expect(state.chargeOverclock(100, t0 + 31_000)).toBe(true);
      expect(state.getOverclockTier(t0 + 31_000)).toBe(1);
    });
  });

  describe('FusionDomain', () => {
    it('validates all 5 Fusion recipes, protects placed plot chibis, consumes bag+chest ores & gems, and grants Fusion Chibi', () => {
      expect(FUSION_RECIPES.length).toBe(5);
      for (const r of FUSION_RECIPES) {
        expect(getChibiById(r.resultChibiId)).toBeDefined();
        expect(r.requiredMiners.length).toBeGreaterThanOrEqual(2);
        for (const m of r.requiredMiners) expect(getChibiById(m.chibiId)).toBeDefined();
        for (const o of r.requiredOres) expect(getOreById(o.oreId)).toBeDefined();
      }

      const state = new GameState();
      const recipe = FUSION_RECIPES[0]; // Glitch Cheshire
      expect(state.canFuseRecipe(recipe.id)).toBe(false);

      // Give exact ingredients, but put 1 required miner on a plot -> must stay protected!
      state.gems = recipe.gemCost;
      for (const m of recipe.requiredMiners) {
        state.miners[m.chibiId] = m.count;
      }
      for (const o of recipe.requiredOres) {
        state.ores[o.oreId] = Math.floor(o.count / 2);
        state.chestOres[o.oreId] = o.count - state.ores[o.oreId];
      }
      state.plotMiners[0] = recipe.requiredMiners[0].chibiId;
      expect(state.getAvailableFusionMinerCount(recipe.requiredMiners[0].chibiId)).toBe(0);
      expect(state.canFuseRecipe(recipe.id)).toBe(false);

      // Add an extra unplaced copy -> now fuseable!
      state.miners[recipe.requiredMiners[0].chibiId] += 1;
      expect(state.canFuseRecipe(recipe.id)).toBe(true);
      expect(state.getReadyFusionCount()).toBe(1);

      const fused = state.fuseChibiRecipe(recipe.id);
      expect(fused?.resultChibiId).toBe(recipe.resultChibiId);
      expect(state.gems).toBe(0);
      expect(state.miners[recipe.resultChibiId]).toBe(1);
      expect(state.discovered.has(recipe.resultChibiId)).toBe(true);
      // Placed plot unit copy was preserved!
      expect(state.miners[recipe.requiredMiners[0].chibiId]).toBe(1);
      expect(state.plotMiners[0]).toBe(recipe.requiredMiners[0].chibiId);

      // Verify balanced Fusion upgrade cost scaling & all 4 unique Fusion Passives
      expect(getChibiUpgradeCostMult('glitch-cheshire')).toBe(85_000);
      expect(getChibiUpgradeCostMult('thorn-maiden')).toBe(1_800_000);
      expect(getChibiUpgradeCostMult('monochrome-saint')).toBe(28_000_000);
      expect(getChibiUpgradeCostMult('prism-seraph')).toBe(65_000_000);
      expect(getChibiUpgradeCostMult('aether-monarch')).toBe(55_000_000_000);

      const baseSell = state.getOreValueMult();
      const baseDrop = state.getOreOutputMult();

      // Deploy all 5 Fusion Chibis on plots 0..4 -> activate all 5 passives (strictly Team DMG / Sell Ore / Drop Ore)
      state.plotMiners[0] = 'glitch-cheshire';
      state.plotMiners[1] = 'thorn-maiden';
      state.plotMiners[2] = 'monochrome-saint';
      state.plotMiners[3] = 'prism-seraph';
      state.plotMiners[4] = 'aether-monarch';

      const passives = state.getActiveFusionPassives();
      expect(passives.oreDropPct).toBeCloseTo(1.5, 5);
      expect(passives.oreSellPct).toBeCloseTo(2.0, 5);
      expect(passives.teamDmgPct).toBeCloseTo(1.55, 5);

      expect(state.getOreValueMult()).toBeCloseTo(baseSell + 2.0, 5);
      expect(state.getOreOutputMult()).toBeCloseTo(baseDrop + 1.5, 5);
      for (const r of FUSION_RECIPES) {
        expect(['teamDmgPct', 'oreSellPct', 'oreDropPct']).toContain(r.passive.stat);
      }
    });
  });

  describe('DailyLoginDomain', () => {
    it('claims Day 1 Cosmic Monarch at 5 stars, blocks selling it, and persists across save/load', () => {
      const state = new GameState();
      const day1Now = new Date(2026, 10, 19, 10, 0, 0).getTime();

      expect(state.canClaimDailyLogin(day1Now)).toBe(true);
      const reward = state.claimDailyLogin(day1Now);
      expect(reward?.day).toBe(1);
      expect(reward?.chibiId).toBe('cosmic-monarch');

      expect(state.miners['cosmic-monarch']).toBe(1);
      expect(state.chibiStars['cosmic-monarch']).toBe(5);
      expect(state.discovered.has('cosmic-monarch')).toBe(true);
      expect(state.hotbar).toContain('cosmic-monarch');
      expect(state.getSellableMinerCount('cosmic-monarch')).toBe(0);
      expect(state.sellMiner('cosmic-monarch', true)).toBe(0);
      expect(state.canClaimDailyLogin(day1Now)).toBe(false);

      // Fusion Chibis are also non-sellable
      state.miners['glitch-cheshire'] = 1;
      expect(state.getSellableMinerCount('glitch-cheshire')).toBe(0);
      expect(state.sellMiner('glitch-cheshire', true)).toBe(0);

      const raw = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, raw);
      expect(reloaded.dailyLoginClaimedDays).toEqual([1]);
      expect(reloaded.dailyLoginLastClaimDate).toBe('2026-11-19');
      expect(reloaded.chibiStars['cosmic-monarch']).toBe(5);

      // Verify balanced Daily Login Limited Chibi upgrade cost scaling (Days 1..7)
      expect(getChibiUpgradeCostMult('cosmic-monarch')).toBe(12);
      expect(getChibiUpgradeCostMult('crimson-eye-sovereign')).toBe(450);
      expect(getChibiUpgradeCostMult('crimson-gaze-maiden')).toBe(12_000);
      expect(getChibiUpgradeCostMult('kasa-watcher')).toBe(250_000);
      expect(getChibiUpgradeCostMult('prism-fracture-eye')).toBe(3_500_000);
      expect(getChibiUpgradeCostMult('chrono-maiden')).toBe(14_000_000);
      expect(getChibiUpgradeCostMult('ink-seraph')).toBe(42_000_000);
    });
  });

  describe('Enchant Multi-Stat Buffs', () => {
    it('applies Ore Drop, Sell Value, and Mining Speed bonuses from equipped plot Enchants', () => {
      const state = new GameState();
      const baseDrop = state.getOreOutputMult();
      const baseSell = state.getOreValueMult();
      const baseUnitMining = state.getPlotUnitStats(0)!.miningMult;

      state.ownedEnchants['spellbound'] = 1;
      expect(state.togglePlotEnchant(0, 'spellbound')).toBe(true);

      expect(state.getActiveEnchantBonuses()).toEqual({ oreDropPct: 1.2, sellValuePct: 1.5 });
      expect(state.getOreOutputMult()).toBeCloseTo(baseDrop + 1.2, 5);
      expect(state.getOreValueMult()).toBeCloseTo(baseSell + 1.5, 5);
      expect(state.getPlotUnitStats(0)!.miningMult).toBeCloseTo(baseUnitMining + 0.85, 2);
    });
  });

  describe('Index Completion Rewards', () => {
    it('unlocks 50% and 100% milestones, grants Gems/Dice + permanent passives, and persists via save/load', () => {
      const state = new GameState();
      const ids = getIndexTabEntryIds('underground');
      expect(ids.length).toBeGreaterThanOrEqual(8);

      // Initially not enough discovered for 50%
      expect(state.getTabReadyIndexRewardCount('underground')).toBe(0);
      expect(state.claimIndexReward('underground:50')).toBeNull();

      // Discover half of underground entries -> 50% milestone unlocks
      const halfCount = Math.ceil(ids.length / 2);
      for (let i = 0; i < halfCount; i++) {
        state.discovered.add(ids[i]);
      }
      expect(state.getTabReadyIndexRewardCount('underground')).toBe(1);
      const gemsBefore = state.gems;
      const halfClaim = state.claimIndexReward('underground:50');
      expect(halfClaim).not.toBeNull();
      expect(halfClaim!.gemsGranted).toBe(500);
      expect(state.gems).toBe(gemsBefore + 500);
      expect(state.claimIndexReward('underground:50')).toBeNull();

      // Discover all underground entries -> 100% milestone unlocks (+1500 Gems, +1 Dice, +5% Ore Sell)
      for (const id of ids) state.discovered.add(id);
      const sellBefore = state.getOreValueMult();
      const diceBefore = state.enchantDice;
      const fullClaim = state.claimIndexReward('underground:100');
      expect(fullClaim).not.toBeNull();
      expect(fullClaim!.gemsGranted).toBe(1500);
      expect(fullClaim!.diceGranted).toBe(1);
      expect(state.enchantDice).toBe(diceBefore + 1);
      expect(state.getActiveIndexPassiveBonuses().oreSellPct).toBeCloseTo(0.05, 5);
      expect(state.getOreValueMult()).toBeCloseTo(sellBefore + 0.05, 5);

      // Verify save/load persistence
      const raw = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, raw);
      expect(reloaded.claimedIndexRewards.has('underground:50')).toBe(true);
      expect(reloaded.claimedIndexRewards.has('underground:100')).toBe(true);
      expect(reloaded.getActiveIndexPassiveBonuses().oreSellPct).toBeCloseTo(0.05, 5);
    });
  });

  describe('Critical Tap Damage', () => {
    it('rolls 2.5x critical tap damage at 15% base and 30% during Overclock Fever', () => {
      const normalHit = rollTapCriticalDamage(100, false, () => 0.2);
      expect(normalHit).toEqual({ damage: 100, isCrit: false });

      const critHit = rollTapCriticalDamage(100, false, () => 0.1);
      expect(critHit).toEqual({ damage: Math.round(100 * TAP_CRIT_MULT), isCrit: true });

      const overclockCrit = rollTapCriticalDamage(100, true, () => 0.25);
      expect(overclockCrit).toEqual({ damage: Math.round(100 * TAP_CRIT_MULT), isCrit: true });
    });
  });

  describe('Team Presets Domain', () => {
    it('saves and switches 3 team presets while preserving unit upgrades and persisting via save/load', () => {
      const state = new GameState();
      state.cash = 1_000_000;
      state.miners['astral-recruit'] = 1;
      state.miners['cosmic-monarch'] = 1;

      // Upgrade slot 0 (astral-recruit) and save as Team 1
      expect(state.upgradePlotDamage(0)).toBe(true);
      const dmgLvlBefore = state.plotUnits[0]!.damageLevel;
      expect(state.saveTeamPreset(0)).toBe(true);

      // Swap slot 0 to cosmic-monarch and save as Team 2
      state.removeMinerFromPlot(0);
      state.hotbar[1] = 'cosmic-monarch';
      expect(state.placeHotbarItemOnPlot(1, 0)).toBe('placed');
      expect(state.saveTeamPreset(1)).toBe(true);

      // Switch back to Team 1 -> astral-recruit restored with its upgraded damageLevel
      const res1 = state.applyTeamPreset(0);
      expect(res1).toEqual({ equippedCount: 1, skippedCount: 0 });
      expect(state.plotMiners[0]).toBe('astral-recruit');
      expect(state.plotUnits[0]!.damageLevel).toBe(dmgLvlBefore);

      // Switch to Team 2 -> cosmic-monarch restored
      const res2 = state.applyTeamPreset(1);
      expect(res2).toEqual({ equippedCount: 1, skippedCount: 0 });
      expect(state.plotMiners[0]).toBe('cosmic-monarch');

      // Persist presets via save/load
      const raw = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, raw);
      expect(reloaded.teamPresets[0][0]).toBe('astral-recruit');
      expect(reloaded.teamPresets[1][0]).toBe('cosmic-monarch');
    });
  });

  describe('Career Achievements & Stats', () => {
    it('tracks career stats, unlocks & claims achievement tiers, grants +1% All DMG, and persists via save/load', () => {
      const state = new GameState();
      expect(state.getReadyAchievementCount()).toBe(0);

      // Record 10 crit taps -> unlocks crit_striker:1
      for (let i = 0; i < 10; i++) {
        state.recordCritTap(250 + i * 10);
      }
      expect(state.careerStats.critTaps).toBe(10);
      expect(state.careerStats.highestCrit).toBe(340);
      expect(state.getReadyAchievementCount()).toBeGreaterThanOrEqual(1);

      const gemsBefore = state.gems;
      const tapBefore = state.getTapDamage();
      const res = state.claimAchievementTier('crit_striker:1');
      expect(res).not.toBeNull();
      expect(res!.gemsGranted).toBe(300);
      expect(state.gems).toBe(gemsBefore + 300);
      expect(state.getAchievementAllDmgBonus()).toBeCloseTo(0.01, 5);
      expect(state.getTapDamage()).toBeGreaterThanOrEqual(tapBefore);
      expect(state.claimAchievementTier('crit_striker:1')).toBeNull();

      // Persist via save/load
      const raw = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, raw);
      expect(reloaded.careerStats.critTaps).toBe(10);
      expect(reloaded.careerStats.highestCrit).toBe(340);
      expect(reloaded.claimedAchievements.has('crit_striker:1')).toBe(true);

      // World Explorer & Index Collector scale across all 8 Worlds (119 total index entries)
      reloaded.unlockedWorlds = ['underground', 'crystal', 'magma', 'ruins', 'astral', 'starwell', 'abyssal', 'chrono'];
      const explorerTier5 = reloaded.claimAchievementTier('world_explorer:5');
      expect(explorerTier5).not.toBeNull();
      expect(explorerTier5!.tier.target).toBe(8);
    });
  });

  describe('Bulk Upgrade Multiplier (x1 / x10 / MAX)', () => {
    it('computes exact multi-level plans and respects currency and maxLevel caps', () => {
      const linearCost = (lvl: number) => lvl * 100;
      expect(
        computeBulkUpgradePlan({ currentLevel: 1, maxLevel: 20, currency: 50, mode: '10', costAtLevel: linearCost })
      ).toEqual({ levels: 0, totalCost: 100, targetLevel: 1 });

      // Currency 650 buys lv1 (100) + lv2 (200) + lv3 (300) = 600
      expect(
        computeBulkUpgradePlan({ currentLevel: 1, maxLevel: 20, currency: 650, mode: '10', costAtLevel: linearCost })
      ).toEqual({ levels: 3, totalCost: 600, targetLevel: 4 });

      // Mode MAX caps at maxLevel
      expect(
        computeBulkUpgradePlan({ currentLevel: 18, maxLevel: 20, currency: 999_999, mode: 'max', costAtLevel: linearCost })
      ).toEqual({ levels: 2, totalCost: 3700, targetLevel: 20 });

      // Plot stat cost formula matches PlotUnitsDomain
      expect(getPlotStatUpgradeCost('dmg', 1, 1)).toBe(50);
      expect(getPlotStatUpgradeCost('speed', 1, 1)).toBe(75);
      expect(getPlotStatUpgradeCost('mining', 1, 1)).toBe(90);
    });
  });

  describe('Welcome-Back Return Rush (10m Boost >= 1h Offline)', () => {
    it('grants 10m Return Rush (+50% Fever Charge & +25% Speed) when returning after >= 1h offline', () => {
      const state = new GameState();
      const baseNow = 2_000_000_000;

      // Under 1h offline -> not eligible
      state.lastSavedAt = baseNow - 1800 * 1000;
      const shortSummary = computeOfflineEarningsDomain(state, baseNow, () => 0.5);
      expect(shortSummary?.returnRushEligible).toBe(false);
      if (shortSummary) {
        const shortClaim = claimOfflineEarningsDomain(state, shortSummary, 1, () => {}, baseNow);
        expect(shortClaim.returnRushActivated).toBe(false);
        expect(state.isReturnRushActive(baseNow)).toBe(false);
      }

      // >= 1h offline -> eligible and activates 10m Return Rush
      state.lastSavedAt = baseNow - RETURN_RUSH_MIN_OFFLINE_SEC * 1000;
      const longSummary = computeOfflineEarningsDomain(state, baseNow, () => 0.5);
      expect(longSummary?.returnRushEligible).toBe(true);
      const speedBefore = state.getPlotUnitStats(0, baseNow)!.miningMult;
      const longClaim = claimOfflineEarningsDomain(state, longSummary!, 1, () => {}, baseNow);
      expect(longClaim.returnRushActivated).toBe(true);
      expect(state.isReturnRushActive(baseNow)).toBe(true);
      expect(state.getReturnRushRemainingSec(baseNow)).toBe(RETURN_RUSH_DURATION_SEC);
      expect(state.activeBoosts[RETURN_RUSH_BOOST_ID]).toBe(baseNow + RETURN_RUSH_DURATION_SEC * 1000);

      // +25% Speed reflected on Plot Unit miningMult
      const speedAfter = state.getPlotUnitStats(0, baseNow)!.miningMult;
      expect(speedAfter).toBeCloseTo(speedBefore + RETURN_RUSH_SPEED_BONUS, 2);

      // +50% Fever Charge rate reflected on chargeOverclock
      state.chargeOverclock(20, baseNow);
      expect(state.overclock.charge).toBeCloseTo(20 * (1 + RETURN_RUSH_FEVER_CHARGE_BONUS), 4);
    });
  });

  describe('Spire Coin Tower Drops & Save Persistence', () => {
    it('drops 1 Spire Coin at 0.5% per broken wave ore rock, 5 Spire Coins at 5% on Boss defeat, and persists across save/load', () => {
      const state = new GameState();
      expect(TOWER_ORE_COIN_CHANCE).toBeCloseTo(0.005, 6);
      expect(TOWER_BOSS_COIN_CHANCE).toBeCloseTo(0.05, 6);
      expect(TOWER_BOSS_COIN_DROP).toBe(5);

      state.startTowerRun(1);
      expect(state.towerCoins).toBe(0);
      expect(state.towerRun?.coinsEarned).toBe(0);

      // Break rock #0 with luck (< 0.005) -> +1 Spire Coin
      const luckyOreRes = state.applyTowerTargetDamage(0, 999_999, () => 0.004);
      expect(luckyOreRes.rockBroken).toBe(true);
      expect(luckyOreRes.coinsAwarded).toBe(1);
      expect(state.towerCoins).toBe(1);
      expect(state.towerRun?.coinsEarned).toBe(1);

      // Break rock #1 without luck (>= 0.005) -> +0 Spire Coins
      const unluckyOreRes = state.applyTowerTargetDamage(1, 999_999, () => 0.006);
      expect(unluckyOreRes.rockBroken).toBe(true);
      expect(unluckyOreRes.coinsAwarded).toBe(0);
      expect(state.towerCoins).toBe(1);

      // Defeat Wave 10 Boss with luck (< 0.05) -> +5 Spire Coins
      state.towerRun!.wave = 10;
      state.towerRun!.isBossWave = true;
      state.towerRun!.bossInvulLeft = 0;
      state.towerRun!.hp = 100;
      state.towerRun!.maxHp = 100;
      const bossRes = state.applyTowerTargetDamage(null, 500, () => 0.02);
      expect(bossRes.floorCleared).toBe(true);
      expect(bossRes.coinsAwarded).toBe(5);
      expect(state.towerCoins).toBe(6);
      expect(state.towerRun?.coinsEarned).toBe(6);

      // Summary records coinsEarned and save/load restores towerCoins
      const summary = state.abandonTowerRun();
      expect(summary?.coinsEarned).toBe(6);

      const saved = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, saved);
      expect(reloaded.towerCoins).toBe(6);
      expect(reloaded.spendTowerCoins(4)).toBe(true);
      expect(reloaded.towerCoins).toBe(2);
      expect(reloaded.spendTowerCoins(10)).toBe(false);
    });

    it('purchases Yukikage, Halcyon, Nocturne, Lullaby & Clockwork Twins (TWIN tier) with Spire Coins, protects from selling, and stacks Dual Passives', () => {
      const state = new GameState();
      expect(state.buyPremiumShopItem('yukikage-twins')).toBe('no_coins');
      state.towerCoins = 425;
      const baseOreDrop = state.getOreOutputMult();

      expect(state.buyPremiumShopItem('yukikage-twins')).toBe('bought');
      expect(state.towerCoins).toBe(375);
      expect(state.miners['yukikage-twins']).toBe(1);
      expect(state.discovered.has('yukikage-twins')).toBe(true);
      expect(isNonSellableChibi('yukikage-twins')).toBe(true);
      expect(state.getSellableMinerCount('yukikage-twins')).toBe(0);

      expect(state.buyPremiumShopItem('halcyon-twins')).toBe('bought');
      expect(state.towerCoins).toBe(310);
      expect(state.miners['halcyon-twins']).toBe(1);
      expect(state.discovered.has('halcyon-twins')).toBe(true);
      expect(isNonSellableChibi('halcyon-twins')).toBe(true);
      expect(state.getSellableMinerCount('halcyon-twins')).toBe(0);

      expect(state.buyPremiumShopItem('nocturne-twins')).toBe('bought');
      expect(state.towerCoins).toBe(230);
      expect(state.miners['nocturne-twins']).toBe(1);
      expect(state.discovered.has('nocturne-twins')).toBe(true);
      expect(isNonSellableChibi('nocturne-twins')).toBe(true);
      expect(state.getSellableMinerCount('nocturne-twins')).toBe(0);

      expect(state.buyPremiumShopItem('lullaby-twins')).toBe('bought');
      expect(state.towerCoins).toBe(130);
      expect(state.miners['lullaby-twins']).toBe(1);
      expect(state.discovered.has('lullaby-twins')).toBe(true);
      expect(isNonSellableChibi('lullaby-twins')).toBe(true);
      expect(state.getSellableMinerCount('lullaby-twins')).toBe(0);

      expect(state.buyPremiumShopItem('clockwork-twins')).toBe('bought');
      expect(state.towerCoins).toBe(10);
      expect(state.miners['clockwork-twins']).toBe(1);
      expect(state.discovered.has('clockwork-twins')).toBe(true);
      expect(isNonSellableChibi('clockwork-twins')).toBe(true);
      expect(state.getSellableMinerCount('clockwork-twins')).toBe(0);

      // Equip on plots #1-#4 and verify stacked Dual Passives
      const basePlot0Dmg = state.getPlotUnitStats(0)!.dmg;
      const hbYukikage = state.hotbar.indexOf('yukikage-twins');
      const hbHalcyon = state.hotbar.indexOf('halcyon-twins');
      const hbNocturne = state.hotbar.indexOf('nocturne-twins');
      const hbLullaby = state.hotbar.indexOf('lullaby-twins');
      const hbClockwork = state.hotbar.indexOf('clockwork-twins');
      expect(hbYukikage).toBeGreaterThanOrEqual(0);
      expect(hbHalcyon).toBeGreaterThanOrEqual(0);
      expect(hbNocturne).toBeGreaterThanOrEqual(0);
      expect(hbLullaby).toBeGreaterThanOrEqual(0);
      expect(hbClockwork).toBeGreaterThanOrEqual(0);
      state.selectedHotbarSlot = hbYukikage;
      state.placeSelectedOnPlot(1);
      state.selectedHotbarSlot = hbHalcyon;
      state.placeSelectedOnPlot(2);
      state.selectedHotbarSlot = hbNocturne;
      state.placeSelectedOnPlot(3);
      state.selectedHotbarSlot = hbLullaby;
      state.placeSelectedOnPlot(4);
      const passives = state.getActivePremiumPassives();
      expect(passives.teamDmgPct).toBeCloseTo(3.6, 5);
      expect(passives.oreDropPct).toBeCloseTo(1.9, 5);
      expect(passives.oreSellPct).toBeCloseTo(1.5, 5);
      expect(state.getPlotUnitStats(0)!.dmg).toBeCloseTo(basePlot0Dmg * 4.6, -1);
      expect(state.getOreOutputMult()).toBeCloseTo(baseOreDrop + 1.9, 4);

      // Swap plot #4 to Clockwork Twins & verify +160% Team / +110% Ore Sell
      state.selectedHotbarSlot = hbClockwork;
      state.placeSelectedOnPlot(4);
      const clockworkPassives = state.getActivePremiumPassives();
      expect(clockworkPassives.teamDmgPct).toBeCloseTo(3.85, 5);
      expect(clockworkPassives.oreDropPct).toBeCloseTo(1.05, 5);
      expect(clockworkPassives.oreSellPct).toBeCloseTo(2.6, 5);
      expect(state.getPlotUnitStats(0)!.dmg).toBeCloseTo(basePlot0Dmg * 4.85, -1);

      // Verify Twin Index tab progress & 50%/100% milestones
      expect(getIndexTabEntryIds('twin')).toEqual([
        'yukikage-twins',
        'halcyon-twins',
        'nocturne-twins',
        'lullaby-twins',
        'clockwork-twins',
      ]);
      expect(state.getIndexTabProgress('twin')).toEqual({ found: 5, total: 5, pct: 100 });
      expect(state.getTabReadyIndexRewardCount('twin')).toBe(2);
      const twinHalf = state.claimIndexReward('twin:50');
      const twinFull = state.claimIndexReward('twin:100');
      expect(twinHalf?.gemsGranted).toBe(6000);
      expect(twinFull?.gemsGranted).toBe(20000);
      expect(twinFull?.milestone.passive?.label).toBe('+5% Ore Sell');
      expect(state.getActiveIndexPassiveBonuses().oreSellPct).toBeCloseTo(0.05, 5);
    });
  });

  describe('Twin Tier Auto-Scaling by Latest World & Non-Sellable Protection', () => {
    it('matches current W8 Twin baseDps and upgradeCostScale from latest world anchor', () => {
      const anchor = getLatestWorldScaleAnchor();
      expect(anchor.worldId).toBe('chrono');
      expect(anchor.secretBaseDps).toBe(4_400_000);
      expect(anchor.upgradeCostScale).toBe(20_000_000_000);

      expect(getChibiById('yukikage-twins')?.baseDps).toBe(10_000_000);
      expect(getChibiById('halcyon-twins')?.baseDps).toBe(12_000_000);
      expect(getChibiById('nocturne-twins')?.baseDps).toBe(14_000_000);
      expect(getChibiById('lullaby-twins')?.baseDps).toBe(16_000_000);
      expect(getChibiById('clockwork-twins')?.baseDps).toBe(18_000_000);

      expect(getChibiUpgradeCostMult('yukikage-twins')).toBe(220_000_000_000);
      expect(getChibiUpgradeCostMult('halcyon-twins')).toBe(280_000_000_000);
      expect(getChibiUpgradeCostMult('nocturne-twins')).toBe(350_000_000_000);
      expect(getChibiUpgradeCostMult('lullaby-twins')).toBe(420_000_000_000);
      expect(getChibiUpgradeCostMult('clockwork-twins')).toBe(500_000_000_000);
    });

    it('computes clean scaled Twin DPS and upgrade costs for boundaries and simulated W9+', () => {
      expect(computeTwinScaledBaseDps(4_400_000, 2.3)).toBe(10_000_000);
      expect(computeTwinScaledBaseDps(25_000_000, 2.3)).toBe(58_000_000);
      expect(computeTwinScaledBaseDps(25_000_000, 4.1)).toBe(100_000_000);
      expect(computeTwinScaledBaseDps(1_000, 1)).toBe(1_000);
      expect(computeTwinScaledBaseDps(0, 2.3)).toBe(1);
      expect(computeTwinScaledBaseDps(-100, 2.3)).toBe(1);

      const simW9Id = 'aetherial_w9' as unknown as (typeof WORLDS)[number]['id'];
      const simW10Id = 'celestia_w10' as unknown as (typeof WORLDS)[number]['id'];
      const simWorlds = [
        ...WORLDS,
        { id: simW9Id, name: 'W9', iconColor: '#fff', unlockCost: 1e23, oreHpMult: 1e14 },
        { id: simW10Id, name: 'W10', iconColor: '#fff', unlockCost: 1e26, oreHpMult: 1e16 },
      ];
      expect(getWorldUpgradeCostScale(simW9Id, simWorlds)).toBe(600_000_000_000);
      expect(getWorldUpgradeCostScale(simW10Id, simWorlds)).toBe(18_000_000_000_000);

      // W9 added to WORLDS without miners yet falls back to latest populated world (chrono 4.4M)
      const noMinerAnchor = getLatestWorldScaleAnchor(simWorlds, WORLD_MINERS);
      expect(noMinerAnchor.secretBaseDps).toBe(4_400_000);
      expect(noMinerAnchor.upgradeCostScale).toBe(18_000_000_000_000);

      // W9 with a 25M Secret miner scales anchor and Twin catalog while leaving Fusion untouched
      const simCatalogLookup = (id: string) =>
        id === 'w9-secret' ? { baseDps: 25_000_000 } : getChibiById(id);
      const simMiners = [
        ...WORLD_MINERS,
        { chibiId: 'w9-secret', worldId: simW9Id, chancePct: 0.01, rarity: 'secret' as const },
      ];
      const w9Anchor = getLatestWorldScaleAnchor(
        simWorlds.slice(0, WORLDS.length + 1),
        simMiners,
        simCatalogLookup
      );
      expect(w9Anchor.worldId).toBe(simW9Id);
      expect(w9Anchor.secretBaseDps).toBe(25_000_000);
      expect(w9Anchor.upgradeCostScale).toBe(600_000_000_000);
      expect(computeTwinUpgradeCostScale(w9Anchor.upgradeCostScale, PREMIUM_SHOP_ITEMS[0].upgradeCostMult)).toBe(
        6_600_000_000_000
      );

      const aetherBefore = getChibiById('aether-monarch')?.baseDps;
      try {
        syncTwinCatalogDpsFromAnchor(w9Anchor);
        expect(getChibiById('yukikage-twins')?.baseDps).toBe(58_000_000);
        expect(getChibiById('clockwork-twins')?.baseDps).toBe(100_000_000);
        expect(getChibiById('aether-monarch')?.baseDps).toBe(aetherBefore);
      } finally {
        syncTwinCatalogDpsFromAnchor();
      }
      expect(getChibiById('yukikage-twins')?.baseDps).toBe(10_000_000);
    });

    it('blocks all Twin chibis from selling even with unplaced excess duplicates or custom twin rarity entries', () => {
      const state = new GameState();
      state.cash = 0;

      for (const item of PREMIUM_SHOP_ITEMS) {
        state.miners[item.chibiId] = 5;
        expect(isNonSellableChibi(item.chibiId)).toBe(true);
        expect(state.getSellableMinerCount(item.chibiId)).toBe(0);
        expect(state.sellMiner(item.chibiId, false)).toBe(0);
        expect(state.sellMiner(item.chibiId, true)).toBe(0);
        expect(state.sellBatch([`miner:${item.chibiId}`])).toBe(0);
        expect(state.miners[item.chibiId]).toBe(5);
      }
      expect(state.cash).toBe(0);

      // Even a hypothetical rarity:'twin' entry outside PREMIUM_SHOP_ITEMS is blocked
      const mutableCatalog = CHIBI_CATALOG as unknown as Array<(typeof CHIBI_CATALOG)[number]>;
      const fakeTwin = {
        ...CHIBI_CATALOG[0],
        id: 'test-custom-twin',
        name: 'Test Custom Twin',
        rarity: 'twin' as const,
      };
      mutableCatalog.push(fakeTwin);
      try {
        expect(isNonSellableChibi('test-custom-twin')).toBe(true);
        state.miners['test-custom-twin'] = 3;
        expect(state.getSellableMinerCount('test-custom-twin')).toBe(0);
        expect(state.sellMiner('test-custom-twin', true)).toBe(0);
        expect(state.miners['test-custom-twin']).toBe(3);
      } finally {
        mutableCatalog.pop();
      }
    });
  });

  describe('OmegaBossDomain & Omega Tier', () => {
    it('runs 5-tier Boss Battle with Parry, Obsidian Pillars, OMEGA BREAK!, escalating Core drop %, 0-key-loss on retreat, Unlock & Awaken, and Save/Load', () => {
      const state = new GameState();
      expect(state.omegaKeys).toBe(OMEGA_MAX_KEYS);
      expect(OMEGA_BOSS_DEFS.map((b) => b.tiers.map((t) => t.coreDropChance))).toEqual([
        [0.2, 0.4, 0.65, 0.85, 1.0],
        [0.2, 0.4, 0.65, 0.85, 1.0],
      ]);

      // Retreat / Timeout never spends a Boss Key
      expect(state.startOmegaBoss('crimson-ronin', 1)).toBe(true);
      expect(state.omegaBattle?.tier).toBe(1);
      const retreatSummary = state.abandonOmegaBoss();
      expect(retreatSummary?.victory).toBe(false);
      expect(state.omegaKeys).toBe(OMEGA_MAX_KEYS);

      // Parry deals 8% Max HP + +25% Stagger & 4 parries trigger OMEGA BREAK! (2.5x DMG)
      expect(state.startOmegaBoss('crimson-ronin', 1)).toBe(true);
      state.omegaBattle!.parryWindow.active = true;
      const parryRes = state.triggerOmegaParry(() => 0.1);
      expect(parryRes.ok).toBe(true);
      expect(parryRes.counterDmg).toBe(Math.round(state.omegaBattle!.maxHp * 0.08));
      expect(state.omegaBattle!.staggerPct).toBe(25);

      // Fill Stagger to 100% -> triggers OMEGA BREAK!
      state.omegaBattle!.staggerPct = 85;
      state.omegaBattle!.parryWindow = { active: true, remainingSec: 2, durationSec: 2.3, consumed: false };
      const breakParry = state.triggerOmegaParry(() => 0.1);
      expect(breakParry.breakTriggered).toBe(true);
      expect(state.omegaBattle!.breakRemainingSec).toBeGreaterThan(0);

      // Victory consumes 1 key, drops Core on low roll (rng < 0.2), unlocks Tier 2
      state.omegaBattle!.hp = 10;
      const killStrike = state.applyOmegaSquadStrike(0, 1.0, () => 0.05);
      expect(killStrike.bossDefeated).toBe(true);
      expect(state.omegaKeys).toBe(OMEGA_MAX_KEYS - 1);
      expect(state.omegaBestTier['crimson-ronin']).toBe(1);
      expect(state.getOmegaUnlockedMaxTier('crimson-ronin')).toBe(2);
      expect(state.omegaCores['crimson-ronin']).toBe(1);
      expect(state.omegaLastSummary?.firstClear).toBe(true);

      // Obsidian Pillars reduce damage by 60% until shattered
      expect(state.startOmegaBoss('obsidian-sovereign', 1)).toBe(true);
      state.omegaBattle!.targets.push({
        id: 'pillar-test',
        kind: 'obsidian_pillar',
        hp: 1,
        maxHp: 1,
        xOffset: -3.2,
        zOffset: -0.2,
      });
      const armoredHit = state.applyOmegaSquadStrike(0, 1.0, () => 0.99);
      const hitTarget = state.hitOmegaTargetObject('pillar-test', () => 0.5);
      expect(hitTarget.ok).toBe(true);
      const unarmoredHit = state.applyOmegaSquadStrike(0, 1.0, () => 0.99);
      expect(unarmoredHit.dmgDealt).toBeGreaterThan(armoredHit.dmgDealt);
      state.abandonOmegaBoss();

      // 5 Cores -> Forge & Unlock Crimson Ronin -> all-3 passives active + non-sellable + Awaken 1★ -> 2★
      state.omegaCores['crimson-ronin'] = 8;
      expect(state.unlockOmegaChibi('crimson-ronin')).toBe('unlocked');
      expect(isNonSellableChibi('crimson-ronin')).toBe(true);
      expect(state.sellMiner('crimson-ronin', true)).toBe(0);
      expect(state.discovered.has('crimson-ronin')).toBe(true);

      state.plotMiners[0] = 'crimson-ronin';
      const baseOmegaPassives = state.getActiveOmegaPassives();
      expect(baseOmegaPassives.teamDmgPct).toBeCloseTo(2.0, 5);
      expect(baseOmegaPassives.oreDropPct).toBeCloseTo(1.2, 5);
      expect(baseOmegaPassives.oreSellPct).toBeCloseTo(0.8, 5);

      expect(state.awakenOmegaChibi('crimson-ronin')).toBe('awakened'); // spends 3 cores -> 2★ (+15%)
      const star2Passives = state.getActiveOmegaPassives();
      expect(star2Passives.teamDmgPct).toBeCloseTo(2.3, 5);
      expect(star2Passives.oreDropPct).toBeCloseTo(1.38, 5);
      expect(star2Passives.oreSellPct).toBeCloseTo(0.92, 5);

      // Save / Load persistence
      const json = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, json);
      expect(reloaded.omegaBestTier['crimson-ronin']).toBe(1);
      expect(reloaded.omegaCores['crimson-ronin'] ?? 0).toBe(0);
      expect(reloaded.chibiStars['crimson-ronin']).toBe(2);
    });
  });
});
