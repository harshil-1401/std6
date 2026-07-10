/**
 * Tool: M2.S7.T10.C39.2D1 — "Sedimentation and Decantation — Settle and pour off"
 * CBSE Grade 6 Science · Methods of Separation in Everyday Life (Ch 9, Fig 9.9)
 * concept: M2.S7.T10.C39 · beat: Apply · subtype: simulation / guided experiment
 *
 * CONCEPT (PRESERVED from the original tool):
 *   1. SEDIMENTATION — leave the tea + leaves undisturbed so the heavier insoluble
 *      leaves slowly sink and gather at the bottom (two layers form).
 *   2. DECANTATION — gently tilt and pour off the clear upper tea into a cup,
 *      leaving the settled leaves behind. Pour gently → clear tea. Pour roughly →
 *      the sediment lifts and cloudy tea pours (wrong).
 *   Answer key preserved: settle BEFORE pour; pour in gentle steps; decantation is
 *   imperfect (filtration gives a fully clear cup).
 *
 * HARD ENV: iframe loads ONLY React + ReactDOM + Tailwind + Poppins from a CDN.
 *   framer-motion is NOT available — all motion is CSS transitions / @keyframes / RAF.
 *   React hooks come from the global React. No other imports. No network calls.
 *
 * §3 AGENT-CONTRACT: emit {type:'ready',toolId} on mount; handle {type:'command',id,method,args};
 *   window.__TOOL__ = api with setParam/play/pause/reset/highlight/getState/setOperatorMode +
 *   the tool-specific "do" verbs settle() / decant() / step() / reset(); every verb produces the
 *   same visible result as the student and emits {type:'event',name,detail}. The "do" verb (step)
 *   accepts a single id OR an array so the agent can advance several pour-steps at once.
 * §6.1 OPERATOR MODE: operatorMode 'ai' | 'student' (default 'student'), switched by a clickable
 *   styled segmented toggle (👩‍🏫 Teacher | 🙋 Your turn), setOperatorMode(), setParam(), OR the host.
 *   In 'ai' the student controls/action bar are hidden and inputs inert (agent drives) — but the
 *   phenomenon (settling pan + pouring stream + cup) AND the read-out (settle %, clarity, step
 *   tracker) stay visible. A "👩‍🏫 watch" caption shows. Emits operator_mode_changed (with depth).
 * §6.2 CONTENT DEPTH: Teacher = LEAN (2 pour steps, one crisp demo), Student = FULL (4 pour steps,
 *   all four learn cards + quiz + daily-life). One component, two depths, re-derived live on switch;
 *   depth ('lean'|'full') + stepCount reflected in getState() and the mode-change event.
 * §7.3 SOUND: Web Audio synth cues (tap/correct/wrong/done/pour), gated behind first gesture,
 *   never autoplaying; setParam('muted',…) + a visible 🔊/🔇 mute toggle.
 * §7.4 CELEBRATION: full-viewport position:fixed;inset:0 confetti+stars overlay (pointer-events:none).
 * §8.1 LAYOUT: orientation-aware — portrait stacks, landscape splits scene | controls two-pane;
 *   box-sizing:border-box everywhere; height-capped in svh so it fits 844×390 / 1366×768 / 1920×1080
 *   with NO page scroll. props.device 'mobile' | 'smartboard' sizes touch targets; showModeToggle gate.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // prod iframe maps this to the renderer global; dev preview resolves the module

/* useId polyfill (React 18 provides it; React 17 host falls back to a stable per-mount id) */
let __uidSeq = 0;
const useId = typeof React.useId === 'function' ? React.useId : function () { const r = useRef(null); if (r.current == null) r.current = 'uid' + (++__uidSeq); return r.current; };

const TOOL_ID = 'M2.S7.T10.C39.2D1';

/* ───────── Brand tokens (Singularity — preserved from original) ───────── */
const THEME = {
  font: "'Poppins','Segoe UI',system-ui,-apple-system,sans-serif",
  primary: '#4A4DC9', accent: '#FF7212', deep: '#533086', warm: '#FC9145',
  gradient: 'linear-gradient(135deg,#533086,#FC9145)',
  lavender: '#C1C1EA', cream: '#FFF3E4',
  ink: '#1E1E2E', sub: '#6B6B80', border: '#E8E8F0', bg: '#F5F5F5', surface: '#FFFFFF',
  green: '#10B981', greenText: '#0E8A63', greenSoft: '#E3F7EF',
  amber: '#E08A1E', amberText: '#8A5310', amberSoft: '#FBEFD9',
  error: '#EF4444',
  pill: 999, touch: 44,
  // experiment palette
  tea: '#B5772E',        // clear, properly decanted tea
  cloudy: '#6E4A22',     // cloudy, leaf-filled tea
  leaf: '#3E2A18',       // tea leaves
};

/* dark-mode overrides (props.darkMode) */
function palette(dark: boolean) {
  if (!dark) return { ...THEME };
  return { ...THEME,
    ink: '#F2F2FA', sub: '#A9A9C2', border: '#3A3A52', bg: '#15151F', surface: '#1E1E2C',
    cream: '#2A2336', greenSoft: '#19342A', amberSoft: '#332A18', lavender: '#3A3658' };
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t);
const hexLerp = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp(t)));
  return '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
};

/* ───────── geometry: pan + cup share one SVG coordinate space ───────── */
const PAN = {
  topY: 70, botY: 156, leftX: 40, rightX: 196,
  pivot: [56, 156] as [number, number],   // tilt pivots at bottom-left
  spout: [196, 74] as [number, number],   // tea pours from the top-right rim
};
/* The pan is drawn HIGHER than the cup so it pours down into it, and lifts further as it tilts so
   its LOWEST point always stays above the cup rim (verified: ~13px gap at every tilt 0..55, and the
   pan top stays in frame). Derived for PAN_SCALE about the pivot + cup rim at y=150. */
const PAN_SCALE = 0.72;
/* move the pan RIGHT so its spout sits over the cup (no long horizontal gap / diagonal stream) */
const PAN_SHIFT_X = 105;
const panShiftY = (tilt: number) => -23.3 - 96.4 * Math.sin(tilt * Math.PI / 180);
const rot = (p: [number, number], c: [number, number], deg: number): [number, number] => {
  const r = (deg * Math.PI) / 180, dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(r) - dy * Math.sin(r), c[1] + dx * Math.sin(r) + dy * Math.cos(r)];
};
const INTERIOR_PTS: [number, number][] = [
  [42, 72], [194, 72], [194, 136], [188, 150], [158, 158], [118, 160], [78, 158], [48, 150], [42, 136],
];

/* ── LIQUID PHYSICS: "water finds its level" ───────────────────────────────────
   A real liquid keeps a HORIZONTAL surface no matter how the container tilts; the
   surface height is whatever makes the submerged area equal the liquid's volume.
   We solve that exactly for the tilted pan interior so the tea pools to the low
   (spout) side and leaves an air gap on the high side — instead of filling the
   whole tipped pan like a rigid block. Pure geometry, evaluated per-frame. */
