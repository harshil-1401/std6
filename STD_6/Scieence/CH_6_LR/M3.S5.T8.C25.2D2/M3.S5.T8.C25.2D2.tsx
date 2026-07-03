// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: weigh_the_cups.tsx
// NCERT Grade 6 Science · Chapter 6 "Materials Around Us" · Activity 6.8
// Topic M3.S5.T8 — "Mass tells how heavy or light"  (concept C25)
//
// Flow:  PREDICT  →  WEIGH  →  COMPARE / CONCLUDE
//   1. Rank three identical half-filled cups (water · sand · pebbles)
//      from lightest to heaviest — a real prediction, locked before any reveal.
//   2. Place each cup on a digital balance (like Fig. 6.7) and watch the
//      gram reading count up. Readings fill a record table.
//   3. A two-pan balance compares any two cups (the side with more mass dips),
//      the prediction is checked, and mass is defined.
//
// Objectives:  O16 (Apply — infer heavier/lighter from readings)
//              O17 (Understand — define mass as how heavy/light an object is)
//
// Single file · CSS-in-JS only (no Tailwind) · inline SVG icons (no icon lib,
// to avoid cross-React "invalid element" errors) · animations via injected
// keyframes · Singularity design tokens · Poppins.
//
// RESPONSIVE REQUIREMENT (laptop + phone + any media):
//   The component is fully fluid and sizes itself to its CONTAINER, not the
//   window (via ResizeObserver), so it adapts inside any modal/iframe/column.
//   Breakpoints: xs < 380px · mobile < 480px · default 480–699px · wide >= 700px
//   (wide uses two-column landscape layouts). Min supported width ~320px.
//   A scoped box-sizing reset + svg/img max-width:100% guarantee no horizontal
//   scroll at any screen size; max width is capped at 980px and centered.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS (Singularity — from the design system PDF)
// ─────────────────────────────────────────────────────────────────
const DS = {
  primary: '#4A4DC9',
  primaryDark: '#533086',
  primaryLight: '#C1C1EA',
  primaryGhost: '#EDEDF8',
  accent: '#FF7212',
  accentDark: '#FC9145',
  accentLight: '#FFF3E4',
  ink: '#1A1A2E',
  gray700: '#4E4E4E',
  gray400: '#CACACA',
  gray200: '#EBEBEB',
  gray100: '#F5F5F5',
  white: '#FFFFFF',
  success: '#2ECC71',
  successBg: '#E7F8EE',
  danger: '#E53E3E',
  dangerBg: '#FDECEC',
  font: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type SceneType = 'water' | 'sand' | 'pebbles';
type Phase = 'predict' | 'weigh' | 'result';

interface CupSpec {
  id: string;
  label: string;
  material: string;
  emoji: string;
  mass: number;      // grams shown on the balance (cup + contents)
  accent: string;
  scene: SceneType;
  reason: string;    // why it sits where it does, in chapter language
}

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: string;
}

interface WeighAdditionalProps {
  cups?: CupSpec[];
  finalMessage?: string;
  showCompare?: boolean;
  unit?: string;
}

