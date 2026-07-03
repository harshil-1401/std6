import React, { useState, useEffect } from 'react';

// ─── Design Tokens — Singularity Design System ────────────────────────────────
const DS = {
  purple:      '#533086',
  purpleHov:   '#3d2268',
  purpleLight: '#C1C1EA',
  purpleFaded: '#ede9f6',
  orange:      '#FC9145',
  orangeLight: '#FFF3E4',
  gradient:    'linear-gradient(135deg, #533086 0%, #FC9145 100%)',
  green:       '#16a34a',
  greenLight:  '#dcfce7',
  greenBorder: '#16a34a',
  red:         '#dc2626',
  redLight:    '#fee2e2',
  redBorder:   '#dc2626',
  bg:          '#F5F5F5',
  white:       '#ffffff',
  gray1:       '#4E4E4E',
  gray2:       '#CACACA',
  gray3:       '#EBEBEB',
  font:        "'Poppins', sans-serif",
  radius:      '14px',
  radiusSm:    '10px',
  radiusLg:    '20px',
  shadow:      '0 2px 12px rgba(83,48,134,0.10)',
  shadowMd:    '0 6px 24px rgba(83,48,134,0.16)',
  shadowLg:    '0 16px 48px rgba(83,48,134,0.22)',
};

// ─── Keyframes ────────────────────────────────────────────────────────────────
const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; }
@keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes popIn     { 0%{transform:scale(0.82);opacity:0} 60%{transform:scale(1.05);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes modalIn   { 0%{transform:scale(0.76);opacity:0} 65%{transform:scale(1.04);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes gradAnim  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes pulsebtn  { 0%,100%{box-shadow:0 4px 14px rgba(83,48,134,0.35)} 50%{box-shadow:0 4px 22px rgba(252,145,69,0.5)} }
@keyframes floatBob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes confFall  { 0%{transform:translateY(-12px) rotate(0deg);opacity:1} 100%{transform:translateY(130px) rotate(420deg);opacity:0} }
@keyframes slideLeft  { 0%{transform:translateX(0)} 100%{transform:translateX(-22px)} }
@keyframes slideRight { 0%{transform:translateX(0)} 100%{transform:translateX(22px)} }
@keyframes repelLeft  { 0%{transform:translateX(0)} 100%{transform:translateX(-18px)} }
@keyframes repelRight { 0%{transform:translateX(0)} 100%{transform:translateX(18px)} }
@keyframes bounce     { 0%,100%{transform:scale(1)} 40%{transform:scale(1.08)} 70%{transform:scale(0.96)} }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
type Pole = 'N' | 'S';
type Answer = 'attract' | 'repel';

interface Scenario {
  id: number;
  leftPole: Pole;
  rightPole: Pole;
  correctAnswer: Answer;
  explanation: string;
}

interface MagnetPredictionQuizProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: {
      scenarios?: Scenario[];
      title?: string;
      subtitle?: string;
      completionMessage?: string;
    };
  };
  setStepDetails?: (d: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─── Default Scenarios ────────────────────────────────────────────────────────
const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: 1,
    leftPole: 'N',
    rightPole: 'N',
    correctAnswer: 'repel',
    explanation: 'N–N are like poles, so they repel each other.',
  },
  {
    id: 2,
    leftPole: 'N',
    rightPole: 'S',
    correctAnswer: 'attract',
    explanation: 'N–S are unlike poles, so they attract each other.',
  },
  {
    id: 3,
    leftPole: 'S',
    rightPole: 'S',
    correctAnswer: 'repel',
    explanation: 'S–S are like poles, so they repel each other.',
  },
  {
    id: 4,
    leftPole: 'S',
    rightPole: 'N',
    correctAnswer: 'attract',
    explanation: 'S–N are unlike poles, so they attract each other.',
  },
];

// ─── Pole colour helpers ──────────────────────────────────────────────────────
const poleColor = (p: Pole) => (p === 'N' ? '#e53e3e' : '#3182ce');
const poleBg    = (p: Pole) => (p === 'N' ? '#fff5f5' : '#ebf8ff');
const poleBorder= (p: Pole) => (p === 'N' ? '#fc8181' : '#63b3ed');

// ─── Magnet SVG ───────────────────────────────────────────────────────────────
// direction: 'left' = magnet faces right (right end is the active pole)
//            'right' = magnet faces left (left end is the active pole)
const MagnetSVG = ({
  activePole,
  direction,
  animate,
  animationType,
}: {
  activePole: Pole;
  direction: 'left' | 'right';
  animate: boolean;
  animationType: Answer | null;
}) => {
  const activeColor   = activePole === 'N' ? '#e53e3e' : '#3182ce';
  const inactiveColor = activePole === 'N' ? '#3182ce' : '#e53e3e';
  const inactivePole  = activePole === 'N' ? 'S' : 'N';

  // left magnet: active pole on right, inactive on left
  // right magnet: active pole on left, inactive on right
  const leftColor  = direction === 'left' ? inactiveColor : activeColor;
  const rightColor = direction === 'left' ? activeColor   : inactiveColor;
  const leftLabel  = direction === 'left' ? inactivePole  : activePole;
  const rightLabel = direction === 'left' ? activePole    : inactivePole;

  let animStyle: React.CSSProperties = {};
  if (animate && animationType === 'attract') {
    animStyle = {
      animation: direction === 'left'
        ? 'slideLeft 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards'
        : 'slideRight 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
    };
  } else if (animate && animationType === 'repel') {
    animStyle = {
      animation: direction === 'left'
        ? 'repelLeft 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards'
        : 'repelRight 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, ...animStyle }}>
      {/* Magnet body */}
      <svg viewBox="0 0 110 44" width="clamp(80px,22vw,110px)" style={{ display: 'block' }}>
        {/* Shadow */}
        <rect x="3" y="5" width="104" height="36" rx="9" fill="rgba(0,0,0,0.07)" />
        {/* Left half */}
        <rect x="2" y="3" width="54" height="36" rx="9" fill={leftColor} />
        {/* Right half */}
        <rect x="54" y="3" width="54" height="36" rx="9" fill={rightColor} />
        {/* Divider */}
        <line x1="54" y1="3" x2="54" y2="39" stroke="white" strokeWidth="2" />
        {/* Shine */}
        <rect x="8" y="7" width="42" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
        <rect x="58" y="7" width="42" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
        {/* Labels */}
        <text x="29" y="25" textAnchor="middle" dominantBaseline="middle"
          fontSize="15" fontWeight="800" fill="white" fontFamily="Poppins,sans-serif">{leftLabel}</text>
        <text x="81" y="25" textAnchor="middle" dominantBaseline="middle"
          fontSize="15" fontWeight="800" fill="white" fontFamily="Poppins,sans-serif">{rightLabel}</text>
      </svg>
      {/* Active pole label below */}
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: activeColor, letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        {direction === 'left' ? `→ ${activePole}-pole` : `${activePole}-pole ←`}
      </div>
    </div>
  );
};

// ─── Force Arrow SVG ──────────────────────────────────────────────────────────
const ForceArrows = ({ type }: { type: Answer | null }) => {
  if (!type) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: DS.gray2, letterSpacing: '0.05em' }}>VS</div>
        <div style={{ fontSize: 20 }}>⚡</div>
      </div>
    );
  }
  if (type === 'attract') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <svg viewBox="0 0 56 28" width="56" height="28">
          <defs>
            <marker id="arrowL" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M6,0 L0,3 L6,6 Z" fill={DS.green} />
            </marker>
            <marker id="arrowR" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={DS.green} />
            </marker>
          </defs>
          <line x1="26" y1="8" x2="6" y2="8" stroke={DS.green} strokeWidth="2.5" markerEnd="url(#arrowL)" />
          <line x1="30" y1="20" x2="50" y2="20" stroke={DS.green} strokeWidth="2.5" markerEnd="url(#arrowR)" />
        </svg>
        <div style={{ fontSize: 9, fontWeight: 700, color: DS.green }}>ATTRACT</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <svg viewBox="0 0 56 28" width="56" height="28">
        <defs>
          <marker id="arrowLR" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={DS.red} />
          </marker>
          <marker id="arrowRL" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M6,0 L0,3 L6,6 Z" fill={DS.red} />
          </marker>
        </defs>
        <line x1="8" y1="8" x2="26" y2="8" stroke={DS.red} strokeWidth="2.5" markerEnd="url(#arrowLR)" />
        <line x1="48" y1="20" x2="30" y2="20" stroke={DS.red} strokeWidth="2.5" markerEnd="url(#arrowRL)" />
      </svg>
      <div style={{ fontSize: 9, fontWeight: 700, color: DS.red }}>REPEL</div>
    </div>
  );
};

