import React, { useState, useEffect, useRef, useCallback } from 'react';

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
@keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes bounceX  { 0%{transform:translateX(0)} 20%{transform:translateX(-12px)} 45%{transform:translateX(9px)} 65%{transform:translateX(-6px)} 82%{transform:translateX(4px)} 100%{transform:translateX(0)} }
@keyframes lockPop  { 0%{transform:scale(1)} 45%{transform:scale(1.07)} 70%{transform:scale(0.97)} 100%{transform:scale(1)} }
@keyframes hintDrop { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
@keyframes floatBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes confFall { 0%{transform:translateY(-12px) rotate(0deg);opacity:1} 100%{transform:translateY(130px) rotate(420deg);opacity:0} }
@keyframes modalIn  { 0%{transform:scale(0.75);opacity:0} 65%{transform:scale(1.04);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes gradAnim { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes pulsebtn { 0%,100%{box-shadow:0 4px 14px rgba(83,48,134,0.35)} 50%{box-shadow:0 4px 22px rgba(252,145,69,0.5)} }
@keyframes binGlow  { 0%,100%{box-shadow:0 0 0 0 rgba(83,48,134,0.2)} 50%{box-shadow:0 0 0 6px rgba(83,48,134,0.06)} }
@keyframes cardWig  { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-2deg)} 75%{transform:rotate(2deg)} }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface MaterialCard {
  id: string;
  label: string;
  emoji: string;
  bin: 'blocks' | 'noblock';
  reason: string;
}

interface MagneticSortingToolProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: {
      cards?: MaterialCard[];
      title?: string;
      subtitle?: string;
      blocksBinLabel?: string;
      noblockBinLabel?: string;
      completionMessage?: string;
    };
  };
  setStepDetails?: (d: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─── Default Cards ────────────────────────────────────────────────────────────
const DEFAULT_CARDS: MaterialCard[] = [
  { id: 'wood',      label: 'Wood',          emoji: '🪵', bin: 'noblock', reason: 'Wood is non-magnetic, so the magnetic effect passes through it.' },
  { id: 'glass',     label: 'Glass',         emoji: '🪟', bin: 'noblock', reason: 'Glass is non-magnetic, so the magnetic effect passes through it.' },
  { id: 'iron',      label: 'Iron Sheet',    emoji: '🔩', bin: 'blocks',  reason: 'Iron is a magnetic material — it absorbs and blocks the magnetic effect.' },
  { id: 'cardboard', label: 'Cardboard',     emoji: '📦', bin: 'noblock', reason: 'Cardboard is non-magnetic, so the magnetic effect passes through it.' },
  { id: 'plastic',   label: 'Plastic',       emoji: '🧴', bin: 'noblock', reason: 'Plastic is non-magnetic, so the magnetic effect passes through it.' },
  { id: 'steel',     label: 'Steel Plate',   emoji: '🛡️', bin: 'blocks',  reason: 'Steel contains iron and is magnetic — it absorbs and blocks the magnetic effect.' },
  { id: 'rubber',    label: 'Rubber',        emoji: '⭕', bin: 'noblock', reason: 'Rubber is non-magnetic, so the magnetic effect passes through it.' },
  { id: 'aluminium', label: 'Aluminium Foil',emoji: '✨', bin: 'noblock', reason: 'Aluminium is non-magnetic, so the magnetic effect passes through it.' },
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

// ─── Main Component ───────────────────────────────────────────────────────────
const MagneticSortingTool: React.FC<MagneticSortingToolProps> = ({ props: toolProps = {} }) => {
  const { additionalProps = {} } = toolProps;
  const cards           = additionalProps.cards              ?? DEFAULT_CARDS;
  const title           = additionalProps.title              ?? 'Magnetic Sorting Challenge';
  const subtitle        = additionalProps.subtitle           ?? 'Drag each material into the correct bin';
  const blockLabel      = additionalProps.blocksBinLabel     ?? 'Blocks Magnetic Effect';
  const noblockLabel    = additionalProps.noblockBinLabel    ?? 'Does NOT Block Magnetic Effect';
  const completionMsg   = additionalProps.completionMessage  ?? 'All materials sorted! 🧲';

  const [pool,      setPool]      = useState<MaterialCard[]>(() => shuffle(cards));
  const [blocksSlots,  setBlocksSlots]  = useState<MaterialCard[]>([]);
  const [noblockSlots, setNoblockSlots] = useState<MaterialCard[]>([]);
  const [locked,    setLocked]    = useState<Set<string>>(new Set());
  const [bouncing,  setBouncing]  = useState<string | null>(null);
  const [hintCard,  setHintCard]  = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // drag
  const [dragCard, setDragCard] = useState<MaterialCard | null>(null);
  const [dragOver, setDragOver] = useState<'blocks' | 'noblock' | 'pool' | null>(null);

  // touch
  const touchCard   = useRef<MaterialCard | null>(null);
  const touchFrom   = useRef<'pool' | 'blocks' | 'noblock' | null>(null);
  const ghostRef    = useRef<HTMLDivElement | null>(null);
  const blocksRef   = useRef<HTMLDivElement | null>(null);
  const noblockRef  = useRef<HTMLDivElement | null>(null);
  const poolRef     = useRef<HTMLDivElement | null>(null);

  // Inject keyframes
  useEffect(() => {
    const s = document.createElement('style');
    s.innerHTML = KEYFRAMES;
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch (_) {} };
  }, []);

  // Check completion
  useEffect(() => {
    if (locked.size === cards.length && cards.length > 0) {
      setTimeout(() => setCompleted(true), 700);
    }
  }, [locked, cards.length]);

  // ── Place card ─────────────────────────────────────────────────────────────
  const tryPlace = useCallback((card: MaterialCard, targetBin: 'blocks' | 'noblock') => {
    if (locked.has(card.id)) return;
    if (card.bin === targetBin) {
      // Correct
      if (targetBin === 'blocks') setBlocksSlots(p => [...p, card]);
      else setNoblockSlots(p => [...p, card]);
      setLocked(prev => new Set(prev).add(card.id));
      setPool(p => p.filter(x => x.id !== card.id));
      // Also remove from other bin if it was there
      setBlocksSlots(p => p.filter(x => x.id !== card.id || targetBin === 'blocks'));
      setNoblockSlots(p => p.filter(x => x.id !== card.id || targetBin === 'noblock'));
    } else {
      // Wrong
      setBouncing(card.id);
      setHintCard(card.id);
      setTimeout(() => setBouncing(null), 560);
      setTimeout(() => setHintCard(null), 3500);
    }
  }, [locked]);

  // ── Desktop drag ───────────────────────────────────────────────────────────
  const onDragStart = (card: MaterialCard) => { setDragCard(card); };
  const onDropBin   = (bin: 'blocks' | 'noblock') => {
    if (dragCard) tryPlace(dragCard, bin);
    setDragCard(null); setDragOver(null);
  };
  const onDropPool = () => { setDragCard(null); setDragOver(null); };

  // ── Touch drag ─────────────────────────────────────────────────────────────
  const mkGhost = (card: MaterialCard, x: number, y: number) => {
    const g = document.createElement('div');
    g.innerHTML = `<span style="font-size:18px">${card.emoji}</span><span style="font-size:11px;font-weight:700;color:${DS.purple};margin-left:6px">${card.label}</span>`;
    Object.assign(g.style, {
      position:'fixed', zIndex:'9999', pointerEvents:'none',
      background: DS.white, border:`2px solid ${DS.purple}`, borderRadius:'99px',
      padding:'8px 14px', display:'flex', alignItems:'center',
      boxShadow: DS.shadowMd, transform:'translate(-50%,-50%) rotate(-2deg)',
      left:`${x}px`, top:`${y}px`, fontFamily: DS.font,
    });
    document.body.appendChild(g); ghostRef.current = g;
  };
  const mvGhost = (x: number, y: number) => {
    if (ghostRef.current) { ghostRef.current.style.left=`${x}px`; ghostRef.current.style.top=`${y}px`; }
  };
  const rmGhost = () => { if (ghostRef.current) { try { document.body.removeChild(ghostRef.current); } catch(_){} ghostRef.current=null; } };

  const overEl = (el: HTMLDivElement | null, x: number, y: number) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const handleTouchStart = (card: MaterialCard, from: 'pool' | 'blocks' | 'noblock', e: React.TouchEvent) => {
    const t = e.touches[0];
    touchCard.current = card; touchFrom.current = from;
    mkGhost(card, t.clientX, t.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0]; mvGhost(t.clientX, t.clientY);
    if (overEl(blocksRef.current, t.clientX, t.clientY)) setDragOver('blocks');
    else if (overEl(noblockRef.current, t.clientX, t.clientY)) setDragOver('noblock');
    else if (overEl(poolRef.current, t.clientX, t.clientY)) setDragOver('pool');
    else setDragOver(null);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]; rmGhost(); setDragOver(null);
    if (!touchCard.current) return;
    const card = touchCard.current;
    if (overEl(blocksRef.current, t.clientX, t.clientY)) tryPlace(card, 'blocks');
    else if (overEl(noblockRef.current, t.clientX, t.clientY)) tryPlace(card, 'noblock');
    touchCard.current = null; touchFrom.current = null;
  };

  const reset = () => {
    setPool(shuffle(cards)); setBlocksSlots([]); setNoblockSlots([]);
    setLocked(new Set()); setBouncing(null); setHintCard(null); setCompleted(false);
    setDragCard(null); setDragOver(null);
  };

  const total     = cards.length;
  const doneCount = locked.size;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const confetti = Array.from({ length: 22 }, (_, i) => ({
    id: i, color: [DS.purple, DS.orange, DS.green, DS.purpleLight, '#FC9145'][i % 5],
    left: `${3 + (i * 4.4) % 94}%`, delay: `${(i * 0.07).toFixed(2)}s`, size: 7 + (i % 4) * 3,
  }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: DS.font, minHeight:'100vh', background: DS.bg, padding:'18px 14px', position:'relative', overflowX:'hidden' }}>
      {/* Blobs */}
      <div style={{ position:'fixed', top:-90, right:-90, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(193,193,234,0.28)0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:-70, left:-70, width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,rgba(252,145,69,0.16)0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      <div style={{ maxWidth:700, margin:'0 auto', position:'relative', zIndex:1 }}>

        {/* ── Header ── */}
        <div style={{ textAlign:'center', marginBottom:22, animation:'fadeUp 0.5s ease' }}>
          <h1 style={{
            margin:'0 0 5px', fontSize:'clamp(16px,5vw,24px)', fontWeight:800, lineHeight:1.15,
            background: DS.gradient, backgroundSize:'200% 200%',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            animation:'gradAnim 4s ease infinite',
          }}>{title}</h1>
          <p style={{ margin:0, color: DS.gray1, fontSize:'clamp(12px,3vw,13px)', fontWeight:500 }}>{subtitle}</p>

          {/* Progress bar */}
          <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:10, justifyContent:'center' }}>
            <div style={{
              background: DS.white, border:`1.5px solid ${DS.purpleLight}`,
              borderRadius:99, padding:'4px 14px',
              display:'flex', alignItems:'center', gap:10, boxShadow: DS.shadow,
            }}>
              <div style={{ width:'min(120px,30vw)', height:6, background: DS.gray3, borderRadius:99, overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:99, width:`${pct}%`,
                  background: DS.gradient, transition:'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </div>
              <span style={{ fontSize:11, fontWeight:700, color: DS.purple, whiteSpace:'nowrap' }}>
                {doneCount} / {total}
              </span>
            </div>
          </div>
        </div>

        {/* ── Two Bins ── */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <Bin
            binRef={blocksRef}
            label={blockLabel}
            binKey="blocks"
            emoji="🛑"
            color={DS.red}
            lightColor={DS.redLight}
            cards={blocksSlots}
            locked={locked}
            bouncing={bouncing}
            hintCard={hintCard}
            isDragOver={dragOver === 'blocks'}
            onDragOver={e => { e.preventDefault(); setDragOver('blocks'); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => onDropBin('blocks')}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <Bin
            binRef={noblockRef}
            label={noblockLabel}
            binKey="noblock"
            emoji="✅"
            color={DS.green}
            lightColor={DS.greenLight}
            cards={noblockSlots}
            locked={locked}
            bouncing={bouncing}
            hintCard={hintCard}
            isDragOver={dragOver === 'noblock'}
            onDragOver={e => { e.preventDefault(); setDragOver('noblock'); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => onDropBin('noblock')}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {/* ── Card Pool ── */}
        <div
          ref={poolRef}
          onDragOver={e => { e.preventDefault(); setDragOver('pool'); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={onDropPool}
          style={{
            background: dragOver === 'pool' ? DS.purpleFaded : DS.white,
            border:`2px dashed ${dragOver === 'pool' ? DS.purple : DS.purpleLight}`,
            borderRadius: DS.radiusLg, padding:'13px 13px 15px',
            transition:'all 0.25s ease', boxShadow: DS.shadow,
            animation:'fadeUp 0.5s ease 0.1s both',
          }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:11 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background: DS.gradient, flexShrink:0 }} />
            <span style={{ fontSize:11, fontWeight:700, color: DS.purple, textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Materials to Sort
            </span>
            <div style={{ marginLeft:'auto', background: DS.purpleFaded, borderRadius:99, padding:'2px 10px', fontSize:11, fontWeight:700, color: DS.purple }}>
              {pool.length} left
            </div>
          </div>

          {pool.length === 0 ? (
            <div style={{ textAlign:'center', padding:'14px 0', color: DS.green, fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>✅</span> All cards placed!
            </div>
          ) : (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {pool.map((card, idx) => (
                <PoolCard
                  key={card.id}
                  card={card}
                  index={idx}
                  isDragging={dragCard?.id === card.id}
                  isBouncing={bouncing === card.id}
                  showHint={hintCard === card.id}
                  onDragStart={() => onDragStart(card)}
                  onTouchStart={e => handleTouchStart(card, 'pool', e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Reset ── */}
        <div style={{ textAlign:'center', marginTop:18 }}>
          <button
            onClick={reset}
            style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background: DS.gradient, color:'#fff', border:'none',
              borderRadius:99, padding:'10px 28px', fontSize:13, fontWeight:700,
              fontFamily: DS.font, cursor:'pointer', boxShadow: DS.shadowMd,
              transition:'transform 0.2s', animation:'pulsebtn 2.5s ease-in-out infinite',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* ── Completion ── */}
      {completed && (
        <CompletionModal
          message={completionMsg}
          cards={cards}
          blockLabel={blockLabel}
          noblockLabel={noblockLabel}
          onReset={reset}
          confetti={confetti}
        />
      )}
    </div>
  );
};

// ─── Bin Component ────────────────────────────────────────────────────────────
interface BinProps {
  binRef: React.RefObject<HTMLDivElement>;
  label: string; binKey: 'blocks' | 'noblock'; emoji: string;
  color: string; lightColor: string;
  cards: MaterialCard[]; locked: Set<string>;
  bouncing: string | null; hintCard: string | null;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onTouchStart: (card: MaterialCard, from: 'pool' | 'blocks' | 'noblock', e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

const Bin: React.FC<BinProps> = ({
  binRef, label, binKey, emoji, color, lightColor,
  cards, locked, bouncing, hintCard,
  isDragOver, onDragOver, onDragLeave, onDrop,
  onTouchStart, onTouchMove, onTouchEnd,
}) => (
  <div
    ref={binRef}
    onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
    style={{
      flex:'1 1 calc(50% - 5px)', minWidth:140,
      background: isDragOver ? (binKey === 'blocks' ? '#fee2e2' : '#dcfce7') : DS.white,
      border:`2px ${isDragOver ? 'solid' : 'dashed'} ${isDragOver ? color : DS.purpleLight}`,
      borderRadius: DS.radiusLg, padding:'12px 10px',
      transition:'all 0.25s ease',
      boxShadow: isDragOver ? DS.shadowMd : DS.shadow,
      animation:'fadeUp 0.5s ease both',
      minHeight:120,
    }}
  >
    {/* Bin header */}
    <div style={{
      display:'flex', alignItems:'center', gap:6, marginBottom:10,
      background: lightColor, borderRadius: DS.radiusSm,
      padding:'7px 10px', border:`1.5px solid ${color}`,
    }}>
      <span style={{ fontSize:18, flexShrink:0 }}>{emoji}</span>
      <span style={{ fontSize:'clamp(10px,2.5vw,12px)', fontWeight:700, color, lineHeight:1.2 }}>
        {label}
      </span>
    </div>

    {/* Cards inside bin */}
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {cards.map(card => {
        const isLocked = locked.has(card.id);
        return (
          <div key={card.id} style={{
            display:'flex', alignItems:'center', gap:8,
            background: isLocked ? lightColor : DS.bg,
            border:`1.5px solid ${isLocked ? color : DS.gray2}`,
            borderRadius: DS.radiusSm, padding:'7px 10px',
            animation: isLocked ? 'lockPop 0.4s ease' : undefined,
          }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{card.emoji}</span>
            <span style={{ flex:1, fontSize:12, fontWeight:700, color: isLocked ? color : DS.gray1 }}>
              {card.label}
            </span>
            {isLocked && (
              <div style={{
                width:20, height:20, borderRadius:'50%', flexShrink:0,
                background: color, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, color:'#fff', fontWeight:800,
              }}>✓</div>
            )}
          </div>
        );
      })}

      {cards.length === 0 && (
        <div style={{
          textAlign:'center', padding:'12px 8px',
          color: DS.gray2, fontSize:11, fontWeight:600, fontStyle:'italic',
        }}>
          Drop cards here…
        </div>
      )}
    </div>
  </div>
);

// ─── Pool Card ────────────────────────────────────────────────────────────────
interface PoolCardProps {
  card: MaterialCard; index: number; isDragging: boolean;
  isBouncing: boolean; showHint: boolean;
  onDragStart: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove:  (e: React.TouchEvent) => void;
  onTouchEnd:   (e: React.TouchEvent) => void;
}

const PoolCard: React.FC<PoolCardProps> = ({
  card, index, isDragging, isBouncing, showHint,
  onDragStart, onTouchStart, onTouchMove, onTouchEnd,
}) => (
  <div style={{ position:'relative', flexShrink:0 }}>
    <div
      draggable
      onDragStart={onDragStart}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        display:'flex', alignItems:'center', gap:7,
        background: isDragging ? DS.purpleFaded : DS.white,
        border:`1.5px solid ${isDragging ? DS.purple : DS.purpleLight}`,
        borderRadius:99, padding:'7px 14px',
        cursor:'grab', userSelect:'none',
        opacity: isDragging ? 0.3 : 1,
        animation: isBouncing
          ? 'bounceX 0.55s ease'
          : `fadeUp 0.35s ease ${index * 0.04}s both`,
        boxShadow: isDragging ? 'none' : DS.shadow,
        transition:'transform 0.18s, box-shadow 0.18s',
        touchAction:'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = DS.shadowMd;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = DS.shadow;
      }}
    >
      {/* grip dots */}
      <svg width="10" height="14" viewBox="0 0 10 14" style={{ flexShrink:0 }}>
        {[0,4,8].map(cy => [2,8].map(cx => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy+3} r="1.5" fill={DS.gray2} />
        )))}
      </svg>
      <span style={{ fontSize:18 }}>{card.emoji}</span>
      <span style={{ fontSize:12, fontWeight:600, color: DS.gray1, whiteSpace:'nowrap' }}>
        {card.label}
      </span>
    </div>

    {/* Hint bubble */}
    {showHint && (
      <div style={{
        position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:20, minWidth:200,
        background:'#fffbeb', border:`1.5px solid ${DS.orange}`,
        borderRadius:`0 ${DS.radius} ${DS.radius} ${DS.radius}`,
        padding:'7px 11px', boxShadow:'0 4px 14px rgba(252,145,69,0.22)',
        animation:'hintDrop 0.3s ease',
        display:'flex', alignItems:'flex-start', gap:6,
      }}>
        <span style={{ fontSize:13, flexShrink:0 }}>💡</span>
        <span style={{ fontSize:11, fontWeight:600, color:'#92400e', lineHeight:1.4 }}>
          Think: is this material magnetic or non-magnetic?
        </span>
      </div>
    )}
  </div>
);

// ─── Completion Modal ─────────────────────────────────────────────────────────
interface CompletionModalProps {
  message: string;
  cards: MaterialCard[];
  blockLabel: string;
  noblockLabel: string;
  onReset: () => void;
  confetti: { id:number; color:string; left:string; delay:string; size:number }[];
}

const CompletionModal: React.FC<CompletionModalProps> = ({
  message, cards, blockLabel, noblockLabel, onReset, confetti,
}) => {
  const blocking = cards.filter(c => c.bin === 'blocks');
  const passing  = cards.filter(c => c.bin === 'noblock');

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(83,48,134,0.5)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }}>
      {confetti.map(c => (
        <div key={c.id} style={{
          position:'fixed', top:0, left:c.left, width:c.size, height:c.size,
          background:c.color, borderRadius:3, pointerEvents:'none', opacity:0,
          animation:`confFall 2s ease ${c.delay} forwards`, zIndex:999,
        }} />
      ))}

      <div style={{
        background: DS.white, borderRadius: DS.radiusLg,
        padding:'18px 16px', maxWidth:540, width:'100%',
        boxShadow:'0 24px 64px rgba(83,48,134,0.3)',
        animation:'modalIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        border:`2px solid ${DS.purpleLight}`,
        overflow:'hidden',
      }}>
        {/* Compact header row */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <div style={{
            width:46, height:46, borderRadius:'50%', flexShrink:0,
            background: DS.gradient, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22, boxShadow: DS.shadowMd, animation:'floatBob 2s ease-in-out infinite',
          }}>🏆</div>
          <div>
            <h2 style={{
              margin:'0 0 2px', fontSize:'clamp(14px,4vw,17px)', fontWeight:800,
              background: DS.gradient, WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>{message}</h2>
            <p style={{ margin:0, color: DS.gray1, fontSize:11, fontWeight:500 }}>
              Here's your sorted result:
            </p>
          </div>
        </div>

        {/* Two columns */}
        <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap' }}>
          {/* Blocks column */}
          <div style={{
            flex:'1 1 130px',
            background: DS.redLight, border:`1.5px solid ${DS.red}`,
            borderRadius: DS.radiusSm, padding:'9px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:7 }}>
              <span style={{ fontSize:13 }}>🛑</span>
              <span style={{ fontSize:10, fontWeight:700, color: DS.red, lineHeight:1.2 }}>{blockLabel}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {blocking.map((c, i) => (
                <div key={c.id} style={{
                  display:'flex', alignItems:'center', gap:6,
                  background:'rgba(255,255,255,0.65)', borderRadius:7, padding:'5px 7px',
                  animation:`fadeUp 0.3s ease ${i*0.07}s both`,
                }}>
                  <span style={{ fontSize:14 }}>{c.emoji}</span>
                  <span style={{ fontSize:11, fontWeight:700, color: DS.red }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Does not block column */}
          <div style={{
            flex:'1 1 130px',
            background: DS.greenLight, border:`1.5px solid ${DS.green}`,
            borderRadius: DS.radiusSm, padding:'9px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:7 }}>
              <span style={{ fontSize:13 }}>✅</span>
              <span style={{ fontSize:10, fontWeight:700, color: DS.green, lineHeight:1.2 }}>{noblockLabel}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:4 }}>
              {passing.map((c, i) => (
                <div key={c.id} style={{
                  display:'flex', alignItems:'center', gap:5,
                  background:'rgba(255,255,255,0.65)', borderRadius:7, padding:'5px 7px',
                  animation:`fadeUp 0.3s ease ${(i+blocking.length)*0.05}s both`,
                }}>
                  <span style={{ fontSize:13 }}>{c.emoji}</span>
                  <span style={{ fontSize:11, fontWeight:700, color: DS.green }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key insight */}
        <div style={{
          background: DS.purpleFaded, border:`1.5px solid ${DS.purpleLight}`,
          borderRadius: DS.radiusSm, padding:'8px 11px', marginBottom:13,
          display:'flex', alignItems:'flex-start', gap:7,
        }}>
          <span style={{ fontSize:14, flexShrink:0 }}>🧲</span>
          <span style={{ fontSize:11, fontWeight:600, color: DS.purple, lineHeight:1.5 }}>
            <strong>Key insight:</strong> Only magnetic materials (iron, steel) block the magnetic effect. Non-magnetic materials let it pass through freely.
          </span>
        </div>

        <div style={{ textAlign:'center' }}>
          <button
            onClick={onReset}
            style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background: DS.gradient, color:'#fff', border:'none',
              borderRadius:99, padding:'9px 26px', fontSize:13, fontWeight:700,
              fontFamily: DS.font, cursor:'pointer', boxShadow: DS.shadowMd,
              transition:'transform 0.2s',
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

export default MagneticSortingTool;