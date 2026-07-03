// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: blowing_air_separation_lab.tsx
//
// Blowing-Air Separation Lab (Winnowing) — a friendly farmer stands on a raised
// platform and POURS a tray of rubbed peanuts (or wheat + husk) into the wind.
// The falling stream splits in mid-air: heavy grains drop straight into a pile
// while the light husk floats slowly and is carried far away by the moving air.
// The student commits a prediction first.
//
// Theme: Singularity (Poppins, purple #4A4DC9 / #533086, orange #FF7212 / #FC9145).
// Responsive from 320px. Real falling/pouring physics with air drag + wind.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ==================== INLINE ICONS (no external icon dependency) ====================
// Defined locally so the component never relies on an icon library being resolved
// at runtime (which previously caused "X is not defined" errors).

interface IconProps { size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({ size = 24, color = 'currentColor', strokeWidth = 2, style, children }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

const Play: React.FC<IconProps> = (p) => (<Svg {...p}><polygon points="6 3 20 12 6 21 6 3" fill={p.color ?? 'currentColor'} stroke="none" /></Svg>);
const RotateCcw: React.FC<IconProps> = (p) => (<Svg {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></Svg>);
const Wind: React.FC<IconProps> = (p) => (<Svg {...p}><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></Svg>);
const Check: React.FC<IconProps> = (p) => (<Svg {...p}><polyline points="20 6 9 17 4 12" /></Svg>);
const X: React.FC<IconProps> = (p) => (<Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>);
const ChevronRight: React.FC<IconProps> = (p) => (<Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>);
const Sparkles: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" fill={p.color ?? 'currentColor'} stroke="none" />
    <path d="M19 14.5l.7 2L22 17l-2.3.5L19 20l-.7-2.5L16 17l2.3-.5z" fill={p.color ?? 'currentColor'} stroke="none" />
  </Svg>
);

// ==================== TYPES ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';
type Phase = 'predict' | 'ready' | 'blowing' | 'result';
type MaterialKey = 'peanuts' | 'wheat';
type StrengthKey = 'gentle' | 'medium' | 'strong';
type GradeLevel = 6 | 7 | 8;

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

interface BlowingAirAdditionalProps {
  material?: MaterialKey;
  lockMaterial?: boolean;
  defaultStrength?: StrengthKey;
  heavyCount?: number;
  lightCount?: number;
  instructions?: string;
}

interface ToolProps {
  props?: {
    width?: number;
    height?: number;
    initialMode?: ModeType;
    showModeSelector?: boolean;
    enabledModes?: ModeType[];
    showNavigation?: boolean;
    showPlayPause?: boolean;
    showStepIndicator?: boolean;
    animationSpeed?: number;
    autoPlayDuration?: number;
    themeColor?: string;
    darkMode?: boolean;
    gradeLevel?: GradeLevel;
    additionalProps?: BlowingAirAdditionalProps;
  };
  setStepDetails?: (s: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ==================== DESIGN TOKENS (Singularity) ====================

const DS = {
  primary: '#4A4DC9',
  primaryDark: '#533086',
  primaryLight: '#C1C1EA',
  primaryGhost: '#EDEDF8',
  accent: '#FF7212',
  accentDark: '#FC9145',
  accentLight: '#FFF3E4',
  gray900: '#1A1A2E',
  gray700: '#4E4E4E',
  gray400: '#CACACA',
  gray200: '#EBEBEB',
  gray100: '#F5F5F5',
  white: '#FFFFFF',
  success: '#16A34A',
  successLight: '#DCFCE7',
  danger: '#E53E3E',
  amber: '#F59E0B',
  radii: { sm: 8, md: 12, lg: 16, xl: 24, pill: 9999 },
  headerGradient: 'linear-gradient(135deg, #533086 0%, #4A4DC9 60%, #FC9145 140%)',
  ctaGradient: 'linear-gradient(135deg, #FF7212 0%, #FC9145 100%)',
};

// ==================== TIER CONFIG ====================

const TIER_CONFIG = {
  6: {
    confettiCount: 70, scoreSizePx: 64, showStars: true, starCount: 3, starStaggerMs: 200,
    encouragement: {
      high: 'Brilliant! You think like a real farmer!',
      mid: "Nice try! Let's see what the wind taught us.",
      low: 'Good guess! Watch closely — the wind never lies.',
    },
    playAgainLabel: 'Try again!', reviewLabel: 'What we learned',
    heroFontMobile: 36, heroFontDesktop: 48, bodyFontMobile: 16, bodyFontDesktop: 17,
    touchTargetMobile: 56, storyFrame: true,
  },
  7: {
    confettiCount: 40, scoreSizePx: 56, showStars: true, starCount: 3, starStaggerMs: 200,
    encouragement: {
      high: 'Strong prediction — concept locked.',
      mid: 'Good — review what happened.',
      low: "Let's see why the wind behaved this way.",
    },
    playAgainLabel: 'Play again', reviewLabel: 'Review',
    heroFontMobile: 32, heroFontDesktop: 44, bodyFontMobile: 15, bodyFontDesktop: 16,
    touchTargetMobile: 50, storyFrame: false,
  },
  8: {
    confettiCount: 15, scoreSizePx: 48, showStars: false, starCount: 0, starStaggerMs: 0,
    encouragement: {
      high: 'Correct. You predicted it accurately.',
      mid: 'Review the outcome carefully.',
      low: 'Work through why separation occurred this way.',
    },
    playAgainLabel: 'Try fresh values', reviewLabel: 'Review',
    heroFontMobile: 30, heroFontDesktop: 40, bodyFontMobile: 15, bodyFontDesktop: 16,
    touchTargetMobile: 48, storyFrame: false,
  },
} as const;

// ==================== MATERIAL DATA ====================

const MATERIALS: Record<MaterialKey, {
  label: string; heavyName: string; lightName: string; story: string;
  heavyColor: string; heavyEdge: string; lightColor: string; lightEdge: string;
  heavyEmoji: string; lightEmoji: string; kurta: string;
}> = {
  peanuts: {
    label: 'Rubbed Peanuts',
    heavyName: 'Peanuts', lightName: 'Papery skins',
    story: 'You rubbed roasted peanuts between your palms — the thin red skins came loose.',
    heavyColor: '#D9A066', heavyEdge: '#A9743B',
    lightColor: '#C75B4A', lightEdge: '#9B3B2E',
    heavyEmoji: '🥜', lightEmoji: '🍂', kurta: '#2F8F7E',
  },
  wheat: {
    label: 'Wheat & Husk',
    heavyName: 'Wheat grains', lightName: 'Husk',
    story: 'The farmers threshed the wheat — now heavy grains and light husk are all mixed up.',
    heavyColor: '#E0B84C', heavyEdge: '#B08A28',
    lightColor: '#E8DCB0', lightEdge: '#C4B47C',
    heavyEmoji: '🌾', lightEmoji: '🍃', kurta: '#3B6FB5',
  },
};

const STRENGTHS: Record<StrengthKey, { label: string; wind: number; emoji: string }> = {
  gentle: { label: 'Gentle breeze', wind: 150, emoji: '🍃' },
  medium: { label: 'Steady wind', wind: 300, emoji: '💨' },
  strong: { label: 'Strong gust', wind: 480, emoji: '🌪️' },
};

// ==================== EASING / PRNG ====================

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ==================== RESPONSIVE HOOK ====================

const useResponsive = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    h();
    return () => window.removeEventListener('resize', h);
  }, []);
  return { w, isMobile: w < 576, isTablet: w >= 576 && w < 992 };
};

// ==================== STAGE GEOMETRY ====================

const LW = 760;
const LH = 480;
const GROUND_Y = 416;
const FARMER_X = 150;          // farmer body center
const STOOL_TOP = GROUND_Y - 64;
const EMIT_X = 226;            // tray lip — particles pour from here
const EMIT_Y = 196;
const PILE_X = EMIT_X + 4;     // heavy grains pile straight below the tray
const GRAIN_COL_W = 7;         // width of one column in the grain mound
const GRAIN_H = 3.0;           // visual height each grain adds to its column
const GRAIN_STEP = 1;          // angle of repose: max height gap between neighbours

// ==================== PARTICLE MODEL ====================

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  rot: number; vrot: number;
  kind: 'heavy' | 'light';
  willCarry: boolean;     // light: carried by wind? heavy: stolen by strong gust?
  emitDelay: number;      // seconds before this piece is poured out
  emitted: boolean;
  settled: boolean;
  exited: boolean;
  alpha: number;
  wob: number;            // flutter phase
  spd: number;            // 0..1 carry-speed factor (fans husk horizontally)
  fall: number;           // 0..1 descent-rate factor (fans husk vertically)
}

