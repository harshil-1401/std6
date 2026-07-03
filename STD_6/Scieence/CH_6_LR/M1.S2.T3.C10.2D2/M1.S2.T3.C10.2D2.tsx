/**
 * Tool: M1.S2.T3.C10.2D2 — "Drop test for bounce"
 * CBSE Grade 6 Science · Materials Around Us · beat: Apply · concept: M1.S2.T3.C10
 *
 * CONCEPT (preserved from the original ball_bounce_tool): drop different balls — all the same size
 * but made of DIFFERENT materials — from the same fixed height, watch them bounce, and read how high
 * each comes back up. The springy rubber tennis ball bounces highest (elastic), the soft foam ball
 * gives a medium bounce, and the hard cork cricket ball barely bounces. The MATERIAL decides how
 * elastic the object is. Answer key (which materials bounce / are most elastic) is preserved exactly.
 *
 * §3 AGENT-CONTROL CONTRACT: postMessage bus + window.__TOOL__. Standard verbs (setParam, play, pause,
 *   reset, highlight, getState, setOperatorMode) PLUS tool verbs that mirror student actions:
 *     - select(id|[ids])  : choose a ball (single-drop mode)
 *     - drop(id|[ids])    : THE "do" verb — drops the ball(s) and runs the bounce; accepts one id OR an array
 *     - reveal(id|[ids])  : reveal+record a ball's measured bounce instantly (image_reveal style)
 *   Every verb produces the same visible result as the student, is idempotent-safe, emits {type:'event'}.
 *
 * §6.1 OPERATOR MODE: operatorMode 'ai'|'student' (default 'student') via props, setParam('operatorMode',…)
 *   + setOperatorMode(mode). In 'ai' the tool becomes a focused DEMO — the drop arena (phenomenon) AND the
 *   bounce-height read-out / table STAY visible, but the student control bar + material swatches are hidden
 *   and inputs are inert (the agent drives via drop()/reveal()/highlight()). A 👩‍🏫 "watch" caption + chip show.
 *   Emits operator_mode_changed; reflected in getState().
 *
 * §7.3 SOUND: Web Audio synth cues (drop/correct/wrong/done), gated behind first gesture, never autoplaying;
 *   setParam('muted',…) + a visible 🔊/🔇 mute toggle.
 *
 * Hard constraint: ONLY global React + ReactDOM + Tailwind + Poppins from CDN. NO framer-motion / no imports.
 * All animation is CSS @keyframes / transitions / requestAnimationFrame. prefers-reduced-motion respected.
 */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ───────── Brand tokens ───────── */
const THEME = {
  font: "'Poppins','Segoe UI',system-ui,-apple-system,sans-serif",
  purple: '#533086', purpleSoft: '#C1C1EA', purpleWash: '#EFEDF7',
  primary: '#4A4DC9', accent: '#FC9145', accentSoft: '#FFF3E4',
  ink: '#2E2747', grey: '#4E4E4E', greyLine: '#E3E0EE',
  green: '#2E9E5B', greenSoft: '#E4F4EA', greenText: '#1F7A45',
  amber: '#E08A1E', amberSoft: '#FBEFD9', amberText: '#8A5310',
  red: '#C62828', redSoft: '#FFEBEE', redText: '#B71C1C',
  panel: '#FFFFFF', page: '#F5F5F5', light: '#EBEBEB',
  pill: 999, touch: 44,
};

const TOOL_ID = 'M1.S2.T3.C10.2D2';
const DROP_HEIGHT_CM = 100; // fixed release height

type Level = 'High' | 'Medium' | 'Low';
interface BallSpec {
  id: string; name: string; material: string;
  bounceFactor: number;   // fraction of drop height returned (0..1) — the answer key
  level: Level;           // bounce / elasticity level
  bounces: boolean;       // does it bounce meaningfully (is it elastic)?
  fill: string; fill2: string; stroke: string;
  art: 'tennis' | 'cricket' | 'exercise';
  note: string;
}

/* ANSWER KEY (preserved from the original Fig. 6.3 data):
   tennis (springy rubber) → High / most elastic; foam → Medium; cricket (hard cork) → Low / barely bounces. */
const BALLS: BallSpec[] = [
  { id: 'tennis', name: 'Tennis ball', material: 'Rubber + felt', bounceFactor: 0.62, level: 'High', bounces: true,
    fill: '#D4E157', fill2: '#AFB42B', stroke: '#827717', art: 'tennis',
    note: 'Springy rubber stores energy on impact and pushes the ball back up — it is the most elastic, so it bounces highest.' },
  { id: 'exercise', name: 'Hand exercise ball', material: 'Soft foam', bounceFactor: 0.30, level: 'Medium', bounces: true,
    fill: '#FFD54F', fill2: '#FFA000', stroke: '#E65100', art: 'exercise',
    note: 'Soft foam squashes a lot and absorbs some energy, giving a gentle, medium bounce.' },
  { id: 'cricket', name: 'Cricket ball', material: 'Cork + leather', bounceFactor: 0.18, level: 'Low', bounces: false,
    fill: '#C62828', fill2: '#8E0000', stroke: '#5A0000', art: 'cricket',
    note: 'Hard, dense cork barely deforms, so almost no energy returns — it is the least elastic and hardly bounces.' },
];
const BALL_BY_ID: Record<string, BallSpec> = Object.fromEntries(BALLS.map(b => [b.id, b]));
const TOTAL = BALLS.length;

