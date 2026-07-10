import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";

/* ================================================================== *
 *  Magnetic or Non-Magnetic? — a drag-the-magnet sorting GAME
 *
 *  • One lifelike object sits on the table at a time.
 *  • Drag the single magnet onto an object (or tap it) to test it.
 *  • Iron & steel cling; everything else stays put — physics is fixed.
 *  • The moment one object is identified it leaves and the NEXT object
 *    slides in, until every object has appeared and been tested.
 *  • Final result is a two-column table: Magnetic | Non-magnetic.
 *
 *  Pair file: magnet_sort_game.json (same data this component embeds).
 * ================================================================== */

/* ── Agent-control contract (see magnet_sort_game.json §3) ── */
const TOOL_ID = "M6.S1.T1.C1.2D1";
const emit = (m: any) => { try { window.parent.postMessage(m, "*"); } catch { } };

type OperatorMode = "ai" | "student";

interface ObjectDef {
  id: string;
  name: string;
  material: string;
  magnetic: boolean;
  iconKey: string;
}
interface ToolConfig {
  title: string;
  subtitle: string;
  instruction: string;
  onScreenCount: number;
  gradeLevel: 6 | 7 | 8;
  objects: ObjectDef[];
}
interface ToolProps {
  props?: {
    width?: number;
    height?: number;
    data?: Partial<ToolConfig>;
    gradeLevel?: 6 | 7 | 8;
    operatorMode?: OperatorMode;
    muted?: boolean;
    seed?: number;
    showModeToggle?: boolean;
    additionalProps?: Record<string, any>;
  };
  setStepDetails?: (s: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

const DEFAULT_CONFIG: ToolConfig = {
  title: "Magnetic or Non-Magnetic?",
  subtitle: "Test each object with the magnet — which ones cling?",
  instruction: "Drag the magnet down onto each object. Magnetic ones leap up and cling to the poles!",
  onScreenCount: 1,
  gradeLevel: 6,
  objects: [
    { id: "nail", name: "Iron Nail", material: "Iron", magnetic: true, iconKey: "nail" },
    { id: "clip", name: "Steel Paper Clip", material: "Steel (iron)", magnetic: true, iconKey: "clip" },
    { id: "key", name: "Iron Key", material: "Iron", magnetic: true, iconKey: "key" },
    { id: "spoon", name: "Steel Spoon", material: "Steel (iron)", magnetic: true, iconKey: "spoon" },
    { id: "pin", name: "Steel Safety Pin", material: "Steel (iron)", magnetic: true, iconKey: "pin" },
    { id: "scissors", name: "Steel Scissors", material: "Steel (iron)", magnetic: true, iconKey: "scissors" },
    { id: "bolt", name: "Iron Bolt", material: "Iron", magnetic: true, iconKey: "bolt" },
    { id: "needle", name: "Steel Needle", material: "Steel (iron)", magnetic: true, iconKey: "needle" },
    { id: "fork", name: "Steel Fork", material: "Steel (iron)", magnetic: true, iconKey: "fork" },
    { id: "marble", name: "Glass Marble", material: "Glass", magnetic: false, iconKey: "marble" },
    { id: "copper", name: "Copper Coin", material: "Copper", magnetic: false, iconKey: "copper" },
    { id: "foil", name: "Aluminium Foil", material: "Aluminium", magnetic: false, iconKey: "foil" },
    { id: "wood", name: "Wooden Block", material: "Wood", magnetic: false, iconKey: "wood" },
    { id: "bell", name: "Brass Bell", material: "Brass (copper + zinc)", magnetic: false, iconKey: "bell" },
    { id: "ruler", name: "Plastic Ruler", material: "Plastic", magnetic: false, iconKey: "ruler" },
    { id: "eraser", name: "Rubber Eraser", material: "Rubber", magnetic: false, iconKey: "eraser" },
    { id: "bottle", name: "Plastic Bottle", material: "Plastic", magnetic: false, iconKey: "bottle" },
    { id: "pencil", name: "Wooden Pencil", material: "Wood", magnetic: false, iconKey: "pencil" },
  ],
};

const C = {
  text: "#1A1A2E",
  sub: "#5B5B6B",
  line: "#E7E7F0",
  page: "#F4F4FB",
  mag: "#E5322B",
  magSoft: "#FDEDEC",
  magBorder: "#F6C9C6",
  non: "#2563EB",
  nonSoft: "#EAF1FE",
  nonBorder: "#C6DBFB",
};

const TIER = {
  6: { confetti: 46, scorePx: 60, again: "Play again!" },
  7: { confetti: 30, scorePx: 52, again: "Play again" },
  8: { confetti: 14, scorePx: 46, again: "Try again" },
} as const;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Deterministic RNG (mulberry32) — same seed ⇒ same shuffle (§8).
function makeRng(seed: number) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


// a small handful of the object — a few clear, recognisable copies (not a messy heap)
const GROUP = [
  { x: -22, y: -3, rot: -13, s: 0.76 },
  { x: 22, y: -1, rot: 13, s: 0.76 },
  { x: 0, y: 9, rot: 2, s: 0.92 },
];

// when a magnetic object leaps up, the pieces fan out and radiate from the two poles,
// clinging like nails jumping onto a magnet (not a flat card sliding up)
const CLING = [
  { x: -28, y: 2, rot: -50, s: 0.60 },
  { x: 28, y: 2, rot: 50, s: 0.60 },
  { x: 0, y: 14, rot: 3, s: 0.72 },
];

/* How long a non-magnetic object wobbles before the magnet gives up and
   returns to its box. Magnetic objects don't wait — they snap onto the magnet
   the instant it touches them. Tune here without touching the JSON. */
const NONMAG_WAIT = 1000;

/* ------------------------------------------------------------------ *
 *  Hand-drawn object art (so objects look real, not like emoji)
 * ------------------------------------------------------------------ */
function ObjArt({ k, bare = false }: { k: string; bare?: boolean }) {
  const common = { width: "100%", height: "100%", viewBox: "0 0 100 100", style: { display: "block", overflow: "visible" } as React.CSSProperties };
  const shadow = (rx: number) => (bare ? null : <ellipse cx="50" cy="90" rx={rx} ry={rx * 0.2} fill="#28205a" opacity="0.14" />);
  switch (k) {
    case "nail":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="nailShaft" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7f858e" /><stop offset=".5" stopColor="#fbfdff" /><stop offset="1" stopColor="#6b717a" /></linearGradient>
            <radialGradient id="nailHead" cx="0.38" cy="0.30" r="0.78"><stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor="#cfd4da" /><stop offset="1" stopColor="#7d838c" /></radialGradient>
          </defs>
          {shadow(24)}
          <g transform="rotate(34 50 50)">
            <path d="M43.5 24 L56.5 24 L53 78 L50 92 L47 78 Z" fill="url(#nailShaft)" stroke="#646a72" strokeWidth="0.8" />
            <path d="M47.6 27 L46.2 75" stroke="#ffffff" strokeWidth="1.6" opacity=".7" strokeLinecap="round" />
            <ellipse cx="50" cy="22" rx="15" ry="8.5" fill="url(#nailHead)" stroke="#646a72" strokeWidth="0.9" />
            <ellipse cx="44.6" cy="19" rx="5.5" ry="2.6" fill="#ffffff" opacity=".82" transform="rotate(-18 44.6 19)" />
          </g>
        </svg>
      );
    case "clip":
      return (
        <svg {...common}>
          {shadow(22)}
          <g transform="rotate(12 50 50)" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M34 84 V31 a18 18 0 0 1 36 0 V69 a10 10 0 0 1 -20 0 V40" stroke="#9aa0a8" strokeWidth="7" />
            <path d="M34 84 V31 a18 18 0 0 1 36 0 V69 a10 10 0 0 1 -20 0 V40" stroke="#e8ebef" strokeWidth="2.6" />
          </g>
        </svg>
      );
    case "key":
      return (
        <svg {...common}>
          <defs><linearGradient id="keyG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c2c7ce" /><stop offset="1" stopColor="#71777f" /></linearGradient></defs>
          {shadow(22)}
          <g transform="rotate(24 50 50)">
            <circle cx="50" cy="22" r="16" fill="none" stroke="url(#keyG)" strokeWidth="9" />
            <circle cx="50" cy="22" r="5.5" fill="#eef0f5" />
            <rect x="46" y="34" width="8" height="48" rx="2.5" fill="url(#keyG)" />
            <rect x="54" y="58" width="10" height="6.5" rx="1" fill="url(#keyG)" />
            <rect x="54" y="70" width="14" height="6.5" rx="1" fill="url(#keyG)" />
            <rect x="44.5" y="34" width="2.6" height="48" rx="1.3" fill="#fff" opacity=".4" />
          </g>
        </svg>
      );
    case "spoon":
      return (
        <svg {...common}>
          <defs><linearGradient id="spoonG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f1f4f7" /><stop offset="1" stopColor="#9aa0a8" /></linearGradient></defs>
          {shadow(20)}
          <g transform="rotate(33 50 50)">
            <ellipse cx="50" cy="24" rx="16" ry="20" fill="url(#spoonG)" stroke="#868c94" strokeWidth="1.2" />
            <ellipse cx="50" cy="23" rx="9.5" ry="13" fill="#c2c7ce" opacity=".5" />
            <ellipse cx="44" cy="16" rx="5" ry="7.5" fill="#fff" opacity=".6" />
            <rect x="46" y="40" width="8" height="46" rx="4" fill="url(#spoonG)" stroke="#868c94" strokeWidth="1.2" />
          </g>
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          {shadow(24)}
          <g transform="rotate(-14 50 50)" fill="none" stroke="#aab0b8" strokeWidth="5" strokeLinecap="round">
            <circle cx="28" cy="72" r="8" />
            <path d="M32 66 L74 28" />
            <path d="M34 77 L68 39" />
            <path d="M72 23 q10 3 6 16" />
            <path d="M32 66 L74 28" stroke="#e6e9ed" strokeWidth="1.8" />
          </g>
        </svg>
      );
    case "scissors":
      return (
        <svg {...common}>
          <defs><linearGradient id="sciB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eef1f4" /><stop offset="1" stopColor="#9aa0a8" /></linearGradient></defs>
          {shadow(26)}
          <g transform="rotate(-18 50 50)">
            <path d="M50 54 L18 16 q-5 6 1 11 L46 58 Z" fill="url(#sciB)" stroke="#7d838c" strokeWidth="1" />
            <path d="M50 54 L82 16 q5 6 -1 11 L54 58 Z" fill="url(#sciB)" stroke="#7d838c" strokeWidth="1" />
            <path d="M50 55 L40 70" stroke="#FF7212" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <path d="M50 55 L60 70" stroke="#FF7212" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <circle cx="37" cy="77" r="7.5" fill="none" stroke="#FF7212" strokeWidth="5.5" />
            <circle cx="63" cy="77" r="7.5" fill="none" stroke="#FF7212" strokeWidth="5.5" />
            <circle cx="50" cy="55" r="4.2" fill="#6b7178" /><circle cx="50" cy="55" r="1.6" fill="#cfd4da" />
          </g>
        </svg>
      );
    case "bolt":
      return (
        <svg {...common}>
          <defs><linearGradient id="boltG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d7dbe0" /><stop offset="1" stopColor="#7c828b" /></linearGradient></defs>
          {shadow(22)}
          <g transform="rotate(20 50 50)">
            <polygon points="50,12 70,23 70,45 50,56 30,45 30,23" fill="url(#boltG)" stroke="#666c74" strokeWidth="1.2" />
            <polygon points="50,18 64,26 64,42 50,50 36,42 36,26" fill="none" stroke="#9aa0a8" strokeWidth="1.4" opacity=".55" />
            <rect x="42" y="54" width="16" height="34" rx="2" fill="url(#boltG)" stroke="#666c74" strokeWidth="1" />
            <g stroke="#7c828b" strokeWidth="1.6" opacity=".7">
              <line x1="42" y1="60" x2="58" y2="63" /><line x1="42" y1="66" x2="58" y2="69" />
              <line x1="42" y1="72" x2="58" y2="75" /><line x1="42" y1="78" x2="58" y2="81" />
            </g>
          </g>
        </svg>
      );
    case "needle":
      return (
        <svg {...common}>
          <defs><linearGradient id="ndlG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9aa0a8" /><stop offset=".5" stopColor="#f1f4f7" /><stop offset="1" stopColor="#868c94" /></linearGradient></defs>
          {shadow(14)}
          <g transform="rotate(40 50 50)">
            <path d="M48 14 L52 14 L51 86 L49 86 Z" fill="url(#ndlG)" stroke="#7d838c" strokeWidth="0.8" />
            <ellipse cx="50" cy="22" rx="2.3" ry="6" fill="#3a3a52" />
            <path d="M50 22 q14 6 8 22 q-6 14 6 24" fill="none" stroke="#E5322B" strokeWidth="2" opacity=".85" strokeLinecap="round" />
          </g>
        </svg>
      );
    case "fork":
      return (
        <svg {...common}>
          <defs><linearGradient id="forkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f1f4f7" /><stop offset="1" stopColor="#9aa0a8" /></linearGradient></defs>
          {shadow(18)}
          <g transform="rotate(30 50 50)">
            <g fill="url(#forkG)" stroke="#868c94" strokeWidth="0.8">
              <rect x="36" y="14" width="4.5" height="22" rx="2" /><rect x="44" y="14" width="4.5" height="22" rx="2" />
              <rect x="52" y="14" width="4.5" height="22" rx="2" /><rect x="60" y="14" width="4.5" height="22" rx="2" />
            </g>
            <path d="M36 34 q14 8 28 0 l-4 12 h-20 Z" fill="url(#forkG)" stroke="#868c94" strokeWidth="1" />
            <rect x="46" y="46" width="8" height="40" rx="4" fill="url(#forkG)" stroke="#868c94" strokeWidth="1" />
          </g>
        </svg>
      );
    case "marble":
      return (
        <svg {...common}>
          <defs>
            <radialGradient id="mGlass" cx="0.36" cy="0.30" r="0.85">
              <stop offset="0" stopColor="#bfefff" /><stop offset=".35" stopColor="#5cc3f5" />
              <stop offset=".7" stopColor="#2f86d6" /><stop offset="1" stopColor="#15487f" />
            </radialGradient>
            <radialGradient id="mCore" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" /><stop offset="1" stopColor="#0d2f57" stopOpacity=".35" />
            </radialGradient>
          </defs>
          {shadow(30)}
          <circle cx="50" cy="48" r="40" fill="url(#mGlass)" />
          <circle cx="50" cy="48" r="40" fill="url(#mCore)" />
          <path d="M26 58 Q44 36 72 50" stroke="#dff6ff" strokeWidth="3.5" fill="none" opacity=".5" strokeLinecap="round" />
          <path d="M30 68 Q52 56 74 66" stroke="#9bd9ff" strokeWidth="3" fill="none" opacity=".35" strokeLinecap="round" />
          <ellipse cx="38" cy="34" rx="13" ry="9" fill="#ffffff" opacity=".85" transform="rotate(-28 38 34)" />
          <circle cx="61" cy="32" r="3.2" fill="#ffffff" opacity=".7" />
        </svg>
      );
    case "copper":
      return (
        <svg {...common}>
          <defs><radialGradient id="copG" cx="0.38" cy="0.32" r="0.85"><stop offset="0" stopColor="#ffd9a8" /><stop offset=".55" stopColor="#cf8543" /><stop offset="1" stopColor="#8f4f1d" /></radialGradient></defs>
          {shadow(28)}
          <circle cx="50" cy="48" r="38" fill="url(#copG)" stroke="#7a4a1e" strokeWidth="2.2" />
          <circle cx="50" cy="48" r="31" fill="none" stroke="#7a4a1e" strokeWidth="1.6" opacity=".45" />
          <text x="50" y="61" textAnchor="middle" fontSize="34" fontWeight="800" fill="#7a4a1e" fontFamily="Poppins, sans-serif">₹</text>
          <ellipse cx="38" cy="32" rx="11" ry="6" fill="#fff" opacity=".4" transform="rotate(-25 38 32)" />
        </svg>
      );
    case "foil":
      return (
        <svg {...common}>
          {shadow(28)}
          <path d="M26 38 Q18 22 36 18 Q52 10 68 20 Q86 24 80 44 Q88 60 72 70 Q62 86 44 78 Q24 80 22 60 Q14 48 26 38 Z" fill="#d4d9df" />
          <polygon points="36,26 54,20 50,42 33,47" fill="#eef1f4" />
          <polygon points="54,20 70,28 63,46 50,42" fill="#b6bcc4" />
          <polygon points="33,47 50,42 46,64 31,60" fill="#e1e5ea" />
          <polygon points="50,42 63,46 59,66 46,64" fill="#c7ccd3" />
          <polygon points="46,64 59,66 53,78 43,74" fill="#eef1f4" />
          <polygon points="63,46 73,51 69,66 59,66" fill="#aab0b8" />
          <path d="M40 30 L48 54 M60 28 L55 52 M44 66 L50 74" stroke="#9aa0a8" strokeWidth="0.9" opacity=".5" />
          <polygon points="40,24 47,21 45,30 38,32" fill="#fff" opacity=".55" />
        </svg>
      );
    case "wood":
      return (
        <svg {...common}>
          {shadow(30)}
          <polygon points="50,14 84,32 50,50 16,32" fill="#d99b58" />
          <polygon points="16,32 50,50 50,84 16,66" fill="#a96e36" />
          <polygon points="50,50 84,32 84,66 50,84" fill="#8a5328" />
          <g opacity=".5" stroke="#9a622f" strokeWidth="1.1" fill="none">
            <path d="M22 38 Q34 44 44 43 M22 49 Q35 55 44 53 M22 60 Q33 64 44 63" />
          </g>
          <g opacity=".45" stroke="#6e4420" strokeWidth="1.1" fill="none">
            <path d="M56 43 Q66 48 78 46 M56 54 Q67 59 78 56 M56 65 Q66 69 78 66" />
          </g>
          <polygon points="50,14 84,32 50,50 16,32" fill="#fff" opacity=".08" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <defs><linearGradient id="bellG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#d49a25" /></linearGradient></defs>
          {shadow(26)}
          <circle cx="50" cy="20" r="4.5" fill="none" stroke="#9a6b15" strokeWidth="3" />
          <path d="M50 24 q-2.5 0 -2.5 4.5 q-16 4 -18 32 q-1 8 -9 13 l59 0 q-8 -5 -9 -13 q-2 -28 -18 -32 q0 -4.5 -2.5 -4.5 Z" fill="url(#bellG)" stroke="#9a6b15" strokeWidth="1.4" />
          <rect x="20.5" y="73" width="59" height="7" rx="3.5" fill="url(#bellG)" stroke="#9a6b15" strokeWidth="1.1" />
          <circle cx="50" cy="85" r="4.8" fill="#9a6b15" />
          <path d="M40 42 q-5 13 -4 28" stroke="#fff5cf" strokeWidth="2.6" fill="none" opacity=".6" strokeLinecap="round" />
        </svg>
      );
    case "ruler":
      return (
        <svg {...common}>
          <defs><linearGradient id="rulG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffef9a" /><stop offset="1" stopColor="#f4cf3a" /></linearGradient></defs>
          {shadow(26)}
          <g transform="rotate(-32 50 50)">
            <rect x="8" y="40" width="84" height="20" rx="3.5" fill="url(#rulG)" stroke="#d4ad12" strokeWidth="1.2" />
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={i} x1={14 + i * 7} y1="40" x2={14 + i * 7} y2={i % 2 ? 48 : 52} stroke="#9a7a00" strokeWidth="1.2" />
            ))}
            <rect x="8" y="40" width="84" height="5" rx="3" fill="#fff" opacity=".35" />
          </g>
        </svg>
      );
    case "eraser":
      return (
        <svg {...common}>
          {shadow(30)}
          <g transform="rotate(-8 50 50)">
            <polygon points="20,48 30,38 88,38 78,48" fill="#ffc0cd" />
            <polygon points="78,48 88,38 88,66 78,76 78,48" fill="#ee6f8d" />
            <rect x="20" y="48" width="58" height="28" rx="3" fill="#ff95aa" stroke="#e2607f" strokeWidth="1" />
            <rect x="40" y="48" width="22" height="28" fill="#cfe3ff" />
            <line x1="40" y1="48" x2="40" y2="76" stroke="#9bbce0" strokeWidth="1" />
            <line x1="62" y1="48" x2="62" y2="76" stroke="#9bbce0" strokeWidth="1" />
            <rect x="20" y="48" width="58" height="6" rx="3" fill="#fff" opacity=".4" />
          </g>
        </svg>
      );
    case "bottle":
      return (
        <svg {...common}>
          <defs><linearGradient id="botG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#bfe6ff" stopOpacity=".9" /><stop offset=".5" stopColor="#eaf7ff" stopOpacity=".95" /><stop offset="1" stopColor="#a9d6f5" stopOpacity=".9" /></linearGradient></defs>
          {shadow(18)}
          <rect x="42" y="10" width="16" height="9" rx="2" fill="#2563EB" />
          <rect x="44" y="19" width="12" height="6" fill="#cfe6fb" />
          <path d="M40 25 q-6 4 -6 14 v34 q0 12 16 12 q16 0 16 -12 v-34 q0 -10 -6 -14 Z" fill="url(#botG)" stroke="#8fc3ea" strokeWidth="1.5" />
          <path d="M35 44 q15 5 30 0 v29 q0 11 -15 11 q-15 0 -15 -11 Z" fill="#7fc4f5" opacity=".5" />
          <g stroke="#8fc3ea" strokeWidth="1" opacity=".6"><line x1="35" y1="58" x2="65" y2="58" /><line x1="35" y1="63" x2="65" y2="63" /></g>
          <rect x="42" y="30" width="4" height="46" rx="2" fill="#fff" opacity=".5" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...common}>
          <defs><linearGradient id="penG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffd64a" /><stop offset=".5" stopColor="#ffe89a" /><stop offset="1" stopColor="#f0b800" /></linearGradient></defs>
          {shadow(16)}
          <g transform="rotate(38 50 50)">
            <polygon points="50,8 44,22 56,22" fill="#e0b07a" />
            <polygon points="50,8 47,15 53,15" fill="#3a3a52" />
            <rect x="44" y="22" width="12" height="50" fill="url(#penG)" stroke="#d4ad12" strokeWidth="0.8" />
            <line x1="48" y1="22" x2="48" y2="72" stroke="#d4a000" strokeWidth="0.8" opacity=".6" />
            <line x1="52" y1="22" x2="52" y2="72" stroke="#fff" strokeWidth="0.8" opacity=".5" />
            <rect x="44" y="72" width="12" height="9" fill="#c9cdd6" />
            <rect x="44" y="74" width="12" height="1.6" fill="#9aa0ad" /><rect x="44" y="77" width="12" height="1.6" fill="#9aa0ad" />
            <rect x="44" y="81" width="12" height="9" rx="2" fill="#ff8aa1" />
          </g>
        </svg>
      );
    default:
      return <svg {...common}><circle cx="50" cy="50" r="30" fill="#ccc" /></svg>;
  }
}

