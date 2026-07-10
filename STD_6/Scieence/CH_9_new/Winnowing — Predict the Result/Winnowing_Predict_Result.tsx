// ═══════════════════════════════════════════════════════════════════════════
// FILE: blowing_air_separation_lab.tsx
// Winnowing (Blowing-Air Separation) Lab — fully conformant to 2D_PROMPT_3.md
//
// NEW vs original:
//  • Full agent-control contract (§3): postMessage listener, apiRef, ready signal
//  • All standard windowMethods: setParam, play, pause, reset, highlight,
//    getState, setOperatorMode — plus tool-specific: predict, setStrength, blow,
//    changeStrength, finish
//  • Teacher / Student segmented toggle (§6.1) — clickable, styled, live-switches
//  • ai_operated → lean demo view (controls hidden, "watch" caption)
//  • student_operated → full POE flow with all controls
//  • Content depth adapts (§6.2): Teacher = single forced-medium demo round;
//    Student = full predict→ready→blowing→result with all strength choices
//  • Highlight pulsing ring on any named element (§3.3)
//  • getState() returns & emits full state snapshot (§3.2)
//  • Web Audio synthesised sound cues: tap, correct, wrong, done (§7.3)
//  • operator_mode_changed event with depth detail (§6.1)
//  • Emits events: prediction_made, strength_changed, blow_started,
//    blow_completed, result_reviewed, operator_mode_changed, reset (§3.5)
//  • muted support via setParam('muted', bool) + visible mute toggle (§7.3)
//  • No vertical/horizontal page scroll at any supported size (§8)
//  • box-sizing: border-box everywhere (§8, §8.1)
//  • Orientation-aware two-pane layout in landscape (§8.1)
//  • Completion celebration: position:fixed full-viewport overlay (§7.4)
//  • Responsive 320px → 1920px, 390px height-first design (§8.1)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ──────────────── TOOL ID ────────────────
const TOOL_ID = 'blowing_air_separation_lab';
const emit = (m: any) => { try { window.parent.postMessage(m, '*'); } catch {} };

// ──────────────── INLINE ICONS ────────────────
interface IconProps { size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }
const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({ size = 24, color = 'currentColor', strokeWidth = 2, style, children }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);
const Play: React.FC<IconProps> = (p) => (<Svg {...p}><polygon points="6 3 20 12 6 21 6 3" fill={p.color ?? 'currentColor'} stroke="none" /></Svg>);
const WindIcon: React.FC<IconProps> = (p) => (<Svg {...p}><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></Svg>);
const Check: React.FC<IconProps> = (p) => (<Svg {...p}><polyline points="20 6 9 17 4 12" /></Svg>);
const X: React.FC<IconProps> = (p) => (<Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>);
const ChevronRight: React.FC<IconProps> = (p) => (<Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>);
const Volume2: React.FC<IconProps> = (p) => (<Svg {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></Svg>);
const VolumeX: React.FC<IconProps> = (p) => (<Svg {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></Svg>);

// ──────────────── DESIGN TOKENS (Singularity) ────────────────
const DS = {
  primary: '#4A4DC9', primaryDark: '#533086', primaryLight: '#C1C1EA', primaryGhost: '#EDEDF8',
  accent: '#FF7212', accentDark: '#FC9145', accentLight: '#FFF3E4',
  gray900: '#1A1A2E', gray700: '#4E4E4E', gray400: '#CACACA', gray200: '#EBEBEB', gray100: '#F5F5F5',
  white: '#FFFFFF', success: '#16A34A', successLight: '#DCFCE7', danger: '#E53E3E', amber: '#F59E0B',
  radii: { sm: 8, md: 12, lg: 16, xl: 24, pill: 9999 },
  headerGradient: 'linear-gradient(135deg, #533086 0%, #4A4DC9 60%, #FC9145 140%)',
  ctaGradient: 'linear-gradient(135deg, #FF7212 0%, #FC9145 100%)',
};

// ──────────────── TYPES ────────────────
type OperatorMode = 'ai' | 'student';
type Phase = 'predict' | 'ready' | 'blowing' | 'result' | 'finished';
type MaterialKey = 'wheat';
type StrengthKey = 'gentle' | 'medium' | 'strong';
type GradeLevel = 6 | 7 | 8;
type HighlightTarget = 'predictLight' | 'predictHeavy' | 'strengthGentle' | 'strengthMedium' | 'strengthStrong'
  | 'blowButton' | 'canvas' | 'changeWindButton' | 'finishButton' | 'modeToggle' | 'muteToggle';

interface RoundRecord { strength: StrengthKey; prediction: 'light' | 'heavy'; correct: boolean; }

interface FinishSummary {
  evaluated: true;
  score: number; total: number; stars: number;
  breakdown: { id: string; correct: boolean; chose: 'light' | 'heavy' }[];
  interactions: { attempts: number; correctFirstTry: number; hintsUsed: number; itemsExplored: string[]; durationMs: number };
  learned: string[];
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
  operatorMode?: OperatorMode;
  showModeToggle?: boolean;
  props?: {
    width?: number;
    height?: number;
    initialMode?: string;
    showModeSelector?: boolean;
    enabledModes?: string[];
    showNavigation?: boolean;
    showPlayPause?: boolean;
    showStepIndicator?: boolean;
    animationSpeed?: number;
    autoPlayDuration?: number;
    themeColor?: string;
    darkMode?: boolean;
    gradeLevel?: GradeLevel;
    additionalProps?: BlowingAirAdditionalProps;
    operatorMode?: OperatorMode;
    showModeToggle?: boolean;
  };
  setStepDetails?: (s: any) => void;
}

// ──────────────── TIER CONFIG ────────────────
const TIER_CONFIG = {
  6: {
    confettiCount: 70, scoreSizePx: 64, showStars: true, starCount: 3, starStaggerMs: 200,
    encouragement: { high: 'Brilliant! You think like a real farmer!', mid: "Nice try! Let's see what the wind taught us.", low: 'Good guess! Watch closely — the wind never lies.' },
    heroFontMobile: 36, heroFontDesktop: 48, bodyFontMobile: 15, bodyFontDesktop: 16, touchTargetMobile: 52, storyFrame: true,
  },
  7: {
    confettiCount: 40, scoreSizePx: 56, showStars: true, starCount: 3, starStaggerMs: 200,
    encouragement: { high: 'Strong prediction — concept locked.', mid: 'Good — review what happened.', low: "Let's see why the wind behaved this way." },
    heroFontMobile: 30, heroFontDesktop: 42, bodyFontMobile: 14, bodyFontDesktop: 15, touchTargetMobile: 48, storyFrame: false,
  },
  8: {
    confettiCount: 15, scoreSizePx: 48, showStars: false, starCount: 0, starStaggerMs: 0,
    encouragement: { high: 'Correct. You predicted it accurately.', mid: 'Review the outcome carefully.', low: 'Work through why separation occurred this way.' },
    heroFontMobile: 28, heroFontDesktop: 38, bodyFontMobile: 14, bodyFontDesktop: 15, touchTargetMobile: 46, storyFrame: false,
  },
} as const;

// ──────────────── MATERIAL DATA ────────────────
const MATERIALS: Record<MaterialKey, { label: string; heavyName: string; lightName: string; story: string; heavyColor: string; heavyEdge: string; lightColor: string; lightEdge: string; heavyEmoji: string; lightEmoji: string; kurta: string }> = {
  wheat: { label: 'Wheat & Husk', heavyName: 'Wheat grains', lightName: 'Husk', story: 'The farmers threshed the wheat — now heavy grains and light husk are all mixed up.', heavyColor: '#E0B84C', heavyEdge: '#B08A28', lightColor: '#E8DCB0', lightEdge: '#C4B47C', heavyEmoji: '🌾', lightEmoji: '🍃', kurta: '#3B6FB5' },
};

const STRENGTHS: Record<StrengthKey, { label: string; wind: number; emoji: string; desc: string }> = {
  gentle: { label: 'Gentle breeze', wind: 150, emoji: '🍃', desc: 'Some husk stays behind' },
  medium: { label: 'Steady wind',   wind: 300, emoji: '💨', desc: 'Clean separation' },
  strong: { label: 'Strong gust',   wind: 480, emoji: '🌪️', desc: 'A little grain wasted' },
};

// ──────────────── HELPERS ────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const useResponsive = () => {
  const [dims, setDims] = useState(() => ({ w: typeof window !== 'undefined' ? window.innerWidth : 800, h: typeof window !== 'undefined' ? window.innerHeight : 600 }));
  useEffect(() => {
    const h = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', h); h();
    return () => window.removeEventListener('resize', h);
  }, []);
  return { ...dims, isMobile: dims.w < 576, isLandscape: dims.w > dims.h };
};

// ──────────────── STAGE GEOMETRY ────────────────
const LW = 760; const LH = 480;
const GROUND_Y = 416; const FARMER_X = 150; const STOOL_TOP = GROUND_Y - 64;
const EMIT_X = 226; const EMIT_Y = 196;
const GRAIN_COL_W = 7; const GRAIN_H = 3.0; const GRAIN_STEP = 1;

// ──────────────── PARTICLE MODEL ────────────────
interface Particle { x: number; y: number; vx: number; vy: number; size: number; rot: number; vrot: number; kind: 'heavy' | 'light'; willCarry: boolean; emitDelay: number; emitted: boolean; settled: boolean; exited: boolean; alpha: number; wob: number; spd: number; fall: number }

function mk(rand: () => number, kind: 'heavy' | 'light', willCarry: boolean, emitDelay: number): Particle {
  return { x: EMIT_X + (rand() - 0.5) * 44, y: EMIT_Y - 8 + (rand() - 0.5) * 10, vx: 0, vy: 0, size: kind === 'heavy' ? 5.5 + rand() * 2.5 : 5 + rand() * 3, rot: rand() * Math.PI * 2, vrot: (rand() - 0.5) * (kind === 'light' ? 7 : 3), kind, willCarry, emitDelay, emitted: false, settled: false, exited: false, alpha: 1, wob: rand() * Math.PI * 2, spd: rand(), fall: rand() };
}

function buildParticles(rand: () => number, strength: StrengthKey, heavyCount: number, lightCount: number): Particle[] {
  const arr: Particle[] = [];
  const carryFrac = strength === 'gentle' ? 0.5 : 1;
  const stealFrac = strength === 'strong' ? 0.11 : 0;
  const emitDur = 1.7; const total = heavyCount + lightCount;
  for (let i = 0; i < heavyCount; i++) arr.push(mk(rand, 'heavy', rand() < stealFrac, (i / total) * emitDur + rand() * 0.12));
  for (let i = 0; i < lightCount; i++) arr.push(mk(rand, 'light', rand() < carryFrac, ((i + heavyCount) / total) * emitDur + rand() * 0.12));
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const d = arr[i].emitDelay; arr[i].emitDelay = arr[j].emitDelay; arr[j].emitDelay = d; }
  return arr;
}

