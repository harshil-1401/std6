/**
 * Tool: M1.S2.T2.C5.2D1 — "Group objects by a property"  (sorter)
 * CBSE Grade 6 Science · Materials Around Us · Activity 6.2 "Let us group"
 * concept: M1.S2.T2.C5 — Classification of objects by a common property (the MATERIAL they are made of).
 *
 * PRESERVES the original tool's concept, item set, and answer key: 12 everyday objects sorted into
 * four MATERIAL bins (Metal / Wood / Plastic / Clay). Immediate validation — only the correct bin
 * accepts a card; a wrong bin shakes (no lock). Finishes with a first-try score, stars and confetti,
 * then a concept review of any objects that took more than one try.
 *
 * RETROFIT to the 2D authoring spec:
 *  - Single-file, self-contained. Only runtime dep is global React (renderer strips imports; NO framer-motion).
 *    All motion is CSS transitions / @keyframes / requestAnimationFrame.
 *  - §3 Agent-control contract: postMessage bus ({type:'command',id,method,args} → {type:'response',id,result})
 *    + window.__TOOL__ ; emits {type:'ready'}, {type:'state'}, {type:'event'}. Verbs: setParam, play, pause,
 *    reset, highlight(target), getState, setOperatorMode(mode), AND the sorter "do" verb placeCard(arg) which
 *    accepts a SINGLE object id OR an ARRAY of ids (each routed to its correct bin so the agent can credit
 *    several at once). select(id), sort(arg) alias placeCard.
 *  - §6.1 operatorMode 'ai'|'student' (default 'student'): in 'ai' the student tray/controls are hidden and
 *    inert (agent drives via placeCard/highlight), the bins + read-out stay visible, a 👩‍🏫 "watch" caption +
 *    chip show; emits operator_mode_changed; reflected in getState().
 *  - §7.3 Web Audio sound: synth cues (tap/correct/wrong/done) gated behind first gesture; mute toggle.
 *  - §7 Premium visuals: layered gradient cards, soft shadows, Poppins type scale, themeColor palette,
 *    darkMode, staggered entrance, springy CSS easings, count-up score, confetti, a friendly mascot, and
 *    prefers-reduced-motion respected. Every control is styled (no raw HTML buttons).
 */
const { useState, useEffect, useRef, useMemo, useCallback } = React; // React/ReactDOM are renderer globals

let __uidSeq = 0;
const useId = typeof React.useId === 'function' ? React.useId : function () { const r = useRef(null); if (r.current == null) r.current = 'uid' + (++__uidSeq); return r.current; };

const TOOL_ID = 'M1.S2.T2.C5.2D1';

/* ───────── theme tokens (palette derives from props.themeColor) ───────── */
function buildTheme(themeColor: string, dark: boolean) {
  const primary = themeColor || '#4A4DC9';
  return {
    font: "'Poppins','Segoe UI',system-ui,-apple-system,sans-serif",
    primary,
    primaryDark: '#533086',
    accent: '#FF7212',
    accentDark: '#FC9145',
    success: '#2E9E5B',
    successText: dark ? '#7BE0A4' : '#1F7A45',
    danger: '#E53E3E',
    pill: 999, touch: 48, card: 16,
    // surfaces flip for dark mode
    bg: dark ? '#15151F' : '#F5F5F7',
    panel: dark ? '#1F2030' : '#FFFFFF',
    panelSoft: dark ? '#262842' : '#F2F2FA',
    ink: dark ? '#F2F2F7' : '#1A1A2E',
    inkSoft: dark ? '#B8B8CC' : '#4E4E4E',
    line: dark ? '#33344A' : '#EBEBEB',
    trayLine: dark ? '#3A3B55' : '#E2E2EE',
  };
}

/* ───────── domain data (preserved from the original tool) ───────── */
type MaterialKey = 'metal' | 'wood' | 'plastic' | 'clay';
interface BinDef { key: MaterialKey; label: string; emoji: string; color: string; soft: string; softDark: string; }
interface ObjItem { id: string; label: string; emoji: string; material: MaterialKey; why: string; }

const BINS: BinDef[] = [
  { key: 'metal',   label: 'Metal',   emoji: '⚙️', color: '#4A4DC9', soft: '#EDEDF8', softDark: '#262747' },
  { key: 'wood',    label: 'Wood',    emoji: '🌳', color: '#166534', soft: '#E7F1EA', softDark: '#1E3528' },
  { key: 'plastic', label: 'Plastic', emoji: '♻️', color: '#0891B2', soft: '#E2F4F8', softDark: '#143844' },
  { key: 'clay',    label: 'Clay',    emoji: '🏺', color: '#DB2777', soft: '#FBE7F1', softDark: '#3E1830' },
];
const BIN_BY_KEY: Record<MaterialKey, BinDef> = Object.fromEntries(BINS.map(b => [b.key, b])) as any;

