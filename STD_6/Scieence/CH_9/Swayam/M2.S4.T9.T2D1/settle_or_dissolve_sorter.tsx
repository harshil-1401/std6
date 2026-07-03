// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: settle_or_dissolve_sorter.tsx
// Topic M2.S4.T9 — "Soluble or insoluble? Will it settle?"
// Grade tier: 6 (heavy gamification, story framing, playful tone)
// Interactions: tap/click only (no drag-drop). Singularity palette. Poppins.
// Single Explore flow: for each of 8 substances → drop in water → predict
//   'settles at the bottom' vs 'stays dissolved' → green tick / one-line hint.
//   Final card shows a summary scorecard (stars + confetti) before "Start over".
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

const ChevronLeft = mkIcon(<path d="m15 18-6-6 6-6" />);
const ChevronRight = mkIcon(<path d="m9 18 6-6-6-6" />);
const RotateCcw = mkIcon(<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>);
const Check = mkIcon(<path d="M20 6 9 17l-5-5" />);
const X = mkIcon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const Star = mkIcon(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />, { solid: true });
const Award = mkIcon(<><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></>);
const Droplets = mkIcon(<><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></>);

// ==================== TYPE DEFINITIONS ====================

type GradeLevel = 6 | 7 | 8;
type Outcome = 'settles' | 'dissolves';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: 'learn';
}

interface Substance {
  slug: string;
  name: string;
  emoji: string;
  outcome: Outcome;       // 'settles' (insoluble) | 'dissolves' (soluble)
  color: string;          // particle / sediment tint
  solutionTint: string;   // colour the water becomes after a soluble substance dissolves
  hint: string;           // one-line explanation shown on a wrong answer
}

// ── additionalProps the host/agent may pass ──
interface SorterAdditionalProps {
  substances?: (string | Substance)[];   // override / re-order the cards
  feedbackMessage?: string;
  showHints?: boolean;
}

