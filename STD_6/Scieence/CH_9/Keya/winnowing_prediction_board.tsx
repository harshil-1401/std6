// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: winnowing_prediction_board.tsx
// Class 6 Science — Curiosity Ch 9: Methods of Separation of Substances
// Concept: WINNOWING — wind separates a mixture only when its two parts differ
//          enough in WEIGHT. Students predict the outcome for five mixtures and
//          get immediate, weight-difference-based feedback.
// Note: fully self-contained — icons are inline SVG (no lucide import), so it
//       won't break on renderers that lack a given icon.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ──────────────────────────────────────────────────────────────────────────
// INLINE ICONS
// ──────────────────────────────────────────────────────────────────────────
type IconProps = { size?: number; style?: React.CSSProperties };
const mkIcon = (children: React.ReactNode) =>
    ({ size = 24, style }: IconProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round"
            strokeLinejoin="round" style={style}>{children}</svg>
    );
const ChevronLeft = mkIcon(<path d="m15 18-6-6 6-6" />);
const ChevronRight = mkIcon(<path d="m9 18 6-6-6-6" />);
const Check = mkIcon(<path d="M20 6 9 17l-5-5" />);
const XIcon = mkIcon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const RotateCcw = mkIcon(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>);
const Lightbulb = mkIcon(<><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" /></>);
const Sparkles = mkIcon(<><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" /><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" /></>);
const Wind = mkIcon(<><path d="M12.8 19.6A2 2 0 1 0 14 16H2" /><path d="M17.5 8A2.5 2.5 0 1 1 19.5 12H2" /><path d="M9.8 4.4A2 2 0 1 1 11 8H2" /></>);
const Trophy = mkIcon(<><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 22" /><path d="M14 14.7V17c0 .6.5 1 1 1.2C16.2 18.8 17 20.2 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></>);
const Scale = mkIcon(<><path d="M12 3v18" /><path d="M7 21h10" /><path d="m5 7 14-2" /><path d="m5 7-3 6a3 3 0 0 0 6 0Z" /><path d="m19 5 3 6a3 3 0 0 1-6 0Z" /></>);

// ──────────────────────────────────────────────────────────────────────────
// COLOUR HELPERS
// ──────────────────────────────────────────────────────────────────────────
function clamp(n: number) { return Math.max(0, Math.min(255, n)); }
function hexToRgb(h: string) { const m = h.replace('#', ''); const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m; return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]; }
function toHex(r: number, g: number, b: number) { return '#' + [r, g, b].map(x => clamp(Math.round(x)).toString(16).padStart(2, '0')).join(''); }
function lighten(h: string, a: number) { const [r, g, b] = hexToRgb(h); return toHex(r + a, g + a, b + a); }
function darken(h: string, a: number) { const [r, g, b] = hexToRgb(h); return toHex(r - a, g - a, b - a); }

// ── Design-system palette + font ────────────────────────────────────────────
const F = '"Poppins", system-ui, -apple-system, sans-serif';
const P = {
    primary: '#4A4DC9', primaryHover: '#7C7FE0', primaryPressed: '#34379E',
    accent: '#FF7212', purple: '#533086', orange: '#FC9145',
    lavender: '#C1C1EA', cream: '#FFF3E4',
    ink: '#332F4A', sub: '#8A86A0',
    grey400: '#CACACA', grey200: '#ECECF3', grey100: '#F5F5F7', white: '#fff',
    gradMain: 'linear-gradient(135deg, #533086 0%, #FC9145 100%)',
    gradLight: 'linear-gradient(135deg, #C1C1EA 0%, #FFF3E4 100%)',
    ok: '#2f9e6a', okBg: '#eaf7f0', okBd: '#bfe6cf',
    warn: '#e7920c', warnBg: '#fef4e2', warnBd: '#f6d9a6',
    bad: '#e0524a', badBg: '#fdeeec', badBd: '#f5ccc6',
    cardShadow: '0 14px 38px -22px rgba(74,77,201,0.35)',
};
const loadPoppins = () => {
    if (document.getElementById('wb-poppins')) return;
    const l = document.createElement('link'); l.id = 'wb-poppins'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
};

// ──────────────────────────────────────────────────────────────────────────
// TYPES + DATA
// ──────────────────────────────────────────────────────────────────────────
type Outcome = 'well' | 'partly' | 'none';
type BitKind = 'peanut' | 'skin' | 'dal' | 'puff' | 'wheat' | 'husk' | 'pebble' | 'sand' | 'rice' | 'stone';
type ModeType = 'learn' | 'predict' | 'real_world' | 'hands_on';

interface Component { label: string; kind: BitKind; color: string; }
interface MixtureDef {
    id: string;
    name: string;
    heavy: Component;   // falls / stays
    light: Component;   // blows aside
    correct: Outcome;
    reason: string;
}

