/**
 * Tool: M1.S2.T2.C7.2D1 — "Sort in three ways" (Object Sorter — Fig. 6.4)
 * CBSE Grade 6 Science · Ch 6 "Materials Around Us" · Activity 6.2
 * Concept: the SAME set of objects can be grouped by DIFFERENT properties (shape, colour, material).
 *
 * Retrofitted to the 2D_TOOL_AUTHORING contract (study-from M1.S1.T1.C1.2D5):
 *  - Single-file, self-contained. Only runtime dep is global React (no module imports, no framer-motion).
 *  - Agent-control contract: postMessage bus ({type:'ready'|'state'|'event'|'response'}) + window.__TOOL__.
 *  - Tool-specific "do" verbs: placeCard(id[,bin]) / sort(id[,bin]) (aliases) accept a SINGLE id OR an ARRAY
 *    (each item id OR {id,bin}); omitting bin auto-places into the correct bin for the active property.
 *    setProperty(prop) switches the active sort property (shape|colour|material).
 *  - operatorMode 'ai'|'student' (§6.1): in 'ai' the student tray + action buttons hide and become inert
 *    (agent drives), the phenomenon (bins + boards) stays, a 👩‍🏫 watch caption + chip show.
 *  - §7.3 Web Audio cues (tap/correct/wrong/done) gated behind first gesture; visible mute toggle.
 *  - Premium CSS/RAF visuals: layered gradient cards, soft shadows, Poppins type scale, themeColor palette,
 *    light+dark, staggered entrance, springy pops, confetti celebration, mascot, progress, reduced-motion.
 *  - Preserved verbatim: the 8 objects, the 3 passes (shape/colour/material), the per-pass omit ('key' in
 *    colour), and the answer key (tile[property] === binId). The brown-coin SVG in the colour pass is kept.
 */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
let __uidSeq = 0;
const useId = typeof React.useId === 'function' ? React.useId : function () { const r = useRef(null); if (r.current == null) r.current = 'uid' + (++__uidSeq); return r.current; };

const TOOL_ID = 'M1.S2.T2.C7.2D1';

type PassKey = 'shape' | 'colour' | 'material';

interface Tile { id: string; label: string; emoji: string; shape: string; colour: string; material: string; }
interface Bin { id: string; label: string; emoji: string; color: string; light: string; }
interface PassConfig { key: PassKey; label: string; question: string; emoji: string; stepNum: number; bins: Bin[]; omit?: string[]; }

/* ───────── DATA (preserved verbatim from the original tool) ───────── */
const TILES: Tile[] = [
  { id: 'apple',    label: 'Apple',      emoji: '🍎', shape: 'round', colour: 'red',   material: 'plant' },
  { id: 'straw',    label: 'Strawberry', emoji: '🍓', shape: 'round', colour: 'red',   material: 'plant' },
  { id: 'leaf',     label: 'Leaf',       emoji: '🍃', shape: 'flat',  colour: 'green', material: 'plant' },
  { id: 'cucumber', label: 'Cucumber',   emoji: '🥒', shape: 'long',  colour: 'green', material: 'plant' },
  { id: 'coin',     label: 'Coin',       emoji: '🪙', shape: 'round', colour: 'brown', material: 'metal' },
  { id: 'key',      label: 'Key',        emoji: '🗝️', shape: 'long',  colour: 'brown', material: 'metal' },
  { id: 'log',      label: 'Wooden log', emoji: '🪵', shape: 'long',  colour: 'brown', material: 'wood'  },
  { id: 'plank',    label: 'Wood block', emoji: '🟫', shape: 'flat',  colour: 'brown', material: 'wood'  },
];
const TILE_BY_ID: Record<string, Tile> = Object.fromEntries(TILES.map(t => [t.id, t]));

const PASSES: PassConfig[] = [
  { key: 'shape', label: 'Shape', emoji: '🔷', stepNum: 1, question: 'What shape is each object?',
    bins: [
      { id: 'round', label: 'Round', emoji: '⭕', color: '#4A4DC9', light: '#EEEEFF' },
      { id: 'long',  label: 'Long',  emoji: '📏', color: '#FC9145', light: '#FFF3E4' },
      { id: 'flat',  label: 'Flat',  emoji: '🟦', color: '#533086', light: '#F3EEF9' },
    ] },
  { key: 'colour', label: 'Colour', emoji: '🎨', stepNum: 2, question: 'What colour is each object?', omit: ['key'],
    bins: [
      { id: 'red',   label: 'Red',   emoji: '🔴', color: '#E53E3E', light: '#FFF0F0' },
      { id: 'green', label: 'Green', emoji: '🟢', color: '#16A34A', light: '#F0FFF4' },
      { id: 'brown', label: 'Brown', emoji: '🟤', color: '#92400E', light: '#FEF3C7' },
    ] },
  { key: 'material', label: 'Material', emoji: '🧱', stepNum: 3, question: 'What is each object made of?',
    bins: [
      { id: 'plant', label: 'Plant', emoji: '🌿', color: '#15803D', light: '#F0FFF4' },
      { id: 'metal', label: 'Metal', emoji: '⚙️', color: '#475569', light: '#F8FAFC' },
      { id: 'wood',  label: 'Wood',  emoji: '🪵', color: '#A0522D', light: '#FDF6EE' },
    ] },
];
const PASS_BY_KEY: Record<PassKey, PassConfig> = Object.fromEntries(PASSES.map(p => [p.key, p])) as Record<PassKey, PassConfig>;
const PASS_SEEDS: Record<PassKey, number> = { shape: 1, colour: 2, material: 3 };
const tilesForPass = (pass: PassConfig): Tile[] => TILES.filter(t => !(pass.omit ?? []).includes(t.id));

