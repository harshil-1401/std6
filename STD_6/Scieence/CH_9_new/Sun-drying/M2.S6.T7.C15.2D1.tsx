import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================================
   Sun-Drying Salt Drops simulator  ·  toolId M2.S6.T7.C15.2D1
   Class 6 Science, Methods of Separation in Everyday Life. A step-by-step guided
   activity: place drops of salt water on dark paper, choose the salt amount,
   predict, then dry in the sun and watch the water recede and evaporate while an
   irregular white salt crust forms exactly where the drops were.
   Step flow: one step is shown at a time; completing it reveals the next.
   Trials accumulate across "Try another salt amount" re-runs; pressing the
   student-only Finish button ends the activity and emits the uniform
   `finished` event with a star rating + "what you have learned" summary.
   Agent-control: §3 window.postMessage contract.  Deps: react + framer-motion.
   ==========================================================================*/

const TOOL_ID = 'M2.S6.T7.C15.2D1';

const C = {
  primary: '#4A4DC9', orange: '#FF7212', purpleDeep: '#533086', amber: '#FC9145',
  tintP: '#C1C1EA', cream: '#FFF3E4', text: '#1A1A2E', sub: '#4E4E4E',
  border: '#EBEBEB', surface: '#F5F5F5', ok: '#22C55E', bad: '#EF4444',
};

const VB = { w: 1000, h: 620 };
const PAPER = { x: 292, y: 152, w: 416, h: 316 };
const SUN = { cx: 902, cy: 96, r: 44 };
const DRY_MS = 7200;
const SALT_LABEL = ['', 'A little', 'Some', 'A lot'];
const STEP_LABELS = ['Add drops', 'Salt amount', 'Predict', 'Dry it', 'Result'];

type Drop = { id: number; px: number; py: number; seed: number };
type Prediction = 'salt' | 'nothing' | null;
type RoundRecord = { saltAmount: number; prediction: Prediction; correct: boolean };

interface FinishSummary {
  evaluated: true;
  score: number; total: number; stars: number;
  breakdown: { id: string; correct: boolean; chose: Prediction }[];
  interactions: { attempts: number; correctFirstTry: number; hintsUsed: number; itemsExplored: string[]; durationMs: number };
  learned: string[];
}

interface State {
  step: number;                // 0..4
  drops: Drop[];
  saltAmount: number;          // 1..3
  dryProgress: number;         // 0..1
  drying: boolean;
  prediction: Prediction;
  revealForced: boolean;
  operatorMode: 'ai' | 'student';
  darkMode: boolean;
  finished: boolean;
}
interface SunDryAdditionalProps { initialSaltAmount?: number; presetDrops?: { x: number; y: number }[] }

