import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * M2.S6.T8.C19.2D1 — Evaporating salt solution simulator
 * Concept: Heating a salt solution boils the WATER away as vapour, leaving SOLID SALT behind (evaporation).
 * Track: 2D postMessage (§3). Deps: react only + inline SVG + Web Audio + rAF. No network.
 * Predict → heat → boil away → cool → reveal salt.
 */

const TOOL_ID = 'M2.S6.T8.C19.2D1';
const emit = (m: any) => { try { window.parent.postMessage(m, '*'); } catch {} };

// ---- brand palette (§15) ----
const C = {
  primary: '#4A4DC9',
  orange: '#FF7212',
  purple: '#533086',
  fcOrange: '#FC9145',
  cream: '#FFF3E4',
  purpleTint: '#C1C1EA',
  text: '#1A1A2E',
  soft: '#4E4E4E',
  border: '#EBEBEB',
  surface: '#F5F5F5',
  success: '#22C55E',
  error: '#EF4444',
};

type Stage = 'predict' | 'ready' | 'heating' | 'boiled' | 'cooling' | 'done';
type Mode = 'ai' | 'student';
type Predict = 'salt' | 'nothing' | 'water' | null;

const FLAME_NAMES = ['off', 'low', 'medium', 'high'] as const;
const flameToLevel = (v: any): number => {
  if (typeof v === 'number') return Math.max(0, Math.min(3, Math.round(v)));
  const i = FLAME_NAMES.indexOf(String(v).toLowerCase() as any);
  return i < 0 ? 0 : i;
};

// Content depth (§6.2): Student = full (3 practice mixtures), Teacher = lean (1 quick demo).
const ROUNDS_FULL = [
  { salt: 0.3, label: 'a little salt' },
  { salt: 0.6, label: 'some salt' },
  { salt: 0.9, label: 'lots of salt' },
];
const ROUNDS_LEAN = [{ salt: 0.55, label: 'salt' }];
const roundsFor = (m: Mode) => (m === 'ai' ? ROUNDS_LEAN : ROUNDS_FULL);
const depthFor = (m: Mode): 'lean' | 'full' => (m === 'ai' ? 'lean' : 'full');

interface Sim {
  stage: Stage;
  heating: boolean;
  flameLevel: number;   // 0..3
  saltAmount: number;   // 0..1
  waterLevel: number;   // 1..0
  boilProgress: number; // 0..1
  vaporRising: boolean;
  saltVisible: boolean;
  dishCooled: boolean;
  prediction: Predict;
  predictionCommitted: boolean;
  temp: number;         // 20..100 (cosmetic thermometer)
  operatorMode: Mode;
  roundIndex: number;   // which practice mixture (0-based)
  score: number;        // correct predictions so far
  completed: boolean;   // all rounds done (ready for Finish)
  finished: boolean;    // student pressed Finish — finish screen shown
}

const initSim = (p: any): Sim => {
  const mode: Mode = p?.operatorMode === 'ai' ? 'ai' : 'student';
  return {
    stage: 'predict',
    heating: false,
    flameLevel: 0,
    saltAmount: roundsFor(mode)[0].salt,
    waterLevel: 1,
    boilProgress: 0,
    vaporRising: false,
    saltVisible: false,
    dishCooled: false,
    prediction: null,
    predictionCommitted: false,
    temp: 22,
    operatorMode: mode,
    roundIndex: 0,
    score: 0,
    completed: false,
    finished: false,
  };
};

