import React, { useState, useEffect, useRef } from 'react';
import { Check, X, RotateCcw, Zap, BookOpen } from 'lucide-react';

// ─── Easing Functions ──────────────────────────────────────────────────────────
const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Option {
  label: string;
  values: { A: number; B: number; C: number };
}

interface MagnetSelectionToolProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    showModeSelector?: boolean;
    showNavigation?: boolean;
    showPlayPause?: boolean;
    showStepIndicator?: boolean;
    autoPlayDuration?: number;
    additionalProps?: {
      magnetLabel?: string;
      instructionText?: string;
      northLabel?: string;
      southLabel?: string;
      options?: Option[];
      correctIndex?: number;
      correctExplanation?: string;
      incorrectHint?: string;
    };
  };
}

// ─── UClip SVG Component ────────────────────────────────────────────────────────
const UClip: React.FC<{ x: number; y: number; color: string; delay: number; visible: boolean }> = ({
  x, y, color, delay, visible
}) => {
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(-20);

  useEffect(() => {
    if (!visible) { setOpacity(0); setTranslateY(-20); return; }
    const timer = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const t = Math.min((now - start) / 600, 1);
        const e = easeOutElastic(t);
        setOpacity(Math.min(t * 3, 1));
        setTranslateY(-20 + 20 * e);
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timer);
  }, [visible, delay]);

  return (
    <g transform={`translate(${x}, ${y + translateY})`} style={{ opacity }}>
      <path
        d={`M-5,0 L-5,-10 Q-5,-16 0,-16 Q5,-16 5,-10 L5,0`}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line x1="-5" y1="0" x2="-9" y2="6" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="5" y1="0" x2="9" y2="6" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </g>
  );
};

