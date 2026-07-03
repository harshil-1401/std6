import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────
// INLINE SVG ICONS — zero external dependencies
// ─────────────────────────────────────────────────────────────────

const IconCheck: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconXCircle: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconReset: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
  </svg>
);

const IconDroplets: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
    <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
  </svg>
);

const IconFlask: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" />
    <path d="M9 3v5l-5 9a2 2 0 0 0 1.8 3h12.4a2 2 0 0 0 1.8-3l-5-9V3" />
    <line x1="6.2" y1="15" x2="17.8" y2="15" />
  </svg>
);

const IconSort: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────

interface TileData {
  id: string;
  label: string;
  emoji: string;
  type: 'liquid' | 'gas' | 'solid';
  soluble: boolean;
  reason: string;
  hint: string;
}

interface PlacedTile extends TileData {
  correct: boolean;
  placedIn: 'dissolves' | 'not_dissolves';
}

interface SolubilitySorterProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: {
      tiles?: TileData[];
      showFinalCard?: boolean;
      finalCardMessage?: string;
    };
  };
  setStepDetails?: (d: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────
// DEFAULT TILE DATA
// ─────────────────────────────────────────────────────────────────

const DEFAULT_TILES: TileData[] = [
  {
    id: 'lemon_juice',
    label: 'Lemon Juice',
    emoji: '\uD83C\uDF4B',
    type: 'liquid',
    soluble: true,
    reason: "Lemon juice mixes completely with water \u2014 it's mostly water itself!",
    hint: 'Think about what lemonade looks like in a glass\u2026',
  },
  {
    id: 'vinegar',
    label: 'Vinegar',
    emoji: '\uD83C\uDF76',
    type: 'liquid',
    soluble: true,
    reason: "Vinegar dissolves in water \u2014 it's a dilute acid that mixes fully.",
    hint: 'Vinegar is used in salad dressings with water-based ingredients\u2026',
  },
  {
    id: 'mustard_oil',
    label: 'Mustard Oil',
    emoji: '\uD83E\uDED9',
    type: 'liquid',
    soluble: false,
    reason: "Mustard oil does NOT dissolve \u2014 oil and water don't mix, forming separate layers.",
    hint: 'Have you seen oil floating on water in a cooking pan?',
  },
  {
    id: 'coconut_oil',
    label: 'Coconut Oil',
    emoji: '\uD83E\uDD65',
    type: 'liquid',
    soluble: false,
    reason: 'Coconut oil is insoluble \u2014 all oils are hydrophobic (water-fearing).',
    hint: 'All cooking oils behave the same way with water\u2026',
  },
  {
    id: 'honey',
    label: 'Honey',
    emoji: '\uD83C\uDF6F',
    type: 'liquid',
    soluble: true,
    reason: "Honey dissolves in water \u2014 it's mostly sugar and water, so it mixes fully.",
    hint: 'Think about warm honey tea \u2014 the honey disappears into the water!',
  },
  {
    id: 'air_bubble',
    label: 'Air Bubble',
    emoji: '\uD83D\uDCA8',
    type: 'gas',
    soluble: false,
    reason: 'Air (mostly nitrogen) does NOT dissolve well \u2014 bubbles rise and escape water.',
    hint: 'Watch what happens when you blow air through a straw into water\u2026',
  },
  {
    id: 'oxygen_gas',
    label: 'Oxygen Gas',
    emoji: '\uD83D\uDC1F',
    type: 'gas',
    soluble: true,
    reason: 'Oxygen dissolves in water! Fish breathe this dissolved oxygen to survive.',
    hint: "How do fish breathe underwater if there's no air?",
  },
  {
    id: 'carbon_dioxide',
    label: 'CO\u2082 in Soda',
    emoji: '\uD83E\uDD64',
    type: 'gas',
    soluble: true,
    reason: "CO\u2082 dissolves in water under pressure \u2014 that's what makes soda fizzy!",
    hint: 'What happens when you open a soda bottle?',
  },
];

// ─────────────────────────────────────────────────────────────────
// KEYFRAMES injected once into <head>
// ─────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

  @keyframes sol_fadeInDown {
    from { opacity: 0; transform: translateY(-18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sol_fadeInUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sol_shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-8px); }
    40%     { transform: translateX(8px); }
    60%     { transform: translateX(-5px); }
    80%     { transform: translateX(5px); }
  }
  @keyframes sol_lockIn {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.1); }
    70%  { transform: scale(0.96); }
    100% { transform: scale(1); }
  }
  @keyframes sol_float {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-5px); }
  }
  @keyframes sol_gradShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes sol_binPulse {
    0%,100% { transform: scale(1); }
    50%     { transform: scale(1.01); }
  }
  @keyframes sol_blink {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.5; }
  }
  @keyframes sol_slideIn {
    from { opacity: 0; transform: scale(0.82) translateY(28px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes sol_spin {
    0%   { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(14deg) scale(1.18); }
    100% { transform: rotate(0deg) scale(1); }
  }
`;

// ─────────────────────────────────────────────────────────────────
// COLOUR PALETTE
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

const FONT = 'Poppins, sans-serif';

const TYPE_COLORS: Record<string, string> = {
  liquid: C.primary,
  gas:    C.accent,
  solid:  C.gradStart,
};

// ─────────────────────────────────────────────────────────────────
// SCORE STRIP
// ─────────────────────────────────────────────────────────────────

const ScoreStrip: React.FC<{ score: number; total: number; attempts: number }> = ({ score, total, attempts }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 14,
    background: `linear-gradient(135deg, ${C.gradStart}, ${C.primary})`,
    borderRadius: 50, padding: '8px 22px',
    flexWrap: 'wrap', justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(83,48,134,0.28)',
  }}>
    <span style={{ color: C.white, fontFamily: FONT, fontWeight: 700, fontSize: 14 }}>
      {'\u2705'} {score} / {total}
    </span>
    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.3)' }} />
    <span style={{ color: C.accentLight, fontFamily: FONT, fontSize: 12, fontWeight: 500 }}>
      {attempts} attempt{attempts !== 1 ? 's' : ''}
    </span>
    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.3)' }} />
    <div style={{ height: 7, width: 88, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${total > 0 ? (score / total) * 100 : 0}%`,
        background: `linear-gradient(90deg, ${C.accent}, ${C.accentLight})`,
        borderRadius: 4,
        transition: 'width 0.6s ease',
      }} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// TILE CARD
// ─────────────────────────────────────────────────────────────────

const TileCard: React.FC<{
  tile: TileData;
  isDragging: boolean;
  isSelected: boolean;
  shaking: boolean;
  hint?: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onClick: (id: string) => void;
}> = ({ tile, isDragging, isSelected, shaking, hint, onDragStart, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const getBg = () => {
    if (isSelected) return `linear-gradient(135deg, ${C.accentLight}, #ffe8d0)`;
    return C.white;
  };
  const getBorder = () => {
    if (isSelected) return `2.5px solid ${C.accent}`;
    if (hovered) return `2.5px solid ${C.primaryLight}`;
    return `2px solid ${C.disabled}`;
  };
  const getTransform = () => {
    if (isDragging) return 'scale(1.08) rotate(-2deg)';
    if (isSelected) return 'scale(1.04)';
    if (hovered) return 'scale(1.03)';
    return 'scale(1)';
  };
  const getShadow = () => {
    if (isDragging) return `0 14px 32px rgba(74,77,201,0.28)`;
    if (isSelected) return `0 6px 20px rgba(255,114,18,0.25)`;
    if (hovered) return '0 4px 14px rgba(0,0,0,0.1)';
    return '0 2px 6px rgba(0,0,0,0.06)';
  };
  const getAnimation = () => {
    if (shaking) return 'sol_shake 0.4s ease';
    return 'sol_float 3s ease-in-out infinite';
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, tile.id)}
      onClick={() => onClick(tile.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: getBg(),
        border: getBorder(),
        borderRadius: 16,
        padding: '14px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        cursor: 'grab',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease',
        transform: getTransform(),
        boxShadow: getShadow(),
        animation: getAnimation(),
        position: 'relative',
        userSelect: 'none',
        minHeight: 105,
        boxSizing: 'border-box',
      }}
    >
      {/* type badge */}
      <div style={{
        position: 'absolute', top: 7, right: 7,
        background: TYPE_COLORS[tile.type] ?? C.primary,
        borderRadius: 6, padding: '2px 7px',
        fontSize: 9, color: C.white, fontFamily: FONT,
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {tile.type}
      </div>

      <span style={{ fontSize: 28, lineHeight: 1 }}>{tile.emoji}</span>

      <span style={{
        fontFamily: FONT, fontWeight: 600, fontSize: 11,
        color: C.textDark, textAlign: 'center', lineHeight: 1.3,
      }}>
        {tile.label}
      </span>

      {hint && (
        <span style={{
          fontFamily: FONT, fontSize: 9, color: C.accent,
          textAlign: 'center', fontStyle: 'italic', lineHeight: 1.3,
        }}>
          {'\uD83D\uDCA1'} {hint}
        </span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// LOCKED TILE (inside a bin)
// ─────────────────────────────────────────────────────────────────

const LockedTile: React.FC<{ tile: PlacedTile }> = ({ tile }) => (
  <div style={{
    background: tile.correct ? C.successBg : C.errorBg,
    border: `2px solid ${tile.correct ? C.success : C.error}`,
    borderRadius: 12, padding: '10px 6px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    animation: 'sol_lockIn 0.35s ease',
  }}>
    <span style={{ fontSize: 22, lineHeight: 1 }}>{tile.emoji}</span>
    <span style={{
      fontFamily: FONT, fontWeight: 600, fontSize: 10,
      color: tile.correct ? C.successText : C.errorText,
      textAlign: 'center', lineHeight: 1.3,
    }}>
      {tile.label}
    </span>
    <IconCheck size={13} color={tile.correct ? C.success : C.error} />
  </div>
);

// ─────────────────────────────────────────────────────────────────
// DROP BIN
// ─────────────────────────────────────────────────────────────────

const DropBin: React.FC<{
  type: 'dissolves' | 'not_dissolves';
  isOver: boolean;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onBinClick: (type: 'dissolves' | 'not_dissolves') => void;
  placedTiles: PlacedTile[];
}> = ({ type, isOver, onDrop, onDragOver, onDragLeave, onBinClick, placedTiles }) => {
  const isDissolves = type === 'dissolves';
  const headerGrad = isDissolves
    ? `linear-gradient(135deg, ${C.gradStart}, ${C.primary})`
    : `linear-gradient(135deg, ${C.accent}, ${C.gradEnd})`;
  const hoverBg = isDissolves
    ? 'rgba(193,193,234,0.22)'
    : 'rgba(255,243,228,0.45)';
  const borderColor = isOver
    ? (isDissolves ? C.primary : C.accent)
    : C.disabled;

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => onBinClick(type)}
      style={{
        flex: '1 1 220px',
        minWidth: 0,
        borderRadius: 20,
        border: `3px dashed ${borderColor}`,
        background: isOver ? hoverBg : 'rgba(245,245,245,0.5)',
        padding: 14,
        transition: 'all 0.25s ease',
        transform: isOver ? 'scale(1.02)' : 'scale(1)',
        animation: isOver ? 'none' : 'sol_binPulse 2.5s ease-in-out infinite',
        cursor: 'pointer',
        minHeight: 180,
        boxSizing: 'border-box',
      }}
    >
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 14, padding: '11px 14px',
        borderRadius: 13,
        background: headerGrad,
        boxShadow: `0 4px 14px ${isDissolves ? 'rgba(74,77,201,0.28)' : 'rgba(255,114,18,0.28)'}`,
      }}>
        {isDissolves
          ? <IconDroplets size={20} color={C.white} />
          : <IconFlask size={20} color={C.white} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 13, color: C.white }}>
            {isDissolves ? 'Dissolves in Water \u2713' : 'Does NOT Dissolve \u2717'}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
            {isDissolves ? 'Soluble substances' : 'Insoluble substances'}
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.25)', borderRadius: 20,
          padding: '3px 11px', flexShrink: 0,
          fontFamily: FONT, fontWeight: 700, fontSize: 13, color: C.white,
        }}>
          {placedTiles.length}
        </div>
      </div>

      {/* empty state */}
      {placedTiles.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '16px 8px',
          fontFamily: FONT, fontSize: 12,
          color: C.textLight, fontStyle: 'italic', lineHeight: 1.7,
        }}>
          {isDissolves ? '\uD83C\uDFAF Drop soluble items here' : '\uD83D\uDEAB Drop insoluble items here'}
          <br />
          <span style={{ fontSize: 10 }}>(tap item, then tap bin)</span>
        </div>
      )}

      {/* placed tiles */}
      {placedTiles.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
          gap: 8,
        }}>
          {placedTiles.map((t) => <LockedTile key={t.id} tile={t} />)}
        </div>
      )}
    </div>
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
    borderRadius: 14, padding: '12px 16px',
    display: 'flex', alignItems: 'flex-start', gap: 10,
    animation: 'sol_fadeInUp 0.35s ease',
    boxShadow: `0 4px 14px ${correct ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'}`,
    maxWidth: 680, margin: '0 auto',
  }}>
    <div style={{ flexShrink: 0, marginTop: 1 }}>
      {correct
        ? <IconCheck size={20} color={C.success} />
        : <IconXCircle size={20} color={C.error} />
      }
    </div>
    <span style={{
      fontFamily: FONT, fontSize: 13, fontWeight: 500,
      color: correct ? C.successText : C.errorText, lineHeight: 1.55,
    }}>
      {text}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// FINAL CARD
