import React, { useState, useEffect } from 'react';
import { RotateCcw, Star, ChevronRight } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────
type Pole = 'N' | 'S' | null;
type Phase = 'learn' | 'test-N' | 'confirm-S' | 'complete';
type EndLabel = 'N' | 'S' | '';

interface PoleIdentifierToolProps {
  props?: {
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: {
      unmarkedLeftPole?: 'N' | 'S';
      instructionText?: string;
      completionMessage?: string;
    };
  };
}

// ─── Animated Bar Magnet SVG ────────────────────────────────────────
const BarMagnetSVG: React.FC<{
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
  glowLeft?: boolean;
  glowRight?: boolean;
  width?: number;
}> = ({ leftLabel, rightLabel, leftColor, rightColor, glowLeft, glowRight, width = 200 }) => {
  const h = 48;
  return (
    <svg viewBox={`0 0 ${width} ${h}`} style={{ width: '100%', maxWidth: width, height: 'auto', overflow: 'visible' }}>
      <defs>
        <filter id="glowL"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glowR"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.1)"/>
        </linearGradient>
      </defs>
      {/* Left half */}
      <rect x={2} y={4} width={width / 2 - 2} height={h - 8} rx={12} fill={leftColor}
        filter={glowLeft ? 'url(#glowL)' : undefined}
        style={{ transition: 'fill 0.4s ease' }}/>
      {/* Right half */}
      <rect x={width / 2} y={4} width={width / 2 - 2} height={h - 8} rx={12} fill={rightColor}
        filter={glowRight ? 'url(#glowR)' : undefined}
        style={{ transition: 'fill 0.4s ease' }}/>
      {/* Shine overlay */}
      <rect x={2} y={4} width={width - 4} height={(h - 8) / 2} rx={12} fill="url(#shine)" opacity="0.5"/>
      {/* Labels */}
      <text x={width / 4} y={h / 2 + 6} textAnchor="middle" fontSize="15" fontWeight="800"
        fill="white" fontFamily="'Nunito',sans-serif" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
        {leftLabel}
      </text>
      <text x={(3 * width) / 4} y={h / 2 + 6} textAnchor="middle" fontSize="15" fontWeight="800"
        fill="white" fontFamily="'Nunito',sans-serif">
        {rightLabel}
      </text>
    </svg>
  );
};

// ─── Arrow animation ────────────────────────────────────────────────
const InteractionArrow: React.FC<{
  type: 'repulsion' | 'attraction' | null;
  side: 'left' | 'right';
}> = ({ type, side }) => {
  if (!type) return null;
  const isRep = type === 'repulsion';
  const color = isRep ? '#ef4444' : '#10b981';
  const label = isRep ? 'PUSH AWAY!' : 'PULL IN!';
  const arrows = isRep
    ? (side === 'left' ? '← →' : '← →')
    : (side === 'left' ? '→ ←' : '→ ←');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      animation: 'popIn 0.4s ease both',
    }}>
      <span style={{ fontSize: 22, letterSpacing: 2 }}>{arrows}</span>
      <span style={{
        fontSize: 10, fontWeight: 900, color, letterSpacing: '0.5px',
        fontFamily: "'Nunito',sans-serif",
        background: isRep ? '#fee2e2' : '#dcfce7',
        borderRadius: 6, padding: '2px 8px',
      }}>{label}</span>
    </div>
  );
};

// ─── Step indicator ─────────────────────────────────────────────────
const StepDot: React.FC<{ active: boolean; done: boolean; label: string }> = ({ active, done, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: done ? '#10b981' : active ? '#533086' : '#e5e7eb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, color: done || active ? 'white' : '#9ca3af',
      transition: 'all 0.3s ease',
      boxShadow: active ? '0 0 0 4px rgba(83,48,134,0.2)' : 'none',
    }}>
      {done ? '✓' : active ? '●' : '○'}
    </div>
    <span style={{ fontSize: 9, fontWeight: 700, color: done ? '#10b981' : active ? '#533086' : '#9ca3af', fontFamily: "'Nunito',sans-serif", textAlign: 'center', maxWidth: 56, lineHeight: 1.3 }}>
      {label}
    </span>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────