const emit = (m: unknown) => { try { window.parent.postMessage(m, '*'); } catch { /* noop */ } };
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const smooth = (v: number, a: number, b: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function Tool(props: any = {}) {
  const themeColor: string = props?.themeColor || C.primary;
  const showModeToggle: boolean = props?.showModeToggle !== false;
  const device: 'mobile' | 'smartboard' = props?.device === 'smartboard' ? 'smartboard' : 'mobile';
  const ap: SunDryAdditionalProps = props?.additionalProps || {};
  const [st, setSt] = useState<State>(() => ({
    step: 0, drops: [], saltAmount: clamp(Math.round(ap.initialSaltAmount ?? 2), 1, 3),
    dryProgress: 0, drying: false, prediction: null, revealForced: false,
    operatorMode: props?.operatorMode === 'ai' ? 'ai' : 'student',
    darkMode: !!props?.darkMode,
    finished: false,
  }));
  const [hl, setHl] = useState<string | null>(null);
  const [finishSummary, setFinishSummary] = useState<FinishSummary | null>(null);
  const muted = useRef<boolean>(!!props?.muted);
  const dropId = useRef(1);
  const doneFired = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const hlTimer = useRef<number | null>(null);
  const stRef = useRef(st); stRef.current = st;
  const roundsRef = useRef<RoundRecord[]>([]);
  const hintsUsedRef = useRef(0);
  const startTimeRef = useRef<number>(Date.now());

  /* ------------------------------ audio -------------------------------- */
  const actx = useRef<AudioContext | null>(null);
  const ensureCtx = () => {
    if (muted.current) return null;
    if (!actx.current) { try { actx.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; } }
    if (actx.current && actx.current.state === 'suspended') actx.current.resume().catch(() => {});
    return actx.current;
  };
  const tone = (f: number, t0: number, dur: number, type: OscillatorType, g0: number) => {
    const ac = actx.current; if (!ac) return;
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(g0, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  };
  const cue = useCallback((k: 'drop' | 'tick' | 'ui' | 'start' | 'done') => {
    const ac = ensureCtx(); if (!ac) return; const n = ac.currentTime;
    if (k === 'drop') { tone(500, n, 0.12, 'sine', 0.16); }
    else if (k === 'tick') tone(660, n, 0.05, 'triangle', 0.08);
    else if (k === 'ui') tone(430, n, 0.06, 'triangle', 0.09);
    else if (k === 'start') { tone(280, n, 0.6, 'sine', 0.07); }
    else if (k === 'done') { tone(740, n, 0.18, 'sine', 0.10); tone(988, n + 0.12, 0.22, 'sine', 0.08); }
  }, []);

  /* --------------------------- step control ---------------------------- */
  const setStep = useCallback((n: number) => {
    setSt((s) => { const step = clamp(n, 0, 4); if (step === s.step) return s; emit({ type: 'event', name: 'step_changed', detail: { step, label: STEP_LABELS[step] } }); return { ...s, step }; });
  }, []);

  /* --------------------------- drying loop ----------------------------- */
  useEffect(() => {
    if (!st.drying) return;
    let raf = 0; let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last; last = now;
      setSt((s) => { if (!s.drying) return s; const dp = Math.min(1, s.dryProgress + dt / DRY_MS); return { ...s, dryProgress: dp, drying: dp < 1 }; });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [st.drying]);

  /* completion (fire once per trial) */
  useEffect(() => {
    if (st.dryProgress >= 1 && !doneFired.current) {
      doneFired.current = true; cue('done');
      setStep(4);
      const correct = st.prediction === 'salt';
      roundsRef.current = [...roundsRef.current, { saltAmount: st.saltAmount, prediction: st.prediction, correct }];
      emit({ type: 'event', name: 'completed', detail: { correct, saltAmount: st.saltAmount, patches: st.drops.length } });
    }
  }, [st.dryProgress, st.prediction, st.saltAmount, st.drops.length, cue, setStep]);

  /* ----------------------------- actions ------------------------------- */
  const placeDrop = useCallback((px: number, py: number) => {
    setSt((s) => {
      if (s.step !== 0 || s.drying || s.drops.length >= 8) return s;
      const d: Drop = { id: dropId.current++, px: clamp(px, 10, 90), py: clamp(py, 12, 88), seed: Math.random() };
      emit({ type: 'event', name: 'drop_added', detail: { count: s.drops.length + 1 } });
      return { ...s, drops: [...s.drops, d] };
    });
    cue('drop');
  }, [cue]);

  const setSalt = useCallback((v: number) => {
    const amt = clamp(Math.round(v), 1, 3);
    setSt((s) => (s.saltAmount === amt ? s : { ...s, saltAmount: amt }));
    emit({ type: 'event', name: 'salt_changed', detail: { saltAmount: amt } }); cue('tick');
  }, [cue]);

  const commit = useCallback((choice: Prediction) => {
    if (choice !== 'salt' && choice !== 'nothing') return;
    setSt((s) => ({ ...s, prediction: choice }));
    emit({ type: 'event', name: 'prediction_made', detail: { prediction: choice } }); cue('ui');
  }, [cue]);

  const startDry = useCallback(() => {
    setSt((s) => { if (s.drops.length === 0 || s.prediction === null || s.dryProgress >= 1) return s; return { ...s, step: 3, drying: true, revealForced: true }; });
    emit({ type: 'event', name: 'drying_started', detail: {} }); cue('start');
  }, [cue]);

  const pauseDry = useCallback(() => {
    setSt((s) => (s.drying ? { ...s, drying: false } : s));
    emit({ type: 'event', name: 'drying_paused', detail: {} });
  }, []);

  const setDry = useCallback((v: number) => {
    const dp = clamp(v, 0, 1); if (dp < 1) doneFired.current = false;
    setSt((s) => ({ ...s, dryProgress: dp, drying: false, revealForced: true, step: dp >= 1 ? 4 : s.step }));
    emit({ type: 'event', name: 'drying_progress', detail: { dryProgress: dp } });
  }, []);

  const next = useCallback(() => {
    setSt((s) => {
      let step = s.step;
      if (s.step === 0 && s.drops.length >= 5) step = 1;
      else if (s.step === 1) step = 2;
      else if (s.step === 2 && s.prediction !== null) step = 3;
      if (step !== s.step) emit({ type: 'event', name: 'step_changed', detail: { step, label: STEP_LABELS[step] } });
      return { ...s, step };
    });
  }, []);
  const back = useCallback(() => setStep(Math.max(0, Math.min(stRef.current.step, 3) - 1)), [setStep]);

  const reset = useCallback(() => {
    doneFired.current = false;
    roundsRef.current = []; hintsUsedRef.current = 0; startTimeRef.current = Date.now();
    setFinishSummary(null);
    setSt((s) => ({ ...s, step: 0, drops: [], saltAmount: 2, dryProgress: 0, drying: false, prediction: null, revealForced: false, finished: false }));
    emit({ type: 'event', name: 'reset', detail: {} }); cue('ui');
  }, [cue]);

  const doHighlight = useCallback((target: string) => {
    setHl(target);
    hintsUsedRef.current += 1;
    if (hlTimer.current) window.clearTimeout(hlTimer.current);
    hlTimer.current = window.setTimeout(() => setHl(null), 2600);
    emit({ type: 'event', name: 'highlight', detail: { target } });
  }, []);

  /* ── another trial: re-run with a different salt amount, keeping the same drops (§6.3 — a
     localized "try this one again", NOT a whole-tool replay) ── */
  const tryAnother = useCallback(() => {
    doneFired.current = false;
    setSt((s) => ({ ...s, step: 1, prediction: null, dryProgress: 0, drying: false, revealForced: false }));
    emit({ type: 'event', name: 'step_changed', detail: { step: 1, label: STEP_LABELS[1] } });
    cue('ui');
  }, [cue]);

  /* ── the uniform Finish button — student mode only, ends the activity (§6.3) ── */
  const doFinish = useCallback(() => {
    if (stRef.current.finished) return; // idempotent-safe
    const rounds = roundsRef.current;
    const total = rounds.length || 1;
    const score = rounds.filter((r) => r.correct).length;
    const stars = rounds.length === 0 ? 0 : score === rounds.length ? 3 : score >= Math.ceil(rounds.length / 2) ? 2 : 1;
    const detail: FinishSummary = {
      evaluated: true,
      score, total: rounds.length || total,
      stars,
      breakdown: rounds.map((r, i) => ({ id: `trial${i + 1}_amount${r.saltAmount}`, correct: r.correct, chose: r.prediction })),
      interactions: {
        attempts: rounds.length,
        correctFirstTry: rounds[0]?.correct ? 1 : 0,
        hintsUsed: hintsUsedRef.current,
        itemsExplored: Array.from(new Set(rounds.map((r) => `salt${r.saltAmount}`))),
        durationMs: Date.now() - startTimeRef.current,
      },
      learned: [
        'Only the water in salt water can evaporate — it turns into vapour and leaves the paper.',
        'The dissolved salt cannot evaporate, so it stays behind as a small white residue.',
        'Evaporation can separate a solid that is dissolved in a liquid.',
      ],
    };
    setFinishSummary(detail);
    setSt((s) => ({ ...s, finished: true }));
    cue('done');
    emit({ type: 'event', name: 'finished', detail });
  }, [cue]);

  const setMode = useCallback((m: string) => {
    const mode: 'ai' | 'student' = m === 'ai' ? 'ai' : 'student';
    setSt((s) => (s.operatorMode === mode ? s : { ...s, operatorMode: mode }));
    emit({ type: 'event', name: 'operator_mode_changed', detail: { operatorMode: mode, depth: mode === 'ai' ? 'lean' : 'full' } });
  }, []);

  const getState = useCallback(() => {
    const s = stRef.current;
    const depth = s.operatorMode === 'ai' ? 'lean' : 'full';
    const state = {
      ...s, stepLabel: STEP_LABELS[s.step], depth, stepCount: s.operatorMode === 'ai' ? 0 : STEP_LABELS.length,
      waterRemaining: 1 - ease(s.dryProgress), saltPatchesVisible: s.dryProgress > 0.4,
      correct: s.dryProgress >= 1 ? s.prediction === 'salt' : null, muted: muted.current,
      roundsCount: roundsRef.current.length, correctRounds: roundsRef.current.filter((r) => r.correct).length,
      hintsUsed: hintsUsedRef.current, finishSummary,
    };
    emit({ type: 'state', state });
    return state;
  }, [finishSummary]);

  /* ------------------------- agent API + listener ---------------------- */
  const api = {
    setParam: (n: string, v: any) => { if (n === 'muted') muted.current = !!v; else if (n === 'darkMode') setSt((s) => ({ ...s, darkMode: !!v })); else if (n === 'operatorMode') setMode(v); else if (n === 'saltAmount') setSalt(Number(v)); else if (n === 'dryProgress') setDry(Number(v)); },
    play: startDry, pause: pauseDry, reset, highlight: doHighlight, getState,
    setOperatorMode: setMode, next, back,
    addDrop: (x?: number, y?: number) => placeDrop(typeof x === 'number' ? x : 22 + Math.random() * 56, typeof y === 'number' ? y : 22 + Math.random() * 56),
    setDryProgress: (v: number) => setDry(Number(v)),
    setSalt: (v: number) => setSalt(Number(v)),
    commitPrediction: (choice: string) => commit(choice as Prediction),
    tryAnother,
    finish: doFinish,
  };
  const apiRef = useRef(api); apiRef.current = api;

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data; if (!d || d.type !== 'command') return;
      const fn = (apiRef.current as any)[d.method]; let result: any;
      try { if (typeof fn === 'function') result = fn(...(d.args || [])); } catch { /* never throw */ }
      if (d.id) emit({ type: 'response', id: d.id, result });
    };
    window.addEventListener('message', onMsg);
    emit({ type: 'ready', toolId: TOOL_ID });
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    if (Array.isArray(ap.presetDrops) && ap.presetDrops.length && stRef.current.drops.length === 0) {
      ap.presetDrops.slice(0, 8).forEach((p) => placeDrop(Number(p.x), Number(p.y)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ap.presetDrops]);

  /* keep in sync if the host changes the mode via props after mount (§6.1) */
  useEffect(() => {
    if (props.operatorMode && props.operatorMode !== stRef.current.operatorMode) setMode(props.operatorMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.operatorMode]);

  /* --------------------------- pointer -> drop ------------------------- */
  const onPaperDown = (e: React.PointerEvent) => {
    if (stRef.current.step !== 0) return;
    const svg = svgRef.current; if (!svg) return;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const loc = p.matrixTransform(ctm.inverse());
    const px = ((loc.x - PAPER.x) / PAPER.w) * 100;
    const py = ((loc.y - PAPER.y) / PAPER.h) * 100;
    if (px < -4 || px > 104 || py < -4 || py > 104) return;
    placeDrop(px, py);
  };

  /* ------------------------------ render ------------------------------- */
  const isAI = st.operatorMode === 'ai';
  const ep = ease(st.dryProgress);
  const patchReveal = st.revealForced || st.prediction !== null;
  const waterLeft = 1 - smooth(ep, 0.04, 0.96);
  const heat = st.drying ? 1 : (st.dryProgress > 0 && st.dryProgress < 1 ? 0.5 : 0);
  const correct = st.dryProgress >= 1 ? st.prediction === 'salt' : null;
  const dsx = (d: Drop) => PAPER.x + (d.px / 100) * PAPER.w;
  const dsy = (d: Drop) => PAPER.y + (d.py / 100) * PAPER.h;
  const glow = (t: string) => (hl === t ? { boxShadow: `0 0 0 3px ${C.orange}, 0 0 16px 3px ${C.orange}66`, borderRadius: 16 } : undefined);

  return (
    <div className={`sd-root ${st.darkMode ? 'dark' : ''}`} data-device={device} style={{ ['--tc' as any]: themeColor }}>
      <style>{CSS}</style>

      {/* ============ SCENE ============ */}
      <motion.section className="sd-scene" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
        <div className="sd-head">
          <span className="sd-badge">☀️ Evaporation lab</span>
          <h1>Sun-Drying Salt Drops</h1>
          {showModeToggle && <ModeToggle mode={st.operatorMode} onChange={setMode} glowStyle={glow('modeToggle')} />}
        </div>

        <div className="sd-stage">
          <svg ref={svgRef} viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="xMidYMid meet" className="sd-svg">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FBF6EE" /><stop offset="1" stopColor="#EFEAFA" /></linearGradient>
              <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ECD8B4" /><stop offset="1" stopColor="#D9BE93" /></linearGradient>
              <linearGradient id="paperG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#252A47" /><stop offset="1" stopColor="#151830" /></linearGradient>
              <radialGradient id="dropBody" cx="0.42" cy="0.36" r="0.66"><stop offset="0" stopColor="#3B4270" /><stop offset="0.5" stopColor="#1B2040" /><stop offset="1" stopColor="#0D1027" /></radialGradient>
              <radialGradient id="dropCaustic" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#CFE3FF" stopOpacity="0.9" /><stop offset="1" stopColor="#CFE3FF" stopOpacity="0" /></radialGradient>
              <radialGradient id="sunG" cx="0.42" cy="0.4" r="0.62"><stop offset="0" stopColor="#FFF6C8" /><stop offset="0.4" stopColor="#FFD24D" /><stop offset="0.78" stopColor="#FBA23F" /><stop offset="1" stopColor="#EF8A22" /></radialGradient>
              <radialGradient id="rayG" gradientUnits="userSpaceOnUse" cx={SUN.cx} cy={SUN.cy} r={SUN.r + 40}><stop offset="0.45" stopColor="#FFCB5B" /><stop offset="1" stopColor="#F5981F" /></radialGradient>
              <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FFD87A" stopOpacity="0.55" /><stop offset="1" stopColor="#FFD87A" stopOpacity="0" /></radialGradient>
              <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="-6" dy="9" stdDeviation="13" floodColor="#5b4a2a" floodOpacity="0.34" /></filter>
              <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" result="n" /><feColorMatrix in="n" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.045 0" /></filter>
              <filter id="chalk" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.9" /></filter>
              <filter id="chalkSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6" /></filter>
              <filter id="steam" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.4" /></filter>
            </defs>

            {/* wall */}
            {/* top-down wooden floor (plate lies flat on it) */}
            {Array.from({ length: 8 }).map((_, i) => (<rect key={`pl${i}`} x="0" y={i * (VB.h / 8)} width={VB.w} height={VB.h / 8} fill={i % 2 ? '#E4CDA2' : '#ECD8B4'} />))}
            <g stroke="#C6A97C" strokeWidth="2" strokeOpacity="0.55">
              {Array.from({ length: 9 }).map((_, i) => (<line key={`s${i}`} x1="0" y1={i * (VB.h / 8)} x2={VB.w} y2={i * (VB.h / 8)} />))}
            </g>
            <g stroke="#C6A97C" strokeWidth="1.5" strokeOpacity="0.4">
              {Array.from({ length: 8 }).flatMap((_, r) => { const y0 = r * (VB.h / 8); const off = (r % 2) * 170; return [0, 1, 2].map((c) => { const x = off + c * 340; return <line key={`j${r}-${c}`} x1={x} y1={y0} x2={x} y2={y0 + VB.h / 8} />; }); })}
            </g>
            {/* warm sunlight wash coming in from the sun corner */}
            <ellipse cx={820} cy={110} rx={360} ry={240} fill="url(#sunGlow)" opacity={heat > 0 ? 0.5 : 0.28} className={heat > 0 ? 'sun-warm' : ''} />

            {/* sun — a warm textbook sunburst (light source) */}
            <g style={glow('sun') ? { filter: `drop-shadow(0 0 12px ${C.orange})` } : undefined}>
              <circle cx={SUN.cx} cy={SUN.cy} r={SUN.r + 44} fill="url(#sunGlow)" className={heat > 0 ? 'sun-warm' : ''} opacity={heat > 0 ? 0.85 : 0.5} />
              <g fill="url(#rayG)" stroke="url(#rayG)" strokeWidth="2.5" strokeLinejoin="round" opacity="0.95">
                {Array.from({ length: 12 }).flatMap((_, i) => [
                  sunRay(SUN.cx, SUN.cy, (i / 12) * Math.PI * 2, SUN.r + 1, SUN.r + 36, 0.12, `L${i}`),
                  sunRay(SUN.cx, SUN.cy, ((i + 0.5) / 12) * Math.PI * 2, SUN.r + 1, SUN.r + 22, 0.085, `S${i}`),
                ])}
              </g>
              <circle cx={SUN.cx} cy={SUN.cy} r={SUN.r} fill="url(#sunG)" stroke="#F3971E" strokeOpacity="0.4" strokeWidth="1.5" />
              <ellipse cx={SUN.cx - SUN.r * 0.32} cy={SUN.cy - SUN.r * 0.34} rx={SUN.r * 0.44} ry={SUN.r * 0.3} fill="#FFF7D6" opacity="0.5" />
            </g>

            {/* salt-water source bowl */}
            <g transform="translate(150 548)">
              <ellipse cx="0" cy="0" rx="66" ry="18" fill="#C7CDD6" />
              <path d="M -66 0 Q 0 42 66 0 L 56 4 Q 0 36 -56 4 Z" fill="#AEB6C2" />
              <ellipse cx="0" cy="-1" rx="54" ry="12" fill="#BFE3FF" opacity="0.9" />
              <ellipse cx="0" cy="-2" rx="54" ry="12" fill="none" stroke="#8FD3FF" strokeWidth="2" opacity="0.55" />
              <text x="0" y="42" textAnchor="middle" fontSize="17" fontWeight={700} fill={C.sub}>salt water</text>
            </g>

            {/* dark paper */}
            <g style={glow('paper') ? { filter: `drop-shadow(0 0 12px ${C.orange})` } : undefined}>
              <rect x={PAPER.x} y={PAPER.y} width={PAPER.w} height={PAPER.h} rx="14" fill="url(#paperG)" filter="url(#soft)" />
              <rect x={PAPER.x} y={PAPER.y} width={PAPER.w} height={PAPER.h} rx="14" fill="url(#paperG)" />
              <rect x={PAPER.x} y={PAPER.y} width={PAPER.w} height={PAPER.h} rx="14" filter="url(#grain)" opacity="0.85" />
              <rect x={PAPER.x + 6} y={PAPER.y + 6} width={PAPER.w - 12} height={PAPER.h - 12} rx="10" fill="none" stroke="#fff" strokeOpacity="0.05" strokeWidth="2" />

              {/* drops -> natural evaporation -> salt crust */}
              {st.drops.map((d) => {
                const cx = dsx(d), cy = dsy(d);
                const dropR = 21 + d.seed * 6;                              // water footprint — a drop is a drop
                const saltR = dropR * (0.2 + st.saltAmount * 0.085);        // only the dissolved salt is left: a small residue
                const recede = smooth(ep, 0.08, 0.82);                      // water concentrates inward as it evaporates
                const wetR = dropR * (1 - 0.72 * recede);
                const wetOp = 1 - smooth(ep, 0.5, 0.86);                    // water stays, then dries off
                const bright = 0.78 + st.saltAmount * 0.06;
                const saltAppear = patchReveal ? smooth(ep, 0.62, 1) : 0;  // small crust appears once the water has gone
                const grow = 0.5 + 0.5 * saltAppear;
                return (
                  <g key={d.id} style={hl === 'drops' || hl === 'patches' ? { filter: `drop-shadow(0 0 7px ${C.orange})` } : undefined}>
                    {/* salt-water droplet resting on the paper */}
                    {wetOp > 0.02 && (
                      <g opacity={wetOp}>
                        <ellipse cx={cx} cy={cy + wetR * 0.68} rx={wetR * 1.06} ry={wetR * 0.32} fill="#070912" opacity={0.5} filter="url(#chalkSoft)" />
                        <ellipse cx={cx} cy={cy} rx={wetR} ry={wetR * 0.9} fill="url(#dropBody)" />
                        <ellipse cx={cx} cy={cy} rx={wetR} ry={wetR * 0.9} fill="none" stroke="#9fb4e8" strokeWidth={1.2} opacity={0.32} />
                        <ellipse cx={cx} cy={cy + wetR * 0.34} rx={wetR * 0.58} ry={wetR * 0.27} fill="url(#dropCaustic)" />
                        <ellipse cx={cx - wetR * 0.33} cy={cy - wetR * 0.42} rx={wetR * 0.3} ry={wetR * 0.17} fill="#ffffff" opacity={0.9} transform={`rotate(-30 ${(cx - wetR * 0.33).toFixed(1)} ${(cy - wetR * 0.42).toFixed(1)})`} />
                        <circle cx={cx - wetR * 0.16} cy={cy - wetR * 0.54} r={Math.max(1.4, wetR * 0.09)} fill="#ffffff" />
                      </g>
                    )}
                    {/* small chalky salt residue left where the drop dried */}
                    <g transform={`translate(${cx} ${cy}) scale(${grow.toFixed(3)})`}>
                      <path d={blob(d.seed + 1, saltR * 1.3)} fill="#D9E4FF" opacity={saltAppear * 0.28 * bright} filter="url(#chalkSoft)" />
                      <path d={blob(d.seed, saltR)} fill="#EFF4FF" opacity={saltAppear * bright} filter="url(#chalk)" />
                      <path d={blob(d.seed + 5, saltR * 0.5)} fill="#FFFFFF" opacity={saltAppear * 0.6 * bright} filter="url(#chalk)" />
                      {grains(d.seed).slice(0, 4).map((s, i) => (<circle key={i} cx={s.x * saltR} cy={s.y * saltR * 0.82} r={1} fill="#ffffff" opacity={saltAppear * 0.5} />))}
                    </g>
                    {/* rising vapour while the drop evaporates */}
                    {heat > 0 && wetOp > 0.1 && [0, 1, 2].map((k) => { const bx = cx + (k - 1) * 5; const by = cy - wetR * 0.5; const sway = k === 1 ? 0 : (k === 0 ? -6 : 6); return (<path key={`v${k}`} className="steam" style={{ animationDelay: `${((d.seed * 2 + k * 0.55) % 1.9).toFixed(2)}s` }} d={`M ${bx.toFixed(1)} ${by.toFixed(1)} q ${sway} -11 0 -22 q ${-sway} -11 0 -22`} fill="none" stroke="#EAF0FF" strokeWidth="2.2" strokeLinecap="round" opacity="0" filter="url(#steam)" />); })}
                  </g>
                );
              })}

              {/* step-0 hint */}
              {st.drops.length === 0 && st.step === 0 && (
                <g opacity="0.92"><text x={PAPER.x + PAPER.w / 2} y={PAPER.y + PAPER.h / 2 - 4} textAnchor="middle" fontSize="22" fontWeight={700} fill="#EAF0FF">Tap here 👆</text><text x={PAPER.x + PAPER.w / 2} y={PAPER.y + PAPER.h / 2 + 24} textAnchor="middle" fontSize="15" fill="#B9C2E6">to add drops of salt water</text></g>
              )}

              {/* hit rect (only active in step 0) */}
              <rect x={PAPER.x} y={PAPER.y} width={PAPER.w} height={PAPER.h} rx="14" fill="transparent" style={{ cursor: st.step === 0 ? 'crosshair' : 'default' }} onPointerDown={onPaperDown} />
            </g>

            {/* water / salt read-out */}
            <g transform="translate(26 150)">
              <rect x="0" y="0" width="222" height="108" rx="16" fill="#fff" opacity="0.94" />
              <text x="16" y="28" fontSize="15" fontWeight={700} fill={C.sub}>What is leaving?</text>
              <text x="16" y="58" fontSize="14" fill={C.text}>💧 Water</text>
              <rect x="84" y="47" width="122" height="12" rx="6" fill={C.border} />
              <rect x="84" y="47" width={122 * clamp(waterLeft, 0, 1)} height="12" rx="6" fill="#4FA8F5" style={{ transition: 'width .12s linear' }} />
              <text x="16" y="90" fontSize="14" fill={C.text}>🧂 Salt</text>
              <rect x="84" y="79" width="122" height="12" rx="6" fill={C.border} />
              <rect x="84" y="79" width="122" height="12" rx="6" fill={C.orange} />
            </g>
          </svg>

          {isAI && <div className="sd-watch">👩‍🏫 Your teacher is running <b>{STEP_LABELS[st.step]}</b> — watch what stays on the paper.</div>}
        </div>
      </motion.section>

      {/* ============ WIZARD (student) ============ */}
      {!isAI && (
        <motion.aside className="sd-panel" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.08 }}>
          {/* progress rail */}
          <div className="sd-rail">
            {STEP_LABELS.map((lb, i) => (
              <div key={i} className={`sd-node ${i === st.step ? 'on' : ''} ${i < st.step ? 'done' : ''}`}>
                <span className="dot">{i < st.step ? '✓' : i + 1}</span><em>{lb}</em>
              </div>
            ))}
          </div>

          {/* one step card at a time, springy transition between steps */}
          <AnimatePresence mode="wait">
          <motion.div className="sd-cardwrap" key={st.step}
            initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}>
            {st.step === 0 && (
              <div className="sd-card">
                <div className="sd-lbl">Step 1 · Add the salt-water drops</div>
                <p className="sd-p">Tap the dark paper to place <b>5 to 8</b> drops of salt water.</p>
                <div className="sd-count">Drops placed: <b>{st.drops.length}</b> <span>/ 8</span></div>
                {st.drops.length < 5 && <p className="sd-hint">Add at least 5 drops to continue ({5 - st.drops.length} more).</p>}
                <div className="sd-nav"><span /><button className="sd-btn primary" disabled={st.drops.length < 5} style={glow('next')} onClick={next}>Next →</button></div>
              </div>
            )}
            {st.step === 1 && (
              <div className="sd-card">
                <div className="sd-lbl">Step 2 · How much salt is dissolved?</div>
                <SaltSlider value={st.saltAmount} onChange={setSalt} hl={hl === 'saltSlider'} />
                <p className="sd-hint">More salt → a bigger, brighter white patch when it dries.</p>
                <div className="sd-nav"><button className="sd-btn ghost" onClick={back}>← Back</button><button className="sd-btn primary" style={glow('next')} onClick={next}>Next →</button></div>
              </div>
            )}
            {st.step === 2 && (
              <div className="sd-card">
                <div className="sd-lbl">Step 3 · Predict — what stays after the water dries?</div>
                <div className="sd-choices">
                  <button className={`sd-choice ${st.prediction === 'salt' ? 'sel' : ''}`} style={glow('predict')} onClick={() => commit('salt')}>🧂<br />Salt patches stay</button>
                  <button className={`sd-choice ${st.prediction === 'nothing' ? 'sel' : ''}`} onClick={() => commit('nothing')}>✨<br />Nothing — clean paper</button>
                </div>
                <div className="sd-nav"><button className="sd-btn ghost" onClick={back}>← Back</button><button className="sd-btn primary" disabled={st.prediction === null} style={glow('next')} onClick={next}>Next →</button></div>
              </div>
            )}
            {st.step === 3 && (
              <div className="sd-card">
                <div className="sd-lbl">Step 4 · Dry it in the sun</div>
                {!st.drying && st.dryProgress < 1 && <button className="sd-btn primary big" style={glow('dryButton')} onClick={startDry}>☀️ Start drying</button>}
                {st.drying && <button className="sd-btn ghost big" onClick={pauseDry}>⏸ Pause</button>}
                {(st.drying || st.dryProgress > 0) && (
                  <div className="sd-progress"><div className="sd-meter"><span className="fill" style={{ width: `${Math.round(st.dryProgress * 100)}%` }} /></div><span className="pct">{Math.round(st.dryProgress * 100)}%</span></div>
                )}
                <p className="sd-hint">Watch closely: the water slowly recedes and turns to vapour.</p>
                {!st.drying && st.dryProgress === 0 && <div className="sd-nav"><button className="sd-btn ghost" onClick={back}>← Back</button><span /></div>}
              </div>
            )}
            {st.step === 4 && (
              <div className={`sd-card result ${correct ? 'good' : 'note'}`}>
                <div className="sd-lbl">Result</div>
                <p className="sd-result">{correct ? '⭐ You predicted it! ' : '✨ Surprise! '}The water floated away as <b>vapour</b>, and the <b>salt stayed behind</b> as white patches — exactly where each drop was.</p>
                <p className="sd-hint">Only the water can evaporate; the dissolved salt cannot, so it is left behind. That is <b>evaporation</b>.</p>
                <div className="sd-nav">
                  <button className="sd-btn ghost" onClick={tryAnother}>🧂 Try another salt amount</button>
                  <button className="sd-btn primary" style={glow('finishButton')} onClick={doFinish}>✓ Finish</button>
                </div>
              </div>
            )}
          </motion.div>
          </AnimatePresence>

          <div className="sd-footer">
            <button className="sd-mini" onClick={() => { muted.current = !muted.current; setSt((s) => ({ ...s })); }}>{muted.current ? '🔇 Muted' : '🔊 Sound'}</button>
          </div>
        </motion.aside>
      )}

      {/* ============ FINISH SCREEN (§6.3) — full-viewport celebratory overlay, evaluating tool → stars + "What you have learned" ============ */}
      <AnimatePresence>
        {st.finished && finishSummary && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(26,16,40,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}
          >
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {Array.from({ length: finishSummary.stars > 0 ? 46 : 22 }).map((_, i) => {
                const colors = [C.primary, C.orange, C.amber, C.tintP, C.purpleDeep, C.ok];
                return <span key={i} className="sd-confetti" style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDuration: `${1.8 + (i % 5) * 0.3}s`, animationDelay: `${(i % 9) * 0.1}s` }} />;
              })}
            </div>
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{ background: '#fff', borderRadius: 24, padding: 28, maxWidth: 420, width: '100%', maxHeight: '86dvh', overflowY: 'auto', textAlign: 'center', boxShadow: '0 30px 70px -12px rgba(0,0,0,0.5)', position: 'relative', zIndex: 301, boxSizing: 'border-box' }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
                style={{ width: 72, height: 72, margin: '0 auto 12px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>
                ☀️
              </motion.div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} initial={{ scale: 0, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.25 + i * 0.15 }}
                    style={{ fontSize: 30, filter: i < finishSummary.stars ? 'none' : 'grayscale(1) opacity(0.35)' }}>⭐</motion.span>
                ))}
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 800, color: C.purpleDeep, fontFamily: 'inherit' }}>Drying complete!</h3>
              <p style={{ margin: '0 0 14px', fontSize: 14.5, color: C.sub, lineHeight: 1.5 }}>
                {finishSummary.score} of {finishSummary.total} prediction{finishSummary.total === 1 ? '' : 's'} correct — {finishSummary.stars === 3 ? 'a perfect run of evaporation trials!' : finishSummary.stars >= 2 ? 'solid work, keep noticing the pattern!' : 'a good first experiment — watch the water vs. the salt next time.'}
              </p>
              <div style={{ background: C.cream, borderRadius: 16, padding: '14px 16px', textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: C.purpleDeep, marginBottom: 8 }}>🌟 What you have learned</div>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {finishSummary.learned.map((l, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12 }}
                      style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{l}</motion.li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: 16, fontSize: 12, color: C.sub, fontWeight: 600 }}>Session complete — your teacher will continue from here.</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------- sub-components ---------------------------- */