function HorseshoeMagnet({ size = 96, glowing = false }: { size?: number; glowing?: boolean }) {
  return (
    <svg width={size} height={size * 1.24} viewBox="0 0 100 124" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="magRedG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF6B63" /><stop offset="1" stopColor="#C9201A" /></linearGradient>
        <linearGradient id="magBluG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5B8DEF" /><stop offset="1" stopColor="#1E48C7" /></linearGradient>
        <filter id="magShadow" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#27123a" floodOpacity="0.22" /></filter>
      </defs>
      {glowing && (
        <g style={{ animation: "polePulse 0.9s ease-in-out infinite" }}>
          <circle cx="24" cy="114" r="17" fill="#ffd25b" opacity="0.34" />
          <circle cx="76" cy="114" r="17" fill="#7fb2ff" opacity="0.34" />
        </g>
      )}
      <g filter="url(#magShadow)">
        <path d="M24 112 L24 50 A26 26 0 0 1 76 50 L76 112" fill="none" stroke="url(#magRedG)" strokeWidth="22" strokeLinecap="butt" />
        <path d="M50 24 A26 26 0 0 1 76 50 L76 112" fill="none" stroke="url(#magBluG)" strokeWidth="22" strokeLinecap="butt" />
        <path d="M34 108 L34 50 A16 16 0 0 1 50 34" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" opacity="0.42" />
        <rect x="13" y="108" width="22" height="9" rx="2" fill="#C9CDD6" stroke="#9aa0ad" strokeWidth="1" />
        <rect x="65" y="108" width="22" height="9" rx="2" fill="#C9CDD6" stroke="#9aa0ad" strokeWidth="1" />
        <text x="24" y="115.4" textAnchor="middle" fontSize="8" fontWeight="800" fill="#C9201A" fontFamily="Poppins, sans-serif">N</text>
        <text x="76" y="115.4" textAnchor="middle" fontSize="8" fontWeight="800" fill="#1E48C7" fontFamily="Poppins, sans-serif">S</text>
      </g>
    </svg>
  );
}
/* ------------------------------------------------------------------ */
type Phase = "idle" | "stuck" | "repelled" | "leaving";
interface Cur {
  obj: ObjectDef;
  phase: Phase;
  key: number;
  dx: number;
  dy: number;
}

