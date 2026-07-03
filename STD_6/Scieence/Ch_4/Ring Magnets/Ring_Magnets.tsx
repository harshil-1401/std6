import React, { useState, useEffect } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';

interface MagnetAdditionalProps {
  question1Options?: string[];
  question2Options?: string[];
  correctAnswer1?: number;
  correctAnswer2?: number;
}
interface MagnetReasoningToolProps {
  props?: {
    themeColor?: string;
    additionalProps?: MagnetAdditionalProps;
  };
  setStepDetails?: (d: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (b: boolean) => void;
}

const C = {
  primary: '#4A4DC9', grad1: '#533086', grad2: '#FC9145',
  light1: '#C1C1EA', light2: '#FFF3E4',
  gray1: '#4E4E4E', gray2: '#CACACA', gray3: '#EBEBEB', bg: '#F5F5F5',
  amber: '#f59e0b', amberLt: '#fef3c7', amberDk: '#d97706',
  red: '#e03030', blue: '#1a3ebf', green: '#10b981',
};

const injectKF = () => {
  if (document.getElementById('mgkf4')) return;
  const s = document.createElement('style');
  s.id = 'mgkf4';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
    @keyframes floatUp   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-11px)} }
    @keyframes fadeInUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pop       { 0%{transform:scale(.5);opacity:0} 70%{transform:scale(1.1);opacity:1} 100%{transform:scale(1);opacity:1} }
    @keyframes shake     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
    @keyframes repUp     { 0%{opacity:0;transform:translateY(0)} 45%{opacity:1;transform:translateY(-12px)} 100%{opacity:0;transform:translateY(-26px)} }
    @keyframes repDown   { 0%{opacity:0;transform:translateY(0)} 45%{opacity:1;transform:translateY(12px)} 100%{opacity:0;transform:translateY(26px)} }
    @keyframes pulse     { 0%,100%{opacity:.4} 50%{opacity:.85} }
    @keyframes standGlow { 0%,100%{filter:drop-shadow(0 0 3px rgba(74,77,201,.35))} 50%{filter:drop-shadow(0 0 12px rgba(74,77,201,.75))} }
    @keyframes sparkle   { 0%{opacity:0;transform:scale(0) rotate(0deg)} 50%{opacity:1;transform:scale(1.3) rotate(180deg)} 100%{opacity:0;transform:scale(0) rotate(360deg)} }
    @keyframes flipHalf  { 0%{transform:scaleY(1)} 50%{transform:scaleY(0)} 100%{transform:scaleY(1)} }
  `;
  document.head.appendChild(s);
};

// ─── SVG constants ───────────────────────────────────────────────
// Canvas 220×420
// Magnet dimensions: outer radius 48, inner hole radius 20
// Stand: x=110, width=10
// Magnet Y centre: y=330  (bottom, fixed, N on top / S on bottom)
// Magnet X centre: y=116  (top, floating)
//   → X bottom edge = 116+48 = 164
//   → Y top edge    = 330-48 = 282
//   → gap = 282-164 = 118px  (clear space for repulsion arrows)
// After snap:  X centre = 330 - 48*2 - 6 = 330-102 = 228
//   → X bottom = 228+48 = 276  (6px gap above Y top 282)

const CX = 110, MR = 48, MI = 20;
const Y_Y = 330, YX_F = 116, YX_S = 228;
const GAP_MID = (YX_F + MR + Y_Y - MR) / 2; // midpoint of gap ≈ 223

// ── Ring magnet rendered as SVG ──────────────────────────────────
// topPole='N'|'S', bottomPole='N'|'S'
// N = red (#e03030), S = blue (#1a3ebf)
const POLE_COLOR: Record<string, string> = { N: C.red, S: C.blue };

interface MagProps { cx: number; cy: number; topPole: 'N'|'S'; label: string; }

const Magnet: React.FC<MagProps> = ({ cx, cy, topPole, label }) => {
  const botPole: 'N'|'S' = topPole === 'N' ? 'S' : 'N';
  const topClr = POLE_COLOR[topPole];
  const botClr = POLE_COLOR[botPole];

  const gradTopId = `gt_${label}`;
  const gradBotId = `gb_${label}`;
  const filtId    = `fs_${label}`;

  return (
    <g>
      <defs>
        <radialGradient id={gradTopId} cx="50%" cy="35%" r="68%">
          <stop offset="0%"   stopColor={topClr} stopOpacity=".78"/>
          <stop offset="100%" stopColor={topClr}/>
        </radialGradient>
        <radialGradient id={gradBotId} cx="50%" cy="65%" r="68%">
          <stop offset="0%"   stopColor={botClr} stopOpacity=".78"/>
          <stop offset="100%" stopColor={botClr}/>
        </radialGradient>
        <filter id={filtId} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="rgba(0,0,0,.30)"/>
        </filter>
      </defs>

      <g filter={`url(#${filtId})`}>
        {/* TOP half arc (above divider) */}
        <path
          d={`M ${cx-MR} ${cy}
              A ${MR} ${MR} 0 0 1 ${cx+MR} ${cy} Z`}
          fill={`url(#${gradTopId})`}
        />
        {/* BOTTOM half arc (below divider) */}
        <path
          d={`M ${cx-MR} ${cy}
              A ${MR} ${MR} 0 0 0 ${cx+MR} ${cy} Z`}
          fill={`url(#${gradBotId})`}
        />
        {/* Outer ring outline */}
        <circle cx={cx} cy={cy} r={MR} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2.5"/>
        {/* Divider line */}
        <line x1={cx-MR+2} y1={cy} x2={cx+MR-2} y2={cy}
          stroke="rgba(255,255,255,.55)" strokeWidth="2"/>
        {/* Inner hole */}
        <circle cx={cx} cy={cy} r={MI} fill={C.bg}/>
        <circle cx={cx} cy={cy} r={MI} fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1.5"/>
      </g>

      {/* ── POLE LABELS — placed in the coloured ring band, not over the hole ── */}
      {/* Top label: midpoint between inner hole top and outer top = cy - (MR+MI)/2 */}
      <text
        x={cx} y={cy - (MR + MI) / 2 - 1}
        textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize="16" fontWeight="800"
        fontFamily="Poppins,sans-serif"
        style={{ paintOrder:'stroke', stroke:'rgba(0,0,0,.35)', strokeWidth:3 }}
      >{topPole}</text>

      {/* Bottom label: midpoint between inner hole bottom and outer bottom */}
      <text
        x={cx} y={cy + (MR + MI) / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize="16" fontWeight="800"
        fontFamily="Poppins,sans-serif"
        style={{ paintOrder:'stroke', stroke:'rgba(0,0,0,.35)', strokeWidth:3 }}
      >{botPole}</text>

      {/* Magnet badge */}
      <rect x={cx+MR+5} y={cy-12} width={28} height={24} rx={12}
        fill={label==='X' ? C.amberDk : C.primary}/>
      <text x={cx+MR+19} y={cy+1}
        textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize="12" fontWeight="800"
        fontFamily="Poppins,sans-serif">{label}</text>
    </g>
  );
};

