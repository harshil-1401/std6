/**
 * Tool: M2.S4.T7.C20.2D3 — "Does it dissolve in water?"
 * CBSE Grade 6 Science · Materials Around Us (Ch 6) · Activity 6.7 / Table 6.5
 * concept: M2.S4.T7.C20  · beat: Apply/Explore · subtype: simulation (image_reveal)
 *
 * PRESERVED CONCEPT (from the original Table-6.5 recorder, answer key intact):
 *   Five NCERT materials. Soluble (dissolves in water): Sugar, Salt.
 *   Insoluble (does NOT dissolve): Chalk powder, Sand, Sawdust.
 *   The student drops a material into a glass of water, STIRS, and observes whether it
 *   dissolves (water turns clear, particles vanish) or stays visible (settles / floats).
 *   They then mark the verdict (Dissolves / Does not). Match the textbook = correct.
 *
 * FULL AUTHORING-SPEC RETROFIT:
 *  §3 Agent-control contract: postMessage bus + window.__TOOL__. Verbs: setParam, play, pause,
 *     reset, highlight(target), getState, setOperatorMode(mode) PLUS tool-specific
 *     addToWater(id|[ids]), stir(id|[ids]), select(id, verdict). The "do" verbs accept a single
 *     id OR an array. Every verb produces the same visible result as the student doing it and
 *     emits {type:'event', name, detail}.
 *  §6.1 operatorMode 'ai'|'student' (default student). In 'ai' (DEMO) the student action controls
 *     are hidden + inert (agent drives) but the DISSOLVING PHENOMENON (the glass) + the read-out
 *     verdict stay fully visible. Emits operator_mode_changed; reflected in getState.
 *  §7.3 Web Audio sound cues (tap/correct/wrong/done), gated on first gesture, visible mute toggle.
 *  §7 Premium visuals via CSS / @keyframes / RAF only — NO framer-motion. Glass tumbler with a
 *     live dissolving animation, swirling particles, sediment, count-up stir progress, confetti,
 *     a mascot, staggered entrance, prefers-reduced-motion respected, every control styled.
 */
const { useState, useEffect, useRef, useMemo, useCallback } = React; // React/ReactDOM are renderer globals.
let __uidSeq = 0;
const useId = typeof React.useId === 'function' ? React.useId : function () { const r = useRef(null); if (r.current == null) r.current = 'uid' + (++__uidSeq); return r.current; };

/* ───────── Brand tokens ───────── */
const THEME = {
  font: "'Poppins','Segoe UI',system-ui,-apple-system,sans-serif",
  primary: '#4A4DC9', accent: '#FF7212', deep: '#533086',
  gradient: 'linear-gradient(90deg,#533086,#FC9145)',
  lavender: '#C1C1EA', cream: '#FFF3E4', ghost: '#EDEDF8',
  green: '#22C55E', greenSoft: '#E4F4EA', greenText: '#15803D',
  amber: '#E08A1E', amberSoft: '#FBEFD9', amberText: '#8A5310',
  red: '#EF4444', redSoft: '#FDECEC', redText: '#B91C1C',
  water: '#CDE7F5', waterDeep: '#7FBEDD',
  dark: '#4E4E4E', mid: '#CACACA', light: '#EBEBEB', bg: '#F5F5F7', white: '#FFFFFF',
  pill: 999, touch: 44, card: 16,
};

const TOOL_ID = 'M2.S4.T7.C20.2D3';

type Verdict = 'dissolves' | 'does_not';
interface MatDef {
  id: string; name: string; emoji: string; kind: string;
  correct: Verdict;          // textbook answer key
  particle: string;          // particle / undissolved tint
  tint: string;              // water colour after stirring
  reason: string;            // shown on correct verdict
  hint: string;              // shown on wrong verdict
}

/* Answer key preserved verbatim from the original Table-6.5 tool. */
const MATERIALS: MatDef[] = [
  { id: 'sugar', name: 'Sugar', emoji: '🍬', kind: 'Table sugar', correct: 'dissolves', particle: '#E2C290', tint: '#EAF4FB',
    reason: 'Sugar is soluble — its particles break apart and spread evenly, so it disappears into a clear, sweet solution.',
    hint: 'Watch again: when stirred, sugar vanishes completely and the water stays clear. That means it dissolves.' },
  { id: 'salt', name: 'Salt', emoji: '🧂', kind: 'Common salt', correct: 'dissolves', particle: '#94A3B8', tint: '#EAF4FB',
    reason: 'Salt is soluble — it disappears quickly when stirred, leaving the water clear (and salty).',
    hint: 'Look closely: the salt grains break up and vanish. Nothing settles at the bottom — it dissolves.' },
  { id: 'chalk', name: 'Chalk powder', emoji: '🪨', kind: 'Chalk (calcium)', correct: 'does_not', particle: '#E5E7EB', tint: '#EDEEF2',
    reason: 'Chalk powder is insoluble — it makes the water cloudy and slowly settles at the bottom. It does not dissolve.',
    hint: 'No matter how hard you stir, the chalk stays cloudy and sinks. Stirring harder does not dissolve it.' },
  { id: 'sand', name: 'Sand', emoji: '⏳', kind: 'River sand', correct: 'does_not', particle: '#C2A878', tint: '#E3D9C4',
    reason: 'Sand is insoluble — the grains stay whole and sink straight to the bottom. It does not dissolve.',
    hint: 'The sand grains never disappear — they settle at the bottom. Sand does not dissolve in water.' },
  { id: 'sawdust', name: 'Sawdust', emoji: '🪵', kind: 'Wood shavings', correct: 'does_not', particle: '#A87C4F', tint: '#D8C7AE',
    reason: 'Sawdust is insoluble — the bits float and stay visible. It does not dissolve in water.',
    hint: 'The sawdust bits float and stay visible however long you stir. Sawdust does not dissolve.' },
];
const MAT_BY_ID: Record<string, MatDef> = Object.fromEntries(MATERIALS.map(m => [m.id, m]));
const TOTAL = MATERIALS.length;
const VERDICT_LABEL: Record<Verdict, string> = { dissolves: 'Dissolves', does_not: 'Does not' };

