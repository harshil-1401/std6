/**
 * Tool: M2.S3.T5.C15.2D2 — "Press and scratch test" (hard vs soft materials)
 * CBSE Grade 6 Science · Chapter 6 "Materials Around Us" · 6.3.2 Which materials are hard?
 * beat: Apply · concept: M2.S3.T5.C15 — objects are made of materials; materials can be hard or soft.
 *
 * PRESERVES the original HardOrSoftExplorer concept, object library and answer key:
 *  - Press an object → it squishes (soft) or keeps its shape (hard); an orange squish-meter fills.
 *  - Scratch an object → a softer object gets a visible scratch mark; a hard object resists.
 *  - Soft  : mattress (foam), sweater (wool), soft_toy (cotton)
 *  - Hard  : steel_tumbler (steel), wooden_table (wood), brick (baked clay)
 *  - Record table: tap Hard / Soft per object (answer key from each object's hardness).
 *
 * BROUGHT UP TO THE 2D-TOOL AUTHORING SPEC:
 *  - §3 Agent-control contract: postMessage bus ({type:'ready'|'state'|'event'|'response'}) + window.__TOOL__.
 *    Verbs: setParam, play, pause, reset, highlight(target), getState, setOperatorMode(mode),
 *           press(id|array), scratch(id|array), select(id|array) [tap alias].
 *    Every "do" verb accepts a single id OR an array and produces the same visible result as the student.
 *  - §6.1 operatorMode 'ai' | 'student' (default student). In 'ai' the student action bar + Record taps go
 *    inert and the agent drives; the press/scratch phenomenon + read-out stay visible; "👩‍🏫 watch" chip/caption.
 *  - §7.3 Web Audio cues (tap/correct/wrong/done), gated behind first gesture; visible 🔊/🔇 mute toggle.
 *  - §7 premium visuals via CSS/RAF only (NO framer-motion): gradients, layered cards, springy easings,
 *    squish/scratch animation, confetti celebration, mascot, score, prefers-reduced-motion respected.
 */
const { useState, useEffect, useRef, useMemo, useCallback } = React; // React/ReactDOM are renderer globals — no module import (no lucide / no framer-motion)

const TOOL_ID = 'M2.S3.T5.C15.2D2';

// ==================== TYPES ====================
type Hardness = 'hard' | 'soft';
type OperatorMode = 'ai' | 'student';

interface HObj {
  id: string; name: string; material: string; hardness: Hardness;
  squishiness: number; // 0 rock-hard .. 1 very-soft
  color: string; emoji: string;
}

// ==================== DESIGN TOKENS (Singularity palette, preserved) ====================
const fnTheme = (themeColor?: string) => {
  const primary = themeColor || '#4A4DC9';
  return {
    font: "'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
    primary, primaryDark: '#533086', primaryLight: '#C1C1EA', primaryGhost: '#EDEDF8',
    accent: '#FF7212', accentDark: '#FC9145', accentLight: '#FFF3E4',
    gray900: '#1A1A2E', gray700: '#4E4E4E', gray400: '#CACACA', gray200: '#EBEBEB', gray100: '#F5F5F5',
    white: '#FFFFFF', success: '#2ECC71', successText: '#1F7A45', successSoft: '#E4F4EA',
    danger: '#E53E3E', amber: '#F59E0B', pink: '#DB2777', deepBlue: '#1E40AF', forest: '#166534',
    gradient: `linear-gradient(135deg, #533086, ${primary} 55%, #FC9145)`,
    pill: 9999, touch: 48,
    sh: { sm: '0 2px 8px rgba(26,26,46,0.08)', md: '0 6px 18px rgba(26,26,46,0.12)', lg: '0 16px 40px rgba(26,26,46,0.18)', xl: '0 25px 50px -12px rgba(26,26,46,0.30)' },
  };
};

// ==================== OBJECT LIBRARY (preserved answer key) ====================
const OBJECT_LIBRARY: Record<string, HObj> = {
  mattress:      { id: 'mattress',      name: 'Bed mattress', material: 'Foam',       hardness: 'soft', squishiness: 0.95, color: '#FF7212', emoji: '🛏️' },
  sweater:       { id: 'sweater',       name: 'Sweater',      material: 'Wool',       hardness: 'soft', squishiness: 0.82, color: '#DB2777', emoji: '🧥' },
  soft_toy:      { id: 'soft_toy',      name: 'Soft toy',     material: 'Cotton',     hardness: 'soft', squishiness: 0.90, color: '#D98E5A', emoji: '🧸' },
  steel_tumbler: { id: 'steel_tumbler', name: 'Steel tumbler',material: 'Steel',      hardness: 'hard', squishiness: 0.05, color: '#1E40AF', emoji: '🥛' },
  wooden_table:  { id: 'wooden_table',  name: 'Wooden table', material: 'Wood',       hardness: 'hard', squishiness: 0.10, color: '#166534', emoji: '🪑' },
  brick:         { id: 'brick',         name: 'Brick',        material: 'Baked clay', hardness: 'hard', squishiness: 0.00, color: '#E53E3E', emoji: '🧱' },
};
const DEFAULT_ORDER = ['mattress', 'sweater', 'soft_toy', 'steel_tumbler', 'wooden_table', 'brick'];
const OBJECTS: HObj[] = DEFAULT_ORDER.map(id => OBJECT_LIBRARY[id]);
const OBJ_BY_ID: Record<string, HObj> = OBJECT_LIBRARY;
const TOTAL = OBJECTS.length;