const OBJECTS: ObjItem[] = [
  { id: 'key',    label: 'Key',              emoji: '🔑', material: 'metal',
    why: 'A key is hard, heavy for its size and shiny — clear signs of metal, like iron and brass.' },
  { id: 'coin',   label: 'Coin',             emoji: '🪙', material: 'metal',
    why: 'Coins are made of metal — they are shiny, hard, and clink when they drop.' },
  { id: 'bolt',   label: 'Iron bolt',        emoji: '🔩', material: 'metal',
    why: 'An iron bolt is hard and can rust in the rain — both are signs that it is metal.' },
  { id: 'pencil', label: 'Pencil',           emoji: '✏️', material: 'wood',
    why: "A pencil's body is carved from wood — it is light, not shiny, and easy to sharpen." },
  { id: 'board',  label: 'Wooden board',     emoji: '🪵', material: 'wood',
    why: 'A board cut from a tree is wood — it floats, feels rough, and does not shine like metal.' },
  { id: 'bat',    label: 'Cricket bat',      emoji: '🏏', material: 'wood',
    why: 'A cricket bat is shaped from willow wood — light and strong, perfect for hitting the ball.' },
  { id: 'bottle', label: 'Plastic bottle',   emoji: '🧴', material: 'plastic',
    why: 'A bottle that is light, bendy and waterproof is plastic — not glass or metal.' },
  { id: 'bucket', label: 'Bucket',           emoji: '🪣', material: 'plastic',
    why: 'A bucket that is light, colourful and never rusts is made of plastic.' },
  { id: 'cup',    label: 'Plastic cup',      emoji: '🥤', material: 'plastic',
    why: 'A disposable cup that is light and bends a little when you squeeze it is plastic.' },
  { id: 'diya',   label: 'Clay lamp (diya)', emoji: '🪔', material: 'clay',
    why: 'A diya is shaped from soft clay and then baked hard — baked clay is called terracotta.' },
  { id: 'pot',    label: 'Clay pot',         emoji: '🏺', material: 'clay',
    why: 'An earthen pot is clay shaped on a wheel and baked — like pottery from the Sindhu-Sarasvatī Civilisation.' },
  { id: 'brick',  label: 'Brick',            emoji: '🧱', material: 'clay',
    why: "A brick is clay baked in a kiln until it is hard — that is why the textbook calls a brick 'baked clay'." },
];
const OBJ_BY_ID: Record<string, ObjItem> = Object.fromEntries(OBJECTS.map(o => [o.id, o]));
const TOTAL = OBJECTS.length; // 12

/* ───────── deterministic shuffle (fresh order each play, no Math.random for content) ───────── */
function mulberry32(a: number) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededShuffle<T>(arr: T[], seed: number): T[] { const r = mulberry32(seed); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

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
  const playCue = useCallback((kind: 'tap' | 'correct' | 'wrong' | 'done') => {
    const ac = ctx(); if (!ac) return; const n = ac.currentTime;
    if (kind === 'tap') { tone(ac, 420, n, 0.09, 'triangle', 0.16); }
    else if (kind === 'correct') { tone(ac, 660, n, 0.12, 'sine', 0.2); tone(ac, 880, n + 0.09, 0.16, 'sine', 0.2); }
    else if (kind === 'wrong') { tone(ac, 200, n, 0.18, 'sine', 0.18); }
    else if (kind === 'done') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, n + i * 0.1, 0.22, 'triangle', 0.2)); }
  }, []);
  return { playCue, muted, setMuted };
}

/* ───────── animated count-up ───────── */
function useCountUp(target: number, run: boolean, reduced: boolean, ms = 1000) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) { setVal(0); return; }
    if (reduced) { setVal(target); return; }
    let raf = 0; const start = performance.now();
    const tick = (now: number) => { const t = Math.min((now - start) / ms, 1); const e = 1 - Math.pow(1 - t, 3); setVal(Math.round(e * target)); if (t < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, run, reduced, ms]);
  return val;
}

