// Churning: Butter & Buttermilk — Region Labelling Tool
// Tool type: Misconception probe / diagnostic (18) + Cross-section / inside-view (15) + POE prediction (19)
// Concept: When curd is churned, fat globules clump into butter. Butter is LESS dense
// (lighter) so it floats to the TOP; the watery buttermilk is heavier and stays at the BOTTOM.
// Flow: Step 1 cutaway churning animation (freezes at separation) -> Step 2 predict the top-region
// tag -> Step 3 tag the TOP layer -> Step 4 tag the BOTTOM layer -> Result -> Review.

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, RotateCcw, Award, Star, RefreshCw, ChevronRight, ChevronLeft, X, Check, Lightbulb } from "lucide-react";

/* ----------------------------------------------------------------------------------
   Types
---------------------------------------------------------------------------------- */
type ModeType = "learn" | "example";
type Phase = "play" | "result" | "review";
type PlayStage = "intro" | "churning" | "checkpoint";
type TagValue = "lighter" | "heavier";

interface ToolProps {
  props?: {
    width?: number;
    height?: number;
    themeColor?: string;
    showPlayPause?: boolean;
    initialStep?: number;
    initialMode?: ModeType;
    showModeSelector?: boolean;
    enabledModes?: ModeType[];
    additionalProps?: Record<string, any>;
  };
  setStepDetails?: (s: { currentStep: number; totalSteps: number; isPaused: boolean; currentMode: ModeType }) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

interface Checkpoint {
  id: string;
  kind: "predict" | "tag";
  region?: "top" | "bottom";
  prompt: string;
  options?: string[];          // for predict
  correctIdx?: number;         // for predict
  correctTag?: TagValue;       // for tag
  lockReason: string;          // one-line reason shown on correct
  concept: string;             // 2-4 sentence review explanation
}

interface UserAnswer {
  cpId: string;
  firstPick: string;
  correct: boolean;
}

/* ----------------------------------------------------------------------------------
   Constants — data the tool runs on
---------------------------------------------------------------------------------- */
const MISCONCEPTION = {
  belief: "Butter is solid and looks heavy, so it must sink / be the heavier part.",
  resolution: "Butter is LESS dense than buttermilk, so it floats — the top layer is the lighter component.",
};

const DEFAULT_CHECKPOINTS: Checkpoint[] = [
  {
    id: "predict",
    kind: "predict",
    prompt:
      "After churning, a pale layer has gathered at the TOP of the pot. For a layer to rise and float up like this, it must be…",
    options: ["Lighter than the rest", "Heavier than the rest"],
    correctIdx: 0,
    lockReason: "To float to the top, a layer must be lighter (less dense) than the liquid around it.",
    concept:
      "Anything that rises and floats is less dense — lighter — than the liquid around it. As curd is churned, tiny fat droplets clump together into butter, which is lighter than the watery part, so it floats to the surface. It can feel surprising because butter looks solid and 'heavy', but it is density (weight for the same volume), not how solid it looks, that decides who floats.",
  },
  {
    id: "top",
    kind: "tag",
    region: "top",
    prompt: "Tap the TOP layer (the butter that floated up) and pick its tag.",
    correctTag: "lighter",
    lockReason: "Butter floats, so the top layer is the lighter component.",
    concept:
      "The top layer is butter (makhan). It gathered at the surface because it is lighter — less dense — than buttermilk, so it floats. Churning makes the fat clump together until enough has joined to rise to the top, which is why you can simply skim the butter off after churning.",
  },
  {
    id: "bottom",
    kind: "tag",
    region: "bottom",
    prompt: "Now tap the BOTTOM layer (the buttermilk left behind) and pick its tag.",
    correctTag: "heavier",
    lockReason: "Buttermilk sinks and stays below, so the bottom layer is the heavier component.",
    concept:
      "The bottom layer is buttermilk (chhach) — the watery liquid left after the fat has floated away. Being heavier (denser) than butter, it stays at the bottom of the pot. Separating the two by churning works exactly because they have different densities: the lighter part rises, the heavier part settles.",
  },
];

const HINT_LINE = "Floating things are usually lighter — watch which layer rose to the top.";
const TAG_LABEL: Record<TagValue, string> = { lighter: "Lighter component", heavier: "Heavier component" };

/* ----------------------------------------------------------------------------------
   Design tokens — Singularity palette (matches the design system)
---------------------------------------------------------------------------------- */
const DS = {
  c: {
    primary: "#4A4DC9",
    primaryDark: "#533086",
    primaryLight: "#C1C1EA",
    primaryGhost: "#EDEDF8",
    accent: "#FF7212",
    accentDark: "#FC9145",
    accentLight: "#FFF3E4",
    g900: "#1A1A2E",
    g700: "#4E4E4E",
    g400: "#CACACA",
    g200: "#EBEBEB",
    g100: "#F5F5F5",
    white: "#FFFFFF",
    success: "#2ECC71",
    successDk: "#1E9E54",
    danger: "#E53E3E",
    amber: "#F59E0B",
    // scene — natural earthen-pot tones
    clay: "#B26A3C",
    clayDk: "#79401F",
    clayLt: "#CB8A57",
    clayInner: "#5E3014",
    // butter — warm golden butter, clearly distinct from the white buttermilk
    butter: "#F2D778",
    butterDk: "#E2BF54",
    butterLt: "#FAEBA8",
    milk: "#FCFAF2",
    milkDk: "#EFE8D5",
    milkShade: "#E1D7BE",
    wood: "#8A5A30",
    woodDk: "#553619",
    woodLt: "#A87544",
    rope: "#E2D4B1",
  },
  r: { sm: 8, md: 12, lg: 16, xl: 24, pill: 9999 },
  grad: {
    header: "linear-gradient(135deg, #533086 0%, #6C3F9E 45%, #FC9145 130%)",
    result: "linear-gradient(135deg, #533086 0%, #FF7212 120%)",
  },
};

/* ----------------------------------------------------------------------------------
   Easing + helpers
---------------------------------------------------------------------------------- */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/* ----------------------------------------------------------------------------------
   Responsive hook
---------------------------------------------------------------------------------- */
const useResponsive = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 900);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    h();
    return () => window.removeEventListener("resize", h);
  }, []);
  return { w, isMobile: w < 576, isTablet: w >= 576 && w < 992 };
};

/* ----------------------------------------------------------------------------------
   Scene geometry (viewBox 360 x 340)
---------------------------------------------------------------------------------- */
const VB_W = 360;
const VB_H = 340;
const CX = 180;
const LIQUID_TOP = 122;     // surface of the liquid inside the pot
const INNER_BOTTOM = 290;   // inner floor of the pot
const BUTTER_FRAC_FINAL = 0.16;  // thin whipped butter band (visual)
const BUTTER_TAP_FRAC = 0.24;    // larger hit-area fraction so the thin top layer stays tappable

// region rectangles, as fractions of the viewBox, used to position the tap overlays
const REGION_PCT = {
  top: { left: 27, top: LIQUID_TOP / VB_H * 100, width: 46, height: (BUTTER_TAP_FRAC * (INNER_BOTTOM - LIQUID_TOP)) / VB_H * 100 },
  bottom: { left: 24, top: (LIQUID_TOP + BUTTER_TAP_FRAC * (INNER_BOTTOM - LIQUID_TOP)) / VB_H * 100, width: 52, height: ((INNER_BOTTOM - LIQUID_TOP) * (1 - BUTTER_TAP_FRAC)) / VB_H * 100 },
};

/* ----------------------------------------------------------------------------------
   PotScene — the cutaway figure. Reused by play phase, review mini-diagrams.
---------------------------------------------------------------------------------- */
interface PotSceneProps {
  animT: number;                 // 0..1 animation progress
  highlight?: "top" | "bottom" | "both" | null;
  showLabels?: boolean;          // draw label pills inside the SVG (review minis)
  mini?: boolean;
  uid: string;                   // unique id for gradient defs
}

