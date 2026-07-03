import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// INLINE SVG ICONS
// ─────────────────────────────────────────────────────────────────

const SvgCheck: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const SvgRotate: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" />
  </svg>
);

const SvgStar: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// MAGNET SVGs
// ─────────────────────────────────────────────────────────────────

const BarMagnetSvg: React.FC<{ locked: boolean; color: string }> = ({ locked, color }) => (
  <svg viewBox="0 0 180 70" width="100%" style={{ maxWidth: 180, display: 'block' }}>
    <rect x="4" y="14" width="172" height="42" rx="9"
      fill={locked ? color + '18' : '#f9fafb'}
      stroke={locked ? color : '#cbd5e1'}
      strokeWidth="2.5" strokeDasharray={locked ? '0' : '7 4'} />
    <rect x="4" y="14" width="58" height="42" rx="9"
      fill={locked ? '#fee2e2' : '#f1f5f9'} stroke="none" />
    <line x1="88" y1="16" x2="88" y2="54" stroke={locked ? color + '88' : '#e2e8f0'} strokeWidth="2" />
    <text x="33" y="41" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight="800" fontSize="20"
      fill={locked ? '#ef4444' : '#cbd5e1'}>N</text>
    <text x="145" y="41" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight="800" fontSize="20"
      fill={locked ? '#3b82f6' : '#cbd5e1'}>S</text>
  </svg>
);

const UMagnetSvg: React.FC<{ locked: boolean; color: string }> = ({ locked, color }) => (
  <svg viewBox="0 0 150 130" width="100%" style={{ maxWidth: 150, display: 'block' }}>
    <rect x="8" y="6" width="38" height="86" rx="7"
      fill={locked ? '#fee2e2' : '#f1f5f9'}
      stroke={locked ? color : '#cbd5e1'}
      strokeWidth="2.5" strokeDasharray={locked ? '0' : '7 4'} />
    <rect x="104" y="6" width="38" height="86" rx="7"
      fill={locked ? '#dbeafe' : '#f1f5f9'}
      stroke={locked ? color : '#cbd5e1'}
      strokeWidth="2.5" strokeDasharray={locked ? '0' : '7 4'} />
    <path d="M8 86 Q8 124 75 124 Q142 124 142 86"
      fill="none" stroke={locked ? color : '#cbd5e1'}
      strokeWidth="2.5" strokeDasharray={locked ? '0' : '7 4'} />
    <path d="M46 86 Q46 106 75 106 Q104 106 104 86"
      fill="none" stroke={locked ? color + '55' : '#e2e8f0'} strokeWidth="10" />
    <text x="27" y="56" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight="800" fontSize="17"
      fill={locked ? '#ef4444' : '#cbd5e1'}>N</text>
    <text x="123" y="56" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight="800" fontSize="17"
      fill={locked ? '#3b82f6' : '#cbd5e1'}>S</text>
  </svg>
);

