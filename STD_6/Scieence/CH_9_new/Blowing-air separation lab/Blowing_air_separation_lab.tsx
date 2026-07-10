// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: blowing_air_separation_lab.tsx
//
// Blowing-Air Separation Lab (Winnowing) — a friendly farmer stands on a raised
// platform and POURS a tray of threshed wheat (grain + husk) into the wind.
// The falling stream splits in mid-air: heavy grains drop straight into a pile
// while the light husk floats slowly and is carried far away by the moving air.
// The student commits a prediction first.
//
// Theme: Singularity (Poppins, purple #4A4DC9 / #533086, orange #FF7212 / #FC9145).
// Responsive from 320px. Real falling/pouring physics with air drag + wind.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
// framer-motion is available in this environment (used by sibling tools in this project) —
// imported for the UI-chrome transitions (finish screen, mode-toggle settle). The physics
// simulation itself stays on the canvas/rAF path since framer-motion cannot drive canvas pixels.
import { motion, AnimatePresence } from 'framer-motion';

// ==================== AGENT-CONTROL CONTRACT (postMessage) ====================
// The tool lives in a sandboxed iframe and talks to the host ONLY via postMessage.
//   inbound : { type:'command', id, method, args }  -> runs api[method](...args)
//   outbound: { type:'ready',   toolId }            -> emitted ONCE on mount (REQUIRED)
//             { type:'event',    name, detail }      -> every meaningful action/state change
//             { type:'state',    state }             -> in response to getState()
//             { type:'response', id, result }        -> correlates a command that carried an id
// NOTE: replace TOOL_ID with this tool's real media code (e.g. "M6.S3.T2.C4.2D1").
const TOOL_ID = 'WINNOW.SEP.2D1';
const emit = (m: any) => { try { window.parent.postMessage(m, '*'); } catch { /* iframe-safe */ } };

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
const Volume2: React.FC<IconProps> = (p) => (<Svg {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={p.color ?? 'currentColor'} stroke="none" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></Svg>);
const VolumeX: React.FC<IconProps> = (p) => (<Svg {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={p.color ?? 'currentColor'} stroke="none" /><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" /></Svg>);
const Pause: React.FC<IconProps> = (p) => (<Svg {...p}><rect x="6" y="4" width="4" height="16" rx="1" fill={p.color ?? 'currentColor'} stroke="none" /><rect x="14" y="4" width="4" height="16" rx="1" fill={p.color ?? 'currentColor'} stroke="none" /></Svg>);

// ==================== TYPES ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';
type Phase = 'predict' | 'ready' | 'blowing' | 'result';
type MaterialKey = 'wheat';
type StrengthKey = 'gentle' | 'medium' | 'strong';
type GradeLevel = 6 | 7 | 8;
type OperatorMode = 'ai' | 'student';
type DeviceKind = 'mobile' | 'web' | 'smartboard';
type PredictKey = 'light' | 'heavy';

// every nameable element highlight(target) can point at (mirrors JSON validIds.highlightTargets)
type HighlightTarget =
  | 'tray' | 'grainPile' | 'huskZone' | 'windArrows'
  | 'predictLight' | 'predictHeavy' | 'windControls' | 'blowButton'
  | 'stayedCount' | 'blownCount' | 'modeToggle';

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

// The tool accepts a FLAT props object (per the 2D contract / JSON props.defaults) and
// ALSO tolerates the legacy nested `{ props: {...} }` wrapper — both paths are normalized.
interface ToolConfig {
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
  // ── 2D agent-control contract additions ──
  operatorMode?: OperatorMode;      // 'ai' = teacher drives (lean demo) | 'student' = full practice
  showModeToggle?: boolean;         // default true — host can hide the Teacher/Student toggle
  device?: DeviceKind;              // 'mobile'(≥24) | 'web'(≥44) | 'smartboard'(≥60) — maps the 3 device frames (§7.4/§8.1)
  muted?: boolean;                  // start muted
  seed?: number;                    // determinism
}

interface ToolProps extends ToolConfig {
  props?: ToolConfig;               // legacy nested wrapper
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

// Dark-mode surface palette (shell/panels/text). The canvas keeps its bright
// daytime scene; only the surrounding chrome re-themes so contrast stays comfortable.
const DARK = {
  bg: '#0F0F1C',
  card: '#171727',
  panel: '#1F1F35',
  panelSoft: '#252542',
  border: '#33335A',
  text: '#F2F2FB',
  sub: '#B7B7D6',
  ghost: '#2A2A4A',
};

// Resolve the surface tokens for the active theme so the shell can re-theme in one place.
function surfaces(dark: boolean) {
  return dark
    ? { card: DARK.card, panel: DARK.panel, panelSoft: DARK.panelSoft, border: DARK.border, text: DARK.text, sub: DARK.sub, ghost: DARK.ghost, shadow: '0 20px 50px -16px rgba(0,0,0,0.6)' }
    : { card: DS.white, panel: DS.gray100, panelSoft: DS.white, border: DS.gray200, text: DS.gray900, sub: DS.gray700, ghost: DS.primaryGhost, shadow: '0 20px 50px -16px rgba(83,48,134,0.35)' };
}

// ==================== TIER CONFIG ====================

const TIER_CONFIG = {
  6: {
    confettiCount: 70, scoreSizePx: 64, showStars: true, starCount: 3, starStaggerMs: 200,
    encouragement: {
      high: 'Brilliant! You think like a real farmer!',
      mid: "Nice try! Let's see what the wind taught us.",
      low: 'Good guess! Watch closely — the wind never lies.',
    },
    anotherRoundLabel: 'Blow again!', reviewLabel: 'What we learned',
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
    anotherRoundLabel: 'Run another round', reviewLabel: 'Review',
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
    anotherRoundLabel: 'New wind trial', reviewLabel: 'Review',
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
  const [dim, setDim] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 800,
    h: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));
  useEffect(() => {
    const h = () => setDim({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', h);
    window.addEventListener('orientationchange', h);
    h();
    return () => { window.removeEventListener('resize', h); window.removeEventListener('orientationchange', h); };
  }, []);
  const { w, h } = dim;
  // Landscape = wide + short enough that a vertical stack would push the interaction below
  // the fold; we split into two panes there (§8.1). Portrait keeps the classic vertical flow.
  const landscape = w > h && w >= 760;
  // Height-first tiers for the 3 canonical device frames (§8.1). Height is the binding
  // constraint (390 → 1080 ≈ 2.8×), so we key off viewport HEIGHT, not width:
  //   short  → Mobile App 844×390  (surface less, cap the phenomenon hard)
  //   tall   → Smart Board 1920×1080 (fill the frame, scale up)
  //   (mid)  → Web 1366×768 (the balanced reference)
  const short = h <= 430;
  const tall = h >= 950;
  return { w, h, isMobile: w < 576, isTablet: w >= 576 && w < 992, landscape, short, tall };
};

// ==================== SOUND (Web Audio, lazy, mutable) ====================
// Pleasant synthesised cues — no asset deps. The context is created lazily on the first
// gesture-driven cue so nothing autoplays; a shared mute ref silences everything instantly.
function useSound(mutedRef: React.MutableRefObject<boolean>) {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = () => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    }
    const c = ctxRef.current;
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    return c;
  };
  const tone = (c: AudioContext, freq: number, t0: number, dur: number, type: OscillatorType, peak: number) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  };
  const noise = (c: AudioContext, t0: number, dur: number, peak: number) => {
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.setValueAtTime(peak, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const filt = c.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 900; filt.Q.value = 0.6;
    src.connect(filt); filt.connect(g); g.connect(c.destination);
    src.start(t0); src.stop(t0 + dur);
  };
  return useCallback((kind: 'tap' | 'wind' | 'correct' | 'wrong' | 'done') => {
    if (mutedRef.current) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    if (kind === 'tap') tone(c, 440, now, 0.09, 'sine', 0.12);
    else if (kind === 'wind') noise(c, now, 0.7, 0.10);
    else if (kind === 'correct') { tone(c, 523.25, now, 0.14, 'triangle', 0.16); tone(c, 783.99, now + 0.12, 0.22, 'triangle', 0.16); }
    else if (kind === 'wrong') { tone(c, 220, now, 0.16, 'sawtooth', 0.09); tone(c, 174.61, now + 0.10, 0.20, 'sine', 0.10); }
    else if (kind === 'done') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, now + i * 0.10, 0.22, 'triangle', 0.15)); }
  }, [mutedRef]);
}

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

