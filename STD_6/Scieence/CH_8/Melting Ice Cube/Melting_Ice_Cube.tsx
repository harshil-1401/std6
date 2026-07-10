/* This renderer strips all `import` statements and provides React globally
   ("React and ReactDOM are always available — no need to import them").
   So we pull the hooks off the global React instead of importing them —
   relying on a stripped named import is what leaves useState/useEffect
   undefined and surfaces as React error #130 at render time. */
declare const React: any;
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ---- Agent-control constants: the host drives the tool via postMessage ---- */
const TOOL_ID = "melting_ice_cube";
const emit = (m: any) => { try { window.parent.postMessage(m, "*"); } catch {} };

/* ============================================================================
   ICONS — inline SVG components (self-contained; no lucide-react — see note
   above about this renderer not shimming that package).
   ========================================================================== */
type IconProps = { size?: number; color?: string; style?: React.CSSProperties };
const svgBase = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
});
const Snowflake = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}>
    <line x1="12" y1="2" x2="12" y2="22" /><line x1="4.2" y1="7" x2="19.8" y2="17" />
    <line x1="19.8" y1="7" x2="4.2" y2="17" />
    <path d="M12 6l-2 -1.6M12 6l2 -1.6M12 18l-2 1.6M12 18l2 1.6" />
  </svg>
);
const Droplet = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}>
    <path d="M12 2.7s6.5 7.2 6.5 11.8a6.5 6.5 0 0 1-13 0C5.5 9.9 12 2.7 12 2.7Z" />
  </svg>
);
const Sparkle = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style} fill={color}>
    <path d="M12 3l1.7 4.6L18.5 9.5 13.7 11.4 12 16l-1.7-4.6L5.5 9.5l4.8-1.9L12 3z" stroke="none" />
  </svg>
);
const Check = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polyline points="20 6 9 17 4 12" /></svg>
);
const X = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const ChevronRight = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polyline points="9 18 15 12 9 6" /></svg>
);
const ChevronLeft = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polyline points="15 18 9 12 15 6" /></svg>
);
const Play = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style} fill={color}><polygon points="6 4 20 12 6 20 6 4" stroke="none" /></svg>
);
const Pause = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style} fill={color}><rect x="6" y="4" width="4" height="16" rx="1" stroke="none" /><rect x="14" y="4" width="4" height="16" rx="1" stroke="none" /></svg>
);
const RotateCcw = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
);
const Lightbulb = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" /><path d="M10 22h4" />
  </svg>
);
const Thermometer = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}>
    <path d="M14 4a2 2 0 0 0-4 0v10.5a4 4 0 1 0 4 0Z" />
  </svg>
);
const Volume2 = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
const VolumeX = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);
const Flag = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><path d="M4 21V4" /><path d="M4 4h13l-2.5 4L17 12H4" /></svg>
);

/* ============================================================================
   Melting Ice Cube — Class 6 Science · "A Journey through States of Water"
   Predict -> Observe -> Explain -> Recap -> Practice. The student predicts what
   happens to an ice cube, scrubs/plays a melt timeline where a chunky cube
   floats and shrinks in a cup while a meltwater pool grows, gets the concept
   reveal (solid -> liquid = melting, same substance), compares it with their
   prediction, then answers a short multiple-choice practice set.
   ========================================================================== */

/* ------------------------------- Types ------------------------------------ */
type StepId = "predict" | "observe" | "explain" | "recap" | "practice";
type OperatorMode = "ai" | "student";
type Depth = "lean" | "full";
type QuizStatus = "idle" | "wrong" | "correct";

interface PredictOption { id: string; label: string; correct: boolean; }
interface QuizOption { id: string; label: string; }
interface QuizQuestion { id: string; question: string; options: QuizOption[]; correct: string; explanation: string; }

interface ToolProps {
  props?: {
    width?: number;
    height?: number;
    operatorMode?: OperatorMode;
    muted?: boolean;
    showModeToggle?: boolean;
    darkMode?: boolean;
    device?: "mobile" | "smartboard";
    themeColor?: string;
    additionalProps?: {
      totalMinutes?: number;
      operatorMode?: OperatorMode;
      muted?: boolean;
      showModeToggle?: boolean;
      device?: "mobile" | "smartboard";
    };
  };
  setStepDetails?: (s: { currentStep: number; totalSteps: number; isPaused: boolean; currentMode: string }) => void;
}

/* the 2-4 short takeaways every finish screen must show (§6.3) */
const LEARNED_POINTS = [
  "Ice is water in its solid state; liquid water is the very same substance.",
  "Warming a solid past its melting point turns it into a liquid — this change is called melting.",
  "Nothing is created or lost when ice melts — the water just changes state.",
  "Cooling liquid water in a freezer reverses the change and turns it back into solid ice.",
];

/* --------------------------- Design tokens --------------------------------- */
const DS = {
  primary: "#2E86DE",
  primaryDark: "#154360",
  primaryLight: "#D6EAF8",
  primaryGhost: "#EAF4FE",
  accent: "#FF7A45",
  accentDark: "#E85D2E",
  accentLight: "#FFE8DD",
  gray900: "#16232E",
  gray700: "#51606B",
  gray400: "#B9C6CE",
  gray200: "#E7EEF2",
  gray100: "#F4F8FA",
  white: "#FFFFFF",
  success: "#27AE60",
  successBg: "#E8F8EF",
  danger: "#E74C3C",
  dangerBg: "#FDECEA",
  amber: "#F5A623",
  iceFill: "#EAF6FF",
  iceEdge: "#9FCBEF",
  waterTop: "#8FC1F0",
  waterFill: "#3D8FE0",
} as const;

/* --------------------------- Default content -------------------------------- */
const PREDICT_OPTIONS: PredictOption[] = [
  { id: "staysSame", label: "The ice stays exactly the same, forever", correct: false },
  { id: "becomesWater", label: "The ice turns into liquid water", correct: true },
  { id: "disappears", label: "The ice disappears completely, into nothing", correct: false },
];

const CONCEPT_LINES = [
  "Ice is water in its SOLID state — it holds a fixed shape of its own.",
  "The warm air around the cup keeps passing heat into the cold ice.",
  "Once it warms past its melting point, the solid turns into a LIQUID. This change is called MELTING.",
  "Nothing was created or lost — the ice and the puddle are the very same substance: water.",
];

