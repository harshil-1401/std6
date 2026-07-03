// ═══════════════════════════════════════════════════════════════════════════
// File: MatterClassifier.tsx
// Chapter 6 — Materials Around Us | Two-Bin Classifier: Matter / Not Matter
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ==================== TYPE DEFINITIONS ====================

type BinId = 'matter' | 'notMatter';

interface TileData {
  id: string;
  label: string;
  emoji: string;
  answer: BinId;
  reason: string;
  hint: string;
}

interface TileState {
  status: 'idle' | 'correct';
  bin: BinId | null;
  shake: boolean;
  flash: boolean;
}

interface FeedbackState {
  text: string;
  kind: 'ok' | 'err';
}

interface GradeDef {
  min: number;
  label: string;
  color: string;
}

// ==================== DATA ====================

const TILES: TileData[] = [
  { id: 'water',    label: 'Water',      emoji: '💧', answer: 'matter',    reason: 'Water has mass and fills any container (takes space) → Matter ✓',                          hint: 'Can you pour water into a glass? Does it fill space and add weight?' },
  { id: 'stone',    label: 'Stone',      emoji: '🪨', answer: 'matter',    reason: 'Stone has measurable mass and clearly occupies space → Matter ✓',                         hint: 'Can you hold a stone? Does it weigh something and take up room?' },
  { id: 'air',      label: 'Air',        emoji: '💨', answer: 'matter',    reason: 'Air has mass (full balloon weighs more than empty) and takes up space → Matter ✓',        hint: 'Inflate a balloon — air fills it (takes space) and adds weight (has mass)!' },
  { id: 'sunlight', label: 'Sunlight',   emoji: '☀️', answer: 'notMatter', reason: 'Sunlight is electromagnetic radiation — no rest mass, no space occupied → Not Matter ✓', hint: 'Does sunlight have mass? Can you close it in a box? Check both conditions!' },
  { id: 'dream',    label: 'A Dream',    emoji: '🌙', answer: 'notMatter', reason: 'Dreams are mental experiences — no mass, no physical space occupied → Not Matter ✓',     hint: 'Does a dream weigh anything? Can you put one in a container?' },
  { id: 'wood',     label: 'Wood',       emoji: '🪵', answer: 'matter',    reason: 'Wood has mass and occupies space — a classic solid matter example → Matter ✓',           hint: 'Does wood weigh something? Does it take up space on a shelf?' },
  { id: 'milk',     label: 'Milk',       emoji: '🥛', answer: 'matter',    reason: 'Milk is a liquid with mass that fills and takes up space in a container → Matter ✓',      hint: 'Does a full glass weigh more than an empty one? Does milk fill the glass?' },
  { id: 'sound',    label: 'Sound',      emoji: '🔊', answer: 'notMatter', reason: 'Sound is a wave of energy (vibrations) — no mass, no space occupied → Not Matter ✓',     hint: 'Can you weigh sound? Can you put it in a box? It travels through matter but is not matter!' },
  { id: 'fire',     label: 'Fire Flame', emoji: '🔥', answer: 'notMatter', reason: 'A flame is light and heat energy — not a substance with rest mass → Not Matter ✓',       hint: 'The flame itself (light + heat) has no mass. What are the two conditions?' },
  { id: 'shadow',   label: 'Shadow',     emoji: '🌑', answer: 'notMatter', reason: 'A shadow is the absence of light — no mass, no physical space → Not Matter ✓',           hint: 'Can you weigh a shadow? Can you scoop it into a jar?' },
  { id: 'honey',    label: 'Honey',      emoji: '🍯', answer: 'matter',    reason: 'Honey is a thick liquid with mass that flows and occupies space → Matter ✓',              hint: 'Does honey have weight? Does it fill a jar? Apply the two-condition rule!' },
  { id: 'oxygen',   label: 'Oxygen',     emoji: '🫧', answer: 'matter',    reason: 'Oxygen gas has mass and takes up space — all gases are matter → Matter ✓',               hint: 'A full oxygen tank weighs more than an empty one. Does it take up space too?' },
];

