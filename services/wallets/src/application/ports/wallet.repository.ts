import { Wallet } from "../../domain/wallet";

export interface WalletRepository {
  findByPlayerId(playerId: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
  updateBalance(id: string, balanceCents: number): Promise<void>;
}