/* ───────── seeded shuffle (stable, no Math.random for content) ───────── */
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
    if (kind === 'tap') { tone(ac, 420, n, 0.09, 'triangle', 0.15); }
    else if (kind === 'correct') { tone(ac, 660, n, 0.12, 'sine', 0.2); tone(ac, 880, n + 0.09, 0.16, 'sine', 0.2); }
    else if (kind === 'wrong') { tone(ac, 200, n, 0.18, 'sine', 0.18); }
    else if (kind === 'done') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, n + i * 0.1, 0.22, 'triangle', 0.2)); }
  }, []);
  return { playCue, muted, setMuted };
}

/* ───────── palette derived from props.themeColor + darkMode ───────── */
function hexToRgb(hex: string) { const h = (hex || '#4A4DC9').replace('#', ''); const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h; const n = parseInt(v, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
function rgba(hex: string, a: number) { const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function mix(hex: string, target: number, amt: number) { const { r, g, b } = hexToRgb(hex); const m = (c: number) => Math.round(c + (target - c) * amt); return `rgb(${m(r)},${m(g)},${m(b)})`; }

function buildTheme(themeColor: string, dark: boolean) {
  const primary = themeColor || '#4A4DC9';
  return {
    font: "'Poppins','Segoe UI',system-ui,-apple-system,sans-serif",
    primary, accent: '#FC9145', deep: dark ? mix(primary, 255, 0.25) : '#533086',
    gradient: `linear-gradient(135deg, ${mix(primary, 0, 0.15)} 0%, ${primary} 55%, #FC9145 120%)`,
    pageBg: dark ? '#171426' : '#F6F4FC',
    card: dark ? '#221E36' : '#FFFFFF',
    cardSoft: dark ? '#2A2542' : '#FAFAFE',
    ink: dark ? '#ECE9F6' : '#3A3550',
    sub: dark ? '#A9A2C4' : '#6E6A82',
    mid: dark ? '#5A5474' : '#CACACA',
    line: dark ? '#352F50' : '#EBEBEB',
    lavender: dark ? '#3A3460' : '#EFEBFB',
    success: '#22C55E', successText: dark ? '#7BE6A6' : '#159B52', successSoft: dark ? 'rgba(34,197,94,0.16)' : '#EAFBF0',
    rgba: (a: number) => rgba(primary, a),
  };
}

/* ───────── brown coin SVG (kept from original; coin sits in Brown bin in the colour pass) ───────── */
const BrownCoin: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="brown coin" style={{ display: 'block', flexShrink: 0, pointerEvents: 'none', ...style }}>
    <circle cx="16" cy="16" r="15" fill="#9C6B33" stroke="#5E3F1E" strokeWidth="2" />
    <circle cx="16" cy="16" r="11" fill="none" stroke="#5E3F1E" strokeWidth="1.3" opacity="0.5" />
    <text x="16" y="21.5" textAnchor="middle" fontFamily="'Poppins',sans-serif" fontWeight="800" fontSize="13" fill="#4A2F12">₹</text>
  </svg>
);
const Glyph: React.FC<{ tile: Tile; size: number; brownCoin?: boolean }> = ({ tile, size, brownCoin }) =>
  tile.id === 'coin' && brownCoin ? <BrownCoin size={size} /> : <span style={{ fontSize: size, lineHeight: 1, pointerEvents: 'none', flexShrink: 0 }}>{tile.emoji}</span>;

/* ───────── mascot (idle bob + reactive) ───────── */
const Mascot: React.FC<{ mood: 'idle' | 'cheer' | 'think'; uid: string; reduced: boolean; size?: number }> = ({ mood, uid, reduced, size = 40 }) => {
  const face = mood === 'cheer' ? '🥳' : mood === 'think' ? '🤔' : '🦉';
  return (
    <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1, display: 'inline-block', animation: reduced ? undefined : (mood === 'cheer' ? `mascotCheer-${uid} .6s ease` : `mascotBob-${uid} 3s ease-in-out infinite`) }}>{face}</span>
  );
};

class ToolErrorBoundary extends React.Component<{ children: React.ReactNode; font: string }, { err: Error | null }> {
  constructor(props: any) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { if (this.state.err) return <div role="alert" style={{ fontFamily: this.props.font, padding: 24, borderRadius: 16 }}>Something went wrong loading this activity. Please reload.</div>; return this.props.children; }
}

interface ToolProps {
  props?: { width?: number; height?: number; themeColor?: string; darkMode?: boolean; operatorMode?: 'ai' | 'student'; muted?: boolean; spec?: any; additionalProps?: Record<string, any> };
  setStepDetails?: (d: { beat: string; stepIndex: number; totalSteps: number; state: Record<string, any> }) => void;
}

