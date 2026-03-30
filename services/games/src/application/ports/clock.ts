export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): ReturnType<typeof globalThis.setTimeout>;
  setInterval(fn: () => void, ms: number): ReturnType<typeof globalThis.setInterval>;
  clearInterval(id: ReturnType<typeof globalThis.setInterval>): void;
}
