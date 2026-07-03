import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Star, Award, RotateCcw } from 'lucide-react';

interface MagnetCompassToolProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    darkMode?: boolean;
    animationSpeed?: number;
    additionalProps?: {
      compassSize?: number;
      showHint?: boolean;
      title?: string;
      subtitle?: string;
    };
  };
  setStepDetails?: (details: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

type Phase = 'idle' | 'dragging' | 'swinging' | 'settled' | 'labeling' | 'feedback';
type LabelOption = '' | 'North-seeking pole' | 'South-seeking pole';

// ─── Keyframes ────────────────────────────────────────────────────
const injectKeyframes = () => {
  if (document.getElementById('mct-kf')) return;
  const s = document.createElement('style');
  s.id = 'mct-kf';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');
    @keyframes mSwing {
      0%   { transform:translateX(-50%) rotate(-28deg); }
      20%  { transform:translateX(-50%) rotate(22deg);  }
      38%  { transform:translateX(-50%) rotate(-13deg); }
      55%  { transform:translateX(-50%) rotate(8deg);   }
      70%  { transform:translateX(-50%) rotate(-4deg);  }
      84%  { transform:translateX(-50%) rotate(2deg);   }
      100% { transform:translateX(-50%) rotate(0deg);   }
    }
    @keyframes mFloat {
      0%,100% { transform:translateY(0px);  }
      50%      { transform:translateY(-6px); }
    }
    @keyframes fadeUp {
      from { opacity:0; transform:translateY(14px); }
      to   { opacity:1; transform:translateY(0);    }
    }
    @keyframes blink {
      0%,100% { opacity:1;    }
      50%      { opacity:0.15; }
    }
    @keyframes compassPop {
      0%   { transform:scale(0.3) rotate(-300deg); opacity:0; }
      70%  { transform:scale(1.06) rotate(6deg);   opacity:1; }
      100% { transform:scale(1)    rotate(0deg);   opacity:1; }
    }
    @keyframes glowRing {
      0%,100% { box-shadow:0 0 8px 2px rgba(245,158,11,.55),0 3px 14px rgba(245,158,11,.2); }
      50%      { box-shadow:0 0 20px 7px rgba(245,158,11,.85),0 5px 22px rgba(245,158,11,.4); }
    }
    @keyframes starPop {
      0%   { transform:scale(0) rotate(-20deg); opacity:0; }
      65%  { transform:scale(1.3) rotate(5deg); opacity:1; }
      100% { transform:scale(1)  rotate(0deg);  opacity:1; }
    }
    @keyframes okFlash {
      0%   { background:rgba(16,185,129,.06); }
      50%  { background:rgba(16,185,129,.22); }
      100% { background:rgba(16,185,129,.1);  }
    }
    @keyframes errFlash {
      0%   { background:rgba(239,68,68,.06); }
      50%  { background:rgba(239,68,68,.18); }
      100% { background:rgba(239,68,68,.06); }
    }
    @keyframes pulse {
      0%,100% { box-shadow:0 0 0 0 rgba(245,158,11,.5);  }
      50%      { box-shadow:0 0 0 8px rgba(245,158,11,0); }
    }
  `;
  document.head.appendChild(s);
};

// ─── Compass — N on LEFT, needle points LEFT ──────────────────────
const CompassSVG: React.FC<{
  animate: boolean; size: number;
  amber: string; amberDark: string; purple: string; purpleLight: string;
}> = ({ animate, size, amber, amberDark, purple, purpleLight }) => (
  <svg viewBox="0 0 120 120" width={size} height={size}
    style={{ display:'block', animation: animate ? 'compassPop 1.1s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none' }}>
    <circle cx="60" cy="60" r="56" fill="#f8fafc" stroke={purpleLight} strokeWidth="3" />
    <circle cx="60" cy="60" r="50" fill="white"   stroke="#e2e8f0"    strokeWidth="1" />
    {/* Tick marks */}
    {Array.from({ length: 72 }, (_, i) => {
      const a  = (i * 5 * Math.PI) / 180;
      const r1 = i % 18 === 0 ? 33 : i % 9 === 0 ? 37 : 40;
      const x1 = 60 + r1 * Math.sin(a);  const y1 = 60 - r1 * Math.cos(a);
      const x2 = 60 + 47 * Math.sin(a);  const y2 = 60 - 47 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={i % 18 === 0 ? purple : purpleLight}
        strokeWidth={i % 18 === 0 ? 2 : 1} strokeLinecap="round" />;
    })}
    {/* N=LEFT  S=RIGHT  W=TOP  E=BOTTOM */}
    <text x="13"  y="64" textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="900" fill="#dc2626" fontFamily="Fredoka One,cursive">N</text>
    <text x="107" y="64" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="800" fill={purple}   fontFamily="Fredoka One,cursive">S</text>
    <text x="60"  y="14" textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="800" fill={purple}   fontFamily="Fredoka One,cursive">W</text>
    <text x="60"  y="108" textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="800" fill={purple}  fontFamily="Fredoka One,cursive">E</text>
    {/* Horizontal needle — red LEFT (N), blue RIGHT (S) */}
    <polygon points="16,60 58,54 64,60 58,66"  fill="#1d4ed8" />
    <polygon points="104,60 62,54 56,60 62,66" fill="#dc2626" />
    <circle cx="60" cy="60" r="7" fill={amber}    stroke={amberDark} strokeWidth="2" />
    <circle cx="60" cy="60" r="3" fill={amberDark} />
  </svg>
);

// ─── Magnet bar — red LEFT, blue RIGHT, no N/S labels ────────────
const MagnetBar: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const r = h / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}
      style={{ display:'block', filter:'drop-shadow(0 4px 14px rgba(0,0,0,.28))' }}>
      <defs>
        <linearGradient id="mNG" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#f87171" />
          <stop offset="50%"  stopColor="#dc2626" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="mSG" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#60a5fa" />
          <stop offset="50%"  stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <clipPath id="mClip"><rect x="0" y="0" width={w} height={h} rx={r} ry={r} /></clipPath>
      </defs>
      <rect x="0" y="0" width={w}   height={h} rx={r} ry={r} fill="#d1d5db" />
      <rect x="0" y="0" width={w/2} height={h} fill="url(#mNG)" clipPath="url(#mClip)" />
      <rect x={w/2} y="0" width={w/2} height={h} fill="url(#mSG)" clipPath="url(#mClip)" />
      <line x1={w/2} y1={h*0.15} x2={w/2} y2={h*0.85} stroke="rgba(255,255,255,.45)" strokeWidth="2" />
      <rect x="0" y="0" width={w} height={h/3} fill="rgba(255,255,255,.16)" clipPath="url(#mClip)" />
      <rect x="1.5" y="1.5" width={w-3} height={h-3} rx={r-1} ry={r-1} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
    </svg>
  );
};

// ─── Stand SVG — crossbar + vertical pole + base ─────────────────
const StandSVG: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const pw = Math.max(8, w * 0.14);
  const ch = Math.max(16, h * 0.14);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display:'block' }}>
      <defs>
        <linearGradient id="pG" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#6b7280" />
          <stop offset="45%"  stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
        <linearGradient id="bG2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
      </defs>
      {/* Base */}
      <rect x={w*0.1} y={h-14} width={w*0.8} height={12} rx="6" fill="url(#bG2)" />
      {/* Vertical pole */}
      <rect x={(w-pw)/2} y={ch*0.5} width={pw} height={h-14-ch*0.5} rx={pw/2} fill="url(#pG)" />
      {/* Crossbar */}
      <rect x={w*0.08} y={0} width={w*0.84} height={ch} rx={ch/2} fill="url(#pG)" />
      {/* Hook */}
      <circle cx={w/2} cy={ch+2} r={ch*0.42} fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
      <circle cx={w/2} cy={ch+2} r={ch*0.18} fill="#b45309" />
    </svg>
  );
};

// ─── Main Component ───────────────────────────────────────────────
const MagnetCompassTool: React.FC<MagnetCompassToolProps> = ({ props = {} }) => {
  const { additionalProps = {} } = props;
  const {
    title    = '🧲 Magnet Explorer',
    subtitle = 'Discover the North-Seeking Pole!',
    showHint = true,
  } = additionalProps;

  const amber       = '#f59e0b';
  const amberDark   = '#b45309';
  const amberLight  = '#fef3c7';
  const purple      = '#533086';
  const purpleLight = '#C1C1EA';
  const orange      = '#FC9145';

  // ── State ────────────────────────────────────────────────────────
  const [phase,     setPhase]     = useState<Phase>('idle');
  const [dragPos,   setDragPos]   = useState({ x: 0, y: 0 });
  const [isDrag,    setIsDrag]    = useState(false);
  const [dragOff,   setDragOff]   = useState({ x: 0, y: 0 });
  const [northLbl,  setNorthLbl]  = useState<LabelOption>('');
  const [southLbl,  setSouthLbl]  = useState<LabelOption>('');
  const [correct,   setCorrect]   = useState<boolean | null>(null);
  const [stars,     setStars]     = useState(0);
  const [attempts,  setAttempts]  = useState(0);
  const [hint,      setHint]      = useState(false);
  const [cxAnim,    setCxAnim]    = useState(false);

  // ── Measured layout ──────────────────────────────────────────────
  const [cw, setCw] = useState(320); // starts small, measured on mount
  const sceneRef  = useRef<HTMLDivElement>(null);
  const hookRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectKeyframes();
    const measure = () => {
      if (sceneRef.current) {
        const w = sceneRef.current.offsetWidth;
        if (w > 0) setCw(w);
      }
    };
    // Measure immediately and after paint
    measure();
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (sceneRef.current) ro.observe(sceneRef.current);
    return () => ro.disconnect();
  }, []);

  // ── All geometry — fully derived from cw, no blank space ──────────
  const isMobile = cw < 400;
  const isTablet = cw < 600;

  // Scene height: tight fixed ratio so nothing overflows on any device
  const SCENE_H    = Math.round(Math.min(cw * 0.56, 320));
  const FLOOR_H    = Math.round(SCENE_H * 0.20);

  // Stand fits exactly inside scene vertically
  const STAND_W    = Math.round(cw * (isMobile ? 0.13 : 0.10));
  const STAND_H    = Math.round(SCENE_H * 0.58);
  const STAND_X    = Math.round(cw * 0.38);
  const CROSS_H    = Math.round(STAND_H * 0.14);
  const HOOK_TOP   = Math.round(6 + CROSS_H);               // hook centre Y

  // Thread short enough so magnet clears the floor
  const THREAD_LEN = Math.round(SCENE_H * 0.15);
  const MAG_W      = Math.round(cw * (isMobile ? 0.46 : isTablet ? 0.43 : 0.40));
  const MAG_H      = Math.round(MAG_W * 0.19);
  const MAG_TOP    = HOOK_TOP + THREAD_LEN;

  // Compass fits beside magnet without overflow
  const COMPASS_SZ = Math.round(cw * (isMobile ? 0.16 : 0.15));
  const COMPASS_R  = Math.round(cw * 0.03);

  const isSuspended = phase === 'swinging' || phase === 'settled' || phase === 'labeling' || phase === 'feedback';

  // ── Drag handlers ────────────────────────────────────────────────
  const onMagnetDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== 'idle') return;
    e.preventDefault();
    const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const r  = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOff({ x: cx - r.left - r.width / 2, y: cy - r.top - r.height / 2 });
    setIsDrag(true);
    setPhase('dragging');
  }, [phase]);

  const onMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrag || !sceneRef.current) return;
    const cx = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const cy = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    const r  = sceneRef.current.getBoundingClientRect();
    setDragPos({ x: cx - r.left - dragOff.x, y: cy - r.top - dragOff.y });
  }, [isDrag, dragOff]);

  const onUp = useCallback(() => {
    if (!isDrag) return;
    setIsDrag(false);
    if (!sceneRef.current || !hookRef.current) { setPhase('idle'); return; }
    const sr = sceneRef.current.getBoundingClientRect();
    const hr = hookRef.current.getBoundingClientRect();
    const hx = hr.left - sr.left + hr.width / 2;
    const hy = hr.top  - sr.top  + hr.height / 2;
    if (Math.hypot(dragPos.x - hx, dragPos.y - hy) < Math.min(130, cw * 0.28)) {
      setPhase('swinging');
      setTimeout(() => { setPhase('settled'); setCxAnim(true); }, 2100);
    } else {
      setPhase('idle');
    }
  }, [isDrag, dragPos, cw]);

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, [onMove, onUp]);

  const checkAnswer = () => {
    if (!northLbl || !southLbl) return;
    const ok = northLbl === 'North-seeking pole' && southLbl === 'South-seeking pole';
    setCorrect(ok);
    setAttempts(a => a + 1);
    if (ok) setStars(s => Math.min(s + 1, 3));
    setPhase('feedback');
  };

  const reset = () => {
    setPhase('idle'); setDragPos({ x:0, y:0 });
    setNorthLbl(''); setSouthLbl('');
    setCorrect(null); setCxAnim(false); setHint(false);
  };

  const instructions: Record<Phase, string> = {
    idle:     '👆 Drag the magnet up to the orange hook on the stand!',
    dragging: '🎯 Drop it near the orange hook to hang it!',
    swinging: '⏳ Watch it swing and settle along north–south…',
    settled:  '🌍 It settled! Now label each end below.',
    labeling: '✏️ Choose the correct label for each end, then check!',
    feedback: correct ? '🎉 Brilliant! You nailed it!' : '🤔 Not quite — look at the NORTH banner!',
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'Nunito',sans-serif",
      width: '100%',
      height: 'fit-content',
      background: 'linear-gradient(135deg,#fffbeb 0%,#fef3c7 45%,#fff7ed 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'clamp(8px,2vw,14px) clamp(6px,2vw,10px) clamp(10px,2.5vw,16px)',
      boxSizing: 'border-box', gap: 'clamp(6px,1.5vw,10px)',
    }}>

      {/* Header */}
      <div style={{ textAlign:'center', width:'100%' }}>
        <h1 style={{
          fontFamily:"'Fredoka One',cursive",
          fontSize:'clamp(20px,5vw,36px)',
          color: purple, margin:0, lineHeight:1.1,
        }}>{title}</h1>
        <p style={{
          fontSize:'clamp(12px,2.5vw,16px)',
          color: amberDark, fontWeight:700, margin:'4px 0 0',
        }}>{subtitle}</p>
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:6, alignItems:'center' }}>
          {[0,1,2].map(i => (
            <Star key={i} size={isMobile ? 18 : 22}
              fill={i < stars ? amber : 'none'} color={i < stars ? amber : '#d1d5db'}
              style={{ animation: i < stars ? 'starPop .4s ease' : 'none' }} />
          ))}
          {attempts > 0 && (
            <span style={{ fontSize:12, color:'#6b7280', marginLeft:4 }}>{attempts} try</span>
          )}
        </div>
      </div>

      {/* Instruction */}
      <div style={{
        background:'white', border:`3px solid ${amber}`, borderRadius:16,
        padding:'clamp(8px,2vw,12px) clamp(12px,3vw,18px)',
        maxWidth:680, width:'100%',
        boxShadow:'0 4px 16px rgba(245,158,11,.18)',
      }}>
        <p style={{ fontSize:'clamp(12px,2.2vw,15px)', color:'#374151', margin:0, fontWeight:700, lineHeight:1.6 }}>
          {instructions[phase]}
        </p>
      </div>

      {/* Main card */}
      <div style={{
        background:'white', borderRadius:22, border:`3px solid ${purpleLight}`,
        boxShadow:'0 8px 36px rgba(83,48,134,.13)',
        padding:'clamp(8px,2vw,12px)',
        maxWidth:720, width:'100%',
      }}>

        {/* ══ SCENE ══ */}
        <div
          ref={sceneRef}
          style={{
            position:'relative', width:'100%', height: SCENE_H,
            background:'linear-gradient(180deg,#dbeafe 0%,#ecfdf5 65%,#d1fae5 100%)',
            borderRadius:16, overflow:'hidden', border:`2px solid ${purpleLight}`,
            cursor: isDrag ? 'grabbing' : 'default', userSelect:'none',
          }}
        >
          {/* Floor */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, height: FLOOR_H,
            background:'linear-gradient(180deg,#92400e,#78350f)',
            borderTop:'4px solid #b45309',
          }}>
            {Array.from({ length: Math.ceil(cw / 48) + 1 }, (_, i) => (
              <div key={i} style={{ position:'absolute', left: i*48, top:0, bottom:0, width:1, background:'rgba(255,255,255,.07)' }} />
            ))}
          </div>

          {/* Stand */}
          <div style={{ position:'absolute', left: STAND_X, top:8, transform:'translateX(-50%)', zIndex:4 }}>
            <StandSVG w={STAND_W} h={STAND_H} />
          </div>

          {/* Invisible hook anchor */}
          <div ref={hookRef} style={{
            position:'absolute',
            left: STAND_X, top: HOOK_TOP + 6,
            transform:'translateX(-50%)',
            width:14, height:14, borderRadius:'50%',
            background:'transparent', zIndex:5,
            // Pulse only in idle to guide student
            animation: phase === 'idle' ? 'pulse 1.8s ease-in-out infinite' : 'none',
            boxShadow: phase === 'idle' ? '0 0 0 0 rgba(245,158,11,.5)' : 'none',
          }} />

          {/* Thread */}
          {isSuspended && (
            <div style={{
              position:'absolute',
              left: STAND_X, top: HOOK_TOP + 6,
              transform:'translateX(-50%)',
              width:2, height: THREAD_LEN,
              background:'linear-gradient(180deg,#6b7280,#9ca3af)',
              borderRadius:1, zIndex:6, transformOrigin:'top center',
              animation: phase === 'swinging' ? 'mSwing 2.1s cubic-bezier(0.23,1,0.32,1) forwards' : 'none',
            }} />
          )}

          {/* Magnet — idle on table */}
          {phase === 'idle' && (
            <div
              onMouseDown={onMagnetDown}
              onTouchStart={onMagnetDown}
              style={{
                position:'absolute',
                left: cw * 0.05, bottom: FLOOR_H + Math.round(SCENE_H * 0.05),
                cursor:'grab', animation:'mFloat 2.5s ease-in-out infinite',
                zIndex:8, touchAction:'none',
              }}
            >
              <MagnetBar w={MAG_W} h={MAG_H} />
              <p style={{
                textAlign:'center', fontSize:'clamp(10px,1.8vw,12px)',
                color:'#6b7280', fontWeight:700, margin:'3px 0 0',
              }}>✋ Grab &amp; drag me!</p>
            </div>
          )}

          {/* Magnet — dragging */}
          {phase === 'dragging' && (
            <div style={{
              position:'absolute', left: dragPos.x, top: dragPos.y,
              transform:'translate(-50%,-50%)', zIndex:20, pointerEvents:'none',
            }}>
              <MagnetBar w={MAG_W} h={MAG_H} />
            </div>
          )}

          {/* Magnet — suspended */}
          {isSuspended && (
            <div style={{
              position:'absolute',
              left: STAND_X, top: MAG_TOP,
              transform:'translateX(-50%)',
              transformOrigin:'top center', zIndex:7,
              animation: phase === 'swinging' ? 'mSwing 2.1s cubic-bezier(0.23,1,0.32,1) forwards' : 'none',
            }}>
              <MagnetBar w={MAG_W} h={MAG_H} />
            </div>
          )}

          {/* Direction banners */}
          {(phase === 'settled' || phase === 'labeling' || phase === 'feedback') && (
            <>
              <div style={{
                position:'absolute',
                left: Math.max(6, STAND_X - MAG_W/2 - (isMobile ? 60 : 80)),
                top: MAG_TOP - Math.round(SCENE_H * 0.09),
                animation:'fadeUp .45s ease', zIndex:10,
              }}>
                <div style={{
                  background:'#dc2626', color:'white',
                  fontFamily:"'Fredoka One',cursive",
                  fontSize:'clamp(11px,2vw,16px)',
                  borderRadius:30, padding:`${isMobile?3:5}px ${isMobile?10:14}px`,
                  boxShadow:'0 3px 12px rgba(220,38,38,.45)', whiteSpace:'nowrap',
                }}>◄ NORTH</div>
              </div>
              <div style={{
                position:'absolute',
                right: Math.max(6, cw - STAND_X - MAG_W/2 - (isMobile ? 60 : 80)),
                top: MAG_TOP - Math.round(SCENE_H * 0.09),
                animation:'fadeUp .45s ease', zIndex:10,
              }}>
                <div style={{
                  background:'#1d4ed8', color:'white',
                  fontFamily:"'Fredoka One',cursive",
                  fontSize:'clamp(11px,2vw,16px)',
                  borderRadius:30, padding:`${isMobile?3:5}px ${isMobile?10:14}px`,
                  boxShadow:'0 3px 12px rgba(29,78,216,.45)', whiteSpace:'nowrap',
                }}>SOUTH ►</div>
              </div>
            </>
          )}

          {/* Hang-here hint */}
          {phase === 'idle' && (
            <div style={{
              position:'absolute',
              left: STAND_X + STAND_W/2 + 4,
              top: HOOK_TOP - 4,
              fontSize:'clamp(10px,1.8vw,13px)', fontWeight:800, color: amberDark,
              animation:'blink 1s ease-in-out infinite', zIndex:9, whiteSpace:'nowrap',
            }}>← hang here!</div>
          )}

          {/* Compass */}
          <div style={{
            position:'absolute',
            right: COMPASS_R,
            bottom: FLOOR_H + Math.round(SCENE_H * 0.04),
            width: COMPASS_SZ, height: COMPASS_SZ,
            borderRadius:'50%', background:'white',
            border:`${isMobile?2:3}px solid ${amber}`,
            overflow:'hidden', zIndex:8,
            animation: cxAnim ? 'glowRing 1.8s ease-in-out infinite' : 'none',
            boxShadow:'0 4px 16px rgba(245,158,11,.22)',
          }}>
            <CompassSVG animate={cxAnim} size={COMPASS_SZ}
              amber={amber} amberDark={amberDark} purple={purple} purpleLight={purpleLight} />
          </div>

          {/* Compass label + N arrow */}
          {isSuspended && (
            <div style={{
              position:'absolute',
              right: COMPASS_R + COMPASS_SZ + 2,
              bottom: FLOOR_H + Math.round(SCENE_H * 0.06) + COMPASS_SZ/2 - 10,
              zIndex:9, pointerEvents:'none',
            }}>
              <span style={{
                fontSize:'clamp(12px,2vw,18px)', color:'#dc2626',
                fontWeight:900, animation:'blink 1.1s ease-in-out infinite',
              }}>◄N</span>
            </div>
          )}
        </div>
        {/* ══ END SCENE ══ */}

        {/* Label area */}
        {(phase === 'settled' || phase === 'labeling') && (
          <div style={{ animation:'fadeUp .5s ease' }}>
            <p style={{
              textAlign:'center', fontWeight:800, color: purple,
              margin:'clamp(10px,2vw,16px) 0 clamp(8px,1.5vw,12px)',
              fontSize:'clamp(13px,2.5vw,16px)',
            }}>🏷️ Label each end of the magnet:</p>

            <div style={{
              display:'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 'clamp(8px,2vw,12px)',
            }}>
              {/* Red end */}
              {[
                { label:'🔴 Red End', sub:'Points toward geographic North', val: northLbl, set: setNorthLbl },
                { label:'🔵 Blue End', sub:'Points toward geographic South', val: southLbl, set: setSouthLbl },
              ].map(({ label, sub, val, set }, idx) => (
                <div key={idx} style={{
                  background: val ? amberLight : '#f9fafb',
                  border:`2px solid ${val ? amber : '#e5e7eb'}`,
                  borderRadius:14, padding:'clamp(10px,2vw,14px)',
                  textAlign:'center', transition:'all .3s',
                }}>
                  <div style={{
                    fontFamily:"'Fredoka One',cursive",
                    fontSize:'clamp(13px,2.5vw,16px)',
                    color: idx === 0 ? '#dc2626' : '#1d4ed8', marginBottom:4,
                  }}>{label}</div>
                  <div style={{ fontSize:'clamp(10px,1.8vw,12px)', color:'#6b7280', marginBottom:8, fontWeight:600 }}>
                    {sub}
                  </div>
                  <select style={{
                    width:'100%', padding:'clamp(6px,1.5vw,9px) 8px', borderRadius:10,
                    border:`2px solid ${purpleLight}`,
                    fontFamily:"'Nunito',sans-serif",
                    fontSize:'clamp(11px,1.8vw,13px)',
                    fontWeight:700, color: purple, background:'white', cursor:'pointer', outline:'none',
                  }}
                    value={val}
                    onChange={e => { set(e.target.value as LabelOption); setPhase('labeling'); }}
                  >
                    <option value="">-- Choose a label --</option>
                    <option value="North-seeking pole">North-seeking pole</option>
                    <option value="South-seeking pole">South-seeking pole</option>
                  </select>
                </div>
              ))}
            </div>

            {/* Hint */}
            {showHint && (
              <div style={{ textAlign:'center', marginTop:'clamp(8px,1.5vw,12px)' }}>
                <button style={{
                  background:'none', border:`2px dashed ${amber}`,
                  borderRadius:10, padding:'5px 14px',
                  color: amberDark, fontWeight:700,
                  fontSize:'clamp(12px,1.8vw,14px)',
                  cursor:'pointer', fontFamily:"'Nunito',sans-serif",
                }}
                  onClick={() => setHint(h => !h)}
                >💡 {hint ? 'Hide Hint' : 'Need a Hint?'}</button>
                {hint && (
                  <div style={{
                    background: amberLight, border:`2px solid ${amber}`,
                    borderRadius:12, padding:'clamp(8px,2vw,12px) clamp(10px,2.5vw,14px)',
                    marginTop:8,
                    fontSize:'clamp(11px,2vw,14px)', color: amberDark,
                    fontWeight:700, lineHeight:1.6, animation:'fadeUp .4s ease',
                  }}>
                    🌍 See the <strong>◄ NORTH</strong> banner? That's geographic North!
                    The <strong>red end</strong> of the magnet points that way — so the red end
                    is the <strong>North-seeking pole</strong>. 🧲
                  </div>
                )}
              </div>
            )}

            {/* Check button */}
            <button
              onClick={checkAnswer}
              disabled={!northLbl || !southLbl}
              style={{
                display:'block', margin:'clamp(12px,2vw,16px) auto 0',
                padding:`clamp(10px,2vw,13px) clamp(24px,5vw,36px)`,
                background: northLbl && southLbl
                  ? `linear-gradient(135deg,${purple},${orange})`
                  : '#e5e7eb',
                color: northLbl && southLbl ? 'white' : '#9ca3af',
                border:'none', borderRadius:50,
                fontFamily:"'Fredoka One',cursive",
                fontSize:'clamp(14px,3vw,20px)',
                cursor: northLbl && southLbl ? 'pointer' : 'not-allowed',
                boxShadow: northLbl && southLbl ? `0 6px 20px rgba(83,48,134,.35)` : 'none',
                transition:'transform .15s',
              }}
              onMouseOver={e => { if (northLbl && southLbl) (e.currentTarget as HTMLElement).style.transform='scale(1.05)'; }}
              onMouseOut={e =>  { (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}
            >✅ Check My Answer!</button>
          </div>
        )}

        {/* Feedback */}
        {phase === 'feedback' && correct !== null && (
          <div style={{
            marginTop:'clamp(10px,2vw,16px)',
            padding:'clamp(14px,3vw,20px)',
            borderRadius:18, textAlign:'center',
            background: correct ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.08)',
            border:`3px solid ${correct ? '#10b981' : '#ef4444'}`,
            animation: correct ? 'okFlash .8s ease' : 'errFlash .8s ease',
          }}>
            <div style={{ fontSize:'clamp(28px,5vw,38px)', marginBottom:6 }}>
              {correct ? '🎉' : '🤔'}
            </div>
            <div style={{
              fontFamily:"'Fredoka One',cursive",
              fontSize:'clamp(16px,4vw,24px)',
              color: correct ? '#065f46' : '#991b1b', marginBottom:8,
            }}>
              {correct ? '🏆 Brilliant! Correct!' : '😅 Not quite right!'}
            </div>
            <p style={{
              fontSize:'clamp(12px,2vw,15px)', color:'#374151',
              lineHeight:1.7, fontWeight:600, margin:0,
            }}>
              {correct
                ? "🌍 The red end is the North-seeking pole — it always points toward geographic North! The Earth itself behaves like a giant magnet. Earth's geographic North Pole is near its magnetic South Pole, so the magnet's North-seeking pole is attracted toward it."
                : "💡 Look at the ◄ NORTH banner — the red end faces that way. The end pointing to geographic North is the North-seeking pole. Try again!"}
            </p>
            {correct && (
              <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:10 }}>
                {[0,1,2].map(i => (
                  <Award key={i} size={isMobile?20:26} color={amber} fill={amberLight}
                    style={{ animation:`starPop .4s ease ${i*.15}s both` }} />
                ))}
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'center', gap:10, marginTop:14, flexWrap:'wrap' }}>
              {!correct && (
                <button style={{
                  padding:`clamp(8px,1.5vw,10px) clamp(18px,3vw,24px)`,
                  background:`linear-gradient(135deg,${purple},${orange})`,
                  color:'white', border:'none', borderRadius:50,
                  fontFamily:"'Fredoka One',cursive",
                  fontSize:'clamp(13px,2.5vw,16px)',
                  cursor:'pointer', boxShadow:`0 4px 14px rgba(83,48,134,.3)`,
                }}
                  onClick={() => { setNorthLbl(''); setSouthLbl(''); setPhase('settled'); setCorrect(null); }}
                >🔄 Try Again</button>
              )}
              <button style={{
                padding:`clamp(8px,1.5vw,10px) clamp(18px,3vw,24px)`,
                background:`linear-gradient(135deg,${amber},${orange})`,
                color:'white', border:'none', borderRadius:50,
                fontFamily:"'Fredoka One',cursive",
                fontSize:'clamp(13px,2.5vw,16px)',
                cursor:'pointer', boxShadow:`0 4px 14px rgba(245,158,11,.35)`,
                display:'flex', alignItems:'center', gap:6,
              }} onClick={reset}>
                <RotateCcw size={isMobile?13:15} /> Start Over
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop:0,
        padding:'6px 14px',
        background:'rgba(255,255,255,.65)', borderRadius:10,
        fontSize:'clamp(9px,1.6vw,12px)', color:'#9ca3af', fontWeight:600,
        textAlign:'center', maxWidth:540, width:'100%',
      }}>
        📖 NCERT Curiosity — Science Grade 6 · Chapter 4: Exploring Magnets
      </div>
    </div>
  );
};

export default MagnetCompassTool;