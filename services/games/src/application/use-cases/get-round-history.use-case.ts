import { Inject, Injectable } from "@nestjs/common";
import type { RoundRepository } from "../ports/round.repository";

@Injectable()
export class GetRoundHistoryUseCase {
  constructor(@Inject("RoundRepository") private readonly roundRepo: RoundRepository) {}

  async execute(
    page: number,
    limit: number,
  ): Promise<{
    rounds: Array<{
      id: string;
      status: string;
      crashPoint: number;
      hash: string;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const { rounds, total } = await this.roundRepo.findHistory(page, limit);

    return { rounds, total, page, limit };
  }
}
