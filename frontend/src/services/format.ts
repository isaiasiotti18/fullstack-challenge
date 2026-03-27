const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

export function truncatePlayerId(playerId: string): string {
  return playerId.length > 8 ? `${playerId.slice(0, 8)}...` : playerId;
}
