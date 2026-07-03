// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: hard_or_soft_explorer.tsx
// Activity 6.5 — "Hard or soft objects and the materials they are made up of"
// Grade tier: 6 (heavy gamification, story framing, playful tone)
// Interactions: tap/click only (no drag-drop). Singularity palette. Poppins.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play, ChevronLeft, ChevronRight, RotateCcw, Star, Check,
  Hand, Trophy,
} from 'lucide-react';

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice';
type Phase = 'play' | 'result' | 'review';
type Hardness = 'hard' | 'soft';
type GradeLevel = 6 | 7 | 8;

interface HardnessObject {
  slug: string;
  name: string;
  material: string;
  hardness: Hardness;
  squishiness: number; // 0 (rock hard) .. 1 (very soft)
  color: string;
  emoji: string;
}

interface ComparisonPair { a: string; b: string; harder: string; }

interface Challenge {
  id: string;
  kind: 'classify' | 'compare';
  prompt: string;
  storyPrompt?: string;
  slugs: string[];
  options: string[];
  correctAnswer: string;
  conceptExplanation: string;
}

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

interface HardOrSoftAdditionalProps {
  objects?: (string | HardnessObject)[];
  comparisonPairs?: ComparisonPair[];
  hardnessLadder?: string[];
  showRanking?: boolean;
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
    additionalProps?: HardOrSoftAdditionalProps;
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
    pink: '#DB2777', deepBlue: '#1E40AF', forest: '#166534',
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
      high: "Awesome work, you're a science star!",
      mid: "Nice going! Let's check the tricky ones together.",
      low: "Don't worry — every try makes you smarter. Let's see what we can learn!",
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
    playAgainLabel: 'Try fresh objects', reviewLabel: 'Review answers',
    bodyFontMobile: 15, bodyFontDesktop: 16, heroFontMobile: 30, heroFontDesktop: 40,
    touchTargetMobile: 48, entryEasing: 'easeOutCubic', pulseOnCorrect: false, storyFrame: false,
    explanationStyle: 'formal',
  },
} as const;

// ==================== OBJECT LIBRARY ====================

const OBJECT_LIBRARY: Record<string, HardnessObject> = {
  mattress:      { slug: 'mattress',      name: 'Bed mattress', material: 'Foam',       hardness: 'soft', squishiness: 0.95, color: DS.c.accent,   emoji: '🛏️' },
  sweater:       { slug: 'sweater',       name: 'Sweater',      material: 'Wool',       hardness: 'soft', squishiness: 0.82, color: DS.c.pink,     emoji: '🧥' },
  soft_toy:      { slug: 'soft_toy',      name: 'Soft toy',     material: 'Cotton',     hardness: 'soft', squishiness: 0.90, color: '#D98E5A',   emoji: '🧸' },
  steel_tumbler: { slug: 'steel_tumbler', name: 'Tumbler',      material: 'Steel',      hardness: 'hard', squishiness: 0.05, color: DS.c.deepBlue, emoji: '🥛' },
  wooden_table:  { slug: 'wooden_table',  name: 'Table',        material: 'Wood',       hardness: 'hard', squishiness: 0.10, color: DS.c.forest,   emoji: '🪑' },
  brick:         { slug: 'brick',         name: 'Brick',        material: 'Baked clay', hardness: 'hard', squishiness: 0.00, color: DS.c.danger,   emoji: '🧱' },
  sponge:        { slug: 'sponge',        name: 'Sponge',       material: 'Foam',       hardness: 'soft', squishiness: 0.92, color: DS.c.amber,    emoji: '🧽' },
  rubber_eraser: { slug: 'rubber_eraser', name: 'Eraser',       material: 'Rubber',     hardness: 'soft', squishiness: 0.40, color: DS.c.pink,     emoji: '🧼' },
  iron_nail:     { slug: 'iron_nail',     name: 'Iron nail',    material: 'Iron',       hardness: 'hard', squishiness: 0.02, color: DS.c.gray700,  emoji: '🔩' },
};