const RingMagnetSvg: React.FC<{ locked: boolean; color: string }> = ({ locked, color }) => (
  <svg viewBox="0 0 130 130" width="100%" style={{ maxWidth: 130, display: 'block' }}>
    <circle cx="65" cy="65" r="57"
      fill={locked ? color + '12' : '#f9fafb'}
      stroke={locked ? color : '#cbd5e1'}
      strokeWidth="2.5" strokeDasharray={locked ? '0' : '7 4'} />
    <circle cx="65" cy="65" r="26"
      fill="white"
      stroke={locked ? color : '#cbd5e1'}
      strokeWidth="2.5" strokeDasharray={locked ? '0' : '7 4'} />
    <text x="65" y="22" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight="800" fontSize="15"
      fill={locked ? '#ef4444' : '#cbd5e1'}>N</text>
    <text x="65" y="116" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight="800" fontSize="15"
      fill={locked ? '#3b82f6' : '#cbd5e1'}>S</text>
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface ShapeDef {
  id: string;
  label: string;
  fact: string;
  hint: string;
}

interface MagnetMatchingToolProps {
  props?: {
    themeColor?: string;
    additionalProps?: {
      shapes?: ShapeDef[];
      title?: string;
      subtitle?: string;
      instructionText?: string;
    };
  };
}

// ─────────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────────

const DEFAULT_SHAPES: ShapeDef[] = [
  { id: 'bar',  label: 'Bar Magnet',      fact: 'Bar magnets are the most common shape used in school laboratories.',                                    hint: 'Think of a straight rectangular block — like a ruler-shaped magnet.' },
  { id: 'u',    label: 'U-shaped Magnet', fact: 'U-shaped (horseshoe) magnets concentrate both poles close together for a stronger pull.',                hint: 'Think of the letter U — it curves at the bottom with two arms pointing up.' },
  { id: 'ring', label: 'Ring Magnet',     fact: 'Ring magnets have a hole in the centre and are used in speakers and electric motors.',                   hint: 'Think of a doughnut or a washer — a circle with a hole through the middle.' },
];

// ─────────────────────────────────────────────────────────────────
// INJECT STYLES
// ─────────────────────────────────────────────────────────────────

const injectStyles = () => {
  if (document.getElementById('mmt-styles')) return;
  const s = document.createElement('style');
  s.id = 'mmt-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

    @keyframes mmt-bounce {
      0%   { transform: translateX(0) scale(1); }
      20%  { transform: translateX(-10px) scale(.94); }
      45%  { transform: translateX(8px) scale(1.05); }
      65%  { transform: translateX(-5px) scale(.98); }
      100% { transform: translateX(0) scale(1); }
    }
    @keyframes mmt-lockIn {
      0%   { transform: scale(1); }
      35%  { transform: scale(1.07); }
      65%  { transform: scale(.97); }
      100% { transform: scale(1); }
    }
    @keyframes mmt-float {
      0%,100% { transform: translateY(0); }
      50%      { transform: translateY(-7px); }
    }
    @keyframes mmt-fadeUp {
      from { transform: translateY(18px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes mmt-fadeScale {
      from { transform: scale(.88); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }
    @keyframes mmt-confetti {
      0%   { transform: translateY(0) rotate(0deg);    opacity: 1; }
      100% { transform: translateY(250px) rotate(720deg); opacity: 0; }
    }
    @keyframes mmt-selectPulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,.5); }
      50%      { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
    }
    @keyframes mmt-wrongShake {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-8px); }
      40%     { transform: translateX(8px); }
      60%     { transform: translateX(-5px); }
      80%     { transform: translateX(4px); }
    }

    /* Desktop drag label */
    .mmt-label-drag {
      cursor: grab;
      transition: transform .17s ease, box-shadow .17s ease, border-color .17s ease;
      user-select: none;
    }
    .mmt-label-drag:hover {
      transform: translateY(-3px) scale(1.04) !important;
      box-shadow: 0 10px 24px rgba(83,48,134,.2) !important;
      border-color: #f59e0b !important;
    }
    .mmt-label-drag:active { cursor: grabbing; }

    /* Tap label (mobile) */
    .mmt-label-tap {
      cursor: pointer;
      transition: transform .17s ease, box-shadow .17s ease;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .mmt-label-tap:active {
      transform: scale(.96);
    }

    /* Shape drop zone */
    .mmt-zone { transition: all .2s ease; }
    .mmt-zone.over-drag {
      border-color: #f59e0b !important;
      background: #fffbeb !important;
      box-shadow: 0 0 0 3px rgba(245,158,11,.28) !important;
    }
    .mmt-zone.over-tap {
      border-color: #f59e0b !important;
      background: #fffbeb !important;
      box-shadow: 0 0 0 4px rgba(245,158,11,.35) !important;
      animation: mmt-selectPulse .8s ease-in-out infinite;
    }

    .mmt-btn { transition: transform .15s ease; }
    .mmt-btn:hover { transform: scale(1.04) translateY(-1px); }

    /* Tap zone button */
    .mmt-zone-btn {
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: transform .15s ease, box-shadow .15s ease;
    }
    .mmt-zone-btn:active { transform: scale(.98); }
  `;
  document.head.appendChild(s);
};

// ─────────────────────────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────────────────────────

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const pal = ['#f59e0b', '#533086', '#FC9145', '#4A4DC9', '#10b981', '#ef4444'];
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i, left: Math.random() * 100,
    delay: Math.random() * 0.7,
    color: pal[i % pal.length],
    size: 7 + Math.random() * 9,
    round: Math.random() > 0.5,
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: '-14px',
          width: p.size, height: p.size, backgroundColor: p.color,
          borderRadius: p.round ? '50%' : '3px',
          animation: `mmt-confetti 1.7s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// SUMMARY SCREEN
// ─────────────────────────────────────────────────────────────────

const SummaryScreen: React.FC<{ shapes: ShapeDef[]; color: string; onReset: () => void }> = ({ shapes, color, onReset }) => (
  <div style={{ animation: 'mmt-fadeScale .5s ease-out', padding: 'clamp(20px,4vw,36px)' }}>
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ fontSize: 56, marginBottom: 10, animation: 'mmt-float 2s ease-in-out infinite' }}>🏆</div>
      <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: 'clamp(20px,5vw,28px)', color: '#1f2937' }}>All Matched!</div>
      <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, color: '#6b7280', marginTop: 6 }}>Great work! Here's what you learned:</div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
      {shapes.map((shape, i) => {
        const svg = shape.id === 'bar' ? <BarMagnetSvg locked color={color} />
          : shape.id === 'u'  ? <UMagnetSvg  locked color={color} />
          : <RingMagnetSvg locked color={color} />;
        return (
          <div key={shape.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
            borderRadius: 14, border: `2px solid ${color}55`,
            animation: `mmt-fadeUp .4s ease-out ${i * 0.1}s both`,
          }}>
            <div style={{ width: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{svg}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 14, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <SvgStar color={color} /> {shape.label}
              </div>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{shape.fact}</div>
            </div>
          </div>
        );
      })}
    </div>

    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <button className="mmt-btn" onClick={onReset} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '13px 32px',
        background: 'linear-gradient(135deg,#533086,#4A4DC9)',
        color: '#fff', border: 'none', borderRadius: 14,
        cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
        fontWeight: 700, fontSize: 15,
        boxShadow: '0 6px 22px rgba(83,48,134,.32)',
      }}>
        <SvgRotate size={17} color="#fff" /> Try Again
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

