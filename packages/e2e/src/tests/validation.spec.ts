import { test, expect } from "../fixtures/auth.fixture";
import { waitForPhase } from "../helpers/wait-for-phase";

test.describe("Validation", () => {
  test("should disable bet button during RUNNING phase", async ({ authedPage: page }) => {
    // Wait for RUNNING phase
    await waitForPhase(page, "RUNNING", 90_000);

    // Place bet button should be disabled
    const placeBetBtn = page.getByTestId("place-bet-button");
    await expect(placeBetBtn).toBeDisabled();

    // Bet input should be disabled
    await expect(page.getByTestId("bet-amount-input")).toBeDisabled();
  });

  test("should disable bet button after placing a bet", async ({ authedPage: page }) => {
    // Wait for BETTING phase
    await waitForPhase(page, "BETTING");

    // Place a bet
    await page.getByTestId("bet-amount-input").fill("5");
    await page.getByTestId("place-bet-button").click();
    await expect(page.getByText(/Aposta de .* realizada/)).toBeVisible({ timeout: 10_000 });

    // Place bet button should now be disabled
    await expect(page.getByTestId("place-bet-button")).toBeDisabled();

    // Input should also be disabled
    await expect(page.getByTestId("bet-amount-input")).toBeDisabled();
  });
});
