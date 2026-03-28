import { test, expect } from "../fixtures/auth.fixture";

test.describe("Wallet", () => {
  test("should display wallet balance after authentication", async ({ authedPage: page }) => {
    // Header should show username
    await expect(page.getByTestId("username")).toHaveText("player");

    // Balance should be visible (not the dash placeholder)
    const balance = page.getByTestId("balance");
    await expect(balance).toBeVisible();
    await expect(balance).not.toHaveText("—");
  });
});
