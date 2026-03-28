import { test, expect } from "../fixtures/auth.fixture";
import { waitForPhase } from "../helpers/wait-for-phase";

test.describe("Bet Lost", () => {
  test("should mark bet as lost after crash without cash out", async ({ authedPage: page }) => {
    // Wait for BETTING phase
    await waitForPhase(page, "BETTING");

    // Place a small bet
    await page.getByTestId("bet-amount-input").fill("5");
    await page.getByTestId("place-bet-button").click();

    // Wait for success toast
    await expect(page.getByText(/Aposta de .* realizada/)).toBeVisible({ timeout: 10_000 });

    // Wait for the round to crash (do NOT cash out)
    await waitForPhase(page, "CRASHED", 90_000);

    // Bet should be marked as lost
    await expect(page.getByText("Perdeu")).toBeVisible({ timeout: 5_000 });
  });
});
