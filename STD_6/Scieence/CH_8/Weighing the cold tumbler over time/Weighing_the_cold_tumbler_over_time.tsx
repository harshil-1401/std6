/* ═══════════════════════════════════════════════════════════════════════════
   File: Weighing_the_cold_tumbler_over_time.tsx
   Tool: condensation_mass_balance_tool  —  Class 6 Science
   Concept: Condensation adds mass. A covered tumbler of iced water sits on a
   digital balance; water vapour already in the surrounding air condenses on
   the cold outer wall, adding mass to the whole setup, while the sealed water
   inside is completely unchanged. Targets the misconception that the outside
   droplets "seeped" or "sweated" from the sealed water inside.
   Flow: Predict -> Step the timer (Observe + two in-context checks) -> Explain
   -> Finish (⭐ star screen + "what you have learned").
   Agent-control contract per the platform's 2D-tool authoring spec: emits
   `ready` on mount, handles {type:'command', id, method, args} via an
   always-fresh apiRef, and reports `event`/`state`/`response` messages.
   ═══════════════════════════════════════════════════════════════════════════ */

/* This renderer strips all `import` statements and provides React globally.
   Pull hooks off the global React instead of a stripped named import (that is
   what leaves useState/useEffect undefined and surfaces as React error #130). */
declare const React: any;
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ---- Agent-control constants ---- */
const TOOL_ID = "condensation_mass_balance_tool";
const emit = (m: any) => { try { window.parent.postMessage(m, "*"); } catch {} };

/* ============================================================================
   ICONS — inline SVG, no external icon dependency
   ========================================================================== */
type IconProps = { size?: number; color?: string; style?: React.CSSProperties };
const svgBase = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
});
const Play = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style} fill={color}><polygon points="6 4 20 12 6 20 6 4" /></svg>
);
const Droplets = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><path d="M12 2.7S6 9 6 14a6 6 0 0 0 12 0c0-5-6-11.3-6-11.3z" /></svg>
);
const TrendingUp = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></svg>
);
const Eye = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
);
const Lightbulb = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></svg>
);
const Volume2 = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
);
const VolumeX = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
);
const Flag = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><path d="M4 21V4" /><path d="M4 4h13l-2.5 4L17 12H4" /></svg>
);
/* ============================================================================
   Design tokens (Singularity design system: Poppins, indigo/orange)
   ========================================================================== */
const DS = {
  primary: "#4A4DC9", primaryDark: "#533086", primaryLight: "#C1C1EA", primaryGhost: "#EDEDF8",
  accent: "#FF7212", accentDark: "#FC9145", accentLight: "#FFF3E4",
  gray900: "#1A1A2E", gray700: "#4E4E4E", gray400: "#CACACA", gray200: "#EBEBEB", gray100: "#F5F5F5",
  white: "#FFFFFF", success: "#2ECC71",
  water: "#3FA9F5", waterDeep: "#1E6FB5",
} as const;
const FONT = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/* ============================================================================
   Types
   ========================================================================== */
type OperatorMode = "ai" | "student";
type Depth = "lean" | "full";
type SubPhase = "observe" | "explain";

interface AdditionalProps {
  startReading?: number;
  ratePerInterval?: number;
  intervalMinutes?: number;
  totalIntervals?: number;
  liquidLabel?: string;
  unit?: string;
  animationSpeed?: number;
  seed?: number;
}
interface ToolProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    operatorMode?: OperatorMode;
    muted?: boolean;
    showModeToggle?: boolean;
    device?: "mobile" | "smartboard";
    additionalProps?: AdditionalProps;
  };
  setStepDetails?: (s: { currentStep: number; totalSteps: number; isPaused: boolean; currentMode: string }) => void;
}

/* the 2-4 short takeaways every finish screen must show (§6.3) */
const LEARNED_POINTS = [
  "Condensation is water vapour in the air turning back into liquid water on a cold surface.",
  "The droplets outside a cold, covered tumbler add real mass — the balance reading genuinely rises.",
  "Glass is non-porous: the sealed water inside cannot leak out, so its level never changes.",
  "Matter is conserved — the extra mass came from vapour already present in the surrounding air, not from nowhere.",
];

/* ============================================================================
   Easing helpers
   ========================================================================== */
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t: number): number => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/* ============================================================================
   Web Audio cues — soft, musical, mutable
   ========================================================================== */
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
      const o = ac.createOscillator(); const g = ac.createGain();
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
    tap: () => tone(500, "sine", 0.08, 0, 0.11),
    step: () => { tone(420, "sine", 0.1, 0, 0.1); tone(640, "sine", 0.12, 0.05, 0.08); },
    correct: () => { tone(587, "sine", 0.18, 0); tone(880, "sine", 0.22, 0.09); },
    wrong: () => tone(180, "triangle", 0.26, 0, 0.13),
    done: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, "sine", 0.3, i * 0.11, 0.17)); },
  };
}

/* ============================================================================
   Teacher | Student segmented toggle (§6.1)
   ========================================================================== */
