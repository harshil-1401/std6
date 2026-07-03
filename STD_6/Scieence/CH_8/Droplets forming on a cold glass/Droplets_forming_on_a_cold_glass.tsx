// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: condensation_glass_tool.tsx
//
// Tool: "Droplets forming on a cold glass"  (id: M2.S3.T4.2D1)
// Subtype: image_reveal  |  Class 6 Physics — States of Water
//
// A before/after time-lapse: a cold ice-water tumbler is left undisturbed and
// tiny droplets nucleate on its outer surface, grow, then merge into bigger
// drops that slide down — while a faint condensation fog builds on the glass.
// Students scrub time, play/pause, reset and "touch" the surface to feel that
// it has turned cold and wet.
//
// Theme: Singularity design system — indigo #4A4DC9 / orange #FF7212,
// purple→orange gradient (#533086 → #FC9145), Poppins, pill buttons.
// Fully responsive: ResizeObserver-driven layout, fluid SVG, viewport-capped
// stage height, touch-friendly targets, and reduced-motion support.
//
// NOTE: All icons are defined inline as self-contained SVG components below,
// so there is NO external icon dependency (e.g. lucide-react). This removes any
// "X is not defined" runtime ReferenceError that occurs when a named icon
// export fails to resolve in a given environment.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ==================== INLINE ICONS (no external dependency) ====================
// Lightweight, dependency-free replacements for the previous lucide-react icons.
// Each accepts `size` and `color` and inherits `currentColor` by default, so
// nothing can ever be "not defined" at runtime.

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

// ==================== TYPE DEFINITIONS ====================

interface SharedState {
  elapsedMinutes: number;
  dropletCount: number;
  dropletSize: number;
  surfaceWet: boolean;
  running: boolean;
}

interface StepDetails {
  currentBeat: 'Predict' | 'Observe';
  elapsedMinutes: number;
  isPaused: boolean;
}

interface DropletAdditionalProps {
  maxMinutes?: number;
  dropletCount?: number;
  iceCubeCount?: number;
  waterColor?: string;
  glassTint?: string;
  startWet?: boolean;
  autoStart?: boolean;
  fullRunSeconds?: number;
  highlightTarget?: 'glass' | 'droplets' | 'ice' | 'surface' | null;
  instruction?: string;
}