// resolve an arg by id, name, or emoji (lenient — matches highlight/press leniency)
const resolveId = (raw: any): string | null => {
  const s = String(raw).toLowerCase().trim();
  for (const o of OBJECTS) {
    if (o.id === s || o.name.toLowerCase() === s || o.emoji === String(raw)) return o.id;
  }
  // also accept "bed mattress" → mattress etc. by loose contains
  for (const o of OBJECTS) if (o.name.toLowerCase().includes(s) || s.includes(o.id)) return o.id;
  return null;
};
const asArray = (v: any): any[] => (Array.isArray(v) ? v : [v]);

// ==================== PRNG (deterministic record-table order) ====================
function mulberry32(a: number) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededShuffle<T>(arr: T[], seed: number): T[] { const r = mulberry32(seed); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
// shuffle so no 3+ of the same hardness sit in a row (kills the alternating pattern, preserved behaviour)
function recordOrder(seed: number): HObj[] {
  let best = seededShuffle(OBJECTS, seed);
  for (let attempt = 0; attempt < 12; attempt++) {
    let maxRun = 1, run = 1;
    for (let i = 1; i < best.length; i++) { if (best[i].hardness === best[i - 1].hardness) { run++; maxRun = Math.max(maxRun, run); } else run = 1; }
    if (maxRun <= 2) break;
    best = seededShuffle(OBJECTS, seed + attempt + 1);
  }
  return best;
}

// ==================== prefers-reduced-motion ====================
function usePrefersReducedMotion(): boolean {
  const [rm, setRm] = useState(false);
  useEffect(() => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); const on = () => setRm(!!m.matches); on(); m.addEventListener?.('change', on); return () => m.removeEventListener?.('change', on); }, []);
  return rm;
}

// ==================== §7.3 Web Audio cues ====================
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
  // soft filtered-noise burst for a "scratch" texture
  const noise = (ac: any, t0: number, dur: number, peak: number) => {
    const n = Math.floor(ac.sampleRate * dur); const buf = ac.createBuffer(1, n, ac.sampleRate); const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
    const g = ac.createGain(); g.gain.setValueAtTime(peak, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t0); src.stop(t0 + dur + 0.01);
  };
  const playCue = useCallback((kind: 'tap' | 'press' | 'scratch' | 'correct' | 'wrong' | 'done') => {
    const ac = ctx(); if (!ac) return; const n = ac.currentTime;
    if (kind === 'tap') tone(ac, 420, n, 0.09, 'triangle', 0.16);
    else if (kind === 'press') { tone(ac, 300, n, 0.14, 'sine', 0.18); }
    else if (kind === 'scratch') { noise(ac, n, 0.22, 0.12); }
    else if (kind === 'correct') { tone(ac, 660, n, 0.12, 'sine', 0.2); tone(ac, 880, n + 0.09, 0.16, 'sine', 0.2); }
    else if (kind === 'wrong') tone(ac, 200, n, 0.18, 'sine', 0.18);
    else if (kind === 'done') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, n + i * 0.1, 0.22, 'triangle', 0.2));
  }, []);
  return { playCue, muted, setMuted };
}