const DEFAULT_MIXTURES: MixtureDef[] = [
    {
        id: 'peanuts',
        name: 'Peanuts + peanut skins',
        heavy: { label: 'Peanuts', kind: 'peanut', color: '#cd986b' },
        light: { label: 'Skins', kind: 'skin', color: '#a82c22' },
        correct: 'well',
        reason: 'Skins are paper-light beside heavy peanuts, so even a soft breeze carries them off.',
    },
    {
        id: 'chana',
        name: 'Chana dal + puffed rice',
        heavy: { label: 'Chana dal', kind: 'dal', color: '#e8c24a' },
        light: { label: 'Puffed rice', kind: 'puff', color: '#f7f3ea' },
        correct: 'well',
        reason: 'Puffed rice is mostly air and very light, so it blows aside while the dense dal drops.',
    },
    {
        id: 'wheat',
        name: 'Wheat grains + husk',
        heavy: { label: 'Wheat grains', kind: 'wheat', color: '#d99a3a' },
        light: { label: 'Husk', kind: 'husk', color: '#cdb86a' },
        correct: 'well',
        reason: 'Husk is thin and light — wind lifts it easily and the heavy grain falls straight down.',
    },
    {
        id: 'sand',
        name: 'Sand + pebbles',
        heavy: { label: 'Pebbles', kind: 'pebble', color: '#9a9089' },
        light: { label: 'Sand', kind: 'sand', color: '#d8c089' },
        correct: 'none',
        reason: 'Both are heavy and stony — wind can lift neither, so they stay mixed. Sieve them by size instead.',
    },
    {
        id: 'rice',
        name: 'Rice + small stones',
        heavy: { label: 'Small stones', kind: 'stone', color: '#6c7075' },
        light: { label: 'Rice', kind: 'rice', color: '#fbfaf6' },
        correct: 'partly',
        reason: 'Stones are only a little heavier than rice, so wind sorts some but not all — finish by handpicking.',
    },
];

const OUTCOME_META: Record<Outcome, { label: string; color: string }> = {
    well: { label: 'Separates well', color: '#2f9e6a' },
    partly: { label: 'Separates partly', color: '#e7920c' },
    none: { label: 'Does not separate', color: '#e0524a' },
};
const SEP_FACTOR: Record<Outcome, number> = { well: 0.92, partly: 0.5, none: 0.12 };

interface CardContent { id: number; mode: ModeType; tag: string; title: string; description: string; icon: 'wind' | 'scale' | 'bulb' | 'sparkle'; }
const CARDS: CardContent[] = [
    { id: 20, mode: 'real_world', icon: 'wind', tag: 'Farms', title: 'Separating grain from chaff', description: 'Farmers toss threshed grain into the wind from a height. The light chaff and husk drift away and the heavy grain piles up below — winnowing on a big scale.' },
    { id: 21, mode: 'real_world', icon: 'sparkle', tag: 'Kitchen', title: 'Cleaning puffed rice & poha', description: 'A gentle blow or a fan removes light bits of husk and dust from puffed rice or flattened rice before it is packed.' },
    { id: 22, mode: 'real_world', icon: 'scale', tag: 'Tea & spices', title: 'Grading by weight', description: 'Machines blow air through tea leaves and spice bits; lighter, broken pieces travel further than heavy whole ones, sorting them by weight.' },
    { id: 23, mode: 'real_world', icon: 'bulb', tag: 'Why size fails here', title: 'Sand and pebbles', description: 'Sand and pebbles are both heavy, so no wind sorts them. A sieve does — because they differ in size, not in how the wind carries them.' },
];

// ──────────────────────────────────────────────────────────────────────────
// BIT (a single particle)
// ──────────────────────────────────────────────────────────────────────────
// Characteristic on-screen size (px) per kind, so real-size cues aid recognition
const KIND_SIZE: Record<BitKind, number> = {
    peanut: 32, skin: 25, dal: 21, puff: 26, wheat: 22, husk: 26, pebble: 22, sand: 9, rice: 24, stone: 14,
};

