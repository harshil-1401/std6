/**
 * Tool: M3.S5.T8.C25.2D1 — "Weigh the cups"
 * CBSE Grade 6 Science · Ch.6 "How heavy? How light?" · beat: Apply · concept: M3.S5.T8.C25
 *
 * PRESERVED FROM THE ORIGINAL (Activity 6.8 "Mass Quiz"):
 *  - The same-volume-different-material → different mass/weight phenomenon.
 *  - The 3 questions, their item sets, the EXACT answer key, reasons and hints:
 *      Q1 three identical half-filled cups (water / sand / pebbles) → heaviest = pebbles (C)
 *      Q2 half a cup of cotton wool vs half a cup of water → more mass = water
 *      Q3 1 kg iron vs 1 kg feathers → same
 *  - The visual identity (cups, balance scale, level balance) and brand palette.
 *
 * ADDED to meet 2D_TOOL_AUTHORING_PROMPT.md:
 *  §3 Agent-control contract: emit({type:'ready', toolId}) on mount; {type:'command', id, method, args}
 *     handler that dispatches to an `api` object and replies {type:'response', id, result}. Verbs:
 *     setParam, play, pause, reset, highlight(target), getState, setOperatorMode(mode) PLUS the
 *     tool-specific "do" verbs weigh / select / compare — each accepts a single id OR an array so the
 *     agent can credit several picks at once. Every verb produces the SAME visible result as the
 *     student and emits {type:'event', name, detail}. window.__TOOL__ = api.
 *  §6.1 operatorMode 'ai' | 'student' (default 'student'): in 'ai' the student choice controls are
 *     HIDDEN and inert (agent drives) BUT the weighing phenomenon — the balance/cups scene + the live
 *     weight read-out — stays visible in both modes; a "👩‍🏫 watch" caption + chip appear. Emits
 *     operator_mode_changed; reflected in getState(). setParam('operatorMode'|'muted', …).
 *  §7.3 Web Audio cues (tap/correct/wrong/done), gated behind first gesture; visible 🔊/🔇 toggle.
 *  §7 Premium CSS/RAF visuals (NO framer-motion): layered gradient cards, animated balance tilt + needle,
 *     count-up weight read-outs, springy selection/correct/wrong motion, confetti on completion, a small
 *     reactive mascot, score/progress, prefers-reduced-motion respected, every control styled.
 */
const { useState, useEffect, useRef, useMemo, useCallback } = React; // renderer globals — no module import

const TOOL_ID = 'M3.S5.T8.C25.2D1';

/* ───────── Brand tokens ───────── */
const THEME = {
  font: "'Poppins','Segoe UI',system-ui,-apple-system,sans-serif",
  primary: '#4A4DC9', primaryLight: '#C1C1EA', accent: '#FF7212', accentLight: '#FFF3E4',
  deep: '#533086', gradEnd: '#FC9145',
  green: '#22c55e', greenSoft: '#dcfce7', greenText: '#14532d',
  red: '#ef4444', redSoft: '#fee2e2', redText: '#7f1d1d',
  textDark: '#1a1a2e', textMid: '#4E4E4E', textLight: '#9aa0b4',
  bg: '#F5F5F5', white: '#FFFFFF', disabled: '#EBEBEB',
  pill: 999, touch: 44,
};
const DARK = {
  bg: '#14131f', card: '#1e1c2e', cardAlt: '#272540', line: '#3a3656',
  textDark: '#f3f1fb', textMid: '#c7c3df', textLight: '#8b86ad',
};

/* ───────── Question model (preserves the original answer key verbatim) ───────── */
type Scene = 'cups' | 'cotton' | 'iron';
interface Choice { id: string; label: string; emoji?: string; }
interface Q {
  id: number; scene: Scene; text: string; sub?: string;
  choices: Choice[]; correctId: string; reason: string; hint: string;
  /* per-choice relative "weight" for the readout/tilt animation (illustrative, age-appropriate) */
  weights: Record<string, number>;   // grams shown on the readout for that pick
}

const QUESTIONS: Q[] = [
  {
    id: 1, scene: 'cups',
    text: 'Three identical cups are each half-filled.',
    sub: 'Cup A → water · Cup B → sand · Cup C → pebbles\nWhich cup is heaviest?',
    choices: [
      { id: 'A', label: 'Cup A — Water', emoji: '💧' },
      { id: 'B', label: 'Cup B — Sand', emoji: '🏖️' },
      { id: 'C', label: 'Cup C — Pebbles', emoji: '🪨' },
    ],
    correctId: 'C',
    reason: 'Pebbles are denser than sand or water, so the same volume of pebbles has the most mass.',
    hint: 'Look at the balance — pebbles tip the scale further than sand or water!',
    weights: { A: 120, B: 230, C: 410 },
  },
  {
    id: 2, scene: 'cotton',
    text: 'Half a cup of cotton wool vs. half a cup of water.',
    sub: 'Which has more mass?',
    choices: [
      { id: 'cotton', label: 'Cotton Wool', emoji: '🧶' },
      { id: 'water', label: 'Water', emoji: '💧' },
    ],
    correctId: 'water',
    reason: 'Water is much denser than cotton wool. The same volume of water has far more mass.',
    hint: 'The balance tips down on the water side — water is packed tightly together!',
    weights: { cotton: 12, water: 125 },
  },
  {
    id: 3, scene: 'iron',
    text: '1 kilogram of iron vs. 1 kilogram of feathers.',
    sub: 'Which has more mass?',
    choices: [
      { id: 'iron', label: 'Iron Block', emoji: '🧱' },
      { id: 'feathers', label: 'Feathers', emoji: '🪶' },
      { id: 'same', label: 'They are the same', emoji: '⚖️' },
    ],
    correctId: 'same',
    reason: '1 kg is 1 kg! Mass is the amount of matter. The material and size do not change the stated mass.',
    hint: 'The balance is perfectly level — both sides show exactly 1 000 g!',
    weights: { iron: 1000, feathers: 1000, same: 1000 },
  },
];
const Q_BY_ID: Record<number, Q> = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
const TOTAL = QUESTIONS.length;

