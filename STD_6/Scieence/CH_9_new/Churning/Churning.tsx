// Churning: Butter & Buttermilk — Region Labelling Tool
// 2D Prompt v2 compliant — no framer-motion, pure CSS animations
// Concept: Churning separates butter (lighter, floats) from buttermilk (heavier, sinks)

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, RotateCcw, Award, Star, ChevronRight, ChevronLeft, X, Check, Lightbulb, Volume2, VolumeX } from "lucide-react";

/* ─── Tool identity ─────────────────────────────────────────────────────────── */
const TOOL_ID = "churning_butter_labeller";
const emit = (m: any) => { try { window.parent.postMessage(m, "*"); } catch {} };

/* ─── Types ──────────────────────────────────────────────────────────────────── */
type OperatorMode = "ai" | "student";
type Phase = "play" | "result" | "review" | "finished";
type PlayStage = "intro" | "churning" | "checkpoint";
type TagValue = "lighter" | "heavier";

interface ToolProps {
  operatorMode?: OperatorMode;
  themeColor?: string;
  darkMode?: boolean;
  device?: "mobile" | "smartboard";
  showModeToggle?: boolean;
  showPlayPause?: boolean;
  seed?: number;
  [key: string]: any;
}

interface Checkpoint {
  id: string;
  kind: "predict" | "tag";
  region?: "top" | "bottom";
  prompt: string;
  options?: string[];
  correctIdx?: number;
  correctTag?: TagValue;
  lockReason: string;
  concept: string;
}

interface UserAnswer {
  cpId: string;
  firstPick: string;
  correct: boolean;
}

/* ─── Checkpoint data ────────────────────────────────────────────────────────── */
const ALL_CHECKPOINTS: Checkpoint[] = [
  {
    id: "predict",
    kind: "predict",
    prompt: "After churning, a pale layer has gathered at the TOP of the pot. For a layer to rise and float up like this, it must be…",
    options: ["Lighter than the rest", "Heavier than the rest"],
    correctIdx: 0,
    lockReason: "To float to the top, a layer must be lighter (less dense) than the liquid around it.",
    concept: "Anything that rises and floats is less dense — lighter — than the liquid around it. As curd is churned, tiny fat droplets clump together into butter, which is lighter than the watery part, so it floats to the surface. It can feel surprising because butter looks solid and 'heavy', but it is density (weight for the same volume), not how solid it looks, that decides who floats.",
  },
  {
    id: "top",
    kind: "tag",
    region: "top",
    prompt: "Tap the TOP layer (the butter that floated up) and pick its tag.",
    correctTag: "lighter",
    lockReason: "Butter floats, so the top layer is the lighter component.",
    concept: "The top layer is butter (makhan). It gathered at the surface because it is lighter — less dense — than buttermilk, so it floats. Churning makes the fat clump together until enough has joined to rise to the top, which is why you can simply skim the butter off after churning.",
  },
  {
    id: "bottom",
    kind: "tag",
    region: "bottom",
    prompt: "Now tap the BOTTOM layer (the buttermilk left behind) and pick its tag.",
    correctTag: "heavier",
    lockReason: "Buttermilk sinks and stays below, so the bottom layer is the heavier component.",
    concept: "The bottom layer is buttermilk (chhach) — the watery liquid left after the fat has floated away. Being heavier (denser) than butter, it stays at the bottom of the pot. Separating the two by churning works exactly because they have different densities: the lighter part rises, the heavier part settles.",
  },
];

const LEAN_CHECKPOINTS: Checkpoint[] = [ALL_CHECKPOINTS[1]];
const HINT_LINE = "Floating things are usually lighter — watch which layer rose to the top.";
const TAG_LABEL: Record<TagValue, string> = { lighter: "Lighter component", heavier: "Heavier component" };
const LEARNED_POINTS = [
  "Things that float to the top are lighter (less dense) than the liquid around them.",
  "Butter is the lighter component — churning makes fat globules clump together until they rise to the top.",
  "Buttermilk is the heavier, watery component that is left behind at the bottom of the pot.",
  "It is density — not how solid or heavy something looks — that decides whether it floats or sinks.",
];

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
const DS = {
  c: {
    primary: "#4A4DC9", primaryDark: "#533086", primaryLight: "#C1C1EA", primaryGhost: "#EDEDF8",
    accent: "#FF7212", accentDark: "#FC9145", accentLight: "#FFF3E4",
    g900: "#1A1A2E", g700: "#4E4E4E", g400: "#CACACA", g200: "#EBEBEB", g100: "#F5F5F5", white: "#FFFFFF",
    success: "#2ECC71", successDk: "#1E9E54", danger: "#E53E3E", amber: "#F59E0B",
    clay: "#B26A3C", clayDk: "#79401F", clayLt: "#CB8A57", clayInner: "#5E3014",
    butter: "#F2D778", butterDk: "#E2BF54", butterLt: "#FAEBA8",
    milk: "#FCFAF2", milkShade: "#E1D7BE",
    wood: "#8A5A30", woodDk: "#553619", woodLt: "#A87544", rope: "#E2D4B1",
  },
  r: { sm: 8, md: 12, lg: 16, xl: 24, pill: 9999 },
  grad: {
    header: "linear-gradient(135deg, #533086 0%, #6C3F9E 45%, #FC9145 130%)",
    result: "linear-gradient(135deg, #533086 0%, #FF7212 120%)",
  },
};

/* ─── Math helpers ────────────────────────────────────────────────────────────── */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/* ─── Responsive hook ─────────────────────────────────────────────────────────── */
const useResponsive = () => {
  const [dims, setDims] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 900,
    h: typeof window !== "undefined" ? window.innerHeight : 600,
  });
  useEffect(() => {
    const h = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", h); h();
    return () => window.removeEventListener("resize", h);
  }, []);
  return { w: dims.w, h: dims.h, isMobile: dims.w < 576, isLandscape: dims.w > dims.h && dims.w >= 640 };
};

/* ─── Scene geometry ─────────────────────────────────────────────────────────── */
const VB_W = 360, VB_H = 340, CX = 180;
const LIQUID_TOP = 122, INNER_BOTTOM = 290;
const BUTTER_FRAC_FINAL = 0.16, BUTTER_TAP_FRAC = 0.24;
const REGION_PCT = {
  top:    { left: 27, top: LIQUID_TOP / VB_H * 100, width: 46, height: (BUTTER_TAP_FRAC * (INNER_BOTTOM - LIQUID_TOP)) / VB_H * 100 },
  bottom: { left: 24, top: (LIQUID_TOP + BUTTER_TAP_FRAC * (INNER_BOTTOM - LIQUID_TOP)) / VB_H * 100, width: 52, height: ((INNER_BOTTOM - LIQUID_TOP) * (1 - BUTTER_TAP_FRAC)) / VB_H * 100 },
};

/* ─── PotScene SVG ────────────────────────────────────────────────────────────── */
interface PotSceneProps {
  animT: number;
  highlight?: "top" | "bottom" | "both" | null;
  showLabels?: boolean;
  mini?: boolean;
  uid: string;
  highlightTarget?: string | null;
}

