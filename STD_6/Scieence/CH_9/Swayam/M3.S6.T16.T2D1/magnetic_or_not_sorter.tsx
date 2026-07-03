// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: magnetic_or_not_sorter.tsx
// Topic M3.S6.T16 — "Magnetic or non-magnetic?"
// Grade tier: 6 (heavy gamification, story framing, playful tone)
// Interactions: TAP-TO-SORT only (no drag-drop, house rule). Singularity palette.
// Flow: 12 object cards, one at a time → tap "Sticks to magnet" / "Does not stick"
//   → a magnet swoops over the card showing pickup (or no pickup) →
//   green tick on correct, one-line metal hint on wrong → summary scorecard.
// Answer key (curriculum-accurate): magnetic = iron nail, steel safety pin,
//   iron key, cobalt figurine. Everything else (incl. nickel coin, gold ring) = non-magnetic.
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
// horseshoe-magnet glyph (custom, U-shape with two pole tips)
const MagnetIcon = mkIcon(
  <><path d="M6 4 v7 a6 6 0 0 0 12 0 V4" /><line x1="3" y1="4" x2="9" y2="4" /><line x1="15" y1="4" x2="21" y2="4" /><line x1="6" y1="9" x2="9" y2="9" /><line x1="15" y1="9" x2="18" y2="9" /></>,
);

// ==================== TYPE DEFINITIONS ====================

type GradeLevel = 6 | 7 | 8;
type Bin = 'sticks' | 'not';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: 'learn';
}

interface ObjectCard {
  slug: string;
  name: string;
  emoji: string;
  magnetic: boolean;
  material: string;       // shown on the card
  hint: string;           // one-line metal hint shown on a wrong answer
}

