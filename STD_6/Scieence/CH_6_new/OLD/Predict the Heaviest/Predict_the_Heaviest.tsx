import React, { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────
// INLINE SVG ICONS — zero external deps
// ─────────────────────────────────────────────────────────────────

const IconCheck: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconX: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconReset: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
  </svg>
);

const IconStar: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = '#FF7212' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// KEYFRAMES
// ─────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

  @keyframes mq_fadeIn {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mq_slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mq_shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-7px); }
    40%     { transform: translateX(7px); }
    60%     { transform: translateX(-5px); }
    80%     { transform: translateX(5px); }
  }
  @keyframes mq_lockIn {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.07); }
    75%  { transform: scale(0.97); }
    100% { transform: scale(1); }
  }
  @keyframes mq_gradShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes mq_pop {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes mq_tilt {
    0%   { transform: rotate(0deg); }
    25%  { transform: rotate(-4deg); }
    75%  { transform: rotate(4deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes mq_bounce {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-6px); }
  }
  @keyframes mq_hintSlide {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mq_starPop {
    0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
    60%  { transform: scale(1.2) rotate(5deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes mq_progressFill {
    from { width: 0%; }
    to   { width: var(--target-width); }
  }
`;

// ─────────────────────────────────────────────────────────────────
// COLOUR PALETTE — matches design PDF exactly
// ─────────────────────────────────────────────────────────────────

const C = {
  primary:      '#4A4DC9',
  primaryLight: '#C1C1EA',
  accent:       '#FF7212',
  accentLight:  '#FFF3E4',
  gradStart:    '#533086',
  gradEnd:      '#FC9145',
  textDark:     '#1a1a2e',
  textMid:      '#4E4E4E',
  textLight:    '#CACACA',
  bg:           '#F5F5F5',
  white:        '#ffffff',
  success:      '#22c55e',
  successBg:    '#dcfce7',
  successText:  '#14532d',
  error:        '#ef4444',
  errorBg:      '#fee2e2',
  errorText:    '#7f1d1d',
  disabled:     '#EBEBEB',
};
const F = 'Poppins, sans-serif';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface Choice {
  id: string;
  label: string;
}

interface Question {
  id: number;
  text: string;
  sub?: string;
  choices: Choice[];
  correctId: string;
  reason: string;
  hint: string;
  renderScene: () => React.ReactNode;
}

interface MassQuizProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: {
      questions?: Question[];
      finalMessage?: string;
    };
  };
  setStepDetails?: (d: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────
// INLINE SCENE ILLUSTRATIONS — pure SVG, no external resources
// ─────────────────────────────────────────────────────────────────

/** Q1: Three identical cups — A(water), B(sand), C(pebbles) */
const SceneCups: React.FC = () => (
  <svg viewBox="0 0 340 170" width="100%" style={{ maxWidth: 340, display: 'block', margin: '0 auto' }}>
    {/* labels */}
    {(['A','B','C'] as const).map((lbl, i) => (
      <text key={lbl} x={50 + i * 120} y={16} textAnchor="middle" fontFamily={F} fontWeight={700} fontSize={13}
        fill={['#4A4DC9','#533086','#FF7212'][i]}>{lbl}</text>
    ))}

    {/* Cup A — water */}
    {/* cup body */}
    <path d="M22 30 L18 145 H82 L78 30 Z" fill="#EFF6FF" stroke="#4A4DC9" strokeWidth="2" />
    {/* water fill */}
    <path d="M22.8 80 L19.5 145 H80.5 L77.2 80 Z" fill="#93C5FD" opacity="0.7" />
    {/* water surface ripple */}
    <ellipse cx="50" cy="80" rx="27" ry="4" fill="#BFDBFE" />
    <text x="50" y="158" textAnchor="middle" fontFamily={F} fontSize={10} fill={C.textMid}>Water</text>
    {/* handle */}
    <path d="M78 55 Q95 55 95 75 Q95 95 78 95" fill="none" stroke="#4A4DC9" strokeWidth="2" />

    {/* Cup B — sand */}
    <path d="M142 30 L138 145 H202 L198 30 Z" fill="#FEF9C3" stroke="#533086" strokeWidth="2" />
    {/* sand fill (many small dots) */}
    <rect x="139.5" y="70" width="61" height="75" rx="1" fill="#FCD34D" opacity="0.8" />
    <ellipse cx="170" cy="70" rx="30" ry="5" fill="#F59E0B" opacity="0.9" />
    {/* texture dots */}
    {[148,155,163,171,179,187,194].map((x,i) => (
      <circle key={i} cx={x} cy={85 + (i%3)*8} r="2" fill="#D97706" opacity="0.5" />
    ))}
    <text x="170" y="158" textAnchor="middle" fontFamily={F} fontSize={10} fill={C.textMid}>Sand</text>
    <path d="M198 55 Q215 55 215 75 Q215 95 198 95" fill="none" stroke="#533086" strokeWidth="2" />

    {/* Cup C — pebbles */}
    <path d="M262 30 L258 145 H322 L318 30 Z" fill="#F1F5F9" stroke="#FF7212" strokeWidth="2" />
    {/* pebble fill */}
    <rect x="259.5" y="75" width="61" height="70" rx="1" fill="#CBD5E1" opacity="0.5" />
    {/* pebbles */}
    {[
      {cx:272,cy:130,rx:9,ry:6},{cx:288,cy:125,rx:11,ry:7},{cx:303,cy:132,rx:8,ry:6},
      {cx:278,cy:112,rx:10,ry:6},{cx:295,cy:108,rx:9,ry:6},{cx:309,cy:116,rx:8,ry:5},
      {cx:268,cy:95,rx:8,ry:5}, {cx:283,cy:93,rx:10,ry:6},{cx:300,cy:97,rx:9,ry:5},
    ].map((p,i) => (
      <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
        fill={['#94A3B8','#64748B','#CBD5E1'][i%3]} stroke="#475569" strokeWidth="0.8" />
    ))}
    <text x="290" y="158" textAnchor="middle" fontFamily={F} fontSize={10} fill={C.textMid}>Pebbles</text>
    <path d="M318 55 Q335 55 335 75 Q335 95 318 95" fill="none" stroke="#FF7212" strokeWidth="2" />
  </svg>
);

/** Q2: Balance scale — cotton wool vs water */
const SceneBalance: React.FC = () => (
  <svg viewBox="0 0 320 175" width="100%" style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}>
    {/* pivot post */}
    <rect x="156" y="60" width="8" height="95" rx="4" fill="#64748B" />
    <circle cx="160" cy="60" r="10" fill="#475569" />
    {/* beam — tilted: cotton side up, water side down */}
    <line x1="30" y1="70" x2="290" y2="90" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
    {/* left string + pan (cotton — lighter, higher) */}
    <line x1="60" y1="72" x2="60" y2="100" stroke="#64748B" strokeWidth="2" />
    <ellipse cx="60" cy="108" rx="34" ry="9" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
    {/* cotton wool — fluffy circles */}
    {[{cx:47,cy:95},{cx:60,cy:89},{cx:73,cy:93},{cx:52,cy:83},{cx:67,cy:83}].map((p,i)=>(
      <circle key={i} cx={p.cx} cy={p.cy} r={9} fill="white" stroke="#CBD5E1" strokeWidth="1" />
    ))}
    <text x="60" y="130" textAnchor="middle" fontFamily={F} fontSize={10} fill={C.textMid}>Cotton</text>
    <text x="60" y="142" textAnchor="middle" fontFamily={F} fontSize={10} fill={C.textMid}>Wool</text>

    {/* right string + pan (water — heavier, lower) */}
    <line x1="260" y1="91" x2="260" y2="126" stroke="#64748B" strokeWidth="2" />
    <ellipse cx="260" cy="134" rx="34" ry="9" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
    {/* glass of water */}
    <path d="M246 110 L243 134 H277 L274 110 Z" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="1.5" />
    <ellipse cx="260" cy="110" rx="14" ry="3.5" fill="#93C5FD" />
    <text x="260" y="156" textAnchor="middle" fontFamily={F} fontSize={10} fill={C.textMid}>Water</text>
    <text x="260" y="168" textAnchor="middle" fontFamily={F} fontSize={10} fill={C.textMid}>(half cup)</text>

    {/* base */}
    <rect x="130" y="152" width="60" height="12" rx="4" fill="#475569" />
    <rect x="118" y="162" width="84" height="8" rx="4" fill="#334155" />
  </svg>
);

/** Q3: Balance — 1 kg iron vs 1 kg feathers (perfectly level) */
const SceneIronFeathers: React.FC = () => (
  <svg viewBox="0 0 320 175" width="100%" style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}>
    {/* pivot post */}
    <rect x="156" y="55" width="8" height="100" rx="4" fill="#64748B" />
    <circle cx="160" cy="55" r="10" fill="#475569" />
    {/* perfectly level beam */}
    <line x1="30" y1="75" x2="290" y2="75" stroke="#334155" strokeWidth="5" strokeLinecap="round" />

    {/* left pan — iron block */}
    <line x1="60" y1="75" x2="60" y2="105" stroke="#64748B" strokeWidth="2" />
    <ellipse cx="60" cy="113" rx="34" ry="9" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
    {/* iron block */}
    <rect x="40" y="88" width="40" height="24" rx="3" fill="#64748B" stroke="#334155" strokeWidth="1.5" />
    <text x="60" y="105" textAnchor="middle" fontFamily={F} fontSize={9} fontWeight={700} fill="white">IRON</text>
    <text x="60" y="132" textAnchor="middle" fontFamily={F} fontSize={10} fill={C.textMid}>1 kg iron</text>

    {/* right pan — feathers */}
    <line x1="260" y1="75" x2="260" y2="105" stroke="#64748B" strokeWidth="2" />
    <ellipse cx="260" cy="113" rx="34" ry="9" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
    {/* feather pile (big fluffy cloud) */}
    {[
      {cx:247,cy:98,r:9},{cx:260,cy:93,r:11},{cx:273,cy:97,r:9},
      {cx:251,cy:88,r:8},{cx:265,cy:84,r:9},{cx:270,cy:91,r:7},
    ].map((p,i)=>(
      <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#FEF9C3" stroke="#FCD34D" strokeWidth="1" />
    ))}
    {/* feather quills */}
    {[{x1:248,y1:102,x2:244,y2:115},{x1:260,y1:104,x2:260,y2:118},{x1:272,y1:102,x2:276,y2:115}].map((l,i)=>(
      <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#F59E0B" strokeWidth="1.5" />
    ))}
    <text x="260" y="132" textAnchor="middle" fontFamily={F} fontSize={10} fill={C.textMid}>1 kg feathers</text>

    {/* "= 1 kg" labels */}
    <text x="60" y="148" textAnchor="middle" fontFamily={F} fontSize={9} fontWeight={600} fill={C.primary}>1 000 g</text>
    <text x="260" y="148" textAnchor="middle" fontFamily={F} fontSize={9} fontWeight={600} fill={C.primary}>1 000 g</text>

    {/* base */}
    <rect x="130" y="152" width="60" height="12" rx="4" fill="#475569" />
    <rect x="118" y="162" width="84" height="8" rx="4" fill="#334155" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// QUESTIONS DATA
// ─────────────────────────────────────────────────────────────────

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'Three identical cups are each half-filled.',
    sub: 'Cup A \u2192 water \u00b7 Cup B \u2192 sand \u00b7 Cup C \u2192 pebbles\nWhich cup is heaviest?',
    choices: [
      { id: 'A', label: 'Cup A \u2014 Water' },
      { id: 'B', label: 'Cup B \u2014 Sand' },
      { id: 'C', label: 'Cup C \u2014 Pebbles' },
    ],
    correctId: 'C',
    reason: 'Pebbles are denser than sand or water, so the same volume of pebbles has the most mass.',
    hint: 'Look at the balance \u2014 pebbles tip the scale further than sand or water!',
    renderScene: () => <SceneCups />,
  },
  {
    id: 2,
    text: 'Half a cup of cotton wool vs. half a cup of water.',
    sub: 'Which has more mass?',
    choices: [
      { id: 'cotton', label: '\uD83E\uDDA5 Cotton Wool' },
      { id: 'water',  label: '\uD83D\uDCA7 Water' },
    ],
    correctId: 'water',
    reason: 'Water is much denser than cotton wool. The same volume of water has far more mass.',
    hint: 'The balance tips down on the water side \u2014 water molecules are packed tightly together!',
    renderScene: () => <SceneBalance />,
  },
  {
    id: 3,
    text: '1 kilogram of iron vs. 1 kilogram of feathers.',
    sub: 'Which has more mass?',
    choices: [
      { id: 'iron',     label: '\uD83E\uDEB6 Iron Block' },
      { id: 'feathers', label: '\uD83E\uDEB6 Feathers' },
      { id: 'same',     label: '\u2696\uFE0F They are the same' },
    ],
    correctId: 'same',
    reason: '1 kg is 1 kg! Mass is the amount of matter. The material and size do not change the stated mass.',
    hint: 'The balance is perfectly level \u2014 both sides show exactly 1\u202f000\u202fg!',
    renderScene: () => <SceneIronFeathers />,
  },
];

// ─────────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ current: number; total: number; score: number }> = ({ current, total, score }) => {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: C.textMid }}>
          Question {Math.min(current + 1, total)} of {total}
        </span>
        <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: C.primary }}>
          Score: {score} / {total}
        </span>
      </div>
      <div style={{ height: 8, background: C.disabled, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${C.gradStart}, ${C.primary}, ${C.accent})`,
          borderRadius: 8,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 6, borderRadius: 4,
            background: i < current ? C.success : i === current ? C.primary : C.disabled,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// CHOICE BUTTON
// ─────────────────────────────────────────────────────────────────

const ChoiceBtn: React.FC<{
  choice: Choice;
  state: 'idle' | 'correct' | 'wrong' | 'disabled';
  onClick: () => void;
  shaking: boolean;
}> = ({ choice, state, onClick, shaking }) => {
  const [hovered, setHovered] = useState(false);

  const getBg = () => {
    if (state === 'correct') return `linear-gradient(135deg, ${C.successBg}, #bbf7d0)`;
    if (state === 'wrong')   return `linear-gradient(135deg, ${C.errorBg}, #fecaca)`;
    if (state === 'disabled') return C.disabled;
    if (hovered) return `linear-gradient(135deg, ${C.accentLight}, #ffe4d0)`;
    return C.white;
  };
  const getBorder = () => {
    if (state === 'correct') return `2.5px solid ${C.success}`;
    if (state === 'wrong')   return `2.5px solid ${C.error}`;
    if (state === 'disabled') return `2px solid ${C.disabled}`;
    if (hovered) return `2px solid ${C.accent}`;
    return `2px solid ${C.primaryLight}`;
  };
  const getColor = () => {
    if (state === 'correct') return C.successText;
    if (state === 'wrong')   return C.errorText;
    if (state === 'disabled') return C.textLight;
    return C.textDark;
  };

  return (
    <button
      onClick={state === 'idle' ? onClick : undefined}
      onMouseEnter={() => state === 'idle' && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={state === 'disabled' || state === 'wrong'}
      style={{
        width: '100%',
        padding: '11px 14px',
        border: getBorder(),
        borderRadius: 12,
        background: getBg(),
        cursor: state === 'idle' ? 'pointer' : 'not-allowed',
        fontFamily: F,
        fontWeight: 600,
        fontSize: 'clamp(12px, 3vw, 14px)',
        color: getColor(),
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        transition: 'all 0.2s ease',
        transform: hovered && state === 'idle' ? 'scale(1.02)' : 'scale(1)',
        boxShadow: hovered && state === 'idle'
          ? `0 6px 20px rgba(255,114,18,0.18)`
          : state === 'correct'
          ? `0 4px 14px rgba(34,197,94,0.2)`
          : '0 2px 6px rgba(0,0,0,0.05)',
        animation: shaking ? 'mq_shake 0.4s ease' : (state === 'correct' ? 'mq_lockIn 0.35s ease' : 'none'),
      }}
    >
      {/* icon */}
      <div style={{ flexShrink: 0 }}>
        {state === 'correct' && <IconCheck size={18} color={C.success} />}
        {state === 'wrong'   && <IconX size={18} color={C.error} />}
        {(state === 'idle' || state === 'disabled') && (
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            border: `2px solid ${state === 'disabled' ? C.textLight : C.primaryLight}`,
          }} />
        )}
      </div>
      <span style={{ flex: 1, textAlign: 'left' }}>{choice.label}</span>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────
// FEEDBACK BANNER
// ─────────────────────────────────────────────────────────────────

const FeedbackBanner: React.FC<{ text: string; correct: boolean }> = ({ text, correct }) => (
  <div style={{
    background: correct
      ? `linear-gradient(135deg, ${C.successBg}, #bbf7d0)`
      : `linear-gradient(135deg, ${C.errorBg}, #fecaca)`,
    border: `2px solid ${correct ? C.success : C.error}`,
    borderRadius: 14, padding: '11px 16px',
    display: 'flex', alignItems: 'flex-start', gap: 10,
    animation: 'mq_hintSlide 0.35s ease',
    boxShadow: `0 4px 14px ${correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
  }}>
    <div style={{ flexShrink: 0, marginTop: 1 }}>
      {correct ? <IconCheck size={18} color={C.success} /> : <IconX size={18} color={C.error} />}
    </div>
    <span style={{
      fontFamily: F, fontSize: 13, fontWeight: 500,
      color: correct ? C.successText : C.errorText, lineHeight: 1.55,
    }}>
      {text}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// SUMMARY CARD
// ─────────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  score: number;
  total: number;
  finalMessage: string;
  onReset: () => void;
}> = ({ score, total, finalMessage, onReset }) => {
  const [hover, setHover] = useState(false);
  const perfect = score === total;

  return (
    <div style={{
      background: C.white, borderRadius: 24, padding: 'clamp(24px,5vw,36px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      animation: 'mq_pop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      textAlign: 'center',
    }}>
      {/* trophy + stars row */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 6, marginBottom: 10,
      }}>
        {Array.from({ length: score }).map((_, i) => (
          <div key={i} style={{ animation: `mq_starPop 0.4s ease ${i * 0.12}s both` }}>
            <IconStar size={28} color={C.accent} />
          </div>
        ))}
        {Array.from({ length: total - score }).map((_, i) => (
          <div key={i} style={{ opacity: 0.25 }}>
            <IconStar size={28} color={C.textLight} />
          </div>
        ))}
      </div>

      <div style={{ fontSize: 48, marginBottom: 8 }}>{perfect ? '\uD83C\uDFC6' : '\uD83D\uDC4D'}</div>

      <div style={{
        fontFamily: F, fontWeight: 800, fontSize: 'clamp(18px,5vw,24px)',
        background: `linear-gradient(135deg, ${C.gradStart}, ${C.primary})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 6,
      }}>
        {perfect ? 'Perfect Score!' : score >= 2 ? 'Great Job!' : 'Keep Practising!'}
      </div>

      <div style={{
        fontFamily: F, fontWeight: 800, fontSize: 44,
        color: perfect ? C.success : C.primary,
        marginBottom: 14,
      }}>
        {score} / {total}
      </div>

      {/* key insight */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primaryLight}55, ${C.accentLight})`,
        border: `2px solid ${C.primaryLight}`,
        borderRadius: 16, padding: '16px 18px', marginBottom: 18,
        fontFamily: F, fontSize: 14, fontWeight: 700,
        color: C.gradStart, lineHeight: 1.5,
      }}>
        {'\uD83D\uDCA1'} {finalMessage}
      </div>

      {/* reset */}
      <button
        onClick={onReset}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: hover
            ? `linear-gradient(135deg, ${C.primary}, ${C.gradStart})`
            : `linear-gradient(135deg, ${C.gradStart}, ${C.primary})`,
          color: C.white, border: 'none', borderRadius: 50,
          padding: '12px 32px', cursor: 'pointer',
          fontFamily: F, fontWeight: 700, fontSize: 14,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 16px rgba(83,48,134,0.32)',
          transform: hover ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.2s',
        }}
      >
        <IconReset size={15} color={C.white} />
        Try Again
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// QUESTION CARD
// ─────────────────────────────────────────────────────────────────

const QuestionCard: React.FC<{
  q: Question;
  qIndex: number;
  total: number;
  onAnswer: (correct: boolean) => void;
}> = ({ q, qIndex, total, onAnswer }) => {
  // 'idle'       — waiting for first pick
  // 'processing' — wrong answer shaking, all buttons blocked
  // 'correct'    — right answer locked, showing reason + Next
  const [phase, setPhase]           = useState<'idle' | 'processing' | 'correct'>('idle');
  const [wrongId, setWrongId]       = useState<string | null>(null);
  const [shakingId, setShakingId]   = useState<string | null>(null);
  const [feedback, setFeedback]     = useState<{ text: string; correct: boolean } | null>(null);
  const [nextHover, setNextHover]   = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleChoice = (id: string) => {
    // Block ALL clicks while processing a wrong answer OR already correct
    if (phase !== 'idle') return;

    const correct = id === q.correctId;

    if (correct) {
      setPhase('correct');
      setFeedback({ text: `\u2705 ${q.reason}`, correct: true });
    } else {
      // Enter processing phase — block everything
      setPhase('processing');
      setWrongId(id);
      setShakingId(id);
      setFeedback({ text: `\u274C ${q.hint}`, correct: false });

      timerRef.current = setTimeout(() => {
        // Reset fully back to idle so student can try again
        setPhase('idle');
        setWrongId(null);
        setShakingId(null);
        setFeedback(null);
      }, 1800);
    }
  };

  const getChoiceState = (id: string): 'idle' | 'correct' | 'wrong' | 'disabled' => {
    if (phase === 'idle') return 'idle';
    if (phase === 'correct') {
      if (id === q.correctId) return 'correct';
      return 'disabled';
    }
    // phase === 'processing'
    if (id === wrongId) return 'wrong';
    return 'disabled'; // block all other buttons during shake
  };

  return (
    <div style={{ animation: 'mq_fadeIn 0.45s ease' }}>
      {/* scene */}
      <div style={{
        background: `linear-gradient(135deg, ${C.accentLight}, rgba(193,193,234,0.15))`,
        borderRadius: 16, padding: '12px 8px', marginBottom: 16,
        border: `1px solid ${C.primaryLight}`,
        overflow: 'hidden',
      }}>
        {q.renderScene()}
      </div>

      {/* question text */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontFamily: F, fontWeight: 800, fontSize: 'clamp(13px, 3.5vw, 16px)',
          color: C.textDark, lineHeight: 1.4, marginBottom: 4,
        }}>
          {q.text}
        </div>
        {q.sub && q.sub.split('\n').map((line, i) => (
          <div key={i} style={{
            fontFamily: F, fontSize: 'clamp(11px, 2.8vw, 13px)', color: C.textMid,
            fontWeight: i === q.sub!.split('\n').length - 1 ? 700 : 400,
            marginTop: i === 0 ? 0 : 3,
          }}>
            {line}
          </div>
        ))}
      </div>

      {/* choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {q.choices.map(ch => (
          <ChoiceBtn
            key={ch.id}
            choice={ch}
            state={getChoiceState(ch.id)}
            onClick={() => handleChoice(ch.id)}
            shaking={shakingId === ch.id}
          />
        ))}
      </div>

      {/* feedback */}
      {feedback && (
        <div style={{ marginBottom: 14 }}>
          <FeedbackBanner text={feedback.text} correct={feedback.correct} />
        </div>
      )}

      {/* next button */}
      {phase === 'correct' && (
        <div style={{ textAlign: 'right', animation: 'mq_slideUp 0.3s ease' }}>
          <button
            onClick={() => onAnswer(true)}
            onMouseEnter={() => setNextHover(true)}
            onMouseLeave={() => setNextHover(false)}
            style={{
              background: nextHover
                ? `linear-gradient(135deg, ${C.accent}, ${C.gradEnd})`
                : `linear-gradient(135deg, ${C.gradStart}, ${C.primary})`,
              color: C.white, border: 'none', borderRadius: 50,
              padding: '11px 28px', cursor: 'pointer',
              fontFamily: F, fontWeight: 700, fontSize: 14,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: `0 4px 14px rgba(83,48,134,0.3)`,
              transform: nextHover ? 'scale(1.04)' : 'scale(1)',
              transition: 'all 0.2s',
            }}
          >
            {qIndex + 1 < total ? 'Next Question \u2192' : 'See Results \uD83C\uDF89'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

const MassQuiz: React.FC<MassQuizProps> = ({ props: toolProps = {} }) => {
  const { additionalProps = {} } = toolProps;

  const questions: Question[] = DEFAULT_QUESTIONS;
  const finalMessage: string =
    (additionalProps as any).finalMessage ??
    'Mass = the amount of matter in an object. More matter packed in the same space means more mass. A kilogram is a kilogram, no matter what!';

  const [qIndex, setQIndex]   = useState(0);
  const [score, setScore]     = useState(0);
  const [done, setDone]       = useState(false);

  // inject keyframes once
  useEffect(() => {
    const id = 'mass-quiz-kf';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = KEYFRAMES;
      document.head.appendChild(s);
    }
  }, []);

  const handleAnswer = (correct: boolean) => {
    const newScore = score + (correct ? 1 : 0);
    setScore(newScore);
    if (qIndex + 1 >= questions.length) {
      setDone(true);
    } else {
      setQIndex(i => i + 1);
    }
  };

  const handleReset = () => {
    setQIndex(0);
    setScore(0);
    setDone(false);
  };

  return (
    <div style={{
      fontFamily: F,
      background: C.bg,
      width: '100%',
      padding: '14px',
      boxSizing: 'border-box',
    }}>
      {/* inner wrapper — fluid full width */}
      <div style={{ width: '100%', boxSizing: 'border-box' }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign: 'center', marginBottom: 16, animation: 'mq_fadeIn 0.5s ease' }}>
          <div style={{
            fontFamily: F, fontWeight: 800,
            fontSize: 'clamp(16px, 6vw, 24px)',
            letterSpacing: -0.3,
            background: `linear-gradient(135deg, ${C.gradStart}, ${C.primary}, ${C.accent})`,
            backgroundSize: '200% 200%',
            animation: 'mq_gradShift 4s ease infinite',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 4,
          }}>
            {'\u2696\uFE0F'} Mass Quiz
          </div>
          <p style={{
            fontFamily: F, fontSize: 13, color: C.textMid,
            margin: '0 0 14px', fontWeight: 500,
          }}>
            Answer each question. Read the reason on every correct pick!
          </p>

          {/* score pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: `linear-gradient(135deg, ${C.gradStart}, ${C.primary})`,
            borderRadius: 50, padding: '7px 16px',
            boxShadow: '0 4px 14px rgba(83,48,134,0.25)',
            flexWrap: 'wrap', justifyContent: 'center',
          }}>
            <span style={{ color: C.white, fontFamily: F, fontWeight: 700, fontSize: 13 }}>
              {'\u2705'} {score} correct
            </span>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.3)' }} />
            <span style={{ color: C.accentLight, fontFamily: F, fontSize: 12, fontWeight: 500 }}>
              {done ? questions.length : qIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* ── PROGRESS ── */}
        {!done && (
          <ProgressBar current={qIndex} total={questions.length} score={score} />
        )}

        {/* ── MAIN CARD ── */}
        <div style={{
          background: C.white,
          borderRadius: 20,
          padding: 'clamp(12px, 3vw, 22px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: `1px solid ${C.disabled}`,
        }}>
          {done ? (
            <SummaryCard
              score={score}
              total={questions.length}
              finalMessage={finalMessage}
              onReset={handleReset}
            />
          ) : (
            <QuestionCard
              key={qIndex}
              q={questions[qIndex]}
              qIndex={qIndex}
              total={questions.length}
              onAnswer={handleAnswer}
            />
          )}
        </div>

        {/* ── RESET LINK (always visible) ── */}
        {!done && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={handleReset}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: F, fontSize: 12, fontWeight: 600,
                color: C.textLight,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = C.primary)}
              onMouseLeave={e => (e.currentTarget.style.color = C.textLight)}
            >
              <IconReset size={12} color="inherit" /> Restart quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MassQuiz;