/* real two-segment Teacher|Student toggle (§6.1) — both options always visible, one highlighted */
function ModeToggle({ mode, onChange, glowStyle }: { mode: 'ai' | 'student'; onChange: (m: 'ai' | 'student') => void; glowStyle?: React.CSSProperties }) {
  return (
    <div className="sd-toggle" style={glowStyle} role="tablist" aria-label="Teacher or student mode">
      {(['ai', 'student'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          className={`sd-toggle-opt ${mode === m ? 'on' : ''}`}
          onClick={() => onChange(m)}
        >
          {m === 'ai' ? '\u{1F469}‍\u{1F3EB} Teacher' : '\u{1F64B} Your turn'}
        </button>
      ))}
    </div>
  );
}

function SaltSlider({ value, onChange, hl }: { value: number; onChange: (v: number) => void; hl?: boolean }) {
  return (
    <div className="salt-seg" style={hl ? { boxShadow: `0 0 0 3px ${C.orange}`, borderRadius: 18 } : undefined}>
      {[1, 2, 3].map((s) => (
        <button key={s} className={`salt-opt ${value === s ? 'on' : ''}`} onClick={() => onChange(s)} aria-label={SALT_LABEL[s]}>
          <span className="spoons">{'🥄'.repeat(s)}</span>
          <span className="opt-name">{SALT_LABEL[s]}</span>
        </button>
      ))}
    </div>
  );
}

/* smooth, gently-irregular closed blob (Catmull-Rom -> cubic bezier) — a rounded
   chalky salt patch, never a spiky star */
function blob(seed: number, r: number): string {
  const n = 8; const p: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wob = 0.84 + (Math.sin(seed * 12.9 + i * 2.7) * 0.5 + 0.5) * 0.16; // small, rounded
    p.push([Math.cos(a) * r * wob, Math.sin(a) * r * wob * 0.9]);
  }
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}
function grains(seed: number) {
  return Array.from({ length: 6 }).map((_, i) => ({ x: Math.cos(seed * 7 + i * 2.3) * 0.62, y: Math.sin(seed * 5 + i * 1.7) * 0.6 }));
}
function sunRay(cx: number, cy: number, a: number, r1: number, r2: number, hw: number, key: string) {
  const b1x = cx + Math.cos(a - hw) * r1, b1y = cy + Math.sin(a - hw) * r1;
  const b2x = cx + Math.cos(a + hw) * r1, b2y = cy + Math.sin(a + hw) * r1;
  const tx = cx + Math.cos(a) * r2, ty = cy + Math.sin(a) * r2;
  return <path key={key} d={`M ${b1x.toFixed(1)} ${b1y.toFixed(1)} L ${tx.toFixed(1)} ${ty.toFixed(1)} L ${b2x.toFixed(1)} ${b2y.toFixed(1)} Z`} />;
}