/* friendly alias map so the agent may call weigh('pebbles') / weigh('Cup C') etc. */
const ALIASES: Record<string, { qid: number; choiceId: string }> = {};
QUESTIONS.forEach(q => q.choices.forEach(c => {
  const reg = (k: string) => { ALIASES[k.toLowerCase()] = { qid: q.id, choiceId: c.id }; };
  reg(`${q.id}:${c.id}`); reg(c.id); reg(c.label);
}));
// human-friendly extras
ALIASES['pebbles'] = { qid: 1, choiceId: 'C' };
ALIASES['sand'] = { qid: 1, choiceId: 'B' };
ALIASES['water'] = { qid: 1, choiceId: 'A' }; // q1 water; q2 water resolved by current-question context first

function usePrefersReducedMotion(): boolean {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setRm(m.matches); on();
    m.addEventListener?.('change', on); return () => m.removeEventListener?.('change', on);
  }, []);
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
    if (kind === 'tap') tone(ac, 420, n, 0.09, 'triangle', 0.16);
    else if (kind === 'correct') { tone(ac, 660, n, 0.12, 'sine', 0.2); tone(ac, 880, n + 0.09, 0.16, 'sine', 0.2); }
    else if (kind === 'wrong') tone(ac, 200, n, 0.18, 'sine', 0.18);
    else if (kind === 'done') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, n + i * 0.1, 0.22, 'triangle', 0.2));
  }, []);
  return { playCue, muted, setMuted };
}

/* count-up hook for the weight readout */
function useCountUp(target: number, reduced: boolean, dur = 700) {
  const [v, setV] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (reduced) { setV(target); fromRef.current = target; return; }
    const from = fromRef.current; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (target - from) * e));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, reduced, dur]);
  return v;
}

/* ───────── styled pill button ───────── */
const Pill: React.FC<{ variant?: 'accent' | 'ghost'; onClick?: () => void; children: React.ReactNode; title?: string }> =
  ({ variant = 'accent', onClick, children, title }) => {
    const [h, setH] = useState(false), [p, setP] = useState(false);
    const base: React.CSSProperties = { fontFamily: THEME.font, fontWeight: 700, fontSize: 14, borderRadius: THEME.pill, padding: '11px 26px', minHeight: THEME.touch, cursor: 'pointer', transition: 'all .18s ease', border: '2px solid transparent', display: 'inline-flex', alignItems: 'center', gap: 8 };
    const skin: React.CSSProperties = variant === 'accent'
      ? { background: p ? THEME.deep : `linear-gradient(135deg, ${THEME.deep}, ${THEME.primary})`, color: '#fff', transform: h && !p ? 'translateY(-2px)' : 'none', boxShadow: h ? '0 10px 22px rgba(83,48,134,.34)' : '0 4px 14px rgba(83,48,134,.24)' }
      : { background: h ? THEME.primaryLight : 'transparent', color: THEME.primary, borderColor: THEME.primary };
    return <button type="button" title={title} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} style={{ ...base, ...skin }}>{children}</button>;
  };

/* ───────── SCENES (preserved visual identity; tilt driven by `lead` -1..1) ───────── */
const SceneCups: React.FC<{ pick: string | null; uid: string; reduced: boolean }> = ({ pick }) => {
  const lit = (id: string) => pick === id;
  return (
    <svg viewBox="0 0 340 175" width="100%" style={{ maxWidth: 360, display: 'block', margin: '0 auto' }} aria-hidden="true">
      {(['A', 'B', 'C'] as const).map((lbl, i) => (
        <text key={lbl} x={50 + i * 120} y={15} textAnchor="middle" fontFamily={THEME.font} fontWeight={700} fontSize={13} fill={['#4A4DC9', '#533086', '#FF7212'][i]}>{lbl}</text>
      ))}
      {/* Cup A water */}
      <g style={{ transformOrigin: '50px 88px', transition: 'transform .4s cubic-bezier(.34,1.56,.64,1)', transform: lit('A') ? 'translateY(-6px)' : 'none' }}>
        <path d="M22 30 L18 145 H82 L78 30 Z" fill="#EFF6FF" stroke="#4A4DC9" strokeWidth={lit('A') ? 3 : 2} />
        <path d="M22.8 80 L19.5 145 H80.5 L77.2 80 Z" fill="#93C5FD" opacity="0.75" />
        <ellipse cx="50" cy="80" rx="27" ry="4" fill="#BFDBFE" />
        <path d="M78 55 Q95 55 95 75 Q95 95 78 95" fill="none" stroke="#4A4DC9" strokeWidth="2" />
        <text x="50" y="160" textAnchor="middle" fontFamily={THEME.font} fontSize={10} fill={THEME.textMid}>Water</text>
      </g>
      {/* Cup B sand */}
      <g style={{ transformOrigin: '170px 88px', transition: 'transform .4s cubic-bezier(.34,1.56,.64,1)', transform: lit('B') ? 'translateY(-6px)' : 'none' }}>
        <path d="M142 30 L138 145 H202 L198 30 Z" fill="#FEF9C3" stroke="#533086" strokeWidth={lit('B') ? 3 : 2} />
        <rect x="139.5" y="70" width="61" height="75" rx="1" fill="#FCD34D" opacity="0.85" />
        <ellipse cx="170" cy="70" rx="30" ry="5" fill="#F59E0B" opacity="0.9" />
        {[148, 155, 163, 171, 179, 187, 194].map((x, i) => <circle key={i} cx={x} cy={85 + (i % 3) * 8} r="2" fill="#D97706" opacity="0.5" />)}
        <path d="M198 55 Q215 55 215 75 Q215 95 198 95" fill="none" stroke="#533086" strokeWidth="2" />
        <text x="170" y="160" textAnchor="middle" fontFamily={THEME.font} fontSize={10} fill={THEME.textMid}>Sand</text>
      </g>
      {/* Cup C pebbles */}
      <g style={{ transformOrigin: '290px 88px', transition: 'transform .4s cubic-bezier(.34,1.56,.64,1)', transform: lit('C') ? 'translateY(-6px)' : 'none' }}>
        <path d="M262 30 L258 145 H322 L318 30 Z" fill="#F1F5F9" stroke="#FF7212" strokeWidth={lit('C') ? 3 : 2} />
        <rect x="259.5" y="75" width="61" height="70" rx="1" fill="#CBD5E1" opacity="0.5" />
        {[{ cx: 272, cy: 130, rx: 9, ry: 6 }, { cx: 288, cy: 125, rx: 11, ry: 7 }, { cx: 303, cy: 132, rx: 8, ry: 6 }, { cx: 278, cy: 112, rx: 10, ry: 6 }, { cx: 295, cy: 108, rx: 9, ry: 6 }, { cx: 309, cy: 116, rx: 8, ry: 5 }, { cx: 268, cy: 95, rx: 8, ry: 5 }, { cx: 283, cy: 93, rx: 10, ry: 6 }, { cx: 300, cy: 97, rx: 9, ry: 5 }].map((p, i) =>
          <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={['#94A3B8', '#64748B', '#CBD5E1'][i % 3]} stroke="#475569" strokeWidth="0.8" />)}
        <path d="M318 55 Q335 55 335 75 Q335 95 318 95" fill="none" stroke="#FF7212" strokeWidth="2" />
        <text x="290" y="160" textAnchor="middle" fontFamily={THEME.font} fontSize={10} fill={THEME.textMid}>Pebbles</text>
      </g>
    </svg>
  );
};

