/**
 * Tool: M1.S2.T3.C9.2D1 — "Fill the tumbler"
 * CBSE Grade 6 Science · Materials Around Us · beat: Apply · concept: M1.S2.T3.C9
 *
 * CONCEPT PRESERVED: liquids take the shape of their container. A jug pours water into a chosen
 * container; the water rises and fills the EXACT silhouette of that container (cup, can, bottle, pot)
 * — visually proving a liquid has no shape of its own and takes the shape of whatever holds it.
 * Containers that cannot hold water (cloth bag, paper cone) leak — preserving the original answer key.
 *
 * Brought fully up to 2D_TOOL_AUTHORING_PROMPT:
 *  - Single-file, self-contained. Only runtime dep is global React (renderer strips imports; NO lucide,
 *    NO framer-motion). All motion is CSS @keyframes / transitions / requestAnimationFrame.
 *  - §3 Agent-control contract: window.parent postMessage bus + window.__TOOL__. emit {type:'ready'},
 *    handle {type:'command', id, method, args} → api → {type:'response', id, result}. Verbs:
 *    setParam, play, pause, reset, highlight(target), getState, setOperatorMode(mode), AND the
 *    tool-specific "do" verb pour(id | id[]) (aliases select/fill) — accepts a single id OR an array so
 *    the agent can fill several tumblers at once. Every verb yields the same visible result as the
 *    student and emits {type:'event', name, detail}.
 *  - §6.1 operatorMode 'ai' | 'student' (default student). In 'ai' the student tray/action bar is hidden
 *    and taps are inert (agent drives), but the POURING PHENOMENON + read-out stay visible; "watch"
 *    caption + 👩‍🏫 chip. Emits operator_mode_changed, reflected in getState().
 *  - §7.3 Web Audio cues (pour/correct/wrong/done), gesture-gated, never autoplaying; mute toggle.
 *  - §7 premium visuals: layered cards, gradients, soft shadows, Poppins type scale, themeColor palette,
 *    light+dark, staggered entrance, richly animated pour/fill (RAF water rise + CSS jug tilt + stream),
 *    count-up score, confetti celebration, an idle/reactive mascot droplet, big tap targets,
 *    prefers-reduced-motion respected, every control styled (no raw HTML controls).
 */
const { useState, useEffect, useRef, useMemo, useCallback } = React; // React/ReactDOM are renderer globals

const TOOL_ID = 'M1.S2.T3.C9.2D1';

/* ───────── Brand tokens ───────── */
const THEME = {
  font: "'Poppins','Segoe UI',system-ui,-apple-system,sans-serif",
  primary: '#4A4DC9', accent: '#FF7212', deep: '#533086',
  lavender: '#C1C1EA', cream: '#FFF3E4',
  green: '#16a34a', greenSoft: '#DCFCE7', greenText: '#14532D',
  red: '#dc2626', redSoft: '#FEE2E2', redText: '#7F1D1D',
  dark: '#4E4E4E', mid: '#CACACA', light: '#EBEBEB', bg: '#F5F5F5', white: '#FFFFFF',
  pill: 999, touch: 44, card: 24,
};

/* ───────── Types & data (answer key preserved from the original tool) ───────── */
type ShapeType = 'cup' | 'can' | 'bottle' | 'pot' | 'bag' | 'cone';
interface MaterialDef {
  id: string; name: string; color: string; accentColor: string;
  holdsWater: boolean; reason: string; property: string; shape: ShapeType;
}
const MATERIALS: MaterialDef[] = [
  { id: 'glass',   name: 'Glass Cup',      color: '#D4F1FF', accentColor: '#0284C7', holdsWater: true,  reason: 'Hard, smooth and non-absorbent — the water settles and takes the shape of the cup.',          property: 'Non-absorbent',    shape: 'cup'    },
  { id: 'steel',   name: 'Steel Can',      color: '#E2E8F0', accentColor: '#475569', holdsWater: true,  reason: 'Solid metal walls with no gaps — water fills the can and takes its straight-sided shape.',     property: 'Impermeable metal', shape: 'can'    },
  { id: 'plastic', name: 'Plastic Bottle', color: '#FEF9C3', accentColor: '#A16207', holdsWater: true,  reason: 'Waterproof walls — the water takes the bottle’s curved shape and stays inside.',           property: 'Waterproof',        shape: 'bottle' },
  { id: 'clay',    name: 'Clay Pot',       color: '#FFEDD5', accentColor: '#B45309', holdsWater: true,  reason: 'A baked, sealed vessel — water fills the round pot and takes its rounded shape.',               property: 'Hard and sealed',   shape: 'pot'    },
  { id: 'cloth',   name: 'Cloth Bag',      color: '#FEE2E2', accentColor: '#B91C1C', holdsWater: false, reason: 'Cloth fibres absorb water and let it seep through — it cannot keep a water shape.',             property: 'Absorbent',         shape: 'bag'    },
  { id: 'paper',   name: 'Paper Cone',     color: '#FFFBEB', accentColor: '#92400E', holdsWater: false, reason: 'Paper softens when wet — water soaks through and tears it apart.',                               property: 'Weakens when wet',  shape: 'cone'   },
];
const MAT_BY_ID: Record<string, MaterialDef> = Object.fromEntries(MATERIALS.map(m => [m.id, m]));
const TOTAL = MATERIALS.length;

/* ───────── reduced-motion ───────── */
function usePrefersReducedMotion(): boolean {
  const [rm, setRm] = useState(false);
  useEffect(() => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); const on = () => setRm(m.matches); on(); m.addEventListener?.('change', on); return () => m.removeEventListener?.('change', on); }, []);
  return rm;
}

/* ───────── §7.3 Web Audio cues — lazy, gesture-gated, mutable ───────── */
function useSound(initialMuted: boolean) {
  const ctxRef = useRef<any>(null);
  const mutedRef = useRef<boolean>(!!initialMuted);
  const [muted, setMutedState] = useState<boolean>(!!initialMuted);
  const setMuted = useCallback((v: boolean) => { mutedRef.current = !!v; setMutedState(!!v); }, []);
  const ctx = () => {
    if (mutedRef.current) return null;
    try {
      if (!ctxRef.current) { const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return null; ctxRef.current = new AC(); }
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume?.();
      return ctxRef.current;
    } catch (e) { return null; }
  };
  const tone = (ac: any, freq: number, t0: number, dur: number, type: OscillatorType, peak: number) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  };
  // a gentle glug that rises in pitch — like water filling up
  const glug = (ac: any, t0: number) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(180, t0); o.frequency.exponentialRampToValueAtTime(420, t0 + 0.9);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 1.05);
  };
  const playCue = useCallback((kind: 'pour' | 'correct' | 'wrong' | 'done' | 'tap') => {
    const ac = ctx(); if (!ac) return; const n = ac.currentTime;
    if (kind === 'tap') { tone(ac, 420, n, 0.09, 'triangle', 0.16); }
    else if (kind === 'pour') { glug(ac, n); }
    else if (kind === 'correct') { tone(ac, 660, n, 0.12, 'sine', 0.2); tone(ac, 880, n + 0.09, 0.16, 'sine', 0.2); }
    else if (kind === 'wrong') { tone(ac, 200, n, 0.2, 'sine', 0.18); tone(ac, 150, n + 0.12, 0.2, 'sine', 0.16); }
    else if (kind === 'done') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, n + i * 0.1, 0.22, 'triangle', 0.2)); }
  }, []);
  return { playCue, muted, setMuted };
}

