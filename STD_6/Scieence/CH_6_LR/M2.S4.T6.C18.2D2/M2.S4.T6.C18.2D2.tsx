/**
 * Tool: M2.S4.T6.C18.2D2 — "See through the screen"
 * CBSE Grade 6 Science · Materials Around Us (Ch 6) · beat: Apply · concept: M2.S4.T6.C18
 *   Section 6.3.3 / Activity 6.6 — transparent · translucent · opaque materials.
 *
 * CANONICAL STANDARD (matches approved pilots M9.S10.T25.2D1 / M1.S1.T1.2D1):
 *  - Single-file, self-contained. Only runtime dep is global React (renderer strips imports; no framer-motion).
 *  - Agent-control contract: postMessage bus + window.__TOOL__ ; shared_state == spec fields exactly.
 *  - IMAGE-REVEAL phenomenon: a friend stands behind a glowing "screen". The student picks a material
 *    (glass / butter-paper / frosted-glass / eraser / wood / window) and SHINES light to REVEAL what
 *    they can see through it — clear, fuzzy, or fully blocked. Then they SORT each object into the
 *    correct see-through family (Transparent / Translucent / Opaque). Correct = lock + green glow +
 *    one-line reason; wrong = gentle hint, no lock, wrongTaps++. Finish at all 6 sorted.
 *  - Light gamification: ⭐ stars (by accuracy), Score, 🔥 streak, celebratory summary + best-so-far.
 *  - A11y: every control is a real <button> (Enter/Space), aria-live feedback, focus-visible, AA contrast,
 *    44px targets, ✓/✗ not colour-only. prefers-reduced-motion disables all motion + confetti.
 *  - Robust: error boundary, scoped keyframes, listeners/timers cleaned up. Answer key = item categories.
 *
 *  §6.1 OPERATOR MODE: accepts operatorMode 'ai' | 'student' (default 'student') via props,
 *    setParam('operatorMode',…) and setOperatorMode(mode). In 'ai' the tool collapses to a focused
 *    DEMO view — the see-through screen (phenomenon) + read-out stay live, the student action bar /
 *    bins are hidden and student taps are inert (the agent drives via reveal()/select()/highlight()).
 *    A "watch" caption + 👩‍🏫 chip show. Emits operator_mode_changed; reflects operatorMode in getState().
 *  §7.3 SOUND: Web Audio synth cues (tap/correct/wrong/done), gated behind first gesture, never
 *    autoplaying; setParam('muted',…) + a visible mute toggle.
 */
const { useState, useEffect, useRef, useMemo, useCallback } = React; // React/ReactDOM are renderer globals.
let __uidSeq = 0;
const useId = typeof React.useId === 'function' ? React.useId : function () { const r = useRef(null); if (r.current == null) r.current = 'uid' + (++__uidSeq); return r.current; };

/* ───────── Brand tokens (Singularity design system) ───────── */
const THEME = {
  font: "'Poppins','Segoe UI',system-ui,-apple-system,sans-serif",
  primary: '#4A4DC9', accent: '#FF7212', deep: '#533086',
  gradient: 'linear-gradient(90deg,#533086,#FC9145)',
  lavender: '#C1C1EA', cream: '#FFF3E4',
  green: '#2E9E5B', greenSoft: '#E4F4EA', amber: '#E08A1E', amberSoft: '#FBEFD9',
  greenText: '#1F7A45', amberText: '#8A5310',
  dark: '#4E4E4E', mid: '#CACACA', light: '#EBEBEB', bg: '#F5F5F5', white: '#FFFFFF',
  pill: 999, touch: 44, card: 14,
};

const TOOL_ID = 'M2.S4.T6.C18.2D2';

type Cat = 'transparent' | 'translucent' | 'opaque';
interface ItemDef {
  id: string; name: string; emoji: string; category: Cat;
  reason: string;   // shown on a correct sort
  hint: string;     // shown on a wrong sort
}

/* The item set + answer key are PRESERVED verbatim from the original tool (Activity 6.6 / Table 6.4). */
const ITEMS: ItemDef[] = [
  { id: 'glass_tumbler', name: 'Glass tumbler', emoji: '🥃', category: 'transparent',
    reason: 'Clear glass — you can see straight through it.',
    hint: 'Hold a glass up — can you read the words behind it clearly?' },
  { id: 'window_glass', name: 'Window glass', emoji: '🪟', category: 'transparent',
    reason: 'A clear window — you see the outside view clearly.',
    hint: 'Think of a clean window pane. Can you see the garden through it?' },
  { id: 'butter_paper', name: 'Butter paper', emoji: '📄', category: 'translucent',
    reason: 'Light passes through, but the view is blurry — not clear.',
    hint: 'Light gets through, but shapes look hazy. Not fully clear, not fully blocked.' },
  { id: 'frosted_glass', name: 'Frosted glass', emoji: '🌫️', category: 'translucent',
    reason: 'Blurry — light passes but no clear view.',
    hint: 'Light gets through, but you only see fuzzy outlines.' },
  { id: 'eraser', name: 'Eraser', emoji: '🧽', category: 'opaque',
    reason: 'No light passes through — completely blocks the view.',
    hint: 'Try shining a torch behind it. Does any light come through?' },
  { id: 'wooden_board', name: 'Wooden board', emoji: '🪵', category: 'opaque',
    reason: 'Wood blocks all light — you cannot see through it.',
    hint: 'Wood is dense — light has no way through.' },
];
const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map(i => [i.id, i]));
const TOTAL = ITEMS.length;

