import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../infrastructure/auth/jwt-auth.guard";
import { type AuthUser, CurrentUser } from "../../infrastructure/auth/current-user.decorator";
import { CreateWalletUseCase } from "../../application/use-cases/create-wallet.use-case";
import { GetWalletUseCase } from "../../application/use-cases/get-wallet.use-case";
import { WalletResponseDto } from "../dtos/wallet-response.dto";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";

@ApiTags("wallets")
@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  @Get("health")
  @ApiOperation({ summary: "Health check" })
  @ApiResponse({ status: 200, type: HealthCheckResponseDto })
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create wallet for the authenticated player" })
  @ApiResponse({ status: 201, type: WalletResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createWallet(@CurrentUser() user: AuthUser): Promise<WalletResponseDto> {
    const wallet = await this.createWalletUseCase.execute(user.userId);
    return WalletResponseDto.from(wallet);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get wallet for the authenticated player" })
  @ApiResponse({ status: 200, type: WalletResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Wallet not found" })
  async getWallet(@CurrentUser() user: AuthUser): Promise<WalletResponseDto> {
    const wallet = await this.getWalletUseCase.execute(user.userId);
    return WalletResponseDto.from(wallet);
  }
}
