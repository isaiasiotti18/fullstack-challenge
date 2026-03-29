import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GetLeaderboardUseCase } from "../../application/use-cases/get-leaderboard.use-case";

@ApiTags("Leaderboard")
@Controller("leaderboard")
export class LeaderboardController {
  constructor(private readonly getLeaderboard: GetLeaderboardUseCase) {}

  @Get()
  @ApiOperation({ summary: "Get top players by net profit" })
  @ApiQuery({ name: "period", enum: ["24h", "7d"], required: false })
  @ApiResponse({ status: 200, description: "Leaderboard entries" })
  async leaderboard(@Query("period") period?: string) {
    const validPeriod = period === "7d" ? "7d" : "24h";
    return this.getLeaderboard.execute(validPeriod);
  }
}
