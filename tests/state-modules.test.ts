import { describe, expect, it } from 'vitest';
import { getOreById, ORES } from '../src/game/GameData';
import { FUSION_RECIPES } from '../src/game/FusionData';
import { getChibiById } from '../src/game3d/ChibiCatalog';
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
  OVERCLOCK_DURATION_SEC,
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
import { TOWER_BOSS_INVUL_SEC, TOWER_KEY_REGEN_MS, TOWER_MAX_KEYS } from '../src/game/TowerData';
import {
  applyTowerTargetDamageDomain,
  getTowerEffectiveDpsDomain,
  quickSweepTowerDomain,
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
        'astral',
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

      const weatherRelic = RELICS.find((r) => (r.effects.weatherBuffPct ?? 0) > 0);
      expect(weatherRelic).toBeDefined();
      if (weatherRelic) {
        state.equippedRelics = [weatherRelic.id];
        const buff = weatherRelic.effects.weatherBuffPct ?? 0;
        expect(scaleWeatherMultDomain(state, 1.5)).toBeCloseTo(1 + 0.5 * (1 + buff), 6);
        expect(getWeatherDamageMultDomain(state)).toBeGreaterThanOrEqual(1);
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
  });

  describe('FusionDomain', () => {
    it('validates all 4 Fusion recipes, protects placed plot chibis, consumes bag+chest ores & gems, and grants Fusion Chibi', () => {
      expect(FUSION_RECIPES.length).toBe(4);
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

      const baseTap = state.getTapDamage();
      const baseSell = state.getOreValueMult();
      const baseDrop = state.getOreOutputMult();

      // Deploy all 4 Fusion Chibis on plots 0..3 -> activate all 4 passives
      state.plotMiners[0] = 'glitch-cheshire';
      state.plotMiners[1] = 'thorn-maiden';
      state.plotMiners[2] = 'monochrome-saint';
      state.plotMiners[3] = 'prism-seraph';

      const passives = state.getActiveFusionPassives();
      expect(passives.tapDmgPct).toBeCloseTo(1.5, 5);
      expect(passives.oreDropPct).toBeCloseTo(1.5, 5);
      expect(passives.oreSellPct).toBeCloseTo(2.0, 5);
      expect(passives.teamDmgPct).toBeCloseTo(0.5, 5);

      expect(state.getTapDamage()).toBe(Math.round(baseTap * 2.5));
      expect(state.getOreValueMult()).toBeCloseTo(baseSell + 2.0, 5);
      expect(state.getOreOutputMult()).toBeCloseTo(baseDrop + 1.5, 5);
    });
  });
});