const FALLBACK_OBJ = (slug: string): HardnessObject => ({
  slug, name: slug.replace(/_/g, ' '), material: 'Material', hardness: 'hard', squishiness: 0.2, color: DS.c.primary, emoji: '🔷',
});

const resolveObject = (entry: string | HardnessObject): HardnessObject =>
  typeof entry === 'string'
    ? (OBJECT_LIBRARY[entry] || FALLBACK_OBJ(entry))
    : { ...FALLBACK_OBJ(entry.slug || 'item'), ...entry };

const harderOf = (a: HardnessObject, b: HardnessObject): HardnessObject => {
  if (a.hardness !== b.hardness) return a.hardness === 'hard' ? a : b;
  return a.squishiness <= b.squishiness ? a : b;
};

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

interface ResolvedPair { a: HardnessObject; b: HardnessObject; harderSlug: string; }

function generateChallenges(
  seed: number,
  story: boolean,
  pool: HardnessObject[],
  pairs: ResolvedPair[],
): Challenge[] {
  const rng = mulberry32(seed);
  const out: Challenge[] = [];

  // ---- 3 classify questions (force a hard/soft mix) ----
  const shuffledPool = shuffle(pool, rng);
  const softs = shuffledPool.filter((o) => o.hardness === 'soft');
  const hards = shuffledPool.filter((o) => o.hardness === 'hard');
  const picks: HardnessObject[] = [];
  if (softs[0]) picks.push(softs[0]);
  if (hards[0]) picks.push(hards[0]);
  for (const o of shuffledPool) {
    if (picks.length >= 3) break;
    if (!picks.includes(o)) picks.push(o);
  }
  picks.slice(0, 3).forEach((o, i) => {
    out.push({
      id: `cl${i}`,
      kind: 'classify',
      storyPrompt: story ? `Madam Vidya hands you the ${o.name.toLowerCase()} from the tray.` : undefined,
      prompt: `Is the ${o.name.toLowerCase()} hard or soft?`,
      slugs: [o.slug],
      options: ['Hard', 'Soft'],
      correctAnswer: o.hardness === 'hard' ? 'Hard' : 'Soft',
      conceptExplanation:
        o.hardness === 'soft'
          ? `When you press the ${o.name.toLowerCase()}, it squishes and changes shape easily. Things that change shape easily are soft — so the ${o.name.toLowerCase()} is soft.`
          : `When you press the ${o.name.toLowerCase()}, it barely moves and keeps its shape. Things that keep their shape are hard — so the ${o.name.toLowerCase()} is hard.`,
    });
  });

  // ---- 3 compare questions ----
  let cmp: ResolvedPair[] = [...pairs];
  const poolShuffled2 = shuffle(pool, rng);
  let idx = 0;
  while (cmp.length < 3 && idx < poolShuffled2.length) {
    const a = poolShuffled2[idx];
    const b = poolShuffled2.find((o) => o !== a && Math.abs(o.squishiness - a.squishiness) > 0.3);
    if (a && b && !cmp.some((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))) {
      cmp.push({ a, b, harderSlug: harderOf(a, b).slug });
    }
    idx++;
  }
  shuffle(cmp, rng).slice(0, 3).forEach((p, i) => {
    const harder = p.harderSlug === p.a.slug ? p.a : p.b;
    const softer = p.harderSlug === p.a.slug ? p.b : p.a;
    const pairShown = shuffle([p.a, p.b], rng);
    out.push({
      id: `cp${i}`,
      kind: 'compare',
      storyPrompt: story ? `Two objects sit side by side on your desk.` : undefined,
      prompt: `Which one is harder?`,
      slugs: [pairShown[0].slug, pairShown[1].slug],
      options: [pairShown[0].name, pairShown[1].name],
      correctAnswer: harder.name,
      conceptExplanation: `The ${softer.name.toLowerCase()} squishes more when you press it, but the ${harder.name.toLowerCase()} keeps its shape. The one that keeps its shape is harder — so the ${harder.name.toLowerCase()} is harder than the ${softer.name.toLowerCase()}. (Hardness is relative — an object can be harder than one thing and softer than another.)`,
    });
  });

  return shuffle(out, rng);
}