const polyArea = (p: [number, number][]) => {
  let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2;
};
// keep the sub-polygon at or BELOW a horizontal line (screen y ≥ Y), via Sutherland–Hodgman
const clipBelowLine = (p: [number, number][], Y: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < p.length; i++) {
    const A = p[i], B = p[(i + 1) % p.length], inA = A[1] >= Y, inB = B[1] >= Y;
    if (inA) out.push(A);
    if (inA !== inB) { const t = (Y - A[1]) / (B[1] - A[1]); out.push([A[0] + (B[0] - A[0]) * t, Y]); }
  }
  return out;
};
const areaBelowLine = (p: [number, number][], Y: number) => { const c = clipBelowLine(p, Y); return c.length < 3 ? 0 : polyArea(c); };
// binary-search the horizontal surface Y whose submerged area == vol · (full area)
const waterLevelY = (poly: [number, number][], vol: number) => {
  const ys = poly.map(q => q[1]); let lo = Math.min(...ys), hi = Math.max(...ys);
  const target = clamp(vol) * polyArea(poly);
  for (let k = 0; k < 36; k++) { const mid = (lo + hi) / 2; if (areaBelowLine(poly, mid) > target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
};
const rotatedInterior = (tilt: number) => INTERIOR_PTS.map(p => rot(p, PAN.pivot, tilt)) as [number, number][];

/* ───────── POUR STEPS (the decant "do" sequence — preserved answer key) ─────────
   The student decants by advancing gentle pour steps. Each step tilts a little more
   and moves clear tea into the cup. Pouring gently (step by step) keeps the leaves
   settled → clear tea. The agent can call step("s1") OR step(["s1","s2","s3"]).
   §6.2 DEPTH: Student (full) pours in 4 gentle steps; Teacher (lean) demos it in 2. */
interface PourStep { id: string; label: string; tilt: number; transfer: number; }
/* tilt tops out at ~50° — a careful decant tips toward the cup without going near upside-down */
const POUR_STEPS_FULL: PourStep[] = [
  { id: 's1', label: 'Tilt gently',  tilt: 22, transfer: 0.18 },
  { id: 's2', label: 'Pour steady',  tilt: 34, transfer: 0.40 },
  { id: 's3', label: 'Keep pouring', tilt: 43, transfer: 0.66 },
  { id: 's4', label: 'Almost there', tilt: 50, transfer: 0.90 },
];
const POUR_STEPS_LEAN: PourStep[] = [
  { id: 's1', label: 'Tilt gently',  tilt: 28, transfer: 0.45 },
  { id: 's4', label: 'Pour it off',  tilt: 50, transfer: 0.90 },
];
/* every id any verb will ever accept (superset of both depths) — for validIds + idempotency */
const ALL_STEP_IDS = ['s1', 's2', 's3', 's4'] as const;
const stepsForDepth = (lean: boolean): PourStep[] => (lean ? POUR_STEPS_LEAN : POUR_STEPS_FULL);

/* ───────── learn cards (preserved) ───────── */
const LEARN_CARDS = [
  { tag: 'The problem', title: 'Tea + leaves = a mixture', body: 'The tea is a liquid and the leaves are an insoluble solid floating in it. We want only the clear tea, so the leaves must be separated out.', visual: 'suspend' as const },
  { tag: 'Step 1', title: 'Sedimentation', body: 'Leave the mixture undisturbed. The heavier leaves slowly sink and gather at the bottom. This settling of the heavier insoluble solid is called sedimentation.', visual: 'settled' as const },
  { tag: 'Step 2', title: 'Decantation', body: 'Two layers have formed — clear tea on top, sediment below. Gently tilt and pour off the clear upper liquid, leaving the leaves behind. This is decantation.', visual: 'pour' as const },
  { tag: 'Good to know', title: 'Not a perfect separation', body: 'A few leaves may still slip out while pouring. For a perfectly clear cup we pass the tea through a strainer — that is filtration.', visual: 'filter' as const },
];

/* ───────── quiz (answer key PRESERVED verbatim) ───────── */
const QUIZ = [
  { q: 'A mixture is left undisturbed and the heavier insoluble particles settle at the bottom. This process is called…', options: ['Evaporation', 'Sedimentation', 'Winnowing', 'Condensation'], a: 1, why: 'Sedimentation is the settling of the heavier insoluble solid to the bottom of a liquid.' },
  { q: 'After the leaves settle, gently pouring off the clear tea (leaving the sediment behind) is called…', options: ['Decantation', 'Threshing', 'Filtration', 'Churning'], a: 0, why: 'Removing the clear upper liquid by tilting the vessel is decantation.' },
  { q: 'Why must you pour slowly during decantation?', options: ['To cool the tea faster', 'So the settled leaves are not disturbed', 'To pour a larger amount', 'To dissolve the leaves'], a: 1, why: 'A fast pour stirs the settled sediment back up, making the poured liquid cloudy.' },
  { q: 'Decantation removes every single tea leaf from the tea.', options: ['True', 'False — a few may remain, so we use a strainer (filtration)'], a: 1, why: 'Decantation is not perfect; filtration gives a fully clear liquid.' },
];

/* ───────── real-world examples (preserved) ───────── */
const REAL_WORLD = [
  { emoji: '🍚', title: 'Washing rice & pulses', body: 'Swirl rice in water, let the grit and starch settle for a moment, then pour off the cloudy water. That pour-off is decantation.' },
  { emoji: '🪣', title: 'Muddy pond water', body: 'Collect muddy water in a pot and leave it overnight. The mud sediments to the bottom; gently pour the clear water on top into another pot.' },
  { emoji: '🏭', title: 'Water-treatment plants', body: 'Huge settling tanks let suspended dirt sediment out of river water before it is cleaned further — sedimentation on a giant scale.' },
  { emoji: '🍲', title: 'Settling in the kitchen', body: 'Let a stock or boiled liquid stand so heavier bits sink, then decant the clear liquid for a cleaner dish.' },
];

/* ───────── prefers-reduced-motion ───────── */
function usePrefersReducedMotion(): boolean {
  const [rm, setRm] = useState(false);
  useEffect(() => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); const on = () => setRm(m.matches); on(); m.addEventListener?.('change', on); return () => m.removeEventListener?.('change', on); }, []);
  return rm;
}

/* ───────── §7.3 Web Audio cues — lazy, mutable, no assets ─────────
   AudioContext created on first use (after a gesture) so nothing auto-plays.
   Cue kinds: tap | correct | wrong | done | pour. */
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
  // a gentle filtered-noise "pour" whoosh
  const pour = (ac: any, t0: number) => {
    try {
      const dur = 0.5; const sr = ac.sampleRate; const buf = ac.createBuffer(1, Math.floor(sr * dur), sr);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
      const src = ac.createBufferSource(); src.buffer = buf;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(900, t0); bp.Q.value = 0.8;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start(t0); src.stop(t0 + dur);
    } catch (e) {}
  };
  const playCue = useCallback((kind: 'tap' | 'correct' | 'wrong' | 'done' | 'pour') => {
    const ac = ctx(); if (!ac) return; const n = ac.currentTime;
    if (kind === 'tap') tone(ac, 420, n, 0.09, 'triangle', 0.16);
    else if (kind === 'correct') { tone(ac, 660, n, 0.12, 'sine', 0.2); tone(ac, 880, n + 0.09, 0.16, 'sine', 0.2); }
    else if (kind === 'wrong') tone(ac, 200, n, 0.18, 'sine', 0.18);
    else if (kind === 'pour') pour(ac, n);
    else if (kind === 'done') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, n + i * 0.1, 0.22, 'triangle', 0.2));
  }, []);
  return { playCue, muted, setMuted };
}

/* ───────── pill button (no raw HTML controls) ───────── */
interface PillProps { variant?: 'contained' | 'outlined' | 'accent' | 'highlight'; disabled?: boolean; onClick?: () => void; children: React.ReactNode; title?: string; T: any; }
const PillButton: React.FC<PillProps> = ({ variant = 'contained', disabled, onClick, children, title, T }) => {
  const [h, setH] = useState(false), [p, setP] = useState(false);
  const base: React.CSSProperties = { fontFamily: T.font, fontWeight: 600, fontSize: 14.5, borderRadius: T.pill, padding: '11px 22px', minHeight: T.touch, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .18s ease', border: '2px solid transparent', display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1 };
  let skin: React.CSSProperties;
  if (disabled) skin = { background: T.border, color: T.sub };
  else if (variant === 'accent') skin = { background: p ? '#d85e08' : T.accent, color: '#fff', transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(255,114,18,.32)' : 'none' };
  else if (variant === 'highlight') skin = { background: T.gradient, color: '#fff', transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 20px rgba(83,48,134,.34)' : '0 3px 10px rgba(83,48,134,.18)' };
  else if (variant === 'outlined') skin = { background: h ? T.lavender : 'transparent', color: T.primary, borderColor: T.primary };
  else skin = { background: p ? T.deep : h ? T.lavender : T.primary, color: '#fff', transform: h && !p ? 'translateY(-1px)' : 'none', boxShadow: h ? '0 8px 18px rgba(74,77,201,.28)' : 'none' };
  return <button type="button" title={title} disabled={disabled} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} style={{ ...base, ...skin }}>{children}</button>;
};

/* ───────── §6.1 clickable Teacher | Student segmented toggle (a real styled control) ───────── */
const ModeToggle: React.FC<{ mode: 'ai' | 'student'; onChange: (m: 'ai' | 'student') => void; T: any; uid: string; big: boolean }> = ({ mode, onChange, T, uid, big }) => {
  const segs: { id: 'ai' | 'student'; label: string; emoji: string }[] = [
    { id: 'ai', label: 'Teacher', emoji: '👩‍🏫' }, { id: 'student', label: 'Your turn', emoji: '🙋' },
  ];
  const h = big ? 34 : 30;
  return (
    <div role="tablist" aria-label="Who is driving the tool" style={{ display: 'inline-flex', padding: 3, gap: 3, borderRadius: 999, background: 'rgba(255,255,255,.20)', border: '1px solid rgba(255,255,255,.28)', backdropFilter: 'blur(4px)' }}>
      {segs.map(s => {
        const on = mode === s.id;
        return (
          <button key={s.id} type="button" role="tab" aria-selected={on} className={`focus-${uid}`} title={s.id === 'ai' ? 'Teacher demo (lean)' : 'Your turn (full practice)'} onClick={() => !on && onChange(s.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: h, padding: big ? '5px 14px' : '4px 11px', borderRadius: 999, cursor: on ? 'default' : 'pointer', border: 'none', fontFamily: T.font, fontWeight: 700, fontSize: big ? 13 : 12, letterSpacing: .2, color: on ? T.deep : 'rgba(255,255,255,.92)', background: on ? '#fff' : 'transparent', boxShadow: on ? '0 3px 10px rgba(0,0,0,.18)' : 'none', transition: 'all .22s cubic-bezier(.3,.7,.3,1)' }}>
            <span aria-hidden="true">{s.emoji}</span>{s.label}
          </button>
        );
      })}
    </div>
  );
};

/* ───────── §7.4 full-viewport celebration overlay — fixed, inset:0, pointer-events:none ───────── */
const FullScreenCelebration: React.FC<{ uid: string; T: any; reduced: boolean }> = ({ uid, T, reduced }) => {
  const bits = ['🍃', '✨', '💧', '🎉', '⭐', '🫖'];
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 2147483000, pointerEvents: 'none', overflow: 'hidden', animation: reduced ? undefined : `fsFade-${uid} 2.6s ease forwards` }}>
      {!reduced && [...Array(40)].map((_, i) => (
        <span key={i} style={{ position: 'absolute', left: `${(i * 2.5 + (i % 5) * 3) % 100}%`, top: '-8vh', fontSize: 14 + (i % 4) * 7, animation: `fsFall-${uid} ${1.7 + (i % 6) * 0.28}s ${(i % 8) * 0.09}s cubic-bezier(.4,.1,.6,1) forwards` }}>{bits[i % bits.length]}</span>
      ))}
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', animation: reduced ? undefined : `fsPop-${uid} .6s cubic-bezier(.3,1.4,.5,1) forwards` }}>
          <div style={{ fontSize: 'clamp(44px,10vw,88px)', lineHeight: 1 }}>🍵</div>
          <div style={{ marginTop: 10, fontFamily: T.font, fontWeight: 900, fontSize: 'clamp(22px,4vw,40px)', color: '#fff', textShadow: '0 3px 16px rgba(16,185,129,.55), 0 1px 3px rgba(0,0,0,.35)' }}>Clear tea decanted!</div>
        </div>
      </div>
    </div>
  );
};

class ToolErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { if (this.state.err) return <div role="alert" style={{ fontFamily: THEME.font, padding: 24, background: THEME.cream, borderRadius: 16, color: THEME.deep }}>Something went wrong loading this activity. Please reload.</div>; return this.props.children; }
}

interface ToolProps {
  props?: { width?: number; height?: number; themeColor?: string; darkMode?: boolean; operatorMode?: 'ai' | 'student'; muted?: boolean; initialMode?: Mode; device?: 'mobile' | 'smartboard'; showModeToggle?: boolean; spec?: any; additionalProps?: Record<string, any> };
  setStepDetails?: (d: { beat: string; stepIndex: number; totalSteps: number; state: Record<string, any> }) => void;
  stopAutoNext?: boolean; setStopAutoNext?: (v: boolean) => void;
}

type Mode = 'learn' | 'practice' | 'real_world' | 'hands_on';
type Phase = 'mix' | 'settling' | 'settled' | 'pouring' | 'result';

/* ─────────────────────── SVG scene helpers ─────────────────────── */
function leafPositions(n: number): { x: number; y: number; r: number }[] {
  const out: { x: number; y: number; r: number }[] = [];
  let seed = 1337;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < n; i++) out.push({ x: 52 + rnd() * 132, y: 0, r: rnd() * 360 });
  return out;
}

/* renders the pan body + liquid + leaves at a given settle/disturb/tilt state.

   PHYSICS (the important bit): a liquid always keeps a HORIZONTAL surface under gravity —
   it does NOT rotate with its container. So the tea is drawn in the un-rotated frame with a
   flat (horizontal) top and is clipped to the pan interior *after that interior is rotated by
   the tilt*. The result: as the pan tips, the tea stays level and naturally pools toward the
   low (spout) side, with an air gap opening on the high side. The SEDIMENT is treated the same
   way — its top is also a level line (just below the tea), so the heavier settled leaves POOL
   into the low corner under gravity instead of riding up the high wall as a rigid diagonal.
   Only the truly rigid parts — the metal body and the handle — rotate with the pan. Tip far
   enough and the pooled leaves gather near the lip, which is why a fast, steep pour still
   drags sediment into the stream. */
const PanScene: React.FC<{
  T: any; settle: number; disturb: number; tilt: number; vol: number; clarity: number; leaves: { x: number; y: number; r: number }[]; uid: string; reduced: boolean;
}> = ({ T, settle, disturb, tilt, vol, clarity, leaves, uid, reduced }) => {
  // liquid colour: clarity 1 = clear tea, 0 = cloudy
  const liqColor = hexLerp(T.cloudy, T.tea, clarity);
  // tilt CLOCKWISE (positive angle in SVG, y-down) about the bottom-left pivot so the
  // RIGHT rim dips DOWN toward the cup — the pan pours into the cup, not away from it.
  const spin = `rotate(${tilt} ${PAN.pivot[0]} ${PAN.pivot[1]})`;
  const clip = `pan-clip-${uid}`;
  const bedH = settle * 26 + 3;                                  // settled-leaf layer thickness
  // ── the tea surface stays HORIZONTAL and finds its level in the *tilted* pan ──
  // Solve for the flat surface whose submerged area equals the tea volume, so the tea
  // pools into the low (spout) corner with an air gap on the high wall — never a rigid
  // block that fills the whole tipped pan.
  const tiltedPoly = rotatedInterior(tilt);
  let surfaceY = waterLevelY(tiltedPoly, vol);
  // While actively pouring (pan tilted), keep the surface at least up to the spout lip so
  // the last of the tea still connects to the stream instead of a "dry" spout.
  if (tilt > 6 && vol > 0.02) surfaceY = Math.min(surfaceY, rot(PAN.spout, PAN.pivot, tilt)[1]);
  // Sediment is the settled leaves — a residue that STAYS in the pan even after the clear tea has
  // been poured off (its volume tracks how settled the leaves are, NOT how much tea is left). A band
  // of clear tea shows between surfaceY and sedY while tea remains; once the tea is gone (vol→0) the
  // sediment alone remains as the "leaves left behind".
  const sedVol = clamp(settle * 0.28);
  const sedLine = waterLevelY(tiltedPoly, sedVol);
  const sedY = vol > 0.02 ? Math.max(surfaceY + 1.5, sedLine) : sedLine;
  return (
    <g>
      <defs>
        {/* the interior clip carries the pan's TILT, so the level tea (drawn un-rotated below)
            is trimmed to the tipped pan — tea pools to the low side instead of tilting rigidly */}
        <clipPath id={clip}><polygon points={INTERIOR_PTS.map(p => p.join(',')).join(' ')} transform={spin} /></clipPath>
        <linearGradient id={`liq-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hexLerp(liqColor, '#ffffff', 0.14)} />
          <stop offset="100%" stopColor={liqColor} />
        </linearGradient>
      </defs>
      {/* ground shadow — only while the pan sits (near-upright) on the bench. It's drawn inside the
          pan group, so it lifts WITH the pan; fading it out as the pan tips keeps it from floating
          in mid-air beside the tipped pan (it belongs on the counter, not up by the spout). */}
      {tilt < 12 && <ellipse cx="118" cy="167" rx={Math.max(52, 82 - tilt * 0.55)} ry="8.5" fill={`rgba(0,0,0,${0.15 * (1 - tilt / 12)})`} />}

      {/* ── tea + sediment + leaves, all trimmed to the tipped pan interior ── */}
      <g clipPath={`url(#${clip})`}>
        {/* TEA — filled from the solved water-level line downward; the tilted interior clip shapes
            it, so the surface is horizontal and the tea pools into the low (spout) corner. */}
        {vol > 0.02 && <>
          <rect x={-90} y={surfaceY} width={400} height={270} fill={`url(#liq-${uid})`} />
          {/* meniscus — a thin bright line marking the flat air/tea boundary */}
          <rect x={-90} y={surfaceY} width={400} height={2} fill="rgba(255,255,255,.30)" />
        </>}

        {/* SEDIMENT — the heavier settled leaves, given their own (lower) water-level line so they
            pool into the LOW corner under the tea. Drawn over the tea to fill the bottom of the
            liquid, with clear tea showing in the band between surfaceY and sedY. */}
        {settle > 0.02 && <>
          <rect x={-90} y={sedY} width={400} height={270} fill={T.leaf} opacity={0.6 + 0.4 * settle} />
          {/* darker, denser core a little deeper into the bed */}
          <rect x={-90} y={sedY + bedH * 0.5} width={400} height={270} fill="#2A1C10" opacity={0.45 * settle} />
          {/* crisp, LEVEL boundary line between the clear tea and the settled leaves */}
          {settle > 0.4 && <rect x={-90} y={sedY} width={400} height={1.4} fill="#1E140B" opacity={0.55 * settle} />}
        </>}

        {/* leaf flecks — suspended ones drift through the tea; as they settle they drop onto the
            LEVEL sediment top and the clip trims them to the low corner, so they pool (not climb).
            Un-rotated, so each fleck stays gravity-aligned rather than spinning with the pan. */}
        {leaves.map((l, i) => {
          const settledY = sedY + 1 + ((i * 7) % Math.max(1, Math.round(bedH - 1)));   // within the level bed
          const floatY = lerp(surfaceY + 8, sedY - 2, ((i * 37) % 100) / 100);          // adrift in the tea
          const y = lerp(floatY, settledY, settle);
          const jitter = reduced ? 0 : disturb * Math.sin((i + 1) * 1.7);
          return <ellipse key={i} cx={l.x + jitter * 3} cy={y - Math.abs(jitter) * 2} rx={3.4} ry={1.7} fill={T.leaf} opacity={0.9} transform={`rotate(${l.r} ${l.x} ${y})`} style={reduced ? undefined : { transition: 'all .5s cubic-bezier(.3,.7,.3,1)' }} />;
        })}
      </g>

      {/* ── PAN body + handle (solid metal) — these DO tilt with the pan ── */}
      <g transform={spin}>
        <path d="M40 70 H196 V138 Q196 162 118 162 Q40 162 40 138 Z" fill="none" stroke="#8a6a3a" strokeWidth={4} strokeLinejoin="round" />
        {/* long straight saucepan handle on the LEFT (like a tadka pan) — the grip opposite the
            pouring right rim (matches Fig. 9.9). Mounted flush to the pan wall with a bracket. */}
        <g>
          {/* mounting bracket riveted to the pan's left wall (sits flush against x=40) */}
          <rect x="40" y="74" width="10" height="20" rx="3" fill="#1A1A1A" />
          {/* the shaft — black, long; starts INSIDE the bracket so it reads as one connected piece */}
          <path d="M46 84 H-29" fill="none" stroke="#1E1E1E" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
          {/* two rivets on the bracket */}
          <circle cx="45" cy="79" r="1.6" fill="#4A4A4A" />
          <circle cx="45" cy="89" r="1.6" fill="#4A4A4A" />
          {/* soft highlight along the shaft */}
          <path d="M40 81 H-27" fill="none" stroke="#3C3C3C" strokeWidth={3} strokeLinecap="round" />
          {/* rounded end cap / grip */}
          <circle cx="-29" cy="84" r="7" fill="#1A1A1A" />
        </g>
      </g>
    </g>
  );
};

const SedDecExperiment: React.FC<ToolProps> = ({ props = {}, setStepDetails }) => {
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/[:]/g, '');
  const dark = !!props.darkMode;
  const accent = props.themeColor || THEME.primary;
  const T = useMemo(() => { const p = palette(dark); return { ...p, primary: accent, gradient: `linear-gradient(135deg,${p.deep},${THEME.warm})` }; }, [dark, accent]);
  const width = props.width || 0;
  const ap = props.additionalProps || {};
  const leafCount = (ap.leafCount as number) || 14;
  const leaves = useMemo(() => leafPositions(leafCount), [leafCount]);

  /* ── mode (learn / quiz / real-world / hands-on experiment) ── */
  const [mode, setMode] = useState<Mode>(props.initialMode || 'learn');
  const [learnIdx, setLearnIdx] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  /* ── experiment state ── */
  const [phase, setPhase] = useState<Phase>('mix');     // mix → settling → settled → pouring → result
  const [settle, setSettle] = useState(0);              // 0..1 sedimentation progress
  const [disturb, setDisturb] = useState(0);            // 0..1 leaf agitation
  const [doneSteps, setDoneSteps] = useState<string[]>([]); // pour steps completed
  const [tilt, setTilt] = useState(0);                  // current pan tilt (deg)
  const [panVol, setPanVol] = useState(1);              // tea left in pan
  const [cupVol, setCupVol] = useState(0);              // tea in cup
  const [clarity, setClarity] = useState(1);            // 1 clear, 0 cloudy (of poured tea)
  const [announce, setAnnounce] = useState('Settle the leaves first, then pour off the clear tea.');

  /* ── operator mode (§6.1) + content depth (§6.2) ── */
  const initialOp: 'ai' | 'student' = props.operatorMode === 'ai' ? 'ai' : 'student';
  const [op, setOp] = useState<'ai' | 'student'>(initialOp);
  const opRef = useRef(op); opRef.current = op;
  const isAI = op === 'ai';
  const lean = isAI;                                   // Teacher = lean, Student = full (§6.2)
  const depth: 'lean' | 'full' = lean ? 'lean' : 'full';
  /* the active pour set is depth-dependent — Teacher demos in 2 steps, Student practises in 4 */
  const POUR_STEPS = useMemo(() => stepsForDepth(lean), [lean]);
  const STEP_BY_ID = useMemo(() => Object.fromEntries(POUR_STEPS.map(s => [s.id, s])) as Record<string, PourStep>, [POUR_STEPS]);
  const TOTAL_STEPS = POUR_STEPS.length;
  /* refs so the imperative api reads the CURRENT depth's steps (not a stale closure) */
  const pourStepsRef = useRef(POUR_STEPS); pourStepsRef.current = POUR_STEPS;
  const stepByIdRef = useRef(STEP_BY_ID); stepByIdRef.current = STEP_BY_ID;
  const totalStepsRef = useRef(TOTAL_STEPS); totalStepsRef.current = TOTAL_STEPS;

  /* ── device target (§7.4 / §8.1): touch-target floor ── */
  const device: 'mobile' | 'smartboard' = props.device === 'smartboard' ? 'smartboard' : 'mobile';
  const showModeToggle = props.showModeToggle !== false;   // default true (§6.1)

  /* ── sound (§7.3) ── */
  const { playCue, muted, setMuted } = useSound(!!props.muted);

  /* refs that mirror state for the imperative api */
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const settleRef = useRef(settle); settleRef.current = settle;
  const doneRef = useRef(doneSteps); doneRef.current = doneSteps;
  const panVolRef = useRef(panVol); panVolRef.current = panVol;
  const cupVolRef = useRef(cupVol); cupVolRef.current = cupVol;
  const clarityRef = useRef(clarity); clarityRef.current = clarity;
  const modeRef = useRef(mode); modeRef.current = mode;
  const settleRaf = useRef<number | null>(null);
  const highlightRef = useRef<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const hlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* §7.4 full-screen celebration — fires once on a clean decant, then hands the screen back */
  const [celebrate, setCelebrate] = useState(false);
  const celebTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback((msg: any) => { try { window.parent.postMessage(msg, '*'); } catch (e) {} }, []);

  const buildState = useCallback(() => ({
    mode: modeRef.current,
    phase: phaseRef.current,
    settle: Math.round(settleRef.current * 100) / 100,
    stepsCompleted: [...doneRef.current],
    totalSteps: totalStepsRef.current,
    panVolume: Math.round(panVolRef.current * 100) / 100,
    cupVolume: Math.round(cupVolRef.current * 100) / 100,
    clarity: Math.round(clarityRef.current * 100) / 100,
    finished: phaseRef.current === 'result',
    operatorMode: opRef.current,
    depth: opRef.current === 'ai' ? 'lean' : 'full',
    stepCount: totalStepsRef.current,
    muted,
  }), [muted]);

  const pushState = useCallback(() => { const s = buildState(); emit({ type: 'state', state: s }); setStepDetails?.({ beat: 'Apply', stepIndex: doneRef.current.length, totalSteps: totalStepsRef.current, state: s }); }, [buildState, emit, setStepDetails]);

  /* ── VERB: settle() — run sedimentation (the heavy leaves sink) ── */
  const settleAction = useCallback(() => {
    if (settleRaf.current) cancelAnimationFrame(settleRaf.current);
    if (settleRef.current >= 1) return;
    setPhase('settling'); phaseRef.current = 'settling';
    setDisturb(0);
    playCue('tap');
    setAnnounce('Sedimentation: the heavy leaves are sinking to the bottom…');
    emit({ type: 'event', name: 'settle_started', detail: {} });
    const dur = reduced ? 200 : 3200;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = clamp((now - t0) / dur);
      settleRef.current = p; setSettle(p);
      if (p < 1) { settleRaf.current = requestAnimationFrame(tick); }
      else {
        settleRaf.current = null; setPhase('settled'); phaseRef.current = 'settled';
        setAnnounce('Settled! Two layers — clear tea on top, leaves at the bottom. Now pour gently.');
        playCue('correct');
        emit({ type: 'event', name: 'settled', detail: { settle: 1 } });
        pushState();
      }
    };
    settleRaf.current = requestAnimationFrame(tick);
    pushState();
  }, [emit, playCue, pushState, reduced]);

  /* apply one named pour step (used by both student + agent) */
  const applyStep = useCallback((stepId: string): boolean => {
    const total = totalStepsRef.current;
    const step = stepByIdRef.current[stepId];
    if (!step) return false;
    if (settleRef.current < 0.6) {
      // pouring before the leaves settle → the sediment lifts → cloudy
      setDisturb(1); setTimeout(() => setDisturb(d => d * 0.4), 360);
      clarityRef.current = Math.min(clarityRef.current, 0.25); setClarity(clarityRef.current);
      setAnnounce('You poured before the leaves settled — the sediment lifted and cloudy tea came out!');
      playCue('wrong');
      emit({ type: 'event', name: 'poured_too_early', detail: { stepId } });
      return false;
    }
    if (doneRef.current.includes(stepId)) return true; // idempotent-safe
    const nd = [...doneRef.current, stepId]; doneRef.current = nd; setDoneSteps(nd);
    setPhase('pouring'); phaseRef.current = 'pouring';
    setTilt(step.tilt);
    // gentle, settled pour = clear tea moves to the cup
    panVolRef.current = clamp(1 - step.transfer); setPanVol(panVolRef.current);
    cupVolRef.current = clamp(step.transfer); setCupVol(cupVolRef.current);
    playCue('pour');
    emit({ type: 'event', name: 'step_completed', detail: { stepId, stepsCompleted: nd.length, totalSteps: total } });
    if (nd.length >= total) {
      setPhase('result'); phaseRef.current = 'result';
      const clear = clarityRef.current > 0.6;
      setAnnounce(clear ? '🎉 You decanted clear tea into the cup — sedimentation then decantation done right!' : 'The cup looks cloudy — try again and let the leaves settle fully before pouring.');
      playCue('done');
      if (clear) {
        setCelebrate(true);
        if (celebTimer.current) clearTimeout(celebTimer.current);
        celebTimer.current = setTimeout(() => { setCelebrate(false); celebTimer.current = null; }, reduced ? 900 : 2600);
      }
      emit({ type: 'event', name: 'completed', detail: { clarity: clarityRef.current, clear, cupVolume: cupVolRef.current } });
    } else {
      setAnnounce(`${step.label} — clear tea pours off, leaves stay behind. (${nd.length} of ${total})`);
    }
    return true;
  }, [emit, playCue, reduced]);

  /* ── VERB: step(id | [ids]) — advance one or many pour steps ── */
  const step = useCallback((arg: any) => {
    const steps = pourStepsRef.current;
    const ids: string[] = Array.isArray(arg) ? arg.map(String)
      : arg == null ? [steps.find(s => !doneRef.current.includes(s.id))?.id].filter(Boolean) as string[]
      : [String(arg)];
    let any = false;
    for (const id of ids) { if (applyStep(id)) any = true; }
    if (any) setTimeout(pushState, 0);
    return buildState();
  }, [applyStep, pushState, buildState]);

  /* ── VERB: decant() — convenience: run all remaining pour steps gently ── */
  const decant = useCallback(() => {
    const steps = pourStepsRef.current;
    if (settleRef.current < 0.6) { applyStep(steps[0].id); setTimeout(pushState, 0); return buildState(); }
    for (const s of steps) applyStep(s.id);
    setTimeout(pushState, 0); return buildState();
  }, [applyStep, pushState, buildState]);

  /* ── reset ── */
  const reset = useCallback(() => {
    if (settleRaf.current) { cancelAnimationFrame(settleRaf.current); settleRaf.current = null; }
    if (celebTimer.current) { clearTimeout(celebTimer.current); celebTimer.current = null; }
    setCelebrate(false);
    phaseRef.current = 'mix'; settleRef.current = 0; doneRef.current = []; panVolRef.current = 1; cupVolRef.current = 0; clarityRef.current = 1;
    setPhase('mix'); setSettle(0); setDisturb(0); setDoneSteps([]); setTilt(0); setPanVol(1); setCupVol(0); setClarity(1);
    setAnnounce('Reset. Settle the leaves first, then pour off the clear tea.');
    emit({ type: 'event', name: 'reset', detail: {} }); setTimeout(pushState, 0);
  }, [emit, pushState]);

  /* ── highlight(target): non-destructive pulse on any nameable element ── */
  const highlightAction = useCallback((target: string) => {
    if (hlTimer.current) { clearTimeout(hlTimer.current); hlTimer.current = null; }
    const key = String(target).toLowerCase();
    const map: Record<string, string> = { pan: 'pan', cup: 'cup', leaves: 'pan', sediment: 'pan', tea: 'cup', settle: 'settleBtn', pour: 'pourBtn', s1: 'pourBtn', s2: 'pourBtn', s3: 'pourBtn', s4: 'pourBtn' };
    const id = map[key] || key;
    highlightRef.current = id; setHighlight(id); setAnnounce(`Look at: ${target}.`); playCue('tap');
    if (!reduced) hlTimer.current = setTimeout(() => { highlightRef.current = null; setHighlight(null); hlTimer.current = null; }, 2200);
  }, [reduced, playCue]);

  const getState = useCallback(() => buildState(), [buildState]);

  /* ── §6.1/§6.2 operator mode + live depth re-derive (host, toggle, or setParam) ── */
  const setOperatorMode = useCallback((m: any) => {
    const next: 'ai' | 'student' = String(m).toLowerCase() === 'ai' ? 'ai' : 'student';
    if (next === opRef.current) return;
    const nextLean = next === 'ai';
    const nextDepth: 'lean' | 'full' = nextLean ? 'lean' : 'full';
    const nextSteps = stepsForDepth(nextLean);
    const nextIds = nextSteps.map(s => s.id);
    // re-derive depth live: keep only completed pour-steps that still exist in the new depth (§6.2)
    const keptDone = doneRef.current.filter((id: string) => nextIds.includes(id));
    doneRef.current = keptDone; setDoneSteps(keptDone);
    // if the new (shorter/longer) set is no longer fully poured, drop out of the result phase
    if (phaseRef.current === 'result' && keptDone.length < nextSteps.length) {
      const back: Phase = keptDone.length > 0 ? 'pouring' : (settleRef.current >= 1 ? 'settled' : 'mix');
      phaseRef.current = back; setPhase(back);
    }
    opRef.current = next; setOp(next);
    playCue('tap');
    emit({ type: 'event', name: 'operator_mode_changed', detail: { operatorMode: next, depth: nextDepth, stepCount: nextSteps.length } });
    setTimeout(pushState, 0);
  }, [emit, pushState, playCue]);

  const play = useCallback(() => { if (settleRef.current < 1) settleAction(); else step(); return buildState(); }, [settleAction, step, buildState]);
  const pause = useCallback(() => { if (settleRaf.current) { cancelAnimationFrame(settleRaf.current); settleRaf.current = null; } return buildState(); }, [buildState]);

  const setParam = useCallback((name: string, value: any) => {
    if (name === 'muted') setMuted(!!value);
    else if (name === 'operatorMode') setOperatorMode(value);
    else if (name === 'mode') setMode(['learn', 'practice', 'real_world', 'hands_on'].includes(value) ? value : 'hands_on');
    return buildState();
  }, [setMuted, setOperatorMode, buildState]);

  /* ── §3 contract wiring ── */
  useEffect(() => {
    const api: Record<string, (...a: any[]) => any> = {
      setParam, play, pause, reset, highlight: highlightAction, getState, setOperatorMode,
      settle: settleAction, decant, step,
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
  }, [setParam, play, pause, reset, highlightAction, getState, setOperatorMode, settleAction, decant, step, emit]);

  /* ── scoped keyframes ── */
  useEffect(() => {
    const el = document.createElement('style'); el.id = 'st-' + uid;
    const kf = reduced ? '' : `
@keyframes fadeUp-${uid}{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
@keyframes pop-${uid}{0%{transform:scale(.7)}70%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes pulseRing-${uid}{0%,100%{box-shadow:0 0 0 0 rgba(255,114,18,0)}50%{box-shadow:0 0 0 6px rgba(255,114,18,.5)}}
@keyframes bob-${uid}{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes starpop-${uid}{0%{opacity:0;transform:scale(.2) rotate(-25deg)}60%{transform:scale(1.25) rotate(8deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes confetti-${uid}{0%{transform:translateY(-8px) rotate(0);opacity:1}100%{transform:translateY(220px) rotate(540deg);opacity:0}}
@keyframes streamFlow-${uid}{0%{stroke-dashoffset:0}100%{stroke-dashoffset:-18}}
@keyframes ripple-${uid}{0%{transform:scale(.55);opacity:.9}100%{transform:scale(1.6);opacity:0}}
@keyframes spin-${uid}{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
@keyframes fsFall-${uid}{0%{transform:translateY(-12vh) rotate(0);opacity:0}8%{opacity:1}100%{transform:translateY(112vh) rotate(720deg);opacity:.9}}
@keyframes fsPop-${uid}{0%{opacity:0;transform:scale(.5)}55%{opacity:1;transform:scale(1.18)}100%{opacity:1;transform:scale(1)}}
@keyframes fsFade-${uid}{0%{opacity:0}12%{opacity:1}82%{opacity:1}100%{opacity:0}}`;
    const scroll = `.scroll-${uid}{scrollbar-width:thin;scrollbar-color:${T.lavender} transparent;}
.scroll-${uid}::-webkit-scrollbar{width:9px;height:9px;}
.scroll-${uid}::-webkit-scrollbar-thumb{background:${T.lavender};border-radius:999px;}
.focus-${uid}:focus-visible{outline:3px solid ${T.accent};outline-offset:2px;}`;
    /* §8.1 orientation-aware, no-scroll layout. box-sizing:border-box on every sized box.
       The shell is a container; the experiment reflows to a two-pane split when it is wide. */
    const layout = `
.shell-${uid},.shell-${uid} *{box-sizing:border-box;}
.shell-${uid}{container-type:inline-size;}
.expt-${uid}{display:flex;flex-direction:column;gap:12px;}
.scenepane-${uid}{min-width:0;}
.ctrlpane-${uid}{display:flex;flex-direction:column;gap:10px;min-width:0;}
/* Learn card: image + text stack on narrow, sit SIDE-BY-SIDE on wider (shorter → no mobile scroll) */
.learnrow-${uid}{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;}
.learnimg-${uid}{min-width:0;width:100%;}
.learntext-${uid}{display:flex;flex-direction:column;align-items:center;text-align:center;gap:9px;min-width:0;}
@container (min-width:520px){
  .learnrow-${uid}{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:18px;align-items:center;}
  .learnimg-${uid}{width:auto;}
  .learntext-${uid}{align-items:flex-start;text-align:left;}
}
@container (min-width:640px){
  .expt-${uid}{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:16px;align-items:start;}
  .ctrlpane-${uid}{justify-content:center;height:100%;}
}`;
    el.textContent = kf + scroll + layout; document.head.appendChild(el); return () => { el.remove(); };
  }, [uid, reduced, T.lavender, T.accent]);

  useEffect(() => { pushState(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { if (settleRaf.current) cancelAnimationFrame(settleRaf.current); if (hlTimer.current) clearTimeout(hlTimer.current); if (celebTimer.current) clearTimeout(celebTimer.current); }, []);
  useEffect(() => { pushState(); /* eslint-disable-next-line */ }, [mode]);

  /* ── small UI helpers ── */
  const statChip: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: T.ink, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.pill, padding: '6px 12px', display: 'inline-flex', gap: 6, alignItems: 'center' };
  const hl = (id: string): React.CSSProperties => (highlight === id && !reduced) ? { animation: `pulseRing-${uid} 1.1s ease 2`, borderRadius: 14 } : {};

  const MODES: { id: Mode; label: string; emoji: string }[] = [
    { id: 'learn', label: 'Learn', emoji: '📖' }, { id: 'practice', label: 'Quiz', emoji: '🎯' },
    { id: 'real_world', label: 'Daily Life', emoji: '🌍' }, { id: 'hands_on', label: 'Hands-On', emoji: '🧪' },
  ];
  const changeMode = (m: Mode) => { if (m === mode) return; setMode(m); modeRef.current = m; if (m === 'practice') { setQuizIdx(0); setQuizPick(null); setQuizScore(0); setQuizDone(false); } if (m === 'learn') setLearnIdx(0); if (m === 'hands_on') reset(); playCue('tap'); };

  /* ── quiz handlers ── */
  const pickQuiz = (i: number) => {
    if (quizPick !== null) return;
    setQuizPick(i); const ok = i === QUIZ[quizIdx].a;
    if (ok) setQuizScore(s => s + 1);
    playCue(ok ? 'correct' : 'wrong');
    setAnnounce(ok ? 'Correct.' : 'Not quite.');
    emit({ type: 'event', name: ok ? 'answer_correct' : 'answer_incorrect', detail: { questionIndex: quizIdx, picked: i } });
  };
  const nextQuiz = () => { if (quizIdx === QUIZ.length - 1) { setQuizDone(true); if (quizScore >= 3) playCue('done'); return; } setQuizIdx(i => i + 1); setQuizPick(null); };

  /* ─────────────────── render: the experiment scene (phenomenon — shown in BOTH modes) ─────────────────── */
  const clearTea = clarity > 0.6;
  const renderScene = () => {
    const liqColor = hexLerp(T.cloudy, T.tea, clarity);
    // cup sits LOW in the frame so the whole pan clears its rim while pouring from above
    const cupX = 250, cupW = 84, cupMouthY = 150, cupBot = 185, cupCx = cupX + cupW / 2;
    const cupFill = cupVol;
    const cupTopY = cupBot - cupFill * (cupBot - cupMouthY - 6);
    const cupPath = `M${cupX} ${cupMouthY} H${cupX + cupW} L${cupX + cupW - 7} ${cupBot - 10} Q${cupX + cupW - 9} ${cupBot} ${cupCx} ${cupBot} Q${cupX + 9} ${cupBot} ${cupX + 7} ${cupBot - 10} Z`;
    const pouring = phase === 'pouring';
    return (
      <div style={{ ...hl('pan'), position: 'relative' }}>
        <svg viewBox="0 0 360 200" width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', maxHeight: 'clamp(150px, 48svh, 520px)' }} role="img" aria-label={`Pan of tea, sedimentation ${Math.round(settle * 100)} percent, ${clearTea ? 'clear' : 'cloudy'} tea`}>
          <defs>
            <clipPath id={`cupclip-${uid}`}><path d={cupPath} /></clipPath>
            {/* cup tea uses the SAME clear-tea colour as the clear band in the pan (top slightly
                lightened → liqColor), so decanted tea in the cup matches the tea poured from the pan */}
            <linearGradient id={`cupliq-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={hexLerp(liqColor, '#ffffff', 0.12)} /><stop offset="100%" stopColor={liqColor} /></linearGradient>
          </defs>
          {/* whole scene (pan + cup) shifted LEFT ~37px so the composition sits CENTRED in the box
              (it otherwise drifts right of centre), then scaled for the long tilted handle's headroom */}
          <g transform="translate(-37 0) translate(178 124) scale(0.8) translate(-178 -124)">
          {/* PAN — scaled 0.72 about its pivot so its rotated bottom clears the cup rim, then lifted
              (panShiftY grows with tilt). Geometry verified: pan bottom stays ~13px above the rim and
              the pan top stays in frame at every tilt 0..55. */}
          {(() => { const panLift = panShiftY(tilt); return (
          <g transform={`translate(${PAN_SHIFT_X} ${panLift}) translate(${PAN.pivot[0]} ${PAN.pivot[1]}) scale(${PAN_SCALE}) translate(${-PAN.pivot[0]} ${-PAN.pivot[1]})`}>
            <PanScene T={T} settle={settle} disturb={disturb} tilt={tilt} vol={phase === 'result' ? 0 : panVol} clarity={clarity} leaves={leaves} uid={uid} reduced={reduced} />
          </g>
          ); })()}
          {/* pouring stream — the tea leaves the tipped lip and FALLS under gravity into the cup:
              a bead wells at the spout, a smooth arc curves from the lip's tangent to near-vertical,
              and it lands on the tea already in the cup with a little ripple. The spout point is
              rotated + scaled about the pivot (matching the pan), then shifted + lifted. */}
          {pouring && panVol > 0.02 && (() => {
            const scaledSpout: [number, number] = [PAN.pivot[0] + (PAN.spout[0] - PAN.pivot[0]) * PAN_SCALE, PAN.pivot[1] + (PAN.spout[1] - PAN.pivot[1]) * PAN_SCALE];
            const spr = rot(scaledSpout, PAN.pivot, tilt);
            const sp: [number, number] = [spr[0] + PAN_SHIFT_X, spr[1] + panShiftY(tilt)];   // account for the pan's right shift + lift
            // land ON the tea surface in the cup (rises as the cup fills); clamp inside the cup.
            const landY = Math.min(cupBot - 6, Math.max(cupMouthY + 4, cupTopY));
            const fall = landY - sp[1];                 // always > 0 → the stream only ever goes DOWN
            // control points: leave the lip roughly along the tilt, then bend to vertical as it drops.
            const c1x = sp[0] + (cupCx - sp[0]) * 0.30, c1y = sp[1] + fall * 0.10;
            const c2x = cupCx + (cupCx - sp[0]) * 0.06, c2y = sp[1] + fall * 0.66;
            const d = `M${sp[0]} ${sp[1]} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cupCx} ${landY}`;
            return <g>
              {/* the falling stream body + a lighter inner highlight for a rounded, liquid look */}
              <path d={d} fill="none" stroke={liqColor} strokeWidth={5} strokeLinecap="round" />
              <path d={d} fill="none" stroke={hexLerp(liqColor, '#ffffff', 0.28)} strokeWidth={2} strokeLinecap="round" />
              {/* glints running DOWN the stream to sell the flow direction */}
              <path d={d} fill="none" stroke="rgba(255,255,255,.5)" strokeWidth={1.4} strokeLinecap="round" strokeDasharray="3 6" style={reduced ? undefined : { animation: `streamFlow-${uid} .55s linear infinite` }} />
              {/* a bead of tea welling at the very lip where the pour begins */}
              <circle cx={sp[0]} cy={sp[1]} r={3.1} fill={liqColor} />
              <circle cx={sp[0] - 0.8} cy={sp[1] - 0.8} r={1.1} fill={hexLerp(liqColor, '#ffffff', 0.4)} />
              {/* ripple where the stream meets the tea in the cup (scales about its own centre) */}
              <ellipse cx={cupCx} cy={landY} rx={7} ry={2.3} fill="none" stroke={hexLerp(liqColor, '#ffffff', 0.35)} strokeWidth={1.6} opacity={0.85} style={reduced ? undefined : { animation: `ripple-${uid} .9s ease-out infinite`, transformBox: 'fill-box', transformOrigin: 'center' }} />
              {/* LAST STEP (s4): a couple of settled leaves get carried over with the final pour — the
                  "dregs". This is exactly the learn-card point that decanting isn't a *perfect*
                  separation (a few leaves slip out; a strainer would catch them → filtration). Each
                  leaf tumbles DOWN the stream path into the cup, fading at the ends so the loop is seamless. */}
              {doneSteps.includes('s4') && !reduced && [0, 1, 2].map(i => (
                <g key={`fleaf-${i}`} opacity={0}>
                  <ellipse cx={0} cy={0} rx={2.7 - i * 0.2} ry={1.5 - i * 0.1} fill={T.leaf}>
                    <animateMotion path={d} dur="0.85s" begin={`${i * 0.28}s`} repeatCount="indefinite" rotate="auto" />
                  </ellipse>
                  <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.14;0.82;1" dur="0.85s" begin={`${i * 0.28}s`} repeatCount="indefinite" />
                </g>
              ))}
            </g>;
          })()}
          {/* cup */}
          <g style={hl('cup') as any}>
            <ellipse cx={cupCx} cy={cupBot + 8} rx={cupW / 2 + 4} ry={7} fill="rgba(0,0,0,.14)" />
            {cupFill > 0.01 && <g clipPath={`url(#cupclip-${uid})`}><rect x={cupX} y={cupTopY} width={cupW} height={cupBot - cupTopY + 4} fill={`url(#cupliq-${uid})`} /></g>}
            {/* a few leaves that came over with the final pour, now afloat in the cup (also the visible
                result for reduced-motion, where the falling animation is suppressed) */}
            {doneSteps.includes('s4') && cupFill > 0.05 && (
              <g clipPath={`url(#cupclip-${uid})`}>
                <ellipse cx={cupCx - 11} cy={cupTopY + 7} rx={2.6} ry={1.4} fill={T.leaf} opacity={0.85} transform={`rotate(24 ${cupCx - 11} ${cupTopY + 7})`} />
                <ellipse cx={cupCx + 7} cy={cupTopY + 11} rx={2.4} ry={1.3} fill={T.leaf} opacity={0.8} transform={`rotate(-18 ${cupCx + 7} ${cupTopY + 11})`} />
                <ellipse cx={cupCx - 1} cy={cupTopY + 15} rx={2.2} ry={1.2} fill={T.leaf} opacity={0.72} transform={`rotate(9 ${cupCx - 1} ${cupTopY + 15})`} />
              </g>
            )}
            <path d={cupPath} fill="none" stroke={T.sub} strokeWidth={3} strokeLinejoin="round" />
            <path d={`M${cupX + cupW} ${cupMouthY + 8} q22 6 0 30`} fill="none" stroke={T.sub} strokeWidth={3} strokeLinecap="round" />
          </g>
          </g>
        </svg>
      </div>
    );
  };

  /* read-out (settle %, clarity, step tracker) — shown in BOTH modes */
  const renderReadout = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 6 }}>
      <span style={statChip}>⏳ Settled <b style={{ color: settle >= 1 ? T.greenText : T.amberText }}>{Math.round(settle * 100)}%</b></span>
      <span style={statChip}>{clearTea ? '💧' : '🌫️'} Tea <b style={{ color: clearTea ? T.greenText : T.amberText }}>{clearTea ? 'clear' : 'cloudy'}</b></span>
      <span style={statChip}>🫗 Poured <b style={{ color: T.primary }}>{doneSteps.length}/{TOTAL_STEPS}</b></span>
    </div>
  );

  /* step tracker dots */
  const renderSteps = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {POUR_STEPS.map((s, i) => {
        const done = doneSteps.includes(s.id);
        return <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: T.pill, fontSize: 12, fontWeight: 600, background: done ? T.greenSoft : T.surface, color: done ? T.greenText : T.sub, border: `1.5px solid ${done ? T.green : T.border}`, ...hl('pourBtn') }}>
          <span>{done ? '✓' : i + 1}</span>{s.label}
        </div>;
      })}
    </div>
  );

  const renderExperiment = () => (
    <div className={`expt-${uid}`} style={{ animation: reduced ? undefined : `fadeUp-${uid} .4s ease` }}>
      {/* ── left pane: the phenomenon (shown in BOTH modes) ── */}
      <div className={`scenepane-${uid}`}>
        <div style={{ background: dark ? 'linear-gradient(180deg,#221c30,#2a2436)' : 'linear-gradient(180deg,#F4F7FF,#FFF7EF)', borderRadius: 18, padding: '10px 12px 2px', border: `1px solid ${T.border}` }}>
          {renderScene()}
        </div>
        {renderReadout()}
      </div>

      {/* ── right pane: read-out detail + steps + status + controls ── */}
      <div className={`ctrlpane-${uid}`}>
        {renderSteps()}

        {/* status banner */}
        <div role="status" key={announce} style={{ padding: '9px 13px', borderRadius: 12, fontSize: 13, lineHeight: 1.45, background: phase === 'result' ? (clearTea ? T.greenSoft : T.amberSoft) : T.cream, color: phase === 'result' ? (clearTea ? T.greenText : T.amberText) : T.ink, border: `1px solid ${phase === 'result' ? (clearTea ? T.green : T.amber) : T.border}`, textAlign: 'center', animation: reduced ? undefined : `fadeUp-${uid} .3s ease both` }}>
          <span aria-hidden="true" style={{ marginRight: 6 }}>{phase === 'result' ? (clearTea ? '🎉' : '🌫️') : phase === 'settled' ? '✨' : phase === 'settling' ? '⏳' : '🍵'}</span>{announce}
        </div>

        {/* compact result summary (the celebration itself is the §7.4 full-screen overlay) */}
        {phase === 'result' && clearTea && (
          <div role="status" style={{ padding: '12px 14px', borderRadius: 14, textAlign: 'center', background: dark ? '#19342A' : 'linear-gradient(135deg,#FFF8EE,#E9F7EF)', border: `2px solid ${T.green}`, animation: reduced ? undefined : `pop-${uid} .5s ease` }}>
            <div aria-hidden="true" style={{ fontSize: 26, letterSpacing: 4 }}>{[0, 1, 2].map(i => <span key={i} style={{ display: 'inline-block', animation: reduced ? undefined : `starpop-${uid} .5s ease both ${0.1 + i * 0.13}s` }}>⭐</span>)}</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 6, lineHeight: 1.5 }}>You let the leaves <b>sediment</b>, then <b>decanted</b> the clear tea — leaves stayed behind. A strainer (filtration) makes it perfectly clear.</div>
          </div>
        )}

        {/* action bar — hidden in ai mode (§6.1); phenomenon + readout stay above */}
        {!isAI && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {settle < 1 && phase !== 'settling' && (
              <span style={hl('settleBtn')}><PillButton T={T} variant="highlight" onClick={settleAction}>⏳ Wait &amp; settle</PillButton></span>
            )}
            {phase === 'settling' && <PillButton T={T} variant="outlined" disabled>Settling…</PillButton>}
            {settle >= 1 && phase !== 'result' && (
              <span style={hl('pourBtn')}><PillButton T={T} variant="accent" onClick={() => step()}>🫗 Pour gently</PillButton></span>
            )}
            {(doneSteps.length > 0 || phase === 'result' || settle > 0) && (
              <PillButton T={T} variant="outlined" onClick={reset}>↻ Reset</PillButton>
            )}
          </div>
        )}
      </div>
    </div>
  );

  /* ─────────────────── learn / quiz / real-world (preserved) ─────────────────── */
  const renderLearn = () => {
    const card = LEARN_CARDS[learnIdx]; const last = learnIdx === LEARN_CARDS.length - 1;
    const mini = (v: string) => (
      <svg viewBox="0 0 360 200" width="100%" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 300, maxHeight: '34svh' }} aria-hidden="true">
        {/* shift the pan RIGHT so the long left handle (ends at x=-29) isn't clipped by the SVG edge */}
        <g transform="translate(40 0)">
        {v === 'suspend' && <PanScene T={T} settle={0} disturb={0.6} tilt={0} vol={1} clarity={0.3} leaves={leaves} uid={uid + 'l'} reduced={reduced} />}
        {v === 'settled' && <PanScene T={T} settle={1} disturb={0} tilt={0} vol={1} clarity={1} leaves={leaves} uid={uid + 'l'} reduced={reduced} />}
        {/* tilted pan drops lower — lift it up so its bottom isn't cut off by the viewBox */}
        {v === 'pour' && <g transform="translate(0 -40)"><PanScene T={T} settle={1} disturb={0} tilt={30} vol={0.6} clarity={1} leaves={leaves} uid={uid + 'l'} reduced={reduced} /></g>}
        </g>
        {v === 'filter' && (() => {
          // a metal TEA STRAINER: a mesh basket with a long handle — leaves caught in the mesh,
          // clear tea dripping through (the "filtration" the text describes).
          const cx = 150, rimY = 84, rimRx = 52, rimRy = 13, bowlBot = 132;
          const meshClip = `strainer-mesh-${uid}`;
          const bowl = `M${cx - rimRx} ${rimY} A${rimRx} ${rimRy} 0 0 0 ${cx + rimRx} ${rimY} Q${cx + rimRx - 6} ${bowlBot - 8} ${cx} ${bowlBot} Q${cx - rimRx + 6} ${bowlBot - 8} ${cx - rimRx} ${rimY} Z`;
          return (
            <g>
              <defs>
                <clipPath id={meshClip}><path d={bowl} /></clipPath>
                <linearGradient id={`steel-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EDEFF3" /><stop offset="55%" stopColor="#C4C9D2" /><stop offset="100%" stopColor="#9AA1AD" /></linearGradient>
              </defs>
              {/* long handle angling up to the right (steel rod) */}
              <path d={`M${cx + rimRx - 10} ${rimY - 2} L322 44`} fill="none" stroke="#AEB4BF" strokeWidth={7} strokeLinecap="round" />
              <path d={`M${cx + rimRx - 10} ${rimY - 3} L322 43`} fill="none" stroke="#EDEFF3" strokeWidth={2.4} strokeLinecap="round" />
              {/* hanging loop at the handle end */}
              <circle cx="326" cy="42" r="5.5" fill="none" stroke="#AEB4BF" strokeWidth={3} />
              {/* the mesh basket */}
              <path d={bowl} fill={`url(#steel-${uid})`} />
              {/* cross-hatch mesh, clipped to the bowl */}
              <g clipPath={`url(#${meshClip})`} stroke="#7C838F" strokeWidth={0.8} opacity={0.55}>
                {Array.from({ length: 13 }, (_, i) => <line key={`v${i}`} x1={cx - rimRx + i * 8} y1={rimY - 4} x2={cx - rimRx + i * 8} y2={bowlBot + 4} />)}
                {Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1={cx - rimRx - 2} y1={rimY + 4 + i * 8} x2={cx + rimRx + 2} y2={rimY + 4 + i * 8} />)}
              </g>
              {/* a few tea leaves caught in the mesh */}
              <ellipse cx={cx - 14} cy={rimY + 16} rx={4} ry={2} fill={T.leaf} transform={`rotate(20 ${cx - 14} ${rimY + 16})`} />
              <ellipse cx={cx + 10} cy={rimY + 22} rx={4} ry={2} fill={T.leaf} transform={`rotate(-15 ${cx + 10} ${rimY + 22})`} />
              <ellipse cx={cx - 2} cy={rimY + 30} rx={4} ry={2} fill={T.leaf} transform={`rotate(35 ${cx - 2} ${rimY + 30})`} />
              {/* bright rim ring on top */}
              <ellipse cx={cx} cy={rimY} rx={rimRx} ry={rimRy} fill="none" stroke="#DDE1E7" strokeWidth={4} />
              <ellipse cx={cx} cy={rimY} rx={rimRx} ry={rimRy} fill="none" stroke="#8C93A0" strokeWidth={1.4} />
              {/* clear tea dripping through the mesh into a drop below */}
              <path d={`M${cx} ${bowlBot + 2} q3 8 3 12 a3.4 3.4 0 0 1-6.8 0 q0-4 3.8-12Z`} fill={T.tea} style={reduced ? undefined : { animation: `bob-${uid} 1.2s ease-in-out infinite` }} />
            </g>
          );
        })()}
      </svg>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, animation: reduced ? undefined : `fadeUp-${uid} .4s ease` }}>
        {/* image + text side-by-side on wider, stacked on narrow (§8.1 — shorter, no mobile scroll) */}
        <div className={`learnrow-${uid}`}>
          <div className={`learnimg-${uid}`} style={{ background: dark ? '#221c30' : 'linear-gradient(180deg,#F4F7FF,#FFF7EF)', borderRadius: 18, padding: '10px 14px', display: 'grid', placeItems: 'center' }}>{mini(card.visual)}</div>
          <div className={`learntext-${uid}`}>
            <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: .6, textTransform: 'uppercase', color: T.accent, background: `${T.accent}1A`, borderRadius: 999, padding: '4px 12px' }}>{card.tag}</span>
            <h3 style={{ fontWeight: 800, fontSize: 19, color: T.ink, margin: 0 }}>{card.title}</h3>
            <p style={{ fontSize: 14, color: T.sub, maxWidth: 440, margin: 0, lineHeight: 1.55 }}>{card.body}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>{LEARN_CARDS.map((_, i) => <button key={i} aria-label={`Card ${i + 1}`} className={`focus-${uid}`} onClick={() => setLearnIdx(i)} style={{ width: i === learnIdx ? 24 : 9, height: 9, borderRadius: 999, border: 'none', cursor: 'pointer', background: i === learnIdx ? T.primary : T.border, transition: 'all .25s' }} />)}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <PillButton T={T} variant="outlined" disabled={learnIdx === 0} onClick={() => setLearnIdx(i => Math.max(0, i - 1))}>Back</PillButton>
          {!last ? <PillButton T={T} onClick={() => setLearnIdx(i => i + 1)}>Next →</PillButton>
            : <PillButton T={T} variant="highlight" onClick={() => changeMode('hands_on')}>Try it yourself →</PillButton>}
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (quizDone) {
      const pass = quizScore >= 3;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, animation: reduced ? undefined : `fadeUp-${uid} .4s ease` }}>
          <div style={{ width: 84, height: 84, borderRadius: '50%', background: pass ? T.green : T.accent, display: 'grid', placeItems: 'center', fontSize: 40, color: '#fff', animation: reduced ? undefined : `pop-${uid} .5s ease` }}>{pass ? '✓' : '🎯'}</div>
          <h3 style={{ fontWeight: 800, fontSize: 22, color: T.ink, margin: 0 }}>{quizScore} / {QUIZ.length}</h3>
          <p style={{ fontSize: 14, color: T.sub, maxWidth: 460, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>{pass ? 'Great work — you know your sedimentation from your decantation!' : 'Good try! Review the Learn tab and give it another go.'}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <PillButton T={T} onClick={() => { setQuizIdx(0); setQuizPick(null); setQuizScore(0); setQuizDone(false); }}>↻ Try again</PillButton>
            <PillButton T={T} variant="highlight" onClick={() => changeMode('hands_on')}>Do the experiment →</PillButton>
          </div>
        </div>
      );
    }
    const Q = QUIZ[quizIdx]; const answered = quizPick !== null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560, margin: '0 auto', animation: reduced ? undefined : `fadeUp-${uid} .4s ease` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700, fontSize: 12, color: T.sub }}>Question {quizIdx + 1} of {QUIZ.length}</span><span style={{ fontWeight: 700, fontSize: 12, color: T.primary }}>Score {quizScore}</span></div>
        <div style={{ height: 6, borderRadius: 999, background: T.border, overflow: 'hidden' }}><div style={{ width: `${((quizIdx + (answered ? 1 : 0)) / QUIZ.length) * 100}%`, height: '100%', background: T.gradient, transition: 'width .3s' }} /></div>
        <h3 style={{ fontWeight: 700, fontSize: 16.5, color: T.ink, margin: 0, lineHeight: 1.4 }}>{Q.q}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Q.options.map((opt, i) => {
            const correct = i === Q.a, chosen = quizPick === i;
            const bd = !answered ? T.border : correct ? T.green : chosen ? T.error : T.border;
            const bg = !answered ? T.surface : correct ? T.greenSoft : chosen ? `${T.error}14` : T.surface;
            return (
              <button key={i} className={`focus-${uid}`} onClick={() => pickQuiz(i)} disabled={answered}
                style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '13px 16px', borderRadius: 14, border: `2px solid ${bd}`, background: bg, cursor: answered ? 'default' : 'pointer', fontFamily: T.font, fontSize: 14, fontWeight: 500, color: T.ink, transition: 'all .2s' }}>
                <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', border: `2px solid ${bd}`, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, color: bd }}>{answered && correct ? '✓' : answered && chosen ? '✕' : String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            );
          })}
        </div>
        {answered && <div style={{ background: T.cream, border: `2px solid ${T.amber}`, borderRadius: 12, padding: '11px 16px' }}><p style={{ margin: 0, fontSize: 13, color: T.amberText, lineHeight: 1.5 }}><strong>{quizPick === Q.a ? 'Correct! ' : 'Answer: '}</strong>{Q.why}</p></div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><PillButton T={T} onClick={nextQuiz} disabled={!answered}>{quizIdx === QUIZ.length - 1 ? 'See score' : 'Next question'} →</PillButton></div>
      </div>
    );
  };

  const renderRealWorld = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600, margin: '0 auto', animation: reduced ? undefined : `fadeUp-${uid} .4s ease` }}>
      <p style={{ fontSize: 13.5, color: T.sub, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>Settling things and pouring off the clear liquid isn't just for tea — we use sedimentation and decantation every day.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
        {REAL_WORLD.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, background: T.surface, border: `2px solid ${T.border}`, borderRadius: 16, padding: '14px 16px', animation: reduced ? undefined : `fadeUp-${uid} .4s ease ${i * 0.06}s both` }}>
            <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, background: `${T.primary}14`, display: 'grid', placeItems: 'center', fontSize: 22 }}>{r.emoji}</div>
            <div><h4 style={{ fontWeight: 700, fontSize: 14.5, color: T.ink, margin: '0 0 3px' }}>{r.title}</h4><p style={{ fontSize: 12.5, color: T.sub, margin: 0, lineHeight: 1.5 }}>{r.body}</p></div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}><PillButton T={T} variant="highlight" onClick={() => changeMode('hands_on')}>Try the tea experiment →</PillButton></div>
    </div>
  );

  /* ─────────────────── shell (§8.1 orientation-aware, no page scroll) ─────────────────── */
  const bigTouch = device === 'smartboard';
  /* Outer wrapper fills the frame and centres the shell (§8.1: fill big frames, never strand top-left).
     If the host pins an explicit width, honour it; otherwise the shell grows to fill up to a wide cap. */
  const shellMax = width ? width : 1600;
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: 'clamp(0px,1.2vw,20px)' }}>
    <div className={`shell-${uid}`} style={{ width: '100%', maxWidth: shellMax, maxHeight: '100svh', margin: '0 auto', display: 'flex', flexDirection: 'column', fontFamily: T.font, background: T.surface, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.16)', position: 'relative', color: T.ink }}>
      {/* header (compact — height matters on the 390px frame) */}
      <div style={{ flex: '0 0 auto', background: T.gradient, padding: '12px 18px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 220px' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(16px,2.4vw,22px)', fontWeight: 800, color: '#fff', lineHeight: 1.15 }}>Settle &amp; Pour Off the Clear Tea</h1>
            <p style={{ margin: '2px 0 0', fontSize: 'clamp(11px,1.4vw,13px)', color: 'rgba(255,255,255,.9)' }}>Sedimentation then decantation — let the leaves settle, then pour off only the clear tea.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {showModeToggle && <ModeToggle mode={op} onChange={setOperatorMode} T={T} uid={uid} big={bigTouch} />}
            <button type="button" className={`focus-${uid}`} onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'} title={muted ? 'Unmute' : 'Mute'} style={{ fontSize: 15, cursor: 'pointer', color: '#fff', background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 999, width: bigTouch ? 34 : 30, height: bigTouch ? 34 : 30, flexShrink: 0 }}>{muted ? '🔇' : '🔊'}</button>
          </div>
        </div>
      </div>

      {/* live region */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{announce}</div>

      {/* §6.1 watch caption — only in ai mode */}
      {isAI && (
        <div role="status" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8, margin: '10px 16px 0', padding: '8px 12px', borderRadius: 12, background: T.lavender, color: T.deep, fontSize: 13, fontWeight: 600 }}>
          <span aria-hidden="true" style={{ fontSize: 17 }}>👩‍🏫</span>Your teacher is showing you this — watch how the leaves settle and the clear tea pours off. You'll get a turn.
        </div>
      )}

      {/* mode tabs — hidden in ai mode (agent drives the experiment) */}
      {!isAI && (
        <div role="tablist" aria-label="Choose a mode" style={{ flex: '0 0 auto', display: 'flex', gap: 6, padding: '8px 14px', background: T.bg, borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap', justifyContent: 'center' }}>
          {MODES.map(m => { const on = mode === m.id; return (
            <button key={m.id} role="tab" aria-selected={on} className={`focus-${uid}`} onClick={() => changeMode(m.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: bigTouch ? 34 : 30, padding: '7px 15px', borderRadius: 999, cursor: 'pointer', fontFamily: T.font, fontWeight: 600, fontSize: 13, background: on ? T.gradient : T.surface, color: on ? '#fff' : T.sub, boxShadow: on ? '0 4px 14px rgba(83,48,134,.28)' : 'none', border: on ? '2px solid transparent' : `1.5px solid ${T.border}`, transition: 'all .2s' }}>
              <span aria-hidden="true">{m.emoji}</span>{m.label}
            </button>
          ); })}
        </div>
      )}

      {/* body — flexes to fill; only this pane may scroll internally in the tightest frame */}
      <div className={`scroll-${uid}`} style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '14px 18px', background: T.surface }}>
        {(isAI || mode === 'hands_on') && renderExperiment()}
        {!isAI && mode === 'learn' && renderLearn()}
        {!isAI && mode === 'practice' && renderQuiz()}
        {!isAI && mode === 'real_world' && renderRealWorld()}
      </div>

      {/* footer */}
      <div style={{ flex: '0 0 auto', background: T.bg, borderTop: `1px solid ${T.border}`, padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: T.sub }}>ℹ️ Sedimentation then decantation</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.primary, background: `${T.lavender}88`, borderRadius: 20, padding: '3px 12px' }}>Class 6 · Kitchen separation</span>
      </div>

      {/* §7.4 full-viewport celebration overlay */}
      {celebrate && <FullScreenCelebration uid={uid} T={T} reduced={reduced} />}
    </div>
    </div>
  );
};

function SedDecTool(p: ToolProps) { return <ToolErrorBoundary><SedDecExperiment {...p} /></ToolErrorBoundary>; }

try { if (typeof window !== 'undefined') (window as any).__TOOL_COMPONENT__ = SedDecTool; } catch (e) {}
export default SedDecTool;
