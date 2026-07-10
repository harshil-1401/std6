// ═══════════════════════════════════════════════════════════════════════════
// cloud_formation_tool.tsx
// Tool: cloud_formation_tool — "Dust particles help water vapour condense into
// a cloud" (the classic cloud-in-a-bottle demonstration). Class 6 Science.
// Two squeezable bottles rendered on <canvas> (procedural, hand-tuned physics)
// driven end-to-end by the agent-control postMessage contract described in
// the sidecar JSON (windowMethods / events / validIds).
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TOOL_ID = 'cloud_formation_tool';
const emit = (m: any) => { try { window.parent.postMessage(m, '*'); } catch {} };

// ==================== INLINE ICONS (no lucide-react) ====================
// The production iframe renderer only injects a fixed icon allowlist; an
// external icon package name can throw "X is not defined" at runtime. These
// tiny inline SVGs depend on nothing external.
interface IconProps { size?: number; color?: string; style?: React.CSSProperties; }
const mkIcon = (paths: React.ReactNode) => {
  const Cmp: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} aria-hidden="true">
      {paths}
    </svg>
  );
  return Cmp;
};
const CloudIcon = mkIcon(<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />);
const HandIcon = mkIcon(<><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" /><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" /><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L6 14" /></>);
const EyeIcon = mkIcon(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>);
const HelpIcon = mkIcon(<><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 2-3 4" /><path d="M12 17h.01" /></>);
const SparklesIcon = mkIcon(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6 6 2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></>);
const PlusIcon = mkIcon(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
const EraserIcon = mkIcon(<><path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 19" /><path d="M22 21H7" /><path d="m5 11 9 9" /></>);
const Volume2Icon = mkIcon(<><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>);
const VolumeXIcon = mkIcon(<><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="m22 9-6 6" /><path d="m16 9 6 6" /></>);
const CapIcon = mkIcon(<><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" /></>);
const UserIcon = mkIcon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>);
const CheckIcon = mkIcon(<path d="M20 6 9 17l-5-5" />);
const FlagIcon = mkIcon(<><path d="M4 22V4" /><path d="M4 4h13l-2.5 4L17 12H4" /></>);

// ==================== DESIGN TOKENS (Singularity design system) =============
const T = {
  indigo: '#4A4DC9', indigoHi: '#5B5ED6', purple: '#533086',
  orange: '#FF7212', orangeSoft: '#FC9145',
  lavender: '#C1C1EA', cream: '#FFF3E4',
  inkDark: '#4E4E4E', greyMid: '#CACACA', greyLight: '#EBEBEB', offWhite: '#F5F5F5', white: '#FFFFFF',
  success: '#1E9E5A', amber: '#F5A623',
  font: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
};
const G = {
  brand: `linear-gradient(135deg, ${T.indigo}, ${T.purple})`,
  signature: `linear-gradient(135deg, ${T.purple}, ${T.orangeSoft})`,
  highlight: `linear-gradient(135deg, ${T.orange}, ${T.orangeSoft})`,
};
const DARK = { bg: '#141026', surface: '#1b1733', surface2: '#241f42', text: '#ECEAFB', textSub: '#A9A4C9', border: '#2E2950' };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

const AUTO_OBSERVATIONS = [
  { observe: 'When I release, a cloud suddenly appears in the right bottle (the one with burnt paper).', wonder: 'Where did the cloud come from so quickly?' },
  { observe: 'The plain bottle on the left stays completely clear.', wonder: 'Why does only the bottle with burnt paper make a cloud?' },
  { observe: 'When I squeeze again the cloud disappears, and it comes back when I release.', wonder: 'What is the squeeze and release actually doing to the air?' },
  { observe: 'After a few squeezes the cloud in the right bottle looks thick and white.', wonder: 'Is this the same way real clouds form in the sky?' },
];

const LEARNED_POINTS = [
  'A cloud needs tiny dust or smoke specks (condensation nuclei) for water vapour to condense onto.',
  'Squeezing warms the trapped air and clears any cloud; releasing lets it expand and cool, so a cloud can bloom.',
  'The plain-water bottle never clouds because it has nothing for the vapour to gather on.',
  'Real clouds in the sky form the same way — around dust, smoke or salt specks floating in the air.',
];

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS BOTTLE PHYSICS — adapted from the original hand-tuned rendering.
// Bottle geometry is a pure function of the canvas HEIGHT, so it always stays
// proportioned no matter how the surrounding flex layout shapes the width.
// ═══════════════════════════════════════════════════════════════════════════

function bottleGeo(H: number, compression: number) {
  // A believable bottle silhouette is tall and slender — roughly a third as wide as
  // it is tall — with a clear waist/shoulder taper into the neck, not a wide box
  // with a small neck stuck on top.
  const restBodyW = H * 0.34;
  const bodyW = restBodyW * (1 - 0.16 * compression);
  const capW = H * 0.12, capH = H * 0.05, capY = H * 0.03;
  const neckW = H * 0.085, neckH = H * 0.05, shoulderH = H * 0.1;
  const neckBottom = capY + capH + neckH;
  const bodyTop = neckBottom + shoulderH;
  const bodyBottom = H * 0.95;
  const radius = bodyW * 0.18;
  const restWaterH = (bodyBottom - bodyTop) * 0.2;
  const ratio = bodyW / restBodyW;
  const waterH = Math.min(restWaterH / (ratio * ratio), (bodyBottom - bodyTop) * 0.55);
  const waterTop = bodyBottom - waterH;
  return { capW, capH, capY, neckW, neckH, shoulderH, neckBottom, bodyTop, bodyBottom, bodyW, radius, waterTop, waterH };
}
function airRegion(W: number, H: number, compression: number) {
  const g = bottleGeo(H, compression);
  const cx = W / 2;
  const pad = g.bodyW * 0.1;
  return { x0: cx - g.bodyW / 2 + pad, x1: cx + g.bodyW / 2 - pad, y0: g.bodyTop + 4, y1: g.waterTop - 3 };
}
function traceBody(ctx: CanvasRenderingContext2D, W: number, g: any, comp: number) {
  const cx = W / 2;
  const bx = cx - g.bodyW / 2, bw = g.bodyW;
  const top = g.bodyTop, bot = g.bodyBottom, r = g.radius;
  const waist = comp * bw * 0.16;
  const midY = (top + bot) / 2;
  const nL = cx - g.neckW / 2, nR = cx + g.neckW / 2, nB = g.neckBottom, sh = g.shoulderH;
  const Lx = bx, Rx = bx + bw;
  ctx.beginPath();
  ctx.moveTo(nL, nB);
  ctx.bezierCurveTo(nL - 1, nB + sh * 0.5, Lx, top - sh * 0.72, Lx, top);
  ctx.quadraticCurveTo(Lx + waist, midY, Lx, bot - r);
  ctx.quadraticCurveTo(Lx, bot, Lx + r, bot);
  ctx.lineTo(Rx - r, bot);
  ctx.quadraticCurveTo(Rx, bot, Rx, bot - r);
  ctx.quadraticCurveTo(Rx - waist, midY, Rx, top);
  ctx.bezierCurveTo(Rx, top - sh * 0.72, nR + 1, nB + sh * 0.5, nR, nB);
  ctx.closePath();
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
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const r = parseInt(full.substring(0, 2), 16), g = parseInt(full.substring(2, 4), 16), b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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

// a charred, curled scrap of newspaper floating at the waterline
function drawBurntPaper(ctx: CanvasRenderingContext2D, W: number, g: any, now: number) {
  const cx = W / 2 + g.bodyW * 0.015;
  const w = g.bodyW * 0.5, h = g.waterH * 0.5;
  const top = g.waterTop + g.waterH * 0.12;
  const bottomY = Math.min(top + h, g.bodyBottom - 8);
  const L = cx - w / 2, R = cx + w / 2;
  const bob = Math.sin(now / 1400) * h * 0.03;
  const drift = Math.sin(now / 1900) * w * 0.03;
  ctx.save();
  ctx.translate(drift, bob);
  const outline: [number, number][] = [
    [L + w * 0.05, top + h * 0.16], [L + w * 0.22, top + h * 0.05], [L + w * 0.40, top + h * 0.15],
    [L + w * 0.56, top + h * 0.03], [L + w * 0.74, top + h * 0.13], [L + w * 0.92, top + h * 0.07],
    [R - w * 0.01, top + h * 0.36], [R - w * 0.07, bottomY - h * 0.10], [R - w * 0.27, bottomY],
    [L + w * 0.52, bottomY - h * 0.06], [L + w * 0.30, bottomY], [L + w * 0.10, bottomY - h * 0.12], [L + w * 0.0, top + h * 0.44],
  ];
  const tracePaper = () => { ctx.beginPath(); outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };

  ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#0c1430';
  ctx.beginPath(); ctx.ellipse(cx, bottomY + h * 0.06, w * 0.42, h * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  tracePaper();
  const pg = ctx.createLinearGradient(0, top, 0, bottomY);
  pg.addColorStop(0.0, '#1c1611'); pg.addColorStop(0.18, '#130e0a'); pg.addColorStop(0.5, '#20170f'); pg.addColorStop(0.78, '#33271c'); pg.addColorStop(1.0, '#1d150f');
  ctx.fillStyle = pg; ctx.fill();

  ctx.save(); tracePaper(); ctx.clip();
  for (let i = 0; i < 11; i++) {
    const a = (i * 73 + 17) % 100, b = (i * 49 + 31) % 100;
    const px = lerp(L, R, a / 100), py = lerp(top, bottomY, b / 100), pr = w * (0.06 + ((i * 37) % 12) / 100);
    const mg = ctx.createRadialGradient(px, py, 0, px, py, pr);
    const dark = i % 2 === 0;
    mg.addColorStop(0, dark ? 'rgba(6,5,4,0.5)' : 'rgba(64,48,34,0.34)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 0.14; ctx.strokeStyle = '#0c0907'; ctx.lineWidth = 0.8;
  for (let row = 0; row < 5; row++) {
    const ly = lerp(top + h * 0.54, bottomY - h * 0.14, row / 4);
    let lx = L + w * 0.16;
    ctx.beginPath();
    while (lx < R - w * 0.16) { const seg = w * (0.05 + ((row * 3 + lx) % 7) / 90); ctx.moveTo(lx, ly); ctx.lineTo(lx + seg, ly); lx += seg + w * 0.035; }
    ctx.stroke();
  }
  ctx.restore();

  ctx.save(); tracePaper(); ctx.clip();
  ctx.beginPath(); ctx.moveTo(L + w * 0.05, top + h * 0.16);
  ctx.quadraticCurveTo(cx, top - h * 0.02, R - w * 0.02, top + h * 0.16);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(108,104,98,0.45)'; ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const t = i / 7, ex = lerp(L + w * 0.08, R - w * 0.06, t), ey = top + h * 0.11 - Math.sin(t * Math.PI) * h * 0.06, er = w * (0.016 + ((i * 31) % 9) / 380);
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? 'rgba(150,146,138,0.4)' : 'rgba(88,82,76,0.45)'; ctx.fill();
  }
  ctx.restore();

  ctx.save(); tracePaper(); ctx.clip();
  const sheen = ctx.createLinearGradient(0, top, 0, top + h * 0.4);
  sheen.addColorStop(0, 'rgba(150,178,224,0.34)'); sheen.addColorStop(1, 'rgba(150,178,224,0)');
  ctx.fillStyle = sheen; ctx.fillRect(L, top, w, h * 0.4); ctx.restore();

  ctx.save(); tracePaper(); ctx.clip();
  const tint = ctx.createLinearGradient(0, top, 0, bottomY);
  tint.addColorStop(0, 'rgba(120,150,205,0.2)'); tint.addColorStop(1, 'rgba(70,95,165,0.42)');
  ctx.fillStyle = tint; ctx.fillRect(L, top, w, bottomY - top); ctx.restore();

  for (let i = 0; i < 4; i++) {
    const dx = cx + (((i * 67) % 100) / 100 - 0.5) * w * 1.1;
    const dy = lerp(top - h * 0.12, bottomY + h * 0.1, ((i * 41) % 100) / 100) + Math.sin(now / 1600 + i * 1.3) * 2;
    ctx.beginPath(); ctx.arc(dx, dy, 0.9, 0, Math.PI * 2); ctx.fillStyle = 'rgba(170,176,186,0.4)'; ctx.fill();
  }
  ctx.restore();
}

function drawBottle(ctx: CanvasRenderingContext2D, s: any, c: { hasDust: boolean; cloudColor: string }) {
  const { W, H } = s;
  ctx.clearRect(0, 0, W, H);
  const g = bottleGeo(H, s.compression);
  const cx = W / 2;
  const bx = cx - g.bodyW / 2, bw = g.bodyW;

  ctx.save(); ctx.fillStyle = 'rgba(60,50,90,0.10)';
  ctx.beginPath(); ctx.ellipse(cx, g.bodyBottom + 6, bw * 0.5, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  ctx.save();
  const capX = cx - g.capW / 2;
  const capGrad = ctx.createLinearGradient(capX, 0, capX + g.capW, 0);
  capGrad.addColorStop(0, '#3a3da8'); capGrad.addColorStop(0.5, T.indigo); capGrad.addColorStop(1, '#3a3da8');
  ctx.fillStyle = capGrad; roundRect(ctx, capX, g.capY, g.capW, g.capH, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) { const rx = capX + (g.capW * i) / 6; ctx.beginPath(); ctx.moveTo(rx, g.capY + 2); ctx.lineTo(rx, g.capY + g.capH - 2); ctx.stroke(); }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(220,225,250,0.34)';
  roundRect(ctx, cx - g.neckW / 2, g.capY + g.capH - 2, g.neckW, g.neckH + 4, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(210,216,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(160,160,180,0.5)'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) { const yy = g.capY + g.capH + 2 + i * (g.neckH / 3); ctx.beginPath(); ctx.moveTo(cx - g.neckW / 2, yy); ctx.lineTo(cx + g.neckW / 2, yy + 2); ctx.stroke(); }
  ctx.restore();

  ctx.save(); traceBody(ctx, W, g, s.compression); ctx.clip();
  const shBand = g.bodyTop + g.shoulderH * 0.5;
  const shGrad = ctx.createLinearGradient(0, g.neckBottom, 0, shBand);
  shGrad.addColorStop(0, 'rgba(230,234,255,0.30)'); shGrad.addColorStop(1, 'rgba(230,234,255,0)');
  ctx.fillStyle = shGrad; ctx.fillRect(bx, g.neckBottom, bw, shBand - g.neckBottom); ctx.restore();

  ctx.save(); traceBody(ctx, W, g, s.compression);
  const bodyGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  bodyGrad.addColorStop(0, 'rgba(228,232,255,0.30)'); bodyGrad.addColorStop(0.16, 'rgba(225,230,255,0.07)');
  bodyGrad.addColorStop(0.5, 'rgba(200,205,235,0.03)'); bodyGrad.addColorStop(0.84, 'rgba(225,230,255,0.07)'); bodyGrad.addColorStop(1, 'rgba(235,240,255,0.32)');
  ctx.fillStyle = bodyGrad; ctx.fill(); ctx.restore();

  ctx.save(); traceBody(ctx, W, g, s.compression); ctx.clip();

  const waterGrad = ctx.createLinearGradient(0, g.waterTop, 0, g.bodyBottom);
  waterGrad.addColorStop(0, 'rgba(150,178,224,0.6)'); waterGrad.addColorStop(1, 'rgba(74,99,170,0.6)');
  ctx.fillStyle = waterGrad;
  ctx.beginPath(); ctx.moveTo(bx, g.waterTop + 4);
  const tw = performance.now() / 650;
  const waveAmp = 1.6 + (s.slosh || 0);
  for (let x = bx; x <= bx + bw; x += 5) { const yy = g.waterTop + Math.sin(x / 20 + tw) * waveAmp; ctx.lineTo(x, yy); }
  ctx.lineTo(bx + bw, g.bodyBottom); ctx.lineTo(bx, g.bodyBottom); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let x = bx; x <= bx + bw; x += 5) { const yy = g.waterTop + Math.sin(x / 20 + tw) * waveAmp; if (x === bx) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
  ctx.stroke();

  if (c.hasDust) drawBurntPaper(ctx, W, g, performance.now());

  for (const p of s.vapours) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill(); }
  if (c.hasDust) { for (const dp of s.dust) { ctx.beginPath(); ctx.arc(dp.x, dp.y, dp.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(150,146,156,0.85)'; ctx.fill(); } }

  const air = airRegion(W, H, s.compression);
  const density = c.hasDust ? s.density : 0;
  if (density > 0.012) {
    ctx.save();
    const poof = s.poof || 0; // brief billowing burst right as the cloud first forms
    for (const f of s.fog) {
      // Each puff has its own reveal threshold (assigned in seed(), lowest near the
      // water surface where vapour rises from) so a LOW density only lights up a
      // few small, faint puffs low in the air space — not the alpha of all 26
      // already-large puffs at once. As density climbs toward 1 (squeeze 4), more
      // puffs cross their threshold and each grows toward its full size/opacity,
      // so the cloud visibly gains both COVERAGE and THICKNESS, not just tint.
      const reveal = clamp((density - f.revealAt) / 0.22, 0, 1);
      if (reveal <= 0.001) continue;
      const rScale = 0.38 + 0.62 * reveal;
      const r = f.r * rScale * (1 + poof * 0.3 * reveal);
      const a = clamp(reveal * f.a * 4.6 * (1 + poof * 0.4), 0, 0.88);
      const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      rg.addColorStop(0, hexToRgba(c.cloudColor, a)); rg.addColorStop(0.55, hexToRgba(c.cloudColor, a * 0.55)); rg.addColorStop(1, hexToRgba(c.cloudColor, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
    }
    // a soft unifying veil only very near full density, so the finished (squeeze 4)
    // cloud reads as thick and complete rather than a scatter of separate puffs
    if (density > 0.72) { ctx.fillStyle = hexToRgba(c.cloudColor, (density - 0.72) * 0.55); ctx.fillRect(air.x0 - 14, air.y0 - 14, air.x1 - air.x0 + 28, air.y1 - air.y0 + 28); }
    ctx.restore();
  }

  if (s.warm > 0.02) { ctx.fillStyle = hexToRgba(T.orange, 0.07 * s.warm); ctx.fillRect(bx, g.bodyTop, bw, g.bodyBottom - g.bodyTop); }
  if (s.cool > 0.02) { ctx.fillStyle = hexToRgba(T.indigo, 0.08 * s.cool); ctx.fillRect(bx, g.bodyTop, bw, g.bodyBottom - g.bodyTop); }

  ctx.strokeStyle = 'rgba(214,220,255,0.16)'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) { const yy = lerp(g.waterTop - 12, g.waterTop - 40, i / 2); ctx.beginPath(); ctx.moveTo(bx + 4, yy); ctx.lineTo(bx + bw - 4, yy); ctx.stroke(); }

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(bx + bw * 0.14, g.bodyTop + 6, Math.max(3, bw * 0.05), (g.bodyBottom - g.bodyTop) * 0.82);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(bx + bw * 0.8, g.bodyTop + 10, Math.max(2, bw * 0.03), (g.bodyBottom - g.bodyTop) * 0.7);
  ctx.restore();

  ctx.save(); traceBody(ctx, W, g, s.compression); ctx.strokeStyle = 'rgba(214,220,255,0.55)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();

  if (s.compression > 0.04) {
    const a = clamp(s.compression, 0, 1);
    const midY = (g.bodyTop + g.bodyBottom) / 2;
    drawSqueezeArrow(ctx, bx - 14 - a * 5, midY, 1, a);
    drawSqueezeArrow(ctx, bx + bw + 14 + a * 5, midY, -1, a);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BOTTLE PANEL — the showpiece component. Renders in BOTH operator modes.
// ═══════════════════════════════════════════════════════════════════════════
interface BottlePanelProps {
  id: string;
  hasDust: boolean;
  label: string;
  accent: string;
  softAccent: string;
  compressionRef: React.MutableRefObject<number>;
  fogEnabled: boolean;
  fogIntensity: number;
  vapourCount: number;
  dustCount: number;
  cloudColor: string;
  reducedMotion: boolean;
  statusText: string;
  statusActive: boolean;
  highlighted: boolean;
  surface: string;
  border: string;
}

const BottlePanel: React.FC<BottlePanelProps> = React.memo(({
  hasDust, label, accent, softAccent, compressionRef, fogEnabled, fogIntensity,
  vapourCount, dustCount, cloudColor, reducedMotion, statusText, statusActive, highlighted, surface, border,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  const sim = useRef({
    W: 220, H: 260,
    vapours: [] as { x: number; y: number; vx: number; vy: number; r: number }[],
    dust: [] as { x: number; y: number; r: number; ph: number; sp: number }[],
    fog: [] as { x: number; y: number; r: number; vx: number; vy: number; a: number; revealAt: number }[],
    compression: 0, prevComp: 0, warm: 0, cool: 0, density: 0, prevDensity: 0, slosh: 0, poof: 0,
  });
  const cfg = useRef({ fogEnabled, fogIntensity, hasDust, reducedMotion, cloudColor });
  cfg.current = { fogEnabled, fogIntensity, hasDust, reducedMotion, cloudColor };

  const seed = useCallback((W: number, H: number) => {
    const s = sim.current; s.W = W; s.H = H;
    const air = airRegion(W, H, 0);
    s.vapours = [];
    for (let i = 0; i < vapourCount; i++) {
      s.vapours.push({ x: air.x0 + Math.random() * (air.x1 - air.x0), y: air.y0 + Math.random() * (air.y1 - air.y0), vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 - 0.04, r: 1.1 + Math.random() * 1.1 });
    }
    s.dust = [];
    if (hasDust) {
      for (let i = 0; i < dustCount; i++) {
        s.dust.push({ x: lerp(air.x0, air.x1, 0.3 + Math.random() * 0.4), y: lerp(air.y0, air.y1, 0.55 + Math.random() * 0.45), r: 1.3 + Math.random() * 1.4, ph: Math.random() * Math.PI * 2, sp: 0.25 + Math.random() * 0.4 });
      }
    }
    // Puffs reveal progressively as density builds, lowest (nearest the water,
    // where vapour rises from) first — so a low density shows a thin partial wisp
    // low in the bottle, and it fills in and thickens upward as density climbs,
    // reaching full coverage only once density hits 1 (squeeze 4).
    const fogCount = 26;
    const rawFog: { x: number; y: number; r: number; vx: number; vy: number; a: number }[] = [];
    for (let i = 0; i < fogCount; i++) {
      rawFog.push({ x: air.x0 + Math.random() * (air.x1 - air.x0), y: air.y0 + Math.random() * (air.y1 - air.y0), r: (air.x1 - air.x0) * (0.22 + Math.random() * 0.22), vx: (Math.random() - 0.5) * 0.18, vy: -(0.05 + Math.random() * 0.12), a: 0.1 + Math.random() * 0.12 });
    }
    rawFog.sort((p, q) => q.y - p.y); // larger y (lower, nearer the water) first
    s.fog = rawFog.map((p, i) => ({ ...p, revealAt: fogCount > 1 ? (i / (fogCount - 1)) * 0.78 : 0 }));
  }, [vapourCount, dustCount, hasDust]);

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const W = Math.max(90, wrap.clientWidth);
      const H = Math.max(120, wrap.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
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
      const s = sim.current, c = cfg.current, W = s.W, H = s.H;
      const live = compressionRef.current;
      s.compression = lerp(s.compression, live, c.reducedMotion ? 1 : 0.55);
      const d = s.compression - s.prevComp; s.prevComp = s.compression;
      const warmSteady = s.compression * 0.4;
      s.warm = lerp(s.warm, Math.max(warmSteady, clamp(d * 22, 0, 1)), 0.2);
      s.cool = lerp(s.cool, clamp(-d * 22, 0, 1), 0.2);
      let densTarget = 0;
      if (c.hasDust) densTarget = c.fogEnabled ? smoothstep(0.5, 0.12, s.compression) * c.fogIntensity : 0;
      // billowing is not linear: it blooms a little faster than it clears, and a
      // freshly-crossed threshold gets a brief extra "poof" of billowing energy
      // rather than a flat fade-in, so the cloud reads as forming, not just fading in.
      const fogRate = densTarget < s.density ? 0.22 : 0.1;
      s.density = lerp(s.density, densTarget, c.reducedMotion ? 1 : fogRate);
      if (s.prevDensity < 0.05 && s.density >= 0.05) s.poof = 1;
      s.prevDensity = s.density;
      s.poof = lerp(s.poof, 0, c.reducedMotion ? 1 : 0.06);
      // water sloshes in reaction to how fast the squeeze is changing, then settles —
      // calm when idle, choppy right as the hand squeezes or the bottle springs back.
      const targetSlosh = clamp(Math.abs(d) * 620, 0, 6.5);
      s.slosh = lerp(s.slosh, targetSlosh, c.reducedMotion ? 1 : (targetSlosh > s.slosh ? 0.35 : 0.05));
      const air = airRegion(W, H, s.compression);
      const sp = c.reducedMotion ? 0 : 1;
      for (const p of s.vapours) {
        p.x += p.vx * sp; p.y += p.vy * sp;
        p.vx += (Math.random() - 0.5) * 0.02; p.vy += (Math.random() - 0.5) * 0.02;
        p.vx = clamp(p.vx, -0.5, 0.5); p.vy = clamp(p.vy, -0.5, 0.5);
        if (p.x < air.x0) { p.x = air.x0; p.vx *= -1; } if (p.x > air.x1) { p.x = air.x1; p.vx *= -1; }
        if (p.y < air.y0) { p.y = air.y0; p.vy *= -1; } if (p.y > air.y1) { p.y = air.y1; p.vy *= -1; }
      }
      for (const dp of s.dust) {
        dp.ph += 0.02; dp.x = clamp(dp.x + Math.cos(dp.ph) * 0.12 * sp, air.x0, air.x1); dp.y -= dp.sp * sp * 0.35;
        if (dp.y < air.y0) dp.y = air.y1; if (dp.y > air.y1) dp.y = air.y1;
      }
      for (const f of s.fog) {
        f.x += f.vx * sp + Math.sin((s.compression + f.y) * 0.01) * 0.05; f.y += f.vy * sp;
        if (f.x < air.x0 - 10) f.x = air.x1 + 10; if (f.x > air.x1 + 10) f.x = air.x0 - 10;
        if (f.y < air.y0 - 10) { f.y = air.y1 + 8; f.x = air.x0 + Math.random() * (air.x1 - air.x0); }
      }
      drawBottle(ctx, s, c);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <motion.div
      className="cf-bottle-card"
      animate={highlighted ? { boxShadow: ['0 0 0 0 rgba(255,114,18,0.55)', '0 0 0 8px rgba(255,114,18,0)', '0 0 0 0 rgba(255,114,18,0)'] } : {}}
      transition={highlighted ? { duration: 1.1, repeat: Infinity } : {}}
      style={{ flex: '1 1 0', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: surface, borderRadius: 16, border: `1px solid ${border}`, boxShadow: '0 8px 22px -14px rgba(40,30,80,0.4)', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '7px 10px', background: `linear-gradient(135deg, ${accent}, ${softAccent})`, color: T.white, flexShrink: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 'clamp(10px,1.4dvh,13px)', letterSpacing: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <motion.span
          animate={statusActive ? { scale: [1, 1.06, 1] } : {}} transition={statusActive ? { duration: 1.4, repeat: Infinity } : {}}
          style={{ fontSize: 'clamp(9px,1.1dvh,11px)', fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.24)', whiteSpace: 'nowrap', flexShrink: 0 }}
        >{statusText}</motion.span>
      </div>
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', flex: '1 1 0', minHeight: 0, background: hasDust ? 'radial-gradient(120% 80% at 50% 30%, #2c2550, #171130)' : 'radial-gradient(120% 80% at 50% 30%, #24264a, #14162c)' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block' }} />
      </div>
    </motion.div>
  );
});

// ==================== SOUND (Web Audio, lazy, mutable) ====================
function useSound(mutedRef: React.MutableRefObject<boolean>) {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = () => {
    if (mutedRef.current) return null;
    if (!ctxRef.current) { try { ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; } }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  };
  const tone = useCallback((freq: number, t0: number, dur: number, ctx: AudioContext, type: OscillatorType = 'sine', peak = 0.12) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0); gain.gain.linearRampToValueAtTime(peak, t0 + 0.02); gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(t0); osc.stop(t0 + dur + 0.02);
  }, []);
  const sweep = useCallback((f0: number, f1: number, t0: number, dur: number, ctx: AudioContext, peak = 0.09) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(f0, t0); osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    gain.gain.setValueAtTime(0, t0); gain.gain.linearRampToValueAtTime(peak, t0 + 0.03); gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(t0); osc.stop(t0 + dur + 0.02);
  }, []);
  return useCallback((kind: 'squeeze' | 'bloom' | 'tap' | 'toggle' | 'finish') => {
    const ctx = getCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === 'squeeze') sweep(420, 240, now, 0.5, ctx, 0.06);
    else if (kind === 'bloom') { tone(520, now, 0.28, ctx, 'sine', 0.08); tone(780, now + 0.08, 0.3, ctx, 'triangle', 0.07); tone(1040, now + 0.16, 0.34, ctx, 'sine', 0.05); }
    else if (kind === 'tap') tone(600, now, 0.09, ctx, 'triangle', 0.08);
    else if (kind === 'toggle') tone(700, now, 0.08, ctx, 'sine', 0.07);
    else if (kind === 'finish') [523, 659, 784, 1047].forEach((f, i) => tone(f, now + i * 0.12, 0.32, ctx, 'triangle', 0.1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ==================== STYLED CONTROLS ====================
type BtnVariant = 'contained' | 'outlined' | 'text' | 'highlight';
const BTN_BG: Record<BtnVariant, string> = { contained: T.indigo, highlight: G.highlight, outlined: 'transparent', text: 'transparent' };
const BTN_FG: Record<BtnVariant, string> = { contained: T.white, highlight: T.white, outlined: T.indigo, text: T.indigo };

const Btn: React.FC<{
  variant: BtnVariant; onClick?: () => void; disabled?: boolean; fullWidth?: boolean; small?: boolean; children: React.ReactNode; ariaLabel?: string;
}> = ({ variant, onClick, disabled, fullWidth, small, children, ariaLabel }) => (
  <motion.button
    onClick={disabled ? undefined : onClick}
    aria-label={ariaLabel}
    disabled={disabled}
    whileHover={disabled ? {} : { y: -2, scale: 1.02 }}
    whileTap={disabled ? {} : { y: 1, scale: 0.98 }}
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      padding: small ? '9px 14px' : 'clamp(10px,1.6dvh,15px) clamp(14px,2vw,22px)',
      borderRadius: 999, border: variant === 'outlined' ? `1.5px solid ${T.indigo}` : '1.5px solid transparent',
      background: disabled ? T.greyMid : BTN_BG[variant],
      backgroundImage: !disabled && (variant === 'highlight') ? BTN_BG.highlight : undefined,
      color: disabled ? T.white : BTN_FG[variant],
      boxShadow: disabled ? 'none' : variant === 'highlight' ? '0 8px 18px -8px rgba(255,114,18,0.55)' : variant === 'contained' ? '0 8px 18px -8px rgba(74,77,201,0.5)' : 'none',
      cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: small ? 12.5 : 'clamp(12px,1.7dvh,14.5px)', fontFamily: T.font,
      width: fullWidth ? '100%' : undefined, minHeight: small ? 32 : 40, whiteSpace: 'nowrap',
    }}
  >{children}</motion.button>
);

const ModeToggle: React.FC<{ mode: 'ai' | 'student'; onChange: (m: 'ai' | 'student') => void }> = ({ mode, onChange }) => (
  <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: 3, gap: 2, flexShrink: 0 }}>
    {(['ai', 'student'] as const).map((m) => {
      const active = mode === m;
      return (
        <button key={m} onClick={() => onChange(m)} aria-pressed={active}
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', cursor: 'pointer', padding: '6px 11px', borderRadius: 999, fontFamily: T.font, fontWeight: 700, fontSize: 11.5, color: active ? T.purple : T.white, background: 'transparent', minHeight: 28 }}>
          {active && <motion.span layoutId="cfModePill" transition={{ type: 'spring', stiffness: 500, damping: 34 }} style={{ position: 'absolute', inset: 0, background: T.white, borderRadius: 999, zIndex: 0 }} />}
          <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {m === 'ai' ? <CapIcon size={13} /> : <UserIcon size={13} />}{m === 'ai' ? 'Teacher' : 'Student'}
          </span>
        </button>
      );
    })}
  </div>
);

// ==================== CONFETTI + FULL-SCREEN FINISH OVERLAY ====================
const ConfettiBurst: React.FC<{ count: number }> = ({ count }) => {
  const palette = [T.orange, T.indigo, T.amber, T.success, T.purple];
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.4, dur: 2 + Math.random() * 1.1, color: palette[i % palette.length],
    size: 6 + Math.random() * 7, round: Math.random() > 0.5, rot: Math.random() * 540,
  })), [count]);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {pieces.map((p, i) => (
        <motion.div key={i} initial={{ y: -20, opacity: 1, rotate: 0 }} animate={{ y: '110vh', opacity: [1, 1, 0], rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeIn' }}
          style={{ position: 'absolute', top: 0, left: `${p.left}%`, width: p.size, height: p.size, background: p.color, borderRadius: p.round ? '50%' : 2 }} />
      ))}
    </div>
  );
};

const FinishOverlay: React.FC<{ learned: string[]; cycles: number; notes: number; isDark: boolean; onClose: () => void }> = ({ learned, cycles, notes, isDark, onClose }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,20,0.6)' }}>
    <ConfettiBurst count={70} />
    <motion.div initial={{ opacity: 0, scale: 0.7, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.08 }}
      style={{ position: 'relative', width: 'min(92vw, 440px)', maxHeight: '88dvh', overflowY: 'auto', borderRadius: 22, padding: 'clamp(20px,4dvh,32px)', textAlign: 'center', background: isDark ? DARK.surface : T.white, color: isDark ? DARK.text : '#2A2540', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.5)', backgroundImage: isDark ? undefined : `linear-gradient(160deg, #fff, ${T.cream})` }}>
      <motion.div initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}>
        <SparklesIcon size={38} color={T.orange} />
      </motion.div>
      <div style={{ fontFamily: T.font, fontWeight: 800, fontSize: 22, margin: '10px 0 2px' }}>Nicely explored!</div>
      <div style={{ fontFamily: T.font, fontSize: 13, color: isDark ? DARK.textSub : '#6B6685', marginBottom: 14 }}>
        {cycles} squeeze{cycles === 1 ? '' : 's'} tried &middot; {notes} note{notes === 1 ? '' : 's'} logged
      </div>
      <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 15, margin: '4px 0 12px' }}>What you have learned</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
        {learned.map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.1 }}
            style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontFamily: T.font, fontSize: 13, lineHeight: 1.45, color: isDark ? DARK.textSub : '#4E4E4E' }}>
            <span style={{ color: T.success, marginTop: 1, flexShrink: 0 }}><CheckIcon size={14} /></span>{l}
          </motion.div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}><Btn variant="contained" onClick={onClose}>Close</Btn></div>
    </motion.div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
interface AdditionalProps {
  vapourCount?: number; dustCount?: number; cloudColor?: string; requiredSqueezes?: number;
  bottleLabels?: { plain?: string; dust?: string };
}
interface ToolProps {
  operatorMode?: 'ai' | 'student'; showModeToggle?: boolean; themeColor?: string; darkMode?: boolean;
  device?: 'mobile' | 'smartboard'; muted?: boolean; additionalProps?: AdditionalProps;
  // legacy framework props kept as harmless no-ops
  setStepDetails?: (...a: any[]) => void; stopAutoNext?: boolean; setStopAutoNext?: (v: boolean) => void;
}

const HIGHLIGHTABLE = ['plainBottle', 'dustBottle', 'squeezeButton', 'observationLog', 'modeToggle', 'muteButton', 'finishButton'] as const;
type HighlightTarget = typeof HIGHLIGHTABLE[number];

const DEFAULT_REQUIRED_SQUEEZES = 4; // each squeeze fills the progress meter by 25% — Finish unlocks at 4/4 (100%)

const CloudFormationTool: React.FC<{ props?: ToolProps } & ToolProps> = (raw) => {
  const props: ToolProps = raw.props ?? raw;
  const ap = props.additionalProps || {};
  const vapourCount = ap.vapourCount ?? 30;
  const dustCount = ap.dustCount ?? 9;
  const cloudColor = ap.cloudColor ?? '#FFFFFF';
  const requiredSqueezes = ap.requiredSqueezes ?? DEFAULT_REQUIRED_SQUEEZES;
  const plainLabel = ap.bottleLabels?.plain ?? 'Plain water';
  const dustLabel = ap.bottleLabels?.dust ?? 'Water + burnt paper';
  const isDark = !!props.darkMode;
  const accent = props.themeColor || T.indigo;

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const fn = () => setReducedMotion(mq.matches);
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, []);

  // ── experiment state ──
  const [squeeze, setSqueeze] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [primed, setPrimed] = useState(false);
  const [animating, setAnimating] = useState(false);
  const animRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const compressionRef = useRef(0);
  const [observations, setObservations] = useState<{ observe: string; wonder: string; id: number }[]>([]);
  const [noteText, setNoteText] = useState('');
  const logIdRef = useRef(0);

  // ── mode / sound / highlight ──
  const [mode, setMode] = useState<'ai' | 'student'>(props.operatorMode ?? 'student');
  const modeRef = useRef(mode); modeRef.current = mode;
  const mutedRef = useRef<boolean>(props.muted ?? false);
  const [mutedUI, setMutedUI] = useState(mutedRef.current);
  const playCue = useSound(mutedRef);
  const [highlightTarget, setHighlightTarget] = useState<HighlightTarget | null>(null);
  const highlightTimer = useRef<any>(null);

  // ── finish / telemetry ──
  const [showFinish, setShowFinish] = useState(false);
  const finishedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const notesAddedRef = useRef(0);
  const itemsExploredRef = useRef<Set<string>>(new Set());
  const autoTimerRef = useRef<any>(null);

  // ── responsive measurement ──
  const rootRef = useRef<HTMLDivElement>(null);
  const [rootSize, setRootSize] = useState({ w: 900, h: 600 });
  useEffect(() => {
    const el = rootRef.current; if (!el) return;
    const ro = new ResizeObserver((entries) => { for (const e of entries) setRootSize({ w: e.contentRect.width, h: e.contentRect.height }); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isTight = rootSize.h > 0 && rootSize.h < 460;
  const isTiny = rootSize.w > 0 && rootSize.w < 480;

  // ── inject keyframes / base reset (no network calls — system-ui font stack) ──
  useEffect(() => {
    const css = `
      html, body { height: 100%; margin: 0; padding: 0; }
      .cf-root, .cf-root * { box-sizing: border-box; }
      .cf-root {
        width: 100%;
        height: 100vh;
        height: 100dvh;
        display: grid;
        grid-template-rows: auto 1fr;
        overflow: hidden;
        position: relative;
      }
      .cf-header {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: clamp(6px,1.6dvh,10px) clamp(10px,2vw,18px);
        min-height: clamp(40px, 9dvh, 60px);
        flex-shrink: 0;
      }
      .cf-main {
        display: grid;
        grid-template-columns: minmax(0, 1fr) clamp(190px, 26%, 360px);
        min-height: 0;
        gap: clamp(6px, 1.4dvh, 12px);
        padding: clamp(6px, 1.6dvh, 12px);
      }
      .cf-bottles-pane { display: flex; min-width: 0; min-height: 0; gap: clamp(5px, 1dvh, 10px); }
      .cf-control-pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; gap: clamp(5px, 0.9dvh, 9px); overflow: hidden; }
      @keyframes cfPop { 0%{transform:scale(.7);opacity:0;} 70%{transform:scale(1.05);} 100%{transform:scale(1);opacity:1;} }
      .cf-input:focus { border-color: ${T.indigo} !important; box-shadow: 0 0 0 3px rgba(74,77,201,0.16); }
      .cf-scroll::-webkit-scrollbar { width: 6px; }
      .cf-scroll::-webkit-scrollbar-thumb { background: ${isDark ? DARK.border : T.greyMid}; border-radius: 999px; }
    `;
    const tag = document.createElement('style');
    tag.id = 'cf-keyframes-v2';
    tag.textContent = css;
    document.head.appendChild(tag);
    return () => { document.getElementById('cf-keyframes-v2')?.remove(); };
  }, [isDark]);

  useEffect(() => { if (props.operatorMode && props.operatorMode !== modeRef.current) applyMode(props.operatorMode); }, [props.operatorMode]); // eslint-disable-line
  useEffect(() => { if (typeof props.muted === 'boolean') { mutedRef.current = props.muted; setMutedUI(props.muted); } }, [props.muted]);

  const applyMode = useCallback((m: 'ai' | 'student') => {
    setMode(m);
    playCue('toggle');
    emit({ type: 'event', name: 'operator_mode_changed', detail: { mode: m, depth: m === 'ai' ? 'lean' : 'full' } });
  }, [playCue]);

  const recordCycle = useCallback((clouded: boolean) => {
    itemsExploredRef.current.add('squeeze');
    setCycles((prev) => {
      const next = prev + 1;
      const obs = AUTO_OBSERVATIONS[Math.min(next - 1, AUTO_OBSERVATIONS.length - 1)];
      setObservations((list) => [...list, { ...obs, id: logIdRef.current++ }]);
      return next;
    });
    if (clouded) playCue('bloom');
    emit({ type: 'event', name: 'squeezed', detail: { cycle: cycles + 1, clouded, target: requiredSqueezes } });
    if (clouded) emit({ type: 'event', name: 'cloud_formed', detail: { cycle: cycles + 1 } });
  }, [cycles, playCue, requiredSqueezes]);

  // squeeze-in: a hand applying force accelerates in, then slows near full grip
  const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  // release: an elastic plastic bottle snaps back PAST rest and settles, like a
  // real spring — this is what makes the release read as physical, not linear.
  const easeOutBack = (t: number, overshoot = 1.5) => {
    const c1 = overshoot, c3 = c1 + 1;
    const u = t - 1;
    return 1 + c3 * u * u * u + c1 * u * u;
  };
  // Cloud density ramps from a modest haze on squeeze 1 up to exactly 100% on the
  // requiredSqueezes-th squeeze — never earlier. squeezeFraction is 0 at cycles=0 and
  // 1 exactly at cycles===requiredSqueezes (and stays capped at 1 beyond that), so a
  // sub-linear power curve (fast-feeling early growth, no early ceiling-clamp) lands
  // precisely on 1.0 only at the target count instead of saturating a squeeze early.
  const squeezeFraction = clamp(cycles / Math.max(1, requiredSqueezes), 0, 1);
  const fogIntensity = Math.pow(squeezeFraction, 0.6);

  const doSqueeze = useCallback(() => {
    if (runningRef.current) return;
    if (!primed) setPrimed(true);
    if (reducedMotion) {
      compressionRef.current = 0; setSqueeze(0);
      recordCycle(true);
      return;
    }
    runningRef.current = true; setAnimating(true);
    // three natural phases: squeeze in → brief hold at full grip → elastic release
    const T_SQUEEZE = 620, T_HOLD = 90, T_RELEASE = 840;
    const DUR = T_SQUEEZE + T_HOLD + T_RELEASE;
    const t0 = performance.now();
    playCue('squeeze');
    const frame = () => {
      const elapsed = performance.now() - t0;
      let v: number;
      if (elapsed < T_SQUEEZE) {
        v = easeInOutQuad(clamp(elapsed / T_SQUEEZE, 0, 1));
      } else if (elapsed < T_SQUEEZE + T_HOLD) {
        v = 1;
      } else if (elapsed < DUR) {
        const t = clamp((elapsed - T_SQUEEZE - T_HOLD) / T_RELEASE, 0, 1);
        // 1 - easeOutBack(t) eases from 1 down through 0, dipping very slightly
        // negative near the end (the spring-back overshoot) before settling at 0.
        v = 1 - easeOutBack(t);
      } else {
        v = 0;
      }
      compressionRef.current = v; setSqueeze(clamp(v, 0, 1));
      if (elapsed >= DUR) {
        compressionRef.current = 0; setSqueeze(0);
        runningRef.current = false; setAnimating(false);
        recordCycle(true);
        return;
      }
      animRef.current = requestAnimationFrame(frame);
    };
    animRef.current = requestAnimationFrame(frame);
  }, [primed, reducedMotion, recordCycle, playCue]);

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); if (autoTimerRef.current) clearInterval(autoTimerRef.current); }, []);

  const doAddObservation = useCallback((text: string) => {
    const txt = String(text ?? '').trim();
    if (!txt) return;
    itemsExploredRef.current.add('observationLog');
    notesAddedRef.current += 1;
    setObservations((prev) => [...prev, { observe: txt, wonder: '', id: logIdRef.current++ }]);
    playCue('tap');
    emit({ type: 'event', name: 'observation_added', detail: { text: txt, total: notesAddedRef.current } });
  }, [playCue]);

  const addNote = () => { const txt = noteText.trim(); if (!txt) return; doAddObservation(txt); setNoteText(''); };

  const doClearLog = useCallback(() => {
    setObservations([]);
    playCue('tap');
    emit({ type: 'event', name: 'log_cleared', detail: {} });
  }, [playCue]);

  const doReset = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; }
    runningRef.current = false; setAnimating(false);
    setCycles(0); compressionRef.current = 0; setSqueeze(0); setPrimed(false);
    setObservations([]); logIdRef.current = 0; setNoteText('');
    notesAddedRef.current = 0; itemsExploredRef.current = new Set();
    startTimeRef.current = Date.now(); finishedRef.current = false; setShowFinish(false);
    emit({ type: 'event', name: 'reset', detail: {} });
  }, []);

  const doHighlight = useCallback((target: string) => {
    if (!(HIGHLIGHTABLE as readonly string[]).includes(target)) return;
    setHighlightTarget(target as HighlightTarget);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightTarget(null), 2600);
  }, []);

  const doPlay = useCallback(() => {
    if (autoTimerRef.current) return;
    doSqueeze();
    autoTimerRef.current = setInterval(() => { if (!runningRef.current) doSqueeze(); }, 2200);
  }, [doSqueeze]);
  const doPause = useCallback(() => { if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; } }, []);

  const doFinish = useCallback(() => {
    if (finishedRef.current) return { ...buildStateSnapshot() };
    finishedRef.current = true;
    playCue('finish');
    const snapshot = buildStateSnapshot();
    setShowFinish(true);
    emit({
      type: 'event', name: 'finished', detail: {
        evaluated: false,
        interactions: {
          squeezes: cyclesRef.current, requiredSqueezes: requiredSqueezesRef.current, notesAdded: notesAddedRef.current,
          itemsExplored: Array.from(itemsExploredRef.current), durationMs: Date.now() - startTimeRef.current,
        },
        learned: LEARNED_POINTS,
      },
    });
    return snapshot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playCue]);

  // refs mirroring latest values for the agent API (avoids stale closures)
  const cyclesRef = useRef(cycles); cyclesRef.current = cycles;
  const observationsRef = useRef(observations); observationsRef.current = observations;
  const primedRef = useRef(primed); primedRef.current = primed;
  const squeezeRef = useRef(squeeze); squeezeRef.current = squeeze;
  const requiredSqueezesRef = useRef(requiredSqueezes); requiredSqueezesRef.current = requiredSqueezes;

  const buildStateSnapshot = () => {
    const fog = clamp(0.66 + cyclesRef.current * 0.14, 0.66, 1);
    const dustDensity = primedRef.current ? smoothstep(0.5, 0.12, squeezeRef.current) * fog : 0;
    return {
      cycles: cyclesRef.current, requiredSqueezes: requiredSqueezesRef.current,
      progress: clamp(cyclesRef.current / requiredSqueezesRef.current, 0, 1),
      primed: primedRef.current, squeeze: squeezeRef.current,
      dustDensity, observationsCount: observationsRef.current.length,
      operatorMode: modeRef.current, depth: modeRef.current === 'ai' ? 'lean' : 'full',
      muted: mutedRef.current, finished: finishedRef.current,
    };
  };

  // ── the agent API ──
  const api = {
    setParam: (name: string, value: any) => {
      if (name === 'muted') { mutedRef.current = !!value; setMutedUI(!!value); }
      else if (name === 'operatorMode') applyMode(value === 'ai' ? 'ai' : 'student');
    },
    play: doPlay,
    pause: doPause,
    reset: doReset,
    highlight: doHighlight,
    getState: () => { const s = buildStateSnapshot(); emit({ type: 'state', state: s }); return s; },
    setOperatorMode: (m: string) => applyMode(m === 'ai' ? 'ai' : 'student'),
    squeeze: doSqueeze,
    addObservation: doAddObservation,
    clearLog: doClearLog,
    finish: doFinish,
  };
  const apiRef = useRef(api); apiRef.current = api;

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== 'command') return;
      const fn = (apiRef.current as any)[d.method];
      let result; try { if (typeof fn === 'function') result = fn(...(d.args || [])); } catch { result = null; }
      emit({ type: 'response', id: d.id, result });
    };
    window.addEventListener('message', onMsg);
    emit({ type: 'ready', toolId: TOOL_ID });
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // ==================== DERIVED / RENDER ====================
  const dustDensity = primed ? smoothstep(0.5, 0.12, squeeze) * fogIntensity : 0;
  const plainStatus = squeeze > 0.5 ? 'Clear' : primed ? 'Still clear' : 'Ready';
  const dustStatus = !primed ? 'Ready' : dustDensity > 0.55 ? 'Cloudy!' : dustDensity > 0.12 ? 'Cloud forming…' : 'Clearing…';

  const surface = isDark ? DARK.surface : T.white;
  const surface2 = isDark ? DARK.surface2 : T.offWhite;
  const border = isDark ? DARK.border : T.greyLight;
  const text = isDark ? DARK.text : '#2A2540';
  const textSub = isDark ? DARK.textSub : '#6B6685';
  const showModeToggle = props.showModeToggle ?? true;

  const cardPad = isTight ? 9 : 13;
  const squeezeProgress = clamp(cycles / requiredSqueezes, 0, 1);
  const canFinish = cycles >= requiredSqueezes;

  return (
    <div ref={rootRef} className="cf-root" style={{ background: isDark ? DARK.bg : T.offWhite, fontFamily: T.font }}>
      {/* ── HEADER ── */}
      <div className="cf-header" style={{ background: G.brand, color: T.white }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <CloudIcon size={isTight ? 18 : 22} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isTight ? 13.5 : 'clamp(14px,2.2dvh,19px)', fontWeight: 700, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cloud in a Bottle</div>
            {!isTiny && <div style={{ fontSize: 10.5, opacity: 0.88, fontWeight: 500 }}>Dust helps water vapour become a visible cloud</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <motion.button
            onClick={() => { const v = !mutedUI; mutedRef.current = v; setMutedUI(v); }}
            aria-label={mutedUI ? 'Unmute sound' : 'Mute sound'}
            whileTap={{ scale: 0.9 }}
            animate={highlightTarget === 'muteButton' ? { boxShadow: ['0 0 0 0 rgba(255,255,255,0.7)', '0 0 0 8px rgba(255,255,255,0)', '0 0 0 0 rgba(255,255,255,0)'] } : {}}
            transition={highlightTarget === 'muteButton' ? { duration: 1.1, repeat: Infinity } : {}}
            style={{ width: 30, height: 30, minWidth: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.18)', color: T.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >{mutedUI ? <VolumeXIcon size={15} /> : <Volume2Icon size={15} />}</motion.button>
          {showModeToggle && (
            <motion.div animate={highlightTarget === 'modeToggle' ? { boxShadow: ['0 0 0 0 rgba(255,255,255,0.7)', '0 0 0 8px rgba(255,255,255,0)', '0 0 0 0 rgba(255,255,255,0)'] } : {}} transition={highlightTarget === 'modeToggle' ? { duration: 1.1, repeat: Infinity } : {}} style={{ borderRadius: 999 }}>
              <ModeToggle mode={mode} onChange={applyMode} />
            </motion.div>
          )}
        </div>
      </div>

      {/* ── MAIN (grid split: bottles | controls — column widths are hard tracks, so
           neither pane can balloon past what the frame can show) ── */}
      <div className="cf-main">
        {/* bottles pane — always visible, in BOTH operator modes */}
        <div className="cf-bottles-pane">
          <BottlePanel id="plainBottle" hasDust={false} label={plainLabel} accent={accent} softAccent={T.purple}
            compressionRef={compressionRef} fogEnabled={false} fogIntensity={0} vapourCount={vapourCount} dustCount={0}
            cloudColor={cloudColor} reducedMotion={reducedMotion} statusText={plainStatus} statusActive={false}
            highlighted={highlightTarget === 'plainBottle'} surface={surface} border={border} />
          <BottlePanel id="dustBottle" hasDust label={dustLabel} accent={T.orange} softAccent={T.orangeSoft}
            compressionRef={compressionRef} fogEnabled={primed} fogIntensity={fogIntensity} vapourCount={vapourCount} dustCount={dustCount}
            cloudColor={cloudColor} reducedMotion={reducedMotion} statusText={dustStatus} statusActive={primed && dustDensity > 0.12}
            highlighted={highlightTarget === 'dustBottle'} surface={surface} border={border} />
        </div>

        {/* control pane */}
        <div className="cf-control-pane">
          <AnimatePresence mode="wait">
            {mode === 'ai' ? (
              <motion.div key="watch" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: cardPad, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: text, marginBottom: 4 }}>
                  <CapIcon size={14} color={T.indigo} /> Your teacher is showing you this
                </div>
                <div style={{ fontSize: 11.5, color: textSub, lineHeight: 1.45 }}>Watch what happens when the bottles are squeezed and released — you'll get a turn.</div>
              </motion.div>
            ) : (
              <motion.div key="squeeze" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: cardPad, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: text, display: 'inline-flex', alignItems: 'center', gap: 6 }}><HandIcon size={14} color={T.indigo} />Squeeze the bottles</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: textSub }}>{animating ? (squeeze > 0.55 ? 'Squeezing…' : 'Releasing…') : primed ? 'Released' : 'Ready'}</span>
                </div>
                <motion.div animate={highlightTarget === 'squeezeButton' ? { scale: [1, 1.03, 1] } : {}} transition={highlightTarget === 'squeezeButton' ? { duration: 1, repeat: Infinity } : {}}>
                  <Btn variant="highlight" onClick={doSqueeze} disabled={animating} fullWidth>
                    <HandIcon size={16} />{animating ? 'Squeezing…' : 'Squeeze & release'}
                  </Btn>
                </motion.div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: textSub, marginBottom: 3 }}>
                    <span>Cloud density</span><span>{Math.round(dustDensity * 100)}%</span>
                  </div>
                  <div style={{ height: 7, background: border, borderRadius: 999, overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${dustDensity * 100}%` }} transition={{ duration: 0.12 }} style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${T.orangeSoft}, ${T.orange})` }} />
                  </div>
                </div>
                {/* progress toward completion — fills 25% per squeeze, 100% at 4/4 */}
                <div style={{ marginTop: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: canFinish ? T.success : textSub, marginBottom: 3 }}>
                    <span>{canFinish ? '✓ Complete' : `${Math.min(cycles, requiredSqueezes)} of ${requiredSqueezes} squeezes`}</span>
                    <span>{Math.round(squeezeProgress * 100)}%</span>
                  </div>
                  <div style={{ height: 9, background: border, borderRadius: 999, overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${squeezeProgress * 100}%` }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                      style={{ height: '100%', borderRadius: 999, background: canFinish ? `linear-gradient(90deg, ${T.success}, #2bc17a)` : G.brand }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* nucleation hint (student only, after first squeeze) */}
          <AnimatePresence>
            {mode === 'student' && primed && !isTight && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, background: T.cream, color: '#7a4a12', fontSize: 10.5, lineHeight: 1.4, flexShrink: 0, overflow: 'hidden' }}>
                <SparklesIcon size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>The cloud forms where cooled vapour condenses onto the burnt paper's smoke specks. The plain bottle has none, so nothing forms.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* observation log — student mode only, full depth */}
          {mode === 'student' && (
            <motion.div
              animate={highlightTarget === 'observationLog' ? { boxShadow: ['0 0 0 0 rgba(74,77,201,0.5)', '0 0 0 6px rgba(74,77,201,0)', '0 0 0 0 rgba(74,77,201,0)'] } : {}}
              transition={highlightTarget === 'observationLog' ? { duration: 1.1, repeat: Infinity } : {}}
              style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', background: surface, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: G.brand, color: T.white, flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}><EyeIcon size={13} />Observation log</span>
                <button onClick={doClearLog} aria-label="Clear notes" style={{ border: 'none', background: 'rgba(255,255,255,0.2)', color: T.white, borderRadius: 999, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <EraserIcon size={12} />
                </button>
              </div>
              <div className="cf-scroll" style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', padding: '4px 0' }}>
                {observations.length === 0 && <div style={{ padding: 14, textAlign: 'center', color: textSub, fontSize: 11 }}>Squeeze and release to record your first observation.</div>}
                {observations.map((o) => (
                  <motion.div key={o.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ padding: '6px 10px', borderBottom: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, color: text, lineHeight: 1.4, display: 'flex', gap: 5 }}><EyeIcon size={11} color={T.indigo} style={{ marginTop: 2, flexShrink: 0 }} />{o.observe}</div>
                    {o.wonder && <div style={{ fontSize: 10.5, color: textSub, lineHeight: 1.4, display: 'flex', gap: 5, marginTop: 2 }}><HelpIcon size={11} color={T.orange} style={{ marginTop: 2, flexShrink: 0 }} />{o.wonder}</div>}
                  </motion.div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, padding: 7, borderTop: `1px solid ${border}`, background: surface2, flexShrink: 0 }}>
                <input className="cf-input" value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
                  placeholder="Add your own observation…"
                  style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`, fontFamily: T.font, fontSize: 11.5, color: text, background: surface, outline: 'none' }} />
                <Btn variant="contained" onClick={addNote} small><PlusIcon size={13} /></Btn>
              </div>
            </motion.div>
          )}

          {/* Finish — student mode only, the LAST control, gated on 4/4 squeezes (100%);
              never a "play again" loop. */}
          {mode === 'student' && (
            <motion.div
              animate={highlightTarget === 'finishButton' ? { scale: [1, 1.03, 1] } : {}} transition={highlightTarget === 'finishButton' ? { duration: 1, repeat: Infinity } : {}}
              style={{ flexShrink: 0 }}>
              <Btn variant={canFinish ? 'highlight' : 'contained'} onClick={doFinish} disabled={!canFinish} fullWidth>
                <FlagIcon size={15} /> {canFinish ? 'Finish' : `Finish (${Math.min(cycles, requiredSqueezes)}/${requiredSqueezes} squeezes)`}
              </Btn>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── full-screen completion overlay ── */}
      <AnimatePresence>
        {showFinish && <FinishOverlay learned={LEARNED_POINTS} cycles={cycles} notes={notesAddedRef.current} isDark={isDark} onClose={() => setShowFinish(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default CloudFormationTool;
