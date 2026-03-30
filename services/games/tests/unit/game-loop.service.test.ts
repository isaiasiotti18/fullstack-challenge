import { describe, test, expect, mock, beforeEach } from "bun:test";
import { GameLoopService } from "../../src/application/services/game-loop.service";
import { RoundStatus } from "../../src/domain/round";

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
    clock: {
      now: mock(() => Date.now()),
      setTimeout: mock((fn: () => void, _ms: number) => globalThis.setTimeout(fn, 0)),
      setInterval: mock((fn: () => void, ms: number) => globalThis.setInterval(fn, ms)),
      clearInterval: mock((id: ReturnType<typeof setInterval>) => globalThis.clearInterval(id)),
    },
    gameEngine: {
      calculateCurrentMultiplier: mock(
        (elapsed: number) => Math.floor(Math.exp(0.06 * elapsed) * 100) / 100,
      ),
      shouldCrash: mock((mult: number, crashPt: number) => mult >= crashPt),
      processAutoCashouts: mock(() => []),
      generateRoundParams: mock(() => ({
        crashPoint: 2.5,
        hash: "abc123",
      })),
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
      mocks.clock as any,
      mocks.gameEngine as any,
      null, // metrics
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

    test("uses GameEngine.generateRoundParams for crash point", async () => {
      await (service as any).startNewRound();

      expect(mocks.gameEngine.generateRoundParams).toHaveBeenCalledTimes(1);
    });

    test("uses Clock.now for timestamps", async () => {
      await (service as any).startNewRound();

      expect(mocks.clock.now).toHaveBeenCalled();
    });

    test("resets multiplier to 1.0", async () => {
      (service as any).currentMultiplier = 5.0;
      await (service as any).startNewRound();

      expect(service.getCurrentMultiplier()).toBe(1.0);
    });

    test("retries on failure after cooldown", async () => {
      mocks.roundRepo.save.mockImplementationOnce(() => Promise.reject(new Error("DB error")));

      await (service as any).startNewRound();

      expect(mocks.roundRepo.save).toHaveBeenCalledTimes(1);
      expect(mocks.clock.setTimeout).toHaveBeenCalled();
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
      const [, status] = mocks.roundRepo.updateStatus.mock.calls[0];
      expect(status).toBe(RoundStatus.RUNNING);
    });

    test("does nothing when currentRound is null", async () => {
      await (service as any).startRunning();

      expect(mocks.roundRepo.updateStatus).not.toHaveBeenCalled();
    });

    test("sets up tick interval via Clock", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      expect(mocks.clock.setInterval).toHaveBeenCalledTimes(1);
      expect((service as any).tickInterval).not.toBeNull();

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

      round.placeBet("player-a", 5000);

      await (service as any).startRunning();

      round.cashOut("player-a", 1.0);

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

    test("clears tick interval via Clock after crash", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      await (service as any).crashRound();

      expect(mocks.clock.clearInterval).toHaveBeenCalled();
      expect((service as any).tickInterval).toBeNull();
    });
  });

  describe("processAutoCashouts", () => {
    test("delegates to GameEngine.processAutoCashouts", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      mocks.gameEngine.processAutoCashouts.mockReturnValueOnce([
        { playerId: "p1", multiplier: 2.0, payoutCents: 2000 },
      ]);

      await (service as any).processAutoCashouts();

      expect(mocks.gameEngine.processAutoCashouts).toHaveBeenCalledWith(
        service.getCurrentRound(),
        service.getCurrentMultiplier(),
      );
      expect(mocks.betRepo.updateCashOut).toHaveBeenCalledTimes(1);
      expect(mocks.eventEmitter.emitBetCashedOut).toHaveBeenCalledTimes(1);
    });
  });

  describe("onModuleDestroy", () => {
    test("clears tick interval via Clock", async () => {
      await (service as any).startNewRound();
      await (service as any).startRunning();

      expect((service as any).tickInterval).not.toBeNull();

      service.onModuleDestroy();

      expect(mocks.clock.clearInterval).toHaveBeenCalled();
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
