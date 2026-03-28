import { useRef, useEffect } from "react";
import { useGameStore } from "@/stores/game-store";

const COLORS = {
  bg: "#0f0f23",
  curve: "#00ff88",
  crash: "#ff4444",
  text: "#e0e0e0",
  textMuted: "#8888aa",
  grid: "#1a1a3e",
};

export function MultiplierGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const curvePointsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let prevPhase = useGameStore.getState().phase;

    function resizeCanvas() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = parent.clientWidth * dpr;
      canvas!.height = parent.clientHeight * dpr;
      canvas!.style.width = `${parent.clientWidth}px`;
      canvas!.style.height = `${parent.clientHeight}px`;
      ctx!.scale(dpr, dpr);
    }

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement!);

    function draw() {
      const state = useGameStore.getState();
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;

      if (state.phase === "RUNNING" && prevPhase !== "RUNNING") {
        curvePointsRef.current = [];
      }
      prevPhase = state.phase;

      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = COLORS.bg;
      ctx!.fillRect(0, 0, w, h);

      drawGrid(ctx!, w, h);

      if (state.phase === "WAITING") {
        drawCenteredText(ctx!, w, h / 2, "Aguardando...", COLORS.textMuted, 28);
      } else if (state.phase === "BETTING") {
        drawBettingPhase(ctx!, w, h, state.bettingEndsAt, state.hash);
      } else if (state.phase === "RUNNING") {
        curvePointsRef.current.push(state.multiplier);
        drawCurve(ctx!, w, h, curvePointsRef.current);
        drawMultiplierText(ctx!, w, h, state.multiplier, COLORS.curve);
      } else if (state.phase === "CRASHED") {
        drawCurve(ctx!, w, h, curvePointsRef.current);
        ctx!.fillStyle = "rgba(255, 68, 68, 0.15)";
        ctx!.fillRect(0, 0, w, h);
        drawMultiplierText(ctx!, w, h, state.crashPoint ?? state.multiplier, COLORS.crash);
        drawCenteredText(ctx!, w, h * 0.7, "CRASHED", COLORS.crash, 20);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden rounded-lg border border-border-game bg-bg-primary">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  const step = 60;
  for (let x = step; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = step; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawCurve(ctx: CanvasRenderingContext2D, w: number, h: number, points: number[]) {
  if (points.length < 2) return;

  const maxMultiplier = Math.max(...points, 2);
  const padding = 40;
  const graphW = w - padding * 2;
  const graphH = h - padding * 2;

  ctx.beginPath();
  ctx.strokeStyle = COLORS.curve;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";

  for (let i = 0; i < points.length; i++) {
    const x = padding + (i / (points.length - 1)) * graphW;
    const y = h - padding - ((points[i] - 1) / (maxMultiplier - 1)) * graphH;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();

  // Glow
  ctx.shadowColor = COLORS.curve;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawMultiplierText(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  multiplier: number,
  color: string,
) {
  const text = `${multiplier.toFixed(2)}x`;
  ctx.fillStyle = color;
  ctx.font = "bold 56px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillText(text, w / 2, h * 0.4);
  ctx.shadowBlur = 0;
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  text: string,
  color: string,
  size: number,
) {
  ctx.fillStyle = color;
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, y);
}

function drawBettingPhase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bettingEndsAt: string | null,
  hash: string | null,
) {
  let countdown = "";
  if (bettingEndsAt) {
    const remaining = Math.max(
      0,
      Math.ceil((new Date(bettingEndsAt).getTime() - Date.now()) / 1000),
    );
    countdown = `${remaining}s`;
  }

  drawCenteredText(ctx, w, h * 0.35, "APOSTAS ABERTAS", COLORS.curve, 24);

  if (countdown) {
    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 64px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(countdown, w / 2, h * 0.5);
  }

  if (hash) {
    const truncated = hash.length > 16 ? `${hash.slice(0, 16)}...` : hash;
    drawCenteredText(ctx, w, h * 0.7, `Hash: ${truncated}`, COLORS.textMuted, 14);
  }
}