const PotScene: React.FC<PotSceneProps> = ({ animT, highlight = null, showLabels = false, mini = false, uid }) => {
  const c = DS.c;
  // butter grows in second half of the animation
  const butterFrac = lerp(0, BUTTER_FRAC_FINAL, easeOutCubic(seg(animT, 0.42, 0.86)));
  const interfaceY = LIQUID_TOP + butterFrac * (INNER_BOTTOM - LIQUID_TOP);

  // churner motion: while churning the rod spins (rope-driven), slowing to a stop near the end
  const churnActive = clamp01(1 - seg(animT, 0.78, 1)); // 1 while churning, 0 when frozen
  const spin = Math.sin(animT * Math.PI * 14) * 5 * churnActive; // gentle rod-axis wobble
  const ropeShift = Math.sin(animT * Math.PI * 14 + 1) * 3 * churnActive;
  // rotation of the churning head about the vertical rod axis — shown in 2D by foreshortening
  // the horizontal paddle (scaleX = cos of the spin angle): the paddle sweeps round and round.
  const rotAngle = animT * Math.PI * 26 * (0.45 + 0.55 * churnActive);
  const headScaleX = churnActive > 0.02 ? Math.cos(rotAngle) : 1;

  // rising fat globules (only during separation, fade as they merge into the top layer)
  const globules = useMemo(() => {
    const arr: { x: number; r: number; phase: number }[] = [];
    const xs = [150, 168, 188, 205, 162, 198, 176];
    const rs = [4, 5.5, 4.5, 6, 3.5, 5, 4];
    for (let i = 0; i < xs.length; i++) arr.push({ x: xs[i], r: rs[i], phase: i / xs.length });
    return arr;
  }, []);

  const sw = (n: number) => (mini ? n * 0.85 : n);

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision">
      <defs>
        <linearGradient id={`clay-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.clayLt} />
          <stop offset="55%" stopColor={c.clay} />
          <stop offset="100%" stopColor={c.clayDk} />
        </linearGradient>
        <radialGradient id={`clayInner-${uid}`} cx="0.5" cy="0.32" r="0.9">
          <stop offset="0%" stopColor="#5F2F12" />
          <stop offset="100%" stopColor={c.clayInner} />
        </radialGradient>
        <linearGradient id={`milk-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.milk} />
          <stop offset="100%" stopColor={c.milkShade} />
        </linearGradient>
        <linearGradient id={`butter-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.butterLt} />
          <stop offset="60%" stopColor={c.butter} />
          <stop offset="100%" stopColor={c.butterDk} />
        </linearGradient>
        <linearGradient id={`wood-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c.woodLt} />
          <stop offset="50%" stopColor={c.wood} />
          <stop offset="100%" stopColor={c.woodDk} />
        </linearGradient>
        <radialGradient id={`floor-${uid}`} cx="0.5" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#EFE6FF" />
          <stop offset="100%" stopColor="#F5F5F5" />
        </radialGradient>
        {/* clip to the inner cavity so liquids stay inside */}
        <clipPath id={`cavity-${uid}`}>
          <path d="M108 118 Q96 150 96 196 Q96 258 134 286 Q180 304 226 286 Q264 258 264 196 Q264 150 252 118 Z" />
        </clipPath>
      </defs>

      {/* soft ground shadow */}
      <ellipse cx={CX} cy={312} rx={108} ry={16} fill="#000000" opacity={0.10} />

      {/* ---- pot outer body (back of the cut vessel) ---- */}
      <path
        d="M118 96 Q86 110 78 168 Q70 246 120 296 Q180 326 240 296 Q290 246 282 168 Q274 110 242 96 Z"
        fill={`url(#clay-${uid})`}
        stroke={c.clayDk}
        strokeWidth={sw(2)}
      />
      {/* rim of the pot */}
      <ellipse cx={CX} cy={92} rx={66} ry={16} fill={c.clayLt} stroke={c.clayDk} strokeWidth={sw(2)} />
      <ellipse cx={CX} cy={92} rx={54} ry={11} fill={`url(#clayInner-${uid})`} />

      {/* ---- inner cavity: back wall (air space above liquid) ---- */}
      <path
        d="M108 118 Q96 150 96 196 Q96 258 134 286 Q180 304 226 286 Q264 258 264 196 Q264 150 252 118 Z"
        fill={`url(#clayInner-${uid})`}
      />

      {/* ---- liquids, clipped to cavity ---- */}
      <g clipPath={`url(#cavity-${uid})`}>
        {/* buttermilk fills the whole liquid body */}
        <rect x={88} y={LIQUID_TOP} width={184} height={INNER_BOTTOM - LIQUID_TOP + 30} fill={`url(#milk-${uid})`} />
        {/* swirl marks while churning */}
        {churnActive > 0.05 &&
          [0, 1, 2].map((i) => (
            <ellipse
              key={i}
              cx={CX + Math.sin(animT * Math.PI * 12 + i * 2) * 18}
              cy={lerp(180, 250, i / 2)}
              rx={lerp(46, 22, i / 2)}
              ry={lerp(10, 6, i / 2)}
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.5 * churnActive}
              strokeWidth={sw(2)}
            />
          ))}
        {/* rising fat globules during separation */}
        {butterFrac > 0.01 &&
          animT < 0.9 &&
          globules.map((g, i) => {
            const p = clamp01(seg(animT, 0.42, 0.86) * 1.15 - g.phase * 0.25);
            const y = lerp(245, interfaceY + 6, easeInOutQuad(p));
            const op = p > 0.04 && p < 0.97 ? 0.9 : 0;
            return <circle key={i} cx={g.x} cy={y} r={g.r} fill={c.butterLt} opacity={op} />;
          })}
        {/* butter layer on top — pale, whipped, foamy */}
        {butterFrac > 0.005 && (
          <rect x={88} y={LIQUID_TOP} width={184} height={interfaceY - LIQUID_TOP} fill={`url(#butter-${uid})`} />
        )}
        {/* whipped-cream scalloped top edge */}
        {butterFrac > 0.04 && (
          <path
            d={`M88 ${LIQUID_TOP + 5}
                Q100 ${LIQUID_TOP - 4} 112 ${LIQUID_TOP + 4}
                Q124 ${LIQUID_TOP - 5} 136 ${LIQUID_TOP + 3}
                Q148 ${LIQUID_TOP - 5} 160 ${LIQUID_TOP + 4}
                Q172 ${LIQUID_TOP - 5} 184 ${LIQUID_TOP + 3}
                Q196 ${LIQUID_TOP - 5} 208 ${LIQUID_TOP + 4}
                Q220 ${LIQUID_TOP - 5} 232 ${LIQUID_TOP + 3}
                Q244 ${LIQUID_TOP - 4} 256 ${LIQUID_TOP + 4}
                Q268 ${LIQUID_TOP - 3} 272 ${LIQUID_TOP + 5}
                L272 ${LIQUID_TOP + 13} L88 ${LIQUID_TOP + 13} Z`}
            fill={c.butterLt}
            opacity={0.95}
          />
        )}
        {/* whipped soft-peak blobs across the layer for a foamy texture */}
        {butterFrac > 0.06 &&
          [
            { x: 110, y: 6, r: 7 },
            { x: 132, y: 9, r: 6 },
            { x: 156, y: 5, r: 7.5 },
            { x: 180, y: 9, r: 6.5 },
            { x: 204, y: 5, r: 7 },
            { x: 228, y: 9, r: 6 },
            { x: 250, y: 6, r: 6.5 },
          ].map((b, i) => (
            <circle key={i} cx={b.x} cy={LIQUID_TOP + b.y} r={b.r} fill={c.butterLt} opacity={0.92} />
          ))}
        {/* tiny air bubbles whipped into the butter */}
        {butterFrac > 0.06 &&
          [120, 144, 168, 192, 216, 240].map((x, i) => (
            <circle key={`bb${i}`} cx={x} cy={LIQUID_TOP + 6 + (i % 3) * 4} r={2 + (i % 2)} fill="#FFFFFF" opacity={0.5} />
          ))}
        {/* interface line */}
        {butterFrac > 0.02 && (
          <path
            d={`M92 ${interfaceY} Q136 ${interfaceY - 4} 180 ${interfaceY} Q224 ${interfaceY + 4} 268 ${interfaceY}`}
            fill="none"
            stroke={c.butterDk}
            strokeWidth={sw(1.5)}
            opacity={0.7}
          />
        )}
        {/* highlight overlays for review minis */}
        {highlight === "top" && (
          <rect x={88} y={LIQUID_TOP} width={184} height={interfaceY - LIQUID_TOP} fill={c.amber} opacity={0.28} />
        )}
        {highlight === "bottom" && (
          <rect x={88} y={interfaceY} width={184} height={INNER_BOTTOM - interfaceY + 30} fill={c.amber} opacity={0.28} />
        )}
      </g>

      {/* liquid surface highlight */}
      <ellipse cx={CX} cy={LIQUID_TOP + 1} rx={86} ry={7} fill="#FFFFFF" opacity={butterFrac > 0.02 ? 0.45 : 0.6} />

      {/* ---- churner (mathni / bilona) ---- */}
      <g transform={`rotate(${spin} ${CX} ${LIQUID_TOP + 40})`}>
        {/* rod */}
        <rect x={CX - 5} y={36} width={10} height={222} rx={5} fill={`url(#wood-${uid})`} stroke={c.woodDk} strokeWidth={sw(1)} />
        {/* rope coil near the top */}
        {[0, 1, 2, 3].map((i) => (
          <ellipse
            key={i}
            cx={CX + (i % 2 === 0 ? ropeShift : -ropeShift)}
            cy={64 + i * 10}
            rx={11}
            ry={4.5}
            fill="none"
            stroke={c.rope}
            strokeWidth={sw(3)}
          />
        ))}
        {/* churning head — wooden cross. The horizontal paddle foreshortens (scaleX) as the
            head spins about the vertical rod, reading clearly as rotation in this side view. */}
        <g transform={`translate(${CX} 250)`}>
          <g transform={`scale(${headScaleX} 1)`}>
            <rect x={-30} y={-5} width={60} height={10} rx={4} fill={`url(#wood-${uid})`} stroke={c.woodDk} strokeWidth={sw(1)} />
          </g>
          <rect x={-5} y={-26} width={10} height={52} rx={4} fill={`url(#wood-${uid})`} stroke={c.woodDk} strokeWidth={sw(1)} />
          <circle cx={0} cy={0} r={7} fill={c.woodDk} />
        </g>
      </g>

      {/* ---- front cut edge of the pot (the slice face) ---- */}
      <path
        d="M108 118 Q96 150 96 196 Q96 258 134 286 Q180 304 226 286 Q264 258 264 196 Q264 150 252 118"
        fill="none"
        stroke={c.clayLt}
        strokeWidth={sw(6)}
        strokeLinecap="round"
        opacity={0.9}
      />
      <path
        d="M108 118 Q96 150 96 196 Q96 258 134 286 Q180 304 226 286 Q264 258 264 196 Q264 150 252 118"
        fill="none"
        stroke={c.clayDk}
        strokeWidth={sw(1.5)}
        opacity={0.5}
      />

      {/* in-figure labels for review minis */}
      {showLabels && (
        <>
          <LabelPill uid={uid} x={300} y={LIQUID_TOP + (interfaceY - LIQUID_TOP) / 2} text="Butter — lighter" leaderTo={[266, LIQUID_TOP + (interfaceY - LIQUID_TOP) / 2]} mini={mini} />
          <LabelPill uid={uid} x={300} y={(interfaceY + INNER_BOTTOM) / 2} text="Buttermilk — heavier" leaderTo={[266, (interfaceY + INNER_BOTTOM) / 2]} mini={mini} />
        </>
      )}
    </svg>
  );
};