const QUIZ: QuizQuestion[] = [
  {
    id: "q1", question: "When ice changes into water, what is this change called?",
    options: [{ id: "optA", label: "Evaporation" }, { id: "optB", label: "Freezing" }, { id: "optC", label: "Melting" }, { id: "optD", label: "Condensation" }],
    correct: "optC", explanation: "Solid → liquid is melting. Liquid → solid (the reverse) is freezing.",
  },
  {
    id: "q2", question: "Ice and liquid water are…",
    options: [{ id: "optA", label: "Two completely different substances" }, { id: "optB", label: "The same substance in different states" }, { id: "optC", label: "Not related to each other at all" }],
    correct: "optB", explanation: "Ice and water are the same substance, water — just in the solid and liquid states.",
  },
  {
    id: "q3", question: "To turn liquid water back into solid ice, you should…",
    options: [{ id: "optA", label: "Heat it on a stove" }, { id: "optB", label: "Cool it inside a freezer" }, { id: "optC", label: "Stir it quickly" }],
    correct: "optB", explanation: "Cooling liquid water below its freezing point makes it freeze back into ice.",
  },
  {
    id: "q4", question: "What supplies the heat that melts an ice cube left on a table?",
    options: [{ id: "optA", label: "Cold air trapped inside the ice" }, { id: "optB", label: "The warm surroundings around it" }, { id: "optC", label: "Nothing — it melts on its own" }],
    correct: "optB", explanation: "The warmer surroundings keep supplying heat to the colder ice until it melts.",
  },
  {
    id: "q5", question: "Which of these is TRUE for ice, a solid?",
    options: [{ id: "optA", label: "It flows and takes the shape of its container" }, { id: "optB", label: "It keeps a fixed shape and volume of its own" }, { id: "optC", label: "It spreads out to fill all the space available" }],
    correct: "optB", explanation: "A solid keeps its own shape. A liquid takes the shape of its container; a gas fills all the space.",
  },
  {
    id: "q6", question: "As the cube melts, what happens to the total amount of water in the cup?",
    options: [{ id: "optA", label: "It slowly decreases" }, { id: "optB", label: "It stays the same — just changes from solid to liquid" }, { id: "optC", label: "It increases from nowhere" }],
    correct: "optB", explanation: "No water is gained or lost during melting — only its state changes, from solid to liquid.",
  },
];

const STEPS_FULL: StepId[] = ["predict", "observe", "explain", "recap", "practice"];
const STEPS_LEAN: StepId[] = ["predict", "observe", "explain", "practice"];
const STEP_LABEL: Record<StepId, string> = { predict: "Predict", observe: "Observe", explain: "Explain", recap: "Recap", practice: "Practice" };

/* ------------------------------ Helpers ------------------------------------ */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const useResponsive = () => {
  const [size, setSize] = useState({ w: 900, h: 700 });
  useEffect(() => {
    const h = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", h);
    h();
    return () => window.removeEventListener("resize", h);
  }, []);
  return { ...size, isMobile: size.w < 760, isNarrow: size.w < 480, isLandscape: size.w > size.h };
};

/* --------------------------- Web Audio cues --------------------------------- */
function useAudio(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };
  const tone = (freq: number, type: OscillatorType, dur: number, delay = 0, vol = 0.15) => {
    if (muted) return;
    try {
      const ac = ensure();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = freq; o.type = type;
      const st = ac.currentTime + delay;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(vol, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      o.start(st); o.stop(st + dur + 0.02);
    } catch {}
  };
  return {
    tap: () => tone(500, "sine", 0.08, 0, 0.1),
    drip: () => tone(760, "sine", 0.09, 0, 0.08),
    correct: () => { tone(587, "sine", 0.16, 0); tone(880, "sine", 0.2, 0.09); },
    wrong: () => tone(175, "triangle", 0.24, 0, 0.13),
    done: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, "sine", 0.28, i * 0.11, 0.17)); },
  };
}

/* ------------------------- Teacher | Student toggle ------------------------- */
function ModeToggle({ mode, onChange, highlighted }: { mode: OperatorMode; onChange: (m: OperatorMode) => void; highlighted?: boolean }) {
  return (
    <div
      data-hl="modeToggle"
      style={{
        display: "inline-flex", borderRadius: 12, padding: 4, gap: 4, background: DS.gray200,
        border: `1px solid ${highlighted ? DS.accent : "rgba(0,0,0,0.06)"}`,
        boxShadow: highlighted ? `0 0 0 3px ${DS.accent}55` : "none",
        transition: "box-shadow 200ms ease",
      }}
    >
      {(["ai", "student"] as const).map((m) => {
        const sel = mode === m;
        return (
          <button
            key={m} type="button" onClick={() => onChange(m)} aria-pressed={sel}
            style={{
              padding: "7px 13px", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12.5,
              background: sel ? `linear-gradient(135deg, ${DS.primaryDark}, ${DS.primary})` : "transparent",
              color: sel ? DS.white : DS.gray700, transition: "all 180ms ease", whiteSpace: "nowrap", minHeight: 32,
            }}
          >
            {m === "ai" ? "👩‍🏫 Teacher" : "🙋 Your turn"}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------- Star icon ------------------------------------ */
function StarIcon({ filled, delay = 0 }: { filled: boolean; delay?: number }) {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" style={{ animation: `mic-star-in 420ms cubic-bezier(.2,1.5,.4,1) ${delay}s both` }}>
      <path
        d="M12 2.5 14.8 8.6 21.5 9.4 16.6 13.9 18 20.6 12 17.2 6 20.6 7.4 13.9 2.5 9.4 9.2 8.6 Z"
        fill={filled ? DS.amber : "none"} stroke={filled ? "#B8790A" : DS.gray400} strokeWidth={1.4} strokeLinejoin="round"
      />
    </svg>
  );
}

function Confetti({ n }: { n: number }) {
  const pieces = useMemo(
    () => Array.from({ length: n }).map((_, i) => ({
      id: i, left: Math.random() * 100, delay: Math.random() * 0.5,
      dur: 1.8 + Math.random() * 1.1, col: [DS.primary, DS.accent, DS.success, DS.amber, "#1B4F72"][i % 5],
      size: 6 + Math.random() * 6, rot: Math.random() * 360,
    })), [n]);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pieces.map((p) => (
        <span key={p.id} style={{ position: "absolute", top: -16, left: `${p.left}%`, width: p.size, height: p.size * 0.6, background: p.col, borderRadius: 2, transform: `rotate(${p.rot}deg)`, animation: `mic-fall ${p.dur}s ${p.delay}s ease-in forwards` }} />
      ))}
    </div>
  );
}

/* ================= Finish screen — full-screen star + learned panel (§6.3) === */
function FinishOverlay({ show, onClose, stars, score, total, learned }: { show: boolean; onClose: () => void; stars: number; score: number; total: number; learned: string[] }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,20,30,0.6)", backdropFilter: "blur(2px)", animation: "mic-fade-in 320ms ease both" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}><Confetti n={70} /></div>
      <div style={{ position: "relative", pointerEvents: "auto", maxWidth: 420, width: "88%", background: DS.white, borderRadius: 26, padding: "30px 28px", boxShadow: "0 30px 70px rgba(0,0,0,.4)", textAlign: "center", animation: "mic-pop-in 420ms cubic-bezier(.2,1.4,.4,1) both", boxSizing: "border-box", fontFamily: "Poppins, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
          {[0, 1, 2].map((i) => <StarIcon key={i} filled={i < stars} delay={0.2 + i * 0.12} />)}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: DS.gray900, margin: "4px 0 2px" }}>Well done!</div>
        <div style={{ fontSize: 14, color: DS.gray700, fontWeight: 600, marginBottom: 16 }}>{score}/{total} practice questions correct</div>
        <div style={{ textAlign: "left", background: DS.primaryGhost, borderRadius: 16, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: DS.primaryDark, fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>What you have learned</div>
          {learned.map((pt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < learned.length - 1 ? 8 : 0 }}>
              <span style={{ color: DS.success, fontWeight: 800 }}>✓</span>
              <span style={{ color: DS.gray900, fontSize: 13.5, lineHeight: 1.5 }}>{pt}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ width: "100%", fontFamily: "Poppins, sans-serif", fontWeight: 700, border: "none", borderRadius: 9999, cursor: "pointer", padding: "13px 20px", fontSize: 15, minHeight: 48, color: DS.white, background: `linear-gradient(135deg, ${DS.accent}, ${DS.accentDark})`, boxShadow: "0 6px 16px rgba(255,122,69,.32)" }}>
          Close
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   MeltStage — the ice cube + cup + growing meltwater pool (SVG showpiece)
   ======================================================================= */
const glassTopY = 92, glassBottomY = 258, glassTopL = 78, glassTopR = 282, glassBotL = 108, glassBotR = 252;
const WATER_MAX_DEPTH = 76;
const ICE_START = 100;

const wavePath = (y: number, amp: number, phase: number) => {
  const seg = 46;
  let d = `M ${glassBotL - 44} ${y} `;
  for (let i = 0; i < 7; i++) {
    const dir = (i + phase) % 2 === 0 ? -amp : amp;
    d += `q ${seg / 2} ${dir} ${seg} 0 `;
  }
  d += `L ${glassBotR + 44} ${glassBottomY} L ${glassBotL - 44} ${glassBottomY} Z`;
  return d;
};

function MeltStage({ iceFraction, waterFraction, melting, minute, highlighted }: { iceFraction: number; waterFraction: number; melting: boolean; minute: number; highlighted?: boolean }) {
  const floorY = glassBottomY - 3;
  const waterDepth = waterFraction * WATER_MAX_DEPTH;
  const waterLevelY = floorY - waterDepth;
  const iceSize = ICE_START * iceFraction;
  const iceCenterX = 180;
  const submerged = 0.74;
  const iceBottomY = Math.min(floorY, waterLevelY + iceSize * submerged);
  const iceTopY = iceBottomY - iceSize;
  const iceVisible = iceFraction > 0.015;
  const cornerR = Math.min(iceSize / 2, iceSize * (0.16 + (1 - iceFraction) * 0.34));
  const waveAmp = melting ? 2 : 0.8;

  return (
    <div data-hl="stage" className={highlighted ? "mic-hl" : ""} style={{ borderRadius: 20, display: "inline-block", width: "100%" }}>
      <svg viewBox="0 0 360 300" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
        <defs>
          <linearGradient id="micWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DS.waterTop} /><stop offset="100%" stopColor={DS.waterFill} />
          </linearGradient>
          <linearGradient id="micIce" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" /><stop offset="55%" stopColor={DS.iceFill} /><stop offset="100%" stopColor={DS.iceEdge} />
          </linearGradient>
          <linearGradient id="micGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" /><stop offset="50%" stopColor="rgba(255,255,255,0.14)" /><stop offset="100%" stopColor="rgba(255,255,255,0.45)" />
          </linearGradient>
          <clipPath id="micGlassClip">
            <polygon points={`${glassTopL},${glassTopY} ${glassTopR},${glassTopY} ${glassBotR},${glassBottomY} ${glassBotL},${glassBottomY}`} />
          </clipPath>
        </defs>

        <ellipse cx="180" cy={glassBottomY + 12} rx="120" ry="13" fill="rgba(21,67,96,0.10)" />

        <g clipPath="url(#micGlassClip)">
          <path d={wavePath(waterLevelY, waveAmp + 0.6, 1)} fill={DS.waterFill} opacity={0.4} style={{ animation: melting ? "mic-wave 3.6s linear infinite" : "none" }} />
          <path d={wavePath(waterLevelY, waveAmp, 0)} fill="url(#micWater)" opacity={0.8} style={{ animation: melting ? "mic-wave 2.6s linear infinite reverse" : "none" }} />

          {iceVisible && (
            <g style={{ transformOrigin: `${iceCenterX}px ${iceBottomY}px`, animation: melting ? "mic-bob 2.8s ease-in-out infinite" : "none" }}>
              <rect x={iceCenterX - iceSize / 2} y={iceTopY} width={iceSize} height={iceSize} rx={cornerR} fill="url(#micIce)" stroke={DS.iceEdge} strokeWidth="2" />
              {waterLevelY > iceTopY && waterLevelY < iceBottomY && (
                <line x1={iceCenterX - iceSize / 2} y1={waterLevelY} x2={iceCenterX + iceSize / 2} y2={waterLevelY} stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
              )}
              <line x1={iceCenterX - iceSize * 0.22} y1={iceTopY + iceSize * 0.18} x2={iceCenterX + iceSize * 0.26} y2={iceTopY + iceSize * 0.55} stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
              <rect x={iceCenterX - iceSize / 2 + iceSize * 0.16} y={iceTopY + iceSize * 0.14} width={iceSize * 0.18} height={iceSize * 0.4} rx={4} fill="rgba(255,255,255,0.75)" style={{ animation: "mic-shimmer 2.4s ease-in-out infinite" }} />
            </g>
          )}

          {melting && iceVisible && (
            <>
              <circle cx={iceCenterX + iceSize * 0.36} cy={Math.max(iceTopY + iceSize * 0.4, waterLevelY - 14)} r={2.8} fill={DS.waterFill} style={{ animation: "mic-drip 1.4s ease-in infinite" }} />
              <circle cx={iceCenterX - iceSize * 0.34} cy={Math.max(iceTopY + iceSize * 0.5, waterLevelY - 18)} r={2.2} fill={DS.waterFill} style={{ animation: "mic-drip 1.8s ease-in 0.6s infinite" }} />
              {waterDepth > 4 && (
                <ellipse cx={iceCenterX + iceSize * 0.36} cy={waterLevelY} rx="9" ry="2.6" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" style={{ transformOrigin: `${iceCenterX}px ${waterLevelY}px`, animation: "mic-ripple 1.8s ease-out infinite" }} />
              )}
            </>
          )}
        </g>

        {/* condensation on the outer glass — ambient life, no mascot needed */}
        {[0.32, 0.62, 0.82].map((f, i) => (
          <circle key={i} cx={glassTopL + (glassTopR - glassTopL) * f} cy={glassTopY + 20 + i * 10} r={1.6}
            fill="rgba(255,255,255,0.65)" style={{ animation: `mic-sweat ${2.6 + i * 0.5}s ease-in ${i * 0.7}s infinite` }} />
        ))}

        <polygon points={`${glassTopL},${glassTopY} ${glassTopR},${glassTopY} ${glassBotR},${glassBottomY} ${glassBotL},${glassBottomY}`} fill="url(#micGlass)" stroke={DS.primaryLight} strokeWidth="3" />
        <ellipse cx="180" cy={glassTopY} rx={(glassTopR - glassTopL) / 2} ry="9" fill="rgba(255,255,255,0.4)" stroke={DS.primaryLight} strokeWidth="2.5" />

        <text x="180" y={glassBottomY + 34} textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize="14" fontWeight={700} fill={DS.gray900}>
          {Math.round(minute * 10) / 10} min
        </text>
      </svg>
    </div>
  );
}

/* ============================ Main component ============================== */
function MeltingIceCubeTool({ props = {}, setStepDetails }: ToolProps) {
  const { isMobile } = useResponsive();
  const ap = props.additionalProps ?? {};
  const showModeToggle = props.showModeToggle ?? ap.showModeToggle ?? true;
  const totalMinutes = ap.totalMinutes ?? 10;
  const themeColor = props.themeColor || DS.primary;

  /* ---- operator mode (§6.1/§6.2): Teacher = lean demo, Student = full practice ---- */
  const [operatorMode, setOperatorModeState] = useState<OperatorMode>(ap.operatorMode ?? props.operatorMode ?? "student");
  const [muted, setMuted] = useState<boolean>(ap.muted ?? props.muted ?? false);
  const depth: Depth = operatorMode === "ai" ? "lean" : "full";
  const isAI = operatorMode === "ai";
  const audio = useAudio(muted);
  const deviceCtx = ap.device ?? props.device ?? "mobile";
  const isSmartboard = deviceCtx === "smartboard";

  const STEPS = depth === "lean" ? STEPS_LEAN : STEPS_FULL;
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[Math.min(stepIdx, STEPS.length - 1)];

  const [prediction, setPrediction] = useState<string | null>(null);
  const [minute, setMinuteState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [conceptStep, setConceptStep] = useState(0);
  const [hl, setHl] = useState<string | null>(null);
  const hlTimer = useRef<number | null>(null);
  const isHL = (name: string) => hl === name;

  /* practice quiz — full set for Student, first question only for Teacher (§6.2) */
  const quizSet = depth === "lean" ? QUIZ.slice(0, 1) : QUIZ;
  const [qIdx, setQIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [qStatus, setQStatus] = useState<QuizStatus>("idle");
  const [quizScore, setQuizScore] = useState(0);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  // Tracks every question that has been SUBMITTED at least once, right or wrong — unlike
  // `answered` (only set true on a correct submit), this is what "the quiz is done" means.
  const [attempted, setAttempted] = useState<Record<string, boolean>>({});
  const [breakdown, setBreakdown] = useState<{ id: string; correct: boolean; chose: string | null }[]>([]);
  const quizDone = Object.keys(attempted).length >= quizSet.length && quizSet.length > 0;

  const [finished, setFinished] = useState(false);
  const [finishSummary, setFinishSummary] = useState<{ stars: number; score: number; total: number } | null>(null);

  /* ---- interaction tracking for the uniform `finished` event ---- */
  const startTimeRef = useRef<number>(Date.now());
  const visitedRef = useRef<Set<string>>(new Set());
  const attemptsRef = useRef(0);
  const firstTryRef = useRef<Set<string>>(new Set());
  const attemptedOnceRef = useRef<Set<string>>(new Set());
  const hintsUsedRef = useRef(0);

  useEffect(() => { if (props.operatorMode) setOperatorModeState(props.operatorMode); }, [props.operatorMode]);
  useEffect(() => { if (props.muted !== undefined) setMuted(props.muted); }, [props.muted]);

  /* inject keyframes + font once */
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-mic", "true");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      @keyframes mic-fadeInUp { from { opacity:0; transform:translateY(18px);} to { opacity:1; transform:translateY(0);} }
      @keyframes mic-pop { 0%{transform:scale(0);opacity:0;} 70%{transform:scale(1.06);} 100%{transform:scale(1);opacity:1;} }
      @keyframes mic-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.04);} }
      @keyframes mic-drip { 0%{transform:translateY(0);opacity:0;} 20%{opacity:.9;} 100%{transform:translateY(26px);opacity:0;} }
      @keyframes mic-shimmer { 0%{opacity:.25;} 50%{opacity:.6;} 100%{opacity:.25;} }
      @keyframes mic-bob { 0%,100%{transform:translateY(0) rotate(-1.5deg);} 50%{transform:translateY(-4px) rotate(1.5deg);} }
      @keyframes mic-wave { 0%{transform:translateX(0);} 100%{transform:translateX(-40px);} }
      @keyframes mic-sweat { 0%{transform:translateY(0);opacity:0;} 30%{opacity:.85;} 100%{transform:translateY(34px);opacity:0;} }
      @keyframes mic-ripple { 0%{transform:scale(.4);opacity:.6;} 100%{transform:scale(2.6);opacity:0;} }
      @keyframes mic-fall { to { transform: translateY(640px) rotate(540deg); opacity: 0; } }
      @keyframes mic-fade-in { from { opacity: 0 } to { opacity: 1 } }
      @keyframes mic-pop-in { from { opacity: 0; transform: scale(.85) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      @keyframes mic-star-in { from { opacity: 0; transform: scale(0) rotate(-30deg) } to { opacity: 1; transform: scale(1) rotate(0) } }
      @keyframes mic-caption-pulse { 0%,100% { opacity: .78 } 50% { opacity: 1 } }
      @keyframes mic-ring { 0%,100%{ box-shadow: 0 0 0 3px ${DS.accent}, 0 0 0 3px rgba(255,122,69,0) } 50%{ box-shadow: 0 0 0 3px ${DS.accent}, 0 0 0 10px rgba(255,122,69,0) } }
      .mic-hl { animation: mic-ring 1.05s ease-in-out infinite; border-radius: inherit; }
      .mic-slider::-webkit-slider-thumb { -webkit-appearance:none; width:26px; height:26px; border-radius:50%; background:${DS.white}; border:4px solid ${DS.primary}; box-shadow:0 2px 8px rgba(0,0,0,.25); cursor:pointer; }
      .mic-slider::-moz-range-thumb { width:26px; height:26px; border-radius:50%; background:${DS.white}; border:4px solid ${DS.primary}; box-shadow:0 2px 8px rgba(0,0,0,.25); cursor:pointer; }
      @media (orientation: landscape) {
        .mic-body-grid { display:grid; grid-template-columns: minmax(220px, 1fr) minmax(260px, 1.2fr); gap: 16px; align-items: stretch; }
      }
      @media (prefers-reduced-motion: reduce) {
        .mic-hl, [style*="mic-star-in"], [style*="mic-pop-in"] { animation: none !important; }
        *[style*="animation"] { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.querySelectorAll('style[data-mic]').forEach((s: any) => s.remove()); };
  }, []);

  useEffect(() => {
    setStepDetails?.({ currentStep: stepIdx, totalSteps: STEPS.length, isPaused: !playing, currentMode: step });
  }, [stepIdx, playing, step]); // eslint-disable-line

  /* auto-melt animation loop */
  useEffect(() => {
    if (!playing || step !== "observe") return;
    let raf = 0; let last = performance.now();
    const durMs = 12000;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 48); last = now;
      setMinuteState((prev: number) => {
        const next = prev + (dt / durMs) * totalMinutes;
        if (next >= totalMinutes) return totalMinutes;
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, step, totalMinutes]);

  useEffect(() => { if (minute >= totalMinutes) setPlaying(false); }, [minute, totalMinutes]);

  /* reveal concept lines progressively on Explain */
  useEffect(() => {
    if (step !== "explain") return;
    setConceptStep(0);
    const t = setInterval(() => setConceptStep((c: number) => (c < CONCEPT_LINES.length ? c + 1 : c)), 650);
    return () => clearInterval(t);
  }, [step]);

  const live = useRef<any>({});
  live.current = { step, stepIdx, prediction, minute, qIdx, chosen, qStatus, answered, attempted, quizScore, STEPS, quizSet };

  const emitEvent = (name: string, detail: any) => emit({ type: "event", name, detail });

  /* ---- Teacher|Student mode switch — drives UI collapse + content depth (§6.1/6.2) ---- */
  const applyOperatorMode = useCallback((m: OperatorMode) => {
    const v = m === "ai" ? "ai" : "student";
    setOperatorModeState(v);
    setStepIdx(0);
    emitEvent("operator_mode_changed", { operatorMode: v, depth: v === "ai" ? "lean" : "full" });
    return { ok: true };
  }, []);

  /* ---- Agent guidance: pulse a named element (non-destructive) ---- */
  const doHighlight = useCallback((target: string) => {
    if (typeof target !== "string") return { ok: false };
    setHl(target);
    if (hlTimer.current) window.clearTimeout(hlTimer.current);
    hlTimer.current = window.setTimeout(() => setHl(null), 2400);
    return { ok: true };
  }, []);

  const goToStep = useCallback((stepId: string) => {
    const idx = live.current.STEPS.indexOf(stepId);
    if (idx < 0) return { ok: false, reason: "unknown step" };
    setStepIdx(idx);
    visitedRef.current.add(stepId);
    emitEvent("step_changed", { step: stepId });
    return { ok: true };
  }, []);

  const doPredict = useCallback((optionId: string) => {
    if (!PREDICT_OPTIONS.some((p) => p.id === optionId)) return { ok: false, reason: "unknown option" };
    setPrediction(optionId);
    audio.tap();
    emitEvent("prediction_made", { optionId });
    return { ok: true };
  }, [audio]);

  const doSetMinute = useCallback((m: number) => {
    const clamped = clamp(Number(m) || 0, 0, totalMinutes);
    setPlaying(false);
    setMinuteState(clamped);
    emitEvent("minute_changed", { minute: clamped });
    if (clamped >= totalMinutes) emitEvent("melt_completed", { minute: clamped });
    return { ok: true, minute: clamped };
  }, [totalMinutes]);

  const doPlay = useCallback(() => {
    if (live.current.step !== "observe") goToStep("observe");
    if (live.current.minute >= totalMinutes) return { ok: true, done: true };
    setPlaying(true);
    return { ok: true };
  }, [totalMinutes]);
  const doPause = useCallback(() => { setPlaying(false); return { ok: true }; }, []);

  const doChoose = useCallback((optionId: string) => {
    const q: QuizQuestion = live.current.quizSet[live.current.qIdx];
    if (!q) return { ok: false, reason: "no active question" };
    if (live.current.answered[q.id]) return { ok: true, already: true };
    if (!q.options.some((o) => o.id === optionId)) return { ok: false, reason: "unknown option" };
    setChosen(optionId);
    setQStatus("idle");
    audio.tap();
    emitEvent("option_chosen", { questionId: q.id, optionId });
    return { ok: true };
  }, [audio]);

  const doSubmit = useCallback(() => {
    const q: QuizQuestion = live.current.quizSet[live.current.qIdx];
    if (!q) return { ok: false, reason: "no active question" };
    if (live.current.answered[q.id]) return { ok: true, already: true };
    const pick = live.current.chosen;
    if (!pick) return { ok: false, reason: "no option chosen yet" };
    const correct = pick === q.correct;
    attemptsRef.current += 1;
    const firstAttempt = !attemptedOnceRef.current.has(q.id);
    attemptedOnceRef.current.add(q.id);
    setAttempted((a: Record<string, boolean>) => ({ ...a, [q.id]: true }));
    emitEvent("answer_checked", { questionId: q.id, optionId: pick, correct });
    if (correct) {
      if (firstAttempt) firstTryRef.current.add(q.id);
      setQStatus("correct");
      setQuizScore((s: number) => s + 1);
      setAnswered((a: Record<string, boolean>) => ({ ...a, [q.id]: true }));
      setBreakdown((b) => [...b, { id: q.id, correct: true, chose: pick }]);
      audio.correct();
      emitEvent("answer_correct", { questionId: q.id, optionId: pick });
    } else {
      hintsUsedRef.current += 1;
      setQStatus("wrong");
      audio.wrong();
      emitEvent("answer_incorrect", { questionId: q.id, optionId: pick, hint: "Re-read the sentence and think about what actually happens to the ice — try again." });
    }
    return { ok: true, correct };
  }, [audio]);

  const doNext = useCallback(() => {
    const s: StepId = live.current.step;
    if (s === "practice") {
      const q: QuizQuestion = live.current.quizSet[live.current.qIdx];
      // Gate on "attempted" (any submit, right or wrong), not "answered" (only set on a
      // CORRECT submit) — otherwise a wrong answer permanently blocks the Next button.
      if (q && !live.current.attempted[q.id]) return { ok: false, reason: "answer the current question first" };
      if (live.current.qIdx + 1 < live.current.quizSet.length) {
        setQIdx((i: number) => i + 1); setChosen(null); setQStatus("idle");
        return { ok: true };
      }
      const total = live.current.quizSet.length;
      if (total > 0 && Object.keys(live.current.attempted).length >= total) emitEvent("completed", { score: live.current.quizScore, total });
      return { ok: true, done: true };
    }
    const idx = live.current.stepIdx;
    if (s === "predict" && !live.current.prediction) return { ok: false, reason: "make a prediction first" };
    if (idx + 1 < live.current.STEPS.length) {
      setStepIdx(idx + 1);
      visitedRef.current.add(live.current.STEPS[idx + 1]);
      emitEvent("step_changed", { step: live.current.STEPS[idx + 1] });
    }
    return { ok: true };
  }, []);

  const doPrev = useCallback(() => {
    const idx = live.current.stepIdx;
    if (idx > 0) { setStepIdx(idx - 1); emitEvent("step_changed", { step: live.current.STEPS[idx - 1] }); }
    return { ok: true };
  }, []);

  /* ---- agent-only reset: returns to the very start. NEVER exposed as a
     student "Play again" whole-tool loop (§6.3) — student's forward path
     ends at Finish; only the agent (or a fresh mount) calls this. ---- */
  const resetAll = useCallback(() => {
    setStepIdx(0);
    setPrediction(null);
    setMinuteState(0);
    setPlaying(false);
    setConceptStep(0);
    setQIdx(0);
    setChosen(null);
    setQStatus("idle");
    setQuizScore(0);
    setAnswered({});
    setAttempted({});
    setBreakdown([]);
    setFinished(false);
    setFinishSummary(null);
    startTimeRef.current = Date.now();
    visitedRef.current = new Set();
    attemptsRef.current = 0;
    firstTryRef.current = new Set();
    attemptedOnceRef.current = new Set();
    hintsUsedRef.current = 0;
    emitEvent("reset", {});
    return { ok: true };
  }, []);

  /* ---- Finish (student mode only) — the uniform end-of-tool event (§6.3) ---- */
  const handleFinish = useCallback(() => {
    if (finished) return { ok: true, already: true };
    const total = live.current.quizSet.length;
    const score = live.current.quizScore;
    const ratio = total > 0 ? score / total : 0;
    const stars = total === 0 ? 0 : ratio >= 1 && hintsUsedRef.current === 0 ? 3 : ratio >= 1 ? 2 : ratio >= 0.5 ? 1 : 0;
    const durationMs = Date.now() - startTimeRef.current;
    setFinished(true);
    setFinishSummary({ stars, score, total });
    audio.done();
    emit({
      type: "event", name: "finished",
      detail: {
        evaluated: true, score, total, stars, breakdown,
        interactions: {
          attempts: attemptsRef.current, correctFirstTry: firstTryRef.current.size,
          hintsUsed: hintsUsedRef.current, itemsExplored: Array.from(visitedRef.current), durationMs,
        },
        learned: LEARNED_POINTS.slice(0, 4),
      },
    });
    return { ok: true, score, total, stars };
  }, [breakdown, finished, audio]);

  const snapshot = useCallback(() => ({
    step: live.current.step,
    prediction: live.current.prediction,
    minute: live.current.minute,
    quizQuestionId: live.current.quizSet[live.current.qIdx]?.id ?? null,
    quizScore: live.current.quizScore,
    quizTotal: live.current.quizSet.length,
    quizDone: Object.keys(live.current.attempted).length >= live.current.quizSet.length,
    operatorMode, depth, muted, finished,
  }), [operatorMode, depth, muted, finished]);

  /* ---- The agent API: every windowMethod in the JSON lives here ---- */
  const api = {
    setParam: (n: string, v: any) => {
      if (n === "operatorMode") return applyOperatorMode(v);
      if (n === "muted") { setMuted(!!v); return { ok: true }; }
      return { ok: true };
    },
    play: () => doPlay(),
    pause: () => doPause(),
    reset: () => resetAll(),
    highlight: doHighlight,
    getState: () => { const st = snapshot(); emit({ type: "state", state: st }); return st; },
    setOperatorMode: (mode: OperatorMode) => applyOperatorMode(mode),
    goToStep: (stepId: string) => goToStep(stepId),
    predict: (optionId: string) => doPredict(optionId),
    setMinute: (m: number) => doSetMinute(m),
    choose: (optionId: string) => doChoose(optionId),
    submit: () => doSubmit(),
    next: () => doNext(),
    prev: () => doPrev(),
    finish: () => handleFinish(),
  };
  const apiRef = useRef(api); apiRef.current = api;

  /* ---- Command listener + the REQUIRED ready signal ---- */
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== "command") return;
      try {
        const fn = (apiRef.current as any)[d.method];
        const result = typeof fn === "function" ? fn(...(Array.isArray(d.args) ? d.args : [])) : { ok: false, reason: "unknown method" };
        emit({ type: "response", id: d.id, result });
      } catch (err) {
        emit({ type: "response", id: d.id, result: { ok: false, error: String(err) } });
      }
    };
    window.addEventListener("message", onMsg);
    emit({ type: "ready", toolId: TOOL_ID }); // ⭐ commands before this are queued by the host
    return () => window.removeEventListener("message", onMsg);
  }, []);

  /* styles — §7.4 device-target minimums: mobile ≥24px, smartboard ≥60x30 (primary CTA bigger) */
  const btnBase: React.CSSProperties = { fontFamily: "Poppins, sans-serif", fontWeight: 700, border: "none", borderRadius: 9999, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: isSmartboard ? "18px 30px" : "12px 24px", fontSize: isSmartboard ? 20 : 15, minHeight: isSmartboard ? 64 : 46, transition: "transform 100ms ease, filter 120ms ease" };
  const primaryBtn: React.CSSProperties = { ...btnBase, background: `linear-gradient(135deg, ${DS.accent}, ${DS.accentDark})`, color: DS.white, boxShadow: "0 6px 16px rgba(255,122,69,.3)" };
  const ghostBtn: React.CSSProperties = { ...btnBase, background: DS.white, color: DS.primary, border: `2px solid ${DS.primaryLight}` };
  const disabledBtn: React.CSSProperties = { ...btnBase, background: DS.gray200, color: DS.gray400, cursor: "not-allowed", boxShadow: "none" };
  const cardStyle: React.CSSProperties = { background: DS.white, borderRadius: 20, padding: isMobile ? "14px 14px" : "18px 20px", boxShadow: "0 4px 18px rgba(21,67,96,.08)", boxSizing: "border-box" };

  const iceFraction = clamp(1 - minute / totalMinutes, 0, 1);
  const waterFraction = clamp(minute / totalMinutes, 0, 1);
  const fullyMelted = minute >= totalMinutes;
  const predictionCorrect = useMemo(() => PREDICT_OPTIONS.find((p) => p.id === prediction)?.correct ?? false, [prediction]);
  const stepIndexVisible = STEPS.indexOf(step);

  /* ===================== step panels ===================== */
  const renderPredict = () => (
    <div style={{ animation: "mic-fadeInUp .45s ease-out" }}>
      <SectionTag icon={<Thermometer size={15} />} text="Step 1 · Predict" />
      <h3 style={h3}>Before we start — what will happen to the ice?</h3>
      <p style={pBody}>A cube of ice is placed in a cup and left on the table. Make your prediction before you watch.</p>
      <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
        {PREDICT_OPTIONS.map((p) => {
          const sel = prediction === p.id;
          return (
            <button key={p.id} data-hl={`predict_${p.id}`} className={isHL(`predict_${p.id}`) ? "mic-hl" : ""} onClick={() => doPredict(p.id)}
              style={{
                fontFamily: "Poppins, sans-serif", fontSize: 14.5, fontWeight: 600, textAlign: "left",
                padding: "13px 16px", borderRadius: 14, cursor: "pointer", minHeight: 44,
                border: sel ? `2px solid ${themeColor}` : `2px solid ${DS.gray200}`,
                background: sel ? DS.primaryGhost : DS.white, color: DS.gray900, transition: "all 180ms ease",
                animation: sel ? "mic-pop .35s ease-out" : "none", display: "flex", alignItems: "center", gap: 10,
              }}>
              {p.id === "staysSame" ? <Snowflake size={17} color={DS.primary} /> : p.id === "becomesWater" ? <Droplet size={17} color={DS.primary} /> : <Sparkle size={17} color={DS.primary} />}
              {p.label}
            </button>
          );
        })}
      </div>
      {prediction && <p style={hint}>Prediction locked in. Tap <b>Next</b> to test it →</p>}
    </div>
  );

  const renderObserve = () => (
    <div style={{ animation: "mic-fadeInUp .45s ease-out" }}>
      <SectionTag icon={<Snowflake size={15} />} text="Step 2 · Observe" />
      <h3 style={h3}>Watch the ice over {totalMinutes} minutes</h3>
      <p style={pBody}>Press play, or drag the slider yourself — watch the cube and the pool below it.</p>
      <div style={{ marginTop: 12 }}>
        <label style={{ fontFamily: "Poppins, sans-serif", fontSize: 12.5, fontWeight: 700, color: DS.gray700 }}>Time elapsed: {Math.round(minute * 10) / 10} min</label>
        <input data-hl="slider" className={`mic-slider ${isHL("slider") ? "mic-hl" : ""}`} type="range" min={0} max={totalMinutes} step={0.1} value={minute}
          onChange={(e: any) => doSetMinute(Number(e.target.value))}
          style={{ width: "100%", accentColor: themeColor, marginTop: 6, height: 8, borderRadius: 9999 }} />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <Readout label="Ice left" value={`${Math.round(iceFraction * 100)}%`} color={DS.iceEdge} icon={<Snowflake size={13} />} />
        <Readout label="Melted to water" value={`${Math.round(waterFraction * 100)}%`} color={DS.waterFill} icon={<Droplet size={13} />} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button data-hl="playButton" className={isHL("playButton") ? "mic-hl" : ""} style={fullyMelted ? disabledBtn : ghostBtn} disabled={fullyMelted} onClick={() => (playing ? doPause() : doPlay())}>
          {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? "Pause" : "Play"}
        </button>
      </div>
      {fullyMelted && <p style={hint}>The ice is gone — the cup is full of meltwater! Tap <b>Next</b> to find out why →</p>}
    </div>
  );

  const renderExplain = () => (
    <div style={{ animation: "mic-fadeInUp .45s ease-out" }}>
      <SectionTag icon={<Lightbulb size={15} />} text="Step 3 · Explain" />
      <h3 style={h3}>So what really happened?</h3>
      <div data-hl="explainPanel" className={isHL("explainPanel") ? "mic-hl" : ""} style={{ display: "grid", gap: 9, marginTop: 12, borderRadius: 12 }}>
        {CONCEPT_LINES.map((line, i) => (
          <div key={i} style={{ display: i < conceptStep ? "flex" : "none", gap: 9, alignItems: "flex-start", padding: "11px 13px", borderRadius: 12, background: DS.primaryGhost, fontFamily: "Poppins, sans-serif", fontSize: 13.5, color: DS.gray900, fontWeight: 500, animation: "mic-fadeInUp .4s ease-out" }}>
            <span style={{ minWidth: 20, height: 20, borderRadius: 9999, background: DS.accent, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRecap = () => (
    <div style={{ animation: "mic-fadeInUp .45s ease-out", position: "relative" }}>
      <SectionTag icon={<RotateCcw size={15} />} text="Step 4 · Recap" />
      <h3 style={h3}>How did your prediction do?</h3>
      <div data-hl="recapPanel" className={isHL("recapPanel") ? "mic-hl" : ""} style={{ marginTop: 12, padding: "14px 16px", borderRadius: 16, background: predictionCorrect ? DS.successBg : DS.accentLight, border: `2px solid ${predictionCorrect ? DS.success : DS.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
          <span style={{ width: 28, height: 28, borderRadius: 9999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: predictionCorrect ? DS.success : DS.accent, color: "#fff" }}>
            {predictionCorrect ? <Check size={16} /> : <X size={16} />}
          </span>
          <b style={{ fontFamily: "Poppins, sans-serif", fontSize: 15, color: DS.gray900 }}>{predictionCorrect ? "Spot on!" : "Good try!"}</b>
        </div>
        <p style={{ fontFamily: "Poppins, sans-serif", fontSize: 13.5, color: DS.gray900, margin: 0, lineHeight: 1.5 }}>
          You predicted: <b>{PREDICT_OPTIONS.find((p) => p.id === prediction)?.label ?? "—"}</b>.<br />
          The ice <b>melted into water</b> — the same substance, just a liquid now. This is called <b>melting</b>.
        </p>
      </div>
      {predictionCorrect && (
        <div style={{ position: "absolute", top: 0, left: "50%", pointerEvents: "none" }}>
          {[...Array(8)].map((_, i) => (
            <span key={i} style={{ position: "absolute", width: 7, height: 7, borderRadius: 2, background: [DS.primary, DS.accent, DS.success, DS.amber][i % 4], left: (i - 4) * 15, animation: `mic-fall ${0.9 + (i % 3) * 0.3}s ease-in ${i * 0.05}s forwards` }} />
          ))}
        </div>
      )}
      <p style={hint}>Ready to try a few practice questions? Tap <b>Next</b> →</p>
    </div>
  );

  const renderPractice = () => {
    const total = quizSet.length;
    if (quizDone) {
      return (
        <div style={{ ...cardStyle, textAlign: "center", animation: "mic-pop .5s ease-out" }}>
          <div style={{ fontSize: 34, marginBottom: 4 }}>{quizScore === total ? "🏆" : "🌟"}</div>
          <h3 style={h3}>You scored {quizScore} / {total}</h3>
          <p style={{ fontFamily: "Poppins, sans-serif", color: DS.gray700, fontSize: 13.5 }}>
            {quizScore === total ? "Perfect — you understand melting!" : "Nice work — review the ideas above any time."}
          </p>
        </div>
      );
    }
    const q = quizSet[qIdx];
    if (!q) return null;
    return (
      <div style={{ ...cardStyle, animation: "mic-fadeInUp .4s ease-out" }}>
        <SectionTag icon={<Thermometer size={15} />} text={`Question ${qIdx + 1} of ${total}`} />
        <h3 style={h3}>{q.question}</h3>
        <div data-hl="quizOptions" className={isHL("quizOptions") ? "mic-hl" : ""} style={{ display: "grid", gap: 9, marginTop: 10, borderRadius: 12 }}>
          {q.options.map((opt) => {
            const isAns = opt.id === q.correct;
            const isChosen = chosen === opt.id;
            let bg = DS.white, bd = DS.gray200;
            if (qStatus !== "idle") {
              if (isAns) { bg = DS.successBg; bd = DS.success; }
              else if (isChosen) { bg = DS.dangerBg; bd = DS.danger; }
            } else if (isChosen) { bd = themeColor; bg = DS.primaryGhost; }
            return (
              <button key={opt.id} onClick={() => doChoose(opt.id)} disabled={qStatus !== "idle"}
                style={{ fontFamily: "Poppins, sans-serif", fontSize: 14, fontWeight: 600, textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: qStatus === "idle" ? "pointer" : "default", border: `2px solid ${bd}`, background: bg, color: DS.gray900, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 160ms ease", minHeight: 44 }}>
                {opt.label}
                {qStatus !== "idle" && isAns && <Check size={17} color={DS.success} />}
                {qStatus !== "idle" && isChosen && !isAns && <X size={17} color={DS.danger} />}
              </button>
            );
          })}
        </div>
        {qStatus === "idle" ? (
          <button style={{ ...(chosen ? primaryBtn : disabledBtn), marginTop: 12, width: "100%" }} disabled={!chosen} onClick={doSubmit}>Check answer</button>
        ) : (
          <div style={{ marginTop: 12, padding: "11px 13px", borderRadius: 12, background: DS.gray100, animation: "mic-fadeInUp .35s ease-out" }}>
            <p style={{ fontFamily: "Poppins, sans-serif", fontSize: 13, color: DS.gray900, margin: 0 }}>{q.explanation}</p>
            <button style={{ ...primaryBtn, marginTop: 10, width: "100%" }} onClick={doNext}>
              {qIdx + 1 >= total ? "See result" : "Next question"} <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const panels: Record<StepId, () => any> = { predict: renderPredict, observe: renderObserve, explain: renderExplain, recap: renderRecap, practice: renderPractice };
  const showStage = step !== "practice";

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", background: DS.gray100, minHeight: "100%", maxHeight: "100dvh", overflow: isAI ? "hidden" : "auto", width: "100%", color: DS.gray900, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "12px 12px 20px" : "18px 22px 30px", boxSizing: "border-box" }}>

        {/* ===================== HEADER ===================== */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: DS.primary, textTransform: "uppercase" }}>Class 6 · States of Water</div>
            <div style={{ fontWeight: 800, fontSize: isMobile ? 16 : 19, color: DS.primaryDark, display: "flex", alignItems: "center", gap: 7 }}>
              <Snowflake size={17} color={DS.primary} /> Melting Ice Cube
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {showModeToggle && <ModeToggle mode={operatorMode} onChange={applyOperatorMode} highlighted={isHL("modeToggle")} />}
            <button data-hl="muteButton" className={isHL("muteButton") ? "mic-hl" : ""} onClick={() => setMuted((m: boolean) => !m)} aria-label={muted ? "Unmute sound" : "Mute sound"}
              style={{ width: isSmartboard ? 60 : 36, height: isSmartboard ? 60 : 36, borderRadius: 9999, border: `2px solid ${DS.primaryLight}`, background: DS.white, color: DS.primary, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* ===================== TEACHER caption ===================== */}
        {isAI && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: DS.primaryGhost, color: DS.primaryDark, borderRadius: 12, padding: "9px 14px", fontWeight: 700, fontSize: 12.5, marginBottom: 12, animation: "mic-caption-pulse 2.2s ease-in-out infinite" }}>
            👩‍🏫 Your teacher is showing you this — watch, you'll get a turn
          </div>
        )}

        {/* ===================== step dots (student mode) ===================== */}
        {!isAI && (
          <div data-hl="stepDots" className={isHL("stepDots") ? "mic-hl" : ""} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 12, borderRadius: 9999, flexWrap: "wrap" }}>
            {STEPS.map((s, i) => (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 9999, fontSize: 11.5, fontWeight: 700, background: i === stepIndexVisible ? DS.primary : i < stepIndexVisible ? DS.successBg : DS.gray200, color: i === stepIndexVisible ? "#fff" : i < stepIndexVisible ? DS.success : DS.gray700 }}>
                {i < stepIndexVisible && <Check size={11} />} {STEP_LABEL[s]}
              </span>
            ))}
          </div>
        )}

        {/* ===================== BODY ===================== */}
        {showStage ? (
          <div className="mic-body-grid">
            <div style={{ ...cardStyle, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <MeltStage iceFraction={iceFraction} waterFraction={waterFraction} melting={playing} minute={minute} highlighted={isHL("stage")} />
            </div>
            <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1 }}>{panels[step]()}</div>
              {!isAI && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${DS.gray200}`, gap: 8 }}>
                  <button data-hl="prevButton" className={isHL("prevButton") ? "mic-hl" : ""} style={stepIndexVisible === 0 ? disabledBtn : ghostBtn} disabled={stepIndexVisible === 0} onClick={doPrev}>
                    <ChevronLeft size={15} /> Back
                  </button>
                  <button data-hl="nextButton" className={isHL("nextButton") ? "mic-hl" : ""}
                    style={(step === "predict" && !prediction) ? disabledBtn : primaryBtn}
                    disabled={step === "predict" && !prediction}
                    onClick={doNext}>
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            {panels[step]()}
            {!isAI && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
                <button style={stepIndexVisible === 0 ? disabledBtn : ghostBtn} disabled={stepIndexVisible === 0} onClick={doPrev}>
                  <ChevronLeft size={15} /> Back
                </button>
                <button data-hl="finishButton" className={isHL("finishButton") ? "mic-hl" : ""}
                  style={(!quizDone || finished) ? disabledBtn : primaryBtn} disabled={!quizDone || finished} onClick={handleFinish}>
                  <Flag size={16} /> Finish
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {finishSummary && (
        <FinishOverlay show={finished} onClose={() => setFinished(false)} stars={finishSummary.stars} score={finishSummary.score} total={finishSummary.total} learned={LEARNED_POINTS} />
      )}
    </div>
  );
}

/* ==================== small presentational helpers ==================== */
const h3: React.CSSProperties = { fontFamily: "Poppins, sans-serif", fontSize: 16.5, fontWeight: 800, color: DS.gray900, margin: "8px 0 4px" };
const pBody: React.CSSProperties = { fontFamily: "Poppins, sans-serif", fontSize: 13.5, color: DS.gray700, margin: "0 0 4px", lineHeight: 1.5 };
const hint: React.CSSProperties = { fontFamily: "Poppins, sans-serif", fontSize: 12.5, color: DS.primaryDark, fontWeight: 600, marginTop: 12, lineHeight: 1.5 };

function SectionTag({ icon, text }: { icon: any; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 9999, background: `linear-gradient(135deg, ${DS.primaryDark}, ${DS.primary})`, color: "#fff", fontFamily: "Poppins, sans-serif", fontSize: 11.5, fontWeight: 700 }}>
      {icon}{text}
    </span>
  );
}

function Readout({ label, value, color, icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <div style={{ flex: 1, padding: "9px 11px", borderRadius: 12, background: DS.gray100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color, fontFamily: "Poppins, sans-serif", fontSize: 11, fontWeight: 700 }}>{icon}{label}</div>
      <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 19, fontWeight: 800, color: DS.gray900 }}>{value}</div>
    </div>
  );
}

export default MeltingIceCubeTool;
