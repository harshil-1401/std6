// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: word_grid_game.tsx
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RotateCcw, Star, Clock, Zap, BookOpen } from 'lucide-react';

// ─── Custom inline icons ──────────────────────────────────────────────────
const TrophyIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';
type PromptMode = 'word_to_def' | 'def_to_word';

interface StepDetails {
    currentStep: number;
    totalSteps: number;
    isPaused: boolean;
    currentMode: ModeType;
}

interface BaseDataInterface {
    themeColor?: string;
    autoPlayDuration?: number;
}

interface WordEntry {
    id: string;
    word: string;
    definition: string;
    shortDef: string;   // ≤ 6 words — shown inside the grid cell
}

interface WordGridAdditionalProps {
    words?: WordEntry[];
    title?: string;
    subtitle?: string;
    gameDuration?: number;   // seconds (default 60)
    gridSize?: number;       // 3 = 3×3 (default), max 4 for 4×4
}

interface WordGridGameProps {
    props?: {
        width?: number;
        height?: number;
        data?: BaseDataInterface;
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
        additionalProps?: WordGridAdditionalProps;
    };
    setStepDetails?: (stepDetails: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== DEFAULT DATA (Chapter 6 — Materials Around Us) ====================

const DEFAULT_WORDS: WordEntry[] = [
    { id: 'w1',  word: 'Material',      definition: 'Any substance used to create or make an object.',                shortDef: 'Substance used to make objects' },
    { id: 'w2',  word: 'Classification',definition: 'The method of arranging objects into groups.',                   shortDef: 'Arranging objects into groups' },
    { id: 'w3',  word: 'Lustrous',      definition: 'Having a shiny surface; characteristic of most metals.',         shortDef: 'Shiny surface; like metals' },
    { id: 'w4',  word: 'Transparent',   definition: 'A material through which things can be seen clearly.',           shortDef: 'See through it clearly' },
    { id: 'w5',  word: 'Translucent',   definition: 'A material through which objects can be seen but not clearly.',  shortDef: 'Partially see-through' },
    { id: 'w6',  word: 'Opaque',        definition: 'A material through which you are not able to see at all.',       shortDef: 'Cannot see through it' },
    { id: 'w7',  word: 'Soluble',       definition: 'A material that dissolves completely when mixed in water.',      shortDef: 'Dissolves in water' },
    { id: 'w8',  word: 'Insoluble',     definition: 'A material that does not dissolve in water even after stirring.',shortDef: 'Does not dissolve in water' },
    { id: 'w9',  word: 'Matter',        definition: 'Anything that occupies space and has mass.',                     shortDef: 'Occupies space and has mass' },
    { id: 'w10', word: 'Mass',          definition: 'A property that gives the quantity of matter in an object.',     shortDef: 'Quantity of matter' },
    { id: 'w11', word: 'Volume',        definition: 'The space occupied by a substance or object.',                   shortDef: 'Space occupied by matter' },
    { id: 'w12', word: 'Hard',          definition: 'A material that is difficult to compress or scratch.',           shortDef: 'Difficult to compress or scratch' },
];

// ==================== HELPERS ====================

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

function pickNRandom<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
}

function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

const LINE_COLORS = ['#4A4DC9', '#FF7212', '#533086', '#FC9145', '#10b981', '#f59e0b', '#06b6d4', '#e11d48', '#8b5cf6'];

// ==================== MAIN COMPONENT ====================

const WordGridGame: React.FC<WordGridGameProps> = ({
    props = {},
    setStepDetails,
    stopAutoNext,
    setStopAutoNext,
}) => {

    // ─── CONFIG ───────────────────────────────────────────────────────────────
    const config = useMemo(() => ({
        width:      props.width      ?? 800,
        themeColor: props.themeColor ?? '#4A4DC9',
    }), [props]);

    const additionalProps = props.additionalProps || {};

    const gameConfig = useMemo(() => ({
        words:        additionalProps.words        ?? DEFAULT_WORDS,
        title:        additionalProps.title        ?? 'Word-Hub Grid Game',
        subtitle:     additionalProps.subtitle     ?? 'Read the prompt. Tap the matching cell as fast as you can!',
        gameDuration: additionalProps.gameDuration ?? 60,
        gridSize:     additionalProps.gridSize     ?? 3,
    }), [additionalProps]);

    const GRID_CELLS = gameConfig.gridSize * gameConfig.gridSize; // 9 for 3×3

    // ─── STATE ────────────────────────────────────────────────────────────────
    const [phase, setPhase]                   = useState<'idle' | 'playing' | 'summary'>('idle');
    const [timeLeft, setTimeLeft]             = useState(gameConfig.gameDuration);
    const [score, setScore]                   = useState(0);
    const [totalTaps, setTotalTaps]           = useState(0);
    const [gridWords, setGridWords]           = useState<WordEntry[]>([]);
    const [promptWord, setPromptWord]         = useState<WordEntry | null>(null);
    const [promptMode, setPromptMode]         = useState<PromptMode>('word_to_def');
    const [cellState, setCellState]           = useState<Record<string, 'idle' | 'correct' | 'wrong'>>({});
    const [mounted, setMounted]               = useState(false);
    const [confetti, setConfetti]             = useState<{ id: number; x: number; color: string; speed: number; size: number }[]>([]);
    const [pulseScore, setPulseScore]         = useState(false);
    const [missedWords, setMissedWords]       = useState<WordEntry[]>([]);
    const [promptAnim, setPromptAnim]         = useState(false);
    const [streakCount, setStreakCount]       = useState(0);
    const [showStreak, setShowStreak]         = useState(false);
    const [questionCount, setQuestionCount]   = useState(0);

    const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
    const missedRef     = useRef<Set<string>>(new Set());
    const promptHistory = useRef<string[]>([]);

    // ─── INJECT KEYFRAMES ─────────────────────────────────────────────────────
    useEffect(() => {
        const keyframes = `
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

            @keyframes wgFadeInUp    { from{opacity:0;transform:translateY(16px);}  to{opacity:1;transform:translateY(0);} }
            @keyframes wgFadeInDown  { from{opacity:0;transform:translateY(-16px);} to{opacity:1;transform:translateY(0);} }
            @keyframes wgPopIn       { 0%{transform:scale(0.7);opacity:0;} 65%{transform:scale(1.06);} 100%{transform:scale(1);opacity:1;} }
            @keyframes wgShake       { 0%,100%{transform:translateX(0);} 18%,54%,82%{transform:translateX(-6px);} 36%,70%{transform:translateX(6px);} }
            @keyframes wgCorrectPop  { 0%{transform:scale(1);} 40%{transform:scale(1.08);} 100%{transform:scale(1);} }
            @keyframes wgConfetti    { 0%{transform:translateY(0) rotate(0deg);opacity:1;} 100%{transform:translateY(420px) rotate(720deg);opacity:0;} }
            @keyframes wgSlideUp     { from{opacity:0;transform:translateY(36px) scale(0.97);} to{opacity:1;transform:translateY(0) scale(1);} }
            @keyframes wgStarSpin    { from{transform:rotate(0deg) scale(0);opacity:0;} to{transform:rotate(360deg) scale(1);opacity:1;} }
            @keyframes wgScorePulse  { 0%{transform:scale(1);} 50%{transform:scale(1.25);} 100%{transform:scale(1);} }
            @keyframes wgTimerPulse  { 0%,100%{color:#ef4444;} 50%{color:#fca5a5;} }
            @keyframes wgPromptSlide { from{opacity:0;transform:translateY(-10px);} to{opacity:1;transform:translateY(0);} }
            @keyframes wgStreakPop   { 0%{transform:scale(0) translateY(0);opacity:0;} 30%{transform:scale(1.2) translateY(-6px);opacity:1;} 80%{transform:scale(1) translateY(-14px);opacity:1;} 100%{transform:scale(0.8) translateY(-22px);opacity:0;} }
            @keyframes wgIdlePulse   { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(74,77,201,0.2);} 50%{transform:scale(1.02);box-shadow:0 0 0 8px rgba(74,77,201,0);} }
            @keyframes wgTimerShrink { from{width:100%;} to{width:0%;} }
            @keyframes wgCellIdle    { 0%,100%{border-color:#E0E0E0;} 50%{border-color:#C1C1EA;} }
        `;
        const el = document.createElement('style');
        el.id = 'wg-kf-v1';
        el.textContent = keyframes;
        document.head.appendChild(el);
        return () => { const s = document.getElementById('wg-kf-v1'); if (s) document.head.removeChild(s); };
    }, []);

    // ─── INIT ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        setTimeout(() => setMounted(true), 60);
    }, []);

    // ─── STEP DETAILS ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (setStepDetails) setStepDetails({ currentStep: 1, totalSteps: 1, isPaused: true, currentMode: 'practice' });
    }, [setStepDetails]);

    // ─── PICK NEW PROMPT (never repeat until exhausted) ──────────────────────
    const pickNewPrompt = useCallback((words: WordEntry[]) => {
        // Avoid repeating the last prompt word
        let candidates = words.filter(w => !promptHistory.current.includes(w.id));
        if (candidates.length === 0) {
            promptHistory.current = [];
            candidates = words;
        }
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        promptHistory.current.push(chosen.id);
        if (promptHistory.current.length > Math.ceil(words.length / 2)) {
            promptHistory.current.shift();
        }
        const mode: PromptMode = Math.random() > 0.5 ? 'word_to_def' : 'def_to_word';
        setPromptWord(chosen);
        setPromptMode(mode);
        setPromptAnim(true);
        setTimeout(() => setPromptAnim(false), 400);
        setQuestionCount(prev => prev + 1);
    }, []);

    // ─── RESHUFFLE GRID (always contains correct answer) ─────────────────────
    const reshuffleGrid = useCallback((currentWords: WordEntry[], correct: WordEntry) => {
        const others = pickNRandom(currentWords.filter(w => w.id !== correct.id), GRID_CELLS - 1);
        const newGrid = shuffle([correct, ...others]);
        setGridWords(newGrid);
        setCellState({});
    }, [GRID_CELLS]);

    // ─── START GAME ───────────────────────────────────────────────────────────
    const startGame = useCallback(() => {
        const words = gameConfig.words.length >= GRID_CELLS ? gameConfig.words : DEFAULT_WORDS;
        missedRef.current = new Set();
        promptHistory.current = [];
        setScore(0);
        setTotalTaps(0);
        setStreakCount(0);
        setMissedWords([]);
        setTimeLeft(gameConfig.gameDuration);
        setPhase('playing');
        setCellState({});

        // Pick first prompt
        const firstWords = pickNRandom(words, GRID_CELLS);
        const first = firstWords[Math.floor(Math.random() * firstWords.length)];
        promptHistory.current.push(first.id);
        setPromptWord(first);
        setPromptMode(Math.random() > 0.5 ? 'word_to_def' : 'def_to_word');
        setGridWords(shuffle(firstWords));
        setQuestionCount(1);
    }, [gameConfig, GRID_CELLS]);

    // ─── TIMER ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== 'playing') return;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    // Build missed words list
                    const missed = gameConfig.words.filter(w => missedRef.current.has(w.id));
                    setMissedWords(missed);
                    setTimeout(() => setPhase('summary'), 200);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase, gameConfig.words]);

    // ─── CONFETTI ─────────────────────────────────────────────────────────────
    const triggerConfetti = useCallback(() => {
        const colors = ['#4A4DC9', '#FF7212', '#533086', '#FC9145', '#C1C1EA', '#10b981', '#f59e0b'];
        const items = Array.from({ length: 32 }, (_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 100,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 1.8 + Math.random() * 2.5,
            size: 5 + Math.random() * 7,
        }));
        setConfetti(items);
        setTimeout(() => setConfetti([]), 3200);
    }, []);

    // ─── HANDLE CELL TAP ─────────────────────────────────────────────────────
    const handleCellTap = useCallback((tapped: WordEntry) => {
        if (!promptWord || phase !== 'playing') return;
        if (cellState[tapped.id] === 'correct' || cellState[tapped.id] === 'wrong') return;

        const isCorrect = tapped.id === promptWord.id;
        setTotalTaps(prev => prev + 1);

        if (isCorrect) {
            setCellState(prev => ({ ...prev, [tapped.id]: 'correct' }));
            setScore(prev => prev + 1);
            setPulseScore(true);
            setTimeout(() => setPulseScore(false), 600);

            setStreakCount(prev => {
                const next = prev + 1;
                if (next >= 3) { setShowStreak(true); setTimeout(() => setShowStreak(false), 900); }
                return next;
            });

            // Advance to next question after short delay
            setTimeout(() => {
                const words = gameConfig.words.length >= GRID_CELLS ? gameConfig.words : DEFAULT_WORDS;
                const newGrid = pickNRandom(words, GRID_CELLS);
                const next = newGrid.find(w => w.id !== tapped.id) ?? newGrid[0];
                const chosen = newGrid[Math.floor(Math.random() * newGrid.length)];
                reshuffleGrid(newGrid, chosen);
                pickNewPrompt(newGrid);
            }, 480);

        } else {
            setCellState(prev => ({ ...prev, [tapped.id]: 'wrong' }));
            setStreakCount(0);
            missedRef.current.add(promptWord.id);
            setTimeout(() => {
                setCellState(prev => {
                    const next = { ...prev };
                    delete next[tapped.id];
                    return next;
                });
            }, 900);
        }
    }, [promptWord, phase, cellState, gameConfig.words, GRID_CELLS, reshuffleGrid, pickNewPrompt]);

    // ─── RESET ────────────────────────────────────────────────────────────────
    const handleReset = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('idle');
        setTimeLeft(gameConfig.gameDuration);
        setScore(0);
        setTotalTaps(0);
        setStreakCount(0);
        setMissedWords([]);
        setGridWords([]);
        setPromptWord(null);
        setCellState({});
        promptHistory.current = [];
        missedRef.current = new Set();
    }, [gameConfig.gameDuration]);

    // ─── DERIVED ──────────────────────────────────────────────────────────────
    const accuracy   = totalTaps > 0 ? Math.round((score / totalTaps) * 100) : 0;
    const timerPct   = (timeLeft / gameConfig.gameDuration) * 100;
    const isUrgent   = timeLeft <= 10;

    const promptText = promptWord
        ? promptMode === 'word_to_def'
            ? `Tap the definition of: "${promptWord.word}"`
            : `Which word means: "${promptWord.definition}"`
        : '';

    // ─── CELL LABEL (what to show inside each cell) ───────────────────────────
    const getCellLabel = (entry: WordEntry) =>
        promptMode === 'word_to_def' ? entry.shortDef : entry.word;

    // ─── SUMMARY CARD ─────────────────────────────────────────────────────────
    const renderSummary = () => (
        <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'linear-gradient(135deg, #4A4DC9 0%, #533086 55%, #FF7212 100%)',
            borderRadius: 20, zIndex: 20,
            animation: 'wgSlideUp 0.55s ease-out',
            padding: '22px 18px', overflowY: 'auto',
        }}>
            {/* confetti */}
            {confetti.map(c => (
                <div key={c.id} style={{
                    position: 'absolute', left: `${c.x}%`, top: 0,
                    width: `${c.size}px`, height: `${c.size}px`,
                    backgroundColor: c.color, borderRadius: c.id % 2 === 0 ? '50%' : '3px',
                    animation: `wgConfetti ${c.speed}s ease-in forwards`,
                    zIndex: 25, pointerEvents: 'none',
                }} />
            ))}

            <div style={{ animation: 'wgStarSpin 0.8s ease-out', marginBottom: 8 }}>
                <TrophyIcon size={46} color="#FFF3E4" />
            </div>
            <h2 style={{
                fontFamily: "'Poppins', sans-serif", fontSize: 'clamp(18px, 4vw, 22px)',
                fontWeight: 800, color: '#FFF3E4', margin: '0 0 4px', textAlign: 'center',
                animation: 'wgFadeInUp 0.5s ease-out 0.2s both',
            }}>
                Time's Up! ⏱️
            </h2>

            {/* Stats row */}
            <div style={{
                display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center',
                animation: 'wgFadeInUp 0.5s ease-out 0.3s both',
            }}>
                {[
                    { label: 'Score', val: `${score}` },
                    { label: 'Accuracy', val: `${accuracy}%` },
                    { label: 'Questions', val: `${questionCount}` },
                ].map(s => (
                    <div key={s.label} style={{
                        background: 'rgba(255,255,255,0.13)', borderRadius: 12,
                        padding: '8px 16px', textAlign: 'center',
                    }}>
                        <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, fontWeight: 800, color: '#FC9145' }}>{s.val}</div>
                        <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 10, color: '#C1C1EA', fontWeight: 500 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Missed words */}
            {missedWords.length > 0 ? (
                <div style={{
                    width: '100%', maxWidth: 520,
                    animation: 'wgFadeInUp 0.5s ease-out 0.4s both',
                }}>
                    <div style={{
                        fontFamily: "'Poppins', sans-serif", fontSize: 11, fontWeight: 700,
                        color: '#FFF3E4', textTransform: 'uppercase', letterSpacing: '1px',
                        marginBottom: 8, textAlign: 'center',
                    }}>
                        📚 Review These Words
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 8,
                    }}>
                        {missedWords.map((w, i) => (
                            <div key={w.id} style={{
                                background: 'rgba(255,255,255,0.10)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 12, padding: '10px 12px',
                                border: '1.5px solid rgba(255,255,255,0.18)',
                                animation: `wgFadeInUp 0.35s ease-out ${0.45 + i * 0.07}s both`,
                            }}>
                                <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 700, color: '#FC9145', marginBottom: 3 }}>
                                    {w.word}
                                </div>
                                <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>
                                    {w.definition}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{
                    fontFamily: "'Poppins', sans-serif", fontSize: 14, color: '#C1C1EA',
                    animation: 'wgFadeInUp 0.5s ease-out 0.4s both', textAlign: 'center',
                }}>
                    🎉 Perfect! No missed words!
                </div>
            )}

            <button
                onClick={() => { handleReset(); triggerConfetti(); }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                style={{
                    marginTop: 18, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 26px', borderRadius: 12,
                    border: '2px solid #FFF3E4', background: 'transparent',
                    color: '#FFF3E4', fontFamily: "'Poppins', sans-serif",
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    animation: 'wgFadeInUp 0.5s ease-out 0.7s both',
                }}
            >
                <RotateCcw size={14} /> Play Again
            </button>
        </div>
    );

    // ─── IDLE / START SCREEN ──────────────────────────────────────────────────
    const renderIdle = () => (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px', gap: 16,
        }}>
            {/* Preview grid (decorative) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gameConfig.gridSize}, 1fr)`,
                gap: 8, width: '100%', maxWidth: 360,
                animation: mounted ? 'wgFadeInUp 0.5s ease-out 0.1s both' : 'none',
            }}>
                {Array.from({ length: GRID_CELLS }, (_, i) => (
                    <div key={i} style={{
                        borderRadius: 14,
                        border: '2px solid #E0E0E0',
                        background: '#ffffff',
                        aspectRatio: '1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'clamp(8px, 1.5vw, 11px)',
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 600, color: '#CACACA',
                        textAlign: 'center', padding: 8,
                        animation: `wgCellIdle 2.5s ease-in-out ${i * 0.15}s infinite`,
                    }}>
                        {DEFAULT_WORDS[i]?.word ?? '?'}
                    </div>
                ))}
            </div>

            <div style={{ textAlign: 'center', animation: mounted ? 'wgFadeInUp 0.5s ease-out 0.25s both' : 'none' }}>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 'clamp(12px, 2vw, 13px)', color: '#4E4E4E', margin: 0 }}>
                    {gameConfig.gameDuration} seconds &bull; {gameConfig.words.length} words &bull; {gameConfig.gridSize}×{gameConfig.gridSize} grid
                </p>
            </div>

            <button
                onClick={startGame}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(74,77,201,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(74,77,201,0.22)'; }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '14px 36px', borderRadius: 14,
                    background: 'linear-gradient(135deg, #4A4DC9, #533086)',
                    border: 'none', color: '#FFF3E4',
                    fontFamily: "'Poppins', sans-serif", fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    boxShadow: '0 3px 12px rgba(74,77,201,0.22)',
                    animation: mounted ? 'wgPopIn 0.6s ease-out 0.4s both' : 'none',
                }}
            >
                <Zap size={18} color="#FC9145" fill="#FC9145" /> Start Game
            </button>
        </div>
    );

    // ─── PLAYING STATE ────────────────────────────────────────────────────────
    const renderPlaying = () => (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 14px 14px', gap: 10 }}>

            {/* Streak badge */}
            {showStreak && (
                <div style={{
                    position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
                    background: '#FF7212', color: '#fff', borderRadius: 20,
                    padding: '4px 14px', fontSize: 12, fontWeight: 800,
                    fontFamily: "'Poppins', sans-serif", zIndex: 15,
                    animation: 'wgStreakPop 0.9s ease-out forwards',
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                }}>
                    🔥 {streakCount}x Streak!
                </div>
            )}

            {/* Timer bar */}
            <div style={{ height: 6, background: '#EBEBEB', borderRadius: 100, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{
                    height: '100%', borderRadius: 100,
                    background: isUrgent
                        ? 'linear-gradient(90deg, #ef4444, #fca5a5)'
                        : 'linear-gradient(90deg, #4A4DC9, #FF7212)',
                    width: `${timerPct}%`,
                    transition: 'width 1s linear, background 0.5s ease',
                }} />
            </div>

            {/* Prompt banner */}
            <div style={{
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(74,77,201,0.07), rgba(83,48,134,0.07))',
                border: '2px solid rgba(74,77,201,0.18)',
                padding: '12px 16px',
                flexShrink: 0,
                animation: promptAnim ? 'wgPromptSlide 0.35s ease-out' : 'none',
            }}>
                <div style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 'clamp(11px, 2.2vw, 14px)',
                    fontWeight: 600, color: '#333',
                    lineHeight: 1.5, textAlign: 'center',
                }}>
                    {promptText}
                </div>
            </div>

            {/* 3×3 Grid */}
            <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: `repeat(${gameConfig.gridSize}, 1fr)`,
                gap: 8,
            }}>
                {gridWords.map((entry, idx) => {
                    const state = cellState[entry.id] ?? 'idle';
                    const isCorrectCell = state === 'correct';
                    const isWrongCell   = state === 'wrong';
                    const chipColor     = LINE_COLORS[idx % LINE_COLORS.length];

                    let borderColor = '#E0E0E0';
                    if (isCorrectCell) borderColor = '#10b981';
                    if (isWrongCell)   borderColor = '#ef4444';

                    let bg = '#ffffff';
                    if (isCorrectCell) bg = '#f0fdf4';
                    if (isWrongCell)   bg = '#fef2f2';

                    let anim = 'none';
                    if (isCorrectCell) anim = 'wgCorrectPop 0.4s ease-out';
                    if (isWrongCell)   anim = 'wgShake 0.45s ease-out';

                    const label = getCellLabel(entry);

                    return (
                        <div
                            key={entry.id}
                            onClick={() => handleCellTap(entry)}
                            style={{
                                borderRadius: 14,
                                border: `2.5px solid ${borderColor}`,
                                background: bg,
                                cursor: 'pointer',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                padding: '8px 6px',
                                textAlign: 'center',
                                transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.15s ease',
                                animation: anim,
                                boxShadow: isCorrectCell
                                    ? '0 3px 12px rgba(16,185,129,0.2)'
                                    : isWrongCell
                                        ? '0 3px 12px rgba(239,68,68,0.2)'
                                        : '0 1px 4px rgba(0,0,0,0.05)',
                                position: 'relative', overflow: 'hidden',
                            }}
                            onMouseEnter={e => { if (!isCorrectCell && !isWrongCell) { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLDivElement).style.borderColor = chipColor; } }}
                            onMouseLeave={e => { if (!isCorrectCell && !isWrongCell) { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#E0E0E0'; } }}
                        >
                            {/* Corner accent dot */}
                            <div style={{
                                position: 'absolute', top: 6, right: 6,
                                width: 6, height: 6, borderRadius: '50%',
                                background: isCorrectCell ? '#10b981' : isWrongCell ? '#ef4444' : chipColor,
                                opacity: isCorrectCell || isWrongCell ? 1 : 0.35,
                                transition: 'background 0.2s, opacity 0.2s',
                            }} />

                            {/* Cell text */}
                            <span style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: 'clamp(9px, 1.6vw, 12px)',
                                fontWeight: isCorrectCell || isWrongCell ? 700 : 600,
                                color: isCorrectCell ? '#059669' : isWrongCell ? '#dc2626' : '#333',
                                lineHeight: 1.4,
                                transition: 'color 0.2s',
                                wordBreak: 'break-word',
                            }}>
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ─── MAIN RENDER ──────────────────────────────────────────────────────────
    return (
        <div style={{
            width: `${config.width}px`, maxWidth: '100%',
            fontFamily: "'Poppins', sans-serif",
            background: '#F5F5F5',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(74,77,201,0.12)',
            position: 'relative', display: 'flex', flexDirection: 'column',
            minHeight: 540,
        }}>

            {/* ══ HEADER ════════════════════════════════════════════════════════ */}
            <div style={{
                background: 'linear-gradient(135deg, #4A4DC9 0%, #533086 100%)',
                padding: '13px 16px',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                animation: mounted ? 'wgFadeInDown 0.4s ease-out' : 'none',
            }}>
                {/* Title block */}
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                        <BookOpen size={14} color="#FC9145" />
                        <h1 style={{
                            margin: 0, fontSize: 'clamp(13px, 2.5vw, 15px)',
                            fontWeight: 700, color: '#FFF3E4', lineHeight: 1.2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {gameConfig.title}
                        </h1>
                    </div>
                    <p style={{
                        margin: 0, fontSize: 'clamp(9px, 1.5vw, 11px)',
                        color: '#C1C1EA', fontWeight: 400,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {gameConfig.subtitle}
                    </p>
                </div>

                {/* Stats pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {/* Timer */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '5px 11px',
                    }}>
                        <Clock size={13} color={isUrgent ? '#fca5a5' : '#C1C1EA'} />
                        <span style={{
                            fontSize: 'clamp(12px, 2vw, 14px)', fontWeight: 700,
                            color: isUrgent ? '#fca5a5' : '#FFF3E4', minWidth: 24,
                            textAlign: 'center',
                            animation: isUrgent && phase === 'playing' ? 'wgTimerPulse 0.8s ease-in-out infinite' : 'none',
                        }}>
                            {phase === 'idle' ? gameConfig.gameDuration : timeLeft}
                        </span>
                    </div>

                    {/* Score */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '5px 11px',
                    }}>
                        <Star size={13} color="#FC9145" fill="#FC9145" />
                        <span style={{
                            fontSize: 'clamp(12px, 2vw, 14px)', fontWeight: 700, color: '#FFF3E4',
                            minWidth: 22, textAlign: 'center',
                            animation: pulseScore ? 'wgScorePulse 0.5s ease-out' : 'none',
                        }}>
                            {score}
                        </span>
                    </div>

                    {/* Reset */}
                    <button
                        onClick={handleReset}
                        title="Reset"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'rotate(-90deg)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'rotate(0deg)'; }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: 9,
                            border: '1.5px solid rgba(255,255,255,0.3)',
                            background: 'transparent', color: '#C1C1EA',
                            cursor: 'pointer', transition: 'all 0.3s ease', flexShrink: 0,
                        }}
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            {/* ══ CONTENT ═══════════════════════════════════════════════════════ */}
            {phase === 'idle'    && renderIdle()}
            {phase === 'playing' && renderPlaying()}

            {/* ══ HINT BAR (only while playing) ════════════════════════════════ */}
            {phase === 'playing' && (
                <div style={{
                    padding: '7px 16px',
                    background: '#fafafa',
                    borderTop: '1px solid #EBEBEB',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6, flexShrink: 0,
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: streakCount >= 3 ? '#FF7212' : '#CACACA', transition: 'background 0.3s' }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: streakCount >= 3 ? '#FF7212' : '#888' }}>
                        {streakCount >= 3 ? `🔥 ${streakCount}x streak! Keep going!` : `${score} correct · ${totalTaps - score} wrong · Q${questionCount}`}
                    </span>
                </div>
            )}

            {/* ══ SUMMARY OVERLAY ═══════════════════════════════════════════════ */}
            {phase === 'summary' && renderSummary()}

        </div>
    );
};

export default WordGridGame;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════