interface WeighTheCupsProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    animationSpeed?: number;
    additionalProps?: WeighAdditionalProps;
  };
  setStepDetails?: (s: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────
// DEFAULT DATA — Activity 6.8 (cups A/B/C), masses clearly ordered
// (cup + contents, half-filled). Realistic and unambiguous for Grade 6.
// ─────────────────────────────────────────────────────────────────
const DEFAULT_CUPS: CupSpec[] = [
  {
    id: 'A', label: 'Water', material: 'water', emoji: '💧', mass: 180,
    accent: DS.primary, scene: 'water',
    reason: 'Water fills the cup, but the same space holds less matter than sand or pebbles — so the water cup is the lightest.',
  },
  {
    id: 'B', label: 'Sand', material: 'sand', emoji: '🏖️', mass: 260,
    accent: DS.primaryDark, scene: 'sand',
    reason: 'Sand grains pack more matter into the cup than water, so the sand cup is heavier than water but lighter than pebbles.',
  },
  {
    id: 'C', label: 'Pebbles', material: 'pebbles', emoji: '🪨', mass: 340,
    accent: DS.accent, scene: 'pebbles',
    reason: 'Pebbles pack the most matter into the same cup, so the pebble cup has the most mass — it is the heaviest.',
  },
];

const DEFAULT_FINAL =
  'Mass tells how heavy or light an object is. The cup with more matter packed into the same space has more mass. Size or how full a cup looks does not decide its mass — only the balance reading does.';

// ─────────────────────────────────────────────────────────────────
// EASING + helpers
// ─────────────────────────────────────────────────────────────────
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─────────────────────────────────────────────────────────────────
// INLINE SVG ICONS (plain <svg> — always-valid host elements)
// ─────────────────────────────────────────────────────────────────
interface IconProps { size?: number; color?: string; style?: React.CSSProperties; }
const Stroke: React.FC<IconProps & { children: React.ReactNode; fill?: string; sw?: number }> = ({
  size = 22, color = 'currentColor', fill = 'none', sw = 2, style, children,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    {children}
  </svg>
);
const ICheck: React.FC<IconProps> = (p) => (<Stroke {...p} sw={3}><path d="M20 6 9 17l-5-5" /></Stroke>);
const IX: React.FC<IconProps> = (p) => (<Stroke {...p} sw={3}><path d="M18 6 6 18M6 6l12 12" /></Stroke>);
const IReset: React.FC<IconProps> = (p) => (<Stroke {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></Stroke>);
const IArrow: React.FC<IconProps> = (p) => (<Stroke {...p}><path d="M5 12h14M12 5l7 7-7 7" /></Stroke>);
const IScale: React.FC<IconProps> = (p) => (<Stroke {...p}><path d="M12 3v18M7 21h10M5 7h14M5 7l-3 6a4 4 0 0 0 6 0L5 7zm14 0l-3 6a4 4 0 0 0 6 0l-3-6z" /></Stroke>);
const ISpark: React.FC<IconProps> = (p) => (<Stroke {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></Stroke>);
const IStar: React.FC<IconProps & { filled?: boolean }> = ({ filled, ...p }) => (
  <Stroke {...p} fill={filled ? (p.color || DS.accent) : 'none'}>
    <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3" />
  </Stroke>
);
const IBulb: React.FC<IconProps> = (p) => (<Stroke {...p}><path d="M9 18h6M10 21h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></Stroke>);

// ─────────────────────────────────────────────────────────────────
// CUP ILLUSTRATION (reusable) — viewBox 0 0 100 130
//   draws the cup body + a fill that reads as water / sand / pebbles
// ─────────────────────────────────────────────────────────────────
const CupArt: React.FC<{ scene: SceneType; size?: number; accent: string }> = ({ scene, size = 80, accent }) => (
  <svg width={size} height={size * 1.32} viewBox="0 0 100 132" style={{ display: 'block' }}>
    {/* soft base shadow */}
    <ellipse cx="50" cy="120" rx="20" ry="3.5" fill="rgba(26,26,46,0.10)" />
    {/* tumbler body — wide at the top, gently tapering to a rounded base */}
    <path d="M19 18 L30 112 Q31 117 36 117 L64 117 Q69 117 70 112 L81 18 Z"
      fill="#FFFFFF" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />

    {scene === 'water' && (
      <>
        <path d="M24 60 L30 112 L70 112 L76 60 Z" fill="#9CC9FB" opacity="0.9" />
        <ellipse cx="50" cy="60" rx="26" ry="4.5" fill="#C4E2FF" />
        <path d="M34 76 q6 -3.5 12 0" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.55" strokeLinecap="round" />
      </>
    )}

    {scene === 'sand' && (
      <>
        <path d="M23 56 L30 112 L70 112 L77 56 Z" fill="#FBCB4B" opacity="0.95" />
        <ellipse cx="50" cy="56" rx="27" ry="5" fill="#EEB23D" />
        {[[35, 74], [46, 82], [56, 76], [64, 88], [40, 94], [58, 96], [50, 86], [32, 86]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill="#C5832A" opacity="0.5" />
        ))}
      </>
    )}

    {scene === 'pebbles' && (
      <>
        <path d="M25 70 L30 112 L70 112 L75 70 Z" fill="#E6EAF1" opacity="0.55" />
        {[
          { cx: 37, cy: 104, rx: 8.5, ry: 6.5 }, { cx: 51, cy: 107, rx: 10, ry: 7 }, { cx: 64, cy: 104, rx: 8.5, ry: 6.5 },
          { cx: 43, cy: 92, rx: 9, ry: 6.5 }, { cx: 58, cy: 92, rx: 9, ry: 6.5 },
          { cx: 35, cy: 81, rx: 7.5, ry: 5.5 }, { cx: 50, cy: 79, rx: 9, ry: 6 }, { cx: 65, cy: 82, rx: 7.5, ry: 5.5 },
        ].map((p, i) => (
          <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
            fill={['#9AA6B6', '#6E7B8C', '#C2CBD6'][i % 3]} stroke="#566273" strokeWidth="0.8" />
        ))}
      </>
    )}

    {/* rim ellipse on top (drawn over the fill) */}
    <ellipse cx="50" cy="18" rx="31" ry="5.5" fill="#FFFFFF" stroke={accent} strokeWidth="2.5" />
    {/* glass shine */}
    <path d="M28 30 Q25 70 32 104" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// DIGITAL PLATFORM BALANCE (like textbook Fig. 6.7) — cup + gram display
// ─────────────────────────────────────────────────────────────────
const DigitalScale: React.FC<{
  cup: CupSpec | null;
  reading: number;
  unit: string;
  state: 'idle' | 'dropping' | 'settling' | 'done';
}> = ({ cup, reading, unit, state }) => {
  const pressed = state === 'settling' || state === 'done';
  const display = unit === 'g' && reading >= 1000
    ? `${(reading / 1000).toFixed(reading % 1000 === 0 ? 0 : 2)} kg`
    : `${reading} ${unit}`;
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 280, margin: '0 auto' }}>
      {/* cup sitting on the platform */}
      <div style={{
        position: 'relative', height: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        {cup && (
          <div
            key={cup.id + state}
            style={{
              transform: `translateY(${pressed ? 4 : 0}px)`,
              animation: state === 'dropping' ? 'wc-drop .55s cubic-bezier(.34,1.4,.64,1)' : undefined,
              transition: 'transform .18s ease',
              filter: 'drop-shadow(0 6px 6px rgba(26,26,46,.18))',
            }}>
            <CupArt scene={cup.scene} accent={cup.accent} size={92} />
          </div>
        )}
        {!cup && (
          <div style={{
            color: DS.gray400, fontWeight: 600, fontSize: 13, paddingBottom: 24, textAlign: 'center',
          }}>
            Choose a cup,<br />then weigh it
          </div>
        )}
      </div>

      {/* platform */}
      <div style={{
        height: 12, background: `linear-gradient(180deg, ${DS.primaryLight}, ${DS.primary})`,
        borderRadius: 6, transform: pressed ? 'scaleY(.82)' : 'scaleY(1)', transformOrigin: 'top',
        transition: 'transform .18s ease', boxShadow: '0 3px 0 rgba(83,48,134,.35)',
      }} />

      {/* body + digital read-out */}
      <div style={{
        background: 'linear-gradient(180deg,#FFFFFF,#F1F1F8)',
        border: `2px solid ${DS.gray200}`, borderRadius: 14, marginTop: 6,
        padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: DS.gray700, letterSpacing: 1, textTransform: 'uppercase' }}>
          Balance
        </span>
        <div style={{
          minWidth: 116, textAlign: 'right', background: '#10231C', borderRadius: 8, padding: '6px 12px',
          fontFamily: "'Poppins', monospace", fontWeight: 800, fontSize: 22,
          color: state === 'done' ? '#5BFFA6' : '#9DF7CB',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,.5)',
          fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5,
          animation: state === 'settling' ? 'wc-flicker .25s linear infinite' : undefined,
        }}>
          {cup ? display : `0 ${unit}`}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// TWO-PAN BEAM BALANCE (compare) — heavier side dips lower
// ─────────────────────────────────────────────────────────────────
const TwoPanBalance: React.FC<{ left: CupSpec | null; right: CupSpec | null }> = ({ left, right }) => {
  // tilt: + means right is heavier (right pan dips). clamp magnitude.
  const diff = (right?.mass ?? 0) - (left?.mass ?? 0);
  const norm = clamp(diff / 220, -1, 1);
  const tilt = norm * 10;                 // degrees of beam rotation
  const drop = norm * 24;                 // px the heavier pan drops
  const W = 320, H = 216, PIVOT = 50;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 340, display: 'block', margin: '0 auto' }}>
      {/* stand */}
      <rect x={W / 2 - 4} y={PIVOT} width="8" height={138} rx="4" fill="#7A6CA6" />
      <circle cx={W / 2} cy={PIVOT} r="9" fill={DS.primaryDark} />
      <rect x={W / 2 - 30} y={188} width="60" height="11" rx="5" fill={DS.primaryDark} />
      <rect x={W / 2 - 46} y={197} width="92" height="8" rx="4" fill="#3C2363" />

      {/* rotating beam */}
      <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: `${W / 2}px ${PIVOT}px`, transition: 'transform .7s cubic-bezier(.34,1.3,.64,1)' }}>
        <line x1="46" y1={PIVOT} x2={W - 46} y2={PIVOT} stroke="#4A3E6E" strokeWidth="6" strokeLinecap="round" />
        <circle cx="46" cy={PIVOT} r="4" fill="#4A3E6E" />
        <circle cx={W - 46} cy={PIVOT} r="4" fill="#4A3E6E" />
      </g>

      {/* LEFT pan */}
      <PanGroup x={46} baseY={PIVOT} dropPx={-drop} cup={left} />
      {/* RIGHT pan */}
      <PanGroup x={W - 46} baseY={PIVOT} dropPx={drop} cup={right} />
    </svg>
  );
};

