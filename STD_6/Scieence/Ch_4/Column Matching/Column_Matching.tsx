import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, RotateCcw, Award, ChevronDown } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface PoleRow {
  id: string;
  left: string;           // e.g. "N" or ""
  right: string;          // e.g. "N" or ""
  leftBlank: boolean;     // true = left pole is a blank
  rightBlank: boolean;    // true = right pole is a blank
  correctLeft: string;    // correct answer for blank (if any)
  correctRight: string;   // correct answer for blank (if any)
  outcome: 'Attraction' | 'Repulsion';
}

interface MatchingData {
  title: string;
  subtitle: string;
  rows: PoleRow[];
  outcomes: string[];     // ["Attraction","Repulsion"]
}

interface MatchingToolProps {
  props?: {
    additionalProps?: {
      matchingData?: MatchingData;
    };
  };
}

// ─────────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────────

const defaultData: MatchingData = {
  title: 'Poles — Match & Fill',
  subtitle: 'Step 1: Fill each blank (N or S). Step 2: Draw lines from Column I to Column II.',
  rows: [
    { id: 'r1', left: 'N', right: 'N', leftBlank: false, rightBlank: false, correctLeft: 'N', correctRight: 'N', outcome: 'Repulsion' },
    { id: 'r2', left: 'N', right: '',  leftBlank: false, rightBlank: true,  correctLeft: 'N', correctRight: 'S', outcome: 'Attraction' },
    { id: 'r3', left: 'S', right: 'N', leftBlank: false, rightBlank: false, correctLeft: 'S', correctRight: 'N', outcome: 'Attraction' },
    { id: 'r4', left: '',  right: 'S', leftBlank: true,  rightBlank: false, correctLeft: 'S', correctRight: 'S', outcome: 'Repulsion' },
  ],
  outcomes: ['Attraction', 'Repulsion'],
};

// ─────────────────────────────────────────────────────────────────
// PARTICLES
// ─────────────────────────────────────────────────────────────────

interface Particle { id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; }

