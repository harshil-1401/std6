import React, { useState, useEffect } from 'react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const DS = {
  purple:      '#533086',
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
  radius:      '12px',
  radiusSm:    '8px',
  radiusLg:    '18px',
  shadow:      '0 2px 10px rgba(83,48,134,0.09)',
  shadowMd:    '0 5px 20px rgba(83,48,134,0.15)',
  shadowLg:    '0 14px 40px rgba(83,48,134,0.20)',
};

const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; }
@keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes popIn    { 0%{transform:scale(0.85);opacity:0} 55%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
@keyframes gradAnim { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes pulsebtn { 0%,100%{box-shadow:0 3px 12px rgba(83,48,134,0.3)} 50%{box-shadow:0 3px 18px rgba(252,145,69,0.45)} }
@keyframes floatBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes confFall { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(120px) rotate(400deg);opacity:0} }
@keyframes arrowIn  { from{opacity:0;transform:scaleX(0)} to{opacity:1;transform:scaleX(1)} }
@keyframes slideIn         { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes magnetSlideRight { 0%{transform:translateX(0)} 100%{transform:translateX(12px)} }
@keyframes magnetSlideLeft  { 0%{transform:translateX(0)} 100%{transform:translateX(-12px)} }
@keyframes attractKnown   { 0%{transform:translateX(0)} 60%{transform:translateX(18px)} 80%{transform:translateX(14px)} 100%{transform:translateX(16px)} }
@keyframes repelKnown     { 0%{transform:translateX(0)} 60%{transform:translateX(-18px)} 80%{transform:translateX(-14px)} 100%{transform:translateX(-16px)} }
@keyframes attractMystery { 0%{transform:translateX(0)} 60%{transform:translateX(-18px)} 80%{transform:translateX(-14px)} 100%{transform:translateX(-16px)} }
@keyframes repelMystery   { 0%{transform:translateX(0)} 60%{transform:translateX(18px)} 80%{transform:translateX(14px)} 100%{transform:translateX(16px)} }
@keyframes rotateMagnet  { 0%{transform:rotate(0deg)} 100%{transform:rotate(180deg)} }
@keyframes testPop  { 0%{transform:scale(1)} 40%{transform:scale(1.08)} 70%{transform:scale(0.97)} 100%{transform:scale(1)} }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
type TestResult = 'attract' | 'repel' | null;

interface Round {
  id: number;
  mysteryLabel: string;
  mysteryEmoji: string;
  isMagnet: boolean;
  mysteryEndPole?: 'N' | 'S';
  conclusionLabel: string;
  conclusionDetail: string;
}

interface MysteryBarToolProps {
  props?: {
    additionalProps?: {
      rounds?: Round[];
      title?: string;
      subtitle?: string;
      summaryRule?: string;
      completionMessage?: string;
    };
  };
}

// ─── Default Data ─────────────────────────────────────────────────────────────
const DEFAULT_ROUNDS: Round[] = [
  {
    id: 1, mysteryLabel: 'Mystery Bar A', mysteryEmoji: '🔩', isMagnet: false,
    conclusionLabel: 'This is iron — not a magnet',
    conclusionDetail: 'Both poles attracted the bar. No repulsion was observed, so it must be iron, not a magnet.',
  },
  {
    id: 2, mysteryLabel: 'Mystery Bar B', mysteryEmoji: '🧲', isMagnet: true, mysteryEndPole: 'N',
    conclusionLabel: 'This is a magnet — repulsion detected!',
    conclusionDetail: 'One pole attracted and the other repelled. Repulsion proves this bar is a magnet.',
  },
  {
    id: 3, mysteryLabel: 'Mystery Bar C', mysteryEmoji: '🔩', isMagnet: false,
    conclusionLabel: 'This is iron — not a magnet',
    conclusionDetail: 'Both poles attracted the bar again. Without repulsion, we cannot call it a magnet.',
  },
];

function getResult(knownPole: 'N' | 'S', round: Round): 'attract' | 'repel' {
  if (!round.isMagnet) return 'attract';
  return knownPole === (round.mysteryEndPole ?? 'N') ? 'repel' : 'attract';
}

// ─── Bar Magnet SVG (known magnet) ───────────────────────────────────────────
const KnownMagnet = ({ highlightPole }: { highlightPole?: 'N' | 'S' }) => (
  <svg viewBox="0 0 140 48" width="100%" style={{ maxWidth: 140, display: 'block' }}>
    {/* Shadow */}
    <rect x="3" y="7" width="134" height="36" rx="9" fill="rgba(0,0,0,0.08)" />
    {/* S half */}
    <rect x="2" y="4" width="67" height="36" rx="9"
      fill={highlightPole === 'S' ? '#1d4ed8' : '#3182ce'}
      opacity={highlightPole === 'N' ? 0.55 : 1}
    />
    {/* N half */}
    <rect x="69" y="4" width="69" height="36" rx="9"
      fill={highlightPole === 'N' ? '#b91c1c' : '#e53e3e'}
      opacity={highlightPole === 'S' ? 0.55 : 1}
    />
    {/* Divider */}
    <line x1="70" y1="4" x2="70" y2="40" stroke="white" strokeWidth="2.5" />
    {/* Shine */}
    <rect x="6" y="8" width="55" height="9" rx="4" fill="rgba(255,255,255,0.18)" />
    <rect x="74" y="8" width="55" height="9" rx="4" fill="rgba(255,255,255,0.18)" />
    {/* Labels */}
    <text x="35" y="24" textAnchor="middle" dominantBaseline="middle"
      fontSize="15" fontWeight="800" fill="white" fontFamily="Poppins,sans-serif">S</text>
    <text x="105" y="24" textAnchor="middle" dominantBaseline="middle"
      fontSize="15" fontWeight="800" fill="white" fontFamily="Poppins,sans-serif">N</text>
    {/* Glow ring on active pole */}
    {highlightPole === 'N' && (
      <rect x="69" y="4" width="69" height="36" rx="9" fill="none"
        stroke="#fbbf24" strokeWidth="2.5" opacity="0.8" />
    )}
    {highlightPole === 'S' && (
      <rect x="2" y="4" width="67" height="36" rx="9" fill="none"
        stroke="#fbbf24" strokeWidth="2.5" opacity="0.8" />
    )}
  </svg>
);

// ─── Mystery Bar SVG ──────────────────────────────────────────────────────────
const MysteryBarSVG = ({ revealed, isMagnet, mysteryEndPole }: {
  revealed: boolean; isMagnet: boolean; mysteryEndPole?: 'N' | 'S';
}) => {
  const lColor = isMagnet
    ? (mysteryEndPole === 'N' ? '#e53e3e' : '#3182ce')
    : '#6b7280';
  const rColor = isMagnet
    ? (mysteryEndPole === 'N' ? '#3182ce' : '#e53e3e')
    : '#6b7280';
  const lLabel = isMagnet ? mysteryEndPole ?? 'N' : '?';
  const rLabel = isMagnet ? (mysteryEndPole === 'N' ? 'S' : 'N') : '?';

  return (
    <svg viewBox="0 0 140 48" width="100%" style={{ maxWidth: 140, display: 'block' }}>
      <rect x="3" y="7" width="134" height="36" rx="9" fill="rgba(0,0,0,0.07)" />
      {revealed ? (
        <>
          <rect x="2" y="4" width="67" height="36" rx="9" fill={lColor} />
          <rect x="69" y="4" width="69" height="36" rx="9" fill={rColor} />
          <line x1="70" y1="4" x2="70" y2="40" stroke="white" strokeWidth="2.5" />
          <rect x="6" y="8" width="55" height="9" rx="4" fill="rgba(255,255,255,0.18)" />
          <rect x="74" y="8" width="55" height="9" rx="4" fill="rgba(255,255,255,0.18)" />
          <text x="35" y="24" textAnchor="middle" dominantBaseline="middle"
            fontSize="15" fontWeight="800" fill="white" fontFamily="Poppins,sans-serif">{lLabel}</text>
          <text x="105" y="24" textAnchor="middle" dominantBaseline="middle"
            fontSize="15" fontWeight="800" fill="white" fontFamily="Poppins,sans-serif">{rLabel}</text>
        </>
      ) : (
        <>
          <rect x="2" y="4" width="134" height="36" rx="9" fill="#6b7280" />
          <rect x="6" y="8" width="124" height="9" rx="4" fill="rgba(255,255,255,0.12)" />
          



        </>
      )}
    </svg>
  );
};

// ─── Test Card ────────────────────────────────────────────────────────────────
const TestCard = ({
  pole, result, onTest, disabled,
}: {
  pole: 'N' | 'S'; result: TestResult;
  onTest: () => void; disabled: boolean;
}) => {
  const [hov, setHov] = useState(false);
  const poleColor = pole === 'N' ? '#e53e3e' : '#3182ce';
  const poleBg    = pole === 'N' ? '#fff5f5' : '#eff6ff';

  const cardBg = result === 'attract'
    ? DS.greenLight
    : result === 'repel'
    ? DS.redLight
    : hov && !disabled ? DS.purpleFaded : DS.white;

  const cardBorder = result === 'attract'
    ? `2px solid ${DS.green}`
    : result === 'repel'
    ? `2px solid ${DS.red}`
    : hov && !disabled ? `2px solid ${DS.purple}` : `2px solid ${DS.purpleLight}`;

  return (
    <div
      onClick={!result && !disabled ? onTest : undefined}
      onMouseEnter={() => { if (!result && !disabled) setHov(true); }}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: '1 1 0', borderRadius: DS.radius,
        background: cardBg, border: cardBorder,
        padding: '14px 10px',
        cursor: (!result && !disabled) ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: hov && !result && !disabled ? DS.shadowMd : DS.shadow,
        transform: hov && !result && !disabled ? 'translateY(-2px)' : 'translateY(0)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        animation: result ? 'testPop 0.4s ease' : undefined,
      }}
    >
      {/* Pole circle */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: result ? (result === 'attract' ? DS.greenLight : DS.redLight) : poleBg,
        border: `2.5px solid ${result ? (result === 'attract' ? DS.green : DS.red) : poleColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800,
        color: result ? (result === 'attract' ? DS.green : DS.red) : poleColor,
      }}>
        {result === 'attract' ? '✓' : result === 'repel' ? '✗' : pole}
      </div>

      {/* Label */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: result ? (result === 'attract' ? DS.green : DS.red) : DS.gray1,
        }}>
          {result === null
            ? `Test ${pole}-pole`
            : result === 'attract'
            ? `${pole}-pole: Attracted`
            : `${pole}-pole: Repelled`}
        </div>
        {!result && !disabled && (
          <div style={{ fontSize: 10, color: DS.gray2, marginTop: 2, fontWeight: 500 }}>
            Click to test
          </div>
        )}
      </div>

      {/* Result icon */}
      {result && (
        <div style={{
          fontSize: 20,
          animation: 'popIn 0.3s ease',
        }}>
          {result === 'attract' ? '🟢' : '🔴'}
        </div>
      )}
    </div>
  );
};
// ─── Main Component ───────────────────────────────────────────────────────────
const MysteryBarTool: React.FC<MysteryBarToolProps> = ({ props: toolProps = {} }) => {
  const { additionalProps = {} } = toolProps;
  const rounds        = additionalProps.rounds            ?? DEFAULT_ROUNDS;
  const title         = additionalProps.title             ?? 'Is it a Magnet or Iron?';
  const subtitle      = additionalProps.subtitle          ?? 'Test the mystery bar to identify it';
  const summaryRule   = additionalProps.summaryRule       ?? 'Only repulsion proves something is a magnet.';
  const completionMsg = additionalProps.completionMessage ?? 'Investigation Complete! 🧲';

  const [current,  setCurrent]  = useState(0);
  const [nResult,  setNResult]  = useState<TestResult>(null);
  const [sResult,  setSResult]  = useState<TestResult>(null);
  const [revealed, setRevealed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaries, setSummaries] = useState<{ round: Round; n: TestResult; s: TestResult }[]>([]);

  useEffect(() => {
    const s = document.createElement('style');
    s.innerHTML = KEYFRAMES;
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch (_) {} };
  }, []);

  const round = rounds[current];
  const bothTested = nResult !== null && sResult !== null;
  const hasRepulsion = nResult === 'repel' || sResult === 'repel';

  const handleTest = (pole: 'N' | 'S') => {
    const r = getResult(pole, round);
    if (pole === 'N') setNResult(r);
    else setSResult(r);
  };

  const handleReveal = () => setRevealed(true);

  const handleNext = () => {
    setSummaries(prev => [...prev, { round, n: nResult, s: sResult }]);
    if (current + 1 >= rounds.length) {
      setShowSummary(true);
    } else {
      setCurrent(c => c + 1);
      setNResult(null); setSResult(null); setRevealed(false);
    }
  };

  const handleRestart = () => {
    setCurrent(0); setNResult(null); setSResult(null);
    setRevealed(false); setShowSummary(false); setSummaries([]);
  };

  const confetti = Array.from({ length: 18 }, (_, i) => ({
    id: i, color: [DS.purple, DS.orange, DS.green, DS.purpleLight][i % 4],
    left: `${4 + (i * 5.2) % 92}%`, delay: `${(i * 0.08).toFixed(2)}s`, size: 7 + i % 4 * 3,
  }));

  if (showSummary) {
    return (
      <SummaryScreen
        summaries={summaries}
        summaryRule={summaryRule}
        completionMsg={completionMsg}
        onRestart={handleRestart}
        confetti={confetti}
      />
    );
  }

  return (
    <div style={{
      fontFamily: DS.font, width: '100%', background: DS.bg,
      padding: '14px 12px', minHeight: '100vh',
    }}>
      {/* Decorative blobs */}
      <div style={{ position:'fixed',top:-80,right:-80,width:220,height:220,borderRadius:'50%',background:'radial-gradient(circle,rgba(193,193,234,0.25)0%,transparent 70%)',pointerEvents:'none',zIndex:0 }} />
      <div style={{ position:'fixed',bottom:-60,left:-60,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(252,145,69,0.14)0%,transparent 70%)',pointerEvents:'none',zIndex:0 }} />

      <div style={{ width:'100%', position:'relative', zIndex:1, display:'flex', flexDirection:'column', gap:14 }}>

        {/* ── Header ── */}
        <div style={{ textAlign:'center', animation:'fadeUp 0.4s ease' }}>
          <h1 style={{
            margin:'0 0 4px', fontSize:'clamp(16px,5vw,22px)', fontWeight:800,
            background: DS.gradient, backgroundSize:'200% 200%',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            animation:'gradAnim 4s ease infinite',
          }}>{title}</h1>
          <p style={{ margin:0, color:DS.gray1, fontSize:'clamp(11px,3vw,13px)', fontWeight:500 }}>
            {subtitle}
          </p>

          {/* Round progress */}
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:6, marginTop:10 }}>
            {rounds.map((_, i) => (
              <div key={i} style={{
                width: i === current ? 24 : 9, height: 9, borderRadius: 99,
                background: i < current
                  ? DS.green
                  : i === current
                  ? DS.gradient
                  : DS.gray3,
                border: `1.5px solid ${i < current ? DS.green : i === current ? DS.purple : DS.gray2}`,
                transition: 'all 0.3s ease',
              }} />
            ))}
            <span style={{ fontSize:11, fontWeight:700, color:DS.gray2, marginLeft:4 }}>
              {current+1}/{rounds.length}
            </span>
          </div>
        </div>

        {/* ── Main experiment card ── */}
        <div style={{
          background: DS.white, borderRadius: DS.radiusLg,
          boxShadow: DS.shadowMd, border:`1.5px solid ${DS.purpleLight}`,
          overflow: 'hidden', animation: 'fadeUp 0.45s ease',
        }}>
          {/* Card header strip */}
          <div style={{
            background: DS.gradient, padding:'10px 16px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.8)' }}>
              Round {current+1}
            </div>
            <div style={{
              background:'rgba(255,255,255,0.2)', borderRadius:99,
              padding:'4px 12px', fontSize:12, fontWeight:700, color:'#fff',
              display:'flex', alignItems:'center', gap:6,
            }}>
              <span>{round.mysteryEmoji}</span>
              <span>{round.mysteryLabel}</span>
            </div>
          </div>

          <div style={{ padding:'16px 14px', display:'flex', flexDirection:'column', gap:14 }}>

            {/* ── Experiment visual zone ── */}
            <ExperimentScene
              round={round}
              nResult={nResult}
              sResult={sResult}
              revealed={revealed}
              activePole={
                nResult === null && sResult === null ? null
                : nResult !== null && sResult === null ? 'N'
                : nResult === null && sResult !== null ? 'S'
                : 'both'
              }
            />

            {/* ── Test buttons ── */}
            {!revealed && (
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:DS.gray1, marginBottom:8 }}>
                  👇 Test each pole of the known magnet against the mystery bar:
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <TestCard
                    pole="N" result={nResult}
                    onTest={() => handleTest('N')}
                    disabled={!!nResult}
                  />
                  <TestCard
                    pole="S" result={sResult}
                    onTest={() => handleTest('S')}
                    disabled={!!sResult}
                  />
                </div>
              </div>
            )}

            {/* ── Reveal button ── */}
            {bothTested && !revealed && (
              <div style={{ textAlign:'center', animation:'slideIn 0.4s ease' }}>
                {/* Observation summary before reveal */}
                <div style={{
                  background: hasRepulsion ? DS.purpleFaded : DS.orangeLight,
                  border:`1.5px solid ${hasRepulsion ? DS.purple : DS.orange}`,
                  borderRadius: DS.radiusSm, padding:'10px 14px', marginBottom:12, textAlign:'left',
                }}>
                  <div style={{ fontSize:12, fontWeight:700, color: hasRepulsion ? DS.purple : DS.orange, marginBottom:3 }}>
                    {hasRepulsion ? '🔴 Repulsion observed!' : '🟢 Only attraction observed'}
                  </div>
                  <div style={{ fontSize:11, fontWeight:500, color:DS.gray1 }}>
                    {hasRepulsion
                      ? 'One pole was repelled. This hints that the bar may be a magnet!'
                      : 'Both poles attracted the bar. This suggests the bar may be iron.'}
                  </div>
                </div>
                <button
                  onClick={handleReveal}
                  style={{
                    display:'inline-flex', alignItems:'center', gap:8,
                    background: DS.gradient, color:'#fff', border:'none',
                    borderRadius:99, padding:'11px 26px', fontSize:13, fontWeight:700,
                    fontFamily:DS.font, cursor:'pointer', boxShadow:DS.shadowMd,
                    transition:'transform 0.2s', animation:'pulsebtn 2.5s ease-in-out infinite',
                  }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1.05)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)';}}
                >
                  🔍 Reveal Identity
                </button>
              </div>
            )}

            {/* ── Conclusion after reveal ── */}
            {revealed && (
              <div style={{ animation:'popIn 0.4s ease', display:'flex', flexDirection:'column', gap:12 }}>
                {/* Verdict card */}
                <div style={{
                  borderRadius: DS.radiusSm, overflow:'hidden',
                  border:`2px solid ${round.isMagnet ? DS.purple : DS.orange}`,
                }}>
                  {/* Verdict header */}
                  <div style={{
                    background: round.isMagnet ? DS.gradient : `linear-gradient(135deg,${DS.orange},#f59e0b)`,
                    padding:'10px 14px',
                    display:'flex', alignItems:'center', gap:10,
                  }}>
                    <span style={{ fontSize:22 }}>{round.isMagnet ? '🧲' : '🔩'}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>
                        {round.conclusionLabel}
                      </div>
                    </div>
                    <div style={{
                      marginLeft:'auto',
                      background:'rgba(255,255,255,0.25)', borderRadius:99,
                      padding:'3px 10px', fontSize:11, fontWeight:700, color:'#fff',
                    }}>
                      {round.isMagnet ? 'MAGNET ✓' : 'IRON ✓'}
                    </div>
                  </div>
                  {/* Verdict body */}
                  <div style={{
                    background: round.isMagnet ? DS.purpleFaded : DS.orangeLight,
                    padding:'10px 14px',
                  }}>
                    <p style={{ margin:0, fontSize:12, fontWeight:500, color:DS.gray1, lineHeight:1.55 }}>
                      {round.conclusionDetail}
                    </p>
                  </div>
                </div>

                {/* Key principle */}
                <div style={{
                  background: DS.bg, borderRadius: DS.radiusSm,
                  border:`1.5px solid ${DS.gray3}`, padding:'9px 12px',
                  display:'flex', gap:8,
                }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>💡</span>
                  <span style={{ fontSize:11, fontWeight:600, color:DS.gray1, lineHeight:1.45 }}>
                    {round.isMagnet
                      ? 'Repulsion identifies a magnet — an iron bar can only attract, never repel.'
                      : 'Iron is attracted to both poles. Without repulsion, it cannot be confirmed as a magnet.'}
                  </span>
                </div>

                {/* Next button */}
                <div style={{ textAlign:'center' }}>
                  <button
                    onClick={handleNext}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:8,
                      background: DS.gradient, color:'#fff', border:'none',
                      borderRadius:99, padding:'11px 26px', fontSize:13, fontWeight:700,
                      fontFamily:DS.font, cursor:'pointer', boxShadow:DS.shadowMd,
                      transition:'transform 0.2s',
                    }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1.05)';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)';}}
                  >
                    {current+1 >= rounds.length ? '📋 View Summary' : 'Next Round →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instruction footer */}
        {!bothTested && (
          <div style={{
            textAlign:'center', padding:'10px 12px',
            background: DS.orangeLight, borderRadius: DS.radiusSm,
            border:`1.5px solid ${DS.orange}`,
            animation:'fadeUp 0.5s ease 0.2s both',
          }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#7c3100' }}>
              🧲 Click both test buttons above to observe how the mystery bar responds to each pole of the known magnet.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};


// ─── Experiment Scene with live animation ─────────────────────────────────────
const ExperimentScene = ({
  round, nResult, sResult, revealed, activePole,
}: {
  round: Round;
  nResult: TestResult;
  sResult: TestResult;
  revealed: boolean;
  activePole: 'N' | 'S' | 'both' | null;
}) => {
  // Determine the most recent result to animate
  const lastResult: TestResult =
    sResult !== null ? sResult : nResult !== null ? nResult : null;
  const lastPole: 'N' | 'S' | null =
    sResult !== null ? 'S' : nResult !== null ? 'N' : null;

  const isAttract = lastResult === 'attract';
  const isRepel   = lastResult === 'repel';

  // Animate known magnet toward or away from mystery bar
  const knownAnim = lastResult === 'attract'
    ? 'attractKnown 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards'
    : lastResult === 'repel'
    ? 'repelKnown 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards'
    : 'none';

  const mysteryAnim = lastResult === 'attract'
    ? 'attractMystery 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards'
    : lastResult === 'repel'
    ? 'repelMystery 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards'
    : 'none';

  const sceneBg = isAttract
    ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)'
    : isRepel
    ? 'linear-gradient(135deg,#fff5f5,#fee2e2)'
    : DS.bg;

  const sceneBorder = isAttract
    ? '#86efac'
    : isRepel
    ? '#fca5a5'
    : DS.gray3;

  return (
    <div style={{
      borderRadius: DS.radius,
      border: `1.5px solid ${sceneBorder}`,
      background: sceneBg,
      padding: '12px 10px',
      display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'background 0.4s ease, border-color 0.4s ease',
    }}>
      <div style={{ fontSize:10, fontWeight:700, color:DS.gray2, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center' }}>
        Experiment Area
      </div>

      {/* ── Main magnet row ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, overflow:'hidden' }}>

        {/* Known magnet — animates left/right + rotates for S-pole */}
        <div style={{
          flex:'0 0 auto', display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          animation: knownAnim,
        }}>
          <div style={{ fontSize:9, fontWeight:600, color:DS.purple, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Known Magnet
          </div>
          {/* Magnet rotates 180° when S-pole is being tested so S faces the mystery bar */}
          <div style={{
            width:'clamp(90px,32vw,130px)',
            transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            transform: lastPole === 'S' ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            <KnownMagnet highlightPole={lastPole ?? undefined} />
          </div>
          {/* Pole direction label updates with rotation */}
          {lastPole === 'S' ? (
            <div style={{ display:'flex', gap:3 }}>
              <span style={{ fontSize:9,fontWeight:700,color:'#e53e3e',background:'#fff5f5',borderRadius:99,padding:'1px 6px',border:'1px solid #fc8181' }}>← N</span>
              <span style={{ fontSize:9,color:DS.gray2 }}>·</span>
              <span style={{ fontSize:9,fontWeight:700,color:'#3182ce',background:'#eff6ff',borderRadius:99,padding:'1px 6px',border:'1px solid #63b3ed' }}>S →</span>
            </div>
          ) : (
            <div style={{ display:'flex', gap:3 }}>
              <span style={{ fontSize:9,fontWeight:700,color:'#3182ce',background:'#eff6ff',borderRadius:99,padding:'1px 6px',border:'1px solid #63b3ed' }}>S</span>
              <span style={{ fontSize:9,color:DS.gray2 }}>·</span>
              <span style={{ fontSize:9,fontWeight:700,color:'#e53e3e',background:'#fff5f5',borderRadius:99,padding:'1px 6px',border:'1px solid #fc8181' }}>N →</span>
            </div>
          )}
        </div>

        {/* Centre gap — shows force label + arrows */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, minWidth:30 }}>
          {lastResult === null ? (
            <div style={{ fontSize:16, opacity:0.4 }}>↔</div>
          ) : isAttract ? (
            <>
              <div style={{ fontSize:10, fontWeight:800, color:DS.green, whiteSpace:'nowrap', animation:'popIn 0.4s ease' }}>
                ← attract →
              </div>
              <div style={{ fontSize:16 }}>💚</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:10, fontWeight:800, color:DS.red, whiteSpace:'nowrap', animation:'popIn 0.4s ease' }}>
                → repel ←
              </div>
              <div style={{ fontSize:16 }}>🔴</div>
            </>
          )}
        </div>

        {/* Mystery bar — animates right/left */}
        <div style={{
          flex:'0 0 auto', display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          animation: mysteryAnim,
        }}>
          <div style={{ fontSize:9, fontWeight:600, color:DS.gray2, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Mystery Bar
          </div>
          <div style={{ width:'clamp(90px,32vw,130px)' }}>
            <MysteryBarSVG revealed={revealed} isMagnet={round.isMagnet} mysteryEndPole={round.mysteryEndPole} />
          </div>
          <div style={{ fontSize:9, fontWeight:600, color:DS.gray2 }}>
            {revealed
              ? round.isMagnet
                ? `${round.mysteryEndPole}-pole here`
                : 'Non-magnetic iron'
              : 'Identity unknown'}
          </div>
        </div>
      </div>

      {/* ── Per-test result chips ── */}
      {(nResult || sResult) && (
        <div style={{
          display:'flex', gap:7, flexWrap:'wrap', justifyContent:'center',
          animation:'fadeUp 0.3s ease',
        }}>
          {nResult && (
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              background: nResult==='attract' ? DS.greenLight : DS.redLight,
              border:`1.5px solid ${nResult==='attract' ? DS.green : DS.red}`,
              borderRadius:99, padding:'4px 12px',
            }}>
              <div style={{
                width:20,height:20,borderRadius:'50%',
                background:'#fff5f5',border:'2px solid #e53e3e',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:10,fontWeight:800,color:'#e53e3e',
              }}>N</div>
              <span style={{ fontSize:11, fontWeight:700, color: nResult==='attract' ? DS.green : DS.red }}>
                {nResult==='attract' ? '✓ Attracted' : '✗ Repelled'}
              </span>
            </div>
          )}
          {sResult && (
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              background: sResult==='attract' ? DS.greenLight : DS.redLight,
              border:`1.5px solid ${sResult==='attract' ? DS.green : DS.red}`,
              borderRadius:99, padding:'4px 12px',
            }}>
              <div style={{
                width:20,height:20,borderRadius:'50%',
                background:'#eff6ff',border:'2px solid #3182ce',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:10,fontWeight:800,color:'#3182ce',
              }}>S</div>
              <span style={{ fontSize:11, fontWeight:700, color: sResult==='attract' ? DS.green : DS.red }}>
                {sResult==='attract' ? '✓ Attracted' : '✗ Repelled'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Animated Force Indicator ─────────────────────────────────────────────────
// Shows a mini animated scene for each pole test: two small magnet blocks
// that slide toward each other (attract) or push apart (repel).
const MagnetBlock = ({ label, color }: { label: string; color: string }) => (
  <div style={{
    width: 38, height: 28, borderRadius: 6, background: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 800, color: '#fff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
    flexShrink: 0,
  }}>{label}</div>
);

const ForceIndicator = ({ nResult, sResult }: { nResult: TestResult; sResult: TestResult }) => {
  const rows: { pole: 'N'|'S'; result: 'attract'|'repel' }[] = [];
  if (nResult) rows.push({ pole: 'N', result: nResult });
  if (sResult) rows.push({ pole: 'S', result: sResult });

  if (!rows.length) return null;

  return (
    <div style={{
      background: DS.white, borderRadius: DS.radiusSm,
      border: `1.5px solid ${DS.gray3}`, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 10,
      animation: 'slideIn 0.3s ease',
    }}>
      <div style={{ fontSize:10, fontWeight:700, color:DS.gray2, textTransform:'uppercase', letterSpacing:'0.07em' }}>
        Observations
      </div>
      {rows.map(({ pole, result }) => {
        const poleColor = pole === 'N' ? '#e53e3e' : '#3182ce';
        const isAttract = result === 'attract';
        // Animation: attract = magnets slide together; repel = magnets push apart
        const leftAnim  = isAttract
          ? 'magnetSlideRight 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards'
          : 'magnetSlideLeft  0.7s cubic-bezier(0.34,1.56,0.64,1) forwards';
        const rightAnim = isAttract
          ? 'magnetSlideLeft  0.7s cubic-bezier(0.34,1.56,0.64,1) forwards'
          : 'magnetSlideRight 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards';

        return (
          <div key={pole} style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {/* Label row */}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{
                width:24, height:24, borderRadius:'50%', flexShrink:0,
                background: pole==='N' ? '#fff5f5' : '#eff6ff',
                border:`2px solid ${poleColor}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:800, color:poleColor,
              }}>{pole}</div>
              <div style={{
                fontSize:11, fontWeight:700,
                color: isAttract ? DS.green : DS.red,
                background: isAttract ? DS.greenLight : DS.redLight,
                border:`1px solid ${isAttract ? DS.green : DS.red}`,
                borderRadius:99, padding:'1px 10px',
              }}>
                {isAttract ? '✓ Attracted' : '✗ Repelled'}
              </div>
            </div>
            {/* Animated magnet scene */}
            <div style={{
              background: isAttract ? '#f0fdf4' : '#fff5f5',
              border:`1.5px solid ${isAttract ? '#86efac' : '#fca5a5'}`,
              borderRadius:8, padding:'10px 12px',
              display:'flex', alignItems:'center', justifyContent:'center',
              gap:0, overflow:'hidden', position:'relative',
            }}>
              {/* Known magnet side (pole facing mystery bar) */}
              <div style={{ animation: leftAnim }}>
                <MagnetBlock
                  label={pole}
                  color={pole==='N' ? '#e53e3e' : '#3182ce'}
                />
              </div>

              {/* Center gap with force emoji */}
              <div style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: isAttract ? 18 : 20, minWidth:28,
              }}>
                {isAttract ? '💚' : '🔴'}
              </div>

              {/* Mystery bar left-end block */}
              <div style={{ animation: rightAnim }}>
                <MagnetBlock
                  label="?"
                  color="#6b7280"
                />
              </div>

              {/* Force direction arrows */}
              <div style={{
                position:'absolute', bottom:4, left:0, right:0,
                display:'flex', justifyContent:'center', gap:4,
              }}>
                {isAttract ? (
                  <span style={{ fontSize:10, fontWeight:700, color:DS.green }}>
                    ← pull together →
                  </span>
                ) : (
                  <span style={{ fontSize:10, fontWeight:700, color:DS.red }}>
                    → push apart ←
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};


// ─── Summary Screen ───────────────────────────────────────────────────────────
const SummaryScreen = ({
  summaries, summaryRule, completionMsg, onRestart, confetti,
}: {
  summaries: { round: Round; n: TestResult; s: TestResult }[];
  summaryRule: string;
  completionMsg: string;
  onRestart: () => void;
  confetti: { id:number; color:string; left:string; delay:string; size:number }[];
}) => (
  <div style={{
    fontFamily:DS.font, width:'100%', background:DS.bg,
    padding:'14px 12px', animation:'fadeUp 0.4s ease',
  }}>
    {confetti.map(c=>(
      <div key={c.id} style={{
        position:'fixed',top:0,left:c.left,width:c.size,height:c.size,
        background:c.color,borderRadius:3,pointerEvents:'none',opacity:0,
        animation:`confFall 2s ease ${c.delay} forwards`,zIndex:999,
      }}/>
    ))}

    <div style={{
      background:DS.white, borderRadius:DS.radiusLg,
      boxShadow:DS.shadowLg, border:`2px solid ${DS.purpleLight}`, overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{ background:DS.gradient, padding:'18px 16px', textAlign:'center' }}>
        <div style={{
          width:54, height:54, borderRadius:'50%', background:'rgba(255,255,255,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:26, margin:'0 auto 10px', animation:'floatBob 2s ease-in-out infinite',
        }}>🏆</div>
        <h2 style={{ margin:'0 0 4px', fontSize:'clamp(14px,5vw,19px)', fontWeight:800, color:'#fff' }}>
          {completionMsg}
        </h2>
        <p style={{ margin:0, fontSize:12, color:'rgba(255,255,255,0.8)', fontWeight:500 }}>
          Here's what you discovered:
        </p>
      </div>

      <div style={{ padding:'16px 14px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Round summaries */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {summaries.map((s, i) => (
            <div key={i} style={{
              borderRadius:DS.radiusSm, overflow:'hidden',
              border:`1.5px solid ${s.round.isMagnet ? DS.purple : DS.orange}`,
              animation:`fadeUp 0.35s ease ${i*0.09}s both`,
            }}>
              {/* Row header */}
              <div style={{
                background: s.round.isMagnet ? DS.purpleFaded : DS.orangeLight,
                padding:'8px 12px',
                display:'flex', alignItems:'center', gap:8,
              }}>
                <span style={{ fontSize:16 }}>{s.round.mysteryEmoji}</span>
                <span style={{ fontSize:12, fontWeight:700, color: s.round.isMagnet ? DS.purple : DS.orange }}>
                  {s.round.mysteryLabel}
                </span>
                <span style={{
                  marginLeft:'auto', fontSize:11, fontWeight:700, color:'#fff',
                  background: s.round.isMagnet ? DS.purple : DS.orange,
                  borderRadius:99, padding:'2px 10px',
                }}>
                  {s.round.isMagnet ? '🧲 Magnet' : '🔩 Iron'}
                </span>
              </div>
              {/* Test chips */}
              <div style={{
                padding:'8px 12px', display:'flex', gap:6, flexWrap:'wrap',
                background:DS.white,
              }}>
                {([['N', s.n, '#e53e3e', '#fff5f5', '#fc8181'], ['S', s.s, '#3182ce', '#eff6ff', '#63b3ed']] as const).map(
                  ([pole, res, pc, pbg, pb]) => (
                    <div key={pole} style={{
                      display:'flex', alignItems:'center', gap:5,
                      background: res === 'attract' ? DS.greenLight : DS.redLight,
                      border:`1px solid ${res === 'attract' ? DS.green : DS.red}`,
                      borderRadius:99, padding:'3px 10px',
                    }}>
                      <span style={{
                        width:18, height:18, borderRadius:'50%',
                        background:pbg, border:`1.5px solid ${pb}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:10, fontWeight:800, color:pc, flexShrink:0,
                      }}>{pole}</span>
                      <span style={{ fontSize:10, fontWeight:700, color: res==='attract' ? DS.green : DS.red }}>
                        {res==='attract' ? 'Attracted' : 'Repelled'}
                      </span>
                    </div>
                  )
                )}
                <div style={{ fontSize:11, fontWeight:500, color:DS.gray1, alignSelf:'center', flex:1, minWidth:140 }}>
                  {s.round.conclusionLabel}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key rule */}
        <div style={{
          background:DS.purpleFaded, border:`1.5px solid ${DS.purpleLight}`,
          borderRadius:DS.radiusSm, padding:'12px 14px',
          display:'flex', gap:10,
        }}>
          <span style={{ fontSize:20, flexShrink:0 }}>⚡</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:DS.purple, marginBottom:6 }}>The Key Rule</div>
            <div style={{ fontSize:12, fontWeight:600, color:DS.gray1, lineHeight:1.5, marginBottom:8 }}>
              {summaryRule}
            </div>
            {[
              { label:'Iron bar',  text:'Both poles attract → No repulsion → Cannot confirm it is a magnet', color:DS.orange },
              { label:'Magnet',    text:'One pole attracts + other repels → Repulsion = confirmed magnet!',  color:DS.purple },
            ].map(item=>(
              <div key={item.label} style={{ display:'flex', alignItems:'flex-start', gap:7, marginTop:5 }}>
                <span style={{
                  background:item.color, color:'#fff', borderRadius:99,
                  padding:'1px 9px', fontSize:10, fontWeight:700, flexShrink:0, marginTop:1,
                }}>{item.label}</span>
                <span style={{ fontSize:11, fontWeight:500, color:DS.gray1, lineHeight:1.4 }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Restart */}
        <div style={{ textAlign:'center' }}>
          <button
            onClick={onRestart}
            style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:DS.gradient, color:'#fff', border:'none',
              borderRadius:99, padding:'11px 26px', fontSize:13, fontWeight:700,
              fontFamily:DS.font, cursor:'pointer', boxShadow:DS.shadowMd,
              transition:'transform 0.2s',
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1.05)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)';}}
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default MysteryBarTool;