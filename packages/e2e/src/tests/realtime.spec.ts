import { test, expect } from "../fixtures/auth.fixture";
import { waitForPhase } from "../helpers/wait-for-phase";

test.describe("Real-time Updates", () => {
  test("should update multiplier during running phase", async ({ authedPage: page }) => {
    // Wait for RUNNING phase
    await waitForPhase(page, "RUNNING", 90_000);

    const gamePhase = page.getByTestId("game-phase");

    // Read initial multiplier
    const initialMultiplier = await gamePhase.getAttribute("data-multiplier");

    // Wait a bit for multiplier to grow
    await page.waitForTimeout(1_000);

    // Read updated multiplier
    const updatedMultiplier = await gamePhase.getAttribute("data-multiplier");

    // Multiplier should have increased
    expect(Number(updatedMultiplier)).toBeGreaterThan(Number(initialMultiplier));
  });

  test("should show crash point in round history after crash", async ({ authedPage: page }) => {
    // Wait for a round to crash
    await waitForPhase(page, "CRASHED", 90_000);

    // Round history should have at least one badge
    const badges = page.getByTestId("round-badge");
    await expect(badges.first()).toBeVisible({ timeout: 10_000 });

    // Badge should contain a crash point format (e.g., "2.00x")
    const text = await badges.first().textContent();
    expect(text).toMatch(/\d+\.\d{2}x/);
  });
});
