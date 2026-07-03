// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: water_filter_builder.tsx
// Topic M2.S5.T14 — "Build a low-cost water filter"
// Grade tier: 6 (heavy gamification, story framing, playful tone)
// Interactions: TAP-TO-PLACE only (no drag-drop, house rule). Singularity palette.
// Flow: tap a layer card → it fills the next empty slot (bottom→top) →
//   pour pond water → water drips layer by layer → clear (correct order)
//   or cloudy + hint (wrong order). Reset & rebuild. Then a summary screen.
// 4 cards for 4 slots: one card per layer, no distractor — getting the order right is the puzzle.
// Correct stack (bottom→top): cotton plug → charcoal → fine sand → pebbles/gravel.
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
const Undo2 = mkIcon(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" /></>);

// ==================== TYPE DEFINITIONS ====================

type GradeLevel = 6 | 7 | 8;
type Stage = 'build' | 'pour' | 'result' | 'summary';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: 'learn';
}

interface LayerDef {
  id: string;
  name: string;
  short: string;          // tiny label drawn inside the slot
  role: string;           // what this layer does (shown on the result screen)
  fill: string;           // primary colour
  fill2: string;          // speckle / secondary colour
  texture: 'plug' | 'fine' | 'grain' | 'pebble';
}

interface BuilderAdditionalProps {
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
    additionalProps?: BuilderAdditionalProps;
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
    glass: '#E8F0F4', steel: '#B7BFC9', pond: '#9C7B52',
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

// ==================== LAYER LIBRARY ====================
// The filter is an UPTURNED bottle: water pours in the wide top, exits the neck (bottom).
// Slots are numbered 0 = BOTTOM (at the neck) ... 3 = TOP (at the wide mouth).
// CORRECT bottom→top: cotton plug → charcoal → fine sand → pebbles/gravel.
//   cotton (bottom)  : plugs the neck so nothing washes out
//   charcoal         : removes colour, smell and fine impurities
//   fine sand        : traps fine mud particles
//   pebbles/gravel   : catch the big floating leaves & debris first

const LAYERS: Record<string, LayerDef> = {
  cotton:     { id: 'cotton',     name: 'Cotton plug',       short: 'Cotton',   role: 'plugs the neck so the other layers (and clean water) don’t wash straight out', fill: '#FAFAFA', fill2: '#E4E4E4', texture: 'plug' },
  charcoal:   { id: 'charcoal',   name: 'Charcoal',          short: 'Charcoal', role: 'removes colour, smell and very fine impurities from the water', fill: '#3A3A40', fill2: '#1F1F24', texture: 'grain' },
  fine_sand:  { id: 'fine_sand',  name: 'Fine sand',         short: 'Fine sand', role: 'traps the fine mud and small particles', fill: '#E3C893', fill2: '#CBA968', texture: 'fine' },
  pebbles:    { id: 'pebbles',    name: 'Pebbles / gravel',  short: 'Pebbles',  role: 'catch the large floating leaves and debris first', fill: '#9AA0A6', fill2: '#6E747A', texture: 'pebble' },
};

// the 4 palette cards — one per slot, no distractor (pebbles is the top layer)
const PALETTE = ['cotton', 'charcoal', 'fine_sand', 'pebbles'];
// correct stack, slot 0 (bottom) → slot 3 (top)
const CORRECT = ['cotton', 'charcoal', 'fine_sand', 'pebbles'];
const SLOTS = CORRECT.length;

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
@keyframes wf_fadeInUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes wf_popIn { 0% { opacity: 0; transform: scale(0.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes wf_shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-7px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
@keyframes wf_scaleInBack { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
@keyframes wf_pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes wf_glow { 0%,100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); } 50% { box-shadow: 0 0 0 8px rgba(46,204,113,0.25); } }
@keyframes wf_starPop { 0% { opacity: 0; transform: scale(0) rotate(-30deg); } 70% { transform: scale(1.25) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes wf_confetti { 0% { opacity: 1; transform: translateY(-10px) rotate(0); } 100% { opacity: 0; transform: translateY(440px) rotate(540deg); } }
@keyframes wf_dropFall { 0% { opacity: 0; transform: translateY(-8px) scale(0.6); } 15% { opacity: 1; } 100% { opacity: 0.9; transform: translateY(0) scale(1); } }
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
          animation: `wf_confetti ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
};

const StarsRow: React.FC<{ count: number; stagger: number }> = ({ count, stagger }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '6px 0 4px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} size={34} fill={DS.c.amber} color={DS.c.amber}
        style={{ animation: `wf_starPop .5s ${i * (stagger / 1000)}s both` }} />
    ))}
  </div>
);

// fixed speckle layout per layer (module-level so it never re-randomises)
const SPECKLES = Array.from({ length: 26 }, (_, i) => ({
  x: ((i * 53) % 100) / 100,
  y: ((i * 29) % 100) / 100,
  r: 0.4 + ((i * 7) % 5) / 5,
}));

// ──────────────────────────────────────────────────────────────────────────
// BottleScene — an upturned (neck-down) plastic bottle with 4 stacked layer slots.
// Props:
//   placed   — array of layerId|null, index 0 = bottom slot (neck) … 3 = top (mouth)
//   highlightNext — which slot index is the "next empty" (pulse target) or -1
//   pourT    — 0..1 pour-water animation progress (0 = not pouring)
//   clarity  — 0..1 output clarity once poured (1 clear, low cloudy)
//   onSlotTap(i) — tap a filled slot to remove it
// ──────────────────────────────────────────────────────────────────────────
const BottleScene: React.FC<{
  placed: (string | null)[];
  highlightNext: number;
  pourT: number;
  clarity: number;
  width: number;
  onSlotTap?: (i: number) => void;
}> = ({ placed, highlightNext, pourT, clarity, width, onSlotTap }) => {
  const W = width;
  const H = Math.round(width * 1.18);

  // bottle geometry (neck pointing DOWN)
  const bx = W * 0.20, bw = W * 0.60;              // bottle body left / width
  const bodyTop = H * 0.13;                         // open (cut) top of the upturned bottle
  const bodyBot = H * 0.74;                         // where body tapers into the neck
  const neckW = W * 0.16;
  const neckX = W / 2 - neckW / 2;
  const neckBot = H * 0.86;                         // bottom tip of neck (outlet)
  const bodyH = bodyBot - bodyTop;
  const slotH = bodyH / SLOTS;

  // beaker (output) below the neck
  const beTop = H * 0.88, beBot = H * 0.995;
  const beX = W * 0.30, beW = W * 0.40;
  const outColor = pourT > 0.2
    ? `rgb(${Math.round(180 - clarity * 30)}, ${Math.round(170 + clarity * 40)}, ${Math.round(150 + clarity * 70)})`
    : 'transparent';
  // beaker fill level grows with pour
  const fillLevel = clamp((pourT - 0.25) / 0.75, 0, 1);

  const slotRect = (i: number) => {
    // i=0 bottom → y nearest the neck; i=SLOTS-1 top
    const top = bodyTop + (SLOTS - 1 - i) * slotH;
    return { x: bx + 3, y: top, w: bw - 6, h: slotH };
  };

  const renderTexture = (lay: LayerDef, x: number, y: number, w: number, h: number, key: string) => {
    const dots = SPECKLES.slice(0, lay.texture === 'pebble' ? 12 : lay.texture === 'plug' ? 0 : 22);
    return (
      <g key={key}>
        <rect x={x} y={y} width={w} height={h} fill={lay.fill} />
        {lay.texture === 'plug' && (
          // cotton: soft wavy fibres
          <g stroke={lay.fill2} strokeWidth={1.4} fill="none" opacity={0.8}>
            {Array.from({ length: 5 }).map((_, r) => (
              <path key={r} d={`M ${x + 2} ${y + (r + 1) * (h / 6)} q ${w / 6} -6 ${w / 3} 0 q ${w / 6} 6 ${w / 3} 0 q ${w / 6} -6 ${w / 3} 0`} />
            ))}
          </g>
        )}
        {dots.map((d, di) => {
          const rr = (lay.texture === 'pebble' ? 3.2 : lay.texture === 'fine' ? 0.9 : 1.7) * d.r;
          return <circle key={di} cx={x + d.x * (w - 6) + 3} cy={y + d.y * (h - 6) + 3} r={rr} fill={lay.fill2} opacity={lay.texture === 'fine' ? 0.55 : 0.8} />;
        })}
      </g>
    );
  };

  // pour drip column down the centre, through the stack
  const dripX = W / 2;
  const pourFront = bodyTop + pourT * (neckBot - bodyTop);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', borderRadius: DS.r.lg, background: 'linear-gradient(180deg,#FBFBFE,#EDF3F7)' }}>
      <defs>
        <clipPath id="wf_bodyClip">
          <path d={`M ${bx} ${bodyTop} L ${bx + bw} ${bodyTop} L ${bx + bw} ${bodyBot}
            L ${neckX + neckW} ${bodyBot + (neckBot - bodyBot) * 0.5}
            L ${neckX + neckW} ${neckBot} L ${neckX} ${neckBot}
            L ${neckX} ${bodyBot + (neckBot - bodyBot) * 0.5} L ${bx} ${bodyBot} Z`} />
        </clipPath>
      </defs>

      {/* output beaker */}
      <path d={`M ${beX} ${beTop} L ${beX + 6} ${beBot} L ${beX + beW - 6} ${beBot} L ${beX + beW} ${beTop}`}
        fill={DS.c.glass} stroke={DS.c.steel} strokeWidth="2.5" />
      {fillLevel > 0 && (
        <rect x={beX + 4} y={beBot - (beBot - beTop - 4) * fillLevel} width={beW - 8} height={(beBot - beTop - 4) * fillLevel}
          fill={outColor} style={{ transition: 'fill .5s ease' }} />
      )}

      {/* layers inside the body (clip to bottle shape) */}
      <g clipPath="url(#wf_bodyClip)">
        {/* faint water still sitting on top of the stack while pouring */}
        {pourT > 0 && pourT < 0.9 && (
          <rect x={bx} y={bodyTop} width={bw} height={Math.max(0, (bodyTop + slotH * 0.5) - bodyTop + (1 - pourT) * 10)} fill={DS.c.pond} opacity={0.5} />
        )}
        {placed.map((lid, i) => {
          if (!lid) return null;
          const lay = LAYERS[lid];
          const s = slotRect(i);
          return renderTexture(lay, s.x - 4, s.y, s.w + 8, s.h, 'lay' + i);
        })}
        {/* pour drip column */}
        {pourT > 0 && (
          <line x1={dripX} y1={bodyTop} x2={dripX} y2={pourFront} stroke={DS.c.waterDeep} strokeWidth={4} opacity={0.7} strokeLinecap="round" />
        )}
      </g>

      {/* slot dividers + tap targets + empty-slot outlines */}
      {Array.from({ length: SLOTS }).map((_, i) => {
        const s = slotRect(i);
        const filled = !!placed[i];
        const isNext = highlightNext === i;
        return (
          <g key={'slot' + i}>
            {!filled && (
              <rect x={s.x} y={s.y} width={s.w} height={s.h - 2} rx={4}
                fill={isNext ? 'rgba(255,114,18,0.10)' : 'rgba(74,77,201,0.04)'}
                stroke={isNext ? DS.c.accent : DS.c.gray400} strokeWidth={isNext ? 2.5 : 1.5}
                strokeDasharray={isNext ? '0' : '5 4'}
                style={{ animation: isNext ? 'wf_pulse 1.3s ease-in-out infinite' : undefined }} />
            )}
            {filled && onSlotTap && (
              <rect x={s.x} y={s.y} width={s.w} height={s.h - 2} fill="transparent"
                style={{ cursor: 'pointer' }} onClick={() => onSlotTap(i)} />
            )}
            {/* tiny in-slot label */}
            {filled && (
              <text x={W / 2} y={s.y + s.h / 2 + 4} textAnchor="middle" fontFamily={DS.font} fontWeight="700"
                fontSize={W * 0.036} fill={LAYERS[placed[i]!].texture === 'grain' && placed[i] === 'charcoal' ? '#fff' : DS.c.gray900}
                style={{ pointerEvents: 'none' }} opacity={0.92}>
                {LAYERS[placed[i]!].short}
              </text>
            )}
            {!filled && (
              <text x={W / 2} y={s.y + s.h / 2 + 4} textAnchor="middle" fontFamily={DS.font} fontWeight="600"
                fontSize={W * 0.03} fill={isNext ? DS.c.accent : DS.c.gray400} style={{ pointerEvents: 'none' }}>
                {isNext ? 'tap a card →' : 'empty'}
              </text>
            )}
          </g>
        );
      })}

      {/* bottle outline (drawn on top) */}
      <path d={`M ${bx} ${bodyTop} L ${bx + bw} ${bodyTop} L ${bx + bw} ${bodyBot}
        L ${neckX + neckW} ${bodyBot + (neckBot - bodyBot) * 0.5}
        L ${neckX + neckW} ${neckBot} L ${neckX} ${neckBot}
        L ${neckX} ${bodyBot + (neckBot - bodyBot) * 0.5} L ${bx} ${bodyBot} Z`}
        fill="none" stroke={DS.c.steel} strokeWidth="3" />
      {/* cut-top rim hint */}
      <line x1={bx - 2} y1={bodyTop} x2={bx + bw + 2} y2={bodyTop} stroke={DS.c.primary} strokeWidth="3" strokeDasharray="6 4" opacity={0.6} />
      <text x={bx + bw + 6} y={bodyTop + 4} fontFamily={DS.font} fontSize={W * 0.026} fill={DS.c.gray700} opacity={0.9}>cut top — pour here</text>

      {/* drip out of the neck while pouring */}
      {pourT > 0.55 && (
        <circle cx={W / 2} cy={neckBot + (beTop - neckBot) * ((pourT - 0.55) / 0.45)} r={W * 0.012}
          fill={outColor === 'transparent' ? DS.c.waterDeep : outColor}
          style={{ animation: 'wf_dropFall .5s ease-in' }} />
      )}
    </svg>
  );
};

// palette card preview swatch (tiny SVG so it reads even before placement)
const Swatch: React.FC<{ lay: LayerDef; size?: number }> = ({ lay, size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" style={{ borderRadius: 7, flexShrink: 0 }}>
    <rect width="34" height="34" rx="7" fill={lay.fill} />
    {lay.texture === 'plug'
      ? <g stroke={lay.fill2} strokeWidth="1.4" fill="none" opacity="0.85">
          <path d="M3 11 q5 -5 10 0 q5 5 10 0 q5 -5 8 0" /><path d="M3 19 q5 -5 10 0 q5 5 10 0 q5 -5 8 0" /><path d="M3 27 q5 -5 10 0 q5 5 10 0 q5 -5 8 0" />
        </g>
      : SPECKLES.slice(0, lay.texture === 'pebble' ? 7 : 14).map((d, i) =>
          <circle key={i} cx={2 + d.x * 30} cy={2 + d.y * 30} r={(lay.texture === 'pebble' ? 2.6 : lay.texture === 'fine' ? 0.8 : 1.5) * d.r} fill={lay.fill2} opacity={lay.texture === 'fine' ? 0.6 : 0.85} />)}
  </svg>
);

// ==================== MAIN COMPONENT ====================

const WaterFilterBuilder: React.FC<ToolProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w: containerW, isMobile } = useResponsive(rootRef);

  const config = useMemo(() => ({
    width: props.width ?? 840,
    gradeLevel: (props.gradeLevel ?? 6) as GradeLevel,
    themeColor: props.themeColor ?? DS.c.primary,
  }), [props]);

  const tier = useMemo(() => {
    const g = config.gradeLevel;
    if (g === 8) return { confettiCount: 15, confettiDuration: 1500, showStars: false, starCount: 0, starStaggerMs: 0, scoreSizePx: 46, bodyFontMobile: 15, bodyFontDesktop: 16, touchTargetMobile: 48, pourMs: 2200, storyFrame: false };
    if (g === 7) return { confettiCount: 40, confettiDuration: 2000, showStars: true, starCount: 5, starStaggerMs: 200, scoreSizePx: 54, bodyFontMobile: 15, bodyFontDesktop: 16, touchTargetMobile: 50, pourMs: 2600, storyFrame: false };
    return { confettiCount: 70, confettiDuration: 2500, showStars: true, starCount: 5, starStaggerMs: 200, scoreSizePx: 62, bodyFontMobile: 16, bodyFontDesktop: 17, touchTargetMobile: 56, pourMs: 3000, storyFrame: true };
  }, [config.gradeLevel]);

  const ap = props.additionalProps || {};
  const showHints = ap.showHints ?? true;
  const bodyFont = isMobile ? tier.bodyFontMobile : tier.bodyFontDesktop;
  const sceneW = clamp(Math.min(containerW * (isMobile ? 0.62 : 0.46), 300), 200, 300);

  // ── build state ──
  const [placed, setPlaced] = useState<(string | null)[]>(() => Array(SLOTS).fill(null));
  const [stage, setStage] = useState<Stage>('build');
  const [attempts, setAttempts] = useState(0);
  const [solvedFirstTry, setSolvedFirstTry] = useState<boolean | null>(null);
  const [pourT, setPourT] = useState(0);
  const rafRef = useRef<number | null>(null);
  const [scoreShown, setScoreShown] = useState(0);

  const nextEmpty = placed.indexOf(null);
  const allFilled = nextEmpty === -1;
  const isCorrect = useMemo(() => allFilled && placed.every((l, i) => l === CORRECT[i]), [placed, allFilled]);
  const clarity = isCorrect ? 1 : 0.25;
  const usedIds = useMemo(() => new Set(placed.filter(Boolean) as string[]), [placed]);

  // ── inject fonts + keyframes ──
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'wf-keyframes';
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('wf-keyframes'); if (e) e.remove(); };
  }, []);

  useEffect(() => { setStopAutoNext?.(true); }, [setStopAutoNext]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // report step details (build=1, pour/result=2, summary=3)
  useEffect(() => {
    const cur = stage === 'build' ? 1 : stage === 'summary' ? 3 : 2;
    setStepDetails?.({ currentStep: cur, totalSteps: 3, isPaused: true, currentMode: 'learn' });
  }, [stage, setStepDetails]);

  // ── place / remove layers (tap-to-place) ──
  const placeLayer = (id: string) => {
    if (stage !== 'build' || usedIds.has(id) || allFilled) return;
    setPlaced((prev) => {
      const i = prev.indexOf(null);
      if (i === -1) return prev;
      const next = [...prev]; next[i] = id; return next;
    });
  };
  const removeSlot = (i: number) => {
    if (stage !== 'build') return;
    setPlaced((prev) => { const next = [...prev]; next[i] = null; return next; });
  };
  const resetBuild = () => { setPlaced(Array(SLOTS).fill(null)); setStage('build'); setPourT(0); };

  // ── pour animation ──
  const runPour = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setStage('pour');
    setPourT(0);
    const start = performance.now();
    const dur = tier.pourMs;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setPourT(easeInOutCubic(p));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setPourT(1);
        setStage('result');
        setAttempts((a) => {
          const na = a + 1;
          setSolvedFirstTry((prevSolved) => prevSolved === null ? (isCorrect && na === 1) : prevSolved);
          return na;
        });
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [tier.pourMs, isCorrect]);

  // summary score: 3 stars first-try-correct, 2 if correct after retries, else based on attempts
  const summaryScore = useMemo(() => {
    if (!isCorrect) return 0;
    return solvedFirstTry ? 3 : 2;
  }, [isCorrect, solvedFirstTry]);

  useEffect(() => {
    if (stage !== 'summary') return;
    setScoreShown(0);
    const start = performance.now(); const dur = 900; let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setScoreShown(Math.round(easeOutCubic(p) * summaryScore));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, summaryScore]);

  const startOver = () => {
    setPlaced(Array(SLOTS).fill(null));
    setStage('build'); setPourT(0); setAttempts(0); setSolvedFirstTry(null);
  };

  // wrong-order hint: find the first slot that differs from CORRECT
  const wrongHint = useMemo(() => {
    if (isCorrect) return '';
    if (placed[0] !== 'cotton')
      return 'Cloudy! The bottom layer (at the neck) must be the cotton plug — otherwise the sand washes straight out.';
    if (placed[SLOTS - 1] !== 'pebbles')
      return 'Cloudy! The top layer should be the coarsest (pebbles / gravel) to catch big bits first; the finest layers go lower.';
    return 'Cloudy! The layers are out of order. Remember: coarsest on top, finest below, cotton plug at the very bottom.';
  }, [placed, isCorrect]);

  // ==================== RENDER HELPERS ====================

  const sectionTitle = (txt: string) => (
    <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isMobile ? 18 : 20, color: DS.c.gray900, marginBottom: 4 }}>{txt}</div>
  );

  const palette = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 13, color: DS.c.gray700, marginBottom: 2 }}>
        Layer cards — tap to add (get the order right!)
      </div>
      {PALETTE.map((id) => {
        const lay = LAYERS[id];
        const used = usedIds.has(id);
        const disabled = used || allFilled || stage !== 'build';
        return (
          <button key={id} onClick={() => placeLayer(id)} disabled={disabled}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: DS.r.md,
              border: `2px solid ${used ? DS.c.gray200 : DS.c.primaryLight}`,
              background: used ? DS.c.gray100 : '#fff', cursor: disabled ? 'default' : 'pointer',
              opacity: used ? 0.45 : 1, textAlign: 'left', minHeight: tier.touchTargetMobile,
              transition: 'transform .12s ease, box-shadow .2s ease', boxShadow: used ? 'none' : DS.sh.sm,
            }}>
            <Swatch lay={lay} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: bodyFont - 2, color: DS.c.gray900 }}>{lay.name}</div>
              <div style={{ fontFamily: DS.font, fontSize: 11.5, color: DS.c.gray700, lineHeight: 1.25 }}>{lay.role.length > 46 ? lay.role.slice(0, 44) + '…' : lay.role}</div>
            </div>
            {used && <Check size={16} strokeWidth={3} color={DS.c.success} />}
          </button>
        );
      })}
    </div>
  );

  const scene = (
    <div style={{ background: DS.c.gray100, borderRadius: DS.r.xl, padding: isMobile ? 12 : 16, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: sceneW }}>
        <BottleScene
          placed={placed}
          highlightNext={stage === 'build' ? nextEmpty : -1}
          pourT={pourT}
          clarity={clarity}
          width={sceneW}
          onSlotTap={stage === 'build' ? removeSlot : undefined}
        />
      </div>
    </div>
  );

  // ---------- BUILD / POUR / RESULT (one screen, scene + palette) ----------
  const renderWorkbench = () => (
    <div style={{ animation: 'wf_fadeInUp .4s both' }}>
      {tier.storyFrame && stage === 'build' && attempts === 0 && (
        <div style={{ fontFamily: DS.serif, fontStyle: 'italic', fontSize: bodyFont + 1, color: DS.c.primaryDark, marginBottom: 10 }}>
          The pond water is muddy. Build a filter from an old bottle to clean it — but the layers must go in the right order!
        </div>
      )}
      {sectionTitle(
        stage === 'build'
          ? (allFilled ? 'All four layers in — pour the pond water!' : `Add layer ${nextEmpty + 1} of ${SLOTS} (bottom → top)`)
          : stage === 'pour' ? 'Pouring pond water…'
          : isCorrect ? 'Clear water! 🎉' : 'Still cloudy 😕',
      )}

      <div style={{ display: 'flex', gap: isMobile ? 12 : 18, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start' }}>
        <div style={{ flex: isMobile ? undefined : '0 0 46%' }}>{scene}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {stage === 'build' && palette}

          {stage === 'result' && (
            <div style={{
              padding: 14, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900,
              background: isCorrect ? '#EAFBF1' : '#FDECEC', animation: 'wf_popIn .4s both', marginBottom: 12,
            }}>
              {isCorrect ? (
                <span><b style={{ color: DS.c.success }}>Perfect order!</b> Each layer does its job: pebbles catch big bits, fine sand traps mud, charcoal cleans colour & smell, and the cotton plug holds it all in. The water comes out clear.</span>
              ) : (
                <span><b style={{ color: DS.c.danger }}>Cloudy output.</b>{showHints ? ' ' + wrongHint : ' The layers are out of order — try again.'}</span>
              )}
            </div>
          )}

          {(stage === 'pour') && (
            <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray700, lineHeight: 1.5 }}>
              Watch the water trickle down through each layer and collect in the beaker…
            </div>
          )}

          {stage === 'build' && (
            <div style={{ fontFamily: DS.font, fontSize: 12.5, color: DS.c.gray700, marginTop: 10, lineHeight: 1.4 }}>
              Tip: the bottle is upside-down. Tap cards to stack from the <b>bottom (neck)</b> upward. Tap a placed layer to take it back out.
            </div>
          )}
        </div>
      </div>

      {/* action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 10, flexWrap: 'wrap' }}>
        <PillButton label="Reset" variant="ghost" color={DS.c.gray700} icon={<RotateCcw size={16} />}
          disabled={stage === 'pour' || placed.every((p) => !p)} onClick={resetBuild} minH={tier.touchTargetMobile} />

        {stage === 'build' && (
          <PillButton label="Pour pond water" color={DS.c.accent} icon={<Droplets size={18} />}
            disabled={!allFilled} onClick={runPour} minH={tier.touchTargetMobile} fontSize={bodyFont + 1} />
        )}
        {stage === 'result' && !isCorrect && (
          <PillButton label="Fix the order" color={DS.c.primary} icon={<Undo2 size={16} />}
            onClick={() => setStage('build')} minH={tier.touchTargetMobile} />
        )}
        {stage === 'result' && isCorrect && (
          <PillButton label="See my result" color={DS.c.accent} icon={<Award size={18} />}
            onClick={() => setStage('summary')} minH={tier.touchTargetMobile} fontSize={bodyFont + 1} />
        )}
      </div>
      {stage === 'build' && !allFilled && (
        <div style={{ textAlign: 'center', marginTop: 8, fontFamily: DS.font, fontSize: 12, color: DS.c.gray400 }}>
          Fill all four slots to pour
        </div>
      )}
    </div>
  );

  // ---------- SUMMARY ----------
  const renderSummary = () => (
    <div style={{ animation: 'wf_fadeInUp .4s both', position: 'relative' }}>
      <ConfettiBurst count={tier.confettiCount} duration={tier.confettiDuration} />
      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: isMobile ? '6px 4px' : '10px 8px' }}>
        <Award size={44} color={DS.c.accent} style={{ marginBottom: 4 }} />
        {tier.showStars && <StarsRow count={Math.max(scoreShown, 0)} stagger={tier.starStaggerMs} />}
        <div style={{ fontFamily: DS.font, fontWeight: 800, fontSize: tier.scoreSizePx, color: DS.c.primaryDark, lineHeight: 1.1 }}>
          Filter built!
        </div>
        <div style={{ fontFamily: DS.font, fontWeight: 500, fontSize: bodyFont + 1, color: DS.c.gray700, margin: '8px 0 4px' }}>
          {solvedFirstTry ? 'Spot on — you got the layer order right the first time!' : `You cleaned the water in ${attempts} tries. Now you know the order!`}
        </div>
      </div>

      {/* correct stack recap, top → bottom (as it appears in the bottle) */}
      <div style={{ maxWidth: 460, margin: '14px auto 18px' }}>
        <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 13, color: DS.c.gray700, marginBottom: 8, textAlign: 'center' }}>
          Why this order works (top → bottom)
        </div>
        {[...CORRECT].reverse().map((id) => {
          const lay = LAYERS[id];
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: DS.r.md, border: `1px solid ${DS.c.gray200}`, background: '#fff', marginBottom: 7, boxShadow: DS.sh.sm }}>
              <Swatch lay={lay} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: bodyFont - 1, color: DS.c.gray900 }}>{lay.name}</div>
                <div style={{ fontFamily: DS.font, fontSize: 12, color: DS.c.gray700, lineHeight: 1.3 }}>{lay.role}</div>
              </div>
            </div>
          );
        })}
        <div style={{ fontFamily: DS.font, fontSize: 12, color: DS.c.gray700, textAlign: 'center', marginTop: 6 }}>
          Each layer is coarser than the one below it — that graded stack is what filters the water clean.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <PillButton label="Build again" color={DS.c.primary} icon={<RotateCcw size={16} />} onClick={startOver} minH={tier.touchTargetMobile} />
      </div>
    </div>
  );

  // ==================== TOP-LEVEL LAYOUT ====================

  const headerProgress = stage === 'summary' ? 'Done' : stage === 'build' ? `${placed.filter(Boolean).length} / ${SLOTS} layers` : 'Pouring';
  const progressFill = stage === 'summary' ? 1 : stage === 'build' ? placed.filter(Boolean).length / SLOTS : 0.85;

  return (
    <div ref={rootRef} style={{ width: '100%', maxWidth: config.width, margin: '0 auto', fontFamily: DS.font, color: DS.c.gray900, background: DS.c.white, borderRadius: DS.r.xl, overflow: 'hidden', boxShadow: DS.sh.lg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${DS.c.primaryDark}, ${DS.c.primary} 55%, ${DS.c.accentDark})`, padding: isMobile ? '18px 18px' : '22px 26px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Droplets size={isMobile ? 26 : 30} />
            <div>
              <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 23, letterSpacing: 0.2 }}>Build a Low-Cost Water Filter</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>Stack the layers in the right order, then pour the muddy pond water through.</div>
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
      <div style={{ padding: isMobile ? 16 : 24, minHeight: 400 }}>
        {stage === 'summary' ? renderSummary() : renderWorkbench()}
      </div>
    </div>
  );
};

export default WaterFilterBuilder;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════
