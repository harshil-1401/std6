// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: metal_coating_quiz.tsx
// Chapter 6 — Materials Around Us | Coating Misconception Quiz
// "Metal or Not Metal?" — 8-item click-through
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

interface QuizItem {
  id: string;
  name: string;
  emoji: string;
  description: string;       // shown on card
  isMetal: boolean;
  correctReason: string;     // locked on correct — references coating rule
  wrongHint: string;         // shown on wrong attempt
  coatingTrick: boolean;     // true = this item is designed to trick via coating
}

interface SorterAdditionalProps {
  items?: QuizItem[];
  enableTimer?: boolean;
  shuffleSeed?: number;
}

interface MetalCoatingQuizProps {
  props?: {
    width?: number;
    height?: number;
    animationSpeed?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: SorterAdditionalProps;
  };
  setStepDetails?: (stepDetails: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== DEFAULT QUIZ DATA (8 items) ====================

const DEFAULT_ITEMS: QuizItem[] = [
  {
    id: 'q1',
    name: 'Brass Utensil',
    emoji: '🥣',
    description: 'A shiny brass bowl used in the kitchen — it clangs when tapped.',
    isMetal: true,
    correctReason: '✅ Brass IS a metal (an alloy of copper + zinc). Its shine is natural lustre, not a coating.',
    wrongHint: '💡 Brass is a real metal — an alloy of copper and zinc. The shine is genuine lustre!',
    coatingTrick: false,
  },
  {
    id: 'q2',
    name: 'Silver-Painted Plastic Bangle',
    emoji: '💿',
    description: 'Looks exactly like a silver bangle — shiny, smooth, cool to touch.',
    isMetal: false,
    correctReason: '✅ NOT a metal! Scratch the surface and you find plastic underneath. The silver look is just paint.',
    wrongHint: '💡 Looks metallic, but "all that glitters is not gold"! Scratch it — you\'ll find plastic under the silver paint.',
    coatingTrick: true,
  },
  {
    id: 'q3',
    name: 'Chocolate Foil Wrapper',
    emoji: '🍫',
    description: 'The shiny wrapper from a chocolate bar — thin, crinkly, reflective.',
    isMetal: false,
    correctReason: '✅ NOT a metal! The outer shiny layer is metallic foil, but scratch it and you reach paper or plastic underneath.',
    wrongHint: '💡 The top layer looks metallic, but most chocolate wrappers are paper or plastic with a thin foil coating — not a solid metal!',
    coatingTrick: true,
  },
  {
    id: 'q4',
    name: 'Copper Wire',
    emoji: '🔌',
    description: 'A reddish-brown wire found inside electrical cables — flexible and shiny when cut.',
    isMetal: true,
    correctReason: '✅ Copper IS a metal — it conducts electricity because of its metallic properties. Real lustre on freshly cut surface.',
    wrongHint: '💡 Copper is a genuine metal! Its reddish lustre and excellent electrical conduction are classic metal properties.',
    coatingTrick: false,
  },
  {
    id: 'q5',
    name: 'Polished Plastic Tumbler',
    emoji: '🥤',
    description: 'A very shiny tumbler — looks almost metallic, feels lighter than it looks.',
    isMetal: false,
    correctReason: '✅ NOT a metal! Polishing gives plastic a shiny appearance, but scratch the surface — it\'s plastic all the way through.',
    wrongHint: '💡 Polishing makes plastic look metallic! But coating does not change what\'s inside. Scratch test → plastic.',
    coatingTrick: true,
  },
  {
    id: 'q6',
    name: 'Steel Key',
    emoji: '🗝️',
    description: 'A house key — heavy, hard, makes a ringing sound when dropped.',
    isMetal: true,
    correctReason: '✅ Steel IS a metal (iron + carbon alloy). Sonorous, hard, and lustrous — classic metal properties.',
    wrongHint: '💡 A steel key is a real metal! Its weight, hardness, and ringing sound are all metal properties.',
    coatingTrick: false,
  },
  {
    id: 'q7',
    name: 'Gold-Coloured Paper Crown',
    emoji: '👑',
    description: 'A shiny gold party crown — it sparkles just like real gold jewellery.',
    isMetal: false,
    correctReason: '✅ NOT a metal! It\'s paper coated with gold-coloured foil or paint. Fold it — paper creases, metal bends.',
    wrongHint: '💡 Gold colour ≠ gold metal! This is paper with a gold coating. Fold it firmly — paper folds, true metal would deform differently.',
    coatingTrick: true,
  },
  {
    id: 'q8',
    name: 'Lacquered Wooden Box',
    emoji: '📦',
    description: 'A beautifully finished wooden box — its lacquered surface shines like polished metal.',
    isMetal: false,
    correctReason: '✅ NOT a metal! Lacquer (varnish coating) creates the shine. The core is wood — scratch it and you see the grain.',
    wrongHint: '💡 Lacquer is a shiny coating applied to wood. It looks lustrous, but the material underneath is wood — not metal!',
    coatingTrick: true,
  },
];

// ==================== COLORS — Singularity Design System ====================

const C = {
  primary: '#4A4DC9',
  orange: '#FF7212',
  purple: '#533086',
  amber: '#FC9145',
  lightPurple: '#C1C1EA',
  lightOrange: '#FFF3E4',
  dark: '#4E4E4E',
  grey: '#CACACA',
  bgGrey: '#EBEBEB',
  bgLight: '#F5F5F5',
  white: '#FFFFFF',
  green: '#22C55E',
  greenBg: '#DCFCE7',
  greenBorder: '#86EFAC',
  red: '#EF4444',
  redBg: '#FEE2E2',
  redBorder: '#FCA5A5',
  metalGold: '#D4A017',
  metalGoldLight: '#FDF6E3',
};

// ==================== KEYFRAMES ====================

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  .mcq-root *, .mcq-root *::before, .mcq-root *::after { box-sizing: border-box; }

  @keyframes mcq-fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes mcq-popIn {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.08); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes mcq-shake {
    0%,100% { transform: translateX(0) rotate(0deg); }
    15%     { transform: translateX(-7px) rotate(-1deg); }
    35%     { transform: translateX(7px)  rotate(1deg); }
    55%     { transform: translateX(-5px) rotate(-0.5deg); }
    75%     { transform: translateX(5px)  rotate(0.5deg); }
  }
  @keyframes mcq-slideUp {
    from { opacity: 0; transform: translateY(40px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes mcq-cardIn {
    from { opacity: 0; transform: translateY(32px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes mcq-lockPulse {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
    50%  { box-shadow: 0 0 0 16px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
  @keyframes mcq-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes mcq-dotPop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.4); }
    100% { transform: scale(1); }
  }
  @keyframes mcq-confettiFall {
    0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
  }
  @keyframes mcq-starSpin {
    from { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.3); }
    to   { transform: rotate(360deg) scale(1); }
  }
  @keyframes mcq-reasonIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mcq-hintIn {
    from { opacity: 0; transform: scale(0.95) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mcq-btnHover {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-3px); }
  }
  @keyframes mcq-emojiFloat {
    0%,100% { transform: translateY(0px) rotate(0deg); }
    33%     { transform: translateY(-8px) rotate(3deg); }
    66%     { transform: translateY(-4px) rotate(-2deg); }
  }
  @keyframes mcq-coatingWiggle {
    0%,100% { transform: rotate(0deg); }
    25%     { transform: rotate(-4deg); }
    75%     { transform: rotate(4deg); }
  }
`;

// ==================== CONFETTI ====================

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const colors = [C.primary, C.orange, C.purple, C.amber, C.lightPurple, C.green, '#FFD700', C.metalGold];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2.5,
    duration: 2.2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 5 + Math.random() * 10,
    isCircle: Math.random() > 0.5,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 200 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: '-3%',
          width: p.size, height: p.isCircle ? p.size : p.size * 0.45,
          backgroundColor: p.color, borderRadius: p.isCircle ? '50%' : '2px',
          animation: `mcq-confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

// ==================== PROGRESS DOTS ====================

const ProgressDots: React.FC<{
  total: number;
  current: number;
  answers: (boolean | null)[];
  isMobile: boolean;
}> = ({ total, current, answers, isMobile }) => (
  <div style={{
    display: 'flex', gap: isMobile ? 6 : 8,
    justifyContent: 'center', alignItems: 'center',
    flexWrap: 'wrap',
  }}>
    {Array.from({ length: total }, (_, i) => {
      const answered = answers[i] !== null;
      const correct = answers[i] === true;
      const isCurrent = i === current;
      return (
        <div key={i} style={{
          width: isMobile ? 10 : 13,
          height: isMobile ? 10 : 13,
          borderRadius: '50%',
          transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          background: answered
            ? (correct ? C.green : C.red)
            : isCurrent
              ? C.amber
              : 'rgba(255,255,255,0.3)',
          border: isCurrent && !answered
            ? `2.5px solid ${C.amber}`
            : answered
              ? 'none'
              : '2px solid rgba(255,255,255,0.4)',
          boxShadow: isCurrent
            ? `0 0 0 3px rgba(252,145,69,0.35)`
            : answered && correct
              ? `0 0 0 2px rgba(34,197,94,0.35)`
              : 'none',
          animation: isCurrent && !answered ? 'mcq-dotPop 1.2s ease-in-out infinite' : 'none',
          transform: isCurrent ? 'scale(1.25)' : 'scale(1)',
        }} />
      );
    })}
  </div>
);

// ==================== ITEM VISUAL ====================

const ItemVisual: React.FC<{
  item: QuizItem;
  isShaking: boolean;
  isLocked: boolean;
  isMobile: boolean;
}> = ({ item, isShaking, isLocked, isMobile }) => {
  const emojiSize = isMobile ? 72 : 96;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      animation: isShaking
        ? 'mcq-shake 0.55s ease-in-out'
        : isLocked
          ? 'mcq-lockPulse 0.6s ease-out both'
          : 'mcq-cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
    }}>
      {/* Main emoji display */}
      <div style={{
        width: isMobile ? 120 : 160,
        height: isMobile ? 120 : 160,
        borderRadius: 28,
        background: isLocked
          ? `linear-gradient(135deg, ${C.greenBg}, #F0FFF4)`
          : item.coatingTrick
            ? `linear-gradient(135deg, ${C.lightOrange}, #FFE8D0)`
            : `linear-gradient(135deg, #EDE9FE, #DDD6FE)`,
        border: isLocked
          ? `3px solid ${C.greenBorder}`
          : item.coatingTrick
            ? `3px solid ${C.amber}55`
            : `3px solid ${C.lightPurple}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: emojiSize,
        boxShadow: isLocked
          ? `0 8px 32px rgba(34,197,94,0.2), 0 2px 8px rgba(0,0,0,0.06)`
          : `0 8px 32px rgba(74,77,201,0.12), 0 2px 8px rgba(0,0,0,0.06)`,
        position: 'relative',
        overflow: 'hidden',
        animation: !isShaking && !isLocked ? 'mcq-emojiFloat 3.5s ease-in-out infinite' : 'none',
        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* shimmer overlay */}
        {!isLocked && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'mcq-shimmer 3.5s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}
        <span style={{ position: 'relative', zIndex: 1, lineHeight: 1 }}>{item.emoji}</span>
        {/* Coating trick badge */}
        {item.coatingTrick && !isLocked && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: C.orange, color: C.white,
            fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6,
            fontFamily: "'Poppins', sans-serif", letterSpacing: '0.3px',
            animation: 'mcq-coatingWiggle 2s ease-in-out infinite',
          }}>
            LOOKS SHINY
          </div>
        )}
        {/* Locked checkmark */}
        {isLocked && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            width: 28, height: 28, borderRadius: '50%',
            background: C.green,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'mcq-popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
            boxShadow: '0 2px 8px rgba(34,197,94,0.4)',
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Item name */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#1F1F3D',
          fontFamily: "'Poppins', sans-serif", lineHeight: 1.2, marginBottom: 6,
        }}>
          {item.name}
        </div>
        <div style={{
          fontSize: isMobile ? 13 : 14, color: '#6B7280', fontWeight: 400,
          fontFamily: "'Poppins', sans-serif", lineHeight: 1.5,
          maxWidth: 340, margin: '0 auto',
        }}>
          {item.description}
        </div>
      </div>
    </div>
  );
};

// ==================== SUMMARY CARD ====================

const SummaryCard: React.FC<{
  items: QuizItem[];
  answers: (boolean | null)[];
  seconds: number;
  onRetry: () => void;
  isMobile: boolean;
}> = ({ items, answers, seconds, onRetry, isMobile }) => {
  const correct = answers.filter(a => a === true).length;
  const total = items.length;
  const pct = Math.round((correct / total) * 100);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const grade = pct === 100 ? { label: 'Perfect!', emoji: '🏆', color: C.metalGold }
    : pct >= 75 ? { label: 'Great Job!', emoji: '⭐', color: C.primary }
    : pct >= 50 ? { label: 'Good Try!', emoji: '💪', color: C.amber }
    : { label: 'Keep Practising', emoji: '📚', color: C.orange };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: isMobile ? 16 : 20,
      animation: 'mcq-slideUp 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
    }}>
      {/* Trophy */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: isMobile ? 52 : 68,
          animation: 'mcq-starSpin 1s ease-out 0.3s both',
          display: 'block',
        }}>
          {grade.emoji}
        </span>
        <div style={{
          fontSize: isMobile ? 22 : 28, fontWeight: 900, color: grade.color,
          fontFamily: "'Poppins', sans-serif",
        }}>
          {grade.label}
        </div>
        <div style={{
          fontSize: isMobile ? 14 : 15, color: '#6B7280',
          fontFamily: "'Poppins', sans-serif",
        }}>
          You got <strong style={{ color: grade.color }}>{correct}</strong> out of <strong>{total}</strong> correct
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: isMobile ? 8 : 12,
        width: '100%', maxWidth: 420,
      }}>
        {[
          { label: 'Correct', val: correct, emoji: '✅', bg: C.greenBg, color: '#166534', border: C.greenBorder },
          { label: 'Wrong',   val: total - correct, emoji: '❌', bg: C.redBg,   color: '#991B1B', border: C.redBorder },
          { label: 'Time',    val: formatTime(seconds), emoji: '⏱️', bg: '#EEF2FF', color: C.primary, border: C.lightPurple },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, border: `1.5px solid ${s.border}`,
            borderRadius: 14, padding: isMobile ? '10px 6px' : '12px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            animation: 'mcq-popIn 0.4s ease-out both',
          }}>
            <span style={{ fontSize: isMobile ? 18 : 22 }}>{s.emoji}</span>
            <span style={{
              fontSize: isMobile ? 17 : 21, fontWeight: 800, color: s.color,
              fontFamily: "'Poppins', sans-serif", fontVariantNumeric: 'tabular-nums',
            }}>
              {s.val}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: s.color, opacity: 0.75,
              textTransform: 'uppercase', letterSpacing: '0.5px',
              fontFamily: "'Poppins', sans-serif",
            }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Per-item review */}
      <div style={{
        width: '100%', maxWidth: 480,
        display: 'flex', flexDirection: 'column', gap: 8,
        animation: 'mcq-fadeUp 0.5s ease-out 0.3s both',
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: '#9CA3AF',
          textTransform: 'uppercase', letterSpacing: '0.8px',
          fontFamily: "'Poppins', sans-serif", textAlign: 'center', marginBottom: 2,
        }}>
          Item Review
        </div>
        {items.map((item, i) => {
          const wasCorrect = answers[i] === true;
          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: wasCorrect ? C.greenBg : C.redBg,
              border: `1.5px solid ${wasCorrect ? C.greenBorder : C.redBorder}`,
              borderRadius: 12, padding: isMobile ? '8px 12px' : '10px 14px',
              animation: `mcq-fadeUp 0.4s ease-out ${0.1 + i * 0.06}s both`,
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: isMobile ? 12 : 13, fontWeight: 700,
                  color: wasCorrect ? '#166534' : '#991B1B',
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  {item.name}
                </div>
                <div style={{
                  fontSize: isMobile ? 10.5 : 11.5, color: wasCorrect ? '#166534' : '#B91C1C',
                  fontFamily: "'Poppins', sans-serif", opacity: 0.85,
                }}>
                  {item.isMetal ? '⚙️ Metal' : '🎨 Not Metal (coating/material)'}
                </div>
              </div>
              <span style={{
                fontSize: 18, flexShrink: 0,
              }}>
                {wasCorrect ? '✅' : '❌'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Key takeaway */}
      <div style={{
        background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
        border: `2px solid ${C.lightPurple}`,
        borderRadius: 14, padding: isMobile ? '14px 16px' : '16px 20px',
        maxWidth: 480, width: '100%',
        animation: 'mcq-fadeUp 0.5s ease-out 0.6s both',
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.purple, marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Poppins', sans-serif",
        }}>
          <span>📌</span> The Coating Rule
        </div>
        <p style={{
          margin: 0, fontSize: isMobile ? 12 : 13, color: C.dark,
          fontFamily: "'Poppins', sans-serif", lineHeight: 1.6,
        }}>
          A <strong>coating</strong> (paint, lacquer, foil, wax) can make any material look lustrous.
          The <em>scratch test</em> reveals the truth — only a metal is metal all the way through.
          <strong> "All that glitters is not gold!"</strong>
        </p>
      </div>

      {/* Retry */}
      <button
        onClick={onRetry}
        style={{
          padding: isMobile ? '12px 28px' : '13px 36px',
          borderRadius: 28, border: 'none', cursor: 'pointer',
          fontSize: isMobile ? 14 : 15, fontWeight: 700,
          fontFamily: "'Poppins', sans-serif",
          background: `linear-gradient(135deg, ${C.primary}, ${C.purple})`,
          color: C.white, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 18px rgba(74,77,201,0.28)',
          transition: 'all 0.25s ease',
          animation: 'mcq-popIn 0.5s ease-out 0.8s both',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 22px rgba(74,77,201,0.36)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 18px rgba(74,77,201,0.28)';
        }}
      >
        🔄 Try Again
      </button>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const MetalCoatingQuiz: React.FC<MetalCoatingQuizProps> = ({
  props = {}, setStepDetails, stopAutoNext, setStopAutoNext,
}) => {
  const ap = props.additionalProps || {};
  const items = ap.items ?? DEFAULT_ITEMS;
  const enableTimer = ap.enableTimer ?? true;
  const totalItems = items.length;

  // ─── STATE ───
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(boolean | null)[]>(Array(totalItems).fill(null));
  const [phase, setPhase] = useState<'question' | 'correct' | 'wrong' | 'summary'>('question');
  const [isShaking, setIsShaking] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 900
  );
  const nextTimer = useRef<any>(null);

  const isMobile = viewportWidth < 600;
  const isTablet = viewportWidth >= 600 && viewportWidth < 900;
  const currentItem = items[currentIdx];

  // ─── SETUP ───
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'mcq-styles';
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => { const e = document.getElementById('mcq-styles'); if (e) document.head.removeChild(e); };
  }, []);

  useEffect(() => {
    setTimeout(() => setMounted(true), 60);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fn = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ─── TIMER ───
  useEffect(() => {
    if (!enableTimer || !timerRunning) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [enableTimer, timerRunning]);

  // ─── STEP DETAILS ───
  useEffect(() => {
    if (setStepDetails) {
      setStepDetails({
        currentStep: currentIdx,
        totalSteps: totalItems,
        isPaused: false,
        currentMode: 'practice',
      });
    }
  }, [currentIdx, totalItems]);

  // ─── ANSWER HANDLER ───
  const handleAnswer = useCallback((guessedMetal: boolean) => {
    if (isBusy || phase !== 'question') return;
    setIsBusy(true);

    const correct = guessedMetal === currentItem.isMetal;
    if (correct) {
      const newAnswers = [...answers];
      newAnswers[currentIdx] = true;
      setAnswers(newAnswers);
      setPhase('correct');
      setIsBusy(false);
    } else {
      setIsShaking(true);
      setPhase('wrong');
      setTimeout(() => { setIsShaking(false); setIsBusy(false); }, 600);
    }
  }, [isBusy, phase, currentItem, currentIdx, answers]);

  // ─── NEXT QUESTION ───
  const handleNext = useCallback(() => {
    if (nextTimer.current) clearTimeout(nextTimer.current);
    const next = currentIdx + 1;
    if (next >= totalItems) {
      setTimerRunning(false);
      setPhase('summary');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4500);
    } else {
      setCurrentIdx(next);
      setPhase('question');
    }
  }, [currentIdx, totalItems]);

  // ─── TRY AGAIN (wrong) ───
  const handleTryAgain = useCallback(() => {
    const newAnswers = [...answers];
    if (newAnswers[currentIdx] === null) newAnswers[currentIdx] = false;
    setAnswers(newAnswers);
    setPhase('question');
  }, [answers, currentIdx]);

  // ─── RESET ───
  const handleReset = useCallback(() => {
    setCurrentIdx(0);
    setAnswers(Array(totalItems).fill(null));
    setPhase('question');
    setIsShaking(false);
    setIsBusy(false);
    setSeconds(0);
    setTimerRunning(true);
    setShowConfetti(false);
  }, [totalItems]);

  const correctCount = answers.filter(a => a === true).length;
  const progressPct = (currentIdx / totalItems) * 100;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // padding
  const px = isMobile ? 14 : isTablet ? 20 : 28;
  const py = isMobile ? 14 : 20;

  // ==================== RENDER ====================
  return (
    <div className="mcq-root" style={{
      width: '100%', maxWidth: props.width ?? 860,
      margin: '0 auto', fontFamily: "'Poppins', sans-serif",
      background: '#FAFAFA', borderRadius: 22, overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 8px 48px rgba(74,77,201,0.11), 0 1px 4px rgba(0,0,0,0.06)',
      border: '1px solid #E5E7EB',
    }}>
      <Confetti active={showConfetti} />

      {/* ═══ HEADER ═══ */}
      <div style={{
        background: `linear-gradient(135deg, #3D3FA8 0%, ${C.purple} 100%)`,
        padding: isMobile ? '14px 16px 12px' : '18px 28px 14px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{ position: 'absolute', top: -28, right: -18, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -18, left: 50, width: 55, height: 55, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 10 : 0,
          position: 'relative', zIndex: 1,
        }}>
          {/* Title */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: isMobile ? 22 : 26 }}>⚙️</span>
              <h2 style={{
                margin: 0, fontSize: isMobile ? 15 : 18, fontWeight: 900,
                color: C.white, fontFamily: "'Poppins', sans-serif",
                letterSpacing: '-0.4px', lineHeight: 1.2,
              }}>
                Metal or Not Metal?
              </h2>
            </div>
            <p style={{
              margin: '4px 0 0 36px', fontSize: isMobile ? 10 : 11,
              color: 'rgba(255,255,255,0.65)', fontFamily: "'Poppins', sans-serif",
            }}>
              Chapter 6 — The Coating Misconception Quiz
            </p>
          </div>

          {/* Score pills */}
          {phase !== 'summary' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(34,197,94,0.22)', border: '1px solid rgba(134,239,172,0.5)',
                backdropFilter: 'blur(6px)', padding: '5px 11px', borderRadius: 14,
              }}>
                <span style={{ fontSize: 12 }}>✅</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{correctCount}</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)',
                backdropFilter: 'blur(6px)', padding: '5px 11px', borderRadius: 14,
              }}>
                <span style={{ fontSize: 12 }}>🎯</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.white, fontVariantNumeric: 'tabular-nums' }}>
                  {currentIdx + 1}/{totalItems}
                </span>
              </div>
              {enableTimer && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(6px)', padding: '5px 11px', borderRadius: 14,
                }}>
                  <span style={{ fontSize: 12 }}>⏱️</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.white, fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(seconds)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {phase !== 'summary' && (
          <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: `linear-gradient(90deg, ${C.amber}, ${C.orange})`,
              width: `${progressPct}%`,
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: progressPct > 0 ? '0 0 8px rgba(255,114,18,0.4)' : 'none',
            }} />
          </div>
        )}

        {/* Progress dots */}
        {phase !== 'summary' && (
          <div style={{ marginTop: 12 }}>
            <ProgressDots
              total={totalItems}
              current={currentIdx}
              answers={answers}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>

      {/* ═══ BODY ═══ */}
      <div style={{
        padding: `${py}px ${px}px ${py + 6}px`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: isMobile ? 16 : 22,
        minHeight: phase === 'summary' ? undefined : isMobile ? 420 : 480,
      }}>

        {/* ── SUMMARY ── */}
        {phase === 'summary' && (
          <SummaryCard
            items={items}
            answers={answers}
            seconds={seconds}
            onRetry={handleReset}
            isMobile={isMobile}
          />
        )}

        {/* ── QUESTION / CORRECT / WRONG ── */}
        {phase !== 'summary' && (
          <>
            {/* Instruction chip */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
              border: `1.5px solid ${C.lightPurple}`,
              padding: '6px 16px', borderRadius: 20,
              fontSize: isMobile ? 11 : 12, fontWeight: 600,
              color: C.purple, fontFamily: "'Poppins', sans-serif",
              animation: mounted ? 'mcq-fadeUp 0.4s ease-out both' : 'none',
            }}>
              <span>🔍</span>
              {phase === 'wrong'
                ? 'Read the hint, then try again!'
                : phase === 'correct'
                  ? 'Correct! Read the reason below.'
                  : 'Is the core material a metal?'}
            </div>

            {/* Item visual */}
            <div style={{
              width: '100%', display: 'flex', justifyContent: 'center',
              animation: mounted ? 'mcq-fadeUp 0.45s ease-out 0.05s both' : 'none',
            }}>
              <ItemVisual
                item={currentItem}
                isShaking={isShaking}
                isLocked={phase === 'correct'}
                isMobile={isMobile}
              />
            </div>

            {/* ── CORRECT REASON ── */}
            {phase === 'correct' && (
              <div style={{
                background: C.greenBg, border: `2px solid ${C.greenBorder}`,
                borderRadius: 14, padding: isMobile ? '12px 16px' : '14px 20px',
                maxWidth: 480, width: '100%',
                animation: 'mcq-reasonIn 0.45s ease-out both',
              }}>
                <p style={{
                  margin: 0, fontSize: isMobile ? 13 : 14, fontWeight: 500,
                  color: '#166534', fontFamily: "'Poppins', sans-serif", lineHeight: 1.55,
                  textAlign: 'center',
                }}>
                  {currentItem.correctReason}
                </p>
              </div>
            )}

            {/* ── WRONG HINT ── */}
            {phase === 'wrong' && (
              <div style={{
                background: '#FEF3C7', border: '2px solid #F59E0B',
                borderRadius: 14, padding: isMobile ? '12px 16px' : '14px 20px',
                maxWidth: 480, width: '100%',
                animation: 'mcq-hintIn 0.4s ease-out both',
              }}>
                <p style={{
                  margin: 0, fontSize: isMobile ? 13 : 14, fontWeight: 500,
                  color: '#92400E', fontFamily: "'Poppins', sans-serif", lineHeight: 1.55,
                  textAlign: 'center',
                }}>
                  {currentItem.wrongHint}
                </p>
              </div>
            )}

            {/* ── ACTION BUTTONS ── */}
            <div style={{
              width: '100%', maxWidth: 460,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 10 : 14,
              animation: mounted ? 'mcq-fadeUp 0.45s ease-out 0.1s both' : 'none',
            }}>

              {phase === 'question' && (
                <>
                  {/* METAL button */}
                  <button
                    onClick={() => handleAnswer(true)}
                    style={{
                      flex: 1,
                      padding: isMobile ? '14px 20px' : '16px 24px',
                      borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontSize: isMobile ? 15 : 17, fontWeight: 800,
                      fontFamily: "'Poppins', sans-serif",
                      background: `linear-gradient(135deg, ${C.primary}, #6366F1)`,
                      color: C.white,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      boxShadow: '0 4px 20px rgba(74,77,201,0.3)',
                      transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                      letterSpacing: '-0.2px',
                    }}
                    onMouseEnter={e => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.transform = 'translateY(-3px) scale(1.02)';
                      b.style.boxShadow = '0 8px 28px rgba(74,77,201,0.38)';
                    }}
                    onMouseLeave={e => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.transform = 'translateY(0) scale(1)';
                      b.style.boxShadow = '0 4px 20px rgba(74,77,201,0.3)';
                    }}
                  >
                    <span style={{ fontSize: 22 }}>⚙️</span>
                    Metal
                  </button>

                  {/* NOT METAL button */}
                  <button
                    onClick={() => handleAnswer(false)}
                    style={{
                      flex: 1,
                      padding: isMobile ? '14px 20px' : '16px 24px',
                      borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontSize: isMobile ? 15 : 17, fontWeight: 800,
                      fontFamily: "'Poppins', sans-serif",
                      background: `linear-gradient(135deg, ${C.orange}, ${C.amber})`,
                      color: C.white,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      boxShadow: '0 4px 20px rgba(255,114,18,0.3)',
                      transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                      letterSpacing: '-0.2px',
                    }}
                    onMouseEnter={e => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.transform = 'translateY(-3px) scale(1.02)';
                      b.style.boxShadow = '0 8px 28px rgba(255,114,18,0.38)';
                    }}
                    onMouseLeave={e => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.transform = 'translateY(0) scale(1)';
                      b.style.boxShadow = '0 4px 20px rgba(255,114,18,0.3)';
                    }}
                  >
                    <span style={{ fontSize: 22 }}>🎨</span>
                    Not Metal
                  </button>
                </>
              )}

              {phase === 'wrong' && (
                <button
                  onClick={handleTryAgain}
                  style={{
                    flex: 1,
                    padding: isMobile ? '14px 20px' : '16px 24px',
                    borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: isMobile ? 14 : 16, fontWeight: 800,
                    fontFamily: "'Poppins', sans-serif",
                    background: `linear-gradient(135deg, #F59E0B, ${C.orange})`,
                    color: C.white,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 18px rgba(245,158,11,0.3)',
                    transition: 'all 0.22s ease',
                    animation: 'mcq-popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  🔄 Try Again
                </button>
              )}

              {phase === 'correct' && (
                <button
                  onClick={handleNext}
                  style={{
                    flex: 1,
                    padding: isMobile ? '14px 20px' : '16px 24px',
                    borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: isMobile ? 14 : 16, fontWeight: 800,
                    fontFamily: "'Poppins', sans-serif",
                    background: `linear-gradient(135deg, ${C.green}, #16A34A)`,
                    color: C.white,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 18px rgba(34,197,94,0.32)',
                    transition: 'all 0.22s ease',
                    animation: 'mcq-popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.2s both',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  {currentIdx + 1 >= totalItems ? '🏁 See Results' : '➡️ Next Item'}
                </button>
              )}
            </div>

            {/* Item counter */}
            <div style={{
              fontSize: isMobile ? 11 : 12, color: '#9CA3AF',
              fontFamily: "'Poppins', sans-serif", fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
            }}>
              Question {currentIdx + 1} of {totalItems}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MetalCoatingQuiz;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════