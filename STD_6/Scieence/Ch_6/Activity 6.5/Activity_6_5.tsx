// ═══════════════════════════════════════════════════════════════════════════
// File: hardness_activity_recorder.tsx
// Activity 6.5 — "Let's Test Hardness!" | Grade 6 · Chapter 6
// Complete student-friendly redesign — guided steps, big emoji visuals,
// warm language, celebration moments, tactile feedback, textbook link.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── PROP INTERFACES (agent-spec) ───────────────────────────────────────────

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

interface TestObject {
  id: string;
  name: string;
  emoji: string;
  material: string;
  trueHardness: 'soft' | 'medium' | 'hard';
  indentDepth: number;
  scratchFeedback: string;
  funFact: string;
  surfaceBg: string;
  surfaceRing: string;
  particleColor: string;
}

interface HardnessActivityRecorderProps {
  props?: {
    width?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: {
      objects?: TestObject[];
      enableSynthesis?: boolean;
      teacherName?: string;
    };
  };
  setStepDetails?: (s: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─── DEFAULT DATA ────────────────────────────────────────────────────────────

const DEFAULT_OBJECTS: TestObject[] = [
  {
    id: 'sponge',
    name: 'Sponge',
    emoji: '🧽',
    material: 'Foam',
    trueHardness: 'soft',
    indentDepth: 90,
    scratchFeedback: 'Whoa! Your finger sinks right in! The sponge squishes super easily. It is very, very soft! 😲',
    funFact: '💡 Fun fact: Sponges have millions of tiny air pockets inside — that is why they squish so easily!',
    surfaceBg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
    surfaceRing: '#F59E0B',
    particleColor: '#FCD34D',
  },
  {
    id: 'eraser',
    name: 'Rubber Eraser',
    emoji: '🟧',
    material: 'Rubber',
    trueHardness: 'medium',
    indentDepth: 45,
    scratchFeedback: 'It pushes back a little! The eraser bends and dents, but not as much as the sponge. It is soft-ish! 🤔',
    funFact: '💡 Fun fact: Rubber comes from rubber trees! It stretches and bounces back — but iron cannot do that at all!',
    surfaceBg: 'linear-gradient(135deg, #FED7AA, #FDBA74)',
    surfaceRing: '#F97316',
    particleColor: '#FB923C',
  },
  {
    id: 'nail',
    name: 'Iron Nail',
    emoji: '📌',
    material: 'Iron (Metal)',
    trueHardness: 'hard',
    indentDepth: 5,
    scratchFeedback: 'It will not budge at all! The iron nail is rock-solid. You cannot dent it with your thumb. Very hard! 💪',
    funFact: '💡 Fun fact: Iron is used for bridges and tall buildings because it is so hard and strong!',
    surfaceBg: 'linear-gradient(135deg, #E2E8F0, #CBD5E1)',
    surfaceRing: '#64748B',
    particleColor: '#94A3B8',
  },
];

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────

const T = {
  primary:    '#4A4DC9',
  purple:     '#533086',
  orange:     '#FF7212',
  amber:      '#FC9145',
  lavender:   '#C1C1EA',
  peach:      '#FFF3E4',
  charcoal:   '#4E4E4E',
  smoke:      '#EBEBEB',
  white:      '#FFFFFF',
  jade:       '#22C55E',
  jadeBg:     '#DCFCE7',
  jadeBorder: '#86EFAC',
  rose:       '#EF4444',
  roseBg:     '#FEE2E2',
};

const HARD_META: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  soft:   { bg: '#FEF3C7', text: '#92400E', label: 'Soft',   icon: '🪶' },
  medium: { bg: '#FFEDD5', text: '#9A3412', label: 'Medium', icon: '🤏' },
  hard:   { bg: '#EEF2FF', text: '#3730A3', label: 'Hard',   icon: '🪨' },
};

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .ha6 *, .ha6 *::before, .ha6 *::after { box-sizing: border-box; }

  @keyframes ha6-up      { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ha6-pop     { 0%{transform:scale(0);opacity:0} 65%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
  @keyframes ha6-shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-9px)} 40%{transform:translateX(9px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
  @keyframes ha6-bounce  { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-10px)} 70%{transform:translateY(-5px)} }
  @keyframes ha6-press   { 0%,100%{transform:scale(1)} 40%{transform:scale(0.93)} 70%{transform:scale(0.97)} }
  @keyframes ha6-glow    { 0%,100%{box-shadow:0 0 0 0 rgba(74,77,201,0.4)} 50%{box-shadow:0 0 0 12px rgba(74,77,201,0)} }
  @keyframes ha6-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes ha6-confetti{ 0%{transform:translateY(-8vh) rotate(0deg);opacity:1} 100%{transform:translateY(108vh) rotate(720deg);opacity:0} }
  @keyframes ha6-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes ha6-wiggle  { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
  @keyframes ha6-pulse   { 0%,100%{opacity:1} 50%{opacity:.55} }
  @keyframes ha6-reveal  { from{opacity:0;transform:scale(0.93) translateY(18px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes ha6-starSpin{ from{transform:rotate(0deg) scale(1)} 50%{transform:rotate(180deg) scale(1.3)} to{transform:rotate(360deg) scale(1)} }
  @keyframes ha6-rowIn   { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:translateX(0)} }
  @keyframes ha6-part    { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--px),var(--py)) scale(0);opacity:0} }