const PanGroup: React.FC<{ x: number; baseY: number; dropPx: number; cup: CupSpec | null }> = ({ x, baseY, dropPx, cup }) => {
  const HANG = 74;                 // distance beam → pan
  const panY = baseY + HANG;       // pan ellipse centre (resting)
  const trans = 'transform .7s cubic-bezier(.34,1.3,.64,1)';
  return (
    <g>
      {/* hanging string — top fixed at the beam, bottom follows the pan */}
      <line x1={x} y1={baseY} x2={x} y2={panY - 9 + dropPx} stroke="#9183BE" strokeWidth="2"
        style={{ transition: 'all .7s cubic-bezier(.34,1.3,.64,1)' }} />
      {/* pan + cup + label move together, so nothing overlaps */}
      <g style={{ transform: `translateY(${dropPx}px)`, transition: trans }}>
        <ellipse cx={x} cy={panY} rx="38" ry="9" fill={DS.primaryLight} stroke={DS.primaryDark} strokeWidth="1.5" />
        {cup ? (
          <g transform={`translate(${x - 22}, ${panY - 56})`}>
            <CupArtMini scene={cup.scene} accent={cup.accent} />
          </g>
        ) : (
          <text x={x} y={panY + 3} textAnchor="middle" fontFamily={DS.font} fontSize="10" fill={DS.gray400}>empty</text>
        )}
        {cup && (
          <text x={x} y={panY + 26} textAnchor="middle" fontFamily={DS.font} fontSize="11.5" fontWeight={700} fill={DS.gray700}>
            {cup.label}
          </text>
        )}
      </g>
    </g>
  );
};

// compact cup for the pans — same tapered tumbler, ~44 × 56
const CupArtMini: React.FC<{ scene: SceneType; accent: string }> = ({ scene, accent }) => (
  <g>
    <ellipse cx="22" cy="54" rx="11" ry="2.2" fill="rgba(26,26,46,0.10)" />
    <path d="M7 6 L13 50 Q13.5 53 16 53 L28 53 Q30.5 53 31 50 L37 6 Z"
      fill="#FFFFFF" stroke={accent} strokeWidth="1.8" strokeLinejoin="round" />
    {scene === 'water' && (
      <>
        <path d="M10.5 28 L13 50 L31 50 L33.5 28 Z" fill="#9CC9FB" opacity="0.9" />
        <ellipse cx="22" cy="28" rx="11.5" ry="2.2" fill="#C4E2FF" />
      </>
    )}
    {scene === 'sand' && (
      <>
        <path d="M9.6 25 L13 50 L31 50 L34.4 25 Z" fill="#FBCB4B" opacity="0.95" />
        <ellipse cx="22" cy="25" rx="12.2" ry="2.4" fill="#EEB23D" />
      </>
    )}
    {scene === 'pebbles' && [
      { cx: 16, cy: 46, rx: 4, ry: 3 }, { cx: 23, cy: 47, rx: 4.5, ry: 3.2 }, { cx: 29, cy: 45, rx: 4, ry: 3 },
      { cx: 19, cy: 40, rx: 4, ry: 3 }, { cx: 26, cy: 40, rx: 4, ry: 3 }, { cx: 22, cy: 35, rx: 4, ry: 3 },
    ].map((p, i) => (
      <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={['#9AA6B6', '#6E7B8C', '#C2CBD6'][i % 3]} stroke="#566273" strokeWidth="0.6" />
    ))}
    <ellipse cx="22" cy="6" rx="15.5" ry="2.8" fill="#FFFFFF" stroke={accent} strokeWidth="1.8" />
  </g>
);