function usePrefersReducedMotion(): boolean {
  const [rm, setRm] = useState(false);
  useEffect(() => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); const on = () => setRm(m.matches); on(); m.addEventListener?.('change', on); return () => m.removeEventListener?.('change', on); }, []);
  return rm;
}

/* ───────── §7.3 Web Audio cues — lazy, mutable, no asset deps ───────── */
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
  const playCue = useCallback((kind: 'tap' | 'correct' | 'wrong' | 'done' | 'stir') => {
    const ac = ctx(); if (!ac) return; const n = ac.currentTime;
    if (kind === 'tap') { tone(ac, 420, n, 0.09, 'triangle', 0.16); }
    else if (kind === 'stir') { tone(ac, 300, n, 0.14, 'sine', 0.10); tone(ac, 360, n + 0.07, 0.14, 'sine', 0.08); }
    else if (kind === 'correct') { tone(ac, 660, n, 0.12, 'sine', 0.2); tone(ac, 880, n + 0.09, 0.16, 'sine', 0.2); }
    else if (kind === 'wrong') { tone(ac, 200, n, 0.18, 'sine', 0.18); }
    else if (kind === 'done') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, n + i * 0.1, 0.22, 'triangle', 0.2)); }
  }, []);
  return { playCue, muted, setMuted };
}

