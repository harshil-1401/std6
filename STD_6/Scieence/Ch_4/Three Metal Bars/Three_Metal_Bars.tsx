import React, { useState, useEffect } from 'react';
import { RotateCcw, ChevronRight, Star } from 'lucide-react';

type BarId = 'X' | 'Y' | 'Z';
type PairKey = 'X-Y' | 'X-Z' | 'Y-Z';
type Result = 'repulsion' | 'attraction' | null;
type BarRole = 'magnet' | 'iron' | '';

interface MagnetReasoningToolProps {
  props?: {
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: {
      magnetPair?: [BarId, BarId];
      ironBar?: BarId;
      correctExplanation?: string;
    };
  };
}

// ── Single Pair Test Card ──────────────────────────────────────────
const TestCard: React.FC<{
  barA: BarId; barB: BarId;
  result: Result; tested: boolean;
  onTest: () => void; index: number;
}> = ({ barA, barB, result, tested, onTest, index }) => {
  const [testing, setTesting] = useState(false);
  const [shake, setShake] = useState(false);

  const run = () => {
    if (tested || testing) return;
    setTesting(true);
    setShake(true);
    setTimeout(() => setShake(false), 600);
    setTimeout(() => { onTest(); setTesting(false); }, 800);
  };

  const isRep = result === 'repulsion';
  const isAtt = result === 'attraction';

  const cardBg = !tested
    ? 'white'
    : isRep
      ? 'linear-gradient(135deg,#fff1f2,#ffe4e6)'
      : 'linear-gradient(135deg,#f0fdf4,#dcfce7)';

  const borderColor = !tested ? '#e5e7eb' : isRep ? '#f87171' : '#4ade80';

  return (
    <div style={{
      background: cardBg,
      border: `2.5px solid ${borderColor}`,
      borderRadius: 20,
      padding: '16px',
      boxShadow: tested
        ? isRep ? '0 6px 20px rgba(248,113,113,0.2)' : '0 6px 20px rgba(74,222,128,0.2)'
        : '0 3px 12px rgba(0,0,0,0.06)',
      transition: 'all 0.4s ease',
      animation: `fadeUp 0.4s ease both ${index * 0.1}s`,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          fontSize: 12, fontWeight: 800, color: '#533086',
          background: '#ede9fe', borderRadius: 8, padding: '3px 10px',
          fontFamily: "'Nunito',sans-serif",
        }}>
          Bar {barA} vs Bar {barB}
        </span>
        {tested && (
          <span style={{
            fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '3px 10px',
            color: isRep ? '#dc2626' : '#16a34a',
            background: isRep ? '#fee2e2' : '#dcfce7',
            fontFamily: "'Nunito',sans-serif",
          }}>
            {isRep ? '🚫 REPULSION' : '💚 ATTRACTION'}
          </span>
        )}
      </div>

      {/* Visual arena */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '8px 0', minHeight: 60,
      }}>
        {/* Left bar */}
        <div style={{
          width: 90, height: 42, borderRadius: 10,
          background: 'linear-gradient(90deg, #ef4444 50%, #4A4DC9 50%)',
          display: 'flex', overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          transform: tested && isRep ? 'translateX(-10px)' : tested && isAtt ? 'translateX(8px)' : testing ? 'translateX(-6px)' : 'translateX(0)',
          transition: 'transform 0.4s ease',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 14, fontFamily: "'Nunito',sans-serif" }}>N</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 14, fontFamily: "'Nunito',sans-serif" }}>S</span>
          </div>
        </div>

        {/* Center */}
        <div style={{ width: 54, textAlign: 'center', flexShrink: 0 }}>
          {testing && (
            <div style={{
              width: 28, height: 28, margin: '0 auto',
              border: '3px solid #533086', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 0.6s linear infinite',
            }} />
          )}
          {!testing && !tested && <div style={{ fontSize: 22 }}>⚡</div>}
          {tested && isRep && (
            <div>
              <div style={{ fontSize: 16 }}>⬅️ ➡️</div>
              <div style={{ fontSize: 8, fontWeight: 800, color: '#dc2626', fontFamily: "'Nunito',sans-serif" }}>PUSH AWAY!</div>
            </div>
          )}
          {tested && isAtt && (
            <div>
              <div style={{ fontSize: 16 }}>➡️ ⬅️</div>
              <div style={{ fontSize: 8, fontWeight: 800, color: '#16a34a', fontFamily: "'Nunito',sans-serif" }}>PULL IN!</div>
            </div>
          )}
        </div>

        {/* Right bar */}
        <div style={{
          width: 90, height: 42, borderRadius: 10,
          background: tested
            ? isRep
              ? 'linear-gradient(90deg, #ef4444 50%, #4A4DC9 50%)'
              : 'linear-gradient(90deg, #9ca3af 0%, #d1d5db 100%)'
            : 'linear-gradient(90deg, #9ca3af 0%, #d1d5db 100%)',
          display: 'flex', overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          transform: tested && isRep ? 'translateX(10px)' : tested && isAtt ? 'translateX(-8px)' : testing ? 'translateX(6px)' : 'translateX(0)',
          transition: 'transform 0.4s ease',
          flexShrink: 0,
        }}>
          {tested && isRep ? (
            <>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 900, fontSize: 14, fontFamily: "'Nunito',sans-serif" }}>N</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 900, fontSize: 14, fontFamily: "'Nunito',sans-serif" }}>S</span>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'rgba(255,255,255,0.3)', borderRadius: '10px 10px 0 0' }} />
              <span style={{ color: 'white', fontWeight: 900, fontSize: 13, fontFamily: "'Nunito',sans-serif", textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                {tested ? 'IRON' : '???'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Result message or button */}
      {!tested ? (
        <button
          onClick={run}
          disabled={testing}
          style={{
            width: '100%', marginTop: 10, padding: '10px',
            background: testing ? '#e5e7eb' : 'linear-gradient(135deg,#533086,#4A4DC9)',
            color: testing ? '#9ca3af' : 'white',
            border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 800,
            cursor: testing ? 'wait' : 'pointer',
            fontFamily: "'Nunito',sans-serif",
            boxShadow: testing ? 'none' : '0 4px 14px rgba(83,48,134,0.4)',
            transition: 'all 0.2s',
          }}
        >
          {testing ? '🔬 Testing...' : '🧲 Click to Test This Pair!'}
        </button>
      ) : (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 10,
          background: isRep ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
          fontSize: 12, fontWeight: 700, lineHeight: 1.5,
          color: isRep ? '#dc2626' : '#166534',
          fontFamily: "'Poppins',sans-serif",
          textAlign: 'center',
        }}>
          {isRep
            ? '🚫 They pushed away! → Both Bar ' + barA + ' and Bar ' + barB + ' are MAGNETS!'
            : '💚 They attracted! → At least one of these could be iron.'}
        </div>
      )}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────
