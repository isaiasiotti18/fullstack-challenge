import { useState, useEffect } from "react";
import { verifyRound } from "@/services/api";
import { calculateCrashPoint, verifyHash } from "@/services/provably-fair";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { VerifyRoundResponse } from "@/types/api";

interface VerifyRoundModalProps {
  roundId: string;
  crashPoint: number;
  onClose: () => void;
}

interface VerificationResult {
  data: VerifyRoundResponse;
  clientCrashPoint: number | null;
  hashValid: boolean | null;
  crashPointMatch: boolean | null;
}

export function VerifyRoundModal({ roundId, crashPoint, onClose }: VerifyRoundModalProps) {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      try {
        const data = await verifyRound(roundId);

        const [clientCrashPoint, hashValid] = await Promise.all([
          calculateCrashPoint(data.serverSeed, data.publicSeed, data.nonce),
          verifyHash(data.serverSeed, data.hash),
        ]);

        setResult({
          data,
          clientCrashPoint,
          hashValid,
          crashPointMatch: clientCrashPoint === data.crashPoint,
        });
      } catch {
        setError("Falha ao carregar dados de verificacao");
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [roundId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-lg border-border-game bg-bg-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">Verificacao Provably Fair</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              X
            </Button>
          </div>

          <div className="text-center">
            <span className="text-3xl font-bold text-crash">{crashPoint.toFixed(2)}x</span>
            <p className="text-xs text-text-secondary">Crash Point da Rodada</p>
          </div>

          {loading && (
            <div className="py-8 text-center text-sm text-text-secondary">Verificando...</div>
          )}

          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {result && (
            <>
              <div className="space-y-3">
                <SeedField label="Server Seed" value={result.data.serverSeed} />
                <SeedField label="Public Seed" value={result.data.publicSeed} />
                <SeedField label="Nonce" value={String(result.data.nonce)} />
                <SeedField label="Hash (SHA-256)" value={result.data.hash} />
              </div>

              <div className="space-y-2 rounded border border-border-game bg-bg-secondary p-3">
                <h3 className="text-sm font-medium text-text-primary">Resultado da Verificacao</h3>

                <VerifyRow
                  label="Hash do Server Seed"
                  description="SHA-256(serverSeed) === hash exibido antes da rodada"
                  passed={result.hashValid}
                />

                <VerifyRow
                  label="Crash Point"
                  description={`HMAC-SHA256 calcula ${result.clientCrashPoint?.toFixed(2)}x — servidor reportou ${result.data.crashPoint.toFixed(2)}x`}
                  passed={result.crashPointMatch}
                />
              </div>

              <div className="rounded border border-border-game bg-bg-secondary p-3">
                <h3 className="mb-2 text-sm font-medium text-text-primary">
                  Como verificar manualmente
                </h3>
                <ol className="space-y-1 text-xs text-text-secondary">
                  <li>
                    1. Calcule{" "}
                    <code className="text-text-primary">
                      HMAC-SHA256(serverSeed, publicSeed:nonce)
                    </code>
                  </li>
                  <li>2. Pegue os primeiros 8 caracteres hex e converta para inteiro</li>
                  <li>
                    3. Se <code className="text-text-primary">intValue % 33 === 0</code>, crash =
                    1.00x (house edge 3%)
                  </li>
                  <li>
                    4. Caso contrario:{" "}
                    <code className="text-text-primary">
                      crashPoint = floor((2^32 / (intValue + 1)) * 100) / 100
                    </code>
                  </li>
                  <li>
                    5. Verifique que <code className="text-text-primary">SHA-256(serverSeed)</code>{" "}
                    === hash exibido antes da rodada
                  </li>
                </ol>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SeedField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <label className="text-xs text-text-secondary">{label}</label>
      <div
        className="mt-0.5 flex cursor-pointer items-center gap-2 rounded border border-border-game bg-bg-secondary px-2 py-1.5"
        onClick={handleCopy}
        title="Clique para copiar"
      >
        <code className="flex-1 truncate text-xs text-text-primary">{value}</code>
        <span className="shrink-0 text-xs text-text-secondary">
          {copied ? "Copiado!" : "Copiar"}
        </span>
      </div>
    </div>
  );
}

function VerifyRow({
  label,
  description,
  passed,
}: {
  label: string;
  description: string;
  passed: boolean | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-lg">
        {passed === null ? "\u{23F3}" : passed ? "\u{2705}" : "\u{274C}"}
      </span>
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
