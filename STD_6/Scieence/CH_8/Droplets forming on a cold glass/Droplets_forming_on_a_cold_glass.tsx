// ═══════════════════════════════════════════════════════════════════════════
// Droplets forming on a cold glass — condensation time-lapse tool
// File: Droplets_forming_on_a_cold_glass.tsx
// Tool id: condensation_glass_tool  |  Class 6 Science — States of Water
//
// A cold ice-water tumbler is left undisturbed on a table and a several-minute
// time-lapse plays: its dry outer surface slowly nucleates tiny droplets that
// swell, wobble and merge into bigger drops that slide down, while a faint
// condensation haze builds and the ice inside gradually melts. The student can
// scrub, play/pause, reset and "touch" the outer surface to feel that it has
// turned cold and wet — a pure Observe/explore beat, no right-or-wrong answer.
//
// Contract: window.postMessage agent control (§3 of the authoring spec) —
// emits {type:'ready'} on mount, handles {type:'command', id, method, args},
// replies {type:'response', id, result}, and broadcasts {type:'event'/'state'}.
// Implements the Teacher|Student toggle + lean/full content depth (§6.1-6.2)
// and the uniform, non-evaluating Finish flow (§6.3, "What you've noticed").
//
// No external icon/animation libraries — self-contained inline SVG icons and
// pure CSS-keyframe animation, matching this project's other converted tools.
// ═══════════════════════════════════════════════════════════════════════════

declare const React: any;
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ─── Tool identity + outbound messaging ─────────────────────────────────── */
const TOOL_ID = 'condensation_glass_tool';
const emit = (m: any) => {
  try {
    window.parent.postMessage(m, '*');
  } catch {
    /* noop */
  }
};

/* ==================== INLINE ICONS (no external dependency) ==================== */
interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}
const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  style,
  children,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);
const Play: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polygon points="5 3 19 12 5 21 5 3" fill={p.color ?? 'currentColor'} stroke="none" />
  </Icon>
);
const Pause: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <rect x="14" y="4" width="4" height="16" rx="1" fill={p.color ?? 'currentColor'} stroke="none" />
    <rect x="6" y="4" width="4" height="16" rx="1" fill={p.color ?? 'currentColor'} stroke="none" />
  </Icon>
);
const RotateCcw: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);
const Hand: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
    <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </Icon>
);
const Clock: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);
const Droplets: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 4.7 7 2.75c-.29 1.95-1.14 3.6-2.29 4.59C3.57 8.27 3 9.37 3 10.5c0 2.22 1.8 4.05 4 4.05z" />
    <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
  </Icon>
);
const Snowflake: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <line x1="2" x2="22" y1="12" y2="12" />
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="m20 16-4-4 4-4" />
    <path d="m4 8 4 4-4 4" />
    <path d="m16 4-4 4-4-4" />
    <path d="m8 20 4-4 4 4" />
  </Icon>
);
const Eye: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
const Volume2: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={p.color ?? 'currentColor'} stroke="none" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </Icon>
);
const VolumeX: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={p.color ?? 'currentColor'} stroke="none" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </Icon>
);
const Flag: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M4 21V4" />
    <path d="M4 4h13l-2.5 4L17 12H4" />
  </Icon>
);
const Check: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);

/* ==================== TYPES ==================== */
type OperatorMode = 'ai' | 'student';
type Depth = 'lean' | 'full';
type HighlightTarget =
  | 'glass' | 'droplets' | 'ice' | 'surface'
  | 'timeSlider' | 'playButton' | 'touchButton' | 'modeToggle' | 'muteButton' | 'finishButton'
  | null;

interface SharedState {
  elapsedMinutes: number;
  dropletCount: number;
  dropletSize: number;
  surfaceWet: boolean;
  running: boolean;
  touched: boolean;
  operatorMode: OperatorMode;
  depth: Depth;
  muted: boolean;
  finished: boolean;
}

interface AdditionalProps {
  maxMinutes?: number;
  dropletCount?: number;
  iceCubeCount?: number;
  waterColor?: string;
  glassTint?: string;
  startWet?: boolean;
  autoStart?: boolean;
  fullRunSeconds?: number;
  instruction?: string;
}

interface ToolProps {
  props?: {
    themeColor?: string;
    accentColor?: string;
    darkMode?: boolean;
    operatorMode?: OperatorMode;
    muted?: boolean;
    showModeToggle?: boolean;
    device?: 'mobile' | 'smartboard';
    animationSpeed?: number;
    seed?: number;
    additionalProps?: AdditionalProps;
  };
}

/* ==================== HELPERS ==================== */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const makeRng = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

/* the 2-4 short takeaways the finish screen must show (§6.3) — non-evaluating,
   so no score/stars, only the observations the tool is designed to land */
const LEARNED_POINTS = [
  'A surface that starts completely dry can still grow water droplets over time.',
  'Those droplets come from invisible water vapour in the surrounding air, cooling on the cold glass — not from water leaking through the glass.',
  'Tiny droplets merge into bigger drops that slide down once they get heavy enough.',
  'A surface with condensation on it feels both cold and wet to the touch.',
];

/* ==================== GLASS GEOMETRY (SVG viewBox 0 0 400 540) ==================== */
const GLASS = {
  topY: 130,
  bottomY: 480,
  topLeft: 118,
  topRight: 282,
  botLeft: 134,
  botRight: 266,
  waterTopY: 178,
};
const glassPath = `
  M ${GLASS.topLeft} ${GLASS.topY}
  L ${GLASS.botLeft} ${GLASS.bottomY}
  Q ${GLASS.botLeft} ${GLASS.bottomY + 16} ${GLASS.botLeft + 16} ${GLASS.bottomY + 16}
  L ${GLASS.botRight - 16} ${GLASS.bottomY + 16}
  Q ${GLASS.botRight} ${GLASS.bottomY + 16} ${GLASS.botRight} ${GLASS.bottomY}
  L ${GLASS.topRight} ${GLASS.topY}
  Z
`;
const facePoint = (u: number, v: number) => {
  const y = GLASS.topY + v * (GLASS.bottomY - GLASS.topY);
  const left = GLASS.topLeft + v * (GLASS.botLeft - GLASS.topLeft);
  const right = GLASS.topRight + v * (GLASS.botRight - GLASS.topRight);
  const x = left + u * (right - left);
  return { x, y };
};
const faceWidthAt = (v: number) => {
  const left = GLASS.topLeft + v * (GLASS.botLeft - GLASS.topLeft);
  const right = GLASS.topRight + v * (GLASS.botRight - GLASS.topRight);
  return right - left;
};

/* ==================== DESIGN TOKENS (Singularity design system) ==================== */
const fontStack = '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/* ==================== SOUND (Web Audio, lazy, mutable) ==================== */
function useAudio(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = () => {
    if (!ctxRef.current) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };
  const tone = (freq: number, type: OscillatorType, dur: number, delay = 0, vol = 0.14) => {
    if (muted) return;
    try {
      const ac = ensure();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g);
      g.connect(ac.destination);
      o.frequency.value = freq;
      o.type = type;
      const st = ac.currentTime + delay;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(vol, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      o.start(st);
      o.stop(st + dur + 0.02);
    } catch {
      /* noop */
    }
  };
  return {
    tap: () => tone(500, 'sine', 0.08, 0, 0.1),
    drip: () => tone(720, 'sine', 0.1, 0, 0.09),
    touch: () => {
      tone(360, 'sine', 0.16, 0);
      tone(540, 'sine', 0.2, 0.08);
    },
    finish: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.3, i * 0.11, 0.16)),
  };
}