// ── Repulsion arrows between two magnets ─────────────────────────
const RepulseArrows: React.FC<{ visible: boolean; gapMid: number }> = ({ visible, gapMid }) => {
  if (!visible) return null;
  const dxs = [-32, -16, 0, 16, 32];
  return (
    <g>
      {/* amber glow ellipse */}
      <ellipse cx={CX} cy={gapMid} rx="52" ry="14" fill={C.amber}
        style={{ animation: 'pulse .8s ease-in-out infinite' }}/>
      {/* REPEL label */}
      <rect x={CX-30} y={gapMid-10} width={60} height={20} rx={10} fill={C.amber}/>
      <text x={CX} y={gapMid+1} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize="10" fontWeight="800" fontFamily="Poppins,sans-serif">⚡ REPEL</text>

      {/* arrows pointing UP (away from Y) */}
      {dxs.map((dx, i) => (
        <g key={`u${i}`} style={{ animation: `repUp .75s ease-out ${i*.09}s infinite` }}>
          <line x1={CX+dx} y1={gapMid-18} x2={CX+dx} y2={gapMid-28}
            stroke={C.amber} strokeWidth="2.5" strokeLinecap="round"/>
          <polygon points={`${CX+dx-5},${gapMid-28} ${CX+dx+5},${gapMid-28} ${CX+dx},${gapMid-38}`}
            fill={C.amber}/>
        </g>
      ))}
      {/* arrows pointing DOWN (away from X) */}
      {dxs.map((dx, i) => (
        <g key={`d${i}`} style={{ animation: `repDown .75s ease-out ${i*.09}s infinite` }}>
          <line x1={CX+dx} y1={gapMid+18} x2={CX+dx} y2={gapMid+28}
            stroke={C.amber} strokeWidth="2.5" strokeLinecap="round"/>
          <polygon points={`${CX+dx-5},${gapMid+28} ${CX+dx+5},${gapMid+28} ${CX+dx},${gapMid+38}`}
            fill={C.amber}/>
        </g>
      ))}
    </g>
  );
};

