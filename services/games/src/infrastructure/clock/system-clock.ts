import { Injectable } from "@nestjs/common";
import type { Clock } from "../../application/ports/clock";

@Injectable()
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  setTimeout(fn: () => void, ms: number): ReturnType<typeof globalThis.setTimeout> {
    return globalThis.setTimeout(fn, ms);
  }

  setInterval(fn: () => void, ms: number): ReturnType<typeof globalThis.setInterval> {
    return globalThis.setInterval(fn, ms);
  }

  clearInterval(id: ReturnType<typeof globalThis.setInterval>): void {
    globalThis.clearInterval(id);
  }
}