/* ───────── reduced-motion ───────── */
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
  // a "bounce" cue rises in pitch with the bounce height so you HEAR which ball is most elastic
  const playCue = useCallback((kind: 'drop' | 'bounce' | 'correct' | 'wrong' | 'done', amount?: number) => {
    const ac = ctx(); if (!ac) return; const n = ac.currentTime;
    if (kind === 'drop') { tone(ac, 300, n, 0.10, 'triangle', 0.16); }
    else if (kind === 'bounce') { const f = 300 + (amount ?? 0.3) * 700; tone(ac, 240, n, 0.07, 'sine', 0.14); tone(ac, f, n + 0.06, 0.14, 'sine', 0.18); }
    else if (kind === 'correct') { tone(ac, 660, n, 0.12, 'sine', 0.2); tone(ac, 880, n + 0.09, 0.16, 'sine', 0.2); }
    else if (kind === 'wrong') { tone(ac, 200, n, 0.18, 'sine', 0.18); }
    else if (kind === 'done') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, n + i * 0.1, 0.22, 'triangle', 0.2)); }
  }, []);
  return { playCue, muted, setMuted };
}

/* ───────── easing ───────── */
function easeInQuad(t: number): number { return t * t; }
function easeOutQuad(t: number): number { return 1 - (1 - t) * (1 - t); }

