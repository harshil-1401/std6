// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: melting_ice_cube_tool.tsx
// ═══════════════════════════════════════════════════════════════════════════
//
// Melting Ice Cube Tool — NCERT Class 6 Science, Chapter 8 "A Journey through
// States of Water". A PREDICT → OBSERVE → EXPLAIN → RECAP thinking tool.
// Styled with the Singularity design system (Poppins, indigo #4A4DC9, pill buttons).
//
// Follows Frontend Interactive Tool Generation Prompt v2.1:
//   - Single-file, TypeScript, CSS-in-JS only (no Tailwind/external CSS)
//   - props + additionalProps configuration interface
//   - modes + steps + filterSteps + initialMode etc.
//   - heavy animations via keyframes + requestAnimationFrame
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight,
  Check, X, Snowflake, Droplet, Lightbulb, Target,
} from 'lucide-react';

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

interface StepDataInterface {
  id: number;
  title: string;
  description: string;
  type: 'predict' | 'observe' | 'explain' | 'recap' | 'practice';
  mode: ModeType;
  data?: any;
}

interface BaseDataInterface {
  themeColor?: string;
  autoPlayDuration?: number;
}

// ADDITIONAL PROPS — TOOL SPECIFIC
interface MeltingIceAdditionalProps {
  // Simulation
  totalMinutes?: number;          // total simulated minutes (default 30)
  meltDurationMs?: number;        // real-time ms for a full auto-melt (default 10000)
  startMinute?: number;           // initial elapsed minute (default 0)

  // Predict scene
  showPrediction?: boolean;       // require a prediction first (default true)
  predictionOptions?: {
    id: string;
    label: string;
    correct?: boolean;
  }[];

  // Captions / bilingual teacher prompts
  teacherPrompts?: {
    predict?: string;
    observe?: string;
    explain?: string;
    recap?: string;
  };

  // Concept reveal lines (Explain scene)
  conceptLines?: string[];

  // Practice questions
  quiz?: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
}

