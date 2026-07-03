// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: water_disappearing_act_tool.tsx
//
// NCERT Grade 6 Science — Chapter 8 "A Journey through States of Water"
// Activity 8.2: "Let us investigate" — Does water seep through a steel plate,
// or does it leave as vapour?
//
// NOTE ON SYNTAX: This file is written as PLAIN JS inside a .tsx so it survives
// the runner's regex-based type-stripper. There are intentionally NO TypeScript
// type annotations, interfaces, generics, enums, or `as` casts anywhere.
// All prop documentation lives in the companion JSON schema instead.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, RotateCcw, RefreshCw, Check, ChevronLeft, ChevronRight, Droplets, Lightbulb, Eye, FlaskConical } from 'lucide-react';

// ==================== DESIGN TOKENS (Singularity design system) ====================

const C = {
  primary: '#4A4DC9',
  primaryDeep: '#533086',
  secondary: '#FF7212',
  secondarySoft: '#FC9145',
  lilac: '#C1C1EA',
  peach: '#FFF3E4',
  ink: '#4E4E4E',
  grey: '#CACACA',
  greyLight: '#EBEBEB',
  surface: '#F5F5F5',
  white: '#FFFFFF',
  good: '#2E9E6B',
  font: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  gradient: 'linear-gradient(135deg, #533086 0%, #FC9145 100%)',
  gradientSoft: 'linear-gradient(135deg, #C1C1EA 0%, #FFF3E4 100%)',
};

// ==================== HELPERS ====================

const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp01((p - a) / (b - a));

// organic water blob path centred at origin (~rx 80, ry 21)
const BLOB = 'M -80 0 C -80 -15 -42 -23 0 -21 C 48 -23 82 -12 80 1 C 82 17 42 23 -2 21 C -46 23 -80 16 -80 0 Z';

// build a tapered water column (filled body + centre highlight) from lip -> puddle.
// single smooth quadratic centreline, so there is never an S-kink.
function buildStream(lx, ly, Lx, Ly) {
  const cxq = lx + (Lx - lx) * 0.5;
  const cyq = ly + (Ly - ly) * 0.62;
  const N = 12;
  const Lp = [];
  const Rp = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    const bx = mt * mt * lx + 2 * mt * t * cxq + t * t * Lx;
    const by = mt * mt * ly + 2 * mt * t * cyq + t * t * Ly;
    const dx = 2 * mt * (cxq - lx) + 2 * t * (Lx - cxq);
    const dy = 2 * mt * (cyq - ly) + 2 * t * (Ly - cyq);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = (lerp(6.5, 3.0, t) + 1.6 * Math.sin(t * Math.PI)) / 2;
    Lp.push([bx + nx * w, by + ny * w]);
    Rp.push([bx - nx * w, by - ny * w]);
  }
  let d = `M ${Lp[0][0].toFixed(1)} ${Lp[0][1].toFixed(1)} `;
  for (let i = 1; i <= N; i++) d += `L ${Lp[i][0].toFixed(1)} ${Lp[i][1].toFixed(1)} `;
  for (let i = N; i >= 0; i--) d += `L ${Rp[i][0].toFixed(1)} ${Rp[i][1].toFixed(1)} `;
  d += 'Z';
  const c = `M ${lx.toFixed(1)} ${ly.toFixed(1)} Q ${cxq.toFixed(1)} ${cyq.toFixed(1)} ${Lx} ${Ly}`;
  return { body: d, center: c };
}

// soft drifting steam wisps (HTML overlay) — slow, gentle rise for a natural plume
const STEAM = [
  { id: 0, x: -28, w: 16, h: 18, dur: 8.6, delay: 0.0, drift: -22, peak: 0.5 },
  { id: 1, x: -12, w: 13, h: 15, dur: 9.8, delay: 1.6, drift: 14, peak: 0.42 },
  { id: 2, x: 2, w: 18, h: 20, dur: 7.8, delay: 3.1, drift: -12, peak: 0.55 },
  { id: 3, x: 16, w: 12, h: 14, dur: 10.6, delay: 0.8, drift: 20, peak: 0.4 },
  { id: 4, x: 28, w: 15, h: 17, dur: 9.0, delay: 4.4, drift: 10, peak: 0.48 },
  { id: 5, x: -4, w: 11, h: 13, dur: 11.2, delay: 5.7, drift: -16, peak: 0.36 },
  { id: 6, x: 10, w: 14, h: 16, dur: 8.8, delay: 2.4, drift: 16, peak: 0.44 },
  { id: 7, x: -18, w: 12, h: 14, dur: 10.2, delay: 6.5, drift: -8, peak: 0.38 },
];

// ==================== STATIC CONTENT ====================

