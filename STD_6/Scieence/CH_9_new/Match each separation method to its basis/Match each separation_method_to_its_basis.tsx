// ============================================================================
// WISEFISH.2D1.tsx  —  "Wise Fish: Match the Separation Method"
// Concept: Methods of separation (Class 6). Subtype: matching.
// Self-contained, agent-drivable 2D teaching tool.
//
// Contract (see toolprompt §3): emits {type:'ready', toolId} on mount, listens
// for {type:'command', id, method, args}, exposes a window-message API, and
// emits {type:'event'|'state'|'response'} back to the host.
//
// NOTE: replace the tool code "WISEFISH.2D1" (filename, TOOL_ID, and the JSON
// toolId) with your real media code before shipping.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ── the tool fills its container (iframe) and lays out fluidly at any aspect ──
const TOOL_ID = 'WISEFISH.2D1';

const emit = (m: any) => { try { window.parent.postMessage(m, '*'); } catch { /* noop */ } };

// ============================================================================
// TYPES
// ============================================================================
interface Pair {
  id: string;          // intuitive slug id (matches JSON answerKey), e.g. "winnowing"
  method: string;      // on-screen label
  description: string; // the slip text
  hint: string;
  emoji: string;
}

interface ToolProps {
  themeColor?: string;
  darkMode?: boolean;
  seed?: number;
  muted?: boolean;
  showHints?: boolean;
  pairs?: Pair[];
  animationSpeed?: number;
  // tolerate the platform's nested shapes too
  props?: any;
  additionalProps?: any;
  setStepDetails?: (s: any) => void;
}

type Mood = 'idle' | 'happy' | 'worried' | 'celebrate';

// ============================================================================
// DEFAULT CONTENT
// ============================================================================
const DEFAULT_PAIRS: Pair[] = [
  { id: 'handpicking', method: 'Handpicking', description: 'Larger particles picked out by hand, by size, colour and shape', hint: 'Like picking stones out of rice.', emoji: '👋' },
  { id: 'threshing', method: 'Threshing', description: 'Beating stalks to loosen and separate the grains from them', hint: 'Farmers beat wheat stalks on a log.', emoji: '🌾' },
  { id: 'winnowing', method: 'Winnowing', description: 'Lighter husk blown away from heavier grain by wind or air', hint: 'A bamboo tray tossed into the wind.', emoji: '💨' },
  { id: 'sieving', method: 'Sieving', description: 'Separating a mixture by the difference in particle size', hint: 'Flour falls through; bran stays on top.', emoji: '🪣' },
  { id: 'evaporation', method: 'Evaporation', description: 'A liquid turns to vapour — used to get salt from seawater', hint: 'Salt pans dry out under the sun.', emoji: '☀️' },
  { id: 'sedimentation', method: 'Sedimentation', description: 'The heavier insoluble part settles to the bottom of a liquid', hint: 'Mud settles at the bottom of a glass.', emoji: '⬇️' },
  { id: 'decantation', method: 'Decantation', description: 'Clear liquid poured off gently after the solid has settled', hint: 'Tilt slowly to pour off the clear water.', emoji: '🫗' },
  { id: 'filtration', method: 'Filtration', description: 'Insoluble solids caught as residue on filter paper or cloth', hint: 'A strainer holds back the tea leaves.', emoji: '🔽' },
  { id: 'churning', method: 'Churning', description: 'Butter is drawn out of curd by rapid stirring or churning', hint: 'Buttermilk is what is left behind.', emoji: '🧈' },
  { id: 'magnetic_separation', method: 'Magnetic separation', description: 'A magnet pulls magnetic bits away from non-magnetic ones', hint: 'Iron filings jump to the magnet.', emoji: '🧲' },
  { id: 'condensation', method: 'Condensation', description: 'Water vapour cools and turns back into liquid water', hint: 'Droplets form on a cold glass.', emoji: '💧' },
];

const SCI_FACTS = [
  'A mixture can be separated because its parts differ — in size, weight, magnetism, or whether they dissolve.',
  'Winnowing works because husk is lighter than grain, so moving air carries it further.',
  'Filtration separates an insoluble solid from a liquid; evaporation separates a dissolved solid.',
];

// ============================================================================
// SEEDED RANDOM (deterministic given the same seed)
// ============================================================================
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed >>> 0);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================================
// PALETTE  (driven by themeColor + darkMode)
// ============================================================================
function buildPalette(theme: string, dark: boolean) {
  const accent = theme || '#4A4DC9';
  const accent2 = '#FF7212';
  const gradA = '#533086';
  const gradB = '#FC9145';
  if (dark) {
    return {
      accent, accent2, gradA, gradB,
      stageA: '#06182c', stageB: '#0d2b4e', stageC: '#14406f',
      panel: 'rgba(255,255,255,0.06)', panelHi: 'rgba(255,255,255,0.10)',
      stroke: 'rgba(255,255,255,0.12)', strokeHi: 'rgba(255,255,255,0.20)',
      text: '#F4F8FF', textDim: 'rgba(244,248,255,0.62)', textFaint: 'rgba(244,248,255,0.40)',
      slipTint: 'rgba(193,193,234,0.14)',
      success: '#34d399', successBg: 'rgba(52,211,153,0.16)', successStroke: 'rgba(52,211,153,0.5)',
      danger: '#fb7185', shimmer: 'rgba(255,255,255,0.06)',
      letterbox: '#020a14',
    };
  }
  return {
    accent, accent2, gradA, gradB,
    stageA: '#e8f7ff', stageB: '#bfe6fb', stageC: '#8fd0f0',
    panel: 'rgba(255,255,255,0.66)', panelHi: 'rgba(255,255,255,0.85)',
    stroke: 'rgba(11,39,64,0.10)', strokeHi: 'rgba(11,39,64,0.20)',
    text: '#0b2740', textDim: 'rgba(11,39,64,0.66)', textFaint: 'rgba(11,39,64,0.42)',
    slipTint: 'rgba(74,77,201,0.10)',
    success: '#0f9d58', successBg: 'rgba(15,157,88,0.14)', successStroke: 'rgba(15,157,88,0.45)',
    danger: '#e5484d', shimmer: 'rgba(11,39,64,0.05)',
    letterbox: '#04121f',
  };
}
type Palette = ReturnType<typeof buildPalette>;

// ============================================================================
// KEYFRAMES (CSS fallback for motion — framer-motion is not bundled so the
// tool stays fully self-contained; spec §7.2 permits the CSS fallback)
// ============================================================================
const injectKeyframes = () => {
  if (typeof document === 'undefined' || document.getElementById('wf-keyframes')) return;
  const s = document.createElement('style');
  s.id = 'wf-keyframes';
  s.textContent = `
    @keyframes wf-bubble { 0%{transform:translateY(0) scale(1);opacity:.55} 100%{transform:translateY(-140px) scale(1.5);opacity:0} }
    @keyframes wf-swim { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-4px) rotate(2deg)} }
    @keyframes wf-wiggle { 0%,100%{transform:scaleX(1) rotate(0)} 25%{transform:scaleX(1.06) rotate(-4deg)} 75%{transform:scaleX(.94) rotate(4deg)} }
    @keyframes wf-correct { 0%{transform:scale(1)} 45%{transform:scale(1.06)} 100%{transform:scale(1)} }
    @keyframes wf-shake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-9px) rotate(-3deg)} 30%{transform:translateX(9px) rotate(3deg)} 45%{transform:translateX(-6px)} 60%{transform:translateX(6px)} 80%{transform:translateX(-3px)} }
    @keyframes wf-hook { 0%{transform:translateY(-70px);opacity:0} 60%{transform:translateY(8px);opacity:1} 100%{transform:translateY(0);opacity:1} }
    @keyframes wf-glow { 0%,100%{box-shadow:0 0 14px 3px rgba(255,114,18,.35)} 50%{box-shadow:0 0 26px 8px rgba(255,114,18,.6)} }
    @keyframes wf-ring { 0%{transform:scale(.7);opacity:.9} 100%{transform:scale(1.9);opacity:0} }
    @keyframes wf-hlpulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,114,18,.0),0 0 0 3px rgba(255,114,18,.9)} 50%{box-shadow:0 0 26px 6px rgba(255,114,18,.55),0 0 0 4px rgba(255,114,18,1)} }
    @keyframes wf-confetti { 0%{transform:translateY(0) rotate(0) scale(1);opacity:1} 100%{transform:translateY(240px) rotate(680deg) scale(.4);opacity:0} }
    @keyframes wf-pop { 0%{transform:scale(0) translateY(-14px);opacity:0} 60%{transform:scale(1.15) translateY(-3px);opacity:1} 100%{transform:scale(1);opacity:1} }
    @keyframes wf-slide { 0%{transform:translateY(-8px);opacity:0} 100%{transform:translateY(0);opacity:1} }
    @keyframes wf-rise { 0%{transform:translateY(16px) scale(.96);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
    @keyframes wf-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
    @keyframes wf-shimmer { 0%{opacity:.25} 50%{opacity:.6} 100%{opacity:.25} }
    @keyframes wf-trophy { 0%{transform:scale(0) rotate(-18deg);opacity:0} 55%{transform:scale(1.25) rotate(8deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
    @keyframes wf-fin { 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(8deg)} }
    @keyframes wf-fade { from{opacity:0} to{opacity:1} }
    .wf-tanks{ display:flex; gap:clamp(10px,2vmin,20px); flex:1 1 auto; min-height:0; position:relative; }
    @media (max-width:600px){ .wf-tanks{ flex-direction:column; } }
  `;
  document.head.appendChild(s);
};

