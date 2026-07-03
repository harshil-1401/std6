import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS — Singularity_tool_Design_1.pdf
// ─────────────────────────────────────────────────────────────────
const T = {
  blue:        '#4A4DC9',
  orange:      '#FF7212',
  gradFrom:    '#533086',
  gradTo:      '#FC9145',
  gray900:     '#4E4E4E',
  gray400:     '#CACACA',
  gray200:     '#EBEBEB',
  gray50:      '#F5F5F5',
  blueLight:   '#C1C1EA',
  orangeLight: '#FFF3E4',
  white:       '#FFFFFF',
  success:     '#22C55E',
  error:       '#EF4444',
  font:        "'Poppins', sans-serif",
};

// ─────────────────────────────────────────────────────────────────
// BREAKPOINTS
// ─────────────────────────────────────────────────────────────────
const BP = { mobile: 480, tablet: 768 };

// ─────────────────────────────────────────────────────────────────
// RESPONSIVE HOOK
// ─────────────────────────────────────────────────────────────────
const useBreakpoint = () => {
  const [w, setW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 800
  );
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return {
    w,
    isMobile: w < BP.mobile,
    isTablet: w >= BP.mobile && w < BP.tablet,
    isDesktop: w >= BP.tablet,
  };
};

// ─────────────────────────────────────────────────────────────────
// GLOBAL CSS INJECTION
// ─────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

/* ── Magnet: always settles to exactly 0° (N-S) ── */
@keyframes swingMagnet {
  0%   {transform:rotate(0deg)}
  7%   {transform:rotate(52deg)}
  16%  {transform:rotate(-40deg)}
  25%  {transform:rotate(29deg)}
  34%  {transform:rotate(-20deg)}
  43%  {transform:rotate(13deg)}
  51%  {transform:rotate(-8deg)}
  59%  {transform:rotate(4.5deg)}
  66%  {transform:rotate(-2.5deg)}
  73%  {transform:rotate(1.2deg)}
  80%  {transform:rotate(-0.5deg)}
  87%  {transform:rotate(0.2deg)}
  93%  {transform:rotate(-0.05deg)}
  100% {transform:rotate(0deg)}
}

/* ── Iron bar: chaotic then random final ── */
@keyframes swingIron {
  0%   {transform:rotate(0deg)}
  5%   {transform:rotate(75deg)}
  11%  {transform:rotate(-60deg)}
  18%  {transform:rotate(85deg)}
  25%  {transform:rotate(-48deg)}
  32%  {transform:rotate(65deg)}
  39%  {transform:rotate(-35deg)}
  46%  {transform:rotate(52deg)}
  52%  {transform:rotate(-25deg)}
  58%  {transform:rotate(42deg)}
  64%  {transform:rotate(-18deg)}
  70%  {transform:rotate(calc(var(--rnd) * 0.8))}
  76%  {transform:rotate(calc(var(--rnd) * 1.05))}
  82%  {transform:rotate(calc(var(--rnd) * 0.93))}
  88%  {transform:rotate(calc(var(--rnd) * 0.98))}
  94%  {transform:rotate(var(--rnd))}
  100% {transform:rotate(var(--rnd))}
}

@keyframes threadFlex {
  0%,100%{transform:skewX(0deg) scaleX(1)}
  30%    {transform:skewX(5deg) scaleX(0.97)}
  70%    {transform:skewX(-4deg) scaleX(1.02)}
}

@keyframes particleFly {
  0%  {transform:translate(0,0) scale(1);opacity:1}
  100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}
}

@keyframes cardIn {
  from{opacity:0;transform:translateY(18px) scale(0.97)}
  to  {opacity:1;transform:translateY(0) scale(1)}
}

@keyframes optIn {
  from{opacity:0;transform:translateX(-8px)}
  to  {opacity:1;transform:translateX(0)}
}

@keyframes correctGlow {
  0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}
  50%    {box-shadow:0 0 0 6px rgba(34,197,94,0.22)}
}

@keyframes wrongShake {
  0%,100%{transform:translateX(0)}
  20%    {transform:translateX(-5px)}
  40%    {transform:translateX(4px)}
  60%    {transform:translateX(-3px)}
  80%    {transform:translateX(2px)}
}

@keyframes feedbackIn {
  from{opacity:0;transform:translateY(24px) scale(0.96)}
  to  {opacity:1;transform:translateY(0) scale(1)}
}

@keyframes badgePop {
  0%  {transform:scale(0) rotate(-12deg);opacity:0}
  65% {transform:scale(1.12) rotate(3deg);opacity:1}
  100%{transform:scale(1) rotate(0);opacity:1}
}

@keyframes labelFloat {
  from{opacity:0;transform:translateY(5px)}
  to  {opacity:1;transform:translateY(0)}
}

