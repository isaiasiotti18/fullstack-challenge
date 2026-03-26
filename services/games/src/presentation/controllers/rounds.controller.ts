import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GetCurrentRoundUseCase } from "../../application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "../../application/use-cases/get-round-history.use-case";
import { VerifyRoundUseCase } from "../../application/use-cases/verify-round.use-case";
import { PaginationQueryDto } from "../dtos/pagination.dto";
import { CurrentRoundResponseDto, RoundHistoryResponseDto } from "../dtos/round-response.dto";
import { VerifyRoundResponseDto } from "../dtos/verify-round-response.dto";

@ApiTags("Rounds")
@Controller("rounds")
export class RoundsController {
  constructor(
    private readonly getCurrentRound: GetCurrentRoundUseCase,
    private readonly getRoundHistory: GetRoundHistoryUseCase,
    private readonly verifyRound: VerifyRoundUseCase,
  ) {}

  @Get("current")
  @ApiOperation({ summary: "Get current round state with bets" })
  @ApiResponse({ status: 200, type: CurrentRoundResponseDto })
  async current(): Promise<CurrentRoundResponseDto | null> {
    return this.getCurrentRound.execute();
  }

  @Get("history")
  @ApiOperation({ summary: "Get paginated round history" })
  @ApiResponse({ status: 200, type: RoundHistoryResponseDto })
  async history(@Query() query: PaginationQueryDto): Promise<RoundHistoryResponseDto> {
    return this.getRoundHistory.execute(query.page!, query.limit!);
  }

  @Get(":roundId/verify")
  @ApiOperation({
    summary: "Get provably fair verification data for a round",
  })
  @ApiResponse({ status: 200, type: VerifyRoundResponseDto })
  @ApiResponse({
    status: 404,
    description: "Round not found",
  })
  @ApiResponse({
    status: 409,
    description: "Round has not crashed yet",
  })
  async verify(@Param("roundId") roundId: string): Promise<VerifyRoundResponseDto> {
    return this.verifyRound.execute(roundId);
  }
}