interface CondensationGlassToolProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    accentColor?: string;
    darkMode?: boolean;
    animationSpeed?: number;
    showControls?: boolean;
    showTimeSlider?: boolean;
    showTouchButton?: boolean;
    showBeatBadge?: boolean;
    additionalProps?: DropletAdditionalProps;
  };
  setStepDetails?: (s: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ==================== HELPERS ====================

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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

// ==================== GLASS GEOMETRY (SVG viewBox 0 0 400 540) ====================

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

// ==================== MAIN COMPONENT ====================

const CondensationGlassTool: React.FC<CondensationGlassToolProps> = ({
  props = {},
  setStepDetails,
  stopAutoNext,
  setStopAutoNext,
}) => {
  // ---- Theme tokens (Singularity design system) ----
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

  const cfg = useMemo(
    () => ({
      width: props.width ?? 780,
      animationSpeed: props.animationSpeed ?? 1,
      showControls: props.showControls ?? true,
      showTimeSlider: props.showTimeSlider ?? true,
      showTouchButton: props.showTouchButton ?? true,
      showBeatBadge: props.showBeatBadge ?? true,
    }),
    [props]
  );

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
      highlightTarget: ap.highlightTarget ?? null,
      instruction:
        ap.instruction ??
        'Predict what happens on the dry outside of the cold glass, then play the timer and watch droplets appear and grow.',
    }),
    [ap]
  );

  // ---- State ----
  const [elapsed, setElapsed] = useState<number>(settings.startWet ? settings.maxMinutes : 0);
  const [running, setRunning] = useState<boolean>(settings.autoStart && !stopAutoNext);
  const [touched, setTouched] = useState<boolean>(false);
  const [highlight, setHighlight] = useState<DropletAdditionalProps['highlightTarget']>(
    settings.highlightTarget
  );
  const [hover, setHover] = useState<string | null>(null);
  const [press, setPress] = useState<string | null>(null);

  // Responsive: measure the card and derive layout
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardW, setCardW] = useState<number>(cfg.width);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setCardW(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isCompact = cardW < 600;   // stack vertically
  const isTiny = cardW < 380;      // smallest phones

  const rafRef = useRef<number | undefined>(undefined);
  const lastTsRef = useRef<number | null>(null);

  const progress = clamp(elapsed / settings.maxMinutes, 0, 1);
  const beat: 'Predict' | 'Observe' = progress <= 0.001 && !running ? 'Predict' : 'Observe';

  // ---- Pre-computed droplets (stable) ----
  const droplets = useMemo(() => {
    const rng = makeRng(20260623 + settings.dropletCount);
    const list = [];
    for (let i = 0; i < settings.dropletCount; i++) {
      const u = 0.1 + rng() * 0.8;
      const v = 0.12 + rng() * 0.82;
      const birth = Math.pow(rng(), 1.35) * 0.82;
      const maxR = 2.2 + rng() * 5.2;
      const drift = 8 + rng() * 26;
      list.push({
        u,
        v,
        birth,
        maxR,
        drift,
        wob: rng() * Math.PI * 2,
        wobAmp: 0.4 + rng() * 0.8,
        seed: rng(),
      });
    }
    return list.sort((a, b) => a.maxR - b.maxR);
  }, [settings.dropletCount]);

  // A few rivulets (streaks left by merged drops) that draw in at high progress
  const rivulets = useMemo(() => {
    const rng = makeRng(909 + settings.dropletCount);
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
  }, [settings.dropletCount]);

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

  // ---- Ice cubes (stable) ----
  const iceCubes = useMemo(() => {
    const rng = makeRng(7700 + settings.iceCubeCount);
    const cubes = [];
    const span = GLASS.topRight - GLASS.topLeft - 44;
    for (let i = 0; i < settings.iceCubeCount; i++) {
      const x = GLASS.topLeft + 24 + rng() * span;
      const y = GLASS.waterTopY + 4 + rng() * 34;
      const size = 22 + rng() * 12;
      const rot = -22 + rng() * 44;
      // Melt timing: each cube starts shrinking at a slightly different point on
      // the timeline and takes a different amount of time, so the ice visibly
      // melts away (rather than staying frozen) as the glass sits out.
      const meltDelay = rng() * 0.12;       // begins melting at 0–12% of the run
      const meltSpan = 0.6 + rng() * 0.28;  // fully melts over this fraction of time
      cubes.push({ x, y, size, rot, delay: rng() * 3, meltDelay, meltSpan });
    }
    return cubes;
  }, [settings.iceCubeCount]);

  // ---- Inject keyframes + slider styling + Poppins font ----
  useEffect(() => {
    const css = `
      @keyframes cg-fadeUp { from { opacity:0; transform:translateY(14px);} to {opacity:1; transform:translateY(0);} }
      @keyframes cg-floaty { 0%,100%{transform:translateY(0) rotate(var(--r,0deg));} 50%{transform:translateY(-5px) rotate(var(--r,0deg));} }
      @keyframes cg-pulseRing { 0%{box-shadow:0 0 0 0 ${T.primary}66;} 100%{box-shadow:0 0 0 18px ${T.primary}00;} }
      @keyframes cg-tipIn { from{opacity:0; transform:translateY(8px) scale(.95);} to{opacity:1; transform:translateY(0) scale(1);} }
      @keyframes cg-coldGlow { 0%,100%{opacity:.25;} 50%{opacity:.5;} }
      @keyframes cg-sheen { 0%{transform:translateX(-120%);} 60%,100%{transform:translateX(220%);} }
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
    styleEl.id = 'cg-keyframes';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    if (!document.getElementById('cg-poppins')) {
      const fontEl = document.createElement('link');
      fontEl.id = 'cg-poppins';
      fontEl.rel = 'stylesheet';
      fontEl.href =
        'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
      document.head.appendChild(fontEl);
    }
    return () => {
      styleEl.remove();
    };
  }, [T.primary]);

  // ---- Play loop (rAF) ----
  useEffect(() => {
    if (!running || stopAutoNext) {
      lastTsRef.current = null;
      return;
    }
    const perMs =
      settings.maxMinutes / ((settings.fullRunSeconds * 1000) / cfg.animationSpeed);
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      setElapsed((prev) => {
        const next = prev + dt * perMs;
        if (next >= settings.maxMinutes) {
          setRunning(false);
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
  }, [running, stopAutoNext, settings.maxMinutes, settings.fullRunSeconds, cfg.animationSpeed]);

  // ---- Report state to parent ----
  useEffect(() => {
    setStepDetails?.({
      currentBeat: beat,
      elapsedMinutes: Math.round(elapsed * 100) / 100,
      isPaused: !running,
    });
  }, [beat, elapsed, running, setStepDetails]);

  // ---- Public actions ----
  const play = useCallback(() => {
    if (elapsed >= settings.maxMinutes) setElapsed(0);
    setStopAutoNext?.(false);
    setRunning(true);
  }, [elapsed, settings.maxMinutes, setStopAutoNext]);

  const pause = useCallback(() => {
    setRunning(false);
    setStopAutoNext?.(true);
  }, [setStopAutoNext]);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    setTouched(false);
    setHighlight(null);
  }, []);

  const togglePlay = useCallback(() => (running ? pause() : play()), [running, play, pause]);

  // ---- Agent control bridge ----
  const buildState = useCallback(
    (): SharedState => ({
      elapsedMinutes: Math.round(elapsed * 100) / 100,
      dropletCount: visibleDroplets,
      dropletSize: avgSize,
      surfaceWet,
      running,
    }),
    [elapsed, visibleDroplets, avgSize, surfaceWet, running]
  );

  const emit = useCallback((name: string, detail: any) => {
    try {
      window.parent?.postMessage({ type: 'event', name, detail }, '*');
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      window.parent?.postMessage({ type: 'state', state: buildState() }, '*');
    } catch {
      /* noop */
    }
  }, [buildState]);

  const setParam = useCallback(
    (name: string, value: any) => {
      switch (name) {
        case 'elapsedMinutes':
          setElapsed(clamp(Number(value), 0, settings.maxMinutes));
          break;
        case 'running':
          value ? play() : pause();
          break;
        case 'surfaceWet':
          setTouched(Boolean(value));
          break;
        default:
          break;
      }
    },
    [settings.maxMinutes, play, pause]
  );

  useEffect(() => {
    const api = {
      setParam,
      play,
      pause,
      reset,
      highlight: (target: any) => setHighlight(target ?? null),
      getState: () => buildState(),
    };
    (window as any).__condensationTool = api;

    const onMsg = (e: MessageEvent) => {
      const data = e?.data;
      if (!data || data.type !== 'command' || !data.method) return;
      const { method, args = [] } = data;
      try {
        switch (method) {
          case 'setParam':
            setParam(args[0], args[1]);
            break;
          case 'play':
            play();
            break;
          case 'pause':
            pause();
            break;
          case 'reset':
            reset();
            break;
          case 'highlight':
            setHighlight(args[0] ?? null);
            break;
          case 'getState':
            emit('state', buildState());
            break;
          default:
            break;
        }
      } catch {
        /* noop */
      }
    };
    window.addEventListener('message', onMsg);
    return () => {
      window.removeEventListener('message', onMsg);
      if ((window as any).__condensationTool === api) delete (window as any).__condensationTool;
    };
  }, [setParam, play, pause, reset, buildState, emit]);

  const onTouch = useCallback(() => {
    setTouched(true);
    setHighlight('surface');
    emit('touch_surface', { surfaceWet, elapsedMinutes: elapsed });
    window.setTimeout(() => setHighlight(null), 1800);
  }, [emit, surfaceWet, elapsed]);

  // ─────────────────────────────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────────────────────────────
  const fontStack = '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const pill = (key: string, base: React.CSSProperties): React.CSSProperties => ({
    ...base,
    transform: press === key ? 'scale(0.95)' : hover === key ? 'scale(1.04)' : 'scale(1)',
    boxShadow:
      hover === key && !base.opacity ? '0 10px 22px rgba(83,48,134,0.24)' : base.boxShadow,
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

  const styles: { [k: string]: React.CSSProperties } = {
    page: {
      width: '100%',
      boxSizing: 'border-box',
      padding: 'clamp(8px, 2.5vw, 24px)',
      background: T.bg,
      fontFamily: fontStack,
      display: 'flex',
      justifyContent: 'center',
    },
    card: {
      width: '100%',
      maxWidth: `${cfg.width}px`,
      background: T.surface,
      borderRadius: 'clamp(16px, 3vw, 28px)',
      overflow: 'hidden',
      boxShadow: T.dark
        ? '0 24px 60px -20px rgba(0,0,0,0.6)'
        : '0 24px 60px -24px rgba(83,48,134,0.30)',
      border: `1px solid ${T.border}`,
    },
    header: {
      background: T.grad,
      padding: 'clamp(16px, 3.4vw, 30px)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    },
    eyebrow: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 'clamp(9px, 1.6vw, 12px)',
      fontWeight: 600,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      background: 'rgba(255,255,255,0.18)',
      padding: '5px 12px',
      borderRadius: 999,
    },
    title: {
      margin: '12px 0 6px',
      fontSize: 'clamp(19px, 4.4vw, 30px)',
      fontWeight: 700,
      lineHeight: 1.15,
      animation: 'cg-fadeUp 0.5s ease-out',
    },
    subtitle: {
      margin: 0,
      fontSize: 'clamp(12px, 2.3vw, 15px)',
      fontWeight: 400,
      color: 'rgba(255,255,255,0.92)',
      maxWidth: 560,
    },
    body: {
      display: 'flex',
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: 'stretch',
      gap: 'clamp(12px, 2.5vw, 24px)',
      padding: 'clamp(12px, 3vw, 28px)',
    },
    stageWrap: {
      flex: isCompact ? '0 0 auto' : '1 1 46%',
      width: '100%',
      position: 'relative',
      background: T.gradSoft,
      borderRadius: 'clamp(14px, 2.6vw, 22px)',
      padding: 'clamp(6px, 1.6vw, 14px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    svgBox: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
    },
    sidePanel: {
      flex: isCompact ? '0 0 auto' : '1 1 44%',
      width: '100%',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(10px, 2vw, 16px)',
    },
    timeReadout: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      background: T.dark ? '#2A2845' : T.lightCream,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: '13px 16px',
    },
    statRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    statCard: {
      background: T.dark ? '#26243F' : '#FFFFFF',
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    },
    statLabel: { fontSize: 11, fontWeight: 600, color: T.textSoft, letterSpacing: 0.3 },
    statValue: { fontSize: 'clamp(16px, 3vw, 20px)', fontWeight: 700, color: T.text },
    controls: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
    primaryBtn: {
      flex: '1 1 130px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '13px 24px',
      borderRadius: 999,
      border: 'none',
      cursor: 'pointer',
      fontFamily: fontStack,
      fontWeight: 600,
      fontSize: 14,
      color: '#fff',
      background: T.primary,
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      touchAction: 'manipulation',
    },
    outlineBtn: {
      flex: isTiny ? '1 1 130px' : '0 1 auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '13px 22px',
      borderRadius: 999,
      border: `2px solid ${T.primary}`,
      background: 'transparent',
      color: T.primary,
      cursor: 'pointer',
      fontFamily: fontStack,
      fontWeight: 600,
      fontSize: 14,
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      touchAction: 'manipulation',
    },
    touchBtn: {
      width: '100%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '14px 22px',
      borderRadius: 999,
      border: 'none',
      cursor: surfaceWet ? 'pointer' : 'not-allowed',
      fontFamily: fontStack,
      fontWeight: 600,
      fontSize: 14,
      color: '#fff',
      background: surfaceWet ? T.accent : T.track,
      opacity: surfaceWet ? 1 : 0.7,
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      touchAction: 'manipulation',
    },
    sliderWrap: {
      background: T.dark ? '#26243F' : '#FFFFFF',
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: '14px 16px',
    },
    sliderLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12,
      fontWeight: 600,
      color: T.textSoft,
      marginBottom: 12,
    },
    note: {
      fontSize: 'clamp(11px, 2vw, 13px)',
      lineHeight: 1.55,
      color: T.textSoft,
      background: T.dark ? '#221F3A' : T.bg,
      borderLeft: `3px solid ${T.accent}`,
      borderRadius: 10,
      padding: '10px 12px',
    },
    resultCard: {
      borderRadius: 16,
      overflow: 'hidden',
      border: `1.5px solid ${T.accent}`,
      boxShadow: '0 10px 24px -12px rgba(255,114,18,0.45)',
      animation: 'cg-tipIn 0.35s ease-out',
    },
    resultHead: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: T.accent,
      color: '#fff',
      padding: '11px 14px',
      fontWeight: 700,
      fontSize: 13,
      letterSpacing: 0.3,
    },
    resultBody: {
      padding: '13px 15px',
      fontSize: 'clamp(12px, 2.1vw, 14px)',
      lineHeight: 1.6,
      color: T.text,
      background: T.dark ? '#241F3E' : T.lightCream,
    },
  };

  const sliderBg = `linear-gradient(90deg, ${T.deepPurple} 0%, ${T.softOrange} ${
    progress * 100
  }%, ${T.track} ${progress * 100}%, ${T.track} 100%)`;

  // Cap stage height per viewport so a tall glass never dominates a phone
  const svgMaxH = isCompact ? '52vh' : '62vh';

  // ─────────────────────────────────────────────────────────────────
  // RENDER — SVG GLASS
  // ─────────────────────────────────────────────────────────────────
  const waterTop = GLASS.waterTopY;
  const glassGlow =
    highlight === 'glass' || highlight === 'droplets' || highlight === 'surface'
      ? 'drop-shadow(0 0 12px rgba(74,77,201,0.55))'
      : 'none';
  const fogOpacity = clamp(progress * 0.22, 0, 0.22); // condensation haze builds up

  return (
    <div style={styles.page}>
      <div ref={cardRef} style={styles.card}>
        {/* HEADER */}
        <div style={styles.header}>
          {/* moving sheen */}
          <div
            className="cg-sheen-el"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
              transform: 'translateX(-120%)',
              animation: 'cg-sheen 6s ease-in-out 1s infinite',
              pointerEvents: 'none',
            }}
          />
          <span style={styles.eyebrow}>
            <Droplets size={13} /> States of Water · Observe
          </span>
          <h2 style={styles.title}>Droplets forming on a cold glass</h2>
          <p style={styles.subtitle}>
            Leave the cold ice-water glass undisturbed and watch tiny droplets appear on the
            outside, then merge into bigger drops that slide down.
          </p>
        </div>

        {/* BODY */}
        <div style={styles.body}>
          {/* STAGE */}
          <div style={styles.stageWrap}>
            {cfg.showBeatBadge && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  zIndex: 3,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                  background: beat === 'Predict' ? T.primary : T.accent,
                  boxShadow: '0 6px 14px rgba(0,0,0,0.15)',
                }}
              >
                {beat === 'Predict' ? <Eye size={13} /> : <Droplets size={13} />}
                {beat}
              </div>
            )}

            {touched && surfaceWet && (
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 12,
                  zIndex: 4,
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: T.deepPurple,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  animation: 'cg-tipIn 0.3s ease-out',
                  boxShadow: '0 8px 18px rgba(83,48,134,0.35)',
                }}
              >
                <Snowflake size={13} /> Feels cold &amp; wet
              </div>
            )}

            <div style={styles.svgBox}>
              <svg
                viewBox="0 0 400 540"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxWidth: 'min(100%, 360px)',
                  maxHeight: svgMaxH,
                  aspectRatio: '400 / 540',
                  display: 'block',
                  filter: glassGlow,
                  transition: 'filter 0.4s ease',
                }}
                role="img"
                aria-label="A cold glass tumbler with ice water and condensation droplets forming on the outside"
              >
                <defs>
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

                {/* table shadow */}
                <ellipse cx="200" cy="502" rx="120" ry="16" fill="rgba(83,48,134,0.12)" />

                {/* cold halo around the glass that breathes */}
                <ellipse
                  cx="200"
                  cy="305"
                  rx="118"
                  ry="200"
                  fill="#BFE3F5"
                  style={{
                    opacity: 0.18 + progress * 0.18,
                    animation: 'cg-coldGlow 3.5s ease-in-out infinite',
                  }}
                />

                {/* glass body fill */}
                <path d={glassPath} fill="url(#cg-glass)" stroke="#BBD9E8" strokeWidth="2.5" />

                {/* water + ice clipped inside glass */}
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
                    // How melted this cube is: 0 = full cube, 1 = melted away.
                    const meltT = clamp((progress - c.meltDelay) / c.meltSpan, 0, 1);
                    const e = easeInOutQuad(meltT);
                    const curSize = c.size * (1 - 0.92 * e);
                    if (curSize < 1.4) return null; // fully melted → no longer drawn
                    // Corners round off as it melts (sharp cube → smooth lump of ice).
                    const curRx = Math.min(curSize / 2, 5 + e * curSize * 0.5);
                    const cy = c.y + e * 8; // shrinking cube settles a little lower
                    const baseOp = highlight === 'ice' ? 1 : 0.96;
                    const curOp = baseOp * (1 - 0.45 * e); // grows more translucent
                    const hl = curSize * 0.32;
                    return (
                      <g
                        key={i}
                        className="cg-ice"
                        style={{ ['--r' as any]: `${c.rot}deg`, animationDelay: `${c.delay}s` }}
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

                {/* condensation FOG haze over the glass (grows with time) */}
                <path d={glassPath} fill="#F2FAFE" style={{ opacity: fogOpacity, transition: 'opacity 0.25s linear' }} />

                {/* glass rim */}
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

                {/* left specular highlight */}
                <path
                  d={`M ${GLASS.topLeft + 14} ${GLASS.topY + 20} L ${GLASS.botLeft + 16} ${
                    GLASS.bottomY - 24
                  }`}
                  stroke="#ffffff"
                  strokeWidth="7"
                  strokeLinecap="round"
                  opacity="0.45"
                />

                {/* RIVULETS — streaks left by merged drops sliding down */}
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
                        <line
                          x1={top.x}
                          y1={top.y}
                          x2={bottom.x}
                          y2={bottom.y}
                          stroke="url(#cg-drop)"
                          strokeWidth={r.w}
                          strokeLinecap="round"
                        />
                        <ellipse
                          cx={bottom.x}
                          cy={bottom.y}
                          rx={r.w * 1.6}
                          ry={r.w * 2}
                          fill="url(#cg-drop)"
                        />
                      </g>
                    );
                  })}
                </g>

                {/* CONDENSATION DROPLETS (clipped to glass face) */}
                <g clipPath="url(#cg-clip)">
                  {droplets.map((d, i) => {
                    if (progress < d.birth) return null;
                    const age = clamp((progress - d.birth) / (1 - d.birth || 1), 0, 1);
                    // nucleation pop-in for the first 18% of life, then steady growth
                    const pop = age < 0.18 ? easeOutBack(age / 0.18) : 1;
                    const grow = easeOutCubic(age);
                    const r = d.maxR * grow * pop;
                    if (r < 0.3) return null;

                    const isBig = d.maxR > 5;
                    const slide = d.drift * easeInOutQuad(clamp((age - 0.45) / 0.55, 0, 1)) * (isBig ? 1 : 0.3);
                    const p = facePoint(d.u, d.v);
                    // gentle horizontal wobble while small, scaled to glass width
                    const wobble = Math.sin(age * 6 + d.wob) * d.wobAmp * (1 - grow) * (faceWidthAt(d.v) / 160);
                    const cx = p.x + wobble;
                    const cy = p.y + slide;
                    const opacity = clamp(0.32 + age * 0.62, 0, 0.96);
                    return (
                      <g key={i} opacity={opacity}>
                        {isBig && slide > 4 && (
                          <rect
                            x={cx - r * 0.26}
                            y={cy - slide}
                            width={r * 0.52}
                            height={slide}
                            fill="url(#cg-drop)"
                            opacity="0.22"
                            rx={r * 0.26}
                          />
                        )}
                        <ellipse
                          cx={cx}
                          cy={cy}
                          rx={r}
                          ry={r * (isBig ? 1.18 : 1.05)}
                          fill="url(#cg-drop)"
                          stroke="#8FC4DF"
                          strokeWidth="0.4"
                        />
                        <circle
                          cx={cx - r * 0.32}
                          cy={cy - r * 0.36}
                          r={r * 0.28}
                          fill="#ffffff"
                          opacity="0.85"
                        />
                      </g>
                    );
                  })}
                </g>

                {progress <= 0.001 && (
                  <text
                    x="200"
                    y="528"
                    textAnchor="middle"
                    fontFamily={fontStack}
                    fontSize="14"
                    fontWeight="600"
                    fill={T.deepPurple}
                    opacity="0.65"
                  >
                    Outside is dry — what will appear?
                  </text>
                )}
              </svg>
            </div>
          </div>

          {/* SIDE PANEL */}
          <div style={styles.sidePanel}>
            <div style={styles.timeReadout}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600,
                  color: T.text,
                  fontSize: 14,
                }}
              >
                <Clock size={18} color={T.primary} /> Elapsed time
              </span>
              <span style={{ fontWeight: 700, fontSize: 20, color: T.deepPurple }}>
                {elapsed.toFixed(1)} min
              </span>
            </div>

            <div style={styles.statRow}>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>DROPLETS</span>
                <span style={styles.statValue}>{visibleDroplets}</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>SURFACE</span>
                <span style={{ ...styles.statValue, color: surfaceWet ? T.accent : T.textSoft }}>
                  {surfaceWet ? 'Wet' : 'Dry'}
                </span>
              </div>
            </div>

            {cfg.showTimeSlider && (
              <div style={styles.sliderWrap}>
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
                  onChange={(e) => {
                    setRunning(false);
                    setElapsed(Number(e.target.value));
                  }}
                  style={{ width: '100%', background: sliderBg }}
                  aria-label="Scrub the condensation time-lapse"
                />
              </div>
            )}

            {cfg.showControls && (
              <div style={styles.controls}>
                <button {...hoverProps('play')} onClick={togglePlay} style={pill('play', styles.primaryBtn)}>
                  {running ? <Pause size={18} /> : <Play size={18} />}
                  {running ? 'Pause' : elapsed >= settings.maxMinutes ? 'Replay' : 'Play'}
                </button>
                <button
                  {...hoverProps('reset')}
                  onClick={reset}
                  style={pill('reset', styles.outlineBtn)}
                  aria-label="Reset"
                >
                  <RotateCcw size={18} /> Reset
                </button>
              </div>
            )}

            {cfg.showTouchButton && (
              <button
                {...hoverProps('touch')}
                onClick={() => surfaceWet && onTouch()}
                disabled={!surfaceWet}
                style={{
                  ...pill('touch', styles.touchBtn),
                  animation: surfaceWet && !touched ? 'cg-pulseRing 1.6s ease-out infinite' : 'none',
                }}
              >
                <Hand size={18} /> Touch the outer surface
              </button>
            )}

            {touched && surfaceWet && (
              <div style={styles.resultCard} role="status" aria-live="polite">
                <div style={styles.resultHead}>
                  <Snowflake size={18} color="#fff" /> Result — what you felt
                </div>
                <div style={styles.resultBody}>
                  The outside of the glass feels <strong>cold and wet</strong> — tiny water
                  droplets have collected on a surface that started out dry. This water is{' '}
                  <strong>condensation</strong>: invisible water vapour in the warm air touches
                  the cold glass, cools down, and turns back into liquid water on the surface.
                  {' '}<strong>{visibleDroplets}</strong> droplets had formed by{' '}
                  <strong>{elapsed.toFixed(1)} min</strong>.
                </div>
              </div>
            )}

            <div style={styles.note}>{settings.instruction}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CondensationGlassTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════