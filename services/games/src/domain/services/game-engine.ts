import { Round } from "../round";
import { calculateMultiplier } from "../multiplier";
import { calculateCrashPoint, hashServerSeed } from "../provably-fair";

export interface CashoutResult {
  playerId: string;
  multiplier: number;
  payoutCents: number;
}

export interface RoundParams {
  crashPoint: number;
  hash: string;
}

export class GameEngine {
  constructor(private readonly growthRate: number = 0.06) {}

  calculateCurrentMultiplier(elapsedSeconds: number): number {
    return calculateMultiplier(elapsedSeconds, this.growthRate);
  }

  shouldCrash(currentMultiplier: number, crashPoint: number): boolean {
    return currentMultiplier >= crashPoint;
  }

  processAutoCashouts(round: Round, currentMultiplier: number): CashoutResult[] {
    const results: CashoutResult[] = [];
    const candidates = round.getAutoCashoutCandidates(currentMultiplier);

    for (const playerId of candidates) {
      const bet = round.cashOut(playerId, currentMultiplier);

      if (bet.cashOutMultiplier != null && bet.payoutCents != null) {
        results.push({
          playerId,
          multiplier: bet.cashOutMultiplier,
          payoutCents: bet.payoutCents,
        });
      }
    }

    return results;
  }

  generateRoundParams(serverSeed: string, publicSeed: string, nonce: number): RoundParams {
    const crashPoint = calculateCrashPoint(serverSeed, publicSeed, nonce);
    const hash = hashServerSeed(serverSeed);
    return { crashPoint, hash };
  }
}