const Bit: React.FC<{ kind: BitKind; color: string; size: number; rot: number }> = ({ kind, color, size, rot }) => {
    const dk = darken(color, 28), dk2 = darken(color, 16), lt = lighten(color, 22);
    const sh: React.CSSProperties = { display: 'block', transform: `rotate(${rot}deg)`, filter: 'drop-shadow(0 1px 1.2px rgba(0,0,0,0.25))' };
    const gid = useRef('g' + Math.random().toString(36).slice(2)).current;
    switch (kind) {
        case 'peanut': // kernel with reddish skin: pinkish-tan, split groove, exposed cream patch
            return (
                <svg width={size} height={size * 0.74} viewBox="0 0 44 32" style={sh}>
                    <defs>
                        <radialGradient id={gid} cx="38%" cy="30%" r="80%">
                            <stop offset="0%" stopColor={lighten(color, 22)} />
                            <stop offset="55%" stopColor={color} />
                            <stop offset="100%" stopColor={darken(color, 22)} />
                        </radialGradient>
                    </defs>
                    <path d="M22 2 C33 2 41 7 41 16 C41 25 33 30 22 30 C11 30 3 25 3 16 C3 7 11 2 22 2 Z" fill={`url(#${gid})`} stroke={darken(color, 26)} strokeWidth="1" />
                    {/* split groove */}
                    <path d="M22 3 C23.6 9 23.6 23 22 29" stroke={darken(color, 28)} strokeWidth="1.1" opacity="0.5" fill="none" />
                    {/* reddish skin streaks */}
                    <path d="M9 11 C 16 8 28 8 35 12" stroke={darken(color, 18)} strokeWidth="1" opacity="0.4" fill="none" />
                    <path d="M9 20 C 16 23 28 23 35 19" stroke={darken(color, 18)} strokeWidth="1" opacity="0.35" fill="none" />
                    {/* exposed cream cotyledon patch */}
                    <ellipse cx="14" cy="11" rx="5" ry="3.2" fill="#f3e9d6" opacity="0.85" transform="rotate(-18 14 11)" />
                </svg>
            );
        case 'skin': // peanut skin: deep red, thin curled papery flake
            return (
                <svg width={size} height={size * 0.58} viewBox="0 0 40 24" style={sh}>
                    <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lighten(color, 18)} /><stop offset="100%" stopColor={darken(color, 16)} /></linearGradient></defs>
                    {/* curled papery flake */}
                    <path d="M2 13 C 9 2 28 0 38 7 C 30 5 17 7 12 13 C 21 10 31 12 36 16 C 26 21 7 22 2 13 Z" fill={`url(#${gid})`} stroke={darken(color, 26)} strokeWidth="0.7" />
                    <path d="M7 12 C 17 7 28 8 35 12" stroke={lighten(color, 26)} strokeWidth="0.7" opacity="0.55" fill="none" />
                    <path d="M6 15 C 14 18 24 18 31 15" stroke={darken(color, 24)} strokeWidth="0.6" opacity="0.4" fill="none" />
                </svg>
            );
        case 'dal': // chana dal: golden split half-pea, paler flat face + central dimple
            return (
                <svg width={size} height={size * 0.8} viewBox="0 0 30 24" style={sh}>
                    <defs><radialGradient id={gid} cx="50%" cy="78%" r="75%"><stop offset="0%" stopColor={lighten(color, 8)} /><stop offset="100%" stopColor={darken(color, 20)} /></radialGradient></defs>
                    {/* domed body */}
                    <path d="M2 8 C2 5 8 4 15 4 C22 4 28 5 28 8 C28 17 22 22 15 22 C8 22 2 17 2 8 Z" fill={`url(#${gid})`} stroke={darken(color, 26)} strokeWidth="1" />
                    {/* paler flat split face on top */}
                    <path d="M2 8 C2 6 8 5 15 5 C22 5 28 6 28 8 C28 10.5 22 11.5 15 11.5 C8 11.5 2 10.5 2 8 Z" fill={lighten(color, 26)} stroke={darken(color, 14)} strokeWidth="0.5" />
                    {/* central dimple (the germ) */}
                    <ellipse cx="15" cy="8" rx="2.6" ry="1.5" fill={darken(color, 18)} opacity="0.5" />
                </svg>
            );
        case 'puff': // puffed rice (murmura): white, oblong, bumpy popped grain
            return (
                <svg width={size} height={size * 0.52} viewBox="0 0 40 21" style={sh}>
                    <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor={darken(color, 8)} /></linearGradient></defs>
                    <path d="M5 11 C5 6 9 4 14 5 C16 2 21 3 23 6 C28 4 34 6 36 10 C38 14 34 18 29 17 C26 20 20 19 18 16 C13 19 6 17 5 12 Z" fill={`url(#${gid})`} stroke={darken(color, 12)} strokeWidth="0.7" />
                    <ellipse cx="15" cy="9" rx="4" ry="2" fill="#fff" opacity="0.85" />
                    <circle cx="27" cy="11" r="2" fill="#fff" opacity="0.6" />
                </svg>
            );
        case 'wheat': // wheat grain: golden, oval, ventral crease + brush hairs
            return (
                <svg width={size} height={size * 0.5} viewBox="0 0 44 22" style={sh}>
                    <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lighten(color, 20)} /><stop offset="50%" stopColor={color} /><stop offset="100%" stopColor={dk2} /></linearGradient></defs>
                    <path d="M6 11 C6 5 13 3 24 3 C36 3 42 6 42 11 C42 16 36 19 24 19 C13 19 6 17 6 11 Z" fill={`url(#${gid})`} stroke={dk} strokeWidth="0.9" />
                    <path d="M10 11 C24 8.5 34 8.5 40 11" stroke={dk} strokeWidth="1" opacity="0.5" fill="none" />
                    <path d="M6 8 L1 6 M6 11 L0 11 M6 14 L1 16" stroke={dk2} strokeWidth="0.7" opacity="0.6" strokeLinecap="round" />
                </svg>
            );
        case 'husk': // chaff: thin pale papery sliver with a midrib, pointed ends
            return (
                <svg width={size} height={size * 0.36} viewBox="0 0 44 16" style={sh}>
                    <path d="M2 8 C 14 1 30 1 42 8 C 30 15 14 15 2 8 Z" fill={color} stroke={darken(color, 20)} strokeWidth="0.6" opacity="0.95" />
                    <path d="M4 8 H40" stroke={darken(color, 16)} strokeWidth="0.7" opacity="0.5" />
                </svg>
            );
        case 'pebble': // grey rounded stone
            return (
                <svg width={size} height={size * 0.85} viewBox="0 0 30 26" style={sh}>
                    <defs><radialGradient id={gid} cx="36%" cy="30%" r="80%"><stop offset="0%" stopColor={lighten(color, 22)} /><stop offset="60%" stopColor={color} /><stop offset="100%" stopColor={dk} /></radialGradient></defs>
                    <path d="M15 2 C 22 1 28 6 28 13 C 28 21 22 25 14 24 C 7 23 2 18 3 12 C 4 5 9 3 15 2 Z" fill={`url(#${gid})`} stroke={dk} strokeWidth="0.9" />
                    <ellipse cx="11" cy="9" rx="3.4" ry="2" fill="#fff" opacity="0.4" />
                </svg>
            );
        case 'sand': // single grain of sand: tiny gritty speck (no shadow — many on screen)
            return (
                <svg width={size} height={size} viewBox="0 0 12 12" style={{ ...sh, filter: 'none' }}>
                    <path d="M6 1 L10 4 L9 10 L3 9 L2 4 Z" fill={color} stroke={darken(color, 24)} strokeWidth="0.5" />
                </svg>
            );
        case 'rice': // rice grain: long, slender, glossy white, slightly curved
            return (
                <svg width={size} height={size * 0.34} viewBox="0 0 48 16" style={sh}>
                    <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor={darken(color, 8)} /></linearGradient></defs>
                    <path d="M4 9 C 8 3 40 3 45 7 C 46 8 45 9 43 10 C 36 13 10 14 5 11 C 3 10 3 10 4 9 Z" fill={`url(#${gid})`} stroke={darken(color, 16)} strokeWidth="0.7" />
                    <ellipse cx="18" cy="7" rx="9" ry="1.6" fill="#fff" opacity="0.75" />
                </svg>
            );
        case 'stone': // small dark stone, irregular
            return (
                <svg width={size} height={size * 0.9} viewBox="0 0 22 20" style={sh}>
                    <path d="M11 2 C16 2 20 6 19 11 C18 17 12 19 7 17 C2 15 2 9 4 6 C6 3 8 2 11 2 Z" fill={color} stroke={darken(color, 26)} strokeWidth="0.9" />
                    <ellipse cx="8" cy="7" rx="2.4" ry="1.5" fill="#fff" opacity="0.3" />
                </svg>
            );
        default:
            return <svg width={size} height={size} viewBox="0 0 24 24" style={sh}><circle cx="12" cy="12" r="10" fill={color} /></svg>;
    }
};