/** A balance scale whose beam tilts by `lead`: -1 = left down, +1 = right down, 0 = level. */
const Balance: React.FC<{ lead: number; left: React.ReactNode; right: React.ReactNode; leftLabel: string; rightLabel: string; reduced: boolean }> =
  ({ lead, left, right, leftLabel, rightLabel, reduced }) => {
    const ang = Math.max(-1, Math.min(1, lead)) * 9; // degrees
    const beamT = `rotate(${ang} 160 72)`;
    // pan vertical offsets follow the beam tilt
    const dy = ang * 2.2;
    return (
      <svg viewBox="0 0 320 185" width="100%" style={{ maxWidth: 340, display: 'block', margin: '0 auto' }} aria-hidden="true">
        <rect x="156" y="58" width="8" height="100" rx="4" fill="#64748B" />
        <circle cx="160" cy="58" r="10" fill="#475569" />
        <g style={{ transition: reduced ? 'none' : 'transform .55s cubic-bezier(.34,1.4,.5,1)', transformBox: 'view-box' as any }}>
          <line x1="30" y1="72" x2="290" y2="72" stroke="#334155" strokeWidth="5" strokeLinecap="round" transform={beamT} />
          <circle cx="160" cy="72" r="5" fill="#1f2937" transform={beamT} />
        </g>
        {/* left pan */}
        <g style={{ transition: reduced ? 'none' : 'transform .55s cubic-bezier(.34,1.4,.5,1)' }} transform={`translate(0 ${dy})`}>
          <line x1="60" y1={72} x2="60" y2="104" stroke="#64748B" strokeWidth="2" />
          <ellipse cx="60" cy="112" rx="36" ry="9" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
          <g transform="translate(60 96)">{left}</g>
          <text x="60" y="136" textAnchor="middle" fontFamily={THEME.font} fontSize={10} fill={THEME.textMid}>{leftLabel}</text>
        </g>
        {/* right pan */}
        <g style={{ transition: reduced ? 'none' : 'transform .55s cubic-bezier(.34,1.4,.5,1)' }} transform={`translate(0 ${-dy})`}>
          <line x1="260" y1={72} x2="260" y2="104" stroke="#64748B" strokeWidth="2" />
          <ellipse cx="260" cy="112" rx="36" ry="9" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
          <g transform="translate(260 96)">{right}</g>
          <text x="260" y="136" textAnchor="middle" fontFamily={THEME.font} fontSize={10} fill={THEME.textMid}>{rightLabel}</text>
        </g>
        <rect x="130" y="158" width="60" height="12" rx="4" fill="#475569" />
        <rect x="118" y="168" width="84" height="8" rx="4" fill="#334155" />
      </svg>
    );
  };

