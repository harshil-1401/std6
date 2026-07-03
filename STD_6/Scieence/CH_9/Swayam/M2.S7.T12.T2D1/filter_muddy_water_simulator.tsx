// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: filter_muddy_water_simulator.tsx
// Topic M2.S7.T12 — "Filtering muddy water with filter paper"
// Grade tier: 6 (heavy gamification, story framing, playful tone)
// Interactions: tap/click + one pore selector (no drag-drop). Singularity palette. Poppins.
// Flow (Explore): Fold paper → Predict → Pour & filter → Name residue/filtrate (wrap)
// Quiz: 4 generated questions on residue/filtrate, filtration = insoluble-from-liquid,
//       pore size, and everyday filters (cotton/charcoal/sand, tea bags).
// IMPORTANT: no 'lucide-react' import — inline SVG icons only (prod-iframe safe).
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ==================== INLINE ICONS ====================
// Do NOT import from 'lucide-react'. The production iframe renderer only injects a
// fixed allowlist of icon globals; any name outside it (or missing from an older
// deployed renderer) throws "X is not defined" at runtime. These inline SVGs depend
// on nothing external. lucide-identical 24x24 path data so they look the same.
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
const Beaker = mkIcon(<><path d="M4.5 3h15" /><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" /><path d="M6 14h12" /></>);
const Droplets = mkIcon(<><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></>);
const Hand = mkIcon(<><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" /><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></>);

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice';
type Phase = 'play' | 'result' | 'review';
type GradeLevel = 6 | 7 | 8;
type PoreType = 'cloth' | 'paper';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

// ── additionalProps the host/agent may pass ──
interface FilterAdditionalProps {
  pore?: PoreType;              // 'cloth' (coarse, cloudy filtrate) | 'paper' (fine, clear)
  showHints?: boolean;
  feedbackMessage?: string;
  predictionPrompt?: string;
  // re-theming the mixture (defaults: muddy water → mud + clear water)
  liquidLabel?: string;        // "muddy water"
  residueLabel?: string;       // "mud"
  filtrateLabel?: string;      // "clear water"
  muddyColor?: string;         // colour of the unfiltered liquid
  residueColor?: string;       // colour of the trapped solid
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
    additionalProps?: FilterAdditionalProps;
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
    mud: '#8B5E34', mudDark: '#5A3A1A', muddy: '#9C7B52', clearWater: '#CFE8F2',
    glass: '#E8F0F4', steel: '#B7BFC9', steelDark: '#8B95A1', paper: '#F7F4EC', paperEdge: '#D8D2C2',
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
      high: 'Brilliant! You filtered like a pro!',
      mid: "Nice work! Let's revisit the tricky ones.",
      low: "Every pour teaches something — let's learn together!",
    },
    playAgainLabel: 'Play again!', reviewLabel: "Let's see what we learned",
    bodyFontMobile: 16, bodyFontDesktop: 17, heroFontMobile: 34, heroFontDesktop: 46,
    touchTargetMobile: 56, pulseOnCorrect: true, storyFrame: true,
    pourMs: 3200,
  },
  7: {
    confettiCount: 40, confettiDuration: 2000, showStars: true, starCount: 5, starStaggerMs: 200, scoreSizePx: 56,
    encouragement: {
      high: 'Strong work — concept locked.', mid: 'Good job. A couple to polish.', low: "Let's walk through these — you'll get it.",
    },
    playAgainLabel: 'Play again', reviewLabel: 'Review answers',
    bodyFontMobile: 15, bodyFontDesktop: 16, heroFontMobile: 32, heroFontDesktop: 44,
    touchTargetMobile: 50, pulseOnCorrect: false, storyFrame: false,
    pourMs: 2600,
  },
  8: {
    confettiCount: 15, confettiDuration: 1500, showStars: false, starCount: 0, starStaggerMs: 0, scoreSizePx: 48,
    encouragement: {
      high: "Excellent. You've got this.", mid: 'Good — review the ones you missed.', low: 'Work through the explanations carefully.',
    },
    playAgainLabel: 'Try again', reviewLabel: 'Review answers',
    bodyFontMobile: 15, bodyFontDesktop: 16, heroFontMobile: 30, heroFontDesktop: 40,
    touchTargetMobile: 48, pulseOnCorrect: false, storyFrame: false,
    pourMs: 2000,
  },
} as const;