// ============================================================================
// SMALL INLINE ICONS (no icon-library dependency)
// ============================================================================
const Ico: React.FC<{ d: string; size?: number; color?: string; sw?: number; fill?: string }> = ({ d, size = 18, color = 'currentColor', sw = 2, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IcoCheck = (p: any) => <Ico d="M20 6 9 17 4 12" {...p} />;
const IcoReset = (p: any) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke={p.color || 'currentColor'} strokeWidth={p.sw || 2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const IcoBolt = (p: any) => <Ico d="M13 2 3 14h7l-1 8 10-12h-7z" fill={p.color || 'currentColor'} sw={0} {...p} />;
const IcoSound = (p: any) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke={p.color || 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
const IcoMute = (p: any) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke={p.color || 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4z" /><path d="m23 9-6 6" /><path d="m17 9 6 6" />
  </svg>
);

// ============================================================================
// MASCOT — "Finn", an idle-bobbing fish that reacts to events
// ============================================================================
const Mascot: React.FC<{ mood: Mood; pal: Palette; reduced: boolean; size?: number }> = ({ mood, pal, reduced, size = 52 }) => {
  const bodyGrad = `url(#finn-body)`;
  const eyeY = mood === 'happy' || mood === 'celebrate' ? 25 : 27;
  const mouth =
    mood === 'happy' || mood === 'celebrate' ? 'M60,38 Q68,46 76,38' :
    mood === 'worried' ? 'M60,42 Q68,36 76,42' : 'M62,40 Q68,43 74,40';
  const anim = reduced ? 'none' : `wf-float ${mood === 'celebrate' ? 0.7 : 2.6}s ease-in-out infinite`;
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 100 72" style={{ animation: anim, overflow: 'visible' }}>
      <defs>
        <linearGradient id="finn-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={pal.accent} />
          <stop offset="100%" stopColor={pal.gradB} />
        </linearGradient>
      </defs>
      <polygon points="20,20 4,36 20,52" fill={pal.gradA} opacity="0.9" style={{ transformOrigin: '20px 36px', animation: reduced ? 'none' : 'wf-fin 1.1s ease-in-out infinite' }} />
      <ellipse cx="52" cy="36" rx="36" ry="22" fill={bodyGrad} />
      <path d="M46,16 Q60,6 70,18" stroke={pal.gradA} strokeWidth="4" fill="none" opacity="0.7" />
      <circle cx="74" cy={eyeY} r="7" fill="#fff" />
      <circle cx={mood === 'worried' ? 72 : 76} cy={eyeY} r="3.6" fill="#10233a" />
      <circle cx={mood === 'worried' ? 71 : 75} cy={eyeY - 1.4} r="1.2" fill="#fff" />
      <path d={mouth} stroke="#10233a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {(mood === 'celebrate') && <text x="6" y="14" fontSize="13">✨</text>}
    </svg>
  );
};

// ============================================================================
// MAIN
// ============================================================================
function WiseFishMatcher(rawProps: ToolProps = {}) {
  // ---- resolve config from any of the shapes the platform might pass ----
  const merged: any = { ...(rawProps || {}), ...(rawProps?.props || {}), ...(rawProps?.additionalProps || {}) };
  const themeColor: string = merged.themeColor || '#4A4DC9';
  const [darkMode, setDarkMode] = useState<boolean>(!!merged.darkMode);
  const seed: number = Number.isFinite(merged.seed) ? merged.seed : 42;
  const [showHints, setShowHints] = useState<boolean>(merged.showHints !== false);
  const [speed, setSpeed] = useState<number>(merged.animationSpeed || 1);
  const pairs: Pair[] = Array.isArray(merged.pairs) && merged.pairs.length ? merged.pairs : DEFAULT_PAIRS;

  const pal = useMemo(() => buildPalette(themeColor, darkMode), [themeColor, darkMode]);
  const reduced = useReducedMotion();

  // ---- game state ----
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [correctId, setCorrectId] = useState<string | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string }>({ kind: 'info', text: '' });
  const [mascot, setMascot] = useState<Mood>('idle');
  const [complete, setComplete] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState<boolean>(!!merged.muted);
  const [highlight, setHighlight] = useState<{ target: string; ts: number } | null>(null);
  const [confetti, setConfetti] = useState<{ x: number; y: number; c: string; id: number }[]>([]);

  const slips = useMemo(() => seededShuffle(pairs, seed), [pairs, seed]);
  const total = pairs.length;
  const done = matched.size;
  const progress = total ? (done / total) * 100 : 0;
  const stars = Math.max(1, Math.min(3, Math.round((total / Math.max(attempts, total)) * 3)));

  const mutedRef = useRef(muted); mutedRef.current = muted;
  const confId = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const acRef = useRef<AudioContext | null>(null);

  useEffect(() => { injectKeyframes(); }, []);

  // ---------------------------------------------------------------- SOUND ----
  const ensureAudio = () => {
    if (typeof window === 'undefined') return null;
    if (!acRef.current) {
      try { acRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
    }
    if (acRef.current && acRef.current.state === 'suspended') acRef.current.resume().catch(() => {});
    return acRef.current;
  };
  const playCue = useCallback((kind: 'tap' | 'correct' | 'wrong' | 'done') => {
    if (mutedRef.current) return;
    const ac = ensureAudio(); if (!ac) return;
    const now = ac.currentTime;
    // [freq, startOffset, dur, type, gain]
    const seq: [number, number, number, OscillatorType, number][] =
      kind === 'tap' ? [[520, 0, 0.09, 'sine', 0.10]]
      : kind === 'correct' ? [[659, 0, 0.12, 'sine', 0.13], [988, 0.10, 0.18, 'sine', 0.12]]
      : kind === 'wrong' ? [[196, 0, 0.20, 'triangle', 0.16], [147, 0.06, 0.22, 'triangle', 0.12]]
      : [[523, 0, 0.14, 'sine', 0.13], [659, 0.12, 0.14, 'sine', 0.13], [784, 0.24, 0.14, 'sine', 0.13], [1047, 0.36, 0.34, 'sine', 0.16]];
    for (const [f, t, d, type, g] of seq) {
      const o = ac.createOscillator(); const gain = ac.createGain();
      o.type = type; o.frequency.value = f;
      const st = now + t;
      gain.gain.setValueAtTime(0.0001, st);
      gain.gain.exponentialRampToValueAtTime(g, st + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + d);
      o.connect(gain).connect(ac.destination);
      o.start(st); o.stop(st + d + 0.03);
    }
  }, []);

  // ------------------------------------------------------------- CONFETTI ----
  const burst = useCallback((fx: number, fy: number) => {
    if (reduced) return;
    const cols = [pal.accent, pal.accent2, pal.gradA, pal.gradB, pal.success, '#fbbf24', '#ec4899'];
    const add = Array.from({ length: 26 }, () => ({
      x: fx + (Math.random() - 0.5) * 160,
      y: fy - Math.random() * 40,
      c: cols[Math.floor(Math.random() * cols.length)],
      id: ++confId.current,
    }));
    setConfetti(p => [...p, ...add]);
    window.setTimeout(() => setConfetti(p => p.filter(c => !add.find(a => a.id === c.id))), 2600);
  }, [pal, reduced]);

  // root-relative coords from a click (layout is 1:1, no transform scale)
  const toFrame = (clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return { x: clientX, y: clientY };
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  // -------------------------------------------------------------- EVENTS -----
  const evt = useCallback((name: string, detail: any = {}) => emit({ type: 'event', name, detail }), []);

  // ------------------------------------------------------ CORE ACTIONS -------
  const doSelect = useCallback((id: string, fx?: number, fy?: number) => {
    if (matched.has(id)) return;
    setSelected(prev => (prev === id ? prev : id));
    setHintId(null);
    setMascot('idle');
    setBanner({ kind: 'info', text: `${labelOf(pairs, id)} is on the hook — now tap its description.` });
    playCue('tap');
    evt('method_selected', { methodId: id });
  }, [matched, pairs, playCue, evt]);

  const finish = useCallback((nextMatched: Set<string>, atts: number) => {
    setComplete(true);
    setMascot('celebrate');
    playCue('done');
    const acc = Math.round((total / Math.max(atts, 1)) * 100);
    evt('completed', { total, attempts: atts, correct: total, accuracy: acc });
  }, [total, playCue, evt]);

  const doMatch = useCallback((methodId: string, descId: string, clientX?: number, clientY?: number) => {
    if (!methodId || !descId) return;
    if (matched.has(methodId) || matched.has(descId)) return; // idempotent-safe
    if (!pairs.some(p => p.id === methodId) || !pairs.some(p => p.id === descId)) return;

    const ok = methodId === descId;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setSelected(methodId);
    evt('answer_checked', { methodId, descriptionId: descId, correct: ok });

    if (ok) {
      const next = new Set(matched); next.add(methodId);
      setMatched(next);
      setCorrectId(methodId);
      setStreak(s => s + 1);
      setSelected(null);
      setHintId(null);
      setMascot('happy');
      setBanner({ kind: 'ok', text: `Right! ${labelOf(pairs, methodId)} — ${descOf(pairs, methodId)}` });
      playCue('correct');
      if (clientX != null && clientY != null) { const f = toFrame(clientX, clientY); burst(f.x, f.y); }
      else { const el = stageRef.current; const r = el?.getBoundingClientRect(); burst((r?.width || 640) / 2, (r?.height || 360) / 2); }
      window.setTimeout(() => setCorrectId(null), 1100);
      evt('answer_correct', { methodId });
      evt('item_placed', { itemId: methodId, matched: next.size, total });
      if (next.size === total) window.setTimeout(() => finish(next, nextAttempts), 620);
    } else {
      setWrongId(methodId);
      setStreak(0);
      setMascot('worried');
      const hp = pairs.find(p => p.id === methodId);
      setBanner({ kind: 'bad', text: showHints && hp ? `Not a match. Hint: ${hp.hint}` : 'Not a match — try another slip.' });
      playCue('wrong');
      evt('answer_incorrect', { methodId, descriptionId: descId });
      window.setTimeout(() => {
        setWrongId(null);
        setSelected(null);
        setMascot('idle');
        if (showHints && hp) { setHintId(methodId); window.setTimeout(() => setHintId(null), 3200); }
      }, 780);
    }
  }, [matched, pairs, attempts, showHints, playCue, burst, evt, finish, total]);

  const doHighlight = useCallback((target: string) => {
    if (!target) return;
    setHighlight({ target: String(target), ts: Date.now() });
    window.setTimeout(() => setHighlight(h => (h && h.target === String(target) ? null : h)), 2600);
  }, []);

  const doReset = useCallback(() => {
    setSelected(null); setMatched(new Set()); setAttempts(0); setStreak(0);
    setWrongId(null); setCorrectId(null); setHintId(null); setComplete(false);
    setMascot('idle'); setConfetti([]); setHighlight(null);
    setBanner({ kind: 'info', text: '' });
    evt('reset', {});
  }, [evt]);

  // ---------------------------------------------------- STUDENT CLICKS -------
  const onFish = (id: string, e: React.MouseEvent) => { if (paused) return; doSelect(id, e.clientX, e.clientY); };
  const onSlip = (id: string, e: React.MouseEvent) => {
    if (paused) return;
    if (!selected) { setBanner({ kind: 'info', text: 'Tap a fish (a method) first, then its description.' }); doHighlight('tank_methods'); return; }
    doMatch(selected, id, e.clientX, e.clientY);
  };

  // ---------------------------------------------------------- AGENT API ------
  const api = useMemo(() => ({
    setParam: (name: string, value: any) => {
      switch (name) {
        case 'muted': setMuted(!!value); break;
        case 'darkMode': setDarkMode(!!value); break;
        case 'showHints': setShowHints(value !== false); break;
        case 'animationSpeed': case 'speed': setSpeed(Number(value) || 1); break;
        default: break;
      }
    },
    play: () => setPaused(false),
    pause: () => setPaused(true),
    reset: () => doReset(),
    highlight: (target: string) => doHighlight(target),
    getState: () => emit({ type: 'state', state: {
      selected, matched: [...matched], attempts, streak, total, complete,
      remaining: pairs.filter(p => !matched.has(p.id)).map(p => p.id),
    } }),
    // tool-specific
    select: (methodId: string) => doSelect(methodId),
    match: (methodId: string, descriptionId: string) => doMatch(methodId, descriptionId),
  }), [selected, matched, attempts, streak, total, complete, pairs, doReset, doHighlight, doSelect, doMatch]);

  const apiRef = useRef(api); apiRef.current = api;

  // ------------------------------------------ COMMAND LISTENER + READY -------
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== 'command') return;
      try {
        const fn = (apiRef.current as any)[d.method];
        let result;
        if (typeof fn === 'function') result = fn(...(Array.isArray(d.args) ? d.args : []));
        if (d.id != null) emit({ type: 'response', id: d.id, result });
      } catch { /* never throw out of the handler */ }
    };
    window.addEventListener('message', onMsg);
    emit({ type: 'ready', toolId: TOOL_ID });   // ⭐ REQUIRED
    evt('ready', { toolId: TOOL_ID, total });
    return () => window.removeEventListener('message', onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the platform's optional step callback fed (harmless if absent)
  useEffect(() => { rawProps?.setStepDetails?.({ currentStep: done, totalSteps: total, isComplete: complete }); }, [done, total, complete]); // eslint-disable-line

  const hlActive = (t: string) => !!highlight && highlight.target === t;
  const dur = (base: number) => `${base / Math.max(speed, 0.25)}s`;

  // responsive sizes — scale with the smaller viewport side; the layout fills the container
  const rs = {
    pad: 'clamp(10px, 2.2vmin, 26px)', gap: 'clamp(8px, 1.6vmin, 16px)',
    title: 'clamp(18px, 3.4vmin, 26px)', sub: 'clamp(10px, 1.7vmin, 13px)',
    cap: 'clamp(9px, 1.35vmin, 11px)', num: 'clamp(16px, 3vmin, 22px)',
    hint: 'clamp(11px, 2vmin, 14px)', method: 'clamp(12.5px, 2.1vmin, 15px)',
    desc: 'clamp(11.5px, 1.9vmin, 13.5px)', emoji: 'clamp(18px, 3.4vmin, 24px)',
    rowY: 'clamp(7px, 1.3vmin, 11px)', rowX: 'clamp(10px, 1.6vmin, 14px)',
  };

  // ============================================================ RENDER =======
  return (
    <div
      ref={stageRef}
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        background: `linear-gradient(160deg, ${pal.stageA} 0%, ${pal.stageB} 46%, ${pal.stageC} 100%)`,
        color: pal.text, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
        {/* ambient water */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', opacity: paused ? 0.5 : 1 }}>
          {[12, 26, 42, 58, 72, 86].map((y, i) => (
            <div key={i} style={{
              position: 'absolute', top: `${y}%`, left: '-10%', width: '120%', height: 1.5, borderRadius: 99,
              background: pal.shimmer, animation: reduced || paused ? 'none' : `wf-shimmer ${2.4 + i * 0.5}s ${i * 0.3}s infinite`,
            }} />
          ))}
          {[6, 16, 30, 44, 60, 72, 84, 94].map((x, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${x}%`, bottom: 0, width: 7 + (i % 3) * 5, height: 7 + (i % 3) * 5,
              borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
              animation: reduced || paused ? 'none' : `wf-bubble ${3 + (i % 4)}s ${i * 0.7}s infinite ease-in`,
            }} />
          ))}
        </div>

      {/* content column — fills the container, centers on ultra-wide screens */}
      <div style={{ position: 'relative', zIndex: 5, height: '100%', width: '100%', maxWidth: 1600, margin: '0 auto', display: 'flex', flexDirection: 'column', padding: rs.pad, gap: rs.gap, boxSizing: 'border-box' }}>

        {/* ── HUD ── */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' }}><Mascot mood={mascot} pal={pal} reduced={reduced} size={54} /></div>
            <div>
              <div style={{ fontWeight: 900, fontSize: rs.title, letterSpacing: '-0.02em', lineHeight: 1 }}>Wise Fish</div>
              <div style={{ color: pal.textDim, fontSize: rs.sub, fontWeight: 600, marginTop: 3 }}>Match the separation method</div>
            </div>
          </div>

          {/* progress + stars + streak */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.4vmin, 16px)', flexWrap: 'wrap' }}>
            <div data-hl="progress" style={{ ...glass(pal), padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, animation: hlActive('progress') ? 'wf-hlpulse 1s infinite' : undefined }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: rs.cap, fontWeight: 700, letterSpacing: 1, color: pal.textFaint, textTransform: 'uppercase' }}>Pairs</div>
                <div style={{ fontSize: rs.num, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{done}<span style={{ color: pal.textFaint, fontSize: '0.7em' }}>/{total}</span></div>
              </div>
              <div style={{ width: 120, height: 9, borderRadius: 99, background: pal.panelHi, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, borderRadius: 99, background: `linear-gradient(90deg, ${pal.gradA}, ${pal.gradB})`, transition: `width ${dur(0.5)} cubic-bezier(.4,0,.2,1)`, boxShadow: `0 0 10px ${pal.gradB}` }} />
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {[0, 1, 2].map(i => <span key={i} style={{ fontSize: 16, filter: i < stars ? 'none' : 'grayscale(1) opacity(0.35)' }}>⭐</span>)}
              </div>
            </div>

            <div style={{ ...glass(pal), padding: '6px 12px', textAlign: 'center', minWidth: 58 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: pal.textFaint, textTransform: 'uppercase' }}>Streak</div>
              <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>🔥{streak}</div>
            </div>

            <button data-hl="mute" onClick={() => { ensureAudio(); setMuted(m => !m); }} title={muted ? 'Unmute' : 'Mute'}
              style={{ ...iconBtn(pal), animation: hlActive('mute') ? 'wf-hlpulse 1s infinite' : undefined }}>
              {muted ? <IcoMute size={18} color={pal.text} /> : <IcoSound size={18} color={pal.text} />}
            </button>
            <button onClick={() => setDarkMode(d => !d)} title="Toggle light / dark" style={iconBtn(pal)}>
              <span style={{ fontSize: 16 }}>{darkMode ? '🌙' : '☀️'}</span>
            </button>
            <button data-hl="reset" onClick={doReset} title="Reset"
              style={{ ...pillBtn(pal), animation: hlActive('reset') ? 'wf-hlpulse 1s infinite' : undefined }}>
              <IcoReset size={15} color={pal.text} /> Reset
            </button>
          </div>
        </div>

        {/* ── HINT / FEEDBACK LINE ── */}
        <div style={{
          flexShrink: 0, minHeight: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          borderRadius: 14, padding: '8px 16px', textAlign: 'center',
          background: banner.kind === 'ok' ? pal.successBg : banner.kind === 'bad' ? 'rgba(229,72,77,0.16)' : pal.panel,
          border: `1px solid ${banner.kind === 'ok' ? pal.successStroke : banner.kind === 'bad' ? 'rgba(229,72,77,0.4)' : pal.stroke}`,
          backdropFilter: 'blur(8px)', transition: 'background .25s, border-color .25s',
        }}>
          {banner.text ? (
            <span style={{ fontSize: rs.hint, fontWeight: 600, color: banner.kind === 'ok' ? pal.success : banner.kind === 'bad' ? pal.danger : pal.text }}>
              {banner.kind === 'ok' ? '✓ ' : banner.kind === 'bad' ? '✕ ' : ''}{banner.text}
            </span>
          ) : (
            <span style={{ fontSize: rs.hint, fontWeight: 600, color: pal.textDim }}>
              🐟 Tap a <b style={{ color: pal.accent2 }}>fish</b> (a method), then tap its matching <b style={{ color: pal.accent }}>description</b> slip.
            </span>
          )}
        </div>

        {/* ── TWO TANKS ── (fill remaining height; stack vertically on very narrow screens) */}
        <div className="wf-tanks">
          {selected && !reduced && (
            <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', fontSize: rs.emoji, zIndex: 8, pointerEvents: 'none', animation: 'wf-hook .5s ease-out', filter: `drop-shadow(0 6px 10px ${pal.gradB})` }}>🪝</div>
          )}
          {/* TANK 1 — methods */}
          <Tank pal={pal} label="Methods" sub="Tap to hook a fish" emoji="🐠" hl={hlActive('tank_methods')}>
            {pairs.map((p, i) => {
              const isMatched = matched.has(p.id);
              const isSel = selected === p.id;
              const isWrong = wrongId === p.id;
              const isCorrect = correctId === p.id;
              const hot = hlActive(p.id);
              return (
                <div key={p.id} style={{ position: 'relative' }}>
                  <div
                    data-hl={p.id}
                    onClick={(e) => onFish(p.id, e)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: `${rs.rowY} ${rs.rowX}`, borderRadius: 16,
                      cursor: isMatched ? 'default' : 'pointer', userSelect: 'none',
                      transition: 'transform .2s cubic-bezier(.34,1.56,.64,1), background .2s, border-color .2s',
                      background: isMatched ? pal.successBg : isSel ? 'rgba(255,114,18,0.16)' : pal.panel,
                      border: `1.5px solid ${isMatched ? pal.successStroke : isSel ? pal.accent2 : pal.stroke}`,
                      boxShadow: isSel ? `0 8px 22px -8px ${pal.accent2}` : '0 4px 12px -6px rgba(0,0,0,0.35)',
                      transform: isSel ? 'scale(1.02)' : 'scale(1)',
                      opacity: isMatched ? 0.7 : 1,
                      animation: !reduced ? (isWrong ? `wf-shake .7s ease` : isCorrect ? `wf-correct .8s ease` : isSel ? `wf-glow ${dur(2)} infinite` : hot ? 'wf-hlpulse 1s infinite' : `wf-rise .45s ease ${Math.min(i * 0.03, 0.3)}s both`) : undefined,
                    }}
                  >
                    <span style={{ fontSize: rs.emoji, animation: reduced ? 'none' : isMatched ? 'none' : isSel ? 'wf-wiggle .5s infinite' : `wf-swim ${3 + (i % 3)}s infinite` }}>
                      {isMatched ? '✅' : p.emoji}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: rs.method, lineHeight: 1.15, color: isMatched ? pal.success : pal.text }}>{p.method}</div>
                      {isMatched && <div style={{ fontSize: 11, fontWeight: 600, color: pal.success, opacity: 0.8 }}>Matched!</div>}
                    </div>
                    {isSel && <span style={badge(`linear-gradient(135deg, ${pal.gradA}, ${pal.gradB})`, '#fff')}>HOOKED</span>}
                    {isMatched && <span style={badge(pal.successBg, pal.success, pal.successStroke)}>✓ DONE</span>}
                  </div>
                  {hintId === p.id && (
                    <div style={{ marginTop: 5, padding: '7px 12px', borderRadius: 12, fontSize: 12, color: pal.text, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,114,18,0.14)', border: '1px solid rgba(255,114,18,0.32)', animation: 'wf-slide .3s ease' }}>
                      <IcoBolt size={13} color={pal.accent2} /> {p.hint}
                    </div>
                  )}
                </div>
              );
            })}
          </Tank>

          {/* TANK 2 — descriptions */}
          <Tank pal={pal} label="Descriptions" sub={selected ? '← Tap the slip that fits' : 'Hook a fish first'} emoji="📋" hl={hlActive('tank_descriptions')}>
            {slips.map((p, i) => {
              const isMatched = matched.has(p.id);
              const isCorrect = correctId === p.id;
              const focus = !!selected && !isMatched;
              const hot = hlActive('desc:' + p.id);
              return (
                <div
                  key={p.id}
                  data-hl={'desc:' + p.id}
                  onClick={(e) => onSlip(p.id, e)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: `${rs.rowY} ${rs.rowX}`, borderRadius: 16,
                    cursor: isMatched ? 'default' : focus ? 'pointer' : 'default', userSelect: 'none',
                    transition: 'transform .2s cubic-bezier(.34,1.56,.64,1), background .2s, border-color .2s',
                    background: isMatched ? pal.successBg : focus ? pal.slipTint : pal.panel,
                    border: `1.5px solid ${isMatched ? pal.successStroke : focus ? pal.accent : pal.stroke}`,
                    boxShadow: focus && !isMatched ? `0 8px 22px -10px ${pal.accent}` : '0 4px 12px -6px rgba(0,0,0,0.3)',
                    transform: focus && !isMatched ? 'scale(1.01)' : 'scale(1)',
                    opacity: isMatched ? 0.7 : 1,
                    animation: !reduced ? (isCorrect ? 'wf-correct .8s ease' : hot ? 'wf-hlpulse 1s infinite' : `wf-rise .45s ease ${Math.min(i * 0.03, 0.3)}s both`) : undefined,
                  }}
                >
                  <div style={{ width: 4, alignSelf: 'stretch', minHeight: 30, borderRadius: 99, flexShrink: 0, background: isMatched ? pal.success : focus ? `linear-gradient(${pal.gradA}, ${pal.gradB})` : pal.strokeHi }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: rs.desc, fontWeight: 600, lineHeight: 1.4, color: isMatched ? pal.success : focus ? pal.text : pal.textDim }}>{p.description}</div>
                    {isMatched && <div style={{ marginTop: 3, fontSize: 11, fontWeight: 700, color: pal.success, opacity: 0.85 }}>✓ {p.method}</div>}
                  </div>
                  <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                    {isMatched ? (
                      <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', background: pal.successBg, border: `2px solid ${pal.successStroke}` }}><IcoCheck size={13} color={pal.success} /></span>
                    ) : focus ? (
                      <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', background: pal.slipTint, border: `2px solid ${pal.accent}`, animation: reduced ? 'none' : 'wf-shimmer 1.5s infinite' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: pal.accent }} />
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </Tank>
        </div>

        {/* ── CAUGHT STRIP ── */}
        <div style={{ flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', ...glass(pal), padding: '4px 14px' }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: pal.textFaint, whiteSpace: 'nowrap' }}>Caught</span>
          {done === 0 && <span style={{ fontSize: 12, color: pal.textFaint }}>Your matched pairs will collect here.</span>}
          {pairs.filter(p => matched.has(p.id)).map(p => (
            <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20, whiteSpace: 'nowrap', background: pal.successBg, border: `1px solid ${pal.successStroke}`, animation: reduced ? 'none' : 'wf-pop .4s ease' }}>
              <span style={{ fontSize: 13 }}>{p.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pal.success }}>{p.method}</span>
            </span>
          ))}
        </div>

      </div>{/* /content column */}

        {/* confetti */}
        {confetti.map((c, i) => (
          <div key={c.id} style={{ position: 'absolute', left: c.x, top: c.y, width: 10, height: 10, background: c.c, borderRadius: i % 2 ? '50%' : 2, zIndex: 30, pointerEvents: 'none', animation: `wf-confetti ${1.4 + Math.random()}s ease-in forwards`, transform: `rotate(${Math.random() * 360}deg)` }} />
        ))}

        {/* completion overlay */}
        {complete && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(3,14,28,0.66)', backdropFilter: 'blur(10px)', animation: 'wf-fade .3s ease' }}>
            <div style={{ width: 'min(560px, 92%)', borderRadius: 28, padding: '38px 40px', textAlign: 'center', background: `linear-gradient(150deg, ${pal.gradA}, ${pal.accent})`, border: '1px solid rgba(252,145,69,0.4)', boxShadow: '0 40px 90px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize: 66, marginBottom: 10, animation: reduced ? 'none' : 'wf-trophy .8s ease' }}>🏆</div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 30, marginBottom: 6 }}>Every fish caught!</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, marginBottom: 22, lineHeight: 1.55 }}>
                You paired all <b style={{ color: pal.gradB }}>{total} methods</b> of separation in <b style={{ color: '#fff' }}>{attempts}</b> tries.
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Matched', value: total, icon: '✅' },
                  { label: 'Tries', value: attempts, icon: '🎣' },
                  { label: 'Accuracy', value: `${Math.round((total / Math.max(attempts, 1)) * 100)}%`, icon: '🎯' },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: 16, padding: '12px 8px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                    <div style={{ fontSize: 22 }}>{s.icon}</div>
                    <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>{s.value}</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={doReset} style={{ width: '100%', border: 'none', borderRadius: 16, padding: '15px', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', background: `linear-gradient(135deg, ${pal.accent2}, ${pal.gradB})`, boxShadow: '0 12px 30px -8px rgba(252,145,69,0.7)' }}>
                Play again
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================
function labelOf(pairs: Pair[], id: string) { return pairs.find(p => p.id === id)?.method || id; }
function descOf(pairs: Pair[], id: string) { return pairs.find(p => p.id === id)?.description || ''; }

function glass(pal: Palette): React.CSSProperties {
  return { background: pal.panel, border: `1px solid ${pal.stroke}`, borderRadius: 14, backdropFilter: 'blur(8px)' };
}
function iconBtn(pal: Palette): React.CSSProperties {
  return { width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', cursor: 'pointer', background: pal.panel, border: `1px solid ${pal.stroke}`, color: pal.text, backdropFilter: 'blur(8px)' };
}
function pillBtn(pal: Palette): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: pal.panel, border: `1px solid ${pal.stroke}`, color: pal.text, backdropFilter: 'blur(8px)', fontFamily: 'inherit' };
}
function badge(bg: string, color: string, stroke?: string): React.CSSProperties {
  return { padding: '3px 9px', borderRadius: 9, fontSize: 10, fontWeight: 800, color, background: bg, border: stroke ? `1px solid ${stroke}` : 'none', whiteSpace: 'nowrap' };
}

const Tank: React.FC<{ pal: Palette; label: string; sub: string; emoji: string; hl: boolean; children: React.ReactNode }> = ({ pal, label, sub, emoji, hl, children }) => (
  <div style={{
    flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 20, padding: 'clamp(8px, 1.5vmin, 14px)',
    background: pal.panel, border: `1.5px solid ${hl ? pal.accent2 : pal.stroke}`, backdropFilter: 'blur(6px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 18px 40px -24px rgba(0,0,0,0.6)',
    animation: hl ? 'wf-hlpulse 1s infinite' : undefined,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexShrink: 0 }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', fontSize: 15, background: `linear-gradient(135deg, ${pal.gradA}, ${pal.gradB})` }}>{emoji}</span>
      <div>
        <div style={{ fontWeight: 800, fontSize: 'clamp(12px, 2vmin, 14px)', color: pal.text }}>{label}</div>
        <div style={{ fontSize: 'clamp(9px, 1.5vmin, 11px)', color: pal.textFaint }}>{sub}</div>
      </div>
    </div>
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4, scrollbarWidth: 'thin' }}>
      {children}
    </div>
  </div>
);

// ============================================================================
// HOOKS
// ============================================================================
function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setR(m.matches); on();
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return r;
}

export default WiseFishMatcher;