// ─── Star SVG ─────────────────────────────────────────────────────────────────
const StarSVG = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" width="28" height="28">
    <polygon
      points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
      fill={filled ? DS.orange : DS.gray3}
      stroke={filled ? DS.orange : DS.gray2}
      strokeWidth="1.5"
    />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const MagnetPredictionQuiz: React.FC<MagnetPredictionQuizProps> = ({ props: toolProps = {} }) => {
  const { additionalProps = {} } = toolProps;
  const scenarios      = additionalProps.scenarios         ?? DEFAULT_SCENARIOS;
  const title          = additionalProps.title             ?? 'Magnet Interaction Quiz';
  const subtitle       = additionalProps.subtitle          ?? 'Predict whether the magnets will attract or repel';
  const completionMsg  = additionalProps.completionMessage ?? 'Quiz Complete! 🧲';

  const [current,   setCurrent]   = useState(0);
  const [userAns,   setUserAns]   = useState<Answer | null>(null);
  const [answered,  setAnswered]  = useState(false);
  const [score,     setScore]     = useState(0);
  const [results,   setResults]   = useState<boolean[]>([]);
  const [showScore, setShowScore] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const s = document.createElement('style');
    s.innerHTML = KEYFRAMES;
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch (_) {} };
  }, []);

  const scenario  = scenarios[current];
  const isCorrect = userAns !== null ? userAns === scenario.correctAnswer : null;

  const handleAnswer = (ans: Answer) => {
    if (answered) return;
    const correct = ans === scenario.correctAnswer;
    setUserAns(ans);
    setAnswered(true);
    setAnimating(true);
    if (correct) setScore(s => s + 1);
    setResults(r => [...r, correct]);
    setTimeout(() => setAnimating(false), 800);
  };

  const handleNext = () => {
    if (current + 1 >= scenarios.length) {
      setShowScore(true);
    } else {
      setCurrent(c => c + 1);
      setUserAns(null);
      setAnswered(false);
      setAnimating(false);
    }
  };

  const handleRestart = () => {
    setCurrent(0); setUserAns(null); setAnswered(false);
    setScore(0); setResults([]); setShowScore(false); setAnimating(false);
  };

  const pct = scenarios.length > 0 ? Math.round((results.length / scenarios.length) * 100) : 0;

  const confetti = Array.from({ length: 22 }, (_, i) => ({
    id: i, color: [DS.purple, DS.orange, DS.green, DS.purpleLight, '#FC9145'][i % 5],
    left: `${3 + (i * 4.4) % 94}%`, delay: `${(i * 0.07).toFixed(2)}s`, size: 7 + (i % 4) * 3,
  }));

  return (
    <div style={{
      fontFamily: DS.font, width: '100%', background: DS.bg,
      padding: '14px', position: 'relative', overflowX: 'hidden',
    }}>
      {/* Blobs */}
      <div style={{ position:'fixed', top:-90, right:-90, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(193,193,234,0.28)0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:-70, left:-70, width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,rgba(252,145,69,0.16)0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      <div style={{ width: '100%', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 14, animation: 'fadeUp 0.5s ease' }}>
          <h1 style={{
            margin: '0 0 4px', fontSize: 'clamp(15px,5vw,22px)', fontWeight: 800, lineHeight: 1.15,
            background: DS.gradient, backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'gradAnim 4s ease infinite',
          }}>{title}</h1>
          <p style={{ margin: 0, color: DS.gray1, fontSize: 'clamp(12px,3vw,13px)', fontWeight: 500 }}>{subtitle}</p>

          {/* Progress dots */}
          {!showScore && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              {scenarios.map((_, i) => {
                const done   = i < results.length;
                const active = i === current;
                return (
                  <div key={i} style={{
                    width: active ? 28 : 10, height: 10, borderRadius: 99,
                    background: done
                      ? (results[i] ? DS.green : DS.red)
                      : active ? DS.gradient : DS.gray3,
                    transition: 'all 0.3s ease',
                    border: `1.5px solid ${done ? (results[i] ? DS.green : DS.red) : active ? DS.purple : DS.gray2}`,
                  }} />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Quiz Card ── */}
        {!showScore && (
          <div style={{
            background: DS.white, borderRadius: DS.radiusLg, width: '100%',
            padding: 'clamp(16px,4vw,28px)',
            boxShadow: DS.shadowMd, border: `1.5px solid ${DS.purpleLight}`,
            animation: 'fadeUp 0.4s ease',
          }}>

            {/* Round + score pill row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{
                background: DS.gradient, borderRadius: 99,
                padding: '3px 14px', fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                Scenario {current + 1} of {scenarios.length}
              </div>
              <div style={{
                background: DS.purpleFaded, borderRadius: 99,
                padding: '3px 14px', fontSize: 11, fontWeight: 700, color: DS.purple,
              }}>
                Score: {score}/{results.length}
              </div>
            </div>

            {/* Pole label badge */}
            <div style={{
              textAlign: 'center', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <PoleTag pole={scenario.leftPole} />
              <span style={{ fontSize: 13, fontWeight: 600, color: DS.gray2 }}>facing</span>
              <PoleTag pole={scenario.rightPole} />
            </div>

            {/* ── Magnet Scene ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-evenly',
              gap: 'clamp(4px,2vw,12px)', marginBottom: 16,
              padding: '16px 8px',
              background: DS.bg, borderRadius: DS.radius,
              border: `1.5px solid ${DS.gray3}`,
            }}>
              <MagnetSVG
                activePole={scenario.leftPole}
                direction="left"
                animate={animating && answered}
                animationType={answered ? scenario.correctAnswer : null}
              />

              <div style={{ flexShrink: 0 }}>
                <ForceArrows type={answered ? scenario.correctAnswer : null} />
              </div>

              <MagnetSVG
                activePole={scenario.rightPole}
                direction="right"
                animate={animating && answered}
                animationType={answered ? scenario.correctAnswer : null}
              />
            </div>

            {/* ── Answer Buttons ── */}
            {!answered ? (
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <AnswerBtn
                  label="🔵 Attract"
                  desc="Unlike poles pull together"
                  onClick={() => handleAnswer('attract')}
                  base={DS.green}
                />
                <AnswerBtn
                  label="🔴 Repel"
                  desc="Like poles push apart"
                  onClick={() => handleAnswer('repel')}
                  base={DS.red}
                />
              </div>
            ) : (
              /* ── Feedback ── */
              <div style={{ animation: 'popIn 0.4s ease' }}>
                {/* Result banner */}
                <div style={{
                  background: isCorrect ? DS.greenLight : DS.redLight,
                  border: `2px solid ${isCorrect ? DS.greenBorder : DS.redBorder}`,
                  borderRadius: DS.radiusSm, padding: '12px 16px',
                  marginBottom: 12, textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: 'clamp(14px,4vw,17px)', fontWeight: 800,
                    color: isCorrect ? DS.green : DS.red, marginBottom: 3,
                  }}>
                    {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DS.gray1, lineHeight: 1.45 }}>
                    {scenario.explanation}
                  </div>
                </div>

                {/* What the student picked vs correct */}
                {!isCorrect && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                    marginBottom: 12, flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: DS.gray2 }}>You chose:</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: DS.red, background: DS.redLight, borderRadius: 99, padding: '2px 10px', border: `1px solid ${DS.red}` }}>
                      {userAns === 'attract' ? '🔵 Attract' : '🔴 Repel'}
                    </span>
                    <span style={{ fontSize: 11, color: DS.gray2 }}>→</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: DS.gray2 }}>Correct:</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: DS.green, background: DS.greenLight, borderRadius: 99, padding: '2px 10px', border: `1px solid ${DS.green}` }}>
                      {scenario.correctAnswer === 'attract' ? '🔵 Attract' : '🔴 Repel'}
                    </span>
                  </div>
                )}

                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={handleNext}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: DS.gradient, color: '#fff', border: 'none',
                      borderRadius: 99, padding: '11px 30px', fontSize: 14, fontWeight: 700,
                      fontFamily: DS.font, cursor: 'pointer', boxShadow: DS.shadowMd,
                      transition: 'transform 0.2s', animation: 'pulsebtn 2.5s ease-in-out infinite',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    {current + 1 >= scenarios.length ? '🏆 See Score' : 'Next →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Score Screen ── */}
        {showScore && (
          <ScoreScreen
            score={score}
            total={scenarios.length}
            results={results}
            scenarios={scenarios}
            onRestart={handleRestart}
            confetti={confetti}
            completionMsg={completionMsg}
          />
        )}
      </div>
    </div>
  );
};

// ─── Pole Tag ─────────────────────────────────────────────────────────────────
const PoleTag = ({ pole }: { pole: Pole }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: '50%',
    background: poleBg(pole), border: `2px solid ${poleBorder(pole)}`,
    fontSize: 16, fontWeight: 800, color: poleColor(pole),
    fontFamily: DS.font,
  }}>
    {pole}
  </div>
);