/* ───────── pill button ───────── */
interface PillProps { variant?: 'contained' | 'outlined' | 'accent'; disabled?: boolean; onClick?: () => void; children: React.ReactNode; title?: string; small?: boolean; }
const PillButton: React.FC<PillProps> = ({ variant = 'contained', disabled, onClick, children, title, small }) => {
  const [h, setH] = useState(false), [p, setP] = useState(false);
  const base: React.CSSProperties = { fontFamily: THEME.font, fontWeight: 600, fontSize: small ? 13 : 15, borderRadius: THEME.pill, padding: small ? '8px 16px' : '12px 24px', minHeight: small ? 36 : THEME.touch, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .18s ease', border: '2px solid transparent', whiteSpace: 'nowrap' };
  let skin: React.CSSProperties;
  if (disabled) skin = { background: THEME.mid, color: '#fff' };
  else if (variant === 'accent') skin = { background: p ? '#d85e08' : THEME.accent, color: '#fff', transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(255,114,18,.32)' : 'none' };
  else if (variant === 'outlined') skin = { background: h ? THEME.lavender : 'transparent', color: h ? THEME.deep : THEME.primary, borderColor: THEME.primary };
  else skin = { background: p ? THEME.deep : h ? THEME.lavender : THEME.primary, color: (p || !h) ? '#fff' : THEME.deep, transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(74,77,201,.28)' : 'none' };
  return <button type="button" title={title} disabled={disabled} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} style={{ ...base, ...skin }}>{children}</button>;
};

/* ───────── The glass tumbler — the core dissolving phenomenon ─────────
   phase: 'empty' (no material) | 'added' (material sitting in water, not stirred)
         | 'stirring' (RAF swirl) | 'done' (final look: clear solution OR cloudy/sediment).
   stirT 0..1 drives the live mix. */
const Glass: React.FC<{
  mat: MatDef | null; phase: string; stirT: number; reduced: boolean; uid: string; big?: boolean;
}> = ({ mat, phase, stirT, reduced, uid, big }) => {
  const W = big ? 200 : 168, H = big ? 250 : 210;
  const soluble = mat ? mat.correct === 'dissolves' : false;
  const done = phase === 'done';
  const stirring = phase === 'stirring';
  // water tint blends from plain water toward solution colour as it mixes
  const mixK = done ? 1 : stirT;
  const waterTop = mat && done ? mat.tint : THEME.water;
  // for insoluble: cloudiness fades into sediment as it settles; for soluble: clears up
  const cloud = mat && !soluble ? (done ? 0.5 : 0.25 + 0.55 * mixK) : 0;
  const sediment = mat && !soluble && done ? 1 : 0;
  const undissolved = mat ? (soluble ? Math.max(0, 1 - mixK * 1.15) : 1) : 0;

  // deterministic particle field (no Math.random in render path)
  const particles = useMemo(() => {
    const arr: { x: number; y: number; r: number; d: number }[] = [];
    let s = (mat ? mat.id.length * 97 : 3) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 26; i++) arr.push({ x: 18 + rnd() * 64, y: 18 + rnd() * 60, r: 1.4 + rnd() * 2.6, d: rnd() });
    return arr;
  }, [mat]);

  return (
    <div style={{ position: 'relative', width: W, height: H, margin: '0 auto' }} aria-hidden="true">
      {/* glass body */}
      <svg viewBox="0 0 100 124" width={W} height={H} style={{ position: 'absolute', inset: 0, display: 'block', filter: 'drop-shadow(0 14px 22px rgba(40,60,90,.18))' }}>
        <defs>
          <linearGradient id={`gl-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,.65)" /><stop offset="18%" stopColor="rgba(255,255,255,.12)" />
            <stop offset="82%" stopColor="rgba(255,255,255,.05)" /><stop offset="100%" stopColor="rgba(180,200,220,.4)" />
          </linearGradient>
          <linearGradient id={`wt-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={waterTop} /><stop offset="100%" stopColor={THEME.waterDeep} />
          </linearGradient>
          <clipPath id={`clip-${uid}`}><path d="M20 30 L80 30 L74 116 Q73 120 68 120 L32 120 Q27 120 26 116 Z" /></clipPath>
        </defs>
        {/* water fill */}
        <g clipPath={`url(#clip-${uid})`}>
          <rect x="14" y="44" width="72" height="80" fill={`url(#wt-${uid})`} opacity="0.94" />
          {/* meniscus shimmer */}
          <ellipse cx="50" cy="46" rx="30" ry="3.4" fill="#ffffff" opacity="0.35" />
          {/* cloudiness for insoluble */}
          {cloud > 0 && <rect x="14" y="44" width="72" height="80" fill={mat ? mat.particle : '#fff'} opacity={cloud * 0.5} style={{ transition: reduced ? 'none' : 'opacity .5s ease' }} />}
          {/* sediment layer (insoluble, settled) */}
          {sediment > 0 && <rect x="14" y="108" width="72" height="12" fill={mat ? mat.particle : '#fff'} opacity="0.92" style={{ transition: reduced ? 'none' : 'opacity .6s ease' }} />}
          {/* undissolved particles */}
          {mat && undissolved > 0.02 && particles.map((p, i) => {
            const swirl = (stirring && !reduced) ? `swirl-${uid} ${0.7 + p.d * 0.5}s linear infinite` : undefined;
            const yPos = (!soluble && done) ? 100 + p.d * 14 : p.y; // settle for insoluble
            return <circle key={i} cx={p.x} cy={yPos} r={p.r} fill={mat.particle}
              opacity={undissolved * (0.55 + p.d * 0.4)}
              style={{ transformOrigin: '50px 80px', animation: swirl, transition: reduced ? 'none' : 'cy .6s ease, opacity .6s ease' }} />;
          })}
        </g>
        {/* glass outline + rim */}
        <path d="M20 30 L80 30 L74 116 Q73 120 68 120 L32 120 Q27 120 26 116 Z" fill={`url(#gl-${uid})`} stroke="rgba(120,150,180,.55)" strokeWidth="1.6" />
        <ellipse cx="50" cy="30" rx="30" ry="4.2" fill="none" stroke="rgba(120,150,180,.55)" strokeWidth="1.6" />
        <ellipse cx="50" cy="30" rx="30" ry="4.2" fill="rgba(255,255,255,.25)" />
        {/* left highlight streak */}
        <rect x="30" y="40" width="4" height="70" rx="2" fill="#ffffff" opacity="0.4" />
      </svg>

      {/* spoon (visible while stirring) */}
      {stirring && (
        <div style={{ position: 'absolute', left: '50%', top: big ? 26 : 22, width: 8, height: big ? 150 : 124, marginLeft: -4, transformOrigin: 'top center', animation: reduced ? undefined : `spoon-${uid} 0.8s ease-in-out infinite` }}>
          <div style={{ width: 8, height: '100%', borderRadius: 6, background: 'linear-gradient(180deg,#D9DEE6,#9AA6B5)' }} />
          <div style={{ position: 'absolute', bottom: -6, left: -5, width: 18, height: 12, borderRadius: '50%', background: 'linear-gradient(180deg,#D9DEE6,#8A98A8)' }} />
        </div>
      )}

      {/* dropping material badge (added, pre-stir) */}
      {mat && phase === 'added' && (
        <div style={{ position: 'absolute', left: '50%', top: big ? 60 : 50, marginLeft: -22, fontSize: big ? 38 : 32, animation: reduced ? undefined : `drop-${uid} .6s cubic-bezier(.3,.8,.4,1.2) both` }}>{mat.emoji}</div>
      )}
    </div>
  );
};

class ToolErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { if (this.state.err) return <div role="alert" style={{ fontFamily: THEME.font, padding: 24, background: THEME.cream, borderRadius: 16, color: THEME.deep }}>Something went wrong loading this activity. Please reload.</div>; return this.props.children; }
}

interface ToolProps {
  props?: { width?: number; height?: number; themeColor?: string; darkMode?: boolean; operatorMode?: 'ai' | 'student'; muted?: boolean; spec?: any; additionalProps?: Record<string, any> };
  setStepDetails?: (d: { beat: string; stepIndex: number; totalSteps: number; state: Record<string, any> }) => void;
}

function starsFor(wrong: number): number { return wrong === 0 ? 3 : wrong <= 2 ? 2 : 1; }

const DissolveTool: React.FC<ToolProps> = ({ props = {}, setStepDetails }) => {
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/[:]/g, '');
  const width = props.width || 0;
  const dark = !!props.darkMode;
  const theme = props.themeColor || THEME.primary;

  // per-material progress: { phase, stirT, verdict }
  type Row = { phase: 'empty' | 'added' | 'stirring' | 'done'; stirT: number; verdict: Verdict | null; correctVerdict: boolean | null };
  const initRows = (): Record<string, Row> => Object.fromEntries(MATERIALS.map(m => [m.id, { phase: 'empty', stirT: 0, verdict: null, correctVerdict: null }]));
  const [rows, setRows] = useState<Record<string, Row>>(initRows);
  const [activeId, setActiveId] = useState<string>(MATERIALS[0].id);
  const [wrong, setWrong] = useState(0);
  const [announce, setAnnounce] = useState('Pick a material, drop it in the water, stir, then say if it dissolves.');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const initialMode: 'ai' | 'student' = props.operatorMode === 'ai' ? 'ai' : 'student';
  const [mode, setMode] = useState<'ai' | 'student'>(initialMode);
  const modeRef = useRef(mode); modeRef.current = mode;
  const isAI = mode === 'ai';

  const { playCue, muted, setMuted } = useSound(!!props.muted);

  const rowsRef = useRef(rows); rowsRef.current = rows;
  const activeRef = useRef(activeId); activeRef.current = activeId;
  const wrongRef = useRef(wrong); wrongRef.current = wrong;
  const finishedRef = useRef(finished); finishedRef.current = finished;
  const rafRef = useRef<Record<string, number>>({});
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const solvedCount = useMemo(() => Object.values(rows).filter(r => r.correctVerdict === true).length, [rows]);

  const emit = useCallback((msg: any) => { try { window.parent.postMessage(msg, '*'); } catch (e) {} }, []);

  const buildState = useCallback(() => {
    const r = rowsRef.current;
    return {
      active: activeRef.current,
      total: TOTAL,
      results: Object.fromEntries(MATERIALS.map(m => [m.id, { phase: r[m.id].phase, verdict: r[m.id].verdict, correct: r[m.id].correctVerdict }])),
      solved: Object.values(r).filter((x: any) => x.correctVerdict === true).length,
      wrongAttempts: wrongRef.current,
      finished: finishedRef.current,
      operatorMode: modeRef.current,
    };
  }, []);

  const pushState = useCallback(() => { const s = buildState(); emit({ type: 'state', state: s }); setStepDetails?.({ beat: 'Apply', stepIndex: 0, totalSteps: 1, state: s }); }, [buildState, emit, setStepDetails]);

  const setRow = useCallback((id: string, patch: Partial<Row>) => {
    setRows(prev => { const next = { ...prev, [id]: { ...prev[id], ...patch } }; rowsRef.current = next; return next; });
  }, []);

  const ids = (x: any): string[] => Array.isArray(x) ? x.map(String) : [String(x)];

  // ── tool verb: addToWater(id | [ids]) ──
  const addToWater = useCallback((raw: any) => {
    const list = ids(raw).map(s => (MAT_BY_ID[s] ? s : (MATERIALS.find(m => m.name.toLowerCase() === s.toLowerCase())?.id))).filter(Boolean) as string[];
    if (!list.length) return;
    list.forEach(id => {
      const r = rowsRef.current[id];
      if (r.phase === 'empty') { setRow(id, { phase: 'added', stirT: 0 }); }
    });
    setActiveId(list[0]); activeRef.current = list[0];
    playCue('tap');
    const m = MAT_BY_ID[list[0]];
    setAnnounce(`${m.name} dropped into the water. Now stir to mix it.`);
    list.forEach(id => emit({ type: 'event', name: 'material_added', detail: { id } }));
    setTimeout(pushState, 0);
  }, [setRow, playCue, emit, pushState]);

  // ── tool verb: stir(id | [ids]) — runs the dissolving animation, sets the result ──
  const runStir = useCallback((id: string) => {
    const r = rowsRef.current[id];
    if (!r || (r.phase !== 'added' && r.phase !== 'done')) {
      // allow stir even straight from empty by auto-adding
      if (r && r.phase === 'empty') { setRow(id, { phase: 'added', stirT: 0 }); }
    }
    if (rafRef.current[id]) cancelAnimationFrame(rafRef.current[id]);
    setRow(id, { phase: 'stirring', stirT: 0 });
    playCue('stir');
    const m = MAT_BY_ID[id];
    setAnnounce(`Stirring the ${m.name.toLowerCase()}…`);
    emit({ type: 'event', name: 'stir_started', detail: { id } });
    if (reduced) { setRow(id, { phase: 'done', stirT: 1 }); setAnnounce(`Stirred. ${m.correct === 'dissolves' ? 'It dissolved!' : 'It did not dissolve.'} Now record your verdict.`); emit({ type: 'event', name: 'stir_done', detail: { id, dissolved: m.correct === 'dissolves' } }); setTimeout(pushState, 0); return; }
    const dur = 1800; const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      setRow(id, { stirT: t });
      if (t < 1) { rafRef.current[id] = requestAnimationFrame(tick); }
      else {
        delete rafRef.current[id];
        setRow(id, { phase: 'done', stirT: 1 });
        setAnnounce(`Done stirring. Did the ${m.name.toLowerCase()} dissolve? Tap Dissolves or Does not.`);
        emit({ type: 'event', name: 'stir_done', detail: { id, dissolved: m.correct === 'dissolves' } });
        setTimeout(pushState, 0);
      }
    };
    rafRef.current[id] = requestAnimationFrame(tick);
  }, [setRow, playCue, emit, pushState, reduced]);

  const stir = useCallback((raw: any) => {
    const list = ids(raw).map(s => (MAT_BY_ID[s] ? s : (MATERIALS.find(m => m.name.toLowerCase() === s.toLowerCase())?.id))).filter(Boolean) as string[];
    (list.length ? list : [activeRef.current]).forEach(id => runStir(id));
    if (list.length) { setActiveId(list[0]); activeRef.current = list[0]; }
  }, [runStir]);

  // ── tool verb: select(id, verdict) — record the Dissolves / Does-not verdict ──
  const select = useCallback((rawId: any, rawVerdict?: any) => {
    const id = MAT_BY_ID[rawId] ? String(rawId) : (MATERIALS.find(m => m.name.toLowerCase() === String(rawId).toLowerCase())?.id || activeRef.current);
    const m = MAT_BY_ID[id]; if (!m) return;
    let v = String(rawVerdict ?? '').toLowerCase();
    let verdict: Verdict | null = null;
    if (v.includes('dissolv') && !v.includes('not') && !v.includes("doesn")) verdict = 'dissolves';
    else if (v.includes('not') || v.includes('no') || v === 'does_not' || v === 'insoluble') verdict = 'does_not';
    if (!verdict) return;
    const r = rowsRef.current[id];
    if (r.phase !== 'done') { setAnnounce(`Add the ${m.name.toLowerCase()} and stir it first, then record what you saw.`); return; }
    const isCorrect = verdict === m.correct;
    setRow(id, { verdict, correctVerdict: isCorrect });
    setActiveId(id); activeRef.current = id;
    if (isCorrect) {
      setAnnounce(m.reason);
      emit({ type: 'event', name: 'answer_correct', detail: { id, verdict } });
      const solved = Object.values(rowsRef.current).filter((x: any) => x.correctVerdict === true).length;
      if (solved >= TOTAL && !finishedRef.current) {
        finishedRef.current = true; setFinished(true); playCue('done');
        setAnnounce('🎉 You tested all five materials correctly! Soluble ones dissolved, insoluble ones did not.');
        emit({ type: 'event', name: 'completed', detail: { solved, total: TOTAL, wrongAttempts: wrongRef.current, stars: starsFor(wrongRef.current) } });
      } else { playCue('correct'); }
    } else {
      const w = wrongRef.current + 1; wrongRef.current = w; setWrong(w);
      playCue('wrong');
      setAnnounce(m.hint);
      emit({ type: 'event', name: 'answer_incorrect', detail: { id, verdict } });
    }
    setTimeout(pushState, 0);
  }, [setRow, playCue, emit, pushState]);

  const highlight = useCallback((target: string) => {
    if (highlightTimer.current) { clearTimeout(highlightTimer.current); highlightTimer.current = null; }
    const m = MATERIALS.find(x => x.id === target || x.name.toLowerCase() === String(target).toLowerCase());
    setHighlightId(m ? m.id : null); setAnnounce(`Look at: ${m ? m.name : target}.`); playCue('tap');
    if (m) { setActiveId(m.id); activeRef.current = m.id; }
    if (!reduced && m) highlightTimer.current = setTimeout(() => { setHighlightId(null); highlightTimer.current = null; }, 2200);
  }, [reduced, playCue]);

  const reset = useCallback(() => {
    Object.values(rafRef.current).forEach(h => cancelAnimationFrame(h)); rafRef.current = {};
    const fresh = initRows(); rowsRef.current = fresh; setRows(fresh);
    setActiveId(MATERIALS[0].id); activeRef.current = MATERIALS[0].id;
    wrongRef.current = 0; setWrong(0); finishedRef.current = false; setFinished(false);
    setHighlightId(null);
    setAnnounce('Reset. Pick a material, drop it in, stir, then say if it dissolves.');
    emit({ type: 'event', name: 'reset' }); setTimeout(pushState, 0);
  }, [emit, pushState]);

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

  // contract bus
  useEffect(() => {
    const api: Record<string, (...a: any[]) => any> = {
      setParam, play: () => {}, pause: () => {}, reset, highlight, getState, setOperatorMode,
      addToWater, stir, select,
    };
    (window as any).__TOOL__ = api;
    emit({ type: 'ready', toolId: TOOL_ID });
    const onMsg = (e: MessageEvent) => { const d = e.data; if (!d || d.type !== 'command') return; const fn = api[d.method]; let result; if (typeof fn === 'function') result = fn.apply(null, d.args || []); emit({ type: 'response', id: d.id, result: result === undefined ? api.getState() : result }); };
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('message', onMsg); if ((window as any).__TOOL__ === api) delete (window as any).__TOOL__; };
  }, [setParam, reset, highlight, getState, setOperatorMode, addToWater, stir, select, emit]);

  // styles
  useEffect(() => {
    const el = document.createElement('style'); el.id = 'st-' + uid;
    const scroll = `.scroll-${uid}{scrollbar-width:thin;scrollbar-color:${THEME.lavender} transparent;}
.scroll-${uid}::-webkit-scrollbar{width:9px;height:9px;}
.scroll-${uid}::-webkit-scrollbar-thumb{background:${THEME.lavender};border-radius:999px;border:2px solid transparent;background-clip:content-box;}`;
    const kf = reduced ? '' : `
@keyframes swirl-${uid}{0%{transform:rotate(0) translateX(0)}50%{transform:rotate(180deg) translateX(3px)}100%{transform:rotate(360deg) translateX(0)}}
@keyframes spoon-${uid}{0%,100%{transform:rotate(-11deg)}50%{transform:rotate(11deg)}}
@keyframes drop-${uid}{0%{opacity:0;transform:translateY(-30px) scale(.7)}70%{opacity:1;transform:translateY(4px) scale(1.05)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes pop-${uid}{0%{transform:scale(.7)}70%{transform:scale(1.1)}100%{transform:scale(1)}}
@keyframes cardIn-${uid}{0%{opacity:0;transform:translateY(12px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes bannerIn-${uid}{0%{opacity:.4;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}
@keyframes resultIn-${uid}{0%{opacity:0;transform:scale(.86) translateY(10px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes starpop-${uid}{0%{opacity:0;transform:scale(.2) rotate(-25deg)}60%{transform:scale(1.25) rotate(8deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes glowPulse-${uid}{0%,100%{box-shadow:0 0 0 0 rgba(255,114,18,0)}50%{box-shadow:0 0 0 6px rgba(255,114,18,.45)}}
@keyframes idle-${uid}{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}
@keyframes conf-${uid}{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(220px) rotate(540deg)}}
@keyframes shake-${uid}{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}`;
    el.textContent = scroll + kf; document.head.appendChild(el); return () => { el.remove(); };
  }, [uid, reduced]);

  useEffect(() => { pushState(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { Object.values(rafRef.current).forEach(h => cancelAnimationFrame(h)); if (highlightTimer.current) clearTimeout(highlightTimer.current); }, []);

  // palette
  const pageBg = dark ? '#1B1B26' : THEME.bg;
  const cardBg = dark ? '#262633' : THEME.white;
  const textCol = dark ? '#E8E8F0' : THEME.dark;
  const subtle = dark ? '#3A3A4A' : THEME.light;
  const stars = starsFor(wrong);

  const activeMat = MAT_BY_ID[activeId];
  const activeRow = rows[activeId];
  const statChip: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: dark ? '#E8E8F0' : THEME.deep, background: cardBg, border: `1px solid ${subtle}`, borderRadius: THEME.pill, padding: '6px 12px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' };

  // verdict button
  const VerdictBtn: React.FC<{ v: Verdict; mat: MatDef; row: Row }> = ({ v, mat, row }) => {
    const chosen = row.verdict === v;
    const isRight = chosen && row.correctVerdict === true;
    const isWrong = chosen && row.correctVerdict === false;
    const enabled = row.phase === 'done' && !isAI && row.correctVerdict !== true;
    const [h, setH] = useState(false);
    const bg = isRight ? THEME.green : isWrong ? THEME.red : chosen ? THEME.primary : (h && enabled ? THEME.lavender : (dark ? '#30303f' : '#fff'));
    const col = (isRight || isWrong || chosen) ? '#fff' : (dark ? '#E8E8F0' : THEME.deep);
    return (
      <button type="button" disabled={!enabled} onClick={() => enabled && select(mat.id, v)}
        onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        aria-pressed={chosen}
        style={{ flex: 1, fontFamily: THEME.font, fontWeight: 700, fontSize: 14.5, padding: '11px 8px', borderRadius: 12, cursor: enabled ? 'pointer' : (row.correctVerdict === true ? 'default' : 'not-allowed'), border: `2px solid ${chosen ? bg : subtle}`, background: bg, color: col, transition: reduced ? 'none' : 'all .16s ease', animation: (isWrong && !reduced) ? `shake-${uid} .4s ease` : undefined, opacity: enabled || chosen ? 1 : 0.55 }}>
        {v === 'dissolves' ? '💧 Dissolves' : '🚫 Does not'} {isRight && '✓'} {isWrong && '✗'}
      </button>
    );
  };

  return (
    <div style={{ fontFamily: THEME.font, maxWidth: width ? width : 920, margin: '0 auto', background: pageBg, borderRadius: 24, boxShadow: '0 20px 50px -20px rgba(83,48,134,.35)', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ background: `linear-gradient(90deg,${theme},#FC9145)`, color: '#fff', padding: '20px 24px', position: 'relative' }}>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: .9, letterSpacing: .4 }}>Activity 6.7 · Materials Around Us</div>
        <h1 style={{ margin: '3px 0 3px', fontSize: 24, fontWeight: 800 }}>Does it dissolve in water?</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: .95, maxWidth: 560 }}>Drop a material into the water, <b>stir</b>, watch what happens, then decide: does it <b>dissolve</b> or not?</p>
        <div style={{ position: 'absolute', top: 14, right: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span title={isAI ? 'Teacher is showing' : 'Your turn'} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.18)', borderRadius: THEME.pill, padding: '4px 10px' }}>{isAI ? '👩‍🏫 Teacher' : '🙋 Your turn'}</span>
          <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'} style={{ fontSize: 15, cursor: 'pointer', color: '#fff', background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 999, width: 30, height: 30 }}>{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>

      {/* live region */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>{announce}</div>

      {/* §6.1 watch caption — ai mode only */}
      {isAI && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 18px 0', padding: '10px 14px', borderRadius: 12, background: dark ? '#33304a' : THEME.lavender, color: dark ? '#E8E8F0' : THEME.deep, fontSize: 14, fontWeight: 600, animation: reduced ? undefined : `bannerIn-${uid} .3s ease both` }}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>👩‍🏫</span>
          Your teacher is showing how each material behaves in water — watch what dissolves.
        </div>
      )}

      <div style={{ padding: 18 }}>
        {/* score row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span aria-hidden="true" style={{ fontSize: 17, letterSpacing: 2 }}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
          <span style={statChip}>Tested <b style={{ color: THEME.greenText }}>{solvedCount}/{TOTAL}</b></span>
          <span style={statChip}>Mistakes <b style={{ color: wrong === 0 ? THEME.greenText : THEME.amberText }}>{wrong}</b></span>
        </div>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* LEFT: the phenomenon (glass) — always visible, both modes */}
          <div style={{ flex: '1 1 280px', minWidth: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', background: cardBg, border: `1px solid ${subtle}`, borderRadius: 20, padding: '18px 14px', boxShadow: '0 10px 28px -16px rgba(40,40,90,.35)' }}>
            {/* mascot */}
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 26, display: 'inline-block', animation: reduced ? undefined : `idle-${uid} 3s ease-in-out infinite` }}>🧑‍🔬</span>
              <span style={{ fontSize: 13, color: textCol, fontWeight: 600 }}>{activeRow.phase === 'stirring' ? 'Stirring…' : activeRow.phase === 'done' ? 'What did you see?' : activeRow.phase === 'added' ? 'Now stir it!' : 'Pick a material'}</span>
            </div>

            <Glass mat={activeRow.phase === 'empty' ? null : activeMat} phase={activeRow.phase} stirT={activeRow.stirT} reduced={reduced} uid={uid} big />

            {/* stir progress + readout (both modes) */}
            <div style={{ width: '100%', marginTop: 12 }}>
              <div style={{ height: 8, borderRadius: 999, background: subtle, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round((activeRow.phase === 'done' ? 1 : activeRow.stirT) * 100)}%`, background: `linear-gradient(90deg,${THEME.waterDeep},${THEME.primary})`, borderRadius: 999, transition: reduced ? 'none' : 'width .15s linear' }} />
              </div>
              {activeRow.phase === 'done' && (
                <div style={{ marginTop: 10, textAlign: 'center', fontSize: 14, fontWeight: 700, color: activeMat.correct === 'dissolves' ? THEME.greenText : THEME.amberText, animation: reduced ? undefined : `pop-${uid} .35s ease` }}>
                  {activeMat.correct === 'dissolves' ? '💧 It vanished — the water is clear!' : '🪨 It stayed visible / settled at the bottom.'}
                </div>
              )}
            </div>

            {/* action buttons for the active material (student mode only) */}
            {!isAI && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14, width: '100%', justifyContent: 'center' }}>
                <PillButton variant="contained" small disabled={activeRow.phase !== 'empty'} onClick={() => addToWater(activeId)}>＋ Add to water</PillButton>
                <PillButton variant="accent" small disabled={activeRow.phase === 'empty' || activeRow.phase === 'stirring'} onClick={() => stir(activeId)}>🥄 Stir</PillButton>
              </div>
            )}

            {/* verdict for active material */}
            {activeRow.phase === 'done' && (
              <div style={{ width: '100%', marginTop: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: textCol, marginBottom: 6, textAlign: 'center' }}>Your verdict for {activeMat.name}:</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <VerdictBtn v="dissolves" mat={activeMat} row={activeRow} />
                  <VerdictBtn v="does_not" mat={activeMat} row={activeRow} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: material chooser + status */}
          <div style={{ flex: '1 1 300px', minWidth: 260 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: textCol, marginBottom: 8 }}>Materials to test</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
              {MATERIALS.map((m, i) => {
                const r = rows[m.id];
                const isActive = m.id === activeId;
                const solved = r.correctVerdict === true;
                const glow = highlightId === m.id;
                return (
                  <button key={m.id} type="button"
                    onClick={() => { if (isAI) return; setActiveId(m.id); activeRef.current = m.id; playCue('tap'); setAnnounce(`Selected ${m.name}.`); }}
                    disabled={isAI}
                    aria-pressed={isActive}
                    style={{
                      fontFamily: THEME.font, textAlign: 'left', cursor: isAI ? 'default' : 'pointer',
                      background: solved ? THEME.greenSoft : isActive ? (dark ? '#34344a' : THEME.ghost) : cardBg,
                      border: `2px solid ${solved ? THEME.green : isActive ? THEME.primary : subtle}`,
                      borderRadius: 14, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 3,
                      transition: reduced ? 'none' : 'all .16s ease',
                      animation: glow && !reduced ? `glowPulse-${uid} 1.1s ease 2` : (!reduced ? `cardIn-${uid} .4s ease both ${Math.min(i, 6) * 0.05}s` : undefined),
                      boxShadow: isActive ? '0 6px 16px -8px rgba(74,77,201,.5)' : 'none',
                    }}>
                    <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">{m.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#E8E8F0' : THEME.deep }}>{m.name}</span>
                    <span style={{ fontSize: 11, color: textCol, opacity: .85 }}>
                      {solved ? `✓ ${VERDICT_LABEL[m.correct]}` : r.phase === 'done' ? 'Stirred — decide' : r.phase === 'added' ? 'In water' : 'Not tested'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* status banner */}
            <div role="status" key={announce} style={{ marginTop: 14, padding: '11px 13px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.4, background: finished ? THEME.greenSoft : (dark ? '#2c2c3c' : THEME.cream), color: finished ? THEME.greenText : textCol, border: `1px solid ${finished ? THEME.green : (dark ? '#3a3a4a' : '#f0d9b8')}`, animation: reduced ? undefined : `bannerIn-${uid} .25s ease both` }}>
              <span aria-hidden="true" style={{ marginRight: 6 }}>{finished ? '🎉' : solvedCount > 0 ? '✓' : '🔎'}</span>{announce}
            </div>

            {/* mini legend */}
            <div style={{ marginTop: 12, fontSize: 12, color: textCol, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span><b style={{ color: THEME.greenText }}>Soluble</b> = disappears in water</span>
              <span><b style={{ color: THEME.amberText }}>Insoluble</b> = stays visible</span>
            </div>
          </div>
        </div>

        {/* completion card + confetti */}
        {finished && (
          <div role="status" style={{ position: 'relative', marginTop: 16, padding: '22px 18px', borderRadius: 20, textAlign: 'center', background: dark ? 'linear-gradient(135deg,#2b2b3d,#23332b)' : 'linear-gradient(135deg,#FFF8EE,#E9F7EF)', border: `2px solid ${THEME.green}`, boxShadow: '0 14px 34px -12px rgba(34,197,94,.4)', animation: reduced ? undefined : `resultIn-${uid} .45s cubic-bezier(.2,.7,.3,1.25) both`, overflow: 'hidden' }}>
            {!reduced && Array.from({ length: 22 }).map((_, i) => {
              const c = ['#FF7212', '#4A4DC9', '#22C55E', '#FC9145', '#533086'][i % 5];
              return <span key={i} aria-hidden="true" style={{ position: 'absolute', top: -10, left: `${4 + (i * 4.3) % 92}%`, width: 8, height: 12, background: c, borderRadius: 2, animation: `conf-${uid} ${1.1 + (i % 5) * 0.25}s ease-in ${(i % 7) * 0.08}s both` }} />;
            })}
            <div aria-hidden="true" style={{ fontSize: 44, letterSpacing: 6 }}>
              {[0, 1, 2].map(i => <span key={i} style={{ display: 'inline-block', opacity: i < stars ? 1 : .35, filter: i < stars ? 'none' : 'grayscale(1)', animation: (reduced || i >= stars) ? undefined : `starpop-${uid} .5s ease both ${0.12 + i * 0.14}s` }}>{i < stars ? '⭐' : '☆'}</span>)}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: dark ? '#E8E8F0' : THEME.deep, marginTop: 8 }}>🎉 All five materials tested!</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              <span style={statChip}>Correct <b style={{ color: THEME.greenText }}>{TOTAL}/{TOTAL}</b></span>
              <span style={statChip}>Mistakes <b style={{ color: wrong === 0 ? THEME.greenText : THEME.amberText }}>{wrong}</b></span>
              <span style={statChip}>Stars <b>{stars}/3</b></span>
            </div>
            <div style={{ fontSize: 13.5, color: textCol, marginTop: 12, maxWidth: 520, marginInline: 'auto' }}>
              Soluble materials (sugar, salt) dissolve and vanish into a clear solution. Insoluble ones (chalk, sand, sawdust) stay visible and settle — stirring harder does not dissolve them.
            </div>
            {!isAI && <div style={{ marginTop: 14 }}><PillButton variant="accent" onClick={reset}>↻ Try again</PillButton></div>}
          </div>
        )}
      </div>

      {/* action bar — hidden in ai DEMO mode (§6.1) */}
      {!isAI && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '13px 18px', borderTop: `1px solid ${subtle}`, background: cardBg }}>
          <PillButton variant="outlined" onClick={reset}>{finished ? 'Start over' : 'Reset'}</PillButton>
          <span style={{ fontSize: 13, color: textCol }}>{solvedCount}/{TOTAL} materials tested correctly</span>
        </div>
      )}
    </div>
  );
};

function DissolveInWaterTool(p: ToolProps) {
  return <ToolErrorBoundary><DissolveTool {...p} /></ToolErrorBoundary>;
}

try { if (typeof window !== "undefined") (window as any).__TOOL_COMPONENT__ = DissolveInWaterTool; } catch (e) {}
export default DissolveInWaterTool;
