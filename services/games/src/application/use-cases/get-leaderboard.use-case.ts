import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface LeaderboardEntry {
  playerId: string;
  totalBets: number;
  totalWageredCents: number;
  totalPayoutCents: number;
  netProfitCents: number;
}

@Injectable()
export class GetLeaderboardUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(period: "24h" | "7d", limit = 10): Promise<LeaderboardEntry[]> {
    const since = new Date();
    if (period === "24h") {
      since.setHours(since.getHours() - 24);
    } else {
      since.setDate(since.getDate() - 7);
    }

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        player_id: string;
        total_bets: bigint;
        total_wagered_cents: bigint;
        total_payout_cents: bigint;
        net_profit_cents: bigint;
      }>
    >(
      `
      SELECT
        player_id,
        COUNT(*)::bigint AS total_bets,
        SUM(amount_cents)::bigint AS total_wagered_cents,
        COALESCE(SUM(payout_cents), 0)::bigint AS total_payout_cents,
        (COALESCE(SUM(payout_cents), 0) - SUM(amount_cents))::bigint AS net_profit_cents
      FROM bets
      WHERE created_at >= $1
        AND status IN ('CASHED_OUT', 'LOST')
      GROUP BY player_id
      ORDER BY net_profit_cents DESC
      LIMIT $2
      `,
      since,
      limit,
    );

    return rows.map((row) => ({
      playerId: row.player_id,
      totalBets: Number(row.total_bets),
      totalWageredCents: Number(row.total_wagered_cents),
      totalPayoutCents: Number(row.total_payout_cents),
      netProfitCents: Number(row.net_profit_cents),
    }));
  }
}
