import React, { useState, useRef, useEffect, useCallback, memo } from "react";

/* =========================================================================
   Threshing — By Hand vs By Machine   (Class 6 Science · Curiosity)
   Singularity design language: Poppins, the pill-button kit, big friendly
   type, tap-only interactions.

   Section order (fixed):  TOOLS → LEARN → REAL WORLD → FREE PLAY
     • Tools      — explore the concept (animated by-hand / by-machine demos)
     • Learn      — gradual concept cards, each building on the last
     • Real World — applications, simple → advanced
     • Free Play  — open drag-and-sort experimentation

   v2.0 — removed the external lucide-react dependency (root cause of React
   error #130: the iframe renderer resolved those imports to plain icon
   *data objects*, not components). All icons are now inline SVG components,
   so the file is fully self-contained.
   ========================================================================= */

// ============================ Types ============================

type SectionType = "tools" | "learn" | "real_world" | "free_play";
type MethodType = "byHand" | "byMachine";
type GradeLevel = 6 | 7 | 8;

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
    gradeLevel?: GradeLevel;
    initialSection?: SectionType;
    initialMethod?: MethodType;
    showSectionNav?: boolean;
    showPlayPause?: boolean;
    // Agent config can also be nested here (same pattern as the other tools).
    additionalProps?: {
      gradeLevel?: GradeLevel;
      initialSection?: SectionType;
      initialMethod?: MethodType;
      showSectionNav?: boolean;
      showPlayPause?: boolean;
    };
  };
  setStepDetails?: (s: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

interface IconProps {
  size?: number;
  style?: React.CSSProperties;
}

// ============================ Inline icons ============================
// Self-contained, lucide-style stroke icons. No external imports => no #130.

const baseSvg = (size: number, style?: React.CSSProperties): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  style,
  "aria-hidden": true,
} as React.SVGProps<SVGSVGElement>);

const ChevronLeft = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}><path d="M15 18l-6-6 6-6" /></svg>
);
const ChevronRight = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}><path d="M9 18l6-6-6-6" /></svg>
);
const RotateCcw = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const Play = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}><path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" /></svg>
);
const Pause = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}>
    <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
  </svg>
);
const HandIcon = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}>
    <path d="M8 13V5a1.5 1.5 0 0 1 3 0v6" /><path d="M11 11V4a1.5 1.5 0 0 1 3 0v7" />
    <path d="M14 11V5.5a1.5 1.5 0 0 1 3 0V13" />
    <path d="M17 12a1.5 1.5 0 0 1 3 0v2a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.3-1.8L4 15.5a1.5 1.5 0 0 1 2.1-2.1L8 15" />
  </svg>
);
const CogIcon = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
  </svg>
);
const ScaleIcon = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}>
    <path d="M12 3v18M7 21h10M5 7h14l-3 6H8z" /><path d="M5 7l-3 6h6zM19 7l-3 6h6z" />
  </svg>
);
const X = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}><path d="M18 6L6 18M6 6l12 12" /></svg>
);
const Check = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}><path d="M20 6L9 17l-5-5" /></svg>
);
const Sparkles = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}>
    <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7z" />
  </svg>
);
const ArrowRight = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const BookOpen = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}>
    <path d="M12 6.5C10.5 5 8 4.5 4 4.5V19c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2V4.5c-4 0-6.5.5-8 2z" />
    <path d="M12 6.5V21" />
  </svg>
);
const Globe = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}>
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
  </svg>
);
const Puzzle = ({ size = 20, style }: IconProps) => (
  <svg {...baseSvg(size, style)}>
    <path d="M9 4a2 2 0 0 1 4 0c0 .5.4 1 1 1h2a1 1 0 0 1 1 1v2c0 .6.5 1 1 1a2 2 0 0 1 0 4c-.5 0-1 .4-1 1v3a1 1 0 0 1-1 1h-3c-.6 0-1-.5-1-1a2 2 0 0 0-4 0c0 .5-.4 1-1 1H4a1 1 0 0 1-1-1v-3c0-.6.5-1 1-1a2 2 0 0 0 0-4c-.5 0-1-.4-1-1V6a1 1 0 0 1 1-1h3c.6 0 1-.5 1-1z" />
  </svg>
);

// ============================ Colors ============================

const C = {
  primary: "#4A4DC9",
  primaryDark: "#533086",
  primaryHover: "#6E70D8",
  orange: "#FF7212",
  orangeDark: "#E85D00",
  orange2: "#FC9145",
  lavender: "#C1C1EA",
  lavenderSoft: "#F1F1FB",
  cream: "#FFF3E4",
  ink: "#1A1A2E",
  gray700: "#4E4E4E",
  gray400: "#CACACA",
  gray200: "#EBEBEB",
  gray100: "#F5F5F5",
  white: "#FFFFFF",
  green: "#16A34A",
  red: "#E53E3E",
  teal: "#0891b2",
  amber: "#F59E0B",
  sky: "#EAF6FF",
  skyLow: "#F6FCFF",
  grass: "#9CCB6A",
  grassDark: "#7FB24E",
  soil: "#CBA66B",
  wood: "#9B6A3C",
  woodDark: "#774E29",
  crop: "#E0A82E",
  cropLight: "#F2C94C",
  cropDark: "#A87A1A",
  grain: "#E8B23A",
  grainDk: "#C0871C",
  skin: "#E7B98C",
  shirt: "#3E78C9",
  shirtDk: "#2D5DA0",
  pants: "#3B4A66",
  machine: "#5C6B7A",
  machineDk: "#3D4A57",
  machineHi: "#0891b2",
  windowDark: "#1F2B33",
  sack: "#CBA06A",
  sackDk: "#9E7A44",
  straw: "#D8C38A",
  strawDk: "#B79E5E",
};

const FONT = "Poppins, system-ui, sans-serif";

// ============================ Tier presets ============================

const TIER_CONFIG: Record<GradeLevel, {
  confettiCount: number; confettiDuration: number; playAgainLabel: string;
}> = {
  6: { confettiCount: 70, confettiDuration: 2500, playAgainLabel: "Play again!" },
  7: { confettiCount: 40, confettiDuration: 2000, playAgainLabel: "Play again" },
  8: { confettiCount: 15, confettiDuration: 1500, playAgainLabel: "Try again" },
};

// ============================ Design-system button ============================

type BtnVariant = "contained" | "highlight" | "outlined" | "text";

