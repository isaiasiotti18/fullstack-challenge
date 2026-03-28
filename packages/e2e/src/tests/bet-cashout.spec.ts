import { test, expect } from "../fixtures/auth.fixture";
import { waitForPhase } from "../helpers/wait-for-phase";

test.describe("Bet Cash Out", () => {
  test("should cash out during running phase and update balance", async ({ authedPage: page }) => {
    // Capture initial balance
    const balanceEl = page.getByTestId("balance");
    await expect(balanceEl).not.toHaveText("—", { timeout: 10_000 });
    const initialBalance = await balanceEl.textContent();

    // Wait for BETTING phase
    await waitForPhase(page, "BETTING");

    // Place a bet
    await page.getByTestId("bet-amount-input").fill("10");
    await page.getByTestId("place-bet-button").click();
    await expect(page.getByText(/Aposta de .* realizada/)).toBeVisible({ timeout: 10_000 });

    // Wait for RUNNING phase
    await waitForPhase(page, "RUNNING");

    // Cash out button should appear
    const cashOutBtn = page.getByTestId("cashout-button");
    await expect(cashOutBtn).toBeVisible({ timeout: 5_000 });

    // Wait a moment for multiplier to grow, then cash out
    await page.waitForTimeout(1_500);
    await cashOutBtn.click();

    // Should show cash out toast
    await expect(page.getByText(/Cash out de/)).toBeVisible({ timeout: 10_000 });

    // Wait for round to finish and wallet to update
    await waitForPhase(page, "CRASHED", 90_000);

    // Wait for balance refresh
    await page.waitForTimeout(3_000);
    const newBalance = await balanceEl.textContent();

    // Balance should have changed (we cashed out at > 1.0x, so net positive)
    expect(newBalance).not.toBe(initialBalance);
  });
});