/* ───────── styled pill button (no raw controls) ───────── */
interface PillProps { variant?: 'contained' | 'outlined' | 'accent' | 'ghost'; disabled?: boolean; onClick?: () => void; children: React.ReactNode; title?: string; small?: boolean; }
const PillButton: React.FC<PillProps> = ({ variant = 'contained', disabled, onClick, children, title, small }) => {
  const [h, setH] = useState(false), [p, setP] = useState(false);
  const base: React.CSSProperties = { fontFamily: THEME.font, fontWeight: 600, fontSize: small ? 13 : 15, borderRadius: THEME.pill, padding: small ? '8px 16px' : '11px 22px', minHeight: small ? 36 : THEME.touch, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .18s ease', border: '2px solid transparent', display: 'inline-flex', alignItems: 'center', gap: 7, lineHeight: 1 };
  let skin: React.CSSProperties;
  if (disabled) skin = { background: THEME.mid, color: '#fff' };
  else if (variant === 'accent') skin = { background: p ? '#d85e08' : THEME.accent, color: '#fff', transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(255,114,18,.32)' : 'none' };
  else if (variant === 'outlined') skin = { background: h ? THEME.lavender : 'transparent', color: h ? THEME.deep : THEME.primary, borderColor: THEME.primary };
  else if (variant === 'ghost') skin = { background: h ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.08)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' };
  else skin = { background: p ? THEME.deep : h ? THEME.lavender : `linear-gradient(135deg,${THEME.primary},#7C3AED)`, color: (p || !h) ? '#fff' : THEME.deep, transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(74,77,201,.28)' : '0 4px 14px rgba(74,77,201,.22)' };
  return <button type="button" title={title} disabled={disabled} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} style={{ ...base, ...skin }}>{children}</button>;
};

/* ════════════ SVG containers — water rises (RAF state) to take the container's exact shape ════════════ */
function GlassCupSVG({ water, glow, shake }: { water: number; glow: boolean; shake: boolean }) {
  const fillH = water * 0.72, fillY = 88 - fillH;
  return (
    <g style={{ animation: glow ? 'm_glow 1.5s ease-in-out 3' : shake ? 'm_shake .6s ease-in-out 2' : 'none' }}>
      <defs>
        <linearGradient id="g-glass" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="rgba(186,230,253,0.45)"/><stop offset="50%" stopColor="rgba(224,242,254,0.72)"/><stop offset="100%" stopColor="rgba(186,230,253,0.4)"/></linearGradient>
        <clipPath id="g-clip"><path d="M24,10 L30,88 Q50,94 70,88 L76,10 Z"/></clipPath>
      </defs>
      <path d="M23,10 L29,89 Q50,95 71,89 L77,10 Z" fill="url(#g-glass)" stroke="#38BDF8" strokeWidth="2.5"/>
      {water > 0 && (<g clipPath="url(#g-clip)"><rect x="24" y={fillY} width="52" height={fillH + 4} fill="rgba(56,189,248,0.62)"/><path d={`M24,${fillY} Q37,${fillY-3} 50,${fillY} Q63,${fillY+3} 72,${fillY}`} fill="rgba(186,230,253,0.5)"/></g>)}
      <path d="M23,10 Q50,4 77,10" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M32,16 L30,72" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="50" cy="90" rx="21" ry="4.5" fill="rgba(125,211,252,0.3)" stroke="#38BDF8" strokeWidth="1.5"/>
    </g>
  );
}
function SteelCanSVG({ water, glow, shake }: { water: number; glow: boolean; shake: boolean }) {
  const fillH = water * 0.64, fillY = 85 - fillH;
  return (
    <g style={{ animation: glow ? 'm_glow 1.5s ease-in-out 3' : shake ? 'm_shake .6s ease-in-out 2' : 'none' }}>
      <defs>
        <linearGradient id="s-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#94A3B8"/><stop offset="30%" stopColor="#E2E8F0"/><stop offset="62%" stopColor="#CBD5E1"/><stop offset="100%" stopColor="#8090A8"/></linearGradient>
        <clipPath id="s-clip"><rect x="23" y="20" width="54" height="64"/></clipPath>
      </defs>
      <rect x="22" y="19" width="56" height="66" rx="6" fill="url(#s-grad)" stroke="#64748B" strokeWidth="2"/>
      {water > 0 && (<g clipPath="url(#s-clip)"><rect x="23" y={fillY} width="54" height={fillH + 4} fill="rgba(56,189,248,0.55)"/><path d={`M23,${fillY} Q36,${fillY-2} 50,${fillY} Q63,${fillY+2} 77,${fillY}`} fill="rgba(186,230,253,0.45)"/></g>)}
      <ellipse cx="50" cy="19" rx="28" ry="6" fill="#CBD5E1" stroke="#64748B" strokeWidth="2"/>
      <ellipse cx="50" cy="85" rx="28" ry="5.5" fill="#94A3B8" stroke="#475569" strokeWidth="1.5"/>
      <rect x="29" y="22" width="7" height="54" rx="3.5" fill="rgba(255,255,255,0.2)"/>
    </g>
  );
}
function PlasticBottleSVG({ water, glow, shake }: { water: number; glow: boolean; shake: boolean }) {
  const fillH = water * 0.67, fillY = 89 - fillH;
  return (
    <g style={{ animation: glow ? 'm_glow 1.5s ease-in-out 3' : shake ? 'm_shake .6s ease-in-out 2' : 'none' }}>
      <defs>
        <linearGradient id="p-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="rgba(253,224,71,0.6)"/><stop offset="50%" stopColor="rgba(254,249,195,0.88)"/><stop offset="100%" stopColor="rgba(253,224,71,0.55)"/></linearGradient>
        <clipPath id="p-clip"><path d="M37,22 Q50,16 63,22 L67,30 L71,89 Q50,95 29,89 L33,30 Z"/></clipPath>
      </defs>
      <rect x="41" y="6" width="18" height="14" rx="4" fill="rgba(253,224,71,0.9)" stroke="#A16207" strokeWidth="2"/>
      <rect x="39" y="14" width="22" height="7" rx="2.5" fill="#A16207"/>
      <path d="M37,22 Q50,16 63,22 L67,30 L71,89 Q50,95 29,89 L33,30 Z" fill="url(#p-grad)" stroke="#A16207" strokeWidth="2"/>
      {water > 0 && (<g clipPath="url(#p-clip)"><rect x="29" y={fillY} width="42" height={fillH + 4} fill="rgba(56,189,248,0.55)"/><path d={`M29,${fillY} Q40,${fillY-2.5} 50,${fillY} Q60,${fillY+2.5} 71,${fillY}`} fill="rgba(186,230,253,0.45)"/></g>)}
      <path d="M38,25 Q37,54 38,84" stroke="rgba(255,255,255,0.6)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
    </g>
  );
}
function ClayPotSVG({ water, glow, shake }: { water: number; glow: boolean; shake: boolean }) {
  const fillH = water * 0.66, fillY = 90 - fillH;
  return (
    <g style={{ animation: glow ? 'm_glow 1.5s ease-in-out 3' : shake ? 'm_shake .6s ease-in-out 2' : 'none' }}>
      <defs>
        <radialGradient id="c-grad" cx="38%" cy="35%"><stop offset="0%" stopColor="#F4A460"/><stop offset="55%" stopColor="#CD853F"/><stop offset="100%" stopColor="#8B4513"/></radialGradient>
        <clipPath id="c-clip"><path d="M37,24 Q17,34 17,60 Q17,88 50,91 Q83,88 83,60 Q83,34 63,24 Z"/></clipPath>
      </defs>
      <ellipse cx="50" cy="24" rx="17" ry="7.5" fill="#B45309" stroke="#7C2D12" strokeWidth="2"/>
      <path d="M37,24 Q17,34 17,60 Q17,88 50,91 Q83,88 83,60 Q83,34 63,24 Z" fill="url(#c-grad)" stroke="#7C2D12" strokeWidth="2"/>
      {water > 0 && (<g clipPath="url(#c-clip)"><rect x="17" y={fillY} width="66" height={fillH + 4} fill="rgba(56,189,248,0.55)"/><path d={`M17,${fillY} Q33,${fillY-3} 50,${fillY} Q67,${fillY+3} 83,${fillY}`} fill="rgba(186,230,253,0.45)"/></g>)}
      <path d="M30,30 Q28,52 30,73" stroke="rgba(255,255,255,0.25)" strokeWidth="5" strokeLinecap="round" fill="none"/>
    </g>
  );
}
function ClothBagSVG({ leaking, shake }: { leaking: boolean; shake: boolean }) {
  return (
    <g style={{ animation: shake ? 'm_shake .6s ease-in-out 2' : 'none' }}>
      <defs><radialGradient id="b-grad" cx="50%" cy="36%"><stop offset="0%" stopColor="#FDBA74"/><stop offset="100%" stopColor="#C2410C"/></radialGradient></defs>
      <path d="M34,28 Q27,10 36,6 Q45,2 44,22" fill="none" stroke="#9A3412" strokeWidth="4.5" strokeLinecap="round"/>
      <path d="M66,28 Q73,10 64,6 Q55,2 56,22" fill="none" stroke="#9A3412" strokeWidth="4.5" strokeLinecap="round"/>
      <path d="M20,28 Q17,58 21,80 Q33,96 50,96 Q67,96 79,80 Q83,58 80,28 Z" fill="url(#b-grad)" stroke="#9A3412" strokeWidth="2.5"/>
      {[29,36,43,50,57,64,71].map((x, i) => (<line key={i} x1={x} y1="30" x2={x - 2} y2="88" stroke="rgba(154,52,18,0.2)" strokeWidth="1.2"/>))}
      {leaking && (<path d="M22,32 Q50,28 78,32 L76,86 Q62,95 50,95 Q38,95 24,86 Z" fill="rgba(56,189,248,0.2)" style={{ animation: 'm_wet .7s ease-out forwards' }}/>)}
      {leaking && [30,38,46,50,54,62,70].map((x, i) => (<ellipse key={i} cx={x} cy={89} rx="2.5" ry="4.5" fill="rgba(56,189,248,0.85)" style={{ animation: `m_leak ${0.55 + i * 0.09}s ease-in ${i * 0.14}s infinite` }}/>))}
    </g>
  );
}
function PaperConeSVG({ leaking, shake }: { leaking: boolean; shake: boolean }) {
  return (
    <g style={{ animation: shake ? 'm_shake .6s ease-in-out 2' : 'none' }}>
      <defs><linearGradient id="pc-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FEFCE8"/><stop offset="100%" stopColor="#FDE68A"/></linearGradient></defs>
      <path d="M13,14 Q50,8 87,14 L59,90 Q50,97 41,90 Z" fill="url(#pc-grad)" stroke="#92400E" strokeWidth="2.5"/>
      <path d="M13,14 L41,90" stroke="rgba(146,64,14,0.22)" strokeWidth="1.5" fill="none"/>
      <path d="M87,14 L59,90" stroke="rgba(146,64,14,0.22)" strokeWidth="1.5" fill="none"/>
      {leaking && (<path d="M27,38 Q50,34 73,38 L64,88 Q50,95 36,88 Z" fill="rgba(56,189,248,0.2)" style={{ animation: 'm_wet .7s ease-out forwards' }}/>)}
      {leaking && (<ellipse cx="50" cy="95" rx="3.5" ry="5.5" fill="rgba(56,189,248,0.9)" style={{ animation: 'm_leak 1s ease-in infinite' }}/>)}
    </g>
  );
}
function ContainerSVG({ material, water, glow, shake }: { material: MaterialDef; water: number; glow: boolean; shake: boolean }) {
  switch (material.shape) {
    case 'cup':    return <GlassCupSVG water={water} glow={glow} shake={shake}/>;
    case 'can':    return <SteelCanSVG water={water} glow={glow} shake={shake}/>;
    case 'bottle': return <PlasticBottleSVG water={water} glow={glow} shake={shake}/>;
    case 'pot':    return <ClayPotSVG water={water} glow={glow} shake={shake}/>;
    case 'bag':    return <ClothBagSVG leaking={shake} shake={shake}/>;
    case 'cone':   return <PaperConeSVG leaking={shake} shake={shake}/>;
    default:       return <GlassCupSVG water={water} glow={glow} shake={shake}/>;
  }
}

/* tray icon */
function TileIcon({ shape, color, accent, sz = 48 }: { shape: ShapeType; color: string; accent: string; sz?: number }) {
  const p = { width: sz, height: sz, viewBox: '0 0 100 100' };
  switch (shape) {
    case 'cup': return <svg {...p}><path d="M22,10 L28,88 Q50,95 72,88 L78,10 Z" fill={color} stroke={accent} strokeWidth="4"/><ellipse cx="50" cy="89" rx="22" ry="5" fill={color} stroke={accent} strokeWidth="2.5"/><path d="M33,17 L31,70" stroke="rgba(255,255,255,0.65)" strokeWidth="4" strokeLinecap="round"/></svg>;
    case 'can': return <svg {...p}><rect x="22" y="17" width="56" height="68" rx="7" fill={color} stroke={accent} strokeWidth="4"/><ellipse cx="50" cy="17" rx="28" ry="7" fill={color} stroke={accent} strokeWidth="3"/><ellipse cx="50" cy="85" rx="28" ry="7" fill={color} stroke={accent} strokeWidth="2.5"/></svg>;
    case 'bottle': return <svg {...p}><rect x="41" y="5" width="18" height="14" rx="4" fill={accent}/><path d="M36,18 Q50,12 64,18 L68,28 L72,88 Q50,94 28,88 L32,28 Z" fill={color} stroke={accent} strokeWidth="3.5"/><path d="M38,22 Q37,55 38,83" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeLinecap="round" fill="none"/></svg>;
    case 'pot': return <svg {...p}><path d="M37,22 Q18,32 18,60 Q18,88 50,91 Q82,88 82,60 Q82,32 63,22 Z" fill={color} stroke={accent} strokeWidth="3.5"/><ellipse cx="50" cy="22" rx="16" ry="6" fill={accent}/></svg>;
    case 'bag': return <svg {...p}><path d="M34,26 Q27,10 36,6 Q45,2 44,20" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round"/><path d="M66,26 Q73,10 64,6 Q55,2 56,20" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round"/><path d="M20,26 Q17,58 21,80 Q33,96 50,96 Q67,96 79,80 Q83,58 80,26 Z" fill={color} stroke={accent} strokeWidth="3.5"/></svg>;
    case 'cone': return <svg {...p}><path d="M13,14 Q50,8 87,14 L59,90 Q50,97 41,90 Z" fill={color} stroke={accent} strokeWidth="3.5"/><path d="M16,28 Q50,24 84,28" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.45"/></svg>;
  }
}

/* ───────── Water jug (CSS tilt) ───────── */
function WaterJugSVG({ pouring }: { pouring: boolean }) {
  return (
    <svg viewBox="0 0 130 130" width={120} height={120} style={{ transformOrigin: '90.8% 90.8%', animation: pouring ? 'm_jugTilt 2.6s cubic-bezier(0.4,0,0.2,1) forwards' : 'none', filter: 'drop-shadow(0 6px 18px rgba(14,165,233,0.38))', display: 'block' }}>
      <defs>
        <linearGradient id="jug-body" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#BAE6FD"/><stop offset="50%" stopColor="#7DD3FC"/><stop offset="100%" stopColor="#0EA5E9"/></linearGradient>
        <linearGradient id="jug-water" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="rgba(147,210,250,0.5)"/><stop offset="100%" stopColor="rgba(37,99,235,0.75)"/></linearGradient>
        <clipPath id="jug-body-clip"><path d="M16,36 L16,106 Q16,120 30,120 L88,120 Q102,120 102,106 L102,36 Z"/></clipPath>
      </defs>
      <path d="M92,44 Q122,44 122,74 Q122,104 92,104" fill="none" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round"/>
      <path d="M18,24 Q14,28 14,36 L14,106 Q14,120 30,120 L88,120 Q102,120 102,106 L102,36 Q102,28 98,24 Z" fill="url(#jug-body)" stroke="#0EA5E9" strokeWidth="2.5"/>
      <rect x="15" y="60" width="87" height="60" fill="url(#jug-water)" clipPath="url(#jug-body-clip)"/>
      <path d="M14,24 Q14,12 24,10 L94,10 Q104,10 102,24" fill="#7DD3FC" stroke="#0EA5E9" strokeWidth="2.5"/>
      <path d="M8,10 Q14,4 24,6 L24,14 Q16,12 12,18 Z" fill="#38BDF8" stroke="#0EA5E9" strokeWidth="2"/>
      <path d="M26,26 Q24,64 26,104" stroke="rgba(255,255,255,0.5)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

/* ───────── water stream ───────── */
function WaterStream({ active, len }: { active: boolean; len: number }) {
  if (!active) return null;
  return (
    <svg viewBox={`0 0 28 ${len}`} width={28} height={len} style={{ position: 'absolute', left: 148, top: 118, zIndex: 6, pointerEvents: 'none', animation: 'm_streamIn 2.4s ease-in-out forwards' }}>
      <path d={`M14,0 Q13,${len*0.4} 13,${len*0.7} Q13,${len*0.88} 14,${len}`} stroke="rgba(56,189,248,0.82)" strokeWidth="7" fill="none" strokeLinecap="round"/>
      <path d={`M14,0 Q13.5,${len*0.4} 13.5,${len*0.7} Q13.5,${len*0.88} 14,${len}`} stroke="rgba(186,230,253,0.7)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      {[10,14,18,8,20,13,16].map((x, i) => (<ellipse key={i} cx={x} cy={len - 8} rx="2.5" ry="3.8" fill="rgba(56,189,248,0.75)" style={{ animation: `m_drop .5s ease-in ${i * 0.065}s infinite` }}/>))}
    </svg>
  );
}

/* ───────── mascot droplet (idle + reactive) ───────── */
function Mascot({ mood, reduced }: { mood: 'idle' | 'happy' | 'sad'; reduced: boolean }) {
  const anim = reduced ? 'none' : mood === 'happy' ? 'm_bounce .5s ease 2' : mood === 'sad' ? 'm_shake .5s ease 1' : 'm_float 2.8s ease-in-out infinite';
  const eyeY = mood === 'sad' ? 50 : 47;
  return (
    <svg viewBox="0 0 60 70" width={46} height={54} style={{ animation: anim, overflow: 'visible' }} aria-hidden="true">
      <defs><radialGradient id="droplet" cx="40%" cy="32%"><stop offset="0%" stopColor="#BAE6FD"/><stop offset="100%" stopColor="#0EA5E9"/></radialGradient></defs>
      <path d="M30,4 C44,28 54,40 54,50 A24,24 0 0 1 6,50 C6,40 16,28 30,4 Z" fill="url(#droplet)" stroke="#0284C7" strokeWidth="2"/>
      <ellipse cx="22" cy="22" rx="7" ry="10" fill="rgba(255,255,255,0.5)"/>
      <circle cx="23" cy={eyeY} r="3.4" fill="#0c2a4d"/><circle cx="37" cy={eyeY} r="3.4" fill="#0c2a4d"/>
      <circle cx="24" cy={eyeY - 1} r="1.1" fill="#fff"/><circle cx="38" cy={eyeY - 1} r="1.1" fill="#fff"/>
      {mood === 'happy'
        ? <path d="M22,57 Q30,64 38,57" fill="none" stroke="#0c2a4d" strokeWidth="2.4" strokeLinecap="round"/>
        : mood === 'sad'
        ? <path d="M23,61 Q30,56 37,61" fill="none" stroke="#0c2a4d" strokeWidth="2.4" strokeLinecap="round"/>
        : <path d="M24,58 Q30,61 36,58" fill="none" stroke="#0c2a4d" strokeWidth="2.4" strokeLinecap="round"/>}
    </svg>
  );
}

/* ───────── error boundary ───────── */
class Boundary extends React.Component<{ children: React.ReactNode }, { err: boolean }> {
  constructor(p: any) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() { if (this.state.err) return <div role="alert" style={{ fontFamily: THEME.font, padding: 24, background: THEME.cream, borderRadius: 16, color: THEME.deep }}>Something went wrong loading this activity. Please reload.</div>; return this.props.children as any; }
}

interface ToolProps {
  props?: { width?: number; height?: number; themeColor?: string; darkMode?: boolean; operatorMode?: 'ai' | 'student'; muted?: boolean; animationSpeed?: number; additionalProps?: Record<string, any> };
  setStepDetails?: (d: any) => void;
}

const STREAM_LEN = 170;

const FillTheTumbler: React.FC<ToolProps> = ({ props = {}, setStepDetails }) => {
  const reduced = usePrefersReducedMotion();
  const themeColor = props.themeColor || THEME.primary;
  const darkMode = !!props.darkMode;
  const ap = props.additionalProps || {};
  const primaryColor = ap.primaryColor || themeColor;
  const secondaryColor = ap.secondaryColor || THEME.accent;
  const instructionText = ap.instructionText || 'Pour water into each tumbler and watch the water take the shape of its container!';
  const successMessage = ap.successMessage || 'Brilliant! You filled every tumbler!';
  const spd = props.animationSpeed || 1;

  /* state */
  const [tested, setTested] = useState<Record<string, MaterialDef>>({});
  const [item, setItem] = useState<MaterialDef | null>(null);
  const [phase, setPhase] = useState<'idle' | 'pouring' | 'result_ok' | 'result_fail'>('idle');
  const [water, setWater] = useState(0);
  const [party, setParty] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState(instructionText);
  const [scoreShown, setScoreShown] = useState(0);

  const raf = useRef(0);
  const busy = useRef(false);
  const timers = useRef<any[]>([]);
  const queue = useRef<string[]>([]);

  /* responsive stage scale (fixed 340-wide internal layout) */
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [stageScale, setStageScale] = useState(1);
  useEffect(() => {
    const measure = () => { const w = stageWrapRef.current?.clientWidth; if (w) setStageScale(Math.min(w / 340, 1.06)); };
    measure(); window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /* §6.1 operator mode */
  const initialMode: 'ai' | 'student' = props.operatorMode === 'ai' ? 'ai' : 'student';
  const [mode, setMode] = useState<'ai' | 'student'>(initialMode);
  const modeRef = useRef(mode); modeRef.current = mode;
  const isAI = mode === 'ai';

  /* §7.3 sound */
  const { playCue, muted, setMuted } = useSound(!!props.muted);

  const testedRef = useRef(tested); testedRef.current = tested;
  const phaseRef = useRef(phase); phaseRef.current = phase;

  const suitable = useMemo(() => Object.values(tested).filter(m => m.holdsWater), [tested]);
  const unsuitable = useMemo(() => Object.values(tested).filter(m => !m.holdsWater), [tested]);
  const doneCount = Object.keys(tested).length;
  const progress = (doneCount / TOTAL) * 100;
  const lastTested = (Object.values(tested) as MaterialDef[])[doneCount - 1] ?? null;

  /* count-up score = number of correct "holds water" predictions revealed */
  useEffect(() => {
    const target = suitable.length;
    if (reduced) { setScoreShown(target); return; }
    let r = 0; const step = () => { setScoreShown(p => { if (p < target) { r = requestAnimationFrame(step); return p + 1; } return p; }); };
    r = requestAnimationFrame(step); return () => cancelAnimationFrame(r);
  }, [suitable.length, reduced]);

  const buildState = useCallback(() => ({
    tested: Object.keys(testedRef.current),
    holdsWater: Object.values(testedRef.current).filter(m => m.holdsWater).map(m => m.id),
    leaks: Object.values(testedRef.current).filter(m => !m.holdsWater).map(m => m.id),
    total: TOTAL, done: Object.keys(testedRef.current).length,
    finished: Object.keys(testedRef.current).length >= TOTAL,
    phase: phaseRef.current, operatorMode: modeRef.current,
  }), []);

  const emit = useCallback((msg: any) => { try { window.parent.postMessage(msg, '*'); } catch (e) {} }, []);
  const pushState = useCallback(() => { const s = buildState(); emit({ type: 'state', state: s }); setStepDetails?.({ beat: 'Apply', stepIndex: s.done, totalSteps: TOTAL, state: s }); }, [buildState, emit, setStepDetails]);

  const clearTimers = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);
  const later = useCallback((fn: () => void, ms: number) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; }, []);

  const runTestRef = useRef<(id: string) => void>(() => {});
  const drainQueue = useCallback(() => {
    if (busy.current) return;
    const next = queue.current.shift();
    if (next) runTestRef.current(next);
  }, []);

  const runTest = useCallback((rawId: string) => {
    const mat = MAT_BY_ID[rawId] || MATERIALS.find(m => m.name.toLowerCase() === String(rawId).toLowerCase());
    if (!mat) return;
    if (busy.current || testedRef.current[mat.id]) { if (testedRef.current[mat.id]) setAnnounce(`${mat.name} is already filled.`); return; }
    busy.current = true;
    cancelAnimationFrame(raf.current);
    setItem(mat); setPhase('pouring'); setWater(0); setHighlightId(null);
    setAnnounce(`Pouring water into the ${mat.name}…`);
    playCue('pour');
    emit({ type: 'event', name: 'pour_started', detail: { id: mat.id } });

    if (mat.holdsWater && !reduced) {
      let t0: number | null = null; const duration = 1600 / spd;
      const rise = (ts: number) => { if (t0 == null) t0 = ts; const p = Math.min((ts - t0) / duration, 1); const eased = 1 - Math.pow(1 - p, 3); setWater(Math.round(eased * 70)); if (p < 1) raf.current = requestAnimationFrame(rise); };
      later(() => { raf.current = requestAnimationFrame(rise); }, 420 / spd);
    } else if (mat.holdsWater) { setWater(70); }

    const okMs = reduced ? 200 : 2000 / spd;
    later(() => { const fin = mat.holdsWater ? 'result_ok' : 'result_fail'; setPhase(fin); playCue(mat.holdsWater ? 'correct' : 'wrong'); setAnnounce(`${mat.name}: ${mat.reason}`); emit({ type: 'event', name: mat.holdsWater ? 'answer_correct' : 'answer_incorrect', detail: { id: mat.id, holdsWater: mat.holdsWater } }); }, okMs);
    later(() => {
      const nt = { ...testedRef.current, [mat.id]: mat }; testedRef.current = nt; setTested(nt);
      emit({ type: 'event', name: 'item_placed', detail: { id: mat.id, done: Object.keys(nt).length } });
      pushState();
      if (Object.keys(nt).length >= TOTAL) { later(() => { setParty(true); playCue('done'); emit({ type: 'event', name: 'completed', detail: { total: TOTAL, holds: Object.values(nt).filter(m => m.holdsWater).length } }); }, reduced ? 0 : 700); }
    }, okMs + (reduced ? 100 : 600 / spd));
    later(() => { setPhase('idle'); setItem(null); setWater(0); busy.current = false; drainQueue(); }, reduced ? 500 : 4600 / spd);
  }, [emit, pushState, reduced, spd, playCue, later, drainQueue]);
  runTestRef.current = runTest;

  /* tool-specific "do" verb: pour(id | id[]) — single OR array */
  const pour = useCallback((arg: any) => {
    const ids = Array.isArray(arg) ? arg : [arg];
    const norm = ids.map(x => { const m = MAT_BY_ID[x] || MATERIALS.find(mm => mm.name.toLowerCase() === String(x).toLowerCase()); return m ? m.id : null; }).filter(Boolean) as string[];
    if (norm.length === 0) return buildState();
    // run the first immediately (or queue if busy); queue the rest
    norm.forEach(id => { if (!testedRef.current[id] && !queue.current.includes(id)) queue.current.push(id); });
    if (!busy.current) { const first = queue.current.shift(); if (first) runTestRef.current(first); }
    return buildState();
  }, [buildState]);

  const reset = useCallback(() => {
    clearTimers(); cancelAnimationFrame(raf.current); busy.current = false; queue.current = [];
    testedRef.current = {}; setTested({}); setParty(false); setItem(null); setPhase('idle'); setWater(0); setHighlightId(null); setScoreShown(0);
    setAnnounce('Lab reset. Pour water into a tumbler to begin.');
    emit({ type: 'event', name: 'reset' }); setTimeout(pushState, 0);
  }, [clearTimers, emit, pushState]);

  const highlight = useCallback((target: string) => {
    const m = MAT_BY_ID[target] || MATERIALS.find(x => x.id === target || x.name.toLowerCase() === String(target).toLowerCase());
    setHighlightId(m ? m.id : null); setAnnounce(`Look at the ${m ? m.name : target}.`); playCue('tap');
    if (!reduced && m) later(() => setHighlightId(null), 2200);
  }, [reduced, playCue, later]);

  const getState = useCallback(() => buildState(), [buildState]);

  const setOperatorMode = useCallback((m: any) => {
    const next: 'ai' | 'student' = String(m).toLowerCase() === 'ai' ? 'ai' : 'student';
    modeRef.current = next; setMode(next);
    emit({ type: 'event', name: 'operator_mode_changed', detail: { operatorMode: next } });
    setTimeout(pushState, 0);
  }, [emit, pushState]);

  const setParam = useCallback((name: string, value: any) => {
    if (name === 'muted') setMuted(!!value);
    else if (name === 'operatorMode') setOperatorMode(value);
  }, [setMuted, setOperatorMode]);

  /* §3 contract wiring */
  useEffect(() => {
    const api: Record<string, (...a: any[]) => any> = {
      setParam, play: () => {}, pause: () => {}, reset, highlight, getState, setOperatorMode,
      pour, select: pour, fill: pour, tap: pour,
    };
    (window as any).__TOOL__ = api;
    emit({ type: 'ready', toolId: TOOL_ID });
    const onMsg = (e: MessageEvent) => { const d = (e as any).data; if (!d || d.type !== 'command') return; const fn = api[d.method]; let result; if (typeof fn === 'function') result = fn.apply(null, d.args || []); emit({ type: 'response', id: d.id, result: result === undefined ? api.getState() : result }); };
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('message', onMsg); if ((window as any).__TOOL__ === api) delete (window as any).__TOOL__; };
  }, [setParam, reset, highlight, getState, setOperatorMode, pour, emit]);

  useEffect(() => () => { clearTimers(); cancelAnimationFrame(raf.current); }, [clearTimers]);

  /* keyframes + scrollbar (motion only when allowed) */
  useEffect(() => {
    const el = document.createElement('style'); el.id = 'fill-tumbler-kf';
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      ${reduced ? '' : `
      @keyframes m_fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      @keyframes m_pop { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
      @keyframes m_jugTilt { 0%{transform:rotate(0)} 22%{transform:rotate(-48deg)} 75%{transform:rotate(-48deg)} 100%{transform:rotate(0)} }
      @keyframes m_streamIn { 0%{opacity:0} 18%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
      @keyframes m_drop { 0%{transform:translateY(0);opacity:0.9} 100%{transform:translateY(${STREAM_LEN}px);opacity:0} }
      @keyframes m_leak { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(55px);opacity:0} }
      @keyframes m_glow { 0%,100%{filter:drop-shadow(0 0 2px rgba(34,197,94,0))} 50%{filter:drop-shadow(0 0 18px rgba(34,197,94,0.9))} }
      @keyframes m_shake { 0%,100%{transform:translateX(0)} 14%{transform:translateX(-9px) rotate(-3deg)} 28%{transform:translateX(9px) rotate(3deg)} 42%{transform:translateX(-6px)} 56%{transform:translateX(6px)} 70%{transform:translateX(-3px)} 84%{transform:translateX(3px)} }
      @keyframes m_wet { from{opacity:0} to{opacity:0.22} }
      @keyframes m_confetti { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(120px) rotate(540deg);opacity:0} }
      @keyframes m_slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes m_zone { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} 50%{box-shadow:0 0 0 10px rgba(99,102,241,.16)} }
      @keyframes m_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      @keyframes m_bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px) scale(1.06)} }
      @keyframes m_pulse { 0%,100%{transform:scale(1);opacity:.9} 50%{transform:scale(1.07);opacity:1} }
      `}
      #fill-tumbler-root *::-webkit-scrollbar{width:8px;height:8px} #fill-tumbler-root *::-webkit-scrollbar-thumb{background:${primaryColor}66;border-radius:8px}
    `;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('fill-tumbler-kf'); if (e) e.remove(); };
  }, [reduced, primaryColor]);

  /* colours */
  const cardBg = darkMode ? '#1E293B' : '#FFFFFF';
  const borderC = darkMode ? 'rgba(255,255,255,0.08)' : '#E8E8F0';
  const textMain = darkMode ? '#F1F5F9' : '#1E1B4B';
  const textMuted = darkMode ? '#94A3B8' : '#64748B';
  const pageBg = darkMode ? 'linear-gradient(160deg,#0F172A,#1E1B4B)' : 'linear-gradient(160deg,#EEF2FF 0%,#FFF7ED 55%,#ECFDF5 100%)';
  const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({ background: cardBg, borderRadius: THEME.card, boxShadow: '0 8px 32px rgba(79,70,229,0.08)', border: `1px solid ${borderC}`, ...extra });
  const an = (s: string) => reduced ? undefined : s;

  const mascotMood: 'idle' | 'happy' | 'sad' = phase === 'result_ok' ? 'happy' : phase === 'result_fail' ? 'sad' : 'idle';

  return (
    <Boundary>
      <div id="fill-tumbler-root" style={{ width: '100%', minHeight: '100%', background: pageBg, padding: 'clamp(12px,3vw,28px)', fontFamily: THEME.font, boxSizing: 'border-box', color: textMain }}>
        <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{announce}</div>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ══ HEADER ══ */}
          <div style={{ ...card(), padding: 'clamp(16px,3vw,24px) clamp(16px,4vw,32px)', animation: an('m_fadeUp .5s ease-out') }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ minWidth: 220, flex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 12px', borderRadius: THEME.pill, background: `${secondaryColor}18`, marginBottom: 8 }}>
                  <span style={{ fontSize: 13 }} aria-hidden="true">🧪</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: secondaryColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Fill the Tumbler · Water takes its shape</span>
                </div>
                <h1 style={{ margin: 0, fontSize: 'clamp(22px,4vw,30px)', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em', background: `linear-gradient(135deg,${primaryColor},${secondaryColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Pour the water — what shape does it take?
                </h1>
                <p style={{ margin: '6px 0 0', fontSize: 'clamp(12px,2.4vw,14px)', color: textMuted, lineHeight: 1.6 }}>{instructionText}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span title={isAI ? 'Teacher is showing' : 'Your turn'} style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: isAI ? secondaryColor : primaryColor, borderRadius: THEME.pill, padding: '6px 12px' }}>{isAI ? '👩‍🏫 Teacher' : '🙋 Your turn'}</span>
                <button type="button" onClick={() => setMuted(!muted)} title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
                  style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${primaryColor}40`, background: cardBg, cursor: 'pointer', fontSize: 17, lineHeight: 1, color: textMain }}>{muted ? '🔇' : '🔊'}</button>
                {!isAI && <PillButton variant="contained" small onClick={reset} title="Reset lab">↻ Reset</PillButton>}
              </div>
            </div>
            {/* progress + score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ height: 8, borderRadius: THEME.pill, background: darkMode ? 'rgba(255,255,255,0.06)' : '#E8E8F0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, borderRadius: THEME.pill, transition: 'width .6s cubic-bezier(.4,0,.2,1)', background: `linear-gradient(90deg,${primaryColor},${secondaryColor})`, boxShadow: `0 0 10px ${primaryColor}55` }}/>
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 11, color: textMuted, fontWeight: 500 }}>{doneCount} of {TOTAL} tumblers filled</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ textAlign: 'center', padding: '6px 14px', borderRadius: 14, background: THEME.greenSoft, minWidth: 64 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: THEME.green, lineHeight: 1 }}>{scoreShown}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: THEME.green, letterSpacing: '0.08em' }}>HOLD WATER</div>
                </div>
                <div style={{ textAlign: 'center', padding: '6px 14px', borderRadius: 14, background: THEME.redSoft, minWidth: 64 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: THEME.red, lineHeight: 1 }}>{unsuitable.length}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: THEME.red, letterSpacing: '0.08em' }}>LEAK</div>
                </div>
              </div>
            </div>
          </div>

          {/* §6.1 watch caption (ai only) */}
          {isAI && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 16, background: `${secondaryColor}14`, border: `1.5px dashed ${secondaryColor}66`, animation: an('m_fadeUp .4s ease-out') }}>
              <span aria-hidden="true" style={{ fontSize: 20 }}>👩‍🏫</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: textMain }}>Your teacher is pouring the water — watch how the water takes the shape of each tumbler. You'll get a turn.</span>
            </div>
          )}

          {/* ══ MAIN ══ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>

            {/* ── LEFT: bench ── */}
            <div style={{ ...card(), padding: 'clamp(16px,3vw,24px) clamp(14px,3vw,28px)', minWidth: 0, animation: an('m_fadeUp .6s ease-out') }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: secondaryColor }}/>
                <span style={{ fontSize: 11, fontWeight: 700, color: secondaryColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pouring Bench</span>
                {phase === 'pouring' && <span style={{ fontSize: 11, fontWeight: 600, color: primaryColor }}>Pouring water…</span>}
                {(phase === 'result_ok' || phase === 'result_fail') && item && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: phase === 'result_ok' ? THEME.green : THEME.red, animation: an('m_slideUp .3s ease-out') }}>
                    {phase === 'result_ok' ? '✓ Water took the shape of the ' + item.name + '!' : '✗ Water leaked through!'}
                  </span>
                )}
              </div>

              {/* Stage — fixed 340×360 internal layout, scaled to fit width via stageScale */}
              <div ref={stageWrapRef} style={{ position: 'relative', width: '100%', maxWidth: 360, margin: '0 auto', height: 360 * stageScale, borderRadius: 20, background: 'linear-gradient(180deg,#F8F7FF 0%,#EEF2FF 100%)', border: '2px dashed #C7D2FE', overflow: 'hidden', animation: phase === 'pouring' ? an('m_zone 1s ease-in-out infinite') : 'none' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 340, height: 360, transformOrigin: '0 0', transform: `scale(${stageScale})` }}>
                  {/* jug top-right */}
                  <div style={{ position: 'absolute', left: 198, top: 6, zIndex: 9 }}><WaterJugSVG pouring={phase === 'pouring'}/></div>
                  <WaterStream active={phase === 'pouring'} len={STREAM_LEN}/>
                  {/* container */}
                  {item ? (
                    <div style={{ position: 'absolute', left: 115, top: 195, zIndex: 7 }}>
                      <svg viewBox="0 0 100 100" width={110} height={110}><ContainerSVG material={item} water={water} glow={phase === 'result_ok'} shake={phase === 'result_fail'}/></svg>
                    </div>
                  ) : (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 215, textAlign: 'center', color: textMuted, fontSize: 14, fontWeight: 500 }}>
                      {isAI ? 'Watch the teacher pour…' : 'Pick a tumbler below to fill it'}
                    </div>
                  )}
                  {/* bench line */}
                  <div style={{ position: 'absolute', left: 0, right: 0, top: 295, height: 65, background: 'linear-gradient(180deg,rgba(199,210,254,0.22),rgba(199,210,254,0.48))', borderTop: '1.5px solid #C7D2FE' }}/>
                  {/* outcome badge */}
                  {(phase === 'result_ok' || phase === 'result_fail') && item && (
                    <div style={{ position: 'absolute', top: 14, right: 14, padding: '6px 14px', borderRadius: THEME.pill, zIndex: 10, fontWeight: 700, fontSize: 12, color: '#fff', background: phase === 'result_ok' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: phase === 'result_ok' ? '0 4px 14px rgba(34,197,94,.45)' : '0 4px 14px rgba(239,68,68,.45)', animation: an('m_slideUp .3s ease-out') }}>
                      {phase === 'result_ok' ? 'Holds Water ✓' : 'Leaks Water ✗'}
                    </div>
                  )}
                  {/* mascot bottom-left */}
                  <div style={{ position: 'absolute', left: 14, bottom: 10, zIndex: 8 }}><Mascot mood={mascotMood} reduced={reduced}/></div>
                </div>
              </div>

              {/* reason card */}
              {(phase === 'result_ok' || phase === 'result_fail') && item && (
                <div style={{ borderRadius: 16, padding: '13px 16px', marginTop: 14, animation: an('m_fadeUp .38s ease-out'), background: phase === 'result_ok' ? 'linear-gradient(135deg,#F0FDF4,#DCFCE7)' : 'linear-gradient(135deg,#FFF1F2,#FFE4E6)', border: `1.5px solid ${phase === 'result_ok' ? '#86EFAC' : '#FCA5A5'}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: phase === 'result_ok' ? THEME.green : THEME.red, color: '#fff', fontWeight: 800 }}>{phase === 'result_ok' ? '✓' : '✗'}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: phase === 'result_ok' ? THEME.greenText : THEME.redText }}>{item.name} — {item.property}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 13, color: textMuted, lineHeight: 1.55 }}>{item.reason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* tray — hidden in AI mode (§6.1) */}
              {!isAI && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: primaryColor }}/>
                    <span style={{ fontSize: 11, fontWeight: 700, color: primaryColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Choose a Tumbler</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {MATERIALS.map((mat, i) => {
                      const isT = !!tested[mat.id]; const isHi = highlightId === mat.id;
                      return (
                        <button type="button" key={mat.id} disabled={isT || phase !== 'idle'}
                          onClick={() => { if (!isT && phase === 'idle') runTest(mat.id); }}
                          aria-label={`Fill the ${mat.name}${isT ? (tested[mat.id].holdsWater ? ', holds water' : ', leaks') : ''}`}
                          style={{
                            position: 'relative', borderRadius: 16, padding: '12px 8px', minHeight: 92,
                            background: isT ? (darkMode ? 'rgba(255,255,255,0.03)' : '#F8F9FF') : mat.color,
                            border: `2px solid ${isHi ? secondaryColor : isT ? (darkMode ? 'rgba(255,255,255,0.07)' : '#E2E8F0') : mat.accentColor + '45'}`,
                            cursor: isT || phase !== 'idle' ? 'default' : 'pointer', opacity: isT ? 0.5 : 1, fontFamily: 'inherit',
                            boxShadow: isHi ? `0 0 0 3px ${secondaryColor}44, 0 8px 18px ${secondaryColor}33` : isT ? 'none' : `0 3px 10px ${mat.accentColor}16`,
                            transition: 'all .2s cubic-bezier(.4,0,.2,1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            animation: isHi ? an('m_pulse 1s ease-in-out infinite') : isT ? 'none' : an(`m_pop .45s ease-out ${i * 0.07}s both`),
                          }}>
                          {isT && (<span style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: tested[mat.id].holdsWater ? THEME.green : THEME.red, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '2.5px solid #fff', fontSize: 11, fontWeight: 800 }}>{tested[mat.id].holdsWater ? '✓' : '✗'}</span>)}
                          <TileIcon shape={mat.shape} color={mat.color} accent={mat.accentColor} sz={46}/>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isT ? textMuted : mat.accentColor, textAlign: 'center', lineHeight: 1.2 }}>{mat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 11, color: textMuted, margin: '8px 0 0', fontStyle: 'italic' }}>Tap a tumbler to pour water into it</p>
                </div>
              )}
            </div>

            {/* ── RIGHT: results ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              <div style={{ ...card(), padding: 20, animation: an('m_fadeUp .65s ease-out') }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: THEME.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.green, fontWeight: 800 }}>✓</div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: THEME.green, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Took a shape</div><div style={{ fontSize: 13, fontWeight: 700, color: textMain }}>Holds Water ({suitable.length})</div></div>
                </div>
                {suitable.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: textMuted, fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>Fill a tumbler to see results…</p>
                  : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{suitable.map(m => (<div key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: THEME.pill, background: '#F0FDF4', border: '1.5px solid #86EFAC', animation: an('m_slideUp .35s ease-out') }}><TileIcon shape={m.shape} color={m.color} accent={m.accentColor} sz={20}/><span style={{ fontSize: 11, fontWeight: 600, color: THEME.greenText }}>{m.name}</span></div>))}</div>}
              </div>

              <div style={{ ...card(), padding: 20, animation: an('m_fadeUp .7s ease-out') }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: THEME.redSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.red, fontWeight: 800 }}>✗</div>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: THEME.red, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Could not hold</div><div style={{ fontSize: 13, fontWeight: 700, color: textMain }}>Leaks Water ({unsuitable.length})</div></div>
                </div>
                {unsuitable.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: textMuted, fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>None leaked yet…</p>
                  : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{unsuitable.map(m => (<div key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: THEME.pill, background: '#FFF1F2', border: '1.5px solid #FCA5A5', animation: an('m_slideUp .35s ease-out') }}><TileIcon shape={m.shape} color={m.color} accent={m.accentColor} sz={20}/><span style={{ fontSize: 11, fontWeight: 600, color: THEME.redText }}>{m.name}</span></div>))}</div>}
              </div>

              {lastTested && !party && (
                <div style={{ ...card({ border: `1.5px solid ${lastTested.holdsWater ? '#86EFAC' : '#FCA5A5'}` }), padding: 20, animation: an('m_fadeUp .45s ease-out') }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: 10 }}>Latest Finding</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <svg viewBox="0 0 100 100" width={58} height={58}><ContainerSVG material={lastTested} water={lastTested.holdsWater ? 52 : 0} glow={false} shake={false}/></svg>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: textMain }}>{lastTested.name}</p>
                      <span style={{ display: 'inline-block', marginTop: 3, padding: '2px 9px', borderRadius: THEME.pill, fontSize: 10, fontWeight: 700, background: lastTested.holdsWater ? THEME.greenSoft : THEME.redSoft, color: lastTested.holdsWater ? '#166534' : '#991B1B' }}>{lastTested.property}</span>
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: textMuted, lineHeight: 1.55 }}>{lastTested.reason}</p>
                    </div>
                  </div>
                </div>
              )}

              {party && (
                <div style={{ borderRadius: THEME.card, padding: 'clamp(20px,4vw,26px)', overflow: 'hidden', position: 'relative', background: `linear-gradient(135deg,${primaryColor},#7C3AED 55%,${secondaryColor})`, boxShadow: `0 12px 40px ${primaryColor}45`, color: '#fff', animation: an('m_pop .55s ease-out') }}>
                  {!reduced && Array.from({ length: 18 }).map((_, i) => (<div key={i} style={{ position: 'absolute', top: -8, left: `${(i * 5.6) % 96}%`, width: 8, height: 8, background: ['#FDE68A', '#A5F3FC', '#FBCFE8', '#BBF7D0', '#FED7AA'][i % 5], borderRadius: i % 2 === 0 ? '50%' : '2px', animation: `m_confetti ${1.8 + i * 0.1}s ease-in ${i * 0.12}s infinite` }}/>))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 2 }}>
                    <span style={{ fontSize: 40 }} aria-hidden="true">🏆</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(16px,3vw,19px)' }}>{successMessage}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 13, opacity: .92 }}>🟢 {suitable.length} hold water · 🔴 {unsuitable.length} leak</p>
                      <p style={{ margin: '6px 0 0', fontSize: 12, opacity: .88, lineHeight: 1.55 }}>A liquid has no shape of its own — it always takes the shape of whatever container holds it!</p>
                    </div>
                  </div>
                  {!isAI && <div style={{ marginTop: 14, position: 'relative', zIndex: 2 }}><PillButton variant="ghost" small onClick={reset}>↻ Play again</PillButton></div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Boundary>
  );
};

export default FillTheTumbler;
