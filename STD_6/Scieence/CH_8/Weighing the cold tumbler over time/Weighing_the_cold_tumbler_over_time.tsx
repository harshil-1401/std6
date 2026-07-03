// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: condensation_mass_balance_tool.tsx
//
// Tool type: 19 POE walkthrough  +  1 Phenomenon simulator (digital balance)
// Concept  : Condensation adds mass. Water vapour from the surrounding air
//            condenses onto a cold covered tumbler, so the balance reading
//            rises minute by minute even though nothing was added by hand and
//            the tumbler stays covered (the "mass came from inside" trap).
// Flow     : Predict -> Observe (step the 5-min timer) -> Explain -> Score -> Review
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ==================== INLINE ICONS (no external icon dependency) ====================
// Self-contained SVG icons so the tool never depends on a runtime icon import.
type IconProps = { size?: number | string; color?: string; fill?: string; style?: React.CSSProperties };
const mkIcon = (paths: React.ReactNode, vb = 24) => ({ size = 24, color = 'currentColor', fill = 'none', style }: IconProps) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill={fill} stroke={color}
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    {paths}
  </svg>
);

const Play = mkIcon(<polygon points="6 3 20 12 6 21 6 3" />);
const Pause = mkIcon(<><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>);
const ChevronLeft = mkIcon(<polyline points="15 18 9 12 15 6" />);
const ChevronRight = mkIcon(<polyline points="9 18 15 12 9 6" />);
const RotateCcw = mkIcon(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>);
const Check = mkIcon(<polyline points="20 6 9 17 4 12" />);
const X = mkIcon(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>);
const Award = mkIcon(<><circle cx="12" cy="8" r="6" /><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" /></>);
const Star = mkIcon(<polygon points="12 2 15.1 8.6 22 9.3 17 14.1 18.2 21 12 17.6 5.8 21 7 14.1 2 9.3 8.9 8.6 12 2" />);
const Droplets = mkIcon(<path d="M12 2.7S6 9 6 14a6 6 0 0 0 12 0c0-5-6-11.3-6-11.3z" />);
const TrendingUp = mkIcon(<><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>);
const Eye = mkIcon(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>);
const HelpCircle = mkIcon(<><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12" y2="17" /></>);
const Lightbulb = mkIcon(<><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></>);


// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';
type Phase = 'play' | 'result' | 'review';
type SubPhase = 'predict' | 'observe' | 'checkpoint' | 'explain';
type Prediction = 'increase' | 'decrease' | 'same';

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
  type: string;
  mode: ModeType;
  data?: any;
}

interface CheckpointItem {
  id: string;
  prompt: string;
  options: string[];
  correctAnswerIdx: number;
  conceptTitle: string;
  conceptExplanation: string;
  conceptFormula?: string;
}

interface UserAnswer {
  checkpointId: string;
  prompt: string;
  options: string[];
  chosenIdx: number;
  correctIdx: number;
  conceptTitle: string;
  conceptExplanation: string;
  conceptFormula?: string;
}

interface CondensationAdditionalProps {
  startReading?: number;          // grams at t = 0
  ratePerInterval?: number;       // grams gained per 5-min interval
  intervalMinutes?: number;       // minutes per step (default 5)
  totalIntervals?: number;        // number of 5-min steps to run
  liquidLabel?: string;           // e.g. "iced water"
  unit?: string;                  // mass unit, default "g"
  correctPrediction?: Prediction; // default "increase"
}

interface ToolProps {
  props?: {
    width?: number;
    height?: number;
    data?: any;
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
    additionalProps?: CondensationAdditionalProps;
  };
  setStepDetails?: (s: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ==================== BRAND PALETTE (matches design system) ====================

const C = {
  primary: '#4A4DC9',
  primaryDark: '#533086',
  primaryLight: '#C1C1EA',
  primaryGhost: '#EDEDF8',
  accent: '#FF7212',
  accentDark: '#FC9145',
  accentLight: '#FFF3E4',
  gray900: '#1A1A2E',
  gray700: '#4E4E4E',
  gray400: '#CACACA',
  gray200: '#EBEBEB',
  gray100: '#F5F5F5',
  white: '#FFFFFF',
  success: '#2ECC71',
  danger: '#E53E3E',
  water: '#3FA9F5',
  waterDeep: '#1E6FB5',
};

const FONT = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// ==================== MISCONCEPTION ====================

const MISCONCEPTION = {
  belief: 'A covered glass can lose or hold steady mass; the droplets "come from the cold water inside".',
  resolution:
    'The reading climbs because water vapour already in the surrounding air condenses on the cold outer surface, adding mass to the whole setup.',
};

// ==================== DEFAULTS ====================

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const DEFAULT_STEPS: StepDataInterface[] = [
  { id: 1, title: 'The Setup', description: 'A glass tumbler of iced water sits on a digital balance under a clear cover. Predict what the reading will do over the next 30 minutes.', type: 'predict', mode: 'learn' },
  { id: 2, title: 'Minute 0 → 5', description: 'Step the timer. The first faint mist of droplets appears on the cold outer wall — and the balance ticks up.', type: 'observe', mode: 'learn' },
  { id: 3, title: 'Minute 5 → 10', description: 'More droplets gather and merge. The reading keeps climbing even though the cover was never opened.', type: 'observe', mode: 'learn' },
  { id: 4, title: 'Minute 10 → 15', description: 'Droplets begin to run together into beads. The mass gain is now clearly visible on the display.', type: 'observe', mode: 'learn' },
  { id: 5, title: 'Minute 15 → 20', description: 'A film of water now coats the glass. Toggle the inside level mark — the water level inside has NOT dropped.', type: 'observe', mode: 'learn' },
  { id: 6, title: 'Where did it come from?', description: 'The added mass is water vapour from the surrounding air that condensed on the cold surface — not water that escaped the sealed tumbler.', type: 'explain', mode: 'learn' },
];

const DEFAULT_CHECKPOINTS: CheckpointItem[] = [
  {
    id: 'cp-predict',
    prompt: 'A covered glass of iced water sits on a balance. Over 30 minutes, the reading will…',
    options: ['Increase', 'Decrease', 'Stay exactly the same'],
    correctAnswerIdx: 0,
    conceptTitle: 'Prediction — Condensation adds mass',
    conceptExplanation:
      'The reading goes up. The cold outer surface chills the air touching it, and water vapour in that air condenses into droplets on the glass. Those droplets are extra matter resting on the setup, so the balance measures more than before.',
  },
  {
    id: 'cp-source',
    prompt: 'After 10 minutes droplets coat the OUTSIDE of the covered glass. Where did that water come from?',
    options: ['It seeped out through the glass from inside', 'Water vapour in the surrounding air condensed on the cold surface', 'The balance drifted and is reading wrong'],
    correctAnswerIdx: 1,
    conceptTitle: 'The water is from the air, not from inside',
    conceptExplanation:
      'Glass is not porous — nothing leaks through it. The droplets are airborne water vapour that cooled below its dew point against the cold wall and condensed. This is the same process that fogs a cold soft-drink bottle on a humid day.',
  },
  {
    id: 'cp-level',
    prompt: 'You toggle the inside level mark. What has happened to the water level INSIDE the sealed tumbler?',
    options: ['It dropped — that water became the droplets outside', 'It is unchanged — the outside water came from the air', 'It rose because the droplets fell back in'],
    correctAnswerIdx: 1,
    conceptTitle: 'Inside level is unchanged',
    conceptExplanation:
      'Because the tumbler is covered and the outside droplets came from the air, the water sealed inside neither leaves nor gains. The level mark stays put. The extra mass on the balance is entirely new water deposited on the outside.',
  },
];

// ==================== MAIN COMPONENT ====================

const CondensationMassBalanceTool: React.FC<ToolProps> = ({
  props = {},
  setStepDetails,
  stopAutoNext,
  setStopAutoNext,
}) => {
  // ---------- config ----------
  const config = useMemo(() => ({
    width: props.width ?? 860,
    height: props.height ?? 640,
    initialMode: props.initialMode ?? 'learn',
    showModeSelector: props.showModeSelector ?? false,
    enabledModes: props.enabledModes ?? ['learn'],
    showNavigation: props.showNavigation ?? true,
    showPlayPause: props.showPlayPause ?? true,
    showStepIndicator: props.showStepIndicator ?? true,
    animationSpeed: props.animationSpeed ?? 1,
    themeColor: props.themeColor ?? C.primary,
    darkMode: props.darkMode ?? false,
  }), [props]);

  const ap = props.additionalProps || {};
  const sim = useMemo(() => ({
    startReading: ap.startReading ?? 248.0,
    rate: ap.ratePerInterval ?? 0.8,
    intervalMinutes: ap.intervalMinutes ?? 5,
    totalIntervals: ap.totalIntervals ?? 6,
    liquidLabel: ap.liquidLabel ?? 'iced water',
    unit: ap.unit ?? 'g',
    correctPrediction: ap.correctPrediction ?? 'increase',
  }), [ap]);

  // ---------- responsive ----------
  const wrapRef = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState<number>(config.width);
  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.getBoundingClientRect().width ?? config.width;
      setVw(w);
    };
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && wrapRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(wrapRef.current);
    }
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, [config.width]);
  const isMobile = vw <= 575;

  // ---------- phase / poe state ----------
  const [phase, setPhase] = useState<Phase>('play');
  const [subPhase, setSubPhase] = useState<SubPhase>('predict');
  const [intervalIdx, setIntervalIdx] = useState(0);          // 0..totalIntervals (minutes done / 5)
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [showLevelMark, setShowLevelMark] = useState(false);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);

  // checkpoint overlay state
  const [activeCheckpoint, setActiveCheckpoint] = useState<CheckpointItem | null>(null);
  const [pendingResumeInterval, setPendingResumeInterval] = useState<number | null>(null);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);

  // animation state for reading count-up & droplets
  const [displayReading, setDisplayReading] = useState(sim.startReading);
  const [dropletProgress, setDropletProgress] = useState(0);   // 0..1 within current interval
  const [isAnimating, setIsAnimating] = useState(false);

  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const fromReadingRef = useRef(sim.startReading);
  const toReadingRef = useRef(sim.startReading);
  const targetIntervalRef = useRef(0);

  // result celebration
  const [resultReveal, setResultReveal] = useState(0);
  const confettiRef = useRef<HTMLCanvasElement>(null);

  // step-gain badge ("+0.8 g") + freshly-filled table row
  const [gainBadge, setGainBadge] = useState(0);          // bump key to retrigger animation
  const [freshRow, setFreshRow] = useState(-1);           // index of row that just filled

  const minutesElapsed = intervalIdx * sim.intervalMinutes;
  const totalMinutes = sim.totalIntervals * sim.intervalMinutes;
  const targetReading = sim.startReading + intervalIdx * sim.rate;

  // ---------- font + keyframes ----------
  useEffect(() => {
    const fid = 'cmb-font';
    if (!document.getElementById(fid)) {
      const l = document.createElement('link');
      l.id = fid;
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=DM+Serif+Display:ital@1&display=swap';
      document.head.appendChild(l);
    }
    const kid = 'cmb-keyframes';
    const css = `
      @keyframes cmbFadeUp { from { opacity:0; transform:translateY(22px);} to {opacity:1; transform:translateY(0);} }
      @keyframes cmbPop { 0%{transform:scale(0);opacity:0;} 70%{transform:scale(1.18);} 100%{transform:scale(1);opacity:1;} }
      @keyframes cmbPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.05);} }
      @keyframes cmbSlideUp { from{transform:translateY(110%);} to{transform:translateY(0);} }
      @keyframes cmbGlow { 0%,100%{box-shadow:0 0 0 0 ${C.accent}00;} 50%{box-shadow:0 0 0 8px ${C.accent}33;} }
      @keyframes cmbBlink { 0%,49%{opacity:1;} 50%,100%{opacity:0.35;} }
      @keyframes cmbSpin { from{transform:rotate(0);} to{transform:rotate(360deg);} }
      @keyframes cmbBob { 0%,100%{transform:translateY(0) rotate(-2deg);} 50%{transform:translateY(2.5px) rotate(2deg);} }
      @keyframes cmbBob2 { 0%,100%{transform:translateY(1.5px) rotate(3deg);} 50%{transform:translateY(-1.5px) rotate(-3deg);} }
      @keyframes cmbDrip { 0%{transform:translateY(0);opacity:0.9;} 70%{opacity:0.9;} 100%{transform:translateY(10px);opacity:0;} }
      @keyframes cmbVapor { 0%{transform:translate(0,0) scale(1);opacity:0;} 25%{opacity:0.32;} 100%{transform:translate(var(--vx),var(--vy)) scale(0.4);opacity:0;} }
      @keyframes cmbRise { 0%{opacity:0; transform:translateY(8px) scale(0.9);} 18%{opacity:1; transform:translateY(0) scale(1);} 78%{opacity:1;} 100%{opacity:0; transform:translateY(-14px) scale(1);} }
      @keyframes cmbRowFill { 0%{background:#FFF3E4;} 100%{background:transparent;} }
    `;
    let s = document.getElementById(kid) as HTMLStyleElement | null;
    if (!s) {
      s = document.createElement('style');
      s.id = kid;
      document.head.appendChild(s);
    }
    s.textContent = css;
    return () => {
      const ex = document.getElementById(kid);
      if (ex) ex.remove();
    };
  }, []);

  // ---------- report step details ----------
  useEffect(() => {
    setStepDetails?.({
      currentStep: intervalIdx + 1,
      totalSteps: sim.totalIntervals + 2,
      isPaused: !isAnimating,
      currentMode: 'learn',
    });
  }, [intervalIdx, isAnimating, sim.totalIntervals, setStepDetails]);

  // ---------- count-up animation for the balance reading ----------
  const cancelAnim = () => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  };

  const runIntervalAnimation = useCallback((toInterval: number) => {
    cancelAnim();
    const dur = 1500 / config.animationSpeed;
    fromReadingRef.current = sim.startReading + (toInterval - 1) * sim.rate;
    toReadingRef.current = sim.startReading + toInterval * sim.rate;
    targetIntervalRef.current = toInterval;
    startTimeRef.current = performance.now();
    setIsAnimating(true);

    const tick = (now: number) => {
      const t = Math.min((now - startTimeRef.current) / dur, 1);
      const e = easeInOutQuad(t);
      const r = fromReadingRef.current + (toReadingRef.current - fromReadingRef.current) * e;
      setDisplayReading(r);
      setDropletProgress(easeOutCubic(t));
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        animRef.current = null;
        setIsAnimating(false);
        setDisplayReading(toReadingRef.current);
        // fire checkpoints after specific intervals
        maybeFireCheckpoint(toInterval);
      }
    };
    animRef.current = requestAnimationFrame(tick);
  }, [config.animationSpeed, sim.startReading, sim.rate]);

  useEffect(() => () => cancelAnim(), []);

  // ---------- checkpoint orchestration ----------
  const maybeFireCheckpoint = (afterInterval: number) => {
    // checkpoint 2 (source) after 2 intervals (10 min)
    if (afterInterval === 2 && !userAnswers.find(a => a.checkpointId === 'cp-source')) {
      setPendingResumeInterval(afterInterval);
      setTimeout(() => {
        setSubPhase('checkpoint');
        setActiveCheckpoint(DEFAULT_CHECKPOINTS[1]);
      }, 350);
    }
  };

  const answerCheckpoint = (chosenIdx: number, cp: CheckpointItem) => {
    setFlashIdx(chosenIdx);
    const ans: UserAnswer = {
      checkpointId: cp.id,
      prompt: cp.prompt,
      options: cp.options,
      chosenIdx,
      correctIdx: cp.correctAnswerIdx,
      conceptTitle: cp.conceptTitle,
      conceptExplanation: cp.conceptExplanation,
      conceptFormula: cp.conceptFormula,
    };
    setUserAnswers(prev => {
      const without = prev.filter(a => a.checkpointId !== cp.id);
      return [...without, ans];
    });
    setTimeout(() => {
      setFlashIdx(null);
      setActiveCheckpoint(null);
      setSubPhase('observe');
      setPendingResumeInterval(null);
    }, 700);
  };

  // ---------- prediction ----------
  const handlePredict = (p: Prediction) => {
    setPrediction(p);
    const cp = DEFAULT_CHECKPOINTS[0];
    const chosenIdx = p === 'increase' ? 0 : p === 'decrease' ? 1 : 2;
    const ans: UserAnswer = {
      checkpointId: cp.id,
      prompt: cp.prompt,
      options: cp.options,
      chosenIdx,
      correctIdx: cp.correctAnswerIdx,
      conceptTitle: cp.conceptTitle,
      conceptExplanation: cp.conceptExplanation,
    };
    setUserAnswers(prev => [...prev.filter(a => a.checkpointId !== cp.id), ans]);
    setSubPhase('observe');
  };

  // ---------- timer step ----------
  const stepTimer = () => {
    if (isAnimating || activeCheckpoint) return;
    if (intervalIdx >= sim.totalIntervals) return;
    const next = intervalIdx + 1;
    setIntervalIdx(next);
    setDropletProgress(0);
    setGainBadge(g => g + 1);
    setFreshRow(next);
    runIntervalAnimation(next);
  };

  // ---------- toggle level + level checkpoint ----------
  const toggleLevel = () => {
    const willShow = !showLevelMark;
    setShowLevelMark(willShow);
    if (willShow && intervalIdx >= sim.totalIntervals && !userAnswers.find(a => a.checkpointId === 'cp-level')) {
      setTimeout(() => {
        setSubPhase('checkpoint');
        setActiveCheckpoint(DEFAULT_CHECKPOINTS[2]);
      }, 450);
    }
  };

  // ---------- advance to explain / result ----------
  const goExplain = () => {
    if (subPhase === 'explain') {
      finishToResult();
    } else {
      setSubPhase('explain');
    }
  };

  const finishToResult = () => {
    cancelAnim();
    setPhase('result');
    setResultReveal(0);
  };

  // ---------- reset ----------
  const playAgain = () => {
    cancelAnim();
    setPhase('play');
    setSubPhase('predict');
    setIntervalIdx(0);
    setPrediction(null);
    setShowLevelMark(false);
    setUserAnswers([]);
    setReviewIdx(0);
    setActiveCheckpoint(null);
    setPendingResumeInterval(null);
    setDisplayReading(sim.startReading);
    setDropletProgress(0);
    setIsAnimating(false);
    setResultReveal(0);
    setFreshRow(-1);
    setGainBadge(0);
    setStopAutoNext?.(true);
  };

  // ---------- result reveal + confetti ----------
  const score = userAnswers.filter(a => a.chosenIdx === a.correctIdx).length;
  const totalQ = DEFAULT_CHECKPOINTS.length;

  useEffect(() => {
    if (phase !== 'result') return;
    let raf = 0;
    const t0 = performance.now();
    const dur = 1300;
    const loop = (now: number) => {
      const t = Math.min((now - t0) / dur, 1);
      setResultReveal(easeOutBack(t));
      if (t < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'result') return;
    const cv = confettiRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width, H = cv.height;
    const cols = [C.primary, C.accent, C.success, C.primaryLight, C.accentDark, C.water];
    const parts = Array.from({ length: 56 }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.4,
      vy: 2 + Math.random() * 3.5,
      vx: -1.5 + Math.random() * 3,
      s: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
      c: cols[Math.floor(Math.random() * cols.length)],
      life: 0,
    }));
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const el = now - t0;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life = el;
        const alpha = Math.max(0, 1 - el / 2000);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (el < 2100) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const stageW = Math.min(vw - (isMobile ? 24 : 64), 760);
  const stageH = isMobile ? 320 : 380;

  // figure: digital balance + covered tumbler with melting ice and condensation
  const renderStage = () => {
    const cx = stageW / 2;

    // ---------- zone layout (top→bottom, no overlap) ----------
    // balance base at the very bottom
    const baseW = Math.min(stageW * 0.64, 360);
    const baseH = isMobile ? 54 : 64;
    const baseX = cx - baseW / 2;
    const baseY = stageH - baseH - 6;
    const trayY = baseY - 8;                       // weighing tray sits just above the body

    // tapered tumbler standing on the tray
    const tumH = stageH * (isMobile ? 0.50 : 0.54);
    const topHalf = (baseW * 0.40) / 2;            // wider at top (real drinking glass)
    const botHalf = topHalf * 0.84;                // slightly narrower base
    const glassTopY = trayY - tumH;
    const glassBotY = trayY;
    const wall = 3;
    const rb = 10;                                 // bottom corner radius
    const coverH = 13;

    // constant inside water level (sealed → never changes)
    const waterTop = glassTopY + tumH * 0.32;

    // smooth progress through the run (ties droplets + melting together)
    const animFrac = isAnimating
      ? Math.min(1, Math.max(0, (intervalIdx - 1 + dropletProgress) / sim.totalIntervals))
      : Math.min(1, Math.max(0, intervalIdx / sim.totalIntervals));

    // glass outline path (tapered, rounded bottom)
    const outer =
      `M ${cx - topHalf} ${glassTopY}` +
      ` L ${cx - botHalf} ${glassBotY - rb}` +
      ` Q ${cx - botHalf} ${glassBotY} ${cx - botHalf + rb} ${glassBotY}` +
      ` L ${cx + botHalf - rb} ${glassBotY}` +
      ` Q ${cx + botHalf} ${glassBotY} ${cx + botHalf} ${glassBotY - rb}` +
      ` L ${cx + topHalf} ${glassTopY} Z`;

    // half-width of the glass at a given y (for clamping droplets inside the taper)
    const halfAt = (y: number) => {
      const t = (y - glassTopY) / tumH;
      return topHalf + (botHalf - topHalf) * Math.max(0, Math.min(1, t));
    };

    // ---------- condensation droplets ----------
    const dropCount = Math.round(animFrac * 30);
    type Drop = { x: number; y: number; r: number; runner: boolean };
    const droplets: Drop[] = [];
    {
      let seed = 13;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      for (let i = 0; i < 36; i++) {
        const ty = glassTopY + coverH + 10 + rnd() * (tumH - coverH - 22);
        const hw = halfAt(ty) - wall - 4;
        const tx = cx + (rnd() * 2 - 1) * hw;
        // beads grow with overall progress; lower beads bigger (they merge & run)
        const depth = (ty - glassTopY) / tumH;
        const r = (1.4 + rnd() * 2.2) * (0.55 + 0.7 * animFrac) * (0.8 + depth * 0.6);
        const runner = depth > 0.55 && animFrac > 0.55 && rnd() > 0.45;
        droplets.push({ x: tx, y: ty, r, runner });
      }
    }
    const shownDrops = droplets.slice(0, dropCount);

    // ---------- ice cubes (shrink + round as they melt) ----------
    const meltShrink = 1 - 0.55 * animFrac;
    const iceRound = 2 + 7 * animFrac;
    const iceDefs = [
      { dx: -topHalf * 0.42, dy: 4, base: isMobile ? 17 : 20, anim: 'cmbBob' },
      { dx: topHalf * 0.30, dy: 12, base: isMobile ? 19 : 22, anim: 'cmbBob2' },
      { dx: -topHalf * 0.02, dy: 22, base: isMobile ? 15 : 18, anim: 'cmbBob' },
    ];

    // ---------- inside level-mark label (placed LEFT of glass, clamped) ----------
    const lblW = isMobile ? 96 : 108;
    const lblH = 24;
    const lblX = Math.max(4, cx - topHalf - 12 - lblW);
    const lblY = Math.min(Math.max(waterTop, glassTopY + lblH), glassBotY - lblH);

    // ---------- vapour specks (air → cold surface), kept clear of labels ----------
    const vapors = [
      { x: cx + topHalf + 14, y: glassTopY + 28, vx: -16, vy: 10, d: 0 },
      { x: cx + topHalf + 22, y: glassTopY + 70, vx: -20, vy: -6, d: 0.8 },
      { x: cx + topHalf + 10, y: glassTopY + 120, vx: -14, vy: -10, d: 1.6 },
      { x: cx - topHalf - 16, y: glassTopY + 150, vx: 14, vy: -8, d: 0.4 },
      { x: cx - topHalf - 22, y: glassTopY + 200, vx: 18, vy: -12, d: 1.2 },
    ];
    const showVapor = phase === 'play' && intervalIdx > 0 && intervalIdx < sim.totalIntervals + 1;

    return (
      <svg width={stageW} height={stageH} viewBox={`0 0 ${stageW} ${stageH}`} shapeRendering="geometricPrecision" style={{ display: 'block', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="cmbGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="0.45" stopColor="#dceefb" stopOpacity="0.22" />
            <stop offset="1" stopColor="#9cc4e0" stopOpacity="0.42" />
          </linearGradient>
          <linearGradient id="cmbWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7cc6f5" />
            <stop offset="0.5" stopColor={C.water} />
            <stop offset="1" stopColor={C.waterDeep} />
          </linearGradient>
          <linearGradient id="cmbBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#43435a" />
            <stop offset="1" stopColor={C.gray900} />
          </linearGradient>
          <radialGradient id="cmbHi" cx="0.3" cy="0.2" r="0.85">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cmbCold" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#bfe3ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#bfe3ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cmbIce" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#cfeaff" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* cold aura behind the glass */}
        <ellipse cx={cx} cy={glassTopY + tumH / 2} rx={topHalf * 2.2} ry={tumH * 0.62} fill="url(#cmbCold)"
          opacity={0.25 + 0.5 * animFrac} />

        {/* vapour specks drifting from the air toward the cold glass */}
        {showVapor && vapors.map((v, i) => (
          <circle key={`v${i}`} cx={v.x} cy={v.y} r={3.4} fill="#9fd4ff"
            style={{
              // @ts-ignore custom props for keyframes
              '--vx': `${v.vx}px`, '--vy': `${v.vy}px`,
              animation: `cmbVapor ${2.6}s ease-in ${v.d}s infinite`,
            } as React.CSSProperties} />
        ))}

        {/* ground shadow */}
        <ellipse cx={cx} cy={baseY + baseH + 3} rx={baseW * 0.54} ry={9} fill={C.gray900} opacity={0.08} />

        {/* glass body */}
        <path d={outer} fill="url(#cmbGlass)" stroke={C.gray700} strokeWidth={2} />

        {/* clipped interior: water + melting ice */}
        <clipPath id="cmbInner"><path d={outer} /></clipPath>
        <g clipPath="url(#cmbInner)">
          {/* water */}
          <rect x={cx - topHalf - 4} y={waterTop} width={topHalf * 2 + 8} height={glassBotY - waterTop} fill="url(#cmbWater)" opacity={0.94} />
          {/* gentle surface line */}
          <rect x={cx - topHalf - 4} y={waterTop} width={topHalf * 2 + 8} height={2.5} fill="#ffffff" opacity={0.4} />
          {/* ice cubes floating at the surface, shrinking as they melt */}
          {iceDefs.map((ice, i) => {
            const s = ice.base * meltShrink;
            return (
              <g key={`ice${i}`} style={{ transformOrigin: `${cx + ice.dx}px ${waterTop + ice.dy}px`, animation: `${ice.anim} ${3 + i * 0.6}s ease-in-out infinite` }}>
                <rect x={cx + ice.dx - s / 2} y={waterTop + ice.dy - s / 2} width={s} height={s} rx={iceRound}
                  fill="url(#cmbIce)" stroke="#bfe3ff" strokeWidth={1} opacity={0.92} />
                <rect x={cx + ice.dx - s / 2 + 2} y={waterTop + ice.dy - s / 2 + 2} width={s * 0.32} height={s * 0.32} rx={2} fill="#ffffff" opacity={0.7} />
              </g>
            );
          })}
        </g>

        {/* glass vertical highlight */}
        <path d={`M ${cx - topHalf + 5} ${glassTopY + coverH} L ${cx - botHalf + 6} ${glassBotY - 8} L ${cx - botHalf + 6 + topHalf * 0.22} ${glassBotY - 8} L ${cx - topHalf + 5 + topHalf * 0.26} ${glassTopY + coverH} Z`}
          fill="url(#cmbHi)" opacity={0.5} clipPath="url(#cmbInner)" />

        {/* condensation droplets on the OUTSIDE wall */}
        {shownDrops.map((d, i) => (
          <g key={`d${i}`}>
            {d.runner && (
              <rect x={d.x - d.r * 0.45} y={d.y} width={d.r * 0.9} height={d.r * 3.2} rx={d.r * 0.45}
                fill={C.water} opacity={0.5}
                style={{ transformOrigin: `${d.x}px ${d.y}px`, animation: `cmbDrip ${2.4 + (i % 5) * 0.3}s ease-in ${(i % 4) * 0.4}s infinite` }} />
            )}
            <circle cx={d.x} cy={d.y} r={d.r} fill={C.water} opacity={0.74} />
            <circle cx={d.x - d.r * 0.32} cy={d.y - d.r * 0.32} r={d.r * 0.38} fill="#ffffff" opacity={0.9} />
          </g>
        ))}

        {/* puddle of condensed water on the tray at the end */}
        {animFrac > 0.7 && (
          <ellipse cx={cx} cy={trayY + 2} rx={topHalf * (0.9 + 0.5 * (animFrac - 0.7) / 0.3)} ry={4.5}
            fill={C.water} opacity={0.4} />
        )}

        {/* clear cover lid (drawn above the glass rim) */}
        <rect x={cx - topHalf - 5} y={glassTopY - 2} width={topHalf * 2 + 10} height={coverH} rx={6}
          fill="#ffffff" stroke={C.gray700} strokeWidth={2} opacity={0.9} />
        <rect x={cx - 9} y={glassTopY - 9} width={18} height={9} rx={4} fill={C.gray400} stroke={C.gray700} strokeWidth={1.5} />

        {/* INSIDE level mark — line on glass, label clamped to the LEFT (clear of droplets) */}
        {showLevelMark && (
          <g style={{ animation: 'cmbFadeUp 0.4s ease-out' }}>
            <line x1={cx - topHalf - 6} y1={waterTop} x2={cx + topHalf + 6} y2={waterTop}
              stroke={C.accentDark} strokeWidth={2.5} strokeDasharray="6 4" />
            <line x1={lblX + lblW} y1={lblY} x2={cx - topHalf - 6} y2={waterTop} stroke={C.accentDark} strokeWidth={1.5} opacity={0.7} />
            <rect x={lblX} y={lblY - lblH / 2} width={lblW} height={lblH} rx={8} fill={C.white} stroke={C.accentDark} strokeWidth={1.5} />
            <text x={lblX + lblW / 2} y={lblY + 4} textAnchor="middle" fontFamily={FONT} fontSize={isMobile ? 11 : 12} fontWeight={600} fill={C.gray900}>level unchanged</text>
          </g>
        )}

        {/* weighing tray */}
        <rect x={cx - baseW * 0.30} y={trayY} width={baseW * 0.60} height={8} rx={4} fill="#5a5a72" />

        {/* balance body */}
        <rect x={baseX} y={baseY} width={baseW} height={baseH} rx={12} fill="url(#cmbBase)" />

        {/* digital display: value + unit with clear spacing */}
        <g>
          <rect x={cx - (isMobile ? 88 : 104)} y={baseY + baseH * 0.26} width={isMobile ? 176 : 208} height={isMobile ? 30 : 34} rx={7}
            fill="#0d2818" stroke="#0a4d2c" strokeWidth={2} />
          <text x={cx + (isMobile ? 30 : 38)} y={baseY + baseH * 0.26 + (isMobile ? 21 : 24)} textAnchor="end"
            fontFamily={FONT} fontSize={isMobile ? 19 : 23} fontWeight={700}
            fill="#39FF8B" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '1px' }}>
            {displayReading.toFixed(1)}
          </text>
          <text x={cx + (isMobile ? 40 : 50)} y={baseY + baseH * 0.26 + (isMobile ? 21 : 24)} textAnchor="start"
            fontFamily={FONT} fontSize={isMobile ? 12 : 14} fontWeight={600} fill="#39FF8B" opacity={0.85}>
            {sim.unit}
          </text>
        </g>

        {/* timer chip — pinned to TOP-LEFT corner, away from the glass */}
        <g transform="translate(8, 8)">
          <rect x={0} y={0} width={isMobile ? 92 : 104} height={24} rx={12} fill={C.primaryGhost} stroke={C.primaryLight} strokeWidth={1.5} />
          <text x={(isMobile ? 92 : 104) / 2} y={16} textAnchor="middle" fontFamily={FONT} fontSize={isMobile ? 11 : 12.5} fontWeight={600} fill={C.primaryDark}>
            ⏱ {minutesElapsed} min
          </text>
        </g>
      </svg>
    );
  };

  // prediction buttons
  const renderPredict = () => {
    const opts: { key: Prediction; label: string; icon: React.ReactNode }[] = [
      { key: 'increase', label: 'Reading will increase', icon: <TrendingUp size={isMobile ? 18 : 20} /> },
      { key: 'decrease', label: 'Reading will decrease', icon: <ChevronLeft size={isMobile ? 18 : 20} style={{ transform: 'rotate(-90deg)' }} /> },
      { key: 'same', label: 'Stay exactly the same', icon: <span style={{ fontWeight: 800 }}>=</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'cmbFadeUp 0.5s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.primaryDark, fontWeight: 700, fontSize: isMobile ? 15 : 16 }}>
          <HelpCircle size={18} /> Make your prediction
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10 }}>
          {opts.map((o, i) => (
            <button key={o.key}
              onClick={() => handlePredict(o.key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                border: `2px solid ${C.primaryLight}`, background: C.white,
                color: C.gray900, fontWeight: 600, fontSize: isMobile ? 14 : 14.5,
                fontFamily: FONT, transition: 'all 0.2s ease',
                animation: `cmbFadeUp 0.4s ease-out ${i * 0.08}s both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.primaryGhost; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = C.primary; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = C.primaryLight; }}
            >
              {o.icon}{o.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // pill button helper
  const pill = (label: string, onClick: () => void, variant: 'accent' | 'primary' | 'outline' | 'ghost', icon?: React.ReactNode, disabled?: boolean) => {
    const styles: Record<string, React.CSSProperties> = {
      accent: { background: C.accent, color: C.white, border: 'none' },
      primary: { background: C.primary, color: C.white, border: 'none' },
      outline: { background: C.white, color: C.primary, border: `2px solid ${C.primary}` },
      ghost: { background: 'transparent', color: C.gray700, border: `2px solid ${C.gray200}` },
    };
    return (
      <button onClick={onClick} disabled={disabled}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: isMobile ? '12px 18px' : '13px 26px', borderRadius: 9999,
          fontFamily: FONT, fontWeight: 600, fontSize: isMobile ? 14 : 15,
          minHeight: 48, cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1, transition: 'all 0.2s ease',
          boxShadow: variant === 'accent' && !disabled ? `0 6px 16px ${C.accent}55` : 'none',
          ...styles[variant],
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {icon}{label}
      </button>
    );
  };

  // control row depends on sub-phase
  const renderControls = () => {
    if (phase !== 'play') return null;
    if (subPhase === 'predict') return null; // prediction buttons act as controls
    if (subPhase === 'checkpoint') return null;

    const observingDone = intervalIdx >= sim.totalIntervals;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
        {subPhase === 'observe' && !observingDone &&
          pill(`Step +${sim.intervalMinutes} min`, stepTimer, 'accent', <Play size={18} fill={C.white} />, isAnimating)}
        {subPhase === 'observe' && observingDone &&
          pill(showLevelMark ? 'Hide inside level' : 'Mark inside level', toggleLevel, showLevelMark ? 'outline' : 'primary',
            <Eye size={18} />)}
        {subPhase === 'observe' && observingDone &&
          pill('Explain it', goExplain, 'accent', <Lightbulb size={18} />, !userAnswers.find(a => a.checkpointId === 'cp-level'))}
        {subPhase === 'explain' &&
          pill('See my score', finishToResult, 'accent', <Award size={18} />)}
        {/* replay current run */}
        {(subPhase === 'observe' || subPhase === 'explain') &&
          pill('Restart', playAgain, 'ghost', <RotateCcw size={16} />)}
      </div>
    );
  };

  // current caption strip
  const currentCaption = () => {
    if (phase !== 'play') return '';
    if (subPhase === 'predict') return DEFAULT_STEPS[0].description;
    if (subPhase === 'explain') return DEFAULT_STEPS[5].description;
    if (intervalIdx === 0) return DEFAULT_STEPS[0].description;
    if (intervalIdx >= sim.totalIntervals) return DEFAULT_STEPS[4].description; // final: "toggle level mark"
    const a = (intervalIdx - 1) * sim.intervalMinutes;
    const b = intervalIdx * sim.intervalMinutes;
    return `Minute ${a} → ${b}: droplets keep gathering on the cold glass and the balance reading rises — even though the cover was never opened.`;
  };

  const captionLabel = () => {
    if (subPhase === 'predict') return 'Predict';
    if (subPhase === 'explain') return 'Explain';
    if (intervalIdx === 0) return 'Ready';
    return `Minute ${(intervalIdx - 1) * sim.intervalMinutes} → ${intervalIdx * sim.intervalMinutes}`;
  };

  // checkpoint overlay card
  const renderCheckpointCard = () => {
    if (!activeCheckpoint) return null;
    const cp = activeCheckpoint;
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: C.white, borderTop: `3px solid ${C.primary}`,
        borderRadius: '18px 18px 0 0', padding: isMobile ? 16 : 22,
        boxShadow: '0 -10px 30px rgba(0,0,0,0.15)', zIndex: 95,
        animation: 'cmbSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ background: C.primaryGhost, color: C.primaryDark, fontWeight: 700, fontSize: 12, padding: '4px 12px', borderRadius: 9999 }}>Quick check</span>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: isMobile ? 15 : 16.5, color: C.gray900, lineHeight: 1.45, marginBottom: 14 }}>{cp.prompt}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          {cp.options.map((opt, i) => (
            <button key={i}
              onClick={() => answerCheckpoint(i, cp)}
              style={{
                textAlign: 'left', padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                fontFamily: FONT, fontWeight: 500, fontSize: isMobile ? 14 : 14.5,
                border: `2px solid ${flashIdx === i ? C.primary : C.gray200}`,
                background: flashIdx === i ? C.primaryGhost : C.white, color: C.gray900,
                transition: 'all 0.2s ease', minHeight: 48,
              }}
              onMouseEnter={e => { if (flashIdx === null) e.currentTarget.style.borderColor = C.primaryLight; }}
              onMouseLeave={e => { if (flashIdx === null) e.currentTarget.style.borderColor = C.gray200; }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // explain panel
  const renderExplain = () => (
    <div style={{ animation: 'cmbFadeUp 0.5s ease-out', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'flex', gap: 12, alignItems: 'flex-start', padding: isMobile ? 16 : 20,
        background: C.accentLight, borderRadius: 16, borderLeft: `4px solid ${C.accent}`,
      }}>
        <Droplets size={24} color={C.accentDark} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, color: C.gray900, fontSize: isMobile ? 15 : 17, marginBottom: 6 }}>The mass came from the air</div>
          <div style={{ color: C.gray700, fontSize: isMobile ? 14 : 15, lineHeight: 1.6 }}>
            The cold outer wall chilled the air touching it below its dew point. Water vapour already present in that air
            condensed into droplets on the glass. Those droplets are extra matter sitting on the setup, so the balance reads more —
            while the sealed water inside stays exactly where it was.
          </div>
        </div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12,
      }}>
        <div style={{ padding: 14, background: C.primaryGhost, borderRadius: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.primaryDark, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>You predicted</div>
          <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 600, color: prediction === 'increase' ? C.success : C.danger }}>
            {prediction === 'increase' ? 'Increase ✓' : prediction === 'decrease' ? 'Decrease ✗' : 'Stay the same ✗'}
          </div>
        </div>
        <div style={{ padding: 14, background: C.primaryGhost, borderRadius: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.primaryDark, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Mass gained in {totalMinutes} min</div>
          <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: C.gray900, fontVariantNumeric: 'tabular-nums' }}>
            +{(sim.totalIntervals * sim.rate).toFixed(1)} {sim.unit}
          </div>
        </div>
      </div>
    </div>
  );

  // textbook-style record table (auto-fills as the timer is stepped)
  const renderRecordTable = () => {
    const rows = Array.from({ length: sim.totalIntervals + 1 }, (_, i) => i); // 0..totalIntervals
    const filledTo = subPhase === 'predict' && phase === 'play' ? -1 : intervalIdx; // -1 = nothing recorded yet
    const allFilled = phase === 'result' || phase === 'review';

    const cellBase: React.CSSProperties = {
      padding: isMobile ? '9px 10px' : '11px 14px',
      fontFamily: FONT, fontSize: isMobile ? 13.5 : 14.5, color: C.gray900,
      textAlign: 'center', borderBottom: `1px solid ${C.gray200}`,
    };
    const headCell: React.CSSProperties = {
      ...cellBase, fontWeight: 700, color: C.primaryDark,
      background: C.primaryLight, borderBottom: 'none',
    };

    return (
      <div style={{ marginTop: 16, animation: 'cmbFadeUp 0.45s ease-out' }}>
        <div style={{ textAlign: 'center', fontWeight: 700, color: C.gray900, fontSize: isMobile ? 14 : 15.5, marginBottom: 4 }}>
          Mass of water collected over time
        </div>
        <div style={{ textAlign: 'center', color: C.gray700, fontSize: isMobile ? 12 : 13, marginBottom: 10 }}>
          recorded with a digital weighing balance
        </div>
        <div style={{
          maxWidth: 440, margin: '0 auto', borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${C.gray200}`, background: C.white, boxShadow: '0 4px 14px rgba(26,26,46,0.06)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr' }}>
            <div style={{ ...headCell, borderRight: `1px solid ${C.white}` }}>Time</div>
            <div style={headCell}>Mass of water ({sim.unit})</div>
          </div>
          {rows.map((i) => {
            const recorded = allFilled || i <= filledTo;
            const isLive = !allFilled && i === intervalIdx && i === filledTo && isAnimating;
            const value = isLive ? displayReading : sim.startReading + i * sim.rate;
            const justFilled = freshRow === i && !allFilled;
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 1.2fr',
                background: i % 2 === 0 ? C.gray100 : C.white,
                animation: justFilled ? 'cmbRowFill 1s ease-out' : undefined,
              }}>
                <div style={{ ...cellBase, borderRight: `1px solid ${C.gray200}`, fontWeight: 500 }}>
                  {i * sim.intervalMinutes} min
                </div>
                <div style={{
                  ...cellBase, fontWeight: recorded ? 700 : 400,
                  color: recorded ? C.gray900 : C.gray400,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {recorded ? value.toFixed(1) : '—'}
                </div>
              </div>
            );
          })}
        </div>
        {filledTo >= 1 && !allFilled && filledTo < sim.totalIntervals && (
          <div style={{ textAlign: 'center', color: C.gray700, fontSize: isMobile ? 12 : 13, marginTop: 8 }}>
            Keep stepping the timer to fill the remaining rows.
          </div>
        )}
      </div>
    );
  };

  // result overlay
  const renderResult = () => {
    const pct = score / totalQ;
    const stars = Math.round(pct * 5);
    const enc = pct >= 0.9 ? "Brilliant! You've locked this concept down."
      : pct >= 0.7 ? 'Strong work. A couple to polish.'
      : pct >= 0.4 ? "Good start. Let's review the tricky ones."
      : "No worries — let's walk through these together.";
    const title = pct >= 0.9 ? 'Outstanding!' : pct >= 0.7 ? 'Great work!' : pct >= 0.4 ? 'Nicely done!' : 'Keep going!';
    const wrongCount = userAnswers.filter(a => a.chosenIdx !== a.correctIdx).length;

    return (
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(26,26,46,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: isMobile ? 14 : 24, animation: 'cmbFadeUp 0.4s ease-out',
      }}>
        <canvas ref={confettiRef} width={Math.min(vw, 900)} height={stageH + 200}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, margin: '0 auto', pointerEvents: 'none' }} />
        <div style={{
          position: 'relative', background: C.white, borderRadius: 24, width: '100%', maxWidth: 460,
          padding: isMobile ? 24 : 32, textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
          transform: `scale(${0.7 + 0.3 * Math.min(1, resultReveal)})`,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 12px',
            background: `linear-gradient(135deg, ${C.primaryDark}, ${C.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'cmbPop 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <Award size={34} color={C.white} />
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 20 : 23, color: C.gray900 }}>{title}</div>
          <div style={{
            fontFamily: FONT, fontWeight: 800, fontSize: isMobile ? 48 : 56, color: C.primaryDark,
            fontVariantNumeric: 'tabular-nums', margin: '6px 0 2px',
          }}>
            {Math.round(Math.min(1, resultReveal) * score)} / {totalQ}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '8px 0 14px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={isMobile ? 26 : 30}
                fill={i < stars ? C.accent : 'none'} color={i < stars ? C.accent : C.gray400}
                style={{ animation: `cmbPop 0.4s ease-out ${0.3 + i * 0.12}s both` }} />
            ))}
          </div>
          <div style={{ fontFamily: FONT, fontSize: isMobile ? 14 : 16, color: C.gray700, marginBottom: 20, lineHeight: 1.5 }}>{enc}</div>
          <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center' }}>
            {wrongCount > 0 && pill('Review answers', () => { setPhase('review'); setReviewIdx(0); }, 'accent', <Eye size={18} />)}
            {pill('Play again', playAgain, wrongCount > 0 ? 'outline' : 'accent', <RotateCcw size={18} />)}
          </div>
        </div>
      </div>
    );
  };

  // review
  const renderReview = () => {
    const wrongs = userAnswers.filter(a => a.chosenIdx !== a.correctIdx);
    if (wrongs.length === 0) {
      return (
        <div style={{ position: 'absolute', inset: 0, background: C.white, zIndex: 100, padding: isMobile ? 20 : 32, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRadius: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={36} color={C.white} />
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: C.gray900 }}>Every answer was correct!</div>
          <div style={{ color: C.gray700, fontSize: 15, maxWidth: 360, lineHeight: 1.6 }}>{MISCONCEPTION.resolution}</div>
          {pill('Play again', playAgain, 'accent', <RotateCcw size={18} />)}
        </div>
      );
    }
    const a = wrongs[Math.min(reviewIdx, wrongs.length - 1)];
    return (
      <div style={{ position: 'absolute', inset: 0, background: C.white, zIndex: 100, padding: isMobile ? 18 : 28, display: 'flex', flexDirection: 'column', borderRadius: 24, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontWeight: 700, color: C.gray900, fontSize: 15 }}>Wrong answer {reviewIdx + 1} of {wrongs.length}</span>
          <span style={{ background: '#FDE8E8', color: C.danger, fontWeight: 700, fontSize: 12, padding: '4px 12px', borderRadius: 9999 }}>Incorrect</span>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: isMobile ? 15 : 17, color: C.gray900, lineHeight: 1.5, marginBottom: 14 }}>{a.prompt}</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ padding: 14, borderRadius: 12, background: '#FDE8E8', border: `1.5px solid ${C.danger}33` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.danger, fontWeight: 700, fontSize: 12, marginBottom: 4 }}><X size={14} /> Your answer</div>
            <div style={{ fontSize: 14.5, color: C.gray900 }}>{a.options[a.chosenIdx]}</div>
          </div>
          <div style={{ padding: 14, borderRadius: 12, background: '#E7F8EF', border: `1.5px solid ${C.success}33` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.success, fontWeight: 700, fontSize: 12, marginBottom: 4 }}><Check size={14} /> Correct answer</div>
            <div style={{ fontSize: 14.5, color: C.gray900 }}>{a.options[a.correctIdx]}</div>
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: 14, background: C.primaryGhost, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: C.primaryDark, fontSize: 14, marginBottom: 6 }}>Why — {a.conceptTitle}</div>
          <div style={{ color: C.gray900, fontSize: isMobile ? 14 : 15, lineHeight: 1.65 }}>{a.conceptExplanation}</div>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {pill('Previous', () => setReviewIdx(i => Math.max(0, i - 1)), 'ghost', <ChevronLeft size={16} />, reviewIdx === 0)}
          {reviewIdx < wrongs.length - 1
            ? pill('Next wrong', () => setReviewIdx(i => Math.min(wrongs.length - 1, i + 1)), 'accent', <ChevronRight size={16} />)
            : pill('Play again', playAgain, 'accent', <RotateCcw size={16} />)}
        </div>
      </div>
    );
  };

  // ---------- progress ----------
  const progressPct = (() => {
    if (subPhase === 'predict') return 5;
    if (subPhase === 'explain') return 100;
    return 10 + (intervalIdx / sim.totalIntervals) * 80;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div ref={wrapRef} style={{
      width: '100%', maxWidth: config.width, margin: '0 auto', fontFamily: FONT,
      background: C.gray100, borderRadius: 24, overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(26,26,46,0.25)',
    }}>
      {/* header */}
      <div style={{
        padding: isMobile ? '20px 18px' : '26px 32px',
        background: `linear-gradient(135deg, ${C.primaryDark}, ${C.accent})`, color: C.white,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Droplets size={isMobile ? 22 : 26} />
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: isMobile ? 18 : 23 }}>The Balance That Climbs</h2>
        </div>
        <div style={{ marginTop: 6, fontSize: isMobile ? 13 : 14.5, opacity: 0.92 }}>
          Predict → step the timer → watch droplets condense and the reading rise
        </div>
        {config.showStepIndicator && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12,
            background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: 9999,
            fontSize: 13, fontWeight: 600, backdropFilter: 'blur(8px)',
          }}>
            {subPhase === 'predict' ? 'Step 1 · Predict'
              : subPhase === 'explain' ? `Step ${sim.totalIntervals + 2} · Explain`
              : `Step ${intervalIdx + 1} · Observe (${minutesElapsed}/${totalMinutes} min)`}
          </div>
        )}
      </div>

      {/* progress bar */}
      <div style={{ height: 4, background: C.gray200 }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`, transition: 'width 0.5s ease' }} />
      </div>

      {/* stage */}
      <div style={{ position: 'relative', padding: isMobile ? '16px 12px 0' : '24px 24px 0' }}>
        <div style={{
          position: 'relative', background: C.white, borderRadius: 18, padding: isMobile ? 8 : 16,
          display: 'flex', justifyContent: 'center', overflow: 'hidden',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.04)',
        }}>
          {renderStage()}
          {renderCheckpointCard()}
        </div>
      </div>

      {/* controls */}
      <div style={{ padding: isMobile ? '14px 12px 0' : '18px 24px 0' }}>
        {subPhase === 'predict' && phase === 'play' ? renderPredict() : renderControls()}
      </div>

      {/* caption / explain strip */}
      <div style={{ padding: isMobile ? '14px 14px 20px' : '20px 24px 26px' }}>
        {subPhase === 'explain' ? renderExplain() : (
          <div style={{
            position: 'relative',
            background: C.white, borderRadius: 14, padding: isMobile ? 14 : 18,
            borderLeft: `4px solid ${C.primary}`, minHeight: isMobile ? 70 : 64,
            animation: 'cmbFadeUp 0.4s ease-out',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{captionLabel()}</div>
            <div style={{ color: C.gray900, fontSize: isMobile ? 14.5 : 15.5, lineHeight: 1.55 }}>{currentCaption()}</div>
            {/* +Δ gain badge floats up on each step */}
            {gainBadge > 0 && (
              <div key={gainBadge} style={{
                position: 'absolute', top: isMobile ? 10 : 12, right: isMobile ? 12 : 16,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#E7F8EF', color: C.success, fontWeight: 700,
                fontSize: isMobile ? 12.5 : 13.5, padding: '4px 10px', borderRadius: 9999,
                animation: 'cmbRise 1.6s ease-out forwards',
              }}>
                <TrendingUp size={14} /> +{sim.rate.toFixed(1)} {sim.unit}
              </div>
            )}
          </div>
        )}

        {/* textbook record table — visible whenever the experiment is on screen */}
        {phase === 'play' && renderRecordTable()}
      </div>

      {/* overlays */}
      {phase === 'result' && renderResult()}
      {phase === 'review' && renderReview()}
    </div>
  );
};

export default CondensationMassBalanceTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════