const MagnetReasoningTool: React.FC<MagnetReasoningToolProps> = ({ props = {} }) => {
  const { themeColor = '#f59e0b', additionalProps = {} } = props;
  const {
    magnetPair = ['X', 'Y'] as [BarId, BarId],
    ironBar = 'Z' as BarId,
    correctExplanation = "Correct! X and Y repelled each other, so both must be magnets. Z always attracted — it's iron!",
  } = additionalProps;

  const barIds: BarId[] = ['X', 'Y', 'Z'];
  const pairs: { key: PairKey; a: BarId; b: BarId }[] = [
    { key: 'X-Y', a: 'X', b: 'Y' },
    { key: 'X-Z', a: 'X', b: 'Z' },
    { key: 'Y-Z', a: 'Y', b: 'Z' },
  ];

  const getResult = (a: BarId, b: BarId): Result =>
    magnetPair.includes(a) && magnetPair.includes(b) ? 'repulsion' : 'attraction';

  const [results, setResults] = useState<Record<PairKey, Result>>({ 'X-Y': null, 'X-Z': null, 'Y-Z': null });
  const [selections, setSelections] = useState<Record<BarId, BarRole>>({ X: '', Y: '', Z: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [mounted, setMounted] = useState(false);

  const testedCount = Object.values(results).filter(r => r !== null).length;
  const allTested = testedCount === 3;
  const allSelected = barIds.every(id => selections[id] !== '');

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Poppins:wght@400;500;600;700&display=swap');
      @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
      @keyframes pop{0%{transform:scale(0.78);opacity:0;}65%{transform:scale(1.06);}100%{transform:scale(1);opacity:1;}}
      @keyframes wiggle{0%,100%{transform:rotate(0);}30%{transform:rotate(-8deg);}70%{transform:rotate(8deg);}}
      @keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
      @keyframes confettiFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1;}100%{transform:translateY(110px) rotate(540deg);opacity:0;}}
      @keyframes starBounce{0%{transform:scale(0)rotate(-20deg);opacity:0;}60%{transform:scale(1.3)rotate(10deg);opacity:1;}100%{transform:scale(1)rotate(0);opacity:1;}}
      @keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.5);}50%{box-shadow:0 0 0 8px rgba(245,158,11,0);}}
    `;
    document.head.appendChild(style);
    setTimeout(() => setMounted(true), 60);
    return () => document.head.removeChild(style);
  }, []);

  const handleTest = (key: PairKey, a: BarId, b: BarId) => {
    setResults(prev => ({ ...prev, [key]: getResult(a, b) }));
  };

  const handleSubmit = () => {
    const ok = selections[magnetPair[0]] === 'magnet' && selections[magnetPair[1]] === 'magnet' && selections[ironBar] === 'iron';
    setIsCorrect(ok);
    setSubmitted(true);
    if (ok) { setConfetti(true); setTimeout(() => setConfetti(false), 3000); }
  };

  const handleReset = () => {
    setResults({ 'X-Y': null, 'X-Z': null, 'Y-Z': null });
    setSelections({ X: '', Y: '', Z: '' });
    setSubmitted(false); setIsCorrect(false); setConfetti(false);
  };

  return (
    <div style={{
      fontFamily: "'Poppins',sans-serif", minHeight: '100vh',
      background: 'linear-gradient(150deg,#fdf6ff 0%,#fef9ec 55%,#f0fdf4 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '16px 14px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
    }}>

      {/* BG bubbles */}
      <div style={{ position: 'fixed', top: -70, right: -70, width: 220, height: 220, borderRadius: '50%', background: 'rgba(193,193,234,0.22)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -60, left: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(252,145,69,0.14)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '45%', left: -50, width: 140, height: 140, borderRadius: '50%', background: 'rgba(74,222,128,0.10)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Confetti */}
      {confetti && Array.from({ length: 24 }).map((_, i) => (
        <div key={i} style={{
          position: 'fixed', left: `${4 + Math.random() * 92}%`, top: '-12px',
          width: i % 3 === 0 ? 8 : 10, height: i % 3 === 0 ? 8 : 6,
          borderRadius: i % 2 === 0 ? '50%' : '3px',
          background: ['#f59e0b','#533086','#ef4444','#4A4DC9','#10b981','#fc9145','#fbbf24'][i % 7],
          animation: `confettiFall ${1.2 + Math.random() * 1.8}s ease-out forwards`,
          animationDelay: `${Math.random() * 0.6}s`,
          zIndex: 1000, pointerEvents: 'none', transform: `rotate(${Math.random()*360}deg)`,
        }} />
      ))}

      <div style={{ width: '100%', maxWidth: 620, position: 'relative', zIndex: 1 }}>

        {/* ── HERO ── */}
        <div style={{
          background: 'linear-gradient(135deg,#533086 0%,#4A4DC9 55%,#7c3aed 100%)',
          borderRadius: 26, padding: '22px 22px 20px', marginBottom: 18,
          boxShadow: '0 14px 44px rgba(83,48,134,0.35)',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-14px)',
          transition: 'all 0.5s ease', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 90, opacity: 0.08, pointerEvents: 'none', transform: 'rotate(-20deg)' }}>🧲</div>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 36, animation: 'wiggle 2.5s ease infinite', flexShrink: 0 }}>🧲</div>
              <div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}>
                  SCIENCE · GRADE 6 · CHAPTER 4
                </p>
                <h1 style={{ margin: 0, color: 'white', fontSize: 20, fontWeight: 900, fontFamily: "'Nunito',sans-serif", lineHeight: 1.25 }}>
                  Magnet or Iron?
                </h1>
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.14)', borderRadius: 14,
              padding: '12px 14px', backdropFilter: 'blur(6px)',
            }}>
              <p style={{ margin: 0, color: 'white', fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>
                📖 <strong>Reshma has 3 metal bars — X, Y and Z.</strong><br />
                Two are magnets 🧲 and one is plain iron ⚙️.<br />
                Test every pair and figure out which is which! 🔍
              </p>
            </div>
          </div>
        </div>

        {/* ── KEY FACT ── */}
        <div style={{
          background: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
          border: '2.5px solid #fbbf24', borderRadius: 18,
          padding: '14px 16px', marginBottom: 18,
          display: 'flex', gap: 12, alignItems: 'flex-start',
          boxShadow: '0 4px 16px rgba(251,191,36,0.22)',
          opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease 0.12s',
        }}>
          <div style={{ fontSize: 30, flexShrink: 0, animation: 'bounce 2.2s ease infinite' }}>💡</div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 900, color: '#92400e', fontFamily: "'Nunito',sans-serif" }}>
              The Key to Solving This!
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: '#78350f', fontWeight: 600, lineHeight: 1.7 }}>
              A magnet <span style={{ background: '#fca5a5', color: '#7f1d1d', borderRadius: 6, padding: '1px 6px', fontWeight: 800 }}>REPELS (pushes away)</span> another magnet.<br />
              Iron is <span style={{ background: '#bbf7d0', color: '#14532d', borderRadius: 6, padding: '1px 6px', fontWeight: 800 }}>ALWAYS ATTRACTED</span> — it never pushes away.<br />
              👉 So <strong>if two bars push each other → both are magnets!</strong>
            </p>
          </div>
        </div>

        {/* ── STEP 1 ── */}
        <div style={{
          background: 'white', borderRadius: 22, padding: '18px',
          boxShadow: '0 6px 24px rgba(83,48,134,0.09)',
          border: '2px solid #ede9fe', marginBottom: 16,
          opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease 0.2s',
        }}>
          {/* Step header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#533086,#4A4DC9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 900, color: 'white', fontFamily: "'Nunito',sans-serif",
            }}>1</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1e1b4b', fontFamily: "'Nunito',sans-serif" }}>
                Test Every Pair 🔬
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>
                Click the button on each card to run the experiment!
              </p>
            </div>
            {/* Badge */}
            <div style={{
              background: testedCount === 3 ? '#dcfce7' : '#f3f0ff',
              border: `2px solid ${testedCount === 3 ? '#4ade80' : '#c4b5fd'}`,
              borderRadius: 20, padding: '4px 12px',
              fontSize: 12, fontWeight: 900,
              color: testedCount === 3 ? '#16a34a' : '#7c3aed',
              fontFamily: "'Nunito',sans-serif", flexShrink: 0,
            }}>
              {testedCount === 3 ? '✅ Done!' : `${testedCount}/3`}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 7, background: '#f3f0ff', borderRadius: 100, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{
              height: '100%', borderRadius: 100,
              width: `${(testedCount / 3) * 100}%`,
              background: 'linear-gradient(90deg,#533086,#4A4DC9)',
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Test cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pairs.map(({ key, a, b }, idx) => (
              <TestCard
                key={key}
                barA={a} barB={b}
                result={results[key]}
                tested={results[key] !== null}
                onTest={() => handleTest(key, a, b)}
                index={idx}
              />
            ))}
          </div>

          {allTested && (
            <div style={{
              marginTop: 14, padding: '10px 14px',
              background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
              border: '2px solid #4ade80', borderRadius: 14, textAlign: 'center',
              fontSize: 13, fontWeight: 800, color: '#166534', fontFamily: "'Nunito',sans-serif",
              animation: 'pop 0.4s ease both',
            }}>
              🎉 All pairs tested! Now scroll down and make your choice!
            </div>
          )}
        </div>

        {/* ── STEP 2 ── */}
        {allTested && !submitted && (
          <div style={{
            background: 'white', borderRadius: 22, padding: '18px',
            boxShadow: '0 6px 24px rgba(245,158,11,0.15)',
            border: '2.5px solid #fbbf24', marginBottom: 16,
            animation: 'pop 0.5s ease both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#f59e0b,#fc9145)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, fontWeight: 900, color: 'white', fontFamily: "'Nunito',sans-serif",
              }}>2</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1e1b4b', fontFamily: "'Nunito',sans-serif" }}>
                  Now You Decide! 🤔
                </h2>
                <p style={{ margin: 0, fontSize: 11, color: '#92400e', fontWeight: 700 }}>
                  Tap Magnet or Iron for each bar!
                </p>
              </div>
            </div>

            {/* Hint */}
            <div style={{
              background: 'linear-gradient(135deg,#fef9c3,#fef3c7)',
              border: '2px solid #fde047', borderRadius: 14,
              padding: '10px 14px', marginBottom: 14,
            }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#713f12', fontFamily: "'Poppins',sans-serif", lineHeight: 1.6 }}>
                🧠 <strong>Your Clue:</strong> Which pair{' '}
                <span style={{ background: '#fca5a5', padding: '1px 6px', borderRadius: 6, color: '#7f1d1d', fontWeight: 800 }}>
                  REPELLED
                </span>?
                {' '}Those two are the magnets! The one left out is iron.
              </p>
            </div>

            {/* Bar selector cards */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {barIds.map(id => (
                <div key={id} style={{ flex: 1, minWidth: 120 }}>
                  <div style={{
                    background: selections[id] === 'magnet'
                      ? 'linear-gradient(135deg,#ede9fe,#ddd6fe)'
                      : selections[id] === 'iron'
                        ? 'linear-gradient(135deg,#f9fafb,#f3f4f6)'
                        : '#fafafa',
                    border: `2.5px solid ${selections[id] === 'magnet' ? '#7c3aed' : selections[id] === 'iron' ? '#9ca3af' : '#e5e7eb'}`,
                    borderRadius: 18, padding: '12px 8px', textAlign: 'center',
                    transition: 'all 0.3s ease',
                    boxShadow: selections[id] ? '0 4px 14px rgba(83,48,134,0.12)' : 'none',
                  }}>
                    <div style={{ fontSize: 30, marginBottom: 4 }}>
                      {selections[id] === 'magnet' ? '🧲' : selections[id] === 'iron' ? '⚙️' : '❓'}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#1e1b4b', fontFamily: "'Nunito',sans-serif", marginBottom: 8 }}>
                      Bar {id}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { val: 'magnet' as BarRole, emoji: '🧲', label: 'Magnet', activeColor: '#533086' },
                        { val: 'iron' as BarRole, emoji: '⚙️', label: 'Iron', activeColor: '#4b5563' },
                      ].map(opt => (
                        <button
                          key={opt.val}
                          onClick={() => setSelections(prev => ({ ...prev, [id]: opt.val }))}
                          style={{
                            padding: '8px 4px',
                            background: selections[id] === opt.val
                              ? `linear-gradient(135deg,${opt.activeColor},${opt.activeColor}cc)`
                              : 'white',
                            color: selections[id] === opt.val ? 'white' : '#374151',
                            border: `2px solid ${selections[id] === opt.val ? opt.activeColor : '#e5e7eb'}`,
                            borderRadius: 10, fontSize: 12, fontWeight: 800,
                            cursor: 'pointer', fontFamily: "'Nunito',sans-serif",
                            transition: 'all 0.2s',
                            transform: selections[id] === opt.val ? 'scale(1.04)' : 'scale(1)',
                          }}
                        >
                          {opt.emoji} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!allSelected}
              style={{
                width: '100%', padding: '14px',
                background: allSelected
                  ? 'linear-gradient(135deg,#f59e0b,#fc9145)'
                  : '#e5e7eb',
                color: allSelected ? 'white' : '#9ca3af',
                border: 'none', borderRadius: 16,
                fontSize: 16, fontWeight: 900,
                cursor: allSelected ? 'pointer' : 'not-allowed',
                fontFamily: "'Nunito',sans-serif",
                boxShadow: allSelected ? '0 6px 22px rgba(245,158,11,0.45)' : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                animation: allSelected ? 'glowPulse 2s ease infinite' : 'none',
              }}
            >
              <ChevronRight size={20} />
              {allSelected ? 'Check My Answer! 🎯' : 'Choose for all 3 bars first…'}
            </button>
          </div>
        )}

        {/* ── STEP 3: RESULT ── */}
        {submitted && (
          <div style={{
            borderRadius: 22, padding: '22px',
            background: isCorrect
              ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)'
              : 'linear-gradient(135deg,#fff1f2,#ffe4e6)',
            border: `3px solid ${isCorrect ? '#4ade80' : '#f87171'}`,
            boxShadow: isCorrect
              ? '0 14px 44px rgba(74,222,128,0.3)'
              : '0 14px 44px rgba(248,113,113,0.25)',
            marginBottom: 16,
            animation: 'pop 0.6s ease both',
          }}>
            {/* Trophy / sad */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 58, animation: isCorrect ? 'bounce 1.5s ease infinite' : 'none', lineHeight: 1 }}>
                {isCorrect ? '🏆' : '😅'}
              </div>
              <h2 style={{
                margin: '10px 0 6px', fontSize: 22, fontWeight: 900,
                color: isCorrect ? '#166534' : '#991b1b',
                fontFamily: "'Nunito',sans-serif",
              }}>
                {isCorrect ? 'Brilliant! You got it! 🎉' : 'Not quite — try again!'}
              </h2>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.6,
                color: isCorrect ? '#15803d' : '#b91c1c',
              }}>
                {isCorrect
                  ? correctExplanation
                  : 'Hint: Find the pair that REPELLED. Those two must be magnets. The remaining bar is iron!'}
              </p>
            </div>

            {/* Stars for correct */}
            {isCorrect && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                {[0, 1, 2].map(i => (
                  <Star key={i} size={34} fill="#f59e0b" color="#f59e0b"
                    style={{ animation: `starBounce 0.5s ease both ${i * 0.15}s` }} />
                ))}
              </div>
            )}

            {/* Answer cards */}
            <div style={{
              background: 'white', borderRadius: 16, padding: '14px',
              border: '2px solid rgba(0,0,0,0.06)', marginBottom: 14,
            }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: '#533086', fontFamily: "'Nunito',sans-serif" }}>
                ✅ The Correct Answers:
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {barIds.map(id => {
                  const isMag = magnetPair.includes(id);
                  const studentOk = selections[id] === (isMag ? 'magnet' : 'iron');
                  return (
                    <div key={id} style={{
                      flex: 1, minWidth: 90, textAlign: 'center',
                      background: isMag ? 'linear-gradient(135deg,#ede9fe,#ddd6fe)' : 'linear-gradient(135deg,#f9fafb,#f3f4f6)',
                      border: `2.5px solid ${isMag ? '#7c3aed' : '#9ca3af'}`,
                      borderRadius: 14, padding: '12px 6px',
                    }}>
                      <div style={{ fontSize: 26 }}>{isMag ? '🧲' : '⚙️'}</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#1e1b4b', fontFamily: "'Nunito',sans-serif" }}>Bar {id}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: isMag ? '#7c3aed' : '#6b7280', marginTop: 2 }}>
                        {isMag ? 'Magnet' : 'Iron'}
                      </div>
                      <div style={{ fontSize: 20, marginTop: 4 }}>{studentOk ? '✅' : '❌'}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Science note */}
            <div style={{
              background: 'rgba(83,48,134,0.06)', borderRadius: 14,
              padding: '12px 14px', marginBottom: 16,
              border: '1.5px solid rgba(83,48,134,0.12)',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>🔬</span>
                <p style={{ margin: 0, fontSize: 12.5, color: '#374151', fontWeight: 600, lineHeight: 1.7 }}>
                  <strong style={{ color: '#533086' }}>Science Takeaway:</strong><br />
                  Only magnets can <span style={{ color: '#dc2626', fontWeight: 800 }}>repel (push away)</span> another magnet.
                  Iron pieces are <span style={{ color: '#16a34a', fontWeight: 800 }}>always attracted</span> — they can never repel.
                  So the pair that pushed each other must both be magnets!
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              style={{
                width: '100%', padding: '13px',
                background: 'linear-gradient(135deg,#533086,#4A4DC9)',
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
        )}

        <p style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', fontWeight: 600, margin: '0 0 8px' }}>
          NCERT Curiosity · Science · Grade 6 · Chapter 4: Exploring Magnets
        </p>
      </div>
    </div>
  );
};

export default MagnetReasoningTool;