@keyframes releasePulse {
  0%  {box-shadow:0 0 0 0 rgba(83,48,134,0.5)}
  70% {box-shadow:0 0 0 14px rgba(83,48,134,0)}
  100%{box-shadow:0 0 0 0 rgba(83,48,134,0)}
}

@keyframes bgDrift {
  0%,100%{transform:translate(0,0)}
  33%    {transform:translate(24px,-18px)}
  66%    {transform:translate(-18px,14px)}
}

@keyframes settledIn {
  from{opacity:0;transform:translateX(-50%) translateY(6px)}
  to  {opacity:1;transform:translateX(-50%) translateY(0)}
}

/* hover/active states */
.btn-release{transition:all .26s ease;outline:none;-webkit-tap-highlight-color:transparent;}
.btn-release:hover:not(:disabled){transform:translateY(-2px) scale(1.02);filter:brightness(1.08)}
.btn-release:active:not(:disabled){transform:scale(0.98)}
.btn-try{transition:all .24s ease;outline:none;-webkit-tap-highlight-color:transparent;}
.btn-try:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(83,48,134,0.4)!important}
.btn-try:active{transform:scale(0.98)}
.opt-btn{transition:border-color .16s,background .16s,transform .16s;outline:none;-webkit-tap-highlight-color:transparent;}
.opt-btn:hover:not(:disabled):not(.sel){border-color:#C1C1EA!important;background:rgba(193,193,234,0.1)!important;transform:translateX(3px)}
.opt-btn:active:not(:disabled){transform:scale(0.98)}
`;

const injectStyles = () => {
  if (document.getElementById('mpt-css')) return;
  const s = document.createElement('style');
  s.id = 'mpt-css';
  s.textContent = STYLES;
  document.head.appendChild(s);
};

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type Pred  = 'north-south' | 'east-west' | 'random' | 'always-east' | null;
type Phase = 'predict' | 'animating' | 'result';
interface PState { prediction: Pred; settled: boolean }

const OPTS: { v: Pred; label: string; icon: string }[] = [
  { v: 'north-south', label: 'North–South',         icon: '↕' },
  { v: 'east-west',   label: 'East–West',            icon: '↔' },
  { v: 'random',      label: 'Any random direction', icon: '⟳' },
  { v: 'always-east', label: 'Always points East',   icon: '→' },
];

// ─────────────────────────────────────────────────────────────────
// THREAD
// ─────────────────────────────────────────────────────────────────
const Thread: React.FC<{ animating: boolean; height?: number }> = ({ animating, height = 32 }) => (
  <div style={{
    width: 2.5, height, borderRadius: 2, flexShrink: 0,
    background: `linear-gradient(to bottom, ${T.gradFrom}, ${T.gradTo})`,
    boxShadow: `0 0 8px ${T.gradFrom}55`,
    animation: animating ? 'threadFlex 0.45s ease-in-out infinite' : 'none',
  }} />
);

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────
const Hook: React.FC = () => (
  <svg width="24" height="18" viewBox="0 0 28 20" style={{ display: 'block', flexShrink: 0 }}>
    <circle cx="14" cy="3" r="3" fill={T.gray400} />
    <line x1="14" y1="3" x2="14" y2="10" stroke={T.gray400} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M14 10 Q14 19 5 19 Q5 20 8 20 L20 20 Q23 20 23 19 Q14 19 14 10"
      fill="none" stroke={T.gray400} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// MAGNET BODY — vertical (N top, S bottom), size-aware
// ─────────────────────────────────────────────────────────────────
const MagnetBody: React.FC<{ showLabels: boolean; size: 'sm' | 'md' | 'lg' }> = ({ showLabels, size }) => {
  const W = size === 'sm' ? 32 : size === 'md' ? 36 : 42;
  const H = size === 'sm' ? 48 : size === 'md' ? 56 : 64;
  const fs = size === 'sm' ? 13 : size === 'md' ? 15 : 17;

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        borderRadius: 8, overflow: 'hidden',
        boxShadow: `0 6px 20px rgba(74,77,201,0.32),0 2px 8px rgba(0,0,0,0.12),inset 1px 0 0 rgba(255,255,255,0.45)`,
        border: '1.5px solid rgba(255,255,255,0.55)',
      }}>
        {/* N pole */}
        <div style={{
          width: W, height: H,
          background: 'linear-gradient(175deg,#ff8a80 0%,#ef4444 45%,#b91c1c 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'rgba(255,255,255,0.22)', borderRadius: '6px 6px 0 0' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: fs, fontFamily: T.font, textShadow: '0 1px 4px rgba(0,0,0,0.35)', position: 'relative', zIndex: 1 }}>N</span>
        </div>
        {/* Divider */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.75)', flexShrink: 0 }} />
        {/* S pole */}
        <div style={{
          width: W, height: H,
          background: 'linear-gradient(175deg,#93c5fd 0%,#3b82f6 45%,#1d4ed8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'rgba(255,255,255,0.18)' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: fs, fontFamily: T.font, textShadow: '0 1px 4px rgba(0,0,0,0.35)', position: 'relative', zIndex: 1 }}>S</span>
        </div>
      </div>
      {showLabels && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: H * 0.85, animation: 'labelFloat 0.5s ease-out both' }}>
          <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700, fontFamily: T.font, lineHeight: 1 }}>North</span>
          <span style={{ fontSize: 9, color: '#3b82f6', fontWeight: 700, fontFamily: T.font, lineHeight: 1 }}>South</span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// IRON BAR — vertical, size-aware
// ─────────────────────────────────────────────────────────────────
const IronBody: React.FC<{ showLabels: boolean; size: 'sm' | 'md' | 'lg' }> = ({ showLabels, size }) => {
  const W = size === 'sm' ? 32 : size === 'md' ? 36 : 42;
  const H = size === 'sm' ? 99 : size === 'md' ? 115 : 131; // 2*poleH + 3 divider

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: W, height: H, borderRadius: 8,
        background: 'linear-gradient(175deg,#d1d5db 0%,#6b7280 45%,#374151 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 6px 20px rgba(0,0,0,0.18),0 2px 8px rgba(0,0,0,0.1),inset 1px 0 0 rgba(255,255,255,0.3)',
        border: '1.5px solid rgba(255,255,255,0.35)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'rgba(255,255,255,0.14)', borderRadius: '6px 6px 0 0' }} />
        <span style={{
          color: '#fff', fontWeight: 700, fontSize: 9, fontFamily: T.font,
          letterSpacing: 2, textShadow: '0 1px 4px rgba(0,0,0,0.45)',
          position: 'relative', zIndex: 1,
          writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)',
        }}>IRON BAR</span>
      </div>
      {showLabels && (
        <div style={{ animation: 'labelFloat 0.5s ease-out both' }}>
          <span style={{ fontSize: 9, color: T.gray400, fontWeight: 600, fontFamily: T.font, whiteSpace: 'nowrap' }}>
            No fixed<br />direction
          </span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// COMPASS ROSE
// ─────────────────────────────────────────────────────────────────
const CompassRose: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60">
    <circle cx="30" cy="30" r="28" fill={`${T.blueLight}20`} stroke={`${T.blueLight}60`} strokeWidth="1.5" />
    <circle cx="30" cy="30" r="20" fill="none" stroke={`${T.blueLight}30`} strokeWidth="1" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
      <line key={a}
        x1={30 + (a % 90 === 0 ? 20 : 18) * Math.sin(a * Math.PI / 180)}
        y1={30 - (a % 90 === 0 ? 20 : 18) * Math.cos(a * Math.PI / 180)}
        x2={30 + 28 * Math.sin(a * Math.PI / 180)}
        y2={30 - 28 * Math.cos(a * Math.PI / 180)}
        stroke={a % 90 === 0 ? `${T.blue}80` : `${T.blueLight}60`}
        strokeWidth={a % 90 === 0 ? 1.5 : 1}
      />
    ))}
    <text x="30" y="8"  textAnchor="middle" fill={T.blue}         fontSize="8.5" fontWeight="700" fontFamily="Poppins">N</text>
    <text x="30" y="56" textAnchor="middle" fill={`${T.blue}55`}  fontSize="7"   fontFamily="Poppins">S</text>
    <text x="54" y="33" textAnchor="middle" fill={`${T.blue}55`}  fontSize="7"   fontFamily="Poppins">E</text>
    <text x="6"  y="33" textAnchor="middle" fill={`${T.blue}55`}  fontSize="7"   fontFamily="Poppins">W</text>
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// PARTICLES
// ─────────────────────────────────────────────────────────────────
const Particles: React.FC<{ active: boolean; isMagnet: boolean }> = ({ active, isMagnet }) => {
  if (!active) return null;
  const color = isMagnet ? T.blue : T.gray400;
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none', zIndex: 10 }}>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * 360;
        const dist  = 22 + Math.random() * 16;
        return (
          <div key={i} style={{
            position: 'absolute',
            width: i % 3 === 0 ? 7 : 5, height: i % 3 === 0 ? 7 : 5,
            borderRadius: '50%',
            background: i % 2 === 0 ? color : T.orange,
            top: 0, left: 0, transform: 'translate(-50%,-50%)',
            ['--dx' as any]: `${Math.cos(angle * Math.PI / 180) * dist}px`,
            ['--dy' as any]: `${Math.sin(angle * Math.PI / 180) * dist}px`,
            animation: `particleFly 0.7s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 0.03}s both`,
            opacity: 0,
          }} />
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// OPTION BUTTON
// ─────────────────────────────────────────────────────────────────
const OptionBtn: React.FC<{
  opt: typeof OPTS[0];
  selected: boolean;
  resultState: 'idle' | 'correct' | 'wrong';
  disabled: boolean;
  delay: number;
  compact: boolean;
  onClick: () => void;
}> = ({ opt, selected, resultState, disabled, delay, compact, onClick }) => {
  const isC = resultState === 'correct';
  const isW = resultState === 'wrong';
  const border = isC ? T.success : isW ? T.error : selected ? T.blue : T.gray200;
  const bg     = isC ? 'rgba(34,197,94,0.07)' : isW ? 'rgba(239,68,68,0.06)' : selected ? `${T.blueLight}25` : T.white;
  const tc     = isC ? T.success : isW ? T.error : selected ? T.blue : T.gray900;

  return (
    <button
      className={`opt-btn${selected ? ' sel' : ''}`}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: compact ? 8 : 10,
        padding: compact ? '8px 10px' : '9px 12px',
        borderRadius: 10, border: `2px solid ${border}`, background: bg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: '100%', textAlign: 'left',
        animation: `optIn 0.36s ease-out ${delay}s both${isC ? ',correctGlow 0.9s ease-out 0.1s 2' : ''}${isW ? ',wrongShake 0.4s ease-out 0.05s' : ''}`,
        opacity: (disabled && !selected && resultState === 'idle') ? 0.5 : 1,
        position: 'relative',
      }}
    >
      {/* Accent stripe */}
      {selected && !isC && !isW && (
        <div style={{
          position: 'absolute', left: 0, top: 4, bottom: 4, width: 3,
          background: `linear-gradient(to bottom, ${T.gradFrom}, ${T.gradTo})`,
          borderRadius: '0 2px 2px 0',
        }} />
      )}
      <div style={{
        width: compact ? 26 : 30, height: compact ? 26 : 30, borderRadius: 7, flexShrink: 0,
        background: isC ? 'rgba(34,197,94,0.14)' : isW ? 'rgba(239,68,68,0.1)' : selected ? `${T.blueLight}55` : T.gray50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: compact ? 14 : 16, color: tc, fontWeight: 700, transition: 'background .16s',
      }}>
        {opt.icon}
      </div>
      <span style={{
        fontSize: compact ? 11.5 : 12.5, fontWeight: selected ? 700 : 500,
        color: tc, fontFamily: T.font, flex: 1, lineHeight: 1.3,
      }}>
        {opt.label}
      </span>
      {isC && <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>}
      {isW && <span style={{ fontSize: 14, flexShrink: 0 }}>❌</span>}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────
// PANEL — adapts layout per breakpoint
// ─────────────────────────────────────────────────────────────────
const Panel: React.FC<{
  type: 'magnet' | 'iron';
  phase: Phase;
  ps: PState;
  ironAngle: number;
  onPredict: (v: Pred) => void;
  correct: Pred;
  idx: number;
  isMobile: boolean;
  isTablet: boolean;
}> = ({ type, phase, ps, ironAngle, onPredict, correct, idx, isMobile, isTablet }) => {
  const isMag    = type === 'magnet';
  const isAnim   = phase === 'animating';
  const isResult = phase === 'result';
  const compact  = isMobile;
  const size     = isMobile ? 'sm' : isTablet ? 'md' : 'lg';

  const chamberH = isMobile ? 180 : isTablet ? 210 : 240;
  const threadH  = isMobile ? 26 : isTablet ? 30 : 36;

  const pendulumStyle: React.CSSProperties = {
    transformOrigin: 'center top',
    willChange: 'transform',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    animation: isAnim
      ? isMag
        ? 'swingMagnet 4.0s cubic-bezier(0.23,1,0.32,1) forwards'
        : 'swingIron 4.4s cubic-bezier(0.23,1,0.32,1) forwards'
      : 'none',
    transform: (!isAnim && ps.settled)
      ? isMag ? 'rotate(0deg)' : `rotate(${ironAngle}deg)`
      : 'rotate(0deg)',
    ['--rnd' as any]: `${ironAngle}deg`,
  };

  const getState = (v: Pred): 'idle' | 'correct' | 'wrong' => {
    if (!isResult || ps.prediction !== v) return 'idle';
    return v === correct ? 'correct' : 'wrong';
  };

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: T.white, borderRadius: isMobile ? 14 : 20,
      border: `1.5px solid ${T.gray200}`,
      boxShadow: '0 4px 24px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: `cardIn 0.48s ease-out ${idx * 0.12}s both`,
    }}>
      {/* Top colour strip */}
      <div style={{
        height: 4,
        background: isMag
          ? `linear-gradient(90deg, ${T.gradFrom}, ${T.blue})`
          : `linear-gradient(90deg, ${T.gray400}, ${T.gray200})`,
      }} />

      {/* Card header */}
      <div style={{
        padding: isMobile ? '10px 12px 8px' : '13px 16px 10px',
        borderBottom: `1px solid ${T.gray200}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: isMobile ? 32 : 38, height: isMobile ? 32 : 38,
          borderRadius: isMobile ? 9 : 11, flexShrink: 0,
          background: isMag ? `${T.blueLight}55` : T.gray200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isMobile ? 16 : 20,
        }}>
          {isMag ? '🧲' : '⬜'}
        </div>
        <div>
          <p style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: T.gray900, fontFamily: T.font, lineHeight: 1.2 }}>
            {isMag ? 'Bar Magnet' : 'Iron Bar'}
          </p>
          <p style={{ fontSize: isMobile ? 10 : 11, color: T.gray400, fontFamily: T.font }}>
            {isMag ? 'Has N & S poles' : 'Non-magnetic material'}
          </p>
        </div>
      </div>

      {/* Suspension chamber */}
      <div style={{
        position: 'relative', minHeight: chamberH,
        background: `linear-gradient(180deg, ${T.gray50} 0%, ${isMag ? T.blueLight + '18' : T.gray200 + '28'} 100%)`,
        borderBottom: `1px solid ${T.gray200}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: `8px ${isMobile ? 8 : 14}px 20px`,
        overflow: 'hidden',
      }}>
        {/* Compass watermark */}
        <div style={{
          position: 'absolute', bottom: 6, right: 6,
          opacity: (isResult && ps.settled) ? 0.28 : 0.09,
          transition: 'opacity 1s ease',
        }}>
          <CompassRose size={isMobile ? 44 : 56} />
        </div>

        {/* N/S/E/W edge labels */}
        {(['N','S','E','W'] as const).map(d => {
          const pos: Record<string, React.CSSProperties> = {
            N: { top: 8,    left: '50%', transform: 'translateX(-50%)' },
            S: { bottom: 8, left: '50%', transform: 'translateX(-50%)' },
            E: { right: 9,  top: '50%',  transform: 'translateY(-50%)' },
            W: { left: 9,   top: '50%',  transform: 'translateY(-50%)' },
          };
          return (
            <span key={d} style={{
              position: 'absolute', fontSize: 9, fontWeight: 700,
              color: `${T.blue}28`, fontFamily: T.font,
              ...pos[d],
            }}>{d}</span>
          );
        })}

        {/* Hook */}
        <Hook />

        {/* Pendulum */}
        <div style={pendulumStyle as React.CSSProperties}>
          <Thread animating={isAnim} height={threadH} />
          {isMag
            ? <MagnetBody showLabels={isResult && ps.settled} size={size} />
            : <IronBody   showLabels={isResult && ps.settled} size={size} />
          }
        </div>

        <Particles active={isResult && ps.settled} isMagnet={isMag} />

        {/* Settled badge */}
        {isResult && ps.settled && (
          <div style={{
            position: 'absolute', bottom: 7, left: '50%',
            background: isMag
              ? `linear-gradient(135deg, ${T.gradFrom}, ${T.blue})`
              : `linear-gradient(135deg, ${T.gray900}, ${T.gray400})`,
            borderRadius: 20, padding: '3px 12px', whiteSpace: 'nowrap',
            animation: 'settledIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) 0.2s both',
            boxShadow: isMag ? `0 4px 12px ${T.blue}40` : '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', fontFamily: T.font, letterSpacing: 0.4 }}>
              {isMag ? '↕ North–South' : '↻ Random angle'}
            </span>
          </div>
        )}
      </div>

      {/* Prediction options */}
      <div style={{ padding: isMobile ? '10px 11px 14px' : '12px 14px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <p style={{
          fontSize: 10, fontWeight: 600, color: T.gray400, fontFamily: T.font,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
        }}>
          Your Prediction
        </p>
        {OPTS.map((opt, i) => (
          <OptionBtn
            key={opt.v}
            opt={opt}
            selected={ps.prediction === opt.v}
            resultState={getState(opt.v)}
            disabled={phase !== 'predict'}
            delay={0.06 * i}
            compact={compact}
            onClick={() => onPredict(opt.v)}
          />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// VS BADGE
// ─────────────────────────────────────────────────────────────────
const VsBadge: React.FC<{ vertical: boolean }> = ({ vertical }) => (
  <div style={{
    display: 'flex',
    flexDirection: vertical ? 'row' : 'column',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'stretch',
    padding: vertical ? '8px 0' : '0 5px',
    gap: 6,
  }}>
    <div style={{ [vertical ? 'height' : 'width']: 1, [vertical ? 'width' : 'height']: '100%', flex: 1, background: `linear-gradient(${vertical ? 'to right' : 'to bottom'}, transparent, ${T.gray200}, transparent)` }} />
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: `linear-gradient(135deg, ${T.blueLight}44, ${T.orangeLight})`,
      border: `1.5px solid ${T.blueLight}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800, color: T.blue, fontFamily: T.font,
    }}>VS</div>
    <div style={{ [vertical ? 'height' : 'width']: 1, [vertical ? 'width' : 'height']: '100%', flex: 1, background: `linear-gradient(${vertical ? 'to right' : 'to bottom'}, transparent, ${T.gray200}, transparent)` }} />
  </div>
);

