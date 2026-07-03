import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, RotateCcw, Star, Award, Trophy, Zap, Fish } from 'lucide-react';

// ═══════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════
interface Pair {
  id: number;
  method: string;
  description: string;
  hint: string;
  emoji: string;
  color: string;
}

interface MatchAttempt {
  fishId: number;
  slipId: number;
  correct: boolean;
  ts: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface FishingMatcherAdditionalProps {
  pairs?: Pair[];
  showHints?: boolean;
  celebrationEffect?: 'confetti' | 'stars' | 'both';
}

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
}

interface FishingMatcherProps {
  props?: {
    width?: number;
    height?: number;
    initialMode?: string;
    showModeSelector?: boolean;
    enabledModes?: string[];
    showNavigation?: boolean;
    showPlayPause?: boolean;
    showStepIndicator?: boolean;
    initialStep?: number;
    filterSteps?: number[];
    animationSpeed?: number;
    autoPlayDuration?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: FishingMatcherAdditionalProps;
  };
  setStepDetails?: (stepDetails: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ═══════════════════════════════════════════
// THEME COLORS (Singularity palette)
// ═══════════════════════════════════════════
const C = {
  blue: '#4A4DC9',
  orange: '#FF7212',
  gradA: '#533086',
  gradB: '#FC9145',
  dark: '#4E4E4E',
  mid: '#CACACA',
  light: '#EBEBEB',
  lightest: '#F5F5F5',
  purple: '#C1C1EA',
  cream: '#FFF3E4',
  white: '#FFFFFF',
  green: '#22c55e',
  red: '#ef4444',
  waterDark: '#0d2b4e',
  waterMid: '#0f3d6e',
  waterLight: '#1a5fa0',
  waterShimmer: '#3b82c4',
};

// ═══════════════════════════════════════════
// DEFAULT PAIRS DATA
// ═══════════════════════════════════════════
const DEFAULT_PAIRS: Pair[] = [
  { id: 1, method: 'Handpicking', description: 'Larger particles picked by hand based on size, colour & shape', hint: 'Think of picking stones from rice!', emoji: '👋', color: '#e74c3c' },
  { id: 2, method: 'Threshing', description: 'Beating stalks on a log to separate grains from them', hint: 'Farmers beat wheat stalks on a wooden log!', emoji: '🌾', color: '#e67e22' },
  { id: 3, method: 'Winnowing', description: 'Lighter husk blown away from heavier grains by wind or air', hint: 'Use a bamboo soop (tray) in the direction of wind!', emoji: '💨', color: '#f39c12' },
  { id: 4, method: 'Sieving', description: 'Separating solids based on difference in size of particles', hint: 'Flour passes through holes; bran stays on sieve!', emoji: '🪣', color: '#27ae60' },
  { id: 5, method: 'Evaporation', description: 'Liquid converts to vapour — used to get salt from seawater', hint: 'Salt flats use sunlight to evaporate seawater!', emoji: '☀️', color: '#16a085' },
  { id: 6, method: 'Sedimentation', description: 'Heavier insoluble component settles at the bottom of liquid', hint: 'Tea leaves settle at the bottom of your cup!', emoji: '⬇️', color: '#2980b9' },
  { id: 7, method: 'Decantation', description: 'Liquid removed by gently tilting vessel — separates oil & water', hint: 'Tilt the vessel to pour off the clear water!', emoji: '🫗', color: '#8e44ad' },
  { id: 8, method: 'Filtration', description: 'Insoluble solids filtered as residue using filter paper or cloth', hint: 'A tea strainer filters out tea leaves!', emoji: '🔽', color: '#c0392b' },
  { id: 9, method: 'Churning', description: 'Used to extract butter from curd using a churner (mathni)', hint: 'Buttermilk is the liquid left after churning!', emoji: '🧈', color: '#d35400' },
  { id: 10, method: 'Magnetic Separation', description: 'Uses a magnet to separate magnetic from non-magnetic substances', hint: 'Iron nails stick to a magnet, sawdust does not!', emoji: '🧲', color: '#1abc9c' },
  { id: 11, method: 'Condensation', description: 'Conversion of water vapour into its liquid state', hint: 'Water droplets on a cold glass on a hot day!', emoji: '💧', color: '#3498db' },
];

// ═══════════════════════════════════════════
// EASING FUNCTIONS
// ═══════════════════════════════════════════
const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};
const easeOutBounce = (t: number): number => {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

// ═══════════════════════════════════════════
// KEYFRAME INJECTION
// ═══════════════════════════════════════════
const injectKeyframes = () => {
  if (document.getElementById('fishing-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'fishing-keyframes';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

    @keyframes waterFlow {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes bubble {
      0% { transform: translateY(0) scale(1); opacity: 0.7; }
      100% { transform: translateY(-120px) scale(1.4); opacity: 0; }
    }
    @keyframes fishSwim {
      0%, 100% { transform: translateY(0px) rotate(-2deg); }
      50% { transform: translateY(-6px) rotate(2deg); }
    }
    @keyframes fishWiggle {
      0%, 100% { transform: scaleX(1) rotate(0deg); }
      25% { transform: scaleX(1.05) rotate(-3deg); }
      75% { transform: scaleX(0.95) rotate(3deg); }
    }
    @keyframes correctPulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
      50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(34,197,94,0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,197,94,0); }
    }
    @keyframes wrongShake {
      0%, 100% { transform: translateX(0) rotate(0deg); }
      15% { transform: translateX(-12px) rotate(-5deg); }
      30% { transform: translateX(12px) rotate(5deg); }
      45% { transform: translateX(-8px) rotate(-3deg); }
      60% { transform: translateX(8px) rotate(3deg); }
      75% { transform: translateX(-4px) rotate(-1deg); }
      90% { transform: translateX(4px) rotate(1deg); }
    }
    @keyframes hookDrop {
      0% { transform: translateY(-60px); opacity: 0; }
      60% { transform: translateY(6px); opacity: 1; }
      80% { transform: translateY(-3px); }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes selectedGlow {
      0%, 100% { box-shadow: 0 0 12px 4px rgba(74,77,201,0.5); }
      50% { box-shadow: 0 0 24px 8px rgba(255,114,18,0.7); }
    }
    @keyframes confettiFall {
      0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translateY(200px) rotate(720deg) scale(0); opacity: 0; }
    }
    @keyframes starBurst {
      0% { transform: scale(0) rotate(0deg); opacity: 1; }
      60% { transform: scale(1.5) rotate(180deg); opacity: 1; }
      100% { transform: scale(0) rotate(360deg); opacity: 0; }
    }
    @keyframes scorePopIn {
      0% { transform: scale(0) translateY(-20px); opacity: 0; }
      60% { transform: scale(1.2) translateY(-5px); opacity: 1; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes hintSlideIn {
      0% { transform: translateY(-10px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes rodSway {
      0%, 100% { transform: rotate(-5deg); }
      50% { transform: rotate(5deg); }
    }
    @keyframes waveAnim {
      0% { d: path('M0,40 Q200,20 400,40 Q600,60 800,40 L800,80 L0,80 Z'); }
      50% { d: path('M0,40 Q200,60 400,40 Q600,20 800,40 L800,80 L0,80 Z'); }
      100% { d: path('M0,40 Q200,20 400,40 Q600,60 800,40 L800,80 L0,80 Z'); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes shimmer {
      0% { opacity: 0.3; }
      50% { opacity: 0.7; }
      100% { opacity: 0.3; }
    }
    @keyframes progressFill {
      0% { width: 0%; }
      100% { width: var(--progress-width); }
    }
    @keyframes trophy-appear {
      0% { transform: scale(0) rotate(-20deg); opacity: 0; }
      50% { transform: scale(1.3) rotate(10deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes celebrate-bg {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes ripple {
      0% { transform: scale(0); opacity: 1; }
      100% { transform: scale(4); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
};

// ═══════════════════════════════════════════
// BUBBLE COMPONENT
// ═══════════════════════════════════════════
const Bubble: React.FC<{ x: number; delay: number; size: number }> = ({ x, delay, size }) => (
  <div style={{
    position: 'absolute',
    left: `${x}%`,
    bottom: '0',
    width: size,
    height: size,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    border: '1px solid rgba(255,255,255,0.4)',
    animation: `bubble ${2 + Math.random() * 2}s ${delay}s infinite ease-in`,
    pointerEvents: 'none',
  }} />
);

// ═══════════════════════════════════════════
// CONFETTI PARTICLE
// ═══════════════════════════════════════════
const ConfettiParticle: React.FC<{ x: number; y: number; color: string; delay: number }> = ({ x, y, color, delay }) => (
  <div style={{
    position: 'fixed',
    left: x,
    top: y,
    width: 10,
    height: 10,
    background: color,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    animation: `confettiFall ${1.5 + Math.random()}s ${delay}s ease-in forwards`,
    pointerEvents: 'none',
    zIndex: 9999,
    transform: `rotate(${Math.random() * 360}deg)`,
  }} />
);

// ═══════════════════════════════════════════
// FISH SVG COMPONENT
// ═══════════════════════════════════════════
const FishSVG: React.FC<{ color: string; size?: number; flipped?: boolean }> = ({ color, size = 60, flipped = false }) => (
  <svg width={size} height={size * 0.6} viewBox="0 0 100 60" style={{ transform: flipped ? 'scaleX(-1)' : 'none' }}>
    <defs>
      <linearGradient id={`fg-${color.replace('#','')}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="1" />
        <stop offset="100%" stopColor={color} stopOpacity="0.7" />
      </linearGradient>
    </defs>
    {/* Body */}
    <ellipse cx="50" cy="30" rx="35" ry="20" fill={`url(#fg-${color.replace('#','')})`} />
    {/* Tail */}
    <polygon points="15,10 0,30 15,50" fill={color} opacity="0.8" />
    {/* Fin top */}
    <path d="M40,12 Q55,2 65,14" stroke={color} strokeWidth="3" fill="none" opacity="0.6" />
    {/* Fin bottom */}
    <path d="M40,48 Q55,58 65,46" stroke={color} strokeWidth="3" fill="none" opacity="0.6" />
    {/* Eye */}
    <circle cx="75" cy="28" r="5" fill="white" />
    <circle cx="76" cy="28" r="3" fill="#1a1a2e" />
    <circle cx="77" cy="26" r="1" fill="white" />
    {/* Scales */}
    <path d="M55,24 Q60,20 65,24" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
    <path d="M45,22 Q50,18 55,22" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
    <path d="M55,34 Q60,38 65,34" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
  </svg>
);

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
const FishingRodMatcher: React.FC<FishingMatcherProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const {
    additionalProps = {},
    themeColor = C.blue,
    animationSpeed = 1,
  } = props;

  const pairs: Pair[] = additionalProps.pairs || DEFAULT_PAIRS;
  const showHints = additionalProps.showHints !== false;

  // ── STATE ──
  const [selectedFish, setSelectedFish] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
  const [wrongAnimId, setWrongAnimId] = useState<number | null>(null);
  const [correctAnimId, setCorrectAnimId] = useState<number | null>(null);
  const [hintId, setHintId] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [confetti, setConfetti] = useState<{ x: number; y: number; color: string; id: number }[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [showRipple, setShowRipple] = useState<{ x: number; y: number } | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [recentHint, setRecentHint] = useState<string>('');
  const [shuffledSlips, setShuffledSlips] = useState<Pair[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const confettiId = useRef(0);

  // Shuffle slips once
  useEffect(() => {
    const shuffled = [...pairs].sort(() => Math.random() - 0.5);
    setShuffledSlips(shuffled);
  }, []);

  useEffect(() => { injectKeyframes(); }, []);

  // Notify parent of progress
  useEffect(() => {
    setStepDetails?.({
      currentStep: matchedPairs.size,
      totalSteps: pairs.length,
      isComplete: matchedPairs.size === pairs.length,
    });
    if (matchedPairs.size === pairs.length && pairs.length > 0) {
      setTimeout(() => setGameComplete(true), 600);
    }
  }, [matchedPairs]);

  // ── HANDLERS ──
  const handleFishClick = useCallback((id: number, e: React.MouseEvent) => {
    if (matchedPairs.has(id)) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setShowRipple({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setTimeout(() => setShowRipple(null), 700);
    setSelectedFish(prev => prev === id ? null : id);
    setHintId(null);
  }, [matchedPairs]);

  const handleSlipClick = useCallback((id: number, e: React.MouseEvent) => {
    if (!selectedFish) return;
    if (matchedPairs.has(id)) return;
    setAttempts(prev => prev + 1);

    if (selectedFish === id) {
      // ✅ CORRECT
      setMatchedPairs(prev => new Set([...prev, id]));
      setCorrectAnimId(id);
      spawnConfetti(e.clientX, e.clientY);
      setSelectedFish(null);
      setHintId(null);
      setTimeout(() => setCorrectAnimId(null), 1200);
    } else {
      // ❌ WRONG
      setWrongAnimId(selectedFish);
      setWrongFlash(true);
      const wrongPair = pairs.find(p => p.id === selectedFish);
      if (wrongPair && showHints) setRecentHint(wrongPair.hint);
      setTimeout(() => {
        setWrongAnimId(null);
        setWrongFlash(false);
        setSelectedFish(null);
        if (showHints && wrongPair) {
          setHintId(selectedFish);
          setTimeout(() => setHintId(null), 3500);
        }
      }, 800);
    }
  }, [selectedFish, matchedPairs, pairs, showHints]);

  const spawnConfetti = (x: number, y: number) => {
    const colors = [C.blue, C.orange, C.gradA, C.gradB, C.purple, C.green, '#fbbf24', '#ec4899'];
    const newConfetti = Array.from({ length: 30 }, (_, i) => ({
      x: x + (Math.random() - 0.5) * 200,
      y: y - Math.random() * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      id: ++confettiId.current,
    }));
    setConfetti(prev => [...prev, ...newConfetti]);
    setTimeout(() => setConfetti(prev => prev.filter(c => !newConfetti.find(n => n.id === c.id))), 3000);
  };

  const resetGame = () => {
    setSelectedFish(null);
    setMatchedPairs(new Set());
    setWrongAnimId(null);
    setCorrectAnimId(null);
    setHintId(null);
    setAttempts(0);
    setConfetti([]);
    setGameComplete(false);
    setRecentHint('');
    const shuffled = [...pairs].sort(() => Math.random() - 0.5);
    setShuffledSlips(shuffled);
  };

  const progress = pairs.length ? (matchedPairs.size / pairs.length) * 100 : 0;

  // ── RENDER ──
  return (
    <div ref={containerRef} style={{
      width: '100vw',
      height: '100vh',
      minHeight: 600,
      fontFamily: "'Poppins', sans-serif",
      background: `linear-gradient(160deg, ${C.waterDark} 0%, ${C.waterMid} 40%, ${C.waterLight} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── ANIMATED WATER BACKGROUND ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Shimmer lines */}
        {[10, 25, 40, 55, 70, 85].map((y, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${y}%`,
            left: '-10%',
            width: '120%',
            height: 1,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 999,
            animation: `shimmer ${2 + i * 0.5}s ${i * 0.3}s infinite`,
          }} />
        ))}
        {/* Bubbles */}
        {[5, 15, 28, 42, 57, 68, 80, 92].map((x, i) => (
          <Bubble key={i} x={x} delay={i * 0.8} size={6 + (i % 3) * 4} />
        ))}
      </div>

      {/* ── CONFETTI ── */}
      {confetti.map((c, i) => (
        <ConfettiParticle key={c.id} x={c.x} y={c.y} color={c.color} delay={i * 0.03} />
      ))}

      {/* ── RIPPLE ── */}
      {showRipple && (
        <div style={{
          position: 'fixed',
          left: showRipple.x - 20,
          top: showRipple.y - 20,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: `3px solid ${C.orange}`,
          animation: 'ripple 0.7s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 9998,
        }} />
      )}

      {/* ── HEADER ── */}
      <div style={{
        padding: '12px 20px 8px',
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `linear-gradient(135deg, ${C.gradA}, ${C.gradB})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>🎣</div>
          <div>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
              WISE FISH
            </div>
            <div style={{ color: C.purple, fontSize: 11, fontWeight: 500 }}>
              Methods of Separation · Grade 6
            </div>
          </div>
        </div>

        {/* Score + Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>
              {matchedPairs.size}/{pairs.length} Pairs
            </div>
            <div style={{ width: 120, height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99 }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${C.gradA}, ${C.gradB})`,
                borderRadius: 99,
                transition: 'width 0.5s ease',
                boxShadow: '0 0 8px rgba(252,145,69,0.5)',
              }} />
            </div>
          </div>

          {/* Attempts */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10, padding: '4px 10px', textAlign: 'center',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Attempts</div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 16, lineHeight: 1 }}>{attempts}</div>
          </div>

          {/* Reset */}
          <button onClick={resetGame} style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10, padding: '8px 10px', color: C.white, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
            fontFamily: "'Poppins', sans-serif",
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* ── INSTRUCTION BANNER ── */}
      <div style={{
        padding: '7px 20px',
        background: wrongFlash
          ? 'rgba(239,68,68,0.25)'
          : 'rgba(74,77,201,0.2)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'background 0.3s',
        flexShrink: 0,
      }}>
        {wrongFlash ? (
          <>
            <X size={14} color={C.red} />
            <span style={{ color: '#fca5a5', fontSize: 12, fontWeight: 600 }}>
              Not quite! {recentHint}
            </span>
          </>
        ) : selectedFish ? (
          <>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: C.orange, animation: 'shimmer 1s infinite',
            }} />
            <span style={{ color: C.cream, fontSize: 12, fontWeight: 600 }}>
              🎣 {pairs.find(p => p.id === selectedFish)?.method} hooked! Now click the matching blue description →
            </span>
          </>
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            🐟 Click a <span style={{ color: '#ff6b6b', fontWeight: 700 }}>red fish</span> (method) then click the matching <span style={{ color: C.purple, fontWeight: 700 }}>blue slip</span> (description)
          </span>
        )}
      </div>

      {/* ── MAIN TANKS ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 0,
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* DIVIDER FISHING ROD */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 4,
            height: '100%',
            background: 'rgba(255,255,255,0.08)',
            position: 'absolute',
            top: 0,
          }} />
          {selectedFish && (
            <div style={{
              animation: 'hookDrop 0.5s ease-out',
              marginTop: 20,
              fontSize: 28,
              filter: 'drop-shadow(0 4px 8px rgba(252,145,69,0.7))',
            }}>🪝</div>
          )}
        </div>

        {/* ══ TANK 1: RED FISH (Methods) ══ */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 14px',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          {/* Tank header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🐠</div>
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>TANK 1 — Methods</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Click to select a fish</div>
            </div>
          </div>

          {/* Fish list */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
            paddingRight: 4,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.15) transparent',
          }}>
            {pairs.map(pair => {
              const isMatched = matchedPairs.has(pair.id);
              const isSelected = selectedFish === pair.id;
              const isWrong = wrongAnimId === pair.id;
              const isCorrect = correctAnimId === pair.id;
              const showHintNow = hintId === pair.id;

              return (
                <div key={pair.id} style={{ position: 'relative' }}>
                  <div
                    onClick={(e) => handleFishClick(pair.id, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 14,
                      cursor: isMatched ? 'default' : 'pointer',
                      userSelect: 'none',
                      transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                      background: isMatched
                        ? 'rgba(34,197,94,0.18)'
                        : isSelected
                        ? `rgba(74,77,201,0.35)`
                        : 'rgba(255,255,255,0.07)',
                      border: isMatched
                        ? '1.5px solid rgba(34,197,94,0.5)'
                        : isSelected
                        ? `1.5px solid ${C.orange}`
                        : '1.5px solid rgba(255,255,255,0.1)',
                      animation: isWrong ? 'wrongShake 0.7s ease' : isCorrect ? 'correctPulse 0.8s ease' : isSelected ? 'selectedGlow 2s infinite' : 'none',
                      boxShadow: isSelected
                        ? `0 0 20px rgba(255,114,18,0.4), 0 4px 12px rgba(0,0,0,0.2)`
                        : isMatched
                        ? '0 0 12px rgba(34,197,94,0.2)'
                        : '0 2px 8px rgba(0,0,0,0.15)',
                      opacity: isMatched ? 0.65 : 1,
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    {/* Fish emoji / icon */}
                    <div style={{
                      fontSize: 22,
                      animation: isMatched ? 'none' : isSelected ? 'fishWiggle 0.5s infinite' : 'fishSwim 3s infinite',
                      filter: isMatched ? 'grayscale(0.3)' : 'none',
                    }}>
                      {isMatched ? '✅' : pair.emoji}
                    </div>

                    {/* Method name */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: isMatched ? C.green : C.white,
                        fontWeight: 700,
                        fontSize: 13,
                        lineHeight: 1.2,
                      }}>
                        {pair.method}
                      </div>
                      {isMatched && (
                        <div style={{ color: 'rgba(34,197,94,0.7)', fontSize: 10, fontWeight: 500 }}>
                          Matched!
                        </div>
                      )}
                    </div>

                    {/* State badge */}
                    {isSelected && (
                      <div style={{
                        background: `linear-gradient(135deg, ${C.gradA}, ${C.gradB})`,
                        borderRadius: 8, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: C.white,
                        animation: 'hookDrop 0.3s ease',
                      }}>HOOKED</div>
                    )}
                    {isMatched && (
                      <div style={{
                        background: 'rgba(34,197,94,0.2)',
                        borderRadius: 8, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: C.green,
                        border: '1px solid rgba(34,197,94,0.3)',
                      }}>✓ DONE</div>
                    )}
                  </div>

                  {/* Hint */}
                  {showHintNow && (
                    <div style={{
                      marginTop: 4,
                      padding: '6px 10px',
                      background: `rgba(255,114,18,0.15)`,
                      border: `1px solid rgba(255,114,18,0.3)`,
                      borderRadius: 10,
                      fontSize: 11,
                      color: C.cream,
                      animation: 'hintSlideIn 0.3s ease',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <Zap size={12} color={C.orange} /> {pair.hint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ TANK 2: BLUE SLIPS (Descriptions) ══ */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 14px',
          overflow: 'hidden',
        }}>
          {/* Tank header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `linear-gradient(135deg, ${C.gradA}, ${C.blue})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>📋</div>
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>TANK 2 — Descriptions</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                {selectedFish ? '← Click a slip to match!' : 'Select a fish first'}
              </div>
            </div>
          </div>

          {/* Slips list */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
            paddingRight: 4,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.15) transparent',
          }}>
            {shuffledSlips.map(pair => {
              const isMatched = matchedPairs.has(pair.id);
              const isCorrectSlip = correctAnimId === pair.id;
              const isFocused = !!selectedFish && !isMatched;

              return (
                <div
                  key={pair.id}
                  onClick={(e) => handleSlipClick(pair.id, e)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 14,
                    cursor: isMatched ? 'default' : isFocused ? 'pointer' : 'default',
                    userSelect: 'none',
                    transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    background: isMatched
                      ? 'rgba(34,197,94,0.15)'
                      : isFocused
                      ? `rgba(193,193,234,0.15)`
                      : 'rgba(255,255,255,0.06)',
                    border: isMatched
                      ? '1.5px solid rgba(34,197,94,0.4)'
                      : isFocused
                      ? `1.5px solid ${C.purple}`
                      : '1.5px solid rgba(255,255,255,0.08)',
                    animation: isCorrectSlip ? 'correctPulse 0.8s ease' : 'none',
                    boxShadow: isFocused && !isMatched
                      ? `0 0 16px rgba(193,193,234,0.3), 0 4px 12px rgba(0,0,0,0.2)`
                      : isMatched
                      ? '0 0 10px rgba(34,197,94,0.15)'
                      : '0 2px 8px rgba(0,0,0,0.12)',
                    opacity: isMatched ? 0.65 : 1,
                    transform: isFocused && !isMatched ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  {/* Left accent */}
                  <div style={{
                    width: 4,
                    alignSelf: 'stretch',
                    minHeight: 32,
                    borderRadius: 99,
                    background: isMatched
                      ? C.green
                      : isFocused
                      ? `linear-gradient(${C.gradA}, ${C.blue})`
                      : 'rgba(193,193,234,0.3)',
                    flexShrink: 0,
                  }} />

                  {/* Description text */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: isMatched ? 'rgba(34,197,94,0.9)' : isFocused ? C.purple : 'rgba(255,255,255,0.7)',
                      fontSize: 12,
                      fontWeight: 500,
                      lineHeight: 1.4,
                      transition: 'color 0.2s',
                    }}>
                      {pair.description}
                    </div>
                    {isMatched && (
                      <div style={{ marginTop: 3, color: 'rgba(34,197,94,0.6)', fontSize: 10, fontWeight: 600 }}>
                        ✓ {pair.method}
                      </div>
                    )}
                  </div>

                  {/* State icon */}
                  <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                    {isMatched ? (
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(34,197,94,0.2)',
                        border: '2px solid rgba(34,197,94,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={12} color={C.green} />
                      </div>
                    ) : isFocused ? (
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: `rgba(193,193,234,0.2)`,
                        border: `2px solid ${C.purple}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'shimmer 1.5s infinite',
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.purple }} />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MATCHED PAIRS STRIP ── */}
      {matchedPairs.size > 0 && !gameComplete && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.2)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          overflowX: 'auto',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: 1 }}>
            Caught:
          </div>
          {pairs.filter(p => matchedPairs.has(p.id)).map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 20, padding: '3px 10px',
              animation: 'scorePopIn 0.4s ease',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 12 }}>{p.emoji}</span>
              <span style={{ color: C.green, fontSize: 11, fontWeight: 600 }}>{p.method}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── GAME COMPLETE OVERLAY ── */}
      {gameComplete && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5,20,40,0.92)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20,
        }}>
          <div style={{
            background: `linear-gradient(135deg, rgba(83,48,134,0.9), rgba(74,77,201,0.9))`,
            borderRadius: 28,
            padding: '36px 40px',
            textAlign: 'center',
            maxWidth: 480,
            width: '100%',
            border: '1px solid rgba(252,145,69,0.3)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(252,145,69,0.15)',
          }}>
            <div style={{ fontSize: 64, animation: 'trophy-appear 0.8s ease', marginBottom: 12 }}>🏆</div>
            <div style={{
              color: C.white, fontWeight: 900, fontSize: 28, marginBottom: 6,
              background: `linear-gradient(135deg, ${C.white}, ${C.cream})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              All Pairs Caught!
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              You matched all <strong style={{ color: C.orange }}>{pairs.length} methods</strong> of separation in{' '}
              <strong style={{ color: C.purple }}>{attempts} attempts</strong>!
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
              {[
                { label: 'Correct', value: pairs.length, color: C.green, icon: '✅' },
                { label: 'Attempts', value: attempts, color: C.orange, icon: '🎣' },
                { label: 'Accuracy', value: `${Math.round((pairs.length / Math.max(attempts, 1)) * 100)}%`, color: C.purple, icon: '🎯' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: '10px 8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ color: s.color, fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <button
              onClick={resetGame}
              style={{
                background: `linear-gradient(135deg, ${C.gradA}, ${C.gradB})`,
                border: 'none',
                borderRadius: 14,
                padding: '14px 32px',
                color: C.white,
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 8px 24px rgba(252,145,69,0.4)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FishingRodMatcher;
