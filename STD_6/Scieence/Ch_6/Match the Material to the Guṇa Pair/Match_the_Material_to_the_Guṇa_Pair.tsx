import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
interface Material { id:string; nameEn:string; nameHindi:string; emoji:string; color:string; bg:string; }
interface GunaPair { id:string; skA:string; skB:string; trA:string; trB:string; enA:string; enB:string; correct:string; hint:string; reason:string; }
interface Props { props?: { additionalProps?: { materials?:Material[]; gunaPairs?:GunaPair[]; } } }

// ─────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────
const MATS: Material[] = [
  { id:'iron',  nameEn:'Iron',  nameHindi:'लोहा',  emoji:'⚙️', color:'#555',   bg:'#EBEBEB' },
  { id:'cloth', nameEn:'Cloth', nameHindi:'कपड़ा', emoji:'🧵', color:'#533086',bg:'#E0D8F5' },
  { id:'water', nameEn:'Water', nameHindi:'जल',    emoji:'💧', color:'#2E4DC9',bg:'#D5DAF7' },
  { id:'honey', nameEn:'Honey', nameHindi:'मधु',   emoji:'🍯', color:'#A85C00',bg:'#FDECC8' },
  { id:'wood',  nameEn:'Wood',  nameHindi:'काष्ठ', emoji:'🪵', color:'#6B3A1F',bg:'#F0DEC8' },
];
const PAIRS: GunaPair[] = [
  { id:'p1', skA:'कठिन',   skB:'मृदु',    trA:'kaṭhina', trB:'mṛdu',    enA:'Hard',   enB:'Soft',   correct:'iron',  hint:'Cannot be scratched by a fingernail.',           reason:'Iron is kaṭhina — hard, rigid, resisting compression.' },
  { id:'p2', skA:'स्थिर', skB:'चल',      trA:'sthira',  trB:'khāla',   enA:'Stable', enB:'Moving', correct:'water', hint:'Flows and takes the shape of its container.',     reason:'Water is khāla — always moving, never holding form.' },
  { id:'p3', skA:'गुरु',  skB:'लघु',     trA:'guru',    trB:'laghu',   enA:'Heavy',  enB:'Light',  correct:'cloth', hint:'Airy, featherlight, floats in the breeze.',        reason:'Cloth is laghu — light, with air trapped in its fibres.' },
  { id:'p4', skA:'सान्द्र',skB:'द्रव',  trA:'sāndra',  trB:'drava',   enA:'Dense',  enB:'Fluid',  correct:'honey', hint:'Thick liquid — viscous and slow-flowing.',          reason:'Honey is sāndra — dense, viscous, heavy for its volume.' },
  { id:'p5', skA:'मृदु',  skB:'स्निग्ध',trA:'mṛdu',    trB:'snigdha', enA:'Soft',   enB:'Smooth', correct:'wood',  hint:'Can be carved; has a natural grain texture.',       reason:'Wood is mṛdu — softer than iron, carvable and smooth.' },
];

const P = '#533086';   // primary purple
const AC = '#FC9145';  // accent orange

// ─────────────────────────────────────────────────────────────────
// CSS  (injected into <head>)
// ─────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Sanskrit:ital@0;1&family=Nunito:wght@600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

@keyframes tileIn  { from{opacity:0;transform:scale(.8) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
@keyframes lockPop { 0%{transform:scale(1)} 40%{transform:scale(1.06)} 70%{transform:scale(.97)} 100%{transform:scale(1)} }
@keyframes hintIn  { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
@keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
@keyframes pop     { 0%{opacity:0;transform:scale(.8)} 60%{transform:scale(1.05)} 100%{opacity:1;transform:scale(1)} }
@keyframes confetti{ 0%{opacity:1;transform:scale(0) rotate(0)} 100%{opacity:0;transform:scale(2.2) rotate(210deg)} }
@keyframes drawCheck{ from{stroke-dashoffset:36} to{stroke-dashoffset:0} }
@keyframes summaryUp{ from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes dzPulse { 0%,100%{border-color:rgba(83,48,134,.3)} 50%{border-color:rgba(83,48,134,.7);background:rgba(83,48,134,.06)} }

/* ── MATERIAL ROW ─────────────────────────────────────── */
.mat-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);   /* always 5 equal columns */
  gap: 8px;
  margin-bottom: 18px;
}
@media(max-width:480px){ .mat-row{ gap:6px; } }
@media(max-width:360px){ .mat-row{ gap:4px; } }

/* ── MATERIAL TILE ────────────────────────────────────── */
.mat-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 10px 4px;
  border-radius: 12px;
  border: 2px solid;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;           /* critical for touch drag */
  transition: transform .16s, box-shadow .16s, opacity .16s, background .16s, border-color .16s;
  min-width: 0;                 /* prevent overflow in grid */
}
.mat-tile:active { cursor: grabbing; }
.mat-tile .mat-emoji  { font-size: clamp(18px, 4vw, 26px); line-height:1; }
.mat-tile .mat-en     { font-weight:800; font-size:clamp(9px,2.2vw,13px); text-align:center; line-height:1.2; }
.mat-tile .mat-hi     { font-family:"Tiro Devanagari Sanskrit",serif; font-size:clamp(8px,1.8vw,11px); line-height:1; opacity:.75; }

/* ── GUṆA GRID ────────────────────────────────────────── */
.guna-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media(max-width:480px){ .guna-grid{ grid-template-columns:1fr; } }

/* ── GUṆA CARD ────────────────────────────────────────── */
.gcard {
  background: #fff;
  border-radius: 14px;
  border: 2px solid transparent;
  padding: 14px 13px 12px;
  position: relative;
  box-shadow: 0 2px 10px rgba(83,48,134,.07);
  transition: border-color .16s, box-shadow .16s, background .16s;
  overflow: hidden;
}
.gcard.dg-over {
  border-color: ${P} !important;
  background: #EDE9FA !important;
  box-shadow: 0 0 0 3px rgba(83,48,134,.18), 0 6px 18px rgba(83,48,134,.14) !important;
}
.gcard.wrong  { animation: shake .5s ease-out; border-color:#ef4444!important; background:#FFF0F0!important; }
.gcard.locked { border-color:rgba(83,48,134,.3)!important; background:#FAFAFF!important; }

/* Sanskrit heading in card */
.gcard-sk {
  font-family:"Tiro Devanagari Sanskrit",serif;
  font-size: clamp(14px, 3vw, 19px);
  font-weight: 700;
  color: ${P};
  line-height: 1.3;
  word-break: keep-all;
}
.gcard-tr { font-size:10px; color:#9b8ec4; font-style:italic; margin-top:2px; }
.gcard-en { font-weight:800; font-size:12px; color:#1e1e2e; margin-top:3px; margin-bottom:10px; }

/* ── DROP ZONE ────────────────────────────────────────── */
.dz {
  min-height: 46px;
  border-radius: 9px;
  border: 2px dashed rgba(83,48,134,.25);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  transition: border-color .16s, background .16s;
  overflow: hidden;             /* prevent content poking outside */
}
.dz.dz-tap  { border-color:${P}; animation:dzPulse 1.4s ease-in-out infinite; cursor:pointer; }
.dz.dz-drag { border-color:${P}; background:rgba(83,48,134,.05); animation:dzPulse 1s ease-in-out infinite; }

/* ── LOCKED CHIP (inside drop zone) ─────────────────────── */
.locked-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 9px;
  border-radius: 7px;
  border: 1.5px solid;
  animation: lockPop .4s ease-out;
  min-width: 0;                 /* allow flex children to shrink */
  overflow: hidden;
}
.locked-chip .chip-en {
  font-weight:800;
  font-size: clamp(10px, 2.2vw, 13px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.locked-chip .chip-hi {
  font-family:"Tiro Devanagari Sanskrit",serif;
  font-size: clamp(9px, 1.8vw, 11px);
  opacity: .75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── HINT / REASON ───────────────────────────────────────── */
.hint-box, .reason-box {
  margin-top: 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 7px;
  padding: 7px 10px;
  animation: hintIn .28s ease-out;
  line-height: 1.5;
}
.hint-box   { color:#A85C00; background:#FFF3E4; }
.reason-box { color:#3a2464; background:#EEE9FA; border-left:3px solid ${P}; }

/* ── MATCHED BADGE ────────────────────────────────────────── */
.matched-badge {
  position:absolute; top:10px; right:10px;
  background:${P}; border-radius:20px;
  padding:2px 8px;
  font-size:8px; font-weight:900; color:#fff; letter-spacing:.8px;
  white-space: nowrap;
}

/* ── TAP BANNER ───────────────────────────────────────────── */
.tap-banner {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  background:rgba(83,48,134,.1); border:1.5px solid rgba(83,48,134,.3);
  border-radius:9px; padding:8px 12px; margin-bottom:12px;
  font-size:12px; font-weight:700; color:${P};
  animation:hintIn .22s ease-out;
}

/* ── CHECK CIRCLE ─────────────────────────────────────────── */
.check-circle {
  width:18px; height:18px; border-radius:50%;
  background:${P}; display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
`;

// ─────────────────────────────────────────────────────────────────
// CHECK ICON
// ─────────────────────────────────────────────────────────────────
const Check = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <polyline points="5,13 10,18 19,7" stroke="#fff" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray="36" style={{ animation:'drawCheck .35s ease-out forwards' }} />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────
const GunaMatcher: React.FC<Props> = ({ props = {} }) => {
  const mats   = props?.additionalProps?.materials  || MATS;
  const pairs  = props?.additionalProps?.gunaPairs  || PAIRS;
  const total  = pairs.length;

  // ── State ──────────────────────────────────────────────────────
  const [dragId,    setDragId]    = useState<string|null>(null); // material being dragged
  const [overPair,  setOverPair]  = useState<string|null>(null); // pair hovered during drag
  const [tapped,    setTapped]    = useState<string|null>(null); // tapped material id
  const [locked,    setLocked]    = useState<Record<string,true>>({});
  const [wrongPair, setWrongPair] = useState<string|null>(null);
  const [hints,     setHints]     = useState<Record<string,string>>({});
  const [reasons,   setReasons]   = useState<Record<string,string>>({});
  const [confetti,  setConfetti]  = useState<Record<string,true>>({});
  const [allDone,   setAllDone]   = useState(false);
  const [showSum,   setShowSum]   = useState(false);

  // drag-enter counter per pair (avoids child-element flicker)
  const entryCount = useRef<Record<string,number>>({});

  // ── CSS inject ─────────────────────────────────────────────────
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'gm'; el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.getElementById('gm')?.remove();
  }, []);

  // ── Derived ────────────────────────────────────────────────────
  const lockedCount = Object.keys(locked).length;
  const lockedMats  = useMemo(() =>
    new Set(Object.keys(locked).map(pid => pairs.find(p=>p.id===pid)?.correct ?? '')),
    [locked, pairs]);

  useEffect(() => {
    if (lockedCount === total && total > 0) setTimeout(() => setAllDone(true), 500);
  }, [lockedCount, total]);

  // ── Place ──────────────────────────────────────────────────────
  const place = useCallback((pairId: string, matId: string) => {
    if (locked[pairId]) return;
    const pair = pairs.find(p => p.id === pairId);
    if (!pair) return;
    if (pair.correct === matId) {
      setLocked(l  => ({ ...l,  [pairId]: true }));
      setReasons(r => ({ ...r,  [pairId]: pair.reason }));
      setHints(h   => { const n={...h}; delete n[pairId]; return n; });
      setConfetti(c => ({ ...c, [pairId]: true }));
      setTimeout(() => setConfetti(c => { const n={...c}; delete n[pairId]; return n; }), 850);
      setWrongPair(null);
    } else {
      setWrongPair(pairId);
      setHints(h => ({ ...h, [pairId]: pair.hint }));
      setTimeout(() => setWrongPair(null), 600);
    }
  }, [locked, pairs]);

  const reset = () => {
    setLocked({}); setHints({}); setReasons({}); setConfetti({});
    setWrongPair(null); setTapped(null); setDragId(null); setOverPair(null);
    setAllDone(false); setShowSum(false); entryCount.current = {};
  };

  // ── Drag ───────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setTimeout(() => setDragId(id), 0);   // set after ghost captured
    setTapped(null);
  };
  const onDragEnd = () => { setDragId(null); setOverPair(null); entryCount.current = {}; };

  const onEnter = (e: React.DragEvent, pid: string) => {
    e.preventDefault();
    entryCount.current[pid] = (entryCount.current[pid] ?? 0) + 1;
    setOverPair(pid);
  };
  const onOver  = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onLeave = (_e: React.DragEvent, pid: string) => {
    entryCount.current[pid] = Math.max(0, (entryCount.current[pid] ?? 1) - 1);
    if (entryCount.current[pid] === 0) setOverPair(p => p===pid ? null : p);
  };
  const onDrop  = (e: React.DragEvent, pid: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    entryCount.current[pid] = 0;
    setOverPair(null); setDragId(null);
    if (id) place(pid, id);
  };

  // ── Tap ────────────────────────────────────────────────────────
  const tapMat  = (id: string) => { if (!lockedMats.has(id)) setTapped(p => p===id ? null : id); };
  const tapPair = (pid: string) => { if (!locked[pid] && tapped) { place(pid, tapped); setTapped(null); } };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", background:'#F0EFF8', minHeight:'100vh' }}>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'18px 12px 44px' }}>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <div style={{
          background:`linear-gradient(135deg,${P},#7B4FC9)`,
          borderRadius:16, padding:'18px 18px 15px', marginBottom:18,
          display:'flex', alignItems:'center', gap:12,
          boxShadow:'0 6px 24px rgba(83,48,134,.26)',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', right:-20, top:-20, width:130, height:130, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
          <div style={{ fontSize:36, animation:'float 3s ease-in-out infinite', flexShrink:0 }}>🪷</div>
          <div style={{ flex:1, minWidth:0 }}>
            <h1 style={{ fontSize:'clamp(14px,4vw,22px)', fontWeight:900, color:'#fff', letterSpacing:-.3 }}>
              Ayurveda Guṇa Matcher
            </h1>
            <p style={{ fontSize:'clamp(10px,2.5vw,13px)', color:'rgba(255,255,255,.8)', margin:'4px 0 0', fontWeight:600 }}>
              Match each material to its guṇa pair — drag or tap to play!
            </p>
            {/* progress bar */}
            <div style={{ height:4, background:'rgba(255,255,255,.22)', borderRadius:3, marginTop:10, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, background:`linear-gradient(90deg,${AC},#FFD580)`,
                width:`${(lockedCount/total)*100}%`, transition:'width .5s ease' }} />
            </div>
            <div style={{ color:'rgba(255,255,255,.6)', fontSize:10, fontWeight:700, marginTop:3 }}>
              {lockedCount} / {total} matched
            </div>
          </div>
        </div>

        {/* ── ALL DONE BANNER ──────────────────────────────────── */}
        {allDone && (
          <div style={{
            background:`linear-gradient(135deg,${P},#7B4FC9)`,
            borderRadius:12, padding:'12px 16px', marginBottom:16,
            display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8,
            animation:'pop .4s ease-out', boxShadow:'0 5px 20px rgba(83,48,134,.28)',
          }}>
            <div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:14 }}>🎉 All {total} matched!</div>
              <div style={{ color:'rgba(255,255,255,.7)', fontSize:11, marginTop:1, fontWeight:600 }}>You've mastered the Ayurvedic guṇas.</div>
            </div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {[{ t:'View Summary 📜', fn:()=>setShowSum(true), bg:AC },
                { t:'Reset 🔄', fn:reset, bg:'rgba(255,255,255,.18)' }].map(b=>(
                <button key={b.t} onClick={b.fn} style={{
                  padding:'7px 14px', background:b.bg, color:'#fff', border:'none',
                  borderRadius:8, fontFamily:"'Nunito',sans-serif", fontWeight:800,
                  fontSize:12, cursor:'pointer',
                }}>{b.t}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── TAP BANNER ───────────────────────────────────────── */}
        {tapped && (
          <div className="tap-banner">
            <span>👆</span>
            <span style={{ flex:1 }}>
              <strong>{mats.find(m=>m.id===tapped)?.nameEn}</strong> selected — tap a guṇa pair card below.
            </span>
            <button onClick={()=>setTapped(null)} style={{
              background:'none', border:`1px solid rgba(83,48,134,.3)`,
              borderRadius:6, color:'#9b8ec4', cursor:'pointer',
              fontWeight:800, fontSize:11, padding:'2px 8px', whiteSpace:'nowrap',
            }}>Cancel ✕</button>
          </div>
        )}

        {/* ── SECTION LABEL ────────────────────────────────────── */}
        <SectionLabel text="Materials — drag or tap" />

        {/* ── MATERIAL ROW ─────────────────────────────────────── */}
        <div className="mat-row">
          {mats.map((m,i) => {
            const isLocked  = lockedMats.has(m.id);
            const isTapped  = tapped===m.id;
            const isDragged = dragId===m.id;
            return (
              <div
                key={m.id}
                className="mat-tile"
                style={{
                  background:   isLocked ? '#F0F0F0' : isTapped ? m.bg : '#fff',
                  borderColor:  isLocked ? '#D0D0D0' : isTapped ? m.color : `${m.color}66`,
                  opacity:      isLocked ? .38 : isDragged ? .4 : 1,
                  cursor:       isLocked ? 'not-allowed' : isDragged ? 'grabbing' : 'grab',
                  transform:    isTapped ? 'scale(1.07) translateY(-3px)' : isDragged ? 'scale(1.08)' : 'scale(1)',
                  boxShadow:    isTapped ? `0 6px 18px ${m.color}44` : '0 2px 6px rgba(0,0,0,.06)',
                  animationDelay:`${i*.06}s`,
                  animation:`tileIn .35s ease-out ${i*.06}s both`,
                }}
                draggable={!isLocked}
                onDragStart={e => !isLocked && onDragStart(e, m.id)}
                onDragEnd={onDragEnd}
                onClick={() => tapMat(m.id)}
              >
                <span className="mat-emoji">{m.emoji}</span>
                <span className="mat-en" style={{ color: isLocked ? '#aaa' : m.color }}>{m.nameEn}</span>
                <span className="mat-hi" style={{ color: isLocked ? '#ccc' : `${m.color}bb` }}>{m.nameHindi}</span>
              </div>
            );
          })}
        </div>

        {/* ── SECTION LABEL ────────────────────────────────────── */}
        <SectionLabel text="Guṇa Pairs — drop or tap" />

        {/* ── GUṆA GRID ────────────────────────────────────────── */}
        <div className="guna-grid">
          {pairs.map((pair, i) => {
            const isLocked  = !!locked[pair.id];
            const isWrong   = wrongPair===pair.id;
            const isDragOver= overPair===pair.id && !isLocked;
            const isTapReady= !!tapped && !isLocked;
            const hasCon    = !!confetti[pair.id];
            const hint      = hints[pair.id];
            const res       = reasons[pair.id];
            const mat       = isLocked ? mats.find(m=>m.id===pair.correct) : null;

            const cardCls = [
              'gcard',
              isLocked   ? 'locked'   : '',
              isWrong    ? 'wrong'    : '',
              isDragOver ? 'dg-over'  : '',
            ].filter(Boolean).join(' ');

            const dzCls = [
              'dz',
              isTapReady  ? 'dz-tap'  : '',
              isDragOver  ? 'dz-drag' : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={pair.id}
                className={cardCls}
                style={{ animation:`tileIn .35s ease-out ${i*.09+.12}s both` }}
                onDragEnter={e => !isLocked && onEnter(e, pair.id)}
                onDragOver={e  => !isLocked && onOver(e)}
                onDragLeave={e => !isLocked && onLeave(e, pair.id)}
                onDrop={e      => !isLocked && onDrop(e, pair.id)}
                onClick={() => tapPair(pair.id)}
              >
                {/* confetti burst */}
                {hasCon && <div style={{ position:'absolute', top:10, right:46, fontSize:16, animation:'confetti .8s ease-out forwards', pointerEvents:'none' }}>🎉</div>}

                {/* matched badge — top-right, won't overlap text */}
                {isLocked && <div className="matched-badge">✓ MATCHED</div>}

                {/* Sanskrit / transliteration / English */}
                <div className="gcard-sk" style={{ paddingRight: isLocked ? 76 : 0 }}>
                  {pair.skA} / {pair.skB}
                </div>
                <div className="gcard-tr">{pair.trA} / {pair.trB}</div>
                <div className="gcard-en">{pair.enA} / {pair.enB}</div>

                {/* DROP ZONE */}
                <div className={dzCls}>
                  {isLocked && mat ? (
                    /* ── Locked chip — always horizontal, text truncates if needed ── */
                    <div
                      className="locked-chip"
                      style={{
                        background:`linear-gradient(135deg,${mat.bg},#fff)`,
                        borderColor:`${mat.color}55`,
                      }}
                    >
                      <div className="check-circle"><Check /></div>
                      <span style={{ fontSize:16, flexShrink:0 }}>{mat.emoji}</span>
                      <span className="chip-en" style={{ color:mat.color }}>{mat.nameEn}</span>
                      <span className="chip-hi" style={{ color:`${mat.color}99` }}>{mat.nameHindi}</span>
                    </div>
                  ) : (
                    <span style={{
                      fontSize:11, fontWeight:700,
                      color: isTapReady ? P : '#c0b8d6',
                      transition:'color .15s',
                    }}>
                      {isTapReady ? '👆 Tap to place' : 'Drop material here'}
                    </span>
                  )}
                </div>

                {/* hint */}
                {hint && !isLocked && <div className="hint-box">💡 {hint}</div>}

                {/* reasoning */}
                {res && isLocked && (
                  <div className="reason-box">
                    <span style={{ fontFamily:"'Tiro Devanagari Sanskrit',serif", color:P, fontWeight:800 }}>{mat?.nameEn}</span>
                    {' → '}{res}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── FOOTER SHLOKA ────────────────────────────────────── */}
        <div style={{ marginTop:24, textAlign:'center', fontSize:11, color:'#9b8ec4', fontWeight:600 }}>
          <div style={{ fontFamily:"'Tiro Devanagari Sanskrit',serif", fontSize:13 }}>
            गुरु मन्द हिम स्निग्ध श्लक्ष्ण सान्द्र मृदु स्थिराः
          </div>
          <div style={{ fontStyle:'italic', opacity:.7, marginTop:3 }}>
            Aṣhtānga Hṛidaya Sūtra sthāna 1.18 — The 20 properties of all physical matter
          </div>
        </div>

      </div>

      {/* ── SUMMARY MODAL ──────────────────────────────────────── */}
      {showSum && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(20,10,45,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:14 }}
          onClick={e => { if (e.target===e.currentTarget) setShowSum(false); }}
        >
          <div style={{
            background:'#fff', borderRadius:20, padding:'28px 22px',
            maxWidth:480, width:'100%', maxHeight:'88vh', overflowY:'auto',
            boxShadow:'0 24px 64px rgba(83,48,134,.32)',
            animation:'summaryUp .4s cubic-bezier(.4,0,.2,1)',
          }}>
            <div style={{ textAlign:'center', fontSize:40, marginBottom:6 }}>🪷</div>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:20, fontWeight:800, color:P, textAlign:'center', marginBottom:3 }}>
              Guṇa Summary
            </div>
            <div style={{ textAlign:'center', color:'#7c6fa8', fontSize:12, fontWeight:600, marginBottom:18 }}>
              Each material resonates with a unique Ayurvedic quality pair.
            </div>
            {pairs.map(pair => {
              const mat = mats.find(m=>m.id===pair.correct);
              if (!mat) return null;
              return (
                <div key={pair.id} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:'1px solid #EEE9FA', alignItems:'flex-start' }}>
                  <span style={{ fontSize:20, flexShrink:0, marginTop:2 }}>{mat.emoji}</span>
                  <div>
                    <div style={{ fontWeight:800, color:P, fontSize:13 }}>
                      {mat.nameEn}
                      <span style={{ fontFamily:"'Tiro Devanagari Sanskrit',serif", color:'#9b8ec4', marginLeft:6, fontSize:12 }}>{mat.nameHindi}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#7c6fa8', marginTop:2 }}>
                      <span style={{ fontFamily:"'Tiro Devanagari Sanskrit',serif" }}>{pair.skA}/{pair.skB}</span>
                      {' · '}{pair.enA}/{pair.enB}
                    </div>
                    <div style={{ fontSize:11, color:'#5a5070', marginTop:3, fontStyle:'italic' }}>{pair.reason}</div>
                  </div>
                </div>
              );
            })}
            <button
              onClick={reset}
              style={{
                display:'block', width:'100%', marginTop:18, padding:12,
                background:`linear-gradient(135deg,${P},#7B4FC9)`, color:'#fff',
                border:'none', borderRadius:11, fontFamily:"'Nunito',sans-serif",
                fontWeight:800, fontSize:14, cursor:'pointer',
              }}
            >Try Again 🔄</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Small helper ──
const SectionLabel = ({ text }: { text:string }) => (
  <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, color:P, textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
    <span style={{ width:5, height:5, borderRadius:'50%', background:AC, display:'inline-block', flexShrink:0 }} />
    {text}
  </div>
);

export default GunaMatcher;