// ──────────────── CANVAS HELPERS ────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, align: 'left' | 'center', fs: number) {
  ctx.font = `600 ${fs}px Poppins, sans-serif`; const w = ctx.measureText(text).width + 20; const px = align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); roundRect(ctx, px, y - fs - 6, w, fs + 12, (fs + 12) / 2); ctx.fill();
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(text, px + 10, y);
}
function drawFarmer(ctx: CanvasRenderingContext2D, kurta: string, tip: number) {
  ctx.fillStyle = '#A6814C'; ctx.beginPath(); roundRect(ctx, FARMER_X - 46, STOOL_TOP, 92, GROUND_Y - STOOL_TOP, 6); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(FARMER_X - 46, STOOL_TOP, 92, 4);
  const feetY = STOOL_TOP; const hipY = feetY - 48; const shoulderY = hipY - 46; const headR = 16; const headCx = FARMER_X - 2; const headCy = shoulderY - headR - 6;
  ctx.strokeStyle = '#E8E2D2'; ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(FARMER_X - 8, hipY); ctx.lineTo(FARMER_X - 14, feetY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(FARMER_X + 6, hipY); ctx.lineTo(FARMER_X + 12, feetY); ctx.stroke();
  ctx.fillStyle = kurta; ctx.beginPath(); ctx.moveTo(FARMER_X - 16, hipY); ctx.lineTo(FARMER_X - 13, shoulderY); ctx.quadraticCurveTo(FARMER_X, shoulderY - 6, FARMER_X + 13, shoulderY); ctx.lineTo(FARMER_X + 16, hipY); ctx.quadraticCurveTo(FARMER_X, hipY + 6, FARMER_X - 16, hipY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#D8A271'; ctx.fillRect(headCx - 5, headCy + headR - 4, 10, 10); ctx.beginPath(); ctx.arc(headCx, headCy, headR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2A211B'; ctx.beginPath(); ctx.arc(headCx, headCy - 3, headR, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(headCx - headR, headCy - 5, headR * 2, 5);
  ctx.fillStyle = '#2A211B'; ctx.beginPath(); ctx.arc(headCx - 5, headCy, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(headCx + 5, headCy, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2A211B'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(headCx, headCy + 3, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  const handLx = EMIT_X - 26; const handRx = EMIT_X + 18; const handY = EMIT_Y + 14;
  ctx.strokeStyle = kurta; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(FARMER_X - 12, shoulderY + 4); ctx.lineTo(handLx, handY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(FARMER_X + 12, shoulderY + 4); ctx.lineTo(handRx, handY); ctx.stroke();
  ctx.fillStyle = '#D8A271'; ctx.beginPath(); ctx.arc(handLx, handY, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(handRx, handY, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(EMIT_X - 4, EMIT_Y); ctx.rotate(-0.05 + tip * 0.5);
  const tray = ctx.createLinearGradient(-52, 0, 52, 0); tray.addColorStop(0, '#E8C98C'); tray.addColorStop(1, '#CFA559');
  ctx.fillStyle = tray; ctx.beginPath(); ctx.moveTo(-52, 4); ctx.quadraticCurveTo(0, -16, 52, 4); ctx.quadraticCurveTo(36, 18, 0, 20); ctx.quadraticCurveTo(-36, 18, -52, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#A9803F'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.4;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(i * 14, -6); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.restore();
}

// ──────────────── WEB AUDIO SOUND ────────────────
function createSoundSystem() {
  let ctx: AudioContext | null = null;
  const getCtx = () => { if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); return ctx; };
  const playTone = (freq: number, type: OscillatorType, duration: number, gain: number, delay = 0, freqEnd?: number) => {
    try {
      const c = getCtx(); const o = c.createOscillator(); const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.setValueAtTime(freq, c.currentTime + delay);
      if (freqEnd) o.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + delay + duration);
      o.type = type; g.gain.setValueAtTime(0, c.currentTime + delay); g.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
      o.start(c.currentTime + delay); o.stop(c.currentTime + delay + duration + 0.05);
    } catch {}
  };
  return {
    tap: () => { playTone(420, 'sine', 0.1, 0.18); },
    correct: () => { playTone(523, 'sine', 0.15, 0.22); playTone(659, 'sine', 0.2, 0.22, 0.12); playTone(784, 'sine', 0.25, 0.22, 0.24); },
    wrong: () => { playTone(220, 'triangle', 0.25, 0.2, 0, 180); },
    done: () => { [523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.3,0.2,i*0.1)); },
    blow: () => { playTone(300, 'sawtooth', 0.8, 0.06, 0, 200); },
  };
}

// ──────────────── BUTTON STYLES ────────────────
const btn = (base: React.CSSProperties): React.CSSProperties => ({ fontFamily: "'Poppins', sans-serif", cursor: 'pointer', transition: 'all 0.2s ease', ...base });
const ctaBtn = (touch: number): React.CSSProperties => btn({ minHeight: touch, padding: '10px 22px', borderRadius: DS.radii.pill, border: 'none', background: DS.ctaGradient, color: DS.white, fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'center', boxShadow: '0 6px 16px -4px rgba(255,114,18,0.55)' });
const outlineBtn = (touch: number): React.CSSProperties => btn({ minHeight: touch, padding: '10px 20px', borderRadius: DS.radii.pill, border: `2px solid ${DS.primary}`, background: DS.white, color: DS.primary, fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'center' });
const predictBtn = (on: boolean, touch: number, highlight: boolean): React.CSSProperties => btn({ flex: '1 1 140px', minHeight: touch, padding: '12px 14px', borderRadius: DS.radii.lg, border: `2px solid ${on ? DS.primary : highlight ? DS.accent : DS.primaryLight}`, background: on ? DS.primary : highlight ? DS.accentLight : DS.primaryGhost, color: on ? DS.white : DS.primaryDark, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', boxShadow: highlight ? `0 0 0 3px ${DS.accent}44, 0 0 12px 2px ${DS.accent}44` : 'none', animation: highlight ? 'ba-pulse 1s ease-in-out infinite' : 'none' });
const strengthBtn = (on: boolean, touch: number, highlight: boolean): React.CSSProperties => btn({ flex: '1 1 120px', minHeight: touch - 4, padding: '9px 12px', borderRadius: DS.radii.md, border: `2px solid ${on ? DS.accent : highlight ? DS.accent : DS.gray400}`, background: on ? DS.accentLight : highlight ? '#FFF8F0' : DS.white, color: on ? DS.accentDark : DS.gray700, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', boxShadow: highlight ? `0 0 0 3px ${DS.accent}44` : 'none', animation: highlight ? 'ba-pulse 1s ease-in-out infinite' : 'none' });

// ──────────────── MAIN COMPONENT ────────────────
const BlowingAirSeparationLab: React.FC<ToolProps> = ({ props = {}, setStepDetails, operatorMode: opModeProp, showModeToggle: showToggleProp }) => {
  const ap = props.additionalProps || {};
  const grade: GradeLevel = props.gradeLevel ?? 6;
  const tier = TIER_CONFIG[grade];
  const { isMobile, isLandscape } = useResponsive();

  // ── operator mode (§6.1) ──
  const resolvedInitMode: OperatorMode = opModeProp ?? props.operatorMode ?? 'student';
  const [mode, setMode] = useState<OperatorMode>(resolvedInitMode);
  const showModeToggle = showToggleProp ?? props.showModeToggle ?? true;
  const depth = mode === 'ai' ? 'lean' : 'full'; // §6.2

  // ── game state ──
  const [material] = useState<MaterialKey>(ap.material ?? 'wheat');
  const [strength, setStrength] = useState<StrengthKey>(ap.defaultStrength ?? 'medium');
  const [phase, setPhase] = useState<Phase>('predict');
  const [prediction, setPrediction] = useState<'light' | 'heavy' | null>(null);
  const [seed, setSeed] = useState(() => Date.now());
  const [outcome, setOutcome] = useState<{ correct: boolean; quality: StrengthKey } | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [live, setLive] = useState({ stayed: 0, carried: 0 });
  const [muted, setMuted] = useState(false);
  const [highlights, setHighlights] = useState<Set<HighlightTarget>>(new Set());
  const [finishSummary, setFinishSummary] = useState<FinishSummary | null>(null);

  // ── evaluation tracking (this IS an evaluating POE tool — §6.3) ──
  const roundsRef = useRef<RoundRecord[]>([]);
  const hintsUsedRef = useRef(0);
  const startTimeRef = useRef<number>(Date.now());

  const mat = MATERIALS[material];
  const heavyCount = ap.heavyCount ?? 26;
  const lightCount = ap.lightCount ?? 30;

  // ── refs ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const heapRef = useRef<Record<number, number>>({});
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const windPulseRef = useRef<number>(0);
  const tRef = useRef<number>(0);
  const trayTipRef = useRef<number>(0);
  const counterTickRef = useRef<number>(0);
  const mutedRef = useRef(false);
  const soundRef = useRef<ReturnType<typeof createSoundSystem> | null>(null);
  const phaseRef = useRef<Phase>('predict');
  const strengthRef = useRef<StrengthKey>(strength);
  const predictionRef = useRef<'light' | 'heavy' | null>(null);
  const outcomeRef = useRef<{ correct: boolean; quality: StrengthKey } | null>(null);
  const modeRef = useRef<OperatorMode>(resolvedInitMode);

  // keep refs fresh
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { strengthRef.current = strength; }, [strength]);
  useEffect(() => { predictionRef.current = prediction; }, [prediction]);
  useEffect(() => { outcomeRef.current = outcome; }, [outcome]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // ── lazy sound ──
  const getSound = useCallback(() => {
    if (!soundRef.current) soundRef.current = createSoundSystem();
    return soundRef.current;
  }, []);
  const playCue = useCallback((kind: 'tap' | 'correct' | 'wrong' | 'done' | 'blow') => {
    if (mutedRef.current) return;
    try { getSound()[kind](); } catch {}
  }, [getSound]);

  // ── highlight helpers ──
  const addHL = (t: HighlightTarget) => setHighlights(p => new Set([...p, t]));
  const clearHL = (t?: HighlightTarget) => setHighlights(p => { if (!t) return new Set(); const n = new Set(p); n.delete(t); return n; });

  // ── fonts / keyframes ──
  useEffect(() => {
    const id = 'blab-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style'); s.id = id;
      s.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        @keyframes ba-fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ba-pop{0%{transform:scale(0);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
        @keyframes ba-scaleIn{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes ba-fall{0%{transform:translateY(-40px) rotate(0);opacity:1}100%{transform:translateY(480px) rotate(380deg);opacity:0}}
        @keyframes ba-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.05);opacity:0.85}}
        @keyframes ba-star{0%{transform:scale(0) rotate(-30deg);opacity:0}60%{transform:scale(1.25) rotate(8deg)}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes ba-ring{0%{box-shadow:0 0 0 0 rgba(255,114,18,0.7)}70%{box-shadow:0 0 0 10px rgba(255,114,18,0)}100%{box-shadow:0 0 0 0 rgba(255,114,18,0)}}
        @keyframes ba-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes ba-windArrow{0%{opacity:0;transform:translateX(-8px)}50%{opacity:1}100%{opacity:0;transform:translateX(8px)}}
      `;
      document.head.appendChild(s);
    }
  }, []);

  // ── step details ──
  useEffect(() => {
    const order: Phase[] = ['predict', 'ready', 'blowing', 'result', 'finished'];
    setStepDetails?.({ currentStep: order.indexOf(phase) + 1, totalSteps: order.length, isPaused: phase !== 'blowing', currentMode: 'hands_on' });
  }, [phase, setStepDetails]);

  // ── particles ──
  const resetParticles = useCallback(() => {
    const rand = mulberry32(seed ^ (strength.length * 104729) ^ (material.length * 7919));
    particlesRef.current = buildParticles(rand, strength, heavyCount, lightCount);
    heapRef.current = {}; elapsedRef.current = 0; windPulseRef.current = 0; tRef.current = 0; trayTipRef.current = 0;
    setLive({ stayed: 0, carried: 0 });
  }, [seed, strength, material, heavyCount, lightCount]);

  useEffect(() => { if (phase === 'predict' || phase === 'ready') resetParticles(); }, [phase, resetParticles]);

  // ── heap rest ──
  const heapRestY = (x: number, kind: 'heavy' | 'light' = 'heavy') => {
    let count = 0;
    for (const p of particlesRef.current) {
      if (!p.settled) continue;
      if (kind === 'light') { if (p.kind === 'light' && Math.abs(p.x - x) < 14) count++; }
      else if (p.kind === 'heavy' && Math.abs(p.x - x) < 11) count++;
    }
    return kind === 'light' ? GROUND_Y - 2 - Math.min(count, 4) * 1.1 : GROUND_Y - 4 - count * 2.6;
  };

  // ── physics step ──
  const step = useCallback((dt: number) => {
    const parts = particlesRef.current; const baseWind = STRENGTHS[strengthRef.current].wind;
    tRef.current += dt; windPulseRef.current = Math.min(1, windPulseRef.current + dt / 0.5); trayTipRef.current = Math.min(1, trayTipRef.current + dt / 0.45);
    const wind = baseWind * windPulseRef.current; const g = 540;
    const TERM_LIGHT = 120; const TERM_HEAVY = 430; const vxCapStolen = wind * 0.16;
    let pending = 0;
    for (const p of parts) {
      if (p.settled || p.exited) continue;
      if (!p.emitted) { if (elapsedRef.current >= p.emitDelay) { p.emitted = true; p.vy = 22 + Math.random() * 24; p.vx = 6 + Math.random() * 10; p.x = EMIT_X + (Math.random() - 0.5) * 16; p.y = EMIT_Y; } else { pending++; continue; } }
      pending++;
      const term = p.kind === 'heavy' ? TERM_HEAVY : p.willCarry ? 150 + p.fall * 60 : TERM_LIGHT;
      p.vy += g * dt; if (p.vy > term) p.vy = term;
      const t = tRef.current;
      if (p.kind === 'light' && p.willCarry) { const targetVx = wind * (0.32 + p.spd * 0.55); p.vx += (targetVx - p.vx) * 3 * dt; p.vx += Math.sin(p.wob + t * 4.5) * 16 * dt; p.vy += Math.sin(p.wob * 1.6 + t * 3.5) * 9 * dt; }
      else if (p.kind === 'light' && !p.willCarry) { p.vx += wind * 0.18 * dt; p.vx += Math.sin(p.wob + t * 4) * 12 * dt; }
      else if (p.kind === 'heavy' && p.willCarry) { p.vx += wind * 0.85 * dt; if (p.vx > vxCapStolen) p.vx = vxCapStolen; }
      else { p.vx += wind * 0.035 * dt; if (p.vx > 16) p.vx = 16; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vrot * dt;
      if (p.x > LW + 24) { p.exited = true; p.alpha = 0; continue; }
      if (p.kind === 'heavy') {
        const col0 = Math.round(p.x / GRAIN_COL_W); const h = (c: number) => heapRef.current[c] || 0;
        const restH = GROUND_Y - 3 - h(col0) * GRAIN_H;
        if (p.y >= restH && p.vy > 0) {
          let col = col0; let guard = 0;
          while (guard++ < 60) { const dl = h(col) - h(col - 1); const dr = h(col) - h(col + 1); if (dl > GRAIN_STEP && dr > GRAIN_STEP) col += Math.random() < 0.5 ? -1 : 1; else if (dl > GRAIN_STEP) col -= 1; else if (dr > GRAIN_STEP) col += 1; else break; }
          heapRef.current[col] = h(col) + 1; p.x = col * GRAIN_COL_W + (Math.random() - 0.5) * 3; p.y = GROUND_Y - 3 - heapRef.current[col] * GRAIN_H; p.settled = true; p.vx = 0; p.vy = 0; p.vrot = 0;
        }
      } else {
        const rest = heapRestY(p.x, 'light');
        if (p.y >= rest && p.vy > 0) { p.y = rest; p.vy = 0; p.vx *= 0.55; if (Math.abs(p.vx) < 14) { p.settled = true; p.vx = 0; p.vrot = 0; p.rot = (Math.random() - 0.5) * 0.5; } }
      }
    }
    return pending;
  }, []);

  // ── live counters ──
  const recountLive = () => {
    let stayed = 0; let carried = 0;
    for (const p of particlesRef.current) { const gone = p.exited || (p.kind === 'light' && p.x > 360); if (p.kind === 'heavy' && !p.willCarry && (p.settled || p.x < 360)) stayed++; if (gone) carried++; }
    setLive((prev) => (prev.stayed === stayed && prev.carried === carried ? prev : { stayed, carried }));
  };

  // ── draw ──
  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    // Match canvas backing store to actual CSS display size
    const cssW = cv.clientWidth || LW;
    const cssH = cv.clientHeight || LH;
    if (cv.width !== cssW * dpr || cv.height !== cssH * dpr) {
      cv.width = cssW * dpr; cv.height = cssH * dpr;
    }
    // Scale everything to fit the 760×480 scene into the actual canvas area
    const scaleX = cssW / LW; const scaleY = cssH / LH;
    const scale = Math.min(scaleX, scaleY);
    const offX = (cssW - LW * scale) / 2; const offY = (cssH - LH * scale) / 2;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, offX * dpr, offY * dpr);
    ctx.clearRect(-offX / scale, -offY / scale, cssW / scale + 2, cssH / scale + 2); ctx.imageSmoothingEnabled = true;
    // Fill letterbox areas with sky colour so there's no visible gap
    ctx.fillStyle = '#CFE6FB'; ctx.fillRect(-offX / scale, -offY / scale, cssW / scale + 2, cssH / scale + 2);
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y); sky.addColorStop(0, '#CFE6FB'); sky.addColorStop(1, '#FBF1DD'); ctx.fillStyle = sky; ctx.fillRect(0, 0, LW, GROUND_Y);
    const sun = ctx.createRadialGradient(LW - 80, 64, 6, LW - 80, 64, 70); sun.addColorStop(0, '#FFD98A'); sun.addColorStop(1, 'rgba(255,217,138,0)'); ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(LW - 80, 64, 70, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFC247'; ctx.beginPath(); ctx.arc(LW - 80, 64, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#BfE0A0'; ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.quadraticCurveTo(190, GROUND_Y - 46, 380, GROUND_Y - 12); ctx.quadraticCurveTo(560, GROUND_Y - 40, LW, GROUND_Y - 8); ctx.lineTo(LW, GROUND_Y); ctx.closePath(); ctx.fill();
    const ground = ctx.createLinearGradient(0, GROUND_Y, 0, LH); ground.addColorStop(0, '#CBB98C'); ground.addColorStop(1, '#B09A66'); ctx.fillStyle = ground; ctx.fillRect(0, GROUND_Y, LW, LH - GROUND_Y); ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, GROUND_Y, LW, 3);
    const blowing = phaseRef.current === 'blowing'; const showResult = phaseRef.current === 'result' || phaseRef.current === 'finished'; const wp = windPulseRef.current;
    if (blowing && wp > 0.05) {
      const t = tRef.current; const str = strengthRef.current; const arrows = str === 'gentle' ? 2 : str === 'medium' ? 3 : 4;
      for (let i = 0; i < arrows; i++) { const yy = 120 + i * 26; const drift = ((t * (STRENGTHS[str].wind * 0.7) + i * 90) % 150); const x0 = 20 + drift; const len = 34 + (str === 'strong' ? 26 : str === 'medium' ? 14 : 4); ctx.strokeStyle = `rgba(90,130,190,${0.30 + wp * 0.25})`; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + len, yy); ctx.lineTo(x0 + len - 8, yy - 5); ctx.moveTo(x0 + len, yy); ctx.lineTo(x0 + len - 8, yy + 5); ctx.stroke(); }
    }
    drawFarmer(ctx, mat.kurta, blowing ? trayTipRef.current : 0);
    for (const p of particlesRef.current) {
      if (p.alpha <= 0) continue; ctx.save(); ctx.globalAlpha = p.alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.kind === 'heavy') { ctx.fillStyle = mat.heavyColor; ctx.strokeStyle = mat.heavyEdge; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-p.size * 0.3, -p.size * 0.18, p.size * 0.3, p.size * 0.18, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = mat.lightColor; ctx.strokeStyle = mat.lightEdge; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.quadraticCurveTo(0, -p.size * 0.95, p.size, 0); ctx.quadraticCurveTo(0, -p.size * 0.18, -p.size, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    if (blowing || showResult) { drawPill(ctx, 230, GROUND_Y + 30, `${mat.heavyEmoji} ${mat.heavyName} stay`, DS.primaryDark, 'center', 12); drawPill(ctx, LW - 230, 132, `${mat.lightEmoji} ${mat.lightName} carried away →`, DS.accentDark, 'left', 12); }
  }, [mat]);

  // ── animation loop ──
  useEffect(() => {
    if (phase !== 'blowing') { draw(); return; }
    lastTsRef.current = 0; const speedMul = props.animationSpeed ?? 1;
    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      let dt = (ts - lastTsRef.current) / 1000; lastTsRef.current = ts; dt = Math.min(dt, 0.033) * speedMul;
      elapsedRef.current += dt; const pending = step(dt); draw();
      counterTickRef.current += dt; if (counterTickRef.current > 0.18) { counterTickRef.current = 0; recountLive(); }
      if (pending === 0 || elapsedRef.current > 7.5) { finishBlow(); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => { if (phase !== 'blowing') draw(); }, [draw, phase, material, strength]);

  // Redraw whenever canvas element resizes (container size changes)
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ro = new ResizeObserver(() => { if (phaseRef.current !== 'blowing') draw(); });
    ro.observe(cv);
    return () => ro.disconnect();
  }, [draw]);

  // ──────────── AGENT API ────────────────────────────────────────────────
  const applyMode = useCallback((m: OperatorMode) => {
    setMode(m); modeRef.current = m;
    emit({ type: 'event', name: 'operator_mode_changed', detail: { mode: m, depth: m === 'ai' ? 'lean' : 'full' } });
  }, []);

  const doPredict = useCallback((p: 'light' | 'heavy') => {
    if (phaseRef.current !== 'predict') return;
    setPrediction(p); predictionRef.current = p; setPhase('ready'); phaseRef.current = 'ready';
    playCue('tap');
    emit({ type: 'event', name: 'prediction_made', detail: { prediction: p } });
  }, [playCue]);

  const doSetStrength = useCallback((s: StrengthKey) => {
    if (!STRENGTHS[s]) return;
    setStrength(s); strengthRef.current = s;
    playCue('tap');
    emit({ type: 'event', name: 'strength_changed', detail: { strength: s } });
  }, [playCue]);

  const doBlow = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    resetParticles(); elapsedRef.current = 0; windPulseRef.current = 0; tRef.current = 0; trayTipRef.current = 0; counterTickRef.current = 0;
    setPhase('blowing'); phaseRef.current = 'blowing';
    playCue('blow');
    emit({ type: 'event', name: 'blow_started', detail: { strength: strengthRef.current } });
  }, [resetParticles, playCue]);

  const finishBlow = useCallback(() => {
    recountLive();
    const correct = predictionRef.current === 'light';
    const res = { correct, quality: strengthRef.current };
    setOutcome(res); outcomeRef.current = res; setPhase('result'); phaseRef.current = 'result'; setShowPopup(true);
    playCue(correct ? 'correct' : 'wrong');
    roundsRef.current = [...roundsRef.current, { strength: strengthRef.current, prediction: predictionRef.current ?? 'heavy', correct }];
    emit({ type: 'event', name: 'blow_completed', detail: { correct, strength: strengthRef.current, prediction: predictionRef.current } });
  }, [playCue]);

  const doChangeStrength = useCallback(() => {
    setShowPopup(false); setOutcome(null); outcomeRef.current = null; setSeed(Date.now()); setPhase('ready'); phaseRef.current = 'ready';
    emit({ type: 'event', name: 'result_reviewed', detail: { action: 'change_strength' } });
  }, []);

  const doHighlight = useCallback((target: string) => {
    const t = target as HighlightTarget;
    addHL(t); setTimeout(() => clearHL(t), 3000);
    hintsUsedRef.current += 1;
    emit({ type: 'event', name: 'highlighted', detail: { target } });
  }, []);

  const doReset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setShowPopup(false); setOutcome(null); outcomeRef.current = null; setPrediction(null); predictionRef.current = null;
    setSeed(Date.now()); setPhase('predict'); phaseRef.current = 'predict'; setStrength(ap.defaultStrength ?? 'medium');
    setLive({ stayed: 0, carried: 0 });
    roundsRef.current = []; hintsUsedRef.current = 0; startTimeRef.current = Date.now();
    setFinishSummary(null);
    emit({ type: 'event', name: 'reset', detail: {} });
  }, [ap.defaultStrength]);

  // ── the uniform Finish button — student mode only, ends the activity (§6.3) ──
  const doFinish = useCallback(() => {
    if (phaseRef.current === 'finished') return; // idempotent-safe — no double-count
    const rounds = roundsRef.current;
    const total = Math.max(rounds.length, 1);
    const score = rounds.filter(r => r.correct).length;
    const stars = rounds.length === 0 ? 0 : score === rounds.length ? 3 : score >= Math.ceil(rounds.length / 2) ? 2 : 1;
    const detail: FinishSummary = {
      evaluated: true,
      score, total: rounds.length || total,
      stars,
      breakdown: rounds.map((r, i) => ({ id: `round${i + 1}_${r.strength}`, correct: r.correct, chose: r.prediction })),
      interactions: {
        attempts: rounds.length,
        correctFirstTry: rounds[0]?.correct ? 1 : 0,
        hintsUsed: hintsUsedRef.current,
        itemsExplored: Array.from(new Set(rounds.map(r => r.strength))),
        durationMs: Date.now() - startTimeRef.current,
      },
      learned: [
        'Moving air (wind) can separate a mixture when its parts differ in mass.',
        'Light husk is carried away by the wind, while heavy wheat grains fall almost straight down.',
        'A gentle breeze leaves some husk behind and a very strong gust wastes a little grain — a steady wind gives the cleanest separation.',
      ],
    };
    setShowPopup(false);
    setFinishSummary(detail);
    setPhase('finished'); phaseRef.current = 'finished';
    playCue('done');
    emit({ type: 'event', name: 'finished', detail });
  }, [playCue]);

  const doGetState = useCallback(() => {
    const state = {
      phase: phaseRef.current, prediction: predictionRef.current, strength: strengthRef.current,
      outcome: outcomeRef.current, operatorMode: modeRef.current, depth: modeRef.current === 'ai' ? 'lean' : 'full',
      muted: mutedRef.current, live,
      rounds: roundsRef.current.length, correctRounds: roundsRef.current.filter(r => r.correct).length,
      finished: finishSummary,
    };
    emit({ type: 'state', state });
    return state;
  }, [live, finishSummary]);

  // ── agent API object ──
  const api = {
    setParam: (name: string, value: any) => {
      if (name === 'muted') { setMuted(!!value); mutedRef.current = !!value; }
      else if (name === 'operatorMode') applyMode(value);
    },
    play: () => { if (phaseRef.current === 'ready') doBlow(); },
    pause: () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); },
    reset: doReset,
    highlight: doHighlight,
    getState: doGetState,
    setOperatorMode: applyMode,
    predict: doPredict,
    setStrength: doSetStrength,
    blow: doBlow,
    changeStrength: doChangeStrength,
    finish: doFinish,
  };
  const apiRef = useRef(api); apiRef.current = api;

  // ── postMessage contract (§3.1 + §3.2) ──
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data; if (!d || d.type !== 'command') return;
      const fn = (apiRef.current as any)[d.method];
      let result; if (typeof fn === 'function') result = fn(...(d.args || []));
      emit({ type: 'response', id: d.id, result });
    };
    window.addEventListener('message', onMsg);
    emit({ type: 'ready', toolId: TOOL_ID }); // ⭐ MANDATORY
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // ── sync operatorMode from host props ──
  useEffect(() => {
    const m = opModeProp ?? props.operatorMode;
    if (m && m !== modeRef.current) applyMode(m);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opModeProp, props.operatorMode]);

  // ── AI demo mode: auto-flow for Teacher lean demo (§6.2) ──
  // Only auto-drives the FIRST round (a single, lean worked example). Once one round has
  // completed, the agent is expected to drive any further rounds itself via setStrength()/blow() —
  // this effect must never fight a live agent command with a forced re-run.
  useEffect(() => {
    if (mode !== 'ai' || roundsRef.current.length > 0) return;
    if (phase === 'predict') {
      const t = setTimeout(() => { doPredict('light'); }, 1200);
      return () => clearTimeout(t);
    }
    if (phase === 'ready') {
      doSetStrength('medium');
      const t = setTimeout(() => { doBlow(); }, 1000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phase]);

  // ── sizing ──
  const bodyFont = isMobile ? tier.bodyFontMobile : tier.bodyFontDesktop;
  const heroFont = isMobile ? tier.heroFontMobile : tier.heroFontDesktop;
  const touch = isMobile ? tier.touchTargetMobile : 46;

  const order: Phase[] = ['predict', 'ready', 'blowing', 'result', 'finished'];
  const progress = ((order.indexOf(phase) + 1) / order.length) * 100;

  // ── RENDER ──
  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif", width: '100%', minHeight: '100dvh', maxWidth: 1920, margin: '0 auto', background: DS.white, color: DS.gray900, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

      {/* ── Global keyframe styles ── */}
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        html,body{margin:0;padding:0;height:100%;overflow:hidden}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: DS.headerGradient, padding: isMobile ? '10px 14px' : '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: isMobile ? 20 : 24 }}>🌾</span>
          <div>
            <div style={{ color: DS.white, fontWeight: 800, fontSize: isMobile ? 14 : 16, lineHeight: 1.2 }}>Winnowing Lab</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Blowing-air separation</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mute toggle */}
          <button
            onClick={() => { setMuted(m => !m); mutedRef.current = !mutedRef.current; playCue('tap'); }}
            title={muted ? 'Unmute' : 'Mute'}
            style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: DS.radii.pill, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: DS.white, fontSize: 12, fontWeight: 600, fontFamily: "'Poppins', sans-serif", animation: highlights.has('muteToggle') ? 'ba-ring 1s ease infinite' : 'none' }}
          >
            {muted ? <VolumeX size={14} color={DS.white} /> : <Volume2 size={14} color={DS.white} />}
          </button>

          {/* Teacher | Student toggle (§6.1) — clickable, styled, live-switches UI + content depth */}
          {showModeToggle && (
            <div
              style={{ position: 'relative', display: 'flex', background: 'rgba(0,0,0,0.25)', borderRadius: DS.radii.pill, padding: 3, gap: 2, animation: highlights.has('modeToggle') ? 'ba-ring 1s ease infinite' : 'none' }}
              title="Switch operator mode"
            >
              {(['ai', 'student'] as OperatorMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => applyMode(m)}
                  aria-pressed={mode === m}
                  style={{ position: 'relative', background: 'transparent', color: mode === m ? DS.primaryDark : 'rgba(255,255,255,0.75)', border: 'none', borderRadius: DS.radii.pill, padding: isMobile ? '5px 10px' : '5px 14px', fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif", minHeight: 28, zIndex: 1 }}
                >
                  {mode === m && (
                    <motion.div layoutId="modeTogglePill" transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      style={{ position: 'absolute', inset: 0, background: DS.white, borderRadius: DS.radii.pill, zIndex: -1 }} />
                  )}
                  {m === 'ai' ? '👩‍🏫 Teacher' : '🙋 Student'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{ height: 4, background: DS.gray200, flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: DS.ctaGradient, transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>

      {/* ── MAIN BODY — side-by-side on ≥480px, stacked on tiny portrait phones ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile && !isLandscape ? 'column' : 'row', overflow: 'hidden', minHeight: 0 }}>

        {/* ── CANVAS PANE — takes all remaining space; defined height via flex ── */}
        <div style={{ flex: isMobile && !isLandscape ? '0 0 55%' : '1 1 0', position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg,#CFE6FB 0%,#EAF5FF 60%,#FBF1DD 100%)', display: 'flex', alignItems: 'stretch', minWidth: 0, minHeight: 0, boxShadow: highlights.has('canvas') ? `inset 0 0 0 4px ${DS.accent}` : 'none', animation: highlights.has('canvas') ? 'ba-ring 1.1s ease infinite' : 'none' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {/* prediction badge */}
          {prediction && phase !== 'predict' && (
            <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,0.93)', borderRadius: DS.radii.pill, padding: '5px 11px', fontSize: 11, fontWeight: 700, color: DS.primaryDark, boxShadow: '0 3px 10px rgba(0,0,0,0.12)', animation: 'ba-fadeUp 0.3s ease' }}>
              Your guess: {prediction === 'light' ? mat.lightName : mat.heavyName}
            </div>
          )}

          {/* live counters */}
          {(phase === 'blowing' || phase === 'result') && (
            <div style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 6 }}>
              <span style={{ background: DS.successLight, color: DS.success, fontWeight: 700, fontSize: 11, padding: '4px 9px', borderRadius: DS.radii.pill, boxShadow: '0 2px 6px rgba(0,0,0,0.1)', fontFamily: "'Poppins', sans-serif" }}>{mat.heavyEmoji} Stayed: {live.stayed}</span>
              <span style={{ background: DS.accentLight, color: DS.accentDark, fontWeight: 700, fontSize: 11, padding: '4px 9px', borderRadius: DS.radii.pill, boxShadow: '0 2px 6px rgba(0,0,0,0.1)', fontFamily: "'Poppins', sans-serif" }}>{mat.lightEmoji} Blown: {live.carried}</span>
            </div>
          )}

          {/* TEACHER/AI watch caption (§6.1) */}
          {mode === 'ai' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(83,48,134,0.88)', backdropFilter: 'blur(4px)', color: DS.white, fontSize: 13, fontWeight: 600, padding: '10px 16px', textAlign: 'center', letterSpacing: 0.2 }}>
              👩‍🏫 Your teacher is showing you this — watch closely, you'll get a turn soon!
            </div>
          )}
        </div>

        {/* ── CONTROLS PANE — fixed 320px side-by-side, full-width when stacked ── */}
        {mode === 'student' && (
          <div style={{ flexShrink: 0, width: isMobile && !isLandscape ? '100%' : (isMobile ? 240 : 320), flex: isMobile && !isLandscape ? '0 0 auto' : undefined, display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', background: DS.white, borderLeft: isMobile && !isLandscape ? 'none' : `2px solid ${DS.gray200}`, borderTop: isMobile && !isLandscape ? `2px solid ${DS.gray200}` : 'none' }}><div style={{ padding: isMobile ? '10px 12px' : '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>

            {/* story frame for grade 6 */}
            {tier.storyFrame && phase === 'predict' && (
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                style={{ margin: 0, fontStyle: 'italic', color: DS.gray700, fontSize: bodyFont - 1, lineHeight: 1.5 }}>
                {mat.story}
              </motion.p>
            )}

            <AnimatePresence mode="wait">
              {/* PREDICT phase */}
              {phase === 'predict' && (
                <motion.div key="predict" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
                  <p style={{ fontWeight: 700, fontSize: bodyFont + 1, margin: '0 0 10px', color: DS.gray900 }}>
                    What flies away when you blow air across the tray?
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => doPredict('light')} style={predictBtn(false, touch, highlights.has('predictLight'))}>
                      <span style={{ fontSize: 20 }}>{mat.lightEmoji}</span>
                      <span>The light<br /><b>{mat.lightName.toLowerCase()}</b></span>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => doPredict('heavy')} style={predictBtn(false, touch, highlights.has('predictHeavy'))}>
                      <span style={{ fontSize: 20 }}>{mat.heavyEmoji}</span>
                      <span>The heavy<br /><b>{mat.heavyName.toLowerCase()}</b></span>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* READY phase */}
              {phase === 'ready' && (
                <motion.div key="ready" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
                  <p style={{ fontWeight: 700, fontSize: bodyFont + 1, margin: '0 0 8px' }}>How hard do you blow?</p>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                    {(Object.keys(STRENGTHS) as StrengthKey[]).map((k) => (
                      <motion.button
                        key={k}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                        onClick={() => doSetStrength(k)}
                        style={strengthBtn(strength === k, touch, highlights.has(`strength${k.charAt(0).toUpperCase() + k.slice(1)}` as HighlightTarget))}
                      >
                        <span style={{ fontSize: 18 }}>{STRENGTHS[k].emoji}</span>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{STRENGTHS[k].label}</div>
                          <div style={{ fontSize: 11, color: DS.gray700, fontWeight: 500 }}>{STRENGTHS[k].desc}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                    animate={highlights.has('blowButton') ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                    transition={highlights.has('blowButton') ? { repeat: Infinity, duration: 0.9 } : undefined}
                    onClick={doBlow}
                    style={ctaBtn(touch)}
                  >
                    <Play size={16} /> Blow the air!
                  </motion.button>
                </motion.div>
              )}

              {/* BLOWING phase */}
              {phase === 'blowing' && (
                <motion.div key="blowing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '8px 0' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }} style={{ fontSize: isMobile ? 28 : 34, marginBottom: 6, display: 'inline-block' }}>💨</motion.div>
                  <motion.p animate={{ opacity: [1, 0.7, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} style={{ fontWeight: 700, fontSize: bodyFont + 1, color: DS.primaryDark, margin: '0 0 4px' }}>
                    Watch the wind work!
                  </motion.p>
                  <p style={{ fontSize: bodyFont - 1, color: DS.gray700, margin: 0, lineHeight: 1.5 }}>
                    Light {mat.lightName.toLowerCase()} float away — heavy {mat.heavyName.toLowerCase()} fall straight down.
                  </p>
                </motion.div>
              )}

              {/* RESULT phase */}
              {phase === 'result' && outcome && (
                <motion.div key="result" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700, fontSize: bodyFont + 1, color: outcome.correct ? DS.success : DS.danger }}>
                    {outcome.correct ? <Check size={20} /> : <X size={20} />}
                    {outcome.correct ? 'Your prediction was right!' : 'Not quite — but great experiment!'}
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: bodyFont - 1, lineHeight: 1.55, color: DS.gray900 }}>
                    Lighter <b>{mat.lightName.toLowerCase()}</b> are carried away by moving air, while heavier <b>{mat.heavyName.toLowerCase()}</b> fall straight down. This is called <b>winnowing</b>.
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: bodyFont - 2, lineHeight: 1.5, color: DS.gray700 }}>
                    {outcome.quality === 'gentle'
                      ? `The breeze was too gentle — some ${mat.lightName.toLowerCase()} stayed behind.`
                      : outcome.quality === 'strong'
                      ? `A strong gust blew everything — including a few ${mat.heavyName.toLowerCase()}!`
                      : `A steady wind gave a clean, efficient separation.`}
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: 11, color: DS.gray700, fontWeight: 600 }}>
                    Rounds tried: {roundsRef.current.length} · Correct: {roundsRef.current.filter(r => r.correct).length}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                      onClick={doChangeStrength}
                      style={{ ...outlineBtn(touch), animation: highlights.has('changeWindButton') ? 'ba-ring 1s ease infinite' : 'none' }}
                    >
                      <WindIcon size={15} /> Try a different wind
                    </motion.button>
                    {/* ⭐ Finish — student mode only, the sole forward-ending control (§6.3). No "Play Again". */}
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                      animate={highlights.has('finishButton') ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                      transition={highlights.has('finishButton') ? { repeat: Infinity, duration: 0.9 } : undefined}
                      onClick={doFinish}
                      style={ctaBtn(touch)}
                    >
                      <Check size={15} /> Finish
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div></div>
        )}

        {/* Teacher lean demo — minimal controls pane */}
        {mode === 'ai' && (
          <div style={{ flexShrink: 0, width: isMobile && !isLandscape ? '100%' : (isMobile ? 220 : 280), padding: isMobile ? '10px 12px' : '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, background: DS.primaryGhost, borderLeft: isMobile && !isLandscape ? 'none' : `2px solid ${DS.primaryLight}`, borderTop: isMobile && !isLandscape ? `2px solid ${DS.primaryLight}` : 'none', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, color: DS.primaryDark, fontSize: bodyFont + 1 }}>🌾 Winnowing Explained</div>
            <p style={{ fontSize: bodyFont - 1, color: DS.gray700, margin: 0, lineHeight: 1.6 }}>
              When air blows across the tray, <b>light husk</b> is carried away by the wind while <b>heavy wheat grains</b> fall straight down — separating them without any screens or chemicals.
            </p>
            <div style={{ background: DS.white, borderRadius: DS.radii.md, padding: '10px 13px', border: `1px solid ${DS.primaryLight}`, fontSize: bodyFont - 2, color: DS.gray900, lineHeight: 1.6 }}>
              <b>Key idea:</b> heavier particles need more force to move horizontally. Air provides just enough force to carry light pieces, but not heavy ones.
            </div>
            {phase === 'result' && outcome && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: bodyFont - 1, color: outcome.correct ? DS.success : DS.danger, animation: 'ba-fadeUp 0.3s ease' }}>
                {outcome.correct ? <Check size={16} /> : <X size={16} />}
                {outcome.correct ? 'Prediction was correct — husk flies away!' : 'Worth reviewing: husk (not grain) flies away.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FULL-SCREEN RESULT POPUP (§7.4 — position:fixed full-viewport) ── */}
      {showPopup && outcome && mode === 'student' && (
        <div
          onClick={() => setShowPopup(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,16,40,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16, animation: 'ba-fadeUp 0.2s ease', pointerEvents: 'all' }}
        >
          {/* confetti */}
          {outcome.correct && Array.from({ length: tier.confettiCount }).map((_, i) => {
            const colors = [DS.primary, DS.accent, DS.accentDark, DS.primaryLight, DS.amber, DS.success];
            return <span key={i} style={{ position: 'absolute', top: -20, left: `${(i * 53) % 100}%`, width: 8, height: 12, background: colors[i % colors.length], borderRadius: 2, animation: `ba-fall ${1.6 + (i % 5) * 0.25}s linear ${(i % 7) * 0.12}s forwards` }} />;
          })}
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: DS.white, borderRadius: DS.radii.xl, padding: isMobile ? 22 : 32, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.45)', animation: 'ba-scaleIn 0.38s cubic-bezier(0.34,1.56,0.64,1)', position: 'relative', zIndex: 201 }}
          >
            <div style={{ width: 68, height: 68, margin: '0 auto 12px', borderRadius: '50%', background: outcome.correct ? DS.successLight : DS.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'ba-pop 0.5s ease' }}>
              {outcome.correct ? <Check size={36} color={DS.success} strokeWidth={3} /> : <span style={{ fontSize: 32 }}>🤔</span>}
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: heroFont - 10, fontWeight: 800, color: DS.primaryDark, fontFamily: "'Poppins', sans-serif" }}>
              {outcome.correct ? 'You winnowed it!' : 'Good experiment!'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: bodyFont, color: DS.gray700, lineHeight: 1.5 }}>
              {outcome.correct ? tier.encouragement.high : tier.encouragement.low}
            </p>
            <button onClick={() => setShowPopup(false)} style={ctaBtn(touch)}>
              See what happened <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── FINISH SCREEN (§6.3) — full-viewport celebratory overlay, evaluating tool → stars + "What you have learned" ── */}
      <AnimatePresence>
        {phase === 'finished' && finishSummary && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(26,16,40,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            {/* full-width/height confetti burst, pointer-events none so it never blocks the card */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {Array.from({ length: finishSummary.stars > 0 ? tier.confettiCount : Math.round(tier.confettiCount / 2) }).map((_, i) => {
                const colors = [DS.primary, DS.accent, DS.accentDark, DS.primaryLight, DS.amber, DS.success];
                return <span key={i} style={{ position: 'absolute', top: -20, left: `${(i * 37) % 100}%`, width: 8, height: 12, background: colors[i % colors.length], borderRadius: 2, animation: `ba-fall ${1.8 + (i % 5) * 0.3}s linear ${(i % 9) * 0.1}s forwards` }} />;
              })}
            </div>

            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{ background: DS.white, borderRadius: DS.radii.xl, padding: isMobile ? 24 : 34, maxWidth: 440, width: '100%', maxHeight: '86dvh', overflowY: 'auto', textAlign: 'center', boxShadow: '0 30px 70px -12px rgba(0,0,0,0.5)', position: 'relative', zIndex: 301, boxSizing: 'border-box' }}
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
                style={{ width: 74, height: 74, margin: '0 auto 12px', borderRadius: '50%', background: DS.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Check size={38} color={DS.success} strokeWidth={3} />
              </motion.div>

              {/* ⭐ star rating — earned from actual performance across all rounds (evaluating tool) */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0, rotate: -30, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.25 + i * 0.15 }}
                    style={{ fontSize: 30, filter: i < finishSummary.stars ? 'none' : 'grayscale(1) opacity(0.35)' }}
                  >⭐</motion.span>
                ))}
              </div>

              <h3 style={{ margin: '0 0 4px', fontSize: heroFont - 8, fontWeight: 800, color: DS.primaryDark, fontFamily: "'Poppins', sans-serif" }}>
                Winnowing complete!
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: bodyFont, color: DS.gray700, lineHeight: 1.5 }}>
                {finishSummary.score} of {finishSummary.total} prediction{finishSummary.total === 1 ? '' : 's'} correct — {finishSummary.stars === 3 ? 'a perfect winnowing run!' : finishSummary.stars === 2 ? 'solid work, keep noticing the pattern!' : 'a good first experiment — watch the husk vs. the grain next time.'}
              </p>

              <div style={{ background: DS.primaryGhost, borderRadius: DS.radii.lg, padding: '14px 16px', textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: bodyFont - 1, color: DS.primaryDark, marginBottom: 8 }}>🌟 What you have learned</div>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {finishSummary.learned.map((l, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12 }}
                      style={{ fontSize: bodyFont - 2, color: DS.gray900, lineHeight: 1.5 }}>{l}</motion.li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: 16, fontSize: 12, color: DS.gray700, fontWeight: 600 }}>
                Session complete — your teacher will continue from here.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlowingAirSeparationLab;