// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: soluble_insoluble_explorer.tsx
// Activity 6.7 / Table 6.5 — "Mixing different materials in water" (soluble vs insoluble)
// Grade tier: 6 (heavy gamification, story framing, playful tone)
// Interactions: tap/click only (no drag-drop). Singularity palette. Poppins.
// Flow: Add & Stir  →  Record Table 6.5  →  Wrap  →  Quiz
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play, ChevronLeft, ChevronRight, RotateCcw, Star, Check,
  Beaker, Trophy, FlaskConical,
} from 'lucide-react';

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice';
type Phase = 'play' | 'result' | 'review';
type Solubility = 'soluble' | 'insoluble';
type GradeLevel = 6 | 7 | 8;

interface Material {
  slug: string;
  name: string;
  kind: string;          // what it is (e.g. "Common salt", "River sand")
  solubility: Solubility;
  // 0 = does not dissolve at all, 1 = dissolves fully & quickly. Drives the stir animation.
  dissolveRate: number;
  color: string;         // tint when dissolved / particle colour
  solutionTint: string;  // colour of the water after stirring (clear-ish or coloured)
  emoji: string;
}

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

interface SolubleAdditionalProps {
  materials?: (string | Material)[];
  feedbackMessage?: string;
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
    filterSteps?: number[];
    animationSpeed?: number;
    autoPlayDuration?: number;
    themeColor?: string;
    darkMode?: boolean;
    gradeLevel?: GradeLevel;
    additionalProps?: SolubleAdditionalProps;
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
      high: "Brilliant! You're a real chemist!",
      mid: "Nice work! Let's check the tricky ones together.",
      low: "Don't worry — every mix teaches us something. Let's learn!",
    },
    playAgainLabel: 'Play again!', reviewLabel: "Let's see what we learned",
    bodyFontMobile: 16, bodyFontDesktop: 17, heroFontMobile: 34, heroFontDesktop: 46,
    touchTargetMobile: 56, entryEasing: 'easeOutBack', pulseOnCorrect: true, storyFrame: true,
    explanationStyle: 'analogy-first',
  },
  7: {
    confettiCount: 40, confettiDuration: 2000, showStars: true, starCount: 5, starStaggerMs: 200, scoreSizePx: 56,
    encouragement: {
      high: 'Strong work — concept locked.', mid: 'Good job. A couple to polish.', low: "Let's walk through these — you'll get it.",
    },
    playAgainLabel: 'Play again', reviewLabel: 'Review answers',
    bodyFontMobile: 15, bodyFontDesktop: 16, heroFontMobile: 32, heroFontDesktop: 44,
    touchTargetMobile: 50, entryEasing: 'easeOutCubic', pulseOnCorrect: false, storyFrame: false,
    explanationStyle: 'intuitive-then-formal',
  },
  8: {
    confettiCount: 15, confettiDuration: 1500, showStars: false, starCount: 0, starStaggerMs: 0, scoreSizePx: 48,
    encouragement: {
      high: "Excellent. You've got this.", mid: 'Good — review the ones you missed.', low: 'Work through the explanations carefully.',
    },
    playAgainLabel: 'Try fresh materials', reviewLabel: 'Review answers',
    bodyFontMobile: 15, bodyFontDesktop: 16, heroFontMobile: 30, heroFontDesktop: 40,
    touchTargetMobile: 48, entryEasing: 'easeOutCubic', pulseOnCorrect: false, storyFrame: false,
    explanationStyle: 'formal',
  },
} as const;

// ==================== MATERIAL LIBRARY ====================
// dissolveRate: 0 = stays whole & settles, 1 = vanishes into a uniform solution.
// The five canonical Activity 6.7 materials + a few regional extras for variety.

const MATERIAL_LIBRARY: Record<string, Material> = {
  salt:           { slug: 'salt',           name: 'Salt',            kind: 'Common salt',     solubility: 'soluble',   dissolveRate: 0.95, color: '#94A3B8', solutionTint: '#EAF4FB', emoji: '🧂' },
  sugar:          { slug: 'sugar',          name: 'Sugar',           kind: 'Table sugar',     solubility: 'soluble',   dissolveRate: 0.90, color: '#E2C290', solutionTint: '#EAF4FB', emoji: '🍬' },
  sand:           { slug: 'sand',           name: 'Sand',            kind: 'River sand',      solubility: 'insoluble', dissolveRate: 0.00, color: '#C2A878', solutionTint: '#E3D9C4', emoji: '⏳' },
  chalk_powder:   { slug: 'chalk_powder',   name: 'Chalk powder',    kind: 'Chalk (calcium)', solubility: 'insoluble', dissolveRate: 0.05, color: '#E5E7EB', solutionTint: '#EDEEF2', emoji: '🪨' },
  copper_sulphate:{ slug: 'copper_sulphate',name: 'Copper sulphate', kind: 'Copper sulphate', solubility: 'soluble',   dissolveRate: 0.85, color: '#2563EB', solutionTint: '#7CC2F0', emoji: '🔷' },
  sawdust:        { slug: 'sawdust',        name: 'Sawdust',         kind: 'Wood shavings',   solubility: 'insoluble', dissolveRate: 0.00, color: '#A87C4F', solutionTint: '#D8C7AE', emoji: '🪵' },
  glucose:        { slug: 'glucose',        name: 'Glucose',         kind: 'Glucose powder',  solubility: 'soluble',   dissolveRate: 0.88, color: '#FDE68A', solutionTint: '#EAF4FB', emoji: '🥤' },
  baking_soda:    { slug: 'baking_soda',    name: 'Baking soda',     kind: 'Baking soda',     solubility: 'soluble',   dissolveRate: 0.80, color: '#F1F5F9', solutionTint: '#EAF4FB', emoji: '🧁' },
  mud:            { slug: 'mud',            name: 'Mud',             kind: 'Garden soil',     solubility: 'insoluble', dissolveRate: 0.02, color: '#8B5E34', solutionTint: '#C4A678', emoji: '🟤' },
};

const FALLBACK_MAT = (slug: string): Material => ({
  slug, name: slug.replace(/_/g, ' '), kind: 'Material', solubility: 'insoluble',
  dissolveRate: 0.0, color: DS.c.primary, solutionTint: '#E3D9C4', emoji: '⚗️',
});

const resolveMaterial = (entry: string | Material): Material =>
  typeof entry === 'string'
    ? (MATERIAL_LIBRARY[entry] || FALLBACK_MAT(entry))
    : { ...FALLBACK_MAT(entry.slug || 'item'), ...entry };

// ==================== PRNG + CHALLENGE GENERATOR ====================

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

interface Challenge {
  id: string;
  kind: 'classify';
  prompt: string;
  storyPrompt?: string;
  slugs: string[];
  options: string[];
  correctAnswer: string;
  conceptExplanation: string;
}

function generateChallenges(
  seed: number,
  story: boolean,
  pool: Material[],
): Challenge[] {
  const rng = mulberry32(seed);
  const out: Challenge[] = [];

  // ---- 3 classify questions (force a soluble/insoluble mix) ----
  const shuffledPool = shuffle(pool, rng);
  const sol = shuffledPool.filter((o) => o.solubility === 'soluble');
  const ins = shuffledPool.filter((o) => o.solubility === 'insoluble');
  const picks: Material[] = [];
  if (sol[0]) picks.push(sol[0]);
  if (ins[0]) picks.push(ins[0]);
  for (const o of shuffledPool) {
    if (picks.length >= 3) break;
    if (!picks.includes(o)) picks.push(o);
  }
  picks.slice(0, 3).forEach((o, i) => {
    out.push({
      id: `cl${i}`,
      kind: 'classify',
      storyPrompt: story ? `Madam Vidya drops the ${o.name.toLowerCase()} into a tumbler of water and stirs.` : undefined,
      prompt: `Is the ${o.name.toLowerCase()} soluble or insoluble in water?`,
      slugs: [o.slug],
      options: ['Soluble', 'Insoluble'],
      correctAnswer: o.solubility === 'soluble' ? 'Soluble' : 'Insoluble',
      conceptExplanation:
        o.solubility === 'soluble'
          ? `When you stir the ${o.name.toLowerCase()} into water it disappears completely and spreads evenly through the water. A material that completely disappears is soluble — so the ${o.name.toLowerCase()} is soluble.`
          : `No matter how long you stir, the ${o.name.toLowerCase()} stays visible and settles down. A material that stays visible is insoluble — so the ${o.name.toLowerCase()} is insoluble. (Stirring harder does not make it dissolve.)`,
    });
  });

  return shuffle(out, rng);
}

// ==================== EASING ====================

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// ==================== RESPONSIVE HOOK ====================

// Container-based responsiveness: measures the tool's OWN width via ResizeObserver,
// not window.innerWidth. This is essential inside the production iframe / preview
// panel and on tablets (iPad), where the device viewport != the space the tool gets.
// Falls back to window width until the ref attaches.
const useResponsive = (ref: React.RefObject<HTMLElement>) => {
  const [w, setW] = useState<number>(typeof window !== 'undefined' ? Math.min(window.innerWidth, 840) : 840);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.getBoundingClientRect().width || el.clientWidth || w);
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
  // Breakpoints are on the CONTAINER width:
  //   xsmall < 400   → very tight phones, single column everywhere, smallest paddings
  //   phone  < 560   → stacked, biggest touch targets
  //   tablet 560–820 → 2-col friendly, slightly tighter (iPad portrait/landscape panel)
  //   desktop ≥ 820
  return {
    w,
    isXSmall: w < 400,
    isMobile: w < 560,
    isTablet: w >= 560 && w < 820,
    isCompact: w < 820,
  };
};

// ==================== KEYFRAMES ====================

const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
@keyframes si_fadeInUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes si_popIn { 0% { opacity: 0; transform: scale(0.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes si_shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
@keyframes si_scaleInBack { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
@keyframes si_pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes si_glow { 0%,100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); } 50% { box-shadow: 0 0 0 10px rgba(46,204,113,0.28); } }
@keyframes si_starPop { 0% { opacity: 0; transform: scale(0) rotate(-30deg); } 70% { transform: scale(1.25) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes si_confetti { 0% { opacity: 1; transform: translateY(-10px) rotate(0); } 100% { opacity: 0; transform: translateY(440px) rotate(540deg); } }
@keyframes si_settle { 0% { transform: translateY(-18px); opacity: 0.2; } 100% { transform: translateY(0); opacity: 1; } }
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
          animation: `si_confetti ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
};

const StarsRow: React.FC<{ count: number; stagger: number }> = ({ count, stagger }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '6px 0 4px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} size={34} fill={DS.c.amber} color={DS.c.amber}
        style={{ animation: `si_starPop .5s ${i * (stagger / 1000)}s both` }} />
    ))}
  </div>
);

// ──────────────────────────────────────────────────────────────────────────
// Tumbler: a glass of water that you tap to add a material + stir.
// stirT (0..1) drives the live animation. Once stirred, the result is shown:
//  - soluble  -> water takes on solutionTint, no particles, no sediment
//  - insoluble-> particles swirl then settle as a sediment layer at the bottom
// ──────────────────────────────────────────────────────────────────────────
const Tumbler: React.FC<{
  mat: Material; stirred: boolean; stirT: number;
  onAdd?: () => void; size?: number; showLabel?: boolean; showTag?: boolean; disabled?: boolean;
}> = ({ mat, stirred, stirT, onAdd, size = 96, showLabel = true, showTag = true, disabled }) => {
  const isSoluble = mat.solubility === 'soluble';
  const w = size, h = size * 1.15;
  // live mixing state: while stirT > 0 we are mid-stir; after, `stirred` holds the final look
  const mixing = stirT > 0 && stirT < 1;
  const settled = stirred && !mixing;

  // water colour: insoluble water stays cloudy with solutionTint; soluble shows its tint when done
  const waterColor = settled
    ? (isSoluble ? mat.solutionTint : DS.c.water)
    : DS.c.water;
  const tag = isSoluble ? 'SOLUBLE' : 'INSOLUBLE';
  const tagColor = isSoluble ? DS.c.accent : DS.c.primary;
  const tagBg = isSoluble ? DS.c.accentLight : DS.c.primaryLight;

  // sediment height for insoluble (settled at bottom)
  const sediment = settled && !isSoluble ? (1 - mat.dissolveRate) * 0.22 : 0;
  // suspended cloudiness while stirring an insoluble material
  const cloud = mixing && !isSoluble ? Math.sin(stirT * Math.PI) * 0.5 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
      <button
        onClick={disabled ? undefined : onAdd}
        title={stirred ? mat.name : 'tap to add & stir'}
        style={{
          width: w, height: h, border: 'none', padding: 0, background: 'transparent',
          cursor: disabled ? 'default' : 'pointer', position: 'relative',
        }}
      >
        {/* glass tumbler */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: `${size * 0.08}px ${size * 0.08}px ${size * 0.18}px ${size * 0.18}px`,
          border: `3px solid ${DS.c.gray400}`, borderTopColor: DS.c.gray200,
          background: 'linear-gradient(100deg, rgba(255,255,255,0.5), rgba(255,255,255,0.08))',
          overflow: 'hidden',
        }}>
          {/* water body */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: '78%',
            background: waterColor, transition: 'background .6s ease',
          }}>
            {/* cloud of suspended particles while stirring an insoluble material */}
            {cloud > 0 && (
              <div style={{
                position: 'absolute', inset: 0, opacity: cloud,
                background: `radial-gradient(circle at 35% 40%, ${mat.color}cc, transparent 55%), radial-gradient(circle at 70% 60%, ${mat.color}aa, transparent 50%)`,
              }} />
            )}
            {/* dissolving tint sweeping in for soluble while stirring */}
            {mixing && isSoluble && (
              <div style={{
                position: 'absolute', inset: 0, opacity: stirT,
                background: mat.solutionTint,
              }} />
            )}
            {/* settled sediment for insoluble — a layer at the bottom of the water body */}
            {sediment > 0 && (
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.min(40, sediment * 100 + 18)}%`,
                background: mat.color, animation: 'si_settle .6s ease both',
                borderRadius: '40% 40% 0 0 / 14px',
              }} />
            )}
          </div>
          {/* shine */}
          <div style={{ position: 'absolute', top: 6, left: 8, width: 6, height: '60%', borderRadius: 6, background: 'rgba(255,255,255,0.55)' }} />
        </div>

        {/* the material being added — sits above the glass before stir, fades on dissolve */}
        <span style={{
          position: 'absolute', top: -size * 0.18, left: '50%', transform: 'translateX(-50%)',
          fontSize: size * 0.42, lineHeight: 1,
          opacity: settled ? (isSoluble ? 0 : 0.0) : 1,
          transition: 'opacity .5s ease',
          filter: 'drop-shadow(0 2px 3px rgba(26,26,46,0.25))',
        }}>{mat.emoji}</span>
      </button>

      {showLabel && (
        <div style={{ fontFamily: DS.font, fontWeight: 600, fontSize: size < 86 ? 13 : 14, color: DS.c.gray900, textAlign: 'center', lineHeight: 1.25 }}>{mat.name}</div>
      )}
      {settled ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: 'si_popIn .4s both' }}>
          <div style={{ fontFamily: DS.font, fontSize: 12, color: DS.c.gray700, textAlign: 'center' }}>
            {isSoluble ? 'disappeared in water' : 'stayed visible'}
          </div>
          {showTag && (
            <div style={{
              fontFamily: DS.font, fontWeight: 800, fontSize: 11, letterSpacing: 1,
              color: tagColor, background: tagBg, padding: '3px 12px', borderRadius: DS.r.pill,
            }}>{tag}</div>
          )}
        </div>
      ) : (
        showLabel && <div style={{ fontFamily: DS.font, fontSize: 11, color: DS.c.gray400 }}>{mixing ? 'stirring…' : 'tap to add & stir'}</div>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const SolubleInsolubleExplorer: React.FC<ToolProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w: containerW, isXSmall, isMobile, isTablet, isCompact } = useResponsive(rootRef);

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
  const materials = useMemo<Material[]>(
    () => (ap.materials && ap.materials.length
      ? ap.materials
      : ['salt', 'sugar', 'sand', 'chalk_powder', 'copper_sulphate']
    ).map(resolveMaterial),
    [ap.materials],
  );
  // Record table order: alternate soluble/insoluble so they aren't grouped
  const recordOrder = useMemo<Material[]>(() => {
    const sol = materials.filter((o) => o.solubility === 'soluble');
    const ins = materials.filter((o) => o.solubility === 'insoluble');
    const out: Material[] = [];
    for (let i = 0; i < Math.max(sol.length, ins.length); i++) {
      if (sol[i]) out.push(sol[i]);
      if (ins[i]) out.push(ins[i]);
    }
    return out;
  }, [materials]);

  const quizPool = materials;

  // ---------- responsive scalars (single source of truth) ----------
  // Derived spacing / sizing tokens so every block scales together.
  const space = useMemo(() => ({
    pad: isXSmall ? 14 : isMobile ? 18 : 26,           // body padding
    headerPadV: isMobile ? 16 : 22,
    headerPadH: isXSmall ? 14 : isMobile ? 18 : 26,
    gridGap: isXSmall ? 10 : isMobile ? 14 : 22,
    cardMin: isXSmall ? 78 : isMobile ? 92 : 116,       // tumbler grid min track
    tumblerLearn: isXSmall ? 72 : isMobile ? 84 : 96,
    tumblerQuiz: isXSmall ? 68 : isMobile ? 80 : 92,
    quizVisualGap: isXSmall ? 12 : isMobile ? 16 : 24,
    quizVisualPad: isXSmall ? 14 : isMobile ? 16 : 22,
    optionGap: isXSmall ? 8 : 12,
  }), [isXSmall, isMobile]);

  // ---------- shared state ----------
  const [mode, setMode] = useState<ModeType>(config.initialMode);
  const bodyFont = isMobile ? tier.bodyFontMobile : tier.bodyFontDesktop;

  // ---------- LEARN state ----------
  const LEARN_SCREENS = 3; // mix, record, wrap
  const [learnScreen, setLearnScreen] = useState(0);
  const [stirredSet, setStirredSet] = useState<Set<string>>(new Set());
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [stirT, setStirT] = useState(0);
  const rafRef = useRef<number | null>(null);

  const [tableDecisions, setTableDecisions] = useState<Record<string, Solubility | null>>({});
  const [tableShake, setTableShake] = useState<string | null>(null);

  const [conceptPick, setConceptPick] = useState<string | null>(null);

  // ---------- PRACTICE state ----------
  const [sessionSeed, setSessionSeed] = useState(() => Date.now());
  const challenges = useMemo(
    () => generateChallenges(sessionSeed, tier.storyFrame, quizPool),
    [sessionSeed, tier.storyFrame, quizPool],
  );
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [reviewIdx, setReviewIdx] = useState(0);
  const [scoreShown, setScoreShown] = useState(0);

  // ---------- inject fonts + keyframes ----------
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'si-keyframes';
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('si-keyframes'); if (e) e.remove(); };
  }, []);

  // ---------- tell host not to auto-advance (interactive tool) ----------
  useEffect(() => { setStopAutoNext?.(true); }, [setStopAutoNext]);

  // ---------- report step details ----------
  useEffect(() => {
    const cur = mode === 'learn' ? learnScreen + 1 : qIndex + 1;
    const total = mode === 'learn' ? LEARN_SCREENS : challenges.length;
    setStepDetails?.({ currentStep: cur, totalSteps: total, isPaused: true, currentMode: mode });
  }, [mode, learnScreen, qIndex, challenges.length, LEARN_SCREENS, setStepDetails]);

  // ---------- cleanup raf ----------
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ---------- add + stir animation ----------
  const stirMaterial = useCallback((mat: Material) => {
    if (activeSlug) return;
    setActiveSlug(mat.slug);
    const start = performance.now();
    const dur = 1100;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setStirT(easeOutCubic(p));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setStirT(0);
        setActiveSlug(null);
        setStirredSet((prev) => new Set(prev).add(mat.slug));
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [activeSlug]);

  // ---------- table decision ----------
  const decide = (mat: Material, choice: Solubility) => {
    if (choice === mat.solubility) {
      setTableDecisions((prev) => ({ ...prev, [mat.slug]: choice }));
    } else {
      setTableShake(mat.slug);
      setTimeout(() => setTableShake(null), 450);
    }
  };
  const allTableDone = materials.every((o) => tableDecisions[o.slug]);

  // ---------- practice answering ----------
  const answerQuestion = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const newAns = [...answers];
    newAns[qIndex] = opt;
    setAnswers(newAns);
    setTimeout(() => {
      if (qIndex < challenges.length - 1) { setQIndex(qIndex + 1); setPicked(null); }
      else { setPhase('result'); }
    }, tier.pulseOnCorrect ? 900 : 700);
  };

  const score = useMemo(() => challenges.reduce((s, c, i) => s + (answers[i] === c.correctAnswer ? 1 : 0), 0), [answers, challenges]);
  const wrongList = useMemo(() => challenges.map((c, i) => ({ c, i })).filter(({ i }) => answers[i] !== challenges[i].correctAnswer), [answers, challenges]);

  // score count-up
  useEffect(() => {
    if (phase !== 'result') return;
    setScoreShown(0);
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setScoreShown(Math.round(easeOutCubic(p) * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, score]);

  const handlePlayAgain = () => {
    setSessionSeed(Date.now());
    setQIndex(0); setAnswers([]); setPicked(null); setPhase('play'); setReviewIdx(0);
  };

  const switchMode = (m: ModeType) => {
    setMode(m);
    if (m === 'practice') handlePlayAgain();
    else { setLearnScreen(0); }
  };

  // ==================== RENDER HELPERS ====================

  const pct = score / Math.max(challenges.length, 1);
  const encouragement = pct >= 0.9 ? tier.encouragement.high : pct >= 0.6 ? tier.encouragement.mid : tier.encouragement.low;

  const sectionTitle = (t: string) => (
    <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isMobile ? 18 : 20, color: DS.c.gray900, marginBottom: 4 }}>{t}</div>
  );
  const story = (t: string) => (
    <div style={{ fontFamily: DS.serif, fontStyle: 'italic', fontSize: bodyFont + 1, color: DS.c.primaryDark, marginBottom: 10, lineHeight: 1.4 }}>{t}</div>
  );
  const instruction = (t: string) => (
    <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray700, marginBottom: 16, lineHeight: 1.5 }}>{t}</div>
  );

  // ---------- LEARN: add & stir ----------
  const renderMix = () => (
    <div style={{ animation: 'si_fadeInUp .4s both' }}>
      {tier.storyFrame && story('Madam Vidya gives you five tumblers of water — try each material!')}
      {sectionTitle('Add & stir: does it dissolve?')}
      {instruction('Tap each tumbler to add the material and stir. Watch carefully — soluble materials disappear into the water, insoluble ones stay visible and settle at the bottom.')}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${space.cardMin}px, 1fr))`,
        gap: space.gridGap, justifyItems: 'center', background: DS.c.gray100, borderRadius: DS.r.xl, padding: space.pad,
      }}>
        {materials.map((o) => (
          <Tumbler key={o.slug} mat={o} stirred={stirredSet.has(o.slug)}
            stirT={activeSlug === o.slug ? stirT : (stirredSet.has(o.slug) ? 1 : 0)}
            onAdd={() => stirMaterial(o)} size={space.tumblerLearn} />
        ))}
      </div>
      <div style={{ marginTop: 14, fontFamily: DS.font, fontSize: 14, color: DS.c.gray700, textAlign: 'center' }}>
        Tested {stirredSet.size} of {materials.length}{stirredSet.size < materials.length ? ' — stir them all to continue!' : ' — great, all done! ✨'}
      </div>
    </div>
  );

  // ---------- LEARN: record Table 6.5 ----------
  const renderTable = () => {
    // On very tight widths the action buttons stack under the row instead of crowding.
    const stackActions = isXSmall;
    const cols = isCompact ? '1.4fr 1.6fr' : '1.2fr 1fr 1.6fr';
    return (
      <div style={{ animation: 'si_fadeInUp .4s both' }}>
        {sectionTitle('Record Table 6.5')}
        {instruction('For each material the name is filled in. Tap Soluble or Insoluble to record what you observed.')}
        <div style={{ borderRadius: DS.r.lg, overflow: 'hidden', border: `1px solid ${DS.c.gray200}` }}>
          {/* Header row hidden on xsmall (it stacks as a card-ish layout) */}
          {!stackActions && (
            <div style={{ display: 'grid', gridTemplateColumns: cols, background: DS.c.primaryLight, fontFamily: DS.font, fontWeight: 700, fontSize: 14, color: DS.c.primaryDark }}>
              <div style={{ padding: '12px 14px' }}>Material</div>
              {!isCompact && <div style={{ padding: '12px 14px' }}>What it is</div>}
              <div style={{ padding: '12px 14px' }}>Soluble / Insoluble</div>
            </div>
          )}
          {recordOrder.map((o, idx) => {
            const done = tableDecisions[o.slug];
            const actionBtns = (
              <div style={{ padding: stackActions ? '0 14px 12px' : '8px 14px', display: 'flex', gap: 8 }}>
                {(['soluble', 'insoluble'] as Solubility[]).map((s) => {
                  const selected = done === s;
                  const isSol = s === 'soluble';
                  return (
                    <button key={s} onClick={() => decide(o, s)} disabled={!!done}
                      style={{
                        flex: 1, minHeight: 42, borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700, fontSize: 12,
                        cursor: done ? 'default' : 'pointer', textTransform: 'capitalize',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        border: `2px solid ${selected ? DS.c.success : isSol ? DS.c.accent : DS.c.primary}`,
                        background: selected ? DS.c.success : '#fff',
                        color: selected ? '#fff' : isSol ? DS.c.accent : DS.c.primary,
                        animation: selected ? 'si_glow 1s' : undefined, opacity: done && !selected ? 0.4 : 1,
                      }}>
                      {selected && <Check size={14} strokeWidth={3.5} style={{ flexShrink: 0 }} />}
                      <span>{s}</span>
                    </button>
                  );
                })}
              </div>
            );
            return (
              <div key={o.slug} style={{
                display: stackActions ? 'block' : 'grid',
                gridTemplateColumns: stackActions ? undefined : cols, alignItems: 'center',
                background: idx % 2 ? DS.c.white : DS.c.gray100, fontFamily: DS.font, fontSize: 14, color: DS.c.gray900,
                animation: tableShake === o.slug ? 'si_shake .45s' : undefined,
                paddingTop: stackActions ? 10 : 0,
              }}>
                <div style={{ padding: stackActions ? '0 14px 6px' : '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{o.emoji}</span>
                  <span style={{ minWidth: 0 }}>
                    {o.name}
                    {isCompact && <span style={{ display: 'block', fontSize: 11, color: DS.c.gray700, fontWeight: 400 }}>{o.kind}</span>}
                  </span>
                </div>
                {!isCompact && <div style={{ padding: '10px 14px', color: DS.c.gray700 }}>{o.kind}</div>}
                {actionBtns}
              </div>
            );
          })}
        </div>
        {allTableDone && (
          <div style={{ marginTop: 14, padding: 14, background: DS.c.accentLight, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900, animation: 'si_popIn .4s both', lineHeight: 1.5 }}>
            🎉 Table complete! Materials that <b>completely disappear</b> in water are <b>soluble</b> (salt, sugar, copper sulphate). Those that <b>stay visible</b> however long you stir are <b>insoluble</b> (sand, chalk powder).
          </div>
        )}
      </div>
    );
  };

  // ---------- LEARN: wrap / concept check ----------
  const renderWrap = () => {
    const options = [
      'It dissolved — it spread evenly through the water and disappeared',
      'It has gone forever and cannot come back',
      'The water pushed it to the bottom of the glass',
    ];
    const correct = options[0];
    return (
      <div style={{ animation: 'si_fadeInUp .4s both' }}>
        {sectionTitle('You did it! 🌟')}
        {instruction('A quick check before the quiz: you stir sugar into water and it disappears. What happened to the sugar?')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {options.map((opt) => {
            const isSel = conceptPick === opt;
            const isRight = opt === correct;
            const showState = !!conceptPick && isSel;
            return (
              <button key={opt} onClick={() => !conceptPick && setConceptPick(opt)} disabled={!!conceptPick}
                style={{
                  textAlign: 'left', padding: '14px 18px', borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, fontWeight: 600,
                  border: `2px solid ${showState ? (isRight ? DS.c.success : DS.c.danger) : DS.c.gray200}`,
                  background: showState ? (isRight ? '#EAFBF1' : '#FDECEC') : '#fff',
                  color: DS.c.gray900, cursor: conceptPick ? 'default' : 'pointer', lineHeight: 1.4,
                  animation: showState && !isRight ? 'si_shake .45s' : undefined,
                }}>
                {opt}{showState && (isRight ? ' ✅' : ' — try the idea again')}
              </button>
            );
          })}
        </div>
        {conceptPick === correct && (
          <div style={{ padding: 14, background: DS.c.primaryGhost, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900, marginBottom: 16, lineHeight: 1.5 }}>
            The sugar did not vanish — it <b>dissolved</b>, spreading evenly through the water so you can't see it. A material that dissolves like this is <b>soluble</b>. Sand and chalk powder stay visible, so they are <b>insoluble</b>.
          </div>
        )}
        <PillButton label={isXSmall ? 'Start the Quiz!' : 'Start the Soluble-or-Insoluble Quiz!'} icon={<Play size={18} />} color={DS.c.accent} minH={tier.touchTargetMobile}
          fontSize={bodyFont + 1} grow={isMobile} onClick={() => switchMode('practice')} />
      </div>
    );
  };

  // ---------- learn navigation buttons ----------
  const canGoNext = () => {
    if (learnScreen === 0) return stirredSet.size === materials.length;
    if (learnScreen === 1) return allTableDone;
    return true;
  };

  const renderLearn = () => {
    const screens = [renderMix, renderTable, renderWrap];
    const isLast = learnScreen >= screens.length - 1;
    return (
      <div>
        {screens[learnScreen]()}
        {!isLast && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 22 }}>
            <PillButton label="Back" variant="ghost" color={DS.c.gray700} icon={<ChevronLeft size={18} />}
              disabled={learnScreen === 0} onClick={() => setLearnScreen(Math.max(0, learnScreen - 1))} minH={tier.touchTargetMobile} />
            <PillButton label="Next" color={DS.c.accent} icon={<ChevronRight size={18} />}
              disabled={!canGoNext()} onClick={() => setLearnScreen(learnScreen + 1)} minH={tier.touchTargetMobile} />
          </div>
        )}
        {!isLast && !canGoNext() && (
          <div style={{ textAlign: 'center', marginTop: 8, fontFamily: DS.font, fontSize: 12, color: DS.c.gray400 }}>
            {learnScreen === 0 ? 'Stir every material to unlock Next' : 'Record all materials to continue'}
          </div>
        )}
      </div>
    );
  };

  // ---------- PRACTICE: play ----------
  const renderPractice = () => {
    const q = challenges[qIndex];
    if (!q) return null;
    const qMats = q.slugs.map((s) => quizPool.find((o) => o.slug === s)).filter(Boolean) as Material[];
    // Options: 2-option questions go side-by-side except on the tightest phones, where they stack.
    const optionCols = q.options.length > 2
      ? `repeat(${q.options.length}, 1fr)`
      : isXSmall ? '1fr' : 'repeat(2, 1fr)';
    return (
      <div style={{ animation: 'si_fadeInUp .35s both' }} key={qIndex}>
        {/* progress */}
        <div style={{ height: 8, background: DS.c.gray200, borderRadius: DS.r.pill, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ width: `${((qIndex) / challenges.length) * 100}%`, height: '100%', background: DS.c.primary, transition: 'width .4s ease' }} />
        </div>
        <div style={{ fontFamily: DS.font, fontSize: 13, color: DS.c.gray700, marginBottom: 8 }}>Question {qIndex + 1} of {challenges.length}</div>
        {q.storyPrompt && story(q.storyPrompt)}
        <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isXSmall ? 18 : isMobile ? 20 : 24, color: DS.c.gray900, marginBottom: 18, lineHeight: 1.3 }}>{q.prompt}</div>

        {/* visual */}
        <div style={{ display: 'flex', gap: space.quizVisualGap, justifyContent: 'center', background: DS.c.gray100, borderRadius: DS.r.xl, padding: space.quizVisualPad, marginBottom: 20, flexWrap: 'wrap' }}>
          {qMats.map((o) => (
            <Tumbler key={o.slug} mat={o} stirred={false} stirT={activeSlug === o.slug ? stirT : 0}
              onAdd={() => stirMaterial(o)} size={space.tumblerQuiz} showTag={false} />
          ))}
        </div>

        {/* options */}
        <div style={{ display: 'grid', gridTemplateColumns: optionCols, gap: space.optionGap }}>
          {q.options.map((opt) => {
            const sel = picked === opt;
            return (
              <button key={opt} onClick={() => answerQuestion(opt)} disabled={!!picked}
                style={{
                  minHeight: tier.touchTargetMobile, padding: '0 18px', borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700,
                  fontSize: bodyFont + 1, cursor: picked ? 'default' : 'pointer',
                  border: `2px solid ${sel ? DS.c.primary : DS.c.gray200}`,
                  background: sel ? DS.c.primaryGhost : '#fff', color: sel ? DS.c.primaryDark : DS.c.gray900,
                  animation: sel && tier.pulseOnCorrect ? 'si_pulse .5s' : undefined,
                }}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ---------- PRACTICE: result overlay ----------
  const renderResult = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <ConfettiBurst count={tier.confettiCount} duration={tier.confettiDuration} />
      <div style={{
        position: 'relative', zIndex: 120, background: '#fff', borderRadius: DS.r.xl, boxShadow: DS.sh.xl, padding: isMobile ? 24 : 32,
        maxWidth: 420, width: '100%', textAlign: 'center', animation: 'si_scaleInBack .6s both',
        backgroundImage: `linear-gradient(160deg, ${DS.c.white}, ${DS.c.accentLight})`,
      }}>
        <Trophy size={44} color={DS.c.accent} style={{ marginBottom: 4 }} />
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

  // ---------- PRACTICE: review ----------
  const renderReview = () => {
    if (!wrongList.length) return null;
    const { c, i } = wrongList[reviewIdx];
    return (
      <div style={{ animation: 'si_fadeInUp .35s both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 18, color: DS.c.gray900 }}>Let's learn from this one</div>
          <PillButton label="Play again!" variant="ghost" color={DS.c.primary} icon={<RotateCcw size={15} />} onClick={handlePlayAgain} minH={44} />
        </div>
        {challenges.length - wrongList.length > 0 && (
          <div style={{ fontFamily: DS.font, fontSize: 13, color: DS.c.success, marginBottom: 12 }}>✓ You got {challenges.length - wrongList.length} right!</div>
        )}
        <div style={{ background: '#fff', border: `1px solid ${DS.c.gray200}`, borderRadius: DS.r.lg, boxShadow: DS.sh.sm, padding: isMobile ? 16 : 20 }}>
          {c.storyPrompt && <div style={{ fontFamily: DS.serif, fontStyle: 'italic', color: DS.c.gray700, marginBottom: 6, lineHeight: 1.4 }}>{c.storyPrompt}</div>}
          <div style={{ fontFamily: DS.font, fontWeight: 600, fontSize: bodyFont + 1, color: DS.c.gray900, marginBottom: 12, lineHeight: 1.3 }}>{c.prompt}</div>
          <div style={{ fontFamily: DS.font, fontSize: bodyFont, marginBottom: 4 }}>You answered: <b style={{ color: DS.c.danger }}>{answers[i]}</b></div>
          <div style={{ fontFamily: DS.font, fontSize: bodyFont, marginBottom: 12 }}>Correct answer: <b style={{ color: DS.c.success }}>{c.correctAnswer}</b></div>
          <div style={{ height: 1, background: DS.c.gray200, margin: '8px 0 12px' }} />
          <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900, lineHeight: 1.6 }}>{c.conceptExplanation}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
          <PillButton label="Previous" variant="ghost" color={DS.c.gray700} icon={<ChevronLeft size={18} />}
            disabled={reviewIdx === 0} onClick={() => setReviewIdx(reviewIdx - 1)} minH={tier.touchTargetMobile} />
          {reviewIdx < wrongList.length - 1
            ? <PillButton label="Next" color={DS.c.primary} icon={<ChevronRight size={18} />} onClick={() => setReviewIdx(reviewIdx + 1)} minH={tier.touchTargetMobile} />
            : <PillButton label="Play again!" color={DS.c.accent} icon={<RotateCcw size={16} />} onClick={handlePlayAgain} minH={tier.touchTargetMobile} />}
        </div>
      </div>
    );
  };

  // ==================== TOP-LEVEL LAYOUT ====================

  const headerProgress = mode === 'learn'
    ? `Step ${learnScreen + 1} / ${LEARN_SCREENS}`
    : phase === 'play' ? `${qIndex + 1} / ${challenges.length}` : phase === 'review' ? 'Review' : 'Results';

  const progressFill = mode === 'learn'
    ? (learnScreen + 1) / LEARN_SCREENS
    : phase === 'play' ? qIndex / challenges.length : 1;

  // Title shrinks / shortens as the container narrows so it never wraps awkwardly.
  const title = isXSmall ? 'Soluble or Insoluble?' : 'Soluble or Insoluble? Dissolving Lab';
  const subtitle = isXSmall
    ? 'Mix, record Table 6.5, then get them back'
    : 'Mix materials in water, record Table 6.5, then get them back';

  return (
    <div ref={rootRef} style={{ width: '100%', maxWidth: config.width, margin: '0 auto', fontFamily: DS.font, color: DS.c.gray900, background: DS.c.white, borderRadius: DS.r.xl, overflow: 'hidden', boxShadow: DS.sh.lg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${DS.c.primaryDark}, ${DS.c.primary} 55%, ${DS.c.accentDark})`, padding: `${space.headerPadV}px ${space.headerPadH}px`, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <FlaskConical size={isMobile ? 26 : 30} style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: isXSmall ? 17 : isMobile ? 19 : 24, letterSpacing: 0.2, lineHeight: 1.2 }}>{title}</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>{subtitle}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.18)', padding: '6px 12px', borderRadius: DS.r.pill, flexShrink: 0 }}>{headerProgress}</div>
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
                  {m === 'learn' ? <Beaker size={15} /> : <Trophy size={15} />}{m === 'learn' ? 'Explore' : 'Quiz'}
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
      <div style={{ padding: space.pad, minHeight: 380 }}>
        {mode === 'learn' && renderLearn()}
        {mode === 'practice' && phase === 'play' && renderPractice()}
        {mode === 'practice' && phase === 'review' && renderReview()}
      </div>

      {mode === 'practice' && phase === 'result' && renderResult()}
    </div>
  );
};

export default SolubleInsolubleExplorer;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════