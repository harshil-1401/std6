// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: pot_cooler_builder.tsx
// Tool id M4.S7.T15.2D1 — "Build & Test a Pot-in-Pot Cooler" (evaporative cooling, no electricity)
// Class 6 Science. Subtype: simulation. Placement beat: Apply (the student builds, predicts,
// and observes — that IS the learning; the agent mostly highlights and coaches).
//
// AGENT-CONTROL CONTRACT (see 2D_PROMPT 5.md §3): the component talks to its host ONLY through
// window.postMessage. It emits {type:'ready'} once on mount, listens for {type:'command'}
// messages and dispatches them onto a ref-backed `api` object, and emits {type:'event'},
// {type:'state'} and {type:'response'} messages back to the parent. Every windowMethod below
// exists on `api`; every event emitted is listed in the sidecar JSON's `events` array.
//
// Physics (verified, kept EXACTLY as the original tool — single source of truth):
//   T(t,m) = T_floor + (32 − T_floor)·e^(−t/1.5),  T_floor = 32 − (2 + 9.8·m),
//   m = 0.6·sandWet + 0.4·coverWet.  Full-moist floor ≈ 20°C (~12°C drop); dry floor ≈ 30°C
//   (~2°C — bare porous clay still wicks a little, never flat-false). Monotonic, clamped.
//
// IMPORTANT — ICONS: this tool deliberately uses INLINE SVG icons and imports NO 'lucide-react'.
//   The deployed iframe renderer only injects a fixed icon allowlist; a missing name throws
//   "X is not defined" in prod. Inline SVGs are renderer-independent. Do NOT add a lucide import.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TOOL_ID = 'M4.S7.T15.2D1';
const emit = (m: any) => { try { window.parent.postMessage(m, '*'); } catch {} };

// ==================== INLINE ICONS (no lucide-react) ====================
interface IconProps { size?: number; color?: string; fill?: string; strokeWidth?: number; style?: React.CSSProperties; }
const mkIcon = (paths: React.ReactNode, opts?: { solid?: boolean }) => {
  const Cmp: React.FC<IconProps> = ({ size = 24, color, fill = 'none', strokeWidth = 2, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={opts?.solid ? (fill !== 'none' ? fill : color || 'currentColor') : fill}
      stroke={opts?.solid ? 'none' : 'currentColor'} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ color, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} aria-hidden="true">
      {paths}
    </svg>
  );
  return Cmp;
};
const ChevronLeft = mkIcon(<path d="m15 18-6-6 6-6" />);
const ChevronRight = mkIcon(<path d="m9 18 6-6-6-6" />);
const RotateCcw = mkIcon(<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>);
const Check = mkIcon(<path d="M20 6 9 17l-5-5" />);
const XIcon = mkIcon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const Star = mkIcon(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />, { solid: true });
const Award = mkIcon(<><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></>);
const Play = mkIcon(<polygon points="6 3 20 12 6 21 6 3" />, { solid: true });
const Pause = mkIcon(<><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>, { solid: true });
const ThermometerIcon = mkIcon(<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />);
const Snowflake = mkIcon(<><line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><path d="m20 16-4-4 4-4" /><path d="m4 8 4 4-4 4" /><path d="m16 4-4 4-4-4" /><path d="m8 20 4-4 4 4" /></>);
const VolumeIcon = mkIcon(<><polygon points="4 9 8 9 12 5 12 19 8 15 4 15 4 9" fill="currentColor" stroke="none" /><path d="M16 8a5 5 0 0 1 0 8" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>);
const VolumeOffIcon = mkIcon(<><polygon points="4 9 8 9 12 5 12 19 8 15 4 15 4 9" fill="currentColor" stroke="none" /><line x1="16" y1="9" x2="21" y2="14" /><line x1="21" y1="9" x2="16" y2="14" /></>);
const Sparkle = mkIcon(<path d="M12 2 L14 9 L21 11 L14 13 L12 21 L10 13 L3 11 L10 9 Z" fill="currentColor" stroke="none" />, { solid: true });

// ==================== DESIGN TOKENS (Singularity + domain palette) ====================
const DS = {
  c: {
    primary: '#4A4DC9', primaryDark: '#33307A', primaryLight: '#C1C1EA', primaryGhost: '#EDEDF8',
    accent: '#FF7212', accentDark: '#D65A0A', accentLight: '#FFF3E4',
    gray900: '#1A1A2E', gray700: '#4E4E4E', gray500: '#7C7C8A', gray400: '#CACACA', gray200: '#EBEBEB', gray100: '#F5F5F5',
    white: '#FFFFFF', success: '#2ECC71', danger: '#E5484D', teal: '#0891b2', amber: '#F59E0B',
    pink: '#DB2777', deepBlue: '#1E40AF', forest: '#166534',
    clay: '#B05A35', clayDark: '#8A4226', clayLight: '#C97A52',
    sandDry: '#E4D2A8', sandWet: '#B79A63',
    water: '#5BA7D6', coolBlue: '#2D7DBE', mercury: '#E03B45', cover: '#9C7A4D', coverWet: '#6E5638',
  },
  cDark: {
    bg0: '#12121F', bg1: '#191933', surface: '#1F1F3A', surfaceAlt: '#252546',
    border: '#33335C', text: '#F1F1FA', textDim: '#B7B7CE',
  },
  font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  serif: `Georgia, 'Times New Roman', serif`,
  r: { sm: 8, md: 12, lg: 16, xl: 24, pill: 9999 },
  sh: {
    sm: '0 2px 8px rgba(26,26,46,0.08)', md: '0 6px 18px rgba(26,26,46,0.12)',
    lg: '0 16px 40px rgba(26,26,46,0.18)', xl: '0 25px 50px -12px rgba(26,26,46,0.30)',
  },
};

