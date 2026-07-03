// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: MagnetSortingTool.tsx
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Check, RotateCcw, Star } from 'lucide-react';

// ── Custom Icons ──────────────────────────────────────────────────────────────

const TrophyIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

const MagnetIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 15A6 6 0 0 0 18 15" /><path d="M6 3v12" /><path d="M18 3v12" />
        <path d="M6 3h4" /><path d="M14 3h4" />
    </svg>
);

const ShieldCheckIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
    </svg>
);

const AlertTriangleIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';
type BinType  = 'safe' | 'harmful';

interface StepDetails {
    currentStep: number; totalSteps: number; isPaused: boolean; currentMode: ModeType;
}
interface ActionCard {
    id: string; text: string; icon: string;
    correctBin: BinType; reason: string; hint: string;
}
interface SortingAdditionalProps {
    cards?: ActionCard[]; showHints?: boolean; showReasons?: boolean;
}
interface MagnetSortingToolProps {
    props?: {
        width?: number; themeColor?: string; darkMode?: boolean;
        additionalProps?: SortingAdditionalProps;
    };
    setStepDetails?: (s: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (v: boolean) => void;
}

// ── Default Data ──────────────────────────────────────────────────────────────

const DEFAULT_CARDS: ActionCard[] = [
    { id: 'c1', text: 'Heat the magnet',                     icon: '🔥', correctBin: 'harmful', reason: 'Heat destroys the alignment of magnetic domains.',         hint: 'High temperature disrupts the internal structure that makes a magnet work.' },
    { id: 'c2', text: 'Store magnets in pairs',               icon: '🧲', correctBin: 'safe',    reason: 'Unlike poles facing keeps magnetism intact.',              hint: 'Storing in pairs with unlike poles on the same side preserves magnetic strength.' },
    { id: 'c3', text: 'Drop the magnet on the floor',         icon: '💥', correctBin: 'harmful', reason: 'Physical shock misaligns magnetic domains.',               hint: 'A sudden impact can scramble the tiny magnets inside, weakening it.' },
    { id: 'c4', text: 'Place wood between stored magnets',    icon: '🪵', correctBin: 'safe',    reason: 'Wood spacer prevents poles from cancelling each other.',   hint: 'A non-magnetic spacer keeps the stored pair from demagnetising each other.' },
    { id: 'c5', text: 'Hammer the magnet',                    icon: '🔨', correctBin: 'harmful', reason: 'Hammering destroys the ordered magnetic domains.',         hint: 'Like dropping, a hard blow breaks the internal magnetic order.' },
    { id: 'c6', text: 'Keep magnets away from mobile phones', icon: '📵', correctBin: 'safe',    reason: 'Strong fields near electronics cause mutual damage.',      hint: 'Keeping magnets away protects both the magnet and sensitive devices.' },
    { id: 'c7', text: 'Put iron pieces across the ends',      icon: '⚙️', correctBin: 'safe',    reason: 'Soft iron keepers complete the magnetic circuit.',         hint: 'Iron pieces placed across the poles act as keepers and preserve strength.' },
    { id: 'c8', text: 'Leave magnets near remote controls',   icon: '📺', correctBin: 'harmful', reason: 'Magnetic fields can damage electronic components.',        hint: 'Remote controls have sensitive electronics that magnets can disrupt or destroy.' },
];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

// ── Palette ───────────────────────────────────────────────────────────────────

const AMBER      = '#f59e0b';
const AMBER2     = '#fbbf24';
const PURPLE     = '#533086';
const INDIGO     = '#4A4DC9';
const ORANGE     = '#FF7212';
const ORANGE2    = '#FC9145';
const SAFE_GREEN = '#10b981';
const HARM_RED   = '#ef4444';
const SAFE_LIGHT = '#d1fae5';
const HARM_LIGHT = '#fee2e2';

// ── Component ─────────────────────────────────────────────────────────────────

const MagnetSortingTool: React.FC<MagnetSortingToolProps> = ({ props: toolProps = {}, setStepDetails }) => {
    const ap = toolProps.additionalProps || {};

    const mc = useMemo(() => ({
        cards:       ap.cards       ?? DEFAULT_CARDS,
        showHints:   ap.showHints   ?? true,
        showReasons: ap.showReasons ?? false,
    }), [ap]);

    // ── State ─────────────────────────────────────────────────────────────────
    const [deck,         setDeck]         = useState<ActionCard[]>([]);
    const [placements,   setPlacements]   = useState<Record<string, BinType>>({});
    const [wrongFlash,   setWrongFlash]   = useState<string | null>(null);
    const [correctFlash, setCorrectFlash] = useState<string | null>(null);
    const [dragging,     setDragging]     = useState<string | null>(null);
    const [dragOver,     setDragOver]     = useState<BinType | null>(null);
    const [showSummary,  setShowSummary]  = useState(false);
    const [score,        setScore]        = useState(0);
    const [attempts,     setAttempts]     = useState(0);
    const [mounted,      setMounted]      = useState(false);
    const [confetti,     setConfetti]     = useState<{ id: number; x: number; color: string; spd: number; sz: number; rot: number }[]>([]);
    const [pulseScore,   setPulseScore]   = useState(false);
    const [hintCard,     setHintCard]     = useState<string | null>(null);
    const [touchCard,    setTouchCard]    = useState<string | null>(null);
    const [touchPos,     setTouchPos]     = useState<{ x: number; y: number } | null>(null);

    const safeBinRef = useRef<HTMLDivElement>(null);
    const harmBinRef = useRef<HTMLDivElement>(null);

    // ── Keyframes ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (document.getElementById('mst-kf')) return;
        const s = document.createElement('style');
        s.id = 'mst-kf';
        s.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
            @keyframes mstFadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
            @keyframes mstPop      { 0%{transform:scale(0.5);opacity:0} 65%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
            @keyframes mstShake    { 0%,100%{transform:translateX(0) rotate(0deg)} 20%{transform:translateX(-8px) rotate(-2deg)} 40%{transform:translateX(8px) rotate(2deg)} 60%{transform:translateX(-5px) rotate(-1deg)} 80%{transform:translateX(5px) rotate(1deg)} }
            @keyframes mstGreenPop { 0%{box-shadow:0 0 0 0 rgba(16,185,129,.6)} 70%{box-shadow:0 0 0 10px rgba(16,185,129,0)} 100%{box-shadow:none} }
            @keyframes mstConfetti { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(480px) rotate(720deg);opacity:0} }
            @keyframes mstSlideUp  { from{opacity:0;transform:translateY(22px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
            @keyframes mstSpinIn   { from{transform:rotate(-90deg) scale(0);opacity:0} to{transform:rotate(0) scale(1);opacity:1} }
            @keyframes mstScore    { 0%{transform:scale(1)} 50%{transform:scale(1.28)} 100%{transform:scale(1)} }
            @keyframes mstHint     { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
            @keyframes mstGrad     { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
            @keyframes mstFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
            @keyframes mstCardIn   { from{opacity:0;transform:translateY(14px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
            @keyframes mstReasonIn { from{opacity:0;max-height:0;padding-top:0;padding-bottom:0} to{opacity:1;max-height:80px;padding-top:5px;padding-bottom:5px} }
        `;
        document.head.appendChild(s);
    }, []);

    // ── Init ───────────────────────────────────────────────────────────────────
    useEffect(() => {
        setDeck(shuffle(mc.cards));
        setTimeout(() => setMounted(true), 60);
    }, [mc.cards]);

    useEffect(() => {
        if (setStepDetails) setStepDetails({ currentStep: 1, totalSteps: 1, isPaused: true, currentMode: 'practice' });
    }, [setStepDetails]);

    // ── Confetti ───────────────────────────────────────────────────────────────
    const boom = useCallback(() => {
        const cols = [AMBER, AMBER2, PURPLE, ORANGE2, INDIGO, '#C1C1EA', SAFE_GREEN, '#FFF3E4'];
        setConfetti(Array.from({ length: 45 }, (_, i) => ({
            id: Date.now() + i, x: Math.random() * 100,
            color: cols[i % cols.length], spd: 1.8 + Math.random() * 2.5,
            sz: 5 + Math.random() * 8, rot: Math.random() * 360,
        })));
        setTimeout(() => setConfetti([]), 4000);
    }, []);

    // ── Sort logic ─────────────────────────────────────────────────────────────
    const tryPlace = useCallback((cardId: string, bin: BinType) => {
        if (placements[cardId]) return;
        const card = mc.cards.find(c => c.id === cardId);
        if (!card) return;

        setAttempts(p => p + 1);

        if (card.correctBin === bin) {
            setPlacements(p => ({ ...p, [cardId]: bin }));
            setScore(p => p + 1);
            setCorrectFlash(cardId);
            setPulseScore(true);
            setHintCard(null);
            setTimeout(() => { setCorrectFlash(null); setPulseScore(false); }, 700);
            const nextCount = Object.keys(placements).length + 1;
            if (nextCount === mc.cards.length) {
                setTimeout(() => { setShowSummary(true); boom(); }, 600);
            }
        } else {
            setWrongFlash(cardId);
            if (mc.showHints) setHintCard(cardId);
            setTimeout(() => setWrongFlash(null), 650);
        }
    }, [placements, mc.cards, mc.showHints, boom]);

    // ── Mouse drag ─────────────────────────────────────────────────────────────
    const onDragStart = (e: React.DragEvent, cardId: string) => {
        if (placements[cardId]) { e.preventDefault(); return; }
        e.dataTransfer.setData('cardId', cardId);
        setDragging(cardId);
    };
    const onDragEnd   = () => { setDragging(null); setDragOver(null); };
    const onDragOver  = (e: React.DragEvent, bin: BinType) => { e.preventDefault(); setDragOver(bin); };
    const onDrop      = (e: React.DragEvent, bin: BinType) => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData('cardId');
        setDragging(null); setDragOver(null);
        if (cardId) tryPlace(cardId, bin);
    };

    // ── Touch drag ─────────────────────────────────────────────────────────────
    const onTouchStart = (e: React.TouchEvent, cardId: string) => {
        if (placements[cardId]) return;
        setTouchCard(cardId);
        const t = e.touches[0];
        setTouchPos({ x: t.clientX, y: t.clientY });
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (!touchCard) return;
        const t = e.touches[0];
        setTouchPos({ x: t.clientX, y: t.clientY });
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if      (el?.closest('[data-bin="safe"]'))    setDragOver('safe');
        else if (el?.closest('[data-bin="harmful"]')) setDragOver('harmful');
        else                                          setDragOver(null);
    };
    const onTouchEnd = () => {
        if (touchCard && dragOver) tryPlace(touchCard, dragOver);
        setTouchCard(null); setTouchPos(null); setDragOver(null);
    };

    const reset = useCallback(() => {
        setPlacements({}); setScore(0); setAttempts(0); setShowSummary(false);
        setWrongFlash(null); setCorrectFlash(null); setHintCard(null);
        setDeck(shuffle(mc.cards));
    }, [mc.cards]);

    // ── Derived ────────────────────────────────────────────────────────────────
    const lockedCount  = Object.keys(placements).length;
    const totalCount   = mc.cards.length;
    const safeCards    = mc.cards.filter(c => placements[c.id] === 'safe');
    const harmfulCards = mc.cards.filter(c => placements[c.id] === 'harmful');
    const remaining    = deck.filter(c => !placements[c.id]);

    // ── Bin renderer ───────────────────────────────────────────────────────────
    const renderBin = (bin: BinType) => {
        const isSafe      = bin === 'safe';
        const binRef      = isSafe ? safeBinRef : harmBinRef;
        const placed      = isSafe ? safeCards : harmfulCards;
        const activeColor = isSafe ? SAFE_GREEN : HARM_RED;
        const lightBg     = isSafe ? SAFE_LIGHT  : HARM_LIGHT;
        const titleColor  = isSafe ? '#065f46'   : '#7f1d1d';
        const reasonColor = isSafe ? '#047857'   : '#b91c1c';
        const emptyText   = isSafe ? 'Drop safe actions here' : 'Drop harmful actions here';
        const countColor  = isSafe ? '#6ee7b7'   : '#fca5a5';

        return (
            <div
                ref={binRef}
                data-bin={bin}
                onDragOver={e => onDragOver(e, bin)}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => onDrop(e, bin)}
                style={{
                    flex: '1 1 240px',
                    borderRadius: 14,
                    border: `2.5px dashed ${dragOver === bin ? activeColor : '#C1C1EA'}`,
                    background: dragOver === bin ? lightBg : '#fafafa',
                    padding: '12px',
                    transition: 'all 0.2s ease',
                    boxShadow: dragOver === bin ? `0 0 0 4px ${activeColor}22` : 'none',
                    minHeight: 100,
                }}
            >
                {/* Bin header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSafe
                            ? <ShieldCheckIcon size={16} color={SAFE_GREEN} />
                            : <AlertTriangleIcon size={16} color={HARM_RED} />}
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: titleColor }}>
                            {isSafe ? 'Safe for Magnets' : 'Harmful for Magnets'}
                        </div>
                        <div style={{ fontSize: 9.5, color: countColor, fontWeight: 500 }}>
                            {placed.length} card{placed.length !== 1 ? 's' : ''} placed
                        </div>
                    </div>
                </div>

                {/* Placed cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {placed.map((card, i) => (
                        <div key={card.id} style={{
                            borderRadius: 9, overflow: 'hidden',
                            animation: correctFlash === card.id ? 'mstGreenPop 0.6s ease-out' : `mstPop 0.4s ease-out ${i * 0.05}s both`,
                            boxShadow: `0 1px 5px ${activeColor}25`,
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: '7px 10px',
                                background: lightBg,
                                border: `2px solid ${activeColor}55`,
                                borderRadius: mc.showReasons ? '9px 9px 0 0' : 9,
                            }}>
                                <span style={{ fontSize: 15, flexShrink: 0 }}>{card.icon}</span>
                                <span style={{ fontSize: 'clamp(10px,1.6vw,11px)', fontWeight: 600, color: titleColor, flex: 1 }}>{card.text}</span>
                                <Check size={13} color={activeColor} style={{ flexShrink: 0 }} />
                            </div>
                            {mc.showReasons && (
                                <div style={{
                                    padding: '5px 10px',
                                    background: isSafe ? '#ecfdf5' : '#fff5f5',
                                    borderLeft: `2px solid ${activeColor}55`,
                                    borderRight: `2px solid ${activeColor}55`,
                                    borderBottom: `2px solid ${activeColor}55`,
                                    borderRadius: '0 0 9px 9px',
                                    fontSize: 9.5, color: reasonColor,
                                    fontStyle: 'italic', lineHeight: 1.4,
                                    animation: 'mstReasonIn 0.3s ease-out both',
                                }}>
                                    {isSafe ? '✓' : '✗'} {card.reason}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {placed.length === 0 && (
                    <div style={{
                        textAlign: 'center', color: '#CACACA', fontSize: 11,
                        padding: '12px 0',
                        animation: `mstFloat 3s ease-in-out ${isSafe ? '0s' : '1.5s'} infinite`,
                    }}>
                        {emptyText}
                    </div>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    if (showSummary) {
        return (
            <div style={{
                width: '100%', maxWidth: toolProps.width ?? 820,
                fontFamily: "'Poppins',sans-serif", margin: '0 auto',
                borderRadius: 20, overflow: 'hidden',
                background: `linear-gradient(135deg,${PURPLE} 0%,${INDIGO} 50%,${ORANGE} 100%)`,
                backgroundSize: '200% 200%',
                animation: 'mstSlideUp 0.5s ease-out, mstGrad 6s ease infinite',
                boxShadow: '0 6px 32px rgba(83,48,134,0.18)',
                position: 'relative',
            }}>
                {confetti.map(c => (
                    <div key={c.id} style={{
                        position: 'absolute', left: `${c.x}%`, top: 0,
                        width: c.sz, height: c.sz, backgroundColor: c.color,
                        borderRadius: c.id % 3 === 0 ? '50%' : '3px',
                        transform: `rotate(${c.rot}deg)`,
                        animation: `mstConfetti ${c.spd}s ease-in forwards`,
                        pointerEvents: 'none', zIndex: 10,
                    }} />
                ))}
                <div style={{ padding: '28px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 5 }}>
                    <div style={{ animation: 'mstSpinIn 0.7s ease-out', marginBottom: 10 }}>
                        <TrophyIcon size={48} color="#FFF3E4" />
                    </div>
                    <h2 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 'clamp(20px,4vw,26px)', color: '#FFF3E4', margin: '0 0 4px', textAlign: 'center', animation: 'mstFadeUp 0.4s ease-out 0.1s both' }}>
                        All Sorted! 🎉
                    </h2>
                    <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, color: '#C1C1EA', margin: '0 0 20px', animation: 'mstFadeUp 0.4s ease-out 0.2s both' }}>
                        Score: {score}/{totalCount} · Attempts: {attempts}
                    </p>
                    <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 620, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {[
                            { label: '✅ Safe for Magnets',    cards: safeCards,    border: SAFE_GREEN, tagColor: '#a7f3d0' },
                            { label: '⚠️ Harmful for Magnets', cards: harmfulCards, border: HARM_RED,   tagColor: '#fecaca' },
                        ].map((grp, gi) => (
                            <div key={gi} style={{
                                flex: '1 1 220px',
                                background: 'rgba(255,255,255,0.11)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: 16, padding: '14px',
                                border: `2px solid ${grp.border}55`,
                                animation: `mstFadeUp 0.4s ease-out ${0.3 + gi * 0.1}s both`,
                            }}>
                                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 700, color: '#FFF3E4', marginBottom: 10, textAlign: 'center' }}>
                                    {grp.label}
                                </div>
                                {grp.cards.map((card, i) => (
                                    <div key={card.id} style={{
                                        display: 'flex', gap: 8, alignItems: 'flex-start',
                                        background: 'rgba(255,255,255,0.08)', borderRadius: 10,
                                        padding: '8px 10px', marginBottom: i < grp.cards.length - 1 ? 6 : 0,
                                        animation: `mstFadeUp 0.35s ease-out ${0.4 + gi * 0.1 + i * 0.06}s both`,
                                    }}>
                                        <span style={{ fontSize: 16, flexShrink: 0 }}>{card.icon}</span>
                                        <div>
                                            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 600, color: '#FFF3E4', lineHeight: 1.4 }}>{card.text}</div>
                                            {mc.showReasons && (
                                                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, color: grp.tagColor, marginTop: 2, fontStyle: 'italic', lineHeight: 1.35 }}>
                                                    💡 {card.reason}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <button onClick={reset} style={{
                        marginTop: 20, display: 'flex', alignItems: 'center', gap: 8,
                        padding: '11px 30px', borderRadius: 12,
                        border: '2px solid rgba(255,255,255,0.55)',
                        background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)',
                        color: '#FFF3E4', fontFamily: "'Poppins',sans-serif",
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        animation: 'mstFadeUp 0.4s ease-out 0.7s both',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; e.currentTarget.style.transform = 'scale(1.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        <RotateCcw size={14} /> Play Again
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GAME VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div style={{
            width: '100%', maxWidth: toolProps.width ?? 820,
            fontFamily: "'Poppins',sans-serif",
            background: '#F5F5F5', borderRadius: 20,
            boxShadow: '0 4px 28px rgba(83,48,134,0.13)',
            margin: '0 auto', overflow: 'hidden',
        }}>

            {/* ── HEADER ── */}
            <div style={{
                background: `linear-gradient(135deg,${PURPLE} 0%,${INDIGO} 100%)`,
                padding: '13px 16px',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                animation: mounted ? 'mstFadeUp 0.4s ease-out' : 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MagnetIcon size={18} color="#FFF3E4" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 'clamp(12px,2.2vw,15px)', fontWeight: 700, color: '#FFF3E4', lineHeight: 1.3 }}>
                            Safe or Harmful for Magnets?
                        </h1>
                        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#C1C1EA', fontWeight: 400 }}>
                            Drag each action card into the correct bin
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 9, padding: '4px 11px' }}>
                        <Star size={12} color={AMBER2} fill={AMBER2} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#FFF3E4', animation: pulseScore ? 'mstScore 0.5s ease-out' : 'none', minWidth: 26, textAlign: 'center' }}>
                            {lockedCount}/{totalCount}
                        </span>
                    </div>
                    <button onClick={reset} title="Reset" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 30, height: 30, borderRadius: 8,
                        border: '1.5px solid rgba(255,255,255,0.3)',
                        background: 'transparent', color: '#C1C1EA',
                        cursor: 'pointer', transition: 'all 0.3s ease',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'rotate(-90deg)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'rotate(0deg)'; }}
                    >
                        <RotateCcw size={13} />
                    </button>
                </div>
            </div>

            {/* ── PROGRESS BAR ── */}
            <div style={{ height: 3, background: '#E0E0E0' }}>
                <div style={{
                    height: '100%', width: `${(lockedCount / totalCount) * 100}%`,
                    background: `linear-gradient(90deg,${AMBER},${ORANGE2})`,
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>

            {/* ── BODY: BINS first (top), CARD DECK second (bottom) ── */}
            <div style={{ padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ════════════ BINS — TOP ════════════ */}
                <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: '#4E4E4E', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 9, paddingBottom: 5, borderBottom: '2px solid #E8E8E8' }}>
                        Drop Zones
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {renderBin('safe')}
                        {renderBin('harmful')}
                    </div>
                </div>

                {/* ════════════ CARD DECK — BOTTOM ════════════ */}
                {remaining.length > 0 && (
                    <div>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#4E4E4E', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 9, paddingBottom: 5, borderBottom: '2px solid #E8E8E8' }}>
                            Action Cards — drag to a bin above
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {remaining.map((card, i) => {
                                const isWrong   = wrongFlash === card.id;
                                const isDragged = dragging   === card.id || touchCard === card.id;
                                const showHint  = hintCard   === card.id && mc.showHints;

                                return (
                                    <div key={card.id} style={{ position: 'relative' }}>
                                        <div
                                            draggable
                                            onDragStart={e => onDragStart(e, card.id)}
                                            onDragEnd={onDragEnd}
                                            onTouchStart={e => onTouchStart(e, card.id)}
                                            onTouchMove={onTouchMove}
                                            onTouchEnd={onTouchEnd}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 7,
                                                padding: '8px 12px', borderRadius: 10,
                                                background: isDragged ? `${AMBER}18` : '#fff',
                                                border: `2px solid ${isDragged ? AMBER : isWrong ? HARM_RED : '#E0E0E0'}`,
                                                cursor: 'grab', userSelect: 'none',
                                                boxShadow: isDragged ? `0 6px 18px ${AMBER}30` : '0 1px 4px rgba(0,0,0,0.07)',
                                                transform: isDragged ? 'scale(1.04) rotate(-1.5deg)' : 'scale(1)',
                                                transition: 'all 0.2s ease',
                                                animation: isWrong ? 'mstShake 0.55s ease-out' : mounted ? `mstCardIn 0.35s ease-out ${i * 0.06}s both` : 'none',
                                                opacity: isDragged ? 0.75 : 1,
                                            }}
                                        >
                                            <span style={{ fontSize: 18, flexShrink: 0 }}>{card.icon}</span>
                                            <span style={{ fontSize: 'clamp(10px,1.7vw,11.5px)', fontWeight: 500, color: '#2d2d2d', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                                                {card.text}
                                            </span>
                                        </div>

                                        {/* Hint tooltip */}
                                        {showHint && (
                                            <div style={{
                                                position: 'absolute', bottom: 'calc(100% + 5px)', left: 0, zIndex: 20,
                                                background: '#fff7ed', border: '1.5px solid #fed7aa',
                                                borderRadius: 8, padding: '6px 9px',
                                                fontSize: 10, color: '#9a3412',
                                                animation: 'mstHint 0.3s ease-out both',
                                                lineHeight: 1.4, minWidth: 180, maxWidth: 240,
                                                boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
                                                whiteSpace: 'normal',
                                            }}>
                                                💡 <em>{card.hint}</em>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>

            {/* ── STATUS BAR ── */}
            <div style={{
                padding: '7px 14px',
                background: remaining.length === 0 ? `linear-gradient(90deg,${AMBER}12,${ORANGE2}12)` : '#fafafa',
                borderTop: '1px solid #EBEBEB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: remaining.length > 0 ? '#CACACA' : AMBER }} />
                <span style={{ fontSize: 10.5, fontWeight: 500, color: remaining.length === 0 ? AMBER : '#888' }}>
                    {remaining.length === 0
                        ? '🎉 All cards sorted!'
                        : `${remaining.length} card${remaining.length !== 1 ? 's' : ''} remaining — drag to a bin above`}
                </span>
            </div>

        </div>
    );
};

export default MagnetSortingTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════