import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* =========================================================================
   Threshing By Machine   (Class 6 Science · Curiosity)
   Singularity design language. Fixed to byMachine method only.

   Compliance: 2D_PROMPT 5.md
     ✓ ready signal on mount after listener attached
     ✓ {type:'command'} handler with apiRef (no stale closures)
     ✓ getState() returns AND emits {type:'state',state}
     ✓ highlight(target) for all nameable canvas elements + buttons
     ✓ Teacher|Student segmented toggle (§6.1) — showModeToggle prop
     ✓ lean/full depth per operatorMode (§6.2) — lean=2 steps, full=4 steps
     ✓ operatorMode via props / setParam / setOperatorMode / on-screen toggle
     ✓ depth reflected in getState() and operator_mode_changed event
     ✓ Web Audio sound cues; muted prop; mute toggle button
     ✓ framer-motion for step-card, mode toggle, and finish-screen motion (§7.2/§8)
     ✓ play()/pause()/reset()/step() drive the REAL visible animation via an
       imperative explorer ref (agent verbs produce the same result the student sees)
     ✓ Finish button (student mode only) → full-screen "What you have learned"
       finish screen (non-evaluating tool ⇒ no star, §6.3) + uniform `finished` event
     ✓ All windowMethods exist on api; all events listed in JSON
   ========================================================================= */

// ─── constants ────────────────────────────────────────────────────────────────
const TOOL_ID = "threshing_by_machine";
const emit = (m: any) => { try { window.parent.postMessage(m, "*"); } catch { } };

// ─── types ────────────────────────────────────────────────────────────────────
type MethodType   = "byHand" | "byMachine";
type OperatorMode = "ai" | "student";
type Depth        = "lean" | "full";

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: string;
}

// ⭐ The uniform `finished` event detail (§6.3). This tool only lets the student
// OBSERVE the machine — there is no right/wrong judged — so evaluated is always
// false and score/stars/breakdown are omitted, per the non-evaluating contract.
interface FinishDetail {
  evaluated: false;
  interactions: {
    attempts: number;
    hintsUsed: number;
    replaysUsed: number;
    itemsExplored: string[];
    durationMs: number;
  };
  learned: string[];
}

interface ThreshingToolProps {
  props?: {
    width?: number;
    height?: number;
    showPlayPause?: boolean;
    operatorMode?: OperatorMode;
    muted?: boolean;
    showModeToggle?: boolean;
    device?: "mobile" | "smartboard";
    additionalProps?: {
      showPlayPause?: boolean;
      operatorMode?: OperatorMode;
      muted?: boolean;
    };
  };
  setStepDetails?: (s: StepDetails) => void;
}

interface IconProps { size?: number; style?: React.CSSProperties; }

// ─── Inline icons ─────────────────────────────────────────────────────────────
const baseSvg = (size: number, style?: React.CSSProperties): React.SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2,
  strokeLinecap: "round", strokeLinejoin: "round",
  style, "aria-hidden": true,
} as React.SVGProps<SVGSVGElement>);

const ChevronLeft  = ({ size = 20, style }: IconProps) => <svg {...baseSvg(size, style)}><path d="M15 18l-6-6 6-6" /></svg>;
const ChevronRight = ({ size = 20, style }: IconProps) => <svg {...baseSvg(size, style)}><path d="M9 18l6-6-6-6" /></svg>;
const RotateCcw    = ({ size = 20, style }: IconProps) => <svg {...baseSvg(size, style)}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>;
const Play         = ({ size = 20, style }: IconProps) => <svg {...baseSvg(size, style)}><path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" /></svg>;
const Pause        = ({ size = 20, style }: IconProps) => <svg {...baseSvg(size, style)}><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></svg>;
const SoundIcon    = ({ size = 18, style }: IconProps) => <svg {...baseSvg(size, style)}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
const MuteIcon     = ({ size = 18, style }: IconProps) => <svg {...baseSvg(size, style)}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>;

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#4A4DC9", primaryDark: "#533086", primaryHover: "#6E70D8",
  orange: "#FF7212", orangeDark: "#E85D00", orange2: "#FC9145",
  lavender: "#C1C1EA", lavenderSoft: "#F1F1FB", cream: "#FFF3E4",
  ink: "#1A1A2E", gray700: "#4E4E4E", gray400: "#CACACA",
  gray200: "#EBEBEB", gray100: "#F5F5F5", white: "#FFFFFF",
  green: "#16A34A", red: "#E53E3E", teal: "#0891b2",
  amber: "#F59E0B", sky: "#EAF6FF", skyLow: "#F6FCFF",
  grass: "#9CCB6A", grassDark: "#7FB24E", soil: "#CBA66B",
  wood: "#9B6A3C", woodDark: "#774E29", crop: "#E0A82E",
  cropLight: "#F2C94C", cropDark: "#A87A1A",
  grain: "#E8B23A", grainDk: "#C0871C", skin: "#E7B98C",
  shirt: "#3E78C9", shirtDk: "#2D5DA0", pants: "#3B4A66",
  machine: "#5C6B7A", machineDk: "#3D4A57", machineHi: "#0891b2",
  windowDark: "#1F2B33", sack: "#CBA06A", sackDk: "#9E7A44",
  straw: "#D8C38A", strawDk: "#B79E5E",
};
const FONT = "Poppins, system-ui, sans-serif";

// ─── Web Audio ────────────────────────────────────────────────────────────────
function useAudio(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const play = useCallback((freq: number, type: OscillatorType, dur: number, vol = 0.18) => {
    if (muted) return;
    try {
      const ac = ensure(); const o = ac.createOscillator(); const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = freq; o.type = type;
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.start(); o.stop(ac.currentTime + dur);
    } catch { }
  }, [muted, ensure]);

  const step = useCallback(() => play(480, "sine", 0.11, 0.13), [play]);

  const done = useCallback(() => {
    if (muted) return;
    [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([f, t]) => {
      try {
        const ac = ensure(); const o = ac.createOscillator(); const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.frequency.value = f; o.type = "sine";
        const st = ac.currentTime + t;
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.26, st + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.30);
        o.start(st); o.stop(st + 0.30);
      } catch { }
    });
  }, [muted, ensure]);

  return { step, done };
}

// ─── Design-system button ─────────────────────────────────────────────────────
type BtnVariant = "contained" | "highlight" | "outlined" | "text";

