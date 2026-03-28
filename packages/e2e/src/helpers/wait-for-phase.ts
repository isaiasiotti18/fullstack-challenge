import type { Page } from "@playwright/test";

type GamePhase = "WAITING" | "BETTING" | "RUNNING" | "CRASHED";

export async function waitForPhase(
  page: Page,
  targetPhase: GamePhase,
  timeoutMs = 60_000,
): Promise<void> {
  await page.waitForFunction(
    ({ phase, timeout }) => {
      return new Promise<boolean>((resolve, reject) => {
        const deadline = Date.now() + timeout;

        const check = () => {
          const el = document.querySelector("[data-testid='game-phase']");
          if (el?.getAttribute("data-phase") === phase) {
            resolve(true);
            return;
          }
          if (Date.now() > deadline) {
            reject(new Error(`Timeout waiting for phase ${phase}`));
            return;
          }
          setTimeout(check, 300);
        };

        check();
      });
    },
    { phase: targetPhase, timeout: timeoutMs },
    { timeout: timeoutMs + 5_000 },
  );
}

export async function waitForPhaseChange(
  page: Page,
  fromPhase: GamePhase,
  timeoutMs = 60_000,
): Promise<string> {
  return page.evaluate(
    ({ phase, timeout }) => {
      return new Promise<string>((resolve, reject) => {
        const deadline = Date.now() + timeout;

        const check = () => {
          const el = document.querySelector("[data-testid='game-phase']");
          const current = el?.getAttribute("data-phase") ?? "";
          if (current && current !== phase) {
            resolve(current);
            return;
          }
          if (Date.now() > deadline) {
            reject(new Error(`Timeout waiting for phase to change from ${phase}`));
            return;
          }
          setTimeout(check, 300);
        };

        check();
      });
    },
    { phase: fromPhase, timeout: timeoutMs },
  );
}