// ==================== PILL BUTTON (no raw HTML controls) ====================
const PillButton: React.FC<{ variant?: 'contained' | 'outlined' | 'accent' | 'ghost'; disabled?: boolean; onClick?: () => void; children: React.ReactNode; title?: string; full?: boolean; T: any }> =
({ variant = 'contained', disabled, onClick, children, title, full, T }) => {
  const [h, setH] = useState(false), [p, setP] = useState(false);
  const base: React.CSSProperties = { fontFamily: T.font, fontWeight: 700, fontSize: 15, borderRadius: T.pill, padding: '12px 24px', minHeight: T.touch, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .18s cubic-bezier(.34,1.4,.64,1)', border: '2px solid transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: full ? 1 : undefined, userSelect: 'none', whiteSpace: 'nowrap' };
  let skin: React.CSSProperties;
  if (disabled) skin = { background: T.gray400, color: '#fff', opacity: 0.7 };
  else if (variant === 'accent') skin = { background: p ? '#d85e08' : T.accent, color: '#fff', transform: h && !p ? 'translateY(-2px) scale(1.03)' : 'none', boxShadow: h ? '0 8px 18px rgba(255,114,18,.34)' : T.sh.sm };
  else if (variant === 'outlined') skin = { background: h ? T.primaryGhost : '#fff', color: T.primary, borderColor: T.primary };
  else if (variant === 'ghost') skin = { background: h ? T.primaryGhost : 'transparent', color: T.gray700 };
  else skin = { background: p ? T.primaryDark : T.primary, color: '#fff', transform: h && !p ? 'translateY(-2px) scale(1.03)' : 'none', boxShadow: h ? '0 8px 18px rgba(74,77,201,.30)' : T.sh.sm };
  return <button type="button" title={title} disabled={disabled} onClick={disabled ? undefined : onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} style={{ ...base, ...skin }}>{children}</button>;
};

// ==================== CONFETTI ====================
const Confetti: React.FC<{ T: any; uid: string }> = ({ T, uid }) => {
  const palette = [T.accent, T.primary, T.amber, T.pink, T.success, T.accentDark];
  const pieces = useMemo(() => Array.from({ length: 64 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.5, dur: 2.4 + Math.random() * 0.8, color: palette[i % palette.length], size: 7 + Math.random() * 7, round: Math.random() > 0.5 })), []);
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 30 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{ position: 'absolute', top: -14, left: `${p.left}%`, width: p.size, height: p.size, background: p.color, borderRadius: p.round ? '50%' : 2, animation: `cf-${uid} ${p.dur}s ${p.delay}s ease-in forwards` }} />
      ))}
    </div>
  );
};

// ==================== SPECIMEN (press squish + scratch mark) ====================
const Specimen: React.FC<{
  obj: HObj; revealed: boolean; squishT: number; scratchT: number; pressedMeter: number; scratched: boolean;
  highlighted: boolean; onPress?: () => void; onScratch?: () => void; size: number; interactive: boolean; reduced: boolean; uid: string; T: any;
}> = ({ obj, revealed, squishT, scratchT, pressedMeter, scratched, highlighted, onPress, onScratch, size, interactive, reduced, uid, T }) => {
  const compressed = 1 - obj.squishiness * 0.5 * squishT;
  const tag = obj.hardness === 'hard' ? 'HARD' : 'SOFT';
  const tagColor = obj.hardness === 'hard' ? T.primary : T.accent;
  const tagBg = obj.hardness === 'hard' ? T.primaryLight : T.accentLight;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: highlighted && !reduced ? `pulse-${uid} 1.1s ease 2` : undefined, borderRadius: 18, padding: 6, outline: highlighted ? `3px solid ${T.accent}` : '3px solid transparent', transition: 'outline-color .2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: size + 8 }}>
        {/* squish meter */}
        <div title="how much it squishes" aria-hidden="true" style={{ width: 12, height: size, borderRadius: T.pill, background: T.gray200, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', height: `${pressedMeter * 100}%`, borderRadius: T.pill, background: `linear-gradient(${T.accent}, ${T.accentDark})`, transition: reduced ? 'none' : 'height .5s cubic-bezier(.34,1.56,.64,1)' }} />
        </div>
        {/* object emoji — squishes on press, gets a scratch overlay */}
        <button type="button" onClick={interactive ? onPress : undefined} disabled={!interactive} aria-label={`Press ${obj.name}`}
          style={{ position: 'relative', width: size, height: size, border: 'none', padding: 0, cursor: interactive ? 'pointer' : 'default', background: 'transparent', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.82, lineHeight: 1, display: 'inline-block', transform: `scaleY(${compressed})`, transformOrigin: 'bottom', transition: reduced ? 'none' : 'transform .08s linear', filter: 'drop-shadow(0 3px 4px rgba(26,26,46,0.18))' }}>{obj.emoji}</span>
          {/* scratch mark — only on soft objects; animates in when scratchT runs */}
          {(scratched || scratchT > 0) && obj.hardness === 'soft' && (
            <svg aria-hidden="true" viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path d="M22 70 L70 26" stroke={T.danger} strokeWidth="3.4" strokeLinecap="round" fill="none" style={{ strokeDasharray: 70, strokeDashoffset: 70 * (1 - (scratched ? 1 : scratchT)), opacity: 0.85 }} />
              <path d="M30 76 L62 40" stroke={T.danger} strokeWidth="2.2" strokeLinecap="round" fill="none" style={{ strokeDasharray: 56, strokeDashoffset: 56 * (1 - (scratched ? 1 : scratchT)), opacity: 0.6 }} />
            </svg>
          )}
        </button>
      </div>
      <div style={{ fontFamily: T.font, fontWeight: 600, fontSize: 14, color: T.gray900, textAlign: 'center' }}>{obj.name}</div>
      {revealed ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: reduced ? undefined : `pop-${uid} .4s both` }}>
          <div style={{ fontFamily: T.font, fontSize: 12, color: T.gray700 }}>made of <b>{obj.material}</b></div>
          <div style={{ fontFamily: T.font, fontWeight: 800, fontSize: 12, letterSpacing: 1, color: tagColor, background: tagBg, padding: '3px 12px', borderRadius: T.pill }}>{tag}</div>
        </div>
      ) : (
        <div style={{ fontFamily: T.font, fontSize: 11, color: T.gray400 }}>{interactive ? 'press · scratch' : ' '}</div>
      )}
    </div>
  );
};

