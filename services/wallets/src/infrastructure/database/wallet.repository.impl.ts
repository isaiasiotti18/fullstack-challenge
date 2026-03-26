import { Injectable } from "@nestjs/common";
import type { WalletRepository } from "../../application/ports/wallet.repository";
import { Wallet } from "../../domain/wallet";
import { PrismaService } from "./prisma.service";
import { WalletMapper } from "./mappers/wallet.mapper";

@Injectable()
export class WalletRepositoryImpl implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    const record = await this.prisma.wallet.findUnique({
      where: { playerId },
    });

    if (!record) {
      return null;
    }

    return WalletMapper.toDomain(record);
  }

  async save(wallet: Wallet): Promise<void> {
    await this.prisma.wallet.upsert({
      where: { id: wallet.id },
      create: {
        id: wallet.id,
        playerId: wallet.playerId,
        balanceCents: BigInt(wallet.balanceCents),
      },
      update: {
        balanceCents: BigInt(wallet.balanceCents),
      },
    });
  }

  async updateBalance(id: string, balanceCents: number): Promise<void> {
    await this.prisma.wallet.update({
      where: { id },
      data: { balanceCents: BigInt(balanceCents) },
    });
  }
}