// Random but well-mixed test order: shuffle and avoid long runs of the same kind,
// so the sequence has no guessable pattern (not all magnetic then all non-magnetic).
function shuffleMixed<T extends { magnetic: boolean }>(items: T[], rng: () => number = Math.random): T[] {
  const fy = (arr: T[]) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const longestRun = (a: T[]) => {
    let best = 1, run = 1;
    for (let i = 1; i < a.length; i++) {
      run = a[i].magnetic === a[i - 1].magnetic ? run + 1 : 1;
      if (run > best) best = run;
    }
    return best;
  };
  let out = fy(items);
  for (let t = 0; t < 16 && longestRun(out) > 3; t++) out = fy(items);
  return out;
}

function MagnetSortGame({ props = {} }: ToolProps) {
  const config: ToolConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...(props.data || {}) }), [props.data]);
  const gradeLevel = (props.gradeLevel ?? config.gradeLevel ?? 6) as 6 | 7 | 8;
  const tier = TIER[gradeLevel];

  // ---- seed (deterministic given the same seed) ----
  const seedRef = useRef<number>(props.seed ?? props.additionalProps?.seed ?? 42);
  const [order, setOrder] = useState<ObjectDef[]>(() => shuffleMixed(config.objects, makeRng(seedRef.current)));
  const TOTAL = order.length;

  // ---- operator mode: 'student' (full controls) | 'ai' (collapsed demo view) ----
  const [operatorMode, setOperatorMode] = useState<OperatorMode>(props.operatorMode ?? "student");
  const modeRef = useRef<OperatorMode>(operatorMode); modeRef.current = operatorMode; // always-fresh mirror (avoid stale closures)

  // ---- sound (Web Audio, lazy, mutable) ----
  const muted = useRef<boolean>(!!props.muted);
  const acRef = useRef<AudioContext | null>(null);
  const ac = () => {
    if (typeof window === "undefined") return null;
    if (!acRef.current) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) acRef.current = new AC();
    }
    return acRef.current;
  };
  const tone = useCallback((freq: number, t0off: number, dur: number, type: OscillatorType = "sine", gain = 0.14) => {
    const ctx = ac(); if (!ctx || muted.current) return;
    const t = ctx.currentTime + t0off;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }, []);
  const playCue = useCallback((kind: "tap" | "cling" | "wobble" | "done") => {
    const ctx = ac(); if (!ctx || muted.current) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => { });
    if (kind === "tap") tone(440, 0, 0.09, "triangle", 0.08);
    else if (kind === "cling") { tone(523, 0, 0.1, "triangle"); tone(784, 0.09, 0.16, "triangle"); }
    else if (kind === "wobble") { tone(196, 0, 0.16, "sawtooth", 0.08); tone(160, 0.06, 0.14, "sine", 0.06); }
    else if (kind === "done") { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.28, "triangle", 0.12)); }
  }, [tone]);

  const labRef = useRef<HTMLDivElement | null>(null);
  const keyCounter = useRef(0);
  const nextIndex = useRef(0);
  const lockRef = useRef(false);
  const stuckRef = useRef(false);
  const autoReleaseRef = useRef<number | null>(null);
  const timers = useRef<number[]>([]);
  const addTimer = (id: number) => { timers.current.push(id); };
  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };

  const [size, setSize] = useState({ w: 720, h: 520 });
  const [magnet, setMagnet] = useState({ x: 360, y: 470 });
  const [current, setCurrent] = useState<Cur | null>(null);
  const [results, setResults] = useState<Record<string, "magnetic" | "nonmagnetic">>({});
  const [dragging, setDragging] = useState(false);
  const [autoMoving, setAutoMoving] = useState(false);
  const [hasTested, setHasTested] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // ---- §6.2 content depth: Teacher(ai) = lean single demo pair, Student = full pool ----
  const depth: "lean" | "full" = operatorMode === "ai" ? "lean" : "full";

  // ---- predict-then-reveal scoring (makes this an EVALUATING tool, §6.3) ----
  const [predictions, setPredictions] = useState<Record<string, "magnetic" | "nonmagnetic">>({});
  const [pendingPrediction, setPendingPrediction] = useState<"magnetic" | "nonmagnetic" | null>(null);
  const pendingRef = useRef<"magnetic" | "nonmagnetic" | null>(null);
  const [finished, setFinished] = useState(false);
  const [finishSummary, setFinishSummary] = useState<any>(null);
  const attemptsRef = useRef(0);
  const hintsUsedRef = useRef(0);
  const startTimeRef = useRef<number>(Date.now());

  // ---- layout ----
  // Height-aware: the magnet (top), the object (middle) and the two trays
  // (bottom) are packed into the measured lab so they NEVER overlap. When the
  // lab is short, the trays shrink first, then the magnet, so the object always
  // keeps a clear band of its own between the poles and the trays.
  const L = useMemo(() => {
    const M = 14;
    const W = Math.max(240, size.w);
    const Hh = Math.max(260, size.h);
    const innerW = W - 2 * M;
    const innerH = Hh - 2 * M;

    // fixed breathing gaps
    const topGap = 8;        // above the magnet's tallest point
    const magGap = 12;       // between the magnet poles and the object
    const objTrayGap = 12;   // between the object's name and the trays

    // reserved room for the object's name (up to ~2 lines)
    const labelFont = clamp(W * 0.022, 12, 15);
    const nameBand = labelFont * 2.3 + 12;

    const MIN_ICON = 44;

    // preferred magnet + tray sizes, then shrink to fit the available height
    let magSize = W < 520 ? 74 : 92;                 // the magnet is the hero
    let trayH = clamp(innerH * 0.24, 88, 140);

    const zoneOf = () => innerH - topGap - magSize * 1.24 - magGap - objTrayGap - trayH;
    let iconSize = zoneOf() - nameBand;

    // 1) recover room by trimming the trays toward a floor
    if (iconSize < MIN_ICON) {
      trayH = Math.max(72, trayH - (MIN_ICON - iconSize));
      iconSize = zoneOf() - nameBand;
    }
    // 2) still tight? shrink the magnet toward a floor
    if (iconSize < MIN_ICON) {
      magSize = Math.max(54, magSize - (MIN_ICON - iconSize) / 1.24);
      iconSize = zoneOf() - nameBand;
    }

    const magH = magSize * 1.24;

    // ── magnet parks at top-centre: poles at dock.y, U-body rises above ──
    const dock = { x: W / 2, y: M + topGap + magH };

    // ── two collection trays along the bottom ──
    const trayGap = clamp(innerW * 0.03, 8, 16);
    const trayW = (innerW - trayGap) / 2;
    const trayY = Hh - M - trayH;
    const magTray = { x: M, y: trayY, w: trayW, h: trayH };
    const nonTray = { x: M + trayW + trayGap, y: trayY, w: trayW, h: trayH };

    // ── safe zone for the object, centred between the magnet and the trays ──
    const zoneTop = dock.y + magGap;
    const zoneBottom = trayY - objTrayGap;
    const zoneAvail = Math.max(40, zoneBottom - zoneTop);
    iconSize = clamp(Math.min(iconSize, innerW * 0.34, zoneAvail - nameBand), 34, 104);
    const blockH = iconSize + nameBand;
    const blockTop = zoneTop + Math.max(0, (zoneAvail - blockH) / 2);
    const station = { x: W / 2, y: blockTop + iconSize / 2 };  // icon centred; name in the band below
    const objW = clamp(iconSize + 44, 120, Math.min(210, innerW - 24));

    // tray chips size to the measured width — bigger on wide screens, compact on phones
    const chipSize = clamp(W * 0.062, 22, 34);
    const chipIcon = chipSize * 0.66;

    const CONTACT = clamp(W * 0.08, 50, 88);
    const FIELD = CONTACT * 2.2;

    return { M, innerW, innerH, magSize, magH, dock,
             trayH, trayY, magTray, nonTray, iconSize, station,
             objW, labelFont, chipSize, chipIcon, CONTACT, FIELD };
  }, [size]);

  const makeObj = (obj: ObjectDef): Cur => ({ obj, phase: "idle", key: keyCounter.current++, dx: 0, dy: 0 });

  const setPending = (v: "magnetic" | "nonmagnetic" | null) => { pendingRef.current = v; setPendingPrediction(v); };

  // ── §6.2: Teacher(ai)/lean shows ONE representative magnetic + ONE non-magnetic item
  // (a crisp single demo); Student(full) gets the whole pool. Same data, same code path. ──
  const buildOrder = useCallback((dep: "lean" | "full", seed: number): ObjectDef[] => {
    const rng = makeRng(seed);
    const shuffled = shuffleMixed(config.objects, rng);
    if (dep === "lean") {
      const mag = shuffled.find((o) => o.magnetic);
      const non = shuffled.find((o) => !o.magnetic);
      return shuffleMixed([mag, non].filter(Boolean) as ObjectDef[], rng);
    }
    return shuffled;
  }, [config.objects]);

  const spawnNext = useCallback(() => {
    setPending(null);
    if (nextIndex.current < TOTAL) {
      const o = order[nextIndex.current];
      nextIndex.current += 1;
      setCurrent(makeObj(o));
    } else {
      setCurrent(null);
    }
  }, [order, TOTAL]);

  const startGame = useCallback((dep: "lean" | "full" = depth) => {
    clearTimers();
    // advance the seed each round so replays vary, yet stay deterministic per seed
    seedRef.current = (seedRef.current * 1664525 + 1013904223) >>> 0;
    const fresh = buildOrder(dep, seedRef.current);
    setOrder(fresh);
    keyCounter.current = 0;
    nextIndex.current = 1;
    lockRef.current = false;
    stuckRef.current = false;
    if (autoReleaseRef.current) { window.clearTimeout(autoReleaseRef.current); autoReleaseRef.current = null; }
    setResults({});
    setPredictions({});
    setPending(null);
    attemptsRef.current = 0;
    hintsUsedRef.current = 0;
    startTimeRef.current = Date.now();
    setHasTested(false);
    setFinished(false);
    setFinishSummary(null);
    setHighlighted(null);
    setCurrent(makeObj(fresh[0]));
    emit({ type: "event", name: "reset", detail: { total: fresh.length } });
  }, [buildOrder, depth]);

  useEffect(() => { startGame(operatorMode === "ai" ? "lean" : "full"); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => clearTimers(), []);

  // measure tray
  useEffect(() => {
    const el = labRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // park the magnet in its box on size change (when not being dragged)
  useEffect(() => {
    if (!dragging) setMagnet(L.dock);
    /* eslint-disable-next-line */
  }, [L.dock.x, L.dock.y]);

  const cornerTarget = (mag: boolean) =>
    mag
      ? { x: L.magTray.x + L.magTray.w / 2, y: L.magTray.y + L.magTray.h / 2 }
      : { x: L.nonTray.x + L.nonTray.w / 2, y: L.nonTray.y + L.nonTray.h / 2 };

  // ---- magnetic object: after it has shown it sticks, send it to the magnetic tally and clear the magnet ----
  const finishMagnetic = useCallback(() => {
    if (!stuckRef.current) return;
    stuckRef.current = false;
    if (autoReleaseRef.current) { window.clearTimeout(autoReleaseRef.current); autoReleaseRef.current = null; }
    setDragging(false);
    const t = cornerTarget(true);
    setCurrent((prev) =>
      prev ? { ...prev, phase: "leaving", dx: t.x - L.station.x, dy: t.y - L.station.y } : prev
    );
    setAutoMoving(true);
    setMagnet(L.dock);                       // magnet glides home empty — nothing is left clinging
    addTimer(window.setTimeout(() => { spawnNext(); lockRef.current = false; }, 520));
  }, [L, spawnNext]);

  // student mode requires a prediction locked in before the magnet may test the
  // object (this is what makes the round EVALUATED, §6.3); Teacher/lean demo skips it.
  // Reads modeRef/pendingRef (not the render-scoped variables) so it never goes stale.
  const needsPrediction = () => modeRef.current === "student" && !pendingRef.current;

  // ---- the magnet has reached the object: does it stick? ----
  const beginTest = useCallback(() => {
    if (lockRef.current || !current || current.phase !== "idle") return;
    if (needsPrediction()) return;
    lockRef.current = true;
    const obj = current.obj;
    setHasTested(true);
    attemptsRef.current += 1;
    if (pendingRef.current) {
      const guess = pendingRef.current;
      setPredictions((p) => ({ ...p, [obj.id]: guess }));
    }

    if (obj.magnetic) {
      // It STICKS — the object leaps onto the magnet's poles and rides with it.
      stuckRef.current = true;
      setResults((r) => ({ ...r, [obj.id]: "magnetic" }));
      setCurrent((prev) => (prev ? { ...prev, phase: "stuck", dx: 0, dy: 0 } : prev));
      playCue("cling");
      emit({ type: "event", name: "item_placed", detail: { itemId: obj.id, name: obj.name, material: obj.material, magnetic: true, tray: "magnetic" } });
      // If the student tapped (or never lets go) release it on its own.
      autoReleaseRef.current = window.setTimeout(() => finishMagnetic(), 2200);
      addTimer(autoReleaseRef.current);
    } else {
      // It does NOT stick — the object only wobbles and the magnet backs away.
      setDragging(false);
      setResults((r) => ({ ...r, [obj.id]: "nonmagnetic" }));
      setCurrent((prev) => (prev ? { ...prev, phase: "repelled", dx: 0, dy: 0 } : prev));
      playCue("wobble");
      emit({ type: "event", name: "item_placed", detail: { itemId: obj.id, name: obj.name, material: obj.material, magnetic: false, tray: "nonmagnetic" } });
      setAutoMoving(true);
      setMagnet({ x: L.station.x, y: L.station.y - L.iconSize * 0.7 - 10 });
      addTimer(window.setTimeout(() => {
        const t = cornerTarget(false);
        setCurrent((prev) =>
          prev ? { ...prev, phase: "leaving", dx: t.x - L.station.x, dy: t.y - L.station.y } : prev
        );
        setAutoMoving(true);
        setMagnet(L.dock);
        addTimer(window.setTimeout(() => { spawnNext(); lockRef.current = false; }, 480));
      }, NONMAG_WAIT));
    }
  }, [current, L, finishMagnetic, spawnNext]);

  const runHitTest = useCallback(
    (mx: number, my: number) => {
      if (lockRef.current || !current || current.phase !== "idle" || needsPrediction()) return;
      if (Math.hypot(mx - L.station.x, my - L.station.y) < L.CONTACT) beginTest();
    },
    [current, L, beginTest]
  );

  // ---- drag ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (lockRef.current || needsPrediction()) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const r = labRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - r.left - magnet.x, y: e.clientY - r.top - magnet.y };
    setAutoMoving(false);
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const r = labRef.current!.getBoundingClientRect();
    const x = clamp(e.clientX - r.left - dragOffset.current.x, 28, r.width - 28);
    const y = clamp(e.clientY - r.top - dragOffset.current.y, 28, r.height - 28);
    setMagnet({ x, y });
    runHitTest(x, y);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { }
    setDragging(false);
    // let go while an object is clinging → drop it into the magnetic pile
    if (stuckRef.current) { finishMagnetic(); return; }
    // released without completing a test → snap the magnet back to its box
    if (!lockRef.current) { setAutoMoving(true); setMagnet(L.dock); }
  };

  // ---- tap / verb to test the current object (mobile / accessibility / agent demo) ----
  const tapObject = useCallback(() => {
    if (lockRef.current || !current || current.phase !== "idle" || dragging || needsPrediction()) return;
    playCue("tap");
    setAutoMoving(true);
    setMagnet({ x: L.station.x, y: L.station.y });
    addTimer(window.setTimeout(() => { beginTest(); }, 430));
  }, [current, dragging, L, beginTest, playCue]);

  // ---- predict: student (or agent, for demo/testing) locks a guess before testing ----
  // ⭐ tool-specific verb — this is what turns the round into a scored/evaluated activity.
  const doPredict = useCallback((guess: "magnetic" | "nonmagnetic") => {
    if (!current || current.phase !== "idle") return;
    const g = guess === "magnetic" ? "magnetic" : "nonmagnetic";
    setPending(g);
    playCue("tap");
    emit({ type: "event", name: "predicted", detail: { itemId: current.obj.id, guess: g } });
  }, [current, playCue]);

  // ---- highlight: the agent's pointer/laser — pulse a named element, non-destructive ----
  const doHighlight = useCallback((target: string) => {
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    setHighlighted(target);
    hintsUsedRef.current += 1;
    emit({ type: "event", name: "highlighted", detail: { target } });
    highlightTimer.current = window.setTimeout(() => setHighlighted(null), 2600);
  }, []);

  // ---- keep the API's state snapshot fresh ----
  const stateSnap = () => ({
    operatorMode,
    depth,
    tested: Object.keys(results).length,
    total: TOTAL,
    current: current?.obj.id ?? null,
    pendingPrediction,
    magnetic: order.filter((o) => results[o.id] === "magnetic").map((o) => o.id),
    nonmagnetic: order.filter((o) => results[o.id] === "nonmagnetic").map((o) => o.id),
    finished,
  });

  // ---- Finish (student mode only) — computes the uniform performance summary (§6.3) ----
  const computeFinishSummary = useCallback(() => {
    const testedObjs = order.filter((o) => results[o.id]);
    const scored = testedObjs.filter((o) => predictions[o.id]);
    const correct = scored.filter((o) => (predictions[o.id] === "magnetic") === o.magnetic).length;
    const total = scored.length;
    const pct = total ? correct / total : 0;
    const stars = total === 0 ? 0 : pct >= 0.9 ? 3 : pct >= 0.5 ? 2 : correct > 0 ? 1 : 0;
    return {
      evaluated: true,
      score: correct,
      total,
      stars,
      breakdown: scored.map((o) => ({ id: o.id, correct: (predictions[o.id] === "magnetic") === o.magnetic, chose: predictions[o.id] })),
      interactions: {
        attempts: attemptsRef.current,
        correctFirstTry: correct,
        hintsUsed: hintsUsedRef.current,
        itemsExplored: testedObjs.map((o) => o.id),
        durationMs: Date.now() - startTimeRef.current,
      },
      learned: [
        "A magnet attracts only some materials — these are called magnetic materials.",
        "Iron and steel (steel contains iron) cling to a magnet; glass, wood, plastic, rubber, copper, aluminium and brass do not.",
        "Whether an object is magnetic depends on what it is made of, not its size, shape or colour.",
      ],
    };
  }, [order, results, predictions]);

  const handleFinish = useCallback(() => {
    const summary = computeFinishSummary();
    setFinishSummary(summary);
    setFinished(true);
    playCue("done");
    emit({ type: "event", name: "finished", detail: summary });
  }, [computeFinishSummary, playCue]);

  // ---- mode + depth switch: used by props, setOperatorMode, AND the clickable toggle (§6.1) ----
  const applyMode = useCallback((m: OperatorMode) => {
    setOperatorMode(m);
    modeRef.current = m;
    const d = m === "ai" ? "lean" : "full";
    startGame(d);
    emit({ type: "event", name: "operator_mode_changed", detail: { operatorMode: m, mode: m, depth: d } });
  }, [startGame]);

  // ---- the agent API: every windowMethod in the JSON lives here ----
  const api = {
    setParam: (name: string, value: any) => {
      if (name === "muted") muted.current = !!value;
      else if (name === "operatorMode") applyMode(value === "ai" ? "ai" : "student");
      else if (name === "seed") seedRef.current = (value | 0) >>> 0;
    },
    play: () => { tapObject(); },
    pause: () => { /* no continuous timeline to pause */ },
    reset: () => { startGame(); },
    highlight: doHighlight,
    getState: () => {
      const s = stateSnap();
      emit({ type: "state", state: s });   // passive listeners
      return s;                             // and as the command response result
    },
    setOperatorMode: (mode: OperatorMode) => applyMode(mode === "ai" ? "ai" : "student"),
    predict: doPredict,                      // ⭐ tool-specific: lock a magnetic/non-magnetic guess
    testObject: () => { tapObject(); },      // ⭐ tool-specific: test the current object
  };
  const apiRef = useRef(api); apiRef.current = api;

  // ---- command listener + the REQUIRED ready signal ----
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== "command") return;
      try {
        const fn = (apiRef.current as any)[d.method];
        let result;
        if (typeof fn === "function") result = fn(...(d.args || []));
        emit({ type: "response", id: d.id, result });
      } catch { /* never throw out of the handler */ }
    };
    window.addEventListener("message", onMsg);
    emit({ type: "ready", toolId: TOOL_ID });   // ⭐ MUST fire, or commands are dropped
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line
  }, []);

  // reflect host-driven prop changes
  useEffect(() => { if (props.operatorMode && props.operatorMode !== modeRef.current) applyMode(props.operatorMode); }, [props.operatorMode]); // eslint-disable-line
  useEffect(() => { muted.current = !!props.muted; }, [props.muted]);

  // ---- derived ----
  const testedCount = Object.keys(results).length;
  const magList = order.filter((o) => results[o.id] === "magnetic");
  const nonList = order.filter((o) => results[o.id] === "nonmagnetic");
  const [allTestedAnnounced, setAllTestedAnnounced] = useState(false);
  useEffect(() => {
    if (current === null && testedCount === TOTAL && !allTestedAnnounced) {
      const t = window.setTimeout(() => {
        setAllTestedAnnounced(true);
        emit({
          type: "event", name: "completed",
          detail: {
            total: TOTAL,
            magnetic: magList.map((o) => o.id),
            nonmagnetic: nonList.map((o) => o.id),
          },
        });
      }, 420);
      return () => window.clearTimeout(t);
    }
    if (testedCount < TOTAL && allTestedAnnounced) setAllTestedAnnounced(false);
  }, [current, testedCount, TOTAL, allTestedAnnounced]);

  const nearMagnetic =
    !!current && current.phase === "idle" && current.obj.magnetic &&
    Math.hypot(magnet.x - L.station.x, magnet.y - L.station.y) < L.FIELD;

  // current-object render offsets
  let lx = 0, ly = 0, inField = false;
  if (current && current.phase === "idle" && current.obj.magnetic) {
    const dx = magnet.x - L.station.x, dy = magnet.y - L.station.y;
    const d = Math.hypot(dx, dy);
    if (d < L.FIELD && d > 0.001) {
      inField = true;
      const pull = (1 - d / L.FIELD) * 14;
      lx = (dx / d) * pull; ly = (dy / d) * pull;
    }
  }
  const stuck = current?.phase === "stuck";
  const repelled = current?.phase === "repelled";
  const leaving = current?.phase === "leaving";

  // While stuck, the object rides with the magnet — clinging at its poles.
  const clingY = -L.magH * 0.04;   // sit right at the poles, like a clinging nail
  let tx: number, ty: number;
  if (stuck) {
    tx = magnet.x - L.station.x;
    ty = magnet.y - L.station.y + clingY;
  } else if (leaving) {
    tx = current!.dx; ty = current!.dy;
  } else {
    tx = lx; ty = ly;
  }
  const scale = leaving ? 0.2 : stuck ? 0.72 : 1;  // clings at a sensible size (less collapse)

  return (
    <div style={St.root}>
      <style>{CSS}</style>
      <div style={St.frame}>
        {/* header */}
        <header style={St.header}>
          <div style={St.headerRow}>
            <div style={St.headerIcon}><HorseshoeMagnet size={28} /></div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={St.h1}>{config.title}</h1>
              <p style={St.h1sub}>{config.subtitle}</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              {(props.showModeToggle ?? true) && (
                <div style={St.segTrack} role="tablist" aria-label="Who is driving">
                  <button
                    type="button"
                    role="tab"
                    className="segBtn"
                    aria-selected={operatorMode === "ai"}
                    onClick={() => applyMode("ai")}
                    style={{ ...St.segBtn, ...(operatorMode === "ai" ? St.segBtnActive : {}) }}
                  >
                    👩‍🏫 Teacher
                  </button>
                  <button
                    type="button"
                    role="tab"
                    className="segBtn"
                    aria-selected={operatorMode === "student"}
                    onClick={() => applyMode("student")}
                    style={{ ...St.segBtn, ...(operatorMode === "student" ? St.segBtnActive : {}) }}
                  >
                    🙋 Your turn
                  </button>
                </div>
              )}
              <button
                aria-label={muted.current ? "Unmute" : "Mute"}
                onClick={() => { muted.current = !muted.current; setHighlighted((h) => h); playCue("tap"); }}
                style={St.muteBtn}
              >
                {muted.current ? "🔇" : "🔊"}
              </button>
            </div>
          </div>
          <div style={St.progressRow}>
            <div style={St.bar}><div style={{ ...St.barFill, width: `${(testedCount / TOTAL) * 100}%` }} /></div>
            <span style={St.progressNum}>{testedCount}/{TOTAL}</span>
          </div>
        </header>

        <div style={St.body}>
          <p style={St.instruction}>
            {operatorMode === "ai"
              ? "👩‍🏫 Your teacher is showing you how the magnet tests each object — watch, you'll get a turn."
              : pendingPrediction
                ? "Now drag (or tap) the magnet down onto the object to reveal the truth!"
                : "First, guess: will this object cling to the magnet?"}
          </p>

          {/* predict-then-reveal guess bar — student mode only; this is the graded step */}
          {operatorMode === "student" && current && current.phase === "idle" && !finished && (
            <div style={St.predictRow}>
              <button
                type="button"
                className="predictBtn"
                onClick={() => api.predict("magnetic")}
                disabled={!!pendingPrediction}
                style={{
                  ...St.predictBtn,
                  borderColor: C.magBorder,
                  color: C.mag,
                  ...(pendingPrediction === "magnetic" ? { background: C.mag, color: "#fff" } : {}),
                  ...(highlighted === "predictMagnetButton" ? St.predictBtnGlow : {}),
                }}
              >
                🧲 Magnetic
              </button>
              <button
                type="button"
                className="predictBtn"
                onClick={() => api.predict("nonmagnetic")}
                disabled={!!pendingPrediction}
                style={{
                  ...St.predictBtn,
                  borderColor: C.nonBorder,
                  color: C.non,
                  ...(pendingPrediction === "nonmagnetic" ? { background: C.non, color: "#fff" } : {}),
                  ...(highlighted === "predictNonMagnetButton" ? St.predictBtnGlow : {}),
                }}
              >
                🚫 Not magnetic
              </button>
            </div>
          )}

          {/* test table */}
          <div ref={labRef} style={St.lab}>
            {/* two collection trays along the bottom */}
            <div style={{ ...St.tray, left: L.magTray.x, top: L.magTray.y, width: L.magTray.w, height: L.magTray.h, background: C.magSoft, borderColor: C.magBorder }}>
              {highlighted === "magneticTray" && <span className="testRing" style={{ borderColor: C.mag, borderRadius: 16 }} />}              <div style={St.trayHead}>
                <span style={{ fontSize: 14 }}>🧲</span>
                <span style={{ color: C.mag, fontWeight: 800, fontSize: "clamp(11px,2.9vw,13px)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>Magnetic</span>
                <span key={"m" + magList.length} style={{ ...St.trayCount, background: C.mag }}><span className="countPop" style={{ color: "#fff", fontSize: 12 }}>{magList.length}</span></span>
              </div>
              <div className="chipScroll" style={St.chipWrap}>
                {magList.map((o, i) => (
                  <span key={o.id} title={o.name} style={{ ...St.chip, width: L.chipSize, height: L.chipSize, borderColor: C.magBorder, animation: `chipIn .3s ease ${i * 0.03}s both` }}>
                    <span style={{ ...St.chipArt, width: L.chipIcon, height: L.chipIcon }}><ObjArt k={o.iconKey} /></span>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ ...St.tray, left: L.nonTray.x, top: L.nonTray.y, width: L.nonTray.w, height: L.nonTray.h, background: C.nonSoft, borderColor: C.nonBorder }}>
              {highlighted === "nonMagneticTray" && <span className="testRing" style={{ borderColor: C.non, borderRadius: 16 }} />}              <div style={St.trayHead}>
                <span style={{ fontSize: 14 }}>🚫</span>
                <span style={{ color: C.non, fontWeight: 800, fontSize: "clamp(11px,2.9vw,13px)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>Non-magnetic</span>
                <span key={"n" + nonList.length} style={{ ...St.trayCount, background: C.non }}><span className="countPop" style={{ color: "#fff", fontSize: 12 }}>{nonList.length}</span></span>
              </div>
              <div className="chipScroll" style={St.chipWrap}>
                {nonList.map((o, i) => (
                  <span key={o.id} title={o.name} style={{ ...St.chip, width: L.chipSize, height: L.chipSize, borderColor: C.nonBorder, animation: `chipIn .3s ease ${i * 0.03}s both` }}>
                    <span style={{ ...St.chipArt, width: L.chipIcon, height: L.chipIcon }}><ObjArt k={o.iconKey} /></span>
                  </span>
                ))}
              </div>
            </div>

            {/* the current object on the table */}
            {current && (
              <div
                key={current.key}
                onClick={tapObject}
                style={{
                  position: "absolute",
                  left: L.station.x, top: L.station.y,
                  width: L.iconSize, height: L.iconSize,
                  cursor: current.phase === "idle" ? "pointer" : "default",
                  pointerEvents: current.phase === "idle" ? "auto" : "none",
                  opacity: leaving ? 0 : 1,
                  transform: `translate(-50%,-50%) translate(${tx}px,${ty}px) scale(${scale})`,
                  transition: stuck ? "transform .34s cubic-bezier(.34,1.56,.64,1)" : leaving ? "transform .5s cubic-bezier(.4,.02,.6,1), opacity .44s ease .1s" : repelled ? "transform .3s cubic-bezier(.3,.7,.3,1)" : "transform .12s ease-out",
                  zIndex: stuck ? 41 : leaving ? 30 : 14,
                }}
              >
                <div className="enter" style={{ width: "100%", height: "100%", position: "relative" }}>
                  {(highlighted === "object" || highlighted === "magnet") && <span className="testRing" style={{ borderColor: "#F5B301" }} />}
                  <span className="enterRing" style={{ borderColor: current.obj.magnetic ? C.magBorder : C.nonBorder }} />
                  <div className={repelled ? "shake" : inField ? "tremble" : ""} style={{ width: "100%", height: "100%", position: "relative" }}>
                    {!stuck && <div style={{ position: "absolute", left: "50%", top: "80%", transform: "translate(-50%,-50%)", width: "74%", height: "16%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(40,32,90,.22), rgba(40,32,90,0))" }} />}
                    {((stuck || (leaving && current.obj.magnetic)) ? CLING : GROUP).map((g, i) => (
                      <div key={i} style={{ position: "absolute", inset: 0, transform: `translate(${g.x}%, ${g.y}%) rotate(${g.rot}deg) scale(${g.s})`, transition: "transform .26s cubic-bezier(.34,1.4,.6,1)" }}>
                        <ObjArt k={current.obj.iconKey} bare />
                      </div>
                    ))}
                  </div>
                  {!stuck && <div style={{ ...St.objName, top: L.iconSize + 8, width: L.objW, fontSize: L.labelFont }}>{current.obj.name}</div>}
                </div>

                {stuck && (
                  <>
                    <div style={St.tagMag}>✓ It sticks to the magnet!</div>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <span key={j} className="spark" style={{ ["--a" as any]: `${j * 36}deg` }} />
                    ))}
                  </>
                )}
                {repelled && (
                  <>
                    <div style={St.tagNon}>✕ Doesn't stick</div>
                    <span className="ripple" />
                  </>
                )}
              </div>
            )}

            {/* the draggable magnet — student mode only (agent drives via verbs in ai mode).
                Locked (dim, no pointer) until the student has locked in a prediction. */}
            {operatorMode === "student" && (
              <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                  ...St.magnetWrap,
                  left: magnet.x, top: magnet.y,
                  cursor: dragging ? "grabbing" : pendingPrediction ? "grab" : "not-allowed",
                  opacity: !pendingPrediction && current?.phase === "idle" ? 0.45 : 1,
                  pointerEvents: !pendingPrediction && current?.phase === "idle" ? "none" : "auto",
                  transition: autoMoving ? "left .42s cubic-bezier(.4,0,.2,1), top .42s cubic-bezier(.4,0,.2,1), opacity .25s ease" : "opacity .25s ease",
                  touchAction: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
              >
                {/* enlarged invisible grab area so it's easy to drag with a finger */}
                <div style={{ position: "absolute", inset: "-16px", borderRadius: 24 }} />
                <HorseshoeMagnet size={L.magSize} glowing={nearMagnetic} />
              </div>
            )}
            {/* in ai mode the magnet still shows (parked / driven by verbs) but is not draggable */}
            {operatorMode === "ai" && (
              <div
                style={{
                  ...St.magnetWrap,
                  left: magnet.x, top: magnet.y,
                  transition: autoMoving ? "left .42s cubic-bezier(.4,0,.2,1), top .42s cubic-bezier(.4,0,.2,1)" : "none",
                  pointerEvents: "none",
                }}
              >
                <HorseshoeMagnet size={L.magSize} glowing={nearMagnetic} />
              </div>
            )}

            {/* first-run hint — student mode only, once a prediction is locked in */}
            {operatorMode === "student" && !hasTested && current && pendingPrediction && (
              <div style={{ position: "absolute", left: magnet.x, top: magnet.y, transform: "translate(-50%, 16px)", pointerEvents: "none", zIndex: 45 }}>
                <span style={St.hintPill}>👇 Drag me down onto the object</span>
              </div>
            )}
          </div>

          {/* the last control — student mode only; ends the activity, no "play again" loop (§6.3) */}
          {operatorMode === "student" && testedCount === TOTAL && !finished && (
            <button type="button" className="finishBtn" style={St.finishBtn} onClick={handleFinish}>
              🏁 Finish
            </button>
          )}
        </div>
      </div>

      {finished && finishSummary && (
        <FinishScreen magList={magList} nonList={nonList} tier={tier} summary={finishSummary} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * FinishScreen — the uniform, full-viewport completion overlay (§6.3/§7.4).
 * This IS an evaluating tool (the predict-then-reveal guess is scored), so it
 * always shows the ⭐ star rating earned from performance, PLUS a
 * "What you have learned" panel. There is NO replay control here — the
 * student's forward path ends at Finish; reset() remains an agent-only verb.
 * ------------------------------------------------------------------ */
function FinishScreen({
  magList, nonList, tier, summary,
}: {
  magList: ObjectDef[]; nonList: ObjectDef[]; tier: typeof TIER[6 | 7 | 8];
  summary: { score: number; total: number; stars: number; learned: string[] };
}) {
  const rows = Math.max(magList.length, nonList.length);
  return (
    <div style={St.overlay} className="overlayIn">
      {/* confetti */}
      {Array.from({ length: tier.confetti }).map((_, i) => {
        const colors = ["#E5322B", "#2563EB", "#F5B301", "#7C2FE0", "#2ECC71"];
        const left = (i * 53) % 100;
        const delay = (i % 10) * 90;
        const dur = 1600 + (i % 5) * 260;
        return (
          <span key={i} className="confetti" style={{ left: `${left}%`, background: colors[i % colors.length], animationDelay: `${delay}ms`, animationDuration: `${dur}ms` }} />
        );
      })}

      <div style={St.card2} className="cardIn">
        <div style={St.cardHead}>
          <div style={St.starsRow}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="starPop" style={{ animationDelay: `${i * 0.12}s`, opacity: i < summary.stars ? 1 : 0.25 }}>⭐</span>
            ))}
          </div>
          {summary.total > 0 ? (
            <>
              <div style={{ ...St.scoreNum, fontSize: `clamp(30px, 12vw, ${tier.scorePx}px)` }}>
                {summary.score}/{summary.total}
              </div>
              <div style={St.scoreLabel}>guessed right!</div>
            </>
          ) : (
            <div style={{ ...St.scoreNum, fontSize: `clamp(24px, 8vw, ${tier.scorePx}px)` }}>Sorted!</div>
          )}
          <p style={St.cardSub}>Here is what the magnet found.</p>
        </div>

        <div className="chipScroll" style={St.tableScroll}>
          <table style={St.table}>
            <thead>
              <tr>
                <th style={{ ...St.th, background: C.magSoft, color: C.mag, borderColor: C.magBorder }}>Magnetic Substances</th>
                <th style={{ ...St.th, background: C.nonSoft, color: C.non, borderColor: C.nonBorder }}>Non-magnetic Substances</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => (
                <tr key={i}>
                  <td style={{ ...St.td, borderColor: C.magBorder, background: magList[i] ? "#fff" : "transparent" }}>
                    {magList[i] ? <span style={St.cellWrap}><span style={St.cellArt}><ObjArt k={magList[i].iconKey} /></span><span style={St.cellTxt}>{magList[i].name}</span></span> : ""}
                  </td>
                  <td style={{ ...St.td, borderColor: C.nonBorder, background: nonList[i] ? "#fff" : "transparent" }}>
                    {nonList[i] ? <span style={St.cellWrap}><span style={St.cellArt}><ObjArt k={nonList[i].iconKey} /></span><span style={St.cellTxt}>{nonList[i].name}</span></span> : ""}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ ...St.totalTd, color: C.mag }}>{magList.length} magnetic</td>
                <td style={{ ...St.totalTd, color: C.non }}>{nonList.length} non-magnetic</td>
              </tr>
            </tbody>
          </table>

          <div style={St.learnedBox}>
            <div style={St.learnedTitle}>💡 What you have learned</div>
            <ul style={St.learnedList}>
              {summary.learned.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
const St: Record<string, React.CSSProperties> = {
  root: { fontFamily: "Poppins, system-ui, sans-serif", color: C.text, background: C.page, minHeight: "100%", width: "100%", padding: "clamp(8px,2.5vw,16px)", boxSizing: "border-box" },
  frame: { maxWidth: 880, margin: "0 auto", background: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: "0 18px 50px rgba(40,30,90,.12)", border: `1px solid ${C.line}`, boxSizing: "border-box" },
  header: { background: "linear-gradient(125deg,#7C2FE0 0%,#4A45D6 48%,#C0327E 100%)", color: "#fff", padding: "clamp(16px,4.2vw,20px) clamp(15px,5vw,24px) clamp(14px,3.6vw,18px)" },
  headerRow: { display: "flex", gap: 14, alignItems: "center" },
  headerIcon: { width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center" },
  h1: { margin: 0, fontSize: "clamp(18px,3.4vw,27px)", fontWeight: 800, letterSpacing: "-0.5px" },
  h1sub: { margin: "3px 0 0", fontSize: "clamp(12px,2.8vw,13.5px)", opacity: 0.92, fontWeight: 500 },
  progressRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 14 },
  segTrack: { display: "inline-flex", gap: 2, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.28)", borderRadius: 99, padding: 3 },
  segBtn: { appearance: "none", border: "none", background: "transparent", color: "rgba(255,255,255,.78)", fontSize: 11.5, fontWeight: 700, padding: "6px 10px", borderRadius: 99, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none", transition: "background .2s ease, color .2s ease, transform .15s ease" },
  segBtnActive: { background: "#fff", color: "#4A45D6", boxShadow: "0 2px 6px rgba(20,10,50,.25)" },
  muteBtn: { width: 34, height: 34, minWidth: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.28)", background: "rgba(255,255,255,.16)", color: "#fff", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 },
  bar: { flex: 1, height: 8, borderRadius: 99, background: "rgba(255,255,255,.25)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#ffd25b,#ffb01f)", transition: "width .4s ease" },
  progressNum: { fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" },

  body: { padding: "clamp(12px,3.6vw,16px) clamp(12px,4vw,18px) clamp(16px,4vw,22px)" },
  instruction: { margin: "0 0 14px", fontSize: "clamp(13px,3.4vw,14.5px)", color: C.text, lineHeight: 1.5 },

  lab: { position: "relative", width: "100%", height: "clamp(300px, 56vh, 580px)", borderRadius: 18, background: "radial-gradient(120% 100% at 50% 0%, #FBFAFF 0%, #EEEDF8 100%)", border: `1.5px solid ${C.line}`, overflow: "hidden", touchAction: "none", userSelect: "none", boxSizing: "border-box" },

  tally: { position: "absolute", zIndex: 20, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, padding: "5px 11px", borderRadius: 99, border: "1.5px solid", background: "#fff" },
  tray: { position: "absolute", borderRadius: 14, border: "1.5px solid", padding: 8, display: "flex", flexDirection: "column", gap: 6, overflow: "hidden", zIndex: 20, boxShadow: "0 4px 12px rgba(40,30,90,.06)", boxSizing: "border-box" },
  trayHead: { display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexShrink: 0 },
  trayCount: { marginLeft: "auto", flexShrink: 0, minWidth: 22, height: 20, borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px" },
  chipWrap: { display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start", overflow: "auto", flex: 1, minHeight: 0 },
  chip: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "clamp(22px,5vw,26px)", height: "clamp(22px,5vw,26px)", borderRadius: 7, background: "#fff", border: "1px solid", boxShadow: "0 1px 3px rgba(40,30,90,.08)", flexShrink: 0 },
  chipArt: { width: "clamp(15px,3.5vw,18px)", height: "clamp(15px,3.5vw,18px)", flexShrink: 0, display: "inline-block" },

  card: { width: "100%", height: "100%", borderRadius: 18, background: "linear-gradient(160deg,#ffffff 0%,#eef0f8 100%)", border: `1px solid ${C.line}`, boxShadow: "0 10px 22px rgba(40,30,90,.13), inset 0 1px 0 rgba(255,255,255,.9)", padding: "9%", boxSizing: "border-box" },
  objName: { position: "absolute", left: "50%", transform: "translateX(-50%)", fontWeight: 700, lineHeight: 1.12, color: C.text, textAlign: "center", pointerEvents: "none", textShadow: "0 1px 0 #fff, 0 0 4px #fff", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },

  magnetWrap: { position: "absolute", transform: "translate(-50%,-100%)", zIndex: 40, filter: "drop-shadow(0 6px 8px rgba(40,20,90,.18))" },
  hintPill: { background: "rgba(26,26,46,.85)", color: "#fff", fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 99, animation: "floatHint 1.6s ease-in-out infinite", whiteSpace: "nowrap" },
  boxLabel: { position: "absolute", bottom: -21, left: "50%", transform: "translateX(-50%)", fontSize: 11.5, fontWeight: 700, color: C.sub, whiteSpace: "nowrap", letterSpacing: ".3px" },

  tagMag: { position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)", background: C.mag, color: "#fff", fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap", animation: "popIn .3s ease both", zIndex: 5 },
  tagNon: { position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)", background: C.non, color: "#fff", fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap", animation: "popIn .3s ease both", zIndex: 5 },
  tagTest: { position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)", background: "#3A3A52", color: "#fff", fontSize: 11.5, fontWeight: 700, padding: "3px 12px", borderRadius: 99, whiteSpace: "nowrap", animation: "popIn .3s ease both", zIndex: 5 },

  overlay: { position: "fixed", inset: 0, background: "rgba(20,16,40,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100, backdropFilter: "blur(2px)", overflow: "hidden" },
  card2: { background: "#fff", borderRadius: 22, width: "100%", maxWidth: 560, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 70px rgba(20,10,50,.4)", position: "relative", zIndex: 2, boxSizing: "border-box" },
  cardHead: { padding: "20px 24px 12px", textAlign: "center", background: "linear-gradient(120deg,#F6F3FF,#FFF)", borderBottom: `1px solid ${C.line}`, flexShrink: 0 },
  scoreNum: { fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.04, textAlign: "center", whiteSpace: "nowrap", animation: "scoreIn .5s cubic-bezier(.34,1.4,.5,1) both" },
  scoreLabel: { margin: "4px 0 0", fontSize: "clamp(15px,4.6vw,20px)", fontWeight: 800, color: C.text, lineHeight: 1.15, textAlign: "center" },
  cardSub: { margin: "8px 0 0", fontSize: 13.5, color: C.sub },

  tableScroll: { overflow: "auto", padding: "10px 16px 16px", flex: "1 1 auto", minHeight: 0 },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 6, tableLayout: "fixed" },
  th: { fontSize: "clamp(11px,2.8vw,13px)", fontWeight: 800, padding: "8px 6px", borderRadius: 9, border: "1.5px solid", textAlign: "center" },
  td: { fontSize: "clamp(11px,2.7vw,13px)", fontWeight: 600, padding: "6px 8px", borderRadius: 9, border: "1px solid transparent", verticalAlign: "middle" },
  cellWrap: { display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0, maxWidth: "100%" },
  cellArt: { width: "clamp(18px,5vw,24px)", height: "clamp(18px,5vw,24px)", flexShrink: 0, display: "inline-block" },
  cellTxt: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
  totalTd: { fontSize: 11.5, fontWeight: 800, padding: "6px 8px", textAlign: "center", textTransform: "uppercase", letterSpacing: ".4px" },

  starsRow: { display: "flex", justifyContent: "center", gap: 6, fontSize: "clamp(22px,6vw,30px)", marginBottom: 4 },
  learnedBox: { margin: "12px 0 0", padding: "12px 14px", borderRadius: 14, background: "#F6F3FF", border: `1px solid ${C.line}`, flexShrink: 0 },
  learnedTitle: { fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 6 },
  learnedList: { margin: 0, paddingLeft: 18, fontSize: 12.5, color: C.sub, lineHeight: 1.55, display: "flex", flexDirection: "column", gap: 3 },

  predictRow: { display: "flex", gap: 10, marginBottom: 12, boxSizing: "border-box" },
  predictBtn: { flex: 1, minHeight: 44, padding: "10px 12px", borderRadius: 13, border: "2px solid", background: "#fff", fontSize: "clamp(12.5px,3.2vw,14px)", fontWeight: 800, cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "transform .15s ease, background .2s ease, color .2s ease", boxSizing: "border-box" },
  predictBtnGlow: { boxShadow: "0 0 0 4px rgba(245,179,1,.35)" },

  finishBtn: { marginTop: 12, width: "100%", minHeight: 48, border: "none", borderRadius: 14, background: "linear-gradient(120deg,#7C2FE0,#4A45D6)", color: "#fff", fontSize: 15.5, fontWeight: 800, cursor: "pointer", fontFamily: "Poppins, sans-serif", boxShadow: "0 8px 20px rgba(76,45,214,.32)", boxSizing: "border-box" },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
* { -webkit-tap-highlight-color: transparent; }
@keyframes floatHint { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-5px);} }
@keyframes popIn { 0%{ transform: translateX(-50%) scale(.5); opacity:0;} 100%{ transform: translateX(-50%) scale(1); opacity:1;} }
.chipIn { animation: chipIn .3s ease both; }
@keyframes chipIn { 0%{ transform: scale(.6); opacity:0;} 100%{ transform: scale(1); opacity:1;} }
.chipScroll::-webkit-scrollbar { width: 0; height: 0; }
.chipScroll { scrollbar-width: none; }
@keyframes scoreIn { 0%{ transform: scale(.5); opacity:0;} 100%{ transform: scale(1); opacity:1;} }
.starPop { display:inline-block; animation: starPop .5s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes starPop { 0%{ transform: scale(0) rotate(-30deg); } 70%{ transform: scale(1.3) rotate(8deg); } 100%{ transform: scale(1) rotate(0); } }
.segBtn:hover { color:#fff; } .segBtn:active { transform: scale(.96); }
.predictBtn:disabled { opacity:.55; cursor: default; }
.predictBtn:not(:disabled):hover { transform: translateY(-1px); }
.finishBtn:hover { transform: translateY(-1px); } .finishBtn:active { transform: scale(.98); }
@keyframes polePulse { 0%,100%{ opacity:.25;} 50%{ opacity:.55;} }
@keyframes countPop { 0%{ transform: scale(1);} 35%{ transform: scale(1.5);} 100%{ transform: scale(1);} }
.countPop { animation: countPop .45s ease; display:inline-block; font-size:15px; font-weight:800; }
.enter { animation: enterPop .5s cubic-bezier(.34,1.45,.5,1) both; }
@keyframes enterPop { 0%{ transform: scale(.3) translateY(10px); opacity:0;} 60%{ opacity:1;} 100%{ transform: scale(1) translateY(0); opacity:1;} }
.enterRing { position:absolute; inset:-6px; border-radius:20px; border:3px solid; opacity:0; pointer-events:none; animation: enterRing .7s ease-out both; }
@keyframes enterRing { 0%{ transform: scale(.7); opacity:.0;} 30%{ opacity:.8;} 100%{ transform: scale(1.25); opacity:0;} }
.tremble { animation: tremble .12s linear infinite; }
@keyframes tremble { 0%{ transform: translate(.7px,0);} 50%{ transform: translate(-.7px,.7px);} 100%{ transform: translate(.7px,-.7px);} }
.shake { animation: shake .62s cubic-bezier(.36,.07,.19,.97); }
@keyframes shake { 0%{ transform: translate(0,0) rotate(0);} 14%{ transform: translate(-3px,1px) rotate(-3.2deg);} 28%{ transform: translate(3px,-1px) rotate(3.2deg);} 42%{ transform: translate(-2px,1px) rotate(-2deg);} 58%{ transform: translate(2px,0) rotate(1.5deg);} 76%{ transform: translate(-1px,0) rotate(-.7deg);} 100%{ transform: translate(0,0) rotate(0);} }
.spark { position:absolute; top:30%; left:50%; width:8px; height:8px; border-radius:99px; background: radial-gradient(circle,#ffd25b 0%,#ff9d2e 70%,rgba(255,157,46,0) 100%); transform: rotate(var(--a)) translateY(0) scale(0); animation: spark .7s ease-out forwards; }
@keyframes spark { 0%{ transform: rotate(var(--a)) translateY(0) scale(.2); opacity:1;} 100%{ transform: rotate(var(--a)) translateY(-38px) scale(.9); opacity:0;} }
.ripple { position:absolute; top:30%; left:50%; width:54px; height:54px; margin:-27px 0 0 -27px; border:2px solid #9aa6c4; border-radius:99px; transform: scale(.5); opacity:.6; animation: ripple .7s ease-out forwards; }
@keyframes ripple { 0%{ transform: scale(.5); opacity:.55;} 100%{ transform: scale(2.2); opacity:0;} }
.testRing { position:absolute; inset:-10px; border-radius:20px; border:3px solid; pointer-events:none; animation: testRing 1s ease-in-out infinite; }
@keyframes testRing { 0%,100%{ transform: scale(1); opacity:.4;} 50%{ transform: scale(1.07); opacity:.85;} }
.tdot { animation: tdotBlink 1.2s infinite; }
.tdot2 { animation-delay: .2s; }
.tdot3 { animation-delay: .4s; }
@keyframes tdotBlink { 0%,100%{ opacity:.2;} 50%{ opacity:1;} }
.overlayIn { animation: fade .25s ease both; }
@keyframes fade { from{opacity:0;} to{opacity:1;} }
.cardIn { animation: cardUp .35s cubic-bezier(.34,1.3,.5,1) both; }
@keyframes cardUp { from{ transform: translateY(24px) scale(.96); opacity:0;} to{ transform: translateY(0) scale(1); opacity:1;} }
.confetti { position:absolute; top:-16px; width:9px; height:14px; border-radius:2px; opacity:.9; animation-name: confettiFall; animation-timing-function: ease-in; animation-fill-mode: forwards; }
@keyframes confettiFall { 0%{ transform: translateY(-10px) rotate(0); opacity:1;} 100%{ transform: translateY(105vh) rotate(620deg); opacity:0;} }
@media (prefers-reduced-motion: reduce){ *{ animation: none !important; } }
`;


export default MagnetSortGame;