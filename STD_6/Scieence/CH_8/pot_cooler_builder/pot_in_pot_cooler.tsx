// ═══════════════════════════════════════════════════════════════════════════
// pot_in_pot_cooler.tsx — the pot-in-pot (matka) evaporative cooler
// Tool id: pot_in_pot_cooler  |  NCERT Class 6 Science, Ch 8 "A Journey through
// States of Water"  |  Concept: evaporation causes a cooling effect.
//
// One coherent guided activity in two parts: BUILD (assemble the cross-section
// in 6 ordered steps) then COOL (play/pause a physically-reasoned cooling-
// over-time animation driven by evaporation from the wet sand). No mode-picker
// tabs — the illustrated scene is the visual centrepiece and the flow moves
// forward naturally from building to observing it cool. Agent-controllable
// end to end via window.postMessage (§3 of the authoring spec): emits
// {type:'ready'} on mount, handles {type:'command', id, method, args},
// replies with {type:'response', id, result}, and broadcasts
// {type:'event'/'state'}. Implements the Teacher|Student toggle + lean/full
// content depth (§6.1-6.2) and the uniform, NON-EVALUATING Finish flow
// (§6.3 — there is no scored quiz, so Finish opens a star-less "What you
// have learned" screen and the finished event carries evaluated:false).
//
// No external icon/animation-asset libraries — self-contained inline SVG
// icons (the production iframe renderer only allow-lists a fixed icon set,
// so lucide-react throws at runtime) and framer-motion for UI chrome motion.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TOOL_ID = 'pot_in_pot_cooler';
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
  style?: React.CSSProperties;
}
const mkIcon = (paths: React.ReactNode) => {
  const Cmp: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
  return Cmp;
};
const PlayIcon = mkIcon(<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />);
const PauseIcon = mkIcon(
  <>
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
  </>
);
const RotateCcwIcon = mkIcon(
  <>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </>
);
const ChevronRightIcon = mkIcon(<polyline points="9 6 15 12 9 18" />);
const ChevronLeftIcon = mkIcon(<polyline points="15 6 9 12 15 18" />);
const SnowflakeIcon = mkIcon(
  <>
    <line x1="2" x2="22" y1="12" y2="12" />
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="m20 16-4-4 4-4" />
    <path d="m4 8 4 4-4 4" />
    <path d="m16 4-4 4-4-4" />
    <path d="m8 20 4-4 4 4" />
  </>
);
const CheckIcon = mkIcon(<polyline points="20 6 9 17 4 12" />);
const Volume2Icon = mkIcon(
  <>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </>
);
const VolumeXIcon = mkIcon(
  <>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </>
);
const FlagIcon = mkIcon(
  <>
    <path d="M4 22V4" />
    <path d="M4 4h13l-2.5 4L17 12H4" />
  </>
);
const DropletIcon = mkIcon(
  <path d="M12 2.7s6 6.4 6 10.8a6 6 0 0 1-12 0c0-4.4 6-10.8 6-10.8Z" />
);

/* ==================== TYPES ==================== */
type OperatorMode = 'ai' | 'student';
type Depth = 'lean' | 'full';
type Phase = 'build' | 'cool';
type HighlightTarget =
  | 'bigPot'
  | 'sandBase'
  | 'smallPot'
  | 'fillGap'
  | 'pourWater'
  | 'cover'
  | 'thermometer'
  | 'playButton'
  | 'journeyRail'
  | 'modeToggle'
  | 'muteButton'
  | 'finishButton'
  | null;

interface AdditionalProps {
  weather?: 'dry' | 'humid';
  startTemp?: number;
}

interface ToolProps {
  props?: {
    themeColor?: string;
    darkMode?: boolean;
    operatorMode?: OperatorMode;
    muted?: boolean;
    showModeToggle?: boolean;
    device?: 'mobile' | 'smartboard';
    seed?: number;
    additionalProps?: AdditionalProps;
  };
}

/* ==================== PALETTE (Singularity design system) ==================== */
const C = {
  indigo: '#4A4DC9',
  orange: '#FF7212',
  purple: '#533086',
  amber: '#FC9145',
  lav: '#C1C1EA',
  cream: '#FFF3E4',
  ink: '#4E4E4E',
  grayL: '#EBEBEB',
  paper: '#F5F5F5',
  white: '#FFFFFF',
  red: '#E5484D',
  green: '#2F9E44',
};
const fontStack = '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/* ==================== BUILD STEPS ==================== */
const BUILD_STEPS: { id: string; title: string; caption: string }[] = [
  { id: 'bigPot', title: 'Big clay pot', caption: 'Start with a large earthen pot' },
  { id: 'sandBase', title: 'Sand base', caption: 'Add a layer of sand at the bottom' },
  { id: 'smallPot', title: 'Small pot in', caption: 'Place a smaller pot in the centre' },
  { id: 'fillGap', title: 'Fill the gap', caption: 'Pack sand into the gap between pots' },
  { id: 'pourWater', title: 'Pour water', caption: 'Wet the sand all around' },
  { id: 'cover', title: 'Cover it', caption: 'Cover with a wet jute cloth — ready!' },
];
const BUILD_STEP_IDS = BUILD_STEPS.map((s) => s.id);

/* ==================== "WHAT YOU HAVE LEARNED" TAKEAWAYS ==================== */
const LEARNED_POINTS = [
  'Evaporation is a cooling process — turning liquid water into vapour uses up heat, which is pulled from whatever the water is touching.',
  'In a pot-in-pot cooler, water held in wet sand keeps evaporating from the outer pot, steadily drawing heat away from the food inside the inner pot.',
  'A porous clay pot lets water seep out to the surface, which is why a matka keeps water cooler than a sealed steel container.',
  'The cooler works best on hot, dry days — dry air lets water evaporate faster, which means faster, stronger cooling.',
];

/* ==================== SVG SCENE DATA (deterministic) ==================== */
const GRAINS: [number, number][] = [
  [86, 150], [92, 185], [100, 214], [80, 168], [96, 200], [104, 172],
  [230, 152], [236, 186], [228, 214], [240, 170], [224, 200], [232, 178],
  [130, 232], [160, 238], [190, 232], [145, 228], [175, 228], [160, 224],
];

/* ==================== COOLER CROSS-SECTION SCENE ==================== */
const CoolerScene: React.FC<{
  revealUpTo: number;
  wet: number;
  evaporate: boolean;
  freshness: number;
  cool?: number;
  fill?: number;
  highlight?: HighlightTarget;
}> = ({ revealUpTo, wet, evaporate, freshness, cool = 0, fill = 1, highlight }) => {
  const show = (n: number) => revealUpTo >= n;
  const hl = (n: number) => highlight === BUILD_STEP_IDS[n - 1];

  const mix = (a: number, b: number) => Math.round(a + (b - a) * wet);
  const sandLo = `rgb(${mix(206, 150)},${mix(172, 106)},${mix(112, 54)})`;
  const sandHi = `rgb(${mix(236, 190)},${mix(208, 146)},${mix(156, 90)})`;

  const F = freshness;
  const cl = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const tR = cl(216 - 48 * (1 - F)), tG = cl(48 + 36 * (1 - F)), tBl = cl(40 + 24 * (1 - F));
  const tomato = `rgb(${tR},${tG},${tBl})`;
  const tomatoHi = `rgb(${cl(tR + 34)},${cl(tG + 70)},${cl(tBl + 48)})`;
  const tomatoLo = `rgb(${cl(tR - 58)},${cl(tG - 18)},${cl(tBl - 12)})`;
  const leafG = `rgb(${cl(70 + 70 * (1 - F))},${cl(170 - 56 * (1 - F))},${cl(72 + 18 * (1 - F))})`;
  const leafHi = `rgb(${cl(120 + 60 * (1 - F))},${cl(200 - 50 * (1 - F))},${cl(110 + 10 * (1 - F))})`;
  const brR = cl(96 - 20 * (1 - F)), brG = cl(46 + 20 * (1 - F)), brB = cl(120 - 30 * (1 - F));
  const brinjal = `rgb(${brR},${brG},${brB})`;
  const brinjalHi = `rgb(${cl(brR + 55)},${cl(brG + 45)},${cl(brB + 55)})`;
  const brinjalLo = `rgb(${cl(brR - 40)},${cl(brG - 25)},${cl(brB - 45)})`;
  const droop = 3 * (1 - F);

  const clampFill = Math.max(0, Math.min(1, fill));
  const baseY = 176;
  const fullY = 108;
  const surfaceY = show(4) ? baseY - (baseY - fullY) * clampFill : baseY;
  const pouring = revealUpTo === 4 && clampFill < 0.99;
  const waterY = 150;

  return (
    <svg viewBox="0 0 320 300" width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: '100%', maxHeight: '100%' }}>
      <defs>
        <linearGradient id="bigpot" x1="0.05" y1="0" x2="0.95" y2="1">
          <stop offset="0" stopColor="#E08C56" />
          <stop offset="0.45" stopColor="#C1642F" />
          <stop offset="1" stopColor="#8C3F18" />
        </linearGradient>
        <linearGradient id="smallpot" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#EA9C61" />
          <stop offset="0.5" stopColor="#C16A34" />
          <stop offset="1" stopColor="#98491F" />
        </linearGradient>
        <radialGradient id="sandg" cx="0.5" cy="0.28" r="0.85">
          <stop offset="0" stopColor={sandHi} />
          <stop offset="1" stopColor={sandLo} />
        </radialGradient>
        <pattern id="burlap" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#664521" />
          <rect x="-1" y="0.5" width="12" height="3.6" rx="1.8" fill="#CFAC6C" />
          <rect x="-1" y="5.5" width="12" height="3.6" rx="1.8" fill="#BF9A56" />
          <rect x="0.5" y="-1" width="3.6" height="12" rx="1.8" fill="#C8A263" opacity="0.9" />
          <rect x="5.5" y="-1" width="3.6" height="12" rx="1.8" fill="#B58E48" opacity="0.9" />
          <path d="M0 4.6 H10 M0 9.6 H10 M4.6 0 V10 M9.6 0 V10" stroke="#4E3517" strokeWidth="0.8" opacity="0.5" />
          <circle cx="2.3" cy="2.3" r="0.9" fill="#E4C88E" opacity="0.7" />
          <circle cx="7.3" cy="7.3" r="0.9" fill="#E4C88E" opacity="0.6" />
        </pattern>
        <linearGradient id="wetDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A2410" stopOpacity="0.15" />
          <stop offset="0.55" stopColor="#3A2410" stopOpacity="0.32" />
          <stop offset="1" stopColor="#2A1808" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="wetGloss" cx="0.5" cy="0.28" r="0.6">
          <stop offset="0" stopColor="#FFF6DF" stopOpacity="0.5" />
          <stop offset="1" stopColor="#FFF6DF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wateredge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5AB0EC" stopOpacity="0.55" />
          <stop offset="1" stopColor="#5AB0EC" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dropg" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#8FD0F5" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#4FA8E8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#2E86D0" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="potin" cx="0.5" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#C1723F" />
          <stop offset="0.6" stopColor="#9A4E26" />
          <stop offset="1" stopColor="#5E2C12" />
        </radialGradient>
        <radialGradient id="tomatoG" cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor={tomatoHi} />
          <stop offset="0.62" stopColor={tomato} />
          <stop offset="1" stopColor={tomatoLo} />
        </radialGradient>
        <radialGradient id="brinjalG" cx="0.38" cy="0.28" r="0.85">
          <stop offset="0" stopColor={brinjalHi} />
          <stop offset="0.6" stopColor={brinjal} />
          <stop offset="1" stopColor={brinjalLo} />
        </radialGradient>
        <radialGradient id="lemonG" cx="0.36" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#FBE7A0" />
          <stop offset="0.6" stopColor="#F3C64A" />
          <stop offset="1" stopColor="#D89A22" />
        </radialGradient>
        <linearGradient id="carrotG" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#F6A94E" />
          <stop offset="0.55" stopColor="#E9832B" />
          <stop offset="1" stopColor="#C9631A" />
        </linearGradient>
        <radialGradient id="capsicumG" cx="0.36" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#A6D65E" />
          <stop offset="0.6" stopColor="#5FA83A" />
          <stop offset="1" stopColor="#357A24" />
        </radialGradient>
        <radialGradient id="glow" cx="0.5" cy="0.42" r="0.7">
          <stop offset="0" stopColor={C.lav} stopOpacity="0.5" />
          <stop offset="1" stopColor={C.lav} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="coolaura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7FD3FF" stopOpacity="0.55" />
          <stop offset="0.7" stopColor="#7FD3FF" stopOpacity="0.12" />
          <stop offset="1" stopColor="#7FD3FF" stopOpacity="0" />
        </radialGradient>
        <clipPath id="fillclip">
          <rect x="30" y={surfaceY} width="260" height={280 - surfaceY} />
        </clipPath>
        <clipPath id="innerclip">
          <path d="M120 96 C116 150 126 196 142 212 L178 212 C194 196 204 150 200 96 C184 108 136 108 120 96 Z" />
        </clipPath>
      </defs>

      <ellipse cx="160" cy="150" rx="150" ry="132" fill="url(#glow)" opacity={evaporate ? 1 : 0.45} />
      {cool > 0.05 && (
        <ellipse cx="160" cy="150" rx="152" ry="134" fill="url(#coolaura)" opacity={cool} style={{ animation: 'pipc-coolpulse 3.2s ease-in-out infinite' }} />
      )}

      {show(1) && <ellipse cx="160" cy="272" rx="116" ry="12" fill="#000" opacity="0.13" />}

      {show(1) && (
        <g style={{ animation: 'pipc-popScene 0.5s ease-out both', filter: hl(1) ? 'drop-shadow(0 0 10px #FF7212)' : undefined }}>
          <path
            d="M44 92 C38 152 52 216 86 246 C114 272 206 272 234 246 C268 216 282 152 276 92 C276 112 246 124 160 124 C74 124 44 112 44 92 Z"
            fill="url(#bigpot)"
          />
          <ellipse cx="160" cy="98" rx="107" ry="24" fill="#5E2C12" />
        </g>
      )}

      {show(2) && (
        <g clipPath="url(#fillclip)" style={{ filter: hl(2) ? 'drop-shadow(0 0 8px #FF7212)' : undefined }}>
          <path
            d="M68 108 C70 150 80 210 102 232 C121 250 199 250 218 232 C240 210 250 150 252 108 C238 122 82 122 68 108 Z"
            fill="url(#sandg)"
          />
          <ellipse cx="160" cy={surfaceY} rx={72 + 20 * (show(4) ? clampFill : 0)} ry="7" fill={sandHi} opacity="0.9" />
          {wet > 0.35 && show(4) && (
            <g opacity={Math.min(1, (wet - 0.35) * 2)}>
              <path d={`M70 ${waterY} C110 ${waterY + 6} 210 ${waterY + 6} 250 ${waterY} L250 ${waterY + 20} C210 ${waterY + 26} 110 ${waterY + 26} 70 ${waterY + 20} Z`} fill="url(#wateredge)" />
              <path d={`M70 ${waterY} C110 ${waterY + 6} 210 ${waterY + 6} 250 ${waterY}`} fill="none" stroke="#5AB0EC" strokeWidth="1.6" opacity="0.7" />
            </g>
          )}
          {show(4) && clampFill > 0.6 &&
            GRAINS.map((g, i) => (
              <circle key={i} cx={g[0]} cy={g[1]} r={i % 3 === 0 ? 1.8 : 1.2} fill={i % 2 ? '#8a5a28' : '#d0a768'} opacity="0.5" />
            ))}
        </g>
      )}

      {pouring && (
        <g>
          {[89, 231].map((x, s) =>
            Array.from({ length: 7 }).map((_, j) => {
              const jitter = ((j % 3) - 1) * 4;
              const fall = surfaceY - 48 - (j % 3) * 4;
              return (
                <circle
                  key={`${s}-${j}`}
                  cx={x + jitter}
                  cy={48}
                  r={1.6 + (j % 2)}
                  fill={j % 2 ? '#c9a25f' : '#dcbd82'}
                  style={{ ['--fall' as string]: `${Math.max(20, fall)}px`, animation: `pipc-sandpour ${0.7 + (j % 3) * 0.12}s ${s * 0.18 + j * 0.13}s ease-in infinite` } as React.CSSProperties}
                />
              );
            })
          )}
        </g>
      )}

      {show(3) && (
        <g style={{ animation: 'pipc-dropIn 0.6s cubic-bezier(.34,1.4,.5,1) both', filter: hl(3) ? 'drop-shadow(0 0 8px #FF7212)' : undefined }}>
          <path
            d="M120 96 C116 150 126 196 142 212 L178 212 C194 196 204 150 200 96 C184 108 136 108 120 96 Z"
            fill="url(#potin)"
          />
          <ellipse cx="160" cy="206" rx="30" ry="9" fill="#8A5A2E" opacity="0.35" />

          <g clipPath="url(#innerclip)">
            <g style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animation: F > 0.5 ? 'pipc-breathe 3.4s ease-in-out infinite' : 'none', transform: `translateY(${droop}px)` }}>
              <g>
                <ellipse cx="141" cy="186" rx="10" ry="13" fill={leafG} transform="rotate(-14 141 186)" />
                <ellipse cx="148" cy="183" rx="8.5" ry="12" fill={leafHi} opacity="0.9" transform="rotate(8 148 183)" />
                <ellipse cx="136" cy="191" rx="7" ry="10" fill={leafG} opacity="0.85" transform="rotate(-24 136 191)" />
                <path d="M141 175 C139 184 140 194 142 202 M148 173 C149 182 148 190 146 198" fill="none" stroke="#2f7a38" strokeWidth="1.2" opacity="0.5" />
              </g>
              <g>
                <path d="M152 189 C149 182 154 178 158 178 C162 178 167 182 164 189 C162 196 159 198 158 198 C156 198 154 196 152 189 Z" fill="url(#capsicumG)" />
                <path d="M156 189 C155 184 157 181 159 181" fill="none" stroke="#2E6B22" strokeWidth="1.1" opacity="0.5" />
                <path d="M158 178 C158 174 159 172 161 172" fill="none" stroke="#3f8f45" strokeWidth="2.2" strokeLinecap="round" />
                <ellipse cx="155" cy="184" rx="1.6" ry="2.6" fill="#EAF6C8" opacity="0.5" />
              </g>
              <g transform="rotate(15 178 189)">
                <ellipse cx="178" cy="189" rx="9.5" ry="13" fill="url(#brinjalG)" />
                <ellipse cx="175" cy="184" rx="2.6" ry="4.4" fill="#fff" opacity="0.25" />
                <path d="M178 177 C176 174 174 173 172 174" fill="none" stroke="#3f8f45" strokeWidth="2.6" strokeLinecap="round" />
              </g>
              <g>
                <circle cx="158" cy="197" r="13" fill="url(#tomatoG)" />
                <ellipse cx="152" cy="191" rx="4" ry="2.8" fill="#fff" opacity="0.5" />
                <g stroke="#3f8f45" strokeWidth="2" strokeLinecap="round" fill="none">
                  <path d="M158 185 l0 4 M158 185 l-4.5 3 M158 185 l4.5 3 M158 185 l-2.5 4.5 M158 185 l2.5 4.5" />
                </g>
                <circle cx="158" cy="185" r="1.8" fill="#2f7a38" />
              </g>
              <g>
                <path d="M147 204 C143 204 141 206.5 141 208 C141 209.5 143 212 147 212 C156 211.5 172 209.5 172 208 C172 206.5 156 204 147 204 Z" fill="url(#carrotG)" />
                <path d="M149 206 q3 1 5 0 M155 206.5 q3 1 5 0 M161 207 q3 1 4 0" fill="none" stroke="#C9631A" strokeWidth="0.7" opacity="0.5" />
                <path d="M141 208 C137 205 134 205 132 207 M141 208 C137 208 134 210 132 211 M141 208 C138 210 135 212 133 213" fill="none" stroke="#3f8f45" strokeWidth="1.6" strokeLinecap="round" />
              </g>
              <g>
                <ellipse cx="142" cy="201" rx="7.5" ry="6.5" fill="url(#lemonG)" />
                <ellipse cx="139" cy="198" rx="2.2" ry="1.6" fill="#fff" opacity="0.45" />
              </g>
            </g>
          </g>

          <path
            d="M112 92 C108 150 118 198 138 218 L182 218 C202 198 212 150 208 92 C188 106 132 106 112 92 Z M120 96 C116 150 126 196 142 212 L178 212 C194 196 204 150 200 96 C184 108 136 108 120 96 Z"
            fill="url(#smallpot)"
            fillRule="evenodd"
            opacity="0.55"
          />
          <path d="M112 92 C108 150 118 198 138 218 L182 218 C202 198 212 150 208 92 C188 106 132 106 112 92 Z" fill="url(#smallpot)" opacity="0.1" />
          <path d="M124 100 C121 150 129 194 140 210 C134 194 128 150 130 104 C128 102 126 101 124 100 Z" fill="#FFFFFF" opacity="0.2" />

          <ellipse cx="160" cy="92" rx="48" ry="12" fill="none" stroke="#C16A34" strokeWidth="5" />
          <ellipse cx="160" cy="93" rx="44" ry="10" fill="#3B190A" opacity="0.35" />
          <ellipse cx="160" cy="90.5" rx="48" ry="12" fill="none" stroke="#E0925A" strokeWidth="1.6" opacity="0.7" />
        </g>
      )}

      {revealUpTo === 5 && wet < 0.985 && (
        <g>
          {[88, 232].map((x, s) => {
            const surfY = 110;
            return (
              <g key={s}>
                {Array.from({ length: 5 }).map((_, j) => {
                  const jitter = ((j % 3) - 1) * 3;
                  const dy = surfY - 40 - (j % 2) * 3;
                  return (
                    <g key={j} transform={`translate(${x + jitter} 40)`}>
                      <g style={{ ['--dy' as string]: `${dy}px`, animation: `pipc-waterdrop ${0.9 + (j % 3) * 0.1}s ${s * 0.22 + j * 0.18}s ease-in infinite` } as React.CSSProperties}>
                        <path d="M0 -5 C 2.6 -1 3 3 0 6 C -3 3 -2.6 -1 0 -5 Z" fill="url(#dropg)" />
                        <ellipse cx="-1.1" cy="1.4" rx="0.9" ry="1.7" fill="#DCF1FF" opacity="0.85" />
                      </g>
                    </g>
                  );
                })}
                {Array.from({ length: 2 }).map((_, j) => (
                  <ellipse
                    key={`r${j}`}
                    cx={x}
                    cy={surfY}
                    rx="3"
                    ry="1.3"
                    fill="none"
                    stroke="#8FD0F5"
                    strokeWidth="1.4"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `pipc-ripple2 1s ${s * 0.22 + j * 0.5 + 0.4}s ease-out infinite` }}
                  />
                ))}
              </g>
            );
          })}
        </g>
      )}

      {show(1) && (
        <g style={{ animation: 'pipc-popScene 0.5s ease-out both' }}>
          <path
            d="M44 92 C38 152 52 216 86 246 C114 272 206 272 234 246 C268 216 282 152 276 92 C276 112 246 124 160 124 C74 124 44 112 44 92 Z M66 98 C60 152 74 210 100 234 C120 252 200 252 220 234 C246 210 260 152 254 98 C238 114 82 114 66 98 Z"
            fill="url(#bigpot)"
            fillRule="evenodd"
            opacity="0.55"
          />
          <path
            d="M44 92 C38 152 52 216 86 246 C114 272 206 272 234 246 C268 216 282 152 276 92 C276 112 246 124 160 124 C74 124 44 112 44 92 Z"
            fill="url(#bigpot)"
            opacity="0.08"
          />
          <path d="M70 116 C60 168 72 224 96 244 C86 224 78 172 80 124 C76 121 72 118 70 116 Z" fill="#FFFFFF" opacity="0.18" />
          {[150, 186, 218].map((y, i) => (
            <path key={i} d={`M${52 + i} ${y} C 100 ${y + 12} 220 ${y + 12} ${268 - i} ${y}`} fill="none" stroke="#7A3B18" strokeWidth="1.5" opacity="0.13" />
          ))}
          <ellipse cx="160" cy="92" rx="116" ry="27" fill="none" stroke="#C9682F" strokeWidth="7" />
          <ellipse cx="160" cy="90" rx="116" ry="27" fill="none" stroke="#E7A06B" strokeWidth="2" opacity="0.7" />
        </g>
      )}

      {show(6) && (
        <g style={{ animation: 'pipc-popScene 0.5s ease-out both', filter: hl(6) ? 'drop-shadow(0 0 10px #FF7212)' : undefined }}>
          <path
            d="M46 84 C58 71 100 65 160 65 C220 65 262 71 274 84
               C270 92 262 96 256 100
               C248 112 240 106 232 112 C224 118 216 110 208 116 C200 122 192 112 184 118
               C176 124 168 112 160 119 C152 112 144 124 136 118 C128 112 120 122 112 116
               C104 110 96 118 88 112 C80 106 72 112 64 100 C58 96 50 92 46 84 Z"
            fill="#C1975A"
          />
          <path
            d="M46 84 C58 71 100 65 160 65 C220 65 262 71 274 84
               C270 92 262 96 256 100
               C248 112 240 106 232 112 C224 118 216 110 208 116 C200 122 192 112 184 118
               C176 124 168 112 160 119 C152 112 144 124 136 118 C128 112 120 122 112 116
               C104 110 96 118 88 112 C80 106 72 112 64 100 C58 96 50 92 46 84 Z"
            fill="url(#burlap)"
          />
          <path d="M50 92 C42 116 44 146 52 166 C58 168 66 166 70 160 C62 140 60 116 63 98 Z" fill="#C1975A" />
          <path d="M50 92 C42 116 44 146 52 166 C58 168 66 166 70 160 C62 140 60 116 63 98 Z" fill="url(#burlap)" />
          <path d="M270 92 C278 116 276 146 268 166 C262 168 254 166 250 160 C258 140 260 116 257 98 Z" fill="#C1975A" />
          <path d="M270 92 C278 116 276 146 268 166 C262 168 254 166 250 160 C258 140 260 116 257 98 Z" fill="url(#burlap)" />

          <path
            d="M46 84 C58 71 100 65 160 65 C220 65 262 71 274 84
               C270 92 262 96 256 100
               C248 112 240 106 232 112 C224 118 216 110 208 116 C200 122 192 112 184 118
               C176 124 168 112 160 119 C152 112 144 124 136 118 C128 112 120 122 112 116
               C104 110 96 118 88 112 C80 106 72 112 64 100 C58 96 50 92 46 84 Z"
            fill="url(#wetDark)"
          />
          <path d="M50 92 C42 116 44 146 52 166 C58 168 66 166 70 160 C62 140 60 116 63 98 Z" fill="url(#wetDark)" />
          <path d="M270 92 C278 116 276 146 268 166 C262 168 254 166 250 160 C258 140 260 116 257 98 Z" fill="url(#wetDark)" />
          <ellipse cx="108" cy="104" rx="26" ry="12" fill="#2E1D0C" opacity="0.28" />
          <ellipse cx="210" cy="104" rx="26" ry="12" fill="#2E1D0C" opacity="0.28" />
          <ellipse cx="58" cy="150" rx="9" ry="18" fill="#2E1D0C" opacity="0.3" />
          <ellipse cx="262" cy="150" rx="9" ry="18" fill="#2E1D0C" opacity="0.3" />
          <ellipse cx="120" cy="80" rx="40" ry="12" fill="url(#wetGloss)" />
          <ellipse cx="205" cy="80" rx="36" ry="11" fill="url(#wetGloss)" />
          <path d="M78 116 C120 108 200 108 244 116" fill="none" stroke="#FFF6DF" strokeWidth="1.4" opacity="0.4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};

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
    tap: () => tone(480, 'sine', 0.08, 0, 0.1),
    step: () => tone(560, 'triangle', 0.12, 0, 0.11),
    correct: () => [660, 880].forEach((f, i) => tone(f, 'sine', 0.16, i * 0.09, 0.13)),
    wrong: () => tone(190, 'sine', 0.22, 0, 0.14),
    finish: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.3, i * 0.11, 0.16)),
  };
}