  .ha6-btn { transition: transform 0.18s ease, box-shadow 0.18s ease !important; }
  .ha6-btn:not(:disabled):hover { transform: translateY(-3px) scale(1.03) !important; box-shadow: 0 8px 24px rgba(74,77,201,0.3) !important; }
  .ha6-btn:not(:disabled):active { transform: translateY(0) scale(0.97) !important; }
`;

// ─── CONFETTI ────────────────────────────────────────────────────────────────

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const colors = [T.primary, T.orange, T.purple, T.amber, T.lavender, T.jade, '#FFD700', '#FF6B6B', '#60A5FA'];
  const pieces = Array.from({ length: 68 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2.8,
    dur: 2.2 + Math.random() * 1.8,
    color: colors[i % colors.length],
    size: 5 + Math.random() * 10,
    circle: Math.random() > 0.45,
  }));
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:500 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.left}%`, top:'-4%',
          width:p.size, height:p.circle ? p.size : p.size * 0.38,
          background:p.color, borderRadius:p.circle ? '50%' : 2,
          animation:`ha6-confetti ${p.dur}s ease-in ${p.delay}s forwards`,
        }}/>
      ))}
    </div>
  );
};

// ─── SCRATCH PARTICLES ───────────────────────────────────────────────────────

const Particles: React.FC<{ color: string; active: boolean }> = ({ color, active }) => {
  if (!active) return null;
  const dots = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    px: `${(Math.random() - 0.5) * 120}px`,
    py: `${-Math.random() * 70 - 10}px`,
    delay: Math.random() * 0.35,
  }));
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:10 }}>
      {dots.map(d => (
        <div key={d.id} style={{
          position:'absolute', left:'50%', top:'50%',
          width:9, height:9, borderRadius:'50%', background:color,
          '--px':d.px, '--py':d.py,
          animation:`ha6-part 0.65s ease-out ${d.delay}s forwards`,
        } as React.CSSProperties}/>
      ))}
    </div>
  );
};

// ─── INDENT VISUALISER ───────────────────────────────────────────────────────

const IndentBar: React.FC<{ depth: number; color: string; show: boolean }> = ({ depth, color, show }) => {
  const [heightPx, setHeightPx] = useState(0);
  useEffect(() => {
    if (show) setTimeout(() => setHeightPx(Math.round((depth / 100) * 54)), 200);
  }, [show, depth]);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      <span style={{ fontSize:8, fontWeight:700, color:'#9CA3AF', fontFamily:"'Poppins',sans-serif", textTransform:'uppercase', letterSpacing:'0.5px' }}>dent</span>
      <div style={{
        width:26, height:58, background:'#F1F5F9', borderRadius:6,
        border:`1.5px solid ${color}44`, overflow:'hidden',
        display:'flex', alignItems:'flex-end', position:'relative',
      }}>
        <div style={{
          width:'100%', borderRadius:'0 0 4px 4px',
          background:`linear-gradient(180deg,${color}77,${color})`,
          height:heightPx,
          transition:'height 0.9s cubic-bezier(0.34,1.56,0.64,1)',
        }}/>
      </div>
      <span style={{ fontSize:8, fontWeight:700, color, fontFamily:"'Poppins',sans-serif" }}>
        {depth >= 70 ? 'Deep' : depth >= 30 ? 'Some' : 'None'}
      </span>
    </div>
  );
};

// ─── OBJECT CARD ─────────────────────────────────────────────────────────────

type ScratchPhase = 'idle' | 'active' | 'done';

