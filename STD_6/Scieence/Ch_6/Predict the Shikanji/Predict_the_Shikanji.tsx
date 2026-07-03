// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: sugar_prediction_tool.tsx
// Chapter 6 — Materials Around Us | Section 6.3.4 — Solubility Prediction
// Activity 6.7 — Sugar in Water (Shikanji)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';
type StepId = 1 | 2;
type ScreenPhase = 'predict' | 'locked' | 'wrong';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

interface BaseDataInterface {
  themeColor?: string;
  autoPlayDuration?: number;
}

interface PredictionOption {
  id: string;
  label: string;
  isCorrect: boolean;
  lockReason: string;   // shown when correct
  hintText: string;     // shown when wrong
}

interface PredictionStep {
  stepId: StepId;
  sceneEmoji: string;
  sceneTitle: string;
  sceneDesc: string;
  questionText: string;
  options: PredictionOption[];
  animationClass: string;
}

interface SugarPredictionAdditionalProps {
  steps?: PredictionStep[];
  finishTitle?: string;
  finishBody?: string;
  showTimer?: boolean;
  shuffleOptions?: boolean;
}

interface SugarPredictionToolProps {
  props?: {
    width?: number;
    height?: number;
    data?: BaseDataInterface;
    initialMode?: ModeType;
    showModeSelector?: boolean;
    animationSpeed?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: SugarPredictionAdditionalProps;
  };
  setStepDetails?: (stepDetails: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ==================== INLINE SVG ICONS ====================

const IconCheck: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconRotate: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
);

const IconArrow: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

// ==================== DEFAULT STEPS DATA ====================

const DEFAULT_STEPS: PredictionStep[] = [
  {
    stepId: 1,
    sceneEmoji: '🥄',
    sceneTitle: 'Spoonful of sugar, glass of water',
    sceneDesc: 'Ghulan\'s mother stirs a heaped spoon of sugar into a glass of water for shikanji.',
    questionText: 'What will happen to the sugar crystals after stirring?',
    animationClass: 'spt-slideInLeft',
    options: [
      {
        id: 'disappear',
        label: '🫧 Sugar will disappear',
        isCorrect: true,
        lockReason: 'Sugar dissolves — it breaks into tiny invisible particles that spread through the water. It\'s gone from sight, but still there!',
        hintText: 'Think about what happens when you stir salt into soup — does it vanish, or does it hide?',
      },
      {
        id: 'stay',
        label: '🔮 Sugar will stay as crystals',
        isCorrect: false,
        lockReason: '',
        hintText: 'Water is a great solvent. Try imagining what happens to sugar in tea — do you ever see the crystals at the bottom?',
      },
    ],
  },
  {
    stepId: 2,
    sceneEmoji: '🍋',
    sceneTitle: 'After stirring — the glass looks clear',
    sceneDesc: 'The water looks completely clear now. Ghulan picks up the glass to drink his shikanji.',
    questionText: 'Without looking, how will the water taste?',
    animationClass: 'spt-slideInRight',
    options: [
      {
        id: 'sweet',
        label: '🍬 Tastes sweet',
        isCorrect: true,
        lockReason: 'Sugar is dispersed, not destroyed. The particles are invisible but they\'re still in the water — so the sweetness remains!',
        hintText: 'If sugar vanished completely, there would be nothing sweet left. But dissolving is not the same as disappearing forever.',
      },
      {
        id: 'plain',
        label: '💧 Tastes plain like water',
        isCorrect: false,
        lockReason: '',
        hintText: 'Dissolving hides sugar from our eyes — but not from our tongue! The particles are still floating in the water.',
      },
    ],
  },
];

const DEFAULT_FINISH_TITLE = '🍬 Sugar is dispersed, not destroyed!';
const DEFAULT_FINISH_BODY =
  'When sugar dissolves in water, it breaks into particles too small to see — but they are still there. That\'s why the shikanji tastes sweet even though the crystals have "disappeared". Dissolving is a physical change — nothing is created or lost.';

// ==================== HELPERS ====================

const formatTime = (s: number): string => {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
};

// ==================== DESIGN TOKENS ====================

const C = {
  primary: '#4A4DC9',
  orange: '#FF7212',
  purple: '#533086',
  amber: '#FC9145',
  lightPurple: '#C1C1EA',
  lightOrange: '#FFF3E4',
  dark: '#4E4E4E',
  grey: '#CACACA',
  bgGrey: '#EBEBEB',
  bgLight: '#F5F5F5',
  white: '#FFFFFF',
  green: '#22C55E',
  greenBg: '#DCFCE7',
  greenBorder: '#86EFAC',
  redBg: '#FEE2E2',
  redBorder: '#FCA5A5',
  redText: '#991B1B',
  amberBg: '#FEF3C7',
  amberBorder: '#F59E0B',
  amberText: '#92400E',
};

// ==================== GLOBAL STYLES ====================

const STYLE_BLOCK = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  .spt-root *, .spt-root *::before, .spt-root *::after { box-sizing: border-box; }

