import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ==================== TYPES ====================

type SceneType = 'predict' | 'observe' | 'flip' | 'quiz' | 'results';
type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

// Rich vapour particle — ALL randomness baked in at creation so it never
// jitters on re-render (the component re-renders every animation frame).
interface VaporParticle {
  id: number;
  x: number;        // % horizontal start position (within plate)
  size: number;     // px diameter
  drift: number;    // px horizontal sway as it rises
  rise: number;     // px how far it floats upward
  duration: number; // s lifetime
  opacity: number;  // peak opacity
}

interface WaterSteelPlateAdditionalProps {
  showPredictStep?: boolean;
  showFlipStep?: boolean;
  waterColor?: string;
  vapourColor?: string;
  evaporationSpeed?: number;
  startScene?: SceneType;
}

interface WaterSteelPlateProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    animationSpeed?: number;
    autoPlayDuration?: number;
    additionalProps?: WaterSteelPlateAdditionalProps;
  };
  setStepDetails?: (stepDetails: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (val: boolean) => void;
}

// ==================== QUIZ DATA ====================

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'What happened to the water on the steel plate?',
    options: [
      'It seeped through the plate to the underside',
      'It evaporated into the air as water vapour',
      'It completely vanished with no trace',
      'It turned into ice on the plate',
    ],
    correct: 1,
    explanation:
      'Water converted into invisible water vapour and mixed with the air — this is called evaporation! The water substance still exists, just in a different state.',
  },
  {
    id: 2,
    question: 'Why was the underside of the steel plate completely dry?',
    options: [
      'The metal plate absorbed all the water inside it',
      'The water disappeared before it could reach the underside',
      'Water cannot pass through solid metal — it does not seep',
      'The plate was too hot for water to stay on it',
    ],
    correct: 2,
    explanation:
      'Water cannot pass through solid metal. The dry underside is proof that water did NOT seep through — it went upward into the air as vapour instead.',
  },
  {
    id: 3,
    question: 'What is the process of water converting into water vapour called?',
    options: ['Melting', 'Freezing', 'Evaporation', 'Condensation'],
    correct: 2,
    explanation:
      'Evaporation is the process by which liquid water changes into its gaseous state (water vapour). It happens continuously, even at room temperature!',
  },
  {
    id: 4,
    question: 'What do the rising vapour particles in the simulation represent?',
    options: [
      'Smoke rising from a hot plate',
      'Heat energy escaping from the water',
      'Water vapour molecules going into the surrounding air',
      'Air currents blowing across the plate surface',
    ],
    correct: 2,
    explanation:
      'The rising particles represent water vapour — invisible water molecules that have escaped from the liquid and are now mixing with the air around us.',
  },
  {
    id: 5,
    question: 'Did the water truly "disappear" from the steel plate?',
    options: [
      'Yes — it vanished and no longer exists anywhere',
      'No — it changed its state into invisible water vapour in the air',
    ],
    correct: 1,
    explanation:
      'Water never truly disappears! It changed its STATE from liquid water into invisible gaseous water vapour. The same water molecules are now in the air around us.',
  },
];

// ==================== ANIMATION EASING ====================

const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

// ==================== MAIN COMPONENT ====================

const WatchingWaterSteelPlate: React.FC<WaterSteelPlateProps> = ({
  props = {},
  setStepDetails,
  stopAutoNext,
  setStopAutoNext,
}) => {
  const config = useMemo(
    () => ({
      width: props.width ?? 800,
      height: props.height ?? 620,
      themeColor: props.themeColor ?? '#4A4DC9',
      animationSpeed: props.animationSpeed ?? 1,
    }),
    [props]
  );

  const addProps = props.additionalProps || {};
  const showPredictStep = addProps.showPredictStep ?? true;
  const showFlipStep = addProps.showFlipStep ?? true;
  const waterColor = addProps.waterColor ?? '#60B8E0';
  const vapourColor = addProps.vapourColor ?? '#A8D4F0';
  const evaporationSpeed = addProps.evaporationSpeed ?? 14;
  const startScene: SceneType = addProps.startScene ?? (showPredictStep ? 'predict' : 'observe');

  // ---- State ----
  const [scene, setScene] = useState<SceneType>(startScene);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waterLevel, setWaterLevel] = useState(1);
  const [evapDone, setEvapDone] = useState(false);
  const [particles, setParticles] = useState<VaporParticle[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipAnswer, setFlipAnswer] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ_QUESTIONS.length).fill(null));
  const [showExp, setShowExp] = useState(false);
  const [score, setScore] = useState(0);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [contentKey, setContentKey] = useState(0);

  const animRef = useRef<number>();
  const lastTsRef = useRef<number>(0);
  const pidRef = useRef(0);
  const waterLvlRef = useRef(1);   // mirrors waterLevel for the rAF loop
  const spawnAccRef = useRef(0);   // accumulator for time-based particle spawning

  // ---- Inject Styles ----
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'wsp-styles';
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      @keyframes wsp-fadeInUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
      @keyframes wsp-popIn { 0% { transform:scale(0); opacity:0; } 70% { transform:scale(1.12); } 100% { transform:scale(1); opacity:1; } }
      @keyframes wsp-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(83,48,134,0.4); } 50% { box-shadow:0 0 0 10px rgba(83,48,134,0); } }
      @keyframes wsp-waterShimmer { 0%,100% { opacity:0.82; } 50% { opacity:1; } }
      @keyframes wsp-ripple { 0%,100% { transform:scaleX(1); } 50% { transform:scaleX(1.04); } }
      @keyframes wsp-scoreIn { 0% { transform:scale(0) rotate(-12deg); opacity:0; } 65% { transform:scale(1.14) rotate(3deg); } 100% { transform:scale(1) rotate(0); opacity:1; } }
      @keyframes wsp-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
      @keyframes wsp-glow { 0%,100% { box-shadow:0 0 6px rgba(74,77,201,0.3); } 50% { box-shadow:0 0 20px rgba(74,77,201,0.65); } }
      @keyframes wsp-float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }

      /* --- Evaporation: a single wisp of vapour rising, swaying and fading --- */
      @keyframes wsp-vapor {
        0%   { transform: translate(0px, 0px) scale(0.45); opacity: 0; }
        18%  { transform: translate(calc(var(--drift) * 0.25), -10px) scale(1); opacity: var(--o); }
        55%  { transform: translate(calc(var(--drift) * 0.65), calc(var(--rise) * -0.6)) scale(0.85); opacity: calc(var(--o) * 0.55); }
        100% { transform: translate(var(--drift), calc(var(--rise) * -1)) scale(0.3); opacity: 0; }
      }
      /* Gentle heat-haze band sitting right on the water surface */
      @keyframes wsp-haze {
        0%,100% { opacity: 0.25; transform: translateY(0) scaleX(1); }
        50%     { opacity: 0.5; transform: translateY(-3px) scaleX(1.06); }
      }
    `;
    document.head.appendChild(el);
    return () => { const x = document.getElementById('wsp-styles'); if (x) document.head.removeChild(x); };
  }, []);

  // ---- Evaporation loop ----
  useEffect(() => {
    if (!isPlaying || scene !== 'observe') return;
    const totalMs = (evaporationSpeed * 1000) / config.animationSpeed;

    // Build one vapour particle, emanating from the CURRENT (shrinking) pool.
    const makeParticle = (lvl: number): VaporParticle => {
      const spread = 19 * Math.sqrt(Math.max(lvl, 0.05)); // pool half-width in %
      return {
        id: pidRef.current++,
        x: 50 + (Math.random() - 0.5) * 2 * spread,
        size: 7 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 40,
        rise: 72 + Math.random() * 48,
        duration: 2.1 + Math.random() * 1.5,
        opacity: 0.32 + Math.random() * 0.4,
      };
    };

    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(ts - lastTsRef.current, 50); // clamp tab-switch gaps
      lastTsRef.current = ts;

      let finished = false;
      setWaterLevel(prev => {
        const next = prev - dt / totalMs;
        if (next <= 0) { finished = true; waterLvlRef.current = 0; return 0; }
        waterLvlRef.current = next;
        return next;
      });

      // Time-based spawning (frame-rate independent). More water => more vapour.
      const lvl = waterLvlRef.current;
      if (lvl > 0.015) {
        spawnAccRef.current += dt;
        const interval = 60 + (1 - lvl) * 70; // puffs slow down as water runs out
        const fresh: VaporParticle[] = [];
        while (spawnAccRef.current >= interval) {
          spawnAccRef.current -= interval;
          fresh.push(makeParticle(lvl));
        }
        if (fresh.length) {
          setParticles(prev => [...prev, ...fresh].slice(-44)); // cap buffer
        }
      }

      if (finished) {
        setEvapDone(true);
        setIsPlaying(false);
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); lastTsRef.current = 0; };
  }, [isPlaying, scene, evaporationSpeed, config.animationSpeed]);

  // ---- Step details ----
  const sceneOrder: SceneType[] = ['predict', 'observe', 'flip', 'quiz', 'results'];
  useEffect(() => {
    if (setStepDetails) {
      setStepDetails({
        currentStep: sceneOrder.indexOf(scene) + 1,
        totalSteps: 5,
        isPaused: !isPlaying,
        currentMode: 'learn',
      });
    }
  }, [scene, isPlaying]);

  // ---- Helpers ----
  const goToScene = (s: SceneType) => {
    setContentKey(k => k + 1);
    setScene(s);
  };

  // Fully reset the evaporation visual state (water + vapour + refs)
  const resetEvaporation = () => {
    setWaterLevel(1);
    setEvapDone(false);
    setParticles([]);
    setIsPlaying(false);
    lastTsRef.current = 0;
    waterLvlRef.current = 1;
    spawnAccRef.current = 0;
  };

  const resetAll = () => {
    setScene(showPredictStep ? 'predict' : 'observe');
    setPrediction(null);
    setPredictionLocked(false);
    setIsPlaying(false);
    setWaterLevel(1);
    setEvapDone(false);
    setParticles([]);
    setFlipped(false);
    setIsFlipping(false);
    setFlipAnswer(null);
    setCurrentQ(0);
    setAnswers(Array(QUIZ_QUESTIONS.length).fill(null));
    setShowExp(false);
    setScore(0);
    lastTsRef.current = 0;
    waterLvlRef.current = 1;
    spawnAccRef.current = 0;
    setContentKey(k => k + 1);
  };

  const handleFlip = () => {
    if (isFlipping || flipped) return;
    setIsFlipping(true);
    setTimeout(() => { setFlipped(true); setIsFlipping(false); }, 850);
  };

  const handleAnswer = (idx: number) => {
    if (answers[currentQ] !== null) return;
    const isRight = idx === QUIZ_QUESTIONS[currentQ].correct;
    setAnswers(prev => { const n = [...prev]; n[currentQ] = idx; return n; });
    if (isRight) setScore(s => s + 1);
    setShowExp(true);
  };

  const handleNextQ = () => {
    if (currentQ < QUIZ_QUESTIONS.length - 1) {
      setCurrentQ(q => q + 1);
      setShowExp(false);
    } else {
      goToScene('results');
    }
  };

  const btn = (id: string, base: React.CSSProperties): React.CSSProperties => ({
    ...base,
    transform: hoveredBtn === id ? 'translateY(-2px) scale(1.03)' : 'translateY(0) scale(1)',
    transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
    cursor: 'pointer',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    border: 'none',
    outline: 'none',
  });

  // ==================== COLOR PALETTE ====================
  const C = {
    primary: '#4A4DC9',
    gradFrom: '#533086',
    gradTo: '#FC9145',
    accent: '#FF7212',
    lightPurple: '#C1C1EA',
    lightOrange: '#FFF3E4',
    bg: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#1E1E2E',
    sub: '#6B6B80',
    border: '#E8E8F0',
    success: '#10B981',
    error: '#EF4444',
    warm: '#FFF3E4',
  };

  // ==================== SVG PLATE ====================
  const SteelPlate: React.FC<{ waterLvl?: number; showDry?: boolean; showTop?: boolean }> = ({
    waterLvl = 0,
    showDry = false,
    showTop = true,
  }) => {
    const wRx = 72 * Math.sqrt(Math.max(waterLvl, 0));
    const wRy = 34 * Math.sqrt(Math.max(waterLvl, 0));

    return (
      <svg width={280} height={170} viewBox="0 0 280 170" style={{ overflow: 'visible' }}>
        {/* Drop shadow */}
        <ellipse cx={140} cy={158} rx={118} ry={11} fill="rgba(0,0,0,0.1)" />

        {/* Plate body */}
        <ellipse cx={140} cy={108} rx={118} ry={54} fill="#C5CBD8" />
        <ellipse cx={140} cy={103} rx={112} ry={49} fill={showDry ? '#D8DCE6' : '#BDC4D4'} />

        {/* Metallic gradient overlay */}
        <defs>
          <radialGradient id="plateShine" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
          </radialGradient>
          <radialGradient id="waterGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#89CFF5" />
            <stop offset="100%" stopColor="#4AA8DC" />
          </radialGradient>
        </defs>
        <ellipse cx={140} cy={103} rx={112} ry={49} fill="url(#plateShine)" />

        {/* Rim ring */}
        <ellipse cx={140} cy={103} rx={112} ry={49} fill="none" stroke="#9AA3B8" strokeWidth={2.5} />
        <ellipse cx={140} cy={108} rx={118} ry={54} fill="none" stroke="#8892A6" strokeWidth={2} />

        {/* Water pool */}
        {showTop && waterLvl > 0.02 && (
          <g>
            <ellipse
              cx={140} cy={103}
              rx={wRx} ry={wRy}
              fill="url(#waterGrad)"
              opacity={0.88}
              style={{ animation: 'wsp-waterShimmer 2.2s ease-in-out infinite, wsp-ripple 3s ease-in-out infinite' }}
            />
            <ellipse cx={126} cy={97} rx={wRx * 0.42} ry={wRy * 0.38} fill="rgba(255,255,255,0.38)" />
          </g>
        )}

        {/* Dry label */}
        {showDry && (
          <>
            <ellipse cx={140} cy={103} rx={50} ry={24} fill="rgba(16,185,129,0.08)" stroke="#6EE7B7" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={140} y={107} textAnchor="middle" fill="#047857" fontSize={12} fontFamily="Poppins, sans-serif" fontWeight={700}>DRY ✓</text>
          </>
        )}

        {/* Top label (hidden when the dry label is shown to avoid overlap) */}
        {showTop && !showDry && waterLvl <= 0.02 && (
          <text x={140} y={107} textAnchor="middle" fill="#9AA3B8" fontSize={12} fontFamily="Poppins, sans-serif" fontWeight={600}>
            (no water)
          </text>
        )}
      </svg>
    );
  };

  // ==================== VAPOUR PARTICLES ====================
  // Each particle's size/drift/rise/duration are FIXED at birth, so the wisp
  // animates smoothly via a single CSS keyframe instead of jittering on every
  // React re-render.
  const VapourLayer: React.FC = () => (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Soft heat-haze sitting on the water surface while evaporating */}
      {isPlaying && waterLevel > 0.02 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '55%',
            width: `${110 * Math.sqrt(Math.max(waterLevel, 0.05))}px`,
            height: 26,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${vapourColor}55, ${vapourColor}00 70%)`,
            filter: 'blur(5px)',
            animation: 'wsp-haze 2.4s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '55%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${vapourColor}F2, ${vapourColor}66 55%, ${vapourColor}00 78%)`,
            filter: 'blur(1.6px)',
            willChange: 'transform, opacity',
            ['--o' as any]: p.opacity,
            ['--drift' as any]: `${p.drift}px`,
            ['--rise' as any]: `${p.rise}px`,
            animation: `wsp-vapor ${p.duration}s ease-out forwards`,
            pointerEvents: 'none',
          } as React.CSSProperties}
        />
      ))}
    </div>
  );

  // ==================== SCENES ====================

  const renderPredict = () => {
    const options = [
      { label: 'It will seep through to the underside', icon: '💧', sub: 'Water moves through the metal' },
      { label: 'It will evaporate into the air', icon: '💨', sub: 'Water changes into vapour' },
      { label: 'It will stay on the plate forever', icon: '🪣', sub: 'Water stays as liquid' },
    ];
    return (
      <div key={contentKey} style={{ animation: 'wsp-fadeInUp 0.45s ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <SteelPlate waterLvl={0.85} />
          <div style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            background: C.lightOrange, border: `1.5px solid #FCD9A8`, borderRadius: 8,
            padding: '4px 12px', fontFamily: 'Poppins, sans-serif', fontSize: 11,
            fontWeight: 700, color: '#92400E', whiteSpace: 'nowrap',
          }}>
            💧 Tablespoon of water on steel plate
          </div>
        </div>

        <div style={{
          background: `${C.lightPurple}44`, border: `2px solid ${C.lightPurple}`,
          borderRadius: 14, padding: '14px 22px', maxWidth: 480, textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 14, color: C.sub, margin: 0, lineHeight: 1.6 }}>
            A tablespoon of water is placed on a steel plate and left on a table.
            <br /><strong style={{ color: C.text }}>What do you think will happen to the water?</strong>
          </p>
        </div>

        <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 17, color: C.text, margin: 0 }}>
          🔮 Make your prediction!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 460 }}>
          {options.map((opt, i) => {
            const sel = prediction === i;
            return (
              <button
                key={i}
                onClick={() => !predictionLocked && setPrediction(i)}
                onMouseEnter={() => !predictionLocked && setHoveredBtn(`pr-${i}`)}
                onMouseLeave={() => setHoveredBtn(null)}
                style={btn(`pr-${i}`, {
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 14, textAlign: 'left' as const,
                  background: sel
                    ? `linear-gradient(135deg, ${C.gradFrom}, ${C.gradTo})`
                    : C.surface,
                  border: `2.5px solid ${sel ? 'transparent' : C.border}`,
                  color: sel ? 'white' : C.text,
                  boxShadow: sel ? '0 6px 20px rgba(83,48,134,0.28)' : '0 2px 8px rgba(0,0,0,0.05)',
                  animation: `wsp-popIn 0.4s ease-out ${i * 0.1}s both`,
                })}
              >
                <span style={{ fontSize: 26, flexShrink: 0 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontWeight: sel ? 700 : 600, fontSize: 14 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{opt.sub}</div>
                </div>
                {sel && <span style={{ marginLeft: 'auto', fontSize: 18, flexShrink: 0 }}>✓</span>}
              </button>
            );
          })}
        </div>

        {prediction !== null && !predictionLocked && (
          <button
            onClick={() => { setPredictionLocked(true); setTimeout(() => goToScene('observe'), 500); }}
            onMouseEnter={() => setHoveredBtn('lock-pred')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={btn('lock-pred', {
              padding: '14px 40px', borderRadius: 50, fontSize: 15,
              background: `linear-gradient(135deg, ${C.gradFrom}, ${C.gradTo})`,
              color: 'white', boxShadow: '0 6px 22px rgba(83,48,134,0.38)',
              animation: 'wsp-popIn 0.4s ease-out',
            })}
          >
            Lock in my prediction →
          </button>
        )}
      </div>
    );
  };

  const renderObserve = () => (
    <div key={contentKey} style={{ animation: 'wsp-fadeInUp 0.45s ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Plate area */}
      <div style={{
        position: 'relative', width: 380, height: 230,
        background: 'linear-gradient(180deg, #EEF2FF 0%, #F0F9FF 100%)',
        borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <VapourLayer />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <SteelPlate waterLvl={waterLevel} />
        </div>

        {waterLevel > 0.02 && (
          <div style={{
            position: 'absolute', bottom: 10, right: 12,
            background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '5px 12px',
            fontFamily: 'Poppins, sans-serif', fontSize: 12, fontWeight: 700, color: C.primary,
            backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            Water: {Math.round(waterLevel * 100)}%
          </div>
        )}

        {evapDone && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: C.success, color: 'white', borderRadius: 20, padding: '6px 18px',
            fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 700,
            animation: 'wsp-popIn 0.5s ease-out', whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
          }}>
            ✓ Water fully evaporated!
          </div>
        )}

        {isPlaying && !evapDone && (
          <div style={{
            position: 'absolute', top: 10, left: 12, display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '4px 10px',
            fontFamily: 'Poppins, sans-serif', fontSize: 11, fontWeight: 600, color: C.accent,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, display: 'inline-block', animation: 'wsp-pulse 1.2s ease-in-out infinite' }} />
            Evaporating...
          </div>
        )}
      </div>

      {/* Vapour label */}
      {(isPlaying || waterLevel < 0.95) && waterLevel > 0.02 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'Poppins, sans-serif', fontSize: 13, color: '#3B82F6', fontWeight: 600,
          animation: 'wsp-fadeInUp 0.5s ease-out',
        }}>
          <span style={{ fontSize: 18 }}>💨</span>
          Water vapour rising into the air!
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={() => {
            if (evapDone) {
              resetEvaporation();
              setTimeout(() => setIsPlaying(true), 100);
            } else {
              setIsPlaying(p => !p);
            }
          }}
          onMouseEnter={() => setHoveredBtn('obs-play')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={btn('obs-play', {
            padding: '12px 28px', borderRadius: 50, fontSize: 15,
            background: `linear-gradient(135deg, ${C.gradFrom}, ${C.gradTo})`,
            color: 'white', boxShadow: '0 4px 16px rgba(83,48,134,0.35)',
            display: 'flex', alignItems: 'center', gap: 8,
            animation: 'wsp-glow 2.5s ease-in-out infinite',
          })}
        >
          {isPlaying ? '⏸ Pause' : evapDone ? '↺ Replay' : '▶ Play Simulation'}
        </button>

        <button
          onClick={resetEvaporation}
          onMouseEnter={() => setHoveredBtn('obs-reset')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={btn('obs-reset', {
            padding: '12px 18px', borderRadius: 50, fontSize: 13,
            background: C.surface, color: C.sub,
            border: `2px solid ${C.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          })}
        >
          ↺ Reset
        </button>
      </div>

      {/* Observation prompt */}
      <div style={{
        background: C.warm, border: '2px solid #FCD9A8',
        borderRadius: 14, padding: '12px 20px', maxWidth: 440, textAlign: 'center',
      }}>
        <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.6 }}>
          👁 <strong>Watch carefully:</strong> Notice the vapour rising upward.
          Is the water seeping down or going up into the air?
        </p>
      </div>

      {/* Next step — show early */}
      {waterLevel < 0.55 && (
        <button
          onClick={() => showFlipStep ? goToScene('flip') : goToScene('quiz')}
          onMouseEnter={() => setHoveredBtn('obs-next')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={btn('obs-next', {
            padding: '13px 34px', borderRadius: 50, fontSize: 14,
            background: `linear-gradient(135deg, ${C.primary}, #6366F1)`,
            color: 'white', boxShadow: '0 5px 18px rgba(74,77,201,0.35)',
            animation: 'wsp-popIn 0.5s ease-out',
          })}
        >
          {showFlipStep ? '🔍 Check the underside →' : '📝 Take the Quiz →'}
        </button>
      )}
    </div>
  );

  const renderFlip = () => (
    <div key={contentKey} style={{ animation: 'wsp-fadeInUp 0.45s ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 17, color: C.text, margin: '0 0 6px' }}>
          🔍 Let's check the underside of the plate!
        </p>
        <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: C.sub, margin: 0, maxWidth: 380 }}>
          If water seeped through the metal, the underside should be wet.
        </p>
      </div>

      {/* 3D Flip container */}
      <div style={{ perspective: 900, width: 300, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 280, height: 170,
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
          transition: 'transform 0.85s cubic-bezier(0.4,0,0.2,1)',
          position: 'relative',
        }}>
          {/* Front */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <SteelPlate waterLvl={0} showTop />
            <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: C.sub, marginTop: -6 }}>
              TOP (water evaporated from here)
            </span>
          </div>
          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          }}>
            <SteelPlate waterLvl={0} showDry />
            <span style={{
              fontFamily: 'Poppins, sans-serif', fontSize: 12, fontWeight: 700,
              color: C.success, marginTop: -6,
            }}>
              UNDERSIDE — COMPLETELY DRY! ✓
            </span>
          </div>
        </div>
      </div>

      {!flipped ? (
        <button
          onClick={handleFlip}
          onMouseEnter={() => setHoveredBtn('flip-btn')}
          onMouseLeave={() => setHoveredBtn(null)}
          style={btn('flip-btn', {
            padding: '14px 34px', borderRadius: 50, fontSize: 15,
            background: `linear-gradient(135deg, ${C.gradFrom}, ${C.gradTo})`,
            color: 'white', boxShadow: '0 6px 20px rgba(83,48,134,0.38)',
            animation: 'wsp-pulse 2s ease-in-out infinite',
          })}
        >
          🔄 Flip the plate
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', maxWidth: 440 }}>
          <div style={{
            background: '#ECFDF5', border: '2px solid #6EE7B7', borderRadius: 14,
            padding: '14px 22px', textAlign: 'center', animation: 'wsp-popIn 0.5s ease-out',
          }}>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 15, color: '#065F46', margin: '0 0 5px' }}>
              ✅ The underside is completely DRY!
            </p>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: '#047857', margin: 0 }}>
              This proves water did NOT seep through the metal plate.
            </p>
          </div>

          <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, color: C.text, margin: 0 }}>
            So where did the water go? 🤔
          </p>

          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {['It evaporated into the air as vapour', 'It was absorbed by the metal plate'].map((opt, i) => (
              <button
                key={i}
                onClick={() => setFlipAnswer(i)}
                onMouseEnter={() => setHoveredBtn(`fa-${i}`)}
                onMouseLeave={() => setHoveredBtn(null)}
                style={btn(`fa-${i}`, {
                  flex: 1, padding: '13px 14px', borderRadius: 12, fontSize: 13, textAlign: 'center' as const,
                  background: flipAnswer === i ? (i === 0 ? C.success : C.error) : C.surface,
                  border: `2.5px solid ${flipAnswer === i ? 'transparent' : C.border}`,
                  color: flipAnswer === i ? 'white' : C.text,
                  boxShadow: flipAnswer === i ? `0 4px 12px rgba(0,0,0,0.18)` : '0 2px 6px rgba(0,0,0,0.06)',
                  lineHeight: 1.4,
                })}
              >
                {opt}
              </button>
            ))}
          </div>

          {flipAnswer !== null && (
            <>
              <div style={{
                background: flipAnswer === 0 ? '#ECFDF5' : '#FEF2F2',
                border: `2px solid ${flipAnswer === 0 ? '#6EE7B7' : '#FCA5A5'}`,
                borderRadius: 12, padding: '12px 18px', textAlign: 'center',
                animation: flipAnswer === 0 ? 'wsp-popIn 0.4s ease-out' : 'wsp-shake 0.4s ease-out',
              }}>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 14, color: flipAnswer === 0 ? '#065F46' : '#991B1B', margin: '0 0 4px' }}>
                  {flipAnswer === 0 ? '✅ Correct!' : '❌ Not quite...'}
                </p>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: flipAnswer === 0 ? '#047857' : '#B91C1C', margin: 0 }}>
                  {flipAnswer === 0
                    ? 'The water evaporated — it changed into invisible water vapour and mixed with the air around us!'
                    : 'The dry underside means nothing was absorbed. The water went upward as vapour — that\'s evaporation!'}
                </p>
              </div>

              <button
                onClick={() => goToScene('quiz')}
                onMouseEnter={() => setHoveredBtn('flip-next')}
                onMouseLeave={() => setHoveredBtn(null)}
                style={btn('flip-next', {
                  padding: '14px 36px', borderRadius: 50, fontSize: 15,
                  background: `linear-gradient(135deg, ${C.gradFrom}, ${C.gradTo})`,
                  color: 'white', boxShadow: '0 6px 20px rgba(83,48,134,0.38)',
                  animation: 'wsp-popIn 0.5s ease-out',
                })}
              >
                📝 Take the Quiz →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderQuiz = () => {
    const q = QUIZ_QUESTIONS[currentQ];
    const sel = answers[currentQ];
    const isRight = sel === q.correct;

    return (
      <div key={`quiz-${currentQ}`} style={{ animation: 'wsp-fadeInUp 0.4s ease-out', display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 500, margin: '0 auto' }}>
        {/* Dot progress */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          {QUIZ_QUESTIONS.map((qq, i) => (
            <div key={i} style={{
              height: 8, borderRadius: 4,
              width: i === currentQ ? 32 : 8,
              background: answers[i] !== null
                ? (answers[i] === qq.correct ? C.success : C.error)
                : i === currentQ ? C.primary : C.border,
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Question card */}
        <div style={{
          background: `linear-gradient(135deg, ${C.gradFrom}14, ${C.gradTo}14)`,
          border: `2px solid ${C.lightPurple}`,
          borderRadius: 18, padding: '20px 22px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 10 }}>
            Question {currentQ + 1} of {QUIZ_QUESTIONS.length}
          </div>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, color: C.text, margin: 0, lineHeight: 1.5 }}>
            {q.question}
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {q.options.map((opt, i) => {
            const isSel = sel === i;
            const isCorrectOpt = i === q.correct;
            let bg = C.surface, borderCol = C.border, textCol = C.text;
            if (sel !== null) {
              if (isCorrectOpt) { bg = '#ECFDF5'; borderCol = '#6EE7B7'; textCol = '#065F46'; }
              else if (isSel) { bg = '#FEF2F2'; borderCol = '#FCA5A5'; textCol = '#991B1B'; }
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={sel !== null}
                onMouseEnter={() => sel === null && setHoveredBtn(`q-${i}`)}
                onMouseLeave={() => setHoveredBtn(null)}
                style={btn(`q-${i}`, {
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 16px', borderRadius: 12, textAlign: 'left' as const,
                  background: bg, border: `2.5px solid ${borderCol}`, color: textCol,
                  fontSize: 13,
                  opacity: sel !== null && !isSel && !isCorrectOpt ? 0.5 : 1,
                  boxShadow: hoveredBtn === `q-${i}` && sel === null ? '0 4px 14px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.05)',
                  animation: `wsp-popIn 0.35s ease-out ${i * 0.07}s both`,
                })}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: sel !== null
                    ? (isCorrectOpt ? C.success : isSel ? C.error : C.border)
                    : C.lightPurple,
                  color: sel !== null && (isCorrectOpt || isSel) ? 'white' : C.primary,
                  fontWeight: 700, fontSize: 12, transition: 'all 0.3s',
                }}>
                  {sel !== null
                    ? (isCorrectOpt ? '✓' : isSel ? '✗' : String.fromCharCode(65 + i))
                    : String.fromCharCode(65 + i)}
                </span>
                <span style={{ fontWeight: 500, lineHeight: 1.4 }}>{opt}</span>
              </button>
            );
          })}
        </div>

        {showExp && (
          <div style={{
            background: isRight ? '#ECFDF5' : '#FEF2F2',
            border: `2px solid ${isRight ? '#6EE7B7' : '#FCA5A5'}`,
            borderRadius: 13, padding: '13px 16px',
            animation: isRight ? 'wsp-popIn 0.4s ease-out' : 'wsp-shake 0.4s ease-out',
          }}>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 13, color: isRight ? '#065F46' : '#991B1B', margin: '0 0 5px' }}>
              {isRight ? '🎉 Correct!' : '💡 Not quite...'}
            </p>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: isRight ? '#047857' : '#B91C1C', margin: 0, lineHeight: 1.6 }}>
              {q.explanation}
            </p>
          </div>
        )}

        {showExp && (
          <button
            onClick={handleNextQ}
            onMouseEnter={() => setHoveredBtn('next-q')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={btn('next-q', {
              padding: '13px 32px', borderRadius: 50, fontSize: 14,
              background: `linear-gradient(135deg, ${C.gradFrom}, ${C.gradTo})`,
              color: 'white', boxShadow: '0 5px 18px rgba(83,48,134,0.35)',
              alignSelf: 'center', animation: 'wsp-popIn 0.45s ease-out',
            })}
          >
            {currentQ < QUIZ_QUESTIONS.length - 1 ? 'Next Question →' : 'See Results →'}
          </button>
        )}
      </div>
    );
  };

  const renderResults = () => {
    const pct = Math.round((score / QUIZ_QUESTIONS.length) * 100);
    const getMsg = () => {
      if (score === 5) return { msg: 'Excellent! You understand evaporation perfectly!', emoji: '🏆', col: '#FFB700' };
      if (score >= 3) return { msg: 'Good work! Review the key concept once more.', emoji: '⭐', col: C.primary };
      return { msg: 'Observe the simulation again carefully and retry!', emoji: '💪', col: C.accent };
    };
    const { msg, emoji, col } = getMsg();

    return (
      <div key={contentKey} style={{ animation: 'wsp-fadeInUp 0.45s ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* Score */}
        <div style={{
          width: 150, height: 150, borderRadius: '50%',
          background: `conic-gradient(${col} ${pct * 3.6}deg, ${C.border} 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'wsp-scoreIn 0.8s cubic-bezier(0.175,0.885,0.32,1.275)',
          boxShadow: `0 8px 32px ${col}44`,
        }}>
          <div style={{
            width: 118, height: 118, borderRadius: '50%', background: C.surface,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 34 }}>{emoji}</span>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 24, color: C.text, lineHeight: 1.1 }}>
              {score}/{QUIZ_QUESTIONS.length}
            </span>
          </div>
        </div>

        <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 17, color: C.text, margin: 0, textAlign: 'center', maxWidth: 380 }}>
          {msg}
        </p>

        {/* Q-by-Q review */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {QUIZ_QUESTIONS.map((qq, i) => (
            <div key={i} style={{
              width: 38, height: 38, borderRadius: '50%',
              background: answers[i] === qq.correct ? C.success : C.error,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 15,
              animation: `wsp-popIn 0.4s ease-out ${i * 0.1}s both`,
              boxShadow: `0 3px 12px ${answers[i] === qq.correct ? C.success : C.error}55`,
            }}>
              {answers[i] === qq.correct ? '✓' : '✗'}
            </div>
          ))}
        </div>

        {/* Key concept summary */}
        <div style={{
          background: `linear-gradient(135deg, ${C.gradFrom}12, ${C.gradTo}12)`,
          border: `2px solid ${C.lightPurple}`,
          borderRadius: 18, padding: '18px 22px', maxWidth: 460, width: '100%',
        }}>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 13, color: C.primary, margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>
            🧪 Key Concept Recap
          </p>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 15, color: C.text, margin: '0 0 10px' }}>
            Water does NOT seep through metal — it evaporates.
          </p>
          <ul style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: C.sub, margin: 0, paddingLeft: 18, lineHeight: 2.0 }}>
            <li><strong>Evaporation</strong> = liquid water → invisible water vapour</li>
            <li>The dry underside proves no seeping occurred</li>
            <li>Water vapour mixes invisibly into the air around us</li>
            <li>Evaporation happens even at room temperature</li>
            <li>Water never truly "disappears" — it changes <em>state</em></li>
          </ul>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={resetAll}
            onMouseEnter={() => setHoveredBtn('restart')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={btn('restart', {
              padding: '13px 32px', borderRadius: 50, fontSize: 14,
              background: `linear-gradient(135deg, ${C.gradFrom}, ${C.gradTo})`,
              color: 'white', boxShadow: '0 6px 20px rgba(83,48,134,0.35)',
            })}
          >
            ↺ Try Again
          </button>
          <button
            onClick={() => goToScene('observe')}
            onMouseEnter={() => setHoveredBtn('re-obs')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={btn('re-obs', {
              padding: '13px 24px', borderRadius: 50, fontSize: 14,
              background: C.surface, color: C.sub,
              border: `2px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            })}
          >
            👁 Watch Again
          </button>
        </div>
      </div>
    );
  };

  // ==================== STEP LABELS ====================

  const allSteps = [
    { key: 'predict', label: 'Predict', show: showPredictStep },
    { key: 'observe', label: 'Observe', show: true },
    { key: 'flip', label: 'Flip Plate', show: showFlipStep },
    { key: 'quiz', label: 'Quiz', show: true },
    { key: 'results', label: 'Results', show: true },
  ].filter(s => s.show);

  const currentIdx = allSteps.findIndex(s => s.key === scene);

  const sceneTitles: Record<SceneType, string> = {
    predict: '🔮 Make Your Prediction',
    observe: '👁 Observe the Water',
    flip: '🔍 Check the Underside',
    quiz: '📝 Test Your Understanding',
    results: '🏆 Your Results',
  };
  const sceneSubs: Record<SceneType, string> = {
    predict: 'What do you think will happen to the water on the steel plate?',
    observe: 'Watch carefully — where does the water actually go?',
    flip: 'Does water seep through a steel plate? Let\'s find out!',
    quiz: 'Chapter 8: A Journey through States of Water — NCERT Class 6',
    results: 'Chapter 8: Evaporation & States of Water',
  };

  // ==================== RENDER ====================

  return (
    <div style={{
      width: '100%', maxWidth: config.width, margin: '0 auto',
      fontFamily: 'Poppins, sans-serif',
      background: '#FFFFFF', borderRadius: 24, overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.13)',
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.gradFrom} 0%, ${C.gradTo} 100%)`,
        padding: '24px 32px 20px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -25, left: 60, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: 8,
              padding: '3px 10px', fontSize: 11, fontWeight: 700,
              color: 'white', letterSpacing: 1, textTransform: 'uppercase' as const,
            }}>
              Class 6 • Chapter 8 • Science
            </span>
          </div>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 22, color: 'white', margin: '0 0 5px', letterSpacing: -0.3 }}>
            {sceneTitles[scene]}
          </h2>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.82)', margin: 0 }}>
            {sceneSubs[scene]}
          </p>
        </div>
      </div>

      {/* Step tracker */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 28px',
        background: C.bg, borderBottom: `1px solid ${C.border}`, gap: 0,
      }}>
        {allSteps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                background: i < currentIdx
                  ? C.success
                  : i === currentIdx
                    ? `linear-gradient(135deg, ${C.gradFrom}, ${C.gradTo})`
                    : C.border,
                color: i <= currentIdx ? 'white' : C.sub,
                boxShadow: i === currentIdx ? `0 3px 12px ${C.primary}55` : 'none',
                transition: 'all 0.35s ease',
              }}>
                {i < currentIdx ? '✓' : i + 1}
              </div>
              <span style={{
                fontFamily: 'Poppins, sans-serif', fontSize: 10, whiteSpace: 'nowrap',
                fontWeight: i === currentIdx ? 700 : 500,
                color: i === currentIdx ? C.primary : i < currentIdx ? C.success : C.sub,
              }}>
                {s.label}
              </span>
            </div>
            {i < allSteps.length - 1 && (
              <div style={{
                height: 2, flex: 1, marginBottom: 16,
                background: i < currentIdx ? C.success : C.border,
                transition: 'background 0.4s ease',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Main content */}
      <div style={{ padding: '28px 32px', minHeight: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {scene === 'predict' && renderPredict()}
        {scene === 'observe' && renderObserve()}
        {scene === 'flip' && renderFlip()}
        {scene === 'quiz' && renderQuiz()}
        {scene === 'results' && renderResults()}
      </div>

      {/* Footer */}
      <div style={{
        background: C.bg, borderTop: `1px solid ${C.border}`,
        padding: '12px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: C.sub }}>
          Curiosity | Textbook of Science | Grade 6
        </span>
        <span style={{
          fontFamily: 'Poppins, sans-serif', fontSize: 11, fontWeight: 700, color: C.primary,
          background: `${C.lightPurple}55`, borderRadius: 20, padding: '3px 12px',
        }}>
          Activity 8.2 — Evaporation
        </span>
      </div>
    </div>
  );
};

export default WatchingWaterSteelPlate;
export { WatchingWaterSteelPlate };  // named export so the preview harness can mount by name