import { createHmac, createHash } from "crypto";

const HOUSE_EDGE_PERCENT = 3;

/**
 * Calculate a deterministic crash point from server seed, public seed, and nonce.
 *
 * Algorithm:
 * 1. HMAC-SHA256(serverSeed, publicSeed:nonce) → hex hash
 * 2. Take first 8 hex chars (32 bits) → integer
 * 3. House edge: if intValue % floor(100/houseEdge) === 0, crash at 1.00x
 * 4. Otherwise: crashPoint = floor((2^32 / (intValue + 1)) * 100) / 100
 *
 * Distribution: P(crash > x) ≈ 1/x for x >= 1, giving fair house edge.
 */
export function calculateCrashPoint(serverSeed: string, publicSeed: string, nonce: number): number {
  const hmac = createHmac("sha256", serverSeed);
  hmac.update(`${publicSeed}:${nonce}`);
  const hex = hmac.digest("hex");

  const intValue = parseInt(hex.substring(0, 8), 16);

  const houseEdgeDivisor = Math.floor(100 / HOUSE_EDGE_PERCENT);
  if (intValue % houseEdgeDivisor === 0) {
    return 1.0;
  }

  const e = Math.floor((2 ** 32 / (intValue + 1)) * 100) / 100;
  return Math.max(1.0, e);
}

/**
 * Generate a hash chain of given length.
 *
 * Starting from initialSeed, repeatedly SHA-256 hash to create a chain.
 * Returns array where index 0 is the terminating hash (publicly revealed before any round),
 * and the last element is closest to the initial seed.
 *
 * Usage: for round N (0-indexed), use chain[N] as the server seed.
 * After round N, reveal chain[N] so players can verify chain[N-1] = SHA256(chain[N]).
 */
export function generateHashChain(initialSeed: string, length: number): string[] {
  const chain: string[] = [];
  let current = initialSeed;

  for (let i = 0; i < length; i++) {
    current = createHash("sha256").update(current).digest("hex");
    chain.push(current);
  }

  return chain.reverse();
}

/**
 * Verify that a hash in the chain is the SHA-256 of the next hash.
 * verifyHashChain(chain[i], chain[i+1]) should return true.
 */
export function verifyHashChain(parentHash: string, childHash: string): boolean {
  const expected = createHash("sha256").update(childHash).digest("hex");
  return expected === parentHash;
}

/**
 * Hash a server seed to create a commitment (shown before the round starts).
 */
export function hashServerSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed).digest("hex");
}

/**
 * Full verification: given the revealed server seed, public seed, nonce,
 * and the claimed crash point, verify correctness.
 */
export function verifyCrashPoint(
  serverSeed: string,
  publicSeed: string,
  nonce: number,
  expectedCrashPoint: number,
): boolean {
  return calculateCrashPoint(serverSeed, publicSeed, nonce) === expectedCrashPoint;
}