  @keyframes spt-fadeInUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spt-popIn {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.14); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes spt-shake {
    0%, 100%       { transform: translateX(0); }
    12%, 52%, 88%  { transform: translateX(-7px); }
    32%, 72%       { transform: translateX(7px); }
  }
  @keyframes spt-slideInLeft {
    from { opacity: 0; transform: translateX(-44px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes spt-slideInRight {
    from { opacity: 0; transform: translateX(44px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes spt-confettiFall {
    0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
  }
  @keyframes spt-hintFade {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes spt-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes spt-starSpin {
    from { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.3); }
    to   { transform: rotate(360deg) scale(1); }
  }
  @keyframes spt-glassWave {
    0%, 100% { transform: translateY(0px); }
    50%      { transform: translateY(-5px); }
  }
  @keyframes spt-bubble {
    0%   { transform: translateY(0) scale(1); opacity: 0.7; }
    100% { transform: translateY(-28px) scale(0.4); opacity: 0; }
  }
  @keyframes spt-crystalFade {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.3); }
  }
  @keyframes spt-pulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.04); }
  }
  @keyframes spt-lockGlow {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
    50%  { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
`;

// ==================== CONFETTI ====================

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const colors = [C.primary, C.orange, C.purple, C.amber, C.lightPurple, C.green, '#FFD700'];
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i, left: Math.random() * 100,
    delay: Math.random() * 2, duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 5 + Math.random() * 8, isCircle: Math.random() > 0.5,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 100 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: '-3%',
          width: p.size, height: p.isCircle ? p.size : p.size * 0.5,
          backgroundColor: p.color, borderRadius: p.isCircle ? '50%' : '2px',
          animation: `spt-confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

// ==================== SCENE ILLUSTRATION ====================

const GlassScene: React.FC<{ stepId: StepId; isLocked: boolean; isMobile: boolean }> = ({ stepId, isLocked, isMobile }) => {
  const glassW = isMobile ? 90 : 110;
  const glassH = isMobile ? 120 : 148;
  const waterColor = stepId === 1 ? '#B8E0F7' : (isLocked ? '#C8EDDB' : '#BDE3FA');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 10, padding: isMobile ? '14px 0' : '22px 0',
      animation: `spt-fadeInUp 0.5s ease-out both`,
    }}>
      {/* Main glass SVG */}
      <div style={{ position: 'relative', animation: 'spt-glassWave 3s ease-in-out infinite' }}>
        <svg width={glassW} height={glassH} viewBox="0 0 110 148" fill="none">
          {/* Glass body */}
          <path d="M18 12 L92 12 L82 136 L28 136 Z" fill={waterColor} opacity="0.85" />

          {/* Sugar crystals (only in step 1, before locked) */}
          {stepId === 1 && !isLocked && (
            <>
              <rect x="34" y="105" width="8" height="8" rx="2" fill="#fff" opacity="0.9" style={{ animation: 'spt-crystalFade 0s both' }} />
              <rect x="52" y="112" width="7" height="7" rx="2" fill="#fff" opacity="0.85" />
              <rect x="66" y="108" width="9" height="9" rx="2" fill="#fff" opacity="0.9" />
              <rect x="44" y="118" width="6" height="6" rx="2" fill="#fff" opacity="0.8" />
              <rect x="60" y="120" width="8" height="8" rx="2" fill="#fff" opacity="0.88" />
              {/* Sparkle dots */}
              <circle cx="38" cy="95" r="2.5" fill="#ffffffaa" />
              <circle cx="70" cy="98" r="2" fill="#ffffffaa" />
            </>
          )}

          {/* Dissolved state — tiny bubbles */}
          {(isLocked || stepId === 2) && (
            <>
              {[30, 48, 62, 75, 42, 58, 67].map((cx, i) => (
                <circle key={i} cx={cx} cy={80 + (i % 3) * 14} r="2" fill="#ffffff88"
                  style={{ animation: `spt-bubble 2.${i}s ease-out ${i * 0.3}s infinite` }} />
              ))}
            </>
          )}

          {/* Lemon slice (step 2) */}
          {stepId === 2 && (
            <>
              <ellipse cx="55" cy="40" rx="18" ry="18" fill="#FDE68A" opacity="0.9" />
              <ellipse cx="55" cy="40" rx="14" ry="14" fill="#FCD34D" opacity="0.7" />
              <line x1="55" y1="26" x2="55" y2="54" stroke="#FBBF24" strokeWidth="1.5" />
              <line x1="41" y1="40" x2="69" y2="40" stroke="#FBBF24" strokeWidth="1.5" />
              <line x1="44" y1="30" x2="66" y2="50" stroke="#FBBF24" strokeWidth="1" />
              <line x1="44" y1="50" x2="66" y2="30" stroke="#FBBF24" strokeWidth="1" />
            </>
          )}

          {/* Glass outline */}
          <path d="M18 12 L92 12 L82 136 L28 136 Z" fill="none" stroke="#93C5FD" strokeWidth="3" strokeLinejoin="round" />
          {/* Glass shine */}
          <path d="M24 22 L28 115" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
          <path d="M32 18 L34 40" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
          {/* Rim highlight */}
          <rect x="18" y="9" width="74" height="6" rx="3" fill="#BFDBFE" opacity="0.6" />
        </svg>

        {/* Spoon — step 1 */}
        {stepId === 1 && (
          <div style={{
            position: 'absolute', top: -22, right: -22,
            fontSize: isMobile ? 26 : 32,
            transform: 'rotate(-40deg)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
            animation: 'spt-fadeInUp 0.6s ease-out 0.2s both',
          }}>
            🥄
          </div>
        )}

        {/* Locked check overlay */}
        {isLocked && (
          <div style={{
            position: 'absolute', bottom: -10, right: -10,
            width: 30, height: 30, borderRadius: '50%',
            background: C.green, border: `2px solid ${C.white}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
            animation: 'spt-popIn 0.4s ease-out both',
          }}>
            <IconCheck size={14} color="#fff" />
          </div>
        )}
      </div>

      {/* Sugar packet — step 1 */}
      {stepId === 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#FFF8E1', border: '1.5px solid #FCD34D',
          borderRadius: 10, padding: '5px 12px',
          fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#92400E',
          fontFamily: "'Poppins', sans-serif",
          animation: 'spt-fadeInUp 0.5s ease-out 0.3s both',
        }}>
          <span style={{ fontSize: 16 }}>🍬</span>
          1 spoon of sugar crystals
        </div>
      )}

      {/* Stirred label — step 2 */}
      {stepId === 2 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: C.greenBg, border: `1.5px solid ${C.greenBorder}`,
          borderRadius: 10, padding: '5px 12px',
          fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#166534',
          fontFamily: "'Poppins', sans-serif",
          animation: 'spt-fadeInUp 0.5s ease-out 0.3s both',
        }}>
          <span style={{ fontSize: 16 }}>✨</span>
          Well stirred — crystals gone!
        </div>
      )}
    </div>
  );
};

// ==================== OPTION BUTTON ====================

interface OptionBtnProps {
  option: PredictionOption;
  phase: ScreenPhase;
  selectedWrongId: string | null;
  onPick: (opt: PredictionOption) => void;
  isMobile: boolean;
  animDelay: number;
}

const OptionBtn: React.FC<OptionBtnProps> = ({ option, phase, selectedWrongId, onPick, isMobile, animDelay }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isLocked = phase === 'locked';
  const isWrong = phase === 'wrong' && selectedWrongId === option.id;
  const isDisabled = phase === 'locked';

  let bg = C.white;
  let border = '#E5E7EB';
  let color = C.dark;
  let shadow = '0 2px 8px rgba(0,0,0,0.05)';
  let transform = 'scale(1)';
  let animation = `spt-fadeInUp 0.45s ease-out ${animDelay}s both`;

  if (isLocked && option.isCorrect) {
    bg = C.greenBg;
    border = C.greenBorder;
    color = '#166534';
    shadow = '0 0 0 3px rgba(34,197,94,0.18)';
    animation = 'spt-lockGlow 0.7s ease-out, spt-popIn 0.4s ease-out';
  } else if (isWrong) {
    bg = C.redBg;
    border = C.redBorder;
    color = C.redText;
    animation = 'spt-shake 0.5s ease-in-out';
  } else if (isDisabled) {
    bg = C.bgLight;
    border = C.bgGrey;
    color = C.grey;
  } else if (hovered) {
    bg = '#EEF2FF';
    border = C.lightPurple;
    color = C.primary;
    shadow = '0 6px 18px rgba(74,77,201,0.14)';
    transform = 'scale(1.025) translateY(-2px)';
  }
  if (pressed && !isDisabled) transform = 'scale(0.97)';

  return (
    <button
      onClick={() => !isDisabled && onPick(option)}
      onMouseEnter={() => !isDisabled && setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !isDisabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, padding: isMobile ? '13px 16px' : '15px 20px',
        borderRadius: 14, border: `2px solid ${border}`, background: bg, color,
        cursor: isDisabled ? 'default' : 'pointer',
        fontFamily: "'Poppins', sans-serif", fontSize: isMobile ? 13 : 14.5, fontWeight: 600,
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        transform, boxShadow: shadow, animation,
        textAlign: 'left',
        outline: 'none',
      }}
    >
      <span style={{ flex: 1 }}>{option.label}</span>
      {isLocked && option.isCorrect && (
        <div style={{
          width: 24, height: 24, borderRadius: '50%', background: C.green,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IconCheck size={13} color="#fff" />
        </div>
      )}
      {isWrong && (
        <div style={{
          width: 24, height: 24, borderRadius: '50%', background: '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IconX size={13} color="#fff" />
        </div>
      )}
    </button>
  );
};

// ==================== MAIN COMPONENT ====================

const SugarPredictionTool: React.FC<SugarPredictionToolProps> = ({
  props = {}, setStepDetails,
}) => {
  const config = useMemo(() => ({
    width: props.width ?? 820,
    themeColor: props.themeColor ?? C.primary,
  }), [props.width, props.themeColor]);

  const ap = props.additionalProps || {};
  const steps: PredictionStep[] = ap.steps ?? DEFAULT_STEPS;
  const finishTitle = ap.finishTitle ?? DEFAULT_FINISH_TITLE;
  const finishBody = ap.finishBody ?? DEFAULT_FINISH_BODY;
  const showTimer = ap.showTimer ?? true;

  // ─── STATE ───
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [phase, setPhase] = useState<ScreenPhase>('predict');
  const [selectedWrongId, setSelectedWrongId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 820
  );
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobile = viewportWidth < 600;
  const isTablet = viewportWidth >= 600 && viewportWidth < 880;

  const currentStep = steps[currentStepIdx];
  const isLastStep = currentStepIdx === steps.length - 1;

  // ─── INIT ───
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'spt-styles';
    el.textContent = STYLE_BLOCK;
    document.head.appendChild(el);
    setTimeout(() => setMounted(true), 50);
    return () => {
      const e = document.getElementById('spt-styles');
      if (e) document.head.removeChild(e);
    };
  }, []);

  // ─── VIEWPORT ───
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── TIMER ───
  useEffect(() => {
    if (!showTimer || !timerRunning || isFinished) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [showTimer, timerRunning, isFinished]);

  // ─── STEP DETAILS ───
  useEffect(() => {
    if (!setStepDetails) return;
    setStepDetails({
      currentStep: currentStepIdx + (phase === 'locked' ? 1 : 0),
      totalSteps: steps.length,
      isPaused: false,
      currentMode: 'practice',
    });
  }, [currentStepIdx, phase, steps.length, setStepDetails]);

  // ─── PICK HANDLER ───
  const handlePick = useCallback((option: PredictionOption) => {
    if (phase !== 'predict') return;
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);

    if (option.isCorrect) {
      setCorrectCount(c => c + 1);
      setPhase('locked');
      setSelectedWrongId(null);
    } else {
      setWrongCount(w => w + 1);
      setPhase('wrong');
      setSelectedWrongId(option.id);
      hintTimerRef.current = setTimeout(() => {
        setPhase('predict');
        setSelectedWrongId(null);
      }, 2800);
    }
  }, [phase]);

  // ─── ADVANCE ───
  const handleNext = useCallback(() => {
    if (isLastStep) {
      setIsFinished(true);
      setTimerRunning(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4200);
    } else {
      setCurrentStepIdx(i => i + 1);
      setPhase('predict');
      setSelectedWrongId(null);
    }
  }, [isLastStep]);

  // ─── RESET ───
  const handleReset = useCallback(() => {
    setCurrentStepIdx(0);
    setPhase('predict');
    setSelectedWrongId(null);
    setCorrectCount(0);
    setWrongCount(0);
    setIsFinished(false);
    setShowConfetti(false);
    setSeconds(0);
    setTimerRunning(true);
  }, []);

  // ─── DERIVED ───
  const progressPct = steps.length > 0
    ? ((currentStepIdx + (phase === 'locked' ? 1 : 0)) / steps.length) * 100 : 0;
  const accuracy = (correctCount + wrongCount) > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 100;

  // find hint text for current wrong selection
  const hintText = phase === 'wrong' && selectedWrongId
    ? currentStep.options.find(o => o.id === selectedWrongId)?.hintText ?? ''
    : '';
  // find lock reason
  const lockReason = phase === 'locked'
    ? currentStep.options.find(o => o.isCorrect)?.lockReason ?? ''
    : '';

  // ─── RESPONSIVE ───
  const pad = isMobile ? 14 : 22;
  const headerTitleSize = isMobile ? 15 : 18;

  // ─── CHIP HELPER ───
  const chip = (bg: string, border: string, children: React.ReactNode) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: bg, border: `1px solid ${border}`,
      backdropFilter: 'blur(8px)', padding: '6px 11px', borderRadius: 14,
    }}>
      {children}
    </div>
  );
  const chipText: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#ffffff' };

  // ==================== RENDER ====================
  return (
    <div className="spt-root" style={{
      width: '100%', maxWidth: config.width,
      margin: '0 auto', fontFamily: "'Poppins', sans-serif",
      background: '#FAFAFA', borderRadius: 20, overflow: 'hidden', position: 'relative',
      boxShadow: '0 8px 40px rgba(74,77,201,0.10), 0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #E5E7EB',
    }}>
      <Confetti active={showConfetti} />

      {/* ══════════════════ HEADER ══════════════════ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.purple} 0%, ${C.primary} 100%)`,
        padding: isMobile ? '14px 16px 12px' : '18px 24px 14px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -28, right: -18, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -22, left: 40, width: 65, height: 65, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        {/* Title + chips */}
        <div style={{
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 10 : 0, position: 'relative', zIndex: 1,
        }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: isMobile ? 20 : 24 }}>🔬</span>
              <h2 style={{
                margin: 0, fontSize: headerTitleSize, fontWeight: 800, color: C.white,
                fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.3px', lineHeight: 1.2,
              }}>
                Predict the Experiment
              </h2>
            </div>
            <p style={{
              margin: '4px 0 0 36px', fontSize: isMobile ? 10 : 11.5, fontWeight: 400,
              color: 'rgba(255,255,255,0.72)', fontFamily: "'Poppins', sans-serif",
            }}>
              Chapter 6 — Activity 6.7 &nbsp;|&nbsp; Sugar &amp; Water
            </p>
          </div>

          {/* Score chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
            {chip('rgba(34,197,94,0.22)', 'rgba(134,239,172,0.5)', <>
              <IconCheck size={12} color="#BBF7D0" />
              <span style={chipText}>{correctCount}</span>
            </>)}
            {chip('rgba(239,68,68,0.22)', 'rgba(252,165,165,0.5)', <>
              <IconX size={12} color="#FECACA" />
              <span style={chipText}>{wrongCount}</span>
            </>)}
            {showTimer && chip('rgba(255,255,255,0.18)', 'rgba(255,255,255,0.25)', <>
              <span style={{ fontSize: 12 }}>⏱</span>
              <span style={{ ...chipText, fontVariantNumeric: 'tabular-nums' }}>{formatTime(seconds)}</span>
            </>)}
            {chip('rgba(255,255,255,0.15)', 'transparent', <>
              <span style={{ fontSize: 12 }}>📋</span>
              <span style={{ ...chipText, fontVariantNumeric: 'tabular-nums' }}>
                {isFinished ? steps.length : currentStepIdx + 1}/{steps.length}
              </span>
            </>)}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: isMobile ? 12 : 14, height: 7, background: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: isFinished
              ? `linear-gradient(90deg, ${C.green}, #4ADE80)`
              : `linear-gradient(90deg, ${C.amber}, ${C.orange})`,
            width: `${isFinished ? 100 : progressPct}%`,
            transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: progressPct > 0 ? '0 0 10px rgba(255,114,18,0.4)' : 'none',
          }} />
        </div>
      </div>

      {/* ══════════════════ BODY ══════════════════ */}
      <div style={{ padding: `${pad}px ${pad}px ${pad + 4}px`, display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18 }}>

        {/* ─── STEP SCREEN ─── */}
        {!isFinished && (
          <>
            {/* Step badge */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              animation: mounted ? 'spt-fadeInUp 0.4s ease-out both' : 'none',
            }}>
              {steps.map((s, i) => (
                <div key={s.stepId} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{
                    width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: '50%',
                    background: i < currentStepIdx || (i === currentStepIdx && phase === 'locked')
                      ? C.green
                      : i === currentStepIdx ? C.primary : C.bgGrey,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMobile ? 11 : 12, fontWeight: 700, color: i <= currentStepIdx ? C.white : C.grey,
                    fontFamily: "'Poppins', sans-serif",
                    transition: 'all 0.3s ease',
                    boxShadow: i === currentStepIdx ? `0 0 0 3px ${C.lightPurple}` : 'none',
                  }}>
                    {i < currentStepIdx || (i === currentStepIdx && phase === 'locked' && isLastStep && isFinished)
                      ? <IconCheck size={14} color="#fff" />
                      : i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{
                      width: isMobile ? 28 : 36, height: 3, borderRadius: 2,
                      background: i < currentStepIdx ? C.green : C.bgGrey,
                      transition: 'background 0.3s ease',
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* Main card */}
            <div style={{
              background: C.white, borderRadius: 18,
              border: `1.5px solid ${C.bgGrey}`,
              boxShadow: '0 4px 18px rgba(74,77,201,0.07)',
              overflow: 'hidden',
              animation: `${currentStep.animationClass} 0.45s ease-out both`,
            }}>
              {/* Card header */}
              <div style={{
                background: `linear-gradient(120deg, ${C.lightOrange} 0%, #FFFBF5 60%, ${C.lightPurple}44 100%)`,
                padding: isMobile ? '14px 16px' : '18px 22px',
                borderBottom: `1px solid ${C.bgGrey}`,
                display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: isMobile ? 10 : 0,
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: isMobile ? 22 : 26 }}>{currentStep.sceneEmoji}</span>
                    <span style={{
                      fontSize: isMobile ? 14 : 16, fontWeight: 800,
                      color: C.purple, fontFamily: "'Poppins', sans-serif",
                    }}>
                      {currentStep.sceneTitle}
                    </span>
                  </div>
                  <p style={{
                    margin: 0, fontSize: isMobile ? 12 : 13, color: C.dark,
                    fontFamily: "'Poppins', sans-serif", lineHeight: 1.5,
                    paddingLeft: isMobile ? 0 : 36,
                  }}>
                    {currentStep.sceneDesc}
                  </p>
                </div>
                <div style={{
                  flexShrink: 0, background: C.primary, color: C.white,
                  borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700,
                  fontFamily: "'Poppins', sans-serif", letterSpacing: 0.3,
                  whiteSpace: 'nowrap',
                }}>
                  Step {currentStep.stepId} of {steps.length}
                </div>
              </div>

              {/* Card body: scene + options */}
              <div style={{
                display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                gap: 0,
              }}>
                {/* Scene illustration */}
                <div style={{
                  flex: '0 0 auto', width: isMobile ? '100%' : 220,
                  background: 'linear-gradient(160deg, #EEF2FF 0%, #DBEAFE 100%)',
                  borderRight: isMobile ? 'none' : `1px solid ${C.bgGrey}`,
                  borderBottom: isMobile ? `1px solid ${C.bgGrey}` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: isMobile ? '10px 0 4px' : '0 0 8px',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Shimmer overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
                    backgroundSize: '200% 100%',
                    animation: 'spt-shimmer 4s ease-in-out infinite',
                  }} />
                  <GlassScene stepId={currentStep.stepId} isLocked={phase === 'locked'} isMobile={isMobile} />
                </div>

                {/* Question + options */}
                <div style={{
                  flex: 1, padding: isMobile ? '16px' : '22px 24px',
                  display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                  <p style={{
                    margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 700,
                    color: C.purple, fontFamily: "'Poppins', sans-serif", lineHeight: 1.4,
                    animation: 'spt-fadeInUp 0.4s ease-out 0.1s both',
                  }}>
                    {currentStep.questionText}
                  </p>

                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {currentStep.options.map((opt, i) => (
                      <OptionBtn
                        key={opt.id}
                        option={opt}
                        phase={phase}
                        selectedWrongId={selectedWrongId}
                        onPick={handlePick}
                        isMobile={isMobile}
                        animDelay={0.15 + i * 0.1}
                      />
                    ))}
                  </div>

                  {/* Lock reason — correct */}
                  {phase === 'locked' && lockReason && (
                    <div style={{
                      background: C.greenBg, border: `2px solid ${C.greenBorder}`,
                      borderRadius: 12, padding: isMobile ? '10px 14px' : '12px 16px',
                      fontSize: isMobile ? 12 : 13, fontWeight: 500, color: '#166534',
                      fontFamily: "'Poppins', sans-serif", lineHeight: 1.45,
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      animation: 'spt-hintFade 0.35s ease-out both',
                    }}>
                      <span style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>✅</span>
                      <span>{lockReason}</span>
                    </div>
                  )}

                  {/* Hint — wrong */}
                  {phase === 'wrong' && hintText && (
                    <div style={{
                      background: C.amberBg, border: `2px solid ${C.amberBorder}`,
                      borderRadius: 12, padding: isMobile ? '10px 14px' : '12px 16px',
                      fontSize: isMobile ? 12 : 13, fontWeight: 500, color: C.amberText,
                      fontFamily: "'Poppins', sans-serif", lineHeight: 1.45,
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      animation: 'spt-hintFade 0.35s ease-out both',
                    }}>
                      <span style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>💡</span>
                      <span>{hintText}</span>
                    </div>
                  )}

                  {/* Next button */}
                  {phase === 'locked' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                      <button
                        onClick={handleNext}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: isMobile ? '10px 20px' : '11px 24px',
                          borderRadius: 999, border: 'none', cursor: 'pointer',
                          fontFamily: "'Poppins', sans-serif",
                          fontSize: isMobile ? 13 : 14, fontWeight: 700, color: C.white,
                          background: `linear-gradient(135deg, ${C.primary}, ${C.purple})`,
                          boxShadow: '0 4px 14px rgba(74,77,201,0.28)',
                          transition: 'all 0.22s ease',
                          animation: 'spt-fadeInUp 0.4s ease-out 0.2s both',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(74,77,201,0.36)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(74,77,201,0.28)';
                        }}
                      >
                        {isLastStep ? '🎉 Finish' : 'Next'}
                        {!isLastStep && <IconArrow size={15} color="#fff" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════ FINISH CARD ══════════════════ */}
        {isFinished && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 16 : 20, padding: '4px 0' }}>

            {/* Trophy */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16,
              background: `linear-gradient(135deg, ${C.lightOrange}, #FFF9F0)`,
              padding: isMobile ? '18px 20px' : '22px 30px',
              borderRadius: 18, border: `2px solid ${C.amber}`,
              boxShadow: '0 8px 28px rgba(255,114,18,0.14)',
              animation: 'spt-popIn 0.5s ease-out 0.15s both',
              flexDirection: isMobile ? 'column' : 'row',
              textAlign: isMobile ? 'center' : 'left', maxWidth: '100%',
            }}>
              <span style={{ fontSize: isMobile ? 38 : 48, animation: 'spt-starSpin 1s ease-out 0.5s both', display: 'block' }}>🏆</span>
              <div>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#92400E', fontFamily: "'Poppins', sans-serif" }}>
                  Experiment Complete!
                </div>
                <div style={{ fontSize: isMobile ? 12 : 13, color: '#B45309', fontWeight: 500, fontFamily: "'Poppins', sans-serif", marginTop: 3 }}>
                  {wrongCount === 0
                    ? '🎯 Perfect predictions — zero wrong!'
                    : `Accuracy: ${accuracy}% · ${wrongCount} wrong attempt${wrongCount !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: showTimer ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gap: isMobile ? 8 : 12, width: '100%', maxWidth: 460,
              animation: 'spt-fadeInUp 0.5s ease-out 0.35s both',
            }}>
              {[
                { label: 'Correct', value: correctCount, emoji: '✅', bg: C.greenBg, color: '#166534', border: C.greenBorder },
                { label: 'Wrong', value: wrongCount, emoji: '❌', bg: C.redBg, color: C.redText, border: C.redBorder },
                ...(showTimer ? [{ label: 'Time', value: formatTime(seconds), emoji: '⏱️', bg: '#EEF2FF', color: C.primary, border: '#C7D2FE' }] : []),
              ].map(card => (
                <div key={card.label} style={{
                  background: card.bg, border: `1.5px solid ${card.border}`, borderRadius: 12,
                  padding: isMobile ? '10px 8px' : '12px 10px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                  <span style={{ fontSize: isMobile ? 16 : 18 }}>{card.emoji}</span>
                  <span style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: card.color, fontFamily: "'Poppins', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                    {card.value}
                  </span>
                  <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 600, color: card.color, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'Poppins', sans-serif" }}>
                    {card.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Finish message box */}
            <div style={{
              width: '100%', maxWidth: 640,
              background: C.white, borderRadius: 18,
              border: `2px solid ${C.lightPurple}`,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(74,77,201,0.09)',
              animation: 'spt-fadeInUp 0.55s ease-out 0.55s both',
            }}>
              {/* Finish card header */}
              <div style={{
                background: `linear-gradient(135deg, ${C.purple}, ${C.primary})`,
                padding: isMobile ? '13px 16px' : '15px 22px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 22 }}>🍬</span>
                <span style={{
                  fontSize: isMobile ? 14 : 16, fontWeight: 800, color: C.white,
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  {finishTitle}
                </span>
              </div>

              {/* Finish card body */}
              <div style={{ padding: isMobile ? '14px 16px' : '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{
                  margin: 0, fontSize: isMobile ? 13 : 14, color: C.dark,
                  fontFamily: "'Poppins', sans-serif", lineHeight: 1.6,
                }}>
                  {finishBody}
                </p>

                {/* Key concept pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { emoji: '🫧', text: 'Sugar particles disperse' },
                    { emoji: '👁️', text: 'Invisible but present' },
                    { emoji: '👅', text: 'Sweetness remains' },
                    { emoji: '♾️', text: 'Nothing is destroyed' },
                  ].map(pill => (
                    <div key={pill.text} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: C.lightOrange, border: `1.5px solid ${C.amber}`,
                      borderRadius: 999, padding: '5px 12px',
                      fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#92400E',
                      fontFamily: "'Poppins', sans-serif",
                      animation: 'spt-popIn 0.4s ease-out both',
                    }}>
                      <span>{pill.emoji}</span>
                      {pill.text}
                    </div>
                  ))}
                </div>

                {/* Takeaway */}
                <div style={{
                  background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                  border: `1.5px solid ${C.lightPurple}`,
                  borderRadius: 12, padding: isMobile ? '11px 14px' : '13px 18px',
                }}>
                  <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: C.purple, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📚</span> Remember
                  </div>
                  <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, color: C.dark, lineHeight: 1.55, fontFamily: "'Poppins', sans-serif" }}>
                    <strong>Soluble</strong> materials dissolve in water — they disappear from sight but remain present.&nbsp;
                    <strong>Insoluble</strong> materials (like sand) do not mix and stay visible. Dissolving is a <em>physical change</em>.
                  </p>
                </div>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: isMobile ? '10px 22px' : '11px 26px', borderRadius: 999,
                border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 13 : 14, fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                background: `linear-gradient(135deg, ${C.primary}, ${C.purple})`,
                color: C.white, boxShadow: '0 4px 14px rgba(74,77,201,0.25)',
                transition: 'all 0.22s ease',
                animation: 'spt-fadeInUp 0.4s ease-out 1s both',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(74,77,201,0.34)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(74,77,201,0.25)';
              }}
            >
              <IconRotate size={15} color="#fff" /> Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SugarPredictionTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════