// ==================== COLOUR HELPERS ====================
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function hex(c: string): [number, number, number] {
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mix(a: string, b: string, t: number): string {
  const pa = hex(a), pb = hex(b);
  const ch = (i: number) => clamp(Math.round(pa[i] + (pb[i] - pa[i]) * t), 0, 255).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

// ==================== PHYSICS (verified evaporative-cooling model — DO NOT CHANGE) ====================
const T_ROOM = 32;
const DT_BASE = 2;
const DT_MAX = 14;
const RH = 0.30;
const DTMAX_EFF = DT_MAX * (1 - RH);
const TAU = 1.5;
const RUN_HOURS = 5;
const MOIST_SAND_W = 0.6;
const MOIST_COVER_W = 0.4;
const SAND_WET = 0.85;   // fixed moisture once step 5 (pour_water) is placed — matches the textbook build
const COVER_WET = 0.7;   // fixed moisture once step 6 (cover) is placed

const effMoisture = (sandWet: number, coverWet: number) => clamp(MOIST_SAND_W * sandWet + MOIST_COVER_W * coverWet, 0, 1);
const totalDrop = (sandWet: number, coverWet: number) => DT_BASE + DTMAX_EFF * effMoisture(sandWet, coverWet);
const tempFloor = (sandWet: number, coverWet: number) => T_ROOM - totalDrop(sandWet, coverWet);
const insideTemp = (hours: number, sandWet: number, coverWet: number) => {
  const floor = tempFloor(sandWet, coverWet);
  const t = T_ROOM - (T_ROOM - floor) * (1 - Math.exp(-Math.max(0, hours) / TAU));
  return clamp(t, floor, T_ROOM);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// ==================== BUILD STEPS ====================
interface BuildStep { id: string; title: string; caption: string; }
const BUILD_STEPS: BuildStep[] = [
  { id: 'large_pot', title: 'Place the large pot', caption: 'Start with a big earthen (clay) pot — the outer shell of your cooler.' },
  { id: 'base_sand', title: 'Add a layer of sand', caption: 'Fill the bottom of the large pot with a layer of sand for the small pot to rest on.' },
  { id: 'small_pot', title: 'Set the small pot inside', caption: 'Place a smaller earthen pot in the centre — this is where food will stay cool.' },
  { id: 'fill_sand', title: 'Fill the gap with sand', caption: 'Pack more sand into the gap all around the small pot.' },
  { id: 'pour_water', title: 'Pour water into the sand', caption: 'Wet the sand with water — this is the water that will evaporate and cool the inside.' },
  { id: 'cover', title: 'Add the wet jute cover', caption: 'Cover the small pot with a damp jute (cloth) lid. Water leaving the wet sand and cover carries heat away, so the inside cools.' },
];
const STEP_COUNT = BUILD_STEPS.length;
const PREDICT_OPTIONS: { id: 'cooler' | 'same' | 'warmer'; label: string; icon: React.ReactNode }[] = [
  { id: 'cooler', label: 'Inside gets cooler', icon: <Snowflake size={18} color={DS.c.coolBlue} /> },
  { id: 'same', label: 'No change', icon: <span style={{ fontSize: 16 }}>➖</span> },
  { id: 'warmer', label: 'Inside gets warmer', icon: <span style={{ fontSize: 16 }}>🔥</span> },
];
const CORRECT_PREDICTION: 'cooler' | 'same' | 'warmer' = 'cooler';
const LEARNED_POINTS = [
  'A pot-in-pot cooler works with NO electricity — just clay, sand and water.',
  'Water in the moist sand evaporates from the pot surfaces into the air.',
  'Evaporation carries heat away, so the inside of the small pot gets cooler.',
  'That is the same cooling idea as an earthen matka or a surahi.',
];

// ==================== KEYFRAMES ====================
const KEYFRAMES = `
@keyframes pc_fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pc_popIn { 0% { opacity: 0; transform: scale(0.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes pc_shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-7px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
@keyframes pc_pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.045); } }
@keyframes pc_glow { 0%,100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); } 50% { box-shadow: 0 0 0 8px rgba(46,204,113,0.25); } }
@keyframes pc_pointerGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,114,18,0.0); } 50% { box-shadow: 0 0 0 10px rgba(255,114,18,0.35); } }
@keyframes pc_starPop { 0% { opacity: 0; transform: scale(0) rotate(-30deg); } 70% { transform: scale(1.25) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes pc_confetti { 0% { opacity: 1; transform: translateY(-10px) rotate(0); } 100% { opacity: 0; transform: translateY(620px) rotate(560deg); } }
@keyframes pc_rise { 0% { opacity: 0; transform: translateY(6px) scaleY(0.6); } 30% { opacity: 0.7; } 100% { opacity: 0; transform: translateY(-16px) scaleY(1.1); } }
@keyframes pc_dropIn { 0% { opacity: 0; transform: translateY(-22px); } 60% { transform: translateY(3px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes pc_breathe { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
input[type=range].pc_range { -webkit-appearance: none; appearance: none; background: transparent; }
input[type=range].pc_range::-webkit-slider-runnable-track { height: 8px; border-radius: 999px; background: linear-gradient(90deg, rgba(0,0,0,0.08), rgba(0,0,0,0.08)); }
input[type=range].pc_range::-webkit-slider-thumb { -webkit-appearance: none; margin-top: -8px; width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 3px solid var(--pc-accent, #FF7212); box-shadow: 0 2px 6px rgba(0,0,0,0.25); cursor: pointer; }
input[type=range].pc_range::-moz-range-track { height: 8px; border-radius: 999px; background: rgba(0,0,0,0.08); }
input[type=range].pc_range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 3px solid var(--pc-accent, #FF7212); box-shadow: 0 2px 6px rgba(0,0,0,0.25); cursor: pointer; }
`;

// ==================== SOUND ENGINE (Web Audio, synthesised, mutable) ====================
function useSoundEngine(mutedRef: React.MutableRefObject<boolean>) {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    } catch { ctxRef.current = null; }
    return ctxRef.current;
  }, []);
  const tone = useCallback((freq: number, t0: number, dur: number, ctx: AudioContext, gainPeak = 0.16, type: OscillatorType = 'sine') => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }, []);
  const play = useCallback((kind: 'tap' | 'correct' | 'wrong' | 'chime' | 'whoosh' | 'fanfare') => {
    if (mutedRef.current) return;
    const ctx = ensure(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    if (kind === 'tap') tone(520, t0, 0.09, ctx, 0.12, 'triangle');
    else if (kind === 'correct') { tone(523.25, t0, 0.14, ctx, 0.14, 'sine'); tone(783.99, t0 + 0.1, 0.22, ctx, 0.14, 'sine'); }
    else if (kind === 'wrong') { tone(220, t0, 0.16, ctx, 0.12, 'sawtooth'); tone(174, t0 + 0.09, 0.18, ctx, 0.1, 'sawtooth'); }
    else if (kind === 'chime') { tone(660, t0, 0.12, ctx, 0.1, 'sine'); tone(880, t0 + 0.08, 0.16, ctx, 0.1, 'sine'); }
    else if (kind === 'whoosh') { tone(300, t0, 0.3, ctx, 0.05, 'sine'); }
    else if (kind === 'fanfare') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t0 + i * 0.12, 0.28, ctx, 0.13, 'triangle')); }
  }, [ensure, tone, mutedRef]);
  return play;
}

// ==================== SMALL UI PIECES ====================
const PillButton: React.FC<{
  label: string; onClick?: () => void; variant?: 'contained' | 'outlined' | 'ghost';
  color?: string; disabled?: boolean; icon?: React.ReactNode; minH?: number; fontSize?: number; grow?: boolean; dark?: boolean;
}> = ({ label, onClick, variant = 'contained', color = DS.c.accent, disabled, icon, minH = 48, fontSize = 15, grow, dark }) => {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: minH, padding: '0 20px', borderRadius: DS.r.pill, fontFamily: DS.font, fontWeight: 700,
    fontSize, cursor: disabled ? 'not-allowed' : 'pointer', border: '2px solid transparent', boxSizing: 'border-box',
    transition: 'transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease, background .2s ease, outline .12s ease',
    transform: press ? 'scale(0.95)' : hover && !disabled ? 'scale(1.045)' : 'scale(1)',
    opacity: disabled ? 0.45 : 1, flex: grow ? 1 : undefined, userSelect: 'none', whiteSpace: 'nowrap', outline: 'none',
  };
  const skin: React.CSSProperties =
    variant === 'contained' ? { background: color, color: '#fff', boxShadow: hover && !disabled ? DS.sh.md : DS.sh.sm }
    : variant === 'outlined' ? { background: hover && !disabled ? (dark ? 'rgba(255,255,255,0.08)' : DS.c.primaryGhost) : (dark ? 'transparent' : '#fff'), color, borderColor: color }
    : { background: hover && !disabled ? (dark ? 'rgba(255,255,255,0.08)' : DS.c.primaryGhost) : 'transparent', color };
  return (
    <button
      style={{ ...base, ...skin }} onClick={disabled ? undefined : onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      onFocus={(e) => { e.currentTarget.style.outline = `2px solid ${DS.c.primary}`; e.currentTarget.style.outlineOffset = '2px'; }}
      onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
    >
      {icon}{label}
    </button>
  );
};

const RangeSlider: React.FC<{
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
  leftLabel: string; rightLabel: string; valueLabel: string; accent: string; disabled?: boolean; dark?: boolean;
}> = ({ value, min, max, step, onChange, leftLabel, rightLabel, valueLabel, accent, disabled, dark }) => (
  <div style={{ width: '100%', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, fontFamily: DS.font }}>
      <span style={{ fontSize: 11.5, color: dark ? DS.cDark.textDim : DS.c.gray700 }}>{leftLabel}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: dark ? DS.cDark.text : DS.c.gray900 }}>{valueLabel}</span>
      <span style={{ fontSize: 11.5, color: dark ? DS.cDark.textDim : DS.c.gray700 }}>{rightLabel}</span>
    </div>
    <input
      className="pc_range" type="range" min={min} max={max} step={step} value={value} disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ['--pc-accent' as any]: accent, width: '100%', height: 24, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    />
  </div>
);

const ConfettiBurst: React.FC<{ count: number; duration: number }> = ({ count, duration }) => {
  const palette = [DS.c.accent, DS.c.primary, DS.c.amber, DS.c.pink, DS.c.success, DS.c.coolBlue];
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.5, dur: duration / 1000 + Math.random() * 0.6,
    color: palette[i % palette.length], size: 7 + Math.random() * 7, round: Math.random() > 0.5,
  })), [count, duration]);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{ position: 'absolute', top: -12, left: `${p.left}%`, width: p.size, height: p.size, background: p.color, borderRadius: p.round ? '50%' : 2, animation: `pc_confetti ${p.dur}s ${p.delay}s ease-in forwards` }} />
      ))}
    </div>
  );
};

