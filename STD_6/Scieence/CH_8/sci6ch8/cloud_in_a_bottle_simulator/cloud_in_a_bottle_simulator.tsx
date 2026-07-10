// ═══════════════════════════════════════════════════════════════════════════
// cloud_in_a_bottle_simulator.tsx
// Tool M5.S8.T17.T2D1 — "Dust particles help water vapour form clouds"
// Class 6 Science — a squeezable-bottle simulation + a short practice quiz,
// driven end-to-end by the agent-control postMessage contract (see the
// sidecar JSON for the full windowMethods / events / validIds contract).
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TOOL_ID = 'M5.S8.T17.T2D1';
const emit = (m: any) => { try { window.parent.postMessage(m, '*'); } catch {} };

// ==================== INLINE ICONS (no lucide-react — see §note below) ====================
// The production iframe renderer only injects a fixed icon allowlist; any external
// icon package name can throw "X is not defined" on some renderer versions. These
// inline SVGs depend on nothing external.
interface IconProps { size?: number; color?: string; fill?: string; strokeWidth?: number; style?: React.CSSProperties; className?: string; }
const mkIcon = (paths: React.ReactNode, opts?: { solid?: boolean }) => {
  const Cmp: React.FC<IconProps> = ({ size = 24, color, fill = 'none', strokeWidth = 2, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={opts?.solid ? (fill !== 'none' ? fill : color || 'currentColor') : fill}
      stroke={opts?.solid ? 'none' : (color || 'currentColor')} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} aria-hidden="true">
      {paths}
    </svg>
  );
  return Cmp;
};
const Cloud = mkIcon(<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />);
const Wind = mkIcon(<><path d="M12.8 19.6A2 2 0 1 0 14 16H2" /><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2" /><path d="M9.8 4.4A2 2 0 1 1 11 8H2" /></>);
const Star = mkIcon(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />, { solid: true });
const Check = mkIcon(<path d="M20 6 9 17l-5-5" />);
const XIcon = mkIcon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const ChevronLeft = mkIcon(<path d="m15 18-6-6 6-6" />);
const ChevronRight = mkIcon(<path d="m9 18 6-6-6-6" />);
const Volume2 = mkIcon(<><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>);
const VolumeX = mkIcon(<><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="m22 9-6 6" /><path d="m16 9 6 6" /></>);
const GraduationCap = mkIcon(<><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" /></>);
const UserIcon = mkIcon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>);
const Sparkles = mkIcon(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6 6 2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></>);

// ==================== DESIGN TOKENS (Singularity palette) ====================
const DS = {
  c: {
    primary: '#4A4DC9', primaryDark: '#2E2E86', primaryLight: '#C1C1EA', primaryGhost: '#EDEDF8',
    accent: '#FF7212', accentDark: '#D9590A', accentLight: '#FFF3E4',
    gray900: '#1A1A2E', gray700: '#4E4E4E', gray500: '#7A7A8C', gray400: '#B7B7C6', gray200: '#E7E7F1', gray100: '#F6F6FB',
    white: '#FFFFFF', success: '#1E9E5A', danger: '#E23B3B', amber: '#F5A623',
    plastic: '#DDF1FB', plasticDark: '#9FC7E0', cap: '#3B6CA8', dust: '#6B7280', water: '#CDE7F5',
  },
  font: `'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  serif: `'DM Serif Display', Georgia, serif`,
  r: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  sh: {
    sm: '0 2px 8px rgba(26,26,46,0.10)', md: '0 6px 18px rgba(26,26,46,0.14)',
    lg: '0 16px 40px rgba(26,26,46,0.20)', xl: '0 25px 60px -8px rgba(26,26,46,0.42)',
  },
};
const dark = {
  bg: '#12121F', surface: '#1B1B2E', surface2: '#232338', text: '#EDEDF6', textDim: '#A9A9C0', border: '#33334E',
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ==================== PROPS ====================
interface AdditionalProps {
  dustLabel?: string;
  hazeColor?: string;
  seed?: number;
}
interface ToolProps {
  operatorMode?: 'ai' | 'student';
  showModeToggle?: boolean;
  themeColor?: string;
  darkMode?: boolean;
  device?: 'mobile' | 'smartboard';
  muted?: boolean;
  additionalProps?: AdditionalProps;
  // legacy framework props kept as harmless no-ops (not part of the new contract)
  setStepDetails?: (...a: any[]) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ==================== QUIZ CONTENT (fixed, deterministic — 5 rounds) ====================
interface QOption { id: 'a' | 'b' | 'c'; text: string; }
interface Question { id: string; prompt: string; options: QOption[]; correct: 'a' | 'b' | 'c'; explanation: string; }

const QUESTIONS: Question[] = [
  {
    id: 'whyDustNeeded',
    prompt: 'Why does a faint cloud appear only after dust is added to the bottle?',
    options: [
      { id: 'a', text: 'The dust itself turns into the cloud' },
      { id: 'b', text: 'The water vapour needs tiny dust specks to condense onto and form droplets' },
      { id: 'c', text: 'The dust makes the water inside boil' },
    ],
    correct: 'b',
    explanation: 'Water vapour cannot easily turn into tiny droplets in clean air — it needs a surface to gather on. Each dust speck is a tiny landing pad (a condensation nucleus) that vapour condenses onto, building the droplets we see as a cloud. The dust does not become the cloud; it just helps the droplets form.',
  },
  {
    id: 'whenCloudAppears',
    prompt: 'Does the cloud appear while you SQUEEZE the bottle, or when you RELEASE it?',
    options: [
      { id: 'a', text: 'While you squeeze — pressing makes the cloud' },
      { id: 'b', text: 'Only if you shake the bottle' },
      { id: 'c', text: 'When you release — the air expands and cools, so vapour condenses' },
    ],
    correct: 'c',
    explanation: 'Squeezing compresses the air and warms it slightly, which keeps the vapour as vapour (no cloud). The instant you RELEASE, the air expands and cools. Cool air cannot hold as much vapour, so it condenses into droplets and the cloud appears.',
  },
  {
    id: 'noDustResult',
    prompt: 'You release the squeeze with NO dust in a clean bottle. What do you see?',
    options: [
      { id: 'a', text: 'Little or no cloud — there is nothing for the droplets to form on' },
      { id: 'b', text: 'A thick cloud, just like with dust' },
      { id: 'c', text: 'The water disappears completely' },
    ],
    correct: 'a',
    explanation: 'Cooling the air is not enough on its own. Without dust there are no nuclei for the vapour to condense onto, so a clean bottle stays almost clear even when you release and cool the air. Add the dust and the same release suddenly makes a visible haze.',
  },
  {
    id: 'realClouds',
    prompt: 'How does this bottle explain REAL clouds in the sky?',
    options: [
      { id: 'a', text: 'Clouds are made of cotton blown up by the wind' },
      { id: 'b', text: 'Clouds form only where there is no dust at all' },
      { id: 'c', text: 'Water vapour rises, cools, and condenses onto tiny dust/smoke particles in the air' },
    ],
    correct: 'c',
    explanation: 'Real clouds form the same way as the bottle. Warm air carrying water vapour rises and cools high up. The sky is full of tiny floating particles — dust, smoke, salt specks — and the cooled vapour condenses onto them to make countless tiny droplets. Billions of droplets together are a cloud.',
  },
  {
    id: 'roleOfWater',
    prompt: 'Why is a little WARM water kept at the bottom of the bottle?',
    options: [
      { id: 'a', text: 'It cools the bottle from the inside' },
      { id: 'b', text: 'It fills the air with water vapour, ready to condense into a cloud' },
      { id: 'c', text: 'It makes the bottle heavier so it does not tip over' },
    ],
    correct: 'b',
    explanation: 'Warm water evaporates quickly, loading the closed air space with plenty of invisible water vapour. That stored-up vapour is the raw material for the cloud — when the squeeze is released and the air cools with dust present, this vapour condenses into visible droplets.',
  },
];

// ==================== SOUND (Web Audio, lazy, mutable) ====================
function useSound(mutedRef: React.MutableRefObject<boolean>) {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = () => {
    if (mutedRef.current) return null;
    if (!ctxRef.current) {
      try { ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  };
  const tone = useCallback((freq: number, t0: number, dur: number, ctx: AudioContext, type: OscillatorType = 'sine', peak = 0.12) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }, []);
  const play = useCallback((kind: 'tap' | 'select' | 'correct' | 'wrong' | 'cloud' | 'finish') => {
    const ctx = getCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === 'tap') tone(520, now, 0.08, ctx, 'triangle', 0.08);
    else if (kind === 'select') tone(660, now, 0.1, ctx, 'sine', 0.09);
    else if (kind === 'correct') { tone(660, now, 0.14, ctx, 'sine', 0.11); tone(880, now + 0.1, 0.22, ctx, 'sine', 0.12); }
    else if (kind === 'wrong') { tone(220, now, 0.22, ctx, 'sine', 0.10); tone(180, now + 0.08, 0.24, ctx, 'sine', 0.08); }
    else if (kind === 'cloud') { tone(500, now, 0.3, ctx, 'sine', 0.07); tone(750, now + 0.05, 0.35, ctx, 'triangle', 0.06); tone(1000, now + 0.12, 0.4, ctx, 'sine', 0.05); }
    else if (kind === 'finish') { [523, 659, 784, 1047].forEach((f, i) => tone(f, now + i * 0.13, 0.35, ctx, 'triangle', 0.10)); }
  }, [tone]);
  return play;
}

// ==================== RESPONSIVE / CONTAINER SIZE ====================
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 900, h: 600 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setSize({ w: el.clientWidth || 900, h: el.clientHeight || 600 });
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(el); }
    window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  return { ref, ...size };
}

// ==================== KEYFRAMES (for SVG-only ambient motion framer-motion doesn't touch) ====================
const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
@keyframes cb_drift { 0% { transform: translateY(0); } 50% { transform: translateY(-3px); } 100% { transform: translateY(0); } }
@keyframes cb_breathe { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes cb_swirl { 0% { transform: translate(0,0); } 50% { transform: translate(2px,-3px); } 100% { transform: translate(0,0); } }
* { box-sizing: border-box; }
`;

// fixed particle layouts (module-level so they never re-randomise between frames)
const DUST_SPECKS = [
  { x: 0.30, y: 0.30 }, { x: 0.55, y: 0.22 }, { x: 0.70, y: 0.40 }, { x: 0.40, y: 0.50 },
  { x: 0.62, y: 0.58 }, { x: 0.28, y: 0.62 }, { x: 0.50, y: 0.36 }, { x: 0.74, y: 0.26 },
];
const HAZE_BLOBS = [
  { x: 0.26, y: 0.34, r: 0.20 }, { x: 0.52, y: 0.28, r: 0.24 }, { x: 0.74, y: 0.38, r: 0.18 },
  { x: 0.38, y: 0.52, r: 0.22 }, { x: 0.64, y: 0.56, r: 0.20 }, { x: 0.48, y: 0.44, r: 0.26 },
  { x: 0.30, y: 0.60, r: 0.16 }, { x: 0.78, y: 0.58, r: 0.15 },
];

// ──────────────────────────────────────────────────────────────────────────
// BottleScene — the showpiece. A front-view SVG of a closed plastic bottle
// with warm water, driven by squeeze (0..1), dust (boolean) and haze (0..1).
// Physics: squeezing narrows + warms the air (no haze); releasing (squeeze→0)
// cools it; a visible cloud (haze) only blooms with dust present.
// ──────────────────────────────────────────────────────────────────────────
const Arrow: React.FC<{ x: number; y: number; dir: 1 | -1; size: number; color: string }> = ({ x, y, dir, size, color }) => (
  <path d={`M ${x} ${y - size * 0.4} L ${x + dir * size} ${y} L ${x} ${y + size * 0.4} Z`} fill={color} opacity={0.9} />
);

const BottleScene: React.FC<{
  squeeze: number; dust: boolean; haze: number; hazeColor: string; dustLabel: string;
  width: number; showTag?: 'cloud' | 'clear' | null; ringPulse?: boolean; isDark?: boolean;
}> = ({ squeeze, dust, haze, hazeColor, dustLabel, width, showTag, ringPulse, isDark }) => {
  const W = Math.max(160, width);
  const H = Math.round(W * 0.92);
  const bodyTop = H * 0.20, bodyBot = H * 0.92, bodyH = bodyBot - bodyTop, cx = W * 0.5;
  const halfWFull = W * 0.22;
  const halfW = halfWFull * (1 - squeeze * 0.34);
  const leftX = cx - halfW, rightX = cx + halfW;
  const neckW = W * 0.10, neckTop = H * 0.07, capH = H * 0.05;
  const waterTop = bodyBot - bodyH * 0.16;
  const airTop = bodyTop + 6, airBot = waterTop - 2, airH = airBot - airTop;
  const airTint = squeeze > 0.4 ? '#FFF7EE' : (haze > 0.05 ? hazeColor : (isDark ? '#2A3542' : '#F4FAFE'));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', borderRadius: DS.r.lg, background: isDark ? 'linear-gradient(180deg,#20263A,#171C2C)' : 'linear-gradient(180deg,#FBFBFE,#EAF1FA)', overflow: 'visible' }}>
      <defs>
        <linearGradient id="cb_plastic" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={DS.c.plasticDark} /><stop offset="0.18" stopColor={DS.c.plastic} />
          <stop offset="0.55" stopColor="#FFFFFF" /><stop offset="0.85" stopColor={DS.c.plastic} /><stop offset="1" stopColor={DS.c.plasticDark} />
        </linearGradient>
        <radialGradient id="cb_haze" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor={hazeColor} stopOpacity="0.95" /><stop offset="1" stopColor={hazeColor} stopOpacity="0.2" />
        </radialGradient>
      </defs>
      {ringPulse && (
        <motion.rect x="2" y="2" width={W - 4} height={H - 4} rx={16} fill="none" stroke={DS.c.accent} strokeWidth={4}
          animate={{ opacity: [0.9, 0.15, 0.9], scale: [1, 1.015, 1] }} transition={{ duration: 1.1, repeat: Infinity }} />
      )}
      <rect x="0" y={H - 8} width={W} height="8" fill={isDark ? '#0E1119' : '#E1E6EE'} />
      <path d={`M ${leftX} ${bodyTop + bodyH * 0.10} Q ${cx - halfWFull * 0.55} ${bodyTop - 4} ${cx - neckW / 2} ${bodyTop} L ${cx + neckW / 2} ${bodyTop} Q ${cx + halfWFull * 0.55} ${bodyTop - 4} ${rightX} ${bodyTop + bodyH * 0.10} C ${rightX} ${bodyTop + bodyH * 0.45} ${rightX} ${bodyTop + bodyH * 0.7} ${rightX} ${bodyBot - 14} Q ${rightX} ${bodyBot} ${rightX - 14} ${bodyBot} L ${leftX + 14} ${bodyBot} Q ${leftX} ${bodyBot} ${leftX} ${bodyBot - 14} C ${leftX} ${bodyTop + bodyH * 0.7} ${leftX} ${bodyTop + bodyH * 0.45} ${leftX} ${bodyTop + bodyH * 0.10} Z`}
        fill="url(#cb_plastic)" stroke={DS.c.plasticDark} strokeWidth="2.5" style={{ transition: 'd .18s ease-out' }} />
      <rect x={cx - neckW / 2} y={neckTop + capH} width={neckW} height={bodyTop - neckTop - capH + 4} fill="url(#cb_plastic)" stroke={DS.c.plasticDark} strokeWidth="2" />
      <rect x={cx - neckW * 0.62} y={neckTop} width={neckW * 1.24} height={capH} rx="3" fill={DS.c.cap} stroke="#2B4F7A" strokeWidth="1.5" />
      <clipPath id="cb_bodyClip">
        <path d={`M ${leftX + 2} ${bodyTop + bodyH * 0.10} C ${leftX + 2} ${bodyTop + bodyH * 0.5} ${leftX + 2} ${bodyTop + bodyH * 0.7} ${leftX + 2} ${bodyBot - 14} Q ${leftX + 2} ${bodyBot - 2} ${leftX + 14} ${bodyBot - 2} L ${rightX - 14} ${bodyBot - 2} Q ${rightX - 2} ${bodyBot - 2} ${rightX - 2} ${bodyBot - 14} C ${rightX - 2} ${bodyTop + bodyH * 0.7} ${rightX - 2} ${bodyTop + bodyH * 0.5} ${rightX - 2} ${bodyTop + bodyH * 0.10} L ${leftX + 2} ${bodyTop + bodyH * 0.10} Z`} />
      </clipPath>
      <g clipPath="url(#cb_bodyClip)">
        <rect x={leftX} y={airTop} width={halfW * 2} height={airH} fill={airTint} style={{ transition: 'fill .5s ease' }} opacity={0.9} />
        {haze > 0.04 && (
          <g opacity={clamp(haze, 0, 1)} style={{ transition: 'opacity .35s ease' }}>
            {HAZE_BLOBS.map((b, i) => (
              <circle key={i} cx={leftX + b.x * halfW * 2} cy={airTop + b.y * airH}
                r={Math.max(6, halfW * b.r * (0.6 + 0.4 * haze))} fill="url(#cb_haze)"
                style={{ animation: `cb_swirl ${1.6 + b.x}s ease-in-out infinite` }} />
            ))}
            <rect x={leftX} y={airTop} width={halfW * 2} height={airH} fill={hazeColor} opacity={0.35 * haze} />
          </g>
        )}
        {dust && (
          <g opacity={0.85}>
            {DUST_SPECKS.map((d, i) => (
              <circle key={i} cx={leftX + d.x * halfW * 2} cy={airTop + d.y * airH} r={Math.max(1.3, W * 0.006)}
                fill={DS.c.dust} opacity={0.7} style={{ animation: `cb_drift ${1.3 + d.x}s ease-in-out infinite` }} />
            ))}
          </g>
        )}
        <rect x={leftX} y={waterTop} width={halfW * 2} height={bodyBot - waterTop} fill={DS.c.water} opacity={0.95} />
        {[0.32, 0.5, 0.68].map((fx, i) => (
          <path key={i} d={`M ${leftX + fx * halfW * 2} ${waterTop} q 4 -${airH * 0.12} 0 -${airH * 0.24}`}
            fill="none" stroke="#BFE0F2" strokeWidth="2" strokeLinecap="round" opacity={squeeze > 0.4 ? 0.25 : 0.5}
            style={{ animation: `cb_breathe ${1.4 + i * 0.3}s ease-in-out infinite` }} />
        ))}
      </g>
      <rect x={cx - halfW * 0.7} y={bodyTop + 6} width={Math.max(4, halfW * 0.16)} height={bodyH * 0.7} rx="4" fill="#FFFFFF" opacity={0.5} />
      {squeeze > 0.06 && (
        <g opacity={clamp(squeeze * 1.4, 0, 1)} style={{ transition: 'opacity .15s linear' }}>
          <Arrow x={leftX - W * 0.085} y={bodyTop + bodyH * 0.45} dir={1} size={W * 0.07} color={DS.c.accent} />
          <Arrow x={rightX + W * 0.085} y={bodyTop + bodyH * 0.45} dir={-1} size={W * 0.07} color={DS.c.accent} />
        </g>
      )}
      {showTag && (() => {
        const tagW = W * 0.32, tagX = W - tagW - W * 0.04, isCloud = showTag === 'cloud';
        return (
          <g>
            <rect x={tagX} y={H * 0.03} width={tagW} height={H * 0.09} rx={H * 0.045} fill={isCloud ? DS.c.primary : DS.c.gray400} />
            <text x={tagX + tagW / 2} y={H * 0.03 + H * 0.06} textAnchor="middle" fontFamily={DS.font} fontWeight="800" fontSize={W * 0.028} fill="#fff">
              {isCloud ? 'CLOUD!' : 'NO CLOUD'}
            </text>
          </g>
        );
      })()}
      <text x={cx} y={H - 14} textAnchor="middle" fontFamily={DS.font} fontSize={W * 0.026} fill={isDark ? dark.textDim : DS.c.gray700}>
        closed bottle · warm water · {dust ? dustLabel : 'no dust'}
      </text>
    </svg>
  );
};

// ==================== STYLED CONTROLS ====================

const SqueezeSlider: React.FC<{
  value: number; onChange: (v: number) => void; disabled?: boolean; highlight?: boolean; accent: string;
}> = ({ value, onChange, disabled, highlight, accent }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const setFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const v = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    onChange(v);
  }, [onChange]);
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromClientX(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [dragging, setFromClientX]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: DS.font, fontSize: 12, color: 'inherit', opacity: 0.75, marginBottom: 6 }}>
        <span>released · cool</span>
        <span style={{ fontWeight: 800, opacity: 1 }}>{Math.round(value * 100)}%</span>
        <span>squeezed · warm</span>
      </div>
      <motion.div
        ref={trackRef}
        role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (disabled) return; if (e.key === 'ArrowLeft') onChange(clamp(value - 0.05, 0, 1)); if (e.key === 'ArrowRight') onChange(clamp(value + 0.05, 0, 1)); }}
        onPointerDown={(e) => { if (disabled) return; setDragging(true); setFromClientX(e.clientX); }}
        animate={highlight ? { boxShadow: ['0 0 0 0 rgba(255,114,18,0.55)', '0 0 0 10px rgba(255,114,18,0)', '0 0 0 0 rgba(255,114,18,0)'] } : {}}
        transition={highlight ? { duration: 1.1, repeat: Infinity } : {}}
        style={{
          position: 'relative', height: 30, borderRadius: DS.r.pill, background: `linear-gradient(90deg, ${accent}22, ${DS.c.gray200})`,
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, touchAction: 'none', border: `1px solid ${DS.c.gray200}`,
        }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: DS.r.pill, overflow: 'hidden' }}>
          <motion.div animate={{ width: `${value * 100}%` }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            style={{ height: '100%', background: `linear-gradient(90deg, ${accent}66, ${accent})` }} />
        </div>
        <motion.div
          animate={{ left: `calc(${value * 100}% - 13px)`, scale: dragging ? 1.18 : 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          style={{ position: 'absolute', top: 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', border: `3px solid ${accent}`, boxShadow: DS.sh.md }}
        />
      </motion.div>
    </div>
  );
};

const DustToggle: React.FC<{ on: boolean; onClick: () => void; label: string; disabled?: boolean; highlight?: boolean }> = ({ on, onClick, label, disabled, highlight }) => (
  <motion.button
    onClick={disabled ? undefined : onClick} disabled={disabled} whileTap={disabled ? {} : { scale: 0.94 }}
    animate={highlight ? { boxShadow: ['0 0 0 0 rgba(74,77,201,0.5)', '0 0 0 10px rgba(74,77,201,0)', '0 0 0 0 rgba(74,77,201,0)'] } : {}}
    transition={highlight ? { duration: 1.1, repeat: Infinity } : { type: 'spring', stiffness: 400, damping: 22 }}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 46, padding: '0 16px 0 6px', borderRadius: DS.r.pill,
      fontFamily: DS.font, fontWeight: 700, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none',
      background: on ? DS.c.primaryGhost : DS.c.gray100, color: on ? DS.c.primaryDark : 'inherit', opacity: disabled ? 0.55 : 1,
    }}>
    <span style={{
      width: 40, height: 24, borderRadius: 999, background: on ? DS.c.primary : DS.c.gray400, position: 'relative', flexShrink: 0, transition: 'background .2s',
    }}>
      <motion.span animate={{ left: on ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
    </span>
    <Wind size={16} />
    {on ? `${label} — added` : `Add ${label}`}
  </motion.button>
);

const ModeToggle: React.FC<{ mode: 'ai' | 'student'; onChange: (m: 'ai' | 'student') => void }> = ({ mode, onChange }) => (
  <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.18)', borderRadius: DS.r.pill, padding: 3, gap: 2 }}>
    {(['ai', 'student'] as const).map((m) => {
      const active = mode === m;
      return (
        <button key={m} onClick={() => onChange(m)}
          style={{
            position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
            padding: '7px 13px', borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700, fontSize: 12.5,
            color: active ? DS.c.primaryDark : '#fff', background: 'transparent', transition: 'color .2s',
          }}>
          {active && (
            <motion.span layoutId="modeTogglePill" transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              style={{ position: 'absolute', inset: 0, background: '#fff', borderRadius: DS.r.pill, zIndex: 0 }} />
          )}
          <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {m === 'ai' ? <GraduationCap size={14} /> : <UserIcon size={14} />}
            {m === 'ai' ? 'Teacher' : 'Your turn'}
          </span>
        </button>
      );
    })}
  </div>
);

// ==================== CONFETTI + FULL-SCREEN CELEBRATION ====================
const ConfettiBurst: React.FC<{ count: number }> = ({ count }) => {
  const palette = [DS.c.accent, DS.c.primary, DS.c.amber, DS.c.success, DS.c.accentDark];
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.4, dur: 2.1 + Math.random() * 1.1,
    color: palette[i % palette.length], size: 7 + Math.random() * 7, round: Math.random() > 0.5, rot: Math.random() * 540,
  })), [count]);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {pieces.map((p, i) => (
        <motion.div key={i} initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: [1, 1, 0], rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeIn' }}
          style={{ position: 'absolute', top: 0, left: `${p.left}%`, width: p.size, height: p.size, background: p.color, borderRadius: p.round ? '50%' : 2 }} />
      ))}
    </div>
  );
};

const FinishOverlay: React.FC<{
  evaluated: boolean; score: number; total: number; stars: number; learned: string[]; isDark?: boolean;
}> = ({ evaluated, score, total, stars, learned, isDark }) => {
  const [scoreShown, setScoreShown] = useState(0);
  useEffect(() => {
    if (!evaluated) return;
    const start = performance.now(); const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setScoreShown(Math.round((1 - Math.pow(1 - p, 3)) * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [evaluated, score]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,20,0.55)' }}>
      {evaluated && stars >= 2 && <ConfettiBurst count={90} />}
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
        style={{
          position: 'relative', width: 'min(92vw, 460px)', maxHeight: '88dvh', overflowY: 'auto', borderRadius: DS.r.xl, padding: 'clamp(20px,4dvh,34px)',
          textAlign: 'center', background: isDark ? dark.surface : '#fff', color: isDark ? dark.text : DS.c.gray900, boxShadow: DS.sh.xl,
          backgroundImage: isDark ? undefined : `linear-gradient(160deg, #fff, ${DS.c.accentLight})`,
        }}>
        <motion.div initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.25, type: 'spring', stiffness: 300 }}>
          <Sparkles size={40} color={DS.c.accent} />
        </motion.div>
        {evaluated ? (
          <>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '10px 0 6px' }}>
              {[0, 1, 2].map((i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0, rotate: -30 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.4 + i * 0.15, type: 'spring', stiffness: 300 }}>
                  <Star size={38} fill={i < stars ? DS.c.amber : (isDark ? dark.border : DS.c.gray200)} color={i < stars ? DS.c.amber : (isDark ? dark.border : DS.c.gray200)} />
                </motion.div>
              ))}
            </div>
            <div style={{ fontFamily: DS.font, fontWeight: 800, fontSize: 52, fontVariantNumeric: 'tabular-nums', color: DS.c.primaryDark }}>
              {scoreShown}<span style={{ fontSize: 24, opacity: 0.6 }}>/{total}</span>
            </div>
          </>
        ) : (
          <div style={{ fontFamily: DS.font, fontWeight: 800, fontSize: 24, margin: '12px 0 4px', color: DS.c.primaryDark }}>Nicely explored!</div>
        )}
        <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 16, margin: '6px 0 14px', color: isDark ? dark.text : DS.c.gray900 }}>
          What you have learned
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
          {learned.map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
              style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontFamily: DS.font, fontSize: 13.5, lineHeight: 1.45, color: isDark ? dark.textDim : DS.c.gray700 }}>
              <span style={{ color: DS.c.success, marginTop: 1, flexShrink: 0 }}><Check size={15} /></span>{l}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==================== MAIN STATE TYPES ====================
