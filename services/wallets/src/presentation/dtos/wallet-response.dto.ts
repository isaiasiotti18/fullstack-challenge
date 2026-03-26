import { ApiProperty } from "@nestjs/swagger";
import { Wallet } from "../../domain/wallet";

export class WalletResponseDto {
  @ApiProperty({ description: "Wallet unique identifier" })
  id: string;

  @ApiProperty({ description: "Player unique identifier" })
  playerId: string;

  @ApiProperty({ description: "Wallet balance in cents", example: 10000 })
  balanceCents: number;

  static from(wallet: Wallet): WalletResponseDto {
    const dto = new WalletResponseDto();
    dto.id = wallet.id;
    dto.playerId = wallet.playerId;
    dto.balanceCents = wallet.balanceCents;
    return dto;
  }
}