const CATS: { id: Cat; label: string; emoji: string; blurb: string }[] = [
  { id: 'transparent', label: 'Transparent', emoji: '🔍', blurb: 'See clearly through' },
  { id: 'translucent', label: 'Translucent', emoji: '🌫️', blurb: 'Fuzzy, not clear' },
  { id: 'opaque', label: 'Opaque', emoji: '⛔', blurb: 'No light gets through' },
];
const CAT_BY_ID: Record<Cat, { label: string; emoji: string; blurb: string }> =
  Object.fromEntries(CATS.map(c => [c.id, c])) as any;

/* how much you can see through each family (drives the reveal visual: 0..1 clarity) */
const CLARITY: Record<Cat, number> = { transparent: 1, translucent: 0.42, opaque: 0 };

function usePrefersReducedMotion(): boolean {
  const [rm, setRm] = useState(false);
  useEffect(() => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); const on = () => setRm(m.matches); on(); m.addEventListener?.('change', on); return () => m.removeEventListener?.('change', on); }, []);
  return rm;
}

/* ───────── §7.3 Web Audio cues — lazy, musical, mutable (no asset deps) ───────── */
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

/* ───────── pill button (brand: contained/outlined/accent × hover/pressed/disabled) ───────── */
interface PillProps { variant?: 'contained' | 'outlined' | 'accent'; disabled?: boolean; onClick?: () => void; children: React.ReactNode; title?: string; }
const PillButton: React.FC<PillProps> = ({ variant = 'contained', disabled, onClick, children, title }) => {
  const [h, setH] = useState(false), [p, setP] = useState(false);
  const base: React.CSSProperties = { fontFamily: THEME.font, fontWeight: 600, fontSize: 15, borderRadius: THEME.pill, padding: '12px 24px', minHeight: THEME.touch, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .18s ease', border: '2px solid transparent' };
  let skin: React.CSSProperties;
  if (disabled) skin = { background: THEME.mid, color: '#fff' };
  else if (variant === 'accent') skin = { background: p ? '#d85e08' : THEME.accent, color: '#fff', transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(255,114,18,.32)' : 'none' };
  else if (variant === 'outlined') skin = { background: h ? THEME.lavender : 'transparent', color: h ? THEME.deep : THEME.primary, borderColor: THEME.primary };
  else skin = { background: p ? THEME.deep : h ? THEME.lavender : THEME.primary, color: (p || !h) ? '#fff' : THEME.deep, transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(74,77,201,.28)' : 'none' };
  return <button type="button" title={title} disabled={disabled} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} style={{ ...base, ...skin }}>{children}</button>;
};

class ToolErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { if (this.state.err) return <div role="alert" style={{ fontFamily: THEME.font, padding: 24, background: THEME.cream, borderRadius: 16, color: THEME.deep }}>Something went wrong loading this activity. Please reload.</div>; return this.props.children; }
}

interface ToolProps {
  props?: { width?: number; height?: number; themeColor?: string; darkMode?: boolean; operatorMode?: 'ai' | 'student'; muted?: boolean; spec?: any; additionalProps?: Record<string, any> };
  setStepDetails?: (d: { beat: string; stepIndex: number; totalSteps: number; state: Record<string, any> }) => void;
  stopAutoNext?: boolean; setStopAutoNext?: (v: boolean) => void;
}

function starsFor(wrong: number): number { return wrong === 0 ? 3 : wrong <= 2 ? 2 : 1; }

/* ───────── the see-through "screen" — friend behind a material, with light + clarity ───────── */
interface ScreenProps { item: ItemDef | null; revealed: boolean; reduced: boolean; dark: boolean; uid: string; }
const SeeThroughScreen: React.FC<ScreenProps> = ({ item, revealed, reduced, dark, uid }) => {
  const cat = item ? item.category : null;
  const clarity = revealed && cat ? CLARITY[cat] : (item ? 0.06 : 0.0);
  const blur = cat === 'translucent' ? 6 : cat === 'opaque' ? 0 : 0;       // px blur for translucent
  const friendOpacity = revealed ? clarity : (item ? 0.08 : 0.0);
  const blockTint = cat === 'opaque' && revealed ? 1 : 0;                   // dark wood panel slides in
  const panelLabel = item ? item.name : 'No material yet';
  return (
    <div role="img" aria-label={item ? `${item.name}: a friend stands behind it. ${revealed ? (cat === 'transparent' ? 'You can see them clearly.' : cat === 'translucent' ? 'You see only a fuzzy outline.' : 'They are completely hidden.') : 'Shine the light to reveal what you can see.'}` : 'Pick a material to place in front of the screen.'}
      style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', minHeight: 230, borderRadius: 20, overflow: 'hidden', border: `2px solid ${THEME.light}`, boxShadow: 'inset 0 2px 14px rgba(0,0,0,.10)', background: dark ? 'radial-gradient(120% 120% at 50% 0%, #2a2540 0%, #161327 100%)' : 'radial-gradient(120% 120% at 50% 0%, #EAF4FF 0%, #D7E6FB 100%)' }}>
      {/* room behind the screen */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {/* the friend silhouette */}
        <div style={{ position: 'relative', marginBottom: '8%', textAlign: 'center', opacity: friendOpacity, filter: blur ? `blur(${blur}px)` : 'none', transition: reduced ? 'none' : 'opacity .55s cubic-bezier(.2,.7,.3,1), filter .55s ease' }}>
          <div style={{ fontSize: 'clamp(60px,12vw,104px)', lineHeight: 1 }}>🧑‍🦱</div>
          <div style={{ fontSize: 'clamp(11px,1.6vw,14px)', fontWeight: 700, color: dark ? '#cdbfff' : THEME.deep, marginTop: 2 }}>Your friend</div>
        </div>
      </div>

      {/* torch light cone from the left */}
      <svg viewBox="0 0 160 100" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: revealed ? 1 : 0.35, transition: reduced ? 'none' : 'opacity .4s ease' }}>
        <defs>
          <linearGradient id={`beam-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFE9A8" stopOpacity={revealed ? 0.85 : 0.3} />
            <stop offset="100%" stopColor="#FFE9A8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="2,50 70,18 70,82" fill={`url(#beam-${uid})`} />
      </svg>

      {/* the MATERIAL screen panel in the middle */}
      <div aria-hidden="true" style={{ position: 'absolute', top: '12%', bottom: '12%', left: '50%', width: 'clamp(78px,16vw,128px)', transform: 'translateX(-50%)', borderRadius: 14, border: `3px solid ${dark ? '#5b5680' : 'rgba(255,255,255,.85)'}`, boxShadow: '0 10px 30px rgba(30,20,60,.28)', overflow: 'hidden', transition: reduced ? 'none' : 'all .5s cubic-bezier(.2,.7,.3,1)', background: cat === 'transparent' ? 'linear-gradient(135deg, rgba(190,230,255,.30), rgba(255,255,255,.12))' : cat === 'translucent' ? 'linear-gradient(135deg, rgba(255,255,255,.82), rgba(225,232,245,.78))' : cat === 'opaque' ? 'linear-gradient(135deg,#7a5230,#5a3c20)' : 'rgba(255,255,255,.18)' }}>
        {/* opaque wood grain */}
        {cat === 'opaque' && (
          <div style={{ position: 'absolute', inset: 0, opacity: 0.5 * blockTint, background: 'repeating-linear-gradient(180deg,#6b4626 0 7px,#7d5530 7px 14px)', transition: reduced ? 'none' : 'opacity .5s ease' }} />
        )}
        {/* glass sheen */}
        {cat && cat !== 'opaque' && (
          <div style={{ position: 'absolute', top: 0, left: '-30%', width: '40%', height: '100%', background: 'linear-gradient(115deg, transparent, rgba(255,255,255,.55), transparent)', animation: reduced ? undefined : `sheen-${uid} 3.4s ease-in-out infinite` }} />
        )}
        {/* tiny material label */}
        <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 10, fontWeight: 700, color: cat === 'opaque' ? '#f2e6d6' : THEME.deep }}>{panelLabel}</div>
      </div>

      {/* read-out badge */}
      <div style={{ position: 'absolute', top: 10, left: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: dark ? 'rgba(20,16,38,.72)' : 'rgba(255,255,255,.88)', border: `1px solid ${dark ? '#4a4470' : THEME.light}`, boxShadow: '0 4px 12px rgba(0,0,0,.12)', fontSize: 13, fontWeight: 700, color: dark ? '#e9e3ff' : THEME.deep }}>
        <span aria-hidden="true">{revealed && cat ? (cat === 'transparent' ? '👁️' : cat === 'translucent' ? '🌫️' : '🚫') : '🔦'}</span>
        {revealed && cat ? (cat === 'transparent' ? 'Clear view!' : cat === 'translucent' ? 'Fuzzy outline' : 'Blocked!') : item ? 'Shine to reveal' : 'Place a material'}
      </div>
    </div>
  );
};

const SeeThrough: React.FC<ToolProps> = ({ props = {}, setStepDetails }) => {
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/[:]/g, '');
  const width = props.width || 0;
  const dark = !!props.darkMode;
  const theme = props.themeColor || THEME.primary;

  const [placedId, setPlacedId] = useState<string | null>(ITEMS[0].id); // material currently on the screen
  const [revealed, setRevealed] = useState(false);                       // has the see-through been shown?
  const [explored, setExplored] = useState<string[]>([]);                // items the student has revealed at least once
  const [sorted, setSorted] = useState<Record<string, Cat>>({});         // correctly sorted items
  const [wrongTaps, setWrongTaps] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);     // tap-to-sort selection
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null);
  const [wrongBin, setWrongBin] = useState<Cat | null>(null);
  const [announce, setAnnounce] = useState('Pick a material and shine the light to see through it. Then sort each object into the right family.');

  const bestRef = useRef<number>(0);

  const initialMode: 'ai' | 'student' = props.operatorMode === 'ai' ? 'ai' : 'student';
  const [mode, setMode] = useState<'ai' | 'student'>(initialMode);
  const modeRef = useRef(mode); modeRef.current = mode;

  const { playCue, muted, setMuted } = useSound(!!props.muted);

  // refs mirror state for the imperative api
  const placedRef = useRef(placedId); placedRef.current = placedId;
  const revealedRef = useRef(revealed); revealedRef.current = revealed;
  const exploredRef = useRef(explored); exploredRef.current = explored;
  const sortedRef = useRef(sorted); sortedRef.current = sorted;
  const wrongRef = useRef(wrongTaps); wrongRef.current = wrongTaps;
  const finishedRef = useRef(finished); finishedRef.current = finished;
  const wrongBinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildState = useCallback(() => ({
    placed: placedRef.current,
    revealed: revealedRef.current,
    explored: [...exploredRef.current],
    sorted: { ...sortedRef.current },
    sortedCount: Object.keys(sortedRef.current).length,
    total: TOTAL,
    wrongTaps: wrongRef.current,
    finished: finishedRef.current,
    operatorMode: modeRef.current,
  }), []);

  const emit = useCallback((msg: any) => { try { window.parent.postMessage(msg, '*'); } catch (e) {} }, []);
  const pushState = useCallback(() => { const s = buildState(); emit({ type: 'state', state: s }); setStepDetails?.({ beat: 'Apply', stepIndex: 0, totalSteps: 1, state: s }); }, [buildState, emit, setStepDetails]);

  // resolve an item by id OR display name (lenient, like the gold reference)
  const resolveItem = (raw: any): ItemDef | undefined => ITEM_BY_ID[raw] || ITEMS.find(i => i.name.toLowerCase() === String(raw).toLowerCase() || i.name.toLowerCase().replace(/\s+/g, '_') === String(raw).toLowerCase());
  const resolveCat = (raw: any): Cat | null => { const v = String(raw).toLowerCase(); return v === 'transparent' || v === 'translucent' || v === 'opaque' ? (v as Cat) : null; };

  /* ── select(idOrArray): place a material on the screen (single OR array → places the last/first new) ── */
  const select = useCallback((raw: any) => {
    const list = Array.isArray(raw) ? raw : [raw];
    let placedItem: ItemDef | undefined;
    for (const r of list) { const it = resolveItem(r); if (it) placedItem = it; }
    if (!placedItem) return;
    placedRef.current = placedItem.id; setPlacedId(placedItem.id);
    revealedRef.current = false; setRevealed(false);
    setAnnounce(`${placedItem.name} placed on the screen. Shine the light to see through it.`);
    playCue('tap');
    emit({ type: 'event', name: 'material_selected', detail: { id: placedItem.id } });
    setTimeout(pushState, 0);
  }, [emit, pushState, playCue]);

  /* ── reveal(idOrArray?): shine the light & reveal the see-through for the placed (or given) material ── */
  const reveal = useCallback((raw?: any) => {
    if (raw !== undefined && raw !== null) {
      const list = Array.isArray(raw) ? raw : [raw];
      // array → reveal each in turn, leaving the last placed; mark all explored
      let last: ItemDef | undefined;
      const newExplored = [...exploredRef.current];
      for (const r of list) { const it = resolveItem(r); if (it) { last = it; if (!newExplored.includes(it.id)) newExplored.push(it.id); } }
      if (last) { placedRef.current = last.id; setPlacedId(last.id); }
      exploredRef.current = newExplored; setExplored(newExplored);
    }
    const it = ITEM_BY_ID[placedRef.current || ''];
    if (!it) return;
    revealedRef.current = true; setRevealed(true);
    if (!exploredRef.current.includes(it.id)) { const ne = [...exploredRef.current, it.id]; exploredRef.current = ne; setExplored(ne); }
    const cat = it.category;
    setAnnounce(cat === 'transparent' ? `${it.name}: clear view — you can see your friend straight through it!` : cat === 'translucent' ? `${it.name}: fuzzy — light passes but you only see a blurry outline.` : `${it.name}: blocked — no light gets through, your friend is hidden.`);
    playCue('tap');
    emit({ type: 'event', name: 'revealed', detail: { id: it.id, category: cat } });
    setTimeout(pushState, 0);
  }, [emit, pushState, playCue]);

  /* ── sort(itemId, categoryId): drop a material into a see-through bin. Accepts single id OR array. ── */
  const sortInto = useCallback((rawItems: any, rawCat: any) => {
    const cat = resolveCat(rawCat);
    if (!cat || finishedRef.current) return;
    const list = Array.isArray(rawItems) ? rawItems : [rawItems];
    let anyCorrect = false, lastName = '', lastReason = '';
    let curSorted = { ...sortedRef.current };
    let curWrong = wrongRef.current;
    for (const r of list) {
      const it = resolveItem(r); if (!it || curSorted[it.id]) continue;
      if (it.category === cat) {
        curSorted[it.id] = cat; anyCorrect = true; lastName = it.name; lastReason = it.reason;
        emit({ type: 'event', name: 'answer_correct', detail: { id: it.id, category: cat } });
        emit({ type: 'event', name: 'item_placed', detail: { id: it.id, category: cat } });
      } else {
        curWrong += 1;
        emit({ type: 'event', name: 'answer_incorrect', detail: { id: it.id, category: cat, hint: it.hint } });
        lastName = it.name; lastReason = it.hint;
      }
    }
    sortedRef.current = curSorted; setSorted(curSorted);
    wrongRef.current = curWrong; setWrongTaps(curWrong);
    setSelectedId(null);
    if (anyCorrect) {
      setStreak(s => s + 1); playCue('correct');
      setAnnounce(`✓ ${lastName} → ${CAT_BY_ID[cat].label}. ${lastReason}`);
    } else {
      setStreak(0); setWrongBin(cat); playCue('wrong');
      if (wrongBinTimer.current) clearTimeout(wrongBinTimer.current);
      wrongBinTimer.current = setTimeout(() => { setWrongBin(null); wrongBinTimer.current = null; }, reduced ? 0 : 550);
      setAnnounce(`Not quite — ${lastReason}`);
    }
    if (Object.keys(curSorted).length >= TOTAL && !finishedRef.current) {
      finishedRef.current = true; setFinished(true); playCue('done');
      const st = starsFor(curWrong); if (st > bestRef.current) bestRef.current = st;
      setAnnounce(`🎉 You sorted all ${TOTAL} objects into the right see-through families!`);
      emit({ type: 'event', name: 'completed', detail: { total: TOTAL, wrongTaps: curWrong, stars: st } });
    }
    setTimeout(pushState, 0);
  }, [emit, pushState, playCue, reduced]);

  /* student tap-to-sort: tap a tile to select, tap a bin to drop */
  const onTileTap = useCallback((id: string) => {
    if (sortedRef.current[id]) return;
    setSelectedId(prev => (prev === id ? null : id));
    playCue('tap');
  }, [playCue]);
  const onBinTap = useCallback((cat: Cat) => {
    if (!selectedId) { setAnnounce(`First tap an object, then tap the ${CAT_BY_ID[cat].label} bin.`); return; }
    sortInto(selectedId, cat);
  }, [selectedId, sortInto]);

  const reset = useCallback(() => {
    placedRef.current = ITEMS[0].id; revealedRef.current = false;
    exploredRef.current = []; sortedRef.current = {}; wrongRef.current = 0; finishedRef.current = false;
    setPlacedId(ITEMS[0].id); setRevealed(false); setExplored([]); setSorted({}); setWrongTaps(0);
    setFinished(false); setStreak(0); setSelectedId(null); setHighlightTarget(null); setWrongBin(null);
    setAnnounce('Reset. Pick a material, shine the light, then sort every object.');
    emit({ type: 'event', name: 'reset' }); setTimeout(pushState, 0);
  }, [emit, pushState]);

  const highlight = useCallback((target: string) => {
    if (hlTimer.current) { clearTimeout(hlTimer.current); hlTimer.current = null; }
    const it = resolveItem(target); const cat = resolveCat(target);
    const key = it ? `item:${it.id}` : cat ? `cat:${cat}` : null;
    setHighlightTarget(key); playCue('tap');
    setAnnounce(`Look at: ${it ? it.name : cat ? CAT_BY_ID[cat].label : target}.`);
    if (!reduced && key) hlTimer.current = setTimeout(() => { setHighlightTarget(null); hlTimer.current = null; }, 2200);
  }, [reduced, playCue]);

  /* generic test(idOrArray): place + reveal in one go (the agent's "do" verb) */
  const test = useCallback((raw: any) => { select(raw); setTimeout(() => reveal(), 0); }, [select, reveal]);

  const getState = useCallback(() => buildState(), [buildState]);

  const setOperatorMode = useCallback((m: any) => {
    const next: 'ai' | 'student' = String(m).toLowerCase() === 'ai' ? 'ai' : 'student';
    modeRef.current = next; setMode(next); setSelectedId(null);
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
      select, reveal, test, sort: sortInto, sortInto,
    };
    (window as any).__TOOL__ = api;
    emit({ type: 'ready', toolId: TOOL_ID });
    const onMsg = (e: MessageEvent) => { const d = e.data; if (!d || d.type !== 'command') return; const fn = api[d.method]; let result; if (typeof fn === 'function') result = fn.apply(null, d.args || []); emit({ type: 'response', id: d.id, result: result === undefined ? api.getState() : result }); };
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('message', onMsg); if ((window as any).__TOOL__ === api) delete (window as any).__TOOL__; };
  }, [setParam, reset, highlight, getState, setOperatorMode, select, reveal, test, sortInto, emit]);

  useEffect(() => {
    const el = document.createElement('style'); el.id = 'st-' + uid;
    const scroll = `.scroll-${uid}{scrollbar-width:thin;scrollbar-color:${THEME.lavender} transparent;}
.scroll-${uid}::-webkit-scrollbar{width:10px;height:10px;}
.scroll-${uid}::-webkit-scrollbar-track{background:transparent;}
.scroll-${uid}::-webkit-scrollbar-thumb{background:${THEME.lavender};border-radius:999px;border:2px solid transparent;background-clip:content-box;}
.scroll-${uid}::-webkit-scrollbar-thumb:hover{background:${THEME.primary};background-clip:content-box;}
.tile-${uid}:focus-visible,.bin-${uid}:focus-visible{outline:3px solid ${THEME.accent};outline-offset:2px;}`;
    const kf = reduced ? '' : `@keyframes pop-${uid}{0%{transform:scale(.7)}70%{transform:scale(1.12)}100%{transform:scale(1)}}@keyframes glow-${uid}{0%,100%{box-shadow:0 0 0 0 rgba(255,114,18,0)}50%{box-shadow:0 0 0 7px rgba(255,114,18,.45)}}@keyframes shake-${uid}{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}@keyframes sheen-${uid}{0%{transform:translateX(0)}55%,100%{transform:translateX(420%)}}@keyframes resultIn-${uid}{0%{opacity:0;transform:scale(.85) translateY(10px)}100%{opacity:1;transform:scale(1) translateY(0)}}@keyframes starpop-${uid}{0%{opacity:0;transform:scale(.2) rotate(-25deg)}60%{transform:scale(1.25) rotate(8deg)}100%{opacity:1;transform:scale(1) rotate(0)}}@keyframes tileIn-${uid}{0%{opacity:0;transform:translateY(10px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes bannerIn-${uid}{0%{opacity:.35;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}@keyframes confetti-${uid}{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(220px) rotate(540deg)}}@keyframes mascot-${uid}{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(-4deg)}}`;
    el.textContent = scroll + kf;
    document.head.appendChild(el); return () => { el.remove(); };
  }, [uid, reduced]);

  useEffect(() => { pushState(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { if (wrongBinTimer.current) clearTimeout(wrongBinTimer.current); if (hlTimer.current) clearTimeout(hlTimer.current); }, []);

  const isAI = mode === 'ai';
  const sortedCount = Object.keys(sorted).length;
  const stars = starsFor(wrongTaps);
  const placedItem = placedId ? ITEM_BY_ID[placedId] : null;
  const trayItems = ITEMS.filter(i => !sorted[i.id]);

  const statChip: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: THEME.deep, background: '#fff', border: `1px solid ${THEME.light}`, borderRadius: THEME.pill, padding: '8px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' };
  const pageBg = dark ? '#161327' : THEME.bg;
  const cardBg = dark ? '#221d3a' : '#fff';
  const textCol = dark ? '#ECE8FF' : '#1f2430';

  return (
    <div style={{ fontFamily: THEME.font, maxWidth: width ? width : 980, margin: '0 auto', background: pageBg, borderRadius: 24, boxShadow: '0 20px 50px -20px rgba(83,48,134,.35)', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ background: `linear-gradient(90deg, ${THEME.deep}, ${theme}, #FC9145)`, color: '#fff', padding: '20px 26px', position: 'relative' }}>
        <h1 style={{ margin: '4px 0 2px', fontSize: 24, fontWeight: 800 }}>See through the screen</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: .95 }}>Shine light through each material to see how clear your friend looks — then sort every object as <b>Transparent</b>, <b>Translucent</b>, or <b>Opaque</b>.</p>
        <div style={{ position: 'absolute', top: 14, right: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span aria-label={isAI ? 'Teacher is showing' : 'Your turn'} title={isAI ? 'Teacher is showing' : 'Your turn'} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.18)', borderRadius: THEME.pill, padding: '4px 10px' }}>{isAI ? '👩‍🏫 Teacher' : '🙋 Your turn'}</span>
          <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'} title={muted ? 'Unmute' : 'Mute'} style={{ fontSize: 15, lineHeight: 1, cursor: 'pointer', color: '#fff', background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 999, width: 30, height: 30 }}>{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>

      {/* visually-hidden polite live region */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>{announce}</div>

      {/* §6.1 'watch' caption — ai-operated only */}
      {isAI && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 20px 0', padding: '10px 14px', borderRadius: 12, background: THEME.lavender, color: THEME.deep, fontSize: 14, fontWeight: 600 }}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>👩‍🏫</span>
          Your teacher is showing how light passes through materials — watch, you'll get a turn to sort.
        </div>
      )}

      <div style={{ padding: 20 }}>
        {/* score row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <span aria-hidden="true" style={{ fontSize: 18, letterSpacing: 2 }}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.deep, background: '#fff', border: `2px solid ${THEME.light}`, borderRadius: THEME.pill, padding: '4px 12px' }}>Sorted: {sortedCount}/{TOTAL}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.amberText, background: THEME.amberSoft, borderRadius: THEME.pill, padding: '4px 12px' }} title="Correct sorts in a row">🔥 {streak}</span>
          <span style={{ fontSize: 13, color: dark ? '#bdb6d9' : THEME.dark }}>Wrong tries: {wrongTaps}</span>
        </div>

        {/* the see-through screen (phenomenon — visible in BOTH modes) */}
        <SeeThroughScreen item={placedItem} revealed={revealed} reduced={reduced} dark={dark} uid={uid} />

        {/* material picker + shine button (controls hidden in ai mode) */}
        {!isAI && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#bdb6d9' : THEME.dark, marginRight: 2 }}>Material:</span>
            {ITEMS.map(it => {
              const active = placedId === it.id;
              const hl = highlightTarget === `item:${it.id}`;
              return (
                <button key={it.id} type="button" className={`tile-${uid}`} onClick={() => select(it.id)}
                  aria-pressed={active} title={`Place ${it.name} on the screen`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', minHeight: 40, borderRadius: 999, cursor: 'pointer', fontFamily: THEME.font, fontSize: 13, fontWeight: 700, color: active ? '#fff' : (dark ? '#e6e1ff' : THEME.deep), background: active ? theme : (dark ? '#2c2649' : '#fff'), border: `2px solid ${active ? theme : THEME.light}`, boxShadow: active ? '0 6px 16px rgba(74,77,201,.3)' : '0 1px 4px rgba(0,0,0,.06)', transition: reduced ? 'none' : 'all .18s ease', animation: (!reduced && hl) ? `glow-${uid} 1.1s ease 2` : undefined }}>
                  <span aria-hidden="true" style={{ fontSize: 16 }}>{it.emoji}</span>{it.name}
                </button>
              );
            })}
            <div style={{ flex: '1 1 auto' }} />
            <PillButton variant="accent" onClick={() => reveal()}>🔦 Shine the light</PillButton>
          </div>
        )}

        {/* status banner */}
        <div role="status" key={announce} style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, fontSize: 14, background: finished ? THEME.greenSoft : (dark ? '#2a2540' : THEME.cream), color: finished ? THEME.greenText : (dark ? '#e6e1ff' : THEME.deep), border: `1px solid ${finished ? THEME.green : (dark ? '#403a63' : '#f0d9b8')}`, animation: reduced ? undefined : `bannerIn-${uid} .25s ease both` }}>
          <span aria-hidden="true" style={{ marginRight: 6 }}>{finished ? '🎉' : sortedCount > 0 ? '✓' : '🔎'}</span>{announce}
        </div>

        {/* ── SORTING STAGE ── */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#cdc6ec' : THEME.deep, marginBottom: 8 }}>
            {isAI ? 'Sorting board (teacher is filling it in)' : selectedId ? `Now tap a bin to place “${ITEM_BY_ID[selectedId].name}”` : 'Tap an object, then tap its see-through family:'}
          </div>

          {/* tray of unsorted tiles (interactive only for student) */}
          {trayItems.length > 0 && (
            <div className={`scroll-${uid}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {trayItems.map((it, i) => {
                const sel = selectedId === it.id;
                const hl = highlightTarget === `item:${it.id}`;
                return (
                  <button key={it.id} type="button" className={`tile-${uid}`}
                    onClick={() => { if (!isAI) onTileTap(it.id); }} disabled={isAI}
                    aria-pressed={sel} title={isAI ? it.name : `Select ${it.name}`}
                    style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 96, minHeight: 76, padding: '8px 6px', borderRadius: 16, cursor: isAI ? 'default' : 'pointer', background: sel ? theme : cardBg, color: sel ? '#fff' : textCol, border: `2px solid ${sel ? theme : THEME.light}`, boxShadow: sel ? '0 8px 20px rgba(74,77,201,.34)' : '0 2px 8px rgba(40,30,70,.10)', transition: reduced ? 'none' : 'all .18s ease', transform: sel && !reduced ? 'translateY(-3px) scale(1.04)' : 'none', animation: (!reduced && hl) ? `glow-${uid} 1.1s ease 2` : (!reduced ? `tileIn-${uid} .3s ease both ${Math.min(i, 6) * 0.04}s` : undefined), opacity: isAI ? 0.92 : 1, fontFamily: THEME.font }}>
                    <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>{it.emoji}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.05 }}>{it.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* the three bins */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
            {CATS.map(c => {
              const items = ITEMS.filter(i => sorted[i.id] === c.id);
              const hl = highlightTarget === `cat:${c.id}`;
              const isWrong = wrongBin === c.id;
              const clickable = !isAI && !!selectedId;
              return (
                <div key={c.id} role={isAI ? undefined : 'button'} tabIndex={isAI ? -1 : 0} className={`bin-${uid}`}
                  onClick={() => { if (!isAI) onBinTap(c.id); }}
                  onKeyDown={(e) => { if (!isAI && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onBinTap(c.id); } }}
                  aria-label={`${c.label} bin — ${c.blurb}. ${items.length} placed.`}
                  style={{ borderRadius: 18, padding: 12, minHeight: 150, background: dark ? '#201b38' : '#FBFAFF', border: `2.5px dashed ${isWrong ? THEME.amber : hl ? THEME.accent : clickable ? theme : THEME.mid}`, boxShadow: clickable ? `0 0 0 3px ${theme}22` : 'none', cursor: clickable ? 'pointer' : 'default', transition: reduced ? 'none' : 'all .2s ease', animation: (!reduced && isWrong) ? `shake-${uid} .4s ease` : ((!reduced && hl) ? `glow-${uid} 1.1s ease 2` : undefined) }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span aria-hidden="true" style={{ fontSize: 22 }}>{c.emoji}</span>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: dark ? '#ECE8FF' : THEME.deep }}>{c.label}</div>
                      <div style={{ fontSize: 11.5, color: dark ? '#a59ed0' : THEME.dark }}>{c.blurb}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: THEME.greenText, background: THEME.greenSoft, borderRadius: 999, padding: '2px 9px' }}>{items.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map(it => (
                      <span key={it.id} title={it.reason} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: THEME.greenText, background: dark ? '#16331f' : '#fff', border: `1.5px solid ${THEME.green}`, borderRadius: 999, padding: '5px 10px', animation: reduced ? undefined : `pop-${uid} .35s ease` }}>
                        <span aria-hidden="true">{it.emoji}</span>{it.name}<span aria-hidden="true" style={{ color: THEME.greenText }}>✓</span>
                      </span>
                    ))}
                    {items.length === 0 && <span style={{ fontSize: 12, color: dark ? '#6f689a' : '#b3aecb', fontStyle: 'italic' }}>empty</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* prominent, animated results card + confetti + mascot */}
        {finished && (
          <div role="status" style={{ position: 'relative', marginTop: 18, padding: '24px 20px', borderRadius: 20, textAlign: 'center', background: 'linear-gradient(135deg,#FFF8EE,#E9F7EF)', border: `2px solid ${THEME.green}`, boxShadow: '0 14px 34px -12px rgba(46,158,91,.4)', overflow: 'hidden', animation: reduced ? undefined : `resultIn-${uid} .45s cubic-bezier(.2,.7,.3,1.25) both` }}>
            {!reduced && (
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} style={{ position: 'absolute', top: -10, left: `${(i * 6.3 + 5) % 100}%`, fontSize: 14 + (i % 3) * 5, animation: `confetti-${uid} ${1.6 + (i % 5) * 0.25}s ease-in ${(i % 7) * 0.12}s forwards` }}>{['🎉', '⭐', '✨', '🟣', '🟠'][i % 5]}</span>
                ))}
              </div>
            )}
            <div aria-hidden="true" style={{ fontSize: 40, animation: reduced ? undefined : `mascot-${uid} 2.4s ease-in-out infinite` }}>🦉</div>
            <div aria-hidden="true" style={{ fontSize: 44, lineHeight: 1, letterSpacing: 6, marginTop: 4 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ display: 'inline-block', opacity: i < stars ? 1 : 0.35, filter: i < stars ? 'none' : 'grayscale(1)', animation: (reduced || i >= stars) ? undefined : `starpop-${uid} .5s ease both ${0.12 + i * 0.14}s` }}>{i < stars ? '⭐' : '☆'}</span>
              ))}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: THEME.deep, marginTop: 8 }}>🎉 Brilliant! You filled Table 6.4 correctly.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
              <span style={statChip}>Sorted <b style={{ color: THEME.greenText }}>{TOTAL}/{TOTAL}</b></span>
              <span style={statChip}>Wrong tries <b style={{ color: wrongTaps === 0 ? THEME.greenText : THEME.amberText }}>{wrongTaps}</b></span>
              <span style={statChip}>Stars <b style={{ color: THEME.deep }}>{stars}/3</b></span>
              <span style={statChip}>Best <b style={{ color: THEME.deep }}>{bestRef.current}★</b></span>
            </div>
            <div style={{ fontSize: 14.5, color: THEME.dark, marginTop: 14 }}>{wrongTaps === 0 ? 'Perfect — no wrong tries! 🌟' : 'Great work — reset to aim for a perfect score!'}</div>
            {!isAI && <div style={{ marginTop: 16 }}><PillButton variant="accent" onClick={reset}>↻ Play again</PillButton></div>}
          </div>
        )}
      </div>

      {/* action bar — hidden in ai-operated demo mode (§6.1) */}
      {!isAI && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '14px 20px', borderTop: `1px solid ${dark ? '#322c52' : THEME.light}`, background: cardBg }}>
          <PillButton variant="outlined" onClick={reset}>{finished ? 'Play again' : 'Reset'}</PillButton>
          <span style={{ fontSize: 13, color: dark ? '#a59ed0' : THEME.dark }}>{sortedCount}/{TOTAL} sorted · {explored.length}/{TOTAL} materials explored</span>
        </div>
      )}
    </div>
  );
};

function SeeThroughTool(p: ToolProps) {
  return <ToolErrorBoundary><SeeThrough {...p} /></ToolErrorBoundary>;
}

try { if (typeof window !== "undefined") (window as any).__TOOL_COMPONENT__ = SeeThroughTool; } catch (e) {}
export default SeeThroughTool;