const PREDICTIONS = [
  { id: 'seep', label: 'It seeps through to the underside', emoji: '⬇️', correct: false },
  { id: 'vapour', label: 'It turns into vapour and rises up', emoji: '☁️', correct: true },
  { id: 'vanish', label: 'It simply vanishes into nothing', emoji: '✨', correct: false },
  { id: 'stay', label: 'It stays the same forever', emoji: '⏸️', correct: false },
];

const PHASES = [
  { key: 'predict', label: 'Predict', icon: Lightbulb },
  { key: 'observe', label: 'Observe', icon: Eye },
  { key: 'flip', label: 'Check', icon: RefreshCw },
  { key: 'conclude', label: 'Conclude', icon: Check },
];

const REAL_WORLD = [
  { id: 'puddle', emoji: '🌧️', title: 'Drying puddles', note: 'Rain puddles in the playground shrink and vanish on a sunny day — the water becomes vapour.' },
  { id: 'clothes', emoji: '👕', title: 'Wet clothes', note: 'Clothes on a line dry because the water in them evaporates into the air around us.' },
  { id: 'dosa', emoji: '🍳', title: 'Water on a hot pan', note: 'A few drops sprinkled on a hot tawa hiss and disappear quickly as steam (water vapour).' },
  { id: 'sanitiser', emoji: '🧴', title: 'Hand sanitiser', note: 'Sanitiser disappears as you rub it — it evaporates, leaving your hands feeling cool.' },
];

// ==================== SVG: THE PLATE (top face, with spoon + pour) ====================

function PlateTopFace(props) {
  const amount = clamp01(props.amount);
  const p = clamp01(props.pourProgress);
  const showSpoon = props.showSpoon;

  // water blob scale — a single tablespoon makes only a small puddle
  const s = 0.1 + 0.4 * amount;

  // spoon pour kinematics
  const enter = seg(p, 0, 0.3);
  const tilt = seg(p, 0.32, 0.6);
  const retract = seg(p, 0.82, 1);
  const rot = -44 * tilt * (1 - retract);
  const tx = lerp(140, 0, enter) + 70 * retract;
  const ty = lerp(-36, 0, enter) - 52 * retract;
  const bowlWater = clamp01(1 - seg(p, 0.34, 0.78));
  const streamOn = showSpoon && p > 0.36 && p < 0.82;

  // spoon centre + the actual lip point (so the stream always starts at the lip)
  const cx = 176 + tx;
  const cy = 70 + ty;
  const rad = (rot * Math.PI) / 180;
  const lipX = cx + (-19 * Math.cos(rad) - 7 * Math.sin(rad));
  const lipY = cy + (-19 * Math.sin(rad) + 7 * Math.cos(rad));
  const stream = buildStream(lipX, lipY, 180, 150);

  return (
    <svg viewBox="0 0 360 260" width="100%" style={{ display: 'block' }} aria-hidden="true">
      <defs>
        <radialGradient id="steelTop" cx="40%" cy="30%" r="85%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#E4E6EF" />
          <stop offset="72%" stopColor="#C5C8D8" />
          <stop offset="100%" stopColor="#9EA2B8" />
        </radialGradient>
        <radialGradient id="steelWell" cx="42%" cy="34%" r="80%">
          <stop offset="0%" stopColor="#F3F4FA" />
          <stop offset="70%" stopColor="#D2D5E2" />
          <stop offset="100%" stopColor="#B4B8CB" />
        </radialGradient>
        <radialGradient id="waterFill" cx="38%" cy="28%" r="85%">
          <stop offset="0%" stopColor="#A9E3F7" />
          <stop offset="45%" stopColor="#5BBDEA" />
          <stop offset="100%" stopColor="#2C8FCD" />
        </radialGradient>
        <radialGradient id="spoonG" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#D7DAE6" />
          <stop offset="100%" stopColor="#A6AABF" />
        </radialGradient>
      </defs>

      {/* shadow */}
      <ellipse cx="180" cy="206" rx="150" ry="24" fill="#533086" opacity="0.10" />
      {/* side wall */}
      <path d="M30 150 A150 50 0 0 0 330 150 L330 160 A150 50 0 0 1 30 160 Z" fill="#9398AE" />
      {/* plate top */}
      <ellipse cx="180" cy="150" rx="150" ry="50" fill="url(#steelTop)" stroke="#8B8FA6" strokeWidth="1.5" />
      <ellipse cx="180" cy="151" rx="126" ry="41" fill="url(#steelWell)" />
      {/* concentric grooves */}
      <ellipse cx="180" cy="151" rx="104" ry="33" fill="none" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.5" />
      <ellipse cx="180" cy="151" rx="80" ry="25" fill="none" stroke="#AFB3C6" strokeWidth="1.2" opacity="0.6" />
      <ellipse cx="180" cy="151" rx="56" ry="17" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.45" />
      {/* specular highlight */}
      <path d="M64 134 A150 50 0 0 1 250 124" fill="none" stroke="#FFFFFF" strokeWidth="4" opacity="0.75" strokeLinecap="round" className="sn-shimmer" />

      {/* water puddle */}
      {amount <= 0.02 ? (
        <text x="180" y="156" textAnchor="middle" fontFamily={C.font} fontSize="12" fontWeight="600" fill="#7B8097">
          plate is dry
        </text>
      ) : (
        <g transform={`translate(180,154) scale(${s.toFixed(3)},${s.toFixed(3)})`} opacity="0.97" style={{ transition: 'opacity 300ms ease' }}>
          <path d={BLOB} fill="url(#waterFill)" />
          <path d={BLOB} fill="none" stroke="#2C8FCD" strokeWidth="1.5" opacity="0.4" />
          <ellipse cx="-26" cy="-7" rx="26" ry="7" fill="#FFFFFF" opacity="0.55" />
          <ellipse cx="30" cy="5" rx="14" ry="4" fill="#FFFFFF" opacity="0.3" />
        </g>
      )}

      {/* pour stream — a tapered water column from the spoon lip into the puddle */}
      {streamOn ? (
        <g>
          <path d={stream.body} fill="url(#waterFill)" opacity="0.96" />
          <path d={stream.body} fill="none" stroke="#2C8FCD" strokeWidth="0.8" opacity="0.35" />
          <path d={stream.center} fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" strokeDasharray="6 10" className="sn-flow" />
          <g className="sn-splash">
            <circle cx="180" cy="150" r="11" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.5" />
          </g>
        </g>
      ) : null}

      {/* the tablespoon */}
      {showSpoon ? (
        <g transform={`translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${rot.toFixed(2)})`}>
          <rect x="16" y="-9" width="62" height="8" rx="4" fill="url(#spoonG)" stroke="#9094AA" strokeWidth="0.8" transform="rotate(-9)" />
          <ellipse cx="0" cy="0" rx="23" ry="15" fill="url(#spoonG)" stroke="#9094AA" strokeWidth="1" />
          <ellipse cx="0" cy="-1" rx="17" ry="10" fill="#C9CDDD" />
          {bowlWater > 0.03 ? <ellipse cx="-3" cy="0" rx={(15 * bowlWater).toFixed(1)} ry={(8 * bowlWater).toFixed(1)} fill="url(#waterFill)" opacity="0.95" /> : null}
          <ellipse cx="-7" cy="-6" rx="8" ry="3" fill="#FFFFFF" opacity="0.6" />
        </g>
      ) : null}
    </svg>
  );
}

