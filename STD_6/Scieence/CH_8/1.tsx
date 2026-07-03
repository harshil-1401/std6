// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: cloud_formation_tool.tsx
// Themed to the Singularity design system (palette · Poppins · button variants)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RotateCcw, Hand, Plus, Eye, HelpCircle, Sparkles, CloudFog } from 'lucide-react';

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

interface StepDataInterface {
  id: number;
  title: string;
  description: string;
  type: 'intro' | 'explanation' | 'practice' | 'real_world' | 'hands_on';
  mode: ModeType;
  data?: any;
}

interface BaseDataInterface {
  themeColor?: string;
  autoPlayDuration?: number;
}

// ADDITIONAL PROPS - TOOL SPECIFIC
interface CloudFormationAdditionalProps {
  vapourCount?: number; // faint water-vapour specks per bottle
  dustCount?: number; // smoke specks rising from the burnt paper
  squeezeCycles?: number; // squeezes for the fog to reach full density
  showObservationLog?: boolean;
  prefilledObservations?: { observe: string; wonder: string }[];
  bottleLabels?: { plain?: string; dust?: string };
  cloudColor?: string;
  highlightNucleation?: boolean;
}

interface CloudFormationToolProps {
  props?: {
    width?: number;
    height?: number;
    data?: BaseDataInterface;
    steps?: StepDataInterface[];
    initialMode?: ModeType;
    showModeSelector?: boolean;
    enabledModes?: ModeType[];
    showNavigation?: boolean;
    showPlayPause?: boolean;
    showStepIndicator?: boolean;
    initialStep?: number;
    filterSteps?: number[];
    animationSpeed?: number;
    autoPlayDuration?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: CloudFormationAdditionalProps;
  };
  setStepDetails?: (stepDetails: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== DESIGN TOKENS (Singularity design system) =============

const T = {
  indigo: '#4A4DC9',
  purple: '#533086',
  orange: '#FF7212',
  orangeSoft: '#FC9145',
  lavender: '#C1C1EA',
  cream: '#FFF3E4',
  inkDark: '#4E4E4E',
  greyMid: '#CACACA',
  greyLight: '#EBEBEB',
  offWhite: '#F5F5F5',
  white: '#FFFFFF',
  font: '"Poppins", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

// Brand gradients straight from the design file
const G = {
  brand: `linear-gradient(135deg, ${T.indigo}, ${T.purple})`, // indigo → purple
  signature: `linear-gradient(135deg, ${T.purple}, ${T.orangeSoft})`, // purple → soft-orange (the "Poppins" swatch)
  lavenderCream: `linear-gradient(135deg, ${T.lavender}, ${T.cream})`, // lavender → cream
};

// ==================== BUTTON SYSTEM (Singularity spec) ======================
// Four variants — Contained · Outlined · Texted · Highlight — each defined
// across the four interaction states shown in the design file.
type BtnVariant = 'contained' | 'outlined' | 'text' | 'highlight';
type BtnState = 'enabled' | 'hover' | 'pressed' | 'disabled';

const BTN_VARIANTS: Record<BtnVariant, Record<BtnState, { bg: string; fg: string; bd: string; sh: string }>> = {
  // Filled indigo — confirm / primary
  contained: {
    enabled: { bg: T.indigo, fg: T.white, bd: 'transparent', sh: '0 10px 22px -10px rgba(74,77,201,0.6)' },
    hover: { bg: '#5B5ED6', fg: T.white, bd: 'transparent', sh: '0 14px 26px -10px rgba(74,77,201,0.7)' },
    pressed: { bg: T.purple, fg: T.white, bd: 'transparent', sh: '0 6px 14px -8px rgba(83,48,134,0.7)' },
    disabled: { bg: T.greyMid, fg: T.white, bd: 'transparent', sh: 'none' },
  },
  // Filled orange — the single highlighted call-to-action
  highlight: {
    enabled: { bg: `linear-gradient(135deg, ${T.orange}, ${T.orangeSoft})`, fg: T.white, bd: 'transparent', sh: '0 10px 22px -10px rgba(255,114,18,0.6)' },
    hover: { bg: `linear-gradient(135deg, ${T.orangeSoft}, #FFB070)`, fg: T.white, bd: 'transparent', sh: '0 14px 26px -10px rgba(255,114,18,0.72)' },
    pressed: { bg: `linear-gradient(135deg, #E05E00, ${T.orange})`, fg: T.white, bd: 'transparent', sh: '0 6px 14px -8px rgba(224,94,0,0.7)' },
    disabled: { bg: T.greyMid, fg: T.white, bd: 'transparent', sh: 'none' },
  },
  // Bordered — secondary
  outlined: {
    enabled: { bg: 'transparent', fg: T.indigo, bd: T.indigo, sh: 'none' },
    hover: { bg: 'rgba(193,193,234,0.22)', fg: T.indigo, bd: T.indigo, sh: '0 8px 18px -12px rgba(74,77,201,0.5)' },
    pressed: { bg: T.lavender, fg: T.purple, bd: T.indigo, sh: 'none' },
    disabled: { bg: 'transparent', fg: T.greyMid, bd: T.greyMid, sh: 'none' },
  },
  // Text-only — tertiary
  text: {
    enabled: { bg: 'transparent', fg: T.indigo, bd: 'transparent', sh: 'none' },
    hover: { bg: T.greyLight, fg: T.indigo, bd: 'transparent', sh: 'none' },
    pressed: { bg: T.lavender, fg: T.purple, bd: 'transparent', sh: 'none' },
    disabled: { bg: 'transparent', fg: T.greyMid, bd: 'transparent', sh: 'none' },
  },
};

// ==================== DEFAULT STEPS (experiment only) ====================

const DEFAULT_STEPS: StepDataInterface[] = [
  {
    id: 10,
    title: 'Cloud in a Bottle',
    description:
      'Drag the slider to squeeze both bottles, then release. Watch closely: the right bottle has a piece of burnt paper floating in its water, so a real cloud blooms inside it the instant you release — and clears again when you squeeze. The plain bottle on the left stays empty. Each full squeeze-and-release is recorded below; add your own notes too.',
    type: 'hands_on',
    mode: 'hands_on',
    data: { interactive: true },
  },
];

// ==================== HELPERS ====================

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

const AUTO_OBSERVATIONS = [
  {
    observe: 'When I release, a cloud suddenly appears in the right bottle (the one with burnt paper).',
    wonder: 'Where did the cloud come from so quickly?',
  },
  {
    observe: 'The plain bottle on the left stays completely clear.',
    wonder: 'Why does only the bottle with burnt paper make a cloud?',
  },
  {
    observe: 'When I squeeze again the cloud disappears, and it comes back when I release.',
    wonder: 'What is the squeeze and release actually doing to the air?',
  },
  {
    observe: 'After a few squeezes the cloud in the right bottle looks thick and white.',
    wonder: 'Is this the same way real clouds form in the sky?',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// BOTTLE PANEL
// ═══════════════════════════════════════════════════════════════════════════

interface BottlePanelProps {
  hasDust: boolean;
  label: string;
  accent: string;
  softAccent: string;
  compressionRef: React.MutableRefObject<number>; // 0..1, read fresh every animation frame (no per-frame re-render)
  fogEnabled: boolean; // becomes true once primed (after first squeeze) — dust bottle only
  fogIntensity: number; // 0..1 max fog density reachable
  vapourCount: number;
  dustCount: number;
  cloudColor: string;
  reducedMotion: boolean;
  statusText: string;
  statusActive: boolean;
}

const BottlePanel: React.FC<BottlePanelProps> = React.memo(({
  hasDust,
  label,
  accent,
  softAccent,
  compressionRef,
  fogEnabled,
  fogIntensity,
  vapourCount,
  dustCount,
  cloudColor,
  reducedMotion,
  statusText,
  statusActive,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  const sim = useRef({
    W: 300,
    H: 420,
    vapours: [] as { x: number; y: number; vx: number; vy: number; r: number }[],
    dust: [] as { x: number; y: number; r: number; ph: number; sp: number }[],
    fog: [] as { x: number; y: number; r: number; vx: number; vy: number; a: number }[],
    compression: 0,
    prevComp: 0,
    warm: 0,
    cool: 0,
    density: 0, // current fog density 0..1
    mist: 0, // plain-bottle transient wisp
  });

  const cfg = useRef({ fogEnabled, fogIntensity, hasDust, reducedMotion, cloudColor });
  cfg.current = { fogEnabled, fogIntensity, hasDust, reducedMotion, cloudColor };

  const seed = useCallback(
    (W: number, H: number) => {
      const s = sim.current;
      s.W = W;
      s.H = H;
      const air = airRegion(W, H, 0);
      s.vapours = [];
      for (let i = 0; i < vapourCount; i++) {
        s.vapours.push({
          x: air.x0 + Math.random() * (air.x1 - air.x0),
          y: air.y0 + Math.random() * (air.y1 - air.y0),
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3 - 0.04,
          r: 1.1 + Math.random() * 1.1,
        });
      }
      s.dust = [];
      if (hasDust) {
        for (let i = 0; i < dustCount; i++) {
          s.dust.push({
            x: lerp(air.x0, air.x1, 0.3 + Math.random() * 0.4),
            y: lerp(air.y0, air.y1, 0.55 + Math.random() * 0.45),
            r: 1.3 + Math.random() * 1.4,
            ph: Math.random() * Math.PI * 2,
            sp: 0.25 + Math.random() * 0.4,
          });
        }
      }
      // fog puffs fill the whole air space
      s.fog = [];
      const count = 26;
      for (let i = 0; i < count; i++) {
        s.fog.push({
          x: air.x0 + Math.random() * (air.x1 - air.x0),
          y: air.y0 + Math.random() * (air.y1 - air.y0),
          r: (air.x1 - air.x0) * (0.22 + Math.random() * 0.22),
          vx: (Math.random() - 0.5) * 0.18,
          vy: -(0.05 + Math.random() * 0.12),
          a: 0.1 + Math.random() * 0.12,
        });
      }
    },
    [vapourCount, dustCount, hasDust],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const W = Math.max(180, wrap.clientWidth);
      const H = Math.min(Math.round(W * 1.4), 520);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.height = `${H}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(W, H);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      const s = sim.current;
      const c = cfg.current;
      const W = s.W;
      const H = s.H;

      // compression is read straight from the ref each frame (the parent already
      // eases it), so we track it tightly — a light lerp only smooths state jitter
      // and never lags far enough behind to look like a pause.
      const live = compressionRef.current;
      s.compression = lerp(s.compression, live, c.reducedMotion ? 1 : 0.55);
      const d = s.compression - s.prevComp;
      s.prevComp = s.compression;

      // gentle temperature tints
      const warmSteady = s.compression * 0.4;
      s.warm = lerp(s.warm, Math.max(warmSteady, clamp(d * 22, 0, 1)), 0.2);
      s.cool = lerp(s.cool, clamp(-d * 22, 0, 1), 0.2);

      // fog density: blooms on release (low compression), and DISAPPEARS again
      // when squeezed (a moderate squeeze clears it). Clearing is faster than
      // blooming, like the real demo where the cloud vanishes the moment you press.
      let densTarget = 0;
      if (c.hasDust) {
        densTarget = c.fogEnabled ? smoothstep(0.5, 0.12, s.compression) * c.fogIntensity : 0;
      }
      const fogRate = densTarget < s.density ? 0.2 : 0.11;
      s.density = lerp(s.density, densTarget, c.reducedMotion ? 1 : fogRate);

      // The plain bottle never forms a cloud — nothing for vapour to condense on.

      const air = airRegion(W, H, s.compression);
      const sp = c.reducedMotion ? 0 : 1;

      for (const p of s.vapours) {
        p.x += p.vx * sp;
        p.y += p.vy * sp;
        p.vx += (Math.random() - 0.5) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.02;
        p.vx = clamp(p.vx, -0.5, 0.5);
        p.vy = clamp(p.vy, -0.5, 0.5);
        if (p.x < air.x0) { p.x = air.x0; p.vx *= -1; }
        if (p.x > air.x1) { p.x = air.x1; p.vx *= -1; }
        if (p.y < air.y0) { p.y = air.y0; p.vy *= -1; }
        if (p.y > air.y1) { p.y = air.y1; p.vy *= -1; }
      }
      for (const dp of s.dust) {
        dp.ph += 0.02;
        dp.x = clamp(dp.x + Math.cos(dp.ph) * 0.12 * sp, air.x0, air.x1);
        dp.y -= dp.sp * sp * 0.35;
        // keep specks inside the shrinking air space so they stay visible
        // throughout the squeeze instead of slipping below the rising water
        if (dp.y < air.y0) dp.y = air.y1;
        if (dp.y > air.y1) dp.y = air.y1;
      }
      for (const f of s.fog) {
        f.x += f.vx * sp + Math.sin((s.compression + f.y) * 0.01) * 0.05;
        f.y += f.vy * sp;
        if (f.x < air.x0 - 10) f.x = air.x1 + 10;
        if (f.x > air.x1 + 10) f.x = air.x0 - 10;
        if (f.y < air.y0 - 10) { f.y = air.y1 + 8; f.x = air.x0 + Math.random() * (air.x1 - air.x0); }
      }

      drawBottle(ctx, s, c);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        background: T.white,
        borderRadius: 20,
        border: `1px solid ${T.greyLight}`,
        boxShadow: '0 10px 30px -18px rgba(40,30,80,0.35)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '12px 14px',
          background: `linear-gradient(135deg, ${accent}, ${softAccent})`,
          color: T.white,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: 0.2 }}>{label}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.22)',
            backdropFilter: 'blur(6px)',
            whiteSpace: 'nowrap',
            animation: statusActive && !reducedMotion ? 'cfPulse 1.6s ease-in-out infinite' : 'none',
          }}
        >
          {statusText}
        </span>
      </div>

      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          width: '100%',
          background: hasDust
            ? `radial-gradient(120% 80% at 50% 30%, #2c2550, #171130)`
            : `radial-gradient(120% 80% at 50% 30%, #24264a, #14162c)`,
        }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  );
});

// ─────────── geometry (sized by canvas height so the bottle stays proportional) ──

function bottleGeo(W: number, H: number, compression: number) {
  const cx = W / 2;
  const restBodyW = H * 0.36;
  const bodyW = restBodyW * (1 - 0.16 * compression);
  const capW = H * 0.12;
  const capH = H * 0.05;
  const capY = H * 0.03;
  const neckW = H * 0.085;
  const neckH = H * 0.05;
  const shoulderH = H * 0.1;
  const neckBottom = capY + capH + neckH;
  const bodyTop = neckBottom + shoulderH;
  const bodyBottom = H * 0.95;
  const radius = bodyW * 0.18;
  // Water is incompressible: as the bottle narrows under a squeeze, the same
  // volume of water occupies a narrower space, so its level rises (and the air
  // space above it shrinks). waterH scales with 1 / (width ratio)^2.
  const restWaterH = (bodyBottom - bodyTop) * 0.2;
  const ratio = bodyW / restBodyW; // <= 1 when squeezed
  const waterH = Math.min(restWaterH / (ratio * ratio), (bodyBottom - bodyTop) * 0.55);
  const waterTop = bodyBottom - waterH;
  return { cx, capW, capH, capY, neckW, neckH, shoulderH, neckBottom, bodyTop, bodyBottom, bodyW, radius, waterTop, waterH };
}

function airRegion(W: number, H: number, compression: number) {
  const g = bottleGeo(W, H, compression);
  const pad = g.bodyW * 0.1;
  return { x0: g.cx - g.bodyW / 2 + pad, x1: g.cx + g.bodyW / 2 - pad, y0: g.bodyTop + 4, y1: g.waterTop - 3 };
}

function traceBody(ctx: CanvasRenderingContext2D, g: any, comp: number) {
  const bx = g.cx - g.bodyW / 2;
  const bw = g.bodyW;
  const top = g.bodyTop;        // where the straight body wall begins
  const bot = g.bodyBottom;
  const r = g.radius;
  const waist = comp * bw * 0.16;
  const midY = (top + bot) / 2;
  const nL = g.cx - g.neckW / 2; // neck bottom, left
  const nR = g.cx + g.neckW / 2; // neck bottom, right
  const nB = g.neckBottom;       // top of the shoulder
  const sh = g.shoulderH;
  const Lx = bx;                 // body wall, left
  const Rx = bx + bw;            // body wall, right
  ctx.beginPath();
  // start at the neck base (left)
  ctx.moveTo(nL, nB);
  // left shoulder — convex sweep that arrives tangent-vertical onto the body wall
  ctx.bezierCurveTo(nL - 1, nB + sh * 0.5, Lx, top - sh * 0.72, Lx, top);
  // left wall down (with the squeeze waist) to the base curve
  ctx.quadraticCurveTo(Lx + waist, midY, Lx, bot - r);
  ctx.quadraticCurveTo(Lx, bot, Lx + r, bot);
  // base
  ctx.lineTo(Rx - r, bot);
  ctx.quadraticCurveTo(Rx, bot, Rx, bot - r);
  // right wall up (with waist)
  ctx.quadraticCurveTo(Rx - waist, midY, Rx, top);
  // right shoulder back up to the neck — mirror of the left
  ctx.bezierCurveTo(Rx, top - sh * 0.72, nR + 1, nB + sh * 0.5, nR, nB);
  ctx.closePath();
}

function drawBottle(ctx: CanvasRenderingContext2D, s: any, c: { hasDust: boolean; cloudColor: string }) {
  const { W, H } = s;
  ctx.clearRect(0, 0, W, H);
  const g = bottleGeo(W, H, s.compression);
  const bx = g.cx - g.bodyW / 2;
  const bw = g.bodyW;

  // soft ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(60,50,90,0.10)';
  ctx.beginPath();
  ctx.ellipse(g.cx, g.bodyBottom + 6, bw * 0.5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ---- cap (ridged) ----
  ctx.save();
  const capX = g.cx - g.capW / 2;
  const capGrad = ctx.createLinearGradient(capX, 0, capX + g.capW, 0);
  capGrad.addColorStop(0, '#3a3da8');
  capGrad.addColorStop(0.5, T.indigo);
  capGrad.addColorStop(1, '#3a3da8');
  ctx.fillStyle = capGrad;
  roundRect(ctx, capX, g.capY, g.capW, g.capH, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const rx = capX + (g.capW * i) / 6;
    ctx.beginPath();
    ctx.moveTo(rx, g.capY + 2);
    ctx.lineTo(rx, g.capY + g.capH - 2);
    ctx.stroke();
  }
  ctx.restore();

  // ---- neck ----
  ctx.save();
  ctx.fillStyle = 'rgba(220,225,250,0.34)';
  roundRect(ctx, g.cx - g.neckW / 2, g.capY + g.capH - 2, g.neckW, g.neckH + 4, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,216,255,0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // threads
  ctx.strokeStyle = 'rgba(160,160,180,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const yy = g.capY + g.capH + 2 + i * (g.neckH / 3);
    ctx.beginPath();
    ctx.moveTo(g.cx - g.neckW / 2, yy);
    ctx.lineTo(g.cx + g.neckW / 2, yy + 2);
    ctx.stroke();
  }
  ctx.restore();

  // ---- shoulder sheen (part of one continuous body now, just a soft glass highlight) ----
  ctx.save();
  traceBody(ctx, g, s.compression);
  ctx.clip();
  const shBand = g.bodyTop + g.shoulderH * 0.5;
  const shGrad = ctx.createLinearGradient(0, g.neckBottom, 0, shBand);
  shGrad.addColorStop(0, 'rgba(230,234,255,0.30)');
  shGrad.addColorStop(1, 'rgba(230,234,255,0)');
  ctx.fillStyle = shGrad;
  ctx.fillRect(bx, g.neckBottom, bw, shBand - g.neckBottom);
  ctx.restore();

  // ---- body fill ----
  ctx.save();
  traceBody(ctx, g, s.compression);
  const bodyGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  bodyGrad.addColorStop(0, 'rgba(228,232,255,0.30)');
  bodyGrad.addColorStop(0.16, 'rgba(225,230,255,0.07)');
  bodyGrad.addColorStop(0.5, 'rgba(200,205,235,0.03)');
  bodyGrad.addColorStop(0.84, 'rgba(225,230,255,0.07)');
  bodyGrad.addColorStop(1, 'rgba(235,240,255,0.32)');
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.restore();

  // ---- interior contents (clipped to body) ----
  ctx.save();
  traceBody(ctx, g, s.compression);
  ctx.clip();

  // water with meniscus
  const waterGrad = ctx.createLinearGradient(0, g.waterTop, 0, g.bodyBottom);
  waterGrad.addColorStop(0, 'rgba(150,178,224,0.6)');
  waterGrad.addColorStop(1, 'rgba(74,99,170,0.6)');
  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  ctx.moveTo(bx, g.waterTop + 4);
  const tw = performance.now() / 650;
  for (let x = bx; x <= bx + bw; x += 5) {
    const yy = g.waterTop + Math.sin(x / 20 + tw) * 1.8;
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(bx + bw, g.bodyBottom);
  ctx.lineTo(bx, g.bodyBottom);
  ctx.closePath();
  ctx.fill();
  // bright surface line
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let x = bx; x <= bx + bw; x += 5) {
    const yy = g.waterTop + Math.sin(x / 20 + tw) * 1.8;
    if (x === bx) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();

  // burnt paper floating in the water (dust bottle only)
  if (c.hasDust) {
    drawBurntPaper(ctx, g, performance.now());
  }

  // faint water-vapour specks (kept clearly visible at every compression so
  // the bottle never looks empty while it is squeezed)
  for (const p of s.vapours) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  }

  // smoke specks
  if (c.hasDust) {
    for (const dp of s.dust) {
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, dp.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(150,146,156,0.85)';
      ctx.fill();
    }
  }

  // ---- the FOG (realistic volumetric cloud) ----
  const air = airRegion(W, H, s.compression);
  const density = c.hasDust ? s.density : 0;
  if (density > 0.012) {
    ctx.save();
    for (const f of s.fog) {
      const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      const a = clamp(density * f.a * 4.2, 0, 0.85);
      rg.addColorStop(0, hexToRgba(c.cloudColor, a));
      rg.addColorStop(0.55, hexToRgba(c.cloudColor, a * 0.55));
      rg.addColorStop(1, hexToRgba(c.cloudColor, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // overall veil for dense fog
    if (density > 0.4) {
      ctx.fillStyle = hexToRgba(c.cloudColor, (density - 0.4) * 0.5);
      ctx.fillRect(air.x0 - 14, air.y0 - 14, air.x1 - air.x0 + 28, air.y1 - air.y0 + 28);
    }
    ctx.restore();
  }

  // temperature tints
  if (s.warm > 0.02) {
    ctx.fillStyle = hexToRgba(T.orange, 0.07 * s.warm);
    ctx.fillRect(bx, g.bodyTop, bw, g.bodyBottom - g.bodyTop);
  }
  if (s.cool > 0.02) {
    ctx.fillStyle = hexToRgba(T.indigo, 0.08 * s.cool);
    ctx.fillRect(bx, g.bodyTop, bw, g.bodyBottom - g.bodyTop);
  }

  // grip ridges (subtle) on the lower body
  ctx.strokeStyle = 'rgba(214,220,255,0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const yy = lerp(g.waterTop - 12, g.waterTop - 40, i / 2);
    ctx.beginPath();
    ctx.moveTo(bx + 4, yy);
    ctx.lineTo(bx + bw - 4, yy);
    ctx.stroke();
  }

  // glass highlights
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(bx + bw * 0.14, g.bodyTop + 6, Math.max(3, bw * 0.05), (g.bodyBottom - g.bodyTop) * 0.82);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(bx + bw * 0.8, g.bodyTop + 10, Math.max(2, bw * 0.03), (g.bodyBottom - g.bodyTop) * 0.7);
  ctx.restore();

  // body outline
  ctx.save();
  traceBody(ctx, g, s.compression);
  ctx.strokeStyle = 'rgba(214,220,255,0.55)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  // squeeze arrows + hands hint
  if (s.compression > 0.04) {
    const a = clamp(s.compression, 0, 1);
    const midY = (g.bodyTop + g.bodyBottom) / 2;
    drawSqueezeArrow(ctx, bx - 14 - a * 5, midY, 1, a);
    drawSqueezeArrow(ctx, bx + bw + 14 + a * 5, midY, -1, a);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// a realistic charred, curled scrap of newspaper floating at the waterline:
// scorched gradient, curled ashy top edge, glowing ember rim, ash + sparks
function drawBurntPaper(ctx: CanvasRenderingContext2D, g: any, now: number) {
  const w = g.bodyW * 0.5;
  const h = g.waterH * 0.5;
  const cx = g.cx + g.bodyW * 0.015;
  // the soaked scrap floats fully under the surface, drifting in the water column
  const top = g.waterTop + g.waterH * 0.12;
  const bottomY = Math.min(top + h, g.bodyBottom - 8);
  const L = cx - w / 2;
  const R = cx + w / 2;
  const bob = Math.sin(now / 1400) * h * 0.03;
  const drift = Math.sin(now / 1900) * w * 0.03;

  ctx.save();
  ctx.translate(drift, bob);

  // torn, irregular outline of the waterlogged fragment
  const outline: [number, number][] = [
    [L + w * 0.05, top + h * 0.16],
    [L + w * 0.22, top + h * 0.05],
    [L + w * 0.40, top + h * 0.15],
    [L + w * 0.56, top + h * 0.03],
    [L + w * 0.74, top + h * 0.13],
    [L + w * 0.92, top + h * 0.07],
    [R - w * 0.01, top + h * 0.36],
    [R - w * 0.07, bottomY - h * 0.10],
    [R - w * 0.27, bottomY],
    [L + w * 0.52, bottomY - h * 0.06],
    [L + w * 0.30, bottomY],
    [L + w * 0.10, bottomY - h * 0.12],
    [L + w * 0.0, top + h * 0.44],
  ];
  const tracePaper = () => {
    ctx.beginPath();
    outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };

  // soft shadow the scrap casts down through the water beneath it
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#0c1430';
  ctx.beginPath();
  ctx.ellipse(cx, bottomY + h * 0.06, w * 0.42, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // base char gradient: soaked dark char, a touch of wet brown lower down
  tracePaper();
  const pg = ctx.createLinearGradient(0, top, 0, bottomY);
  pg.addColorStop(0.0, '#1c1611');
  pg.addColorStop(0.18, '#130e0a');
  pg.addColorStop(0.5, '#20170f');
  pg.addColorStop(0.78, '#33271c');
  pg.addColorStop(1.0, '#1d150f');
  ctx.fillStyle = pg;
  ctx.fill();

  // mottled scorch patches + faint newsprint lines, clipped to the scrap
  ctx.save();
  tracePaper();
  ctx.clip();
  for (let i = 0; i < 11; i++) {
    const a = (i * 73 + 17) % 100;
    const b = (i * 49 + 31) % 100;
    const px = lerp(L, R, a / 100);
    const py = lerp(top, bottomY, b / 100);
    const pr = w * (0.06 + ((i * 37) % 12) / 100);
    const mg = ctx.createRadialGradient(px, py, 0, px, py, pr);
    const dark = i % 2 === 0;
    mg.addColorStop(0, dark ? 'rgba(6,5,4,0.5)' : 'rgba(64,48,34,0.34)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  // ghost of newsprint text on the less-burnt lower half
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#0c0907';
  ctx.lineWidth = 0.8;
  for (let row = 0; row < 5; row++) {
    const ly = lerp(top + h * 0.54, bottomY - h * 0.14, row / 4);
    let lx = L + w * 0.16;
    ctx.beginPath();
    while (lx < R - w * 0.16) {
      const seg = w * (0.05 + ((row * 3 + lx) % 7) / 90);
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + seg, ly);
      lx += seg + w * 0.035;
    }
    ctx.stroke();
  }
  ctx.restore();

  // crumbly grey ash crust along the torn top edge — softened underwater
  ctx.save();
  tracePaper();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(L + w * 0.05, top + h * 0.16);
  ctx.quadraticCurveTo(cx, top - h * 0.02, R - w * 0.02, top + h * 0.16);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(108,104,98,0.45)';
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const ex = lerp(L + w * 0.08, R - w * 0.06, t);
    const ey = top + h * 0.11 - Math.sin(t * Math.PI) * h * 0.06;
    const er = w * (0.016 + ((i * 31) % 9) / 380);
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? 'rgba(150,146,138,0.4)' : 'rgba(88,82,76,0.45)';
    ctx.fill();
  }
  ctx.restore();

  // wet sheen catching the surface light along the upper edge
  ctx.save();
  tracePaper();
  ctx.clip();
  const sheen = ctx.createLinearGradient(0, top, 0, top + h * 0.4);
  sheen.addColorStop(0, 'rgba(150,178,224,0.34)');
  sheen.addColorStop(1, 'rgba(150,178,224,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(L, top, w, h * 0.4);
  ctx.restore();

  // water tint over the whole scrap so it reads as sitting BEHIND the water,
  // deepening toward the bottom like the surrounding column
  ctx.save();
  tracePaper();
  ctx.clip();
  const tint = ctx.createLinearGradient(0, top, 0, bottomY);
  tint.addColorStop(0, 'rgba(120,150,205,0.2)');
  tint.addColorStop(1, 'rgba(70,95,165,0.42)');
  ctx.fillStyle = tint;
  ctx.fillRect(L, top, w, bottomY - top);
  ctx.restore();

  // a couple of ash specks drifting loose in the water nearby
  for (let i = 0; i < 4; i++) {
    const dx = cx + (((i * 67) % 100) / 100 - 0.5) * w * 1.1;
    const dy = lerp(top - h * 0.12, bottomY + h * 0.1, ((i * 41) % 100) / 100)
      + Math.sin(now / 1600 + i * 1.3) * 2;
    ctx.beginPath();
    ctx.arc(dx, dy, 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(170,176,186,0.4)';
    ctx.fill();
  }

  ctx.restore();
}

function drawSmokePlume(ctx: CanvasRenderingContext2D, g: any, now: number) {
  const baseX = g.cx + g.bodyW * 0.015;
  const baseY = g.waterTop - g.waterH * 0.4; // rises from the smouldering top edge
  const top = g.bodyTop + 6;
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const f = i / 8;
    const y = lerp(baseY, top, f);
    const sway = Math.sin(now / 650 + i * 0.8) * (5 + f * 18);
    const x = baseX + sway;
    const r = lerp(2.2, 11, f);
    const a = (1 - f) * 0.13;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(120,118,124,${a})`;
    ctx.fill();
  }
  ctx.restore();
}

function drawSqueezeArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, a: number) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = T.orange;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - dir * 12, y - 8);
  ctx.lineTo(x - dir * 12, y - 3);
  ctx.lineTo(x - dir * 22, y - 3);
  ctx.lineTo(x - dir * 22, y + 3);
  ctx.lineTo(x - dir * 12, y + 3);
  ctx.lineTo(x - dir * 12, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const CloudFormationTool: React.FC<CloudFormationToolProps> = ({ props = {}, setStepDetails, stopAutoNext, setStopAutoNext }) => {
  const config = useMemo(
    () => ({
      width: props.width ?? 880,
      darkMode: props.darkMode ?? false,
      animationSpeed: props.animationSpeed ?? 1,
    }),
    [props],
  );

  const ap = props.additionalProps || {};
  const aCfg = useMemo(
    () => ({
      vapourCount: ap.vapourCount ?? 34,
      dustCount: ap.dustCount ?? 9,
      squeezeCycles: ap.squeezeCycles ?? 3,
      showObservationLog: ap.showObservationLog ?? true,
      bottleLabels: {
        plain: ap.bottleLabels?.plain ?? 'Plain water',
        dust: ap.bottleLabels?.dust ?? 'Water + burnt paper',
      },
      cloudColor: ap.cloudColor ?? '#FFFFFF',
      highlightNucleation: ap.highlightNucleation ?? true,
      prefilledObservations: ap.prefilledObservations ?? [],
    }),
    [ap],
  );

  const steps = props.steps || DEFAULT_STEPS;
  const currentStep = steps[0];

  const [reducedMotion, setReducedMotion] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null); // active (pressed) button for the design-system states

  // experiment state
  const [squeeze, setSqueeze] = useState(0); // 0..1 live compression (animated by the button)
  const [cycles, setCycles] = useState(0);
  const [primed, setPrimed] = useState(false); // has the student squeezed at least once?
  const [animating, setAnimating] = useState(false); // a squeeze-and-release is playing
  const animRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const compressionRef = useRef(0); // live compression fed straight to the canvases
  const [observations, setObservations] = useState<{ observe: string; wonder: string; id: number }[]>(
    () => aCfg.prefilledObservations.map((o, i) => ({ observe: o.observe, wonder: o.wonder, id: i })),
  );
  const [noteText, setNoteText] = useState('');
  const logIdRef = useRef(aCfg.prefilledObservations.length);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const fn = () => setReducedMotion(mq.matches);
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const [rootW, setRootW] = useState(config.width);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setRootW(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isNarrow = rootW < 680;
  const isTiny = rootW < 440;

  useEffect(() => {
    // Load the Poppins typeface — the Singularity design system face.
    let fontLink = document.getElementById('cf-poppins') as HTMLLinkElement | null;
    if (!fontLink) {
      fontLink = document.createElement('link');
      fontLink.id = 'cf-poppins';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
      document.head.appendChild(fontLink);
    }
    const css = `
      @keyframes cfFadeUp { from { opacity:0; transform:translateY(22px);} to {opacity:1; transform:translateY(0);} }
      @keyframes cfPop { 0%{transform:scale(.7);opacity:0;} 70%{transform:scale(1.06);} 100%{transform:scale(1);opacity:1;} }
      @keyframes cfSlideIn { from{opacity:0; transform:translateX(-14px);} to{opacity:1; transform:translateX(0);} }
      @keyframes cfPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.06);} }
      .cf-input:focus { border-color: ${T.indigo} !important; box-shadow: 0 0 0 3px rgba(74,77,201,0.14); }
    `;
    const tag = document.createElement('style');
    tag.id = 'cf-keyframes';
    tag.textContent = css;
    document.head.appendChild(tag);
    return () => {
      const ex = document.getElementById('cf-keyframes');
      if (ex) ex.remove();
    };
  }, []);

  useEffect(() => {
    setStepDetails?.({ currentStep: 1, totalSteps: 1, isPaused: true, currentMode: 'hands_on' });
  }, [setStepDetails]);

  const recordCycle = useCallback(() => {
    setCycles((prev) => {
      const next = prev + 1;
      const obs = AUTO_OBSERVATIONS[Math.min(next - 1, AUTO_OBSERVATIONS.length - 1)];
      setObservations((list) => [...list, { ...obs, id: logIdRef.current++ }]);
      return next;
    });
  }, []);

  const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // Press the button → one continuous squeeze-and-release. The bottle eases in to
  // full squeeze (cloud clears, water rises) and immediately eases back out (cloud
  // blooms). There is no flat hold in the middle, so the motion never "pauses".
  const runSqueeze = () => {
    if (runningRef.current) return;
    setStopAutoNext?.(true);
    if (!primed) setPrimed(true);

    if (reducedMotion) {
      // no animation — go straight to the released (cloud-formed) state
      compressionRef.current = 0;
      setSqueeze(0);
      recordCycle();
      return;
    }

    runningRef.current = true;
    setAnimating(true);
    const t0 = performance.now();
    const DUR = 1400;
    const PEAK = 0.46; // moment of fullest squeeze, then it eases straight back
    const frame = () => {
      const p = clamp((performance.now() - t0) / DUR, 0, 1);
      // continuous up-and-down: ease in to 1 at PEAK, ease back to 0 by the end
      const v = p < PEAK ? easeInOut(p / PEAK) : 1 - easeInOut((p - PEAK) / (1 - PEAK));
      compressionRef.current = v;
      setSqueeze(v); // drives the meter / status text only
      if (p >= 1) {
        compressionRef.current = 0;
        setSqueeze(0);
        runningRef.current = false;
        setAnimating(false);
        recordCycle();
        return;
      }
      animRef.current = requestAnimationFrame(frame);
    };
    animRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const handleReset = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    runningRef.current = false;
    setAnimating(false);
    setCycles(0);
    compressionRef.current = 0;
    setSqueeze(0);
    setPrimed(false);
    setObservations(aCfg.prefilledObservations.map((o, i) => ({ observe: o.observe, wonder: o.wonder, id: i })));
    logIdRef.current = aCfg.prefilledObservations.length;
  };

  const addNote = () => {
    const txt = noteText.trim();
    if (!txt) return;
    setObservations((prev) => [...prev, { observe: txt, wonder: '', id: logIdRef.current++ }]);
    setNoteText('');
  };

  // fog intensity grows a little with each completed squeeze
  const fogIntensity = clamp(0.66 + cycles * 0.14, 0.66, 1);
  // live fog density of the dust bottle (for the meter + status)
  const dustDensity = primed ? smoothstep(0.5, 0.12, squeeze) * fogIntensity : 0;

  const plainStatus = squeeze > 0.5 ? 'Clear' : primed ? 'Still clear' : 'Ready';
  const dustStatus = !primed
    ? 'Ready'
    : dustDensity > 0.55
      ? 'Cloudy!'
      : dustDensity > 0.12
        ? 'Cloud forming…'
        : 'Clearing…';

  const colors = {
    surface: config.darkMode ? '#1b1733' : T.white,
    page: config.darkMode ? '#141026' : T.offWhite,
    text: config.darkMode ? '#ECEAFB' : '#2A2540',
    textSub: config.darkMode ? '#A9A4C9' : '#6B6685',
    border: config.darkMode ? '#2E2950' : T.greyLight,
  };
  const padBase = isTiny ? 16 : isNarrow ? 22 : 32;

  // ── Singularity design-system button helpers ──────────────────────────────
  // pointer handlers drive the hover / pressed states used by dsBtn
  const pressHandlers = (id: string) => ({
    onMouseEnter: () => setHovered(id),
    onMouseLeave: () => {
      setHovered((h) => (h === id ? null : h));
      setPressedId((p) => (p === id ? null : p));
    },
    onMouseDown: () => setPressedId(id),
    onMouseUp: () => setPressedId((p) => (p === id ? null : p)),
    onTouchStart: () => setPressedId(id),
    onTouchEnd: () => setPressedId((p) => (p === id ? null : p)),
  });

  // builds a button style from the variant matrix, picking the live state
  const dsBtn = (
    id: string,
    variant: BtnVariant,
    opts: { disabled?: boolean; fullWidth?: boolean; lift?: boolean; extra?: React.CSSProperties } = {},
  ): React.CSSProperties => {
    const { disabled = false, fullWidth = false, lift = true, extra = {} } = opts;
    const state: BtnState = disabled ? 'disabled' : pressedId === id ? 'pressed' : hovered === id ? 'hover' : 'enabled';
    const v = BTN_VARIANTS[variant][state];
    const isHover = state === 'hover';
    const isPressed = state === 'pressed';
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: isTiny ? '11px 18px' : '13px 24px', // 24px horizontal per the design spec
      borderRadius: 999, // fully-rounded pill per the design spec
      border: `1.5px solid ${v.bd}`,
      background: v.bg,
      color: v.fg,
      boxShadow: v.sh,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: 600,
      fontSize: isTiny ? 13 : 14.5,
      fontFamily: T.font,
      width: fullWidth ? '100%' : undefined,
      transform:
        lift && !disabled
          ? isPressed
            ? 'translateY(1px) scale(0.99)'
            : isHover
              ? 'translateY(-2px) scale(1.02)'
              : 'none'
          : 'none',
      transition:
        'transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease, background .2s ease, color .2s ease, border-color .2s ease',
      ...extra,
    };
  };

  return (
    <div
      ref={rootRef}
      style={{
        width: '100%',
        maxWidth: config.width,
        margin: '0 auto',
        background: colors.page,
        borderRadius: 26,
        overflow: 'hidden',
        fontFamily: T.font,
        boxShadow: '0 30px 60px -28px rgba(40,30,80,0.45)',
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          margin: isTiny ? 14 : 22,
          marginBottom: 0,
          padding: padBase,
          borderRadius: 22,
          background: G.brand,
          color: T.white,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 85% -20%, rgba(255,255,255,0.25), transparent 55%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            opacity: 0.92,
            marginBottom: 10,
          }}
        >
          <CloudFog size={15} /> Activity 8.10 · Class 6 Science
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: isTiny ? 22 : isNarrow ? 26 : 31,
            fontWeight: 700,
            lineHeight: 1.15,
            animation: reducedMotion ? 'none' : 'cfFadeUp .5s ease-out',
          }}
        >
          {currentStep?.title}
        </h2>
      </div>

      {/* Content */}
      <div style={{ padding: padBase }}>
        {/* two bottles side by side */}
        <div style={{ display: 'flex', gap: isTiny ? 12 : 18, flexDirection: isNarrow ? 'column' : 'row' }}>
          <BottlePanel
            hasDust={false}
            label={aCfg.bottleLabels.plain}
            accent={T.indigo}
            softAccent={T.purple}
            compressionRef={compressionRef}
            fogEnabled={false}
            fogIntensity={0}
            vapourCount={aCfg.vapourCount}
            dustCount={0}
            cloudColor={aCfg.cloudColor}
            reducedMotion={reducedMotion}
            statusText={plainStatus}
            statusActive={false}
          />
          <BottlePanel
            hasDust
            label={aCfg.bottleLabels.dust}
            accent={T.orange}
            softAccent={T.orangeSoft}
            compressionRef={compressionRef}
            fogEnabled={primed}
            fogIntensity={fogIntensity}
            vapourCount={aCfg.vapourCount}
            dustCount={aCfg.dustCount}
            cloudColor={aCfg.cloudColor}
            reducedMotion={reducedMotion}
            statusText={dustStatus}
            statusActive={primed && dustDensity > 0.12}
          />
        </div>

        {/* squeeze button below the animation */}
        <div
          style={{
            marginTop: 18,
            padding: isTiny ? 16 : 20,
            background: colors.surface,
            borderRadius: 18,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 10px 28px -20px rgba(40,30,80,0.4)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14.5, color: colors.text, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Hand size={17} color={T.indigo} />
              Squeeze the bottles
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: colors.textSub }}>
              {animating ? (squeeze > 0.55 ? 'Squeezing…' : 'Releasing…') : primed ? 'Released' : 'Ready'}
            </span>
          </div>

          {/* Highlight button — the single orange call-to-action from the design file */}
          <button
            onClick={runSqueeze}
            disabled={animating}
            {...pressHandlers('squeeze')}
            style={dsBtn('squeeze', 'highlight', {
              fullWidth: true,
              lift: !animating,
              extra: {
                padding: isTiny ? '14px 18px' : '16px 24px',
                fontSize: isTiny ? 15 : 16.5,
                cursor: animating ? 'default' : 'pointer',
                opacity: animating ? 0.82 : 1,
              },
            })}
          >
            <Hand size={19} /> {animating ? 'Squeezing & releasing…' : 'Squeeze & release'}
          </button>

          <div style={{ fontSize: 12.5, color: colors.textSub, marginTop: 12, lineHeight: 1.5 }}>
            Each press squeezes both bottles and lets go. As they squeeze, any cloud{' '}
            <strong style={{ color: colors.text }}>clears</strong>; the moment they release, a cloud{' '}
            <strong style={{ color: colors.text }}>blooms</strong> in the burnt-paper bottle. Press again to make it thicker.
          </div>

          <div
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ flex: '1 1 220px', minWidth: 180 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: colors.textSub, marginBottom: 6 }}>
                <span>Cloud in burnt-paper bottle</span>
                <span>{Math.round(dustDensity * 100)}%</span>
              </div>
              <div style={{ height: 10, background: colors.border, borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${dustDensity * 100}%`,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${T.orangeSoft}, ${T.orange})`,
                    transition: 'width .12s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 11.5, color: colors.textSub, marginTop: 6 }}>
                Completed squeezes: <strong style={{ color: colors.text }}>{cycles}</strong>
              </div>
            </div>
            {/* Outlined button — secondary action */}
            <button onClick={handleReset} {...pressHandlers('reset')} style={dsBtn('reset', 'outlined')}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </div>

        {/* legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'center',
            margin: '16px 0 4px',
            fontSize: 12.5,
            color: colors.textSub,
            fontWeight: 500,
          }}
        >
          <Legend dot="rgba(120,120,160,0.9)" label="Water vapour" />
          <Legend dot={T.inkDark} label="Smoke from burnt paper" />
          <Legend dot="#FFFFFF" ring label="Condensed cloud" />
        </div>

        {/* narration */}
        <div
          style={{
            marginTop: 14,
            padding: isTiny ? 16 : 22,
            background: colors.surface,
            borderRadius: 18,
            borderLeft: `5px solid ${T.indigo}`,
            color: colors.text,
            fontSize: isTiny ? 14.5 : 16,
            lineHeight: 1.65,
            boxShadow: '0 10px 28px -20px rgba(40,30,80,0.4)',
          }}
        >
          {currentStep?.description}
        </div>

        {/* nucleation hint */}
        {aCfg.highlightNucleation && primed && (
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 9,
              padding: '11px 15px',
              borderRadius: 14,
              background: T.cream,
              color: '#7a4a12',
              fontSize: 13.5,
              lineHeight: 1.5,
              animation: reducedMotion ? 'none' : 'cfPop .4s ease-out',
            }}
          >
            <Sparkles size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              When you release, the cooled water vapour condenses onto the tiny smoke specks from the
              burnt paper — that is the cloud you can see. The plain bottle has no specks, so nothing forms.
            </span>
          </div>
        )}

        {/* observation log */}
        {aCfg.showObservationLog && (
          <div style={{ marginTop: 16, background: colors.surface, borderRadius: 18, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div
              style={{
                padding: '13px 18px',
                background: G.brand,
                color: T.white,
                fontWeight: 600,
                fontSize: 14.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Eye size={16} /> Observation log
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isTiny ? '1fr' : '1fr 1fr', gap: 1, background: colors.border }}>
              <ColHead text="I observe" icon={<Eye size={14} />} bg={colors.page} color={colors.textSub} show />
              <ColHead text="I wonder" icon={<HelpCircle size={14} />} bg={colors.page} color={colors.textSub} show={!isTiny} />
            </div>

            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {observations.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: colors.textSub, fontSize: 13.5 }}>
                  Squeeze and release a bottle to record your first observation.
                </div>
              )}
              {observations.map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isTiny ? '1fr' : '1fr 1fr',
                    gap: 1,
                    background: colors.border,
                    animation: reducedMotion ? 'none' : 'cfSlideIn .35s ease-out',
                  }}
                >
                  <div style={{ padding: '12px 16px', background: colors.surface, fontSize: 13.5, color: colors.text, lineHeight: 1.5 }}>{o.observe}</div>
                  <div style={{ padding: '12px 16px', background: colors.surface, fontSize: 13.5, color: o.wonder ? colors.text : colors.textSub, lineHeight: 1.5 }}>
                    {o.wonder || '—'}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: `1px solid ${colors.border}`, background: colors.page }}>
              <input
                className="cf-input"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
                placeholder="Add your own observation…"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '11px 14px',
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  fontFamily: T.font,
                  fontSize: 14,
                  color: colors.text,
                  background: colors.surface,
                  outline: 'none',
                  transition: 'border-color .2s ease, box-shadow .2s ease',
                }}
              />
              {/* Contained button — confirm action */}
              <button onClick={addNote} {...pressHandlers('add')} style={dsBtn('add', 'contained', { extra: { padding: '11px 16px' } })}>
                <Plus size={16} /> {isTiny ? '' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Legend: React.FC<{ dot: string; label: string; ring?: boolean }> = ({ dot, label, ring }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        background: dot,
        border: ring ? '1px solid #CACACA' : 'none',
        boxShadow: ring ? '0 0 6px rgba(255,255,255,0.9)' : 'none',
        display: 'inline-block',
      }}
    />
    {label}
  </span>
);

const ColHead: React.FC<{ text: string; icon: React.ReactNode; bg: string; color: string; show: boolean }> = ({ text, icon, bg, color, show }) =>
  show ? (
    <div
      style={{
        padding: '10px 16px',
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 12.5,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
      }}
    >
      {icon} {text}
    </div>
  ) : (
    <span style={{ display: 'none' }} />
  );

export default CloudFormationTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════