// ==================== ERROR BOUNDARY ====================
class ToolErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  constructor(props: any) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { if (this.state.err) return <div role="alert" style={{ fontFamily: "'Poppins',sans-serif", padding: 24, background: '#FFF3E4', borderRadius: 16, color: '#533086' }}>Something went wrong loading this activity. Please reload.</div>; return this.props.children as any; }
}

interface ToolProps {
  props?: { width?: number; height?: number; themeColor?: string; darkMode?: boolean; operatorMode?: OperatorMode; muted?: boolean; additionalProps?: Record<string, any> };
  setStepDetails?: (d: any) => void; stopAutoNext?: boolean; setStopAutoNext?: (v: boolean) => void;
}

// ==================== MAIN ====================
const PressScratchTest: React.FC<ToolProps> = ({ props = {}, setStepDetails, setStopAutoNext }) => {
  const reduced = usePrefersReducedMotion();
  const uidRef = useRef<string | null>(null); if (uidRef.current == null) uidRef.current = 'ps' + Math.random().toString(36).slice(2, 8);
  const uid = uidRef.current;
  const T = useMemo(() => fnTheme(props.themeColor), [props.themeColor]);
  const width = props.width || 860;
  const seed = (((props.additionalProps && props.additionalProps.seed) ?? 7) as number) >>> 0;
  const tableObjs = useMemo(() => recordOrder(seed), [seed]);

  // ---------- phenomenon state ----------
  const [pressed, setPressed] = useState<Record<string, boolean>>({});
  const [scratched, setScratched] = useState<Record<string, boolean>>({});
  const [activeSquish, setActiveSquish] = useState<string | null>(null);
  const [squishT, setSquishT] = useState(0);
  const [activeScratch, setActiveScratch] = useState<string | null>(null);
  const [scratchT, setScratchT] = useState(0);
  const rafRef = useRef<number | null>(null);
  const scratchRafRef = useRef<number | null>(null);

  // ---------- record-table decisions (answer key) ----------
  const [decisions, setDecisions] = useState<Record<string, Hardness>>({});
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('Press and scratch each object to feel if it is hard or soft, then record it.');

  // ---------- §6.1 operator mode ----------
  const [mode, setMode] = useState<OperatorMode>(props.operatorMode === 'ai' ? 'ai' : 'student');
  const modeRef = useRef(mode); modeRef.current = mode;
  const isAI = mode === 'ai';

  // ---------- §7.3 sound ----------
  const { playCue, muted, setMuted } = useSound(!!props.muted);

  // refs for stable api
  const pressedRef = useRef(pressed); pressedRef.current = pressed;
  const scratchedRef = useRef(scratched); scratchedRef.current = scratched;
  const decisionsRef = useRef(decisions); decisionsRef.current = decisions;
  const finishedRef = useRef(finished); finishedRef.current = finished;
  const wrongRef = useRef(wrongTaps); wrongRef.current = wrongTaps;
  const shakeTimer = useRef<any>(null);
  const hlTimer = useRef<any>(null);

  const testedCount = useMemo(() => OBJECTS.filter(o => pressed[o.id] || scratched[o.id]).length, [pressed, scratched]);
  const recordedCount = Object.keys(decisions).length;
  const allTested = testedCount === TOTAL;
  const allRecorded = recordedCount === TOTAL;

  const emit = useCallback((msg: any) => { try { window.parent.postMessage(msg, '*'); } catch (e) {} }, []);

  const buildState = useCallback(() => ({
    tested: OBJECTS.filter(o => pressedRef.current[o.id] || scratchedRef.current[o.id]).map(o => o.id),
    pressed: Object.keys(pressedRef.current).filter(k => pressedRef.current[k]),
    scratched: Object.keys(scratchedRef.current).filter(k => scratchedRef.current[k]),
    decisions: { ...decisionsRef.current },
    recorded: Object.keys(decisionsRef.current).length,
    total: TOTAL, wrongTaps: wrongRef.current, finished: finishedRef.current, operatorMode: modeRef.current,
  }), []);

  const pushState = useCallback(() => { const s = buildState(); emit({ type: 'state', state: s }); setStepDetails?.({ beat: 'Apply', stepIndex: 0, totalSteps: 1, state: s }); }, [buildState, emit, setStepDetails]);

  // ---------- press animation ----------
  const runPress = useCallback((id: string) => {
    const obj = OBJ_BY_ID[id]; if (!obj) return;
    setPressed(prev => (prev[id] ? prev : { ...prev, [id]: true }));
    setActiveSquish(id); playCue('press');
    emit({ type: 'event', name: 'pressed', detail: { id, hardness: obj.hardness, squishiness: obj.squishiness } });
    if (reduced) { setSquishT(1); setTimeout(() => { setSquishT(0); setActiveSquish(null); }, 60); setTimeout(pushState, 0); return; }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now(); const dur = 850;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeOutBack = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      let e: number; if (p < 0.4) e = easeOutCubic(p / 0.4); else if (p < 0.62) e = 1; else e = Math.max(0, 1 - easeOutBack((p - 0.62) / 0.38));
      setSquishT(e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick); else { setSquishT(0); setActiveSquish(null); }
    };
    rafRef.current = requestAnimationFrame(tick);
    setTimeout(pushState, 0);
  }, [emit, playCue, reduced, pushState]);

  // ---------- scratch animation ----------
  const runScratch = useCallback((id: string) => {
    const obj = OBJ_BY_ID[id]; if (!obj) return;
    setScratched(prev => (prev[id] ? prev : { ...prev, [id]: true }));
    setActiveScratch(id); playCue('scratch');
    emit({ type: 'event', name: 'scratched', detail: { id, hardness: obj.hardness, leavesMark: obj.hardness === 'soft' } });
    if (reduced) { setScratchT(1); setTimeout(() => { setScratchT(0); setActiveScratch(null); }, 60); setTimeout(pushState, 0); return; }
    if (scratchRafRef.current) cancelAnimationFrame(scratchRafRef.current);
    const start = performance.now(); const dur = 600;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1); setScratchT(1 - Math.pow(1 - p, 2));
      if (p < 1) scratchRafRef.current = requestAnimationFrame(tick); else { setScratchT(0); setActiveScratch(null); }
    };
    scratchRafRef.current = requestAnimationFrame(tick);
    setTimeout(pushState, 0);
  }, [emit, playCue, reduced, pushState]);

  // ---------- table decision (answer key check) ----------
  const decide = useCallback((id: string, choice: Hardness, fromAgent = false) => {
    const obj = OBJ_BY_ID[id]; if (!obj || finishedRef.current) return;
    if (decisionsRef.current[id]) return; // idempotent: already recorded correctly
    if (choice === obj.hardness) {
      const nd = { ...decisionsRef.current, [id]: choice }; decisionsRef.current = nd; setDecisions(nd);
      const recorded = Object.keys(nd).length;
      emit({ type: 'event', name: 'answer_correct', detail: { id, choice, recorded } });
      if (recorded >= TOTAL) {
        finishedRef.current = true; setFinished(true); playCue('done');
        setAnnounce('Table complete! Hard things keep their shape, soft things change shape — the material decides. 🎉');
        emit({ type: 'event', name: 'completed', detail: { recorded, total: TOTAL, wrongTaps: wrongRef.current } });
      } else {
        playCue('correct'); setAnnounce(`${obj.name} is ${choice}. (${recorded} of ${TOTAL} recorded)`);
      }
    } else {
      const w = wrongRef.current + 1; wrongRef.current = w; setWrongTaps(w);
      playCue('wrong'); setShakeId(id); setAnnounce(`Not quite — press ${obj.name} again and feel whether it keeps its shape.`);
      emit({ type: 'event', name: 'answer_incorrect', detail: { id, choice } });
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShakeId(null), reduced ? 0 : 450);
    }
    setTimeout(pushState, 0);
  }, [emit, playCue, reduced, pushState]);

  // ==================== AGENT VERBS ====================
  const press = useCallback((arg: any) => { asArray(arg).forEach(a => { const id = resolveId(a); if (id) runPress(id); }); return buildState(); }, [runPress, buildState]);
  const scratch = useCallback((arg: any) => { asArray(arg).forEach(a => { const id = resolveId(a); if (id) runScratch(id); }); return buildState(); }, [runScratch, buildState]);
  // select/tap: record a hardness decision. arg can be id (uses correct hardness) OR {id, choice}.
  const select = useCallback((arg: any, choice?: any) => {
    asArray(arg).forEach(a => {
      let id: string | null, ch: Hardness | undefined;
      if (a && typeof a === 'object') { id = resolveId(a.id ?? a.target); ch = a.choice || a.hardness; }
      else { id = resolveId(a); ch = choice; }
      if (!id) return;
      const obj = OBJ_BY_ID[id];
      decide(id, (ch === 'hard' || ch === 'soft') ? ch : obj.hardness, true);
    });
    return buildState();
  }, [decide, buildState]);

  const reset = useCallback(() => {
    pressedRef.current = {}; scratchedRef.current = {}; decisionsRef.current = {}; finishedRef.current = false; wrongRef.current = 0;
    setPressed({}); setScratched({}); setDecisions({}); setFinished(false); setWrongTaps(0);
    setActiveSquish(null); setActiveScratch(null); setSquishT(0); setScratchT(0); setShakeId(null); setHighlightId(null);
    setAnnounce('Reset. Press and scratch each object, then record hard or soft.');
    emit({ type: 'event', name: 'reset' }); setTimeout(pushState, 0);
  }, [emit, pushState]);

  const highlight = useCallback((target: any) => {
    if (hlTimer.current) { clearTimeout(hlTimer.current); hlTimer.current = null; }
    const id = resolveId(target); setHighlightId(id); playCue('tap');
    if (id) setAnnounce(`Look at: ${OBJ_BY_ID[id].name}.`);
    if (!reduced && id) hlTimer.current = setTimeout(() => { setHighlightId(null); hlTimer.current = null; }, 2200);
    return buildState();
  }, [reduced, playCue, buildState]);

  const getState = useCallback(() => buildState(), [buildState]);

  const setOperatorMode = useCallback((m: any) => {
    const next: OperatorMode = String(m).toLowerCase() === 'ai' ? 'ai' : 'student';
    modeRef.current = next; setMode(next);
    emit({ type: 'event', name: 'operator_mode_changed', detail: { operatorMode: next } });
    setTimeout(pushState, 0);
  }, [emit, pushState]);

  const setParam = useCallback((name: string, value: any) => {
    if (name === 'muted') setMuted(!!value);
    else if (name === 'operatorMode') setOperatorMode(value);
  }, [setMuted, setOperatorMode]);

  // ---------- contract wiring ----------
  useEffect(() => { setStopAutoNext?.(true); }, [setStopAutoNext]);
  useEffect(() => {
    const api: Record<string, (...a: any[]) => any> = {
      setParam, play: () => buildState(), pause: () => buildState(), reset, highlight, getState, setOperatorMode,
      press, scratch, select, tap: select,
    };
    (window as any).__TOOL__ = api;
    emit({ type: 'ready', toolId: TOOL_ID });
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data; if (!d || d.type !== 'command') return;
      const fn = api[d.method]; let result;
      if (typeof fn === 'function') { try { result = fn.apply(null, d.args || []); } catch (err) { result = { error: String(err) }; } }
      emit({ type: 'response', id: d.id, result: result === undefined ? api.getState() : result });
    };
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('message', onMsg); if ((window as any).__TOOL__ === api) delete (window as any).__TOOL__; };
  }, [setParam, reset, highlight, getState, setOperatorMode, press, scratch, select, buildState, emit]);

  // ---------- keyframes + fonts ----------
  useEffect(() => {
    const el = document.createElement('style'); el.id = 'st-' + uid;
    const fonts = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');`;
    const kf = reduced ? '' : `
@keyframes fade-${uid}{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes pop-${uid}{0%{opacity:0;transform:scale(.4)}70%{transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
@keyframes shake-${uid}{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
@keyframes glow-${uid}{0%,100%{box-shadow:0 0 0 0 rgba(46,204,113,0)}50%{box-shadow:0 0 0 9px rgba(46,204,113,.28)}}
@keyframes pulse-${uid}{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes cf-${uid}{0%{opacity:1;transform:translateY(-14px) rotate(0)}100%{opacity:0;transform:translateY(440px) rotate(540deg)}}
@keyframes result-${uid}{0%{opacity:0;transform:scale(.85) translateY(10px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes float-${uid}{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes bump-${uid}{0%{transform:scale(1)}40%{transform:scale(1.16)}100%{transform:scale(1)}}`;
    el.textContent = fonts + kf; document.head.appendChild(el);
    return () => { el.remove(); };
  }, [uid, reduced]);

  useEffect(() => { pushState(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); if (scratchRafRef.current) cancelAnimationFrame(scratchRafRef.current); if (shakeTimer.current) clearTimeout(shakeTimer.current); if (hlTimer.current) clearTimeout(hlTimer.current); }, []);

  // ==================== RENDER ====================
  const isMobile = width < 576;
  const statChip: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: T.primaryDark, background: '#fff', border: `1px solid ${T.gray200}`, borderRadius: T.pill, padding: '6px 14px', boxShadow: T.sh.sm };

  return (
    <div style={{ width: '100%', maxWidth: width, margin: '0 auto', fontFamily: T.font, color: T.gray900, background: T.white, borderRadius: 24, overflow: 'hidden', boxShadow: T.sh.lg }}>
      {/* header */}
      <div style={{ background: T.gradient, color: '#fff', padding: isMobile ? '18px 18px' : '22px 26px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden="true" style={{ fontSize: 30, animation: reduced ? undefined : `float-${uid} 3s ease-in-out infinite` }}>🔬</span>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, letterSpacing: .2 }}>Press &amp; Scratch Test</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, opacity: .92 }}>Test each object — does it keep its shape (hard) or change shape (soft)?</p>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 14, right: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span title={isAI ? 'Teacher is showing' : 'Your turn'} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.18)', borderRadius: T.pill, padding: '4px 10px' }}>{isAI ? '👩‍🏫 Teacher' : '🙋 Your turn'}</span>
          <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'} title={muted ? 'Unmute' : 'Mute'} style={{ fontSize: 15, lineHeight: 1, cursor: 'pointer', color: '#fff', background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 999, width: 32, height: 32 }}>{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>

      {/* live region */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>{announce}</div>

      {/* §6.1 watch caption (ai only) */}
      {isAI && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 20px 0', padding: '10px 14px', borderRadius: 12, background: T.primaryLight, color: T.primaryDark, fontSize: 14, fontWeight: 600 }}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>👩‍🏫</span>
          Your teacher is showing the hard-and-soft test — watch what happens, you'll get a turn.
        </div>
      )}

      {/* body */}
      <div style={{ position: 'relative', padding: isMobile ? 18 : 26, minHeight: 380 }}>
        {finished && <Confetti T={T} uid={uid} />}

        {/* score row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <span key={`t-${testedCount}`} style={{ ...statChip, animation: (reduced || testedCount === 0) ? undefined : `bump-${uid} .3s ease` }}>Tested {testedCount}/{TOTAL}</span>
          <span key={`r-${recordedCount}`} style={{ ...statChip, color: T.successText, animation: (reduced || recordedCount === 0) ? undefined : `bump-${uid} .3s ease` }}>Recorded {recordedCount}/{TOTAL}</span>
          {wrongTaps > 0 && <span style={{ ...statChip, color: T.danger }}>Retries {wrongTaps}</span>}
        </div>

        {/* phenomenon — the test bench (visible in BOTH modes) */}
        <div style={{ animation: reduced ? undefined : `fade-${uid} .4s both` }}>
          <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: isMobile ? 16 : 18, color: T.gray900, marginBottom: 4 }}>1 · Press &amp; scratch to feel the difference</div>
          <div style={{ fontFamily: T.font, fontSize: isMobile ? 14 : 15, color: T.gray700, marginBottom: 14, lineHeight: 1.5 }}>
            {isAI ? 'Watch each object get pressed and scratched. Soft things squish and pick up a scratch; hard things keep their shape.' : 'Press an object to squish it. Scratch it to test its surface. Soft materials change shape and scratch easily; hard materials keep their shape.'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 100 : 120}px, 1fr))`, gap: isMobile ? 14 : 20, justifyItems: 'center', background: T.gray100, borderRadius: 20, padding: isMobile ? 16 : 24 }}>
            {OBJECTS.map(o => (
              <div key={o.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Specimen obj={o} revealed={!!(pressed[o.id] || scratched[o.id])}
                  squishT={activeSquish === o.id ? squishT : 0} scratchT={activeScratch === o.id ? scratchT : 0}
                  pressedMeter={pressed[o.id] ? o.squishiness : 0} scratched={!!scratched[o.id]}
                  highlighted={highlightId === o.id} onPress={() => runPress(o.id)} onScratch={() => runScratch(o.id)}
                  size={isMobile ? 84 : 92} interactive={!isAI} reduced={reduced} uid={uid} T={T} />
                {!isAI && (
                  <PillButton T={T} variant="outlined" onClick={() => runScratch(o.id)} title={`Scratch ${o.name}`}>
                    <span style={{ fontSize: 13 }}>✏️ scratch</span>
                  </PillButton>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* record table — the answer-key check */}
        <div style={{ marginTop: 22, animation: reduced ? undefined : `fade-${uid} .45s both` }}>
          <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: isMobile ? 16 : 18, color: T.gray900, marginBottom: 4 }}>2 · Record: hard or soft?</div>
          <div style={{ fontFamily: T.font, fontSize: isMobile ? 14 : 15, color: T.gray700, marginBottom: 12, lineHeight: 1.5 }}>For each object, tap whether it is hard or soft. The material is filled in for you.</div>
          <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.gray200}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', background: T.primaryLight, fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.primaryDark }}>
              <div style={{ padding: '12px 14px' }}>Object</div><div style={{ padding: '12px 14px' }}>Material</div><div style={{ padding: '12px 14px' }}>Hard / Soft</div>
            </div>
            {tableObjs.map((o, idx) => {
              const done = decisions[o.id];
              return (
                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', alignItems: 'center', background: idx % 2 ? T.white : T.gray100, fontFamily: T.font, fontSize: 14, color: T.gray900, animation: shakeId === o.id && !reduced ? `shake-${uid} .45s` : undefined }}>
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 20 }}>{o.emoji}</span>{o.name}</div>
                  <div style={{ padding: '10px 14px', color: T.gray700 }}>{o.material}</div>
                  <div style={{ padding: '8px 14px', display: 'flex', gap: 8 }}>
                    {(['hard', 'soft'] as Hardness[]).map(h => {
                      const selected = done === h; const isHard = h === 'hard';
                      return (
                        <button key={h} type="button" onClick={() => !isAI && !done && decide(o.id, h)} disabled={isAI || !!done}
                          style={{ flex: 1, minHeight: 42, borderRadius: T.pill, fontFamily: T.font, fontWeight: 700, fontSize: 13, cursor: (isAI || done) ? 'default' : 'pointer', textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: `2px solid ${selected ? T.success : isHard ? T.primary : T.accent}`, background: selected ? T.success : '#fff', color: selected ? '#fff' : isHard ? T.primary : T.accent, animation: selected && !reduced ? `glow-${uid} 1s` : undefined, opacity: done && !selected ? 0.4 : 1, transition: 'all .15s ease' }}>
                          {selected && <span style={{ fontWeight: 900 }}>✓</span>}<span>{h}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* status banner */}
        <div role="status" key={announce} style={{ marginTop: 16, padding: '11px 14px', borderRadius: 12, fontSize: 14, background: finished ? T.successSoft : T.accentLight, color: finished ? T.successText : T.primaryDark, border: `1px solid ${finished ? T.success : '#f0d9b8'}`, animation: reduced ? undefined : `pop-${uid} .3s both` }}>
          <span aria-hidden="true" style={{ marginRight: 6 }}>{finished ? '🎉' : recordedCount > 0 ? '✓' : '🔎'}</span>{announce}
        </div>

        {/* results card */}
        {finished && (
          <div role="status" style={{ position: 'relative', zIndex: 31, marginTop: 18, padding: '24px 20px', borderRadius: 20, textAlign: 'center', background: 'linear-gradient(135deg,#FFF8EE,#E9F7EF)', border: `2px solid ${T.success}`, boxShadow: '0 14px 34px -12px rgba(46,158,91,.4)', animation: reduced ? undefined : `result-${uid} .5s cubic-bezier(.2,.7,.3,1.25) both` }}>
            <div aria-hidden="true" style={{ fontSize: 46, animation: reduced ? undefined : `float-${uid} 3s ease-in-out infinite` }}>🧑‍🔬</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.primaryDark, marginTop: 8 }}>All {TOTAL} objects tested &amp; recorded! 🎉</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              <span style={statChip}>Recorded <b style={{ color: T.successText }}>{TOTAL}/{TOTAL}</b></span>
              <span style={statChip}>Retries <b style={{ color: wrongTaps === 0 ? T.successText : T.amber }}>{wrongTaps}</b></span>
            </div>
            <div style={{ fontSize: 14.5, color: T.gray700, marginTop: 14, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
              Hard things (steel, wood, baked clay) <b>keep their shape</b> when pressed. Soft things (foam, wool, cotton) <b>change shape</b>. Whether an object is hard or soft is decided by the <b>material</b> it is made of.
            </div>
            {!isAI && <div style={{ marginTop: 16 }}><PillButton T={T} variant="accent" onClick={reset}>↻ Test again</PillButton></div>}
          </div>
        )}
      </div>

      {/* action bar — hidden in ai-operated demo (§6.1) */}
      {!isAI && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '14px 20px', borderTop: `1px solid ${T.gray200}`, background: '#fff' }}>
          <PillButton T={T} variant="outlined" onClick={reset}>↻ {finished ? 'Test again' : 'Reset'}</PillButton>
          <span style={{ fontSize: 13, color: T.gray700 }}>{recordedCount}/{TOTAL} recorded · {testedCount}/{TOTAL} tested</span>
        </div>
      )}
    </div>
  );
};

function PressScratchTestTool(p: ToolProps) {
  return <ToolErrorBoundary><PressScratchTest {...p} /></ToolErrorBoundary>;
}

try { if (typeof window !== 'undefined') (window as any).__TOOL_COMPONENT__ = PressScratchTestTool; } catch (e) {}
export default PressScratchTestTool;
