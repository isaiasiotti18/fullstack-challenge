import { describe, test, expect, mock, beforeEach } from "bun:test";
import { VerifyRoundUseCase } from "../../src/application/use-cases/verify-round.use-case";
import { RoundStatus } from "../../src/domain/round";
import { InvalidRoundStateError, RoundNotFoundError } from "../../src/domain/errors";

describe("VerifyRoundUseCase", () => {
  let mockRoundRepo: { findRoundDataForVerification: ReturnType<typeof mock> };
  let useCase: VerifyRoundUseCase;

  beforeEach(() => {
    mockRoundRepo = {
      findRoundDataForVerification: mock(() => Promise.resolve(null)),
    };
    useCase = new VerifyRoundUseCase(mockRoundRepo as any);
  });

  test("returns verification data for a CRASHED round", async () => {
    mockRoundRepo.findRoundDataForVerification.mockResolvedValue({
      serverSeed: "seed-123",
      publicSeed: "public-456",
      nonce: 7,
      hash: "hash-abc",
      crashPoint: 2.35,
      status: RoundStatus.CRASHED,
    });

    const result = await useCase.execute("round-1");

    expect(result.serverSeed).toBe("seed-123");
    expect(result.publicSeed).toBe("public-456");
    expect(result.nonce).toBe(7);
    expect(result.hash).toBe("hash-abc");
    expect(result.crashPoint).toBe(2.35);
  });

  test("throws RoundNotFoundError when round is not found", async () => {
    mockRoundRepo.findRoundDataForVerification.mockResolvedValue(null);

    expect(useCase.execute("nonexistent")).rejects.toThrow(RoundNotFoundError);
  });

  test("throws InvalidRoundStateError when round is BETTING", async () => {
    mockRoundRepo.findRoundDataForVerification.mockResolvedValue({
      serverSeed: "seed-123",
      publicSeed: "public-456",
      nonce: 7,
      hash: "hash-abc",
      crashPoint: 2.35,
      status: RoundStatus.BETTING,
    });

    expect(useCase.execute("round-1")).rejects.toThrow(InvalidRoundStateError);
  });

  test("throws InvalidRoundStateError when round is RUNNING", async () => {
    mockRoundRepo.findRoundDataForVerification.mockResolvedValue({
      serverSeed: "seed-123",
      publicSeed: "public-456",
      nonce: 7,
      hash: "hash-abc",
      crashPoint: 2.35,
      status: RoundStatus.RUNNING,
    });

    expect(useCase.execute("round-1")).rejects.toThrow(InvalidRoundStateError);
  });
});