const ObjectCard: React.FC<{
  obj: TestObject;
  phase: ScratchPhase;
  onScratch: () => void;
  isMobile: boolean;
  index: number;
}> = ({ obj, phase, onScratch, isMobile, index }) => {
  const isDone = phase === 'done';
  const isActive = phase === 'active';
  const meta = HARD_META[obj.trueHardness];

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:12,
      animation:`ha6-up 0.5s ease-out ${index * 0.13}s both`,
      width:'100%',
    }}>
      {/* ── card ── */}
      <div style={{
        width:'100%', minHeight: isMobile ? 190 : 210,
        borderRadius:22,
        background: isDone ? `linear-gradient(160deg,${T.jadeBg},#F0FFF4)` : obj.surfaceBg,
        border:`3px solid ${isDone ? T.jade : isActive ? obj.surfaceRing : `${obj.surfaceRing}50`}`,
        position:'relative', overflow:'hidden',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:10, padding:18,
        boxShadow: isDone
          ? `0 0 0 4px ${T.jadeBorder}55, 0 8px 32px rgba(34,197,94,0.18)`
          : `0 6px 28px rgba(0,0,0,0.09)`,
        transition:'all 0.45s cubic-bezier(0.4,0,0.2,1)',
        animation: isActive ? 'ha6-press 0.5s ease-in-out' : 'none',
        cursor: !isDone && !isActive ? 'pointer' : 'default',
      }}
        onClick={!isDone && !isActive ? onScratch : undefined}
      >
        {/* shimmer */}
        {!isDone && (
          <div style={{
            position:'absolute', inset:0, pointerEvents:'none',
            background:'linear-gradient(110deg,transparent 30%,rgba(255,255,255,0.48) 50%,transparent 70%)',
            backgroundSize:'200% 100%', animation:'ha6-shimmer 3.5s ease-in-out infinite',
          }}/>
        )}

        <Particles color={obj.particleColor} active={isActive}/>

        {/* done badge */}
        {isDone && (
          <div style={{
            position:'absolute', top:10, left:10,
            background:T.jade, borderRadius:'50%', width:30, height:30,
            display:'flex', alignItems:'center', justifyContent:'center',
            animation:'ha6-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
            boxShadow:'0 3px 10px rgba(34,197,94,0.45)',
          }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        )}

        {/* hardness badge */}
        {isDone && (
          <div style={{
            position:'absolute', top:10, right:10,
            background:meta.bg, color:meta.text,
            borderRadius:10, padding:'3px 9px',
            fontSize:10, fontWeight:800, fontFamily:"'Poppins',sans-serif",
            animation:'ha6-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s both',
          }}>
            {meta.icon} {meta.label.toUpperCase()}
          </div>
        )}

        {/* main emoji */}
        <div style={{
          fontSize: isMobile ? 68 : 80, lineHeight:1,
          animation: isActive ? 'ha6-shake 0.5s ease-in-out' : 'ha6-float 3s ease-in-out infinite',
        }}>
          {obj.emoji}
        </div>

        {/* active thumb */}
        {isActive && (
          <div style={{
            position:'absolute', top:14, right:16, fontSize:30,
            animation:'ha6-wiggle 0.25s ease-in-out infinite',
            filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
          }}>
            👆
          </div>
        )}

        {/* indent bar */}
        {isDone && (
          <div style={{ position:'absolute', bottom:10, right:12 }}>
            <IndentBar depth={obj.indentDepth} color={obj.surfaceRing} show={isDone}/>
          </div>
        )}

        {isActive && (
          <div style={{ fontSize:13, fontWeight:700, color:obj.surfaceRing, fontFamily:"'Poppins',sans-serif", animation:'ha6-pulse 0.5s ease-in-out infinite' }}>
            Scratching… ⚡
          </div>
        )}
      </div>

      {/* name + material */}
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:isMobile?15:18, fontWeight:800, color:'#1E1B4B', fontFamily:"'Poppins',sans-serif" }}>{obj.name}</div>
        <div style={{ fontSize:isMobile?11:12, color:'#6B7280', fontFamily:"'Poppins',sans-serif", marginTop:2 }}>
          Made of: <strong>{obj.material}</strong>
        </div>
      </div>

      {/* scratch button */}
      {!isDone && (
        <button
          className="ha6-btn"
          onClick={onScratch}
          disabled={isActive}
          style={{
            padding: isMobile ? '11px 24px' : '13px 30px',
            borderRadius:30, border:'none',
            cursor: isActive ? 'default' : 'pointer',
            fontSize:isMobile?13:15, fontWeight:800, fontFamily:"'Poppins',sans-serif",
            background: isActive
              ? `linear-gradient(135deg,${T.amber},${T.orange})`
              : `linear-gradient(135deg,${T.primary},${T.purple})`,
            color:T.white,
            display:'flex', alignItems:'center', gap:8,
            boxShadow: isActive ? 'none' : `0 5px 20px rgba(74,77,201,0.38)`,
            animation: !isActive ? 'ha6-glow 2.5s ease-in-out infinite' : 'none',
          }}
        >
          <span style={{ fontSize:20 }}>{isActive ? '⚡' : '👆'}</span>
          {isActive ? 'Scratching…' : 'Tap to Scratch!'}
        </button>
      )}

      {/* feedback */}
      {isDone && (
        <div style={{
          width:'100%',
          background:'#F0FDF4', border:`1.5px solid ${T.jadeBorder}`,
          borderRadius:14, padding:'10px 14px',
          fontSize:isMobile?11:12, fontWeight:500, color:'#166534',
          fontFamily:"'Poppins',sans-serif", lineHeight:1.6,
          animation:'ha6-reveal 0.45s ease-out both',
        }}>
          {obj.scratchFeedback}
        </div>
      )}
    </div>
  );
};

// ─── TABLE ROW ───────────────────────────────────────────────────────────────

const TableRow: React.FC<{
  obj: TestObject;
  enabled: boolean;
  decision: string;
  note: string;
  onDecision: (v: 'soft' | 'hard') => void;
  onNote: (v: string) => void;
  even: boolean;
  isMobile: boolean;
}> = ({ obj, enabled, decision, note, onDecision, onNote, even, isMobile }) => (
  <div style={{
    display:'grid',
    gridTemplateColumns: isMobile ? '90px 1fr 1fr' : '150px 130px 160px 1fr',
    alignItems:'center', gap:8,
    padding: isMobile ? '10px 12px' : '14px 22px',
    background: enabled ? (even ? '#FAFAFA' : T.white) : '#F9FAFB',
    borderTop:'1px solid #F0F0F4',
    opacity: enabled ? 1 : 0.4,
    transition:'opacity 0.45s ease',
    animation: enabled ? 'ha6-rowIn 0.4s ease-out both' : 'none',
  }}>
    {/* object */}
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <span style={{ fontSize:isMobile?20:26 }}>{obj.emoji}</span>
      <span style={{ fontSize:isMobile?11:13, fontWeight:700, color:T.charcoal, fontFamily:"'Poppins',sans-serif", lineHeight:1.25 }}>{obj.name}</span>
    </div>
    {/* material (auto, hidden on mobile) */}
    {!isMobile && (
      <div style={{ fontSize:12, color:'#6B7280', fontFamily:"'Poppins',sans-serif" }}>
        {enabled ? obj.material : '—'}
      </div>
    )}
    {/* decision */}
    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
      {(['soft','hard'] as const).map(opt => {
        const sel = decision === opt;
        return (
          <button key={opt} className="ha6-btn" disabled={!enabled} onClick={() => onDecision(opt)} style={{
            padding: isMobile ? '5px 9px' : '6px 14px',
            borderRadius:12, border:'none',
            fontSize:isMobile?10:11, fontWeight:800, fontFamily:"'Poppins',sans-serif",
            cursor: enabled ? 'pointer' : 'default',
            background: sel
              ? opt==='soft' ? `linear-gradient(135deg,${T.orange},${T.amber})` : `linear-gradient(135deg,${T.primary},${T.purple})`
              : '#F3F4F6',
            color: sel ? T.white : '#9CA3AF',
            transform: sel ? 'scale(1.07)' : 'scale(1)',
            boxShadow: sel ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
            transition:'all 0.2s ease',
          }}>
            {opt==='soft' ? '🪶 Soft' : '🪨 Hard'}
          </button>
        );
      })}
    </div>
    {/* note */}
    <input
      disabled={!enabled}
      placeholder={enabled ? 'Write what you saw…' : 'Scratch first!'}
      value={note}
      onChange={e => onNote(e.target.value)}
      style={{
        width:'100%', padding: isMobile ? '7px 10px' : '8px 12px',
        borderRadius:10, fontSize:isMobile?11:12, fontFamily:"'Poppins',sans-serif",
        color:T.charcoal,
        border:`1.5px solid ${enabled && note.length>0 ? T.jade : enabled ? '#D1D5DB' : '#E5E7EB'}`,
        background: enabled ? T.white : '#F9FAFB',
        outline:'none', transition:'border-color 0.25s',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = T.primary; }}
      onBlur={e => { e.currentTarget.style.borderColor = note.length>0 ? T.jade : '#D1D5DB'; }}
    />
  </div>
);