// ──────────────────────────────────────────────────────────────────────────
// PARTICLE LAYOUT for a card tray
// ──────────────────────────────────────────────────────────────────────────
interface P { id: number; heavy: boolean; bx: number; by: number; px: number; py: number; size: number; rot: number; }
let __p = 1;
// How many of each item to scatter — more of the small/thin bits, fewer big ones,
// so every tray reads as a full, obvious mixture.
const KIND_COUNT: Record<BitKind, number> = {
    peanut: 13, skin: 22, dal: 18, puff: 20, wheat: 20, husk: 24, pebble: 14, sand: 500, rice: 20, stone: 6,
};

const buildParticles = (mix: MixtureDef): P[] => {
    const out: P[] = [];
    const make = (heavy: boolean, count: number) => {
        const baseSize = KIND_SIZE[(heavy ? mix.heavy : mix.light).kind] ?? 18;
        for (let i = 0; i < count; i++) {
            const bx = 9 + Math.random() * 82;
            const by = 14 + Math.random() * 72;
            // pile centres: heavy → left & settle low, light → right & lifted
            const px = (heavy ? 25 : 75) + (Math.random() * 22 - 11);
            const py = (heavy ? 68 : 32) + (Math.random() * 26 - 13);
            out.push({ id: __p++, heavy, bx, by, px, py, size: baseSize * (0.84 + Math.random() * 0.3), rot: Math.random() * 360 });
        }
    };
    make(true, KIND_COUNT[mix.heavy.kind] ?? 16);
    make(false, KIND_COUNT[mix.light.kind] ?? 18);
    // interleave so they look mixed initially
    return out.sort(() => Math.random() - 0.5);
};

