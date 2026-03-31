import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/auth-guard";
import { Header } from "@/components/header";
import { GamePage } from "@/pages/game";
import { setAccessTokenGetter } from "@/services/api";

function App() {
  const auth = useAuth();

  useEffect(() => {
    setAccessTokenGetter(() => auth.user?.access_token);
  }, [auth.user]);

  return (
    <AuthGuard>
      <div className="flex h-screen flex-col bg-bg-primary">
        <Header />
        <GamePage />
      </div>
      <Toaster theme="dark" position="bottom-right" />
    </AuthGuard>
  );
}

export default App;