// ==================== SVG: underside (for the flip / seep check) ====================

function PlateBottomFace() {
  return (
    <svg viewBox="0 0 360 260" width="100%" style={{ display: 'block', transform: 'scaleY(-1)' }} aria-hidden="true">
      <defs>
        <radialGradient id="steelBottom" cx="44%" cy="60%" r="82%">
          <stop offset="0%" stopColor="#FCFCFF" />
          <stop offset="60%" stopColor="#D4D7E4" />
          <stop offset="100%" stopColor="#A4A8BD" />
        </radialGradient>
      </defs>
      <ellipse cx="180" cy="206" rx="150" ry="24" fill="#533086" opacity="0.10" />
      <path d="M40 150 A140 70 0 0 0 320 150 A140 44 0 0 1 40 150 Z" fill="url(#steelBottom)" stroke="#8B8FA6" strokeWidth="1.5" />
      <ellipse cx="180" cy="150" rx="92" ry="26" fill="none" stroke="#AFB3C6" strokeWidth="1.4" opacity="0.6" />
      <ellipse cx="180" cy="150" rx="62" ry="17" fill="none" stroke="#9DA1B6" strokeWidth="3" />
      <path d="M95 138 A140 60 0 0 1 265 138" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
    </svg>
  );
}

// ==================== MAIN COMPONENT ====================

