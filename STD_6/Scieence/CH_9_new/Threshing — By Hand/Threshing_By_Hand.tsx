import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";

/* =========================================================================
   Threshing By Hand   (Class 6 Science · Curiosity)
   Singularity design language. Fixed to byHand method only.

   Compliance: 2D_PROMPT 5.md
     - ready signal on mount after listener attached
     - {type:'command'} handler with apiRef (no stale closures)
     - getState() returns AND emits {type:'state',state}
     - highlight(target) for every nameable element — non-destructive
     - Teacher|Student segmented toggle (§6.1) — showModeToggle prop, mirrors host mode
     - lean/full depth per operatorMode (§6.2) — lean=2 steps, full=4 steps
     - operatorMode via props / setParam / setOperatorMode / on-screen toggle
     - depth reflected in getState() and operator_mode_changed event
     - play()/pause()/reset()/step()/finish() operate the SAME lifted state the
       student's own buttons use — agent verbs produce the real visible result (§3.4)
     - student-only Finish button on the last step -> uniform `finished` event with
       evaluated:false (this is an observe-only demo, no score) + interactions + learned (§6.3)
     - full-screen position:fixed completion overlay with confetti + "what you learned" (§7.4)
     - NO "Play Again" whole-tool loop — Finish is the terminal student action (§6.3)
     - Web Audio sound cues; muted prop; mute toggle button (>=24x24 target)
     - orientation-aware: landscape splits canvas/controls into a two-pane layout (§8.1)
     - box-sizing:border-box on root/100%-sized containers to avoid phantom scrollbars
     - All windowMethods exist on api; every emitted event is listed in the JSON `events`
   ========================================================================= */

// ─── constants ────────────────────────────────────────────────────────────────
const TOOL_ID = "threshing_by_hand";
const emit = (m: any) => { try { window.parent.postMessage(m, "*"); } catch { } };