interface MeltingIceCubeToolProps {
  props?: {
    width?: number;
    height?: number;
    data?: BaseDataInterface;
    steps?: StepDataInterface[];
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
    additionalProps?: MeltingIceAdditionalProps;
  };
  setStepDetails?: (stepDetails: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== DESIGN TOKENS (Singularity) ====================

const COLORS = {
  primary: '#4A4DC9',
  primaryDark: '#383BA6',
  primaryLight: '#C1C1EA',
  orange: '#FF7212',
  orangeLight: '#FC9145',
  purple: '#533086',
  cream: '#FFF3E4',
  ink: '#4E4E4E',
  grey400: '#CACACA',
  grey200: '#EBEBEB',
  grey100: '#F5F5F5',
  white: '#FFFFFF',
  iceFill: '#DCEEFF',
  iceEdge: '#A9D2F5',
  waterFill: '#7FB6E8',
  waterTop: '#A7D0F2',
  gradPurpleOrange: 'linear-gradient(135deg, #533086 0%, #FC9145 100%)',
  gradLavenderCream: 'linear-gradient(135deg, #C1C1EA 0%, #FFF3E4 100%)',
};

const FONT = "'Poppins', system-ui, -apple-system, sans-serif";

// ==================== EASING HELPERS ====================

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ==================== KEYFRAMES ====================

const KEYFRAMES = `
@keyframes mic-fadeInUp { from { opacity:0; transform:translateY(24px);} to { opacity:1; transform:translateY(0);} }
@keyframes mic-pop { 0%{transform:scale(0);opacity:0;} 70%{transform:scale(1.08);} 100%{transform:scale(1);opacity:1;} }
@keyframes mic-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.04);} }
@keyframes mic-glow { 0%,100%{box-shadow:0 0 0 0 rgba(74,77,201,0);} 50%{box-shadow:0 0 0 12px rgba(74,77,201,0.18);} }
@keyframes mic-drip { 0%{transform:translateY(0);opacity:0;} 20%{opacity:0.9;} 100%{transform:translateY(26px);opacity:0;} }
@keyframes mic-shimmer { 0%{opacity:0.25;} 50%{opacity:0.6;} 100%{opacity:0.25;} }
@keyframes mic-spin { from{transform:rotate(0);} to{transform:rotate(360deg);} }
@keyframes mic-bob { 0%,100%{transform:translateY(0) rotate(-1.5deg);} 50%{transform:translateY(-4px) rotate(1.5deg);} }
@keyframes mic-confetti { 0%{transform:translateY(-10px) rotate(0);opacity:1;} 100%{transform:translateY(120px) rotate(360deg);opacity:0;} }
@keyframes mic-wave { 0%{transform:translateX(0);} 100%{transform:translateX(-40px);} }
@keyframes mic-bubble { 0%{transform:translateY(0) scale(0.6);opacity:0;} 25%{opacity:0.8;} 100%{transform:translateY(-46px) scale(1);opacity:0;} }
@keyframes mic-sweat { 0%{transform:translateY(0);opacity:0;} 30%{opacity:0.85;} 100%{transform:translateY(34px);opacity:0;} }
@keyframes mic-ripple { 0%{transform:scale(0.4);opacity:0.6;} 100%{transform:scale(2.6);opacity:0;} }
`;

// ==================== DEFAULT CONTENT ====================

const DEFAULT_PREDICTIONS = [
  { id: 'same', label: 'Ice stays the same', correct: false },
  { id: 'water', label: 'Ice turns into water', correct: true },
  { id: 'gone', label: 'Ice disappears completely', correct: false },
];

const DEFAULT_PROMPTS = {
  predict: 'Socho! Cup ne table par mukshu to ice nu shu thashe? (Predict before you observe)',
  observe: 'Dhyaan thi juo — ice motu thay chhe ke nanu? Pani kya thi aavyu?',
  explain: 'Ice gayab nathi thayu… ae pani ma convert thayu. Aa process ne "melting" kahevay.',
  recap: 'Tamari prediction sachi hati ke nahi? Compare karo!',
};

const DEFAULT_CONCEPT_LINES = [
  'Ice is water in the SOLID state.',
  'Water is the same substance in the LIQUID state.',
  'On warming, solid → liquid. This process is called MELTING.',
  'Nothing was added or lost — it is the same water!',
];

const DEFAULT_QUIZ = [
  {
    question: 'When ice changes into water, this process is called…',
    options: ['Evaporation', 'Freezing', 'Melting', 'Condensation'],
    answerIndex: 2,
    explanation: 'Solid → liquid is melting. Liquid → solid is freezing.',
  },
  {
    question: 'Ice and water are…',
    options: ['Two different substances', 'The same substance in different states', 'Not related at all'],
    answerIndex: 1,
    explanation: 'Ice and water are the same substance — just solid and liquid states.',
  },
  {
    question: 'To turn water back into ice, we should…',
    options: ['Heat it', 'Cool it in a freezer', 'Add salt'],
    answerIndex: 1,
    explanation: 'Cooling liquid water in a freezer makes it freeze into ice.',
  },
  {
    question: 'What makes an ice cube melt when left on a table?',
    options: ['It loses heat to the room', 'It gains heat from the warm room', 'Nothing — it melts on its own'],
    answerIndex: 1,
    explanation: 'The warm surroundings supply heat to the ice, so it melts into water.',
  },
  {
    question: 'Which property is TRUE for ice (solid state)?',
    options: ['It flows and takes the shape of the container', 'It keeps its own fixed shape', 'It spreads to fill all space'],
    answerIndex: 1,
    explanation: 'A solid keeps its shape. A liquid takes the container’s shape; a gas fills all space.',
  },
  {
    question: 'A puddle of water dries up in the sun. The water has…',
    options: ['Frozen', 'Melted', 'Evaporated into water vapour', 'Condensed'],
    answerIndex: 2,
    explanation: 'Liquid water turning into vapour is evaporation — it speeds up in sunlight.',
  },
  {
    question: 'As the ice cube melts, what happens to the amount of water in the cup?',
    options: ['It decreases', 'It increases', 'It stays exactly zero'],
    answerIndex: 1,
    explanation: 'The melting ice turns into liquid water, so the water level rises.',
  },
];

const DEFAULT_STEPS: StepDataInterface[] = [
  { id: 1, title: 'Predict', description: 'What will happen to the ice?', type: 'predict', mode: 'learn' },
  { id: 2, title: 'Observe', description: 'Watch the ice melt over time.', type: 'observe', mode: 'learn' },
  { id: 3, title: 'Explain', description: 'Understand what really happened.', type: 'explain', mode: 'learn' },
  { id: 4, title: 'Recap', description: 'Compare your prediction with the result.', type: 'recap', mode: 'learn' },
  { id: 10, title: 'Quick Check', description: 'Practice questions.', type: 'practice', mode: 'practice' },
];

// ==================== STAGE: GLASS + ICE + WATER (SVG) ====================

const glassTopY = 96;
const glassBottomY = 268;
const glassTopL = 80, glassTopR = 280;
const glassBotL = 110, glassBotR = 250;
const innerH = glassBottomY - glassTopY;

// A single cube melts into a pool roughly its own size — a wide, short cup keeps
// the proportion looking natural (water fills the base, never the whole cup).
const WATER_MAX_DEPTH = 74;  // meltwater depth at full melt (px) ~ 43% of the cup
const ICE_START = 96;        // starting cube side (px) — a chunky, visible cube

// gentle wavy surface for the pool, drawn down to the cup base
const wavePath = (y: number, amp: number, phase: number) => {
  const seg = 46;
  let d = `M ${glassBotL - 44} ${y} `;
  for (let i = 0; i < 7; i++) {
    const dir = (i + phase) % 2 === 0 ? -amp : amp;
    d += `q ${seg / 2} ${dir} ${seg} 0 `;
  }
  d += `L ${glassBotR + 44} ${glassBottomY} L ${glassBotL - 44} ${glassBottomY} Z`;
  return d;
};

const Stage: React.FC<{ iceFraction: number; waterFraction: number; melting: boolean; minute: number }> =
  ({ iceFraction, waterFraction, melting, minute }) => {
    const floorY = glassBottomY - 3;
    const waterDepth = waterFraction * WATER_MAX_DEPTH;
    const waterLevelY = floorY - waterDepth;

    // cube shrinks gradually; it RESTS on the floor while the pool is shallow,
    // then FLOATS at the surface as the pool deepens (ice is less dense than water).
    const iceSize = ICE_START * iceFraction;
    const iceCenterX = 180;
    const submerged = 0.74; // fraction of a floating cube that sits below the surface
    const iceBottomY = Math.min(floorY, waterLevelY + iceSize * submerged);
    const iceTopY = iceBottomY - iceSize;
    const iceVisible = iceFraction > 0.015;
    // corners round off more as it melts (ice loses its sharp edges first)
    const cornerR = Math.min(iceSize / 2, iceSize * (0.16 + (1 - iceFraction) * 0.34));
    const waveAmp = melting ? 2 : 0.8;

    return (
      <svg viewBox="0 0 360 320" style={{ width: '100%', maxWidth: 340, display: 'block', margin: '0 auto' }}>
        <defs>
          <linearGradient id="micWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.waterTop} />
            <stop offset="100%" stopColor={COLORS.waterFill} />
          </linearGradient>
          <linearGradient id="micIce" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor={COLORS.iceFill} />
            <stop offset="100%" stopColor={COLORS.iceEdge} />
          </linearGradient>
          <linearGradient id="micGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
          </linearGradient>
          <clipPath id="micGlassClip">
            <polygon points={`${glassTopL},${glassTopY} ${glassTopR},${glassTopY} ${glassBotR},${glassBottomY} ${glassBotL},${glassBottomY}`} />
          </clipPath>
        </defs>

        {/* table shadow */}
        <ellipse cx="180" cy={glassBottomY + 12} rx="118" ry="13" fill="rgba(74,77,201,0.08)" />

        {/* everything liquid/solid inside the cup */}
        <g clipPath="url(#micGlassClip)">
          {/* 1. pool first */}
          <path d={wavePath(waterLevelY, waveAmp + 0.6, 1)} fill={COLORS.waterFill} opacity={0.45}
            style={{ animation: melting ? 'mic-wave 3.6s linear infinite' : 'none' }} />
          <path d={wavePath(waterLevelY, waveAmp, 0)} fill="url(#micWater)" opacity={0.78}
            style={{ animation: melting ? 'mic-wave 2.6s linear infinite reverse' : 'none' }} />

          {/* 2. ice cube ON TOP of the water so it's always visible and shrinks smoothly */}
          {iceVisible && (
            <g style={{ transformOrigin: `${iceCenterX}px ${iceBottomY}px`, animation: melting ? 'mic-bob 2.8s ease-in-out infinite' : 'none' }}>
              <rect
                x={iceCenterX - iceSize / 2} y={iceTopY}
                width={iceSize} height={iceSize} rx={cornerR}
                fill="url(#micIce)" stroke={COLORS.iceEdge} strokeWidth="2"
              />
              {/* faint waterline across the submerged part of the cube */}
              {waterLevelY > iceTopY && waterLevelY < iceBottomY && (
                <line x1={iceCenterX - iceSize / 2} y1={waterLevelY}
                  x2={iceCenterX + iceSize / 2} y2={waterLevelY}
                  stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
              )}
              <line x1={iceCenterX - iceSize * 0.22} y1={iceTopY + iceSize * 0.18}
                x2={iceCenterX + iceSize * 0.26} y2={iceTopY + iceSize * 0.55}
                stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
              <rect
                x={iceCenterX - iceSize / 2 + iceSize * 0.16} y={iceTopY + iceSize * 0.14}
                width={iceSize * 0.18} height={iceSize * 0.4} rx={4}
                fill="rgba(255,255,255,0.7)"
                style={{ animation: 'mic-shimmer 2.4s ease-in-out infinite' }}
              />
            </g>
          )}

          {/* 3. meltwater trickling off the cube + ripple at the surface */}
          {melting && iceVisible && (
            <>
              <circle cx={iceCenterX + iceSize * 0.36} cy={Math.max(iceTopY + iceSize * 0.4, waterLevelY - 14)} r={2.8} fill={COLORS.waterFill}
                style={{ animation: 'mic-drip 1.4s ease-in infinite' }} />
              <circle cx={iceCenterX - iceSize * 0.34} cy={Math.max(iceTopY + iceSize * 0.5, waterLevelY - 18)} r={2.2} fill={COLORS.waterFill}
                style={{ animation: 'mic-drip 1.8s ease-in 0.6s infinite' }} />
              {waterDepth > 4 && (
                <ellipse cx={iceCenterX + iceSize * 0.36} cy={waterLevelY} rx="9" ry="2.6"
                  fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4"
                  style={{ transformOrigin: `${iceCenterX}px ${waterLevelY}px`, animation: 'mic-ripple 1.8s ease-out infinite' }} />
              )}
            </>
          )}
        </g>

        {/* glass walls (semi-transparent, on top) */}
        <polygon
          points={`${glassTopL},${glassTopY} ${glassTopR},${glassTopY} ${glassBotR},${glassBottomY} ${glassBotL},${glassBottomY}`}
          fill="url(#micGlass)" stroke={COLORS.primaryLight} strokeWidth="3"
        />
        <ellipse cx="180" cy={glassTopY} rx={(glassTopR - glassTopL) / 2} ry="9"
          fill="rgba(255,255,255,0.35)" stroke={COLORS.primaryLight} strokeWidth="2.5" />

        {/* minute caption */}
        <text x="180" y={glassBottomY + 36} textAnchor="middle" fontFamily={FONT} fontSize="14"
          fontWeight={600} fill={COLORS.ink}>
          {Math.round(minute)} min
        </text>
      </svg>
    );
  };

// ==================== BUTTON (Singularity pill) ====================

type BtnVariant = 'contained' | 'outlined' | 'texted' | 'highlight';
const PillButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  active?: boolean;
  full?: boolean;
  style?: React.CSSProperties;
}> = ({ children, onClick, variant = 'contained', disabled, active, full, style }) => {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);

