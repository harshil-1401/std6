// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: lustre_two_bin_sorter.tsx
// Chapter 6 — Materials Around Us | Section 6.3.1 Lustrous vs Non-lustrous
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';

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
  type: 'intro' | 'explanation' | 'practice' | 'real_world' | 'hands_on';
  mode: ModeType;
  data?: any;
}

interface BaseDataInterface {
  themeColor?: string;
  autoPlayDuration?: number;
}

interface ObjectTile {
  id: string;
  name: string;
  emoji: string;
  category: 'lustrous' | 'nonlustrous';
  reason: string;   // shown on correct drop
  hint: string;     // shown on wrong drop
}

interface SorterAdditionalProps {
  objects?: ObjectTile[];
  lustrousBinLabel?: string;
  nonlustrousBinLabel?: string;
  showHints?: boolean;
  shuffleSeed?: number;
  enableTimer?: boolean;
}

interface LustreTwoBinSorterProps {
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
    additionalProps?: SorterAdditionalProps;
  };
  setStepDetails?: (stepDetails: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== INLINE SVG ICONS ====================

const IconCheck: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconRotate: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#6B7280' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const IconClock: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// ==================== DEFAULT DATA (12 OBJECTS) ====================

const DEFAULT_OBJECTS: ObjectTile[] = [
  // LUSTROUS (6)
  {
    id: 'o1', name: 'Freshly Cut Iron', emoji: '🔩', category: 'lustrous',
    reason: 'A freshly cut metal surface shines brightly — that is lustre.',
    hint: 'Look at the freshly cut surface, not the old rusted side!',
  },
  {
    id: 'o2', name: 'Polished Silver Bangle', emoji: '💍', category: 'lustrous',
    reason: 'Polished silver has a bright, mirror-like shine — classic lustre.',
    hint: 'Polished metals like silver, gold, copper are lustrous.',
  },
  {
    id: 'o3', name: 'New Steel Spoon', emoji: '🥄', category: 'lustrous',
    reason: 'New steel reflects light — shiny means lustrous.',
    hint: 'A new steel utensil shines brightly when light falls on it.',
  },
  {
    id: 'o4', name: 'Glass Marble', emoji: '🔮', category: 'lustrous',
    reason: 'Smooth polished glass reflects light and shines — lustrous, though it is not a metal.',
    hint: 'Not everything lustrous is a metal! Smooth glass shines too.',
  },
  {
    id: 'o5', name: 'Old Aluminium Pan', emoji: '🍳', category: 'lustrous',
    reason: 'Aluminium keeps its shine fairly well — its surface still reflects light.',
    hint: 'Aluminium does not tarnish much. Its surface still shines.',
  },
  {
    id: 'o6', name: 'Plastic Comb (Glossy)', emoji: '🪮', category: 'lustrous',
    reason: 'A glossy plastic surface can reflect light and look shiny — lustrous (coating, not a metal).',
    hint: '"All that glitters is not gold." Glossy plastic shines too.',
  },

  // NON-LUSTROUS (6)
  {
    id: 'o7', name: 'Tarnished Copper Vessel', emoji: '🫖', category: 'nonlustrous',
    reason: 'Air and moisture made the copper dull — the surface looks non-lustrous now.',
    hint: 'Tarnish hides the shine! Old copper turns dull — non-lustrous now.',
  },
  {
    id: 'o8', name: 'Raw Wooden Block', emoji: '🪵', category: 'nonlustrous',
    reason: 'Wood has a rough, dull surface — non-lustrous.',
    hint: 'Wood, paper, jute — all have dull surfaces.',
  },
  {
    id: 'o9', name: 'Chalk Stick', emoji: '⚪', category: 'nonlustrous',
    reason: 'Chalk has a powdery, dull surface — non-lustrous.',
    hint: 'Chalk crumbles and has no shine at all.',
  },
  {
    id: 'o10', name: 'Rubber Eraser', emoji: '🧽', category: 'nonlustrous',
    reason: 'Rubber has a soft, dull, matte surface — non-lustrous.',
    hint: 'Rubber is matte, never shiny.',
  },
  {
    id: 'o11', name: 'Leaf', emoji: '🍃', category: 'nonlustrous',
    reason: 'A leaf has a soft, dull surface — non-lustrous.',
    hint: 'Natural surfaces like leaves are dull, not shiny like metals.',
  },
  {
    id: 'o12', name: 'Coal Lump', emoji: '⬛', category: 'nonlustrous',
    reason: 'Coal is black, rough and dull — clearly non-lustrous.',
    hint: 'Coal is a famous non-lustrous example from your textbook.',
  },
];

// ==================== HELPERS ====================

function shuffleArray<T>(arr: T[], seed?: number): T[] {
  const a = [...arr];
  let s = seed ?? Date.now();
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const formatTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ==================== COLORS (Singularity Design System) ====================

const C = {
  // Primary palette from design PDF
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
  // Feedback
  green: '#22C55E',
  greenBg: '#DCFCE7',
  greenBorder: '#86EFAC',
  red: '#EF4444',
  redBg: '#FEE2E2',
  redBorder: '#FCA5A5',
  // Bin theming — Lustrous = warm purple/orange gradient (shiny feel)
  // Non-lustrous = neutral grey (dull feel)
  lustrousLight: '#FFF3E4',
  lustrousMid: '#FFE5C7',
  lustrousAccent: '#FF7212',
  lustrousDark: '#9A4400',
  lustrousGlow: 'rgba(255, 114, 18, 0.25)',
  nonLustrousLight: '#EBEBEB',
  nonLustrousMid: '#D6D6D6',
  nonLustrousAccent: '#6B6B6B',
  nonLustrousDark: '#3F3F3F',
  nonLustrousGlow: 'rgba(107, 107, 107, 0.22)',
};

// ==================== KEYFRAMES & GLOBAL STYLES ====================

const styleBlock = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  .lts-root *, .lts-root *::before, .lts-root *::after { box-sizing: border-box; }

  @keyframes lts-fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes lts-popIn {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.12); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes lts-shake {
    0%, 100% { transform: translateX(0); }
    10%, 50%, 90% { transform: translateX(-6px); }
    30%, 70% { transform: translateX(6px); }
  }
  @keyframes lts-slideInLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes lts-slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes lts-confettiFall {
    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
  }
  @keyframes lts-tileFadeIn {
    from { opacity: 0; transform: scale(0.85) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes lts-lockIn {
    0% { transform: scale(1); }
    40% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  @keyframes lts-hintFade {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes lts-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes lts-starSpin {
    from { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(1.3); }
    to { transform: rotate(360deg) scale(1); }
  }
  @keyframes lts-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.9; }
  }
`;

// ==================== CONFETTI ====================

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const colors = [C.primary, C.orange, C.purple, C.amber, C.lightPurple, C.green, '#FFD700'];
  const pieces = Array.from({ length: 55 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 2.5,
    duration: 2.2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 5 + Math.random() * 9, isCircle: Math.random() > 0.5,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 100 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: '-3%',
          width: p.size, height: p.isCircle ? p.size : p.size * 0.5,
          backgroundColor: p.color, borderRadius: p.isCircle ? '50%' : '2px',
          animation: `lts-confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const LustreTwoBinSorter: React.FC<LustreTwoBinSorterProps> = ({
  props = {}, setStepDetails, stopAutoNext, setStopAutoNext
}) => {
  const config = useMemo(() => ({
    width: props.width ?? 900,
    animationSpeed: props.animationSpeed ?? 1,
    themeColor: props.themeColor ?? C.primary,
    darkMode: props.darkMode ?? false,
  }), [props]);

  const ap = props.additionalProps || {};
  const objects = ap.objects ?? DEFAULT_OBJECTS;
  const lustrousLabel = ap.lustrousBinLabel ?? 'Lustrous';
  const nonlustrousLabel = ap.nonlustrousBinLabel ?? 'Non-lustrous';
  const showHints = ap.showHints ?? true;
  const enableTimer = ap.enableTimer ?? true;
  const totalTiles = objects.length;

  // ─── STATE ───
  const [unsorted, setUnsorted] = useState<ObjectTile[]>([]);
  const [lustrousBin, setLustrousBin] = useState<ObjectTile[]>([]);
  const [nonlustrousBin, setNonlustrousBin] = useState<ObjectTile[]>([]);
  const [selected, setSelected] = useState<ObjectTile | null>(null);
  const [feedback, setFeedback] = useState<{ tileId: string; text: string; type: 'correct' | 'wrong' } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hoveredBin, setHoveredBin] = useState<'lustrous' | 'nonlustrous' | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 900
  );
  const fbTimer = useRef<any>(null);

  // Responsive breakpoint detection
  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 900;

  // ─── INIT ───
  useEffect(() => {
    const shuffled = shuffleArray(objects, ap.shuffleSeed);
    setUnsorted(shuffled);
    setLustrousBin([]);
    setNonlustrousBin([]);
    setSelected(null);
    setFeedback(null);
    setCorrectCount(0);
    setWrongCount(0);
    setIsComplete(false);
    setShowConfetti(false);
    setShakingId(null);
    setIsBusy(false);
    setSeconds(0);
    setTimerRunning(true);
    setTimeout(() => setMounted(true), 50);
  }, [objects]);

  // ─── STYLES INJECTION ───
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'lts-styles';
    el.textContent = styleBlock;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('lts-styles'); if (e) document.head.removeChild(e); };
  }, []);

  // ─── VIEWPORT RESIZE ───
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── TIMER ───
  useEffect(() => {
    if (!enableTimer || !timerRunning || isComplete) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [enableTimer, timerRunning, isComplete]);

  // ─── STEP DETAILS ───
  useEffect(() => {
    if (setStepDetails) {
      setStepDetails({
        currentStep: lustrousBin.length + nonlustrousBin.length,
        totalSteps: totalTiles,
        isPaused: false,
        currentMode: 'practice',
      });
    }
  }, [lustrousBin.length, nonlustrousBin.length, totalTiles]);

  // ─── SORT LOGIC ───
  const sortTile = useCallback((tile: ObjectTile, bin: 'lustrous' | 'nonlustrous') => {
    if (isBusy) return;
    if (fbTimer.current) clearTimeout(fbTimer.current);
    setIsBusy(true);

    const correct = tile.category === bin;

    if (correct) {
      setCorrectCount(c => c + 1);
      setFeedback({ tileId: tile.id, text: tile.reason, type: 'correct' });
      setUnsorted(prev => prev.filter(t => t.id !== tile.id));
      if (bin === 'lustrous') setLustrousBin(prev => [...prev, tile]);
      else setNonlustrousBin(prev => [...prev, tile]);
      setSelected(null);

      fbTimer.current = setTimeout(() => {
        setFeedback(null);
        setIsBusy(false);
      }, 2200);

      // Check completion
      const remaining = unsorted.length - 1;
      if (remaining <= 0) {
        setTimeout(() => {
          setIsComplete(true);
          setTimerRunning(false);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4500);
        }, 900);
      }
    } else {
      setWrongCount(w => w + 1);
      setShakingId(tile.id);
      if (showHints) {
        setFeedback({ tileId: tile.id, text: tile.hint, type: 'wrong' });
      }
      setSelected(null);

      fbTimer.current = setTimeout(() => {
        setShakingId(null);
        setFeedback(null);
        setIsBusy(false);
      }, 2500);
    }
    setHoveredBin(null);
  }, [unsorted, showHints, isBusy]);

  const handleTileTap = useCallback((tile: ObjectTile) => {
    if (isBusy) return;
    if (selected?.id === tile.id) { setSelected(null); return; }
    setSelected(tile);
    setFeedback(null);
  }, [selected, isBusy]);

  const handleBinTap = useCallback((bin: 'lustrous' | 'nonlustrous') => {
    if (!selected || isBusy) return;
    sortTile(selected, bin);
  }, [selected, sortTile, isBusy]);

  const handleDragStart = useCallback((tile: ObjectTile) => {
    if (isBusy) return;
    setSelected(tile);
    setFeedback(null);
  }, [isBusy]);

  const handleDrop = useCallback((bin: 'lustrous' | 'nonlustrous') => {
    if (!selected || isBusy) return;
    sortTile(selected, bin);
  }, [selected, sortTile, isBusy]);

  const resetGame = useCallback(() => {
    const shuffled = shuffleArray(objects, Date.now());
    setUnsorted(shuffled);
    setLustrousBin([]);
    setNonlustrousBin([]);
    setSelected(null);
    setFeedback(null);
    setCorrectCount(0);
    setWrongCount(0);
    setIsComplete(false);
    setShowConfetti(false);
    setShakingId(null);
    setIsBusy(false);
    setSeconds(0);
    setTimerRunning(true);
  }, [objects]);

  const sortedCount = lustrousBin.length + nonlustrousBin.length;
  const progressPct = totalTiles > 0 ? (sortedCount / totalTiles) * 100 : 0;
  const accuracy = (correctCount + wrongCount) > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
    : 100;

  // ─── RESPONSIVE SIZING ───
  const tileMinWidth = isMobile ? 100 : isTablet ? 120 : 130;
  const tileEmojiSize = isMobile ? 28 : 32;
  const tileFontSize = isMobile ? 10 : 11;
  const binMinHeight = isMobile ? 150 : 170;
  const headerTitleSize = isMobile ? 15 : 17;
  const padding = isMobile ? 12 : 16;

  // ==================== RENDER ====================
  return (
    <div className="lts-root" style={{
      width: '100%', maxWidth: config.width,
      margin: '0 auto',
      fontFamily: "'Poppins', sans-serif",
      background: '#FAFAFA', borderRadius: 20, overflow: 'hidden', position: 'relative',
      boxShadow: '0 8px 40px rgba(74,77,201,0.10), 0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #E5E7EB',
    }}>
      <Confetti active={showConfetti} />

      {/* ═══ HEADER ═══ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.purple} 0%, ${C.primary} 100%)`,
        padding: isMobile ? '14px 16px 12px' : '18px 24px 14px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: 40, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 10 : 0,
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: isMobile ? 22 : 24 }}>✨</span>
              <h2 style={{
                margin: 0, fontSize: headerTitleSize, fontWeight: 800, color: C.white,
                fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.3px', lineHeight: 1.2,
              }}>
                Sort by Lustre
              </h2>
            </div>
            <p style={{
              margin: '4px 0 0 36px', fontSize: isMobile ? 10 : 11, fontWeight: 400,
              color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif",
            }}>
              Chapter 6 — Materials Around Us
            </p>
          </div>

          {/* SCORE STRIP */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            justifyContent: isMobile ? 'flex-start' : 'flex-end',
          }}>
            {/* Correct */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(34, 197, 94, 0.22)',
              border: '1px solid rgba(134, 239, 172, 0.5)',
              backdropFilter: 'blur(8px)',
              padding: '6px 11px', borderRadius: 14,
            }}>
              <IconCheck size={12} color="#BBF7D0" />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{correctCount}</span>
            </div>
            {/* Wrong */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(239, 68, 68, 0.22)',
              border: '1px solid rgba(252, 165, 165, 0.5)',
              backdropFilter: 'blur(8px)',
              padding: '6px 11px', borderRadius: 14,
            }}>
              <IconX size={12} color="#FECACA" />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{wrongCount}</span>
            </div>
            {/* Timer */}
            {enableTimer && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
                padding: '6px 11px', borderRadius: 14,
              }}>
                <IconClock size={12} color="#fff" />
                <span style={{
                  fontSize: 12, fontWeight: 700, color: C.white,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatTime(seconds)}
                </span>
              </div>
            )}
            {/* Total */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              padding: '6px 11px', borderRadius: 14,
            }}>
              <span style={{ fontSize: 13 }}>🎯</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.white, fontVariantNumeric: 'tabular-nums' }}>
                {sortedCount}/{totalTiles}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          marginTop: isMobile ? 12 : 14, height: 7,
          background: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: progressPct >= 100
              ? `linear-gradient(90deg, ${C.green}, #4ADE80)`
              : `linear-gradient(90deg, ${C.amber}, ${C.orange})`,
            width: `${progressPct}%`,
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: progressPct > 0 ? '0 0 10px rgba(255,114,18,0.4)' : 'none',
          }} />
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div style={{
        padding: `${padding}px ${padding}px ${padding + 4}px`,
        display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 14,
      }}>

        {/* Instruction */}
        {!isComplete && (
          <p style={{
            textAlign: 'center', margin: 0,
            fontSize: isMobile ? 12 : 13, color: '#6B7280',
            fontFamily: "'Poppins', sans-serif", fontWeight: 500,
            animation: mounted ? 'lts-fadeInUp 0.4s ease-out both' : 'none',
            lineHeight: 1.45,
          }}>
            {selected
              ? <span>Tap a bin to place <strong style={{ color: C.primary }}>"{selected.name}"</strong></span>
              : <span>{isMobile ? 'Tap a tile, then tap a bin' : 'Tap a tile then tap a bin · or drag & drop'}</span>}
          </p>
        )}

        {/* ─── BINS ─── */}
        {!isComplete && (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 10 : 12,
            animation: 'lts-fadeInUp 0.5s ease-out both',
          }}>

            {/* LUSTROUS BIN (Orange/Amber — shiny feel) */}
            <div
              onDragOver={e => { e.preventDefault(); setHoveredBin('lustrous'); }}
              onDragLeave={() => setHoveredBin(null)}
              onDrop={e => { e.preventDefault(); handleDrop('lustrous'); }}
              onClick={() => handleBinTap('lustrous')}
              style={{
                flex: 1, minHeight: binMinHeight, borderRadius: 16,
                padding: isMobile ? 12 : 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                background: hoveredBin === 'lustrous'
                  ? `linear-gradient(160deg, ${C.lustrousMid}, ${C.lustrousLight})`
                  : `linear-gradient(160deg, ${C.lustrousLight}, #FFF9F0)`,
                border: `2.5px dashed ${hoveredBin === 'lustrous' ? C.lustrousAccent : C.amber}`,
                cursor: selected ? 'pointer' : 'default',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hoveredBin === 'lustrous' ? 'scale(1.015)' : 'scale(1)',
                boxShadow: hoveredBin === 'lustrous'
                  ? `0 0 0 4px ${C.lustrousGlow}, 0 8px 24px rgba(255,114,18,0.15)`
                  : '0 2px 8px rgba(0,0,0,0.04)',
                animation: 'lts-slideInLeft 0.5s ease-out both',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* shimmer overlay for lustrous theme */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
                backgroundSize: '200% 100%',
                animation: 'lts-shimmer 4s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: isMobile ? 18 : 20 }}>✨</span>
                <span style={{
                  fontSize: isMobile ? 15 : 16, fontWeight: 800,
                  color: C.lustrousDark, fontFamily: "'Poppins', sans-serif",
                }}>
                  {lustrousLabel}
                </span>
              </div>
              <span style={{
                fontSize: isMobile ? 10 : 11, fontWeight: 500,
                color: C.lustrousDark, opacity: 0.75, position: 'relative', zIndex: 1,
              }}>
                {lustrousBin.length} sorted · shiny surfaces
              </span>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 4,
                justifyContent: 'center', position: 'relative', zIndex: 1,
              }}>
                {lustrousBin.map((t, i) => (
                  <span key={t.id} style={{
                    fontSize: isMobile ? 9 : 10, padding: '3px 8px', borderRadius: 10,
                    background: '#FFD9B3', color: C.lustrousDark, fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif",
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    animation: `lts-popIn 0.35s ease-out ${i * 0.04}s both`,
                  }}>
                    <span style={{ fontSize: 11 }}>{t.emoji}</span>
                    {t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name}
                  </span>
                ))}
              </div>
            </div>

            {/* NON-LUSTROUS BIN (Grey — dull feel) */}
            <div
              onDragOver={e => { e.preventDefault(); setHoveredBin('nonlustrous'); }}
              onDragLeave={() => setHoveredBin(null)}
              onDrop={e => { e.preventDefault(); handleDrop('nonlustrous'); }}
              onClick={() => handleBinTap('nonlustrous')}
              style={{
                flex: 1, minHeight: binMinHeight, borderRadius: 16,
                padding: isMobile ? 12 : 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                background: hoveredBin === 'nonlustrous'
                  ? `linear-gradient(160deg, ${C.nonLustrousMid}, ${C.nonLustrousLight})`
                  : `linear-gradient(160deg, ${C.nonLustrousLight}, #F5F5F5)`,
                border: `2.5px dashed ${hoveredBin === 'nonlustrous' ? C.nonLustrousAccent : '#9CA3AF'}`,
                cursor: selected ? 'pointer' : 'default',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hoveredBin === 'nonlustrous' ? 'scale(1.015)' : 'scale(1)',
                boxShadow: hoveredBin === 'nonlustrous'
                  ? `0 0 0 4px ${C.nonLustrousGlow}, 0 8px 24px rgba(107,107,107,0.12)`
                  : '0 2px 8px rgba(0,0,0,0.04)',
                animation: 'lts-slideInRight 0.5s ease-out both',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: isMobile ? 18 : 20 }}>🪨</span>
                <span style={{
                  fontSize: isMobile ? 15 : 16, fontWeight: 800,
                  color: C.nonLustrousDark, fontFamily: "'Poppins', sans-serif",
                }}>
                  {nonlustrousLabel}
                </span>
              </div>
              <span style={{
                fontSize: isMobile ? 10 : 11, fontWeight: 500,
                color: C.nonLustrousDark, opacity: 0.7,
              }}>
                {nonlustrousBin.length} sorted · dull surfaces
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                {nonlustrousBin.map((t, i) => (
                  <span key={t.id} style={{
                    fontSize: isMobile ? 9 : 10, padding: '3px 8px', borderRadius: 10,
                    background: '#D1D5DB', color: C.nonLustrousDark, fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif",
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    animation: `lts-popIn 0.35s ease-out ${i * 0.04}s both`,
                  }}>
                    <span style={{ fontSize: 11 }}>{t.emoji}</span>
                    {t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Feedback banner (correct reason OR wrong hint) */}
        {feedback && !isComplete && (
          <div style={{
            background: feedback.type === 'correct' ? C.greenBg : '#FEF3C7',
            border: `2px solid ${feedback.type === 'correct' ? C.greenBorder : '#F59E0B'}`,
            borderRadius: 12,
            padding: isMobile ? '10px 14px' : '11px 16px',
            fontSize: isMobile ? 11.5 : 12.5,
            fontWeight: 500,
            color: feedback.type === 'correct' ? '#166534' : '#92400E',
            fontFamily: "'Poppins', sans-serif", textAlign: 'center',
            animation: 'lts-hintFade 0.35s ease-out both',
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
            lineHeight: 1.4,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>
              {feedback.type === 'correct' ? '✅' : '💡'}
            </span>
            <span>{feedback.text}</span>
          </div>
        )}

        {/* ─── UNSORTED TILES ─── */}
        {!isComplete && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${tileMinWidth}px, 1fr))`,
            gap: isMobile ? 8 : 10,
            padding: '4px 0', minHeight: 50,
          }}>
            {unsorted.map((tile, i) => {
              const isShaking = shakingId === tile.id;
              const isSel = selected?.id === tile.id;
              const isHov = hoveredTile === tile.id;

              return (
                <div
                  key={tile.id}
                  draggable={!isBusy}
                  onDragStart={() => handleDragStart(tile)}
                  onDragEnd={() => { setSelected(null); setHoveredBin(null); }}
                  onClick={() => handleTileTap(tile)}
                  onMouseEnter={() => setHoveredTile(tile.id)}
                  onMouseLeave={() => setHoveredTile(null)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6,
                    padding: isMobile ? '10px 8px' : '12px 10px',
                    borderRadius: 14,
                    background: C.white,
                    border: `2px solid ${
                      isSel ? C.primary
                      : isHov ? C.lightPurple
                      : '#E5E7EB'
                    }`,
                    cursor: isBusy ? 'default' : 'grab',
                    fontSize: tileFontSize, fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif", color: C.dark,
                    userSelect: 'none',
                    position: 'relative',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isSel ? 'scale(1.05)' : isHov ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
                    boxShadow: isSel
                      ? `0 0 0 3px ${C.primary}30, 0 6px 20px rgba(74,77,201,0.15)`
                      : isHov
                      ? '0 4px 14px rgba(0,0,0,0.08)'
                      : '0 2px 6px rgba(0,0,0,0.04)',
                    animation: isShaking
                      ? 'lts-shake 0.5s ease-in-out'
                      : `lts-tileFadeIn 0.4s ease-out ${i * 0.04}s both`,
                    textAlign: 'center',
                  }}
                >
                  {/* Emoji */}
                  <div style={{
                    width: isMobile ? 40 : 44, height: isMobile ? 40 : 44,
                    borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
                    fontSize: tileEmojiSize,
                    flexShrink: 0,
                  }}>
                    {tile.emoji}
                  </div>
                  {/* Name */}
                  <span style={{
                    lineHeight: 1.25,
                    minHeight: isMobile ? 28 : 30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {tile.name}
                  </span>
                  {/* Selected indicator */}
                  {isSel && (
                    <div style={{
                      position: 'absolute', bottom: -7, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 10, height: 10, borderRadius: '50%',
                      background: C.primary, border: `2px solid ${C.white}`,
                      boxShadow: `0 0 0 2px ${C.primary}40`,
                      animation: 'lts-popIn 0.25s ease-out both',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Wrong count warning */}
        {wrongCount >= 4 && !isComplete && (
          <p style={{
            textAlign: 'center', margin: 0,
            fontSize: isMobile ? 11 : 12, color: '#B45309',
            fontFamily: "'Poppins', sans-serif", fontWeight: 500,
            background: '#FEF3C7', padding: '8px 14px', borderRadius: 10,
            animation: 'lts-fadeInUp 0.3s ease-out both',
            lineHeight: 1.4,
          }}>
            💡 Tip: Lustre = shiny surface. Tarnish, dust, or rough texture means dull (non-lustrous).
          </p>
        )}

        {/* ═══ COMPLETION ═══ */}
        {isComplete && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: isMobile ? 14 : 18, padding: '8px 0',
          }}>

            {/* Trophy Banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14,
              background: `linear-gradient(135deg, ${C.lustrousLight}, #FFE4C4)`,
              padding: isMobile ? '16px 20px' : '20px 28px',
              borderRadius: 16, border: `2px solid ${C.amber}`,
              animation: 'lts-popIn 0.5s ease-out 0.2s both',
              boxShadow: '0 8px 24px rgba(255,114,18,0.15)',
              flexDirection: isMobile ? 'column' : 'row',
              textAlign: isMobile ? 'center' : 'left',
              maxWidth: '100%',
            }}>
              <span style={{
                fontSize: isMobile ? 32 : 40,
                animation: 'lts-starSpin 1s ease-out 0.5s both',
              }}>
                🏆
              </span>
              <div>
                <div style={{
                  fontSize: isMobile ? 17 : 20, fontWeight: 800,
                  color: C.lustrousDark, fontFamily: "'Poppins', sans-serif",
                }}>
                  All {totalTiles} Sorted!
                </div>
                <div style={{
                  fontSize: isMobile ? 12 : 13, color: '#92400E', fontWeight: 500,
                  fontFamily: "'Poppins', sans-serif", marginTop: 3,
                }}>
                  {wrongCount === 0
                    ? '🎯 Perfect — zero mistakes!'
                    : `Accuracy: ${accuracy}% · ${wrongCount} wrong attempt${wrongCount > 1 ? 's' : ''}`}
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: enableTimer ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gap: isMobile ? 8 : 12,
              width: '100%',
              maxWidth: 500,
              animation: 'lts-fadeInUp 0.5s ease-out 0.4s both',
            }}>
              <StatCard
                label="Correct" value={correctCount} emoji="✅"
                bg={C.greenBg} color="#166534" border={C.greenBorder}
                isMobile={isMobile}
              />
              <StatCard
                label="Wrong" value={wrongCount} emoji="❌"
                bg={C.redBg} color="#991B1B" border={C.redBorder}
                isMobile={isMobile}
              />
              {enableTimer && (
                <StatCard
                  label="Time" value={formatTime(seconds)} emoji="⏱️"
                  bg="#EEF2FF" color={C.primary} border="#C7D2FE"
                  isMobile={isMobile}
                />
              )}
            </div>

            {/* Key Takeaway */}
            <div style={{
              background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
              border: `2px solid ${C.lightPurple}`,
              borderRadius: 14,
              padding: isMobile ? '12px 16px' : '14px 20px',
              maxWidth: 560,
              animation: 'lts-fadeInUp 0.5s ease-out 0.6s both',
            }}>
              <div style={{
                fontSize: isMobile ? 12 : 13, fontWeight: 700, color: C.purple,
                marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>📚</span> Remember
              </div>
              <p style={{
                margin: 0, fontSize: isMobile ? 11.5 : 12.5,
                color: C.dark, lineHeight: 1.5, fontFamily: "'Poppins', sans-serif",
              }}>
                <strong>Lustrous</strong> = shiny surface (usually metals).
                <strong> Non-lustrous</strong> = dull surface (wood, rubber, coal).
                But <em>"all that glitters is not gold"</em> — coated plastic or polished glass can also shine!
              </p>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetGame}
              style={{
                padding: isMobile ? '10px 22px' : '11px 26px',
                borderRadius: 24,
                border: 'none',
                cursor: 'pointer',
                fontSize: isMobile ? 13 : 14, fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                background: `linear-gradient(135deg, ${C.primary}, ${C.purple})`,
                color: C.white,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(74,77,201,0.25)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: 'lts-fadeInUp 0.4s ease-out 0.8s both',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(74,77,201,0.32)';
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

// ==================== STAT CARD HELPER ====================

const StatCard: React.FC<{
  label: string; value: string | number; emoji: string;
  bg: string; color: string; border: string; isMobile: boolean;
}> = ({ label, value, emoji, bg, color, border, isMobile }) => (
  <div style={{
    background: bg,
    border: `1.5px solid ${border}`,
    borderRadius: 12,
    padding: isMobile ? '10px 8px' : '12px 10px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 3,
  }}>
    <span style={{ fontSize: isMobile ? 16 : 18 }}>{emoji}</span>
    <span style={{
      fontSize: isMobile ? 16 : 19, fontWeight: 800, color,
      fontFamily: "'Poppins', sans-serif",
      fontVariantNumeric: 'tabular-nums',
    }}>
      {value}
    </span>
    <span style={{
      fontSize: isMobile ? 9 : 10, fontWeight: 600,
      color, opacity: 0.75, textTransform: 'uppercase',
      letterSpacing: '0.5px', fontFamily: "'Poppins', sans-serif",
    }}>
      {label}
    </span>
  </div>
);

export default LustreTwoBinSorter;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════