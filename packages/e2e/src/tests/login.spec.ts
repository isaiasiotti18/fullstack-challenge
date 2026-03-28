import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  test("should display login screen and authenticate via Keycloak", async ({ page }) => {
    await page.goto("/");

    // Should show unauthenticated state
    await expect(page.getByText("Crash Game")).toBeVisible();
    await expect(page.getByTestId("login-button")).toBeVisible();

    // Click login - redirects to Keycloak
    await page.getByTestId("login-button").click();

    // Wait for Keycloak login page
    await page.waitForURL(/.*localhost:8080.*/);

    // Fill credentials
    await page.fill("#username", "player");
    await page.fill("#password", "player123");
    await page.click("#kc-login");

    // Wait for redirect back to app
    await page.waitForURL(/.*localhost:3000.*/);

    // Should show authenticated state with username
    await expect(page.getByTestId("username")).toHaveText("player");
    await expect(page.getByTestId("logout-button")).toBeVisible();
  });
});