  let bg = COLORS.primary, color = COLORS.white, border = 'none';
  if (variant === 'outlined') { bg = 'transparent'; color = COLORS.primary; border = `2px solid ${COLORS.primary}`; }
  if (variant === 'texted') { bg = 'transparent'; color = COLORS.primary; border = 'none'; }
  if (variant === 'highlight') { bg = COLORS.orange; color = COLORS.white; border = 'none'; }

  if (!disabled) {
    if (variant === 'contained' && hover) bg = '#5C5FD6';
    if (variant === 'contained' && press) bg = COLORS.primaryDark;
    if (variant === 'highlight' && hover) bg = COLORS.orangeLight;
    if ((variant === 'outlined' || variant === 'texted') && hover) bg = 'rgba(74,77,201,0.08)';
    if (active && (variant === 'outlined' || variant === 'texted')) bg = COLORS.primaryLight;
  }
  if (disabled) { bg = variant === 'contained' || variant === 'highlight' ? COLORS.grey400 : 'transparent'; color = '#9A9A9A'; border = variant === 'outlined' ? `2px solid ${COLORS.grey400}` : border; }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        fontFamily: FONT, fontWeight: 600, fontSize: 15,
        padding: '11px 26px', borderRadius: 999, border, background: bg, color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 220ms cubic-bezier(0.4,0,0.2,1)',
        transform: press && !disabled ? 'scale(0.96)' : hover && !disabled ? 'scale(1.04)' : 'scale(1)',
        boxShadow: hover && !disabled && (variant === 'contained' || variant === 'highlight')
          ? '0 10px 22px rgba(74,77,201,0.28)' : 'none',
        width: full ? '100%' : 'auto',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

// ==================== MAIN COMPONENT ====================

const MeltingIceCubeTool: React.FC<MeltingIceCubeToolProps> = ({
  props = {},
  setStepDetails,
  setStopAutoNext,
}) => {
  // ---- config ----
  const ap = (props.additionalProps || {}) as MeltingIceAdditionalProps;
  const themeColor = props.themeColor || COLORS.primary;
  const totalMinutes = ap.totalMinutes ?? 10;
  const meltDurationMs = (ap.meltDurationMs ?? 16000) / (props.animationSpeed || 1);
  const showModeSelector = props.showModeSelector ?? true;
  const showNavigation = props.showNavigation ?? true;
  const showPlayPause = props.showPlayPause ?? true;
  const showStepIndicator = props.showStepIndicator ?? true;
  const showPrediction = ap.showPrediction ?? true;
  const enabledModes = props.enabledModes ?? ['learn', 'practice'];
  const predictions = ap.predictionOptions ?? DEFAULT_PREDICTIONS;
  const prompts = { ...DEFAULT_PROMPTS, ...(ap.teacherPrompts || {}) };
  const conceptLines = ap.conceptLines ?? DEFAULT_CONCEPT_LINES;
  const quiz = ap.quiz ?? DEFAULT_QUIZ;

  const allSteps = (props.steps ?? DEFAULT_STEPS).filter(
    (s) => !props.filterSteps || props.filterSteps.includes(s.id)
  );

  // ---- state ----
  const rootRef = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(880); // measured width of the tool itself
  const [mode, setMode] = useState<ModeType>(props.initialMode ?? 'learn');
  const learnSteps = useMemo(() => allSteps.filter((s) => s.mode === 'learn'), [allSteps]);
  const [stepIdx, setStepIdx] = useState(() => {
    const i = learnSteps.findIndex((s) => s.id === props.initialStep);
    return i >= 0 ? i : 0;
  });
  const [elapsed, setElapsed] = useState(ap.startMinute ?? 0); // simulated minutes
  const [isPlaying, setIsPlaying] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(showPrediction ? null : 'water');
  const [conceptStep, setConceptStep] = useState(0);

  // practice state
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0); // bump to reshuffle answer positions

