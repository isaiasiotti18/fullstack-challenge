import { Inject, Injectable } from "@nestjs/common";
import type { WalletRepository } from "../ports/wallet.repository";
import { Wallet } from "../../domain/wallet";
import { randomUUID } from "crypto";

@Injectable()
export class CreateWalletUseCase {
  constructor(
    @Inject("WalletRepository")
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(playerId: string): Promise<Wallet> {
    const existing = await this.walletRepository.findByPlayerId(playerId);

    if (existing) {
      return existing;
    }

    const wallet = new Wallet({
      id: randomUUID(),
      playerId,
      balanceCents: 0,
    });

    await this.walletRepository.save(wallet);

    return wallet;
  }
}
