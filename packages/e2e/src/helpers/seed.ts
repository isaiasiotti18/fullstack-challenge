import { getKeycloakToken } from "./keycloak";

const API_BASE = "http://localhost:8000";
const WALLET_DB_URL = "postgresql://admin:admin@localhost:5432/wallets";
const SEED_BALANCE_CENTS = 10_000_000; // R$ 100.000,00

export async function seedTestPlayer(): Promise<void> {
  const { access_token } = await getKeycloakToken();

  // Ensure wallet exists
  await fetch(`${API_BASE}/wallets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}` },
  });

  // Get wallet to find playerId
  const walletRes = await fetch(`${API_BASE}/wallets/me`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!walletRes.ok) {
    throw new Error(`Failed to get wallet: ${walletRes.status}`);
  }

  const wallet = (await walletRes.json()) as { playerId: string; balanceCents: number };

  // Update balance directly in DB for test purposes
  // Using fetch to a simple SQL runner would be ideal, but we use direct pg connection
  const { Client } = await import("pg");
  const client = new Client({ connectionString: WALLET_DB_URL });

  try {
    await client.connect();
    await client.query(
      `UPDATE "Wallet" SET "balanceCents" = $1, "updatedAt" = NOW() WHERE "playerId" = $2`,
      [SEED_BALANCE_CENTS, wallet.playerId],
    );
    console.log(`Seeded wallet for player ${wallet.playerId} with ${SEED_BALANCE_CENTS} cents`);
  } finally {
    await client.end();
  }
}

// Run directly if invoked as a script
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed.ts")) {
  seedTestPlayer()
    .then(() => console.log("Seed completed successfully"))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
