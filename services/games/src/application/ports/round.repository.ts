import { Round, RoundStatus } from "../../domain/round";

export interface RoundRepository {
  save(round: Round, serverSeed: string, publicSeed: string, nonce: number): Promise<void>;

  updateStatus(roundId: string, status: RoundStatus): Promise<void>;

  findRoundDataForVerification(roundId: string): Promise<{
    serverSeed: string;
    publicSeed: string;
    nonce: number;
    hash: string;
    crashPoint: number;
    status: RoundStatus;
  } | null>;

  findHistory(
    page: number,
    limit: number,
  ): Promise<{
    rounds: Array<{
      id: string;
      status: RoundStatus;
      crashPoint: number;
      hash: string;
      createdAt: Date;
    }>;
    total: number;
  }>;
}
