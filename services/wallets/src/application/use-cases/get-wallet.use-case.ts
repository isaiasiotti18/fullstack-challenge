import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { WalletRepository } from "../ports/wallet.repository";
import { Wallet } from "../../domain/wallet";

@Injectable()
export class GetWalletUseCase {
  constructor(
    @Inject("WalletRepository")
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(playerId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findByPlayerId(playerId);

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for player ${playerId}`);
    }

    return wallet;
  }
}
