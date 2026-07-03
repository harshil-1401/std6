import React, { useState, useEffect, useRef } from 'react';

// ─── Design Tokens — Singularity Design System ────────────────────────────────
const DS = {
  purple:      '#533086',
  purpleHov:   '#3d2268',
  purpleLight: '#C1C1EA',
  purpleFaded: '#ede9f6',
  orange:      '#FC9145',
  orangeHov:   '#e07030',
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

@keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn   { from{opacity:0} to{opacity:1} }
@keyframes popIn    { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.05);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes modalIn  { 0%{transform:scale(0.75);opacity:0} 65%{transform:scale(1.03);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes wobble   { 0%{transform:rotate(0deg)} 20%{transform:rotate(-8deg)} 40%{transform:rotate(8deg)} 60%{transform:rotate(-5deg)} 80%{transform:rotate(4deg)} 100%{transform:rotate(0deg)} }
@keyframes slideToward { from{transform:translateX(0)} to{transform:translateX(-18px)} }
@keyframes slideAway   { from{transform:translateX(0)} to{transform:translateX(18px)} }
@keyframes gradAnim { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes pulsebtn { 0%,100%{box-shadow:0 4px 14px rgba(83,48,134,0.35)} 50%{box-shadow:0 4px 22px rgba(252,145,69,0.5)} }
@keyframes fall     { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(120px) rotate(400deg);opacity:0} }
@keyframes floatBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes needleSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes magnetPulse { 0%,100%{filter:drop-shadow(0 0 4px rgba(83,48,134,0.3))} 50%{filter:drop-shadow(0 0 12px rgba(252,145,69,0.6))} }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Round {
  id: number;
  magnetPole: 'N' | 'S';
  needlePole: 'N' | 'S';
  correctAnswer: 'toward' | 'away';
  explanation: string;
}

interface CompassPredictionQuizProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: {
      rounds?: Round[];
      title?: string;
      subtitle?: string;
    };
  };
  setStepDetails?: (d: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─── Default Rounds ───────────────────────────────────────────────────────────
const DEFAULT_ROUNDS: Round[] = [
  {
    id: 1,
    magnetPole: 'N',
    needlePole: 'N',
    correctAnswer: 'away',
    explanation: 'N–N are like poles — they repel, so the needle moves away.',
  },
  {
    id: 2,
    magnetPole: 'N',
    needlePole: 'S',
    correctAnswer: 'toward',
    explanation: 'N–S are unlike poles — they attract, so the needle moves towards the magnet.',
  },
  {
    id: 3,
    magnetPole: 'S',
    needlePole: 'N',
    correctAnswer: 'toward',
    explanation: 'S–N are unlike poles — they attract, so the needle moves towards the magnet.',
  },
  {
    id: 4,
    magnetPole: 'S',
    needlePole: 'S',
    correctAnswer: 'away',
    explanation: 'S–S are like poles — they repel, so the needle moves away.',
  },
];

// ─── Inline SVG: Compass ──────────────────────────────────────────────────────
const CompassSVG = ({
  needlePole,
  answered,
  correct,
  correctAnswer,
  userAnswer,
}: {
  needlePole: 'N' | 'S';
  answered: boolean;
  correct: boolean | null;
  correctAnswer: 'toward' | 'away';
  userAnswer: 'toward' | 'away' | null;
}) => {
  const needleColor = answered
    ? correct
      ? '#16a34a'
      : '#dc2626'
    : '#533086';

  // needle rotation offset based on answer animation
  let translateX = 0;
  if (answered) {
    const moved = correctAnswer === 'toward' ? -14 : 14;
    translateX = moved;
  }

  return (
    <svg
      viewBox="0 0 160 160"
      width="100%"
      style={{ maxWidth: 160, display: 'block', margin: '0 auto' }}
    >
      {/* Outer ring */}
      <circle cx="80" cy="80" r="74" fill="#F5F5F5" stroke={DS.purpleLight} strokeWidth="3" />
      <circle cx="80" cy="80" r="68" fill="white" stroke={DS.gray3} strokeWidth="1" />

      {/* Cardinal directions */}
      {[
        { label: 'N', x: 80, y: 18 },
        { label: 'S', x: 80, y: 148 },
        { label: 'E', x: 148, y: 85 },
        { label: 'W', x: 14, y: 85 },
      ].map(d => (
        <text
          key={d.label}
          x={d.x} y={d.y}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="13" fontWeight="700" fontFamily="Poppins, sans-serif"
          fill={d.label === 'N' || d.label === 'S' ? DS.purple : DS.gray2}
        >
          {d.label}
        </text>
      ))}

      {/* Tick marks */}
      {Array.from({ length: 36 }, (_, i) => {
        const angle = (i * 10 * Math.PI) / 180;
        const isMajor = i % 9 === 0;
        const r1 = isMajor ? 58 : 62;
        const r2 = 66;
        return (
          <line
            key={i}
            x1={80 + r1 * Math.sin(angle)} y1={80 - r1 * Math.cos(angle)}
            x2={80 + r2 * Math.sin(angle)} y2={80 - r2 * Math.cos(angle)}
            stroke={DS.gray2} strokeWidth={isMajor ? 1.5 : 0.8}
          />
        );
      })}

      {/* Needle group — translated when answered */}
      <g
        transform={`translate(${answered ? translateX : 0}, 0)`}
        style={{
          transition: answered ? 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        }}
      >
        {/* North half of needle (red) */}
        <polygon
          points="80,34 74,80 80,76 86,80"
          fill={needleColor}
          opacity="0.9"
        />
        {/* South half (gray) */}
        <polygon
          points="80,126 74,80 80,84 86,80"
          fill={DS.gray2}
        />
        {/* Center pivot */}
        <circle cx="80" cy="80" r="5" fill="white" stroke={needleColor} strokeWidth="2" />
        <circle cx="80" cy="80" r="2" fill={needleColor} />

        {/* Needle pole label */}
        <text
          x="80" y="42"
          textAnchor="middle" dominantBaseline="middle"
          fontSize="9" fontWeight="800"
          fontFamily="Poppins, sans-serif"
          fill="white"
        >
          {needlePole}
        </text>
      </g>
    </svg>
  );
};

// ─── Inline SVG: Bar Magnet ───────────────────────────────────────────────────
const MagnetSVG = ({
  pole,
  side,
}: {
  pole: 'N' | 'S';
  side: 'left' | 'right';
}) => {
  const isNorth = pole === 'N';
  // The approaching pole is on the inner side (facing the compass)
  const innerColor = isNorth ? '#e53e3e' : '#3182ce';
  const outerColor = isNorth ? '#3182ce' : '#e53e3e';
  const innerLabel = pole;
  const outerLabel = pole === 'N' ? 'S' : 'N';

  // For right-approaching magnet, inner side is left; for left-approaching, inner is right
  const leftColor  = side === 'right' ? innerColor : outerColor;
  const rightColor = side === 'right' ? outerColor : innerColor;
  const leftLabel  = side === 'right' ? innerLabel : outerLabel;
  const rightLabel = side === 'right' ? outerLabel : innerLabel;

  return (
    <svg viewBox="0 0 120 50" width="100%" style={{ maxWidth: 120, display: 'block' }}>
      {/* Shadow */}
      <rect x="4" y="6" width="112" height="38" rx="8" fill="rgba(0,0,0,0.08)" />
      {/* Left half */}
      <rect x="2" y="4" width="58" height="38" rx="8" fill={leftColor} />
      {/* Right half */}
      <rect x="60" y="4" width="58" height="38" rx="8" fill={rightColor} />
      {/* Divider line */}
      <line x1="60" y1="4" x2="60" y2="42" stroke="white" strokeWidth="2" />
      {/* Labels */}
      <text x="31" y="23" textAnchor="middle" dominantBaseline="middle"
        fontSize="14" fontWeight="800" fill="white" fontFamily="Poppins,sans-serif">{leftLabel}</text>
      <text x="89" y="23" textAnchor="middle" dominantBaseline="middle"
        fontSize="14" fontWeight="800" fill="white" fontFamily="Poppins,sans-serif">{rightLabel}</text>
    </svg>
  );
};

// ─── Arrow SVG ────────────────────────────────────────────────────────────────
const ArrowSVG = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg viewBox="0 0 40 20" width="40" height="20">
    {direction === 'right' ? (
      <>
        <line x1="0" y1="10" x2="32" y2="10" stroke={DS.orange} strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="32,4 40,10 32,16" fill={DS.orange} />
      </>
    ) : (
      <>
        <line x1="40" y1="10" x2="8" y2="10" stroke={DS.orange} strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="8,4 0,10 8,16" fill={DS.orange} />
      </>
    )}
  </svg>
);

// ─── Star SVG (for score) ─────────────────────────────────────────────────────
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
const CompassPredictionQuiz: React.FC<CompassPredictionQuizProps> = ({ props: toolProps = {} }) => {
  const { additionalProps = {} } = toolProps;
  const rounds = additionalProps.rounds ?? DEFAULT_ROUNDS;
  const title  = additionalProps.title  ?? 'Compass Prediction Quiz';
  const subtitle = additionalProps.subtitle ?? 'Predict how the compass needle will react!';

  const [currentRound, setCurrentRound] = useState(0);
  const [userAnswer,   setUserAnswer]   = useState<'toward' | 'away' | null>(null);
  const [answered,     setAnswered]      = useState(false);
  const [score,        setScore]         = useState(0);
  const [results,      setResults]       = useState<boolean[]>([]);
  const [showScore,    setShowScore]     = useState(false);

  // Inject keyframes
  useEffect(() => {
    const s = document.createElement('style');
    s.innerHTML = KEYFRAMES;
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch (_) {} };
  }, []);

  const round = rounds[currentRound];
  const isCorrect = userAnswer !== null ? userAnswer === round.correctAnswer : null;

  const handleAnswer = (answer: 'toward' | 'away') => {
    if (answered) return;
    const correct = answer === round.correctAnswer;
    setUserAnswer(answer);
    setAnswered(true);
    if (correct) setScore(s => s + 1);
    setResults(r => [...r, correct]);
  };

  const handleNext = () => {
    if (currentRound + 1 >= rounds.length) {
      setShowScore(true);
    } else {
      setCurrentRound(c => c + 1);
      setUserAnswer(null);
      setAnswered(false);
    }
  };

  const handleRestart = () => {
    setCurrentRound(0);
    setUserAnswer(null);
    setAnswered(false);
    setScore(0);
    setResults([]);
    setShowScore(false);
  };

  const confetti = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: [DS.purple, DS.orange, '#22c55e', DS.purpleLight, '#FC9145'][i % 5],
    left: `${3 + (i * 4.8) % 94}%`,
    delay: `${(i * 0.07).toFixed(2)}s`,
    size: 7 + (i % 4) * 3,
  }));

  // Magnet approaches from the right side (facing the needle pole)
  // The facing pole of the magnet is magnetPole
  // The facing pole of the needle is needlePole
  const magnetSide = 'right'; // magnet comes from the right

  return (
    <div style={{
      fontFamily: DS.font, minHeight: '100vh', background: DS.bg,
      padding: '20px 16px', position: 'relative', overflowX: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{ position:'fixed', top:-90, right:-90, width:260, height:260, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(193,193,234,0.3)0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:-70, left:-70, width:240, height:240, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(252,145,69,0.18)0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 24, animation: 'fadeUp 0.5s ease' }}>
          <h1 style={{
            margin: '0 0 6px', fontSize: 'clamp(17px,5vw,24px)', fontWeight: 800, lineHeight: 1.15,
            background: DS.gradient, backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'gradAnim 4s ease infinite',
          }}>{title}</h1>
          <p style={{ margin: 0, color: DS.gray1, fontSize: 'clamp(12px,3vw,14px)', fontWeight: 500 }}>
            {subtitle}
          </p>

          {/* Round progress dots */}
          {!showScore && (
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:14 }}>
              {rounds.map((_, i) => {
                const done = i < results.length;
                const active = i === currentRound;
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

        {!showScore ? (
          /* ── Quiz Card ── */
          <div style={{
            background: DS.white, borderRadius: DS.radiusLg,
            padding: 'clamp(18px,4vw,32px)',
            boxShadow: DS.shadowMd, border: `1.5px solid ${DS.purpleLight}`,
            animation: 'fadeUp 0.45s ease',
          }}>

            {/* Round label */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div style={{
                background: DS.gradient, borderRadius: 99,
                padding: '3px 14px', fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                Round {currentRound + 1} of {rounds.length}
              </div>
              <div style={{
                background: DS.purpleFaded, borderRadius: 99,
                padding: '3px 14px', fontSize: 11, fontWeight: 700, color: DS.purple,
              }}>
                Score: {score}/{results.length}
              </div>
            </div>

            {/* Scenario label */}
            <div style={{
              textAlign: 'center', marginBottom: 18,
              background: DS.orangeLight, border: `1.5px solid ${DS.orange}`,
              borderRadius: DS.radiusSm, padding: '10px 14px',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3100' }}>
                Magnet's <strong style={{ color: DS.purple }}>{round.magnetPole}-pole</strong> approaches the needle's&nbsp;
                <strong style={{ color: DS.purple }}>{round.needlePole}-pole</strong>
              </span>
            </div>

            {/* Visual scene */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(8px,3vw,20px)', marginBottom: 20,
              flexWrap: 'nowrap',
            }}>
              {/* Compass */}
              <div style={{ flex: '0 0 auto', width: 'clamp(110px,28vw,150px)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: DS.gray2, textAlign: 'center', marginBottom: 4 }}>
                  COMPASS NEEDLE
                </div>
                <CompassSVG
                  needlePole={round.needlePole}
                  answered={answered}
                  correct={isCorrect}
                  correctAnswer={round.correctAnswer}
                  userAnswer={userAnswer}
                />
              </div>

              {/* Arrow */}
              <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: DS.orange, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  approaching
                </div>
                <ArrowSVG direction="left" />
              </div>

              {/* Magnet */}
              <div style={{ flex: '0 0 auto', width: 'clamp(90px,24vw,120px)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: DS.gray2, textAlign: 'center', marginBottom: 4 }}>
                  BAR MAGNET
                </div>
                <MagnetSVG pole={round.magnetPole} side={magnetSide} />
                <div style={{ fontSize: 10, fontWeight: 700, color: DS.purple, textAlign: 'center', marginTop: 4 }}>
                  ← {round.magnetPole}-pole faces needle
                </div>
              </div>
            </div>

            {/* Answer buttons */}
            {!answered ? (
              <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: DS.gray1, textAlign: 'center' }}>
                  What will the compass needle do?
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <AnswerButton
                    label="Needle moves towards magnet"
                    emoji="➡️"
                    onClick={() => handleAnswer('toward')}
                    color={DS.purple}
                    hoverColor={DS.purpleHov}
                  />
                  <AnswerButton
                    label="Needle moves away from magnet"
                    emoji="⬅️"
                    onClick={() => handleAnswer('away')}
                    color={DS.orange}
                    hoverColor={DS.orangeHov}
                  />
                </div>
              </div>
            ) : (
              /* Feedback */
              <div style={{ animation: 'popIn 0.4s ease' }}>
                {/* Result banner */}
                <div style={{
                  background: isCorrect ? DS.greenLight : DS.redLight,
                  border: `2px solid ${isCorrect ? DS.greenBorder : DS.redBorder}`,
                  borderRadius: DS.radiusSm, padding: '12px 16px',
                  marginBottom: 14, textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: 'clamp(15px,4vw,18px)', fontWeight: 800,
                    color: isCorrect ? DS.green : DS.red, marginBottom: 4,
                  }}>
                    {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DS.gray1, lineHeight: 1.4 }}>
                    {round.explanation}
                  </div>
                </div>

                {/* Pole rule chip */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, marginBottom: 16,
                }}>
                  <PoleChip poleA={round.magnetPole} poleB={round.needlePole} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: DS.gray1 }}>→</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: round.correctAnswer === 'toward' ? DS.green : DS.red,
                    background: round.correctAnswer === 'toward' ? DS.greenLight : DS.redLight,
                    borderRadius: 99, padding: '3px 12px',
                    border: `1.5px solid ${round.correctAnswer === 'toward' ? DS.greenBorder : DS.redBorder}`,
                  }}>
                    {round.correctAnswer === 'toward' ? 'Attract (move towards)' : 'Repel (move away)'}
                  </span>
                </div>

                {/* Next button */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={handleNext}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: DS.gradient, color: '#fff', border: 'none',
                      borderRadius: 99, padding: '11px 32px', fontSize: 14, fontWeight: 700,
                      fontFamily: DS.font, cursor: 'pointer', boxShadow: DS.shadowMd,
                      transition: 'transform 0.2s',
                      animation: 'pulsebtn 2.5s ease-in-out infinite',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    {currentRound + 1 >= rounds.length ? '🏆 See Score' : 'Next Round →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Score Screen ── */
          <ScoreScreen
            score={score}
            total={rounds.length}
            results={results}
            rounds={rounds}
            onRestart={handleRestart}
            confetti={confetti}
          />
        )}
      </div>
    </div>
  );
};

// ─── Answer Button ────────────────────────────────────────────────────────────
const AnswerButton = ({
  label, emoji, onClick, color, hoverColor,
}: {
  label: string; emoji: string; onClick: () => void;
  color: string; hoverColor: string;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: hovered ? hoverColor : color,
        color: '#fff', border: 'none', borderRadius: 99,
        padding: '11px 20px', fontSize: 'clamp(12px,3vw,13px)', fontWeight: 700,
        fontFamily: DS.font, cursor: 'pointer',
        boxShadow: DS.shadowMd, transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        flex: '1 1 auto', minWidth: 'clamp(140px,40vw,200px)',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: 16 }}>{emoji}</span>
      {label}
    </button>
  );
};

// ─── Pole Chip ────────────────────────────────────────────────────────────────
const PoleChip = ({ poleA, poleB }: { poleA: 'N' | 'S'; poleB: 'N' | 'S' }) => {
  const isLike = poleA === poleB;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: isLike ? DS.redLight : DS.greenLight,
      border: `1.5px solid ${isLike ? DS.red : DS.green}`,
      borderRadius: 99, padding: '3px 12px',
    }}>
      <span style={{
        fontSize: 12, fontWeight: 800,
        color: poleA === 'N' ? '#dc2626' : '#3182ce',
      }}>{poleA}</span>
      <span style={{ fontSize: 11, color: DS.gray2 }}>–</span>
      <span style={{
        fontSize: 12, fontWeight: 800,
        color: poleB === 'N' ? '#dc2626' : '#3182ce',
      }}>{poleB}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: DS.gray1 }}>
        &nbsp;{isLike ? '(like)' : '(unlike)'}
      </span>
    </div>
  );
};

