import { describe, test, expect, mock, beforeEach } from "bun:test";
import { NotFoundException } from "@nestjs/common";
import { GetWalletUseCase } from "../../src/application/use-cases/get-wallet.use-case";
import { Wallet } from "../../src/domain/wallet";

describe("GetWalletUseCase", () => {
  const mockRepo = {
    findByPlayerId: mock(() => Promise.resolve(null)),
    save: mock(() => Promise.resolve()),
    updateBalance: mock(() => Promise.resolve()),
  };

  let useCase: GetWalletUseCase;

  beforeEach(() => {
    mockRepo.findByPlayerId.mockClear();
    mockRepo.findByPlayerId.mockImplementation(() => Promise.resolve(null));

    useCase = new GetWalletUseCase(mockRepo as any);
  });

  test("returns the wallet when it exists", async () => {
    const wallet = new Wallet({
      id: "wallet-1",
      playerId: "player-1",
      balanceCents: 10000,
    });
    mockRepo.findByPlayerId.mockImplementation(() => Promise.resolve(wallet));

    const result = await useCase.execute("player-1");

    expect(result).toBe(wallet);
    expect(result.playerId).toBe("player-1");
    expect(result.balanceCents).toBe(10000);
    expect(mockRepo.findByPlayerId).toHaveBeenCalledWith("player-1");
  });

  test("throws NotFoundException when wallet does not exist", async () => {
    mockRepo.findByPlayerId.mockImplementation(() => Promise.resolve(null));

    expect(useCase.execute("unknown-player")).rejects.toThrow(NotFoundException);
  });

  test("error message includes the player id", async () => {
    mockRepo.findByPlayerId.mockImplementation(() => Promise.resolve(null));

    expect(useCase.execute("player-xyz")).rejects.toThrow("Wallet not found for player player-xyz");
  });
});