function buildParticles(
  rand: () => number, strength: StrengthKey, heavyCount: number, lightCount: number
): Particle[] {
  const arr: Particle[] = [];
  const carryFrac = strength === 'gentle' ? 0.5 : 1;       // gentle leaves some husk behind
  const stealFrac = strength === 'strong' ? 0.11 : 0;      // strong steals a few grains
  const emitDur = 1.7;

  const total = heavyCount + lightCount;
  for (let i = 0; i < heavyCount; i++) {
    arr.push(mk(rand, 'heavy', rand() < stealFrac, (i / total) * emitDur + rand() * 0.12));
  }
  for (let i = 0; i < lightCount; i++) {
    arr.push(mk(rand, 'light', rand() < carryFrac, ((i + heavyCount) / total) * emitDur + rand() * 0.12));
  }
  // shuffle so heavy & light pour out mixed together (realistic)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const d = arr[i].emitDelay; arr[i].emitDelay = arr[j].emitDelay; arr[j].emitDelay = d;
  }
  return arr;
}

function mk(rand: () => number, kind: 'heavy' | 'light', willCarry: boolean, emitDelay: number): Particle {
  return {
    // start resting INSIDE the tray (a loaded soop) before pouring
    x: EMIT_X + (rand() - 0.5) * 44,
    y: EMIT_Y - 8 + (rand() - 0.5) * 10,
    vx: 0, vy: 0,
    size: kind === 'heavy' ? 5.5 + rand() * 2.5 : 5 + rand() * 3,
    rot: rand() * Math.PI * 2,
    vrot: (rand() - 0.5) * (kind === 'light' ? 7 : 3),
    kind, willCarry, emitDelay, emitted: false,
    settled: false, exited: false, alpha: 1, wob: rand() * Math.PI * 2,
    spd: rand(), fall: rand(),
  };
}

// ==================== MAIN COMPONENT ====================