// ──────────────────────────────────────────────────────────────────────────
// TRAY
// ──────────────────────────────────────────────────────────────────────────
const Tray: React.FC<{ mix: MixtureDef; particles: P[]; revealed: boolean }> = ({ mix, particles, revealed }) => {
    const factor = revealed ? SEP_FACTOR[mix.correct] : 0;
    return (
        <div style={{
            position: 'relative', width: '100%', height: 162, borderRadius: 16, overflow: 'hidden',
            background: 'linear-gradient(180deg, #FFFDFA 0%, #FBF7EF 100%)',
            border: `1px solid ${P.grey200}`, boxShadow: 'inset 0 2px 10px rgba(74,77,201,0.05)',
        }}>
            {/* zone hints when revealed */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', opacity: revealed && mix.correct !== 'none' ? 1 : 0, transition: 'opacity .4s' }}>
                <div style={{ flex: 1, background: 'linear-gradient(90deg, rgba(74,77,201,0.06), transparent)' }} />
                <div style={{ flex: 1, background: 'linear-gradient(270deg, rgba(62,127,192,0.10), transparent)' }} />
            </div>
            {revealed && mix.correct !== 'none' && (
                <div style={{ position: 'absolute', top: 8, right: 10, display: 'flex', alignItems: 'center', gap: 4, color: '#3E7FC0', background: 'rgba(62,127,192,0.12)', padding: '3px 9px', borderRadius: 9999, fontSize: 11, fontWeight: 700, animation: 'wb-fade .5s ease both' }}>
                    <Wind size={13} /> wind
                </div>
            )}
            {/* soft dish vignette for depth */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16, boxShadow: 'inset 0 -16px 26px -16px rgba(90,70,30,0.16), inset 0 1px 0 rgba(255,255,255,0.7)', background: 'radial-gradient(120% 80% at 50% 22%, rgba(255,255,255,0.5) 0%, transparent 55%)' }} />
            {particles.map(p => {
                const x = p.bx + factor * (p.px - p.bx);
                const y = p.by + factor * (p.py - p.by);
                const comp = p.heavy ? mix.heavy : mix.light;
                return (
                    <div key={p.id} style={{
                        position: 'absolute', left: `${x}%`, top: `${y}%`,
                        transform: 'translate(-50%,-50%)', lineHeight: 0,
                        transition: `left ${0.9 + (p.id % 5) * 0.08}s cubic-bezier(.4,0,.2,1), top ${0.9 + (p.id % 5) * 0.08}s cubic-bezier(.4,0,.2,1)`,
                        zIndex: p.heavy ? 2 : 3,
                    }}>
                        <Bit kind={comp.kind} color={comp.color} size={p.size} rot={p.rot} />
                    </div>
                );
            })}
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────
// MIXTURE CARD
// ──────────────────────────────────────────────────────────────────────────
const MixtureCard: React.FC<{
    mix: MixtureDef; index: number; answer?: Outcome; onAnswer: (id: string, o: Outcome) => void; resetKey: number;
}> = ({ mix, index, answer, onAnswer, resetKey }) => {
    const particles = useMemo(() => buildParticles(mix), [mix.id, resetKey]);
    const revealed = !!answer;
    const isRight = answer === mix.correct;

    return (
        <div className="wb-card" style={{
            background: P.white, borderRadius: 20, padding: 18, border: `1px solid ${P.grey200}`,
            boxShadow: P.cardShadow,
            animation: `wb-rise .5s ease both ${index * 0.06}s`,
            display: 'flex', flexDirection: 'column', gap: 13,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: P.ink, fontFamily: F }}>{mix.name}</h3>
                <span style={{ fontSize: 12, fontWeight: 700, color: P.primary, background: `${P.primary}12`, padding: '4px 10px', borderRadius: 9999, flexShrink: 0 }}>#{index + 1}</span>
            </div>

            <Tray mix={mix} particles={particles} revealed={revealed} />

            {/* legend */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: P.ink, fontWeight: 600 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: P.grey100, padding: '5px 10px', borderRadius: 9999 }}>
                    <span style={{ lineHeight: 0 }}><Bit kind={mix.heavy.kind} color={mix.heavy.color} size={16} rot={0} /></span>
                    {mix.heavy.label} <em style={{ color: P.sub, fontStyle: 'normal' }}>(heavier)</em>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: P.grey100, padding: '5px 10px', borderRadius: 9999 }}>
                    <span style={{ lineHeight: 0 }}><Bit kind={mix.light.kind} color={mix.light.color} size={16} rot={0} /></span>
                    {mix.light.label} <em style={{ color: P.sub, fontStyle: 'normal' }}>(lighter)</em>
                </span>
            </div>

            {/* options */}
            <div style={{ display: 'flex', gap: 8 }}>
                {(Object.keys(OUTCOME_META) as Outcome[]).map(o => {
                    const meta = OUTCOME_META[o];
                    const chosen = answer === o;
                    const showAsCorrect = revealed && o === mix.correct;
                    const showAsWrong = revealed && chosen && o !== mix.correct;
                    const active = showAsCorrect || showAsWrong;
                    return (
                        <button key={o} disabled={revealed} className="wb-opt"
                            onClick={() => onAnswer(mix.id, o)}
                            style={{
                                flex: 1, padding: '11px 6px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
                                cursor: revealed ? 'default' : 'pointer', lineHeight: 1.2, fontFamily: F,
                                border: `2px solid ${active ? meta.color : P.grey200}`,
                                background: showAsCorrect ? `${meta.color}16` : showAsWrong ? `${meta.color}12` : P.white,
                                color: active ? darken(meta.color, 8) : P.ink,
                                transition: 'all .2s', position: 'relative',
                                opacity: revealed && !active ? 0.45 : 1,
                            }}>
                            {meta.label}
                            {showAsCorrect && <span style={{ position: 'absolute', top: -8, right: -8, background: meta.color, color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'grid', placeItems: 'center', animation: 'wb-pop .3s ease both' }}><Check size={13} /></span>}
                            {showAsWrong && <span style={{ position: 'absolute', top: -8, right: -8, background: meta.color, color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'grid', placeItems: 'center', animation: 'wb-pop .3s ease both' }}><XIcon size={13} /></span>}
                        </button>
                    );
                })}
            </div>

            {/* feedback */}
            <div style={{ minHeight: 58 }}>
                {revealed && (
                    <div style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start', padding: 13, borderRadius: 14,
                        background: isRight ? P.okBg : P.badBg,
                        border: `1px solid ${isRight ? P.okBd : P.badBd}`,
                        animation: 'wb-rise .3s ease both',
                    }}>
                        <span style={{ color: isRight ? P.ok : P.bad, flexShrink: 0, marginTop: 1 }}>
                            {isRight ? <Check size={18} /> : <Lightbulb size={18} />}
                        </span>
                        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: P.ink }}>
                            <b style={{ color: isRight ? P.ok : P.bad }}>
                                {isRight ? 'Right! ' : `Actually: ${OUTCOME_META[mix.correct].label}. `}
                            </b>
                            {mix.reason}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────