const WaterDisappearingActTool = ({ props = {}, setStepDetails, stopAutoNext, setStopAutoNext }) => {
  const additionalProps = props.additionalProps || {};

  const config = useMemo(
    () => ({
      initialMode: props.initialMode || 'investigate',
      showModeSelector: props.showModeSelector !== false,
      enabledModes: props.enabledModes || ['investigate', 'explore'],
      themeColor: props.themeColor || C.primary,
      totalMinutes: additionalProps.totalMinutes || 30,
      runSeconds: additionalProps.runSeconds || 18,
      showVapour: additionalProps.showVapour !== false,
      initialPhase: additionalProps.initialPhase || 'predict',
    }),
    [props, additionalProps]
  );

  // ---------- responsiveness ----------
  const rootRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(900);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.getBoundingClientRect().width || 900);
    update();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
    }
    window.addEventListener('resize', update);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);
  const isNarrow = containerWidth < 760;

  // ---------- state ----------
  const phaseOrder = PHASES.map((x) => x.key);
  const [mode, setMode] = useState(config.initialMode);
  const [phaseIndex, setPhaseIndex] = useState(Math.max(0, phaseOrder.indexOf(config.initialPhase)));
  const phase = phaseOrder[phaseIndex];

  const [prediction, setPrediction] = useState(null);
  const [progress, setProgress] = useState(0); // evaporation 0..1
  const [isPlaying, setIsPlaying] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [activeExample, setActiveExample] = useState(REAL_WORLD[0].id);

  // pour state machine
  const [pourProgress, setPourProgress] = useState(1); // 1 = already poured (static contexts)
  const [pouring, setPouring] = useState(false);

  const evapRaf = useRef(0);
  const evapStart = useRef(0);
  const evapBase = useRef(0);
  const pourRaf = useRef(0);
  const pourStart = useRef(0);

  // ---------- keyframes + font ----------
  useEffect(() => {
    const css = `
      @keyframes sn-fadeUp { from { opacity: 0; transform: translateY(16px);} to {opacity:1; transform: translateY(0);} }
      @keyframes sn-pop { 0% { transform: scale(0.85); opacity: 0;} 70% { transform: scale(1.04);} 100% { transform: scale(1); opacity:1;} }
      @keyframes sn-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(74,77,201,0.35);} 50% { box-shadow: 0 0 0 10px rgba(74,77,201,0);} }
      @keyframes sn-shimmer { 0%,100% { opacity: 0.55;} 50% { opacity: 0.92;} }
      @keyframes sn-flow { from { stroke-dashoffset: 0;} to { stroke-dashoffset: -36;} }
      @keyframes sn-splash { 0% { transform: scale(0.45); opacity: 0.55;} 100% { transform: scale(1.5); opacity: 0;} }
      @keyframes sn-steam {
        0%   { opacity: 0; transform: translate(0px, 6px) scale(0.45); }
        14%  { opacity: var(--peak, 0.5); }
        45%  { transform: translate(calc(var(--drift, 0px) * 0.4), -42px) scale(1.15); }
        75%  { opacity: calc(var(--peak, 0.5) * 0.4); }
        100% { opacity: 0; transform: translate(var(--drift, 0px), -104px) scale(1.95); }
      }
      .sn-shimmer { animation: sn-shimmer 3.5s ease-in-out infinite; }
      .sn-flow { animation: sn-flow 0.55s linear infinite; }
      .sn-splash { transform-box: fill-box; transform-origin: center; animation: sn-splash 1.1s ease-out infinite; }
      .sn-steam { animation-name: sn-steam; animation-timing-function: cubic-bezier(0.33, 0, 0.2, 1); animation-iteration-count: infinite; }
      .sn-btn { transition: transform .18s ease, box-shadow .2s ease, background .2s ease, color .2s ease, border-color .2s ease; }
      .sn-btn:hover { transform: translateY(-2px); }
      .sn-btn:active { transform: translateY(0) scale(0.97); }
      .sn-card { transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
    `;
    const tag = document.createElement('style');
    tag.id = 'water-act-keyframes';
    tag.textContent = css;
    document.head.appendChild(tag);
    if (!document.getElementById('sn-poppins')) {
      const link = document.createElement('link');
      link.id = 'sn-poppins';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
    return () => {
      const ex = document.getElementById('water-act-keyframes');
      if (ex) document.head.removeChild(ex);
    };
  }, []);

  // ---------- pour animation ----------
  const startPour = useCallback(() => {
    cancelAnimationFrame(pourRaf.current);
    setPouring(true);
    setPourProgress(0);
    pourStart.current = 0;
    const dur = 2.2;
    const step = (now) => {
      if (!pourStart.current) pourStart.current = now;
      const t = clamp01((now - pourStart.current) / 1000 / dur);
      setPourProgress(t);
      if (t < 1) {
        pourRaf.current = requestAnimationFrame(step);
      } else {
        setPouring(false);
      }
    };
    pourRaf.current = requestAnimationFrame(step);
  }, []);

  // ---------- evaporation animation ----------
  const tick = useCallback(
    (now) => {
      if (!evapStart.current) evapStart.current = now;
      const elapsed = (now - evapStart.current) / 1000;
      const span = Math.max(1, config.runSeconds);
      const next = clamp01(evapBase.current + elapsed / span);
      setProgress(next);
      if (next < 1) {
        evapRaf.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
      }
    },
    [config.runSeconds]
  );

  useEffect(() => {
    if (isPlaying) {
      evapStart.current = 0;
      evapBase.current = progress;
      evapRaf.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(evapRaf.current);
    }
    return () => cancelAnimationFrame(evapRaf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // auto-pour whenever we enter the observe phase
  useEffect(() => {
    if (phase === 'observe') {
      setIsPlaying(false);
      setProgress(0);
      evapBase.current = 0;
      startPour();
    }
    return () => cancelAnimationFrame(pourRaf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // report status upward (optional integration)
  useEffect(() => {
    if (typeof setStepDetails === 'function') {
      setStepDetails({ currentStep: phaseIndex + 1, totalSteps: PHASES.length, isPaused: !isPlaying, currentMode: mode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseIndex, isPlaying, mode]);

  useEffect(() => {
    if (typeof setStopAutoNext === 'function') setStopAutoNext(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- derived ----------
  const pourFill = seg(pourProgress, 0.34, 0.82);
  // linear evaporation: the timeline, the minutes, and the water % all advance together
  const amount = clamp01(pourFill * (1 - progress));
  const elapsedMinutes = Math.round(progress * config.totalMinutes);
  const fullyGone = progress >= 0.999;
  const showSteam = config.showVapour && isPlaying && amount > 0.05 && amount < 0.99 && !flipped;

  // ---------- handlers ----------
  const resetAndPour = () => {
    setIsPlaying(false);
    setProgress(0);
    evapBase.current = 0;
    evapStart.current = 0;
    startPour();
  };
  const goPhase = (i) => {
    const clamped = Math.max(0, Math.min(PHASES.length - 1, i));
    setPhaseIndex(clamped);
    if (phaseOrder[clamped] !== 'flip') setFlipped(false);
    // bring the experiment back into view so the next step's animation starts in sight
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        const el = rootRef.current;
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  };

  // ---------- shared styles ----------
  const pill = (variant, color) => {
    const base = {
      fontFamily: C.font,
      fontWeight: 600,
      fontSize: 'clamp(13px, 1.6vw, 15px)',
      padding: '11px 24px',
      borderRadius: 999,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      lineHeight: 1,
    };
    if (variant === 'contained') return { ...base, background: color || C.primary, color: C.white, border: 'none', boxShadow: '0 6px 16px rgba(74,77,201,0.28)' };
    if (variant === 'outlined') return { ...base, background: C.white, color: color || C.primary, border: `2px solid ${color || C.primary}` };
    return { ...base, background: 'transparent', color: color || C.primary, border: 'none', boxShadow: 'none' };
  };

  // ==================== HEADER ====================
  const Header = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: C.gradient, display: 'grid', placeItems: 'center', color: C.white, flexShrink: 0 }}>
          <FlaskConical size={22} />
        </div>
        <div>
          <div style={{ fontSize: 'clamp(17px, 2.6vw, 22px)', fontWeight: 700, color: C.primaryDeep, lineHeight: 1.15 }}>Water's Disappearing Act</div>
          <div style={{ fontSize: 'clamp(11px, 1.6vw, 13px)', color: C.ink, fontWeight: 500 }}>Activity 8.2 · Does water seep through, or evaporate?</div>
        </div>
      </div>

      {config.showModeSelector ? (
        <div style={{ display: 'inline-flex', background: C.surface, padding: 4, borderRadius: 999, gap: 4 }}>
          {config.enabledModes.map((m) => {
            const on = mode === m;
            return (
              <button key={m} className="sn-btn" onClick={() => setMode(m)} style={{ ...pill(on ? 'contained' : 'text'), padding: '8px 16px', boxShadow: on ? '0 4px 10px rgba(74,77,201,0.3)' : 'none', color: on ? C.white : C.ink }}>
                {m === 'investigate' ? 'Investigate' : 'Everyday examples'}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  // ==================== SIM STAGE ====================
  const Stage = (
    <div
      style={{
        flex: isNarrow ? 'none' : '1.45 1 0',
        width: isNarrow ? '100%' : 'auto',
        background: C.gradientSoft,
        borderRadius: 22,
        padding: 'clamp(12px, 2.5vw, 22px)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 250,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ perspective: 1100, width: '100%', maxWidth: 460, margin: '0 auto', position: 'relative' }}>
        {/* flip card */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 700ms cubic-bezier(.4,0,.2,1)',
            transform: flipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
          }}
        >
          <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <PlateTopFace amount={amount} pourProgress={pourProgress} showSpoon={pouring} />
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}>
            <PlateBottomFace />
          </div>
        </div>

        {/* natural rising steam (HTML overlay, aligned to the puddle) */}
        {showSteam ? (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {STEAM.map((wisp) => (
              <span key={wisp.id} style={{ position: 'absolute', left: `calc(50% + ${wisp.x}px)`, bottom: '38%', transform: 'translateX(-50%)' }}>
                <span
                  className="sn-steam"
                  style={{
                    display: 'block',
                    width: wisp.w,
                    height: wisp.h,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.95), rgba(255,255,255,0))',
                    filter: 'blur(3px)',
                    animationDuration: wisp.dur + 's',
                    animationDelay: wisp.delay + 's',
                    ['--drift']: wisp.drift + 'px',
                    ['--peak']: wisp.peak,
                  }}
                />
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* caption */}
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 'clamp(11px,1.5vw,12.5px)', fontStyle: 'italic', color: C.primaryDeep, opacity: 0.85 }}>
        One tablespoon of water on a steel plate
      </div>

      {/* status chips */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <Chip icon={<span style={{ fontSize: 13 }}>⏱️</span>} text={`${elapsedMinutes} min`} />
        <Chip icon={<Droplets size={14} color={C.primary} />} text={`Water left: ${Math.round(amount * 100)}%`} />
        {flipped ? (
          <Chip icon={<Check size={14} color={C.good} />} text="Underside is dry" tone="good" />
        ) : pouring ? (
          <Chip icon={<Droplets size={14} color={C.secondary} />} text="Pouring…" tone="warm" />
        ) : showSteam ? (
          <Chip icon={<span style={{ fontSize: 13 }}>💨</span>} text="Vapour rising" tone="warm" />
        ) : null}
      </div>
    </div>
  );

  // ==================== CONTROL PANEL ====================
  let Panel = null;

  if (phase === 'predict') {
    Panel = (
      <div style={{ animation: 'sn-fadeUp .4s ease both' }}>
        <PanelTitle icon={<Lightbulb size={18} />} text="Make a prediction" />
        <p style={panelText}>A tablespoon of water sits on a steel plate. Where do you think the water will go as time passes?</p>
        <div style={{ display: 'grid', gap: 10, marginTop: 6 }}>
          {PREDICTIONS.map((opt) => {
            const chosen = prediction === opt.id;
            const reveal = prediction !== null;
            let border = `2px solid ${C.greyLight}`;
            let bg = C.white;
            if (chosen) { border = `2px solid ${C.primary}`; bg = '#F2F2FB'; }
            if (reveal && opt.correct) { border = `2px solid ${C.good}`; bg = '#EAF7F1'; }
            return (
              <button key={opt.id} className="sn-card sn-btn" onClick={() => setPrediction(opt.id)} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, border, background: bg, cursor: 'pointer', fontFamily: C.font, fontSize: 'clamp(13px,1.7vw,14.5px)', fontWeight: 500, color: C.ink }}>
                <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                <span style={{ flex: 1 }}>{opt.label}</span>
                {reveal && opt.correct ? <Check size={18} color={C.good} /> : null}
              </button>
            );
          })}
        </div>
        {prediction ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ background: prediction === 'vapour' ? '#EAF7F1' : C.peach, border: `1px solid ${prediction === 'vapour' ? '#BFE6D2' : '#F6D8B8'}`, borderRadius: 14, padding: '12px 14px', fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>
              {prediction === 'vapour' ? 'Good thinking! Let\u2019s run the experiment and watch it happen — then flip the plate to be sure.' : 'Interesting guess. Let\u2019s run the experiment and watch carefully — the plate will reveal the answer.'}
            </div>
            <button className="sn-btn" onClick={() => goPhase(1)} style={{ ...pill('contained'), marginTop: 12, width: '100%', justifyContent: 'center' }}>
              Start the experiment <ChevronRight size={18} />
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (phase === 'observe') {
    Panel = (
      <div style={{ animation: 'sn-fadeUp .4s ease both' }}>
        <PanelTitle icon={<Eye size={18} />} text="Observe at regular intervals" />
        <p style={panelText}>The spoon pours one tablespoon of water onto the plate. Play the timer and watch the puddle — notice the faint vapour rising as the water changes into water vapour.</p>

        <div style={{ margin: '16px 0 6px' }}>
          <div style={{ position: 'relative', height: 14, borderRadius: 999, background: C.greyLight }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress * 100}%`, background: C.gradient, borderRadius: 999 }} />
            </div>
            {[0.25, 0.5, 0.75].map((t) => (
              <span key={t} style={{ position: 'absolute', left: `${t * 100}%`, top: '50%', width: 2, height: 8, marginLeft: -1, transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.75)', borderRadius: 2 }} />
            ))}
            <span style={{ position: 'absolute', left: `${progress * 100}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 14, height: 14, borderRadius: '50%', background: C.white, border: `3px solid ${C.secondary}`, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: C.ink, fontWeight: 500 }}>
            <span>0 min</span>
            <span>{Math.round(config.totalMinutes / 2)} min</span>
            <span>{config.totalMinutes} min</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          <button
            className="sn-btn"
            disabled={pouring}
            onClick={() => (fullyGone ? resetAndPour() : setIsPlaying((v) => !v))}
            style={{ ...pill('contained'), flex: 1, justifyContent: 'center', minWidth: 130, opacity: pouring ? 0.5 : 1, cursor: pouring ? 'default' : 'pointer', animation: !isPlaying && !fullyGone && !pouring ? 'sn-pulse 2s infinite' : 'none' }}
          >
            {pouring ? <Droplets size={18} /> : fullyGone ? <RotateCcw size={18} /> : isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {pouring ? 'Filling…' : fullyGone ? 'Run again' : isPlaying ? 'Pause' : 'Play timer'}
          </button>
          <button className="sn-btn" onClick={resetAndPour} style={{ ...pill('outlined'), justifyContent: 'center' }}>
            <RotateCcw size={18} /> Reset
          </button>
        </div>

        <div style={{ marginTop: 14, background: C.surface, borderRadius: 14, padding: '12px 14px', fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>
          {pouring
            ? 'Pouring one tablespoon of water onto the steel plate…'
            : fullyGone
            ? 'The plate is now completely dry — all the water has disappeared. But where did it go? Let\u2019s check the underside.'
            : progress > 0.05
            ? 'The puddle is getting smaller and smaller. The water level on the plate keeps dropping.'
            : 'Press play to begin observing. Check the plate at each interval, just like in the textbook.'}
        </div>

        {fullyGone ? (
          <button className="sn-btn" onClick={() => goPhase(2)} style={{ ...pill('contained', C.secondary), marginTop: 12, width: '100%', justifyContent: 'center' }}>
            Check the underside <ChevronRight size={18} />
          </button>
        ) : null}
      </div>
    );
  }

  if (phase === 'flip') {
    Panel = (
      <div style={{ animation: 'sn-fadeUp .4s ease both' }}>
        <PanelTitle icon={<RefreshCw size={18} />} text="Did any water seep through?" />
        <p style={panelText}>Aavi wondered if the water soaked through the plate. Thirav disagreed. Flip the plate over and look for yourself.</p>
        <button className="sn-btn" onClick={() => setFlipped((v) => !v)} style={{ ...pill('contained'), width: '100%', justifyContent: 'center', marginTop: 6 }}>
          <RefreshCw size={18} /> {flipped ? 'Flip back to the top' : 'Flip the plate over'}
        </button>
        {flipped ? (
          <div style={{ marginTop: 14, background: '#EAF7F1', border: '1px solid #BFE6D2', borderRadius: 14, padding: '12px 14px', fontSize: 13.5, color: C.ink, lineHeight: 1.5, animation: 'sn-pop .35s ease both' }}>
            <strong style={{ color: C.good }}>The underside is completely dry.</strong> No water seeped through the steel plate — steel does not let water pass through it. So the water must have left another way.
          </div>
        ) : null}
        {flipped ? (
          <button className="sn-btn" onClick={() => goPhase(3)} style={{ ...pill('contained', C.secondary), marginTop: 12, width: '100%', justifyContent: 'center' }}>
            What\u2019s the conclusion? <ChevronRight size={18} />
          </button>
        ) : null}
      </div>
    );
  }

  if (phase === 'conclude') {
    const guessedRight = prediction === 'vapour';
    Panel = (
      <div style={{ animation: 'sn-fadeUp .4s ease both' }}>
        <PanelTitle icon={<Check size={18} />} text="What we found out" />
        <div style={{ background: C.gradient, color: C.white, borderRadius: 16, padding: 16, lineHeight: 1.55, fontSize: 'clamp(13.5px,1.8vw,15px)' }}>
          The water did <strong>not</strong> seep through the steel plate. It changed into an invisible gas called <strong>water vapour</strong> and rose into the air. This process is called <strong>evaporation</strong>.
        </div>
        <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          <FactRow emoji="🛡️" text="Steel is not porous — water cannot pass through it." />
          <FactRow emoji="☁️" text="Liquid water turned into water vapour (a gas)." />
          <FactRow emoji="🌡️" text="Evaporation happens even at room temperature." />
        </div>
        {prediction ? (
          <div style={{ marginTop: 14, background: guessedRight ? '#EAF7F1' : C.peach, border: `1px solid ${guessedRight ? '#BFE6D2' : '#F6D8B8'}`, borderRadius: 14, padding: '12px 14px', fontSize: 13, color: C.ink }}>
            {guessedRight ? 'Your prediction was spot on — the water evaporated!' : 'Your first guess was different — now you\u2019ve seen the real answer through investigation.'}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="sn-btn" onClick={() => { setProgress(0); setPrediction(null); setFlipped(false); setPourProgress(1); goPhase(0); }} style={{ ...pill('outlined'), flex: 1, justifyContent: 'center' }}>
            <RotateCcw size={18} /> Start over
          </button>
          <button className="sn-btn" onClick={() => setMode('explore')} style={{ ...pill('contained', C.secondary), flex: 1, justifyContent: 'center' }}>
            See everyday examples <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ==================== PHASE STEPPER ====================
  const Stepper = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
      <button className="sn-btn" onClick={() => goPhase(phaseIndex - 1)} disabled={phaseIndex === 0} style={{ ...pill('text'), opacity: phaseIndex === 0 ? 0.35 : 1, padding: '8px 12px' }}>
        <ChevronLeft size={18} /> Back
      </button>
      <div style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
        {PHASES.map((ph, i) => {
          const Icon = ph.icon;
          const on = i === phaseIndex;
          const done = i < phaseIndex;
          return (
            <button key={ph.key} className="sn-btn" onClick={() => goPhase(i)} title={ph.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: C.font, fontWeight: 600, fontSize: 12.5, background: on ? C.primary : done ? '#E7E7F7' : C.surface, color: on ? C.white : done ? C.primary : C.ink }}>
              <Icon size={14} />
              {!isNarrow ? ph.label : null}
            </button>
          );
        })}
      </div>
      <button className="sn-btn" onClick={() => goPhase(phaseIndex + 1)} disabled={phaseIndex === PHASES.length - 1} style={{ ...pill('text'), opacity: phaseIndex === PHASES.length - 1 ? 0.35 : 1, padding: '8px 12px' }}>
        Next <ChevronRight size={18} />
      </button>
    </div>
  );

  // ==================== EXPLORE MODE ====================
  const ExploreView = (
    <div style={{ animation: 'sn-fadeUp .4s ease both' }}>
      <p style={{ ...panelText, marginTop: 0 }}>Evaporation is happening all around us — not just on a steel plate. Tap an example to learn more.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
        {REAL_WORLD.map((ex) => {
          const on = activeExample === ex.id;
          return (
            <button key={ex.id} className="sn-card sn-btn" onClick={() => setActiveExample(ex.id)} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 12px', borderRadius: 16, border: `2px solid ${on ? C.primary : C.greyLight}`, background: on ? '#F2F2FB' : C.white, fontFamily: C.font }}>
              <div style={{ fontSize: 30 }}>{ex.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: C.primaryDeep, marginTop: 6 }}>{ex.title}</div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 14, background: C.gradientSoft, borderRadius: 16, padding: 16, fontSize: 'clamp(13.5px,1.8vw,15px)', color: C.ink, lineHeight: 1.55, minHeight: 70 }}>
        {REAL_WORLD.find((e) => e.id === activeExample) ? REAL_WORLD.find((e) => e.id === activeExample).note : ''}
      </div>
      <button className="sn-btn" onClick={() => setMode('investigate')} style={{ ...pill('outlined'), marginTop: 14 }}>
        <ChevronLeft size={18} /> Back to the experiment
      </button>
    </div>
  );

  // ==================== LAYOUT ====================
  return (
    <div ref={rootRef} style={{ fontFamily: C.font, width: '100%', maxWidth: 960, margin: '0 auto', background: C.white, borderRadius: 24, padding: 'clamp(14px, 3vw, 26px)', boxShadow: '0 18px 50px rgba(83,48,134,0.12)', boxSizing: 'border-box', color: C.ink }}>
      {Header}
      {mode === 'explore' ? (
        ExploreView
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: isNarrow ? 'column' : 'row', gap: 18, alignItems: 'stretch' }}>
            {Stage}
            <div style={{ flex: isNarrow ? 'none' : '1 1 0', width: isNarrow ? '100%' : 'auto', minWidth: 0, background: C.white, border: `1px solid ${C.greyLight}`, borderRadius: 18, padding: 'clamp(14px, 2.4vw, 20px)', boxSizing: 'border-box' }}>
              {Panel}
            </div>
          </div>
          {Stepper}
        </>
      )}
    </div>
  );
};

// ==================== SMALL PRESENTATIONAL HELPERS ====================

const panelText = { fontSize: 'clamp(13px, 1.8vw, 14.5px)', color: C.ink, lineHeight: 1.55, margin: '6px 0 10px' };

function PanelTitle(props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ color: C.primary }}>{props.icon}</span>
      <h3 style={{ margin: 0, fontSize: 'clamp(15px,2.1vw,17px)', fontWeight: 700, color: C.primaryDeep, fontFamily: C.font }}>{props.text}</h3>
    </div>
  );
}

function Chip(props) {
  const tone = props.tone;
  const bg = tone === 'good' ? '#EAF7F1' : tone === 'warm' ? '#FFF3E4' : '#FFFFFF';
  const bd = tone === 'good' ? '#BFE6D2' : tone === 'warm' ? '#F6D8B8' : '#E7E7F7';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, border: `1px solid ${bd}`, borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, color: C.ink, fontFamily: C.font }}>
      {props.icon}
      {props.text}
    </span>
  );
}

function FactRow(props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface, borderRadius: 12, padding: '10px 12px', fontSize: 13.5, color: C.ink, fontFamily: C.font }}>
      <span style={{ fontSize: 18 }}>{props.emoji}</span>
      <span>{props.text}</span>
    </div>
  );
}

export default WaterDisappearingActTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════