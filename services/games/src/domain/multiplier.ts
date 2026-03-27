/**
 * Calculates the current multiplier based on elapsed time using exponential growth.
 * The curve follows e^(rate * t), truncated to 2 decimal places.
 */
export function calculateMultiplier(elapsedSeconds: number, growthRate: number): number {
  return Math.floor(Math.exp(growthRate * elapsedSeconds) * 100) / 100;
}
