import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { RoundRepository } from "../ports/round.repository";
import { InvalidRoundStateError } from "../../domain/errors";

@Injectable()
export class VerifyRoundUseCase {
  constructor(@Inject("RoundRepository") private readonly roundRepo: RoundRepository) {}

  async execute(roundId: string): Promise<{
    serverSeed: string;
    publicSeed: string;
    nonce: number;
    hash: string;
    crashPoint: number;
  }> {
    const data = await this.roundRepo.findRoundDataForVerification(roundId);

    if (!data) {
      throw new NotFoundException(`Round ${roundId} not found`);
    }

    if (data.status !== "CRASHED") {
      throw new InvalidRoundStateError("Verification data is only available for crashed rounds");
    }

    return {
      serverSeed: data.serverSeed,
      publicSeed: data.publicSeed,
      nonce: data.nonce,
      hash: data.hash,
      crashPoint: data.crashPoint,
    };
  }
}