const BlowingAirSeparationLab: React.FC<ToolProps> = ({ props = {}, setStepDetails }) => {
  const ap = props.additionalProps || {};
  const grade: GradeLevel = props.gradeLevel ?? 6;
  const tier = TIER_CONFIG[grade];
  const { isMobile } = useResponsive();

  const [material, setMaterial] = useState<MaterialKey>(ap.material ?? 'peanuts');
  const [strength, setStrength] = useState<StrengthKey>(ap.defaultStrength ?? 'medium');
  const [phase, setPhase] = useState<Phase>('predict');
  const [prediction, setPrediction] = useState<'light' | 'heavy' | null>(null);
  const [seed, setSeed] = useState(() => Date.now());
  const [outcome, setOutcome] = useState<{ correct: boolean; quality: StrengthKey } | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [live, setLive] = useState({ stayed: 0, carried: 0 });

  const heavyCount = ap.heavyCount ?? 26;
  const lightCount = ap.lightCount ?? 30;
  const mat = MATERIALS[material];
  const instructionsLine = ap.instructions ??
    'First predict which part will blow away. Then pick an air strength, press Blow, and watch which part leaves and which stays.';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const heapRef = useRef<Record<number, number>>({});   // grain-mound column heights
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const windPulseRef = useRef<number>(0);
  const tRef = useRef<number>(0);
  const trayTipRef = useRef<number>(0);     // 0..1 how much the tray is tilted to pour
  const counterTickRef = useRef<number>(0);

  // ---- step details ----
  useEffect(() => {
    const order: Phase[] = ['predict', 'ready', 'blowing', 'result'];
    setStepDetails?.({
      currentStep: order.indexOf(phase) + 1,
      totalSteps: order.length,
      isPaused: phase !== 'blowing',
      currentMode: props.initialMode ?? 'hands_on',
    });
  }, [phase, setStepDetails, props.initialMode]);

  // ---- fonts + keyframes ----
  useEffect(() => {
    const id = 'blowing-air-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('style');
      link.id = id;
      link.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap');
        @keyframes ba-fadeUp { from {opacity:0;transform:translateY(16px);} to {opacity:1;transform:translateY(0);} }
        @keyframes ba-pop { 0%{transform:scale(0);opacity:0;} 70%{transform:scale(1.12);} 100%{transform:scale(1);opacity:1;} }
        @keyframes ba-scaleInBack { 0%{transform:scale(.6);opacity:0;} 100%{transform:scale(1);opacity:1;} }
        @keyframes ba-fall { 0%{transform:translateY(-40px) rotate(0);opacity:1;} 100%{transform:translateY(440px) rotate(380deg);opacity:0;} }
        @keyframes ba-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.04);} }
        @keyframes ba-star { 0%{transform:scale(0) rotate(-30deg);opacity:0;} 60%{transform:scale(1.25) rotate(8deg);} 100%{transform:scale(1) rotate(0);opacity:1;} }
      `;
      document.head.appendChild(link);
    }
  }, []);

  // ---- (re)build particles when idle ----
  const resetParticles = useCallback(() => {
    const rand = mulberry32(seed ^ (strength.length * 104729) ^ (material.length * 7919));
    particlesRef.current = buildParticles(rand, strength, heavyCount, lightCount);
    heapRef.current = {};
    elapsedRef.current = 0; windPulseRef.current = 0; tRef.current = 0; trayTipRef.current = 0;
    setLive({ stayed: 0, carried: 0 });
  }, [seed, strength, material, heavyCount, lightCount]);

  useEffect(() => {
    if (phase === 'predict' || phase === 'ready') resetParticles();
  }, [phase, resetParticles]);

  // ---- settling helper: grain builds a mound; husk lies flat in a thin layer ----
  const heapRestY = (x: number, kind: 'heavy' | 'light' = 'heavy') => {
    let count = 0;
    for (const p of particlesRef.current) {
      if (!p.settled) continue;
      if (kind === 'light') {
        if (p.kind === 'light' && Math.abs(p.x - x) < 14) count++;
      } else if (p.kind === 'heavy' && Math.abs(p.x - x) < 11) count++;
    }
    if (kind === 'light') return GROUND_Y - 2 - Math.min(count, 4) * 1.1; // thin, max ~6px
    return GROUND_Y - 4 - count * 2.6;                                     // grain mound
  };

  // ---- physics step ----
  const step = useCallback((dt: number) => {
    const parts = particlesRef.current;
    const baseWind = STRENGTHS[strength].wind;
    tRef.current += dt;
    windPulseRef.current = Math.min(1, windPulseRef.current + dt / 0.5);
    trayTipRef.current = Math.min(1, trayTipRef.current + dt / 0.45);
    const wind = baseWind * windPulseRef.current;
    const g = 540;

    // terminal (max fall) speeds — light floats slowly, heavy drops fast
    const TERM_LIGHT = 120, TERM_HEAVY = 430;
    // horizontal cap for grains nudged by a strong gust — only to the pile's foot
    const vxCapStolen = wind * 0.16;

    let pending = 0;   // not yet finished (still in tray or falling)
    for (const p of parts) {
      if (p.settled || p.exited) continue;

      // wait for pour turn
      if (!p.emitted) {
        if (elapsedRef.current >= p.emitDelay) {
          p.emitted = true;
          p.vy = 22 + Math.random() * 24;          // gentle pour downward
          p.vx = 6 + Math.random() * 10;
          p.x = EMIT_X + (Math.random() - 0.5) * 16;
          p.y = EMIT_Y;
        } else {
          pending++;
          continue;       // still sitting in the tray
        }
      }
      pending++;

      // gravity with terminal velocity (air drag). Carried husk drifts down
      // slowly (and at slightly different rates) so the cloud fans out vertically.
      const term =
        p.kind === 'heavy'
          ? TERM_HEAVY
          : p.willCarry
          ? 150 + p.fall * 60     // 150..210 — light, but always descends
          : TERM_LIGHT;
      p.vy += g * dt;
      if (p.vy > term) p.vy = term;

      const t = tRef.current;

      // horizontal wind
      if (p.kind === 'light' && p.willCarry) {
        // each piece eases toward its OWN carry speed -> they spread out instead
        // of moving in a single rigid line, then settle into a downwind pile
        const targetVx = wind * (0.32 + p.spd * 0.55);
        p.vx += (targetVx - p.vx) * 3 * dt;
        p.vx += Math.sin(p.wob + t * 4.5) * 16 * dt;   // gentle flutter
        p.vy += Math.sin(p.wob * 1.6 + t * 3.5) * 9 * dt;
      } else if (p.kind === 'light' && !p.willCarry) {
        p.vx += wind * 0.18 * dt;                       // weakly caught — drifts a little
        p.vx += Math.sin(p.wob + t * 4) * 12 * dt;
      } else if (p.kind === 'heavy' && p.willCarry) {
        p.vx += wind * 0.85 * dt;                       // gust steals a few grains
        if (p.vx > vxCapStolen) p.vx = vxCapStolen;
      } else {
        p.vx += wind * 0.035 * dt;                      // heavy stays: near-vertical
        if (p.vx > 16) p.vx = 16;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;

      // carried off the right edge
      if (p.x > LW + 24) { p.exited = true; p.alpha = 0; continue; }

      // landing
      if (p.kind === 'heavy') {
        // grain settles into a mound, rolling downhill to keep a natural slope
        const col0 = Math.round(p.x / GRAIN_COL_W);
        const h = (c: number) => heapRef.current[c] || 0;
        const restH = GROUND_Y - 3 - h(col0) * GRAIN_H;
        if (p.y >= restH && p.vy > 0) {
          let col = col0, guard = 0;
          while (guard++ < 60) {
            const dl = h(col) - h(col - 1), dr = h(col) - h(col + 1);
            if (dl > GRAIN_STEP && dr > GRAIN_STEP) col += Math.random() < 0.5 ? -1 : 1;
            else if (dl > GRAIN_STEP) col -= 1;
            else if (dr > GRAIN_STEP) col += 1;
            else break;
          }
          heapRef.current[col] = h(col) + 1;
          p.x = col * GRAIN_COL_W + (Math.random() - 0.5) * 3;
          p.y = GROUND_Y - 3 - heapRef.current[col] * GRAIN_H;
          p.settled = true; p.vx = 0; p.vy = 0; p.vrot = 0;
        }
      } else {
        // husk lies flat in a thin, spread-out scatter
        const rest = heapRestY(p.x, 'light');
        if (p.y >= rest && p.vy > 0) {
          p.y = rest;
          p.vy = 0;
          p.vx *= 0.55;
          if (Math.abs(p.vx) < 14) {
            p.settled = true; p.vx = 0; p.vrot = 0;
            p.rot = (Math.random() - 0.5) * 0.5;
          }
        }
      }
    }
    return pending;
  }, [strength]);

  // ---- live counters (throttled) ----
  const recountLive = () => {
    let stayed = 0, carried = 0;
    for (const p of particlesRef.current) {
      const gone = p.exited || (p.kind === 'light' && p.x > 360);
      if (p.kind === 'heavy' && !p.willCarry && (p.settled || p.x < 360)) stayed++;
      if (gone) carried++;
      else if (p.kind === 'heavy' && p.willCarry && p.exited) { /* counted in carried */ }
    }
    setLive((prev) => (prev.stayed === stayed && prev.carried === carried ? prev : { stayed, carried }));
  };

  // ---- DRAW ----
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== LW * dpr) { cv.width = LW * dpr; cv.height = LH * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, LW, LH);
    ctx.imageSmoothingEnabled = true;

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#CFE6FB');
    sky.addColorStop(1, '#FBF1DD');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, LW, GROUND_Y);

    // sun
    const sun = ctx.createRadialGradient(LW - 80, 64, 6, LW - 80, 64, 70);
    sun.addColorStop(0, '#FFD98A');
    sun.addColorStop(1, 'rgba(255,217,138,0)');
    ctx.fillStyle = sun;
    ctx.beginPath(); ctx.arc(LW - 80, 64, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFC247';
    ctx.beginPath(); ctx.arc(LW - 80, 64, 22, 0, Math.PI * 2); ctx.fill();

    // far field hills
    ctx.fillStyle = '#BfE0A0';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.quadraticCurveTo(190, GROUND_Y - 46, 380, GROUND_Y - 12);
    ctx.quadraticCurveTo(560, GROUND_Y - 40, LW, GROUND_Y - 8);
    ctx.lineTo(LW, GROUND_Y); ctx.closePath(); ctx.fill();

    // ground
    const ground = ctx.createLinearGradient(0, GROUND_Y, 0, LH);
    ground.addColorStop(0, '#CBB98C');
    ground.addColorStop(1, '#B09A66');
    ctx.fillStyle = ground;
    ctx.fillRect(0, GROUND_Y, LW, LH - GROUND_Y);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, GROUND_Y, LW, 3);

    const blowing = phase === 'blowing';
    const showResult = phase === 'result';
    const wp = windPulseRef.current;

    // ---- wind arrows (left side, pointing into the falling stream) ----
    if (blowing && wp > 0.05) {
      const t = tRef.current;
      const arrows = strength === 'gentle' ? 2 : strength === 'medium' ? 3 : 4;
      for (let i = 0; i < arrows; i++) {
        const yy = 120 + i * 26;
        const drift = ((t * (STRENGTHS[strength].wind * 0.7) + i * 90) % 150);
        const x0 = 20 + drift;
        const len = 34 + (strength === 'strong' ? 26 : strength === 'medium' ? 14 : 4);
        ctx.strokeStyle = `rgba(90,130,190,${0.30 + wp * 0.25})`;
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + len, yy);
        ctx.lineTo(x0 + len - 8, yy - 5); ctx.moveTo(x0 + len, yy); ctx.lineTo(x0 + len - 8, yy + 5);
        ctx.stroke();
      }
    }

    // ---- FARMER on a raised platform ----
    drawFarmer(ctx, mat.kurta, blowing ? trayTipRef.current : 0);

    // ---- particles (falling stream + piles) ----
    for (const p of particlesRef.current) {
      if (p.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.kind === 'heavy') {
        ctx.fillStyle = mat.heavyColor; ctx.strokeStyle = mat.heavyEdge; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.62, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.ellipse(-p.size * 0.3, -p.size * 0.18, p.size * 0.3, p.size * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = mat.lightColor; ctx.strokeStyle = mat.lightEdge; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.quadraticCurveTo(0, -p.size * 0.95, p.size, 0);
        ctx.quadraticCurveTo(0, -p.size * 0.18, -p.size, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }

    // ---- zone labels ----
    if (blowing || showResult) {
      drawPill(ctx, PILE_X, GROUND_Y + 30, `${mat.heavyEmoji} ${mat.heavyName} stay`, DS.primaryDark, 'center', 13);
      drawPill(ctx, LW - 224, 132, `${mat.lightEmoji} ${mat.lightName} carried away →`, DS.accentDark, 'left', 13);
    }
  }, [material, strength, phase, mat]);

  // ---- animation loop ----
  useEffect(() => {
    if (phase !== 'blowing') { draw(); return; }
    lastTsRef.current = 0;
    const speedMul = props.animationSpeed ?? 1;
    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      let dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      dt = Math.min(dt, 0.033) * speedMul;
      elapsedRef.current += dt;

      const pending = step(dt);
      draw();

      counterTickRef.current += dt;
      if (counterTickRef.current > 0.18) { counterTickRef.current = 0; recountLive(); }

      if (pending === 0 || elapsedRef.current > 7.5) { finishBlow(); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => { if (phase !== 'blowing') draw(); }, [draw, phase, material, strength]);

  // ---- handlers ----
  const handlePredict = (p: 'light' | 'heavy') => { setPrediction(p); setPhase('ready'); };
  const handleBlow = () => {
    resetParticles();
    elapsedRef.current = 0; windPulseRef.current = 0; tRef.current = 0; trayTipRef.current = 0;
    counterTickRef.current = 0;
    setPhase('blowing');
  };
  const finishBlow = () => {
    recountLive();
    setOutcome({ correct: prediction === 'light', quality: strength });
    setPhase('result');
    setShowPopup(true);
  };
  const handleTryAgain = () => {
    setShowPopup(false); setOutcome(null); setPrediction(null);
    setSeed(Date.now()); setPhase('predict');
  };
  const handleNewStrength = () => {
    setShowPopup(false); setOutcome(null); setSeed(Date.now()); setPhase('ready');
  };

  // ---- sizing ----
  const bodyFont = isMobile ? tier.bodyFontMobile : tier.bodyFontDesktop;
  const heroFont = isMobile ? tier.heroFontMobile : tier.heroFontDesktop;
  const pad = isMobile ? 14 : 22;
  const touch = isMobile ? tier.touchTargetMobile : 52;

  const order: Phase[] = ['predict', 'ready', 'blowing', 'result'];
  const progress = ((order.indexOf(phase) + 1) / order.length) * 100;

  return (
    <div style={{
      fontFamily: "'Poppins', system-ui, sans-serif", width: '100%', maxWidth: 880,
      margin: '0 auto', background: DS.white, borderRadius: DS.radii.xl, overflow: 'hidden',
      boxShadow: '0 20px 50px -16px rgba(83,48,134,0.35)', color: DS.gray900,
    }}>
      {/* Header */}
      <div style={{ background: DS.headerGradient, padding: isMobile ? '16px 18px' : '20px 26px', color: DS.white }}>
        <h2 style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? 20 : 26, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.01em' }}>
          <Wind size={isMobile ? 22 : 26} /> Blowing-Air Separation Lab
        </h2>
        <p style={{ margin: '6px 0 0', fontWeight: 400, fontSize: bodyFont - 1, opacity: 0.92, lineHeight: 1.4 }}>
          {instructionsLine}
        </p>
      </div>

      {/* Progress */}
      <div style={{ height: 5, background: DS.gray200, width: '100%' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: DS.ctaGradient, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>

      <div style={{ padding: pad }}>
        {/* material switch */}
        {!ap.lockMaterial && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, opacity: phase === 'blowing' ? 0.5 : 1, pointerEvents: phase === 'blowing' ? 'none' : 'auto' }}>
            {(Object.keys(MATERIALS) as MaterialKey[]).map((k) => {
              const on = material === k;
              return (
                <button key={k} onClick={() => { setMaterial(k); setPhase('predict'); setPrediction(null); setOutcome(null); }} style={chip(on)}>
                  {MATERIALS[k].label}
                </button>
              );
            })}
          </div>
        )}

        {/* story line */}
        {tier.storyFrame && (
          <p style={{ margin: '0 0 12px', fontStyle: 'italic', color: DS.gray700, fontSize: bodyFont, lineHeight: 1.5 }}>
            {mat.story}
          </p>
        )}

        {/* stage */}
        <div ref={wrapRef} style={{ width: '100%', borderRadius: DS.radii.lg, overflow: 'hidden', border: `1px solid ${DS.gray200}`, background: '#CFE6FB', position: 'relative' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: `${LW} / ${LH}` }} />
          {prediction && phase !== 'predict' && (
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', borderRadius: DS.radii.pill, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: DS.primaryDark, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', animation: 'ba-fadeUp 0.4s ease' }}>
              Your guess: {prediction === 'light' ? mat.lightName : mat.heavyName}
            </div>
          )}
          {/* live counters */}
          {(phase === 'blowing' || phase === 'result') && (
            <div style={{ position: 'absolute', right: 10, bottom: 10, display: 'flex', gap: 8 }}>
              <span style={counterChip(DS.success, DS.successLight)}>{mat.heavyEmoji} Stayed: {live.stayed}</span>
              <span style={counterChip(DS.accentDark, DS.accentLight)}>{mat.lightEmoji} Blown: {live.carried}</span>
            </div>
          )}
        </div>

        {/* PREDICT */}
        {phase === 'predict' && (
          <div style={{ marginTop: 16, animation: 'ba-fadeUp 0.4s ease' }}>
            <p style={{ fontWeight: 700, fontSize: bodyFont + 2, margin: '0 0 12px', color: DS.gray900 }}>
              Predict first: when you blow air across the tray, which part flies away?
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => handlePredict('light')} style={predictBtn(touch)}>
                <span style={{ fontSize: 22 }}>{mat.lightEmoji}</span> The light {mat.lightName.toLowerCase()}
              </button>
              <button onClick={() => handlePredict('heavy')} style={predictBtn(touch)}>
                <span style={{ fontSize: 22 }}>{mat.heavyEmoji}</span> The heavy {mat.heavyName.toLowerCase()}
              </button>
            </div>
          </div>
        )}

        {/* READY */}
        {phase === 'ready' && (
          <div style={{ marginTop: 16, animation: 'ba-fadeUp 0.4s ease' }}>
            <p style={{ fontWeight: 700, fontSize: bodyFont + 1, margin: '0 0 10px' }}>Pick how hard you blow:</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {(Object.keys(STRENGTHS) as StrengthKey[]).map((k) => {
                const on = strength === k;
                return (
                  <button key={k} onClick={() => setStrength(k)} style={strengthBtn(on, touch)}>
                    <span style={{ fontSize: 20 }}>{STRENGTHS[k].emoji}</span> {STRENGTHS[k].label}
                  </button>
                );
              })}
            </div>
            <button onClick={handleBlow} style={ctaBtn(touch)}><Play size={18} /> Blow the air</button>
          </div>
        )}

        {/* BLOWING */}
        {phase === 'blowing' && (
          <div style={{ marginTop: 16, textAlign: 'center', color: DS.primaryDark, fontWeight: 600, fontSize: bodyFont + 1, animation: 'ba-pulse 1.4s ease-in-out infinite', lineHeight: 1.5 }}>
            <Wind size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Watch! The light {mat.lightName.toLowerCase()} float away on the wind, while the heavy {mat.heavyName.toLowerCase()} drop straight down.
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && outcome && (
          <div style={{ marginTop: 16, animation: 'ba-fadeUp 0.4s ease' }}>
            <ResultSummary outcome={outcome} mat={mat} bodyFont={bodyFont} onTryAgain={handleTryAgain} onNewStrength={handleNewStrength} tier={tier} touch={touch} />
          </div>
        )}
      </div>

      {showPopup && outcome && (
        <ResultPopup outcome={outcome} mat={mat} tier={tier} heroFont={heroFont} bodyFont={bodyFont} touch={touch} isMobile={isMobile} onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
};

// ==================== FARMER DRAWING ====================

function drawFarmer(ctx: CanvasRenderingContext2D, kurta: string, tip: number) {
  // raised mud platform / stool
  ctx.fillStyle = '#A6814C';
  ctx.beginPath(); roundRect(ctx, FARMER_X - 46, STOOL_TOP, 92, GROUND_Y - STOOL_TOP, 6); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.fillRect(FARMER_X - 46, STOOL_TOP, 92, 4);

  const feetY = STOOL_TOP;
  const hipY = feetY - 48;
  const shoulderY = hipY - 46;
  const headR = 16;
  const headCx = FARMER_X - 2;
  const headCy = shoulderY - headR - 6;

  // legs (dhoti)
  ctx.strokeStyle = '#E8E2D2'; ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(FARMER_X - 8, hipY); ctx.lineTo(FARMER_X - 14, feetY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(FARMER_X + 6, hipY); ctx.lineTo(FARMER_X + 12, feetY); ctx.stroke();

  // torso (kurta)
  ctx.fillStyle = kurta;
  ctx.beginPath();
  ctx.moveTo(FARMER_X - 16, hipY);
  ctx.lineTo(FARMER_X - 13, shoulderY);
  ctx.quadraticCurveTo(FARMER_X, shoulderY - 6, FARMER_X + 13, shoulderY);
  ctx.lineTo(FARMER_X + 16, hipY);
  ctx.quadraticCurveTo(FARMER_X, hipY + 6, FARMER_X - 16, hipY);
  ctx.closePath(); ctx.fill();

  // neck + head
  ctx.fillStyle = '#D8A271';
  ctx.fillRect(headCx - 5, headCy + headR - 4, 10, 10);
  ctx.beginPath(); ctx.arc(headCx, headCy, headR, 0, Math.PI * 2); ctx.fill();
  // hair
  ctx.fillStyle = '#2A211B';
  ctx.beginPath(); ctx.arc(headCx, headCy - 3, headR, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillRect(headCx - headR, headCy - 5, headR * 2, 5);
  // simple smile + eyes
  ctx.fillStyle = '#2A211B';
  ctx.beginPath(); ctx.arc(headCx - 5, headCy, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(headCx + 5, headCy, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2A211B'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(headCx, headCy + 3, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();

  // arms raised up-right toward the tray
  const handLx = EMIT_X - 26, handRx = EMIT_X + 18, handY = EMIT_Y + 14;
  ctx.strokeStyle = kurta; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(FARMER_X - 12, shoulderY + 4); ctx.lineTo(handLx, handY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(FARMER_X + 12, shoulderY + 4); ctx.lineTo(handRx, handY); ctx.stroke();
  // hands
  ctx.fillStyle = '#D8A271';
  ctx.beginPath(); ctx.arc(handLx, handY, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(handRx, handY, 4.5, 0, Math.PI * 2); ctx.fill();

  // soop (bamboo tray) held high, tilting its FRONT (right) lip down to pour as `tip` -> 1
  ctx.save();
  ctx.translate(EMIT_X - 4, EMIT_Y);
  ctx.rotate(-0.05 + tip * 0.5);    // front (right) lip dips toward the falling stream / wind
  const tray = ctx.createLinearGradient(-52, 0, 52, 0);
  tray.addColorStop(0, '#E8C98C'); tray.addColorStop(1, '#CFA559');
  ctx.fillStyle = tray;
  ctx.beginPath();
  ctx.moveTo(-52, 4);
  ctx.quadraticCurveTo(0, -16, 52, 4);
  ctx.quadraticCurveTo(36, 18, 0, 20);
  ctx.quadraticCurveTo(-36, 18, -52, 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#A9803F'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.4;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(i * 14, -6); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.restore();
}

// ==================== SUB-COMPONENTS ====================

const ResultSummary: React.FC<{
  outcome: { correct: boolean; quality: StrengthKey };
  mat: typeof MATERIALS[MaterialKey];
  bodyFont: number; onTryAgain: () => void; onNewStrength: () => void;
  tier: typeof TIER_CONFIG[GradeLevel]; touch: number;
}> = ({ outcome, mat, bodyFont, onTryAgain, onNewStrength, tier, touch }) => {
  const note =
    outcome.quality === 'gentle'
      ? `The breeze was too gentle — some ${mat.lightName.toLowerCase()} stayed behind in the pile. A steadier wind gives a cleaner separation.`
      : outcome.quality === 'strong'
      ? `The gust was very strong — all the ${mat.lightName.toLowerCase()} flew off, but a few ${mat.heavyName.toLowerCase()} got blown away too. A little wasteful!`
      : `A steady wind worked perfectly — all the light ${mat.lightName.toLowerCase()} blew away and every ${mat.heavyName.toLowerCase()} stayed. Clean winnowing!`;
  return (
    <div style={{ background: DS.gray100, borderRadius: DS.radii.lg, padding: 18, border: `1px solid ${DS.gray200}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontWeight: 700, fontSize: bodyFont + 2, color: outcome.correct ? DS.success : DS.danger }}>
        {outcome.correct ? <Check size={22} /> : <X size={22} />}
        {outcome.correct ? 'Your prediction was right!' : 'Not quite what you predicted.'}
      </div>
      <p style={{ margin: '0 0 8px', fontSize: bodyFont, lineHeight: 1.55, color: DS.gray900 }}>
        The lighter <b>{mat.lightName.toLowerCase()}</b> are carried away by the moving air, while the heavier <b>{mat.heavyName.toLowerCase()}</b> are too heavy and fall straight down. This method is called <b>winnowing</b>.
      </p>
      <p style={{ margin: '0 0 14px', fontSize: bodyFont - 1, lineHeight: 1.5, color: DS.gray700 }}>{note}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={onNewStrength} style={outlineBtn(touch)}><Wind size={18} /> Try a different wind</button>
        <button onClick={onTryAgain} style={ctaBtn(touch)}><RotateCcw size={18} /> {tier.playAgainLabel}</button>
      </div>
    </div>
  );
};

