import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SoundState {
  muted: boolean;
  volume: number;
  toggleMute: () => void;
  setVolume: (v: number) => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      muted: false,
      volume: 0.5,
      toggleMute: () => set({ muted: !get().muted }),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
    }),
    { name: "sound-settings" },
  ),
);

type SoundName = "bet" | "cashout" | "crash" | "tick" | "win";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.5,
  rampDown = true,
) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);

  if (rampDown) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

const SOUNDS: Record<SoundName, (volume: number) => void> = {
  bet: (vol) => {
    playTone(440, 0.1, "sine", vol);
    setTimeout(() => playTone(660, 0.1, "sine", vol), 50);
  },
  cashout: (vol) => {
    playTone(523, 0.08, "sine", vol);
    setTimeout(() => playTone(659, 0.08, "sine", vol), 60);
    setTimeout(() => playTone(784, 0.15, "sine", vol), 120);
  },
  crash: (vol) => {
    playTone(200, 0.4, "sawtooth", vol);
    setTimeout(() => playTone(100, 0.5, "sawtooth", vol), 100);
  },
  tick: (vol) => {
    playTone(880, 0.05, "sine", vol * 0.3);
  },
  win: (vol) => {
    playTone(523, 0.1, "sine", vol);
    setTimeout(() => playTone(659, 0.1, "sine", vol), 100);
    setTimeout(() => playTone(784, 0.1, "sine", vol), 200);
    setTimeout(() => playTone(1047, 0.2, "sine", vol), 300);
  },
};

export function useSound() {
  const { muted, volume } = useSoundStore();

  const play = useCallback(
    (name: SoundName) => {
      if (muted) return;
      try {
        SOUNDS[name](volume);
      } catch {
        // AudioContext may be blocked until user interaction
      }
    },
    [muted, volume],
  );

  return { play, muted, volume };
}
