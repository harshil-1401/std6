import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Check, Star, Award, BookOpen, Target } from 'lucide-react';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface SortCard {
  id: number;
  text: string;
  correctBasket: 'remove' | 'separate';
  emoji: string;
  color: string;
  method?: string;
}

interface BasketState {
  remove: number[];
  separate: number[];
}

interface SeparationMethodsSorterProps {
  props?: {
    width?: number;
    height?: number;
    initialMode?: string;
    showModeSelector?: boolean;
    showNavigation?: boolean;
    showStepIndicator?: boolean;
    animationSpeed?: number;
    autoPlayDuration?: number;
    themeColor?: string;
    darkMode?: boolean;
    additionalProps?: {
      [key: string]: any;
    };
  };
  setStepDetails?: (stepDetails: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ─── DATA ─────────────────────────────────────────────────────────────────────

const CARDS: SortCard[] = [
  { id: 1, text: "Separating small stones from pulses", emoji: "🪨", color: "#8B5CF6", correctBasket: 'remove', method: "Handpicking" },
  { id: 2, text: "Churning curd to obtain butter", emoji: "🧈", color: "#F59E0B", correctBasket: 'separate', method: "Churning" },
  { id: 3, text: "Taking out green chillies from cooked dalia or poha", emoji: "🌶️", color: "#EF4444", correctBasket: 'remove', method: "Handpicking" },
  { id: 4, text: "Taking out seeds from watermelon", emoji: "🍉", color: "#10B981", correctBasket: 'remove', method: "Handpicking" },
  { id: 5, text: "Sorting sawdust and iron nails from building material", emoji: "🔩", color: "#6366F1", correctBasket: 'separate', method: "Magnetic Separation" },
  { id: 6, text: "Picking marigold flowers from a heap to make a garland", emoji: "🌼", color: "#F97316", correctBasket: 'separate', method: "Handpicking" },
  { id: 7, text: "Separating pebbles from sand", emoji: "🏖️", color: "#0EA5E9", correctBasket: 'separate', method: "Sieving" },
  { id: 8, text: "Separating coconut pieces from rice flour", emoji: "🥥", color: "#84CC16", correctBasket: 'separate', method: "Sieving" },
  { id: 9, text: "Separating oil from water", emoji: "🫙", color: "#F59E0B", correctBasket: 'separate', method: "Decantation" },
  { id: 10, text: "Separating salt from salt solution", emoji: "🧂", color: "#06B6D4", correctBasket: 'separate', method: "Evaporation" },
];

const STEPS = [
  { id: 1, title: "Meet the Cards!", subtitle: "Explore all 10 separation scenarios" },
  { id: 2, title: "Make a Prediction", subtitle: "Which basket does each card belong to?" },
  { id: 3, title: "Sort Cards 1–5", subtitle: "Drag each card to the correct basket" },
  { id: 4, title: "Sort Cards 6–10", subtitle: "Keep going — you're doing great!" },
  { id: 5, title: "Final Score!", subtitle: "See how well you understood the concept" },
];

// ─── EASING ───────────────────────────────────────────────────────────────────

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const SeparationMethodsSorter: React.FC<SeparationMethodsSorterProps> = ({ props = {}, setStepDetails, stopAutoNext, setStopAutoNext }) => {
  const {
    width = 900,
    height = 650,
    showNavigation = true,
    showStepIndicator = true,
    themeColor = "#4A4DC9",
    darkMode = false,
  } = props;

  const [currentStep, setCurrentStep] = useState(0); // 0-indexed
  const [basketState, setBasketState] = useState<BasketState>({ remove: [], separate: [] });
  const [draggedCard, setDraggedCard] = useState<number | null>(null);
  const [hoveredBasket, setHoveredBasket] = useState<'remove' | 'separate' | null>(null);
  const [feedback, setFeedback] = useState<{ [id: number]: 'correct' | 'wrong' | null }>({});
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());
  const [predictionDone, setPredictionDone] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [pulseBasket, setPulseBasket] = useState<'remove' | 'separate' | null>(null);
  const [wrongShake, setWrongShake] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const styleInjected = useRef(false);

  // Inject keyframes
  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      
      @keyframes cardReveal {
        0% { opacity: 0; transform: translateY(30px) scale(0.85) rotate(-3deg); }
        60% { transform: translateY(-8px) scale(1.03) rotate(1deg); }
        100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
      }
      @keyframes basketPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(74,77,201,0); }
        50% { transform: scale(1.04); box-shadow: 0 0 0 12px rgba(74,77,201,0.18); }
      }
      @keyframes correctBounce {
        0% { transform: scale(1); }
        30% { transform: scale(1.18) rotate(-2deg); }
        60% { transform: scale(0.95) rotate(1deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      @keyframes wrongShake {
        0%, 100% { transform: translateX(0); }
        15% { transform: translateX(-8px) rotate(-3deg); }
        30% { transform: translateX(8px) rotate(3deg); }
        45% { transform: translateX(-6px) rotate(-2deg); }
        60% { transform: translateX(6px) rotate(2deg); }
        75% { transform: translateX(-3px); }
      }
      @keyframes floatIn {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes sparkle {
        0% { transform: scale(0) rotate(0deg); opacity: 1; }
        100% { transform: scale(2) rotate(180deg); opacity: 0; }
      }
      @keyframes gradientShift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      @keyframes scoreCount {
        0% { transform: scale(0) rotate(-15deg); opacity: 0; }
        60% { transform: scale(1.2) rotate(5deg); }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes titleSlideIn {
        0% { opacity: 0; transform: translateX(-30px); }
        100% { opacity: 1; transform: translateX(0); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes basketDrop {
        0% { transform: translateY(0); }
        30% { transform: translateY(-12px); }
        60% { transform: translateY(4px); }
        100% { transform: translateY(0); }
      }
      @keyframes confetti {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
      }
      @keyframes starSpin {
        0% { transform: scale(0) rotate(-180deg); }
        70% { transform: scale(1.3) rotate(20deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      .drag-card:hover { transform: translateY(-4px) scale(1.03) !important; }
      .drag-card:active { transform: scale(0.97) !important; cursor: grabbing !important; }
    `;
    document.head.appendChild(style);
  }, []);

  const step1Cards = CARDS.slice(0, 5);
  const step2Cards = CARDS.slice(5, 10);

  const getSortedCards = () => {
    if (currentStep === 2) return step1Cards;
    if (currentStep === 3) return step2Cards;
    return [];
  };

  const getAllSortedCount = () => {
    return basketState.remove.length + basketState.separate.length;
  };

  const getScore = () => {
    let score = 0;
    CARDS.forEach(card => {
      const inRemove = basketState.remove.includes(card.id);
      const inSeparate = basketState.separate.includes(card.id);
      if ((card.correctBasket === 'remove' && inRemove) || (card.correctBasket === 'separate' && inSeparate)) {
        score++;
      }
    });
    return score;
  };

  const handleDrop = (basket: 'remove' | 'separate') => {
    if (draggedCard === null) return;
    const card = CARDS.find(c => c.id === draggedCard);
    if (!card) return;

    // Check if already sorted
    if (basketState.remove.includes(draggedCard) || basketState.separate.includes(draggedCard)) {
      setDraggedCard(null);
      setHoveredBasket(null);
      return;
    }

    const isCorrect = card.correctBasket === basket;
    
    setBasketState(prev => ({
      ...prev,
      [basket]: [...prev[basket], draggedCard]
    }));

    setFeedback(prev => ({ ...prev, [draggedCard]: isCorrect ? 'correct' : 'wrong' }));
    setPulseBasket(basket);
    setTimeout(() => setPulseBasket(null), 600);

    if (!isCorrect) {
      setWrongShake(draggedCard);
      setTimeout(() => setWrongShake(null), 700);
    }

    setDraggedCard(null);
    setHoveredBasket(null);
  };

  const handleBasketClick = (basket: 'remove' | 'separate', cardId: number) => {
    const card = CARDS.find(c => c.id === cardId);
    if (!card) return;
    if (basketState.remove.includes(cardId) || basketState.separate.includes(cardId)) return;

    const isCorrect = card.correctBasket === basket;
    setBasketState(prev => ({ ...prev, [basket]: [...prev[basket], cardId] }));
    setFeedback(prev => ({ ...prev, [cardId]: isCorrect ? 'correct' : 'wrong' }));
    setPulseBasket(basket);
    setTimeout(() => setPulseBasket(null), 600);
    if (!isCorrect) {
      setWrongShake(cardId);
      setTimeout(() => setWrongShake(null), 700);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    }
  };
  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };
  const handleReset = () => {
    setCurrentStep(0);
    setBasketState({ remove: [], separate: [] });
    setFeedback({});
    setPredictionDone(false);
    setShowSummary(false);
    setRevealedCards(new Set());
  };

  // Colors
  const primaryPurple = "#4A4DC9";
  const gradientOrange = "#FC9145";
  const gradientPurple = "#533086";
  const removeColor = "#E11D48";
  const separateColor = "#0D9488";
  const bgColor = darkMode ? "#0F0E1A" : "#F5F4FF";
  const cardBg = darkMode ? "#1A1830" : "#FFFFFF";
  const textColor = darkMode ? "#F0EEFF" : "#1A1635";
  const subTextColor = darkMode ? "#A89FCC" : "#6B63A0";

  const score = getScore();
  const total = CARDS.length;

  // ─── STEP 0: INTRO / CARD SHOWCASE ───────────────────────────────────────

  const renderStep0 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '0 20px' }}>
      <div style={{ textAlign: 'center', animation: 'titleSlideIn 0.6s ease' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: primaryPurple, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
          Activity 9.6
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: textColor, margin: 0, lineHeight: 1.2 }}>
          Why Do We Separate Substances?
        </h2>
        <p style={{ fontSize: 14, color: subTextColor, marginTop: 8, maxWidth: 500 }}>
          Malli and Valli learnt 10 separation scenarios during their Bharat Ki Yatra. Help sort them into two baskets!
        </p>
      </div>

      {/* Two basket preview */}
      <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 700, justifyContent: 'center' }}>
        {[
          { label: 'Basket 1', desc: 'To remove a component that is not useful', color: removeColor, bg: '#FFF1F3', icon: '🗑️', borderColor: '#FECDD3' },
          { label: 'Basket 2', desc: 'To separate two different but useful components', color: separateColor, bg: '#F0FDF9', icon: '🧺', borderColor: '#99F6E4' },
        ].map((b, i) => (
          <div key={i} style={{
            flex: 1, padding: '16px 20px', borderRadius: 16, background: b.bg,
            border: `2px solid ${b.borderColor}`, textAlign: 'center',
            animation: `floatIn 0.5s ease ${i * 0.15}s both`
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{b.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: b.color }}>{b.label}</div>
            <div style={{ fontSize: 12, color: subTextColor, marginTop: 4 }}>{b.desc}</div>
          </div>
        ))}
      </div>

      {/* Cards grid preview */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 680 }}>
        {CARDS.map((card, i) => (
          <div key={card.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 30,
            background: cardBg, border: `1.5px solid ${card.color}30`,
            boxShadow: `0 2px 8px ${card.color}20`,
            animation: `cardReveal 0.5s ease ${0.05 * i}s both`,
            cursor: 'default'
          }}>
            <span style={{ fontSize: 18 }}>{card.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: textColor, maxWidth: 160 }}>{card.text}</span>
          </div>
        ))}
      </div>

      <button onClick={handleNext} style={{
        padding: '12px 36px', borderRadius: 40, border: 'none', cursor: 'pointer',
        background: `linear-gradient(135deg, ${gradientPurple}, ${gradientOrange})`,
        backgroundSize: '200% 200%', animation: 'gradientShift 3s ease infinite',
        color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: 15, fontWeight: 700,
        boxShadow: '0 4px 20px rgba(83,48,134,0.4)', marginTop: 4
      }}>
        Let's Start! →
      </button>
    </div>
  );

  // ─── STEP 1: PREDICTION ───────────────────────────────────────────────────

  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '0 16px' }}>
      <div style={{ textAlign: 'center', animation: 'titleSlideIn 0.5s ease' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: primaryPurple, letterSpacing: 2, textTransform: 'uppercase' }}>Step 2</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: textColor, margin: '6px 0 4px' }}>Before You Sort — Think! 🤔</h2>
        <p style={{ fontSize: 13, color: subTextColor, margin: 0 }}>Click on each card to guess: which basket would you put it in?</p>
      </div>

      <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 680 }}>
        {(['remove', 'separate'] as const).map((basket, i) => {
          const label = basket === 'remove' ? '🗑️ Remove the bad' : '🧺 Separate both useful';
          const color = basket === 'remove' ? removeColor : separateColor;
          return (
            <div key={basket} style={{
              flex: 1, padding: '12px 16px', borderRadius: 14, textAlign: 'center',
              background: darkMode ? `${color}15` : `${color}10`,
              border: `2px dashed ${color}60`, minHeight: 80,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {revealedCards && [...revealedCards].filter(id => {
                  const card = CARDS.find(c => c.id === id);
                  // for prediction we just show which basket the user guessed
                  return false;
                }).map(id => <span key={id} style={{ fontSize: 18 }}>{CARDS.find(c => c.id === id)?.emoji}</span>)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 680 }}>
        {CARDS.map((card, i) => {
          const placed = revealedCards.has(card.id);
          return (
            <div key={card.id} style={{
              width: 130, padding: '14px 10px', borderRadius: 16, textAlign: 'center',
              background: placed ? `${card.color}15` : cardBg,
              border: `2px solid ${placed ? card.color : card.color + '40'}`,
              boxShadow: placed ? `0 4px 16px ${card.color}30` : '0 2px 8px rgba(0,0,0,0.06)',
              cursor: placed ? 'default' : 'pointer',
              animation: `cardReveal 0.4s ease ${0.05 * i}s both`,
              transition: 'all 0.3s ease',
              opacity: placed ? 0.7 : 1,
            }}
              onClick={() => {
                if (!placed) setRevealedCards(prev => new Set([...prev, card.id]));
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{card.emoji}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: placed ? card.color : textColor, lineHeight: 1.3 }}>{card.text}</div>
              {placed && <div style={{ fontSize: 9, color: subTextColor, marginTop: 4 }}>✓ Noted!</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handlePrev} style={{
          padding: '10px 24px', borderRadius: 30, border: `2px solid ${primaryPurple}40`, cursor: 'pointer',
          background: 'transparent', color: primaryPurple, fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 600
        }}>← Back</button>
        <button onClick={handleNext} style={{
          padding: '10px 30px', borderRadius: 30, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${gradientPurple}, ${gradientOrange})`,
          color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(83,48,134,0.35)'
        }}>
          Start Sorting! →
        </button>
      </div>
    </div>
  );

  // ─── SORT STEP (Step 2 & 3) ───────────────────────────────────────────────

  const renderSortStep = (cards: SortCard[], stepNum: number) => {
    const sortedIds = new Set([...basketState.remove, ...basketState.separate]);
    const unsorted = cards.filter(c => !sortedIds.has(c.id));
    const allDone = cards.every(c => sortedIds.has(c.id));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px', width: '100%' }}>
        <div style={{ textAlign: 'center', animation: 'titleSlideIn 0.5s ease' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: primaryPurple, letterSpacing: 2, textTransform: 'uppercase' }}>
            Step {stepNum + 1} — Cards {stepNum === 2 ? '1–5' : '6–10'}
          </div>
          <p style={{ fontSize: 13, color: subTextColor, margin: '4px 0 0' }}>
            {allDone ? '🎉 All sorted! Move to the next step.' : 'Drag or tap a card, then tap a basket to sort it!'}
          </p>
        </div>

        {/* Baskets */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          {(['remove', 'separate'] as const).map(basket => {
            const isHovered = hoveredBasket === basket;
            const isPulsing = pulseBasket === basket;
            const color = basket === 'remove' ? removeColor : separateColor;
            const basketCards = cards.filter(c => (basket === 'remove' ? basketState.remove : basketState.separate).includes(c.id));
            return (
              <div key={basket}
                style={{
                  flex: 1, minHeight: 120, borderRadius: 16, padding: 12,
                  background: isHovered ? `${color}18` : darkMode ? `${color}10` : `${color}08`,
                  border: `2px ${isHovered ? 'solid' : 'dashed'} ${color}${isHovered ? '' : '70'}`,
                  transition: 'all 0.25s ease',
                  animation: isPulsing ? 'basketDrop 0.5s ease' : 'none',
                  cursor: draggedCard !== null ? 'copy' : 'default',
                }}
                onDragOver={e => { e.preventDefault(); setHoveredBasket(basket); }}
                onDragLeave={() => setHoveredBasket(null)}
                onDrop={() => handleDrop(basket)}
                onClick={() => { if (draggedCard !== null) handleDrop(basket); }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{basket === 'remove' ? '🗑️' : '🧺'}</span>
                  {basket === 'remove' ? 'Remove unwanted component' : 'Separate useful components'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {basketCards.map(card => (
                    <div key={card.id} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                      borderRadius: 20, background: cardBg,
                      border: `1.5px solid ${feedback[card.id] === 'correct' ? '#10B981' : '#EF4444'}`,
                      boxShadow: `0 2px 8px ${feedback[card.id] === 'correct' ? '#10B98130' : '#EF444430'}`,
                      animation: 'correctBounce 0.5s ease',
                    }}>
                      <span style={{ fontSize: 16 }}>{card.emoji}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: textColor }}>{card.text.split(' ').slice(0, 4).join(' ')}…</span>
                      <span style={{ fontSize: 12 }}>{feedback[card.id] === 'correct' ? '✅' : '❌'}</span>
                    </div>
                  ))}
                  {basketCards.length === 0 && (
                    <div style={{ fontSize: 11, color: subTextColor, fontStyle: 'italic' }}>Drop cards here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cards to sort */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {cards.map((card, i) => {
            const isSorted = sortedIds.has(card.id);
            const isDragging = draggedCard === card.id;
            const isWrong = wrongShake === card.id;
            const isSelected = draggedCard === card.id;
            return (
              <div key={card.id}
                draggable={!isSorted}
                className={!isSorted ? 'drag-card' : ''}
                style={{
                  width: 135, padding: '14px 12px', borderRadius: 16, textAlign: 'center',
                  background: isSorted ? `${card.color}15` : isSelected ? `${card.color}25` : cardBg,
                  border: `2px solid ${isSorted ? card.color + '60' : isSelected ? card.color : card.color + '40'}`,
                  boxShadow: isDragging ? `0 12px 32px ${card.color}50` : `0 2px 10px ${card.color}20`,
                  cursor: isSorted ? 'default' : 'grab',
                  opacity: isSorted ? 0.45 : 1,
                  transform: isDragging ? 'scale(1.08) rotate(-2deg)' : 'scale(1)',
                  transition: 'all 0.25s ease',
                  animation: isWrong ? 'wrongShake 0.7s ease' : `cardReveal 0.4s ease ${0.06 * i}s both`,
                  position: 'relative',
                  userSelect: 'none',
                }}
                onDragStart={() => !isSorted && setDraggedCard(card.id)}
                onDragEnd={() => setDraggedCard(null)}
                onClick={() => {
                  if (isSorted) return;
                  if (draggedCard === card.id) {
                    setDraggedCard(null);
                  } else {
                    setDraggedCard(card.id);
                  }
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 6 }}>{card.emoji}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: isSorted ? subTextColor : textColor, lineHeight: 1.35 }}>{card.text}</div>
                {isSelected && !isSorted && (
                  <div style={{ fontSize: 9, color: primaryPurple, marginTop: 5, fontWeight: 700 }}>→ Tap a basket!</div>
                )}
                {isSorted && (
                  <div style={{ fontSize: 10, color: feedback[card.id] === 'correct' ? '#10B981' : '#EF4444', marginTop: 4, fontWeight: 700 }}>
                    {feedback[card.id] === 'correct' ? '✅ Correct!' : '❌ Moved'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {allDone && (
          <div style={{ textAlign: 'center', animation: 'floatIn 0.5s ease', marginTop: 4 }}>
            <div style={{ fontSize: 13, color: '#10B981', fontWeight: 700, marginBottom: 8 }}>
              🌟 All cards sorted! Ready for the next batch?
            </div>
            <button onClick={handleNext} style={{
              padding: '10px 28px', borderRadius: 30, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${gradientPurple}, ${gradientOrange})`,
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 700,
              boxShadow: '0 4px 16px rgba(83,48,134,0.35)'
            }}>
              {stepNum === 2 ? 'Next 5 Cards →' : 'See Final Score →'}
            </button>
          </div>
        )}
        {!allDone && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button onClick={handlePrev} style={{
              padding: '9px 22px', borderRadius: 30, border: `2px solid ${primaryPurple}40`, cursor: 'pointer',
              background: 'transparent', color: primaryPurple, fontFamily: 'Poppins, sans-serif', fontSize: 12, fontWeight: 600
            }}>← Back</button>
          </div>
        )}
      </div>
    );
  };

  // ─── STEP 4: FINAL SUMMARY ────────────────────────────────────────────────

  const renderStep4 = () => {
    const pct = Math.round((score / total) * 100);
    const emoji = score === total ? '🏆' : score >= 7 ? '🌟' : score >= 5 ? '👍' : '💪';
    const msg = score === total ? 'Perfect Score! You are a Separation Expert!' :
      score >= 7 ? 'Excellent! Almost there!' :
        score >= 5 ? 'Good effort! Review the wrong ones.' : 'Keep learning — you\'ll get it!';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px', alignItems: 'center', width: '100%' }}>
        <div style={{ textAlign: 'center', animation: 'titleSlideIn 0.5s ease' }}>
          <div style={{ fontSize: 48, animation: 'starSpin 0.8s ease' }}>{emoji}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: textColor, margin: '6px 0 2px' }}>Your Final Score</h2>
          <div style={{ fontSize: 42, fontWeight: 900, background: `linear-gradient(135deg, ${gradientPurple}, ${gradientOrange})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'scoreCount 0.7s ease 0.3s both' }}>
            {score}/{total}
          </div>
          <p style={{ fontSize: 14, color: subTextColor, margin: '4px 0' }}>{msg}</p>
        </div>

        {/* Key concept */}
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 640 }}>
          {[
            { label: '🗑️ Remove unwanted', color: removeColor, cards: CARDS.filter(c => c.correctBasket === 'remove') },
            { label: '🧺 Separate both useful', color: separateColor, cards: CARDS.filter(c => c.correctBasket === 'separate') },
          ].map((b, i) => (
            <div key={i} style={{
              flex: 1, padding: '14px', borderRadius: 16,
              background: darkMode ? `${b.color}12` : `${b.color}08`,
              border: `2px solid ${b.color}40`, animation: `floatIn 0.5s ease ${0.1 * i}s both`
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: b.color, marginBottom: 8 }}>{b.label}</div>
              {b.cards.map(card => {
                const inRemove = basketState.remove.includes(card.id);
                const inSeparate = basketState.separate.includes(card.id);
                const isCorrect = (card.correctBasket === 'remove' && inRemove) || (card.correctBasket === 'separate' && inSeparate);
                return (
                  <div key={card.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5,
                    padding: '5px 8px', borderRadius: 8, background: cardBg,
                    border: `1px solid ${isCorrect ? '#10B98140' : '#EF444440'}`
                  }}>
                    <span style={{ fontSize: 14 }}>{card.emoji}</span>
                    <span style={{ fontSize: 10, color: textColor, flex: 1 }}>{card.text.substring(0, 32)}…</span>
                    <span style={{ fontSize: 11 }}>{isCorrect ? '✅' : '❌'}</span>
                    <span style={{ fontSize: 9, color: subTextColor, background: `${b.color}20`, padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>
                      {card.method}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Key insight */}
        <div style={{
          padding: '14px 20px', borderRadius: 14, maxWidth: 620, width: '100%',
          background: `linear-gradient(135deg, ${gradientPurple}15, ${gradientOrange}15)`,
          border: `1.5px solid ${primaryPurple}30`,
          animation: 'floatIn 0.6s ease 0.3s both'
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: primaryPurple, marginBottom: 4 }}>💡 Key Insight</div>
          <div style={{ fontSize: 12, color: subTextColor, lineHeight: 1.6 }}>
            We separate substances for two purposes: (1) to <strong>remove</strong> an unwanted component from a mixture, or (2) to <strong>obtain</strong> two useful components separately. The method used depends on the physical properties of the substances — size, magnetism, density, or solubility.
          </div>
        </div>

        <button onClick={handleReset} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 28px', borderRadius: 30, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${gradientPurple}, ${gradientOrange})`,
          color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(83,48,134,0.35)'
        }}>
          <RotateCcw size={16} /> Try Again
        </button>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  const stepData = STEPS[currentStep];
  const sortedCount = getAllSortedCount();

  return (
    <div ref={containerRef} style={{
      width: '100%', minHeight: height, fontFamily: 'Poppins, sans-serif',
      background: bgColor, display: 'flex', flexDirection: 'column', position: 'relative',
      overflow: 'hidden', borderRadius: 20,
    }}>
      {/* Animated bg blobs */}
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: `radial-gradient(circle, ${gradientPurple}18, transparent 70%)`,
        top: -80, right: -80, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', width: 250, height: 250, borderRadius: '50%',
        background: `radial-gradient(circle, ${gradientOrange}15, transparent 70%)`,
        bottom: -60, left: -60, pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{
        padding: '16px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${primaryPurple}20`, position: 'relative', zIndex: 10,
        background: darkMode ? 'rgba(26,24,48,0.95)' : 'rgba(245,244,255,0.95)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${gradientPurple}, ${gradientOrange})`,
          }}>
            <BookOpen size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: textColor, lineHeight: 1.1 }}>Separation Methods Sorter</div>
            <div style={{ fontSize: 10, color: subTextColor }}>Grade 6 · NCERT Science Ch.9</div>
          </div>
        </div>

        {showStepIndicator && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{
                width: i === currentStep ? 22 : 8, height: 8, borderRadius: 4,
                background: i <= currentStep ? `linear-gradient(90deg, ${gradientPurple}, ${gradientOrange})` : `${primaryPurple}25`,
                transition: 'all 0.4s ease',
                cursor: 'pointer'
              }} onClick={() => setCurrentStep(i)} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {sortedCount > 0 && currentStep < 4 && (
            <div style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: `${primaryPurple}18`, color: primaryPurple
            }}>
              {sortedCount}/10 sorted
            </div>
          )}
          <button onClick={handleReset} style={{
            width: 32, height: 32, borderRadius: 10, border: `1.5px solid ${primaryPurple}30`,
            background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: primaryPurple
          }}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Step header */}
      <div style={{
        padding: '12px 24px 6px', background: `linear-gradient(135deg, ${gradientPurple}10, ${gradientOrange}08)`,
        borderBottom: `1px solid ${primaryPurple}12`, display: 'flex', alignItems: 'center', gap: 12, zIndex: 9
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${gradientPurple}, ${gradientOrange})`,
          fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0
        }}>
          {currentStep + 1}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{stepData.title}</div>
          <div style={{ fontSize: 11, color: subTextColor }}>{stepData.subtitle}</div>
        </div>
        {currentStep === 4 && (
          <div style={{
            marginLeft: 'auto', padding: '4px 14px', borderRadius: 20,
            background: `linear-gradient(135deg, ${gradientPurple}, ${gradientOrange})`,
            fontSize: 12, fontWeight: 700, color: '#fff'
          }}>
            Score: {score}/{total}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px 8px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', zIndex: 5,
      }}>
        {currentStep === 0 && renderStep0()}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderSortStep(step1Cards, 2)}
        {currentStep === 3 && renderSortStep(step2Cards, 3)}
        {currentStep === 4 && renderStep4()}
      </div>

      {/* Footer nav */}
      {showNavigation && currentStep > 0 && currentStep < 4 && currentStep !== 2 && currentStep !== 3 && (
        <div style={{
          padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: `1px solid ${primaryPurple}15`, background: darkMode ? 'rgba(26,24,48,0.9)' : 'rgba(245,244,255,0.9)',
          backdropFilter: 'blur(8px)'
        }}>
          <button onClick={handlePrev} disabled={currentStep === 0} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 30, border: `2px solid ${primaryPurple}30`,
            background: 'transparent', cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            color: primaryPurple, fontFamily: 'Poppins, sans-serif', fontSize: 12, fontWeight: 600,
            opacity: currentStep === 0 ? 0.4 : 1
          }}>
            <ChevronLeft size={14} /> Back
          </button>
          <button onClick={handleNext} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 22px', borderRadius: 30, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${gradientPurple}, ${gradientOrange})`,
            color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: 12, fontWeight: 700,
            boxShadow: '0 3px 12px rgba(83,48,134,0.3)'
          }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SeparationMethodsSorter;
