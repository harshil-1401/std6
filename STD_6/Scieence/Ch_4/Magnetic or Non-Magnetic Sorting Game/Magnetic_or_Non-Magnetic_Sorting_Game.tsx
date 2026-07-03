import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────
// INLINE SVG ICONS
// ─────────────────────────────────────────────────────────────────
const SvgCheck: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const SvgX: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const SvgRotate: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" />
  </svg>
);
const SvgTrophy: React.FC<{ size?: number; color?: string }> = ({ size = 48, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 21 12 17 16 21" /><line x1="12" y1="17" x2="12" y2="11" />
    <path d="M7 4H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V5a1 1 0 0 0-1-1h-3" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><line x1="8" y1="21" x2="16" y2="21" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// OBJECT SVGs
// ─────────────────────────────────────────────────────────────────
const ObjSpoon: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44">
    <ellipse cx="22" cy="10" rx="8" ry="8" fill="#c0c0c0" stroke="#9ca3af" strokeWidth="1.5"/>
    <rect x="20" y="16" width="4" height="22" rx="2" fill="#9ca3af" stroke="#6b7280" strokeWidth="1"/>
    <ellipse cx="22" cy="10" rx="5" ry="5" fill="#e5e7eb" opacity="0.6"/>
  </svg>
);
const ObjWire: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44">
    <path d="M8 36 Q8 8 22 8 Q36 8 36 22 Q36 36 22 36 Q14 36 14 28" fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round"/>
    <path d="M8 36 Q8 8 22 8 Q36 8 36 22 Q36 36 22 36 Q14 36 14 28" fill="none" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
  </svg>
);
const ObjCan: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44">
    <rect x="10" y="10" width="24" height="28" rx="4" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5"/>
    <ellipse cx="22" cy="10" rx="12" ry="4" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
    <ellipse cx="22" cy="38" rx="12" ry="4" fill="#c0c0c0" stroke="#9ca3af" strokeWidth="1.5"/>
    <line x1="15" y1="15" x2="15" y2="33" stroke="#9ca3af" strokeWidth="1" opacity="0.4"/>
    <rect x="17" y="12" width="10" height="8" rx="2" fill="#ef4444" opacity="0.8"/>
  </svg>
);
const ObjNail: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44">
    <rect x="8" y="8" width="18" height="6" rx="1" fill="#6b7280" stroke="#4b5563" strokeWidth="1"/>
    <rect x="16" y="13" width="4" height="26" rx="1" fill="#9ca3af" stroke="#6b7280" strokeWidth="1"/>
    <polygon points="16,39 20,39 18,43" fill="#6b7280"/>
    <rect x="8" y="8" width="18" height="3" rx="1" fill="#9ca3af" opacity="0.5"/>
  </svg>
);
const ObjWood: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44">
    <rect x="5" y="12" width="34" height="20" rx="3" fill="#d97706" stroke="#b45309" strokeWidth="1.5"/>
    <line x1="12" y1="12" x2="12" y2="32" stroke="#b45309" strokeWidth="1" opacity="0.4"/>
    <line x1="22" y1="12" x2="22" y2="32" stroke="#b45309" strokeWidth="1" opacity="0.4"/>
    <line x1="32" y1="12" x2="32" y2="32" stroke="#b45309" strokeWidth="1" opacity="0.4"/>
    <rect x="5" y="12" width="34" height="5" rx="3" fill="#f59e0b" opacity="0.5"/>
  </svg>
);
const ObjBottle: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44">
    <path d="M16 6 h12 v4 l4 6 v22 a2 2 0 0 1-2 2 H14 a2 2 0 0 1-2-2 V16 l4-6 z" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.5" opacity="0.85"/>
    <rect x="15" y="4" width="14" height="4" rx="2" fill="#60a5fa" stroke="#3b82f6" strokeWidth="1"/>
    <ellipse cx="22" cy="22" rx="6" ry="8" fill="white" opacity="0.25"/>
  </svg>
);
const ObjNickel: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="16" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="2"/>
    <circle cx="22" cy="22" r="9" fill="white" stroke="#7c3aed" strokeWidth="2"/>
    <text x="22" y="26" textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="Poppins,sans-serif" fill="#7c3aed">Ni</text>
  </svg>
);
const ObjCup: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44">
    <path d="M10 10 L13 38 H31 L34 10 Z" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"/>
    <line x1="10" y1="10" x2="34" y2="10" stroke="#f59e0b" strokeWidth="2"/>
    <line x1="16" y1="14" x2="14" y2="34" stroke="#f59e0b" strokeWidth="1" opacity="0.4"/>
  </svg>
);