const PotScene: React.FC<PotSceneProps> = ({ animT, highlight = null, showLabels = false, mini = false, uid, highlightTarget }) => {
  const c = DS.c;
  const butterFrac = lerp(0, BUTTER_FRAC_FINAL, easeOutCubic(seg(animT, 0.42, 0.86)));
  const interfaceY = LIQUID_TOP + butterFrac * (INNER_BOTTOM - LIQUID_TOP);
  const churnActive = clamp01(1 - seg(animT, 0.78, 1));
  const spin = Math.sin(animT * Math.PI * 14) * 5 * churnActive;
  const ropeShift = Math.sin(animT * Math.PI * 14 + 1) * 3 * churnActive;
  const rotAngle = animT * Math.PI * 26 * (0.45 + 0.55 * churnActive);
  const headScaleX = churnActive > 0.02 ? Math.cos(rotAngle) : 1;
  const globules = useMemo(() => {
    const xs = [150, 168, 188, 205, 162, 198, 176], rs = [4, 5.5, 4.5, 6, 3.5, 5, 4];
    return xs.map((x, i) => ({ x, r: rs[i], phase: i / xs.length }));
  }, []);
  const sw = (n: number) => mini ? n * 0.85 : n;
  const pulseTop = highlightTarget === "top" || highlightTarget === "butterLayer";
  const pulseBot = highlightTarget === "bottom" || highlightTarget === "buttermilkLayer";

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision">
      <defs>
        <linearGradient id={`clay-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.clayLt} /><stop offset="55%" stopColor={c.clay} /><stop offset="100%" stopColor={c.clayDk} />
        </linearGradient>
        <radialGradient id={`clayInner-${uid}`} cx="0.5" cy="0.32" r="0.9">
          <stop offset="0%" stopColor="#5F2F12" /><stop offset="100%" stopColor={c.clayInner} />
        </radialGradient>
        <linearGradient id={`milk-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.milk} /><stop offset="100%" stopColor={c.milkShade} />
        </linearGradient>
        <linearGradient id={`butter-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.butterLt} /><stop offset="60%" stopColor={c.butter} /><stop offset="100%" stopColor={c.butterDk} />
        </linearGradient>
        <linearGradient id={`wood-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c.woodLt} /><stop offset="50%" stopColor={c.wood} /><stop offset="100%" stopColor={c.woodDk} />
        </linearGradient>
        <clipPath id={`cavity-${uid}`}>
          <path d="M108 118 Q96 150 96 196 Q96 258 134 286 Q180 304 226 286 Q264 258 264 196 Q264 150 252 118 Z" />
        </clipPath>
      </defs>
      <ellipse cx={CX} cy={312} rx={108} ry={16} fill="#000000" opacity={0.10} />
      <path d="M118 96 Q86 110 78 168 Q70 246 120 296 Q180 326 240 296 Q290 246 282 168 Q274 110 242 96 Z" fill={`url(#clay-${uid})`} stroke={c.clayDk} strokeWidth={sw(2)} />
      <ellipse cx={CX} cy={92} rx={66} ry={16} fill={c.clayLt} stroke={c.clayDk} strokeWidth={sw(2)} />
      <ellipse cx={CX} cy={92} rx={54} ry={11} fill={`url(#clayInner-${uid})`} />
      <path d="M108 118 Q96 150 96 196 Q96 258 134 286 Q180 304 226 286 Q264 258 264 196 Q264 150 252 118 Z" fill={`url(#clayInner-${uid})`} />
      <g clipPath={`url(#cavity-${uid})`}>
        <rect x={88} y={LIQUID_TOP} width={184} height={INNER_BOTTOM - LIQUID_TOP + 30} fill={`url(#milk-${uid})`} />
        {churnActive > 0.05 && [0,1,2].map((i) => (
          <ellipse key={i} cx={CX + Math.sin(animT * Math.PI * 12 + i * 2) * 18} cy={lerp(180, 250, i / 2)} rx={lerp(46, 22, i / 2)} ry={lerp(10, 6, i / 2)} fill="none" stroke="#FFFFFF" strokeOpacity={0.5 * churnActive} strokeWidth={sw(2)} />
        ))}
        {butterFrac > 0.01 && animT < 0.9 && globules.map((g, i) => {
          const p = clamp01(seg(animT, 0.42, 0.86) * 1.15 - g.phase * 0.25);
          const y = lerp(245, interfaceY + 6, easeInOutQuad(p));
          return <circle key={i} cx={g.x} cy={y} r={g.r} fill={c.butterLt} opacity={p > 0.04 && p < 0.97 ? 0.9 : 0} />;
        })}
        {butterFrac > 0.005 && <rect x={88} y={LIQUID_TOP} width={184} height={interfaceY - LIQUID_TOP} fill={`url(#butter-${uid})`} />}
        {butterFrac > 0.04 && (
          <path d={`M88 ${LIQUID_TOP+5} Q100 ${LIQUID_TOP-4} 112 ${LIQUID_TOP+4} Q124 ${LIQUID_TOP-5} 136 ${LIQUID_TOP+3} Q148 ${LIQUID_TOP-5} 160 ${LIQUID_TOP+4} Q172 ${LIQUID_TOP-5} 184 ${LIQUID_TOP+3} Q196 ${LIQUID_TOP-5} 208 ${LIQUID_TOP+4} Q220 ${LIQUID_TOP-5} 232 ${LIQUID_TOP+3} Q244 ${LIQUID_TOP-4} 256 ${LIQUID_TOP+4} Q268 ${LIQUID_TOP-3} 272 ${LIQUID_TOP+5} L272 ${LIQUID_TOP+13} L88 ${LIQUID_TOP+13} Z`} fill={c.butterLt} opacity={0.95} />
        )}
        {butterFrac > 0.06 && [{x:110,y:6,r:7},{x:132,y:9,r:6},{x:156,y:5,r:7.5},{x:180,y:9,r:6.5},{x:204,y:5,r:7},{x:228,y:9,r:6},{x:250,y:6,r:6.5}].map((b,i) => (
          <circle key={i} cx={b.x} cy={LIQUID_TOP+b.y} r={b.r} fill={c.butterLt} opacity={0.92} />
        ))}
        {butterFrac > 0.06 && [120,144,168,192,216,240].map((x,i) => (
          <circle key={`bb${i}`} cx={x} cy={LIQUID_TOP+6+(i%3)*4} r={2+(i%2)} fill="#FFFFFF" opacity={0.5} />
        ))}
        {butterFrac > 0.02 && <path d={`M92 ${interfaceY} Q136 ${interfaceY-4} 180 ${interfaceY} Q224 ${interfaceY+4} 268 ${interfaceY}`} fill="none" stroke={c.butterDk} strokeWidth={sw(1.5)} opacity={0.7} />}
        {(highlight === "top"  || pulseTop) && <rect x={88} y={LIQUID_TOP}  width={184} height={interfaceY - LIQUID_TOP}        fill={c.amber} opacity={0.28} />}
        {(highlight === "bottom" || pulseBot) && <rect x={88} y={interfaceY} width={184} height={INNER_BOTTOM - interfaceY + 30} fill={c.amber} opacity={0.28} />}
        {highlight === "both"  && <rect x={88} y={LIQUID_TOP}  width={184} height={INNER_BOTTOM - LIQUID_TOP + 30}              fill={c.amber} opacity={0.18} />}
      </g>
      <ellipse cx={CX} cy={LIQUID_TOP+1} rx={86} ry={7} fill="#FFFFFF" opacity={butterFrac > 0.02 ? 0.45 : 0.6} />
      <g transform={`rotate(${spin} ${CX} ${LIQUID_TOP+40})`}>
        <rect x={CX-5} y={36} width={10} height={222} rx={5} fill={`url(#wood-${uid})`} stroke={c.woodDk} strokeWidth={sw(1)} />
        {[0,1,2,3].map((i) => <ellipse key={i} cx={CX+(i%2===0?ropeShift:-ropeShift)} cy={64+i*10} rx={11} ry={4.5} fill="none" stroke={c.rope} strokeWidth={sw(3)} />)}
        <g transform={`translate(${CX} 250)`}>
          <g transform={`scale(${headScaleX} 1)`}><rect x={-30} y={-5} width={60} height={10} rx={4} fill={`url(#wood-${uid})`} stroke={c.woodDk} strokeWidth={sw(1)} /></g>
          <rect x={-5} y={-26} width={10} height={52} rx={4} fill={`url(#wood-${uid})`} stroke={c.woodDk} strokeWidth={sw(1)} />
          <circle cx={0} cy={0} r={7} fill={c.woodDk} />
        </g>
      </g>
      <path d="M108 118 Q96 150 96 196 Q96 258 134 286 Q180 304 226 286 Q264 258 264 196 Q264 150 252 118" fill="none" stroke={c.clayLt} strokeWidth={sw(6)} strokeLinecap="round" opacity={0.9} />
      <path d="M108 118 Q96 150 96 196 Q96 258 134 286 Q180 304 226 286 Q264 258 264 196 Q264 150 252 118" fill="none" stroke={c.clayDk} strokeWidth={sw(1.5)} opacity={0.5} />
      {showLabels && (
        <>
          <LabelPill uid={uid} x={300} y={LIQUID_TOP+(interfaceY-LIQUID_TOP)/2} text="Butter — lighter"     leaderTo={[266, LIQUID_TOP+(interfaceY-LIQUID_TOP)/2]} mini={mini} />
          <LabelPill uid={uid} x={300} y={(interfaceY+INNER_BOTTOM)/2}          text="Buttermilk — heavier" leaderTo={[266, (interfaceY+INNER_BOTTOM)/2]}          mini={mini} />
        </>
      )}
      {pulseTop && <rect x={90} y={LIQUID_TOP-2} width={180} height={interfaceY-LIQUID_TOP+4}    rx={6} fill="none" stroke={c.amber} strokeWidth={3} opacity={0.9} strokeDasharray="8 4" />}
      {pulseBot && <rect x={88} y={interfaceY+2}  width={184} height={INNER_BOTTOM-interfaceY+10} rx={6} fill="none" stroke={c.amber} strokeWidth={3} opacity={0.9} strokeDasharray="8 4" />}
    </svg>
  );
};

