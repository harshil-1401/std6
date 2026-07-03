import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, RotateCcw, ChevronDown } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface BlankOption {
  id: string;
  options: string[];
  correctAnswer: string;
  hint: string;
}

interface QuizSentence {
  id: number;
  template: string[];
  blanks: BlankOption[];
}

interface QuizData {
  title: string;
  subtitle: string;
  sentences: QuizSentence[];
}

interface BlankState {
  selected: string | null;
  status: 'idle' | 'correct' | 'incorrect';
  shake: boolean;
  bounce: boolean;
}

// Active dropdown state — stored at root level so only one is open at a time
interface ActiveDropdown {
  blankId: string;
  top: number;
  left: number;
  width: number;
  options: string[];
  openUpward: boolean;
}

interface MagnetQuizProps {
  props?: {
    additionalProps?: {
      quizData?: QuizData;
      showHints?: boolean;
      celebrateOnComplete?: boolean;
    };
  };
}

// ─────────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────────

const defaultQuizData: QuizData = {
  title: 'Exploring Magnets',
  subtitle: 'Select the correct word from each dropdown to complete the sentences.',
  sentences: [
    {
      id: 1,
      template: ['Unlike poles of two magnets ', ' each other, whereas like poles ', ' each other.'],
      blanks: [
        { id: 's1b1', options: ['attract', 'repel', 'ignore'],    correctAnswer: 'attract',            hint: 'Activity 4.5 — N and S poles face each other. What happens?' },
        { id: 's1b2', options: ['attract', 'repel', 'ignore'],    correctAnswer: 'repel',              hint: 'Activity 4.5 — N–N or S–S poles pushed each other away.' },
      ],
    },
    {
      id: 2,
      template: ['The materials attracted towards a magnet are called ', '.'],
      blanks: [
        { id: 's2b1', options: ['non-magnetic materials', 'magnetic materials', 'lodestones'], correctAnswer: 'magnetic materials', hint: 'Activity 4.1 — iron, nickel, and cobalt all stuck to the magnet.' },
      ],
    },
    {
      id: 3,
      template: ['The needle of a magnetic compass rests along the ', ' direction.'],
      blanks: [
        { id: 's3b1', options: ['east-west', 'north-south', 'up-down'], correctAnswer: 'north-south', hint: "Activity 4.3 — a freely suspended magnet always aligns with Earth's field." },
      ],
    },
    {
      id: 4,
      template: ['A magnet always has ', ' poles.'],
      blanks: [
        { id: 's4b1', options: ['one', 'two', 'three'], correctAnswer: 'two', hint: 'Even a broken piece of magnet still has both a North AND a South pole.' },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────
// PARTICLES (no external deps)
// ─────────────────────────────────────────────────────────────────

interface Particle { id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; }

const ParticleBurst: React.FC<{ active: boolean; x: number; y: number }> = ({ active, x, y }) => {
  const [pts, setPts] = useState<Particle[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    if (!active) return;
    const colors = ['#FC9145','#533086','#4A4DC9','#C1C1EA','#FF7212','#10b981'];
    setPts(Array.from({ length: 20 }, (_, i) => ({
      id: i, x, y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10 - 4,
      color: colors[i % colors.length],
      size: Math.random() * 9 + 4,
      life: 1,
    })));
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      setPts(prev => {
        const next = prev
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 12 * dt, life: p.life - dt * 2 }))
          .filter(p => p.life > 0);
        if (next.length) raf.current = requestAnimationFrame(tick);
        return next;
      });
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, x, y]);

  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:99999 }}>
      {pts.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:p.x, top:p.y,
          width:p.size, height:p.size, borderRadius:'50%',
          background:p.color, opacity:p.life,
          transform:'translate(-50%,-50%)',
        }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// DROPDOWN TRIGGER (pure button, no menu rendered here)
// ─────────────────────────────────────────────────────────────────