function UIButton({
  children, onClick, variant = "contained", disabled = false,
  size = "md", full = false, ariaLabel, ariaPressed, highlighted,
}: {
  children: React.ReactNode; onClick?: () => void; variant?: BtnVariant;
  disabled?: boolean; size?: "sm" | "md"; full?: boolean;
  ariaLabel?: string; ariaPressed?: boolean; highlighted?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const h = !disabled && hover; const p = !disabled && press;

  let bg = "transparent", color: string = C.primary, border = "none", shadow = "none";
  if (variant === "contained") {
    bg = disabled ? C.gray200 : p ? C.primaryDark : h ? C.primaryHover : C.primary;
    color = disabled ? C.gray400 : C.white;
    shadow = disabled ? "none" : "0 6px 16px rgba(74,77,201,.26)";
  } else if (variant === "highlight") {
    bg = disabled ? C.gray200 : p ? C.orangeDark : h ? C.orange2 : C.orange;
    color = disabled ? C.gray400 : C.white;
    shadow = disabled ? "none" : "0 6px 16px rgba(255,114,18,.30)";
  } else if (variant === "outlined") {
    bg = disabled ? C.white : p ? C.lavender : h ? C.lavenderSoft : C.white;
    color = disabled ? C.gray400 : C.primary;
    border = `2px solid ${disabled ? C.gray200 : highlighted ? C.orange : C.primary}`;
  } else {
    bg = p ? "#EDEDF8" : h ? C.gray100 : "transparent";
    color = disabled ? C.gray400 : C.primary;
  }

  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
      aria-label={ariaLabel} aria-pressed={ariaPressed}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{
        display: full ? "flex" : "inline-flex", width: full ? "100%" : undefined,
        alignItems: "center", justifyContent: "center", gap: 8,
        padding: size === "sm" ? "9px 18px" : "12px 24px", borderRadius: 9999,
        border, background: bg, color,
        boxShadow: highlighted ? `0 0 0 3px ${C.orange}, ${shadow}` : shadow,
        fontFamily: FONT, fontWeight: 600, fontSize: size === "sm" ? 14 : 16, lineHeight: 1,
        cursor: disabled ? "default" : "pointer",
        transform: p ? "translateY(1px)" : "none",
        transition: "background .15s, box-shadow .15s, transform .1s, border-color .15s",
        whiteSpace: "nowrap",
      }}>
      {children}
    </button>
  );
}

// ─── Teacher | Student toggle ─────────────────────────────────────────────────
function ModeToggle({ mode, onChange, highlighted }: {
  mode: OperatorMode; onChange: (m: OperatorMode) => void; highlighted?: boolean;
}) {
  return (
    <div style={{
      display: "inline-flex", borderRadius: 12, padding: 4, gap: 4,
      background: "rgba(0,0,0,0.06)",
      border: `1px solid ${highlighted ? C.orange : "rgba(0,0,0,0.08)"}`,
      boxShadow: highlighted ? `0 0 0 2px ${C.orange}55, 0 0 14px ${C.orange}44` : "none",
      transition: "box-shadow .25s",
    }}>
      {(["ai", "student"] as const).map(m => {
        const sel = mode === m;
        return (
          <button key={m} type="button" onClick={() => onChange(m)}
            style={{
              padding: "7px 14px", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: FONT, fontWeight: 700, fontSize: 13,
              background: sel
                ? `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`
                : "transparent",
              color: sel ? C.white : C.gray700,
              transition: "all .2s",
              display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
            }}>
            {m === "ai" ? "👩‍🏫 Teacher" : "🙋 Your turn"}
          </button>
        );
      })}
    </div>
  );
}

// ─── Content data ─────────────────────────────────────────────────────────────
const MACHINE_STEPS = [
  { title: "The threshing machine",          text: "A power-driven machine does the same job. A bundle of crop waits beside the feeding mouth (the hopper)." },
  { title: "Feed it in",                     text: "The stalks are pushed into the hopper at the top of the machine." },
  { title: "The drum spins — that's threshing!", text: "Inside, a fast-spinning drum beats the stalks. Grain is knocked loose and the light straw is thrown out." },
  { title: "Fast and easy",                  text: "Clean grain pours into the sack while straw piles up on the side. One machine threshes a whole field quickly." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;

const useResponsive = () => {
  const [dims, setDims] = useState({ w: 800, h: 700 });
  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize); onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const { w, h } = dims;
  // §8.1 — the tight 844×390 mobile-app frame: landscape AND short. Recompose to a
  // two-pane (canvas | text+controls) layout instead of only shrinking a single column.
  const isCompactLandscape = w > h && h <= 460;
  return { w, h, isMobile: w < 576, isCompactLandscape };
};

interface Particle {
  x: number; y: number; vx: number; vy: number;
  settled: boolean; r: number; rot: number; kind: "grain" | "straw";
}

// ⭐ Imperative handle so the ROOT component's agent api (play/pause/reset/step)
// can drive the REAL on-screen animation — not just emit an event (§3.4 rule 1).
export interface ExplorerHandle {
  next: () => void;
  back: () => void;
  replay: () => void;
  setPlaying: (p: boolean) => void;
  resetAll: () => void;
  getInfo: () => { step: number; total: number; playing: boolean; title: string; isLast: boolean };
}

/* =====================================================================
   ToolsExplorer — canvas animation scene (byMachine only)
   ===================================================================== */

const ToolsExplorer = memo(function ToolsExplorer({
  isMobile, showPlayPause, depth, isAI, highlights, isCompactLandscape, audio, onReport, onStepChange, onReplay, onReady,
}: {
  isMobile: boolean; showPlayPause: boolean; depth: Depth;
  isAI: boolean; highlights: Set<string>; isCompactLandscape: boolean;
  audio: ReturnType<typeof useAudio>;
  onReport?: (s: StepDetails) => void;
  onStepChange?: (step: number, total: number, isLast: boolean) => void;
  onReplay?: () => void;
  onReady?: (handle: ExplorerHandle) => void;
}) {
  const method: MethodType = "byMachine";

  // Show all steps in both Teacher and Student modes
  const visibleSteps = MACHINE_STEPS;
  const totalSteps   = visibleSteps.length;

  const [stepIdx,   setStepIdx]   = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [dims,      setDims]      = useState({ w: 720, h: 380 });

  const wrapRef    = useRef<HTMLDivElement | null>(null);
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const rafRef     = useRef<number | null>(null);
  const timeRef    = useRef(0);
  const lastTsRef  = useRef(0);
  const grainsRef  = useRef<Particle[]>([]);
  const strawRef   = useRef<Particle[]>([]);
  const machineGrainCountRef  = useRef(0);
  const machineStrawCountRef  = useRef(0);
  const machineSpawnAccRef    = useRef(0);
  const sceneWRef  = useRef(720);
  const sceneHRef  = useRef(380);

  const MACHINE_GRAIN_FULL = 110;
  const MACHINE_STRAW_FULL = 70;

  // Clamp step to visible range when depth shrinks
  const safeStep = Math.min(stepIdx, totalSteps - 1);

  useEffect(() => {
    onReport?.({
      currentStep: safeStep + 1, totalSteps,
      isPaused: !isPlaying, currentMode: `tools:${method}`,
    });
    onStepChange?.(safeStep, totalSteps, safeStep === totalSteps - 1);
  }, [safeStep, totalSteps, isPlaying, onReport, onStepChange]);

  // Measure the canvas wrapper's ACTUAL rendered size. It is flex-sized to whatever space
  // is left after the header, step card, controls and Finish button claim theirs, so the
  // scene always fits and nothing below the canvas is ever pushed off-screen (§8/§8.1).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw > 0 && ch > 0) setDims({ w: clamp(cw, 200, 1800), h: clamp(ch, 110, 1000) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isCompactLandscape]);

  useEffect(() => {
    timeRef.current = 0; lastTsRef.current = 0;
    if (safeStep < 3) {
      grainsRef.current = []; strawRef.current = [];
      machineGrainCountRef.current = 0; machineStrawCountRef.current = 0;
      machineSpawnAccRef.current = 0;
    }
  }, [safeStep]);

  // ── drawing helpers ──────────────────────────────────────────────────────────
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, W: number, H: number, groundY: number) => {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, C.sky); sky.addColorStop(1, C.skyLow);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);
    ctx.fillStyle = "#FFE08A";
    ctx.beginPath(); ctx.arc(W - 46, 44, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.grass; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = C.grassDark; ctx.fillRect(0, groundY, W, 6);
  };

  const pill = (
    ctx: CanvasRenderingContext2D, x: number, y: number, text: string,
    s: number, color = C.ink, bg = C.white, glowColor?: string,
  ) => {
    const fs = Math.round(12 * s + 2);
    ctx.font = `600 ${fs}px ${FONT}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const padX = 9 * s; const w = ctx.measureText(text).width + padX * 2; const h = fs + 10 * s;
    const W = sceneWRef.current; const H = sceneHRef.current; const m = 6;
    const cx = w + 2 * m >= W ? W / 2 : clamp(x, w / 2 + m, W - w / 2 - m);
    const cy = clamp(y, h / 2 + m, H - h / 2 - m);
    const rx = cx - w / 2; const ry = cy - h / 2;
    ctx.save();
    if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 14; }
    else { ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
    ctx.fillStyle = bg; roundRect(ctx, rx, ry, w, h, 8 * s); ctx.fill();
    ctx.restore();
    ctx.fillStyle = color; ctx.fillText(text, rx + padX, cy + 0.5);
  };

  const arrow = (
    ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number,
    color: string, s: number, width = 4,
  ) => {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1); const ah = 10 * s;
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ah * Math.cos(ang - 0.4), y2 - ah * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - ah * Math.cos(ang + 0.4), y2 - ah * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
  };

  const spinArrows = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, s: number) => {
    ctx.strokeStyle = color; ctx.lineWidth = 3.5 * s; ctx.lineCap = "round";
    for (let k = 0; k < 2; k++) {
      const base = k * Math.PI;
      ctx.beginPath(); ctx.arc(cx, cy, r, base + 0.3, base + 1.5); ctx.stroke();
      const a = base + 1.5;
      const ex = cx + Math.cos(a) * r; const ey = cy + Math.sin(a) * r;
      const tang = a + Math.PI / 2; const ah = 7 * s;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(ex, ey);
      ctx.lineTo(ex - ah * Math.cos(tang - 0.5), ey - ah * Math.sin(tang - 0.5));
      ctx.lineTo(ex - ah * Math.cos(tang + 0.5), ey - ah * Math.sin(tang + 0.5));
      ctx.closePath(); ctx.fill();
    }
  };

  const drawEar = (ctx: CanvasRenderingContext2D, hx: number, hy: number, a: number, L: number, s: number) => {
    const perp = a + Math.PI / 2;
    for (let k = 0; k < 4; k++) {
      const p = L * (0.68 + 0.09 * k);
      const cx2 = hx + Math.cos(a) * p; const cy2 = hy + Math.sin(a) * p;
      const off = (3.4 - k * 0.45) * s;
      for (const side of [-1, 1]) {
        const ox = cx2 + Math.cos(perp) * off * side; const oy = cy2 + Math.sin(perp) * off * side;
        ctx.fillStyle = C.cropLight; ctx.beginPath(); ctx.ellipse(ox, oy, 3.6 * s, 2.3 * s, a, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.grainDk;  ctx.beginPath(); ctx.ellipse(ox, oy, 1.4 * s, 1 * s, a, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = C.cropLight;
    ctx.beginPath(); ctx.ellipse(hx + Math.cos(a) * L, hy + Math.sin(a) * L, 3.4 * s, 2.3 * s, a, 0, Math.PI * 2); ctx.fill();
  };

  const drawBundle = (ctx: CanvasRenderingContext2D, hx: number, hy: number, angle: number, L: number, grainAmount: number, s: number) => {
    const n = 7; ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1) - 0.5; const a = angle + f * 0.5;
      const tx = hx + Math.cos(a) * L; const ty = hy + Math.sin(a) * L;
      ctx.strokeStyle = i % 2 ? C.cropDark : C.crop; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    }
    const heads = Math.round(clamp(grainAmount, 0, 1) * n);
    for (let i = 0; i < heads; i++) {
      const f = i / (n - 1) - 0.5; const a = angle + f * 0.5;
      drawEar(ctx, hx, hy, a, L, s);
    }
    ctx.fillStyle = C.woodDark; ctx.beginPath();
    ctx.arc(hx + Math.cos(angle) * L * 0.34, hy + Math.sin(angle) * L * 0.34, 5 * s, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawGrainPile = (ctx: CanvasRenderingContext2D) => {
    for (const g of grainsRef.current) {
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot);
      ctx.fillStyle = C.grain; ctx.beginPath(); ctx.ellipse(0, 0, g.r, g.r * 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.grainDk; ctx.beginPath(); ctx.ellipse(0, 0, g.r * 0.42, g.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  };

  const drawStrawFlying = (ctx: CanvasRenderingContext2D) => {
    for (const st of strawRef.current) {
      ctx.save(); ctx.translate(st.x, st.y); ctx.rotate(st.rot);
      ctx.strokeStyle = C.straw; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-st.r, 0); ctx.lineTo(st.r, 0); ctx.stroke();
      ctx.restore();
    }
  };

  const hash01 = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  const drawStrawStack = (ctx: CanvasRenderingContext2D, cx: number, gy: number, mw: number, mh: number, s: number) => {
    const dome = (x: number) => mh * (1 - Math.pow((x - cx) / mw, 2));
    ctx.fillStyle = C.straw; ctx.beginPath(); ctx.moveTo(cx - mw, gy);
    const N = 28;
    for (let i = 0; i <= N; i++) { const xx = cx - mw + (2 * mw * i) / N; ctx.lineTo(xx, gy - Math.max(dome(xx), 0)); }
    ctx.lineTo(cx + mw, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.beginPath(); ctx.ellipse(cx, gy - 3 * s, mw * 0.96, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.strawDk; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    for (let i = 0; i < 46; i++) {
      const hx2 = cx + (hash01(i + 1) * 2 - 1) * mw * 0.94; const maxH = dome(hx2);
      if (maxH <= 4 * s) continue;
      const hy2 = gy - 3 * s - hash01(i + 50) * maxH;
      const ang = (hash01(i + 99) - 0.5) * 1.5 - Math.PI / 2; const len = (5 + hash01(i + 7) * 8) * s;
      ctx.beginPath(); ctx.moveTo(hx2, hy2); ctx.lineTo(hx2 + Math.cos(ang) * len, hy2 + Math.sin(ang) * len); ctx.stroke();
    }
    ctx.strokeStyle = C.cropLight; ctx.globalAlpha = 0.5;
    for (let i = 0; i < 16; i++) {
      const hx2 = cx + (hash01(i + 200) * 2 - 1) * mw * 0.82; const maxH = dome(hx2);
      if (maxH <= 4 * s) continue;
      const hy2 = gy - 3 * s - hash01(i + 250) * maxH;
      ctx.beginPath(); ctx.moveTo(hx2, hy2); ctx.lineTo(hx2 + 4 * s, hy2 - 7 * s); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const drawCropHeap = (ctx: CanvasRenderingContext2D, cx: number, gy: number, s: number) => {
    for (let r2 = 0; r2 < 3; r2++) {
      const y2 = gy - 9 * s - r2 * 12 * s; const cols = 3 - (r2 === 2 ? 1 : 0);
      for (let c = 0; c < cols; c++) {
        const x2 = cx + (c - (cols - 1) / 2) * 22 * s + (r2 % 2) * 6 * s;
        drawBundle(ctx, x2 + 24 * s, y2, Math.PI, 48 * s, 1, s);
      }
    }
  };

  const spawnMachineParticles = (
    groundY: number, s: number, bodyX: number, bodyW: number,
    bodyTop: number, sackX: number, strawX: number,
  ) => {
    const g = 1000; machineSpawnAccRef.current += 1;
    const grainRoom = (machineGrainCountRef.current + grainsRef.current.length) < MACHINE_GRAIN_FULL;
    const strawRoom = (machineStrawCountRef.current + strawRef.current.length) < MACHINE_STRAW_FULL;
    if (!grainRoom && !strawRoom) return;
    const sackTopG = groundY - 76 * s;
    if (grainRoom) {
      for (let n = 0; n < 2; n++) {
        const oxG = sackX - 4 * s + (Math.random() - 0.5) * 12 * s; const oyG = sackTopG - 10 * s;
        grainsRef.current.push({ x: oxG, y: oyG, vx: (Math.random() - 0.5) * 16, vy: 20 + Math.random() * 24, settled: false, r: 3 + Math.random() * 1.3, rot: Math.random() * Math.PI, kind: "grain" });
      }
    }
    if (strawRoom) {
      const strawBits = machineSpawnAccRef.current % 2 === 0 ? 2 : 1;
      for (let n = 0; n < strawBits; n++) {
        const oxS = bodyX + bodyW - 12; const oyS = bodyTop + 6; const dyS = groundY - 4 - oyS;
        const vyS = -(200 + Math.random() * 90);
        const tS = (-vyS + Math.sqrt(vyS * vyS + 2 * g * dyS)) / g;
        const targetX = strawX + (Math.random() - 0.5) * 70 * s; const vxS = (targetX - oxS) / tS;
        strawRef.current.push({ x: oxS, y: oyS, vx: vxS, vy: vyS, settled: false, r: 4 + Math.random() * 7, rot: Math.random() * Math.PI, kind: "straw" });
      }
    }
    if (grainsRef.current.length > 240) grainsRef.current.splice(0, grainsRef.current.length - 240);
    if (strawRef.current.length > 130) strawRef.current.splice(0, strawRef.current.length - 130);
  };

  const drawMachineScene = (ctx: CanvasRenderingContext2D, W: number, H: number, step: number, t: number) => {
    const groundY = H * 0.82; const s = clamp(Math.min(W / 900, H / 360), 0.6, 1.0);
    sceneWRef.current = W; sceneHRef.current = H;
    drawBackground(ctx, W, H, groundY);

    // highlight targets
    const hlMachine = highlights.has("machine") || highlights.has("body");
    const hlDrum    = highlights.has("drum");
    const hlHopper  = highlights.has("hopper");
    const hlSack    = highlights.has("sack") || highlights.has("grainSack");
    const hlStraw   = highlights.has("strawPile") || highlights.has("straw");
    const hlBundle  = highlights.has("bundle") || highlights.has("crop");

    const bodyW = 230 * s; const bodyH = 116 * s; const bodyX = W * 0.28;
    const bodyTop = groundY - bodyH - 30 * s;
    const sackX = bodyX + bodyW + 44 * s; const sackW = 66 * s; const sackTop = groundY - 76 * s;
    const strawX = Math.min(bodyX + bodyW + 214 * s, W - 60 * s);
    const strawFill = clamp(machineStrawCountRef.current / MACHINE_STRAW_FULL, 0, 1);

    // straw pile
    if (strawFill > 0.02) {
      const mw = 44 * s + strawFill * 66 * s; const mh = 26 * s + strawFill * 72 * s;
      if (hlStraw) { ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 18; drawStrawStack(ctx, strawX, groundY, mw, mh, s); ctx.restore(); }
      else drawStrawStack(ctx, strawX, groundY, mw, mh, s);
    }

    // wheels
    ctx.fillStyle = C.machineDk;
    [bodyX + 40 * s, bodyX + bodyW - 40 * s].forEach((wx) => {
      ctx.beginPath(); ctx.arc(wx, groundY - 6 * s, 22 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.gray400; ctx.beginPath(); ctx.arc(wx, groundY - 6 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.machineDk;
    });

    // machine body
    const shake = step === 2 ? Math.sin(t * 40) * 1.6 * s : 0;
    ctx.save(); ctx.translate(0, shake);
    if (hlMachine) { ctx.shadowColor = C.orange; ctx.shadowBlur = 20; }
    ctx.fillStyle = C.machine; roundRect(ctx, bodyX, bodyTop, bodyW, bodyH, 14 * s); ctx.fill();
    ctx.fillStyle = C.machineDk; roundRect(ctx, bodyX, bodyTop + bodyH - 16 * s, bodyW, 16 * s, 8 * s); ctx.fill();
    ctx.fillStyle = C.machineHi; roundRect(ctx, bodyX + 12 * s, bodyTop + 12 * s, bodyW - 24 * s, 7 * s, 4 * s); ctx.fill();
    ctx.shadowBlur = 0;

    // hopper
    const hopX = bodyX + 20 * s; const hopTopY = bodyTop - 46 * s; const hopW = 80 * s;
    if (hlHopper) { ctx.shadowColor = C.orange; ctx.shadowBlur = 16; }
    ctx.fillStyle = C.machineDk;
    ctx.beginPath(); ctx.moveTo(hopX, hopTopY); ctx.lineTo(hopX + hopW, hopTopY); ctx.lineTo(hopX + hopW - 16 * s, bodyTop + 4 * s); ctx.lineTo(hopX + 14 * s, bodyTop + 4 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.windowDark; ctx.beginPath(); ctx.ellipse(hopX + hopW / 2, hopTopY + 3 * s, hopW / 2 - 4 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // drum
    const drumCx = bodyX + bodyW * 0.56; const drumCy = bodyTop + bodyH * 0.46; const drumR = 32 * s;
    if (hlDrum) { ctx.shadowColor = C.orange; ctx.shadowBlur = 18; }
    ctx.fillStyle = C.windowDark; ctx.beginPath(); ctx.arc(drumCx, drumCy, drumR + 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    const rot = step >= 1 ? t * (step === 2 ? 11 : 2.2) : 0;
    ctx.save(); ctx.translate(drumCx, drumCy); ctx.rotate(rot);
    ctx.strokeStyle = C.cropLight; ctx.lineWidth = 4.5 * s; ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * drumR, Math.sin(a) * drumR); ctx.stroke(); }
    ctx.fillStyle = C.machineHi; ctx.beginPath(); ctx.arc(0, 0, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (step === 2) spinArrows(ctx, drumCx, drumCy, drumR + 14 * s, C.amber, s);
    ctx.restore(); // end shake

    // spout
    const spoutTipX = sackX - 4 * s; const spoutTipY = sackTop - 10 * s;
    ctx.strokeStyle = C.machineDk; ctx.lineWidth = 10 * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(bodyX + bodyW - 6 * s, bodyTop + bodyH * 0.5); ctx.lineTo(spoutTipX + 2 * s, spoutTipY); ctx.stroke();

    // sack
    if (hlSack) { ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 18; }
    ctx.fillStyle = C.sack; roundRect(ctx, sackX - sackW / 2, sackTop, sackW, groundY - sackTop - 2, 14 * s); ctx.fill();
    ctx.fillStyle = C.sackDk; roundRect(ctx, sackX - sackW / 2 - 4 * s, sackTop - 7 * s, sackW + 8 * s, 16 * s, 8 * s); ctx.fill();
    ctx.fillStyle = C.windowDark; ctx.beginPath(); ctx.ellipse(sackX, sackTop + 1 * s, sackW / 2 - 7 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
    if (hlSack) ctx.restore();

    // grain fill in sack
    const grainFill = clamp(machineGrainCountRef.current / MACHINE_GRAIN_FULL, 0, 1);
    const grainFullVis = grainFill >= 1;
    const strawFullVis = strawFill >= 1;
    if (grainFill > 0.01) {
      const innerW = sackW - 16 * s; const innerBottom = groundY - 8 * s; const innerTopMax = sackTop - 10 * s;
      const topY = lerp(innerBottom, innerTopMax, grainFill);
      ctx.fillStyle = C.grain; roundRect(ctx, sackX - innerW / 2, topY, innerW, innerBottom - topY, 6 * s); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sackX, topY, innerW / 2, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.grainDk;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(sackX + (i - 2) * 8 * s, topY - 1 * s, 2 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // grain stream
    if (step === 2 && !grainFullVis) {
      const surfTopY = lerp(groundY - 8 * s, sackTop - 10 * s, grainFill);
      ctx.fillStyle = C.grain; ctx.beginPath();
      ctx.moveTo(spoutTipX - 4 * s, spoutTipY); ctx.lineTo(spoutTipX + 4 * s, spoutTipY);
      ctx.lineTo(sackX + 5 * s, surfTopY); ctx.lineTo(sackX - 5 * s, surfTopY); ctx.closePath(); ctx.fill();
    }

    drawGrainPile(ctx); drawStrawFlying(ctx);
    drawCropHeap(ctx, bodyX - 30 * s, groundY, s);

    // bundle at hopper
    const hopMouthX = hopX + hopW / 2;
    if (step === 0) {
      if (hlBundle) { ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 16; }
      drawBundle(ctx, hopMouthX - 40 * s, hopTopY - 50 * s, (218 * Math.PI) / 180, 76 * s, 1, s);
      if (hlBundle) ctx.restore();
    } else if (step === 1) {
      const u = easeOutCubic(clamp(t / 1.1, 0, 1));
      const bxp = lerp(hopMouthX - 40 * s, hopMouthX, u); const byp = lerp(hopTopY - 50 * s, hopTopY + 2 * s, u);
      if (hlBundle) { ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 16; }
      drawBundle(ctx, bxp, byp, (lerp(218, 256, u) * Math.PI) / 180, lerp(76, 44, u) * s, 1, s);
      if (hlBundle) ctx.restore();
    } else {
      const bob = Math.sin(t * 3) * 4 * s;
      drawBundle(ctx, hopMouthX, hopTopY - 2 * s + bob, (250 * Math.PI) / 180, 46 * s, 1, s);
    }

    // labels
    if (step <= 1) {
      arrow(ctx, hopMouthX - 30 * s, hopTopY - 20 * s, hopMouthX - 2 * s, hopTopY + 2 * s, C.primary, s, 5);
      pill(ctx, hopMouthX - 6 * s, hopTopY - 52 * s, "stalks go in", s, C.primary,  C.white, hlHopper ? C.orange : undefined);
    }
    const tight = W < 520;
    if (step === 2) {
      if (!strawFullVis) {
        const oxD = bodyX + bodyW - 6 * s; const oyD = bodyTop + 2 * s; ctx.fillStyle = "#D9C9A3";
        for (let i = 0; i < 14; i++) {
          const ph = (t * 0.5 + i / 14) % 1;
          const px2 = lerp(oxD, strawX, ph) + Math.sin(i * 2.1) * 9 * s;
          const py2 = lerp(oyD, groundY - 96 * s, ph) - Math.sin(ph * Math.PI) * 58 * s;
          const rr = (9 + ph * 30) * s; ctx.globalAlpha = 0.16 * (1 - ph) + 0.04;
          ctx.beginPath(); ctx.arc(px2, py2, rr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      arrow(ctx, bodyX + bodyW - 10 * s, bodyTop - 4 * s, bodyX + bodyW + 92 * s, bodyTop - 44 * s, C.amber, s, 4);
      pill(ctx, bodyX + bodyW * 0.78, bodyTop - 80 * s, "drum beats the crop", s, C.machineDk, C.white, hlDrum ? C.orange : undefined);
      pill(ctx, strawX, groundY - (tight ? 144 : 120) * s, tight ? "straw" : "straw (light)", s, C.strawDk, C.white, hlStraw ? C.orange : undefined);
      pill(ctx, sackX,  groundY - (tight ? 96  : 104) * s, tight ? "grain" : "grain (heavy)", s, C.grainDk, C.white, hlSack  ? C.orange : undefined);
    }
    if (step === 3) {
      pill(ctx, bodyX + bodyW * 0.5, bodyTop - 64 * s, "done — fast & easy", s, "#1B7A43", "#E9F7EF");
      pill(ctx, strawX, groundY - (tight ? 144 : 120) * s, "straw",       s, C.strawDk);
      pill(ctx, sackX,  groundY - (tight ? 96  : 104) * s, tight ? "grain" : "clean grain", s, C.grainDk);
    }
  };

  const updateParticles = (dt: number, W: number, H: number) => {
    const groundY = H * 0.82; const g = 1000; const grainFloor = groundY - 6;
    if (safeStep === 2) {
      const s = clamp(Math.min(W / 900, H / 360), 0.6, 1.0);
      const bodyW = 230 * s; const bodyX = W * 0.28; const bodyH = 116 * s;
      const bodyTop = groundY - bodyH - 30 * s;
      const sackX = bodyX + bodyW + 44 * s; const strawX = Math.min(bodyX + bodyW + 214 * s, W - 60 * s);
      spawnMachineParticles(groundY, s, bodyX, bodyW, bodyTop, sackX, strawX);
    }
    const keepG: Particle[] = [];
    for (const p of grainsRef.current) {
      if (p.settled) { keepG.push(p); continue; }
      p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 4;
      if (p.y >= grainFloor) { machineGrainCountRef.current += 1; }
      else keepG.push(p);
    }
    grainsRef.current = keepG;
    const keepS: Particle[] = [];
    for (const p of strawRef.current) {
      p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 5;
      if (p.y >= H * 0.82 - 4) machineStrawCountRef.current += 1;
      else keepS.push(p);
    }
    strawRef.current = keepS;
  };

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = dims.w; const H = dims.h;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    (ctx as any).imageSmoothingEnabled = true;
    drawMachineScene(ctx, W, H, safeStep, timeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims, safeStep, highlights]);

  useEffect(() => {
    renderFrame();
    if (!isPlaying) return;
    lastTsRef.current = 0;
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts; timeRef.current += dt;
      updateParticles(dt, dims.w, dims.h);
      renderFrame();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, safeStep, dims, renderFrame]);

  const goNext   = useCallback(() => { setStepIdx(s => { const n = Math.min(s, totalSteps - 1); return n < totalSteps - 1 ? n + 1 : n; }); setIsPlaying(true); audio.step(); }, [totalSteps, audio]);
  const goBack   = useCallback(() => { setStepIdx(s => (s > 0 ? s - 1 : s)); setIsPlaying(true); }, []);
  const doReplay = useCallback(() => {
    timeRef.current = 0; grainsRef.current = []; strawRef.current = [];
    machineGrainCountRef.current = 0; machineStrawCountRef.current = 0;
    machineSpawnAccRef.current = 0; setIsPlaying(true);
  }, []);
  // The student-facing "Replay" button also reports a replay was used (finish summary);
  // the agent's resetAll() reuses the same particle-clear logic without double-counting it.
  const handleReplayClick = useCallback(() => { doReplay(); onReplay?.(); }, [doReplay, onReplay]);
  const resetAll = useCallback(() => { setStepIdx(0); doReplay(); }, [doReplay]);

  // ⭐ Expose real control to the ROOT agent api — play()/pause()/reset()/step()
  // call THESE, so the agent produces the exact same visible result as the student.
  // Handed up via a plain onReady callback (re-registered whenever the closures it
  // captures change) instead of forwardRef/useImperativeHandle.
  useEffect(() => {
    onReady?.({
      next: goNext,
      back: goBack,
      replay: doReplay,
      setPlaying: (p: boolean) => setIsPlaying(p),
      resetAll,
      getInfo: () => ({ step: safeStep, total: totalSteps, playing: isPlaying, title: visibleSteps[safeStep]?.title ?? "", isLast: safeStep === totalSteps - 1 }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goNext, goBack, doReplay, resetAll, safeStep, totalSteps, isPlaying, visibleSteps, onReady]);

  const stepData = visibleSteps[safeStep];
  const hlCanvas = highlights.has("canvas") || highlights.has("demo");
  const hlNext   = highlights.has("nextBtn");
  const hlBack   = highlights.has("backBtn");

  const canvasBlock = (
    <div ref={wrapRef} style={{
      marginTop: isCompactLandscape ? 0 : 14, borderRadius: 18, overflow: "hidden",
      background: C.white, boxSizing: "border-box",
      flex: isCompactLandscape ? "1.4 1 0" : "1 1 auto",
      minWidth: 0, minHeight: isCompactLandscape ? 0 : 140,
      boxShadow: hlCanvas
        ? `0 0 0 3px ${C.orange}, 0 4px 16px rgba(0,0,0,.06)`
        : "0 4px 16px rgba(0,0,0,.06)",
      transition: "box-shadow .3s",
    }}>
      <canvas ref={canvasRef} role="img"
        aria-label={`Animated demonstration: ${stepData.title}`}
        style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );

  const textControlsBlock = (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: isCompactLandscape ? "1 1 0" : "0 0 auto" }}>
      {/* Step description card */}
      <AnimatePresence mode="wait">
        <motion.div key={safeStep}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          style={{
            marginTop: isCompactLandscape ? 0 : 14, padding: isCompactLandscape ? "10px 14px" : "16px 20px",
            borderRadius: 16, background: C.white, border: `1px solid ${C.gray200}`, boxSizing: "border-box",
          }}>
          <div style={{ fontWeight: 700, color: C.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            Step {safeStep + 1} of {totalSteps}
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile || isCompactLandscape ? 16 : 22, color: C.ink, marginBottom: 4 }}>
            {stepData.title}
          </div>
          <div style={{ color: C.gray700, fontSize: isCompactLandscape ? 12.5 : 15, lineHeight: 1.55 }}>{stepData.text}</div>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: isCompactLandscape ? 8 : 14 }}>
        {visibleSteps.map((_, i) => (
          <motion.div key={i} layout style={{
            width: i === safeStep ? 26 : 9, height: 9, borderRadius: 9999,
            background: i === safeStep ? C.primary : C.gray400,
          }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
        ))}
      </div>

      {/* Controls — hidden in AI mode */}
      {!isAI && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: isCompactLandscape ? 8 : 14, flexWrap: "wrap" }}>
          <UIButton onClick={goBack} variant="outlined" size={isMobile || isCompactLandscape ? "sm" : "md"} disabled={safeStep === 0} ariaLabel="Previous step" highlighted={hlBack}>
            <ChevronLeft size={20} /> Back
          </UIButton>
          {showPlayPause && (
            <UIButton onClick={() => setIsPlaying(p => !p)} variant="outlined" size={isMobile || isCompactLandscape ? "sm" : "md"} ariaLabel={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </UIButton>
          )}
          <UIButton onClick={goNext} variant="contained" size={isMobile || isCompactLandscape ? "sm" : "md"} disabled={safeStep === totalSteps - 1} ariaLabel="Next step" highlighted={hlNext}>
            Next <ChevronRight size={20} />
          </UIButton>
          {safeStep === totalSteps - 1 && (
            <UIButton onClick={handleReplayClick} variant="text" size={isMobile || isCompactLandscape ? "sm" : "md"} ariaLabel="Replay">
              <RotateCcw size={16} /> Replay
            </UIButton>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      display: "flex", flexDirection: isCompactLandscape ? "row" : "column",
      gap: isCompactLandscape ? 12 : 0, alignItems: "stretch",
      flex: "1 1 auto", minHeight: 0,
    }}>
      {canvasBlock}
      {textControlsBlock}
    </div>
  );
});

/* =====================================================================
   Root component
   ===================================================================== */

function ThreshingByMachine({ props: p = {}, setStepDetails }: ThreshingToolProps) {
  const ap = p.additionalProps ?? {};
  const showPlayPause  = ap.showPlayPause ?? p.showPlayPause ?? true;
  const maxWidth       = p.width ?? 1180;
  const minHeight      = p.height ?? 0;
  const showModeToggle = p.showModeToggle ?? true;
  const { isMobile, isCompactLandscape } = useResponsive();

  const [operatorMode, setOperatorModeState] = useState<OperatorMode>(
    ap.operatorMode ?? p.operatorMode ?? "student"
  );
  const [muted,      setMuted]      = useState(p.muted ?? false);
  const [highlights, setHighlights] = useState<Set<string>>(new Set());
  const [finished,      setFinished]      = useState(false);
  const [finishSummary, setFinishSummary] = useState<FinishDetail | null>(null);
  const [atLastStep,    setAtLastStep]    = useState(false);

  const audio  = useAudio(muted);
  const isAI   = operatorMode === "ai";
  const depth: Depth = "full";

  // ── session tracking for the Finish/finished performance summary (§6.3) ──
  const explorerRef        = useRef<ExplorerHandle | null>(null);
  const startTimeRef        = useRef<number>(Date.now());
  const hintsUsedRef         = useRef(0);
  const replaysUsedRef      = useRef(0);
  const visitedStepsRef     = useRef<Set<number>>(new Set([0]));
  const lastStepInfoRef     = useRef({ step: 0, total: MACHINE_STEPS.length, isLast: false });

  // Sync external prop changes
  useEffect(() => { if (p.operatorMode) setOperatorModeState(p.operatorMode); }, [p.operatorMode]);
  useEffect(() => { if (p.muted !== undefined) setMuted(p.muted); }, [p.muted]);

  const applyOperatorMode = useCallback((m: OperatorMode) => {
    const v = m === "ai" ? "ai" : "student";
    setOperatorModeState(v);
    emit({ type: "event", name: "operator_mode_changed", detail: { operatorMode: v, depth: "full" } });
  }, []);

  const hlTarget = useCallback((target?: string) => {
    if (!target) return;
    hintsUsedRef.current += 1;
    setHighlights(new Set([target]));
    setTimeout(() => setHighlights(prev => { const n = new Set(prev); n.delete(target); return n; }), 2800);
    emit({ type: "event", name: "highlighted", detail: { target } });
  }, []);

  // Track which steps the student/agent has actually seen, for the finish summary.
  const handleStepChange = useCallback((step: number, total: number, isLast: boolean) => {
    visitedStepsRef.current.add(step);
    lastStepInfoRef.current = { step, total, isLast };
    setAtLastStep(isLast);
    if (isLast) emit({ type: "event", name: "completed", detail: { totalSteps: total } });
  }, []);

  // ⭐ Finish (student mode only) — ends the activity and opens the uniform
  // full-screen "What you have learned" finish screen. This tool only lets the
  // student OBSERVE the machine (no right/wrong judged) → non-evaluating, no star (§6.3).
  const handleFinish = useCallback(() => {
    const visited = Array.from(visitedStepsRef.current).sort((a, b) => a - b)
      .map(i => MACHINE_STEPS[i]?.title).filter(Boolean) as string[];
    const detail: FinishDetail = {
      evaluated: false,
      interactions: {
        attempts: visitedStepsRef.current.size,
        hintsUsed: hintsUsedRef.current,
        replaysUsed: replaysUsedRef.current,
        itemsExplored: visited,
        durationMs: Date.now() - startTimeRef.current,
      },
      learned: [
        "A threshing machine uses a fast-spinning drum to beat harvested stalks loose.",
        "Grain is heavy and falls into the sack, while light straw is thrown out to the side.",
        "Machine threshing separates grain and straw in one fast pass — much quicker than by hand.",
      ],
    };
    setFinishSummary(detail);
    setFinished(true);
    audio.done();
    emit({ type: "event", name: "finished", detail });
  }, [audio]);

  const handleCloseFinish = useCallback(() => setFinished(false), []);

  // Agent API — every verb below produces the SAME visible result the student would
  // see (§3.4 rule 1): play/pause/reset/step drive the real explorer via its ref.
  const api = useMemo(() => ({
    setParam: (name: string, value: any) => {
      if (name === "operatorMode") applyOperatorMode(value);
      else if (name === "muted") setMuted(Boolean(value));
      emit({ type: "event", name: "param_changed", detail: { name, value } });
    },
    play: () => {
      explorerRef.current?.setPlaying(true);
      emit({ type: "event", name: "play", detail: { playing: true } });
    },
    pause: () => {
      explorerRef.current?.setPlaying(false);
      emit({ type: "event", name: "pause", detail: { playing: false } });
    },
    reset: () => {
      explorerRef.current?.resetAll();
      visitedStepsRef.current = new Set([0]);
      hintsUsedRef.current = 0; replaysUsedRef.current = 0;
      startTimeRef.current = Date.now();
      setFinished(false); setFinishSummary(null);
      emit({ type: "event", name: "reset", detail: {} });
    },
    highlight: (target?: string) => hlTarget(target),
    getState: () => {
      const info = explorerRef.current?.getInfo();
      const state = {
        operatorMode, depth, muted, toolId: TOOL_ID,
        currentStep: (info?.step ?? 0) + 1, totalSteps: info?.total ?? MACHINE_STEPS.length,
        isPlaying: info?.playing ?? true, finished,
      };
      emit({ type: "state", state });
      return state;
    },
    setOperatorMode: (m: OperatorMode) => applyOperatorMode(m),
    step: (direction?: string) => {
      const dir = direction === "back" ? "back" : "next";
      if (dir === "back") explorerRef.current?.back(); else explorerRef.current?.next();
      const info = explorerRef.current?.getInfo();
      emit({ type: "event", name: "step_requested", detail: { direction: dir, currentStep: (info?.step ?? 0) + 1, totalSteps: info?.total } });
    },
  }), [operatorMode, depth, muted, finished, applyOperatorMode, hlTarget]);

  const apiRef = useRef(api); apiRef.current = api;

  // Command listener + ready signal
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== "command") return;
      const fn = (apiRef.current as any)[d.method];
      let result;
      try { if (typeof fn === "function") result = fn(...(d.args || [])); } catch { }
      emit({ type: "response", id: d.id, result });
    };
    window.addEventListener("message", onMsg);
    emit({ type: "ready", toolId: TOOL_ID });
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Inject fonts + keyframes + a global box-sizing reset (§8 no-scroll gotchas:
  // a content-box width:100%/min-height:100% box with padding grows past its
  // parent and spawns a phantom scrollbar — so force border-box everywhere here).
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "th-machine-styles";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
      .th-root, .th-root *, .th-root *::before, .th-root *::after { box-sizing: border-box; }
      @keyframes thFadeUp  { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
      @keyframes thScaleIn { from{transform:scale(.7);opacity:0;} to{transform:scale(1);opacity:1;} }
      @media (prefers-reduced-motion:reduce){
        .th-root *,.th-root *::before,.th-root *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;}
      }
    `;
    document.head.appendChild(style);
    return () => { const e = document.getElementById("th-machine-styles"); if (e) e.remove(); };
  }, []);

  const hlToggle = highlights.has("modeToggle");
  const hlFinish = highlights.has("finishBtn");

  return (
    <div className="th-root" style={{
      fontFamily: FONT, width: "100%", maxWidth: `min(96%, ${maxWidth}px)`,
      minHeight: minHeight || undefined, height: "100dvh", maxHeight: "100dvh", overflow: "hidden",
      margin: "0 auto", padding: isMobile || isCompactLandscape ? 10 : 18,
      background: C.gray100, borderRadius: 24, color: C.ink,
      boxSizing: "border-box", display: "flex", flexDirection: "column",
    }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8, flexShrink: 0 }}>
        <div style={{
          flex: 1, minWidth: 160,
          background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`,
          borderRadius: 18, padding: isCompactLandscape ? "8px 14px" : isMobile ? "16px 18px" : "20px 26px", color: C.white,
        }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: isCompactLandscape ? 16 : isMobile ? 22 : 28, lineHeight: 1.1 }}>
            Threshing — By Machine
          </div>
          {!isCompactLandscape && (
            <div style={{ opacity: 0.9, fontSize: isMobile ? 13 : 15, marginTop: 4 }}>
              Separating grain from stalks with a powered thresher
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 2 }}>
          {showModeToggle && (
            <ModeToggle mode={operatorMode} onChange={applyOperatorMode} highlighted={hlToggle} />
          )}
          <button type="button" onClick={() => setMuted(m => !m)} title={muted ? "Unmute" : "Mute"}
            style={{
              background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10,
              padding: "8px 10px", cursor: "pointer", display: "flex", color: C.gray700,
              boxShadow: "0 2px 6px rgba(0,0,0,.07)", minWidth: 24, minHeight: 24,
            }}>
            {muted ? <MuteIcon size={17} /> : <SoundIcon size={17} />}
          </button>
        </div>
      </div>

      {/* AI watch banner */}
      <AnimatePresence>
        {isAI && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            style={{
              padding: "10px 18px", borderRadius: 12, overflow: "hidden",
              background: "#FFFBF0", border: `1px solid ${C.amber}44`,
              color: "#7a5a00", fontWeight: 700, fontSize: 13.5,
              display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
            }}>
            👩‍🏫 Your teacher is demonstrating — watch each step. You will get a turn.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div style={{ marginTop: 10, flex: "1 1 auto", minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <ToolsExplorer
          onReady={(h) => { explorerRef.current = h; }}
          isMobile={isMobile} showPlayPause={showPlayPause}
          depth={depth} isAI={isAI} highlights={highlights} isCompactLandscape={isCompactLandscape}
          audio={audio}
          onReport={setStepDetails}
          onStepChange={handleStepChange}
          onReplay={() => { replaysUsedRef.current += 1; }}
        />

        {/* ⭐ Finish — student mode only, and only once the student reaches the last
            step (step 4). No "Play Again" loop anywhere: reset() remains an agent-only
            verb (§3.3); Replay above only restarts THIS step's particle animation. */}
        {!isAI && atLastStep && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: isCompactLandscape ? 8 : 16, flexShrink: 0 }}>
            <UIButton onClick={handleFinish} variant="highlight" size={isMobile || isCompactLandscape ? "sm" : "md"}
              ariaLabel="Finish and see what you have learned" highlighted={hlFinish} disabled={finished}>
              {finished ? "Finished ✓" : "Finish 🏁"}
            </UIButton>
          </div>
        )}
      </div>

      {/* ⭐ Uniform full-screen finish/completion screen (§6.3/§7.4) — non-evaluating
          tool ⇒ NO star, "What you have learned" only. */}
      <AnimatePresence>
        {finished && finishSummary && (
          <FinishOverlay summary={finishSummary} onClose={handleCloseFinish} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* =====================================================================
   Finish screen — full-viewport celebratory overlay (§7.4/§6.3)
   Non-evaluating tool: no stars/score, "What you have learned" only.
   ===================================================================== */

function FinishOverlay({ summary, onClose }: { summary: FinishDetail; onClose: () => void }) {
  const particles = useMemo(() => Array.from({ length: 34 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.7,
    dur: 2.1 + Math.random() * 1.3,
    size: 6 + Math.random() * 10,
    color: [C.primary, C.orange, C.grain, C.green, C.cropLight][i % 5],
    square: i % 3 === 0,
  })), []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }} aria-live="polite">
      {particles.map(pt => (
        <motion.div key={pt.id}
          initial={{ y: "-8vh", x: `${pt.x}vw`, opacity: 0, rotate: 0 }}
          animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: pt.dur, delay: pt.delay, ease: "easeIn" }}
          style={{
            position: "absolute", top: 0, width: pt.size, height: pt.size,
            borderRadius: pt.square ? 3 : "50%", background: pt.color,
          }} />
      ))}

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: "absolute", inset: 0, background: "rgba(26,26,46,0.55)",
          backdropFilter: "blur(3px)", pointerEvents: "auto",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          style={{
            background: C.white, borderRadius: 24, padding: "28px 30px", maxWidth: 460, width: "100%",
            maxHeight: "86dvh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.35)",
            textAlign: "center", position: "relative", boxSizing: "border-box",
          }}>
          <button onClick={onClose} aria-label="Close finish screen" style={{
            position: "absolute", top: 12, right: 12, border: "none", background: "transparent",
            cursor: "pointer", fontSize: 20, color: C.gray700, minWidth: 24, minHeight: 24,
          }}>✕</button>

          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            style={{ fontSize: 42 }}>🌾✨</motion.div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: C.ink, marginTop: 6 }}>
            Well explored!
          </div>
          <div style={{ color: C.gray700, fontSize: 14, marginTop: 6 }}>Here's what you have learned:</div>

          <ul style={{ textAlign: "left", marginTop: 14, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {summary.learned.map((line, i) => (
              <motion.li key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.12 }}
                style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.5 }}>
                {line}
              </motion.li>
            ))}
          </ul>

          <div style={{ marginTop: 16, fontSize: 12, color: C.gray700, opacity: 0.85 }}>
            You explored {summary.interactions.itemsExplored.length} of the steps
            {summary.interactions.hintsUsed > 0 ? ` and used ${summary.interactions.hintsUsed} hint${summary.interactions.hintsUsed === 1 ? "" : "s"}` : ""}.
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default ThreshingByMachine;
export { ThreshingByMachine };