const CottonGfx = (
  <g>{[{ cx: -13, cy: -1 }, { cx: 0, cy: -7 }, { cx: 13, cy: -3 }, { cx: -8, cy: -13 }, { cx: 7, cy: -13 }].map((p, i) =>
    <circle key={i} cx={p.cx} cy={p.cy} r={9} fill="#fff" stroke="#CBD5E1" strokeWidth="1" />)}</g>
);
const WaterGfx = (
  <g><path d="M-14 -10 L-17 14 H17 L14 -10 Z" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="1.5" /><ellipse cx="0" cy="-10" rx="14" ry="3.5" fill="#93C5FD" /></g>
);
const IronGfx = (
  <g><rect x="-20" y="-12" width="40" height="24" rx="3" fill="#64748B" stroke="#334155" strokeWidth="1.5" /><text x="0" y="5" textAnchor="middle" fontFamily={THEME.font} fontSize={9} fontWeight={700} fill="#fff">IRON</text></g>
);
const FeatherGfx = (
  <g>{[{ cx: -13, cy: 0, r: 9 }, { cx: 0, cy: -5, r: 11 }, { cx: 13, cy: -1, r: 9 }, { cx: -9, cy: -10, r: 8 }, { cx: 5, cy: -14, r: 9 }].map((p, i) =>
    <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#FEF9C3" stroke="#FCD34D" strokeWidth="1" />)}</g>
);

/* ───────── confetti (canvas) on completion ───────── */
const Confetti: React.FC<{ fire: boolean; reduced: boolean }> = ({ fire, reduced }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!fire || reduced) return;
    const cvs = ref.current; if (!cvs) return;
    const ctx = cvs.getContext('2d'); if (!ctx) return;
    const W = cvs.width = cvs.offsetWidth, H = cvs.height = cvs.offsetHeight;
    const cols = ['#4A4DC9', '#FF7212', '#533086', '#FC9145', '#22c55e', '#C1C1EA'];
    const parts = Array.from({ length: 110 }).map(() => ({
      x: Math.random() * W, y: -20 - Math.random() * H * 0.5,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3.5,
      s: 4 + Math.random() * 6, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      c: cols[(Math.random() * cols.length) | 0],
    }));
    let raf = 0, frames = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); frames++;
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      });
      if (frames < 160) raf = requestAnimationFrame(draw); else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [fire, reduced]);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }} />;
};

/* ───────── mascot (reactive emoji) ───────── */
const Mascot: React.FC<{ mood: 'idle' | 'happy' | 'oops' | 'done'; uid: string; reduced: boolean }> = ({ mood, uid, reduced }) => {
  const face = mood === 'happy' ? '🤩' : mood === 'oops' ? '🤔' : mood === 'done' ? '🥳' : '🧑‍🔬';
  const anim = reduced ? undefined : mood === 'happy' ? `bob-${uid} .5s ease` : mood === 'oops' ? `tilt-${uid} .5s ease` : mood === 'done' ? `bob-${uid} .6s ease 2` : `float-${uid} 3s ease-in-out infinite`;
  return <span aria-hidden="true" style={{ fontSize: 30, display: 'inline-block', animation: anim, lineHeight: 1 }}>{face}</span>;
};

class ToolErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { if (this.state.err) return <div role="alert" style={{ fontFamily: THEME.font, padding: 24, background: THEME.accentLight, borderRadius: 16, color: THEME.deep }}>Something went wrong loading this activity. Please reload.</div>; return this.props.children; }
}

interface ToolProps {
  props?: { width?: number; height?: number; themeColor?: string; darkMode?: boolean; operatorMode?: 'ai' | 'student'; muted?: boolean; additionalProps?: Record<string, any> };
  setStepDetails?: (d: { beat: string; stepIndex: number; totalSteps: number; state: Record<string, any> }) => void;
  stopAutoNext?: boolean; setStopAutoNext?: (v: boolean) => void;
}

function starsFor(score: number): number { return score >= TOTAL ? 3 : score === TOTAL - 1 ? 2 : score >= 1 ? 1 : 0; }

