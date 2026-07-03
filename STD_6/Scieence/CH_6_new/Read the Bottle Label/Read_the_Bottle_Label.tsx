// Tool type: Process animator (5) + Misconception probe / sorter (18) + gamified Quiz
// Volume Explorer — Class 6 "Materials Around Us" (Space & Volume, What is Matter)
// Flow: LEARN (animated explainer) -> ACTIVITY (drag/tap matcher) -> QUIZ (graded + review)
//
// CHANGES IN THIS VERSION:
//  1. Drag now works on EVERY device (mouse / touch / pen) via Pointer Events + a
//     floating drag-ghost and rect hit-testing. The old HTML5 drag-and-drop (which
//     does nothing on touch screens) has been removed. Tap-to-place still works too.
//  2. Quiz options are reshuffled each run so the correct answer lands in a DIFFERENT
//     position for every question — no exploitable pattern. Distractor order is random.

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────
// INLINE SVG ICONS
// ─────────────────────────────────────────────────────────────────

const IconCheck: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconXCircle: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconReset: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
  </svg>
);

const IconPlay: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
);

const IconPause: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" />
  </svg>
);

const IconChevronRight: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

const IconChevronLeft: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 6 9 12 15 18" />
  </svg>
);

const IconStar: React.FC<{ size?: number; fill?: string }> = ({ size = 28, fill = '#FF7212' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconAward: React.FC<{ size?: number; color?: string }> = ({ size = 40, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// KEYFRAMES
// ─────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

  @keyframes vm_fadeDown  { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes vm_fadeUp    { from{opacity:0;transform:translateY(14px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes vm_fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes vm_shake     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
  @keyframes vm_lockIn    { 0%{transform:scale(1)} 40%{transform:scale(1.07)} 70%{transform:scale(0.97)} 100%{transform:scale(1)} }
  @keyframes vm_gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes vm_float     { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-4px)} }
  @keyframes vm_pop       { from{opacity:0;transform:scale(0.82) translateY(24px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes vm_starPop   { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.2) rotate(5deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
  @keyframes vm_hintBlink { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes vm_zonePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.01)} }
  @keyframes vm_dropGlow  { 0%,100%{box-shadow:0 0 0 0 rgba(74,77,201,0.4)} 50%{box-shadow:0 0 0 8px rgba(74,77,201,0)} }
  @keyframes vm_confetti  { 0%{transform:translateY(-12px) rotate(0deg);opacity:1} 100%{transform:translateY(360px) rotate(540deg);opacity:0} }
  @keyframes vm_pulseRing { 0%{box-shadow:0 0 0 0 rgba(255,114,18,0.45)} 70%{box-shadow:0 0 0 12px rgba(255,114,18,0)} 100%{box-shadow:0 0 0 0 rgba(255,114,18,0)} }
`;

// ─────────────────────────────────────────────────────────────────
// COLOUR PALETTE — matches Singularity design system exactly
// ─────────────────────────────────────────────────────────────────

const C = {
  primary:      '#4A4DC9',
  primaryLight: '#C1C1EA',
  accent:       '#FF7212',
  accentLight:  '#FFF3E4',
  gradStart:    '#533086',
  gradEnd:      '#FC9145',
  textDark:     '#1a1a2e',
  textMid:      '#4E4E4E',
  textLight:    '#CACACA',
  bg:           '#F5F5F5',
  white:        '#ffffff',
  success:      '#22c55e',
  successBg:    '#dcfce7',
  successText:  '#14532d',
  error:        '#ef4444',
  errorBg:      '#fee2e2',
  errorText:    '#7f1d1d',
  disabled:     '#EBEBEB',
};
const F = 'Poppins, sans-serif';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

type Mode = 'learn' | 'match' | 'quiz';
type QuizPhase = 'play' | 'result' | 'review';

interface BottleData {
  id: string;
  volumeLabel: string;
  mlValue: number;
  color: string;
  correctTumblerId: string;
  reason: string;
  hint: string;
}

interface TumblerData {
  id: string;
  name: string;
  capacityLabel: string;
  size: 'small' | 'medium' | 'large';
}

interface LearnStep {
  id: string;
  caption: string;
  durationMs: number;
}

interface QuizQ {
  id: string;
  prompt: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  formula?: string;
  diagram: 'twoGlasses' | 'litreCups' | 'bottles' | 'notation';
}

interface ToolProps {
  props?: {
    additionalProps?: { finalMessage?: string };
  };
  setStepDetails?: (d: unknown) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────

const BOTTLES: BottleData[] = [
  {
    id: 'b200', volumeLabel: '200 mL', mlValue: 200, color: '#4A4DC9',
    correctTumblerId: 't_small',
    reason: '200 mL fills a small glass exactly — it is just 1/5 of a litre (1 L = 1000 mL).',
    hint: 'The smallest bottle goes into the smallest container. Look for the tiny glass!',
  },
  {
    id: 'b500', volumeLabel: '500 mL', mlValue: 500, color: '#533086',
    correctTumblerId: 't_medium',
    reason: '500 mL = half a litre. It fills the medium mug perfectly — halfway to 1 L.',
    hint: '500 mL is exactly half of 1 litre. Try the medium-sized mug!',
  },
  {
    id: 'b1L', volumeLabel: '1 L', mlValue: 1000, color: '#FF7212',
    correctTumblerId: 't_large',
    reason: '1 L = 1000 mL. Only the big jug can hold this much. Remember: 1 m\u00b3 = 1000 L!',
    hint: 'One full litre is the most liquid here. It needs the biggest container!',
  },
];

const TUMBLERS: TumblerData[] = [
  { id: 't_medium', name: 'Medium Mug',  capacityLabel: 'Medium size', size: 'medium' },
  { id: 't_large',  name: 'Big Jug',     capacityLabel: 'Large size',  size: 'large'  },
  { id: 't_small',  name: 'Small Glass', capacityLabel: 'Small size',  size: 'small'  },
];

const LEARN_STEPS: LearnStep[] = [
  { id: 's0', caption: 'Step 1 — These two glasses are exactly the same size, but one fills up only halfway while the other is almost full.', durationMs: 2600 },
  { id: 's1', caption: 'Step 2 — The space the water takes up inside a glass is called its volume. More water means more volume.', durationMs: 2400 },
  { id: 's2', caption: 'Step 3 — We measure volume in litres (L) and millilitres (mL).', durationMs: 2200 },
  { id: 's3', caption: 'Step 4 — One full litre is the same amount as 1000 millilitres. So 1 L = 1000 mL.', durationMs: 2600 },
  { id: 's4', caption: 'Step 5 — Bottles in shops print their volume on the label — like 200 mL, 500 mL or 1 L.', durationMs: 2400 },
];

// Master question bank. Option ORDER here is irrelevant — buildQuiz() reshuffles
// every option set on each run and places the correct answer in a varying slot.
const QUIZ: QuizQ[] = [
  {
    id: 'q1',
    prompt: 'The amount of space a liquid takes up is called its —',
    options: ['Volume', 'Mass', 'Colour', 'Shine'],
    correctIdx: 0,
    explanation: 'The space occupied by a liquid (or any matter) is its volume. Two identical glasses can hold different amounts of water — the one with more water has the greater volume.',
    diagram: 'twoGlasses',
  },
  {
    id: 'q2',
    prompt: 'How many millilitres (mL) make up 1 litre (L)?',
    options: ['10 mL', '100 mL', '1000 mL', '500 mL'],
    correctIdx: 2,
    explanation: 'One litre is split into 1000 equal millilitres. So a 1 L bottle holds the same water as ten 100 mL cups.',
    formula: '1 L = 1000 mL',
    diagram: 'litreCups',
  },
  {
    id: 'q3',
    prompt: 'Which is the correct way to write five hundred millilitres?',
    options: ['500 ml', '500 ML', '500 mL', '500ML'],
    correctIdx: 2,
    explanation: 'In the unit mL the "m" is small and the "L" is capital, with a space after the number — so we write 500 mL.',
    diagram: 'notation',
  },
  {
    id: 'q4',
    prompt: 'Three bottles read 200 mL, 500 mL and 1 L. Which holds the MOST water?',
    options: ['200 mL', '500 mL', '1 L', 'They are equal'],
    correctIdx: 2,
    explanation: '1 L equals 1000 mL, which is far more than 500 mL or 200 mL. So the 1 L bottle holds the most water.',
    formula: '1 L = 1000 mL',
    diagram: 'bottles',
  },
];

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a fresh quiz where:
//  - distractors are shuffled, AND
//  - the correct answer is forced into a DISTINCT slot per question (a permutation
//    of option positions), so the correct answer never follows a guessable pattern
//    such as "always C".
function buildQuiz(): QuizQ[] {
  const optionCount = QUIZ[0]?.options.length ?? 4;
  // Distinct target positions, cycled if there happen to be more questions than slots.
  const positions = shuffle(Array.from({ length: optionCount }, (_, i) => i));
  return QUIZ.map((q, qi) => {
    const correctVal = q.options[q.correctIdx];
    const distractors = shuffle(q.options.filter((_, idx) => idx !== q.correctIdx));
    const target = positions[qi % positions.length];
    const opts: string[] = [];
    let di = 0;
    for (let slot = 0; slot < q.options.length; slot++) {
      opts.push(slot === target ? correctVal : distractors[di++]);
    }
    return { ...q, options: opts, correctIdx: opts.indexOf(correctVal) };
  });
}

const DEFAULT_FINAL =
  'Volume is the space a liquid takes up, measured in litres (L) and millilitres (mL). 1 L\u00a0=\u00a01000\u00a0mL. Always read the label on a bottle to know its volume!';

// ─────────────────────────────────────────────────────────────────
// BOTTLE SVG — tall Indian-style water bottle
// ─────────────────────────────────────────────────────────────────

const BottleSVG: React.FC<{ bottle: BottleData; locked: boolean }> = ({ bottle, locked }) => {
  const col = bottle.color;
  const bodyFill = col + '28';
  const waterFill = col + '55';
  const fillPct = bottle.mlValue >= 1000 ? 0.80 : bottle.mlValue >= 500 ? 0.55 : 0.30;
  const bodyTop = 30; const bodyBot = 118; const bodyH = bodyBot - bodyTop;
  const waterTop = bodyTop + bodyH * (1 - fillPct);

  return (
    <svg viewBox="0 0 72 130" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      <rect x="25" y="3" width="22" height="13" rx="4" fill={col} />
      <rect x="21" y="14" width="30" height="5" rx="2" fill={col} opacity="0.75" />
      <path d="M24 19 Q24 30 14 30 L58 30 Q48 30 48 19 Z" fill={col} opacity="0.6" />
      <rect x="10" y="30" width="52" height="88" rx="12" fill={bodyFill} stroke={col} strokeWidth="2" />
      <rect x="12" y={waterTop} width="48" height={bodyBot - waterTop - 2} rx="8" fill={waterFill} />
      <ellipse cx="36" cy={waterTop} rx="22" ry="3.5" fill={col} opacity="0.3" />
      <rect x="15" y="34" width="7" height="36" rx="3.5" fill="white" opacity="0.3" />
      <rect x="12" y="72" width="48" height="30" rx="6" fill="white" opacity="0.92" />
      <rect x="12" y="72" width="48" height="30" rx="6" fill="none" stroke={col} strokeWidth="1" opacity="0.3" />
      <text x="36" y="87" textAnchor="middle" fontFamily={F} fontWeight={800}
        fontSize={bottle.volumeLabel.length > 4 ? 10 : 12} fill={col}>
        {bottle.volumeLabel}
      </text>
      <text x="36" y="98" textAnchor="middle" fontFamily={F} fontSize={8} fill="#64748B">volume</text>
      <rect x="14" y="114" width="44" height="6" rx="3" fill={col} opacity="0.25" />
      {locked && (
        <g transform="translate(46, 2)">
          <circle cx="11" cy="11" r="11" fill={C.success} stroke="white" strokeWidth="1.5" />
          <polyline points="5 11 9 15 17 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// TUMBLER SVG — three distinct vessel shapes
// ─────────────────────────────────────────────────────────────────

const TumblerSVG: React.FC<{
  tumbler: TumblerData;
  isOver: boolean;
  fillColor?: string;
  fillPct?: number;
}> = ({ tumbler, isOver, fillColor, fillPct = 0 }) => {
  const stroke = fillColor ?? (isOver ? C.primary : '#94A3B8');
  const bodyFill = isOver && !fillColor ? `${C.primary}18` : '#F8FAFC';

  if (tumbler.size === 'small') {
    return (
      <svg viewBox="0 0 90 100" width="100%" height="100%" style={{ display: 'block' }}>
        <path d="M22 20 L18 85 H72 L68 20 Z" fill={bodyFill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
        {fillPct > 0 && fillColor && (
          <path d={`M${18 + (68-18)*(1-fillPct)} ${85 - 65*fillPct} L18 85 H72 L${72 - (68-18)*(1-fillPct)} ${85 - 65*fillPct} Z`}
            fill={fillColor + '55'} />
        )}
        <line x1="20" y1="20" x2="70" y2="20" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        {!fillColor && <rect x="25" y="24" width="6" height="32" rx="3" fill="white" opacity="0.6" />}
        <rect x="16" y="83" width="58" height="6" rx="3" fill={stroke} opacity="0.2" />
      </svg>
    );
  }

  if (tumbler.size === 'medium') {
    return (
      <svg viewBox="0 0 100 110" width="100%" height="100%" style={{ display: 'block' }}>
        <rect x="12" y="14" width="62" height="76" rx="8" fill={bodyFill} stroke={stroke} strokeWidth="2.5" />
        {fillPct > 0 && fillColor && (
          <rect x="14" y={14 + 76*(1-fillPct)} width="58" height={76*fillPct} rx="6" fill={fillColor + '55'} />
        )}
        <path d="M74 30 Q96 30 96 52 Q96 74 74 74" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="14" x2="74" y2="14" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        {!fillColor && <rect x="17" y="18" width="7" height="40" rx="3.5" fill="white" opacity="0.5" />}
        <rect x="10" y="88" width="66" height="7" rx="3" fill={stroke} opacity="0.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 110 120" width="100%" height="100%" style={{ display: 'block' }}>
      <path d="M16 12 Q14 95 16 100 H82 Q84 95 82 12 Z" fill={bodyFill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      {fillPct > 0 && fillColor && (
        <path d={`M${16 + (82-16)*(1-fillPct)*0.02} ${12 + 88*(1-fillPct)} L16 100 H82 L${82 - (82-16)*(1-fillPct)*0.02} ${12+88*(1-fillPct)} Z`}
          fill={fillColor + '55'} />
      )}
      <path d="M82 25 Q108 25 108 50 Q108 78 82 78" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <path d="M30 12 Q36 2 46 2 Q56 2 62 12" fill={bodyFill} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="12" x2="82" y2="12" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      {!fillColor && <rect x="21" y="16" width="8" height="48" rx="4" fill="white" opacity="0.4" />}
      <rect x="14" y="98" width="70" height="8" rx="4" fill={stroke} opacity="0.2" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// A SIMPLE GLASS (trapezoid) — used by the Learn figure & mini diagrams
// ─────────────────────────────────────────────────────────────────

const GlassFill: React.FC<{
  cx: number; topY: number; botY: number; topW: number; botW: number;
  fill: number; color: string; label?: string; labelColor?: string;
}> = ({ cx, topY, botY, topW, botW, fill, color, label, labelColor }) => {
  const tl = cx - topW / 2, tr = cx + topW / 2;
  const bl = cx - botW / 2, br = cx + botW / 2;
  const f = Math.max(0, Math.min(1, fill));
  const wy = botY - (botY - topY) * f;
  const frac = (botY - wy) / (botY - topY);
  const wWidth = botW + (topW - botW) * frac;
  const wl = cx - wWidth / 2, wr = cx + wWidth / 2;
  return (
    <g>
      {f > 0 && (
        <path d={`M${wl} ${wy} L${wr} ${wy} L${br} ${botY} L${bl} ${botY} Z`} fill={color + '55'} />
      )}
      {f > 0 && <ellipse cx={cx} cy={wy} rx={wWidth / 2 - 1} ry={2.5} fill={color} opacity="0.35" />}
      <path d={`M${tl} ${topY} L${tr} ${topY} L${br} ${botY} L${bl} ${botY} Z`}
        fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1={tl} y1={topY} x2={tr} y2={topY} stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
      {label && (
        <text x={cx} y={botY + 18} textAnchor="middle" fontFamily={F} fontWeight={700} fontSize={11} fill={labelColor || C.textMid}>
          {label}
        </text>
      )}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────
// LEARN FIGURE — animated, changes per step
// ─────────────────────────────────────────────────────────────────

const LearnFigure: React.FC<{ step: number; progress: number }> = ({ step, progress }) => {
  const p = easeOutCubic(Math.min(progress, 1));

  if (step <= 1) {
    const leftFill = 0.5 * (step === 0 ? p : 1);
    const rightFill = 0.92 * (step === 0 ? p : 1);
    const showLabels = step === 1 ? p : 0;
    return (
      <svg viewBox="0 0 360 230" width="100%" height="100%" style={{ display: 'block' }}>
        <GlassFill cx={108} topY={36} botY={186} topW={86} botW={66} fill={leftFill} color={C.primary} />
        <GlassFill cx={252} topY={36} botY={186} topW={86} botW={66} fill={rightFill} color={C.primary} />
        <text x={108} y={214} textAnchor="middle" fontFamily={F} fontWeight={700} fontSize={12} fill={C.textMid}>Same glass</text>
        <text x={252} y={214} textAnchor="middle" fontFamily={F} fontWeight={700} fontSize={12} fill={C.textMid}>Same glass</text>
        {showLabels > 0.05 && (
          <g opacity={showLabels}>
            <rect x={62} y={120} width={92} height={26} rx={8} fill="#fff" stroke={C.primary} strokeWidth="1.5" />
            <text x={108} y={137} textAnchor="middle" fontFamily={F} fontWeight={700} fontSize={11} fill={C.primary}>less volume</text>
            <rect x={206} y={62} width={92} height={26} rx={8} fill="#fff" stroke={C.accent} strokeWidth="1.5" />
            <text x={252} y={79} textAnchor="middle" fontFamily={F} fontWeight={700} fontSize={11} fill={C.accent}>more volume</text>
          </g>
        )}
      </svg>
    );
  }

  if (step === 2) {
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    return (
      <svg viewBox="0 0 360 230" width="100%" height="100%" style={{ display: 'block' }}>
        <GlassFill cx={150} topY={30} botY={190} topW={96} botW={72} fill={0.7 * p} color={C.gradStart} />
        <line x1={228} y1={36} x2={228} y2={184} stroke={C.textMid} strokeWidth="2" />
        {ticks.map((t, i) => {
          const y = 184 - (184 - 36) * t;
          const lbl = ['0', '250 mL', '500 mL', '750 mL', '1 L'][i];
          return (
            <g key={i} opacity={p}>
              <line x1={222} y1={y} x2={234} y2={y} stroke={C.textMid} strokeWidth="2" />
              <text x={242} y={y + 4} fontFamily={F} fontSize={11} fontWeight={600} fill={C.textMid}>{lbl}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  if (step === 3) {
    const cups = 10;
    const shown = Math.round(cups * p);
    return (
      <svg viewBox="0 0 360 230" width="100%" height="100%" style={{ display: 'block' }}>
        <GlassFill cx={72} topY={34} botY={188} topW={78} botW={60} fill={0.85} color={C.accent} label="1 L jug" labelColor={C.accent} />
        <text x={150} y={118} textAnchor="middle" fontFamily={F} fontWeight={800} fontSize={30} fill={C.gradStart}>=</text>
        {Array.from({ length: cups }).map((_, i) => {
          const col = i % 5, row = Math.floor(i / 5);
          const cx = 196 + col * 32, topY = 70 + row * 66;
          const on = i < shown;
          return (
            <g key={i} opacity={on ? 1 : 0.18}>
              <GlassFill cx={cx} topY={topY} botY={topY + 44} topW={24} botW={18} fill={on ? 0.8 : 0} color={C.primary} />
            </g>
          );
        })}
        <text x={266} y={214} textAnchor="middle" fontFamily={F} fontWeight={700} fontSize={11} fill={C.primary}>ten 100 mL cups</text>
      </svg>
    );
  }

  const reveal = (i: number) => Math.max(0, Math.min(1, p * 3 - i));
  return (
    <svg viewBox="0 0 360 230" width="100%" height="100%" style={{ display: 'block' }}>
      {[
        { x: 60, label: '200 mL', col: C.primary, f: 0.32, h: 96 },
        { x: 180, label: '500 mL', col: C.gradStart, f: 0.55, h: 124 },
        { x: 300, label: '1 L', col: C.accent, f: 0.82, h: 150 },
      ].map((b, i) => {
        const o = reveal(i);
        const top = 196 - b.h;
        return (
          <g key={i} opacity={o} transform={`translate(0, ${(1 - o) * 14})`}>
            <rect x={b.x - 26} y={top} width={52} height={b.h} rx={10} fill={b.col + '22'} stroke={b.col} strokeWidth="2" />
            <rect x={b.x - 23} y={top + b.h * (1 - b.f)} width={46} height={b.h * b.f - 3} rx={6} fill={b.col + '55'} />
            <rect x={b.x - 10} y={top - 10} width={20} height={12} rx={3} fill={b.col} />
            <rect x={b.x - 24} y={196 - 26} width={48} height={20} rx={5} fill="#fff" stroke={b.col} strokeWidth="1" />
            <text x={b.x} y={196 - 12} textAnchor="middle" fontFamily={F} fontWeight={800} fontSize={b.label.length > 4 ? 11 : 12} fill={b.col}>{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// MINI DIAGRAM — tool-native, used in quiz review cards
// ─────────────────────────────────────────────────────────────────

const MiniDiagram: React.FC<{ type: QuizQ['diagram'] }> = ({ type }) => {
  if (type === 'twoGlasses') {
    return (
      <svg viewBox="0 0 200 110" width="100%" height={96} style={{ display: 'block' }}>
        <GlassFill cx={62} topY={14} botY={90} topW={50} botW={38} fill={0.45} color={C.primary} label="less" />
        <GlassFill cx={138} topY={14} botY={90} topW={50} botW={38} fill={0.9} color={C.primary} label="more" labelColor={C.accent} />
      </svg>
    );
  }
  if (type === 'litreCups') {
    return (
      <svg viewBox="0 0 220 96" width="100%" height={92} style={{ display: 'block' }}>
        <GlassFill cx={36} topY={12} botY={82} topW={44} botW={34} fill={0.85} color={C.accent} label="1 L" labelColor={C.accent} />
        <text x={78} y={54} textAnchor="middle" fontFamily={F} fontWeight={800} fontSize={20} fill={C.gradStart}>=</text>
        {Array.from({ length: 10 }).map((_, i) => {
          const col = i % 5, row = Math.floor(i / 5);
          return <GlassFill key={i} cx={108 + col * 22} topY={12 + row * 36} botY={12 + row * 36 + 26} topW={16} botW={12} fill={0.8} color={C.primary} />;
        })}
      </svg>
    );
  }
  if (type === 'bottles') {
    return (
      <svg viewBox="0 0 220 110" width="100%" height={96} style={{ display: 'block' }}>
        {[{ x: 40, l: '200 mL', c: C.primary, h: 56 }, { x: 110, l: '500 mL', c: C.gradStart, h: 74 }, { x: 180, l: '1 L', c: C.accent, h: 92 }].map((b, i) => {
          const top = 98 - b.h;
          return (
            <g key={i}>
              <rect x={b.x - 18} y={top} width={36} height={b.h} rx={7} fill={b.c + '22'} stroke={b.c} strokeWidth="1.5" />
              <rect x={b.x - 15} y={top + b.h * 0.25} width={30} height={b.h * 0.75 - 2} rx={4} fill={b.c + '55'} />
              <text x={b.x} y={108} textAnchor="middle" fontFamily={F} fontWeight={700} fontSize={10} fill={b.c}>{b.l}</text>
            </g>
          );
        })}
      </svg>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, padding: '10px 0' }}>
      <div style={{ fontFamily: F, fontWeight: 800, fontSize: 30, color: C.gradStart }}>
        500&nbsp;
        <span style={{ color: C.textMid, fontSize: 26 }}>m</span>
        <span style={{ color: C.accent, fontSize: 30 }}>L</span>
      </div>
      <div style={{ fontFamily: F, fontSize: 11, color: C.textMid, lineHeight: 1.5, textAlign: 'left' }}>
        small <b style={{ color: C.textMid }}>m</b><br />
        capital <b style={{ color: C.accent }}>L</b><br />
        space after number
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// FEEDBACK BANNER
// ─────────────────────────────────────────────────────────────────

const FeedbackBanner: React.FC<{ text: string; correct: boolean }> = ({ text, correct }) => (
  <div style={{
    background: correct ? `linear-gradient(135deg,${C.successBg},#bbf7d0)` : `linear-gradient(135deg,${C.errorBg},#fecaca)`,
    border: `2px solid ${correct ? C.success : C.error}`,
    borderRadius: 14, padding: '11px 14px',
    display: 'flex', alignItems: 'flex-start', gap: 10,
    animation: 'vm_fadeUp 0.3s ease',
    boxShadow: `0 4px 12px ${correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
  }}>
    <div style={{ flexShrink: 0, marginTop: 1 }}>
      {correct ? <IconCheck size={17} color={C.success} /> : <IconXCircle size={17} color={C.error} />}
    </div>
    <span style={{ fontFamily: F, fontSize: 13, fontWeight: 500, color: correct ? C.successText : C.errorText, lineHeight: 1.55 }}>
      {text}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// PHASE PROGRESS HEADER — Learn · Activity · Quiz
// ─────────────────────────────────────────────────────────────────

const PhaseTabs: React.FC<{ mode: Mode }> = ({ mode }) => {
  const order: Mode[] = ['learn', 'match', 'quiz'];
  const labels: Record<Mode, string> = { learn: '1 · Learn', match: '2 · Activity', quiz: '3 · Quiz' };
  const activeIdx = order.indexOf(mode);
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
      {order.map((m, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={m} style={{
            flex: '1 1 0', textAlign: 'center', padding: '7px 4px', borderRadius: 10,
            fontFamily: F, fontWeight: 700, fontSize: 11,
            background: active ? `linear-gradient(135deg,${C.gradStart},${C.primary})` : done ? C.successBg : C.white,
            color: active ? C.white : done ? C.successText : C.textLight,
            border: `1.5px solid ${active ? C.primary : done ? C.success : C.disabled}`,
            transition: 'all 0.25s',
          }}>
            {done ? '\u2713 ' : ''}{labels[m]}
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// CONFETTI (DOM based)
// ─────────────────────────────────────────────────────────────────

const Confetti: React.FC = () => {
  const cols = [C.accent, C.primary, C.gradStart, C.success, C.gradEnd, C.primaryLight];
  const bits = Array.from({ length: 46 }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    dur: 1.6 + Math.random() * 1.1,
    col: cols[i % cols.length],
    size: 6 + Math.random() * 7,
    round: Math.random() > 0.5,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 24 }}>
      {bits.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', top: -14, left: `${b.left}%`,
          width: b.size, height: b.size, background: b.col,
          borderRadius: b.round ? '50%' : 2,
          animation: `vm_confetti ${b.dur}s ${b.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// TUMBLER DROP ZONE  (pointer-drag aware via onRef; tap-to-place via onZoneClick)
// ─────────────────────────────────────────────────────────────────

const TumblerDropZone: React.FC<{
  tumbler: TumblerData;
  isOver: boolean;
  matchedBottle: BottleData | null;
  isCorrect: boolean | null;
  isShaking: boolean;
  onZoneClick: (id: string) => void;
  onRef: (el: HTMLDivElement | null) => void;
}> = ({ tumbler, isOver, matchedBottle, isCorrect, isShaking, onZoneClick, onRef }) => {
  const locked = isCorrect === true;
  const wrong = isCorrect === false;
  const borderCol = locked ? C.success : wrong ? C.error : isOver ? C.primary : C.disabled;
  const bgCol = locked ? C.successBg : wrong ? C.errorBg : isOver ? `${C.primary}12` : C.white;
  const tumblerH = tumbler.size === 'large' ? 110 : tumbler.size === 'medium' ? 90 : 72;

  return (
    <div
      ref={onRef}
      data-zone={tumbler.id}
      onClick={() => onZoneClick(tumbler.id)}
      style={{
        flex: '1 1 0', minWidth: 0, borderRadius: 18,
        border: `3px ${locked ? 'solid' : 'dashed'} ${borderCol}`,
        background: bgCol, padding: '12px 8px 10px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        cursor: locked ? 'default' : 'pointer', transition: 'all 0.25s ease',
        transform: isOver ? 'scale(1.03)' : 'scale(1)',
        boxShadow: locked ? '0 4px 16px rgba(34,197,94,0.18)' : isOver ? '0 6px 20px rgba(74,77,201,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
        animation: isShaking ? 'vm_shake 0.4s ease' : locked ? 'none' : isOver ? 'vm_dropGlow 1s ease infinite' : 'vm_zonePulse 3s ease-in-out infinite',
        position: 'relative',
      }}
    >
      <div style={{
        background: locked ? `${matchedBottle!.color}22` : `${C.primary}15`,
        border: `1.5px solid ${locked ? matchedBottle!.color : C.primaryLight}`,
        borderRadius: 20, padding: '3px 10px', fontFamily: F, fontWeight: 700, fontSize: 11,
        color: locked ? matchedBottle!.color : C.primary,
      }}>
        {locked ? matchedBottle!.volumeLabel + ' \u2713' : tumbler.capacityLabel}
      </div>
      <div style={{ width: '100%', height: tumblerH }}>
        <TumblerSVG tumbler={tumbler} isOver={isOver && !locked}
          fillColor={locked && matchedBottle ? matchedBottle.color : undefined} fillPct={locked ? 0.7 : 0} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: F, fontWeight: 700, fontSize: 12, color: locked ? C.successText : C.textDark }}>{tumbler.name}</div>
        {!locked && (
          <div style={{ fontFamily: F, fontSize: 10, color: C.textLight, fontStyle: 'italic', marginTop: 2 }}>
            {isOver ? 'Drop here!' : 'Drop or tap'}
          </div>
        )}
        {locked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 2 }}>
            <IconCheck size={13} color={C.success} />
            <span style={{ fontFamily: F, fontSize: 10, color: C.success, fontWeight: 600 }}>Matched!</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// BOTTLE CARD  (pointer-drag source; touch-action:none keeps the page from
// scrolling while dragging on a phone. Tap toggles selection.)
// ─────────────────────────────────────────────────────────────────

const BottleCard: React.FC<{
  bottle: BottleData; isLocked: boolean; isDragging: boolean; isSelected: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
}> = ({ bottle, isLocked, isDragging, isSelected, onPointerDown }) => {
  const [hov, setHov] = useState(false);
  const getBorder = () => {
    if (isLocked) return `2.5px solid ${C.success}`;
    if (isSelected) return `2.5px solid ${C.accent}`;
    if (hov) return `2px solid ${C.primaryLight}`;
    return `2px solid ${C.disabled}`;
  };
  const getBg = () => {
    if (isLocked) return C.successBg;
    if (isSelected) return `linear-gradient(135deg,${C.accentLight},#ffe8d0)`;
    return C.white;
  };
  return (
    <div
      onPointerDown={isLocked ? undefined : (e) => onPointerDown(e, bottle.id)}
      onMouseEnter={() => !isLocked && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: '1 1 0', minWidth: 0, borderRadius: 16, border: getBorder(), background: getBg(),
        padding: '10px 8px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        cursor: isLocked ? 'default' : 'grab', transition: 'transform 0.15s, box-shadow 0.2s, opacity 0.2s',
        touchAction: 'none',
        transform: isDragging ? 'scale(0.96)' : isSelected ? 'scale(1.05)' : hov ? 'scale(1.03)' : 'scale(1)',
        boxShadow: isDragging ? '0 2px 6px rgba(0,0,0,0.06)' : isSelected ? `0 6px 18px rgba(255,114,18,0.22)` : hov ? '0 4px 14px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.06)',
        animation: isDragging ? 'none' : isLocked ? 'vm_lockIn 0.35s ease' : hov || isSelected ? 'none' : 'vm_float 3s ease-in-out infinite',
        opacity: isDragging ? 0.4 : isLocked ? 0.65 : 1, userSelect: 'none',
      }}
    >
      <div style={{ width: '100%', maxWidth: 58, height: 100, pointerEvents: 'none' }}>
        <BottleSVG bottle={bottle} locked={isLocked} />
      </div>
      <div style={{ fontFamily: F, fontWeight: 800, fontSize: 13, color: isLocked ? C.successText : bottle.color, textAlign: 'center' }}>
        {bottle.volumeLabel}
      </div>
      {bottle.mlValue >= 1000 && !isLocked && (
        <div style={{ fontFamily: F, fontSize: 9, color: C.textLight, textAlign: 'center' }}>= 1000 mL</div>
      )}
      {isLocked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <IconCheck size={12} color={C.success} />
          <span style={{ fontFamily: F, fontSize: 9, color: C.success, fontWeight: 600 }}>Placed!</span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// PRIMARY / OUTLINE BUTTONS
// ─────────────────────────────────────────────────────────────────

const PrimaryBtn: React.FC<{ onClick: () => void; children: React.ReactNode; disabled?: boolean; pulse?: boolean }> = ({ onClick, children, disabled, pulse }) => {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: disabled ? C.disabled : `linear-gradient(135deg,${C.accent},${C.gradEnd})`,
        color: disabled ? C.textLight : C.white, border: 'none', borderRadius: 50,
        padding: '12px 26px', cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: F, fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8,
        boxShadow: disabled ? 'none' : '0 4px 16px rgba(255,114,18,0.32)',
        transform: !disabled && h ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.2s',
        animation: pulse && !disabled ? 'vm_pulseRing 1.6s ease-out infinite' : 'none',
      }}>
      {children}
    </button>
  );
};

const OutlineBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: h ? C.primaryLight : C.white, color: C.primary, border: `2px solid ${C.primaryLight}`,
        borderRadius: 50, padding: '10px 22px', cursor: 'pointer', fontFamily: F, fontWeight: 600, fontSize: 13,
        display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
        transform: h ? 'scale(1.04)' : 'scale(1)',
      }}>
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

function VolumeExplorer({ props: toolProps = {} }: ToolProps) {
  const finalMessage = (toolProps.additionalProps as any)?.finalMessage ?? DEFAULT_FINAL;

  const [mode, setMode] = useState<Mode>('learn');

  useEffect(() => {
    const id = 'vm-kf-v4';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id; s.textContent = KEYFRAMES;
      document.head.appendChild(s);
    }
  }, []);

  // ════════════════════ LEARN STATE ════════════════════
  const [stepIdx, setStepIdx] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animComplete, setAnimComplete] = useState(false);
  const [learnDone, setLearnDone] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const stepStartRef = useRef<number>(0);
  const elapsedPauseRef = useRef<number>(0);

  const cancelFrame = () => {
    if (animFrameRef.current !== null) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
  };

  const tick = useCallback((now: number) => {
    const dur = LEARN_STEPS[stepIdx]?.durationMs ?? 2000;
    const elapsed = now - stepStartRef.current + elapsedPauseRef.current;
    const t = Math.min(elapsed / dur, 1);
    setStepProgress(t);
    if (t < 1) {
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      setAnimComplete(true);
      setIsPlaying(false);
      animFrameRef.current = null;
    }
  }, [stepIdx]);

  const handlePlay = () => {
    if (animComplete) return;
    cancelFrame();
    stepStartRef.current = performance.now();
    setIsPlaying(true);
    animFrameRef.current = requestAnimationFrame(tick);
  };
  const handlePause = () => {
    if (!isPlaying) return;
    cancelFrame();
    elapsedPauseRef.current += performance.now() - stepStartRef.current;
    setIsPlaying(false);
  };
  const handleNext = () => {
    cancelFrame();
    if (stepIdx >= LEARN_STEPS.length - 1) { setLearnDone(true); return; }
    setStepIdx(s => s + 1); setStepProgress(0); setAnimComplete(false); setIsPlaying(false); elapsedPauseRef.current = 0;
  };
  const handleBack = () => {
    cancelFrame();
    if (stepIdx <= 0) return;
    setLearnDone(false);
    setStepIdx(s => s - 1); setStepProgress(0); setAnimComplete(false); setIsPlaying(false); elapsedPauseRef.current = 0;
  };
  const handleReplay = () => {
    cancelFrame(); setStepProgress(0); setAnimComplete(false); elapsedPauseRef.current = 0;
    stepStartRef.current = performance.now(); setIsPlaying(true);
    animFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (mode === 'learn' && stepIdx === 0 && stepProgress === 0 && !animComplete && !isPlaying) {
      const t = setTimeout(() => handlePlay(), 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => () => cancelFrame(), []);
  useEffect(() => { cancelFrame(); }, [stepIdx]);

  // ════════════════════ MATCH STATE ════════════════════
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overZoneId, setOverZoneId] = useState<string | null>(null);
  const [shuffledBottles, setShuffledBottles] = useState<BottleData[]>(() => shuffle(BOTTLES));
  const [matches, setMatches] = useState<Record<string, string | null>>({});
  const [correct, setCorrect] = useState<Record<string, boolean | null>>({});
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // drag-ghost that we render following the pointer (works on touch + mouse + pen)
  const [dragGhost, setDragGhost] = useState<BottleData | null>(null);

  const correctCount = Object.values(correct).filter(v => v === true).length;
  const totalMatch = BOTTLES.length;

  const lockedBottleIds = new Set(
    Object.entries(matches).filter(([tid]) => correct[tid] === true).map(([, bid]) => bid as string)
  );

  const tryMatch = useCallback((bottleId: string, tumblerId: string) => {
    if (correct[tumblerId] === true) return;
    if (lockedBottleIds.has(bottleId) && correct[tumblerId] !== true) return;
    const bottle = BOTTLES.find(b => b.id === bottleId);
    if (!bottle) return;
    const isCorrect = bottle.correctTumblerId === tumblerId;
    setMatches(p => ({ ...p, [tumblerId]: bottleId }));
    setCorrect(p => ({ ...p, [tumblerId]: isCorrect }));
    if (isCorrect) {
      setFeedback({ text: `\u2705 ${bottle.reason}`, ok: true });
    } else {
      setShakingId(tumblerId);
      setFeedback({ text: `\u274C ${bottle.hint}`, ok: false });
      setTimeout(() => {
        setMatches(p => ({ ...p, [tumblerId]: null }));
        setCorrect(p => ({ ...p, [tumblerId]: null }));
        setShakingId(null);
      }, 1600);
    }
    setSelectedId(null); setDraggingId(null); setOverZoneId(null);
    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(null), 4200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correct, matches]);

  // ── refs that the global pointer listeners read (always latest) ──
  const zoneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; active: boolean } | null>(null);
  const lastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const correctRef = useRef(correct);
  useEffect(() => { correctRef.current = correct; }, [correct]);
  const lockedRef = useRef(lockedBottleIds);
  useEffect(() => { lockedRef.current = lockedBottleIds; });
  const tryMatchRef = useRef(tryMatch);
  useEffect(() => { tryMatchRef.current = tryMatch; });

  // keep ghost glued to the pointer the moment it appears
  useEffect(() => {
    if (dragGhost && ghostRef.current) {
      ghostRef.current.style.transform = `translate(${lastPos.current.x - 28}px, ${lastPos.current.y - 50}px)`;
    }
  }, [dragGhost]);

  // start a potential drag (no movement yet → still might just be a tap)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (lockedBottleIds.has(id)) return;
    dragState.current = { id, startX: e.clientX, startY: e.clientY, active: false };
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  // one set of global listeners for the whole drag lifecycle
  useEffect(() => {
    const hitZone = (x: number, y: number): string | null => {
      for (const t of TUMBLERS) {
        if (correctRef.current[t.id] === true) continue; // already matched → not a target
        const el = zoneRefs.current[t.id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return t.id;
      }
      return null;
    };

    const onMove = (e: PointerEvent) => {
      const ds = dragState.current;
      if (!ds) return;
      lastPos.current = { x: e.clientX, y: e.clientY };
      if (!ds.active) {
        const dx = e.clientX - ds.startX, dy = e.clientY - ds.startY;
        if (Math.hypot(dx, dy) < 6) return; // below threshold → still a tap
        ds.active = true;
        setDragGhost(BOTTLES.find(b => b.id === ds.id) ?? null);
        setDraggingId(ds.id);
        setSelectedId(null);
      }
      e.preventDefault(); // stop the page from scrolling while dragging on touch
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate(${e.clientX - 28}px, ${e.clientY - 50}px)`;
      }
      setOverZoneId(hitZone(e.clientX, e.clientY));
    };

    const onUp = (e: PointerEvent) => {
      const ds = dragState.current;
      if (!ds) return;
      if (ds.active) {
        const z = hitZone(e.clientX, e.clientY);
        if (z) tryMatchRef.current(ds.id, z);
      } else {
        // it was a tap → toggle selection (enables tap-bottle then tap-container)
        if (!lockedRef.current.has(ds.id)) {
          setSelectedId(p => (p === ds.id ? null : ds.id));
        }
      }
      dragState.current = null;
      setDragGhost(null); setDraggingId(null); setOverZoneId(null);
    };

    const onCancel = () => {
      dragState.current = null;
      setDragGhost(null); setDraggingId(null); setOverZoneId(null);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, []);

  const handleZoneClick = (tid: string) => { if (correct[tid] === true) return; if (selectedId) tryMatch(selectedId, tid); };

  // ════════════════════ QUIZ STATE ════════════════════
  const [quizData, setQuizData] = useState<QuizQ[]>(() => buildQuiz());
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('play');
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ.length).fill(null));
  const [picked, setPicked] = useState<number | null>(null);
  const [reviewIdx, setReviewIdx] = useState(0);

  const [displayScore, setDisplayScore] = useState(0);
  const scoreRafRef = useRef<number | null>(null);
  const score = answers.reduce((acc, a, i) => acc + (a === quizData[i].correctIdx ? 1 : 0), 0);
  const wrongQ = quizData.map((q, i) => ({ q, i })).filter(({ q, i }) => answers[i] !== q.correctIdx);

  useEffect(() => {
    if (quizPhase !== 'result') return;
    const start = performance.now();
    const dur = 1200;
    const run = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * score));
      if (t < 1) scoreRafRef.current = requestAnimationFrame(run);
    };
    scoreRafRef.current = requestAnimationFrame(run);
    return () => { if (scoreRafRef.current) cancelAnimationFrame(scoreRafRef.current); };
  }, [quizPhase, score]);

  const handlePick = (i: number) => { if (picked !== null) return; setPicked(i); };
  const handleQuizNext = () => {
    const next = [...answers]; next[qIdx] = picked; setAnswers(next);
    if (qIdx >= quizData.length - 1) {
      setQuizPhase('result');
    } else {
      setQIdx(q => q + 1); setPicked(null);
    }
  };

  // ════════════════════ RESET (Play Again) ════════════════════
  const handlePlayAgain = () => {
    setMode('learn');
    cancelFrame();
    setStepIdx(0); setStepProgress(0); setIsPlaying(false); setAnimComplete(false); setLearnDone(false);
    elapsedPauseRef.current = 0;
    setMatches({}); setCorrect({}); setDraggingId(null); setSelectedId(null); setOverZoneId(null);
    setShakingId(null); setFeedback(null); setShuffledBottles(shuffle(BOTTLES)); setDragGhost(null);
    setQuizData(buildQuiz()); // fresh option order — keeps the no-pattern guarantee
    setQuizPhase('play'); setQIdx(0); setAnswers(Array(QUIZ.length).fill(null)); setPicked(null);
    setReviewIdx(0); setDisplayScore(0);
  };

  const stars = Math.round((score / quizData.length) * 5);
  const encourage =
    score / quizData.length >= 0.9 ? "Brilliant! You've mastered volume." :
    score / quizData.length >= 0.7 ? 'Strong work — just a couple to polish.' :
    score / quizData.length >= 0.4 ? "Good start. Let's review the tricky ones." :
    "No worries — let's walk through these together.";

  const currentQ = quizData[qIdx];

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: F, background: C.bg, width: '100%', padding: 14, boxSizing: 'border-box', position: 'relative' }}>

      {/* ── TITLE ── */}
      <div style={{ textAlign: 'center', marginBottom: 12, animation: 'vm_fadeDown 0.5s ease' }}>
        <div style={{
          fontFamily: F, fontWeight: 800, fontSize: 'clamp(17px,5vw,24px)',
          background: `linear-gradient(135deg,${C.gradStart},${C.primary},${C.accent})`,
          backgroundSize: '200% 200%', animation: 'vm_gradShift 4s ease infinite',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4,
        }}>
          {'\uD83E\uDDEA'} Volume Explorer
        </div>
        <p style={{ fontFamily: F, fontSize: 12, color: C.textMid, margin: 0, fontWeight: 500 }}>
          {mode === 'learn' ? 'Learn what volume is, step by step.'
            : mode === 'match' ? 'Now try it — match each bottle to the right container.'
            : 'Last step — answer a few quick questions!'}
        </p>
      </div>

      <PhaseTabs mode={mode} />

      {/* ════════════════════ LEARN MODE ════════════════════ */}
      {mode === 'learn' && (
        <div>
          <div style={{ background: C.white, borderRadius: 18, border: `1px solid ${C.disabled}`, padding: 12, height: 240, marginBottom: 12 }}>
            <LearnFigure step={stepIdx} progress={animComplete ? 1 : stepProgress} />
          </div>

          {!learnDone && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
              <button onClick={handleBack} disabled={stepIdx === 0}
                style={{ background: C.white, border: `2px solid ${stepIdx === 0 ? C.disabled : C.primaryLight}`, borderRadius: 12, width: 48, height: 48, cursor: stepIdx === 0 ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center' }}>
                <IconChevronLeft size={18} color={stepIdx === 0 ? C.textLight : C.primary} />
              </button>

              {!animComplete ? (
                isPlaying ? (
                  <button onClick={handlePause}
                    style={{ background: `linear-gradient(135deg,${C.accent},${C.gradEnd})`, border: 'none', borderRadius: '50%', width: 56, height: 56, cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 4px 16px rgba(255,114,18,0.32)' }}>
                    <IconPause size={22} color={C.white} />
                  </button>
                ) : (
                  <button onClick={handlePlay}
                    style={{ background: `linear-gradient(135deg,${C.accent},${C.gradEnd})`, border: 'none', borderRadius: '50%', width: 56, height: 56, cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 4px 16px rgba(255,114,18,0.32)' }}>
                    <IconPlay size={22} color={C.white} />
                  </button>
                )
              ) : (
                <button onClick={handleReplay}
                  style={{ background: C.white, border: `2px solid ${C.primaryLight}`, borderRadius: '50%', width: 56, height: 56, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <IconReset size={20} color={C.primary} />
                </button>
              )}

              <button onClick={handleNext} disabled={!animComplete}
                style={{
                  background: animComplete ? `linear-gradient(135deg,${C.accent},${C.gradEnd})` : C.disabled,
                  color: animComplete ? C.white : C.textLight, border: 'none', borderRadius: 12,
                  padding: '0 16px', height: 48, cursor: animComplete ? 'pointer' : 'not-allowed',
                  display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: F, fontWeight: 700, fontSize: 13,
                }}>
                {stepIdx >= LEARN_STEPS.length - 1 ? 'Finish' : 'Next'} <IconChevronRight size={16} color={animComplete ? C.white : C.textLight} />
              </button>
            </div>
          )}

          {!learnDone && (
            <div style={{
              background: C.accentLight, border: `1.5px solid ${C.primaryLight}`, borderRadius: 12,
              padding: '12px 14px', minHeight: 56, display: 'flex', alignItems: 'center',
              fontFamily: F, fontSize: 13, fontWeight: 600, color: C.gradStart, lineHeight: 1.55,
            }}>
              {LEARN_STEPS[stepIdx].caption}
            </div>
          )}

          {learnDone && (
            <div style={{ animation: 'vm_fadeUp 0.4s ease' }}>
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.disabled}`, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ fontFamily: F, fontWeight: 800, fontSize: 13, color: C.gradStart, marginBottom: 8 }}>What we learned</div>
                {LEARN_STEPS.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', gap: 8, marginBottom: 6, animation: `vm_fadeUp 0.4s ease ${i * 0.08}s both` }}>
                    <IconCheck size={15} color={C.success} />
                    <span style={{ fontFamily: F, fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>{s.caption.replace(/^Step \d+ — /, '')}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {([['200 mL = \u2155 L', C.primary], ['500 mL = \u00BD L', C.gradStart], ['1 L = 1000 mL', C.accent]] as [string, string][]).map(([l, c]) => (
                    <span key={l} style={{ background: c + '18', border: `1.5px solid ${c}`, borderRadius: 8, padding: '4px 10px', fontFamily: F, fontWeight: 700, fontSize: 10, color: c }}>{l}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <OutlineBtn onClick={() => { setLearnDone(false); setStepIdx(0); setStepProgress(0); setAnimComplete(false); elapsedPauseRef.current = 0; }}>
                  <IconReset size={13} color={C.primary} /> Watch again
                </OutlineBtn>
                <PrimaryBtn onClick={() => setMode('match')} pulse>
                  Start the Activity <IconChevronRight size={16} color={C.white} />
                </PrimaryBtn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ MATCH MODE ════════════════════ */}
      {mode === 'match' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: `linear-gradient(135deg,${C.gradStart},${C.primary})`, borderRadius: 50, padding: '7px 20px', boxShadow: '0 4px 14px rgba(83,48,134,0.25)' }}>
              <span style={{ color: C.white, fontFamily: F, fontWeight: 700, fontSize: 13 }}>{'\u2705'} {correctCount} / {totalMatch} matched</span>
              <div style={{ height: 6, width: 72, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(correctCount / totalMatch) * 100}%`, background: `linear-gradient(90deg,${C.accent},${C.accentLight})`, borderRadius: 4, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>

          <p style={{ fontFamily: F, fontSize: 12, color: C.textMid, textAlign: 'center', margin: '0 0 12px', fontWeight: 500 }}>
            Drag each bottle onto the container that fits its volume — works on phone, tablet and computer. You can also tap a bottle, then tap a container.
          </p>

          {feedback && (<div style={{ marginBottom: 12 }}><FeedbackBanner text={feedback.text} correct={feedback.ok} /></div>)}

          {selectedId && (
            <div style={{ textAlign: 'center', marginBottom: 10, fontFamily: F, fontWeight: 700, fontSize: 12, color: C.accent, animation: 'vm_hintBlink 1s ease infinite' }}>
              {'\u261D\uFE0F'} Now tap a container to place {BOTTLES.find(b => b.id === selectedId)?.volumeLabel}!
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: F, fontWeight: 700, fontSize: 11, color: C.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ flex: 1, height: 1, background: C.disabled, display: 'block' }} /> Containers <span style={{ flex: 1, height: 1, background: C.disabled, display: 'block' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              {TUMBLERS.map(t => {
                const bid = matches[t.id] ?? null;
                const mb = bid ? BOTTLES.find(b => b.id === bid) ?? null : null;
                return (
                  <TumblerDropZone key={t.id} tumbler={t} isOver={overZoneId === t.id} matchedBottle={mb}
                    isCorrect={correct[t.id] ?? null} isShaking={shakingId === t.id}
                    onZoneClick={handleZoneClick}
                    onRef={(el) => { zoneRefs.current[t.id] = el; }} />
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: F, fontWeight: 700, fontSize: 11, color: C.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ flex: 1, height: 1, background: C.disabled, display: 'block' }} /> Bottles — Drag or Tap <span style={{ flex: 1, height: 1, background: C.disabled, display: 'block' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {shuffledBottles.map(b => (
                <BottleCard key={b.id} bottle={b} isLocked={lockedBottleIds.has(b.id)} isDragging={draggingId === b.id}
                  isSelected={selectedId === b.id} onPointerDown={handlePointerDown} />
              ))}
            </div>
          </div>

          {correctCount === totalMatch ? (
            <div style={{ animation: 'vm_fadeUp 0.4s ease' }}>
              <div style={{ background: `linear-gradient(135deg,${C.successBg},#bbf7d0)`, border: `2px solid ${C.success}`, borderRadius: 14, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconCheck size={20} color={C.success} />
                <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: C.successText }}>All matched! Great job. Ready to test what you know?</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <PrimaryBtn onClick={() => setMode('quiz')} pulse>
                  Take the Quiz <IconChevronRight size={16} color={C.white} />
                </PrimaryBtn>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <OutlineBtn onClick={() => setMode('learn')}><IconChevronLeft size={14} color={C.primary} /> Back to Learn</OutlineBtn>
              <button onClick={() => { setMatches({}); setCorrect({}); setSelectedId(null); setOverZoneId(null); setShakingId(null); setFeedback(null); setShuffledBottles(shuffle(BOTTLES)); }}
                style={{ background: C.white, color: C.primary, border: `2px solid ${C.primaryLight}`, borderRadius: 50, padding: '9px 18px', cursor: 'pointer', fontFamily: F, fontWeight: 600, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IconReset size={13} color={C.primary} /> Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ QUIZ MODE ════════════════════ */}
      {mode === 'quiz' && quizPhase === 'play' && (
        <div style={{ animation: 'vm_fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 8, background: C.disabled, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((qIdx + (picked !== null ? 1 : 0)) / quizData.length) * 100}%`, background: `linear-gradient(90deg,${C.gradStart},${C.accent})`, borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontFamily: F, fontWeight: 700, fontSize: 12, color: C.textMid }}>Q{qIdx + 1}/{quizData.length}</span>
          </div>

          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.disabled}`, padding: '16px 16px 18px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontFamily: F, fontWeight: 700, fontSize: 15, color: C.textDark, lineHeight: 1.5, marginBottom: 14 }}>
              {currentQ.prompt}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentQ.options.map((opt, i) => {
                const isCorrectOpt = i === currentQ.correctIdx;
                const isPicked = picked === i;
                let border = `2px solid ${C.disabled}`, bg = C.white, col = C.textDark;
                if (picked !== null) {
                  if (isCorrectOpt) { border = `2px solid ${C.success}`; bg = C.successBg; col = C.successText; }
                  else if (isPicked) { border = `2px solid ${C.error}`; bg = C.errorBg; col = C.errorText; }
                  else { col = C.textLight; }
                }
                return (
                  <button key={i} onClick={() => handlePick(i)} disabled={picked !== null}
                    style={{
                      textAlign: 'left', border, background: bg, color: col, borderRadius: 12,
                      padding: '12px 14px', cursor: picked === null ? 'pointer' : 'default',
                      fontFamily: F, fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    }}>
                    <span>{opt}</span>
                    {picked !== null && isCorrectOpt && <IconCheck size={18} color={C.success} />}
                    {picked !== null && isPicked && !isCorrectOpt && <IconXCircle size={18} color={C.error} />}
                  </button>
                );
              })}
            </div>

            {picked !== null && (
              <div style={{ marginTop: 14, animation: 'vm_fadeUp 0.3s ease' }}>
                <FeedbackBanner
                  text={picked === currentQ.correctIdx ? `Correct! ${currentQ.explanation}` : `Not quite. ${currentQ.explanation}`}
                  correct={picked === currentQ.correctIdx} />
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <PrimaryBtn onClick={handleQuizNext} disabled={picked === null}>
              {qIdx >= quizData.length - 1 ? 'See my score' : 'Next question'} <IconChevronRight size={16} color={picked === null ? C.textLight : C.white} />
            </PrimaryBtn>
          </div>
        </div>
      )}

      {/* ── QUIZ RESULT OVERLAY ── */}
      {mode === 'quiz' && quizPhase === 'result' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,46,0.68)', backdropFilter: 'blur(8px)' }}>
          <div style={{ position: 'relative', background: C.white, borderRadius: 24, padding: 'clamp(20px,5vw,34px)', maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.28)', animation: 'vm_pop 0.5s cubic-bezier(0.34,1.56,0.64,1)', overflow: 'hidden' }}>
            <Confetti />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg,${C.gradStart},${C.accent})`, display: 'grid', placeItems: 'center', margin: '0 auto 10px', animation: 'vm_pop 0.5s ease 0.1s both' }}>
                <IconAward size={36} color={C.white} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} style={{ animation: `vm_starPop 0.4s ease ${i * 0.12}s both` }}>
                    <IconStar size={28} fill={i < stars ? C.accent : C.disabled} />
                  </span>
                ))}
              </div>
              <div style={{ fontFamily: F, fontWeight: 800, fontSize: 'clamp(40px,12vw,52px)', background: `linear-gradient(135deg,${C.gradStart},${C.primary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
                {displayScore} / {quizData.length}
              </div>
              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: C.textMid, margin: '6px 0 16px' }}>{encourage}</div>

              <div style={{ background: `linear-gradient(135deg,${C.accentLight},rgba(193,193,234,0.2))`, border: `2px solid ${C.primaryLight}`, borderRadius: 14, padding: '12px 14px', marginBottom: 16, fontFamily: F, fontSize: 12.5, fontWeight: 600, color: C.gradStart, lineHeight: 1.6, textAlign: 'left' }}>
                {'\uD83D\uDCA1'} {finalMessage}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {wrongQ.length > 0 && (
                  <PrimaryBtn onClick={() => { setReviewIdx(0); setQuizPhase('review'); }}>Review answers</PrimaryBtn>
                )}
                <OutlineBtn onClick={handlePlayAgain}><IconReset size={13} color={C.primary} /> Play again</OutlineBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QUIZ REVIEW ── */}
      {mode === 'quiz' && quizPhase === 'review' && wrongQ.length > 0 && (() => {
        const { q, i } = wrongQ[reviewIdx];
        const your = answers[i];
        return (
          <div style={{ animation: 'vm_fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: F, fontWeight: 700, fontSize: 13, color: C.textMid }}>Q{i + 1} of {quizData.length}</span>
              <span style={{ background: C.errorBg, color: C.errorText, fontFamily: F, fontWeight: 700, fontSize: 11, padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${C.error}` }}>Incorrect</span>
            </div>

            <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.disabled}`, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontFamily: F, fontWeight: 700, fontSize: 14.5, color: C.textDark, lineHeight: 1.5, marginBottom: 12 }}>{q.prompt}</div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, background: C.errorBg, border: `1.5px solid ${C.error}`, borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: C.error, marginBottom: 2 }}>YOUR ANSWER</div>
                  <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: C.errorText }}>{your !== null ? q.options[your] : '—'}</div>
                </div>
                <div style={{ flex: 1, background: C.successBg, border: `1.5px solid ${C.success}`, borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: C.success, marginBottom: 2 }}>CORRECT</div>
                  <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: C.successText }}>{q.options[q.correctIdx]}</div>
                </div>
              </div>

              <div style={{ background: C.accentLight, border: `1px solid ${C.primaryLight}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontFamily: F, fontSize: 13, color: C.textDark, lineHeight: 1.65 }}>{q.explanation}</div>
                {q.formula && (
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <span style={{ display: 'inline-block', background: '#FEF9C3', border: '1.5px solid #FACC15', borderRadius: 10, padding: '6px 16px', fontFamily: F, fontWeight: 800, fontSize: 15, color: C.gradStart }}>{q.formula}</span>
                  </div>
                )}
                <div style={{ marginTop: 12, background: C.white, borderRadius: 10, padding: 8, border: `1px solid ${C.disabled}` }}>
                  <MiniDiagram type={q.diagram} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <OutlineBtn onClick={() => setReviewIdx(p => Math.max(0, p - 1))}>
                <IconChevronLeft size={14} color={C.primary} /> Prev
              </OutlineBtn>
              <span style={{ fontFamily: F, fontSize: 12, color: C.textLight }}>{reviewIdx + 1} / {wrongQ.length}</span>
              {reviewIdx < wrongQ.length - 1 ? (
                <OutlineBtn onClick={() => setReviewIdx(p => Math.min(wrongQ.length - 1, p + 1))}>
                  Next <IconChevronRight size={14} color={C.primary} />
                </OutlineBtn>
              ) : (
                <PrimaryBtn onClick={handlePlayAgain}><IconReset size={13} color={C.white} /> Play again</PrimaryBtn>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── FLOATING DRAG GHOST (follows the pointer on every device) ── */}
      {dragGhost && (
        <div ref={ghostRef} style={{
          position: 'fixed', left: 0, top: 0, width: 56, height: 100, zIndex: 1000,
          pointerEvents: 'none', transform: 'translate(-9999px,-9999px)',
          filter: 'drop-shadow(0 14px 22px rgba(74,77,201,0.4))',
        }}>
          <BottleSVG bottle={dragGhost} locked={false} />
        </div>
      )}
    </div>
  );
}

export default VolumeExplorer;