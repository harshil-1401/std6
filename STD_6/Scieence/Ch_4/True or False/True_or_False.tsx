import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, RotateCcw, ChevronRight, Award } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface TFStatement {
  id: number;
  statement: string;
  answer: boolean;           // true = True, false = False
  explanation: string;       // shown on correct
  reason: string;            // shown on incorrect (brief reason + correct answer)
}

interface TFQuizData {
  title: string;
  subtitle: string;
  statements: TFStatement[];
}

interface TrueFalseQuizProps {
  props?: {
    additionalProps?: {
      quizData?: TFQuizData;
      celebrateOnComplete?: boolean;
    };
  };
}

// ─────────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────────

const defaultQuizData: TFQuizData = {
  title: 'True or False?',
  subtitle: 'Read each statement carefully and click True or False. Think back to what you observed in the experiments!',
  statements: [
    {
      id: 1,
      statement: 'A magnet can be broken into pieces to obtain a single pole.',
      answer: false,
      explanation: 'Correct! Even the tiniest broken piece always has both a North and a South pole.',
      reason: 'This is FALSE. Breaking a magnet always produces new pairs of poles — you can never isolate a single pole.',
    },
    {
      id: 2,
      statement: 'Similar poles of a magnet repel each other.',
      answer: true,
      explanation: 'Correct! Like poles (N–N or S–S) always push each other away — repulsion!',
      reason: 'This is TRUE. Like poles repel; unlike poles attract — observed clearly in Activity 4.5.',
    },
    {
      id: 3,
      statement: 'Iron filings mostly stick in the middle of a bar magnet when brought near it.',
      answer: false,
      explanation: 'Correct! The magnetic force is strongest at the poles (ends), so filings cluster there.',
      reason: 'This is FALSE. Iron filings cluster at the two poles (ends), not in the middle — as Activity 4.2 showed.',
    },
    {
      id: 4,
      statement: 'A freely suspended bar magnet always aligns with the north-south direction.',
      answer: true,
      explanation: 'Correct! Earth behaves like a giant magnet, pulling the suspended magnet to align N–S.',
      reason: 'This is TRUE. Earth\'s magnetic field causes any freely suspended magnet to align north-south — the basis of a compass.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────
// PARTICLE BURST
// ─────────────────────────────────────────────────────────────────

interface Particle { id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; shape: 'circle' | 'rect'; }

const ParticleBurst: React.FC<{ active: boolean; x: number; y: number }> = ({ active, x, y }) => {
  const [pts, setPts] = useState<Particle[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    if (!active) return;
    const colors = ['#FC9145', '#533086', '#4A4DC9', '#10b981', '#FF7212', '#C1C1EA', '#f59e0b'];
    setPts(Array.from({ length: 24 }, (_, i) => ({
      id: i, x, y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12 - 5,
      color: colors[i % colors.length],
      size: Math.random() * 10 + 4,
      life: 1,
      shape: i % 3 === 0 ? 'rect' : 'circle',
    })));
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      setPts(prev => {
        const next = prev
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 14 * dt, life: p.life - dt * 1.8 }))
          .filter(p => p.life > 0);
        if (next.length) raf.current = requestAnimationFrame(tick);
        return next;
      });
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, x, y]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }}>
      {pts.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: p.x, top: p.y,
          width: p.size, height: p.size,
          borderRadius: p.shape === 'circle' ? '50%' : 3,
          background: p.color, opacity: Math.max(0, p.life),
          transform: `translate(-50%,-50%) rotate(${p.id * 30}deg)`,
        }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────────────────────────

const AnimatedScore: React.FC<{ target: number; total: number }> = ({ target, total }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let frame = 0;
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return (
    <span style={{ fontSize: 'clamp(52px,12vw,80px)', fontWeight: 800, color: '#533086', lineHeight: 1 }}>
      {val}<span style={{ fontSize: 'clamp(28px,6vw,40px)', color: '#C1C1EA', fontWeight: 700 }}>/{total}</span>
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

const TrueFalseQuiz: React.FC<TrueFalseQuizProps> = ({ props: compProps = {} }) => {
  const { additionalProps = {} } = compProps;
  const quizData: TFQuizData = additionalProps?.quizData ?? defaultQuizData;
  const celebrate: boolean   = additionalProps?.celebrateOnComplete ?? true;

  const total = quizData.statements.length;

  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState<AnswerState[]>(Array(total).fill('unanswered'));
  const [chosen,    setChosen]    = useState<(boolean | null)[]>(Array(total).fill(null));
  const [revealed,  setRevealed]  = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const [particle,  setParticle]  = useState({ active: false, x: 0, y: 0 });
  const [cardKey,   setCardKey]   = useState(0); // force re-animation on card change

  const correctCount = answers.filter(a => a === 'correct').length;
  const progress = ((current + (revealed ? 1 : 0)) / total) * 100;

  // Inject styles once
  useEffect(() => {
    const id = 'tfq-styles';
    if (document.getElementById(id)) { setMounted(true); return; }
    const el = document.createElement('style');
    el.id = id;
    el.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      @keyframes tfSlideUp   { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
      @keyframes tfPopIn     { 0%{opacity:0;transform:scale(0.78) translateY(20px)} 70%{transform:scale(1.04) translateY(-2px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      @keyframes tfShake     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
      @keyframes tfBounce    { 0%,100%{transform:scale(1)} 40%{transform:scale(1.14)} 70%{transform:scale(0.96)} }
      @keyframes tfGrad      { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      @keyframes tfSpin      { to{transform:rotate(360deg)} }
      @keyframes tfFadeIn    { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      @keyframes tfPulse     { 0%,100%{opacity:1} 50%{opacity:0.6} }
      @keyframes tfStarPop   { 0%{opacity:0;transform:scale(0) rotate(-30deg)} 70%{transform:scale(1.2) rotate(5deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
      @keyframes tfBarFill   { from{width:0%} to{width:var(--bar-w)} }
      @keyframes tfReveal    { from{opacity:0;transform:translateY(10px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
    `;
    document.head.appendChild(el);
    setTimeout(() => setMounted(true), 40);
    return () => { const e = document.getElementById(id); if (e) e.remove(); };
  }, []);

  const handleAnswer = (picked: boolean, evt: React.MouseEvent) => {
    if (revealed) return;
    const stmt = quizData.statements[current];
    const isCorrect = picked === stmt.answer;
    const newAnswers = [...answers];
    const newChosen  = [...chosen];
    newAnswers[current] = isCorrect ? 'correct' : 'incorrect';
    newChosen[current]  = picked;
    setAnswers(newAnswers);
    setChosen(newChosen);
    setRevealed(true);

    if (isCorrect && celebrate) {
      setParticle({ active: true, x: evt.clientX, y: evt.clientY });
      setTimeout(() => setParticle(p => ({ ...p, active: false })), 1800);
    }
  };

  const handleNext = () => {
    if (current < total - 1) {
      setCurrent(c => c + 1);
      setRevealed(false);
      setCardKey(k => k + 1);
    } else {
      setShowScore(true);
    }
  };

  const reset = () => {
    setCurrent(0);
    setAnswers(Array(total).fill('unanswered'));
    setChosen(Array(total).fill(null));
    setRevealed(false);
    setShowScore(false);
    setCardKey(k => k + 1);
  };

  const stmt     = quizData.statements[current];
  const ansState = answers[current];
  const isCorrect   = ansState === 'correct';
  const isIncorrect = ansState === 'incorrect';

  // Score-based label
  const scoreLabel = correctCount === total ? '🏆 Perfect Score!'
    : correctCount >= total * 0.75        ? '🌟 Well done!'
    : correctCount >= total * 0.5         ? '👍 Good effort!'
    :                                       '📚 Keep practising!';

  const scoreColor = correctCount === total ? '#10b981'
    : correctCount >= total * 0.75         ? '#533086'
    : correctCount >= total * 0.5          ? '#FC9145'
    :                                        '#ef4444';

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'linear-gradient(155deg,#f0effe 0%,#fff8f2 55%,#f5f0ff 100%)',
      fontFamily: 'Poppins,sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '28px 16px 60px', boxSizing: 'border-box',
    }}>

      <ParticleBurst active={particle.active} x={particle.x} y={particle.y} />

      {/* BG blobs */}
      <div style={{ position:'fixed', top:-120, right:-120, width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,#C1C1EA40 0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:-80, left:-80, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,#FFF3E440 0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      {/* ── HEADER ── */}
      <div style={{ width:'100%', maxWidth:680, textAlign:'center', marginBottom:28, zIndex:1,
        opacity: mounted?1:0, transform: mounted?'translateY(0)':'translateY(-18px)', transition:'all 0.5s ease' }}>
        <div style={{ fontSize:44, marginBottom:6, display:'inline-block', animation: mounted?'tfSpin 8s linear infinite':'' }}>🧲</div>
        <h1 style={{
          margin:0, lineHeight:1.2, letterSpacing:'-0.5px',
          fontSize:'clamp(24px,5vw,36px)', fontWeight:800,
          background:'linear-gradient(135deg,#533086 0%,#4A4DC9 50%,#FC9145 100%)',
          backgroundSize:'200% 200%', animation:'tfGrad 4s ease infinite',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
        }}>{quizData.title}</h1>
        <p style={{ margin:'10px 0 0', color:'#7c6ea0', fontSize:'clamp(12px,2.5vw,14px)', fontWeight:500, lineHeight:1.6 }}>
          {quizData.subtitle}
        </p>
      </div>

      {/* ── PROGRESS ── */}
      <div style={{ width:'100%', maxWidth:680, marginBottom:24, zIndex:1, opacity:mounted?1:0, transition:'opacity 0.5s 0.1s' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:12, fontWeight:600, color:'#9c89b8' }}>
            Statement {Math.min(current + 1, total)} of {total}
          </span>
          <div style={{ display:'flex', gap:6 }}>
            {quizData.statements.map((_, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: 13, fontWeight:700,
                background: answers[i] === 'correct'   ? '#10b981'
                          : answers[i] === 'incorrect' ? '#ef4444'
                          : i === current              ? 'linear-gradient(135deg,#533086,#4A4DC9)'
                          :                              '#e8e4f5',
                color: answers[i] !== 'unanswered' || i === current ? '#fff' : '#b0a4cc',
                transition:'background 0.4s',
                boxShadow: i === current ? '0 2px 12px #5330864d' : 'none',
              }}>
                {answers[i] === 'correct' ? '✓' : answers[i] === 'incorrect' ? '✗' : i + 1}
              </div>
            ))}
          </div>
        </div>
        <div style={{ height:6, background:'#e8e4f5', borderRadius:99, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${progress}%`,
            background:'linear-gradient(90deg,#533086,#FC9145)',
            borderRadius:99, transition:'width 0.55s cubic-bezier(.34,1.56,.64,1)',
          }} />
        </div>
      </div>

      {/* ── CARD ── */}
      {!showScore && (
        <div
          key={cardKey}
          style={{
            width:'100%', maxWidth:680,
            background:'#fff',
            borderRadius:24,
            padding:'clamp(24px,4vw,40px)',
            boxShadow:'0 6px 40px #5330861a, 0 0 0 1.5px #C1C1EA',
            zIndex:1,
            animation: mounted ? 'tfSlideUp 0.4s ease both' : 'none',
            position:'relative',
            overflow:'hidden',
          }}
        >
          {/* Accent top strip */}
          <div style={{
            position:'absolute', top:0, left:0, right:0, height:5,
            background:'linear-gradient(90deg,#533086,#4A4DC9,#FC9145)',
            backgroundSize:'200%', animation:'tfGrad 3s ease infinite',
          }} />

          {/* Statement number pill */}
          <div style={{ marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              padding:'4px 14px', borderRadius:50,
              background:'linear-gradient(135deg,#533086,#4A4DC9)',
              color:'#fff', fontSize:12, fontWeight:700, letterSpacing:'0.5px',
            }}>
              Statement {current + 1}
            </div>
          </div>

          {/* Statement text */}
          <p style={{
            margin:'0 0 32px',
            fontSize:'clamp(16px,3vw,22px)', fontWeight:600, color:'#2d1f4a',
            lineHeight:1.6, letterSpacing:'-0.2px',
          }}>
            "{stmt.statement}"
          </p>

          {/* TRUE / FALSE BUTTONS */}
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            {([true, false] as boolean[]).map(val => {
              const label   = val ? 'True' : 'False';
              const emoji   = val ? '✅' : '❌';
              const wasPicked = chosen[current] === val;
              const isAnswered = revealed;

              let bg = 'linear-gradient(135deg,#533086,#4A4DC9)';
              let border = 'transparent';
              let color = '#fff';
              let anim = '';

              if (isAnswered) {
                if (wasPicked && isCorrect)   { bg='linear-gradient(135deg,#10b981,#059669)'; anim='tfBounce 0.5s ease'; }
                if (wasPicked && isIncorrect) { bg='linear-gradient(135deg,#ef4444,#dc2626)'; anim='tfShake 0.4s ease'; }
                if (!wasPicked) { bg='#f0effe'; color='#b0a4cc'; border='#e8e4f5'; }
              }

              return (
                <button
                  key={String(val)}
                  onClick={e => handleAnswer(val, e)}
                  disabled={revealed}
                  style={{
                    flex:1, minWidth:120,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                    padding:'clamp(14px,3vw,18px) clamp(20px,4vw,32px)',
                    border: `2px solid ${border}`,
                    borderRadius:14, background:bg, color,
                    fontFamily:'Poppins,sans-serif', fontWeight:700,
                    fontSize:'clamp(15px,3vw,18px)',
                    cursor: revealed ? 'default' : 'pointer',
                    transition:'all 0.22s cubic-bezier(.34,1.56,.64,1)',
                    boxShadow: revealed ? 'none' : '0 6px 20px #5330862a',
                    animation: anim,
                    outline:'none',
                    transform: (!revealed) ? 'translateY(0)' : '',
                  }}
                  onMouseEnter={e => { if (!revealed) e.currentTarget.style.transform='translateY(-3px) scale(1.03)'; }}
                  onMouseLeave={e => { if (!revealed) e.currentTarget.style.transform='translateY(0) scale(1)'; }}
                >
                  <span style={{ fontSize:'clamp(18px,4vw,22px)' }}>{emoji}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* FEEDBACK BOX */}
          {revealed && (
            <div style={{
              marginTop:24,
              padding:'clamp(14px,3vw,20px)',
              borderRadius:14,
              background: isCorrect ? 'linear-gradient(135deg,#ecfdf5,#f0fdf9)' : 'linear-gradient(135deg,#fef2f2,#fff5f5)',
              border: `2px solid ${isCorrect ? '#10b98133' : '#ef444433'}`,
              animation:'tfReveal 0.35s cubic-bezier(.34,1.56,.64,1)',
              display:'flex', alignItems:'flex-start', gap:12,
            }}>
              <div style={{ flexShrink:0, marginTop:2 }}>
                {isCorrect
                  ? <CheckCircle size={22} color="#10b981" />
                  : <XCircle    size={22} color="#ef4444" />
                }
              </div>
              <div>
                <div style={{
                  fontWeight:700, fontSize:'clamp(13px,2.5vw,15px)',
                  color: isCorrect ? '#065f46' : '#991b1b',
                  marginBottom:4,
                }}>
                  {isCorrect ? '✨ Correct!' : '🔍 Not quite!'}
                </div>
                <div style={{ fontSize:'clamp(12px,2.2vw,14px)', color: isCorrect ? '#047857' : '#b91c1c', lineHeight:1.6, fontWeight:500 }}>
                  {isCorrect ? stmt.explanation : stmt.reason}
                </div>
              </div>
            </div>
          )}

          {/* NEXT BUTTON */}
          {revealed && (
            <div style={{ marginTop:20, display:'flex', justifyContent:'flex-end', animation:'tfFadeIn 0.3s ease 0.1s both' }}>
              <button
                onClick={handleNext}
                style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  padding:'12px 28px', border:'none', borderRadius:50,
                  background:'linear-gradient(135deg,#533086,#4A4DC9)',
                  color:'#fff', fontFamily:'Poppins,sans-serif', fontWeight:700,
                  fontSize:'clamp(13px,2.5vw,15px)',
                  cursor:'pointer', boxShadow:'0 6px 20px #4A4DC944',
                  transition:'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='scale(1.06)'; e.currentTarget.style.boxShadow='0 10px 28px #4A4DC955'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='scale(1)';   e.currentTarget.style.boxShadow='0 6px 20px #4A4DC944'; }}
              >
                {current < total - 1 ? (
                  <><span>Next</span><ChevronRight size={17} /></>
                ) : (
                  <><Award size={17} /><span>See Results</span></>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SCORE SCREEN ── */}
      {showScore && (
        <div style={{ width:'100%', maxWidth:680, zIndex:1, animation:'tfPopIn 0.5s cubic-bezier(.34,1.56,.64,1) both' }}>

          {/* Score card */}
          <div style={{
            background:'#fff', borderRadius:24,
            padding:'clamp(28px,5vw,48px)',
            boxShadow:'0 8px 48px #5330862a, 0 0 0 1.5px #C1C1EA',
            textAlign:'center', position:'relative', overflow:'hidden',
            marginBottom:20,
          }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:6, background:'linear-gradient(90deg,#533086,#FC9145)' }} />

            <div style={{ fontSize:56, marginBottom:8 }}>
              {correctCount === total ? '🏆' : correctCount >= total * 0.75 ? '🌟' : correctCount >= total * 0.5 ? '👍' : '📚'}
            </div>

            <h2 style={{ margin:'0 0 4px', fontSize:'clamp(20px,5vw,28px)', fontWeight:800, color: scoreColor }}>
              {scoreLabel}
            </h2>
            <p style={{ margin:'0 0 24px', color:'#9c89b8', fontWeight:500, fontSize:'clamp(13px,2.5vw,15px)' }}>
              You completed all {total} statements!
            </p>

            {/* Big score */}
            <div style={{ background:'linear-gradient(135deg,#f5f0ff,#fff3e8)', borderRadius:18, padding:'24px 32px', marginBottom:28, border:'2px solid #C1C1EA' }}>
              <AnimatedScore target={correctCount} total={total} />
              <div style={{ color:'#9c89b8', fontWeight:600, marginTop:6, fontSize:13 }}>statements correct</div>
              {/* Stars */}
              <div style={{ marginTop:14, display:'flex', justifyContent:'center', gap:6 }}>
                {Array.from({ length: total }).map((_, i) => (
                  <span key={i} style={{
                    fontSize:'clamp(20px,5vw,28px)',
                    filter: i < correctCount ? 'none' : 'grayscale(1) opacity(0.35)',
                    display:'inline-block',
                    animation: i < correctCount ? `tfStarPop 0.4s ease ${i * 0.12 + 0.2}s both` : 'none',
                  }}>⭐</span>
                ))}
              </div>
            </div>

            {/* Per-statement summary */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28, textAlign:'left' }}>
              {quizData.statements.map((s, i) => {
                const st = answers[i];
                const ok = st === 'correct';
                return (
                  <div key={s.id} style={{
                    display:'flex', alignItems:'flex-start', gap:10,
                    padding:'10px 14px', borderRadius:12,
                    background: ok ? '#f0fdf9' : '#fef2f2',
                    border: `1.5px solid ${ok ? '#10b98122' : '#ef444422'}`,
                    animation:`tfFadeIn 0.3s ease ${i * 0.07}s both`,
                  }}>
                    <div style={{ flexShrink:0, marginTop:1 }}>
                      {ok ? <CheckCircle size={18} color="#10b981" /> : <XCircle size={18} color="#ef4444" />}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color: ok ? '#065f46' : '#991b1b', marginBottom:2 }}>
                        Statement {s.id}
                      </div>
                      <div style={{ fontSize:12, color:'#5d4a7a', lineHeight:1.5 }}>
                        "{s.statement}"
                      </div>
                    </div>
                    <div style={{ marginLeft:'auto', flexShrink:0, fontSize:12, fontWeight:700, color: ok ? '#10b981' : '#ef4444', paddingTop:1 }}>
                      {s.answer ? 'True' : 'False'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reset */}
            <button
              onClick={reset}
              style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'14px 36px', border:'none', borderRadius:50,
                background:'linear-gradient(135deg,#533086,#4A4DC9)',
                color:'#fff', fontFamily:'Poppins,sans-serif', fontWeight:700,
                fontSize:'clamp(14px,2.5vw,16px)',
                cursor:'pointer', boxShadow:'0 6px 24px #4A4DC944',
                transition:'transform 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform='scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform='scale(1)')}
            >
              <RotateCcw size={18} /> Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrueFalseQuiz;