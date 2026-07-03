// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: chapter_quiz.tsx
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Check, RotateCcw, Star, Clock, BookOpen, ChevronRight, AlertCircle } from 'lucide-react';

// ─── Custom inline icons ──────────────────────────────────────────────────
const TrophyIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);
const XIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="m18 6-12 12" /><path d="m6 6 12 12" />
    </svg>
);

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';

interface StepDetails {
    currentStep: number; totalSteps: number; isPaused: boolean; currentMode: ModeType;
}

interface QuizOption { id: string; text: string; }

interface QuizQuestion {
    id: string;
    topic: string;
    question: string;
    options: QuizOption[];
    correctId: string;  // deliberately spread across a / b / c / d
    reason: string;
    hint: string;
}

interface QuizAdditionalProps {
    questions?: QuizQuestion[];
    title?: string;
    subtitle?: string;
    showTimer?: boolean;
}

interface ChapterQuizProps {
    props?: {
        width?: number;
        height?: number;
        themeColor?: string;
        darkMode?: boolean;
        additionalProps?: QuizAdditionalProps;
    };
    setStepDetails?: (s: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (v: boolean) => void;
}

// ==================== DEFAULT QUESTIONS ====================
// Correct answers deliberately spread: a, d, a, c, b, d, a, c, d, b
// ─────────────────────────────────────────────────────────

const DEFAULT_QUESTIONS: QuizQuestion[] = [
    // Q1 — correct: a
    {
        id: 'q1', topic: 'materials',
        question: 'Which statement best defines a "material"?',
        options: [
            { id: 'a', text: 'Any substance used to create or make an object' },
            { id: 'b', text: 'Only metals and plastics used in construction' },
            { id: 'c', text: 'Any living organism found in the environment' },
            { id: 'd', text: 'Any object that has a fixed and rigid shape' },
        ],
        correctId: 'a',
        reason: 'A material is any substance used to create objects — wood, glass, clay, metal, plastic, and more all qualify.',
        hint: 'Think about what ALL objects — from a notebook to a bridge — are made FROM.',
    },
    // Q2 — correct: d
    {
        id: 'q2', topic: 'lustre',
        question: 'Paper, wood, rubber, and jute are examples of which type of material?',
        options: [
            { id: 'a', text: 'Lustrous materials — they have a shiny surface' },
            { id: 'b', text: 'Transparent materials — light passes through them' },
            { id: 'c', text: 'Soluble materials — they dissolve in water easily' },
            { id: 'd', text: 'Non-lustrous materials — they do not have a shiny surface' },
        ],
        correctId: 'd',
        reason: 'Paper, wood, rubber, and jute are non-lustrous — their surfaces do not shine when light falls on them.',
        hint: 'The opposite of lustrous. These materials have no natural shine or metallic glow.',
    },
    // Q3 — correct: a
    {
        id: 'q3', topic: 'lustre',
        question: '"All that glitters is not gold." What does this mean in the context of lustre?',
        options: [
            { id: 'a', text: 'Not all shiny materials are metals; some are coated with plastic or wax' },
            { id: 'b', text: 'All metals lose their lustre when exposed to air and moisture' },
            { id: 'c', text: 'Gold is the only truly lustrous metal in nature' },
            { id: 'd', text: 'Only freshly cut wood can appear shiny like a metal' },
        ],
        correctId: 'a',
        reason: 'Some non-metals are polished or coated with plastic or wax to appear shiny — lustre alone does not prove a material is a metal.',
        hint: 'The saying warns us not to judge by appearance alone. Can non-metals look shiny too?',
    },
    // Q4 — correct: c
    {
        id: 'q4', topic: 'transparency',
        question: "Sheeta's brother watches the hide-and-seek game through a glass window. Why can he see clearly?",
        options: [
            { id: 'a', text: 'Glass is opaque — it reflects light so images appear on it' },
            { id: 'b', text: 'Glass is translucent — shapes are visible but blurry' },
            { id: 'c', text: 'Glass is transparent — objects can be seen clearly through it' },
            { id: 'd', text: 'Glass is lustrous — its shiny surface acts like a mirror' },
        ],
        correctId: 'c',
        reason: 'Glass is transparent — it allows light to pass through completely, so objects on the other side are seen clearly.',
        hint: 'Transparent materials let ALL light through with no distortion — you can see details clearly.',
    },
    // Q5 — correct: b
    {
        id: 'q5', topic: 'transparency',
        question: 'Which combination correctly classifies these three objects?',
        options: [
            { id: 'a', text: 'Eraser = transparent · Frosted glass = opaque · Clear glass = translucent' },
            { id: 'b', text: 'Eraser = opaque · Frosted glass = translucent · Clear glass = transparent' },
            { id: 'c', text: 'Eraser = translucent · Frosted glass = transparent · Clear glass = opaque' },
            { id: 'd', text: 'Eraser = lustrous · Frosted glass = soluble · Clear glass = hard' },
        ],
        correctId: 'b',
        reason: 'Eraser (opaque — no light through), frosted glass (translucent — blurry vision), clear glass (transparent — clear vision).',
        hint: 'Opaque = no vision · Translucent = blurry vision · Transparent = clear vision. Match each material.',
    },
    // Q6 — correct: d
    {
        id: 'q6', topic: 'solubility',
        question: "Ghulan's mother prepares shikanji by mixing sugar, salt, and lemon juice in water. What happens to the sugar and salt?",
        options: [
            { id: 'a', text: 'They remain as visible particles at the bottom — they are insoluble' },
            { id: 'b', text: 'They float on the surface and separate from water over time' },
            { id: 'c', text: 'They turn the water into a solid after a few minutes' },
            { id: 'd', text: 'They dissolve completely in water — they are soluble' },
        ],
        correctId: 'd',
        reason: 'Sugar and salt are soluble — they dissolve completely in water and disappear, which is why shikanji tastes sweet and salty.',
        hint: 'When something "disappears" after being stirred in water, it has dissolved — the material is soluble.',
    },
    // Q7 — correct: a
    {
        id: 'q7', topic: 'solubility',
        question: 'After stirring sand in water for a long time, you notice it settles at the bottom. Sand is:',
        options: [
            { id: 'a', text: 'Insoluble — it does not dissolve in water even after prolonged stirring' },
            { id: 'b', text: 'Soluble — it dissolves slowly and settles only when cold' },
            { id: 'c', text: 'Translucent — light passes through sand particles in water' },
            { id: 'd', text: 'Lustrous — sand particles reflect light from below the water' },
        ],
        correctId: 'a',
        reason: 'Sand is insoluble in water — it does not dissolve regardless of how long or hard you stir it.',
        hint: 'Insoluble materials NEVER disappear in water. Settling at the bottom is the tell-tale sign.',
    },
    // Q8 — correct: c
    {
        id: 'q8', topic: 'mass',
        question: 'Three identical cups are half-filled — A with water, B with sand, C with pebbles. C is heaviest. This shows that different materials have different:',
        options: [
            { id: 'a', text: 'Volumes — pebbles occupy more space than water in the same cup' },
            { id: 'b', text: 'Lustre — pebbles reflect more light than sand or water' },
            { id: 'c', text: 'Mass — pebbles contain more matter per unit volume' },
            { id: 'd', text: 'Transparency — pebbles allow less light through than water' },
        ],
        correctId: 'c',
        reason: 'Mass is the quantity of matter. The same volume of different materials can have very different masses — pebbles have the greatest mass here.',
        hint: 'The property measured in grams or kilograms that tells us HOW MUCH matter is in an object.',
    },
    // Q9 — correct: d
    {
        id: 'q9', topic: 'volume',
        question: 'Madam Vidya pours water into two identical glass tumblers. One is half-filled, the other nearly full. What differs between them?',
        options: [
            { id: 'a', text: 'Mass of the glass tumblers — one tumbler is heavier than the other' },
            { id: 'b', text: 'Lustre of the water — more water makes it shinier' },
            { id: 'c', text: 'Solubility — more water means higher solubility' },
            { id: 'd', text: 'Volume of water — each tumbler holds a different amount of water' },
        ],
        correctId: 'd',
        reason: 'Volume is the space occupied by matter. The two tumblers hold different volumes of water — one takes up more space than the other.',
        hint: 'Volume = space occupied. The tumblers are identical; what differs is how much SPACE the water takes up.',
    },
    // Q10 — correct: b
    {
        id: 'q10', topic: 'guṇa',
        question: 'Ayurveda describes physical matter using 10 pairs of opposite guṇas (properties). Which option lists a TRUE opposite pair from the Aṣhṭānga Hṛidaya?',
        options: [
            { id: 'a', text: 'Guru (heavy) and Snigdha (unctuous) — they are opposites' },
            { id: 'b', text: 'Mṛidu (soft) and Kaṭhina (hard) — they are opposites' },
            { id: 'c', text: 'Hima (cold) and Manda (slow) — they are opposites' },
            { id: 'd', text: 'Sūkṣhma (subtle) and Sthira (stable) — they are opposites' },
        ],
        correctId: 'b',
        reason: 'Mṛidu (soft) and Kaṭhina (hard) are one of the 10 true opposite guṇa pairs in Ayurvedic classification — directly mirroring hard/soft from Chapter 6.',
        hint: 'Look for two words that are direct opposites in meaning. Which pair is clearly one extreme vs the other?',
    },
];

// ==================== HELPERS ====================

const TOPIC_LABELS: Record<string, string> = {
    materials:    '📦 Materials',
    lustre:       '✨ Lustre',
    transparency: '🔍 Transparency',
    solubility:   '💧 Solubility',
    mass:         '⚖️ Mass',
    volume:       '🧪 Volume',
    'guṇa':       '🕉️ Guṇa Pairs',
};

const TOPIC_COLORS: Record<string, string> = {
    materials:    '#4A4DC9',
    lustre:       '#FC9145',
    transparency: '#06b6d4',
    solubility:   '#10b981',
    mass:         '#533086',
    volume:       '#FF7212',
    'guṇa':       '#8b5cf6',
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

// ==================== MAIN COMPONENT ====================

const ChapterQuiz: React.FC<ChapterQuizProps> = ({ props = {}, setStepDetails }) => {

    const config = useMemo(() => ({
        width:      props.width      ?? 800,
        themeColor: props.themeColor ?? '#4A4DC9',
    }), [props]);

    const ap = props.additionalProps ?? {};
    const quizConfig = useMemo(() => ({
        questions:  ap.questions  ?? DEFAULT_QUESTIONS,
        title:      ap.title      ?? 'End-of-Chapter Quiz',
        subtitle:   ap.subtitle   ?? 'Answer each question — read the reason on every correct answer.',
        showTimer:  ap.showTimer  ?? true,
    }), [ap]);

    const TOTAL = quizConfig.questions.length;

    // ─── STATE ────────────────────────────────────────────────────────────────
    const [phase, setPhase]           = useState<'idle' | 'quiz' | 'summary'>('idle');
    const [idx, setIdx]               = useState(0);
    const [lockedId, setLockedId]     = useState<string | null>(null);
    const [wrongId, setWrongId]       = useState<string | null>(null);
    const [answers, setAnswers]       = useState<Record<string, string>>({});
    const [elapsed, setElapsed]       = useState(0);
    const [mounted, setMounted]       = useState(false);
    const [confetti, setConfetti]     = useState<{ id: number; x: number; color: string; speed: number; size: number }[]>([]);
    const [qAnim, setQAnim]           = useState(false);
    const [pulseNext, setPulseNext]   = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── INJECT KEYFRAMES ─────────────────────────────────────────────────────
    useEffect(() => {
        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
            @keyframes cqFadeUp   { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
            @keyframes cqFadeDown { from{opacity:0;transform:translateY(-14px);} to{opacity:1;transform:translateY(0);} }
            @keyframes cqPopIn    { 0%{transform:scale(0.75);opacity:0;} 65%{transform:scale(1.05);} 100%{transform:scale(1);opacity:1;} }
            @keyframes cqShake    { 0%,100%{transform:translateX(0);} 18%,54%,82%{transform:translateX(-5px);} 36%,70%{transform:translateX(5px);} }
            @keyframes cqRing     { 0%{box-shadow:0 0 0 0 rgba(16,185,129,0.5);} 70%{box-shadow:0 0 0 8px rgba(16,185,129,0);} 100%{box-shadow:none;} }
            @keyframes cqSlideQ   { from{opacity:0;transform:translateX(22px);} to{opacity:1;transform:translateX(0);} }
            @keyframes cqReason   { from{opacity:0;transform:translateY(-6px) scaleY(0.88);} to{opacity:1;transform:translateY(0) scaleY(1);} }
            @keyframes cqConfetti { 0%{transform:translateY(0) rotate(0deg);opacity:1;} 100%{transform:translateY(400px) rotate(720deg);opacity:0;} }
            @keyframes cqSlideUp  { from{opacity:0;transform:translateY(30px) scale(0.97);} to{opacity:1;transform:translateY(0) scale(1);} }
            @keyframes cqSpin     { from{transform:rotate(0deg) scale(0);opacity:0;} to{transform:rotate(360deg) scale(1);opacity:1;} }
            @keyframes cqPulse    { 0%,100%{transform:scale(1);} 50%{transform:scale(1.04);} }
            @keyframes cqFloat    { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-5px);} }
            @keyframes cqDotPop   { 0%{transform:scaleX(0.6);} 60%{transform:scaleX(1.15);} 100%{transform:scaleX(1);} }
        `;
        const el = document.createElement('style');
        el.id = 'cq-kf-v2'; el.textContent = css;
        document.head.appendChild(el);
        return () => { document.getElementById('cq-kf-v2')?.remove(); };
    }, []);

    useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

    useEffect(() => {
        if (setStepDetails) setStepDetails({ currentStep: idx + 1, totalSteps: TOTAL, isPaused: phase !== 'quiz', currentMode: 'practice' });
    }, [setStepDetails, idx, TOTAL, phase]);

    // ─── TIMER ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== 'quiz') return;
        timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase]);

    // ─── CONFETTI ─────────────────────────────────────────────────────────────
    const triggerConfetti = useCallback(() => {
        const colors = ['#4A4DC9', '#FF7212', '#533086', '#FC9145', '#C1C1EA', '#10b981', '#f59e0b'];
        setConfetti(Array.from({ length: 32 }, (_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 100,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 2 + Math.random() * 2.5,
            size: 5 + Math.random() * 6,
        })));
        setTimeout(() => setConfetti([]), 3000);
    }, []);

    // ─── ACTIONS ──────────────────────────────────────────────────────────────
    const startQuiz = useCallback(() => {
        setIdx(0); setLockedId(null); setWrongId(null);
        setAnswers({}); setElapsed(0); setPulseNext(false);
        setPhase('quiz');
        setQAnim(true); setTimeout(() => setQAnim(false), 400);
    }, []);

    const handleOptionTap = useCallback((optId: string) => {
        if (lockedId) return;
        const q = quizConfig.questions[idx];
        if (optId === q.correctId) {
            setLockedId(optId);
            setAnswers(prev => ({ ...prev, [q.id]: optId }));
            setPulseNext(true);
        } else {
            setWrongId(optId);
            setTimeout(() => setWrongId(null), 650);
        }
    }, [lockedId, idx, quizConfig.questions]);

    const handleNext = useCallback(() => {
        if (!lockedId) return;
        setPulseNext(false);
        const next = idx + 1;
        if (next >= TOTAL) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeout(() => { setPhase('summary'); triggerConfetti(); }, 150);
        } else {
            setIdx(next); setLockedId(null); setWrongId(null);
            setQAnim(true); setTimeout(() => setQAnim(false), 400);
        }
    }, [lockedId, idx, TOTAL, triggerConfetti]);

    const handleReset = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('idle'); setIdx(0); setLockedId(null); setWrongId(null);
        setAnswers({}); setElapsed(0); setPulseNext(false);
    }, []);

    // ─── DERIVED ──────────────────────────────────────────────────────────────
    const score = useMemo(() =>
        quizConfig.questions.filter(q => answers[q.id] === q.correctId).length
    , [quizConfig.questions, answers]);

    const weakestTopic = useMemo(() => {
        const tally: Record<string, number> = {};
        quizConfig.questions.forEach(q => {
            if (answers[q.id] !== q.correctId) tally[q.topic] = (tally[q.topic] ?? 0) + 1;
        });
        return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    }, [quizConfig.questions, answers]);

    const currentQ   = quizConfig.questions[idx];
    const isAnswered = !!lockedId;
    const topicColor = TOPIC_COLORS[currentQ?.topic] ?? '#4A4DC9';

    // ─── SUMMARY ──────────────────────────────────────────────────────────────
    const renderSummary = () => {
        const pct  = Math.round((score / TOTAL) * 100);
        const medal = pct >= 90 ? '🥇' : pct >= 70 ? '🥈' : pct >= 50 ? '🥉' : '📚';
        const msg   = pct >= 90 ? 'Outstanding!' : pct >= 70 ? 'Well done!' : pct >= 50 ? 'Good effort!' : 'Keep revising!';
        return (
            <div style={{
                width: '100%',
                background: 'linear-gradient(135deg, #4A4DC9 0%, #533086 55%, #FF7212 100%)',
                borderRadius: 20, display: 'flex', flexDirection: 'column',
                alignItems: 'center',
                padding: '24px 16px 28px',
                animation: 'cqSlideUp 0.5s ease-out',
                boxSizing: 'border-box',
            }}>
                {confetti.map(c => (
                    <div key={c.id} style={{
                        position: 'fixed', left: `${c.x}%`, top: 0,
                        width: c.size, height: c.size, backgroundColor: c.color,
                        borderRadius: c.id % 2 === 0 ? '50%' : 3,
                        animation: `cqConfetti ${c.speed}s ease-in forwards`,
                        zIndex: 30, pointerEvents: 'none',
                    }} />
                ))}

                <div style={{ animation: 'cqSpin 0.75s ease-out', marginBottom: 6 }}>
                    <TrophyIcon size={42} color="#FFF3E4" />
                </div>
                <h2 style={{
                    fontFamily: "'Poppins',sans-serif", fontWeight: 800, color: '#FFF3E4',
                    fontSize: 'clamp(17px,3.5vw,21px)', margin: '0 0 2px', textAlign: 'center',
                    animation: 'cqFadeUp 0.5s ease-out 0.2s both',
                }}>{medal} {msg}</h2>
                <p style={{
                    fontFamily: "'Poppins',sans-serif", fontSize: 11, color: '#C1C1EA',
                    margin: '0 0 12px', animation: 'cqFadeUp 0.5s ease-out 0.3s both',
                }}>Chapter 6: Materials Around Us</p>

                {/* Stat pills */}
                <div style={{
                    display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center',
                    animation: 'cqFadeUp 0.5s ease-out 0.35s both',
                }}>
                    {[
                        { label: 'Score',    val: `${score}/${TOTAL}` },
                        { label: 'Accuracy', val: `${pct}%` },
                        { label: 'Time',     val: formatTime(elapsed) },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: 'rgba(255,255,255,0.13)', borderRadius: 12, padding: '7px 16px', textAlign: 'center',
                        }}>
                            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 800, color: '#FC9145' }}>{s.val}</div>
                            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, color: '#C1C1EA' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Per-question result grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 7, width: '100%', maxWidth: 560,
                    animation: 'cqFadeUp 0.5s ease-out 0.4s both',
                }}>
                    {quizConfig.questions.map((q, i) => {
                        const ok = answers[q.id] === q.correctId;
                        const tc = TOPIC_COLORS[q.topic] ?? '#4A4DC9';
                        return (
                            <div key={q.id} style={{
                                background: 'rgba(255,255,255,0.09)', borderRadius: 10, padding: '9px 11px',
                                border: `1.5px solid ${ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                                display: 'flex', gap: 9, alignItems: 'flex-start',
                                animation: `cqFadeUp 0.35s ease-out ${0.42 + i * 0.04}s both`,
                            }}>
                                <div style={{
                                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                    background: ok ? '#10b981' : '#ef4444',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                                }}>
                                    {ok ? <Check size={11} color="#fff" strokeWidth={3} /> : <XIcon size={11} color="#fff" />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, color: '#fff',
                                            background: tc, borderRadius: 5, padding: '1px 5px',
                                            fontFamily: "'Poppins',sans-serif",
                                        }}>{TOPIC_LABELS[q.topic] ?? q.topic}</span>
                                        <span style={{ fontSize: 9, color: '#C1C1EA', fontFamily: "'Poppins',sans-serif" }}>Q{i + 1}</span>
                                    </div>
                                    <div style={{
                                        fontSize: 10, color: 'rgba(255,255,255,0.72)',
                                        fontFamily: "'Poppins',sans-serif", lineHeight: 1.45,
                                    }}>
                                        {ok ? `✓ ${q.reason}` : `✗ ${q.hint}`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Weakest topic */}
                {weakestTopic && (
                    <div style={{
                        marginTop: 10, padding: '9px 16px',
                        background: 'rgba(255,114,18,0.16)', borderRadius: 10,
                        border: '1.5px solid rgba(255,114,18,0.38)',
                        display: 'flex', alignItems: 'center', gap: 8,
                        maxWidth: 480, width: '100%',
                        animation: 'cqFadeUp 0.5s ease-out 0.78s both',
                    }}>
                        <AlertCircle size={15} color="#FC9145" />
                        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, color: '#FFF3E4', fontWeight: 500 }}>
                            Revise: <strong>{TOPIC_LABELS[weakestTopic] ?? weakestTopic}</strong> — most marks lost here.
                        </span>
                    </div>
                )}

                <button
                    onClick={handleReset}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                    style={{
                        marginTop: 16, display: 'flex', alignItems: 'center', gap: 7,
                        padding: '10px 28px', borderRadius: 12,
                        border: '2px solid rgba(255,255,255,0.6)',
                        background: 'rgba(255,255,255,0.15)',
                        color: '#FFF3E4', fontFamily: "'Poppins',sans-serif",
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.22s ease',
                        animation: 'cqFadeUp 0.5s ease-out 0.88s both',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <RotateCcw size={13} /> Retry Quiz
                </button>
            </div>
        );
    };

    // ─── IDLE SCREEN ──────────────────────────────────────────────────────────
    const renderIdle = () => (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px', gap: 14,
        }}>
            <div style={{ animation: mounted ? 'cqFloat 3s ease-in-out infinite' : 'none' }}>
                <BookOpen size={44} color="#4A4DC9" strokeWidth={1.5} />
            </div>

            <div style={{ textAlign: 'center', animation: mounted ? 'cqFadeUp 0.5s ease-out 0.1s both' : 'none' }}>
                <h2 style={{
                    fontFamily: "'Poppins',sans-serif", fontWeight: 800, color: '#1a1a2e',
                    fontSize: 'clamp(15px,3vw,19px)', margin: '0 0 5px',
                }}>Ready to test your knowledge?</h2>
                <p style={{
                    fontFamily: "'Poppins',sans-serif", fontSize: 'clamp(10px,1.8vw,12px)',
                    color: '#4E4E4E', margin: 0, lineHeight: 1.6,
                }}>
                    {TOTAL} questions · Materials, Lustre, Transparency, Solubility, Mass, Volume &amp; Guṇa
                </p>
            </div>

            {/* Topic chips */}
            <div style={{
                display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 440,
                animation: mounted ? 'cqFadeUp 0.5s ease-out 0.2s both' : 'none',
            }}>
                {Object.entries(TOPIC_LABELS).map(([key, label]) => (
                    <span key={key} style={{
                        background: `${TOPIC_COLORS[key]}18`,
                        border: `1.5px solid ${TOPIC_COLORS[key]}38`,
                        color: TOPIC_COLORS[key], borderRadius: 20, padding: '3px 11px',
                        fontSize: 'clamp(9px,1.4vw,11px)',
                        fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                    }}>{label}</span>
                ))}
            </div>

            <button
                onClick={startQuiz}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(74,77,201,0.38)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(74,77,201,0.25)'; }}
                style={{
                    padding: '12px 36px', borderRadius: 13,
                    background: 'linear-gradient(135deg, #4A4DC9, #533086)',
                    border: 'none', color: '#FFF3E4',
                    fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.22s ease',
                    boxShadow: '0 4px 14px rgba(74,77,201,0.25)',
                    display: 'flex', alignItems: 'center', gap: 9,
                    animation: mounted ? 'cqPopIn 0.55s ease-out 0.35s both' : 'none',
                }}
            >
                <ChevronRight size={17} color="#FC9145" /> Start Quiz
            </button>
        </div>
    );

    // ─── QUIZ SCREEN ──────────────────────────────────────────────────────────
    const renderQuiz = () => {
        const q = currentQ;
        return (
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                padding: '10px 14px 0', gap: 8, minHeight: 0,
            }}>
                {/* Topic badge + Q number */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                    animation: qAnim ? 'cqSlideQ 0.38s ease-out' : 'none',
                }}>
                    <span style={{
                        background: `${topicColor}18`, border: `1.5px solid ${topicColor}38`,
                        color: topicColor, borderRadius: 20, padding: '3px 11px',
                        fontSize: 'clamp(9px,1.4vw,11px)',
                        fontFamily: "'Poppins',sans-serif", fontWeight: 700,
                    }}>{TOPIC_LABELS[q.topic] ?? q.topic}</span>
                    <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, color: '#CACACA' }}>
                        Question {idx + 1} of {TOTAL}
                    </span>
                </div>

                {/* Question card */}
                <div style={{
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${topicColor}09, ${topicColor}04)`,
                    border: `2px solid ${topicColor}1e`,
                    padding: '11px 14px', flexShrink: 0,
                    animation: qAnim ? 'cqSlideQ 0.38s ease-out' : 'none',
                }}>
                    <p style={{
                        fontFamily: "'Poppins',sans-serif",
                        fontSize: 'clamp(12px,2.1vw,13.5px)',
                        fontWeight: 600, color: '#1a1a2e', margin: 0, lineHeight: 1.55,
                    }}>{q.question}</p>
                </div>

                {/* Options */}
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0,
                    animation: qAnim ? 'cqFadeUp 0.4s ease-out 0.05s both' : 'none',
                }}>
                    {q.options.map((opt, oi) => {
                        const isCorrectOpt = opt.id === q.correctId;
                        const isThisLocked = lockedId === opt.id;
                        const isThisWrong  = wrongId === opt.id;
                        const isLocked     = !!lockedId;

                        let border = '#E0E0E0', bg = '#fff', txtColor = '#333';
                        let anim = 'none';

                        if (isThisLocked && isCorrectOpt) {
                            border = '#10b981'; bg = '#f0fdf4'; txtColor = '#059669';
                            anim = 'cqRing 0.55s ease-out';
                        } else if (isLocked && isCorrectOpt && !isThisLocked) {
                            border = '#10b98150'; bg = '#f0fdf4'; txtColor = '#059669';
                        } else if (isThisWrong) {
                            border = '#ef4444'; bg = '#fef2f2'; txtColor = '#dc2626';
                            anim = 'cqShake 0.45s ease-out';
                        } else if (isLocked && !isCorrectOpt) {
                            border = '#EBEBEB'; bg = '#fafafa'; txtColor = '#bbb';
                        }

                        return (
                            <div
                                key={opt.id}
                                onClick={() => handleOptionTap(opt.id)}
                                onMouseEnter={e => { if (!isLocked) { (e.currentTarget as HTMLDivElement).style.borderColor = topicColor; (e.currentTarget as HTMLDivElement).style.background = `${topicColor}08`; } }}
                                onMouseLeave={e => { if (!isLocked) { (e.currentTarget as HTMLDivElement).style.borderColor = '#E0E0E0'; (e.currentTarget as HTMLDivElement).style.background = '#fff'; } }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '9px 12px', borderRadius: 11,
                                    border: `2px solid ${border}`, background: bg,
                                    cursor: isLocked ? 'default' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    animation: anim,
                                    opacity: isLocked && !isCorrectOpt && !isThisLocked ? 0.45 : 1,
                                    boxShadow: isThisLocked && isCorrectOpt ? '0 2px 12px rgba(16,185,129,0.16)' : '0 1px 3px rgba(0,0,0,0.04)',
                                }}
                            >
                                {/* Badge */}
                                <div style={{
                                    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                                    background: isThisLocked && isCorrectOpt ? '#10b981'
                                        : isThisWrong ? '#ef4444'
                                        : `${topicColor}1a`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: isThisLocked && isCorrectOpt ? '#fff'
                                        : isThisWrong ? '#fff'
                                        : topicColor,
                                    fontSize: 10, fontWeight: 700,
                                    fontFamily: "'Poppins',sans-serif",
                                    transition: 'all 0.2s ease',
                                }}>
                                    {isThisLocked && isCorrectOpt ? <Check size={13} strokeWidth={3} />
                                        : isThisWrong ? <XIcon size={13} />
                                        : OPTION_LABELS[oi]}
                                </div>
                                <span style={{
                                    fontFamily: "'Poppins',sans-serif",
                                    fontSize: 'clamp(11px,1.9vw,12.5px)',
                                    fontWeight: 500, color: txtColor, lineHeight: 1.5,
                                }}>{opt.text}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Reason panel */}
                {isAnswered && (
                    <div style={{
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                        border: '2px solid #10b98128', padding: '9px 13px',
                        animation: 'cqReason 0.38s ease-out',
                        display: 'flex', gap: 9, alignItems: 'flex-start', flexShrink: 0,
                    }}>
                        <Check size={14} color="#10b981" strokeWidth={3} style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{
                            margin: 0, fontFamily: "'Poppins',sans-serif",
                            fontSize: 'clamp(10px,1.7vw,11.5px)',
                            color: '#059669', fontStyle: 'italic', lineHeight: 1.55,
                        }}>💡 {q.reason}</p>
                    </div>
                )}
            </div>
        );
    };

    // ─── MAIN RENDER ──────────────────────────────────────────────────────────
    return (
        <div style={{
            width: `${config.width}px`, maxWidth: '100%',
            fontFamily: "'Poppins',sans-serif",
            background: phase === 'summary'
                ? 'linear-gradient(135deg, #4A4DC9 0%, #533086 55%, #FF7212 100%)'
                : '#F5F5F5',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(74,77,201,0.12)',
            display: 'flex', flexDirection: 'column',
        }}>

            {/* ══ HEADER — hidden during summary ══════════════════════════════ */}
            {phase !== 'summary' && <div style={{
                background: 'linear-gradient(135deg, #4A4DC9 0%, #533086 100%)',
                padding: '12px 14px',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
                flexShrink: 0,
                animation: mounted ? 'cqFadeDown 0.4s ease-out' : 'none',
            }}>
                <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                    <h1 style={{
                        margin: 0, fontSize: 'clamp(12px,2.4vw,15px)', fontWeight: 700,
                        color: '#FFF3E4', lineHeight: 1.25,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{quizConfig.title}</h1>
                    <p style={{
                        margin: '1px 0 0', fontSize: 'clamp(9px,1.4vw,11px)',
                        color: '#C1C1EA', fontWeight: 400,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{quizConfig.subtitle}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    {phase !== 'idle' && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'rgba(255,255,255,0.15)', borderRadius: 9, padding: '4px 10px',
                        }}>
                            <Star size={12} color="#FC9145" fill="#FC9145" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#FFF3E4', minWidth: 30, textAlign: 'center' }}>
                                {phase === 'summary' ? `${score}/${TOTAL}` : `${Object.keys(answers).length}/${TOTAL}`}
                            </span>
                        </div>
                    )}
                    {phase === 'quiz' && quizConfig.showTimer && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'rgba(255,255,255,0.15)', borderRadius: 9, padding: '4px 10px',
                        }}>
                            <Clock size={12} color="#C1C1EA" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#FFF3E4', minWidth: 30, textAlign: 'center' }}>
                                {formatTime(elapsed)}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={handleReset} title="Restart"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'rotate(-90deg)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'rotate(0deg)'; }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, height: 30, borderRadius: 8,
                            border: '1.5px solid rgba(255,255,255,0.3)',
                            background: 'transparent', color: '#C1C1EA',
                            cursor: 'pointer', transition: 'all 0.28s ease', flexShrink: 0,
                        }}
                    ><RotateCcw size={13} /></button>
                </div>
            </div>}

            {/* ══ PROGRESS SEGMENT BAR ═════════════════════════════════════════ */}
            {phase !== 'summary' && phase === 'quiz' && (
                <div style={{
                    display: 'flex', gap: 3, padding: '8px 14px 2px',
                    background: '#F5F5F5', flexShrink: 0,
                }}>
                    {quizConfig.questions.map((q, i) => {
                        const done    = i < idx || answers[q.id] !== undefined;
                        const current = i === idx;
                        const correct = answers[q.id] === q.correctId;
                        const tc      = TOPIC_COLORS[q.topic] ?? '#4A4DC9';
                        return (
                            <div key={q.id} style={{
                                flex: 1, height: current ? 7 : 5, borderRadius: 100,
                                background: done ? (correct ? '#10b981' : '#ef4444') : current ? tc : '#EBEBEB',
                                transition: 'all 0.3s ease',
                                boxShadow: current ? `0 0 0 2px ${tc}28` : 'none',
                            }} />
                        );
                    })}
                </div>
            )}

            {/* ══ CONTENT ═══════════════════════════════════════════════════════ */}
            {phase !== 'summary' && phase === 'idle' && renderIdle()}
            {phase !== 'summary' && phase === 'quiz' && renderQuiz()}

            {/* ══ NEXT / FINISH FOOTER ═════════════════════════════════════════ */}
            {phase !== 'summary' && phase === 'quiz' && (
                <div style={{
                    padding: '9px 14px 12px',
                    background: '#F5F5F5', borderTop: '1px solid #EBEBEB',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 8, flexShrink: 0,
                }}>
                    <span style={{
                        fontFamily: "'Poppins',sans-serif",
                        fontSize: 'clamp(10px,1.7vw,11px)',
                        color: isAnswered ? '#4A4DC9' : '#CACACA', fontWeight: 500,
                    }}>
                        {isAnswered
                            ? idx < TOTAL - 1 ? '✓ Correct! Tap Next →' : '✓ Last question done!'
                            : 'Tap an answer above to continue'}
                    </span>
                    <button
                        onClick={handleNext} disabled={!isAnswered}
                        onMouseEnter={e => { if (isAnswered) e.currentTarget.style.transform = 'scale(1.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 20px', borderRadius: 11,
                            background: isAnswered ? 'linear-gradient(135deg, #4A4DC9, #533086)' : '#EBEBEB',
                            border: 'none', color: isAnswered ? '#FFF3E4' : '#CACACA',
                            fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 600,
                            cursor: isAnswered ? 'pointer' : 'not-allowed',
                            transition: 'all 0.22s ease', flexShrink: 0,
                            animation: pulseNext && isAnswered ? 'cqPulse 1.6s ease-in-out infinite' : 'none',
                            boxShadow: isAnswered ? '0 3px 10px rgba(74,77,201,0.22)' : 'none',
                        }}
                    >
                        {idx < TOTAL - 1 ? 'Next' : 'Finish'} <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {/* ══ SUMMARY — replaces all content ════════════════════════════════ */}
            {phase === 'summary' && renderSummary()}
        </div>
    );
};

export default ChapterQuiz;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════