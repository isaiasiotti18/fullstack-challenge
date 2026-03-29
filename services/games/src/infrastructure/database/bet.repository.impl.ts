import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { Bet } from "../../domain/bet";
import type { BetRepository } from "../../application/ports/bet.repository";

@Injectable()
export class PrismaBetRepository implements BetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(bet: Bet, roundId: string): Promise<void> {
    await this.prisma.bet.create({
      data: {
        roundId,
        playerId: bet.playerId,
        amountCents: BigInt(bet.amountCents),
        autoCashoutAt: bet.autoCashoutAt,
        status: bet.status,
      },
    });
  }

  async updateCashOut(
    roundId: string,
    playerId: string,
    multiplier: number,
    payoutCents: number,
  ): Promise<void> {
    await this.prisma.bet.updateMany({
      where: { roundId, playerId },
      data: {
        status: "CASHED_OUT",
        multiplierAtCashout: multiplier,
        payoutCents: BigInt(payoutCents),
      },
    });
  }

  async markAllPendingAsLost(roundId: string): Promise<void> {
    await this.prisma.bet.updateMany({
      where: { roundId, status: "PENDING" },
      data: { status: "LOST" },
    });
  }

  async findByRound(roundId: string): Promise<
    Array<{
      playerId: string;
      amountCents: number;
      status: string;
      multiplierAtCashout: number | null;
      payoutCents: number | null;
      createdAt: Date;
    }>
  > {
    const bets = await this.prisma.bet.findMany({
      where: { roundId },
      select: {
        playerId: true,
        amountCents: true,
        status: true,
        multiplierAtCashout: true,
        payoutCents: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return bets.map((b) => ({
      playerId: b.playerId,
      amountCents: Number(b.amountCents),
      status: b.status,
      multiplierAtCashout: b.multiplierAtCashout,
      payoutCents: b.payoutCents !== null ? Number(b.payoutCents) : null,
      createdAt: b.createdAt,
    }));
  }

  async findByPlayer(
    playerId: string,
    page: number,
    limit: number,
  ): Promise<{
    bets: Array<{
      id: string;
      roundId: string;
      amountCents: number;
      status: string;
      multiplierAtCashout: number | null;
      payoutCents: number | null;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const [bets, total] = await Promise.all([
      this.prisma.bet.findMany({
        where: { playerId },
        select: {
          id: true,
          roundId: true,
          amountCents: true,
          status: true,
          multiplierAtCashout: true,
          payoutCents: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.bet.count({ where: { playerId } }),
    ]);

    return {
      bets: bets.map((b) => ({
        id: b.id,
        roundId: b.roundId,
        amountCents: Number(b.amountCents),
        status: b.status,
        multiplierAtCashout: b.multiplierAtCashout,
        payoutCents: b.payoutCents !== null ? Number(b.payoutCents) : null,
        createdAt: b.createdAt,
      })),
      total,
    };
  }

  async deleteBet(roundId: string, playerId: string): Promise<void> {
    await this.prisma.bet.deleteMany({
      where: { roundId, playerId },
    });
  }
}
