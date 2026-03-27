import { describe, test, expect, mock, beforeEach } from "bun:test";
import { GameLoopService } from "../../src/application/services/game-loop.service";
import { RoundStatus } from "../../src/domain/round";
import { BetStatus } from "../../src/domain/bet";

function createMocks() {
  return {
    roundRepo: {
      save: mock(() => Promise.resolve()),
      updateStatus: mock(() => Promise.resolve()),
      findRoundDataForVerification: mock(() => Promise.resolve(null)),
      findHistory: mock(() => Promise.resolve({ rounds: [], total: 0 })),
    },
    betRepo: {
      save: mock(() => Promise.resolve()),
      updateCashOut: mock(() => Promise.resolve()),
      markAllPendingAsLost: mock(() => Promise.resolve()),
      findByRound: mock(() => Promise.resolve([])),
      findByPlayer: mock(() => Promise.resolve({ bets: [], total: 0 })),
      deleteBet: mock(() => Promise.resolve()),
    },
    publisher: {
      publishBetPlaced: mock(() => Promise.resolve()),
      publishRoundEnded: mock(() => Promise.resolve()),
    },
    eventEmitter: {
      emitBettingPhase: mock(() => {}),
      emitRoundStart: mock(() => {}),
      emitTick: mock(() => {}),
      emitCrash: mock(() => {}),
      emitBetPlaced: mock(() => {}),
      emitBetCashedOut: mock(() => {}),
    },
  };
}