function Tool(props: any) {
  const [sim, setSim] = useState<Sim>(() => initSim(props));
  const simRef = useRef(sim); simRef.current = sim;
  const [clock, setClock] = useState(0); // ambient tick for flicker/particles
  const [mounted, setMounted] = useState(false);
  const reduce = useRef(false);
  const muted = useRef<boolean>(!!props?.muted);
  const boilTarget = useRef<number | null>(null); // agent setBoilProgress target
  const highlightRef = useRef<{ id: string; until: number } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const scoredRound = useRef<number>(-1);          // guard: score a round once
  const celebTimer = useRef<any>(null);
  const [, force] = useState(0);

  // device target (§7.4/§8.1): mobile >= 24x24, smartboard >= 60x30
  const device: 'mobile' | 'smartboard' = props?.device === 'smartboard' ? 'smartboard' : 'mobile';
  const touchH = (base: number) => (device === 'smartboard' ? Math.max(60, base) : base);

  // §6.3 performance/interaction summary tracking (for the uniform `finished` event)
  const historyRef = useRef<{ id: string; correct: boolean; chose: string }[]>([]);
  const attemptsRef = useRef(0);
  const correctFirstTryRef = useRef(0);
  const hintsUsedRef = useRef(0);
  const exploredRef = useRef<string[]>([]);
  const startRef = useRef<number>(performance.now());

  // ---------- Web Audio ----------
  const acRef = useRef<AudioContext | null>(null);
  const ac = () => {
    if (muted.current) return null;
    if (!acRef.current) {
      try { acRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
    }
    return acRef.current;
  };
  const tone = (freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.14, when = 0) => {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(a.destination);
    const t = a.currentTime + when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  };
  const cue = useCallback((k: 'tap' | 'correct' | 'wrong' | 'done' | 'whoosh' | 'sizzle' | 'ding') => {
    if (muted.current) return;
    if (k === 'tap') tone(520, 0.08, 'triangle', 0.1);
    else if (k === 'ding') tone(880, 0.12, 'sine', 0.12);
    else if (k === 'correct') { tone(523, 0.12, 'sine', 0.12); tone(784, 0.18, 'sine', 0.12, 0.1); }
    else if (k === 'wrong') tone(180, 0.22, 'sawtooth', 0.09);
    else if (k === 'whoosh') { tone(300, 0.5, 'sine', 0.05); tone(600, 0.4, 'sine', 0.04, 0.05); }
    else if (k === 'sizzle') tone(240 + Math.random() * 120, 0.06, 'triangle', 0.03);
    else if (k === 'done') { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'sine', 0.13, i * 0.12)); }
  }, []);

  // steam hiss loop while boiling
  const sizzleAcc = useRef(0);

  // ---------- animation loop ----------
  useEffect(() => {
    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      setClock((c) => c + dt);
      setSim((s) => {
        let n: Sim = { ...s };
        const active = n.heating && n.flameLevel > 0 && (n.stage === 'ready' || n.stage === 'heating');

        // agent-driven boil target easing (keeps motion, no jumps)
        if (boilTarget.current != null) {
          const target = boilTarget.current;
          const d = target - n.boilProgress;
          if (Math.abs(d) < 0.004) { n.boilProgress = target; boilTarget.current = null; }
          else n.boilProgress += d * Math.min(1, dt * 2.2);
          if (n.stage === 'ready') n.stage = 'heating';
          n.heating = true;
        } else if (active) {
          if (n.stage === 'ready') n.stage = 'heating';
          const rate = 0.075 * n.flameLevel; // higher flame → faster boil (high ≈4.5s, low ≈13s)
          n.boilProgress = Math.min(1, n.boilProgress + rate * dt);
        }

        // derive
        n.waterLevel = 1 - n.boilProgress;
        n.vaporRising = (active || boilTarget.current != null) && n.boilProgress < 1 && n.waterLevel > 0.02;

        // temperature: climbs while heating, falls while cooling
        if (n.stage === 'cooling') {
          n.temp = Math.max(24, n.temp - dt * 26);
          if (n.temp <= 30 && !n.dishCooled) { n.dishCooled = true; }
          if (n.temp <= 26 && n.stage === 'cooling') { n.stage = 'done'; }
        } else if (active || boilTarget.current != null) {
          n.temp = Math.min(100, n.temp + dt * 30);
        } else if (!n.heating && n.stage !== 'done' && n.stage !== 'boiled') {
          n.temp = Math.max(22, n.temp - dt * 12);
        }

        // water fully gone → boiled crust appears
        if (n.boilProgress >= 1 && (n.stage === 'heating' || n.stage === 'ready')) {
          n.stage = 'boiled';
          n.saltVisible = true;
          n.vaporRising = false;
        }

        // sizzle sfx while actively boiling
        if (n.vaporRising) {
          sizzleAcc.current += dt;
          if (sizzleAcc.current > 0.22) { sizzleAcc.current = 0; cue('sizzle'); }
        }
        return n;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fire events on stage transitions + score the round + celebrate on the last one
  const prevStage = useRef<Stage>('predict');
  useEffect(() => {
    if (sim.stage === prevStage.current) return;
    const total = roundsFor(sim.operatorMode).length;
    if (sim.stage === 'boiled') {
      cue('whoosh');
      emit({ type: 'event', name: 'water_boiled_away', detail: { saltAmount: sim.saltAmount, roundIndex: sim.roundIndex } });
    }
    if (sim.stage === 'done') {
      const correct = sim.prediction === 'salt';
      cue('done');
      emit({ type: 'event', name: 'salt_revealed', detail: { correct, roundIndex: sim.roundIndex } });
      emit({ type: 'event', name: correct ? 'answer_correct' : 'answer_incorrect', detail: { prediction: sim.prediction, roundIndex: sim.roundIndex } });
      if (scoredRound.current !== sim.roundIndex) {
        scoredRound.current = sim.roundIndex;
        const isLast = sim.roundIndex >= total - 1;
        historyRef.current.push({ id: `mixture_${sim.roundIndex + 1}`, correct, chose: String(sim.prediction) });
        if (correct) correctFirstTryRef.current += 1;
        setSim((s) => ({ ...s, score: s.score + (correct ? 1 : 0), completed: isLast ? true : s.completed }));
        // §6.3: reaching the last round only marks the activity ready-to-finish — it does
        // NOT auto-celebrate. The full-screen finish screen opens only when the student
        // (student mode) presses the Finish button, via finish() below.
        if (isLast) emit({ type: 'event', name: 'completed', detail: { score: sim.score + (correct ? 1 : 0), total } });
      }
    }
    prevStage.current = sim.stage;
  }, [sim.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- actions (used by BOTH student + agent) ----------
  const doHighlight = useCallback((target: string) => {
    highlightRef.current = { id: String(target), until: performance.now() + 2600 };
    hintsUsedRef.current += 1;
    force((x) => x + 1);
    emit({ type: 'event', name: 'highlighted', detail: { target } });
  }, []);

  const commitPrediction = useCallback((choice: string) => {
    const c = (['salt', 'nothing', 'water'].includes(String(choice)) ? choice : null) as Predict;
    if (!c) return;
    attemptsRef.current += 1;
    setSim((s) => (s.predictionCommitted ? s : { ...s, prediction: c, predictionCommitted: true, stage: s.stage === 'predict' ? 'ready' : s.stage }));
    cue(c === 'salt' ? 'correct' : 'tap');
    emit({ type: 'event', name: 'prediction_made', detail: { choice: c, correct: c === 'salt' } });
  }, [cue]);

  const setFlame = useCallback((level: any) => {
    const lv = flameToLevel(level);
    setSim((s) => {
      if (s.stage === 'predict' || s.stage === 'boiled' || s.stage === 'cooling' || s.stage === 'done') return s;
      const heating = lv > 0;
      return { ...s, flameLevel: lv, heating, stage: heating && s.stage === 'ready' ? 'heating' : s.stage };
    });
    if (lv > 0) exploredRef.current.push(FLAME_NAMES[lv]);
    cue('tap');
    emit({ type: 'event', name: 'flame_changed', detail: { level: FLAME_NAMES[lv], value: lv } });
  }, [cue]);

  const toggleLamp = useCallback((on?: any) => {
    setSim((s) => {
      if (s.stage === 'predict' || s.stage === 'boiled' || s.stage === 'cooling' || s.stage === 'done') return s;
      const want = typeof on === 'boolean' ? on : !s.heating;
      const lv = want ? (s.flameLevel > 0 ? s.flameLevel : 2) : 0;
      return { ...s, heating: want, flameLevel: lv, stage: want && s.stage === 'ready' ? 'heating' : s.stage };
    });
    cue('tap');
  }, [cue]);

  const setSalt = useCallback((amount: any) => {
    const a = Math.max(0, Math.min(1, Number(amount)));
    setSim((s) => (s.stage === 'predict' || s.stage === 'ready' ? { ...s, saltAmount: a } : s));
    emit({ type: 'event', name: 'salt_amount_changed', detail: { amount: a } });
  }, []);

  const coolDown = useCallback(() => {
    setSim((s) => (s.stage === 'boiled' ? { ...s, stage: 'cooling', heating: false, flameLevel: 0 } : s));
    cue('whoosh');
    emit({ type: 'event', name: 'cool_down', detail: {} });
  }, [cue]);

  const play = useCallback(() => {
    // Star "Observe" verb: run the whole phenomenon at medium flame if idle.
    setSim((s) => {
      if (s.stage === 'ready' || s.stage === 'heating') {
        return { ...s, heating: true, flameLevel: s.flameLevel > 0 ? s.flameLevel : 2, stage: 'heating' };
      }
      return s;
    });
    cue('tap');
  }, [cue]);

  const pause = useCallback(() => {
    setSim((s) => (s.stage === 'heating' ? { ...s, heating: false } : s));
  }, []);

  const reset = useCallback(() => {
    boilTarget.current = null;
    scoredRound.current = -1;
    historyRef.current = []; attemptsRef.current = 0; correctFirstTryRef.current = 0;
    hintsUsedRef.current = 0; exploredRef.current = []; startRef.current = performance.now();
    clearTimeout(celebTimer.current);
    setCelebrate(false);
    setSim((s) => ({ ...initSim({ operatorMode: s.operatorMode }) }));
    prevStage.current = 'predict';
    cue('whoosh');
    emit({ type: 'event', name: 'reset', detail: {} });
  }, [cue]);

  // one handler for the toggle, the prop, and setOperatorMode — re-derives depth live (§6.1/6.2)
  const applyMode = useCallback((mode: any) => {
    const m: Mode = mode === 'ai' ? 'ai' : 'student';
    boilTarget.current = null;
    scoredRound.current = -1;
    historyRef.current = []; attemptsRef.current = 0; correctFirstTryRef.current = 0;
    hintsUsedRef.current = 0; exploredRef.current = []; startRef.current = performance.now();
    clearTimeout(celebTimer.current);
    setCelebrate(false);
    setSim(() => ({ ...initSim({ operatorMode: m }) }));
    prevStage.current = 'predict';
    const rounds = roundsFor(m);
    emit({ type: 'event', name: 'operator_mode_changed', detail: { operatorMode: m, depth: depthFor(m), exampleCount: rounds.length, stepCount: rounds.length } });
    cue('tap');
  }, [cue]);
  const setOperatorMode = applyMode;

  // §6.3 — the uniform Finish flow: student-mode only, no "Play Again" loop. Idempotent —
  // only fires once, only once the LAST mixture has been revealed.
  const finish = useCallback(() => {
    const s = simRef.current;
    if (s.finished) return;
    const total = roundsFor(s.operatorMode).length;
    const isLast = s.roundIndex >= total - 1;
    if (s.operatorMode !== 'student' || s.stage !== 'done' || !isLast) return;
    const stars = Math.max(0, Math.min(3, s.score));
    setSim((cur) => ({ ...cur, finished: true }));
    cue('done');
    emit({ type: 'event', name: 'finished', detail: {
      evaluated: true,
      score: s.score, total,
      stars,
      breakdown: historyRef.current.slice(),
      interactions: {
        attempts: attemptsRef.current,
        correctFirstTry: correctFirstTryRef.current,
        hintsUsed: hintsUsedRef.current,
        itemsExplored: Array.from(new Set(exploredRef.current)),
        durationMs: Math.round(performance.now() - startRef.current),
      },
      learned: [
        'Heating turns the water in a salt solution into vapour, which escapes the dish.',
        'Dissolved salt cannot vaporise, so it stays behind as a solid.',
        'More dissolved salt leaves more solid salt once the water is gone.',
      ],
    } });
    setCelebrate(true);
    clearTimeout(celebTimer.current);
    celebTimer.current = setTimeout(() => setCelebrate(false), 3800);
  }, [cue]);

  // advance to the next practice mixture (Student/full mode)
  const nextRound = useCallback(() => {
    boilTarget.current = null;
    setSim((s) => {
      const rounds = roundsFor(s.operatorMode);
      if (s.stage !== 'done' || s.roundIndex >= rounds.length - 1) return s;
      const idx = s.roundIndex + 1;
      return {
        ...s, roundIndex: idx, stage: 'predict', heating: false, flameLevel: 0,
        saltAmount: rounds[idx].salt, waterLevel: 1, boilProgress: 0, vaporRising: false,
        saltVisible: false, dishCooled: false, prediction: null, predictionCommitted: false, temp: 22,
      };
    });
    prevStage.current = 'predict';
    const s = simRef.current;
    emit({ type: 'event', name: 'round_advanced', detail: { roundIndex: Math.min(s.roundIndex + 1, roundsFor(s.operatorMode).length - 1) } });
    cue('tap');
  }, [cue]);

  const setBoilProgress = useCallback((value: any) => {
    const v = Math.max(0, Math.min(1, Number(value)));
    boilTarget.current = v;
  }, []);

  const setParam = useCallback((name: string, value: any) => {
    if (name === 'muted') { muted.current = !!value; force((x) => x + 1); }
    else if (name === 'operatorMode') applyMode(value);
    else if (name === 'saltAmount') setSalt(value);
    else if (name === 'flameLevel') setFlame(value);
    else if (name === 'themeColor') { /* single theme */ }
  }, [applyMode, setSalt, setFlame]);

  const getState = useCallback(() => {
    const s = simRef.current;
    const rounds = roundsFor(s.operatorMode);
    const state = {
      stage: s.stage, heating: s.heating, flameLevel: s.flameLevel, saltAmount: s.saltAmount,
      waterLevel: s.waterLevel, boilProgress: s.boilProgress, vaporRising: s.vaporRising,
      saltVisible: s.saltVisible, dishCooled: s.dishCooled, prediction: s.prediction,
      predictionCommitted: s.predictionCommitted, temp: Math.round(s.temp),
      operatorMode: s.operatorMode, depth: depthFor(s.operatorMode),
      roundIndex: s.roundIndex, totalRounds: rounds.length, stepCount: rounds.length, exampleCount: rounds.length,
      score: s.score, completed: s.completed, finished: s.finished,
    };
    emit({ type: 'state', state });
    return state;
  }, []);

  const api = {
    setParam, play, pause, reset, highlight: doHighlight, getState, setOperatorMode,
    setFlame, setBoilProgress, toggleLamp, setSalt, coolDown, commitPrediction, nextRound, finish,
  };
  const apiRef = useRef(api); apiRef.current = api;

  // ---------- command listener + ready ----------
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== 'command') return;
      const fn = (apiRef.current as any)[d.method];
      let result; try { if (typeof fn === 'function') result = fn(...(d.args || [])); } catch { /* ignore */ }
      emit({ type: 'response', id: d.id, result });
    };
    window.addEventListener('message', onMsg);
    try { reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* ignore */ }
    setMounted(true);
    emit({ type: 'ready', toolId: TOOL_ID });
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // keep in sync if the HOST changes the mode via props (host wins in production)
  useEffect(() => {
    const pm: Mode = props?.operatorMode === 'ai' ? 'ai' : 'student';
    if (pm !== simRef.current.operatorMode) applyMode(pm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.operatorMode]);

  // optional starting-salt override for the first mixture
  useEffect(() => {
    const a = props?.additionalProps;
    if (a && typeof a.saltAmount === 'number') setSalt(a.saltAmount);
  }, [props?.additionalProps]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- derived render helpers ----------
  const hl = highlightRef.current && highlightRef.current.until > performance.now() ? highlightRef.current.id : null;
  const isAI = sim.operatorMode === 'ai';
  const rounds = roundsFor(sim.operatorMode);
  const totalRounds = rounds.length;
  const showToggle = props?.showModeToggle !== false;
  const isLastRound = sim.roundIndex >= totalRounds - 1;
  // ---------- scene geometry (viewBox 0..400 x 0..300) ----------
  const dishCx = 200, dishTop = 150, dishW = 128, dishDepth = 40;
  const floorY = dishTop + dishDepth - 3;
  const wl = Math.max(0, sim.waterLevel);
  const lx = dishCx - dishW / 2 + 6, rx = dishCx + dishW / 2 - 6;
  const blx = dishCx - dishW / 2 + 20, brx = dishCx + dishW / 2 - 20;
  const heatOn = sim.heating && sim.flameLevel > 0;
  const boilInt = sim.vaporRising ? Math.min(1, 0.4 + sim.flameLevel * 0.22) : 0;

  // flame — two independent flicker phases + glow
  const flick1 = 1 + Math.sin(clock * 19) * 0.09 + Math.sin(clock * 8.1) * 0.05;
  const flick2 = 1 + Math.sin(clock * 24 + 1.3) * 0.13 + Math.cos(clock * 11) * 0.06;
  const flameBase = 260;
  const GAUZE_Y = 190;   // wire gauze sits just under the dish (dish floor ≈ 187)
  let flameH = heatOn ? (22 + sim.flameLevel * 15) * flick1 : 0;
  // keep the flame tip licking the underside of the gauze — never up into the dish
  const maxFlameH = flameBase - (GAUZE_Y + 3);
  if (flameH > maxFlameH) flameH = maxFlameH;

  // ---- correct layering: salt bed on the floor, water column resting ON TOP of it ----
  // As the solution concentrates, salt precipitates at the bottom and its bed grows;
  // the water sits above the salt and its level drops onto the growing bed. By the time
  // the last water goes, the full salt bed is already there (no "pop-in after boiling").
  const maxWater = 24;                                   // px height of a full water column
  const saltFull = 4 + sim.saltAmount * 16;              // final salt bed height
  const saltProgress = Math.max(0, Math.min(1, (0.72 - wl) / 0.7)); // starts once saturated (~28% boiled)
  const saltH = saltFull * saltProgress;
  const waterCol = maxWater * wl;
  const saltTopY = floorY - saltH;                        // top surface of the salt bed
  const waterTopY = saltTopY - waterCol;                  // water surface (rests on the salt)
  const waterShown = waterCol > 0.6;
  const saltShown = saltH > 0.4;

  // rippled water surface (wavy top edge), sitting on top of the salt bed
  const waveAmp = sim.vaporRising ? 1.1 + sim.flameLevel * 0.5 : 0.4;
  const surfPts: string[] = [];
  {
    const segs = 8;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = lx + (rx - lx) * t;
      const y = waterTopY + Math.sin(clock * 5 + t * 7) * waveAmp + Math.sin(clock * 3.2 + t * 3) * waveAmp * 0.5;
      surfPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }

  // soft curling steam wisps (blurred), rising from the water surface
  const steam: React.ReactNode[] = [];
  if (sim.vaporRising) {
    const n = 6 + sim.flameLevel * 2;
    for (let i = 0; i < n; i++) {
      const ph = (clock * (0.34 + i * 0.05) + i * 0.618) % 1;
      const spread = dishW * 0.46;
      const baseX = dishCx - spread / 2 + (i / Math.max(1, n - 1)) * spread;
      const curl = Math.sin(clock * 1.6 + i * 1.3 + ph * 3) * (6 + ph * 15);
      const x = baseX + curl;
      const y = waterTopY - 4 - ph * 112;
      const rr = (6 + ph * 15) * (0.78 + boilInt * 0.5);
      const op = Math.sin(ph * Math.PI) * 0.82 * (0.7 + boilInt * 0.45);
      steam.push(<ellipse key={'s' + i} cx={x} cy={y} rx={rr} ry={rr * 1.35} fill="#ffffff" opacity={op} />);
    }
  }

  // boiling bubbles rising through the water column (from the salt bed up to the surface)
  const bubbles: React.ReactNode[] = [];
  if (sim.vaporRising && waterCol > 3) {
    const n = 4 + sim.flameLevel * 3;
    for (let i = 0; i < n; i++) {
      const ph = (clock * (0.8 + (i % 4) * 0.25) + i * 0.37) % 1;
      const x = dishCx - dishW * 0.34 + (i / Math.max(1, n - 1)) * dishW * 0.68 + Math.sin(clock * 4 + i) * 2;
      const y = saltTopY - ph * (saltTopY - waterTopY);   // floor of water = salt top, up to surface
      const pop = Math.min(1, Math.max(0, (y - waterTopY) / 9));
      const r = (1.1 + (i % 3) * 1.1) * (0.35 + pop);
      bubbles.push(<circle key={'b' + i} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.55 * pop} />);
    }
  }

  // agent highlight ring + a soft echo ring
  const ring = (id: string, cx: number, cy: number, r: number) =>
    hl === id ? (
      <g>
        <circle cx={cx} cy={cy} r={r + 10 + Math.sin(clock * 4) * 4} fill="none" stroke={C.orange} strokeWidth={2} opacity={0.28} />
        <circle cx={cx} cy={cy} r={r + 6 + Math.sin(clock * 6) * 3} fill="none" stroke={C.orange} strokeWidth={4}
          opacity={0.85} strokeDasharray="8 7" style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${clock * 40}deg)` }} />
      </g>
    ) : null;

  // staggered entrance helper
  const ent = (d: number): React.CSSProperties =>
    reduce.current ? {} : (mounted ? { animation: `riseIn .55s cubic-bezier(.22,1,.36,1) both`, animationDelay: `${d}ms` } : { opacity: 0 });

  // ---------- styles ----------
  const ModeToggle = () => (
    <div role="tablist" aria-label="Who drives the tool" style={{
      display: 'inline-flex', background: C.surface, borderRadius: 999, padding: 3, gap: 2,
      boxShadow: 'inset 0 0 0 1px ' + C.border, position: 'relative',
    }}>
      {([['student', '🙋 Your turn'], ['ai', '👩‍🏫 Teacher']] as const).map(([m, label]) => {
        const on = (m === 'ai') === isAI;
        return (
          <button key={m} role="tab" aria-selected={on} className="evap-btn" onClick={() => applyMode(m)}
            style={{
              border: 'none', cursor: 'pointer', borderRadius: 999, minHeight: touchH(32), padding: '0 12px',
              fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 700, fontSize: 'clamp(10px,1.15vw,12.5px)',
              color: on ? '#fff' : C.soft, background: on ? `linear-gradient(135deg, ${C.purple}, ${C.primary})` : 'transparent',
              boxShadow: on ? '0 4px 12px rgba(74,77,201,.32)' : 'none',
              transition: 'background .2s ease, color .2s ease, transform .12s ease',
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );

  const btn = (variant: 'primary' | 'ghost' | 'highlight' | 'success', extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 700, fontSize: 'clamp(12px,1.3vw,15px)',
    border: 'none', cursor: 'pointer', borderRadius: 24, minHeight: touchH(44), padding: '0 20px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'transform .16s ease, box-shadow .16s ease, background .16s ease',
    color: variant === 'ghost' ? C.primary : '#fff',
    background: variant === 'primary' ? `linear-gradient(135deg, ${C.purple}, ${C.primary})`
      : variant === 'highlight' ? C.orange
        : variant === 'success' ? C.success
          : '#fff',
    boxShadow: variant === 'ghost' ? `inset 0 0 0 2px ${C.purpleTint}` : '0 6px 16px rgba(74,77,201,.28)',
    ...extra,
  });

  const stageLabel: Record<Stage, string> = {
    predict: 'Make your prediction',
    ready: 'Light the spirit lamp to begin',
    heating: 'Heating — the water is boiling away',
    boiled: 'Water gone! Let the dish cool down',
    cooling: 'Cooling the dish…',
    done: 'Done — look what stayed behind',
  };

  const predictOptions: { id: Predict; label: string; icon: string }[] = [
    { id: 'water', label: 'The water stays', icon: '💧' },
    { id: 'nothing', label: 'Nothing is left', icon: '⚪' },
    { id: 'salt', label: 'Solid salt is left', icon: '🧂' },
  ];

  return (
    <div style={{
      fontFamily: 'Poppins, system-ui, sans-serif', color: C.text,
      width: '100%', minHeight: '100dvh', maxWidth: 3840, maxHeight: 2160, margin: '0 auto',
      display: 'grid', placeContent: 'center', boxSizing: 'border-box', padding: 'clamp(8px,1.5vw,20px)',
      position: 'relative',
      background: `radial-gradient(1200px 600px at 20% -10%, ${C.cream}, ${C.surface} 60%)`,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        .evap-btn:hover{transform:translateY(-2px);filter:brightness(1.04)}
        .evap-btn:active{transform:scale(.97)}
        @keyframes riseIn{0%{transform:translateY(10px);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes pop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
        @keyframes spark{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1.28)}}
        @keyframes glint{0%{transform:translateX(0);opacity:0}25%{opacity:.75}100%{transform:translateX(96px);opacity:0}}
        @keyframes confettiFall{0%{transform:translateY(-12vh) rotate(0deg);opacity:0}8%{opacity:1}100%{transform:translateY(112vh) rotate(720deg);opacity:1}}
        @keyframes badgePop{0%{transform:scale(.5);opacity:0}55%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        .evap-spark{animation:spark 1.6s ease-in-out infinite}
        .evap-glint{animation:glint 2.6s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){ .evap-spark,.evap-glint,.evap-confetti{animation:none !important} }
        input[type=range].evap{ -webkit-appearance:none;appearance:none;width:100%;height:10px;border-radius:999px;outline:none;margin:8px 0;cursor:pointer;box-shadow:inset 0 1px 2px rgba(0,0,0,.10); }
        input[type=range].evap:disabled{ cursor:default;opacity:.55; }
        input[type=range].evap::-webkit-slider-runnable-track{ height:10px;border-radius:999px;background:transparent; }
        input[type=range].evap::-webkit-slider-thumb{ -webkit-appearance:none;appearance:none;box-sizing:border-box;height:22px;width:22px;border-radius:50%;background:${C.orange};border:3px solid #fff;box-shadow:0 2px 6px rgba(26,26,46,.30),0 0 0 1.5px ${C.orange};margin-top:-6px;cursor:pointer;transition:transform .12s ease; }
        input[type=range].evap:not(:disabled)::-webkit-slider-thumb:hover{ transform:scale(1.09); }
        input[type=range].evap:not(:disabled):active::-webkit-slider-thumb{ transform:scale(.96); }
        input[type=range].evap::-moz-range-track{ height:10px;border-radius:999px;background:transparent; }
        input[type=range].evap::-moz-range-thumb{ box-sizing:border-box;height:22px;width:22px;border-radius:50%;background:${C.orange};border:3px solid #fff;box-shadow:0 2px 6px rgba(26,26,46,.30),0 0 0 1.5px ${C.orange};cursor:pointer; }
      `}</style>

      <div style={{
        width: 'min(1100px, 96vw)', display: 'grid', gap: 'clamp(10px,1.4vw,18px)',
        gridTemplateColumns: '1.15fr 1fr', position: 'relative',
      }}
        // orientation: stack on portrait
        className="evap-shell">
        <style>{`@media (orientation: portrait){ .evap-shell{ grid-template-columns:1fr !important } }`}</style>

        {/* ===== LEFT: PHENOMENON ===== */}
        <section style={{
          background: '#fff', borderRadius: 24, padding: 'clamp(10px,1.4vw,18px)',
          boxShadow: '0 12px 30px rgba(83,48,134,.12)', position: 'relative', overflow: 'hidden',
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(14px,1.8vw,21px)', fontWeight: 800, letterSpacing: -0.5,
              background: `linear-gradient(135deg,${C.purple},${C.fcOrange})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Boil away the water 🔥
            </h1>
            {showToggle && <ModeToggle />}
          </div>

          <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '54dvh' }}>
            <defs>
              <linearGradient id="liq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#d3ecff" /><stop offset="1" stopColor="#6fb0e4" />
              </linearGradient>
              <radialGradient id="flameG" cx="0.5" cy="0.85" r="0.75">
                <stop offset="0" stopColor="#fff6c0" /><stop offset="0.45" stopColor={C.fcOrange} /><stop offset="1" stopColor={C.orange} />
              </radialGradient>
              <radialGradient id="flameGlow" cx="0.5" cy="0.6" r="0.5">
                <stop offset="0" stopColor="#ffce78" stopOpacity="0.85" /><stop offset="1" stopColor="#ffce78" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="dishG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e7e9f2" />
              </linearGradient>
              <linearGradient id="sceneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c3cdec" /><stop offset="0.5" stopColor="#dde3f4" /><stop offset="1" stopColor="#f1f3fb" />
              </linearGradient>
              <linearGradient id="saltG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#eef0f8" />
              </linearGradient>
              <filter id="steamBlur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" /></filter>
              <filter id="softGlow" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="3.2" /></filter>
            </defs>

            {/* soft lab backdrop — gives the white vapour something to show against */}
            <rect x="0" y="0" width="400" height="300" rx="16" fill="url(#sceneBg)" />

            {/* ambient heat shimmer above the water surface */}
            {sim.vaporRising && (
              <ellipse cx={dishCx} cy={waterTopY - 2} rx={dishW * 0.4} ry={4 + boilInt * 3}
                fill="#fff3d6" opacity={0.12 + 0.06 * Math.sin(clock * 6)} filter="url(#steamBlur)" />
            )}

            {/* tripod stand */}
            <g style={ent(60)}>
              {ring('tripod', 200, 232, 70)}
              <line x1="150" y1="196" x2="128" y2="266" stroke="#6b6f86" strokeWidth="6" strokeLinecap="round" />
              <line x1="250" y1="196" x2="272" y2="266" stroke="#6b6f86" strokeWidth="6" strokeLinecap="round" />
              <line x1="200" y1="196" x2="200" y2="266" stroke="#6b6f86" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
            </g>

            {/* wire gauze */}
            <g style={ent(140)}>
              {ring('gauze', 200, 196, 60)}
              <rect x="140" y="190" width="120" height="9" rx="3" fill="#c7ccdd" stroke="#9aa0b8" strokeWidth="1.5" />
              {Array.from({ length: 11 }).map((_, i) => (
                <line key={i} x1={144 + i * 11} y1="190" x2={144 + i * 11} y2="199" stroke="#9aa0b8" strokeWidth="1" opacity="0.6" />
              ))}
            </g>

            {/* china dish + salt bed + water on top */}
            <g style={ent(220)}>
              {ring('dish', dishCx, dishTop + 10, 78)}
              {ring('salt_solution', dishCx, Math.min(waterTopY, saltTopY) + 4, 60)}
              <path d={`M${dishCx - dishW / 2},${dishTop} Q${dishCx - dishW / 2 - 6},${dishTop + dishDepth} ${dishCx - dishW / 2 + 22},${dishTop + dishDepth}
                L${dishCx + dishW / 2 - 22},${dishTop + dishDepth} Q${dishCx + dishW / 2 + 6},${dishTop + dishDepth} ${dishCx + dishW / 2},${dishTop} Z`}
                fill="url(#dishG)" stroke="#c3c8db" strokeWidth="2.5" />

              {/* salt bed on the floor — drawn FIRST, grows as the solution concentrates */}
              {saltShown && (
                <path d={`M${blx},${floorY - 1} L${brx},${floorY - 1}
                  L${brx - 4},${saltTopY} Q${dishCx + 10},${saltTopY - 2.5} ${dishCx},${saltTopY - 1.5}
                  Q${dishCx - 10},${saltTopY - 2.5} ${blx + 4},${saltTopY} Z`}
                  fill="url(#saltG)" stroke="#dcdfec" strokeWidth="1.1" />
              )}

              {/* water column resting ON TOP of the salt bed — surface drops onto the salt */}
              {waterShown && (
                <>
                  <path d={`M${surfPts.join(' L ')} L ${brx - 4},${saltTopY} L ${blx + 4},${saltTopY} Z`} fill="url(#liq)" opacity={0.86} />
                  <polyline points={surfPts.join(' ')} fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.55" />
                </>
              )}
              {bubbles}

              {/* finishing sparkle + glint on the exposed salt (once fully dry) */}
              {sim.stage === 'done' && saltShown && (
                <g>
                  {ring('salt_crystals', dishCx, saltTopY + saltH / 2, 44)}
                  {Array.from({ length: 7 }).map((_, i) => (
                    <path key={i} className="evap-spark"
                      d={`M${dishCx - 42 + i * 14},${saltTopY + 2 + (i % 2) * 4} l0,-6 M${dishCx - 45 + i * 14},${saltTopY - 1 + (i % 2) * 4} l6,0`}
                      stroke={C.fcOrange} strokeWidth="1.6" strokeLinecap="round"
                      style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${i * 0.18}s` }} />
                  ))}
                  <rect className="evap-glint" x={blx} y={saltTopY - 1} width="10" height={saltH + 2}
                    fill="#ffffff" opacity="0.55" rx="4" />
                </g>
              )}
            </g>

            {/* spirit lamp + flame */}
            <g style={ent(300)}>
              {ring('lamp', 200, 282, 26)}
              <rect x="184" y="268" width="32" height="20" rx="4" fill="#eef0f7" stroke="#b9bed3" strokeWidth="2" />
              <rect x="194" y="260" width="12" height="10" rx="2" fill="#d8b56a" stroke="#b58f3e" strokeWidth="1.5" />
              {ring('flame', 200, 236, 24)}
              {flameH > 0 && (
                <g>
                  <ellipse cx="200" cy={flameBase - flameH * 0.5} rx={9 + sim.flameLevel * 1.5} ry={flameH * 0.34}
                    fill="url(#flameGlow)" filter="url(#softGlow)" opacity={0.5} />
                  <path d={`M200,${flameBase - flameH} Q${200 - (11 + sim.flameLevel * 2) * flick2},${flameBase - flameH / 2} ${200 - 9},${flameBase}
                    Q200,${flameBase + 4} ${200 + 9},${flameBase} Q${200 + (11 + sim.flameLevel * 2) * flick2},${flameBase - flameH / 2} 200,${flameBase - flameH} Z`}
                    fill="url(#flameG)" opacity="0.96" />
                  <path d={`M200,${flameBase - flameH * 0.58} Q${200 - 5 * flick2},${flameBase - flameH * 0.28} ${200 - 4},${flameBase - 2}
                    Q200,${flameBase + 1} ${200 + 4},${flameBase - 2} Q${200 + 5 * flick2},${flameBase - flameH * 0.28} 200,${flameBase - flameH * 0.58} Z`}
                    fill="#a7c8ff" opacity="0.92" />
                </g>
              )}
            </g>

            {/* soft curling steam, in front, blurred */}
            <g filter="url(#steamBlur)">{steam}</g>

            {/* cooling shimmer overlay */}
            {sim.stage === 'cooling' && (
              <rect x={dishCx - dishW / 2} y={dishTop - 4} width={dishW} height={dishDepth + 8} rx="10"
                fill="#bfe0ff" opacity={0.16 + 0.12 * Math.abs(Math.sin(clock * 3))} />
            )}
          </svg>

          {/* on-scene caption */}
          <div style={{ position: 'absolute', left: 16, bottom: 12, right: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'clamp(11px,1.3vw,14px)', fontWeight: 700, color: C.soft,
              background: C.surface, padding: '6px 12px', borderRadius: 16 }}>
              {isAI ? '👩‍🏫 Watch — you\'ll get a turn' : stageLabel[sim.stage]}
            </span>
            {(sim.stage === 'heating' || sim.stage === 'boiled' || sim.stage === 'cooling' || sim.stage === 'done') && (
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: sim.temp > 60 ? C.orange : C.primary, padding: '5px 10px', borderRadius: 14 }}>
                🌡️ {Math.round(sim.temp)}°C
              </span>
            )}
          </div>
        </section>

        {/* ===== RIGHT: CONTROLS / READ-OUT ===== */}
        <section style={{ display: 'grid', gap: 'clamp(8px,1.2vw,14px)', alignContent: 'start' }}>

          {/* round progress + score (Student / full depth) */}
          {!isAI && totalRounds > 1 && (
            <div style={{ background: '#fff', borderRadius: 20, padding: '10px 14px', boxShadow: '0 8px 20px rgba(83,48,134,.1)', border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.soft }}>Mixture {sim.roundIndex + 1}/{totalRounds}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {rounds.map((_, i) => (
                    <span key={i} style={{ width: 8, height: 8, borderRadius: 999,
                      background: i < sim.roundIndex ? C.success : i === sim.roundIndex ? C.primary : '#Dfe0ee',
                      transition: 'background .3s' }} />
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.orange, letterSpacing: 1 }}>
                {'⭐'.repeat(sim.score)}<span style={{ color: '#D9DAE6' }}>{'☆'.repeat(Math.max(0, totalRounds - sim.score))}</span>
              </div>
            </div>
          )}

          {/* progress read-out */}
          {(() => {
            const boiledStages = sim.stage === 'boiled' || sim.stage === 'cooling' || sim.stage === 'done';
            const raw = boiledStages ? 0 : (Number.isFinite(sim.waterLevel) ? sim.waterLevel : 0);
            let pct = Math.max(0, Math.min(100, raw * 100));
            if (pct < 0.5) pct = 0; else if (pct > 99.5) pct = 100;   // avoid sub-pixel slivers
            return (
              <div style={{ background: '#fff', borderRadius: 20, padding: 14, boxShadow: '0 8px 20px rgba(83,48,134,.1)', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: C.soft, marginBottom: 8 }}>
                  <span>💧 Water left</span><span style={{ color: pct > 5 ? C.primary : C.orange }}>{Math.round(pct)}%</span>
                </div>
                <div style={{ position: 'relative', width: '100%', height: 14, borderRadius: 10, background: '#E4E5F0', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.08)' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, maxWidth: '100%', borderRadius: 10,
                    background: `linear-gradient(90deg, ${C.primary}, #7fb8e6)` }} />
                </div>
              </div>
            );
          })()}

          {/* PREDICT gate */}
          {!sim.predictionCommitted ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: 14, boxShadow: '0 8px 20px rgba(83,48,134,.1)', border: `2px dashed ${C.purpleTint}` }}>
              <div style={{ fontWeight: 800, fontSize: 'clamp(13px,1.5vw,16px)', marginBottom: 4 }}>🔮 Predict first!</div>
              <div style={{ fontSize: 'clamp(11px,1.3vw,13px)', color: C.soft, marginBottom: 10 }}>
                When all the water boils away, what will be left in the dish?
              </div>
              <div style={{ display: 'grid', gap: 8 }} id="predict">
                {predictOptions.map((o) => (
                  <button key={o.id} className="evap-btn" onClick={() => commitPrediction(o.id as string)}
                    style={btn('ghost', { justifyContent: 'flex-start', minHeight: 46, fontSize: 'clamp(12px,1.4vw,15px)',
                      boxShadow: hl === 'predict' ? `0 0 0 3px ${C.orange}` : `inset 0 0 0 2px ${C.purpleTint}` })}>
                    <span style={{ fontSize: 20 }}>{o.icon}</span> {o.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: sim.prediction === 'salt' ? '#eafbf0' : C.cream, borderRadius: 20, padding: '10px 14px',
              border: `1px solid ${sim.prediction === 'salt' ? '#bfeccd' : '#ffe1c2'}`, fontSize: 'clamp(11px,1.3vw,13px)', fontWeight: 700 }}>
              You predicted: <b>{predictOptions.find(o => o.id === sim.prediction)?.icon} {predictOptions.find(o => o.id === sim.prediction)?.label}</b>
              {sim.stage === 'done' && (
                <div style={{ marginTop: 6, color: sim.prediction === 'salt' ? C.success : C.error, fontWeight: 800 }}>
                  {sim.prediction === 'salt' ? '✓ Correct! The salt stayed behind.' : '✗ Not quite — the salt stayed, only the water left.'}
                </div>
              )}
            </div>
          )}

          {/* CONTROLS — hidden in ai mode (§6.1) */}
          {!isAI && sim.predictionCommitted && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 14, boxShadow: '0 8px 20px rgba(83,48,134,.1)', border: `1px solid ${C.border}`, display: 'grid', gap: 12 }}>
              {/* salt amount */}
              <div style={{ opacity: (sim.stage === 'ready' || sim.stage === 'predict') ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: C.soft }}>
                  <span>🧂 Salt dissolved</span><span>{sim.saltAmount < 0.34 ? 'a little' : sim.saltAmount < 0.67 ? 'some' : 'a lot'}</span>
                </div>
                <input className="evap" type="range" min={0} max={1} step={0.01} value={sim.saltAmount}
                  disabled={!(sim.stage === 'ready' || sim.stage === 'predict')}
                  onChange={(e) => setSalt(parseFloat(e.target.value))}
                  style={{ width: '100%', background: `linear-gradient(90deg,${C.orange} ${sim.saltAmount * 100}%, ${C.border} ${sim.saltAmount * 100}%)` }} />
              </div>

              {/* flame strength */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: C.soft }}>
                  <span>🔥 Flame</span><span>{FLAME_NAMES[sim.flameLevel]}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {FLAME_NAMES.map((f, i) => (
                    <button key={f} className="evap-btn" onClick={() => setFlame(i)}
                      disabled={sim.stage === 'boiled' || sim.stage === 'cooling' || sim.stage === 'done'}
                      style={{ ...btn(sim.flameLevel === i ? 'primary' : 'ghost'), flex: 1, minHeight: touchH(40), fontSize: 12, padding: '0 6px',
                        opacity: (sim.stage === 'boiled' || sim.stage === 'cooling' || sim.stage === 'done') ? 0.45 : 1 }}>
                      {i === 0 ? 'Off' : '🔥'.repeat(i)}
                    </button>
                  ))}
                </div>
              </div>

              {/* action buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(sim.stage === 'ready' || sim.stage === 'heating') && (
                  <button className="evap-btn" onClick={sim.heating ? pause : play} style={{ ...btn('highlight'), flex: 1 }}>
                    {sim.heating ? '⏸ Pause' : '▶ Heat it'}
                  </button>
                )}
                {sim.stage === 'boiled' && (
                  <button className="evap-btn" onClick={coolDown} style={{ ...btn('primary'), flex: 1,
                    boxShadow: hl === 'salt_crystals' ? `0 0 0 3px ${C.orange}` : '0 6px 16px rgba(74,77,201,.28)' }}>
                    ❄️ Cool the dish
                  </button>
                )}
                {sim.stage === 'done' && !isLastRound && (
                  <button className="evap-btn" onClick={nextRound} style={{ ...btn('primary'), flex: 1 }}>
                    Next mixture ▶
                  </button>
                )}
                {sim.stage === 'done' && isLastRound && !sim.finished && (
                  <button className="evap-btn" onClick={finish} style={{ ...btn('success'), flex: 1 }}>
                    🏁 Finish
                  </button>
                )}
                <button className="evap-btn" onClick={() => { muted.current = !muted.current; force(x => x + 1); }}
                  style={{ ...btn('ghost'), minWidth: touchH(44), padding: 0 }}>
                  {muted.current ? '🔇' : '🔊'}
                </button>
              </div>
            </div>
          )}

          {/* AI mode compact hint (lean demo) */}
          {isAI && (
            <div style={{ background: '#fff', borderRadius: 20, padding: 14, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.soft }}>
              👩‍🏫 Your teacher is running a quick demo. Watch the water turn to vapour and rise — then see the salt that stays behind.
            </div>
          )}

          {/* the big idea / reveal */}
          {sim.stage === 'done' && (
            <div style={{ background: `linear-gradient(135deg,${C.purple},${C.primary})`, color: '#fff', borderRadius: 20, padding: 14,
              boxShadow: '0 10px 24px rgba(74,77,201,.35)', animation: 'pop .5s ease both' }}>
              <div style={{ fontWeight: 800, fontSize: 'clamp(13px,1.6vw,17px)', marginBottom: 4 }}>✨ Evaporation!</div>
              <div style={{ fontSize: 'clamp(11px,1.35vw,14px)', lineHeight: 1.5 }}>
                The <b>water turned to vapour</b> and floated away. The dissolved <b>salt can't evaporate</b>, so it stayed as solid crystals. That is how we get salt back.
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ===== FULL-SCREEN Finish screen (§6.3/§7.4) — evaluating tool: stars + what-you-learned ===== */}
      {sim.finished && (
        <div className="evap-confetti" aria-hidden={false} role="dialog" aria-label="Activity finished" style={{
          position: 'absolute', inset: 0, zIndex: 9999, pointerEvents: 'none', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box',
          animation: reduce.current ? undefined : 'riseIn .3s ease both',
          background: 'radial-gradient(1200px 700px at 50% 40%, rgba(74,77,201,.16), rgba(255,255,255,.96) 70%)',
        }}>
          {celebrate && !reduce.current && Array.from({ length: 54 }).map((_, i) => {
            const cols = [C.primary, C.fcOrange, C.orange, C.purple, C.success, '#7fb8e6'];
            const left = (i * 2.17 + (i % 5) * 3) % 100;
            const dur = 2.4 + (i % 6) * 0.35;
            const delay = (i % 10) * 0.12;
            const sz = 7 + (i % 4) * 3;
            return (
              <span key={i} style={{
                position: 'absolute', top: '-6vh', left: `${left}%`, width: sz, height: sz * 1.4,
                background: cols[i % cols.length], borderRadius: 2, opacity: 0.95,
                animation: `confettiFall ${dur}s linear ${delay}s 1`,
              }} />
            );
          })}
          <div style={{
            position: 'relative',
            textAlign: 'center', animation: 'badgePop .6s cubic-bezier(.22,1.4,.4,1) both',
            width: 'min(440px, 100%)', maxHeight: '100%', overflow: 'auto',
            background: '#fff', borderRadius: 28, padding: 'clamp(16px,3vw,26px)',
            boxShadow: '0 30px 70px rgba(26,26,46,.28)', boxSizing: 'border-box', pointerEvents: 'auto',
          }}>
            <div style={{ fontSize: 'clamp(28px,6vw,52px)' }}>🧂✨</div>
            <div style={{ fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 900, fontSize: 'clamp(18px,4vw,32px)',
              background: `linear-gradient(135deg,${C.purple},${C.fcOrange})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Well done!
            </div>
            <div style={{ fontSize: 'clamp(24px,5vw,38px)', letterSpacing: 4, margin: '4px 0 6px' }}>
              {'⭐'.repeat(Math.max(0, Math.min(3, sim.score)))}{'☆'.repeat(Math.max(0, 3 - sim.score))}
            </div>
            <div style={{ fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 800, color: C.primary, fontSize: 'clamp(12px,1.8vw,16px)', marginBottom: 12 }}>
              You correctly predicted {sim.score}/{totalRounds} mixtures 🎉
            </div>
            <div style={{ textAlign: 'left', background: C.surface, borderRadius: 16, padding: '12px 14px' }}>
              <div style={{ fontWeight: 800, fontSize: 'clamp(12px,1.6vw,14px)', color: C.text, marginBottom: 6 }}>✅ What you learned</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 'clamp(11px,1.4vw,13px)', color: C.soft, lineHeight: 1.55 }}>
                <li>Heating turns the water in a salt solution into vapour, which escapes the dish.</li>
                <li>Dissolved salt cannot vaporise, so it stays behind as a solid.</li>
                <li>More dissolved salt leaves more solid salt once the water is gone.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tool;