// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: companion_pair_game.tsx
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Check, RotateCcw, Star } from 'lucide-react';

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

const ArrowRightIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

const LinkIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

// Opposite arrows icon
const OppositeIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3L3 8l5 5" />
        <path d="M3 8h13a5 5 0 0 1 0 10h-1" />
        <path d="M16 21l5-5-5-5" />
        <path d="M21 16H8a5 5 0 0 1 0-10h1" />
    </svg>
);

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

interface WordPair {
    id: string;
    left: string;
    right: string;
    reason: string;
}

interface CompanionPairAdditionalProps {
    pairs?: WordPair[];
    title?: string;
    subtitle?: string;
    rightColumnOrder?: string[];
}

interface CompanionPairGameProps {
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
        additionalProps?: CompanionPairAdditionalProps;
    };
    setStepDetails?: (stepDetails: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== DEFAULT DATA ====================

const DEFAULT_PAIRS: WordPair[] = [
    { id: 'hard',        left: 'Hard',        right: 'Soft',      reason: 'Hard & Soft are OPPOSITE texture properties — one resists compression, the other yields easily.' },
    { id: 'lustrous',    left: 'Lustrous',    right: 'Dull',      reason: 'Lustrous & Dull are OPPOSITES describing surface shine — metals are lustrous; wood and paper are non-lustrous.' },
    { id: 'transparent', left: 'Transparent', right: 'Opaque',    reason: 'Transparent & Opaque are OPPOSITES — transparent lets you see through it; opaque blocks all light completely.' },
    { id: 'soluble',     left: 'Soluble',     right: 'Insoluble', reason: 'Soluble & Insoluble are OPPOSITES — soluble materials dissolve in water; insoluble ones remain separate.' },
    { id: 'dense',       left: 'Dense',       right: 'Fluid',     reason: 'Dense & Fluid are OPPOSITES — dense describes tightly packed matter; fluid flows freely with no fixed shape.' },
    { id: 'heavy',       left: 'Heavy',       right: 'Light',     reason: 'Heavy & Light are OPPOSITE properties of mass — objects with more mass feel heavier.' },
];

const DEFAULT_RIGHT_ORDER = ['Soft', 'Insoluble', 'Opaque', 'Light', 'Dull', 'Fluid'];

// ==================== HELPERS ====================

const LEFT_LABELS  = ['(i)', '(ii)', '(iii)', '(iv)', '(v)', '(vi)', '(vii)', '(viii)'];
const RIGHT_LABELS = ['(a)', '(b)', '(c)', '(d)', '(e)', '(f)', '(g)', '(h)'];

const LINE_COLORS = ['#4A4DC9', '#FF7212', '#533086', '#FC9145', '#10b981', '#f59e0b'];

// ==================== MAIN COMPONENT ====================

const CompanionPairGame: React.FC<CompanionPairGameProps> = ({
    props = {},
    setStepDetails,
    stopAutoNext,
    setStopAutoNext,
}) => {

    // ─── CONFIG ───────────────────────────────────────────────────────────────
    const config = useMemo(() => ({
        width:      props.width      ?? 800,
        height:     props.height     ?? 600,
        themeColor: props.themeColor ?? '#4A4DC9',
    }), [props]);

    const additionalProps = props.additionalProps || {};

    const gameConfig = useMemo(() => ({
        pairs:            additionalProps.pairs            ?? DEFAULT_PAIRS,
        title:            additionalProps.title            ?? 'Match the Opposite Properties',
        subtitle:         additionalProps.subtitle         ?? 'Each property on the left has an OPPOSITE on the right — tap a word to select it, then tap its opposite',
        rightColumnOrder: additionalProps.rightColumnOrder ?? DEFAULT_RIGHT_ORDER,
    }), [additionalProps]);

    const rightColumn = useMemo(() => {
        return gameConfig.rightColumnOrder
            .map(word => gameConfig.pairs.find(p => p.right === word))
            .filter(Boolean) as WordPair[];
    }, [gameConfig]);

    // ─── STATE ────────────────────────────────────────────────────────────────
    const [matches, setMatches]                   = useState<Record<string, string>>({});
    const [selectedLeft, setSelectedLeft]         = useState<string | null>(null);
    const [wrongPair, setWrongPair]               = useState<{ leftId: string; rightWord: string } | null>(null);
    const [correctAnimating, setCorrectAnimating] = useState<string | null>(null);
    const [showSummary, setShowSummary]           = useState(false);
    const [score, setScore]                       = useState(0);
    const [attempts, setAttempts]                 = useState(0);
    const [mounted, setMounted]                   = useState(false);
    const [confetti, setConfetti]                 = useState<{ id: number; x: number; color: string; speed: number; size: number }[]>([]);
    const [hoverLeft, setHoverLeft]               = useState<string | null>(null);
    const [hoverRight, setHoverRight]             = useState<string | null>(null);
    const [shakeRight, setShakeRight]             = useState<string | null>(null);
    const [pulseScore, setPulseScore]             = useState(false);
    const [lastMatchedId, setLastMatchedId]       = useState<string | null>(null);
    const [linePositions, setLinePositions]       = useState<{
        leftId: string; rightWord: string; y1: number; y2: number; color: string; idx: number;
    }[]>([]);

    // ─── REFS ─────────────────────────────────────────────────────────────────
    const containerRef = useRef<HTMLDivElement>(null);
    const leftRefs     = useRef<Record<string, HTMLDivElement | null>>({});
    const rightRefs    = useRef<Record<string, HTMLDivElement | null>>({});
    const svgAreaRef   = useRef<HTMLDivElement>(null);

    // ─── INJECT KEYFRAMES ─────────────────────────────────────────────────────
    useEffect(() => {
        const keyframes = `
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

            @keyframes cpgFadeInUp    { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
            @keyframes cpgFadeInLeft  { from { opacity:0; transform:translateX(-25px); } to { opacity:1; transform:translateX(0); } }
            @keyframes cpgFadeInRight { from { opacity:0; transform:translateX(25px); } to { opacity:1; transform:translateX(0); } }
            @keyframes cpgPopIn       { 0%{transform:scale(0);opacity:0;} 70%{transform:scale(1.1);} 100%{transform:scale(1);opacity:1;} }
            @keyframes cpgShake       { 0%,100%{transform:translateX(0);} 15%,45%,75%{transform:translateX(-5px);} 30%,60%,90%{transform:translateX(5px);} }
            @keyframes cpgCorrectFlash{ 0%{box-shadow:0 0 0 0 rgba(16,185,129,0.6);} 70%{box-shadow:0 0 0 8px rgba(16,185,129,0);} 100%{box-shadow:none;} }
            @keyframes cpgConfettiFall{ 0%{transform:translateY(0) rotate(0deg);opacity:1;} 100%{transform:translateY(450px) rotate(720deg);opacity:0;} }
            @keyframes cpgSlideUp     { from{opacity:0;transform:translateY(40px) scale(0.96);} to{opacity:1;transform:translateY(0) scale(1);} }
            @keyframes cpgStarSpin    { from{transform:rotate(0deg) scale(0);opacity:0;} to{transform:rotate(360deg) scale(1);opacity:1;} }
            @keyframes cpgScorePulse  { 0%{transform:scale(1);} 50%{transform:scale(1.2);} 100%{transform:scale(1);} }
            @keyframes cpgGlowPulse   { 0%,100%{box-shadow:0 0 0 0 rgba(74,77,201,0);} 50%{box-shadow:0 0 0 4px rgba(74,77,201,0.12);} }
            @keyframes cpgDrawLine    { from{stroke-dashoffset:500;} to{stroke-dashoffset:0;} }
            @keyframes cpgLinePop     { 0%{opacity:0;} 100%{opacity:1;} }
            @keyframes cpgBadgePop    { 0%{transform:scale(0) rotate(-10deg);opacity:0;} 70%{transform:scale(1.12) rotate(2deg);} 100%{transform:scale(1) rotate(0deg);opacity:1;} }
            @keyframes cpgOppositeGlow{ 0%,100%{opacity:0.7;} 50%{opacity:1;} }
        `;
        const el = document.createElement('style');
        el.id = 'cpg-kf-v2';
        el.textContent = keyframes;
        document.head.appendChild(el);
        return () => { const s = document.getElementById('cpg-kf-v2'); if (s) document.head.removeChild(s); };
    }, []);

    useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

    // ─── RECALC SVG LINES ─────────────────────────────────────────────────────
    const recalcLines = useCallback(() => {
        if (!svgAreaRef.current) return;
        const svgRect = svgAreaRef.current.getBoundingClientRect();
        const newLines: typeof linePositions = [];

        Object.entries(matches).forEach(([leftId, rightWord], idx) => {
            const leftEl  = leftRefs.current[leftId];
            const rightEl = rightRefs.current[rightWord];
            if (!leftEl || !rightEl) return;

            const leftRect  = leftEl.getBoundingClientRect();
            const rightRect = rightEl.getBoundingClientRect();

            const y1 = leftRect.top  + leftRect.height  / 2 - svgRect.top;
            const y2 = rightRect.top + rightRect.height / 2 - svgRect.top;

            const leftIndex = gameConfig.pairs.findIndex(p => p.id === leftId);
            const color = LINE_COLORS[leftIndex % LINE_COLORS.length];

            newLines.push({ leftId, rightWord, y1, y2, color, idx });
        });

        setLinePositions(newLines);
    }, [matches, gameConfig.pairs]);

    useEffect(() => {
        const t1 = setTimeout(recalcLines, 120);
        const t2 = setTimeout(recalcLines, 420);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [matches, lastMatchedId, recalcLines]);

    useEffect(() => {
        window.addEventListener('resize', recalcLines);
        return () => window.removeEventListener('resize', recalcLines);
    }, [recalcLines]);

    // ─── CONFETTI ─────────────────────────────────────────────────────────────
    const triggerConfetti = useCallback(() => {
        const colors = ['#4A4DC9', '#FF7212', '#533086', '#FC9145', '#C1C1EA', '#FFF3E4', '#10b981', '#f59e0b'];
        const items = Array.from({ length: 38 }, (_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 100,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 2 + Math.random() * 3,
            size: 4 + Math.random() * 7,
        }));
        setConfetti(items);
        setTimeout(() => setConfetti([]), 3600);
    }, []);

    // ─── MATCH LOGIC ──────────────────────────────────────────────────────────
    const handleLeftClick = useCallback((leftId: string) => {
        if (matches[leftId]) return;
        setLastMatchedId(null);
        setSelectedLeft(prev => prev === leftId ? null : leftId);
        setTimeout(recalcLines, 120);
        setTimeout(recalcLines, 420);
    }, [matches, recalcLines]);

    const handleRightClick = useCallback((rightWord: string) => {
        if (!selectedLeft) return;
        if (Object.values(matches).includes(rightWord)) return;

        setAttempts(prev => prev + 1);
        const pair = gameConfig.pairs.find(p => p.id === selectedLeft);
        if (!pair) return;

        if (pair.right === rightWord) {
            setCorrectAnimating(selectedLeft);
            const newMatches = { ...matches, [selectedLeft]: rightWord };
            setMatches(newMatches);
            setScore(prev => prev + 1);
            setPulseScore(true);
            setLastMatchedId(selectedLeft);
            setTimeout(() => setPulseScore(false), 600);

            setTimeout(() => {
                setCorrectAnimating(null);
                setSelectedLeft(null);
                if (Object.keys(newMatches).length === gameConfig.pairs.length) {
                    setTimeout(() => { setShowSummary(true); triggerConfetti(); }, 500);
                }
            }, 700);
        } else {
            setWrongPair({ leftId: selectedLeft, rightWord });
            setShakeRight(rightWord);
            setTimeout(() => { setWrongPair(null); setShakeRight(null); }, 600);
        }
    }, [selectedLeft, matches, gameConfig.pairs, triggerConfetti]);

    const handleReset = useCallback(() => {
        setMatches({});
        setSelectedLeft(null);
        setWrongPair(null);
        setCorrectAnimating(null);
        setShowSummary(false);
        setScore(0);
        setAttempts(0);
        setLinePositions([]);
        setLastMatchedId(null);
    }, []);

    useEffect(() => {
        if (setStepDetails) {
            setStepDetails({ currentStep: 1, totalSteps: 1, isPaused: true, currentMode: 'practice' });
        }
    }, [setStepDetails]);

    // ─── DERIVED ──────────────────────────────────────────────────────────────
    const isLeftMatched  = (id: string)   => !!matches[id];
    const isRightMatched = (word: string) => Object.values(matches).includes(word);
    const matchedCount = Object.keys(matches).length;
    const totalCount   = gameConfig.pairs.length;

    // ─── SUMMARY CARD ─────────────────────────────────────────────────────────
    const renderSummary = () => (
        <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-start',
            background: 'linear-gradient(135deg, #4A4DC9 0%, #533086 50%, #FF7212 100%)',
            borderRadius: 20, zIndex: 20,
            animation: 'cpgSlideUp 0.6s ease-out',
            padding: '24px 20px', overflowY: 'auto',
        }}>
            {confetti.map(c => (
                <div key={c.id} style={{
                    position: 'absolute', left: `${c.x}%`, top: 0,
                    width: `${c.size}px`, height: `${c.size}px`,
                    backgroundColor: c.color,
                    borderRadius: c.id % 2 === 0 ? '50%' : '3px',
                    animation: `cpgConfettiFall ${c.speed}s ease-in forwards`,
                    zIndex: 25, pointerEvents: 'none',
                }} />
            ))}

            <div style={{ animation: 'cpgStarSpin 0.8s ease-out', marginBottom: 8 }}>
                <TrophyIcon size={48} color="#FFF3E4" />
            </div>

            <h2 style={{
                fontFamily: "'Poppins', sans-serif", fontSize: 22, fontWeight: 800,
                color: '#FFF3E4', margin: '0 0 4px',
                animation: 'cpgFadeInUp 0.5s ease-out 0.2s both', textAlign: 'center',
            }}>
                All Opposites Matched! 🎉
            </h2>
            <p style={{
                fontFamily: "'Poppins', sans-serif", fontSize: 13, color: '#C1C1EA',
                margin: '0 0 18px',
                animation: 'cpgFadeInUp 0.5s ease-out 0.3s both',
            }}>
                Score: {score}/{totalCount} &bull; Attempts: {attempts}
            </p>

            {/* Pair summary grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10, width: '100%', maxWidth: 600,
                animation: 'cpgFadeInUp 0.5s ease-out 0.4s both',
            }}>
                {gameConfig.pairs.map((pair, i) => (
                    <div key={pair.id} style={{
                        background: 'rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 14, padding: '12px 14px',
                        border: '1.5px solid rgba(255,255,255,0.18)',
                        animation: `cpgFadeInUp 0.35s ease-out ${0.45 + i * 0.07}s both`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                            <span style={{
                                background: LINE_COLORS[i % LINE_COLORS.length],
                                color: '#fff', fontSize: 11, fontWeight: 700,
                                padding: '2px 10px', borderRadius: 6,
                                fontFamily: "'Poppins', sans-serif",
                            }}>{pair.left}</span>
                            {/* Opposite badge between the two words */}
                            <span style={{
                                fontSize: 9, fontWeight: 700,
                                color: 'rgba(255,255,255,0.9)',
                                background: 'rgba(255,255,255,0.15)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                padding: '1px 6px', borderRadius: 4,
                                letterSpacing: '0.5px', textTransform: 'uppercase',
                            }}>opposite</span>
                            <span style={{
                                background: 'rgba(255,255,255,0.18)',
                                color: '#FFF3E4', fontSize: 11, fontWeight: 700,
                                padding: '2px 10px', borderRadius: 6,
                                fontFamily: "'Poppins', sans-serif",
                            }}>{pair.right}</span>
                        </div>
                        <p style={{
                            margin: 0, fontSize: 10,
                            color: 'rgba(255,255,255,0.68)',
                            fontFamily: "'Poppins', sans-serif",
                            lineHeight: 1.55, fontStyle: 'italic',
                        }}>
                            💡 {pair.reason}
                        </p>
                    </div>
                ))}
            </div>

            <button
                onClick={handleReset}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.22)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
                style={{
                    marginTop: 18, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 26px', borderRadius: 12,
                    border: '2px solid #FFF3E4', background: 'transparent',
                    color: '#FFF3E4', fontFamily: "'Poppins', sans-serif",
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    animation: 'cpgFadeInUp 0.5s ease-out 0.75s both',
                }}
            >
                <RotateCcw size={14} /> Play Again
            </button>
        </div>
    );

    // ─── MAIN RENDER ──────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            style={{
                width: `${config.width}px`, maxWidth: '100%',
                fontFamily: "'Poppins', sans-serif",
                background: '#F5F5F5',
                borderRadius: 20, overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(74,77,201,0.12)',
                position: 'relative', display: 'flex', flexDirection: 'column',
            }}
        >

            {/* ══ HEADER ════════════════════════════════════════════════════════ */}
            <div style={{
                background: 'linear-gradient(135deg, #4A4DC9 0%, #533086 100%)',
                padding: '14px 18px',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                animation: mounted ? 'cpgFadeInUp 0.4s ease-out' : 'none',
            }}>
                <div style={{ flex: '1 1 180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <h1 style={{
                            margin: 0, fontSize: 16, fontWeight: 700,
                            color: '#FFF3E4', lineHeight: 1.3,
                        }}>
                            {gameConfig.title}
                        </h1>
                        {/* Opposite badge next to title */}
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'rgba(255, 114, 18, 0.25)',
                            border: '1.5px solid rgba(252,145,69,0.5)',
                            borderRadius: 6, padding: '2px 7px',
                            fontSize: 10, fontWeight: 700, color: '#FC9145',
                            letterSpacing: '0.4px', textTransform: 'uppercase',
                            flexShrink: 0,
                            animation: 'cpgOppositeGlow 2.5s ease-in-out infinite',
                        }}>
                            <OppositeIcon size={11} color="#FC9145" />
                            opposites
                        </span>
                    </div>
                    <p style={{
                        margin: 0, fontSize: 11,
                        color: '#C1C1EA', fontWeight: 400,
                    }}>
                        {gameConfig.subtitle}
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Score pill */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: 10, padding: '5px 12px',
                    }}>
                        <Star size={14} color="#FC9145" fill="#FC9145" />
                        <span style={{
                            fontSize: 14, fontWeight: 700, color: '#FFF3E4',
                            minWidth: 28, textAlign: 'center',
                            animation: pulseScore ? 'cpgScorePulse 0.5s ease-out' : 'none',
                        }}>
                            {score}/{totalCount}
                        </span>
                    </div>

                    {/* Reset */}
                    <button
                        onClick={handleReset}
                        title="Reset"
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                            e.currentTarget.style.transform = 'rotate(-90deg)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.transform = 'rotate(0deg)';
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: 9,
                            border: '1.5px solid rgba(255,255,255,0.3)',
                            background: 'transparent', color: '#C1C1EA',
                            cursor: 'pointer', transition: 'all 0.3s ease',
                        }}
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            {/* ══ INSTRUCTIONS BANNER ═══════════════════════════════════════════ */}
            <div style={{
                background: 'linear-gradient(90deg, #FFF3E4, #EEEEFF)',
                borderBottom: '1.5px solid #EBEBEB',
                padding: '8px 18px',
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                animation: mounted ? 'cpgFadeInUp 0.4s ease-out 0.1s both' : 'none',
            }}>
                {/* Left word pill example */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        background: '#4A4DC9', color: '#fff',
                        fontSize: 10, fontWeight: 700, padding: '3px 9px',
                        borderRadius: 6, fontFamily: "'Poppins', sans-serif",
                    }}>Hard</span>
                    <span style={{
                        fontSize: 11, fontWeight: 700, color: '#FF7212',
                        display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                        <OppositeIcon size={12} color="#FF7212" />
                        is the opposite of
                    </span>
                    <span style={{
                        background: '#EBEBEB', color: '#333',
                        fontSize: 10, fontWeight: 700, padding: '3px 9px',
                        borderRadius: 6, fontFamily: "'Poppins', sans-serif",
                    }}>Soft</span>
                </div>
                <span style={{
                    fontSize: 10, color: '#888', fontWeight: 500,
                    paddingLeft: 6, borderLeft: '1.5px solid #DDD',
                }}>
                    ← Find all 6 opposite pairs like this!
                </span>
            </div>

            {/* ══ PROGRESS BAR ══════════════════════════════════════════════════ */}
            <div style={{ height: 3, background: '#EBEBEB', overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: `${(matchedCount / totalCount) * 100}%`,
                    background: 'linear-gradient(90deg, #4A4DC9, #FF7212)',
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>

            {/* ══ MATCHING AREA ═════════════════════════════════════════════════ */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

                {/* Column headers */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 10 }}>
                    <div style={{
                        flex: '1 1 0', fontSize: 10, fontWeight: 700,
                        color: '#4E4E4E', textTransform: 'uppercase', letterSpacing: '1px',
                        paddingBottom: 6, borderBottom: '2px solid #EBEBEB',
                        animation: mounted ? 'cpgFadeInLeft 0.3s ease-out' : 'none',
                    }}>
                        Column I — Properties
                    </div>
                    <div style={{ width: 72, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6 }}>
                        <span style={{ fontSize: 9, color: '#CACACA', fontWeight: 600, letterSpacing: '0.3px' }}>opposites</span>
                    </div>
                    <div style={{
                        flex: '1 1 0', fontSize: 10, fontWeight: 700,
                        color: '#4E4E4E', textTransform: 'uppercase', letterSpacing: '1px',
                        paddingBottom: 6, borderBottom: '2px solid #EBEBEB',
                        animation: mounted ? 'cpgFadeInRight 0.3s ease-out' : 'none',
                    }}>
                        Column II — Opposite Properties
                    </div>
                </div>

                {/* Three-column layout */}
                <div style={{ display: 'flex', gap: 0, position: 'relative' }}>

                    {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
                    <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {gameConfig.pairs.map((pair, index) => {
                            const matched      = isLeftMatched(pair.id);
                            const isSelected   = selectedLeft === pair.id;
                            const isWrong      = wrongPair?.leftId === pair.id;
                            const isCorrectAn  = correctAnimating === pair.id;
                            const matchedWord  = matched ? matches[pair.id] : null;
                            const chipColor    = LINE_COLORS[index % LINE_COLORS.length];

                            let borderColor = '#E0E0E0';
                            if (isCorrectAn)               borderColor = '#10b981';
                            else if (isWrong)              borderColor = '#ef4444';
                            else if (matched)              borderColor = '#10b98160';
                            else if (isSelected)           borderColor = chipColor;
                            else if (hoverLeft === pair.id) borderColor = `${chipColor}50`;

                            let bg = '#ffffff';
                            if (matched)         bg = '#f0fdf4';
                            else if (isSelected) bg = `${chipColor}08`;

                            let anim = mounted
                                ? `cpgFadeInLeft 0.35s ease-out ${index * 0.07}s both`
                                : 'none';
                            if (isCorrectAn)                 anim = 'cpgCorrectFlash 0.6s ease-out';
                            else if (isSelected && !matched) anim = 'cpgGlowPulse 2s ease-in-out infinite';

                            return (
                                <div
                                    key={pair.id}
                                    ref={el => { leftRefs.current[pair.id] = el; }}
                                    onClick={() => !matched && handleLeftClick(pair.id)}
                                    onMouseEnter={() => !matched && setHoverLeft(pair.id)}
                                    onMouseLeave={() => setHoverLeft(null)}
                                    style={{
                                        padding: '10px 12px', borderRadius: 12,
                                        border: `2px solid ${borderColor}`,
                                        background: bg,
                                        cursor: matched ? 'default' : 'pointer',
                                        transition: 'all 0.25s ease',
                                        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                                        boxShadow: isSelected
                                            ? `0 2px 10px ${chipColor}18`
                                            : '0 1px 3px rgba(0,0,0,0.04)',
                                        animation: anim,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            minWidth: 30, height: 22, borderRadius: 6,
                                            background: matched ? '#10b981' : chipColor,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
                                            transition: 'all 0.3s ease',
                                        }}>
                                            {matched ? <Check size={12} /> : LEFT_LABELS[index]}
                                        </div>
                                        <div style={{
                                            fontSize: 13, fontWeight: 600,
                                            color: matched ? '#059669' : '#333',
                                        }}>
                                            {pair.left}
                                        </div>
                                    </div>

                                    {/* Matched tag — only on last matched chip */}
                                    {matched && matchedWord && pair.id === lastMatchedId && (
                                        <div style={{
                                            marginTop: 5, marginLeft: 38,
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '2px 8px', borderRadius: 6,
                                            background: '#10b981', color: '#fff',
                                            fontSize: 10, fontWeight: 700,
                                            animation: 'cpgPopIn 0.35s ease-out',
                                        }}>
                                            <OppositeIcon size={9} color="#fff" />
                                            opposite: {matchedWord}
                                        </div>
                                    )}

                                    {/* Reason — only on last matched chip */}
                                    {matched && pair.id === lastMatchedId && (
                                        <div style={{
                                            marginTop: 6, marginLeft: 38,
                                            fontSize: 10, color: '#059669',
                                            fontStyle: 'italic', lineHeight: 1.5,
                                            animation: 'cpgFadeInUp 0.4s ease-out 0.2s both',
                                        }}>
                                            💡 {pair.reason}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── CENTER SVG LINES ─────────────────────────────────────── */}
                    <div ref={svgAreaRef} style={{ width: 72, flexShrink: 0, position: 'relative' }}>
                        <svg
                            width="72"
                            height="100%"
                            style={{
                                position: 'absolute', top: 0, left: 0,
                                width: 72, height: '100%',
                                overflow: 'visible', pointerEvents: 'none',
                            }}
                        >
                            {linePositions.map((line, i) => {
                                const midX = 36;
                                const d = `M 0 ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, 72 ${line.y2}`;
                                return (
                                    <path
                                        key={`${line.leftId}-${line.rightWord}`}
                                        d={d}
                                        fill="none"
                                        stroke={line.color}
                                        strokeWidth={2.5}
                                        strokeLinecap="round"
                                        strokeDasharray="500"
                                        style={{ animation: `cpgDrawLine 0.6s ease-out ${i * 0.08}s both` }}
                                    />
                                );
                            })}
                            {linePositions.map(line => (
                                <React.Fragment key={`dots-${line.leftId}`}>
                                    <circle cx="0"  cy={line.y1} r="3.5" fill={line.color}
                                        style={{ animation: 'cpgLinePop 0.3s ease-out 0.4s both' }} />
                                    <circle cx="72" cy={line.y2} r="3.5" fill={line.color}
                                        style={{ animation: 'cpgLinePop 0.3s ease-out 0.5s both' }} />
                                </React.Fragment>
                            ))}
                        </svg>
                    </div>

                    {/* ── RIGHT COLUMN ─────────────────────────────────────────── */}
                    <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {rightColumn.map((pair, index) => {
                            const word         = pair.right;
                            const matched      = isRightMatched(word);
                            const isWrongHit   = wrongPair?.rightWord === word;
                            const isShaking    = shakeRight === word;
                            const hasSelection = !!selectedLeft;

                            const matchedLeftId    = Object.entries(matches).find(([, rw]) => rw === word)?.[0];
                            const matchedLeftIndex = matchedLeftId
                                ? gameConfig.pairs.findIndex(p => p.id === matchedLeftId)
                                : -1;

                            let borderColor = '#E0E0E0';
                            if (isWrongHit)                              borderColor = '#ef4444';
                            else if (matched)                            borderColor = '#10b98160';
                            else if (hasSelection && hoverRight === word) borderColor = '#4A4DC9';

                            let bg = '#ffffff';
                            if (matched)                                  bg = '#f0fdf4';
                            else if (isWrongHit)                          bg = '#fef2f2';
                            else if (hasSelection && hoverRight === word)  bg = '#f8f7ff';

                            let anim = mounted
                                ? `cpgFadeInRight 0.35s ease-out ${index * 0.07 + 0.04}s both`
                                : 'none';
                            if (isShaking) anim = 'cpgShake 0.45s ease-out';

                            return (
                                <div
                                    key={word}
                                    ref={el => { rightRefs.current[word] = el; }}
                                    onClick={() => handleRightClick(word)}
                                    onMouseEnter={() => !matched && setHoverRight(word)}
                                    onMouseLeave={() => setHoverRight(null)}
                                    style={{
                                        padding: '10px 12px', borderRadius: 12,
                                        border: `2px solid ${borderColor}`,
                                        background: bg,
                                        cursor: hasSelection && !matched ? 'pointer' : 'default',
                                        transition: 'all 0.25s ease',
                                        transform: hasSelection && hoverRight === word && !matched
                                            ? 'scale(1.01)' : 'scale(1)',
                                        boxShadow: hasSelection && hoverRight === word && !matched
                                            ? '0 2px 10px rgba(74,77,201,0.10)'
                                            : '0 1px 3px rgba(0,0,0,0.04)',
                                        opacity: !hasSelection && !matched ? 0.55 : 1,
                                        animation: anim,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            minWidth: 30, height: 22, borderRadius: 6,
                                            background: matched ? '#10b981' : '#EBEBEB',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: matched ? '#fff' : '#4E4E4E',
                                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                                            transition: 'all 0.3s ease',
                                        }}>
                                            {matched ? <Check size={12} /> : RIGHT_LABELS[index]}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 13, fontWeight: 600,
                                                color: matched ? '#059669' : '#333',
                                                display: 'flex', alignItems: 'center',
                                                gap: 6, flexWrap: 'wrap',
                                            }}>
                                                {word}
                                                {matched && matchedLeftIndex >= 0 && (
                                                    <span style={{
                                                        fontSize: 9, fontWeight: 600, color: '#10b981',
                                                        background: '#d1fae5', padding: '1px 5px', borderRadius: 4,
                                                    }}>
                                                        ↔ opposite of {LEFT_LABELS[matchedLeftIndex]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ══ HINT BAR ══════════════════════════════════════════════════════ */}
            {!showSummary && (
                <div style={{
                    padding: '8px 16px',
                    background: selectedLeft
                        ? 'linear-gradient(90deg, #4A4DC906, #FF721206)'
                        : '#fafafa',
                    borderTop: '1px solid #EBEBEB',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6,
                    flexShrink: 0,
                }}>
                    {selectedLeft
                        ? <ArrowRightIcon size={13} color="#FF7212" />
                        : <OppositeIcon size={13} color="#CACACA" />
                    }
                    <span style={{
                        fontSize: 11, fontWeight: 500,
                        color: selectedLeft ? '#4A4DC9' : '#888',
                    }}>
                        {selectedLeft
                            ? `Now tap its OPPOSITE property on the right →`
                            : matchedCount === 0
                                ? 'Tap a property on the left, then find its opposite on the right!'
                                : `${matchedCount} of ${totalCount} opposites matched`
                        }
                    </span>
                </div>
            )}

            {/* ══ SUMMARY OVERLAY ═══════════════════════════════════════════════ */}
            {showSummary && renderSummary()}

        </div>
    );
};

export default CompanionPairGame;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════