function UIButton({
  children, onClick, variant = "contained", disabled = false, size = "md",
  full = false, ariaLabel, ariaPressed,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  size?: "sm" | "md";
  full?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const h = !disabled && hover;
  const p = !disabled && press;

  let bg = "transparent";
  let color: string = C.primary;
  let border = "none";
  let shadow = "none";

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
    border = `2px solid ${disabled ? C.gray200 : C.primary}`;
  } else {
    bg = p ? "#EDEDF8" : h ? C.gray100 : "transparent";
    color = disabled ? C.gray400 : C.primary;
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: full ? "flex" : "inline-flex",
        width: full ? "100%" : undefined,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: size === "sm" ? "9px 18px" : "12px 24px",
        borderRadius: 9999,
        border,
        background: bg,
        color,
        boxShadow: shadow,
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: size === "sm" ? 14 : 16,
        lineHeight: 1,
        cursor: disabled ? "default" : "pointer",
        transform: p ? "translateY(1px)" : "none",
        transition: "background .15s, box-shadow .15s, transform .1s, border-color .15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// ============================ Content data ============================

const HAND_STEPS = [
  { title: "The harvested crop", text: "After the crop is cut, the grain is still stuck to the dried stalks. We need to knock it loose." },
  { title: "Lift the bundle", text: "The farmer gathers a bundle (a sheaf) and raises it high above a hard surface." },
  { title: "Beat it — that's threshing!", text: "He beats the bundle against the surface again and again. The grain pops off the stalks and falls." },
  { title: "Slow and tiring", text: "Bit by bit a small pile of grain builds up. Doing a whole field by hand takes many people and a lot of time." },
];

const MACHINE_STEPS = [
  { title: "The threshing machine", text: "A power-driven machine does the same job. A bundle of crop waits beside the feeding mouth (the hopper)." },
  { title: "Feed it in", text: "The stalks are pushed into the hopper at the top of the machine." },
  { title: "The drum spins — that's threshing!", text: "Inside, a fast-spinning drum beats the stalks. Grain is knocked loose and the light straw is thrown out." },
  { title: "Fast and easy", text: "Clean grain pours into the sack while straw piles up on the side. One machine threshes a whole field quickly." },
];

interface ConceptCard { id: string; tag: string; title: string; body: string; }

const LEARN_CARDS: ConceptCard[] = [
  { id: "l1", tag: "Start here", title: "Grain stuck to the stalks", body: "When a crop like wheat is harvested, the tiny grains are still attached to dried stalks. To use the grain we must separate it. Knocking the grain loose from the cut crop is called threshing." },
  { id: "l2", tag: "Method 1", title: "Threshing by hand", body: "A farmer lifts a bundle of crop and beats it on a hard surface — a stone, a log, or the ground. The blows shake the grain free so it falls and collects below. Animals walking over the crop can do the same job." },
  { id: "l3", tag: "Method 2", title: "Threshing by machine", body: "A thresher does exactly the same thing using a fast-spinning drum. Stalks go into the hopper, the drum beats them, the heavy grain drops into a sack and the light straw is thrown out the side." },
  { id: "l4", tag: "Compare", title: "Same job, different speed", body: "Both methods separate grain from stalks. By hand is cheap and needs no fuel, but is slow and tiring. By machine is fast and easy, but the machine costs money to buy and run." },
  { id: "l5", tag: "What's next", title: "After threshing: winnowing", body: "Threshing leaves grain mixed with bits of light husk. The next step is winnowing — letting wind blow the light husk away while the heavier grain falls straight down into a heap." },
];

const REALWORLD_CARDS: (ConceptCard & { scale: string })[] = [
  { id: "r1", scale: "Simplest", tag: "At home", title: "A handful of crop", body: "With just a few stalks, you rub or beat them by hand over a cloth. Quick and free — perfect when the amount is tiny." },
  { id: "r2", scale: "Small", tag: "Family farm", title: "Beating on a threshing floor", body: "Farmers beat sheaves against a stone, or let bullocks walk in circles over the spread-out crop so their hooves loosen the grain." },
  { id: "r3", scale: "Large", tag: "Bigger farm", title: "A tractor-powered thresher", body: "For many sacks a day, a thresher driven by a tractor or motor beats huge bundles fast — far quicker than any number of hands." },
  { id: "r4", scale: "Most advanced", tag: "Industrial", title: "The combine harvester", body: "On large farms one machine cuts the crop AND threshes it as it drives across the field, pouring clean grain into a tank — harvesting and threshing in a single pass." },
];

interface BoardCard { id: string; text: string; side: MethodType; reason: string; hint: string; }

const BOARD_CARDS: BoardCard[] = [
  { id: "kg10", text: "Faster for just 10 kg", side: "byHand", reason: "For a tiny amount, a few minutes of beating beats setting up a machine.", hint: "Think about the amount — would you start a big machine for only 10 kg?" },
  { id: "cheap", text: "Cheaper for a small farm", side: "byHand", reason: "No machine to buy, rent, or fuel — your hands cost nothing.", hint: "Which method costs money to buy and run?" },
  { id: "nofuel", text: "Works without any fuel", side: "byHand", reason: "It runs on muscle power — no diesel or electricity needed.", hint: "Which one needs fuel or electricity to spin its drum?" },
  { id: "field", text: "Threshes a whole field in a day", side: "byMachine", reason: "The powered drum knocks grain off huge bundles very fast.", hint: "For a giant amount, which one keeps up all day?" },
  { id: "easy", text: "Easy — barely any effort", side: "byMachine", reason: "The motor does the beating, so the worker only feeds the crop in.", hint: "Which one leaves you tired at the end of the day?" },
];

const COMPARE_ROWS = [
  { label: "Speed", hand: "Slow", machine: "Very fast", handGood: false },
  { label: "Effort", hand: "Very tiring", machine: "Easy", handGood: false },
  { label: "Amount in a day", hand: "A little", machine: "A whole field", handGood: false },
  { label: "What you need", hand: "Just hands + a hard surface", machine: "A power machine + fuel", handGood: true },
  { label: "Cost to start", hand: "Cheap", machine: "Expensive machine", handGood: true },
];

// ============================ Helpers ============================

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const useResponsive = () => {
  const [w, setW] = useState(800);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { w, isMobile: w < 576 };
};

interface Particle {
  x: number; y: number; vx: number; vy: number;
  settled: boolean; r: number; rot: number; kind: "grain" | "straw";
}

// small inline panel illustrations (already SVG components — no external deps)
function FarmerLogIcon({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="6" y="44" width="34" height="13" rx="4" fill={C.woodDark} />
      <rect x="6" y="44" width="34" height="5" rx="2.5" fill={C.wood} />
      <circle cx="44" cy="20" r="6" fill={C.skin} />
      <path d="M37 17a7 7 0 0 1 14 0z" fill={C.cropDark} />
      <rect x="40" y="26" width="9" height="20" rx="4" fill={C.shirt} />
      <rect x="40" y="44" width="4" height="13" rx="2" fill={C.pants} />
      <rect x="45" y="44" width="4" height="13" rx="2" fill={C.pants} />
      <path d="M41 30 L26 40" stroke={C.skin} strokeWidth="3.4" strokeLinecap="round" />
      <g stroke={C.crop} strokeWidth="2.6" strokeLinecap="round">
        <path d="M26 40 L16 47" /><path d="M26 40 L18 49" /><path d="M26 40 L21 50" />
      </g>
    </svg>
  );
}

function ThresherIcon({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="8" y="22" width="42" height="26" rx="5" fill={C.machine} />
      <rect x="8" y="42" width="42" height="6" rx="3" fill={C.machineDk} />
      <path d="M14 22 l8 -8 h8 l-4 8 z" fill={C.machineDk} />
      <circle cx="30" cy="34" r="9" fill={C.windowDark} />
      <g stroke={C.cropLight} strokeWidth="2.2" strokeLinecap="round">
        <path d="M30 34 L30 26" /><path d="M30 34 L37 38" /><path d="M30 34 L23 38" />
      </g>
      <circle cx="18" cy="50" r="5" fill={C.machineDk} />
      <circle cx="42" cy="50" r="5" fill={C.machineDk} />
      <path d="M50 40 l8 4" stroke={C.amber} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* =====================================================================
   SECTION 1 — TOOLS  (animated demonstrations on a canvas)
   Encapsulated so its animation hooks only run while this section is shown.
   ===================================================================== */

const ToolsExplorer = memo(function ToolsExplorer({
  isMobile, showPlayPause, initialMethod, onReport,
}: {
  isMobile: boolean;
  showPlayPause: boolean;
  initialMethod: MethodType;
  onReport?: (s: StepDetails) => void;
}) {
  const { w: winW } = useResponsive();
  const [method, setMethod] = useState<MethodType>(initialMethod);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [dims, setDims] = useState({ w: 720, h: 380 });

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const lastTsRef = useRef(0);
  const prevSwingRef = useRef(0);
  const grainsRef = useRef<Particle[]>([]);
  const strawRef = useRef<Particle[]>([]);
  const dustRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const machineGrainCountRef = useRef(0);
  const machineStrawCountRef = useRef(0);
  const machineSpawnAccRef = useRef(0);
  const sceneWRef = useRef(720);
  const sceneHRef = useRef(380);

  // pile-full thresholds — once reached, no more grain/straw is added
  const MACHINE_GRAIN_FULL = 110;
  const MACHINE_STRAW_FULL = 70;
  const HAND_GRAIN_FULL = 64;

  const steps = method === "byHand" ? HAND_STEPS : MACHINE_STEPS;
  const totalSteps = steps.length;

  useEffect(() => {
    onReport?.({ currentStep: stepIdx + 1, totalSteps, isPaused: !isPlaying, currentMode: `tools:${method}` });
  }, [stepIdx, totalSteps, isPlaying, method, onReport]);

  useEffect(() => {
    const cw = wrapRef.current?.clientWidth ?? 720;
    const w = clamp(cw, 280, 920);
    const h = clamp(w * 0.55, 230, 420);
    setDims({ w, h });
  }, [winW, method]);

  useEffect(() => {
    timeRef.current = 0; lastTsRef.current = 0; prevSwingRef.current = 0;
    if (stepIdx < 3) {
      grainsRef.current = []; strawRef.current = [];
      machineGrainCountRef.current = 0; machineStrawCountRef.current = 0; machineSpawnAccRef.current = 0;
    }
  }, [method, stepIdx]);

  // ---------- drawing helpers ----------
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

  const pill = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, s: number, color: string = C.ink, bg: string = C.white) => {
    const fs = Math.round(12 * s + 2);
    ctx.font = `600 ${fs}px ${FONT}`;
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const padX = 9 * s;
    const w = ctx.measureText(text).width + padX * 2;
    const h = fs + 10 * s;
    // keep the whole pill inside the canvas so text is never clipped
    const W = sceneWRef.current; const H = sceneHRef.current; const m = 6;
    const cx = w + 2 * m >= W ? W / 2 : clamp(x, w / 2 + m, W - w / 2 - m);
    const cy = clamp(y, h / 2 + m, H - h / 2 - m);
    const rx = cx - w / 2; const ry = cy - h / 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
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
      const cx = hx + Math.cos(a) * p; const cy = hy + Math.sin(a) * p;
      const off = (3.4 - k * 0.45) * s;
      for (const side of [-1, 1]) {
        const ox = cx + Math.cos(perp) * off * side; const oy = cy + Math.sin(perp) * off * side;
        ctx.fillStyle = C.cropLight;
        ctx.beginPath(); ctx.ellipse(ox, oy, 3.6 * s, 2.3 * s, a, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.grainDk;
        ctx.beginPath(); ctx.ellipse(ox, oy, 1.4 * s, 1 * s, a, 0, Math.PI * 2); ctx.fill();
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
    ctx.fillStyle = C.woodDark;
    ctx.beginPath();
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
      ctx.beginPath();
      ctx.arc(fx + 20 * s, headY - 6 * s, 3.4 * s, 0, Math.PI * 2);
      ctx.arc(fx + 24 * s, headY + 4 * s, 2.6 * s, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.fillStyle = C.grain;
      ctx.beginPath(); ctx.ellipse(0, 0, g.r, g.r * 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.grainDk;
      ctx.beginPath(); ctx.ellipse(0, 0, g.r * 0.42, g.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
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
      const hx = cx + (hash01(i + 1) * 2 - 1) * mw * 0.94; const maxH = dome(hx);
      if (maxH <= 4 * s) continue;
      const hy = gy - 3 * s - hash01(i + 50) * maxH;
      const ang = (hash01(i + 99) - 0.5) * 1.5 - Math.PI / 2; const len = (5 + hash01(i + 7) * 8) * s;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(ang) * len, hy + Math.sin(ang) * len); ctx.stroke();
    }
    ctx.strokeStyle = C.cropLight; ctx.globalAlpha = 0.5;
    for (let i = 0; i < 16; i++) {
      const hx = cx + (hash01(i + 200) * 2 - 1) * mw * 0.82; const maxH = dome(hx);
      if (maxH <= 4 * s) continue;
      const hy = gy - 3 * s - hash01(i + 250) * maxH;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 4 * s, hy - 7 * s); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

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
    const bx = W * 0.4; const blockW = 108 * s; const blockH = 52 * s; const blockTopY = groundY - blockH;
    ctx.fillStyle = C.woodDark; roundRect(ctx, bx - blockW / 2, blockTopY, blockW, blockH, 10 * s); ctx.fill();
    ctx.fillStyle = C.wood; roundRect(ctx, bx - blockW / 2, blockTopY, blockW, 16 * s, 8 * s); ctx.fill();
    ctx.strokeStyle = C.woodDark; ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) { const lx = bx - blockW / 2 + (blockW * i) / 4; ctx.beginPath(); ctx.moveTo(lx, blockTopY + 16 * s); ctx.lineTo(lx, blockTopY + blockH); ctx.stroke(); }
    const fx = W * 0.56; const Lb = 74 * s;
    let armAngle = (158 * Math.PI) / 180; let pose: Pose = "hold"; let grainAmount = 1;
    if (step === 0) { armAngle = (158 * Math.PI) / 180; }
    else if (step === 1) { const u = easeOutCubic(clamp(t / 0.8, 0, 1)); armAngle = (lerp(158, 250, u) * Math.PI) / 180; }
    else if (step === 2) {
      pose = "beat"; const cyc = 1.0; const u = (t % cyc) / cyc; let deg: number;
      if (u < 0.5) deg = lerp(158, 250, easeOutCubic(u / 0.5));
      else if (u < 0.72) deg = lerp(250, 158, easeInCubic((u - 0.5) / 0.22));
      else deg = 158;
      armAngle = (deg * Math.PI) / 180;
      // the bundle empties as its grain joins the pile; once full, no grain is left
      const filled = clamp(grainsRef.current.length / HAND_GRAIN_FULL, 0, 1);
      const handFull = grainsRef.current.length >= HAND_GRAIN_FULL;
      grainAmount = lerp(1, 0, filled);
      if (!handFull && prevSwingRef.current < 0.72 && u >= 0.72) {
        const { gripX, gripY } = farmerGrip(fx, groundY, s, armAngle);
        const tipX = gripX + Math.cos(armAngle) * Lb; const tipY = gripY + Math.sin(armAngle) * Lb;
        spawnGrainsAtBundle(tipX, tipY); dustRef.current = { x: tipX, y: tipY, t: 0 };
      }
      prevSwingRef.current = u;
    } else { pose = "tired"; }
    if (step < 3) drawGrainPile(ctx);
    if (step === 3) {
      // bare, threshed-out stalks set aside (straw)
      const sx = bx - blockW * 1.05; ctx.save(); ctx.translate(sx, groundY - 6 * s);
      drawBundle(ctx, 0, 0, Math.PI, 60 * s, 0, s); ctx.restore();
      // a tidy heap of the grain that was knocked loose
      const hw = 54 * s, hh = 27 * s, hcx = bx, hgy = groundY - 2;
      const dome = (x: number) => hh * (1 - Math.pow((x - hcx) / hw, 2));
      ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.beginPath(); ctx.ellipse(hcx, hgy, hw * 0.96, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.grain; ctx.beginPath(); ctx.moveTo(hcx - hw, hgy);
      for (let i = 0; i <= 24; i++) { const xx = hcx - hw + (2 * hw * i) / 24; ctx.lineTo(xx, hgy - Math.max(dome(xx), 0)); }
      ctx.lineTo(hcx + hw, hgy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.grainDk;
      for (let i = 0; i < 24; i++) { const gx = hcx + (hash01(i + 3) * 2 - 1) * hw * 0.82; const mh = dome(gx); if (mh < 4 * s) continue; const gy = hgy - 3 * s - hash01(i + 31) * mh; ctx.beginPath(); ctx.ellipse(gx, gy, 1.5 * s, 2.3 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    const { gripX, gripY } = drawFarmer(ctx, fx, groundY, s, armAngle, pose);
    if (step < 3) drawBundle(ctx, gripX, gripY, armAngle, Lb, grainAmount, s);
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
    if (step === 0) pill(ctx, gripX + Math.cos(armAngle) * Lb, gripY - 36 * s, "grain stuck to the stalks", s, C.cropDark);
    else if (step === 1) { arrow(ctx, fx + 6 * s, groundY - 150 * s, fx + 6 * s, groundY - 178 * s, C.primary, s); pill(ctx, fx + 6 * s, groundY - 200 * s, "lift it up high", s, C.primary); }
    else if (step === 2) { pill(ctx, bx, blockTopY - 48 * s, "beat it — that's threshing!", s, C.orangeDark); pill(ctx, bx - blockW * 0.55, groundY - 30 * s, "grain falls off", s, C.green); }
    else if (step === 3) { pill(ctx, bx, groundY - 60 * s, "grain", s, C.grainDk); pill(ctx, bx - blockW * 1.05, groundY - 38 * s, "empty stalks", s, C.strawDk); pill(ctx, fx, groundY - 156 * s, "slow & tiring", s, C.gray700); }
  };

  const spawnMachineParticles = (groundY: number, s: number, bodyX: number, bodyW: number, bodyTop: number, sackX: number, strawX: number) => {
    const g = 1000; machineSpawnAccRef.current += 1;
    const grainRoom = (machineGrainCountRef.current + grainsRef.current.length) < MACHINE_GRAIN_FULL;
    const strawRoom = (machineStrawCountRef.current + strawRef.current.length) < MACHINE_STRAW_FULL;
    if (!grainRoom && !strawRoom) return; // sack + straw pile both full: nothing more to add
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
    const groundY = H * 0.82; const s = clamp(W / 900, 0.6, 1.0);
    sceneWRef.current = W; sceneHRef.current = H;
    drawBackground(ctx, W, H, groundY);
    const bodyW = 230 * s; const bodyH = 116 * s; const bodyX = W * 0.28; const bodyTop = groundY - bodyH - 30 * s;
    const sackX = bodyX + bodyW + 44 * s; const sackW = 66 * s; const sackTop = groundY - 76 * s;
    const strawX = Math.min(bodyX + bodyW + 214 * s, W - 60 * s);
    const strawFill = clamp(machineStrawCountRef.current / MACHINE_STRAW_FULL, 0, 1);
    if (strawFill > 0.02) { const mw = 44 * s + strawFill * 66 * s; const mh = 26 * s + strawFill * 72 * s; drawStrawStack(ctx, strawX, groundY, mw, mh, s); }
    ctx.fillStyle = C.machineDk;
    [bodyX + 40 * s, bodyX + bodyW - 40 * s].forEach((wx) => {
      ctx.beginPath(); ctx.arc(wx, groundY - 6 * s, 22 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.gray400; ctx.beginPath(); ctx.arc(wx, groundY - 6 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.machineDk;
    });
    const shake = step === 2 ? Math.sin(t * 40) * 1.6 * s : 0;
    ctx.save(); ctx.translate(0, shake);
    ctx.fillStyle = C.machine; roundRect(ctx, bodyX, bodyTop, bodyW, bodyH, 14 * s); ctx.fill();
    ctx.fillStyle = C.machineDk; roundRect(ctx, bodyX, bodyTop + bodyH - 16 * s, bodyW, 16 * s, 8 * s); ctx.fill();
    ctx.fillStyle = C.machineHi; roundRect(ctx, bodyX + 12 * s, bodyTop + 12 * s, bodyW - 24 * s, 7 * s, 4 * s); ctx.fill();
    const hopX = bodyX + 20 * s; const hopTopY = bodyTop - 46 * s; const hopW = 80 * s;
    ctx.fillStyle = C.machineDk;
    ctx.beginPath(); ctx.moveTo(hopX, hopTopY); ctx.lineTo(hopX + hopW, hopTopY); ctx.lineTo(hopX + hopW - 16 * s, bodyTop + 4 * s); ctx.lineTo(hopX + 14 * s, bodyTop + 4 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.windowDark; ctx.beginPath(); ctx.ellipse(hopX + hopW / 2, hopTopY + 3 * s, hopW / 2 - 4 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    const drumCx = bodyX + bodyW * 0.56; const drumCy = bodyTop + bodyH * 0.46; const drumR = 32 * s;
    ctx.fillStyle = C.windowDark; ctx.beginPath(); ctx.arc(drumCx, drumCy, drumR + 7 * s, 0, Math.PI * 2); ctx.fill();
    const rot = step >= 1 ? t * (step === 2 ? 11 : 2.2) : 0;
    ctx.save(); ctx.translate(drumCx, drumCy); ctx.rotate(rot);
    ctx.strokeStyle = C.cropLight; ctx.lineWidth = 4.5 * s; ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * drumR, Math.sin(a) * drumR); ctx.stroke(); }
    ctx.fillStyle = C.machineHi; ctx.beginPath(); ctx.arc(0, 0, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (step === 2) spinArrows(ctx, drumCx, drumCy, drumR + 14 * s, C.amber, s);
    ctx.restore();
    const spoutTipX = sackX - 4 * s; const spoutTipY = sackTop - 10 * s;
    ctx.strokeStyle = C.machineDk; ctx.lineWidth = 10 * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(bodyX + bodyW - 6 * s, bodyTop + bodyH * 0.5); ctx.lineTo(spoutTipX + 2 * s, spoutTipY); ctx.stroke();
    ctx.fillStyle = C.sack; roundRect(ctx, sackX - sackW / 2, sackTop, sackW, groundY - sackTop - 2, 14 * s); ctx.fill();
    ctx.fillStyle = C.sackDk; roundRect(ctx, sackX - sackW / 2 - 4 * s, sackTop - 7 * s, sackW + 8 * s, 16 * s, 8 * s); ctx.fill();
    ctx.fillStyle = C.windowDark; ctx.beginPath(); ctx.ellipse(sackX, sackTop + 1 * s, sackW / 2 - 7 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
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
    // pour stream only while actively threshing and the sack still has room
    if (step === 2 && !grainFullVis) {
      const surfTopY = lerp(groundY - 8 * s, sackTop - 10 * s, grainFill);
      ctx.fillStyle = C.grain; ctx.beginPath();
      ctx.moveTo(spoutTipX - 4 * s, spoutTipY); ctx.lineTo(spoutTipX + 4 * s, spoutTipY);
      ctx.lineTo(sackX + 5 * s, surfTopY); ctx.lineTo(sackX - 5 * s, surfTopY); ctx.closePath(); ctx.fill();
    }
    drawGrainPile(ctx); drawStrawFlying(ctx);
    drawCropHeap(ctx, bodyX - 30 * s, groundY, s);
    const hopMouthX = hopX + hopW / 2;
    if (step === 0) drawBundle(ctx, hopMouthX - 40 * s, hopTopY - 50 * s, (218 * Math.PI) / 180, 76 * s, 1, s);
    else if (step === 1) { const u = easeOutCubic(clamp(t / 1.1, 0, 1)); const bxp = lerp(hopMouthX - 40 * s, hopMouthX, u); const byp = lerp(hopTopY - 50 * s, hopTopY + 2 * s, u); drawBundle(ctx, bxp, byp, (lerp(218, 256, u) * Math.PI) / 180, lerp(76, 44, u) * s, 1, s); }
    else { const bob = Math.sin(t * 3) * 4 * s; drawBundle(ctx, hopMouthX, hopTopY - 2 * s + bob, (250 * Math.PI) / 180, 46 * s, 1, s); }
    if (step <= 1) { arrow(ctx, hopMouthX - 30 * s, hopTopY - 20 * s, hopMouthX - 2 * s, hopTopY + 2 * s, C.primary, s, 5); pill(ctx, hopMouthX - 6 * s, hopTopY - 52 * s, "stalks go in", s, C.primary); }
    const tight = W < 520;
    if (step === 2) {
      if (!strawFullVis) {
        const oxD = bodyX + bodyW - 6 * s; const oyD = bodyTop + 2 * s; ctx.fillStyle = "#D9C9A3";
        for (let i = 0; i < 14; i++) {
          const ph = (t * 0.5 + i / 14) % 1;
          const px = lerp(oxD, strawX, ph) + Math.sin(i * 2.1) * 9 * s;
          const py = lerp(oyD, groundY - 96 * s, ph) - Math.sin(ph * Math.PI) * 58 * s;
          const rr = (9 + ph * 30) * s; ctx.globalAlpha = 0.16 * (1 - ph) + 0.04;
          ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // straw thrown up & out — arrow kept high so it never crosses the labels
      arrow(ctx, bodyX + bodyW - 10 * s, bodyTop - 4 * s, bodyX + bodyW + 92 * s, bodyTop - 44 * s, C.amber, s, 4);
      pill(ctx, bodyX + bodyW * 0.78, bodyTop - 80 * s, "drum beats the crop", s, C.machineDk);
      // on narrow canvases the sack & straw pile are close, so stack the labels and shorten them
      pill(ctx, strawX, groundY - (tight ? 144 : 120) * s, tight ? "straw" : "straw (light)", s, C.strawDk);
      pill(ctx, sackX, groundY - (tight ? 96 : 104) * s, tight ? "grain" : "grain (heavy)", s, C.grainDk);
    }
    if (step === 3) {
      pill(ctx, bodyX + bodyW * 0.5, bodyTop - 64 * s, "done — fast & easy", s, "#1B7A43", "#E9F7EF");
      pill(ctx, strawX, groundY - (tight ? 144 : 120) * s, "straw", s, C.strawDk);
      pill(ctx, sackX, groundY - (tight ? 96 : 104) * s, tight ? "grain" : "clean grain", s, C.grainDk);
    }
  };

  const updateParticles = (dt: number, W: number, H: number, curMethod: MethodType) => {
    const groundY = H * 0.82; const g = 1000; const grainFloor = groundY - 6;
    if (curMethod === "byMachine" && stepIdx === 2) {
      const s = clamp(W / 900, 0.6, 1.0);
      const bodyW = 230 * s; const bodyX = W * 0.28; const bodyH = 116 * s; const bodyTop = groundY - bodyH - 30 * s;
      const sackX = bodyX + bodyW + 44 * s; const strawX = Math.min(bodyX + bodyW + 214 * s, W - 60 * s);
      spawnMachineParticles(groundY, s, bodyX, bodyW, bodyTop, sackX, strawX);
    }
    const keepG: Particle[] = [];
    for (const p of grainsRef.current) {
      if (p.settled) { keepG.push(p); continue; }
      p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 4;
      if (p.y >= grainFloor) {
        if (curMethod === "byMachine") { machineGrainCountRef.current += 1; }
        else { p.y = grainFloor - Math.random() * 4; p.vx = 0; p.vy = 0; p.settled = true; keepG.push(p); }
      } else keepG.push(p);
    }
    grainsRef.current = keepG;
    const keepS: Particle[] = [];
    for (const p of strawRef.current) {
      p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 5;
      if (p.y >= groundY - 4) machineStrawCountRef.current += 1;
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
    (ctx as unknown as { imageSmoothingEnabled: boolean }).imageSmoothingEnabled = true;
    const t = timeRef.current;
    if (method === "byHand") drawHandScene(ctx, W, H, stepIdx, t);
    else drawMachineScene(ctx, W, H, stepIdx, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims, method, stepIdx]);

  useEffect(() => {
    renderFrame();
    if (!isPlaying) return;
    lastTsRef.current = 0;
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts; timeRef.current += dt;
      updateParticles(dt, dims.w, dims.h, method);
      renderFrame();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, method, stepIdx, dims, renderFrame]);

  const switchMethod = (m: MethodType) => { setMethod(m); setStepIdx(0); setIsPlaying(true); };
  const next = () => { if (stepIdx < totalSteps - 1) { setStepIdx((i) => i + 1); setIsPlaying(true); } };
  const back = () => { if (stepIdx > 0) { setStepIdx((i) => i - 1); setIsPlaying(true); } };
  const replay = () => { timeRef.current = 0; grainsRef.current = []; strawRef.current = []; machineGrainCountRef.current = 0; machineStrawCountRef.current = 0; setIsPlaying(true); };

  const bodyPx = isMobile ? 16 : 17;

  return (
    <div>
      <p style={{ color: C.gray700, fontSize: bodyPx, margin: "4px 2px 14px", lineHeight: 1.5 }}>
        Watch threshing happen, then try it the other way. Switch the method and step through each stage.
      </p>

      {/* method toggle */}
      <div role="tablist" aria-label="Threshing method" style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <UIButton onClick={() => switchMethod("byHand")} variant={method === "byHand" ? "contained" : "outlined"} size={isMobile ? "sm" : "md"} ariaPressed={method === "byHand"}>
          <HandIcon size={isMobile ? 16 : 18} /> By Hand
        </UIButton>
        <UIButton onClick={() => switchMethod("byMachine")} variant={method === "byMachine" ? "contained" : "outlined"} size={isMobile ? "sm" : "md"} ariaPressed={method === "byMachine"}>
          <CogIcon size={isMobile ? 16 : 18} /> By Machine
        </UIButton>
      </div>

      {/* caption */}
      <div key={method + stepIdx} style={{ marginTop: 16, background: C.white, borderRadius: 16, padding: isMobile ? "14px 16px" : "16px 22px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", animation: "thFadeUp .4s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.primary, fontWeight: 700, fontSize: isMobile ? 16 : 18 }}>
          <span style={{ background: C.primary, color: C.white, width: 26, height: 26, borderRadius: 9999, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{stepIdx + 1}</span>
          {steps[stepIdx].title}
        </div>
        <div style={{ marginTop: 6, color: C.gray700, fontSize: bodyPx, lineHeight: 1.5 }}>{steps[stepIdx].text}</div>
      </div>

      {/* canvas */}
      <div ref={wrapRef} style={{ marginTop: 14, borderRadius: 18, overflow: "hidden", background: C.white, boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
        <canvas ref={canvasRef} role="img" aria-label={`Animated demonstration of threshing ${method === "byHand" ? "by hand" : "by machine"}: ${steps[stepIdx].title}`} style={{ width: "100%", height: dims.h, display: "block" }} />
      </div>

      {/* progress dots */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ width: i === stepIdx ? 26 : 9, height: 9, borderRadius: 9999, background: i === stepIdx ? C.primary : C.gray400, transition: "all .2s" }} />
        ))}
      </div>

      {/* controls */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
        <UIButton onClick={back} variant="outlined" size={isMobile ? "sm" : "md"} disabled={stepIdx === 0} ariaLabel="Previous step"><ChevronLeft size={20} /> Back</UIButton>
        {showPlayPause && (
          <UIButton onClick={() => setIsPlaying((p) => !p)} variant="text" size={isMobile ? "sm" : "md"} ariaLabel={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />} {isPlaying ? "Pause" : "Play"}
          </UIButton>
        )}
        <UIButton onClick={replay} variant="text" size={isMobile ? "sm" : "md"} ariaLabel="Replay"><RotateCcw size={20} /> Replay</UIButton>
        <UIButton onClick={next} variant="contained" size={isMobile ? "sm" : "md"} disabled={stepIdx === totalSteps - 1} ariaLabel="Next step">Next <ChevronRight size={20} /></UIButton>
      </div>
    </div>
  );
});

/* =====================================================================
   Compare table (used inside Learn)
   ===================================================================== */

const CompareTable = memo(function CompareTable({ isMobile }: { isMobile: boolean }) {
  const cell = (good: boolean, text: string) => (
    <div style={{ flex: 1, background: good ? "#E9F7EF" : "#FDECEC", color: good ? C.green : C.red, borderRadius: 10, padding: "10px 12px", fontWeight: 600, fontSize: isMobile ? 13 : 15, textAlign: "center" }}>{text}</div>
  );
  return (
    <div style={{ background: C.white, borderRadius: 16, padding: isMobile ? 14 : 18, boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginTop: 14 }}>
      <div style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
        <div style={{ width: isMobile ? 92 : 120 }} />
        <div style={{ flex: 1, textAlign: "center", fontWeight: 800, color: C.primary, fontSize: isMobile ? 14 : 16 }}>By Hand</div>
        <div style={{ flex: 1, textAlign: "center", fontWeight: 800, color: C.orange, fontSize: isMobile ? 14 : 16 }}>By Machine</div>
      </div>
      {COMPARE_ROWS.map((r, i) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${C.gray200}` }}>
          <div style={{ width: isMobile ? 92 : 120, fontWeight: 600, color: C.ink, fontSize: isMobile ? 13 : 15 }}>{r.label}</div>
          {cell(r.handGood, r.hand)}
          {cell(!r.handGood, r.machine)}
        </div>
      ))}
    </div>
  );
});

/* =====================================================================
   Generic card-walk used by LEARN and REAL WORLD
   ===================================================================== */

function CardWalk({
  cards, isMobile, accent, renderExtra,
}: {
  cards: ConceptCard[];
  isMobile: boolean;
  accent: string;
  renderExtra?: (card: ConceptCard) => React.ReactNode;
}) {
  const [i, setI] = useState(0);
  const card = cards[i];
  const atStart = i === 0;
  const atEnd = i === cards.length - 1;

  return (
    <div>
      <div key={card.id} style={{ animation: "thFadeUp .4s ease" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: accent, marginBottom: 10 }}>
          <span style={{ background: `${accent}1a`, color: accent, borderRadius: 8, padding: "4px 10px" }}>{card.tag}</span>
        </div>
        <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, margin: "2px 0 12px", lineHeight: 1.18, color: C.ink, fontFamily: FONT }}>{card.title}</h2>
        <p style={{ fontSize: isMobile ? 16 : 17, lineHeight: 1.7, color: C.gray700, background: C.white, padding: isMobile ? 16 : 20, borderRadius: 16, borderLeft: `5px solid ${accent}`, margin: 0, boxShadow: "0 2px 10px rgba(0,0,0,.04)" }}>{card.body}</p>
        {renderExtra?.(card)}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, gap: 10 }}>
        <UIButton onClick={() => setI((p) => Math.max(0, p - 1))} variant="outlined" size={isMobile ? "sm" : "md"} disabled={atStart} ariaLabel="Previous card"><ChevronLeft size={18} /> Back</UIButton>
        <div style={{ display: "flex", gap: 7 }} aria-hidden>
          {cards.map((_, k) => (
            <button key={k} type="button" onClick={() => setI(k)} aria-label={`Go to card ${k + 1}`}
              style={{ width: k === i ? 26 : 9, height: 9, borderRadius: 9, cursor: "pointer", border: "none", padding: 0, background: k === i ? accent : C.gray400, transition: "all .3s" }} />
          ))}
        </div>
        <UIButton onClick={() => setI((p) => Math.min(cards.length - 1, p + 1))} variant="contained" size={isMobile ? "sm" : "md"} disabled={atEnd} ariaLabel="Next card">Next <ChevronRight size={18} /></UIButton>
      </div>
    </div>
  );
}

/* =====================================================================
   SECTION 4 — FREE PLAY  (drag-and-sort, open experimentation)
   ===================================================================== */

interface DragState { id: string; x: number; y: number; dx: number; dy: number; sx: number; sy: number; moved: boolean; hover: MethodType | null; }

function FreePlayBoard({
  isMobile, tier,
}: {
  isMobile: boolean;
  tier: { confettiCount: number; confettiDuration: number; playAgainLabel: string };
}) {
  const [placed, setPlaced] = useState<Record<string, MethodType>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ id: string; hint: string } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const handRef = useRef<HTMLDivElement | null>(null);
  const machineRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const wrongTimer = useRef<number | null>(null);
  dragRef.current = drag;

  const placedCount = Object.keys(placed).length;
  const done = placedCount === BOARD_CARDS.length;

  const hitSide = (x: number, y: number): MethodType | null => {
    const inR = (r?: DOMRect) => !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    if (inR(handRef.current?.getBoundingClientRect())) return "byHand";
    if (inR(machineRef.current?.getBoundingClientRect())) return "byMachine";
    return null;
  };

  const flashWrong = (id: string, hint: string) => {
    setWrong({ id, hint });
    if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
    wrongTimer.current = window.setTimeout(() => setWrong(null), 2600);
  };

  const attemptPlace = (card: BoardCard, side: MethodType) => {
    if (placed[card.id]) return;
    if (side === card.side) { setPlaced((p) => ({ ...p, [card.id]: side })); setSelected(null); setWrong(null); }
    else flashWrong(card.id, card.hint);
  };

  const finishDrag = (d: DragState | null, x: number, y: number) => {
    if (!d) return;
    const card = BOARD_CARDS.find((c) => c.id === d.id);
    if (!card) return;
    if (!d.moved) { setSelected((s) => (s === d.id ? null : d.id)); return; }
    const side = hitSide(x, y);
    if (side) attemptPlace(card, side);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      setDrag((d) => {
        if (!d) return d;
        const moved = d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6;
        return { ...d, x: e.clientX, y: e.clientY, moved, hover: moved ? hitSide(e.clientX, e.clientY) : null };
      });
    };
    const up = (e: PointerEvent) => { finishDrag(dragRef.current, e.clientX, e.clientY); setDrag(null); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  useEffect(() => () => { if (wrongTimer.current) window.clearTimeout(wrongTimer.current); }, []);

  const startDrag = (e: React.PointerEvent, card: BoardCard) => {
    if (placed[card.id]) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDrag({ id: card.id, x: e.clientX, y: e.clientY, dx: e.clientX - rect.left, dy: e.clientY - rect.top, sx: e.clientX, sy: e.clientY, moved: false, hover: null });
  };

  const reset = () => { setPlaced({}); setSelected(null); setWrong(null); };
  const pool = BOARD_CARDS.filter((c) => !placed[c.id]);

  const cardFace = (card: BoardCard, opts: { ghost?: boolean; lifted?: boolean; shake?: boolean } = {}) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: isMobile ? "12px 14px" : "14px 16px",
      borderRadius: 14, background: C.white, border: `2px solid ${opts.lifted ? C.primary : C.gray200}`,
      boxShadow: opts.ghost ? "0 16px 34px rgba(0,0,0,.28)" : opts.lifted ? "0 10px 22px rgba(74,77,201,.26)" : "0 2px 8px rgba(0,0,0,.07)",
      fontFamily: FONT, fontWeight: 600, fontSize: isMobile ? 15 : 16, color: C.ink,
      cursor: "grab", userSelect: "none", touchAction: "none", animation: opts.shake ? "thShake .45s ease" : undefined,
    }}>
      <span style={{ width: 26, height: 26, flex: "0 0 auto", borderRadius: 8, background: "#F1F1FB", display: "grid", placeItems: "center", color: C.primary }}>
        <ScaleIcon size={15} />
      </span>
      {card.text}
    </div>
  );

  const panel = (side: MethodType) => {
    const isHand = side === "byHand";
    const accent = isHand ? C.primary : C.orange;
    const tintBg = isHand ? C.lavenderSoft : C.cream;
    const title = isHand ? "By Hand" : "By Machine";
    const sub = isHand ? "farmer + wooden log" : "motorised thresher";
    const lockedHere = BOARD_CARDS.filter((c) => placed[c.id] === side);
    const hot = drag?.hover === side || (!!selected && !drag);
    return (
      <div
        ref={isHand ? handRef : machineRef}
        onClick={() => { if (selected) { const card = BOARD_CARDS.find((c) => c.id === selected); if (card) attemptPlace(card, side); } }}
        style={{
          flex: 1, minHeight: isMobile ? 230 : 300, background: hot ? tintBg : C.white,
          border: `2.5px ${hot ? "solid" : "dashed"} ${hot ? accent : C.gray200}`, borderRadius: 18,
          padding: isMobile ? 12 : 16, transition: "background .15s, border-color .15s", cursor: selected ? "pointer" : "default",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: tintBg, display: "grid", placeItems: "center" }}>
            {isHand ? <FarmerLogIcon size={42} /> : <ThresherIcon size={42} />}
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: isMobile ? 17 : 19, color: accent }}>{title}</div>
            <div style={{ color: C.gray700, fontSize: 12.5 }}>{sub}</div>
          </div>
        </div>
        {lockedHere.length === 0 && (
          <div style={{ marginTop: 14, border: `2px dashed ${hot ? accent : C.gray200}`, borderRadius: 12, padding: "18px 12px", textAlign: "center", color: hot ? accent : C.gray700, fontFamily: FONT, fontSize: 13.5, fontWeight: 600 }}>
            {selected ? "Tap here to place" : "Drop a card that fits here"}
          </div>
        )}
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {lockedHere.map((c) => (
            <div key={c.id} style={{ background: "#E9F7EF", border: `2px solid ${C.green}`, borderRadius: 12, padding: "10px 12px", animation: "thLock .4s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 14.5 : 15.5, color: "#1B7A43" }}>
                <Check size={17} /> {c.text}
              </div>
              <div style={{ marginTop: 4, color: C.gray700, fontSize: 12.5, lineHeight: 1.45 }}>{c.reason}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const confettiColors = [C.orange, C.primary, C.teal, C.amber, C.green, "#DB2777"];

  return (
    <div style={{ fontFamily: FONT }}>
      <p style={{ color: C.gray700, fontSize: isMobile ? 14 : 15, margin: "4px 2px 12px", lineHeight: 1.5 }}>
        Your turn — no right path, just try it. Drag each card to the method it suits, or tap a card then tap a side.
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: C.gray700, fontSize: 14 }}>{placedCount} of {BOARD_CARDS.length} matched</div>
      </div>

      <div style={{ background: wrong ? "#FDECEC" : "#FFF3E4", color: wrong ? C.red : C.gray700, border: `1.5px solid ${wrong ? "#F6C9C9" : "#FBE2C2"}`, borderRadius: 12, padding: "10px 14px", fontSize: isMobile ? 13.5 : 14.5, fontWeight: 600, lineHeight: 1.45, marginBottom: 12, minHeight: 20 }} role="status" aria-live="polite">
        {wrong ? (<span><X size={15} style={{ verticalAlign: "-2px" }} /> Not quite — {wrong.hint}</span>) : (<span>Sort all {BOARD_CARDS.length} cards onto the method they fit best.</span>)}
      </div>

      <div style={{ display: "flex", gap: isMobile ? 10 : 14 }}>
        {panel("byHand")}
        {panel("byMachine")}
      </div>

      {!done && (
        <div style={{ marginTop: 14, background: "#F7F7FC", borderRadius: 16, padding: isMobile ? 12 : 14 }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: C.gray700, marginBottom: 10 }}>Cards to sort</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            {pool.map((card) => {
              const isDragging = drag?.id === card.id && drag.moved;
              return (
                <div key={card.id} onPointerDown={(e) => startDrag(e, card)} style={{ opacity: isDragging ? 0.35 : 1, transition: "opacity .15s", animation: "thPop .3s ease both" }}>
                  {cardFace(card, { lifted: selected === card.id, shake: wrong?.id === card.id })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {drag && drag.moved && (
        <div style={{ position: "fixed", left: drag.x - drag.dx, top: drag.y - drag.dy, width: isMobile ? 240 : 300, zIndex: 200, pointerEvents: "none", transform: "rotate(-2deg) scale(1.03)" }}>
          {cardFace(BOARD_CARDS.find((c) => c.id === drag.id)!, { ghost: true })}
        </div>
      )}

      {done && (
        <div style={{ position: "relative", marginTop: 14 }}>
          {Array.from({ length: tier.confettiCount }).map((_, i) => (
            <div key={i} style={{ position: "absolute", top: -10, left: `${Math.random() * 100}%`, width: 9, height: 9, background: confettiColors[i % confettiColors.length], borderRadius: 2, animation: `thFall ${tier.confettiDuration}ms linear ${Math.random() * 600}ms forwards` }} />
          ))}
          <div style={{ background: C.white, borderRadius: 18, padding: isMobile ? 20 : 26, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,.12)", border: `2px solid ${C.green}`, animation: "thScaleIn .45s cubic-bezier(.2,1.3,.5,1)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#1B7A43", fontFamily: FONT, fontWeight: 800, fontSize: isMobile ? 20 : 24 }}>
              <Sparkles size={24} /> All matched!
            </div>
            <p style={{ color: C.ink, fontSize: isMobile ? 15 : 16.5, lineHeight: 1.55, margin: "12px auto 0", maxWidth: 520 }}>
              Threshing by <b>hand</b> is cheap, fuel-free, and fine for small amounts — but a <b>machine</b> threshes a whole field in a day. Both do the <b>same job</b>: separating grain from the stalks.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
              <UIButton onClick={reset} variant="highlight"><RotateCcw size={18} /> {tier.playAgainLabel}</UIButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   Root component — section nav in the fixed order
   ===================================================================== */

const SECTIONS: { id: SectionType; label: string; Icon: (p: IconProps) => JSX.Element }[] = [
  { id: "tools", label: "Tools", Icon: Puzzle },
  { id: "learn", label: "Learn", Icon: BookOpen },
  { id: "real_world", label: "Real World", Icon: Globe },
  { id: "free_play", label: "Free Play", Icon: Sparkles },
];

function ThreshingHandVsMachine({ props = {}, setStepDetails }: ThreshingToolProps) {
  const ap = props.additionalProps ?? {};
  const grade: GradeLevel = ap.gradeLevel ?? props.gradeLevel ?? 6;
  const tier = TIER_CONFIG[grade];
  const showSectionNav = ap.showSectionNav ?? props.showSectionNav ?? true;
  const showPlayPause = ap.showPlayPause ?? props.showPlayPause ?? true;
  const maxWidth = props.width ?? 940;
  const minHeight = props.height ?? 0;
  const { isMobile } = useResponsive();

  const [section, setSection] = useState<SectionType>(ap.initialSection ?? props.initialSection ?? "tools");

  // inject fonts + keyframes once
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "th-styles";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
      @keyframes thFadeUp { from { opacity:0; transform:translateY(10px);} to {opacity:1; transform:translateY(0);} }
      @keyframes thPop { 0%{transform:scale(0);} 70%{transform:scale(1.15);} 100%{transform:scale(1);} }
      @keyframes thFall { to { transform: translateY(120vh) rotate(540deg); opacity:0; } }
      @keyframes thScaleIn { from{transform:scale(.7);opacity:0;} to{transform:scale(1);opacity:1;} }
      @keyframes thShake { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-7px);} 40%{transform:translateX(6px);} 60%{transform:translateX(-4px);} 80%{transform:translateX(3px);} }
      @keyframes thLock { 0%{transform:scale(.85);opacity:.5;} 60%{transform:scale(1.06);} 100%{transform:scale(1);opacity:1;} }
      @media (prefers-reduced-motion: reduce) {
        .th-root *, .th-root *::before, .th-root *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { const e = document.getElementById("th-styles"); if (e && e.parentNode) e.parentNode.removeChild(e); };
  }, []);

  // report non-tools sections (Tools reports its own steps)
  useEffect(() => {
    if (section !== "tools") {
      setStepDetails?.({ currentStep: 1, totalSteps: 1, isPaused: true, currentMode: section });
    }
  }, [section, setStepDetails]);

  const sectionIntro: Record<SectionType, string> = {
    tools: "Explore — see threshing in action before we name the parts.",
    learn: "Learn — one idea at a time, each building on the last.",
    real_world: "Real world — where threshing happens, from a handful to a whole farm.",
    free_play: "Free play — experiment on your own.",
  };

  return (
    <div className="th-root" style={{ fontFamily: FONT, maxWidth, minHeight: minHeight || undefined, margin: "0 auto", padding: isMobile ? 12 : 18, background: C.gray100, borderRadius: 24, color: C.ink }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`, borderRadius: 18, padding: isMobile ? "16px 18px" : "20px 26px", color: C.white }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile ? 24 : 30, lineHeight: 1.1 }}>Threshing</div>
        <div style={{ opacity: 0.9, fontSize: isMobile ? 14 : 16, marginTop: 4 }}>Getting the grain out — by hand vs by machine</div>
      </div>

      {/* Section nav (fixed order: Tools → Learn → Real World → Free Play) */}
      {showSectionNav && (
        <nav aria-label="Sections" style={{ display: "flex", gap: isMobile ? 6 : 10, flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
          {SECTIONS.map(({ id, label, Icon }) => (
            <UIButton key={id} onClick={() => setSection(id)} variant={section === id ? "contained" : "outlined"} size={isMobile ? "sm" : "md"} ariaPressed={section === id}>
              <Icon size={isMobile ? 16 : 18} /> {label}
            </UIButton>
          ))}
        </nav>
      )}

      {/* Section intro line */}
      <p style={{ textAlign: "center", color: C.gray700, fontSize: isMobile ? 13 : 14, fontWeight: 600, margin: "12px 0 2px" }}>{sectionIntro[section]}</p>

      {/* Section body */}
      <div style={{ marginTop: 8 }}>
        {section === "tools" && (
          <ToolsExplorer isMobile={isMobile} showPlayPause={showPlayPause} initialMethod={ap.initialMethod ?? props.initialMethod ?? "byHand"} onReport={setStepDetails} />
        )}
        {section === "learn" && (
          <CardWalk cards={LEARN_CARDS} isMobile={isMobile} accent={C.primary} renderExtra={(c) => (c.id === "l4" ? <CompareTable isMobile={isMobile} /> : null)} />
        )}
        {section === "real_world" && (
          <CardWalk
            cards={REALWORLD_CARDS}
            isMobile={isMobile}
            accent={C.orange}
            renderExtra={(c) => {
              const rc = REALWORLD_CARDS.find((x) => x.id === c.id);
              return rc ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, color: C.orangeDark, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  <ArrowRight size={14} /> {rc.scale} scale
                </div>
              ) : null;
            }}
          />
        )}
        {section === "free_play" && <FreePlayBoard isMobile={isMobile} tier={tier} />}
      </div>
    </div>
  );
}

export default ThreshingHandVsMachine;
export { ThreshingHandVsMachine };  // named export so the preview harness can mount by name