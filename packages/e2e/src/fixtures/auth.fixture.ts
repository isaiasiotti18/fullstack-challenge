import { test as base, type Page } from "@playwright/test";
import { getKeycloakToken, decodeJwtPayload } from "../helpers/keycloak";

const OIDC_AUTHORITY = "http://localhost:8080/realms/crash-game";
const OIDC_CLIENT_ID = "crash-game-client";
const STORAGE_KEY = `oidc.user:${OIDC_AUTHORITY}:${OIDC_CLIENT_ID}`;
const API_BASE = "http://localhost:8000";

async function injectOidcSession(page: Page): Promise<string> {
  const tokenResponse = await getKeycloakToken();
  const payload = decodeJwtPayload(tokenResponse.access_token);

  const oidcUser = {
    access_token: tokenResponse.access_token,
    token_type: "Bearer",
    scope: "openid profile",
    expires_at: Math.floor(Date.now() / 1000) + tokenResponse.expires_in,
    profile: {
      sub: payload.sub,
      preferred_username: payload.preferred_username ?? "player",
      email: payload.email,
      email_verified: payload.email_verified ?? true,
    },
  };

  // Navigate to origin first so sessionStorage is accessible
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => {
      sessionStorage.setItem(key, JSON.stringify(value));
    },
    { key: STORAGE_KEY, value: oidcUser },
  );

  // Ensure wallet exists
  await fetch(`${API_BASE}/wallets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
  });

  // Reload so the OIDC provider picks up the stored session
  await page.reload();

  return tokenResponse.access_token;
}

type AuthFixtures = {
  authedPage: Page;
  accessToken: string;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    await injectOidcSession(page);
    await use(page);
  },
  accessToken: async ({}, use) => {
    const { access_token } = await getKeycloakToken();
    await use(access_token);
  },
});

export { expect } from "@playwright/test";