type Phase = 'intro' | 'predict' | 'testNoDust' | 'testWithDust' | 'wrap' | 'quiz' | 'summary';
type Prediction = 'cloudForms' | 'noCloud' | null;

interface ToolState {
  phase: Phase;
  squeeze: number;
  dustOn: boolean;
  haze: number;
  prediction: Prediction;
  sawNoDustRelease: boolean;
  sawDustCloud: boolean;
  qIndex: number;
  answers: Record<string, 'a' | 'b' | 'c' | undefined>;
  finished: boolean;
}

const initialToolState: ToolState = {
  phase: 'intro', squeeze: 0, dustOn: false, haze: 0, prediction: null,
  sawNoDustRelease: false, sawDustCloud: false, qIndex: 0, answers: {}, finished: false,
};

const PHASE_ORDER: Phase[] = ['intro', 'predict', 'testNoDust', 'testWithDust', 'wrap', 'quiz', 'summary'];

// ==================== MAIN COMPONENT ====================
const CloudInABottleSimulator: React.FC<{ props?: ToolProps } & ToolProps> = (rawProps) => {
  const props: ToolProps = rawProps.props ?? rawProps;
  const ap = props.additionalProps || {};
  const dustLabel = ap.dustLabel ?? 'burnt-paper dust';
  const hazeColor = ap.hazeColor ?? '#EAF1F6';
  const isDark = !!props.darkMode;
  const device = props.device ?? 'mobile';
  const accent = props.themeColor || DS.c.primary;

  const { ref: rootRef, w: cw, h: ch } = useElementSize<HTMLDivElement>();
  const isShort = ch > 0 && ch < 480;
  const isNarrow = cw > 0 && cw < 760;
  const isBig = cw >= 1600;

  const [state, setState] = useState<ToolState>(initialToolState);
  const stateRef = useRef(state); stateRef.current = state;

  const [mode, setMode] = useState<'ai' | 'student'>(props.operatorMode ?? 'student');
  const modeRef = useRef(mode); modeRef.current = mode;

  const mutedRef = useRef<boolean>(props.muted ?? false);
  const [mutedUI, setMutedUI] = useState(mutedRef.current);
  const playCue = useSound(mutedRef);

  const [highlightTarget, setHighlightTarget] = useState<string | null>(null);
  const highlightTimer = useRef<any>(null);

  const finishedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const attemptsRef = useRef(0);
  const hintsUsedRef = useRef(0); // count of highlight() calls used as hints
  const itemsExploredRef = useRef<Set<string>>(new Set());

  const autoTimerRef = useRef<any>(null);
  const prevSqueezeRef = useRef(0);

  // ── inject fonts + keyframes once ──
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'cb-keyframes-v2';
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('cb-keyframes-v2'); if (e) e.remove(); };
  }, []);

  const doHighlight = useCallback((target: string) => {
    hintsUsedRef.current += 1;
    setHighlightTarget(target);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightTarget(null), 2600);
  }, []);

  // ── core physics: recompute haze from (squeeze, dust) ──
  const recomputeHaze = useCallback((sq: number, hasDust: boolean) => {
    const coolness = 1 - sq;
    let target: number;
    if (hasDust) target = coolness < 0.45 ? 0 : clamp((coolness - 0.45) / 0.5, 0, 1);
    else target = coolness > 0.85 ? 0.06 : 0;

    const released = sq < 0.12;
    const wasSqueezed = prevSqueezeRef.current > 0.55;
    let sawNoDustRelease = stateRef.current.sawNoDustRelease;
    let sawDustCloud = stateRef.current.sawDustCloud;
    let clouded = false;
    if (released && wasSqueezed) {
      if (hasDust) { if (target > 0.4) { sawDustCloud = true; clouded = true; } }
      else sawNoDustRelease = true;
    }
    prevSqueezeRef.current = sq;
    return { haze: target, sawNoDustRelease, sawDustCloud, clouded };
  }, []);

  const doSetSqueeze = useCallback((raw: number) => {
    const v = clamp(Number(raw), 0, 1);
    itemsExploredRef.current.add('squeeze');
    setState((cur) => {
      const { haze, sawNoDustRelease, sawDustCloud, clouded } = recomputeHaze(v, cur.dustOn);
      if (clouded) { playCue('cloud'); emit({ type: 'event', name: 'cloud_formed', detail: { haze } }); }
      const next = { ...cur, squeeze: v, haze, sawNoDustRelease, sawDustCloud };
      emit({ type: 'event', name: 'squeeze_changed', detail: { squeeze: v, haze, dustOn: cur.dustOn } });
      return next;
    });
  }, [recomputeHaze, playCue]);

  const doSetDust = useCallback((present: boolean) => {
    itemsExploredRef.current.add('dust');
    setState((cur) => {
      const { haze, sawNoDustRelease, sawDustCloud, clouded } = recomputeHaze(cur.squeeze, present);
      if (clouded) { playCue('cloud'); emit({ type: 'event', name: 'cloud_formed', detail: { haze } }); }
      playCue('tap');
      const next = { ...cur, dustOn: present, haze, sawNoDustRelease, sawDustCloud };
      emit({ type: 'event', name: 'dust_toggled', detail: { dustOn: present, haze } });
      return next;
    });
  }, [recomputeHaze, playCue]);

  const doGotoPhase = useCallback((phase: Phase, opts?: { silent?: boolean }) => {
    if (!PHASE_ORDER.includes(phase)) return;
    setState((cur) => {
      let squeeze = cur.squeeze, dustOn = cur.dustOn, haze = cur.haze;
      if (phase === 'testNoDust') { squeeze = 0; dustOn = false; haze = 0; prevSqueezeRef.current = 0; }
      if (phase === 'testWithDust') { squeeze = 0; dustOn = true; haze = 0; prevSqueezeRef.current = 0; }
      if (phase === 'intro' || phase === 'predict') { squeeze = 0; dustOn = false; haze = 0; prevSqueezeRef.current = 0; }
      return { ...cur, phase, squeeze, dustOn, haze };
    });
    if (!opts?.silent) emit({ type: 'event', name: 'phase_changed', detail: { phase } });
  }, []);

  const doCommitPrediction = useCallback((choice: 'cloudForms' | 'noCloud') => {
    if (stateRef.current.prediction) return; // idempotent
    playCue('select');
    setState((cur) => ({ ...cur, prediction: choice }));
    emit({ type: 'event', name: 'prediction_made', detail: { choice, correct: choice === 'noCloud' } });
  }, [playCue]);

  const doChoose = useCallback((questionId: string, optionId: 'a' | 'b' | 'c') => {
    const q = QUESTIONS.find((x) => x.id === questionId);
    if (!q) return;
    if (stateRef.current.answers[questionId]) return; // idempotent — already answered
    attemptsRef.current += 1;
    itemsExploredRef.current.add(questionId);
    const correct = optionId === q.correct;
    playCue(correct ? 'correct' : 'wrong');
    setState((cur) => {
      const answers = { ...cur.answers, [questionId]: optionId };
      const qi = QUESTIONS.findIndex((x) => x.id === questionId);
      const nextIndex = Math.min(QUESTIONS.length - 1, Math.max(cur.qIndex, qi + 1));
      const allAnswered = QUESTIONS.every((qq) => answers[qq.id]);
      return { ...cur, answers, qIndex: allAnswered ? cur.qIndex : nextIndex };
    });
    emit({ type: 'event', name: 'answer_checked', detail: { questionId, optionId, correct } });
    emit({ type: 'event', name: correct ? 'answer_correct' : 'answer_incorrect', detail: { questionId, optionId } });
    setTimeout(() => {
      setState((cur) => {
        if (QUESTIONS.every((qq) => cur.answers[qq.id])) {
          const score = QUESTIONS.filter((qq) => cur.answers[qq.id] === qq.correct).length;
          emit({ type: 'event', name: 'quiz_completed', detail: { score, total: QUESTIONS.length } });
          return { ...cur, phase: 'summary' };
        }
        return cur;
      });
    }, 650);
  }, [playCue]);

  const scoreAndBreakdown = useCallback(() => {
    const s = stateRef.current;
    const breakdown = QUESTIONS.map((q) => ({ id: q.id, correct: s.answers[q.id] === q.correct, chose: s.answers[q.id] ?? null }));
    const score = breakdown.filter((b) => b.correct).length;
    return { score, total: QUESTIONS.length, breakdown };
  }, []);

  const doFinish = useCallback(() => {
    if (finishedRef.current) return stateRef.current;
    finishedRef.current = true;
    const { score, total, breakdown } = scoreAndBreakdown();
    const stars = score >= 5 ? 3 : score >= 3 ? 2 : score >= 1 ? 1 : 0;
    const correctFirstTry = breakdown.filter((b) => b.correct).length;
    playCue('finish');
    setState((cur) => ({ ...cur, finished: true }));
    emit({
      type: 'event', name: 'finished', detail: {
        evaluated: true, score, total, stars, breakdown,
        interactions: {
          attempts: attemptsRef.current, correctFirstTry, hintsUsed: hintsUsedRef.current,
          itemsExplored: Array.from(itemsExploredRef.current), durationMs: Date.now() - startTimeRef.current,
        },
        learned: [
          'A closed bottle of warm water fills its air with invisible water vapour.',
          'Releasing a squeeze lets the trapped air expand and cool — but cooling alone does not make a cloud.',
          'A visible cloud forms only when dust particles are present for the vapour to condense onto.',
          'Real clouds form the same way: rising, cooling air condenses onto tiny dust and smoke particles high in the sky.',
        ],
      },
    });
    return stateRef.current;
  }, [scoreAndBreakdown, playCue]);

  const doReset = useCallback(() => {
    if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; }
    finishedRef.current = false;
    prevSqueezeRef.current = 0;
    attemptsRef.current = 0; hintsUsedRef.current = 0; itemsExploredRef.current = new Set();
    startTimeRef.current = Date.now();
    setState({ ...initialToolState });
    emit({ type: 'event', name: 'reset', detail: {} });
  }, []);

  // ── play()/pause(): an automated squeeze-then-release demonstration cycle ──
  const doPlay = useCallback(() => {
    if (autoTimerRef.current) return;
    let t = 0;
    autoTimerRef.current = setInterval(() => {
      t += 0.06;
      const v = (Math.sin(t) + 1) / 2; // 0..1..0 breathing cycle
      doSetSqueeze(v);
      if (t > Math.PI * 4) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; }
    }, 90);
  }, [doSetSqueeze]);
  const doPause = useCallback(() => {
    if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; }
  }, []);
  useEffect(() => () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); }, []);

  // ── operator mode switch: used by props, setOperatorMode, AND the toggle ──
  const applyMode = useCallback((m: 'ai' | 'student') => {
    setMode(m);
    emit({ type: 'event', name: 'operator_mode_changed', detail: { mode: m, depth: m === 'ai' ? 'lean' : 'full' } });
  }, []);

  // ── the agent API ──
  const api = {
    setParam: (name: string, value: any) => {
      if (name === 'muted') { mutedRef.current = !!value; setMutedUI(!!value); }
      else if (name === 'operatorMode') applyMode(value === 'ai' ? 'ai' : 'student');
      else if (name === 'squeeze') doSetSqueeze(Number(value));
      else if (name === 'dust' || name === 'dustOn') doSetDust(!!value);
    },
    play: doPlay,
    pause: doPause,
    reset: doReset,
    highlight: doHighlight,
    getState: () => {
      const s = { ...stateRef.current, operatorMode: modeRef.current, depth: modeRef.current === 'ai' ? 'lean' : 'full' };
      emit({ type: 'state', state: s });
      return s;
    },
    setOperatorMode: (m: string) => applyMode(m === 'ai' ? 'ai' : 'student'),
    setSqueeze: doSetSqueeze,
    setDust: doSetDust,
    gotoPhase: (phase: string) => doGotoPhase(phase as Phase),
    commitPrediction: (choice: string) => doCommitPrediction(choice === 'cloudForms' ? 'cloudForms' : 'noCloud'),
    choose: (questionId: string, optionId: string) => doChoose(questionId, (optionId as 'a' | 'b' | 'c')),
    submit: () => stateRef.current, // safe no-op alias — choose() already commits the answer
    finish: doFinish,
  };
  const apiRef = useRef(api); apiRef.current = api;

  // ── message listener + REQUIRED ready signal ──
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== 'command') return;
      const fn = (apiRef.current as any)[d.method];
      let result;
      try { if (typeof fn === 'function') result = fn(...(d.args || [])); } catch { result = null; }
      emit({ type: 'response', id: d.id, result });
    };
    window.addEventListener('message', onMsg);
    emit({ type: 'ready', toolId: TOOL_ID });
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // ── keep in sync if the host changes mode/muted via props ──
  useEffect(() => { if (props.operatorMode && props.operatorMode !== modeRef.current) applyMode(props.operatorMode); }, [props.operatorMode]); // eslint-disable-line
  useEffect(() => { if (typeof props.muted === 'boolean') { mutedRef.current = props.muted; setMutedUI(props.muted); } }, [props.muted]);

  // ==================== DERIVED / RENDER HELPERS ====================
  const bodyFont = clamp(isNarrow ? 14 : 16, 13, 17);
  const sceneW = clamp(Math.min(cw * (isNarrow ? 0.42 : 0.34), isBig ? 480 : 340), 150, 480);
  const t = isDark ? dark.text : DS.c.gray900;
  const tDim = isDark ? dark.textDim : DS.c.gray700;
  const surface = isDark ? dark.surface : '#fff';
  const surface2 = isDark ? dark.surface2 : DS.c.gray100;
  const border = isDark ? dark.border : DS.c.gray200;

  const showModeToggle = props.showModeToggle ?? true;
  const q = QUESTIONS[state.qIndex];
  const answeredCount = QUESTIONS.filter((qq) => state.answers[qq.id]).length;
  const { score } = scoreAndBreakdown();
  const stars = score >= 5 ? 3 : score >= 3 ? 2 : score >= 1 ? 1 : 0;

  const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div style={{ background: surface2, borderRadius: DS.r.lg, padding: isNarrow ? 12 : 16, ...style }}>{children}</div>
  );

  const CTA: React.FC<{ label: string; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'ghost'; icon?: React.ReactNode; small?: boolean }> =
    ({ label, onClick, disabled, variant = 'primary', icon, small }) => (
      <motion.button
        onClick={disabled ? undefined : onClick} disabled={disabled}
        whileHover={disabled ? {} : { scale: 1.035 }} whileTap={disabled ? {} : { scale: 0.95 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center',
          minHeight: device === 'smartboard' ? 60 : small ? 40 : 48, minWidth: device === 'smartboard' ? 120 : undefined,
          padding: small ? '0 16px' : '0 22px', borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700,
          fontSize: small ? 13 : 15, border: variant === 'ghost' ? `2px solid ${border}` : 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          background: variant === 'primary' ? `linear-gradient(135deg, ${accent}, ${DS.c.accentDark})` : 'transparent',
          color: variant === 'primary' ? '#fff' : t, opacity: disabled ? 0.45 : 1,
          boxShadow: variant === 'primary' && !disabled ? DS.sh.md : 'none',
        }}>
        {icon}{label}
      </motion.button>
    );

  const fadeSlide = { initial: { opacity: 0, x: 18 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -18 }, transition: { type: 'spring', stiffness: 280, damping: 28 } as any };

  // ---------- Explore phase content (right pane) ----------
  const IntroContent = () => (
    <motion.div {...fadeSlide} key="intro">
      <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isNarrow ? 17 : 19, marginBottom: 6, color: t }}>A closed bottle of warm water</div>
      <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: tDim, lineHeight: 1.5, marginBottom: 14 }}>
        The warm water fills the sealed air above it with invisible water vapour. Our goal: make a cloud appear inside — and find out what it needs.
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CTA label="Start" onClick={() => doGotoPhase('predict')} icon={<ChevronRight size={16} />} />
      </div>
    </motion.div>
  );

  const PredictContent = () => (
    <motion.div {...fadeSlide} key="predict">
      <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isNarrow ? 17 : 19, marginBottom: 6, color: t }}>Predict first</div>
      <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: tDim, lineHeight: 1.5, marginBottom: 12 }}>
        With no dust inside, will squeezing and releasing this bottle make a cloud?
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {([{ id: 'cloudForms', label: 'Yes — a cloud will form' }, { id: 'noCloud', label: 'No — it will stay clear' }] as const).map((o) => {
          const sel = state.prediction === o.id;
          return (
            <motion.button key={o.id} whileTap={{ scale: 0.96 }} onClick={() => doCommitPrediction(o.id as any)} disabled={!!state.prediction}
              style={{
                flex: '1 1 150px', minHeight: 46, borderRadius: DS.r.md, fontFamily: DS.font, fontWeight: 700, fontSize: bodyFont - 1,
                cursor: state.prediction ? 'default' : 'pointer', border: `2px solid ${sel ? accent : border}`,
                background: sel ? `${accent}1a` : surface, color: sel ? accent : t,
              }}>{o.label}</motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {state.prediction && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Panel style={{ fontFamily: DS.font, fontSize: bodyFont - 1, color: t, marginBottom: 12 }}>
              Let's actually test it — first with a clean bottle, then with {dustLabel} added.
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <CTA label="Back" variant="ghost" icon={<ChevronLeft size={16} />} onClick={() => doGotoPhase('intro')} />
        <CTA label="Next" disabled={!state.prediction} icon={<ChevronRight size={16} />} onClick={() => doGotoPhase('testNoDust')} />
      </div>
    </motion.div>
  );

  const TestNoDustContent = () => (
    <motion.div {...fadeSlide} key="testNoDust">
      <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isNarrow ? 17 : 19, marginBottom: 6, color: t }}>Test 1 — squeeze with NO dust</div>
      <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: tDim, lineHeight: 1.5, marginBottom: 12 }}>
        {state.squeeze > 0.55 ? 'Squeezing — the air is compressed and a little warmer.'
          : state.sawNoDustRelease ? 'Released… and it stays clear. No cloud forms in clean air.'
          : 'Drag the slider to squeeze hard, then slide back to release. Watch the air space.'}
      </div>
      <div style={{ marginBottom: 14 }}>
        <SqueezeSlider value={state.squeeze} onChange={doSetSqueeze} accent={accent} highlight={highlightTarget === 'squeezeSlider'} />
      </div>
      <AnimatePresence>
        {state.sawNoDustRelease && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Panel style={{ fontFamily: DS.font, fontSize: bodyFont - 1, color: t, marginBottom: 12 }}>
              Cooling alone <b>wasn't enough</b>. Something is missing — let's add some {dustLabel}.
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <CTA label="Back" variant="ghost" icon={<ChevronLeft size={16} />} onClick={() => doGotoPhase('predict')} />
        <CTA label="Next" disabled={!state.sawNoDustRelease} icon={<ChevronRight size={16} />} onClick={() => doGotoPhase('testWithDust')} />
      </div>
    </motion.div>
  );

  const TestWithDustContent = () => (
    <motion.div {...fadeSlide} key="testWithDust">
      <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isNarrow ? 17 : 19, marginBottom: 6, color: t }}>Test 2 — add dust, squeeze & release</div>
      <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: tDim, lineHeight: 1.5, marginBottom: 12 }}>
        {!state.dustOn ? `Tap to add ${dustLabel} first.`
          : state.squeeze > 0.55 ? 'Squeezing — held warm, still clear…'
          : state.haze > 0.4 ? 'A cloud! The vapour condensed onto the dust specks.'
          : 'Now release the squeeze and watch closely.'}
      </div>
      <div style={{ display: 'flex', marginBottom: 12 }}>
        <DustToggle on={state.dustOn} onClick={() => doSetDust(!state.dustOn)} label={dustLabel} highlight={highlightTarget === 'dustToggle'} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <SqueezeSlider value={state.squeeze} onChange={doSetSqueeze} accent={accent} disabled={!state.dustOn} highlight={highlightTarget === 'squeezeSlider'} />
      </div>
      <AnimatePresence>
        {state.sawDustCloud && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Panel style={{ background: `${accent}14`, fontFamily: DS.font, fontSize: bodyFont - 1, color: t, marginBottom: 12 }}>
              With dust, releasing makes a <b>cloud</b>! It gives the cooled vapour something to condense onto.
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <CTA label="Back" variant="ghost" icon={<ChevronLeft size={16} />} onClick={() => doGotoPhase('testNoDust')} />
        <CTA label="Next" disabled={!state.sawDustCloud} icon={<ChevronRight size={16} />} onClick={() => doGotoPhase('wrap')} />
      </div>
    </motion.div>
  );

  const WrapContent = () => (
    <motion.div {...fadeSlide} key="wrap">
      <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isNarrow ? 17 : 19, marginBottom: 8, color: t }}>You made a cloud!</div>
      <Panel style={{ background: `${accent}14`, fontFamily: DS.font, fontSize: bodyFont - 1, color: t, lineHeight: 1.5, marginBottom: 14 }}>
        Releasing the squeeze lets the air <b>expand and cool</b>, but it only makes a visible cloud with <b style={{ color: accent }}>{dustLabel}</b> for droplets to form on. Real clouds work the same way.
      </Panel>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CTA label="Start the quiz" onClick={() => doGotoPhase('quiz')} icon={<ChevronRight size={16} />} />
      </div>
    </motion.div>
  );

  const QuizContent = () => q ? (
    <motion.div {...fadeSlide} key={`quiz-${q.id}`}>
      <div style={{ height: 6, background: border, borderRadius: DS.r.pill, overflow: 'hidden', marginBottom: 10 }}>
        <motion.div animate={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }} style={{ height: '100%', background: accent }} />
      </div>
      <div style={{ fontFamily: DS.font, fontSize: 12, color: tDim, marginBottom: 6 }}>Question {state.qIndex + 1} of {QUESTIONS.length}</div>
      <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isNarrow ? 15.5 : 17, color: t, marginBottom: 12, lineHeight: 1.35 }}>{q.prompt}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map((opt) => {
          const picked = state.answers[q.id];
          const isPicked = picked === opt.id;
          const revealed = !!picked;
          const isCorrectOpt = opt.id === q.correct;
          let bg = surface, bd = border, fg = t;
          if (revealed && isCorrectOpt) { bg = `${DS.c.success}1c`; bd = DS.c.success; fg = isDark ? '#8FE3B4' : DS.c.success; }
          else if (revealed && isPicked && !isCorrectOpt) { bg = `${DS.c.danger}1c`; bd = DS.c.danger; fg = isDark ? '#FFAFAF' : DS.c.danger; }
          return (
            <motion.button key={opt.id} whileTap={revealed ? {} : { scale: 0.98 }} onClick={() => doChoose(q.id, opt.id)} disabled={revealed}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', minHeight: 44, padding: '9px 14px', borderRadius: DS.r.md,
                fontFamily: DS.font, fontWeight: 600, fontSize: bodyFont - 1.5, cursor: revealed ? 'default' : 'pointer',
                border: `2px solid ${bd}`, background: bg, color: fg, lineHeight: 1.35,
              }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: isDark ? dark.surface2 : DS.c.gray100, color: fg, textTransform: 'uppercase' }}>{opt.id}</span>
              {opt.text}
              {revealed && isCorrectOpt && <Check size={16} color={DS.c.success} style={{ marginLeft: 'auto' }} />}
              {revealed && isPicked && !isCorrectOpt && <XIcon size={16} color={DS.c.danger} style={{ marginLeft: 'auto' }} />}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  ) : null;

  const [openReview, setOpenReview] = useState<string | null>(null);
  const SummaryContent = () => (
    <motion.div {...fadeSlide} key="summary">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ fontFamily: DS.font, fontWeight: 800, fontSize: 30, color: DS.c.primaryDark }}>{score}<span style={{ fontSize: 15, opacity: 0.6 }}>/{QUESTIONS.length}</span></div>
        <div style={{ display: 'flex', gap: 2 }}>
          {[0, 1, 2].map((i) => <Star key={i} size={18} fill={i < stars ? DS.c.amber : border} color={i < stars ? DS.c.amber : border} />)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {QUESTIONS.map((qq, i) => {
          const correct = state.answers[qq.id] === qq.correct;
          const open = openReview === qq.id;
          return (
            <motion.button key={qq.id} whileTap={{ scale: 0.94 }} onClick={() => setOpenReview(open ? null : qq.id)}
              style={{
                width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', fontFamily: DS.font, fontWeight: 800, fontSize: 12,
                background: correct ? `${DS.c.success}2a` : `${DS.c.danger}2a`, color: correct ? DS.c.success : DS.c.danger,
                outline: open ? `2px solid ${accent}` : 'none',
              }}>{i + 1}</motion.button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        {openReview && (() => {
          const qq = QUESTIONS.find((x) => x.id === openReview)!;
          return (
            <motion.div key={openReview} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Panel style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: bodyFont - 1.5, color: t, marginBottom: 6 }}>{qq.prompt}</div>
                <div style={{ fontFamily: DS.font, fontSize: bodyFont - 2, color: tDim, lineHeight: 1.5 }}>{qq.explanation}</div>
              </Panel>
            </motion.div>
          );
        })()}
      </AnimatePresence>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CTA label="Finish" icon={<Sparkles size={16} />} onClick={doFinish} />
      </div>
    </motion.div>
  );

  const PHASE_CONTENT: Record<Phase, () => React.ReactNode> = {
    intro: IntroContent, predict: PredictContent, testNoDust: TestNoDustContent,
    testWithDust: TestWithDustContent, wrap: WrapContent, quiz: QuizContent, summary: SummaryContent,
  };

  // ---------- scene props per phase (student mode) ----------
  const sceneForPhase = (): { squeeze: number; dust: boolean; haze: number; tag: 'cloud' | 'clear' | null } => {
    if (state.phase === 'predict') return { squeeze: 0.7, dust: false, haze: 0, tag: null };
    if (state.phase === 'wrap') return { squeeze: 0, dust: true, haze: 0.85, tag: 'cloud' };
    if (state.phase === 'quiz' || state.phase === 'summary') return { squeeze: 0, dust: state.dustOn, haze: state.haze, tag: state.haze > 0.4 ? 'cloud' : null };
    return { squeeze: state.squeeze, dust: state.dustOn, haze: state.haze, tag: state.phase === 'testNoDust' && state.sawNoDustRelease ? 'clear' : state.phase === 'testWithDust' && state.haze > 0.4 ? 'cloud' : null };
  };
  const scene = sceneForPhase();

  // ==================== TEACHER (lean/ai) DEMO VIEW ====================
  const TeacherDemo = () => (
    <div style={{ display: 'flex', flexDirection: isNarrow ? 'column' : 'row', gap: 18, alignItems: 'center', height: '100%', justifyContent: 'center' }}>
      <motion.div layout style={{ width: sceneW * (isBig ? 1.3 : 1.15), flexShrink: 0 }}>
        <BottleScene squeeze={state.squeeze} dust={state.dustOn} haze={state.haze} hazeColor={hazeColor} dustLabel={dustLabel}
          width={sceneW * (isBig ? 1.3 : 1.15)} showTag={state.haze > 0.4 ? 'cloud' : (state.squeeze < 0.12 && state.sawNoDustRelease && !state.dustOn ? 'clear' : null)}
          ringPulse={highlightTarget === 'bottle'} isDark={isDark} />
      </motion.div>
      <div style={{ maxWidth: 320, textAlign: isNarrow ? 'center' : 'left' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: DS.r.pill, background: `${accent}18`, color: accent, fontFamily: DS.font, fontWeight: 700, fontSize: 12.5, marginBottom: 10 }}>
          <GraduationCap size={14} /> Your teacher is showing you this — watch, you'll get a turn
        </div>
        <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: tDim, lineHeight: 1.55, marginBottom: 10 }}>
          Squeeze: <b style={{ color: t }}>{Math.round(state.squeeze * 100)}%</b> · Dust: <b style={{ color: t }}>{state.dustOn ? dustLabel : 'none'}</b> · {state.haze > 0.4 ? <b style={{ color: accent }}>Cloud visible</b> : 'No cloud yet'}
        </div>
        <div style={{ fontFamily: DS.font, fontSize: bodyFont - 1, color: tDim, lineHeight: 1.5 }}>
          Watch what happens when the bottle is squeezed and released, with and without dust in the air.
        </div>
      </div>
    </div>
  );

  // ==================== HEADER ====================
  const Header = () => (
    <div style={{
      background: `linear-gradient(135deg, ${DS.c.primaryDark}, ${accent}dd 130%)`, color: '#fff',
      padding: isShort ? '8px 14px' : '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Cloud size={isShort ? 20 : 24} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: isShort ? 14 : 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cloud in a Bottle</div>
          {!isShort && <div style={{ fontSize: 11, opacity: 0.88 }}>Squeeze, release, add dust — watch the cloud</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={() => { mutedRef.current = !mutedRef.current; setMutedUI(mutedRef.current); }}
          aria-label="mute" style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {mutedUI ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        {showModeToggle && <ModeToggle mode={mode} onChange={applyMode} />}
      </div>
    </div>
  );

  // ==================== TOP-LEVEL LAYOUT ====================
  return (
    <div ref={rootRef} style={{
      width: '100%', height: '100%', minHeight: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      fontFamily: DS.font, background: isDark ? dark.bg : `linear-gradient(180deg, #FBFBFE, ${DS.c.gray100})`,
      color: t, overflow: 'hidden', position: 'relative',
    }}>
      <Header />

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: isShort ? '10px 14px' : isNarrow ? '14px 16px' : '18px 26px', display: 'flex' }}>
        {mode === 'ai' ? (
          <TeacherDemo />
        ) : (
          <div style={{
            width: '100%', display: 'grid', gap: isShort ? 12 : 20, minHeight: 0,
            gridTemplateColumns: isNarrow ? '0.9fr 1.1fr' : 'minmax(220px, 1fr) minmax(280px, 1.15fr)',
            alignItems: 'stretch',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              <div style={{ width: '100%', maxWidth: sceneW, maxHeight: '100%' }}>
                <BottleScene squeeze={scene.squeeze} dust={scene.dust} haze={scene.haze} hazeColor={hazeColor} dustLabel={dustLabel}
                  width={sceneW} showTag={scene.tag} ringPulse={highlightTarget === 'bottle'} isDark={isDark} />
              </div>
            </div>
            <div style={{ minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <AnimatePresence mode="wait">
                {PHASE_CONTENT[state.phase]()}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {state.finished && (
          <FinishOverlay evaluated total={QUESTIONS.length} score={score} stars={stars} isDark={isDark}
            learned={[
              'A closed bottle of warm water fills its air with invisible water vapour.',
              'Releasing a squeeze cools the trapped air — but cooling alone does not make a cloud.',
              'A visible cloud forms only when dust particles are present for the vapour to condense onto.',
              'Real clouds form the same way high in the sky.',
            ]} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CloudInABottleSimulator;