// ─── Magnet Diagram ─────────────────────────────────────────────────────────────
const MagnetDiagram: React.FC<{
  showClusters: boolean;
  primaryColor: string;
  accentColor: string;
  northLabel: string;
  southLabel: string;
}> = ({ showClusters, primaryColor, accentColor, northLabel, southLabel }) => {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    if (!showClusters) { setAnimProgress(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / 800, 1);
      setAnimProgress(easeOutCubic(t));
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [showClusters]);

  // U-clip positions for poles A and C
  const clipPositionsA = [
    { x: 62, y: 52 }, { x: 75, y: 48 }, { x: 50, y: 56 },
    { x: 68, y: 62 }, { x: 55, y: 44 }, { x: 80, y: 58 },
    { x: 58, y: 70 }, { x: 72, y: 40 }, { x: 45, y: 62 }, { x: 83, y: 46 }
  ];
  const clipPositionsC = [
    { x: 318, y: 52 }, { x: 305, y: 48 }, { x: 330, y: 56 },
    { x: 312, y: 62 }, { x: 325, y: 44 }, { x: 300, y: 58 },
    { x: 322, y: 70 }, { x: 308, y: 40 }, { x: 335, y: 62 }, { x: 297, y: 46 }
  ];
  // Few clips at B (middle)
  const clipPositionsB = [
    { x: 188, y: 48 }, { x: 196, y: 64 }
  ];

  return (
    <svg viewBox="0 0 380 130" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Glow filter */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="magnetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={primaryColor}/>
          <stop offset="45%" stopColor={primaryColor} stopOpacity="0.85"/>
          <stop offset="55%" stopColor={accentColor} stopOpacity="0.85"/>
          <stop offset="100%" stopColor={accentColor}/>
        </linearGradient>
        <linearGradient id="magnetShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.1)"/>
        </linearGradient>
      </defs>

      {/* Magnet body */}
      <rect x="40" y="50" width="300" height="28" rx="14" fill="url(#magnetGrad)" filter="url(#glow)"/>
      <rect x="40" y="50" width="300" height="14" rx="14" fill="url(#magnetShine)" opacity="0.6"/>

      {/* Pole labels */}
      <text x="90" y="69" textAnchor="middle" fontSize="11" fontWeight="800"
        fill="white" fontFamily="'Poppins', sans-serif" letterSpacing="1">{northLabel}</text>
      <text x="290" y="69" textAnchor="middle" fontSize="11" fontWeight="800"
        fill="white" fontFamily="'Poppins', sans-serif" letterSpacing="1">{southLabel}</text>

      {/* Position markers */}
      {[
        { x: 65, label: 'A' },
        { x: 190, label: 'B' },
        { x: 315, label: 'C' }
      ].map(({ x, label }) => (
        <g key={label}>
          <line x1={x} y1="50" x2={x} y2="100" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4,3"/>
          <circle cx={x} cy="108" r="12" fill="#1e1b4b" stroke="#4338ca" strokeWidth="2"/>
          <text x={x} y="113" textAnchor="middle" fontSize="11" fontWeight="700"
            fill="white" fontFamily="'Poppins', sans-serif">{label}</text>
        </g>
      ))}

      {/* U-clips at A (many) */}
      {showClusters && clipPositionsA.map((pos, i) => (
        <UClip key={`a-${i}`} x={pos.x} y={pos.y} color="#f59e0b"
          delay={i * 60} visible={showClusters} />
      ))}

      {/* U-clips at C (many) */}
      {showClusters && clipPositionsC.map((pos, i) => (
        <UClip key={`c-${i}`} x={pos.x} y={pos.y} color="#f59e0b"
          delay={i * 60 + 100} visible={showClusters} />
      ))}

      {/* U-clips at B (few) */}
      {showClusters && clipPositionsB.map((pos, i) => (
        <UClip key={`b-${i}`} x={pos.x} y={pos.y} color="#9ca3af"
          delay={800 + i * 80} visible={showClusters} />
      ))}
    </svg>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
const MagnetSelectionTool: React.FC<MagnetSelectionToolProps> = ({ props = {} }) => {
  const {
    themeColor = '#f59e0b',
    darkMode = false,
    additionalProps = {}
  } = props;

  const {
    magnetLabel = 'Bar Magnet',
    instructionText = 'Look at the three positions on the bar magnet. Select the option that correctly shows how many U-clips stick at each position. Remember what you learnt about where iron filings cluster.',
    northLabel = 'N',
    southLabel = 'S',
    options = [
      { label: '(i)', values: { A: 10, B: 2, C: 10 } },
      { label: '(ii)', values: { A: 10, B: 10, C: 2 } },
      { label: '(iii)', values: { A: 2, B: 10, C: 10 } },
      { label: '(iv)', values: { A: 10, B: 10, C: 10 } },
    ],
    correctIndex = 0,
    correctExplanation = 'The magnetic pull is strongest at the poles (A and C), so more U-clips stick there and very few in the middle (B).',
    incorrectHint = 'Remember where iron filings clustered on the bar magnet. Which parts attract most?'
  } = additionalProps;

  const [selected, setSelected] = useState<number | null>(null);
  const [showClusters, setShowClusters] = useState(false);
  const [shake, setShake] = useState<number | null>(null);
  const [pulse, setPulse] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Accent colors from design PDF
  const primary = '#533086';      // purple gradient start
  const accent = themeColor;       // amber/orange from theme
  const cardBg = darkMode ? '#1a1035' : '#ffffff';
  const pageBg = darkMode ? '#0f0a2a' : '#f5f5f5';
  const textMain = darkMode ? '#f5f5f5' : '#1e1b4b';
  const textSub = darkMode ? '#c1c1ea' : '#533086';
  const borderCol = darkMode ? '#533086' : '#c1c1ea';

  useEffect(() => {
    // Inject keyframes
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      @keyframes slideInUp {
        from { opacity: 0; transform: translateY(32px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-5px); }
        80% { transform: translateX(5px); }
      }
      @keyframes popIn {
        0% { transform: scale(0.85); opacity: 0; }
        60% { transform: scale(1.06); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes correctPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
        50% { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
      }
      @keyframes floatBadge {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-4px); }
      }
      @keyframes gradientShift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      @keyframes sparkle {
        0% { opacity: 0; transform: scale(0) rotate(0deg); }
        50% { opacity: 1; transform: scale(1) rotate(180deg); }
        100% { opacity: 0; transform: scale(0) rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => setMounted(true), 50);
    return () => document.head.removeChild(style);
  }, []);

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === correctIndex) {
      setPulse(idx);
      setTimeout(() => setShowClusters(true), 400);
    } else {
      setShake(idx);
      setTimeout(() => setShake(null), 600);
    }
  };

  const handleReset = () => {
    setSelected(null);
    setShowClusters(false);
    setShake(null);
    setPulse(null);
  };

  const isCorrect = selected === correctIndex;
  const isAnswered = selected !== null;

  return (
    <div style={{
      fontFamily: "'Poppins', sans-serif",
      minHeight: '100vh',
      background: pageBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 680,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>

        {/* Header Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          animation: mounted ? 'slideInUp 0.5s ease both' : 'none',
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${primary}, ${accent})`,
            borderRadius: 12,
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: `0 4px 16px rgba(83,48,134,0.3)`,
          }}>
            <BookOpen size={14} color="white"/>
            <span style={{ color: 'white', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px' }}>
              SCIENCE · GRADE 6
            </span>
          </div>
          <div style={{
            background: darkMode ? 'rgba(241,159,69,0.15)' : '#fff3e4',
            borderRadius: 10,
            padding: '4px 12px',
            border: `1px solid ${accent}40`,
          }}>
            <span style={{ color: accent, fontSize: 11, fontWeight: 600 }}>Chapter 4: Exploring Magnets</span>
          </div>
        </div>

        {/* Main Card */}
        <div style={{
          background: cardBg,
          borderRadius: 24,
          border: `1.5px solid ${borderCol}`,
          boxShadow: darkMode
            ? '0 20px 60px rgba(0,0,0,0.5)'
            : '0 8px 40px rgba(83,48,134,0.12)',
          overflow: 'hidden',
          animation: mounted ? 'popIn 0.5s ease both 0.1s' : 'none',
        }}>

          {/* Card Header */}
          <div style={{
            background: `linear-gradient(135deg, ${primary} 0%, #4A4DC9 50%, ${accent} 100%)`,
            backgroundSize: '200% 200%',
            animation: 'gradientShift 6s ease infinite',
            padding: '20px 24px 18px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative circles */}
            {[[-20, -20, 80], [90, -30, 60], [-10, 30, 40]].map(([x, y, r], i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${r}px`,
                height: `${r}px`,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)',
                pointerEvents: 'none',
              }}/>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
              <div style={{
                background: 'rgba(255,255,255,0.18)',
                borderRadius: 12,
                padding: '8px',
                backdropFilter: 'blur(8px)',
              }}>
                <Zap size={20} color="white" />
              </div>
              <div>
                <h2 style={{ margin: 0, color: 'white', fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>
                  {magnetLabel} — U-Clip Activity
                </h2>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>
                  Activity 4 · Atharv's Experiment
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 20px 24px' }}>

            {/* Instruction */}
            <div style={{
              background: darkMode ? 'rgba(193,193,234,0.08)' : '#f0eeff',
              border: `1px solid ${borderCol}`,
              borderRadius: 14,
              padding: '12px 16px',
              marginBottom: 18,
            }}>
              <p style={{
                margin: 0,
                fontSize: 13,
                color: textMain,
                lineHeight: 1.6,
                fontWeight: 500,
              }}>
                📌 {instructionText}
              </p>
            </div>

            {/* Magnet Diagram Section */}
            <div style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : '#fafafa',
              border: `1.5px solid ${borderCol}`,
              borderRadius: 16,
              padding: '16px 12px 8px',
              marginBottom: 20,
              position: 'relative',
            }}>
              <span style={{
                position: 'absolute',
                top: -11,
                left: 16,
                background: darkMode ? '#1a1035' : 'white',
                padding: '0 8px',
                fontSize: 11,
                fontWeight: 700,
                color: textSub,
                letterSpacing: '0.5px',
              }}>DIAGRAM</span>
              <MagnetDiagram
                showClusters={showClusters}
                primaryColor={primary}
                accentColor={accent}
                northLabel={northLabel}
                southLabel={southLabel}
              />
              {/* Position legend */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4, paddingBottom: 4 }}>
                {['A — Left End (Pole)', 'B — Middle', 'C — Right End (Pole)'].map((label, i) => (
                  <span key={i} style={{
                    fontSize: 10,
                    color: textSub,
                    fontWeight: 600,
                    opacity: 0.75,
                    textAlign: 'center',
                  }}>{label}</span>
                ))}
              </div>
            </div>

            {/* Options Table */}
            <div style={{
              background: darkMode ? 'rgba(255,255,255,0.03)' : '#fafafa',
              border: `1.5px solid ${borderCol}`,
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 18,
              position: 'relative',
            }}>
              <span style={{
                position: 'absolute',
                top: -11,
                left: 16,
                background: darkMode ? '#1a1035' : 'white',
                padding: '0 8px',
                fontSize: 11,
                fontWeight: 700,
                color: textSub,
                letterSpacing: '0.5px',
              }}>SELECT AN OPTION</span>

              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '64px 1fr 1fr 1fr',
                background: `linear-gradient(135deg, ${primary}22, ${accent}22)`,
                padding: '10px 16px',
                borderBottom: `1px solid ${borderCol}`,
                marginTop: 8,
              }}>
                {['Option', 'Position A', 'Position B', 'Position C'].map(h => (
                  <span key={h} style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: textSub,
                    textAlign: 'center',
                    letterSpacing: '0.3px',
                  }}>{h}</span>
                ))}
              </div>

              {/* Options */}
              {options.map((opt, idx) => {
                const isSelected = selected === idx;
                const isWrong = isSelected && idx !== correctIndex;
                const isRight = isSelected && idx === correctIndex;
                let rowBg = 'transparent';
                let rowBorder = 'transparent';
                if (isRight) { rowBg = 'rgba(16,185,129,0.1)'; rowBorder = '#10b981'; }
                else if (isWrong) { rowBg = 'rgba(239,68,68,0.08)'; rowBorder = '#ef4444'; }
                else if (!isAnswered) { rowBg = 'transparent'; }

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '64px 1fr 1fr 1fr',
                      padding: '11px 16px',
                      cursor: isAnswered ? 'default' : 'pointer',
                      background: rowBg,
                      borderLeft: `3px solid ${isSelected ? rowBorder : 'transparent'}`,
                      borderBottom: idx < options.length - 1 ? `1px solid ${borderCol}40` : 'none',
                      transition: 'all 0.25s ease',
                      animation: shake === idx ? 'shake 0.5s ease' : (pulse === idx ? 'correctPulse 0.8s ease' : 'none'),
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      if (!isAnswered) (e.currentTarget as HTMLDivElement).style.background = darkMode ? 'rgba(255,255,255,0.06)' : '#f0eeff';
                    }}
                    onMouseLeave={e => {
                      if (!isAnswered && !isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    }}
                  >
                    {/* Label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isRight ? '#10b981' : isWrong ? '#ef4444' : isAnswered ? `${primary}22` : `linear-gradient(135deg, ${primary}33, ${accent}33)`,
                        border: `2px solid ${isRight ? '#10b981' : isWrong ? '#ef4444' : isAnswered ? `${primary}44` : `${primary}55`}`,
                        transition: 'all 0.3s ease',
                      }}>
                        {isRight ? (
                          <Check size={14} color="white" strokeWidth={3}/>
                        ) : isWrong ? (
                          <X size={14} color="white" strokeWidth={3}/>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: textSub }}>{opt.label}</span>
                        )}
                      </div>
                    </div>

                    {/* Values */}
                    {(['A', 'B', 'C'] as const).map(pos => (
                      <div key={pos} style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 700,
                          color: isRight && (pos === 'A' || pos === 'C') ? '#10b981'
                            : isRight && pos === 'B' ? '#f59e0b'
                            : isWrong ? '#ef4444'
                            : textMain,
                          background: isRight && (pos === 'A' || pos === 'C') ? 'rgba(16,185,129,0.12)'
                            : isRight && pos === 'B' ? 'rgba(245,158,11,0.12)'
                            : 'transparent',
                          transition: 'all 0.3s ease',
                        }}>
                          {opt.values[pos]}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Feedback */}
            {isAnswered && (
              <div style={{
                borderRadius: 14,
                padding: '14px 16px',
                background: isCorrect
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))'
                  : 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
                border: `1.5px solid ${isCorrect ? '#10b981' : '#ef4444'}`,
                animation: 'popIn 0.4s ease both',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 14,
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isCorrect ? '#10b981' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  animation: isCorrect ? 'floatBadge 2s ease infinite' : 'none',
                }}>
                  {isCorrect ? <Check size={16} color="white" strokeWidth={3}/> : <X size={16} color="white" strokeWidth={3}/>}
                </div>
                <div>
                  <p style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: isCorrect ? '#065f46' : '#7f1d1d',
                    marginBottom: 2,
                  }}>
                    {isCorrect ? '✨ Correct! Well done!' : '❌ Not quite right'}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: 12.5,
                    color: isCorrect ? '#047857' : '#991b1b',
                    lineHeight: 1.55,
                    fontWeight: 500,
                  }}>
                    {isCorrect ? correctExplanation : incorrectHint}
                  </p>
                </div>
              </div>
            )}

            {/* Cluster animation note */}
            {showClusters && (
              <div style={{
                background: darkMode ? 'rgba(245,158,11,0.1)' : '#fff8e7',
                border: `1px solid ${accent}60`,
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 14,
                animation: 'slideInUp 0.4s ease both',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>🧲</span>
                <p style={{ margin: 0, fontSize: 12, color: darkMode ? '#fcd34d' : '#92400e', fontWeight: 600 }}>
                  Watch the U-clips cluster at positions A and C! The poles have the strongest magnetic field.
                </p>
              </div>
            )}

            {/* Reset Button */}
            {isAnswered && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={handleReset}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: `linear-gradient(135deg, ${primary}, #4A4DC9)`,
                    color: 'white',
                    border: 'none',
                    borderRadius: 50,
                    padding: '10px 28px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Poppins', sans-serif",
                    boxShadow: `0 4px 20px rgba(83,48,134,0.4)`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    animation: 'popIn 0.4s ease both 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 24px rgba(83,48,134,0.5)`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px rgba(83,48,134,0.4)`;
                  }}
                >
                  <RotateCcw size={14}/>
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: 14,
          fontSize: 11,
          color: textSub,
          opacity: 0.6,
          fontWeight: 500,
        }}>
          NCERT Curiosity · Science · Grade 6 · Chapter 4
        </div>
      </div>
    </div>
  );
};

export default MagnetSelectionTool;