interface SorterAdditionalProps {
  objects?: (string | ObjectCard)[];
  showHints?: boolean;
  feedbackMessage?: string;
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
    pink: '#DB2777', deepBlue: '#1E40AF', forest: '#166534', magnetRed: '#E03B45', magnetSilver: '#C7CDD4',
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

// ==================== OBJECT LIBRARY ====================
// Curriculum-accurate magnetic set: only iron / steel / cobalt stick at Grade 6.
// nickel coin & gold ring → NON-magnetic (real coins are steel-plated/cupronickel; rings are non-ferrous).

const OBJECT_LIBRARY: Record<string, ObjectCard> = {
  iron_nail:       { slug: 'iron_nail',       name: 'Iron nail',       emoji: '🔩', magnetic: true,  material: 'Iron',      hint: 'Iron is magnetic — a nail jumps to a magnet, so it belongs in “sticks”.' },
  aluminium_foil:  { slug: 'aluminium_foil',  name: 'Aluminium foil',  emoji: '🧻', magnetic: false, material: 'Aluminium', hint: 'Aluminium is a metal but it is NOT magnetic — foil never sticks to a magnet.' },
  copper_coin:     { slug: 'copper_coin',     name: 'Copper coin',     emoji: '🪙', magnetic: false, material: 'Copper',    hint: 'Copper is non-magnetic — a magnet has no pull on a copper coin.' },
  plastic_ruler:   { slug: 'plastic_ruler',   name: 'Plastic ruler',   emoji: '📏', magnetic: false, material: 'Plastic',   hint: 'Plastic is not a metal at all, so it cannot be magnetic.' },
  eraser:          { slug: 'eraser',          name: 'Pencil eraser',   emoji: '🧽', magnetic: false, material: 'Rubber',    hint: 'An eraser is rubber — non-metal, so it never sticks to a magnet.' },
  steel_pin:       { slug: 'steel_pin',       name: 'Steel safety pin',emoji: '🧷', magnetic: true,  material: 'Steel',     hint: 'Steel is mostly iron, so it IS magnetic — the pin sticks.' },
  rubber_band:     { slug: 'rubber_band',     name: 'Rubber band',     emoji: '⭕', magnetic: false, material: 'Rubber',    hint: 'Rubber is a non-metal — a magnet does nothing to a rubber band.' },
  nickel_coin:     { slug: 'nickel_coin',     name: 'Nickel coin',     emoji: '🪙', magnetic: false, material: 'Cupro-nickel', hint: 'A real “nickel” coin is a copper-nickel mix, not pure nickel — it does NOT stick to a magnet.' },
  wooden_block:    { slug: 'wooden_block',    name: 'Wooden block',    emoji: '🧱', magnetic: false, material: 'Wood',      hint: 'Wood is a non-metal, so it can never be magnetic.' },
  iron_key:        { slug: 'iron_key',        name: 'Iron key',        emoji: '🔑', magnetic: true,  material: 'Iron',      hint: 'The key is iron — iron is magnetic, so it sticks.' },
  gold_ring:       { slug: 'gold_ring',       name: 'Gold ring',       emoji: '💍', magnetic: false, material: 'Gold',      hint: 'Gold is a metal but it is non-magnetic — a gold ring will not stick.' },
  cobalt_figure:   { slug: 'cobalt_figure',   name: 'Cobalt figurine', emoji: '🗿', magnetic: true,  material: 'Cobalt',    hint: 'Cobalt is one of the few magnetic metals (like iron) — it sticks to a magnet.' },
};

const DEFAULT_ORDER = [
  'iron_nail', 'aluminium_foil', 'copper_coin', 'plastic_ruler', 'eraser', 'steel_pin',
  'rubber_band', 'nickel_coin', 'wooden_block', 'iron_key', 'gold_ring', 'cobalt_figure',
];

const FALLBACK_OBJ = (slug: string): ObjectCard => ({
  slug, name: slug.replace(/_/g, ' '), emoji: '❓', magnetic: false, material: '—',
  hint: 'Only iron, steel and cobalt objects stick to a magnet; everything else does not.',
});
const resolveObj = (entry: string | ObjectCard): ObjectCard =>
  typeof entry === 'string'
    ? (OBJECT_LIBRARY[entry] || FALLBACK_OBJ(entry))
    : { ...FALLBACK_OBJ(entry.slug || 'item'), ...entry };

// ==================== EASING / HELPERS ====================

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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
@keyframes mg_fadeInUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes mg_popIn { 0% { opacity: 0; transform: scale(0.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes mg_shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-7px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
@keyframes mg_scaleInBack { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
@keyframes mg_pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes mg_glow { 0%,100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); } 50% { box-shadow: 0 0 0 8px rgba(46,204,113,0.25); } }
@keyframes mg_starPop { 0% { opacity: 0; transform: scale(0) rotate(-30deg); } 70% { transform: scale(1.25) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes mg_confetti { 0% { opacity: 1; transform: translateY(-10px) rotate(0); } 100% { opacity: 0; transform: translateY(440px) rotate(540deg); } }
@keyframes mg_wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
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
          animation: `mg_confetti ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
};

const StarsRow: React.FC<{ count: number; stagger: number }> = ({ count, stagger }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '6px 0 4px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} size={34} fill={DS.c.amber} color={DS.c.amber}
        style={{ animation: `mg_starPop .5s ${i * (stagger / 1000)}s both` }} />
    ))}
  </div>
);

// ──────────────────────────────────────────────────────────────────────────
// MagnetTestScene — the object on a table while a horseshoe magnet swoops in.
// Props:
//   card     — the object being tested
//   t        — 0..1 swoop progress (magnet comes down from the top toward the object)
//   revealed — whether the result is being shown (after the student answers)
//   pickedUp — true if the object is magnetic (it lifts to meet the magnet)
// ──────────────────────────────────────────────────────────────────────────
const MagnetTestScene: React.FC<{
  card: ObjectCard;
  t: number;
  revealed: boolean;
  width: number;
}> = ({ card, t, revealed, width }) => {
  const W = width;
  const H = Math.round(width * 0.66);
  const cx = W / 2;
  const tableY = H * 0.78;

  // The magnet body spans from its top (mTop) up through an arc that rises ~H*0.13
  // above mTop. To keep the whole magnet inside the box at every t (including its
  // resting position before the swoop), we (a) start it just below the top edge and
  // (b) give the viewBox a little top headroom = PAD. Combined with overflow clipped,
  // nothing ever spills outside the rounded scene box.
  const PAD = H * 0.16;                      // top headroom inside the viewBox

  // magnet swoops from a parked spot near the top down to a hover point above the object
  const magTopY = PAD * 0.55;                // resting (pre-tap) — fully inside the box
  const magHoverY = H * 0.30;
  const magY = magTopY + (magHoverY - magTopY) * easeInOutCubic(clamp(t, 0, 1));

  // horseshoe magnet drawing (centered at cx, top at magY)
  const mW = W * 0.26, mTh = W * 0.075;   // overall width, limb thickness
  const mLeft = cx - mW / 2, mRight = cx + mW / 2;
  const mTop = magY, mArcY = magY + H * 0.18;
  const magBottomY = mArcY;               // the silver pole tips sit at the arc line

  // object resting position on the table
  const objRestY = tableY - H * 0.10;
  // if magnetic + revealed, it lifts up toward the magnet on the back half of the swoop,
  // stopping just below the magnet's pole tips
  const lift = revealed && card.magnetic ? clamp((t - 0.5) / 0.5, 0, 1) : 0;
  const objY = objRestY - lift * (objRestY - (magBottomY + H * 0.10));

  const showField = revealed && card.magnetic && t > 0.45;
  const showNoPull = revealed && !card.magnetic && t > 0.9;

  return (
    <svg viewBox={`0 ${-PAD} ${W} ${H + PAD}`} width="100%" style={{ display: 'block', borderRadius: DS.r.lg, background: 'linear-gradient(180deg,#FBFBFE,#EEF3F7)', overflow: 'hidden' }}>
      {/* opaque backdrop covering the padded top so the rounded corners read cleanly */}
      <rect x="0" y={-PAD} width={W} height={H + PAD} fill="url(#mg_bg)" />
      <defs>
        <linearGradient id="mg_bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBFBFE" /><stop offset="1" stopColor="#EEF3F7" />
        </linearGradient>
      </defs>
      {/* table */}
      <rect x="0" y={tableY} width={W} height={H - tableY} fill="#E7E2D6" />
      <line x1="0" y1={tableY} x2={W} y2={tableY} stroke="#D4CDBC" strokeWidth="2" />

      {/* attraction field lines when magnetic */}
      {showField && (
        <g opacity={clamp((t - 0.45) / 0.3, 0, 1)} stroke={DS.c.magnetRed} strokeWidth="2" fill="none" strokeDasharray="3 4">
          <path d={`M ${cx - mW * 0.28} ${magBottomY} Q ${cx} ${(magBottomY + objY) / 2} ${cx} ${objY - 6}`} />
          <path d={`M ${cx + mW * 0.28} ${magBottomY} Q ${cx} ${(magBottomY + objY) / 2} ${cx} ${objY - 6}`} />
        </g>
      )}

      {/* the object: emoji on a little chip */}
      <g transform={`translate(${cx}, ${objY})`} style={{ transition: 'none' }}>
        <ellipse cx="0" cy={H * 0.085} rx={W * 0.075} ry={W * 0.018} fill="rgba(26,26,46,0.12)" />
        <text x="0" y={H * 0.03} textAnchor="middle" fontSize={W * 0.13}
          style={{ filter: 'drop-shadow(0 2px 3px rgba(26,26,46,0.22))' }}>{card.emoji}</text>
      </g>

      {/* horseshoe magnet (red body, silver tips) */}
      <g>
        {/* left limb */}
        <rect x={mLeft} y={mTop} width={mTh} height={(mArcY - mTop)} fill={DS.c.magnetRed} rx={3} />
        {/* right limb */}
        <rect x={mRight - mTh} y={mTop} width={mTh} height={(mArcY - mTop)} fill={DS.c.magnetRed} rx={3} />
        {/* arc joining them at the top */}
        <path d={`M ${mLeft} ${mTop + 4} Q ${cx} ${mTop - H * 0.13} ${mRight} ${mTop + 4} L ${mRight - mTh} ${mTop + 4} Q ${cx} ${mTop - H * 0.05} ${mLeft + mTh} ${mTop + 4} Z`} fill={DS.c.magnetRed} />
        {/* silver pole tips */}
        <rect x={mLeft} y={mArcY - mTh * 0.8} width={mTh} height={mTh * 0.9} fill={DS.c.magnetSilver} rx={2} />
        <rect x={mRight - mTh} y={mArcY - mTh * 0.8} width={mTh} height={mTh * 0.9} fill={DS.c.magnetSilver} rx={2} />
        {/* N / S labels */}
        <text x={mLeft + mTh / 2} y={mArcY - mTh * 0.1} textAnchor="middle" fontFamily={DS.font} fontWeight="800" fontSize={mTh * 0.6} fill={DS.c.gray900}>N</text>
        <text x={mRight - mTh / 2} y={mArcY - mTh * 0.1} textAnchor="middle" fontFamily={DS.font} fontWeight="800" fontSize={mTh * 0.6} fill={DS.c.gray900}>S</text>
      </g>

      {/* "no pull" puff for non-magnetic */}
      {showNoPull && (
        <text x={cx + W * 0.18} y={objY - H * 0.02} textAnchor="middle" fontFamily={DS.font} fontWeight="700"
          fontSize={W * 0.05} fill={DS.c.gray400} style={{ animation: 'mg_popIn .4s both' }}>no pull</text>
      )}

      {/* object name */}
      <text x={cx} y={H * 0.97} textAnchor="middle" fontFamily={DS.font} fontWeight="700" fontSize={W * 0.045} fill={DS.c.gray900}>
        {card.name} <tspan fill={DS.c.gray700} fontWeight="500">· {card.material}</tspan>
      </text>
    </svg>
  );
};

// ==================== MAIN COMPONENT ====================

const MagneticOrNotSorter: React.FC<ToolProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w: containerW, isMobile } = useResponsive(rootRef);

  const config = useMemo(() => ({
    width: props.width ?? 840,
    gradeLevel: (props.gradeLevel ?? 6) as GradeLevel,
    themeColor: props.themeColor ?? DS.c.primary,
  }), [props]);

  const tier = useMemo(() => {
    const g = config.gradeLevel;
    if (g === 8) return { confettiCount: 15, confettiDuration: 1500, showStars: false, starCount: 0, starStaggerMs: 0, scoreSizePx: 46, bodyFontMobile: 15, bodyFontDesktop: 16, touchTargetMobile: 48, swoopMs: 1300, storyFrame: false, encouragement: { high: 'Excellent — you know which metals are magnetic.', mid: 'Good — revisit the ones you missed.', low: 'Work through the explanations carefully.' } };
    if (g === 7) return { confettiCount: 40, confettiDuration: 2000, showStars: true, starCount: 5, starStaggerMs: 200, scoreSizePx: 54, bodyFontMobile: 15, bodyFontDesktop: 16, touchTargetMobile: 50, swoopMs: 1500, storyFrame: false, encouragement: { high: 'Strong work — concept locked.', mid: 'Good job. A couple to polish.', low: "Let's walk through these — you'll get it." } };
    return { confettiCount: 70, confettiDuration: 2500, showStars: true, starCount: 5, starStaggerMs: 200, scoreSizePx: 62, bodyFontMobile: 16, bodyFontDesktop: 17, touchTargetMobile: 56, swoopMs: 1700, storyFrame: true, encouragement: { high: 'Brilliant! You sorted them all!', mid: 'Nice work! Have another go at the tricky ones.', low: 'Every test teaches something — try once more!' } };
  }, [config.gradeLevel]);

  const ap = props.additionalProps || {};
  const objects = useMemo<ObjectCard[]>(
    () => (ap.objects && ap.objects.length ? ap.objects : DEFAULT_ORDER).map(resolveObj),
    [ap.objects],
  );
  const showHints = ap.showHints ?? true;
  const bodyFont = isMobile ? tier.bodyFontMobile : tier.bodyFontDesktop;
  const sceneW = clamp(Math.min(containerW - (isMobile ? 36 : 60), 380), 240, 380);

  // ── swoop animation ──
  const [t, setT] = useState(0);
  const [animating, setAnimating] = useState(false);
  const rafRef = useRef<number | null>(null);

  const runSwoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setAnimating(true);
    setT(0);
    const start = performance.now();
    const dur = tier.swoopMs;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setT(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { setT(1); setAnimating(false); }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [tier.swoopMs]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── flow state ──
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<(Bin | null)[]>(() => objects.map(() => null));
  const [done, setDone] = useState(false);
  const [scoreShown, setScoreShown] = useState(0);
  const card = objects[idx];
  const pick = picks[idx] ?? null;
  const locked = pick !== null;
  const correctBin: Bin = card?.magnetic ? 'sticks' : 'not';
  const isCorrect = pick === correctBin;

  // reset on object-set change
  useEffect(() => {
    setPicks(objects.map(() => null));
    setIdx(0);
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects]);

  // when an answer is locked, run the magnet swoop to reveal
  useEffect(() => {
    if (locked) runSwoop();
    else setT(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, locked]);

  // ── inject fonts + keyframes ──
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'mg-keyframes';
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('mg-keyframes'); if (e) e.remove(); };
  }, []);

  useEffect(() => { setStopAutoNext?.(true); }, [setStopAutoNext]);

  useEffect(() => {
    setStepDetails?.({
      currentStep: done ? objects.length : idx + 1,
      totalSteps: objects.length,
      isPaused: true,
      currentMode: 'learn',
    });
  }, [idx, done, objects.length, setStepDetails]);

  // ── score ──
  const score = useMemo(
    () => objects.reduce((s, o, i) => s + (picks[i] === (o.magnetic ? 'sticks' : 'not') ? 1 : 0), 0),
    [picks, objects],
  );
  const pct = score / Math.max(objects.length, 1);
  const encouragement = pct >= 0.9 ? tier.encouragement.high : pct >= 0.6 ? tier.encouragement.mid : tier.encouragement.low;

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

  const answer = (choice: Bin) => {
    if (locked) return;
    setPicks((prev) => { const next = [...prev]; next[idx] = choice; return next; });
  };
  const startOver = () => { setPicks(objects.map(() => null)); setIdx(0); setDone(false); };

  // ==================== RENDER HELPERS ====================

  const sectionTitle = (txt: string) => (
    <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isMobile ? 18 : 20, color: DS.c.gray900, marginBottom: 4 }}>{txt}</div>
  );

  // two bin buttons
  const BinButtons: React.FC = () => {
    const opts: { b: Bin; label: string; icon: React.ReactNode }[] = [
      { b: 'sticks', label: 'Sticks to magnet', icon: <MagnetIcon size={18} color={DS.c.magnetRed} /> },
      { b: 'not', label: 'Does not stick', icon: <X size={18} strokeWidth={3} color={DS.c.gray400} /> },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        {opts.map(({ b, label, icon }) => {
          const sel = pick === b;
          const isRight = locked && correctBin === b;
          const isWrongPick = locked && sel && correctBin !== b;
          const border = isRight ? DS.c.success : isWrongPick ? DS.c.danger : sel ? DS.c.primary : DS.c.gray200;
          const bg = isRight ? '#EAFBF1' : isWrongPick ? '#FDECEC' : sel ? DS.c.primaryGhost : '#fff';
          return (
            <button key={b} onClick={() => !locked && answer(b)} disabled={locked}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                minHeight: tier.touchTargetMobile, padding: '0 16px', borderRadius: DS.r.md, fontFamily: DS.font, fontWeight: 700,
                fontSize: bodyFont, cursor: locked ? 'default' : 'pointer',
                border: `2px solid ${border}`, background: bg, color: DS.c.gray900,
                animation: isWrongPick ? 'mg_shake .45s' : isRight ? 'mg_glow 1s' : undefined,
              }}>
              {icon}{label}
              {isRight && <Check size={18} strokeWidth={3} color={DS.c.success} />}
              {isWrongPick && <X size={18} strokeWidth={3} color={DS.c.danger} />}
            </button>
          );
        })}
      </div>
    );
  };

  const sceneWrap = (
    <div style={{ background: DS.c.gray100, borderRadius: DS.r.xl, padding: isMobile ? 14 : 18, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: sceneW }}>
        <MagnetTestScene card={card} t={t} revealed={locked} width={sceneW} />
      </div>
    </div>
  );

  // ---------- CARD ----------
  const renderCard = () => (
    <div style={{ animation: 'mg_fadeInUp .4s both' }}>
      {tier.storyFrame && idx === 0 && (
        <div style={{ fontFamily: DS.serif, fontStyle: 'italic', fontSize: bodyFont + 1, color: DS.c.primaryDark, marginBottom: 10 }}>
          Bring the magnet close to each object — which ones will jump up and stick?
        </div>
      )}
      {sectionTitle(`Object ${idx + 1} of ${objects.length}`)}
      <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray700, marginBottom: 14, lineHeight: 1.5 }}>
        Will the <b>{card.name.toLowerCase()}</b> stick to the magnet, or not?
      </div>
      {sceneWrap}
      <div style={{ textAlign: 'center', margin: '10px 0 14px', fontFamily: DS.font, fontSize: 13, color: DS.c.gray700, minHeight: 18 }}>
        {!locked ? 'Tap your answer to bring the magnet down.' : animating ? 'Testing with the magnet…' : ''}
      </div>
      <BinButtons />

      {/* feedback */}
      {locked && (
        <div style={{
          marginTop: 14, padding: 14, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900,
          background: isCorrect ? '#EAFBF1' : '#FDECEC', animation: 'mg_popIn .4s both',
        }}>
          {isCorrect ? (
            <span><b style={{ color: DS.c.success }}>Correct! ✓</b> {card.magnetic
              ? `${card.material} is magnetic — the ${card.name.toLowerCase()} jumps up and sticks.`
              : `${card.material} is non-magnetic — the magnet has no pull on the ${card.name.toLowerCase()}.`}</span>
          ) : (
            <span><b style={{ color: DS.c.danger }}>Not quite.</b>{showHints ? ' ' + card.hint : ` The ${card.name.toLowerCase()} actually ${card.magnetic ? 'sticks to the magnet' : 'does not stick'}.`}</span>
          )}
        </div>
      )}

      {/* nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <PillButton label="Back" variant="ghost" color={DS.c.gray700} icon={<ChevronLeft size={18} />}
          disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))} minH={tier.touchTargetMobile} />
        {idx < objects.length - 1
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

  // ---------- SUMMARY ----------
  const renderSummary = () => (
    <div style={{ animation: 'mg_fadeInUp .4s both', position: 'relative' }}>
      {pct >= 0.6 && <ConfettiBurst count={tier.confettiCount} duration={tier.confettiDuration} />}
      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: isMobile ? '8px 4px 4px' : '12px 8px 4px' }}>
        <Award size={44} color={DS.c.accent} style={{ marginBottom: 4 }} />
        {tier.showStars && <StarsRow count={tier.starCount} stagger={tier.starStaggerMs} />}
        <div style={{ fontFamily: DS.font, fontWeight: 800, fontSize: tier.scoreSizePx, color: DS.c.primaryDark, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          {scoreShown}<span style={{ fontSize: tier.scoreSizePx * 0.45, color: DS.c.gray700 }}>/{objects.length}</span>
        </div>
        <div style={{ fontFamily: DS.font, fontWeight: 500, fontSize: bodyFont + 1, color: DS.c.gray700, margin: '8px 0 16px' }}>{encouragement}</div>
      </div>

      {/* two-column recap: magnetic vs non-magnetic */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 18 }}>
        {([['sticks', 'Sticks to magnet', DS.c.magnetRed], ['not', 'Does not stick', DS.c.gray400]] as [Bin, string, string][]).map(([bin, title, col]) => (
          <div key={bin} style={{ border: `1px solid ${DS.c.gray200}`, borderRadius: DS.r.lg, padding: 12, background: '#fff', boxShadow: DS.sh.sm }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {bin === 'sticks' ? <MagnetIcon size={18} color={col} /> : <X size={16} strokeWidth={3} color={col} />}
              <span style={{ fontFamily: DS.font, fontWeight: 700, fontSize: bodyFont - 1, color: DS.c.gray900 }}>{title}</span>
            </div>
            {objects.map((o, i) => {
              const belongs = (o.magnetic ? 'sticks' : 'not') === bin;
              if (!belongs) return null;
              const right = picks[i] === (o.magnetic ? 'sticks' : 'not');
              return (
                <div key={o.slug} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}>
                  <span style={{ fontSize: 17 }}>{o.emoji}</span>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: DS.font, fontSize: bodyFont - 2, color: DS.c.gray900 }}>{o.name}</span>
                  {right
                    ? <Check size={15} strokeWidth={3} color={DS.c.success} />
                    : <X size={15} strokeWidth={3} color={DS.c.danger} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ fontFamily: DS.font, fontSize: 12.5, color: DS.c.gray700, textAlign: 'center', marginBottom: 16, lineHeight: 1.4 }}>
        Only <b>iron, steel and cobalt</b> objects stick to a magnet. Other metals — aluminium, copper, gold, the cupro-nickel coin — are <b>not</b> magnetic, and non-metals (plastic, rubber, wood) never are.
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <PillButton label="Start over" color={DS.c.primary} icon={<RotateCcw size={16} />} onClick={startOver} minH={tier.touchTargetMobile} />
      </div>
    </div>
  );

  // ==================== TOP-LEVEL LAYOUT ====================

  const headerProgress = done ? `${score} / ${objects.length}` : `${idx + 1} / ${objects.length}`;
  const progressFill = done ? 1 : (idx + 1) / objects.length;

  return (
    <div ref={rootRef} style={{ width: '100%', maxWidth: config.width, margin: '0 auto', fontFamily: DS.font, color: DS.c.gray900, background: DS.c.white, borderRadius: DS.r.xl, overflow: 'hidden', boxShadow: DS.sh.lg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${DS.c.primaryDark}, ${DS.c.primary} 55%, ${DS.c.accentDark})`, padding: isMobile ? '18px 18px' : '22px 26px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MagnetIcon size={isMobile ? 26 : 30} color="#fff" />
            <div>
              <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 23, letterSpacing: 0.2 }}>Magnetic or Non-Magnetic?</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>Test each object — will it stick to the magnet, or not?</div>
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
      <div style={{ padding: isMobile ? 18 : 26, minHeight: 400 }}>
        {done ? renderSummary() : renderCard()}
      </div>
    </div>
  );
};

export default MagneticOrNotSorter;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════
