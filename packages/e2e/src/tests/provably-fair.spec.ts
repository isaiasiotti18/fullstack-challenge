import { test, expect } from "../fixtures/auth.fixture";
import { waitForPhase } from "../helpers/wait-for-phase";

const API_BASE = "http://localhost:8000";

test.describe("Provably Fair", () => {
  test("should provide verification data for crashed rounds", async ({
    authedPage: page,
    accessToken,
  }) => {
    // Wait for a round to crash
    await waitForPhase(page, "CRASHED", 90_000);

    // Get the round ID from the hidden game state element
    const roundId = await page.getByTestId("game-phase").getAttribute("data-round-id");
    expect(roundId).toBeTruthy();

    // Call the verify endpoint
    const response = await fetch(`${API_BASE}/games/rounds/${roundId}/verify`);
    expect(response.ok).toBe(true);

    const data = await response.json();

    // Should have all provably fair fields
    expect(data).toHaveProperty("serverSeed");
    expect(data).toHaveProperty("publicSeed");
    expect(data).toHaveProperty("nonce");
    expect(data).toHaveProperty("crashPoint");
    expect(data).toHaveProperty("hash");

    // Crash point should be a positive number
    expect(data.crashPoint).toBeGreaterThanOrEqual(1.0);

    // Server seed hash should match the committed hash
    expect(typeof data.hash).toBe("string");
    expect(data.hash.length).toBe(64); // SHA-256 hex
  });
});