const LabelPill: React.FC<{ uid: string; x: number; y: number; text: string; leaderTo: [number,number]; mini?: boolean }> = ({ x, y, text, leaderTo, mini }) => {
  const fs = mini ? 11 : 12;
  const w = text.length * (fs * 0.56) + 16;
  return (
    <g>
      <line x1={leaderTo[0]} y1={leaderTo[1]} x2={x-w/2} y2={y} stroke={DS.c.g700} strokeWidth={1.2} />
      <rect x={x-w/2} y={y-11} width={w} height={22} rx={8} fill="#FFFFFF" stroke={DS.c.g200} strokeWidth={1} />
      <text x={x} y={y+4} textAnchor="middle" fontSize={fs} fontFamily="Poppins, sans-serif" fontWeight={600} fill={DS.c.g900}>{text}</text>
    </g>
  );
};

/* ─── Web Audio ──────────────────────────────────────────────────────────────── */
function useSoundEngine() {
  const muted = useRef(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctxRef.current;
  };
  const playCue = useCallback((kind: "tap"|"correct"|"wrong"|"done") => {
    if (muted.current) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      if (kind === "tap") {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.12);
        o.connect(gain); o.start(now); o.stop(now+0.12);
      } else if (kind === "correct") {
        [523,659,784].forEach((f,i) => {
          const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(f, now+i*0.1);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.16, now+i*0.1); g.gain.exponentialRampToValueAtTime(0.001, now+i*0.1+0.22);
          o.connect(g); g.connect(ctx.destination); o.start(now+i*0.1); o.stop(now+i*0.1+0.22);
        });
      } else if (kind === "wrong") {
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(200, now);
        o.frequency.exponentialRampToValueAtTime(140, now+0.15);
        gain.gain.setValueAtTime(0.14, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.2);
        o.connect(gain); o.start(now); o.stop(now+0.2);
      } else if (kind === "done") {
        [392,523,659,784,1047].forEach((f,i) => {
          const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f, now+i*0.09);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.18, now+i*0.09); g.gain.exponentialRampToValueAtTime(0.001, now+i*0.09+0.28);
          o.connect(g); g.connect(ctx.destination); o.start(now+i*0.09); o.stop(now+i*0.09+0.28);
        });
      }
    } catch {}
  }, []);
  return { muted, playCue };
}

/* ─── Confetti canvas ────────────────────────────────────────────────────────── */
const ConfettiCanvas: React.FC<{ active: boolean }> = ({ active }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const cv = ref.current;
    const ctx = cv.getContext("2d")!;
    const W = (cv.width = cv.clientWidth * 2), H = (cv.height = cv.clientHeight * 2);
    const cols = [DS.c.accent, DS.c.primary, DS.c.success, DS.c.accentDark, DS.c.primaryLight];
    const parts = Array.from({ length: 52 }, () => ({
      x: Math.random()*W, y: -Math.random()*H*0.4, vy: 2+Math.random()*4, vx: (Math.random()-0.5)*3,
      s: 6+Math.random()*8, col: cols[(Math.random()*cols.length)|0], rot: Math.random()*Math.PI, vr: (Math.random()-0.5)*0.3,
    }));
    const t0 = performance.now(); let raf = 0;
    const draw = (now: number) => {
      const life = (now-t0)/2000;
      ctx.clearRect(0,0,W,H);
      parts.forEach(p => { p.x+=p.vx*2; p.y+=p.vy*2; p.rot+=p.vr; ctx.save(); ctx.globalAlpha=Math.max(0,1-life); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.col; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6); ctx.restore(); });
      if (life < 1) raf = requestAnimationFrame(draw); else ctx.clearRect(0,0,W,H);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ctx.clearRect(0,0,W,H); };
  }, [active]);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:10 }} />;
};

