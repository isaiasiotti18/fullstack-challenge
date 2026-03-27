import { describe, test, expect, mock, beforeEach } from "bun:test";
import { CashOutUseCase } from "../../src/application/use-cases/cash-out.use-case";
import { Round } from "../../src/domain/round";
import { InvalidRoundStateError, BetNotFoundError } from "../../src/domain/errors";

describe("CashOutUseCase", () => {
  let mockGameLoop: {
    getCurrentRound: ReturnType<typeof mock>;
    getCurrentMultiplier: ReturnType<typeof mock>;
  };
  let mockBetRepo: { updateCashOut: ReturnType<typeof mock> };
  let mockEventEmitter: { emitBetCashedOut: ReturnType<typeof mock> };
  let useCase: CashOutUseCase;

  beforeEach(() => {
    mockGameLoop = {
      getCurrentRound: mock(() => null),
      getCurrentMultiplier: mock(() => 1.0),
    };
    mockBetRepo = {
      updateCashOut: mock(() => Promise.resolve()),
    };
    mockEventEmitter = {
      emitBetCashedOut: mock(() => {}),
    };
    useCase = new CashOutUseCase(mockGameLoop as any, mockBetRepo as any, mockEventEmitter as any);
  });

  test("cashes out successfully during RUNNING phase", async () => {
    const round = new Round({ id: "round-1", crashPoint: 5.0, serverSeedHash: "abc" });
    round.placeBet("player-1", 1000);
    round.startRunning();
    mockGameLoop.getCurrentRound.mockReturnValue(round);
    mockGameLoop.getCurrentMultiplier.mockReturnValue(1.5);

    const result = await useCase.execute("player-1");

    expect(result.roundId).toBe("round-1");
    expect(result.playerId).toBe("player-1");
    expect(result.amountCents).toBe(1000);
    expect(result.status).toBe("CASHED_OUT");
    expect(result.multiplierAtCashout).toBe(1.5);
    expect(result.payoutCents).toBe(1500);
  });

  test("throws InvalidRoundStateError when no active round", async () => {
    mockGameLoop.getCurrentRound.mockReturnValue(null);

    expect(useCase.execute("player-1")).rejects.toThrow(InvalidRoundStateError);
  });

  test("throws InvalidRoundStateError when round is still BETTING", async () => {
    const round = new Round({ id: "round-1", crashPoint: 5.0, serverSeedHash: "abc" });
    round.placeBet("player-1", 1000);
    mockGameLoop.getCurrentRound.mockReturnValue(round);
    mockGameLoop.getCurrentMultiplier.mockReturnValue(1.5);

    expect(useCase.execute("player-1")).rejects.toThrow(InvalidRoundStateError);
  });

  test("throws BetNotFoundError when player has no bet", async () => {
    const round = new Round({ id: "round-1", crashPoint: 5.0, serverSeedHash: "abc" });
    round.startRunning();
    mockGameLoop.getCurrentRound.mockReturnValue(round);
    mockGameLoop.getCurrentMultiplier.mockReturnValue(1.5);

    expect(useCase.execute("player-1")).rejects.toThrow(BetNotFoundError);
  });

  test("calls betRepo.updateCashOut with correct arguments", async () => {
    const round = new Round({ id: "round-1", crashPoint: 5.0, serverSeedHash: "abc" });
    round.placeBet("player-1", 1000);
    round.startRunning();
    mockGameLoop.getCurrentRound.mockReturnValue(round);
    mockGameLoop.getCurrentMultiplier.mockReturnValue(2.0);

    await useCase.execute("player-1");

    expect(mockBetRepo.updateCashOut).toHaveBeenCalledTimes(1);
    expect(mockBetRepo.updateCashOut).toHaveBeenCalledWith("round-1", "player-1", 2.0, 2000);
  });
});