const PoleIdentifierTool: React.FC<PoleIdentifierToolProps> = ({ props = {} }) => {
  const { themeColor = '#f59e0b', additionalProps = {} } = props;
  const {
    unmarkedLeftPole = 'N' as 'N' | 'S',
    completionMessage = "You used the attraction-repulsion rule to identify the poles! A real scientist's method! 🔬",
  } = additionalProps;

  const unmarkedRightPole: 'N' | 'S' = unmarkedLeftPole === 'N' ? 'S' : 'N';

  // Phase flow: learn → test-N (N-pole test) → confirm-S (S-pole confirm) → complete
  const [phase, setPhase] = useState<Phase>('learn');
  const [currentTestEnd, setCurrentTestEnd] = useState<'left' | 'right' | null>(null);
  const [leftInteraction, setLeftInteraction] = useState<'repulsion' | 'attraction' | null>(null);
  const [rightInteraction, setRightInteraction] = useState<'repulsion' | 'attraction' | null>(null);
  const [leftLabel, setLeftLabel] = useState<EndLabel>('');
  const [rightLabel, setRightLabel] = useState<EndLabel>('');
  const [confirmLeft, setConfirmLeft] = useState<'repulsion' | 'attraction' | null>(null);
  const [confirmRight, setConfirmRight] = useState<'repulsion' | 'attraction' | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Poppins:wght@400;500;600;700&display=swap');
      @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
      @keyframes popIn{0%{transform:scale(0.75);opacity:0;}65%{transform:scale(1.06);}100%{transform:scale(1);opacity:1;}}
      @keyframes wiggle{0%,100%{transform:rotate(0);}30%{transform:rotate(-7deg);}70%{transform:rotate(7deg);}}
      @keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-7px);}}
      @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
      @keyframes confettiFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1;}100%{transform:translateY(110px) rotate(540deg);opacity:0;}}
      @keyframes starBounce{0%{transform:scale(0)rotate(-20deg);opacity:0;}60%{transform:scale(1.25)rotate(10deg);opacity:1;}100%{transform:scale(1)rotate(0);opacity:1;}}
      @keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.5);}50%{box-shadow:0 0 0 8px rgba(245,158,11,0);}}
      @keyframes slideIn{from{opacity:0;transform:translateX(-12px);}to{opacity:1;transform:translateX(0);}}
      @keyframes magnetApproach{0%{transform:translateX(0);}50%{transform:translateX(-14px);}100%{transform:translateX(0);}}
    `;
    document.head.appendChild(style);
    setTimeout(() => setMounted(true), 60);
    return () => document.head.removeChild(style);
  }, []);

  // Determine interaction result given which pole of marked magnet approaches which end of unmarked
  const getInteraction = (markedPole: 'N' | 'S', unmarkedEnd: 'N' | 'S'): 'repulsion' | 'attraction' => {
    return markedPole === unmarkedEnd ? 'repulsion' : 'attraction';
  };

  const handleTestEnd = (end: 'left' | 'right', markedPole: 'N' | 'S') => {
    if (testing) return;
    setTesting(true);
    setCurrentTestEnd(end);
    const unmarkedEndPole = end === 'left' ? unmarkedLeftPole : unmarkedRightPole;
    const result = getInteraction(markedPole, unmarkedEndPole);

    setTimeout(() => {
      if (phase === 'test-N') {
        if (end === 'left') setLeftInteraction(result);
        else setRightInteraction(result);
      } else {
        if (end === 'left') setConfirmLeft(result);
        else setConfirmRight(result);
      }
      setCurrentTestEnd(null);
      setTesting(false);
    }, 900);
  };

  const handleLabel = (end: 'left' | 'right', label: EndLabel) => {
    if (end === 'left') setLeftLabel(label);
    else setRightLabel(label);
  };

  const bothTested = leftInteraction !== null && rightInteraction !== null;
  const bothLabelled = leftLabel !== '' && rightLabel !== '';
  const bothConfirmed = confirmLeft !== null && confirmRight !== null;

  const leftCorrect = leftLabel === unmarkedLeftPole;
  const rightCorrect = rightLabel === unmarkedRightPole;
  const allCorrect = leftCorrect && rightCorrect;

  const proceedToConfirm = () => setPhase('confirm-S');
  const proceedToComplete = () => {
    setPhase('complete');
    setConfetti(true);
    setTimeout(() => setConfetti(false), 3000);
  };

  const reset = () => {
    setPhase('learn');
    setCurrentTestEnd(null);
    setLeftInteraction(null); setRightInteraction(null);
    setLeftLabel(''); setRightLabel('');
    setConfirmLeft(null); setConfirmRight(null);
    setConfetti(false);
  };

  // Colours from design PDF
  const purple = '#533086';
  const blue = '#4A4DC9';
  const orange = '#FC9145';
  const accent = themeColor;
  const lavender = '#C1C1EA';
  const cream = '#FFF3E4';

  const phaseIdx = phase === 'learn' ? 0 : phase === 'test-N' ? 1 : phase === 'confirm-S' ? 2 : 3;

  return (
    <div style={{
      fontFamily: "'Poppins',sans-serif",
      minHeight: '100vh',
      background: 'linear-gradient(150deg,#fdf6ff 0%,#fef9ec 55%,#f0fdf4 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '16px 14px', boxSizing: 'border-box',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* BG blobs */}
      <div style={{ position: 'fixed', top: -70, right: -70, width: 220, height: 220, borderRadius: '50%', background: 'rgba(193,193,234,0.2)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -60, left: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(252,145,69,0.13)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Confetti */}
      {confetti && Array.from({ length: 24 }).map((_, i) => (
        <div key={i} style={{
          position: 'fixed', left: `${4 + Math.random() * 92}%`, top: '-12px',
          width: i % 2 === 0 ? 8 : 10, height: i % 3 === 0 ? 8 : 6,
          borderRadius: i % 2 === 0 ? '50%' : '3px',
          background: [accent, purple, '#ef4444', blue, '#10b981', orange, '#fbbf24'][i % 7],
          animation: `confettiFall ${1.2 + Math.random() * 1.8}s ease-out forwards`,
          animationDelay: `${Math.random() * 0.6}s`,
          zIndex: 1000, pointerEvents: 'none',
          transform: `rotate(${Math.random() * 360}deg)`,
        }} />
      ))}

      <div style={{ width: '100%', maxWidth: 620, position: 'relative', zIndex: 1,
        opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}>

        {/* ── HERO ── */}
        <div style={{
          background: `linear-gradient(135deg, ${purple} 0%, ${blue} 55%, #7c3aed 100%)`,
          borderRadius: 26, padding: '20px 22px', marginBottom: 16,
          boxShadow: '0 14px 44px rgba(83,48,134,0.35)',
          position: 'relative', overflow: 'hidden',
          animation: 'fadeUp 0.5s ease both',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 90, opacity: 0.07, pointerEvents: 'none', transform: 'rotate(-15deg)' }}>🧲</div>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 36, animation: 'wiggle 2.5s ease infinite', flexShrink: 0 }}>🔍</div>
              <div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}>
                  SCIENCE · GRADE 6 · CHAPTER 4
                </p>
                <h1 style={{ margin: 0, color: 'white', fontSize: 19, fontWeight: 900, fontFamily: "'Nunito',sans-serif", lineHeight: 1.25 }}>
                  Find the Hidden Poles!
                </h1>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: '10px 14px' }}>
              <p style={{ margin: 0, color: 'white', fontSize: 12.5, fontWeight: 600, lineHeight: 1.6 }}>
                📖 You have an <strong>unmarked bar magnet</strong> — its poles are hidden!<br />
                Use a <strong>known magnet</strong> (N &amp; S labelled) to figure out which end is North and which is South. 🧲
              </p>
            </div>
          </div>
        </div>

        {/* ── KEY FACT ── */}
        <div style={{
          background: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
          border: `2.5px solid #fbbf24`, borderRadius: 18,
          padding: '12px 16px', marginBottom: 16,
          display: 'flex', gap: 10, alignItems: 'flex-start',
          boxShadow: '0 4px 16px rgba(251,191,36,0.2)',
          animation: 'fadeUp 0.5s ease both 0.1s',
        }}>
          <div style={{ fontSize: 28, flexShrink: 0, animation: 'bounce 2.2s ease infinite' }}>💡</div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 900, color: '#92400e', fontFamily: "'Nunito',sans-serif" }}>
              The Golden Rule of Magnets!
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: '#78350f', fontWeight: 600, lineHeight: 1.7 }}>
              When <span style={{ background: '#fca5a5', color: '#7f1d1d', borderRadius: 6, padding: '1px 6px', fontWeight: 800 }}>SAME poles</span> face each other → They <strong>REPEL (push away) 🚫</strong><br />
              When <span style={{ background: '#bbf7d0', color: '#14532d', borderRadius: 6, padding: '1px 6px', fontWeight: 800 }}>DIFFERENT poles</span> face each other → They <strong>ATTRACT (pull in) 💚</strong>
            </p>
          </div>
        </div>

        {/* ── STEP INDICATOR ── */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 16,
          background: 'white', borderRadius: 18, padding: '14px 10px',
          boxShadow: '0 4px 16px rgba(83,48,134,0.08)',
          border: '2px solid #ede9fe',
          animation: 'fadeUp 0.5s ease both 0.15s',
        }}>
          {[
            { label: 'Learn the Rule', phase: 'learn' },
            { label: 'Test with N-pole', phase: 'test-N' },
            { label: 'Confirm with S-pole', phase: 'confirm-S' },
            { label: 'Done!', phase: 'complete' },
          ].map((s, i) => (
            <React.Fragment key={s.phase}>
              <StepDot
                active={phase === s.phase}
                done={phaseIdx > i}
                label={s.label}
              />
              {i < 3 && (
                <div style={{ flex: 1, height: 2, background: phaseIdx > i ? '#10b981' : '#e5e7eb', margin: '15px 4px 0', borderRadius: 2, transition: 'background 0.4s ease' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ══════════════════════════════════
            PHASE: LEARN
        ══════════════════════════════════ */}
        {phase === 'learn' && (
          <div style={{ animation: 'popIn 0.4s ease both' }}>
            <div style={{
              background: 'white', borderRadius: 22, padding: '20px',
              boxShadow: '0 6px 24px rgba(83,48,134,0.09)',
              border: '2px solid #ede9fe', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${purple},${blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'white', fontWeight: 900, fontFamily: "'Nunito',sans-serif", flexShrink: 0 }}>📚</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1e1b4b', fontFamily: "'Nunito',sans-serif" }}>Meet Your Magnets!</h2>
                  <p style={{ margin: 0, fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>You'll use the marked magnet to test the unknown one</p>
                </div>
              </div>

              {/* Show both magnets visually */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Unmarked magnet */}
                <div style={{ background: 'linear-gradient(135deg,#f8f7ff,#ede9fe)', border: '2px solid #c4b5fd', borderRadius: 16, padding: '16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: purple, fontFamily: "'Nunito',sans-serif" }}>
                    ❓ The Mystery Magnet (No poles labelled!)
                  </p>
                  <BarMagnetSVG leftLabel="?" rightLabel="?" leftColor="#6b7280" rightColor="#9ca3af" />
                  <p style={{ margin: '8px 0 0', fontSize: 11, color: '#6b7280', fontWeight: 600, textAlign: 'center' }}>
                    We need to find out which end is N and which is S
                  </p>
                </div>

                {/* Marked magnet */}
                <div style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '2px solid #fed7aa', borderRadius: 16, padding: '16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: '#c2410c', fontFamily: "'Nunito',sans-serif" }}>
                    ✅ The Marked Magnet (We know its poles!)
                  </p>
                  <BarMagnetSVG leftLabel="N" rightLabel="S" leftColor="#ef4444" rightColor="#3b82f6" />
                  <p style={{ margin: '8px 0 0', fontSize: 11, color: '#92400e', fontWeight: 600, textAlign: 'center' }}>
                    Red = North pole (N) &nbsp;|&nbsp; Blue = South pole (S)
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 16, background: `linear-gradient(135deg,${cream},#fff7ed)`, border: `2px solid ${orange}60`, borderRadius: 14, padding: '12px 14px' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#92400e', lineHeight: 1.6, fontFamily: "'Poppins',sans-serif" }}>
                  🎯 <strong>Your Mission:</strong> Bring the <span style={{ color: '#dc2626', fontWeight: 800 }}>N pole</span> of the marked magnet near each end of the mystery magnet. Watch what happens — then label each end!
                </p>
              </div>

              <button onClick={() => setPhase('test-N')} style={{
                width: '100%', marginTop: 16, padding: '14px',
                background: `linear-gradient(135deg,${purple},${blue})`,
                color: 'white', border: 'none', borderRadius: 16,
                fontSize: 15, fontWeight: 900, cursor: 'pointer',
                fontFamily: "'Nunito',sans-serif",
                boxShadow: `0 6px 22px rgba(83,48,134,0.4)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                animation: 'glowPulse 2s ease infinite',
              }}>
                <ChevronRight size={20} />
                Let's Start the Experiment! 🔬
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            PHASE: TEST WITH N POLE
        ══════════════════════════════════ */}
        {phase === 'test-N' && (
          <div style={{ animation: 'popIn 0.4s ease both' }}>
            <div style={{ background: 'white', borderRadius: 22, padding: '20px', boxShadow: '0 6px 24px rgba(83,48,134,0.09)', border: '2px solid #ede9fe', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${purple},${blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: 'white', fontFamily: "'Nunito',sans-serif", flexShrink: 0 }}>1</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1e1b4b', fontFamily: "'Nunito',sans-serif" }}>Test with the N-Pole 🔴</h2>
                  <p style={{ margin: 0, fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Bring the RED (N) end near each side of the mystery magnet</p>
                </div>
                <div style={{
                  marginLeft: 'auto', background: leftInteraction && rightInteraction ? '#dcfce7' : '#f3f0ff',
                  border: `2px solid ${leftInteraction && rightInteraction ? '#4ade80' : '#c4b5fd'}`,
                  borderRadius: 20, padding: '4px 12px',
                  fontSize: 12, fontWeight: 900,
                  color: leftInteraction && rightInteraction ? '#16a34a' : '#7c3aed',
                  fontFamily: "'Nunito',sans-serif", flexShrink: 0,
                }}>
                  {[leftInteraction, rightInteraction].filter(Boolean).length}/2
                </div>
              </div>

              {/* Mystery magnet display */}
              <div style={{ background: 'linear-gradient(135deg,#f8f7ff,#ede9fe)', border: '2px dashed #c4b5fd', borderRadius: 16, padding: '16px', marginBottom: 14 }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: purple, fontFamily: "'Nunito',sans-serif", textAlign: 'center' }}>
                  🔮 Mystery Magnet
                </p>
                <BarMagnetSVG
                  leftLabel={leftLabel || '?'}
                  rightLabel={rightLabel || '?'}
                  leftColor={leftLabel === 'N' ? '#ef4444' : leftLabel === 'S' ? '#3b82f6' : '#6b7280'}
                  rightColor={rightLabel === 'N' ? '#ef4444' : rightLabel === 'S' ? '#3b82f6' : '#9ca3af'}
                  glowLeft={currentTestEnd === 'left'}
                  glowRight={currentTestEnd === 'right'}
                />
              </div>

              {/* Test buttons — LEFT END */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Left end test */}
                <div style={{
                  background: leftInteraction ? (leftInteraction === 'repulsion' ? 'linear-gradient(135deg,#fff1f2,#ffe4e6)' : 'linear-gradient(135deg,#f0fdf4,#dcfce7)') : 'linear-gradient(135deg,#fafafa,white)',
                  border: `2.5px solid ${leftInteraction ? (leftInteraction === 'repulsion' ? '#f87171' : '#4ade80') : '#e5e7eb'}`,
                  borderRadius: 18, padding: '14px', transition: 'all 0.4s ease',
                  boxShadow: leftInteraction ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#533086', fontFamily: "'Nunito',sans-serif" }}>
                      Test LEFT end of mystery magnet
                    </span>
                    {leftInteraction && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: leftInteraction === 'repulsion' ? '#dc2626' : '#16a34a', background: leftInteraction === 'repulsion' ? '#fee2e2' : '#dcfce7', borderRadius: 20, padding: '3px 10px', fontFamily: "'Nunito',sans-serif" }}>
                        {leftInteraction === 'repulsion' ? '🚫 REPELLED' : '💚 ATTRACTED'}
                      </span>
                    )}
                  </div>

                  {/* Visual: N pole approaching left end */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52 }}>
                    {/* Marked magnet N pole */}
                    <div style={{
                      width: 60, height: 36, borderRadius: 8,
                      background: '#ef4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
                      transform: currentTestEnd === 'left' ? 'translateX(8px)' : leftInteraction === 'repulsion' ? 'translateX(-8px)' : leftInteraction === 'attraction' ? 'translateX(8px)' : 'translateX(0)',
                      transition: 'transform 0.4s ease',
                      flexShrink: 0,
                    }}>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: 15, fontFamily: "'Nunito',sans-serif" }}>N</span>
                    </div>

                    {/* Arrow result */}
                    <div style={{ width: 60, textAlign: 'center' }}>
                      {currentTestEnd === 'left' && (
                        <div style={{ width: 24, height: 24, margin: '0 auto', border: '3px solid #533086', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      )}
                      {leftInteraction && currentTestEnd !== 'left' && (
                        <InteractionArrow type={leftInteraction} side="left" />
                      )}
                      {!leftInteraction && currentTestEnd !== 'left' && <span style={{ fontSize: 18 }}>⚡</span>}
                    </div>

                    {/* Mystery magnet left end */}
                    <div style={{
                      width: 60, height: 36, borderRadius: 8,
                      background: '#6b7280',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                      transform: leftInteraction === 'repulsion' ? 'translateX(8px)' : leftInteraction === 'attraction' ? 'translateX(-6px)' : 'translateX(0)',
                      transition: 'transform 0.4s ease',
                      flexShrink: 0,
                    }}>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: 15, fontFamily: "'Nunito',sans-serif" }}>?</span>
                    </div>
                  </div>

                  {!leftInteraction ? (
                    <button onClick={() => handleTestEnd('left', 'N')} disabled={testing}
                      style={{ width: '100%', marginTop: 10, padding: '10px', background: testing ? '#e5e7eb' : `linear-gradient(135deg,${purple},${blue})`, color: testing ? '#9ca3af' : 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: testing ? 'wait' : 'pointer', fontFamily: "'Nunito',sans-serif", boxShadow: testing ? 'none' : '0 4px 14px rgba(83,48,134,0.4)', transition: 'all 0.2s' }}>
                      {testing && currentTestEnd === 'left' ? '⚡ Testing...' : '🔴 Bring N-pole near LEFT end!'}
                    </button>
                  ) : (
                    <>
                      <div style={{ marginTop: 10, padding: '8px 12px', background: leftInteraction === 'repulsion' ? '#fee2e2' : '#dcfce7', borderRadius: 10, fontSize: 12, fontWeight: 700, color: leftInteraction === 'repulsion' ? '#dc2626' : '#15803d', fontFamily: "'Poppins',sans-serif" }}>
                        {leftInteraction === 'repulsion'
                          ? '🚫 N repelled this end → This end must also be N!'
                          : '💚 N attracted this end → This end must be S!'}
                      </div>
                      {/* Label picker */}
                      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: purple, fontFamily: "'Nunito',sans-serif", alignSelf: 'center' }}>Label LEFT end:</p>
                        {['N', 'S'].map(p => (
                          <button key={p} onClick={() => handleLabel('left', p as EndLabel)}
                            style={{ flex: 1, padding: '8px', background: leftLabel === p ? (p === 'N' ? '#ef4444' : '#3b82f6') : 'white', color: leftLabel === p ? 'white' : '#374151', border: `2px solid ${leftLabel === p ? (p === 'N' ? '#ef4444' : '#3b82f6') : '#e5e7eb'}`, borderRadius: 10, fontSize: 13, fontWeight: 900, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", transition: 'all 0.2s' }}>
                            {p === 'N' ? '🔴 N' : '🔵 S'}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Right end test */}
                <div style={{
                  background: rightInteraction ? (rightInteraction === 'repulsion' ? 'linear-gradient(135deg,#fff1f2,#ffe4e6)' : 'linear-gradient(135deg,#f0fdf4,#dcfce7)') : 'linear-gradient(135deg,#fafafa,white)',
                  border: `2.5px solid ${rightInteraction ? (rightInteraction === 'repulsion' ? '#f87171' : '#4ade80') : '#e5e7eb'}`,
                  borderRadius: 18, padding: '14px', transition: 'all 0.4s ease',
                  boxShadow: rightInteraction ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#533086', fontFamily: "'Nunito',sans-serif" }}>
                      Test RIGHT end of mystery magnet
                    </span>
                    {rightInteraction && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: rightInteraction === 'repulsion' ? '#dc2626' : '#16a34a', background: rightInteraction === 'repulsion' ? '#fee2e2' : '#dcfce7', borderRadius: 20, padding: '3px 10px', fontFamily: "'Nunito',sans-serif" }}>
                        {rightInteraction === 'repulsion' ? '🚫 REPELLED' : '💚 ATTRACTED'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52 }}>
                    <div style={{ width: 60, height: 36, borderRadius: 8, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239,68,68,0.35)', transform: rightInteraction === 'repulsion' ? 'translateX(-8px)' : rightInteraction === 'attraction' ? 'translateX(8px)' : 'translateX(0)', transition: 'transform 0.4s ease', flexShrink: 0 }}>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: 15, fontFamily: "'Nunito',sans-serif" }}>N</span>
                    </div>
                    <div style={{ width: 60, textAlign: 'center' }}>
                      {currentTestEnd === 'right' && (<div style={{ width: 24, height: 24, margin: '0 auto', border: '3px solid #533086', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />)}
                      {rightInteraction && currentTestEnd !== 'right' && (<InteractionArrow type={rightInteraction} side="right" />)}
                      {!rightInteraction && currentTestEnd !== 'right' && <span style={{ fontSize: 18 }}>⚡</span>}
                    </div>
                    <div style={{ width: 60, height: 36, borderRadius: 8, background: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.18)', transform: rightInteraction === 'repulsion' ? 'translateX(8px)' : rightInteraction === 'attraction' ? 'translateX(-6px)' : 'translateX(0)', transition: 'transform 0.4s ease', flexShrink: 0 }}>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: 15, fontFamily: "'Nunito',sans-serif" }}>?</span>
                    </div>
                  </div>

                  {!rightInteraction ? (
                    <button onClick={() => handleTestEnd('right', 'N')} disabled={testing}
                      style={{ width: '100%', marginTop: 10, padding: '10px', background: testing ? '#e5e7eb' : `linear-gradient(135deg,${purple},${blue})`, color: testing ? '#9ca3af' : 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: testing ? 'wait' : 'pointer', fontFamily: "'Nunito',sans-serif", boxShadow: testing ? 'none' : '0 4px 14px rgba(83,48,134,0.4)', transition: 'all 0.2s' }}>
                      {testing && currentTestEnd === 'right' ? '⚡ Testing...' : '🔴 Bring N-pole near RIGHT end!'}
                    </button>
                  ) : (
                    <>
                      <div style={{ marginTop: 10, padding: '8px 12px', background: rightInteraction === 'repulsion' ? '#fee2e2' : '#dcfce7', borderRadius: 10, fontSize: 12, fontWeight: 700, color: rightInteraction === 'repulsion' ? '#dc2626' : '#15803d', fontFamily: "'Poppins',sans-serif" }}>
                        {rightInteraction === 'repulsion'
                          ? '🚫 N repelled this end → This end must also be N!'
                          : '💚 N attracted this end → This end must be S!'}
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: purple, fontFamily: "'Nunito',sans-serif", alignSelf: 'center' }}>Label RIGHT end:</p>
                        {['N', 'S'].map(p => (
                          <button key={p} onClick={() => handleLabel('right', p as EndLabel)}
                            style={{ flex: 1, padding: '8px', background: rightLabel === p ? (p === 'N' ? '#ef4444' : '#3b82f6') : 'white', color: rightLabel === p ? 'white' : '#374151', border: `2px solid ${rightLabel === p ? (p === 'N' ? '#ef4444' : '#3b82f6') : '#e5e7eb'}`, borderRadius: 10, fontSize: 13, fontWeight: 900, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", transition: 'all 0.2s' }}>
                            {p === 'N' ? '🔴 N' : '🔵 S'}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Next phase button */}
              {bothTested && bothLabelled && (
                <div style={{ marginTop: 14, animation: 'popIn 0.4s ease both' }}>
                  {allCorrect ? (
                    <button onClick={proceedToConfirm} style={{
                      width: '100%', padding: '14px',
                      background: `linear-gradient(135deg,#10b981,#059669)`,
                      color: 'white', border: 'none', borderRadius: 16,
                      fontSize: 15, fontWeight: 900, cursor: 'pointer',
                      fontFamily: "'Nunito',sans-serif",
                      boxShadow: '0 6px 22px rgba(16,185,129,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <ChevronRight size={20} />
                      Great! Now confirm with the S-pole! →
                    </button>
                  ) : (
                    <div style={{ padding: '12px 16px', background: '#fff1f2', border: '2px solid #f87171', borderRadius: 14, fontSize: 13, fontWeight: 700, color: '#dc2626', fontFamily: "'Poppins',sans-serif" }}>
                      ❌ Check your labels! Remember: N repels N, N attracts S.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            PHASE: CONFIRM WITH S POLE
        ══════════════════════════════════ */}
        {phase === 'confirm-S' && (
          <div style={{ animation: 'popIn 0.4s ease both' }}>
            <div style={{ background: 'white', borderRadius: 22, padding: '20px', boxShadow: '0 6px 24px rgba(83,48,134,0.09)', border: '2px solid #fbbf24', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${accent},${orange})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: 'white', fontFamily: "'Nunito',sans-serif", flexShrink: 0 }}>2</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1e1b4b', fontFamily: "'Nunito',sans-serif" }}>Confirm with the S-Pole 🔵</h2>
                  <p style={{ margin: 0, fontSize: 11, color: '#92400e', fontWeight: 700 }}>Now use the BLUE (S) end to double-check your labels!</p>
                </div>
              </div>

              {/* Your labelled magnet */}
              <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '2px solid #4ade80', borderRadius: 14, padding: '12px', marginBottom: 14 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: '#166534', fontFamily: "'Nunito',sans-serif', textAlign:'center" }}>✅ Your Labelled Magnet:</p>
                <BarMagnetSVG
                  leftLabel={leftLabel}
                  rightLabel={rightLabel}
                  leftColor={leftLabel === 'N' ? '#ef4444' : '#3b82f6'}
                  rightColor={rightLabel === 'N' ? '#ef4444' : '#3b82f6'}
                />
              </div>

              <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '2px solid #93c5fd', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1e40af', lineHeight: 1.6, fontFamily: "'Poppins',sans-serif" }}>
                  🧠 <strong>What should happen?</strong><br />
                  S-pole should <span style={{ color: '#dc2626', fontWeight: 800 }}>REPEL</span> the S end &nbsp;|&nbsp; S-pole should <span style={{ color: '#16a34a', fontWeight: 800 }}>ATTRACT</span> the N end.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(['left', 'right'] as const).map(end => {
                  const confirmed = end === 'left' ? confirmLeft : confirmRight;
                  const endLabel = end === 'left' ? leftLabel : rightLabel;
                  return (
                    <div key={end} style={{
                      background: confirmed ? (confirmed === 'repulsion' ? 'linear-gradient(135deg,#fff1f2,#ffe4e6)' : 'linear-gradient(135deg,#f0fdf4,#dcfce7)') : '#fafafa',
                      border: `2.5px solid ${confirmed ? (confirmed === 'repulsion' ? '#f87171' : '#4ade80') : '#e5e7eb'}`,
                      borderRadius: 16, padding: '14px', transition: 'all 0.4s ease',
                    }}>
                      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: '#533086', fontFamily: "'Nunito',sans-serif" }}>
                        Test {end.toUpperCase()} end (you labelled it: <span style={{ color: endLabel === 'N' ? '#dc2626' : '#2563eb' }}>{endLabel === 'N' ? '🔴 N' : '🔵 S'}</span>)
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 }}>
                        <div style={{ width: 56, height: 34, borderRadius: 8, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.35)', flexShrink: 0 }}>
                          <span style={{ color: 'white', fontWeight: 900, fontSize: 14, fontFamily: "'Nunito',sans-serif" }}>S</span>
                        </div>
                        <div style={{ width: 56, textAlign: 'center' }}>
                          {currentTestEnd === end && !confirmed && (<div style={{ width: 22, height: 22, margin: '0 auto', border: '3px solid #533086', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />)}
                          {confirmed && <InteractionArrow type={confirmed} side={end} />}
                          {!confirmed && currentTestEnd !== end && <span style={{ fontSize: 16 }}>⚡</span>}
                        </div>
                        <div style={{ width: 56, height: 34, borderRadius: 8, background: endLabel === 'N' ? '#ef4444' : '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: 'white', fontWeight: 900, fontSize: 14, fontFamily: "'Nunito',sans-serif" }}>{endLabel}</span>
                        </div>
                      </div>
                      {!confirmed ? (
                        <button onClick={() => handleTestEnd(end, 'S')} disabled={testing}
                          style={{ width: '100%', marginTop: 10, padding: '10px', background: testing ? '#e5e7eb' : `linear-gradient(135deg,#2563eb,#1d4ed8)`, color: testing ? '#9ca3af' : 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: testing ? 'wait' : 'pointer', fontFamily: "'Nunito',sans-serif", transition: 'all 0.2s' }}>
                          {testing && currentTestEnd === end ? '⚡ Testing...' : `🔵 Bring S-pole near ${end.toUpperCase()} end!`}
                        </button>
                      ) : (
                        <div style={{ marginTop: 10, padding: '8px 12px', background: confirmed === 'repulsion' ? '#fee2e2' : '#dcfce7', borderRadius: 10, fontSize: 12, fontWeight: 700, color: confirmed === 'repulsion' ? '#dc2626' : '#15803d', fontFamily: "'Poppins',sans-serif" }}>
                          {confirmed === 'repulsion'
                            ? `✅ S repelled ${endLabel} — confirmed! Same poles repel.`
                            : `✅ S attracted ${endLabel} — confirmed! Different poles attract.`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {bothConfirmed && (
                <button onClick={proceedToComplete} style={{
                  width: '100%', marginTop: 14, padding: '14px',
                  background: `linear-gradient(135deg,${accent},${orange})`,
                  color: 'white', border: 'none', borderRadius: 16,
                  fontSize: 15, fontWeight: 900, cursor: 'pointer',
                  fontFamily: "'Nunito',sans-serif",
                  boxShadow: `0 6px 22px rgba(245,158,11,0.45)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  animation: 'glowPulse 2s ease infinite',
                }}>
                  <Star size={18} fill="white" />
                  See My Results! 🏆
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            PHASE: COMPLETE
        ══════════════════════════════════ */}
        {phase === 'complete' && (
          <div style={{ animation: 'popIn 0.6s ease both' }}>
            <div style={{
              background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
              border: '3px solid #4ade80', borderRadius: 22, padding: '22px',
              boxShadow: '0 14px 44px rgba(74,222,128,0.3)', marginBottom: 16,
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 56, animation: 'bounce 1.5s ease infinite', lineHeight: 1 }}>🏆</div>
                <h2 style={{ margin: '10px 0 6px', fontSize: 22, fontWeight: 900, color: '#166534', fontFamily: "'Nunito',sans-serif" }}>
                  Excellent! You did it! 🎉
                </h2>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#15803d', lineHeight: 1.6 }}>
                  {completionMessage}
                </p>
              </div>

              {/* Stars */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                {[0, 1, 2].map(i => (
                  <Star key={i} size={34} fill="#f59e0b" color="#f59e0b"
                    style={{ animation: `starBounce 0.5s ease both ${i * 0.15}s` }} />
                ))}
              </div>

              {/* Final labelled magnet */}
              <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 14, border: '2px solid #bbf7d0' }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: purple, fontFamily: "'Nunito',sans-serif", textAlign: 'center' }}>
                  ✅ The Mystery Magnet — Identified!
                </p>
                <BarMagnetSVG
                  leftLabel={unmarkedLeftPole}
                  rightLabel={unmarkedRightPole}
                  leftColor={unmarkedLeftPole === 'N' ? '#ef4444' : '#3b82f6'}
                  rightColor={unmarkedRightPole === 'N' ? '#ef4444' : '#3b82f6'}
                  width={240}
                />
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', fontFamily: "'Nunito',sans-serif" }}>🔴 Left = {unmarkedLeftPole}-pole</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', fontFamily: "'Nunito',sans-serif" }}>🔵 Right = {unmarkedRightPole}-pole</span>
                </div>
              </div>

              {/* Science summary */}
              <div style={{ background: 'rgba(83,48,134,0.06)', borderRadius: 14, padding: '14px', marginBottom: 16, border: '1.5px solid rgba(83,48,134,0.12)' }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 900, color: purple, fontFamily: "'Nunito',sans-serif" }}>🔬 What You Learned:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { icon: '🚫', text: 'N-pole repels → that end is also N (same poles repel!)' },
                    { icon: '💚', text: 'N-pole attracts → that end is S (different poles attract!)' },
                    { icon: '✅', text: 'S-pole confirmed everything in the reverse!' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: "'Poppins',sans-serif" }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={reset} style={{
                width: '100%', padding: '13px',
                background: `linear-gradient(135deg,${purple},${blue})`,
                color: 'white', border: 'none', borderRadius: 14,
                fontSize: 15, fontWeight: 900, cursor: 'pointer',
                fontFamily: "'Nunito',sans-serif",
                boxShadow: '0 6px 22px rgba(83,48,134,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'transform 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              >
                <RotateCcw size={17} />
                Try Again! 🔄
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', fontWeight: 600, margin: '0 0 8px' }}>
          NCERT Curiosity · Science · Grade 6 · Chapter 4: Exploring Magnets
        </p>
      </div>
    </div>
  );
};

export default PoleIdentifierTool;