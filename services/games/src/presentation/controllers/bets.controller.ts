import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../infrastructure/auth/jwt-auth.guard";
import { type AuthUser, CurrentUser } from "../../infrastructure/auth/current-user.decorator";
import { PlaceBetUseCase } from "../../application/use-cases/place-bet.use-case";
import { CashOutUseCase } from "../../application/use-cases/cash-out.use-case";
import { GetPlayerBetsUseCase } from "../../application/use-cases/get-player-bets.use-case";
import { PlaceBetDto } from "../dtos/place-bet.dto";
import { PaginationQueryDto } from "../dtos/pagination.dto";
import {
  PlaceBetResponseDto,
  CashOutResponseDto,
  PlayerBetsResponseDto,
} from "../dtos/bet-response.dto";

@ApiTags("Bets")
@Controller("bet")
export class BetController {
  constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashOutUseCase: CashOutUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Place a bet on the current round" })
  @ApiResponse({ status: 201, type: PlaceBetResponseDto })
  @ApiResponse({ status: 400, description: "Invalid bet amount" })
  @ApiResponse({ status: 409, description: "Round not in betting phase or duplicate bet" })
  async placeBet(
    @CurrentUser() user: AuthUser,
    @Body() dto: PlaceBetDto,
  ): Promise<PlaceBetResponseDto> {
    return this.placeBetUseCase.execute(
      user.userId,
      dto.amountCents,
      user.username,
      dto.autoCashoutAt,
    );
  }

  @Post("cashout")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cash out current bet at current multiplier" })
  @ApiResponse({ status: 201, type: CashOutResponseDto })
  @ApiResponse({ status: 404, description: "No bet found for player" })
  @ApiResponse({ status: 409, description: "Round not running or bet already settled" })
  async cashOut(@CurrentUser() user: AuthUser): Promise<CashOutResponseDto> {
    return this.cashOutUseCase.execute(user.userId);
  }
}

@ApiTags("Bets")
@Controller("bets")
export class BetsController {
  constructor(private readonly getPlayerBets: GetPlayerBetsUseCase) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get authenticated player bet history" })
  @ApiResponse({ status: 200, type: PlayerBetsResponseDto })
  async myBets(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PlayerBetsResponseDto> {
    return this.getPlayerBets.execute(user.userId, query.page!, query.limit!);
  }
}