// ─── Score Screen ─────────────────────────────────────────────────────────────
const ScoreScreen = ({
  score, total, results, rounds, onRestart, confetti,
}: {
  score: number; total: number; results: boolean[];
  rounds: Round[]; onRestart: () => void;
  confetti: { id: number; color: string; left: string; delay: string; size: number }[];
}) => {
  const perfect = score === total;
  const good    = score >= total / 2;

  return (
    <div style={{ animation: 'fadeUp 0.5s ease', position: 'relative' }}>
      {/* Confetti */}
      {perfect && confetti.map(c => (
        <div key={c.id} style={{
          position: 'fixed', top: 0, left: c.left,
          width: c.size, height: c.size,
          background: c.color, borderRadius: 3, pointerEvents: 'none', opacity: 0,
          animation: `fall 2s ease ${c.delay} forwards`,
          zIndex: 999,
        }} />
      ))}

      <div style={{
        background: DS.white, borderRadius: DS.radiusLg,
        padding: 'clamp(20px,4vw,36px)',
        boxShadow: DS.shadowLg, border: `2px solid ${DS.purpleLight}`,
      }}>
        {/* Trophy */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 14px',
            background: DS.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, boxShadow: DS.shadowLg, animation: 'floatBob 2s ease-in-out infinite',
          }}>
            {perfect ? '🏆' : good ? '🌟' : '📚'}
          </div>
          <h2 style={{
            margin: '0 0 4px', fontSize: 'clamp(18px,5vw,24px)', fontWeight: 800,
            background: DS.gradient, WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {perfect ? 'Perfect Score!' : good ? 'Good Work!' : 'Keep Practising!'}
          </h2>

          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, margin: '10px 0' }}>
            {Array.from({ length: total }, (_, i) => (
              <StarSVG key={i} filled={i < score} />
            ))}
          </div>

          <div style={{
            fontSize: 'clamp(28px,8vw,42px)', fontWeight: 800, color: DS.purple,
            lineHeight: 1,
          }}>
            {score}<span style={{ fontSize: '0.5em', color: DS.gray2, fontWeight: 600 }}>/{total}</span>
          </div>
        </div>

        {/* Per-round results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: DS.purple, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Round Summary
          </div>
          {rounds.map((r, i) => {
            const res = results[i];
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: res ? DS.greenLight : DS.redLight,
                border: `1.5px solid ${res ? DS.greenBorder : DS.redBorder}`,
                borderRadius: DS.radiusSm, padding: '10px 14px',
                animation: `fadeUp 0.35s ease ${i * 0.08}s both`,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: res ? DS.green : DS.red,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#fff', fontWeight: 800,
                }}>
                  {res ? '✓' : '✗'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    color: res ? DS.green : DS.red, marginBottom: 2,
                  }}>
                    Round {r.id}: {r.magnetPole}–{r.needlePole} poles
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: DS.gray1, lineHeight: 1.4 }}>
                    {r.explanation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rule summary card */}
        <div style={{
          background: DS.purpleFaded, border: `1.5px solid ${DS.purpleLight}`,
          borderRadius: DS.radiusSm, padding: '14px 16px', marginBottom: 22,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: DS.purple, marginBottom: 8 }}>
            🧲 The Golden Rule of Magnets
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { combo: 'N–N', rule: 'Like poles → Repel → Needle moves AWAY', color: DS.red },
              { combo: 'S–S', rule: 'Like poles → Repel → Needle moves AWAY', color: DS.red },
              { combo: 'N–S', rule: 'Unlike poles → Attract → Needle moves TOWARDS', color: DS.green },
              { combo: 'S–N', rule: 'Unlike poles → Attract → Needle moves TOWARDS', color: DS.green },
            ].map(item => (
              <div key={item.combo} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, fontWeight: 500, color: DS.gray1,
              }}>
                <span style={{
                  background: item.color === DS.red ? DS.redLight : DS.greenLight,
                  border: `1px solid ${item.color}`,
                  borderRadius: 99, padding: '1px 8px',
                  fontSize: 11, fontWeight: 800, color: item.color, flexShrink: 0,
                }}>{item.combo}</span>
                <span>{item.rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Restart */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onRestart}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: DS.gradient, color: '#fff', border: 'none',
              borderRadius: 99, padding: '12px 32px', fontSize: 14, fontWeight: 700,
              fontFamily: DS.font, cursor: 'pointer', boxShadow: DS.shadowMd,
              transition: 'transform 0.2s',
              animation: 'pulsebtn 2.5s ease-in-out infinite',
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

export default CompassPredictionQuiz;