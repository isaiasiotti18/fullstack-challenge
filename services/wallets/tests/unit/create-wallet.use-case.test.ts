import { describe, test, expect, mock, beforeEach } from "bun:test";
import { CreateWalletUseCase } from "../../src/application/use-cases/create-wallet.use-case";
import { Wallet } from "../../src/domain/wallet";

describe("CreateWalletUseCase", () => {
  const mockRepo = {
    findByPlayerId: mock(() => Promise.resolve(null)),
    save: mock(() => Promise.resolve()),
    updateBalance: mock(() => Promise.resolve()),
  };

  let useCase: CreateWalletUseCase;

  beforeEach(() => {
    mockRepo.findByPlayerId.mockClear();
    mockRepo.save.mockClear();
    mockRepo.updateBalance.mockClear();

    mockRepo.findByPlayerId.mockImplementation(() => Promise.resolve(null));

    useCase = new CreateWalletUseCase(mockRepo as any);
  });

  test("creates a new wallet with welcome bonus when none exists", async () => {
    const wallet = await useCase.execute("player-1");

    expect(wallet).toBeInstanceOf(Wallet);
    expect(wallet.playerId).toBe("player-1");
    expect(wallet.balanceCents).toBe(100_000); // R$ 1.000,00 welcome bonus
  });

  test("calls repo.save for a new wallet", async () => {
    await useCase.execute("player-1");

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const savedWallet = mockRepo.save.mock.calls[0][0] as Wallet;
    expect(savedWallet).toBeInstanceOf(Wallet);
    expect(savedWallet.playerId).toBe("player-1");
    expect(savedWallet.balanceCents).toBe(100_000); // R$ 1.000,00 welcome bonus
  });

  test("returns existing wallet without calling save (idempotent)", async () => {
    const existingWallet = new Wallet({
      id: "existing-id",
      playerId: "player-1",
      balanceCents: 5000,
    });
    mockRepo.findByPlayerId.mockImplementation(() => Promise.resolve(existingWallet));

    const result = await useCase.execute("player-1");

    expect(result).toBe(existingWallet);
    expect(result.balanceCents).toBe(5000);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  test("does not call save when wallet already exists", async () => {
    const existingWallet = new Wallet({
      id: "existing-id",
      playerId: "player-2",
      balanceCents: 0,
    });
    mockRepo.findByPlayerId.mockImplementation(() => Promise.resolve(existingWallet));

    await useCase.execute("player-2");

    expect(mockRepo.save).toHaveBeenCalledTimes(0);
  });
});
