/* ============================================================================
   Water's Disappearing Act on a Steel Plate  —  Class 6 Science
   "A journey through states of water" — evaporation investigation.

   Predict -> pour -> observe the puddle shrink -> flip the plate to rule out
   seepage -> conclude it turned into water vapour. A second "explore" mode
   gathers everyday evaporation examples (drying clothes, a drying puddle, a
   hot pan, hand sanitiser).

   Agent-control contract: window.postMessage({type:'command',id,method,args})
   in, {type:'ready'|'state'|'event'|'response'} out. See the companion JSON
   (Watching_water_leave_a_steel_plate.json) for the full windowMethods/events
   contract — every method below matches it name-for-name.

   NOTE: this file intentionally has NO `import` statements. The runner that
   hosts this component strips import statements and re-provides React as a
   global, so hooks are pulled off the global `React` instead of imported
   (a stripped named import would leave useState/useEffect undefined). Icons
   are drawn as small inline SVG components rather than pulled from an icon
   package, since third-party packages are not shimmed by this runner.
   ========================================================================== */

declare const React: any;
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ------------------------------------------------------------------------ */
/* Agent-control constants                                                   */
/* ------------------------------------------------------------------------ */
const TOOL_ID = "steel_plate_evaporation";
const emit = (m: any) => { try { window.parent.postMessage(m, "*"); } catch {} };

/* ============================================================================
   ICONS — inline SVG, self-contained (no external icon package).
   ========================================================================== */
type IconProps = { size?: number; color?: string; style?: React.CSSProperties };
const svgBase = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
});
const Play = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style} fill={color}><polygon points="6 4 20 12 6 20 6 4" /></svg>
);
const Pause = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style} fill={color}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
);
const RefreshCw = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" /></svg>
);
const Check = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polyline points="20 6 9 17 4 12" /></svg>
);
const ChevronLeft = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polyline points="15 18 9 12 15 6" /></svg>
);
const ChevronRight = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polyline points="9 18 15 12 9 6" /></svg>
);
const Droplets = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A18.1 18.1 0 0 1 17 4c0 3-1.3 4.6-2.7 6a5.6 5.6 0 0 1-1.8 1.3" /></svg>
);
const Lightbulb = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
);
const Eye = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const FlaskConical = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><path d="M10 2v6.3a2 2 0 0 1-.4 1.2L4 18a2 2 0 0 0 1.6 3.2h12.8A2 2 0 0 0 20 18l-5.6-8.5A2 2 0 0 1 14 8.3V2" /><path d="M8.5 2h7" /><path d="M7 16h10" /></svg>
);
const Volume2 = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
);
const VolumeX = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
);
const Flag = ({ size = 20, color = "currentColor", style }: IconProps) => (
  <svg {...svgBase(size)} color={color} style={style}><path d="M4 21V4" /><path d="M4 4h13l-2.5 4L17 12H4" /></svg>
);
/* Decorative pictogram (filled, not an outline glyph like the others) so it
   matches the visual weight of the full-colour emoji on the sibling cards. */
const Pan = ({ size = 20, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <ellipse cx="10.5" cy="15" rx="8.5" ry="3.6" fill="#5B6472" />
    <ellipse cx="10.5" cy="14.1" rx="8.5" ry="3.6" fill="#828B99" />
    <rect x="17.5" y="12.5" width="6" height="2.6" rx="1.3" fill="#828B99" />
    <ellipse cx="10.5" cy="14.1" rx="6.2" ry="2.4" fill="#3A414C" />
    <circle cx="7.6" cy="12.6" r="1.3" fill="#5BC2F2" />
    <circle cx="12.2" cy="11.9" r="1" fill="#5BC2F2" />
    <path d="M7.6 9.8c.5-.6 1.1-.6 1.6 0M11.8 9.2c.5-.6 1.1-.6 1.6 0" stroke="#B9E6FC" strokeWidth="1" fill="none" strokeLinecap="round" />
  </svg>
);

/* ------------------------------------------------------------------------ */
/* Design tokens (Singularity design system)                                 */
/* ------------------------------------------------------------------------ */
const DS = {
  primary: "#4A4DC9",
  primaryDeep: "#533086",
  primaryLight: "#C1C1EA",
  primaryGhost: "#EDEDF8",
  accent: "#FF7212",
  accentSoft: "#FC9145",
  peach: "#FFF3E4",
  ink: "#1A1A2E",
  ink700: "#4E4E4E",
  grey: "#CACACA",
  greyLight: "#EBEBEB",
  surface: "#F5F5F5",
  white: "#FFFFFF",
  good: "#2E9E6B",
  goodBg: "#EAF7F1",
  goodBorder: "#BFE6D2",
  font: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  gradient: "linear-gradient(135deg, #533086 0%, #FC9145 100%)",
  gradientSoft: "linear-gradient(135deg, #C1C1EA 0%, #FFF3E4 100%)",
} as const;

/* ------------------------------------------------------------------------ */
/* Types                                                                     */
/* ------------------------------------------------------------------------ */
type Phase = "predict" | "observe" | "flip" | "conclude";
type ActivityMode = "investigate" | "explore";
type OperatorMode = "ai" | "student";
type Depth = "lean" | "full";

interface PredictionOption { id: string; label: string; emoji: string; correct: boolean; }
interface ExampleCard { id: string; emoji: React.ReactNode; title: string; note: string; }
interface ToolProps {
  props?: {
    operatorMode?: OperatorMode;
    activityMode?: ActivityMode;
    muted?: boolean;
    showModeToggle?: boolean;
    darkMode?: boolean;
    device?: "mobile" | "smartboard";
    additionalProps?: { totalMinutes?: number; runSeconds?: number; showVapour?: boolean; seed?: number };
  };
  setStepDetails?: (s: { currentStep: number; totalSteps: number; isPaused: boolean; currentMode: string }) => void;
  setStopAutoNext?: (v: boolean) => void;
}

/* ------------------------------------------------------------------------ */
/* Static content                                                            */
/* ------------------------------------------------------------------------ */
const PREDICTIONS: PredictionOption[] = [
  { id: "seep", label: "It seeps through to the underside", emoji: "⬇️", correct: false },
  { id: "vapour", label: "It turns into vapour and rises up", emoji: "☁️", correct: true },
  { id: "vanish", label: "It simply vanishes into nothing", emoji: "✨", correct: false },
  { id: "stay", label: "It stays the same forever", emoji: "⏸️", correct: false },
];

const PHASES: { key: Phase; label: string; icon: any }[] = [
  { key: "predict", label: "Predict", icon: Lightbulb },
  { key: "observe", label: "Observe", icon: Eye },
  { key: "flip", label: "Check", icon: RefreshCw },
  { key: "conclude", label: "Conclude", icon: Check },
];

const REAL_WORLD: ExampleCard[] = [
  { id: "puddle", emoji: "🌧️", title: "Drying puddles", note: "Rain puddles in the playground shrink and vanish on a sunny day — the water becomes vapour, just like the puddle on the steel plate." },
  { id: "clothes", emoji: "👕", title: "Wet clothes", note: "Clothes on a line dry because the water soaked into the fabric evaporates into the air around them." },
  { id: "dosa", emoji: <Pan size={26} color="#7B8097" />, title: "Water on a hot pan", note: "A few drops sprinkled on a hot tawa hiss and disappear in seconds — the heat speeds up the very same evaporation." },
  { id: "sanitiser", emoji: "🧴", title: "Hand sanitiser", note: "Sanitiser disappears as you rub it in — it evaporates quickly, leaving your hands feeling cool." },
];

/* the 2-4 short takeaways every finish screen must show (§6.3) */
const LEARNED_POINTS = [
  "Steel has no pores, so liquid water cannot seep through a steel plate.",
  "Water left in the open slowly turns into an invisible gas called water vapour.",
  "This change from liquid to vapour without boiling is called evaporation.",
  "Evaporation happens all around us — in drying clothes, puddles, and floors.",
];

/* ------------------------------------------------------------------------ */
/* Math / geometry helpers                                                  */
/* ------------------------------------------------------------------------ */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

const BLOB = "M -80 0 C -80 -15 -42 -23 0 -21 C 48 -23 82 -12 80 1 C 82 17 42 23 -2 21 C -46 23 -80 16 -80 0 Z";

function buildStream(lx: number, ly: number, Lx: number, Ly: number) {
  const cxq = lx + (Lx - lx) * 0.5;
  const cyq = ly + (Ly - ly) * 0.62;
  const N = 12;
  const Lp: number[][] = []; const Rp: number[][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N; const mt = 1 - t;
    const bx = mt * mt * lx + 2 * mt * t * cxq + t * t * Lx;
    const by = mt * mt * ly + 2 * mt * t * cyq + t * t * Ly;
    const dx = 2 * mt * (cxq - lx) + 2 * t * (Lx - cxq);
    const dy = 2 * mt * (cyq - ly) + 2 * t * (Ly - cyq);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len; const ny = dx / len;
    const w = (lerp(6.5, 3.0, t) + 1.6 * Math.sin(t * Math.PI)) / 2;
    Lp.push([bx + nx * w, by + ny * w]); Rp.push([bx - nx * w, by - ny * w]);
  }
  let d = `M ${Lp[0][0].toFixed(1)} ${Lp[0][1].toFixed(1)} `;
  for (let i = 1; i <= N; i++) d += `L ${Lp[i][0].toFixed(1)} ${Lp[i][1].toFixed(1)} `;
  for (let i = N; i >= 0; i--) d += `L ${Rp[i][0].toFixed(1)} ${Rp[i][1].toFixed(1)} `;
  d += "Z";
  const c = `M ${lx.toFixed(1)} ${ly.toFixed(1)} Q ${cxq.toFixed(1)} ${cyq.toFixed(1)} ${Lx} ${Ly}`;
  return { body: d, center: c };
}

/* soft drifting steam wisps (HTML overlay) */
const STEAM = [
  { id: 0, x: -28, w: 20, h: 23, dur: 8.6, delay: 0.0, drift: -22, peak: 0.78 },
  { id: 1, x: -12, w: 16, h: 19, dur: 9.8, delay: 1.6, drift: 14, peak: 0.68 },
  { id: 2, x: 2, w: 22, h: 25, dur: 7.8, delay: 3.1, drift: -12, peak: 0.82 },
  { id: 3, x: 16, w: 15, h: 18, dur: 10.6, delay: 0.8, drift: 20, peak: 0.65 },
  { id: 4, x: 28, w: 19, h: 22, dur: 9.0, delay: 4.4, drift: 10, peak: 0.74 },
  { id: 5, x: -4, w: 14, h: 17, dur: 11.2, delay: 5.7, drift: -16, peak: 0.6 },
  { id: 6, x: 10, w: 17, h: 20, dur: 8.8, delay: 2.4, drift: 16, peak: 0.7 },
  { id: 7, x: -18, w: 15, h: 18, dur: 10.2, delay: 6.5, drift: -8, peak: 0.62 },
];

/* ------------------------------------------------------------------------ */
/* Web Audio cues — synthesised, no asset deps                              */
/* ------------------------------------------------------------------------ */
function useAudio(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };
  const tone = (freq: number, type: OscillatorType, dur: number, delay = 0, vol = 0.14) => {
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
    tap: () => tone(520, "sine", 0.09, 0, 0.1),
    pour: () => { tone(440, "sine", 0.14, 0, 0.1); tone(660, "sine", 0.16, 0.08, 0.09); },
    flip: () => { tone(300, "triangle", 0.12, 0, 0.12); tone(500, "sine", 0.18, 0.1, 0.12); },
    reveal: () => { tone(587, "sine", 0.18, 0); tone(880, "sine", 0.24, 0.1); },
    done: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, "sine", 0.3, i * 0.11, 0.16)); },
  };
}

/* ------------------------------------------------------------------------ */
/* Teacher | Student toggle (§6.1)                                           */
/* ------------------------------------------------------------------------ */
function ModeToggle({ mode, onChange, highlighted, compact }: { mode: OperatorMode; onChange: (m: OperatorMode) => void; highlighted?: boolean; compact?: boolean }) {
  return (
    <div
      data-hl="modeToggle"
      style={{
        display: "inline-flex", borderRadius: 12, padding: 4, gap: 4, background: DS.greyLight,
        border: `1px solid ${highlighted ? DS.accent : "rgba(0,0,0,0.06)"}`,
        boxShadow: highlighted ? `0 0 0 3px ${DS.accent}55` : "none",
        transition: "box-shadow 200ms ease", flexShrink: 0,
      }}
    >
      {(["ai", "student"] as const).map((m) => {
        const sel = mode === m;
        return (
          <button
            key={m} type="button" onClick={() => onChange(m)} aria-pressed={sel}
            style={{
              padding: compact ? "6px 10px" : "7px 13px", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: DS.font, fontWeight: 700, fontSize: compact ? 11 : 12.5,
              background: sel ? `linear-gradient(135deg, ${DS.primaryDeep}, ${DS.primary})` : "transparent",
              color: sel ? DS.white : DS.ink700, transition: "all 180ms ease", whiteSpace: "nowrap", minHeight: 32,
            }}
          >
            {m === "ai" ? "👩‍🏫 Teacher" : "🙋 Your turn"}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Full-screen completion mist — rising translucent bubbles (evaporation-   */
/* themed particle burst, in place of confetti; §7.4 full-viewport overlay) */
/* ------------------------------------------------------------------------ */
function MistBurst({ n = 26 }: { n?: number }) {
  const items = useMemo(
    () => Array.from({ length: n }, (_, i) => ({
      id: i, left: Math.random() * 100, size: 8 + Math.random() * 22,
      dur: 2.6 + Math.random() * 2.2, delay: Math.random() * 0.9, drift: (Math.random() - 0.5) * 60,
    })),
    [n]
  );
  return (
    <>
      {items.map((p: any) => (
        <span
          key={p.id}
          style={{
            position: "absolute", left: `${p.left}%`, bottom: -20, width: p.size, height: p.size, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(173,216,240,0.35))",
            filter: "blur(0.5px)", opacity: 0,
            animation: `wda-mist-rise ${p.dur}s ease-out ${p.delay}s forwards`,
            ["--drift" as any]: `${p.drift}px`,
          }}
        />
      ))}
    </>
  );
}

/* ================= Finish screen — full-screen "what you learned" (§6.3) ===
   Non-evaluating tool: no star / no score, per §6.3 — a free predict-and-
   observe investigation has no right/wrong to grade, so awarding a star
   would be a fake evaluation the tool never actually performed. ============= */
function FinishOverlay({ show, onClose, learned }: { show: boolean; onClose: () => void; learned: string[] }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(26,26,46,0.55)", backdropFilter: "blur(2px)", animation: "wda-fade-in 320ms ease both",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <MistBurst n={30} />
      </div>
      <div
        style={{
          position: "relative", pointerEvents: "auto", maxWidth: 430, width: "88%", background: DS.white,
          borderRadius: 26, padding: "30px 28px", boxShadow: "0 30px 70px rgba(0,0,0,.4)", textAlign: "center",
          animation: "wda-pop-in 420ms cubic-bezier(.2,1.4,.4,1) both", boxSizing: "border-box", fontFamily: DS.font,
        }}
      >
        <div style={{ fontSize: 46, marginBottom: 4, animation: "wda-icon-pop 620ms cubic-bezier(.2,1.5,.4,1) both" }}>☁️</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: DS.ink, margin: "2px 0 4px" }}>Nicely observed!</div>
        <div style={{ fontSize: 13.5, color: DS.ink700, fontWeight: 600, marginBottom: 16 }}>
          You investigated where the water went — no leaks, just evaporation.
        </div>
        <div style={{ textAlign: "left", background: DS.primaryGhost, borderRadius: 16, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: DS.primaryDeep, fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            What you have learned
          </div>
          {learned.map((pt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < learned.length - 1 ? 8 : 0 }}>
              <span style={{ color: DS.good, fontWeight: 800 }}>✓</span>
              <span style={{ color: DS.ink, fontSize: 13.5, lineHeight: 1.5 }}>{pt}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{
            width: "100%", fontFamily: DS.font, fontWeight: 700, border: "none", borderRadius: 9999, cursor: "pointer",
            padding: "13px 20px", fontSize: 15, minHeight: 48, color: DS.white,
            background: `linear-gradient(135deg, ${DS.accent}, ${DS.accentSoft})`, boxShadow: "0 6px 16px rgba(255,114,18,.32)",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   SVG: THE PLATE (top face, with spoon + pour)
   ========================================================================== */
function PlateTopFace({ amount, pourProgress, showSpoon }: { amount: number; pourProgress: number; showSpoon: boolean }) {
  const a = clamp01(amount);
  const p = clamp01(pourProgress);
  const s = 0.1 + 0.4 * a;

  const enter = seg(p, 0, 0.3);
  const tilt = seg(p, 0.32, 0.6);
  const retract = seg(p, 0.82, 1);
  const rot = -44 * tilt * (1 - retract);
  const tx = lerp(140, 0, enter) + 70 * retract;
  const ty = lerp(-36, 0, enter) - 52 * retract;
  const bowlWater = clamp01(1 - seg(p, 0.34, 0.78));
  const streamOn = showSpoon && p > 0.36 && p < 0.82;

  const cx = 176 + tx;
  const cy = 70 + ty;
  const rad = (rot * Math.PI) / 180;
  const lipX = cx + (-19 * Math.cos(rad) - 7 * Math.sin(rad));
  const lipY = cy + (-19 * Math.sin(rad) + 7 * Math.cos(rad));
  const stream = buildStream(lipX, lipY, 180, 150);

  return (
    <svg viewBox="0 0 360 260" width="100%" style={{ display: "block" }} aria-hidden="true">
      <defs>
        <radialGradient id="wda-steelTop" cx="40%" cy="30%" r="85%">
          <stop offset="0%" stopColor="#FFFFFF" /><stop offset="40%" stopColor="#E4E6EF" />
          <stop offset="72%" stopColor="#C5C8D8" /><stop offset="100%" stopColor="#9EA2B8" />
        </radialGradient>
        <radialGradient id="wda-steelWell" cx="42%" cy="34%" r="80%">
          <stop offset="0%" stopColor="#F3F4FA" /><stop offset="70%" stopColor="#D2D5E2" /><stop offset="100%" stopColor="#B4B8CB" />
        </radialGradient>
        <radialGradient id="wda-waterFill" cx="38%" cy="28%" r="85%">
          <stop offset="0%" stopColor="#A9E3F7" /><stop offset="45%" stopColor="#5BBDEA" /><stop offset="100%" stopColor="#2C8FCD" />
        </radialGradient>
        <radialGradient id="wda-spoonG" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" /><stop offset="60%" stopColor="#D7DAE6" /><stop offset="100%" stopColor="#A6AABF" />
        </radialGradient>
      </defs>

      <ellipse cx="180" cy="206" rx="150" ry="24" fill={DS.primaryDeep} opacity="0.1" />
      <path d="M30 150 A150 50 0 0 0 330 150 L330 160 A150 50 0 0 1 30 160 Z" fill="#9398AE" />
      <ellipse cx="180" cy="150" rx="150" ry="50" fill="url(#wda-steelTop)" stroke="#8B8FA6" strokeWidth="1.5" />
      <ellipse cx="180" cy="151" rx="126" ry="41" fill="url(#wda-steelWell)" />
      <ellipse cx="180" cy="151" rx="104" ry="33" fill="none" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.5" />
      <ellipse cx="180" cy="151" rx="80" ry="25" fill="none" stroke="#AFB3C6" strokeWidth="1.2" opacity="0.6" />
      <ellipse cx="180" cy="151" rx="56" ry="17" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.45" />
      <path d="M64 134 A150 50 0 0 1 250 124" fill="none" stroke="#FFFFFF" strokeWidth="4" opacity="0.75" strokeLinecap="round" className="wda-shimmer" />

      {a <= 0.02 ? (
        <text x="180" y="156" textAnchor="middle" fontFamily={DS.font} fontSize="12" fontWeight="600" fill="#7B8097">plate is dry</text>
      ) : (
        <g transform={`translate(180,154) scale(${s.toFixed(3)},${s.toFixed(3)})`} opacity="0.97" style={{ transition: "opacity 300ms ease" }}>
          <path d={BLOB} fill="url(#wda-waterFill)" />
          <path d={BLOB} fill="none" stroke="#2C8FCD" strokeWidth="1.5" opacity="0.4" />
          <ellipse cx="-26" cy="-7" rx="26" ry="7" fill="#FFFFFF" opacity="0.55" />
          <ellipse cx="30" cy="5" rx="14" ry="4" fill="#FFFFFF" opacity="0.3" />
        </g>
      )}

      {streamOn ? (
        <g>
          <path d={stream.body} fill="url(#wda-waterFill)" opacity="0.96" />
          <path d={stream.body} fill="none" stroke="#2C8FCD" strokeWidth="0.8" opacity="0.35" />
          <path d={stream.center} fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" strokeDasharray="6 10" className="wda-flow" />
          <g className="wda-splash"><circle cx="180" cy="150" r="11" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.5" /></g>
        </g>
      ) : null}

      {showSpoon ? (
        <g transform={`translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${rot.toFixed(2)})`}>
          <rect x="16" y="-9" width="62" height="8" rx="4" fill="url(#wda-spoonG)" stroke="#9094AA" strokeWidth="0.8" transform="rotate(-9)" />
          <ellipse cx="0" cy="0" rx="23" ry="15" fill="url(#wda-spoonG)" stroke="#9094AA" strokeWidth="1" />
          <ellipse cx="0" cy="-1" rx="17" ry="10" fill="#C9CDDD" />
          {bowlWater > 0.03 ? <ellipse cx="-3" cy="0" rx={(15 * bowlWater).toFixed(1)} ry={(8 * bowlWater).toFixed(1)} fill="url(#wda-waterFill)" opacity="0.95" /> : null}
          <ellipse cx="-7" cy="-6" rx="8" ry="3" fill="#FFFFFF" opacity="0.6" />
        </g>
      ) : null}
    </svg>
  );
}

function PlateBottomFace() {
  return (
    <svg viewBox="0 0 360 260" width="100%" style={{ display: "block", transform: "scaleY(-1)" }} aria-hidden="true">
      <defs>
        <radialGradient id="wda-steelBottom" cx="44%" cy="60%" r="82%">
          <stop offset="0%" stopColor="#FCFCFF" /><stop offset="60%" stopColor="#D4D7E4" /><stop offset="100%" stopColor="#A4A8BD" />
        </radialGradient>
      </defs>
      <ellipse cx="180" cy="206" rx="150" ry="24" fill={DS.primaryDeep} opacity="0.1" />
      <path d="M40 150 A140 70 0 0 0 320 150 A140 44 0 0 1 40 150 Z" fill="url(#wda-steelBottom)" stroke="#8B8FA6" strokeWidth="1.5" />
      <ellipse cx="180" cy="150" rx="92" ry="26" fill="none" stroke="#AFB3C6" strokeWidth="1.4" opacity="0.6" />
      <ellipse cx="180" cy="150" rx="62" ry="17" fill="none" stroke="#9DA1B6" strokeWidth="3" />
      <path d="M95 138 A140 60 0 0 1 265 138" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* Responsive hook — width/height/orientation for §8.1                       */
/* ------------------------------------------------------------------------ */
function useResponsive() {
  const [size, setSize] = useState({ w: 900, h: 700 });
  useEffect(() => {
    const h = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", h);
    h();
    return () => window.removeEventListener("resize", h);
  }, []);
  return {
    ...size,
    isMobile: size.w < 760,
    isNarrow: size.w < 620,
    isShort: size.h < 460,       // the 844x390 hard case (§8.1)
    isBig: size.w >= 1600,       // the 1920x1080 smart-board fill case
  };
}

/* ============================================================================
   MAIN COMPONENT
   ========================================================================== */
function WaterEvaporationTool({ props = {}, setStepDetails, setStopAutoNext }: ToolProps) {
  const ap = props.additionalProps ?? {};
  const { isMobile, isNarrow, isShort, isBig } = useResponsive();
  const showModeToggle = props.showModeToggle ?? true;
  const deviceCtx = props.device ?? "mobile";
  const isSmartboard = deviceCtx === "smartboard";

  const totalMinutes = ap.totalMinutes ?? 30;
  const runSeconds = ap.runSeconds ?? 18;
  const showVapourCfg = ap.showVapour !== false;

  /* ---- operator mode (§6.1/§6.2): Teacher = lean demo, Student = full practice ---- */
  const [operatorMode, setOperatorModeState] = useState<OperatorMode>(props.operatorMode ?? "student");
  const [muted, setMuted] = useState<boolean>(props.muted ?? false);
  const depth: Depth = operatorMode === "ai" ? "lean" : "full";
  const isAI = operatorMode === "ai";
  const audio = useAudio(muted);

  /* ---- activity mode: investigate the plate, or explore everyday examples ---- */
  const [activityMode, setActivityModeState] = useState<ActivityMode>(props.activityMode ?? "investigate");

  /* ---- investigation state ---- */
  const [phase, setPhaseState] = useState<Phase>("predict");
  const [prediction, setPrediction] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); // evaporation 0..1
  const [isPlaying, setIsPlaying] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [pourProgress, setPourProgress] = useState(0);
  const [pouring, setPouring] = useState(false);
  const [activeExample, setActiveExample] = useState(REAL_WORLD[0].id);
  const [hl, setHl] = useState<string | null>(null); // agent highlight target
  const hlTimer = useRef<number | null>(null);
  const isHL = (name: string) => hl === name;

  const [finished, setFinished] = useState(false);
  /* Latches true once the student reaches the final "Conclude" step, so the
     Finish button only appears after all four investigation steps are done. */
  const [stepsComplete, setStepsComplete] = useState(false);

  const evapRaf = useRef(0); const evapStart = useRef(0); const evapBase = useRef(0);
  const pourRaf = useRef(0); const pourStart = useRef(0);

  /* ---- interaction tracking for the uniform, non-evaluating `finished` event ---- */
  const startTimeRef = useRef<number>(Date.now());
  const phasesVisitedRef = useRef<Set<string>>(new Set(["predict"]));
  const activityModesVisitedRef = useRef<Set<string>>(new Set(["investigate"]));
  const examplesExploredRef = useRef<Set<string>>(new Set());
  const plateFlippedRef = useRef(false);
  const runsCompletedRef = useRef(0);

  useEffect(() => { if (props.operatorMode) setOperatorModeState(props.operatorMode); }, [props.operatorMode]);
  useEffect(() => { if (props.muted !== undefined) setMuted(props.muted); }, [props.muted]);
  useEffect(() => { if (typeof setStopAutoNext === "function") setStopAutoNext(true); }, []); // eslint-disable-line

  /* ---- keyframes + font (injected once) ---- */
  useEffect(() => {
    const tag = document.createElement("style");
    tag.setAttribute("data-wda", "true");
    tag.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      *{box-sizing:border-box;}
      @keyframes wda-fadeUp { from { opacity: 0; transform: translateY(14px);} to {opacity:1; transform: translateY(0);} }
      @keyframes wda-pop { 0% { transform: scale(0.85); opacity: 0;} 70% { transform: scale(1.04);} 100% { transform: scale(1); opacity:1;} }
      @keyframes wda-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(74,77,201,0.35);} 50% { box-shadow: 0 0 0 10px rgba(74,77,201,0);} }
      @keyframes wda-thumb-pulse { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.12); } }
      @keyframes wda-shimmer { 0%,100% { opacity: 0.55;} 50% { opacity: 0.92;} }
      @keyframes wda-flow { from { stroke-dashoffset: 0;} to { stroke-dashoffset: -36;} }
      @keyframes wda-splash { 0% { transform: scale(0.45); opacity: 0.55;} 100% { transform: scale(1.5); opacity: 0;} }
      @keyframes wda-steam {
        0%   { opacity: 0; transform: translate(0px, 6px) scale(0.45); }
        14%  { opacity: var(--peak, 0.5); }
        45%  { transform: translate(calc(var(--drift, 0px) * 0.4), -42px) scale(1.15); }
        75%  { opacity: calc(var(--peak, 0.5) * 0.4); }
        100% { opacity: 0; transform: translate(var(--drift, 0px), -104px) scale(1.95); }
      }
      @keyframes wda-ring { 0%,100%{ box-shadow: 0 0 0 3px ${DS.accent}, 0 0 0 3px rgba(255,114,18,0) } 50%{ box-shadow: 0 0 0 3px ${DS.accent}, 0 0 0 10px rgba(255,114,18,0) } }
      @keyframes wda-fade-in { from { opacity: 0 } to { opacity: 1 } }
      @keyframes wda-pop-in { from { opacity: 0; transform: scale(.85) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      @keyframes wda-icon-pop { from { opacity: 0; transform: scale(0) rotate(-20deg) } to { opacity: 1; transform: scale(1) rotate(0) } }
      @keyframes wda-caption-pulse { 0%,100% { opacity: .78 } 50% { opacity: 1 } }
      @keyframes wda-finish-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes wda-mist-rise { 0% { opacity: 0; transform: translate(0,0) scale(0.6);} 12% { opacity: 0.9; } 100% { opacity: 0; transform: translate(var(--drift), -520px) scale(1.3);} }
      .wda-shimmer { animation: wda-shimmer 3.5s ease-in-out infinite; }
      .wda-flow { animation: wda-flow 0.55s linear infinite; }
      .wda-splash { transform-box: fill-box; transform-origin: center; animation: wda-splash 1.1s ease-out infinite; }
      .wda-steam { animation-name: wda-steam; animation-timing-function: cubic-bezier(0.33, 0, 0.2, 1); animation-iteration-count: infinite; }
      .wda-btn { transition: transform .16s ease, box-shadow .2s ease, background .2s ease, color .2s ease, border-color .2s ease; }
      .wda-btn:hover { transform: translateY(-2px); }
      .wda-btn:active { transform: translateY(0) scale(0.97); }
      .wda-card { transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
      .wda-hl { animation: wda-ring 1.05s ease-in-out infinite; border-radius: inherit; }
      @media (orientation: landscape) {
        .wda-two-pane { display: grid; grid-template-columns: minmax(260px, 1.3fr) minmax(260px, 1fr); gap: 18px; align-items: stretch; }
      }
      @media (prefers-reduced-motion: reduce) {
        .wda-hl, [style*="wda-pop-in"], [style*="wda-icon-pop"] { animation: none !important; }
        *[style*="animation"] { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
      }
    `;
    document.head.appendChild(tag);
    return () => { document.querySelectorAll('style[data-wda="true"]').forEach((s: any) => s.remove()); };
  }, []);

  /* ---- pour animation ---- */
  const startPour = useCallback(() => {
    cancelAnimationFrame(pourRaf.current);
    setPouring(true); setPourProgress(0); pourStart.current = 0;
    const dur = 2.2;
    const step = (now: number) => {
      if (!pourStart.current) pourStart.current = now;
      const t = clamp01((now - pourStart.current) / 1000 / dur);
      setPourProgress(t);
      if (t < 1) pourRaf.current = requestAnimationFrame(step);
      else setPouring(false);
    };
    pourRaf.current = requestAnimationFrame(step);
  }, []);

  /* ---- evaporation animation ---- */
  const tick = useCallback((now: number) => {
    if (!evapStart.current) evapStart.current = now;
    const elapsed = (now - evapStart.current) / 1000;
    const span = Math.max(1, runSeconds);
    const next = clamp01(evapBase.current + elapsed / span);
    setProgress(next);
    if (next < 1) evapRaf.current = requestAnimationFrame(tick);
    else {
      setIsPlaying(false);
      runsCompletedRef.current += 1;
      emit({ type: "event", name: "run_completed", detail: {} });
    }
  }, [runSeconds]);

  useEffect(() => {
    if (isPlaying) { evapStart.current = 0; evapBase.current = progress; evapRaf.current = requestAnimationFrame(tick); }
    else cancelAnimationFrame(evapRaf.current);
    return () => cancelAnimationFrame(evapRaf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    setStepDetails?.({ currentStep: PHASES.findIndex((p) => p.key === phase) + 1, totalSteps: PHASES.length, isPaused: !isPlaying, currentMode: activityMode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPlaying, activityMode]);

  /* ---- derived ---- */
  const pourFill = seg(pourProgress, 0.34, 0.82);
  const amount = clamp01(pourFill * (1 - progress));
  const elapsedMinutes = Math.round(progress * totalMinutes);
  const fullyGone = progress >= 0.999;
  const showSteam = showVapourCfg && isPlaying && amount > 0.05 && amount < 0.99 && !flipped;

  /* ============================ event helpers ============================ */
  const emitEvent = (name: string, detail: any) => emit({ type: "event", name, detail });

  const changePhase = (next: Phase) => {
    setPhaseState(next);
    phasesVisitedRef.current.add(next);
    if (next === "conclude") setStepsComplete(true); // all four steps done -> unlock Finish
    emitEvent("phase_changed", { phase: next });
  };

  /* ============================ tool actions (used by BOTH student clicks
     AND agent commands — same visible result either way, §3.4) ============= */
  const doPredict = (predictionId: string) => {
    if (!PREDICTIONS.some((p) => p.id === predictionId)) return { ok: false, reason: "unknown prediction" };
    if (prediction === predictionId) return { ok: true, already: true };
    setPrediction(predictionId);
    audio.tap();
    emitEvent("prediction_made", { predictionId, matchesScience: predictionId === "vapour" });
    return { ok: true };
  };

  const doPourWater = () => {
    changePhase("observe");
    setIsPlaying(false); setProgress(0); evapBase.current = 0; evapStart.current = 0;
    startPour();
    audio.pour();
    emitEvent("poured", {});
    return { ok: true };
  };

  const doPlay = () => {
    if (pouring) return { ok: false, reason: "still pouring" };
    if (fullyGone) return { ok: true, already: true };
    const wasStopped = !isPlaying;
    setIsPlaying(true);
    if (wasStopped) emitEvent("run_started", {});
    return { ok: true };
  };
  const doPause = () => { setIsPlaying(false); return { ok: true }; };

  const doAdvanceTime = () => {
    cancelAnimationFrame(evapRaf.current);
    setIsPlaying(false);
    setPourProgress(1); setPouring(false);
    setProgress(1);
    runsCompletedRef.current += 1;
    emitEvent("run_started", {});
    emitEvent("run_completed", {});
    return { ok: true };
  };

  const doFlipPlate = () => {
    setFlipped((v: boolean) => {
      const next = !v;
      if (next) { plateFlippedRef.current = true; audio.reveal(); } else audio.flip();
      emitEvent("plate_flipped", { flipped: next });
      return next;
    });
    return { ok: true };
  };

  const doGoToPhase = (phaseId: string) => {
    if (!PHASES.some((p) => p.key === phaseId)) return { ok: false, reason: "unknown phase" };
    changePhase(phaseId as Phase);
    if (phaseId === "observe" && pourProgress < 0.02 && !pouring) startPour();
    return { ok: true };
  };

  const applyActivityMode = (mode: string) => {
    if (mode !== "investigate" && mode !== "explore") return { ok: false, reason: "unknown activity mode" };
    activityModesVisitedRef.current.add(mode);
    setActivityModeState(mode as ActivityMode);
    emitEvent("activity_mode_changed", { mode });
    return { ok: true };
  };

  const doSelectExample = (exampleId: string) => {
    if (!REAL_WORLD.some((e) => e.id === exampleId)) return { ok: false, reason: "unknown example" };
    if (activityMode !== "explore") applyActivityMode("explore");
    setActiveExample(exampleId);
    examplesExploredRef.current.add(exampleId);
    audio.tap();
    emitEvent("example_selected", { exampleId });
    return { ok: true };
  };

  /* ---- Teacher|Student mode switch — drives UI collapse + content depth (§6.1/6.2) ---- */
  const applyOperatorMode = (mode: string) => {
    const v = mode === "ai" ? "ai" : "student";
    setOperatorModeState(v);
    emitEvent("operator_mode_changed", { operatorMode: v, depth: v === "ai" ? "lean" : "full" });
    return { ok: true };
  };

  /* ---- Agent guidance: pulse a named element (non-destructive) ---- */
  const doHighlight = (target: string) => {
    if (typeof target !== "string") return { ok: false };
    setHl(target);
    if (hlTimer.current) window.clearTimeout(hlTimer.current);
    hlTimer.current = window.setTimeout(() => setHl(null), 2400);
    return { ok: true };
  };

  /* ---- agent-only full reset. NEVER exposed as a student "Play again"
     whole-tool loop (§6.3) — student's forward path ends at Finish. ---- */
  const resetAll = () => {
    setActivityModeState(props.activityMode ?? "investigate");
    setPhaseState("predict");
    setPrediction(null);
    setProgress(0); setIsPlaying(false); setFlipped(false);
    setPourProgress(0); setPouring(false);
    setActiveExample(REAL_WORLD[0].id);
    setFinished(false);
    setStepsComplete(false);
    startTimeRef.current = Date.now();
    phasesVisitedRef.current = new Set(["predict"]);
    activityModesVisitedRef.current = new Set(["investigate"]);
    examplesExploredRef.current = new Set();
    plateFlippedRef.current = false;
    runsCompletedRef.current = 0;
    emitEvent("reset", {});
    return { ok: true };
  };

  /* ---- Finish (student mode only) — the uniform end-of-tool event (§6.3).
     Non-evaluating: no score/star, but a full interaction summary + the
     "what you have learned" points, per the uniform `finished` contract. ---- */
  const handleFinish = () => {
    if (finished) return { ok: true, already: true };
    const durationMs = Date.now() - startTimeRef.current;
    setFinished(true);
    audio.done();
    emit({
      type: "event",
      name: "finished",
      detail: {
        evaluated: false,
        interactions: {
          phasesVisited: Array.from(phasesVisitedRef.current),
          activityModesVisited: Array.from(activityModesVisitedRef.current),
          predictionId: prediction,
          plateFlipped: plateFlippedRef.current,
          examplesExplored: Array.from(examplesExploredRef.current),
          runsCompleted: runsCompletedRef.current,
          durationMs,
        },
        learned: LEARNED_POINTS,
      },
    });
    return { ok: true };
  };

  const snapshot = () => ({
    activityMode, phase, prediction, progress, flipped, exampleId: activeExample,
    operatorMode, depth, muted, finished,
  });

  /* ---- The agent API: every windowMethod in the JSON lives here ---- */
  const api = {
    setParam: (n: string, v: any) => {
      if (n === "operatorMode") return applyOperatorMode(v);
      if (n === "activityMode") return applyActivityMode(v);
      if (n === "muted") { setMuted(!!v); return { ok: true }; }
      return { ok: true };
    },
    play: () => doPlay(),
    pause: () => doPause(),
    reset: () => resetAll(),
    highlight: (target: string) => doHighlight(target),
    getState: () => { const st = snapshot(); emit({ type: "state", state: st }); return st; },
    setOperatorMode: (mode: string) => applyOperatorMode(mode),
    setActivityMode: (mode: string) => applyActivityMode(mode),
    predict: (predictionId: string) => doPredict(predictionId),
    pourWater: () => doPourWater(),
    advanceTime: () => doAdvanceTime(),
    flipPlate: () => doFlipPlate(),
    goToPhase: (phaseId: string) => doGoToPhase(phaseId),
    selectExample: (exampleId: string) => doSelectExample(exampleId),
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
    emit({ type: "ready", toolId: TOOL_ID }); // ⭐ commands before this are queued by the host
    return () => window.removeEventListener("message", onMsg);
  }, []);

  /* ---- shared button styles (device-target minimums, §7.4) ---- */
  const btnBase: React.CSSProperties = {
    fontFamily: DS.font, fontWeight: 700, border: "none", borderRadius: 9999, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: isSmartboard ? "16px 26px" : isShort ? "9px 16px" : "12px 22px",
    fontSize: isSmartboard ? 18 : isShort ? 13 : isMobile ? 14 : 15,
    minHeight: isSmartboard ? 60 : isShort ? 38 : 46,
    transition: "transform 100ms ease, filter 120ms ease",
  };
  const primaryBtn: React.CSSProperties = { ...btnBase, background: `linear-gradient(135deg, ${DS.accent}, ${DS.accentSoft})`, color: DS.white, boxShadow: "0 6px 16px rgba(255,114,18,.3)" };
  const outlineBtn: React.CSSProperties = { ...btnBase, background: DS.white, color: DS.primary, border: `2px solid ${DS.primaryLight}` };
  const disabledBtn: React.CSSProperties = { ...btnBase, background: DS.greyLight, color: DS.grey, cursor: "not-allowed", boxShadow: "none" };
  const ghostBtn: React.CSSProperties = { ...btnBase, background: "transparent", color: DS.ink700, padding: isShort ? "7px 10px" : "8px 14px" };

  const phaseIndex = PHASES.findIndex((p) => p.key === phase);
  const guessedRight = prediction === "vapour";

  /* Teacher (lean) surfaces exactly one everyday example; Student (full) all four (§6.2) */
  const visibleExamples = depth === "lean" ? REAL_WORLD.slice(0, 1) : REAL_WORLD;

  const watchCaption = (() => {
    if (activityMode === "explore") return "👩‍🏫 Watch one everyday place the same evaporation shows up.";
    if (phase === "predict") return "👩‍🏫 Watch how a careful prediction gets made before testing it.";
    if (phase === "observe") return "👩‍🏫 Watch the puddle shrink — notice the faint vapour rising.";
    if (phase === "flip") return "👩‍🏫 Watch closely — is there any water on the underside?";
    return "👩‍🏫 Watch how the evidence rules out seepage and points to evaporation.";
  })();

  /* ==================== STAGE (the plate — showpiece; both modes) ==================== */
  const Stage = (
    <div
      data-hl="plate"
      className={isHL("plate") || isHL("spoon") ? "wda-hl" : ""}
      style={{
        background: DS.gradientSoft, borderRadius: 22, padding: isShort ? "8px 12px" : "clamp(12px, 2.5vw, 22px)",
        position: "relative", overflow: "hidden", minHeight: 0,
        maxHeight: isShort ? "34dvh" : isBig ? "56dvh" : "44dvh",
        display: "flex", flexDirection: "column", justifyContent: "center", boxSizing: "border-box",
      }}
    >
      <div style={{ perspective: 1100, width: "100%", maxWidth: isBig ? 560 : 440, margin: "0 auto", position: "relative" }}>
        <div style={{ position: "relative", width: "100%", transformStyle: "preserve-3d", transition: "transform 700ms cubic-bezier(.4,0,.2,1)", transform: flipped ? "rotateX(180deg)" : "rotateX(0deg)" }}>
          <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
            <PlateTopFace amount={amount} pourProgress={pourProgress} showSpoon={pouring} />
          </div>
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateX(180deg)" }}>
            <PlateBottomFace />
          </div>
        </div>

        {showSteam ? (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
            {/* haze backdrop — darkens the zone behind the rising steam so pale wisps
                read clearly against the light stage background instead of washing out */}
            <div
              style={{
                position: "absolute", left: "50%", bottom: "30%", width: "78%", height: "62%",
                transform: "translateX(-50%)", borderRadius: "50%",
                background: "radial-gradient(circle at 50% 60%, rgba(90,110,145,0.22), rgba(90,110,145,0.08) 55%, rgba(90,110,145,0) 78%)",
                animation: "wda-shimmer 3.5s ease-in-out infinite",
              }}
            />
            {STEAM.map((wisp) => (
              <span key={wisp.id} style={{ position: "absolute", left: `calc(50% + ${wisp.x}px)`, bottom: "38%", transform: "translateX(-50%)" }}>
                <span
                  className="wda-steam"
                  style={{
                    display: "block", width: wisp.w, height: wisp.h, borderRadius: "50%",
                    background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.98), rgba(226,238,248,0.55) 55%, rgba(226,238,248,0))",
                    boxShadow: "0 0 6px 1px rgba(255,255,255,0.35)",
                    filter: "blur(2px)", animationDuration: wisp.dur + "s", animationDelay: wisp.delay + "s",
                    ["--drift" as any]: wisp.drift + "px", ["--peak" as any]: wisp.peak,
                  }}
                />
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {!isShort && (
        <div style={{ textAlign: "center", marginTop: 6, fontSize: 11.5, fontStyle: "italic", color: DS.primaryDeep, opacity: 0.85 }}>
          A spoonful of water on a steel plate
        </div>
      )}

      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
        <Chip icon={<span style={{ fontSize: 12 }}>⏱️</span>} text={`${elapsedMinutes} min`} />
        <Chip icon={<Droplets size={13} color={DS.primary} />} text={`Water left: ${Math.round(amount * 100)}%`} />
        {flipped ? (
          <Chip icon={<Check size={13} color={DS.good} />} text="Underside is dry" tone="good" />
        ) : pouring ? (
          <Chip icon={<Droplets size={13} color={DS.accent} />} text="Pouring…" tone="warm" />
        ) : showSteam ? (
          <Chip icon={<span style={{ fontSize: 12 }}>💨</span>} text="Vapour rising" tone="warm" />
        ) : null}
      </div>
    </div>
  );

  /* ==================== PANEL (per phase) — student mode: full controls ==================== */
  let Panel: any = null;

  if (phase === "predict") {
    Panel = (
      <div style={{ animation: "wda-fadeUp .4s ease both" }}>
        <PanelTitle icon={<Lightbulb size={17} />} text="Make a prediction" compact={isShort} />
        {!isShort && <p style={panelText}>A spoonful of water sits on a steel plate. Where do you think it will go as time passes?</p>}
        <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
          {PREDICTIONS.map((opt) => {
            const chosen = prediction === opt.id;
            const reveal = prediction !== null;
            let border = `2px solid ${DS.greyLight}`; let bg = DS.white;
            if (chosen) { border = `2px solid ${DS.primary}`; bg = "#F2F2FB"; }
            if (reveal && opt.correct) { border = `2px solid ${DS.good}`; bg = DS.goodBg; }
            return (
              <button
                key={opt.id} data-hl={opt.id} className={`wda-card wda-btn ${isHL(opt.id) ? "wda-hl" : ""}`}
                onClick={() => doPredict(opt.id)}
                style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: isShort ? "8px 12px" : "11px 14px", borderRadius: 14, border, background: bg, cursor: "pointer", fontFamily: DS.font, fontSize: 13.5, fontWeight: 500, color: DS.ink, minHeight: 44 }}
              >
                <span style={{ fontSize: 17 }}>{opt.emoji}</span>
                <span style={{ flex: 1 }}>{opt.label}</span>
                {reveal && opt.correct ? <Check size={17} color={DS.good} /> : null}
              </button>
            );
          })}
        </div>
        {prediction ? (
          <div style={{ marginTop: 10 }}>
            {!isShort && (
              <div style={{ background: prediction === "vapour" ? DS.goodBg : DS.peach, border: `1px solid ${prediction === "vapour" ? DS.goodBorder : "#F6D8B8"}`, borderRadius: 14, padding: "10px 14px", fontSize: 13, color: DS.ink, lineHeight: 1.5 }}>
                {prediction === "vapour" ? "Good thinking! Let's run the experiment and watch — then flip the plate to be sure." : "Interesting guess. Let's run the experiment and watch carefully — the plate will reveal the answer."}
              </div>
            )}
            <button data-hl="pourButton" className={`wda-btn ${isHL("pourButton") ? "wda-hl" : ""}`} onClick={doPourWater} style={{ ...primaryBtn, marginTop: 10, width: "100%", justifyContent: "center" }}>
              Start the experiment <ChevronRight size={17} />
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (phase === "observe") {
    Panel = (
      <div style={{ animation: "wda-fadeUp .4s ease both" }}>
        <PanelTitle icon={<Eye size={17} />} text="Observe at regular intervals" compact={isShort} />
        {!isShort && <p style={panelText}>Play the timer and watch the puddle — notice the faint vapour rising as the water changes into water vapour.</p>}

        <div style={{ margin: isShort ? "10px 0 6px" : "16px 0 6px" }}>
          <div style={{ position: "relative", height: isShort ? 12 : 16, borderRadius: 999, background: DS.greyLight, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.14)" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%", width: `${progress * 100}%`, background: DS.gradient, borderRadius: 999,
                  transition: "width 120ms linear", boxShadow: isPlaying ? `0 0 10px 1px ${DS.accent}66` : "none",
                }}
              />
            </div>
            <span
              style={{
                position: "absolute", left: `${progress * 100}%`, top: "50%", transform: "translate(-50%,-50%)",
                width: isShort ? 18 : 22, height: isShort ? 18 : 22, borderRadius: "50%",
                background: `linear-gradient(135deg, ${DS.white}, #F3F0FF)`, border: `3px solid ${DS.accent}`,
                boxShadow: isPlaying ? `0 2px 6px rgba(0,0,0,0.25), 0 0 0 5px ${DS.accent}33` : "0 2px 6px rgba(0,0,0,0.25)",
                transition: "left 120ms linear, box-shadow 200ms ease", animation: isPlaying ? "wda-thumb-pulse 1.4s ease-in-out infinite" : "none",
              }}
            />
            {!fullyGone && progress > 0.02 && (
              <div
                style={{
                  position: "absolute", left: `${progress * 100}%`, bottom: "calc(100% + 8px)", transform: "translateX(-50%)",
                  background: DS.primaryDeep, color: DS.white, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
                  whiteSpace: "nowrap", boxShadow: "0 4px 10px rgba(0,0,0,0.2)", transition: "left 120ms linear",
                }}
              >
                {elapsedMinutes} min
                <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${DS.primaryDeep}` }} />
              </div>
            )}
          </div>
          {!isShort && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10.5, color: DS.ink700, fontWeight: 500 }}>
              <span>0 min</span><span>{Math.round(totalMinutes / 2)} min</span><span>{totalMinutes} min</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button
            data-hl="playButton" className={`wda-btn ${isHL("playButton") ? "wda-hl" : ""}`} disabled={pouring || fullyGone}
            onClick={() => { if (pouring || fullyGone) return; if (!isPlaying) doPlay(); else doPause(); }}
            style={{ ...(fullyGone ? disabledBtn : primaryBtn), flex: 1, justifyContent: "center", minWidth: 120, opacity: pouring ? 0.5 : 1, cursor: pouring || fullyGone ? "default" : "pointer", animation: !isPlaying && !fullyGone && !pouring ? "wda-pulse 2s infinite" : "none" }}
          >
            {pouring ? <Droplets size={16} /> : fullyGone ? <Check size={16} /> : isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {pouring ? "Filling…" : fullyGone ? "Plate is dry" : isPlaying ? "Pause" : "Play timer"}
          </button>
        </div>

        {!isShort && (
          <div style={{ marginTop: 10, background: DS.surface, borderRadius: 14, padding: "10px 14px", fontSize: 13, color: DS.ink, lineHeight: 1.5 }}>
            {pouring ? "Pouring a spoonful of water onto the steel plate…" : fullyGone ? "The plate is now completely dry — all the water has disappeared. But where did it go? Let's check the underside." : progress > 0.05 ? "The puddle is getting smaller and smaller. The water level on the plate keeps dropping." : "Press play to begin observing. Watch the plate closely as time passes."}
          </div>
        )}

        {fullyGone ? (
          <button data-hl="nextButton" className={`wda-btn ${isHL("nextButton") ? "wda-hl" : ""}`} onClick={() => changePhase("flip")} style={{ ...primaryBtn, marginTop: 10, width: "100%", justifyContent: "center", background: `linear-gradient(135deg, ${DS.primaryDeep}, ${DS.primary})` }}>
            Check the underside <ChevronRight size={17} />
          </button>
        ) : null}
      </div>
    );
  }

  if (phase === "flip") {
    Panel = (
      <div style={{ animation: "wda-fadeUp .4s ease both" }}>
        <PanelTitle icon={<RefreshCw size={17} />} text="Did any water seep through?" compact={isShort} />
        {!isShort && <p style={panelText}>Some think the water soaked through the plate. Flip it over and look for yourself.</p>}
        <button data-hl="flipButton" className={`wda-btn ${isHL("flipButton") ? "wda-hl" : ""}`} onClick={doFlipPlate} style={{ ...primaryBtn, width: "100%", justifyContent: "center", marginTop: 4 }}>
          <RefreshCw size={17} /> {flipped ? "Flip back to the top" : "Flip the plate over"}
        </button>
        {flipped ? (
          <div style={{ marginTop: 10, background: DS.goodBg, border: `1px solid ${DS.goodBorder}`, borderRadius: 14, padding: "10px 14px", fontSize: 13, color: DS.ink, lineHeight: 1.5, animation: "wda-pop .35s ease both" }}>
            <strong style={{ color: DS.good }}>The underside is completely dry.</strong> No water seeped through the steel plate — steel does not let water pass through it. The water must have left another way.
          </div>
        ) : null}
        {flipped ? (
          <button data-hl="nextButton" className={`wda-btn ${isHL("nextButton") ? "wda-hl" : ""}`} onClick={() => changePhase("conclude")} style={{ ...primaryBtn, marginTop: 10, width: "100%", justifyContent: "center", background: `linear-gradient(135deg, ${DS.primaryDeep}, ${DS.primary})` }}>
            What's the conclusion? <ChevronRight size={17} />
          </button>
        ) : null}
      </div>
    );
  }

  if (phase === "conclude") {
    Panel = (
      <div style={{ animation: "wda-fadeUp .4s ease both" }}>
        <PanelTitle icon={<Check size={17} />} text="What we found out" compact={isShort} />
        <div style={{ background: DS.gradient, color: DS.white, borderRadius: 16, padding: isShort ? 10 : 14, lineHeight: 1.5, fontSize: 13.5 }}>
          The water did <strong>not</strong> seep through the steel plate. It changed into an invisible gas called <strong>water vapour</strong> and rose into the air. This is called <strong>evaporation</strong>.
        </div>
        {!isShort && (
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            <FactRow emoji="🛡️" text="Steel is not porous — water cannot pass through it." />
            <FactRow emoji="☁️" text="Liquid water turned into water vapour (a gas)." />
            <FactRow emoji="🌡️" text="Evaporation happens even at room temperature." />
          </div>
        )}
        {prediction && !isShort ? (
          <div style={{ marginTop: 10, background: guessedRight ? DS.goodBg : DS.peach, border: `1px solid ${guessedRight ? DS.goodBorder : "#F6D8B8"}`, borderRadius: 14, padding: "10px 14px", fontSize: 12.5, color: DS.ink }}>
            {guessedRight ? "Your prediction was spot on — the water evaporated!" : "Your first guess was different — now you've seen the real answer through investigation."}
          </div>
        ) : null}
        <button data-hl="activityModeToggle" className={`wda-btn ${isHL("activityModeToggle") ? "wda-hl" : ""}`} onClick={() => applyActivityMode("explore")} style={{ ...outlineBtn, marginTop: 10, width: "100%", justifyContent: "center" }}>
          See everyday examples <ChevronRight size={17} />
        </button>
      </div>
    );
  }

  /* ==================== PHASE STEPPER (student mode only) ==================== */
  const Stepper = (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
      <button data-hl="prevButton" className={`wda-btn ${isHL("prevButton") ? "wda-hl" : ""}`} onClick={() => changePhase(PHASES[Math.max(0, phaseIndex - 1)].key)} disabled={phaseIndex === 0} style={{ ...ghostBtn, opacity: phaseIndex === 0 ? 0.35 : 1 }}>
        <ChevronLeft size={16} /> {!isShort && "Back"}
      </button>
      <div style={{ display: "flex", gap: 4, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
        {PHASES.map((ph, i) => {
          const Icon = ph.icon; const on = i === phaseIndex; const done = i < phaseIndex;
          return (
            <button key={ph.key} className="wda-btn" onClick={() => (i <= phaseIndex || done) && changePhase(ph.key)} title={ph.label}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: isShort ? "5px 9px" : "6px 11px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: DS.font, fontWeight: 600, fontSize: 11.5, background: on ? DS.primary : done ? "#E7E7F7" : DS.surface, color: on ? DS.white : done ? DS.primary : DS.ink700 }}>
              <Icon size={13} />
              {!isNarrow && !isShort ? ph.label : null}
            </button>
          );
        })}
      </div>
      <button className="wda-btn" onClick={() => changePhase(PHASES[Math.min(PHASES.length - 1, phaseIndex + 1)].key)} disabled={phaseIndex === PHASES.length - 1} style={{ ...ghostBtn, opacity: phaseIndex === PHASES.length - 1 ? 0.35 : 1 }}>
        {!isShort && "Next"} <ChevronRight size={16} />
      </button>
    </div>
  );

  /* ==================== EXPLORE MODE (everyday examples) ==================== */
  const activeCard = REAL_WORLD.find((e) => e.id === activeExample) ?? REAL_WORLD[0];
  const ExploreView = (
    <div style={{ animation: "wda-fadeUp .4s ease both" }}>
      {!isShort && <p style={{ ...panelText, marginTop: 0 }}>Evaporation is happening all around us — not just on a steel plate. Tap an example to learn more.</p>}
      <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr 1fr" : `repeat(${visibleExamples.length === 1 ? 1 : 2},1fr)`, gap: 10, marginTop: 4 }}>
        {visibleExamples.map((ex: ExampleCard) => {
          const on = activeExample === ex.id;
          return (
            <button key={ex.id} data-hl={ex.id} className={`wda-card wda-btn ${isHL(ex.id) ? "wda-hl" : ""}`} onClick={() => doSelectExample(ex.id)}
              style={{ cursor: "pointer", textAlign: "center", padding: isShort ? "8px 8px" : "13px 10px", borderRadius: 16, border: `2px solid ${on ? DS.primary : DS.greyLight}`, background: on ? "#F2F2FB" : DS.white, fontFamily: DS.font }}>
              <div style={{ fontSize: isShort ? 20 : 26, display: "flex", justifyContent: "center", alignItems: "center" }}>{ex.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: DS.primaryDeep, marginTop: 4 }}>{ex.title}</div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 10, background: DS.gradientSoft, borderRadius: 16, padding: isShort ? 10 : 14, fontSize: 13, color: DS.ink, lineHeight: 1.5, minHeight: isShort ? 0 : 60 }}>
        {activeCard.note}
      </div>
      <button className="wda-btn" onClick={() => applyActivityMode("investigate")} style={{ ...outlineBtn, marginTop: 10 }}>
        <ChevronLeft size={16} /> Back to the experiment
      </button>
    </div>
  );

  /* ==================== HEADER ==================== */
  const Header = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: isShort ? 6 : 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{ width: isShort ? 30 : 36, height: isShort ? 30 : 36, borderRadius: 11, background: DS.gradient, display: "grid", placeItems: "center", color: DS.white, flexShrink: 0 }}>
          <FlaskConical size={isShort ? 16 : 19} />
        </div>
        {!isNarrow && (
          <div style={{ fontWeight: 800, fontSize: isShort ? 13 : 16, color: DS.primaryDeep, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Water's disappearing act
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <div data-hl="activityModeToggle" className={isHL("activityModeToggle") ? "wda-hl" : ""} style={{ display: "inline-flex", background: DS.surface, padding: 3, borderRadius: 999, gap: 3 }}>
          {(["investigate", "explore"] as ActivityMode[]).map((m) => {
            const on = activityMode === m;
            return (
              <button key={m} className="wda-btn" onClick={() => applyActivityMode(m)} style={{ padding: isShort ? "5px 9px" : "7px 13px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: DS.font, fontWeight: 700, fontSize: isShort ? 10.5 : 12, background: on ? DS.primary : "transparent", color: on ? DS.white : DS.ink700 }}>
                {m === "investigate" ? "Investigate" : isNarrow ? "Examples" : "Everyday examples"}
              </button>
            );
          })}
        </div>
        {showModeToggle && <ModeToggle mode={operatorMode} onChange={applyOperatorMode} highlighted={isHL("modeToggle")} compact={isShort} />}
        <button
          data-hl="muteButton" className={`wda-btn ${isHL("muteButton") ? "wda-hl" : ""}`} onClick={() => setMuted((m: boolean) => !m)} aria-label={muted ? "Unmute sound" : "Mute sound"}
          style={{ width: isSmartboard ? 56 : isShort ? 30 : 34, height: isSmartboard ? 56 : isShort ? 30 : 34, borderRadius: 9999, border: `2px solid ${DS.primaryLight}`, background: DS.white, color: DS.primary, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        {operatorMode === "student" && stepsComplete && (
          /* Appears only after all four steps are complete. The wrapper owns the
             entrance animation (opacity + translate only), so the button's own
             box never resizes as it appears. The button uses a fixed height +
             flexShrink:0 + nowrap and its own self-contained sizing (no shared
             btnBase spread), so responsive breakpoints and hover can't change
             its footprint. */
          <span style={{ display: "inline-flex", flexShrink: 0, animation: "wda-finish-in .32s ease both" }}>
            <button
              data-hl="finishButton"
              className={`wda-btn ${isHL("finishButton") ? "wda-hl" : ""}`}
              onClick={handleFinish}
              disabled={finished}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxSizing: "border-box", whiteSpace: "nowrap", flexShrink: 0,
                height: isSmartboard ? 52 : isShort ? 34 : 40,
                padding: isSmartboard ? "0 24px" : isShort ? "0 14px" : "0 18px",
                fontFamily: DS.font, fontWeight: 700, fontSize: isSmartboard ? 16 : isShort ? 12 : 13,
                border: "none", borderRadius: 9999, cursor: finished ? "not-allowed" : "pointer",
                color: finished ? DS.grey : DS.white,
                background: finished ? DS.greyLight : `linear-gradient(135deg, ${DS.accent}, ${DS.accentSoft})`,
                boxShadow: finished ? "none" : "0 6px 16px rgba(255,114,18,.3)",
              }}
            >
              <Flag size={14} /> Finish
            </button>
          </span>
        )}
      </div>
    </div>
  );

  /* ==================== LAYOUT ==================== */
  return (
    <div
      style={{
        fontFamily: DS.font, width: "100%", maxWidth: isBig ? 1400 : 980, margin: "0 auto",
        background: DS.white, borderRadius: isMobile ? 16 : 24, boxSizing: "border-box",
        padding: isShort ? "8px 10px 10px" : isBig ? "26px 34px 30px" : "clamp(12px, 3vw, 22px)",
        boxShadow: "0 18px 50px rgba(83,48,134,0.12)", color: DS.ink,
        height: "100%", maxHeight: "100dvh", overflow: isAI ? "hidden" : "auto",
        display: "flex", flexDirection: "column",
      }}
    >
      {Header}

      {isAI && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: DS.primaryGhost, color: DS.primaryDeep, borderRadius: 12, padding: isShort ? "6px 10px" : "9px 14px", fontWeight: 700, fontSize: isShort ? 11.5 : 13, marginBottom: isShort ? 6 : 12, animation: "wda-caption-pulse 2.2s ease-in-out infinite" }}>
          {watchCaption}
        </div>
      )}

      {activityMode === "explore" ? (
        ExploreView
      ) : (
        <>
          <div className="wda-two-pane" style={{ display: "flex", flexDirection: isNarrow ? "column" : "row", gap: 12, alignItems: "stretch", flex: 1, minHeight: 0 }}>
            {Stage}
            <div style={{ flex: isNarrow ? "none" : "1 1 0", width: isNarrow ? "100%" : "auto", minWidth: 0, background: DS.white, border: `1px solid ${DS.greyLight}`, borderRadius: 18, padding: isShort ? "8px 10px" : "clamp(12px, 2.4vw, 18px)", boxSizing: "border-box", overflowY: "auto" }}>
              {isAI ? (<div style={{ opacity: 0.85 }}>{Panel}</div>) : Panel}
            </div>
          </div>
          {!isAI && Stepper}
        </>
      )}

      <FinishOverlay show={finished} onClose={() => setFinished(false)} learned={LEARNED_POINTS} />
    </div>
  );
}

/* ==================== small presentational helpers ==================== */
const panelText = { fontSize: 13, color: DS.ink700, lineHeight: 1.5, margin: "4px 0 8px" } as React.CSSProperties;

function PanelTitle({ icon, text, compact }: { icon: any; text: string; compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
      <span style={{ color: DS.primary }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: compact ? 13.5 : 15.5, fontWeight: 700, color: DS.primaryDeep, fontFamily: DS.font }}>{text}</h3>
    </div>
  );
}

function Chip({ icon, text, tone }: { icon: any; text: string; tone?: "good" | "warm" }) {
  const bg = tone === "good" ? DS.goodBg : tone === "warm" ? DS.peach : DS.white;
  const bd = tone === "good" ? DS.goodBorder : tone === "warm" ? "#F6D8B8" : "#E7E7F7";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: bg, border: `1px solid ${bd}`, borderRadius: 999, padding: "5px 10px", fontSize: 11.5, fontWeight: 600, color: DS.ink, fontFamily: DS.font }}>
      {icon}{text}
    </span>
  );
}

function FactRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: DS.surface, borderRadius: 12, padding: "8px 11px", fontSize: 12.5, color: DS.ink, fontFamily: DS.font }}>
      <span style={{ fontSize: 16 }}>{emoji}</span><span>{text}</span>
    </div>
  );
}

export default WaterEvaporationTool;