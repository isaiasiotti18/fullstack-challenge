# Plano de Implementação — Bonus Features

## Status Atual

- [x] Seed determinística para testes E2E
- [x] Playwright E2E tests

---

## Bloco 1 — Quick Wins

### 1. Fórmula da curva na UI

- [x] Overlay no `multiplier-graph.tsx` exibindo `f(t) = e^(0.06t)`
- **Arquivo:** `frontend/src/components/multiplier-graph.tsx`

### 2. Rate Limiting via Kong

- [x] Plugin `rate-limiting` no `docker/kong/kong.yml`
- [x] 10 req/s para games service, 30 req/s geral
- **Arquivo:** `docker/kong/kong.yml`

### 3. CI Pipeline — GitHub Actions

- [x] Workflow: lint, unit tests (games + wallets), build frontend
- [x] Job E2E com docker compose + Playwright
- **Arquivo:** `.github/workflows/ci.yml` (novo)

---

## Bloco 2 — Features de Gameplay

### 4. Auto Cashout

- [x] Campo `autoCashoutAt` no Bet (domain + Prisma)
- [x] Game Loop: verificar `multiplier >= autoCashoutAt` no tick
- [x] Input no `bet-controls.tsx` para multiplicador alvo
- [x] Aceitar `autoCashoutAt` no `POST /games/bet`
- **Arquivos:** `services/games/src/domain/bet.ts`, `game-loop.service.ts`, `place-bet.use-case.ts`, `bet-controls.tsx`, Prisma schema

### 5. Auto Bet

- [x] Store `auto-bet-store.ts`: enabled, strategy (fixed/martingale), baseAmount, stopLoss
- [x] Componente `auto-bet-panel.tsx`: toggle, config, stop-loss
- [x] Hook `use-auto-bet.ts`: escuta `round:betting`, aposta via REST
- [x] Martingale: dobra após perda, reseta após ganho
- **Arquivos:** `frontend/src/stores/auto-bet-store.ts`, `frontend/src/components/auto-bet-panel.tsx` (novos)

### 6. Leaderboard

- [x] Query SQL: top 10 por lucro líquido (24h/7d)
- [x] `GET /games/leaderboard?period=24h|7d`
- [x] Componente `leaderboard.tsx` com tabs
- [x] Hook `use-leaderboard.ts` (TanStack Query, refetch 30s)
- **Arquivos:** `get-leaderboard.use-case.ts` (novo), `leaderboard.tsx` (novo)

---

## Bloco 3 — Arquitetura e Resiliência

### 7. Outbox/Inbox Transacional

- [x] Tabela `outbox_events` no Games Service
- [x] `OutboxPublisher`: insere evento na outbox (substitui publish direto)
- [x] `OutboxPollerService`: poll 1s, publica no RabbitMQ, marca publicado, cleanup 24h
- [x] Tabela `inbox_events` no Wallets Service com status tracking
- [x] Consumer registra evento no inbox antes de processar, marca status final
- [x] Prisma schemas atualizados para ambos
- **Arquivos:** Prisma schemas, `outbox-poller.service.ts` (novo), refactor publishers

---

## Bloco 4 — Observabilidade

### 8. Prometheus + Grafana + prom-client

- [x] Containers Prometheus + Grafana no `docker-compose.yml`
- [x] `prom-client` em ambos serviços com métricas custom
- [x] Games: rounds_total, bets_total, bets_amount, cashouts, payouts, crash_point histogram, ws_connections, round_phase
- [x] Wallets: debits_total, credits_total, debit_failures, event_processing_duration
- [x] Dashboard Grafana pré-configurado (8 painéis)
- [x] `/metrics` endpoint em ambos serviços
- **Arquivos:** `docker-compose.yml`, `docker/prometheus/`, `docker/grafana/`, metrics modules

---

## Bloco 5 — Frontend Polish

### 9. Efeitos Sonoros

- [ ] Assets em `frontend/public/sounds/` (bet, cashout, crash, tick, win)
- [ ] Hook `use-sound.ts` com Web Audio API
- [ ] Zustand slice para mute/unmute (localStorage)
- [ ] Botão mute no header
- **Arquivos:** `frontend/public/sounds/`, `use-sound.ts` (novo)

### 10. Storybook

- [ ] Instalar `@storybook/react-vite`
- [ ] Stories: Button, Card, MultiplierGraph, BetControls, BetList, RoundHistory, Leaderboard
- [ ] Config dark theme em `frontend/.storybook/`
- [ ] Script `bun run storybook`
- **Arquivos:** `frontend/.storybook/`, `frontend/src/stories/` (novos)