const GRADES: GradeDef[] = [
  { min: 120, label: 'Scientist! 🏆',       color: '#4A4DC9' },
  { min: 90,  label: 'Lab Expert! 🥇',      color: '#533086' },
  { min: 60,  label: 'Good Thinker! 🥈',    color: '#FC9145' },
  { min: 0,   label: 'Keep Practicing! 💪', color: '#CACACA' },
];

const TOTAL = TILES.length;

// ==================== DESIGN TOKENS (Singularity palette) ====================

const C = {
  primary:      '#4A4DC9',
  purple:       '#533086',
  orange:       '#FF7212',
  amber:        '#FC9145',
  lavender:     '#C1C1EA',
  peach:        '#FFF3E4',
  dark:         '#4E4E4E',
  grey:         '#CACACA',
  bgGrey:       '#EBEBEB',
  bgLight:      '#F5F5F5',
  white:        '#FFFFFF',
  green:        '#22C55E',
  greenBg:      '#DCFCE7',
  greenBorder:  '#86EFAC',
  red:          '#EF4444',
  redBg:        '#FEE2E2',
  redBorder:    '#FCA5A5',
  // Matter bin — deep indigo
  matBg:        'linear-gradient(160deg, #EEF2FF, #F8F9FF)',
  matBgHov:     'linear-gradient(160deg, #C7D2FE, #EEF2FF)',
  matBorder:    '#C1C1EA',
  matBorderHov: '#4A4DC9',
  matGlow:      'rgba(74,77,201,0.22)',
  matTag:       '#312E81',
  matChipBg:    '#C7D2FE',
  matChipColor: '#312E81',
  // Not Matter bin — warm amber
  notBg:        'linear-gradient(160deg, #FFF3E4, #FFFBF5)',
  notBgHov:     'linear-gradient(160deg, #FFE5C7, #FFF3E4)',
  notBorder:    '#FC9145',
  notBorderHov: '#FF7212',
  notGlow:      'rgba(252,145,69,0.25)',
  notTag:       '#92400E',
  notChipBg:    '#FFD9B3',
  notChipColor: '#92400E',
};

// ==================== GLOBAL KEYFRAMES (injected once) ====================

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  @keyframes mc-fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mc-popIn {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.12); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes mc-shake {
    0%, 100%      { transform: translateX(0); }
    15%, 55%, 85% { transform: translateX(-7px); }
    35%, 70%      { transform: translateX(7px); }
  }
  @keyframes mc-flash {
    0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0); }
    50%  { box-shadow: 0 0 0 10px rgba(34,197,94,0.35); border-color: #22C55E; }
    100% { box-shadow: 0 0 0 0   rgba(34,197,94,0); }
  }
  @keyframes mc-tileIn {
    from { opacity: 0; transform: scale(0.88) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mc-chipIn {
    0%  { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.1); }
    100%{ transform: scale(1);  opacity: 1; }
  }
  @keyframes mc-hintIn {
    from { opacity: 0; transform: translateY(6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }
  @keyframes mc-confettiFall {
    0%   { transform: translateY(-8vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(108vh) rotate(720deg); opacity: 0; }
  }
  @keyframes mc-starSpin {
    from { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.3); }
    to   { transform: rotate(360deg) scale(1); }
  }
  @keyframes mc-shimmerMat {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

// ==================== HELPERS ====================

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  let s = Date.now();
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeInitialStates(): Record<string, TileState> {
  const out: Record<string, TileState> = {};
  TILES.forEach((t) => { out[t.id] = { status: 'idle', bin: null, shake: false, flash: false }; });
  return out;
}

function getGrade(score: number): GradeDef {
  return GRADES.find((g) => score >= g.min) ?? GRADES[GRADES.length - 1];
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ==================== CONFETTI ====================

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const colors = [C.primary, C.orange, C.purple, C.amber, C.lavender, C.green, '#FFD700'];
  const pieces = Array.from({ length: 55 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2.5,
    duration: 2.2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 5 + Math.random() * 9,
    isCircle: Math.random() > 0.5,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 100 }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute', left: `${p.left}%`, top: '-3%',
            width: p.size, height: p.isCircle ? p.size : p.size * 0.5,
            backgroundColor: p.color, borderRadius: p.isCircle ? '50%' : '2px',
            animation: `mc-confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
};

// ==================== STAT CARD ====================

const StatCard: React.FC<{
  label: string; value: string | number; emoji: string;
  bg: string; color: string; border: string;
}> = ({ label, value, emoji, bg, color, border }) => (
  <div style={{
    background: bg, border: `1.5px solid ${border}`, borderRadius: 12,
    padding: '12px 10px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 3, flex: 1,
  }}>
    <span style={{ fontSize: 18 }}>{emoji}</span>
    <span style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'Poppins', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </span>
    <span style={{ fontSize: 10, fontWeight: 600, color, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'Poppins', sans-serif" }}>
      {label}
    </span>
  </div>
);

// ==================== BIN DEFINITIONS ====================

interface BinDef {
  id: BinId;
  emoji: string;
  label: string;
  sub: string;
  bg: string;
  bgHov: string;
  border: string;
  borderHov: string;
  glow: string;
  tagColor: string;
  chipBg: string;
  chipColor: string;
  shimmer: boolean;
}

const BIN_DEFS: BinDef[] = [
  {
    id: 'matter', emoji: '⚗️', label: 'Matter', sub: 'Has mass + takes up space',
    bg: C.matBg, bgHov: C.matBgHov, border: C.matBorder, borderHov: C.matBorderHov,
    glow: C.matGlow, tagColor: C.matTag, chipBg: C.matChipBg, chipColor: C.matChipColor,
    shimmer: true,
  },
  {
    id: 'notMatter', emoji: '✨', label: 'Not Matter', sub: 'Missing mass or space',
    bg: C.notBg, bgHov: C.notBgHov, border: C.notBorder, borderHov: C.notBorderHov,
    glow: C.notGlow, tagColor: C.notTag, chipBg: C.notChipBg, chipColor: C.notChipColor,
    shimmer: false,
  },
];

// ==================== MAIN COMPONENT ====================

const MatterClassifier: React.FC = () => {
  // ── Responsive ──
  const [vw, setVw] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 980);
  const isMobile = vw < 600;
  const isTablet = vw >= 600 && vw < 900;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── State ──
  const [unsorted, setUnsorted]   = useState<TileData[]>(() => shuffleArray(TILES));
  const [bins, setBins]           = useState<Record<BinId, TileData[]>>({ matter: [], notMatter: [] });
  const [states, setStates]       = useState<Record<string, TileState>>(makeInitialStates);
  const [selected, setSelected]   = useState<TileData | null>(null);
  const [feedback, setFeedback]   = useState<FeedbackState | null>(null);
  const [correctCount, setCorrect] = useState(0);
  const [wrongCount, setWrong]    = useState(0);
  const [score, setScore]         = useState(0);
  const [seconds, setSeconds]     = useState(0);
  const [timerOn, setTimerOn]     = useState(true);
  const [hovBin, setHovBin]       = useState<BinId | null>(null);
  const [hovTile, setHovTile]     = useState<string | null>(null);
  const [isComplete, setComplete] = useState(false);
  const [showConfetti, setConfetti] = useState(false);
  const [isBusy, setIsBusy]       = useState(false);
  const [mounted, setMounted]     = useState(false);

  const fbTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsortedRef = useRef<TileData[]>([]);
  unsortedRef.current = unsorted;

  // ── Inject keyframes once ──
  useEffect(() => {
    const id = 'mc-keyframes';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById(id); if (e) e.remove(); };
  }, []);

  // ── Mount animation trigger ──
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  // ── Timer ──
  useEffect(() => {
    if (!timerOn || isComplete) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerOn, isComplete]);

  // ── Derived ──
  const sortedCount = bins.matter.length + bins.notMatter.length;
  const progressPct = TOTAL > 0 ? (sortedCount / TOTAL) * 100 : 0;
  const accuracy    = (correctCount + wrongCount) > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 100;

  // ── Responsive tokens ──
  const pad          = isMobile ? 12 : 18;
  const tileMinW     = isMobile ? 95 : isTablet ? 112 : 125;
  const tileEmojiSz  = isMobile ? 24 : 28;
  const tileFontSz   = isMobile ? 10 : 11;
  const binMinH      = isMobile ? 140 : 165;
  const headerH1Sz   = isMobile ? 15 : 19;
  const binCols      = isMobile ? '1fr' : 'repeat(2, 1fr)';

  // ── Core sort logic ──
  const sortTile = useCallback((tile: TileData, binId: BinId) => {
    if (isBusy) return;
    if (fbTimer.current) clearTimeout(fbTimer.current);
    setIsBusy(true);

    const correct = tile.answer === binId;

    if (correct) {
      setCorrect((c) => c + 1);
      setScore((s) => s + 10);
      setFeedback({ text: tile.reason, kind: 'ok' });
      setUnsorted((prev) => prev.filter((t) => t.id !== tile.id));
      setBins((prev) => ({ ...prev, [binId]: [...prev[binId], tile] }));
      setStates((prev) => ({ ...prev, [tile.id]: { ...prev[tile.id], status: 'correct', bin: binId, flash: true } }));
      setTimeout(() => setStates((prev) => ({ ...prev, [tile.id]: { ...prev[tile.id], flash: false } })), 700);
      setSelected(null);

      fbTimer.current = setTimeout(() => { setFeedback(null); setIsBusy(false); }, 2300);

      // Check completion against ref so value is fresh
      const remaining = unsortedRef.current.filter((t) => t.id !== tile.id).length;
      if (remaining <= 0) {
        setTimeout(() => {
          setComplete(true);
          setTimerOn(false);
          setConfetti(true);
          setTimeout(() => setConfetti(false), 4500);
        }, 900);
      }
    } else {
      setWrong((w) => w + 1);
      setStates((prev) => ({ ...prev, [tile.id]: { ...prev[tile.id], shake: true } }));
      setFeedback({ text: tile.hint, kind: 'err' });
      setSelected(null);
      fbTimer.current = setTimeout(() => {
        setStates((prev) => ({ ...prev, [tile.id]: { ...prev[tile.id], shake: false } }));
        setFeedback(null);
        setIsBusy(false);
      }, 2500);
    }
    setHovBin(null);
  }, [isBusy]);

  const handleTileTap = useCallback((tile: TileData) => {
    if (isBusy) return;
    if (selected?.id === tile.id) { setSelected(null); return; }
    setSelected(tile);
    setFeedback(null);
  }, [selected, isBusy]);

  const handleBinTap = useCallback((binId: BinId) => {
    if (!selected || isBusy) return;
    sortTile(selected, binId);
  }, [selected, isBusy, sortTile]);

  const handleDragStart = useCallback((tile: TileData) => {
    if (isBusy) return;
    setSelected(tile);
    setFeedback(null);
  }, [isBusy]);

  const handleDrop = useCallback((binId: BinId) => {
    if (!selected || isBusy) return;
    sortTile(selected, binId);
  }, [selected, isBusy, sortTile]);

  const resetGame = useCallback(() => {
    setUnsorted(shuffleArray(TILES));
    setBins({ matter: [], notMatter: [] });
    setStates(makeInitialStates());
    setSelected(null); setFeedback(null);
    setCorrect(0); setWrong(0); setScore(0);
    setComplete(false); setConfetti(false);
    setIsBusy(false); setSeconds(0); setTimerOn(true);
  }, []);

  const grade = getGrade(score);

  // ==================== RENDER ====================
  return (
    <div style={{
      width: '100%', maxWidth: 900, margin: '0 auto',
      fontFamily: "'Poppins', sans-serif",
      background: '#FAFAFA', borderRadius: 20, overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 8px 40px rgba(74,77,201,0.10), 0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #E5E7EB',
    }}>
      <Confetti active={showConfetti} />

      {/* ══ HEADER ══ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.purple} 0%, ${C.primary} 100%)`,
        padding: isMobile ? '14px 16px 12px' : '20px 26px 16px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -24, left: 50, width: 75, height: 75, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        {/* Title row */}
        <div style={{
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 10 : 0, position: 'relative', zIndex: 1,
        }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: isMobile ? 20 : 26 }}>⚗️</span>
              <h2 style={{ margin: 0, fontSize: headerH1Sz, fontWeight: 800, color: C.white, fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                Matter or Not Matter?
              </h2>
            </div>
            <p style={{ margin: '0 0 0 36px', fontSize: isMobile ? 10 : 11.5, fontWeight: 400, color: 'rgba(255,255,255,0.72)', fontFamily: "'Poppins', sans-serif" }}>
              Chapter 6 · Activity&nbsp;|&nbsp;Rule: Has mass AND takes up space
            </p>
          </div>

          {/* Score chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
            {/* Correct */}
            <div style={chipStyle('rgba(34,197,94,0.22)', 'rgba(134,239,172,0.5)')}>
              <span style={{ fontSize: 11 }}>✅</span>
              <span style={chipText}>{correctCount}</span>
            </div>
            {/* Wrong */}
            <div style={chipStyle('rgba(239,68,68,0.22)', 'rgba(252,165,165,0.5)')}>
              <span style={{ fontSize: 11 }}>❌</span>
              <span style={chipText}>{wrongCount}</span>
            </div>
            {/* Timer */}
            <div style={chipStyle('rgba(255,255,255,0.18)', 'rgba(255,255,255,0.25)')}>
              <span style={{ fontSize: 11 }}>⏱️</span>
              <span style={{ ...chipText, fontVariantNumeric: 'tabular-nums' }}>{formatTime(seconds)}</span>
            </div>
            {/* Progress */}
            <div style={chipStyle('rgba(255,255,255,0.15)', 'transparent')}>
              <span style={{ fontSize: 13 }}>🎯</span>
              <span style={{ ...chipText, fontVariantNumeric: 'tabular-nums' }}>{sortedCount}/{TOTAL}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: isMobile ? 12 : 14, height: 7, background: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden' }}>
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

      {/* ══ BODY ══ */}
      <div style={{ padding: `${pad}px ${pad}px ${pad + 4}px`, display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 14 }}>

        {/* Definition pill */}
        {!isComplete && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
            border: `1.5px solid ${C.lavender}`, borderRadius: 999,
            padding: '8px 20px', alignSelf: 'center',
            animation: mounted ? 'mc-fadeInUp 0.4s ease-out both' : 'none',
          }}>
            <span style={{ fontSize: 15 }}>📖</span>
            <span style={{ fontSize: isMobile ? 11 : 12.5, fontWeight: 700, color: C.purple, fontFamily: "'Poppins', sans-serif" }}>
              Matter = has mass + takes up space
            </span>
          </div>
        )}

        {/* Instruction */}
        {!isComplete && (
          <p style={{
            textAlign: 'center', margin: 0,
            fontSize: isMobile ? 12 : 13, color: '#6B7280',
            fontFamily: "'Poppins', sans-serif", fontWeight: 500,
            animation: mounted ? 'mc-fadeInUp 0.45s ease-out both' : 'none',
            lineHeight: 1.45,
          }}>
            {selected
              ? <><span>Tap a bin to place </span><strong style={{ color: C.primary }}>"{selected.label}"</strong></>
              : <span>{isMobile ? 'Tap a tile, then tap a bin' : 'Tap a tile then tap a bin · or drag & drop'}</span>
            }
          </p>
        )}

        {/* ── BINS ── */}
        {!isComplete && (
          <div style={{ display: 'grid', gridTemplateColumns: binCols, gap: isMobile ? 10 : 14 }}>
            {BIN_DEFS.map((bin) => {
              const isHov = hovBin === bin.id;
              const binItems = bins[bin.id];
              return (
                <div
                  key={bin.id}
                  onDragOver={(e) => { e.preventDefault(); setHovBin(bin.id); }}
                  onDragLeave={() => setHovBin(null)}
                  onDrop={(e) => { e.preventDefault(); handleDrop(bin.id); }}
                  onClick={() => handleBinTap(bin.id)}
                  style={{
                    minHeight: binMinH, borderRadius: 16,
                    padding: isMobile ? 12 : 16,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    background: isHov ? bin.bgHov : bin.bg,
                    border: `2.5px dashed ${isHov ? bin.borderHov : bin.border}`,
                    cursor: selected ? 'pointer' : 'default',
                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                    transform: isHov ? 'scale(1.015)' : 'scale(1)',
                    boxShadow: isHov
                      ? `0 0 0 4px ${bin.glow}, 0 8px 24px ${bin.glow}`
                      : '0 2px 8px rgba(0,0,0,0.04)',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* Shimmer overlay for matter bin */}
                  {bin.shimmer && (
                    <div style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%)',
                      backgroundSize: '200% 100%',
                      animation: 'mc-shimmerMat 4s ease-in-out infinite',
                    }} />
                  )}

                  {/* Bin heading */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                    <span style={{ fontSize: isMobile ? 20 : 24 }}>{bin.emoji}</span>
                    <span style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: bin.tagColor, fontFamily: "'Poppins', sans-serif" }}>
                      {bin.label}
                    </span>
                  </div>

                  {/* Sub-label */}
                  <span style={{
                    fontSize: isMobile ? 10 : 11, fontWeight: 500, color: bin.tagColor, opacity: 0.72,
                    position: 'relative', zIndex: 1, textAlign: 'center',
                  }}>
                    {binItems.length} sorted · {bin.sub}
                  </span>

                  {/* Placed chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                    {binItems.length === 0 ? (
                      <span style={{ fontSize: isMobile ? 11 : 12, color: bin.tagColor, opacity: 0.45, fontStyle: 'italic', fontFamily: "'Poppins', sans-serif" }}>
                        Drop tiles here…
                      </span>
                    ) : (
                      binItems.map((t, ci) => (
                        <span key={t.id} style={{
                          fontSize: isMobile ? 10 : 11, padding: '3px 9px', borderRadius: 10,
                          background: bin.chipBg, color: bin.chipColor, fontWeight: 600,
                          fontFamily: "'Poppins', sans-serif",
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          animation: `mc-chipIn 0.35s ease-out ${ci * 0.04}s both`,
                        }}>
                          <span style={{ fontSize: 12 }}>{t.emoji}</span>
                          {t.label}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FEEDBACK BANNER ── */}
        {feedback && !isComplete && (
          <div style={{
            background: feedback.kind === 'ok' ? C.greenBg : '#FEF3C7',
            border: `2px solid ${feedback.kind === 'ok' ? C.greenBorder : '#F59E0B'}`,
            borderRadius: 12,
            padding: isMobile ? '10px 14px' : '12px 18px',
            fontSize: isMobile ? 12 : 13, fontWeight: 500,
            color: feedback.kind === 'ok' ? '#166534' : '#92400E',
            fontFamily: "'Poppins', sans-serif", textAlign: 'center',
            animation: 'mc-hintIn 0.35s ease-out both',
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
            lineHeight: 1.45,
          }}>
            <span style={{ fontSize: 17, flexShrink: 0 }}>{feedback.kind === 'ok' ? '✅' : '💡'}</span>
            <span>{feedback.text}</span>
          </div>
        )}

        {/* ── TILE BANK ── */}
        {!isComplete && unsorted.length > 0 && (
          <div>
            <p style={{
              margin: '0 0 10px 0', fontSize: 11, fontWeight: 700, color: C.grey,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              fontFamily: "'Poppins', sans-serif",
            }}>
              Tiles to sort — {unsorted.length} remaining
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${tileMinW}px, 1fr))`,
              gap: isMobile ? 8 : 10,
            }}>
              {TILES.map((tile, i) => {
                const st = states[tile.id];
                if (st.status === 'correct') return null;
                const isSel  = selected?.id === tile.id;
                const isHov  = hovTile === tile.id;
                const isShake = st.shake;
                const isFlash = st.flash;
                return (
                  <div
                    key={tile.id}
                    draggable={!isBusy}
                    onDragStart={() => handleDragStart(tile)}
                    onDragEnd={() => { setSelected(null); setHovBin(null); }}
                    onClick={() => handleTileTap(tile)}
                    onMouseEnter={() => setHovTile(tile.id)}
                    onMouseLeave={() => setHovTile(null)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: isMobile ? '10px 8px' : '13px 10px',
                      borderRadius: 14, background: C.white,
                      border: `2px solid ${isSel ? C.primary : isHov ? C.lavender : '#E5E7EB'}`,
                      cursor: isBusy ? 'default' : 'grab',
                      fontSize: tileFontSz, fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif", color: C.dark,
                      userSelect: 'none', position: 'relative', textAlign: 'center',
                      transition: isShake || isFlash ? 'none' : 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                      transform: isSel ? 'scale(1.06)' : isHov ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
                      boxShadow: isSel
                        ? `0 0 0 3px ${C.primary}30, 0 6px 20px rgba(74,77,201,0.15)`
                        : isHov ? '0 4px 14px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.04)',
                      animation: isShake
                        ? 'mc-shake 0.5s ease-in-out'
                        : isFlash
                          ? 'mc-flash 0.6s ease-out'
                          : `mc-tileIn 0.4s ease-out ${i * 0.045}s both`,
                    }}
                  >
                    {/* Emoji container */}
                    <div style={{
                      width: isMobile ? 40 : 46, height: isMobile ? 40 : 46, borderRadius: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
                      fontSize: tileEmojiSz, flexShrink: 0,
                    }}>
                      {tile.emoji}
                    </div>
                    <span style={{ lineHeight: 1.25, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {tile.label}
                    </span>
                    {/* Selection dot */}
                    {isSel && (
                      <div style={{
                        position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
                        width: 10, height: 10, borderRadius: '50%',
                        background: C.primary, border: `2px solid ${C.white}`,
                        boxShadow: `0 0 0 2px ${C.primary}40`,
                        animation: 'mc-popIn 0.25s ease-out both',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Mobile tap hint */}
            {isMobile && (
              <p style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: C.primary, fontWeight: 600, fontFamily: "'Poppins', sans-serif" }}>
                {selected
                  ? `"${selected.label}" selected — tap a bin above ↑`
                  : 'Tap a tile, then tap a bin above'}
              </p>
            )}
          </div>
        )}

        {/* Struggle tip */}
        {wrongCount >= 3 && !isComplete && (
          <p style={{
            textAlign: 'center', margin: 0, lineHeight: 1.4,
            fontSize: isMobile ? 11 : 12, color: '#B45309',
            fontFamily: "'Poppins', sans-serif", fontWeight: 500,
            background: '#FEF3C7', padding: '8px 14px', borderRadius: 10,
            animation: 'mc-fadeInUp 0.3s ease-out both',
          }}>
            💡 Tip: Matter needs BOTH conditions — mass AND space. Energy forms (light, sound, heat) have neither.
          </p>
        )}

        {/* ══ COMPLETION ══ */}
        {isComplete && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 14 : 18, padding: '8px 0' }}>

            {/* Trophy banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16,
              background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
              padding: isMobile ? '16px 20px' : '20px 30px',
              borderRadius: 16, border: `2px solid ${C.lavender}`,
              animation: 'mc-popIn 0.5s ease-out 0.2s both',
              boxShadow: '0 8px 24px rgba(74,77,201,0.15)',
              flexDirection: isMobile ? 'column' : 'row',
              textAlign: isMobile ? 'center' : 'left', maxWidth: '100%',
            }}>
              <span style={{ fontSize: isMobile ? 34 : 44, animation: 'mc-starSpin 1s ease-out 0.5s both', display: 'block' }}>🏆</span>
              <div>
                <div style={{ fontSize: isMobile ? 17 : 21, fontWeight: 800, color: C.purple, fontFamily: "'Poppins', sans-serif" }}>
                  All {TOTAL} tiles sorted!
                </div>
                <div style={{ fontSize: isMobile ? 12 : 13.5, color: C.primary, fontWeight: 600, fontFamily: "'Poppins', sans-serif", marginTop: 3 }}>
                  {grade.label}
                </div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: '#6B7280', fontFamily: "'Poppins', sans-serif", marginTop: 2 }}>
                  {wrongCount === 0 ? '🎯 Perfect — zero mistakes!' : `Accuracy: ${accuracy}% · ${wrongCount} wrong attempt${wrongCount !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{
              display: 'flex', gap: isMobile ? 8 : 12, width: '100%', maxWidth: 480,
              animation: 'mc-fadeInUp 0.5s ease-out 0.4s both',
            }}>
              <StatCard label="Score"   value={score}           emoji="⭐" bg="#EEF2FF"   color={C.primary} border="#C7D2FE"     />
              <StatCard label="Correct" value={correctCount}    emoji="✅" bg={C.greenBg} color="#166534"   border={C.greenBorder} />
              <StatCard label="Wrong"   value={wrongCount}      emoji="❌" bg={C.redBg}   color="#991B1B"   border={C.redBorder}   />
              <StatCard label="Time"    value={formatTime(seconds)} emoji="⏱️" bg="#EEF2FF" color={C.primary} border="#C7D2FE"  />
            </div>

            {/* Key takeaway */}
            <div style={{
              background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
              border: `2px solid ${C.lavender}`, borderRadius: 14,
              padding: isMobile ? '12px 16px' : '16px 22px',
              maxWidth: 560, width: '100%',
              animation: 'mc-fadeInUp 0.5s ease-out 0.6s both',
            }}>
              <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: C.purple, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Poppins', sans-serif" }}>
                <span>📚</span> Key Takeaway
              </div>
              <p style={{ margin: 0, fontSize: isMobile ? 11.5 : 12.5, color: C.dark, lineHeight: 1.6, fontFamily: "'Poppins', sans-serif" }}>
                <strong>Matter</strong> must satisfy BOTH conditions: it has <strong>mass</strong> (can be weighed) AND it <strong>takes up space</strong> (has volume).
                Sunlight, sound, shadow, dreams, and fire flames fail one or both — so they are <strong>not matter</strong>.
              </p>
            </div>

            {/* Reset button */}
            <button
              onClick={resetGame}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(74,77,201,0.32)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(74,77,201,0.25)';
              }}
              style={{
                padding: isMobile ? '10px 24px' : '12px 30px', borderRadius: 24,
                border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 13 : 14, fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                background: `linear-gradient(135deg, ${C.primary}, ${C.purple})`,
                color: C.white, display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(74,77,201,0.25)',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                animation: 'mc-fadeInUp 0.4s ease-out 0.8s both',
              }}
            >
              ↺ Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Style helpers (same pattern as reference) ──
const chipStyle = (bg: string, border: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 5,
  background: bg, border: `1px solid ${border}`,
  backdropFilter: 'blur(8px)', padding: '6px 11px', borderRadius: 14,
});
const chipText: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#ffffff', fontFamily: "'Poppins', sans-serif",
};

export default MatterClassifier;