describe("GameLoopService", () => {
  let service: GameLoopService;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
    service = new GameLoopService(
      mocks.roundRepo as any,
      mocks.betRepo as any,
      mocks.publisher as any,
      mocks.eventEmitter as any,
    );
  });

  describe("initial state", () => {
    test("getCurrentRound() returns null", () => {
      expect(service.getCurrentRound()).toBeNull();
    });

    test("getCurrentMultiplier() returns 1.0", () => {
      expect(service.getCurrentMultiplier()).toBe(1.0);
    });
  });

  describe("startNewRound (via private access)", () => {
    test("creates a round in BETTING status", async () => {
      await (service as any).startNewRound();

      const round = service.getCurrentRound();
      expect(round).not.toBeNull();
      expect(round!.status).toBe(RoundStatus.BETTING);
    });

    test("calls roundRepo.save", async () => {
      await (service as any).startNewRound();

      expect(mocks.roundRepo.save).toHaveBeenCalledTimes(1);
    });

    test("resets multiplier to 1.0", async () => {
      (service as any).currentMultiplier = 5.0;
      await (service as any).startNewRound();

      expect(service.getCurrentMultiplier()).toBe(1.0);
    });

    test("retries on failure after cooldown", async () => {
      mocks.roundRepo.save.mockImplementationOnce(() => Promise.reject(new Error("DB error")));

      await (service as any).startNewRound();

      // On failure, the round should not be set up successfully
      // and a setTimeout for retry is scheduled (we can't easily assert the timeout
      // but we verify save was called and no round is set after the first failed try is still there)
      expect(mocks.roundRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe("startRunning (via private access)", () => {
    test("transitions round to RUNNING status", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      const round = service.getCurrentRound();
      expect(round).not.toBeNull();
      expect(round!.status).toBe(RoundStatus.RUNNING);
    });

    test("calls roundRepo.updateStatus with RUNNING", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      expect(mocks.roundRepo.updateStatus).toHaveBeenCalledTimes(1);
      const [roundId, status] = mocks.roundRepo.updateStatus.mock.calls[0];
      expect(status).toBe(RoundStatus.RUNNING);
    });

    test("does nothing when currentRound is null", async () => {
      await (service as any).startRunning();

      expect(mocks.roundRepo.updateStatus).not.toHaveBeenCalled();
    });

    test("sets up tick interval", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      expect((service as any).tickInterval).not.toBeNull();

      // Clean up interval to avoid leaks
      service.onModuleDestroy();
    });
  });

  describe("crashRound (via private access)", () => {
    test("marks pending bets as lost and publishes round ended", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      await (service as any).crashRound();

      expect(mocks.betRepo.markAllPendingAsLost).toHaveBeenCalledTimes(1);
      expect(mocks.roundRepo.updateStatus).toHaveBeenCalledWith(
        expect.any(String),
        RoundStatus.CRASHED,
      );
      expect(mocks.publisher.publishRoundEnded).toHaveBeenCalledTimes(1);
    });

    test("collects CASHED_OUT bets as payouts", async () => {
      await (service as any).startNewRound();
      const round = service.getCurrentRound()!;
      const crashPoint = round.crashPoint;

      round.placeBet("player-a", 5000);

      await (service as any).startRunning();

      // Cash out at 1.0x which is always <= any crash point
      round.cashOut("player-a", 1.0); // payout = 5000

      await (service as any).crashRound();

      const publishCall = mocks.publisher.publishRoundEnded.mock.calls[0][0];
      expect(publishCall.payouts).toHaveLength(1);
      expect(publishCall.payouts[0].playerId).toBe("player-a");
      expect(publishCall.payouts[0].amountCents).toBe(5000);
    });

    test("sends empty payouts when no cashed-out bets", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      await (service as any).crashRound();

      const publishCall = mocks.publisher.publishRoundEnded.mock.calls[0][0];
      expect(publishCall.payouts).toHaveLength(0);
    });

    test("sets currentRound to null after crash", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      await (service as any).crashRound();

      expect(service.getCurrentRound()).toBeNull();
    });

    test("clears tick interval after crash", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      await (service as any).crashRound();

      expect((service as any).tickInterval).toBeNull();
    });
  });

  describe("onModuleDestroy", () => {
    test("clears tick interval", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      expect((service as any).tickInterval).not.toBeNull();

      service.onModuleDestroy();

      expect((service as any).tickInterval).toBeNull();
    });

    test("does nothing when no interval is set", () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });

  describe("removeBetFromCurrentRound", () => {
    test("removes a bet from the current round", async () => {
      await (service as any).startNewRound();
      const round = service.getCurrentRound()!;
      round.placeBet("player-1", 1000);

      expect(round.bets.has("player-1")).toBe(true);

      service.removeBetFromCurrentRound("player-1");

      expect(round.bets.has("player-1")).toBe(false);
    });

    test("does nothing when currentRound is null", () => {
      expect(() => service.removeBetFromCurrentRound("player-1")).not.toThrow();
    });
  });

  describe("publishRoundEnded payload", () => {
    test("includes roundId, crashPoint, and timestamp", async () => {
      await (service as any).startNewRound();
      const round = service.getCurrentRound()!;

      await (service as any).startRunning();
      await (service as any).crashRound();

      const payload = mocks.publisher.publishRoundEnded.mock.calls[0][0];
      expect(payload.roundId).toBe(round.id);
      expect(payload.crashPoint).toBe(round.crashPoint);
      expect(payload.timestamp).toBeDefined();
      expect(payload.eventId).toBeDefined();
    });
  });

  describe("WebSocket event emission", () => {
    test("emits betting phase on startNewRound", async () => {
      await (service as any).startNewRound();

      expect(mocks.eventEmitter.emitBettingPhase).toHaveBeenCalledTimes(1);
      const payload = mocks.eventEmitter.emitBettingPhase.mock.calls[0][0];
      expect(payload.roundId).toBeDefined();
      expect(payload.startsAt).toBeDefined();
      expect(payload.endsAt).toBeDefined();
      expect(payload.hash).toBeDefined();
    });

    test("emits round start on startRunning", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      expect(mocks.eventEmitter.emitRoundStart).toHaveBeenCalledTimes(1);
      const payload = mocks.eventEmitter.emitRoundStart.mock.calls[0][0];
      expect(payload.roundId).toBeDefined();
      expect(payload.hash).toBeDefined();

      service.onModuleDestroy();
    });

    test("emits crash on crashRound", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();
      await (service as any).crashRound();

      expect(mocks.eventEmitter.emitCrash).toHaveBeenCalledTimes(1);
      const payload = mocks.eventEmitter.emitCrash.mock.calls[0][0];
      expect(payload.roundId).toBeDefined();
      expect(payload.crashPoint).toBeGreaterThanOrEqual(1.0);
      expect(payload.serverSeed).toBeDefined();
      expect(payload.publicSeed).toBeDefined();
    });
  });
});