// ─── RANK ITEM ───────────────────────────────────────────────────────────────

const RankItem: React.FC<{
  obj: TestObject;
  rank: number;
  total: number;
  submitted: boolean;
  correct: boolean;
  onUp: () => void;
  onDown: () => void;
  isMobile: boolean;
  animDelay: number;
}> = ({ obj, rank, total, submitted, correct, onUp, onDown, isMobile, animDelay }) => {
  const rankColors = ['#F97316','#FC9145','#4A4DC9'];
  const rankLabels = ['1st — Softest','2nd — Medium','3rd — Hardest'];
  const rc = rankColors[rank] ?? T.primary;
  const rl = rankLabels[rank] ?? `${rank+1}th`;

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      padding: isMobile ? '11px 12px' : '14px 18px',
      background: submitted ? (correct ? T.jadeBg : T.roseBg) : T.white,
      border:`2px solid ${submitted ? (correct ? T.jadeBorder : '#FCA5A5') : '#E5E7EB'}`,
      borderRadius:16, marginBottom:7,
      transition:'all 0.35s ease',
      animation:`ha6-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${animDelay}s both`,
    }}>
      <div style={{
        width:isMobile?32:38, height:isMobile?32:38, borderRadius:'50%', flexShrink:0,
        background:rc, color:T.white,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:isMobile?14:17, fontWeight:900, fontFamily:"'Poppins',sans-serif",
      }}>{rank+1}</div>
      <span style={{ fontSize:isMobile?24:30 }}>{obj.emoji}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:isMobile?13:15, fontWeight:800, color:'#1E1B4B', fontFamily:"'Poppins',sans-serif" }}>{obj.name}</div>
        <div style={{ fontSize:isMobile?10:11, color:rc, fontWeight:700, fontFamily:"'Poppins',sans-serif" }}>{rl}</div>
      </div>
      {!submitted && (
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {[{fn:onUp,sym:'↑',off:rank===0},{fn:onDown,sym:'↓',off:rank===total-1}].map(({fn,sym,off})=>(
            <button key={sym} onClick={fn} disabled={off} style={{
              width:28, height:28, borderRadius:8, border:'none',
              background: off ? '#F3F4F6' : T.lavender,
              color: off ? '#D1D5DB' : T.purple,
              cursor: off ? 'default' : 'pointer',
              fontSize:13, fontWeight:900,
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.15s ease',
            }}>{sym}</button>
          ))}
        </div>
      )}
      {submitted && <span style={{ fontSize:22, flexShrink:0 }}>{correct ? '✅' : '❌'}</span>}
    </div>
  );
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  num: number; emoji: string; title: string; subtitle: string;
  active: boolean; isMobile: boolean;
}> = ({ num, emoji, title, subtitle, active, isMobile }) => (
  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
    <div style={{
      width:isMobile?34:40, height:isMobile?34:40, borderRadius:'50%', flexShrink:0,
      background: active ? `linear-gradient(135deg,${T.primary},${T.purple})` : '#E5E7EB',
      display:'flex', alignItems:'center', justifyContent:'center',
      color:T.white, fontSize:isMobile?14:17, fontWeight:900,
      transition:'background 0.4s ease',
      boxShadow: active ? `0 4px 14px rgba(74,77,201,0.35)` : 'none',
    }}>{num}</div>
    <div>
      <div style={{ fontSize:isMobile?15:18, fontWeight:800, color:'#1E1B4B', fontFamily:"'Poppins',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
        <span>{emoji}</span> {title}
      </div>
      <div style={{ fontSize:isMobile?11:12, color:'#6B7280', fontFamily:"'Poppins',sans-serif", marginTop:1 }}>{subtitle}</div>
    </div>
  </div>
);

// ─── CHEER BANNER ────────────────────────────────────────────────────────────

const CheerBanner: React.FC<{ emoji: string; text: string; color: string; border: string }> = ({ emoji, text, color, border }) => (
  <div style={{
    marginTop:14, background:color, border:`2px solid ${border}`,
    borderRadius:14, padding:'13px 18px',
    display:'flex', alignItems:'center', gap:12,
    animation:'ha6-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
  }}>
    <span style={{ fontSize:28, animation:'ha6-bounce 1s ease-in-out 3', display:'block', flexShrink:0 }}>{emoji}</span>
    <div style={{ fontSize:13, fontWeight:700, color:'#166534', fontFamily:"'Poppins',sans-serif", lineHeight:1.5 }}>{text}</div>
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const HardnessActivityRecorder: React.FC<HardnessActivityRecorderProps> = ({ props = {}, setStepDetails }) => {
  const ap = props.additionalProps ?? {};
  const objects: TestObject[] = ap.objects ?? DEFAULT_OBJECTS;
  const enableSynthesis: boolean = ap.enableSynthesis ?? true;
  const teacherName: string = ap.teacherName ?? 'Madam Vidya';
  const N = objects.length;

  // ── state ──
  const [phases, setPhases] = useState<Record<string,ScratchPhase>>(() =>
    Object.fromEntries(objects.map(o => [o.id, 'idle' as ScratchPhase]))
  );
  const [rows, setRows] = useState<Record<string,{decision:string;note:string}>>(() =>
    Object.fromEntries(objects.map(o => [o.id, {decision:'',note:''}]))
  );
  const [ranking, setRanking] = useState<string[]>(() => objects.map(o => o.id));
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [funFact, setFunFact] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [vp, setVp] = useState(typeof window !== 'undefined' ? window.innerWidth : 920);
  const timers = useRef<Record<string,ReturnType<typeof setTimeout>>>({});

  const isMobile = vp < 620;
  const isTablet = vp >= 620 && vp < 860;

  // setup
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'ha6-s'; el.textContent = STYLES;
    document.head.appendChild(el);
    return () => { document.getElementById('ha6-s')?.remove(); };
  }, []);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);
  useEffect(() => {
    const fn = () => setVp(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // derived
  const doneCount = objects.filter(o => phases[o.id]==='done').length;
  const allDone = doneCount === N;
  const allDecided = objects.every(o => rows[o.id].decision !== '');
  const canSubmit = allDone && allDecided && reason.trim().length >= 15;

  useEffect(() => {
    setStepDetails?.({ currentStep:doneCount, totalSteps:N, isPaused:false, currentMode:'hands_on' });
  }, [doneCount, N]);

  const handleScratch = useCallback((id: string) => {
    if (phases[id] !== 'idle') return;
    setPhases(prev => ({ ...prev, [id]:'active' }));
    setFunFact(null);
    timers.current[id] = setTimeout(() => {
      setPhases(prev => ({ ...prev, [id]:'done' }));
      const obj = objects.find(o => o.id === id);
      if (obj) setTimeout(() => setFunFact(obj.funFact), 600);
    }, 2300);
  }, [phases, objects]);

  const updateDecision = useCallback((id: string, v: 'soft'|'hard') =>
    setRows(p => ({ ...p, [id]:{...p[id], decision:v} })), []);
  const updateNote = useCallback((id: string, v: string) =>
    setRows(p => ({ ...p, [id]:{...p[id], note:v} })), []);

  const moveUp = useCallback((i: number) => {
    if (i===0) return;
    setRanking(p => { const a=[...p]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; });
  }, []);
  const moveDown = useCallback((i: number) => {
    if (i===N-1) return;
    setRanking(p => { const a=[...p]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a; });
  }, [N]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    setSubmitted(true);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 5200);
  }, [canSubmit]);

  const correctOrder = [...objects].sort((a,b) => {
    const r={soft:0,medium:1,hard:2};
    return r[a.trueHardness]-r[b.trueHardness];
  }).map(o=>o.id);

  const rankCorrect = ranking.every((id,i) => id === correctOrder[i]);

  const px = isMobile ? 14 : isTablet ? 20 : 28;
  const py = isMobile ? 16 : 22;

  const progressPct = submitted ? 100
    : allDone && allDecided ? 80
    : allDone ? 55
    : (doneCount / N) * 40;

  // ── render ──
  return (
    <div className="ha6" style={{
      width:'100%', maxWidth: props.width ?? 920,
      margin:'0 auto', fontFamily:"'Poppins',sans-serif",
      background:'#F8F8FE', borderRadius:24, overflow:'hidden', position:'relative',
      boxShadow:'0 12px 60px rgba(74,77,201,0.13), 0 2px 8px rgba(0,0,0,0.06)',
      border:'1.5px solid #E0E0F4',
    }}>
      <Confetti active={confetti}/>

      {/* ═══════════════ HEADER ═══════════════ */}
      <div style={{
        background:`linear-gradient(135deg, #3730A8 0%, ${T.purple} 55%, #7C3AED 100%)`,
        padding: isMobile ? '18px 18px 16px' : '22px 34px 18px',
        position:'relative', overflow:'hidden',
      }}>
        {/* decorative blobs */}
        <div style={{ position:'absolute', top:-40, right:-25, width:130, height:130, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }}/>
        <div style={{ position:'absolute', bottom:-22, left:60, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }}/>

        <div style={{ position:'relative', zIndex:1 }}>
          {/* Title row */}
          <div style={{
            display:'flex', alignItems:'flex-start', justifyContent:'space-between',
            flexDirection: isMobile ? 'column' : 'row', gap:12,
          }}>
            <div>
              <div style={{ fontSize:isMobile?10:11, fontWeight:700, color:'rgba(255,255,255,0.55)', letterSpacing:'1.2px', textTransform:'uppercase', fontFamily:"'Poppins',sans-serif", marginBottom:4 }}>
                Chapter 6 · Activity 6.5
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:isMobile?28:34, animation:'ha6-float 3s ease-in-out infinite' }}>🔬</span>
                <div>
                  <h2 style={{ margin:0, fontSize:isMobile?19:25, fontWeight:900, color:T.white, fontFamily:"'Poppins',sans-serif", lineHeight:1.15, letterSpacing:'-0.4px' }}>
                    Let's Test Hardness! 💪
                  </h2>
                  <div style={{ fontSize:isMobile?11:12, color:'rgba(255,255,255,0.7)', fontFamily:"'Poppins',sans-serif", marginTop:3 }}>
                    {teacherName} says: <em>"Feel each object and decide — which one is the hardest?"</em>
                  </div>
                </div>
              </div>
            </div>

            {/* Step journey pills */}
            <div style={{ display:'flex', gap:6, flexShrink:0, alignSelf: isMobile ? 'flex-start' : 'center', flexWrap:'wrap' }}>
              {([
                { icon:'👆', text:'Scratch', done: doneCount > 0 },
                { icon:'📋', text:'Record',  done: allDone && allDecided },
                { icon:'🏆', text:'Rank!',   done: submitted },
              ] as const).map((s,i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:5,
                  background: s.done ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.13)',
                  border:`1px solid ${s.done ? 'rgba(134,239,172,0.55)' : 'rgba(255,255,255,0.22)'}`,
                  padding:'5px 11px', borderRadius:14, transition:'all 0.35s ease',
                }}>
                  <span style={{ fontSize:13 }}>{s.done ? '✅' : s.icon}</span>
                  <span style={{ fontSize:11, fontWeight: s.done ? 700 : 500, color:T.white, fontFamily:"'Poppins',sans-serif" }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Object scratch counters */}
          <div style={{ display:'flex', gap:7, marginTop:12, flexWrap:'wrap' }}>
            {objects.map(o => {
              const done = phases[o.id]==='done';
              return (
                <div key={o.id} style={{
                  display:'flex', alignItems:'center', gap:5,
                  background: done ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.11)',
                  border:`1px solid ${done ? 'rgba(134,239,172,0.5)' : 'rgba(255,255,255,0.2)'}`,
                  padding:'4px 11px', borderRadius:12, transition:'all 0.3s ease',
                }}>
                  <span style={{ fontSize:12 }}>{done ? '✅' : '⬜'}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:T.white, fontFamily:"'Poppins',sans-serif" }}>{o.name}</span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop:12, height:8, background:'rgba(255,255,255,0.18)', borderRadius:6, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:6,
              background: submitted
                ? `linear-gradient(90deg,${T.jade},#4ADE80)`
                : `linear-gradient(90deg,${T.amber},${T.orange})`,
              width:`${progressPct}%`,
              transition:'width 0.7s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: progressPct>0 ? '0 0 12px rgba(255,114,18,0.5)' : 'none',
            }}/>
          </div>
        </div>
      </div>

      {/* ═══════════════ BODY ═══════════════ */}
      <div style={{ padding:`${py}px ${px}px ${py+8}px`, display:'flex', flexDirection:'column', gap: isMobile?22:30 }}>

        {/* ── HOW IT WORKS CARD ── */}
        <div style={{
          background:'linear-gradient(135deg,#EEF2FF,#E8E5FF)',
          border:`2px solid ${T.lavender}`,
          borderRadius:18, padding: isMobile ? '14px 16px' : '16px 22px',
          display:'flex', alignItems:'flex-start', gap:14,
          animation: mounted ? 'ha6-up 0.42s ease-out both' : 'none',
        }}>
          <span style={{ fontSize:isMobile?28:36, flexShrink:0, animation:'ha6-bounce 2.5s ease-in-out infinite' }}>📖</span>
          <div>
            <div style={{ fontSize:isMobile?13:15, fontWeight:800, color:T.purple, fontFamily:"'Poppins',sans-serif", marginBottom:6 }}>
              How this activity works:
            </div>
            <div style={{ fontSize:isMobile?11:12, color:'#4C1D95', fontFamily:"'Poppins',sans-serif", lineHeight:1.7 }}>
              <strong>👆 Step 1 — Scratch:</strong> Press the "Scratch" button on each object to see how deep your thumbnail goes in.<br/>
              <strong>📋 Step 2 — Record:</strong> Choose if each object is <em>Hard</em> or <em>Soft</em> and write what you noticed.<br/>
              <strong>🏆 Step 3 — Rank:</strong> Put them in order from softest to hardest, then tell us why!
            </div>
          </div>
        </div>

        {/* ─────────────────────── STEP 1: SCRATCH ─────────────────────── */}
        <section>
          <SectionHeader
            num={1} emoji="👆" title="Scratch Each Object!"
            subtitle="Tap the big button to press a thumbnail into each material and see how soft it is"
            active={true} isMobile={isMobile}
          />

          <div style={{
            display:'grid',
            gridTemplateColumns: isMobile ? '1fr' : `repeat(${N}, 1fr)`,
            gap: isMobile ? 22 : 18,
            animation: mounted ? 'ha6-up 0.45s ease-out 0.08s both' : 'none',
          }}>
            {objects.map((obj,i) => (
              <ObjectCard key={obj.id} obj={obj} phase={phases[obj.id]} onScratch={() => handleScratch(obj.id)} isMobile={isMobile} index={i}/>
            ))}
          </div>

          {/* fun fact */}
          {funFact && (
            <div style={{
              marginTop:16,
              background:'linear-gradient(135deg,#FFFBEB,#FEF3C7)',
              border:`2px solid ${T.amber}44`, borderRadius:14,
              padding:'12px 18px', fontSize:isMobile?12:13, fontWeight:500,
              color:'#78350F', fontFamily:"'Poppins',sans-serif", lineHeight:1.6,
              display:'flex', gap:10, alignItems:'flex-start',
              animation:'ha6-reveal 0.45s ease-out both',
            }}>
              <span style={{ fontSize:22, flexShrink:0 }}>🌟</span>
              {funFact}
            </div>
          )}

          {allDone && (
            <CheerBanner
              emoji="🎉"
              text="Brilliant work! You tested all 3 objects. Now scroll down and fill in the table — tell us what you found! 📋"
              color={T.jadeBg} border={T.jadeBorder}
            />
          )}
        </section>

        {/* ─────────────────────── STEP 2: TABLE ─────────────────────── */}
        <section style={{ opacity: allDone ? 1 : 0.35, transition:'opacity 0.5s ease', pointerEvents: allDone ? 'auto' : 'none' }}>
          <SectionHeader
            num={2} emoji="📋" title="Fill in the Table"
            subtitle="For each object, choose Hard or Soft and write what you noticed"
            active={allDone} isMobile={isMobile}
          />

          <div style={{
            background:T.white, borderRadius:20, overflow:'hidden',
            border:'1.5px solid #E8E8F4',
            boxShadow:'0 4px 22px rgba(74,77,201,0.08)',
            animation: mounted ? 'ha6-up 0.45s ease-out 0.1s both' : 'none',
          }}>
            {/* header */}
            <div style={{
              display:'grid',
              gridTemplateColumns: isMobile ? '90px 1fr 1fr' : '150px 130px 160px 1fr',
              gap:8, padding: isMobile ? '11px 12px' : '13px 22px',
              background:`linear-gradient(135deg,${T.primary}F2,${T.purple}F2)`,
            }}>
              {['Object',...(isMobile?[]:['Material']),'Hard / Soft?','What did you notice?'].map(h => (
                <div key={h} style={{ fontSize:isMobile?10:11, fontWeight:800, color:T.white, fontFamily:"'Poppins',sans-serif", textTransform:'uppercase', letterSpacing:'0.6px' }}>{h}</div>
              ))}
            </div>

            {objects.map((obj,i) => (
              <TableRow
                key={obj.id}
                obj={obj}
                enabled={phases[obj.id]==='done'}
                decision={rows[obj.id].decision}
                note={rows[obj.id].note}
                onDecision={v => updateDecision(obj.id,v)}
                onNote={v => updateNote(obj.id,v)}
                even={i%2===0}
                isMobile={isMobile}
              />
            ))}
          </div>

          {/* mobile note fields */}
          {isMobile && allDone && (
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#6B7280', fontFamily:"'Poppins',sans-serif", textTransform:'uppercase', letterSpacing:'0.6px' }}>Your notes:</div>
              {objects.map(obj => (
                <div key={obj.id}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.charcoal, fontFamily:"'Poppins',sans-serif", marginBottom:3 }}>{obj.emoji} {obj.name}</div>
                  <input
                    value={rows[obj.id].note}
                    onChange={e => updateNote(obj.id, e.target.value)}
                    placeholder="Write what you noticed…"
                    style={{
                      width:'100%', padding:'8px 12px', borderRadius:10, border:`1.5px solid #D1D5DB`,
                      fontSize:12, fontFamily:"'Poppins',sans-serif", color:T.charcoal, background:T.white, outline:'none',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {allDone && allDecided && !submitted && (
            <CheerBanner
              emoji="🌟"
              text="Amazing! Your table is complete. Now let's rank them — which is softest and which is hardest? Scroll down! 👇"
              color='linear-gradient(135deg,#EEF2FF,#E0E7FF)' border={T.lavender}
            />
          )}
        </section>

        {/* ─────────────────────── STEP 3: SYNTHESIS ─────────────────────── */}
        {enableSynthesis && (
          <section style={{ opacity: allDone && allDecided ? 1 : 0.3, transition:'opacity 0.5s ease', pointerEvents: allDone && allDecided ? 'auto' : 'none' }}>
            <SectionHeader
              num={3} emoji="🏆" title="Rank Them! Softest to Hardest"
              subtitle="Use the arrows to put the objects in the right order, then explain why"
              active={allDone && allDecided} isMobile={isMobile}
            />

            <div style={{
              background:'linear-gradient(160deg,#F5F3FF,#EDE9FE)',
              border:`2px solid ${T.lavender}`,
              borderRadius:22, padding: isMobile ? '18px 14px' : '24px 28px',
              display:'flex', flexDirection:'column', gap:18,
              animation: mounted ? 'ha6-up 0.45s ease-out 0.14s both' : 'none',
            }}>
              {/* ranking */}
              <div>
                <div style={{ fontSize:isMobile?12:13, fontWeight:700, color:'#6D28D9', fontFamily:"'Poppins',sans-serif", marginBottom:12 }}>
                  {submitted ? '📊 Your final ranking:' : '↑ ↓ Use the arrows to reorder — put the softest one at the top:'}
                </div>
                {ranking.map((id,idx) => {
                  const obj = objects.find(o => o.id===id)!;
                  return (
                    <RankItem
                      key={id} obj={obj} rank={idx} total={N}
                      submitted={submitted} correct={submitted && id===correctOrder[idx]}
                      onUp={()=>moveUp(idx)} onDown={()=>moveDown(idx)}
                      isMobile={isMobile} animDelay={idx*0.07}
                    />
                  );
                })}
              </div>

              {/* reason */}
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                <label style={{ fontSize:isMobile?12:14, fontWeight:800, color:'#4C1D95', fontFamily:"'Poppins',sans-serif", display:'flex', alignItems:'center', gap:7 }}>
                  ✍️ Now tell us WHY iron is the hardest!
                  <span style={{ fontSize:11, fontWeight:500, color:'#7C3AED' }}>(Write at least 1 sentence)</span>
                </label>
                <textarea
                  disabled={submitted}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder='e.g. "Iron is the hardest because it is a metal and my thumb could not make any dent in it. Sponge is the softest because it has air pockets that squish easily."'
                  rows={isMobile?3:2}
                  style={{
                    width:'100%', padding:'11px 15px', borderRadius:13,
                    border:`2px solid ${reason.trim().length>=15 ? T.jade : T.lavender}`,
                    fontSize:isMobile?12:13, fontFamily:"'Poppins',sans-serif",
                    color:T.charcoal, background: submitted ? '#F9FAFB' : T.white,
                    outline:'none', resize:'vertical', lineHeight:1.6,
                    transition:'border-color 0.25s',
                  }}
                  onFocus={e => { if(!submitted) e.currentTarget.style.borderColor=T.primary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = reason.trim().length>=15 ? T.jade : T.lavender; }}
                />
                <div style={{ fontSize:10, fontWeight:700, fontFamily:"'Poppins',sans-serif", color: reason.trim().length<15 ? '#9CA3AF' : T.jade }}>
                  {reason.trim().length<15 && !submitted ? `${reason.trim().length} / 15 characters — keep going!` : reason.trim().length>=15 && !submitted ? '✓ Good length!' : ''}
                </div>
              </div>

              {/* submit */}
              {!submitted ? (
                <button
                  className="ha6-btn"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    alignSelf:'flex-start',
                    padding: isMobile ? '13px 28px' : '15px 38px',
                    borderRadius:30, border:'none',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    fontSize:isMobile?14:16, fontWeight:800, fontFamily:"'Poppins',sans-serif",
                    background: canSubmit ? `linear-gradient(135deg,${T.jade},#16A34A)` : '#E5E7EB',
                    color: canSubmit ? T.white : '#9CA3AF',
                    display:'flex', alignItems:'center', gap:10,
                    boxShadow: canSubmit ? '0 5px 20px rgba(34,197,94,0.4)' : 'none',
                  }}
                >
                  <span style={{ fontSize:22 }}>🚀</span>
                  {canSubmit ? "Submit My Answers!" : "Fill in everything first!"}
                </button>
              ) : (
                /* RESULT */
                <div style={{
                  background: rankCorrect ? T.jadeBg : '#FFFBEB',
                  border:`2.5px solid ${rankCorrect ? T.jadeBorder : T.amber}`,
                  borderRadius:20, padding: isMobile ? '18px 16px' : '24px 26px',
                  animation:'ha6-reveal 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
                }}>
                  <div style={{
                    display:'flex', alignItems:'center', gap:14,
                    marginBottom:16, flexDirection: isMobile ? 'column' : 'row',
                    textAlign: isMobile ? 'center' : 'left',
                  }}>
                    <span style={{ fontSize:isMobile?46:58, animation:'ha6-starSpin 1.3s ease-out 0.2s both', display:'block' }}>
                      {rankCorrect ? '🏆' : '⭐'}
                    </span>
                    <div>
                      <div style={{ fontSize:isMobile?18:23, fontWeight:900, color: rankCorrect ? '#166534' : '#92400E', fontFamily:"'Poppins',sans-serif" }}>
                        {rankCorrect ? 'Perfect! You got it exactly right! 🎉' : 'Great try! See the correct order below 👇'}
                      </div>
                      <div style={{ fontSize:isMobile?12:13, color: rankCorrect ? '#166534' : '#78350F', fontFamily:"'Poppins',sans-serif", marginTop:5, lineHeight:1.5 }}>
                        Correct order: <strong>Sponge</strong> (softest) → <strong>Rubber Eraser</strong> → <strong>Iron Nail</strong> (hardest)
                      </div>
                    </div>
                  </div>

                  {/* key concept */}
                  <div style={{
                    background: rankCorrect ? '#F0FFF4' : '#FFFBEB',
                    borderRadius:14, padding:'14px 18px', marginBottom:14,
                    border:`1.5px solid ${rankCorrect ? T.jadeBorder : T.amber}55`,
                  }}>
                    <div style={{ fontSize:isMobile?12:13, fontWeight:800, color: rankCorrect ? '#166534' : '#92400E', fontFamily:"'Poppins',sans-serif", marginBottom:5 }}>
                      🧠 What you just learned:
                    </div>
                    <div style={{ fontSize:isMobile?12:13, color: rankCorrect ? '#166534' : '#78350F', fontFamily:"'Poppins',sans-serif", lineHeight:1.65 }}>
                      <strong>Hardness is relative!</strong> Rubber is harder than sponge, but softer than iron.
                      Materials that are difficult to compress or scratch are called <strong>hard</strong>.
                      Materials that compress easily are called <strong>soft</strong>. 📖
                    </div>
                  </div>

                  <div style={{ fontSize:isMobile?11:12, color:'#6B7280', fontFamily:"'Poppins',sans-serif", fontStyle:'italic' }}>
                    📝 Your answer: <span style={{ fontStyle:'normal', fontWeight:600, color:T.charcoal }}>"{reason}"</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── TEXTBOOK LINK ── */}
        <div style={{
          background:'linear-gradient(135deg,#F8F4FF,#EEF2FF)',
          border:`1.5px solid ${T.lavender}55`,
          borderRadius:16, padding: isMobile ? '12px 16px' : '15px 22px',
          display:'flex', gap:12, alignItems:'flex-start',
          animation: mounted ? 'ha6-up 0.4s ease-out 0.2s both' : 'none',
        }}>
          <span style={{ fontSize:24, flexShrink:0 }}>📚</span>
          <div style={{ fontSize:isMobile?11:12, color:'#4C1D95', fontFamily:"'Poppins',sans-serif", lineHeight:1.65 }}>
            <strong>Your textbook says (page 107):</strong> <em>"Materials which can be compressed or scratched easily are soft, while other materials which are difficult to compress or scratch are hard. However, these properties are relative in nature. For example, rubber is harder than sponge but softer than iron."</em>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HardnessActivityRecorder;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════