/* ───────── inline SVG ball face ───────── */
function BallFace(props: { spec: BallSpec; size: number; squash: number; reduced: boolean }) {
  const { spec, size, squash, reduced } = props;
  const sx = 1 + squash * 0.55;
  const sy = 1 - squash;
  const gid = 'bg-' + spec.id, sid = 'sh-' + spec.id;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{
      display: 'block', transform: `scaleX(${sx}) scaleY(${sy})`, transformOrigin: '50% 100%',
      transition: reduced ? 'none' : 'transform 90ms linear', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.22))',
    }}>
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="75%"><stop offset="0%" stopColor={spec.fill} /><stop offset="100%" stopColor={spec.fill2} /></radialGradient>
        <radialGradient id={sid} cx="35%" cy="28%" r="40%"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${gid})`} stroke={spec.stroke} strokeWidth="2" />
      <ellipse cx="38" cy="34" rx="26" ry="20" fill={`url(#${sid})`} />
      {spec.art === 'tennis' && (<><path d="M14 30 Q50 52 14 74" fill="none" stroke="#FAFAFA" strokeWidth="4" strokeLinecap="round" /><path d="M86 26 Q50 48 86 70" fill="none" stroke="#FAFAFA" strokeWidth="4" strokeLinecap="round" /></>)}
      {spec.art === 'cricket' && (<><path d="M50 6 Q60 50 50 94" fill="none" stroke="#FFF3E0" strokeWidth="2" strokeDasharray="3 4" /><path d="M44 14 L40 20 M44 28 L40 34 M44 42 L40 48 M44 56 L40 62 M44 70 L40 76" stroke="#FFE0B2" strokeWidth="1.6" strokeLinecap="round" /><path d="M56 14 L60 20 M56 28 L60 34 M56 42 L60 48 M56 56 L60 62 M56 70 L60 76" stroke="#FFE0B2" strokeWidth="1.6" strokeLinecap="round" /></>)}
      {spec.art === 'exercise' && (<circle cx="50" cy="50" r="32" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.45" />)}
    </svg>
  );
}

/* ───────── pill button ───────── */
interface PillProps { variant?: 'contained' | 'outlined' | 'accent'; disabled?: boolean; onClick?: () => void; children: React.ReactNode; title?: string; }
const PillButton: React.FC<PillProps> = ({ variant = 'contained', disabled, onClick, children, title }) => {
  const [h, setH] = useState(false), [p, setP] = useState(false);
  const base: React.CSSProperties = { fontFamily: THEME.font, fontWeight: 700, fontSize: 14.5, borderRadius: THEME.pill, padding: '12px 22px', minHeight: THEME.touch, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .18s ease', border: '2px solid transparent', whiteSpace: 'nowrap' };
  let skin: React.CSSProperties;
  if (disabled) skin = { background: THEME.purpleSoft, color: '#fff' };
  else if (variant === 'accent') skin = { background: p ? '#d85e08' : THEME.accent, color: '#fff', transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(252,145,69,.34)' : 'none' };
  else if (variant === 'outlined') skin = { background: h ? THEME.purpleWash : 'transparent', color: THEME.purple, borderColor: THEME.purple };
  else skin = { background: p ? THEME.purple : h ? THEME.primary : THEME.purple, color: '#fff', transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(83,48,134,.30)' : 'none' };
  return <button type="button" title={title} disabled={disabled} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} style={{ ...base, ...skin }}>{children}</button>;
};

/* ───────── error boundary ───────── */
class ToolErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { if (this.state.err) return <div role="alert" style={{ fontFamily: THEME.font, padding: 24, background: THEME.accentSoft, borderRadius: 16, color: THEME.purple }}>Something went wrong loading this activity. Please reload.</div>; return this.props.children; }
}

interface ToolProps {
  props?: { width?: number; height?: number; themeColor?: string; darkMode?: boolean; operatorMode?: 'ai' | 'student'; muted?: boolean; additionalProps?: Record<string, any> };
  setStepDetails?: (d: { beat: string; stepIndex: number; totalSteps: number; state: Record<string, any> }) => void;
  stopAutoNext?: boolean; setStopAutoNext?: (v: boolean) => void;
}

interface Motion { top: number; squash: number; peak: number | null; }
function blankMotion(): Motion { return { top: 0, squash: 0, peak: null }; }

/* star tier by how many balls have been dropped/tested */
function starsFor(tested: number): number { return tested >= TOTAL ? 3 : tested >= 2 ? 2 : 1; }

const DropTest: React.FC<ToolProps> = ({ props = {}, setStepDetails }) => {
  const reduced = usePrefersReducedMotion();
  const uid = useMemo(() => 'dt' + Math.random().toString(36).slice(2, 8), []);
  const width = props.width || 0;
  const dark = !!props.darkMode;
  const accent = props.themeColor || THEME.purple;

  // §7.3 sound
  const { playCue, muted, setMuted } = useSound(!!props.muted);

  // §6.1 operator mode
  const initialMode: 'ai' | 'student' = props.operatorMode === 'ai' ? 'ai' : 'student';
  const [mode, setMode] = useState<'ai' | 'student'>(initialMode);
  const modeRef = useRef(mode); modeRef.current = mode;
  const isAI = mode === 'ai';

  const [selectedId, setSelectedId] = useState<string>(BALLS[0].id);
  const [activeIds, setActiveIds] = useState<string[]>(BALLS.map(b => b.id)); // shown in arena
  const [motion, setMotion] = useState<Record<string, Motion>>({});
  const [records, setRecords] = useState<Record<string, number>>({});        // measured bounce cm by id
  const [rings, setRings] = useState<{ id: number; ballId: string }[]>([]);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('Drop each ball from the same height and watch which materials bounce.');

  const rafRef = useRef<number | null>(null);
  const ringSeq = useRef(0);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordsRef = useRef(records); recordsRef.current = records;
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const selectedRef = useRef(selectedId); selectedRef.current = selectedId;

  const testedCount = Object.keys(records).length;
  const allTested = testedCount >= TOTAL;
  const isBusy = phase === 'running';

  /* ───────── emit / state ───────── */
  const emit = useCallback((msg: any) => { try { window.parent.postMessage(msg, '*'); } catch (e) {} }, []);
  const buildState = useCallback(() => ({
    selectedId: selectedRef.current,
    tested: Object.keys(recordsRef.current),
    records: { ...recordsRef.current },
    total: TOTAL,
    running: phaseRef.current === 'running',
    finished: Object.keys(recordsRef.current).length >= TOTAL,
    bestBouncer: 'tennis',
    operatorMode: modeRef.current,
  }), []);
  const pushState = useCallback(() => { const s = buildState(); emit({ type: 'state', state: s }); setStepDetails?.({ beat: 'Apply', stepIndex: 0, totalSteps: 1, state: s }); }, [buildState, emit, setStepDetails]);

  function cleanup() { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } }
  useEffect(() => cleanup, []);

  function spawnRing(ballId: string) {
    const rid = ringSeq.current++;
    setRings(r => r.concat([{ id: rid, ballId }]));
    setTimeout(() => setRings(r => r.filter(x => x.id !== rid)), 700);
  }

  /* ───────── core: animate a drop+bounce for a set of balls ───────── */
  const runDrop = useCallback((idsIn: string[]) => {
    const specs = idsIn.map(id => BALL_BY_ID[id]).filter(Boolean) as BallSpec[];
    if (!specs.length) return;
    cleanup();
    const ids = specs.map(s => s.id);
    setActiveIds(ids);
    setMotion(m => { const next = { ...m }; specs.forEach(s => { next[s.id] = blankMotion(); }); return next; });
    setPhase('running');
    if (!muted) playCue('drop');

    const timing: Record<string, { fall: number; rise: number; settle: number; total: number; bounce: number; rang: boolean }> = {};
    specs.forEach(s => {
      const bounce = s.bounceFactor;
      const fall = reduced ? 1 : 720, rise = reduced ? 1 : 660 * Math.sqrt(Math.max(0.05, bounce)), settle = reduced ? 1 : 280;
      timing[s.id] = { fall, rise, settle, total: fall + 90 + rise + settle, bounce, rang: false };
    });
    const maxTotal = Math.max(...specs.map(s => timing[s.id].total));
    const start = performance.now();

    function frame(now: number) {
      const t = now - start;
      setMotion(prev => {
        const next = { ...prev };
        specs.forEach(s => {
          const tm = timing[s.id]; const bounce = tm.bounce;
          let top: number, squash = 0; let peak: number | null = next[s.id] ? next[s.id].peak : null;
          if (t < tm.fall) { top = easeInQuad(t / tm.fall); }
          else if (t < tm.fall + 90) {
            top = 1; squash = bounce < 0.25 ? 0.14 : 0.3;
            if (!tm.rang && t - tm.fall < 40) { tm.rang = true; spawnRing(s.id); playCue('bounce', bounce); }
          } else if (t < tm.fall + 90 + tm.rise) { top = 1 - bounce * easeOutQuad((t - tm.fall - 90) / tm.rise); }
          else if (t < tm.total) { const p = (t - tm.fall - 90 - tm.rise) / tm.settle; top = (1 - bounce) + bounce * easeInQuad(p); peak = bounce; }
          else { top = 1; peak = bounce; }
          next[s.id] = { top, squash, peak };
        });
        return next;
      });
      if (t < maxTotal + 20) { rafRef.current = requestAnimationFrame(frame); }
      else {
        setMotion(prev => { const next = { ...prev }; specs.forEach(s => { next[s.id] = { top: 1, squash: 0, peak: timing[s.id].bounce }; }); return next; });
        commitRecords(specs);
        rafRef.current = null;
      }
    }
    rafRef.current = requestAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, reduced, playCue]);

  const commitRecords = useCallback((specs: BallSpec[]) => {
    setRecords(prev => {
      const next = { ...prev };
      specs.forEach(s => { next[s.id] = Math.round(DROP_HEIGHT_CM * s.bounceFactor); });
      recordsRef.current = next;
      const done = Object.keys(next).length;
      const top = specs.slice().sort((a, b) => b.bounceFactor - a.bounceFactor)[0];
      if (done >= TOTAL) {
        phaseRef.current = 'done'; setPhase('done'); playCue('done');
        setAnnounce('All three tested! The springy rubber tennis ball bounced highest — it is the most elastic. The hard cricket ball barely bounced.');
        emit({ type: 'event', name: 'completed', detail: { tested: done, total: TOTAL, bestBouncer: 'tennis' } });
      } else {
        phaseRef.current = 'done'; setPhase('done');
        const msg = top.bounces
          ? `${top.name}: ${top.note}`
          : `${top.name}: ${top.note}`;
        setAnnounce(`${msg}  (${done} of ${TOTAL} tested)`);
        emit({ type: 'event', name: 'measured', detail: { ids: specs.map(s => s.id), bounceCm: next } });
      }
      setTimeout(pushState, 0);
      return next;
    });
  }, [emit, pushState, playCue]);

  /* ───────── api verbs ───────── */
  const toArr = (x: any): string[] => Array.isArray(x) ? x.map(String) : [String(x)];
  const resolveIds = (raw: any): string[] => toArr(raw)
    .map(v => BALL_BY_ID[v] ? v : (BALLS.find(b => b.name.toLowerCase() === v.toLowerCase() || b.material.toLowerCase() === v.toLowerCase())?.id))
    .filter(Boolean) as string[];

  const select = useCallback((raw: any) => {
    const ids = resolveIds(raw); if (!ids.length) return;
    const id = ids[0];
    selectedRef.current = id; setSelectedId(id);
    setHighlightId(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    if (!reduced) highlightTimer.current = setTimeout(() => setHighlightId(null), 1400);
    playCue('drop');
    setAnnounce(`Selected the ${BALL_BY_ID[id].name.toLowerCase()}.`);
    emit({ type: 'event', name: 'selected', detail: { id } });
    setTimeout(pushState, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emit, pushState, playCue, reduced]);

  // THE "do" verb — drops ball(s); accepts a single id OR an array
  const drop = useCallback((raw?: any) => {
    if (phaseRef.current === 'running') return;
    const ids = raw == null ? [selectedRef.current] : resolveIds(raw);
    if (!ids.length) return;
    if (ids.length === 1) { selectedRef.current = ids[0]; setSelectedId(ids[0]); }
    emit({ type: 'event', name: 'dropped', detail: { ids } });
    runDrop(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emit, runDrop]);

  // reveal — record the measured bounce instantly (image_reveal style), no full animation
  const reveal = useCallback((raw?: any) => {
    const ids = raw == null ? BALLS.map(b => b.id) : resolveIds(raw);
    const specs = ids.map(id => BALL_BY_ID[id]).filter(Boolean) as BallSpec[];
    if (!specs.length) return;
    setActiveIds(prev => Array.from(new Set([...prev, ...specs.map(s => s.id)])));
    setMotion(m => { const next = { ...m }; specs.forEach(s => { next[s.id] = { top: 1, squash: 0, peak: s.bounceFactor }; }); return next; });
    commitRecords(specs);
    emit({ type: 'event', name: 'revealed', detail: { ids: specs.map(s => s.id) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitRecords, emit]);

  const play = useCallback(() => { drop(BALLS.map(b => b.id)); }, [drop]);
  const pause = useCallback(() => { cleanup(); setPhase('done'); }, []);

  const reset = useCallback(() => {
    cleanup();
    recordsRef.current = {}; phaseRef.current = 'idle';
    setRecords({}); setRings([]); setMotion({}); setPhase('idle');
    setActiveIds(BALLS.map(b => b.id));
    setHighlightId(null);
    setAnnounce('Reset. Drop each ball again and compare the bounce of each material.');
    emit({ type: 'event', name: 'reset' }); setTimeout(pushState, 0);
  }, [emit, pushState]);

  const highlight = useCallback((target: any) => {
    if (highlightTimer.current) { clearTimeout(highlightTimer.current); highlightTimer.current = null; }
    const ids = resolveIds(target);
    const id = ids[0] || null;
    setHighlightId(id);
    setAnnounce(id ? `Look at the ${BALL_BY_ID[id].name.toLowerCase()}.` : `Look here.`);
    playCue('drop');
    if (!reduced && id) highlightTimer.current = setTimeout(() => { setHighlightId(null); highlightTimer.current = null; }, 2200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, playCue]);

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
    else if (name === 'selected' || name === 'selectedId') select(value);
  }, [setMuted, setOperatorMode, select]);

  /* ───────── contract wiring ───────── */
  useEffect(() => {
    const api: Record<string, (...a: any[]) => any> = { setParam, play, pause, reset, highlight, getState, setOperatorMode, select, drop, reveal };
    (window as any).__TOOL__ = api;
    emit({ type: 'ready', toolId: TOOL_ID });
    const onMsg = (e: MessageEvent) => {
      const d = e.data; if (!d || d.type !== 'command') return;
      const fn = api[d.method]; let result;
      if (typeof fn === 'function') result = fn.apply(null, d.args || []);
      emit({ type: 'response', id: d.id, result: result === undefined ? api.getState() : result });
    };
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('message', onMsg); if ((window as any).__TOOL__ === api) delete (window as any).__TOOL__; };
  }, [setParam, play, pause, reset, highlight, getState, setOperatorMode, select, drop, reveal, emit]);

  /* ───────── scoped CSS ───────── */
  useEffect(() => {
    const el = document.createElement('style'); el.id = 'st-' + uid;
    const scroll = `.scroll-${uid}{scrollbar-width:thin;scrollbar-color:${THEME.purpleSoft} transparent;}
.scroll-${uid}::-webkit-scrollbar{width:9px;height:9px;}
.scroll-${uid}::-webkit-scrollbar-thumb{background:${THEME.purpleSoft};border-radius:999px;border:2px solid transparent;background-clip:content-box;}`;
    const kf = reduced ? '' : `@keyframes fadeUp-${uid}{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes ring-${uid}{0%{transform:scale(.4);opacity:.6}100%{transform:scale(2.4);opacity:0}}
@keyframes rowIn-${uid}{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
@keyframes glow-${uid}{0%,100%{box-shadow:0 0 0 0 rgba(83,48,134,0)}50%{box-shadow:0 0 0 6px rgba(83,48,134,.20)}}
@keyframes pop-${uid}{0%{transform:scale(.7)}70%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes resultIn-${uid}{0%{opacity:0;transform:scale(.85) translateY(10px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes starpop-${uid}{0%{opacity:0;transform:scale(.2) rotate(-25deg)}60%{transform:scale(1.25) rotate(8deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes confetti-${uid}{0%{transform:translateY(-10px) rotate(0);opacity:1}100%{transform:translateY(120px) rotate(360deg);opacity:0}}
@keyframes float-${uid}{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`;
    el.textContent = scroll + kf; document.head.appendChild(el);
    return () => { el.remove(); };
  }, [uid, reduced]);

  useEffect(() => { pushState(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); }, []);

  /* ───────── geometry ───────── */
  const stageH = width && width < 560 ? 290 : 380;
  const ballSize = width && width < 560 ? 42 : 58;
  const topPad = 30, floorY = stageH - 46, usable = floorY - ballSize - topPad;
  const ballYpx = (top: number) => topPad + top * usable;
  const peakYpx = (peak: number) => floorY - peak * usable - ballSize / 2;
  const dropLineY = topPad + ballSize / 2;

  const stageBalls = activeIds.map(id => BALL_BY_ID[id]).filter(Boolean) as BallSpec[];
  const laneCount = Math.max(1, stageBalls.length);
  const isSmall = !!(width && width < 560);

  const stars = starsFor(testedCount);
  const pageBg = dark ? '#1c1830' : THEME.page;
  const panelBg = dark ? '#272240' : THEME.panel;
  const inkClr = dark ? '#EDE9FA' : THEME.ink;
  const greyClr = dark ? '#B9B3CE' : THEME.grey;
  const lineClr = dark ? '#3a3358' : THEME.greyLine;

  const levelColors = (lvl: Level) => lvl === 'High' ? { c: THEME.greenText, b: THEME.greenSoft } : lvl === 'Medium' ? { c: THEME.amberText, b: THEME.amberSoft } : { c: THEME.redText, b: THEME.redSoft };

  return (
    <div style={{ fontFamily: THEME.font, maxWidth: width ? width : 1000, margin: '0 auto', background: pageBg, borderRadius: 24, boxShadow: '0 20px 50px -20px rgba(83,48,134,.35)', overflow: 'hidden', color: inkClr }}>
      {/* header */}
      <div style={{ background: `linear-gradient(90deg, ${accent}, ${THEME.accent})`, color: '#fff', padding: '20px 24px', position: 'relative' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600, opacity: .92 }}>Activity · Drop test for bounce</div>
        <h1 style={{ margin: '4px 0 2px', fontSize: isSmall ? 20 : 24, fontWeight: 700 }}>Which materials bounce?</h1>
        <p style={{ margin: 0, fontSize: 13.5, opacity: .95, maxWidth: 620 }}>Same size, different materials. Drop each ball from the same height and watch which one springs back highest — that one is the most <b>elastic</b>.</p>
        <div style={{ position: 'absolute', top: 14, right: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span aria-label={isAI ? 'Teacher is showing' : 'Your turn'} title={isAI ? 'Teacher is showing' : 'Your turn'} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.18)', borderRadius: THEME.pill, padding: '4px 10px' }}>{isAI ? '👩‍🏫 Teacher' : '🙋 Your turn'}</span>
          <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'} title={muted ? 'Unmute' : 'Mute'} style={{ fontSize: 15, lineHeight: 1, cursor: 'pointer', color: '#fff', background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 999, width: 30, height: 30 }}>{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>

      {/* a11y live region */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>{announce}</div>

      {/* §6.1 watch caption (ai only) */}
      {isAI && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 18px 0', padding: '10px 14px', borderRadius: 12, background: THEME.purpleWash, color: THEME.purple, fontSize: 14, fontWeight: 600 }}>
          <span aria-hidden="true" style={{ fontSize: 18, animation: reduced ? undefined : `float-${uid} 2.4s ease-in-out infinite` }}>👩‍🏫</span>
          Your teacher is dropping the balls — watch which materials bounce, you'll get a turn.
        </div>
      )}

      <div style={{ padding: 18, animation: reduced ? undefined : `fadeUp-${uid} .5s ease both` }}>
        {/* score row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <span aria-hidden="true" style={{ fontSize: 18, letterSpacing: 2 }}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.purple, background: '#fff', border: `2px solid ${THEME.light}`, borderRadius: THEME.pill, padding: '4px 12px' }}>Tested: {testedCount}/{TOTAL}</span>
          {records.tennis != null && <span style={{ fontSize: 13, fontWeight: 700, color: THEME.greenText, background: THEME.greenSoft, borderRadius: THEME.pill, padding: '4px 12px' }}>🏆 Highest: Tennis</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {/* arena panel */}
          <div style={{ background: panelBg, borderRadius: 18, padding: 16, boxShadow: '0 6px 20px rgba(46,39,71,0.06)', border: `1px solid ${lineClr}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: THEME.purple }}>The drop test</div>

            <div style={{ position: 'relative', height: stageH, borderRadius: 14, background: dark ? 'linear-gradient(180deg,#322b52,#241f3c)' : 'linear-gradient(180deg,#FBFAFF 0%, #F1EEFA 100%)', overflow: 'hidden', border: `1px solid ${lineClr}` }}>
              {/* drop-height chip */}
              <div style={{ position: 'absolute', left: 8, top: 6, zIndex: 3, fontSize: 10, fontWeight: 700, color: '#fff', background: THEME.purple, borderRadius: 6, padding: '2px 7px', pointerEvents: 'none' }}>Drop height · {DROP_HEIGHT_CM} cm</div>
              {/* release guide */}
              <div style={{ position: 'absolute', left: 8, right: 8, top: dropLineY, borderTop: `2px dashed ${THEME.purpleSoft}`, pointerEvents: 'none' }} />

              {stageBalls.map((b, idx) => {
                const m = motion[b.id] || blankMotion();
                const laneW = 100 / laneCount;
                const showPeak = m.peak != null && (phase === 'running' || phase === 'done');
                const measuredCm = m.peak != null ? Math.round(DROP_HEIGHT_CM * m.peak) : null;
                const hl = highlightId === b.id;
                return (
                  <div key={b.id} style={{ position: 'absolute', left: laneW * idx + '%', top: 0, width: laneW + '%', height: '100%' }}>
                    {showPeak && (
                      <div style={{ position: 'absolute', left: '12%', right: '12%', top: peakYpx(m.peak as number), borderTop: `2px dashed ${b.stroke}`, pointerEvents: 'none', transition: reduced ? 'none' : 'top .3s ease' }}>
                        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: -9, fontSize: 9.5, fontWeight: 700, color: '#fff', background: b.stroke, borderRadius: 5, padding: '1px 5px', whiteSpace: 'nowrap' }}>{measuredCm} cm</span>
                      </div>
                    )}
                    {rings.filter(rg => rg.ballId === b.id).map(rg => (
                      <div key={rg.id} style={{ position: 'absolute', left: '50%', top: floorY, width: ballSize, height: ballSize / 2, marginLeft: -ballSize / 2, borderRadius: '50%', border: `3px solid ${b.stroke}`, opacity: 0.6, transform: 'scale(0.4)', animation: reduced ? undefined : `ring-${uid} .65s ease-out forwards` }} />
                    ))}
                    <div style={{ position: 'absolute', left: '50%', top: ballYpx(m.top), marginLeft: -ballSize / 2, width: ballSize, height: ballSize, borderRadius: hl ? 18 : 0, boxShadow: hl ? `0 0 0 4px ${THEME.purpleSoft}` : 'none', transition: reduced ? 'none' : 'box-shadow .2s ease' }}>
                      <BallFace spec={b} size={ballSize} squash={m.squash} reduced={reduced} />
                    </div>
                    {laneCount > 1 && (
                      <div style={{ position: 'absolute', left: '8%', right: '8%', top: floorY + 12, textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: THEME.purple, background: '#fff', borderRadius: 6, padding: '3px 2px', boxShadow: '0 1px 3px rgba(46,39,71,0.12)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.name.replace(' ball', '').replace('Hand exercise', 'Foam')}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ position: 'absolute', left: 0, right: 0, top: floorY, height: 46, background: 'repeating-linear-gradient(45deg,#E6E1F4,#E6E1F4 8px,#DCD6EE 8px,#DCD6EE 16px)', borderTop: `2px solid ${THEME.purpleSoft}` }} />
            </div>

            {/* material swatches (student only) */}
            {!isAI && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BALLS.length}, minmax(0,1fr))`, gap: 10, marginTop: 12 }}>
                {BALLS.map(b => {
                  const active = b.id === selectedId;
                  return (
                    <button key={b.id} type="button" onClick={() => { if (!isBusy) select(b.id); }} disabled={isBusy} style={{ cursor: isBusy ? 'default' : 'pointer', borderRadius: 14, padding: 10, textAlign: 'center', border: `2px solid ${active ? THEME.purple : lineClr}`, background: active ? THEME.purpleWash : (dark ? '#2f294c' : '#fff'), transition: 'all .2s ease', animation: (active && !reduced) ? `glow-${uid} 1.6s ease-in-out infinite` : 'none', color: inkClr }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}><BallFace spec={b} size={isSmall ? 30 : 38} squash={0} reduced={reduced} /></div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, lineHeight: 1.2 }}>{b.name}</div>
                      <div style={{ fontSize: 10.5, color: greyClr, marginTop: 2 }}>{b.material}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* controls (student only; phenomenon stays in ai mode) */}
            {!isAI && (
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <PillButton onClick={() => drop(selectedId)} disabled={isBusy}>{isBusy ? 'Dropping…' : `Drop the ${BALL_BY_ID[selectedId].name.toLowerCase()}`}</PillButton>
                <PillButton variant="accent" onClick={() => drop(BALLS.map(b => b.id))} disabled={isBusy}>Drop all together</PillButton>
                <PillButton variant="outlined" onClick={reset}>↻ Reset</PillButton>
              </div>
            )}

            {/* note / phenomenon read-out (BOTH modes) */}
            <div role="status" key={announce} style={{ marginTop: 12, fontSize: 13.5, color: greyClr, background: phase === 'done' && allTested ? THEME.greenSoft : THEME.accentSoft, borderRadius: 12, padding: '10px 12px', lineHeight: 1.45, borderLeft: `4px solid ${phase === 'done' && allTested ? THEME.green : THEME.accent}` }}>
              <span aria-hidden="true" style={{ marginRight: 6 }}>{allTested ? '🎉' : phase === 'running' ? '⏬' : '🔎'}</span>{announce}
            </div>
          </div>

          {/* results table panel (read-out — BOTH modes) */}
          <div style={{ background: panelBg, borderRadius: 18, padding: 16, boxShadow: '0 6px 20px rgba(46,39,71,0.06)', border: `1px solid ${lineClr}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: THEME.purple }}>Bounce of each material</div>
            <div className={`scroll-${uid}`} style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: isSmall ? 320 : 0 }}>
                <thead>
                  <tr>
                    {['Ball', 'Material', 'Bounce height', 'Level'].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 3 ? 'right' : 'left', fontWeight: 700, color: '#fff', background: THEME.purple, padding: '10px', borderTopLeftRadius: i === 0 ? 10 : 0, borderTopRightRadius: i === 3 ? 10 : 0 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BALLS.map((b, i) => {
                    const rec = records[b.id]; const tested = rec != null; const lc = levelColors(b.level);
                    return (
                      <tr key={b.id} style={{ background: b.id === selectedId && !isAI ? THEME.purpleWash : 'transparent', animation: (tested && !reduced) ? `rowIn-${uid} .4s ease ${i * 0.05}s both` : 'none' }}>
                        <td style={{ padding: '10px', borderBottom: `1px solid ${lineClr}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BallFace spec={b} size={24} squash={0} reduced={reduced} /><span style={{ fontWeight: 600 }}>{b.name}</span></div>
                        </td>
                        <td style={{ padding: '10px', borderBottom: `1px solid ${lineClr}`, color: greyClr }}>{b.material}</td>
                        <td style={{ padding: '10px', borderBottom: `1px solid ${lineClr}`, textAlign: 'right', fontWeight: 700 }}>{tested ? `${rec} cm` : '—'}</td>
                        <td style={{ padding: '10px', borderBottom: `1px solid ${lineClr}`, textAlign: 'right' }}>
                          {tested ? <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: lc.c, background: lc.b }}>{b.level}</span> : <span style={{ color: lineClr }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11.5, color: greyClr, marginTop: 12, lineHeight: 1.4 }}>
              The ball that comes back up the highest bounces the most. It is made of springy rubber — the <b>material</b> an object is made of decides how elastic it is.
            </div>
          </div>
        </div>

        {/* celebration card */}
        {allTested && (
          <div role="status" style={{ position: 'relative', marginTop: 16, padding: '24px 20px', borderRadius: 20, textAlign: 'center', background: 'linear-gradient(135deg,#FFF8EE,#E9F7EF)', border: `2px solid ${THEME.green}`, boxShadow: '0 14px 34px -12px rgba(46,158,91,.4)', overflow: 'hidden', animation: reduced ? undefined : `resultIn-${uid} .45s cubic-bezier(.2,.7,.3,1.25) both` }}>
            {!reduced && Array.from({ length: 14 }).map((_, i) => (
              <span key={i} aria-hidden="true" style={{ position: 'absolute', top: 0, left: `${6 + i * 6.5}%`, width: 8, height: 12, borderRadius: 2, background: [THEME.accent, THEME.purple, THEME.green, '#FFD54F'][i % 4], animation: `confetti-${uid} ${1 + (i % 5) * 0.25}s ease-in ${i * 0.06}s infinite` }} />
            ))}
            <div aria-hidden="true" style={{ fontSize: 44, lineHeight: 1, letterSpacing: 6 }}>
              {[0, 1, 2].map(i => <span key={i} style={{ display: 'inline-block', opacity: i < stars ? 1 : 0.35, filter: i < stars ? 'none' : 'grayscale(1)', animation: (reduced || i >= stars) ? undefined : `starpop-${uid} .5s ease both ${0.12 + i * 0.14}s` }}>{i < stars ? '⭐' : '☆'}</span>)}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: THEME.purple, marginTop: 10 }}>🎉 Drop test complete!</div>
            <div style={{ fontSize: 14.5, color: THEME.grey, marginTop: 8, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>The <b>rubber tennis ball</b> bounced highest — it is the most <b>elastic</b>. The hard <b>cricket ball</b> barely bounced. The material decides the bounce!</div>
            {!isAI && <div style={{ marginTop: 16 }}><PillButton variant="accent" onClick={reset}>↻ Try again</PillButton></div>}
          </div>
        )}
      </div>
    </div>
  );
};

function DropTestTool(p: ToolProps) { return <ToolErrorBoundary><DropTest {...p} /></ToolErrorBoundary>; }
try { if (typeof window !== "undefined") (window as any).__TOOL_COMPONENT__ = DropTestTool; } catch (e) {}
export default DropTestTool;