/* ───────── styled pill button ───────── */
interface PillProps { variant?: 'contained' | 'outlined' | 'accent'; disabled?: boolean; onClick?: () => void; children: React.ReactNode; T: any; }
const PillButton: React.FC<PillProps> = ({ variant = 'contained', disabled, onClick, children, T }) => {
  const [h, setH] = useState(false), [p, setP] = useState(false);
  const base: React.CSSProperties = { fontFamily: T.font, fontWeight: 700, fontSize: 15, borderRadius: T.pill, padding: '12px 24px', minHeight: T.touch, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .18s ease', border: '2px solid transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, lineHeight: 1 };
  let skin: React.CSSProperties;
  if (disabled) skin = { background: '#CACACA', color: '#fff' };
  else if (variant === 'accent') skin = { background: p ? T.accentDark : T.accent, color: '#fff', transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(255,114,18,.34)' : '0 3px 10px rgba(255,114,18,.22)' };
  else if (variant === 'outlined') skin = { background: h ? T.panelSoft : 'transparent', color: T.primary, borderColor: T.primary };
  else skin = { background: p ? T.primaryDark : T.primary, color: '#fff', transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(74,77,201,.30)' : '0 3px 10px rgba(74,77,201,.20)' };
  return <button type="button" disabled={disabled} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} style={{ ...base, ...skin }}>{children}</button>;
};

/* ───────── mascot (idle float + reactive expression) ───────── */
const Mascot: React.FC<{ mood: 'idle' | 'happy' | 'oops' | 'cheer'; reduced: boolean; uid: string }> = ({ mood, reduced, uid }) => {
  const face = mood === 'cheer' ? '🥳' : mood === 'happy' ? '😄' : mood === 'oops' ? '🤔' : '🦉';
  return (
    <span aria-hidden="true" style={{ fontSize: 30, lineHeight: 1, display: 'inline-block', animation: reduced ? undefined : (mood === 'happy' || mood === 'cheer') ? `gobj-bounce-${uid} .5s ease` : mood === 'oops' ? `gobj-shake-${uid} .4s ease` : `gobj-float-${uid} 3s ease-in-out infinite` }}>{face}</span>
  );
};

class ToolErrorBoundary extends React.Component<{ children: React.ReactNode; T: any }, { err: Error | null }> {
  constructor(props: any) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { if (this.state.err) return <div role="alert" style={{ fontFamily: this.props.T.font, padding: 24, background: this.props.T.panelSoft, borderRadius: 16, color: this.props.T.ink }}>Something went wrong loading this activity. Please reload.</div>; return this.props.children as any; }
}

interface ToolProps {
  props?: { width?: number; height?: number; themeColor?: string; darkMode?: boolean; operatorMode?: 'ai' | 'student'; muted?: boolean; additionalProps?: Record<string, any> };
  setStepDetails?: (d: { beat?: string; currentStep?: number; totalSteps?: number; isPaused?: boolean; currentMode?: string; state?: Record<string, any> }) => void;
  stopAutoNext?: boolean; setStopAutoNext?: (v: boolean) => void;
}

function starsFor(firstTryCount: number): number { const pct = firstTryCount / TOTAL; return pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1; }

/* =========================================================================
   Component
   ========================================================================= */
const GroupByProperty: React.FC<ToolProps> = ({ props = {}, setStepDetails }) => {
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/[:]/g, '');
  const T = useMemo(() => buildTheme(props.themeColor || '#4A4DC9', !!props.darkMode), [props.themeColor, props.darkMode]);
  const baseSeed = (((props.additionalProps && props.additionalProps.seed) ?? Date.now()) as number) >>> 0;

  const [shuffleNonce, setShuffleNonce] = useState(0);
  const ordered = useMemo(() => seededShuffle(OBJECTS, (baseSeed + shuffleNonce * 101) >>> 0), [baseSeed, shuffleNonce]);

  // placements: objId -> binKey. Only CORRECT placements are stored.
  const [placed, setPlaced] = useState<Record<string, MaterialKey>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<Record<string, number>>({});
  const [reject, setReject] = useState<{ id: string | null; bin: MaterialKey | null }>({ id: null, bin: null });
  const [finished, setFinished] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [phase, setPhase] = useState<'play' | 'review'>('play');
  const [announce, setAnnounce] = useState('Sort each object into the bin for the material it is made of.');
  const [mood, setMood] = useState<'idle' | 'happy' | 'oops' | 'cheer'>('idle');

  // §6.1 operator mode
  const initialMode: 'ai' | 'student' = props.operatorMode === 'ai' ? 'ai' : 'student';
  const [mode, setMode] = useState<'ai' | 'student'>(initialMode);
  const modeRef = useRef(mode); modeRef.current = mode;

  // §7.3 sound
  const { playCue, muted, setMuted } = useSound(!!props.muted);

  // refs mirror state for the imperative agent API
  const placedRef = useRef(placed); placedRef.current = placed;
  const mistakesRef = useRef(mistakes); mistakesRef.current = mistakes;
  const finishedRef = useRef(finished); finishedRef.current = finished;
  const selectedRef = useRef(selected); selectedRef.current = selected;
  const rejectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightBin, setHighlightBin] = useState<MaterialKey | null>(null);
  const [highlightObj, setHighlightObj] = useState<string | null>(null);
  const hlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placedCount = Object.keys(placed).length;
  const firstTry = OBJECTS.filter(o => placed[o.id] === o.material && !mistakes[o.id]).length;
  const tricky = ordered.filter(o => mistakes[o.id]);
  const stars = starsFor(firstTry);

  const flashMood = useCallback((m: 'happy' | 'oops' | 'cheer') => {
    setMood(m);
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood('idle'), m === 'cheer' ? 2600 : 700);
  }, []);

  const buildState = useCallback(() => ({
    placed: { ...placedRef.current },
    placedCount: Object.keys(placedRef.current).length,
    total: TOTAL,
    firstTry: OBJECTS.filter(o => placedRef.current[o.id] === o.material && !mistakesRef.current[o.id]).length,
    finished: finishedRef.current,
    operatorMode: modeRef.current,
  }), []);

  const emit = useCallback((msg: any) => { try { window.parent.postMessage(msg, '*'); } catch (e) {} }, []);
  const pushState = useCallback(() => {
    const s = buildState();
    emit({ type: 'state', state: s });
    setStepDetails?.({ beat: 'Apply', currentStep: s.placedCount, totalSteps: TOTAL, isPaused: finishedRef.current, currentMode: 'sort', state: s });
  }, [buildState, emit, setStepDetails]);

  /* ---- core place logic (shared by student + agent) ---- */
  const doPlace = useCallback((rawId: string): 'correct' | 'wrong' | 'noop' => {
    const obj = OBJ_BY_ID[rawId] || OBJECTS.find(o => o.label.toLowerCase() === String(rawId).toLowerCase());
    if (!obj || finishedRef.current) return 'noop';
    if (placedRef.current[obj.id]) return 'noop'; // already correctly placed
    // a placeCard always routes to the CORRECT bin (it is the "do the action" verb)
    const next = { ...placedRef.current, [obj.id]: obj.material };
    placedRef.current = next; setPlaced(next);
    setSelected(s => (s === obj.id ? null : s));
    const count = Object.keys(next).length;
    emit({ type: 'event', name: 'item_placed', detail: { objId: obj.id, bin: obj.material, placed: count, total: TOTAL } });
    if (count >= TOTAL) {
      finishedRef.current = true; setFinished(true); playCue('done'); flashMood('cheer');
      setAnnounce('All objects grouped by their material! 🎉');
      const ft = OBJECTS.filter(o => next[o.id] === o.material && !mistakesRef.current[o.id]).length;
      emit({ type: 'event', name: 'completed', detail: { firstTry: ft, total: TOTAL, stars: starsFor(ft) } });
      if (resultTimer.current) clearTimeout(resultTimer.current);
      resultTimer.current = setTimeout(() => setShowResult(true), reduced ? 0 : 650);
    } else {
      playCue('correct'); flashMood('happy');
      setAnnounce(`${obj.label} is ${BIN_BY_KEY[obj.material].label.toLowerCase()}. (${count} of ${TOTAL} grouped)`);
    }
    setTimeout(pushState, 0);
    return 'correct';
  }, [emit, pushState, playCue, flashMood, reduced]);

  const triggerReject = useCallback((id: string, bin: MaterialKey) => {
    setMistakes(m => { const nm = { ...m, [id]: (m[id] || 0) + 1 }; mistakesRef.current = nm; return nm; });
    setReject({ id: null, bin: null });
    requestAnimationFrame(() => requestAnimationFrame(() => setReject({ id, bin })));
    if (rejectTimer.current) clearTimeout(rejectTimer.current);
    rejectTimer.current = setTimeout(() => setReject({ id: null, bin: null }), 600);
    playCue('wrong'); flashMood('oops');
    const obj = OBJ_BY_ID[id];
    setAnnounce(`Not quite — ${obj ? obj.label : 'that object'} is not ${BIN_BY_KEY[bin].label.toLowerCase()}. Try another bin!`);
    emit({ type: 'event', name: 'answer_incorrect', detail: { objId: id, bin } });
  }, [playCue, flashMood, emit]);

  /* ---- student handlers ---- */
  const handleTapObject = (o: ObjItem) => {
    if (mode === 'ai' || finishedRef.current) return;
    if (placedRef.current[o.id]) { // take it back out
      setPlaced(p => { const np = { ...p }; delete np[o.id]; placedRef.current = np; return np; });
      setSelected(o.id); playCue('tap'); setTimeout(pushState, 0); return;
    }
    playCue('tap'); setSelected(s => (s === o.id ? null : o.id));
  };
  const handlePickBin = (key: MaterialKey) => {
    if (mode === 'ai' || finishedRef.current) return;
    const sel = selectedRef.current; if (!sel) return;
    const obj = OBJ_BY_ID[sel];
    if (obj && key === obj.material) doPlace(sel);
    else triggerReject(sel, key);
  };

  /* ───────── §3 agent API ───────── */
  // sorter "do" verb — accepts a single id OR an array of ids; routes each to its correct bin.
  const placeCard = useCallback((arg: any) => {
    const ids: string[] = Array.isArray(arg) ? arg.map(String) : [String(arg)];
    let placedN = 0;
    for (const id of ids) { if (doPlace(id) === 'correct') placedN++; }
    return { placed: placedN, ...buildState() };
  }, [doPlace, buildState]);

  const select = useCallback((id: any) => {
    const obj = OBJ_BY_ID[String(id)]; if (!obj) return buildState();
    setSelected(obj.id); playCue('tap'); setAnnounce(`Selected ${obj.label}.`); setTimeout(pushState, 0); return buildState();
  }, [buildState, playCue, pushState]);

  const reset = useCallback(() => {
    placedRef.current = {}; mistakesRef.current = {}; finishedRef.current = false;
    setPlaced({}); setMistakes({}); setFinished(false); setSelected(null);
    setReject({ id: null, bin: null }); setShowResult(false); setReviewIdx(0); setPhase('play');
    setShuffleNonce(n => n + 1); setMood('idle');
    setAnnounce('Fresh objects! Sort each one into the bin for the material it is made of.');
    emit({ type: 'event', name: 'reset' }); setTimeout(pushState, 0);
  }, [emit, pushState]);

  const highlight = useCallback((target: string) => {
    if (hlTimer.current) { clearTimeout(hlTimer.current); hlTimer.current = null; }
    const t = String(target).toLowerCase();
    const bin = BINS.find(b => b.key === t || b.label.toLowerCase() === t);
    const obj = OBJ_BY_ID[String(target)] || OBJECTS.find(o => o.label.toLowerCase() === t);
    if (bin) { setHighlightBin(bin.key); setHighlightObj(null); setAnnounce(`Look at the ${bin.label} bin.`); }
    else if (obj) { setHighlightObj(obj.id); setHighlightBin(null); setAnnounce(`Look at: ${obj.label}.`); }
    else { setHighlightBin(null); setHighlightObj(null); }
    playCue('tap');
    if (!reduced && (bin || obj)) hlTimer.current = setTimeout(() => { setHighlightBin(null); setHighlightObj(null); hlTimer.current = null; }, 2200);
  }, [reduced, playCue]);

  const getState = useCallback(() => buildState(), [buildState]);

  const setOperatorMode = useCallback((m: any) => {
    const next: 'ai' | 'student' = String(m).toLowerCase() === 'ai' ? 'ai' : 'student';
    modeRef.current = next; setMode(next); setSelected(null);
    emit({ type: 'event', name: 'operator_mode_changed', detail: { operatorMode: next } });
    setTimeout(pushState, 0);
  }, [emit, pushState]);

  const setParam = useCallback((name: string, value: any) => {
    if (name === 'muted') setMuted(!!value);
    else if (name === 'operatorMode') setOperatorMode(value);
  }, [setMuted, setOperatorMode]);

  useEffect(() => {
    const api: Record<string, (...a: any[]) => any> = {
      setParam, play: () => {}, pause: () => {}, reset, highlight, getState, setOperatorMode,
      placeCard, sort: placeCard, tap: placeCard, select,
    };
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
  }, [setParam, reset, highlight, getState, setOperatorMode, placeCard, select, emit]);

  useEffect(() => { pushState(); /* initial */ /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { [rejectTimer, moodTimer, resultTimer, hlTimer].forEach(r => r.current && clearTimeout(r.current)); }, []);

  /* ---- styles / keyframes ---- */
  useEffect(() => {
    const el = document.createElement('style'); el.id = 'gobj-' + uid;
    const kf = reduced ? '' : `
@keyframes gobj-pop-${uid}{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.14)}100%{transform:scale(1);opacity:1}}
@keyframes gobj-fadeUp-${uid}{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes gobj-shake-${uid}{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes gobj-pulse-${uid}{0%,100%{box-shadow:0 0 0 0 rgba(74,77,201,0)}50%{box-shadow:0 0 0 6px rgba(74,77,201,.22)}}
@keyframes gobj-glow-${uid}{0%,100%{box-shadow:0 0 0 0 rgba(255,114,18,0)}50%{box-shadow:0 0 0 7px rgba(255,114,18,.5)}}
@keyframes gobj-float-${uid}{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes gobj-bounce-${uid}{0%{transform:translateY(0)}30%{transform:translateY(-8px) scale(1.12)}60%{transform:translateY(0)}100%{transform:translateY(0)}}
@keyframes gobj-fall-${uid}{to{transform:translateY(120vh) rotate(720deg);opacity:0}}
@keyframes gobj-starPop-${uid}{0%{transform:scale(0) rotate(-30deg);opacity:0}60%{transform:scale(1.25) rotate(8deg)}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes gobj-resultIn-${uid}{0%{opacity:0;transform:scale(.85) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes gobj-bannerIn-${uid}{0%{opacity:.4;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}`;
    el.textContent = kf; document.head.appendChild(el); return () => { el.remove(); };
  }, [uid, reduced]);

  const isAI = mode === 'ai';
  const tray = ordered.filter(o => !placed[o.id]);
  const countUp = useCountUp(firstTry, showResult, reduced);

  const chip: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: T.ink, background: T.panel, border: `1.5px solid ${T.line}`, borderRadius: T.pill, padding: '6px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' };

  return (
    <div style={{ fontFamily: T.font, maxWidth: 940, margin: '0 auto', background: T.bg, borderRadius: 24, boxShadow: '0 20px 50px -20px rgba(83,48,134,.4)', overflow: 'hidden', position: 'relative', color: T.ink }}>
      {/* header */}
      <div style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})`, color: '#fff', padding: '20px 24px', position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Mascot mood={mood} reduced={reduced} uid={uid} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: -0.3 }}>Group the Objects</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13.5, opacity: .92, fontWeight: 500 }}>Sort each object by the <b>material</b> it is made of.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span title={isAI ? 'Teacher is showing' : 'Your turn'} style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.18)', borderRadius: T.pill, padding: '5px 11px', whiteSpace: 'nowrap' }}>{isAI ? '👩‍🏫 Teacher' : '🙋 Your turn'}</span>
          <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'} title={muted ? 'Unmute' : 'Mute'} style={{ fontSize: 15, lineHeight: 1, cursor: 'pointer', color: '#fff', background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 999, width: 32, height: 32 }}>{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>

      {/* progress bar */}
      <div style={{ height: 6, background: T.line }}>
        <div style={{ height: '100%', width: `${(placedCount / TOTAL) * 100}%`, background: `linear-gradient(90deg, ${T.accent}, ${T.accentDark})`, transition: reduced ? 'none' : 'width .4s cubic-bezier(.2,.7,.3,1.2)' }} />
      </div>

      {/* live region */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>{announce}</div>

      {/* §6.1 watch caption */}
      {isAI && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 20px 0', padding: '10px 14px', borderRadius: 12, background: T.panelSoft, color: T.primary, fontSize: 14, fontWeight: 600 }}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>👩‍🏫</span>
          Your teacher is grouping the objects by material — watch, you'll get a turn.
        </div>
      )}

      {/* body */}
      <div style={{ padding: 20 }}>
        {/* score row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <span aria-hidden="true" style={{ fontSize: 18, letterSpacing: 2 }}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
          <span style={chip}>Grouped: {placedCount}/{TOTAL}</span>
          <span style={chip}>First-try: <b style={{ color: T.successText }}>{firstTry}</b></span>
        </div>

        {/* TRAY — hidden / inert in ai mode */}
        {!isAI && (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: T.inkSoft, marginBottom: 8 }}>
              {tray.length ? 'Tap an object, then tap its material bin' : 'All objects sorted! 🎉'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, minHeight: 92, background: T.panel, border: `2px dashed ${T.trayLine}`, borderRadius: 16, padding: 12, marginBottom: 20, alignContent: 'flex-start' }}>
              {tray.length === 0 && (
                <div style={{ width: '100%', textAlign: 'center', color: T.inkSoft, fontWeight: 600, fontSize: 15, alignSelf: 'center', opacity: .7 }}>Empty — every object found its group.</div>
              )}
              {tray.map((o, i) => {
                const isSel = selected === o.id;
                const isRej = reject.id === o.id;
                const isHl = highlightObj === o.id;
                return (
                  <button key={o.id} type="button" onClick={() => handleTapObject(o)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      minWidth: 84, minHeight: T.touch + 18, padding: '10px 8px', borderRadius: 14,
                      cursor: 'pointer', fontFamily: T.font, fontWeight: 600, fontSize: 13,
                      background: isRej ? '#FDECEC' : isSel ? T.primary : T.panelSoft,
                      color: isSel && !isRej ? '#fff' : T.ink,
                      border: `2px solid ${isRej ? T.danger : isSel ? T.primary : T.line}`,
                      transition: reduced ? 'none' : 'background .15s, border-color .15s, transform .12s',
                      transform: isSel && !reduced ? 'translateY(-2px)' : 'none',
                      animation: reduced ? undefined : isRej ? `gobj-shake-${uid} .45s ease` : isHl ? `gobj-glow-${uid} 1.1s ease 2` : isSel ? `gobj-pulse-${uid} 1.2s ease infinite` : `gobj-fadeUp-${uid} .35s ease both ${Math.min(i, 8) * 0.03}s`,
                    }}>
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{o.emoji}</span>
                    <span>{o.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* BINS — visible in BOTH modes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {BINS.map(bin => {
            const items = ordered.filter(o => placed[o.id] === bin.key);
            const isRej = reject.bin === bin.key;
            const isHl = highlightBin === bin.key;
            const active = !isAI && (!!selected);
            const soft = props.darkMode ? bin.softDark : bin.soft;
            return (
              <button key={bin.key} type="button" onClick={() => handlePickBin(bin.key)}
                aria-label={`${bin.label} bin`}
                style={{
                  textAlign: 'left', background: isRej ? '#FDECEC' : soft,
                  border: `${isRej || isHl ? 3 : 2.5}px solid ${isRej ? T.danger : bin.color}`,
                  borderRadius: 16, padding: 14, minHeight: 124,
                  cursor: active ? 'pointer' : 'default', fontFamily: T.font,
                  display: 'flex', flexDirection: 'column', gap: 8,
                  transition: reduced ? 'none' : 'transform .14s cubic-bezier(.2,.7,.3,1.3), box-shadow .14s, border-color .14s',
                  transform: active && !reduced ? 'translateY(-2px)' : 'none',
                  boxShadow: active ? `0 8px 22px ${bin.color}33` : '0 2px 8px rgba(0,0,0,.05)',
                  animation: reduced ? undefined : isRej ? `gobj-shake-${uid} .45s ease` : isHl ? `gobj-glow-${uid} 1.1s ease 2` : undefined,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: bin.color, fontSize: 16 }}>
                  <span style={{ fontSize: 24 }}>{bin.emoji}</span>{bin.label}
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: T.inkSoft, background: T.panel, borderRadius: 999, padding: '2px 8px' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map(o => (
                    <span key={o.id} onClick={e => { e.stopPropagation(); handleTapObject(o); }}
                      title={isAI ? undefined : 'Tap to take it back'}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, background: T.panel,
                        border: `1.5px solid ${bin.color}`, color: T.ink, borderRadius: 999,
                        padding: '4px 10px', fontSize: 12.5, fontWeight: 600, cursor: isAI ? 'default' : 'pointer',
                        animation: reduced ? undefined : `gobj-pop-${uid} .3s ease`,
                      }}>
                      <span style={{ fontSize: 15 }}>{o.emoji}</span>{o.label}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* status banner */}
        <div role="status" key={announce} style={{ marginTop: 18, padding: '11px 15px', borderRadius: 12, fontSize: 14, fontWeight: 500, textAlign: 'center', background: reject.id ? '#FDECEC' : finished ? T.panelSoft : T.panelSoft, color: reject.id ? T.danger : finished ? T.successText : T.inkSoft, border: `1px solid ${reject.id ? T.danger : finished ? T.success : T.line}`, transition: reduced ? 'none' : 'all .2s ease', animation: reduced ? undefined : `gobj-bannerIn-${uid} .25s ease both` }}>
          <span aria-hidden="true" style={{ marginRight: 6 }}>{reject.id ? '❌' : finished ? '🎉' : placedCount > 0 ? '✓' : '🔎'}</span>{announce}
        </div>
      </div>

      {/* action bar — hidden in ai mode */}
      {!isAI && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '14px 20px', borderTop: `1px solid ${T.line}`, background: T.panel }}>
          <PillButton variant="accent" onClick={reset} T={T}>{finished ? '↻ Play again' : '↻ Reset'}</PillButton>
          <span style={{ fontSize: 13, color: T.inkSoft, fontWeight: 600 }}>{placedCount}/{TOTAL} grouped · {firstTry} on first try</span>
        </div>
      )}

      {/* RESULT POPUP */}
      {showResult && phase === 'play' && (
        <div style={overlay}>
          <Confetti reduced={reduced} uid={uid} T={T} />
          <div style={{ background: T.panel, color: T.ink, borderRadius: 24, padding: 32, width: 'min(440px, 92%)', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,.4)', position: 'relative', zIndex: 2, animation: reduced ? undefined : `gobj-resultIn-${uid} .5s cubic-bezier(.2,.7,.3,1.25) both` }}>
            <div aria-hidden="true" style={{ fontSize: 46, letterSpacing: 6, marginBottom: 6 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ display: 'inline-block', opacity: i < stars ? 1 : 0.35, filter: i < stars ? 'none' : 'grayscale(1)', animation: (reduced || i >= stars) ? undefined : `gobj-starPop-${uid} .5s ease both ${0.12 + i * 0.14}s` }}>{i < stars ? '⭐' : '☆'}</span>
              ))}
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, color: T.primary, lineHeight: 1.05 }}>{countUp}<span style={{ fontSize: 26, color: T.inkSoft }}> / {TOTAL}</span></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.inkSoft, marginBottom: 6 }}>grouped right on the first try</div>
            <div style={{ fontSize: 15, fontWeight: 500, margin: '10px 0 20px' }}>
              {firstTry / TOTAL >= 0.9 ? "Awesome sorting — you're a materials master! 🌟" : firstTry / TOTAL >= 0.6 ? "Nice going! Let's look at the tricky ones together." : "Every try teaches you something. Let's review!"}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tricky.length > 0 && <PillButton variant="contained" onClick={() => { setReviewIdx(0); setPhase('review'); }} T={T}>Let's see what we learned</PillButton>}
              <PillButton variant={tricky.length > 0 ? 'outlined' : 'accent'} onClick={reset} T={T}>↻ Play again</PillButton>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW OVERLAY */}
      {phase === 'review' && (
        <ReviewOverlay tricky={tricky} mistakes={mistakes} reviewIdx={reviewIdx} setReviewIdx={setReviewIdx} onClose={reset} T={T} uid={uid} reduced={reduced} />
      )}
    </div>
  );
};

/* ───────── confetti (CSS, no deps) ───────── */
const Confetti: React.FC<{ reduced: boolean; uid: string; T: any }> = ({ reduced, uid, T }) => {
  const pieces = useMemo(() => Array.from({ length: reduced ? 0 : 64 }).map((_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.6, dur: 2.4 + Math.random() * 1,
    color: [T.accent, T.primary, T.success, '#DB2777', '#0891B2'][i % 5], size: 7 + Math.random() * 7,
  })), [reduced, T]);
  return (<>{pieces.map((c, i) => (
    <span key={i} style={{ position: 'absolute', top: -20, left: `${c.left}%`, width: c.size, height: c.size, background: c.color, borderRadius: 2, zIndex: 1, animation: `gobj-fall-${uid} ${c.dur}s linear ${c.delay}s forwards` }} />
  ))}</>);
};

/* ───────── review overlay ───────── */
function ReviewOverlay({ tricky, mistakes, reviewIdx, setReviewIdx, onClose, T, uid, reduced }: any) {
  const none = tricky.length === 0;
  const o: ObjItem | undefined = tricky[reviewIdx];
  const correct = o ? BIN_BY_KEY[o.material] : undefined;
  const tries = o ? (mistakes[o.id] || 0) + 1 : 0;
  return (
    <div style={overlay}>
      <div style={{ background: T.panel, color: T.ink, borderRadius: 24, padding: 26, width: 'min(480px, 92%)', maxHeight: '88%', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.4)', animation: reduced ? undefined : `gobj-resultIn-${uid} .45s ease both` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 19, color: T.primary }}>{none ? 'Perfect — first try every time!' : "Let's learn the tricky ones"}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: T.panelSoft, border: 'none', borderRadius: 999, width: 34, height: 34, cursor: 'pointer', fontSize: 16, color: T.inkSoft }}>✕</button>
        </div>
        {none ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🌟</div>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>You sorted every object into the right material on your first try. Arranging things into groups by a shared property is called <b>classification</b> — exactly what Activity 6.2 is about!</p>
            <div style={{ marginTop: 16 }}><PillButton variant="accent" onClick={onClose} T={T}>↻ Play again</PillButton></div>
          </div>
        ) : (
          <>
            <div style={{ background: T.panelSoft, borderRadius: 16, padding: 18, animation: reduced ? undefined : `gobj-fadeUp-${uid} .3s ease` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 40 }}>{o!.emoji}</span>
                <span style={{ fontSize: 19, fontWeight: 700 }}>{o!.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: T.inkSoft, fontWeight: 600 }}>Correct group</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.panel, border: `1.5px solid ${T.success}`, borderRadius: 999, padding: '4px 12px', fontWeight: 700, color: T.successText, fontSize: 14 }}>
                  ✓ <span style={{ fontSize: 16 }}>{correct?.emoji}</span>{correct?.label}
                </span>
              </div>
              <div style={{ fontSize: 13, color: T.inkSoft, fontWeight: 500 }}>You found the right bin after {tries} {tries === 1 ? 'try' : 'tries'}.</div>
              <div style={{ height: 1, background: T.line, margin: '14px 0' }} />
              <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>{o!.why}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginTop: 18 }}>
              <div style={{ justifySelf: 'start' }}>
                <PillButton variant="outlined" disabled={reviewIdx === 0} onClick={() => setReviewIdx((i: number) => Math.max(0, i - 1))} T={T}>← Back</PillButton>
              </div>
              <div style={{ justifySelf: 'center', fontSize: 14, fontWeight: 700, color: T.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{reviewIdx + 1} / {tricky.length}</div>
              <div style={{ justifySelf: 'end' }}>
                {reviewIdx < tricky.length - 1
                  ? <PillButton variant="contained" onClick={() => setReviewIdx((i: number) => i + 1)} T={T}>Next →</PillButton>
                  : <PillButton variant="accent" onClick={onClose} T={T}>↻ Play again</PillButton>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, overflow: 'hidden', padding: 16 };

function GroupByPropertyTool(p: ToolProps) {
  const T = buildTheme((p.props && p.props.themeColor) || '#4A4DC9', !!(p.props && p.props.darkMode));
  return <ToolErrorBoundary T={T}><GroupByProperty {...p} /></ToolErrorBoundary>;
}

try { if (typeof window !== 'undefined') (window as any).__TOOL_COMPONENT__ = GroupByPropertyTool; } catch (e) {}
export default GroupByPropertyTool;
