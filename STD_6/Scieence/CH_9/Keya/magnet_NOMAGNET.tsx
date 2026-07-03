// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START — magnetic_or_not_sorter.tsx
// Chapter 9 — Methods of Separation in Everyday Life (NCERT Curiosity Gr 6)
// Concept M3.S9.T15.C59 — Magnetic separation sorts magnetic from non-magnetic
// Objective O24: Define magnetic separation as separating magnetic from
//   non-magnetic substances by using a magnet.
//
// 12 everyday-object cards sorted into "Sticks to Magnet" and "Does NOT Stick".
// Key misconception targeted: "all metals are magnetic" — aluminium, copper,
// brass are metals but NOT magnetic.
// Singularity palette, Poppins, all inline SVG, no Tailwind.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ==================== DESIGN TOKENS ====================
const D = {
  primary:'#4A4DC9', pDark:'#533086', pLight:'#C1C1EA', pGhost:'#EDEDF8',
  accent:'#FF7212', aDark:'#FC9145', aLight:'#FFF3E4',
  g900:'#1A1A2E', g700:'#4E4E4E', g400:'#CACACA', g200:'#EBEBEB', g100:'#F5F5F5',
  white:'#FFFFFF', ok:'#2ECC71', okDk:'#1E9E54', okBg:'#EAF9F0',
  bad:'#E53E3E', badBg:'#FDECEC', amber:'#F59E0B',
  mag:'#E53E3E', nonmag:'#3B82F6',
};
const F = `'Poppins',system-ui,sans-serif`;
const R = { sm:8, md:12, lg:16, xl:24, pill:9999 };