// ── Attraction label after snap ───────────────────────────────────
const AttractLabel: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  const jy = YX_S + MR + 8; // just below X bottom after snap
  return (
    <g>
      <ellipse cx={CX} cy={jy} rx="46" ry="11" fill={C.green}
        style={{ animation: 'pulse .9s ease-in-out infinite' }}/>
      <rect x={CX-38} y={jy-10} width={76} height={20} rx={10} fill={C.green}/>
      <text x={CX} y={jy+1} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize="10" fontWeight="800" fontFamily="Poppins,sans-serif">✓ ATTRACT!</text>
    </g>
  );
};

// ── Sparkles ──────────────────────────────────────────────────────
const Sparkles: React.FC<{ show: boolean; cy: number; color: string }> = ({ show, cy, color }) => {
  if (!show) return null;
  const pts = [[-38,-38],[38,-38],[-38,38],[38,38],[0,-50],[0,50],[-50,0],[50,0],[-24,-24],[24,-24],[-24,24],[24,24]];
  return (
    <>
      {pts.map(([dx,dy],i) => (
        <circle key={i} cx={CX+dx*0.82} cy={cy+dy*0.82} r={4.5} fill={color}
          style={{ animation:`sparkle .8s ease-out ${i*.055}s forwards`, opacity:0 }}/>
      ))}
    </>
  );
};

// ── Main Simulation SVG ──────────────────────────────────────────
interface SimProps {
  phase: 'idle' | 'repel' | 'flipping' | 'snapped';
  sp1: boolean; sp2: boolean;
}

const SimSVG: React.FC<SimProps> = ({ phase, sp1, sp2 }) => {
  // Physics setup:
  //   Magnet Y (fixed): topPole = N (red on top), bottomPole = S (blue on bottom)
  //   Magnet X initial: topPole = N (red on top), bottomPole = S (blue on bottom)
  //     → X bottom face = S, Y top face = N  → S-N → ATTRACT?  No!
  //     Wait — X sits ABOVE Y. The BOTTOM of X faces the TOP of Y.
  //     X bottom = S,  Y top = N  →  S-N = ATTRACT (unlike poles).
  //     That's wrong for the problem — we need repulsion first.
  //
  //   For REPULSION: X bottom must equal Y top.
  //   Y top = N → X bottom must = N → X must have N on BOTTOM, S on TOP initially.
  //
  //   After FLIP: X top becomes N (was S), X bottom becomes S (was N).
  //   Now X bottom = S, Y top = N → S-N = ATTRACT ✓
  //
  //   So:
  //     X initial:  topPole = S (blue), bottomPole = N (red)
  //     X flipped:  topPole = N (red),  bottomPole = S (blue)
  //     Y always:   topPole = N (red),  bottomPole = S (blue)

  const xFlipped = phase === 'flipping' || phase === 'snapped';
  const xTopPole: 'N'|'S' = xFlipped ? 'N' : 'S';
  const xSnapped = phase === 'snapped';
  const xCY = xSnapped ? YX_S : YX_F;

  const showRepel   = phase === 'repel';
  const showAttract = phase === 'snapped';

  // Gap midpoint for repulsion arrows (between X bottom and Y top)
  const gapMid = (YX_F + MR + Y_Y - MR) / 2;

  return (
    <svg viewBox="0 0 220 420" width="100%"
      style={{ maxWidth:210, display:'block', margin:'0 auto', overflow:'visible' }}>

      {/* STAND */}
      <g style={{ animation:'standGlow 2.2s ease-in-out infinite' }}>
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c7fe0"/>
            <stop offset="100%" stopColor={C.grad1}/>
          </linearGradient>
          <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.grad1}/>
            <stop offset="100%" stopColor={C.primary}/>
          </linearGradient>
        </defs>
        <rect x={CX-5} y={18} width={10} height={342} rx={5} fill="url(#sg)"/>
        <rect x={CX-2} y={20} width={3} height={338} rx={1.5} fill="rgba(255,255,255,.28)"/>
      </g>

      {/* BASE */}
      <rect x={CX-58} y={358} width={116} height={16} rx={8} fill="url(#bg2)"/>
      <rect x={CX-50} y={360} width={100} height={5} rx={2.5} fill="rgba(255,255,255,.22)"/>

      {/* ── MAGNET Y (fixed, bottom) ── */}
      {/* Y: N on top (red), S on bottom (blue) */}
      <Magnet cx={CX} cy={Y_Y} topPole="N" label="Y"/>

      {/* ── MAGNET X (animated) ── */}
      <g style={{
        transform: xSnapped ? `translateY(${YX_S - YX_F}px)` : undefined,
        transition: xSnapped ? 'transform .6s cubic-bezier(.34,1.56,.64,1)' : undefined,
        animation: !xSnapped ? 'floatUp 2.4s ease-in-out infinite' : undefined,
      }}>
        {/* Flip animation wrapper */}
        <g style={{
          transformOrigin:`${CX}px ${YX_F}px`,
          animation: phase==='flipping' ? 'flipHalf .72s ease-in-out forwards' : undefined,
        }}>
          <Magnet cx={CX} cy={YX_F} topPole={xTopPole} label="X"/>
        </g>
      </g>

      {/* ── REPULSION ARROWS ── */}
      <RepulseArrows visible={showRepel} gapMid={gapMid}/>

      {/* ── ATTRACTION LABEL ── */}
      <AttractLabel visible={showAttract}/>

      {/* ── SPARKLES ── */}
      <Sparkles show={sp1} cy={YX_F} color={C.amber}/>
      <Sparkles show={sp2} cy={YX_S} color={C.green}/>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const MagnetReasoningTool: React.FC<MagnetReasoningToolProps> = ({ props: tp = {} }) => {
  const ap = (tp.additionalProps ?? {}) as MagnetAdditionalProps;

  const q1Opts = ap.question1Options ?? ['Gravity is too weak here','Like poles repel each other','The stand is slippery'];
  const q2Opts = ap.question2Options ?? ['Remove the stand from the setup','Flip X so unlike poles face each other','Add a third magnet on top'];
  const c1 = ap.correctAnswer1 ?? 1;
  const c2 = ap.correctAnswer2 ?? 1;

  type Phase = 'idle' | 'repel' | 'flipping' | 'snapped';
  const [phase,  setPhase]  = useState<Phase>('idle');
  const [q1Sel,  setQ1Sel]  = useState<number|null>(null);
  const [q2Sel,  setQ2Sel]  = useState<number|null>(null);
  const [q1Ok,   setQ1Ok]   = useState(false);
  const [q2Ok,   setQ2Ok]   = useState(false);
  const [sp1,    setSp1]    = useState(false);
  const [sp2,    setSp2]    = useState(false);
  const [shake1, setShake1] = useState(false);
  const [shake2, setShake2] = useState(false);
  const [done,   setDone]   = useState(false);

  useEffect(() => { injectKF(); }, []);

  const handleQ1 = (i: number) => {
    if (q1Ok) return;
    setQ1Sel(i);
    if (i === c1) {
      setQ1Ok(true); setPhase('repel');
      setSp1(true); setTimeout(()=>setSp1(false), 900);
    } else {
      setShake1(true); setTimeout(()=>setShake1(false), 600);
    }
  };

  const handleQ2 = (i: number) => {
    if (!q1Ok || q2Ok) return;
    setQ2Sel(i);
    if (i === c2) {
      setQ2Ok(true);
      setTimeout(() => {
        setPhase('flipping');
        setTimeout(() => {
          setPhase('snapped');
          setSp2(true);
          setTimeout(() => { setSp2(false); setDone(true); }, 900);
        }, 750);
      }, 300);
    } else {
      setShake2(true); setTimeout(()=>setShake2(false), 600);
    }
  };

  const reset = () => {
    setPhase('idle'); setQ1Sel(null); setQ2Sel(null);
    setQ1Ok(false); setQ2Ok(false); setSp1(false); setSp2(false); setDone(false);
  };

  const letters = ['A','B','C','D'];

  const optStyle = (i: number, sel: number|null, correct: number, locked: boolean): React.CSSProperties => {
    const isSel=sel===i, isRight=i===correct;
    if(locked){ if(isRight) return{background:'#ecfdf5',border:'1.5px solid #34d399',color:'#059669'};
      if(isSel) return{background:'#fef2f2',border:'1.5px solid #fca5a5',color:'#dc2626'};
      return{background:'#fafafa',border:'1.5px solid #e5e7eb',color:C.gray2}; }
    if(isSel) return{background:C.light2,border:`1.5px solid ${C.amber}`,color:C.amberDk,boxShadow:`0 2px 12px ${C.amber}28`};
    return{background:'#fff',border:`1.5px solid ${C.gray3}`,color:C.gray1};
  };

  const iconStyle = (i: number, sel: number|null, correct: number, locked: boolean): React.CSSProperties => {
    const isSel=sel===i,isRight=i===correct;
    let bg=C.gray3;
    if(locked){if(isRight) bg='#34d399'; else if(isSel) bg='#fca5a5';}
    else if(isSel) bg=C.amber;
    return{width:24,height:24,borderRadius:'50%',background:bg,color:'#fff',
      flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:12,fontWeight:700,transition:'all .2s'};
  };

  // Info text based on phase
  const infoText = phase==='idle'
    ? 'X floats above Y — the bottom of X (N) faces the top of Y (N). What happens?'
    : phase==='repel'
    ? 'X bottom = N, Y top = N → N–N same poles push each other away!'
    : phase==='flipping'
    ? 'Flipping X… now X bottom = S, facing Y top = N'
    : 'X bottom = S, Y top = N → S–N unlike poles attract → snapped!';

  return (
    <div style={{
      fontFamily:"'Poppins',sans-serif",
      background:`linear-gradient(135deg,${C.light2} 0%,#fff 55%,${C.light1}33 100%)`,
      minHeight:'100vh', padding:'20px 16px', boxSizing:'border-box',
      display:'flex', flexDirection:'column', alignItems:'center', gap:22,
    }}>

      {/* HEADER */}
      <div style={{textAlign:'center', animation:'fadeInUp .6s ease-out'}}>
        <div style={{
          display:'inline-block',
          background:`linear-gradient(135deg,${C.grad1},${C.grad2})`,
          color:'#fff', fontSize:11, fontWeight:700, letterSpacing:2,
          textTransform:'uppercase', padding:'4px 16px', borderRadius:20, marginBottom:10,
        }}>🧲 Science Explorer</div>
        <h1 style={{fontSize:'clamp(20px,5vw,28px)',fontWeight:800,color:C.gray1,margin:0,lineHeight:1.2}}>
          Floating Ring Magnets
        </h1>
        <p style={{fontSize:'clamp(12px,3vw,14px)',color:C.gray2,margin:'6px 0 0',fontWeight:500}}>
          Select the correct answer — watch the simulation respond!
        </p>
      </div>

      {/* MAIN */}
      <div style={{
        display:'flex', flexWrap:'wrap', gap:20,
        width:'100%', maxWidth:980, justifyContent:'center', alignItems:'flex-start',
      }}>

        {/* VIZ CARD */}
        <div style={{
          background:'#fff', borderRadius:24, padding:'22px 18px',
          boxShadow:'0 4px 32px rgba(74,77,201,.10)',
          border:`1.5px solid ${C.light1}`,
          minWidth:230, maxWidth:290, flex:'1 1 230px',
          display:'flex', flexDirection:'column', alignItems:'center', gap:14,
          animation:'fadeInUp .7s ease-out .1s both',
        }}>
          <div style={{fontSize:11,fontWeight:700,color:C.grad1,letterSpacing:1.5,textTransform:'uppercase'}}>
            Live Simulation
          </div>

          {/* Pole legend */}
          <div style={{display:'flex',gap:10,width:'100%',justifyContent:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700}}>
              <div style={{width:14,height:14,borderRadius:'50%',background:C.red}}/>
              <span style={{color:C.red}}>N pole</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700}}>
              <div style={{width:14,height:14,borderRadius:'50%',background:C.blue}}/>
              <span style={{color:C.blue}}>S pole</span>
            </div>
          </div>

          <SimSVG phase={phase} sp1={sp1} sp2={sp2}/>

          {/* STATUS */}
          <div style={{display:'flex',flexDirection:'column',gap:7,width:'100%'}}>
            <div style={{
              display:'flex',alignItems:'center',gap:8,
              background: phase==='snapped' ? '#ecfdf550' : C.amberLt,
              border:`1.5px solid ${phase==='snapped'?'#34d39966':C.amber+'55'}`,
              borderRadius:12, padding:'7px 12px',
              fontSize:12, fontWeight:700,
              color: phase==='snapped' ? '#059669' : C.amberDk,
              transition:'all .4s',
            }}>
              <span>{phase==='snapped'?'✅':'🔴'}</span>
              Magnet X — {phase==='snapped' ? 'snapped!' : 'floating'}
            </div>
            <div style={{
              display:'flex',alignItems:'center',gap:8,
              background:`${C.primary}10`, border:`1.5px solid ${C.primary}40`,
              borderRadius:12, padding:'7px 12px',
              fontSize:12, fontWeight:700, color:C.primary,
            }}>
              <span>🔵</span> Magnet Y — base (fixed)
            </div>
          </div>

          {/* INFO BOX */}
          <div style={{
            background:`linear-gradient(135deg,${C.amberLt},#fff)`,
            border:`1.5px solid ${C.amber}44`, borderRadius:12,
            padding:'9px 12px', fontSize:12, fontWeight:600, color:C.amberDk,
            display:'flex', alignItems:'flex-start', gap:7,
            width:'100%', boxSizing:'border-box', lineHeight:1.45,
          }}>
            <span style={{fontSize:15,flexShrink:0}}>💡</span>
            <span>{infoText}</span>
          </div>
        </div>

        {/* QUESTIONS */}
        <div style={{flex:'1 1 300px',maxWidth:520,display:'flex',flexDirection:'column',gap:18}}>

          {/* Q1 */}
          <div style={{
            background: q1Ok?'linear-gradient(135deg,#ecfdf5,#f0fdf4)':'#fff',
            border:`1.5px solid ${q1Ok?'#34d39966':C.light1}`,
            borderRadius:20, padding:'22px 20px',
            boxShadow: q1Ok?'none':'0 4px 24px rgba(74,77,201,.07)',
            transition:'all .4s', animation:'fadeInUp .6s ease-out both',
          }}>
            <div style={{
              fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase' as const,
              color:q1Ok?C.green:C.primary, marginBottom:8,
              display:'flex',alignItems:'center',gap:7,
            }}>
              {q1Ok ? <Check size={14}/> : (
                <span style={{
                  width:22,height:22,borderRadius:'50%',
                  background:`linear-gradient(135deg,${C.grad1},${C.grad2})`,
                  color:'#fff',display:'inline-flex',alignItems:'center',
                  justifyContent:'center',fontSize:12,fontWeight:800,flexShrink:0,
                }}>1</span>
              )}
              Question 1 of 2
            </div>
            <div style={{fontSize:'clamp(14px,3.5vw,16px)',fontWeight:700,color:C.gray1,marginBottom:14,lineHeight:1.4}}>
              Why does magnet X float above magnet Y?
            </div>
            <div>
              {q1Opts.map((opt,i) => (
                <button key={i} onClick={()=>handleQ1(i)} style={{
                  width:'100%',textAlign:'left',padding:'12px 15px',
                  borderRadius:12, cursor:q1Ok?'default':'pointer',
                  fontFamily:"'Poppins',sans-serif",
                  fontSize:'clamp(12px,3vw,14px)',fontWeight:600,
                  marginBottom:8,display:'flex',alignItems:'center',gap:10,
                  transition:'all .22s',
                  animation:shake1&&q1Sel===i?'shake .5s ease':'none',
                  ...optStyle(i,q1Sel,c1,q1Ok),
                }}>
                  <div style={iconStyle(i,q1Sel,c1,q1Ok)}>
                    {q1Ok&&i===c1?<Check size={11}/>:q1Ok&&i!==c1&&i===q1Sel?<X size={11}/>:letters[i]}
                  </div>
                  {opt}
                </button>
              ))}
            </div>
            {q1Sel!==null&&!q1Ok&&(
              <div style={{marginTop:8,padding:'9px 13px',borderRadius:11,
                background:'#fef2f2',border:'1px solid #fca5a5',
                color:'#dc2626',fontSize:13,fontWeight:600,
                display:'flex',alignItems:'center',gap:7}}>
                <X size={14}/> Not quite — try again!
              </div>
            )}
            {q1Ok&&(
              <div style={{marginTop:8,padding:'9px 13px',borderRadius:11,
                background:'#ecfdf5',border:'1px solid #34d399',
                color:'#059669',fontSize:13,fontWeight:600,
                display:'flex',alignItems:'center',gap:7,animation:'pop .4s ease-out'}}>
                <Check size={14}/> Correct! X's bottom (N) faces Y's top (N) — same poles repel and X floats!
              </div>
            )}
          </div>

          {/* Q2 */}
          <div style={{
            background:q2Ok?'linear-gradient(135deg,#ecfdf5,#f0fdf4)':q1Ok?'#fff':'#fafafa',
            border:`1.5px solid ${q2Ok?'#34d39966':q1Ok?C.light1:'#e5e7eb'}`,
            borderRadius:20,padding:'22px 20px',
            boxShadow:q1Ok&&!q2Ok?'0 4px 24px rgba(74,77,201,.07)':'none',
            transition:'all .4s',
            opacity:q1Ok?1:.48, pointerEvents:q1Ok?'auto':'none',
            animation:'fadeInUp .6s ease-out .15s both',
          }}>
            <div style={{
              fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase' as const,
              color:q2Ok?C.green:q1Ok?C.primary:C.gray2,
              marginBottom:8,display:'flex',alignItems:'center',gap:7,
            }}>
              {q2Ok ? <Check size={14}/> : (
                <span style={{
                  width:22,height:22,borderRadius:'50%',
                  background:q1Ok?`linear-gradient(135deg,${C.grad1},${C.grad2})`:C.gray3,
                  color:'#fff',display:'inline-flex',alignItems:'center',
                  justifyContent:'center',fontSize:12,fontWeight:800,flexShrink:0,
                }}>2</span>
              )}
              Question 2 of 2
            </div>
            <div style={{fontSize:'clamp(14px,3.5vw,16px)',fontWeight:700,color:q1Ok?C.gray1:C.gray2,marginBottom:14,lineHeight:1.4}}>
              How can magnet X touch magnet Y without pushing either magnet?
            </div>
            {!q1Ok
              ? <div style={{color:C.gray2,fontSize:13,fontWeight:600}}>🔒 Answer Question 1 first.</div>
              : (
                <div>
                  {q2Opts.map((opt,i)=>(
                    <button key={i} onClick={()=>handleQ2(i)} style={{
                      width:'100%',textAlign:'left',padding:'12px 15px',
                      borderRadius:12,cursor:q2Ok?'default':'pointer',
                      fontFamily:"'Poppins',sans-serif",
                      fontSize:'clamp(12px,3vw,14px)',fontWeight:600,
                      marginBottom:8,display:'flex',alignItems:'center',gap:10,
                      transition:'all .22s',
                      animation:shake2&&q2Sel===i?'shake .5s ease':'none',
                      ...optStyle(i,q2Sel,c2,q2Ok),
                    }}>
                      <div style={iconStyle(i,q2Sel,c2,q2Ok)}>
                        {q2Ok&&i===c2?<Check size={11}/>:q2Ok&&i!==c2&&i===q2Sel?<X size={11}/>:letters[i]}
                      </div>
                      {opt}
                    </button>
                  ))}
                </div>
              )
            }
            {q2Sel!==null&&!q2Ok&&q1Ok&&(
              <div style={{marginTop:8,padding:'9px 13px',borderRadius:11,
                background:'#fef2f2',border:'1px solid #fca5a5',
                color:'#dc2626',fontSize:13,fontWeight:600,
                display:'flex',alignItems:'center',gap:7}}>
                <X size={14}/> Think about the poles — try again!
              </div>
            )}
            {q2Ok&&(
              <div style={{marginTop:8,padding:'9px 13px',borderRadius:11,
                background:'#ecfdf5',border:'1px solid #34d399',
                color:'#059669',fontSize:13,fontWeight:600,
                display:'flex',alignItems:'center',gap:7,animation:'pop .4s ease-out'}}>
                <Check size={14}/> Brilliant! Flipping X makes S face N → unlike poles attract → X snaps to Y!
              </div>
            )}
          </div>

          {(q1Sel!==null||q2Sel!==null)&&(
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button onClick={reset} style={{
                padding:'10px 22px',
                background:`linear-gradient(135deg,${C.grad1},${C.grad2})`,
                border:'none',borderRadius:24,color:'#fff',
                fontSize:14,fontWeight:700,cursor:'pointer',
                fontFamily:"'Poppins',sans-serif",
                display:'flex',alignItems:'center',gap:8,
                boxShadow:`0 4px 16px ${C.grad1}44`,
              }}>
                <RotateCcw size={14}/> Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* COMPLETION */}
      {done&&(
        <div style={{
          background:`linear-gradient(135deg,${C.grad1},${C.grad2})`,
          borderRadius:20,padding:'22px 28px',color:'#fff',
          textAlign:'center',fontSize:'clamp(14px,3.5vw,17px)',fontWeight:700,
          boxShadow:`0 8px 32px ${C.grad1}44`,
          animation:'pop .5s ease-out',
          width:'100%',maxWidth:980,boxSizing:'border-box',
        }}>
          <div style={{fontSize:30,marginBottom:6}}>🎉</div>
          <div>Excellent reasoning! You've mastered magnetic poles.</div>
          <div style={{fontSize:13,fontWeight:500,marginTop:4,opacity:.88}}>
            N–N repel&nbsp;•&nbsp;S–S repel&nbsp;•&nbsp;N–S attract&nbsp;•&nbsp;Poles always in pairs
          </div>
          <div style={{display:'flex',justifyContent:'center',marginTop:14}}>
            <button onClick={reset} style={{
              padding:'9px 22px',
              background:'rgba(255,255,255,.18)',border:'1.5px solid rgba(255,255,255,.4)',
              borderRadius:24,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',
              fontFamily:"'Poppins',sans-serif",display:'flex',alignItems:'center',gap:8,
            }}>
              <RotateCcw size={14}/> Try Again
            </button>
          </div>
        </div>
      )}

      {/* KEY CONCEPTS */}
      <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center',maxWidth:980}}>
        {[
          {icon:'🔴',label:'N–N: Repulsion',  bg:'#fef2f2',bd:'#fca5a5',cl:'#dc2626'},
          {icon:'🔵',label:'S–S: Repulsion',  bg:'#eff6ff',bd:'#93c5fd',cl:'#2563eb'},
          {icon:'✅',label:'N–S: Attraction', bg:'#ecfdf5',bd:'#6ee7b7',cl:'#059669'},
          {icon:'🧲',label:'Poles always in pairs',bg:C.light2,bd:C.grad2,cl:C.grad1},
        ].map((chip,i)=>(
          <div key={i} style={{
            background:chip.bg,border:`1.5px solid ${chip.bd}`,
            borderRadius:20,padding:'6px 15px',
            fontSize:12,fontWeight:700,color:chip.cl,
            display:'flex',alignItems:'center',gap:6,
            animation:`fadeInUp .5s ease-out ${i*.1+.3}s both`,
          }}>
            {chip.icon} {chip.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MagnetReasoningTool;