/* ==================== Teacher | Student toggle ==================== */
function ModeToggle({
  mode,
  onChange,
  highlighted,
  T,
}: {
  mode: OperatorMode;
  onChange: (m: OperatorMode) => void;
  highlighted?: boolean;
  T: any;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        borderRadius: 12,
        padding: 4,
        gap: 4,
        background: 'rgba(255,255,255,0.16)',
        border: `1px solid ${highlighted ? '#FFF' : 'rgba(255,255,255,0.25)'}`,
        boxShadow: highlighted ? '0 0 0 3px rgba(255,255,255,0.45)' : 'none',
        transition: 'box-shadow 220ms ease',
      }}
    >
      {(['ai', 'student'] as const).map((m) => {
        const sel = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            aria-pressed={sel}
            style={{
              padding: '7px 13px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontFamily: fontStack,
              fontWeight: 700,
              fontSize: 12.5,
              background: sel ? '#fff' : 'transparent',
              color: sel ? T.deepPurple : '#fff',
              transition: 'all 180ms ease',
              whiteSpace: 'nowrap',
              minHeight: 32,
              minWidth: 44,
            }}
          >
            {m === 'ai' ? '👩‍🏫 Teacher' : '🙋 Your turn'}
          </button>
        );
      })}
    </div>
  );
}