interface ToolProps {
  props?: {
    width?: number;
    height?: number;
    data?: any;
    steps?: any[];
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
    additionalProps?: SorterAdditionalProps;
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
    pink: '#DB2777', deepBlue: '#1E40AF', forest: '#166534', water: '#CDE7F5', waterDeep: '#A9D6EA',
    glass: '#E8F0F4', steel: '#B7BFC9',
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

// ==================== SUBSTANCE LIBRARY ====================
// The eight cards from the brief. outcome: 'settles' = insoluble; 'dissolves' = soluble.

const SUBSTANCE_LIBRARY: Record<string, Substance> = {
  salt:         { slug: 'salt',         name: 'Salt',         emoji: '🧂', outcome: 'dissolves', color: '#94A3B8', solutionTint: '#EAF4FB', hint: 'Salt dissolves in water — it spreads through and disappears, so it never settles.' },
  sand:         { slug: 'sand',         name: 'Sand',         emoji: '⏳', outcome: 'settles',   color: '#C2A878', solutionTint: '#E3D9C4', hint: 'Sand is insoluble — it does not dissolve, so the heavier grains sink to the bottom.' },
  tea_leaves:   { slug: 'tea_leaves',   name: 'Tea leaves',   emoji: '🍵', outcome: 'settles',   color: '#5A3A1A', solutionTint: '#C9A06B', hint: 'Tea leaves are insoluble and heavier than water, so they settle at the bottom.' },
  sugar:        { slug: 'sugar',        name: 'Sugar',        emoji: '🍬', outcome: 'dissolves', color: '#E2C290', solutionTint: '#EAF4FB', hint: 'Sugar dissolves in water — it disappears into the liquid, so nothing settles.' },
  chalk_powder: { slug: 'chalk_powder', name: 'Chalk powder', emoji: '🪨', outcome: 'settles',   color: '#E5E7EB', solutionTint: '#EDEEF2', hint: 'Chalk does not dissolve — the fine powder is insoluble and slowly settles down.' },
  lemon_juice:  { slug: 'lemon_juice',  name: 'Lemon juice',  emoji: '🍋', outcome: 'dissolves', color: '#FDE047', solutionTint: '#FBF5D0', hint: 'Lemon juice mixes completely with water (it is soluble/miscible), so nothing settles.' },
  chalk_pieces: { slug: 'chalk_pieces', name: 'Chalk pieces', emoji: '◻️', outcome: 'settles',   color: '#E5E7EB', solutionTint: '#EDEEF2', hint: 'Chalk is insoluble — the solid pieces do not dissolve, so they sink to the bottom.' },
  mud:          { slug: 'mud',          name: 'Mud',          emoji: '🟤', outcome: 'settles',   color: '#8B5E34', solutionTint: '#C4A678', hint: 'Mud is insoluble — given time the heavier particles settle, leaving clearer water above.' },
};

const DEFAULT_ORDER = ['salt', 'sand', 'tea_leaves', 'sugar', 'chalk_powder', 'lemon_juice', 'chalk_pieces', 'mud'];

const FALLBACK_SUB = (slug: string): Substance => ({
  slug, name: slug.replace(/_/g, ' '), emoji: '⚗️', outcome: 'settles',
  color: DS.c.primary, solutionTint: '#E3D9C4', hint: 'Insoluble substances settle; soluble ones dissolve and stay in the water.',
});
const resolveSub = (entry: string | Substance): Substance =>
  typeof entry === 'string'
    ? (SUBSTANCE_LIBRARY[entry] || FALLBACK_SUB(entry))
    : { ...FALLBACK_SUB(entry.slug || 'item'), ...entry };

// ==================== EASING / HELPERS ====================

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ==================== RESPONSIVE HOOK ====================
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
@keyframes so_fadeInUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes so_popIn { 0% { opacity: 0; transform: scale(0.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes so_shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
@keyframes so_scaleInBack { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
@keyframes so_pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes so_glow { 0%,100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); } 50% { box-shadow: 0 0 0 10px rgba(46,204,113,0.28); } }
@keyframes so_starPop { 0% { opacity: 0; transform: scale(0) rotate(-30deg); } 70% { transform: scale(1.25) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes so_confetti { 0% { opacity: 1; transform: translateY(-10px) rotate(0); } 100% { opacity: 0; transform: translateY(440px) rotate(540deg); } }
@keyframes so_drift { 0% { transform: translateY(0); } 50% { transform: translateY(-3px); } 100% { transform: translateY(0); } }
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
          animation: `so_confetti ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
};

const StarsRow: React.FC<{ count: number; stagger: number }> = ({ count, stagger }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '6px 0 4px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} size={34} fill={DS.c.amber} color={DS.c.amber}
        style={{ animation: `so_starPop .5s ${i * (stagger / 1000)}s both` }} />
    ))}
  </div>
);

// fixed particle layout (module-level so it never re-randomises between frames)
const PARTICLES = [
  { x: 0.30, y: 0.18 }, { x: 0.55, y: 0.30 }, { x: 0.42, y: 0.50 },
  { x: 0.68, y: 0.42 }, { x: 0.25, y: 0.60 }, { x: 0.58, y: 0.66 },
  { x: 0.40, y: 0.78 }, { x: 0.72, y: 0.72 },
];

// ──────────────────────────────────────────────────────────────────────────
// GlassScene — a glass tumbler of water that a substance is dropped into.
// Driven by:
//   t         (0..1) — how far the "drop in → wait" animation has progressed
//   outcome   — 'settles' (insoluble: particles sink to a band) | 'dissolves' (soluble: water tints)
//   color / tint — particle colour / dissolved-water colour
//   revealed  (bool) — show the actual result (after the student has answered)
// While t<1 the substance is mid-swirl; at t=1 it shows the final outcome only if revealed.
// ──────────────────────────────────────────────────────────────────────────
const GlassScene: React.FC<{
  sub: Substance;
  t: number;
  revealed: boolean;
  width: number;
}> = ({ sub, t, revealed, width }) => {
  const W = width;
  const H = Math.round(width * 0.92);
  const gx = W * 0.26, gw = W * 0.48;       // glass left, width
  const gTop = H * 0.16, gBot = H * 0.92;   // glass top, bottom (inside)
  const gh = gBot - gTop;
  const waterTop = gTop + gh * 0.14;        // water surface
  const waterH = gBot - waterTop;

  const isSoluble = sub.outcome === 'dissolves';
  const settled = revealed && t >= 0.999;
  const mixing = t > 0 && t < 0.999;

  // water colour: soluble shows its solutionTint once settled; insoluble stays clear-ish
  const waterColor = settled
    ? (isSoluble ? sub.solutionTint : DS.c.water)
    : DS.c.water;

  // sediment band height for insoluble (settled at bottom)
  const sedimentH = settled && !isSoluble ? waterH * 0.16 : 0;
  // suspended cloud while swirling
  const cloud = mixing ? Math.sin(t * Math.PI) : 0;

  // the falling substance blob before it hits the water (t<0.18)
  const dropProg = clamp(t / 0.18, 0, 1);
  const dropY = gTop - H * 0.08 + (waterTop - (gTop - H * 0.08)) * dropProg;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', borderRadius: DS.r.lg, background: 'linear-gradient(180deg,#FBFBFE,#EEF3F7)' }}>
      <defs>
        <clipPath id="so_glassClip">
          <path d={`M ${gx} ${gTop} L ${gx + gw * 0.06} ${gBot - 8} Q ${gx + gw * 0.06} ${gBot} ${gx + gw * 0.06 + 8} ${gBot}
            L ${gx + gw - gw * 0.06 - 8} ${gBot} Q ${gx + gw - gw * 0.06} ${gBot} ${gx + gw - gw * 0.06} ${gBot - 8} L ${gx + gw} ${gTop} Z`} />
        </clipPath>
      </defs>

      {/* table line */}
      <rect x="0" y={gBot + 6} width={W} height="8" fill="#E7E2D6" />

      {/* glass body */}
      <path d={`M ${gx} ${gTop} L ${gx + gw * 0.06} ${gBot - 8} Q ${gx + gw * 0.06} ${gBot} ${gx + gw * 0.06 + 8} ${gBot}
        L ${gx + gw - gw * 0.06 - 8} ${gBot} Q ${gx + gw - gw * 0.06} ${gBot} ${gx + gw - gw * 0.06} ${gBot - 8} L ${gx + gw} ${gTop} Z`}
        fill={DS.c.glass} stroke={DS.c.steel} strokeWidth="3" />

      <g clipPath="url(#so_glassClip)">
        {/* water body */}
        <rect x={gx - 4} y={waterTop} width={gw + 8} height={waterH} fill={waterColor}
          style={{ transition: 'fill .6s ease' }} />
        {/* dissolving tint sweeping in for soluble while mixing */}
        {mixing && isSoluble && (
          <rect x={gx - 4} y={waterTop} width={gw + 8} height={waterH} fill={sub.solutionTint} opacity={t}
            style={{ transition: 'opacity .25s linear' }} />
        )}
        {/* suspended cloud of insoluble particles while swirling */}
        {mixing && !isSoluble && cloud > 0.02 && (
          <g opacity={cloud}>
            {PARTICLES.map((p, i) => (
              <circle key={i}
                cx={gx + 8 + p.x * (gw - 16)}
                cy={waterTop + 8 + p.y * (waterH - 16)}
                r={W * 0.014} fill={sub.color} opacity="0.85"
                style={{ animation: `so_drift ${1 + p.x}s ease-in-out infinite` }} />
            ))}
          </g>
        )}
        {/* settled sediment band (insoluble, after wait) */}
        {sedimentH > 0 && (
          <rect x={gx - 4} y={gBot - sedimentH} width={gw + 8} height={sedimentH} fill={sub.color}
            style={{ transition: 'height .4s ease, y .4s ease' }} />
        )}
        {/* a few particles still drifting down while settling */}
        {revealed && !isSoluble && t > 0.4 && t < 0.99 &&
          PARTICLES.slice(0, 5).map((p, i) => (
            <circle key={'d' + i}
              cx={gx + 10 + p.x * (gw - 20)}
              cy={waterTop + (gBot - waterTop) * (0.2 + p.y * 0.6) * t}
              r={W * 0.012} fill={sub.color} opacity="0.8"
              style={{ animation: `so_drift ${1.2 + p.x}s ease-in-out infinite` }} />
          ))}
        {/* shine */}
        <rect x={gx + 10} y={gTop + 8} width={7} height={gh * 0.55} rx={6} fill="rgba(255,255,255,0.5)" />
      </g>

      {/* water surface line */}
      <line x1={gx + 1} y1={waterTop} x2={gx + gw - 1} y2={waterTop} stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />

      {/* the substance dropping in (only at the very start) */}
      {t < 0.18 && (
        <text x={gx + gw / 2} y={dropY} textAnchor="middle" fontSize={W * 0.10}
          style={{ filter: 'drop-shadow(0 2px 3px rgba(26,26,46,0.25))' }}>{sub.emoji}</text>
      )}

      {/* the substance label + emoji on a chip above the glass */}
      <g transform={`translate(${gx + gw / 2}, ${H * 0.07})`}>
        <text x="0" y="0" textAnchor="middle" fontFamily={DS.font} fontWeight="700" fontSize={W * 0.045} fill={DS.c.gray900}>
          {sub.emoji} {sub.name}
        </text>
      </g>
    </svg>
  );
};

// ==================== MAIN COMPONENT ====================

const SettleOrDissolveSorter: React.FC<ToolProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w: containerW, isMobile } = useResponsive(rootRef);

  const config = useMemo(() => ({
    width: props.width ?? 840,
    gradeLevel: (props.gradeLevel ?? 6) as GradeLevel,
    themeColor: props.themeColor ?? DS.c.primary,
  }), [props]);

  // tier presets
  const tier = useMemo(() => {
    const g = config.gradeLevel;
    if (g === 8) return { confettiCount: 15, confettiDuration: 1500, showStars: false, starCount: 0, starStaggerMs: 0, scoreSizePx: 48, bodyFontMobile: 15, bodyFontDesktop: 16, touchTargetMobile: 48, pulseOnCorrect: false, storyFrame: false, settleMs: 1900, encouragement: { high: 'Excellent — you can tell soluble from insoluble.', mid: 'Good — revisit the ones you missed.', low: 'Work through the explanations carefully.' } };
    if (g === 7) return { confettiCount: 40, confettiDuration: 2000, showStars: true, starCount: 5, starStaggerMs: 200, scoreSizePx: 56, bodyFontMobile: 15, bodyFontDesktop: 16, touchTargetMobile: 50, pulseOnCorrect: false, settleMs: 2400, storyFrame: false, encouragement: { high: 'Strong work — concept locked.', mid: 'Good job. A couple to polish.', low: "Let's walk through these — you'll get it." } };
    return { confettiCount: 70, confettiDuration: 2500, showStars: true, starCount: 5, starStaggerMs: 200, scoreSizePx: 64, bodyFontMobile: 16, bodyFontDesktop: 17, touchTargetMobile: 56, pulseOnCorrect: true, settleMs: 2900, storyFrame: true, encouragement: { high: 'Brilliant! You sorted them all!', mid: 'Nice work! Have another go at the tricky ones.', low: "Every drop teaches something — try once more!" } };
  }, [config.gradeLevel]);

  const ap = props.additionalProps || {};
  const substances = useMemo<Substance[]>(
    () => (ap.substances && ap.substances.length ? ap.substances : DEFAULT_ORDER).map(resolveSub),
    [ap.substances],
  );
  const showHints = ap.showHints ?? true;

  const bodyFont = isMobile ? tier.bodyFontMobile : tier.bodyFontDesktop;
  const sceneW = clamp(Math.min(containerW - (isMobile ? 36 : 52), 320), 220, 320);

  // ── per-card animation (drop in → wait) ──
  const [t, setT] = useState(0);
  const [animating, setAnimating] = useState(false);
  const rafRef = useRef<number | null>(null);

  // run the drop+settle animation for the current card
  const runAnim = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setAnimating(true);
    setT(0);
    const start = performance.now();
    const dur = tier.settleMs;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setT(easeOutCubic(p));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { setT(1); setAnimating(false); }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [tier.settleMs]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ──────────────── EXPLORE state ────────────────
  const [idx, setIdx] = useState(0);                                  // current card
  const [picks, setPicks] = useState<(Outcome | null)[]>(() => substances.map(() => null));
  const [done, setDone] = useState(false);                            // reached the summary scorecard
  const [scoreShown, setScoreShown] = useState(0);
  const sub = substances[idx];
  const pick = picks[idx] ?? null;
  const locked = pick !== null;
  const isCorrect = pick === sub?.outcome;

  // reset picks if the substance set changes
  useEffect(() => {
    setPicks(substances.map(() => null));
    setIdx(0);
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [substances]);

  // drop the new card in whenever the card changes (and we're not on the summary)
  useEffect(() => {
    if (done) return;
    runAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done]);

  // ── inject fonts + keyframes ──
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'so-keyframes';
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('so-keyframes'); if (e) e.remove(); };
  }, []);

  // interactive tool → tell host not to auto-advance
  useEffect(() => { setStopAutoNext?.(true); }, [setStopAutoNext]);

  // report step details
  useEffect(() => {
    setStepDetails?.({
      currentStep: done ? substances.length : idx + 1,
      totalSteps: substances.length,
      isPaused: true,
      currentMode: 'learn',
    });
  }, [idx, done, substances.length, setStepDetails]);

  // ── score ──
  const score = useMemo(() => substances.reduce((s, sb, i) => s + (picks[i] === sb.outcome ? 1 : 0), 0), [picks, substances]);
  const pct = score / Math.max(substances.length, 1);
  const encouragement = pct >= 0.9 ? tier.encouragement.high : pct >= 0.6 ? tier.encouragement.mid : tier.encouragement.low;

  // animate the summary score count-up
  useEffect(() => {
    if (!done) return;
    setScoreShown(0);
    const start = performance.now(); const dur = 1200; let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setScoreShown(Math.round(easeOutCubic(p) * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done, score]);

  // ── answering ──
  const answer = (choice: Outcome) => {
    if (locked) return;
    setPicks((prev) => { const next = [...prev]; next[idx] = choice; return next; });
  };

  const startOver = () => {
    setPicks(substances.map(() => null));
    setIdx(0);
    setDone(false);
  };

  // ==================== RENDER HELPERS ====================

  const sectionTitle = (txt: string) => (
    <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isMobile ? 18 : 20, color: DS.c.gray900, marginBottom: 4 }}>{txt}</div>
  );
  const story = (txt: string) => (
    <div style={{ fontFamily: DS.serif, fontStyle: 'italic', fontSize: bodyFont + 1, color: DS.c.primaryDark, marginBottom: 10 }}>{txt}</div>
  );
  const instruction = (txt: string) => (
    <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray700, marginBottom: 14, lineHeight: 1.5 }}>{txt}</div>
  );

  // the two outcome buttons
  const OutcomeButtons: React.FC = () => {
    const opts: { o: Outcome; label: string; emoji: string }[] = [
      { o: 'settles', label: 'Settles at the bottom', emoji: '⬇️' },
      { o: 'dissolves', label: 'Stays dissolved', emoji: '💧' },
    ];
    const waited = t >= 0.999;
    const disabled = !waited && !locked;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        {opts.map(({ o, label, emoji }) => {
          const sel = pick === o;
          const isRight = locked && sub.outcome === o;
          const isWrongPick = locked && sel && sub.outcome !== o;
          const border = isRight ? DS.c.success : isWrongPick ? DS.c.danger : sel ? DS.c.primary : DS.c.gray200;
          const bg = isRight ? '#EAFBF1' : isWrongPick ? '#FDECEC' : sel ? DS.c.primaryGhost : '#fff';
          return (
            <button key={o} onClick={() => !disabled && answer(o)} disabled={disabled}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                minHeight: tier.touchTargetMobile, padding: '0 16px', borderRadius: DS.r.md, fontFamily: DS.font, fontWeight: 700,
                fontSize: bodyFont, cursor: disabled ? 'default' : 'pointer',
                border: `2px solid ${border}`, background: bg, color: DS.c.gray900,
                animation: isWrongPick ? 'so_shake .45s' : isRight ? 'so_glow 1s' : (sel && tier.pulseOnCorrect && !locked ? 'so_pulse .5s' : undefined),
              }}>
              <span style={{ fontSize: 18 }}>{emoji}</span>{label}
              {isRight && <Check size={18} strokeWidth={3} color={DS.c.success} />}
              {isWrongPick && <X size={18} strokeWidth={3} color={DS.c.danger} />}
            </button>
          );
        })}
      </div>
    );
  };

  const sceneWrap = (s: Substance, revealed: boolean) => (
    <div style={{ background: DS.c.gray100, borderRadius: DS.r.xl, padding: isMobile ? 14 : 18, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: sceneW }}>
        <GlassScene sub={s} t={t} revealed={revealed} width={sceneW} />
      </div>
    </div>
  );

  // ---------- CARD ----------
  const renderCard = () => (
    <div style={{ animation: 'so_fadeInUp .4s both' }}>
      {tier.storyFrame && idx === 0 && story('Drop each thing into a glass of water and wait. Some sink, some disappear!')}
      {sectionTitle(`Substance ${idx + 1} of ${substances.length}`)}
      {instruction(`We dropped the ${sub.name.toLowerCase()} into the water. After waiting — does it settle at the bottom, or stay dissolved?`)}
      {sceneWrap(sub, locked)}
      <div style={{ textAlign: 'center', margin: '10px 0 14px', fontFamily: DS.font, fontSize: 13, color: DS.c.gray700, minHeight: 18 }}>
        {animating ? 'Watching what happens…' : !locked ? 'Now decide: settle or dissolve?' : ''}
      </div>
      <OutcomeButtons />

      {/* feedback */}
      {locked && (
        <div style={{
          marginTop: 14, padding: 14, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900,
          background: isCorrect ? '#EAFBF1' : '#FDECEC', animation: 'so_popIn .4s both',
        }}>
          {isCorrect ? (
            <span><b style={{ color: DS.c.success }}>Correct! ✓</b> The {sub.name.toLowerCase()} {sub.outcome === 'settles' ? 'is insoluble, so it settles at the bottom.' : 'is soluble, so it dissolves and stays in the water.'}</span>
          ) : (
            <span><b style={{ color: DS.c.danger }}>Not quite.</b>{showHints ? ' ' + sub.hint : ` The ${sub.name.toLowerCase()} actually ${sub.outcome === 'settles' ? 'settles at the bottom' : 'stays dissolved'}.`}</span>
          )}
        </div>
      )}

      {/* nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <PillButton label="Back" variant="ghost" color={DS.c.gray700} icon={<ChevronLeft size={18} />}
          disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))} minH={tier.touchTargetMobile} />
        {idx < substances.length - 1
          ? <PillButton label="Next" color={DS.c.accent} icon={<ChevronRight size={18} />}
              disabled={!locked} onClick={() => setIdx((i) => i + 1)} minH={tier.touchTargetMobile} />
          : <PillButton label="See my results" color={DS.c.accent} icon={<Award size={18} />}
              disabled={!locked} onClick={() => setDone(true)} minH={tier.touchTargetMobile} fontSize={bodyFont + 1} />}
      </div>
      {!locked && (
        <div style={{ textAlign: 'center', marginTop: 8, fontFamily: DS.font, fontSize: 12, color: DS.c.gray400 }}>
          Answer to continue
        </div>
      )}
    </div>
  );

  // ---------- SUMMARY SCORECARD ----------
  const renderSummary = () => (
    <div style={{ animation: 'so_fadeInUp .4s both', position: 'relative' }}>
      {pct >= 0.6 && <ConfettiBurst count={tier.confettiCount} duration={tier.confettiDuration} />}
      <div style={{
        position: 'relative', zIndex: 5, textAlign: 'center', padding: isMobile ? '8px 4px 4px' : '12px 8px 4px',
      }}>
        <Award size={44} color={DS.c.accent} style={{ marginBottom: 4 }} />
        {tier.showStars && <StarsRow count={tier.starCount} stagger={tier.starStaggerMs} />}
        <div style={{ fontFamily: DS.font, fontWeight: 800, fontSize: tier.scoreSizePx, color: DS.c.primaryDark, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          {scoreShown}<span style={{ fontSize: tier.scoreSizePx * 0.45, color: DS.c.gray700 }}>/{substances.length}</span>
        </div>
        <div style={{ fontFamily: DS.font, fontWeight: 500, fontSize: bodyFont + 1, color: DS.c.gray700, margin: '8px 0 16px' }}>{encouragement}</div>
      </div>

      {/* per-substance recap grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 18 }}>
        {substances.map((sb, i) => {
          const right = picks[i] === sb.outcome;
          return (
            <div key={sb.slug} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: DS.r.md,
              border: `1px solid ${right ? DS.c.success : DS.c.danger}`, background: right ? '#EAFBF1' : '#FDECEC',
            }}>
              <span style={{ fontSize: 20 }}>{sb.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: bodyFont - 1, color: DS.c.gray900 }}>{sb.name}</div>
                <div style={{ fontFamily: DS.font, fontSize: 12, color: DS.c.gray700 }}>
                  {sb.outcome === 'settles' ? 'Settles (insoluble)' : 'Stays dissolved (soluble)'}
                </div>
              </div>
              {right
                ? <Check size={18} strokeWidth={3} color={DS.c.success} />
                : <X size={18} strokeWidth={3} color={DS.c.danger} />}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <PillButton label="Start over" color={DS.c.primary} icon={<RotateCcw size={16} />} onClick={startOver} minH={tier.touchTargetMobile} />
      </div>
    </div>
  );

  // ==================== TOP-LEVEL LAYOUT ====================

  const headerProgress = done ? `${score} / ${substances.length}` : `${idx + 1} / ${substances.length}`;
  const progressFill = done ? 1 : (idx + 1) / substances.length;

  return (
    <div ref={rootRef} style={{ width: '100%', maxWidth: config.width, margin: '0 auto', fontFamily: DS.font, color: DS.c.gray900, background: DS.c.white, borderRadius: DS.r.xl, overflow: 'hidden', boxShadow: DS.sh.lg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${DS.c.primaryDark}, ${DS.c.primary} 55%, ${DS.c.accentDark})`, padding: isMobile ? '18px 18px' : '22px 26px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Droplets size={isMobile ? 26 : 30} />
            <div>
              <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 23, letterSpacing: 0.2 }}>Soluble or Insoluble? Will it settle?</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>Drop each thing in water — does it settle at the bottom or stay dissolved?</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.18)', padding: '6px 12px', borderRadius: DS.r.pill }}>{headerProgress}</div>
        </div>
      </div>

      {/* progress line */}
      <div style={{ height: 4, background: DS.c.gray200 }}>
        <div style={{ width: `${progressFill * 100}%`, height: '100%', background: DS.c.accent, transition: 'width .4s ease' }} />
      </div>

      {/* Body */}
      <div style={{ padding: isMobile ? 18 : 26, minHeight: 380 }}>
        {done ? renderSummary() : renderCard()}
      </div>
    </div>
  );
};

export default SettleOrDissolveSorter;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════