// PREDICT BOARD
// ──────────────────────────────────────────────────────────────────────────
const PredictBoard: React.FC<{ mixtures: MixtureDef[]; showScore: boolean }> = ({ mixtures, showScore }) => {
    const [answers, setAnswers] = useState<Record<string, Outcome>>({});
    const [resetKey, setResetKey] = useState(0);

    const onAnswer = useCallback((id: string, o: Outcome) => {
        setAnswers(prev => prev[id] ? prev : { ...prev, [id]: o });
    }, []);
    const reset = () => { setAnswers({}); setResetKey(k => k + 1); };

    const answered = Object.keys(answers).length;
    const score = mixtures.reduce((n, m) => n + (answers[m.id] === m.correct ? 1 : 0), 0);
    const allDone = answered === mixtures.length;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: P.primary }}>
                        <span style={{ width: 30, height: 30, borderRadius: 9, background: `${P.primary}14`, color: P.primary, display: 'grid', placeItems: 'center' }}><Wind size={16} /></span>
                        Predict the winnowing result
                    </span>
                    <h2 style={{ margin: '10px 0 0', fontSize: 26, fontWeight: 700, color: P.ink, fontFamily: F }}>Will the wind separate it?</h2>
                    <p style={{ margin: '4px 0 0', color: P.sub, fontSize: 14 }}>For each mixture, decide what happens if you drop it in a breeze.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {showScore && (
                        <div style={{ background: P.white, border: `1px solid ${P.grey200}`, borderRadius: 16, padding: '8px 18px', textAlign: 'center', boxShadow: P.cardShadow }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.6 }}>Score</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: P.primary, fontFamily: F }}>{score}<span style={{ color: P.grey400, fontSize: 15 }}>/{mixtures.length}</span></div>
                        </div>
                    )}
                    <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', borderRadius: 9999, border: `2px solid ${P.grey200}`, background: P.white, color: P.sub, fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: F }}>
                        <RotateCcw size={15} /> Reset
                    </button>
                </div>
            </div>

            {allDone && (
                <div style={{
                    display: 'flex', gap: 16, alignItems: 'center', padding: 20, borderRadius: 18, marginBottom: 18,
                    background: P.gradMain, boxShadow: '0 18px 40px -20px rgba(83,48,134,0.6)',
                    animation: 'wb-rise .5s ease both',
                }}>
                    <div style={{ width: 54, height: 54, borderRadius: 15, background: 'rgba(255,255,255,0.22)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
                        <Trophy size={28} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: '#fff', fontFamily: F }}>You predicted all five — {score}/{mixtures.length} correct!</div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 2, lineHeight: 1.5 }}>
                            The pattern: a <b>big weight gap</b> separates well, a <b>small gap</b> only partly, and <b>two heavy parts</b> don't separate by wind at all.
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
                {mixtures.map((m, i) => (
                    <MixtureCard key={m.id} mix={m} index={i} answer={answers[m.id]} onAnswer={onAnswer} resetKey={resetKey} />
                ))}
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────
// CARD WALK (Learn / Real World)
// ──────────────────────────────────────────────────────────────────────────
const iconFor = (k: CardContent['icon']) => k === 'wind' ? <Wind size={22} /> : k === 'scale' ? <Scale size={22} /> : k === 'bulb' ? <Lightbulb size={22} /> : <Sparkles size={22} />;