const ResultPopup: React.FC<{
  outcome: { correct: boolean; quality: StrengthKey };
  mat: typeof MATERIALS[MaterialKey];
  tier: typeof TIER_CONFIG[GradeLevel];
  heroFont: number; bodyFont: number; touch: number; isMobile: boolean; onClose: () => void;
}> = ({ outcome, mat, tier, heroFont, bodyFont, touch, isMobile, onClose }) => {
  const msg = outcome.correct ? tier.encouragement.high : tier.encouragement.low;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,16,40,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16, animation: 'ba-fadeUp 0.25s ease' }}>
      {outcome.correct && Array.from({ length: tier.confettiCount }).map((_, i) => {
        const colors = [DS.primary, DS.accent, DS.accentDark, DS.primaryLight, DS.amber, DS.success];
        return <span key={i} style={{ position: 'absolute', top: -20, left: `${(i * 53) % 100}%`, width: 8, height: 12, background: colors[i % colors.length], borderRadius: 2, animation: `ba-fall ${1.6 + (i % 5) * 0.25}s linear ${(i % 7) * 0.12}s forwards` }} />;
      })}
      <div onClick={(e) => e.stopPropagation()} style={{ background: DS.white, borderRadius: DS.radii.xl, padding: isMobile ? 24 : 34, maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.4)', animation: 'ba-scaleInBack 0.4s cubic-bezier(0.34,1.56,0.64,1)', position: 'relative', zIndex: 101 }}>
        <div style={{ width: 70, height: 70, margin: '0 auto 14px', borderRadius: '50%', background: outcome.correct ? DS.successLight : DS.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'ba-pop 0.5s ease' }}>
          {outcome.correct ? <Check size={38} color={DS.success} strokeWidth={3} /> : <Sparkles size={36} color={DS.accent} />}
        </div>
        {tier.showStars && outcome.correct && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
            {Array.from({ length: tier.starCount }).map((_, i) => (
              <span key={i} style={{ fontSize: 28, animation: `ba-star 0.5s ease ${i * tier.starStaggerMs}ms both` }}>⭐</span>
            ))}
          </div>
        )}
        <h3 style={{ margin: '0 0 6px', fontSize: heroFont - 8, fontWeight: 800, color: DS.primaryDark, fontFamily: "'Poppins', sans-serif" }}>
          {outcome.correct ? 'You winnowed it!' : 'Good experiment!'}
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: bodyFont, color: DS.gray700, lineHeight: 1.5 }}>{msg}</p>
        <button onClick={onClose} style={ctaBtn(touch)}>See what happened <ChevronRight size={18} /></button>
      </div>
    </div>
  );
};