const WeighTheCups: React.FC<ToolProps> = ({ props = {}, setStepDetails }) => {
  const reduced = usePrefersReducedMotion();
  const uid = useMemo(() => 'w' + Math.random().toString(36).slice(2, 8), []);
  const dark = !!props.darkMode;
  const theme = props.themeColor || THEME.primary;
  const finalMessage: string = (props.additionalProps && props.additionalProps.finalMessage) ||
    'Mass = the amount of matter in an object. More matter packed in the same space means more mass. A kilogram is a kilogram — no matter what material it is!';

  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState<Record<number, boolean>>({});  // per-question solved flag
  const [pick, setPick] = useState<string | null>(null);              // current highlighted/selected choice
  const [phase, setPhase] = useState<'idle' | 'wrong' | 'correct'>('idle');
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [done, setDone] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('Pick the heavier choice — watch the balance tip.');

  const { playCue, muted, setMuted } = useSound(!!props.muted);

  const initialMode: 'ai' | 'student' = props.operatorMode === 'ai' ? 'ai' : 'student';
  const [mode, setMode] = useState<'ai' | 'student'>(initialMode);
  const modeRef = useRef(mode); modeRef.current = mode;

  const qIndexRef = useRef(qIndex); qIndexRef.current = qIndex;
  const scoreRef = useRef(score); scoreRef.current = score;
  const solvedRef = useRef(solved); solvedRef.current = solved;
  const doneRef = useRef(done); doneRef.current = done;
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = QUESTIONS[Math.min(qIndex, TOTAL - 1)];

  const buildState = useCallback(() => ({
    questionIndex: qIndexRef.current, total: TOTAL, score: scoreRef.current,
    solved: { ...solvedRef.current }, finished: doneRef.current, operatorMode: modeRef.current,
  }), []);

  const emit = useCallback((msg: any) => { try { window.parent.postMessage(msg, '*'); } catch (e) {} }, []);
  const pushState = useCallback(() => {
    const s = buildState();
    emit({ type: 'state', state: s });
    setStepDetails?.({ beat: 'Apply', stepIndex: s.questionIndex, totalSteps: TOTAL, state: s });
  }, [buildState, emit, setStepDetails]);

  /* resolve an arg to {qid, choiceId} — current question first, then global aliases */
  const resolve = useCallback((raw: any): { qid: number; choiceId: string } | null => {
    const key = String(raw).toLowerCase().trim();
    const cur = QUESTIONS[qIndexRef.current];
    if (cur) {
      const direct = cur.choices.find(c => c.id.toLowerCase() === key || c.label.toLowerCase() === key);
      if (direct) return { qid: cur.id, choiceId: direct.id };
      // friendly per-question word
      if (key === 'heaviest' || key === 'heavier' || key === 'more') return { qid: cur.id, choiceId: cur.correctId };
    }
    const a = ALIASES[key];
    if (a) return a;
    // raw "qid:choice"
    const m = key.match(/^(\d+)[:.\- ](.+)$/);
    if (m) { const qq = Q_BY_ID[Number(m[1])]; const c = qq?.choices.find(x => x.id.toLowerCase() === m[2]); if (qq && c) return { qid: qq.id, choiceId: c.id }; }
    return null;
  }, []);

  const advance = useCallback(() => {
    if (qIndexRef.current + 1 >= TOTAL) {
      doneRef.current = true; setDone(true); playCue('done');
      setAnnounce('All weighed! ' + finalMessage);
      emit({ type: 'event', name: 'completed', detail: { score: scoreRef.current, total: TOTAL, stars: starsFor(scoreRef.current) } });
    } else {
      const ni = qIndexRef.current + 1; qIndexRef.current = ni; setQIndex(ni);
      setPick(null); setPhase('idle'); setWrongId(null); setFeedback(null);
      setAnnounce('Next: ' + (QUESTIONS[ni].sub?.split('\n').slice(-1)[0] || QUESTIONS[ni].text));
    }
    setTimeout(pushState, 0);
  }, [emit, pushState, playCue, finalMessage]);

  /* core "do" — weigh/select a choice. Accepts single id OR array. */
  const doSelect = useCallback((raw: any, eventName: string) => {
    if (doneRef.current) return buildState();
    const list = Array.isArray(raw) ? raw : [raw];
    let advanced = false;
    for (const item of list) {
      const r = resolve(item);
      if (!r) continue;
      // only act on the CURRENT question's choices (idempotent-safe across the quiz)
      if (r.qid !== QUESTIONS[qIndexRef.current].id) continue;
      const cur = QUESTIONS[qIndexRef.current];
      setPick(r.choiceId);
      const correct = r.choiceId === cur.correctId;
      emit({ type: 'event', name: eventName, detail: { questionId: cur.id, choiceId: r.choiceId, correct } });
      if (solvedRef.current[cur.id]) { continue; } // already solved → just re-highlight
      if (correct) {
        setPhase('correct'); setWrongId(null);
        setFeedback({ text: '✅ ' + cur.reason, ok: true });
        const ns = scoreRef.current + 1; scoreRef.current = ns; setScore(ns);
        const nsolved = { ...solvedRef.current, [cur.id]: true }; solvedRef.current = nsolved; setSolved(nsolved);
        setAnnounce('Correct! ' + cur.reason);
        playCue('correct');
        emit({ type: 'event', name: 'answer_correct', detail: { questionId: cur.id, choiceId: r.choiceId } });
        // auto-advance for array credit so the agent can solve many at once
        if (Array.isArray(raw)) { advance(); advanced = true; break; }
      } else {
        setPhase('wrong'); setWrongId(r.choiceId);
        setFeedback({ text: '❌ ' + cur.hint, ok: false });
        setAnnounce('Not quite. ' + cur.hint);
        playCue('wrong');
        emit({ type: 'event', name: 'answer_incorrect', detail: { questionId: cur.id, choiceId: r.choiceId } });
        if (wrongTimer.current) clearTimeout(wrongTimer.current);
        wrongTimer.current = setTimeout(() => {
          setPhase('idle'); setWrongId(null); setFeedback(null); setPick(null);
        }, reduced ? 0 : 1700);
      }
    }
    if (!advanced) setTimeout(pushState, 0);
    return buildState();
  }, [buildState, resolve, emit, playCue, reduced, advance, pushState]);

  const weigh = useCallback((raw: any) => doSelect(raw, 'weighed'), [doSelect]);
  const select = useCallback((raw: any) => doSelect(raw, 'selected'), [doSelect]);

  /* compare(a,b) or compare([a,b]) — narrate which is heavier without locking the answer */
  const compare = useCallback((a: any, b?: any) => {
    const arr = Array.isArray(a) ? a : (b !== undefined ? [a, b] : [a]);
    const cur = QUESTIONS[qIndexRef.current];
    const items = arr.map(x => resolve(x)).filter(Boolean).filter(r => r!.qid === cur.id) as { qid: number; choiceId: string }[];
    if (items.length === 0) return buildState();
    const ranked = items.map(r => ({ id: r.choiceId, w: cur.weights[r.choiceId] ?? 0 })).sort((x, y) => y.w - x.w);
    const top = ranked[0];
    setPick(top.id); setHighlightId(top.id);
    if (hlTimer.current) clearTimeout(hlTimer.current);
    if (!reduced) hlTimer.current = setTimeout(() => setHighlightId(null), 1600);
    const lblOf = (id: string) => cur.choices.find(c => c.id === id)?.label || id;
    const txt = ranked.length > 1
      ? `${lblOf(top.id)} (${top.w} g) is heavier than ${lblOf(ranked[1].id)} (${ranked[1].w} g).`
      : `${lblOf(top.id)} weighs about ${top.w} g.`;
    setAnnounce(txt);
    emit({ type: 'event', name: 'compared', detail: { ranked: ranked.map(r => r.id), heavier: top.id } });
    playCue('tap');
    setTimeout(pushState, 0);
    return buildState();
  }, [resolve, emit, reduced, playCue, buildState, pushState]);

  const highlight = useCallback((target: any) => {
    const r = resolve(target);
    if (hlTimer.current) clearTimeout(hlTimer.current);
    if (r && r.qid === QUESTIONS[qIndexRef.current].id) {
      setHighlightId(r.choiceId); setAnnounce('Look at: ' + (QUESTIONS[qIndexRef.current].choices.find(c => c.id === r.choiceId)?.label || target));
      if (!reduced) hlTimer.current = setTimeout(() => setHighlightId(null), 2000);
    } else { setAnnounce('Look at: ' + target); }
    playCue('tap');
    return buildState();
  }, [resolve, reduced, playCue, buildState]);

  const reset = useCallback(() => {
    qIndexRef.current = 0; scoreRef.current = 0; solvedRef.current = {}; doneRef.current = false;
    setQIndex(0); setScore(0); setSolved({}); setDone(false);
    setPick(null); setPhase('idle'); setWrongId(null); setFeedback(null); setHighlightId(null);
    setAnnounce('Reset. Pick the heavier choice — watch the balance tip.');
    emit({ type: 'event', name: 'reset', detail: {} });
    setTimeout(pushState, 0);
    return buildState();
  }, [emit, pushState, buildState]);

  const getState = useCallback(() => buildState(), [buildState]);

  const setOperatorMode = useCallback((m: any) => {
    const next: 'ai' | 'student' = String(m).toLowerCase() === 'ai' ? 'ai' : 'student';
    modeRef.current = next; setMode(next);
    emit({ type: 'event', name: 'operator_mode_changed', detail: { operatorMode: next } });
    setTimeout(pushState, 0);
    return buildState();
  }, [emit, pushState, buildState]);

  const setParam = useCallback((name: string, value: any) => {
    if (name === 'muted') setMuted(!!value);
    else if (name === 'operatorMode') setOperatorMode(value);
    return buildState();
  }, [setMuted, setOperatorMode, buildState]);

  /* §3 contract wiring */
  useEffect(() => {
    const api: Record<string, (...a: any[]) => any> = {
      setParam, play: () => buildState(), pause: () => buildState(), reset, highlight, getState,
      setOperatorMode, weigh, select, compare, next: () => { advance(); return buildState(); },
    };
    (window as any).__TOOL__ = api;
    emit({ type: 'ready', toolId: TOOL_ID });
    const onMsg = (e: MessageEvent) => {
      const d = (e as any).data; if (!d || d.type !== 'command') return;
      const fn = api[d.method]; let result;
      if (typeof fn === 'function') result = fn.apply(null, d.args || []);
      emit({ type: 'response', id: d.id, result: result === undefined ? api.getState() : result });
    };
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('message', onMsg); if ((window as any).__TOOL__ === api) delete (window as any).__TOOL__; };
  }, [setParam, reset, highlight, getState, setOperatorMode, weigh, select, compare, advance, emit, buildState]);

  /* keyframes + scrollbar */
  useEffect(() => {
    const el = document.createElement('style'); el.id = 'st-' + uid;
    const kf = reduced ? '' : `
      @keyframes fade-${uid}{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slide-${uid}{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
      @keyframes shake-${uid}{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
      @keyframes lock-${uid}{0%{transform:scale(1)}40%{transform:scale(1.06)}75%{transform:scale(.98)}100%{transform:scale(1)}}
      @keyframes grad-${uid}{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @keyframes pop-${uid}{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
      @keyframes star-${uid}{0%{opacity:0;transform:scale(.2) rotate(-25deg)}60%{transform:scale(1.25) rotate(8deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
      @keyframes float-${uid}{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      @keyframes bob-${uid}{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
      @keyframes tilt-${uid}{0%,100%{transform:rotate(0)}30%{transform:rotate(-9deg)}70%{transform:rotate(9deg)}}`;
    const scroll = `.scroll-${uid}{scrollbar-width:thin;scrollbar-color:${THEME.primaryLight} transparent;}
.scroll-${uid}::-webkit-scrollbar{width:8px;}
.scroll-${uid}::-webkit-scrollbar-thumb{background:${THEME.primaryLight};border-radius:999px;}`;
    el.textContent = kf + scroll;
    document.head.appendChild(el); return () => { el.remove(); };
  }, [uid, reduced]);

  useEffect(() => { pushState(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { if (wrongTimer.current) clearTimeout(wrongTimer.current); if (hlTimer.current) clearTimeout(hlTimer.current); }, []);

  /* ── derived UI ── */
  const isAI = mode === 'ai';
  const palette = dark ? DARK : { bg: THEME.bg, card: THEME.white, cardAlt: '#fafafe', line: THEME.disabled, textDark: THEME.textDark, textMid: THEME.textMid, textLight: THEME.textLight };
  const stars = starsFor(score);

  // readout weight for the current pick (count-up)
  const readoutTarget = pick ? (q.weights[pick] ?? 0) : 0;
  const readout = useCountUp(readoutTarget, reduced);

  // balance tilt: for the cotton & iron scenes, tilt by current pick (or correct answer in AI/idle as a teaching cue)
  const tiltLead = useMemo(() => {
    if (q.scene === 'iron') return 0; // always level
    if (q.scene === 'cotton') {
      const showId = pick || (isAI ? q.correctId : null);
      if (!showId) return 0;
      // water heavier → right pan (water) down → lead +1
      return showId === 'water' ? 1 : showId === 'cotton' ? -0.55 : 0;
    }
    return 0;
  }, [q, pick, isAI]);

  const mascotMood: 'idle' | 'happy' | 'oops' | 'done' = done ? 'done' : phase === 'correct' ? 'happy' : phase === 'wrong' ? 'oops' : 'idle';

  const choiceState = (id: string): 'idle' | 'correct' | 'wrong' | 'disabled' | 'pick' => {
    if (solved[q.id]) return id === q.correctId ? 'correct' : 'disabled';
    if (phase === 'correct') return id === q.correctId ? 'correct' : 'disabled';
    if (phase === 'wrong') return id === wrongId ? 'wrong' : 'disabled';
    if (highlightId === id || pick === id) return 'pick';
    return 'idle';
  };

  const renderScene = () => {
    if (q.scene === 'cups') return <SceneCups pick={pick || (isAI ? q.correctId : null)} uid={uid} reduced={reduced} />;
    if (q.scene === 'cotton') return <Balance lead={tiltLead} reduced={reduced} left={CottonGfx} right={WaterGfx} leftLabel="Cotton wool" rightLabel="Water (½ cup)" />;
    return <Balance lead={0} reduced={reduced} left={IronGfx} right={FeatherGfx} leftLabel="1 kg iron" rightLabel="1 kg feathers" />;
  };

  const card: React.CSSProperties = { background: palette.card, borderRadius: 20, boxShadow: dark ? '0 8px 30px rgba(0,0,0,.5)' : '0 4px 24px rgba(0,0,0,.08)', border: `1px solid ${palette.line}` };

  return (
    <div style={{ fontFamily: THEME.font, background: palette.bg, width: '100%', padding: 14, boxSizing: 'border-box', position: 'relative', borderRadius: 24, overflow: 'hidden' }}>
      <Confetti fire={done} reduced={reduced} />

      {/* live region */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>{announce}</div>

      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: 14, animation: reduced ? undefined : `fade-${uid} .5s ease`, position: 'relative' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span title={isAI ? 'Teacher is showing' : 'Your turn'} style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: isAI ? THEME.deep : THEME.primary, borderRadius: THEME.pill, padding: '4px 10px' }}>{isAI ? '👩‍🏫 Watch' : '🙋 Your turn'}</span>
          <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'} style={{ fontSize: 14, cursor: 'pointer', color: THEME.primary, background: palette.card, border: `1px solid ${palette.line}`, borderRadius: 999, width: 32, height: 32 }}>{muted ? '🔇' : '🔊'}</button>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Mascot mood={mascotMood} uid={uid} reduced={reduced} />
          <div style={{ fontWeight: 800, fontSize: 'clamp(17px,5.5vw,24px)', letterSpacing: -0.3, background: `linear-gradient(135deg,${THEME.deep},${theme},${THEME.accent})`, backgroundSize: '200% 200%', animation: reduced ? undefined : `grad-${uid} 5s ease infinite`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⚖️ Weigh the Cups</div>
        </div>
        <p style={{ fontSize: 12.5, color: palette.textMid, margin: '4px 0 0', fontWeight: 500 }}>Same size, different stuff — which weighs more? Pick and watch the balance tip.</p>
      </div>

      {/* watch caption (ai) */}
      {isAI && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', padding: '10px 14px', borderRadius: 12, background: THEME.primaryLight, color: THEME.deep, fontSize: 13.5, fontWeight: 600 }}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>👩‍🏫</span>
          Your teacher is weighing the cups for you — watch the balance, you'll get a turn.
        </div>
      )}

      {/* progress + score */}
      {!done && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: palette.textMid }}>Question {Math.min(qIndex + 1, TOTAL)} of {TOTAL}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: theme }}>Score: {score} / {TOTAL}</span>
          </div>
          <div style={{ height: 8, background: palette.line, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((qIndex / TOTAL) * 100)}%`, background: `linear-gradient(90deg,${THEME.deep},${theme},${THEME.accent})`, borderRadius: 8, transition: reduced ? 'none' : 'width .5s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {QUESTIONS.map((qq, i) => (
              <div key={qq.id} style={{ flex: 1, height: 6, borderRadius: 4, background: solved[qq.id] ? THEME.green : i === qIndex ? theme : palette.line, transition: 'background .3s' }} />
            ))}
          </div>
        </div>
      )}

      {/* MAIN CARD */}
      <div style={{ ...card, padding: 'clamp(12px,3vw,20px)' }}>
        {done ? (
          /* ── SUMMARY ── */
          <div style={{ textAlign: 'center', animation: reduced ? undefined : `pop-${uid} .5s cubic-bezier(.34,1.56,.64,1)` }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ fontSize: 30, opacity: i < stars ? 1 : 0.3, filter: i < stars ? 'none' : 'grayscale(1)', display: 'inline-block', animation: (reduced || i >= stars) ? undefined : `star-${uid} .5s ease both ${0.12 + i * 0.14}s` }}>{i < stars ? '⭐' : '☆'}</span>
              ))}
            </div>
            <div style={{ fontSize: 46, marginBottom: 4 }}>{score === TOTAL ? '🏆' : '👍'}</div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(18px,5vw,24px)', background: `linear-gradient(135deg,${THEME.deep},${theme})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>{score === TOTAL ? 'Perfect Score!' : score >= 2 ? 'Great Job!' : 'Keep Practising!'}</div>
            <div style={{ fontWeight: 800, fontSize: 42, color: score === TOTAL ? THEME.green : theme, marginBottom: 12 }}>{score} / {TOTAL}</div>
            <div style={{ background: `linear-gradient(135deg,${THEME.primaryLight}55,${THEME.accentLight})`, border: `2px solid ${THEME.primaryLight}`, borderRadius: 16, padding: '16px 18px', marginBottom: 16, fontSize: 13.5, fontWeight: 700, color: THEME.deep, lineHeight: 1.5 }}>💡 {finalMessage}</div>
            {!isAI && <Pill variant="accent" onClick={reset}>↻ Try Again</Pill>}
          </div>
        ) : (
          <div style={{ animation: reduced ? undefined : `fade-${uid} .4s ease` }} key={qIndex}>
            {/* scene + readout */}
            <div style={{ background: `linear-gradient(135deg,${THEME.accentLight},rgba(193,193,234,.18))`, borderRadius: 16, padding: '12px 8px 8px', marginBottom: 12, border: `1px solid ${THEME.primaryLight}`, position: 'relative', overflow: 'hidden' }}>
              {renderScene()}
              {/* live weight read-out — visible in BOTH modes (the phenomenon stays) */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: palette.card, border: `2px solid ${pick ? theme : palette.line}`, borderRadius: THEME.pill, padding: '5px 16px', fontWeight: 800, color: palette.textDark, boxShadow: '0 2px 8px rgba(0,0,0,.06)', transition: 'border-color .3s' }}>
                  <span aria-hidden="true">⚖️</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 16, color: theme }}>{readout.toLocaleString()}</span>
                  <span style={{ fontSize: 12, color: palette.textMid }}>g {pick ? `· ${q.choices.find(c => c.id === pick)?.label}` : '(pick one)'}</span>
                </div>
              </div>
            </div>

            {/* question text */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 'clamp(13px,3.5vw,16px)', color: palette.textDark, lineHeight: 1.4, marginBottom: 4 }}>{q.text}</div>
              {q.sub && q.sub.split('\n').map((line, i, arr) => (
                <div key={i} style={{ fontSize: 'clamp(11px,2.8vw,13px)', color: palette.textMid, fontWeight: i === arr.length - 1 ? 700 : 400, marginTop: i === 0 ? 0 : 3 }}>{line}</div>
              ))}
            </div>

            {/* choices — hidden + inert in AI mode (§6.1) */}
            {!isAI ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                {q.choices.map(c => {
                  const st = choiceState(c.id);
                  const bg = st === 'correct' ? `linear-gradient(135deg,${THEME.greenSoft},#bbf7d0)` : st === 'wrong' ? `linear-gradient(135deg,${THEME.redSoft},#fecaca)` : st === 'pick' ? `linear-gradient(135deg,${THEME.accentLight},#ffe4d0)` : st === 'disabled' ? palette.cardAlt : palette.card;
                  const bd = st === 'correct' ? THEME.green : st === 'wrong' ? THEME.red : st === 'pick' ? THEME.accent : palette.line;
                  const col = st === 'correct' ? THEME.greenText : st === 'wrong' ? THEME.redText : st === 'disabled' ? palette.textLight : palette.textDark;
                  const interactive = st === 'idle' || st === 'pick';
                  return (
                    <button key={c.id} type="button" disabled={!interactive}
                      onClick={() => interactive && weigh(c.id)}
                      onMouseEnter={() => interactive && setPick(p => (phase === 'idle' ? c.id : p))}
                      style={{
                        width: '100%', padding: '12px 14px', border: `2px solid ${bd}`, borderRadius: 12, background: bg,
                        cursor: interactive ? 'pointer' : 'not-allowed', fontFamily: THEME.font, fontWeight: 600,
                        fontSize: 'clamp(12px,3vw,14px)', color: col, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                        transition: 'all .2s ease',
                        boxShadow: st === 'pick' ? '0 6px 18px rgba(255,114,18,.18)' : st === 'correct' ? '0 4px 14px rgba(34,197,94,.2)' : '0 2px 6px rgba(0,0,0,.05)',
                        animation: (st === 'wrong' && !reduced) ? `shake-${uid} .4s ease` : (st === 'correct' && !reduced) ? `lock-${uid} .35s ease` : undefined,
                      }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{st === 'correct' ? '✅' : st === 'wrong' ? '❌' : (c.emoji || '⚪')}</span>
                      <span style={{ flex: 1 }}>{c.label}</span>
                      {st !== 'idle' && st !== 'disabled' && <span style={{ fontSize: 11, fontWeight: 700, color: palette.textMid, fontVariantNumeric: 'tabular-nums' }}>{q.weights[c.id]} g</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: palette.cardAlt, border: `1px dashed ${palette.line}`, color: palette.textMid, fontSize: 13, textAlign: 'center' }}>
                👀 Watch the balance and the weight read-out above.
              </div>
            )}

            {/* feedback */}
            {feedback && (
              <div style={{ marginBottom: 12, background: feedback.ok ? `linear-gradient(135deg,${THEME.greenSoft},#bbf7d0)` : `linear-gradient(135deg,${THEME.redSoft},#fecaca)`, border: `2px solid ${feedback.ok ? THEME.green : THEME.red}`, borderRadius: 14, padding: '11px 16px', display: 'flex', gap: 10, animation: reduced ? undefined : `slide-${uid} .3s ease`, fontSize: 13, fontWeight: 500, color: feedback.ok ? THEME.greenText : THEME.redText, lineHeight: 1.5 }}>
                <span>{feedback.ok ? '✅' : '💡'}</span><span>{feedback.text}</span>
              </div>
            )}

            {/* next button (correct, student) */}
            {(phase === 'correct' || solved[q.id]) && !isAI && (
              <div style={{ textAlign: 'right', animation: reduced ? undefined : `slide-${uid} .3s ease` }}>
                <Pill variant="accent" onClick={advance}>{qIndex + 1 < TOTAL ? 'Next Question →' : 'See Results 🎉'}</Pill>
              </div>
            )}
          </div>
        )}
      </div>

      {/* restart link */}
      {!done && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button type="button" onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: THEME.font, fontSize: 12, fontWeight: 600, color: palette.textLight, display: 'inline-flex', alignItems: 'center', gap: 5 }}>↻ Restart quiz</button>
        </div>
      )}
    </div>
  );
};

function WeighTheCupsTool(p: ToolProps) {
  return <ToolErrorBoundary><WeighTheCups {...p} /></ToolErrorBoundary>;
}

try { if (typeof window !== 'undefined') (window as any).__TOOL_COMPONENT__ = WeighTheCupsTool; } catch (e) {}
export default WeighTheCupsTool;
