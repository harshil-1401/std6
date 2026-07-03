import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Design Tokens — Singularity Design System ────────────────────────────────
const DS = {
  purple:      '#533086',
  purpleLight: '#C1C1EA',
  purpleFaded: '#ede9f6',
  orange:      '#FC9145',
  orangeLight: '#FFF3E4',
  gradient:    'linear-gradient(135deg, #533086 0%, #FC9145 100%)',
  green:       '#22c55e',
  greenLight:  '#dcfce7',
  greenBorder: '#16a34a',
  bg:          '#F5F5F5',
  white:       '#ffffff',
  gray1:       '#4E4E4E',
  gray2:       '#CACACA',
  gray3:       '#EBEBEB',
  radius:      '12px',
  radiusSm:    '8px',
  radiusLg:    '20px',
  shadow:      '0 2px 12px rgba(83,48,134,0.10)',
  shadowMd:    '0 6px 24px rgba(83,48,134,0.16)',
  shadowLg:    '0 16px 48px rgba(83,48,134,0.22)',
  font:        "'Poppins', sans-serif",
};

// ─── Inline SVG Icons (no lucide dependency) ──────────────────────────────────
const IconCompass = ({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);

const IconCheck = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconRotateCcw = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-3.36"/>
  </svg>
);

const IconAward = ({ size = 34, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
);

const IconLightbulb = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18"/>
    <line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
);