const ParticleBurst: React.FC<{ active: boolean; x: number; y: number }> = ({ active, x, y }) => {
  const [pts, setPts] = useState<Particle[]>([]);
  const raf = useRef(0);
  useEffect(() => {
    if (!active) return;
    const cols = ['#FC9145','#533086','#4A4DC9','#10b981','#C1C1EA','#FF7212'];
    setPts(Array.from({ length: 18 }, (_, i) => ({
      id: i, x, y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10-4,
      color: cols[i % cols.length], size: Math.random()*8+4, life: 1,
    })));
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      setPts(prev => {
        const next = prev.map(p => ({ ...p, x: p.x+p.vx, y: p.y+p.vy, vy: p.vy+12*dt, life: p.life-dt*2 })).filter(p=>p.life>0);
        if (next.length) raf.current = requestAnimationFrame(tick);
        return next;
      });
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, x, y]);
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:99999 }}>
      {pts.map(p => <div key={p.id} style={{ position:'absolute', left:p.x, top:p.y, width:p.size, height:p.size, borderRadius:'50%', background:p.color, opacity:p.life, transform:'translate(-50%,-50%)' }} />)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// POLE DISPLAY — renders a pole chip or a blank dropdown
// ─────────────────────────────────────────────────────────────────

const PoleChip: React.FC<{
  value: string;
  isBlank: boolean;
  isLocked: boolean;
  fillState: 'idle' | 'correct' | 'incorrect';
  onFill: (v: string) => void;
}> = ({ value, isBlank, isLocked, fillState, onFill }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const poleColor = value === 'N' ? '#4A4DC9' : value === 'S' ? '#ef4444' : '#9ca3af';
  const chipBg    = isBlank && !value ? '#f5f5f5'
                  : fillState === 'correct'   ? '#ecfdf5'
                  : fillState === 'incorrect' ? '#fef2f2'
                  : '#fff';
  const chipBorder = isBlank && !value ? '#CACACA'
                   : fillState === 'correct'   ? '#10b981'
                   : fillState === 'incorrect' ? '#ef4444'
                   : poleColor + '88';

  if (!isBlank) {
    return (
      <div style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        width:44, height:44, borderRadius:10,
        background:`${poleColor}18`, border:`2px solid ${poleColor}66`,
        fontWeight:800, fontSize:20, color:poleColor,
        fontFamily:'Poppins,sans-serif', flexShrink:0,
      }}>{value}</div>
    );
  }

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block', flexShrink:0 }}>
      <button
        onClick={() => { if (!isLocked) setOpen(o=>!o); }}
        style={{
          width:44, height:44, borderRadius:10,
          border:`2px solid ${chipBorder}`,
          background:chipBg, cursor: isLocked ? 'default' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:800, fontSize:20, color:poleColor || '#9ca3af',
          fontFamily:'Poppins,sans-serif', outline:'none',
          transition:'all 0.2s', position:'relative',
          boxShadow: open ? `0 0 0 3px ${chipBorder}44` : 'none',
        }}
      >
        {value || <span style={{ fontSize:12, fontWeight:600, color:'#CACACA' }}>?</span>}
        {!isLocked && <ChevronDown size={10} color="#9ca3af" style={{ position:'absolute', bottom:3, right:3 }} />}
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:'50%', transform:'translateX(-50%)',
          background:'#fff', border:'2px solid #C1C1EA', borderRadius:10,
          overflow:'hidden', zIndex:500, boxShadow:'0 8px 24px #5330861a',
          animation:'mtFadeIn 0.15s ease',
        }}>
          {['N','S'].map(opt => (
            <div key={opt}
              onMouseDown={e => { e.preventDefault(); onFill(opt); setOpen(false); }}
              style={{
                padding:'8px 18px', fontWeight:800, fontSize:18,
                color: opt==='N' ? '#4A4DC9' : '#ef4444',
                fontFamily:'Poppins,sans-serif', cursor:'pointer',
                background:'transparent', borderBottom:'1px solid #f0effe',
              }}
              onMouseEnter={e => (e.currentTarget.style.background='#f5f0ff')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}
            >{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

type FillStatus = 'idle' | 'correct' | 'incorrect';
type LineStatus = 'idle' | 'correct' | 'incorrect';

interface LineState {
  rowId: string;
  outcome: string;
  status: LineStatus;
}

const MatchingTool: React.FC<MatchingToolProps> = ({ props: compProps = {} }) => {
  const data: MatchingData = compProps?.additionalProps?.matchingData ?? defaultData;

  // ── Fill state for blanks ──
  const initFills = () => {
    const m: Record<string, { left: string; right: string; leftStatus: FillStatus; rightStatus: FillStatus }> = {};
    data.rows.forEach(r => { m[r.id] = { left: r.leftBlank ? '' : r.left, right: r.rightBlank ? '' : r.right, leftStatus:'idle', rightStatus:'idle' }; });
    return m;
  };
  const [fills, setFills] = useState(initFills);

  // ── Line drawing state ──
  const [lines, setLines]             = useState<LineState[]>([]);
  const [dragging, setDragging]       = useState<{ rowId: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos]       = useState({ x: 0, y: 0 });
  const [hintRowId, setHintRowId]     = useState<string | null>(null);
  const [showScore, setShowScore]     = useState(false);
  const [mounted, setMounted]         = useState(false);
  const [particle, setParticle]       = useState({ active:false, x:0, y:0 });

  const containerRef  = useRef<HTMLDivElement>(null);
  const rowRefs       = useRef<Record<string, HTMLDivElement | null>>({});
  const outcomeRefs   = useRef<Record<string, HTMLDivElement | null>>({});
  const hintTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // All blanks filled correctly?
  const allFillsCorrect = data.rows.every(r => {
    const f = fills[r.id];
    if (r.leftBlank  && f.left  !== r.correctLeft)  return false;
    if (r.rightBlank && f.right !== r.correctRight) return false;
    return true;
  });

  // All lines drawn correctly?
  const correctLines = lines.filter(l => l.status === 'correct');
  const allDone = allFillsCorrect && correctLines.length === data.rows.length;

  useEffect(() => { if (allDone) setTimeout(() => setShowScore(true), 600); }, [allDone]);

  // Inject keyframes once
  useEffect(() => {
    const id = 'mt-styles';
    if (document.getElementById(id)) { setMounted(true); return; }
    const el = document.createElement('style');
    el.id = id;
    el.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      @keyframes mtFadeIn  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      @keyframes mtSlideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      @keyframes mtPopIn   { 0%{opacity:0;transform:scale(0.82) translateY(18px)} 70%{transform:scale(1.05)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      @keyframes mtGrad    { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      @keyframes mtBounce  { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
      @keyframes mtPulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
      @keyframes mtHintFade{ 0%{opacity:0;transform:translateY(-6px)} 20%,80%{opacity:1;transform:translateY(0)} 100%{opacity:0} }
    `;
    document.head.appendChild(el);
    setTimeout(() => setMounted(true), 40);
    return () => { const e = document.getElementById(id); if (e) e.remove(); };
  }, []);

  // ── Fill handler ──
  const handleFill = useCallback((rowId: string, side: 'left'|'right', value: string) => {
    const row = data.rows.find(r => r.id === rowId)!;
    const correct = side === 'left' ? value === row.correctLeft : value === row.correctRight;
    setFills(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [side]: value,
        [`${side}Status`]: correct ? 'correct' : 'incorrect',
      },
    }));
    if (!correct) {
      setHintRowId(rowId);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setHintRowId(null), 3000);
      setTimeout(() => setFills(prev => ({ ...prev, [rowId]: { ...prev[rowId], [`${side}Status`]: 'idle', [side]: '' } })), 700);
    }
  }, [data]);

  // ── Drag start (from a row dot) ──
  const getCenter = (el: HTMLElement | null, container: HTMLElement | null): {x:number;y:number} | null => {
    if (!el || !container) return null;
    const er = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    return { x: er.left + er.width/2 - cr.left, y: er.top + er.height/2 - cr.top };
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent, rowId: string) => {
    e.preventDefault();
    const row = data.rows.find(r => r.id === rowId)!;
    // Only allow dragging if this row's blanks are filled correctly
    const f = fills[rowId];
    if (row.leftBlank  && f.left  !== row.correctLeft)  { showHint(rowId); return; }
    if (row.rightBlank && f.right !== row.correctRight) { showHint(rowId); return; }
    // Don't re-drag if already correctly matched
    if (lines.find(l => l.rowId === rowId && l.status === 'correct')) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const cr = containerRef.current?.getBoundingClientRect();
    if (!cr) return;
    setDragging({ rowId, x: clientX - cr.left, y: clientY - cr.top });
    setMousePos({ x: clientX - cr.left, y: clientY - cr.top });
  };

  const showHint = (rowId: string) => {
    setHintRowId(rowId);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintRowId(null), 3000);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging || !containerRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const cr = containerRef.current.getBoundingClientRect();
      setMousePos({ x: clientX - cr.left, y: clientY - cr.top });
    };
    const onUp = (e: MouseEvent | TouchEvent) => {
      if (!dragging || !containerRef.current) return;
      const clientX = 'touches' in e ? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;

      // Check if dropped on an outcome
      let matched: string | null = null;
      Object.entries(outcomeRefs.current).forEach(([outcome, el]) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
          matched = outcome;
        }
      });

      if (matched) {
        const row = data.rows.find(r => r.id === dragging.rowId)!;
        const correct = matched === row.outcome;
        const newLine: LineState = { rowId: dragging.rowId, outcome: matched, status: correct ? 'correct' : 'incorrect' };

        setLines(prev => {
          const without = prev.filter(l => !(l.rowId === dragging.rowId));
          return [...without, newLine];
        });

        if (correct) {
          setParticle({ active:true, x: clientX, y: clientY });
          setTimeout(() => setParticle(p=>({...p,active:false})), 1600);
        } else {
          showHint(dragging.rowId);
          setTimeout(() => setLines(prev => prev.filter(l => !(l.rowId === dragging.rowId && l.status === 'incorrect'))), 800);
        }
      }
      setDragging(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive:false });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, [dragging, data]);

  // ── Compute SVG line endpoints ──
  const computeLine = (rowId: string, outcome: string) => {
    const rowEl = rowRefs.current[rowId];
    const outEl = outcomeRefs.current[outcome];
    const cont  = containerRef.current;
    if (!rowEl || !outEl || !cont) return null;
    const rr = rowEl.getBoundingClientRect();
    const or = outEl.getBoundingClientRect();
    const cr = cont.getBoundingClientRect();
    return {
      x1: rr.right - cr.left,
      y1: rr.top + rr.height/2 - cr.top,
      x2: or.left - cr.left,
      y2: or.top + or.height/2 - cr.top,
    };
  };

  const reset = () => {
    setFills(initFills());
    setLines([]);
    setDragging(null);
    setShowScore(false);
  };

  const rowFillComplete = (rowId: string) => {
    const row = data.rows.find(r => r.id === rowId)!;
    const f = fills[rowId];
    if (row.leftBlank  && f.left  !== row.correctLeft)  return false;
    if (row.rightBlank && f.right !== row.correctRight) return false;
    return true;
  };

  return (
    <div style={{
      minHeight:'100vh', width:'100%',
      background:'linear-gradient(155deg,#f0effe 0%,#fff8f2 55%,#f5f0ff 100%)',
      fontFamily:'Poppins,sans-serif',
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'28px 16px 60px', boxSizing:'border-box',
      userSelect:'none',
    }}>
      <ParticleBurst active={particle.active} x={particle.x} y={particle.y} />

      {/* BG blobs */}
      <div style={{ position:'fixed', top:-120, right:-120, width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,#C1C1EA40,transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:-80, left:-80, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,#FFF3E440,transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      {/* ── HEADER ── */}
      <div style={{ width:'100%', maxWidth:760, textAlign:'center', marginBottom:24, zIndex:1,
        opacity:mounted?1:0, transform:mounted?'translateY(0)':'translateY(-18px)', transition:'all 0.5s ease' }}>
        <div style={{ fontSize:42, marginBottom:6 }}>🧲</div>
        <h1 style={{
          margin:0, lineHeight:1.2, letterSpacing:'-0.5px',
          fontSize:'clamp(22px,5vw,32px)', fontWeight:800,
          background:'linear-gradient(135deg,#533086 0%,#4A4DC9 50%,#FC9145 100%)',
          backgroundSize:'200% 200%', animation:'mtGrad 4s ease infinite',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
        }}>{data.title}</h1>
        <p style={{ margin:'10px 0 0', color:'#7c6ea0', fontSize:'clamp(12px,2.5vw,14px)', fontWeight:500, lineHeight:1.6 }}>
          {data.subtitle}
        </p>
      </div>

      {/* ── STEP BADGES ── */}
      <div style={{ display:'flex', gap:12, marginBottom:24, zIndex:1, flexWrap:'wrap', justifyContent:'center',
        opacity:mounted?1:0, transition:'opacity 0.5s 0.1s' }}>
        {[
          { n:1, label:'Fill the blanks', done: allFillsCorrect },
          { n:2, label:'Draw the lines',  done: allDone },
        ].map(s => (
          <div key={s.n} style={{
            display:'flex', alignItems:'center', gap:8, padding:'8px 16px',
            borderRadius:50, border:`2px solid ${s.done?'#10b981':'#C1C1EA'}`,
            background: s.done ? '#ecfdf5' : '#fff',
            transition:'all 0.4s',
          }}>
            <div style={{
              width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              background: s.done ? '#10b981' : 'linear-gradient(135deg,#533086,#4A4DC9)',
              color:'#fff', fontSize:11, fontWeight:700,
            }}>{s.done ? '✓' : s.n}</div>
            <span style={{ fontSize:13, fontWeight:600, color: s.done?'#065f46':'#533086' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── MAIN MATCHING AREA ── */}
      <div
        ref={containerRef}
        style={{
          width:'100%', maxWidth:760, position:'relative', zIndex:1,
          opacity:mounted?1:0, animation:mounted?'mtSlideUp 0.4s ease both':'none',
        }}
      >
        {/* SVG overlay for lines */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible', zIndex:10 }}>
          {/* Committed lines */}
          {lines.map(line => {
            const pts = computeLine(line.rowId, line.outcome);
            if (!pts) return null;
            const color = line.status === 'correct' ? '#10b981' : '#ef4444';
            const cx    = (pts.x1 + pts.x2) / 2;
            return (
              <g key={`${line.rowId}-${line.outcome}`}>
                <path
                  d={`M ${pts.x1} ${pts.y1} C ${cx} ${pts.y1}, ${cx} ${pts.y2}, ${pts.x2} ${pts.y2}`}
                  fill="none" stroke={color} strokeWidth={line.status==='correct'?3:2}
                  strokeDasharray={line.status==='incorrect'?'6 4':'none'}
                  opacity={0.9}
                />
                {line.status === 'correct' && (
                  <circle cx={(pts.x1+pts.x2)/2} cy={(pts.y1+pts.y2)/2} r={5} fill={color} opacity={0.7} />
                )}
              </g>
            );
          })}
          {/* Active drag line */}
          {dragging && (() => {
            const rowEl  = rowRefs.current[dragging.rowId];
            const cont   = containerRef.current;
            if (!rowEl || !cont) return null;
            const rr = rowEl.getBoundingClientRect();
            const cr = cont.getBoundingClientRect();
            const x1 = rr.right - cr.left;
            const y1 = rr.top + rr.height/2 - cr.top;
            const cx = (x1 + mousePos.x) / 2;
            return (
              <path
                d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                fill="none" stroke="#533086" strokeWidth={2.5} strokeDasharray="8 4" opacity={0.7}
              />
            );
          })()}
        </svg>

        <div style={{ display:'flex', alignItems:'stretch', gap:0 }}>

          {/* ── COLUMN I ── */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{
              textAlign:'center', padding:'10px 0', fontWeight:700, fontSize:13, color:'#533086',
              letterSpacing:'1px', textTransform:'uppercase',
              borderBottom:'2px solid #C1C1EA', marginBottom:4,
            }}>Column I</div>
            {data.rows.map((row, si) => {
              const f           = fills[row.id];
              const fillDone    = rowFillComplete(row.id);
              const hasLine     = lines.find(l => l.rowId === row.id && l.status === 'correct');
              const isHinted    = hintRowId === row.id;
              const isDragging  = dragging?.rowId === row.id;

              return (
                <div key={row.id} style={{ position:'relative' }}>
                  {/* Hint bubble */}
                  {isHinted && (
                    <div style={{
                      position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)',
                      background:'linear-gradient(135deg,#FFF3E4,#fff)', border:'1.5px solid #FC9145',
                      borderRadius:10, padding:'7px 12px', fontSize:11.5, color:'#7c3d00',
                      whiteSpace:'nowrap', zIndex:50, fontWeight:600, boxShadow:'0 4px 14px #FC914522',
                      animation:'mtHintFade 3s ease forwards',
                      pointerEvents:'none',
                    }}>
                      💡 Unlike poles attract, like poles repel
                    </div>
                  )}

                  <div
                    ref={el => { rowRefs.current[row.id] = el; }}
                    style={{
                      display:'flex', alignItems:'center', gap:6, padding:'12px 14px',
                      background: hasLine ? '#ecfdf5' : isDragging ? '#f0effe' : '#fff',
                      borderRadius:14,
                      border:`2px solid ${hasLine?'#10b98133':isDragging?'#533086':'#C1C1EA'}`,
                      boxShadow: isDragging ? '0 4px 20px #5330862a' : '0 2px 12px #5330860d',
                      transition:'all 0.25s',
                      animation: isHinted ? 'mtBounce 0.4s ease' : 'none',
                      cursor: fillDone && !hasLine ? 'grab' : 'default',
                      position:'relative',
                    }}
                    onMouseDown={e => startDrag(e, row.id)}
                    onTouchStart={e => startDrag(e, row.id)}
                  >
                    {/* Left pole */}
                    <PoleChip
                      value={f.left}
                      isBlank={row.leftBlank}
                      isLocked={f.leftStatus === 'correct'}
                      fillState={f.leftStatus}
                      onFill={v => handleFill(row.id, 'left', v)}
                    />

                    {/* Dash */}
                    <span style={{ fontWeight:800, fontSize:18, color:'#CACACA', flexShrink:0 }}>—</span>

                    {/* Right pole */}
                    <PoleChip
                      value={f.right}
                      isBlank={row.rightBlank}
                      isLocked={f.rightStatus === 'correct'}
                      fillState={f.rightStatus}
                      onFill={v => handleFill(row.id, 'right', v)}
                    />

                    {/* Drag handle dot */}
                    <div style={{ marginLeft:'auto', flexShrink:0 }}>
                      {hasLine
                        ? <CheckCircle size={20} color="#10b981" />
                        : fillDone
                          ? <div style={{
                              width:18, height:18, borderRadius:'50%',
                              background:'linear-gradient(135deg,#533086,#4A4DC9)',
                              boxShadow:'0 2px 8px #5330864d',
                              animation: !hasLine ? 'mtPulse 2s ease infinite' : 'none',
                            }} />
                          : <div style={{ width:18, height:18, borderRadius:'50%', background:'#EBEBEB' }} />
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── SPACER ── */}
          <div style={{ width:'clamp(40px,8vw,80px)', flexShrink:0 }} />

          {/* ── COLUMN II ── */}
          <div style={{ width:'clamp(110px,22vw,180px)', flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{
              textAlign:'center', padding:'10px 0', fontWeight:700, fontSize:13, color:'#533086',
              letterSpacing:'1px', textTransform:'uppercase',
              borderBottom:'2px solid #C1C1EA', marginBottom:4,
            }}>Column II</div>

            {/* Spacer to vertically center outcomes */}
            <div style={{ flex:1 }} />

            {data.outcomes.map(outcome => {
              const matchedLines = lines.filter(l => l.outcome === outcome && l.status === 'correct');
              const isAttractive = outcome === 'Attraction';
              const accentColor  = isAttractive ? '#10b981' : '#FC9145';

              return (
                <div
                  key={outcome}
                  ref={el => { outcomeRefs.current[outcome] = el; }}
                  style={{
                    padding:'clamp(12px,2vw,18px) clamp(10px,2vw,16px)',
                    borderRadius:14,
                    background: matchedLines.length > 0 ? `${accentColor}15` : '#fff',
                    border:`2px solid ${matchedLines.length > 0 ? accentColor : '#C1C1EA'}`,
                    textAlign:'center', fontWeight:700,
                    fontSize:'clamp(12px,2.5vw,15px)', color: matchedLines.length > 0 ? accentColor : '#533086',
                    boxShadow:'0 2px 12px #5330860d',
                    transition:'all 0.3s',
                    cursor:'default',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                  }}
                >
                  <span>{isAttractive ? '🤝' : '↔️'}</span>
                  <span>{outcome}</span>
                  {matchedLines.length > 0 && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center' }}>
                      {matchedLines.map(l => {
                        const row = data.rows.find(r=>r.id===l.rowId)!;
                        const f   = fills[l.rowId];
                        return (
                          <span key={l.rowId} style={{ fontSize:10, fontWeight:700, color:accentColor, background:`${accentColor}15`, borderRadius:6, padding:'2px 6px' }}>
                            {f.left}–{f.right}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ flex:1 }} />
          </div>
        </div>
      </div>

      {/* ── DRAG HINT ── */}
      {allFillsCorrect && !allDone && (
        <div style={{ marginTop:18, zIndex:1, textAlign:'center', color:'#9c89b8', fontSize:13, fontWeight:600, opacity: mounted?1:0, transition:'opacity 0.5s 0.3s' }}>
          ✋ Drag from the dot on each row to Attraction or Repulsion
        </div>
      )}

      {/* ── RESET ── */}
      <div style={{ marginTop:28, zIndex:1, opacity:mounted?1:0, transition:'opacity 0.5s 0.4s' }}>
        <button
          onClick={reset}
          style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'10px 26px', border:'2px solid #C1C1EA', borderRadius:50,
            background:'#fff', color:'#533086',
            fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:13,
            cursor:'pointer', transition:'all 0.22s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='linear-gradient(135deg,#533086,#4A4DC9)'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='transparent'; }}
          onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#533086'; e.currentTarget.style.borderColor='#C1C1EA'; }}
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {/* ── COMPLETION MODAL ── */}
      {showScore && (
        <div style={{ position:'fixed', inset:0, background:'#00000060', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99997, padding:16, backdropFilter:'blur(5px)' }}>
          <div style={{ background:'#fff', borderRadius:24, padding:'clamp(28px,5vw,48px)', textAlign:'center', maxWidth:460, width:'100%', animation:'mtPopIn 0.5s cubic-bezier(.34,1.56,.64,1) both', boxShadow:'0 24px 60px #5330864d', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:6, background:'linear-gradient(90deg,#533086,#FC9145)' }} />
            <div style={{ fontSize:56, marginBottom:8 }}>🎯</div>
            <h2 style={{ margin:'0 0 6px', fontSize:'clamp(20px,5vw,28px)', fontWeight:800, background:'linear-gradient(135deg,#533086,#FC9145)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              All matched!
            </h2>
            <p style={{ margin:'0 0 22px', color:'#9c89b8', fontWeight:500, fontSize:14 }}>
              You filled all blanks and matched all pole pairs correctly!
            </p>

            {/* Summary table */}
            <div style={{ background:'linear-gradient(135deg,#f5f0ff,#fff3e8)', borderRadius:16, padding:'16px 20px', marginBottom:24, border:'2px solid #C1C1EA' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div style={{ fontWeight:700, fontSize:12, color:'#9c89b8', textTransform:'uppercase', letterSpacing:'0.5px', paddingBottom:6, borderBottom:'1px solid #e8e4f5', textAlign:'left' }}>Column I</div>
                <div style={{ fontWeight:700, fontSize:12, color:'#9c89b8', textTransform:'uppercase', letterSpacing:'0.5px', paddingBottom:6, borderBottom:'1px solid #e8e4f5', textAlign:'left' }}>Column II</div>
                {data.rows.map(row => {
                  const f = fills[row.id];
                  const isAttr = row.outcome === 'Attraction';
                  return (
                    <React.Fragment key={row.id}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 0', fontSize:14, fontWeight:700 }}>
                        <span style={{ color:'#4A4DC9' }}>{f.left}</span>
                        <span style={{ color:'#CACACA' }}>–</span>
                        <span style={{ color:'#ef4444' }}>{f.right}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 0' }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background: isAttr?'#10b981':'#FC9145', flexShrink:0 }} />
                        <span style={{ fontSize:13, fontWeight:600, color: isAttr?'#10b981':'#FC9145' }}>{row.outcome}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div style={{ background:'#f0fdf9', borderRadius:12, padding:'10px 16px', marginBottom:22, border:'1.5px solid #10b98133', fontSize:13, color:'#047857', fontWeight:600, lineHeight:1.5 }}>
              ✅ Rule: <em>Unlike poles attract, like poles repel.</em>
            </div>

            <button
              onClick={reset}
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 32px', border:'none', borderRadius:50, background:'linear-gradient(135deg,#533086,#4A4DC9)', color:'#fff', fontFamily:'Poppins,sans-serif', fontWeight:700, fontSize:15, cursor:'pointer', boxShadow:'0 6px 24px #4A4DC944', transition:'transform 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.transform='scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform='scale(1)')}
            >
              <RotateCcw size={16} /> Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingTool;