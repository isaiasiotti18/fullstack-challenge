import { describe, test, expect, mock, beforeEach } from "bun:test";
import { PlaceBetUseCase } from "../../src/application/use-cases/place-bet.use-case";
import { Round } from "../../src/domain/round";
import { InvalidRoundStateError, DuplicateBetError } from "../../src/domain/errors";

describe("PlaceBetUseCase", () => {
  let mockGameLoop: { getCurrentRound: ReturnType<typeof mock> };
  let mockBetRepo: { save: ReturnType<typeof mock> };
  let mockPublisher: { publishBetPlaced: ReturnType<typeof mock> };
  let mockEventEmitter: { emitBetPlaced: ReturnType<typeof mock> };
  let useCase: PlaceBetUseCase;

  beforeEach(() => {
    mockGameLoop = {
      getCurrentRound: mock(() => null),
    };
    mockBetRepo = {
      save: mock(() => Promise.resolve()),
    };
    mockPublisher = {
      publishBetPlaced: mock(() => Promise.resolve()),
    };
    mockEventEmitter = {
      emitBetPlaced: mock(() => {}),
    };
    useCase = new PlaceBetUseCase(
      mockGameLoop as any,
      mockBetRepo as any,
      mockPublisher as any,
      mockEventEmitter as any,
    );
  });

  test("places a bet successfully during BETTING phase", async () => {
    const round = new Round({ id: "round-1", crashPoint: 2.0, serverSeedHash: "abc" });
    mockGameLoop.getCurrentRound.mockReturnValue(round);

    const result = await useCase.execute("player-1", 1000);

    expect(result.roundId).toBe("round-1");
    expect(result.playerId).toBe("player-1");
    expect(result.amountCents).toBe(1000);
    expect(result.status).toBe("PENDING");
  });

  test("throws InvalidRoundStateError when no active round", async () => {
    mockGameLoop.getCurrentRound.mockReturnValue(null);

    expect(useCase.execute("player-1", 1000)).rejects.toThrow(InvalidRoundStateError);
  });

  test("throws DuplicateBetError when player already has a bet", async () => {
    const round = new Round({ id: "round-1", crashPoint: 2.0, serverSeedHash: "abc" });
    round.placeBet("player-1", 500);
    mockGameLoop.getCurrentRound.mockReturnValue(round);

    expect(useCase.execute("player-1", 1000)).rejects.toThrow(DuplicateBetError);
  });

  test("calls betRepo.save with the bet and roundId", async () => {
    const round = new Round({ id: "round-1", crashPoint: 2.0, serverSeedHash: "abc" });
    mockGameLoop.getCurrentRound.mockReturnValue(round);

    await useCase.execute("player-1", 1000);

    expect(mockBetRepo.save).toHaveBeenCalledTimes(1);
    const [savedBet, savedRoundId] = mockBetRepo.save.mock.calls[0];
    expect(savedBet.playerId).toBe("player-1");
    expect(savedBet.amountCents).toBe(1000);
    expect(savedRoundId).toBe("round-1");
  });

  test("calls publisher.publishBetPlaced with correct message", async () => {
    const round = new Round({ id: "round-1", crashPoint: 2.0, serverSeedHash: "abc" });
    mockGameLoop.getCurrentRound.mockReturnValue(round);

    await useCase.execute("player-1", 1000);

    expect(mockPublisher.publishBetPlaced).toHaveBeenCalledTimes(1);
    const [msg] = mockPublisher.publishBetPlaced.mock.calls[0];
    expect(msg.roundId).toBe("round-1");
    expect(msg.playerId).toBe("player-1");
    expect(msg.amountCents).toBe(1000);
    expect(msg.eventId).toBeDefined();
    expect(msg.timestamp).toBeDefined();
  });
});
