const HOUSE_EDGE_PERCENT = 3;

/**
 * Client-side verification of a crash point.
 * Mirrors the server-side algorithm using Web Crypto API.
 *
 * Algorithm:
 * 1. HMAC-SHA256(serverSeed, publicSeed:nonce) → hex hash
 * 2. Take first 8 hex chars (32 bits) → integer
 * 3. House edge: if intValue % floor(100/houseEdge) === 0 → crash at 1.00x
 * 4. Otherwise: crashPoint = floor((2^32 / (intValue + 1)) * 100) / 100
 */
export async function calculateCrashPoint(
  serverSeed: string,
  publicSeed: string,
  nonce: number,
): Promise<number> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(serverSeed),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${publicSeed}:${nonce}`));

  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const intValue = parseInt(hex.substring(0, 8), 16);

  const houseEdgeDivisor = Math.floor(100 / HOUSE_EDGE_PERCENT);

  if (intValue % houseEdgeDivisor === 0) {
    return 1.0;
  }

  const e = Math.floor((2 ** 32 / (intValue + 1)) * 100) / 100;
  return Math.max(1.0, e);
}

/**
 * Verify that a hash matches SHA-256(serverSeed).
 */
export async function verifyHash(serverSeed: string, expectedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(serverSeed));

  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hash === expectedHash;
}