const MagnetMatchingTool: React.FC<MagnetMatchingToolProps> = ({ props = {} }) => {
  const ap          = (props.additionalProps || {}) as any;
  const shapes      = (ap.shapes as ShapeDef[])    || DEFAULT_SHAPES;
  const title       = (ap.title as string)          || 'Magnet Shapes';
  const subtitle    = (ap.subtitle as string)       || 'Chapter 4 – Exploring Magnets';
  const instruction = (ap.instructionText as string) || 'Tap a name label to select it, then tap the matching shape to place it.';
  const color       = props.themeColor              || '#f59e0b';

  // ── State ──
  const [matched,     setMatched]     = useState<Record<string, boolean>>({});
  const [wrongZone,   setWrongZone]   = useState<string | null>(null);
  const [bounceLabel, setBounceLabel] = useState<string | null>(null);
  // drag (desktop)
  const [draggingId,  setDraggingId]  = useState<string | null>(null);
  const [overZone,    setOverZone]    = useState<string | null>(null);
  // tap/click (mobile + desktop click fallback)
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  // viewport
  const [isMobile,    setIsMobile]    = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [confetti,    setConfetti]    = useState(false);

  useEffect(() => {
    injectStyles();
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const matchedCount = Object.keys(matched).length;
  const allDone      = matchedCount === shapes.length;

  useEffect(() => {
    if (!allDone || shapes.length === 0) return;
    setConfetti(true);
    const t = setTimeout(() => { setShowSummary(true); setConfetti(false); }, 1500);
    return () => clearTimeout(t);
  }, [allDone]);

  // ── Core match logic (shared by drag-drop and tap) ──
  const tryMatch = (labelId: string, zoneId: string) => {
    if (matched[zoneId]) return;
    const correct = labelId === zoneId;
    if (correct) {
      setMatched(prev => ({ ...prev, [zoneId]: true }));
      setSelectedId(null);
    } else {
      setWrongZone(zoneId);
      setBounceLabel(labelId);
      setTimeout(() => { setWrongZone(null); setBounceLabel(null); }, 650);
    }
    setDraggingId(null);
    setOverZone(null);
  };

  // ── Drag handlers ──
  const onDragStart = (id: string) => { setDraggingId(id); setSelectedId(null); };
  const onDrop      = (zoneId: string) => { if (draggingId) tryMatch(draggingId, zoneId); };

  // ── Tap handlers ──
  const onLabelTap  = (id: string) => {
    if (matched[id]) return;
    setSelectedId(prev => prev === id ? null : id);
  };
  const onZoneTap   = (zoneId: string) => {
    if (matched[zoneId]) return;
    if (!selectedId) return;
    tryMatch(selectedId, zoneId);
  };

  const reset = () => {
    setMatched({}); setWrongZone(null); setBounceLabel(null);
    setDraggingId(null); setOverZone(null); setSelectedId(null);
    setShowSummary(false); setConfetti(false);
  };

  const unplacedLabels = shapes.filter(s => !matched[s.id]);
  const pct            = Math.round((matchedCount / shapes.length) * 100);

  // ─────────────────────────────────────────────────────────────────
  // LABEL PILL — works both as draggable (desktop) and tappable
  // ─────────────────────────────────────────────────────────────────
  const renderLabel = (shape: ShapeDef) => {
    const isSelected  = selectedId === shape.id;
    const isBouncing  = bounceLabel === shape.id;
    const isDragging  = draggingId === shape.id;
    const emoji = shape.id === 'bar' ? '▬' : shape.id === 'u' ? '∪' : '◎';

    return (
      <div
        key={shape.id}
        className={isMobile ? 'mmt-label-tap' : 'mmt-label-drag'}
        draggable={!isMobile}
        onDragStart={!isMobile ? () => onDragStart(shape.id) : undefined}
        onClick={() => onLabelTap(shape.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: isMobile ? '14px 18px' : '12px 16px',
          background: isSelected
            ? `linear-gradient(135deg,${color}22,${color}44)`
            : isDragging
              ? 'linear-gradient(135deg,#fef3c7,#fde68a)'
              : '#fff',
          border: `2px solid ${isSelected ? color : isDragging ? '#f59e0b' : '#e5e7eb'}`,
          borderRadius: 14,
          boxShadow: isSelected
            ? `0 0 0 3px ${color}44`
            : isDragging
              ? '0 12px 28px rgba(245,158,11,.3)'
              : '0 2px 8px rgba(0,0,0,.06)',
          animation: isBouncing ? 'mmt-bounce .55s ease-out' : isSelected ? 'mmt-selectPulse 1.2s ease-in-out infinite' : 'none',
          transform: isDragging ? 'scale(1.05) rotate(-1.5deg)' : 'scale(1)',
          willChange: 'transform',
          minHeight: 52,
        }}
      >
        <span style={{
          fontSize: 22, lineHeight: 1, width: 30, textAlign: 'center', flexShrink: 0,
          color: isSelected ? color : '#9ca3af',
        }}>{emoji}</span>
        <span style={{
          fontFamily: 'Poppins,sans-serif', fontWeight: 700,
          fontSize: isMobile ? 15 : 14, color: '#1f2937', flex: 1,
        }}>
          {shape.label}
        </span>
        {isSelected && (
          <span style={{
            fontFamily: 'Poppins,sans-serif', fontSize: 11, color: color,
            fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            ← tap shape
          </span>
        )}
        {!isSelected && !isMobile && (
          <span style={{ color: '#d1d5db', fontSize: 20, flexShrink: 0 }}>⠿</span>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // SHAPE ZONE
  // ─────────────────────────────────────────────────────────────────
  const renderZone = (shape: ShapeDef) => {
    const isLocked   = !!matched[shape.id];
    const isWrong    = wrongZone === shape.id;
    const isOverDrag = overZone === shape.id && !isLocked;
    const isOverTap  = selectedId !== null && !isLocked && !isMobile === false; // tap highlight on mobile

    const svg = shape.id === 'bar' ? <BarMagnetSvg locked={isLocked} color={color} />
      : shape.id === 'u'           ? <UMagnetSvg   locked={isLocked} color={color} />
      : <RingMagnetSvg             locked={isLocked} color={color} />;

    const zoneClass = `mmt-zone${isOverDrag ? ' over-drag' : ''}${(isOverTap && !isOverDrag) ? ' over-tap' : ''}`;

    return (
      <div
        key={shape.id}
        className={`${zoneClass} ${!isLocked && selectedId ? 'mmt-zone-btn' : ''}`}
        onDrop={e => { e.preventDefault(); onDrop(shape.id); }}
        onDragOver={e => { e.preventDefault(); if (!isLocked) setOverZone(shape.id); }}
        onDragLeave={() => setOverZone(null)}
        onClick={() => onZoneTap(shape.id)}
        style={{
          borderRadius: 18, padding: '16px 14px',
          background: isLocked ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)' : isWrong ? '#fef2f2' : '#fff',
          border: `2.5px ${isLocked ? 'solid' : 'dashed'} ${isLocked ? '#10b981' : isWrong ? '#fca5a5' : '#cbd5e1'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          animation: isWrong ? 'mmt-wrongShake .5s ease-out' : isLocked ? 'mmt-lockIn .45s ease-out' : 'none',
          minHeight: isMobile ? 160 : 180,
          boxSizing: 'border-box',
          cursor: selectedId && !isLocked ? 'pointer' : 'default',
          position: 'relative',
        }}
      >
        {/* tap-to-place ring indicator */}
        {selectedId && !isLocked && !isMobile === false && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 16,
            border: `3px solid ${color}`,
            pointerEvents: 'none',
            animation: 'mmt-selectPulse .9s ease-in-out infinite',
          }} />
        )}

        {/* SVG illustration */}
        <div style={{
          width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '4px 8px', flex: 1,
        }}>
          {svg}
        </div>

        {/* Footer text */}
        {isLocked ? (
          <div style={{ width: '100%', animation: 'mmt-fadeUp .35s ease-out' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 30,
              background: `linear-gradient(135deg,${color},${color}cc)`,
              boxShadow: `0 4px 12px ${color}44`, marginBottom: 8,
            }}>
              <SvgCheck size={14} color="#fff" />
              <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff' }}>
                {shape.label}
              </span>
            </div>
            <div style={{
              fontFamily: 'Poppins,sans-serif', fontSize: 11, color: '#065f46',
              lineHeight: 1.5, textAlign: 'center',
              background: '#ecfdf5', borderRadius: 8, padding: '6px 10px',
            }}>
              💡 {shape.fact}
            </div>
          </div>
        ) : isWrong ? (
          <div style={{
            fontFamily: 'Poppins,sans-serif', fontSize: 11, color: '#dc2626',
            textAlign: 'center', lineHeight: 1.4, padding: '0 4px',
          }}>
            💡 {shape.hint}
          </div>
        ) : selectedId ? (
          <div style={{
            fontFamily: 'Poppins,sans-serif', fontSize: 12,
            color: color, fontWeight: 600, textAlign: 'center',
          }}>
            Tap to place here ↑
          </div>
        ) : (
          <div style={{
            fontFamily: 'Poppins,sans-serif', fontSize: 12, color: '#94a3b8', textAlign: 'center',
          }}>
            {isMobile ? 'Select a label above ↑' : 'Drop label here ↓'}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // MOBILE LAYOUT — labels on top, shapes below (stacked)
  // DESKTOP LAYOUT — two columns: shapes left, labels right
  // ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      fontFamily: 'Poppins,sans-serif', minHeight: '100vh',
      background: 'linear-gradient(160deg,#fffbeb 0%,#f5f3ff 55%,#fef3c7 100%)',
      boxSizing: 'border-box',
    }}>
      <Confetti active={confetti} />

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg,#533086 0%,#4A4DC9 55%,#FC9145 100%)',
        padding: 'clamp(16px,4vw,26px) clamp(14px,5vw,28px) clamp(12px,3vw,20px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: 50, width: 75, height: 75, borderRadius: '50%', background: 'rgba(255,255,255,.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 20,
            background: 'rgba(255,255,255,.18)', marginBottom: 8,
            fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,.92)', letterSpacing: 1,
          }}>
            {subtitle.toUpperCase()}
          </div>
          <div style={{ fontWeight: 800, fontSize: 'clamp(16px,4vw,25px)', color: '#fff', lineHeight: 1.25, marginBottom: 10 }}>
            🧲 {title}
          </div>
          <div style={{
            fontSize: 'clamp(11px,2.5vw,13px)', color: 'rgba(255,255,255,.88)',
            lineHeight: 1.6, background: 'rgba(255,255,255,.12)', padding: '9px 13px', borderRadius: 10,
          }}>
            📌 <strong>Instructions:</strong>{' '}
            {isMobile
              ? 'Tap a name label to select it (it glows), then tap the correct shape below.'
              : instruction}
          </div>
        </div>
      </div>

      {/* ── PROGRESS ── */}
      <div style={{ padding: '10px 14px', background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 720, margin: '0 auto' }}>
          <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 12, color: '#533086', whiteSpace: 'nowrap' }}>
            {matchedCount}/{shapes.length} matched
          </span>
          <div style={{ flex: 1, height: 7, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: 'linear-gradient(90deg,#533086,#FC9145)',
              borderRadius: 999, transition: 'width .55s ease',
            }} />
          </div>
          {matchedCount > 0 && (
            <button onClick={reset} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px',
              border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff',
              color: '#6b7280', cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
              fontSize: 12, whiteSpace: 'nowrap',
            }}>
              <SvgRotate size={13} color="#9ca3af" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: 'clamp(14px,3vw,22px) clamp(12px,4vw,18px)', maxWidth: 760, margin: '0 auto', boxSizing: 'border-box' }}>

        {showSummary ? (
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,.08)' }}>
            <SummaryScreen shapes={shapes} color={color} onReset={reset} />
          </div>
        ) : isMobile ? (
          /* ══════════════ MOBILE LAYOUT ══════════════
             Labels first (full-width pill grid), then shapes stacked below */
          <>
            {/* LABELS SECTION */}
            {unplacedLabels.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{
                  fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 12, color: '#533086',
                  marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <span style={{
                    background: color, color: '#fff', borderRadius: '50%',
                    width: 20, height: 20, display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 11,
                  }}>{unplacedLabels.length}</span>
                  Tap a name label:
                </div>
                {/* Grid: 1 col on very small, 2 col when wider */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                }}>
                  {unplacedLabels.map(renderLabel)}
                </div>

                {/* Selection hint */}
                {selectedId && (
                  <div style={{
                    marginTop: 10, padding: '8px 14px', borderRadius: 10,
                    background: `${color}18`, border: `1.5px solid ${color}66`,
                    fontFamily: 'Poppins,sans-serif', fontSize: 12, color: '#92400e',
                    fontWeight: 600, textAlign: 'center',
                    animation: 'mmt-fadeUp .3s ease-out',
                  }}>
                    ✅ "{shapes.find(s => s.id === selectedId)?.label}" selected — now tap the correct shape below
                  </div>
                )}
              </div>
            )}

            {/* SHAPES SECTION */}
            <div style={{
              fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 12, color: '#533086',
              marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <span style={{
                background: '#533086', color: '#fff', borderRadius: '50%',
                width: 20, height: 20, display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11,
              }}>📐</span>
              {selectedId ? 'Tap the matching shape:' : 'Magnet Shapes:'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {shapes.map(renderZone)}
            </div>
          </>
        ) : (
          /* ══════════════ DESKTOP LAYOUT ══════════════
             Two-column: shapes (left) | labels + legend (right sticky) */
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr minmax(220px, 280px)',
            gap: 22, alignItems: 'start',
          }}>
            {/* LEFT — Shapes */}
            <div>
              <div style={{
                fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 13, color: '#533086',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  background: '#533086', color: '#fff', borderRadius: '50%',
                  width: 22, height: 22, display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 12,
                }}>📐</span>
                Magnet Shapes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {shapes.map(renderZone)}
              </div>
            </div>

            {/* RIGHT — Labels + Legend */}
            <div style={{ position: 'sticky', top: 16 }}>
              <div style={{
                fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 13, color: '#533086',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  background: color, color: '#fff', borderRadius: '50%',
                  width: 22, height: 22, display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 12,
                }}>{unplacedLabels.length}</span>
                Name Labels
              </div>

              {unplacedLabels.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '28px 20px',
                  background: '#f9fafb', borderRadius: 14, border: '2px dashed #e5e7eb',
                  fontFamily: 'Poppins,sans-serif', fontSize: 13, color: '#9ca3af',
                  animation: 'mmt-float 2s ease-in-out infinite',
                }}>🎉 All labels placed!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {unplacedLabels.map(renderLabel)}
                </div>
              )}

              {/* Legend */}
              <div style={{
                marginTop: 18, padding: '11px 14px', background: '#fff',
                borderRadius: 12, border: '1px solid #f3f4f6',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 10, color: '#9ca3af', letterSpacing: 1 }}>HOW TO PLAY</div>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 12, color: '#374151' }}>
                  🖱️ <strong>Desktop:</strong> Drag a label onto the matching shape outline
                </div>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 12, color: '#374151' }}>
                  <SvgCheck size={12} color="#10b981" /> Correct → locked with fun fact
                </div>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 12, color: '#374151' }}>
                  ↩ Wrong → bounces back with hint
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MagnetMatchingTool;