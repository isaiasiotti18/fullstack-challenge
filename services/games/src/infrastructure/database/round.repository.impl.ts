import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { Round } from "../../domain/round";
import type { RoundRepository } from "../../application/ports/round.repository";

@Injectable()
export class PrismaRoundRepository implements RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(round: Round, serverSeed: string, publicSeed: string, nonce: number): Promise<void> {
    await this.prisma.round.create({
      data: {
        id: round.id,
        status: round.status,
        crashPoint: round.crashPoint,
        serverSeed,
        publicSeed,
        hash: round.serverSeedHash,
        nonce,
      },
    });
  }

  async updateStatus(roundId: string, status: string): Promise<void> {
    await this.prisma.round.update({
      where: { id: roundId },
      data: { status: status as any },
    });
  }

  async findRoundDataForVerification(roundId: string): Promise<{
    serverSeed: string;
    publicSeed: string;
    nonce: number;
    hash: string;
    crashPoint: number;
    status: string;
  } | null> {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      select: {
        serverSeed: true,
        publicSeed: true,
        nonce: true,
        hash: true,
        crashPoint: true,
        status: true,
      },
    });

    if (!round) return null;

    return {
      serverSeed: round.serverSeed,
      publicSeed: round.publicSeed,
      nonce: round.nonce,
      hash: round.hash,
      crashPoint: round.crashPoint,
      status: round.status,
    };
  }

  async findHistory(
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
  }> {
    const skip = (page - 1) * limit;

    const [rounds, total] = await Promise.all([
      this.prisma.round.findMany({
        where: { status: "CRASHED" },
        select: {
          id: true,
          status: true,
          crashPoint: true,
          hash: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.round.count({ where: { status: "CRASHED" } }),
    ]);

    return { rounds, total };
  }
}