const StarsRow: React.FC<{ count: number; total?: number; stagger: number }> = ({ count, total = 3, stagger }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '6px 0 4px' }}>
    {Array.from({ length: total }).map((_, i) => (
      <Star key={i} size={38} fill={i < count ? DS.c.amber : DS.c.gray200} color={i < count ? DS.c.amber : DS.c.gray400}
        style={{ animation: `pc_starPop .5s ${i * (stagger / 1000)}s both` }} />
    ))}
  </div>
);

// Clickable Teacher | Student segmented toggle (§6.1) — mirrors/overrides host operatorMode.
const ModeToggle: React.FC<{ mode: 'ai' | 'student'; onChange: (m: 'ai' | 'student') => void; dark?: boolean }> = ({ mode, onChange, dark }) => {
  const track: React.CSSProperties = {
    position: 'relative', display: 'inline-flex', padding: 3, borderRadius: DS.r.pill, gap: 2,
    background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.20)', border: `1.5px solid ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.35)'}`,
    boxSizing: 'border-box',
  };
  const seg = (key: 'ai' | 'student'): React.CSSProperties => ({
    position: 'relative', zIndex: 2, minHeight: 34, minWidth: 84, padding: '0 12px', borderRadius: DS.r.pill,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: DS.font, fontWeight: 700, fontSize: 12.5,
    color: mode === key ? DS.c.primaryDark : '#fff', cursor: 'pointer', userSelect: 'none', border: 'none', background: 'transparent',
  });
  return (
    <div style={track} role="tablist" aria-label="Teacher or Student mode">
      <motion.div
        aria-hidden style={{ position: 'absolute', top: 3, bottom: 3, left: 3, width: 'calc(50% - 4px)', borderRadius: DS.r.pill, background: '#fff', zIndex: 1 }}
        animate={{ x: mode === 'ai' ? 0 : '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      />
      <button style={seg('ai')} onClick={() => onChange('ai')} aria-pressed={mode === 'ai'}>👩‍🏫 Teacher</button>
      <button style={seg('student')} onClick={() => onChange('student')} aria-pressed={mode === 'student'}>🙋 Your turn</button>
    </div>
  );
};

const MuteButton: React.FC<{ muted: boolean; onClick: () => void }> = ({ muted, onClick }) => (
  <button onClick={onClick} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title={muted ? 'Unmute' : 'Mute'}
    style={{
      width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.16)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
      transition: 'transform .15s ease, background .15s ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; }}
  >
    {muted ? <VolumeOffIcon size={17} color="#fff" /> : <VolumeIcon size={17} color="#fff" />}
  </button>
);

// fixed vapour-wisp anchor points around the outer wall (module-level, never re-randomises)
const WISPS = [{ x: 0.14, d: 0 }, { x: 0.30, d: 0.5 }, { x: 0.70, d: 0.25 }, { x: 0.86, d: 0.75 }, { x: 0.5, d: 1.0 }];

// ──────────────────────────────────────────────────────────────────────────
// CoolerScene — side cut-away of the pot-in-pot cooler, assembled progressively.
// Preserved from the original tool (verified art) — driven by built/sandWet/coverWet/temp/running.
// ──────────────────────────────────────────────────────────────────────────
const CoolerScene: React.FC<{ built: number; sandWet: number; coverWet: number; temp: number; running: boolean; width: number; pulse?: boolean; }> = ({ built, sandWet, coverWet, temp, running, width, pulse }) => {
  const W = width;
  const H = Math.round(width * 0.92);
  const has = (i: number) => built > i;

  const oTop = H * 0.16, oBot = H * 0.90;
  const oxL = W * 0.12, oxR = W * 0.88;
  const oInL = oxL + W * 0.05, oInR = oxR - W * 0.05;
  const wallTop = oTop + H * 0.02;
  const outerPath = `M ${oxL} ${oTop} L ${oxR} ${oTop} L ${oxR - W * 0.03} ${oBot} Q ${oxR - W * 0.03} ${oBot + H * 0.03} ${oxR - W * 0.09} ${oBot + H * 0.03} L ${oxL + W * 0.09} ${oBot + H * 0.03} Q ${oxL + W * 0.03} ${oBot + H * 0.03} ${oxL + W * 0.03} ${oBot} Z`;
  const innerCavTop = wallTop + H * 0.02;
  const innerCavBot = oBot - H * 0.02;
  const baseSandTop = innerCavBot - H * 0.14;
  const sH = H * 0.40;
  const syTop = baseSandTop - sH;
  const sxL = W * 0.33, sxR = W * 0.67;
  const fillSandTop = syTop + sH * 0.20;
  const sandCol = mix(DS.c.sandDry, DS.c.sandWet, has(4) ? sandWet : 0);
  const coverCol = mix(DS.c.cover, DS.c.coverWet, has(5) ? coverWet : 0);
  const moist = effMoisture(has(4) ? sandWet : 0, has(5) ? coverWet : 0);
  const coolFrac = clamp((T_ROOM - temp) / (DT_BASE + DTMAX_EFF), 0, 1);
  const insideTint = mix('#FBF6EC', DS.c.water, coolFrac * 0.55);
  const T_SCALE_LO = 18, T_SCALE_HI = 34;
  const thX = (sxL + sxR) / 2;
  const thTop = syTop + sH * 0.14, thBot = syTop + sH * 0.52;
  const bulbR = W * 0.022;
  const mercFrac = clamp((temp - T_SCALE_LO) / (T_SCALE_HI - T_SCALE_LO), 0, 1);
  const mercTop = thBot - (thBot - thTop) * mercFrac;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', borderRadius: DS.r.lg, background: 'linear-gradient(180deg,#FBFBFE,#F3EFE6)', outline: pulse ? `3px solid ${DS.c.accent}` : 'none', animation: pulse ? 'pc_pointerGlow 1.1s ease-in-out 2' : undefined }}>
      <defs>
        <linearGradient id="pc_clay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={DS.c.clayLight} /><stop offset="1" stopColor={DS.c.clayDark} /></linearGradient>
        <clipPath id="pc_outerClip"><path d={outerPath} /></clipPath>
      </defs>
      <rect x="0" y={oBot + H * 0.03} width={W} height={H - (oBot + H * 0.03)} fill="#E7E2D6" />
      {has(4) && moist > 0.05 && (
        <g opacity={clamp(moist, 0, 1)}>
          {WISPS.map((p, i) => (
            <path key={i} d={`M ${oxL + p.x * (oxR - oxL)} ${oTop - 2} q ${W * 0.02} ${-H * 0.04} 0 ${-H * 0.08} q ${-W * 0.02} ${-H * 0.04} 0 ${-H * 0.08}`}
              fill="none" stroke={mix('#CFE6F2', DS.c.water, 0.3)} strokeWidth={2.5} strokeLinecap="round"
              opacity={running ? undefined : 0.35}
              style={running ? { animation: `pc_rise ${1.8 + p.x}s ease-out ${p.d}s infinite` } : undefined} />
          ))}
        </g>
      )}
      {has(0) && (
        <g style={{ animation: 'pc_dropIn .45s both' }}>
          <path d={outerPath} fill="url(#pc_clay)" stroke={DS.c.clayDark} strokeWidth="3" />
          <path d={`M ${oInL} ${innerCavTop} L ${oInR} ${innerCavTop} L ${oInR - W * 0.02} ${innerCavBot} L ${oInL + W * 0.02} ${innerCavBot} Z`} fill={mix(DS.c.clay, '#000', 0.12)} opacity="0.55" />
          <ellipse cx={(oxL + oxR) / 2} cy={oTop} rx={(oxR - oxL) / 2} ry={H * 0.022} fill={DS.c.clayLight} stroke={DS.c.clayDark} strokeWidth="2.5" />
        </g>
      )}
      <g clipPath="url(#pc_outerClip)">
        {has(1) && <rect x={oInL - W * 0.02} y={baseSandTop} width={(oInR - oInL) + W * 0.04} height={innerCavBot - baseSandTop} fill={sandCol} style={{ animation: 'pc_dropIn .4s both', transition: 'fill .5s ease' }} />}
        {has(3) && <rect x={oInL - W * 0.02} y={fillSandTop} width={(oInR - oInL) + W * 0.04} height={baseSandTop - fillSandTop} fill={sandCol} style={{ animation: 'pc_dropIn .4s both', transition: 'fill .5s ease' }} />}
        {has(4) && sandWet > 0.05 && <rect x={oInL - W * 0.02} y={fillSandTop} width={(oInR - oInL) + W * 0.04} height={innerCavBot - fillSandTop} fill={DS.c.water} opacity={0.12 + sandWet * 0.16} style={{ transition: 'opacity .4s ease' }} />}
      </g>
      {has(2) && (
        <g style={{ animation: 'pc_dropIn .45s both' }}>
          <path d={`M ${sxL + W * 0.012} ${syTop + sH * 0.06} L ${sxR - W * 0.012} ${syTop + sH * 0.06} L ${sxR - W * 0.03} ${syTop + sH * 0.94} Q ${sxR - W * 0.03} ${syTop + sH} ${sxR - W * 0.06} ${syTop + sH} L ${sxL + W * 0.06} ${syTop + sH} Q ${sxL + W * 0.03} ${syTop + sH} ${sxL + W * 0.03} ${syTop + sH * 0.94} Z`} fill={insideTint} style={{ transition: 'fill .5s ease' }} />
          <path d={`M ${sxL} ${syTop} L ${sxR} ${syTop} L ${sxR - W * 0.03} ${syTop + sH} Q ${sxR - W * 0.03} ${syTop + sH + H * 0.01} ${sxR - W * 0.07} ${syTop + sH + H * 0.01} L ${sxL + W * 0.07} ${syTop + sH + H * 0.01} Q ${sxL + W * 0.03} ${syTop + sH + H * 0.01} ${sxL + W * 0.03} ${syTop + sH} Z`} fill="none" stroke={DS.c.clayDark} strokeWidth="3" />
          {(() => {
            const cavL = sxL + W * 0.018, cavR = sxR - W * 0.018;
            const cavW = cavR - cavL;
            const r = cavW * 0.105;
            const tomato = (cx: number, cy: number, rad: number) => (
              <g key={`t${cx.toFixed(0)}${cy.toFixed(0)}`}>
                <circle cx={cx} cy={cy} r={rad} fill="#D7402E" stroke="#9E2A1E" strokeWidth="1.4" />
                <path d={`M ${cx} ${cy - rad * 0.85} l ${-rad * 0.22} ${-rad * 0.2} m ${rad * 0.22} ${rad * 0.2} l ${rad * 0.22} ${-rad * 0.2}`} stroke="#3E8C4F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <ellipse cx={cx - rad * 0.3} cy={cy - rad * 0.3} rx={rad * 0.25} ry={rad * 0.16} fill="#fff" opacity="0.35" />
              </g>
            );
            const cabbage = (cx: number, cy: number, rad: number) => (
              <g key={`c${cx.toFixed(0)}${cy.toFixed(0)}`}>
                <circle cx={cx} cy={cy} r={rad} fill="#5BB36A" stroke="#3E8C4F" strokeWidth="1.4" />
                <path d={`M ${cx} ${cy - rad * 0.95} q ${-rad * 0.45} ${rad * 0.35} 0 ${rad * 0.7} q ${rad * 0.45} ${-rad * 0.35} 0 ${-rad * 0.7}`} fill="#7BCB86" opacity="0.75" />
                <path d={`M ${cx - rad * 0.5} ${cy} q ${rad * 0.5} ${rad * 0.4} ${rad} 0`} stroke="#3E8C4F" strokeWidth="1.2" fill="none" opacity="0.6" />
              </g>
            );
            const carrot = (cx: number, cy: number, rad: number) => (
              <g key={`r${cx.toFixed(0)}${cy.toFixed(0)}`}>
                <path d={`M ${cx} ${cy - rad} l ${rad * 0.55} ${rad * 1.7} l ${rad * 0.3} ${-rad * 0.16} Z`} fill="#F08A24" stroke="#C96E12" strokeWidth="1.1" />
                <path d={`M ${cx} ${cy - rad} l ${-rad * 0.22} ${-rad * 0.34} m ${rad * 0.22} ${rad * 0.34} l ${rad * 0.05} ${-rad * 0.42} m ${-rad * 0.05} ${rad * 0.42} l ${rad * 0.24} ${-rad * 0.28}`} stroke="#3E8C4F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </g>
            );
            const lemon = (cx: number, cy: number, rad: number) => (<ellipse key={`l${cx.toFixed(0)}${cy.toFixed(0)}`} cx={cx} cy={cy} rx={rad * 1.05} ry={rad * 0.78} fill="#F5D33A" stroke="#D8B021" strokeWidth="1.3" />);
            const brinjal = (cx: number, cy: number, rad: number) => (
              <g key={`b${cx.toFixed(0)}${cy.toFixed(0)}`}>
                <ellipse cx={cx} cy={cy} rx={rad * 0.7} ry={rad * 1.05} fill="#7B3FA0" stroke="#5A2C77" strokeWidth="1.3" />
                <path d={`M ${cx} ${cy - rad * 1.0} q ${-rad * 0.3} ${-rad * 0.2} 0 ${-rad * 0.35} q ${rad * 0.3} ${rad * 0.15} 0 ${rad * 0.35}`} fill="#3E8C4F" />
              </g>
            );
            const KINDS = [cabbage, tomato, brinjal, lemon, carrot, tomato, cabbage, lemon, carrot, brinjal];
            const rowYs = [syTop + sH * 0.50, syTop + sH * 0.70, syTop + sH * 0.90];
            const items: React.ReactNode[] = []; let k = 0;
            rowYs.forEach((ry, ri) => {
              const off = ri % 2 ? 0.5 / 5 : 0; const n = 5;
              for (let i = 0; i < n; i++) {
                const cx = cavL + cavW * ((i + 0.5) / n + off * (i < n - 1 ? 1 : 0));
                const fn = KINDS[k % KINDS.length];
                const rad = r * (0.92 + 0.12 * ((i + ri) % 2));
                items.push(<React.Fragment key={`p${ri}_${i}`}>{fn(cx, ry, rad)}</React.Fragment>);
                k++;
              }
            });
            return <g>{items}</g>;
          })()}
          <ellipse cx={thX} cy={syTop} rx={(sxR - sxL) / 2} ry={H * 0.016} fill={DS.c.clayLight} stroke={DS.c.clayDark} strokeWidth="2" />
          <g>
            <rect x={thX - bulbR * 0.5} y={thTop} width={bulbR} height={thBot - thTop} rx={bulbR * 0.5} fill="#fff" stroke={DS.c.gray400} strokeWidth="1.5" />
            <rect x={thX - bulbR * 0.28} y={mercTop} width={bulbR * 0.56} height={thBot - mercTop} fill={mix(DS.c.coolBlue, DS.c.mercury, mercFrac)} rx={bulbR * 0.28} style={{ transition: 'y .25s linear, fill .4s ease' }} />
            <circle cx={thX} cy={thBot + bulbR * 0.4} r={bulbR * 0.95} fill={mix(DS.c.coolBlue, DS.c.mercury, mercFrac)} stroke={DS.c.gray400} strokeWidth="1.5" style={{ transition: 'fill .4s ease' }} />
            <text x={thX + bulbR * 1.6} y={thTop + (thBot - thTop) * 0.3} fontFamily={DS.font} fontWeight="800" fontSize={W * 0.05} fill={mix(DS.c.coolBlue, DS.c.gray900, 0.2)} style={{ transition: 'fill .4s ease' }}>{temp.toFixed(1)}°C</text>
            {coolFrac > 0.25 && <g style={{ animation: 'pc_popIn .4s both' }}><Snowflake size={W * 0.04} color={DS.c.coolBlue} style={{ transform: `translate(${thX + bulbR * 2.6}px, ${thTop - H * 0.01}px)` }} /></g>}
          </g>
        </g>
      )}
      {has(5) && (
        <g style={{ animation: 'pc_dropIn .4s both' }}>
          <ellipse cx={thX} cy={syTop - H * 0.005} rx={(sxR - sxL) / 2 + W * 0.02} ry={H * 0.022} fill={coverCol} stroke={mix(coverCol, '#000', 0.25)} strokeWidth="2" style={{ transition: 'fill .5s ease' }} />
          <line x1={sxL - W * 0.01} y1={syTop - H * 0.005} x2={sxR + W * 0.01} y2={syTop - H * 0.005} stroke={mix(coverCol, '#fff', 0.3)} strokeWidth="1" opacity="0.6" />
          {coverWet > 0.4 && <circle cx={sxR + W * 0.01} cy={syTop + H * 0.02} r={W * 0.008} fill={DS.c.water} opacity="0.7" />}
        </g>
      )}
    </svg>
  );
};

// ==================== RESPONSIVE / CONTAINER-SIZE HOOK ====================
const useContainerSize = (ref: React.RefObject<HTMLElement>) => {
  const [size, setSize] = useState({ w: 900, h: 560 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setSize({ w: r.width || 900, h: r.height || 560 }); };
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(el); }
    window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
  return size;
};

// ==================== FINISH OVERLAY (full-screen, §6.3/§7.4) ====================
const FinishOverlay: React.FC<{
  show: boolean; stars: number; dropAchieved: number; predictCorrect: boolean; learned: string[]; dark?: boolean;
}> = ({ show, stars, dropAchieved, predictCorrect, learned, dark }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  useEffect(() => {
    if (!show) { setShowConfetti(false); return; }
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 2600);
    return () => clearTimeout(t);
  }, [show]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: dark ? 'rgba(10,10,20,0.82)' : 'rgba(20,20,40,0.55)', backdropFilter: 'blur(4px)',
            pointerEvents: 'auto', boxSizing: 'border-box', padding: 'clamp(12px, 3vh, 28px)',
          }}
        >
          {showConfetti && <ConfettiBurst count={90} duration={2200} />}
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.08 }}
            style={{
              position: 'relative', zIndex: 6, width: 'min(94vw, 460px)', maxHeight: '92%', overflowY: 'auto',
              background: dark ? DS.cDark.surface : '#fff', borderRadius: DS.r.xl, boxShadow: DS.sh.xl,
              padding: 'clamp(16px,3vh,26px) clamp(16px,3vw,26px)', textAlign: 'center', boxSizing: 'border-box',
            }}
          >
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.2 }}>
              <Award size={46} color={DS.c.accent} />
            </motion.div>
            <StarsRow count={stars} stagger={180} />
            <div style={{ fontFamily: DS.font, fontWeight: 800, fontSize: 26, color: dark ? DS.cDark.text : DS.c.primaryDark, margin: '4px 0 2px' }}>
              {stars >= 3 ? 'Excellent work!' : stars === 2 ? 'Nice job!' : 'Good try!'}
            </div>
            <div style={{ fontFamily: DS.font, fontSize: 14, color: dark ? DS.cDark.textDim : DS.c.gray700, marginBottom: 14 }}>
              Your cooler dropped the inside temperature by <b>{dropAchieved.toFixed(1)}°C</b> — {predictCorrect ? 'and your prediction was spot on.' : 'a good result to compare with your prediction.'}
            </div>
            <div style={{ textAlign: 'left', background: dark ? DS.cDark.surfaceAlt : DS.c.gray100, borderRadius: DS.r.lg, padding: '12px 14px', marginBottom: 4 }}>
              <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 13.5, color: dark ? DS.cDark.text : DS.c.gray900, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkle size={15} color={DS.c.accent} /> What you have learned
              </div>
              {learned.map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                  style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0', fontFamily: DS.font, fontSize: 12.5, color: dark ? DS.cDark.textDim : DS.c.gray700, lineHeight: 1.4 }}>
                  <Check size={14} strokeWidth={3} color={DS.c.success} style={{ marginTop: 1, flexShrink: 0 }} /> {l}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ==================== PROPS ====================
interface ToolProps {
  operatorMode?: 'ai' | 'student';
  showModeToggle?: boolean;
  themeColor?: string;
  darkMode?: boolean;
  device?: 'mobile' | 'smartboard' | 'web';
  seed?: number;
  muted?: boolean;
  // legacy no-op props kept harmless for backward compatibility (not part of the new contract)
  setStepDetails?: (s: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

type Stage = 'build' | 'predict' | 'observe' | 'summary';
type Predict = 'cooler' | 'same' | 'warmer';

// ==================== MAIN COMPONENT ====================
const PotCoolerBuilder: React.FC<ToolProps> = (props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w: contW, h: contH } = useContainerSize(rootRef);
  const isCompact = contH < 480;             // Mobile App 844×390 frame — tightest
  const isBoard = contH >= 900;              // Smart Board 1920×1080 — fill, don't sparse
  const device = props.device ?? (isBoard ? 'smartboard' : contW < 700 ? 'mobile' : 'web');
  const touchMin = device === 'smartboard' ? 60 : device === 'mobile' ? 24 : 44;
  const ctaMinH = isBoard ? 58 : isCompact ? 44 : 50;
  const bodyFont = isBoard ? 17 : isCompact ? 13 : 15;
  const dark = !!props.darkMode;
  const accent = props.themeColor || DS.c.accent;

  const bg = dark ? `linear-gradient(180deg, ${DS.cDark.bg0}, ${DS.cDark.bg1})` : 'linear-gradient(180deg,#FDFBF6,#F3EFE6)';
  const surface = dark ? DS.cDark.surface : '#fff';
  const textMain = dark ? DS.cDark.text : DS.c.gray900;
  const textDim = dark ? DS.cDark.textDim : DS.c.gray700;
  const border = dark ? DS.cDark.border : DS.c.gray200;

  // ── mode + depth (§6.1/§6.2) ──
  const [mode, setMode] = useState<'ai' | 'student'>(props.operatorMode ?? 'student');
  const depth: 'lean' | 'full' = mode === 'ai' ? 'lean' : 'full';
  const showModeToggle = props.showModeToggle ?? true;

  // ── sound ──
  const mutedRef = useRef<boolean>(!!props.muted);
  const [mutedUi, setMutedUi] = useState(!!props.muted);
  const playCue = useSoundEngine(mutedRef);

  // ── flow state ──
  const [stage, setStage] = useState<Stage>('build');
  const [built, setBuilt] = useState(0);
  const [predict, setPredict] = useState<Predict | null>(null);
  const [hours, setHours] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [scoreShown, setScoreShown] = useState(0);
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const highlightTimer = useRef<number | null>(null);

  // ── interaction telemetry for the finish summary ──
  const startTimeRef = useRef<number>(Date.now());
  const attemptsRef = useRef(0);
  const hintsUsedRef = useRef(0);
  const exploredRef = useRef<Set<string>>(new Set());

  const sandWet = built >= 5 ? SAND_WET : 0;   // step 5 = pour_water (index 4)
  const coverWet = built >= 6 ? COVER_WET : 0; // step 6 = cover (index 5)
  const temp = insideTemp(hours, sandWet, coverWet);
  const moist = effMoisture(sandWet, coverWet);
  const predictCorrect = predict === CORRECT_PREDICTION;
  const finalTemp = insideTemp(RUN_HOURS, SAND_WET, COVER_WET);
  const dropAchieved = T_ROOM - finalTemp;

  const summaryStars = useMemo(() => {
    let s = 1;
    if (predictCorrect) s += 1;
    if (T_ROOM - temp >= 8) s += 1;
    return clamp(s, 1, 3);
  }, [predictCorrect, temp]);

  // ⭐ always-fresh mirror of state — agent commands read this, never a stale closure
  const stateRef = useRef<any>(null);
  useEffect(() => {
    stateRef.current = { stage, built, predict, hours, running, finished, sandWet, coverWet, temp, moist, predictCorrect, summaryStars, operatorMode: mode, depth };
  });

  // ── time playback ──
  const stopClock = useCallback(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; lastTsRef.current = null; }, []);
  const tickClock = useCallback((now: number) => {
    if (lastTsRef.current == null) lastTsRef.current = now;
    const dtSec = (now - lastTsRef.current) / 1000;
    lastTsRef.current = now;
    let done = false;
    setHours((h) => {
      const simPerSec = RUN_HOURS / 8; // ~8 real seconds for the full 5-hour run
      const nh = h + dtSec * simPerSec;
      if (nh >= RUN_HOURS) { done = true; setRunning(false); emit({ type: 'event', name: 'run_completed', detail: { hours: RUN_HOURS, temp: insideTemp(RUN_HOURS, sandWet, coverWet) } }); return RUN_HOURS; }
      return nh;
    });
    rafRef.current = done ? null : requestAnimationFrame(tickClock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandWet, coverWet]);
  useEffect(() => {
    if (running) { lastTsRef.current = null; rafRef.current = requestAnimationFrame(tickClock); }
    else stopClock();
    return stopClock;
  }, [running, tickClock, stopClock]);
  useEffect(() => () => stopClock(), [stopClock]);

  // ── inject keyframes once ──
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'pc-keyframes-v2';
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('pc-keyframes-v2'); if (e) e.remove(); };
  }, []);

  // ── score count-up on reaching summary ──
  useEffect(() => {
    if (stage !== 'summary') return;
    setScoreShown(0);
    const start = performance.now(); const dur = 850; let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setScoreShown(Math.round(easeOutCubic(p) * summaryStars));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, summaryStars]);

  // ── mode + highlight helpers ──
  const applyMode = useCallback((m: 'ai' | 'student') => {
    setMode(m);
    emit({ type: 'event', name: 'operator_mode_changed', detail: { mode: m, depth: m === 'ai' ? 'lean' : 'full' } });
  }, []);

  const doHighlight = useCallback((target: string) => {
    hintsUsedRef.current += 1;
    setHighlightTarget(target);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightTarget(null), 1600) as any as number;
  }, []);

  // ── stage-gate helpers ──
  const buildDone = built >= STEP_COUNT;
  const canAdvanceFrom = (s: Stage) => (s === 'build' ? buildDone : s === 'predict' ? predict != null : s === 'observe' ? hours > 0.6 : false);

  // ── tool-specific actions (used by BOTH student clicks and agent commands) ──
  const doPlaceStep = useCallback((stepId: string) => {
    const cur = stateRef.current;
    const idx = BUILD_STEPS.findIndex((s) => s.id === stepId);
    if (idx === -1 || idx !== cur.built) return; // idempotent-safe: only the NEXT expected step advances
    attemptsRef.current += 1;
    exploredRef.current.add(stepId);
    const nb = idx + 1;
    setBuilt(nb);
    playCue('tap');
    emit({ type: 'event', name: 'step_placed', detail: { stepId, built: nb, total: STEP_COUNT } });
    if (nb >= STEP_COUNT) { playCue('chime'); emit({ type: 'event', name: 'build_completed', detail: { built: nb } }); }
  }, [playCue]);

  const doUndoStep = useCallback(() => {
    const cur = stateRef.current;
    if (cur.built <= 0) return;
    const removedId = BUILD_STEPS[cur.built - 1].id;
    setBuilt((b) => Math.max(0, b - 1));
    playCue('tap');
    emit({ type: 'event', name: 'step_undone', detail: { stepId: removedId, built: cur.built - 1 } });
  }, [playCue]);

  const doSetPredict = useCallback((predictionId: string) => {
    const cur = stateRef.current;
    if (!['cooler', 'same', 'warmer'].includes(predictionId)) return;
    if (cur.stage !== 'predict') return; // only meaningful on the predict screen (matches student UI)
    attemptsRef.current += 1;
    setPredict(predictionId as Predict);
    playCue('tap');
    emit({ type: 'event', name: 'prediction_made', detail: { prediction: predictionId, correct: predictionId === CORRECT_PREDICTION } });
  }, [playCue]);

  const doScrub = useCallback((h: number) => {
    const cur = stateRef.current;
    if (cur.stage !== 'observe') return;
    const nh = clamp(h, 0, RUN_HOURS);
    setRunning(false);
    setHours(nh);
    emit({ type: 'event', name: 'time_scrubbed', detail: { hours: nh, temp: insideTemp(nh, cur.sandWet, cur.coverWet) } });
  }, []);

  const doPlay = useCallback(() => {
    const cur = stateRef.current;
    if (cur.stage !== 'observe') return;
    if (cur.hours >= RUN_HOURS - 1e-3) { setHours(0); }
    setRunning(true);
    emit({ type: 'event', name: 'run_started', detail: { fromHours: cur.hours >= RUN_HOURS - 1e-3 ? 0 : cur.hours } });
  }, []);
  const doPause = useCallback(() => {
    if (stateRef.current.stage !== 'observe') return;
    setRunning(false);
    emit({ type: 'event', name: 'run_paused', detail: { hours: stateRef.current.hours } });
  }, []);

  const goStage = useCallback((next: Stage) => {
    setStage(next);
    emit({ type: 'event', name: 'stage_changed', detail: { stage: next } });
  }, []);
  const doAdvance = useCallback(() => {
    const cur: Stage = stateRef.current.stage;
    if (!canAdvanceFrom(cur)) return;
    if (cur === 'build') goStage('predict');
    else if (cur === 'predict') { setRunning(false); setHours(0); goStage('observe'); }
    else if (cur === 'observe') { setRunning(false); goStage('summary'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goStage, built, predict, hours]);
  const doBack = useCallback(() => {
    const cur: Stage = stateRef.current.stage;
    if (cur === 'predict') goStage('build');
    else if (cur === 'observe') { setRunning(false); goStage('predict'); }
    else if (cur === 'summary') goStage('observe');
  }, [goStage]);

  const doReset = useCallback(() => {
    stopClock();
    setStage('build'); setBuilt(0); setPredict(null); setHours(0); setRunning(false); setFinished(false); setScoreShown(0);
    attemptsRef.current = 0; hintsUsedRef.current = 0; exploredRef.current = new Set(); startTimeRef.current = Date.now();
    emit({ type: 'event', name: 'reset', detail: {} });
  }, [stopClock]);

  const doFinish = useCallback(() => {
    const cur = stateRef.current;
    if (cur.stage !== 'summary' || cur.finished) return;
    setFinished(true);
    playCue('fanfare');
    const detail = {
      evaluated: true,
      score: (cur.predictCorrect ? 1 : 0) + (T_ROOM - cur.temp >= 8 ? 1 : 0),
      total: 2,
      stars: cur.summaryStars,
      breakdown: [
        { id: 'prediction', correct: cur.predictCorrect, chose: cur.predict },
        { id: 'cooling_drop', correct: (T_ROOM - cur.temp) >= 8, value: Number((T_ROOM - cur.temp).toFixed(1)) },
      ],
      interactions: {
        attempts: attemptsRef.current, correctFirstTry: cur.predictCorrect ? 1 : 0, hintsUsed: hintsUsedRef.current,
        itemsExplored: Array.from(exploredRef.current), durationMs: Date.now() - startTimeRef.current,
      },
      learned: LEARNED_POINTS,
    };
    emit({ type: 'event', name: 'finished', detail });
  }, [playCue]);

  // ── the agent API: every windowMethod in the JSON lives here ──
  const api = {
    setParam: (n: string, v: any) => {
      if (n === 'muted') { mutedRef.current = !!v; setMutedUi(!!v); }
      else if (n === 'operatorMode') applyMode(v === 'ai' ? 'ai' : 'student');
    },
    play: doPlay,
    pause: doPause,
    reset: doReset,
    highlight: doHighlight,
    getState: () => { emit({ type: 'state', state: stateRef.current }); return stateRef.current; },
    setOperatorMode: (m: string) => applyMode(m === 'ai' ? 'ai' : 'student'),
    placeStep: doPlaceStep,
    undoStep: doUndoStep,
    setPredict: doSetPredict,
    scrub: doScrub,
    advance: doAdvance,
    back: doBack,
    finish: doFinish,
  };
  const apiRef = useRef(api); apiRef.current = api;

  // ── the command listener + the REQUIRED ready signal ──
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== 'command') return;
      const fn = (apiRef.current as any)[d.method];
      let result: any;
      try { if (typeof fn === 'function') result = fn(...(d.args || [])); } catch { /* never throw out of the handler */ }
      emit({ type: 'response', id: d.id, result });
    };
    window.addEventListener('message', onMsg);
    emit({ type: 'ready', toolId: TOOL_ID });
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // ── keep in sync if the host changes the mode via props ──
  useEffect(() => { if (props.operatorMode && props.operatorMode !== mode) setMode(props.operatorMode); }, [props.operatorMode]); // eslint-disable-line

  // ==================== LAYOUT / RENDER ====================
  const sceneW = clamp(Math.min(contW * (isCompact ? 0.42 : 0.46), isBoard ? 480 : 380), 150, isBoard ? 480 : 380);
  const gap = isCompact ? 10 : isBoard ? 22 : 16;
  const pad = isCompact ? '8px 12px' : isBoard ? '22px 34px' : '16px 22px';

  const sectionTitle = (txt: string) => (
    <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: isBoard ? 22 : isCompact ? 15 : 18, color: textMain, marginBottom: 3 }}>{txt}</div>
  );

  const highlightRing = (name: string): React.CSSProperties => highlightTarget === name
    ? { animation: 'pc_pointerGlow 1.1s ease-in-out 2', outline: `2.5px solid ${accent}`, outlineOffset: 2, borderRadius: DS.r.md }
    : {};

  const scene = (
    <div style={{ background: dark ? DS.cDark.surfaceAlt : DS.c.gray100, borderRadius: DS.r.xl, padding: isCompact ? 8 : 14, display: 'flex', justifyContent: 'center', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: sceneW }}>
        <CoolerScene built={built} sandWet={sandWet} coverWet={coverWet} temp={temp} running={running} width={sceneW} pulse={highlightTarget === 'scene' || highlightTarget === 'thermometer'} />
      </div>
    </div>
  );

  const watchCaption = mode === 'ai' && (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      style={{ fontFamily: DS.font, fontSize: isCompact ? 11 : 12.5, fontWeight: 600, color: dark ? DS.cDark.textDim : DS.c.primaryDark, background: dark ? 'rgba(255,255,255,0.06)' : DS.c.primaryGhost, borderRadius: DS.r.pill, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      👩‍🏫 Your teacher is showing you this — watch, you'll get a turn
    </motion.div>
  );

  // ---------- BUILD ----------
  const renderBuild = () => {
    const step = BUILD_STEPS[Math.min(built, STEP_COUNT - 1)];
    return (
      <motion.div key="build" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.32 }}>
        {watchCaption}
        {sectionTitle(buildDone ? 'Your cooler is built!' : `Build step ${built + 1} of ${STEP_COUNT}`)}
        {!isCompact && <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: textDim, marginBottom: 10, lineHeight: 1.4 }}>{buildDone ? 'Every part is in place, with water poured into the sand. Predict what happens to the temperature inside.' : step.caption}</div>}
        <div style={{ display: 'flex', gap, flexDirection: 'row', alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 auto', width: sceneW }}>{scene}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {depth === 'full' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 4 : 7 }}>
                {BUILD_STEPS.map((s, i) => {
                  const placed = built > i; const isNext = built === i;
                  return (
                    <motion.div key={s.id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: isCompact ? '5px 8px' : '7px 11px', borderRadius: DS.r.md, boxSizing: 'border-box',
                        border: `2px solid ${placed ? DS.c.success : isNext ? accent : border}`, background: placed ? (dark ? 'rgba(46,204,113,0.10)' : '#EAFBF1') : isNext ? (dark ? 'rgba(255,114,18,0.10)' : DS.c.accentLight) : surface,
                        animation: isNext ? 'pc_pulse 1.6s ease-in-out infinite' : undefined, ...(isNext ? highlightRing('checklist') : {}) }}>
                      <div style={{ width: 21, height: 21, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: placed ? DS.c.success : isNext ? accent : DS.c.gray400, color: '#fff', fontWeight: 800, fontSize: 11 }}>
                        {placed ? <Check size={13} strokeWidth={3} color="#fff" /> : i + 1}
                      </div>
                      <span style={{ flex: 1, minWidth: 0, fontFamily: DS.font, fontSize: isCompact ? 11.5 : bodyFont - 2, fontWeight: isNext ? 700 : 500, color: textMain }}>{s.title}</span>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {BUILD_STEPS.map((s, i) => (
                  <div key={s.id} style={{ width: 12, height: 12, borderRadius: '50%', background: built > i ? DS.c.success : built === i ? accent : border, animation: built === i ? 'pc_breathe 1.4s ease-in-out infinite' : undefined }} />
                ))}
                <span style={{ marginLeft: 6, fontFamily: DS.font, fontSize: 12, color: textDim, fontWeight: 600 }}>{built}/{STEP_COUNT}</span>
              </div>
            )}
          </div>
        </div>
        {mode === 'student' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: isCompact ? 10 : 16, gap: 10, flexWrap: 'wrap' }}>
            <PillButton label="Undo" variant="ghost" color={textDim} icon={<ChevronLeft size={18} />} disabled={built === 0} onClick={doUndoStep} minH={ctaMinH} dark={dark} />
            {!buildDone
              ? <PillButton label={`Add: ${step.title}`} color={accent} icon={<ChevronRight size={18} />} onClick={() => doPlaceStep(step.id)} minH={Math.max(ctaMinH, touchMin)} fontSize={bodyFont} />
              : <PillButton label="Predict the result →" color={accent} icon={<ChevronRight size={18} />} onClick={doAdvance} minH={Math.max(ctaMinH, touchMin)} fontSize={bodyFont + 1} />}
          </div>
        )}
      </motion.div>
    );
  };

  // ---------- PREDICT ----------
  const renderPredict = () => (
    <motion.div key="predict" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.32 }}>
      {watchCaption}
      {sectionTitle('Predict first')}
      {!isCompact && <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: textDim, marginBottom: 10, lineHeight: 1.4 }}>Before running time: once the cooler sits for a few hours, what happens to the temperature inside the small pot?</div>}
      <div style={{ display: 'flex', gap, alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 auto', width: sceneW }}>{scene}</div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: isCompact ? 'row' : 'column', gap: 8, flexWrap: 'wrap' }}>
          {PREDICT_OPTIONS.map(({ id, label, icon }) => {
            const sel = predict === id;
            return (
              <motion.button key={id} whileTap={{ scale: 0.95 }} onClick={() => mode === 'student' && doSetPredict(id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  minHeight: Math.max(ctaMinH - 4, touchMin), padding: '0 12px', borderRadius: DS.r.md, fontFamily: DS.font, fontWeight: 700,
                  fontSize: isCompact ? 11.5 : bodyFont - 1, cursor: mode === 'student' ? 'pointer' : 'default', border: `2px solid ${sel ? DS.c.primary : border}`,
                  background: sel ? DS.c.primaryGhost : surface, color: textMain, boxSizing: 'border-box',
                  ...highlightRing('predictOptions'),
                }}>
                {icon}{label}
              </motion.button>
            );
          })}
        </div>
      </div>
      {mode === 'student' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: isCompact ? 10 : 16, gap: 10, flexWrap: 'wrap' }}>
          <PillButton label="Back" variant="ghost" color={textDim} icon={<ChevronLeft size={18} />} onClick={doBack} minH={ctaMinH} dark={dark} />
          <PillButton label="Run time & watch →" color={accent} icon={<Play size={16} />} disabled={!predict} onClick={doAdvance} minH={Math.max(ctaMinH, touchMin)} fontSize={bodyFont + 1} />
        </div>
      )}
      {mode === 'student' && !predict && !isCompact && <div style={{ textAlign: 'center', marginTop: 6, fontFamily: DS.font, fontSize: 11.5, color: DS.c.gray400 }}>Pick a prediction to continue</div>}
    </motion.div>
  );

  // ---------- OBSERVE ----------
  const renderObserve = () => {
    const isFinishedRun = hours >= RUN_HOURS - 1e-3;
    const dropped = T_ROOM - temp;
    const verdict = `The inside fell about ${dropped.toFixed(1)}°C as water evaporated from the moist sand and cover — that is evaporative cooling!`;
    return (
      <motion.div key="observe" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.32 }}>
        {watchCaption}
        {sectionTitle('Run time & watch the thermometer')}
        {!isCompact && <div style={{ fontFamily: DS.font, fontSize: bodyFont, color: textDim, marginBottom: 10, lineHeight: 1.4 }}>Press Play to let a few hours pass. Watch the inside thermometer as water evaporates from the sand.</div>}
        <div style={{ display: 'flex', gap, alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 auto', width: sceneW }}>{scene}</div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: isCompact ? 8 : 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isCompact ? 8 : 12, borderRadius: DS.r.lg, background: mix(dark ? DS.cDark.surfaceAlt : '#EAF4FB', DS.c.water, clamp((T_ROOM - temp) / (DT_BASE + DTMAX_EFF), 0, 1) * 0.35), boxShadow: DS.sh.sm, boxSizing: 'border-box' }}>
              <ThermometerIcon size={isCompact ? 22 : 28} color={DS.c.mercury} />
              <div>
                <motion.div key={temp.toFixed(1)} initial={{ scale: 1.15 }} animate={{ scale: 1 }} style={{ fontFamily: DS.font, fontWeight: 800, fontSize: isCompact ? 22 : 28, color: DS.c.coolBlue, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{temp.toFixed(1)}°C</motion.div>
                <div style={{ fontFamily: DS.font, fontSize: 11, color: textDim }}>inside · started at {T_ROOM}°C</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right', fontFamily: DS.font }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: textMain }}>{hours.toFixed(1)} h</div>
                <div style={{ fontSize: 10.5, color: textDim }}>elapsed</div>
              </div>
            </div>
            {depth === 'full' && (
              <div style={highlightRing('timeSlider')}>
                <RangeSlider value={hours} min={0} max={RUN_HOURS} step={0.05} onChange={doScrub} leftLabel="0 h" rightLabel={`${RUN_HOURS} h`} valueLabel={`${hours.toFixed(1)} h`} accent={accent} disabled={mode !== 'student'} dark={dark} />
              </div>
            )}
            {mode === 'student' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, ...highlightRing('playButton') }}>
                  <PillButton label={running ? 'Pause' : isFinishedRun ? 'Replay' : 'Play'} color={DS.c.primary} grow icon={running ? <Pause size={16} /> : <Play size={16} />}
                    onClick={() => (running ? doPause() : doPlay())} minH={Math.max(ctaMinH, touchMin)} />
                </div>
                {depth === 'full' && <PillButton label="Reset" variant="outlined" color={textDim} icon={<RotateCcw size={16} />} onClick={() => { setRunning(false); setHours(0); }} minH={ctaMinH} dark={dark} />}
              </div>
            )}
            {!isCompact && (isFinishedRun || hours > 0.6) && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: 10, borderRadius: DS.r.md, background: predictCorrect ? (dark ? 'rgba(46,204,113,0.12)' : '#EAFBF1') : (dark ? 'rgba(255,114,18,0.12)' : DS.c.accentLight), fontFamily: DS.font, fontSize: bodyFont - 2, color: textMain, lineHeight: 1.4 }}>
                {verdict}
              </motion.div>
            )}
          </div>
        </div>
        {mode === 'student' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: isCompact ? 10 : 16, gap: 10, flexWrap: 'wrap' }}>
            <PillButton label="Back" variant="ghost" color={textDim} icon={<ChevronLeft size={18} />} onClick={doBack} minH={ctaMinH} dark={dark} />
            <PillButton label="See what I learned →" color={accent} icon={<Award size={18} />} disabled={hours < 0.6} onClick={doAdvance} minH={Math.max(ctaMinH, touchMin)} fontSize={bodyFont + 1} />
          </div>
        )}
      </motion.div>
    );
  };

  // ---------- SUMMARY ----------
  const renderSummary = () => {
    const wasCorrect = predictCorrect;
    const finalDrop = T_ROOM - finalTemp;
    return (
      <motion.div key="summary" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.32 }} style={{ position: 'relative' }}>
        {watchCaption}
        <div style={{ display: 'flex', gap, alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 auto', width: sceneW }}>{scene}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontFamily: DS.font, fontWeight: 800, fontSize: isBoard ? 40 : isCompact ? 24 : 32, color: dark ? DS.cDark.text : DS.c.primaryDark, lineHeight: 1.05 }}>−{finalDrop.toFixed(1)}°C</div>
              {!isCompact && <div style={{ fontFamily: DS.font, fontSize: bodyFont - 1, color: textDim, marginTop: 2 }}>temperature drop achieved</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: DS.r.md, marginBottom: 8, background: wasCorrect ? (dark ? 'rgba(46,204,113,0.12)' : '#EAFBF1') : (dark ? 'rgba(229,72,77,0.12)' : '#FDECEC'), border: `1px solid ${wasCorrect ? DS.c.success : DS.c.danger}` }}>
              {wasCorrect ? <Check size={18} strokeWidth={3} color={DS.c.success} /> : <XIcon size={18} strokeWidth={3} color={DS.c.danger} />}
              <span style={{ fontFamily: DS.font, fontSize: isCompact ? 11 : bodyFont - 2, color: textMain }}>
                {wasCorrect ? 'You predicted the inside gets cooler — correct! Evaporation carries heat away.' : `You predicted "${predict === 'same' ? 'no change' : 'warmer'}". Moist sand actually cools the inside — evaporation removes heat, it never adds heat.`}
              </span>
            </div>
            {depth === 'full' && !isCompact && (
              <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: DS.r.lg, padding: 12, boxShadow: DS.sh.sm }}>
                <div style={{ fontFamily: DS.font, fontWeight: 700, fontSize: bodyFont - 1, color: textMain, marginBottom: 6 }}>How a pot-in-pot cooler works</div>
                {[['💧', 'Water in the moist sand seeps to the surface of the clay pots.'], ['🌫️', 'That water evaporates into the air.'], ['❄️', 'Evaporation takes heat away, so the inside gets cooler.'], ['🥬', 'It keeps fruits and vegetables fresh — no electricity needed.']].map(([e, t], i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0' }}>
                    <span style={{ fontSize: 15 }}>{e}</span>
                    <span style={{ fontFamily: DS.font, fontSize: isCompact ? 10.5 : bodyFont - 2, color: textDim, lineHeight: 1.35 }}>{t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {mode === 'student' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: isCompact ? 10 : 16 }}>
            <PillButton label="Finish" color={DS.c.success} icon={<Award size={18} />} onClick={doFinish} minH={Math.max(ctaMinH, touchMin)} fontSize={bodyFont + 1} grow={isCompact} />
          </div>
        )}
      </motion.div>
    );
  };

  const stageLabels: Record<Stage, string> = { build: 'Build', predict: 'Predict', observe: 'Observe', summary: 'Done' };
  const stageOrder: Stage[] = ['build', 'predict', 'observe', 'summary'];
  const progressFill = (stageOrder.indexOf(stage) + 1) / stageOrder.length;

  return (
    <div ref={rootRef} style={{
      width: '100%', height: '100%', minHeight: isCompact ? 'auto' : '100%', boxSizing: 'border-box',
      fontFamily: DS.font, color: textMain, background: bg, borderRadius: isCompact ? 0 : DS.r.xl, overflow: 'hidden',
      boxShadow: isCompact ? 'none' : DS.sh.lg, display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${DS.c.primaryDark}, ${DS.c.primary} 55%, ${DS.c.accentDark})`, padding: pad, color: '#fff', flexShrink: 0, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Snowflake size={isCompact ? 20 : isBoard ? 30 : 24} color="#fff" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: isCompact ? 14 : isBoard ? 24 : 18, letterSpacing: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Build &amp; Test a Pot-in-Pot Cooler</div>
              {!isCompact && <div style={{ fontSize: isBoard ? 14 : 12, opacity: 0.9, marginTop: 1 }}>Assemble it, wet the sand, and watch evaporation cool the inside</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ fontSize: isCompact ? 10.5 : 12.5, fontWeight: 700, background: 'rgba(255,255,255,0.18)', padding: isCompact ? '4px 9px' : '6px 12px', borderRadius: DS.r.pill, whiteSpace: 'nowrap' }}>{stageLabels[stage]}</div>
            <MuteButton muted={mutedUi} onClick={() => { const v = !mutedUi; mutedRef.current = v; setMutedUi(v); }} />
            {showModeToggle && <div style={highlightRing('modeToggle')}><ModeToggle mode={mode} onChange={applyMode} dark={dark} /></div>}
          </div>
        </div>
      </div>

      {/* progress line */}
      <div style={{ height: 4, background: border, flexShrink: 0 }}>
        <motion.div animate={{ width: `${progressFill * 100}%` }} transition={{ duration: 0.4 }} style={{ height: '100%', background: accent }} />
      </div>

      {/* Body */}
      <div style={{ padding: pad, flex: 1, minHeight: 0, overflow: isCompact ? 'auto' : 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: isBoard ? 'center' : 'flex-start' }}>
        <AnimatePresence mode="wait">
          {stage === 'build' && renderBuild()}
          {stage === 'predict' && renderPredict()}
          {stage === 'observe' && renderObserve()}
          {stage === 'summary' && renderSummary()}
        </AnimatePresence>
      </div>

      <FinishOverlay show={finished} stars={summaryStars} dropAchieved={T_ROOM - finalTemp} predictCorrect={predictCorrect} learned={LEARNED_POINTS} dark={dark} />
    </div>
  );
};

export default PotCoolerBuilder;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════
