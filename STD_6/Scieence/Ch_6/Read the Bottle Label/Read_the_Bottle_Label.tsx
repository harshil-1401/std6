import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────
// INLINE SVG ICONS
// ─────────────────────────────────────────────────────────────────

const IconCheck: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconXCircle: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconReset: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// KEYFRAMES
// ─────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

  @keyframes vm_fadeDown  { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes vm_fadeUp    { from{opacity:0;transform:translateY(14px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes vm_shake     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
  @keyframes vm_lockIn    { 0%{transform:scale(1)} 40%{transform:scale(1.07)} 70%{transform:scale(0.97)} 100%{transform:scale(1)} }
  @keyframes vm_gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes vm_float     { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-4px)} }
  @keyframes vm_pop       { from{opacity:0;transform:scale(0.82) translateY(24px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes vm_starPop   { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.2) rotate(5deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
  @keyframes vm_hintBlink { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes vm_zonePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.01)} }
  @keyframes vm_dropGlow  { 0%,100%{box-shadow:0 0 0 0 rgba(74,77,201,0.4)} 50%{box-shadow:0 0 0 8px rgba(74,77,201,0)} }
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

interface BottleData {
  id: string;
  volumeLabel: string;   // "200 mL"
  mlValue: number;       // 200
  color: string;
  correctTumblerId: string;
  reason: string;
  hint: string;
}

interface TumblerData {
  id: string;
  name: string;          // "Small Glass"
  capacityLabel: string; // "~200 mL"
  size: 'small' | 'medium' | 'large';
}

interface VolMatchProps {
  props?: {
    additionalProps?: { finalMessage?: string };
  };
  setStepDetails?: (d: unknown) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────

const BOTTLES: BottleData[] = [
  {
    id: 'b200', volumeLabel: '200 mL', mlValue: 200, color: '#4A4DC9',
    correctTumblerId: 't_small',
    reason: '200 mL fills a small glass exactly — it is just 1/5 of a litre (1 L = 1000 mL).',
    hint: 'The smallest bottle goes into the smallest container. Look for the tiny glass!',
  },
  {
    id: 'b500', volumeLabel: '500 mL', mlValue: 500, color: '#533086',
    correctTumblerId: 't_medium',
    reason: '500 mL = half a litre. It fills the medium mug perfectly — halfway to 1 L.',
    hint: '500 mL is exactly half of 1 litre. Try the medium-sized mug!',
  },
  {
    id: 'b1L', volumeLabel: '1 L', mlValue: 1000, color: '#FF7212',
    correctTumblerId: 't_large',
    reason: '1 L = 1000 mL. Only the big jug can hold this much. Remember: 1 m\u00b3 = 1000 L!',
    hint: 'One full litre is the most liquid here. It needs the biggest container!',
  },
];

const TUMBLERS: TumblerData[] = [
  { id: 't_medium', name: 'Medium Mug',  capacityLabel: 'Medium size', size: 'medium' },
  { id: 't_large',  name: 'Big Jug',     capacityLabel: 'Large size',  size: 'large'  },
  { id: 't_small',  name: 'Small Glass', capacityLabel: 'Small size',  size: 'small'  },
];

// Fisher-Yates shuffle — returns a new shuffled array
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DEFAULT_FINAL =
  'Volume is the space a liquid takes up, measured in litres (L) and millilitres (mL). 1 L\u00a0=\u00a01000\u00a0mL. Always read the label on a bottle to know its volume!';

// ─────────────────────────────────────────────────────────────────
// BOTTLE SVG — tall Indian-style water bottle
// ─────────────────────────────────────────────────────────────────

const BottleSVG: React.FC<{ bottle: BottleData; locked: boolean }> = ({ bottle, locked }) => {
  const col = bottle.color;
  const bodyFill = col + '28';
  const waterFill = col + '55';
  // fill proportion based on volume: 200→30%, 500→55%, 1000→80%
  const fillPct = bottle.mlValue >= 1000 ? 0.80 : bottle.mlValue >= 500 ? 0.55 : 0.30;
  const bodyTop = 30; const bodyBot = 118; const bodyH = bodyBot - bodyTop;
  const waterTop = bodyTop + bodyH * (1 - fillPct);

  return (
    <svg viewBox="0 0 72 130" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      {/* cap */}
      <rect x="25" y="3" width="22" height="13" rx="4" fill={col} />
      <rect x="21" y="14" width="30" height="5" rx="2" fill={col} opacity="0.75" />
      {/* neck */}
      <path d="M24 19 Q24 30 14 30 L58 30 Q48 30 48 19 Z" fill={col} opacity="0.6" />
      {/* body */}
      <rect x="10" y="30" width="52" height="88" rx="12" fill={bodyFill} stroke={col} strokeWidth="2" />
      {/* water */}
      <rect x="12" y={waterTop} width="48" height={bodyBot - waterTop - 2} rx="8" fill={waterFill} />
      {/* water surface shimmer */}
      <ellipse cx="36" cy={waterTop} rx="22" ry="3.5" fill={col} opacity="0.3" />
      {/* body shine */}
      <rect x="15" y="34" width="7" height="36" rx="3.5" fill="white" opacity="0.3" />
      {/* label band */}
      <rect x="12" y="72" width="48" height="30" rx="6" fill="white" opacity="0.92" />
      <rect x="12" y="72" width="48" height="30" rx="6" fill="none" stroke={col} strokeWidth="1" opacity="0.3" />
      {/* volume text */}
      <text x="36" y="87" textAnchor="middle" fontFamily={F} fontWeight={800}
        fontSize={bottle.volumeLabel.length > 4 ? 10 : 12} fill={col}>
        {bottle.volumeLabel}
      </text>
      <text x="36" y="98" textAnchor="middle" fontFamily={F} fontSize={8} fill="#64748B">volume</text>
      {/* base */}
      <rect x="14" y="114" width="44" height="6" rx="3" fill={col} opacity="0.25" />
      {/* lock badge */}
      {locked && (
        <g transform="translate(46, 2)">
          <circle cx="11" cy="11" r="11" fill={C.success} stroke="white" strokeWidth="1.5" />
          <polyline points="5 11 9 15 17 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// TUMBLER SVG — three distinct vessel shapes
// ─────────────────────────────────────────────────────────────────

const TumblerSVG: React.FC<{
  tumbler: TumblerData;
  isOver: boolean;
  fillColor?: string;
  fillPct?: number;
}> = ({ tumbler, isOver, fillColor, fillPct = 0 }) => {
  const stroke = fillColor ?? (isOver ? C.primary : '#94A3B8');
  const bodyFill = isOver && !fillColor ? `${C.primary}18` : '#F8FAFC';

  if (tumbler.size === 'small') {
    // Simple straight-sided glass
    return (
      <svg viewBox="0 0 90 100" width="100%" height="100%" style={{ display: 'block' }}>
        <path d="M22 20 L18 85 H72 L68 20 Z" fill={bodyFill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
        {fillPct > 0 && fillColor && (
          <path d={`M${18 + (68-18)*(1-fillPct)} ${85 - 65*fillPct} L18 85 H72 L${72 - (68-18)*(1-fillPct)} ${85 - 65*fillPct} Z`}
            fill={fillColor + '55'} />
        )}
        {/* rim */}
        <line x1="20" y1="20" x2="70" y2="20" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        {/* shine */}
        {!fillColor && <rect x="25" y="24" width="6" height="32" rx="3" fill="white" opacity="0.6" />}
        {/* base */}
        <rect x="16" y="83" width="58" height="6" rx="3" fill={stroke} opacity="0.2" />
      </svg>
    );
  }

  if (tumbler.size === 'medium') {
    // Mug with handle
    return (
      <svg viewBox="0 0 100 110" width="100%" height="100%" style={{ display: 'block' }}>
        {/* body */}
        <rect x="12" y="14" width="62" height="76" rx="8" fill={bodyFill} stroke={stroke} strokeWidth="2.5" />
        {fillPct > 0 && fillColor && (
          <rect x="14" y={14 + 76*(1-fillPct)} width="58" height={76*fillPct} rx="6" fill={fillColor + '55'} />
        )}
        {/* handle */}
        <path d="M74 30 Q96 30 96 52 Q96 74 74 74" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        {/* rim */}
        <line x1="12" y1="14" x2="74" y2="14" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        {/* shine */}
        {!fillColor && <rect x="17" y="18" width="7" height="40" rx="3.5" fill="white" opacity="0.5" />}
        {/* base */}
        <rect x="10" y="88" width="66" height="7" rx="3" fill={stroke} opacity="0.2" />
      </svg>
    );
  }

  // Large jug with handle + spout
  return (
    <svg viewBox="0 0 110 120" width="100%" height="100%" style={{ display: 'block' }}>
      {/* body */}
      <path d="M16 12 Q14 95 16 100 H82 Q84 95 82 12 Z" fill={bodyFill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      {fillPct > 0 && fillColor && (
        <path d={`M${16 + (82-16)*(1-fillPct)*0.02} ${12 + 88*(1-fillPct)} L16 100 H82 L${82 - (82-16)*(1-fillPct)*0.02} ${12+88*(1-fillPct)} Z`}
          fill={fillColor + '55'} />
      )}
      {/* handle */}
      <path d="M82 25 Q108 25 108 50 Q108 78 82 78" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      {/* spout */}
      <path d="M30 12 Q36 2 46 2 Q56 2 62 12" fill={bodyFill} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      {/* rim */}
      <line x1="16" y1="12" x2="82" y2="12" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      {/* shine */}
      {!fillColor && <rect x="21" y="16" width="8" height="48" rx="4" fill="white" opacity="0.4" />}
      {/* base */}
      <rect x="14" y="98" width="70" height="8" rx="4" fill={stroke} opacity="0.2" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// FEEDBACK BANNER
// ─────────────────────────────────────────────────────────────────

const FeedbackBanner: React.FC<{ text: string; correct: boolean }> = ({ text, correct }) => (
  <div style={{
    background: correct ? `linear-gradient(135deg,${C.successBg},#bbf7d0)` : `linear-gradient(135deg,${C.errorBg},#fecaca)`,
    border: `2px solid ${correct ? C.success : C.error}`,
    borderRadius: 14, padding: '11px 14px',
    display: 'flex', alignItems: 'flex-start', gap: 10,
    animation: 'vm_fadeUp 0.3s ease',
    boxShadow: `0 4px 12px ${correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
  }}>
    <div style={{ flexShrink: 0, marginTop: 1 }}>
      {correct ? <IconCheck size={17} color={C.success} /> : <IconXCircle size={17} color={C.error} />}
    </div>
    <span style={{ fontFamily: F, fontSize: 13, fontWeight: 500, color: correct ? C.successText : C.errorText, lineHeight: 1.55 }}>
      {text}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// SCORE PILL
// ─────────────────────────────────────────────────────────────────

const ScorePill: React.FC<{ score: number; total: number }> = ({ score, total }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 12,
    background: `linear-gradient(135deg,${C.gradStart},${C.primary})`,
    borderRadius: 50, padding: '7px 20px',
    boxShadow: '0 4px 14px rgba(83,48,134,0.25)',
  }}>
    <span style={{ color: C.white, fontFamily: F, fontWeight: 700, fontSize: 13 }}>
      {'\u2705'} {score} / {total} matched
    </span>
    <div style={{ height: 6, width: 72, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${(score / total) * 100}%`,
        background: `linear-gradient(90deg,${C.accent},${C.accentLight})`,
        borderRadius: 4, transition: 'width 0.5s ease',
      }} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// TUMBLER DROP ZONE — large, clear, top section
// ─────────────────────────────────────────────────────────────────

const TumblerDropZone: React.FC<{
  tumbler: TumblerData;
  isOver: boolean;
  matchedBottle: BottleData | null;
  isCorrect: boolean | null;
  isShaking: boolean;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onZoneClick: (id: string) => void;
}> = ({ tumbler, isOver, matchedBottle, isCorrect, isShaking, onDrop, onDragOver, onDragLeave, onZoneClick }) => {
  const locked = isCorrect === true;
  const wrong  = isCorrect === false;

  const borderCol = locked ? C.success : wrong ? C.error : isOver ? C.primary : C.disabled;
  const bgCol     = locked ? C.successBg : wrong ? C.errorBg : isOver ? `${C.primary}12` : C.white;

  const tumblerH = tumbler.size === 'large' ? 110 : tumbler.size === 'medium' ? 90 : 72;

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => onZoneClick(tumbler.id)}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        borderRadius: 18,
        border: `3px ${locked ? 'solid' : 'dashed'} ${borderCol}`,
        background: bgCol,
        padding: '12px 8px 10px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        cursor: locked ? 'default' : 'pointer',
        transition: 'all 0.25s ease',
        transform: isOver ? 'scale(1.03)' : 'scale(1)',
        boxShadow: locked
          ? '0 4px 16px rgba(34,197,94,0.18)'
          : isOver
          ? '0 6px 20px rgba(74,77,201,0.2)'
          : '0 2px 8px rgba(0,0,0,0.05)',
        animation: isShaking
          ? 'vm_shake 0.4s ease'
          : locked
          ? 'none'
          : isOver
          ? 'vm_dropGlow 1s ease infinite'
          : 'vm_zonePulse 3s ease-in-out infinite',
        position: 'relative',
      }}
    >
      {/* capacity badge top */}
      <div style={{
        background: locked ? `${matchedBottle!.color}22` : `${C.primary}15`,
        border: `1.5px solid ${locked ? matchedBottle!.color : C.primaryLight}`,
        borderRadius: 20, padding: '3px 10px',
        fontFamily: F, fontWeight: 700, fontSize: 11,
        color: locked ? matchedBottle!.color : C.primary,
      }}>
        {locked ? matchedBottle!.volumeLabel + ' \u2713' : tumbler.capacityLabel}
      </div>

      {/* tumbler illustration */}
      <div style={{ width: '100%', height: tumblerH }}>
        <TumblerSVG
          tumbler={tumbler}
          isOver={isOver && !locked}
          fillColor={locked && matchedBottle ? matchedBottle.color : undefined}
          fillPct={locked ? 0.7 : 0}
        />
      </div>

      {/* name + drop hint */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: F, fontWeight: 700, fontSize: 12, color: locked ? C.successText : C.textDark }}>
          {tumbler.name}
        </div>
        {!locked && (
          <div style={{ fontFamily: F, fontSize: 10, color: C.textLight, fontStyle: 'italic', marginTop: 2 }}>
            {isOver ? 'Drop here!' : 'Drop or tap'}
          </div>
        )}
        {locked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 2 }}>
            <IconCheck size={13} color={C.success} />
            <span style={{ fontFamily: F, fontSize: 10, color: C.success, fontWeight: 600 }}>Matched!</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// BOTTLE CARD — draggable source, displayed in bottom row
// ─────────────────────────────────────────────────────────────────

const BottleCard: React.FC<{
  bottle: BottleData;
  isLocked: boolean;
  isDragging: boolean;
  isSelected: boolean;
  onClick: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
}> = ({ bottle, isLocked, isDragging, isSelected, onClick, onDragStart }) => {
  const [hov, setHov] = useState(false);

  const getBorder = () => {
    if (isLocked)   return `2.5px solid ${C.success}`;
    if (isSelected) return `2.5px solid ${C.accent}`;
    if (hov)        return `2px solid ${C.primaryLight}`;
    return `2px solid ${C.disabled}`;
  };
  const getBg = () => {
    if (isLocked)   return C.successBg;
    if (isSelected) return `linear-gradient(135deg,${C.accentLight},#ffe8d0)`;
    return C.white;
  };

  return (
    <div
      draggable={!isLocked}
      onDragStart={isLocked ? undefined : (e) => onDragStart(e, bottle.id)}
      onClick={isLocked ? undefined : () => onClick(bottle.id)}
      onMouseEnter={() => !isLocked && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        borderRadius: 16,
        border: getBorder(),
        background: getBg(),
        padding: '10px 8px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        cursor: isLocked ? 'default' : 'grab',
        transition: 'all 0.2s',
        transform: isDragging
          ? 'scale(1.08) rotate(-2deg)'
          : isSelected ? 'scale(1.05)'
          : hov ? 'scale(1.03)' : 'scale(1)',
        boxShadow: isDragging
          ? `0 14px 30px rgba(74,77,201,0.3)`
          : isSelected ? `0 6px 18px rgba(255,114,18,0.22)`
          : hov ? '0 4px 14px rgba(0,0,0,0.1)'
          : '0 2px 6px rgba(0,0,0,0.06)',
        animation: isLocked
          ? 'vm_lockIn 0.35s ease'
          : hov || isSelected ? 'none' : 'vm_float 3s ease-in-out infinite',
        opacity: isLocked ? 0.65 : 1,
        userSelect: 'none',
      }}
    >
      {/* bottle illustration */}
      <div style={{ width: '100%', maxWidth: 58, height: 100 }}>
        <BottleSVG bottle={bottle} locked={isLocked} />
      </div>
      {/* volume label */}
      <div style={{
        fontFamily: F, fontWeight: 800, fontSize: 13,
        color: isLocked ? C.successText : bottle.color,
        textAlign: 'center',
      }}>
        {bottle.volumeLabel}
      </div>
      {/* mL equivalence note */}
      {bottle.mlValue >= 1000 && !isLocked && (
        <div style={{ fontFamily: F, fontSize: 9, color: C.textLight, textAlign: 'center' }}>
          = 1000 mL
        </div>
      )}
      {isLocked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <IconCheck size={12} color={C.success} />
          <span style={{ fontFamily: F, fontSize: 9, color: C.success, fontWeight: 600 }}>Placed!</span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// FINAL OVERLAY
// ─────────────────────────────────────────────────────────────────

const FinalOverlay: React.FC<{ finalMessage: string; onReset: () => void }> = ({ finalMessage, onReset }) => {
  const [hover, setHover] = useState(false);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(26,26,46,0.68)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: C.white, borderRadius: 24, padding: 'clamp(20px,5vw,36px)',
        maxWidth: 400, width: '90%', textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
        animation: 'vm_pop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          {[0, 1, 2].map(i => (
            <svg key={i} width={32} height={32} viewBox="0 0 24 24" fill={C.accent}
              style={{ animation: `vm_starPop 0.4s ease ${i * 0.13}s both` }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
        </div>

        <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>

        <div style={{
          fontFamily: F, fontWeight: 800, fontSize: 'clamp(17px,5vw,22px)',
          background: `linear-gradient(135deg,${C.gradStart},${C.primary})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 14,
        }}>
          All matched!
        </div>

        {/* fact card */}
        <div style={{
          background: `linear-gradient(135deg,${C.accentLight},rgba(193,193,234,0.2))`,
          border: `2px solid ${C.primaryLight}`,
          borderRadius: 14, padding: '14px 16px', marginBottom: 16,
          fontFamily: F, fontSize: 13, fontWeight: 600,
          color: C.gradStart, lineHeight: 1.6, textAlign: 'left',
        }}>
          💡 {finalMessage}
        </div>

        {/* unit badges */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          {([
            ['200 mL = ⅕ L', C.primary],
            ['500 mL = ½ L', C.gradStart],
            ['1 L = 1000 mL', C.accent],
          ] as [string, string][]).map(([lbl, col]) => (
            <div key={lbl} style={{
              background: col + '18', border: `1.5px solid ${col}`,
              borderRadius: 8, padding: '5px 11px',
              fontFamily: F, fontWeight: 700, fontSize: 11, color: col,
            }}>{lbl}</div>
          ))}
        </div>

        <button
          onClick={onReset}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            background: hover
              ? `linear-gradient(135deg,${C.primary},${C.gradStart})`
              : `linear-gradient(135deg,${C.gradStart},${C.primary})`,
            color: C.white, border: 'none', borderRadius: 50,
            padding: '12px 32px', cursor: 'pointer',
            fontFamily: F, fontWeight: 700, fontSize: 14,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(83,48,134,0.32)',
            transform: hover ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.2s',
          }}
        >
          <IconReset size={14} color={C.white} /> Try Again
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

const VolumeMatcher: React.FC<VolMatchProps> = ({ props: toolProps = {} }) => {
  const finalMessage = (toolProps.additionalProps as any)?.finalMessage ?? DEFAULT_FINAL;

  // ── state ──
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [overZoneId, setOverZoneId]   = useState<string | null>(null);

  // shuffled bottle display order — re-shuffled on every Reset
  const [shuffledBottles, setShuffledBottles] = useState<BottleData[]>(() => shuffle(BOTTLES));

  // tumblerId → bottleId (or null)
  const [matches, setMatches]         = useState<Record<string, string | null>>({});
  // tumblerId → true|false|null
  const [correct, setCorrect]         = useState<Record<string, boolean | null>>({});
  const [shakingId, setShakingId]     = useState<string | null>(null);

  const [feedback, setFeedback]       = useState<{ text: string; ok: boolean } | null>(null);
  const [showFinal, setShowFinal]     = useState(false);
  const [rstHov, setRstHov]           = useState(false);

  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // inject keyframes
  useEffect(() => {
    const id = 'vm-kf-v2';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id; s.textContent = KEYFRAMES;
      document.head.appendChild(s);
    }
  }, []);

  const correctCount = Object.values(correct).filter(v => v === true).length;
  const total = BOTTLES.length;

  // completion check
  useEffect(() => {
    if (correctCount === total) {
      const t = setTimeout(() => setShowFinal(true), 700);
      return () => clearTimeout(t);
    }
  }, [correctCount, total]);

  // locked bottle ids (correctly placed, immovable)
  const lockedBottleIds = new Set(
    Object.entries(matches)
      .filter(([tid]) => correct[tid] === true)
      .map(([, bid]) => bid as string)
  );

  // ── core match logic ──
  const tryMatch = useCallback((bottleId: string, tumblerId: string) => {
    if (correct[tumblerId] === true) return;
    if (lockedBottleIds.has(bottleId) && correct[tumblerId] !== true) return;

    const bottle = BOTTLES.find(b => b.id === bottleId);
    if (!bottle) return;

    const isCorrect = bottle.correctTumblerId === tumblerId;

    setMatches(p => ({ ...p, [tumblerId]: bottleId }));
    setCorrect(p => ({ ...p, [tumblerId]: isCorrect }));

    if (isCorrect) {
      setFeedback({ text: `✅ ${bottle.reason}`, ok: true });
    } else {
      setShakingId(tumblerId);
      setFeedback({ text: `❌ ${bottle.hint}`, ok: false });
      setTimeout(() => {
        setMatches(p => ({ ...p, [tumblerId]: null }));
        setCorrect(p => ({ ...p, [tumblerId]: null }));
        setShakingId(null);
      }, 1600);
    }

    setSelectedId(null);
    setDraggingId(null);
    setOverZoneId(null);

    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(null), 4200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correct, matches]);

  // ── drag handlers ──
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (lockedBottleIds.has(id)) return;
    e.dataTransfer.setData('bottleId', id);
    setDraggingId(id);
    setSelectedId(null);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, tid: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('bottleId');
    setOverZoneId(null);
    if (id) tryMatch(id, tid);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, tid: string) => {
    e.preventDefault();
    setOverZoneId(tid);
  };

  // ── tap/click handlers ──
  const handleBottleClick = (id: string) => {
    if (lockedBottleIds.has(id)) return;
    setSelectedId(p => p === id ? null : id);
  };
  const handleZoneClick = (tid: string) => {
    if (correct[tid] === true) return;
    if (selectedId) tryMatch(selectedId, tid);
  };

  const handleReset = () => {
    setMatches({}); setCorrect({}); setDraggingId(null);
    setSelectedId(null); setOverZoneId(null); setShakingId(null);
    setFeedback(null); setShowFinal(false);
    setShuffledBottles(shuffle(BOTTLES));
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: F, background: C.bg, width: '100%', padding: 14, boxSizing: 'border-box' }}>

      {/* ── HEADER ── */}
      <div style={{ textAlign: 'center', marginBottom: 14, animation: 'vm_fadeDown 0.5s ease' }}>
        <div style={{
          fontFamily: F, fontWeight: 800, fontSize: 'clamp(17px,5vw,24px)',
          background: `linear-gradient(135deg,${C.gradStart},${C.primary},${C.accent})`,
          backgroundSize: '200% 200%', animation: 'vm_gradShift 4s ease infinite',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4,
        }}>
          🧪 Volume Matcher
        </div>
        <p style={{ fontFamily: F, fontSize: 12, color: C.textMid, margin: '0 0 12px', fontWeight: 500 }}>
          Drag each bottle onto the tumbler that fits its volume. On mobile — tap a bottle, then tap a tumbler!
        </p>
        <ScorePill score={correctCount} total={total} />
      </div>

      {/* ── FEEDBACK ── */}
      {feedback && (
        <div style={{ marginBottom: 12 }}>
          <FeedbackBanner text={feedback.text} correct={feedback.ok} />
        </div>
      )}

      {/* ── SELECTED BOTTLE HINT ── */}
      {selectedId && (
        <div style={{
          textAlign: 'center', marginBottom: 10,
          fontFamily: F, fontWeight: 700, fontSize: 12, color: C.accent,
          animation: 'vm_hintBlink 1s ease infinite',
        }}>
          ☝️ Now tap a tumbler below to place {BOTTLES.find(b => b.id === selectedId)?.volumeLabel}!
        </div>
      )}

      {/* ── TUMBLERS ROW (top, large drop zones) ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: F, fontWeight: 700, fontSize: 11, color: C.textLight,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ flex: 1, height: 1, background: C.disabled, display: 'block' }} />
          Drop Zones — Tumblers
          <span style={{ flex: 1, height: 1, background: C.disabled, display: 'block' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          {TUMBLERS.map(tumbler => {
            const bid = matches[tumbler.id] ?? null;
            const mb  = bid ? BOTTLES.find(b => b.id === bid) ?? null : null;
            return (
              <TumblerDropZone
                key={tumbler.id}
                tumbler={tumbler}
                isOver={overZoneId === tumbler.id}
                matchedBottle={mb}
                isCorrect={correct[tumbler.id] ?? null}
                isShaking={shakingId === tumbler.id}
                onDrop={(e) => handleDrop(e, tumbler.id)}
                onDragOver={(e) => handleDragOver(e, tumbler.id)}
                onDragLeave={() => setOverZoneId(null)}
                onZoneClick={handleZoneClick}
              />
            );
          })}
        </div>
      </div>

      {/* ── BOTTLES ROW (bottom, draggable sources) ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: F, fontWeight: 700, fontSize: 11, color: C.textLight,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ flex: 1, height: 1, background: C.disabled, display: 'block' }} />
          Bottles — Drag or Tap
          <span style={{ flex: 1, height: 1, background: C.disabled, display: 'block' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {shuffledBottles.map(bottle => (
            <BottleCard
              key={bottle.id}
              bottle={bottle}
              isLocked={lockedBottleIds.has(bottle.id)}
              isDragging={draggingId === bottle.id}
              isSelected={selectedId === bottle.id}
              onClick={handleBottleClick}
              onDragStart={handleDragStart}
            />
          ))}
        </div>
      </div>

      {/* ── LEGEND ── */}
      <div style={{
        background: C.white, borderRadius: 14,
        padding: '10px 14px', marginBottom: 12,
        border: `1px solid ${C.disabled}`,
        display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {([
          ['500 mL = ½ L', C.gradStart],
          ['1 L = 1000 mL', C.accent],
          ['200 mL = ⅕ L', C.primary],
        ] as [string, string][]).map(([lbl, col]) => (
          <div key={lbl} style={{
            background: col + '15', border: `1.5px solid ${col}`,
            borderRadius: 8, padding: '4px 10px',
            fontFamily: F, fontWeight: 600, fontSize: 10, color: col,
          }}>{lbl}</div>
        ))}
      </div>

      {/* ── RESET ── */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleReset}
          onMouseEnter={() => setRstHov(true)}
          onMouseLeave={() => setRstHov(false)}
          style={{
            background: rstHov ? C.primaryLight : C.white,
            color: C.primary, border: `2px solid ${C.primaryLight}`,
            borderRadius: 50, padding: '9px 24px', cursor: 'pointer',
            fontFamily: F, fontWeight: 600, fontSize: 12,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
            transform: rstHov ? 'scale(1.04)' : 'scale(1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <IconReset size={13} color={C.primary} /> Reset
        </button>
      </div>

      {/* ── FINAL OVERLAY ── */}
      {showFinal && <FinalOverlay finalMessage={finalMessage} onReset={handleReset} />}
    </div>
  );
};

export default VolumeMatcher;