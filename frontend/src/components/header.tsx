import { useAuth } from "react-oidc-context";
import { useWallet } from "@/hooks/use-wallet";
import { useCreateWallet } from "@/hooks/use-create-wallet";
import { formatCents } from "@/services/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export function Header() {
  const auth = useAuth();
  const wallet = useWallet();
  const createWallet = useCreateWallet();

  const username = auth.user?.profile?.preferred_username ?? "Jogador";

  useEffect(() => {
    if (wallet.isError && !createWallet.isPending) {
      createWallet.mutate();
    }
  }, [wallet.isError]);

  return (
    <header className="flex items-center justify-between border-b border-border-game bg-bg-card px-4 py-3">
      <h1 className="text-lg font-bold text-neon">Crash Game</h1>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-text-secondary" data-testid="username">{username}</p>
          {wallet.isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <p className="font-mono text-sm font-semibold text-text-primary" data-testid="balance">
              {wallet.data ? formatCents(wallet.data.balanceCents) : "—"}
            </p>
          )}
        </div>

        <Button variant="outline" size="sm" data-testid="logout-button" onClick={() => auth.signoutRedirect()}>
          Sair
        </Button>
      </div>
    </header>
  );
}