/* ==================== Finish overlay — full-screen, NO stars (non-evaluating §6.3) ==================== */
function FinishOverlay({
  show,
  onClose,
  learned,
  interactions,
  T,
}: {
  show: boolean;
  onClose: () => void;
  learned: string[];
  interactions: { timesPlayed: number; scrubs: number; touches: number; maxReached: boolean };
  T: any;
}) {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        dur: 2.2 + Math.random() * 1.6,
        size: 6 + Math.random() * 10,
        drop: Math.random() > 0.4,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [show]
  );
  if (!show) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(23,22,39,0.6)',
        backdropFilter: 'blur(2px)',
        animation: 'cg-fade-in 300ms ease both',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {sparkles.map((s, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${s.left}%`,
              top: -20,
              width: s.size,
              height: s.size,
              borderRadius: s.drop ? '50% 50% 50% 0' : '50%',
              background: s.drop
                ? 'linear-gradient(160deg,#EAF7FE,#7FB9D8)'
                : 'linear-gradient(160deg,#FFF6E4,#FC9145)',
              transform: s.drop ? 'rotate(45deg)' : 'none',
              opacity: 0.9,
              animation: `cg-confetti-fall ${s.dur}s ease-in ${s.delay}s both`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          maxWidth: 440,
          width: '88%',
          maxHeight: '86vh',
          overflowY: 'auto',
          background: T.surface,
          borderRadius: 26,
          padding: '30px 28px',
          boxShadow: '0 30px 70px rgba(0,0,0,.4)',
          textAlign: 'center',
          animation: 'cg-pop-in 420ms cubic-bezier(.2,1.4,.4,1) both',
          boxSizing: 'border-box',
          fontFamily: fontStack,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 10px',
            borderRadius: '50%',
            background: T.grad,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'cg-tipIn 0.4s ease-out',
          }}
        >
          <Droplets size={30} color="#fff" />
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: '4px 0 2px' }}>
          Nicely observed!
        </div>
        <div style={{ fontSize: 13.5, color: T.textSoft, fontWeight: 600, marginBottom: 16 }}>
          You explored the condensation time-lapse
          {interactions.maxReached ? ' all the way to the end' : ''}
          {interactions.touches > 0 ? ' and touched the wet surface' : ''}.
        </div>
        <div
          style={{
            textAlign: 'left',
            background: T.dark ? '#241F3E' : T.lightCream,
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: T.deepPurple,
              fontSize: 12.5,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            What you have noticed
          </div>
          {learned.map((pt, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                marginBottom: i < learned.length - 1 ? 8 : 0,
              }}
            >
              <span style={{ color: '#2ECC71', fontWeight: 800, flexShrink: 0 }}>
                <Check size={15} color="#2ECC71" />
              </span>
              <span style={{ color: T.text, fontSize: 13.5, lineHeight: 1.5 }}>{pt}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            fontFamily: fontStack,
            fontWeight: 700,
            border: 'none',
            borderRadius: 9999,
            cursor: 'pointer',
            padding: '13px 20px',
            fontSize: 15,
            minHeight: 48,
            color: '#fff',
            background: `linear-gradient(135deg, ${T.accent}, ${T.softOrange})`,
            boxShadow: '0 6px 16px rgba(255,114,18,.32)',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

/* A dedicated full-screen popup for the "touch the surface" result — position:fixed so it can
   never be clipped by an ancestor's overflow/height constraints, unlike an inline card. */
function ResultPopup({
  show,
  onClose,
  elapsed,
  visibleDroplets,
  T,
}: {
  show: boolean;
  onClose: () => void;
  elapsed: number;
  visibleDroplets: number;
  T: any;
}) {
  const drops = useMemo(
    () =>
      Array.from({ length: 10 }, () => ({
        left: 8 + Math.random() * 84,
        delay: Math.random() * 0.5,
        dur: 1.8 + Math.random() * 1.2,
        size: 5 + Math.random() * 7,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [show]
  );
  if (!show) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Result — what you felt"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(23,22,39,0.58)',
        backdropFilter: 'blur(2px)',
        animation: 'cg-fade-in 250ms ease both',
        padding: 16,
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {drops.map((d, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${d.left}%`,
              top: -16,
              width: d.size,
              height: d.size,
              borderRadius: '50% 50% 50% 0',
              background: 'linear-gradient(160deg,#EAF7FE,#7FB9D8)',
              transform: 'rotate(45deg)',
              opacity: 0.85,
              animation: `cg-confetti-fall ${d.dur}s ease-in ${d.delay}s both`,
            }}
          />
        ))}
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          maxWidth: 440,
          width: '92%',
          maxHeight: '82vh',
          overflowY: 'auto',
          background: T.surface,
          borderRadius: 22,
          boxShadow: '0 30px 70px rgba(0,0,0,.4)',
          animation: 'cg-pop-in 360ms cubic-bezier(.2,1.4,.4,1) both',
          boxSizing: 'border-box',
          fontFamily: fontStack,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: T.accent,
            color: '#fff',
            padding: '15px 20px',
            fontWeight: 800,
            fontSize: 'clamp(13.5px, 2.4vw, 15.5px)',
            letterSpacing: 0.3,
            borderRadius: '22px 22px 0 0',
          }}
        >
          <Snowflake size={18} /> Result — what you felt
        </div>
        <div
          style={{
            padding: '18px 20px 20px',
            fontSize: 'clamp(13px, 2.2vw, 15px)',
            lineHeight: 1.6,
            color: T.text,
            background: T.dark ? '#241F3E' : T.lightCream,
            borderRadius: '0 0 22px 22px',
          }}
        >
          <p style={{ margin: '0 0 16px' }}>
            The outside of the glass feels <strong>cold and wet</strong> — tiny water droplets have collected on a
            surface that started out dry. This water is <strong>condensation</strong>: invisible water vapour in the
            warm air touches the cold glass, cools down, and turns back into liquid water on the surface.{' '}
            <strong>{visibleDroplets}</strong> droplets had formed by <strong>{elapsed.toFixed(1)} min</strong>.
          </p>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              fontFamily: fontStack,
              fontWeight: 700,
              border: 'none',
              borderRadius: 9999,
              cursor: 'pointer',
              padding: '13px 20px',
              fontSize: 14.5,
              minHeight: 46,
              color: '#fff',
              background: T.grad,
              boxShadow: '0 10px 22px rgba(83,48,134,0.32)',
            }}
          >
            Got it — keep exploring
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== MAIN COMPONENT ==================== */
const DropletsOnColdGlass: React.FC<ToolProps> = ({ props = {} }) => {
  const T = useMemo(() => {
    const primary = props.themeColor ?? '#4A4DC9';
    const accent = props.accentColor ?? '#FF7212';
    const dark = props.darkMode ?? false;
    return {
      primary,
      accent,
      deepPurple: '#533086',
      softOrange: '#FC9145',
      lightPurple: '#C1C1EA',
      lightCream: '#FFF3E4',
      grad: 'linear-gradient(135deg, #533086 0%, #FC9145 100%)',
      gradSoft: 'linear-gradient(160deg, #C1C1EA 0%, #FFF3E4 100%)',
      dark,
      bg: dark ? '#171627' : '#F5F5F5',
      surface: dark ? '#211F38' : '#FFFFFF',
      text: dark ? '#ECEAFB' : '#4E4E4E',
      textSoft: dark ? '#A9A6C9' : '#8A8A93',
      border: dark ? '#34324F' : '#EBEBEB',
      track: dark ? '#3A3856' : '#E3E3EE',
    };
  }, [props.themeColor, props.accentColor, props.darkMode]);

  const ap = props.additionalProps || {};
  const settings = useMemo(
    () => ({
      maxMinutes: ap.maxMinutes ?? 5,
      dropletCount: clamp(ap.dropletCount ?? 26, 6, 80),
      iceCubeCount: clamp(ap.iceCubeCount ?? 4, 0, 8),
      waterColor: ap.waterColor ?? '#BFE3F5',
      glassTint: ap.glassTint ?? '#EAF6FC',
      startWet: ap.startWet ?? false,
      autoStart: ap.autoStart ?? false,
      fullRunSeconds: ap.fullRunSeconds ?? 9,
      instruction:
        ap.instruction ??
        'Predict what happens on the dry outside of the cold glass, then play the timer and watch droplets appear and grow.',
    }),
    [ap]
  );
  const animationSpeed = props.animationSpeed ?? 1;
  const showModeToggle = props.showModeToggle ?? true;
  const seed = props.seed ?? 20260623;

  /* ---- operator mode + content depth (§6.1-6.2) ---- */
  const [mode, setMode] = useState<OperatorMode>(props.operatorMode ?? 'student');
  const depth: Depth = mode === 'ai' ? 'lean' : 'full';

  /* ---- core state ---- */
  const [elapsed, setElapsed] = useState<number>(settings.startWet ? settings.maxMinutes : 0);
  const [running, setRunning] = useState<boolean>((settings.autoStart ?? false) && mode !== 'ai');
  const [touched, setTouched] = useState<boolean>(false);
  const [resultOpen, setResultOpen] = useState<boolean>(false);
  const [handTouch, setHandTouch] = useState<boolean>(false);
  const [handTouchKey, setHandTouchKey] = useState(0);
  const [highlight, setHighlight] = useState<HighlightTarget>(null);
  const [muted, setMuted] = useState<boolean>(props.muted ?? false);
  const [hover, setHover] = useState<string | null>(null);
  const [press, setPress] = useState<string | null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [finished, setFinishedFlag] = useState(false);

  const audio = useAudio(muted);

  /* ---- interaction tracking for the finish summary ---- */
  const interactionsRef = useRef({
    timesPlayed: 0,
    scrubs: 0,
    touches: 0,
    maxReached: false,
    startedAt: Date.now(),
  });

  /* Responsive: measure the card so layout can recompose (§8.1) */
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState<{ w: number; h: number }>({ w: 900, h: 600 });
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setCardSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cardW = cardSize.w;
  const isCompact = cardW < 640; // stack vertically (portrait-ish contexts)
  const isTiny = cardW < 380;
  // viewport height proxy: how tight is the frame (the 844x390 hard case, §8.1)
  const [viewportH, setViewportH] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 700);
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isShort = viewportH < 460; // e.g. 390px mobile-landscape frame

  const rafRef = useRef<number | undefined>(undefined);
  const lastTsRef = useRef<number | null>(null);

  const progress = clamp(elapsed / settings.maxMinutes, 0, 1);
  const sceneLabel: 'Predict' | 'Observe' = progress <= 0.001 && !running ? 'Predict' : 'Observe';

  /* ---- pre-computed droplets (stable, seeded) ---- */
  const droplets = useMemo(() => {
    const rng = makeRng(seed + settings.dropletCount);
    const list = [];
    for (let i = 0; i < settings.dropletCount; i++) {
      const u = 0.1 + rng() * 0.8;
      const v = 0.12 + rng() * 0.82;
      const birth = Math.pow(rng(), 1.35) * 0.82;
      const maxR = 2.2 + rng() * 5.2;
      const drift = 8 + rng() * 26;
      list.push({
        u, v, birth, maxR, drift,
        wob: rng() * Math.PI * 2,
        wobAmp: 0.4 + rng() * 0.8,
      });
    }
    return list.sort((a, b) => a.maxR - b.maxR);
  }, [settings.dropletCount, seed]);

  const rivulets = useMemo(() => {
    const rng = makeRng(seed + 909 + settings.dropletCount);
    const n = Math.max(2, Math.round(settings.dropletCount / 9));
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        u: 0.2 + rng() * 0.6,
        startV: 0.28 + rng() * 0.25,
        len: 0.28 + rng() * 0.32,
        appear: 0.55 + rng() * 0.25,
        w: 1.4 + rng() * 1.6,
      });
    }
    return arr;
  }, [settings.dropletCount, seed]);

  const visibleDroplets = useMemo(
    () => droplets.filter((d) => progress >= d.birth).length,
    [droplets, progress]
  );
  const avgSize = useMemo(() => {
    const active = droplets.filter((d) => progress >= d.birth);
    if (!active.length) return 0;
    const sum = active.reduce((acc, d) => {
      const age = clamp((progress - d.birth) / (1 - d.birth || 1), 0, 1);
      return acc + d.maxR * easeOutCubic(age);
    }, 0);
    return Math.round((sum / active.length) * 100) / 100;
  }, [droplets, progress]);

  const surfaceWet = progress > 0.04;

  /* ---- ice cubes (stable, seeded, melt over time) ---- */
  const iceCubes = useMemo(() => {
    const rng = makeRng(seed + 7700 + settings.iceCubeCount);
    const cubes = [];
    const span = GLASS.topRight - GLASS.topLeft - 44;
    for (let i = 0; i < settings.iceCubeCount; i++) {
      const x = GLASS.topLeft + 24 + rng() * span;
      const y = GLASS.waterTopY + 4 + rng() * 34;
      const size = 22 + rng() * 12;
      const rot = -22 + rng() * 44;
      const meltDelay = rng() * 0.12;
      const meltSpan = 0.6 + rng() * 0.28;
      cubes.push({ x, y, size, rot, delay: rng() * 3, meltDelay, meltSpan });
    }
    return cubes;
  }, [settings.iceCubeCount, seed]);

  /* ---- inject keyframes + slider styling + font (once) ---- */
  useEffect(() => {
    const css = `
      @keyframes cg-fadeUp { from { opacity:0; transform:translateY(14px);} to {opacity:1; transform:translateY(0);} }
      @keyframes cg-floaty { 0%,100%{transform:translateY(0) rotate(var(--r,0deg));} 50%{transform:translateY(-5px) rotate(var(--r,0deg));} }
      @keyframes cg-pulseRing { 0%{box-shadow:0 0 0 0 ${T.primary}66;} 100%{box-shadow:0 0 0 18px ${T.primary}00;} }
      @keyframes cg-tipIn { from{opacity:0; transform:translateY(8px) scale(.95);} to{opacity:1; transform:translateY(0) scale(1);} }
      @keyframes cg-coldGlow { 0%,100%{opacity:.25;} 50%{opacity:.5;} }
      @keyframes cg-sheen { 0%{transform:translateX(-120%);} 60%,100%{transform:translateX(220%);} }
      @keyframes cg-fade-in { from{opacity:0;} to{opacity:1;} }
      @keyframes cg-pop-in { from{opacity:0; transform:scale(.85) translateY(18px);} to{opacity:1; transform:scale(1) translateY(0);} }
      @keyframes cg-confetti-fall { from{ transform:translateY(0) rotate(0deg); opacity:0.95;} to{ transform:translateY(110vh) rotate(220deg); opacity:0.15;} }
      @keyframes cg-hl-ring { 0%{ box-shadow:0 0 0 0 ${T.accent}88;} 100%{ box-shadow:0 0 0 14px ${T.accent}00;} }
      @keyframes cg-glow-pulse { 0%,100%{ filter:drop-shadow(0 0 4px ${T.accent}aa);} 50%{ filter:drop-shadow(0 0 14px ${T.accent}ee);} }
      @keyframes cg-hand-approach {
        0%   { transform: translate(74px, -22px) rotate(-11deg) scale(1); opacity: 0; }
        11%  { opacity: 1; }
        28%  { transform: translate(6px, -3px) rotate(-2deg) scale(1); }
        34%  { transform: translate(-2px, 0px) rotate(0deg) scale(1.05, 0.93); }
        40%  { transform: translate(0px, 0px) rotate(0.5deg) scale(0.98, 1.02); }
        46%  { transform: translate(0px, 0px) rotate(0deg) scale(1, 1); }
        88%  { transform: translate(0px, 0px) rotate(0deg) scale(1, 1); opacity: 1; }
        100% { transform: translate(58px, -26px) rotate(-9deg) scale(1); opacity: 0; }
      }
      @keyframes cg-touch-ripple {
        0%   { transform: scale(0.3); opacity: 0; }
        30%  { opacity: 0.55; }
        100% { transform: scale(1); opacity: 0; }
      }
      .cg-ice { animation: cg-floaty 4.5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }

      .cg-range { -webkit-appearance:none; appearance:none; height:10px; border-radius:999px; outline:none; cursor:pointer; }
      .cg-range::-webkit-slider-thumb {
        -webkit-appearance:none; appearance:none; width:24px; height:24px; border-radius:50%;
        background:#fff; border:4px solid ${T.primary};
        box-shadow:0 3px 8px rgba(83,48,134,.35); cursor:pointer; transition:transform .15s ease;
      }
      .cg-range::-webkit-slider-thumb:hover { transform:scale(1.12); }
      .cg-range:active::-webkit-slider-thumb { transform:scale(.94); }
      .cg-range::-moz-range-thumb {
        width:24px; height:24px; border-radius:50%; background:#fff; border:4px solid ${T.primary};
        box-shadow:0 3px 8px rgba(83,48,134,.35); cursor:pointer;
      }
      .cg-range:focus-visible { box-shadow:0 0 0 4px ${T.primary}33; }

      @media (prefers-reduced-motion: reduce) {
        .cg-ice, .cg-sheen-el { animation: none !important; }
      }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = 'cg-keyframes-v2';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    if (!document.getElementById('cg-poppins')) {
      const fontEl = document.createElement('link');
      fontEl.id = 'cg-poppins';
      fontEl.rel = 'stylesheet';
      fontEl.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(fontEl);
    }
    return () => {
      styleEl.remove();
    };
  }, [T.primary, T.accent]);

  /* ---- play loop (rAF) — paused automatically in Teacher/lean demo caption view is
     still allowed since the agent drives it via play()/scrub() ---- */
  useEffect(() => {
    if (!running) {
      lastTsRef.current = null;
      return;
    }
    const perMs = settings.maxMinutes / ((settings.fullRunSeconds * 1000) / animationSpeed);
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      setElapsed((prev) => {
        const next = prev + dt * perMs;
        if (next >= settings.maxMinutes) {
          setRunning(false);
          interactionsRef.current.maxReached = true;
          emit({ type: 'event', name: 'run_completed', detail: { elapsedMinutes: settings.maxMinutes, dropletCount: settings.dropletCount } });
          return settings.maxMinutes;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, settings.maxMinutes, settings.fullRunSeconds, animationSpeed]);

  /* ---- always-fresh mirror of state for agent commands (never read stale closures) ---- */
  const buildState = useCallback(
    (): SharedState => ({
      elapsedMinutes: Math.round(elapsed * 100) / 100,
      dropletCount: visibleDroplets,
      dropletSize: avgSize,
      surfaceWet,
      running,
      touched,
      operatorMode: mode,
      depth,
      muted,
      finished,
    }),
    [elapsed, visibleDroplets, avgSize, surfaceWet, running, touched, mode, depth, muted, finished]
  );
  const stateRef = useRef<SharedState>(buildState());
  stateRef.current = buildState();

  /* ---- mode + depth switch: used by props, setOperatorMode, AND the toggle (§6.1) ---- */
  const applyMode = useCallback((m: OperatorMode) => {
    setMode(m);
    const d: Depth = m === 'ai' ? 'lean' : 'full';
    emit({ type: 'event', name: 'operator_mode_changed', detail: { operatorMode: m, depth: d } });
  }, []);
  useEffect(() => {
    if (props.operatorMode && props.operatorMode !== mode) applyMode(props.operatorMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.operatorMode]);

  /* ---- tool-specific + standard actions (used by BOTH clicks and agent commands) ---- */
  const play = useCallback(() => {
    setElapsed((prev) => {
      const start = prev >= settings.maxMinutes ? 0 : prev;
      return start;
    });
    interactionsRef.current.timesPlayed += 1;
    audio.tap();
    setRunning(true);
  }, [settings.maxMinutes, audio]);

  const pause = useCallback(() => {
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    setTouched(false);
    setResultOpen(false);
    setHighlight(null);
    setHandTouch(false);
    setShowFinish(false);
    setFinishedFlag(false);
    interactionsRef.current = { timesPlayed: 0, scrubs: 0, touches: 0, maxReached: false, startedAt: Date.now() };
    emit({ type: 'event', name: 'reset', detail: {} });
  }, []);

  const togglePlay = useCallback(() => (running ? pause() : play()), [running, play, pause]);

  const scrub = useCallback(
    (minutes: number) => {
      setRunning(false);
      const next = clamp(Number(minutes), 0, settings.maxMinutes);
      interactionsRef.current.scrubs += 1;
      if (next >= settings.maxMinutes - 0.001) interactionsRef.current.maxReached = true;
      setElapsed(next);
      emit({
        type: 'event',
        name: 'time_changed',
        detail: { elapsedMinutes: Math.round(next * 100) / 100, dropletCount: visibleDroplets, surfaceWet: next > settings.maxMinutes * 0.04, running: false },
      });
    },
    [settings.maxMinutes, visibleDroplets]
  );

  const touchSurface = useCallback(() => {
    const cur = stateRef.current;
    if (!cur.surfaceWet) return; // no-op if nothing to feel yet — idempotent-safe
    setTouched(true);
    setHighlight('surface');
    setHandTouch(true);
    setHandTouchKey((k) => k + 1);
    interactionsRef.current.touches += 1;
    audio.touch();
    emit({
      type: 'event',
      name: 'touched_surface',
      detail: { elapsedMinutes: cur.elapsedMinutes, dropletCount: cur.dropletCount, surfaceWet: cur.surfaceWet },
    });
    // let the hand actually reach and settle onto the glass first, then reveal the
    // result — timed to just after the "press" beat of cg-hand-approach (2.6s total),
    // and let the hand rest there for a while longer before it lifts away.
    window.setTimeout(() => setResultOpen(true), 1250);
    window.setTimeout(() => setHighlight((h) => (h === 'surface' ? null : h)), 2450);
    window.setTimeout(() => setHandTouch(false), 2650);
  }, [audio]);

  const doHighlight = useCallback((target: any) => {
    const t = (target ?? null) as HighlightTarget;
    setHighlight(t);
    if (t) window.setTimeout(() => setHighlight((h) => (h === t ? null : h)), 2400);
  }, []);

  const finish = useCallback(() => {
    const cur = stateRef.current;
    const durationMs = Date.now() - interactionsRef.current.startedAt;
    setFinishedFlag(true);
    setShowFinish(true);
    audio.finish();
    emit({
      type: 'event',
      name: 'finished',
      detail: {
        evaluated: false,
        interactions: {
          timesPlayed: interactionsRef.current.timesPlayed,
          scrubs: interactionsRef.current.scrubs,
          touches: interactionsRef.current.touches,
          maxReached: interactionsRef.current.maxReached,
          durationMs,
        },
        learned: LEARNED_POINTS,
      },
    });
  }, [audio]);

  const setParam = useCallback(
    (name: string, value: any) => {
      switch (name) {
        case 'elapsedMinutes':
          scrub(Number(value));
          break;
        case 'running':
          value ? play() : pause();
          break;
        case 'touched':
        case 'surfaceWet':
          if (value) touchSurface();
          break;
        case 'muted':
          setMuted(Boolean(value));
          break;
        case 'operatorMode':
          applyMode(value === 'ai' ? 'ai' : 'student');
          break;
        default:
          break;
      }
    },
    [scrub, play, pause, touchSurface, applyMode]
  );

  /* ---- the agent API: every windowMethod in the JSON lives here ---- */
  const api = {
    setParam,
    play,
    pause,
    reset,
    highlight: doHighlight,
    getState: () => {
      emit({ type: 'state', state: stateRef.current });
      return stateRef.current;
    },
    setOperatorMode: (m: any) => applyMode(m === 'ai' ? 'ai' : 'student'),
    scrub,
    touchSurface,
    finish,
  };
  const apiRef = useRef(api);
  apiRef.current = api;

  /* ---- command listener + the REQUIRED ready signal (§3.1-3.2) ---- */
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== 'command') return;
      const fn = (apiRef.current as any)[d.method];
      let result: any;
      if (typeof fn === 'function') {
        try {
          result = fn(...(d.args || []));
        } catch {
          result = undefined;
        }
      }
      emit({ type: 'response', id: d.id, result });
    };
    window.addEventListener('message', onMsg);
    emit({ type: 'ready', toolId: TOOL_ID });
    return () => window.removeEventListener('message', onMsg);
  }, []);

  /* ─────────────────────────────────────────────────────────────────
   STYLES
  ───────────────────────────────────────────────────────────────── */
  const pill = (key: string, base: React.CSSProperties): React.CSSProperties => ({
    ...base,
    transform: press === key ? 'scale(0.95)' : hover === key ? 'scale(1.04)' : 'scale(1)',
    boxShadow: hover === key && !base.opacity ? '0 10px 22px rgba(83,48,134,0.24)' : base.boxShadow,
  });
  const hoverProps = (key: string) => ({
    onMouseEnter: () => setHover(key),
    onMouseLeave: () => {
      setHover(null);
      setPress(null);
    },
    onMouseDown: () => setPress(key),
    onMouseUp: () => setPress(null),
    onTouchStart: () => setPress(key),
    onTouchEnd: () => setPress(null),
  });
  const hlStyle = (target: HighlightTarget): React.CSSProperties =>
    target && highlight === target ? { animation: 'cg-hl-ring 1.3s ease-out infinite', borderRadius: 12 } : {};

  const styles: { [k: string]: React.CSSProperties } = {
    page: {
      width: '100%',
      height: '100vh',
      minHeight: '100vh',
      maxHeight: '100vh',
      boxSizing: 'border-box',
      padding: 'clamp(6px, 2vw, 20px)',
      background: T.bg,
      fontFamily: fontStack,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'stretch',
    },
    card: {
      width: '100%',
      maxWidth: 1320,
      background: T.surface,
      borderRadius: 'clamp(14px, 2.4vw, 26px)',
      overflow: 'hidden',
      boxShadow: T.dark ? '0 24px 60px -20px rgba(0,0,0,0.6)' : '0 24px 60px -24px rgba(83,48,134,0.30)',
      border: `1px solid ${T.border}`,
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      position: 'relative',
    },
    header: {
      background: T.grad,
      padding: isShort ? '9px 16px' : 'clamp(12px, 2.6vw, 22px)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      flexWrap: 'wrap',
      boxSizing: 'border-box',
    },
    eyebrow: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 'clamp(9px, 1.5vw, 11px)',
      fontWeight: 600,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      background: 'rgba(255,255,255,0.18)',
      padding: '4px 10px',
      borderRadius: 999,
    },
    title: {
      margin: isShort ? '2px 0 0' : '8px 0 2px',
      fontSize: isShort ? 'clamp(14px, 2.6vw, 18px)' : 'clamp(16px, 3.4vw, 24px)',
      fontWeight: 700,
      lineHeight: 1.15,
      animation: 'cg-fadeUp 0.5s ease-out',
    },
    subtitle: {
      margin: 0,
      fontSize: 'clamp(11px, 2vw, 13px)',
      fontWeight: 400,
      color: 'rgba(255,255,255,0.92)',
      maxWidth: 520,
    },
    body: {
      display: 'flex',
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: 'stretch',
      gap: 'clamp(10px, 2vw, 20px)',
      padding: isShort ? '8px 12px' : 'clamp(10px, 2.4vw, 22px)',
      boxSizing: 'border-box',
      flex: '1 1 auto',
      minHeight: 0,
      overflow: isCompact ? 'auto' : 'hidden',
    },
    stageWrap: {
      flex: isCompact ? '0 0 auto' : '1 1 46%',
      width: '100%',
      minWidth: 0,
      minHeight: 0,
      position: 'relative',
      background: T.gradSoft,
      borderRadius: 'clamp(12px, 2.2vw, 20px)',
      padding: 'clamp(4px, 1.4vw, 12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      boxSizing: 'border-box',
    },
    svgBox: { width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    sidePanel: {
      flex: isCompact ? '0 0 auto' : '1 1 44%',
      width: '100%',
      minWidth: 0,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: isShort ? 6 : 'clamp(8px, 1.6vw, 14px)',
      overflowY: isCompact ? 'visible' : 'auto',
      boxSizing: 'border-box',
    },
    timeReadout: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      background: T.dark ? '#2A2845' : T.lightCream,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: isShort ? '8px 12px' : '12px 16px',
    },
    statRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
    statCard: {
      background: T.dark ? '#26243F' : '#FFFFFF',
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: isShort ? '8px 10px' : '11px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
    },
    statLabel: { fontSize: 10.5, fontWeight: 600, color: T.textSoft, letterSpacing: 0.3 },
    statValue: { fontSize: 'clamp(15px, 2.6vw, 19px)', fontWeight: 700, color: T.text },
    controls: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
    primaryBtn: {
      flex: '1 1 120px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: isShort ? '10px 18px' : '12px 22px',
      borderRadius: 999,
      border: 'none',
      cursor: 'pointer',
      fontFamily: fontStack,
      fontWeight: 600,
      fontSize: 13.5,
      color: '#fff',
      background: T.primary,
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      touchAction: 'manipulation',
      minHeight: 44,
    },
    outlineBtn: {
      flex: isTiny ? '1 1 120px' : '0 1 auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: isShort ? '10px 16px' : '12px 20px',
      borderRadius: 999,
      border: `2px solid ${T.primary}`,
      background: 'transparent',
      color: T.primary,
      cursor: 'pointer',
      fontFamily: fontStack,
      fontWeight: 600,
      fontSize: 13.5,
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      touchAction: 'manipulation',
      minHeight: 44,
    },
    touchBtn: {
      width: '100%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: isShort ? '10px 18px' : '13px 22px',
      borderRadius: 999,
      border: 'none',
      cursor: surfaceWet ? 'pointer' : 'not-allowed',
      fontFamily: fontStack,
      fontWeight: 600,
      fontSize: 13.5,
      color: '#fff',
      background: surfaceWet ? T.accent : T.track,
      opacity: surfaceWet ? 1 : 0.7,
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      touchAction: 'manipulation',
      minHeight: 44,
    },
    finishBtn: {
      width: '100%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: isShort ? '10px 18px' : '13px 22px',
      borderRadius: 999,
      border: 'none',
      cursor: 'pointer',
      fontFamily: fontStack,
      fontWeight: 700,
      fontSize: 14,
      color: '#fff',
      background: `linear-gradient(135deg, ${T.deepPurple}, ${T.primary})`,
      boxShadow: '0 8px 18px rgba(83,48,134,0.32)',
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      touchAction: 'manipulation',
      minHeight: 44,
    },
    sliderWrap: {
      background: T.dark ? '#26243F' : '#FFFFFF',
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: isShort ? '8px 12px' : '12px 16px',
    },
    sliderLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11.5,
      fontWeight: 600,
      color: T.textSoft,
      marginBottom: isShort ? 6 : 10,
    },
    note: {
      fontSize: 'clamp(10.5px, 1.8vw, 12.5px)',
      lineHeight: 1.5,
      color: T.textSoft,
      background: T.dark ? '#221F3A' : T.bg,
      borderLeft: `3px solid ${T.accent}`,
      borderRadius: 10,
      padding: '9px 11px',
    },
    watchCaption: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 600,
      color: T.deepPurple,
      background: T.lightCream,
      borderRadius: 14,
      padding: '10px 14px',
      border: `1px dashed ${T.accent}88`,
    },
  };

  const sliderBg = `linear-gradient(90deg, ${T.deepPurple} 0%, ${T.softOrange} ${progress * 100}%, ${T.track} ${progress * 100}%, ${T.track} 100%)`;
  const svgMaxH = isShort ? '30vh' : isCompact ? '46vh' : '58vh';

  const waterTop = GLASS.waterTopY;
  const glassGlow =
    highlight === 'glass' || highlight === 'droplets' || highlight === 'surface' || highlight === 'ice'
      ? 'drop-shadow(0 0 12px rgba(74,77,201,0.55))'
      : 'none';
  const fogOpacity = clamp(progress * 0.22, 0, 0.22);

  return (
    <div style={styles.page}>
      <div ref={cardRef} style={styles.card}>
        {/* HEADER */}
        <div style={styles.header}>
          <div
            className="cg-sheen-el"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
              transform: 'translateX(-120%)',
              animation: 'cg-sheen 6s ease-in-out 1s infinite',
              pointerEvents: 'none',
            }}
          />
          <div style={{ minWidth: 0 }}>
            <span style={styles.eyebrow}>
              <Droplets size={12} /> States of Water · Observe
            </span>
            <h2 style={styles.title}>Droplets forming on a cold glass</h2>
            {!isShort && (
              <p style={styles.subtitle}>
                Watch (or scrub) the outside of a cold glass turn from bone-dry to covered in condensation.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              {...hoverProps('mute')}
              onClick={() => api.setParam('muted', !muted)}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.16)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                ...pill('mute', {}),
                ...hlStyle('muteButton'),
              }}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            {showModeToggle && (
              <div style={hlStyle('modeToggle')}>
                <ModeToggle mode={mode} onChange={applyMode} T={T} />
              </div>
            )}
          </div>
        </div>

        {/* BODY */}
        <div style={styles.body}>
          {/* STAGE */}
          <div style={styles.stageWrap}>
            {!isShort && (
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  zIndex: 3,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 11px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#fff',
                  background: sceneLabel === 'Predict' ? T.primary : T.accent,
                  boxShadow: '0 6px 14px rgba(0,0,0,0.15)',
                }}
              >
                {sceneLabel === 'Predict' ? <Eye size={12} /> : <Droplets size={12} />}
                {sceneLabel}
              </div>
            )}

            {touched && surfaceWet && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 10,
                  zIndex: 4,
                  padding: '7px 11px',
                  borderRadius: 12,
                  background: T.deepPurple,
                  color: '#fff',
                  fontSize: 11.5,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  animation: 'cg-tipIn 0.3s ease-out',
                  boxShadow: '0 8px 18px rgba(83,48,134,0.35)',
                }}
              >
                <Snowflake size={12} /> Feels cold &amp; wet
              </div>
            )}

            <div style={{ ...styles.svgBox, ...hlStyle(highlight === 'glass' ? 'glass' : null) }}>
              <svg
                viewBox="0 0 400 540"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxWidth: isCompact ? 'min(100%, 300px)' : 'min(94%, 480px)',
                  maxHeight: svgMaxH,
                  aspectRatio: '400 / 540',
                  display: 'block',
                  filter: glassGlow,
                  transition: 'filter 0.4s ease',
                }}
                role="img"
                aria-label="A cold glass tumbler with ice water and condensation droplets forming on the outside"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="cg-skin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F6C8A0" />
                    <stop offset="100%" stopColor="#E3A574" />
                  </linearGradient>
                  <linearGradient id="cg-water" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={settings.waterColor} />
                    <stop offset="100%" stopColor="#8FCBE8" />
                  </linearGradient>
                  <linearGradient id="cg-glass" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                    <stop offset="20%" stopColor={settings.glassTint} stopOpacity="0.18" />
                    <stop offset="80%" stopColor={settings.glassTint} stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
                  </linearGradient>
                  <radialGradient id="cg-drop" cx="0.35" cy="0.3" r="0.8">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.97" />
                    <stop offset="45%" stopColor="#D6EEFA" stopOpacity="0.88" />
                    <stop offset="100%" stopColor="#7FB9D8" stopOpacity="0.88" />
                  </radialGradient>
                  <linearGradient id="cg-ice" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#CDEAF7" />
                  </linearGradient>
                  <clipPath id="cg-clip">
                    <path d={glassPath} />
                  </clipPath>
                </defs>

                <ellipse cx="200" cy="502" rx="120" ry="16" fill="rgba(83,48,134,0.12)" />

                <ellipse
                  cx="200"
                  cy="305"
                  rx="118"
                  ry="200"
                  fill="#BFE3F5"
                  style={{ opacity: 0.18 + progress * 0.18, animation: 'cg-coldGlow 3.5s ease-in-out infinite' }}
                />

                <path
                  d={glassPath}
                  fill="url(#cg-glass)"
                  stroke="#BBD9E8"
                  strokeWidth="2.5"
                  style={highlight === 'glass' ? { animation: 'cg-glow-pulse 1.3s ease-in-out infinite' } : undefined}
                />

                <g clipPath="url(#cg-clip)">
                  <rect
                    x={GLASS.botLeft - 20}
                    y={waterTop}
                    width={GLASS.botRight - GLASS.botLeft + 60}
                    height={GLASS.bottomY - waterTop + 30}
                    fill="url(#cg-water)"
                  />
                  <ellipse cx="200" cy={waterTop + 2} rx="74" ry="9" fill="#EAF7FE" opacity="0.7" />
                  {iceCubes.map((c, i) => {
                    const meltT = clamp((progress - c.meltDelay) / c.meltSpan, 0, 1);
                    const e = easeInOutQuad(meltT);
                    const curSize = c.size * (1 - 0.92 * e);
                    if (curSize < 1.4) return null;
                    const curRx = Math.min(curSize / 2, 5 + e * curSize * 0.5);
                    const cy = c.y + e * 8;
                    const baseOp = highlight === 'ice' ? 1 : 0.96;
                    const curOp = baseOp * (1 - 0.45 * e);
                    const hl = curSize * 0.32;
                    return (
                      <g
                        key={i}
                        className="cg-ice"
                        style={{
                          ['--r' as any]: `${c.rot}deg`,
                          animationDelay: `${c.delay}s`,
                          ...(highlight === 'ice' ? { filter: `drop-shadow(0 0 6px ${T.primary}aa)` } : {}),
                        }}
                        opacity={curOp}
                      >
                        <rect
                          x={c.x - curSize / 2}
                          y={cy - curSize / 2}
                          width={curSize}
                          height={curSize}
                          rx={curRx}
                          fill="url(#cg-ice)"
                          stroke="#A9D8EC"
                          strokeWidth="1.4"
                        />
                        {curSize > 9 && (
                          <rect
                            x={c.x - curSize / 2 + 4}
                            y={cy - curSize / 2 + 4}
                            width={hl}
                            height={hl}
                            rx="2"
                            fill="#ffffff"
                            opacity={0.7 * (1 - e)}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>

                <path d={glassPath} fill="#F2FAFE" style={{ opacity: fogOpacity, transition: 'opacity 0.25s linear' }} />

                <ellipse
                  cx="200"
                  cy={GLASS.topY}
                  rx={(GLASS.topRight - GLASS.topLeft) / 2}
                  ry="12"
                  fill="none"
                  stroke="#BBD9E8"
                  strokeWidth="2.5"
                />
                <ellipse
                  cx="200"
                  cy={GLASS.topY}
                  rx={(GLASS.topRight - GLASS.topLeft) / 2 - 4}
                  ry="8"
                  fill="#F4FBFE"
                  opacity="0.5"
                />

                <path
                  d={`M ${GLASS.topLeft + 14} ${GLASS.topY + 20} L ${GLASS.botLeft + 16} ${GLASS.bottomY - 24}`}
                  stroke="#ffffff"
                  strokeWidth="7"
                  strokeLinecap="round"
                  opacity="0.45"
                />

                <g clipPath="url(#cg-clip)">
                  {rivulets.map((r, i) => {
                    if (progress < r.appear) return null;
                    const t = clamp((progress - r.appear) / (1 - r.appear || 1), 0, 1);
                    const top = facePoint(r.u, r.startV);
                    const grow = easeInOutQuad(t);
                    const endV = clamp(r.startV + r.len * grow, 0, 0.98);
                    const bottom = facePoint(r.u, endV);
                    return (
                      <g key={`riv-${i}`} opacity={0.3 + t * 0.35}>
                        <line x1={top.x} y1={top.y} x2={bottom.x} y2={bottom.y} stroke="url(#cg-drop)" strokeWidth={r.w} strokeLinecap="round" />
                        <ellipse cx={bottom.x} cy={bottom.y} rx={r.w * 1.6} ry={r.w * 2} fill="url(#cg-drop)" />
                      </g>
                    );
                  })}
                </g>

                <g
                  clipPath="url(#cg-clip)"
                  style={highlight === 'droplets' ? { animation: 'cg-glow-pulse 1.3s ease-in-out infinite' } : undefined}
                >
                  {droplets.map((d, i) => {
                    if (progress < d.birth) return null;
                    const age = clamp((progress - d.birth) / (1 - d.birth || 1), 0, 1);
                    const pop = age < 0.18 ? easeOutBack(age / 0.18) : 1;
                    const grow = easeOutCubic(age);
                    const r = d.maxR * grow * pop;
                    if (r < 0.3) return null;
                    const isBig = d.maxR > 5;
                    const slide = d.drift * easeInOutQuad(clamp((age - 0.45) / 0.55, 0, 1)) * (isBig ? 1 : 0.3);
                    const p = facePoint(d.u, d.v);
                    const wobble = Math.sin(age * 6 + d.wob) * d.wobAmp * (1 - grow) * (faceWidthAt(d.v) / 160);
                    const cx = p.x + wobble;
                    const cy = p.y + slide;
                    const opacity = clamp(0.32 + age * 0.62, 0, 0.96);
                    return (
                      <g key={i} opacity={opacity}>
                        {isBig && slide > 4 && (
                          <rect x={cx - r * 0.26} y={cy - slide} width={r * 0.52} height={slide} fill="url(#cg-drop)" opacity="0.22" rx={r * 0.26} />
                        )}
                        <ellipse cx={cx} cy={cy} rx={r} ry={r * (isBig ? 1.18 : 1.05)} fill="url(#cg-drop)" stroke="#8FC4DF" strokeWidth="0.4" />
                        <circle cx={cx - r * 0.32} cy={cy - r * 0.36} r={r * 0.28} fill="#ffffff" opacity="0.85" />
                      </g>
                    );
                  })}
                </g>

                {progress <= 0.001 && (
                  <text x="200" y="528" textAnchor="middle" fontFamily={fontStack} fontSize="14" fontWeight="600" fill={T.deepPurple} opacity="0.65">
                    Outside is dry — what will appear?
                  </text>
                )}

                {/* Hand touching the glass — plays once per touchSurface() call, restarted via key */}
                {handTouch && (
                  <g key={handTouchKey} pointerEvents="none">
                    <circle cx="269" cy="300" r="24" fill="none" stroke={T.accent} strokeWidth="2.5" opacity="0" style={{ animation: 'cg-touch-ripple 1.2s ease-out 1.0s', transformOrigin: '269px 300px' }} />
                    <circle cx="269" cy="300" r="24" fill="none" stroke={T.accent} strokeWidth="2.5" opacity="0" style={{ animation: 'cg-touch-ripple 1.2s ease-out 1.3s', transformOrigin: '269px 300px' }} />
                    <g style={{ animation: 'cg-hand-approach 2.6s cubic-bezier(.25,.1,.25,1) both', transformOrigin: '269px 300px' }}>
                      {/* soft contact shadow grounding the fingertip against the glass */}
                      <ellipse cx="278" cy="317" rx="18" ry="4" fill="#241F3A" opacity="0.16" />
                      {/* forearm/finger reaching in from off-canvas right — ONE seamless tapered
                          silhouette (tip narrower than the base, like a real finger) instead of
                          patched shapes, so there is no visible seam at the joint. */}
                      <path
                        d="M 460 283
                           C 380 281, 328 283.5, 302 288
                           C 291 290, 279 293.5, 273 298.3
                           A 6.8 6.8 0 0 0 273 302.2
                           C 279 307, 291 310.5, 302 312.5
                           C 328 317, 380 318.5, 460 317
                           Z"
                        fill="url(#cg-skin)" stroke="#C6874F" strokeWidth="1.75" strokeLinejoin="round"
                      />
                      {/* soft cylindrical highlight along the top edge (light from above) */}
                      <path d="M 296 289.5 C 320 285.5, 380 284, 452 285.5" stroke="#FFE7CC" strokeWidth="2.4" fill="none" opacity="0.55" strokeLinecap="round" />
                      {/* single natural knuckle crease at the nearest joint */}
                      <path d="M 313 285.5 Q 309.5 300 313 314.5" stroke="#C6874F" strokeWidth="1.4" fill="none" opacity="0.45" strokeLinecap="round" />
                      {/* fingernail, set into the top of the tip */}
                      <ellipse cx="281" cy="296" rx="7.5" ry="5.6" fill="#F9DDBF" stroke="#DDA36E" strokeWidth="0.8" opacity="0.95" transform="rotate(-8 281 296)" />
                      {/* fingertip pad sheen where it presses the cold glass */}
                      <ellipse cx="277" cy="301.5" rx="4" ry="5.5" fill="#ffffff" opacity="0.4" />
                    </g>
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* SIDE PANEL */}
          <div style={styles.sidePanel}>
            <div style={styles.timeReadout}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: T.text, fontSize: 13.5 }}>
                <Clock size={17} color={T.primary} /> Elapsed time
              </span>
              <span style={{ fontWeight: 700, fontSize: 19, color: T.deepPurple }}>{elapsed.toFixed(1)} min</span>
            </div>

            <div style={styles.statRow}>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>DROPLETS</span>
                <span style={styles.statValue}>{visibleDroplets}</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>SURFACE</span>
                <span style={{ ...styles.statValue, color: surfaceWet ? T.accent : T.textSoft }}>{surfaceWet ? 'Wet' : 'Dry'}</span>
              </div>
            </div>

            {mode === 'ai' ? (
              <div style={styles.watchCaption}>
                👩‍🏫 Your teacher is showing you this — watch, you'll get a turn
              </div>
            ) : (
              <>
                <div style={{ ...styles.sliderWrap, ...hlStyle('timeSlider') }}>
                  <div style={styles.sliderLabel}>
                    <span>Scrub the time-lapse</span>
                    <span>0 – {settings.maxMinutes} min</span>
                  </div>
                  <input
                    className="cg-range"
                    type="range"
                    min={0}
                    max={settings.maxMinutes}
                    step={0.05}
                    value={elapsed}
                    onChange={(e) => scrub(Number(e.target.value))}
                    style={{ width: '100%', background: sliderBg }}
                    aria-label="Scrub the condensation time-lapse"
                  />
                </div>

                <div style={styles.controls}>
                  <button {...hoverProps('play')} onClick={togglePlay} style={{ ...pill('play', styles.primaryBtn), ...hlStyle('playButton') }}>
                    {running ? <Pause size={17} /> : <Play size={17} />}
                    {running ? 'Pause' : elapsed >= settings.maxMinutes ? 'Replay' : 'Play'}
                  </button>
                  <button {...hoverProps('reset')} onClick={reset} style={pill('reset', styles.outlineBtn)} aria-label="Reset">
                    <RotateCcw size={17} /> Reset
                  </button>
                </div>

                <button
                  {...hoverProps('touch')}
                  onClick={() => surfaceWet && touchSurface()}
                  disabled={!surfaceWet}
                  style={{
                    ...pill('touch', styles.touchBtn),
                    ...hlStyle('touchButton'),
                    animation:
                      highlight === 'touchButton'
                        ? 'cg-hl-ring 1.3s ease-out infinite'
                        : surfaceWet && !touched
                        ? 'cg-pulseRing 1.6s ease-out infinite'
                        : 'none',
                  }}
                >
                  <Hand size={17} /> Touch the outer surface
                </button>

                {touched && surfaceWet && (
                  <button
                    {...hoverProps('viewResult')}
                    onClick={() => setResultOpen(true)}
                    style={{
                      ...pill('viewResult', {
                        ...styles.outlineBtn,
                        width: '100%',
                        border: `2px solid ${T.accent}`,
                        color: T.accent,
                        animation: 'cg-tipIn 0.3s ease-out',
                      }),
                    }}
                  >
                    <Snowflake size={15} /> View result — what you felt
                  </button>
                )}

                {!isShort && <div style={styles.note}>{settings.instruction}</div>}

                {interactionsRef.current.maxReached && touched && (
                  <button
                    {...hoverProps('finish')}
                    onClick={finish}
                    style={{ ...pill('finish', styles.finishBtn), ...hlStyle('finishButton') }}
                  >
                    <Flag size={16} /> Finish
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ResultPopup
        show={resultOpen}
        onClose={() => setResultOpen(false)}
        elapsed={elapsed}
        visibleDroplets={visibleDroplets}
        T={T}
      />

      <FinishOverlay
        show={showFinish}
        onClose={() => setShowFinish(false)}
        learned={LEARNED_POINTS}
        interactions={interactionsRef.current}
        T={T}
      />
    </div>
  );
};

export default DropletsOnColdGlass;
