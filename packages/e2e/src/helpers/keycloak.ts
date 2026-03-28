const KEYCLOAK_URL = "http://localhost:8080/realms/crash-game/protocol/openid-connect/token";
const CLIENT_ID = "crash-game-client";
const USERNAME = "player";
const PASSWORD = "player123";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export async function getKeycloakToken(): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: CLIENT_ID,
    username: USERNAME,
    password: PASSWORD,
  });

  const response = await fetch(KEYCLOAK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Keycloak token request failed (${response.status}): ${text}`);
  }

  return response.json();
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
}
