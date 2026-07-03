// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: handpicking_separation_tool.tsx
// Class 6 Science — Curiosity Ch 9: Methods of Separation of Substances
// Concept: Handpicking — picking out a few larger/odd-coloured impurities
//          (pebbles) from grains (wheat); and WHY it stops being convenient
//          when the pile gets large.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// Inline icons — no external icon library, so the tool renders on any harness.
// Drop-in compatible: each accepts size / color / strokeWidth / style.
type IconProps = { size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties };
const mkIcon = (children: React.ReactNode) =>
    ({ size = 24, color = 'currentColor', strokeWidth = 2, style }: IconProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeLinejoin="round" style={style}>{children}</svg>
    );
const Play = mkIcon(<polygon points="6 3 20 12 6 21 6 3" />);
const Pause = mkIcon(<><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>);
const ChevronLeft = mkIcon(<path d="m15 18-6-6 6-6" />);
const ChevronRight = mkIcon(<path d="m9 18 6-6-6-6" />);
const RotateCcw = mkIcon(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>);
const Hand = mkIcon(<><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" /><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></>);
const Timer = mkIcon(<><line x1="10" y1="2" x2="14" y2="2" /><line x1="12" y1="14" x2="15" y2="11" /><circle cx="12" cy="14" r="8" /></>);
const Sparkles = mkIcon(<><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" /><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" /></>);
const CheckCircle2 = mkIcon(<><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>);
const Lightbulb = mkIcon(<><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" /></>);
const Layers = mkIcon(<><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></>);
const Wheat = mkIcon(<><path d="M12 2v20" /><path d="M12 8c-2 0-4-1-4-3 2 0 4 1 4 3Z" /><path d="M12 8c2 0 4-1 4-3-2 0-4 1-4 3Z" /><path d="M12 13c-2 0-4-1-4-3 2 0 4 1 4 3Z" /><path d="M12 13c2 0 4-1 4-3-2 0-4 1-4 3Z" /><path d="M12 18c-2 0-4-1-4-3 2 0 4 1 4 3Z" /><path d="M12 18c2 0 4-1 4-3-2 0-4 1-4 3Z" /></>);

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';

interface StepDetails {
    currentStep: number;
    totalSteps: number;
    isPaused: boolean;
    currentMode: ModeType;
}

interface ContentCard {
    id: number;
    mode: ModeType;
    icon?: string;
    title: string;
    description: string;
    tag?: string;
}

// ADDITIONAL PROPS — TOOL SPECIFIC
interface HandpickingAdditionalProps {
    // Pile configuration
    round1Pebbles?: number;       // default 7
    round1Grains?: number;        // default 40 (wheat grains)
    round2Pebbles?: number;       // default 30
    round2Grains?: number;        // default 150

    // Hands-on free-play limits
    maxPileGrains?: number;       // default 220
    maxPilePebbles?: number;      // default 60

    // Appearance
    thaliColor?: string;          // wooden tray
    grainColor?: string;          // wheat golden
    pebbleColor?: string;         // pebble grey
    bowlColor?: string;

    // Copy / behaviour
    hintText?: string;            // shown on a wrong (wheat) tap
    showTimer?: boolean;          // default true
    promptAfterRound1?: string;
}

interface HandpickingToolProps {
    props?: {
        width?: number;
        height?: number;
        initialMode?: ModeType;
        showModeSelector?: boolean;
        enabledModes?: ModeType[];
        showNavigation?: boolean;
        showStepIndicator?: boolean;
        animationSpeed?: number;
        themeColor?: string;
        darkMode?: boolean;
        additionalProps?: HandpickingAdditionalProps;
    };
    setStepDetails?: (stepDetails: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== STATIC CONTENT ====================

const DEFAULT_CARDS: ContentCard[] = [
    // ---------------- LEARN ----------------
    {
        id: 1, mode: 'learn', icon: 'hand', tag: 'What it is',
        title: 'Handpicking',
        description: 'Handpicking means separating substances simply by picking the unwanted bits out with your hand. Like pulling small stones, husk, or spoiled grains out of a heap of wheat before grinding it into flour.',
    },
    {
        id: 2, mode: 'learn', icon: 'eye', tag: 'When it works',
        title: 'Few, and easy to spot',
        description: 'Handpicking works well only when the impurities are small in number and look different from the grain — different in SIZE or COLOUR. Dull grey pebbles stand out from golden wheat grains, so your eye finds them fast.',
    },
    {
        id: 3, mode: 'learn', icon: 'layers', tag: 'The catch',
        title: 'It gets slow',
        description: 'If the heap is huge — sackfuls of grain at a mill — picking by hand would take hours and you would still miss some. The method is correct, but no longer convenient.',
    },
    {
        id: 4, mode: 'learn', icon: 'wheat', tag: 'What comes next',
        title: 'Bigger piles need other methods',
        description: 'For large quantities we switch to faster methods like winnowing (using wind to blow away light husk) or sieving (a mesh that lets small bits fall through). Handpicking is just the first, simplest tool.',
    },

    // ---------------- REAL WORLD ----------------
    {
        id: 20, mode: 'real_world', icon: 'sparkles', tag: 'Kitchen',
        title: 'Cleaning dal & rice',
        description: 'Before cooking, we spread dal or rice on a plate and pick out tiny stones and black bits. A bitten stone can crack a tooth — so this small step matters every day.',
    },
    {
        id: 21, mode: 'real_world', icon: 'wheat', tag: 'Farm',
        title: 'Sorting good from spoiled',
        description: 'Farmers and shopkeepers handpick rotten or shrivelled grains, peanuts, and pulses so only the good ones are sold or stored.',
    },
    {
        id: 22, mode: 'real_world', icon: 'layers', tag: 'Market',
        title: 'Grading fruits & vegetables',
        description: 'At a sabzi market, damaged or undersized tomatoes and chillies are picked out by hand and kept aside — quick, because there are only a few odd ones.',
    },
    {
        id: 23, mode: 'real_world', icon: 'hand', tag: 'Everyday',
        title: 'A leaf in your salad',
        description: 'Spotting one wilted leaf in a bowl of greens and pulling it out is handpicking too. We do it without even thinking — because the bad piece looks different.',
    },
];

// ==================== ITEM GENERATION ====================

type ItemKind = 'wheat' | 'pebble';

interface PileItem {
    id: number;
    kind: ItemKind;
    x: number;      // 0..100 (% of thali box)
    y: number;      // 0..100
    size: number;   // px
    rot: number;    // deg
    variant: number;
}

let __idSeq = 1;

const genPile = (grains: number, pebbles: number): PileItem[] => {
    const items: PileItem[] = [];
    // Keep points inside a circle (rim padding): radius 0.44 around centre (0.5,0.5)
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
        // wheat grain, viewBox 0 0 60 28 — golden, oval, tapered germ end + ventral groove
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
                {/* grain body: rounded brush end (left), tapered germ end (right) */}
                <path d="M 8 14 C 8 7 16 4 26 4 C 42 4 55 8 58 14 C 55 20 42 24 26 24 C 16 24 8 21 8 14 Z"
                    fill={`url(#${gid})`} stroke={darken(tint, 30)} strokeWidth="1" />
                {/* ventral groove down the length */}
                <path d="M 12 14 C 26 11.5 44 11.5 56 14" fill="none"
                    stroke={darken(tint, 30)} strokeWidth="1.2" opacity="0.55" strokeLinecap="round" />
                {/* tiny brush hairs at the rounded end */}
                <path d="M 8 11 L 3 9 M 8 14 L 2 14 M 8 17 L 3 19" stroke={darken(tint, 18)}
                    strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
                {/* soft sheen on the upper belly */}
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
    props = {}, setStepDetails, stopAutoNext,
}) => {
    const config = useMemo(() => ({
        width: props.width ?? 820,
        initialMode: props.initialMode ?? 'learn' as ModeType,
        showModeSelector: props.showModeSelector ?? true,
        enabledModes: props.enabledModes ?? ['learn', 'practice', 'real_world', 'hands_on'] as ModeType[],
        showNavigation: props.showNavigation ?? true,
        showStepIndicator: props.showStepIndicator ?? true,
        animationSpeed: props.animationSpeed ?? 1,
        themeColor: props.themeColor ?? '#b8860b',
        darkMode: props.darkMode ?? false,
    }), [props]);

    const ap = props.additionalProps || {};
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

    // ---- inject keyframes ----
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
        `;
        const el = document.createElement('style');
        el.id = 'hp-keyframes';
        el.textContent = css;
        document.head.appendChild(el);
        return () => { const e = document.getElementById('hp-keyframes'); if (e) e.remove(); };
    }, [config.themeColor]);

    const switchMode = (m: ModeType) => {
        if (m === mode) return;
        setFade(0);
        setTimeout(() => { setMode(m); setFade(1); }, 220);
    };

    useEffect(() => {
        setStepDetails?.({ currentStep: 1, totalSteps: 1, isPaused: true, currentMode: mode });
    }, [mode, setStepDetails]);

    const modeMeta: Record<ModeType, { label: string; from: string; to: string }> = {
        learn: { label: 'Learn', from: '#c79a2e', to: '#e0b94f' },
        practice: { label: 'Pick It', from: '#b54a32', to: '#d96a3f' },
        real_world: { label: 'Real World', from: '#7a5cc0', to: '#a06fd0' },
        hands_on: { label: 'Free Pile', from: '#2f8f6a', to: '#46b083' },
    };

    const styles: { [k: string]: React.CSSProperties } = {
        shell: {
            width: '100%', maxWidth: config.width, margin: '0 auto',
            background: colors.surface, borderRadius: 26, overflow: 'hidden',
            boxShadow: '0 30px 60px -20px rgba(60,40,10,0.35)',
            fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
            color: colors.text, border: `1px solid ${colors.border}`,
        },
        tabs: {
            display: config.showModeSelector ? 'flex' : 'none', gap: 8,
            padding: 14, background: colors.bg, borderBottom: `1px solid ${colors.border}`,
            justifyContent: 'center', flexWrap: 'wrap',
        },
        tab: (sel: boolean, from: string, to: string): React.CSSProperties => ({
            padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 14, transition: 'all .25s cubic-bezier(.4,0,.2,1)',
            background: sel ? `linear-gradient(135deg, ${from}, ${to})` : colors.surface,
            color: sel ? '#fff' : colors.subtle,
            boxShadow: sel ? '0 6px 16px rgba(0,0,0,0.18)' : 'none',
            transform: sel ? 'translateY(-1px)' : 'none',
        }),
        body: { padding: 26, opacity: fade, transition: `opacity ${220 / config.animationSpeed}ms ease` },
        eyebrow: {
            display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12,
            fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase',
            color: config.themeColor, marginBottom: 10,
        },
    };

    return (
        <div style={styles.shell}>
            <div style={styles.tabs}>
                {config.enabledModes.map(m => (
                    <button key={m} onClick={() => switchMode(m)}
                        style={styles.tab(mode === m, modeMeta[m].from, modeMeta[m].to)}>
                        {modeMeta[m].label}
                    </button>
                ))}
            </div>

            <div style={styles.body}>
                {mode === 'learn' && (
                    <CardWalk cards={DEFAULT_CARDS.filter(c => c.mode === 'learn')}
                        colors={colors} theme={config.themeColor}
                        showNav={config.showNavigation} showIndicator={config.showStepIndicator} />
                )}
                {mode === 'real_world' && (
                    <CardWalk cards={DEFAULT_CARDS.filter(c => c.mode === 'real_world')}
                        colors={colors} theme={'#7a5cc0'}
                        showNav={config.showNavigation} showIndicator={config.showStepIndicator} />
                )}
                {mode === 'practice' && (
                    <PracticeFlow tool={tool} colors={colors} speed={config.animationSpeed} />
                )}
                {mode === 'hands_on' && (
                    <FreePile tool={tool} colors={colors} speed={config.animationSpeed} />
                )}
            </div>
        </div>
    );
};

// ==================== CARD WALK (Learn / Real World) ====================

const iconFor = (name?: string) => {
    const m: Record<string, JSX.Element> = {
        hand: <Hand size={22} />, eye: <Sparkles size={22} />, layers: <Layers size={22} />,
        wheat: <Wheat size={22} />, sparkles: <Sparkles size={22} />,
    };
    return m[name || ''] || <Lightbulb size={22} />;
};

const CardWalk: React.FC<{
    cards: ContentCard[]; colors: any; theme: string; showNav: boolean; showIndicator: boolean;
}> = ({ cards, colors, theme, showNav, showIndicator }) => {
    const [i, setI] = useState(0);
    const c = cards[i];
    const go = (d: number) => setI(p => Math.max(0, Math.min(cards.length - 1, p + d)));

    return (
        <div>
            <div key={c.id} style={{ animation: 'hp-fadeUp .45s ease both' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800,
                    letterSpacing: 1.1, textTransform: 'uppercase', color: theme, marginBottom: 12,
                }}>
                    <span style={{
                        width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
                        background: `${theme}1a`, color: theme,
                    }}>{iconFor(c.icon)}</span>
                    {c.tag}
                </span>
                <h2 style={{ fontSize: 30, fontWeight: 800, margin: '4px 0 14px', lineHeight: 1.15 }}>{c.title}</h2>
                <p style={{
                    fontSize: 18, lineHeight: 1.7, color: colors.text,
                    background: colors.bg, padding: 22, borderRadius: 16,
                    borderLeft: `5px solid ${theme}`, margin: 0,
                }}>{c.description}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
                <button onClick={() => go(-1)} disabled={i === 0}
                    style={navBtn(i === 0, colors)}>
                    <ChevronLeft size={18} /> Back
                </button>
                {showIndicator && (
                    <div style={{ display: 'flex', gap: 7 }}>
                        {cards.map((_, k) => (
                            <span key={k} onClick={() => setI(k)} style={{
                                width: k === i ? 26 : 9, height: 9, borderRadius: 9, cursor: 'pointer',
                                background: k === i ? theme : colors.border, transition: 'all .3s',
                            }} />
                        ))}
                    </div>
                )}
                <button onClick={() => go(1)} disabled={i === cards.length - 1}
                    style={{ ...navBtn(i === cards.length - 1, colors), background: i === cards.length - 1 ? colors.border : `linear-gradient(135deg, ${theme}, ${darken(theme, 20)})`, color: i === cards.length - 1 ? colors.subtle : '#fff' }}>
                    Next <ChevronRight size={18} />
                </button>
            </div>
            {!showNav && null}
        </div>
    );
};

const navBtn = (disabled: boolean, colors: any): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 12,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14,
    background: colors.surface, color: disabled ? colors.subtle : colors.text,
    opacity: disabled ? 0.5 : 1, boxShadow: disabled ? 'none' : '0 3px 10px rgba(0,0,0,0.08)',
    transition: 'all .2s',
});

// ==================== THE THALI GAME (core) ====================

interface ThaliGameProps {
    grains: number;
    pebbles: number;
    tool: any;
    colors: any;
    speed: number;
    onDone: (timeMs: number, wrongTaps: number) => void;
    roundKey: string | number; // forces fresh pile on change
}

// Memoized bed of wheat — heavy (hundreds of grains) but static during a round,
// so it is skipped on every timer tick and pebble pick.
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

const ThaliGame: React.FC<ThaliGameProps> = ({ grains, pebbles, tool, colors, speed, onDone, roundKey }) => {
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

    const elRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const bowlRef = useRef<HTMLDivElement | null>(null);
    const hintTimer = useRef<any>(null);

    const totalPebbles = pebbles;

    // fresh pile when round changes
    useEffect(() => {
        setGrainItems(genPile(grains, 0));
        setPebbleItems(genPile(0, pebbles));
        setPickedCount(0); setWrongTaps(0); setHint(null);
        setShaking(new Set()); setFlying({});
        setStartTime(null); setElapsed(0); setFinished(false);
    }, [roundKey, grains, pebbles]);

    // timer tick
    useEffect(() => {
        if (startTime == null || finished) return;
        const id = setInterval(() => setElapsed(performance.now() - startTime), 73);
        return () => clearInterval(id);
    }, [startTime, finished]);

    // completion
    useEffect(() => {
        if (!finished && totalPebbles > 0 && pickedCount >= totalPebbles && startTime != null) {
            setFinished(true);
            const t = performance.now() - startTime;
            setElapsed(t);
            setTimeout(() => onDone(t, wrongTaps), 450);
        }
    }, [pickedCount, totalPebbles, finished, startTime, wrongTaps, onDone]);

    // refs so the grain-tap handler can stay referentially stable (keeps GrainBed memoized)
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
        setFlying(p => ({ ...p, [it.id]: { dx, dy } }));
        setPickedCount(c => c + 1);
        setTimeout(() => {
            setPebbleItems(prev => prev.filter(x => x.id !== it.id));
            setFlying(p => { const n = { ...p }; delete n[it.id]; return n; });
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
    }, [ensureTimer, tool.hintText]);

    const remaining = totalPebbles - pickedCount;
    const secs = (elapsed / 1000).toFixed(1);

    return (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' }}>
            {/* THALI */}
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
                    {/* rim shine */}
                    <div style={{
                        position: 'absolute', inset: 6, borderRadius: '50%',
                        boxShadow: `inset 0 0 30px ${lighten(tool.thaliColor, 30)}55`, pointerEvents: 'none',
                    }} />

                    {/* static bed of wheat — memoized, not re-rendered on timer ticks */}
                    <GrainBed grains={grainItems} shaking={shaking} color={tool.grainColor} onTap={tapWheat} />

                    {/* pebble layer — few, dynamic (fly to the bowl on tap) */}
                    {pebbleItems.map(it => {
                        const fly = flying[it.id];
                        return (
                            <div key={it.id}
                                ref={el => { elRefs.current[it.id] = el; }}
                                onClick={() => tapPebble(it)}
                                style={{
                                    position: 'absolute', left: `${it.x}%`, top: `${it.y}%`,
                                    transform: fly
                                        ? `translate(-50%,-50%) translate(${fly.dx}px, ${fly.dy}px) scale(0.25) rotate(140deg)`
                                        : 'translate(-50%,-50%)',
                                    transition: fly ? `transform ${0.55 / speed}s cubic-bezier(.5,-0.3,.3,1), opacity ${0.55 / speed}s ease` : 'transform .15s',
                                    opacity: fly ? 0 : 1,
                                    zIndex: fly ? 60 : 30,
                                    cursor: 'pointer', lineHeight: 0,
                                    animation: fly ? undefined : 'hp-pop .4s ease both',
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

            {/* SIDE PANEL: bowl + stats */}
            <div style={{ flex: '0 1 240px', minWidth: 220, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* timer + counters */}
                <div style={{
                    display: 'flex', gap: 12,
                }}>
                    {tool.showTimer && (
                        <Stat icon={<Timer size={18} />} label="Time" value={`${secs}s`} colors={colors} accent="#b54a32" pulse={startTime != null && !finished} />
                    )}
                    <Stat icon={<Hand size={18} />} label="Left" value={`${remaining}`} colors={colors} accent={colors.success} />
                </div>

                {/* bowl */}
                <div style={{ position: 'relative', display: 'grid', placeItems: 'center', padding: '8px 0' }}>
                    <div ref={bowlRef} style={{
                        width: 150, height: 96, borderRadius: '0 0 80px 80px',
                        background: `linear-gradient(180deg, ${lighten(tool.bowlColor, 8)}, ${darken(tool.bowlColor, 18)})`,
                        border: `3px solid ${darken(tool.bowlColor, 26)}`,
                        boxShadow: 'inset 0 8px 18px rgba(0,0,0,0.18), 0 10px 22px -10px rgba(0,0,0,0.4)',
                        position: 'relative', overflow: 'hidden',
                    }}>
                        {/* rim */}
                        <div style={{
                            position: 'absolute', top: -8, left: -3, right: -3, height: 16, borderRadius: '50%',
                            background: `linear-gradient(180deg, ${lighten(tool.bowlColor, 14)}, ${tool.bowlColor})`,
                            border: `3px solid ${darken(tool.bowlColor, 26)}`,
                        }} />
                        {/* collected pebbles cluster */}
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

                {/* hint */}
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

const Stat: React.FC<{ icon: JSX.Element; label: string; value: string; colors: any; accent: string; pulse?: boolean }> =
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

// ==================== PRACTICE FLOW (Round 1 → bigger pile → reflection) ====================

const PracticeFlow: React.FC<{ tool: any; colors: any; speed: number }> = ({ tool, colors, speed }) => {
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
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12,
                    border: `1px solid ${colors.border}`, background: colors.surface, color: colors.subtle,
                    fontWeight: 700, cursor: 'pointer', fontSize: 13,
                }}>
                    <RotateCcw size={15} /> Restart
                </button>
            </div>

            {phase === 'play' && (
                <ThaliGame grains={cfg.grains} pebbles={cfg.pebbles} tool={tool} colors={colors}
                    speed={speed} onDone={handleDone} roundKey={round} />
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

const FreePile: React.FC<{ tool: any; colors: any; speed: number }> = ({ tool, colors, speed }) => {
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

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
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
                speed={speed} onDone={handleDone} roundKey={`${key}-${grains}-${pebbles}`} />
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
export { HandpickingSeparationTool };  // named export so the preview harness can mount by name

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════