const CardWalk: React.FC<{ cards: CardContent[]; theme: string }> = ({ cards, theme }) => {
    const [i, setI] = useState(0);
    const c = cards[i];
    const go = (d: number) => setI(p => Math.max(0, Math.min(cards.length - 1, p + d)));
    return (
        <div>
            <div key={c.id} style={{ animation: 'wb-rise .45s ease both' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: theme, marginBottom: 12 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: `${theme}1a`, color: theme }}>{iconFor(c.icon)}</span>
                    {c.tag}
                </span>
                <h2 style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 14px', color: P.ink, fontFamily: F }}>{c.title}</h2>
                <p style={{ fontSize: 18, lineHeight: 1.7, color: P.ink, background: '#F4F1FB', padding: 22, borderRadius: 16, borderLeft: `5px solid ${theme}`, margin: 0 }}>{c.description}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
                <button onClick={() => go(-1)} disabled={i === 0} className="wb-nav" style={navBtn(i === 0)}><ChevronLeft size={18} /> Back</button>
                <div style={{ display: 'flex', gap: 7 }}>
                    {cards.map((_, k) => <span key={k} onClick={() => setI(k)} style={{ width: k === i ? 26 : 9, height: 9, borderRadius: 9, cursor: 'pointer', background: k === i ? theme : P.grey200, transition: 'all .3s' }} />)}
                </div>
                <button onClick={() => go(1)} disabled={i === cards.length - 1} className="wb-nav" style={{ ...navBtn(i === cards.length - 1), background: i === cards.length - 1 ? P.grey200 : `linear-gradient(135deg, ${theme}, ${darken(theme, 14)})`, color: i === cards.length - 1 ? P.sub : '#fff' }}>Next <ChevronRight size={18} /></button>
            </div>
        </div>
    );
};
const navBtn = (disabled: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 22px', borderRadius: 9999, border: `2px solid ${P.grey200}`, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, fontFamily: F, background: P.white, color: disabled ? P.sub : P.ink, opacity: disabled ? 0.5 : 1, boxShadow: disabled ? 'none' : '0 3px 10px rgba(74,77,201,0.08)' });

// ──────────────────────────────────────────────────────────────────────────
// WINNOW SIMULATOR (Hands On) — canvas physics
// ──────────────────────────────────────────────────────────────────────────
const SIM_PAIRS = DEFAULT_MIXTURES.map(m => ({
    id: m.id, label: m.name, heavy: m.heavy, light: m.light,
    // higher mass = wind barely moves it. Heavy items are very heavy so they drop
    // almost straight down; light items are light so the breeze carries them.
    lightMass: m.id === 'sand' ? 5 : m.id === 'rice' ? 1.3 : 0.16,
    heavyMass: (m.id === 'sand' || m.id === 'rice') ? 6 : 4.2,
    // how many bits to toss
    lightCount: m.id === 'sand' ? 500 : 90,
    heavyCount: 28,
}));

const WIND_LEVEL = 4;        // fixed wind strength, out of 10 (a gentle breeze)
const WIND_NORM = WIND_LEVEL / 10;
const WIND_K = 4.5;          // wind → terminal horizontal speed scale

const WinnowSim: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const partsRef = useRef<any[]>([]);
    const rafRef = useRef<number>();
    const [pair, setPair] = useState(2); // wheat+husk
    const pairRef = useRef(pair);
    useEffect(() => { pairRef.current = pair; }, [pair]);

    const W = 560, H = 320, floor = H - 24;

    const toss = useCallback(() => {
        const p = SIM_PAIRS[pairRef.current];
        const arr: any[] = [];
        const spawn = (heavy: boolean, count: number) => {
            const kind = heavy ? p.heavy.kind : p.light.kind;
            const isSand = kind === 'sand';
            const r = heavy
                ? (kind === 'pebble' || kind === 'stone' ? 5 : 4.2)
                : (isSand ? 1.6 : (kind === 'husk' || kind === 'skin' ? 2.6 : 3.2));
            for (let i = 0; i < count; i++) {
                arr.push({
                    x: 78 + Math.random() * 74, y: 54 + Math.random() * 30,
                    vx: 0, vy: -1.8 - Math.random() * 1.3,
                    mass: heavy ? p.heavyMass : p.lightMass, heavy,
                    color: heavy ? p.heavy.color : p.light.color,
                    r, stroke: r >= 2, settled: false,
                });
            }
        };
        spawn(true, p.heavyCount);
        spawn(false, p.lightCount);
        partsRef.current = arr;
    }, []);

    useEffect(() => {
        const cv = canvasRef.current; if (!cv) return;
        const ctx = cv.getContext('2d'); if (!ctx) return;
        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            // bg
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#eaf4fb'); g.addColorStop(1, '#dfeef8');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            // floor
            ctx.fillStyle = '#c8a86f'; ctx.fillRect(0, floor, W, H - floor);
            // wind arrows
            const wv = WIND_NORM;
            ctx.strokeStyle = `rgba(70,140,200,${0.18 + wv * 0.3})`; ctx.lineWidth = 2;
            for (let k = 0; k < 5; k++) {
                const yy = 50 + k * 34; const len = 30 + wv * 90;
                ctx.beginPath(); ctx.moveTo(20, yy); ctx.lineTo(20 + len, yy);
                ctx.lineTo(20 + len - 7, yy - 4); ctx.moveTo(20 + len, yy); ctx.lineTo(20 + len - 7, yy + 4);
                ctx.stroke();
            }
            // zone labels
            ctx.fillStyle = 'rgba(120,90,40,0.5)'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('heavy falls here', W * 0.28, floor + 17);
            ctx.fillStyle = 'rgba(60,120,170,0.6)';
            ctx.fillText('light blows here →', W * 0.74, floor + 17);

            const parts = partsRef.current;
            for (const pt of parts) {
                if (!pt.settled) {
                    pt.vy += 0.14; // gravity
                    // wind pushes toward a terminal horizontal speed set by mass:
                    // light bits reach a high speed (blow away); heavy bits barely move.
                    const targetVx = WIND_NORM * (WIND_K / pt.mass);
                    pt.vx += (targetVx - pt.vx) * 0.12; // approach terminal (air drag)
                    pt.x += pt.vx; pt.y += pt.vy;
                    if (pt.y >= floor - pt.r) { pt.y = floor - pt.r; pt.settled = true; pt.vx = 0; pt.vy = 0; }
                    if (pt.x > W - 6) { pt.x = W - 6; pt.vx *= -0.3; }
                }
                ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
                ctx.fillStyle = pt.color; ctx.fill();
                if (pt.stroke) { ctx.strokeStyle = darken(pt.color, 26); ctx.lineWidth = 0.8; ctx.stroke(); }
            }
            rafRef.current = requestAnimationFrame(draw);
        };
        rafRef.current = requestAnimationFrame(draw);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    return (
        <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#3E7FC0', marginBottom: 8 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(62,127,192,0.12)', color: '#3E7FC0', display: 'grid', placeItems: 'center' }}><Wind size={16} /></span>
                Winnow it yourself
            </span>
            <h2 style={{ margin: '8px 0 16px', fontSize: 26, fontWeight: 700, color: P.ink, fontFamily: F }}>Toss the mixture into the wind</h2>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
                <div style={{ flex: '1 1 220px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: P.ink, marginBottom: 6 }}>Mixture</label>
                    <select value={pair} onChange={e => setPair(parseInt(e.target.value, 10))}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `2px solid ${P.grey200}`, background: P.white, fontSize: 14, fontWeight: 600, color: P.ink, cursor: 'pointer', fontFamily: F }}>
                        {SIM_PAIRS.map((sp, i) => <option key={i} value={i}>{sp.label}</option>)}
                    </select>
                </div>
                <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 9999, border: '1px solid #cfe0ee', background: '#eef6fc', color: '#3E7FC0', fontWeight: 700, fontSize: 14, height: 46, fontFamily: F }}>
                    <Wind size={18} /> Wind strength: {WIND_LEVEL} / 10
                </div>
                <button onClick={toss} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 26px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15, color: '#fff', fontFamily: F, background: 'linear-gradient(135deg, #3E7FC0, #4AA3D4)', boxShadow: '0 10px 22px -8px rgba(62,127,192,0.6)' }}>
                    <Wind size={18} /> Toss!
                </button>
            </div>

            <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', maxWidth: W, borderRadius: 18, border: `1px solid ${P.grey200}`, display: 'block' }} />

            <p style={{ marginTop: 12, color: P.sub, fontSize: 14, lineHeight: 1.6 }}>
                The wind is a steady gentle breeze (fixed at {WIND_LEVEL}&nbsp;/&nbsp;10). Press <b style={{ color: P.ink }}>Toss</b> and switch mixtures to compare: with a big weight gap (like wheat &amp; husk) the light part blows aside and separates cleanly, while <b style={{ color: P.ink }}>rice &amp; stones</b> or <b style={{ color: P.ink }}>sand &amp; pebbles</b> fall almost together — too close in weight, so the breeze can't lift the heavy part.
            </p>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────
