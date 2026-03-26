import { describe, it, expect } from "bun:test";
import { Wallet } from "../../src/domain/wallet";
import { InsufficientBalanceError, InvalidAmountError } from "../../src/domain/errors";

describe("Wallet", () => {
  describe("construction", () => {
    it("creates a wallet with 0 balance by default", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1" });
      expect(wallet.id).toBe("w-1");
      expect(wallet.playerId).toBe("player-1");
      expect(wallet.balanceCents).toBe(0);
    });

    it("creates a wallet with initial balance", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1", balanceCents: 5000 });
      expect(wallet.balanceCents).toBe(5000);
    });

    it("throws for negative initial balance", () => {
      expect(() => new Wallet({ id: "w-1", playerId: "player-1", balanceCents: -100 })).toThrow(
        InvalidAmountError,
      );
    });

    it("throws for non-integer initial balance", () => {
      expect(() => new Wallet({ id: "w-1", playerId: "player-1", balanceCents: 100.5 })).toThrow(
        InvalidAmountError,
      );
    });
  });

  describe("credit", () => {
    it("increases balance correctly", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1" });
      wallet.credit(1000);
      expect(wallet.balanceCents).toBe(1000);
    });

    it("accumulates multiple credits", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1" });
      wallet.credit(1000);
      wallet.credit(2000);
      wallet.credit(500);
      expect(wallet.balanceCents).toBe(3500);
    });

    it("throws for zero amount", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1" });
      expect(() => wallet.credit(0)).toThrow(InvalidAmountError);
    });

    it("throws for negative amount", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1" });
      expect(() => wallet.credit(-100)).toThrow(InvalidAmountError);
    });

    it("throws for non-integer amount", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1" });
      expect(() => wallet.credit(10.5)).toThrow(InvalidAmountError);
    });
  });

  describe("debit", () => {
    it("decreases balance correctly", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1", balanceCents: 5000 });
      wallet.debit(2000);
      expect(wallet.balanceCents).toBe(3000);
    });

    it("allows debit of exact balance (balance becomes 0)", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1", balanceCents: 1000 });
      wallet.debit(1000);
      expect(wallet.balanceCents).toBe(0);
    });

    it("throws for insufficient balance", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1", balanceCents: 500 });
      expect(() => wallet.debit(1000)).toThrow(InsufficientBalanceError);
    });

    it("throws for debit on zero balance", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1" });
      expect(() => wallet.debit(1)).toThrow(InsufficientBalanceError);
    });

    it("throws for zero amount", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1", balanceCents: 1000 });
      expect(() => wallet.debit(0)).toThrow(InvalidAmountError);
    });

    it("throws for negative amount", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1", balanceCents: 1000 });
      expect(() => wallet.debit(-100)).toThrow(InvalidAmountError);
    });

    it("throws for non-integer amount", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1", balanceCents: 1000 });
      expect(() => wallet.debit(10.5)).toThrow(InvalidAmountError);
    });
  });

  describe("credit + debit sequences", () => {
    it("tracks balance through multiple operations", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1" });
      wallet.credit(5000);
      wallet.debit(2000);
      wallet.credit(1000);
      wallet.debit(3000);
      expect(wallet.balanceCents).toBe(1000);
    });

    it("handles large values without precision loss", () => {
      const wallet = new Wallet({ id: "w-1", playerId: "player-1" });
      const largeAmount = 1_000_000_000_00; // 10 billion cents = 100M dollars
      wallet.credit(largeAmount);
      wallet.debit(1);
      expect(wallet.balanceCents).toBe(largeAmount - 1);
    });
  });
});
