import React, { useState, useEffect, useRef } from 'react';
import { Star, Award, RotateCcw, CheckCircle, XCircle, Zap } from 'lucide-react';

// ─── Keyframes injection ─────────────────────────────────────────────────────
const injectKeyframes = () => {
  if (document.getElementById('magnet-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'magnet-keyframes';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800&display=swap');

    @keyframes bounce-in {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.15); }
      70% { transform: scale(0.95); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-6px); }
      80% { transform: translateX(6px); }
    }
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.6); }
      70% { box-shadow: 0 0 0 14px rgba(245,158,11,0); }
      100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
    }
    @keyframes float-up {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-40px); opacity: 0; }
    }
    @keyframes confetti-fall {
      0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(80px) rotate(720deg); opacity: 0; }
    }
    @keyframes glow-correct {
      0%, 100% { box-shadow: 0 0 10px rgba(34,197,94,0.5); }
      50% { box-shadow: 0 0 25px rgba(34,197,94,0.9), 0 0 40px rgba(34,197,94,0.4); }
    }
    @keyframes slide-in-right {
      from { transform: translateX(60px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes hint-appear {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes spin-award {
      0% { transform: rotate(-10deg) scale(0.5); opacity: 0; }
      60% { transform: rotate(5deg) scale(1.15); opacity: 1; }
      100% { transform: rotate(0deg) scale(1); opacity: 1; }
    }
    @keyframes star-pop {
      0% { transform: scale(0) rotate(0deg); }
      60% { transform: scale(1.3) rotate(20deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes arrow-pulse {
      0%, 100% { opacity: 0.7; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.1); }
    }
    @keyframes magnet-shimmer {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
  `;
  document.head.appendChild(style);
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface EndState {
  id: number;
  answer: 'N' | 'S' | null;
  locked: boolean;
  shake: boolean;
  showFloat: boolean;
}

interface Step {
  endId: number;
  rule: string;
  ruleIcon: string;
  hint: string;
  correctAnswer: 'N' | 'S';
  junctionWith: number | null;
  junctionType: 'attract' | 'repel' | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const STEPS: Step[] = [
  { endId: 6, rule: 'Same Magnet Rule', ruleIcon: '🧲', hint: 'Ends 5 & 6 are both ends of Magnet 3. End 5 = N, so End 6 must be the OPPOSITE!', correctAnswer: 'S', junctionWith: 5, junctionType: null },
  { endId: 4, rule: 'Junction Attract Rule', ruleIcon: '🔗', hint: 'Ends 4 & 5 are touching and ATTRACT each other. End 5 = N. Unlike poles attract — so End 4 is...?', correctAnswer: 'S', junctionWith: 5, junctionType: 'attract' },
  { endId: 3, rule: 'Same Magnet Rule', ruleIcon: '🧲', hint: 'Ends 3 & 4 are both ends of Magnet 2. We found End 4 = S, so End 3 must be the OPPOSITE!', correctAnswer: 'N', junctionWith: 4, junctionType: null },
  { endId: 2, rule: 'Junction Attract Rule', ruleIcon: '🔗', hint: 'Ends 2 & 3 are touching and ATTRACT each other. End 3 = N. Unlike poles attract — so End 2 is...?', correctAnswer: 'S', junctionWith: 3, junctionType: 'attract' },
  { endId: 1, rule: 'Same Magnet Rule', ruleIcon: '🧲', hint: 'Ends 1 & 2 are both ends of Magnet 1. We found End 2 = S, so End 1 must be the OPPOSITE!', correctAnswer: 'N', junctionWith: 2, junctionType: null },
];

const FINAL_ANSWERS: Record<number, 'N' | 'S'> = { 1: 'N', 2: 'S', 3: 'N', 4: 'S', 5: 'N', 6: 'S' };

// ─── Color helpers ────────────────────────────────────────────────────────────
const C = {
  amber: '#f59e0b',
  amberLight: '#fef3c7',
  amberDark: '#d97706',
  amberDeep: '#92400e',
  north: '#4A4DC9',
  northLight: '#C1C1EA',
  south: '#FF7212',
  southLight: '#FFF3E4',
  bg: '#fffbeb',
  card: '#ffffff',
  text: '#1c1917',
  textMuted: '#78716c',
  correct: '#22c55e',
  error: '#ef4444',
  purple: '#533086',
  purpleLight: '#e9d5ff',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const Confetti: React.FC = () => {
  const pieces = Array.from({ length: 18 }, (_, i) => i);
  const colors = [C.amber, C.north, C.south, C.correct, '#a855f7', '#06b6d4'];
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map(i => (
        <div key={i} style={{
          position: 'absolute',
          left: `${5 + (i * 5.5) % 92}%`,
          top: '-10px',
          width: 10 + (i % 4) * 4,
          height: 10 + (i % 3) * 4,
          background: colors[i % colors.length],
          borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
          animation: `confetti-fall ${0.8 + (i % 5) * 0.3}s ease-in ${i * 0.07}s forwards`,
        }} />
      ))}
    </div>
  );
};

const PoleLabel: React.FC<{ pole: 'N' | 'S' | null; size?: number; pulse?: boolean; locked?: boolean }> = ({ pole, size = 36, pulse, locked }) => {
  if (!pole) return null;
  const isN = pole === 'N';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: isN ? C.north : C.south,
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Baloo 2, sans-serif',
      fontWeight: 800, fontSize: size * 0.44,
      animation: locked ? 'glow-correct 2s ease-in-out infinite' : pulse ? 'pulse-ring 1.5s infinite' : 'none',
      border: locked ? `2px solid ${C.correct}` : '2px solid rgba(255,255,255,0.3)',
      flexShrink: 0,
      transition: 'all 0.3s ease',
    }}>
      {pole}
    </div>
  );
};

const EndCircle: React.FC<{
  id: number; pole: 'N' | 'S' | null; locked: boolean; active: boolean; shake: boolean; size?: number;
}> = ({ id, pole, locked, active, shake, size = 44 }) => {
  const hasPole = pole !== null;
  const isN = pole === 'N';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: 'Nunito, sans-serif', letterSpacing: 0.5 }}>End {id}</div>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: hasPole ? (isN ? C.north : C.south) : active ? C.amberLight : '#f5f5f4',
        border: `3px solid ${hasPole ? (isN ? C.northLight : C.southLight) : active ? C.amber : '#e7e5e4'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Baloo 2, sans-serif', fontWeight: 800, fontSize: 18,
        color: hasPole ? '#fff' : active ? C.amberDark : C.textMuted,
        animation: shake ? 'shake 0.45s ease-in-out' : locked ? 'glow-correct 2s ease-in-out infinite' : active ? 'pulse-ring 1.8s infinite' : 'none',
        transition: 'all 0.4s ease',
        cursor: 'default', flexShrink: 0,
      }}>
        {hasPole ? pole : '?'}
      </div>
    </div>
  );
};

const MagnetBar: React.FC<{ label: string; vertical?: boolean }> = ({ label, vertical }) => (
  <div style={{
    background: `linear-gradient(${vertical ? '180deg' : '90deg'}, ${C.north} 50%, ${C.south} 50%)`,
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    ...(vertical ? { width: 28, height: 100, flexDirection: 'column' } : { height: 28, minWidth: 90, flexDirection: 'row' }),
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    animation: 'magnet-shimmer 3s ease-in-out infinite',
    flexShrink: 0,
  }}>
    <span style={{ color: '#fff', fontFamily: 'Baloo 2, sans-serif', fontWeight: 800, fontSize: 11, letterSpacing: 1, writingMode: vertical ? 'vertical-rl' : 'horizontal-tb', textOrientation: vertical ? 'mixed' : 'initial', transform: vertical ? 'rotate(180deg)' : 'none' }}>{label}</span>
  </div>
);

const AttractionArrow: React.FC<{ type: 'attract' | 'repel'; vertical?: boolean }> = ({ type, vertical }) => {
  const isAttract = type === 'attract';
  return (
    <div style={{
      display: 'flex', flexDirection: vertical ? 'column' : 'row',
      alignItems: 'center', gap: 2, padding: '2px 4px',
      animation: 'arrow-pulse 1.5s ease-in-out infinite',
    }}>
      <span style={{ fontSize: 13, color: isAttract ? C.correct : C.error }}>
        {vertical ? (isAttract ? '↕' : '↨') : (isAttract ? '↔' : '⟺')}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 800, fontFamily: 'Nunito, sans-serif',
        color: isAttract ? C.correct : C.error,
        background: isAttract ? '#dcfce7' : '#fee2e2',
        padding: '1px 5px', borderRadius: 8,
      }}>
        {isAttract ? 'attract' : 'repel'}
      </span>
    </div>
  );
};

// ─── Main Diagram ─────────────────────────────────────────────────────────────
const MagnetDiagram: React.FC<{ endStates: EndState[]; currentStep: number; isMobile: boolean }> = ({ endStates, currentStep, isMobile }) => {
  const getEnd = (id: number) => endStates.find(e => e.id === id)!;
  const getActivePole = (id: number): 'N' | 'S' | null => {
    if (id === 5) return 'N';
    const e = getEnd(id);
    return e?.locked ? e.answer : null;
  };

  const step = currentStep < STEPS.length ? STEPS[currentStep] : null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fefce8 0%, #fff7ed 100%)',
      borderRadius: 20, padding: isMobile ? '16px 10px' : '24px 32px',
      border: `2px solid ${C.amberLight}`,
      boxShadow: '0 4px 24px rgba(245,158,11,0.1)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.amberDark, fontFamily: 'Nunito, sans-serif', letterSpacing: 0.5 }}>
        🧲 Magnet Arrangement — Fig. 4.17
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[['N-pole side', C.north], ['S-pole side', C.south]].map(([label, color]) => (
          <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: color as string }} />
            <span style={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', color: C.textMuted, fontWeight: 600 }}>{label as string}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11 }}>🔗</span>
          <span style={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', color: C.correct, fontWeight: 700 }}>attract = unlike poles</span>
        </div>
      </div>

      {/* Horizontal row: End1 — Magnet1 — End2 ... End3 — Magnet2 — End4 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 10, flexWrap: 'nowrap' }}>
        {/* End 1 */}
        <EndCircle id={1} pole={getActivePole(1)} locked={getEnd(1).locked} active={step?.endId === 1} shake={getEnd(1).shake} size={isMobile ? 36 : 44} />
        {/* Magnet 1 */}
        <MagnetBar label="Magnet 1" />
        {/* End 2 */}
        <EndCircle id={2} pole={getActivePole(2)} locked={getEnd(2).locked} active={step?.endId === 2} shake={getEnd(2).shake} size={isMobile ? 36 : 44} />
        {/* attract between 2&3 */}
        <AttractionArrow type="attract" />
        {/* End 3 */}
        <EndCircle id={3} pole={getActivePole(3)} locked={getEnd(3).locked} active={step?.endId === 3} shake={getEnd(3).shake} size={isMobile ? 36 : 44} />
        {/* Magnet 2 */}
        <MagnetBar label="Magnet 2" />
        {/* End 4 */}
        <EndCircle id={4} pole={getActivePole(4)} locked={getEnd(4).locked} active={step?.endId === 4} shake={getEnd(4).shake} size={isMobile ? 36 : 44} />
      </div>

      {/* Vertical: End 4 → attract → End 5 → Magnet 3 → End 6 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-end', marginRight: isMobile ? 0 : 8 }}>
        <AttractionArrow type="attract" vertical />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <EndCircle id={5} pole="N" locked={true} active={false} shake={false} size={isMobile ? 36 : 44} />
          <MagnetBar label="Magnet 3" vertical />
          <EndCircle id={6} pole={getActivePole(6)} locked={getEnd(6).locked} active={step?.endId === 6} shake={getEnd(6).shake} size={isMobile ? 36 : 44} />
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MagnetPoleFinder: React.FC<{ props?: any }> = ({ props: toolProps = {} }) => {
  useEffect(() => { injectKeyframes(); }, []);

  const [endStates, setEndStates] = useState<EndState[]>(
    [1, 2, 3, 4, 6].map(id => ({ id, answer: null, locked: false, shake: false, showFloat: false }))
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stars, setStars] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const step = currentStep < STEPS.length ? STEPS[currentStep] : null;
  const progress = currentStep / STEPS.length;

  const handleAnswer = (choice: 'N' | 'S') => {
    if (!step) return;
    const correct = choice === step.correctAnswer;
    setAttempts(a => a + 1);

    if (correct) {
      setEndStates(prev => prev.map(e =>
        e.id === step.endId ? { ...e, answer: choice, locked: true, showFloat: true } : e
      ));
      setTimeout(() => {
        setEndStates(prev => prev.map(e => e.id === step.endId ? { ...e, showFloat: false } : e));
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setShowHint(false);
        if (nextStep >= STEPS.length) {
          const earnedStars = attempts <= 5 ? 3 : attempts <= 8 ? 2 : 1;
          setStars(earnedStars);
          setCompleted(true);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
        }
      }, 600);
    } else {
      setEndStates(prev => prev.map(e =>
        e.id === step.endId ? { ...e, shake: true } : e
      ));
      setTimeout(() => {
        setEndStates(prev => prev.map(e => e.id === step.endId ? { ...e, shake: false } : e));
      }, 500);
      setTimeout(() => setShowHint(true), 300);
    }
  };

  const handleReset = () => {
    setEndStates([1, 2, 3, 4, 6].map(id => ({ id, answer: null, locked: false, shake: false, showFloat: false })));
    setCurrentStep(0); setShowHint(false); setAttempts(0); setCompleted(false); setShowConfetti(false); setStars(0);
  };

  return (
    <div ref={containerRef} style={{
      fontFamily: 'Nunito, sans-serif',
      background: C.bg,
      minHeight: '100vh',
      padding: isMobile ? '12px 8px' : '24px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20, maxWidth: 600, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: isMobile ? 28 : 36 }}>🧲</span>
          <h1 style={{
            fontFamily: 'Baloo 2, sans-serif', fontWeight: 800,
            fontSize: isMobile ? 22 : 30, margin: 0,
            background: `linear-gradient(135deg, ${C.amberDark}, ${C.amber})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Magnet Pole Finder</h1>
        </div>
        <p style={{ color: C.textMuted, fontSize: 13, margin: 0, fontWeight: 600 }}>
          Start from End 5 (N) and find all the other poles! 🎯
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', maxWidth: 600, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.amberDark }}>Progress: {currentStep}/{STEPS.length}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted }}>{STEPS.length - currentStep} to go</span>
        </div>
        <div style={{ height: 10, background: '#e7e5e4', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 10,
            background: `linear-gradient(90deg, ${C.amber}, ${C.amberDark})`,
            width: `${progress * 100}%`,
            transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: `0 0 8px ${C.amber}88`,
          }} />
        </div>
      </div>

      {/* Diagram */}
      <div style={{ width: '100%', maxWidth: 660, marginBottom: 20, overflowX: 'auto' }}>
        <MagnetDiagram endStates={endStates} currentStep={currentStep} isMobile={isMobile} />
      </div>

      {/* Completion Screen */}
      {completed && (
        <div style={{
          width: '100%', maxWidth: 600, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #fef3c7, #fff7ed)',
          borderRadius: 24, padding: isMobile ? '24px 16px' : '36px 40px',
          border: `3px solid ${C.amber}`,
          boxShadow: `0 8px 32px ${C.amber}44`,
          textAlign: 'center',
          animation: 'bounce-in 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {showConfetti && <Confetti />}
          <div style={{ fontSize: 52, marginBottom: 8, animation: 'spin-award 0.8s ease-out' }}>🏆</div>
          <h2 style={{ fontFamily: 'Baloo 2, sans-serif', fontWeight: 800, fontSize: isMobile ? 22 : 28, color: C.amberDeep, margin: '0 0 6px 0' }}>
            Amazing Work!
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
            {[1, 2, 3].map(i => (
              <Star key={i} size={28} fill={i <= stars ? C.amber : '#e7e5e4'} color={i <= stars ? C.amberDark : '#d6d3d1'} style={{ animation: `star-pop 0.5s ease-out ${i * 0.15}s both` }} />
            ))}
          </div>
          <p style={{ color: C.textMuted, fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
            You figured out all the poles! Here's the complete arrangement:
          </p>
          {/* Final answer display */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
            {[1, 2, 3, 4, 5, 6].map(id => (
              <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>End {id}</div>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: FINAL_ANSWERS[id as keyof typeof FINAL_ANSWERS] === 'N' ? C.north : C.south,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontFamily: 'Baloo 2, sans-serif', fontWeight: 800, fontSize: 18,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                  {FINAL_ANSWERS[id as keyof typeof FINAL_ANSWERS]}
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleReset} style={{
            background: `linear-gradient(135deg, ${C.amber}, ${C.amberDark})`,
            border: 'none', borderRadius: 50, padding: '12px 28px',
            color: '#fff', fontFamily: 'Baloo 2, sans-serif', fontWeight: 800, fontSize: 16,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: `0 4px 14px ${C.amber}88`,
            transition: 'transform 0.15s ease',
          }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
             onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
            <RotateCcw size={16} /> Try Again
          </button>
        </div>
      )}

      {/* Step Card */}
      {!completed && step && (
        <div style={{
          width: '100%', maxWidth: 600,
          background: C.card, borderRadius: 24,
          border: `2px solid ${C.amberLight}`,
          boxShadow: '0 6px 24px rgba(245,158,11,0.12)',
          overflow: 'hidden',
          animation: 'slide-in-right 0.4s ease-out',
        }}>
          {/* Step Header */}
          <div style={{
            background: `linear-gradient(135deg, ${C.amber}22, ${C.amberLight})`,
            borderBottom: `1px solid ${C.amberLight}`,
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.amber}, ${C.amberDark})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: 'Baloo 2, sans-serif', fontWeight: 800, fontSize: 16,
              flexShrink: 0,
            }}>
              {currentStep + 1}
            </div>
            <div>
              <div style={{ fontFamily: 'Baloo 2, sans-serif', fontWeight: 800, fontSize: 15, color: C.text }}>
                End {step.endId} — {currentStep === 0 || currentStep === 2 || currentStep === 4 ? 'same magnet as End ' + step.junctionWith : 'junction with End ' + step.junctionWith}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <span style={{ fontSize: 12 }}>{step.ruleIcon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.amberDark }}>{step.rule}</span>
              </div>
            </div>
          </div>

          {/* Hint box */}
          <div style={{ padding: '14px 20px', background: '#fffbeb', borderBottom: `1px solid ${C.amberLight}` }}>
            <div style={{
              background: '#fef3c7', borderRadius: 12, padding: '12px 16px',
              borderLeft: `4px solid ${C.amber}`,
              fontSize: 14, color: C.amberDeep, fontWeight: 700, lineHeight: 1.5,
            }}>
              💡 {step.hint}
            </div>
          </div>

          {/* Junction info */}
          {step.junctionType && (
            <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4' }}>
              <span style={{ fontSize: 20 }}>↔️</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                Ends {step.endId} & {step.junctionWith} are <span style={{ textDecoration: 'underline' }}>touching and attracting</span> — unlike poles must meet here!
              </span>
            </div>
          )}

          {/* Answer buttons */}
          <div style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
              End {step.endId} is:
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['N', 'S'] as const).map(choice => (
                <button key={choice} onClick={() => handleAnswer(choice)} style={{
                  flex: 1, height: isMobile ? 48 : 54, borderRadius: 16,
                  border: `3px solid ${choice === 'N' ? C.northLight : C.southLight}`,
                  background: choice === 'N' ? C.northLight : C.southLight,
                  color: choice === 'N' ? C.north : C.south,
                  fontFamily: 'Baloo 2, sans-serif', fontWeight: 800,
                  fontSize: isMobile ? 18 : 22, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = choice === 'N' ? C.north : C.south;
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.04)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = choice === 'N' ? C.northLight : C.southLight;
                    e.currentTarget.style.color = choice === 'N' ? C.north : C.south;
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>

          {/* Wrong answer hint */}
          {showHint && (
            <div style={{
              margin: '0 20px 18px',
              background: '#fef2f2', borderRadius: 12, padding: '10px 14px',
              borderLeft: `4px solid ${C.error}`,
              display: 'flex', alignItems: 'flex-start', gap: 8,
              animation: 'hint-appear 0.3s ease-out',
            }}>
              <span style={{ fontSize: 16, marginTop: 1 }}>❌</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#b91c1c', marginBottom: 2 }}>Not quite! Try again 💪</div>
                <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
                  {step.junctionType === 'attract'
                    ? 'Remember: ATTRACT means UNLIKE poles → if one end is N, the other must be S!'
                    : 'Remember: Same magnet = OPPOSITE poles! One end is N, the other must be S.'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!completed && (
        <div style={{ maxWidth: 600, width: '100%', marginTop: 16, padding: '12px 16px', background: C.purpleLight, borderRadius: 14, border: `1.5px solid ${C.northLight}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.purple, marginBottom: 6 }}>📖 How to play:</div>
          <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {['Start from End 5 which is marked N (already given!)', 'Use the attraction/same-magnet arrows to figure out each end', 'Select N or S for each blank end one by one', 'If you get it wrong, read the hint and try again!'].map((tip, i) => (
              <li key={i} style={{ fontSize: 12, color: C.purple, fontWeight: 600 }}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Reset button */}
      {!completed && currentStep > 0 && (
        <button onClick={handleReset} style={{
          marginTop: 16, background: 'transparent',
          border: `2px solid ${C.amberLight}`, borderRadius: 50, padding: '8px 20px',
          color: C.amberDark, fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.15s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = C.amberLight; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <RotateCcw size={14} /> Start Over
        </button>
      )}
    </div>
  );
};

export default MagnetPoleFinder;