  // Shuffle each question's options so the correct answer has NO positional pattern.
  // Correct positions are spread across slots as evenly as possible (least-used slot
  // first, random tie-break), and distractors are randomly ordered.
  const shuffledQuiz = useMemo(() => {
    const use: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    return quiz.map((q) => {
      const n = q.options.length;
      let min = Infinity;
      let candidates: number[] = [];
      for (let p = 0; p < n; p++) {
        if (use[p] < min) { min = use[p]; candidates = [p]; }
        else if (use[p] === min) candidates.push(p);
      }
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      use[target] += 1;
      const correct = q.options[q.answerIndex];
      const distractors = q.options.filter((_, i) => i !== q.answerIndex);
      for (let i = distractors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
      }
      const opts = new Array(n);
      opts[target] = correct;
      let d = 0;
      for (let p = 0; p < n; p++) if (p !== target) opts[p] = distractors[d++];
      return { ...q, options: opts, answerIndex: target };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, shuffleSeed]);

  const step = learnSteps[stepIdx];
  const iceFraction = clamp(1 - elapsed / totalMinutes, 0, 1);
  const waterFraction = clamp(elapsed / totalMinutes, 0, 1);
  const fullyMelted = elapsed >= totalMinutes;

  // ---- responsive: measure our own width (works embedded at any size) ----
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = (w: number) => setVw(w);
    update(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) update(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = vw < 680;   // stack the stage above the panel
  const tiny = vw < 430;     // phones: tighter spacing + smaller type
  const pad = tiny ? 12 : narrow ? 16 : 22;
  const gap = narrow ? 14 : 18;

  // ---- inject keyframes + Poppins ----
  useEffect(() => {
    const s = document.createElement('style');
    s.id = 'mic-keyframes';
    s.textContent = KEYFRAMES;
    document.head.appendChild(s);
    if (!document.getElementById('mic-poppins')) {
      const l = document.createElement('link');
      l.id = 'mic-poppins';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
      document.head.appendChild(l);
    }
    return () => { document.getElementById('mic-keyframes')?.remove(); };
  }, []);

  // ---- auto-melt animation loop ----
  useEffect(() => {
    if (!isPlaying || mode !== 'learn') return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 48);
      last = now;
      setElapsed((prev) => {
        const next = prev + (dt / meltDurationMs) * totalMinutes;
        if (next >= totalMinutes) return totalMinutes;
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, meltDurationMs, totalMinutes, mode]);

  // stop playing when melted
  useEffect(() => { if (fullyMelted) setIsPlaying(false); }, [fullyMelted]);

  // reveal concept lines progressively on Explain scene
  useEffect(() => {
    if (step?.type !== 'explain') return;
    setConceptStep(0);
    const t = setInterval(() => {
      setConceptStep((c) => (c < conceptLines.length ? c + 1 : c));
    }, 700);
    return () => clearInterval(t);
  }, [step?.type, conceptLines.length]);

  // report step details upward + freeze auto-advance (this is an interactive tool)
  useEffect(() => {
    setStopAutoNext?.(true);
    setStepDetails?.({
      currentStep: stepIdx + 1,
      totalSteps: learnSteps.length,
      isPaused: !isPlaying,
      currentMode: mode,
    });
  }, [stepIdx, isPlaying, mode, learnSteps.length, setStepDetails, setStopAutoNext]);

  // ---- handlers ----
  const reset = useCallback(() => { setElapsed(0); setIsPlaying(false); }, []);
  const goNext = () => { reset(); setStepIdx((i) => Math.min(i + 1, learnSteps.length - 1)); };
  const goPrev = () => { reset(); setStepIdx((i) => Math.max(i - 1, 0)); };
  const restartAll = () => { reset(); setPrediction(showPrediction ? null : 'water'); setStepIdx(0); };

  const predictionCorrect = useMemo(
    () => predictions.find((p) => p.id === prediction)?.correct ?? false,
    [prediction, predictions]
  );

  const answerQuiz = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === shuffledQuiz[qIdx].answerIndex) setScore((s) => s + 1);
  };
  const nextQuiz = () => {
    if (qIdx + 1 >= shuffledQuiz.length) { setQuizDone(true); return; }
    setQIdx((q) => q + 1); setPicked(null);
  };
  const resetQuiz = () => { setQIdx(0); setPicked(null); setScore(0); setQuizDone(false); setShuffleSeed((s) => s + 1); };

  // gating: in Predict scene, controls locked until a prediction is made
  const locked = step?.type === 'predict' && showPrediction && prediction === null;

  // ==================== RENDER: shared shell ====================

  const cardStyle: React.CSSProperties = {
    background: COLORS.white, borderRadius: tiny ? 16 : 20, padding: tiny ? '14px 14px' : '20px 22px',
    boxShadow: '0 12px 30px rgba(74,77,201,0.10)',
  };

  // ---- scene panels ----
  const renderLearnPanel = () => {
    if (!step) return null;

    if (step.type === 'predict') {
      return (
        <div style={{ animation: 'mic-fadeInUp 0.5s ease-out' }}>
          <SceneTag icon={<Target size={16} />} text="Step 1 · Predict" />
          <h3 style={h3}>Before we start — what will happen?</h3>
          <PromptBubble text={prompts.predict} />
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {predictions.map((p) => {
              const sel = prediction === p.id;
              return (
                <button key={p.id} onClick={() => setPrediction(p.id)}
                  style={{
                    fontFamily: FONT, fontSize: 15, fontWeight: 600, textAlign: 'left',
                    padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
                    border: sel ? `2px solid ${themeColor}` : `2px solid ${COLORS.grey200}`,
                    background: sel ? COLORS.primaryLight : COLORS.white,
                    color: COLORS.ink, transition: 'all 200ms ease',
                    animation: sel ? 'mic-pop 0.35s ease-out' : 'none',
                  }}>
                  {p.label}
                </button>
              );
            })}
          </div>
          {prediction && (
            <p style={{ ...hint, animation: 'mic-fadeInUp 0.4s ease-out' }}>
              Prediction locked in. Now move to <b>Observe</b> to test it →
            </p>
          )}
        </div>
      );
    }

    if (step.type === 'observe') {
      return (
        <div style={{ animation: 'mic-fadeInUp 0.5s ease-out' }}>
          <SceneTag icon={<Snowflake size={16} />} text="Step 2 · Observe" />
          <h3 style={h3}>Watch the ice over {totalMinutes} minutes</h3>
          <PromptBubble text={prompts.observe} />

          <div style={{ marginTop: 16 }}>
            <label style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.ink }}>
              Time: {Math.round(elapsed)} min
            </label>
            <input
              type="range" min={0} max={totalMinutes} step={0.5} value={elapsed}
              onChange={(e) => { setIsPlaying(false); setElapsed(Number(e.target.value)); }}
              style={{ width: '100%', accentColor: themeColor, marginTop: 6 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
            <Readout label="Ice left (solid)" value={`${Math.round(iceFraction * 100)}%`} color={COLORS.iceEdge} icon={<Snowflake size={14} />} />
            <Readout label="Melted to water" value={`${Math.round(waterFraction * 100)}%`} color={COLORS.waterFill} icon={<Droplet size={14} />} />
          </div>

          {fullyMelted && (
            <p style={{ ...hint, animation: 'mic-fadeInUp 0.4s ease-out' }}>
              The ice is gone — but look, the cup is full of water! Go to <b>Explain</b> →
            </p>
          )}
        </div>
      );
    }

    if (step.type === 'explain') {
      return (
        <div style={{ animation: 'mic-fadeInUp 0.5s ease-out' }}>
          <SceneTag icon={<Lightbulb size={16} />} text="Step 3 · Explain" />
          <h3 style={h3}>So what really happened?</h3>
          <PromptBubble text={prompts.explain} />
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {conceptLines.map((line, i) => (
              <div key={i} style={{
                display: i < conceptStep ? 'flex' : 'none', gap: 10, alignItems: 'flex-start',
                padding: '12px 14px', borderRadius: 12, background: COLORS.cream,
                fontFamily: FONT, fontSize: 14.5, color: COLORS.ink, fontWeight: 500,
                animation: 'mic-fadeInUp 0.45s ease-out',
              }}>
                <span style={{
                  minWidth: 22, height: 22, borderRadius: 999, background: COLORS.orange,
                  color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>{i + 1}</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (step.type === 'recap') {
      return (
        <div style={{ animation: 'mic-fadeInUp 0.5s ease-out', position: 'relative' }}>
          <SceneTag icon={<RotateCcw size={16} />} text="Step 4 · Recap" />
          <h3 style={h3}>How did your prediction do?</h3>
          <PromptBubble text={prompts.recap} />

          <div style={{
            marginTop: 14, padding: '16px 18px', borderRadius: 16,
            background: predictionCorrect ? 'rgba(34,160,90,0.10)' : 'rgba(255,114,18,0.10)',
            border: `2px solid ${predictionCorrect ? '#22A05A' : COLORS.orange}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                width: 30, height: 30, borderRadius: 999, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                background: predictionCorrect ? '#22A05A' : COLORS.orange, color: '#fff',
              }}>
                {predictionCorrect ? <Check size={18} /> : <X size={18} />}
              </span>
              <b style={{ fontFamily: FONT, fontSize: 16, color: COLORS.ink }}>
                {predictionCorrect ? 'Spot on!' : 'Good try!'}
              </b>
            </div>
            <p style={{ fontFamily: FONT, fontSize: 14, color: COLORS.ink, margin: 0, lineHeight: 1.5 }}>
              You predicted: <b>{predictions.find((p) => p.id === prediction)?.label ?? '—'}</b>.<br />
              The ice <b>melted into water</b> — the same substance, just a liquid now.
              This solid → liquid change is called <b>melting</b>.
            </p>
          </div>

          {predictionCorrect && (
            <div style={{ position: 'absolute', top: 0, left: '50%', pointerEvents: 'none' }}>
              {[...Array(8)].map((_, i) => (
                <span key={i} style={{
                  position: 'absolute', width: 8, height: 8, borderRadius: 2,
                  background: [COLORS.primary, COLORS.orange, COLORS.purple, COLORS.orangeLight][i % 4],
                  left: (i - 4) * 16, animation: `mic-confetti ${0.9 + (i % 3) * 0.3}s ease-in ${i * 0.05}s forwards`,
                }} />
              ))}
            </div>
          )}

          <PillButton variant="texted" onClick={restartAll} style={{ marginTop: 14 }}>
            <RotateCcw size={16} /> Try again with a new prediction
          </PillButton>
        </div>
      );
    }
    return null;
  };

  const renderPracticePanel = () => {
    const total = shuffledQuiz.length;
    if (quizDone) {
      return (
        <div style={{ ...cardStyle, textAlign: 'center', animation: 'mic-pop 0.5s ease-out' }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>{score === total ? '🏆' : '🌟'}</div>
          <h3 style={h3}>You scored {score} / {total}</h3>
          <p style={{ fontFamily: FONT, color: COLORS.ink, fontSize: 14 }}>
            {score === total ? 'Perfect — you understand states of water!' : 'Nice work. Review and try again!'}
          </p>
          <PillButton onClick={resetQuiz} style={{ marginTop: 10 }}>
            <RotateCcw size={16} /> Retry
          </PillButton>
        </div>
      );
    }
    const q = shuffledQuiz[qIdx];
    return (
      <div style={{ ...cardStyle, animation: 'mic-fadeInUp 0.45s ease-out' }}>
        <SceneTag icon={<Target size={16} />} text={`Question ${qIdx + 1} of ${total}`} />
        <h3 style={h3}>{q.question}</h3>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {q.options.map((opt, i) => {
            const isAns = i === q.answerIndex;
            const chosen = picked === i;
            let bg = COLORS.white, bd = COLORS.grey200, col = COLORS.ink;
            if (picked !== null) {
              if (isAns) { bg = 'rgba(34,160,90,0.12)'; bd = '#22A05A'; }
              else if (chosen) { bg = 'rgba(255,114,18,0.12)'; bd = COLORS.orange; }
            }
            return (
              <button key={i} onClick={() => answerQuiz(i)}
                style={{
                  fontFamily: FONT, fontSize: 15, fontWeight: 600, textAlign: 'left',
                  padding: '13px 16px', borderRadius: 12, cursor: picked === null ? 'pointer' : 'default',
                  border: `2px solid ${bd}`, background: bg, color: col,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 180ms ease',
                }}>
                {opt}
                {picked !== null && isAns && <Check size={18} color="#22A05A" />}
                {picked !== null && chosen && !isAns && <X size={18} color={COLORS.orange} />}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: COLORS.cream, animation: 'mic-fadeInUp 0.4s ease-out' }}>
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: COLORS.ink, margin: 0 }}>{q.explanation}</p>
            <PillButton onClick={nextQuiz} style={{ marginTop: 10 }}>
              {qIdx + 1 >= total ? 'See score' : 'Next'} <ChevronRight size={16} />
            </PillButton>
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDER ====================

  return (
    <div ref={rootRef} style={{
      fontFamily: FONT, width: '100%', maxWidth: props.width || 880, margin: '0 auto',
      background: COLORS.gradLavenderCream, borderRadius: tiny ? 18 : 28, padding: pad,
      boxShadow: '0 25px 50px -12px rgba(83,48,134,0.25)', boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: narrow ? 12 : 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: tiny ? 11 : 12, fontWeight: 600, letterSpacing: 1, color: COLORS.purple, textTransform: 'uppercase' }}>
            Class 6 · States of Water
          </div>
          <h2 style={{ fontFamily: FONT, fontSize: tiny ? 19 : 24, fontWeight: 700, color: COLORS.ink, margin: '2px 0 0' }}>
            Melting Ice Cube
          </h2>
        </div>
        {showModeSelector && (
          <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.6)', padding: 4, borderRadius: 999 }}>
            {enabledModes.map((m) => (
              <button key={m} onClick={() => setMode(m)}
                style={{
                  fontFamily: FONT, fontWeight: 600, fontSize: 13, padding: tiny ? '7px 14px' : '8px 18px',
                  borderRadius: 999, border: 'none', cursor: 'pointer', transition: 'all 200ms ease',
                  background: mode === m ? themeColor : 'transparent',
                  color: mode === m ? '#fff' : COLORS.ink,
                }}>
                {m === 'learn' ? 'Learn' : 'Practice'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {mode === 'practice' ? (
        // PRACTICE: no animation/stage — quiz only, full width
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          {renderPracticePanel()}
        </div>
      ) : (
      <div style={{
        display: 'grid',
        gridTemplateColumns: narrow ? '1fr' : 'minmax(260px, 1fr) 1.1fr',
        gap, alignItems: 'stretch',
      }}>
        {/* Stage */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          {locked && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(245,245,245,0.78)', zIndex: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20,
              backdropFilter: 'blur(2px)',
            }}>
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ animation: 'mic-pulse 1.8s ease-in-out infinite', fontSize: 30 }}>🤔</div>
                <p style={{ fontFamily: FONT, fontWeight: 600, color: COLORS.purple, maxWidth: 200, margin: '8px auto 0' }}>
                  Make a prediction first to unlock the experiment
                </p>
              </div>
            </div>
          )}
          <Stage iceFraction={iceFraction} waterFraction={waterFraction} melting={isPlaying} minute={elapsed} />

          {/* Observe controls under stage */}
          {step?.type === 'observe' && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              {showPlayPause && (
                <PillButton onClick={() => setIsPlaying((p) => !p)} disabled={fullyMelted}>
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />} {isPlaying ? 'Pause' : 'Play'}
                </PillButton>
              )}
              <PillButton variant="outlined" onClick={reset}>
                <RotateCcw size={16} /> Reset
              </PillButton>
            </div>
          )}
        </div>

        {/* Panel */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            {renderLearnPanel()}
          </div>

          {/* Footer nav */}
          {showNavigation && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${COLORS.grey200}` }}>
              <PillButton variant="outlined" onClick={goPrev} disabled={stepIdx === 0}>
                <ChevronLeft size={16} /> Back
              </PillButton>
              {showStepIndicator && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {learnSteps.map((s, i) => (
                    <span key={s.id} style={{
                      width: i === stepIdx ? 22 : 8, height: 8, borderRadius: 999,
                      background: i === stepIdx ? themeColor : COLORS.grey400, transition: 'all 250ms ease',
                    }} />
                  ))}
                </div>
              )}
              <PillButton onClick={goNext} disabled={stepIdx >= learnSteps.length - 1 || locked}>
                Next <ChevronRight size={16} />
              </PillButton>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

// ==================== SMALL PRESENTATIONAL HELPERS ====================

const h3: React.CSSProperties = { fontFamily: FONT, fontSize: 18, fontWeight: 700, color: COLORS.ink, margin: '10px 0 4px' };
const hint: React.CSSProperties = { fontFamily: FONT, fontSize: 13.5, color: COLORS.purple, fontWeight: 500, marginTop: 14, lineHeight: 1.5 };

const SceneTag: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999,
    background: COLORS.gradPurpleOrange, color: '#fff', fontFamily: FONT, fontSize: 12, fontWeight: 600,
  }}>{icon}{text}</span>
);

const PromptBubble: React.FC<{ text: string }> = ({ text }) => (
  <div style={{
    marginTop: 10, padding: '12px 14px', borderRadius: '4px 14px 14px 14px',
    background: COLORS.primaryLight, color: COLORS.ink, fontFamily: FONT, fontSize: 14, lineHeight: 1.45, fontWeight: 500,
  }}>💬 {text}</div>
);

const Readout: React.FC<{ label: string; value: string; color: string; icon: React.ReactNode }> = ({ label, value, color, icon }) => (
  <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: COLORS.grey100 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color, fontFamily: FONT, fontSize: 12, fontWeight: 600 }}>{icon}{label}</div>
    <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{value}</div>
  </div>
);

export default MeltingIceCubeTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════