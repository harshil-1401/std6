// ═══════════════════════════════════════════════════════════════════════════
// File: handpicking_separation_tool.tsx
// Class 6 Science — Curiosity Ch 9: Methods of Separation of Substances
// Concept: Handpicking — picking out a few larger/odd-coloured impurities
//          (pebbles) from grains (wheat); and WHY it stops being convenient
//          when the pile gets large.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const TOOL_ID = 'handpicking_separation_tool';
const emit = (m: any) => { try { window.parent.postMessage(m, '*'); } catch { } };

type OperatorMode = 'ai' | 'student';

const noop = () => { };

interface ThaliHandle {
    tap: (pebbleId: string) => void;
    highlight: (target?: string) => void;
    reset: () => void;
    getState: () => any;
    listPebbleIds: () => string[];
}
type AgentBridge = { current: ThaliHandle | null };

type IconProps = { size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties };
const mkIcon = (children: React.ReactNode) =>
    ({ size = 24, color = 'currentColor', strokeWidth = 2, style }: IconProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeLinejoin="round" style={style}>{children}</svg>
    );
const RotateCcw = mkIcon(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>);
const Hand = mkIcon(<><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" /><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></>);
const Timer = mkIcon(<><line x1="10" y1="2" x2="14" y2="2" /><line x1="12" y1="14" x2="15" y2="11" /><circle cx="12" cy="14" r="8" /></>);
const CheckCircle2 = mkIcon(<><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>);
const Lightbulb = mkIcon(<><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" /></>);
const Layers = mkIcon(<><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></>);

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'practice' | 'hands_on';

interface StepDetails {
    currentStep: number;
    totalSteps: number;
    isPaused: boolean;
    currentMode: ModeType;
}

interface HandpickingAdditionalProps {
    round1Pebbles?: number;
    round1Grains?: number;
    round2Pebbles?: number;
    round2Grains?: number;
    maxPileGrains?: number;
    maxPilePebbles?: number;
    thaliColor?: string;
    grainColor?: string;
    pebbleColor?: string;
    bowlColor?: string;
    hintText?: string;
    showTimer?: boolean;
    promptAfterRound1?: string;
}

interface HandpickingToolProps {
    props?: {
        width?: number;
        height?: number;
        initialMode?: ModeType;
        showModeSelector?: boolean;
        enabledModes?: ModeType[];
        animationSpeed?: number;
        themeColor?: string;
        darkMode?: boolean;
        operatorMode?: OperatorMode;
        muted?: boolean;
        additionalProps?: HandpickingAdditionalProps;
    };
    setStepDetails?: (stepDetails: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== ITEM GENERATION ====================

type ItemKind = 'wheat' | 'pebble';

interface PileItem {
    id: number;
    kind: ItemKind;
    x: number;
    y: number;
    size: number;
    rot: number;
    variant: number;
}

let __idSeq = 1;

const genPile = (grains: number, pebbles: number): PileItem[] => {
    const items: PileItem[] = [];
    const place = (): { x: number; y: number } => {
        for (let t = 0; t < 30; t++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * 0.42;
            const x = 0.5 + Math.cos(a) * r;
            const y = 0.5 + Math.sin(a) * r;
            return { x: x * 100, y: y * 100 };
        }
        return { x: 50, y: 50 };
    };
    for (let i = 0; i < grains; i++) {
        const p = place();
        items.push({
            id: __idSeq++, kind: 'wheat', x: p.x, y: p.y,
            size: 19 + Math.random() * 8,
            rot: Math.random() * 360,
            variant: Math.floor(Math.random() * 3),
        });
    }
    for (let i = 0; i < pebbles; i++) {
        const p = place();
        items.push({
            id: __idSeq++, kind: 'pebble', x: p.x, y: p.y,
            size: 22 + Math.random() * 9,
            rot: Math.random() * 360,
            variant: Math.floor(Math.random() * 3),
        });
    }
    return items;
};

// ==================== SHAPE COMPONENTS ====================

const WheatGrain: React.FC<{ size: number; rot: number; variant: number; color: string }> =
    ({ size, rot, variant, color }) => {
        const tint = ['#d9a64a', '#c79038', '#e0b65e'][variant] || color;
        const uid = useRef(Math.random().toString(36).slice(2)).current;
        const gid = 'wg' + uid;
        const glid = 'wgl' + uid;
        return (
            <svg width={size} height={size * 0.5} viewBox="0 0 60 28"
                style={{ transform: `rotate(${rot}deg)`, display: 'block', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.28))' }}>
                <defs>
                    <linearGradient id={gid} x1="0%" y1="10%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={lighten(tint, 26)} />
                        <stop offset="48%" stopColor={tint} />
                        <stop offset="100%" stopColor={darken(tint, 26)} />
                    </linearGradient>
                    <radialGradient id={glid} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fff8e6" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#fff8e6" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <path d="M 8 14 C 8 7 16 4 26 4 C 42 4 55 8 58 14 C 55 20 42 24 26 24 C 16 24 8 21 8 14 Z"
                    fill={`url(#${gid})`} stroke={darken(tint, 30)} strokeWidth="1" />
                <path d="M 12 14 C 26 11.5 44 11.5 56 14" fill="none"
                    stroke={darken(tint, 30)} strokeWidth="1.2" opacity="0.55" strokeLinecap="round" />
                <path d="M 8 11 L 3 9 M 8 14 L 2 14 M 8 17 L 3 19" stroke={darken(tint, 18)}
                    strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
                <ellipse cx="30" cy="10" rx="13" ry="3.4" fill={`url(#${glid})`} />
            </svg>
        );
    };

const Pebble: React.FC<{ size: number; rot: number; variant: number; color: string }> =
    ({ size, rot, variant, color }) => {
        const paths = [
            'M 30 4 C 45 2 57 11 57 25 C 57 39 45 47 29 46 C 15 45 4 37 5 24 C 6 12 16 6 30 4 Z',
            'M 28 3 C 44 1 58 9 56 26 C 55 40 42 48 27 46 C 13 44 3 35 5 22 C 7 10 16 5 28 3 Z',
            'M 31 5 C 46 5 56 14 55 27 C 54 41 41 46 27 45 C 14 44 5 36 6 23 C 7 11 18 5 31 5 Z',
        ];
        const tint = ['#8c9096', '#787c82', '#9aa0a6'][variant] || color;
        const gid = useRef('pg' + Math.random().toString(36).slice(2)).current;
        return (
            <svg width={size} height={size * 0.82} viewBox="0 0 62 50"
                style={{ transform: `rotate(${rot}deg)`, display: 'block', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }}>
                <defs>
                    <radialGradient id={gid} cx="36%" cy="30%" r="80%">
                        <stop offset="0%" stopColor={lighten(tint, 26)} />
                        <stop offset="55%" stopColor={tint} />
                        <stop offset="100%" stopColor={darken(tint, 22)} />
                    </radialGradient>
                </defs>
                <path d={paths[variant] || paths[0]} fill={`url(#${gid})`} stroke={darken(tint, 28)} strokeWidth="1" />
                <ellipse cx="22" cy="17" rx="6" ry="3.4" fill="#ffffff" opacity="0.4" />
            </svg>
        );
    };

// tiny colour helpers (hex only)
function clamp(n: number) { return Math.max(0, Math.min(255, n)); }
function hexToRgb(h: string) {
    const m = h.replace('#', '');
    const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number) {
    return '#' + [r, g, b].map(x => clamp(Math.round(x)).toString(16).padStart(2, '0')).join('');
}
function lighten(h: string, amt: number) { const [r, g, b] = hexToRgb(h); return toHex(r + amt, g + amt, b + amt); }
function darken(h: string, amt: number) { const [r, g, b] = hexToRgb(h); return toHex(r - amt, g - amt, b - amt); }

// ==================== MAIN COMPONENT ====================

const HandpickingSeparationTool: React.FC<HandpickingToolProps> = ({
    props, setStepDetails,
}) => {
    const p = props ?? {};
    const config = useMemo(() => {
        const initialMode: ModeType = p.initialMode ?? 'practice';
        const enabledModes: ModeType[] = p.enabledModes ?? ['practice', 'hands_on'];
        return {
            width: p.width ?? 820,
            initialMode,
            showModeSelector: p.showModeSelector ?? true,
            enabledModes,
            animationSpeed: p.animationSpeed ?? 1,
            themeColor: p.themeColor ?? '#b8860b',
            darkMode: p.darkMode ?? false,
        };
    }, [p]);

    const ap = p.additionalProps || {};
    const tool = useMemo(() => ({
        r1Pebbles: ap.round1Pebbles ?? 7,
        r1Grains: ap.round1Grains ?? 500,
        r2Pebbles: ap.round2Pebbles ?? 30,
        r2Grains: ap.round2Grains ?? 650,
        maxPileGrains: ap.maxPileGrains ?? 700,
        maxPilePebbles: ap.maxPilePebbles ?? 60,
        thaliColor: ap.thaliColor ?? '#8a5a33',
        grainColor: ap.grainColor ?? '#d9a64a',
        pebbleColor: ap.pebbleColor ?? '#868b91',
        bowlColor: ap.bowlColor ?? '#cfd6dc',
        hintText: ap.hintText ?? 'That is a wheat grain — small, golden and oval with a groove down the middle. Pebbles are larger, dull grey and round.',
        showTimer: ap.showTimer ?? true,
        promptAfterRound1: ap.promptAfterRound1 ?? 'Quick and easy with just a few pebbles. But what if the heap were much bigger?',
    }), [ap]);

    const colors = {
        primary: config.themeColor,
        bg: config.darkMode ? '#1b160e' : '#fbf5e6',
        surface: config.darkMode ? '#241d12' : '#ffffff',
        text: config.darkMode ? '#f1e9d6' : '#3a2f1c',
        subtle: config.darkMode ? '#b9ad93' : '#8a7a59',
        border: config.darkMode ? '#3a2f1c' : '#ecdfc2',
        success: '#3e8e5a',
    };

    const [mode, setMode] = useState<ModeType>(config.initialMode);
    const [fade, setFade] = useState(1);
    const [operatorMode, setOperatorMode] = useState<OperatorMode>(p.operatorMode ?? 'student');

    const bridge = useRef<ThaliHandle | null>(null) as AgentBridge;

    useEffect(() => {
        const css = `
        @keyframes hp-fadeUp { from { opacity:0; transform:translateY(22px);} to {opacity:1; transform:translateY(0);} }
        @keyframes hp-pop { 0%{transform:scale(0);opacity:0;} 70%{transform:scale(1.18);} 100%{transform:scale(1);opacity:1;} }
        @keyframes hp-shake { 0%,100%{transform:translateX(0) rotate(0);} 20%{transform:translateX(-5px) rotate(-6deg);} 40%{transform:translateX(5px) rotate(6deg);} 60%{transform:translateX(-4px) rotate(-4deg);} 80%{transform:translateX(4px) rotate(4deg);} }
        @keyframes hp-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.06);} }
        @keyframes hp-glow { 0%,100%{box-shadow:0 0 0 0 ${config.themeColor}00;} 50%{box-shadow:0 0 0 8px ${config.themeColor}33;} }
        @keyframes hp-rise { from{opacity:0;transform:translateY(8px) scale(.96);} to{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes hp-spin { to { transform: rotate(360deg);} }
        @keyframes hp-bob { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
        @keyframes hp-hintpulse { 0%,100%{transform:translate(-50%,-50%) scale(1);} 50%{transform:translate(-50%,-50%) scale(1.22);} }
        `;
        const el = document.createElement('style');
        el.id = 'hp-keyframes';
        el.textContent = css;
        document.head.appendChild(el);
        return () => { const e = document.getElementById('hp-keyframes'); if (e) e.remove(); };
    }, [config.themeColor]);

    const switchMode = useCallback((m: ModeType) => {
        if (m === mode) return;
        setFade(0);
        setTimeout(() => { setMode(m); setFade(1); }, 220);
        emit({ type: 'event', name: 'mode_changed', detail: { mode: m } });
    }, [mode]);

    useEffect(() => {
        setStepDetails?.({ currentStep: 1, totalSteps: 1, isPaused: true, currentMode: mode });
    }, [mode, setStepDetails]);

    useEffect(() => { if (p.operatorMode) setOperatorMode(p.operatorMode); }, [p.operatorMode]);

    const api = useMemo(() => ({
        setParam: (name: string, value: any) => {
            if (name === 'operatorMode') setOperatorMode(value === 'ai' ? 'ai' : 'student');
            emit({ type: 'event', name: 'param_changed', detail: { name, value } });
        },
        play: () => emit({ type: 'event', name: 'play', detail: {} }),
        pause: () => emit({ type: 'event', name: 'pause', detail: {} }),
        reset: () => { bridge.current?.reset(); emit({ type: 'event', name: 'reset', detail: {} }); },
        highlight: (target?: string) => { bridge.current?.highlight(target); },
        getState: () => emit({
            type: 'state',
            state: { mode, operatorMode, ...(bridge.current?.getState?.() ?? {}) },
        }),
        setOperatorMode: (m: OperatorMode) => {
            const v = m === 'ai' ? 'ai' : 'student';
            setOperatorMode(v);
            emit({ type: 'event', name: 'operator_mode_changed', detail: { operatorMode: v } });
        },
        setMode: (m: ModeType) => switchMode(m === 'hands_on' ? 'hands_on' : 'practice'),
        tap: (pebbleId: string) => bridge.current?.tap(pebbleId),
        listPebbleIds: () => bridge.current?.listPebbleIds?.() ?? [],
    }), [mode, operatorMode, switchMode]);

    const apiRef = useRef(api); apiRef.current = api;

    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            const d: any = e.data;
            if (!d || d.type !== 'command') return;
            const fn = (apiRef.current as any)[d.method];
            let result;
            try { if (typeof fn === 'function') result = fn(...(d.args || [])); } catch { /* never throw out */ }
            emit({ type: 'response', id: d.id, result });
        };
        window.addEventListener('message', onMsg);
        emit({ type: 'ready', toolId: TOOL_ID });
        return () => window.removeEventListener('message', onMsg);
    }, []);

    const isAI = operatorMode === 'ai';

    const modeMeta: Record<ModeType, { label: string; from: string; to: string }> = {
        practice: { label: 'Pick It', from: '#b54a32', to: '#d96a3f' },
        hands_on: { label: 'Free Pile', from: '#2f8f6a', to: '#46b083' },
    };

    const styles = {
        shell: {
            width: '100%', maxWidth: config.width, margin: '0 auto',
            background: colors.surface, borderRadius: 26, overflow: 'hidden',
            boxShadow: '0 30px 60px -20px rgba(60,40,10,0.35)',
            fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
            color: colors.text, border: `1px solid ${colors.border}`,
        } as React.CSSProperties,
        tabs: {
            display: config.showModeSelector ? 'flex' : 'none', gap: 8,
            padding: 14, background: colors.bg, borderBottom: `1px solid ${colors.border}`,
            justifyContent: 'center', flexWrap: 'wrap',
        } as React.CSSProperties,
        tab: (sel: boolean, from: string, to: string): React.CSSProperties => ({
            padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 14, transition: 'all .25s cubic-bezier(.4,0,.2,1)',
            background: sel ? `linear-gradient(135deg, ${from}, ${to})` : colors.surface,
            color: sel ? '#fff' : colors.subtle,
            boxShadow: sel ? '0 6px 16px rgba(0,0,0,0.18)' : 'none',
            transform: sel ? 'translateY(-1px)' : 'none',
        }),
        body: { padding: 26, opacity: fade, transition: `opacity ${220 / config.animationSpeed}ms ease` } as React.CSSProperties,
    };

    return (
        <div style={styles.shell}>
            {!isAI && (
                <div style={styles.tabs}>
                    {config.enabledModes.map(m => (
                        <button key={m} onClick={() => switchMode(m)}
                            style={styles.tab(mode === m, modeMeta[m].from, modeMeta[m].to)}>
                            {modeMeta[m].label}
                        </button>
                    ))}
                </div>
            )}

            {isAI && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '12px 14px', background: colors.bg, borderBottom: `1px solid ${colors.border}`,
                    color: colors.subtle, fontWeight: 700, fontSize: 13.5,
                }}>
                    👩‍🏫 Your teacher is showing you — watch how the pebbles come out. You'll get a turn.
                </div>
            )}

            <div style={styles.body}>
                {mode === 'practice' && (
                    <PracticeFlow tool={tool} colors={colors} speed={config.animationSpeed}
                        bridge={bridge} isAI={isAI} />
                )}
                {mode === 'hands_on' && (
                    <FreePile tool={tool} colors={colors} speed={config.animationSpeed}
                        bridge={bridge} isAI={isAI} />
                )}
            </div>
        </div>
    );
};