const LabelPill: React.FC<{ uid: string; x: number; y: number; text: string; leaderTo: [number, number]; mini?: boolean }> = ({
  x,
  y,
  text,
  leaderTo,
  mini,
}) => {
  const fs = mini ? 11 : 12;
  const w = text.length * (fs * 0.56) + 16;
  return (
    <g>
      <line x1={leaderTo[0]} y1={leaderTo[1]} x2={x - w / 2} y2={y} stroke={DS.c.g700} strokeWidth={1.2} />
      <rect x={x - w / 2} y={y - 11} width={w} height={22} rx={8} fill="#FFFFFF" stroke={DS.c.g200} strokeWidth={1} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={fs} fontFamily="Poppins, sans-serif" fontWeight={600} fill={DS.c.g900}>
        {text}
      </text>
    </g>
  );
};

/* ----------------------------------------------------------------------------------
   LassiScene — bonus real-life example: making sweet lassi.
   Reinforces the concept: the light, airy froth floats to the TOP.
   Single animation driven by t (0..1) across 5 acts.
---------------------------------------------------------------------------------- */
const EXAMPLE_STEPS = [
  "Start with thick, fresh curd (dahi) at the bottom of the glass.",
  "Pour in chilled water to loosen the curd.",
  "Add a spoon of sugar to taste.",
  "Churn briskly — air whips in and froth begins to rise.",
  "The light, airy froth floats to the TOP; smooth lassi settles below. Ready to serve!",
];

const exampleActIdx = (t: number) => (t < 0.18 ? 0 : t < 0.34 ? 1 : t < 0.5 ? 2 : t < 0.82 ? 3 : 4);

const LG_W = 360;
const LG_H = 340;