// ─────────────────────────────────────────────────────────────────

const FinalCard: React.FC<{
  score: number;
  total: number;
  message: string;
  onReset: () => void;
}> = ({ score, total, message, onReset }) => {
  const perfect = score === total;
  const [hover, setHover] = useState(false);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(26,26,46,0.65)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: C.white, borderRadius: 24, padding: '36px 32px',
        maxWidth: 440, width: '90%', textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
        animation: 'sol_slideIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ fontSize: 52, marginBottom: 8, animation: 'sol_spin 1.2s ease infinite' }}>
          {perfect ? '\uD83C\uDFC6' : '\uD83C\uDF89'}
        </div>

        <div style={{
          fontFamily: FONT, fontWeight: 800, fontSize: 20,
          background: `linear-gradient(135deg, ${C.gradStart}, ${C.primary})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 6,
        }}>
          Sorting Complete!
        </div>

        <div style={{
          fontFamily: FONT, fontWeight: 800, fontSize: 40,
          color: perfect ? C.success : C.primary,
          marginBottom: 12,
        }}>
          {score} / {total}
        </div>

        <div style={{
          fontFamily: FONT, fontSize: 12, color: C.textMid,
          lineHeight: 1.65, marginBottom: 14,
          padding: '12px 14px',
          background: `linear-gradient(135deg, ${C.accentLight}, rgba(193,193,234,0.18))`,
          borderRadius: 12,
          border: `1px solid ${C.primaryLight}`,
        }}>
          {message}
        </div>

        <div style={{
          fontFamily: FONT, fontSize: 12, fontWeight: 600,
          color: C.textDark, marginBottom: 22,
          padding: '11px 14px',
          background: '#f0fdf4',
          borderRadius: 12,
          border: '1px solid #86efac',
        }}>
          {'\uD83D\uDCA1'} The same rule covers solids, liquids, and gases.
          <br />
          <span style={{ fontWeight: 400, color: C.textMid }}>
            Solubility is a universal property of matter!
          </span>
        </div>

        <button
          onClick={onReset}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            background: hover
              ? `linear-gradient(135deg, ${C.primary}, ${C.gradStart})`
              : `linear-gradient(135deg, ${C.gradStart}, ${C.primary})`,
            color: C.white, border: 'none', borderRadius: 50,
            padding: '12px 34px', cursor: 'pointer',
            fontFamily: FONT, fontWeight: 700, fontSize: 14,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(83,48,134,0.35)',
            transform: hover ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.2s, background 0.2s',
          }}
        >
          <IconReset size={15} color={C.white} />
          Try Again
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

const SolubilitySorter: React.FC<SolubilitySorterProps> = ({ props: toolProps = {} }) => {
  const { additionalProps = {} } = toolProps;

  const tiles: TileData[] =
    additionalProps.tiles && additionalProps.tiles.length > 0
      ? additionalProps.tiles
      : DEFAULT_TILES;

  const finalMessage: string =
    additionalProps.finalCardMessage ??
    "The same solubility rule applies to solids, liquids, and gases. Oxygen dissolves in water so fish can breathe; oil does not — that's why it floats. CO\u2082 dissolves under pressure to make soda fizzy!";

  const [remaining, setRemaining]     = useState<TileData[]>([...tiles]);
  const [placed, setPlaced]           = useState<PlacedTile[]>([]);
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [overBin, setOverBin]         = useState<'dissolves' | 'not_dissolves' | null>(null);
  const [shakingId, setShakingId]     = useState<string | null>(null);
  const [feedback, setFeedback]       = useState<{ text: string; correct: boolean } | null>(null);
  const [hintId, setHintId]           = useState<string | null>(null);
  const [attempts, setAttempts]       = useState(0);
  const [showFinal, setShowFinal]     = useState(false);
  const [resetHover, setResetHover]   = useState(false);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // inject keyframes once
  useEffect(() => {
    const styleId = 'solubility-sorter-kf';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = KEYFRAMES;
      document.head.appendChild(s);
    }
  }, []);

  const score = placed.filter(p => p.correct).length;

  const tryPlace = useCallback((tileId: string, bin: 'dissolves' | 'not_dissolves') => {
    const tile = remaining.find(t => t.id === tileId);
    if (!tile) return;

    const correct = tile.soluble === (bin === 'dissolves');
    setAttempts(a => a + 1);

    if (correct) {
      setPlaced(prev => [...prev, { ...tile, correct: true, placedIn: bin }]);
      setRemaining(prev => prev.filter(t => t.id !== tileId));
      setFeedback({ text: `\u2705 ${tile.reason}`, correct: true });
      setHintId(null);
    } else {
      setShakingId(tileId);
      setFeedback({ text: `\u274C Not quite! ${tile.hint}`, correct: false });
      setHintId(tileId);
      setTimeout(() => setShakingId(null), 450);
    }

    setSelectedId(null);
    setDraggingId(null);

    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4200);
  }, [remaining]);

  useEffect(() => {
    if (remaining.length === 0 && tiles.length > 0) {
      const t = setTimeout(() => setShowFinal(true), 650);
      return () => clearTimeout(t);
    }
  }, [remaining.length, tiles.length]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('tileId', id);
    setDraggingId(id);
    setSelectedId(null);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, bin: 'dissolves' | 'not_dissolves') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('tileId');
    setOverBin(null);
    if (id) tryPlace(id, bin);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, bin: 'dissolves' | 'not_dissolves') => {
    e.preventDefault();
    setOverBin(bin);
  };

  const handleTileClick = (id: string) =>
    setSelectedId(prev => (prev === id ? null : id));

  const handleBinClick = (bin: 'dissolves' | 'not_dissolves') => {
    if (selectedId) tryPlace(selectedId, bin);
  };

  const handleReset = () => {
    setRemaining([...tiles]);
    setPlaced([]);
    setDraggingId(null);
    setSelectedId(null);
    setOverBin(null);
    setShakingId(null);
    setFeedback(null);
    setHintId(null);
    setAttempts(0);
    setShowFinal(false);
  };

  return (
    <div style={{
      fontFamily: FONT,
      background: C.bg,
      minHeight: '100vh',
      padding: '16px',
      boxSizing: 'border-box',
    }}>

      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: 18, animation: 'sol_fadeInDown 0.6s ease' }}>
        <div style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: 'clamp(20px, 5vw, 30px)',
          letterSpacing: -0.5,
          background: `linear-gradient(135deg, ${C.gradStart}, ${C.primary}, ${C.accent})`,
          backgroundSize: '200% 200%',
          animation: 'sol_gradShift 4s ease infinite',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 4,
        }}>
          {'\uD83D\uDCA7'} Solubility Sorter
        </div>
        <p style={{
          fontFamily: FONT, fontSize: 13, color: C.textMid,
          margin: '0 0 14px', fontWeight: 500,
        }}>
          Drag each item into the correct bin — or tap an item, then tap a bin!
        </p>
        <ScoreStrip score={score} total={tiles.length} attempts={attempts} />
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div style={{ marginBottom: 14 }}>
          <FeedbackBanner text={feedback.text} correct={feedback.correct} />
        </div>
      )}

      {/* BINS — above tile grid */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <DropBin
          type="dissolves"
          isOver={overBin === 'dissolves'}
          onDrop={(e) => handleDrop(e, 'dissolves')}
          onDragOver={(e) => handleDragOver(e, 'dissolves')}
          onDragLeave={() => setOverBin(null)}
          onBinClick={handleBinClick}
          placedTiles={placed.filter(p => p.placedIn === 'dissolves')}
        />
        <DropBin
          type="not_dissolves"
          isOver={overBin === 'not_dissolves'}
          onDrop={(e) => handleDrop(e, 'not_dissolves')}
          onDragOver={(e) => handleDragOver(e, 'not_dissolves')}
          onDragLeave={() => setOverBin(null)}
          onBinClick={handleBinClick}
          placedTiles={placed.filter(p => p.placedIn === 'not_dissolves')}
        />
      </div>

      {/* TILE GRID */}
      {remaining.length > 0 && (
        <div style={{
          background: C.white,
          borderRadius: 20,
          padding: 16,
          marginBottom: 18,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: `1px solid ${C.disabled}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <IconSort size={16} color={C.primary} />
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: C.textDark }}>
              Items to Sort ({remaining.length} remaining)
            </span>
            {selectedId && (
              <span style={{
                marginLeft: 'auto',
                fontFamily: FONT, fontSize: 12, fontWeight: 600,
                color: C.accent,
                animation: 'sol_blink 1s ease-in-out infinite',
              }}>
                Selected! Tap a bin {'\u2191'}
              </span>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
            gap: 10,
          }}>
            {remaining.map((tile) => (
              <TileCard
                key={tile.id}
                tile={tile}
                isDragging={draggingId === tile.id}
                isSelected={selectedId === tile.id}
                shaking={shakingId === tile.id}
                hint={hintId === tile.id ? tile.hint : undefined}
                onDragStart={handleDragStart}
                onClick={handleTileClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* RESET */}
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>
        <button
          onClick={handleReset}
          onMouseEnter={() => setResetHover(true)}
          onMouseLeave={() => setResetHover(false)}
          style={{
            background: resetHover ? C.primaryLight : C.white,
            color: C.primary,
            border: `2px solid ${C.primaryLight}`,
            borderRadius: 50,
            padding: '10px 26px',
            cursor: 'pointer',
            fontFamily: FONT, fontWeight: 600, fontSize: 13,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            transition: 'background 0.2s, transform 0.2s',
            transform: resetHover ? 'scale(1.04)' : 'scale(1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          }}
        >
          <IconReset size={14} color={C.primary} />
          Reset
        </button>
      </div>

      {/* FINAL OVERLAY */}
      {showFinal && (
        <FinalCard
          score={score}
          total={tiles.length}
          message={finalMessage}
          onReset={handleReset}
        />
      )}
    </div>
  );
};

export default SolubilitySorter;