// ==================== EASING / HELPERS ====================

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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
// mix two hex colours (a→b by t in 0..1) → rgb()
function hex(c: string): [number, number, number] {
  const m = c.replace('#', '');
  const v = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
// Returns a HEX string so the output can be safely re-mixed (chained mixes).
function mix(a: string, b: string, t: number): string {
  const pa = hex(a), pb = hex(b);
  const ch = (i: number) => clamp(Math.round(pa[i] + (pb[i] - pa[i]) * t), 0, 255).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

// ==================== RESPONSIVE HOOK ====================
// Container-based responsiveness (measures the tool's OWN width via ResizeObserver).
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
@keyframes fm_fadeInUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fm_popIn { 0% { opacity: 0; transform: scale(0.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes fm_shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
@keyframes fm_scaleInBack { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
@keyframes fm_pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes fm_glow { 0%,100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); } 50% { box-shadow: 0 0 0 10px rgba(46,204,113,0.28); } }
@keyframes fm_starPop { 0% { opacity: 0; transform: scale(0) rotate(-30deg); } 70% { transform: scale(1.25) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes fm_confetti { 0% { opacity: 1; transform: translateY(-10px) rotate(0); } 100% { opacity: 0; transform: translateY(440px) rotate(540deg); } }
@keyframes fm_drip { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(34px); opacity: 0; } }
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
          animation: `fm_confetti ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
};

const StarsRow: React.FC<{ count: number; stagger: number }> = ({ count, stagger }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '6px 0 4px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} size={34} fill={DS.c.amber} color={DS.c.amber}
        style={{ animation: `fm_starPop .5s ${i * (stagger / 1000)}s both` }} />
    ))}
  </div>
);

// ──────────────────────────────────────────────────────────────────────────
// FilterScene — the heart of the tool.
// A side-view SVG of a tripod stand holding a glass funnel (with a folded
// filter-paper cone) over a conical flask. Driven by a few numbers:
//   foldStage (0..3) — 0 flat circle, 1 half-fold, 2 quarter-fold, 3 open cone in funnel
//   poured    (0..1) — how much muddy water has been tipped in / passed through
//   residue   (0..1) — mud built up ON the paper (grows as it pours)
//   filtrate  (0..1) — clear liquid collected in the flask
//   clarity   (0..1) — 1 = crystal clear (paper), lower = cloudy (cloth)
//   pouring   (bool) — show the pour stream + drip animation
// The physics is simple & honest so the picture always reads true: mud stays on
// the paper as a brown cap; only the (clearer with finer pores) liquid drips through.
// ──────────────────────────────────────────────────────────────────────────
const FilterScene: React.FC<{
  foldStage: number;
  poured: number;
  residue: number;
  filtrate: number;
  clarity: number;
  pouring: boolean;
  muddyColor: string;
  residueColor: string;
  width: number;
  showResult: boolean;          // false during predict → hide residue + filtrate
  residueLabel: string;
  filtrateLabel: string;
}> = ({ foldStage, poured, residue, filtrate, clarity, pouring, muddyColor, residueColor, width, showResult, residueLabel, filtrateLabel }) => {
  const W = width;
  const H = Math.round(width * 0.78);

  // ── BEFORE the cone is in the funnel: show the paper-folding sequence centred ──
  const folding = foldStage < 3;

  // ── funnel + flask geometry (apparatus view) ──
  const cx = W * 0.5;
  const funnelTopY = H * 0.20;
  const funnelW = W * 0.40;
  const funnelH = H * 0.20;
  const stemY = funnelTopY + funnelH;       // bottom of cone / top of stem
  const stemH = H * 0.10;
  // flask
  const flaskNeckY = stemY + stemH;
  const flaskW = W * 0.42;
  const flaskH = H * 0.30;
  const flaskBottomY = flaskNeckY + flaskH;

  // filtrate colour: clear when fine pores, tinted toward muddy when coarse
  const filtrateColor = mix('#FFFFFF', muddyColor, (1 - clarity) * 0.55);
  const filtrateClear = mix('#EAF6FB', filtrateColor, 0.5);

  // residue cap height on the paper
  const residueH = funnelH * 0.34 * residue;
  // filtrate level in flask
  const liqH = flaskH * 0.74 * filtrate;

  // funnel cone path (a V) — top rim corners → stem
  const rimL = cx - funnelW / 2, rimR = cx + funnelW / 2;
  const coneTip = stemY;
  const stemX1 = cx - W * 0.018, stemX2 = cx + W * 0.018;

  // pour stream from a tilted jug at top-left into the cone
  const jugX = cx - funnelW * 0.62, jugY = funnelTopY - H * 0.10;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', borderRadius: DS.r.lg, background: 'linear-gradient(180deg,#FBFBFE,#EEF3F7)' }}>
      <defs>
        <linearGradient id="fm_steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={DS.c.steelDark} />
          <stop offset="0.5" stopColor={DS.c.steel} />
          <stop offset="1" stopColor={DS.c.steelDark} />
        </linearGradient>
        <clipPath id="fm_flaskClip">
          <path d={`M ${cx - W * 0.05} ${flaskNeckY}
            L ${cx - flaskW / 2} ${flaskBottomY - 10}
            Q ${cx - flaskW / 2} ${flaskBottomY} ${cx - flaskW / 2 + 12} ${flaskBottomY}
            L ${cx + flaskW / 2 - 12} ${flaskBottomY}
            Q ${cx + flaskW / 2} ${flaskBottomY} ${cx + flaskW / 2} ${flaskBottomY - 10}
            L ${cx + W * 0.05} ${flaskNeckY} Z`} />
        </clipPath>
        <clipPath id="fm_coneClip">
          <path d={`M ${rimL + 6} ${funnelTopY + 4} L ${stemX1} ${coneTip} L ${stemX2} ${coneTip} L ${rimR - 6} ${funnelTopY + 4} Z`} />
        </clipPath>
      </defs>

      {folding ? (
        // ===== PAPER-FOLDING SEQUENCE (foldStage 0,1,2) =====
        <g style={{ animation: 'fm_fadeInUp .35s both' }}>
          {(() => {
            const pcx = cx, pcy = H * 0.40, R = W * 0.20;
            if (foldStage === 0) {
              // flat circle
              return (
                <g>
                  <circle cx={pcx} cy={pcy} r={R} fill={DS.c.paper} stroke={DS.c.paperEdge} strokeWidth="3" />
                  <line x1={pcx} y1={pcy - R} x2={pcx} y2={pcy + R} stroke={DS.c.paperEdge} strokeWidth="2" strokeDasharray="5 5" />
                </g>
              );
            }
            if (foldStage === 1) {
              // half — semicircle
              return (
                <g>
                  <path d={`M ${pcx - R} ${pcy} A ${R} ${R} 0 0 1 ${pcx + R} ${pcy} Z`} fill={DS.c.paper} stroke={DS.c.paperEdge} strokeWidth="3" />
                  <line x1={pcx} y1={pcy} x2={pcx} y2={pcy - R} stroke={DS.c.paperEdge} strokeWidth="2" strokeDasharray="5 5" />
                </g>
              );
            }
            // quarter — wedge
            return (
              <g>
                <path d={`M ${pcx} ${pcy} L ${pcx} ${pcy - R} A ${R} ${R} 0 0 1 ${pcx + R} ${pcy} Z`} fill={DS.c.paper} stroke={DS.c.paperEdge} strokeWidth="3" />
              </g>
            );
          })()}
        </g>
      ) : (
        // ===== ASSEMBLED APPARATUS (foldStage 3) =====
        <g style={{ animation: 'fm_fadeInUp .35s both' }}>
          {/* tripod stand legs */}
          <g stroke="url(#fm_steel)" strokeWidth={W * 0.018} strokeLinecap="round" fill="none">
            <line x1={cx} y1={funnelTopY + funnelH * 0.5} x2={cx - W * 0.30} y2={flaskBottomY + H * 0.04} />
            <line x1={cx} y1={funnelTopY + funnelH * 0.5} x2={cx + W * 0.30} y2={flaskBottomY + H * 0.04} />
            {/* support ring under the funnel */}
            <line x1={cx - funnelW * 0.42} y1={stemY + H * 0.005} x2={cx + funnelW * 0.42} y2={stemY + H * 0.005} strokeWidth={W * 0.012} />
          </g>

          {/* CONICAL FLASK (drawn behind the stem) */}
          <path d={`M ${cx - W * 0.05} ${flaskNeckY}
            L ${cx - flaskW / 2} ${flaskBottomY - 10}
            Q ${cx - flaskW / 2} ${flaskBottomY} ${cx - flaskW / 2 + 12} ${flaskBottomY}
            L ${cx + flaskW / 2 - 12} ${flaskBottomY}
            Q ${cx + flaskW / 2} ${flaskBottomY} ${cx + flaskW / 2} ${flaskBottomY - 10}
            L ${cx + W * 0.05} ${flaskNeckY} Z`}
            fill={DS.c.glass} stroke={DS.c.steel} strokeWidth="3" />
          {/* filtrate inside the flask */}
          {showResult && filtrate > 0.001 && (
            <g clipPath="url(#fm_flaskClip)">
              <rect x={cx - flaskW / 2} y={flaskBottomY - liqH} width={flaskW} height={liqH}
                fill={filtrateClear} style={{ transition: 'height .25s linear, y .25s linear, fill .4s ease' }} />
              {/* faint cloudiness if pores are coarse */}
              {clarity < 0.85 && (
                <rect x={cx - flaskW / 2} y={flaskBottomY - liqH} width={flaskW} height={liqH}
                  fill={residueColor} opacity={(1 - clarity) * 0.35} />
              )}
            </g>
          )}
          {/* flask neck rim */}
          <rect x={cx - W * 0.055} y={flaskNeckY - 4} width={W * 0.11} height="6" rx="3" fill={DS.c.steel} />

          {/* FUNNEL CONE (glass V) */}
          <path d={`M ${rimL} ${funnelTopY} L ${stemX1} ${coneTip} L ${stemX1} ${stemY + stemH} L ${stemX2} ${stemY + stemH} L ${stemX2} ${coneTip} L ${rimR} ${funnelTopY} Z`}
            fill={DS.c.glass} stroke={DS.c.steel} strokeWidth="3" />
          {/* filter-paper cone lining the funnel */}
          <path d={`M ${rimL + 6} ${funnelTopY + 4} L ${stemX1 + 1} ${coneTip - 2} L ${stemX2 - 1} ${coneTip - 2} L ${rimR - 6} ${funnelTopY + 4}`}
            fill={DS.c.paper} stroke={DS.c.paperEdge} strokeWidth="2" />

          {/* muddy water sitting in the cone (above the residue) while pouring */}
          <g clipPath="url(#fm_coneClip)">
            {pouring && poured > 0.02 && poured < 0.98 && (
              <rect x={rimL} y={funnelTopY + funnelH * (0.30 - poured * 0.1)} width={funnelW}
                height={funnelH * 0.5} fill={muddyColor} opacity={clamp(1 - poured, 0.25, 1)}
                style={{ transition: 'opacity .25s linear, y .25s linear' }} />
            )}
            {/* RESIDUE: mud cap building up on the paper */}
            {showResult && residue > 0.01 && (
              <path d={`M ${cx - funnelW * 0.30} ${stemY - residueH * 0.2}
                Q ${cx} ${stemY - residueH - 6} ${cx + funnelW * 0.30} ${stemY - residueH * 0.2}
                L ${stemX2} ${coneTip} L ${stemX1} ${coneTip} Z`}
                fill={residueColor} style={{ transition: 'd .3s ease' }} />
            )}
          </g>

          {/* DRIP from the stem into the flask while filtering */}
          {pouring && poured > 0.12 && poured < 0.99 && (
            <>
              <circle cx={cx} cy={stemY + stemH + 6} r={W * 0.012} fill={filtrateClear}
                style={{ animation: 'fm_drip 0.7s ease-in infinite' }} />
              <circle cx={cx} cy={stemY + stemH + 6} r={W * 0.012} fill={filtrateClear}
                style={{ animation: 'fm_drip 0.7s 0.35s ease-in infinite' }} />
            </>
          )}

          {/* POUR STREAM from a tilted jug into the cone */}
          {pouring && poured < 0.7 && (
            <>
              <g transform={`rotate(38 ${jugX} ${jugY})`}>
                <rect x={jugX - W * 0.05} y={jugY - H * 0.03} width={W * 0.1} height={H * 0.075} rx="6" fill={muddyColor} stroke={DS.c.mudDark} strokeWidth="2" />
                <rect x={jugX - W * 0.05} y={jugY - H * 0.03} width={W * 0.1} height="6" rx="3" fill={DS.c.mudDark} opacity="0.4" />
              </g>
              <path d={`M ${jugX + W * 0.04} ${jugY + H * 0.005} Q ${cx - funnelW * 0.18} ${funnelTopY - H * 0.02} ${cx - funnelW * 0.04} ${funnelTopY + 6}`}
                fill="none" stroke={muddyColor} strokeWidth={W * 0.018} strokeLinecap="round"
                style={{ animation: 'fm_pulse 0.6s ease-in-out infinite' }} />
            </>
          )}

          {/* labels (only once the result shows) */}
          {showResult && residue > 0.2 && (
            <g style={{ animation: 'fm_popIn .4s both' }}>
              <text x={rimR + 4} y={funnelTopY + funnelH * 0.7} fontFamily={DS.font} fontWeight="700" fontSize={W * 0.03} fill={DS.c.mudDark}>{residueLabel}</text>
              <text x={rimR + 4} y={funnelTopY + funnelH * 0.7 + W * 0.034} fontFamily={DS.font} fontSize={W * 0.024} fill={DS.c.gray700}>(residue)</text>
            </g>
          )}
          {showResult && filtrate > 0.2 && (
            <g style={{ animation: 'fm_popIn .4s both' }}>
              <text x={cx + flaskW / 2 + 4} y={flaskBottomY - liqH / 2} fontFamily={DS.font} fontWeight="700" fontSize={W * 0.03} fill={DS.c.teal}>{filtrateLabel}</text>
              <text x={cx + flaskW / 2 + 4} y={flaskBottomY - liqH / 2 + W * 0.034} fontFamily={DS.font} fontSize={W * 0.024} fill={DS.c.gray700}>(filtrate)</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
};

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
      id: 'q_residue',
      storyPrompt: story ? 'You just filtered muddy water through the paper cone.' : undefined,
      prompt: 'The mud left behind ON the filter paper is called the…',
      options: ['Residue', 'Filtrate'],
      correctAnswer: 'Residue',
      conceptExplanation:
        'The solid that stays on the filter paper is the RESIDUE. The clear liquid that passes through and collects below is the FILTRATE. Here the mud is the residue; the clear water is the filtrate.',
    },
    {
      id: 'q_filtrate',
      prompt: 'The clear water that collects in the flask below is called the…',
      options: ['Filtrate', 'Residue'],
      correctAnswer: 'Filtrate',
      conceptExplanation:
        'The liquid that passes THROUGH the filter is the FILTRATE. The mud trapped on top is the residue. Filtrate passes through, residue stays behind.',
    },
    {
      id: 'q_what',
      prompt: 'Filtration is used to separate…',
      options: ['An insoluble solid from a liquid', 'A dissolved salt from water'],
      correctAnswer: 'An insoluble solid from a liquid',
      conceptExplanation:
        'Filtration separates an INSOLUBLE solid (like mud, which does not dissolve) from a liquid — the solid is too big to pass the pores. A dissolved (soluble) salt slips through with the water, so filtering cannot separate it; you would evaporate the water instead.',
    },
    {
      id: 'q_pore',
      storyPrompt: story ? 'You compare a cloth filter with a filter paper.' : undefined,
      prompt: 'Which gives CLEARER filtrate?',
      options: ['Finer pores (filter paper)', 'Coarser pores (loose cloth)'],
      correctAnswer: 'Finer pores (filter paper)',
      conceptExplanation:
        'Finer pores trap more of the tiny particles, so the filtrate comes out clearer. Loose cloth has bigger pores, so some fine mud slips through and the water stays a bit cloudy. The choice of filter depends on the size of the particles to remove.',
    },
    {
      id: 'q_everyday',
      storyPrompt: story ? 'Think about everyday filters at home.' : undefined,
      prompt: 'Which of these can also be used as a filter?',
      options: ['Cotton, charcoal or sand', 'Sugar dissolved in water'],
      correctAnswer: 'Cotton, charcoal or sand',
      conceptExplanation:
        'Cotton, charcoal and sand all have fine gaps that let water through but trap solids — a tea bag is a tiny cloth/paper filter too. Sugar dissolved in water is a solution, not a filter, and it cannot be filtered out because it has dissolved.',
    },
  ];
  const withShuffledOpts = bank.map((c) => ({ ...c, options: shuffle(c.options, rng) }));
  return shuffle(withShuffledOpts, rng).slice(0, 4);
}

// ==================== MAIN COMPONENT ====================

const FilterMuddyWaterSimulator: React.FC<ToolProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w: containerW, isMobile } = useResponsive(rootRef);

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
    pore: ap.pore ?? 'paper' as PoreType,
    liquidLabel: ap.liquidLabel ?? 'muddy water',
    residueLabel: ap.residueLabel ?? 'mud',
    filtrateLabel: ap.filtrateLabel ?? 'clear water',
    muddyColor: ap.muddyColor ?? DS.c.muddy,
    residueColor: ap.residueColor ?? DS.c.mud,
    showHints: ap.showHints ?? true,
    feedbackMessage: ap.feedbackMessage,
    predictionPrompt: ap.predictionPrompt ?? 'Will the mud pass THROUGH the filter paper, or be held back?',
  }), [ap]);

  // ── filterSteps: freeze Explore on one screen (S1..S4), hides nav ──
  // S1 Fold the paper · S2 Predict · S3 Pour & filter · S4 Name the parts (wrap)
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
  const sceneW = clamp(Math.min(containerW - (isMobile ? 36 : 52), 520), 280, 520);

  // ──────────────── EXPLORE state ────────────────
  // 4 screens: 0 fold · 1 predict · 2 pour&filter · 3 wrap
  const LEARN_SCREENS = ['fold', 'predict', 'pour', 'wrap'] as const;
  const [learnScreen, setLearnScreen] = useState<number>(forcedScreen ?? 0);

  const [foldStage, setFoldStage] = useState(0);     // 0..3
  const [pore, setPore] = useState<PoreType>(theme.pore);
  const [poured, setPoured] = useState(0);           // 0..1
  const [residue, setResidue] = useState(0);         // 0..1
  const [filtrate, setFiltrate] = useState(0);       // 0..1
  const [pouring, setPouring] = useState(false);
  const [predicted, setPredicted] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);
  const clarity = pore === 'paper' ? 1 : 0.55;

  // ──────────────── PRACTICE state ────────────────
  const [sessionSeed, setSessionSeed] = useState(() => 0xF11732);
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
    el.id = 'fm-keyframes';
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('fm-keyframes'); if (e) e.remove(); };
  }, []);

  // ── interactive tool: tell host not to auto-advance ──
  useEffect(() => { setStopAutoNext?.(true); }, [setStopAutoNext]);

  // ── host re-freeze on a step → jump there & set sensible physics ──
  useEffect(() => {
    if (forcedScreen == null) return;
    setLearnScreen(forcedScreen);
    if (forcedScreen === 0) { setFoldStage(0); setPoured(0); setResidue(0); setFiltrate(0); setPouring(false); }
    else if (forcedScreen === 1) { setFoldStage(3); setPoured(0); setResidue(0); setFiltrate(0); setPouring(false); }
    else { setFoldStage(3); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedScreen]);

  // ── apply additionalProps initial overrides on mount ──
  useEffect(() => {
    if (ap.pore) setPore(ap.pore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── report step details ──
  useEffect(() => {
    const cur = mode === 'learn' ? learnScreen + 1 : qIndex + 1;
    const total = mode === 'learn' ? LEARN_SCREENS.length : challenges.length;
    setStepDetails?.({ currentStep: cur, totalSteps: total, isPaused: true, currentMode: mode });
  }, [mode, learnScreen, qIndex, challenges.length, LEARN_SCREENS.length, setStepDetails]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── fold the paper (3 taps to make the cone) ──
  const foldOnce = useCallback(() => {
    setFoldStage((s) => Math.min(3, s + 1));
  }, []);

  // ── pour & filter animation ──
  const runPour = useCallback(() => {
    if (pouring || foldStage < 3) return;
    setPouring(true);
    setPoured(0); setResidue(0); setFiltrate(0);
    const start = performance.now();
    const dur = tier.pourMs;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const e = easeOutCubic(p);
      setPoured(e);
      // residue builds a touch ahead, filtrate trails slightly
      setResidue(clamp(e * 1.05, 0, 1));
      setFiltrate(clamp((e - 0.08) / 0.92, 0, 1));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { setPoured(1); setResidue(1); setFiltrate(1); setPouring(false); }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [pouring, foldStage, tier.pourMs]);

  const resetApparatus = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPouring(false); setPoured(0); setResidue(0); setFiltrate(0);
  };

  const gotoScreen = (n: number) => {
    const next = clamp(n, 0, LEARN_SCREENS.length - 1);
    if (next === 0) { setFoldStage(0); resetApparatus(); }
    if (next === 1) { if (foldStage < 3) setFoldStage(3); resetApparatus(); }
    if (next === 2) { setFoldStage(3); resetApparatus(); }
    if (next === 3) { setFoldStage(3); setPoured(1); setResidue(1); setFiltrate(1); setPouring(false); }
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
    else { setLearnScreen(forcedScreen ?? 0); setFoldStage(forcedScreen != null && forcedScreen > 0 ? 3 : 0); resetApparatus(); }
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
  const sceneWrap = (showResult: boolean, caption?: string) => (
    <div style={{ background: DS.c.gray100, borderRadius: DS.r.xl, padding: isMobile ? 14 : 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ width: '100%', maxWidth: sceneW }}>
        <FilterScene
          foldStage={foldStage} poured={poured} residue={residue} filtrate={filtrate}
          clarity={clarity} pouring={pouring} muddyColor={theme.muddyColor} residueColor={theme.residueColor}
          width={sceneW} showResult={showResult} residueLabel={theme.residueLabel} filtrateLabel={theme.filtrateLabel} />
      </div>
      {caption && <div style={{ fontFamily: DS.font, fontSize: 14, color: DS.c.gray700, textAlign: 'center', minHeight: 20 }}>{caption}</div>}
    </div>
  );

  // pore selector (shared on pour screen)
  const PoreSelector: React.FC = () => (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
      {(['paper', 'cloth'] as PoreType[]).map((p) => {
        const sel = pore === p;
        const label = p === 'paper' ? 'Filter paper (fine pores)' : 'Loose cloth (coarse pores)';
        return (
          <button key={p} onClick={() => { setPore(p); if (filtrate > 0) resetApparatus(); }}
            style={{
              minHeight: 44, padding: '0 16px', borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700, fontSize: 13,
              cursor: 'pointer', border: `2px solid ${sel ? DS.c.primary : DS.c.gray200}`,
              background: sel ? DS.c.primaryGhost : '#fff', color: sel ? DS.c.primaryDark : DS.c.gray900,
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );

  // ---------- EXPLORE screens ----------
  const renderFold = () => {
    const done = foldStage >= 3;
    const labels = ['Flat circle of filter paper', 'Fold in half', 'Fold again into a quarter', 'Open into a cone & seat in the funnel'];
    return (
      <div style={{ animation: 'fm_fadeInUp .4s both' }}>
        {tier.storyFrame && story('Dada has muddy water from the pond. First we make a filter-paper cone!')}
        {sectionTitle('Step 1 — Fold the filter paper into a cone')}
        {instruction('Tap “Fold” to fold the round filter paper: half → quarter → open it into a cone and drop it into the funnel.')}
        {sceneWrap(true, labels[foldStage])}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          {!done
            ? <PillButton label={foldStage === 0 ? 'Fold the paper' : foldStage === 1 ? 'Fold again' : 'Open into a cone'}
                icon={<Hand size={18} />} color={DS.c.primary} minH={tier.touchTargetMobile} onClick={foldOnce} />
            : <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: DS.c.success, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Check size={20} strokeWidth={3} /> Cone is ready in the funnel — now we can pour.
              </div>}
        </div>
      </div>
    );
  };

  const renderPredict = () => {
    const opts = ['Mud passes through', 'Mud is held back'];
    return (
      <div style={{ animation: 'fm_fadeInUp .4s both' }}>
        {sectionTitle('Predict first 🤔')}
        {instruction(theme.predictionPrompt)}
        {sceneWrap(false, 'The cone is ready. Imagine pouring the muddy water in…')}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {opts.map((o) => {
            const sel = predicted === o;
            return (
              <button key={o} onClick={() => setPredicted(o)} disabled={!!predicted}
                style={{
                  flex: 1, minWidth: 150, minHeight: tier.touchTargetMobile, borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700,
                  fontSize: bodyFont, cursor: predicted ? 'default' : 'pointer',
                  border: `2px solid ${sel ? DS.c.primary : DS.c.gray200}`,
                  background: sel ? DS.c.primaryGhost : '#fff', color: sel ? DS.c.primaryDark : DS.c.gray900,
                  animation: sel && tier.pulseOnCorrect ? 'fm_pulse .5s' : undefined,
                }}>
                {o}
              </button>
            );
          })}
        </div>
        {predicted && (
          <div style={{ marginTop: 14, padding: 14, background: DS.c.primaryGhost, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900, animation: 'fm_popIn .4s both' }}>
            You predicted the mud will <b>{predicted === opts[0] ? 'pass through' : 'be held back'}</b>. Let's pour and find out where the mud and the clear water actually end up!
          </div>
        )}
      </div>
    );
  };

  const renderPour = () => {
    const done = filtrate >= 0.999 && !pouring;
    return (
      <div style={{ animation: 'fm_fadeInUp .4s both' }}>
        {sectionTitle('Step 2 — Pour the muddy water & filter')}
        {instruction('Press “Pour” to tip the muddy water into the cone. Watch the mud stay on the paper while clear water drips down into the flask. Try a loose cloth too — see how clear the water comes out.')}
        {sceneWrap(true,
          pouring ? 'Filtering… mud stays on the paper, clear water drips through.'
            : done ? (pore === 'paper' ? 'Done! Mud = residue on the paper, clear water = filtrate in the flask. ✨' : 'Done — but loose cloth let some fine mud through, so the water is a bit cloudy.')
            : theme.feedbackMessage ?? 'Press “Pour” to start filtering.')}
        <div style={{ marginTop: 14 }}><PoreSelector /></div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          {!done
            ? <PillButton label={pouring ? 'Pouring…' : 'Pour muddy water'} icon={<Droplets size={18} />}
                color={DS.c.accent} disabled={pouring} minH={tier.touchTargetMobile} onClick={runPour} />
            : <PillButton label="Pour again" variant="outlined" color={DS.c.primary} icon={<RotateCcw size={16} />} minH={tier.touchTargetMobile} onClick={runPour} />}
        </div>
      </div>
    );
  };

  const renderWrap = () => (
    <div style={{ animation: 'fm_fadeInUp .4s both' }}>
      {sectionTitle('Name the two parts 🌟')}
      {instruction('The filtering is done. Look where everything ended up:')}
      {sceneWrap(true, 'Mud on the paper · clear water in the flask')}
      <div style={{ marginTop: 16, padding: 14, background: DS.c.accentLight, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900, animation: 'fm_popIn .4s both' }}>
        <b>The rule:</b> the mud trapped on the filter paper is the <b style={{ color: DS.c.mudDark }}>residue</b>; the clear water that passed through is the <b style={{ color: DS.c.teal }}>filtrate</b>. <b style={{ color: DS.c.primary }}>Filtration</b> separates an <b>insoluble</b> solid (mud) from a liquid. Finer pores → clearer filtrate.
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
        <PillButton label="Take the Quiz!" icon={<Play size={18} />} color={DS.c.accent} minH={tier.touchTargetMobile}
          fontSize={bodyFont + 1} onClick={() => switchMode('practice')} />
      </div>
    </div>
  );

  // ---------- EXPLORE shell + nav ----------
  const screenRenderers = [renderFold, renderPredict, renderPour, renderWrap];

  const canGoNext = () => {
    if (learnScreen === 0) return foldStage >= 3;        // must build the cone
    if (learnScreen === 1) return !!predicted;           // must predict
    if (learnScreen === 2) return filtrate >= 0.999;     // must filter
    return true;
  };
  const nextHint = () => {
    if (learnScreen === 0) return 'Finish folding the cone to continue';
    if (learnScreen === 1) return 'Make a prediction to continue';
    if (learnScreen === 2) return 'Pour the water to finish filtering';
    return '';
  };

  const renderLearn = () => {
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
      <div style={{ animation: 'fm_fadeInUp .35s both' }} key={qIndex}>
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
                  animation: sel && tier.pulseOnCorrect ? 'fm_pulse .5s' : undefined, lineHeight: 1.4,
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
        maxWidth: 420, width: '100%', textAlign: 'center', animation: 'fm_scaleInBack .6s both',
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
      <div style={{ animation: 'fm_fadeInUp .35s both' }}>
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
              <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 23, letterSpacing: 0.2 }}>Filter the Muddy Water</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>Fold the paper, pour, and watch mud stay while clear water passes</div>
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

export default FilterMuddyWaterSimulator;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════
