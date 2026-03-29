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

interface CurvePoint {
  m: number; // multiplier
  t: number; // timestamp (ms relative to round start)
}

export function MultiplierGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const curvePointsRef = useRef<CurvePoint[]>([]);
  const roundStartRef = useRef(0);
  const crashFlashRef = useRef(0);

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
        roundStartRef.current = Date.now();
      }
      if (state.phase === "CRASHED" && prevPhase !== "CRASHED") {
        crashFlashRef.current = 1;
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
        const points = curvePointsRef.current;
        const last = points[points.length - 1];
        if (!last || last.m !== state.multiplier) {
          points.push({ m: state.multiplier, t: Date.now() - roundStartRef.current });
        }
        drawCurve(ctx!, w, h, points);
        drawMultiplierText(ctx!, w, h, state.multiplier, COLORS.curve);
      } else if (state.phase === "CRASHED") {
        drawCurve(ctx!, w, h, curvePointsRef.current);
        const flash = crashFlashRef.current;
        const alpha = 0.15 + flash * 0.35;
        ctx!.fillStyle = `rgba(255, 68, 68, ${alpha})`;
        ctx!.fillRect(0, 0, w, h);
        drawMultiplierText(ctx!, w, h, state.crashPoint ?? state.multiplier, COLORS.crash);
        drawCenteredText(ctx!, w, h * 0.7, "CRASHED", COLORS.crash, 20);
        if (crashFlashRef.current > 0) {
          crashFlashRef.current = Math.max(0, crashFlashRef.current - 0.03);
        }
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

function drawCurve(ctx: CanvasRenderingContext2D, w: number, h: number, points: CurvePoint[]) {
  if (points.length < 2) return;

  const padding = 40;
  const graphW = w - padding * 2;
  const graphH = h - padding * 2;

  const maxTime = Math.max(points[points.length - 1].t, 5000);
  const maxMultiplier = Math.max(points[points.length - 1].m, 2);

  // Convert to screen coordinates
  const coords = points.map((p) => ({
    x: padding + (p.t / maxTime) * graphW,
    y: h - padding - ((p.m - 1) / (maxMultiplier - 1)) * graphH,
  }));

  // Draw smooth curve using quadratic Bezier
  ctx.beginPath();
  ctx.moveTo(coords[0].x, coords[0].y);

  for (let i = 1; i < coords.length; i++) {
    const midX = (coords[i - 1].x + coords[i].x) / 2;
    const midY = (coords[i - 1].y + coords[i].y) / 2;
    ctx.quadraticCurveTo(coords[i - 1].x, coords[i - 1].y, midX, midY);
  }
  ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);

  // Gradient fill under the curve
  const lastCoord = coords[coords.length - 1];
  const gradient = ctx.createLinearGradient(0, lastCoord.y, 0, h - padding);
  gradient.addColorStop(0, "rgba(0, 255, 136, 0.15)");
  gradient.addColorStop(1, "rgba(0, 255, 136, 0)");

  ctx.save();
  ctx.lineTo(lastCoord.x, h - padding);
  ctx.lineTo(coords[0].x, h - padding);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  // Redraw curve stroke on top of fill
  ctx.beginPath();
  ctx.moveTo(coords[0].x, coords[0].y);
  for (let i = 1; i < coords.length; i++) {
    const midX = (coords[i - 1].x + coords[i].x) / 2;
    const midY = (coords[i - 1].y + coords[i].y) / 2;
    ctx.quadraticCurveTo(coords[i - 1].x, coords[i - 1].y, midX, midY);
  }
  ctx.lineTo(lastCoord.x, lastCoord.y);

  ctx.strokeStyle = COLORS.curve;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  // Glow effect
  ctx.shadowColor = COLORS.curve;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Dot at the tip
  ctx.beginPath();
  ctx.arc(lastCoord.x, lastCoord.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.curve;
  ctx.shadowColor = COLORS.curve;
  ctx.shadowBlur = 12;
  ctx.fill();
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