/* ───────── styled pill button ───────── */
const PillButton: React.FC<{ variant?: 'primary' | 'ghost'; onClick?: () => void; children: React.ReactNode; T: any; full?: boolean }> = ({ variant = 'primary', onClick, children, T, full }) => {
  const [h, setH] = useState(false), [p, setP] = useState(false);
  const base: React.CSSProperties = { fontFamily: T.font, fontWeight: 700, fontSize: 14.5, borderRadius: 14, padding: '13px 22px', cursor: 'pointer', border: '2px solid transparent', transition: 'transform .15s ease, box-shadow .18s ease, background .18s ease', width: full ? '100%' : undefined };
  const skin: React.CSSProperties = variant === 'primary'
    ? { background: T.gradient, color: '#fff', transform: p ? 'translateY(0)' : h ? 'translateY(-2px)' : 'none', boxShadow: h ? `0 10px 26px ${T.rgba(0.4)}` : `0 4px 16px ${T.rgba(0.28)}` }
    : { background: h ? T.lavender : 'transparent', color: T.deep, borderColor: T.rgba(0.5) };
  return <button type="button" onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} style={{ ...base, ...skin }}>{children}</button>;
};

/* ───────── stepper ───────── */
const Stepper: React.FC<{ current: PassKey; done: Set<PassKey>; T: any; reduced: boolean; uid: string }> = ({ current, done, T, reduced, uid }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
    {PASSES.map((p, i) => {
      const isDone = done.has(p.key);
      const active = current === p.key && !isDone;
      const accent = p.bins[0].color;
      return (
        <React.Fragment key={p.key}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '0 4px', minWidth: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? T.success : active ? `linear-gradient(135deg,${accent},${accent}cc)` : T.line, boxShadow: active ? `0 3px 14px ${accent}66` : 'none', transition: 'all .25s', animation: (active && !reduced) ? `pulse-${uid} 1.6s ease-in-out infinite` : undefined }}>
              {isDone ? <span style={{ fontSize: 18, color: '#fff' }}>✓</span> : <span style={{ fontFamily: T.font, fontWeight: 800, fontSize: 16, color: active ? '#fff' : T.mid }}>{p.stepNum}</span>}
            </div>
            <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: 'clamp(10px,2.2vw,12px)', color: isDone ? T.successText : active ? accent : T.mid, whiteSpace: 'nowrap' }}>{p.emoji} {p.label}</span>
          </div>
          {i < PASSES.length - 1 && (
            <div style={{ flex: 1, height: 3, minWidth: 14, maxWidth: 64, borderRadius: 2, margin: '0 3px 18px', background: done.has(PASSES[i].key) ? `linear-gradient(to right, ${PASSES[i].bins[0].color}, ${PASSES[i + 1].bins[0].color})` : T.line, transition: 'background .4s' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ───────── bin box ───────── */
const BinBox: React.FC<{ bin: Bin; tiles: Tile[]; armed: boolean; over: boolean; selectable: boolean; rejecting: boolean; highlighted: boolean; coinBrown: boolean; onClick: (id: string) => void; T: any; uid: string; reduced: boolean; }> =
({ bin, tiles, armed, over, selectable, rejecting, highlighted, coinBrown, onClick, T, uid, reduced }) => (
  <div data-bin={bin.id} onClick={() => onClick(bin.id)}
    style={{
      flex: '1 1 0', minWidth: 0,
      border: `2px ${armed ? 'solid' : 'dashed'} ${rejecting ? '#E53E3E' : over || armed || highlighted ? bin.color : T.rgba(0.32)}`,
      borderRadius: 16, background: over || armed ? rgba(bin.color, T.deep === '#533086' ? 0.08 : 0.16) : T.cardSoft,
      padding: 10, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 124,
      cursor: selectable ? 'pointer' : 'default', transform: over ? 'scale(1.03)' : 'none',
      outline: selectable ? `3px solid ${rgba(bin.color, 0.33)}` : 'none', outlineOffset: 2,
      boxShadow: highlighted ? `0 0 0 4px ${rgba(bin.color, 0.4)}` : over ? `0 8px 22px ${rgba(bin.color, 0.25)}` : 'none',
      transition: 'background .18s, border-color .18s, transform .14s, box-shadow .2s, outline .15s',
      animation: rejecting && !reduced ? `shake-${uid} .34s ease` : undefined,
    }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingBottom: 7, borderBottom: `1.5px solid ${rgba(bin.color, 0.18)}`, flexShrink: 0, pointerEvents: 'none' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: rgba(bin.color, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{bin.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.font, fontWeight: 800, fontSize: 13, color: bin.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bin.label}</div>
        <div style={{ fontSize: 9.5, color: T.sub, fontWeight: 700 }}>{tiles.length} item{tiles.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1, alignContent: 'flex-start', pointerEvents: 'none' }}>
      {tiles.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: T.card, borderRadius: 20, padding: '3px 9px 3px 5px', border: `1.5px solid ${rgba(bin.color, 0.3)}`, boxShadow: `0 1px 5px ${rgba(bin.color, 0.14)}`, animation: reduced ? undefined : `pop-${uid} .35s ease` }}>
          {t.id === 'coin' && coinBrown ? <BrownCoin size={17} /> : <span style={{ fontSize: 15, flexShrink: 0 }}>{t.emoji}</span>}
          <span style={{ fontSize: 10, fontWeight: 700, color: T.ink, fontFamily: T.font, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
        </div>
      ))}
      {tiles.length === 0 && !over && <span style={{ fontSize: 10, color: T.sub, fontWeight: 600, fontFamily: T.font, padding: '4px 0' }}>{selectable ? 'tap to place' : 'drop here'}</span>}
    </div>
  </div>
);

/* ───────── done summary board ───────── */
const DoneSummary: React.FC<{ pass: PassConfig; data: Record<string, string>; T: any; reduced: boolean; uid: string }> = ({ pass, data, T, reduced, uid }) => {
  const accent = pass.bins[0].color;
  const binTiles: Record<string, Tile[]> = {}; pass.bins.forEach(b => { binTiles[b.id] = []; });
  Object.entries(data).forEach(([tid, bid]) => { if (binTiles[bid]) { const t = TILE_BY_ID[tid]; if (t) binTiles[bid].push(t); } });
  return (
    <div style={{ borderRadius: 16, border: `2px solid ${rgba(accent, 0.28)}`, background: rgba(accent, 0.05), padding: '10px 14px', marginBottom: 12, animation: reduced ? undefined : `fadeUp-${uid} .4s ease` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 13, color: '#fff' }}>✓</span></div>
        <span style={{ fontFamily: T.font, fontWeight: 800, fontSize: 13, color: T.successText }}>Step {pass.stepNum}: Sorted by {pass.label}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {pass.bins.map(bin => (
          <div key={bin.id} style={{ background: rgba(bin.color, 0.1), borderRadius: 10, padding: '7px 9px', border: `1.5px solid ${rgba(bin.color, 0.28)}`, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <span style={{ fontSize: 12 }}>{bin.emoji}</span>
              <span style={{ fontFamily: T.font, fontWeight: 800, fontSize: 11, color: bin.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bin.label}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {(binTiles[bin.id] || []).map(t => t.id === 'coin' && pass.key === 'colour' ? <BrownCoin key={t.id} size={17} /> : <span key={t.id} title={t.label} style={{ fontSize: 16 }}>{t.emoji}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ───────── main ───────── */
const ObjectSorter: React.FC<ToolProps> = ({ props = {}, setStepDetails }) => {
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/[:]/g, '');
  const T = useMemo(() => buildTheme(props.themeColor || '#4A4DC9', !!props.darkMode), [props.themeColor, props.darkMode]);
  const width = props.width || 0;

  const [activePass, setActivePass] = useState<PassKey>('shape');
  const [passData, setPassData] = useState<Record<PassKey, Record<string, string>>>({ shape: {}, colour: {}, material: {} });
  const [doneKeys, setDoneKeys] = useState<Set<PassKey>>(new Set());
  const [clickSelId, setClickSelId] = useState<string | null>(null);
  const [rejectBin, setRejectBin] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [highlightBin, setHighlightBin] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('Sort the objects by shape, colour, then material — the same things group differently each time.');

  const initialMode: 'ai' | 'student' = props.operatorMode === 'ai' ? 'ai' : 'student';
  const [mode, setMode] = useState<'ai' | 'student'>(initialMode);
  const { playCue, muted, setMuted } = useSound(!!props.muted);

  const activeRef = useRef(activePass); activeRef.current = activePass;
  const dataRef = useRef(passData); dataRef.current = passData;
  const doneRef = useRef(doneKeys); doneRef.current = doneKeys;
  const modeRef = useRef(mode); modeRef.current = mode;
  const rejectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allDone = doneKeys.size === 3;
  const isAI = mode === 'ai';

  /* ── state for the contract ── */
  const buildState = useCallback(() => {
    const groups: Record<string, Record<string, string[]>> = {};
    (Object.keys(dataRef.current) as PassKey[]).forEach(k => {
      const g: Record<string, string[]> = {}; PASS_BY_KEY[k].bins.forEach(b => { g[b.id] = []; });
      Object.entries(dataRef.current[k]).forEach(([tid, bid]) => { if (g[bid]) g[bid].push(tid); });
      groups[k] = g;
    });
    const cfg = PASS_BY_KEY[activeRef.current];
    const placed = Object.keys(dataRef.current[activeRef.current]).length;
    return {
      activeProperty: activeRef.current, placed, total: tilesForPass(cfg).length,
      completedPasses: [...doneRef.current], finished: doneRef.current.size === 3,
      groups, operatorMode: modeRef.current,
    };
  }, []);

  const emit = useCallback((msg: any) => { try { window.parent.postMessage(msg, '*'); } catch (e) {} }, []);
  const pushState = useCallback(() => { const s = buildState(); emit({ type: 'state', state: s }); setStepDetails?.({ beat: 'Apply', stepIndex: PASSES.findIndex(p => p.key === activeRef.current), totalSteps: 3, state: s }); }, [buildState, emit, setStepDetails]);

  /* ── auto-advance / completion when a pass fills ── */
  const checkPassComplete = useCallback((key: PassKey, nextData: Record<PassKey, Record<string, string>>) => {
    const cfg = PASS_BY_KEY[key];
    if (Object.keys(nextData[key]).length < tilesForPass(cfg).length || doneRef.current.has(key)) return;
    const nd = new Set(doneRef.current); nd.add(key); doneRef.current = nd; setDoneKeys(nd);
    emit({ type: 'event', name: 'pass_completed', detail: { property: key } });
    if (nd.size === 3) {
      setConfetti(true); playCue('done');
      setAnnounce('🎉 All three sorts done! The same objects formed different groups each time — that is classification.');
      setTimeout(() => setConfetti(false), 1600);
      emit({ type: 'event', name: 'completed', detail: { passes: ['shape', 'colour', 'material'] } });
    } else {
      const idx = PASSES.findIndex(p => p.key === key);
      const nextKey = PASSES[idx + 1].key;
      setAnnounce(`Step ${idx + 1} done! Now sort by ${PASS_BY_KEY[nextKey].label}.`);
      setTimeout(() => { activeRef.current = nextKey; setActivePass(nextKey); setClickSelId(null); setTimeout(pushState, 0); }, 650);
    }
  }, [emit, playCue, pushState]);

  /* ── core placement (shared by student + agent); returns true if accepted ── */
  const place = useCallback((tileId: string, binId: string | undefined, opts?: { silent?: boolean }): boolean => {
    const key = activeRef.current; const cfg = PASS_BY_KEY[key];
    const tile = TILE_BY_ID[tileId];
    if (!tile || tilesForPass(cfg).every(t => t.id !== tileId)) return false; // not part of this pass
    const correct = (tile as unknown as Record<string, string>)[key];
    const dest = binId ?? correct; // agent may omit bin → auto-place into the correct bin
    if (dest !== correct) {
      if (!opts?.silent) {
        setRejectBin(dest); playCue('wrong'); setClickSelId(null);
        setAnnounce(`That is not the right ${cfg.label.toLowerCase()} bin for the ${tile.label}. Try another!`);
        if (rejectTimer.current) clearTimeout(rejectTimer.current);
        rejectTimer.current = setTimeout(() => setRejectBin(null), 360);
      }
      emit({ type: 'event', name: 'placement_rejected', detail: { property: key, tileId, bin: dest } });
      return false;
    }
    if (dataRef.current[key][tileId] === dest) return true; // idempotent: already correctly placed
    const nd = { ...dataRef.current, [key]: { ...dataRef.current[key], [tileId]: dest } };
    dataRef.current = nd; setPassData(nd); setClickSelId(null);
    if (!opts?.silent) { playCue('correct'); setAnnounce(`${tile.label} → ${PASS_BY_KEY[key].bins.find(b => b.id === dest)?.label} bin. ✓`); }
    emit({ type: 'event', name: 'card_placed', detail: { property: key, tileId, bin: dest } });
    checkPassComplete(key, nd);
    setTimeout(pushState, 0);
    return true;
  }, [emit, playCue, checkPassComplete, pushState]);

  /* ── tool-specific "do" verb: placeCard / sort — single id OR array of (id | {id,bin}) ── */
  const placeCard = useCallback((arg: any, maybeBin?: any) => {
    const list: any[] = Array.isArray(arg) ? arg : [arg];
    let ok = 0;
    list.forEach((entry, i) => {
      let id: string | undefined, bin: string | undefined;
      if (entry && typeof entry === 'object') { id = entry.id ?? entry.tileId ?? entry.tile; bin = entry.bin ?? entry.binId ?? entry.to; }
      else { id = entry; bin = Array.isArray(arg) ? undefined : maybeBin; }
      if (id == null) return;
      // resolve by id OR label
      let t = TILE_BY_ID[id]; if (!t) { const m = TILES.find(x => x.label.toLowerCase() === String(id).toLowerCase()); if (m) { id = m.id; t = m; } }
      // resolve bin by id OR label within the active pass
      if (bin != null) { const cfg = PASS_BY_KEY[activeRef.current]; const b = cfg.bins.find(x => x.id === bin || x.label.toLowerCase() === String(bin).toLowerCase()); bin = b ? b.id : bin; }
      if (id != null && place(String(id), bin, { silent: list.length > 1 && i < list.length - 1 })) ok++;
    });
    return { placed: ok, of: list.length, state: buildState() };
  }, [place, buildState]);

  /* ── setProperty: switch the active sort property (only to a not-yet-completed pass) ── */
  const setProperty = useCallback((prop: any) => {
    const key = String(prop).toLowerCase() as PassKey;
    if (!PASS_BY_KEY[key]) return { ok: false, activeProperty: activeRef.current };
    activeRef.current = key; setActivePass(key); setClickSelId(null);
    setAnnounce(`Now sorting by ${PASS_BY_KEY[key].label}.`);
    emit({ type: 'event', name: 'property_changed', detail: { property: key } });
    setTimeout(pushState, 0);
    return { ok: true, activeProperty: key };
  }, [emit, pushState]);

  const highlight = useCallback((target: string) => {
    if (hlTimer.current) { clearTimeout(hlTimer.current); hlTimer.current = null; }
    const cfg = PASS_BY_KEY[activeRef.current];
    const b = cfg.bins.find(x => x.id === target || x.label.toLowerCase() === String(target).toLowerCase());
    setHighlightBin(b ? b.id : null); playCue('tap');
    setAnnounce(b ? `Look at the ${b.label} bin.` : `Look at: ${target}.`);
    if (!reduced && b) hlTimer.current = setTimeout(() => { setHighlightBin(null); hlTimer.current = null; }, 2000);
  }, [reduced, playCue]);

  const reset = useCallback(() => {
    const empty = { shape: {}, colour: {}, material: {} } as Record<PassKey, Record<string, string>>;
    dataRef.current = empty; setPassData(empty);
    doneRef.current = new Set(); setDoneKeys(new Set());
    activeRef.current = 'shape'; setActivePass('shape');
    setClickSelId(null); setRejectBin(null); setConfetti(false); setHighlightBin(null);
    setAnnounce('Reset. Sort the objects by shape, colour, then material.');
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
    else if (name === 'property' || name === 'activeProperty') setProperty(value);
  }, [setMuted, setOperatorMode, setProperty]);

  /* ── register the contract ── */
  useEffect(() => {
    const api: Record<string, (...a: any[]) => any> = {
      setParam, play: () => {}, pause: () => {}, reset, highlight, getState, setOperatorMode,
      placeCard, sort: placeCard, setProperty,
    };
    (window as any).__TOOL__ = api;
    emit({ type: 'ready', toolId: TOOL_ID });
    const onMsg = (e: MessageEvent) => { const d = e.data; if (!d || d.type !== 'command') return; const fn = api[d.method]; let result; if (typeof fn === 'function') result = fn.apply(null, d.args || []); emit({ type: 'response', id: d.id, result: result === undefined ? api.getState() : result }); };
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('message', onMsg); if ((window as any).__TOOL__ === api) delete (window as any).__TOOL__; };
  }, [setParam, reset, highlight, getState, setOperatorMode, placeCard, setProperty, emit]);

  /* ── keyframes + scoped styles ── */
  useEffect(() => {
    const el = document.createElement('style'); el.id = 'st-' + uid;
    const kf = reduced ? '' :
      `@keyframes pop-${uid}{0%{transform:scale(.6) rotate(-4deg);opacity:0}70%{transform:scale(1.1) rotate(1deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}` +
      `@keyframes fadeUp-${uid}{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}` +
      `@keyframes shake-${uid}{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}` +
      `@keyframes pulse-${uid}{0%,100%{box-shadow:0 0 0 0 ${T.rgba(0.4)}}50%{box-shadow:0 0 0 7px ${T.rgba(0)}}}` +
      `@keyframes ring-${uid}{0%,100%{box-shadow:0 0 0 0 ${T.rgba(0.5)}}50%{box-shadow:0 0 0 6px ${T.rgba(0)}}}` +
      `@keyframes confetti-${uid}{0%{transform:translateY(-8px) rotate(0);opacity:1}100%{transform:translateY(120px) rotate(540deg);opacity:0}}` +
      `@keyframes mascotBob-${uid}{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-5px) rotate(3deg)}}` +
      `@keyframes mascotCheer-${uid}{0%{transform:scale(1)}40%{transform:scale(1.3) rotate(-10deg)}70%{transform:scale(1.15) rotate(8deg)}100%{transform:scale(1)}}` +
      `@keyframes barGrow-${uid}{from{transform:scaleX(0)}to{transform:scaleX(1)}}`;
    el.textContent = `.tile-${uid}{transition:transform .14s ease,box-shadow .16s ease,border-color .15s ease,opacity .15s ease}` +
      `.tile-${uid}:hover:not(.done):not(.dragging){transform:translateY(-3px)}` +
      `@media (hover:none){.tile-${uid}:hover:not(.done){transform:none}}` + kf;
    document.head.appendChild(el); return () => { el.remove(); };
  }, [uid, reduced, T]);

  useEffect(() => { pushState(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { if (rejectTimer.current) clearTimeout(rejectTimer.current); if (hlTimer.current) clearTimeout(hlTimer.current); }, []);

  /* ── tap path (student) ── */
  const onTileTap = (id: string) => { if (isAI) return; playCue('tap'); setClickSelId(prev => prev === id ? null : id); };
  const onBinClick = (binId: string) => { if (isAI) return; if (clickSelId) place(clickSelId, binId); };

  const cfg = PASS_BY_KEY[activePass];
  const passTiles = tilesForPass(cfg);
  const total = passTiles.length;
  const data = passData[activePass];
  const placedIds = new Set(Object.keys(data));
  const allPlaced = placedIds.size === total;
  const coinBrown = activePass === 'colour';
  const accent = cfg.bins[0].color;
  const order = useMemo(() => seededShuffle(passTiles, PASS_SEEDS[activePass]), [activePass]);
  const selTile = clickSelId ? TILE_BY_ID[clickSelId] : null;
  const binTiles: Record<string, Tile[]> = {}; cfg.bins.forEach(b => { binTiles[b.id] = []; });
  Object.entries(data).forEach(([tid, bid]) => { if (binTiles[bid]) { const t = TILE_BY_ID[tid]; if (t) binTiles[bid].push(t); } });

  const mascotMood: 'idle' | 'cheer' | 'think' = allDone ? 'cheer' : placedIds.size > 0 ? 'idle' : 'think';

  return (
    <div style={{ fontFamily: T.font, width: '100%', maxWidth: width ? width : 760, margin: '0 auto', background: T.pageBg, borderRadius: 24, boxShadow: `0 20px 50px -22px ${T.rgba(0.45)}`, overflow: 'hidden', position: 'relative' }}>
      {/* aria-live */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>{announce}</div>

      {/* header */}
      <div style={{ background: T.gradient, padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -34, right: -26, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 26, background: 'rgba(255,255,255,0.16)', borderRadius: '50%', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🗂️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: T.font, fontWeight: 800, fontSize: 'clamp(15px,3.7vw,21px)', color: '#fff', lineHeight: 1.15 }}>Sort in three ways</h1>
            <p style={{ margin: '2px 0 0', fontSize: 'clamp(10.5px,2.6vw,12px)', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>The same objects can be grouped by shape, colour and material.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span title={isAI ? 'Teacher is showing' : 'Your turn'} style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.18)', borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap' }}>{isAI ? '👩‍🏫 watch' : '🙋 your turn'}</span>
            <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'} style={{ fontSize: 15, cursor: 'pointer', color: '#fff', background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 999, width: 30, height: 30 }}>{muted ? '🔇' : '🔊'}</button>
          </div>
        </div>
      </div>

      <div style={{ padding: 'clamp(12px,3vw,20px)' }}>
        {/* §6.1 watch caption */}
        {isAI && (
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: T.lavender, color: T.deep, fontSize: 13.5, fontWeight: 600 }}>
            <Mascot mood="think" uid={uid} reduced={reduced} size={22} /> Your teacher is showing how the same objects regroup — watch, you'll get a turn.
          </div>
        )}

        <Stepper current={activePass} done={doneKeys} T={T} reduced={reduced} uid={uid} />

        {/* completion boards */}
        {allDone && PASSES.map(p => <DoneSummary key={p.key} pass={p} data={passData[p.key]} T={T} reduced={reduced} uid={uid} />)}

        {/* active step */}
        {!allDone && (
          <div style={{ borderRadius: 20, border: `2px solid ${rgba(accent, 0.55)}`, background: T.card, overflow: 'hidden', boxShadow: `0 6px 28px ${rgba(accent, 0.12)}`, animation: reduced ? undefined : `fadeUp-${uid} .4s ease` }}>
            {/* step header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: `linear-gradient(135deg, ${rgba(accent, 0.12)}, ${rgba(accent, 0.04)})`, borderBottom: `1.5px solid ${rgba(accent, 0.18)}` }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 10px ${rgba(accent, 0.4)}` }}>
                <span style={{ fontFamily: T.font, fontWeight: 800, fontSize: 17, color: '#fff' }}>{cfg.stepNum}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.font, fontWeight: 800, fontSize: 'clamp(14px,3.4vw,17px)', color: accent, lineHeight: 1.15 }}>Step {cfg.stepNum}: Sort by {cfg.label} {cfg.emoji}</div>
                <div style={{ fontSize: 'clamp(10.5px,2.6vw,11.5px)', fontWeight: 600, color: T.sub, marginTop: 1 }}>{cfg.question}</div>
              </div>
              <Mascot mood={mascotMood} uid={uid} reduced={reduced} size={30} />
              <div style={{ fontFamily: T.font, fontWeight: 800, fontSize: 15, color: allPlaced ? T.successText : accent, flexShrink: 0 }}>{placedIds.size}/{total}</div>
            </div>

            <div style={{ padding: 'clamp(12px,3vw,18px)' }}>
              {/* progress bar */}
              <div style={{ background: T.line, borderRadius: 4, height: 6, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(placedIds.size / total) * 100}%`, background: `linear-gradient(90deg, ${accent}, ${T.accent})`, borderRadius: 4, transition: 'width .45s cubic-bezier(.34,1.56,.64,1)' }} />
              </div>

              {/* hint / selection bar — hidden in ai mode */}
              {!isAI && (selTile ? (
                <div style={{ fontSize: 11.5, fontWeight: 700, padding: '8px 12px', borderRadius: 10, marginBottom: 14, border: `1.5px solid ${rgba(accent, 0.5)}`, background: rgba(accent, 0.1), color: accent, display: 'flex', alignItems: 'center', gap: 6, animation: reduced ? undefined : `fadeUp-${uid} .3s ease` }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{selTile.id === 'coin' && coinBrown ? <BrownCoin size={15} /> : selTile.emoji}</span>
                  <span><strong>{selTile.label}</strong> selected — tap the matching bin, or tap another object to swap.</span>
                </div>
              ) : (
                <div style={{ fontSize: 11.5, fontWeight: 700, padding: '8px 12px', borderRadius: 10, marginBottom: 14, border: `1.5px solid ${T.rgba(0.35)}`, background: T.lavender, color: T.deep, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flexShrink: 0 }}>💡</span><span><strong>Tap an object</strong>, then <strong>tap the matching bin</strong> to place it.</span>
                </div>
              ))}

              {/* bins */}
              <div style={{ fontSize: 11, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>① Put each object in the right {cfg.label.toLowerCase()} bin</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
                {cfg.bins.map(bin => (
                  <BinBox key={bin.id} bin={bin} tiles={binTiles[bin.id] || []} armed={!!clickSelId && !isAI} over={false}
                    selectable={!!clickSelId && !isAI} rejecting={rejectBin === bin.id} highlighted={highlightBin === bin.id}
                    coinBrown={coinBrown} onClick={onBinClick} T={T} uid={uid} reduced={reduced} />
                ))}
              </div>

              {/* tray — hidden + inert in ai mode */}
              {!isAI && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.deep, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>② Objects to sort {allPlaced ? '✓ all sorted!' : `(${total - placedIds.size} left)`}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(66px, 1fr))`, gap: 8 }}>
                    {order.map(tile => {
                      const placed = placedIds.has(tile.id);
                      const selected = clickSelId === tile.id;
                      return (
                        <div key={tile.id} className={`tile-${uid}${placed ? ' done' : ''}`} onClick={() => !placed && onTileTap(tile.id)} title={tile.label}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                            padding: '10px 4px', borderRadius: 13, minWidth: 0, minHeight: 78, cursor: placed ? 'default' : 'pointer',
                            background: placed ? T.cardSoft : T.card,
                            border: `2px solid ${selected ? accent : placed ? T.line : T.rgba(0.4)}`,
                            boxShadow: placed ? 'none' : `0 2px 10px ${T.rgba(0.1)}`,
                            opacity: placed ? 0.45 : 1, filter: placed ? 'grayscale(0.35)' : 'none',
                            transform: selected ? 'translateY(-3px) scale(1.05)' : 'none',
                            animation: selected && !reduced ? `ring-${uid} 1.2s ease-in-out infinite` : undefined,
                            pointerEvents: placed ? 'none' : 'auto',
                          }}>
                          <Glyph tile={tile} size={26} brownCoin={coinBrown} />
                          <span style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', color: placed ? T.sub : T.deep, fontFamily: T.font, lineHeight: 1.2 }}>{tile.label}</span>
                          {placed && <span style={{ fontSize: 8, color: T.successText, fontWeight: 800 }}>✓ sorted</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* save / advance */}
              {allPlaced && !isAI && (
                <div style={{ marginTop: 18, position: 'relative' }}>
                  <PillButton variant="primary" full T={T} onClick={() => checkPassComplete(activePass, dataRef.current)}>
                    {cfg.stepNum < 3 ? `✓ Save & go to Step ${cfg.stepNum + 1} →` : '✓ Finish — see the result!'}
                  </PillButton>
                </div>
              )}
            </div>
          </div>
        )}

        {/* final banner */}
        {allDone && (
          <div style={{ marginTop: 4, background: T.gradient, borderRadius: 18, padding: 'clamp(15px,3vw,20px)', boxShadow: `0 6px 28px ${T.rgba(0.3)}`, position: 'relative', overflow: 'hidden', animation: reduced ? undefined : `fadeUp-${uid} .45s ease` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Mascot mood="cheer" uid={uid} reduced={reduced} size={34} />
              <div style={{ fontFamily: T.font, fontWeight: 800, color: '#fff', fontSize: 'clamp(15px,3.4vw,19px)' }}>All 3 steps complete!</div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.94)', fontSize: 'clamp(12px,3vw,13px)', fontWeight: 600, lineHeight: 1.7 }}>
              Look at the three boards above — the <strong style={{ color: T.deep === '#533086' ? '#FFF3E4' : '#fff' }}>same objects</strong> formed <strong style={{ color: '#FFE2BC' }}>completely different groups</strong> each time, depending on the property you sorted by. That is what <strong style={{ color: '#fff' }}>classification</strong> means: the same things can be grouped in many ways!
            </div>
            {!isAI && <div style={{ marginTop: 14 }}><PillButton variant="ghost" T={T} onClick={reset}><span style={{ color: '#fff' }}>↺ Try again</span></PillButton></div>}
          </div>
        )}

        {/* footer */}
        <div style={{ textAlign: 'center', fontSize: 10, color: T.sub, fontWeight: 600, marginTop: 16, padding: '0 8px', lineHeight: 1.4 }}>
          Curiosity · Textbook of Science · Grade 6 · Chapter 6 — Materials Around Us · Activity 6.2
        </div>
      </div>

      {/* confetti */}
      {confetti && !reduced && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 40 }}>
          {[['#4A4DC9', 10, 0], ['#FC9145', 26, 0.08], ['#533086', 42, 0.04], ['#22C55E', 58, 0.12], ['#E53E3E', 72, 0.06], ['#16A34A', 86, 0.1]].map((p, i) => (
            <span key={i} style={{ position: 'absolute', top: 0, left: `${p[1]}%`, width: 9, height: 9, borderRadius: i % 2 ? '50%' : 2, background: p[0] as string, animation: `confetti-${uid} 1.3s ease-in ${p[2]}s forwards` }} />
          ))}
        </div>
      )}
    </div>
  );
};

function ObjectSorterTool(p: ToolProps) { return <ToolErrorBoundary font={"'Poppins',sans-serif"}><ObjectSorter {...p} /></ToolErrorBoundary>; }
try { if (typeof window !== 'undefined') (window as any).__TOOL_COMPONENT__ = ObjectSorterTool; } catch (e) {}
export default ObjectSorterTool;
