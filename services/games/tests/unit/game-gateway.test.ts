import { describe, test, expect, mock, beforeEach } from "bun:test";
import { GameGateway } from "../../src/presentation/gateways/game.gateway";

describe("GameGateway", () => {
  let gateway: GameGateway;
  let mockServer: { emit: ReturnType<typeof mock> };

  beforeEach(() => {
    gateway = new GameGateway();
    mockServer = { emit: mock(() => true) };
    (gateway as any).server = mockServer;
  });

  test("emitBettingPhase emits round:betting event", () => {
    const data = {
      roundId: "r-1",
      startsAt: "2026-01-01T00:00:00Z",
      endsAt: "2026-01-01T00:00:10Z",
      hash: "abc123",
    };

    gateway.emitBettingPhase(data);

    expect(mockServer.emit).toHaveBeenCalledWith("round:betting", data);
  });

  test("emitRoundStart emits round:start event", () => {
    const data = { roundId: "r-1", hash: "abc123" };

    gateway.emitRoundStart(data);

    expect(mockServer.emit).toHaveBeenCalledWith("round:start", data);
  });

  test("emitTick emits round:tick event", () => {
    const data = { multiplier: 2.34 };

    gateway.emitTick(data);

    expect(mockServer.emit).toHaveBeenCalledWith("round:tick", data);
  });

  test("emitCrash emits round:crash event", () => {
    const data = {
      roundId: "r-1",
      crashPoint: 3.5,
      serverSeed: "seed",
      publicSeed: "pub",
    };

    gateway.emitCrash(data);

    expect(mockServer.emit).toHaveBeenCalledWith("round:crash", data);
  });

  test("emitBetPlaced emits bet:placed event", () => {
    const data = { playerId: "p-1", amountCents: 1000 };

    gateway.emitBetPlaced(data);

    expect(mockServer.emit).toHaveBeenCalledWith("bet:placed", data);
  });

  test("emitBetCashedOut emits bet:cashedOut event", () => {
    const data = { playerId: "p-1", multiplier: 2.0, payoutCents: 2000 };

    gateway.emitBetCashedOut(data);

    expect(mockServer.emit).toHaveBeenCalledWith("bet:cashedOut", data);
  });
});
