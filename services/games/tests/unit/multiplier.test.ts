import { describe, test, expect } from "bun:test";
import { calculateMultiplier } from "../../src/domain/multiplier";

describe("calculateMultiplier", () => {
  const GROWTH_RATE = 0.06;

  test("returns 1.0 at elapsed = 0", () => {
    expect(calculateMultiplier(0, GROWTH_RATE)).toBe(1.0);
  });

  test("returns value > 1.0 for positive elapsed time", () => {
    expect(calculateMultiplier(5, GROWTH_RATE)).toBeGreaterThan(1.0);
  });

  test("grows exponentially over time", () => {
    const at5s = calculateMultiplier(5, GROWTH_RATE);
    const at10s = calculateMultiplier(10, GROWTH_RATE);
    const at20s = calculateMultiplier(20, GROWTH_RATE);

    expect(at10s).toBeGreaterThan(at5s);
    expect(at20s).toBeGreaterThan(at10s);
  });

  test("truncates to 2 decimal places (floor, not round)", () => {
    // e^(0.06 * 10) = e^0.6 ≈ 1.8221
    const result = calculateMultiplier(10, GROWTH_RATE);
    expect(result).toBe(1.82);
  });

  test("returns 1.0 for very small elapsed values", () => {
    // e^(0.06 * 0.001) ≈ 1.00006 → floor to 1.00
    expect(calculateMultiplier(0.001, GROWTH_RATE)).toBe(1.0);
  });

  test("handles different growth rates", () => {
    const slow = calculateMultiplier(10, 0.03);
    const fast = calculateMultiplier(10, 0.12);

    expect(fast).toBeGreaterThan(slow);
  });
});