function ModeToggle({ mode, onChange, highlighted }: { mode: OperatorMode; onChange: (m: OperatorMode) => void; highlighted?: boolean }) {
  return (
    <div
      data-hl="modeToggle"
      className={highlighted ? "cmb-hl" : ""}
      style={{ display: "inline-flex", borderRadius: 12, padding: 4, gap: 4, background: DS.gray200, border: "1px solid rgba(0,0,0,0.06)" }}
    >
      {(["ai", "student"] as const).map((m) => {
        const sel = mode === m;
        return (
          <button
            key={m} type="button" onClick={() => onChange(m)} aria-pressed={sel}
            style={{
              padding: "7px 13px", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: FONT, fontWeight: 700, fontSize: 12.5,
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

/* ============================================================================
   Full-screen Finish overlay — non-evaluating (§6.3/§7.4): this tool asks the
   student no questions, so there is nothing to score — no stars, "What you
   have learned" only.
   ========================================================================== */
function Confetti({ n = 60 }: { n?: number }) {
  const pieces = useMemo(() => Array.from({ length: n }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 0.5, dur: 1.7 + Math.random() * 1.1,
    rot: Math.random() * 360, size: 6 + Math.random() * 6,
    color: [DS.primary, DS.accent, DS.success, DS.primaryLight, DS.accentDark, DS.water][i % 6],
  })), [n]);
  return (
    <>
      {pieces.map((p) => (
        <div key={p.id} style={{
          position: "absolute", top: "-5%", left: `${p.left}%`, width: p.size, height: p.size * 0.6,
          background: p.color, opacity: 0.9, transform: `rotate(${p.rot}deg)`,
          animation: `cmb-fall ${p.dur}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </>
  );
}

function FinishOverlay({
  show, onClose, learned,
}: {
  show: boolean; onClose: () => void; learned: string[];
}) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(26,26,46,0.55)", backdropFilter: "blur(2px)", animation: "cmb-fade-in 320ms ease both",
      boxSizing: "border-box", padding: 16,
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <Confetti n={70} />
      </div>
      <div style={{
        position: "relative", pointerEvents: "auto", maxWidth: 440, width: "100%", background: DS.white,
        borderRadius: 26, padding: "30px 28px", boxShadow: "0 30px 70px rgba(0,0,0,.4)", textAlign: "center",
        animation: "cmb-pop-in 420ms cubic-bezier(.2,1.4,.4,1) both", boxSizing: "border-box", fontFamily: FONT,
        maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{ fontSize: 44, marginBottom: 6, animation: "cmb-star-in 420ms cubic-bezier(.2,1.5,.4,1) 0.15s both" }}>☁️</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: DS.gray900, margin: "4px 0 2px" }}>Nicely observed!</div>
        <div style={{ fontSize: 14, color: DS.gray700, fontWeight: 600, marginBottom: 16 }}>
          You watched the mass climb and checked the evidence for yourself.
        </div>
        <div style={{ textAlign: "left", background: DS.primaryGhost, borderRadius: 16, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: DS.primaryDark, fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            What you have learned
          </div>
          {learned.map((pt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < learned.length - 1 ? 8 : 0 }}>
              <span style={{ color: DS.success, fontWeight: 800 }}>✓</span>
              <span style={{ color: DS.gray900, fontSize: 13.5, lineHeight: 1.5 }}>{pt}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{
          width: "100%", fontFamily: FONT, fontWeight: 700, border: "none", borderRadius: 9999,
          cursor: "pointer", padding: "13px 20px", fontSize: 15, minHeight: 48, color: DS.white,
          background: `linear-gradient(135deg, ${DS.accent}, ${DS.accentDark})`, boxShadow: "0 6px 16px rgba(255,114,18,.32)",
        }}>Close</button>
      </div>
    </div>
  );
}

/* ============================================================================
   Responsive hook
   ========================================================================== */
function useResponsive(width: number) {
  const [vw, setVw] = useState<number>(width);
  const [vh, setVh] = useState<number>(600);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const measure = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      setVw(r?.width ?? width);
      setVh(r?.height ?? 600);
    };
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && wrapRef.current) { ro = new ResizeObserver(measure); ro.observe(wrapRef.current); }
    window.addEventListener("resize", measure);
    return () => { window.removeEventListener("resize", measure); if (ro) ro.disconnect(); };
  }, [width]);
  return { wrapRef, vw, vh, isMobile: vw <= 640, isLandscape: vw > vh };
}

/* ============================================================================
   MAIN COMPONENT
   ========================================================================== */
function CondensationMassBalanceTool({ props = {}, setStepDetails }: ToolProps) {
  const ap = props.additionalProps ?? {};
  const sim = useMemo(() => ({
    startReading: ap.startReading ?? 248.0,
    rate: ap.ratePerInterval ?? 0.8,
    intervalMinutes: ap.intervalMinutes ?? 5,
    totalIntervals: ap.totalIntervals ?? 6,
    liquidLabel: ap.liquidLabel ?? "iced water",
    unit: ap.unit ?? "g",
    animationSpeed: ap.animationSpeed ?? 1,
    seed: ap.seed ?? 42,
  }), [ap]);
  const showModeToggle = props.showModeToggle ?? true;

  const { wrapRef, vw, isMobile } = useResponsive(props.width ?? 860);
  const deviceCtx = props.device ?? "mobile";
  const isSmartboard = deviceCtx === "smartboard";

  /* ---- operator mode (§6.1/§6.2): Teacher = lean demo, Student = full practice ---- */
  const [operatorMode, setOperatorModeState] = useState<OperatorMode>(props.operatorMode ?? "student");
  const [muted, setMuted] = useState<boolean>(props.muted ?? false);
  const depth: Depth = operatorMode === "ai" ? "lean" : "full";
  const isAI = operatorMode === "ai";
  const audio = useAudio(muted);
  useEffect(() => { if (props.operatorMode) setOperatorModeState(props.operatorMode); }, [props.operatorMode]);
  useEffect(() => { if (props.muted !== undefined) setMuted(props.muted); }, [props.muted]);

  /* Teacher mode runs the SAME full timer as Student mode — every interval is
     available in both, so the demo and the record table are never truncated. */
  const totalIntervals = sim.totalIntervals;

  /* ---- phase / observe-explain state (no questions anywhere in this tool) ---- */
  const [subPhase, setSubPhase] = useState<SubPhase>("observe");
  const [intervalIdx, setIntervalIdx] = useState(0);
  const [showLevelMark, setShowLevelMark] = useState(false);

  const [hl, setHl] = useState<string | null>(null);
  const hlTimer = useRef<number | null>(null);
  const isHL = (name: string) => hl === name;

  /* ---- finish flow (§6.3) ---- */
  const [finished, setFinished] = useState(false);

  /* ---- interaction tracking for the uniform, non-evaluating `finished` event ---- */
  const startTimeRef = useRef<number>(Date.now());

  /* ---- balance-reading + droplet animation ---- */
  const [displayReading, setDisplayReading] = useState(sim.startReading);
  const [dropletProgress, setDropletProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gainBadge, setGainBadge] = useState(0);
  const [freshRow, setFreshRow] = useState(-1);
  const animRef = useRef<number | null>(null);
  const startTimeAnimRef = useRef(0);
  const fromReadingRef = useRef(sim.startReading);
  const toReadingRef = useRef(sim.startReading);

  const minutesElapsed = intervalIdx * sim.intervalMinutes;
  const totalMinutes = totalIntervals * sim.intervalMinutes;

  /* live mirror so agent commands always read the latest state (never a stale closure) */
  const live = useRef<any>({});
  live.current = { subPhase, intervalIdx, showLevelMark, totalIntervals, isAnimating, finished };

  /* ---- fonts + keyframes ---- */
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-cmb", "true");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      @keyframes cmbFadeUp { from { opacity:0; transform:translateY(18px);} to {opacity:1; transform:translateY(0);} }
      @keyframes cmbBob { 0%,100%{transform:translateY(0) rotate(-2deg);} 50%{transform:translateY(2.5px) rotate(2deg);} }
      @keyframes cmbBob2 { 0%,100%{transform:translateY(1.5px) rotate(3deg);} 50%{transform:translateY(-1.5px) rotate(-3deg);} }
      @keyframes cmbDrip { 0%{transform:translateY(0);opacity:0.9;} 70%{opacity:0.9;} 100%{transform:translateY(10px);opacity:0;} }
      @keyframes cmbVapor { 0%{transform:translate(0,0) scale(1);opacity:0;} 25%{opacity:0.32;} 100%{transform:translate(var(--vx),var(--vy)) scale(0.4);opacity:0;} }
      @keyframes cmbRise { 0%{opacity:0; transform:translateY(8px) scale(0.9);} 18%{opacity:1; transform:translateY(0) scale(1);} 78%{opacity:1;} 100%{opacity:0; transform:translateY(-14px) scale(1);} }
      @keyframes cmbRowFill { 0%{background:#FFF3E4;} 100%{background:transparent;} }
      @keyframes cmb-fade-in { from{opacity:0;} to{opacity:1;} }
      @keyframes cmb-pop-in { from{opacity:0; transform:scale(.85) translateY(10px);} to{opacity:1; transform:scale(1) translateY(0);} }
      @keyframes cmb-star-in { from{opacity:0; transform:scale(0) rotate(-30deg);} to{opacity:1; transform:scale(1) rotate(0);} }
      @keyframes cmb-fall { to { transform: translateY(640px) rotate(540deg); opacity: 0; } }
      @keyframes cmb-ring { 0%,100%{ box-shadow: 0 0 0 3px ${DS.accent}, 0 0 0 3px rgba(255,114,18,0); } 50%{ box-shadow: 0 0 0 3px ${DS.accent}, 0 0 0 10px rgba(255,114,18,0); } }
      @keyframes cmb-caption-pulse { 0%,100% { opacity: .78; } 50% { opacity: 1; } }
      .cmb-hl { animation: cmb-ring 1.05s ease-in-out infinite; border-radius: inherit; }
      @media (orientation: landscape) {
        .cmb-grid { display: grid; grid-template-columns: minmax(280px, 1.05fr) minmax(260px, 1fr); gap: 16px; align-items: start; }
      }
      @media (prefers-reduced-motion: reduce) {
        .cmb-hl, *[style*="animation"] { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.querySelectorAll("style[data-cmb]").forEach((s) => s.remove()); };
  }, []);

  useEffect(() => {
    setStepDetails?.({ currentStep: intervalIdx + 1, totalSteps: totalIntervals + 2, isPaused: !isAnimating, currentMode: operatorMode });
  }, [intervalIdx, isAnimating, totalIntervals, operatorMode]); // eslint-disable-line

  /* Teacher (ai) mode is a focused demo of the SAME full run — reset to the
     start whenever the mode flips into ai (§6.1/§6.2). */
  useEffect(() => {
    if (operatorMode === "ai") {
      cancelAnim();
      setSubPhase("observe");
      setIntervalIdx(0);
      setShowLevelMark(false);
      setDisplayReading(sim.startReading);
      setDropletProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorMode]);

  /* ---- count-up animation for the balance reading ---- */
  function cancelAnim() { if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; } }

  const runIntervalAnimation = useCallback((toInterval: number) => {
    cancelAnim();
    const dur = 1400 / sim.animationSpeed;
    fromReadingRef.current = sim.startReading + (toInterval - 1) * sim.rate;
    toReadingRef.current = sim.startReading + toInterval * sim.rate;
    startTimeAnimRef.current = performance.now();
    setIsAnimating(true);
    const tick = (now: number) => {
      const t = Math.min((now - startTimeAnimRef.current) / dur, 1);
      const e = easeInOutQuad(t);
      setDisplayReading(fromReadingRef.current + (toReadingRef.current - fromReadingRef.current) * e);
      setDropletProgress(easeOutCubic(t));
      if (t < 1) { animRef.current = requestAnimationFrame(tick); }
      else {
        animRef.current = null;
        setIsAnimating(false);
        setDisplayReading(toReadingRef.current);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.animationSpeed, sim.startReading, sim.rate]);

  useEffect(() => () => cancelAnim(), []);

  /* ---- timer step ---- */
  function doStep() {
    if (live.current.isAnimating) return { ok: false, reason: "busy" };
    if (live.current.intervalIdx >= live.current.totalIntervals) return { ok: false, reason: "run complete" };
    const next = live.current.intervalIdx + 1;
    setIntervalIdx(next);
    setDropletProgress(0);
    setGainBadge((g) => g + 1);
    setFreshRow(next);
    audio.step();
    runIntervalAnimation(next);
    emitEvent("step_taken", { intervalIdx: next, minutesElapsed: next * sim.intervalMinutes, reading: sim.startReading + next * sim.rate });
    return { ok: true, intervalIdx: next };
  }

  /* ---- toggle inside-level mark — the decisive evidence, no question attached ---- */
  function doToggleLevel() {
    const willShow = !live.current.showLevelMark;
    setShowLevelMark(willShow);
    emitEvent("level_toggled", { shown: willShow });
    return { ok: true, shown: willShow };
  }

  /* ---- explain ---- */
  function doExplain() {
    const eligible = live.current.intervalIdx >= live.current.totalIntervals && live.current.showLevelMark;
    if (!eligible) return { ok: false, reason: "finish the run and mark the inside level first" };
    setSubPhase("explain");
    emitEvent("completed", {});
    return { ok: true };
  }

  /* ---- highlight (agent pointer, non-destructive) ---- */
  function doHighlight(target: string) {
    if (typeof target !== "string") return { ok: false };
    setHl(target);
    if (hlTimer.current) window.clearTimeout(hlTimer.current);
    hlTimer.current = window.setTimeout(() => setHl(null), 2400);
    return { ok: true };
  }

  /* ---- Teacher|Student mode switch (§6.1/§6.2) ---- */
  function applyOperatorMode(m: OperatorMode) {
    const v = m === "ai" ? "ai" : "student";
    setOperatorModeState(v);
    emitEvent("operator_mode_changed", { operatorMode: v, depth: v === "ai" ? "lean" : "full" });
    return { ok: true };
  }

  /* ---- agent-only reset — the student's forward path ends at Finish (§6.3);
     this is never exposed as a student "Play again" whole-tool loop. ---- */
  function resetAll() {
    cancelAnim();
    setSubPhase("observe");
    setIntervalIdx(0);
    setShowLevelMark(false);
    setDisplayReading(sim.startReading);
    setDropletProgress(0);
    setIsAnimating(false);
    setGainBadge(0);
    setFreshRow(-1);
    setFinished(false);
    startTimeRef.current = Date.now();
    emitEvent("reset", {});
    return { ok: true };
  }

  /* ---- Finish (student mode only) — the uniform, non-evaluating end-of-tool
     event (§6.3): this tool asks no questions, so there is nothing to score. ---- */
  function handleFinish() {
    if (live.current.finished) return { ok: true, already: true };
    const durationMs = Date.now() - startTimeRef.current;
    setFinished(true);
    audio.done();
    emit({
      type: "event", name: "finished",
      detail: {
        evaluated: false,
        interactions: {
          stepsTaken: live.current.intervalIdx,
          levelChecked: live.current.showLevelMark,
          reachedExplain: live.current.subPhase === "explain",
          durationMs,
        },
        learned: LEARNED_POINTS.slice(0, 4),
      },
    });
    return { ok: true };
  }

  const emitEvent = (name: string, detail: any) => emit({ type: "event", name, detail });

  const snapshot = () => ({
    subPhase: live.current.subPhase,
    intervalIdx: live.current.intervalIdx,
    showLevelMark: live.current.showLevelMark,
    totalIntervals: live.current.totalIntervals,
    operatorMode, depth, muted, finished: live.current.finished,
  });

  /* ---- The agent API: every windowMethod in the JSON lives here ---- */
  const api = {
    setParam: (n: string, v: any) => {
      if (n === "operatorMode") return applyOperatorMode(v);
      if (n === "muted") { setMuted(!!v); return { ok: true }; }
      return { ok: true };
    },
    play: () => doStep(),
    pause: () => { cancelAnim(); setIsAnimating(false); return { ok: true }; },
    reset: () => resetAll(),
    highlight: doHighlight,
    getState: () => { const st = snapshot(); emit({ type: "state", state: st }); return st; },
    setOperatorMode: (mode: OperatorMode) => applyOperatorMode(mode),
    step: doStep,
    toggleLevel: doToggleLevel,
    explain: doExplain,
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
      } catch (err) { emit({ type: "response", id: d.id, result: { ok: false, error: String(err) } }); }
    };
    window.addEventListener("message", onMsg);
    emit({ type: "ready", toolId: TOOL_ID });   // ⭐ commands before this are queued by the host
    return () => window.removeEventListener("message", onMsg);
  }, []);

  /* ═══════════════════════════════ RENDER HELPERS ═══════════════════════════ */

  const stageW = Math.min(vw - (isMobile ? 24 : 48), isSmartboard ? 760 : 560);
  const stageH = isMobile ? 220 : isSmartboard ? 340 : 280;

  const btnBase: React.CSSProperties = {
    fontFamily: FONT, fontWeight: 700, border: "none", borderRadius: 9999, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: isSmartboard ? "16px 26px" : "12px 22px", fontSize: isSmartboard ? 18 : isMobile ? 13.5 : 14.5,
    minHeight: isSmartboard ? 62 : 46, transition: "transform 120ms ease, filter 120ms ease",
  };
  const accentBtn: React.CSSProperties = { ...btnBase, background: `linear-gradient(135deg, ${DS.accent}, ${DS.accentDark})`, color: DS.white, boxShadow: `0 6px 16px ${DS.accent}55` };
  const primaryBtn: React.CSSProperties = { ...btnBase, background: `linear-gradient(135deg, ${DS.primaryDark}, ${DS.primary})`, color: DS.white };
  const outlineBtn: React.CSSProperties = { ...btnBase, background: DS.white, color: DS.primary, border: `2px solid ${DS.primary}` };
  const ghostBtn: React.CSSProperties = { ...btnBase, background: "transparent", color: DS.gray700, border: `2px solid ${DS.gray200}` };
  const disabledStyle: React.CSSProperties = { opacity: 0.42, cursor: "not-allowed" };

  const pill = (label: string, onClick: () => void, variant: "accent" | "primary" | "outline" | "ghost", icon?: React.ReactNode, disabled?: boolean, hlName?: string) => {
    const base = variant === "accent" ? accentBtn : variant === "primary" ? primaryBtn : variant === "outline" ? outlineBtn : ghostBtn;
    return (
      <button
        onClick={onClick} disabled={disabled} data-hl={hlName}
        className={hlName && isHL(hlName) ? "cmb-hl" : ""}
        style={{ ...base, ...(disabled ? disabledStyle : {}) }}
        onMouseEnter={(e: any) => { if (!disabled) e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e: any) => { e.currentTarget.style.transform = "translateY(0)"; }}
      >
        {icon}{label}
      </button>
    );
  };

  /* --- SVG scene: digital balance + covered tumbler with melting ice + condensation --- */
  const renderStage = () => {
    const cx = stageW / 2;
    const baseW = Math.min(stageW * 0.64, 320);
    const baseH = isMobile ? 46 : 58;
    const baseX = cx - baseW / 2;
    const baseY = stageH - baseH - 6;
    const trayY = baseY - 8;
    const tumH = stageH * (isMobile ? 0.52 : 0.56);
    const topHalf = (baseW * 0.40) / 2;
    const botHalf = topHalf * 0.84;
    const glassTopY = trayY - tumH;
    const glassBotY = trayY;
    const wall = 3;
    const rb = 10;
    const coverH = 12;
    const waterTop = glassTopY + tumH * 0.32;

    const animFrac = isAnimating
      ? Math.min(1, Math.max(0, (intervalIdx - 1 + dropletProgress) / totalIntervals))
      : Math.min(1, Math.max(0, intervalIdx / totalIntervals));

    const outer =
      `M ${cx - topHalf} ${glassTopY}` +
      ` L ${cx - botHalf} ${glassBotY - rb}` +
      ` Q ${cx - botHalf} ${glassBotY} ${cx - botHalf + rb} ${glassBotY}` +
      ` L ${cx + botHalf - rb} ${glassBotY}` +
      ` Q ${cx + botHalf} ${glassBotY} ${cx + botHalf} ${glassBotY - rb}` +
      ` L ${cx + topHalf} ${glassTopY} Z`;

    const halfAt = (y: number) => {
      const t = (y - glassTopY) / tumH;
      return topHalf + (botHalf - topHalf) * Math.max(0, Math.min(1, t));
    };

    const dropCount = Math.round(animFrac * 30);
    type Drop = { x: number; y: number; r: number; runner: boolean };
    const droplets: Drop[] = [];
    { let seed = 13 + (sim.seed % 1000); const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      for (let i = 0; i < 36; i++) {
        const ty = glassTopY + coverH + 10 + rnd() * (tumH - coverH - 22);
        const hw = halfAt(ty) - wall - 4;
        const tx = cx + (rnd() * 2 - 1) * hw;
        const dep = (ty - glassTopY) / tumH;
        const r = (1.3 + rnd() * 2.1) * (0.55 + 0.7 * animFrac) * (0.8 + dep * 0.6);
        const runner = dep > 0.55 && animFrac > 0.55 && rnd() > 0.45;
        droplets.push({ x: tx, y: ty, r, runner });
      }
    }
    const shownDrops = droplets.slice(0, dropCount);

    const meltShrink = 1 - 0.55 * animFrac;
    const iceRound = 2 + 7 * animFrac;
    const iceDefs = [
      { dx: -topHalf * 0.42, dy: 4, base: isMobile ? 15 : 18, anim: "cmbBob" },
      { dx: topHalf * 0.30, dy: 12, base: isMobile ? 16 : 20, anim: "cmbBob2" },
      { dx: -topHalf * 0.02, dy: 22, base: isMobile ? 13 : 16, anim: "cmbBob" },
    ];

    const lblW = isMobile ? 92 : 104;
    const lblH = 22;
    const lblX = Math.max(4, cx - topHalf - 10 - lblW);
    const lblY = Math.min(Math.max(waterTop, glassTopY + lblH), glassBotY - lblH);

    const vapors = [
      { x: cx + topHalf + 12, y: glassTopY + 24, vx: -14, vy: 9, d: 0 },
      { x: cx + topHalf + 18, y: glassTopY + 60, vx: -18, vy: -5, d: 0.8 },
      { x: cx - topHalf - 14, y: glassTopY + 130, vx: 12, vy: -9, d: 0.4 },
    ];
    const showVapor = intervalIdx > 0 && intervalIdx < totalIntervals + 1;

    return (
      <svg width={stageW} height={stageH} viewBox={`0 0 ${stageW} ${stageH}`} style={{ display: "block", maxWidth: "100%" }}>
        <defs>
          <linearGradient id="cmbGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.72" /><stop offset="0.45" stopColor="#dceefb" stopOpacity="0.22" /><stop offset="1" stopColor="#9cc4e0" stopOpacity="0.42" />
          </linearGradient>
          <linearGradient id="cmbWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7cc6f5" /><stop offset="0.5" stopColor={DS.water} /><stop offset="1" stopColor={DS.waterDeep} />
          </linearGradient>
          <linearGradient id="cmbBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#43435a" /><stop offset="1" stopColor={DS.gray900} /></linearGradient>
          <radialGradient id="cmbHi" cx="0.3" cy="0.2" r="0.85"><stop offset="0" stopColor="#ffffff" stopOpacity="0.85" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
          <radialGradient id="cmbCold" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#bfe3ff" stopOpacity="0.55" /><stop offset="1" stopColor="#bfe3ff" stopOpacity="0" /></radialGradient>
          <linearGradient id="cmbIce" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.95" /><stop offset="1" stopColor="#cfeaff" stopOpacity="0.85" /></linearGradient>
        </defs>

        <ellipse cx={cx} cy={glassTopY + tumH / 2} rx={topHalf * 2.2} ry={tumH * 0.62} fill="url(#cmbCold)" opacity={0.25 + 0.5 * animFrac} />

        {showVapor && vapors.map((v, i) => (
          <circle key={`v${i}`} cx={v.x} cy={v.y} r={3.2} fill="#9fd4ff"
            style={{ ["--vx" as any]: `${v.vx}px`, ["--vy" as any]: `${v.vy}px`, animation: `cmbVapor 2.6s ease-in ${v.d}s infinite` } as React.CSSProperties} />
        ))}

        <ellipse cx={cx} cy={baseY + baseH + 3} rx={baseW * 0.54} ry={8} fill={DS.gray900} opacity={0.08} />

        <g data-hl-region="tumbler" className={isHL("tumbler") ? "cmb-hl" : ""}>
          <path d={outer} fill="url(#cmbGlass)" stroke={DS.gray700} strokeWidth={2} />
          <clipPath id="cmbInner"><path d={outer} /></clipPath>
          <g clipPath="url(#cmbInner)">
            <rect x={cx - topHalf - 4} y={waterTop} width={topHalf * 2 + 8} height={glassBotY - waterTop} fill="url(#cmbWater)" opacity={0.94} />
            <rect x={cx - topHalf - 4} y={waterTop} width={topHalf * 2 + 8} height={2.5} fill="#ffffff" opacity={0.4} />
            {iceDefs.map((ice, i) => {
              const s = ice.base * meltShrink;
              return (
                <g key={`ice${i}`} style={{ transformOrigin: `${cx + ice.dx}px ${waterTop + ice.dy}px`, animation: `${ice.anim} ${3 + i * 0.6}s ease-in-out infinite` }}>
                  <rect x={cx + ice.dx - s / 2} y={waterTop + ice.dy - s / 2} width={s} height={s} rx={iceRound} fill="url(#cmbIce)" stroke="#bfe3ff" strokeWidth={1} opacity={0.92} />
                  <rect x={cx + ice.dx - s / 2 + 2} y={waterTop + ice.dy - s / 2 + 2} width={s * 0.32} height={s * 0.32} rx={2} fill="#ffffff" opacity={0.7} />
                </g>
              );
            })}
          </g>
          <path d={`M ${cx - topHalf + 5} ${glassTopY + coverH} L ${cx - botHalf + 6} ${glassBotY - 8} L ${cx - botHalf + 6 + topHalf * 0.22} ${glassBotY - 8} L ${cx - topHalf + 5 + topHalf * 0.26} ${glassTopY + coverH} Z`}
            fill="url(#cmbHi)" opacity={0.5} clipPath="url(#cmbInner)" />
          {shownDrops.map((d, i) => (
            <g key={`d${i}`}>
              {d.runner && (
                <rect x={d.x - d.r * 0.45} y={d.y} width={d.r * 0.9} height={d.r * 3.2} rx={d.r * 0.45} fill={DS.water} opacity={0.5}
                  style={{ transformOrigin: `${d.x}px ${d.y}px`, animation: `cmbDrip ${2.4 + (i % 5) * 0.3}s ease-in ${(i % 4) * 0.4}s infinite` }} />
              )}
              <circle cx={d.x} cy={d.y} r={d.r} fill={DS.water} opacity={0.74} />
              <circle cx={d.x - d.r * 0.32} cy={d.y - d.r * 0.32} r={d.r * 0.38} fill="#ffffff" opacity={0.9} />
            </g>
          ))}
          {animFrac > 0.7 && (
            <ellipse cx={cx} cy={trayY + 2} rx={topHalf * (0.9 + 0.5 * (animFrac - 0.7) / 0.3)} ry={4.2} fill={DS.water} opacity={0.4} />
          )}
          <rect x={cx - topHalf - 5} y={glassTopY - 2} width={topHalf * 2 + 10} height={coverH} rx={6} fill="#ffffff" stroke={DS.gray700} strokeWidth={2} opacity={0.9} />
          <rect x={cx - 8} y={glassTopY - 8} width={16} height={8} rx={4} fill={DS.gray400} stroke={DS.gray700} strokeWidth={1.4} />
          {showLevelMark && (
            <g style={{ animation: "cmbFadeUp 0.4s ease-out" }}>
              <line x1={cx - topHalf - 6} y1={waterTop} x2={cx + topHalf + 6} y2={waterTop} stroke={DS.accentDark} strokeWidth={2.4} strokeDasharray="6 4" />
              <line x1={lblX + lblW} y1={lblY} x2={cx - topHalf - 6} y2={waterTop} stroke={DS.accentDark} strokeWidth={1.4} opacity={0.7} />
              <rect x={lblX} y={lblY - lblH / 2} width={lblW} height={lblH} rx={8} fill={DS.white} stroke={DS.accentDark} strokeWidth={1.4} />
              <text x={lblX + lblW / 2} y={lblY + 4} textAnchor="middle" fontFamily={FONT} fontSize={isMobile ? 10.5 : 11.5} fontWeight={600} fill={DS.gray900}>level unchanged</text>
            </g>
          )}
        </g>

        <rect x={cx - baseW * 0.30} y={trayY} width={baseW * 0.60} height={7} rx={4} fill="#5a5a72" />
        <rect x={baseX} y={baseY} width={baseW} height={baseH} rx={12} fill="url(#cmbBase)" />
        <g data-hl-region="balanceDisplay" className={isHL("balanceDisplay") ? "cmb-hl" : ""}>
          <rect x={cx - (isMobile ? 78 : 92)} y={baseY + baseH * 0.24} width={isMobile ? 156 : 184} height={isMobile ? 26 : 30} rx={7} fill="#0d2818" stroke="#0a4d2c" strokeWidth={2} />
          <text x={cx + (isMobile ? 26 : 32)} y={baseY + baseH * 0.24 + (isMobile ? 18 : 21)} textAnchor="end" fontFamily={FONT} fontSize={isMobile ? 16 : 19} fontWeight={700} fill="#39FF8B" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "1px" }}>
            {displayReading.toFixed(1)}
          </text>
          <text x={cx + (isMobile ? 36 : 44)} y={baseY + baseH * 0.24 + (isMobile ? 18 : 21)} textAnchor="start" fontFamily={FONT} fontSize={isMobile ? 11 : 12.5} fontWeight={600} fill="#39FF8B" opacity={0.85}>{sim.unit}</text>
        </g>
        <g transform="translate(6, 6)">
          <rect x={0} y={0} width={isMobile ? 82 : 96} height={20} rx={10} fill={DS.primaryGhost} stroke={DS.primaryLight} strokeWidth={1.4} />
          <text x={(isMobile ? 82 : 96) / 2} y={13.5} textAnchor="middle" fontFamily={FONT} fontSize={isMobile ? 10 : 11.5} fontWeight={600} fill={DS.primaryDark}>⏱ {minutesElapsed} min</text>
        </g>
      </svg>
    );
  };

  const runDone = intervalIdx >= totalIntervals;
  const explainEligible = runDone && showLevelMark;

  /* Teacher (ai) mode collapses to a focused demo — the agent drives via the
     step()/toggleLevel()/explain() verbs, so the student control panel is
     hidden here (§6.1); Student mode shows the full control panel. */
  const renderControls = () => {
    if (isAI) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 6 }}>
        {subPhase === "observe" && !runDone && pill(`Step +${sim.intervalMinutes} min`, doStep, "accent", <Play size={16} color={DS.white} />, isAnimating, "stepButton")}
        {subPhase === "observe" && runDone && pill(showLevelMark ? "Hide inside level" : "Mark inside level", doToggleLevel, showLevelMark ? "outline" : "primary", <Eye size={16} />, false, "levelToggle")}
        {subPhase === "observe" && runDone && pill("Explain it", doExplain, "accent", <Lightbulb size={16} />, !explainEligible, "explainButton")}
      </div>
    );
  };

  const currentCaption = () => {
    if (subPhase === "explain") return "The mass gain came from water vapour in the surrounding air condensing on the cold glass — not from inside the sealed tumbler.";
    if (intervalIdx === 0) return "A covered glass of iced water sits on a digital balance. Tap 'Step +5 min' to advance the timer and watch what happens.";
    if (runDone) return "The run is complete. Mark the inside level to see whether the sealed water moved.";
    const a = (intervalIdx - 1) * sim.intervalMinutes, b = intervalIdx * sim.intervalMinutes;
    return `Minute ${a} → ${b}: droplets keep gathering on the cold glass and the balance reading rises — even though the cover was never opened.`;
  };
  const captionLabel = () => subPhase === "explain" ? "Explain" : intervalIdx === 0 ? "Ready" : `Minute ${(intervalIdx - 1) * sim.intervalMinutes} → ${intervalIdx * sim.intervalMinutes}`;

  const renderExplain = () => (
    <div style={{ animation: "cmbFadeUp 0.5s ease-out", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: isMobile ? 12 : 16, background: DS.accentLight, borderRadius: 14, borderLeft: `4px solid ${DS.accent}` }}>
        <Droplets size={20} color={DS.accentDark} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, color: DS.gray900, fontSize: isMobile ? 13.5 : 15, marginBottom: 4 }}>The mass came from the air</div>
          <div style={{ color: DS.gray700, fontSize: isMobile ? 12.5 : 13.5, lineHeight: 1.55 }}>
            The cold outer wall chilled the air touching it below its dew point. Water vapour already present in that air condensed into droplets on the glass — extra matter sitting on the setup — while the sealed water inside stayed exactly where it was.
          </div>
        </div>
      </div>
      <div style={{ padding: 12, background: DS.primaryGhost, borderRadius: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: DS.primaryDark, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Mass gained in {totalMinutes} min</div>
        <div style={{ fontSize: isMobile ? 13.5 : 14.5, fontWeight: 700, color: DS.gray900, fontVariantNumeric: "tabular-nums" }}>+{(totalIntervals * sim.rate).toFixed(1)} {sim.unit}</div>
      </div>
    </div>
  );

  const renderRecordTable = () => {
    const rows = Array.from({ length: totalIntervals + 1 }, (_, i) => i);
    const filledTo = intervalIdx;
    const cellBase: React.CSSProperties = { padding: isMobile ? "7px 8px" : "9px 12px", fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: DS.gray900, textAlign: "center", borderBottom: `1px solid ${DS.gray200}` };
    const headCell: React.CSSProperties = { ...cellBase, fontWeight: 700, color: DS.primaryDark, background: DS.primaryLight, borderBottom: "none" };
    return (
      <div data-hl="recordTable" className={isHL("recordTable") ? "cmb-hl" : ""} style={{ marginTop: 10, animation: "cmbFadeUp 0.45s ease-out", borderRadius: 12 }}>
        <div style={{ textAlign: "center", fontWeight: 700, color: DS.gray900, fontSize: isMobile ? 12.5 : 13.5, marginBottom: 4 }}>Mass of water collected over time</div>
        <div style={{ maxWidth: 400, margin: "0 auto", borderRadius: 12, overflow: "hidden", border: `1px solid ${DS.gray200}`, background: DS.white, boxShadow: "0 4px 14px rgba(26,26,46,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr" }}>
            <div style={{ ...headCell, borderRight: `1px solid ${DS.white}` }}>Time</div>
            <div style={headCell}>Mass ({sim.unit})</div>
          </div>
          {rows.map((i) => {
            const recorded = i <= filledTo;
            const isLive = i === intervalIdx && i === filledTo && isAnimating;
            const value = isLive ? displayReading : sim.startReading + i * sim.rate;
            const justFilled = freshRow === i;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", background: i % 2 === 0 ? DS.gray100 : DS.white, animation: justFilled ? "cmbRowFill 1s ease-out" : undefined }}>
                <div style={{ ...cellBase, borderRight: `1px solid ${DS.gray200}`, fontWeight: 500 }}>{i * sim.intervalMinutes} min</div>
                <div style={{ ...cellBase, fontWeight: recorded ? 700 : 400, color: recorded ? DS.gray900 : DS.gray400, fontVariantNumeric: "tabular-nums" }}>
                  {recorded ? value.toFixed(1) : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════ LAYOUT ═══════════════════════════════ */
  return (
    <div ref={wrapRef} style={{
      width: "100%", height: "100%", minHeight: "100%", maxHeight: "100dvh", boxSizing: "border-box",
      fontFamily: FONT, background: DS.gray100, overflow: isAI ? "hidden" : "auto", color: DS.gray900,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ maxWidth: isSmartboard ? 1500 : 1080, width: "100%", margin: "0 auto", padding: isMobile ? "10px 12px 14px" : isSmartboard ? "22px 32px 28px" : "16px 20px 20px", boxSizing: "border-box", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* header: title + Teacher|Student toggle + mute */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 16.5, color: DS.primaryDark, display: "flex", alignItems: "center", gap: 8 }}>
            <Droplets size={isMobile ? 17 : 20} color={DS.accent} /> The Balance That Climbs
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {showModeToggle && <ModeToggle mode={operatorMode} onChange={applyOperatorMode} highlighted={isHL("modeToggle")} />}
            <button data-hl="muteButton" className={isHL("muteButton") ? "cmb-hl" : ""} onClick={() => setMuted((m: boolean) => !m)}
              aria-label={muted ? "Unmute sound" : "Mute sound"}
              style={{ width: isSmartboard ? 62 : 34, height: isSmartboard ? 62 : 34, borderRadius: 9999, border: `2px solid ${DS.primaryLight}`, background: DS.white, color: DS.primary, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* Teacher (ai) — focused demo caption */}
        {isAI && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: DS.primaryGhost, color: DS.primaryDark, borderRadius: 12, padding: "8px 12px", fontWeight: 700, fontSize: 12, marginBottom: 10, animation: "cmb-caption-pulse 2.2s ease-in-out infinite" }}>
            👩‍🏫 Your teacher is showing you this — watch, you'll get a turn
          </div>
        )}

        {/* two-pane in landscape (§8.1): stage on one side, controls+table on the other */}
        <div className="cmb-grid" style={{ flex: 1, minHeight: 0 }}>
          <div style={{ position: "relative", background: DS.white, borderRadius: 16, padding: isMobile ? 6 : 10, display: "flex", justifyContent: "center", overflow: "hidden", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.04)" }}>
            {renderStage()}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: isMobile ? 10 : 0 }}>
            {renderControls()}

            {subPhase === "explain" ? renderExplain() : (
              <div style={{ position: "relative", background: DS.white, borderRadius: 12, padding: isMobile ? 10 : 14, borderLeft: `4px solid ${DS.primary}`, minHeight: isMobile ? 56 : 50, animation: "cmbFadeUp 0.4s ease-out", boxSizing: "border-box" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: DS.primary, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>{captionLabel()}</div>
                <div style={{ color: DS.gray900, fontSize: isMobile ? 12.5 : 13.5, lineHeight: 1.5 }}>{currentCaption()}</div>
                {gainBadge > 0 && (
                  <div key={gainBadge} style={{ position: "absolute", top: isMobile ? 8 : 10, right: isMobile ? 10 : 14, display: "inline-flex", alignItems: "center", gap: 4, background: "#E7F8EF", color: DS.success, fontWeight: 700, fontSize: isMobile ? 11.5 : 12.5, padding: "3px 9px", borderRadius: 9999, animation: "cmbRise 1.6s ease-out forwards" }}>
                    <TrendingUp size={12} /> +{sim.rate.toFixed(1)} {sim.unit}
                  </div>
                )}
              </div>
            )}

            {renderRecordTable()}

            {/* Finish — student mode ONLY, the last control (§6.3); no "Play Again" loop */}
            {!isAI && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto", paddingTop: 6 }}>
                {pill("Finish", () => handleFinish(), "accent", <Flag size={16} />, !explainEligible || subPhase !== "explain", "finishButton")}
              </div>
            )}
          </div>
        </div>
      </div>

      <FinishOverlay
        show={finished}
        onClose={() => setFinished(false)}
        learned={LEARNED_POINTS.slice(0, 4)}
      />
    </div>
  );
}

export default CondensationMassBalanceTool;

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT CODE END
   ═══════════════════════════════════════════════════════════════════════════ */