// ─────────────────────────────────────────────────────────────────
// PILL BUTTON
// ─────────────────────────────────────────────────────────────────
const Pill: React.FC<{
  children: React.ReactNode; onClick?: () => void; variant?: 'solid' | 'outline' | 'ghost';
  color?: string; disabled?: boolean; full?: boolean; small?: boolean;
}> = ({ children, onClick, variant = 'solid', color = DS.accent, disabled, full, small }) => {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: small ? 40 : 50, padding: small ? '0 18px' : '0 24px', borderRadius: 999,
    fontFamily: DS.font, fontWeight: 700, fontSize: small ? 14 : 15.5, lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer', border: '2px solid transparent',
    width: full ? '100%' : undefined, whiteSpace: 'nowrap', userSelect: 'none',
    transition: 'transform .14s ease, box-shadow .2s ease, background .2s ease',
    transform: press && !disabled ? 'scale(.96)' : hover && !disabled ? 'scale(1.04)' : 'scale(1)',
    opacity: disabled ? 0.5 : 1,
  };
  const skin: React.CSSProperties =
    variant === 'solid'
      ? { background: color, color: '#fff', boxShadow: hover && !disabled ? '0 8px 18px rgba(255,114,18,.32)' : '0 4px 12px rgba(255,114,18,.22)' }
      : variant === 'outline'
        ? { background: hover && !disabled ? DS.primaryGhost : '#fff', color, borderColor: color }
        : { background: hover && !disabled ? DS.primaryGhost : 'transparent', color };
  return (
    <button style={{ ...base, ...skin }} disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}>
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────
// RESPONSIVE HOOK (container-width based)
// ─────────────────────────────────────────────────────────────────
const useContainerWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(560);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return { ref, width: w, isMobile: w < 480, isWide: w >= 700, isXs: w < 380 };
};

// ─────────────────────────────────────────────────────────────────
// KEYFRAMES
// ─────────────────────────────────────────────────────────────────
const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
/* Fully responsive guarantees — fits any screen from ~320px phones to laptops.
   The tool sizes itself to its CONTAINER (ResizeObserver), so it adapts inside
   any modal, iframe or column without horizontal scroll. */
