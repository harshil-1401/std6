import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────
const SvgCheck: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const SvgRotate: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// IRON FILING DOTS
// ─────────────────────────────────────────────────────────────────
const FilingDots: React.FC<{ cx: number; cy: number; r?: number }> = ({ cx, cy, r = 12 }) => {
  const pts = [[0,-1],[.45,-.75],[.9,-.3],[.9,.3],[.45,.75],[0,1],[-.45,.75],[-.9,.3],[-.9,-.3],[-.45,-.75],[.3,-.5],[-.3,-.5],[.5,0],[-.5,0],[.3,.5],[-.3,.5]];
  return (
    <g opacity="0.45">
      {pts.map(([dx, dy], i) => (
        <ellipse key={i} cx={cx+dx*r} cy={cy+dy*r} rx={1.6} ry={0.9}
          transform={`rotate(${(Math.atan2(dy,dx)*180/Math.PI)+90},${cx+dx*r},${cy+dy*r})`} fill="#64748b"/>
      ))}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type PoleId = 'N' | 'S';
type SlotId = 'bar-n'|'bar-s'|'u-n'|'u-s'|'ring-n'|'ring-s';
interface SlotState { pole: PoleId|null; correct: boolean; wrong: boolean; }
type AllSlots = Record<SlotId, SlotState>;
interface Props { props?: { themeColor?: string; additionalProps?: { title?: string; subtitle?: string; }; }; }

const CORRECT: Record<SlotId, PoleId> = { 'bar-n':'N','bar-s':'S','u-n':'N','u-s':'S','ring-n':'N','ring-s':'S' };
const HINTS: Record<SlotId, string> = {
  'bar-n':'Iron filings cluster at the left end — that is the North pole!',
  'bar-s':'Iron filings cluster at the right end — that is the South pole!',
  'u-n':'Left arm tip has filings — that is the North pole!',
  'u-s':'Right arm tip has filings — that is the South pole!',
  'ring-n':'Filings cluster at the top face — that is the North pole!',
  'ring-s':'Filings cluster at the bottom — that is the South pole!',
};

// ─────────────────────────────────────────────────────────────────
// STYLE INJECTION
// ─────────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('mpl-styles')) return;
  const s = document.createElement('style');
  s.id = 'mpl-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;}
    @keyframes mpl-lockIn  {0%{transform:scale(1)}35%{transform:scale(1.2)}65%{transform:scale(.95)}100%{transform:scale(1)}}
    @keyframes mpl-shake   {0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}50%{transform:translateX(8px)}80%{transform:translateX(-4px)}}
    @keyframes mpl-fadeUp  {from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes mpl-fadeScale{from{transform:scale(.88);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes mpl-float   {0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    @keyframes mpl-confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(280px) rotate(720deg);opacity:0}}
    @keyframes mpl-pop     {0%{transform:scale(.8);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    .mpl-pill{cursor:grab;user-select:none;transition:transform .13s ease,box-shadow .13s ease;}
    .mpl-pill:hover{transform:translateY(-2px) scale(1.08);}
    .mpl-pill:active{cursor:grabbing;transform:scale(.94);}
    .mpl-pill.dragging{opacity:.3;transform:scale(.9);}
    .mpl-slot{transition:all .15s ease;-webkit-tap-highlight-color:transparent;}
    .mpl-slot.over{border-color:#f59e0b!important;background:#fffbeb!important;box-shadow:0 0 0 3px rgba(245,158,11,.3)!important;}
    .mpl-tap-pill{cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;transition:transform .13s ease,box-shadow .13s ease;}
    .mpl-tap-pill:active{transform:scale(.94);}
    .mpl-ghost{position:fixed;pointer-events:none;z-index:9998;transform:rotate(5deg) scale(1.1);box-shadow:0 12px 32px rgba(0,0,0,.22);}
  `;
  document.head.appendChild(s);
};

// ─────────────────────────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────────────────────────
const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const pal = ['#f59e0b','#533086','#FC9145','#4A4DC9','#10b981','#ef4444'];
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999 }}>
      {Array.from({ length:30 },(_,i)=>({ left:Math.random()*100, delay:Math.random()*.7, color:pal[i%pal.length], size:6+Math.random()*9, round:Math.random()>.5 })).map((p,i)=>(
        <div key={i} style={{ position:'absolute', left:`${p.left}%`, top:'-14px', width:p.size, height:p.size, backgroundColor:p.color, borderRadius:p.round?'50%':'3px', animation:`mpl-confetti 1.8s ease-in ${p.delay}s forwards`}}/>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// DRAG GHOST
// ─────────────────────────────────────────────────────────────────
const DragGhost: React.FC<{ pole: PoleId|null; x:number; y:number; active:boolean }> = ({ pole, x, y, active }) => {
  if (!pole || !active) return null;
  const isN = pole === 'N';
  return (
    <div className="mpl-ghost" style={{
      left:x-30, top:y-30, width:60, height:60, borderRadius:14,
      background: isN?'linear-gradient(135deg,#dc2626,#ef4444)':'linear-gradient(135deg,#1d4ed8,#3b82f6)',
      border:`3px solid ${isN?'#b91c1c':'#1e40af'}`,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:900, fontSize:28, color:'#fff' }}>{pole}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// SLOT COMPONENT — used in both modes
// ─────────────────────────────────────────────────────────────────
const Slot: React.FC<{
  slotId: SlotId; label: string; state: SlotState;
  isActive: boolean; // mobile tap mode: a pole is selected
  isOver: boolean;   // desktop drag mode: dragging over this slot
  size?: number;
  onTap?: (id:SlotId) => void;
  onDrop?: (id:SlotId) => void;
  onDragOver?: (id:SlotId) => void;
  onDragLeave?: () => void;
}> = ({ slotId, label, state, isActive, isOver, size=60, onTap, onDrop, onDragOver, onDragLeave }) => {
  const { pole, correct, wrong } = state;
  const isN = pole === 'N';
  const highlighted = (isActive || isOver) && !correct;
  return (
    <div
      className={`mpl-slot${isOver && !correct ? ' over' : ''}`}
      onClick={() => onTap && !correct && onTap(slotId)}
      onDrop={e => { e.preventDefault(); onDrop && onDrop(slotId); }}
      onDragOver={e => { e.preventDefault(); onDragOver && onDragOver(slotId); }}
      onDragLeave={onDragLeave}
      style={{
        width:size, minWidth:size, height:size, borderRadius:12, flexShrink:0,
        border:`2.5px ${correct?'solid':'dashed'} ${correct?'#10b981':wrong?'#ef4444':highlighted?'#f59e0b':'#cbd5e1'}`,
        background: correct
          ? (isN?'linear-gradient(135deg,#fee2e2,#fecaca)':'linear-gradient(135deg,#dbeafe,#bfdbfe)')
          : wrong ? '#fef2f2' : highlighted ? '#fffbeb' : '#f8fafc',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
        cursor: correct ? 'default' : 'pointer',
        animation: correct ? 'mpl-lockIn .4s ease-out' : wrong ? 'mpl-shake .4s ease-out' : 'none',
        boxShadow: highlighted ? '0 0 0 3px rgba(245,158,11,.25)' : 'none',
      }}
    >
      {pole ? (
        <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:900, fontSize:size*.42, color:isN?'#dc2626':'#1d4ed8', lineHeight:1 }}>{pole}</span>
      ) : (
        <span style={{ fontFamily:'Poppins,sans-serif', fontSize:highlighted?20:18, fontWeight:700, color:highlighted?'#f59e0b':'#cbd5e1', lineHeight:1 }}>
          {highlighted ? '↓' : '?'}
        </span>
      )}
      <span style={{ fontFamily:'Poppins,sans-serif', fontSize:9, fontWeight:600, color:correct?(isN?'#dc2626':'#1d4ed8'):'#94a3b8', lineHeight:1, marginTop:1 }}>
        {label}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAGNET DIAGRAMS — 3 variants
// ─────────────────────────────────────────────────────────────────

interface MagnetProps {
  nState: SlotState; sState: SlotState;
  selectedPole: PoleId|null; // mobile
  overSlot: SlotId|null;     // desktop
  onTap: (id:SlotId) => void;
  onDrop: (id:SlotId) => void;
  onDragOver: (id:SlotId) => void;
  onDragLeave: () => void;
}

const BarDiagram: React.FC<MagnetProps> = ({ nState, sState, selectedPole, overSlot, onTap, onDrop, onDragOver, onDragLeave }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, width:'100%' }}>
    <Slot slotId="bar-n" label="N end" state={nState} isActive={!!selectedPole && !nState.correct}
      isOver={overSlot==='bar-n'} size={58} onTap={onTap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}/>
    <div style={{ flex:1, minWidth:0 }}>
      <svg viewBox="0 0 200 56" width="100%" style={{ display:'block' }}>
        <rect x="2" y="6" width="196" height="44" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5"/>
        <rect x="2" y="6" width="65" height="44" rx="8" fill={nState.correct?'#fee2e2':'#f8fafc'} stroke="none"/>
        <rect x="133" y="6" width="65" height="44" rx="8" fill={sState.correct?'#dbeafe':'#f8fafc'} stroke="none"/>
        <line x1="67" y1="8" x2="67" y2="50" stroke="#e2e8f0" strokeWidth="1"/>
        <line x1="133" y1="8" x2="133" y2="50" stroke="#e2e8f0" strokeWidth="1"/>
        <FilingDots cx={22} cy={28} r={10}/>
        <FilingDots cx={178} cy={28} r={10}/>
        <text x="100" y="32" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize="9" fill="#94a3b8" fontWeight="600">bar magnet</text>
        {nState.correct && <text x="22" y="33" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize="16" fontWeight="900" fill="#dc2626">N</text>}
        {sState.correct && <text x="178" y="33" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize="16" fontWeight="900" fill="#1d4ed8">S</text>}
      </svg>
    </div>
    <Slot slotId="bar-s" label="S end" state={sState} isActive={!!selectedPole && !sState.correct}
      isOver={overSlot==='bar-s'} size={58} onTap={onTap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}/>
  </div>
);

const UDiagram: React.FC<MagnetProps> = ({ nState, sState, selectedPole, overSlot, onTap, onDrop, onDragOver, onDragLeave }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%' }}>
    <svg viewBox="0 0 280 200" width="100%" style={{ display:'block', maxWidth:360, overflow:'visible' }}>
      <rect x="18" y="10" width="54" height="120" rx="9" fill={nState.correct?'#fee2e2':'#f1f5f9'} stroke="#cbd5e1" strokeWidth="1.5"/>
      <rect x="208" y="10" width="54" height="120" rx="9" fill={sState.correct?'#dbeafe':'#f1f5f9'} stroke="#cbd5e1" strokeWidth="1.5"/>
      <path d="M18 128 Q18 188 140 188 Q262 188 262 128" fill="none" stroke="#cbd5e1" strokeWidth="1.5"/>
      <path d="M72 128 Q72 158 140 158 Q208 158 208 128" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
      <FilingDots cx={45} cy={25} r={11}/><FilingDots cx={235} cy={25} r={11}/>
      {nState.correct && <text x="45" y="32" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize="18" fontWeight="900" fill="#dc2626">N</text>}
      {sState.correct && <text x="235" y="32" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize="18" fontWeight="900" fill="#1d4ed8">S</text>}
      <text x="140" y="130" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize="9" fill="#94a3b8" fontWeight="600">U-shaped magnet</text>
      <foreignObject x="4" y="5" width="82" height="76">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%' }}>
          <Slot slotId="u-n" label="Left arm" state={nState} isActive={!!selectedPole && !nState.correct}
            isOver={overSlot==='u-n'} size={62} onTap={onTap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}/>
        </div>
      </foreignObject>
      <foreignObject x="194" y="5" width="82" height="76">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%' }}>
          <Slot slotId="u-s" label="Right arm" state={sState} isActive={!!selectedPole && !sState.correct}
            isOver={overSlot==='u-s'} size={62} onTap={onTap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}/>
        </div>
      </foreignObject>
    </svg>
  </div>
);

const RingDiagram: React.FC<MagnetProps> = ({ nState, sState, selectedPole, overSlot, onTap, onDrop, onDragOver, onDragLeave }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%' }}>
    <svg viewBox="0 0 220 280" width="100%" style={{ display:'block', maxWidth:280, overflow:'visible' }}>
      <circle cx="110" cy="140" r="80" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5"/>
      <circle cx="110" cy="140" r="36" fill="white" stroke="#cbd5e1" strokeWidth="1.5"/>
      <path d="M110 60 A80 80 0 0 1 190 140 L146 140 A36 36 0 0 0 110 104 Z" fill={nState.correct?'#fee2e2':'transparent'} opacity="0.7"/>
      <path d="M110 220 A80 80 0 0 1 30 140 L74 140 A36 36 0 0 0 110 176 Z" fill={sState.correct?'#dbeafe':'transparent'} opacity="0.7"/>
      <FilingDots cx={110} cy={72} r={11}/><FilingDots cx={110} cy={208} r={11}/>
      <text x="110" y="144" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize="9" fill="#94a3b8" fontWeight="600">ring magnet</text>
      {nState.correct && <text x="110" y="78" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize="15" fontWeight="900" fill="#dc2626">N</text>}
      {sState.correct && <text x="110" y="212" textAnchor="middle" fontFamily="Poppins,sans-serif" fontSize="15" fontWeight="900" fill="#1d4ed8">S</text>}
      <foreignObject x="71" y="3" width="78" height="78">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%' }}>
          <Slot slotId="ring-n" label="Top face" state={nState} isActive={!!selectedPole && !nState.correct}
            isOver={overSlot==='ring-n'} size={62} onTap={onTap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}/>
        </div>
      </foreignObject>
      <foreignObject x="71" y="199" width="78" height="78">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%' }}>
          <Slot slotId="ring-s" label="Bottom" state={sState} isActive={!!selectedPole && !sState.correct}
            isOver={overSlot==='ring-s'} size={62} onTap={onTap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}/>
        </div>
      </foreignObject>
    </svg>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// COMPLETION SCREEN
// ─────────────────────────────────────────────────────────────────
const CompletionScreen: React.FC<{ onReset:()=>void; themeColor:string }> = ({ onReset, themeColor }) => (
  <div style={{ animation:'mpl-fadeScale .5s ease-out', padding:'clamp(20px,5vw,40px)', textAlign:'center' }}>
    <div style={{ fontSize:58, marginBottom:12, animation:'mpl-float 2s ease-in-out infinite' }}>🧲</div>
    <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:'clamp(20px,5vw,28px)', color:'#1f2937', marginBottom:12 }}>All Poles Labelled! 🎉</div>
    <div style={{ margin:'0 auto 24px', maxWidth:440, padding:'16px 20px', borderRadius:16, background:`linear-gradient(135deg,${themeColor}18,${themeColor}30)`, border:`2px solid ${themeColor}66` }}>
      <div style={{ fontSize:24, marginBottom:8 }}>💡</div>
      <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:'clamp(13px,3vw,15px)', color:'#1f2937', lineHeight:1.6 }}>
        "Every magnet has poles in pairs — a North pole and a South pole, no matter its shape."
      </div>
      <div style={{ fontFamily:'Poppins,sans-serif', fontSize:12, color:'#6b7280', marginTop:8 }}>Even if you break a magnet, each piece gets its own N and S!</div>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:28, maxWidth:400, margin:'0 auto 28px' }}>
      {[{label:'Bar Magnet',icon:'▬',desc:'N ← → S'},{label:'U-shaped',icon:'∪',desc:'N arm | S arm'},{label:'Ring Magnet',icon:'◎',desc:'N top | S bottom'}].map((m,i)=>(
        <div key={i} style={{ padding:'12px 8px', borderRadius:12, background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:`2px solid ${themeColor}55`, animation:`mpl-fadeUp .4s ease-out ${i*.1}s both`, textAlign:'center' }}>
          <div style={{ fontSize:22, marginBottom:5 }}>{m.icon}</div>
          <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:11, color:'#1f2937', marginBottom:3 }}>{m.label}</div>
          <div style={{ fontFamily:'Poppins,sans-serif', fontSize:10, color:'#6b7280' }}>{m.desc}</div>
        </div>
      ))}
    </div>
    <button onClick={onReset} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 32px', background:'linear-gradient(135deg,#533086,#4A4DC9)', color:'#fff', border:'none', borderRadius:14, cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:15, boxShadow:'0 6px 22px rgba(83,48,134,.32)' }}>
      <SvgRotate size={17} color="#fff"/> Try Again
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const MagnetPoleLabellingTool: React.FC<Props> = ({ props = {} }) => {
  const ap         = (props.additionalProps || {}) as any;
  const title      = (ap.title as string)   || 'Label the Magnet Poles';
  const subtitle   = (ap.subtitle as string)|| 'Chapter 4 – Exploring Magnets';
  const themeColor = props.themeColor       || '#f59e0b';

  const initSlots = (): AllSlots => ({
    'bar-n':{pole:null,correct:false,wrong:false}, 'bar-s':{pole:null,correct:false,wrong:false},
    'u-n'  :{pole:null,correct:false,wrong:false}, 'u-s'  :{pole:null,correct:false,wrong:false},
    'ring-n':{pole:null,correct:false,wrong:false},'ring-s':{pole:null,correct:false,wrong:false},
  });

  const [slots,        setSlots]        = useState<AllSlots>(initSlots);
  const [selectedPole, setSelectedPole] = useState<PoleId|null>(null); // mobile tap
  const [overSlot,     setOverSlot]     = useState<SlotId|null>(null); // desktop drag
  const [draggingPole, setDraggingPole] = useState<PoleId|null>(null); // desktop
  const [ghost,        setGhost]        = useState<{x:number;y:number;active:boolean}>({x:0,y:0,active:false});
  const [isDesktop,    setIsDesktop]    = useState(false);
  const [showDone,     setShowDone]     = useState(false);
  const [confetti,     setConfetti]     = useState(false);

  const draggingRef = useRef<PoleId|null>(null);
  const overRef     = useRef<SlotId|null>(null);
  const slotRefs    = useRef<Partial<Record<SlotId,HTMLDivElement|null>>>({});

  useEffect(() => {
    injectStyles();
    const check = () => setIsDesktop(window.innerWidth >= 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const correctCount = Object.values(slots).filter(s => s.correct).length;
  useEffect(() => {
    if (correctCount !== 6) return;
    setConfetti(true);
    const t = setTimeout(() => { setShowDone(true); setConfetti(false); }, 1600);
    return () => clearTimeout(t);
  }, [correctCount]);

  // ── Core place logic ──
  const tryPlace = useCallback((slotId: SlotId, pole: PoleId) => {
    if (slots[slotId].correct) return;
    const correct = CORRECT[slotId] === pole;
    setSlots(prev => ({ ...prev, [slotId]: { pole, correct, wrong:!correct } }));
    if (!correct) {
      setTimeout(() => setSlots(prev => ({ ...prev, [slotId]: { pole:null, correct:false, wrong:false } })), 1100);
    }
  }, [slots]);

  // ── Mobile tap handlers ──
  const handlePoleTap = (pole: PoleId) => setSelectedPole(p => p === pole ? null : pole);
  const handleSlotTap = (slotId: SlotId) => {
    if (!selectedPole) return;
    tryPlace(slotId, selectedPole);
    if (CORRECT[slotId] === selectedPole) setSelectedPole(null);
  };

  // ── Desktop HTML5 drag handlers ──
  const onDragStart = (pole: PoleId) => {
    setDraggingPole(pole); draggingRef.current = pole;
  };
  const onDragEnd = () => {
    setDraggingPole(null); draggingRef.current = null;
    setOverSlot(null); overRef.current = null;
    setGhost(g => ({...g, active:false}));
  };
  const handleDragOver = (slotId: SlotId) => { setOverSlot(slotId); overRef.current = slotId; };
  const handleDragLeave = () => { setOverSlot(null); overRef.current = null; };
  const handleDrop = (slotId: SlotId) => {
    if (draggingRef.current) tryPlace(slotId, draggingRef.current);
    setDraggingPole(null); draggingRef.current = null;
    setOverSlot(null); overRef.current = null;
  };

  const reset = () => {
    setSlots(initSlots()); setSelectedPole(null); setOverSlot(null);
    setDraggingPole(null); draggingRef.current = null; overRef.current = null;
    setGhost({x:0,y:0,active:false}); setShowDone(false); setConfetti(false);
  };

  const usedN = Object.values(slots).filter(s => s.correct && s.pole==='N').length;
  const usedS = Object.values(slots).filter(s => s.correct && s.pole==='S').length;
  const remN  = 3 - usedN, remS = 3 - usedS;
  const pct   = Math.round((correctCount/6)*100);

  const magnetMeta = [
    { id:'bar',  label:'Bar Magnet',      badge:'Bar',  bg:'linear-gradient(135deg,#f59e0b,#FC9145)' },
    { id:'u',    label:'U-shaped Magnet', badge:'U',    bg:'linear-gradient(135deg,#533086,#4A4DC9)' },
    { id:'ring', label:'Ring Magnet',     badge:'Ring', bg:'linear-gradient(135deg,#FC9145,#f59e0b)' },
  ];

  const diagramProps = (nId: SlotId, sId: SlotId) => ({
    nState: slots[nId], sState: slots[sId],
    selectedPole: isDesktop ? null : selectedPole,
    overSlot,
    onTap:      handleSlotTap,
    onDrop:     handleDrop,
    onDragOver: handleDragOver,
    onDragLeave:handleDragLeave,
  });

  const renderMagnetCard = (idx: number, nId: SlotId, sId: SlotId, Diagram: React.FC<MagnetProps>) => {
    const m = magnetMeta[idx];
    const allDone = slots[nId].correct && slots[sId].correct;
    return (
      <div style={{ background:'#fff', borderRadius:16, padding:'14px', boxShadow:'0 2px 10px rgba(0,0,0,.06)', border:`2px solid ${allDone?'#10b981':'#f3f4f6'}`, animation:`mpl-fadeUp .${35+idx*5}s ease-out` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <span style={{ background:m.bg, color:'#fff', borderRadius:8, padding:'2px 10px', fontSize:11, fontFamily:'Poppins,sans-serif', fontWeight:700 }}>{m.badge}</span>
          <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:14, color:'#1f2937' }}>{m.label}</span>
          {allDone && <SvgCheck size={16} color="#10b981"/>}
        </div>
        <Diagram {...diagramProps(nId, sId)}/>
        {(slots[nId].wrong||slots[sId].wrong) && (
          <div style={{ marginTop:8, padding:'7px 11px', borderRadius:9, background:'#fff7ed', border:'1px solid #fed7aa', fontFamily:'Poppins,sans-serif', fontSize:11, color:'#c2410c', animation:'mpl-fadeUp .3s ease-out' }}>
            💡 {slots[nId].wrong ? HINTS[nId] : HINTS[sId]}
          </div>
        )}
        {allDone && <div style={{ marginTop:8, padding:'7px 11px', borderRadius:9, background:'#d1fae5', border:'1px solid #10b981', fontFamily:'Poppins,sans-serif', fontSize:11, color:'#065f46', fontWeight:600, animation:'mpl-pop .4s ease-out' }}>✅ {m.label} — correctly labelled!</div>}
      </div>
    );
  };

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', minHeight:'100vh', background:'linear-gradient(160deg,#fffbeb 0%,#f5f3ff 55%,#fef3c7 100%)', boxSizing:'border-box' }}>
      <Confetti active={confetti}/>
      <DragGhost pole={draggingPole} x={ghost.x} y={ghost.y} active={ghost.active}/>

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#533086 0%,#4A4DC9 55%,#FC9145 100%)', padding:'clamp(14px,4vw,24px) clamp(14px,5vw,28px) clamp(12px,3vw,18px)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', maxWidth:720, margin:'0 auto' }}>
          <div style={{ display:'inline-block', padding:'3px 12px', borderRadius:20, background:'rgba(255,255,255,.18)', marginBottom:7, fontWeight:600, fontSize:11, color:'rgba(255,255,255,.92)', letterSpacing:1 }}>{subtitle.toUpperCase()}</div>
          <div style={{ fontWeight:800, fontSize:'clamp(15px,4vw,24px)', color:'#fff', lineHeight:1.3, marginBottom:9 }}>🧲 {title}</div>
          <div style={{ fontSize:'clamp(11px,2.5vw,13px)', color:'rgba(255,255,255,.88)', lineHeight:1.6, background:'rgba(255,255,255,.12)', padding:'8px 13px', borderRadius:10 }}>
            📌 <strong>How to play:</strong>{' '}
            {isDesktop
              ? 'Drag an N or S label directly onto the correct blank (?) of each magnet.'
              : 'Tap an N or S label to select it, then tap the correct blank (?) on each magnet.'}
          </div>
        </div>
      </div>

      {/* PROGRESS */}
      <div style={{ padding:'10px 14px', background:'#fff', borderBottom:'1px solid #f3f4f6' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, maxWidth:720, margin:'0 auto' }}>
          <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:12, color:'#533086', whiteSpace:'nowrap' }}>{correctCount}/6 placed</span>
          <div style={{ flex:1, height:7, background:'#f3f4f6', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#533086,#FC9145)', borderRadius:999, transition:'width .55s ease' }}/>
          </div>
          {correctCount > 0 && (
            <button onClick={reset} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', color:'#6b7280', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:12, whiteSpace:'nowrap' }}>
              <SvgRotate size={13} color="#9ca3af"/> Reset
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding:'clamp(12px,3vw,20px) clamp(12px,4vw,16px)', maxWidth:680, margin:'0 auto', boxSizing:'border-box' }}>
        {showDone ? (
          <div style={{ background:'#fff', borderRadius:20, boxShadow:'0 8px 32px rgba(0,0,0,.08)' }}>
            <CompletionScreen onReset={reset} themeColor={themeColor}/>
          </div>
        ) : (
          <>
            {/* TOKEN POOL */}
            <div style={{ background:'#fff', borderRadius:14, padding:'14px', boxShadow:'0 2px 10px rgba(0,0,0,.06)', marginBottom:16, border:`2px solid ${(selectedPole||draggingPole)?themeColor:'#f3f4f6'}`, transition:'border-color .2s' }}>
              <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:12, color:'#533086', marginBottom:10 }}>
                {isDesktop ? '🖱️ Drag a pole label onto the correct slot:' : '👆 Step 1 — Tap a pole label to select it:'}
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>

                {/* N pills */}
                {Array.from({length:remN}).map((_,i)=>(
                  <div key={`n-${i}`}
                    className={isDesktop ? `mpl-pill${draggingPole==='N'?' dragging':''}` : 'mpl-tap-pill'}
                    draggable={isDesktop}
                    onDragStart={isDesktop ? ()=>onDragStart('N') : undefined}
                    onDragEnd={isDesktop ? onDragEnd : undefined}
                    onClick={!isDesktop ? ()=>handlePoleTap('N') : undefined}
                    style={{
                      width:56, height:56, borderRadius:14, flexShrink:0,
                      background: (!isDesktop && selectedPole==='N')
                        ? 'linear-gradient(135deg,#dc2626,#ef4444)'
                        : 'linear-gradient(135deg,#fee2e2,#fca5a5)',
                      border:`3px solid ${(!isDesktop && selectedPole==='N')?'#b91c1c':'#ef4444'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow: (!isDesktop && selectedPole==='N')?'0 4px 16px rgba(220,38,38,.4)':'0 2px 6px rgba(0,0,0,.08)',
                      transform: (!isDesktop && selectedPole==='N') ? 'scale(1.12)' : 'scale(1)',
                      transition:'all .14s ease',
                    }}>
                    <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:900, fontSize:26, color:(!isDesktop&&selectedPole==='N')?'#fff':'#dc2626' }}>N</span>
                  </div>
                ))}

                {/* S pills */}
                {Array.from({length:remS}).map((_,i)=>(
                  <div key={`s-${i}`}
                    className={isDesktop ? `mpl-pill${draggingPole==='S'?' dragging':''}` : 'mpl-tap-pill'}
                    draggable={isDesktop}
                    onDragStart={isDesktop ? ()=>onDragStart('S') : undefined}
                    onDragEnd={isDesktop ? onDragEnd : undefined}
                    onClick={!isDesktop ? ()=>handlePoleTap('S') : undefined}
                    style={{
                      width:56, height:56, borderRadius:14, flexShrink:0,
                      background: (!isDesktop && selectedPole==='S')
                        ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
                        : 'linear-gradient(135deg,#dbeafe,#93c5fd)',
                      border:`3px solid ${(!isDesktop && selectedPole==='S')?'#1e40af':'#3b82f6'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow: (!isDesktop && selectedPole==='S')?'0 4px 16px rgba(29,78,216,.4)':'0 2px 6px rgba(0,0,0,.08)',
                      transform: (!isDesktop && selectedPole==='S') ? 'scale(1.12)' : 'scale(1)',
                      transition:'all .14s ease',
                    }}>
                    <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:900, fontSize:26, color:(!isDesktop&&selectedPole==='S')?'#fff':'#1d4ed8' }}>S</span>
                  </div>
                ))}

                {/* Status message */}
                {!isDesktop && (
                  selectedPole ? (
                    <div style={{ flex:1, minWidth:130, padding:'9px 12px', borderRadius:10, background:selectedPole==='N'?'#fee2e2':'#dbeafe', border:`1.5px solid ${selectedPole==='N'?'#ef4444':'#3b82f6'}`, fontFamily:'Poppins,sans-serif', fontSize:12, color:selectedPole==='N'?'#dc2626':'#1d4ed8', fontWeight:600, lineHeight:1.4, animation:'mpl-fadeUp .25s ease-out' }}>
                      ✅ <strong>{selectedPole}</strong> selected →<br/>Tap a <strong>?</strong> slot below
                    </div>
                  ) : (
                    <div style={{ flex:1, minWidth:130, padding:'9px 12px', borderRadius:10, background:'#f8fafc', border:'1.5px solid #e2e8f0', fontFamily:'Poppins,sans-serif', fontSize:12, color:'#94a3b8', lineHeight:1.4 }}>
                      Tap <strong style={{color:'#dc2626'}}>N</strong> or <strong style={{color:'#1d4ed8'}}>S</strong> above to start
                    </div>
                  )
                )}
                {isDesktop && draggingPole && (
                  <div style={{ flex:1, minWidth:130, padding:'9px 12px', borderRadius:10, background:draggingPole==='N'?'#fee2e2':'#dbeafe', border:`1.5px solid ${draggingPole==='N'?'#ef4444':'#3b82f6'}`, fontFamily:'Poppins,sans-serif', fontSize:12, color:draggingPole==='N'?'#dc2626':'#1d4ed8', fontWeight:600, lineHeight:1.4 }}>
                    Dragging <strong>{draggingPole}</strong> — drop on a ? slot
                  </div>
                )}
              </div>

              {/* Legend */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:10, paddingTop:10, borderTop:'1px solid #f3f4f6' }}>
                <div style={{ fontFamily:'Poppins,sans-serif', fontSize:11, color:'#6b7280' }}>🔹 Filing clusters = poles</div>
                <div style={{ display:'flex', alignItems:'center', gap:4, fontFamily:'Poppins,sans-serif', fontSize:11, color:'#065f46' }}><SvgCheck size={12} color="#10b981"/> Correct → locks green</div>
                <div style={{ fontFamily:'Poppins,sans-serif', fontSize:11, color:'#6b7280' }}>❓ = empty slot to fill</div>
              </div>
            </div>

            {/* Step 2 label — mobile only */}
            {!isDesktop && (
              <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:12, color:'#533086', marginBottom:10 }}>
                Step 2 — Tap the correct blank (?) on each magnet:
              </div>
            )}

            {/* MAGNET CARDS */}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {renderMagnetCard(0, 'bar-n', 'bar-s', BarDiagram)}
              {renderMagnetCard(1, 'u-n',   'u-s',   UDiagram)}
              {renderMagnetCard(2, 'ring-n','ring-s', RingDiagram)}
            </div>

            <div style={{ marginTop:14, padding:'10px 14px', background:'linear-gradient(135deg,#f5f3ff,#ede9fe)', border:'1px solid #c4b5fd', borderRadius:12, fontFamily:'Poppins,sans-serif', fontSize:12, color:'#6d28d9', display:'flex', alignItems:'flex-start', gap:8 }}>
              <span style={{ fontSize:16, flexShrink:0 }}>🔹</span>
              <span><strong>Remember:</strong> Iron filing clusters always form at the poles — wherever filings cluster most, that is a pole!</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MagnetPoleLabellingTool;