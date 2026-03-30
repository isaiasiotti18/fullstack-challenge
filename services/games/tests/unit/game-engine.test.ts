import { describe, test, expect } from "bun:test";
import { GameEngine } from "../../src/domain/services/game-engine";
import { Round } from "../../src/domain/round";

describe("GameEngine", () => {
  const engine = new GameEngine(0.06);

  describe("calculateCurrentMultiplier", () => {
    test("returns 1.00 at time 0", () => {
      expect(engine.calculateCurrentMultiplier(0)).toBe(1.0);
    });

    test("returns increasing values over time", () => {
      const m1 = engine.calculateCurrentMultiplier(5);
      const m2 = engine.calculateCurrentMultiplier(10);
      expect(m2).toBeGreaterThan(m1);
      expect(m1).toBeGreaterThan(1.0);
    });

    test("follows exponential curve floor(e^(0.06t) * 100) / 100", () => {
      const t = 10;
      const expected = Math.floor(Math.exp(0.06 * t) * 100) / 100;
      expect(engine.calculateCurrentMultiplier(t)).toBe(expected);
    });
  });

  describe("shouldCrash", () => {
    test("returns true when multiplier >= crashPoint", () => {
      expect(engine.shouldCrash(2.5, 2.5)).toBe(true);
      expect(engine.shouldCrash(3.0, 2.5)).toBe(true);
    });

    test("returns false when multiplier < crashPoint", () => {
      expect(engine.shouldCrash(2.0, 2.5)).toBe(false);
    });
  });

  describe("processAutoCashouts", () => {
    test("cashes out bets that reach their target", () => {
      const round = new Round({ id: "r1", crashPoint: 5.0, serverSeedHash: "hash" });
      round.placeBet("p1", 1000, 2.0);
      round.placeBet("p2", 2000, 3.0);
      round.placeBet("p3", 3000); // no auto cashout
      round.startRunning();

      const results = engine.processAutoCashouts(round, 2.5);

      expect(results).toHaveLength(1);
      expect(results[0].playerId).toBe("p1");
      expect(results[0].multiplier).toBe(2.5);
      expect(results[0].payoutCents).toBe(Math.floor(1000 * 2.5));
    });

    test("returns empty array when no candidates", () => {
      const round = new Round({ id: "r2", crashPoint: 5.0, serverSeedHash: "hash" });
      round.placeBet("p1", 1000, 3.0);
      round.startRunning();

      const results = engine.processAutoCashouts(round, 1.5);

      expect(results).toHaveLength(0);
    });

    test("cashes out multiple bets at once", () => {
      const round = new Round({ id: "r3", crashPoint: 5.0, serverSeedHash: "hash" });
      round.placeBet("p1", 1000, 2.0);
      round.placeBet("p2", 2000, 2.0);
      round.startRunning();

      const results = engine.processAutoCashouts(round, 2.5);

      expect(results).toHaveLength(2);
    });
  });

  describe("generateRoundParams", () => {
    test("returns deterministic crashPoint and hash", () => {
      const params1 = engine.generateRoundParams("seed1", "pub1", 1);
      const params2 = engine.generateRoundParams("seed1", "pub1", 1);

      expect(params1.crashPoint).toBe(params2.crashPoint);
      expect(params1.hash).toBe(params2.hash);
      expect(params1.crashPoint).toBeGreaterThanOrEqual(1.0);
      expect(params1.hash).toBeTruthy();
    });

    test("different seeds produce different results", () => {
      const params1 = engine.generateRoundParams("seed1", "pub1", 1);
      const params2 = engine.generateRoundParams("seed2", "pub1", 1);

      expect(params1.hash).not.toBe(params2.hash);
    });
  });
});
