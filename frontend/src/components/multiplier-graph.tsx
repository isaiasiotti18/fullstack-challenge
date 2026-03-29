import { useRef, useEffect } from "react";
import { useGameStore } from "@/stores/game-store";

const COLORS = {
  bg: "#0f0f23",
  curve: "#00ff88",
  curveFill: "rgba(0, 255, 136, 0.12)",
  crash: "#ff4444",
  text: "#e0e0e0",
  textMuted: "#8888aa",
  grid: "#1a1a3e",
  axis: "#555577",
};

const PADDING = { top: 30, right: 30, bottom: 40, left: 55 };

export function MultiplierGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
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
        roundStartRef.current = Date.now();
      }
      if (state.phase === "CRASHED" && prevPhase !== "CRASHED") {
        crashFlashRef.current = 1;
      }
      prevPhase = state.phase;

      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = COLORS.bg;
      ctx!.fillRect(0, 0, w, h);

      if (state.phase === "WAITING") {
        drawGrid(ctx!, w, h, 1, 5);
        drawAxes(ctx!, w, h, 1, 5);
        drawCenteredText(ctx!, w, h / 2, "Aguardando...", COLORS.textMuted, 28);
      } else if (state.phase === "BETTING") {
        drawGrid(ctx!, w, h, 1, 5);
        drawAxes(ctx!, w, h, 1, 5);
        drawBettingPhase(ctx!, w, h, state.bettingEndsAt, state.hash);
      } else if (state.phase === "RUNNING") {
        const elapsed = (Date.now() - roundStartRef.current) / 1000;
        const maxTime = Math.max(elapsed, 5);
        const maxMult = Math.max(state.multiplier * 1.3, 2);

        drawGrid(ctx!, w, h, maxMult, maxTime);
        drawAxes(ctx!, w, h, maxMult, maxTime);
        drawExponentialCurve(ctx!, w, h, elapsed, state.multiplier, maxMult, maxTime, false);
        drawMultiplierText(ctx!, w, h, state.multiplier, COLORS.curve);
      } else if (state.phase === "CRASHED") {
        const crashPoint = state.crashPoint ?? state.multiplier;
        const elapsed = roundStartRef.current > 0
          ? Math.log(crashPoint) / 0.06
          : 10;
        const maxTime = Math.max(elapsed, 5);
        const maxMult = Math.max(crashPoint * 1.3, 2);

        drawGrid(ctx!, w, h, maxMult, maxTime);
        drawAxes(ctx!, w, h, maxMult, maxTime);
        drawExponentialCurve(ctx!, w, h, elapsed, crashPoint, maxMult, maxTime, true);

        const flash = crashFlashRef.current;
        if (flash > 0) {
          ctx!.fillStyle = `rgba(255, 68, 68, ${flash * 0.3})`;
          ctx!.fillRect(0, 0, w, h);
          crashFlashRef.current = Math.max(0, crashFlashRef.current - 0.025);
        }

        drawMultiplierText(ctx!, w, h, crashPoint, COLORS.crash);
        drawCenteredText(ctx!, w, h * 0.65, "CRASHED", COLORS.crash, 22);
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

function scaleY(multiplier: number, maxMult: number): number {
  // Square root scale: gives more space to lower multipliers,
  // making the exponential curve visually dramatic
  return Math.sqrt(multiplier - 1) / Math.sqrt(maxMult - 1);
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, maxMult: number, maxTime: number) {
  const graphW = w - PADDING.left - PADDING.right;
  const graphH = h - PADDING.top - PADDING.bottom;

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;

  // Horizontal grid lines (multiplier values)
  const multSteps = getMultiplierSteps(maxMult);
  for (const m of multSteps) {
    const ratio = scaleY(m, maxMult);
    const y = h - PADDING.bottom - ratio * graphH;
    if (y < PADDING.top) continue;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, y);
    ctx.lineTo(w - PADDING.right, y);
    ctx.stroke();
  }

  // Vertical grid lines (time values)
  const timeStep = getTimeStep(maxTime);
  for (let t = timeStep; t <= maxTime; t += timeStep) {
    const x = PADDING.left + (t / maxTime) * graphW;
    ctx.beginPath();
    ctx.moveTo(x, PADDING.top);
    ctx.lineTo(x, h - PADDING.bottom);
    ctx.stroke();
  }
}

function drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number, maxMult: number, maxTime: number) {
  const graphW = w - PADDING.left - PADDING.right;
  const graphH = h - PADDING.top - PADDING.bottom;

  ctx.fillStyle = COLORS.axis;
  ctx.font = "11px system-ui, sans-serif";

  // Y axis labels (multiplier)
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const multSteps = getMultiplierSteps(maxMult);
  for (const m of multSteps) {
    const ratio = scaleY(m, maxMult);
    const y = h - PADDING.bottom - ratio * graphH;
    if (y < PADDING.top + 10) continue;
    ctx.fillText(`${m.toFixed(1)}x`, PADDING.left - 8, y);
  }

  // X axis labels (time in seconds)
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const timeStep = getTimeStep(maxTime);
  for (let t = 0; t <= maxTime; t += timeStep) {
    const x = PADDING.left + (t / maxTime) * graphW;
    ctx.fillText(`${Math.round(t)}s`, x, h - PADDING.bottom + 8);
  }

  // Baseline (1.00x line)
  ctx.strokeStyle = COLORS.axis;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  const baseY = h - PADDING.bottom;
  ctx.beginPath();
  ctx.moveTo(PADDING.left, baseY);
  ctx.lineTo(w - PADDING.right, baseY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawExponentialCurve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsedSec: number,
  currentMult: number,
  maxMult: number,
  maxTime: number,
  isCrashed: boolean,
) {
  const graphW = w - PADDING.left - PADDING.right;
  const graphH = h - PADDING.top - PADDING.bottom;
  const growthRate = 0.06;
  const steps = Math.min(Math.max(Math.floor(graphW / 2), 100), 400);

  // Build curve path using the exponential formula directly
  const path: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * elapsedSec;
    const mult = Math.floor(Math.exp(growthRate * t) * 100) / 100;
    const clampedMult = Math.min(mult, currentMult);

    const xRatio = t / maxTime;
    const yRatio = scaleY(clampedMult, maxMult);

    path.push({
      x: PADDING.left + xRatio * graphW,
      y: h - PADDING.bottom - yRatio * graphH,
    });
  }

  if (path.length < 2) return;

  // Draw filled area under curve
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  const lastPt = path[path.length - 1];
  ctx.lineTo(lastPt.x, h - PADDING.bottom);
  ctx.lineTo(path[0].x, h - PADDING.bottom);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, lastPt.y, 0, h - PADDING.bottom);
  const fillColor = isCrashed ? "rgba(255, 68, 68," : "rgba(0, 255, 136,";
  gradient.addColorStop(0, `${fillColor} 0.2)`);
  gradient.addColorStop(1, `${fillColor} 0.02)`);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw curve stroke
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }

  ctx.strokeStyle = isCrashed ? COLORS.crash : COLORS.curve;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  // Glow
  ctx.shadowColor = isCrashed ? COLORS.crash : COLORS.curve;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Glowing dot at tip
  if (!isCrashed) {
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.curve;
    ctx.shadowColor = COLORS.curve;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
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

function getMultiplierSteps(maxMult: number): number[] {
  const steps: number[] = [];
  if (maxMult <= 3) {
    for (let m = 1.5; m <= maxMult; m += 0.5) steps.push(m);
  } else if (maxMult <= 10) {
    for (let m = 2; m <= maxMult; m += 1) steps.push(m);
  } else if (maxMult <= 50) {
    for (let m = 5; m <= maxMult; m += 5) steps.push(m);
  } else {
    for (let m = 10; m <= maxMult; m += 10) steps.push(m);
  }
  return steps;
}

function getTimeStep(maxTime: number): number {
  if (maxTime <= 10) return 2;
  if (maxTime <= 30) return 5;
  if (maxTime <= 60) return 10;
  return 30;
}
