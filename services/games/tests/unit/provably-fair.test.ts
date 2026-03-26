import { describe, it, expect } from "bun:test";
import {
  calculateCrashPoint,
  generateHashChain,
  verifyHashChain,
  hashServerSeed,
  verifyCrashPoint,
} from "../../src/domain/provably-fair";

describe("Provably Fair", () => {
  const serverSeed = "test-server-seed-abc123";
  const publicSeed = "test-public-seed-xyz789";
  const nonce = 1;

  describe("calculateCrashPoint", () => {
    it("is deterministic for same inputs", () => {
      const result1 = calculateCrashPoint(serverSeed, publicSeed, nonce);
      const result2 = calculateCrashPoint(serverSeed, publicSeed, nonce);
      expect(result1).toBe(result2);
    });

    it("produces different results for different server seeds", () => {
      const r1 = calculateCrashPoint("seed-a", publicSeed, nonce);
      const r2 = calculateCrashPoint("seed-b", publicSeed, nonce);
      expect(r1).not.toBe(r2);
    });

    it("produces different results for different public seeds", () => {
      const r1 = calculateCrashPoint(serverSeed, "public-a", nonce);
      const r2 = calculateCrashPoint(serverSeed, "public-b", nonce);
      expect(r1).not.toBe(r2);
    });

    it("produces different results for different nonces", () => {
      const r1 = calculateCrashPoint(serverSeed, publicSeed, 0);
      const r2 = calculateCrashPoint(serverSeed, publicSeed, 1);
      expect(r1).not.toBe(r2);
    });

    it("always returns crash point >= 1.0", () => {
      for (let i = 0; i < 1000; i++) {
        const cp = calculateCrashPoint(`seed-${i}`, publicSeed, i);
        expect(cp).toBeGreaterThanOrEqual(1.0);
      }
    });

    it("returns crash points with at most 2 decimal places", () => {
      for (let i = 0; i < 1000; i++) {
        const cp = calculateCrashPoint(`seed-${i}`, publicSeed, i);
        const rounded = Math.round(cp * 100) / 100;
        expect(cp).toBe(rounded);
      }
    });

    it("house edge: ~3% of rounds crash at 1.00x over large sample", () => {
      const samples = 10_000;
      let instantCrashes = 0;

      for (let i = 0; i < samples; i++) {
        const cp = calculateCrashPoint(`he-seed-${i}`, `he-public-${i}`, i);
        if (cp === 1.0) {
          instantCrashes++;
        }
      }

      const rate = instantCrashes / samples;
      // ~3% house edge, allow tolerance range [1.5%, 5%]
      expect(rate).toBeGreaterThan(0.015);
      expect(rate).toBeLessThan(0.05);
    });
  });

  describe("generateHashChain", () => {
    it("generates chain of correct length", () => {
      const chain = generateHashChain("initial-seed", 10);
      expect(chain).toHaveLength(10);
    });

    it("first element is the terminating hash (publicly revealed)", () => {
      const chain = generateHashChain("initial-seed", 5);
      // The first element should be the last hash generated (most derived)
      // which is the one that gets publicly committed
      expect(chain[0]).toBeDefined();
      expect(typeof chain[0]).toBe("string");
      expect(chain[0]).toHaveLength(64); // SHA-256 hex
    });

    it("each hash is SHA-256 of the next in chain", () => {
      const chain = generateHashChain("initial-seed", 10);
      for (let i = 0; i < chain.length - 1; i++) {
        expect(verifyHashChain(chain[i], chain[i + 1])).toBe(true);
      }
    });

    it("all hashes are unique", () => {
      const chain = generateHashChain("initial-seed", 100);
      const unique = new Set(chain);
      expect(unique.size).toBe(chain.length);
    });
  });

  describe("verifyHashChain", () => {
    it("returns true for valid chain link", () => {
      const chain = generateHashChain("seed", 5);
      expect(verifyHashChain(chain[0], chain[1])).toBe(true);
    });

    it("returns false for invalid chain link", () => {
      expect(verifyHashChain("abc", "def")).toBe(false);
    });
  });

  describe("hashServerSeed", () => {
    it("returns SHA-256 hex of the seed", () => {
      const hash = hashServerSeed("my-seed");
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it("is deterministic", () => {
      const h1 = hashServerSeed("same-seed");
      const h2 = hashServerSeed("same-seed");
      expect(h1).toBe(h2);
    });

    it("produces different hashes for different seeds", () => {
      const h1 = hashServerSeed("seed-a");
      const h2 = hashServerSeed("seed-b");
      expect(h1).not.toBe(h2);
    });
  });

  describe("verifyCrashPoint", () => {
    it("returns true for correct crash point", () => {
      const cp = calculateCrashPoint(serverSeed, publicSeed, nonce);
      expect(verifyCrashPoint(serverSeed, publicSeed, nonce, cp)).toBe(true);
    });

    it("returns false for wrong crash point", () => {
      expect(verifyCrashPoint(serverSeed, publicSeed, nonce, 999.99)).toBe(false);
    });
  });
});