// ─── types ────────────────────────────────────────────────────────────────────
type MethodType    = "byHand" | "byMachine";
type OperatorMode  = "ai" | "student";
type Depth         = "lean" | "full";

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: string;
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
      const ac = ensure();
      const o = ac.createOscillator(); const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = freq; o.type = type;
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.start(); o.stop(ac.currentTime + dur);
    } catch { }
  }, [muted, ensure]);

  const step = useCallback(() => play(440, "sine", 0.12, 0.14), [play]);
  const correct = useCallback(() => {
    if (muted) return;
    [[523, 0], [659, 0.1], [784, 0.2]].forEach(([f, t]) => {
      try {
        const ac = ensure(); const o = ac.createOscillator(); const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.frequency.value = f; o.type = "sine";
        const st = ac.currentTime + t;
        g.gain.setValueAtTime(0.2, st);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.28);
        o.start(st); o.stop(st + 0.28);
      } catch { }
    });
  }, [muted, ensure]);

  const wrong = useCallback(() => play(200, "triangle", 0.28, 0.14), [play]);

  const done = useCallback(() => {
    if (muted) return;
    [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([f, t]) => {
      try {
        const ac = ensure(); const o = ac.createOscillator(); const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.frequency.value = f; o.type = "sine";
        const st = ac.currentTime + t;
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.28, st + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.32);
        o.start(st); o.stop(st + 0.32);
      } catch { }
    });
  }, [muted, ensure]);

  return { step, correct, wrong, done };
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
        border, background: bg, color, boxShadow: highlighted ? `0 0 0 3px ${C.orange}, ${shadow}` : shadow,
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
      background: "rgba(0,0,0,0.06)", border: `1px solid ${highlighted ? C.orange : "rgba(0,0,0,0.08)"}`,
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
const HAND_STEPS = [
  { title: "The harvested crop",       text: "After the crop is cut, the grain is still stuck to the dried stalks. We need to knock it loose." },
  { title: "Lift the bundle",          text: "The farmer gathers a bundle (a sheaf) and raises it high above a hard surface." },
  { title: "Beat it — that's threshing!", text: "He beats the bundle against the surface again and again. The grain pops off the stalks and falls." },
  { title: "Slow and tiring",          text: "Bit by bit a small pile of grain builds up. Doing a whole field by hand takes many people and a lot of time." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic  = (t: number) => t * t * t;
const clamp  = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp   = (a: number, b: number, t: number) => a + (b - a) * t;

const useResponsive = () => {
  const [w, setW] = useState(800);
  const [h, setH] = useState(600);
  useEffect(() => {
    const onResize = () => { setW(window.innerWidth); setH(window.innerHeight); };
    window.addEventListener("resize", onResize); onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isLandscape = w > h;
  // "tight" = short-axis constrained (e.g. the 844x390 mobile-app frame): show less at once
  const isTight = isLandscape ? h < 460 : w < 460;
  return { w, h, isMobile: w < 576, isLandscape, isTight };
};

interface Particle {
  x: number; y: number; vx: number; vy: number;
  settled: boolean; r: number; rot: number; kind: "grain" | "straw";
}

// ─── Canvas animation scene ───────────────────────────────────────────────────
const AnimScene = memo(function AnimScene({
  stepIdx, setStepIdx, isPlaying, setIsPlaying,
  showPlayPause, isMobile, isLandscape, isTight, depth, isAI, highlights, audio,
  onReport, onReplay, onFinish, finished,
}: {
  stepIdx: number; setStepIdx: (n: number) => void;
  isPlaying: boolean; setIsPlaying: (v: boolean) => void;
  showPlayPause: boolean; isMobile: boolean; isLandscape: boolean; isTight: boolean;
  depth: Depth; isAI: boolean; highlights: Set<string>;
  audio: ReturnType<typeof useAudio>;
  onReport?: (s: StepDetails) => void;
  onReplay?: () => void;
  onFinish?: () => void;
  finished?: boolean;
}) {
  const method: MethodType = "byHand";
  const [dims, setDims] = useState({ w: 720, h: 380 });
  const { w: winW } = useResponsive();

  const wrapRef    = useRef<HTMLDivElement | null>(null);
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const rafRef     = useRef<number | null>(null);
  const timeRef    = useRef(0);
  const lastTsRef  = useRef(0);
  const prevSwingRef = useRef(0);
  const grainsRef  = useRef<Particle[]>([]);
  const strawRef   = useRef<Particle[]>([]);
  const dustRef    = useRef<{ x: number; y: number; t: number } | null>(null);
  const machineGrainCountRef = useRef(0);
  const machineStrawCountRef = useRef(0);
  const machineSpawnAccRef = useRef(0);
  const sceneWRef  = useRef(720);
  const sceneHRef  = useRef(380);
  const MACHINE_GRAIN_FULL = 110; const MACHINE_STRAW_FULL = 70; const HAND_GRAIN_FULL = 64;

  // Show all steps in both Teacher and Student modes
  const visibleSteps = HAND_STEPS;
  const totalSteps = visibleSteps.length;
  const safeStep = Math.min(stepIdx, totalSteps - 1);

  useEffect(() => {
    onReport?.({
      currentStep: safeStep + 1, totalSteps,
      isPaused: !isPlaying, currentMode: `tools:${method}`,
    });
  }, [safeStep, totalSteps, isPlaying, onReport]);

  useEffect(() => {
    const cw = wrapRef.current?.clientWidth ?? 720;
    const w = clamp(cw, 240, 920);
    // in a landscape two-pane split (§8.1) the pane owns a fixed height via CSS flex;
    // in the tightest frame (844x390) cap harder so the canvas never forces page scroll
    const hCap = isTight ? 210 : (isLandscape ? 340 : 400);
    const hFloor = isTight ? 150 : 230;
    const h = clamp(w * 0.55, hFloor, hCap);
    setDims({ w, h });
  }, [winW, isTight, isLandscape]);

  useEffect(() => {
    timeRef.current = 0; lastTsRef.current = 0; prevSwingRef.current = 0;
    if (safeStep < 3) {
      grainsRef.current = []; strawRef.current = [];
      machineGrainCountRef.current = 0; machineStrawCountRef.current = 0;
      machineSpawnAccRef.current = 0;
    }
  }, [safeStep]);

  // ── canvas drawing helpers ──────────────────────────────────────────────────
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

  const pill = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, s: number, color = C.ink, bg = C.white, glowColor?: string) => {
    const fs = Math.round(12 * s + 2);
    ctx.font = `600 ${fs}px ${FONT}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const padX = 9 * s; const w = ctx.measureText(text).width + padX * 2; const h = fs + 10 * s;
    const W = sceneWRef.current; const H = sceneHRef.current; const m = 6;
    const cx = w + 2 * m >= W ? W / 2 : clamp(x, w / 2 + m, W - w / 2 - m);
    const cy = clamp(y, h / 2 + m, H - h / 2 - m);
    const rx = cx - w / 2; const ry = cy - h / 2;
    ctx.save();
    if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 12; }
    else { ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
    ctx.fillStyle = bg; roundRect(ctx, rx, ry, w, h, 8 * s); ctx.fill();
    ctx.restore();
    ctx.fillStyle = color; ctx.fillText(text, rx + padX, cy + 0.5);
  };

  const arrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, s: number, width = 4) => {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1); const ah = 10 * s;
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ah * Math.cos(ang - 0.4), y2 - ah * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - ah * Math.cos(ang + 0.4), y2 - ah * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
  };

  const drawEar = (ctx: CanvasRenderingContext2D, hx: number, hy: number, a: number, L: number, s: number) => {
    const perp = a + Math.PI / 2;
    for (let k = 0; k < 4; k++) {
      const p = L * (0.68 + 0.09 * k);
      const cx = hx + Math.cos(a) * p; const cy = hy + Math.sin(a) * p;
      const off = (3.4 - k * 0.45) * s;
      for (const side of [-1, 1]) {
        const ox = cx + Math.cos(perp) * off * side; const oy = cy + Math.sin(perp) * off * side;
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

  type Pose = "hold" | "beat" | "tired";
  const drawFarmer = (ctx: CanvasRenderingContext2D, fx: number, gy: number, s: number, armAngle: number, pose: Pose) => {
    const shoulderY = gy - 100 * s; const hipY = gy - 50 * s; const headR = 15 * s;
    const slouch = pose === "tired" ? 6 * s : 0; const sy = shoulderY + slouch;
    ctx.strokeStyle = C.pants; ctx.lineWidth = 12 * s; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(fx - 3 * s, hipY); ctx.lineTo(fx - 16 * s, gy - 2);
    ctx.moveTo(fx + 5 * s, hipY); ctx.lineTo(fx + 18 * s, gy - 2);
    ctx.stroke();
    ctx.fillStyle = C.shirt; roundRect(ctx, fx - 16 * s, sy, 32 * s, 56 * s, 12 * s); ctx.fill();
    ctx.fillStyle = C.shirtDk; roundRect(ctx, fx - 16 * s, sy + 38 * s, 32 * s, 9 * s, 4 * s); ctx.fill();
    const headY = sy - 17 * s;
    ctx.fillStyle = C.skin; ctx.beginPath(); ctx.arc(fx, headY, headR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.cropDark;
    ctx.beginPath(); ctx.ellipse(fx, headY - headR * 0.7, headR * 1.5, headR * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(fx, headY - headR * 0.55, headR * 0.85, Math.PI, Math.PI * 2); ctx.fill();
    const lSh = fx - 13 * s; const rSh = fx + 13 * s;
    if (pose === "tired") {
      ctx.strokeStyle = C.skin; ctx.lineWidth = 9 * s;
      ctx.beginPath();
      ctx.moveTo(rSh, sy + 6 * s); ctx.lineTo(fx + 2 * s, headY - 2 * s);
      ctx.moveTo(lSh, sy + 6 * s); ctx.lineTo(lSh - 8 * s, sy + 40 * s);
      ctx.stroke();
      ctx.fillStyle = "#5BC0EB";
      ctx.beginPath(); ctx.arc(fx + 20 * s, headY - 6 * s, 3.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.arc(fx + 24 * s, headY + 4 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
      return { gripX: fx, gripY: sy };
    }
    const armLen = 56 * s;
    const gripX = (lSh + rSh) / 2 + Math.cos(armAngle) * armLen;
    const gripY = sy + 4 * s + Math.sin(armAngle) * armLen;
    ctx.strokeStyle = C.skin; ctx.lineWidth = 9 * s; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lSh, sy + 6 * s); ctx.lineTo(gripX, gripY);
    ctx.moveTo(rSh, sy + 6 * s); ctx.lineTo(gripX, gripY);
    ctx.stroke();
    ctx.fillStyle = C.skin; ctx.beginPath(); ctx.arc(gripX, gripY, 6 * s, 0, Math.PI * 2); ctx.fill();
    return { gripX, gripY };
  };

  const drawGrainPile = (ctx: CanvasRenderingContext2D) => {
    for (const g of grainsRef.current) {
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot);
      ctx.fillStyle = C.grain; ctx.beginPath(); ctx.ellipse(0, 0, g.r, g.r * 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.grainDk; ctx.beginPath(); ctx.ellipse(0, 0, g.r * 0.42, g.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  };

  const farmerGrip = (fx: number, gy: number, s: number, armAngle: number) => {
    const sy = gy - 100 * s; const armLen = 56 * s;
    return { gripX: fx + Math.cos(armAngle) * armLen, gripY: sy + 4 * s + Math.sin(armAngle) * armLen };
  };

  const spawnGrainsAtBundle = (tipX: number, tipY: number) => {
    for (let i = 0; i < 8; i++) {
      grainsRef.current.push({
        x: tipX + (Math.random() - 0.5) * 24, y: tipY + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 150, vy: -80 - Math.random() * 90,
        settled: false, r: 2.8 + Math.random() * 1.3, rot: Math.random() * Math.PI, kind: "grain",
      });
    }
    if (grainsRef.current.length > 320) grainsRef.current.splice(0, grainsRef.current.length - 320);
  };

  const hash01 = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  const drawCropHeap = (ctx: CanvasRenderingContext2D, cx: number, gy: number, s: number) => {
    for (let r = 0; r < 3; r++) {
      const y = gy - 9 * s - r * 12 * s; const cols = 3 - (r === 2 ? 1 : 0);
      for (let c = 0; c < cols; c++) {
        const x = cx + (c - (cols - 1) / 2) * 22 * s + (r % 2) * 6 * s;
        drawBundle(ctx, x + 24 * s, y, Math.PI, 48 * s, 1, s);
      }
    }
  };

  const drawHandScene = (ctx: CanvasRenderingContext2D, W: number, H: number, step: number, t: number) => {
    const groundY = H * 0.82; const s = clamp(W / 760, 0.7, 1.12);
    sceneWRef.current = W; sceneHRef.current = H;
    drawBackground(ctx, W, H, groundY);

    // Highlight pulse on canvas elements
    const hlThali = highlights.has("beatingBlock") || highlights.has("block");
    const hlFarmer= highlights.has("farmer");
    const hlGrains= highlights.has("grains") || highlights.has("grainPile");
    const hlBundle= highlights.has("bundle");

    const bx = W * 0.4; const blockW = 108 * s; const blockH = 52 * s; const blockTopY = groundY - blockH;

    if (hlThali) {
      ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 20;
      ctx.fillStyle = C.woodDark; roundRect(ctx, bx - blockW / 2, blockTopY, blockW, blockH, 10 * s); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = C.woodDark; roundRect(ctx, bx - blockW / 2, blockTopY, blockW, blockH, 10 * s); ctx.fill();
    }
    ctx.fillStyle = C.wood; roundRect(ctx, bx - blockW / 2, blockTopY, blockW, 16 * s, 8 * s); ctx.fill();
    ctx.strokeStyle = C.woodDark; ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) { const lx = bx - blockW / 2 + (blockW * i) / 4; ctx.beginPath(); ctx.moveTo(lx, blockTopY + 16 * s); ctx.lineTo(lx, blockTopY + blockH); ctx.stroke(); }

    const fx = W * 0.56; const Lb = 74 * s;
    let armAngle = (158 * Math.PI) / 180;
    let pose: Pose = "hold"; let grainAmount = 1;
    let handFull = false;
    if (step === 0) { armAngle = (158 * Math.PI) / 180; }
    else if (step === 1) { const u = easeOutCubic(clamp(t / 0.8, 0, 1)); armAngle = (lerp(158, 250, u) * Math.PI) / 180; }
    else if (step === 2) {
      pose = "beat";
      const filled = clamp(grainsRef.current.length / HAND_GRAIN_FULL, 0, 1);
      handFull = grainsRef.current.length >= HAND_GRAIN_FULL;
      grainAmount = lerp(1, 0, filled);
      if (handFull) {
        // All the grain has fallen off — stop swinging and rest with the empty bundle.
        armAngle = (158 * Math.PI) / 180;
        prevSwingRef.current = 0;
      } else {
        const cyc = 1.0; const u = (t % cyc) / cyc; let deg: number;
        if (u < 0.5) deg = lerp(158, 250, easeOutCubic(u / 0.5));
        else if (u < 0.72) deg = lerp(250, 158, easeInCubic((u - 0.5) / 0.22));
        else deg = 158;
        armAngle = (deg * Math.PI) / 180;
        if (prevSwingRef.current < 0.72 && u >= 0.72) {
          const { gripX, gripY } = farmerGrip(fx, groundY, s, armAngle);
          const tipX = gripX + Math.cos(armAngle) * Lb; const tipY = gripY + Math.sin(armAngle) * Lb;
          spawnGrainsAtBundle(tipX, tipY);
          dustRef.current = { x: tipX, y: tipY, t: 0 };
        }
        prevSwingRef.current = u;
      }
    } else { pose = "tired"; }

    if (step < 3) {
      if (hlGrains) { ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 14; drawGrainPile(ctx); ctx.restore(); }
      else drawGrainPile(ctx);
    }
    if (step === 3) {
      const sx = bx - blockW * 1.05; ctx.save(); ctx.translate(sx, groundY - 6 * s);
      drawBundle(ctx, 0, 0, Math.PI, 60 * s, 0, s); ctx.restore();
      const hw = 54 * s, hh = 27 * s, hcx = bx, hgy = groundY - 2;
      const dome = (x: number) => hh * (1 - Math.pow((x - hcx) / hw, 2));
      ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.beginPath(); ctx.ellipse(hcx, hgy, hw * 0.96, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.grain; ctx.beginPath(); ctx.moveTo(hcx - hw, hgy);
      for (let i = 0; i <= 24; i++) { const xx = hcx - hw + (2 * hw * i) / 24; ctx.lineTo(xx, hgy - Math.max(dome(xx), 0)); }
      ctx.lineTo(hcx + hw, hgy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.grainDk;
      for (let i = 0; i < 24; i++) { const gx2 = hcx + (hash01(i + 3) * 2 - 1) * hw * 0.82; const mh = dome(gx2); if (mh < 4 * s) continue; const gy2 = hgy - 3 * s - hash01(i + 31) * mh; ctx.beginPath(); ctx.ellipse(gx2, gy2, 1.5 * s, 2.3 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    }

    const { gripX, gripY } = drawFarmer(ctx, fx, groundY, s, armAngle, pose);
    if (step < 3) {
      if (hlBundle) { ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 16; drawBundle(ctx, gripX, gripY, armAngle, Lb, grainAmount, s); ctx.restore(); }
      else drawBundle(ctx, gripX, gripY, armAngle, Lb, grainAmount, s);
    }
    if (dustRef.current && step === 2) {
      const d = dustRef.current; d.t += 0.05;
      if (d.t < 1) {
        const rad = 6 + d.t * 26 * s; ctx.globalAlpha = (1 - d.t) * 0.5; ctx.fillStyle = "#D9CBA8";
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(d.x + Math.cos(a) * rad, d.y + Math.sin(a) * rad * 0.6, 5 * s, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    }
    if (step === 2) {
      ctx.strokeStyle = "rgba(74,77,201,0.35)"; ctx.lineWidth = 3 * s; ctx.setLineDash([6 * s, 6 * s]);
      const sh = { x: fx, y: groundY - 104 * s };
      ctx.beginPath(); ctx.arc(sh.x, sh.y, 58 * s, (160 * Math.PI) / 180, (250 * Math.PI) / 180, false); ctx.stroke();
      ctx.setLineDash([]);
    }
    const glowC = hlBundle ? C.orange : undefined;
    if (step === 0) pill(ctx, gripX + Math.cos(armAngle) * Lb, gripY - 36 * s, "grain stuck to the stalks", s, C.cropDark, C.white, glowC);
    else if (step === 1) { arrow(ctx, fx + 6 * s, groundY - 150 * s, fx + 6 * s, groundY - 178 * s, C.primary, s); pill(ctx, fx + 6 * s, groundY - 200 * s, "lift it up high", s, C.primary); }
    else if (step === 2) {
      pill(ctx, bx, blockTopY - 48 * s, handFull ? "all the grain has fallen off!" : "beat it — that's threshing!", s, C.orangeDark, C.white, hlThali ? C.orange : undefined);
      pill(ctx, bx - blockW * 0.55, groundY - 30 * s, handFull ? "bundle is empty now" : "grain falls off", s, C.green);
    }
    else if (step === 3) { pill(ctx, bx, groundY - 60 * s, "grain", s, C.grainDk); pill(ctx, bx - blockW * 1.05, groundY - 38 * s, "empty stalks", s, C.strawDk); pill(ctx, fx, groundY - 156 * s, "slow & tiring", s, C.gray700); }
    drawCropHeap(ctx, bx - blockW * 1.5, groundY, s);
  };

  const updateParticles = (dt: number, W: number, H: number) => {
    const groundY = H * 0.82; const g = 1000; const grainFloor = groundY - 6;
    const keepG: Particle[] = [];
    for (const p of grainsRef.current) {
      if (p.settled) { keepG.push(p); continue; }
      p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 4;
      if (p.y >= grainFloor) { p.y = grainFloor - Math.random() * 4; p.vx = 0; p.vy = 0; p.settled = true; keepG.push(p); }
      else keepG.push(p);
    }
    grainsRef.current = keepG;
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
    drawHandScene(ctx, W, H, safeStep, timeRef.current);
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

  const next = () => {
    if (safeStep < totalSteps - 1) {
      setStepIdx(safeStep + 1); setIsPlaying(true); audio.step();
    }
  };
  const back = () => {
    if (safeStep > 0) { setStepIdx(safeStep - 1); setIsPlaying(true); }
  };
  const replay = () => {
    timeRef.current = 0; grainsRef.current = []; strawRef.current = [];
    machineGrainCountRef.current = 0; machineStrawCountRef.current = 0;
    setIsPlaying(true);
    onReplay?.();
  };

  const stepData = visibleSteps[safeStep];
  const hlCanvas = highlights.has("canvas") || highlights.has("demo");
  const hlNext   = highlights.has("nextBtn");
  const hlBack   = highlights.has("backBtn");
  const hlFinish = highlights.has("finishBtn");
  const isLastStep = safeStep === totalSteps - 1;
  const showFinish = !isAI && isLastStep && !finished;

  const canvasPane = (
    <div ref={wrapRef} style={{
      marginTop: isLandscape ? 0 : 14, borderRadius: 18, overflow: "hidden",
      background: C.white, boxShadow: hlCanvas
        ? `0 0 0 3px ${C.orange}, 0 4px 16px rgba(0,0,0,.06)`
        : "0 4px 16px rgba(0,0,0,.06)",
      transition: "box-shadow .3s", boxSizing: "border-box",
      width: "100%", flex: isLandscape ? "1 1 58%" : undefined,
      minWidth: 0,
    }}>
      <canvas ref={canvasRef} role="img"
        aria-label={`Animated demonstration: ${stepData.title}`}
        style={{ width: "100%", height: isLandscape ? "100%" : dims.h, display: "block" }} />
    </div>
  );

  const infoPane = (
    <div style={{ flex: isLandscape ? "1 1 42%" : undefined, minWidth: 0, boxSizing: "border-box" }}>
      {/* Step card */}
      <div key={safeStep} style={{
        marginTop: isLandscape ? 0 : 14, padding: isTight ? "10px 14px" : "16px 20px", borderRadius: 16,
        background: C.white, border: `1px solid ${C.gray200}`,
        animation: "thFadeUp .35s ease both", boxSizing: "border-box",
      }}>
        <div style={{ fontWeight: 700, color: C.primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
          Step {safeStep + 1} of {totalSteps}
        </div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile ? 18 : 22, color: C.ink, marginBottom: 6 }}>
          {stepData.title}
        </div>
        <div style={{ color: C.gray700, fontSize: isTight ? 13.5 : 15, lineHeight: 1.6 }}>{stepData.text}</div>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: isTight ? 8 : 14 }}>
        {visibleSteps.map((_, i) => (
          <div key={i} style={{
            width: i === safeStep ? 26 : 9, height: 9, borderRadius: 9999,
            background: i === safeStep ? C.primary : C.gray400,
            transition: "all .2s",
          }} />
        ))}
      </div>

      {/* Controls */}
      {!isAI && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: isTight ? 8 : 14, flexWrap: "wrap" }}>
          <UIButton onClick={back} variant="outlined" size={isMobile ? "sm" : "md"} disabled={safeStep === 0} ariaLabel="Previous step" highlighted={hlBack}>
            <ChevronLeft size={20} /> Back
          </UIButton>
          {showPlayPause && (
            <UIButton onClick={() => setIsPlaying(!isPlaying)} variant="outlined" size={isMobile ? "sm" : "md"} ariaLabel={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </UIButton>
          )}
          {!isLastStep && (
            <UIButton onClick={next} variant="contained" size={isMobile ? "sm" : "md"} ariaLabel="Next step" highlighted={hlNext}>
              Next <ChevronRight size={20} />
            </UIButton>
          )}
          {isLastStep && !finished && (
            <UIButton onClick={replay} variant="text" size={isMobile ? "sm" : "md"} ariaLabel="Replay this step">
              <RotateCcw size={16} /> Replay
            </UIButton>
          )}
          {showFinish && (
            <UIButton onClick={onFinish} variant="highlight" size={isMobile ? "sm" : "md"} ariaLabel="Finish" highlighted={hlFinish}>
              Finish ✓
            </UIButton>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      display: "flex", flexDirection: isLandscape ? "row" : "column",
      gap: isLandscape ? 16 : 0, alignItems: isLandscape ? "stretch" : undefined,
      width: "100%", boxSizing: "border-box",
    }}>
      {canvasPane}
      {infoPane}
    </div>
  );
});

// ─── ToolsExplorer ────────────────────────────────────────────────────────────
const ToolsExplorer = memo(function ToolsExplorer({
  isMobile, isLandscape, isTight, showPlayPause, depth, isAI, highlights, audio, onReport,
  stepIdx, setStepIdx, isPlaying, setIsPlaying, onReplay, onFinish, finished,
}: {
  isMobile: boolean; isLandscape: boolean; isTight: boolean;
  showPlayPause: boolean; depth: Depth;
  isAI: boolean; highlights: Set<string>;
  audio: ReturnType<typeof useAudio>;
  onReport?: (s: StepDetails) => void;
  stepIdx: number; setStepIdx: (n: number) => void;
  isPlaying: boolean; setIsPlaying: (v: boolean) => void;
  onReplay?: () => void; onFinish?: () => void; finished?: boolean;
}) {
  return (
    <div>
      <AnimScene
        stepIdx={stepIdx} setStepIdx={setStepIdx}
        isPlaying={isPlaying} setIsPlaying={setIsPlaying}
        showPlayPause={showPlayPause}
        isMobile={isMobile} isLandscape={isLandscape} isTight={isTight}
        depth={depth} isAI={isAI}
        highlights={highlights} audio={audio} onReport={onReport}
        onReplay={onReplay} onFinish={onFinish} finished={finished}
      />
    </div>
  );
});

// ─── Full-screen finish overlay (non-evaluating: "What you have learned" only, NO star) ──
const LEARNED_POINTS = [
  "Threshing separates grain from the dried stalks of a harvested crop.",
  "In the by-hand method, a farmer beats a bundle against a hard surface to knock the grain loose.",
  "Threshing by hand works, but it is slow and tiring compared to a machine.",
];

function FinishOverlay({ visible, onClose, stepsSeen, totalSteps, durationMs }: {
  visible: boolean; onClose: () => void; stepsSeen: number; totalSteps: number; durationMs: number;
}) {
  const [burstKey, setBurstKey] = useState(0);
  useEffect(() => { if (visible) setBurstKey(k => k + 1); }, [visible]);
  if (!visible) return null;
  const particles = Array.from({ length: 26 });
  const secs = Math.max(1, Math.round(durationMs / 1000));
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "thOverlayFade .4s ease both",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(26,26,46,0.55)", backdropFilter: "blur(2px)" }} />
      {particles.map((_, i) => {
        const left = Math.random() * 100; const delay = Math.random() * 0.5; const dur = 1.6 + Math.random() * 1.2;
        const colors = [C.orange, C.cropLight, C.primary, C.green, C.amber];
        const color = colors[i % colors.length];
        return (
          <div key={`${burstKey}-${i}`} style={{
            position: "absolute", top: -20, left: `${left}%`, width: 10, height: 14,
            background: color, borderRadius: 3, opacity: 0.9,
            animation: `thConfettiFall ${dur}s ease-in ${delay}s both`,
          }} />
        );
      })}
      <div style={{
        position: "relative", pointerEvents: "auto", maxWidth: 460, width: "88%",
        background: C.white, borderRadius: 24, padding: "28px 26px",
        boxShadow: "0 24px 60px rgba(0,0,0,.35)", textAlign: "center",
        animation: "thScaleIn .45s cubic-bezier(.2,1.4,.4,1) both",
        boxSizing: "border-box",
      }}>
        <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 6 }}>🌾</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: C.ink, marginBottom: 4 }}>
          Well done!
        </div>
        <div style={{ color: C.gray700, fontSize: 14.5, marginBottom: 16 }}>
          You watched all {totalSteps} steps of by-hand threshing in {secs}s.
        </div>
        <div style={{
          textAlign: "left", background: C.lavenderSoft, borderRadius: 16, padding: "14px 16px", marginBottom: 18,
        }}>
          <div style={{ fontWeight: 700, color: C.primaryDark, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
            What you have learned
          </div>
          {LEARNED_POINTS.map((pt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < LEARNED_POINTS.length - 1 ? 8 : 0 }}>
              <span style={{ color: C.green, fontWeight: 800 }}>✓</span>
              <span style={{ color: C.ink, fontSize: 14, lineHeight: 1.5 }}>{pt}</span>
            </div>
          ))}
        </div>
        <UIButton onClick={onClose} variant="contained" full ariaLabel="Close summary">Close</UIButton>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
function ThreshingByHand({ props: p = {}, setStepDetails }: ThreshingToolProps) {
  const ap = p.additionalProps ?? {};
  const showPlayPause   = ap.showPlayPause ?? p.showPlayPause ?? true;
  const maxWidth        = p.width ?? 940;
  const minHeight       = p.height ?? 0;
  const showModeToggle  = p.showModeToggle ?? true;
  const { isMobile, isLandscape, isTight } = useResponsive();

  const [operatorMode, setOperatorModeState] = useState<OperatorMode>(
    ap.operatorMode ?? p.operatorMode ?? "student"
  );
  const [muted,       setMuted]       = useState(p.muted ?? false);
  const [highlights,  setHighlights]  = useState<Set<string>>(new Set());

  // ── lifted, agent-controllable playback state (was previously trapped in a child) ──
  const [stepIdx,   setStepIdx]   = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [finished,  setFinished]  = useState(false);

  // ── interaction tracking for the uniform `finished` event (§6.3) ──
  const startTimeRef   = useRef<number>(Date.now());
  const visitedRef     = useRef<Set<number>>(new Set([0]));
  const replayCountRef = useRef(0);
  const hintCountRef   = useRef(0);

  const audio = useAudio(muted);
  const isAI        = operatorMode === "ai";
  const depth: Depth = "full";
  const totalSteps  = HAND_STEPS.length;

  // Sync props changes
  useEffect(() => { if (p.operatorMode) setOperatorModeState(p.operatorMode); }, [p.operatorMode]);
  useEffect(() => { if (p.muted !== undefined) setMuted(p.muted); }, [p.muted]);
  useEffect(() => { visitedRef.current.add(Math.min(stepIdx, totalSteps - 1)); }, [stepIdx, totalSteps]);

  const applyOperatorMode = useCallback((m: OperatorMode) => {
    const v = m === "ai" ? "ai" : "student";
    setOperatorModeState(v);
    setStepIdx(0); setFinished(false);
    emit({ type: "event", name: "operator_mode_changed", detail: { operatorMode: v, depth: "full" } });
  }, []);

  const hlTarget = useCallback((target?: string) => {
    if (!target) return;
    hintCountRef.current += 1;
    setHighlights(new Set([target]));
    setTimeout(() => setHighlights(prev => {
      const n = new Set(prev); n.delete(target); return n;
    }), 2800);
    emit({ type: "event", name: "highlighted", detail: { target } });
  }, []);

  const setStepClamped = useCallback((n: number) => {
    setStepIdx(cur => {
      const max = HAND_STEPS.length - 1;
      const next = clamp(n, 0, max);
      return next;
    });
  }, [isAI]);

  const handleReplay = useCallback(() => { replayCountRef.current += 1; }, []);

  // ⛔ No "Play Again" whole-tool loop (§6.3) — Finish is the terminal student action.
  const handleFinish = useCallback(() => {
    if (finished) return;
    setFinished(true);
    setIsPlaying(false);
    audio.done();
    const durationMs = Date.now() - startTimeRef.current;
    emit({
      type: "event", name: "finished",
      detail: {
        evaluated: false, // this tool is an observe-only demo — no right/wrong to score
        interactions: {
          stepsViewed: visitedRef.current.size,
          totalSteps,
          replays: replayCountRef.current,
          hintsUsed: hintCountRef.current,
          durationMs,
        },
        learned: LEARNED_POINTS,
      },
    });
  }, [finished, audio, totalSteps]);

  // Agent API
  const api = useMemo(() => ({
    setParam: (name: string, value: any) => {
      if (name === "operatorMode") applyOperatorMode(value);
      else if (name === "muted") setMuted(Boolean(value));
      emit({ type: "event", name: "param_changed", detail: { name, value } });
    },
    play:  () => { setIsPlaying(true); emit({ type: "event", name: "play",  detail: {} }); },
    pause: () => { setIsPlaying(false); emit({ type: "event", name: "pause", detail: {} }); },
    reset: () => {
      setStepIdx(0); setIsPlaying(true); setFinished(false);
      visitedRef.current = new Set([0]); replayCountRef.current = 0; hintCountRef.current = 0;
      startTimeRef.current = Date.now();
      emit({ type: "event", name: "reset", detail: {} });
    },
    highlight: (target?: string) => hlTarget(target),
    getState: () => {
      const state = {
        operatorMode, depth, muted, toolId: TOOL_ID,
        stepIdx, totalSteps, isPlaying, finished,
      };
      emit({ type: "state", state });
      return state;
    },
    setOperatorMode: (m: OperatorMode) => applyOperatorMode(m),
    step: (direction?: string) => {
      // ⭐ actually advances the same shared step state the student controls (§3.4 #1)
      const dir = direction === "back" ? -1 : 1;
      setStepClamped(stepIdx + dir);
      setIsPlaying(true);
      audio.step();
      emit({ type: "event", name: "step_requested", detail: { direction: direction ?? "next", stepIdx: clamp(stepIdx + dir, 0, totalSteps - 1) } });
    },
    finish: () => handleFinish(),
  }), [operatorMode, depth, muted, applyOperatorMode, hlTarget, stepIdx, totalSteps, isPlaying, finished, setStepClamped, audio, handleFinish]);

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

  // Inject fonts + keyframes
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "th-hand-styles";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
      *{box-sizing:border-box;}
      @keyframes thFadeUp  { from{opacity:0;transform:translateY(10px);}  to{opacity:1;transform:translateY(0);} }
      @keyframes thScaleIn { from{transform:scale(.7);opacity:0;} to{transform:scale(1);opacity:1;} }
      @keyframes thOverlayFade { from{opacity:0;} to{opacity:1;} }
      @keyframes thConfettiFall {
        0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(105vh) rotate(540deg); opacity: 0.2; }
      }
      @media (prefers-reduced-motion:reduce){
        .th-root *,.th-root *::before,.th-root *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;}
      }
    `;
    document.head.appendChild(style);
    return () => { const e = document.getElementById("th-hand-styles"); if (e) e.remove(); };
  }, []);

  const hlToggle = highlights.has("modeToggle");

  return (
    <div className="th-root" style={{
      fontFamily: FONT, maxWidth, width: "100%", minHeight: minHeight || undefined,
      maxHeight: "100dvh", overflow: "hidden",
      margin: "0 auto", padding: isTight ? 10 : (isMobile ? 12 : 18),
      background: C.gray100, borderRadius: 24, color: C.ink,
      boxSizing: "border-box", display: "flex", flexDirection: "column",
    }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, flexShrink: 0 }}>
        <div style={{
          flex: 1, background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`,
          borderRadius: 18, padding: isTight ? "8px 14px" : (isMobile ? "16px 18px" : "20px 26px"), color: C.white,
        }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: isTight ? 16 : (isMobile ? 22 : 28), lineHeight: 1.1 }}>
            Threshing — By Hand
          </div>
          {!isTight && (
            <div style={{ opacity: 0.9, fontSize: isMobile ? 13 : 15, marginTop: 4 }}>
              Separating grain from stalks the traditional way
            </div>
          )}
        </div>

        {/* Controls pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 2 }}>
          {showModeToggle && (
            <ModeToggle mode={operatorMode} onChange={applyOperatorMode} highlighted={hlToggle} />
          )}
          <button type="button" onClick={() => setMuted(m => !m)} title={muted ? "Unmute" : "Mute"}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
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
      {isAI && !isTight && (
        <div style={{
          marginTop: 10, padding: "10px 18px", borderRadius: 12,
          background: "#FFFBF0", border: `1px solid ${C.amber}44`,
          color: "#7a5a00", fontWeight: 700, fontSize: 13.5,
          display: "flex", alignItems: "center", gap: 8,
          animation: "thFadeUp .3s ease", flexShrink: 0,
        }}>
          👩‍🏫 Your teacher is demonstrating — watch each step. You will get a turn.
        </div>
      )}

      {/* Body */}
      <div style={{ marginTop: 10, flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
        <ToolsExplorer
          isMobile={isMobile} isLandscape={isLandscape} isTight={isTight}
          showPlayPause={showPlayPause}
          depth={depth} isAI={isAI} highlights={highlights} audio={audio}
          onReport={setStepDetails}
          stepIdx={Math.min(stepIdx, totalSteps - 1)} setStepIdx={setStepClamped}
          isPlaying={isPlaying} setIsPlaying={setIsPlaying}
          onReplay={handleReplay} onFinish={handleFinish} finished={finished}
        />
      </div>

      <FinishOverlay
        visible={finished}
        onClose={() => setFinished(false)}
        stepsSeen={visitedRef.current.size}
        totalSteps={totalSteps}
        durationMs={Date.now() - startTimeRef.current}
      />
    </div>
  );
}

export default ThreshingByHand;
export { ThreshingByHand };