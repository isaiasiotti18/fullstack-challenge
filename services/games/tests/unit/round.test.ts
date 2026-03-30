import { describe, it, expect } from "bun:test";
import { Round, RoundStatus } from "../../src/domain/round";
import { BetStatus } from "../../src/domain/bet";
import {
  InvalidRoundStateError,
  DuplicateBetError,
  BetNotFoundError,
  InvalidBetAmountError,
  InvalidCashOutMultiplierError,
  InvalidBetStatusError,
} from "../../src/domain/errors";
import {
  BetPlacedEvent,
  BetCashedOutEvent,
  RoundCrashedEvent,
} from "../../src/domain/domain-event";

function createRound(
  overrides?: Partial<{ id: string; crashPoint: number; serverSeedHash: string }>,
) {
  return new Round({
    id: overrides?.id ?? "round-1",
    crashPoint: overrides?.crashPoint ?? 2.5,
    serverSeedHash: overrides?.serverSeedHash ?? "abc123hash",
  });
}

describe("Round", () => {
  describe("construction", () => {
    it("creates a round in BETTING status with no bets", () => {
      const round = createRound();
      expect(round.id).toBe("round-1");
      expect(round.status).toBe(RoundStatus.BETTING);
      expect(round.crashPoint).toBe(2.5);
      expect(round.bets.size).toBe(0);
    });
  });

  describe("placeBet", () => {
    it("places a bet during BETTING phase", () => {
      const round = createRound();
      const bet = round.placeBet("player-1", 500);
      expect(bet.playerId).toBe("player-1");
      expect(bet.amountCents).toBe(500);
      expect(bet.status).toBe(BetStatus.PENDING);
      expect(round.bets.size).toBe(1);
    });

    it("allows multiple players to bet", () => {
      const round = createRound();
      round.placeBet("player-1", 500);
      round.placeBet("player-2", 1000);
      expect(round.bets.size).toBe(2);
    });

    it("throws when not in BETTING state (RUNNING)", () => {
      const round = createRound();
      round.startRunning();
      expect(() => round.placeBet("player-1", 500)).toThrow(InvalidRoundStateError);
    });

    it("throws when not in BETTING state (CRASHED)", () => {
      const round = createRound();
      round.startRunning();
      round.crash();
      expect(() => round.placeBet("player-1", 500)).toThrow(InvalidRoundStateError);
    });

    it("throws for duplicate bet by same player", () => {
      const round = createRound();
      round.placeBet("player-1", 500);
      expect(() => round.placeBet("player-1", 1000)).toThrow(DuplicateBetError);
    });

    it("throws for invalid bet amount (delegates to Bet)", () => {
      const round = createRound();
      expect(() => round.placeBet("player-1", 50)).toThrow(InvalidBetAmountError);
    });
  });

  describe("startRunning", () => {
    it("transitions from BETTING to RUNNING", () => {
      const round = createRound();
      round.startRunning();
      expect(round.status).toBe(RoundStatus.RUNNING);
    });

    it("throws when already RUNNING", () => {
      const round = createRound();
      round.startRunning();
      expect(() => round.startRunning()).toThrow(InvalidRoundStateError);
    });

    it("throws when CRASHED", () => {
      const round = createRound();
      round.startRunning();
      round.crash();
      expect(() => round.startRunning()).toThrow(InvalidRoundStateError);
    });
  });

  describe("cashOut", () => {
    it("cashes out a player with correct payout", () => {
      const round = createRound({ crashPoint: 3.0 });
      round.placeBet("player-1", 1000);
      round.startRunning();

      const bet = round.cashOut("player-1", 2.0);
      expect(bet.status).toBe(BetStatus.CASHED_OUT);
      expect(bet.cashOutMultiplier).toBe(2.0);
      expect(bet.payoutCents).toBe(2000);
    });

    it("allows cashout at exactly the crash point", () => {
      const round = createRound({ crashPoint: 2.5 });
      round.placeBet("player-1", 1000);
      round.startRunning();

      const bet = round.cashOut("player-1", 2.5);
      expect(bet.status).toBe(BetStatus.CASHED_OUT);
      expect(bet.payoutCents).toBe(2500);
    });

    it("throws when not RUNNING (BETTING)", () => {
      const round = createRound();
      round.placeBet("player-1", 500);
      expect(() => round.cashOut("player-1", 1.5)).toThrow(InvalidRoundStateError);
    });

    it("throws when not RUNNING (CRASHED)", () => {
      const round = createRound();
      round.placeBet("player-1", 500);
      round.startRunning();
      round.crash();
      expect(() => round.cashOut("player-1", 1.5)).toThrow(InvalidRoundStateError);
    });

    it("throws when player has no bet", () => {
      const round = createRound();
      round.startRunning();
      expect(() => round.cashOut("player-1", 1.5)).toThrow(BetNotFoundError);
    });

    it("throws when bet is already cashed out", () => {
      const round = createRound({ crashPoint: 3.0 });
      round.placeBet("player-1", 500);
      round.startRunning();
      round.cashOut("player-1", 1.5);
      expect(() => round.cashOut("player-1", 2.0)).toThrow(InvalidBetStatusError);
    });

    it("throws when multiplier exceeds crash point", () => {
      const round = createRound({ crashPoint: 2.0 });
      round.placeBet("player-1", 500);
      round.startRunning();
      expect(() => round.cashOut("player-1", 2.5)).toThrow(InvalidCashOutMultiplierError);
    });

    it("cashOut at exactly crashPoint should succeed", () => {
      const round = createRound({ crashPoint: 2.5 });
      round.placeBet("player-1", 1000);
      round.startRunning();

      const bet = round.cashOut("player-1", 2.5);
      expect(bet.status).toBe(BetStatus.CASHED_OUT);
      expect(bet.payoutCents).toBe(2500);
    });
  });

  describe("crash", () => {
    it("transitions from RUNNING to CRASHED", () => {
      const round = createRound();
      round.startRunning();
      round.crash();
      expect(round.status).toBe(RoundStatus.CRASHED);
    });

    it("marks all PENDING bets as LOST", () => {
      const round = createRound({ crashPoint: 2.0 });
      round.placeBet("player-1", 500);
      round.placeBet("player-2", 1000);
      round.startRunning();
      round.crash();

      const bet1 = round.bets.get("player-1")!;
      const bet2 = round.bets.get("player-2")!;
      expect(bet1.status).toBe(BetStatus.LOST);
      expect(bet2.status).toBe(BetStatus.LOST);
    });

    it("preserves CASHED_OUT bets", () => {
      const round = createRound({ crashPoint: 2.0 });
      round.placeBet("player-1", 500);
      round.placeBet("player-2", 1000);
      round.startRunning();
      round.cashOut("player-1", 1.5);
      round.crash();

      const bet1 = round.bets.get("player-1")!;
      const bet2 = round.bets.get("player-2")!;
      expect(bet1.status).toBe(BetStatus.CASHED_OUT);
      expect(bet1.payoutCents).toBe(750);
      expect(bet2.status).toBe(BetStatus.LOST);
    });

    it("throws when not RUNNING (BETTING)", () => {
      const round = createRound();
      expect(() => round.crash()).toThrow(InvalidRoundStateError);
    });

    it("throws when already CRASHED", () => {
      const round = createRound();
      round.startRunning();
      round.crash();
      expect(() => round.crash()).toThrow(InvalidRoundStateError);
    });
  });

  describe("removeBet", () => {
    it("removes a bet during BETTING phase", () => {
      const round = createRound();
      round.placeBet("player-1", 500);
      expect(round.bets.size).toBe(1);

      round.removeBet("player-1");
      expect(round.bets.size).toBe(0);
      expect(round.bets.has("player-1")).toBe(false);
    });

    it("throws InvalidRoundStateError during RUNNING", () => {
      const round = createRound();
      round.placeBet("player-1", 500);
      round.startRunning();

      expect(() => round.removeBet("player-1")).toThrow(InvalidRoundStateError);
    });

    it("throws InvalidRoundStateError during CRASHED", () => {
      const round = createRound();
      round.placeBet("player-1", 500);
      round.startRunning();
      round.crash();

      expect(() => round.removeBet("player-1")).toThrow(InvalidRoundStateError);
    });
  });

  describe("domain events", () => {
    it("emits BetPlacedEvent when bet is placed", () => {
      const round = createRound();
      round.placeBet("player-1", 500);

      const events = round.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BetPlacedEvent);

      const event = events[0] as BetPlacedEvent;
      expect(event.roundId).toBe("round-1");
      expect(event.playerId).toBe("player-1");
      expect(event.amountCents).toBe(500);
    });

    it("emits BetCashedOutEvent when player cashes out", () => {
      const round = createRound({ crashPoint: 3.0 });
      round.placeBet("player-1", 1000);
      round.pullDomainEvents(); // clear bet placed event
      round.startRunning();
      round.cashOut("player-1", 2.0);

      const events = round.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BetCashedOutEvent);

      const event = events[0] as BetCashedOutEvent;
      expect(event.roundId).toBe("round-1");
      expect(event.playerId).toBe("player-1");
      expect(event.multiplier).toBe(2.0);
      expect(event.payoutCents).toBe(2000);
    });

    it("emits RoundCrashedEvent when round crashes", () => {
      const round = createRound({ crashPoint: 2.0 });
      round.placeBet("player-1", 500);
      round.placeBet("player-2", 1000);
      round.pullDomainEvents(); // clear
      round.startRunning();
      round.crash();

      const events = round.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(RoundCrashedEvent);

      const event = events[0] as RoundCrashedEvent;
      expect(event.roundId).toBe("round-1");
      expect(event.crashPoint).toBe(2.0);
      expect(event.losersCount).toBe(2);
      expect(event.totalLostCents).toBe(1500);
    });

    it("pullDomainEvents clears events after pull", () => {
      const round = createRound();
      round.placeBet("player-1", 500);

      const first = round.pullDomainEvents();
      expect(first).toHaveLength(1);

      const second = round.pullDomainEvents();
      expect(second).toHaveLength(0);
    });
  });

  describe("payouts", () => {
    it("returns empty array when no bets", () => {
      const round = new Round({ id: "r-1", crashPoint: 2.0, serverSeedHash: "abc" });
      expect(round.payouts).toEqual([]);
    });

    it("returns empty array when all bets are PENDING", () => {
      const round = new Round({ id: "r-1", crashPoint: 5.0, serverSeedHash: "abc" });
      round.placeBet("p-1", 1000);
      round.placeBet("p-2", 2000);
      expect(round.payouts).toEqual([]);
    });

    it("returns only CASHED_OUT bets with their payouts", () => {
      const round = new Round({ id: "r-1", crashPoint: 5.0, serverSeedHash: "abc" });
      round.placeBet("p-1", 1000);
      round.placeBet("p-2", 2000);
      round.placeBet("p-3", 3000);
      round.startRunning();

      round.cashOut("p-1", 2.0); // payout = 2000
      round.cashOut("p-3", 1.5); // payout = 4500

      const payouts = round.payouts;
      expect(payouts).toHaveLength(2);
      expect(payouts).toContainEqual({ playerId: "p-1", amountCents: 2000 });
      expect(payouts).toContainEqual({ playerId: "p-3", amountCents: 4500 });
    });

    it("excludes LOST bets after crash", () => {
      const round = new Round({ id: "r-1", crashPoint: 3.0, serverSeedHash: "abc" });
      round.placeBet("p-1", 1000);
      round.placeBet("p-2", 2000);
      round.startRunning();

      round.cashOut("p-1", 2.0);
      round.crash();

      const payouts = round.payouts;
      expect(payouts).toHaveLength(1);
      expect(payouts[0]).toEqual({ playerId: "p-1", amountCents: 2000 });
    });
  });

  describe("getAutoCashoutCandidates", () => {
    it("returns players whose bets should auto cashout", () => {
      const round = new Round({ id: "r-1", crashPoint: 5.0, serverSeedHash: "abc" });
      round.placeBet("p-1", 1000, 2.0);
      round.placeBet("p-2", 2000, 3.0);
      round.placeBet("p-3", 3000); // no auto cashout
      round.startRunning();

      const candidates = round.getAutoCashoutCandidates(2.5);
      expect(candidates).toEqual(["p-1"]);
    });

    it("returns empty array when no candidates", () => {
      const round = new Round({ id: "r-1", crashPoint: 5.0, serverSeedHash: "abc" });
      round.placeBet("p-1", 1000, 3.0);
      round.startRunning();

      const candidates = round.getAutoCashoutCandidates(2.0);
      expect(candidates).toEqual([]);
    });

    it("returns multiple candidates at same multiplier", () => {
      const round = new Round({ id: "r-1", crashPoint: 5.0, serverSeedHash: "abc" });
      round.placeBet("p-1", 1000, 2.0);
      round.placeBet("p-2", 2000, 2.0);
      round.startRunning();

      const candidates = round.getAutoCashoutCandidates(2.0);
      expect(candidates).toHaveLength(2);
      expect(candidates).toContain("p-1");
      expect(candidates).toContain("p-2");
    });

    it("excludes already cashed out bets", () => {
      const round = new Round({ id: "r-1", crashPoint: 5.0, serverSeedHash: "abc" });
      round.placeBet("p-1", 1000, 2.0);
      round.startRunning();
      round.cashOut("p-1", 1.5);

      const candidates = round.getAutoCashoutCandidates(2.5);
      expect(candidates).toEqual([]);
    });
  });
});