// ==================== THE THALI GAME (core) ====================

interface ThaliGameProps {
    grains: number;
    pebbles: number;
    tool: any;
    colors: any;
    speed: number;
    onDone: (timeMs: number, wrongTaps: number) => void;
    roundKey: string | number;
    bridge?: AgentBridge;
    isAI?: boolean;
}

const GrainBed = React.memo(function GrainBed({ grains, shaking, color, onTap }: {
    grains: PileItem[]; shaking: Set<number>; color: string; onTap: (it: PileItem) => void;
}) {
    return (
        <>
            {grains.map(it => (
                <div key={it.id}
                    onClick={() => onTap(it)}
                    style={{
                        position: 'absolute', left: `${it.x}%`, top: `${it.y}%`,
                        transform: 'translate(-50%,-50%)',
                        zIndex: 10, cursor: 'pointer', lineHeight: 0,
                        animation: shaking.has(it.id) ? 'hp-shake .48s ease' : undefined,
                    }}>
                    <WheatGrain size={it.size} rot={it.rot} variant={it.variant} color={color} />
                </div>
            ))}
        </>
    );
});

const ThaliGame: React.FC<ThaliGameProps> = ({ grains, pebbles, tool, colors, speed, onDone, roundKey, bridge, isAI }) => {
    const [grainItems, setGrainItems] = useState<PileItem[]>(() => genPile(grains, 0));
    const [pebbleItems, setPebbleItems] = useState<PileItem[]>(() => genPile(0, pebbles));
    const [pickedCount, setPickedCount] = useState(0);
    const [wrongTaps, setWrongTaps] = useState(0);
    const [hint, setHint] = useState<string | null>(null);
    const [shaking, setShaking] = useState<Set<number>>(new Set());
    const [flying, setFlying] = useState<Record<number, { dx: number; dy: number }>>({});
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [finished, setFinished] = useState(false);
    const [hintId, setHintId] = useState<number | null>(null);

    const elRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const bowlRef = useRef<HTMLDivElement | null>(null);
    const hintTimer = useRef<any>(null);
    const pointTimer = useRef<any>(null);

    const totalPebbles = pebbles;

    const idMap = useMemo(() => {
        const m: Record<string, number> = {};
        pebbleItems.forEach((it, i) => { m[`pebble-${i}`] = it.id; });
        return m;
    }, [pebbleItems]);
    const idMapRef = useRef(idMap); idMapRef.current = idMap;

    useEffect(() => {
        setGrainItems(genPile(grains, 0));
        setPebbleItems(genPile(0, pebbles));
        setPickedCount(0); setWrongTaps(0); setHint(null);
        setShaking(new Set()); setFlying({});
        setStartTime(null); setElapsed(0); setFinished(false); setHintId(null);
    }, [roundKey, grains, pebbles]);

    useEffect(() => {
        if (startTime == null || finished) return;
        const id = setInterval(() => setElapsed(performance.now() - startTime), 73);
        return () => clearInterval(id);
    }, [startTime, finished]);

    useEffect(() => {
        if (!finished && totalPebbles > 0 && pickedCount >= totalPebbles && startTime != null) {
            setFinished(true);
            const t = performance.now() - startTime;
            setElapsed(t);
            emit({ type: 'event', name: 'completed', detail: { timeMs: Math.round(t), wrong: wrongTaps, totalPebbles } });
            setTimeout(() => onDone(t, wrongTaps), 450);
        }
    }, [pickedCount, totalPebbles, finished, startTime, wrongTaps, onDone]);

    const finishedRef = useRef(false);
    const pickingRef = useRef<Set<number>>(new Set());
    useEffect(() => { finishedRef.current = finished; }, [finished]);
    useEffect(() => { pickingRef.current = new Set(); }, [roundKey, grains, pebbles]);

    const ensureTimer = useCallback(() => {
        setStartTime(prev => prev ?? performance.now());
    }, []);

    const tapPebble = useCallback((it: PileItem) => {
        if (finishedRef.current || pickingRef.current.has(it.id)) return;
        pickingRef.current.add(it.id);
        ensureTimer();
        const el = elRefs.current[it.id];
        const bowl = bowlRef.current;
        let dx = 80, dy = -160;
        if (el && bowl) {
            const r = el.getBoundingClientRect();
            const b = bowl.getBoundingClientRect();
            dx = (b.left + b.width / 2) - (r.left + r.width / 2);
            dy = (b.top + b.height / 2) - (r.top + r.height / 2);
        }
        setFlying(pp => ({ ...pp, [it.id]: { dx, dy } }));
        setPickedCount(c => c + 1);
        setHintId(h => (h === it.id ? null : h));
        const exposedId = Object.keys(idMapRef.current).find(k => idMapRef.current[k] === it.id) ?? String(it.id);
        emit({ type: 'event', name: 'item_placed', detail: { itemId: exposedId, kind: 'pebble' } });
        setTimeout(() => {
            setPebbleItems(prev => prev.filter(x => x.id !== it.id));
            setFlying(pp => { const n = { ...pp }; delete n[it.id]; return n; });
        }, 560 / speed);
    }, [ensureTimer, speed]);

    const tapWheat = useCallback((it: PileItem) => {
        if (finishedRef.current) return;
        ensureTimer();
        setWrongTaps(w => w + 1);
        setShaking(s => new Set(s).add(it.id));
        setTimeout(() => setShaking(s => { const n = new Set(s); n.delete(it.id); return n; }), 480);
        setHint(tool.hintText);
        clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => setHint(null), 2600);
        emit({ type: 'event', name: 'answer_incorrect', detail: { kind: 'wheat' } });
    }, [ensureTimer, tool.hintText]);

    const tapById = useCallback((pebbleId: string) => {
        const internal = idMapRef.current[pebbleId];
        const target = internal != null ? internal : Number(pebbleId);
        const it = pebbleItems.find(x => x.id === target);
        if (it) tapPebble(it);
    }, [pebbleItems, tapPebble]);

    const highlightById = useCallback((targetRaw?: string) => {
        let internal: number | undefined;
        if (!targetRaw || targetRaw === 'next' || targetRaw === 'pebble') {
            internal = pebbleItems[0]?.id;
        } else {
            internal = idMapRef.current[targetRaw];
            if (internal == null && !Number.isNaN(Number(targetRaw))) internal = Number(targetRaw);
        }
        if (internal == null) return;
        setHintId(internal);
        clearTimeout(pointTimer.current);
        pointTimer.current = setTimeout(() => setHintId(h => (h === internal ? null : h)), 2400);
        const exposed = Object.keys(idMapRef.current).find(k => idMapRef.current[k] === internal) ?? String(internal);
        emit({ type: 'event', name: 'highlighted', detail: { target: exposed } });
    }, [pebbleItems]);

    useEffect(() => {
        if (!bridge) return;
        bridge.current = {
            tap: tapById,
            highlight: highlightById,
            reset: () => {
                setGrainItems(genPile(grains, 0));
                setPebbleItems(genPile(0, pebbles));
                setPickedCount(0); setWrongTaps(0); setHint(null);
                setShaking(new Set()); setFlying({});
                setStartTime(null); setElapsed(0); setFinished(false); setHintId(null);
                pickingRef.current = new Set();
            },
            getState: () => ({
                remaining: totalPebbles - pickedCount,
                totalPebbles, picked: pickedCount, wrong: wrongTaps,
                timeMs: Math.round(elapsed), finished,
                pebbleIds: Object.keys(idMapRef.current),
            }),
            listPebbleIds: () => Object.keys(idMapRef.current),
        };
        return () => { if (bridge.current && bridge.current.tap === tapById) bridge.current = null; };
    }, [bridge, tapById, highlightById, grains, pebbles, totalPebbles, pickedCount, wrongTaps, elapsed, finished]);

    const remaining = totalPebbles - pickedCount;
    const secs = (elapsed / 1000).toFixed(1);

    return (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' }}>
            <div style={{ flex: '1 1 360px', minWidth: 300, maxWidth: 460 }}>
                <div style={{
                    position: 'relative', width: '100%', aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 38% 32%, ${lighten(tool.thaliColor, 40)} 0%, ${tool.thaliColor} 46%, ${darken(tool.thaliColor, 26)} 100%)`,
                    boxShadow: `inset 0 0 0 10px ${darken(tool.thaliColor, 14)}, inset 0 14px 40px rgba(0,0,0,0.28), 0 18px 36px -14px rgba(0,0,0,0.4)`,
                    border: `3px solid ${darken(tool.thaliColor, 30)}`,
                    overflow: 'visible',
                    animation: 'hp-rise .5s ease both',
                }}>
                    <div style={{
                        position: 'absolute', inset: 6, borderRadius: '50%',
                        boxShadow: `inset 0 0 30px ${lighten(tool.thaliColor, 30)}55`, pointerEvents: 'none',
                    }} />

                    <GrainBed grains={grainItems} shaking={shaking} color={tool.grainColor} onTap={isAI ? noop : tapWheat} />

                    {pebbleItems.map(it => {
                        const fly = flying[it.id];
                        const isHint = hintId === it.id;
                        return (
                            <div key={it.id}
                                ref={el => { elRefs.current[it.id] = el; }}
                                onClick={() => !isAI && tapPebble(it)}
                                style={{
                                    position: 'absolute', left: `${it.x}%`, top: `${it.y}%`,
                                    transform: fly
                                        ? `translate(-50%,-50%) translate(${fly.dx}px, ${fly.dy}px) scale(0.25) rotate(140deg)`
                                        : 'translate(-50%,-50%)',
                                    transition: fly ? `transform ${0.55 / speed}s cubic-bezier(.5,-0.3,.3,1), opacity ${0.55 / speed}s ease` : 'transform .15s',
                                    opacity: fly ? 0 : 1,
                                    zIndex: fly ? 60 : 30,
                                    cursor: isAI ? 'default' : 'pointer', lineHeight: 0,
                                    borderRadius: '50%',
                                    boxShadow: isHint ? `0 0 0 4px ${colors.primary || '#b8860b'}, 0 0 16px 4px ${(colors.primary || '#b8860b')}aa` : 'none',
                                    animation: fly ? undefined : (isHint ? 'hp-hintpulse 1s ease infinite' : 'hp-pop .4s ease both'),
                                }}>
                                <Pebble size={it.size} rot={it.rot} variant={it.variant} color={tool.pebbleColor} />
                            </div>
                        );
                    })}
                </div>
                <p style={{ textAlign: 'center', marginTop: 14, color: colors.subtle, fontWeight: 600, fontSize: 14 }}>
                    Tap every grey pebble. Tap a wheat grain by mistake and you'll get a hint.
                </p>
            </div>

            <div style={{ flex: '0 1 240px', minWidth: 220, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    {tool.showTimer && (
                        <Stat icon={<Timer size={18} />} label="Time" value={`${secs}s`} colors={colors} accent="#b54a32" pulse={startTime != null && !finished} />
                    )}
                    <Stat icon={<Hand size={18} />} label="Left" value={`${remaining}`} colors={colors} accent={colors.success} />
                </div>

                <div style={{ position: 'relative', display: 'grid', placeItems: 'center', padding: '8px 0' }}>
                    <div ref={bowlRef} style={{
                        width: 150, height: 96, borderRadius: '0 0 80px 80px',
                        background: `linear-gradient(180deg, ${lighten(tool.bowlColor, 8)}, ${darken(tool.bowlColor, 18)})`,
                        border: `3px solid ${darken(tool.bowlColor, 26)}`,
                        boxShadow: 'inset 0 8px 18px rgba(0,0,0,0.18), 0 10px 22px -10px rgba(0,0,0,0.4)',
                        position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{
                            position: 'absolute', top: -8, left: -3, right: -3, height: 16, borderRadius: '50%',
                            background: `linear-gradient(180deg, ${lighten(tool.bowlColor, 14)}, ${tool.bowlColor})`,
                            border: `3px solid ${darken(tool.bowlColor, 26)}`,
                        }} />
                        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, padding: '0 10px' }}>
                            {Array.from({ length: Math.min(pickedCount, 14) }).map((_, k) => (
                                <span key={k} style={{ animation: 'hp-pop .35s ease both' }}>
                                    <Pebble size={16} rot={k * 47} variant={k % 3} color={tool.pebbleColor} />
                                </span>
                            ))}
                        </div>
                    </div>
                    <span style={{ marginTop: 8, fontWeight: 800, color: colors.text, fontSize: 15 }}>
                        Pebble bowl · {pickedCount}
                    </span>
                </div>

                <div style={{ minHeight: 64 }}>
                    {hint && (
                        <div style={{
                            display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 14,
                            background: '#fff4e0', border: '1px solid #f0c987', color: '#7a4a12',
                            animation: 'hp-rise .3s ease both', fontSize: 14, lineHeight: 1.5, fontWeight: 600,
                        }}>
                            <Lightbulb size={20} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{hint}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Stat: React.FC<{ icon: React.ReactElement; label: string; value: string; colors: any; accent: string; pulse?: boolean }> =
    ({ icon, label, value, colors, accent, pulse }) => (
        <div style={{
            flex: 1, background: colors.bg, borderRadius: 14, padding: '12px 10px',
            border: `1px solid ${colors.border}`, textAlign: 'center',
            animation: pulse ? 'hp-glow 1.6s ease infinite' : 'none',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: accent, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {icon}{label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.text, marginTop: 2 }}>{value}</div>
        </div>
    );

// ==================== PRACTICE FLOW ====================

const PracticeFlow: React.FC<{ tool: any; colors: any; speed: number; bridge?: AgentBridge; isAI?: boolean }> = ({ tool, colors, speed, bridge, isAI }) => {
    const [round, setRound] = useState(1);
    const [phase, setPhase] = useState<'play' | 'result'>('play');
    const [result, setResult] = useState<{ time: number; wrong: number } | null>(null);
    const [r1Time, setR1Time] = useState<number | null>(null);

    const cfg = round === 1
        ? { grains: tool.r1Grains, pebbles: tool.r1Pebbles }
        : { grains: tool.r2Grains, pebbles: tool.r2Pebbles };

    const handleDone = useCallback((time: number, wrong: number) => {
        if (round === 1) setR1Time(time);
        setResult({ time, wrong });
        setPhase('result');
    }, [round]);

    const startBigger = () => { setRound(2); setPhase('play'); setResult(null); };
    const restart = () => { setRound(1); setPhase('play'); setResult(null); setR1Time(null); };

    const headColor = round === 1 ? '#b54a32' : '#7a3b8f';

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: headColor }}>
                        <Hand size={16} /> Round {round} · {cfg.pebbles} pebbles in {cfg.grains} wheat grains
                    </span>
                    <h2 style={{ fontSize: 26, fontWeight: 800, margin: '6px 0 0' }}>
                        {round === 1 ? 'Pick the pebbles out' : 'Now the big pile'}
                    </h2>
                </div>
                <button onClick={restart} style={{
                    display: isAI ? 'none' : 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12,
                    border: `1px solid ${colors.border}`, background: colors.surface, color: colors.subtle,
                    fontWeight: 700, cursor: 'pointer', fontSize: 13,
                }}>
                    <RotateCcw size={15} /> Restart
                </button>
            </div>

            {phase === 'play' && (
                <ThaliGame grains={cfg.grains} pebbles={cfg.pebbles} tool={tool} colors={colors}
                    speed={speed} onDone={handleDone} roundKey={round} bridge={bridge} isAI={isAI} />
            )}

            {phase === 'result' && result && (
                <ResultCard round={round} result={result} r1Time={r1Time} tool={tool} colors={colors}
                    onBigger={startBigger} onRestart={restart} />
            )}
        </div>
    );
};

const ResultCard: React.FC<{
    round: number; result: { time: number; wrong: number }; r1Time: number | null;
    tool: any; colors: any; onBigger: () => void; onRestart: () => void;
}> = ({ round, result, r1Time, tool, colors, onBigger, onRestart }) => {
    const secs = (result.time / 1000).toFixed(1);
    const perPebble = (result.time / 1000 / (round === 1 ? tool.r1Pebbles : tool.r2Pebbles)).toFixed(2);

    return (
        <div style={{ animation: 'hp-fadeUp .5s ease both', maxWidth: 640, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{ display: 'inline-grid', placeItems: 'center', width: 72, height: 72, borderRadius: '50%', background: '#e7f5ec', color: '#3e8e5a', marginBottom: 10, animation: 'hp-pop .5s ease both' }}>
                    <CheckCircle2 size={40} />
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
                    {round === 1 ? 'Thali cleaned!' : 'Big pile done — phew!'}
                </h2>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
                <Stat icon={<Timer size={18} />} label="Time taken" value={`${secs}s`} colors={colors} accent="#b54a32" />
                <Stat icon={<Hand size={18} />} label="Per pebble" value={`${perPebble}s`} colors={colors} accent="#7a5cc0" />
                <Stat icon={<Lightbulb size={18} />} label="Grain mis-taps" value={`${result.wrong}`} colors={colors} accent="#d89a2a" />
            </div>

            {round === 1 ? (
                <div style={{
                    padding: 22, borderRadius: 18, background: colors.bg, border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <p style={{ fontSize: 18, lineHeight: 1.6, margin: '0 0 18px', color: colors.text }}>
                        {tool.promptAfterRound1}
                    </p>
                    <button onClick={onBigger} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px', borderRadius: 14,
                        border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 16, color: '#fff',
                        background: 'linear-gradient(135deg, #7a3b8f, #a05cc0)', boxShadow: '0 10px 24px -8px rgba(120,60,140,0.6)',
                        animation: 'hp-bob 2s ease infinite',
                    }}>
                        <Layers size={20} /> Load the bigger pile
                    </button>
                </div>
            ) : (
                <div style={{
                    padding: 24, borderRadius: 18, background: '#f3eefa', border: '1px solid #d9c9f0',
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#7a3b8f', marginBottom: 8 }}>
                        <Lightbulb size={16} /> What we learnt
                    </span>
                    <p style={{ fontSize: 17, lineHeight: 1.65, color: '#3a2f1c', margin: '4px 0 0' }}>
                        Same picking, same fingers — but the big pile took far longer{r1Time ? ` (about ${(result.time / r1Time).toFixed(0)}× round 1)` : ''}, and it got tiring.
                        Handpicking is convenient only when impurities are <b>few</b> and easy to spot.
                        For large quantities, we use faster methods like <b>winnowing</b> and <b>sieving</b> instead.
                    </p>
                    <button onClick={onRestart} style={{
                        marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 13,
                        border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, color: '#fff',
                        background: 'linear-gradient(135deg, #b54a32, #d96a3f)',
                    }}>
                        <RotateCcw size={18} /> Try again from round 1
                    </button>
                </div>
            )}
        </div>
    );
};

// ==================== FREE PILE (Hands On) ====================

const FreePile: React.FC<{ tool: any; colors: any; speed: number; bridge?: AgentBridge; isAI?: boolean }> = ({ tool, colors, speed, bridge, isAI }) => {
    const [grains, setGrains] = useState(250);
    const [pebbles, setPebbles] = useState(8);
    const [key, setKey] = useState(0);
    const [lastTime, setLastTime] = useState<number | null>(null);

    const handleDone = useCallback((t: number) => setLastTime(t), []);
    const reload = () => { setLastTime(null); setKey(k => k + 1); };

    return (
        <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#2f8f6a', marginBottom: 6 }}>
                <Layers size={16} /> Build your own pile
            </span>
            <h2 style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 16px' }}>Set the pile, then time yourself</h2>

            <div style={{ display: isAI ? 'none' : 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
                <Slider label={`Wheat grains: ${grains}`} value={grains} min={10} max={tool.maxPileGrains} onChange={setGrains} colors={colors} accent="#c79038" />
                <Slider label={`Pebbles: ${pebbles}`} value={pebbles} min={1} max={tool.maxPilePebbles} onChange={setPebbles} colors={colors} accent="#868b91" />
                <button onClick={reload} style={{
                    alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 7, padding: '12px 20px', borderRadius: 13,
                    border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#fff',
                    background: 'linear-gradient(135deg, #2f8f6a, #46b083)',
                }}>
                    <RotateCcw size={16} /> New pile
                </button>
            </div>

            {lastTime != null && (
                <p style={{ margin: '0 0 14px', color: colors.subtle, fontWeight: 600 }}>
                    Last clear: <b style={{ color: colors.text }}>{(lastTime / 1000).toFixed(1)}s</b> for {pebbles} pebbles
                    {pebbles > 0 ? ` (${(lastTime / 1000 / pebbles).toFixed(2)}s each)` : ''}. Push the pebble count up and watch the time climb.
                </p>
            )}

            <ThaliGame key={key} grains={grains} pebbles={pebbles} tool={tool} colors={colors}
                speed={speed} onDone={handleDone} roundKey={`${key}-${grains}-${pebbles}`} bridge={bridge} isAI={isAI} />
        </div>
    );
};

const Slider: React.FC<{ label: string; value: number; min: number; max: number; onChange: (n: number) => void; colors: any; accent: string }> =
    ({ label, value, min, max, onChange, colors, accent }) => (
        <div style={{ flex: '1 1 200px', minWidth: 180 }}>
            <label style={{ display: 'block', fontWeight: 800, fontSize: 14, marginBottom: 8, color: colors.text }}>{label}</label>
            <input type="range" min={min} max={max} value={value}
                onChange={e => onChange(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: accent, cursor: 'pointer' }} />
        </div>
    );

export default HandpickingSeparationTool;
export { HandpickingSeparationTool };