.wtc-root, .wtc-root * { box-sizing: border-box; }
.wtc-root { max-width: 100%; }
.wtc-root img, .wtc-root svg { max-width: 100%; }
.wtc-root button { font-family: inherit; }
@keyframes wc-fadeUp { from { opacity:0; transform:translateY(14px);} to { opacity:1; transform:none; } }
@keyframes wc-pop { 0% { transform:scale(.6); opacity:0;} 70% { transform:scale(1.08);} 100% { transform:scale(1); opacity:1; } }
@keyframes wc-drop { 0% { transform:translateY(-46px); opacity:0;} 60% { transform:translateY(4px); opacity:1;} 100% { transform:translateY(0);} }
@keyframes wc-flicker { 0%,100% { opacity:1;} 50% { opacity:.78;} }
@keyframes wc-shake { 0%,100% { transform:translateX(0);} 25% { transform:translateX(-6px);} 75% { transform:translateX(6px);} }
@keyframes wc-fall { to { transform:translateY(120vh) rotate(540deg); opacity:0; } }
@keyframes wc-star { 0% { transform:scale(0) rotate(-30deg); opacity:0;} 70% { transform:scale(1.25) rotate(8deg);} 100% { transform:scale(1) rotate(0); opacity:1; } }
@keyframes wc-glow { 0%,100% { box-shadow:0 0 0 0 rgba(74,77,201,0);} 50% { box-shadow:0 0 0 6px rgba(74,77,201,.18);} }
`;

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
const WeighTheCups: React.FC<WeighTheCupsProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const ap = props.additionalProps || {};
  const cups = useMemo<CupSpec[]>(() => (ap.cups && ap.cups.length ? ap.cups : DEFAULT_CUPS), [ap.cups]);
  const unit = ap.unit || 'g';
  const showCompare = ap.showCompare !== false;
  const finalMessage = ap.finalMessage || DEFAULT_FINAL;
  const speed = props.animationSpeed && props.animationSpeed > 0 ? props.animationSpeed : 1;

  const { ref, isMobile, isWide, isXs } = useContainerWidth();

  // the true order, lightest → heaviest
  const trueOrder = useMemo(() => [...cups].sort((a, b) => a.mass - b.mass).map((c) => c.id), [cups]);
  const cupById = useMemo(() => Object.fromEntries(cups.map((c) => [c.id, c])) as Record<string, CupSpec>, [cups]);

  // ── phase ──
  const [phase, setPhase] = useState<Phase>('predict');

  // ── PREDICT state: 3 rank slots, lightest→heaviest ──
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [selectedCup, setSelectedCup] = useState<string | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const dragInfo = useRef<{ id: string; sx: number; sy: number; moved: boolean } | null>(null);
  const placedIds = slots.filter(Boolean) as string[];
  const tray = cups.filter((c) => !placedIds.includes(c.id));
  const allPlaced = placedIds.length === cups.length;

  // ── WEIGH state ──
  const [activeCupId, setActiveCupId] = useState<string | null>(null);
  const [reading, setReading] = useState(0);
  const [scaleState, setScaleState] = useState<'idle' | 'dropping' | 'settling' | 'done'>('idle');
  const [records, setRecords] = useState<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);
  const busy = useRef(false);
  const allWeighed = cups.every((c) => records[c.id] != null);

  // ── COMPARE state ──
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  // ── inject keyframes ──
  useEffect(() => {
    const el = document.createElement('style');
    el.setAttribute('data-tool', 'weigh-the-cups');
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  // interactive → don't auto-advance the host
  useEffect(() => { setStopAutoNext?.(true); }, [setStopAutoNext]);

  // report progress
  useEffect(() => {
    const map = { predict: 1, weigh: 2, result: 3 };
    setStepDetails?.({ currentStep: map[phase], totalSteps: 3, isPaused: true, currentMode: phase });
  }, [phase, setStepDetails]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── PREDICT: place / lift ──
  const placeInSlot = useCallback((cupId: string, slotIdx: number) => {
    setSlots((prev) => {
      const next = [...prev];
      // remove cupId wherever it already sits
      for (let i = 0; i < next.length; i++) if (next[i] === cupId) next[i] = null;
      // if target occupied, bump the occupant back to tray (set null)
      next[slotIdx] = cupId;
      return next;
    });
    setSelectedCup(null);
  }, []);

  const liftFromSlot = useCallback((slotIdx: number) => {
    setSlots((prev) => { const n = [...prev]; n[slotIdx] = null; return n; });
  }, []);

  const slotAtPoint = (x: number, y: number): number | null => {
    for (let i = 0; i < slotRefs.current.length; i++) {
      const el = slotRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
    }
    return null;
  };

  const onCupPointerDown = (e: React.PointerEvent, cupId: string) => {
    if (phase !== 'predict') return;
    dragInfo.current = { id: cupId, sx: e.clientX, sy: e.clientY, moved: false };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  };
  const onCupPointerMove = (e: React.PointerEvent) => {
    const d = dragInfo.current; if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) d.moved = true;
    if (d.moved) { setDrag({ id: d.id, x: e.clientX, y: e.clientY }); setHoverSlot(slotAtPoint(e.clientX, e.clientY)); }
  };
  const onCupPointerUp = (e: React.PointerEvent) => {
    const d = dragInfo.current; dragInfo.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
    if (!d) return;
    if (d.moved) {
      const s = slotAtPoint(e.clientX, e.clientY);
      if (s != null) placeInSlot(d.id, s);
    } else {
      setSelectedCup((s) => (s === d.id ? null : d.id)); // tap toggles selection
    }
    setDrag(null); setHoverSlot(null);
  };

  const handleSlotTap = (slotIdx: number) => {
    if (phase !== 'predict') return;
    if (selectedCup) { placeInSlot(selectedCup, slotIdx); return; }
    if (slots[slotIdx]) liftFromSlot(slotIdx);
  };

  const lockPrediction = () => { setPhase('weigh'); setActiveCupId(cups[0].id); };

  // ── WEIGH: run a weighing ──
  const weigh = useCallback((cupId: string) => {
    if (busy.current) return;
    const cup = cupById[cupId]; if (!cup) return;
    busy.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setActiveCupId(cupId);
    setReading(0);
    setScaleState('dropping');

    window.setTimeout(() => {
      setScaleState('settling');
      const start = performance.now();
      const dur = 1100 / speed;
      const tick = (now: number) => {
        const t = clamp((now - start) / dur, 0, 1);
        setReading(Math.round(easeOutCubic(t) * cup.mass));
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
        else {
          setReading(cup.mass);
          setScaleState('done');
          setRecords((r) => ({ ...r, [cupId]: cup.mass }));
          busy.current = false;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }, 520 / speed);
  }, [cupById, speed]);

  const selectCupForScale = (cupId: string) => {
    if (busy.current) return;
    setActiveCupId(cupId);
    setReading(records[cupId] ?? 0);
    setScaleState(records[cupId] != null ? 'done' : 'idle');
  };

  const goToResult = () => {
    setPhase('result');
    // default the compare beam to the two extremes
    setLeftId(trueOrder[0]);
    setRightId(trueOrder[trueOrder.length - 1]);
  };

  // ── prediction accuracy ──
  const predictionExact = slots.every((s, i) => s === trueOrder[i]);
  const correctSlots = slots.reduce((n, s, i) => n + (s === trueOrder[i] ? 1 : 0), 0);
  const stars = predictionExact ? 3 : correctSlots >= 2 ? 2 : 1;

  const reset = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    busy.current = false;
    setPhase('predict'); setSlots([null, null, null]); setSelectedCup(null);
    setActiveCupId(null); setReading(0); setScaleState('idle'); setRecords({});
    setLeftId(null); setRightId(null); setDrag(null); setHoverSlot(null);
  };

  // ── styles ──
  const SLOT_META = [
    { tag: '1', label: 'Lightest', icon: '🪶' },
    { tag: '2', label: 'In between', icon: '⚖️' },
    { tag: '3', label: 'Heaviest', icon: '🧱' },
  ];

  const card: React.CSSProperties = {
    background: DS.white, borderRadius: 18, border: `1px solid ${DS.gray200}`,
    boxShadow: '0 8px 28px rgba(26,26,46,.06)',
  };

  // ═══════════════ PREDICT ═══════════════
  const renderPredict = () => (
    <div style={{ animation: 'wc-fadeUp .4s both' }}>
      <div style={{
        background: DS.accentLight, border: `1.5px solid ${DS.accentDark}`, borderRadius: 14,
        padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18,
      }}>
        <ISpark size={20} color={DS.accent} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 14, fontWeight: 500, color: DS.ink, lineHeight: 1.5 }}>
          Three identical cups are each half-filled. <strong>Guess first:</strong> rank them
          from lightest to heaviest. Drag a cup into a box — or tap a cup, then tap a box.
        </span>
      </div>

      {/* tray + slots — side by side on wide screens, stacked on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isWide ? '0.9fr 1.1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        {/* cups to rank */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: DS.gray700, marginBottom: 8 }}>
            {tray.length ? 'Cups to rank' : 'All three ranked — lock it in!'}
          </div>
          <div style={{
            display: 'flex', flexDirection: isWide ? 'column' : 'row', gap: 10, flexWrap: 'wrap',
            justifyContent: isWide ? 'flex-start' : 'center', alignItems: 'center',
            background: DS.gray100, border: `2px dashed ${DS.gray200}`, borderRadius: 16,
            padding: 12, minHeight: 96,
          }}>
            {tray.length === 0 && (
              <span style={{ color: DS.gray400, fontWeight: 600, fontSize: 13, padding: '8px 0' }}>Tray empty — every cup is in a box.</span>
            )}
            {tray.map((c) => {
              const sel = selectedCup === c.id;
              const isDragging = drag?.id === c.id;
              return (
                <button key={c.id}
                  onPointerDown={(e) => onCupPointerDown(e, c.id)}
                  onPointerMove={onCupPointerMove}
                  onPointerUp={onCupPointerUp}
                  onPointerCancel={() => { dragInfo.current = null; setDrag(null); setHoverSlot(null); }}
                  style={{
                    display: 'flex', flexDirection: isWide ? 'row' : 'column', alignItems: 'center',
                    gap: isWide ? 10 : 4, width: isWide ? '100%' : undefined,
                    justifyContent: isWide ? 'flex-start' : 'center',
                    padding: '8px 12px', borderRadius: 14, cursor: 'grab', touchAction: 'none',
                    background: sel ? DS.primaryGhost : DS.white,
                    border: `2px solid ${sel ? DS.primary : DS.gray200}`,
                    opacity: isDragging ? 0.35 : 1, fontFamily: DS.font,
                    animation: sel ? 'wc-glow 1.2s ease infinite' : 'wc-pop .35s ease',
                  }}>
                  <CupArt scene={c.scene} accent={c.accent} size={isWide ? 40 : 54} />
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: DS.ink }}>
                    Cup {c.id} · {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* rank slots */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: DS.gray700, marginBottom: 8 }}>
            Rank them: lightest → heaviest
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SLOT_META.map((m, i) => {
              const occupant = slots[i] ? cupById[slots[i] as string] : null;
              const over = hoverSlot === i;
              const armed = !!selectedCup || !!drag;
              return (
                <div key={i}
                  ref={(el) => { slotRefs.current[i] = el; }}
                  onClick={() => handleSlotTap(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14,
                    border: `2px ${armed ? 'solid' : 'dashed'} ${over ? DS.primary : occupant ? occupant.accent : DS.gray200}`,
                    background: over ? DS.primaryGhost : DS.white,
                    cursor: armed || occupant ? 'pointer' : 'default',
                    transform: over ? 'scale(1.01)' : 'scale(1)', transition: 'all .15s ease', minHeight: 64,
                  }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 17,
                    background: DS.primaryGhost, fontWeight: 800, color: DS.primaryDark,
                  }}>{m.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: DS.ink }}>{m.tag}. {m.label}</div>
                    {!occupant && (
                      <div style={{ fontSize: 11.5, color: DS.gray400, fontWeight: 600 }}>
                        {armed ? 'tap to place here' : 'drag or tap a cup here'}
                      </div>
                    )}
                  </div>
                  {occupant && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'wc-pop .3s ease' }}>
                      <CupArt scene={occupant.scene} accent={occupant.accent} size={34} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: occupant.accent }}>
                        Cup {occupant.id} · {occupant.label}
                      </span>
                      <IX size={16} color={DS.gray400} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
        <Pill onClick={lockPrediction} disabled={!allPlaced} color={DS.accent}>
          Lock prediction &amp; weigh <IArrow size={18} color="#fff" />
        </Pill>
      </div>
      {!allPlaced && (
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: DS.gray400, fontWeight: 600 }}>
          Place all three cups to continue
        </div>
      )}
    </div>
  );

  // ═══════════════ WEIGH ═══════════════
  const renderWeigh = () => {
    const active = activeCupId ? cupById[activeCupId] : null;
    return (
      <div style={{ animation: 'wc-fadeUp .4s both' }}>
        <div style={{
          background: DS.primaryGhost, borderLeft: `4px solid ${DS.primary}`, borderRadius: 12,
          padding: '10px 14px', marginBottom: 16, fontSize: 13.5, color: DS.ink, fontWeight: 500, lineHeight: 1.5,
        }}>
          Now check your guess. Put a cup on the balance and press <strong>Weigh</strong>. The number that
          appears is the cup&rsquo;s <strong>mass</strong> in grams — the bigger the number, the heavier the cup.
        </div>

        {/* cup selector */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          {cups.map((c) => {
            const isActive = activeCupId === c.id;
            const done = records[c.id] != null;
            return (
              <button key={c.id} onClick={() => selectCupForScale(c.id)} disabled={busy.current}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999,
                  cursor: busy.current ? 'default' : 'pointer', fontFamily: DS.font, fontWeight: 700, fontSize: 13,
                  border: `2px solid ${isActive ? c.accent : DS.gray200}`,
                  background: isActive ? '#fff' : DS.gray100, color: isActive ? c.accent : DS.gray700,
                  boxShadow: isActive ? `0 4px 12px ${c.accent}33` : 'none',
                }}>
                <span style={{ fontSize: 16 }}>{c.emoji}</span>
                Cup {c.id}
                {done && <ICheck size={14} color={DS.success} />}
              </button>
            );
          })}
        </div>

        {/* scale + record table — side by side on wide screens */}
        <div style={{ display: 'grid', gridTemplateColumns: isWide ? '1.15fr 0.85fr' : '1fr', gap: 16, alignItems: 'start' }}>
        {/* scale */}
        <div style={{ ...card, padding: isMobile ? 16 : 22 }}>
          <DigitalScale cup={active} reading={reading} unit={unit} state={scaleState} />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <Pill onClick={() => active && weigh(active.id)} disabled={!active || busy.current || (active && records[active.id] != null)} color={DS.primary}>
              <IScale size={18} color="#fff" /> {active && records[active.id] != null ? 'Weighed' : busy.current ? 'Weighing…' : `Weigh Cup ${active?.id ?? ''}`}
            </Pill>
          </div>

          {active && scaleState === 'done' && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 12, background: DS.accentLight,
              borderLeft: `4px solid ${DS.accent}`, fontSize: 13, color: DS.ink, lineHeight: 1.5, animation: 'wc-fadeUp .3s ease',
            }}>
              <strong>Cup {active.id} — {active.label}: {active.mass} {unit}.</strong> That reading is its mass. {active.reason}
            </div>
          )}
        </div>

        {/* record table */}
        <div style={{ ...card, padding: isMobile ? 14 : 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: DS.primaryDark, marginBottom: 10 }}>
            Record of readings
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 0, borderRadius: 10, overflow: 'hidden', border: `1px solid ${DS.gray200}` }}>
            <div style={hCell}>Cup</div>
            <div style={{ ...hCell, textAlign: 'right' }}>Mass</div>
            {cups.map((c, i) => {
              const r = records[c.id];
              return (
                <React.Fragment key={c.id}>
                  <div style={{ ...bCell(i), display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{c.emoji}</span>
                    <span style={{ fontWeight: 600 }}>Cup {c.id} · {c.label}</span>
                  </div>
                  <div style={{ ...bCell(i), textAlign: 'right', fontWeight: 700, color: r != null ? c.accent : DS.gray400 }}>
                    {r != null ? `${r} ${unit}` : '—'}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
          <Pill onClick={goToResult} disabled={!allWeighed} color={DS.accent}>
            See the result <IArrow size={18} color="#fff" />
          </Pill>
        </div>
        {!allWeighed && (
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: DS.gray400, fontWeight: 600 }}>
            Weigh all three cups to continue
          </div>
        )}
      </div>
    );
  };

  // ═══════════════ RESULT ═══════════════
  const renderResult = () => {
    const left = leftId ? cupById[leftId] : null;
    const right = rightId ? cupById[rightId] : null;
    const heavier = left && right ? (left.mass === right.mass ? null : left.mass > right.mass ? left : right) : null;

    return (
      <div style={{ animation: 'wc-fadeUp .4s both', position: 'relative' }}>
        {/* confetti only when prediction is perfect */}
        {predictionExact && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
            {Array.from({ length: 46 }).map((_, i) => (
              <span key={i} style={{
                position: 'absolute', top: -16, left: `${(i * 2.2) % 100}%`, width: 8, height: 8, borderRadius: 2,
                background: [DS.accent, DS.primary, DS.success, DS.primaryDark, DS.accentDark][i % 5],
                animation: `wc-fall ${2 + (i % 5) * 0.3}s linear ${(i % 7) * 0.12}s forwards`,
              }} />
            ))}
          </div>
        )}

        {/* verdict */}
        <div style={{
          ...card, padding: isMobile ? 16 : 20, textAlign: 'center', marginBottom: 16,
          background: predictionExact ? DS.successBg : DS.primaryGhost,
          border: `1.5px solid ${predictionExact ? DS.success : DS.primaryLight}`,
        }}>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 6 }}>
            {[0, 1, 2].map((i) => (
              <IStar key={i} size={28} filled={i < stars} color={DS.accent}
                style={{ animation: `wc-star .45s ${i * 0.12}s both` }} />
            ))}
          </div>
          <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: DS.ink }}>
            {predictionExact ? 'Spot on! Your ranking matched the balance.' : `You placed ${correctSlots} of 3 correctly.`}
          </div>
          <div style={{ fontSize: 13.5, color: DS.gray700, marginTop: 4, fontWeight: 500 }}>
            Real order, lightest → heaviest:&nbsp;
            <strong>{trueOrder.map((id) => `Cup ${id} (${cupById[id].mass}${unit})`).join('  ·  ')}</strong>
          </div>
        </div>

        {/* findings — prediction check + compare balance side by side on wide screens */}
        <div style={{ display: 'grid', gridTemplateColumns: isWide && showCompare ? '1fr 1fr' : '1fr', gap: 16, alignItems: 'start', marginBottom: 16 }}>
        {/* prediction vs actual strip */}
        <div style={{ ...card, padding: isMobile ? 14 : 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: DS.primaryDark, marginBottom: 10 }}>Your guess vs the balance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SLOT_META.map((m, i) => {
              const guessed = slots[i] ? cupById[slots[i] as string] : null;
              const actual = cupById[trueOrder[i]];
              const ok = slots[i] === trueOrder[i];
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
                  background: ok ? DS.successBg : DS.dangerBg, border: `1px solid ${ok ? DS.success : DS.danger}33`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: DS.gray700, width: 78, flexShrink: 0 }}>{m.tag}. {m.label}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: DS.ink }}>
                    You said <strong>{guessed ? `Cup ${guessed.id}` : '—'}</strong>
                    <span style={{ color: DS.gray400 }}> · actually </span>
                    <strong style={{ color: actual.accent }}>Cup {actual.id} ({actual.mass}{unit})</strong>
                  </span>
                  {ok ? <ICheck size={18} color={DS.success} /> : <IX size={18} color={DS.danger} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* compare beam */}
        {showCompare && (
          <div style={{ ...card, padding: isMobile ? 14 : 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DS.primaryDark, marginBottom: 4 }}>Put two cups on the balance</div>
            <div style={{ fontSize: 12, color: DS.gray700, marginBottom: 10 }}>
              The side with more mass dips lower. Tap to swap either pan.
            </div>
            <TwoPanBalance left={left} right={right} />
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              <PanPicker label="Left pan" value={leftId} cups={cups} onPick={setLeftId} />
              <PanPicker label="Right pan" value={rightId} cups={cups} onPick={setRightId} />
            </div>
            {heavier && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13.5, fontWeight: 700, color: heavier.accent }}>
                Cup {heavier.id} ({heavier.label}) dips lower → it has more mass.
              </div>
            )}
            {left && right && !heavier && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13.5, fontWeight: 700, color: DS.gray700 }}>
                Both readings are equal → equal mass, so the beam stays level.
              </div>
            )}
          </div>
        )}
        </div>

        {/* mass definition — fuller explanation */}
        <div style={{
          ...card, padding: isMobile ? 16 : 20, marginBottom: 16,
          background: `linear-gradient(135deg, ${DS.primaryDark}, ${DS.primary} 60%, ${DS.accentDark})`,
          border: 'none', color: '#fff',
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <IBulb size={24} color="#fff" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>What is mass?</div>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, opacity: 0.97 }}>
                <strong>Mass is the amount of matter in an object</strong> — it is what tells us how heavy or
                light the object is. The cup with more matter packed into the same space gave the bigger
                reading, so it has the most mass.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { i: '⚖️', t: 'Mass is measured in grams (g) and kilograms (kg). 1 kg = 1000 g.' },
              { i: '➕', t: 'More matter in the same space means more mass.' },
              { i: '🔢', t: 'The balance reading is the mass — read it, don\u2019t guess it.' },
              { i: '👁️', t: 'How big or how full a cup looks does not decide its mass.' },
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(255,255,255,0.14)',
                borderRadius: 10, padding: '9px 11px', fontSize: 12.5, lineHeight: 1.45, fontWeight: 500,
              }}>
                <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.2 }}>{f.i}</span>
                <span>{f.t}</span>
              </div>
            ))}
          </div>

          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, opacity: 0.82, fontStyle: 'italic' }}>
            In everyday talk people often say &ldquo;weight&rdquo; for this. The science word is <strong>mass</strong> —
            you&rsquo;ll learn how mass and weight differ in higher classes.
          </p>

          {finalMessage !== DEFAULT_FINAL && (
            <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, opacity: 0.95 }}>{finalMessage}</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Pill onClick={reset} variant="outline" color={DS.primary}>
            <IReset size={17} color={DS.primary} /> Try again
          </Pill>
        </div>
      </div>
    );
  };

  // ── phase stepper ──
  const STEPS = [{ k: 'predict', n: 'Predict' }, { k: 'weigh', n: 'Weigh' }, { k: 'result', n: 'Compare' }];
  const phaseIdx = STEPS.findIndex((s) => s.k === phase);

  return (
    <div ref={ref} className="wtc-root" style={{
      width: '100%', maxWidth: 980, margin: '0 auto', fontFamily: DS.font, color: DS.ink,
      background: DS.gray100, borderRadius: 24, overflow: 'hidden', boxShadow: '0 12px 44px rgba(26,26,46,.12)',
    }}>
      {/* header */}
      <div style={{
        background: `linear-gradient(135deg, ${DS.primaryDark}, ${DS.primary} 55%, ${DS.accentDark})`,
        color: '#fff', padding: isMobile ? '16px 16px' : '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isXs ? 10 : 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, opacity: 0.9 }}>
              Activity 6.8 · Let us measure
            </div>
            <div style={{ fontSize: isXs ? 17 : isMobile ? 19 : 23, fontWeight: 800, marginTop: 2, letterSpacing: -0.3 }}>
              Weigh the Cups
            </div>
          </div>
          <IScale size={isMobile ? 26 : 30} color="rgba(255,255,255,.9)" style={{ flexShrink: 0 }} />
        </div>

        {/* phase stepper — always visible above; never overflows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isXs ? 4 : 6, marginTop: 14 }}>
          {STEPS.map((s, i) => {
            const done = i < phaseIdx, current = i === phaseIdx;
            const circle = isXs ? 20 : isMobile ? 23 : 26;
            return (
              <React.Fragment key={s.k}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isXs ? 5 : 7, minWidth: 0 }}>
                  <div style={{
                    width: circle, height: circle, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isXs ? 11 : 13, fontWeight: 800, flexShrink: 0,
                    background: done ? DS.success : current ? '#fff' : 'rgba(255,255,255,.2)',
                    color: current ? DS.primaryDark : '#fff',
                  }}>{done ? '✓' : i + 1}</div>
                  <span style={{ fontSize: isXs ? 10 : isMobile ? 11.5 : 12.5, fontWeight: 700, opacity: current ? 1 : 0.85, whiteSpace: 'nowrap' }}>{s.n}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: done ? DS.success : 'rgba(255,255,255,.25)', minWidth: 8 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* body */}
      <div style={{ padding: isMobile ? 16 : 22 }}>
        {phase === 'predict' && renderPredict()}
        {phase === 'weigh' && renderWeigh()}
        {phase === 'result' && renderResult()}
      </div>

      {/* footer */}
      <div style={{
        textAlign: 'center', fontSize: 10.5, color: DS.gray400, fontWeight: 600, padding: '0 12px 14px',
      }}>
        Curiosity · Textbook of Science · Grade 6 · Chapter 6 — Materials Around Us
      </div>

      {/* drag ghost */}
      {drag && (() => {
        const c = cupById[drag.id];
        return (
          <div style={{
            position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%,-50%) rotate(-4deg)',
            pointerEvents: 'none', zIndex: 200, background: '#fff', border: `2px solid ${DS.primary}`,
            borderRadius: 14, padding: '8px 10px', boxShadow: '0 12px 28px rgba(26,26,46,.28)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <CupArt scene={c.scene} accent={c.accent} size={48} />
            <span style={{ fontSize: 11, fontWeight: 700, color: DS.ink, fontFamily: DS.font }}>Cup {c.id}</span>
          </div>
        );
      })()}
    </div>
  );
};

// pan picker (compare)
const PanPicker: React.FC<{ label: string; value: string | null; cups: CupSpec[]; onPick: (id: string) => void }> = ({
  label, value, cups, onPick,
}) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: DS.gray700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {cups.map((c) => {
        const active = value === c.id;
        return (
          <button key={c.id} onClick={() => onPick(c.id)} title={`Cup ${c.id} · ${c.label}`}
            style={{
              width: 40, height: 40, borderRadius: 12, cursor: 'pointer', fontSize: 18,
              border: `2px solid ${active ? c.accent : DS.gray200}`,
              background: active ? '#fff' : DS.gray100,
              boxShadow: active ? `0 4px 12px ${c.accent}33` : 'none', transition: 'all .15s ease',
            }}>{c.emoji}</button>
        );
      })}
    </div>
  </div>
);

// table cell styles
const hCell: React.CSSProperties = {
  background: DS.primaryGhost, padding: '10px 12px', fontSize: 12, fontWeight: 700, color: DS.primaryDark,
};
const bCell = (i: number): React.CSSProperties => ({
  padding: '10px 12px', fontSize: 13, color: DS.ink, background: i % 2 ? DS.white : DS.gray100,
  borderTop: `1px solid ${DS.gray200}`,
});

export default WeighTheCups;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════