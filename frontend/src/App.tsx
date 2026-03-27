import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { AuthGuard } from "@/components/auth-guard";
import { setAccessTokenGetter } from "@/services/api";

function AppContent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold text-neon">Crash Game</h1>
    </div>
  );
}

function App() {
  const auth = useAuth();

  useEffect(() => {
    setAccessTokenGetter(() => auth.user?.access_token);
  }, [auth.user]);

  return (
    <AuthGuard>
      <AppContent />
    </AuthGuard>
  );
}

export default App;