// ==================== CANVAS HELPERS ====================

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, align: 'left' | 'center', fs: number) {
  ctx.font = `600 ${fs}px Poppins, sans-serif`;
  const w = ctx.measureText(text).width + 20;
  const px = align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath(); roundRect(ctx, px, y - fs - 6, w, fs + 12, (fs + 12) / 2); ctx.fill();
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(text, px + 10, y);
}

// ==================== BUTTON STYLES ====================

function chip(on: boolean): React.CSSProperties {
  return { padding: '8px 16px', borderRadius: DS.radii.pill, border: `1.5px solid ${on ? DS.primary : DS.gray400}`, background: on ? DS.primary : DS.white, color: on ? DS.white : DS.gray700, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s ease' };
}
function counterChip(fg: string, bg: string): React.CSSProperties {
  return { background: bg, color: fg, fontWeight: 700, fontSize: 12, padding: '5px 10px', borderRadius: DS.radii.pill, boxShadow: '0 3px 8px rgba(0,0,0,0.12)', fontFamily: "'Poppins', sans-serif" };
}
function predictBtn(touch: number): React.CSSProperties {
  return { flex: '1 1 160px', minHeight: touch + 12, padding: '14px 16px', borderRadius: DS.radii.lg, border: `2px solid ${DS.primaryLight}`, background: DS.primaryGhost, color: DS.primaryDark, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s ease', textAlign: 'left' };
}
function strengthBtn(on: boolean, touch: number): React.CSSProperties {
  return { flex: '1 1 140px', minHeight: touch, padding: '10px 14px', borderRadius: DS.radii.md, border: `2px solid ${on ? DS.accent : DS.gray400}`, background: on ? DS.accentLight : DS.white, color: on ? DS.accentDark : DS.gray700, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s ease' };
}
function ctaBtn(touch: number): React.CSSProperties {
  return { minHeight: touch, padding: '12px 24px', borderRadius: DS.radii.pill, border: 'none', background: DS.ctaGradient, color: DS.white, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontFamily: "'Poppins', sans-serif", boxShadow: '0 8px 18px -6px rgba(255,114,18,0.6)', transition: 'all 0.2s ease' };
}
function outlineBtn(touch: number): React.CSSProperties {
  return { minHeight: touch, padding: '12px 22px', borderRadius: DS.radii.pill, border: `2px solid ${DS.primary}`, background: DS.white, color: DS.primary, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s ease' };
}

export default BlowingAirSeparationLab;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════