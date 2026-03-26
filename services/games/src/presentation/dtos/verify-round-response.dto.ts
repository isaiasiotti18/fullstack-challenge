import { ApiProperty } from "@nestjs/swagger";

export class VerifyRoundResponseDto {
  @ApiProperty({ description: "Server seed (revealed after crash)" })
  serverSeed: string;

  @ApiProperty({ description: "Public seed" })
  publicSeed: string;

  @ApiProperty({ description: "Nonce used for this round" })
  nonce: number;

  @ApiProperty({ description: "SHA-256 hash of server seed" })
  hash: string;

  @ApiProperty({ description: "Crash point", example: 2.34 })
  crashPoint: number;
}