interface ToolProps {
    props?: {
        width?: number;
        initialMode?: ModeType;
        showModeSelector?: boolean;
        enabledModes?: ModeType[];
        showScore?: boolean;
        shuffle?: boolean;
        themeColor?: string;
        additionalProps?: {
            mixtures?: MixtureDef[];
            showScore?: boolean;
            shuffle?: boolean;
        };
    };
    setStepDetails?: (s: { currentStep: number; totalSteps: number; isPaused: boolean; currentMode: ModeType }) => void;
}

const WinnowingPredictionBoard: React.FC<ToolProps> = ({ props = {}, setStepDetails }) => {
    const cfg = useMemo(() => ({
        width: props.width ?? 900,
        initialMode: props.initialMode ?? 'predict' as ModeType,
        showModeSelector: props.showModeSelector ?? true,
        enabledModes: props.enabledModes ?? ['predict', 'real_world', 'hands_on'] as ModeType[],
        themeColor: props.themeColor ?? '#b07a2a',
    }), [props]);

    const ap = props.additionalProps || {};
    const showScore = ap.showScore ?? props.showScore ?? true;
    const shuffle = ap.shuffle ?? props.shuffle ?? false;

    const mixtures = useMemo(() => {
        const base = (ap.mixtures && ap.mixtures.length ? ap.mixtures : DEFAULT_MIXTURES).slice();
        if (shuffle) base.sort(() => Math.random() - 0.5);
        return base;
    }, [ap.mixtures, shuffle]);

    const [mode, setMode] = useState<ModeType>(cfg.initialMode);
    const [fade, setFade] = useState(1);

    useEffect(() => {
        loadPoppins();
        const css = `
        @keyframes wb-rise { from{opacity:0; transform:translateY(16px);} to{opacity:1; transform:translateY(0);} }
        @keyframes wb-fade { from{opacity:0;} to{opacity:1;} }
        @keyframes wb-pop { 0%{transform:scale(0);} 70%{transform:scale(1.25);} 100%{transform:scale(1);} }
        @keyframes wb-float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-3px);} }
        .wb-card { transition: transform .22s ease, box-shadow .22s ease; }
        .wb-card:hover { transform: translateY(-4px); box-shadow: 0 26px 50px -26px rgba(74,77,201,0.5); }
        .wb-opt { transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease; }
        .wb-opt:not(:disabled){ cursor: pointer; }
        .wb-opt:not(:disabled):hover { transform: translateY(-2px); border-color: #4A4DC9 !important; background: #F4F4FC !important; box-shadow: 0 10px 20px -12px rgba(74,77,201,0.55); }
        .wb-opt:not(:disabled):active { transform: translateY(0); }
        .wb-tab { transition: all .2s ease; }
        .wb-tab:hover { transform: translateY(-1px); filter: brightness(1.03); }
        .wb-nav { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .wb-nav:not(:disabled):hover { transform: translateY(-2px); }
        `;
        const el = document.createElement('style'); el.id = 'wb-keyframes'; el.textContent = css;
        document.head.appendChild(el);
        return () => { const e = document.getElementById('wb-keyframes'); if (e) e.remove(); };
    }, []);

    useEffect(() => { setStepDetails?.({ currentStep: 1, totalSteps: 1, isPaused: true, currentMode: mode }); }, [mode, setStepDetails]);

    const switchMode = (m: ModeType) => { if (m === mode) return; setFade(0); setTimeout(() => { setMode(m); setFade(1); }, 200); };

    const modeMeta: Record<ModeType, { label: string; from: string; to: string }> = {
        learn: { label: 'Learn', from: '#c79a2e', to: '#e0b94f' },
        predict: { label: 'Predict', from: '#4A4DC9', to: '#6E5BD0' },
        real_world: { label: 'Real World', from: '#533086', to: '#9460C4' },
        hands_on: { label: 'Winnow It', from: '#3E7FC0', to: '#4AA3D4' },
    };

    return (
        <div style={{ width: '100%', maxWidth: cfg.width, margin: '0 auto', background: P.grey100, borderRadius: 26, overflow: 'hidden', boxShadow: '0 30px 60px -22px rgba(74,77,201,0.3)', border: `1px solid ${P.grey200}`, fontFamily: F }}>
            <div style={{ display: cfg.showModeSelector ? 'flex' : 'none', gap: 8, padding: 16, background: P.white, borderBottom: `1px solid ${P.grey200}`, justifyContent: 'center', flexWrap: 'wrap' }}>
                {cfg.enabledModes.map(m => {
                    const sel = mode === m; const mm = modeMeta[m];
                    return (
                        <button key={m} onClick={() => switchMode(m)} className="wb-tab" style={{
                            fontFamily: F, padding: '11px 22px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                            transition: 'all .25s', background: sel ? `linear-gradient(135deg, ${mm.from}, ${mm.to})` : P.grey100,
                            color: sel ? '#fff' : P.sub, boxShadow: sel ? '0 8px 18px -8px rgba(74,77,201,0.5)' : 'none',
                            transform: sel ? 'translateY(-1px)' : 'none',
                        }}>{mm.label}</button>
                    );
                })}
            </div>

            <div style={{ padding: 26, opacity: fade, transition: 'opacity .2s ease' }}>
                {mode === 'predict' && <PredictBoard mixtures={mixtures} showScore={showScore} />}
                {mode === 'real_world' && <CardWalk cards={CARDS.filter(c => c.mode === 'real_world')} theme={P.purple} />}
                {mode === 'hands_on' && <WinnowSim />}
            </div>
        </div>
    );
};

export default WinnowingPredictionBoard;
export { WinnowingPredictionBoard };  // named export so the preview harness can mount by name

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════