import type {
  PlaceBetRequest,
  PlaceBetResponse,
  CashOutResponse,
  CurrentRoundResponse,
  RoundHistoryResponse,
  VerifyRoundResponse,
  PlayerBetsResponse,
  WalletResponse,
  LeaderboardEntry,
  LeaderboardPeriod,
} from "@/types/api";

const API_BASE_URL = "/api";

let getAccessToken: (() => string | undefined) | null = null;

export function setAccessTokenGetter(getter: () => string | undefined): void {
  getAccessToken = getter;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const token = getAccessToken?.();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message ?? `Request failed: ${response.status}`;
    throw new Error(Array.isArray(message) ? message[0] : message);
  }

  return response.json() as Promise<T>;
}

export function createWallet(): Promise<WalletResponse> {
  return apiFetch<WalletResponse>("/wallets", { method: "POST" });
}

export function getWallet(): Promise<WalletResponse> {
  return apiFetch<WalletResponse>("/wallets/me");
}

export function placeBet(data: PlaceBetRequest): Promise<PlaceBetResponse> {
  return apiFetch<PlaceBetResponse>("/games/bet", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function cashOut(): Promise<CashOutResponse> {
  return apiFetch<CashOutResponse>("/games/bet/cashout", { method: "POST" });
}

export function getCurrentRound(): Promise<CurrentRoundResponse> {
  return apiFetch<CurrentRoundResponse>("/games/rounds/current");
}

export function getRoundHistory(page = 1, limit = 20): Promise<RoundHistoryResponse> {
  return apiFetch<RoundHistoryResponse>(`/games/rounds/history?page=${page}&limit=${limit}`);
}

export function getPlayerBets(page = 1, limit = 20): Promise<PlayerBetsResponse> {
  return apiFetch<PlayerBetsResponse>(`/games/bets/me?page=${page}&limit=${limit}`);
}

export function verifyRound(roundId: string): Promise<VerifyRoundResponse> {
  return apiFetch<VerifyRoundResponse>(`/games/rounds/${roundId}/verify`);
}

export function getLeaderboard(period: LeaderboardPeriod = "24h"): Promise<LeaderboardEntry[]> {
  return apiFetch<LeaderboardEntry[]>(`/games/leaderboard?period=${period}`);
}
