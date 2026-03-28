import { test, expect } from "../fixtures/auth.fixture";
import { waitForPhase } from "../helpers/wait-for-phase";

test.describe("Bet Cash Out", () => {
  test("should cash out during running phase and update balance", async ({ authedPage: page }) => {
    // Wait for balance to load
    const balanceEl = page.getByTestId("balance");
    await expect(balanceEl).toBeVisible({ timeout: 15_000 });
    await page.waitForFunction(
      () => {
        const el = document.querySelector("[data-testid='balance']");
        return el && el.textContent !== "—" && el.textContent!.trim().length > 0;
      },
      { timeout: 20_000 },
    );
    const initialBalance = await balanceEl.textContent();

    // Wait for BETTING phase
    await waitForPhase(page, "BETTING");

    // Place a bet immediately
    await page.getByTestId("bet-amount-input").fill("10");
    const placeBetBtn = page.getByTestId("place-bet-button");
    await expect(placeBetBtn).toBeEnabled({ timeout: 5_000 });
    await placeBetBtn.click();
    await expect(page.getByText(/Aposta de .* realizada/)).toBeVisible({ timeout: 10_000 });

    // Wait for bet to appear in bet list (confirming WebSocket sync)
    await expect(page.getByTestId("bet-entry")).toBeVisible({ timeout: 10_000 });

    // Wait for RUNNING phase — the cashout button replaces the place-bet button
    await waitForPhase(page, "RUNNING");

    // The cashout button should now be rendered instead of place-bet button
    // Wait for it with polling since the UI re-render may take a tick
    await page.waitForFunction(
      () => !!document.querySelector("[data-testid='cashout-button']"),
      { timeout: 20_000 },
    );
    const cashOutBtn = page.getByTestId("cashout-button");
    await cashOutBtn.click();

    // Should show cash out toast
    await expect(page.getByText(/Cash out de/)).toBeVisible({ timeout: 10_000 });

    // Wait for round to finish and wallet to update
    await waitForPhase(page, "CRASHED", 90_000);
    await page.waitForTimeout(3_000);

    const newBalance = await balanceEl.textContent();
    expect(newBalance).not.toBe(initialBalance);
  });
});
