// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: materials_sorter_tool.tsx
// Chapter 6 — Materials Around Us | Activity 6.6 — Transparent / Translucent / Opaque
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ==================== TYPE DEFINITIONS ====================

type CategoryId = 'transparent' | 'translucent' | 'opaque';
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
  category: CategoryId;
  reason: string;
  hint: string;
}

interface SorterAdditionalProps {
  objects?: ObjectTile[];
  showHints?: boolean;
  shuffleSeed?: number;
  enableTimer?: boolean;
  showTableOnComplete?: boolean;
  successMessage?: string;
  binLabels?: { transparent?: string; translucent?: string; opaque?: string };
}

interface MaterialsSorterProps {
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
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconEye: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconHaze: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M5 8h14M5 16h14" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 19v2" />
  </svg>
);

// ==================== DEFAULT OBJECTS — Activity 6.6 ====================

const DEFAULT_OBJECTS: ObjectTile[] = [
  {
    id: 'glass_tumbler', name: 'Glass tumbler', emoji: '🥃', category: 'transparent',
    reason: 'Clear glass — you can see straight through it.',
    hint: 'Hold a glass up — can you read the words behind it clearly?',
  },
  {
    id: 'butter_paper', name: 'Butter paper', emoji: '📄', category: 'translucent',
    reason: 'Light passes through, but the view is blurry — not clear.',
    hint: 'Light gets through, but shapes look hazy. Not fully clear, not fully blocked.',
  },
  {
    id: 'eraser', name: 'Eraser', emoji: '🩹', category: 'opaque',
    reason: 'No light passes through — completely blocks the view.',
    hint: 'Try shining a torch behind it. Does any light come through?',
  },
  {
    id: 'frosted_glass', name: 'Frosted glass', emoji: '🪟', category: 'translucent',
    reason: 'Blurry — light passes but no clear view.',
    hint: 'Light gets through, but you only see fuzzy outlines.',
  },
  {
    id: 'wooden_board', name: 'Wooden board', emoji: '🪵', category: 'opaque',
    reason: 'Wood blocks all light — you cannot see through it.',
    hint: 'Wood is dense — light has no way through.',
  },
  {
    id: 'window_glass', name: 'Window glass', emoji: '🏠', category: 'transparent',
    reason: 'A clear window — you see the outside view clearly.',
    hint: 'Think of a clean window pane. Can you see the garden through it?',
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

// ==================== DESIGN SYSTEM (Singularity palette) ====================

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
  red: '#EF4444',
  redBg: '#FEE2E2',
  redBorder: '#FCA5A5',
  // Transparent bin — crystal blue/indigo (clear feel)
  transBg: 'linear-gradient(160deg, #EEF2FF, #F8F9FF)',
  transBgHov: 'linear-gradient(160deg, #C7D2FE, #EEF2FF)',
  transBorder: '#C1C1EA',
  transBorderHov: '#4A4DC9',
  transGlow: 'rgba(74,77,201,0.22)',
  transTag: '#312E81',
  transChipBg: '#C7D2FE',
  transChipColor: '#312E81',
  // Translucent bin — warm amber (hazy feel)
  hazeBg: 'linear-gradient(160deg, #FFF3E4, #FFFBF5)',
  hazeBgHov: 'linear-gradient(160deg, #FFE5C7, #FFF3E4)',
  hazeBorder: '#FC9145',
  hazeBorderHov: '#FF7212',
  hazeGlow: 'rgba(252,145,69,0.25)',
  hazeTag: '#92400E',
  hazeChipBg: '#FFD9B3',
  hazeChipColor: '#92400E',
  // Opaque bin — deep purple (blocked feel)
  opaBg: 'linear-gradient(160deg, #F3F0F8, #F8F5FF)',
  opaBgHov: 'linear-gradient(160deg, #D8CFE8, #F3F0F8)',
  opaBorder: '#C1C1EA',
  opaBorderHov: '#533086',
  opaGlow: 'rgba(83,48,134,0.22)',
  opaTag: '#2D1052',
  opaChipBg: '#D8CFE8',
  opaChipColor: '#2D1052',
};

// ==================== BIN DEFINITIONS ====================

interface BinDef {
  id: CategoryId;
  emoji: string;
  defaultLabel: string;
  subTag: string;
  bg: string;
  bgHov: string;
  border: string;
  borderHov: string;
  glow: string;
  tagColor: string;
  chipBg: string;
  chipColor: string;
  icon: React.ReactElement;
  shimmer: boolean;
  animClass: string;
}

const BIN_DEFS: BinDef[] = [
  {
    id: 'transparent', emoji: '🔍', defaultLabel: 'Transparent',
    subTag: 'See clearly through it',
    bg: C.transBg, bgHov: C.transBgHov, border: C.transBorder, borderHov: C.transBorderHov,
    glow: C.transGlow, tagColor: C.transTag, chipBg: C.transChipBg, chipColor: C.transChipColor,
    icon: <IconEye size={16} color="#312E81" />, shimmer: true, animClass: 'mst-slideInLeft',
  },
  {
    id: 'translucent', emoji: '🌫️', defaultLabel: 'Translucent',
    subTag: 'Blurry — light passes through',
    bg: C.hazeBg, bgHov: C.hazeBgHov, border: C.hazeBorder, borderHov: C.hazeBorderHov,
    glow: C.hazeGlow, tagColor: C.hazeTag, chipBg: C.hazeChipBg, chipColor: C.hazeChipColor,
    icon: <IconHaze size={16} color="#92400E" />, shimmer: true, animClass: 'mst-slideInCenter',
  },
  {
    id: 'opaque', emoji: '🧱', defaultLabel: 'Opaque',
    subTag: 'Cannot see through it',
    bg: C.opaBg, bgHov: C.opaBgHov, border: C.opaBorder, borderHov: C.opaBorderHov,
    glow: C.opaGlow, tagColor: C.opaTag, chipBg: C.opaChipBg, chipColor: C.opaChipColor,
    icon: <IconEyeOff size={16} color="#2D1052" />, shimmer: false, animClass: 'mst-slideInRight',
  },
];

// ==================== GLOBAL STYLES ====================

const STYLE_BLOCK = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  .mst-root *, .mst-root *::before, .mst-root *::after { box-sizing: border-box; }

  @keyframes mst-fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mst-popIn {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.12); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes mst-shake {
    0%, 100%       { transform: translateX(0); }
    10%, 50%, 90%  { transform: translateX(-6px); }
    30%, 70%       { transform: translateX(6px); }
  }
  @keyframes mst-slideInLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mst-slideInCenter {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mst-slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mst-confettiFall {
    0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
  }
  @keyframes mst-tileFadeIn {
    from { opacity: 0; transform: scale(0.85) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mst-hintFade {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes mst-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes mst-starSpin {
    from { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.3); }
    to   { transform: rotate(360deg) scale(1); }
  }
  @keyframes mst-tableRowIn {
    from { opacity: 0; transform: translateX(-10px); }
    to   { opacity: 1; transform: translateX(0); }
  }
`;

// ==================== CONFETTI ====================

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const colors = [C.primary, C.orange, C.purple, C.amber, C.lightPurple, C.green, '#FFD700'];
  const pieces = Array.from({ length: 55 }, (_, i) => ({
    id: i, left: Math.random() * 100,
    delay: Math.random() * 2.5, duration: 2.2 + Math.random() * 2,
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
          animation: `mst-confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

// ==================== STAT CARD ====================

const StatCard: React.FC<{
  label: string; value: string | number; emoji: string;
  bg: string; color: string; border: string; isMobile: boolean;
}> = ({ label, value, emoji, bg, color, border, isMobile }) => (
  <div style={{
    background: bg, border: `1.5px solid ${border}`, borderRadius: 12,
    padding: isMobile ? '10px 8px' : '12px 10px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
  }}>
    <span style={{ fontSize: isMobile ? 16 : 18 }}>{emoji}</span>
    <span style={{
      fontSize: isMobile ? 16 : 19, fontWeight: 800, color,
      fontFamily: "'Poppins', sans-serif", fontVariantNumeric: 'tabular-nums',
    }}>{value}</span>
    <span style={{
      fontSize: isMobile ? 9 : 10, fontWeight: 600, color, opacity: 0.75,
      textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'Poppins', sans-serif",
    }}>{label}</span>
  </div>
);

// ==================== MAIN COMPONENT ====================

const MaterialsSorterTool: React.FC<MaterialsSorterProps> = ({
  props = {}, setStepDetails,
}) => {
  const config = useMemo(() => ({
    width: props.width ?? 980,
    themeColor: props.themeColor ?? C.primary,
  }), [props.width, props.themeColor]);

  const ap = props.additionalProps || {};
  const objects: ObjectTile[] = ap.objects ?? DEFAULT_OBJECTS;
  const showHints = ap.showHints ?? true;
  const enableTimer = ap.enableTimer ?? true;
  const showTableOnComplete = ap.showTableOnComplete ?? true;
  const successMessage = ap.successMessage ?? 'Brilliant! You filled Table 6.4 correctly.';
  const binLabels: Record<CategoryId, string> = {
    transparent: ap.binLabels?.transparent ?? 'Transparent',
    translucent: ap.binLabels?.translucent ?? 'Translucent',
    opaque: ap.binLabels?.opaque ?? 'Opaque',
  };
  const totalTiles = objects.length;

  // ─── STATE ───
  const [unsorted, setUnsorted] = useState<ObjectTile[]>([]);
  const [bins, setBins] = useState<Record<CategoryId, ObjectTile[]>>({ transparent: [], translucent: [], opaque: [] });
  const [selected, setSelected] = useState<ObjectTile | null>(null);
  const [feedback, setFeedback] = useState<{ tileId: string; text: string; type: 'correct' | 'wrong' } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hoveredBin, setHoveredBin] = useState<CategoryId | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 980
  );
  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsortedRef = useRef<ObjectTile[]>([]);
  unsortedRef.current = unsorted;

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 900;

  // ─── INIT ───
  useEffect(() => {
    const shuffled = shuffleArray(objects, ap.shuffleSeed);
    setUnsorted(shuffled);
    setBins({ transparent: [], translucent: [], opaque: [] });
    setSelected(null); setFeedback(null);
    setCorrectCount(0); setWrongCount(0);
    setIsComplete(false); setShowConfetti(false);
    setShakingId(null); setIsBusy(false);
    setSeconds(0); setTimerRunning(true);
    setTimeout(() => setMounted(true), 50);
  }, [objects]);

  // ─── STYLES ───
  useEffect(() => {
    const existing = document.getElementById('mst-styles');
    if (existing) return;
    const el = document.createElement('style');
    el.id = 'mst-styles';
    el.textContent = STYLE_BLOCK;
    document.head.appendChild(el);
    return () => {
      const e = document.getElementById('mst-styles');
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
    if (!enableTimer || !timerRunning || isComplete) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [enableTimer, timerRunning, isComplete]);

  // ─── STEP DETAILS ───
  useEffect(() => {
    if (!setStepDetails) return;
    const sorted = Object.values(bins).reduce((a, b) => a + b.length, 0);
    setStepDetails({ currentStep: sorted, totalSteps: totalTiles, isPaused: false, currentMode: 'practice' });
  }, [bins, totalTiles, setStepDetails]);

  // ─── SORT LOGIC ───
  const sortTile = useCallback((tile: ObjectTile, binId: CategoryId) => {
    if (isBusy) return;
    if (fbTimer.current) clearTimeout(fbTimer.current);
    setIsBusy(true);

    const correct = tile.category === binId;

    if (correct) {
      setCorrectCount(c => c + 1);
      setFeedback({ tileId: tile.id, text: tile.reason, type: 'correct' });
      setUnsorted(prev => prev.filter(t => t.id !== tile.id));
      setBins(prev => ({ ...prev, [binId]: [...prev[binId], tile] }));
      setSelected(null);

      fbTimer.current = setTimeout(() => {
        setFeedback(null);
        setIsBusy(false);
      }, 2200);

      // completion check using ref so we have fresh value
      const remaining = unsortedRef.current.filter(t => t.id !== tile.id).length;
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
      if (showHints) setFeedback({ tileId: tile.id, text: tile.hint, type: 'wrong' });
      setSelected(null);
      fbTimer.current = setTimeout(() => {
        setShakingId(null);
        setFeedback(null);
        setIsBusy(false);
      }, 2500);
    }
    setHoveredBin(null);
  }, [isBusy, showHints]);

  const handleTileTap = useCallback((tile: ObjectTile) => {
    if (isBusy) return;
    if (selected?.id === tile.id) { setSelected(null); return; }
    setSelected(tile);
    setFeedback(null);
  }, [selected, isBusy]);

  const handleBinTap = useCallback((binId: CategoryId) => {
    if (!selected || isBusy) return;
    sortTile(selected, binId);
  }, [selected, sortTile, isBusy]);

  const handleDragStart = useCallback((tile: ObjectTile) => {
    if (isBusy) return;
    setSelected(tile);
    setFeedback(null);
  }, [isBusy]);

  const handleDrop = useCallback((binId: CategoryId) => {
    if (!selected || isBusy) return;
    sortTile(selected, binId);
  }, [selected, sortTile, isBusy]);

  const resetGame = useCallback(() => {
    const shuffled = shuffleArray(objects, Date.now());
    setUnsorted(shuffled);
    setBins({ transparent: [], translucent: [], opaque: [] });
    setSelected(null); setFeedback(null);
    setCorrectCount(0); setWrongCount(0);
    setIsComplete(false); setShowConfetti(false);
    setShakingId(null); setIsBusy(false);
    setSeconds(0); setTimerRunning(true);
  }, [objects]);

  // ─── DERIVED ───
  const sortedCount = Object.values(bins).reduce((a, b) => a + b.length, 0);
  const progressPct = totalTiles > 0 ? (sortedCount / totalTiles) * 100 : 0;
  const accuracy = (correctCount + wrongCount) > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 100;

  // ─── RESPONSIVE ───
  const tileMinWidth = isMobile ? 98 : isTablet ? 115 : 128;
  const tileEmojiSize = isMobile ? 26 : 30;
  const tileFontSize = isMobile ? 10 : 11;
  const binMinHeight = isMobile ? 148 : 168;
  const headerTitleSize = isMobile ? 15 : 18;
  const pad = isMobile ? 12 : 18;
  const binCols = isMobile ? '1fr' : 'repeat(3, 1fr)';

  // ==================== RENDER ====================
  return (
    <div className="mst-root" style={{
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
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -24, left: 40, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        {/* Title + score row */}
        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 10 : 0,
          position: 'relative', zIndex: 1,
        }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: isMobile ? 20 : 24 }}>👁️</span>
              <h2 style={{
                margin: 0, fontSize: headerTitleSize, fontWeight: 800, color: C.white,
                fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.3px', lineHeight: 1.2,
              }}>
                Sort by Light Transparency
              </h2>
            </div>
            <p style={{
              margin: '4px 0 0 36px', fontSize: isMobile ? 10 : 11.5, fontWeight: 400,
              color: 'rgba(255,255,255,0.70)', fontFamily: "'Poppins', sans-serif",
            }}>
              Chapter 6 — Activity 6.6&nbsp;|&nbsp;Materials Around Us
            </p>
          </div>

          {/* Score chips */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            justifyContent: isMobile ? 'flex-start' : 'flex-end',
          }}>
            <div style={chipStyle('rgba(34,197,94,0.22)', 'rgba(134,239,172,0.5)')}>
              <IconCheck size={12} color="#BBF7D0" />
              <span style={chipText}>{correctCount}</span>
            </div>
            <div style={chipStyle('rgba(239,68,68,0.22)', 'rgba(252,165,165,0.5)')}>
              <IconX size={12} color="#FECACA" />
              <span style={chipText}>{wrongCount}</span>
            </div>
            {enableTimer && (
              <div style={chipStyle('rgba(255,255,255,0.18)', 'rgba(255,255,255,0.25)')}>
                <IconClock size={12} color="#fff" />
                <span style={{ ...chipText, fontVariantNumeric: 'tabular-nums' }}>{formatTime(seconds)}</span>
              </div>
            )}
            <div style={chipStyle('rgba(255,255,255,0.15)', 'transparent')}>
              <span style={{ fontSize: 13 }}>🎯</span>
              <span style={{ ...chipText, fontVariantNumeric: 'tabular-nums' }}>{sortedCount}/{totalTiles}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
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
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: progressPct > 0 ? '0 0 10px rgba(255,114,18,0.4)' : 'none',
          }} />
        </div>
      </div>

      {/* ══════════════════ BODY ══════════════════ */}
      <div style={{
        padding: `${pad}px ${pad}px ${pad + 4}px`,
        display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 14,
      }}>

        {/* Instruction */}
        {!isComplete && (
          <p style={{
            textAlign: 'center', margin: 0,
            fontSize: isMobile ? 12 : 13, color: '#6B7280',
            fontFamily: "'Poppins', sans-serif", fontWeight: 500,
            animation: mounted ? 'mst-fadeInUp 0.4s ease-out both' : 'none',
            lineHeight: 1.45,
          }}>
            {selected
              ? <span>Tap a bin to place <strong style={{ color: C.primary }}>"{selected.name}"</strong></span>
              : <span>{isMobile ? 'Tap a tile, then tap a bin' : 'Tap a tile then tap a bin · or drag & drop'}</span>
            }
          </p>
        )}

        {/* ─── THREE BINS ─── */}
        {!isComplete && (
          <div style={{ display: 'grid', gridTemplateColumns: binCols, gap: isMobile ? 10 : 12 }}>
            {BIN_DEFS.map((bin) => {
              const isHov = hoveredBin === bin.id;
              const binItems = bins[bin.id];

              return (
                <div
                  key={bin.id}
                  onDragOver={e => { e.preventDefault(); setHoveredBin(bin.id); }}
                  onDragLeave={() => setHoveredBin(null)}
                  onDrop={e => { e.preventDefault(); handleDrop(bin.id); }}
                  onClick={() => handleBinTap(bin.id)}
                  style={{
                    minHeight: binMinHeight, borderRadius: 16,
                    padding: isMobile ? 12 : 14,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    background: isHov ? bin.bgHov : bin.bg,
                    border: `2.5px dashed ${isHov ? bin.borderHov : bin.border}`,
                    cursor: selected ? 'pointer' : 'default',
                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                    transform: isHov ? 'scale(1.015)' : 'scale(1)',
                    boxShadow: isHov
                      ? `0 0 0 4px ${bin.glow}, 0 8px 24px ${bin.glow}`
                      : '0 2px 8px rgba(0,0,0,0.04)',
                    animation: `${bin.animClass} 0.5s ease-out both`,
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* Shimmer — transparent + translucent only */}
                  {bin.shimmer && (
                    <div style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%)',
                      backgroundSize: '200% 100%',
                      animation: 'mst-shimmer 4s ease-in-out infinite',
                    }} />
                  )}

                  {/* Bin heading */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, position: 'relative', zIndex: 1 }}>
                    <span style={{ fontSize: isMobile ? 18 : 20 }}>{bin.emoji}</span>
                    <span style={{
                      fontSize: isMobile ? 14 : 16, fontWeight: 800,
                      color: bin.tagColor, fontFamily: "'Poppins', sans-serif",
                    }}>
                      {binLabels[bin.id]}
                    </span>
                    {bin.icon}
                  </div>

                  {/* Sub-label */}
                  <span style={{
                    fontSize: isMobile ? 10 : 11, fontWeight: 500,
                    color: bin.tagColor, opacity: 0.72,
                    position: 'relative', zIndex: 1, textAlign: 'center',
                  }}>
                    {binItems.length} sorted · {bin.subTag}
                  </span>

                  {/* Placed chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                    {binItems.map((t, ci) => (
                      <span key={t.id} style={{
                        fontSize: isMobile ? 9 : 10, padding: '3px 8px', borderRadius: 10,
                        background: bin.chipBg, color: bin.chipColor, fontWeight: 600,
                        fontFamily: "'Poppins', sans-serif",
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        animation: `mst-popIn 0.35s ease-out ${ci * 0.04}s both`,
                      }}>
                        <span style={{ fontSize: 11 }}>{t.emoji}</span>
                        {t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── FEEDBACK BANNER ─── */}
        {feedback && !isComplete && (
          <div style={{
            background: feedback.type === 'correct' ? C.greenBg : '#FEF3C7',
            border: `2px solid ${feedback.type === 'correct' ? C.greenBorder : '#F59E0B'}`,
            borderRadius: 12,
            padding: isMobile ? '10px 14px' : '11px 16px',
            fontSize: isMobile ? 11.5 : 12.5, fontWeight: 500,
            color: feedback.type === 'correct' ? '#166534' : '#92400E',
            fontFamily: "'Poppins', sans-serif", textAlign: 'center',
            animation: 'mst-hintFade 0.35s ease-out both',
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
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: isMobile ? '10px 8px' : '12px 10px',
                    borderRadius: 14, background: C.white,
                    border: `2px solid ${isSel ? C.primary : isHov ? C.lightPurple : '#E5E7EB'}`,
                    cursor: isBusy ? 'default' : 'grab',
                    fontSize: tileFontSize, fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif", color: C.dark,
                    userSelect: 'none', position: 'relative',
                    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                    transform: isSel ? 'scale(1.05)' : isHov ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
                    boxShadow: isSel
                      ? `0 0 0 3px ${C.primary}30, 0 6px 20px rgba(74,77,201,0.15)`
                      : isHov ? '0 4px 14px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.04)',
                    animation: isShaking
                      ? 'mst-shake 0.5s ease-in-out'
                      : `mst-tileFadeIn 0.4s ease-out ${i * 0.05}s both`,
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    width: isMobile ? 40 : 44, height: isMobile ? 40 : 44, borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
                    fontSize: tileEmojiSize, flexShrink: 0,
                  }}>
                    {tile.emoji}
                  </div>
                  <span style={{ lineHeight: 1.25, minHeight: isMobile ? 28 : 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {tile.name}
                  </span>
                  {isSel && (
                    <div style={{
                      position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
                      width: 10, height: 10, borderRadius: '50%',
                      background: C.primary, border: `2px solid ${C.white}`,
                      boxShadow: `0 0 0 2px ${C.primary}40`,
                      animation: 'mst-popIn 0.25s ease-out both',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Struggle tip */}
        {wrongCount >= 3 && !isComplete && (
          <p style={{
            textAlign: 'center', margin: 0, lineHeight: 1.4,
            fontSize: isMobile ? 11 : 12, color: '#B45309',
            fontFamily: "'Poppins', sans-serif", fontWeight: 500,
            background: '#FEF3C7', padding: '8px 14px', borderRadius: 10,
            animation: 'mst-fadeInUp 0.3s ease-out both',
          }}>
            💡 Tip: Transparent = clear view · Translucent = blurry · Opaque = no light at all.
          </p>
        )}

        {/* ══════════════════ COMPLETION ══════════════════ */}
        {isComplete && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: isMobile ? 14 : 18, padding: '8px 0',
          }}>
            {/* Trophy banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14,
              background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
              padding: isMobile ? '16px 20px' : '20px 28px',
              borderRadius: 16, border: `2px solid ${C.lightPurple}`,
              animation: 'mst-popIn 0.5s ease-out 0.2s both',
              boxShadow: '0 8px 24px rgba(74,77,201,0.15)',
              flexDirection: isMobile ? 'column' : 'row',
              textAlign: isMobile ? 'center' : 'left', maxWidth: '100%',
            }}>
              <span style={{ fontSize: isMobile ? 32 : 40, animation: 'mst-starSpin 1s ease-out 0.5s both', display: 'block' }}>🏆</span>
              <div>
                <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: C.purple, fontFamily: "'Poppins', sans-serif" }}>
                  All {totalTiles} sorted correctly!
                </div>
                <div style={{ fontSize: isMobile ? 12 : 13, color: C.primary, fontWeight: 500, fontFamily: "'Poppins', sans-serif", marginTop: 3 }}>
                  {wrongCount === 0 ? '🎯 Perfect — zero mistakes!' : `Accuracy: ${accuracy}% · ${wrongCount} wrong attempt${wrongCount !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: enableTimer ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gap: isMobile ? 8 : 12, width: '100%', maxWidth: 500,
              animation: 'mst-fadeInUp 0.5s ease-out 0.4s both',
            }}>
              <StatCard label="Correct" value={correctCount} emoji="✅" bg={C.greenBg} color="#166534" border={C.greenBorder} isMobile={isMobile} />
              <StatCard label="Wrong" value={wrongCount} emoji="❌" bg={C.redBg} color="#991B1B" border={C.redBorder} isMobile={isMobile} />
              {enableTimer && <StatCard label="Time" value={formatTime(seconds)} emoji="⏱️" bg="#EEF2FF" color={C.primary} border="#C7D2FE" isMobile={isMobile} />}
            </div>

            {/* Table 6.4 */}
            {showTableOnComplete && (
              <div style={{
                width: '100%', maxWidth: 700,
                background: C.white, border: `1.5px solid ${C.lightPurple}`,
                borderRadius: 16, overflow: 'hidden',
                animation: 'mst-fadeInUp 0.5s ease-out 0.6s both',
                boxShadow: '0 4px 16px rgba(74,77,201,0.08)',
              }}>
                {/* Table title */}
                <div style={{
                  background: `linear-gradient(135deg, ${C.purple}, ${C.primary})`,
                  padding: isMobile ? '12px 16px' : '13px 20px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>📋</span>
                  <div>
                    <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: C.white, fontFamily: "'Poppins', sans-serif" }}>
                      Table 6.4 — Classification of objects
                    </div>
                    <div style={{ fontSize: isMobile ? 10 : 11, color: 'rgba(255,255,255,0.75)', fontFamily: "'Poppins', sans-serif" }}>
                      {successMessage}
                    </div>
                  </div>
                </div>
                {/* Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 0 }}>
                  {BIN_DEFS.map((bin, bi) => (
                    <div key={bin.id} style={{
                      borderRight: bi < 2 && !isMobile ? `1px solid ${C.bgGrey}` : 'none',
                      borderBottom: isMobile && bi < 2 ? `1px solid ${C.bgGrey}` : 'none',
                    }}>
                      <div style={{
                        padding: isMobile ? '10px 14px' : '11px 14px',
                        background: bin.bg, textAlign: 'center',
                        fontSize: isMobile ? 12 : 13, fontWeight: 700,
                        color: bin.tagColor, fontFamily: "'Poppins', sans-serif",
                        borderBottom: `1px solid ${bin.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        <span>{bin.emoji}</span> {binLabels[bin.id]}
                      </div>
                      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {bins[bin.id].map((it, ri) => (
                          <div key={it.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', borderRadius: 8,
                            background: bin.chipBg, fontSize: isMobile ? 11 : 12, fontWeight: 600,
                            color: bin.chipColor, fontFamily: "'Poppins', sans-serif",
                            animation: `mst-tableRowIn 0.4s ease ${ri * 0.08}s both`,
                          }}>
                            <span style={{ fontSize: 15 }}>{it.emoji}</span>
                            {it.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key takeaway */}
            <div style={{
              background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
              border: `2px solid ${C.lightPurple}`, borderRadius: 14,
              padding: isMobile ? '12px 16px' : '14px 20px',
              maxWidth: 580, width: '100%',
              animation: 'mst-fadeInUp 0.5s ease-out 0.8s both',
            }}>
              <div style={{
                fontSize: isMobile ? 12 : 13, fontWeight: 700, color: C.purple,
                marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>📚</span> Remember
              </div>
              <p style={{
                margin: 0, fontSize: isMobile ? 11.5 : 12.5, color: C.dark,
                lineHeight: 1.55, fontFamily: "'Poppins', sans-serif",
              }}>
                <strong>Transparent</strong> = see clearly through it (glass, water, air).&nbsp;
                <strong>Translucent</strong> = light passes but view is blurry (butter paper, frosted glass).&nbsp;
                <strong>Opaque</strong> = no light passes through (wood, cardboard, metal).
              </p>
            </div>

            {/* Reset */}
            <button
              onClick={resetGame}
              style={{
                padding: isMobile ? '10px 22px' : '11px 26px', borderRadius: 24,
                border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 13 : 14, fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                background: `linear-gradient(135deg, ${C.primary}, ${C.purple})`,
                color: C.white, display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(74,77,201,0.25)',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                animation: 'mst-fadeInUp 0.4s ease-out 1s both',
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

// ─── Style helpers ───
const chipStyle = (bg: string, border: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 5,
  background: bg, border: `1px solid ${border}`,
  backdropFilter: 'blur(8px)', padding: '6px 11px', borderRadius: 14,
});
const chipText: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#ffffff' };

export default MaterialsSorterTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════