const IconGrip = ({ size = 11, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1" fill={color}/><circle cx="9" cy="12" r="1" fill={color}/><circle cx="9" cy="19" r="1" fill={color}/>
    <circle cx="15" cy="5" r="1" fill={color}/><circle cx="15" cy="12" r="1" fill={color}/><circle cx="15" cy="19" r="1" fill={color}/>
  </svg>
);

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface StepCard {
  id: number;
  text: string;
  icon: string;
  hint: string;
  shortLabel: string;
}

interface MagneticCompassSequencerProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: {
      steps?: StepCard[];
      title?: string;
      subtitle?: string;
      completionMessage?: string;
    };
  };
  setStepDetails?: (details: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─── Default Data ─────────────────────────────────────────────────────────────
const DEFAULT_STEPS: StepCard[] = [
  { id:1, text:'Collect cork, needle, magnet, bowl, and water',           shortLabel:'Gather materials',    icon:'🧲', hint:'Always start by collecting all the materials you need!' },
  { id:2, text:'Stroke needle with magnet 30–40 times in one direction',  shortLabel:'Magnetise needle',    icon:'🪡', hint:'You need to magnetise the needle before testing it.' },
  { id:3, text:'Test needle with iron filings',                           shortLabel:'Test magnetisation',  icon:'🔬', hint:'Test the needle after magnetising — not before!' },
  { id:4, text:'Push needle through cork horizontally',                   shortLabel:'Insert into cork',    icon:'🍾', hint:'The cork must hold the needle before you fill the bowl.' },
  { id:5, text:'Fill bowl with water',                                    shortLabel:'Fill bowl',           icon:'🥣', hint:'Fill the bowl with water before floating the cork.' },
  { id:6, text:'Float cork in water and observe direction',               shortLabel:'Float & observe',     icon:'🧭', hint:'Floating the cork is the final step — observe the direction!' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Keyframes ────────────────────────────────────────────────────────────────
const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; }
@keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes bounceX   { 0%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(3px)} 100%{transform:translateX(0)} }
@keyframes lockPop   { 0%{transform:scale(1)} 45%{transform:scale(1.06)} 70%{transform:scale(0.97)} 100%{transform:scale(1)} }
@keyframes hintDrop  { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
@keyframes floatBob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes fall      { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(120px) rotate(400deg);opacity:0} }
@keyframes modalIn   { 0%{transform:scale(0.75);opacity:0} 65%{transform:scale(1.03);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes spinSlow  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes gradAnim  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes pulsebtn  { 0%,100%{box-shadow:0 4px 14px rgba(83,48,134,0.35)} 50%{box-shadow:0 4px 22px rgba(252,145,69,0.5)} }
@keyframes glowDrop  { 0%,100%{box-shadow:0 0 0 0 rgba(83,48,134,0.25)} 50%{box-shadow:0 0 0 6px rgba(83,48,134,0.08)} }
`;

// ─── Main Component ───────────────────────────────────────────────────────────
const MagneticCompassSequencer: React.FC<MagneticCompassSequencerProps> = ({ props: toolProps = {} }) => {
  const { additionalProps = {} } = toolProps;
  const steps    = additionalProps.steps             ?? DEFAULT_STEPS;
  const title    = additionalProps.title             ?? 'Build a Magnetic Compass';
  const subtitle = additionalProps.subtitle          ?? 'Drag each step card into the correct order';
  const doneMsg  = additionalProps.completionMessage ?? 'You built a magnetic compass! 🧭';

  const [pool,      setPool]      = useState<StepCard[]>(() => shuffle(steps));
  const [slots,     setSlots]     = useState<(StepCard|null)[]>(Array(steps.length).fill(null));
  const [locked,    setLocked]    = useState<boolean[]>(Array(steps.length).fill(false));
  const [bouncing,  setBouncing]  = useState<number|null>(null);
  const [hintText,  setHintText]  = useState<string|null>(null);
  const [hintSlot,  setHintSlot]  = useState<number|null>(null);
  const [completed, setCompleted] = useState(false);
  const [dragCard,  setDragCard]  = useState<StepCard|null>(null);
  const [dragFrom,  setDragFrom]  = useState<'pool'|number|null>(null);
  const [dragOver,  setDragOver]  = useState<'pool'|number|null>(null);

  const touchCard = useRef<StepCard|null>(null);
  const touchFrom = useRef<'pool'|number|null>(null);
  const ghostRef  = useRef<HTMLDivElement|null>(null);
  const slotRefs  = useRef<(HTMLDivElement|null)[]>([]);
  const poolRef   = useRef<HTMLDivElement|null>(null);

  // Inject keyframes once
  useEffect(() => {
    const s = document.createElement('style');
    s.innerHTML = KEYFRAMES;
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch(_){} };
  }, []);

  // Check completion
  useEffect(() => {
    if (locked.length > 0 && locked.every(Boolean)) {
      setTimeout(() => setCompleted(true), 700);
    }
  }, [locked]);

  // ── Place card ─────────────────────────────────────────────────────────────
  const tryPlace = useCallback((card: StepCard, slotIdx: number, fromOverride?: 'pool'|number|null) => {
    if (locked[slotIdx]) return;
    const from = fromOverride !== undefined ? fromOverride : dragFrom;

    if (card.id === slotIdx + 1) {
      // Correct
      setSlots(prev => {
        const ns = [...prev];
        // Clear previous slot if dragged from another slot
        if (typeof from === 'number' && from !== slotIdx) ns[from] = null;
        ns[slotIdx] = card;
        return ns;
      });
      setLocked(prev => { const nl = [...prev]; nl[slotIdx] = true; return nl; });
      setPool(p => p.filter(x => x.id !== card.id));
    } else {
      // Wrong
      setBouncing(slotIdx);
      setHintText(card.hint);
      setHintSlot(slotIdx);
      setTimeout(() => setBouncing(null), 550);
      setTimeout(() => { setHintText(null); setHintSlot(null); }, 3200);
    }
  }, [locked, dragFrom]);

  // ── Desktop drag handlers ──────────────────────────────────────────────────
  const onDragStartPool = (card: StepCard) => { setDragCard(card); setDragFrom('pool'); };
  const onDragStartSlot = (card: StepCard, idx: number) => {
    if (locked[idx]) return;
    setDragCard(card); setDragFrom(idx);
  };
  const onDropSlot = (i: number) => {
    if (!dragCard) return;
    tryPlace(dragCard, i, dragFrom);
    setDragCard(null); setDragFrom(null); setDragOver(null);
  };
  const onDropPool = () => {
    if (!dragCard || typeof dragFrom !== 'number') return;
    if (!locked[dragFrom]) {
      setSlots(prev => { const ns=[...prev]; ns[dragFrom as number]=null; return ns; });
      setPool(p => [...p, dragCard!]);
    }
    setDragCard(null); setDragFrom(null); setDragOver(null);
  };

  // ── Touch drag handlers ────────────────────────────────────────────────────
  const mkGhost = (card: StepCard, x: number, y: number) => {
    const g = document.createElement('div');
    g.innerHTML = `<span style="font-size:15px">${card.icon}</span><span style="font-size:11px;font-weight:600;color:${DS.purple};margin-left:6px">${card.shortLabel}</span>`;
    Object.assign(g.style, {
      position:'fixed', zIndex:'9999', pointerEvents:'none',
      background:DS.white, border:`2px solid ${DS.purple}`, borderRadius:'99px',
      padding:'7px 14px', display:'flex', alignItems:'center',
      boxShadow:DS.shadowMd, transform:'translate(-50%,-50%) rotate(-2deg)',
      left:`${x}px`, top:`${y}px`, fontFamily:DS.font,
    });
    document.body.appendChild(g);
    ghostRef.current = g;
  };
  const mvGhost = (x: number, y: number) => {
    if (ghostRef.current) { ghostRef.current.style.left=`${x}px`; ghostRef.current.style.top=`${y}px`; }
  };
  const rmGhost = () => {
    if (ghostRef.current) { try { document.body.removeChild(ghostRef.current); } catch(_){} ghostRef.current=null; }
  };

  const slotAt = (x: number, y: number): number|null => {
    for (let i=0; i<slotRefs.current.length; i++) {
      const r = slotRefs.current[i]?.getBoundingClientRect();
      if (r && x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) return i;
    }
    return null;
  };
  const overPool = (x: number, y: number): boolean => {
    const r = poolRef.current?.getBoundingClientRect();
    return !!r && x>=r.left && x<=r.right && y>=r.top && y<=r.bottom;
  };

  const handleTouchStart = (card: StepCard, from: 'pool'|number, e: React.TouchEvent) => {
    const t = e.touches[0];
    touchCard.current = card; touchFrom.current = from;
    mkGhost(card, t.clientX, t.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0]; mvGhost(t.clientX, t.clientY);
    const si = slotAt(t.clientX, t.clientY);
    setDragOver(si!==null ? si : overPool(t.clientX,t.clientY) ? 'pool' : null);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]; rmGhost(); setDragOver(null);
    if (!touchCard.current) return;
    const card = touchCard.current;
    const from = touchFrom.current;
    const si = slotAt(t.clientX, t.clientY);
    if (si !== null) {
      tryPlace(card, si, from);
    } else if (overPool(t.clientX, t.clientY) && typeof from === 'number') {
      if (!locked[from]) {
        setSlots(prev => { const ns=[...prev]; ns[from as number]=null; return ns; });
        setPool(p => [...p, card]);
      }
    }
    touchCard.current=null; touchFrom.current=null; setDragCard(null); setDragFrom(null);
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setPool(shuffle(steps));
    setSlots(Array(steps.length).fill(null));
    setLocked(Array(steps.length).fill(false));
    setBouncing(null); setHintText(null); setHintSlot(null); setCompleted(false);
    setDragCard(null); setDragFrom(null); setDragOver(null);
  };

  const doneCount = locked.filter(Boolean).length;
  const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

  const confetti = Array.from({length:22}, (_,i) => ({
    id:i,
    color: [DS.purple, DS.orange, DS.green, '#C1C1EA', '#FC9145'][i%5],
    left: `${3+(i*4.4)%94}%`,
    delay: `${(i*0.07).toFixed(2)}s`,
    size: 7+i%4*3,
  }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: DS.font, minHeight:'100vh', background:DS.bg,
      padding:'20px 16px', position:'relative', overflowX:'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{position:'fixed',top:-90,right:-90,width:260,height:260,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(193,193,234,0.3)0%,transparent 70%)',pointerEvents:'none',zIndex:0}} />
      <div style={{position:'fixed',bottom:-70,left:-70,width:240,height:240,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(252,145,69,0.18)0%,transparent 70%)',pointerEvents:'none',zIndex:0}} />

      <div style={{maxWidth:660, margin:'0 auto', position:'relative', zIndex:1}}>

        {/* ── Header ── */}
        <div style={{textAlign:'center', marginBottom:26, animation:'fadeUp 0.5s ease'}}>
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginBottom:10}}>
            <div style={{
              width:46, height:46, borderRadius:'50%', background:DS.gradient,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:DS.shadowMd, animation:'spinSlow 10s linear infinite', flexShrink:0,
            }}>
              <IconCompass size={22} color="#fff" />
            </div>
            <h1 style={{
              margin:0, fontSize:'clamp(17px,5vw,25px)', fontWeight:800, lineHeight:1.15,
              background:DS.gradient, backgroundSize:'200% 200%',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              animation:'gradAnim 4s ease infinite',
            }}>{title}</h1>
          </div>
          <p style={{margin:0, color:DS.gray1, fontSize:'clamp(12px,3vw,14px)', fontWeight:500}}>
            {subtitle}
          </p>

          {/* Progress bar */}
          <div style={{marginTop:14, display:'flex', alignItems:'center', gap:10, justifyContent:'center'}}>
            <div style={{
              background:DS.white, border:`1.5px solid ${DS.purpleLight}`,
              borderRadius:99, padding:'4px 14px',
              display:'flex', alignItems:'center', gap:10, boxShadow:DS.shadow,
            }}>
              <div style={{width:'min(130px,32vw)', height:6, background:DS.gray3, borderRadius:99, overflow:'hidden'}}>
                <div style={{
                  height:'100%', borderRadius:99, width:`${pct}%`,
                  background:DS.gradient,
                  transition:'width 0.55s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </div>
              <span style={{fontSize:11, fontWeight:700, color:DS.purple, whiteSpace:'nowrap'}}>
                {doneCount} / {steps.length}
              </span>
            </div>
          </div>
        </div>

        {/* ── Sequence Slots ── */}
        <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:18}}>
          {Array.from({length:steps.length}, (_,i) => (
            <SequenceSlot
              key={i}
              index={i}
              card={slots[i]}
              locked={locked[i]}
              isBouncing={bouncing===i}
              showHint={hintSlot===i}
              hintText={hintText}
              isDragOver={dragOver===i}
              onDragOver={e=>{e.preventDefault(); setDragOver(i);}}
              onDragLeave={()=>setDragOver(null)}
              onDrop={()=>onDropSlot(i)}
              onDragStartSlot={()=>{ const c=slots[i]; if(c&&!locked[i]) onDragStartSlot(c,i); }}
              onTouchStart={e=>{ const c=slots[i]; if(c&&!locked[i]) handleTouchStart(c,i,e); }}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              slotRef={el=>{ slotRefs.current[i]=el; }}
            />
          ))}
        </div>

        {/* ── Card Pool — BELOW slots ── */}
        <div
          ref={poolRef}
          onDragOver={e=>{e.preventDefault(); setDragOver('pool');}}
          onDragLeave={()=>setDragOver(null)}
          onDrop={onDropPool}
          style={{
            background: dragOver==='pool' ? DS.purpleFaded : DS.white,
            border:`2px dashed ${dragOver==='pool' ? DS.purple : DS.purpleLight}`,
            borderRadius:DS.radiusLg,
            padding:'14px 14px 16px',
            transition:'all 0.25s ease',
            boxShadow: dragOver==='pool' ? DS.shadowMd : DS.shadow,
            animation:'fadeUp 0.55s ease 0.12s both',
          }}
        >
          {/* Pool label */}
          <div style={{display:'flex', alignItems:'center', gap:7, marginBottom:12}}>
            <div style={{width:7, height:7, borderRadius:'50%', background:DS.gradient, flexShrink:0}} />
            <span style={{
              fontSize:11, fontWeight:700, color:DS.purple,
              textTransform:'uppercase', letterSpacing:'0.08em',
            }}>
              Steps to Arrange
            </span>
            <div style={{
              marginLeft:'auto', background:DS.purpleFaded, borderRadius:99,
              padding:'2px 10px', fontSize:11, fontWeight:700, color:DS.purple,
            }}>
              {pool.length} left
            </div>
          </div>

          {pool.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'14px 0',
              color:DS.green, fontWeight:700, fontSize:13,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              <IconCheck size={17} color={DS.green} /> All cards placed!
            </div>
          ) : (
            <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
              {pool.map((card, idx) => (
                <PoolCard
                  key={card.id}
                  card={card}
                  index={idx}
                  isDragging={dragCard?.id===card.id}
                  onDragStart={()=>onDragStartPool(card)}
                  onTouchStart={e=>handleTouchStart(card,'pool',e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Reset button ── */}
        <div style={{textAlign:'center', marginTop:20}}>
          <button
            onClick={reset}
            style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:DS.gradient, color:'#fff', border:'none',
              borderRadius:99, padding:'10px 28px', fontSize:13, fontWeight:700,
              fontFamily:DS.font, cursor:'pointer',
              transition:'transform 0.2s',
              animation:'pulsebtn 2.5s ease-in-out infinite',
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1.05)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)';}}
          >
            <IconRotateCcw size={14} color="#fff" /> Reset
          </button>
        </div>
      </div>

      {/* ── Completion overlay ── */}
      {completed && (
        <CompletionModal
          message={doneMsg}
          steps={steps}
          onReset={reset}
          confetti={confetti}
        />
      )}
    </div>
  );
};

// ─── Pool Card ────────────────────────────────────────────────────────────────
interface PoolCardProps {
  card: StepCard; index: number; isDragging: boolean;
  onDragStart: ()=>void;
  onTouchStart: (e:React.TouchEvent)=>void;
  onTouchMove:  (e:React.TouchEvent)=>void;
  onTouchEnd:   (e:React.TouchEvent)=>void;
}

const PoolCard: React.FC<PoolCardProps> = ({
  card, index, isDragging, onDragStart, onTouchStart, onTouchMove, onTouchEnd,
}) => (
  <div
    draggable
    onDragStart={onDragStart}
    onTouchStart={onTouchStart}
    onTouchMove={onTouchMove}
    onTouchEnd={onTouchEnd}
    style={{
      display:'flex', alignItems:'center', gap:6,
      background: isDragging ? DS.purpleFaded : DS.white,
      border:`1.5px solid ${isDragging ? DS.purple : DS.purpleLight}`,
      borderRadius:99, padding:'7px 14px',
      cursor:'grab', userSelect:'none',
      opacity: isDragging ? 0.3 : 1,
      animation:`fadeUp 0.35s ease ${index*0.05}s both`,
      boxShadow: isDragging ? 'none' : DS.shadow,
      transition:'transform 0.18s, box-shadow 0.18s, background 0.18s',
      touchAction:'none', flexShrink:0,
    }}
    onMouseEnter={e=>{
      (e.currentTarget as HTMLElement).style.transform='translateY(-2px)';
      (e.currentTarget as HTMLElement).style.boxShadow=DS.shadowMd;
    }}
    onMouseLeave={e=>{
      (e.currentTarget as HTMLElement).style.transform='translateY(0)';
      (e.currentTarget as HTMLElement).style.boxShadow=DS.shadow;
    }}
  >
    <IconGrip size={11} color={DS.gray2} />
    <span style={{fontSize:16}}>{card.icon}</span>
    <span style={{fontSize:12, fontWeight:600, color:DS.gray1, whiteSpace:'nowrap'}}>{card.shortLabel}</span>
  </div>
);

// ─── Sequence Slot ────────────────────────────────────────────────────────────
interface SequenceSlotProps {
  index: number; card: StepCard|null; locked: boolean;
  isBouncing: boolean; showHint: boolean; hintText: string|null; isDragOver: boolean;
  onDragOver: (e:React.DragEvent)=>void; onDragLeave: ()=>void; onDrop: ()=>void;
  onDragStartSlot: ()=>void;
  onTouchStart: (e:React.TouchEvent)=>void;
  onTouchMove:  (e:React.TouchEvent)=>void;
  onTouchEnd:   (e:React.TouchEvent)=>void;
  slotRef: (el:HTMLDivElement|null)=>void;
}

const SequenceSlot: React.FC<SequenceSlotProps> = ({
  index, card, locked, isBouncing, showHint, hintText, isDragOver,
  onDragOver, onDragLeave, onDrop, onDragStartSlot,
  onTouchStart, onTouchMove, onTouchEnd, slotRef,
}) => {
  const bg     = locked ? DS.greenLight : isDragOver ? DS.purpleFaded : card ? DS.orangeLight : DS.white;
  const border = locked
    ? `2px solid ${DS.greenBorder}`
    : isDragOver ? `2px solid ${DS.purple}`
    : card ? `1.5px solid ${DS.orange}`
    : `1.5px dashed ${DS.gray2}`;

  return (
    <div style={{position:'relative'}}>
      <div
        ref={slotRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          display:'flex', alignItems:'center', gap:12,
          background:bg, border, borderRadius:DS.radius,
          padding:'10px 14px', minHeight:56,
          transition:'all 0.25s ease',
          animation: isBouncing ? 'bounceX 0.5s ease' : locked ? 'lockPop 0.45s ease' : undefined,
          boxShadow: locked
            ? '0 2px 12px rgba(34,197,94,0.18)'
            : isDragOver ? DS.shadowMd : DS.shadow,
          cursor: card && !locked ? 'grab' : 'default',
        }}
      >
        {/* Step number badge */}
        <div style={{
          width:33, height:33, borderRadius:'50%', flexShrink:0,
          background: locked ? 'linear-gradient(135deg,#16a34a,#22c55e)' : DS.gradient,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: locked ? '0 2px 8px rgba(34,197,94,0.35)' : DS.shadowMd,
          transition:'background 0.3s',
        }}>
          {locked
            ? <IconCheck size={16} color="#fff" />
            : <span style={{fontSize:12, fontWeight:800, color:'#fff'}}>{index+1}</span>}
        </div>

        {card ? (
          <div
            draggable={!locked}
            onDragStart={!locked ? onDragStartSlot : undefined}
            onTouchStart={!locked ? onTouchStart : undefined}
            onTouchMove={!locked ? onTouchMove : undefined}
            onTouchEnd={!locked ? onTouchEnd : undefined}
            style={{flex:1, display:'flex', alignItems:'center', gap:10, touchAction:'none'}}
          >
            <span style={{fontSize:20, flexShrink:0}}>{card.icon}</span>
            <span style={{
              fontSize:'clamp(11px,3vw,13px)',
              fontWeight: locked ? 700 : 600,
              color: locked ? '#15803d' : DS.gray1,
              lineHeight:1.35, flex:1,
            }}>{card.text}</span>
            {locked && (
              <div style={{
                background:DS.greenBorder, borderRadius:'50%',
                width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, animation:'lockPop 0.4s ease',
              }}>
                <IconCheck size={13} color="#fff" />
              </div>
            )}
          </div>
        ) : (
          <span style={{
            fontSize:'clamp(11px,3vw,13px)',
            color:DS.gray2, fontStyle:'italic', fontWeight:500,
          }}>
            Drop step {index+1} here…
          </span>
        )}
      </div>

      {/* Hint bubble */}
      {showHint && hintText && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:57, right:0, zIndex:20,
          background:'#fffbeb', border:`1.5px solid ${DS.orange}`,
          borderRadius:`0 ${DS.radius} ${DS.radius} ${DS.radius}`,
          padding:'8px 12px', boxShadow:'0 4px 16px rgba(252,145,69,0.2)',
          animation:'hintDrop 0.3s ease',
          display:'flex', alignItems:'flex-start', gap:6,
        }}>
          <IconLightbulb size={14} color={DS.orange} />
          <span style={{fontSize:12, fontWeight:600, color:'#92400e', lineHeight:1.4}}>
            {hintText}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Completion Modal ─────────────────────────────────────────────────────────
interface CompletionModalProps {
  message: string; steps: StepCard[]; onReset: ()=>void;
  confetti: {id:number; color:string; left:string; delay:string; size:number}[];
}

const CompletionModal: React.FC<CompletionModalProps> = ({ message, steps, onReset, confetti }) => (
  <div style={{
    position:'fixed', inset:0, zIndex:1000,
    background:'rgba(83,48,134,0.5)', backdropFilter:'blur(8px)',
    display:'flex', alignItems:'center', justifyContent:'center', padding:16,
  }}>
    {/* Confetti */}
    {confetti.map(c => (
      <div key={c.id} style={{
        position:'fixed', top:0, left:c.left,
        width:c.size, height:c.size,
        background:c.color, borderRadius:3, pointerEvents:'none', opacity:0,
        animation:`fall 2s ease ${c.delay} forwards`,
      }} />
    ))}

    <div style={{
      background:DS.white, borderRadius:DS.radiusLg,
      padding:'30px 22px', maxWidth:480, width:'100%',
      boxShadow:'0 24px 64px rgba(83,48,134,0.3)',
      animation:'modalIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      border:`2px solid ${DS.purpleLight}`,
      maxHeight:'90vh', overflowY:'auto',
    }}>
      {/* Trophy */}
      <div style={{textAlign:'center', marginBottom:22}}>
        <div style={{
          width:70, height:70, borderRadius:'50%', margin:'0 auto 14px',
          background:DS.gradient,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:DS.shadowLg, animation:'floatBob 2s ease-in-out infinite',
        }}>
          <IconAward size={34} color="#fff" />
        </div>
        <h2 style={{
          margin:'0 0 6px', fontSize:'clamp(17px,5vw,22px)', fontWeight:800,
          background:DS.gradient,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
        }}>{message}</h2>
        <p style={{margin:0, color:DS.gray1, fontSize:13, fontWeight:500}}>
          Here's the complete procedure you followed:
        </p>
      </div>

      {/* Ordered steps */}
      <div style={{display:'flex', flexDirection:'column', gap:6, marginBottom:18}}>
        {steps.map((step, i) => (
          <div key={step.id} style={{
            display:'flex', alignItems:'center', gap:10,
            background:DS.greenLight, border:`1.5px solid ${DS.greenBorder}`,
            borderRadius:DS.radiusSm, padding:'8px 12px',
            animation:`fadeUp 0.35s ease ${i*0.07}s both`,
          }}>
            <div style={{
              width:23, height:23, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,#16a34a,#22c55e)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:800, color:'#fff',
            }}>{i+1}</div>
            <span style={{fontSize:17, flexShrink:0}}>{step.icon}</span>
            <span style={{fontSize:12, fontWeight:600, color:'#15803d', lineHeight:1.35}}>{step.text}</span>
          </div>
        ))}
      </div>

      {/* Science note */}
      <div style={{
        background:DS.orangeLight, border:`1.5px solid ${DS.orange}`,
        borderRadius:DS.radiusSm, padding:'11px 13px', marginBottom:18,
        display:'flex', gap:8,
      }}>
        <span style={{fontSize:17, flexShrink:0}}>🧭</span>
        <span style={{fontSize:12, fontWeight:600, color:'#7c3100', lineHeight:1.5}}>
          <strong>What you built:</strong> A homemade magnetic compass! The magnetised needle floating on cork aligns along Earth's north-south magnetic field.
        </span>
      </div>

      <div style={{textAlign:'center'}}>
        <button
          onClick={onReset}
          style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:DS.gradient, color:'#fff', border:'none',
            borderRadius:99, padding:'11px 30px', fontSize:13, fontWeight:700,
            fontFamily:DS.font, cursor:'pointer', boxShadow:DS.shadowMd,
            transition:'transform 0.2s',
          }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1.05)';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)';}}
        >
          <IconRotateCcw size={14} color="#fff" /> Try Again
        </button>
      </div>
    </div>
  </div>
);

export default MagneticCompassSequencer;