/* -------------------------------- styles -------------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
.sd-root{--tc:${C.primary};font-family:'Poppins',system-ui,sans-serif;color:${C.text};width:100%;height:100dvh;max-width:3840px;max-height:2160px;margin:0 auto;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:14px;background:radial-gradient(1200px 700px at 80% -10%,#FFF3E4,#EDE8FB 55%,#E6E1F7);overflow:hidden}
*,*::before,*::after{box-sizing:border-box}
.sd-scene{display:flex;flex-direction:column;min-height:0;width:100%;max-width:860px;flex:0 0 auto}
.sd-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px}
.sd-head h1{font-size:clamp(17px,2.3vw,25px);font-weight:800;margin:0;background:linear-gradient(90deg,${C.purpleDeep},${C.amber});-webkit-background-clip:text;background-clip:text;color:transparent}
.sd-badge{font-size:12px;font-weight:700;color:${C.purpleDeep};background:#fff;border:1.5px solid ${C.tintP};padding:5px 12px;border-radius:20px}
.sd-toggle{margin-left:auto;display:inline-flex;gap:4px;padding:4px;border-radius:14px;background:${C.surface};border:1.5px solid ${C.border};transition:box-shadow .18s ease}
.sd-toggle-opt{font-family:inherit;font-weight:700;font-size:12px;border:none;border-radius:10px;padding:6px 13px;cursor:pointer;background:transparent;color:${C.sub};transition:background .16s ease,color .16s ease,transform .12s ease;white-space:nowrap;min-height:32px}
.sd-toggle-opt:hover{background:#fff;color:${C.primary}}
.sd-toggle-opt:active{transform:scale(.95)}
.sd-toggle-opt:focus-visible{outline:2px solid ${C.orange};outline-offset:2px}
.sd-toggle-opt.on{background:linear-gradient(135deg,${C.purpleDeep},${C.primary});color:#fff;box-shadow:0 4px 10px ${C.primary}44}
.sd-stage{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
.sd-svg{width:100%;height:100%;max-height:40dvh;display:block}
.sd-watch{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:#fff;border:1.5px solid ${C.amber};color:${C.purpleDeep};font-weight:600;font-size:14px;padding:10px 16px;border-radius:16px;box-shadow:0 8px 24px #4a2e7a22;max-width:88%;text-align:center}
.sun-warm{animation:warm 3.4s ease-in-out infinite}
@keyframes warm{0%,100%{opacity:.6}50%{opacity:1}}
.steam{animation:steam 2.5s ease-out infinite}
@keyframes steam{0%{opacity:0;transform:translateY(10px)}22%{opacity:.24}70%{opacity:.14;transform:translateY(-22px)}100%{opacity:0;transform:translateY(-44px)}}

/* wizard */
.sd-panel{display:flex;flex-direction:column;gap:10px;min-height:0;width:100%;max-width:640px;flex:0 1 auto;overflow:hidden}
.sd-rail{display:flex;align-items:center;gap:4px;background:#fff;border:1.5px solid ${C.border};border-radius:16px;padding:6px 8px}
.sd-node{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;opacity:.5;transition:.2s}
.sd-node .dot{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;background:${C.surface};border:2px solid ${C.border};color:${C.sub}}
.sd-node em{font-style:normal;font-size:10px;font-weight:600;color:${C.sub}}
.sd-node.on{opacity:1}.sd-node.on .dot{background:${C.primary};border-color:${C.primary};color:#fff;box-shadow:0 4px 10px ${C.primary}55}
.sd-node.done{opacity:1}.sd-node.done .dot{background:${C.ok};border-color:${C.ok};color:#fff}
.sd-cardwrap{animation:stepIn .32s ease}
@keyframes stepIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.sd-card{background:#fff;border:1.5px solid ${C.border};border-radius:18px;padding:13px 16px;box-shadow:0 8px 22px #4a2e7a12}
.sd-card.result.good{border-color:${C.ok};background:linear-gradient(180deg,#fff,#F2FBF5)}
.sd-card.result.note{border-color:${C.amber};background:linear-gradient(180deg,#fff,${C.cream})}
.sd-lbl{font-weight:800;font-size:14.5px;color:${C.text};margin-bottom:8px}
.sd-p{font-size:14px;color:${C.sub};margin:0 0 12px}
.sd-hint{font-size:12.5px;color:${C.sub};margin:10px 0 0}
.sd-count{font-size:14px;color:${C.text}}.sd-count span{color:${C.sub}}
.sd-result{font-size:14.5px;line-height:1.5;color:${C.text};margin:0}
.sd-nav{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px}
.sd-choices{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sd-choice{font-family:inherit;font-weight:700;font-size:14px;line-height:1.3;text-align:center;color:${C.purpleDeep};background:#fff;border:2px solid ${C.tintP};border-radius:16px;padding:12px 8px;cursor:pointer;transition:.16s;min-height:58px}
.sd-choice:hover{background:${C.cream}}
.sd-choice.sel{border-color:${C.orange};background:${C.cream};box-shadow:0 4px 12px ${C.orange}33}
.sd-btn{font-family:inherit;font-weight:700;font-size:14px;border:none;border-radius:24px;height:42px;padding:0 22px;cursor:pointer;transition:.16s}
.sd-btn.big{width:100%;height:48px;font-size:16px}
.sd-btn.primary{background:linear-gradient(90deg,${C.primary},${C.purpleDeep});color:#fff;box-shadow:0 6px 16px ${C.primary}44}
.sd-btn.primary:hover:not(:disabled){filter:brightness(1.06)}
.sd-btn.primary:active:not(:disabled){transform:scale(.98)}
.sd-btn.primary:disabled{background:${C.border};color:${C.sub};cursor:not-allowed;box-shadow:none}
.sd-btn.ghost{background:#fff;color:${C.sub};border:1.5px solid ${C.border}}
.sd-btn.ghost:hover{border-color:${C.tintP}}
.sd-progress{display:flex;align-items:center;gap:12px;margin-top:14px}
.sd-meter{flex:1;height:20px;border-radius:11px;background:#E9E2F5;border:1.5px solid #D8CEEE;overflow:hidden;box-shadow:inset 0 1px 3px #4a2e7a1a}
.sd-meter .fill{display:block;height:100%;min-width:8px;border-radius:11px;background:linear-gradient(90deg,#FFB65E,${C.orange});box-shadow:0 0 10px ${C.orange}55;transition:width .12s linear}
.sd-progress .pct{font-weight:800;font-size:15px;color:${C.orange};min-width:46px;text-align:right}
.sd-footer{display:flex;gap:10px;margin-top:0}
.sd-mini{flex:1;font-family:inherit;font-weight:700;font-size:13px;background:#fff;border:1.5px solid ${C.border};border-radius:20px;height:40px;cursor:pointer;color:${C.sub};transition:.16s}
.sd-mini:hover{border-color:${C.tintP};background:${C.tintP}22}

/* salt segmented selector */
.salt-seg{display:flex;gap:10px}
.salt-opt{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:11px 6px;border-radius:16px;border:2px solid ${C.border};background:#fff;cursor:pointer;transition:.16s;font-family:inherit}
.salt-opt .spoons{font-size:18px;line-height:1}
.salt-opt .opt-name{font-size:12.5px;font-weight:700;color:${C.sub}}
.salt-opt:hover{border-color:${C.tintP};background:${C.cream}}
.salt-opt.on{border-color:${C.orange};background:${C.cream};box-shadow:0 4px 12px ${C.orange}33}
.salt-opt.on .opt-name{color:${C.orange}}

.sd-root.dark{background:radial-gradient(1200px 700px at 80% -10%,#2a2440,#1b1830 55%,#141126);color:#EDEBFF}
.sd-root.dark .sd-card,.sd-root.dark .sd-rail{background:#241f38;border-color:#332c50;box-shadow:0 8px 22px #0006}
.sd-root.dark .sd-lbl{color:#F3F1FF}
.sd-root.dark .sd-p,.sd-root.dark .sd-hint,.sd-root.dark .sd-count,.sd-root.dark .sd-count span,.sd-root.dark .sd-node em,.sd-root.dark .sd-node .dot{color:#B9B2D6}
.sd-root.dark .sd-node .dot{background:#2c2646;border-color:#3a3358}
.sd-root.dark .sd-choice{background:#241f38;border-color:#3a3358;color:#E7E3FF}
.sd-root.dark .sd-btn.ghost,.sd-root.dark .sd-mini{background:#241f38;border-color:#3a3358;color:#C9C2E6}
.sd-root.dark .salt-opt{background:#241f38;border-color:#3a3358}
.sd-root.dark .salt-opt .opt-name{color:#B9B2D6}
.sd-root.dark .sd-badge,.sd-root.dark .sd-toggle{background:#241f38;border-color:#3a3358}
.sd-root.dark .sd-toggle-opt{color:#B9B2D6}
.sd-root.dark .sd-toggle-opt:hover{background:#332c50;color:#EDEBFF}
.sd-root.dark .sd-readout{background:#241f38;border-color:#3a3358;color:#EDEBFF}
.sd-root.dark .sd-meter{background:#332c50;border-color:#453c66}

/* confetti (finish screen) */
.sd-confetti{position:absolute;top:-20px;width:8px;height:12px;border-radius:2px;animation-name:sd-fall;animation-timing-function:linear;animation-fill-mode:forwards}
@keyframes sd-fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(360deg);opacity:.15}}

/* ── orientation-aware layout (§8.1): all three device frames are landscape — split into a
   two-pane row so the tall wizard never stacks under the scene and overflows ── */
@media (orientation:landscape){
  .sd-root{flex-direction:row;align-items:stretch;justify-content:center;gap:16px}
  .sd-scene{max-width:58%;flex:1 1 58%;height:100%}
  .sd-svg{max-height:none;height:100%}
  .sd-panel{max-width:42%;flex:1 1 42%;height:100%;overflow-y:auto}
}
/* the tightest canonical frame — Mobile App 844x390 — show less chrome, keep it compact */
@media (orientation:landscape) and (max-height:430px){
  .sd-root{padding:8px;gap:8px}
  .sd-head{margin-bottom:2px}
  .sd-head h1{font-size:14px}
  .sd-badge{display:none}
  .sd-node em{display:none}
  .sd-rail{padding:4px 6px}
  .sd-node .dot{width:18px;height:18px;font-size:10px}
  .sd-card{padding:8px 11px}
  .sd-lbl{font-size:12px;margin-bottom:5px}
  .sd-p,.sd-count,.sd-result{font-size:12px}
  .sd-hint{font-size:10.5px;margin-top:6px}
  .sd-btn{height:34px;font-size:12.5px;padding:0 14px}
  .sd-btn.big{height:36px;font-size:13px}
  .sd-mini{height:30px;font-size:11px}
  .salt-opt{padding:6px 4px}
  .sd-choice{padding:8px 6px;min-height:44px;font-size:12px}
}
/* Smart Board — large touch display: fill the frame, grow every control (§7.4/§8.1) */
.sd-root[data-device="smartboard"] .sd-btn{min-height:60px;min-width:60px;font-size:18px;padding:0 28px}
.sd-root[data-device="smartboard"] .sd-mini{min-height:60px;font-size:16px}
.sd-root[data-device="smartboard"] .salt-opt{min-height:60px;padding:16px 10px}
.sd-root[data-device="smartboard"] .sd-choice{min-height:76px;font-size:18px}
.sd-root[data-device="smartboard"] .sd-toggle-opt{padding:12px 22px;font-size:16px;min-height:60px}
.sd-root[data-device="smartboard"] .sd-head h1{font-size:clamp(22px,2.6vw,34px)}

@media (prefers-reduced-motion:reduce){.sun-warm,.steam,.sd-cardwrap,.sd-confetti{animation:none!important}}
`;

export default Tool;
