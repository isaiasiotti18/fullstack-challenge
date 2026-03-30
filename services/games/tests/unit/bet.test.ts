import { describe, it, expect } from "bun:test";
import { Bet, BetStatus } from "../../src/domain/bet";
import { InvalidBetAmountError, InvalidBetStatusError } from "../../src/domain/errors";

describe("Bet", () => {
  describe("construction", () => {
    it("creates a bet with valid amount and PENDING status", () => {
      const bet = new Bet("player-1", 500);
      expect(bet.playerId).toBe("player-1");
      expect(bet.amountCents).toBe(500);
      expect(bet.status).toBe(BetStatus.PENDING);
      expect(bet.cashOutMultiplier).toBeNull();
      expect(bet.payoutCents).toBeNull();
    });

    it("creates a bet at minimum amount (100 cents)", () => {
      const bet = new Bet("player-1", 100);
      expect(bet.amountCents).toBe(100);
    });

    it("creates a bet at maximum amount (100000 cents)", () => {
      const bet = new Bet("player-1", 100_000);
      expect(bet.amountCents).toBe(100_000);
    });

    it("throws for amount below minimum", () => {
      expect(() => new Bet("player-1", 99)).toThrow(InvalidBetAmountError);
    });

    it("throws for amount above maximum", () => {
      expect(() => new Bet("player-1", 100_001)).toThrow(InvalidBetAmountError);
    });

    it("throws for non-integer amount", () => {
      expect(() => new Bet("player-1", 150.5)).toThrow(InvalidBetAmountError);
    });

    it("throws for zero amount", () => {
      expect(() => new Bet("player-1", 0)).toThrow(InvalidBetAmountError);
    });

    it("throws for negative amount", () => {
      expect(() => new Bet("player-1", -100)).toThrow(InvalidBetAmountError);
    });
  });

  describe("cashOut", () => {
    it("calculates payout correctly", () => {
      const bet = new Bet("player-1", 500);
      bet.cashOut(2.5);
      expect(bet.status).toBe(BetStatus.CASHED_OUT);
      expect(bet.cashOutMultiplier).toBe(2.5);
      expect(bet.payoutCents).toBe(1250);
    });

    it("uses Math.floor for payout (no rounding up)", () => {
      const bet = new Bet("player-1", 333);
      bet.cashOut(1.51);
      // 333 * 1.51 = 502.83 → floor = 502
      expect(bet.payoutCents).toBe(502);
    });

    it("returns bet amount at 1.00x multiplier", () => {
      const bet = new Bet("player-1", 1000);
      bet.cashOut(1.0);
      expect(bet.payoutCents).toBe(1000);
    });

    it("throws when cashing out a non-PENDING bet", () => {
      const bet = new Bet("player-1", 500);
      bet.cashOut(2.0);
      expect(() => bet.cashOut(3.0)).toThrow(InvalidBetStatusError);
    });

    it("throws when cashing out a LOST bet", () => {
      const bet = new Bet("player-1", 500);
      bet.markAsLost();
      expect(() => bet.cashOut(2.0)).toThrow(InvalidBetStatusError);
    });

    it("throws for multiplier below 1.0", () => {
      const bet = new Bet("player-1", 500);
      expect(() => bet.cashOut(0.5)).toThrow(InvalidBetStatusError);
    });

    it("cashOut at 1.001x floors correctly due to float precision", () => {
      const bet = new Bet("player-1", 10000);
      bet.cashOut(1.001);
      // 10000 * 1.001 = 10009.999... in IEEE 754, Math.floor gives 10009
      expect(bet.payoutCents).toBe(Math.floor(10000 * 1.001));
    });

    it("cashOut at 1.999x should floor payout correctly", () => {
      const bet = new Bet("player-1", 333);
      bet.cashOut(1.999);
      expect(bet.payoutCents).toBe(665); // Math.floor(333 * 1.999) = Math.floor(665.667)
    });
  });

  describe("shouldAutoCashout", () => {
    it("returns true when PENDING and multiplier >= autoCashoutAt", () => {
      const bet = new Bet("player-1", 1000, 2.0);
      expect(bet.shouldAutoCashout(2.0)).toBe(true);
      expect(bet.shouldAutoCashout(2.5)).toBe(true);
    });

    it("returns false when multiplier < autoCashoutAt", () => {
      const bet = new Bet("player-1", 1000, 2.0);
      expect(bet.shouldAutoCashout(1.5)).toBe(false);
    });

    it("returns false when no autoCashoutAt set", () => {
      const bet = new Bet("player-1", 1000);
      expect(bet.shouldAutoCashout(5.0)).toBe(false);
    });

    it("returns false when bet is already CASHED_OUT", () => {
      const bet = new Bet("player-1", 1000, 2.0);
      bet.cashOut(1.5);
      expect(bet.shouldAutoCashout(2.5)).toBe(false);
    });

    it("returns false when bet is LOST", () => {
      const bet = new Bet("player-1", 1000, 2.0);
      bet.markAsLost();
      expect(bet.shouldAutoCashout(2.5)).toBe(false);
    });
  });

  describe("markAsLost", () => {
    it("transitions PENDING to LOST", () => {
      const bet = new Bet("player-1", 500);
      bet.markAsLost();
      expect(bet.status).toBe(BetStatus.LOST);
      expect(bet.payoutCents).toBeNull();
    });

    it("throws when marking CASHED_OUT as lost", () => {
      const bet = new Bet("player-1", 500);
      bet.cashOut(2.0);
      expect(() => bet.markAsLost()).toThrow(InvalidBetStatusError);
    });

    it("throws when marking already LOST as lost", () => {
      const bet = new Bet("player-1", 500);
      bet.markAsLost();
      expect(() => bet.markAsLost()).toThrow(InvalidBetStatusError);
    });
  });
});
