import { useAuth } from "react-oidc-context";
import { Button } from "@/components/ui/button";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary">Carregando...</p>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-crash">Erro de autenticacao: {auth.error.message}</p>
        <Button onClick={() => auth.signinRedirect()}>Tentar novamente</Button>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-bold text-neon">Crash Game</h1>
        <Button size="lg" data-testid="login-button" onClick={() => auth.signinRedirect()}>
          Entrar
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
