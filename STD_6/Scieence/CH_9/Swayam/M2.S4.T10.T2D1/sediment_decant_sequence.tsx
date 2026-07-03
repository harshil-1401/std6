// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: sediment_decant_sequence.tsx
// Topic M2.S4.T10 — "Sedimentation + Decantation sequence" (Fig. 9.9, tea pan)
// Grade tier: 6 (heavy gamification, story framing, playful tone)
// Interactions: tap/click + tilt slider (no drag-drop). Singularity palette. Poppins.
// Flow (Explore): See the mix → Wait (sedimentation) → Tilt to pour (decantation) → Wrap
//                 with a live "fast tilt fails" failure case baked into the pour control.
// Quiz: 4 generated questions on the sediment→decant rule + the insoluble error-alert.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ==================== INLINE ICONS ====================
// IMPORTANT: do NOT import from 'lucide-react'. The production iframe renderer only
// injects a fixed allowlist of icon globals; any name outside it (and any name an
// OLDER deployed renderer lacks) throws "X is not defined" at runtime. These inline
// SVGs depend on nothing external, so the tool renders on every renderer version.
// lucide-identical 24x24 path data so they look the same.
interface IconProps {
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}
const mkIcon = (paths: React.ReactNode, opts?: { solid?: boolean }) => {
  const Cmp: React.FC<IconProps> = ({ size = 24, color, fill = 'none', strokeWidth = 2, style }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={opts?.solid ? (fill !== 'none' ? fill : color || 'currentColor') : fill}
      stroke={opts?.solid ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
  return Cmp;
};

const Play = mkIcon(<polygon points="6 3 20 12 6 21 6 3" />);
const ChevronLeft = mkIcon(<path d="m15 18-6-6 6-6" />);
const ChevronRight = mkIcon(<path d="m9 18 6-6-6-6" />);
const RotateCcw = mkIcon(<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>);
const Check = mkIcon(<path d="M20 6 9 17l-5-5" />);
const Star = mkIcon(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />, { solid: true });
const Award = mkIcon(<><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></>);
const Timer = mkIcon(<><line x1="10" x2="14" y1="2" y2="2" /><line x1="12" x2="15" y1="14" y2="11" /><circle cx="12" cy="14" r="8" /></>);
const Droplets = mkIcon(<><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></>);
const Beaker = mkIcon(<><path d="M4.5 3h15" /><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" /><path d="M6 14h12" /></>);

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice';
type Phase = 'play' | 'result' | 'review';
type GradeLevel = 6 | 7 | 8;
type PanState = 'mixed' | 'settling' | 'settled';
type CupContents = 'empty' | 'clear' | 'cloudy';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

// ── additionalProps the host/agent may pass ──
interface SedimentDecantAdditionalProps {
  // Initial scene controls (let an agent freeze the tool on a specific moment)
  panState?: PanState;          // 'mixed' | 'settling' | 'settled'
  tiltAngle?: number;           // 0..60 starting tilt of the pour control
  cupContents?: CupContents;    // 'empty' | 'clear' | 'cloudy'
  // Copy
  feedbackMessage?: string;     // one-line coaching message shown under the pan
  predictionPrompt?: string;    // shown on the predict screen
  showHints?: boolean;          // show the small inline hints (default true)
  // Theming of the liquid (tea by default; can be re-themed to muddy water / rice rinse)
  liquidLabel?: string;         // "tea" | "muddy water" | "rice water" ...
  solidLabel?: string;          // "tea leaves" | "mud" | "rice grains" ...
  liquidColor?: string;         // clear-liquid colour
  solidColor?: string;          // settled-solid colour
}

interface ToolProps {
  props?: {
    width?: number;
    height?: number;
    data?: any;
    steps?: any[];
    initialMode?: ModeType;
    showModeSelector?: boolean;
    enabledModes?: ModeType[];
    showNavigation?: boolean;
    showPlayPause?: boolean;
    showStepIndicator?: boolean;
    initialStep?: number;
    filterSteps?: (number | string)[];
    animationSpeed?: number;
    autoPlayDuration?: number;
    themeColor?: string;
    darkMode?: boolean;
    gradeLevel?: GradeLevel;
    additionalProps?: SedimentDecantAdditionalProps;
  };
  setStepDetails?: (s: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ==================== DESIGN TOKENS (Singularity palette) ====================

const DS = {
  c: {
    primary: '#4A4DC9', primaryDark: '#533086', primaryLight: '#C1C1EA', primaryGhost: '#EDEDF8',
    accent: '#FF7212', accentDark: '#FC9145', accentLight: '#FFF3E4',
    gray900: '#1A1A2E', gray700: '#4E4E4E', gray400: '#CACACA', gray200: '#EBEBEB', gray100: '#F5F5F5',
    white: '#FFFFFF', success: '#2ECC71', danger: '#E53E3E', teal: '#0891b2', amber: '#F59E0B',
    pink: '#DB2777', deepBlue: '#1E40AF', forest: '#166534', water: '#CDE7F5',
    tea: '#C97B30', teaClear: '#E2A659', leaves: '#5A3A1A', cloudy: '#A98352',
    steel: '#B7BFC9', steelDark: '#8B95A1',
  },
  font: `'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  serif: `'DM Serif Display', Georgia, serif`,
  r: { sm: 8, md: 12, lg: 16, xl: 24, pill: 9999 },
  sh: {
    sm: '0 2px 8px rgba(26,26,46,0.08)',
    md: '0 6px 18px rgba(26,26,46,0.12)',
    lg: '0 16px 40px rgba(26,26,46,0.18)',
    xl: '0 25px 50px -12px rgba(26,26,46,0.30)',
  },
};

// ==================== TIER CONFIG (6 / 7 / 8) ====================

const TIER_CONFIG = {
  6: {
    confettiCount: 70, confettiDuration: 2500, showStars: true, starCount: 5, starStaggerMs: 200, scoreSizePx: 64,
    encouragement: {
      high: 'Brilliant! You decanted like a pro!',
      mid: "Nice work! Let's revisit the tricky ones.",
      low: "Every spill teaches something — let's learn together!",
    },
    playAgainLabel: 'Play again!', reviewLabel: "Let's see what we learned",
    bodyFontMobile: 16, bodyFontDesktop: 17, heroFontMobile: 34, heroFontDesktop: 46,
    touchTargetMobile: 56, pulseOnCorrect: true, storyFrame: true,
    settleMs: 3200, // slower, dramatic settle for the youngest learners
  },
  7: {
    confettiCount: 40, confettiDuration: 2000, showStars: true, starCount: 5, starStaggerMs: 200, scoreSizePx: 56,
    encouragement: {
      high: 'Strong work — sequence locked.', mid: 'Good job. A couple to polish.', low: "Let's walk through these — you'll get it.",
    },
    playAgainLabel: 'Play again', reviewLabel: 'Review answers',
    bodyFontMobile: 15, bodyFontDesktop: 16, heroFontMobile: 32, heroFontDesktop: 44,
    touchTargetMobile: 50, pulseOnCorrect: false, storyFrame: false,
    settleMs: 2600,
  },
  8: {
    confettiCount: 15, confettiDuration: 1500, showStars: false, starCount: 0, starStaggerMs: 0, scoreSizePx: 48,
    encouragement: {
      high: "Excellent. You've got this.", mid: 'Good — review the ones you missed.', low: 'Work through the explanations carefully.',
    },
    playAgainLabel: 'Try again', reviewLabel: 'Review answers',
    bodyFontMobile: 15, bodyFontDesktop: 16, heroFontMobile: 30, heroFontDesktop: 40,
    touchTargetMobile: 48, pulseOnCorrect: false, storyFrame: false,
    settleMs: 2000,
  },
} as const;

// ==================== EASING ====================

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ==================== PRNG (for quiz shuffling, deterministic per session) ====================

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ==================== RESPONSIVE HOOK ====================
// Container-based responsiveness (measures the tool's OWN width via ResizeObserver)
// — essential inside the production iframe / preview panel and on tablets.
const useResponsive = (ref: React.RefObject<HTMLElement>) => {
  const [w, setW] = useState<number>(typeof window !== 'undefined' ? Math.min(window.innerWidth, 840) : 840);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.getBoundingClientRect().width || el.clientWidth || w);
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(el); }
    window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
  return { w, isMobile: w < 560, isTablet: w >= 560 && w < 820, isCompact: w < 820 };
};

// ==================== KEYFRAMES ====================

const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
@keyframes sd_fadeInUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sd_popIn { 0% { opacity: 0; transform: scale(0.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes sd_shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
@keyframes sd_scaleInBack { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
@keyframes sd_pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes sd_glow { 0%,100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); } 50% { box-shadow: 0 0 0 10px rgba(46,204,113,0.28); } }
@keyframes sd_starPop { 0% { opacity: 0; transform: scale(0) rotate(-30deg); } 70% { transform: scale(1.25) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes sd_confetti { 0% { opacity: 1; transform: translateY(-10px) rotate(0); } 100% { opacity: 0; transform: translateY(440px) rotate(540deg); } }
@keyframes sd_drift { 0% { transform: translateY(0); } 50% { transform: translateY(-3px); } 100% { transform: translateY(0); } }
@keyframes sd_breathe { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
`;

// ==================== SMALL UI PIECES ====================

const PillButton: React.FC<{
  label: string; onClick?: () => void; variant?: 'contained' | 'outlined' | 'ghost';
  color?: string; disabled?: boolean; icon?: React.ReactNode; minH?: number; fontSize?: number; grow?: boolean;
}> = ({ label, onClick, variant = 'contained', color = DS.c.accent, disabled, icon, minH = 52, fontSize = 16, grow }) => {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: minH, padding: '0 22px', borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700,
    fontSize, cursor: disabled ? 'not-allowed' : 'pointer', border: '2px solid transparent',
    transition: 'transform .15s ease, box-shadow .2s ease, background .2s ease',
    transform: press ? 'scale(0.96)' : hover && !disabled ? 'scale(1.04)' : 'scale(1)',
    opacity: disabled ? 0.5 : 1, flex: grow ? 1 : undefined, userSelect: 'none', whiteSpace: 'nowrap',
  };
  const skin: React.CSSProperties =
    variant === 'contained'
      ? { background: color, color: '#fff', boxShadow: hover && !disabled ? DS.sh.md : DS.sh.sm }
      : variant === 'outlined'
      ? { background: hover && !disabled ? DS.c.primaryGhost : '#fff', color, borderColor: color }
      : { background: hover && !disabled ? DS.c.primaryGhost : 'transparent', color };
  return (
    <button
      style={{ ...base, ...skin }} onClick={disabled ? undefined : onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
    >
      {icon}{label}
    </button>
  );
};

const ConfettiBurst: React.FC<{ count: number; duration: number }> = ({ count, duration }) => {
  const palette = [DS.c.accent, DS.c.primary, DS.c.amber, DS.c.pink, DS.c.success, DS.c.accentDark];
  const pieces = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100, delay: Math.random() * 0.5, dur: duration / 1000 + Math.random() * 0.6,
      color: palette[i % palette.length], size: 7 + Math.random() * 7, round: Math.random() > 0.5,
    })),
    [count, duration],
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 110 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: -12, left: `${p.left}%`, width: p.size, height: p.size,
          background: p.color, borderRadius: p.round ? '50%' : 2,
          animation: `sd_confetti ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
};

const StarsRow: React.FC<{ count: number; stagger: number }> = ({ count, stagger }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '6px 0 4px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} size={34} fill={DS.c.amber} color={DS.c.amber}
        style={{ animation: `sd_starPop .5s ${i * (stagger / 1000)}s both` }} />
    ))}
  </div>
);

// ──────────────────────────────────────────────────────────────────────────
// PanScene — the heart of the tool.
// An SVG side-view of a sauce pan (and a cup) drawn from a handful of numbers:
//   settle  (0..1) — how settled the solids are (0 = fully mixed, 1 = all at bottom)
//   tilt    (0..60 deg) — how far the pan is tipped toward the cup
//   poured  (0..1) — fraction of liquid that has left the pan into the cup
//   disturb (0..1) — how stirred-up the solids currently are (drives cloudiness)
// The maths is intentionally simple & physical so the visual always reads true:
//  • settled leaves sit as a dark band at the bottom of the pan body
//  • tilting pours liquid out of the top rim into the cup
//  • a FAST tilt (high tilt-rate) lifts the leaves → disturb rises → cup goes cloudy
// ──────────────────────────────────────────────────────────────────────────
const PanScene: React.FC<{
  settle: number;      // 0..1
  tilt: number;        // degrees, 0..60
  poured: number;      // 0..1
  disturb: number;     // 0..1 (suspended solids)
  liquidColor: string;
  liquidClear: string;
  solidColor: string;
  liquidLabel: string;
  solidLabel: string;
  width: number;
  showStepTag?: 'sediment' | 'decant' | null;
}> = ({ settle, tilt, poured, disturb, liquidColor, liquidClear, solidColor, liquidLabel, solidLabel, width, showStepTag }) => {
  const W = width;
  const H = Math.round(width * 0.74);   // taller box so the pan can sit above the cup
  // Pan geometry (un-tilted, in a local box); we rotate the whole pan group about its base.
  // Smaller than before so the scene reads cleanly with room around it.
  const SHIFT = 40;                          // nudge pan + cup right
  const panW = W * 0.30, panH = H * 0.24;
  const panX = W * 0.12 + SHIFT, panY = H * 0.16;   // sits high, above the cup
  const pivotX = panX + panW * 0.5;
  const pivotY = panY + panH;          // tip about the base so liquid pours from the rim

  // Liquid: starts at ~82% of pan height, drops as we pour.
  const fullLevel = panH * 0.82;
  const liquidH = fullLevel * (1 - poured * 0.92);
  // Sediment band height grows with settle; while suspended (disturb) it shrinks back up.
  const sedimentFull = panH * 0.22;
  const sedimentH = sedimentFull * settle * (1 - disturb * 0.9);
  // Liquid colour: clearer near the top once settled & calm; cloudier with disturbance.
  const liquidShown = disturb > 0.12
    ? mix(liquidClear, solidColor, clamp(disturb, 0, 1) * 0.7)
    : (settle > 0.6 ? liquidClear : liquidColor);

  // Cup — placed so its CENTRE sits just under the pan's tilted spout (right rim), keeping
  // the pour short and the spout edge directly above the middle of the cup (no big gap).
  const cupW = W * 0.16, cupH = H * 0.22;
  const cupCx = panX + panW + W * 0.10;   // a little right of the pan's right edge
  const cupX = cupCx - cupW / 2;
  const cupY = H * 0.52;
  // The pour is cloudy if the leaves are stirred up (disturb) OR not yet settled (low settle):
  // tipping un-settled tea pours leaves with it. Only a calm, settled pan yields clear tea.
  const cloudyPour = disturb > 0.2 || settle < 0.55;
  const cupFill = clamp(poured, 0, 1);
  const cupLiquid = poured > 0
    ? (cloudyPour ? mix(liquidClear, solidColor, 0.6) : liquidClear)
    : 'transparent';

  // pour stream: visible while tilted past ~14° and there is still liquid to pour
  const pouring = tilt > 14 && poured < 0.98 && liquidH > 2;
  const streamColor = cloudyPour ? mix(liquidClear, solidColor, 0.6) : liquidClear;

  // ── Spout point: the pan's top-RIGHT rim corner, rotated by +tilt about (pivotX,pivotY).
  // Clockwise (positive in SVG's y-down space) tips the right-hand spout DOWN toward the
  // cup on the right. We compute it in world coords so the pour stream always leaves the
  // actual rim, instead of floating away from the rotated pan.
  const rad = (tilt * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const rotate = (px: number, py: number) => {
    const dx = px - pivotX, dy = py - pivotY;
    return { x: pivotX + dx * cos - dy * sin, y: pivotY + dx * sin + dy * cos };
  };
  // top-right inner corner of the pan = the lip the tea pours over
  const spout = rotate(panX + panW - 4, panY + 4);
  // landing point: centre of the cup's rim (rim ellipse sits at cupY)
  const landX = cupX + cupW * 0.5;
  const landY = cupY + cupH * 0.06;
  // a gravity-style arc: control point pulled outward & down from the spout
  const ctrlX = (spout.x + landX) / 2 + (landX - spout.x) * 0.15;
  const ctrlY = Math.max(spout.y, landY) - Math.abs(landX - spout.x) * 0.05;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', borderRadius: DS.r.lg, background: 'linear-gradient(180deg,#FBFBFE,#F1F1FA)' }}>
      <defs>
        <linearGradient id="sd_steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={DS.c.steelDark} />
          <stop offset="0.5" stopColor={DS.c.steel} />
          <stop offset="1" stopColor={DS.c.steelDark} />
        </linearGradient>
        {/* porcelain cup body — soft left-light shading */}
        <linearGradient id="sd_porcelain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#F4F6FB" />
          <stop offset="1" stopColor="#DCE2EC" />
        </linearGradient>
      </defs>

      {/* table line */}
      <rect x="0" y={H - 10} width={W} height="10" fill="#E7E2D6" />

      {/* CUP (static porcelain teacup + saucer, receives the pour) */}
      {(() => {
        // tapered body: rim a touch wider than the base for a 3D teacup look
        const cMid = cupX + cupW / 2;
        const rimY = cupY, baseY = cupY + cupH;
        const rimHalf = cupW * 0.5, baseHalf = cupW * 0.40;
        const rimRx = rimHalf, rimRy = cupH * 0.10;            // rim ellipse
        const baseRy = cupH * 0.06;
        // body outline (rim ellipse front edge → down the sides → base ellipse)
        const bodyPath = `M ${cMid - rimHalf} ${rimY}
          C ${cMid - rimHalf} ${rimY + rimRy} ${cMid - baseHalf} ${baseY - baseRy} ${cMid - baseHalf} ${baseY}
          A ${baseHalf} ${baseRy} 0 0 0 ${cMid + baseHalf} ${baseY}
          C ${cMid + baseHalf} ${baseY - baseRy} ${cMid + rimHalf} ${rimY + rimRy} ${cMid + rimHalf} ${rimY} Z`;
        // handle anchors on the right side of the body
        const hTop = rimY + cupH * 0.26, hBot = rimY + cupH * 0.62;
        const hxTop = cMid + rimHalf - cupW * 0.04, hxBot = cMid + baseHalf + cupW * 0.02;
        const reach = cupW * 0.62;
        return (
          <g>
            {/* saucer under the cup */}
            <ellipse cx={cMid} cy={baseY + cupH * 0.10} rx={cupW * 0.78} ry={cupH * 0.10}
              fill="#EDEFF4" stroke={DS.c.gray400} strokeWidth="2" />
            <ellipse cx={cMid} cy={baseY + cupH * 0.07} rx={cupW * 0.55} ry={cupH * 0.06}
              fill="#FFFFFF" stroke={DS.c.gray200} strokeWidth="1.5" />

            {/* handle (drawn behind the body so it tucks in at the rim & base) */}
            <path d={`M ${hxTop} ${hTop}
                C ${hxTop + reach} ${hTop - cupH * 0.04} ${hxBot + reach} ${hBot + cupH * 0.06} ${hxBot} ${hBot}`}
              fill="none" stroke="#CBD2DD" strokeWidth={Math.max(7, cupW * 0.13)} strokeLinecap="round" />
            <path d={`M ${hxTop} ${hTop}
                C ${hxTop + reach} ${hTop - cupH * 0.04} ${hxBot + reach} ${hBot + cupH * 0.06} ${hxBot} ${hBot}`}
              fill="none" stroke="#F4F6FB" strokeWidth={Math.max(2.5, cupW * 0.05)} strokeLinecap="round" />

            {/* cup body */}
            <path d={bodyPath} fill="url(#sd_porcelain)" stroke={DS.c.gray400} strokeWidth="2.5" />

            {/* liquid (clipped to the tapered body) */}
            <clipPath id="sd_cupClip">
              <path d={bodyPath} />
            </clipPath>
            <g clipPath="url(#sd_cupClip)">
              <rect x={cupX - 2} y={baseY - cupFill * (cupH - rimRy)} width={cupW + 4}
                height={cupFill * (cupH - rimRy)} fill={cupLiquid}
                style={{ transition: 'height .25s linear, y .25s linear, fill .4s ease' }} />
              {/* liquid surface ellipse for a touch of depth */}
              {cupFill > 0.02 && (
                <ellipse cx={cMid} cy={baseY - cupFill * (cupH - rimRy)} rx={rimHalf * (0.5 + cupFill * 0.45)} ry={rimRy * 0.5}
                  fill="#FFFFFF" opacity="0.18" />
              )}
            </g>

            {/* glossy highlight down the left of the body */}
            <path d={`M ${cMid - rimHalf * 0.62} ${rimY + rimRy * 1.4}
                C ${cMid - rimHalf * 0.7} ${rimY + cupH * 0.4} ${cMid - baseHalf * 0.6} ${baseY - cupH * 0.18} ${cMid - baseHalf * 0.5} ${baseY - cupH * 0.06}`}
              fill="none" stroke="#FFFFFF" strokeWidth={cupW * 0.06} strokeLinecap="round" opacity="0.6" />

            {/* rim: back edge (full ellipse) then a crisp front lip */}
            <ellipse cx={cMid} cy={rimY} rx={rimRx} ry={rimRy} fill="#FFFFFF" stroke={DS.c.gray400} strokeWidth="2.5" />
            <ellipse cx={cMid} cy={rimY} rx={rimRx - 4} ry={rimRy - 2} fill="#EDF1F6" stroke="none" />

            <text x={cMid} y={baseY + cupH * 0.34} textAnchor="middle" fontFamily={DS.font} fontSize={W * 0.026} fill={DS.c.gray700}>cup</text>
          </g>
        );
      })()}

      {/* pour stream — a falling arc from the rotated spout into the cup */}
      {pouring && (
        <>
          <path
            d={`M ${spout.x} ${spout.y} Q ${ctrlX} ${ctrlY} ${landX} ${landY}`}
            fill="none" stroke={streamColor}
            strokeWidth={clamp(3 + tilt * 0.07, 3.5, 7)} strokeLinecap="round" opacity="0.95"
            style={{ animation: 'sd_breathe 0.6s ease-in-out infinite', transition: 'stroke .4s ease' }}
          />
          {/* little splash where it lands */}
          <circle cx={landX} cy={landY} r={W * 0.012} fill={streamColor} opacity="0.7"
            style={{ animation: 'sd_breathe 0.5s ease-in-out infinite' }} />
        </>
      )}

      {/* PAN (rotates about its base) */}
      <g transform={`rotate(${tilt} ${pivotX} ${pivotY})`} style={{ transition: 'transform .12s linear' }}>
        {/* pan body */}
        <rect x={panX} y={panY} width={panW} height={panH} rx="10"
          fill="url(#sd_steel)" stroke={DS.c.steelDark} strokeWidth="3" />
        {/* inner cavity clip for liquid + sediment */}
        <clipPath id="sd_panClip">
          <rect x={panX + 5} y={panY + 5} width={panW - 10} height={panH - 8} rx="7" />
        </clipPath>
        <g clipPath="url(#sd_panClip)">
          {/* clear upper layer once the leaves have settled & calmed (lighter tea on top) */}
          {settle > 0.6 && disturb < 0.15 && (
            <rect x={panX} y={panY + panH - liquidH} width={panW} height={liquidH}
              fill={liquidClear} style={{ transition: 'fill .5s ease' }} />
          )}
          {/* liquid body (the bulk; darker / mixed when not yet settled) */}
          <rect x={panX} y={panY + panH - liquidH} width={panW} height={liquidH}
            fill={settle > 0.6 && disturb < 0.15 ? liquidClear : liquidShown}
            style={{ transition: 'height .25s linear, y .25s linear, fill .5s ease' }} />
          {/* faint murk tint while the leaves are stirred up (the water looks dirty) */}
          {disturb > 0.08 && (
            <rect x={panX} y={panY + panH - liquidH} width={panW} height={liquidH} fill={solidColor}
              opacity={clamp(disturb, 0, 1) * 0.32} style={{ transition: 'opacity .25s linear' }} />
          )}
          {/* settled sediment band at the very bottom (only when calm) */}
          {sedimentH > 0.5 && (
            <rect x={panX} y={panY + panH - sedimentH} width={panW} height={sedimentH}
              fill={solidColor} style={{ transition: 'height .3s ease, y .3s ease' }} />
          )}
          {/* tea-leaf dots: suspended throughout when mixed/disturbed, sinking to the
             bottom band as settle → 1. Shown both while settling AND while disturbed
             (so the cloudy/predict state reads as swirling leaves, not a smooth murk). */}
          {(settle < 0.96 || disturb > 0.08) && LEAF_DOTS.map((d, i) => {
            const liquidTop = panY + panH - liquidH;
            const spreadY = liquidTop + d.y * (liquidH - sedimentH);          // suspended through the liquid
            const bandY = panY + panH - sedimentH + d.y * sedimentH;          // resting in the bottom band
            // settle pulls dots down; disturbance keeps them suspended (re-stirred), so the
            // effective sink fraction is reduced by how disturbed the tea is.
            const sink = clamp(settle * (1 - disturb), 0, 1);
            const cy = spreadY + (bandY - spreadY) * sink;
            return (
              <circle key={i}
                cx={panX + 8 + d.x * (panW - 16)}
                cy={cy}
                r={W * 0.0105} fill={solidColor} opacity={0.9}
                style={{ animation: `sd_drift ${1.2 + d.x}s ease-in-out infinite` }} />
            );
          })}
        </g>
        {/* rim highlight */}
        <rect x={panX} y={panY} width={panW} height="5" rx="3" fill="#FFFFFF" opacity="0.5" />
        {/* handle (upper-left, attached at the rim so it stays up when the pan tips) */}
        <rect x={panX - panW * 0.42} y={panY + panH * 0.10} width={panW * 0.42} height={panH * 0.13} rx="6"
          fill={DS.c.gray700} />
        <circle cx={panX - panW * 0.42} cy={panY + panH * 0.165} r={panH * 0.055} fill={DS.c.gray700} />
      </g>

      {/* step tag — pinned to the far right */}
      {showStepTag && (() => {
        const tagW = W * 0.34, tagX = W - tagW - W * 0.05;
        return (
          <g style={{ animation: 'sd_popIn .4s both' }}>
            <rect x={tagX} y={H * 0.04} width={tagW} height={H * 0.12} rx={H * 0.06}
              fill={showStepTag === 'sediment' ? DS.c.primary : DS.c.accent} />
            <text x={tagX + tagW / 2} y={H * 0.04 + H * 0.082} textAnchor="middle"
              fontFamily={DS.font} fontWeight="800" fontSize={W * 0.03} fill="#fff">
              {showStepTag === 'sediment' ? 'SEDIMENTATION' : 'DECANTATION'}
            </text>
          </g>
        );
      })()}

      {/* label — sits just below the pan image */}
      <text x={pivotX} y={panY + panH + H * 0.085} textAnchor="middle" fontFamily={DS.font} fontSize={W * 0.026} fill={DS.c.gray700}>
        sauce pan
      </text>
    </svg>
  );
};

// fixed tea-leaf dot layout (module-level so it never re-randomises between frames).
// x,y are fractions of the pan's inner width/height; the same dots both suspend
// (mixed/disturbed) and sink to the bottom band (settled).
const LEAF_DOTS = [
  { x: 0.16, y: 0.18 }, { x: 0.34, y: 0.46 }, { x: 0.50, y: 0.28 }, { x: 0.62, y: 0.58 },
  { x: 0.28, y: 0.72 }, { x: 0.46, y: 0.14 }, { x: 0.72, y: 0.36 }, { x: 0.80, y: 0.66 },
  { x: 0.22, y: 0.40 }, { x: 0.58, y: 0.78 }, { x: 0.40, y: 0.62 }, { x: 0.68, y: 0.20 },
];

// mix two hex colours (a→b by t in 0..1)
function mix(a: string, b: string, t: number): string {
  const pa = hex(a), pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function hex(c: string): [number, number, number] {
  const m = c.replace('#', '');
  const v = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

// ==================== QUIZ CONTENT ====================

interface Challenge {
  id: string;
  prompt: string;
  storyPrompt?: string;
  options: string[];
  correctAnswer: string;
  conceptExplanation: string;
}

function buildChallenges(seed: number, story: boolean): Challenge[] {
  const rng = mulberry32(seed);
  const bank: Challenge[] = [
    {
      id: 'q_order',
      storyPrompt: story ? 'Dada has just made tea with no strainer.' : undefined,
      prompt: 'Which step comes FIRST when removing tea leaves without a strainer?',
      options: ['Wait for the leaves to settle', 'Tilt the pan and pour at once'],
      correctAnswer: 'Wait for the leaves to settle',
      conceptExplanation:
        'First you WAIT — leaving the pan still lets the heavier leaves settle to the bottom. That settling is sedimentation. Only after the leaves have settled do you gently pour off the clear tea (decantation). Pour first and the leaves are still floating, so they come out too.',
    },
    {
      id: 'q_names',
      prompt: 'Gently pouring off the clear tea so the settled leaves stay behind is called…',
      options: ['Decantation', 'Sedimentation'],
      correctAnswer: 'Decantation',
      conceptExplanation:
        'Decantation is the gentle pouring-off of the clear upper liquid, leaving the settled solid behind. Sedimentation is the earlier step — the settling of the heavier insoluble solid to the bottom. Sedimentation happens first, then decantation.',
    },
    {
      id: 'q_fast',
      storyPrompt: story ? 'Valli is in a hurry and tips the pan quickly.' : undefined,
      prompt: 'What happens if you tilt the pan VERY fast?',
      options: ['The leaves lift up and cloudy tea pours out', 'The clear tea pours faster but stays clear'],
      correctAnswer: 'The leaves lift up and cloudy tea pours out',
      conceptExplanation:
        'A fast tilt swirls the liquid and lifts the settled leaves back up. Once the leaves are floating again, they pour into the cup and the tea turns cloudy. That is why you must tilt SLOWLY — to keep the leaves resting at the bottom.',
    },
    {
      id: 'q_insoluble',
      prompt: 'Stir SALT into water and wait a long time. Will the salt settle at the bottom like tea leaves?',
      options: ['No — salt dissolves, so it never settles', 'Yes — every solid settles if you wait'],
      correctAnswer: 'No — salt dissolves, so it never settles',
      conceptExplanation:
        'Sedimentation only works on INSOLUBLE solids — ones that do NOT dissolve, like tea leaves, sand or grit. Salt is soluble: it dissolves and becomes part of the liquid, so no amount of waiting makes it settle. The key word is insoluble.',
    },
    {
      id: 'q_realworld',
      storyPrompt: story ? 'At home, someone is washing rice before cooking.' : undefined,
      prompt: 'Pouring off the cloudy water while the rice grains stay in the pot is an example of…',
      options: ['Decantation', 'Dissolving'],
      correctAnswer: 'Decantation',
      conceptExplanation:
        'Washing rice is everyday decantation: the heavier rice grains settle, and you gently pour off the water on top while the grains stay behind. Here we keep the solid and throw the liquid away — but it is the same pour-off-the-top idea.',
    },
  ];
  // randomise the option order per question, then shuffle the question order
  const withShuffledOpts = bank.map((c) => ({ ...c, options: shuffle(c.options, rng) }));
  return shuffle(withShuffledOpts, rng).slice(0, 4);
}

// ==================== MAIN COMPONENT ====================

const SedimentDecantSequence: React.FC<ToolProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w: containerW, isMobile, isCompact } = useResponsive(rootRef);

  const config = useMemo(() => ({
    width: props.width ?? 840,
    gradeLevel: (props.gradeLevel ?? 6) as GradeLevel,
    initialMode: props.initialMode ?? 'learn',
    enabledModes: props.enabledModes ?? (['learn', 'practice'] as ModeType[]),
    showModeSelector: props.showModeSelector ?? true,
    themeColor: props.themeColor ?? DS.c.primary,
  }), [props]);

  const tier = TIER_CONFIG[config.gradeLevel] ?? TIER_CONFIG[6];

  const ap = props.additionalProps || {};
  const theme = useMemo(() => ({
    liquidLabel: ap.liquidLabel ?? 'tea',
    solidLabel: ap.solidLabel ?? 'tea leaves',
    liquidColor: ap.liquidColor ?? DS.c.tea,
    liquidClear: DS.c.teaClear,
    solidColor: ap.solidColor ?? DS.c.leaves,
    showHints: ap.showHints ?? true,
    feedbackMessage: ap.feedbackMessage,
    predictionPrompt: ap.predictionPrompt ?? 'Will tilting FAST pour clear tea or cloudy tea?',
  }), [ap]);

  // ── filterSteps: lets the host freeze the Explore flow on one screen (S1..S4) ──
  // S1 See mix · S2 Predict · S3 Sediment · S4 Decant (+ rule wrap & quiz CTA)
  const FILTER_TO_SCREEN: Record<string, number> = { S1: 0, S2: 1, S3: 2, S4: 3 };
  const forcedScreen = useMemo(() => {
    const fs = props.filterSteps;
    if (!fs || !fs.length) return null;
    const first = String(fs[0]).toUpperCase();
    return first in FILTER_TO_SCREEN ? FILTER_TO_SCREEN[first] : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.filterSteps]);

  // ── modes ──
  const [mode, setMode] = useState<ModeType>(config.initialMode);
  const bodyFont = isMobile ? tier.bodyFontMobile : tier.bodyFontDesktop;

  // sizing of the scene
  const sceneW = clamp(Math.min(containerW - (isMobile ? 36 : 52), 560), 280, 560);

  // ──────────────── EXPLORE state ────────────────
  // 5 screens: 0 see mix · 1 predict · 2 sediment(wait) · 3 decant(tilt) · 4 test fast tilt
  const LEARN_SCREENS = ['mix', 'predict', 'sediment', 'decant', 'fast'] as const;
  const [learnScreen, setLearnScreen] = useState<number>(forcedScreen ?? 0);

  // physical state shared across screens
  const [settle, setSettle] = useState(0);          // 0 mixed → 1 fully settled
  const [tilt, setTilt] = useState(0);              // 0..60 deg
  const [poured, setPoured] = useState(0);          // 0..1
  const [disturb, setDisturb] = useState(0);        // 0..1 suspended solids
  const [settling, setSettling] = useState(false);  // animation in progress
  const [predicted, setPredicted] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastTiltRef = useRef<{ t: number; time: number }>({ t: 0, time: 0 });

  // ──────────────── PRACTICE state ────────────────
  const [sessionSeed, setSessionSeed] = useState(() => 0xC0FFEE);
  const challenges = useMemo(() => buildChallenges(sessionSeed, tier.storyFrame), [sessionSeed, tier.storyFrame]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [reviewIdx, setReviewIdx] = useState(0);
  const [scoreShown, setScoreShown] = useState(0);

  // ── inject fonts + keyframes ──
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'sd-keyframes';
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('sd-keyframes'); if (e) e.remove(); };
  }, []);

  // ── interactive tool: tell host not to auto-advance ──
  useEffect(() => { setStopAutoNext?.(true); }, [setStopAutoNext]);

  // ── if the host re-freezes us on a step, jump there & reset the relevant physics ──
  useEffect(() => {
    if (forcedScreen == null) return;
    setLearnScreen(forcedScreen);
    // reset physics to a sensible state for that screen
    if (forcedScreen <= 1) { setSettle(0); setTilt(0); setPoured(0); setDisturb(0); }
    else if (forcedScreen === 2) { setSettle(0); setTilt(0); setPoured(0); setDisturb(0); }
    else { setSettle(1); setTilt(0); setPoured(0); setDisturb(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedScreen]);

  // ── apply additionalProps initial scene overrides on mount ──
  useEffect(() => {
    if (ap.panState === 'settled') setSettle(1);
    else if (ap.panState === 'settling') setSettle(0.4);
    if (typeof ap.tiltAngle === 'number') setTilt(clamp(ap.tiltAngle, 0, 60));
    if (ap.cupContents === 'clear') { setPoured(0.5); setDisturb(0); }
    else if (ap.cupContents === 'cloudy') { setPoured(0.5); setDisturb(0.7); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── report step details ──
  useEffect(() => {
    const cur = mode === 'learn' ? learnScreen + 1 : qIndex + 1;
    const total = mode === 'learn' ? LEARN_SCREENS.length : challenges.length;
    setStepDetails?.({ currentStep: cur, totalSteps: total, isPaused: true, currentMode: mode });
  }, [mode, learnScreen, qIndex, challenges.length, LEARN_SCREENS.length, setStepDetails]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── animate the leaves settling (sedimentation) ──
  const runSettle = useCallback(() => {
    if (settling) return;
    setSettling(true);
    setDisturb(0);
    const start = performance.now();
    const dur = tier.settleMs;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setSettle(easeOutCubic(p));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { setSettle(1); setSettling(false); }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [settling, tier.settleMs]);

  // ── tilt control: dragging the slider sets the angle; tilt SPEED drives disturbance ──
  // Fast change in angle (deg/sec) over a threshold lifts the settled leaves.
  const onTiltChange = useCallback((next: number, allowDisturb: boolean) => {
    const now = performance.now();
    const prev = lastTiltRef.current;
    const dt = Math.max((now - prev.time) / 1000, 1 / 120);
    const rate = Math.abs(next - prev.t) / dt; // deg per second
    lastTiltRef.current = { t: next, time: now };
    setTilt(next);

    // pour fraction grows once past ~16°, proportionally to how far past
    const overPour = clamp((next - 16) / 44, 0, 1);
    setPoured((p) => Math.max(p, overPour));

    if (allowDisturb && settle > 0.5) {
      // a quick yank (> ~140 deg/s) stirs the leaves up; gentle moves let them rest
      if (rate > 140 && next > 8) {
        setDisturb((d) => clamp(d + 0.18, 0, 1));
      } else if (rate < 60) {
        setDisturb((d) => clamp(d - 0.04, 0, 1)); // slowly re-settle if you ease off
      }
    }
  }, [settle]);

  // ── outcomes used for coaching text ──
  const decantClean = poured > 0.2 && disturb < 0.2;
  const decantMessy = poured > 0.2 && disturb >= 0.35;

  // ── reset helpers when navigating screens ──
  const resetPour = () => { setTilt(0); setPoured(0); setDisturb(0); };

  const gotoScreen = (n: number) => {
    const next = clamp(n, 0, LEARN_SCREENS.length - 1);
    // entering the sediment screen → start un-settled; entering decant/fast → ensure settled
    if (next === 2) { setSettle(0); resetPour(); }
    if (next === 3) { if (settle < 1) setSettle(1); resetPour(); }
    if (next === 4) { setSettle(1); resetPour(); }
    setLearnScreen(next);
  };

  // ── practice answering ──
  const answerQuestion = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const newAns = [...answers]; newAns[qIndex] = opt; setAnswers(newAns);
    setTimeout(() => {
      if (qIndex < challenges.length - 1) { setQIndex(qIndex + 1); setPicked(null); }
      else setPhase('result');
    }, tier.pulseOnCorrect ? 900 : 700);
  };
  const score = useMemo(() => challenges.reduce((s, c, i) => s + (answers[i] === c.correctAnswer ? 1 : 0), 0), [answers, challenges]);
  const wrongList = useMemo(() => challenges.map((c, i) => ({ c, i })).filter(({ i }) => answers[i] !== challenges[i].correctAnswer), [answers, challenges]);

  useEffect(() => {
    if (phase !== 'result') return;
    setScoreShown(0);
    const start = performance.now(); const dur = 1200; let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setScoreShown(Math.round(easeOutCubic(p) * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, score]);

  const handlePlayAgain = () => {
    setSessionSeed((s) => (s * 1664525 + 1013904223) >>> 0);
    setQIndex(0); setAnswers([]); setPicked(null); setPhase('play'); setReviewIdx(0);
  };
  const switchMode = (m: ModeType) => {
    setMode(m);
    if (m === 'practice') handlePlayAgain();
    else { setLearnScreen(forcedScreen ?? 0); setSettle(0); resetPour(); }
  };

  // ==================== RENDER HELPERS ====================

  const pct = score / Math.max(challenges.length, 1);
  const encouragement = pct >= 0.9 ? tier.encouragement.high : pct >= 0.6 ? tier.encouragement.mid : tier.encouragement.low;

  const sectionTitle = (t: string) => (
    <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isMobile ? 18 : 20, color: DS.c.gray900, marginBottom: 4 }}>{t}</div>
  );
  const story = (t: string) => (
    <div style={{ fontFamily: DS.serif, fontStyle: 'italic', fontSize: bodyFont + 1, color: DS.c.primaryDark, marginBottom: 10 }}>{t}</div>
  );
  const instruction = (t: string) => (
    <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray700, marginBottom: 16, lineHeight: 1.5 }}>{t}</div>
  );
  const sceneWrap = (child: React.ReactNode, caption?: string) => (
    <div style={{ background: DS.c.gray100, borderRadius: DS.r.xl, padding: isMobile ? 14 : 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ width: '100%', maxWidth: sceneW }}>{child}</div>
      {caption && (
        <div style={{ fontFamily: DS.font, fontSize: 14, color: DS.c.gray700, textAlign: 'center', minHeight: 20 }}>{caption}</div>
      )}
    </div>
  );

  // Tilt slider used on decant + fast screens
  const TiltSlider: React.FC<{ allowDisturb: boolean }> = ({ allowDisturb }) => (
    <div style={{ width: '100%', maxWidth: sceneW, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: DS.font, fontSize: 13, color: DS.c.gray700 }}>
        <span>upright</span><span style={{ fontWeight: 700, color: DS.c.gray900 }}>tilt: {Math.round(tilt)}°</span><span>tipped</span>
      </div>
      <input
        type="range" min={0} max={60} step={1} value={tilt}
        onChange={(e) => onTiltChange(Number(e.target.value), allowDisturb)}
        onMouseUp={() => { lastTiltRef.current = { t: tilt, time: performance.now() }; }}
        onTouchEnd={() => { lastTiltRef.current = { t: tilt, time: performance.now() }; }}
        style={{ width: '100%', accentColor: allowDisturb ? DS.c.accent : DS.c.primary, height: 28 }}
      />
      <div style={{ fontFamily: DS.font, fontSize: 12, color: DS.c.gray400, textAlign: 'center' }}>
        {allowDisturb ? 'Try yanking it fast — then try easing it slowly.' : 'Slide gently to pour the clear tea.'}
      </div>
    </div>
  );

  // ---------- EXPLORE screens ----------
  const renderMix = () => (
    <div style={{ animation: 'sd_fadeInUp .4s both' }}>
      {tier.storyFrame && story('Dada made tea with no strainer. The leaves are floating everywhere!')}
      {sectionTitle('A pan of tea — leaves and all')}
      {instruction(`This is a pan of ${theme.liquidLabel} with ${theme.solidLabel} mixed right through it. We want to get clear ${theme.liquidLabel} into the cup — without the ${theme.solidLabel}. How?`)}
      {sceneWrap(
        <PanScene settle={0} tilt={0} poured={0} disturb={0}
          liquidColor={theme.liquidColor} liquidClear={theme.liquidClear} solidColor={theme.solidColor}
          liquidLabel={theme.liquidLabel} solidLabel={theme.solidLabel} width={sceneW} showStepTag={null} />,
        theme.feedbackMessage ?? `The ${theme.solidLabel} are still mixed all through the ${theme.liquidLabel}.`,
      )}
    </div>
  );

  const renderPredict = () => {
    const opts = ['Clear tea', 'Cloudy tea'];
    return (
      <div style={{ animation: 'sd_fadeInUp .4s both' }}>
        {sectionTitle('Predict first 🤔')}
        {instruction(theme.predictionPrompt)}
        {sceneWrap(
          <PanScene settle={0} tilt={26} poured={0.18} disturb={0}
            liquidColor={theme.liquidColor} liquidClear={theme.liquidClear} solidColor={theme.solidColor}
            liquidLabel={theme.liquidLabel} solidLabel={theme.solidLabel} width={sceneW} showStepTag={null} />,
          'Imagine tipping the pan quickly…',
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {opts.map((o) => {
            const sel = predicted === o;
            return (
              <button key={o} onClick={() => setPredicted(o)} disabled={!!predicted}
                style={{
                  flex: 1, minWidth: 130, minHeight: tier.touchTargetMobile, borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700,
                  fontSize: bodyFont, cursor: predicted ? 'default' : 'pointer',
                  border: `2px solid ${sel ? DS.c.primary : DS.c.gray200}`,
                  background: sel ? DS.c.primaryGhost : '#fff', color: sel ? DS.c.primaryDark : DS.c.gray900,
                  animation: sel && tier.pulseOnCorrect ? 'sd_pulse .5s' : undefined,
                }}>
                {o}
              </button>
            );
          })}
        </div>
        {predicted && (
          <div style={{ marginTop: 14, padding: 14, background: DS.c.primaryGhost, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900, animation: 'sd_popIn .4s both' }}>
            You predicted <b>{predicted.toLowerCase()}</b>. Let's actually do it: first WAIT for the leaves to settle, then test both a slow and a fast tilt — and see who was right!
          </div>
        )}
      </div>
    );
  };

  const renderSediment = () => {
    const done = settle >= 0.999 && !settling;
    return (
      <div style={{ animation: 'sd_fadeInUp .4s both' }}>
        {sectionTitle('Step 1 — Wait (sedimentation)')}
        {instruction('Leave the pan perfectly still. Because the leaves are heavier than the tea and do not dissolve, gravity slowly pulls them all the way down.')}
        {sceneWrap(
          <PanScene settle={settle} tilt={0} poured={0} disturb={0}
            liquidColor={theme.liquidColor} liquidClear={theme.liquidClear} solidColor={theme.solidColor}
            liquidLabel={theme.liquidLabel} solidLabel={theme.solidLabel} width={sceneW}
            showStepTag={settle > 0.15 ? 'sediment' : null} />,
          settling ? 'The leaves are sinking…' : done ? 'Settled! The clear tea now rests on top. ✨' : `The ${theme.solidLabel} are still mixed. Press “Wait” to let them settle.`,
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          {!done
            ? <PillButton label={settling ? 'Settling…' : 'Wait for the leaves to settle'} icon={<Timer size={18} />}
                color={DS.c.primary} disabled={settling} minH={tier.touchTargetMobile} onClick={runSettle} />
            : <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: DS.c.success, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Check size={20} strokeWidth={3} /> Sedimentation done — now we can pour.
              </div>}
        </div>
      </div>
    );
  };

  const renderDecant = () => (
    <div style={{ animation: 'sd_fadeInUp .4s both' }}>
      {sectionTitle('Step 2 — Tilt slowly (decantation)')}
      {instruction('Now gently tip the pan so the clear tea on top flows into the cup, while the settled leaves stay resting at the bottom.')}
      {sceneWrap(
        <PanScene settle={settle} tilt={tilt} poured={poured} disturb={disturb}
          liquidColor={theme.liquidColor} liquidClear={theme.liquidClear} solidColor={theme.solidColor}
          liquidLabel={theme.liquidLabel} solidLabel={theme.solidLabel} width={sceneW}
          showStepTag={tilt > 10 ? 'decant' : null} />,
        decantClean ? 'Clear tea is flowing — leaves staying put. 👌'
          : decantMessy ? 'Whoa — too fast! The leaves lifted. Ease the slider back.'
          : 'Slide gently…',
      )}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
        <TiltSlider allowDisturb={true} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <PillButton label="Reset pan" variant="ghost" color={DS.c.gray700} icon={<RotateCcw size={16} />} minH={44} onClick={resetPour} />
      </div>
      <div style={{ marginTop: 16, padding: 14, background: DS.c.primaryGhost, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900, animation: 'sd_popIn .4s both' }}>
        <b>The rule:</b> First <b style={{ color: DS.c.primary }}>sedimentation</b> (wait for the heavier insoluble leaves to settle), then <b style={{ color: DS.c.accent }}>decantation</b> (pour the clear tea off the top — slowly), so the leaves stay behind.
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
        <PillButton label="Take the Quiz!" icon={<Play size={18} />} color={DS.c.accent} minH={tier.touchTargetMobile}
          fontSize={bodyFont + 1} onClick={() => switchMode('practice')} />
      </div>
    </div>
  );

  // ---------- EXPLORE shell + nav ----------
  const screenRenderers = [renderMix, renderPredict, renderSediment, renderDecant];

  const canGoNext = () => {
    if (learnScreen === 1) return !!predicted;             // must predict
    if (learnScreen === 2) return settle >= 0.999;         // must settle
    return true;
  };
  const nextHint = () => {
    if (learnScreen === 1) return 'Make a prediction to continue';
    if (learnScreen === 2) return 'Let the leaves settle to continue';
    return '';
  };

  const renderLearn = () => {
    // when the host freezes us on a single screen (filterSteps), hide the nav.
    const frozen = forcedScreen != null;
    const isLast = learnScreen >= screenRenderers.length - 1;
    return (
      <div>
        {screenRenderers[learnScreen]()}
        {!frozen && !isLast && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
              <PillButton label="Back" variant="ghost" color={DS.c.gray700} icon={<ChevronLeft size={18} />}
                disabled={learnScreen === 0} onClick={() => gotoScreen(learnScreen - 1)} minH={tier.touchTargetMobile} />
              <PillButton label="Next" color={DS.c.accent} icon={<ChevronRight size={18} />}
                disabled={!canGoNext()} onClick={() => gotoScreen(learnScreen + 1)} minH={tier.touchTargetMobile} />
            </div>
            {!canGoNext() && (
              <div style={{ textAlign: 'center', marginTop: 8, fontFamily: DS.font, fontSize: 12, color: DS.c.gray400 }}>{nextHint()}</div>
            )}
          </>
        )}
      </div>
    );
  };

  // ---------- PRACTICE ----------
  const renderPractice = () => {
    const q = challenges[qIndex];
    if (!q) return null;
    return (
      <div style={{ animation: 'sd_fadeInUp .35s both' }} key={qIndex}>
        <div style={{ height: 8, background: DS.c.gray200, borderRadius: DS.r.pill, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ width: `${(qIndex / challenges.length) * 100}%`, height: '100%', background: DS.c.primary, transition: 'width .4s ease' }} />
        </div>
        <div style={{ fontFamily: DS.font, fontSize: 13, color: DS.c.gray700, marginBottom: 8 }}>Question {qIndex + 1} of {challenges.length}</div>
        {q.storyPrompt && story(q.storyPrompt)}
        <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isMobile ? 19 : 23, color: DS.c.gray900, marginBottom: 18, lineHeight: 1.35 }}>{q.prompt}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {q.options.map((opt) => {
            const sel = picked === opt;
            return (
              <button key={opt} onClick={() => answerQuestion(opt)} disabled={!!picked}
                style={{
                  textAlign: 'left', minHeight: tier.touchTargetMobile, padding: '12px 18px', borderRadius: DS.r.md, fontFamily: DS.font, fontWeight: 600,
                  fontSize: bodyFont, cursor: picked ? 'default' : 'pointer',
                  border: `2px solid ${sel ? DS.c.primary : DS.c.gray200}`,
                  background: sel ? DS.c.primaryGhost : '#fff', color: sel ? DS.c.primaryDark : DS.c.gray900,
                  animation: sel && tier.pulseOnCorrect ? 'sd_pulse .5s' : undefined, lineHeight: 1.4,
                }}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResult = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <ConfettiBurst count={tier.confettiCount} duration={tier.confettiDuration} />
      <div style={{
        position: 'relative', zIndex: 120, background: '#fff', borderRadius: DS.r.xl, boxShadow: DS.sh.xl, padding: isMobile ? 24 : 32,
        maxWidth: 420, width: '100%', textAlign: 'center', animation: 'sd_scaleInBack .6s both',
        backgroundImage: `linear-gradient(160deg, ${DS.c.white}, ${DS.c.accentLight})`,
      }}>
        <Award size={44} color={DS.c.accent} style={{ marginBottom: 4 }} />
        {tier.showStars && <StarsRow count={tier.starCount} stagger={tier.starStaggerMs} />}
        <div style={{ fontFamily: DS.font, fontWeight: 800, fontSize: tier.scoreSizePx, color: DS.c.primaryDark, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          {scoreShown}<span style={{ fontSize: tier.scoreSizePx * 0.45, color: DS.c.gray700 }}>/{challenges.length}</span>
        </div>
        <div style={{ fontFamily: DS.font, fontWeight: 500, fontSize: bodyFont + 1, color: DS.c.gray700, margin: '8px 0 18px' }}>{encouragement}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {wrongList.length > 0 && (
            <PillButton label={tier.reviewLabel} color={DS.c.accent} onClick={() => { setPhase('review'); setReviewIdx(0); }} minH={tier.touchTargetMobile} />
          )}
          <PillButton label={tier.playAgainLabel} variant="outlined" color={DS.c.primary} icon={<RotateCcw size={16} />} onClick={handlePlayAgain} minH={tier.touchTargetMobile} />
        </div>
      </div>
    </div>
  );

  const renderReview = () => {
    if (!wrongList.length) return null;
    const { c, i } = wrongList[reviewIdx];
    return (
      <div style={{ animation: 'sd_fadeInUp .35s both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 18, color: DS.c.gray900 }}>Let's learn from this one</div>
          <PillButton label={tier.playAgainLabel} variant="ghost" color={DS.c.primary} icon={<RotateCcw size={15} />} onClick={handlePlayAgain} minH={44} />
        </div>
        {challenges.length - wrongList.length > 0 && (
          <div style={{ fontFamily: DS.font, fontSize: 13, color: DS.c.success, marginBottom: 12 }}>✓ You got {challenges.length - wrongList.length} right!</div>
        )}
        <div style={{ background: '#fff', border: `1px solid ${DS.c.gray200}`, borderRadius: DS.r.lg, boxShadow: DS.sh.sm, padding: 20 }}>
          {c.storyPrompt && <div style={{ fontFamily: DS.serif, fontStyle: 'italic', color: DS.c.gray700, marginBottom: 6 }}>{c.storyPrompt}</div>}
          <div style={{ fontFamily: DS.font, fontWeight: 600, fontSize: bodyFont + 1, color: DS.c.gray900, marginBottom: 12 }}>{c.prompt}</div>
          <div style={{ fontFamily: DS.font, fontSize: bodyFont, marginBottom: 4 }}>You answered: <b style={{ color: DS.c.danger }}>{answers[i]}</b></div>
          <div style={{ fontFamily: DS.font, fontSize: bodyFont, marginBottom: 12 }}>Correct answer: <b style={{ color: DS.c.success }}>{c.correctAnswer}</b></div>
          <div style={{ height: 1, background: DS.c.gray200, margin: '8px 0 12px' }} />
          <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900, lineHeight: 1.6 }}>{c.conceptExplanation}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
          <PillButton label="Previous" variant="ghost" color={DS.c.gray700} icon={<ChevronLeft size={18} />}
            disabled={reviewIdx === 0} onClick={() => setReviewIdx(reviewIdx - 1)} minH={tier.touchTargetMobile} />
          {reviewIdx < wrongList.length - 1
            ? <PillButton label="Next" color={DS.c.primary} icon={<ChevronRight size={18} />} onClick={() => setReviewIdx(reviewIdx + 1)} minH={tier.touchTargetMobile} />
            : <PillButton label={tier.playAgainLabel} color={DS.c.accent} icon={<RotateCcw size={16} />} onClick={handlePlayAgain} minH={tier.touchTargetMobile} />}
        </div>
      </div>
    );
  };

  // ==================== TOP-LEVEL LAYOUT ====================

  const headerProgress = mode === 'learn'
    ? `Step ${learnScreen + 1} / ${LEARN_SCREENS.length}`
    : phase === 'play' ? `${qIndex + 1} / ${challenges.length}` : phase === 'review' ? 'Review' : 'Results';

  const progressFill = mode === 'learn'
    ? (learnScreen + 1) / LEARN_SCREENS.length
    : phase === 'play' ? qIndex / challenges.length : 1;

  return (
    <div ref={rootRef} style={{ width: '100%', maxWidth: config.width, margin: '0 auto', fontFamily: DS.font, color: DS.c.gray900, background: DS.c.white, borderRadius: DS.r.xl, overflow: 'hidden', boxShadow: DS.sh.lg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${DS.c.primaryDark}, ${DS.c.primary} 55%, ${DS.c.accentDark})`, padding: isMobile ? '18px 18px' : '22px 26px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Droplets size={isMobile ? 26 : 30} />
            <div>
              <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 23, letterSpacing: 0.2 }}>Settle &amp; Pour: Sedimentation + Decantation</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>Wait for the leaves to settle, then tilt slowly to pour clear tea</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.18)', padding: '6px 12px', borderRadius: DS.r.pill }}>{headerProgress}</div>
        </div>
        {config.showModeSelector && config.enabledModes.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {config.enabledModes.map((m) => {
              const active = mode === m;
              return (
                <button key={m} onClick={() => switchMode(m)} style={{
                  flex: isMobile ? 1 : undefined, minHeight: 40, padding: '0 18px', borderRadius: DS.r.pill, fontFamily: DS.font,
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none', textTransform: 'capitalize',
                  background: active ? '#fff' : 'rgba(255,255,255,0.16)', color: active ? DS.c.primaryDark : '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {m === 'learn' ? <Beaker size={15} /> : <Award size={15} />}{m === 'learn' ? 'Explore' : 'Quiz'}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* progress line */}
      <div style={{ height: 4, background: DS.c.gray200 }}>
        <div style={{ width: `${progressFill * 100}%`, height: '100%', background: DS.c.accent, transition: 'width .4s ease' }} />
      </div>

      {/* Body */}
      <div style={{ padding: isMobile ? 18 : 26, minHeight: 380 }}>
        {mode === 'learn' && renderLearn()}
        {mode === 'practice' && phase === 'play' && renderPractice()}
        {mode === 'practice' && phase === 'review' && renderReview()}
      </div>

      {mode === 'practice' && phase === 'result' && renderResult()}
    </div>
  );
};

export default SedimentDecantSequence;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════