// ─── Answer Button ────────────────────────────────────────────────────────────
const AnswerBtn = ({
  label, desc, onClick, base,
}: { label: string; desc: string; onClick: () => void; base: string }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        background: hov ? base : DS.white,
        color: hov ? '#fff' : base,
        border: `2px solid ${base}`,
        borderRadius: DS.radius, padding: '12px 20px',
        cursor: 'pointer', transition: 'all 0.2s ease',
        fontFamily: DS.font,
        flex: '1 1 0', minWidth: 120,
        boxShadow: hov ? DS.shadowMd : DS.shadow,
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <span style={{ fontSize: 'clamp(13px,4vw,16px)', fontWeight: 800 }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>{desc}</span>
    </button>
  );
};

// ─── Score Screen ─────────────────────────────────────────────────────────────
const ScoreScreen = ({
  score, total, results, scenarios, onRestart, confetti, completionMsg,
}: {
  score: number; total: number; results: boolean[];
  scenarios: Scenario[]; onRestart: () => void;
  confetti: { id:number; color:string; left:string; delay:string; size:number }[];
  completionMsg: string;
}) => {
  const perfect = score === total;
  const good    = score >= Math.ceil(total / 2);

  return (
    <div style={{ animation: 'fadeUp 0.5s ease', position: 'relative' }}>
      {perfect && confetti.map(c => (
        <div key={c.id} style={{
          position: 'fixed', top: 0, left: c.left, width: c.size, height: c.size,
          background: c.color, borderRadius: 3, pointerEvents: 'none', opacity: 0,
          animation: `confFall 2s ease ${c.delay} forwards`, zIndex: 999,
        }} />
      ))}

      <div style={{
        background: DS.white, borderRadius: DS.radiusLg, width: '100%',
        padding: 'clamp(18px,4vw,30px)',
        boxShadow: DS.shadowLg, border: `2px solid ${DS.purpleLight}`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 62, height: 62, borderRadius: '50%', margin: '0 auto 12px',
            background: DS.gradient, display: 'flex', alignItems: 'center', justifyContent: 'space-evenly',
            fontSize: 28, boxShadow: DS.shadowLg, animation: 'floatBob 2s ease-in-out infinite',
          }}>
            {perfect ? '🏆' : good ? '🌟' : '📚'}
          </div>
          <h2 style={{
            margin: '0 0 4px', fontSize: 'clamp(15px,5vw,20px)', fontWeight: 800,
            background: DS.gradient, WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>{completionMsg}</h2>

          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, margin: '8px 0' }}>
            {Array.from({ length: total }, (_, i) => <StarSVG key={i} filled={i < score} />)}
          </div>

          <div style={{ fontSize: 'clamp(26px,7vw,38px)', fontWeight: 800, color: DS.purple, lineHeight: 1 }}>
            {score}<span style={{ fontSize: '0.5em', color: DS.gray2, fontWeight: 600 }}>/{total}</span>
          </div>
          <div style={{ fontSize: 12, color: DS.gray1, fontWeight: 500, marginTop: 4 }}>
            {perfect ? 'Perfect score!' : good ? 'Well done!' : 'Keep practising!'}
          </div>
        </div>

        {/* Per-scenario breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: DS.purple, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
            Round Summary
          </div>
          {scenarios.map((s, i) => {
            const ok = results[i];
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: ok ? DS.greenLight : DS.redLight,
                border: `1.5px solid ${ok ? DS.greenBorder : DS.redBorder}`,
                borderRadius: DS.radiusSm, padding: '9px 12px',
                animation: `fadeUp 0.35s ease ${i * 0.07}s both`,
              }}>
                {/* Pole pair chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <PoleTag pole={s.leftPole} />
                  <span style={{ fontSize: 11, color: DS.gray2 }}>+</span>
                  <PoleTag pole={s.rightPole} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ok ? DS.green : DS.red }}>
                    {s.correctAnswer === 'attract' ? '🔵 Attract' : '🔴 Repel'}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: DS.gray1, lineHeight: 1.3 }}>
                    {s.explanation}
                  </div>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: ok ? DS.green : DS.red,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-evenly',
                  fontSize: 12, color: '#fff', fontWeight: 800,
                }}>
                  {ok ? '✓' : '✗'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Golden rule */}
        <div style={{
          background: DS.purpleFaded, border: `1.5px solid ${DS.purpleLight}`,
          borderRadius: DS.radiusSm, padding: '10px 13px', marginBottom: 18,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🧲</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: DS.purple, marginBottom: 4 }}>
              The Golden Rule of Magnets
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[
                { combo: 'N–N or S–S', rule: 'Like poles → Repel', color: DS.red },
                { combo: 'N–S or S–N', rule: 'Unlike poles → Attract', color: DS.green },
              ].map(item => (
                <div key={item.combo} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{
                    background: item.color === DS.red ? DS.redLight : DS.greenLight,
                    border: `1px solid ${item.color}`,
                    borderRadius: 99, padding: '1px 9px',
                    fontSize: 11, fontWeight: 800, color: item.color, flexShrink: 0,
                  }}>{item.combo}</span>
                  <span style={{ fontWeight: 600, color: DS.gray1 }}>{item.rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onRestart}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: DS.gradient, color: '#fff', border: 'none',
              borderRadius: 99, padding: '11px 28px', fontSize: 13, fontWeight: 700,
              fontFamily: DS.font, cursor: 'pointer', boxShadow: DS.shadowMd,
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default MagnetPredictionQuiz;