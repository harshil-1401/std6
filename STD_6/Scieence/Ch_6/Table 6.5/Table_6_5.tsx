// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: table65_recorder_tool.tsx
// Chapter 6 — Materials Around Us | Activity 6.7 — Table 6.5
// Digital recorder: Predict → Observe → Match → Synthesis
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';
type Verdict = 'dissolves' | 'does_not' | '';

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

interface MaterialRow {
  id: string;
  name: string;
  emoji: string;
  correctPredict: Verdict;
  correctObserve: Verdict;
  hintText: string;
}

interface TableAdditionalProps {
  materials?: MaterialRow[];
  showCorrectness?: boolean;
  showHints?: boolean;
  synthesisPrompt?: string;
  successMessage?: string;
}

interface Table65RecorderProps {
  props?: {
    width?: number;
    height?: number;
    data?: BaseDataInterface;
    initialMode?: ModeType;
    animationSpeed?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: TableAdditionalProps;
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

const IconSend: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconSparkle: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#FC9145' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

// ==================== DEFAULT DATA ====================

const DEFAULT_MATERIALS: MaterialRow[] = [
  {
    id: 'sugar', name: 'Sugar', emoji: '🍬',
    correctPredict: 'dissolves', correctObserve: 'dissolves',
    hintText: 'Sugar breaks into invisible particles — the solution is clear and sweet.',
  },
  {
    id: 'salt', name: 'Salt', emoji: '🧂',
    correctPredict: 'dissolves', correctObserve: 'dissolves',
    hintText: 'Salt is highly soluble — it disappears quickly when stirred in water.',
  },
  {
    id: 'chalk', name: 'Chalk powder', emoji: '⚪',
    correctPredict: 'does_not', correctObserve: 'does_not',
    hintText: 'Chalk is insoluble — it forms a cloudy suspension that settles over time.',
  },
  {
    id: 'sand', name: 'Sand', emoji: '🏖️',
    correctPredict: 'does_not', correctObserve: 'does_not',
    hintText: 'Sand is insoluble — it sinks to the bottom even after vigorous stirring.',
  },
  {
    id: 'sawdust', name: 'Sawdust', emoji: '🪵',
    correctPredict: 'does_not', correctObserve: 'does_not',
    hintText: 'Sawdust is insoluble — it floats or remains visible even after stirring.',
  },
];

const DEFAULT_SYNTHESIS_PROMPT =
  'Looking at your table, which kinds of solids dissolve in water and which do not? Write one sentence describing the pattern.';

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
  greenText: '#166534',
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

  .t65-root *, .t65-root *::before, .t65-root *::after {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  @keyframes t65-fadeInUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes t65-popIn {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.12); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes t65-slideInLeft {
    from { opacity: 0; transform: translateX(-24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes t65-confettiFall {
    0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
  }
  @keyframes t65-hintFade {
    from { opacity: 0; transform: translateY(6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes t65-rowIn {
    from { opacity: 0; transform: translateX(-10px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes t65-matchPop {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes t65-starSpin {
    from { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.3); }
    to   { transform: rotate(360deg) scale(1); }
  }

  /* Touch-friendly active states */
  .t65-btn-verdict { transition: all 0.18s ease; }
  .t65-btn-verdict:active { transform: scale(0.93); }

  .t65-btn-submit { transition: all 0.22s ease; }
  .t65-btn-submit:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
  .t65-btn-submit:active:not(:disabled) { transform: scale(0.97) translateY(0); }

  .t65-btn-secondary { transition: all 0.18s ease; }
  .t65-btn-secondary:hover { background: #F0EEFA !important; }
  .t65-btn-secondary:active { transform: scale(0.97); }

  .t65-btn-reset { transition: all 0.22s ease; }
  .t65-btn-reset:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .t65-btn-reset:active { transform: scale(0.97) translateY(0); }

  .t65-textarea { transition: border-color 0.2s ease; }
  .t65-textarea:focus { outline: none; border-color: #4A4DC9 !important; }
`;

// ==================== CONFETTI ====================

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const colors = [C.primary, C.orange, C.purple, C.amber, C.lightPurple, C.green, '#FFD700'];
  const pieces = Array.from({ length: 44 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 5 + Math.random() * 7,
    isCircle: Math.random() > 0.5,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 100 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: '-3%',
          width: p.size, height: p.isCircle ? p.size : p.size * 0.5,
          backgroundColor: p.color, borderRadius: p.isCircle ? '50%' : '2px',
          animation: `t65-confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

// ==================== VERDICT TOGGLE ====================
// Responsive: on very narrow containers renders icon-only, on medium shows short text, wide shows full label

interface VerdictToggleProps {
  value: Verdict;
  onChange: (v: Verdict) => void;
  disabled?: boolean;
  containerW: number; // actual container px — used for truly responsive sizing
}

const VerdictToggle: React.FC<VerdictToggleProps> = ({ value, onChange, disabled, containerW }) => {
  // Three display tiers based on actual container width
  const isXS = containerW < 380;   // icon-only
  const isSM = containerW < 560;   // short label

  const opts: { v: Verdict; icon: string; short: string; full: string }[] = [
    { v: 'dissolves',  icon: '✓', short: 'Yes', full: 'Dissolves' },
    { v: 'does_not',   icon: '✗', short: 'No',  full: 'Does not'  },
  ];

  const btnH = isXS ? 30 : 34;
  const btnPx = isXS ? 8 : isSM ? 10 : 14;
  const btnFs = isXS ? 11 : isSM ? 11 : 12;

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      opacity: disabled ? 0.5 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
    }}>
      {opts.map(opt => {
        const active = value === opt.v;
        const isDissolves = opt.v === 'dissolves';
        const activeBg   = isDissolves ? C.greenBg  : C.redBg;
        const activeBord = isDissolves ? C.green     : '#EF4444';
        const activeClr  = isDissolves ? C.greenText : C.redText;

        return (
          <button
            key={opt.v}
            className="t65-btn-verdict"
            onClick={() => onChange(active ? '' : opt.v)}
            title={opt.full}
            style={{
              height: btnH,
              padding: `0 ${btnPx}px`,
              minWidth: isXS ? btnH : 0,   // square on XS
              borderRadius: 999,
              border: `2px solid ${active ? activeBord : C.bgGrey}`,
              background: active ? activeBg : C.white,
              color: active ? activeClr : C.grey,
              fontFamily: "'Poppins', sans-serif",
              fontSize: btnFs,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isXS ? 0 : 3,
              lineHeight: 1,
            }}
          >
            {isXS ? opt.icon : isSM ? opt.short : opt.full}
          </button>
        );
      })}
    </div>
  );
};

// ==================== MATCH BADGE ====================

const MatchBadge: React.FC<{ match: boolean | null; sz: number }> = ({ match, sz }) => {
  if (match === null) {
    return (
      <div style={{
        width: sz, height: sz, borderRadius: '50%',
        background: C.bgGrey,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: sz * 0.45, color: C.grey, fontWeight: 700,
        fontFamily: "'Poppins', sans-serif",
      }}>–</div>
    );
  }
  return (
    <div style={{
      width: sz, height: sz, borderRadius: '50%',
      background: match ? C.greenBg : C.redBg,
      border: `2px solid ${match ? C.greenBorder : C.redBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 't65-matchPop 0.4s ease-out both',
      boxShadow: match
        ? '0 0 0 3px rgba(34,197,94,0.15)'
        : '0 0 0 3px rgba(239,68,68,0.12)',
    }}>
      {match
        ? <IconCheck size={Math.round(sz * 0.45)} color={C.greenText} />
        : <IconX    size={Math.round(sz * 0.45)} color={C.redText}   />}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const Table65RecorderTool: React.FC<Table65RecorderProps> = ({
  props: rawProps,
  setStepDetails,
}) => {
  const props = rawProps ?? {};

  const ap = props.additionalProps ?? {};
  const materials: MaterialRow[]  = ap.materials       ?? DEFAULT_MATERIALS;
  const showCorrectness           = ap.showCorrectness  ?? true;
  const showHints                 = ap.showHints        ?? true;
  const synthesisPrompt           = ap.synthesisPrompt  ?? DEFAULT_SYNTHESIS_PROMPT;
  const successMessage            = ap.successMessage   ?? 'Great observations! You matched the textbook results.';

  // ─── CONTAINER-AWARE RESPONSIVE ───────────────────────────────────────────
  // We measure our own container, not window.innerWidth, so the component
  // works correctly whether it's full-page or embedded in a narrow sidebar.
  const containerRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState<number>(700); // container width in px

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setCw(Math.round(w));
    });
    obs.observe(el);
    setCw(el.offsetWidth || 700);
    return () => obs.disconnect();
  }, []);

  // Breakpoints relative to the component's own width
  const isXS = cw < 380;   // very narrow (small mobile)
  const isSM = cw < 520;   // standard mobile
  const isMD = cw < 720;   // tablet / compact desktop

  // ─── ROW STATE ────────────────────────────────────────────────────────────
  type RowState = { predict: Verdict; observe: Verdict };
  const emptyRows = useCallback((): Record<string, RowState> =>
    Object.fromEntries(materials.map(m => [m.id, { predict: '', observe: '' }])),
    [materials]
  );

  const [rows,          setRows]          = useState<Record<string, RowState>>(emptyRows);
  const [synthesis,     setSynthesis]     = useState('');
  const [synthSubmitted,setSynthSubmitted]= useState(false);
  const [showConfetti,  setShowConfetti]  = useState(false);
  const [mounted,       setMounted]       = useState(false);

  // ─── INIT ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = 't65-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = STYLE_BLOCK;
      document.head.appendChild(el);
    }
    const t = setTimeout(() => setMounted(true), 40);
    return () => {
      clearTimeout(t);
      const el = document.getElementById(id);
      if (el) document.head.removeChild(el);
    };
  }, []);

  // ─── DERIVED ──────────────────────────────────────────────────────────────
  const rowData = useMemo(() => materials.map(m => {
    const row          = rows[m.id] ?? { predict: '', observe: '' };
    const predictFilled = row.predict !== '';
    const observeFilled = row.observe !== '';
    const bothFilled    = predictFilled && observeFilled;
    const match: boolean | null = bothFilled ? row.predict === row.observe : null;
    const observeWrong  = showCorrectness && observeFilled
      ? row.observe !== m.correctObserve : false;
    return { ...m, row, predictFilled, observeFilled, bothFilled, match, observeWrong };
  }), [materials, rows, showCorrectness]);

  const matchCount  = rowData.filter(r => r.match === true).length;
  const filledCount = rowData.filter(r => r.bothFilled).length;
  const allFilled   = filledCount === materials.length;
  const progressPct = materials.length > 0
    ? (filledCount / materials.length) * 100 : 0;

  // ─── STEP DETAILS ─────────────────────────────────────────────────────────
  useEffect(() => {
    setStepDetails?.({
      currentStep: filledCount,
      totalSteps: materials.length,
      isPaused: false,
      currentMode: 'practice',
    });
  }, [filledCount, materials.length, setStepDetails]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const updateRow = useCallback((id: string, field: 'predict' | 'observe', value: Verdict) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }, []);

  const handleSynthSubmit = useCallback(() => {
    if (synthesis.trim().length < 6) return;
    setSynthSubmitted(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  }, [synthesis]);

  const handleReset = useCallback(() => {
    setRows(emptyRows());
    setSynthesis('');
    setSynthSubmitted(false);
    setShowConfetti(false);
  }, [emptyRows]);

  // ─── LAYOUT TOKENS ────────────────────────────────────────────────────────
  const pad     = isXS ? 10 : isSM ? 14 : 20;
  const gap     = isXS ? 10 : isSM ? 14 : 18;
  const headerFs = isXS ? 13 : isSM ? 15 : 18;
  const badgeSz  = isXS ? 26 : isSM ? 28 : 34;

  // ─── TABLE COLUMN LAYOUT ──────────────────────────────────────────────────
  // On XS/SM we use a 2-row-per-material card layout instead of a 4-col grid.
  // On MD+ we use a proper grid.
  const useCardLayout = isSM; // cards for mobile, grid for tablet+

  // Grid column definition for MD+:
  // Material | Predict | Observe | Match
  const gridCols = isXS
    ? 'auto 1fr 1fr auto'
    : isMD
    ? '130px 1fr 1fr 40px'
    : '180px 1fr 1fr 46px';

  // ==================== RENDER ====================
  return (
    <div
      ref={containerRef}
      className="t65-root"
      style={{
        width: '100%',
        fontFamily: "'Poppins', sans-serif",
        background: '#FAFAFA',
        borderRadius: isXS ? 14 : 20,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 8px 40px rgba(74,77,201,0.10), 0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #E5E7EB',
      }}
    >
      <Confetti active={showConfetti} />

      {/* ══════════════════ HEADER ══════════════════ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.purple} 0%, ${C.primary} 100%)`,
        padding: isXS ? '12px 12px 10px' : isSM ? '14px 16px 12px' : '18px 24px 14px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -28, right: -18, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -22, left: 40, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isXS ? 8 : 10, position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: isXS ? 18 : 22, flexShrink: 0 }}>🧪</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              margin: 0,
              fontSize: headerFs,
              fontWeight: 800,
              color: C.white,
              fontFamily: "'Poppins', sans-serif",
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
              // Allow wrapping on narrow screens
              wordBreak: 'break-word',
            }}>
              Table 6.5 — Mixing Materials in Water
            </h2>
            <p style={{
              margin: '3px 0 0',
              fontSize: isXS ? 10 : 11,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.72)',
              fontFamily: "'Poppins', sans-serif",
              lineHeight: 1.3,
            }}>
              Chapter 6 · Activity 6.7 · Record predictions &amp; observations
            </p>
          </div>
        </div>

        {/* Score chips row — always below title (never tries to float right) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          marginTop: isXS ? 8 : 10,
          position: 'relative', zIndex: 1,
        }}>
          {/* Matched chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(34,197,94,0.22)',
            border: '1px solid rgba(134,239,172,0.5)',
            padding: '4px 10px', borderRadius: 12,
          }}>
            <IconCheck size={11} color="#BBF7D0" />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.white, fontFamily: "'Poppins', sans-serif" }}>
              {matchCount} matched
            </span>
          </div>
          {/* Progress chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid transparent',
            padding: '4px 10px', borderRadius: 12,
          }}>
            <span style={{ fontSize: 11 }}>📋</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.white, fontFamily: "'Poppins', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
              {filledCount}/{materials.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          marginTop: isXS ? 10 : 12,
          height: 6,
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            borderRadius: 4,
            background: allFilled
              ? `linear-gradient(90deg, ${C.green}, #4ADE80)`
              : `linear-gradient(90deg, ${C.amber}, ${C.orange})`,
            width: `${progressPct}%`,
            transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: progressPct > 0 ? '0 0 8px rgba(255,114,18,0.4)' : 'none',
          }} />
        </div>
      </div>

      {/* ══════════════════ BODY ══════════════════ */}
      <div style={{
        padding: `${pad}px ${pad}px ${pad + 4}px`,
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}>

        {/* Instruction pill */}
        <p style={{
          margin: 0,
          textAlign: 'center',
          fontSize: isXS ? 11 : isSM ? 12 : 13,
          color: '#6B7280',
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 500,
          lineHeight: 1.5,
          animation: mounted ? 't65-fadeInUp 0.4s ease-out both' : 'none',
          padding: `0 ${isXS ? 0 : 4}px`,
        }}>
          Choose <strong style={{ color: C.primary }}>Dissolves</strong> or <strong style={{ color: '#EF4444' }}>Does not</strong> for each material's <em>prediction</em>, then again after stirring for the <em>observation</em>. The <strong>Match</strong> column fills automatically.
        </p>

        {/* ─── TABLE CARD ─── */}
        <div style={{
          background: C.white,
          borderRadius: 14,
          border: `1.5px solid ${C.bgGrey}`,
          boxShadow: '0 4px 16px rgba(74,77,201,0.07)',
          overflow: 'hidden',
          animation: mounted ? 't65-slideInLeft 0.45s ease-out both' : 'none',
        }}>

          {/* ── Column Header ── shown only on grid layout */}
          {!useCardLayout && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              background: `linear-gradient(135deg, ${C.purple}EE, ${C.primary}EE)`,
              padding: isMD ? '10px 14px' : '12px 20px',
              gap: 8,
              alignItems: 'center',
            }}>
              {['Material', 'Predict', 'Observe', 'Match'].map((col, i) => (
                <div key={col} style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.white,
                  fontFamily: "'Poppins', sans-serif",
                  letterSpacing: 0.5,
                  textTransform: 'uppercase' as const,
                  textAlign: i === 3 ? 'center' : 'left' as const,
                  whiteSpace: 'nowrap' as const,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {col}
                </div>
              ))}
            </div>
          )}

          {/* ── Rows ── */}
          {rowData.map((rd, ri) => (
            <div
              key={rd.id}
              style={{
                borderBottom: ri < materials.length - 1 ? `1px solid ${C.bgGrey}` : 'none',
              }}
            >
              {useCardLayout ? (
                // ── CARD LAYOUT (mobile) ──────────────────────────────────
                // Row 1: emoji + name | Match badge
                // Row 2: Predict label + toggle | Observe label + toggle
                <div style={{
                  padding: isXS ? '10px 10px' : '12px 14px',
                  background: ri % 2 === 0 ? C.white : '#FAFBFF',
                  animation: `t65-rowIn 0.4s ease-out ${ri * 0.06}s both`,
                }}>
                  {/* Card row 1: name + badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                    gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: isXS ? 28 : 32, height: isXS ? 28 : 32,
                        borderRadius: 8, flexShrink: 0,
                        background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isXS ? 14 : 17,
                      }}>
                        {rd.emoji}
                      </div>
                      <span style={{
                        fontSize: isXS ? 12 : 13,
                        fontWeight: 700,
                        color: C.dark,
                        fontFamily: "'Poppins', sans-serif",
                        whiteSpace: 'nowrap' as const,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {rd.name}
                      </span>
                    </div>
                    <MatchBadge match={rd.match} sz={badgeSz} />
                  </div>

                  {/* Card row 2: Predict + Observe side by side */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: isXS ? 6 : 10,
                  }}>
                    {/* Predict */}
                    <div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: C.primary,
                        fontFamily: "'Poppins', sans-serif",
                        textTransform: 'uppercase' as const,
                        letterSpacing: 0.4, marginBottom: 5,
                      }}>Predict</div>
                      <VerdictToggle
                        value={rd.row.predict}
                        onChange={v => updateRow(rd.id, 'predict', v)}
                        containerW={cw}
                      />
                    </div>
                    {/* Observe */}
                    <div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: C.purple,
                        fontFamily: "'Poppins', sans-serif",
                        textTransform: 'uppercase' as const,
                        letterSpacing: 0.4, marginBottom: 5,
                      }}>Observe</div>
                      <VerdictToggle
                        value={rd.row.observe}
                        onChange={v => updateRow(rd.id, 'observe', v)}
                        containerW={cw}
                      />
                    </div>
                  </div>

                  {/* Wrong observation warning (card) */}
                  {rd.observeWrong && (
                    <div style={{
                      marginTop: 6,
                      fontSize: 11, color: C.amberText,
                      fontFamily: "'Poppins', sans-serif", fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 4,
                      animation: 't65-hintFade 0.3s ease-out both',
                    }}>
                      <span style={{ fontSize: 12 }}>⚠️</span> Check again
                    </div>
                  )}
                </div>

              ) : (
                // ── GRID LAYOUT (tablet / desktop) ───────────────────────
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  padding: isMD ? '12px 14px' : '14px 20px',
                  gap: 8,
                  alignItems: 'center',
                  background: ri % 2 === 0 ? C.white : '#FAFBFF',
                  animation: `t65-rowIn 0.4s ease-out ${ri * 0.07}s both`,
                }}>
                  {/* Material */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{
                      width: isMD ? 32 : 36, height: isMD ? 32 : 36, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isMD ? 16 : 20,
                    }}>
                      {rd.emoji}
                    </div>
                    <span style={{
                      fontSize: isMD ? 12 : 13, fontWeight: 600, color: C.dark,
                      fontFamily: "'Poppins', sans-serif",
                      whiteSpace: 'nowrap' as const,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {rd.name}
                    </span>
                  </div>

                  {/* Predict */}
                  <div>
                    <VerdictToggle
                      value={rd.row.predict}
                      onChange={v => updateRow(rd.id, 'predict', v)}
                      containerW={cw}
                    />
                  </div>

                  {/* Observe */}
                  <div>
                    <VerdictToggle
                      value={rd.row.observe}
                      onChange={v => updateRow(rd.id, 'observe', v)}
                      containerW={cw}
                    />
                    {rd.observeWrong && (
                      <div style={{
                        marginTop: 4, fontSize: 10.5, color: C.amberText,
                        fontFamily: "'Poppins', sans-serif", fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        <span style={{ fontSize: 11 }}>⚠️</span> Check again
                      </div>
                    )}
                  </div>

                  {/* Match */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <MatchBadge match={rd.match} sz={badgeSz} />
                  </div>
                </div>
              )}

              {/* Hint row */}
              {showHints && rd.observeWrong && (
                <div style={{
                  padding: isXS
                    ? '7px 10px 10px'
                    : isSM
                    ? '7px 14px 10px 44px'
                    : '8px 20px 12px 72px',
                  background: C.amberBg,
                  borderTop: `1px solid ${C.amberBorder}`,
                  animation: 't65-hintFade 0.35s ease-out both',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                    fontSize: isXS ? 11 : 12, color: C.amberText,
                    fontFamily: "'Poppins', sans-serif", fontWeight: 500, lineHeight: 1.4,
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💡</span>
                    <span>{rd.hintText}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ─── SUMMARY BAR ─── */}
        <div style={{
          background: allFilled
            ? `linear-gradient(135deg, ${C.greenBg}, #F0FFF4)`
            : `linear-gradient(135deg, ${C.lightOrange}, #FFFBF5)`,
          border: `2px solid ${allFilled ? C.greenBorder : C.amber}`,
          borderRadius: 14,
          padding: isXS ? '12px 12px' : isSM ? '14px 16px' : '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          animation: mounted ? 't65-fadeInUp 0.5s ease-out 0.3s both' : 'none',
        }}>
          {/* Status line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: isXS ? 22 : 26,
              animation: allFilled ? 't65-starSpin 1s ease-out both' : 'none',
              display: 'block', flexShrink: 0,
            }}>
              {allFilled ? '🏆' : '📊'}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: isXS ? 13 : isSM ? 14 : 15,
                fontWeight: 800,
                color: allFilled ? C.greenText : C.amberText,
                fontFamily: "'Poppins', sans-serif",
                lineHeight: 1.3,
              }}>
                {filledCount === 0
                  ? 'Start filling in the table above'
                  : allFilled
                  ? `${matchCount} of ${materials.length} predictions matched!`
                  : `${filledCount} of ${materials.length} rows completed…`}
              </div>
              {allFilled && (
                <div style={{
                  fontSize: isXS ? 11 : 12, color: C.greenText, fontWeight: 500,
                  fontFamily: "'Poppins', sans-serif", marginTop: 2,
                }}>
                  {matchCount === materials.length
                    ? '🎯 Perfect — all predictions correct!'
                    : successMessage}
                </div>
              )}
            </div>
          </div>

          {/* Mini match pills — wrap naturally, no overflow */}
          {filledCount > 0 && (
            <div style={{
              display: 'flex',
              gap: 5,
              flexWrap: 'wrap',
            }}>
              {rowData.map(rd => (
                <div key={rd.id} style={{
                  fontSize: isXS ? 10 : 11,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: rd.match === true ? C.greenBg : rd.match === false ? C.redBg : C.bgGrey,
                  border: `1.5px solid ${rd.match === true ? C.greenBorder : rd.match === false ? C.redBorder : C.bgGrey}`,
                  color: rd.match === true ? C.greenText : rd.match === false ? C.redText : C.grey,
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  animation: rd.bothFilled ? 't65-matchPop 0.35s ease-out both' : 'none',
                  whiteSpace: 'nowrap' as const,
                }}>
                  <span style={{ fontSize: 11 }}>{rd.emoji}</span>
                  {rd.match === true ? '✓' : rd.match === false ? '✗' : '–'}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── SYNTHESIS SECTION ─── */}
        <div style={{
          background: C.white,
          borderRadius: 14,
          border: `1.5px solid ${C.lightPurple}`,
          overflow: 'hidden',
          boxShadow: '0 4px 14px rgba(74,77,201,0.07)',
          animation: mounted ? 't65-fadeInUp 0.5s ease-out 0.5s both' : 'none',
        }}>
          {/* Synthesis header */}
          <div style={{
            background: `linear-gradient(120deg, ${C.lightOrange}, #FFFBF5 50%, ${C.lightPurple}44)`,
            padding: isXS ? '10px 12px' : isSM ? '12px 14px' : '14px 20px',
            borderBottom: `1px solid ${C.bgGrey}`,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <IconSparkle size={isXS ? 16 : 18} color={C.amber} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: isXS ? 12 : isSM ? 13 : 14,
                fontWeight: 700, color: C.purple,
                fontFamily: "'Poppins', sans-serif",
              }}>
                Synthesis — Find the Pattern
              </div>
              <div style={{
                fontSize: isXS ? 10 : 11,
                color: C.dark, fontFamily: "'Poppins', sans-serif", marginTop: 2,
                lineHeight: 1.45,
              }}>
                {synthesisPrompt}
              </div>
            </div>
          </div>

          {/* Synthesis input area */}
          <div style={{
            padding: isXS ? '12px' : isSM ? '14px' : '18px 20px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {!synthSubmitted ? (
              <>
                <textarea
                  className="t65-textarea"
                  value={synthesis}
                  onChange={e => setSynthesis(e.target.value)}
                  placeholder="e.g. Sugar and salt dissolve in water, but chalk, sand and sawdust do not…"
                  rows={isXS ? 3 : 4}
                  style={{
                    width: '100%',
                    padding: isXS ? '9px 11px' : '12px 14px',
                    borderRadius: 10,
                    border: `2px solid ${synthesis.length > 0 ? C.lightPurple : C.bgGrey}`,
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: isXS ? 12 : 13,
                    color: C.dark,
                    background: C.bgLight,
                    resize: 'vertical',
                    lineHeight: 1.5,
                    minHeight: isXS ? 72 : 90,
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  <span style={{
                    fontSize: isXS ? 10 : 11,
                    color: synthesis.trim().length < 6 ? C.grey : C.green,
                    fontFamily: "'Poppins', sans-serif", fontWeight: 500,
                  }}>
                    {synthesis.trim().length < 6 ? 'Write at least one sentence…' : '✓ Ready to submit'}
                  </span>
                  <button
                    className="t65-btn-submit"
                    onClick={handleSynthSubmit}
                    disabled={synthesis.trim().length < 6}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: isXS ? '8px 16px' : '10px 22px',
                      borderRadius: 999, border: 'none',
                      cursor: synthesis.trim().length < 6 ? 'not-allowed' : 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: isXS ? 12 : 13, fontWeight: 700, color: C.white,
                      background: synthesis.trim().length < 6
                        ? C.bgGrey
                        : `linear-gradient(135deg, ${C.primary}, ${C.purple})`,
                      boxShadow: synthesis.trim().length < 6
                        ? 'none' : '0 4px 14px rgba(74,77,201,0.28)',
                      opacity: synthesis.trim().length < 6 ? 0.6 : 1,
                    }}
                  >
                    <IconSend size={13} color="#fff" /> Submit
                  </button>
                </div>
              </>
            ) : (
              /* Submitted state */
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                animation: 't65-fadeInUp 0.45s ease-out both',
              }}>
                {/* Student's answer */}
                <div style={{
                  background: C.greenBg, border: `2px solid ${C.greenBorder}`,
                  borderRadius: 10, padding: isXS ? '10px 12px' : '14px 18px',
                }}>
                  <div style={{
                    fontSize: isXS ? 10 : 11, fontWeight: 700, color: C.greenText,
                    fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase' as const,
                    letterSpacing: 0.5, marginBottom: 5,
                  }}>✅ Your pattern</div>
                  <p style={{
                    margin: 0, fontSize: isXS ? 12 : 13, color: C.dark,
                    fontFamily: "'Poppins', sans-serif", lineHeight: 1.5, fontStyle: 'italic',
                  }}>
                    "{synthesis}"
                  </p>
                </div>

                {/* Textbook pattern */}
                <div style={{
                  background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                  border: `2px solid ${C.lightPurple}`, borderRadius: 10,
                  padding: isXS ? '10px 12px' : '14px 18px',
                }}>
                  <div style={{
                    fontSize: isXS ? 11 : 12, fontWeight: 700, color: C.purple,
                    marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5,
                    fontFamily: "'Poppins', sans-serif",
                  }}>
                    <span>📚</span> Textbook pattern
                  </div>
                  <p style={{
                    margin: 0, fontSize: isXS ? 11.5 : 12.5, color: C.dark,
                    fontFamily: "'Poppins', sans-serif", lineHeight: 1.55,
                  }}>
                    <strong>Soluble</strong> materials (sugar, salt) completely disappear when stirred — their particles are too small to see but are still present.&nbsp;
                    <strong>Insoluble</strong> materials (chalk powder, sand, sawdust) do not mix with water and remain visible even after stirring.
                  </p>
                </div>

                {/* Key concept pills — 2-column grid on XS so they don't overflow */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isXS ? '1fr 1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: isXS ? 6 : 8,
                }}>
                  {[
                    { emoji: '🫧', text: 'Soluble = disappears',    bg: C.greenBg,     border: C.greenBorder, color: C.greenText },
                    { emoji: '🪨', text: 'Insoluble = visible',     bg: C.redBg,       border: C.redBorder,   color: C.redText   },
                    { emoji: '♾️', text: 'Dissolved ≠ destroyed',   bg: C.lightOrange, border: C.amber,       color: C.amberText },
                    { emoji: '💧', text: 'Physical change only',    bg: '#EEF2FF',     border: C.lightPurple, color: C.primary   },
                  ].map(pill => (
                    <div key={pill.text} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: pill.bg, border: `1.5px solid ${pill.border}`,
                      borderRadius: 10, padding: isXS ? '6px 8px' : '6px 12px',
                      fontSize: isXS ? 10 : 11.5, fontWeight: 600, color: pill.color,
                      fontFamily: "'Poppins', sans-serif",
                      animation: 't65-popIn 0.4s ease-out both',
                    }}>
                      <span style={{ flexShrink: 0 }}>{pill.emoji}</span>
                      <span style={{ lineHeight: 1.3 }}>{pill.text}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  flexWrap: 'wrap',
                }}>
                  <button
                    className="t65-btn-secondary"
                    onClick={() => { setSynthesis(''); setSynthSubmitted(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: isXS ? '8px 14px' : '9px 18px', borderRadius: 999,
                      border: `2px solid ${C.lightPurple}`, cursor: 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: isXS ? 11 : 12, fontWeight: 600, color: C.primary,
                      background: C.white,
                    }}
                  >
                    Edit answer
                  </button>
                  <button
                    className="t65-btn-reset"
                    onClick={handleReset}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: isXS ? '8px 14px' : '9px 18px', borderRadius: 999,
                      border: 'none', cursor: 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: isXS ? 11 : 12, fontWeight: 700, color: C.white,
                      background: `linear-gradient(135deg, ${C.primary}, ${C.purple})`,
                      boxShadow: '0 4px 14px rgba(74,77,201,0.25)',
                    }}
                  >
                    <IconRotate size={13} color="#fff" /> Start over
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── LEGEND ─── */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: isXS ? 6 : 10,
          justifyContent: 'center',
          animation: mounted ? 't65-fadeInUp 0.4s ease-out 0.6s both' : 'none',
        }}>
          {[
            { color: C.greenBg, border: C.greenBorder, textColor: C.greenText, label: 'Dissolves in water' },
            { color: C.redBg,   border: C.redBorder,   textColor: C.redText,   label: 'Does not dissolve'  },
            { color: '#EEF2FF', border: C.lightPurple, textColor: C.primary,   label: 'Match ✓ = correct'  },
          ].map(l => (
            <div key={l.label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: isXS ? 10 : 11, fontWeight: 500,
              color: l.textColor, fontFamily: "'Poppins', sans-serif",
              whiteSpace: 'nowrap' as const,
            }}>
              <div style={{
                width: 11, height: 11, borderRadius: 3, flexShrink: 0,
                background: l.color, border: `1.5px solid ${l.border}`,
              }} />
              {l.label}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Table65RecorderTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════