import React, { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────
// INLINE SVG ICONS  (no lucide-react or any external icon library)
// ─────────────────────────────────────────────────────────────────

const SvgSun: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

const SvgStar: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const SvgCompass: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const SvgUsers: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SvgWind: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
  </svg>
);

const SvgCloud: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

const SvgCheckCircle: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const SvgXCircle: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const SvgRotateCcw: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface Card {
  id: string;
  label: string;
  icon: string;
  emoji: string;
  correctBin: 'clear' | 'overcast';
  hint: string;
  reason: string;
}

interface BinDef {
  id: 'clear' | 'overcast';
  label: string;
  subtitle: string;
  color: string;
  bgGradient: string;
  iconEmoji: string;
}

interface DirectionSortingToolProps {
  props?: {
    themeColor?: string;
    additionalProps?: {
      cards?: Card[];
      title?: string;
      subtitle?: string;
      instructionText?: string;
    };
  };
}

// ─────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CARDS: Card[] = [
  { id: 'sun',     label: 'Sun Position',     icon: 'sun',     emoji: '☀️', correctBin: 'clear',    hint: 'You need to see the Sun — clouds block it!',                    reason: 'Visible only when sky is clear' },
  { id: 'stars',   label: 'Star Patterns',    icon: 'star',    emoji: '⭐', correctBin: 'clear',    hint: 'Stars are hidden behind clouds at night!',                       reason: 'Stars invisible through cloud cover' },
  { id: 'compass', label: 'Magnetic Compass', icon: 'compass', emoji: '🧭', correctBin: 'overcast', hint: "A compass uses Earth's magnetic field, not the sky!",            reason: "Uses Earth's magnetic field — sky irrelevant" },
  { id: 'locals',  label: 'Asking Locals',    icon: 'users',   emoji: '👥', correctBin: 'overcast', hint: 'People can guide you in any weather!',                           reason: 'Human knowledge works in any weather' },
  { id: 'wind',    label: 'Wind Direction',   icon: 'wind',    emoji: '💨', correctBin: 'overcast', hint: 'Wind blows regardless of the sky above!',                        reason: 'Wind patterns work under any sky' },
  { id: 'clouds',  label: 'Cloud Shapes',     icon: 'cloud',   emoji: '☁️', correctBin: 'clear',    hint: 'Overcast sky blocks the cloud formation patterns you need to read!', reason: 'Requires visible sky — overcast blocks patterns' },
];