/* ─── Mode toggle (plain HTML, no framer-motion) ─────────────────────────────── */
const ModeToggle: React.FC<{ mode: OperatorMode; onChange: (m: OperatorMode) => void }> = ({ mode, onChange }) => (
  <div style={{ display:"flex", background:"rgba(255,255,255,0.15)", borderRadius:DS.r.pill, padding:3, gap:3 }}>
    {(["ai","student"] as OperatorMode[]).map(m => {
      const active = mode === m;
      return (
        <button key={m} onClick={() => onChange(m)} className="cbl-btn"
          style={{ borderRadius:DS.r.pill, padding:"7px 14px", cursor:"pointer", fontFamily:"Poppins,sans-serif", fontWeight:600, fontSize:13, minHeight:34, minWidth:80,
            background: active ? "rgba(255,255,255,0.9)" : "transparent",
            color: active ? DS.c.primaryDark : "rgba(255,255,255,0.85)",
            boxShadow: active ? "0 2px 8px rgba(0,0,0,.18)" : "none",
            border: "none", transition:"all .2s ease" }}>
          {m === "ai" ? "👩‍🏫 Teacher" : "🙋 Student"}
        </button>
      );
    })}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
function ChurningButterLabeller(props: ToolProps) {
  const { isMobile, isLandscape } = useResponsive();
  const uid = useRef(Math.random().toString(36).slice(2,8)).current;
  const { muted, playCue } = useSoundEngine();
  const [muteUI, setMuteUI] = useState(false);

  /* ── mode & depth ── */
  const [mode, setMode] = useState<OperatorMode>(props.operatorMode ?? "student");
  const depth = mode === "ai" ? "lean" : "full";
  const CHECKPOINTS = depth === "lean" ? LEAN_CHECKPOINTS : ALL_CHECKPOINTS;
  const total = CHECKPOINTS.length;

  /* ── phase / stage ── */
  const [phase, setPhase] = useState<Phase>("play");
  const [stage, setStage] = useState<PlayStage>("intro");
  const [cpIdx, setCpIdx] = useState(0);

  /* ── animation ── */
  const [isPlaying, setIsPlaying] = useState(false);
  const [animT, setAnimT] = useState(0);
  const [animComplete, setAnimComplete] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  const ANIM_MS = 5200;

  /* ── labelling ── */
  const [activeRegion, setActiveRegion] = useState<"top"|"bottom"|null>(null);
  const [chipsOpen, setChipsOpen] = useState(false);
  const [lockedTags, setLockedTags] = useState<{top?:TagValue; bottom?:TagValue}>({});
  const [hint, setHint] = useState<string|null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [justLocked, setJustLocked] = useState<string|null>(null);

  /* ── prediction ── */
  const [predictPick, setPredictPick] = useState<number|null>(null);
  const [predictDone, setPredictDone] = useState(false);

  /* ── scoring ── */
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const recordedRef = useRef<Set<string>>(new Set());

  /* ── interaction tracking (for the finished-event summary) ── */
  const sessionStartRef = useRef<number>(typeof performance !== "undefined" ? performance.now() : 0);
  const attemptsRef = useRef(0);
  const hintsUsedRef = useRef(0);
  const exploredRef = useRef<Set<string>>(new Set());

  /* ── result / review ── */
  const [reviewIdx, setReviewIdx] = useState(0);
  const [scoreShown, setScoreShown] = useState(0);
  const [confettiActive, setConfettiActive] = useState(false);

  /* ── highlight target ── */
  const [highlightTarget, setHighlightTarget] = useState<string|null>(null);

  /* ─── state ref (always fresh for agent) ─── */
  const stateRef = useRef({ phase, stage, cpIdx, animT, animComplete, lockedTags, answers, mode, depth });
  useEffect(() => { stateRef.current = { phase, stage, cpIdx, animT, animComplete, lockedTags, answers, mode, depth }; });

  /* ─── CSS injection ─── */
  useEffect(() => {
    const id = "cbl-style-" + uid;
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
@keyframes cbl-fadeUp   { from{opacity:0;transform:translateY(12px);}  to{opacity:1;transform:none;} }
@keyframes cbl-fadeIn   { from{opacity:0;}                              to{opacity:1;} }
@keyframes cbl-popIn    { 0%{transform:scale(.7);opacity:0;} 60%{transform:scale(1.08);} 100%{transform:scale(1);opacity:1;} }
@keyframes cbl-slideUp  { from{opacity:0;transform:translateY(24px);}   to{opacity:1;transform:none;} }
@keyframes cbl-blink    { 0%,100%{box-shadow:0 0 0 3px rgba(255,114,18,.25);border-color:${DS.c.accent};} 50%{box-shadow:0 0 0 8px rgba(255,114,18,.05);border-color:${DS.c.accentDark};} }
@keyframes cbl-shake    { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-7px);} 40%{transform:translateX(7px);} 60%{transform:translateX(-5px);} 80%{transform:translateX(5px);} }
@keyframes cbl-pulse    { 0%,100%{opacity:.6;transform:scale(1);} 50%{opacity:1;transform:scale(1.04);} }
@keyframes cbl-starPop  { 0%{transform:scale(0);opacity:0;} 70%{transform:scale(1.15);} 100%{transform:scale(1);opacity:1;} }
@keyframes cbl-hlRing   { 0%,100%{opacity:.55;transform:scale(1);} 50%{opacity:1;transform:scale(1.03);} }
@keyframes cbl-fadeOutDelay { 0%,58%{opacity:1;transform:scale(1);} 100%{opacity:0;transform:scale(1.06);} }
.cbl-root *{box-sizing:border-box;}
.cbl-btn{font-family:Poppins,sans-serif;cursor:pointer;border:none;transition:transform .12s ease,box-shadow .15s ease,background .15s ease,opacity .15s ease;}
.cbl-btn:hover:not(:disabled){transform:scale(1.04);}
.cbl-btn:active:not(:disabled){transform:scale(.96);}
.cbl-btn:disabled{cursor:not-allowed;opacity:.55;}
.cbl-fadeUp{animation:cbl-fadeUp .32s ease both;}
.cbl-fadeIn{animation:cbl-fadeIn .25s ease both;}
.cbl-popIn{animation:cbl-popIn .4s ease both;}
.cbl-slideUp{animation:cbl-slideUp .3s ease both;}
`;
    document.head.appendChild(el);
    return () => { const e=document.getElementById(id); if(e) e.remove(); };
  }, [uid]);

  /* ─── animation loop ─── */
  const cancelFrame = () => { if (frameRef.current!==null){cancelAnimationFrame(frameRef.current);frameRef.current=null;} };
  const tick = useCallback((now: number) => {
    const elapsed = now - startRef.current + elapsedRef.current;
    const t = Math.min(elapsed/ANIM_MS, 1);
    setAnimT(t);
    if (t < 1) { frameRef.current = requestAnimationFrame(tick); }
    else { setAnimComplete(true); setIsPlaying(false); frameRef.current = null; }
  }, []);

  /* ─── mode switch ─── */
  const applyMode = useCallback((m: OperatorMode) => {
    setMode(m);
    if (m === "ai") {
      cancelFrame(); setPhase("play"); setStage("intro"); setCpIdx(0);
      setAnimT(0); setAnimComplete(false); setIsPlaying(false); elapsedRef.current = 0;
      setActiveRegion(null); setChipsOpen(false); setLockedTags({}); setHint(null);
      setJustLocked(null); setPredictPick(null); setPredictDone(false);
      setAnswers([]); recordedRef.current = new Set(); setReviewIdx(0); setScoreShown(0);
      setHighlightTarget(null);
      attemptsRef.current = 0; hintsUsedRef.current = 0; exploredRef.current = new Set();
      sessionStartRef.current = performance.now();
    }
    emit({ type:"event", name:"operator_mode_changed", detail:{ mode:m, depth: m==="ai"?"lean":"full" }});
  }, []);

  useEffect(() => { if (props.operatorMode && props.operatorMode !== mode) applyMode(props.operatorMode); }, [props.operatorMode]);

  /* ─── play / replay ─── */
  const handlePlay = () => {
    if (animComplete) return;
    cancelFrame(); setStage("churning"); startRef.current = performance.now(); setIsPlaying(true);
    frameRef.current = requestAnimationFrame(tick);
  };
  const handleReplay = () => {
    cancelFrame(); setAnimT(0); setAnimComplete(false); elapsedRef.current = 0;
    startRef.current = performance.now(); setStage("churning"); setIsPlaying(true);
    frameRef.current = requestAnimationFrame(tick);
  };
  const startLabelling = () => { cancelFrame(); setStage("checkpoint"); setCpIdx(0); };
  useEffect(() => () => cancelFrame(), []);

  /* ─── lean auto-advance ─── */
  const leanAutoRef = useRef(false);
  useEffect(() => {
    if (mode==="ai" && animComplete && stage==="churning" && !leanAutoRef.current) {
      leanAutoRef.current = true;
      setTimeout(() => startLabelling(), 1200);
    }
    if (stage !== "churning") leanAutoRef.current = false;
  }, [mode, animComplete, stage]);

  /* ─── scoring ─── */
  const score = answers.filter(a => a.correct).length;
  const stars = Math.round((score / total) * 5);
  const wrong = CHECKPOINTS.filter(cp => { const a = answers.find(x => x.cpId===cp.id); return a && !a.correct; });
  const currentCp = CHECKPOINTS[cpIdx];
  const blinkRegion: "top"|"bottom"|null =
    stage==="checkpoint" && currentCp?.kind==="tag" && !chipsOpen && !lockedTags[currentCp.region!]
      ? currentCp.region! : null;

  const recordAnswer = (cpId: string, firstPick: string, correct: boolean) => {
    if (recordedRef.current.has(cpId)) return;
    recordedRef.current.add(cpId);
    setAnswers(a => [...a, { cpId, firstPick, correct }]);
  };

  /* ─── prediction ─── */
  const handlePredict = (idx: number) => {
    if (predictDone) return;
    setPredictPick(idx);
    const correct = idx === currentCp.correctIdx;
    attemptsRef.current += 1;
    exploredRef.current.add(currentCp.id);
    recordAnswer(currentCp.id, currentCp.options![idx], correct);
    setPredictDone(true);
    if (!correct) { setHint(HINT_LINE); hintsUsedRef.current += 1; playCue("wrong"); } else { setHint(null); playCue("correct"); }
    emit({ type:"event", name:"answer_checked", detail:{ checkpointId:"predict", correct, pick:currentCp.options![idx] }});
  };
  const handlePredictContinue = () => { setPredictDone(false); setPredictPick(null); setHint(null); setCpIdx(i => i+1); };

  /* ─── tagging ─── */
  const handleRegionTap = (region: "top"|"bottom") => {
    if (stage!=="checkpoint" || currentCp.kind!=="tag") return;
    if (region !== currentCp.region || lockedTags[region]) return;
    exploredRef.current.add(region);
    playCue("tap"); setChipsOpen(true); setActiveRegion(region);
    emit({ type:"event", name:"item_tapped", detail:{ region }});
  };
  const handleTagPick = (tag: TagValue) => {
    if (!activeRegion || !currentCp.correctTag) return;
    const correct = tag === currentCp.correctTag;
    attemptsRef.current += 1;
    exploredRef.current.add(currentCp.id);
    recordAnswer(currentCp.id, TAG_LABEL[tag], correct);
    if (correct) {
      setLockedTags(p => ({...p, [activeRegion]:tag})); setChipsOpen(false); setHint(null);
      setJustLocked(currentCp.id); setActiveRegion(null); playCue("correct");
      emit({ type:"event", name:"answer_correct", detail:{ region:activeRegion, tag }});
    } else {
      setHint(HINT_LINE); setShakeKey(k => k+1); hintsUsedRef.current += 1; playCue("wrong");
      emit({ type:"event", name:"answer_incorrect", detail:{ region:activeRegion, tag }});
    }
  };
  const handleTagContinue = () => {
    setJustLocked(null); setHint(null);
    if (cpIdx >= total-1) goToResult(); else setCpIdx(i => i+1);
  };

  const goToResult = () => {
    cancelFrame(); setPhase("result"); playCue("done");
    emit({ type:"event", name:"completed", detail:{ score, total }});
  };

  /* ─── result count-up ─── */
  useEffect(() => {
    if (phase !== "result") return;
    let raf = 0; const t0 = performance.now();
    const run = (now: number) => {
      const p = Math.min((now-t0)/1200, 1);
      const e = 1 + 2.7*Math.pow(p-1,3) + 1.7*Math.pow(p-1,2);
      setScoreShown(Math.round(clamp01(e)*score));
      if (p < 1) raf = requestAnimationFrame(run); else setScoreShown(score);
    };
    raf = requestAnimationFrame(run);
    setConfettiActive(true); setTimeout(() => setConfettiActive(false), 2200);
    return () => cancelAnimationFrame(raf);
  }, [phase, score]);

  /* ─── play again ─── */
  const handlePlayAgain = () => {
    cancelFrame(); setPhase("play"); setStage("intro"); setCpIdx(0);
    setAnimT(0); setAnimComplete(false); setIsPlaying(false); elapsedRef.current = 0;
    setActiveRegion(null); setChipsOpen(false); setLockedTags({}); setHint(null);
    setJustLocked(null); setPredictPick(null); setPredictDone(false);
    setAnswers([]); recordedRef.current = new Set(); setReviewIdx(0); setScoreShown(0);
    setHighlightTarget(null);
    attemptsRef.current = 0; hintsUsedRef.current = 0; exploredRef.current = new Set();
    sessionStartRef.current = performance.now();
    emit({ type:"event", name:"reset", detail:{} });
  };

  /* ─── Finish (student mode only) — uniform `finished` event, §6.3 ─── */
  const handleFinish = () => {
    if (phase === "finished") return;
    const breakdown = CHECKPOINTS.map(cp => {
      const a = answers.find(x => x.cpId === cp.id);
      return { id: cp.id, correct: !!a?.correct, chose: a?.firstPick ?? null };
    });
    const durationMs = Math.round(performance.now() - sessionStartRef.current);
    cancelFrame();
    setPhase("finished");
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 2600);
    playCue("done");
    emit({ type:"event", name:"finished", detail:{
      evaluated: true,
      score, total, stars,
      breakdown,
      interactions: {
        attempts: attemptsRef.current,
        correctFirstTry: score,
        hintsUsed: hintsUsedRef.current,
        itemsExplored: Array.from(exploredRef.current),
        durationMs,
      },
      learned: LEARNED_POINTS,
    }});
  };

  /* ─── agent API ─── */
  const doHighlight = useCallback((target: string) => {
    setHighlightTarget(target);
    setTimeout(() => setHighlightTarget(t => t===target ? null : t), 3500);
    emit({ type:"event", name:"highlighted", detail:{ target }});
  }, []);
  const doTap = useCallback((regionId: string) => {
    const region = regionId as "top"|"bottom";
    const cur = stateRef.current;
    if (cur.stage !== "checkpoint") return;
    const cp = (cur.depth==="lean" ? LEAN_CHECKPOINTS : ALL_CHECKPOINTS)[cur.cpIdx];
    if (!cp || cp.kind!=="tag" || cp.region!==region || (cur.lockedTags as any)[region]) return;
    setChipsOpen(true); setActiveRegion(region);
    emit({ type:"event", name:"item_tapped", detail:{ region, source:"agent" }});
  }, []);
  const doChoose = useCallback((optionId: string) => {
    const cur = stateRef.current;
    const cp = (cur.depth==="lean" ? LEAN_CHECKPOINTS : ALL_CHECKPOINTS)[cur.cpIdx];
    if (!cp || cp.kind!=="predict") return;
    handlePredict(optionId==="lighter" || optionId==="Lighter than the rest" ? 0 : 1);
  }, []);
  const doPickTag = useCallback((tag: string) => { handleTagPick(tag as TagValue); }, []);
  const getState = useCallback(() => {
    const cur = stateRef.current;
    const st = { toolId:TOOL_ID, operatorMode:cur.mode, depth:cur.depth, phase:cur.phase, stage:cur.stage, cpIdx:cur.cpIdx, animProgress:cur.animT, animComplete:cur.animComplete, lockedTags:cur.lockedTags, score:cur.answers.filter((a:any)=>a.correct).length, total:cur.depth==="lean"?1:3 };
    emit({ type:"state", state:st }); return st;
  }, []);
  const doReset = useCallback(() => handlePlayAgain(), []);

  const api = useMemo(() => ({
    setParam: (n:string, v:any) => { if(n==="muted"){muted.current=!!v;setMuteUI(!!v);} else if(n==="operatorMode") applyMode(v); },
    play: () => handlePlay(),
    pause: () => { cancelFrame(); setIsPlaying(false); if(animT<1) elapsedRef.current+=(performance.now()-startRef.current); },
    reset: doReset, highlight: doHighlight, getState, setOperatorMode: applyMode,
    tap: doTap, choose: doChoose, pickTag: doPickTag,
    startLabelling: () => startLabelling(),
    checkAnswers: () => { if(phase==="play"&&stage==="checkpoint"&&cpIdx>=total-1) goToResult(); },
  }), [applyMode, doHighlight, doTap, doChoose, doPickTag, getState, doReset, phase, stage, cpIdx, total, animT]);
  const apiRef = useRef(api); apiRef.current = api;

  /* ─── postMessage listener + ready ─── */
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== "command") return;
      try {
        const fn = (apiRef.current as any)[d.method];
        let result; if (typeof fn === "function") result = fn(...(d.args || []));
        emit({ type:"response", id:d.id, result });
      } catch { emit({ type:"response", id:(e.data as any)?.id, result:null }); }
    };
    window.addEventListener("message", onMsg);
    emit({ type:"ready", toolId:TOOL_ID });
    return () => window.removeEventListener("message", onMsg);
  }, []);

  /* ─── style helpers ─── */
  const isSmartboard = props.device === "smartboard";
  const minH = isSmartboard ? 54 : 48;

  const pillBtn = (bg: string, fg = "#fff"): React.CSSProperties => ({
    background: bg, color: fg, borderRadius: DS.r.pill,
    padding: isMobile ? "12px 22px" : "13px 30px", fontWeight: 700, fontSize: isMobile ? 14 : 15,
    boxShadow: "0 6px 18px rgba(74,77,201,.20)", minHeight: minH,
    display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center", border: "none",
  });
  const outlineBtn = (col: string): React.CSSProperties => ({
    background: "#fff", color: col, border: `2px solid ${col}`, borderRadius: DS.r.pill,
    padding: isMobile ? "11px 20px" : "12px 28px", fontWeight: 600, fontSize: isMobile ? 14 : 15,
    minHeight: minH, display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center",
  });

  const instruction = (() => {
    if (phase !== "play") return "";
    if (stage === "intro") return "Watch the churning, then tag each layer of the pot.";
    if (stage === "churning") return animComplete ? "The butter has separated. Ready to tag the layers?" : "Churning the curd…";
    if (currentCp?.kind === "predict") return currentCp.prompt;
    return currentCp?.prompt ?? "";
  })();

  const showToggle = props.showModeToggle !== false;

  /* ════════════════════════════ RENDER ════════════════════════════ */
  return (
    <div className="cbl-root" style={{ fontFamily:"Poppins, sans-serif", background:DS.c.g100, minHeight:"100dvh", width:"100%", color:DS.c.g900, display:"flex", justifyContent:"center", alignItems:"flex-start", padding:isMobile?8:16 }}>
      <div style={{ width:"100%", maxWidth: isLandscape ? "none" : 920, display:"flex", flexDirection:"column", gap:12 }}>

        {/* ── Header ── */}
        <div className="cbl-fadeUp"
          style={{ background:DS.grad.header, borderRadius:DS.r.xl, padding:isMobile?"14px 16px":"18px 24px", color:"#fff", boxShadow:"0 10px 26px rgba(83,48,134,.28)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:isMobile?18:22, fontWeight:800, lineHeight:1.15 }}>Churned Curd: Which Layer Is Which?</div>
            <div style={{ fontSize:isMobile?13:14, fontWeight:500, opacity:0.92, marginTop:4 }}>
              {mode==="ai" ? "👩‍🏫 Your teacher is demonstrating — watch closely." : "Tag the top and bottom layers. Floating things are usually lighter."}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <button className="cbl-btn" onClick={() => { muted.current = !muted.current; setMuteUI(v => !v); }}
              style={{ background:"rgba(255,255,255,0.18)", border:"none", borderRadius:DS.r.pill, padding:"8px 12px", cursor:"pointer", color:"#fff", display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:600, minHeight:36 }}>
              {muteUI ? <VolumeX size={15}/> : <Volume2 size={15}/>}
            </button>
            {showToggle && <ModeToggle mode={mode} onChange={applyMode} />}
          </div>
        </div>

        {/* ── Two-pane layout ── */}
        <div style={{ display:"flex", flexDirection: isLandscape?"row":"column", gap:12, alignItems:"flex-start" }}>

          {/* ══ POT CARD ══ */}
          <div className="cbl-fadeUp"
            style={{ flex: isLandscape?"1 1 50%":"none", background:"#fff", borderRadius:DS.r.xl, padding:isMobile?10:16, boxShadow:"0 4px 18px rgba(0,0,0,.07)", position:"relative", minWidth:0,
              ...(highlightTarget==="pot"||highlightTarget==="churner" ? { animation:"cbl-hlRing 1.1s ease-in-out infinite", outline:`3px solid ${DS.c.amber}` } : {}) }}>

            {/* instruction strip */}
            {phase==="play" && (
              <div key={instruction} className="cbl-fadeIn"
                style={{ background:DS.c.primaryGhost, borderRadius:DS.r.md, padding:isMobile?"10px 12px":"12px 16px", fontSize:isMobile?14:15, fontWeight:500, color:DS.c.g900, borderLeft:`4px solid ${DS.c.primary}`, marginBottom:12 }}>
                {instruction}
              </div>
            )}

            {/* SVG */}
            <div style={{ position:"relative", width:"100%", maxWidth: isLandscape?480:460, margin:"0 auto", aspectRatio:`${VB_W}/${VB_H}`, background:"radial-gradient(120% 90% at 50% 25%, #FFFFFF 0%, #FAFAFA 100%)", borderRadius:DS.r.lg, overflow:"hidden" }}>
              <PotScene animT={stage==="intro" ? 0 : animT} uid={uid} highlightTarget={highlightTarget} />

              {/* tap overlays */}
              {(["top","bottom"] as const).map(region => {
                const r = REGION_PCT[region];
                const isBlink = blinkRegion===region || highlightTarget===region || highlightTarget===(region==="top"?"butterLayer":"buttermilkLayer");
                const isLocked = !!lockedTags[region];
                const tappable = mode==="student" && stage==="checkpoint" && currentCp?.kind==="tag" && currentCp.region===region && !isLocked;
                return (
                  <div key={region} onClick={() => tappable && handleRegionTap(region)}
                    style={{ position:"absolute", left:`${r.left}%`, top:`${r.top}%`, width:`${r.width}%`, height:`${r.height}%`, borderRadius:10,
                      border: isBlink ? `2px dashed ${DS.c.accent}` : isLocked ? `2px solid ${DS.c.success}` : "2px solid transparent",
                      animation: isBlink ? "cbl-blink 1.1s ease-in-out infinite" : "none",
                      cursor: tappable ? "pointer" : "default",
                      background: isLocked ? "rgba(46,204,113,.10)" : "transparent",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      transition:"background .2s ease" }}>
                    {isLocked && (
                      <span className="cbl-popIn"
                        style={{ background:"#fff", color:DS.c.successDk, fontSize:isMobile?11:12.5, fontWeight:700, padding:"3px 9px", borderRadius:DS.r.pill, border:`1px solid ${DS.c.success}`, boxShadow:"0 2px 6px rgba(0,0,0,.08)", whiteSpace:"nowrap" }}>
                        {TAG_LABEL[lockedTags[region]!]}
                      </span>
                    )}
                    {isBlink && !isLocked && (
                      <span style={{ background:DS.c.accent, color:"#fff", fontSize:isMobile?11:12, fontWeight:700, padding:"3px 9px", borderRadius:DS.r.pill, whiteSpace:"nowrap", animation:"cbl-pulse 1.1s ease-in-out infinite" }}>
                        Tap to tag
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* progress dots */}
            {stage==="checkpoint" && (
              <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:10 }}>
                {CHECKPOINTS.map((_,i) => (
                  <div key={i} style={{ height:8, borderRadius:4, transition:"all .25s ease",
                    width: i===cpIdx ? 22 : 8,
                    background: i<cpIdx ? DS.c.success : i===cpIdx ? DS.c.accent : DS.c.g200 }} />
                ))}
              </div>
            )}

            {/* ── Action bar: Play / Replay / Start tagging ── */}
            {phase==="play" && (stage==="intro" || stage==="churning") && (
              <div className="cbl-fadeUp"
                style={{ marginTop:16, display:"flex", gap:10, justifyContent:"center", alignItems:"center", flexWrap:"wrap",
                  background:"linear-gradient(135deg,rgba(83,48,134,.05) 0%,rgba(255,114,18,.05) 100%)",
                  borderRadius:DS.r.lg, padding:"16px 18px", border:"1px solid rgba(74,77,201,.10)",
                  boxShadow:"inset 0 1px 0 rgba(255,255,255,.7)" }}>

                {!animComplete && (
                  <button className="cbl-btn" onClick={handlePlay} disabled={isPlaying}
                    style={{ background: isPlaying ? "linear-gradient(135deg,#FC9145,#FF7212)" : "linear-gradient(135deg,#FF8C2A,#E85500)",
                      color:"#fff", borderRadius:DS.r.pill, padding: isMobile?"14px 32px":"15px 44px",
                      fontWeight:700, fontSize:isMobile?15:16,
                      boxShadow: isPlaying ? "0 4px 12px rgba(255,114,18,.25)" : "0 8px 24px rgba(255,98,0,.42), inset 0 1px 0 rgba(255,255,255,.18)",
                      minHeight:54, display:"inline-flex", alignItems:"center", gap:12,
                      justifyContent:"center", letterSpacing:.3, border:"none" }}>
                    <span style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,.20)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Play size={16} fill="#fff" style={{display:"block", marginLeft:2}}/>
                    </span>
                    {isPlaying ? "Churning…" : "Play Animation"}
                  </button>
                )}

                {animComplete && (
                  <>
                    <button className="cbl-btn" onClick={handleReplay}
                      style={{ background:"#fff", color:DS.c.primaryDark, border:`2px solid ${DS.c.primaryLight}`, borderRadius:DS.r.pill,
                        padding: isMobile?"12px 22px":"12px 28px", fontWeight:600, fontSize:isMobile?14:15, minHeight:50,
                        display:"inline-flex", alignItems:"center", gap:8, boxShadow:"0 3px 12px rgba(74,77,201,.14)" }}>
                      <RotateCcw size={16}/> Replay
                    </button>
                    {mode==="student" && (
                      <button className="cbl-btn" onClick={startLabelling}
                        style={{ background:"linear-gradient(135deg,#FF8C2A,#E85500)", color:"#fff", borderRadius:DS.r.pill,
                          padding: isMobile?"12px 26px":"13px 32px", fontWeight:700, fontSize:isMobile?14:15,
                          boxShadow:"0 6px 20px rgba(255,98,0,.38), inset 0 1px 0 rgba(255,255,255,.18)",
                          minHeight:50, display:"inline-flex", alignItems:"center", gap:8, border:"none" }}>
                        Start tagging <ChevronRight size={17}/>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Teacher watch caption */}
            {mode==="ai" && phase==="play" && (
              <div className="cbl-fadeIn"
                style={{ marginTop:8, background:DS.c.accentLight, border:`1px solid ${DS.c.accentDark}`, borderRadius:DS.r.md, padding:"10px 14px", fontSize:isMobile?13:14, fontWeight:500, color:DS.c.g900, textAlign:"center" }}>
                👩‍🏫 Watch carefully — your teacher is showing you this.
              </div>
            )}
          </div>

          {/* ══ CONTROLS COLUMN ══ */}
          <div style={{ flex: isLandscape?"1 1 46%":"none", display:"flex", flexDirection:"column", gap:10, minWidth:0, width: isLandscape?"auto":"100%" }}>

            {/* ── PLAY PHASE ── */}
            {phase==="play" && (
              <>
                {/* PREDICT card */}
                {stage==="checkpoint" && currentCp?.kind==="predict" && mode==="student" && (
                  <div className="cbl-slideUp" style={{ background:"#fff", borderRadius:DS.r.lg, padding:isMobile?14:20, boxShadow:"0 4px 16px rgba(0,0,0,.06)" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:DS.c.primary, letterSpacing:.4, textTransform:"uppercase", marginBottom:8 }}>Predict</div>
                    <div style={{ fontSize:isMobile?14:15, fontWeight:500, lineHeight:1.55, color:DS.c.g900, background:DS.c.primaryGhost, border:`1px solid ${DS.c.primaryLight}`, borderLeft:`4px solid ${DS.c.primary}`, borderRadius:DS.r.md, padding:"12px 14px", marginBottom:12 }}>
                      {currentCp.prompt}
                    </div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      {currentCp.options!.map((opt,i) => {
                        const picked = predictPick===i, showState = predictDone, isCorrect = i===currentCp.correctIdx!;
                        let bg="#fff", bd=DS.c.g200, col=DS.c.g900;
                        if (showState&&picked&&!isCorrect) { bg="#FDECEC"; bd=DS.c.danger; col=DS.c.danger; }
                        if (showState&&isCorrect) { bg="#EAF9F0"; bd=DS.c.success; col=DS.c.successDk; }
                        return (
                          <button key={i} className="cbl-btn" disabled={predictDone} onClick={() => handlePredict(i)}
                            style={{ flex:"1 1 160px", background:bg, border:`1.6px solid ${bd}`, color:col, borderRadius:DS.r.md, padding:"12px 14px", fontSize:isMobile?14:15, fontWeight:600, minHeight:52, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                            {showState&&isCorrect && <Check size={16}/>}
                            {showState&&picked&&!isCorrect && <X size={16}/>}
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {predictDone && (
                      <>
                        <div className="cbl-fadeUp"
                          style={{ marginTop:12, background:predictPick===currentCp.correctIdx?"#EAF9F0":DS.c.accentLight, border:`1px solid ${predictPick===currentCp.correctIdx?DS.c.success:DS.c.accentDark}`, borderRadius:DS.r.md, padding:"10px 14px", fontSize:isMobile?13:14, lineHeight:1.55, display:"flex", gap:8, alignItems:"flex-start" }}>
                          {predictPick===currentCp.correctIdx
                            ? <Check size={16} color={DS.c.successDk} style={{flexShrink:0,marginTop:1}}/>
                            : <Lightbulb size={16} color={DS.c.accentDark} style={{flexShrink:0,marginTop:1}}/>}
                          <span>{currentCp.lockReason}</span>
                        </div>
                        <div style={{ marginTop:12, display:"flex", justifyContent:"flex-end" }}>
                          <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={handlePredictContinue}>
                            Tag the layers <ChevronRight size={16}/>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Hint bar */}
                {hint && stage==="checkpoint" && currentCp?.kind==="tag" && (
                  <div key={`hint-${shakeKey}`} className="cbl-fadeIn"
                    style={{ background:DS.c.accentLight, border:`1px solid ${DS.c.accentDark}`, borderRadius:DS.r.md, padding:"10px 14px", fontSize:isMobile?13:14, display:"flex", gap:8, alignItems:"flex-start", animation:"cbl-shake .4s ease" }}>
                    <Lightbulb size={16} color={DS.c.accentDark} style={{flexShrink:0,marginTop:1}}/>
                    <span>{hint} Try again.</span>
                  </div>
                )}

                {/* Tag chips */}
                {chipsOpen && mode==="student" && (
                  <div className="cbl-slideUp" style={{ background:"#fff", borderRadius:DS.r.lg, padding:isMobile?14:18, boxShadow:"0 6px 20px rgba(0,0,0,.10)" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:DS.c.g700, marginBottom:10 }}>Pick a tag for the <strong>{activeRegion}</strong> layer:</div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      {(["lighter","heavier"] as TagValue[]).map(tag => (
                        <button key={tag} className="cbl-btn" onClick={() => handleTagPick(tag)}
                          style={{ flex:"1 1 130px", background:DS.c.primaryGhost, color:DS.c.primaryDark, border:`1.5px solid ${DS.c.primaryLight}`, borderRadius:DS.r.md, padding:"13px 16px", fontSize:isMobile?14:15, fontWeight:700, minHeight:50 }}>
                          {TAG_LABEL[tag]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Locked-in reason */}
                {stage==="checkpoint" && currentCp?.kind==="tag" && justLocked===currentCp.id && (
                  <div className="cbl-slideUp" style={{ background:"#fff", borderRadius:DS.r.lg, padding:isMobile?14:18, boxShadow:"0 4px 16px rgba(0,0,0,.06)" }}>
                    <div style={{ background:"#EAF9F0", border:`1px solid ${DS.c.success}`, borderRadius:DS.r.md, padding:"10px 14px", fontSize:isMobile?13:14, color:DS.c.g900, display:"flex", gap:8, alignItems:"flex-start" }}>
                      <Check size={16} color={DS.c.successDk} style={{flexShrink:0,marginTop:1}}/>
                      <span><strong>Locked in.</strong> {currentCp.lockReason}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
                      <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={handleTagContinue}>
                        {cpIdx>=total-1 ? "See result" : "Next layer"} <ChevronRight size={16}/>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── RESULT PHASE ── */}
            {phase==="result" && (
              <div className="cbl-popIn"
                style={{ position:"relative", background:"#fff", borderRadius:DS.r.xl, padding:isMobile?20:28, textAlign:"center", boxShadow:"0 10px 30px rgba(0,0,0,.10)", overflow:"hidden" }}>
                <ConfettiCanvas active={confettiActive} />
                <div style={{ position:"relative", zIndex:2 }}>
                  <div className="cbl-popIn"
                    style={{ width:60, height:60, borderRadius:DS.r.pill, background:DS.grad.result, display:"inline-flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 22px rgba(255,114,18,.35)" }}>
                    <Award size={30} color="#fff"/>
                  </div>
                  <div style={{ fontSize:isMobile?20:24, fontWeight:800, marginTop:12 }}>
                    {score===total ? "Brilliant!" : score>=2 ? "Nicely done!" : "Good start!"}
                  </div>
                  <div className="cbl-fadeIn" style={{ fontSize:isMobile?44:52, fontWeight:800, color:DS.c.primary, fontVariantNumeric:"tabular-nums", lineHeight:1.1, marginTop:4 }}>
                    {scoreShown} / {total}
                  </div>
                  <div style={{ display:"flex", gap:5, justifyContent:"center", marginTop:8 }}>
                    {[0,1,2,3,4].map(i => (
                      <div key={i} style={{ animation:`cbl-starPop .4s ease ${.35+i*.1}s both`, display:"inline-block" }}>
                        <Star size={isMobile?24:28} fill={i<stars?DS.c.amber:"none"} color={i<stars?DS.c.amber:DS.c.g400}/>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:isMobile?14:15, fontWeight:500, color:DS.c.g700, marginTop:12, maxWidth:400, margin:"12px auto 0" }}>
                    {score===total ? "You've locked this concept down — lighter floats, heavier settles." : score>=2 ? "Strong work. Review the one you'd like to polish." : "Let's walk through why butter floats and buttermilk sinks."}
                  </div>
                  {mode === "student" ? (
                    <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:20, flexWrap:"wrap" }}>
                      <button className="cbl-btn" style={outlineBtn(DS.c.primary)} onClick={() => { setReviewIdx(0); setPhase("review"); }}>
                        Review answers
                      </button>
                      <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={handleFinish}>
                        Finish <Check size={16}/>
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop:18, fontSize:13, fontWeight:500, color:DS.c.g700 }}>
                      👩‍🏫 Demo complete — call reset() to run it again for the next student.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── REVIEW PHASE ── */}
            {phase==="review" && (
              <div className="cbl-fadeUp" style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ background:"#fff", borderRadius:DS.r.lg, padding:"12px 16px", fontSize:isMobile?13:14, fontWeight:500, boxShadow:"0 2px 10px rgba(0,0,0,.04)", display:"flex", alignItems:"center", gap:8 }}>
                  <Check size={16} color={DS.c.successDk}/>
                  You got <strong style={{margin:"0 4px"}}>{score}</strong> of {total} right.
                  {wrong.length===0 ? " Here's the full picture anyway." : ` Let's look at ${wrong.length===1?"the one":"the ones"} to revisit.`}
                </div>
                {(() => {
                  const list = wrong.length>0 ? wrong : CHECKPOINTS;
                  const cp = list[Math.min(reviewIdx, list.length-1)];
                  const ans = answers.find(a => a.cpId===cp.id);
                  const yourPick = ans?.firstPick ?? "—";
                  const correctText = cp.kind==="predict" ? cp.options![cp.correctIdx!] : TAG_LABEL[cp.correctTag!];
                  const highlight2: "top"|"bottom"|"both" = cp.kind==="predict" ? "both" : cp.region!;
                  return (
                    <div key={cp.id} className="cbl-fadeUp" style={{ background:"#fff", borderRadius:DS.r.lg, padding:isMobile?14:20, boxShadow:"0 4px 16px rgba(0,0,0,.06)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:6 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:DS.c.g700 }}>Item {Math.min(reviewIdx,list.length-1)+1} of {list.length}</span>
                        <span style={{ fontSize:12, fontWeight:700, padding:"3px 12px", borderRadius:DS.r.pill, background:ans?.correct?"#EAF9F0":"#FDECEC", color:ans?.correct?DS.c.successDk:DS.c.danger }}>
                          {ans?.correct ? "You got this right" : "Worth revisiting"}
                        </span>
                      </div>
                      <div style={{ fontSize:isMobile?14:15, fontWeight:600, lineHeight:1.5, marginBottom:12 }}>
                        {cp.kind==="predict" ? cp.prompt : `Tag for the ${cp.region} layer`}
                      </div>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
                        <div style={{ flex:"1 1 140px", background:DS.c.g100, borderRadius:DS.r.md, padding:"10px 14px" }}>
                          <div style={{ fontSize:11, color:DS.c.g700, fontWeight:600 }}>Your answer</div>
                          <div style={{ fontSize:isMobile?13:14, fontWeight:600, color:ans?.correct?DS.c.successDk:DS.c.danger, marginTop:2 }}>
                            {ans?.correct?"✓ ":"✗ "}{yourPick}
                          </div>
                        </div>
                        <div style={{ flex:"1 1 140px", background:"#EAF9F0", borderRadius:DS.r.md, padding:"10px 14px" }}>
                          <div style={{ fontSize:11, color:DS.c.successDk, fontWeight:600 }}>Correct answer</div>
                          <div style={{ fontSize:isMobile?13:14, fontWeight:600, color:DS.c.successDk, marginTop:2 }}>✓ {correctText}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:14, flexWrap:"wrap", alignItems:"center" }}>
                        <div style={{ width:isMobile?120:140, flexShrink:0, margin:isMobile?"0 auto":0 }}>
                          <PotScene animT={1} highlight={highlight2} showLabels uid={`${uid}-mini`} mini />
                        </div>
                        <div style={{ flex:"1 1 200px" }}>
                          <div style={{ fontSize:12, fontWeight:700, color:DS.c.primary, marginBottom:5 }}>Why</div>
                          <div style={{ fontSize:isMobile?13:14, lineHeight:1.65, color:DS.c.g900 }}>{cp.concept}</div>
                          <div style={{ marginTop:10, textAlign:"center", background:DS.c.accentLight, border:`1px solid ${DS.c.accentDark}`, borderRadius:DS.r.md, padding:"8px 12px", fontSize:isMobile?12:13, fontWeight:600, color:DS.c.g900 }}>
                            Less dense → floats up &nbsp;•&nbsp; More dense → settles down
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:16, gap:10 }}>
                        <button className="cbl-btn" style={{...outlineBtn(DS.c.primary), opacity:reviewIdx===0?.4:1}} disabled={reviewIdx===0} onClick={() => setReviewIdx(i => Math.max(0,i-1))}>
                          <ChevronLeft size={16}/> Prev
                        </button>
                        {reviewIdx < list.length-1 ? (
                          <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={() => setReviewIdx(i => i+1)}>
                            Next <ChevronRight size={16}/>
                          </button>
                        ) : (
                          <button className="cbl-btn" style={pillBtn(DS.c.primary)} onClick={handleFinish}>
                            Finish <Check size={16}/>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── FINISHED PHASE — uniform finish screen, §6.3 ── */}
            {phase==="finished" && (
              <>
                {/* full-viewport celebration overlay — escapes any pinned/scroll container */}
                <div aria-hidden style={{ position:"fixed", inset:0, zIndex:9999, pointerEvents:"none" }}>
                  <ConfettiCanvas active={confettiActive} />
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ animation:"cbl-popIn .5s ease both, cbl-fadeOutDelay 2.6s ease both", textAlign:"center", padding:"0 20px" }}>
                      <div style={{ fontSize:isMobile?32:52, fontWeight:800, color:"#fff", textShadow:"0 4px 24px rgba(0,0,0,.4)" }}>
                        {score===total ? "Brilliant! 🎉" : "Well done! 🎉"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cbl-popIn"
                  style={{ background:"#fff", borderRadius:DS.r.xl, padding:isMobile?20:28, textAlign:"center", boxShadow:"0 10px 30px rgba(0,0,0,.10)" }}>
                  <div style={{ width:60, height:60, borderRadius:DS.r.pill, background:DS.grad.result, display:"inline-flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 22px rgba(255,114,18,.35)" }}>
                    <Award size={30} color="#fff"/>
                  </div>
                  <div style={{ fontSize:isMobile?18:20, fontWeight:800, marginTop:12 }}>Activity finished</div>
                  <div style={{ fontSize:isMobile?38:46, fontWeight:800, color:DS.c.primary, fontVariantNumeric:"tabular-nums", marginTop:4 }}>
                    {score} / {total}
                  </div>
                  <div style={{ display:"flex", gap:5, justifyContent:"center", marginTop:8 }}>
                    {[0,1,2,3,4].map(i => (
                      <Star key={i} size={isMobile?20:24} fill={i<stars?DS.c.amber:"none"} color={i<stars?DS.c.amber:DS.c.g400}/>
                    ))}
                  </div>
                  <div style={{ textAlign:"left", marginTop:18, background:DS.c.primaryGhost, border:`1px solid ${DS.c.primaryLight}`, borderRadius:DS.r.lg, padding:isMobile?12:16 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:DS.c.primaryDark, marginBottom:8, textTransform:"uppercase", letterSpacing:.4 }}>
                      What you've learned
                    </div>
                    {LEARNED_POINTS.map((l,i) => (
                      <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6, fontSize:isMobile?12.5:13.5, lineHeight:1.5, color:DS.c.g900 }}>
                        <Check size={14} color={DS.c.successDk} style={{flexShrink:0, marginTop:2}}/>
                        <span>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>{/* end controls col */}
        </div>{/* end two-pane */}
      </div>
    </div>
  );
}

export default ChurningButterLabeller;