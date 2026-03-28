import { test, expect } from "../fixtures/auth.fixture";
import { waitForPhase } from "../helpers/wait-for-phase";

test.describe("Place Bet", () => {
  test("should place a bet during betting phase", async ({ authedPage: page }) => {
    // Wait for BETTING phase
    await waitForPhase(page, "BETTING");

    // Set bet amount
    const input = page.getByTestId("bet-amount-input");
    await input.fill("10");

    // Place bet button should be enabled
    const placeBetBtn = page.getByTestId("place-bet-button");
    await expect(placeBetBtn).toBeEnabled();

    // Place the bet
    await placeBetBtn.click();

    // Should show success toast
    await expect(page.getByText(/Aposta de .* realizada/)).toBeVisible({ timeout: 10_000 });

    // Bet should appear in bet list
    await expect(page.getByTestId("bet-entry")).toBeVisible({ timeout: 5_000 });

    // Place bet button should now be disabled (one bet per round)
    await expect(placeBetBtn).toBeDisabled();
  });
});