// ─────────────────────────────────────────────────────────────────
// RELEASE BUTTON
// ─────────────────────────────────────────────────────────────────
const ReleaseBtn: React.FC<{ phase: Phase; canRelease: boolean; isMobile: boolean; onClick: () => void }> = ({ phase, canRelease, isMobile, onClick }) => {
  const active = canRelease && phase === 'predict';
  const isAnim = phase === 'animating';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '2px 0 16px' }}>
      <button
        className="btn-release"
        disabled={!active}
        onClick={onClick}
        style={{
          height: isMobile ? 44 : 48, padding: isMobile ? '0 28px' : '0 44px',
          borderRadius: 24, border: 'none',
          background: active
            ? `linear-gradient(135deg, ${T.gradFrom} 0%, ${T.blue} 50%, ${T.gradTo} 100%)`
            : T.gray200,
          color: active ? '#fff' : T.gray400,
          fontWeight: 700, fontSize: isMobile ? 13 : 14.5, fontFamily: T.font,
          cursor: active ? 'pointer' : 'not-allowed',
          animation: active ? 'releasePulse 2.2s ease-in-out infinite' : 'none',
          boxShadow: active ? `0 5px 22px ${T.gradFrom}45` : 'none',
          display: 'flex', alignItems: 'center', gap: 8, letterSpacing: 0.2,
          width: isMobile ? '100%' : 'auto',
          maxWidth: isMobile ? 360 : 'none',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: isMobile ? 16 : 18 }}>{isAnim ? '⏳' : active ? '🎯' : '👆'}</span>
        {isAnim ? 'Releasing…' : active ? 'Release & Watch!' : 'Select predictions first'}
      </button>
      {!canRelease && phase === 'predict' && (
        <p style={{ fontSize: 11, color: T.gray400, fontFamily: T.font, textAlign: 'center' }}>
          Make a prediction for <strong style={{ color: T.gray900 }}>both</strong> objects to continue
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// FEEDBACK
// ─────────────────────────────────────────────────────────────────
const Feedback: React.FC<{ mOk: boolean; iOk: boolean; isMobile: boolean; onReset: () => void }> = ({ mOk, iOk, isMobile, onReset }) => {
  const score = Number(mOk) + Number(iOk);
  const emoji = score === 2 ? '🌟' : score === 1 ? '👍' : '🤔';
  const label = score === 2 ? 'Perfect Score!' : score === 1 ? 'Good Try!' : "Let's Learn!";
  const sc    = score === 2 ? T.success : score === 1 ? T.orange : T.error;
  const pad   = isMobile ? '16px 14px 0' : '22px 22px 0';
  const padX  = isMobile ? '14px' : '22px';

  return (
    <div style={{
      background: T.white, borderRadius: isMobile ? 14 : 20,
      border: `1.5px solid ${T.gray200}`,
      boxShadow: '0 8px 40px rgba(0,0,0,0.1),0 2px 8px rgba(0,0,0,0.05)',
      overflow: 'hidden', animation: 'feedbackIn 0.52s cubic-bezier(0.175,0.885,0.32,1.275) both',
    }}>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${T.gradFrom}, ${T.gradTo})` }} />

      <div style={{ padding: pad }}>
        {/* Score row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16, marginBottom: isMobile ? 14 : 20 }}>
          <div style={{
            width: isMobile ? 50 : 60, height: isMobile ? 50 : 60,
            borderRadius: isMobile ? 13 : 16, flexShrink: 0,
            background: `${sc}15`, border: `2px solid ${sc}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? 24 : 30,
            animation: 'badgePop 0.6s cubic-bezier(0.175,0.885,0.32,1.275) 0.1s both',
          }}>{emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: sc, fontFamily: T.font, lineHeight: 1.2 }}>{label}</p>
            <p style={{ fontSize: isMobile ? 11 : 12.5, color: T.gray400, fontFamily: T.font }}>{score} of 2 correct</p>
          </div>
          <div style={{
            padding: isMobile ? '6px 14px' : '7px 18px', borderRadius: 22,
            background: sc, color: '#fff', fontSize: isMobile ? 17 : 20,
            fontWeight: 800, fontFamily: T.font, flexShrink: 0,
            boxShadow: `0 4px 14px ${sc}55`,
            animation: 'badgePop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) 0.26s both',
          }}>{score}/2</div>
        </div>

        {/* Explanation cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 18 }}>
          {/* Magnet */}
          <div style={{
            borderRadius: isMobile ? 11 : 14, padding: isMobile ? '11px 12px' : '13px 15px',
            border: `1.5px solid ${mOk ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.2)'}`,
            background: mOk ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 17 }}>🧲</span>
              <span style={{ fontWeight: 700, fontSize: isMobile ? 12 : 13, fontFamily: T.font, color: mOk ? T.success : T.error }}>
                Bar Magnet — {mOk ? '✅ Correct!' : '❌ Answer: North–South'}
              </span>
            </div>
            <p style={{ fontSize: isMobile ? 11.5 : 12.5, color: T.gray900, lineHeight: 1.65, fontFamily: T.font }}>
              A <strong style={{ color: T.blue }}>freely suspended bar magnet</strong> always rests along the{' '}
              <strong style={{ color: T.blue }}>north–south direction</strong> because our{' '}
              <strong style={{ color: T.blue }}>Earth behaves like a giant magnet</strong>. Its{' '}
              <strong style={{ color: '#ef4444' }}>North-seeking pole</strong> is attracted toward geographic south.
              This is how a <strong style={{ color: T.blue }}>magnetic compass</strong> works!
            </p>
          </div>

          {/* Iron */}
          <div style={{
            borderRadius: isMobile ? 11 : 14, padding: isMobile ? '11px 12px' : '13px 15px',
            border: `1.5px solid ${iOk ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.2)'}`,
            background: iOk ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 17 }}>⬜</span>
              <span style={{ fontWeight: 700, fontSize: isMobile ? 12 : 13, fontFamily: T.font, color: iOk ? T.success : T.error }}>
                Iron Bar — {iOk ? '✅ Correct!' : '❌ Answer: Any Random Direction'}
              </span>
            </div>
            <p style={{ fontSize: isMobile ? 11.5 : 12.5, color: T.gray900, lineHeight: 1.65, fontFamily: T.font }}>
              An <strong>iron bar</strong> is a <strong style={{ color: T.gray900 }}>non-magnetic material</strong> with
              no <strong>North or South poles</strong>, so Earth's field cannot align it.
              When freely suspended it rests in <strong style={{ color: T.gray900 }}>any random direction</strong>.
              This helps us tell <strong>magnetic</strong> from <strong>non-magnetic materials</strong>!
            </p>
          </div>

          {/* Key concept */}
          <div style={{
            borderRadius: isMobile ? 11 : 14, padding: isMobile ? '10px 12px' : '12px 15px',
            background: T.orangeLight, border: `1.5px solid rgba(255,114,18,0.2)`,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>💡</span>
            <p style={{ fontSize: isMobile ? 11.5 : 12.5, color: T.gray900, lineHeight: 1.65, fontFamily: T.font }}>
              <strong style={{ color: T.orange }}>Key Concept:</strong> Only objects with{' '}
              <strong>magnetic poles</strong> align with Earth's field.
              A freely suspended magnet always settles N–S. A non-magnetic iron bar settles randomly.
            </p>
          </div>
        </div>
      </div>

      {/* Try again */}
      <div style={{ padding: `0 ${padX} ${isMobile ? '16px' : '22px'}` }}>
        <button
          className="btn-try"
          onClick={onReset}
          style={{
            width: '100%', height: isMobile ? 44 : 48, borderRadius: 24, border: 'none',
            background: `linear-gradient(135deg, ${T.gradFrom} 0%, ${T.blue} 55%, ${T.gradTo} 100%)`,
            color: '#fff', fontWeight: 700, fontSize: isMobile ? 13.5 : 14.5, fontFamily: T.font,
            cursor: 'pointer', boxShadow: `0 5px 22px ${T.gradFrom}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <span style={{ fontSize: isMobile ? 16 : 18 }}>🔄</span>
          Try Again
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
interface Props {
  props?: {
    additionalProps?: { title?: string; subtitle?: string; instructions?: string };
  };
}

const MagnetPredictionTool: React.FC<Props> = ({ props: tp = {} }) => {
  const ap           = tp?.additionalProps ?? {};
  const title        = ap.title        ?? 'Suspension Prediction Lab';
  const subtitle     = ap.subtitle     ?? 'Chapter 4 — Exploring Magnets';
  const instructions = ap.instructions ?? 'Predict the resting direction for each object, then click Release & Watch!';

  const { isMobile, isTablet } = useBreakpoint();

  const [phase, setPhase]         = useState<Phase>('predict');
  const [magP,  setMagP]          = useState<PState>({ prediction: null, settled: false });
  const [ironP, setIronP]         = useState<PState>({ prediction: null, settled: false });
  const [showFB, setShowFB]       = useState(false);
  const [ironAngle, setIronAngle] = useState(55);
  const tmr = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { injectStyles(); }, []);
  useEffect(() => () => { if (tmr.current) clearTimeout(tmr.current); }, []);

  const canRelease = magP.prediction !== null && ironP.prediction !== null;

  const handleRelease = useCallback(() => {
    if (!canRelease || phase !== 'predict') return;
    let a: number;
    do { a = Math.floor(Math.random() * 340) + 10; }
    while ([0, 90, 180, 270, 360].some(f => Math.abs(a - f) < 22));
    setIronAngle(a);
    setPhase('animating');
    tmr.current = setTimeout(() => {
      setMagP(p => ({ ...p, settled: true }));
      setIronP(p => ({ ...p, settled: true }));
      setPhase('result');
      setTimeout(() => setShowFB(true), 500);
    }, 4600);
  }, [canRelease, phase]);

  const handleReset = useCallback(() => {
    if (tmr.current) clearTimeout(tmr.current);
    setPhase('predict');
    setMagP({ prediction: null, settled: false });
    setIronP({ prediction: null, settled: false });
    setShowFB(false);
  }, []);

  // On mobile, panels stack vertically; on tablet/desktop, side by side
  const panelsRow = !isMobile;

  return (
    <div style={{
      minHeight: '100vh',
      background: T.gray50,
      fontFamily: T.font,
      padding: isMobile ? '12px' : isTablet ? '16px' : '24px 20px',
      boxSizing: 'border-box',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient blobs */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-15%',
        width: isMobile ? 300 : 500, height: isMobile ? 300 : 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${T.blueLight}35 0%, transparent 70%)`,
        pointerEvents: 'none', animation: 'bgDrift 14s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', left: '-15%',
        width: isMobile ? 260 : 440, height: isMobile ? 260 : 440,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${T.orangeLight} 0%, transparent 70%)`,
        pointerEvents: 'none', animation: 'bgDrift 18s ease-in-out infinite reverse',
      }} />

      <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 16 : 22, animation: 'cardIn 0.45s ease-out both' }}>
          {/* Chapter chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: isMobile ? '4px 12px' : '5px 16px',
            borderRadius: 20, marginBottom: isMobile ? 8 : 12,
            background: `${T.blueLight}55`, border: `1px solid ${T.blueLight}`,
          }}>
            <span style={{ fontSize: isMobile ? 11 : 13 }}>🔬</span>
            <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: T.blue, fontFamily: T.font, letterSpacing: 0.7 }}>
              {subtitle}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: isMobile ? 20 : isTablet ? 26 : 32,
            fontWeight: 900, fontFamily: T.font, lineHeight: 1.15,
            marginBottom: isMobile ? 10 : 14,
            background: `linear-gradient(135deg, ${T.gradFrom} 0%, ${T.blue} 50%, ${T.gradTo} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>{title}</h1>

          {/* Instructions */}
          <div style={{
            display: 'inline-block', padding: isMobile ? '8px 14px' : '10px 20px',
            borderRadius: 12, maxWidth: isMobile ? '100%' : 560, width: isMobile ? '100%' : 'auto',
            background: T.orangeLight, border: `1.5px solid rgba(255,114,18,0.2)`,
            boxSizing: 'border-box',
          }}>
            <p style={{ fontSize: isMobile ? 11.5 : 13, color: T.gray900, fontFamily: T.font, lineHeight: 1.55, textAlign: isMobile ? 'left' : 'center' }}>
              <strong style={{ color: T.orange }}>📋 </strong>{instructions}
            </p>
          </div>
        </div>

        {/* ── PANELS + VS ── */}
        <div style={{
          display: 'flex',
          flexDirection: panelsRow ? 'row' : 'column',
          gap: 0,
          marginBottom: isMobile ? 14 : 18,
          alignItems: 'stretch',
        }}>
          <Panel
            type="magnet" phase={phase} ps={magP} ironAngle={0}
            onPredict={v => setMagP(p => ({ ...p, prediction: v }))}
            correct="north-south" idx={0} isMobile={isMobile} isTablet={isTablet}
          />

          <VsBadge vertical={!panelsRow} />

          <Panel
            type="iron" phase={phase} ps={ironP} ironAngle={ironAngle}
            onPredict={v => setIronP(p => ({ ...p, prediction: v }))}
            correct="random" idx={1} isMobile={isMobile} isTablet={isTablet}
          />
        </div>

        {/* ── RELEASE ── */}
        {phase !== 'result' && (
          <ReleaseBtn phase={phase} canRelease={canRelease} isMobile={isMobile} onClick={handleRelease} />
        )}

        {/* ── FEEDBACK ── */}
        {showFB && (
          <Feedback mOk={magP.prediction === 'north-south'} iOk={ironP.prediction === 'random'} isMobile={isMobile} onReset={handleReset} />
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: isMobile ? 16 : 22, paddingBottom: 8 }}>
          <p style={{ fontSize: 10.5, color: T.gray400, fontFamily: T.font }}>
            NCERT Curiosity · Textbook of Science · Grade 6 · Chapter 4
          </p>
        </div>
      </div>
    </div>
  );
};

export default MagnetPredictionTool;