const ObjectIllustration: React.FC<{ id: string; size?: number }> = ({ id, size = 44 }) => {
  switch (id) {
    case 'spoon':  return <ObjSpoon  size={size} />;
    case 'wire':   return <ObjWire   size={size} />;
    case 'can':    return <ObjCan    size={size} />;
    case 'nail':   return <ObjNail   size={size} />;
    case 'wood':   return <ObjWood   size={size} />;
    case 'bottle': return <ObjBottle size={size} />;
    case 'nickel': return <ObjNickel size={size} />;
    case 'cup':    return <ObjCup    size={size} />;
    default:       return <span style={{ fontSize: size * 0.5 }}>❓</span>;
  }
};

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
interface CardDef {
  id: string; label: string; emoji: string;
  correctBin: 'magnetic' | 'nonmagnetic';
  explanation: string; hint: string;
}
interface MagneticSortingToolProps {
  props?: {
    themeColor?: string;
    additionalProps?: {
      cards?: CardDef[]; title?: string;
      subtitle?: string; instructionText?: string;
    };
  };
}

// ─────────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────────
const DEFAULT_CARDS: CardDef[] = [
  { id:'spoon',  label:'Steel Spoon',   emoji:'🥄', correctBin:'magnetic',    explanation:'Steel contains iron, so it is magnetic.',      hint:'Steel is an alloy made mostly of iron — iron is magnetic!' },
  { id:'wire',   label:'Copper Wire',   emoji:'🔌', correctBin:'nonmagnetic', explanation:'Copper is not attracted to magnets.',           hint:'Only iron, nickel, and cobalt are magnetic metals.' },
  { id:'can',    label:'Aluminium Can', emoji:'🥤', correctBin:'nonmagnetic', explanation:'Aluminium is a non-magnetic metal.',            hint:'Aluminium does not contain iron, nickel, or cobalt.' },
  { id:'nail',   label:'Iron Nail',     emoji:'📌', correctBin:'magnetic',    explanation:'Iron is one of the three magnetic metals.',     hint:'Think: which metals are attracted to magnets? Iron is one!' },
  { id:'wood',   label:'Wooden Block',  emoji:'🪵', correctBin:'nonmagnetic', explanation:'Wood is a non-magnetic material.',             hint:'Only certain metals are magnetic — wood is not a metal.' },
  { id:'bottle', label:'Glass Bottle',  emoji:'🍶', correctBin:'nonmagnetic', explanation:'Glass is a non-magnetic material.',            hint:'Glass contains no iron, nickel, or cobalt.' },
  { id:'nickel', label:'Nickel Ring',   emoji:'💍', correctBin:'magnetic',    explanation:'Nickel is one of the three magnetic metals.',  hint:'Nickel, iron, and cobalt are the magnetic metals!' },
  { id:'cup',    label:'Plastic Cup',   emoji:'🥛', correctBin:'nonmagnetic', explanation:'Plastic is a non-magnetic material.',         hint:'Plastic has no metallic content — it is non-magnetic.' },
];

const BINS = [
  { id:'magnetic'    as const, label:'🧲 Magnetic',     subtitle:'Attracted to a magnet',    color:'#f59e0b', bg:'linear-gradient(135deg,#fffbeb,#fef3c7)', emoji:'🧲' },
  { id:'nonmagnetic' as const, label:'🚫 Non-Magnetic', subtitle:'Not attracted to a magnet', color:'#533086', bg:'linear-gradient(135deg,#f5f3ff,#ede9fe)', emoji:'🚫' },
];

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('mst-styles')) return;
  const s = document.createElement('style');
  s.id = 'mst-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }

    @keyframes mst-lockIn  { 0%{transform:scale(1)} 35%{transform:scale(1.08)} 65%{transform:scale(.97)} 100%{transform:scale(1)} }
    @keyframes mst-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes mst-fadeUp  { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes mst-fadeScale{from{transform:scale(.88);opacity:0} to{transform:scale(1);opacity:1} }
    @keyframes mst-confetti{ 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(260px) rotate(720deg);opacity:0} }
    @keyframes mst-shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(4px)} }
    @keyframes mst-bounce  { 0%{transform:scale(1)} 40%{transform:scale(1.1)} 70%{transform:scale(.95)} 100%{transform:scale(1)} }
    @keyframes mst-glow    { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.4)} 50%{box-shadow:0 0 0 10px rgba(245,158,11,0)} }

    .mst-card {
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      cursor: grab;
      transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
    }
    .mst-card:hover {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 10px 24px rgba(83,48,134,.2) !important;
    }
    .mst-card.is-dragging {
      opacity: 0.35;
      transform: scale(0.95);
      cursor: grabbing;
    }
    .mst-bin { transition: all .18s ease; }
    .mst-bin.over {
      border-color: #f59e0b !important;
      background: #fffbeb !important;
      box-shadow: 0 0 0 4px rgba(245,158,11,.25) !important;
    }
    .mst-ghost {
      position: fixed;
      pointer-events: none;
      z-index: 9998;
      transform: rotate(4deg) scale(1.08);
      box-shadow: 0 16px 40px rgba(0,0,0,.22);
      opacity: 0.95;
      transition: none;
    }
    .mst-btn { transition: transform .15s ease; }
    .mst-btn:hover { transform: scale(1.04) translateY(-1px); }
  `;
  document.head.appendChild(s);
};

// ─────────────────────────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────────────────────────
const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const pal = ['#f59e0b','#533086','#FC9145','#4A4DC9','#10b981','#ef4444','#06b6d4'];
  const pieces = Array.from({ length: 32 }, (_, i) => ({
    id:i, left:Math.random()*100, delay:Math.random()*.8,
    color:pal[i%pal.length], size:6+Math.random()*9, round:Math.random()>.5,
  }));
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.left}%`, top:'-14px',
          width:p.size, height:p.size, backgroundColor:p.color,
          borderRadius:p.round?'50%':'3px',
          animation:`mst-confetti 1.8s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// SCORE SCREEN
// ─────────────────────────────────────────────────────────────────
const ScoreScreen: React.FC<{
  cards: CardDef[];
  placed: Record<string, { binId:'magnetic'|'nonmagnetic'; correct:boolean }>;
  onReset: () => void; themeColor: string;
}> = ({ cards, placed, onReset, themeColor }) => {
  const correct = Object.values(placed).filter(v => v.correct).length;
  const total   = cards.length;
  const pct     = Math.round((correct/total)*100);
  const isGreat = pct===100; const isGood = pct>=62;
  const barClr  = isGreat ? 'linear-gradient(90deg,#10b981,#34d399)' : isGood ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#f97316,#fb923c)';
  return (
    <div style={{ animation:'mst-fadeScale .5s ease-out', padding:'clamp(20px,4vw,36px)' }}>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ marginBottom:12, animation:'mst-float 2s ease-in-out infinite' }}>
          <SvgTrophy size={56} color={isGreat?themeColor:isGood?'#533086':'#6b7280'} />
        </div>
        <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:'clamp(20px,5vw,28px)', color:'#1f2937' }}>
          {isGreat?'Perfect Score! 🎉':isGood?'Well Done! 👍':'Keep Practising! 💪'}
        </div>
        <div style={{ fontFamily:'Poppins,sans-serif', fontSize:15, color:'#6b7280', marginTop:6 }}>
          You sorted <strong style={{ color:themeColor }}>{correct}</strong> out of <strong>{total}</strong> correctly
        </div>
      </div>
      <div style={{ maxWidth:360, margin:'0 auto 28px' }}>
        <div style={{ height:14, background:'#f3f4f6', borderRadius:999, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:barClr, borderRadius:999, transition:'width 1s ease' }} />
        </div>
        <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:26, color:'#533086', marginTop:8, textAlign:'center' }}>{pct}%</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:28 }}>
        {cards.map(card => {
          const p = placed[card.id]; const ok = p?.correct;
          return (
            <div key={card.id} style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10,
              background:ok?'#d1fae5':'#fef2f2', border:`1.5px solid ${ok?'#10b981':'#fca5a5'}`,
              animation:'mst-fadeUp .4s ease-out both',
            }}>
              <ObjectIllustration id={card.id} size={28} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:11, color:ok?'#065f46':'#dc2626', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.label}</div>
                <div style={{ fontFamily:'Poppins,sans-serif', fontSize:10, color:ok?'#059669':'#dc2626', marginTop:1 }}>
                  {ok?'✓ Correct':`✗ ${card.correctBin==='magnetic'?'Magnetic':'Non-Magnetic'}`}
                </div>
              </div>
              {ok?<SvgCheck size={14} color="#10b981"/>:<SvgX size={14} color="#ef4444"/>}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'center' }}>
        <button className="mst-btn" onClick={onReset} style={{
          display:'inline-flex', alignItems:'center', gap:8, padding:'13px 32px',
          background:'linear-gradient(135deg,#533086,#4A4DC9)', color:'#fff', border:'none',
          borderRadius:14, cursor:'pointer', fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:15,
          boxShadow:'0 6px 22px rgba(83,48,134,.32)',
        }}>
          <SvgRotate size={17} color="#fff"/> Try Again
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// PLACED ROW
// ─────────────────────────────────────────────────────────────────
const PlacedRow: React.FC<{ card:CardDef; correct:boolean }> = ({ card, correct }) => (
  <div style={{
    display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:12,
    background:correct?'linear-gradient(135deg,#d1fae5,#a7f3d0)':'#fef2f2',
    border:`2px solid ${correct?'#10b981':'#fca5a5'}`,
    animation:correct?'mst-lockIn .45s ease-out':'none',
  }}>
    <ObjectIllustration id={card.id} size={28}/>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:12, color:correct?'#065f46':'#dc2626', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.label}</div>
      {correct && <div style={{ fontFamily:'Poppins,sans-serif', fontSize:10, color:'#059669', marginTop:2, lineHeight:1.3 }}>{card.explanation}</div>}
    </div>
    {correct?<SvgCheck size={14} color="#10b981"/>:<SvgX size={14} color="#ef4444"/>}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// DRAG GHOST (floating clone that follows pointer/finger)
// ─────────────────────────────────────────────────────────────────
const DragGhost: React.FC<{
  card: CardDef | null; x: number; y: number; active: boolean;
}> = ({ card, x, y, active }) => {
  if (!card || !active) return null;
  return (
    <div className="mst-ghost" style={{
      left: x - 46, top: y - 46,
      background:'#fff', border:'2px solid #f59e0b',
      borderRadius:14, padding:'10px 10px 8px',
      display:'flex', flexDirection:'column', alignItems:'center', gap:5,
      width:92,
    }}>
      <ObjectIllustration id={card.id} size={40}/>
      <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:10, color:'#1f2937', textAlign:'center', lineHeight:1.2 }}>
        {card.label}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const MagneticSortingTool: React.FC<MagneticSortingToolProps> = ({ props = {} }) => {
  const ap          = (props.additionalProps || {}) as any;
  const cards       = (ap.cards as CardDef[])    || DEFAULT_CARDS;
  const title       = (ap.title as string)        || 'Magnetic & Non-Magnetic Materials';
  const subtitle    = (ap.subtitle as string)     || 'Chapter 4 – Exploring Magnets';
  const instruction = (ap.instructionText as string) || 'Drag each object card into the Magnetic or Non-Magnetic bin. Only iron, nickel, and cobalt are magnetic.';
  const themeColor  = props.themeColor || '#f59e0b';

  type BinId = 'magnetic'|'nonmagnetic';
  type PlacedMap = Record<string, { binId:BinId; correct:boolean }>;

  const [placed,       setPlaced]       = useState<PlacedMap>({});
  const [wrongZone,    setWrongZone]    = useState<string|null>(null);
  const [draggingId,   setDraggingId]   = useState<string|null>(null);
  const [overBin,      setOverBin]      = useState<BinId|null>(null);
  const [ghostPos,     setGhostPos]     = useState<{ x:number; y:number; active:boolean }>({ x:0, y:0, active:false });
  const [showScore,    setShowScore]    = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // refs for touch drag — avoid stale closures
  const draggingRef = useRef<string|null>(null);
  const overBinRef  = useRef<BinId|null>(null);
  const binRefs     = useRef<Record<BinId, HTMLDivElement|null>>({ magnetic:null, nonmagnetic:null });

  useEffect(() => { injectStyles(); }, []);

  const correctCount = Object.values(placed).filter(v => v.correct).length;
  const allDone      = Object.keys(placed).length === cards.length;

  useEffect(() => {
    if (!allDone || cards.length === 0) return;
    const perfect = correctCount === cards.length;
    if (perfect) setShowConfetti(true);
    const t = setTimeout(() => { setShowScore(true); setShowConfetti(false); }, perfect ? 1600 : 500);
    return () => clearTimeout(t);
  }, [allDone]);

  // ── Core place logic ──
  const tryPlace = useCallback((cardId: string, binId: BinId) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || placed[cardId]) return;
    const correct = card.correctBin === binId;
    setPlaced(prev => ({ ...prev, [cardId]: { binId, correct } }));
    if (!correct) {
      setWrongZone(binId);
      setTimeout(() => {
        setPlaced(prev => { const n = { ...prev }; delete n[cardId]; return n; });
        setTimeout(() => setWrongZone(null), 550);
      }, 1400);
    }
    setDraggingId(null);
    draggingRef.current = null;
    setOverBin(null);
    overBinRef.current = null;
  }, [cards, placed]);

  // ── HTML5 drag (mouse, desktop) ──
  const onDragStart = (id: string) => {
    setDraggingId(id);
    draggingRef.current = id;
  };
  const onDragOver = (e: React.DragEvent, binId: BinId) => {
    e.preventDefault();
    setOverBin(binId);
    overBinRef.current = binId;
  };
  const onDragLeave = () => { setOverBin(null); overBinRef.current = null; };
  const onDrop = (e: React.DragEvent, binId: BinId) => {
    e.preventDefault();
    if (draggingRef.current) tryPlace(draggingRef.current, binId);
  };
  const onDragEnd = () => {
    setDraggingId(null); draggingRef.current = null;
    setOverBin(null); overBinRef.current = null;
    setGhostPos({ x:0, y:0, active:false });
  };

  // ── Touch drag (mobile) ──
  const onTouchStart = (e: React.TouchEvent, id: string) => {
    e.preventDefault();
    const t = e.touches[0];
    setDraggingId(id);
    draggingRef.current = id;
    setGhostPos({ x: t.clientX, y: t.clientY, active: true });
  };

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    setGhostPos({ x: t.clientX, y: t.clientY, active: true });

    // hit-test which bin the finger is over
    let found: BinId|null = null;
    for (const binId of ['magnetic','nonmagnetic'] as BinId[]) {
      const el = binRefs.current[binId];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (t.clientX >= rect.left && t.clientX <= rect.right &&
          t.clientY >= rect.top  && t.clientY <= rect.bottom) {
        found = binId; break;
      }
    }
    setOverBin(found);
    overBinRef.current = found;
  }, []);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (draggingRef.current && overBinRef.current) {
      tryPlace(draggingRef.current, overBinRef.current);
    }
    setDraggingId(null); draggingRef.current = null;
    setOverBin(null); overBinRef.current = null;
    setGhostPos({ x:0, y:0, active:false });
  }, [tryPlace]);

  // attach global touch listeners
  useEffect(() => {
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  onTouchEnd,  { passive: false });
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onTouchEnd);
    };
  }, [onTouchMove, onTouchEnd]);

  const reset = () => {
    setPlaced({}); setWrongZone(null); setDraggingId(null);
    draggingRef.current = null; setOverBin(null); overBinRef.current = null;
    setGhostPos({ x:0, y:0, active:false });
    setShowScore(false); setShowConfetti(false);
  };

  const ghostCard = cards.find(c => c.id === draggingId) || null;
  const unplaced  = cards.filter(c => !placed[c.id]);
  const pct       = Math.round((correctCount / cards.length) * 100);

  // ── Card ──
  const renderCard = (card: CardDef) => {
    const isDragging = draggingId === card.id;
    return (
      <div
        key={card.id}
        className={`mst-card${isDragging ? ' is-dragging' : ''}`}
        draggable
        onDragStart={() => onDragStart(card.id)}
        onDragEnd={onDragEnd}
        onTouchStart={e => onTouchStart(e, card.id)}
        style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:6,
          padding:'12px 8px 10px',
          background: isDragging ? '#f9fafb' : '#fff',
          border:`2px solid ${isDragging ? '#e5e7eb' : '#e5e7eb'}`,
          borderRadius:14, boxShadow:'0 2px 8px rgba(0,0,0,.06)',
        }}
      >
        <ObjectIllustration id={card.id} size={42}/>
        <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:11, color:'#1f2937', textAlign:'center', lineHeight:1.2 }}>
          {card.label}
        </span>
      </div>
    );
  };

  // ── Bin ──
  const renderBin = (bin: typeof BINS[0]) => {
    const binPlaced = cards.filter(c => placed[c.id]?.binId === bin.id).map(c => ({ card:c, correct:placed[c.id].correct }));
    const isOver    = overBin === bin.id;
    const isWrong   = wrongZone === bin.id;
    return (
      <div
        key={bin.id}
        ref={el => { binRefs.current[bin.id] = el; }}
        className={`mst-bin${isOver ? ' over' : ''}`}
        onDragOver={e => onDragOver(e, bin.id)}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, bin.id)}
        style={{
          flex:'1 1 240px', minWidth:0, borderRadius:18,
          border:`2.5px dashed ${isWrong ? '#fca5a5' : bin.color+'77'}`,
          background: isOver ? bin.bg : isWrong ? '#fef2f2' : '#fafafa',
          padding:'14px 12px', minHeight: 160,
          animation: isWrong ? 'mst-shake .5s ease-out' : 'none',
        }}
      >
        {/* Header */}
        <div style={{
          textAlign:'center', marginBottom:12, padding:'10px 12px',
          background:`linear-gradient(135deg,${bin.color},${bin.color}cc)`,
          borderRadius:12, boxShadow:`0 4px 14px ${bin.color}44`,
        }}>
          <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:13, color:'#fff' }}>{bin.label}</div>
          <div style={{ fontFamily:'Poppins,sans-serif', fontSize:11, color:'rgba(255,255,255,.85)', marginTop:2 }}>{bin.subtitle}</div>
        </div>
        {/* Empty */}
        {binPlaced.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:70, color:bin.color+'99', fontFamily:'Poppins,sans-serif', fontSize:12 }}>
            <div style={{ fontSize:28, marginBottom:6, animation:'mst-float 2.4s ease-in-out infinite' }}>{bin.emoji}</div>
            Drop cards here
          </div>
        )}
        {/* Cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {binPlaced.map(({ card, correct }) => (
            <div key={card.id} style={{ animation:'mst-fadeUp .3s ease-out' }}>
              <PlacedRow card={card} correct={correct}/>
              {!correct && (
                <div style={{ marginTop:4, padding:'6px 10px', borderRadius:8, background:'#fff7ed', border:'1px solid #fed7aa', fontFamily:'Poppins,sans-serif', fontSize:11, color:'#c2410c', lineHeight:1.4 }}>
                  💡 {card.hint}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', minHeight:'100vh', background:'linear-gradient(160deg,#fffbeb 0%,#f5f3ff 55%,#fef3c7 100%)' }}>
      <Confetti active={showConfetti}/>

      {/* Floating ghost for touch drag only */}
      <DragGhost card={ghostCard} x={ghostPos.x} y={ghostPos.y} active={ghostPos.active}/>

      {/* ── HEADER ── */}
      <div style={{ background:'linear-gradient(135deg,#533086 0%,#4A4DC9 55%,#FC9145 100%)', padding:'clamp(16px,4vw,26px) clamp(14px,5vw,28px) clamp(12px,3vw,20px)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-20, left:50, width:75, height:75, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', maxWidth:720, margin:'0 auto' }}>
          <div style={{ display:'inline-block', padding:'3px 12px', borderRadius:20, background:'rgba(255,255,255,.18)', marginBottom:8, fontWeight:600, fontSize:11, color:'rgba(255,255,255,.92)', letterSpacing:1 }}>
            {subtitle.toUpperCase()}
          </div>
          <div style={{ fontWeight:800, fontSize:'clamp(16px,4vw,25px)', color:'#fff', lineHeight:1.25, marginBottom:10 }}>
            🧲 {title}
          </div>
          <div style={{ fontSize:'clamp(11px,2.5vw,13px)', color:'rgba(255,255,255,.88)', lineHeight:1.6, background:'rgba(255,255,255,.12)', padding:'9px 13px', borderRadius:10 }}>
            📌 <strong>Instructions:</strong> {instruction}
          </div>
        </div>
      </div>

      {/* ── PROGRESS ── */}
      <div style={{ padding:'10px 14px', background:'#fff', borderBottom:'1px solid #f3f4f6' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, maxWidth:720, margin:'0 auto' }}>
          <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:12, color:'#533086', whiteSpace:'nowrap' }}>
            {correctCount}/{cards.length} sorted
          </span>
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

      {/* ── CONTENT ── */}
      <div style={{ padding:'clamp(14px,3vw,20px) clamp(12px,4vw,16px)', maxWidth:760, margin:'0 auto' }}>
        {showScore ? (
          <div style={{ background:'#fff', borderRadius:20, boxShadow:'0 8px 32px rgba(0,0,0,.08)' }}>
            <ScoreScreen cards={cards} placed={placed} onReset={reset} themeColor={themeColor}/>
          </div>
        ) : (
          <>
            {/* BINS — always on top */}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:18 }}>
              {BINS.map(renderBin)}
            </div>

            {/* CARD POOL */}
            {unplaced.length > 0 && (
              <div>
                <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:12, color:'#533086', marginBottom:10, display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ background:themeColor, color:'#fff', borderRadius:'50%', width:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
                    {unplaced.length}
                  </span>
                  Drag cards into the bins above:
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(88px, 1fr))', gap:10 }}>
                  {unplaced.map(renderCard)}
                </div>
              </div>
            )}

            {/* LEGEND */}
            <div style={{ marginTop:16, padding:'10px 14px', background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'Poppins,sans-serif', fontSize:12, color:'#065f46' }}>
                <SvgCheck size={14} color="#10b981"/> Correct — locked with explanation
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'Poppins,sans-serif', fontSize:12, color:'#c2410c' }}>
                <SvgX size={14} color="#ef4444"/> Wrong — bounces back with hint
              </div>
              <div style={{ fontFamily:'Poppins,sans-serif', fontSize:12, color:'#6b7280' }}>
                🧲 Magnetic: <strong>iron, nickel, cobalt</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MagneticSortingTool;