const DropdownTrigger: React.FC<{
  blank: BlankOption;
  state: BlankState;
  isOpen: boolean;
  onOpen: (rect: DOMRect) => void;
  onClose: () => void;
}> = ({ blank, state, isOpen, onOpen, onClose }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const isCorrect  = state.status === 'correct';
  const isIncorrect = state.status === 'incorrect';

  const borderColor = isCorrect  ? '#10b981'
                    : isIncorrect ? '#ef4444'
                    : isOpen      ? '#533086'
                    :               '#C1C1EA';
  const bgColor   = isCorrect  ? '#ecfdf5' : isIncorrect ? '#fef2f2' : '#fff';
  const textColor = isCorrect  ? '#065f46' : isIncorrect ? '#991b1b' : state.selected ? '#533086' : '#9ca3af';

  const handleClick = () => {
    if (isCorrect) return;
    if (isOpen) { onClose(); return; }
    if (btnRef.current) onOpen(btnRef.current.getBoundingClientRect());
  };

  return (
    <button
      ref={btnRef}
      data-blankid={blank.id}
      onClick={handleClick}
      style={{
        display:'inline-flex', alignItems:'center', gap:6,
        minWidth:160, padding:'6px 14px',
        border:`2px solid ${borderColor}`,
        borderRadius:10, background:bgColor, color:textColor,
        fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:14,
        cursor:isCorrect ? 'default' : 'pointer',
        transition:'all 0.22s cubic-bezier(.34,1.56,.64,1)',
        boxShadow: isOpen       ? `0 0 0 4px ${borderColor}22`
                 : isCorrect    ? '0 4px 14px #10b98122'
                 : isIncorrect  ? '0 4px 14px #ef444422'
                 : 'none',
        transform: state.bounce ? 'scale(1.1)' : 'scale(1)',
        animation: state.shake  ? 'ddShake 0.38s ease' : 'none',
        outline:'none', whiteSpace:'nowrap', verticalAlign:'middle',
        margin:'0 3px',
      }}
    >
      <span style={{ flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis' }}>
        {state.selected ?? 'Select answer…'}
      </span>
      {isCorrect
        ? <CheckCircle size={16} color="#10b981" style={{ flexShrink:0 }} />
        : isIncorrect
          ? <XCircle size={16} color="#ef4444" style={{ flexShrink:0 }} />
          : <ChevronDown size={14} color="#9ca3af" style={{ flexShrink:0, transform:isOpen?'rotate(180deg)':'rotate(0)', transition:'transform 0.2s' }} />
      }
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

const MagnetQuiz: React.FC<MagnetQuizProps> = ({ props: compProps = {} }) => {
  const { additionalProps = {} } = compProps;
  const quizData: QuizData = additionalProps?.quizData            ?? defaultQuizData;
  const showHints: boolean  = additionalProps?.showHints           ?? true;
  const celebrate: boolean  = additionalProps?.celebrateOnComplete ?? true;

  const initStates = (): Record<string, BlankState> => {
    const m: Record<string, BlankState> = {};
    quizData.sentences.forEach(s =>
      s.blanks.forEach(b => { m[b.id] = { selected:null, status:'idle', shake:false, bounce:false }; })
    );
    return m;
  };

  const [blankStates,     setBlankStates]     = useState<Record<string, BlankState>>(initStates);
  const [activeDropdown,  setActiveDropdown]   = useState<ActiveDropdown | null>(null);
  const [hintBlankId,     setHintBlankId]      = useState<string | null>(null);
  const [hintRect,        setHintRect]         = useState<DOMRect | null>(null);
  const [particle,        setParticle]         = useState({ active:false, x:0, y:0 });
  const [showScore,       setShowScore]        = useState(false);
  const [score,           setScore]            = useState(0);
  const [mounted,         setMounted]          = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalBlanks  = Object.keys(blankStates).length;
  const correctCount = Object.values(blankStates).filter(s => s.status === 'correct').length;
  const progress     = totalBlanks > 0 ? (correctCount / totalBlanks) * 100 : 0;

  // Inject keyframes once
  useEffect(() => {
    const id = 'mq-styles';
    if (document.getElementById(id)) { setMounted(true); return; }
    const el = document.createElement('style');
    el.id = id;
    el.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      @keyframes ddFadeIn  { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      @keyframes ddShake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      @keyframes mqSlideIn { from{opacity:0;transform:translateX(-22px)} to{opacity:1;transform:translateX(0)} }
      @keyframes mqPopIn   { 0%{opacity:0;transform:scale(0.82) translateY(20px)} 70%{transform:scale(1.04) translateY(-2px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      @keyframes mqGrad    { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      @keyframes mqSpin    { to{transform:rotate(360deg)} }
    `;
    document.head.appendChild(el);
    setTimeout(() => setMounted(true), 40);
    return () => { const e = document.getElementById(id); if (e) e.remove(); };
  }, []);

  // Close dropdown on scroll or resize
  useEffect(() => {
    const close = () => setActiveDropdown(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, []);

  // ── Open a dropdown: compute fixed position from button's bounding rect ──
  const openDropdown = useCallback((blankId: string, blank: BlankOption, rect: DOMRect) => {
    const MENU_H = blank.options.length * 44; // approximate
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MENU_W = Math.max(rect.width, 190);

    const spaceBelow = vh - rect.bottom - 8;
    const openUpward = spaceBelow < MENU_H && rect.top > MENU_H;

    const top  = openUpward ? rect.top  - MENU_H - 6 : rect.bottom + 6;
    const left = Math.min(rect.left, vw - MENU_W - 8);

    setActiveDropdown({ blankId, top, left, width: MENU_W, options: blank.options, openUpward });
  }, []);

  // ── Select an answer ──
  const handleSelect = useCallback((blankId: string, value: string, blank: BlankOption, triggerRect?: DOMRect) => {
    const correct = value === blank.correctAnswer;
    setActiveDropdown(null);

    setBlankStates(prev => ({
      ...prev,
      [blankId]: { selected:value, status: correct?'correct':'incorrect', shake:!correct, bounce:correct },
    }));

    if (correct && celebrate) {
      const cx = triggerRect ? triggerRect.left + triggerRect.width / 2 : window.innerWidth / 2;
      const cy = triggerRect ? triggerRect.top  + triggerRect.height / 2 : window.innerHeight / 2;
      setParticle({ active:true, x:cx, y:cy });
      setTimeout(() => setParticle(p => ({ ...p, active:false })), 1600);
    }

    if (!correct && showHints && triggerRect) {
      setHintBlankId(blankId);
      setHintRect(triggerRect);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setHintBlankId(null), 4000);
    }

    setTimeout(() => {
      setBlankStates(prev => ({ ...prev, [blankId]: { ...prev[blankId], shake:false, bounce:false } }));
    }, 460);

    // Completion check
    setTimeout(() => {
      setBlankStates(current => {
        if (Object.values(current).every(s => s.status === 'correct')) {
          setScore(Object.values(current).length);
          setTimeout(() => setShowScore(true), 360);
        }
        return current;
      });
    }, 80);
  }, [celebrate, showHints]);

  const reset = () => {
    setBlankStates(initStates());
    setShowScore(false);
    setScore(0);
    setActiveDropdown(null);
    setHintBlankId(null);
  };

  // All blanks data flattened for hint lookup
  const allBlanks: Record<string, BlankOption> = {};
  quizData.sentences.forEach(s => s.blanks.forEach(b => { allBlanks[b.id] = b; }));

  // Compute hint position
  const hintBlank  = hintBlankId ? allBlanks[hintBlankId] : null;
  const hintVw     = typeof window !== 'undefined' ? window.innerWidth : 800;
  const hintTop    = hintRect ? hintRect.bottom + 10 : 0;
  const hintLeft   = hintRect ? Math.min(hintRect.left, hintVw - 292) : 0;

  return (
    <div
      style={{ minHeight:'100vh', width:'100%', background:'linear-gradient(155deg,#f0effe 0%,#fff8f2 55%,#f5f0ff 100%)', fontFamily:'Poppins,sans-serif', display:'flex', flexDirection:'column', alignItems:'center', padding:'28px 16px 56px', boxSizing:'border-box' }}
      // Close dropdown when clicking the backdrop
      onClick={() => setActiveDropdown(null)}
    >
      <ParticleBurst active={particle.active} x={particle.x} y={particle.y} />

      {/* ── BG blobs ── */}
      <div style={{ position:'fixed', top:-100, right:-100, width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle,#C1C1EA44 0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:-80, left:-80, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,#FFF3E444 0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      {/* ── FLOATING DROPDOWN ── fixed position, always on top, never clipped ── */}
      {activeDropdown && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position:'fixed',
            top: activeDropdown.top,
            left: activeDropdown.left,
            width: activeDropdown.width,
            zIndex: 99998,
            background:'#fff',
            border:'2px solid #C1C1EA',
            borderRadius:14,
            overflow:'hidden',
            boxShadow:'0 12px 40px rgba(83,48,134,0.18)',
            animation:'ddFadeIn 0.15s ease',
          }}
        >
          {activeDropdown.options.map(opt => (
            <OptionRow
              key={opt}
              label={opt}
              onPick={() => {
                const blank = allBlanks[activeDropdown.blankId];
                const triggerEl = document.querySelector(`[data-blankid="${activeDropdown.blankId}"]`) as HTMLElement | null;
                const rect = triggerEl ? triggerEl.getBoundingClientRect() : undefined;
                handleSelect(activeDropdown.blankId, opt, blank, rect);
              }}
            />
          ))}
        </div>
      )}

      {/* ── FLOATING HINT BUBBLE ── also fixed, never clipped ── */}
      {hintBlank && hintRect && (
        <div
          style={{
            position:'fixed',
            top: hintTop,
            left: hintLeft,
            zIndex:99997,
            background:'linear-gradient(135deg,#FFF3E4,#fff)',
            border:'1.5px solid #FC9145',
            borderRadius:12,
            padding:'9px 14px',
            maxWidth:280,
            fontSize:12.5,
            fontFamily:'Poppins,sans-serif',
            color:'#7c3d00',
            boxShadow:'0 6px 20px #FC914522',
            animation:'ddFadeIn 0.2s ease',
            lineHeight:1.5,
            pointerEvents:'none',
          }}
        >
          <strong>💡 Hint:</strong> {hintBlank.hint}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ width:'100%', maxWidth:780, textAlign:'center', marginBottom:28, zIndex:1, opacity:mounted?1:0, transform:mounted?'translateY(0)':'translateY(-18px)', transition:'all 0.5s ease' }}>
        <div style={{ fontSize:44, marginBottom:6 }}>🧲</div>
        <h1 style={{ margin:0, lineHeight:1.2, letterSpacing:'-0.5px', fontSize:'clamp(22px,5vw,34px)', fontWeight:800, background:'linear-gradient(135deg,#533086 0%,#4A4DC9 50%,#FC9145 100%)', backgroundSize:'200% 200%', animation:'mqGrad 4s ease infinite', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          {quizData.title}
        </h1>
        <p style={{ margin:'10px 0 0', color:'#7c6ea0', fontSize:'clamp(13px,2.5vw,15px)', fontWeight:500 }}>
          {quizData.subtitle}
        </p>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{ width:'100%', maxWidth:780, marginBottom:28, zIndex:1, opacity:mounted?1:0, transition:'opacity 0.5s 0.1s' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:12, fontWeight:600, color:'#9c89b8' }}>Progress</span>
          <span style={{ fontSize:12, fontWeight:700, color:'#533086' }}>{correctCount} / {totalBlanks} correct</span>
        </div>
        <div style={{ height:8, background:'#e8e4f5', borderRadius:99, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#533086,#FC9145)', borderRadius:99, transition:'width 0.5s cubic-bezier(.34,1.56,.64,1)' }} />
        </div>
      </div>

      {/* ── SENTENCE CARDS ── */}
      <div style={{ width:'100%', maxWidth:780, display:'flex', flexDirection:'column', gap:20, zIndex:1 }}>
        {quizData.sentences.map((sentence, si) => {
          const allDone = sentence.blanks.every(b => blankStates[b.id]?.status === 'correct');
          return (
            <div
              key={sentence.id}
              style={{
                background: allDone ? 'linear-gradient(135deg,#ecfdf5,#f0fdf9)' : '#fff',
                borderRadius:20,
                padding:'clamp(16px,3vw,26px)',
                boxShadow: allDone ? '0 4px 24px #10b98122,0 0 0 2px #10b98133' : '0 4px 24px #5330861a,0 0 0 1.5px #C1C1EA',
                transition:'all 0.4s ease',
                opacity: mounted ? 1 : 0,
                animation: mounted ? `mqSlideIn 0.4s ease ${si * 0.09}s both` : 'none',
                position:'relative',
                // ✅ NO overflow:hidden — the floating dropdown is fixed-position anyway,
                //    but keeping this open avoids any stacking-context issues
              }}
              onClick={e => e.stopPropagation()} // don't close dropdown when clicking card
            >
              {allDone && (
                <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'linear-gradient(90deg,#10b981,#059669)', borderRadius:'20px 20px 0 0' }} />
              )}

              {/* Badge */}
              <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', marginBottom:14, background: allDone?'#10b981':'linear-gradient(135deg,#533086,#4A4DC9)', color:'#fff', fontSize:12, fontWeight:700, transition:'background 0.4s' }}>
                {allDone ? '✓' : si + 1}
              </div>

              {/* Sentence */}
              <div style={{ fontSize:'clamp(14px,2.5vw,17px)', lineHeight:2.8, color:'#3d2961', fontWeight:500 }}>
                {sentence.template.map((part, pi) => (
                  <React.Fragment key={pi}>
                    <span>{part}</span>
                    {pi < sentence.blanks.length && (() => {
                      const b = sentence.blanks[pi];
                      const st = blankStates[b.id] ?? { selected:null, status:'idle', shake:false, bounce:false };
                      const isThisOpen = activeDropdown?.blankId === b.id;
                      return (
                        <DropdownTrigger
                          key={b.id}
                          blank={b}
                          state={st}
                          isOpen={isThisOpen}
                          onOpen={(rect) => openDropdown(b.id, b, rect)}
                          onClose={() => setActiveDropdown(null)}
                        />
                      );
                    })()}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── RESET ── */}
      {!showScore && (
        <div style={{ marginTop:32, zIndex:1, opacity:mounted?1:0, transition:'opacity 0.5s 0.45s' }}>
          <ResetButton onClick={reset} />
        </div>
      )}

      {/* ── SCORE MODAL ── */}
      {showScore && (
        <div style={{ position:'fixed', inset:0, background:'#00000060', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99995, padding:16, backdropFilter:'blur(5px)' }}>
          <div style={{ background:'#fff', borderRadius:26, padding:'clamp(28px,5vw,50px)', textAlign:'center', maxWidth:420, width:'100%', animation:'mqPopIn 0.5s cubic-bezier(.34,1.56,.64,1) both', boxShadow:'0 24px 64px #5330864d', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:6, background:'linear-gradient(90deg,#533086,#FC9145)' }} />
            <div style={{ fontSize:62, marginBottom:8, display:'inline-block', animation:'mqSpin 3s linear infinite' }}>🏆</div>
            <h2 style={{ margin:'0 0 8px', fontSize:'clamp(22px,5vw,30px)', fontWeight:800, background:'linear-gradient(135deg,#533086,#FC9145)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Excellent Work!
            </h2>
            <p style={{ margin:'0 0 22px', color:'#7c6ea0', fontWeight:500, fontSize:15 }}>
              You answered all questions correctly!
            </p>
            <div style={{ background:'linear-gradient(135deg,#f5f0ff,#fff3e8)', borderRadius:16, padding:'18px 30px', marginBottom:24, border:'2px solid #C1C1EA' }}>
              <div style={{ fontSize:50, fontWeight:800, color:'#533086', lineHeight:1 }}>
                {score}<span style={{ fontSize:26, color:'#C1C1EA' }}>/{totalBlanks}</span>
              </div>
              <div style={{ color:'#9c89b8', fontWeight:600, marginTop:4, fontSize:13 }}>blanks filled correctly</div>
              <div style={{ marginTop:12, fontSize:24 }}>
                {Array.from({ length: score }).map((_, i) => (
                  <span key={i} style={{ display:'inline-block', animation:`mqPopIn 0.3s ease ${i*0.08}s both` }}>⭐</span>
                ))}
              </div>
            </div>
            <ResetButton onClick={reset} large />
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// SMALL REUSABLE BITS
// ─────────────────────────────────────────────────────────────────

const OptionRow: React.FC<{ label: string; onPick: () => void }> = ({ label, onPick }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onPick}
      style={{
        padding:'11px 18px',
        fontFamily:'Poppins,sans-serif', fontWeight:500, fontSize:14,
        color:      hov ? '#fff' : '#533086',
        background: hov ? 'linear-gradient(135deg,#533086,#4A4DC9)' : 'transparent',
        cursor:'pointer',
        transition:'background 0.13s, color 0.13s',
        borderBottom:'1px solid #f0effe',
        userSelect:'none',
      }}
    >
      {label}
    </div>
  );
};

const ResetButton: React.FC<{ onClick: () => void; large?: boolean }> = ({ onClick, large }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'inline-flex', alignItems:'center', gap:8,
        padding: large ? '14px 32px' : '10px 26px',
        border: large ? 'none' : '2px solid #C1C1EA',
        borderRadius:50,
        background: large
          ? 'linear-gradient(135deg,#533086,#4A4DC9)'
          : hov
            ? 'linear-gradient(135deg,#533086,#4A4DC9)'
            : '#fff',
        color: large ? '#fff' : hov ? '#fff' : '#533086',
        fontFamily:'Poppins,sans-serif', fontWeight: large ? 700 : 600,
        fontSize: large ? 15 : 13,
        cursor:'pointer',
        boxShadow: large ? '0 6px 24px #4A4DC944' : 'none',
        transition:'all 0.22s',
        transform: hov ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <RotateCcw size={large ? 18 : 15} />
      {large ? 'Try Again' : 'Reset'}
    </button>
  );
};

export default MagnetQuiz;