import { Wallet as PrismaWallet } from "../../../../prisma/generated/client.js";
import { Wallet } from "../../../domain/wallet";

export class WalletMapper {
  static toDomain(prismaWallet: PrismaWallet): Wallet {
    return new Wallet({
      id: prismaWallet.id,
      playerId: prismaWallet.playerId,
      balanceCents: Number(prismaWallet.balanceCents),
    });
  }
}