const LassiScene: React.FC<{ t: number; uid: string }> = ({ t, uid }) => {
  const c = DS.c;
  const CXg = 180;
  const BASE_Y = 292;

  // liquid level rises while water pours
  const pourP = easeInOutQuad(seg(t, 0.18, 0.34));
  const level = t < 0.18 ? 244 : lerp(244, 126, pourP);

  // froth builds during churning, light layer on top
  const frothP = easeOutCubic(seg(t, 0.55, 0.95));
  const frothH = 44 * frothP;

  // churn envelope + whisk lift-out
  const churning = clamp01(seg(t, 0.5, 0.55)) * (1 - clamp01(seg(t, 0.78, 0.84)));
  const whiskAngle = Math.sin(t * Math.PI * 22) * 6 * churning;
  // whisk head spins about the vertical rod — shown by the horizontal paddle foreshortening
  const lassiRot = t * Math.PI * 32 * (0.4 + 0.6 * churning);
  const lassiHeadScaleX = churning > 0.02 ? Math.cos(lassiRot) : 1;
  const liftP = easeOutCubic(seg(t, 0.82, 0.94));
  const whiskY = -150 * liftP;
  const whiskOpacity = 1 - liftP;

  // water stream alpha envelope
  const streamA = Math.sin(seg(t, 0.18, 0.34) * Math.PI) * 0.85;

  // bubbles — rising during churn, resting in froth after
  const bubbles = useMemo(() => {
    const xs = [128, 150, 168, 188, 206, 226, 142, 200, 160, 214];
    const rs = [3.5, 5, 3, 6, 4, 3.5, 4.5, 3, 5.5, 4];
    const ph = xs.map((_, i) => (i * 0.61) % 1);
    return xs.map((x, i) => ({ x, r: rs[i], ph: ph[i] }));
  }, []);

  // garnish specks on the froth at the end
  const garnishA = easeOutCubic(seg(t, 0.9, 1));

  const innerClip = `M92 86 L110 ${BASE_Y - 2} Q180 ${BASE_Y + 10} 250 ${BASE_Y - 2} L268 86 Z`;

  return (
    <svg viewBox={`0 0 ${LG_W} ${LG_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision">
      <defs>
        <linearGradient id={`lassi-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCF9F1" />
          <stop offset="100%" stopColor="#F4EDDC" />
        </linearGradient>
        <linearGradient id={`froth-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FBF4E4" />
        </linearGradient>
        <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="22%" stopColor="#FFFFFF" stopOpacity="0.03" />
          <stop offset="78%" stopColor="#CFE2EE" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#9FC0D4" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={`stream-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DCEBF5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#BFD8E8" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`lwood-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c.woodLt} />
          <stop offset="50%" stopColor={c.wood} />
          <stop offset="100%" stopColor={c.woodDk} />
        </linearGradient>
        <clipPath id={`lglass-${uid}`}>
          <path d={innerClip} />
        </clipPath>
      </defs>

      {/* ground shadow */}
      <ellipse cx={CXg} cy={BASE_Y + 22} rx={92} ry={13} fill="#000" opacity={0.1} />

      {/* glass back wall tint */}
      <path d="M84 80 L104 294 Q180 308 256 294 L276 80 Z" fill="#EAF2F8" opacity={0.35} />

      {/* ---- liquids clipped to the glass ---- */}
      <g clipPath={`url(#lglass-${uid})`}>
        {/* lassi body */}
        <rect x={88} y={level} width={184} height={BASE_Y - level + 14} fill={`url(#lassi-${uid})`} />
        {/* curd looks thicker/whiter at the very bottom early on, then fades smoothly as it mixes in */}
        {(() => {
          const curdOp = 0.5 * (1 - easeInOutQuad(seg(t, 0.28, 0.62)));
          return curdOp > 0.01 ? (
            <rect x={88} y={Math.max(level, 214)} width={184} height={BASE_Y - Math.max(level, 214) + 14} fill="#FFFFFF" opacity={curdOp} />
          ) : null;
        })()}

        {/* swirl while churning */}
        {churning > 0.05 &&
          [0, 1, 2].map((i) => (
            <ellipse
              key={i}
              cx={CXg + Math.sin(t * Math.PI * 18 + i * 2) * 16}
              cy={lerp(level + 40, BASE_Y - 30, i / 2)}
              rx={lerp(58, 26, i / 2)}
              ry={9}
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.45 * churning}
              strokeWidth={2}
            />
          ))}

        {/* rising bubbles during churn */}
        {churning > 0.05 &&
          bubbles.map((b, i) => {
            const p = (t * 2.2 + b.ph) % 1;
            const y = lerp(BASE_Y - 14, level + 6, p);
            return <circle key={`b${i}`} cx={b.x + Math.sin(t * 10 + i) * 3} cy={y} r={b.r} fill="#FFFFFF" opacity={0.55 * churning} />;
          })}

        {/* froth layer on top — light, foamy, sits above the lassi */}
        {frothH > 0.5 && (
          <>
            {/* main froth band */}
            <rect x={88} y={level} width={184} height={frothH} fill={`url(#froth-${uid})`} />
            {/* scalloped foam top edge */}
            <path
              d={`M88 ${level + 4}
                  Q104 ${level - 5} 120 ${level + 3}
                  Q136 ${level - 6} 152 ${level + 2}
                  Q168 ${level - 6} 184 ${level + 3}
                  Q200 ${level - 6} 216 ${level + 2}
                  Q232 ${level - 5} 248 ${level + 3}
                  Q264 ${level - 4} 272 ${level + 4}
                  L272 ${level + 10} L88 ${level + 10} Z`}
              fill="#FFFFFF"
              opacity={0.95 * frothP}
            />
            {/* foam bubbles — soft, rounded, evenly spread for a creamy cap */}
            {[
              { x: 104, y: 0.32, r: 4 }, { x: 120, y: 0.62, r: 3 }, { x: 136, y: 0.30, r: 4.5 },
              { x: 152, y: 0.58, r: 3.5 }, { x: 168, y: 0.34, r: 4 }, { x: 184, y: 0.60, r: 3 },
              { x: 200, y: 0.32, r: 4.5 }, { x: 216, y: 0.58, r: 3.5 }, { x: 232, y: 0.34, r: 4 },
              { x: 248, y: 0.60, r: 3 }, { x: 258, y: 0.34, r: 3.5 },
            ].map((b, i) => (
              <circle key={`f${i}`} cx={b.x} cy={level + b.y * frothH} r={b.r} fill="#FFFFFF" opacity={0.95 * frothP} />
            ))}
            {/* a few brighter foam highlights */}
            {[132, 178, 216].map((x, i) => (
              <circle key={`fh${i}`} cx={x} cy={level + frothH * 0.42} r={5} fill="#FFFFFF" opacity={0.9 * frothP} />
            ))}
            {/* soft pale separator where foam meets lassi */}
            <rect x={88} y={level + frothH - 2} width={184} height={2} fill="#EFE7D6" opacity={0.55 * frothP} />
          </>
        )}

        {/* light dusting of cardamom on the foam */}
        {garnishA > 0.05 &&
          [150, 172, 196, 162].map((x, i) => (
            <circle key={`g${i}`} cx={x} cy={level + 4 + (i % 2) * 3} r={1.2} fill="#A88456" opacity={0.55 * garnishA} />
          ))}

        {/* liquid surface highlight */}
        {level < 240 && <ellipse cx={CXg} cy={level + 1} rx={86} ry={5} fill="#FFFFFF" opacity={0.4} />}
      </g>

      {/* ---- water stream (act 2) ---- */}
      {streamA > 0.02 && (
        <rect x={CXg - 7} y={34} width={14} height={Math.max(0, level - 34)} rx={7} fill={`url(#stream-${uid})`} opacity={streamA} />
      )}

      {/* ---- sugar falling (act 3) ---- */}
      {seg(t, 0.34, 0.5) > 0.02 &&
        seg(t, 0.34, 0.5) < 0.98 &&
        [162, 178, 192, 170, 186].map((x, i) => {
          const p = (seg(t, 0.34, 0.5) * 1.4 - i * 0.12) % 1;
          if (p < 0 || p > 1) return null;
          const y = lerp(46, level + 4, p);
          return <rect key={`s${i}`} x={x} y={y} width={3.5} height={3.5} rx={1} fill="#FFFFFF" opacity={0.95} />;
        })}

      {/* ---- mathni / whisk (act 4) ---- */}
      {(churning > 0.02 || whiskOpacity > 0.02) && (
        <g transform={`translate(0 ${whiskY}) rotate(${whiskAngle} ${CXg} ${level + 20})`} opacity={Math.max(0, whiskOpacity)}>
          <rect x={CXg - 4} y={40} width={8} height={222} rx={4} fill={`url(#lwood-${uid})`} stroke={c.woodDk} strokeWidth={1} />
          <g transform={`translate(${CXg} 250)`}>
            <g transform={`scale(${lassiHeadScaleX} 1)`}>
              <rect x={-24} y={-4} width={48} height={8} rx={3} fill={`url(#lwood-${uid})`} stroke={c.woodDk} strokeWidth={1} />
            </g>
            <rect x={-4} y={-20} width={8} height={40} rx={3} fill={`url(#lwood-${uid})`} stroke={c.woodDk} strokeWidth={1} />
          </g>
        </g>
      )}

      {/* ---- glass front (translucent, liquid shows through) ---- */}
      <path d="M84 80 L104 294 Q180 308 256 294 L276 80 Z" fill={`url(#glass-${uid})`} stroke="#AFC6D6" strokeWidth={2.5} strokeLinejoin="round" />
      {/* rim */}
      <ellipse cx={CXg} cy={80} rx={96} ry={12} fill="none" stroke="#AFC6D6" strokeWidth={2.5} />
      <ellipse cx={CXg} cy={80} rx={88} ry={9} fill="#FFFFFF" opacity={0.15} />
      {/* left highlight stripe */}
      <path d="M104 96 L120 286" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.5} />
      <path d="M250 100 L262 270" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.25} />
    </svg>
  );
};