// ==================== EASING ====================

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ==================== RESPONSIVE HOOK ====================

const useResponsive = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    h();
    return () => window.removeEventListener('resize', h);
  }, []);
  return { w, isMobile: w < 576 };
};

// ==================== KEYFRAMES ====================

const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
@keyframes hos_fadeInUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes hos_popIn { 0% { opacity: 0; transform: scale(0.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes hos_shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
@keyframes hos_scaleInBack { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
@keyframes hos_slideDown { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes hos_pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes hos_glow { 0%,100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); } 50% { box-shadow: 0 0 0 10px rgba(46,204,113,0.28); } }
@keyframes hos_starPop { 0% { opacity: 0; transform: scale(0) rotate(-30deg); } 70% { transform: scale(1.25) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes hos_confetti { 0% { opacity: 1; transform: translateY(-10px) rotate(0); } 100% { opacity: 0; transform: translateY(440px) rotate(540deg); } }
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
          animation: `hos_confetti ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
};

const StarsRow: React.FC<{ count: number; stagger: number }> = ({ count, stagger }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '6px 0 4px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <Star key={i} size={34} fill={DS.c.amber} color={DS.c.amber}
        style={{ animation: `hos_starPop .5s ${i * (stagger / 1000)}s both` }} />
    ))}
  </div>
);

// Deformable specimen block (press to squish)
const Specimen: React.FC<{
  obj: HardnessObject; revealed: boolean; squishT: number; pressedMeter: number;
  onPress?: () => void; size?: number; showLabel?: boolean; showTag?: boolean; disabled?: boolean;
}> = ({ obj, revealed, squishT, pressedMeter, onPress, size = 96, showLabel = true, showTag = true, disabled }) => {
  const compressed = 1 - obj.squishiness * 0.5 * squishT;
  const tag = obj.hardness === 'hard' ? 'HARD' : 'SOFT';
  const tagColor = obj.hardness === 'hard' ? DS.c.primary : DS.c.accent;
  const tagBg = obj.hardness === 'hard' ? DS.c.primaryLight : DS.c.accentLight;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: size + 8 }}>
        {/* squish meter */}
        <div title="how much it squishes" style={{
          width: 12, height: size, borderRadius: DS.r.pill, background: DS.c.gray200,
          overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          <div style={{
            width: '100%', height: `${pressedMeter * 100}%`, borderRadius: DS.r.pill,
            background: `linear-gradient(${DS.c.accent}, ${DS.c.accentDark})`, transition: 'height .5s cubic-bezier(.34,1.56,.64,1)',
          }} />
        </div>
        {/* the object — emoji squishes on press, no background tile */}
        <button
          onClick={disabled ? undefined : onPress}
          style={{
            width: size, height: size, border: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer',
            background: 'transparent', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <span style={{
            fontSize: size * 0.82, lineHeight: 1, display: 'inline-block',
            transform: `scaleY(${compressed})`, transformOrigin: 'bottom', transition: 'transform .08s linear',
            filter: 'drop-shadow(0 3px 4px rgba(26,26,46,0.18))',
          }}>{obj.emoji}</span>
        </button>
      </div>
      {showLabel && (
        <div style={{ fontFamily: DS.font, fontWeight: 600, fontSize: 14, color: DS.c.gray900, textAlign: 'center' }}>{obj.name}</div>
      )}
      {revealed ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: 'hos_popIn .4s both' }}>
          <div style={{ fontFamily: DS.font, fontSize: 12, color: DS.c.gray700 }}>made of <b>{obj.material}</b></div>
          {showTag && (
            <div style={{
              fontFamily: DS.font, fontWeight: 800, fontSize: 12, letterSpacing: 1,
              color: tagColor, background: tagBg, padding: '3px 12px', borderRadius: DS.r.pill,
            }}>{tag}</div>
          )}
        </div>
      ) : (
        showLabel && <div style={{ fontFamily: DS.font, fontSize: 11, color: DS.c.gray400 }}>tap to press</div>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const HardOrSoftExplorer: React.FC<ToolProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const { isMobile } = useResponsive();

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
  const exploreObjects = useMemo<HardnessObject[]>(
    () => (ap.objects && ap.objects.length
      ? ap.objects
      : ['mattress', 'sweater', 'soft_toy', 'steel_tumbler', 'wooden_table', 'brick']
    ).map(resolveObject),
    [ap.objects],
  );
  // Record table order: seeded shuffle so the hard/soft answers don't follow a predictable pattern
  const recordOrderObjects = useMemo<HardnessObject[]>(() => {
    const seed = exploreObjects.reduce((acc, o) => acc + o.slug.length * 31 + o.squishiness * 100, 7);
    const rng = mulberry32(Math.floor(seed) || 1);
    // shuffle until no more than 2 of the same hardness sit next to each other (avoids accidental runs)
    let best = shuffle(exploreObjects, rng);
    for (let attempt = 0; attempt < 12; attempt++) {
      let maxRun = 1, run = 1;
      for (let i = 1; i < best.length; i++) {
        if (best[i].hardness === best[i - 1].hardness) { run++; maxRun = Math.max(maxRun, run); }
        else run = 1;
      }
      if (maxRun <= 2) break;
      best = shuffle(exploreObjects, rng);
    }
    return best;
  }, [exploreObjects]);
  const ladderObjects = useMemo<HardnessObject[]>(
    () => (ap.hardnessLadder && ap.hardnessLadder.length ? ap.hardnessLadder : ['sponge', 'rubber_eraser', 'iron_nail']).map(resolveObject),
    [ap.hardnessLadder],
  );

  const resolvedPairs = useMemo<ResolvedPair[]>(() => {
    if (!ap.comparisonPairs || !ap.comparisonPairs.length) return [];
    return ap.comparisonPairs.map((p) => ({ a: resolveObject(p.a), b: resolveObject(p.b), harderSlug: p.harder })).filter((p) => p.a && p.b);
  }, [ap.comparisonPairs]);

  const quizPool = useMemo<HardnessObject[]>(() => {
    const map = new Map<string, HardnessObject>();
    [...exploreObjects, ...ladderObjects].forEach((o) => map.set(o.slug, o));
    return Array.from(map.values());
  }, [exploreObjects, ladderObjects]);

  // ---------- shared state ----------
  const [mode, setMode] = useState<ModeType>(config.initialMode);
  const fontBaseDesktop = tier.bodyFontDesktop, fontBaseMobile = tier.bodyFontMobile;
  const bodyFont = isMobile ? fontBaseMobile : fontBaseDesktop;
  const heroFont = isMobile ? tier.heroFontMobile : tier.heroFontDesktop;

  // ---------- LEARN state ----------
  const LEARN_SCREENS = 3; // explore, record, wrap
  const [learnScreen, setLearnScreen] = useState(0);
  const [pressedSet, setPressedSet] = useState<Set<string>>(new Set());
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [squishT, setSquishT] = useState(0);
  const rafRef = useRef<number | null>(null);

  const [tableDecisions, setTableDecisions] = useState<Record<string, Hardness | null>>({});
  const [tableShake, setTableShake] = useState<string | null>(null);

  const [conceptPick, setConceptPick] = useState<string | null>(null);

  // ---------- PRACTICE state ----------
  const [sessionSeed, setSessionSeed] = useState(() => Date.now());
  const challenges = useMemo(() => generateChallenges(sessionSeed, tier.storyFrame, quizPool, resolvedPairs), [sessionSeed, tier.storyFrame, quizPool, resolvedPairs]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [reviewIdx, setReviewIdx] = useState(0);
  const [scoreShown, setScoreShown] = useState(0);

  // ---------- inject fonts + keyframes ----------
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'hos-keyframes';
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('hos-keyframes'); if (e) e.remove(); };
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

  // ---------- press animation ----------
  const pressObject = useCallback((obj: HardnessObject) => {
    if (activeSlug) return;
    setActiveSlug(obj.slug);
    setPressedSet((prev) => new Set(prev).add(obj.slug));
    const start = performance.now();
    const dur = 850;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      let e: number;
      if (p < 0.4) e = easeOutCubic(p / 0.4);
      else if (p < 0.62) e = 1;
      else e = Math.max(0, 1 - easeOutBack((p - 0.62) / 0.38));
      setSquishT(e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { setSquishT(0); setActiveSlug(null); }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [activeSlug]);

  // ---------- table decision ----------
  const decide = (obj: HardnessObject, choice: Hardness) => {
    if (choice === obj.hardness) {
      setTableDecisions((prev) => ({ ...prev, [obj.slug]: choice }));
    } else {
      setTableShake(obj.slug);
      setTimeout(() => setTableShake(null), 450);
    }
  };
  const allTableDone = exploreObjects.every((o) => tableDecisions[o.slug]);

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
  const wrongList = useMemo(() => challenges.map((c, i) => ({ c, i })).filter(({ c, i }) => answers[i] !== c.correctAnswer), [answers, challenges]);

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
    <div style={{ fontFamily: DS.serif, fontStyle: 'italic', fontSize: bodyFont + 1, color: DS.c.primaryDark, marginBottom: 10 }}>{t}</div>
  );
  const instruction = (t: string) => (
    <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray700, marginBottom: 16, lineHeight: 1.5 }}>{t}</div>
  );

  // ---------- LEARN: explore ----------
  const renderExplore = () => (
    <div style={{ animation: 'hos_fadeInUp .4s both' }}>
      {tier.storyFrame && story('Madam Vidya gives you a tray of objects to test!')}
      {sectionTitle('Press to feel: hard or soft?')}
      {instruction('Tap each object to press it. Watch how much it squishes — the orange bar fills up for softer things. Then its material and Hard/Soft tag appear.')}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 96 : 116}px, 1fr))`,
        gap: isMobile ? 14 : 22, justifyItems: 'center', background: DS.c.gray100, borderRadius: DS.r.xl, padding: isMobile ? 16 : 26,
      }}>
        {exploreObjects.map((o) => (
          <Specimen key={o.slug} obj={o} revealed={pressedSet.has(o.slug)}
            squishT={activeSlug === o.slug ? squishT : 0}
            pressedMeter={pressedSet.has(o.slug) ? o.squishiness : 0}
            onPress={() => pressObject(o)} size={isMobile ? 84 : 96} />
        ))}
      </div>
      <div style={{ marginTop: 14, fontFamily: DS.font, fontSize: 14, color: DS.c.gray700, textAlign: 'center' }}>
        Tested {pressedSet.size} of {exploreObjects.length}{pressedSet.size < exploreObjects.length ? ' — press them all to continue!' : ' — great, all done! ✨'}
      </div>
    </div>
  );

  // ---------- LEARN: record table ----------
  const renderTable = () => (
    <div style={{ animation: 'hos_fadeInUp .4s both' }}>
      {sectionTitle('Record what you found')}
      {instruction('For each object, the material is filled in. Tap Hard or Soft to record your decision.')}
      <div style={{ borderRadius: DS.r.lg, overflow: 'hidden', border: `1px solid ${DS.c.gray200}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', background: DS.c.primaryLight, fontFamily: DS.font, fontWeight: 700, fontSize: 14, color: DS.c.primaryDark }}>
          <div style={{ padding: '12px 14px' }}>Object</div>
          <div style={{ padding: '12px 14px' }}>Material</div>
          <div style={{ padding: '12px 14px' }}>Hard / Soft</div>
        </div>
        {recordOrderObjects.map((o, idx) => {
          const done = tableDecisions[o.slug];
          return (
            <div key={o.slug} style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', alignItems: 'center',
              background: idx % 2 ? DS.c.white : DS.c.gray100, fontFamily: DS.font, fontSize: 14, color: DS.c.gray900,
              animation: tableShake === o.slug ? 'hos_shake .45s' : undefined,
            }}>
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 20 }}>{o.emoji}</span>{o.name}</div>
              <div style={{ padding: '10px 14px', color: DS.c.gray700 }}>{o.material}</div>
              <div style={{ padding: '8px 14px', display: 'flex', gap: 8 }}>
                {(['hard', 'soft'] as Hardness[]).map((h) => {
                  const selected = done === h;
                  const isHard = h === 'hard';
                  return (
                    <button key={h} onClick={() => decide(o, h)} disabled={!!done}
                      style={{
                        flex: 1, minHeight: 40, borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700, fontSize: 13,
                        cursor: done ? 'default' : 'pointer', textTransform: 'capitalize',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        border: `2px solid ${selected ? DS.c.success : isHard ? DS.c.primary : DS.c.accent}`,
                        background: selected ? DS.c.success : '#fff',
                        color: selected ? '#fff' : isHard ? DS.c.primary : DS.c.accent,
                        animation: selected ? 'hos_glow 1s' : undefined, opacity: done && !selected ? 0.4 : 1,
                      }}>
                      {selected && <Check size={15} strokeWidth={3.5} style={{ flexShrink: 0 }} />}
                      <span>{h}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {allTableDone && (
        <div style={{ marginTop: 14, padding: 14, background: DS.c.accentLight, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900, animation: 'hos_popIn .4s both' }}>
          🎉 Table complete! Notice — soft things (cotton, wool) squish, hard things (clay, steel, wood) don't. The <b>material</b> decides whether an object is hard or soft.
        </div>
      )}
    </div>
  );

  // ---------- LEARN: wrap / concept check ----------
  const renderWrap = () => {
    const softObj = exploreObjects.find((o) => o.hardness === 'soft') || exploreObjects[0];
    const hardObj = exploreObjects.find((o) => o.hardness === 'hard') || exploreObjects[1] || exploreObjects[0];
    const options = [
      `The ${hardObj?.name.toLowerCase()} keeps its shape, the ${softObj?.name.toLowerCase()} changes shape`,
      `The ${softObj?.name.toLowerCase()} is heavier`,
      'They are exactly the same',
    ];
    const correct = options[0];
    return (
      <div style={{ animation: 'hos_fadeInUp .4s both' }}>
        {sectionTitle('You did it! 🌟')}
        {instruction(`A quick check before the quiz: When you press the ${hardObj?.name.toLowerCase()} and the ${softObj?.name.toLowerCase()}, what is the main difference?`)}
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
                  color: DS.c.gray900, cursor: conceptPick ? 'default' : 'pointer',
                  animation: showState && !isRight ? 'hos_shake .45s' : undefined,
                }}>
                {opt}{showState && (isRight ? ' ✅' : ' — try the idea again')}
              </button>
            );
          })}
        </div>
        {conceptPick === correct && (
          <div style={{ padding: 14, background: DS.c.primaryGhost, borderRadius: DS.r.md, fontFamily: DS.font, fontSize: bodyFont, color: DS.c.gray900, marginBottom: 16 }}>
            Hard things keep their shape when pressed; soft things squish and change shape. That difference comes from the <b>material</b> the object is made of.
          </div>
        )}
        <PillButton label="Start the Hard-or-Soft Quiz!" icon={<Play size={18} />} color={DS.c.accent} minH={tier.touchTargetMobile}
          fontSize={bodyFont + 1} onClick={() => switchMode('practice')} />
      </div>
    );
  };

  // ---------- learn navigation buttons ----------
  const canGoNext = () => {
    if (learnScreen === 0) return pressedSet.size === exploreObjects.length;
    if (learnScreen === 1) return allTableDone;
    return true;
  };

  const renderLearn = () => {
    const screens = [renderExplore, renderTable, renderWrap];
    const isLast = learnScreen >= screens.length - 1;
    return (
      <div>
        {screens[learnScreen]()}
        {!isLast && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
            <PillButton label="Back" variant="ghost" color={DS.c.gray700} icon={<ChevronLeft size={18} />}
              disabled={learnScreen === 0} onClick={() => setLearnScreen(Math.max(0, learnScreen - 1))} minH={tier.touchTargetMobile} />
            <PillButton label="Next" color={DS.c.accent} icon={<ChevronRight size={18} />}
              disabled={!canGoNext()} onClick={() => setLearnScreen(learnScreen + 1)} minH={tier.touchTargetMobile} />
          </div>
        )}
        {!isLast && !canGoNext() && (
          <div style={{ textAlign: 'center', marginTop: 8, fontFamily: DS.font, fontSize: 12, color: DS.c.gray400 }}>
            {learnScreen === 0 ? 'Press every object to unlock Next' : 'Record all objects to continue'}
          </div>
        )}
      </div>
    );
  };

  // ---------- PRACTICE: play ----------
  const renderPractice = () => {
    const q = challenges[qIndex];
    if (!q) return null;
    const qObjs = q.slugs.map((s) => quizPool.find((o) => o.slug === s)).filter(Boolean) as HardnessObject[];
    return (
      <div style={{ animation: 'hos_fadeInUp .35s both' }} key={qIndex}>
        {/* progress */}
        <div style={{ height: 8, background: DS.c.gray200, borderRadius: DS.r.pill, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ width: `${((qIndex) / challenges.length) * 100}%`, height: '100%', background: DS.c.primary, transition: 'width .4s ease' }} />
        </div>
        <div style={{ fontFamily: DS.font, fontSize: 13, color: DS.c.gray700, marginBottom: 8 }}>Question {qIndex + 1} of {challenges.length}</div>
        {q.storyPrompt && story(q.storyPrompt)}
        <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isMobile ? 20 : 24, color: DS.c.gray900, marginBottom: 18 }}>{q.prompt}</div>

        {/* visual */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', background: DS.c.gray100, borderRadius: DS.r.xl, padding: 22, marginBottom: 20, flexWrap: 'wrap' }}>
          {qObjs.map((o) => (
            <Specimen key={o.slug} obj={o} revealed={false} squishT={activeSlug === o.slug ? squishT : 0}
              pressedMeter={0} onPress={() => pressObject(o)} size={isMobile ? 80 : 92} showTag={false} />
          ))}
        </div>

        {/* options */}
        <div style={{ display: 'grid', gridTemplateColumns: q.options.length > 2 || !isMobile ? `repeat(${q.options.length}, 1fr)` : '1fr', gap: 12 }}>
          {q.options.map((opt) => {
            const sel = picked === opt;
            return (
              <button key={opt} onClick={() => answerQuestion(opt)} disabled={!!picked}
                style={{
                  minHeight: tier.touchTargetMobile, padding: '0 18px', borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700,
                  fontSize: bodyFont + 1, cursor: picked ? 'default' : 'pointer',
                  border: `2px solid ${sel ? DS.c.primary : DS.c.gray200}`,
                  background: sel ? DS.c.primaryGhost : '#fff', color: sel ? DS.c.primaryDark : DS.c.gray900,
                  animation: sel && tier.pulseOnCorrect ? 'hos_pulse .5s' : undefined,
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
        maxWidth: 420, width: '100%', textAlign: 'center', animation: 'hos_scaleInBack .6s both',
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
    const { c, i } = wrongList[reviewIdx];
    return (
      <div style={{ animation: 'hos_fadeInUp .35s both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 18, color: DS.c.gray900 }}>Let's learn from this one</div>
          <PillButton label="Play again!" variant="ghost" color={DS.c.primary} icon={<RotateCcw size={15} />} onClick={handlePlayAgain} minH={44} />
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

  return (
    <div style={{ width: '100%', maxWidth: config.width, margin: '0 auto', fontFamily: DS.font, color: DS.c.gray900, background: DS.c.white, borderRadius: DS.r.xl, overflow: 'hidden', boxShadow: DS.sh.lg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${DS.c.primaryDark}, ${DS.c.primary} 55%, ${DS.c.accentDark})`, padding: isMobile ? '18px 18px' : '22px 26px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: isMobile ? 20 : 24, letterSpacing: 0.2 }}>Hard or Soft? Material Explorer</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>Press objects, feel the difference, find their materials</div>
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
                  {m === 'learn' ? <Hand size={15} /> : <Trophy size={15} />}{m === 'learn' ? 'Explore' : 'Quiz'}
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

export default HardOrSoftExplorer;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════