/* ==================== Teacher | Student toggle ==================== */
function ModeToggle({ mode, onChange, highlighted }: { mode: OperatorMode; onChange: (m: OperatorMode) => void; highlighted?: boolean }) {
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
              padding: '7px 12px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontFamily: fontStack,
              fontWeight: 700,
              fontSize: 12,
              background: sel ? '#fff' : 'transparent',
              color: sel ? C.purple : '#fff',
              transition: 'all 180ms ease',
              whiteSpace: 'nowrap',
              minHeight: 32,
              minWidth: 40,
            }}
          >
            {m === 'ai' ? '👩‍🏫 Teacher' : '🙋 Your turn'}
          </button>
        );
      })}
    </div>
  );
}

/* ==================== Finish overlay — full-screen, NO stars (non-evaluating §6.3) ====================
   The quiz was removed, so this tool no longer scores the student — it is a build-and-observe
   activity. Finish opens a celebratory "What you have learned" screen only, never a star rating. */
function FinishOverlay({
  show,
  onClose,
  builtSteps,
  ranCooling,
  learned,
}: {
  show: boolean;
  onClose: () => void;
  builtSteps: number;
  ranCooling: boolean;
  learned: string[];
}) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        dur: 2 + Math.random() * 1.5,
        size: 6 + Math.random() * 9,
        color: [C.indigo, C.orange, C.amber, C.purple, C.green][Math.floor(Math.random() * 5)],
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
        background: 'rgba(23,22,39,0.62)',
        backdropFilter: 'blur(2px)',
        animation: 'pipc-fadeIn 300ms ease both',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {confetti.map((c, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${c.left}%`,
              top: -20,
              width: c.size,
              height: c.size * 1.4,
              borderRadius: 2,
              background: c.color,
              animation: `pipc-confettiFall ${c.dur}s ease-in ${c.delay}s both`,
            }}
          />
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          maxWidth: 440,
          width: '90%',
          maxHeight: '86vh',
          overflowY: 'auto',
          background: '#FFFFFF',
          borderRadius: 26,
          padding: '28px 26px',
          boxShadow: '0 30px 70px rgba(0,0,0,.4)',
          textAlign: 'center',
          boxSizing: 'border-box',
          fontFamily: fontStack,
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 10px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.purple}, ${C.amber})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DropletIcon size={30} color="#fff" />
        </motion.div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.indigo, margin: '2px 0 4px' }}>Cooler complete!</div>
        <div style={{ fontSize: 13.5, color: C.ink, opacity: 0.7, fontWeight: 600, marginBottom: 16 }}>
          You built all {builtSteps} layers of the matka cooler{ranCooling ? ' and watched it cool down' : ''}.
        </div>
        <div style={{ textAlign: 'left', background: C.cream, borderRadius: 16, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: C.purple, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            What you have learned
          </div>
          {learned.map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: i < learned.length - 1 ? 8 : 0 }}>
              <span style={{ color: C.green, flexShrink: 0, marginTop: 1 }}>
                <CheckIcon size={14} color={C.green} />
              </span>
              <span style={{ color: C.ink, fontSize: 13, lineHeight: 1.5 }}>{pt}</span>
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
            background: `linear-gradient(135deg, ${C.purple}, ${C.amber})`,
            boxShadow: '0 6px 16px rgba(255,114,18,.32)',
          }}
        >
          Done
        </button>
      </motion.div>
    </div>
  );
}

/* ==================== MAIN COMPONENT ==================== */
function PotInPotCooler(props: ToolProps) {
  const p = props?.props ?? {};
  const theme = p.themeColor ?? C.indigo;
  const dark = p.darkMode ?? false;
  const showModeToggle = p.showModeToggle ?? true;
  const seed = p.seed ?? 42;
  const ap: AdditionalProps = p.additionalProps ?? {};
  const weather: 'dry' | 'humid' = ap.weather ?? 'dry';
  const startTemp = ap.startTemp ?? 36;

  /* ---- operator mode + content depth (§6.1-6.2) ----
     No separate example set to trim here (the build has a fixed six-layer
     sequence and the cool phase is one continuous run) — "lean" mainly means
     the control panel collapses to a watch-only demo (§6.1); depth is still
     reported in getState()/events for contract completeness. */
  const [mode, setMode] = useState<OperatorMode>(p.operatorMode ?? 'student');
  const depth: Depth = mode === 'ai' ? 'lean' : 'full';

  /* ---- phase ---- */
  const [phase, setPhaseState] = useState<Phase>('build');

  /* ---- build state ---- */
  const [buildStep, setBuildStep] = useState(0);
  const [wetLevel, setWetLevel] = useState(0);
  const wetRaf = useRef<number | null>(null);
  const [fillProgress, setFillProgress] = useState(0);
  const fillRaf = useRef<number | null>(null);

  useEffect(() => {
    if (fillRaf.current) cancelAnimationFrame(fillRaf.current);
    if (buildStep < 3) {
      setFillProgress(0);
      return;
    }
    if (buildStep > 3) {
      setFillProgress(1);
      return;
    }
    setFillProgress(0);
    let start = 0;
    const dur = 2600;
    const step = (now: number) => {
      if (!start) start = now;
      const pr = Math.min(1, (now - start) / dur);
      setFillProgress(pr);
      if (pr < 1) fillRaf.current = requestAnimationFrame(step);
    };
    fillRaf.current = requestAnimationFrame(step);
    return () => {
      if (fillRaf.current) cancelAnimationFrame(fillRaf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildStep]);

  useEffect(() => {
    const target = buildStep >= 4 ? 1 : 0;
    if (wetRaf.current) cancelAnimationFrame(wetRaf.current);
    let start = 0;
    const from = wetLevel;
    const step = (now: number) => {
      if (!start) start = now;
      const pr = Math.min(1, (now - start) / 2200);
      setWetLevel(from + (target - from) * easeOutCubic(pr));
      if (pr < 1) wetRaf.current = requestAnimationFrame(step);
    };
    wetRaf.current = requestAnimationFrame(step);
    return () => {
      if (wetRaf.current) cancelAnimationFrame(wetRaf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildStep]);

  /* ---- cool state ---- */
  const [dryMode] = useState<'dry' | 'humid'>(weather);
  const [playing, setPlaying] = useState(false);
  const [temp, setTemp] = useState(startTemp);
  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef<number>(0);
  const targetTemp = dryMode === 'dry' ? 18 : 26;
  const duration = dryMode === 'dry' ? 6000 : 9000;
  const [runCompletedOnce, setRunCompletedOnce] = useState(false);

  const tick = useCallback(
    (now: number) => {
      if (!t0Ref.current) t0Ref.current = now;
      const pr = Math.min(1, (now - t0Ref.current) / duration);
      const eased = easeOutCubic(pr);
      setTemp(startTemp - (startTemp - targetTemp) * eased);
      if (pr < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setPlaying(false);
        t0Ref.current = 0;
        setRunCompletedOnce(true);
        interactionsRef.current.runCompletedOnce = true;
        emit({ type: 'event', name: 'run_completed', detail: { finalTemp: Math.round(targetTemp), weather: dryMode } });
      }
    },
    [duration, startTemp, targetTemp, dryMode]
  );

  useEffect(() => {
    if (playing) {
      t0Ref.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, tick]);

  const freshness = clamp((startTemp - temp) / (startTemp - 18), 0, 1);

  /* ---- single source of truth for the combined progress readout ----
     Build fills the first 60% (one slice per layer), cooling fills the
     remaining 40% via freshness — used everywhere a "how far along" number
     or progress-bar width is needed, so no two places can disagree. */
  const buildFrac = buildStep / (BUILD_STEPS.length - 1);
  const overallProgress = phase === 'build' ? buildFrac * 0.6 : 0.6 + freshness * 0.4;

  /* ---- highlight, mute, finish ---- */
  const [highlight, setHighlightState] = useState<HighlightTarget>(null);
  const [muted, setMuted] = useState<boolean>(p.muted ?? false);
  const [showFinish, setShowFinish] = useState(false);
  const [finishedFlag, setFinishedFlag] = useState(false);
  const audio = useAudio(muted);

  /* ---- responsive measuring (§8.1) ---- */
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardW, setCardW] = useState(1100);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setCardW(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [viewportH, setViewportH] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 700);
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isCompact = cardW < 620;
  const isShort = viewportH < 460;

  /* ---- interaction tracking for the finish summary ---- */
  const interactionsRef = useRef({
    buildStepsCompleted: 0,
    coolPlays: 0,
    hintsUsed: 0,
    runCompletedOnce: false,
    startedAt: Date.now(),
  });

  /* ---- keyframes + font (once) ---- */
  useEffect(() => {
    const css = `
      @keyframes pipc-popScene {0%{opacity:0;transform:translateY(14px) scale(.96);}100%{opacity:1;transform:none;}}
      @keyframes pipc-dropIn {0%{opacity:0;transform:translateY(-46px) scaleY(.82);}60%{transform:translateY(2px) scaleY(1.04);}100%{opacity:1;transform:none;}}
      @keyframes pipc-coolpulse {0%,100%{transform:scale(.9);opacity:.0;}50%{transform:scale(1.05);opacity:.5;}}
      @keyframes pipc-breathe {0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-1px) scale(1.02);}}
      @keyframes pipc-waterdrop {0%{transform:translateY(0) scaleY(.7);opacity:0;}12%{opacity:1;}60%{transform:translateY(var(--dy,52px)) scaleY(1.15);opacity:1;}100%{transform:translateY(calc(var(--dy,52px) + 10px)) scaleY(.6);opacity:0;}}
      @keyframes pipc-ripple2 {0%{transform:scale(.3);opacity:.85;}100%{transform:scale(3.6);opacity:0;}}
      @keyframes pipc-sandpour {0%{transform:translateY(-6px);opacity:0;}12%{opacity:1;}82%{opacity:1;}100%{transform:translateY(var(--fall,60px));opacity:0;}}
      @keyframes pipc-fadeUp {from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
      @keyframes pipc-shakeX {0%,100%{transform:translateX(0);}25%{transform:translateX(-6px);}75%{transform:translateX(6px);}}
      @keyframes pipc-glowRing {0%,100%{box-shadow:0 0 0 0 rgba(74,77,201,0);}50%{box-shadow:0 0 0 8px rgba(74,77,201,.22);}}
      @keyframes pipc-hlRing {0%{box-shadow:0 0 0 0 rgba(255,114,18,.55);}100%{box-shadow:0 0 0 14px rgba(255,114,18,0);}}
      @keyframes pipc-fadeIn {from{opacity:0;}to{opacity:1;}}
      @keyframes pipc-confettiFall {from{transform:translateY(0) rotate(0);opacity:.95;}to{transform:translateY(110vh) rotate(320deg);opacity:.1;}}
      @media (prefers-reduced-motion: reduce) {
        [style*="pipc-"] { animation-duration: 0.01ms !important; }
      }
    `;
    const el = document.createElement('style');
    el.id = 'pipc-keys-v2';
    el.textContent = css;
    document.head.appendChild(el);
    if (!document.getElementById('pipc-poppins')) {
      const link = document.createElement('link');
      link.id = 'pipc-poppins';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
    return () => {
      el.remove();
    };
  }, []);

  /* ---- always-fresh state snapshot for agent commands ---- */
  const buildState = useCallback(
    () => ({
      phase,
      buildStep,
      buildTotal: BUILD_STEPS.length,
      buildProgress: buildFrac,
      overallProgress,
      playing,
      temp: Math.round(temp * 10) / 10,
      freshness,
      runCompletedOnce,
      operatorMode: mode,
      depth,
      muted,
      finished: finishedFlag,
    }),
    [phase, buildStep, buildFrac, overallProgress, playing, temp, freshness, runCompletedOnce, mode, depth, muted, finishedFlag]
  );
  const stateRef = useRef(buildState());
  stateRef.current = buildState();

  /* ---- mode + depth switch (§6.1) ---- */
  const applyMode = useCallback((m: OperatorMode) => {
    setMode(m);
    const d: Depth = m === 'ai' ? 'lean' : 'full';
    emit({ type: 'event', name: 'operator_mode_changed', detail: { operatorMode: m, depth: d } });
  }, []);
  useEffect(() => {
    if (p.operatorMode && p.operatorMode !== mode) applyMode(p.operatorMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.operatorMode]);

  /* ---- phase navigation ---- */
  const setPhase = useCallback(
    (ph: Phase) => {
      if (!['build', 'cool'].includes(ph)) return;
      setPhaseState(ph);
      emit({ type: 'event', name: 'phase_changed', detail: { phase: ph } });
    },
    []
  );

  /* ---- build actions ---- */
  const placeStep = useCallback(
    (stepId: string) => {
      const idx = BUILD_STEP_IDS.indexOf(stepId);
      if (idx < 0) return;
      setBuildStep((cur) => {
        if (idx <= cur) return cur; // idempotent-safe
        interactionsRef.current.buildStepsCompleted += 1;
        audio.step();
        emit({ type: 'event', name: 'step_placed', detail: { stepId, buildStep: idx, total: BUILD_STEPS.length } });
        if (idx === BUILD_STEPS.length - 1) emit({ type: 'event', name: 'build_completed', detail: {} });
        return idx;
      });
      setPhaseState('build');
    },
    [audio]
  );
  const undoStep = useCallback(() => {
    setBuildStep((cur) => {
      const next = Math.max(0, cur - 1);
      if (next !== cur) emit({ type: 'event', name: 'step_undone', detail: { buildStep: next } });
      return next;
    });
  }, []);

  /* ---- cool actions ---- */
  const play = useCallback(() => {
    if (phase !== 'cool') setPhaseState('cool');
    setTemp((t) => (t <= targetTemp + 0.3 ? startTemp : t));
    interactionsRef.current.coolPlays += 1;
    audio.tap();
    setPlaying(true);
    emit({ type: 'event', name: 'play', detail: { phase: 'cool' } });
  }, [phase, targetTemp, startTemp, audio]);
  const pause = useCallback(() => {
    setPlaying(false);
    emit({ type: 'event', name: 'pause', detail: {} });
  }, []);

  /* ---- the Cool panel's "Restart" button — a mid-activity, student-facing control that already
     existed before Finish (§6.3's "no Play Again" rule targets a whole-tool replay loop reachable
     AFTER Finish; this is not that — it never appears on/after the finish screen). It now restarts
     the whole guided flow from Build step 1, not just the temperature countdown: back to the first
     build layer, back on the Build phase, the cooling run cleared, and runCompletedOnce cleared so
     the "run complete" note and Finish-eligibility don't lie about a run that hasn't happened again
     yet. It deliberately does NOT touch finishedFlag/showFinish (irrelevant pre-Finish, and this must
     never itself surface the finish overlay) and leaves the cumulative interaction counters
     (buildStepsCompleted/coolPlays/hintsUsed) and startedAt alone — those remain honest running totals
     for the eventual Finish summary, unlike the agent-only reset() below which wipes everything. */
  const restartToBuild = useCallback(() => {
    setPlaying(false);
    setTemp(startTemp);
    t0Ref.current = 0;
    setRunCompletedOnce(false);
    interactionsRef.current.runCompletedOnce = false;
    setBuildStep(0);
    setPhase('build');
  }, [startTemp, setPhase]);

  const reset = useCallback(() => {
    setPlaying(false);
    setTemp(startTemp);
    t0Ref.current = 0;
    setBuildStep(0);
    setRunCompletedOnce(false);
    setPhaseState('build');
    setHighlightState(null);
    setShowFinish(false);
    setFinishedFlag(false);
    interactionsRef.current = { buildStepsCompleted: 0, coolPlays: 0, hintsUsed: 0, runCompletedOnce: false, startedAt: Date.now() };
    emit({ type: 'event', name: 'reset', detail: {} });
  }, [startTemp]);

  const doHighlight = useCallback((target: any) => {
    const t = (target ?? null) as HighlightTarget;
    setHighlightState(t);
    interactionsRef.current.hintsUsed += 1;
    if (t) window.setTimeout(() => setHighlightState((h) => (h === t ? null : h)), 2200);
  }, []);

  /* ---- Finish — non-evaluating (§6.3): the quiz is gone, so this tool no
     longer scores the student. finished carries evaluated:false, no
     score/stars/breakdown, just what the student actually DID + what they
     should take away. ---- */
  const finish = useCallback(() => {
    const { startedAt, ...interactionCounts } = interactionsRef.current;
    const durationMs = Date.now() - startedAt;
    setFinishedFlag(true);
    setShowFinish(true);
    audio.finish();
    emit({
      type: 'event',
      name: 'finished',
      detail: {
        evaluated: false,
        // startedAt is an internal bookkeeping timestamp, not part of the public contract —
        // only the derived durationMs (plus the counters) is reported, matching the JSON.
        interactions: { ...interactionCounts, durationMs },
        learned: LEARNED_POINTS,
      },
    });
  }, [audio]);

  const setParam = useCallback(
    (name: string, value: any) => {
      switch (name) {
        case 'muted':
          setMuted(Boolean(value));
          break;
        case 'operatorMode':
          applyMode(value === 'ai' ? 'ai' : 'student');
          break;
        case 'phase':
          setPhase(value);
          break;
        default:
          break;
      }
    },
    [applyMode, setPhase]
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
    setPhase,
    placeStep,
    undoStep,
    finish,
  };
  const apiRef = useRef(api);
  apiRef.current = api;

  /* ---- command listener + REQUIRED ready signal (§3.1-3.2) ---- */
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

  /* ─────────────────────────────────────────── STYLES ─────────────────────────────────────────── */
  const bg = dark ? '#171627' : C.paper;
  const surface = dark ? '#211F38' : C.white;
  const text = dark ? '#ECEAFB' : C.ink;
  const border = dark ? '#34324F' : C.grayL;
  const stageBg = dark ? '#201e34' : C.cream;

  const hlBox = (t: HighlightTarget): React.CSSProperties =>
    highlight === t ? { animation: 'pipc-hlRing 1.3s ease-out infinite', borderRadius: 16 } : {};

  const pill = (variant: 'solid' | 'ghost' | 'accent', disabled?: boolean): React.CSSProperties => ({
    padding: isShort ? '9px 16px' : '11px 20px',
    borderRadius: 999,
    border: variant === 'ghost' ? `2px solid ${theme}` : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: fontStack,
    fontWeight: 700,
    fontSize: 13.5,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    transition: 'all .2s cubic-bezier(.4,0,.2,1)',
    background: variant === 'solid' ? theme : variant === 'accent' ? `linear-gradient(135deg, ${C.purple}, ${C.amber})` : 'transparent',
    color: variant === 'ghost' ? theme : '#fff',
    opacity: disabled ? 0.45 : 1,
    boxShadow: variant !== 'ghost' && !disabled ? '0 8px 18px -8px rgba(74,77,201,.6)' : 'none',
  });

  const dot = (on: boolean, cur: boolean): React.CSSProperties => ({
    width: cur ? 20 : 7,
    height: 7,
    borderRadius: 999,
    background: on ? theme : dark ? '#3a3857' : C.lav,
    transition: 'all .3s',
  });

  /* ─────────────────────────────────────────── PHASE PANES ───────────────────────────────────────────
     One coherent guided activity — build the cooler, then watch it cool, then Finish. No mode-picker
     tabs, and no standalone progress-bar track/fill element either — overallProgress (computed above)
     stays purely internal, used only to gate Finish; the step journey rail below and the thermometer
     readout are the visible progress cues instead. */
  const buildStepData = BUILD_STEPS[buildStep];

  const renderBuildSide = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isShort ? 6 : 8, height: '100%', minHeight: 0 }}>
      <div key={buildStep} style={{ fontSize: isShort ? 12.5 : 15, fontWeight: 700, color: text, animation: 'pipc-fadeUp .4s ease-out both' }}>
        {buildStepData.title}
      </div>
      <div style={{ fontSize: 11.5, color: text, opacity: 0.7 }}>{buildStepData.caption}</div>

      {!isShort ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
          {BUILD_STEPS.map((s, i) => {
            const state = i < buildStep ? 'done' : i === buildStep ? 'current' : 'todo';
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 10,
                  background: state === 'current' ? (dark ? '#312f4d' : C.cream) : 'transparent',
                  opacity: state === 'todo' ? 0.48 : 1,
                  transition: 'all .25s',
                }}
              >
                <span
                  style={{
                    width: 19,
                    height: 19,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: state === 'done' ? C.green : state === 'current' ? theme : dark ? '#3a3857' : C.lav,
                    color: '#fff',
                    fontSize: 9.5,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {state === 'done' ? <CheckIcon size={10} color="#fff" /> : i + 1}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: state === 'current' ? 700 : 600, color: text }}>{s.title}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          {BUILD_STEPS.map((_, i) => (
            <span key={i} style={dot(i <= buildStep, i === buildStep)} />
          ))}
        </div>
      )}

      {mode === 'student' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={pill('ghost', buildStep === 0)} disabled={buildStep === 0} onClick={() => setBuildStep((s) => Math.max(0, s - 1))}>
            <ChevronLeftIcon size={15} /> Back
          </button>
          {buildStep < BUILD_STEPS.length - 1 ? (
            <button style={{ ...pill('solid'), animation: 'pipc-glowRing 2.2s infinite', flex: 1 }} onClick={() => placeStep(BUILD_STEP_IDS[buildStep + 1])}>
              Next <ChevronRightIcon size={15} />
            </button>
          ) : (
            <button style={{ ...pill('accent'), flex: 1 }} onClick={() => setPhase('cool')}>
              <SnowflakeIcon size={15} /> Cool it!
            </button>
          )}
        </div>
      )}
      {mode === 'ai' && (
        <div style={{ fontSize: 12, color: theme, fontWeight: 600 }}>
          👩‍🏫 Your teacher is showing you this — watch, you'll get a turn.
        </div>
      )}
    </div>
  );

  const tColor = temp > 28 ? C.red : temp > 20 ? C.amber : C.indigo;
  const colBottom = 138, colTop = 20;
  const frac = clamp((temp - 0) / 40, 0, 1);
  const colY = colBottom - frac * (colBottom - colTop);

  const renderCoolSide = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isShort ? 6 : 10, height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg viewBox="0 0 70 176" width={isShort ? 40 : 56} style={{ display: 'block', flexShrink: 0, ...hlBox('thermometer') }}>
          <defs>
            <linearGradient id="pipc-merc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={tColor} />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="0.5" stopColor={tColor} />
              <stop offset="1" stopColor={tColor} />
            </linearGradient>
            <linearGradient id="pipc-glass" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={dark ? '#3a3760' : '#ffffff'} />
              <stop offset="0.5" stopColor={dark ? '#2a2844' : '#eef1f8'} />
              <stop offset="1" stopColor={dark ? '#211f38' : '#dfe3ef'} />
            </linearGradient>
          </defs>
          <rect x="26" y="12" width="16" height="132" rx="8" fill="url(#pipc-glass)" stroke={C.lav} strokeWidth="2" />
          <circle cx="34" cy="150" r="16" fill="url(#pipc-glass)" stroke={C.lav} strokeWidth="2" />
          <circle cx="34" cy="150" r="11.5" fill={tColor} style={{ transition: 'fill .5s' }} />
          <rect x="29.5" y={colY} width="9" height={colBottom - colY + 14} rx="4.5" fill={tColor} style={{ transition: 'fill .5s' }} />
          <rect x="31" y={colY + 2} width="2.4" height={Math.max(0, colBottom - colY)} rx="1.2" fill="#ffffff" opacity="0.4" />
          {[0, 10, 20, 30, 40].map((v) => {
            const y = colBottom - (v / 40) * (colBottom - colTop);
            return (
              <g key={v}>
                <line x1="42" y1={y} x2="48" y2={y} stroke={dark ? '#8b88ad' : '#A9A6C9'} strokeWidth="1.4" />
                <text x="51" y={y + 3} fontSize="8" fill={dark ? '#bdbad9' : '#8B88A8'} fontFamily="inherit">{v}</text>
              </g>
            );
          })}
          <text x="34" y="154" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle">
            {Math.round(temp)}°
          </text>
        </svg>
        <div>
          <div style={{ fontSize: isShort ? 19 : 26, fontWeight: 800, color: tColor }}>{Math.round(temp)}°C</div>
          <div style={{ fontSize: 10.5, color: text, opacity: 0.6, fontWeight: 600 }}>Target: {targetTemp}°C ({dryMode} day)</div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: tColor }}>
        {temp <= targetTemp + 0.6
          ? 'Cool & fresh! Evaporation carried the heat away 🌿'
          : playing
          ? 'Water evaporating from the sand… heat leaving…'
          : 'Press play — watch the temperature drop'}
      </div>
      <div
        style={{
          background: dark ? '#26243d' : C.grayL,
          borderRadius: 12,
          padding: isShort ? '7px 9px' : '9px 11px',
          fontSize: isShort ? 10.5 : 11.5,
          lineHeight: 1.45,
          color: text,
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        💧 Water held in the wet sand keeps evaporating from the outer pot. Evaporation uses up heat
        energy, drawing it away from the inner pot — that is why the temperature keeps falling the
        longer the cooler runs.
        {runCompletedOnce && (
          <div style={{ marginTop: 6, fontWeight: 700, color: C.green }}>✓ Run complete — press Finish below when you're ready.</div>
        )}
      </div>
      {mode === 'student' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{
              ...pill('solid'),
              ...hlBox('playButton'),
              flex: 1,
              animation: !playing && temp === startTemp ? 'pipc-glowRing 1.8s infinite' : hlBox('playButton').animation,
            }}
            onClick={() => (playing ? pause() : play())}
          >
            {playing ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button style={pill('ghost')} onClick={restartToBuild} title="Start over from Build step 1">
            <RotateCcwIcon size={15} /> Restart
          </button>
        </div>
      )}
      {mode === 'ai' && (
        <div style={{ fontSize: 12, color: theme, fontWeight: 600 }}>
          👩‍🏫 Your teacher is showing you this — watch, you'll get a turn.
        </div>
      )}
    </div>
  );

  const sceneRevealUpTo = phase === 'build' ? buildStep + 1 : 6;
  const sceneWet = phase === 'build' ? wetLevel : 1;
  const sceneEvaporate = phase === 'build' ? buildStep >= 5 : playing || temp < startTemp - 0.5;
  const sceneFreshness = phase === 'build' ? 1 : freshness;
  const sceneCool = phase === 'build' ? 0 : freshness;
  const sceneFill = phase === 'build' ? fillProgress : 1;

  // Finish unlocks once the cooler is fully built AND the cooling run has completed at least
  // once — the single runCompletedOnce flag also drives the same note inside the Cool card.
  const canFinish = buildStep === BUILD_STEPS.length - 1 && runCompletedOnce;

  return (
    <div
      style={{
        width: '100%',
        height: '100dvh',
        minHeight: '100vh',
        maxHeight: '100dvh',
        boxSizing: 'border-box',
        padding: 'clamp(6px, 1.6vw, 18px)',
        background: bg,
        fontFamily: fontStack,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
      }}
    >
      <div
        ref={cardRef}
        style={{
          width: '100%',
          maxWidth: 1280,
          background: surface,
          borderRadius: 'clamp(14px, 2vw, 24px)',
          overflow: 'hidden',
          boxShadow: dark ? '0 24px 60px -20px rgba(0,0,0,.6)' : '0 20px 50px -20px rgba(83,48,134,.32)',
          border: `1px solid ${border}`,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.purple}, ${C.amber})`,
            padding: isShort ? '8px 14px' : 'clamp(10px, 2vw, 18px)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: isShort ? 30 : 38,
                height: isShort ? 30 : 38,
                borderRadius: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.2)',
                flexShrink: 0,
              }}
            >
              <DropletIcon size={isShort ? 16 : 20} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isShort ? 13 : 16, fontWeight: 700, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Pot-in-Pot Cooler
              </div>
              <div style={{ fontSize: 10.5, opacity: 0.88, fontWeight: 500 }}>Evaporation causes a cooling effect</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label="Mute sound"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: 'none',
                background: 'rgba(255,255,255,0.16)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...hlBox('muteButton'),
              }}
            >
              {muted ? <VolumeXIcon size={15} color="#fff" /> : <Volume2Icon size={15} color="#fff" />}
            </button>
            {showModeToggle && <div style={hlBox('modeToggle')}><ModeToggle mode={mode} onChange={applyMode} highlighted={highlight === 'modeToggle'} /></div>}
          </div>
        </div>

        {/* BODY — one guided flow (build → cool), no mode-picker tabs. The illustrated scene is the
            visual centrepiece: it takes the lion's share of the width (flex-grow, uncapped) while the
            control card is a snug, content-fit column (a capped flex-basis) so it never reads as a big
            empty void — §8.1 two-pane split, recomposes to a stacked column when the frame is narrow. */}
        <div
          style={{
            display: 'flex',
            flexDirection: isCompact ? 'column' : 'row',
            gap: isShort ? 8 : 'clamp(10px, 1.8vw, 20px)',
            padding: isShort ? '8px 12px' : 'clamp(10px, 2vw, 20px)',
            boxSizing: 'border-box',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: isCompact ? 'auto' : 'hidden',
          }}
        >
          <div
            style={{
              flex: isCompact ? '0 0 auto' : '1 1 auto',
              minWidth: 0,
              minHeight: isCompact ? (isShort ? 150 : 220) : 0,
              background: stageBg,
              borderRadius: 'clamp(14px, 1.8vw, 22px)',
              padding: 'clamp(8px, 1.6vw, 18px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div style={{ width: '100%', height: '100%', maxWidth: 'min(94%, 620px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CoolerScene
                revealUpTo={sceneRevealUpTo}
                wet={sceneWet}
                evaporate={sceneEvaporate}
                freshness={sceneFreshness}
                cool={sceneCool}
                fill={sceneFill}
                highlight={highlight}
              />
            </div>
          </div>

          <div
            style={{
              flex: isCompact ? '0 0 auto' : `0 0 clamp(240px, 29vw, 360px)`,
              width: isCompact ? '100%' : undefined,
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              background: dark ? '#1b1930' : '#FBF6EF',
              border: `1px solid ${border}`,
              borderRadius: 'clamp(14px, 1.8vw, 20px)',
              padding: isShort ? '10px 12px' : 'clamp(12px, 1.8vw, 18px)',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.25 }}
                style={{ flex: 1, minHeight: 0 }}
              >
                {phase === 'build' ? renderBuildSide() : renderCoolSide()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* FOOTER — Finish button, STUDENT MODE ONLY (§6.3) — non-evaluating: no stars, no score */}
        {mode === 'student' && (
          <div
            style={{
              padding: isShort ? '6px 14px 10px' : '8px 18px 16px',
              boxSizing: 'border-box',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={() => canFinish && finish()}
              disabled={!canFinish}
              style={{
                ...pill('accent', !canFinish),
                ...hlBox('finishButton'),
              }}
              title={canFinish ? 'Finish and see what you have learned' : 'Finish the build and run the cooling simulation once to unlock Finish'}
            >
              <FlagIcon size={15} /> Finish
            </button>
          </div>
        )}
      </div>

      <FinishOverlay
        show={showFinish}
        onClose={() => setShowFinish(false)}
        builtSteps={BUILD_STEPS.length}
        ranCooling={runCompletedOnce}
        learned={LEARNED_POINTS}
      />
    </div>
  );
}

export default PotInPotCooler;