// ==================== KEYFRAMES ====================
const KF = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
@keyframes ms_up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes ms_pop{0%{opacity:0;transform:scale(.5)}70%{transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
@keyframes ms_shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@keyframes ms_pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes ms_glow{0%,100%{box-shadow:0 0 0 0 rgba(229,62,62,0)}50%{box-shadow:0 0 0 8px rgba(229,62,62,.2)}}
@keyframes ms_float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes ms_confetti{0%{opacity:1;transform:translateY(-8px) rotate(0)}100%{opacity:0;transform:translateY(360px) rotate(540deg)}}
@keyframes ms_attract{0%{transform:translateY(0) rotate(0)}30%{transform:translateY(-6px) rotate(-3deg)}60%{transform:translateY(-12px) rotate(3deg)}100%{transform:translateY(-20px) rotate(0);opacity:0}}
@keyframes ms_bounce{0%{transform:scale(1)}50%{transform:scale(.92)}100%{transform:scale(1)}}
@keyframes ms_magnet_swoop{0%{transform:translate(0,0) rotate(0)}40%{transform:translate(0,-8px) rotate(-5deg)}70%{transform:translate(0,-4px) rotate(3deg)}100%{transform:translate(0,0) rotate(0)}}
`;

// ==================== OBJECT DATA ====================
interface Obj { id:string; name:string; emoji:string; isMagnetic:boolean; material:string; isMetal:boolean; hint:string; }

const OBJECTS: Obj[] = [
  // MAGNETIC (5)
  { id:'nail',     name:'Iron Nail',        emoji:'🔩', isMagnetic:true,  material:'Iron',        isMetal:true,  hint:'Iron is the most common magnetic substance.' },
  { id:'safepin',  name:'Steel Safety Pin',  emoji:'🧷', isMagnetic:true,  material:'Steel (iron)', isMetal:true,  hint:'Steel contains iron, so it is magnetic.' },
  { id:'key',      name:'Iron Key',         emoji:'🔑', isMagnetic:true,  material:'Iron',        isMetal:true,  hint:'Keys are often made of iron or steel, which are magnetic.' },
  { id:'clip',     name:'Steel Paper Clip', emoji:'📎', isMagnetic:true,  material:'Steel (iron)', isMetal:true,  hint:'Paper clips are steel — and steel has iron in it.' },
  { id:'spoon',    name:'Steel Spoon',      emoji:'🥄', isMagnetic:true,  material:'Steel (iron)', isMetal:true,  hint:'A steel spoon contains iron, making it magnetic.' },
  // NON-MAGNETIC metals (3) — misconception targets
  { id:'foil',     name:'Aluminium Foil',   emoji:'🪩', isMagnetic:false, material:'Aluminium',   isMetal:true,  hint:'Aluminium is a metal, but it is NOT magnetic!' },
  { id:'coin',     name:'Copper Coin',      emoji:'🪙', isMagnetic:false, material:'Copper',      isMetal:true,  hint:'Copper is a metal, but a magnet will not attract it.' },
  { id:'bell',     name:'Brass Bell',       emoji:'🔔', isMagnetic:false, material:'Brass (copper + zinc)', isMetal:true, hint:'Brass is made of copper and zinc — neither is magnetic.' },
  // NON-MAGNETIC non-metals (4)
  { id:'ruler',    name:'Plastic Ruler',    emoji:'📏', isMagnetic:false, material:'Plastic',     isMetal:false, hint:'Plastic is not a metal, so it cannot be magnetic.' },
  { id:'eraser',   name:'Rubber Eraser',    emoji:'🧽', isMagnetic:false, material:'Rubber',      isMetal:false, hint:'Rubber is not a metal and is not attracted to magnets.' },
  { id:'wood',     name:'Wooden Block',     emoji:'🪵', isMagnetic:false, material:'Wood',        isMetal:false, hint:'Wood is not a metal and is not magnetic.' },
  { id:'marble',   name:'Glass Marble',     emoji:'🔮', isMagnetic:false, material:'Glass',       isMetal:false, hint:'Glass is not a metal and cannot be attracted by a magnet.' },
];

// ==================== RESPONSIVE ====================
const useW = (ref: React.RefObject<HTMLElement>) => {
  const [w, setW] = useState(840);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const m = () => setW(el.getBoundingClientRect().width || 840);
    m();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(m); ro.observe(el); }
    window.addEventListener('resize', m);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', m); };
  }, [ref]);
  return { w, mob: w < 560 };
};

// ==================== CONFETTI ====================
const Conf: React.FC<{n:number}> = ({n}) => {
  const pal = [D.accent, D.primary, D.amber, '#DB2777', D.ok, D.mag, D.nonmag];
  const ps = useMemo(() => Array.from({ length: n }, (_, i) => ({
    l: Math.random() * 100, d: Math.random() * 0.5, t: 2 + Math.random(),
    c: pal[i % pal.length], s: 6 + Math.random() * 6, r: Math.random() > 0.5,
  })), [n]);
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 50 }}>
    {ps.map((x, i) => <div key={i} style={{ position: 'absolute', top: -10, left: `${x.l}%`, width: x.s, height: x.s,
      background: x.c, borderRadius: x.r ? '50%' : 2, animation: `ms_confetti ${x.t}s ${x.d}s ease-in forwards` }} />)}
  </div>;
};

// ==================== MAGNET SVG ====================
const MagnetIcon: React.FC<{ size: number; animate?: boolean }> = ({ size, animate }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block', animation: animate ? 'ms_magnet_swoop 1s ease' : undefined }}>
    <path d="M12 8 C12 4 16 2 24 2 C32 2 36 4 36 8 L36 24 C36 30 32 36 24 36 C16 36 12 30 12 24 Z" fill="#E53E3E" stroke="#B91C1C" strokeWidth="2"/>
    <rect x="10" y="6" width="8" height="6" rx="2" fill="#9CA3AF"/>
    <rect x="30" y="6" width="8" height="6" rx="2" fill="#9CA3AF"/>
    <path d="M18 14 C18 12 20 10 24 10 C28 10 30 12 30 14 L30 24 C30 28 28 30 24 30 C20 30 18 28 18 24 Z" fill={D.mag} opacity=".25"/>
    {/* field lines */}
    <path d="M17 38 Q17 42 20 44" fill="none" stroke="#E53E3E" strokeWidth="1.5" opacity=".5" strokeDasharray="2 2"/>
    <path d="M24 38 Q24 44 24 46" fill="none" stroke="#E53E3E" strokeWidth="1.5" opacity=".5" strokeDasharray="2 2"/>
    <path d="M31 38 Q31 42 28 44" fill="none" stroke="#E53E3E" strokeWidth="1.5" opacity=".5" strokeDasharray="2 2"/>
  </svg>
);

// ==================== MAIN COMPONENT ====================
interface ToolProps {
  props?: { width?: number; additionalProps?: { showHints?: boolean; shuffleSeed?: number }; [k: string]: any; };
  setStepDetails?: (s: any) => void;
  setStopAutoNext?: (v: boolean) => void;
}

const MagneticOrNotSorter: React.FC<ToolProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w: cw, mob } = useW(rootRef as React.RefObject<HTMLElement>);
  const showHints = props.additionalProps?.showHints ?? true;

  // Shuffle objects once
  const shuffled = useMemo(() => {
    const arr = [...OBJECTS];
    const seed = props.additionalProps?.shuffleSeed ?? Date.now();
    // Fisher-Yates with seed-ish
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.abs(((seed * (i + 1) * 9301 + 49297) % 233280)) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const [sorted, setSorted] = useState<Record<string, 'mag' | 'nonmag'>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [justPlaced, setJustPlaced] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [done, setDone] = useState(false);
  const [metalTraps, setMetalTraps] = useState(0); // non-magnetic metals correctly sorted
  const [metalToast, setMetalToast] = useState<string | null>(null); // special toast for non-mag metals
  const tW = useRef<any>(null);
  const tL = useRef<any>(null);
  const tT = useRef<any>(null);

  const remaining = shuffled.filter(o => !sorted[o.id]);
  const sortedCount = Object.keys(sorted).length;
  const magBin = shuffled.filter(o => sorted[o.id] === 'mag');
  const nonmagBin = shuffled.filter(o => sorted[o.id] === 'nonmag');

  useEffect(() => {
    const el = document.createElement('style'); el.id = 'ms-kf'; el.textContent = KF;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('ms-kf'); if (e) e.remove(); };
  }, []);

  useEffect(() => { setStopAutoNext?.(true); }, [setStopAutoNext]);
  useEffect(() => {
    setStepDetails?.({ currentStep: done ? 2 : 1, totalSteps: 2, isPaused: true, currentMode: 'learn' });
  }, [done, setStepDetails]);

  useEffect(() => {
    if (sortedCount === 12 && !done) setTimeout(() => setDone(true), 800);
  }, [sortedCount, done]);

  const selectCard = (id: string) => {
    if (done || sorted[id]) return;
    setSelected(prev => prev === id ? null : id);
    setHint(null); setWrongId(null);
  };

  const placeToBin = (bin: 'mag' | 'nonmag') => {
    if (done || !selected) return;
    const obj = OBJECTS.find(o => o.id === selected);
    if (!obj) return;

    const correct = (bin === 'mag' && obj.isMagnetic) || (bin === 'nonmag' && !obj.isMagnetic);

    if (correct) {
      setSorted(prev => ({ ...prev, [obj.id]: bin }));
      setSelected(null); setHint(null); setWrongId(null);
      setJustPlaced(obj.id);
      if (!obj.isMagnetic && obj.isMetal) {
        setMetalTraps(n => n + 1);
        setMetalToast(`✓ ${obj.name} is a METAL — but it is NOT magnetic! ${obj.material} does not stick to a magnet.`);
        clearTimeout(tT.current); tT.current = setTimeout(() => setMetalToast(null), 3500);
      }
      clearTimeout(tL.current); tL.current = setTimeout(() => setJustPlaced(null), 1200);
    } else {
      setWrongId(obj.id); setShakeKey(k => k + 1);
      if (showHints) setHint(obj.hint);
      else setHint('Not quite — think about whether a magnet would attract this material.');
      clearTimeout(tW.current); tW.current = setTimeout(() => { setWrongId(null); setHint(null); }, 3000);
    }
  };

  const reset = () => {
    setSorted({}); setSelected(null); setHint(null); setWrongId(null);
    setJustPlaced(null); setDone(false); setMetalTraps(0); setMetalToast(null);
  };

  useEffect(() => () => { clearTimeout(tW.current); clearTimeout(tL.current); clearTimeout(tT.current); }, []);

  // ── Card component ──
  const Card: React.FC<{ obj: Obj; inBin?: boolean }> = ({ obj, inBin }) => {
    const isSel = selected === obj.id;
    const isWr = wrongId === obj.id;
    const isJP = justPlaced === obj.id;
    const isNonmagMetal = inBin && !obj.isMagnetic && obj.isMetal && sorted[obj.id] === 'nonmag';
    return (
      <div
        onClick={() => !inBin && selectCard(obj.id)}
        key={shakeKey + obj.id}
        style={{
          display: 'flex', alignItems: 'center', gap: mob ? 8 : 10,
          padding: mob ? '10px 12px' : '12px 16px',
          borderRadius: R.lg, fontFamily: F,
          background: isNonmagMetal ? `${D.amber}10` : inBin ? `${sorted[obj.id] === 'mag' ? D.mag : D.nonmag}08` : isSel ? D.aLight : D.white,
          border: `2.5px solid ${isWr ? D.bad : isSel ? D.accent : isNonmagMetal ? `${D.amber}50` : inBin ? (sorted[obj.id] === 'mag' ? `${D.mag}40` : `${D.nonmag}40`) : D.g200}`,
          boxShadow: isSel ? '0 6px 18px rgba(26,26,46,.12)' : isJP ? `0 0 0 5px ${D.ok}30` : '0 2px 6px rgba(0,0,0,.04)',
          cursor: inBin ? 'default' : 'pointer',
          transform: isSel ? 'scale(1.04)' : 'scale(1)',
          transition: 'all .18s ease',
          animation: isWr ? 'ms_shake .45s' : isJP ? 'ms_pop .4s both' : isSel ? 'ms_pulse .8s infinite' : undefined,
          userSelect: 'none' as const,
          minWidth: 0, position: 'relative' as const,
        }}
      >
        <span style={{ fontSize: mob ? 22 : 26, flexShrink: 0 }}>{obj.emoji}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: mob ? 13 : 14, color: D.g900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{obj.name}</div>
          {/* In-bin: show material + prominent METAL badge for non-magnetic metals */}
          {inBin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: D.g700 }}>{obj.material}</span>
              {isNonmagMetal && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#92400E', background: `${D.amber}25`,
                  padding: '1px 7px', borderRadius: R.pill, border: `1px solid ${D.amber}40`,
                  textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
                  ⚠️ Metal
                </span>
              )}
              {inBin && obj.isMetal && obj.isMagnetic && (
                <span style={{ fontSize: 10, fontWeight: 600, color: D.g700, background: D.g100,
                  padding: '1px 6px', borderRadius: R.pill }}>
                  Metal
                </span>
              )}
            </div>
          )}
          {/* In grid: show small material chip */}
          {!inBin && (
            <div style={{ fontSize: 11, color: D.g400, marginTop: 1 }}>
              {obj.material}{obj.isMetal ? '' : ''}
            </div>
          )}
        </div>
        {inBin && (
          <span style={{ flexShrink: 0, fontSize: 14 }}>
            {sorted[obj.id] === 'mag' ? '🧲' : isNonmagMetal ? '⚠️' : '✗'}
          </span>
        )}
      </div>
    );
  };

  // ── BINS ──
  const Bin: React.FC<{ type: 'mag' | 'nonmag' }> = ({ type }) => {
    const isMag = type === 'mag';
    const color = isMag ? D.mag : D.nonmag;
    const items = isMag ? magBin : nonmagBin;
    const isActive = selected !== null;
    return (
      <div
        onClick={() => isActive && placeToBin(type)}
        style={{
          flex: 1, minWidth: mob ? 0 : 200, borderRadius: R.xl,
          border: `3px ${isActive ? 'solid' : 'dashed'} ${isActive ? color : `${color}40`}`,
          background: isActive ? `${color}06` : D.white,
          padding: mob ? 12 : 16,
          cursor: isActive ? 'pointer' : 'default',
          transition: 'all .2s ease',
          animation: isActive ? 'ms_glow 1.5s infinite' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>{isMag ? '🧲' : '🚫'}</span>
          <div>
            <div style={{ fontFamily: F, fontWeight: 800, fontSize: mob ? 13 : 15, color }}>
              {isMag ? 'Sticks to Magnet' : 'Does NOT Stick'}
            </div>
            <div style={{ fontFamily: F, fontSize: 11, color: D.g700 }}>
              {isMag ? 'Magnetic substances' : 'Non-magnetic substances'}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', fontFamily: F, fontWeight: 800, fontSize: 18, color, opacity: 0.5 }}>
            {items.length}
          </span>
        </div>
        {isActive && items.length === 0 && (
          <div style={{ fontFamily: F, fontSize: 12, color: `${color}80`, textAlign: 'center', padding: '14px 0',
            border: `2px dashed ${color}30`, borderRadius: R.md }}>
            Tap here to place
          </div>
        )}
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map(o => <Card key={o.id} obj={o} inBin />)}
        </div>
      </div>
    );
  };

  // ── HINT BAR ──
  const hintBar = () => {
    if (!hint) return null;
    return (
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: R.md,
        background: wrongId ? D.badBg : D.aLight, border: `1px solid ${wrongId ? D.bad : D.accent}40`,
        animation: 'ms_up .3s both' }}>
        <span style={{ flexShrink: 0, fontSize: 16 }}>💡</span>
        <span style={{ fontFamily: F, fontSize: 13.5, color: D.g900, lineHeight: 1.5 }}>{hint}</span>
      </div>
    );
  };

  // ── METAL TOAST (pops up when a non-magnetic metal is correctly placed) ──
  const metalToastBar = () => {
    if (!metalToast) return null;
    return (
      <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14,
        borderRadius: R.lg, background: `${D.amber}12`, border: `2px solid ${D.amber}40`,
        animation: 'ms_pop .4s both', boxShadow: '0 4px 16px rgba(245,158,11,.15)' }}>
        <span style={{ flexShrink: 0, fontSize: 22, animation: 'ms_magnet_swoop 1s ease' }}>⚠️</span>
        <div>
          <div style={{ fontFamily: F, fontWeight: 800, fontSize: 13, color: '#92400E', marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
            Metal Trap!
          </div>
          <div style={{ fontFamily: F, fontSize: 13.5, color: D.g900, lineHeight: 1.5 }}>{metalToast}</div>
        </div>
      </div>
    );
  };

  // ── METAL TRAP COUNTER (persistent, below the toast) ──
  const metalTrapCallout = () => {
    if (metalTraps === 0 || done || metalToast) return null;
    return (
      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', padding: '8px 14px',
        borderRadius: R.pill, background: `${D.amber}12`, border: `1px solid ${D.amber}30` }}>
        <span style={{ fontSize: 14 }}>🎯</span>
        <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 600, color: '#92400E' }}>
          You spotted {metalTraps}/3 non-magnetic metal{metalTraps > 1 ? 's' : ''}! Not all metals stick to a magnet.
        </span>
      </div>
    );
  };

  // ── DONE PAGE ──
  const donePage = () => {
    const nonmagMetals = OBJECTS.filter(o => !o.isMagnetic && o.isMetal);
    return (
      <div style={{ animation: 'ms_up .4s both', position: 'relative' }}>
        <Conf n={50} />
        <div style={{ textAlign: 'center', marginBottom: 16, position: 'relative', zIndex: 5 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56,
            borderRadius: '50%', background: D.okBg, animation: 'ms_pop .5s both', marginBottom: 6 }}>
            <span style={{ fontSize: 30 }}>🧲</span>
          </div>
          <div style={{ fontFamily: F, fontWeight: 800, fontSize: mob ? 20 : 24, color: D.g900 }}>All 12 Objects Sorted!</div>
        </div>

        {/* Summary table */}
        <div style={{ display: 'flex', gap: 14, flexDirection: mob ? 'column' : 'row', marginBottom: 18 }}>
          {/* Magnetic column */}
          <div style={{ flex: 1, background: `${D.mag}06`, borderRadius: R.lg, border: `2px solid ${D.mag}20`, padding: mob ? 12 : 16 }}>
            <div style={{ fontFamily: F, fontWeight: 800, fontSize: 14, color: D.mag, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              🧲 Sticks to Magnet ({magBin.length})
            </div>
            {magBin.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontFamily: F, fontSize: 13 }}>
                <span>{o.emoji}</span>
                <span style={{ fontWeight: 600, color: D.g900 }}>{o.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: D.g700, fontStyle: 'italic' }}>{o.material}</span>
              </div>
            ))}
          </div>
          {/* Non-magnetic column — split into metals vs non-metals */}
          <div style={{ flex: 1, background: `${D.nonmag}06`, borderRadius: R.lg, border: `2px solid ${D.nonmag}20`, padding: mob ? 12 : 16 }}>
            <div style={{ fontFamily: F, fontWeight: 800, fontSize: 14, color: D.nonmag, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              🚫 Does NOT Stick ({nonmagBin.length})
            </div>
            {/* Non-magnetic METALS sub-group */}
            {nonmagBin.filter(o => o.isMetal).length > 0 && (
              <div style={{ background: `${D.amber}10`, borderRadius: R.md, padding: '8px 10px', marginBottom: 8, border: `1px solid ${D.amber}25` }}>
                <div style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: '#92400E', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
                  ⚠️ These are metals — but NOT magnetic
                </div>
                {nonmagBin.filter(o => o.isMetal).map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontFamily: F, fontSize: 13 }}>
                    <span>{o.emoji}</span>
                    <span style={{ fontWeight: 600, color: D.g900 }}>{o.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#92400E', fontWeight: 700, fontStyle: 'italic' }}>
                      {o.material}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* Non-magnetic NON-METALS sub-group */}
            {nonmagBin.filter(o => !o.isMetal).map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontFamily: F, fontSize: 13 }}>
                <span>{o.emoji}</span>
                <span style={{ fontWeight: 600, color: D.g900 }}>{o.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: D.g700, fontStyle: 'italic' }}>
                  {o.material}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Key insight */}
        <div style={{ background: `${D.amber}12`, border: `2px solid ${D.amber}30`, borderRadius: R.lg, padding: mob ? 14 : 18, marginBottom: 14 }}>
          <div style={{ fontFamily: F, fontWeight: 800, fontSize: 15, color: '#92400E', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚠️ Key Insight — Not all metals are magnetic!
          </div>
          <div style={{ fontFamily: F, fontSize: 14, color: D.g900, lineHeight: 1.6 }}>
            {nonmagMetals.map(o => o.name).join(', ')} are all <b>metals</b> but a magnet does <b>not</b> attract them. Only metals that contain <b>iron</b>, <b>nickel</b>, or <b>cobalt</b> are magnetic. Steel is magnetic because it contains iron.
          </div>
        </div>

        {/* Definition */}
        <div style={{ background: D.pGhost, borderRadius: R.lg, padding: mob ? 14 : 18, borderLeft: `4px solid ${D.primary}`, marginBottom: 18 }}>
          <div style={{ fontFamily: F, fontWeight: 700, fontSize: 13, color: D.pDark, marginBottom: 4 }}>Definition</div>
          <div style={{ fontFamily: F, fontSize: 14, color: D.g900, lineHeight: 1.6 }}>
            Separating <b>magnetic</b> substances from <b>non-magnetic</b> substances by using a magnet is called <b style={{ color: D.pDark }}>magnetic separation</b>.
          </div>
        </div>

        {/* Textbook connection */}
        <div style={{ background: D.g100, borderRadius: R.lg, padding: mob ? 12 : 16, marginBottom: 18 }}>
          <div style={{ fontFamily: F, fontWeight: 700, fontSize: 13, color: D.g900, marginBottom: 6 }}>From your textbook</div>
          <div style={{ fontFamily: F, fontSize: 13, color: D.g700, lineHeight: 1.5, fontStyle: 'italic' }}>
            "A carpenter drops a few iron nails in the sawdust. A magnet is moved through the sawdust and all the nails get attracted to it." Recyclers also use magnets fitted to cranes to separate scrap iron from heaps of waste for recycling.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 24px',
            borderRadius: R.pill, fontFamily: F, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none',
            background: D.primary, color: D.white, boxShadow: '0 6px 16px rgba(74,77,201,.2)' }}>
            🔄 Sort again
          </button>
        </div>
      </div>
    );
  };

  // ==================== LAYOUT ====================
  return (
    <div ref={rootRef} style={{ width: '100%', maxWidth: props.width ?? 860, margin: '0 auto', fontFamily: F,
      color: D.g900, background: D.white, borderRadius: R.xl, overflow: 'hidden',
      boxShadow: '0 16px 40px rgba(26,26,46,.18)' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${D.pDark} 0%, ${D.primary} 50%, ${D.mag} 140%)`,
        padding: mob ? '14px 16px' : '18px 24px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MagnetIcon size={mob ? 32 : 38} />
          <div>
            <div style={{ fontWeight: 800, fontSize: mob ? 16 : 20 }}>Magnetic or Non-Magnetic?</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Sort twelve everyday objects — which ones stick to a magnet?</div>
          </div>
        </div>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, marginTop: 10, alignItems: 'center' }}>
          {shuffled.map(o => <div key={o.id} style={{ width: 8, height: 8, borderRadius: 8,
            background: sorted[o.id] ? D.ok : 'rgba(255,255,255,.3)', transition: 'all .25s' }} />)}
          <span style={{ fontFamily: F, fontSize: 11, fontWeight: 600, marginLeft: 5, opacity: 0.85 }}>
            {sortedCount}/12
          </span>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 4, background: D.g200 }}>
        <div style={{ width: `${(sortedCount / 12) * 100}%`, height: '100%', background: D.accent, transition: 'width .4s' }} />
      </div>

      {/* Body */}
      <div style={{ padding: mob ? 14 : 22, minHeight: 400 }}>
        {!done ? (
          <div style={{ animation: 'ms_up .4s both' }}>
            <div style={{ fontFamily: F, fontSize: mob ? 14 : 15, color: D.g700, lineHeight: 1.6, marginBottom: 14 }}>
              Tap an object, then tap the bin where it belongs. Would a <b>magnet</b> attract it, or not?
            </div>

            {/* Bins side by side */}
            <div style={{ display: 'flex', gap: mob ? 10 : 14, flexDirection: mob ? 'column' : 'row', marginBottom: 14 }}>
              <Bin type="mag" />
              <Bin type="nonmag" />
            </div>

            {/* Remaining cards */}
            {remaining.length > 0 && (
              <div>
                <div style={{ fontFamily: F, fontWeight: 700, fontSize: 13, color: D.g900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Objects to sort <span style={{ fontWeight: 500, color: D.g400 }}>({remaining.length} left)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                  {remaining.map(o => <Card key={o.id} obj={o} />)}
                </div>
              </div>
            )}

            {hintBar()}
            {metalToastBar()}
            {metalTrapCallout()}
          </div>
        ) : donePage()}
      </div>
    </div>
  );
};

export default MagneticOrNotSorter;
export { MagneticOrNotSorter };
// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════