const BINS: BinDef[] = [
  { id: 'clear',    label: '☀️ Works When Sky is Clear',    subtitle: 'These methods need a cloudless sky',          color: '#f59e0b', bgGradient: 'linear-gradient(135deg,#fffbeb,#fef3c7)', iconEmoji: '☀️' },
  { id: 'overcast', label: '🌧️ Works When Sky is Overcast', subtitle: 'These methods work even in cloudy weather',    color: '#533086', bgGradient: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', iconEmoji: '🌧️' },
];

// ─────────────────────────────────────────────────────────────────
// KEYFRAMES (injected once)
// ─────────────────────────────────────────────────────────────────

const injectKeyframes = () => {
  if (document.getElementById('dst-kf')) return;
  const s = document.createElement('style');
  s.id = 'dst-kf';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    @keyframes dst-bounce  { 0%{transform:scale(1) translateX(0)} 20%{transform:scale(.95) translateX(-10px)} 40%{transform:scale(1.05) translateX(8px)} 60%{transform:scale(.98) translateX(-5px)} 80%{transform:scale(1.02) translateX(2px)} 100%{transform:scale(1) translateX(0)} }
    @keyframes dst-lockIn  { 0%{transform:scale(1)} 40%{transform:scale(1.1)} 70%{transform:scale(.96)} 100%{transform:scale(1)} }
    @keyframes dst-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
    @keyframes dst-confetti{ 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(230px) rotate(720deg);opacity:0} }
    @keyframes dst-slideUp { from{transform:translateY(22px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes dst-fadeScale{ from{transform:scale(.85);opacity:0} to{transform:scale(1);opacity:1} }
    @keyframes dst-dropPulse{ 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.35)} 50%{box-shadow:0 0 0 10px rgba(245,158,11,0)} }
    @keyframes dst-bar     { from{width:0%} }
    .dst-card { cursor:grab; transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease; }
    .dst-card:hover { transform:translateY(-3px) scale(1.025); box-shadow:0 10px 28px rgba(0,0,0,.12)!important; border-color:#9ca3af!important; }
    .dst-card:active { cursor:grabbing; }
    .dst-btn:hover { transform:scale(1.04) translateY(-1px); }
    .dst-mini-btn:hover { transform:scale(1.04); }
  `;
  document.head.appendChild(s);
};

// ─────────────────────────────────────────────────────────────────
// CARD ICON SWITCHER
// ─────────────────────────────────────────────────────────────────

const CardIcon: React.FC<{ icon: string; size?: number; color?: string }> = ({ icon, size = 22, color = '#533086' }) => {
  if (icon === 'sun')     return <SvgSun     size={size} color={color} />;
  if (icon === 'star')    return <SvgStar    size={size} color={color} />;
  if (icon === 'compass') return <SvgCompass size={size} color={color} />;
  if (icon === 'users')   return <SvgUsers   size={size} color={color} />;
  if (icon === 'wind')    return <SvgWind    size={size} color={color} />;
  if (icon === 'cloud')   return <SvgCloud   size={size} color={color} />;
  return <span style={{ fontSize: size * 0.7 }}>🔷</span>;
};

// ─────────────────────────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────────────────────────

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const pal = ['#f59e0b','#533086','#FC9145','#4A4DC9','#10b981','#ef4444'];
  const pieces = Array.from({ length: 26 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.65,
    color: pal[Math.floor(Math.random() * pal.length)],
    size: 7 + Math.random() * 9,
    round: Math.random() > 0.5,
  }));
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.left}%`, top:'-16px',
          width:p.size, height:p.size, backgroundColor:p.color,
          borderRadius: p.round ? '50%' : '3px',
          animation:`dst-confetti 1.6s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// SCORE SCREEN
// ─────────────────────────────────────────────────────────────────

const ScoreScreen: React.FC<{ correct: number; total: number; onReset: () => void }> = ({ correct, total, onReset }) => {
  const pct = Math.round((correct / total) * 100);
  const isGreat = pct === 100;
  const isGood  = pct >= 66;
  const barColor = isGreat ? 'linear-gradient(90deg,#10b981,#34d399)' : isGood ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#f97316,#fb923c)';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'44px 24px', animation:'dst-fadeScale .45s ease-out', textAlign:'center' }}>
      <div style={{ fontSize:70, marginBottom:16, animation:'dst-float 2.2s ease-in-out infinite' }}>
        {isGreat ? '🏆' : isGood ? '🎯' : '💪'}
      </div>
      <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:'clamp(22px,5vw,30px)', color:'#1f2937', marginBottom:8 }}>
        {isGreat ? 'Perfect Score!' : isGood ? 'Well Done!' : 'Keep Trying!'}
      </div>
      <div style={{ fontFamily:'Poppins,sans-serif', fontSize:15, color:'#6b7280', marginBottom:32 }}>
        You got{' '}<strong style={{ color:'#f59e0b', fontSize:18 }}>{correct}</strong>{' '}out of{' '}<strong style={{ fontSize:18 }}>{total}</strong>{' '}correct
      </div>
      <div style={{ width:'100%', maxWidth:320, marginBottom:36 }}>
        <div style={{ height:14, background:'#f3f4f6', borderRadius:999, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:barColor, animation:'dst-bar 1s ease-out forwards' }} />
        </div>
        <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:800, fontSize:26, color:'#533086', marginTop:10 }}>{pct}%</div>
      </div>
      <button className="dst-btn" onClick={onReset} style={{
        display:'inline-flex', alignItems:'center', gap:8, padding:'13px 32px',
        background:'linear-gradient(135deg,#533086,#4A4DC9)', color:'#fff',
        border:'none', borderRadius:14, cursor:'pointer',
        fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:15,
        boxShadow:'0 6px 22px rgba(83,48,134,.32)', transition:'transform .15s ease',
      }}>
        <SvgRotateCcw size={17} color="#fff" /> Try Again
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// PLACED CARD ROW
// ─────────────────────────────────────────────────────────────────

const PlacedRow: React.FC<{ card: Card; correct: boolean }> = ({ card, correct }) => {
  if (correct) {
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
        background:'linear-gradient(135deg,#d1fae5,#a7f3d0)',
        borderRadius:12, border:'2px solid #10b981',
        animation:'dst-lockIn .45s ease-out',
      }}>
        <span style={{ fontSize:20 }}>{card.emoji}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:13, color:'#065f46' }}>{card.label}</div>
          <div style={{ fontFamily:'Poppins,sans-serif', fontSize:11, color:'#059669', marginTop:2 }}>{card.reason}</div>
        </div>
        <SvgCheckCircle size={18} color="#10b981" />
      </div>
    );
  }
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#fef2f2', borderRadius:12, border:'2px solid #fca5a5', animation:'dst-bounce .5s ease-out' }}>
        <span style={{ fontSize:20 }}>{card.emoji}</span>
        <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:13, color:'#dc2626', flex:1 }}>{card.label}</div>
        <SvgXCircle size={18} color="#ef4444" />
      </div>
      <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginTop:4, padding:'7px 10px', background:'#fff7ed', borderRadius:8, border:'1px solid #fed7aa' }}>
        <span style={{ fontSize:13, flexShrink:0 }}>💡</span>
        <span style={{ fontFamily:'Poppins,sans-serif', fontSize:11, color:'#c2410c', lineHeight:1.4 }}>{card.hint}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// DRAGGABLE CARD (pool)
// ─────────────────────────────────────────────────────────────────

const DraggableCard: React.FC<{
  card: Card;
  isBouncing: boolean;
  isDragging: boolean;
  onDragStart: (id: string) => void;
}> = ({ card, isBouncing, isDragging, onDragStart }) => {
  // Neutral colours only — no colour hint about the correct bin
  return (
    <div
      className="dst-card"
      draggable
      onDragStart={() => onDragStart(card.id)}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'13px 16px',
        background: isDragging ? '#f3f4f6' : 'linear-gradient(135deg,#ffffff,#f9fafb)',
        borderRadius:14,
        border:`2px solid ${isDragging ? '#9ca3af' : '#e5e7eb'}`,
        boxShadow: isDragging ? '0 14px 36px rgba(0,0,0,.14)' : '0 2px 8px rgba(0,0,0,.06)',
        animation: isBouncing ? 'dst-bounce .5s ease-out' : 'none',
        transform: isDragging ? 'scale(1.04) rotate(-1.5deg)' : 'scale(1)',
        userSelect:'none', willChange:'transform',
      }}
    >
      <div style={{ width:46, height:46, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#f3f4f6' }}>
        <CardIcon icon={card.icon} size={22} color="#6b7280" />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:14, color:'#1f2937' }}>{card.label}</div>
        <div style={{ fontFamily:'Poppins,sans-serif', fontSize:11, color:'#9ca3af', marginTop:2 }}>{card.emoji}&nbsp; Drag to sort</div>
      </div>
      <div style={{ color:'#d1d5db', fontSize:22, lineHeight:1, flexShrink:0 }}>⠿</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// DROP BIN
// ─────────────────────────────────────────────────────────────────

const DropBin: React.FC<{
  bin: BinDef;
  placed: Array<{ card: Card; correct: boolean }>;
  isOver: boolean;
  onDrop: (id: 'clear'|'overcast') => void;
  onDragOver: (id: 'clear'|'overcast') => void;
  onDragLeave: () => void;
}> = ({ bin, placed, isOver, onDrop, onDragOver, onDragLeave }) => (
  <div
    onDrop={e => { e.preventDefault(); onDrop(bin.id); }}
    onDragOver={e => { e.preventDefault(); onDragOver(bin.id); }}
    onDragLeave={onDragLeave}
    style={{
      flex:'1 1 280px', minWidth:0, borderRadius:18,
      border:`2.5px dashed ${isOver ? bin.color : bin.color+'66'}`,
      background: isOver ? bin.bgGradient : '#fafafa',
      padding:'16px 14px', boxSizing:'border-box',
      transition:'all .2s ease',
      animation: isOver ? 'dst-dropPulse .9s ease-in-out infinite' : 'none',
      minHeight:220,
    }}
  >
    <div style={{ textAlign:'center', marginBottom:14, padding:'11px 14px', background:`linear-gradient(135deg,${bin.color},${bin.color}cc)`, borderRadius:12, boxShadow:`0 4px 14px ${bin.color}44` }}>
      <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:13, color:'#fff', lineHeight:1.35 }}>{bin.label}</div>
      <div style={{ fontFamily:'Poppins,sans-serif', fontSize:11, color:'rgba(255,255,255,.85)', marginTop:3 }}>{bin.subtitle}</div>
    </div>

    {placed.length === 0 && (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:90, color:bin.color+'99', fontFamily:'Poppins,sans-serif', fontSize:13 }}>
        <div style={{ fontSize:34, marginBottom:8, animation:'dst-float 2.4s ease-in-out infinite' }}>{bin.iconEmoji}</div>
        Drop cards here
      </div>
    )}

    <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
      {placed.map(({ card, correct }) => (
        <div key={card.id} style={{ animation:'dst-slideUp .3s ease-out' }}>
          <PlacedRow card={card} correct={correct} />
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────

const DirectionSortingTool: React.FC<DirectionSortingToolProps> = ({ props = {} }) => {
  const ap          = (props.additionalProps || {}) as any;
  const cards       = (ap.cards as Card[])        || DEFAULT_CARDS;
  const title       = (ap.title as string)         || 'Direction-Finding Methods';
  const subtitle    = (ap.subtitle as string)      || 'Chapter 4 – Exploring Magnets';
  const instruction = (ap.instructionText as string) || "Drag each direction-finding method into the correct bin. Think about which methods need a clear sky and which work even when it's overcast.";

  type Placed = Record<string, { binId: 'clear'|'overcast'; correct: boolean }>;

  const [placed,       setPlaced]       = useState<Placed>({});
  const [draggingId,   setDraggingId]   = useState<string|null>(null);
  const [overBin,      setOverBin]      = useState<'clear'|'overcast'|null>(null);
  const [bouncingIds,  setBouncingIds]  = useState<Set<string>>(new Set());
  const [showScore,    setShowScore]    = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => { injectKeyframes(); }, []);

  const correctCount = Object.values(placed).filter(v => v.correct).length;
  const allDone      = Object.keys(placed).length === cards.length;

  useEffect(() => {
    if (!allDone || cards.length === 0) return;
    const perfect = correctCount === cards.length;
    if (perfect) setShowConfetti(true);
    const t = setTimeout(() => { setShowScore(true); setShowConfetti(false); }, perfect ? 1400 : 400);
    return () => clearTimeout(t);
  }, [allDone]);

  const handleDrop = (binId: 'clear'|'overcast') => {
    if (!draggingId) return;
    const card = cards.find(c => c.id === draggingId);
    if (!card) return;
    const correct = card.correctBin === binId;
    setPlaced(prev => ({ ...prev, [draggingId]: { binId, correct } }));

    if (!correct) {
      const id = draggingId;
      setBouncingIds(prev => new Set(prev).add(id));
      setTimeout(() => {
        setPlaced(prev => { const n = { ...prev }; delete n[id]; return n; });
        setTimeout(() => setBouncingIds(prev => { const n = new Set(prev); n.delete(id); return n; }), 550);
      }, 1350);
    }
    setDraggingId(null);
    setOverBin(null);
  };

  const reset = () => { setPlaced({}); setDraggingId(null); setOverBin(null); setBouncingIds(new Set()); setShowScore(false); setShowConfetti(false); };

  const unplaced    = cards.filter(c => !placed[c.id]);
  const clearPlaced = cards.filter(c => placed[c.id]?.binId === 'clear').map(c => ({ card:c, correct:placed[c.id].correct }));
  const overPlaced  = cards.filter(c => placed[c.id]?.binId === 'overcast').map(c => ({ card:c, correct:placed[c.id].correct }));
  const pct         = Math.round((correctCount / cards.length) * 100);

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', minHeight:'100vh', background:'linear-gradient(160deg,#fffbeb 0%,#f5f3ff 55%,#fef3c7 100%)', boxSizing:'border-box' }}>
      <Confetti active={showConfetti} />

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#533086 0%,#4A4DC9 55%,#FC9145 100%)', padding:'clamp(18px,4vw,28px) clamp(16px,5vw,28px) clamp(14px,3vw,22px)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-34, right:-34, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-22, left:50,  width:80,  height:80,  borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
        <div style={{ position:'relative', maxWidth:720, margin:'0 auto' }}>
          <div style={{ display:'inline-block', padding:'3px 12px', borderRadius:20, background:'rgba(255,255,255,.18)', marginBottom:8, fontWeight:600, fontSize:11, color:'rgba(255,255,255,.92)', letterSpacing:1 }}>
            {subtitle.toUpperCase()}
          </div>
          <div style={{ fontWeight:800, fontSize:'clamp(17px,4vw,26px)', color:'#fff', lineHeight:1.25, marginBottom:12 }}>🧭 {title}</div>
          <div style={{ fontSize:'clamp(12px,2.5vw,13.5px)', color:'rgba(255,255,255,.88)', lineHeight:1.6, background:'rgba(255,255,255,.12)', padding:'10px 14px', borderRadius:10 }}>
            📌 <strong>Instructions:</strong> {instruction}
          </div>
        </div>
      </div>

      {/* PROGRESS */}
      <div style={{ padding:'11px 16px', background:'#fff', borderBottom:'1px solid #f3f4f6' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, maxWidth:720, margin:'0 auto' }}>
          <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:13, color:'#533086', whiteSpace:'nowrap' }}>{correctCount}/{cards.length} sorted</span>
          <div style={{ flex:1, height:8, background:'#f3f4f6', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#533086,#FC9145)', borderRadius:999, transition:'width .55s ease' }} />
          </div>
          {correctCount > 0 && (
            <button className="dst-mini-btn" onClick={reset} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 11px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', color:'#6b7280', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:12, transition:'transform .15s ease', whiteSpace:'nowrap' }}>
              <SvgRotateCcw size={13} color="#9ca3af" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding:'clamp(14px,3vw,22px) clamp(12px,4vw,20px)', maxWidth:760, margin:'0 auto', boxSizing:'border-box' }}>
        {showScore ? (
          <div style={{ background:'#fff', borderRadius:20, boxShadow:'0 8px 32px rgba(0,0,0,.08)' }}>
            <ScoreScreen correct={correctCount} total={cards.length} onReset={reset} />
          </div>
        ) : (
          <>
            {/* BINS — shown first, above the card pool */}
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:20 }}>
              <DropBin bin={BINS[0]} placed={clearPlaced} isOver={overBin === 'clear'}    onDrop={handleDrop} onDragOver={setOverBin} onDragLeave={() => setOverBin(null)} />
              <DropBin bin={BINS[1]} placed={overPlaced}  isOver={overBin === 'overcast'} onDrop={handleDrop} onDragOver={setOverBin} onDragLeave={() => setOverBin(null)} />
            </div>

            {/* POOL */}
            {unplaced.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:13, color:'#533086', marginBottom:10 }}>
                  <span style={{ background:'#533086', color:'#fff', borderRadius:'50%', width:22, height:22, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>{unplaced.length}</span>
                  Cards to Sort
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))', gap:10 }}>
                  {unplaced.map(card => (
                    <DraggableCard key={card.id} card={card} isBouncing={bouncingIds.has(card.id)} isDragging={draggingId === card.id} onDragStart={setDraggingId} />
                  ))}
                </div>
              </div>
            )}

            {/* LEGEND */}
            <div style={{ marginTop:16, padding:'11px 16px', background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', display:'flex', flexWrap:'wrap', gap:14, justifyContent:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Poppins,sans-serif', fontSize:12, color:'#065f46' }}>
                <SvgCheckCircle size={15} color="#10b981" /> Correct — locked green with reason
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Poppins,sans-serif', fontSize:12, color:'#c2410c' }}>
                <SvgXCircle size={15} color="#ef4444" /> Incorrect — bounces back with hint
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DirectionSortingTool;