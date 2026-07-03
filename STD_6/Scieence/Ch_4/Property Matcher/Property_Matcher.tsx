// ═══════════════════════════════════════════════════════════════════════════
// File: MagnetMatchingTool.tsx
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Check, RotateCcw, Star } from 'lucide-react';

// ── Inline Icons ─────────────────────────────────────────────────────────────

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
const ArrowRightIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
);
const ZapIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
);

// ── Types ────────────────────────────────────────────────────────────────────

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';
interface StepDetails { currentStep: number; totalSteps: number; isPaused: boolean; currentMode: ModeType; }
interface Activity    { id: string; text: string; color: string; propertyId: string; icon: string; }
interface Property    { id: string; label: string; description: string; hint: string; chapterRef: string; }
interface MagnetMatchingAdditionalProps {
    activities?: Activity[]; properties?: Property[];
    showHints?: boolean; showChapterRef?: boolean; showDescription?: boolean;
}
interface MagnetMatchingToolProps {
    props?: { width?: number; themeColor?: string; darkMode?: boolean; additionalProps?: MagnetMatchingAdditionalProps; };
    setStepDetails?: (s: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (v: boolean) => void;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_ACTIVITIES: Activity[] = [
    { id: 'a1', text: 'Ring magnets floating on a stand',                      color: '#533086', propertyId: 'p1', icon: '🔴' },
    { id: 'a2', text: 'Steel balls guided through a maze',                     color: '#4A4DC9', propertyId: 'p2', icon: '⚪' },
    { id: 'a3', text: 'Paper clip rising in water without magnet touching it', color: '#FF7212', propertyId: 'p3', icon: '📎' },
    { id: 'a4', text: 'Toy cars pushing apart on a track',                     color: '#FC9145', propertyId: 'p4', icon: '🚗' },
];
const DEFAULT_PROPERTIES: Property[] = [
    { id: 'p1', label: 'Like poles repel',                      description: 'Two poles of the same type push each other away',     hint: 'The ring magnets sit on a rod with same poles facing — they push apart and the upper one floats!',       chapterRef: 'Sec 4.4' },
    { id: 'p2', label: 'Magnetic effect through cardboard',     description: 'Magnetic force passes through non-magnetic materials', hint: 'The magnet moves BELOW the cardboard tray — force passes right through to guide the steel balls.',     chapterRef: 'Sec 4.7' },
    { id: 'p3', label: 'Magnetic effect through glass & water', description: 'Magnetic force passes through glass and water',        hint: 'Glass and water are non-magnetic — the force passes straight through to attract the steel clip.',      chapterRef: 'Sec 4.7' },
    { id: 'p4', label: 'Like poles repel',                      description: 'Matching poles on adjacent objects cause repulsion',   hint: 'Each car has the same pole at the front — they repel and roll apart without touching!',               chapterRef: 'Sec 4.4' },
];

const ACT_LABELS  = ['(i)', '(ii)', '(iii)', '(iv)', '(v)', '(vi)'];
const PROP_LABELS = ['(a)', '(b)', '(c)', '(d)', '(e)', '(f)'];
const LINE_COLORS = ['#533086', '#4A4DC9', '#FF7212', '#FC9145', '#10b981'];

// ── Component ────────────────────────────────────────────────────────────────

const MagnetMatchingTool: React.FC<MagnetMatchingToolProps> = ({ props: toolProps = {}, setStepDetails }) => {
    const ap = toolProps.additionalProps || {};

    const mc = useMemo(() => ({
        activities:      ap.activities      ?? DEFAULT_ACTIVITIES,
        properties:      ap.properties      ?? DEFAULT_PROPERTIES,
        showHints:       ap.showHints       ?? true,
        showChapterRef:  ap.showChapterRef  ?? true,
        showDescription: ap.showDescription ?? true,
    }), [ap]);

    // ── State ─────────────────────────────────────────────────────────────────
    const [matches,       setMatches]       = useState<Record<string, string>>({});
    const [selAct,        setSelAct]        = useState<string | null>(null);
    const [wrongPair,     setWrongPair]     = useState<{ aId: string; pId: string } | null>(null);
    const [correctAnim,   setCorrectAnim]   = useState<string | null>(null);
    const [shakeProp,     setShakeProp]     = useState<string | null>(null);
    const [showSummary,   setShowSummary]   = useState(false);
    const [score,         setScore]         = useState(0);
    const [attempts,      setAttempts]      = useState(0);
    const [mounted,       setMounted]       = useState(false);
    const [shuffledProps, setShuffledProps] = useState<Property[]>([]);
    const [confetti,      setConfetti]      = useState<{ id: number; x: number; color: string; spd: number; sz: number }[]>([]);
    const [hoverAct,      setHoverAct]      = useState<string | null>(null);
    const [hoverProp,     setHoverProp]     = useState<string | null>(null);
    const [pulseScore,    setPulseScore]    = useState(false);
    const [lines,         setLines]         = useState<{ aId: string; pId: string; y1: number; y2: number; color: string }[]>([]);
    const [hintFor,       setHintFor]       = useState<string | null>(null);

    // ── Refs ──────────────────────────────────────────────────────────────────
    const actRefs  = useRef<Record<string, HTMLDivElement | null>>({});
    const propRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const svgRef   = useRef<HTMLDivElement>(null);

    // ── Keyframes ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (document.getElementById('mm-kf')) return;
        const s = document.createElement('style');
        s.id = 'mm-kf';
        s.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
            @keyframes mmFadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            @keyframes mmFadeL   { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
            @keyframes mmFadeR   { from{opacity:0;transform:translateX(20px)}  to{opacity:1;transform:translateX(0)} }
            @keyframes mmPop     { 0%{transform:scale(0);opacity:0} 65%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
            @keyframes mmShake   { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
            @keyframes mmFlash   { 0%{box-shadow:0 0 0 0 rgba(16,185,129,.55)} 70%{box-shadow:0 0 0 9px rgba(16,185,129,0)} 100%{box-shadow:none} }
            @keyframes mmConfetti{ 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(500px) rotate(720deg);opacity:0} }
            @keyframes mmSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
            @keyframes mmSpinIn  { from{transform:rotate(-90deg) scale(0);opacity:0} to{transform:rotate(0) scale(1);opacity:1} }
            @keyframes mmScore   { 0%{transform:scale(1)} 50%{transform:scale(1.25)} 100%{transform:scale(1)} }
            @keyframes mmGlow    { 0%,100%{box-shadow:0 0 0 0 rgba(83,48,134,0)} 50%{box-shadow:0 0 0 5px rgba(83,48,134,.12)} }
            @keyframes mmLine    { from{stroke-dashoffset:500} to{stroke-dashoffset:0} }
            @keyframes mmDot     { from{opacity:0} to{opacity:1} }
            @keyframes mmHint    { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
            @keyframes mmGrad    { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        `;
        document.head.appendChild(s);
    }, []);

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        setShuffledProps([...mc.properties].sort(() => Math.random() - 0.5));
        setTimeout(() => setMounted(true), 50);
    }, [mc.properties]);

    // ── SVG lines ─────────────────────────────────────────────────────────────
    const recalcLines = useCallback(() => {
        if (!svgRef.current) return;
        const sr = svgRef.current.getBoundingClientRect();
        const nl = Object.entries(matches).map(([aId, pId]) => {
            const aEl = actRefs.current[aId];
            const pEl = propRefs.current[pId];
            if (!aEl || !pEl) return null;
            const ar = aEl.getBoundingClientRect();
            const pr = pEl.getBoundingClientRect();
            const color = LINE_COLORS[mc.activities.findIndex(a => a.id === aId) % LINE_COLORS.length];
            return { aId, pId, y1: ar.top + ar.height / 2 - sr.top, y2: pr.top + pr.height / 2 - sr.top, color };
        }).filter(Boolean) as typeof lines;
        setLines(nl);
    }, [matches, mc.activities]);

    useEffect(() => { const t = setTimeout(recalcLines, 130); return () => clearTimeout(t); }, [matches, recalcLines, shuffledProps, hintFor]);
    useEffect(() => { window.addEventListener('resize', recalcLines); return () => window.removeEventListener('resize', recalcLines); }, [recalcLines]);

    // ── Confetti ──────────────────────────────────────────────────────────────
    const boom = useCallback(() => {
        const cols = ['#533086','#4A4DC9','#FF7212','#FC9145','#C1C1EA','#FFF3E4','#10b981','#f59e0b'];
        setConfetti(Array.from({ length: 42 }, (_, i) => ({
            id: Date.now() + i, x: Math.random() * 100,
            color: cols[i % cols.length], spd: 1.8 + Math.random() * 2.5, sz: 5 + Math.random() * 7,
        })));
        setTimeout(() => setConfetti([]), 4000);
    }, []);

    // ── Match logic ───────────────────────────────────────────────────────────
    const clickAct = useCallback((id: string) => {
        if (matches[id]) return;
        setSelAct(p => p === id ? null : id);
        setHintFor(null);
    }, [matches]);

    const clickProp = useCallback((pId: string) => {
        if (!selAct) return;
        if (Object.values(matches).includes(pId)) return;
        setAttempts(p => p + 1);
        const act = mc.activities.find(a => a.id === selAct);
        if (!act) return;

        if (act.propertyId === pId) {
            setCorrectAnim(selAct);
            setMatches(p => ({ ...p, [selAct]: pId }));
            setScore(p => p + 1);
            setPulseScore(true);
            setTimeout(() => setPulseScore(false), 600);
            setHintFor(null);
            const nextCount = Object.keys(matches).length + 1;
            setTimeout(() => {
                setCorrectAnim(null);
                setSelAct(null);
                if (nextCount === mc.activities.length) {
                    setTimeout(() => { setShowSummary(true); boom(); }, 500);
                }
            }, 700);
        } else {
            setWrongPair({ aId: selAct, pId });
            setShakeProp(pId);
            if (mc.showHints) setHintFor(selAct);
            setTimeout(() => { setWrongPair(null); setShakeProp(null); }, 600);
        }
    }, [selAct, matches, mc, boom]);

    const reset = useCallback(() => {
        setMatches({}); setSelAct(null); setWrongPair(null); setCorrectAnim(null);
        setShakeProp(null); setShowSummary(false); setScore(0); setAttempts(0);
        setLines([]); setHintFor(null);
        setShuffledProps([...mc.properties].sort(() => Math.random() - 0.5));
    }, [mc.properties]);

    useEffect(() => {
        if (setStepDetails) setStepDetails({ currentStep: 1, totalSteps: 1, isPaused: true, currentMode: 'practice' });
    }, [setStepDetails]);

    const isActMatched  = (id: string) => !!matches[id];
    const isPropMatched = (id: string) => Object.values(matches).includes(id);
    const matchedCount  = Object.keys(matches).length;
    const total         = mc.activities.length;

    // ── Shared card styles ────────────────────────────────────────────────────
    const headerGrad = 'linear-gradient(135deg,#533086 0%,#4A4DC9 100%)';

    // ═════════════════════════════════════════════════════════════════════════
    // SUMMARY VIEW — renders in normal document flow, same wrapper as game
    // ═════════════════════════════════════════════════════════════════════════
    if (showSummary) {
        return (
            <div style={{
                width: '100%', maxWidth: toolProps.width ?? 820,
                fontFamily: "'Poppins',sans-serif",
                borderRadius: 20, margin: '0 auto',
                boxShadow: '0 4px 28px rgba(83,48,134,0.15)',
                background: 'linear-gradient(135deg,#533086 0%,#4A4DC9 55%,#FF7212 100%)',
                backgroundSize: '200% 200%',
                animation: 'mmSlideUp 0.5s ease-out, mmGrad 6s ease infinite',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Confetti */}
                {confetti.map(c => (
                    <div key={c.id} style={{
                        position: 'absolute', left: `${c.x}%`, top: 0,
                        width: c.sz, height: c.sz, backgroundColor: c.color,
                        borderRadius: c.id % 2 === 0 ? '50%' : '3px',
                        animation: `mmConfetti ${c.spd}s ease-in forwards`,
                        pointerEvents: 'none', zIndex: 10,
                    }} />
                ))}

                {/* Summary content */}
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center',
                    padding: '28px 20px 24px',
                    position: 'relative', zIndex: 5,
                }}>
                    {/* Trophy */}
                    <div style={{ animation: 'mmSpinIn 0.7s ease-out', marginBottom: 10 }}>
                        <TrophyIcon size={48} color="#FFF3E4" />
                    </div>

                    {/* Title */}
                    <h2 style={{
                        fontFamily: "'Poppins',sans-serif", fontWeight: 800,
                        fontSize: 'clamp(20px,4vw,26px)', color: '#FFF3E4',
                        margin: '0 0 4px', textAlign: 'center',
                        animation: 'mmFadeUp 0.4s ease-out 0.1s both',
                    }}>
                        All Matched! 🎉
                    </h2>
                    <p style={{
                        fontFamily: "'Poppins',sans-serif", fontSize: 13,
                        color: '#C1C1EA', margin: '0 0 20px',
                        animation: 'mmFadeUp 0.4s ease-out 0.2s both',
                    }}>
                        Score: {score}/{total} · Attempts: {attempts}
                    </p>

                    {/* Result cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 580 }}>
                        {mc.activities.map((act, i) => {
                            const prop = mc.properties.find(p => p.id === act.propertyId);
                            return (
                                <div key={act.id} style={{
                                    background: 'rgba(255,255,255,0.13)',
                                    backdropFilter: 'blur(12px)',
                                    borderRadius: 14,
                                    padding: '12px 15px',
                                    border: `2px solid ${act.color}60`,
                                    display: 'flex', gap: 12, alignItems: 'flex-start',
                                    animation: `mmFadeUp 0.4s ease-out ${0.3 + i * 0.08}s both`,
                                }}>
                                    <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{act.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontFamily: "'Poppins',sans-serif",
                                            fontSize: 'clamp(11px,1.8vw,13px)', fontWeight: 600,
                                            color: '#FFF3E4', lineHeight: 1.4, marginBottom: 4,
                                        }}>
                                            {act.text}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <ArrowRightIcon size={11} color="#FC9145" />
                                            <span style={{
                                                fontFamily: "'Poppins',sans-serif",
                                                fontSize: 12, fontWeight: 700, color: '#FC9145',
                                            }}>
                                                {prop?.label}
                                            </span>
                                            {mc.showChapterRef && prop?.chapterRef && (
                                                <span style={{
                                                    fontFamily: "'Poppins',sans-serif",
                                                    fontSize: 10, fontWeight: 600,
                                                    color: '#C1C1EA',
                                                    background: 'rgba(193,193,234,0.25)',
                                                    padding: '1px 7px', borderRadius: 5,
                                                }}>
                                                    {prop.chapterRef}
                                                </span>
                                            )}
                                        </div>
                                        {mc.showDescription && prop?.description && (
                                            <div style={{
                                                fontFamily: "'Poppins',sans-serif",
                                                fontSize: 10.5, color: 'rgba(193,193,234,0.85)',
                                                marginTop: 3, fontStyle: 'italic', lineHeight: 1.4,
                                            }}>
                                                💡 {prop.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Play Again button */}
                    <button onClick={reset} style={{
                        marginTop: 20,
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '11px 30px', borderRadius: 12,
                        border: '2px solid rgba(255,255,255,0.6)',
                        background: 'rgba(255,255,255,0.14)',
                        backdropFilter: 'blur(8px)',
                        color: '#FFF3E4', fontFamily: "'Poppins',sans-serif",
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        animation: 'mmFadeUp 0.4s ease-out 0.7s both',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.26)'; e.currentTarget.style.transform = 'scale(1.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        <RotateCcw size={14} /> Play Again
                    </button>
                </div>
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GAME VIEW
    // ═════════════════════════════════════════════════════════════════════════
    return (
        <div style={{
            width: '100%', maxWidth: toolProps.width ?? 820,
            fontFamily: "'Poppins',sans-serif",
            background: '#F5F5F5', borderRadius: 20,
            boxShadow: '0 4px 28px rgba(83,48,134,0.13)',
            margin: '0 auto',
            overflow: 'hidden',   // clips header gradient corners cleanly
        }}>

            {/* ── HEADER ── */}
            <div style={{
                background: headerGrad,
                padding: '13px 16px',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                animation: mounted ? 'mmFadeUp 0.4s ease-out' : 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px' }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 9,
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <MagnetIcon size={18} color="#FFF3E4" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 'clamp(12px,2.2vw,15px)', fontWeight: 700, color: '#FFF3E4', lineHeight: 1.3 }}>
                            Match Activity → Magnetic Property
                        </h1>
                        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#C1C1EA', fontWeight: 400 }}>
                            Tap an activity → then tap the property that explains it
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 9, padding: '4px 11px' }}>
                        <Star size={12} color="#FC9145" fill="#FC9145" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#FFF3E4', animation: pulseScore ? 'mmScore 0.5s ease-out' : 'none', minWidth: 26, textAlign: 'center' }}>
                            {score}/{total}
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
                    height: '100%', width: `${(matchedCount / total) * 100}%`,
                    background: 'linear-gradient(90deg,#533086,#FF7212)',
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>

            {/* ── MATCHING BODY ── */}
            <div style={{ padding: '13px 13px 6px' }}>

                {/* Column headers */}
                <div style={{ display: 'flex', marginBottom: 9 }}>
                    {[
                        { label: 'Column I — Activities', side: 'left' },
                        { label: '', side: 'spacer' },
                        { label: 'Column II — Properties', side: 'right' },
                    ].map((col, idx) => col.side === 'spacer'
                        ? <div key={idx} style={{ width: 64, flexShrink: 0 }} />
                        : (
                            <div key={idx} style={{
                                flex: '1 1 0', fontSize: 9.5, fontWeight: 700, color: '#4E4E4E',
                                textTransform: 'uppercase', letterSpacing: '1px',
                                paddingBottom: 5, borderBottom: '2px solid #E8E8E8',
                                animation: mounted ? (col.side === 'left' ? 'mmFadeL 0.3s ease-out' : 'mmFadeR 0.3s ease-out') : 'none',
                            }}>
                                {col.label}
                            </div>
                        )
                    )}
                </div>

                {/* Three-column grid */}
                <div style={{ display: 'flex' }}>

                    {/* LEFT — Activities */}
                    <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {mc.activities.map((act, i) => {
                            const matched  = isActMatched(act.id);
                            const isSel    = selAct === act.id;
                            const isWrong  = wrongPair?.aId === act.id;
                            const isOk     = correctAnim === act.id;
                            const showHint = hintFor === act.id && mc.showHints && !matched;
                            const mProp    = matched ? mc.properties.find(p => p.id === matches[act.id]) : null;

                            const border = isOk ? '#10b981' : isWrong ? '#ef4444' : matched ? '#10b98155' : isSel ? act.color : hoverAct === act.id ? `${act.color}55` : '#E0E0E0';
                            const bg     = matched ? '#f0fdf4' : isWrong ? '#fef2f2' : isSel ? `${act.color}08` : '#fff';
                            const anim   = isOk ? 'mmFlash 0.6s ease-out' : (isSel && !matched) ? 'mmGlow 2s ease-in-out infinite' : mounted ? `mmFadeL 0.35s ease-out ${i * 0.07}s both` : 'none';

                            return (
                                <div key={act.id}>
                                    <div
                                        ref={el => { actRefs.current[act.id] = el; }}
                                        onClick={() => !matched && clickAct(act.id)}
                                        onMouseEnter={() => !matched && setHoverAct(act.id)}
                                        onMouseLeave={() => setHoverAct(null)}
                                        style={{
                                            padding: '9px 11px', borderRadius: 11,
                                            border: `2px solid ${border}`, background: bg,
                                            cursor: matched ? 'default' : 'pointer',
                                            transition: 'all 0.22s ease',
                                            transform: isSel ? 'scale(1.012)' : 'scale(1)',
                                            boxShadow: isSel ? `0 2px 10px ${act.color}20` : '0 1px 3px rgba(0,0,0,0.05)',
                                            animation: anim,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                            <div style={{
                                                minWidth: 24, height: 20, borderRadius: 5,
                                                background: matched ? '#10b981' : act.color,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontSize: 9.5, fontWeight: 700,
                                                flexShrink: 0, transition: 'all 0.3s ease',
                                            }}>
                                                {matched ? <Check size={10} /> : ACT_LABELS[i]}
                                            </div>
                                            <span style={{ fontSize: 15, flexShrink: 0 }}>{act.icon}</span>
                                            <span style={{ fontSize: 'clamp(10.5px,1.6vw,11.5px)', fontWeight: 500, color: matched ? '#059669' : '#2d2d2d', lineHeight: 1.45, flex: 1 }}>
                                                {act.text}
                                            </span>
                                        </div>
                                        {matched && mProp && (
                                            <div style={{
                                                marginTop: 4, marginLeft: 31,
                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                                padding: '2px 7px', borderRadius: 5,
                                                background: '#10b981', color: '#fff',
                                                fontSize: 8.5, fontWeight: 700,
                                                animation: 'mmPop 0.35s ease-out',
                                            }}>
                                                <ZapIcon size={7} color="#fff" /> {mProp.label}
                                            </div>
                                        )}
                                    </div>

                                    {/* Hint */}
                                    {showHint && (() => {
                                        const p = mc.properties.find(x => x.id === act.propertyId);
                                        return p ? (
                                            <div style={{
                                                margin: '4px 0 0 4px', padding: '6px 9px',
                                                background: '#fff7ed', border: '1.5px solid #fed7aa',
                                                borderRadius: 7, fontSize: 10.5, color: '#9a3412',
                                                animation: 'mmHint 0.3s ease-out both', lineHeight: 1.4,
                                            }}>
                                                💡 <em>{p.hint}</em>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            );
                        })}
                    </div>

                    {/* CENTRE — SVG lines */}
                    <div ref={svgRef} style={{ width: 64, flexShrink: 0, position: 'relative' }}>
                        <svg width="64" height="100%" style={{ position: 'absolute', top: 0, left: 0, width: 64, height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                            {lines.map((l, i) => (
                                <g key={`${l.aId}-${l.pId}`}>
                                    <path
                                        d={`M 0 ${l.y1} C 32 ${l.y1}, 32 ${l.y2}, 64 ${l.y2}`}
                                        fill="none" stroke={l.color} strokeWidth="2.5" strokeLinecap="round"
                                        strokeDasharray="500"
                                        style={{ animation: `mmLine 0.55s ease-out ${i * 0.08}s both` }}
                                    />
                                    <circle cx="0"  cy={l.y1} r="3.5" fill={l.color} style={{ animation: `mmDot 0.3s ease-out ${0.35 + i * 0.08}s both` }} />
                                    <circle cx="64" cy={l.y2} r="3.5" fill={l.color} style={{ animation: `mmDot 0.3s ease-out ${0.45 + i * 0.08}s both` }} />
                                </g>
                            ))}
                        </svg>
                    </div>

                    {/* RIGHT — Properties */}
                    <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {shuffledProps.map((prop, i) => {
                            const matched  = isPropMatched(prop.id);
                            const isWrong  = wrongPair?.pId === prop.id;
                            const shaking  = shakeProp === prop.id;
                            const hasSel   = !!selAct;

                            const border = isWrong ? '#ef4444' : matched ? '#10b98155' : (hasSel && hoverProp === prop.id) ? '#533086' : '#E0E0E0';
                            const bg     = matched ? '#f0fdf4' : isWrong ? '#fef2f2' : (hasSel && hoverProp === prop.id) ? '#f3f0fa' : '#fff';
                            const anim   = shaking ? 'mmShake 0.45s ease-out' : mounted ? `mmFadeR 0.35s ease-out ${i * 0.07}s both` : 'none';

                            const mActId  = Object.entries(matches).find(([, p]) => p === prop.id)?.[0];
                            const mActIdx = mActId ? mc.activities.findIndex(a => a.id === mActId) : -1;

                            return (
                                <div
                                    key={prop.id}
                                    ref={el => { propRefs.current[prop.id] = el; }}
                                    onClick={() => clickProp(prop.id)}
                                    onMouseEnter={() => !matched && setHoverProp(prop.id)}
                                    onMouseLeave={() => setHoverProp(null)}
                                    style={{
                                        padding: '9px 11px', borderRadius: 11,
                                        border: `2px solid ${border}`, background: bg,
                                        cursor: hasSel && !matched ? 'pointer' : 'default',
                                        transition: 'all 0.22s ease',
                                        transform: (hasSel && hoverProp === prop.id && !matched) ? 'scale(1.012)' : 'scale(1)',
                                        boxShadow: (hasSel && hoverProp === prop.id && !matched) ? '0 2px 10px rgba(83,48,134,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
                                        animation: anim,
                                        opacity: !hasSel && !matched ? 0.52 : 1,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                        <div style={{
                                            minWidth: 24, height: 20, borderRadius: 5,
                                            background: matched ? '#10b981' : '#C1C1EA',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: matched ? '#fff' : '#533086',
                                            fontSize: 9.5, fontWeight: 700,
                                            flexShrink: 0, transition: 'all 0.3s ease',
                                        }}>
                                            {matched ? <Check size={10} /> : PROP_LABELS[i]}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 'clamp(10.5px,1.6vw,11.5px)', fontWeight: 700, color: matched ? '#059669' : '#2d2d2d', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', lineHeight: 1.4 }}>
                                                {prop.label}
                                                {matched && mActIdx >= 0 && (
                                                    <span style={{ fontSize: 8.5, fontWeight: 600, color: '#10b981', background: '#d1fae5', padding: '1px 4px', borderRadius: 4 }}>
                                                        ↔ {ACT_LABELS[mActIdx]}
                                                    </span>
                                                )}
                                                {mc.showChapterRef && (
                                                    <span style={{ fontSize: 8.5, fontWeight: 600, color: '#888', background: '#f0f0f0', padding: '1px 4px', borderRadius: 4 }}>
                                                        {prop.chapterRef}
                                                    </span>
                                                )}
                                            </div>
                                            {mc.showDescription && (
                                                <div style={{ fontSize: 10, color: '#888', marginTop: 2, lineHeight: 1.35 }}>
                                                    {prop.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>

            {/* ── STATUS BAR ── */}
            <div style={{
                padding: '7px 14px',
                background: selAct ? 'linear-gradient(90deg,#53308606,#FF721206)' : '#fafafa',
                borderTop: '1px solid #EBEBEB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
                {selAct
                    ? <ArrowRightIcon size={12} color="#FF7212" />
                    : <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#CACACA' }} />
                }
                <span style={{ fontSize: 10.5, fontWeight: 500, color: selAct ? '#533086' : '#888' }}>
                    {selAct
                        ? 'Now tap the matching property on the right →'
                        : matchedCount === 0 ? 'Tap an activity on the left to begin!'
                        : `${matchedCount} of ${total} matched`}
                </span>
            </div>

        </div>
    );
};

export default MagnetMatchingTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════