/* ----------------------------------------------------------------------------------
   Main component
---------------------------------------------------------------------------------- */
function ChurningButterLabeller(rootProps: ToolProps) {
  const { props = {}, setStepDetails } = rootProps;
  const cfg = useMemo(
    () => ({
      themeColor: props.themeColor ?? DS.c.primary,
      showPlayPause: props.showPlayPause ?? true,
      initialMode: props.initialMode ?? "learn",
      showModeSelector: props.showModeSelector ?? true,
      enabledModes: props.enabledModes ?? (["learn", "example"] as ModeType[]),
    }),
    [props.themeColor, props.showPlayPause, props.initialMode, props.showModeSelector, props.enabledModes]
  );
  const { isMobile } = useResponsive();
  const c = DS.c;
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current;

  /* ---- mode + phase / stage state ---- */
  const [mode, setMode] = useState<ModeType>(cfg.initialMode);
  const [phase, setPhase] = useState<Phase>("play");
  const [stage, setStage] = useState<PlayStage>("intro");
  const [cpIdx, setCpIdx] = useState(0);

  /* ---- animation state ---- */
  const [isPlaying, setIsPlaying] = useState(false);
  const [animT, setAnimT] = useState(0);
  const [animComplete, setAnimComplete] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  const ANIM_MS = 5200;

  /* ---- labelling state ---- */
  const [activeRegion, setActiveRegion] = useState<"top" | "bottom" | null>(null);
  const [chipsOpen, setChipsOpen] = useState(false);
  const [lockedTags, setLockedTags] = useState<{ top?: TagValue; bottom?: TagValue }>({});
  const [hint, setHint] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [justLocked, setJustLocked] = useState<string | null>(null);

  /* ---- prediction state ---- */
  const [predictPick, setPredictPick] = useState<number | null>(null);
  const [predictDone, setPredictDone] = useState(false);

  /* ---- scoring ---- */
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const recordedRef = useRef<Set<string>>(new Set());

  /* ---- result + review ---- */
  const [reviewIdx, setReviewIdx] = useState(0);
  const [scoreShown, setScoreShown] = useState(0);
  const confettiRef = useRef<HTMLCanvasElement | null>(null);

  /* ---- bonus lassi example animation ---- */
  const [exT, setExT] = useState(0);
  const [exPlaying, setExPlaying] = useState(false);
  const [exComplete, setExComplete] = useState(false);
  const exFrameRef = useRef<number | null>(null);
  const exStartRef = useRef(0);
  const exElapsedRef = useRef(0);
  const EX_MS = 8000;

  const total = DEFAULT_CHECKPOINTS.length;

  /* -------------------- font + keyframe injection -------------------- */
  useEffect(() => {
    const id = "cbl-style-" + uid;
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=DM+Serif+Display:ital@1&display=swap');
@keyframes cbl-fadeUp { from { opacity:0; transform:translateY(10px);} to {opacity:1; transform:none;} }
@keyframes cbl-pop { 0%{transform:scale(.7);opacity:0;} 60%{transform:scale(1.08);} 100%{transform:scale(1);opacity:1;} }
@keyframes cbl-blink { 0%,100%{ box-shadow:0 0 0 3px rgba(255,114,18,.25); border-color:${c.accent}; } 50%{ box-shadow:0 0 0 8px rgba(255,114,18,.05); border-color:${c.accentDark}; } }
@keyframes cbl-shake { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-7px);} 40%{transform:translateX(7px);} 60%{transform:translateX(-5px);} 80%{transform:translateX(5px);} }
@keyframes cbl-slideUp { from{opacity:0; transform:translateY(24px);} to{opacity:1; transform:none;} }
@keyframes cbl-overlay { from{opacity:0;} to{opacity:1;} }
@keyframes cbl-spin { to { transform: rotate(360deg);} }
.cbl-root *{ box-sizing:border-box; }
.cbl-btn{ font-family:Poppins,sans-serif; cursor:pointer; border:none; transition:transform .12s ease, box-shadow .15s ease, background .15s ease; }
.cbl-btn:active{ transform:scale(.97); }
.cbl-btn:disabled{ cursor:not-allowed; }
`;
    document.head.appendChild(el);
    return () => {
      const e = document.getElementById(id);
      if (e) e.remove();
    };
  }, [uid, c.accent, c.accentDark]);

  /* -------------------- report step details -------------------- */
  useEffect(() => {
    if (mode === "example") {
      setStepDetails?.({ currentStep: exampleActIdx(exT) + 1, totalSteps: EXAMPLE_STEPS.length, isPaused: !exPlaying, currentMode: "example" });
      return;
    }
    const cur = phase === "play" ? (stage === "intro" || stage === "churning" ? 1 : cpIdx + 2) : total + 2;
    setStepDetails?.({ currentStep: cur, totalSteps: total + 1, isPaused: !isPlaying, currentMode: "learn" });
  }, [mode, exT, exPlaying, phase, stage, cpIdx, isPlaying, setStepDetails, total]);

  /* -------------------- animation loop -------------------- */
  const cancelFrame = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };
  const tick = useCallback((now: number) => {
    const elapsed = now - startRef.current + elapsedRef.current;
    const t = Math.min(elapsed / ANIM_MS, 1);
    setAnimT(t);
    if (t < 1) {
      frameRef.current = requestAnimationFrame(tick);
    } else {
      setAnimComplete(true);
      setIsPlaying(false);
      frameRef.current = null;
    }
  }, []);

  const handlePlay = () => {
    if (animComplete) return;
    cancelFrame();
    setStage("churning");
    startRef.current = performance.now();
    setIsPlaying(true);
    frameRef.current = requestAnimationFrame(tick);
  };
  const handleReplay = () => {
    cancelFrame();
    setAnimT(0);
    setAnimComplete(false);
    elapsedRef.current = 0;
    startRef.current = performance.now();
    setStage("churning");
    setIsPlaying(true);
    frameRef.current = requestAnimationFrame(tick);
  };
  const startLabelling = () => {
    cancelFrame();
    setStage("checkpoint");
    setCpIdx(0);
  };

  useEffect(() => () => cancelFrame(), []);

  /* -------------------- bonus lassi example loop -------------------- */
  const cancelExFrame = () => {
    if (exFrameRef.current !== null) {
      cancelAnimationFrame(exFrameRef.current);
      exFrameRef.current = null;
    }
  };
  const exTick = useCallback((now: number) => {
    const elapsed = now - exStartRef.current + exElapsedRef.current;
    const t = Math.min(elapsed / EX_MS, 1);
    setExT(t);
    if (t < 1) {
      exFrameRef.current = requestAnimationFrame(exTick);
    } else {
      setExComplete(true);
      setExPlaying(false);
      exFrameRef.current = null;
    }
  }, []);
  const handlePlayExample = () => {
    cancelExFrame();
    setExT(0);
    setExComplete(false);
    exElapsedRef.current = 0;
    exStartRef.current = performance.now();
    setExPlaying(true);
    exFrameRef.current = requestAnimationFrame(exTick);
  };
  const openExample = () => {
    cancelFrame();
    cancelExFrame();
    setExT(0);
    setExComplete(false);
    setExPlaying(false);
    exElapsedRef.current = 0;
    setMode("example");
  };
  const switchMode = (m: ModeType) => {
    if (m === mode) return;
    if (m === "example") openExample();
    else {
      cancelExFrame();
      setExPlaying(false);
      setMode("learn");
    }
  };
  useEffect(() => () => cancelExFrame(), []);

  /* -------------------- region blink target -------------------- */
  const currentCp = DEFAULT_CHECKPOINTS[cpIdx];
  const blinkRegion: "top" | "bottom" | null =
    stage === "checkpoint" && currentCp?.kind === "tag" && !chipsOpen && !lockedTags[currentCp.region!]
      ? currentCp.region!
      : null;

  /* -------------------- record an answer once -------------------- */
  const recordAnswer = (cpId: string, firstPick: string, correct: boolean) => {
    if (recordedRef.current.has(cpId)) return;
    recordedRef.current.add(cpId);
    setAnswers((a) => [...a, { cpId, firstPick, correct }]);
  };

  /* -------------------- prediction handlers -------------------- */
  const handlePredict = (idx: number) => {
    if (predictDone) return;
    setPredictPick(idx);
    const correct = idx === currentCp.correctIdx;
    recordAnswer(currentCp.id, currentCp.options![idx], correct);
    setPredictDone(true);
    if (!correct) setHint(HINT_LINE);
    else setHint(null);
  };
  const handlePredictContinue = () => {
    setPredictDone(false);
    setPredictPick(null);
    setHint(null);
    setCpIdx((i) => i + 1);
  };

  /* -------------------- tag handlers -------------------- */
  const handleRegionTap = (region: "top" | "bottom") => {
    if (stage !== "checkpoint" || currentCp.kind !== "tag") return;
    if (region !== currentCp.region) return; // only the asked region is active
    if (lockedTags[region]) return;
    setChipsOpen(true);
    setActiveRegion(region);
  };

  const handleTagPick = (tag: TagValue) => {
    if (!activeRegion || !currentCp.correctTag) return;
    const correct = tag === currentCp.correctTag;
    recordAnswer(currentCp.id, TAG_LABEL[tag], correct); // first pick counts for score
    if (correct) {
      setLockedTags((p) => ({ ...p, [activeRegion]: tag }));
      setChipsOpen(false);
      setHint(null);
      setJustLocked(currentCp.id);
      setActiveRegion(null);
    } else {
      setHint(HINT_LINE);
      setShakeKey((k) => k + 1);
    }
  };

  const handleTagContinue = () => {
    setJustLocked(null);
    setHint(null);
    if (cpIdx >= total - 1) {
      goToResult();
    } else {
      setCpIdx((i) => i + 1);
    }
  };

  /* -------------------- result -------------------- */
  const score = answers.filter((a) => a.correct).length;
  const stars = Math.round((score / total) * 5);
  const wrong = DEFAULT_CHECKPOINTS.filter((cp) => {
    const a = answers.find((x) => x.cpId === cp.id);
    return a && !a.correct;
  });

  const goToResult = () => {
    cancelFrame();
    setPhase("result");
  };

  // score count-up + confetti
  useEffect(() => {
    if (phase !== "result") return;
    let raf = 0;
    const t0 = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - t0) / 1200, 1);
      const e = 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2); // easeOutBack-ish
      setScoreShown(Math.round(clamp01(e) * score));
      if (p < 1) raf = requestAnimationFrame(run);
      else setScoreShown(score);
    };
    raf = requestAnimationFrame(run);
    // confetti
    const cv = confettiRef.current;
    let craf = 0;
    if (cv) {
      const ctx = cv.getContext("2d")!;
      const W = (cv.width = cv.clientWidth * 2);
      const H = (cv.height = cv.clientHeight * 2);
      const cols = [c.accent, c.primary, c.success, c.accentDark, c.primaryLight];
      const parts = Array.from({ length: 46 }, () => ({
        x: Math.random() * W,
        y: -Math.random() * H * 0.4,
        vy: 2 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 3,
        s: 6 + Math.random() * 8,
        col: cols[(Math.random() * cols.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
      }));
      const cs = performance.now();
      const draw = (now: number) => {
        const life = (now - cs) / 2000;
        ctx.clearRect(0, 0, W, H);
        parts.forEach((p) => {
          p.x += p.vx * 2;
          p.y += p.vy * 2;
          p.rot += p.vr;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.col;
          ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
          ctx.restore();
        });
        if (life < 1) craf = requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, W, H);
      };
      craf = requestAnimationFrame(draw);
    }
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(craf);
    };
  }, [phase, score, c.accent, c.primary, c.success, c.accentDark, c.primaryLight]);

  /* -------------------- play again -------------------- */
  const handlePlayAgain = () => {
    cancelFrame();
    setMode("learn");
    setPhase("play");
    setStage("intro");
    setCpIdx(0);
    setAnimT(0);
    setAnimComplete(false);
    setIsPlaying(false);
    elapsedRef.current = 0;
    setActiveRegion(null);
    setChipsOpen(false);
    setLockedTags({});
    setHint(null);
    setJustLocked(null);
    setPredictPick(null);
    setPredictDone(false);
    setAnswers([]);
    recordedRef.current = new Set();
    setReviewIdx(0);
    setScoreShown(0);
    cancelExFrame();
    setExT(0);
    setExPlaying(false);
    setExComplete(false);
    exElapsedRef.current = 0;
  };

  /* ============================ render helpers ============================ */
  const PX = isMobile ? 16 : 28;
  const pillBtn = (bg: string, fg = "#fff"): React.CSSProperties => ({
    background: bg,
    color: fg,
    borderRadius: DS.r.pill,
    padding: isMobile ? "12px 22px" : "13px 28px",
    fontWeight: 600,
    fontSize: isMobile ? 15 : 16,
    boxShadow: "0 6px 16px rgba(74,77,201,.18)",
    minHeight: 48,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  });
  const outlineBtn = (col: string): React.CSSProperties => ({
    background: "#fff",
    color: col,
    border: `1.6px solid ${col}`,
    borderRadius: DS.r.pill,
    padding: isMobile ? "11px 20px" : "12px 26px",
    fontWeight: 600,
    fontSize: isMobile ? 15 : 16,
    minHeight: 48,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  });

  /* ---- instruction text per stage ---- */
  const instruction = (() => {
    if (phase !== "play") return "";
    if (stage === "intro") return "Watch the churning, then tag each layer of the pot.";
    if (stage === "churning") return animComplete ? "The butter has separated. Ready to tag the layers?" : "Churning the curd…";
    if (currentCp?.kind === "predict") return currentCp.prompt;
    return currentCp?.prompt ?? "";
  })();

  /* ====================================================================== */
  return (
    <div
      className="cbl-root"
      style={{
        fontFamily: "Poppins, sans-serif",
        background: DS.c.g100,
        minHeight: "100%",
        width: "100%",
        color: DS.c.g900,
        display: "flex",
        justifyContent: "center",
        padding: isMobile ? 10 : 18,
      }}
    >
      <div style={{ width: "100%", maxWidth: 920, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* ---------------- Header ---------------- */}
        <div
          style={{
            background: DS.grad.header,
            borderRadius: DS.r.xl,
            padding: isMobile ? "16px 18px" : "22px 26px",
            color: "#fff",
            boxShadow: "0 10px 26px rgba(83,48,134,.28)",
          }}
        >
          <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, lineHeight: 1.15 }}>
            Churned Curd: Which Layer Is Which?
          </div>
          <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 500, opacity: 0.92, marginTop: 6 }}>
            Tag the top and bottom layers of the pot. Remember — floating things are usually lighter.
          </div>
        </div>

        {/* ---------------- Mode selector ---------------- */}
        {cfg.showModeSelector && cfg.enabledModes.length > 1 && (
          <div
            style={{
              display: "flex",
              background: "#fff",
              borderRadius: DS.r.pill,
              padding: 5,
              gap: 4,
              boxShadow: "0 2px 10px rgba(0,0,0,.05)",
            }}
          >
            {([
              { id: "learn" as ModeType, label: "Learn" },
              { id: "example" as ModeType, label: "Example" },
            ])
              .filter((m) => cfg.enabledModes.includes(m.id))
              .map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    className="cbl-btn"
                    onClick={() => switchMode(m.id)}
                    style={{
                      flex: 1,
                      borderRadius: DS.r.pill,
                      padding: isMobile ? "10px 14px" : "11px 18px",
                      fontWeight: 600,
                      fontSize: isMobile ? 14 : 15,
                      minHeight: 44,
                      background: active ? DS.grad.header : "transparent",
                      color: active ? "#fff" : DS.c.g700,
                      boxShadow: active ? "0 4px 12px rgba(83,48,134,.22)" : "none",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
          </div>
        )}

        {/* ---------------- PLAY PHASE (learn) ---------------- */}
        {mode === "learn" && phase === "play" && (
          <>
            {/* instruction strip */}
            <div
              style={{
                background: "#fff",
                borderRadius: DS.r.lg,
                padding: isMobile ? "12px 14px" : "14px 18px",
                fontSize: isMobile ? 15 : 16,
                fontWeight: 500,
                color: DS.c.g900,
                borderLeft: `4px solid ${DS.c.primary}`,
                boxShadow: "0 2px 10px rgba(0,0,0,.04)",
                minHeight: 52,
                display: "flex",
                alignItems: "center",
              }}
            >
              {instruction}
            </div>

            {/* figure + overlays */}
            <div
              style={{
                background: "#fff",
                borderRadius: DS.r.xl,
                padding: isMobile ? 10 : 18,
                boxShadow: "0 4px 18px rgba(0,0,0,.06)",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 460,
                  margin: "0 auto",
                  aspectRatio: `${VB_W} / ${VB_H}`,
                  background: "radial-gradient(120% 90% at 50% 25%, #FFFFFF 0%, #FAFAFA 100%)",
                  borderRadius: DS.r.lg,
                  overflow: "hidden",
                }}
              >
                <PotScene animT={phase === "play" && stage === "intro" ? 0 : animT} uid={uid} />

                {/* region tap overlays — only in checkpoint/tag stage */}
                {(["top", "bottom"] as const).map((region) => {
                  const r = REGION_PCT[region];
                  const isBlink = blinkRegion === region;
                  const isLocked = !!lockedTags[region];
                  const tappable = stage === "checkpoint" && currentCp?.kind === "tag" && currentCp.region === region && !isLocked;
                  return (
                    <div
                      key={region}
                      onClick={() => tappable && handleRegionTap(region)}
                      style={{
                        position: "absolute",
                        left: `${r.left}%`,
                        top: `${r.top}%`,
                        width: `${r.width}%`,
                        height: `${r.height}%`,
                        borderRadius: 10,
                        border: isBlink ? `2px dashed ${DS.c.accent}` : isLocked ? `2px solid ${DS.c.success}` : "2px solid transparent",
                        animation: isBlink ? "cbl-blink 1.1s ease-in-out infinite" : "none",
                        cursor: tappable ? "pointer" : "default",
                        background: isLocked ? "rgba(46,204,113,.10)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isLocked && (
                        <span
                          style={{
                            background: "#fff",
                            color: DS.c.successDk,
                            fontSize: isMobile ? 11 : 12.5,
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: DS.r.pill,
                            border: `1px solid ${DS.c.success}`,
                            boxShadow: "0 2px 6px rgba(0,0,0,.08)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {TAG_LABEL[lockedTags[region]!]}
                        </span>
                      )}
                      {isBlink && (
                        <span
                          style={{
                            background: DS.c.accent,
                            color: "#fff",
                            fontSize: isMobile ? 11 : 12,
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: DS.r.pill,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Tap to tag
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* progress dots */}
              {stage === "checkpoint" && (
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
                  {DEFAULT_CHECKPOINTS.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: i === cpIdx ? 22 : 8,
                        height: 8,
                        borderRadius: 4,
                        background: i < cpIdx || (i === cpIdx && false) ? DS.c.success : i === cpIdx ? DS.c.accent : DS.c.g200,
                        transition: "all .25s ease",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ---- control row (play / replay / continue) ---- */}
            {(stage === "intro" || stage === "churning") && (
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {!animComplete && cfg.showPlayPause && (
                  <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={handlePlay} disabled={isPlaying}>
                    <Play size={20} fill="#fff" /> {isPlaying ? "Churning…" : "Play"}
                  </button>
                )}
                {animComplete && (
                  <>
                    <button className="cbl-btn" style={outlineBtn(DS.c.primary)} onClick={handleReplay}>
                      <RotateCcw size={18} /> Replay
                    </button>
                    <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={startLabelling}>
                      Start tagging <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ---- PREDICT card ---- */}
            {stage === "checkpoint" && currentCp?.kind === "predict" && (
              <div style={{ background: "#fff", borderRadius: DS.r.lg, padding: isMobile ? 16 : 20, boxShadow: "0 4px 16px rgba(0,0,0,.06)", animation: "cbl-slideUp .35s ease" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: DS.c.primary, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 10 }}>
                  Predict
                </div>
                <div
                  style={{
                    fontSize: isMobile ? 15 : 16,
                    fontWeight: 500,
                    lineHeight: 1.55,
                    color: DS.c.g900,
                    background: DS.c.primaryGhost,
                    border: `1px solid ${DS.c.primaryLight}`,
                    borderLeft: `4px solid ${DS.c.primary}`,
                    borderRadius: DS.r.md,
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    marginBottom: 14,
                  }}
                >
                  {currentCp.prompt}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {currentCp.options!.map((opt, i) => {
                    const picked = predictPick === i;
                    const showState = predictDone;
                    const isCorrect = i === currentCp.correctIdx;
                    let bg = "#fff",
                      bd = DS.c.g200,
                      col = DS.c.g900;
                    if (showState && picked && !isCorrect) {
                      bg = "#FDECEC";
                      bd = DS.c.danger;
                      col = DS.c.danger;
                    }
                    if (showState && isCorrect) {
                      bg = "#EAF9F0";
                      bd = DS.c.success;
                      col = DS.c.successDk;
                    }
                    return (
                      <button
                        key={i}
                        className="cbl-btn"
                        disabled={predictDone}
                        onClick={() => handlePredict(i)}
                        style={{
                          flex: "1 1 180px",
                          background: bg,
                          border: `1.6px solid ${bd}`,
                          color: col,
                          borderRadius: DS.r.md,
                          padding: "14px 16px",
                          fontSize: isMobile ? 15 : 16,
                          fontWeight: 600,
                          minHeight: 56,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        {showState && isCorrect && <Check size={18} />}
                        {showState && picked && !isCorrect && <X size={18} />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {predictDone && (
                  <>
                    <div
                      style={{
                        marginTop: 14,
                        background: predictPick === currentCp.correctIdx ? "#EAF9F0" : DS.c.accentLight,
                        border: `1px solid ${predictPick === currentCp.correctIdx ? DS.c.success : DS.c.accentDark}`,
                        borderRadius: DS.r.md,
                        padding: "11px 14px",
                        fontSize: isMobile ? 14 : 15,
                        color: DS.c.g900,
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <Lightbulb size={18} color={predictPick === currentCp.correctIdx ? DS.c.successDk : DS.c.accentDark} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{predictPick === currentCp.correctIdx ? currentCp.lockReason : HINT_LINE}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                      <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={handlePredictContinue}>
                        Continue <ChevronRight size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ---- TAG chips card ---- */}
            {stage === "checkpoint" && currentCp?.kind === "tag" && chipsOpen && !justLocked && (
              <div
                key={shakeKey}
                style={{
                  background: "#fff",
                  borderRadius: DS.r.lg,
                  padding: isMobile ? 16 : 20,
                  boxShadow: "0 4px 16px rgba(0,0,0,.06)",
                  animation: hint ? "cbl-shake .42s ease" : "cbl-slideUp .3s ease",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: DS.c.primary, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 10 }}>
                  Pick a tag for the {currentCp.region} layer
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {(["lighter", "heavier"] as TagValue[]).map((tag) => (
                    <button
                      key={tag}
                      className="cbl-btn"
                      onClick={() => handleTagPick(tag)}
                      style={{
                        flex: "1 1 160px",
                        background: DS.c.primaryGhost,
                        border: `1.6px solid ${DS.c.primaryLight}`,
                        color: DS.c.primaryDark,
                        borderRadius: DS.r.md,
                        padding: "14px 16px",
                        fontSize: isMobile ? 15 : 16,
                        fontWeight: 600,
                        minHeight: 56,
                      }}
                    >
                      {TAG_LABEL[tag]}
                    </button>
                  ))}
                </div>
                {hint && (
                  <div
                    style={{
                      marginTop: 14,
                      background: DS.c.accentLight,
                      border: `1px solid ${DS.c.accentDark}`,
                      borderRadius: DS.r.md,
                      padding: "11px 14px",
                      fontSize: isMobile ? 14 : 15,
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <Lightbulb size={18} color={DS.c.accentDark} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{hint} Try again.</span>
                  </div>
                )}
              </div>
            )}

            {/* ---- locked-in reason card ---- */}
            {stage === "checkpoint" && currentCp?.kind === "tag" && justLocked === currentCp.id && (
              <div style={{ background: "#fff", borderRadius: DS.r.lg, padding: isMobile ? 16 : 20, boxShadow: "0 4px 16px rgba(0,0,0,.06)", animation: "cbl-slideUp .3s ease" }}>
                <div
                  style={{
                    background: "#EAF9F0",
                    border: `1px solid ${DS.c.success}`,
                    borderRadius: DS.r.md,
                    padding: "11px 14px",
                    fontSize: isMobile ? 14 : 15,
                    color: DS.c.g900,
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <Check size={18} color={DS.c.successDk} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    <strong>Locked in.</strong> {currentCp.lockReason}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={handleTagContinue}>
                    {cpIdx >= total - 1 ? "See result" : "Next layer"} <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ---------------- RESULT PHASE ---------------- */}
        {mode === "learn" && phase === "result" && (
          <div style={{ position: "relative", background: "#fff", borderRadius: DS.r.xl, padding: isMobile ? 22 : 34, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,.10)", overflow: "hidden", animation: "cbl-overlay .4s ease" }}>
            <canvas ref={confettiRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 2 }}>
              <div style={{ width: 64, height: 64, borderRadius: DS.r.pill, background: DS.grad.result, display: "inline-flex", alignItems: "center", justifyContent: "center", animation: "cbl-pop .6s ease", boxShadow: "0 8px 22px rgba(255,114,18,.35)" }}>
                <Award size={34} color="#fff" />
              </div>
              <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, marginTop: 14 }}>
                {score === total ? "Brilliant!" : score >= 2 ? "Nicely done!" : "Good start!"}
              </div>
              <div style={{ fontSize: isMobile ? 48 : 56, fontWeight: 800, color: DS.c.primary, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginTop: 4 }}>
                {scoreShown} / {total}
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={isMobile ? 26 : 30} fill={i < stars ? DS.c.amber : "none"} color={i < stars ? DS.c.amber : DS.c.g400} style={{ animation: `cbl-pop .4s ease ${0.3 + i * 0.12}s both` }} />
                ))}
              </div>
              <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 500, color: DS.c.g700, marginTop: 14, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                {score === total
                  ? "You've locked this concept down — lighter floats, heavier settles."
                  : score >= 2
                  ? "Strong work. Review the one you'd like to polish."
                  : "Let's walk through why butter floats and buttermilk sinks."}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
                <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={() => { setReviewIdx(0); setPhase("review"); }}>
                  Review answers
                </button>
                <button className="cbl-btn" style={outlineBtn(DS.c.primary)} onClick={handlePlayAgain}>
                  <RefreshCw size={18} /> Play again
                </button>
              </div>
              <button
                className="cbl-btn"
                onClick={openExample}
                style={{
                  ...pillBtn(DS.c.primary),
                  marginTop: 16,
                  boxShadow: "0 6px 16px rgba(74,77,201,.22)",
                }}
              >
                <Play size={18} fill="#fff" /> Explore example — making lassi
              </button>
            </div>
          </div>
        )}

        {/* ---------------- EXAMPLE MODE (making lassi) ---------------- */}
        {mode === "example" && (
          <>
            <div
              style={{
                background: "#fff",
                borderRadius: DS.r.lg,
                padding: isMobile ? "12px 14px" : "14px 18px",
                fontSize: isMobile ? 15 : 16,
                fontWeight: 500,
                color: DS.c.g900,
                borderLeft: `4px solid ${DS.c.accent}`,
                boxShadow: "0 2px 10px rgba(0,0,0,.04)",
              }}
            >
              <strong style={{ color: DS.c.primaryDark }}>Real-life example — making lassi.</strong> The same idea at the
              breakfast table: when you churn curd, the light, airy froth floats to the top.
            </div>

            <div style={{ background: "#fff", borderRadius: DS.r.xl, padding: isMobile ? 10 : 18, boxShadow: "0 4px 18px rgba(0,0,0,.06)" }}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 440,
                  margin: "0 auto",
                  aspectRatio: `${LG_W} / ${LG_H}`,
                  background: "radial-gradient(120% 95% at 50% 18%, #EAEFFA 0%, #D3DCEF 100%)",
                  borderRadius: DS.r.lg,
                  overflow: "hidden",
                }}
              >
                <LassiScene t={exPlaying || exComplete ? exT : 0} uid={`${uid}-lassi`} />
              </div>

              {/* progress dots */}
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
                {EXAMPLE_STEPS.map((_, i) => {
                  const act = exComplete ? EXAMPLE_STEPS.length - 1 : exampleActIdx(exT);
                  return (
                    <div
                      key={i}
                      style={{
                        width: i === act ? 22 : 8,
                        height: 8,
                        borderRadius: 4,
                        background: i < act ? DS.c.success : i === act ? DS.c.accent : DS.c.g200,
                        transition: "all .25s ease",
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* controls */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {!exPlaying && (
                <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={handlePlayExample}>
                  {exComplete ? <RotateCcw size={18} /> : <Play size={20} fill="#fff" />} {exComplete ? "Replay" : "Play"}
                </button>
              )}
              {exComplete && (
                <button className="cbl-btn" style={outlineBtn(DS.c.primary)} onClick={() => switchMode("learn")}>
                  <ChevronLeft size={18} /> Back to learn
                </button>
              )}
            </div>

            {/* step caption strip (one at a time during play) */}
            {(exPlaying || exComplete) && !exComplete && (
              <div
                style={{
                  background: DS.c.accentLight,
                  border: `1px solid ${DS.c.accentDark}`,
                  borderRadius: DS.r.md,
                  padding: isMobile ? "12px 14px" : "14px 18px",
                  fontSize: isMobile ? 15 : 16,
                  fontWeight: 500,
                  color: DS.c.g900,
                }}
              >
                <strong>Step {exampleActIdx(exT) + 1}</strong> — {EXAMPLE_STEPS[exampleActIdx(exT)]}
              </div>
            )}

            {/* full recap once complete */}
            {exComplete && (
              <div style={{ background: "#fff", borderRadius: DS.r.lg, padding: isMobile ? 16 : 20, boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: DS.c.primary, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 10 }}>
                  How lassi is made
                </div>
                <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  {EXAMPLE_STEPS.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: isMobile ? 14 : 15,
                        lineHeight: 1.55,
                        color: DS.c.g900,
                        animation: `cbl-fadeUp .3s ease ${i * 0.08}s both`,
                      }}
                    >
                      {s}
                    </li>
                  ))}
                </ol>
                <div
                  style={{
                    marginTop: 14,
                    textAlign: "center",
                    background: DS.c.primaryGhost,
                    border: `1px solid ${DS.c.primaryLight}`,
                    borderRadius: DS.r.md,
                    padding: "10px 14px",
                    fontSize: isMobile ? 14 : 15,
                    fontWeight: 600,
                    color: DS.c.primaryDark,
                  }}
                >
                  Just like butter on churned curd, the lassi froth is lighter — so it floats to the top.
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                  <button className="cbl-btn" style={outlineBtn(DS.c.primary)} onClick={() => switchMode("learn")}>
                    <ChevronLeft size={18} /> Back to learn
                  </button>
                  <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={handlePlayAgain}>
                    <RefreshCw size={18} /> Play again
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ---------------- REVIEW PHASE ---------------- */}
        {mode === "learn" && phase === "review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* summary line */}
            <div style={{ background: "#fff", borderRadius: DS.r.lg, padding: "14px 18px", fontSize: isMobile ? 14 : 15, fontWeight: 500, boxShadow: "0 2px 10px rgba(0,0,0,.04)", display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={18} color={DS.c.successDk} />
              You got <strong style={{ margin: "0 4px" }}>{score}</strong> of {total} right.
              {wrong.length === 0 ? " Here's the full picture anyway." : ` Let's look at ${wrong.length === 1 ? "the one" : "the ones"} to revisit.`}
            </div>

            {(() => {
              const list = wrong.length > 0 ? wrong : DEFAULT_CHECKPOINTS;
              const cp = list[Math.min(reviewIdx, list.length - 1)];
              const ans = answers.find((a) => a.cpId === cp.id);
              const yourPick = ans?.firstPick ?? "—";
              const correctText =
                cp.kind === "predict" ? cp.options![cp.correctIdx!] : TAG_LABEL[cp.correctTag!];
              const highlight: "top" | "bottom" | "both" =
                cp.kind === "predict" ? "both" : cp.region!;
              return (
                <div style={{ background: "#fff", borderRadius: DS.r.lg, padding: isMobile ? 16 : 22, boxShadow: "0 4px 16px rgba(0,0,0,.06)", animation: "cbl-fadeUp .3s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: DS.c.g700 }}>
                      Item {Math.min(reviewIdx, list.length - 1) + 1} of {list.length}
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        padding: "4px 12px",
                        borderRadius: DS.r.pill,
                        background: ans?.correct ? "#EAF9F0" : "#FDECEC",
                        color: ans?.correct ? DS.c.successDk : DS.c.danger,
                      }}
                    >
                      {ans?.correct ? "You got this right" : "Worth revisiting"}
                    </span>
                  </div>

                  <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>
                    {cp.kind === "predict" ? cp.prompt : `Tag for the ${cp.region} layer`}
                  </div>

                  {/* your vs correct */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                    <div style={{ flex: "1 1 150px", background: DS.c.g100, borderRadius: DS.r.md, padding: "10px 14px" }}>
                      <div style={{ fontSize: 12, color: DS.c.g700, fontWeight: 600 }}>Your answer</div>
                      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: ans?.correct ? DS.c.successDk : DS.c.danger, marginTop: 2 }}>
                        {ans?.correct ? "✓ " : "✗ "}
                        {yourPick}
                      </div>
                    </div>
                    <div style={{ flex: "1 1 150px", background: "#EAF9F0", borderRadius: DS.r.md, padding: "10px 14px" }}>
                      <div style={{ fontSize: 12, color: DS.c.successDk, fontWeight: 600 }}>Correct answer</div>
                      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: DS.c.successDk, marginTop: 2 }}>✓ {correctText}</div>
                    </div>
                  </div>

                  {/* tool-native mini diagram */}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ width: isMobile ? 130 : 150, flexShrink: 0, margin: isMobile ? "0 auto" : 0 }}>
                      <PotScene animT={1} highlight={highlight} showLabels uid={`${uid}-mini`} mini />
                    </div>
                    <div style={{ flex: "1 1 220px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: DS.c.primary, marginBottom: 6 }}>Why</div>
                      <div style={{ fontSize: isMobile ? 14 : 15, lineHeight: 1.65, color: DS.c.g900 }}>{cp.concept}</div>
                      <div style={{ marginTop: 12, textAlign: "center", background: DS.c.accentLight, border: `1px solid ${DS.c.accentDark}`, borderRadius: DS.r.md, padding: "8px 14px", fontSize: isMobile ? 13.5 : 14.5, fontWeight: 600, color: DS.c.g900 }}>
                        Less dense → floats up &nbsp;•&nbsp; More dense → settles down
                      </div>
                    </div>
                  </div>

                  {/* review nav */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, gap: 10 }}>
                    <button
                      className="cbl-btn"
                      style={{ ...outlineBtn(DS.c.primary), opacity: reviewIdx === 0 ? 0.4 : 1 }}
                      disabled={reviewIdx === 0}
                      onClick={() => setReviewIdx((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeft size={18} /> Prev
                    </button>
                    {reviewIdx < list.length - 1 ? (
                      <button className="cbl-btn" style={pillBtn(DS.c.accent)} onClick={() => setReviewIdx((i) => i + 1)}>
                        Next <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button className="cbl-btn" style={pillBtn(DS.c.primary)} onClick={openExample}>
                        <Play size={16} fill="#fff" /> Explore example
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChurningButterLabeller;