import React, { useState, useEffect, useRef } from 'react';
import { Star, Award, RotateCcw, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  props?: { additionalProps?: { title?: string; subtitle?: string; showHint?: boolean } };
}
type Phase = 'problem' | 'choosing' | 'wrong' | 'stroking' | 'magnetised' | 'success';
type CardId = 'glue' | 'magnetise' | 'bigger';

const injectKF = () => {
  if (document.getElementById('mst5-kf')) return;
  const s = document.createElement('style');
  s.id = 'mst5-kf';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');

    @keyframes dangleScrew {
      0%,100% { transform: rotate(0deg);  }
      25%      { transform: rotate(8deg);  }
      75%      { transform: rotate(-7deg); }
    }
    @keyframes fallScrew {
      0%   { transform: translate(0,0)     rotate(0deg);   opacity:1; }
      20%  { transform: translate(10px,18px)  rotate(45deg);  opacity:1; }
      55%  { transform: translate(25px,60px)  rotate(140deg); opacity:1; }
      80%  { transform: translate(36px,95px)  rotate(210deg); opacity:0.6;}
      100% { transform: translate(44px,130px) rotate(270deg); opacity:0; }
    }
    @keyframes magSlide {
      0%   { transform: translateX(0);   opacity:1; }
      60%  { transform: translateX(200px); opacity:1; }
      72%  { transform: translateX(208px); opacity:0; }
      73%  { transform: translateX(0);     opacity:0; }
      88%  { transform: translateX(0);     opacity:0; }
      100% { transform: translateX(0);   opacity:1; }
    }
    @keyframes flyInScrew {
      0%   { transform: translate(110px,55px)  rotate(-75deg) scale(0.3);  opacity:0;   }
      28%  { transform: translate(72px,34px)   rotate(-48deg) scale(0.58); opacity:0.65;}
      62%  { transform: translate(20px,9px)    rotate(-11deg) scale(0.88); opacity:1;   }
      83%  { transform: translate(2px,1px)     rotate(-1deg)  scale(1.05); opacity:1;   }
      100% { transform: translate(0,0)         rotate(0deg)   scale(1);    opacity:1;   }
    }
    @keyframes stuckPulse {
      0%,100% { transform: translateX(0)    scale(1);    }
      35%      { transform: translateX(2px)  scale(1.03); }
      70%      { transform: translateX(-1px) scale(0.98); }
    }
    @keyframes tipGlow {
      0%,100% { transform:scale(1);   opacity:0.7; }
      50%      { transform:scale(1.35); opacity:1;   }
    }
    @keyframes cardIn {
      from { opacity:0; transform:translateY(28px) scale(0.88); }
      to   { opacity:1; transform:translateY(0)    scale(1);    }
    }
    @keyframes shake {
      0%,100%{ transform:translateX(0); }
      20%    { transform:translateX(-10px); }
      40%    { transform:translateX(10px); }
      60%    { transform:translateX(-6px); }
      80%    { transform:translateX(6px); }
    }
    @keyframes panelIn {
      from { opacity:0; transform:translateY(14px); }
      to   { opacity:1; transform:translateY(0);    }
    }
    @keyframes burst {
      0%   { transform:scale(0) rotate(-20deg); opacity:0; }
      60%  { transform:scale(1.3) rotate(5deg); opacity:1; }
      100% { transform:scale(1) rotate(0deg);   opacity:1; }
    }
    @keyframes confettiFall {
      0%   { transform:translateY(-10px) rotate(0deg);   opacity:1; }
      50%  { transform:translateY(60px)  rotate(210deg); opacity:1; }
      100% { transform:translateY(130px) rotate(420deg); opacity:0; }
    }
    @keyframes bannerPulse {
      0%,100% { border-color:#f59e0b; }
      50%      { border-color:#fbbf24; box-shadow:0 4px 20px rgba(251,191,36,0.4); }
    }
    @keyframes ringExpand {
      0%   { transform: scale(0.2); opacity: 0.85; }
      100% { transform: scale(4);   opacity: 0; }
    }
    @keyframes sparkle {
      0%,100% { opacity:0; transform:scale(0); }
      50%      { opacity:1; transform:scale(1); }
    }
  `;
  document.head.appendChild(s);
};

// ── Screwdriver SVG (static, no animation) ─────────────────────
// ViewBox 0 0 380 80. Handle x0-110, shaft x130-360, tip x360-380
// Shaft centre y = 40. Tip flat face at x=380, from y=33 to y=47
const ScrewdriverSVG: React.FC<{ magnetised: boolean }> = ({ magnetised }) => (
  <svg viewBox="0 0 380 80" width="100%" style={{ display: 'block', overflow: 'visible' }}>
    <defs>
      <linearGradient id="h5" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#fb923c"/>
        <stop offset="50%"  stopColor="#ea580c"/>
        <stop offset="100%" stopColor="#7c2d12"/>
      </linearGradient>
      <linearGradient id="s5" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#e5e7eb"/>
        <stop offset="55%"  stopColor="#d1d5db"/>
        <stop offset="100%" stopColor="#6b7280"/>
      </linearGradient>
      <linearGradient id="t5" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor={magnetised ? '#fde68a' : '#9ca3af'}/>
        <stop offset="100%" stopColor={magnetised ? '#f59e0b' : '#374151'}/>
      </linearGradient>
      <filter id="sd5"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/></filter>
    </defs>
    <g filter="url(#sd5)">
      {/* Handle */}
      <rect x="0" y="14" width="112" height="52" rx="26" fill="url(#h5)"/>
      <rect x="10" y="18" width="90"  height="14" rx="7" fill="rgba(255,255,255,0.22)"/>
      {[26,44,62,80,98].map(x=>(
        <rect key={x} x={x} y="14" width="6" height="52" rx="3" fill="rgba(0,0,0,0.1)"/>
      ))}
      {/* Collar */}
      <rect x="110" y="24" width="22" height="32" rx="5" fill="#1f2937"/>
      <rect x="113" y="27" width="16" height="26" rx="3" fill="#374151"/>
      {/* Shaft */}
      <rect x="130" y="33" width="232" height="14" rx="4" fill="url(#s5)"/>
      <rect x="132" y="33" width="228" height="5"  rx="2" fill="rgba(255,255,255,0.30)"/>
      {/* Tip — wide flat-bladed screwdriver tip */}
      <polygon points="355,22 380,30 380,50 355,58" fill="url(#t5)"/>
      <polygon points="356,23 378,31 378,35 356,27" fill="rgba(255,255,255,0.22)"/>
      {/* Tip face highlight */}
      <rect x="378" y="30" width="3" height="20" rx="1" fill="rgba(255,255,255,0.4)"/>
    </g>

  </svg>
);

// ── Screw SVG — vertical, head at top, pointed tip at bottom ───
// Used hanging below tip. Width~32, height~72
const ScrewDownSVG: React.FC = () => (
  <svg viewBox="0 0 44 92" width="44" height="92" style={{ display:'block', filter:'drop-shadow(0 3px 6px rgba(0,0,0,0.45))' }}>
    <defs>
      <linearGradient id="sc5v" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#4b5563"/>
        <stop offset="40%"  stopColor="#f1f5f9"/>
        <stop offset="100%" stopColor="#4b5563"/>
      </linearGradient>
      <linearGradient id="sc5vH" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#374151"/>
        <stop offset="50%"  stopColor="#9ca3af"/>
        <stop offset="100%" stopColor="#374151"/>
      </linearGradient>
    </defs>
    {/* Head — large flat disc */}
    <rect x="1" y="0" width="42" height="18" rx="4" fill="url(#sc5vH)"/>
    <rect x="3" y="1" width="38" height="7"  rx="3" fill="rgba(255,255,255,0.22)"/>
    {/* Phillips cross */}
    <line x1="22" y1="2"  x2="22" y2="16" stroke="#111827" strokeWidth="5.5" strokeLinecap="round"/>
    <line x1="5"  y1="9"  x2="39" y2="9"  stroke="#111827" strokeWidth="4"   strokeLinecap="round"/>
    {/* Shaft */}
    <rect x="16" y="18" width="12" height="52" fill="url(#sc5v)"/>
    <rect x="17" y="19" width="6"  height="50" fill="rgba(255,255,255,0.15)"/>
    {/* Thread lines */}
    {[22,28,34,40,46,52,58,64].map(y=>(
      <line key={y} x1="10" y1={y} x2="34" y2={y} stroke="rgba(100,116,139,0.6)" strokeWidth="1.8"/>
    ))}
    {/* Pointed tip */}
    <polygon points="16,70 28,70 22,88" fill="url(#sc5v)"/>
    <polygon points="17,70 27,70 22,80" fill="rgba(255,255,255,0.15)"/>
  </svg>
);

// ── Horizontal screw SVG ─────────────────────────────────────────
// Real screwdriver holds screw by its HEAD (magnetic attraction to head).
// Layout (left→right):
//   x=0..18   : Phillips HEAD — this face touches the magnetised screwdriver tip
//   x=18..76  : threaded SHAFT
//   x=76..90  : pointed TIP (sharp end, points AWAY from screwdriver)
// Width=90, Height=44, vertical centre=22
const ScrewRightSVG: React.FC = () => (
  <svg viewBox="0 0 90 44" width="90" height="44"
    style={{ display:'block', filter:'drop-shadow(2px 3px 8px rgba(0,0,0,0.55))' }}>
    <defs>
      <linearGradient id="sc5h" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#374151"/>
        <stop offset="35%"  stopColor="#d1d5db"/>
        <stop offset="65%"  stopColor="#e5e7eb"/>
        <stop offset="100%" stopColor="#374151"/>
      </linearGradient>
      <linearGradient id="sc5hd" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#1f2937"/>
        <stop offset="40%"  stopColor="#9ca3af"/>
        <stop offset="100%" stopColor="#1f2937"/>
      </linearGradient>
    </defs>

    {/* ── HEAD (left face, x=0..18) — Phillips flat disc ── */}
    <rect x="0" y="1" width="18" height="42" rx="4" fill="url(#sc5hd)"/>
    {/* Head face highlight */}
    <rect x="1" y="2" width="5" height="40" rx="2" fill="rgba(255,255,255,0.22)"/>
    {/* Phillips cross — prominent */}
    <line x1="9" y1="4"  x2="9"  y2="40" stroke="#0f172a" strokeWidth="5.5" strokeLinecap="round"/>
    <line x1="2" y1="22" x2="16" y2="22" stroke="#0f172a" strokeWidth="4"   strokeLinecap="round"/>
    {/* Cross shine */}
    <line x1="9" y1="4"  x2="9"  y2="12" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"/>

    {/* ── SHAFT (x=18..76) — threaded rod ── */}
    <rect x="18" y="18" width="58" height="8" rx="2" fill="url(#sc5h)"/>
    <rect x="19" y="18" width="56" height="3" rx="1" fill="rgba(255,255,255,0.25)"/>
    {/* Thread helix — diagonal slash marks */}
    {[20,25,30,35,40,45,50,55,60,65,70].map(x=>(
      <line key={x} x1={x}   y1="14"
                    x2={x+5}  y2="30"
        stroke="#6b7280" strokeWidth="1.6" strokeLinecap="round"/>
    ))}
    {/* Thread root line top & bottom */}
    <line x1="18" y1="15" x2="76" y2="15" stroke="rgba(107,114,128,0.4)" strokeWidth="1"/>
    <line x1="18" y1="29" x2="76" y2="29" stroke="rgba(107,114,128,0.4)" strokeWidth="1"/>

    {/* ── POINTED TIP (x=76..90) — sharp end ── */}
    <polygon points="76,16 76,28 90,22" fill="url(#sc5h)"/>
    <polygon points="76,16 76,20 86,22" fill="rgba(255,255,255,0.2)"/>
  </svg>
);

// ── Bar Magnet SVG ─────────────────────────────────────────────
const BarMagnetSVG: React.FC = () => (
  <svg viewBox="0 0 120 30" width="120" height="30" style={{ display:'block', filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}>
    <defs>
      <linearGradient id="bmN5" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#f87171"/><stop offset="100%" stopColor="#991b1b"/>
      </linearGradient>
      <linearGradient id="bmS5" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#60a5fa"/><stop offset="100%" stopColor="#1e40af"/>
      </linearGradient>
      <clipPath id="bmc5"><rect x="0" y="0" width="120" height="30" rx="15"/></clipPath>
    </defs>
    <rect x="0" y="0" width="60"  height="30" fill="url(#bmN5)" clipPath="url(#bmc5)"/>
    <rect x="60" y="0" width="60" height="30" fill="url(#bmS5)" clipPath="url(#bmc5)"/>
    <rect x="0" y="0" width="120" height="10" fill="rgba(255,255,255,0.16)" clipPath="url(#bmc5)"/>
    <line x1="60" y1="4" x2="60" y2="26" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
    <text x="30" y="20" textAnchor="middle" fontSize="13" fontWeight="900" fill="white" fontFamily="Fredoka One,cursive">N</text>
    <text x="90" y="20" textAnchor="middle" fontSize="13" fontWeight="900" fill="white" fontFamily="Fredoka One,cursive">S</text>
    <rect x="1" y="1" width="118" height="28" rx="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
  </svg>
);

// ── Solution Card ──────────────────────────────────────────────
const Card: React.FC<{
  id:CardId; emoji:string; label:string; correct:boolean;
  selected:CardId|null; phase:Phase; delay:number; onSelect:(id:CardId)=>void;
}> = ({ id, emoji, label, correct, selected, phase, delay, onSelect }) => {
  const [hov, setHov] = useState(false);
  const isSel=selected===id, isWrong=isSel&&phase==='wrong', isOk=isSel&&phase!=='wrong'&&phase!=='choosing';
  const purple='#533086', purpleLight='#C1C1EA';
  return (
    <div onClick={()=>phase==='choosing'&&onSelect(id)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        flex:'1 1 0', minWidth:'clamp(88px,26vw,148px)', maxWidth:180,
        background:isWrong?'rgba(239,68,68,0.08)':isOk?'rgba(16,185,129,0.10)':'white',
        border:`3px solid ${isWrong?'#ef4444':isOk?'#10b981':hov?'#f59e0b':purpleLight}`,
        borderRadius:18, padding:'clamp(12px,2.5vw,18px) clamp(8px,2vw,14px)',
        cursor:phase==='choosing'?'pointer':'default',
        textAlign:'center', position:'relative', userSelect:'none',
        animation:`cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both${isWrong?', shake 0.5s ease':''}`,
        transition:'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, border-color 0.2s',
        transform:hov&&phase==='choosing'?'translateY(-7px) scale(1.04)':'scale(1)',
        boxShadow:hov&&phase==='choosing'?'0 16px 32px rgba(245,158,11,0.30)':
          isOk?'0 8px 24px rgba(16,185,129,0.28)':isWrong?'0 4px 16px rgba(239,68,68,0.24)':
          '0 3px 12px rgba(83,48,134,0.08)',
      }}>
      <div style={{fontSize:'clamp(28px,7vw,44px)',marginBottom:8,display:'inline-block',
        transition:'transform 0.25s',
        transform:hov&&phase==='choosing'?'scale(1.22) rotate(-5deg)':'scale(1)'}}>{emoji}</div>
      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:'clamp(12px,2.4vw,15px)',
        color:isWrong?'#991b1b':isOk?'#065f46':purple,lineHeight:1.3}}>{label}</div>
      {isSel&&(
        <div style={{position:'absolute',top:-11,right:-11,width:26,height:26,borderRadius:'50%',
          background:correct?'#10b981':'#ef4444',display:'flex',alignItems:'center',justifyContent:'center',
          animation:'burst 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow:`0 3px 10px ${correct?'rgba(16,185,129,0.5)':'rgba(239,68,68,0.5)'}`}}>
          {correct?<CheckCircle size={15} color="white"/>:<XCircle size={15} color="white"/>}
        </div>
      )}
    </div>
  );
};

// ── Confetti ───────────────────────────────────────────────────
const Confetti: React.FC = () => (
  <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:20}}>
    {Array.from({length:20},(_,i)=>({x:5+(i/20)*90,hue:(i*19)%360,delay:i*0.07,w:8+(i%6)})).map((p,i)=>(
      <div key={i} style={{position:'absolute',left:`${p.x}%`,top:'-4%',
        width:p.w,height:p.w*0.5,borderRadius:2,background:`hsl(${p.hue},88%,56%)`,
        animation:`confettiFall 1.8s ease-out ${p.delay}s both`}}/>
    ))}
  </div>
);

// ── MAIN ──────────────────────────────────────────────────────
const MagnetiseScrewdriverTool: React.FC<Props> = ({ props={} }) => {
  const { additionalProps={} } = props;
  const { title="🔧 Fix the Mechanic's Problem!", subtitle='Help the mechanic keep screws on the screwdriver.', showHint=true } = additionalProps;

  const amber='#f59e0b', amberDark='#b45309', amberLight='#fef3c7';
  const purple='#533086', purpleLight='#C1C1EA', orange='#FC9145', green='#10b981';

  const [phase,        setPhase]        = useState<Phase>('problem');
  const [selected,     setSelected]     = useState<CardId|null>(null);
  const [strokeStep,   setStrokeStep]   = useState(0);
  const [magnetised,   setMagnetised]   = useState(false);
  const [screwFlying,  setScrewFlying]  = useState(false);  // screw attract anim
  const [screwStuck,   setScrewStuck]   = useState(false);  // screw stuck on tip
  const [showConfetti, setShowConfetti] = useState(false);
  const [stars,        setStars]        = useState(0);
  const [attempts,     setAttempts]     = useState(0);
  const [hintVisible,  setHintVisible]  = useState(false);
  const [cw,           setCw]           = useState(380);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef     = useRef<HTMLDivElement>(null);
  const strokeRef    = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    injectKF();
    const measure = () => {
      if (containerRef.current) setCw(containerRef.current.offsetWidth);
    };
    measure(); requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-advance from problem to choosing
  useEffect(() => {
    if (phase==='problem') {
      const t = setTimeout(()=>setPhase('choosing'), 2600);
      return ()=>clearTimeout(t);
    }
  }, [phase]);

  // Stroking animation
  useEffect(() => {
    if (phase!=='stroking') return;
    setStrokeStep(0); setMagnetised(false); setScrewFlying(false); setScrewStuck(false);

    strokeRef.current = setInterval(()=>{
      setStrokeStep(s=>{
        const next = s+1;
        if (next>=35) {
          clearInterval(strokeRef.current!);
          // Tip becomes magnetised
          setMagnetised(true);
          // After 0.8s — screw starts flying in
          setTimeout(()=>setScrewFlying(true), 800);
          // After 1.8s — screw locks as stuck
          setTimeout(()=>{ setScrewFlying(false); setScrewStuck(true); }, 1800);
          // After 2.2s — success
          setTimeout(()=>{
            setPhase('success');
            setStars(st=>Math.min(st+1,3));
            setShowConfetti(true);
            setTimeout(()=>setShowConfetti(false), 2500);
          }, 2200);
          return 35;
        }
        return next;
      });
    }, 105);
    return ()=>{ if (strokeRef.current) clearInterval(strokeRef.current); };
  }, [phase]);

  const handleSelect = (id:CardId) => {
    if (phase!=='choosing') return;
    setSelected(id); setAttempts(a=>a+1);
    if (id==='magnetise') setTimeout(()=>setPhase('stroking'), 400);
    else setPhase('wrong');
  };
  const tryAgain = () => { setPhase('choosing'); setSelected(null); setHintVisible(false); };
  const reset    = () => {
    setPhase('problem'); setSelected(null); setStrokeStep(0);
    setMagnetised(false); setScrewFlying(false); setScrewStuck(false);
    setShowConfetti(false); setHintVisible(false);
    if (strokeRef.current) { clearInterval(strokeRef.current); strokeRef.current=null; }
  };

  const isMobile = cw < 420;

  // Scene layout — screwdriver occupies full scene width
  // We place elements as absolutely positioned HTML divs OVER the SVG
  // Screwdriver SVG viewBox is 380×80. It renders at width=100% of scene.
  // Tip FACE is at SVG x=380 (rightmost edge).
  // In rendered px: tipX_px = sceneWidth * (380/380) = sceneWidth
  // tipY is vertical centre of tip = sceneHeight * 0.5 (scene is ~2× taller than SVG)
  //
  // Scene height = 200px fixed. SVG top-padding = (200 - svgRenderedH) / 2
  // svgRenderedH at sceneWidth W: W * (80/380)
  // So SVG top = (200 - W*80/380) / 2
  // TIP in scene px:
  //   tipX = sceneWidth (right edge of SVG = right edge of scene)
  //   tipY = svgTop + svgH/2 = (200 - W*80/380)/2 + (W*80/380)/2 = 100
  // → tipY is ALWAYS 100px from top of scene regardless of width!
  // TIP_BOTTOM in scene px = svgTop + svgH * (54/80)
  //   = (200 - W*80/380)/2 + W*80/380 * (54/80)
  //   = (200 - svgH)/2 + svgH*0.675

  // ── Scene uses a single SVG coordinate space ──────────────────────
  // ViewBox: SVW x SVH. Screwdriver inside, screw directly adjacent — zero gap.
  // Screwdriver: handle x0..130, shaft x150..460, tip face at x=460
  // Tip face Y: centre=100, top=82, bottom=118  (36px tall flat face)
  // Screw head: x=460..480 (20px wide), shaft x=480..560, pointed x=560..580
  // Bar magnet: y=52..82 (above shaft), slides x=150→380
  const SVW = 580;  // scene viewBox width
  const SVH = 230;  // scene viewBox height
  // All positions in viewBox units — no sub-pixel gap possible
  const TIP_X    = 460;  // screwdriver tip face (right edge of tip polygon)
  const TIP_CY   = 100;  // tip centre Y
  const TIP_TOP  = 82;   // tip face top Y
  const TIP_BOT  = 118;  // tip face bottom Y
  // Screw head left edge = TIP_X (zero gap)
  const SCR_X    = TIP_X;  // screw head left = tip face
  const SCR_CY   = TIP_CY; // screw centre Y = tip centre Y
  const FLOOR_Y  = 196;    // floor top Y

  const progress = Math.round((strokeStep/35)*100);

  const instruction: Record<Phase,string> = {
    problem:   '😩 Watch! The screw keeps slipping off the screwdriver tip…',
    choosing:  '💡 Choose the BEST solution to fix the mechanic\'s problem!',
    wrong:     '🤔 That won\'t work — think about magnetic materials!',
    stroking:  `🧲 Stroking the tip with a bar magnet… ${strokeStep}/35 strokes done!`,
    magnetised:'⚡ Tip magnetised! The screw is flying in to stick!',
    success:   '🎉 The screw sticks to the magnetised tip — problem solved!',
  };

  return (
    <div ref={containerRef} style={{
      fontFamily:"'Nunito',sans-serif", width:'100%', height:'fit-content',
      background:'linear-gradient(135deg,#fffbeb 0%,#fef3c7 45%,#fff7ed 100%)',
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'clamp(10px,2.5vw,18px) clamp(8px,2vw,14px)',
      boxSizing:'border-box', gap:'clamp(8px,1.8vw,12px)',
    }}>

      {/* Header */}
      <div style={{textAlign:'center',width:'100%'}}>
        <h1 style={{fontFamily:"'Fredoka One',cursive",fontSize:'clamp(20px,5vw,34px)',color:purple,margin:0,lineHeight:1.1}}>{title}</h1>
        <p  style={{fontSize:'clamp(12px,2.2vw,15px)',color:amberDark,fontWeight:700,margin:'3px 0 0'}}>{subtitle}</p>
        <div style={{display:'flex',gap:6,justifyContent:'center',marginTop:6,alignItems:'center'}}>
          {[0,1,2].map(i=>(
            <Star key={i} size={isMobile?18:22} fill={i<stars?amber:'none'} color={i<stars?amber:'#d1d5db'}
              style={{animation:i<stars?'burst .4s ease':'none'}}/>
          ))}
          {attempts>0&&<span style={{fontSize:12,color:'#6b7280',marginLeft:4}}>{attempts} attempt{attempts>1?'s':''}</span>}
        </div>
      </div>

      {/* Instruction */}
      <div style={{background:'white',border:`3px solid ${amber}`,borderRadius:16,
        padding:'clamp(8px,1.8vw,12px) clamp(12px,2.5vw,18px)',
        width:'100%',maxWidth:680,animation:'bannerPulse 2.5s ease-in-out infinite'}}>
        <p style={{fontSize:'clamp(12px,2.2vw,15px)',color:'#374151',margin:0,fontWeight:700,lineHeight:1.6}}>
          {instruction[phase]}
        </p>
      </div>

      {/* Main card */}
      <div style={{background:'white',borderRadius:22,border:`3px solid ${purpleLight}`,
        boxShadow:'0 8px 36px rgba(83,48,134,.13)',padding:'clamp(10px,2.5vw,16px)',
        width:'100%',maxWidth:720,position:'relative'}}>

        {/* ══ SCENE — single SVG, everything in one coordinate space ══ */}
        <div ref={sceneRef} style={{position:'relative',borderRadius:14,overflow:'hidden',border:`2px solid ${purpleLight}`}}>
          <svg viewBox={`0 0 ${SVW} ${SVH}`} width="100%" style={{display:'block'}}>
            <defs>
              <linearGradient id="skyG"  x1="0%" y1="0%"   x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#bfdbfe"/><stop offset="100%" stopColor="#dcfce7"/>
              </linearGradient>
              <linearGradient id="flrG"  x1="0%" y1="0%"   x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#92400e"/><stop offset="100%" stopColor="#78350f"/>
              </linearGradient>
              <linearGradient id="sdHG"  x1="0%" y1="0%"   x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#fb923c"/>
                <stop offset="50%"  stopColor="#ea580c"/>
                <stop offset="100%" stopColor="#7c2d12"/>
              </linearGradient>
              <linearGradient id="sdSG"  x1="0%" y1="0%"   x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#e5e7eb"/>
                <stop offset="55%"  stopColor="#d1d5db"/>
                <stop offset="100%" stopColor="#6b7280"/>
              </linearGradient>
              <linearGradient id="sdTG"  x1="0%" y1="0%"   x2="100%" y2="0%">
                <stop offset="0%"   stopColor={magnetised?'#fde68a':'#9ca3af'}/>
                <stop offset="100%" stopColor={magnetised?'#f59e0b':'#374151'}/>
              </linearGradient>
              <linearGradient id="scVG"  x1="0%" y1="0%"   x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#374151"/>
                <stop offset="45%"  stopColor="#e5e7eb"/>
                <stop offset="100%" stopColor="#374151"/>
              </linearGradient>
              <linearGradient id="scHDG" x1="0%" y1="0%"   x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#1f2937"/>
                <stop offset="40%"  stopColor="#9ca3af"/>
                <stop offset="100%" stopColor="#1f2937"/>
              </linearGradient>
              <linearGradient id="scHSG" x1="0%" y1="0%"   x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#374151"/>
                <stop offset="50%"  stopColor="#e5e7eb"/>
                <stop offset="100%" stopColor="#374151"/>
              </linearGradient>
              <linearGradient id="bmNG"  x1="0%" y1="0%"   x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#f87171"/><stop offset="100%" stopColor="#991b1b"/>
              </linearGradient>
              <linearGradient id="bmSG"  x1="0%" y1="0%"   x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#60a5fa"/><stop offset="100%" stopColor="#1e40af"/>
              </linearGradient>
              <radialGradient id="glowG" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.65"/>
                <stop offset="50%"  stopColor="#f59e0b" stopOpacity="0.28"/>
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
              </radialGradient>
              <filter id="drpS"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.35"/></filter>
              <filter id="scrS"><feDropShadow dx="1" dy="3" stdDeviation="4" floodOpacity="0.5"/></filter>
            </defs>

            {/* Sky */}
            <rect x="0" y="0" width={SVW} height={SVH} fill="url(#skyG)"/>

            {/* Floor */}
            <rect x="0" y={FLOOR_Y} width={SVW} height={SVH-FLOOR_Y} fill="url(#flrG)"/>
            <rect x="0" y={FLOOR_Y} width={SVW} height="4" fill="#b45309"/>
            {Array.from({length:14},(_,i)=>(
              <line key={i} x1={i*46} y1={FLOOR_Y+4} x2={i*46} y2={SVH}
                stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
            ))}

            {/* ══ SCREWDRIVER ══ */}
            <g filter="url(#drpS)">
              <rect x="8"   y="72"  width="130" height="56" rx="28" fill="url(#sdHG)"/>
              <rect x="18"  y="76"  width="106" height="16" rx="8"  fill="rgba(255,255,255,0.22)"/>
              {[30,50,70,90,110].map(x=>(
                <rect key={x} x={x} y="72" width="7" height="56" rx="3" fill="rgba(0,0,0,0.1)"/>
              ))}
              <rect x="136" y="82"  width="24"  height="36" rx="6"  fill="#1f2937"/>
              <rect x="139" y="85"  width="18"  height="30" rx="4"  fill="#374151"/>
              <rect x="158" y="90"  width={TIP_X-158} height="20" rx="4" fill="url(#sdSG)"/>
              <rect x="160" y="90"  width={TIP_X-162} height="7"  rx="2" fill="rgba(255,255,255,0.30)"/>
              {/* Tip polygon — right face EXACTLY at x=TIP_X */}
              <polygon points={`${TIP_X-28},${TIP_TOP} ${TIP_X},${TIP_CY-5} ${TIP_X},${TIP_CY+5} ${TIP_X-28},${TIP_BOT}`}
                fill="url(#sdTG)"/>
              <polygon points={`${TIP_X-27},${TIP_TOP+1} ${TIP_X-2},${TIP_CY-4} ${TIP_X-2},${TIP_CY-1} ${TIP_X-27},${TIP_TOP+4}`}
                fill="rgba(255,255,255,0.22)"/>
              <rect x={TIP_X-2} y={TIP_CY-5} width="2" height="10" rx="1" fill="rgba(255,255,255,0.5)"/>
            </g>

            {/* Glow on magnetised tip */}
            {magnetised && (
              <ellipse cx={TIP_X} cy={TIP_CY} rx="48" ry="38" fill="url(#glowG)"
                style={{animation:'tipGlow 1s ease-in-out infinite'}}/>
            )}
            {magnetised && [1,2,3].map(i=>(
              <circle key={i} cx={TIP_X} cy={TIP_CY} r={8+i*13} fill="none"
                stroke="#f59e0b" strokeWidth={2-i*0.4} strokeDasharray="6 4" opacity={0.85-i*0.25}
                style={{animation:`ringExpand 1.4s ease-out ${i*0.38}s infinite`}}/>
            ))}

            {/* ══ SCREW DOWN — head at TIP_BOT, zero gap, sways from top ══ */}
            {(phase==='problem'||phase==='choosing'||phase==='wrong') && (
              <g filter="url(#scrS)"
                style={{
                  transformOrigin:`${TIP_X}px ${TIP_BOT}px`,
                  animation:phase==='wrong'?'fallScrew 1.4s ease-in forwards':'dangleScrew 2s ease-in-out infinite',
                }}>
                {/* Head centred on TIP_X, top at TIP_BOT */}
                <rect x={TIP_X-18} y={TIP_BOT}    width="36" height="16" rx="3" fill="url(#scVG)"/>
                <rect x={TIP_X-17} y={TIP_BOT+1}  width="14" height="6"  rx="2" fill="rgba(255,255,255,0.22)"/>
                <line x1={TIP_X}    y1={TIP_BOT+2}  x2={TIP_X}    y2={TIP_BOT+14} stroke="#0f172a" strokeWidth="5"   strokeLinecap="round"/>
                <line x1={TIP_X-12} y1={TIP_BOT+8}  x2={TIP_X+12} y2={TIP_BOT+8}  stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round"/>
                {/* Shaft */}
                <rect x={TIP_X-7} y={TIP_BOT+16} width="14" height="44" fill="url(#scVG)"/>
                <rect x={TIP_X-6} y={TIP_BOT+17} width="5"  height="42" fill="rgba(255,255,255,0.14)"/>
                {[4,10,16,22,28,34,40].map(d=>(
                  <line key={d} x1={TIP_X-11} y1={TIP_BOT+16+d} x2={TIP_X+11} y2={TIP_BOT+16+d}
                    stroke="rgba(107,114,128,0.6)" strokeWidth="1.6"/>
                ))}
                {/* Pointed tip */}
                <polygon points={`${TIP_X-7},${TIP_BOT+60} ${TIP_X+7},${TIP_BOT+60} ${TIP_X},${TIP_BOT+76}`}
                  fill="url(#scVG)"/>
              </g>
            )}

            {/* ══ SCREW RIGHT — head at TIP_X, ZERO GAP, extends right ══ */}
            {(screwFlying||screwStuck) && (
              <g filter="url(#scrS)"
                style={{
                  transformOrigin:`${TIP_X}px ${TIP_CY}px`,
                  animation:screwFlying?'flyInScrew 1.0s cubic-bezier(0.34,1.56,0.64,1) forwards':'stuckPulse 2s ease-in-out infinite',
                }}>
                {/* Head — left face at TIP_X */}
                <rect x={TIP_X}    y={TIP_CY-18} width="20" height="36" rx="4" fill="url(#scHDG)"/>
                <rect x={TIP_X+1}  y={TIP_CY-17} width="6"  height="34" rx="3" fill="rgba(255,255,255,0.18)"/>
                <line x1={TIP_X+10} y1={TIP_CY-14} x2={TIP_X+10} y2={TIP_CY+14} stroke="#0f172a" strokeWidth="5.5" strokeLinecap="round"/>
                <line x1={TIP_X+2}  y1={TIP_CY}    x2={TIP_X+18} y2={TIP_CY}    stroke="#0f172a" strokeWidth="4"   strokeLinecap="round"/>
                <line x1={TIP_X+10} y1={TIP_CY-14} x2={TIP_X+10} y2={TIP_CY-7}  stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"/>
                {/* Shaft */}
                <rect x={TIP_X+20} y={TIP_CY-7} width="62" height="14" rx="3" fill="url(#scHSG)"/>
                <rect x={TIP_X+21} y={TIP_CY-7} width="60" height="5"  rx="2" fill="rgba(255,255,255,0.22)"/>
                {[4,10,16,22,28,34,40,46,52,58].map(d=>(
                  <line key={d}
                    x1={TIP_X+22+d} y1={TIP_CY-11}
                    x2={TIP_X+26+d} y2={TIP_CY+11}
                    stroke="#6b7280" strokeWidth="1.6"/>
                ))}
                {/* Pointed tip */}
                <polygon points={`${TIP_X+82},${TIP_CY-7} ${TIP_X+82},${TIP_CY+7} ${TIP_X+100},${TIP_CY}`}
                  fill="url(#scHSG)"/>
                <polygon points={`${TIP_X+82},${TIP_CY-7} ${TIP_X+82},${TIP_CY-2} ${TIP_X+96},${TIP_CY}`}
                  fill="rgba(255,255,255,0.2)"/>
              </g>
            )}

            {/* ══ BAR MAGNET ══ */}
            {phase==='stroking' && strokeStep<36 && (
              <g style={{animation:'magSlide 0.92s linear infinite'}}>
                <rect x="158" y="52" width="70"  height="34" rx="17" fill="url(#bmNG)"/>
                <rect x="228" y="52" width="70"  height="34" rx="17" fill="url(#bmSG)"/>
                <rect x="158" y="52" width="140" height="11" rx="8"  fill="rgba(255,255,255,0.16)"/>
                <line x1="228" y1="56" x2="228" y2="82" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
                <text x="193" y="74" textAnchor="middle" fontSize="13" fontWeight="900" fill="white" fontFamily="Fredoka One,cursive">N</text>
                <text x="263" y="74" textAnchor="middle" fontSize="13" fontWeight="900" fill="white" fontFamily="Fredoka One,cursive">S</text>
                <rect x="158" y="52" width="140" height="34" rx="17" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
                <text x="312" y="74" fontSize="18" fill="#533086" fontFamily="Fredoka One,cursive">→</text>
              </g>
            )}

            {/* Speech bubble */}
            {(phase==='problem'||phase==='choosing'||phase==='wrong') && (
              <g>
                <rect x="12" y="12" width="215" height="52" rx="12" fill="white" stroke="#f59e0b" strokeWidth="2.5"/>
                <polygon points="38,64 54,64 46,76" fill="#f59e0b"/>
                <text x="24" y="36" fontSize="12" fontWeight="800" fill="#374151" fontFamily="Nunito,sans-serif">
                  {phase==='wrong'?"😤 That won't help!":"😩 Screw keeps falling off!"}
                </text>
                <text x="24" y="54" fontSize="11" fontWeight="600" fill="#6b7280" fontFamily="Nunito,sans-serif">
                  {phase==='wrong'?"Think magnetic materials...":"How do I fix this? 🔧"}
                </text>
              </g>
            )}

            {/* Progress bar */}
            {phase==='stroking' && (
              <g>
                <rect x="20" y={FLOOR_Y-22} width={SVW-40} height="14" rx="7" fill="rgba(255,255,255,0.35)"/>
                <rect x="20" y={FLOOR_Y-22} width={Math.round((SVW-40)*progress/100)} height="14" rx="7" fill="#533086" opacity="0.9"/>
                <text x={SVW/2} y={FLOOR_Y-11} textAnchor="middle" fontSize="10" fontWeight="900" fill="white" fontFamily="Fredoka One,cursive">
                  🧲 {strokeStep} / 35 strokes
                </text>
              </g>
            )}

            {/* Magnetised badge */}
            {magnetised && (
              <g style={{animation:'burst 0.5s cubic-bezier(0.34,1.56,0.64,1)'}}>
                <rect x={SVW-162} y="12" width="150" height="34" rx="17" fill="#f59e0b"/>
                <text x={SVW-87} y="33" textAnchor="middle" fontSize="14" fontWeight="900" fill="white" fontFamily="Fredoka One,cursive">⚡ Magnetised!</text>
              </g>
            )}
          </svg>
          {showConfetti && <Confetti/>}
        </div>
        {/* ══ END SCENE ══ */}

        {/* Solution cards */}
        {(phase==='choosing'||phase==='wrong') && (
          <div style={{animation:'panelIn 0.45s ease',marginTop:'clamp(10px,2vw,16px)'}}>
            <p style={{textAlign:'center',fontWeight:800,color:purple,
              margin:'0 0 clamp(8px,1.5vw,12px)',fontSize:'clamp(13px,2.2vw,15px)'}}>
              🤔 Which solution is BEST?
            </p>
            <div style={{display:'flex',flexWrap:'wrap',gap:'clamp(8px,2vw,12px)',justifyContent:'center'}}>
              {([
                {id:'glue'      as CardId,emoji:'🔮',label:'Use glue on the screw',correct:false},
                {id:'magnetise' as CardId,emoji:'🧲',label:'Magnetise the screwdriver tip',correct:true},
                {id:'bigger'    as CardId,emoji:'🔩',label:'Use a bigger screwdriver',correct:false},
              ]).map((c,i)=>(
                <Card key={c.id} {...c} selected={selected} phase={phase} delay={i*0.12} onSelect={handleSelect}/>
              ))}
            </div>

            {phase==='wrong' && (
              <div style={{marginTop:'clamp(10px,2vw,14px)',padding:'clamp(10px,2vw,14px)',
                background:'#fef2f2',border:'2px solid #fca5a5',borderRadius:14,animation:'panelIn 0.4s ease'}}>
                <p style={{fontSize:'clamp(12px,2vw,14px)',color:'#991b1b',fontWeight:700,margin:0,lineHeight:1.6}}>
                  💡 <strong>Hint:</strong> Steel is a <strong>magnetic material</strong>. Activity 4.4 showed us
                  that stroking metal 30–40 times with a bar magnet makes it magnetic. That works for a screwdriver tip too! 🧲
                </p>
                <button onClick={tryAgain} style={{marginTop:10,padding:'8px 22px',
                  background:`linear-gradient(135deg,${purple},${orange})`,
                  color:'white',border:'none',borderRadius:50,fontFamily:"'Fredoka One',cursive",
                  fontSize:'clamp(13px,2.5vw,16px)',cursor:'pointer',
                  boxShadow:`0 4px 14px rgba(83,48,134,.3)`,transition:'transform 0.15s'}}
                  onMouseOver={e=>(e.currentTarget as HTMLElement).style.transform='scale(1.06)'}
                  onMouseOut ={e=>(e.currentTarget as HTMLElement).style.transform='scale(1)'}
                >🔄 Try Again</button>
              </div>
            )}

            {phase==='choosing'&&showHint&&(
              <div style={{textAlign:'center',marginTop:'clamp(8px,1.5vw,12px)'}}>
                <button style={{background:'none',border:`2px dashed ${amber}`,borderRadius:10,
                  padding:'5px 14px',color:amberDark,fontWeight:700,fontSize:'clamp(11px,1.8vw,13px)',
                  cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}
                  onClick={()=>setHintVisible(h=>!h)}>
                  💡 {hintVisible?'Hide Hint':'Need a Hint?'}
                </button>
                {hintVisible&&(
                  <div style={{background:amberLight,border:`2px solid ${amber}`,borderRadius:12,
                    padding:'clamp(8px,2vw,12px)',marginTop:8,
                    fontSize:'clamp(11px,2vw,13px)',color:amberDark,fontWeight:700,lineHeight:1.6,
                    animation:'panelIn 0.4s ease'}}>
                    🔩 Steel is a <strong>magnetic material</strong>. Which solution uses magnetism to keep the screw attached? 🧲
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stroking explanation */}
        {phase==='stroking'&&(
          <div style={{marginTop:'clamp(10px,2vw,14px)',padding:'clamp(10px,2vw,14px)',
            background:'rgba(16,185,129,0.07)',border:`2px solid ${green}`,borderRadius:14,
            animation:'panelIn 0.4s ease'}}>
            <p style={{fontSize:'clamp(12px,2vw,14px)',color:'#065f46',fontWeight:700,margin:0,lineHeight:1.6}}>
              🧲 Stroking the tip in the <strong>same direction</strong> (Activity 4.4!) aligns magnetic domains
              inside the steel — making the tip magnetic. Watch the bar fill up! 🔬
            </p>
          </div>
        )}

        {/* Success panel */}
        {(phase==='magnetised'||phase==='success')&&(
          <div style={{marginTop:'clamp(12px,2vw,16px)',padding:'clamp(14px,3vw,20px)',
            borderRadius:20,textAlign:'center',
            background:'rgba(16,185,129,0.10)',border:`3px solid ${green}`,
            animation:'panelIn 0.6s cubic-bezier(0.34,1.56,0.64,1)'}}>
            <div style={{fontSize:'clamp(28px,6vw,44px)',marginBottom:6,animation:'burst 0.6s ease'}}>🎉</div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:'clamp(16px,4vw,24px)',color:'#065f46',marginBottom:10}}>
              🏆 Brilliant! Problem Solved!
            </div>
            <p style={{fontSize:'clamp(12px,2vw,15px)',color:'#374151',lineHeight:1.7,fontWeight:600,margin:0}}>
              🔩 <strong>Steel is a magnetic material.</strong> Stroking the screwdriver tip with a bar magnet
              30–40 times in the same direction (just like <strong>Activity 4.4!</strong>) makes the tip magnetic.
              Screws now cling to it automatically! 🧲✨
            </p>
            <div style={{display:'flex',justifyContent:'center',gap:10,marginTop:14}}>
              {[0,1,2].map(i=>(
                <Award key={i} size={isMobile?22:28} color={amber} fill={amberLight}
                  style={{animation:`burst 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i*0.18}s both`}}/>
              ))}
            </div>
            <div style={{display:'inline-block',marginTop:14,background:amberLight,
              border:`2px solid ${amber}`,borderRadius:50,
              padding:'clamp(5px,1.2vw,8px) clamp(12px,3vw,20px)',
              fontFamily:"'Fredoka One',cursive",fontSize:'clamp(11px,2.2vw,14px)',
              color:amberDark,boxShadow:'0 3px 10px rgba(245,158,11,0.3)'}}>
              📖 Chapter 4 · Activity 4.4 — Magnetising by stroking
            </div>
            <div style={{marginTop:16}}>
              <button onClick={reset} style={{padding:'clamp(9px,1.8vw,12px) clamp(20px,4vw,30px)',
                background:`linear-gradient(135deg,${amber},${orange})`,
                color:'white',border:'none',borderRadius:50,fontFamily:"'Fredoka One',cursive",
                fontSize:'clamp(14px,2.8vw,18px)',cursor:'pointer',
                boxShadow:`0 5px 18px rgba(245,158,11,.4)`,
                display:'inline-flex',alignItems:'center',gap:8,transition:'transform .15s'}}
                onMouseOver={e=>(e.currentTarget as HTMLElement).style.transform='scale(1.06)'}
                onMouseOut ={e=>(e.currentTarget as HTMLElement).style.transform='scale(1)'}
              ><RotateCcw size={isMobile?14:16}/> Try Again!</button>
            </div>
          </div>
        )}
      </div>

      <div style={{padding:'6px 14px',background:'rgba(255,255,255,.65)',borderRadius:10,
        fontSize:'clamp(9px,1.6vw,12px)',color:'#9ca3af',fontWeight:600,
        textAlign:'center',maxWidth:540,width:'100%'}}>
        📖 NCERT Curiosity — Science Grade 6 · Chapter 4: Exploring Magnets · Q9
      </div>
    </div>
  );
};

export default MagnetiseScrewdriverTool;