const BlowingAirSeparationLab: React.FC<ToolProps> = (rawProps) => {
  // Normalize: accept a FLAT config OR the legacy nested `{ props: {...} }` wrapper.
  const props: ToolConfig = (rawProps?.props ?? rawProps ?? {}) as ToolConfig;
  const setStepDetails = rawProps?.setStepDetails;
  const ap = props.additionalProps || {};
  const grade: GradeLevel = props.gradeLevel ?? 6;
  const tier = TIER_CONFIG[grade];
  const { h: vpH, isMobile, landscape, short, tall } = useResponsive();

  const dark = !!props.darkMode;
  const S = surfaces(dark);
  const device: DeviceKind = props.device ?? 'mobile';
  const showModeToggle = props.showModeToggle ?? true;

  const [material, setMaterial] = useState<MaterialKey>(ap.material ?? 'wheat');
  const [strength, setStrength] = useState<StrengthKey>(ap.defaultStrength ?? 'medium');
  const [phase, setPhase] = useState<Phase>('predict');
  const [prediction, setPrediction] = useState<PredictKey | null>(null);
  const [seed, setSeed] = useState(() => props.seed ?? Date.now());
  const [outcome, setOutcome] = useState<{ correct: boolean; quality: StrengthKey } | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [live, setLive] = useState({ stayed: 0, carried: 0 });

  // ── 2D agent-control state ──
  const [mode, setMode] = useState<OperatorMode>(props.operatorMode ?? 'student');
  const depth: 'lean' | 'full' = mode === 'ai' ? 'lean' : 'full';   // §6.2 Teacher=lean, Student=full
  const [highlight, setHighlight] = useState<HighlightTarget | null>(null);
  const [runsDone, setRunsDone] = useState(0);
  const [muted, setMuted] = useState(!!props.muted);

  // ── Finish / performance-summary tracking (§6.3) ──
  const [finished, setFinished] = useState(false);
  const [finishOverlayVisible, setFinishOverlayVisible] = useState(false);
  const [finishSummary, setFinishSummary] = useState<any>(null);
  const historyRef = useRef<{ material: MaterialKey; strength: StrengthKey; prediction: PredictKey | null; correct: boolean }[]>([]);
  const hintsUsedRef = useRef(0);
  const sessionStartRef = useRef<number>(Date.now());

  const mutedRef = useRef(muted); mutedRef.current = muted;
  const playCue = useSound(mutedRef);
  const highlightRef = useRef<HighlightTarget | null>(null); highlightRef.current = highlight;
  const highlightTimer = useRef<number | null>(null);
  const pausedRef = useRef(false);

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

  // ── live snapshot for the agent: handlers read stateRef.current, never a stale closure (§9) ──
  const stateRef = useRef<any>({});
  stateRef.current = {
    toolId: TOOL_ID, phase, material, strength, prediction,
    stayed: live.stayed, blown: live.carried,
    correct: outcome?.correct ?? null, quality: outcome?.quality ?? null,
    operatorMode: mode, depth, runsDone, muted,
    correctPrediction: 'light',
  };

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
        /* highlight(target): the agent's laser-pointer — a looping ring pulse on any HTML control */
        @keyframes ba-ring { 0%{box-shadow:0 0 0 0 rgba(74,77,201,0.55);} 70%{box-shadow:0 0 0 12px rgba(74,77,201,0);} 100%{box-shadow:0 0 0 0 rgba(74,77,201,0);} }
        @keyframes ba-drift { 0%{transform:translateX(0);} 50%{transform:translateX(4px);} 100%{transform:translateX(0);} }
        .ba-hl { animation: ba-ring 1.15s ease-out infinite; border-radius: 14px; position: relative; z-index: 2; }
        .ba-mode-enter { animation: ba-fadeUp 0.35s cubic-bezier(0.4,0,0.2,1); }
        /* Full-screen completion celebration (§7.4): rains across the WHOLE viewport, never a corner toast */
        @keyframes ba-rain { 0%{transform:translateY(-14vh) rotate(0);opacity:1;} 90%{opacity:1;} 100%{transform:translateY(114vh) rotate(540deg);opacity:0;} }
        @keyframes ba-cel-in { 0%{transform:scale(0.4);opacity:0;} 55%{transform:scale(1.12);opacity:1;} 100%{transform:scale(1);opacity:1;} }
        @keyframes ba-cel-fade { 0%,72%{opacity:1;} 100%{opacity:0;} }
        /* ── No page scroll, ever: the tool fits its device frame (§8/§8.1). ──
           border-box everywhere so padding never grows a 100%-sized box past its parent (the phantom-scrollbar bug). */
        .ba-frame, .ba-frame * { box-sizing: border-box; }
        .ba-frame { width: 100%; min-height: 100dvh; height: 100dvh; max-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
        .ba-card { display: flex; flex-direction: column; width: 100%; max-height: 100%; overflow: hidden; }
        /* Body: single column in portrait; two panes in landscape. min-height:0 lets the flex child shrink to fit. */
        .ba-body { display: grid; grid-template-columns: 1fr; gap: 14px; min-height: 0; flex: 1 1 auto; overflow: hidden; }
        .ba-body.ba-land { grid-template-columns: minmax(0, 1.32fr) minmax(260px, 1fr); align-items: stretch; }
        .ba-stagepane { min-height: 0; display: flex; align-items: center; justify-content: center; }
        /* Controls may scroll INTERNALLY on the tightest frame (allowed §8) — the frame itself never scrolls. */
        .ba-controls { min-height: 0; overflow: auto; }
        @media (prefers-reduced-motion: reduce) {
          .ba-hl { animation: none; box-shadow: 0 0 0 3px rgba(74,77,201,0.6); }
          .ba-mode-enter, .ba-drift, .ba-rain, .ba-cel { animation: none !important; }
          * { scroll-behavior: auto !important; }
        }
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
      // pause(): freeze the sim but keep the rAF alive so play() resumes cleanly
      if (pausedRef.current) { lastTsRef.current = ts; rafRef.current = requestAnimationFrame(loop); return; }
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

  // ---- handlers (shared by student clicks AND agent verbs — same visible result) ----
  const handlePredict = (p: PredictKey) => {
    if (stateRef.current.phase === 'blowing') return;   // idempotent-safe: no changes mid-run
    setPrediction(p);
    setPhase((cur) => (cur === 'predict' ? 'ready' : cur));
    playCue('tap');
    emit({ type: 'event', name: 'prediction_made', detail: { prediction: p } });
  };
  const handleWind = (k: StrengthKey) => {
    if (stateRef.current.phase === 'blowing') return;
    setStrength(k);
    playCue('tap');
    emit({ type: 'event', name: 'wind_changed', detail: { level: k } });
  };
  const handleMaterial = (k: MaterialKey) => {
    if (ap.lockMaterial || stateRef.current.phase === 'blowing') return;
    setMaterial(k); setPhase('predict'); setPrediction(null); setOutcome(null);
    playCue('tap');
    emit({ type: 'event', name: 'material_changed', detail: { material: k } });
  };
  const handleBlow = () => {
    if (stateRef.current.phase === 'blowing') return;   // no double-run
    resetParticles();
    elapsedRef.current = 0; windPulseRef.current = 0; tRef.current = 0; trayTipRef.current = 0;
    counterTickRef.current = 0; pausedRef.current = false;
    setShowPopup(false); setOutcome(null);
    setPhase('blowing');
    playCue('wind');
    emit({ type: 'event', name: 'blowing_started', detail: { material, strength, prediction } });
  };
  const finishBlow = () => {
    recountLive();
    const cur = stateRef.current;
    const correct = cur.prediction === 'light';
    setOutcome({ correct, quality: strength });
    setPhase('result');
    setShowPopup(true);
    setRunsDone((n) => n + 1);
    if (cur.prediction) {
      historyRef.current = [...historyRef.current, { material: cur.material, strength, prediction: cur.prediction, correct }];
    }
    playCue(cur.prediction ? (correct ? 'correct' : 'wrong') : 'done');
    emit({ type: 'event', name: 'run_completed', detail: { stayed: cur.stayed, blown: cur.blown, quality: strength } });
    if (cur.prediction) emit({ type: 'event', name: correct ? 'answer_correct' : 'answer_incorrect', detail: { prediction: cur.prediction, correct } });
    emit({ type: 'event', name: 'completed', detail: { correct, quality: strength } });
  };
  const handleTryAgain = () => {
    setShowPopup(false); setOutcome(null); setPrediction(null);
    setSeed(Date.now()); setPhase('predict');
  };
  const handleNewStrength = () => {
    setShowPopup(false); setOutcome(null); setSeed(Date.now()); setPhase('ready');
  };

  // ---- Finish (§6.3): the uniform, student-mode-only ending. No further replay is offered — ----
  // ---- this is an EVALUATING tool (predict-then-reveal has a right/wrong answer), so Finish  ----
  // ---- opens the star finish screen + "What you have learned", and emits ONE `finished` event. ----
  const handleFinish = useCallback(() => {
    const rounds = historyRef.current;
    const total = rounds.length;
    const correctCount = rounds.filter((r) => r.correct).length;
    const stars = total === 0 ? 0 : correctCount === total ? 3 : correctCount / total >= 0.5 ? 2 : 1;
    const breakdown = rounds.map((r, i) => ({ id: `round${i + 1}_${r.strength}`, correct: r.correct, chose: r.prediction }));
    const itemsExplored = Array.from(new Set(rounds.map((r) => r.strength)));
    const detail = {
      evaluated: true,
      score: correctCount, total,
      stars,
      breakdown,
      interactions: {
        attempts: total,
        correctFirstTry: correctCount,
        hintsUsed: hintsUsedRef.current,
        itemsExplored,
        durationMs: Date.now() - sessionStartRef.current,
      },
      learned: [
        'Moving air can carry away light material (like husk) while heavier material (like grain) falls almost straight down.',
        'Separating a mixture this way — using a stream of air — is called winnowing.',
        'Wind strength matters: too gentle a breeze leaves husk behind; too strong a gust can blow away a little grain too.',
      ],
    };
    setFinishSummary(detail);
    setFinished(true);
    setFinishOverlayVisible(true);
    setShowPopup(false);
    playCue('done');
    emit({ type: 'event', name: 'finished', detail });
  }, [playCue]);

  // ---- mode + depth switch: shared by props, setOperatorMode, AND the clickable toggle (§6.1) ----
  const applyMode = useCallback((m: OperatorMode) => {
    if (m !== 'ai' && m !== 'student') return;
    setMode(m);
    playCue('tap');
    emit({
      type: 'event', name: 'operator_mode_changed',
      detail: { mode: m, depth: m === 'ai' ? 'lean' : 'full', stepCount: m === 'ai' ? 2 : 4, exampleCount: m === 'ai' ? 1 : 6 },
    });
  }, [playCue]);

  // ---- highlight(target): non-destructive laser-pointer pulse on any nameable element ----
  const doHighlight = useCallback((target: HighlightTarget) => {
    setHighlight(target);
    hintsUsedRef.current += 1;
    emit({ type: 'event', name: 'highlighted', detail: { target } });
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlight(null), 2400);
  }, []);

  // ---- reset(): return to the initial predict state, clearing everything with motion ----
  const doReset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    pausedRef.current = false;
    setShowPopup(false); setOutcome(null); setPrediction(null);
    setStrength(ap.defaultStrength ?? 'medium');
    setHighlight(null); setRunsDone(0);
    setSeed(props.seed ?? Date.now());
    setPhase('predict');
    historyRef.current = []; hintsUsedRef.current = 0; sessionStartRef.current = Date.now();
    setFinished(false); setFinishOverlayVisible(false); setFinishSummary(null);
    emit({ type: 'event', name: 'reset', detail: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ap.defaultStrength, props.seed]);

  // ---- setParam(name, value): every tunable the agent may set (plain fn = always fresh) ----
  const applyParam = (name: string, value: any) => {
    switch (name) {
      case 'muted': setMuted(!!value); break;
      case 'operatorMode': applyMode(value); break;
      case 'material': handleMaterial(value); break;
      case 'strength': case 'wind': handleWind(value); break;
      case 'prediction': handlePredict(value); break;
      default: break;   // ignore unknown params (robustness)
    }
  };

  // ---- THE AGENT API: every windowMethod in the JSON is a key here ----
  const api = {
    setParam: (n: string, v: any) => applyParam(n, v),
    play: () => { if (stateRef.current.phase === 'blowing') { pausedRef.current = false; } else handleBlow(); },
    pause: () => { pausedRef.current = true; },
    reset: doReset,
    highlight: (t: HighlightTarget) => doHighlight(t),
    getState: () => { emit({ type: 'state', state: stateRef.current }); return stateRef.current; },
    setOperatorMode: (m: OperatorMode) => applyMode(m),
    // ── tool-specific verbs ──
    predict: (p: PredictKey) => handlePredict(p),
    setWind: (k: StrengthKey) => handleWind(k),
    setMaterial: (k: MaterialKey) => handleMaterial(k),
    blow: () => handleBlow(),
  };
  const apiRef = useRef(api); apiRef.current = api;   // handler always reads the LATEST api

  // ---- command listener + the REQUIRED ready signal (§3.1/§3.2) ----
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== 'command') return;
      try {
        const fn = (apiRef.current as any)[d.method];
        let result; if (typeof fn === 'function') result = fn(...(d.args || []));
        emit({ type: 'response', id: d.id, result });   // echo id + return value so queries correlate
      } catch { emit({ type: 'response', id: d?.id, result: null }); }   // never throw out of the handler
    };
    window.addEventListener('message', onMsg);
    emit({ type: 'ready', toolId: TOOL_ID });   // ⭐ MUST fire once, or every command is dropped
    return () => window.removeEventListener('message', onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- keep in sync if the HOST changes the mode via props ----
  useEffect(() => {
    if (props.operatorMode && props.operatorMode !== mode) setMode(props.operatorMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.operatorMode]);

  // ---- redraw idle canvas when highlight target changes (so scene rings re-anchor) ----
  useEffect(() => { if (phase !== 'blowing') draw(); }, [highlight]); // eslint-disable-line

  // ---- sizing (device-aware touch floors, §7.4) ----
  const bodyFont = isMobile ? tier.bodyFontMobile : tier.bodyFontDesktop;
  const heroFont = isMobile ? tier.heroFontMobile : tier.heroFontDesktop;
  // Height-first fit (§8.1): squeeze chrome on the short frame, grow on the tall one.
  const pad = short ? 8 : isMobile ? 14 : 22;
  const touch = device === 'smartboard' ? 60 : isMobile ? tier.touchTargetMobile : 52;
  // Cap the canvas so the stage never pushes the layout past the frame height.
  // Short (Mobile App 844×390): hard cap. Tall (Smart Board 1920×1080): allow it to grow and fill.
  const stageMaxH = short ? Math.max(150, vpH - 176) : Math.min(tall ? 640 : 470, Math.round(vpH * 0.6));
  const cardMaxW = tall ? 1560 : landscape ? 1180 : 880;

  const order: Phase[] = ['predict', 'ready', 'blowing', 'result'];
  const progress = ((order.indexOf(phase) + 1) / order.length) * 100;
  const isAI = mode === 'ai';
  const hl = (t: HighlightTarget) => (highlight === t ? 'ba-hl' : '');

  // canvas-scene highlight rings, positioned by % of the stage so they re-anchor on reflow
  const SCENE_RING: Partial<Record<HighlightTarget, { x: number; y: number; w: number; h: number }>> = {
    tray: { x: ((EMIT_X - 62) / LW) * 100, y: ((EMIT_Y - 44) / LH) * 100, w: (124 / LW) * 100, h: (88 / LH) * 100 },
    grainPile: { x: ((PILE_X - 48) / LW) * 100, y: ((GROUND_Y - 34) / LH) * 100, w: (96 / LW) * 100, h: (64 / LH) * 100 },
    huskZone: { x: 58, y: 16, w: 36, h: 30 },
    windArrows: { x: 1, y: 20, w: 16, h: 30 },
  };
  const sceneRing = SCENE_RING[highlight as HighlightTarget];

  const resultNote = outcome && (outcome.quality === 'gentle'
    ? `The breeze was too gentle — some ${mat.lightName.toLowerCase()} stayed behind in the pile. A steadier wind separates more cleanly.`
    : outcome.quality === 'strong'
    ? `A very strong gust blew away all the ${mat.lightName.toLowerCase()}, but a few ${mat.heavyName.toLowerCase()} were carried off too — a little wasteful.`
    : `A steady wind worked perfectly — the light ${mat.lightName.toLowerCase()} blew away and every ${mat.heavyName.toLowerCase()} stayed. Clean winnowing!`);

  // ---------------- STAGE PANE (the showpiece — renders in BOTH modes) ----------------
  const stagePane = (
    <div ref={wrapRef} className="ba-stagepane" style={{ width: '100%', maxHeight: stageMaxH, aspectRatio: `${LW} / ${LH}`, borderRadius: DS.radii.lg, overflow: 'hidden', border: `1px solid ${S.border}`, background: '#CFE6FB', position: 'relative' }}>
      {/* object-fit:contain keeps the scene's aspect ratio when the height cap kicks in — letterboxes into sky rather than scrolling or squishing */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />

      {/* prediction chip */}
      {prediction && phase !== 'predict' && (
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', borderRadius: DS.radii.pill, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: DS.primaryDark, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', animation: 'ba-fadeUp 0.4s ease' }}>
          {isAI ? 'Prediction' : 'Your guess'}: {prediction === 'light' ? mat.lightName : mat.heavyName}
        </div>
      )}

      {/* live counters */}
      {(phase === 'blowing' || phase === 'result') && (
        <div style={{ position: 'absolute', right: 10, bottom: 10, display: 'flex', gap: 8 }}>
          <span className={hl('stayedCount')} style={counterChip(DS.success, DS.successLight)}>{mat.heavyEmoji} Stayed: {live.stayed}</span>
          <span className={hl('blownCount')} style={counterChip(DS.accentDark, DS.accentLight)}>{mat.lightEmoji} Blown: {live.carried}</span>
        </div>
      )}

      {/* canvas-scene highlight ring (agent laser-pointer for tray / piles / wind) */}
      {sceneRing && (
        <div className="ba-hl" style={{ position: 'absolute', left: `${sceneRing.x}%`, top: `${sceneRing.y}%`, width: `${sceneRing.w}%`, height: `${sceneRing.h}%`, border: `2.5px solid ${DS.primary}`, borderRadius: 14, pointerEvents: 'none', background: 'rgba(74,77,201,0.08)' }} />
      )}
    </div>
  );

  // ---------------- CONTROLS PANE (depth adapts to mode, §6.2) ----------------
  const controlsPane = (
    <div className="ba-controls" style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: landscape ? 'center' : 'flex-start' }}>
      {/* material switch — full depth only (Student), and only when more than one mixture exists */}
      {!isAI && !ap.lockMaterial && Object.keys(MATERIALS).length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', opacity: phase === 'blowing' ? 0.5 : 1, pointerEvents: phase === 'blowing' ? 'none' : 'auto' }}>
          {(Object.keys(MATERIALS) as MaterialKey[]).map((k) => (
            <button key={k} onClick={() => handleMaterial(k)} style={chip(material === k)}>{MATERIALS[k].label}</button>
          ))}
        </div>
      )}

      {/* story line — full depth only */}
      {!isAI && tier.storyFrame && (
        <p style={{ margin: 0, fontStyle: 'italic', color: S.sub, fontSize: bodyFont, lineHeight: 1.5 }}>{mat.story}</p>
      )}

      {/* ===== TEACHER (ai) — lean DEMO: watch caption + compact status, controls hidden ===== */}
      {isAI && (
        <div className="ba-mode-enter" style={{ background: dark ? DARK.panelSoft : DS.primaryGhost, border: `1px solid ${dark ? DARK.border : DS.primaryLight}`, borderRadius: DS.radii.lg, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: bodyFont + 1, color: dark ? DARK.text : DS.primaryDark }}>
            <span style={{ fontSize: 20 }}>👩‍🏫</span> Your teacher is showing you this — watch, you'll get a turn.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={counterChip(DS.primaryDark, dark ? DARK.ghost : DS.primaryLight)}>{STRENGTHS[strength].emoji} Wind: {STRENGTHS[strength].label}</span>
            <span style={counterChip(DS.primaryDark, dark ? DARK.ghost : DS.primaryLight)}>{mat.label}</span>
            {prediction && <span style={counterChip(DS.accentDark, DS.accentLight)}>Guess: {prediction === 'light' ? mat.lightName : mat.heavyName}</span>}
          </div>
          {phase === 'result' && outcome && (
            <p style={{ margin: '12px 0 0', fontSize: bodyFont, lineHeight: 1.55, color: S.text }}>
              The lighter <b>{mat.lightName.toLowerCase()}</b> are carried off by the moving air while the heavier <b>{mat.heavyName.toLowerCase()}</b> fall straight down — this is <b>winnowing</b>. {resultNote}
            </p>
          )}
        </div>
      )}

      {/* ===== STUDENT (full) — the real practice controls ===== */}
      {!isAI && phase === 'predict' && (
        <div className="ba-mode-enter">
          <p style={{ fontWeight: 700, fontSize: bodyFont + 2, margin: '0 0 12px', color: S.text }}>
            Predict first: when you blow air across the tray, which part flies away?
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className={hl('predictLight')} onClick={() => handlePredict('light')} style={predictBtn(touch, dark)}>
              <span style={{ fontSize: 22 }}>{mat.lightEmoji}</span> The light {mat.lightName.toLowerCase()}
            </button>
            <button className={hl('predictHeavy')} onClick={() => handlePredict('heavy')} style={predictBtn(touch, dark)}>
              <span style={{ fontSize: 22 }}>{mat.heavyEmoji}</span> The heavy {mat.heavyName.toLowerCase()}
            </button>
          </div>
        </div>
      )}

      {!isAI && phase === 'ready' && (
        <div className="ba-mode-enter">
          <p style={{ fontWeight: 700, fontSize: bodyFont + 1, margin: '0 0 10px', color: S.text }}>Pick how hard you blow:</p>
          <div className={hl('windControls')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, padding: 2 }}>
            {(Object.keys(STRENGTHS) as StrengthKey[]).map((k) => (
              <button key={k} onClick={() => handleWind(k)} style={strengthBtn(strength === k, touch)}>
                <span style={{ fontSize: 20 }}>{STRENGTHS[k].emoji}</span> {STRENGTHS[k].label}
              </button>
            ))}
          </div>
          <button className={hl('blowButton')} onClick={handleBlow} style={ctaBtn(touch)}><Play size={18} /> Blow the air</button>
        </div>
      )}

      {!isAI && phase === 'blowing' && (
        <div style={{ textAlign: 'center', color: dark ? DARK.text : DS.primaryDark, fontWeight: 600, fontSize: bodyFont + 1, animation: 'ba-pulse 1.4s ease-in-out infinite', lineHeight: 1.5 }}>
          <Wind size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Watch! The light {mat.lightName.toLowerCase()} float away on the wind, while the heavy {mat.heavyName.toLowerCase()} drop straight down.
        </div>
      )}

      {!isAI && phase === 'result' && outcome && !finished && (
        <div className="ba-mode-enter">
          <ResultSummary outcome={outcome} mat={mat} bodyFont={bodyFont} onTryAgain={handleTryAgain} onNewStrength={handleNewStrength} onFinish={handleFinish} tier={tier} touch={touch} S={S} />
        </div>
      )}

      {/* runs practised (full-depth progress across the larger set, §6.2) */}
      {!isAI && runsDone > 0 && !finished && (
        <div style={{ fontSize: bodyFont - 2, color: S.sub, fontWeight: 600 }}>
          Winnowing runs completed: {runsDone} {runsDone >= 3 ? '⭐' : ''}
        </div>
      )}

      {/* Session complete (§6.3): the forward path ends here — no replay control is offered. */}
      {!isAI && finished && finishSummary && (
        <div className="ba-mode-enter" style={{ background: S.panel, borderRadius: DS.radii.lg, padding: 16, border: `1px solid ${S.border}`, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: bodyFont + 2, color: S.text, marginBottom: 6 }}>Activity finished ✓</div>
          <div style={{ fontSize: bodyFont, color: S.sub }}>
            {finishSummary.score}/{finishSummary.total} predictions correct
            {tier.showStars && <span style={{ marginLeft: 8 }}>{'⭐'.repeat(finishSummary.stars)}</span>}
          </div>
          {!finishOverlayVisible && (
            <button onClick={() => setFinishOverlayVisible(true)} style={{ ...outlineBtn(touch), marginTop: 12 }}>View summary</button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="ba-frame" style={{ fontFamily: "'Poppins', system-ui, sans-serif", background: dark ? DARK.bg : 'transparent', padding: short ? 6 : 14 }}>
    <div className="ba-card" style={{
      width: '100%', maxWidth: cardMaxW,
      margin: '0 auto', background: S.card, borderRadius: DS.radii.xl, overflow: 'hidden',
      boxShadow: S.shadow, color: S.text,
    }}>
      {/* Header: title + instruction  |  Teacher/Student toggle + mute (§6.1). Compresses hard on the short (844×390) frame. */}
      <div style={{ background: DS.headerGradient, padding: short ? '8px 14px' : isMobile ? '14px 16px' : '18px 24px', color: DS.white, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', flex: '0 0 auto' }}>
        <div style={{ minWidth: 180, flex: '1 1 240px' }}>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: short ? 16 : isMobile ? 19 : 25, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.01em' }}>
            <Wind size={short ? 18 : isMobile ? 21 : 26} /> Blowing-Air Separation Lab
          </h2>
          {!short && <p style={{ margin: '6px 0 0', fontWeight: 400, fontSize: bodyFont - 1, opacity: 0.92, lineHeight: 1.4 }}>{instructionsLine}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showModeToggle && (
            <div className={hl('modeToggle')} role="group" aria-label="Who is driving" style={segWrap()}>
              <button onClick={() => applyMode('ai')} aria-pressed={isAI} style={segBtn(isAI)}>👩‍🏫 Teacher</button>
              <button onClick={() => applyMode('student')} aria-pressed={!isAI} style={segBtn(!isAI)}>🙋 Your turn</button>
            </div>
          )}
          <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'} style={iconToggle()}>
            {muted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ height: 5, background: S.border, width: '100%', flex: '0 0 auto' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: DS.ctaGradient, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>

      {/* Body: stacks in portrait, splits into two panes in landscape (§8.1). Fills the remaining height. */}
      <div className={`ba-body ${landscape ? 'ba-land' : ''}`} style={{ padding: pad }}>
        {stagePane}
        {controlsPane}
      </div>
    </div>

    {/* Per-round completion celebration — a full-viewport, non-blocking overlay that owns the whole
        screen then fades and hands it back (§7.4). The "what happened" reveal stays in the panel
        underneath. This is per-round feedback, distinct from the session Finish screen below. */}
    {showPopup && outcome && !finished && (
      <CelebrationOverlay outcome={outcome} tier={tier} heroFont={heroFont} bodyFont={bodyFont} onDone={() => setShowPopup(false)} />
    )}

    {/* The uniform FINISH screen (§6.3): full-screen, star rating earned from the student's actual
        prediction accuracy + a "What you have learned" panel. This is the tool's one true ending —
        there is no control here that loops back to the start. */}
    <AnimatePresence>
      {!isAI && finished && finishOverlayVisible && finishSummary && (
        <FinishScreen summary={finishSummary} tier={tier} heroFont={heroFont} bodyFont={bodyFont} onClose={() => setFinishOverlayVisible(false)} />
      )}
    </AnimatePresence>
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
  bodyFont: number; onTryAgain: () => void; onNewStrength: () => void; onFinish: () => void;
  tier: typeof TIER_CONFIG[GradeLevel]; touch: number;
  S: ReturnType<typeof surfaces>;
}> = ({ outcome, mat, bodyFont, onTryAgain, onNewStrength, onFinish, tier, touch, S }) => {
  const note =
    outcome.quality === 'gentle'
      ? `The breeze was too gentle — some ${mat.lightName.toLowerCase()} stayed behind in the pile. A steadier wind gives a cleaner separation.`
      : outcome.quality === 'strong'
      ? `The gust was very strong — all the ${mat.lightName.toLowerCase()} flew off, but a few ${mat.heavyName.toLowerCase()} got blown away too. A little wasteful!`
      : `A steady wind worked perfectly — all the light ${mat.lightName.toLowerCase()} blew away and every ${mat.heavyName.toLowerCase()} stayed. Clean winnowing!`;
  return (
    <div style={{ background: S.panel, borderRadius: DS.radii.lg, padding: 18, border: `1px solid ${S.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontWeight: 700, fontSize: bodyFont + 2, color: outcome.correct ? DS.success : DS.danger }}>
        {outcome.correct ? <Check size={22} /> : <X size={22} />}
        {outcome.correct ? 'Your prediction was right!' : 'Not quite what you predicted.'}
      </div>
      <p style={{ margin: '0 0 8px', fontSize: bodyFont, lineHeight: 1.55, color: S.text }}>
        The lighter <b>{mat.lightName.toLowerCase()}</b> are carried away by the moving air, while the heavier <b>{mat.heavyName.toLowerCase()}</b> are too heavy and fall straight down. This method is called <b>winnowing</b>.
      </p>
      <p style={{ margin: '0 0 14px', fontSize: bodyFont - 1, lineHeight: 1.5, color: S.sub }}>{note}</p>
      {/* Two ways to keep practising this round (not a whole-tool restart — §6.3), plus the
          uniform, primary Finish control that ends the activity and opens the finish screen. */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={onNewStrength} style={outlineBtn(touch)}><Wind size={18} /> Try a different wind</button>
        <button onClick={onTryAgain} style={outlineBtn(touch)}><RotateCcw size={18} /> {tier.anotherRoundLabel}</button>
        <button onClick={onFinish} style={ctaBtn(touch)}><Check size={18} /> Finish</button>
      </div>
    </div>
  );
};

// Full-viewport completion celebration (§7.4): position:fixed inset:0, pointer-events:none, high z-index.
// Stars/confetti burst from centre and rain across the FULL width and height; a centred "well done!"
// moment scales in; the whole layer then fades and hands the screen back. Never a corner/footer strip.
const CelebrationOverlay: React.FC<{
  outcome: { correct: boolean; quality: StrengthKey };
  tier: typeof TIER_CONFIG[GradeLevel];
  heroFont: number; bodyFont: number; onDone: () => void;
}> = ({ outcome, tier, heroFont, bodyFont, onDone }) => {
  const msg = outcome.correct ? tier.encouragement.high : tier.encouragement.low;
  // auto-dismiss after the moment plays; it owns the screen briefly, then releases it
  useEffect(() => {
    const t = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(t);
  }, [onDone]);
  const colors = [DS.primary, DS.accent, DS.accentDark, DS.primaryLight, DS.amber, DS.success];
  const pieceCount = outcome.correct ? tier.confettiCount : Math.round(tier.confettiCount * 0.35);
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', overflow: 'hidden',
        animation: 'ba-cel-fade 2.6s ease forwards',
      }}
    >
      {/* confetti / stars raining across the WHOLE viewport (full width, full height) */}
      {Array.from({ length: pieceCount }).map((_, i) => {
        const star = outcome.correct && i % 4 === 0;
        const left = (i * 61) % 100;                 // spread across full width
        const dur = 2.0 + (i % 6) * 0.28;
        const delay = (i % 9) * 0.09;
        const size = 8 + (i % 4) * 3;
        return star ? (
          <span key={i} style={{ position: 'absolute', top: 0, left: `${left}%`, fontSize: size + 8, animation: `ba-rain ${dur}s linear ${delay}s forwards` }}>⭐</span>
        ) : (
          <span key={i} style={{ position: 'absolute', top: 0, left: `${left}%`, width: size, height: size * 1.5, background: colors[i % colors.length], borderRadius: 2, animation: `ba-rain ${dur}s linear ${delay}s forwards` }} />
        );
      })}

      {/* centred "well done!" moment — bursts from the centre of the frame */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center', animation: 'ba-cel-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <div style={{ width: 92, height: 92, margin: '0 auto 14px', borderRadius: '50%', background: outcome.correct ? DS.successLight : DS.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 18px 40px -10px rgba(0,0,0,0.35)', animation: 'ba-pop 0.5s ease' }}>
            {outcome.correct ? <Check size={50} color={DS.success} strokeWidth={3} /> : <Sparkles size={46} color={DS.accent} />}
          </div>
          {tier.showStars && outcome.correct && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
              {Array.from({ length: tier.starCount }).map((_, i) => (
                <span key={i} style={{ fontSize: 34, animation: `ba-star 0.5s ease ${i * tier.starStaggerMs}ms both` }}>⭐</span>
              ))}
            </div>
          )}
          <h3 style={{ margin: '0 0 6px', fontSize: heroFont + 4, fontWeight: 800, color: '#fff', textShadow: '0 3px 16px rgba(0,0,0,0.4)', fontFamily: "'Poppins', sans-serif" }}>
            {outcome.correct ? 'You winnowed it!' : 'Good experiment!'}
          </h3>
          <p style={{ margin: 0, fontSize: bodyFont + 1, fontWeight: 600, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.45)', maxWidth: 460 }}>{msg}</p>
        </div>
      </div>
    </div>
  );
};

// Uniform FINISH screen (§6.3): full-viewport overlay, position:fixed inset:0, high z-index.
// This tool EVALUATES the student (predict-then-reveal has a right/wrong answer), so Finish opens
// the star-rating screen + "What you have learned" — never a star-less screen, never a replay CTA.
const FinishScreen: React.FC<{
  summary: { score: number; total: number; stars: number; learned: string[] };
  tier: typeof TIER_CONFIG[GradeLevel];
  heroFont: number; bodyFont: number; onClose: () => void;
}> = ({ summary, tier, heroFont, bodyFont, onClose }) => {
  const colors = [DS.primary, DS.accent, DS.accentDark, DS.primaryLight, DS.amber, DS.success];
  const pieceCount = Math.round(tier.confettiCount * 0.8);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, overflow: 'hidden', background: 'rgba(20,16,40,0.62)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      {/* confetti/star burst across the FULL viewport (pointer-events:none so it never blocks the close action) */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {Array.from({ length: pieceCount }).map((_, i) => {
          const star = i % 4 === 0;
          const left = (i * 53) % 100;
          const dur = 2.2 + (i % 6) * 0.3;
          const delay = (i % 9) * 0.09;
          const size = 8 + (i % 4) * 3;
          return star ? (
            <span key={i} style={{ position: 'absolute', top: 0, left: `${left}%`, fontSize: size + 8, animation: `ba-rain ${dur}s linear ${delay}s infinite` }}>⭐</span>
          ) : (
            <span key={i} style={{ position: 'absolute', top: 0, left: `${left}%`, width: size, height: size * 1.5, background: colors[i % colors.length], borderRadius: 2, animation: `ba-rain ${dur}s linear ${delay}s infinite` }} />
          );
        })}
      </div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{ position: 'relative', width: 'min(94vw, 460px)', maxHeight: '86vh', overflow: 'auto', background: DS.white, borderRadius: DS.radii.xl, padding: '28px 24px', textAlign: 'center', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}
      >
        <div style={{ fontSize: heroFont - 6, fontWeight: 800, color: DS.primaryDark, marginBottom: 4, fontFamily: "'Poppins', sans-serif" }}>Lab complete!</div>
        <div style={{ fontSize: bodyFont, color: DS.gray700, marginBottom: 14 }}>
          {summary.score}/{summary.total} predictions correct
        </div>
        {tier.showStars && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} style={{ fontSize: 40, opacity: i < summary.stars ? 1 : 0.25, animation: i < summary.stars ? `ba-star 0.5s ease ${i * 180}ms both` : 'none' }}>⭐</span>
            ))}
          </div>
        )}
        <div style={{ background: DS.primaryGhost, borderRadius: DS.radii.lg, padding: '14px 16px', textAlign: 'left', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, color: DS.primaryDark, fontSize: bodyFont - 1, marginBottom: 8 }}>🌟 What you have learned</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: DS.gray900, fontSize: bodyFont - 2, lineHeight: 1.6 }}>
            {summary.learned.map((l, i) => (<li key={i}>{l}</li>))}
          </ul>
        </div>
        <button onClick={onClose} style={{ ...ctaBtn(48), width: '100%' }}>Done</button>
      </motion.div>
    </motion.div>
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
function predictBtn(touch: number, dark = false): React.CSSProperties {
  return { flex: '1 1 160px', minHeight: touch + 12, padding: '14px 16px', borderRadius: DS.radii.lg, border: `2px solid ${dark ? DARK.border : DS.primaryLight}`, background: dark ? DARK.panelSoft : DS.primaryGhost, color: dark ? DARK.text : DS.primaryDark, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s ease', textAlign: 'left' };
}
// segmented Teacher|Student toggle + mute — real styled controls, not default checkboxes (§6.1)
function segWrap(): React.CSSProperties {
  return { display: 'inline-flex', background: 'rgba(255,255,255,0.18)', borderRadius: DS.radii.pill, padding: 3, gap: 3, backdropFilter: 'blur(4px)' };
}
function segBtn(on: boolean): React.CSSProperties {
  return { minHeight: 32, padding: '6px 12px', borderRadius: DS.radii.pill, border: 'none', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)', background: on ? '#fff' : 'transparent', color: on ? DS.primaryDark : 'rgba(255,255,255,0.9)', boxShadow: on ? '0 4px 10px -3px rgba(0,0,0,0.3)' : 'none' };
}
function iconToggle(): React.CSSProperties {
  return { minWidth: 38, minHeight: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: DS.radii.pill, border: 'none', background: 'rgba(255,255,255,0.18)', cursor: 'pointer', transition: 'all 0.2s ease' };
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