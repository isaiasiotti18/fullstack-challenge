import { Round } from "../../domain/round";

export interface RoundRepository {
  save(round: Round, serverSeed: string, publicSeed: string, nonce: number): Promise<void>;

  updateStatus(roundId: string, status: string): Promise<void>;

  findRoundDataForVerification(roundId: string): Promise<{
    serverSeed: string;
    publicSeed: string;
    nonce: number;
    hash: string;
    crashPoint: number;
    status: string;
  } | null>;

  findHistory(
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
  }>;
}
