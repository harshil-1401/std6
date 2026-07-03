// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START  –  tumbler_material_lab.tsx
// Water-pouring mini-lab with properly engineered SVG animations
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RotateCcw, Check, X, FlaskConical, Award } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';
interface StepDetails { currentStep: number; totalSteps: number; isPaused: boolean; currentMode: ModeType; }
type ShapeType = 'cup' | 'can' | 'bottle' | 'pot' | 'bag' | 'cone';
interface TumblerMaterial { id: string; name: string; color: string; accentColor: string; holdsWater: boolean; reason: string; property: string; shape: ShapeType; }
interface AddProps { materials?: TumblerMaterial[]; instructionText?: string; successMessage?: string; primaryColor?: string; secondaryColor?: string; }
interface LabProps { props?: { animationSpeed?: number; themeColor?: string; darkMode?: boolean; additionalProps?: AddProps; }; setStepDetails?: (s: StepDetails) => void; }

// ─── Data ────────────────────────────────────────────────────────────────────
const MATERIALS: TumblerMaterial[] = [
  { id:'glass',   name:'Glass Cup',       color:'#D4F1FF', accentColor:'#0284C7', holdsWater:true,  reason:'Hard, smooth and non-absorbent — water stays inside.',            property:'Non-absorbent',     shape:'cup'    },
  { id:'steel',   name:'Steel Can',       color:'#E2E8F0', accentColor:'#475569', holdsWater:true,  reason:'Solid metal walls with no gaps — water cannot escape.',            property:'Impermeable metal',  shape:'can'    },
  { id:'plastic', name:'Plastic Bottle',  color:'#FEF9C3', accentColor:'#A16207', holdsWater:true,  reason:'Waterproof polymer walls — water stays safely contained.',         property:'Waterproof',         shape:'bottle' },
  { id:'clay',    name:'Clay Pot',        color:'#FFEDD5', accentColor:'#B45309', holdsWater:true,  reason:'Baked clay forms a sealed vessel — water stays inside.',           property:'Hard and sealed',    shape:'pot'    },
  { id:'cloth',   name:'Cloth Bag',       color:'#FEE2E2', accentColor:'#B91C1C', holdsWater:false, reason:'Cloth fibres absorb water and let it seep straight through.',      property:'Absorbent',          shape:'bag'    },
  { id:'paper',   name:'Paper Cone',      color:'#FFFBEB', accentColor:'#92400E', holdsWater:false, reason:'Paper softens when wet — water soaks through and tears it apart.', property:'Weakens when wet',   shape:'cone'   },
];

// ─── Keyframes ───────────────────────────────────────────────────────────────
// KEY FIX: fillRise animates the SVG rect's y and height attributes via CSS
// custom properties, NOT scaleY — scaleY on SVG rects is unreliable cross-browser.
// We use a wrapper <g> whose clipPath controls the visible height via a rect
// that we expand by changing its `height` attribute using React state (waterLevel).
// No CSS animation needed for the fill — it's driven by requestAnimationFrame.
const KF = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  @keyframes fadeInUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes popIn     { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
  /* Jug on right side — pivot bottom-LEFT, tilt -48° counter-clockwise so spout dips down-LEFT toward container */
  @keyframes jugTilt   {
    0%   { transform: rotate(0deg); }
    22%  { transform: rotate(-48deg); }
    75%  { transform: rotate(-48deg); }
    100% { transform: rotate(0deg); }
  }
  /* Stream fades in/out */
  @keyframes streamIn  { 0%{opacity:0} 18%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
  /* Individual water drops falling down */
  @keyframes dropFall  { 0%{transform:translateY(0);opacity:0.9} 100%{transform:translateY(180px);opacity:0} }
  /* Leak drops falling through absorbent materials */
  @keyframes leakDrop  { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(55px);opacity:0} }
  /* Puddle spreading on floor */
  @keyframes puddle    { 0%{rx:4;opacity:0} 100%{rx:72;opacity:0.55} }
  @keyframes puddle2   { 0%{rx:2;opacity:0} 100%{rx:48;opacity:0.35} }
  /* Water ripple for success */
  @keyframes rippleOut { 0%{r:4;opacity:0.7} 100%{r:38;opacity:0} }
  /* Green glow success */
  @keyframes glowGreen { 0%,100%{filter:drop-shadow(0 0 2px rgba(34,197,94,0))} 50%{filter:drop-shadow(0 0 18px rgba(34,197,94,0.9))} }
  /* Red shake fail */
  @keyframes shakeRed  { 0%,100%{transform:translateX(0)} 14%{transform:translateX(-9px) rotate(-3deg)} 28%{transform:translateX(9px) rotate(3deg)} 42%{transform:translateX(-6px) rotate(-2deg)} 56%{transform:translateX(6px) rotate(2deg)} 70%{transform:translateX(-3px)} 84%{transform:translateX(3px)} }
  /* Tile hover */
  @keyframes tileUp    { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-5px) scale(1.03)} }
  /* Confetti */
  @keyframes confetti  { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(110px) rotate(520deg);opacity:0} }
  /* Pulsing drop zone border */
  @keyframes zoneGlow  { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.0)} 50%{box-shadow:0 0 0 10px rgba(99,102,241,.18)} }
  /* Slide up small labels */
  @keyframes slideUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  /* Wet patch grow */
  @keyframes wetGrow   { from{opacity:0} to{opacity:0.22} }
`;

// ─── Geometry constants ───────────────────────────────────────────────────────
// The stage is a fixed 340 × 360px coordinate space (scaled with CSS for mobile).
// Jug sits in top-centre. Container sits on the bench line at y=290.
// Stream always falls from x=148 (jug spout tip when tilted) to top of container.
// Using explicit numbers avoids every positioning bug.

const STAGE_W = 340;
const STAGE_H = 360;
// Jug sits on the RIGHT side. Spout is on jug LEFT side.
// Pivot = bottom-RIGHT of jug body: SVG (118,118) → stage approx (310,126).
// -48° counter-clockwise: spout tip swings DOWN-LEFT to stage x≈162, y≈132.
const JUG_X   = 192;
const JUG_Y   = 8;
const JUG_W   = 130;
const JUG_H   = 130;
const STREAM_X       = 162;  // stage-x above container opening after -48° tilt
const STREAM_START_Y = 132;  // stage-y of stream top
const BENCH_Y  = 295;
const CONT_W   = 110;
const CONT_X   = (STAGE_W - CONT_W) / 2; // 115 – centred
const CONT_Y   = BENCH_Y - 100;           // 195

// ─────────────────────────────────────────────────────────────────────────────
// SVG Container Components
// All viewBoxes are 0 0 100 100. Container "floor" sits at y≈92 in that space.
// Water fill rect: x=fill_x, y computed as (bottom - waterPx), height=waterPx
// waterPx is directly controlled by React state (0..70) — NO CSS animation on fill.
// The glow / shake animations are applied to the wrapping <g> transform.
// ─────────────────────────────────────────────────────────────────────────────

function GlassCupSVG({ water, phase }: { water: number; phase: string }) {
  const shaking = phase === 'result_fail';
  const glowing = phase === 'result_ok';
  // Interior bottom at y=88 in viewBox. Fill rises from there.
  const fillH = water * 0.72;
  const fillY = 88 - fillH;
  return (
    <g style={{ animation: glowing ? 'glowGreen 1.5s ease-in-out 4' : shaking ? 'shakeRed .6s ease-in-out 2' : 'none' }}>
      <defs>
        <linearGradient id="g-glass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"  stopColor="rgba(186,230,253,0.45)"/>
          <stop offset="50%" stopColor="rgba(224,242,254,0.72)"/>
          <stop offset="100%" stopColor="rgba(186,230,253,0.4)"/>
        </linearGradient>
        <clipPath id="g-clip"><path d="M24,10 L30,88 Q50,94 70,88 L76,10 Z"/></clipPath>
      </defs>
      {/* Glass body */}
      <path d="M23,10 L29,89 Q50,95 71,89 L77,10 Z" fill="url(#g-glass)" stroke="#38BDF8" strokeWidth="2.5"/>
      {/* Water fill — height driven by React state, not CSS */}
      {water > 0 && (
        <g clipPath="url(#g-clip)">
          <rect x="24" y={fillY} width="52" height={fillH + 4} fill="rgba(56,189,248,0.62)"/>
          <path d={`M24,${fillY} Q37,${fillY-3} 50,${fillY} Q63,${fillY+3} 72,${fillY}`}
            fill="rgba(186,230,253,0.5)" stroke="none"/>
        </g>
      )}
      {/* Glass rim highlight */}
      <path d="M23,10 Q50,4 77,10" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Shine */}
      <path d="M32,16 L30,72" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M39,14 L37,44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Base */}
      <ellipse cx="50" cy="90" rx="21" ry="4.5" fill="rgba(125,211,252,0.3)" stroke="#38BDF8" strokeWidth="1.5"/>
    </g>
  );
}

function SteelCanSVG({ water, phase }: { water: number; phase: string }) {
  const shaking = phase === 'result_fail';
  const glowing = phase === 'result_ok';
  const fillH = water * 0.64;
  const fillY = 85 - fillH;
  return (
    <g style={{ animation: glowing ? 'glowGreen 1.5s ease-in-out 4' : shaking ? 'shakeRed .6s ease-in-out 2' : 'none' }}>
      <defs>
        <linearGradient id="s-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#94A3B8"/>
          <stop offset="30%"  stopColor="#E2E8F0"/>
          <stop offset="62%"  stopColor="#CBD5E1"/>
          <stop offset="100%" stopColor="#8090A8"/>
        </linearGradient>
        <clipPath id="s-clip"><rect x="23" y="20" width="54" height="64"/></clipPath>
      </defs>
      <rect x="22" y="19" width="56" height="66" rx="6" fill="url(#s-grad)" stroke="#64748B" strokeWidth="2"/>
      {water > 0 && (
        <g clipPath="url(#s-clip)">
          <rect x="23" y={fillY} width="54" height={fillH + 4} fill="rgba(56,189,248,0.55)"/>
          <path d={`M23,${fillY} Q36,${fillY-2} 50,${fillY} Q63,${fillY+2} 77,${fillY}`}
            fill="rgba(186,230,253,0.45)" stroke="none"/>
        </g>
      )}
      <ellipse cx="50" cy="19" rx="28" ry="6"  fill="#CBD5E1" stroke="#64748B" strokeWidth="2"/>
      <ellipse cx="50" cy="85" rx="28" ry="5.5" fill="#94A3B8" stroke="#475569" strokeWidth="1.5"/>
      <rect x="24" y="35" width="52" height="22" rx="2" fill="rgba(255,255,255,0.15)"/>
      <rect x="29" y="22" width="7"  height="54" rx="3.5" fill="rgba(255,255,255,0.2)"/>
      <rect x="22" y="16" width="56" height="5.5" rx="2.5" fill="#94A3B8" stroke="#64748B" strokeWidth="1"/>
    </g>
  );
}

function PlasticBottleSVG({ water, phase }: { water: number; phase: string }) {
  const shaking = phase === 'result_fail';
  const glowing = phase === 'result_ok';
  const fillH = water * 0.67;
  const fillY = 89 - fillH;
  return (
    <g style={{ animation: glowing ? 'glowGreen 1.5s ease-in-out 4' : shaking ? 'shakeRed .6s ease-in-out 2' : 'none' }}>
      <defs>
        <linearGradient id="p-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(253,224,71,0.6)"/>
          <stop offset="50%"  stopColor="rgba(254,249,195,0.88)"/>
          <stop offset="100%" stopColor="rgba(253,224,71,0.55)"/>
        </linearGradient>
        <clipPath id="p-clip"><path d="M37,22 Q50,16 63,22 L67,30 L71,89 Q50,95 29,89 L33,30 Z"/></clipPath>
      </defs>
      {/* Cap */}
      <rect x="41" y="6"  width="18" height="14" rx="4"   fill="rgba(253,224,71,0.9)" stroke="#A16207" strokeWidth="2"/>
      <rect x="39" y="14" width="22" height="7"  rx="2.5" fill="#A16207"/>
      {/* Body */}
      <path d="M37,22 Q50,16 63,22 L67,30 L71,89 Q50,95 29,89 L33,30 Z" fill="url(#p-grad)" stroke="#A16207" strokeWidth="2"/>
      {water > 0 && (
        <g clipPath="url(#p-clip)">
          <rect x="29" y={fillY} width="42" height={fillH + 4} fill="rgba(56,189,248,0.55)"/>
          <path d={`M29,${fillY} Q40,${fillY-2.5} 50,${fillY} Q60,${fillY+2.5} 71,${fillY}`}
            fill="rgba(186,230,253,0.45)" stroke="none"/>
        </g>
      )}
      <path d="M38,25 Q37,54 38,84" stroke="rgba(255,255,255,0.6)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
    </g>
  );
}

function ClayPotSVG({ water, phase }: { water: number; phase: string }) {
  const shaking = phase === 'result_fail';
  const glowing = phase === 'result_ok';
  const fillH = water * 0.66;
  const fillY = 90 - fillH;
  return (
    <g style={{ animation: glowing ? 'glowGreen 1.5s ease-in-out 4' : shaking ? 'shakeRed .6s ease-in-out 2' : 'none' }}>
      <defs>
        <radialGradient id="c-grad" cx="38%" cy="35%">
          <stop offset="0%"   stopColor="#F4A460"/>
          <stop offset="55%"  stopColor="#CD853F"/>
          <stop offset="100%" stopColor="#8B4513"/>
        </radialGradient>
        <clipPath id="c-clip"><path d="M37,24 Q17,34 17,60 Q17,88 50,91 Q83,88 83,60 Q83,34 63,24 Z"/></clipPath>
      </defs>
      <ellipse cx="50" cy="24" rx="17" ry="7.5" fill="#B45309" stroke="#7C2D12" strokeWidth="2"/>
      <ellipse cx="50" cy="16" rx="13" ry="5"   fill="#78350F" stroke="#7C2D12" strokeWidth="1.5"/>
      <path d="M37,24 Q17,34 17,60 Q17,88 50,91 Q83,88 83,60 Q83,34 63,24 Z" fill="url(#c-grad)" stroke="#7C2D12" strokeWidth="2"/>
      {water > 0 && (
        <g clipPath="url(#c-clip)">
          <rect x="17" y={fillY} width="66" height={fillH + 4} fill="rgba(56,189,248,0.55)"/>
          <path d={`M17,${fillY} Q33,${fillY-3} 50,${fillY} Q67,${fillY+3} 83,${fillY}`}
            fill="rgba(186,230,253,0.45)" stroke="none"/>
        </g>
      )}
      <path d="M24,46 Q50,43 76,46" fill="none" stroke="rgba(124,45,18,0.3)"  strokeWidth="1.5"/>
      <path d="M19,62 Q50,59 81,62" fill="none" stroke="rgba(124,45,18,0.3)"  strokeWidth="1.5"/>
      <path d="M30,30 Q28,52 30,73" stroke="rgba(255,255,255,0.25)" strokeWidth="5" strokeLinecap="round" fill="none"/>
    </g>
  );
}

function ClothBagSVG({ phase }: { phase: string }) {
  const shaking = phase === 'result_fail';
  const leaking = phase === 'result_fail';
  return (
    <g style={{ animation: shaking ? 'shakeRed .6s ease-in-out 2' : 'none' }}>
      <defs>
        <radialGradient id="b-grad" cx="50%" cy="36%">
          <stop offset="0%"   stopColor="#FDBA74"/>
          <stop offset="100%" stopColor="#C2410C"/>
        </radialGradient>
      </defs>
      {/* Handles */}
      <path d="M34,28 Q27,10 36,6 Q45,2 44,22"  fill="none" stroke="#9A3412" strokeWidth="4.5" strokeLinecap="round"/>
      <path d="M66,28 Q73,10 64,6 Q55,2 56,22"  fill="none" stroke="#9A3412" strokeWidth="4.5" strokeLinecap="round"/>
      {/* Body */}
      <path d="M20,28 Q17,58 21,80 Q33,96 50,96 Q67,96 79,80 Q83,58 80,28 Z" fill="url(#b-grad)" stroke="#9A3412" strokeWidth="2.5"/>
      {/* Fabric weave lines */}
      {[29,36,43,50,57,64,71].map((x,i) => (
        <line key={i} x1={x} y1="30" x2={x-2} y2="88" stroke="rgba(154,52,18,0.2)" strokeWidth="1.2"/>
      ))}
      {[40,52,64,76].map((y,i) => (
        <path key={i} d={`M20,${y} Q50,${y-3} 80,${y}`} fill="none" stroke="rgba(154,52,18,0.15)" strokeWidth="1"/>
      ))}
      {/* Opening */}
      <path d="M20,28 Q33,22 44,26 Q50,24 56,26 Q67,22 80,28" fill="none" stroke="#9A3412" strokeWidth="2"/>
      {/* Wet darkening when leaking */}
      {leaking && (
        <path d="M22,32 Q50,28 78,32 L76,86 Q62,95 50,95 Q38,95 24,86 Z"
          fill="rgba(56,189,248,0.2)" style={{ animation:'wetGrow .7s ease-out forwards' }}/>
      )}
      {/* Leak drops oozing through fabric at bottom */}
      {leaking && [30,38,46,50,54,62,70].map((x,i) => (
        <ellipse key={i} cx={x} cy={89} rx="2.5" ry="4.5" fill="rgba(56,189,248,0.85)"
          style={{ animation:`leakDrop ${0.55+i*0.09}s ease-in ${i*0.14}s infinite` }}/>
      ))}
    </g>
  );
}

function PaperConeSVG({ phase }: { phase: string }) {
  const shaking = phase === 'result_fail';
  const leaking = phase === 'result_fail';
  return (
    <g style={{ animation: shaking ? 'shakeRed .6s ease-in-out 2' : 'none' }}>
      <defs>
        <linearGradient id="pc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FEFCE8"/>
          <stop offset="100%" stopColor="#FDE68A"/>
        </linearGradient>
      </defs>
      <path d="M13,14 Q50,8 87,14 L59,90 Q50,97 41,90 Z" fill="url(#pc-grad)" stroke="#92400E" strokeWidth="2.5"/>
      {/* Fold lines */}
      <path d="M13,14 L41,90" stroke="rgba(146,64,14,0.22)" strokeWidth="1.5" fill="none"/>
      <path d="M87,14 L59,90" stroke="rgba(146,64,14,0.22)" strokeWidth="1.5" fill="none"/>
      <path d="M19,34 Q50,30 81,34" fill="none" stroke="rgba(146,64,14,0.18)" strokeWidth="1"/>
      <path d="M25,54 Q50,50 75,54" fill="none" stroke="rgba(146,64,14,0.18)" strokeWidth="1"/>
      <path d="M31,73 Q50,69 69,73" fill="none" stroke="rgba(146,64,14,0.18)" strokeWidth="1"/>
      {/* Wet soaking patch */}
      {leaking && (
        <path d="M27,38 Q50,34 73,38 L64,88 Q50,95 36,88 Z"
          fill="rgba(56,189,248,0.2)" style={{ animation:'wetGrow .7s ease-out forwards' }}/>
      )}
      {/* Soggy tear cracks */}
      {leaking && <>
        <path d="M39,72 Q43,77 37,83" stroke="rgba(146,64,14,0.55)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <path d="M58,70 Q62,75 59,83" stroke="rgba(146,64,14,0.55)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      </>}
      {/* Single drop at bottom tip */}
      {leaking && (
        <ellipse cx="50" cy="95" rx="3.5" ry="5.5" fill="rgba(56,189,248,0.9)"
          style={{ animation:'leakDrop 1s ease-in infinite' }}/>
      )}
    </g>
  );
}

// ─── Container dispatcher ─────────────────────────────────────────────────────
function ContainerSVG({ material, water, phase }: { material: TumblerMaterial; water: number; phase: string }) {
  switch (material.shape) {
    case 'cup':    return <GlassCupSVG     water={water} phase={phase}/>;
    case 'can':    return <SteelCanSVG     water={water} phase={phase}/>;
    case 'bottle': return <PlasticBottleSVG water={water} phase={phase}/>;
    case 'pot':    return <ClayPotSVG      water={water} phase={phase}/>;
    case 'bag':    return <ClothBagSVG     phase={phase}/>;
    case 'cone':   return <PaperConeSVG    phase={phase}/>;
    default:       return <GlassCupSVG     water={water} phase={phase}/>;
  }
}

// ─── Tile mini preview (tray icons) ──────────────────────────────────────────
function TileIcon({ shape, color, accent, sz = 48 }: { shape: ShapeType; color: string; accent: string; sz?: number }) {
  const props = { width: sz, height: sz };
  switch (shape) {
    case 'cup':
      return <svg viewBox="0 0 100 100" {...props}>
        <path d="M22,10 L28,88 Q50,95 72,88 L78,10 Z" fill={color} stroke={accent} strokeWidth="4"/>
        <ellipse cx="50" cy="89" rx="22" ry="5" fill={color} stroke={accent} strokeWidth="2.5"/>
        <path d="M33,17 L31,70" stroke="rgba(255,255,255,0.65)" strokeWidth="4" strokeLinecap="round"/>
      </svg>;
    case 'can':
      return <svg viewBox="0 0 100 100" {...props}>
        <rect x="22" y="17" width="56" height="68" rx="7" fill={color} stroke={accent} strokeWidth="4"/>
        <ellipse cx="50" cy="17" rx="28" ry="7" fill={color} stroke={accent} strokeWidth="3"/>
        <ellipse cx="50" cy="85" rx="28" ry="7" fill={color} stroke={accent} strokeWidth="2.5"/>
        <rect x="30" y="35" width="10" height="32" rx="5" fill="rgba(255,255,255,0.28)"/>
      </svg>;
    case 'bottle':
      return <svg viewBox="0 0 100 100" {...props}>
        <rect x="41" y="5" width="18" height="14" rx="4" fill={accent}/>
        <path d="M36,18 Q50,12 64,18 L68,28 L72,88 Q50,94 28,88 L32,28 Z" fill={color} stroke={accent} strokeWidth="3.5"/>
        <path d="M38,22 Q37,55 38,83" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      </svg>;
    case 'pot':
      return <svg viewBox="0 0 100 100" {...props}>
        <path d="M37,22 Q18,32 18,60 Q18,88 50,91 Q82,88 82,60 Q82,32 63,22 Z" fill={color} stroke={accent} strokeWidth="3.5"/>
        <ellipse cx="50" cy="22" rx="16" ry="6" fill={accent}/>
        <path d="M31,28 Q29,52 31,74" stroke="rgba(255,255,255,0.25)" strokeWidth="5" strokeLinecap="round" fill="none"/>
      </svg>;
    case 'bag':
      return <svg viewBox="0 0 100 100" {...props}>
        <path d="M34,26 Q27,10 36,6 Q45,2 44,20" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round"/>
        <path d="M66,26 Q73,10 64,6 Q55,2 56,20" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round"/>
        <path d="M20,26 Q17,58 21,80 Q33,96 50,96 Q67,96 79,80 Q83,58 80,26 Z" fill={color} stroke={accent} strokeWidth="3.5"/>
      </svg>;
    case 'cone':
      return <svg viewBox="0 0 100 100" {...props}>
        <path d="M13,14 Q50,8 87,14 L59,90 Q50,97 41,90 Z" fill={color} stroke={accent} strokeWidth="3.5"/>
        <path d="M16,28 Q50,24 84,28" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.45"/>
        <path d="M22,50 Q50,46 78,50" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.45"/>
      </svg>;
  }
}

// ─── Water Jug ───────────────────────────────────────────────────────────────
// Jug sits on the RIGHT side of the stage. Spout is on jug's LEFT side.
// Pivot = bottom-RIGHT of jug body: SVG local (118, 118) → 90.8% / 90.8% of the SVG box.
// Tilting -48° (counter-clockwise) keeps the right/bottom anchored and swings
// the LEFT spout DOWNWARD toward the container at centre-stage.
function WaterJugSVG({ pouring }: { pouring: boolean }) {
  return (
    <svg viewBox="0 0 130 130" width={JUG_W} height={JUG_H}
      style={{
        transformOrigin: '90.8% 90.8%',   // pivot = bottom-RIGHT of body
        animation: pouring ? 'jugTilt 2.8s cubic-bezier(0.4,0,0.2,1) forwards' : 'none',
        filter: 'drop-shadow(0 6px 18px rgba(14,165,233,0.38))',
        display: 'block',
      }}>
      <defs>
        <linearGradient id="jug-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#BAE6FD"/>
          <stop offset="50%"  stopColor="#7DD3FC"/>
          <stop offset="100%" stopColor="#0EA5E9"/>
        </linearGradient>
        <linearGradient id="jug-water" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="rgba(147,210,250,0.5)"/>
          <stop offset="100%" stopColor="rgba(37,99,235,0.75)"/>
        </linearGradient>
        <clipPath id="jug-body-clip">
          <path d="M16,36 L16,106 Q16,120 30,120 L88,120 Q102,120 102,106 L102,36 Z"/>
        </clipPath>
      </defs>
      {/* Handle on right */}
      <path d="M92,44 Q122,44 122,74 Q122,104 92,104" fill="none" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round"/>
      {/* Body */}
      <path d="M18,24 Q14,28 14,36 L14,106 Q14,120 30,120 L88,120 Q102,120 102,106 L102,36 Q102,28 98,24 Z"
        fill="url(#jug-body)" stroke="#0EA5E9" strokeWidth="2.5"/>
      {/* Water inside jug */}
      <rect x="15" y="60" width="87" height="60" fill="url(#jug-water)" clipPath="url(#jug-body-clip)"/>
      <path d="M15,60 Q35,56 52,60 Q72,64 102,60" fill="rgba(147,210,250,0.42)" clipPath="url(#jug-body-clip)"/>
      {/* Lid */}
      <path d="M14,24 Q14,12 24,10 L94,10 Q104,10 102,24" fill="#7DD3FC" stroke="#0EA5E9" strokeWidth="2.5"/>
      {/* Spout / lip on LEFT side — water exits here when tilted */}
      <path d="M8,10 Q14,4 24,6 L24,14 Q16,12 12,18 Z" fill="#38BDF8" stroke="#0EA5E9" strokeWidth="2"/>
      {/* Shine */}
      <path d="M26,26 Q24,64 26,104" stroke="rgba(255,255,255,0.5)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
      <path d="M37,24 Q35,48 37,68"  stroke="rgba(255,255,255,0.28)" strokeWidth="3"   strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// ─── Water stream ─────────────────────────────────────────────────────────────
// Positioned absolutely in the stage at x=STREAM_X, y=STREAM_START_Y
// Falls exactly 160px to reach the top of the container at y≈280
function WaterStreamSVG({ active }: { active: boolean }) {
  if (!active) return null;
  const streamLen = BENCH_Y - 10 - STREAM_START_Y; // ≈166
  return (
    <svg
      viewBox={`0 0 28 ${streamLen}`}
      width={28} height={streamLen}
      style={{ position:'absolute', left: STREAM_X - 14, top: STREAM_START_Y, zIndex:6, pointerEvents:'none',
        animation: 'streamIn 2.6s ease-in-out forwards' }}>
      {/* Main stream — tapers from 7px at top to 4px at bottom */}
      <path d={`M14,0 Q13,${streamLen*0.35} 13,${streamLen*0.65} Q13,${streamLen*0.85} 14,${streamLen}`}
        stroke="rgba(56,189,248,0.82)" strokeWidth="7" fill="none" strokeLinecap="round"/>
      {/* Bright core */}
      <path d={`M14,0 Q13.5,${streamLen*0.35} 13.5,${streamLen*0.65} Q13.5,${streamLen*0.85} 14,${streamLen}`}
        stroke="rgba(186,230,253,0.7)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      {/* Falling drops at bottom */}
      {[10,14,18,8,20,13,16].map((x,i) => (
        <ellipse key={i} cx={x} cy={streamLen - 8} rx="2.5" ry="3.8"
          fill="rgba(56,189,248,0.75)"
          style={{ animation:`dropFall .5s ease-in ${i*0.065}s infinite` }}/>
      ))}
    </svg>
  );
}

// ─── Floor effect (below container, on bench) ────────────────────────────────
function FloorEffect({ phase }: { phase: string }) {
  const cx = STAGE_W / 2;
  const cy = BENCH_Y + 10;
  if (phase === 'result_ok') {
    // Subtle ripples indicating water contained
    return (
      <svg viewBox="0 0 340 30" width={STAGE_W} height={30}
        style={{ position:'absolute', top: BENCH_Y + 2, left:0, zIndex:4, pointerEvents:'none' }}>
        <circle cx={cx} cy={14} r={4} fill="none" stroke="rgba(56,189,248,0.4)" strokeWidth="2"
          style={{ animation:'rippleOut 1.2s ease-out infinite' }}/>
        <circle cx={cx} cy={14} r={4} fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="1.5"
          style={{ animation:'rippleOut 1.2s ease-out .35s infinite' }}/>
      </svg>
    );
  }
  if (phase === 'result_fail') {
    // Spreading puddle on the bench
    return (
      <svg viewBox="0 0 340 28" width={STAGE_W} height={28}
        style={{ position:'absolute', top: BENCH_Y, left:0, zIndex:4, pointerEvents:'none' }}>
        <ellipse cx={cx} cy={14} ry={9} rx={4} fill="rgba(56,189,248,0.45)"
          style={{ animation:'puddle 1s cubic-bezier(.4,0,.2,1) forwards' }}/>
        <ellipse cx={cx} cy={14} ry={6} rx={2} fill="rgba(56,189,248,0.28)"
          style={{ animation:'puddle2 1s cubic-bezier(.4,0,.2,1) .1s forwards' }}/>
      </svg>
    );
  }
  return null;
}

// ─── Stage: the core visual area ─────────────────────────────────────────────
// STAGE_W × STAGE_H fixed internal layout, CSS-scaled for mobile
function TestStage({
  testingItem, phase, water, hoverZone, isMobile,
  zoneRef, onDragOver, onDragLeave, onDrop,
  primaryColor, textMuted,
}: any) {
  const scale = isMobile ? 0.82 : 1;
  return (
    <div ref={zoneRef} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{
        position: 'relative',
        width: STAGE_W * scale,
        height: STAGE_H * scale,
        margin: '0 auto',
        borderRadius: 20,
        background: hoverZone
          ? 'linear-gradient(180deg,rgba(99,102,241,0.1) 0%,rgba(99,102,241,0.04) 100%)'
          : 'linear-gradient(180deg,#F8F7FF 0%,#EEF2FF 100%)',
        border: hoverZone ? '2.5px dashed #6366F1' : '2px dashed #C7D2FE',
        transition: 'border-color .25s, background .25s',
        animation: hoverZone ? 'zoneGlow 1s ease-in-out infinite' : 'none',
        overflow: 'hidden',
      }}>
      {/* Internal layout at 1× scale, then CSS-scaled */}
      <div style={{ position:'absolute', top:0, left:0,
        width: STAGE_W, height: STAGE_H,
        transform: `scale(${scale})`, transformOrigin: '0 0' }}>

        {/* ── Water Jug (fixed top-centre) ── */}
        <div style={{ position:'absolute', left: JUG_X, top: JUG_Y, zIndex:9 }}>
          <WaterJugSVG pouring={phase === 'pouring'}/>
        </div>

        {/* ── Water stream from tilted spout to container opening ── */}
        <WaterStreamSVG active={phase === 'pouring'}/>

        {/* ── Container under test ── */}
        {testingItem ? (
          <div style={{ position:'absolute', left: CONT_X, top: CONT_Y, zIndex:7 }}>
            <svg viewBox="0 0 100 100" width={CONT_W} height={CONT_W}>
              <ContainerSVG material={testingItem} water={water} phase={phase}/>
            </svg>
          </div>
        ) : (
          <div style={{ position:'absolute', left:0, right:0, top: CONT_Y + 20,
            textAlign:'center', color: textMuted, fontSize:14, fontWeight:500, pointerEvents:'none' }}>
            {hoverZone
              ? <span style={{ color:'#6366F1', fontWeight:700 }}>✨ Release to test!</span>
              : 'Drag a tile here — or click it'}
          </div>
        )}

        {/* ── Bench surface line ── */}
        <div style={{ position:'absolute', left:0, right:0, top: BENCH_Y, height: STAGE_H - BENCH_Y,
          background: 'linear-gradient(180deg,rgba(199,210,254,0.22) 0%,rgba(199,210,254,0.48) 100%)',
          borderTop: '1.5px solid #C7D2FE' }}/>

        {/* ── Floor effect (ripple or puddle) ── */}
        <FloorEffect phase={phase}/>

        {/* ── Outcome badge ── */}
        {(phase === 'result_ok' || phase === 'result_fail') && testingItem && (
          <div style={{ position:'absolute', top:14, right:14, padding:'6px 14px', borderRadius:999, zIndex:10,
            fontWeight:700, fontSize:12,
            background: phase === 'result_ok'
              ? 'linear-gradient(135deg,#22c55e,#16a34a)'
              : 'linear-gradient(135deg,#ef4444,#dc2626)',
            color:'#fff',
            boxShadow: phase === 'result_ok' ? '0 4px 14px rgba(34,197,94,.45)' : '0 4px 14px rgba(239,68,68,.45)',
            display:'flex', alignItems:'center', gap:5,
            animation:'slideUp .3s ease-out' }}>
            {phase === 'result_ok' ? <Check size={13} strokeWidth={3}/> : <X size={13} strokeWidth={3}/>}
            {phase === 'result_ok' ? 'Holds Water ✓' : 'Leaks Water ✗'}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const TumblerMaterialLab: React.FC<LabProps> = ({ props, setStepDetails }) => {
  const sp = (props ?? {}) as NonNullable<LabProps['props']>;
  const {
    themeColor = '#4A4DC9', darkMode = false,
    animationSpeed = 1,
    additionalProps: ap = {} as AddProps,
  } = sp;
  const {
    materials      = MATERIALS,
    instructionText = 'Drag each material tile into the test zone — or just click it — to discover if it holds water!',
    successMessage  = 'Excellent work! You tested all six materials!',
    primaryColor    = themeColor,
    secondaryColor  = '#FF7212',
  } = ap;

  // ── State ──
  const [draggedId,   setDraggedId]   = useState<string|null>(null);
  const [item,        setItem]        = useState<TumblerMaterial|null>(null);
  // phase: idle | pouring | result_ok | result_fail
  const [phase,       setPhase]       = useState<string>('idle');
  const [water,       setWater]       = useState(0);
  const [tested,      setTested]      = useState<Record<string, TumblerMaterial>>({});
  const [hoverZone,   setHoverZone]   = useState(false);
  const [party,       setParty]       = useState(false);
  const [touchId,     setTouchId]     = useState<string|null>(null);
  const [touchPos,    setTouchPos]    = useState<{x:number;y:number}|null>(null);
  const [hoverTile,   setHoverTile]   = useState<string|null>(null);
  const [winW,        setWinW]        = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const zoneRef = useRef<HTMLDivElement>(null);
  const raf     = useRef(0);
  const busy    = useRef(false);

  const isMobile = winW < 768;
  const isTablet = winW >= 768 && winW < 1024;

  useEffect(() => { const h = () => setWinW(window.innerWidth); window.addEventListener('resize',h); return () => window.removeEventListener('resize',h); }, []);
  useEffect(() => {
    const s = document.createElement('style'); s.id='tmlkf3'; s.textContent=KF; document.head.appendChild(s);
    return () => { const e=document.getElementById('tmlkf3'); if(e) document.head.removeChild(e); };
  }, []);
  useEffect(() => { if(setStepDetails) setStepDetails({ currentStep:Object.keys(tested).length, totalSteps:materials.length, isPaused:false, currentMode:'hands_on' }); }, [tested, materials.length, setStepDetails]);
  useEffect(() => { if(Object.keys(tested).length===materials.length && materials.length>0 && !party) setTimeout(()=>setParty(true),900); }, [tested, materials.length, party]);

  const runTest = useCallback((mat: TumblerMaterial) => {
    if(busy.current || tested[mat.id]) return;
    busy.current = true;
    cancelAnimationFrame(raf.current);
    setItem(mat); setPhase('pouring'); setWater(0);
    const spd = animationSpeed;

    if(mat.holdsWater) {
      // Water starts rising after ~400ms (jug begins tilting)
      let t0: number|null = null;
      const duration = 1600 / spd;
      const rise = (ts: number) => {
        if(!t0) t0 = ts;
        const p = Math.min((ts-t0)/duration, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1-p, 3);
        setWater(Math.round(eased * 70));
        if(p < 1) raf.current = requestAnimationFrame(rise);
      };
      setTimeout(() => { raf.current = requestAnimationFrame(rise); }, 420 / spd);
    }

    // Switch to result phase (jug holds tilt for a beat)
    setTimeout(() => setPhase(mat.holdsWater ? 'result_ok' : 'result_fail'), 2000 / spd);
    // Lock the tested record
    setTimeout(() => setTested(prev => ({ ...prev, [mat.id]: mat })), 2600 / spd);
    // Reset stage
    setTimeout(() => { setPhase('idle'); setItem(null); setWater(0); busy.current=false; }, 5000 / spd);
  }, [tested, animationSpeed]);

  // Drag
  const onDS  = (e: React.DragEvent, id: string) => {
    if(tested[id]) return; setDraggedId(id);
    const g = (e.currentTarget as HTMLElement).cloneNode(true) as HTMLElement;
    g.style.opacity='0.01'; document.body.appendChild(g);
    e.dataTransfer.setDragImage(g,0,0);
    setTimeout(()=>document.body.removeChild(g),0);
  };
  const onDE  = () => { setDraggedId(null); setHoverZone(false); };
  const onDO  = (e: React.DragEvent) => { e.preventDefault(); setHoverZone(true); };
  const onDL  = () => setHoverZone(false);
  const onDrp = (e: React.DragEvent) => {
    e.preventDefault(); setHoverZone(false);
    if(!draggedId || phase!=='idle') return;
    const m = materials.find(x=>x.id===draggedId);
    if(m && !tested[m.id]) runTest(m);
    setDraggedId(null);
  };
  // Touch
  const onTS = (e: React.TouchEvent, id: string) => { if(tested[id]) return; const t=e.touches[0]; setTouchId(id); setTouchPos({x:t.clientX,y:t.clientY}); };
  const onTM = (e: React.TouchEvent) => { if(!touchId) return; const t=e.touches[0]; setTouchPos({x:t.clientX,y:t.clientY}); if(zoneRef.current){const r=zoneRef.current.getBoundingClientRect(); setHoverZone(t.clientX>=r.left&&t.clientX<=r.right&&t.clientY>=r.top&&t.clientY<=r.bottom);} };
  const onTE = () => { if(touchId&&hoverZone&&phase==='idle'){const m=materials.find(x=>x.id===touchId);if(m&&!tested[m.id])runTest(m);} setTouchId(null); setTouchPos(null); setHoverZone(false); };

  const onReset = () => { cancelAnimationFrame(raf.current); busy.current=false; setTested({}); setParty(false); setItem(null); setPhase('idle'); setWater(0); };

  const suitable   = useMemo(()=>Object.values(tested).filter(m=>m.holdsWater),[tested]);
  const unsuitable = useMemo(()=>Object.values(tested).filter(m=>!m.holdsWater),[tested]);
  const progress   = (Object.keys(tested).length/materials.length)*100;
  const touchMat   = touchId ? materials.find(m=>m.id===touchId) : null;
  const lastTested = (Object.values(tested) as TumblerMaterial[])[Object.values(tested).length-1] ?? null;

  // ── Colours ──
  const cardBg   = darkMode ? '#1E293B' : '#FFFFFF';
  const border   = darkMode ? 'rgba(255,255,255,0.07)' : '#E8E8F0';
  const textMain  = darkMode ? '#F1F5F9' : '#1E1B4B';
  const textMuted = darkMode ? '#94A3B8' : '#64748B';
  const pageBg   = darkMode ? 'linear-gradient(160deg,#0F172A,#1E1B4B)' : 'linear-gradient(160deg,#EEF2FF 0%,#FFF7ED 55%,#ECFDF5 100%)';

  const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: cardBg, borderRadius:24, boxShadow:'0 8px 32px rgba(79,70,229,0.07)',
    border:`1px solid ${border}`, ...extra,
  });

  return (
    <div style={{ width:'100%', minHeight:'100vh', background:pageBg, padding: isMobile ? '12px' : '28px',
      fontFamily:"'Poppins',system-ui,sans-serif", boxSizing:'border-box', color:textMain }}>
      <div style={{ maxWidth:1180, margin:'0 auto', display:'flex', flexDirection:'column', gap: isMobile ? 14 : 20 }}>

        {/* ══ HEADER ══ */}
        <div style={{ ...card(), padding: isMobile ? '18px 16px' : '24px 32px', animation:'fadeInUp .5s ease-out' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems: isMobile?'flex-start':'center', flexDirection: isMobile?'column':'row', gap:12 }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 12px', borderRadius:999, background:`${secondaryColor}15`, marginBottom:8 }}>
                <FlaskConical size={13} color={secondaryColor}/>
                <span style={{ fontSize:11, fontWeight:700, color:secondaryColor, letterSpacing:'0.1em', textTransform:'uppercase' }}>Hands-On Lab · Water Test</span>
              </div>
              <h1 style={{ margin:0, fontSize: isMobile?22:30, fontWeight:800, lineHeight:1.2, letterSpacing:'-0.03em',
                background:`linear-gradient(135deg,${primaryColor},${secondaryColor})`,
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                Can this hold water?
              </h1>
              <p style={{ margin:'6px 0 0', fontSize: isMobile?12:14, color:textMuted, lineHeight:1.6 }}>{instructionText}</p>
            </div>
            <button onClick={onReset}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';}}
              style={{ padding: isMobile?'9px 18px':'11px 22px', borderRadius:999, border:'none', cursor:'pointer',
                background:`linear-gradient(135deg,${primaryColor},#7C3AED)`, color:'#fff', fontWeight:600, fontSize: isMobile?12:13,
                display:'inline-flex', alignItems:'center', gap:7, fontFamily:'inherit', flexShrink:0,
                boxShadow:`0 4px 16px ${primaryColor}40`, transition:'all .25s ease' }}>
              <RotateCcw size={14}/> Reset Lab
            </button>
          </div>


          {/* progress bar */}
          <div style={{ marginTop:14, height:7, borderRadius:999, background: darkMode?'rgba(255,255,255,0.06)':'#E8E8F0', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progress}%`, borderRadius:999, transition:'width .6s cubic-bezier(.4,0,.2,1)',
              background:`linear-gradient(90deg,${primaryColor},${secondaryColor})`, boxShadow:`0 0 10px ${primaryColor}55` }}/>
          </div>
          <p style={{ margin:'5px 0 0', fontSize:11, color:textMuted, fontWeight:500 }}>
            {Object.keys(tested).length} of {materials.length} materials tested
          </p>
        </div>

        {/* ══ MAIN ══ */}
        <div style={{ display:'grid', gridTemplateColumns: isMobile||isTablet?'1fr':'1.35fr 1fr', gap: isMobile?14:20 }}>

          {/* ── LEFT: bench ── */}
          <div style={{ ...card(), padding: isMobile?'18px 14px':'24px 28px', animation:'fadeInUp .6s ease-out' }}>
            {/* Section label + live status */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:secondaryColor, flexShrink:0 }}/>
              <span style={{ fontSize:11, fontWeight:700, color:secondaryColor, letterSpacing:'0.1em', textTransform:'uppercase' }}>Test Zone</span>
              {phase === 'pouring' && (
                <span style={{ marginLeft:4, fontSize:11, fontWeight:600, color:primaryColor }}>Pouring water…</span>
              )}
              {(phase==='result_ok'||phase==='result_fail') && item && (
                <span style={{ marginLeft:4, fontSize:11, fontWeight:700,
                  color: phase==='result_ok'?'#16a34a':'#dc2626', animation:'slideUp .3s ease-out' }}>
                  {phase==='result_ok' ? '✓ Water stays in!' : '✗ Water leaked through!'}
                </span>
              )}
            </div>

            {/* Stage */}
            <TestStage
              testingItem={item} phase={phase} water={water}
              hoverZone={hoverZone} isMobile={isMobile}
              zoneRef={zoneRef}
              onDragOver={onDO} onDragLeave={onDL} onDrop={onDrp}
              primaryColor={primaryColor} textMuted={textMuted}
            />

            {/* Reason card */}
            {(phase==='result_ok'||phase==='result_fail') && item && (
              <div style={{ borderRadius:16, padding:'13px 16px', marginTop:14, animation:'fadeInUp .38s ease-out',
                background: phase==='result_ok' ? 'linear-gradient(135deg,#F0FDF4,#DCFCE7)' : 'linear-gradient(135deg,#FFF1F2,#FFE4E6)',
                border:`1.5px solid ${phase==='result_ok'?'#86EFAC':'#FCA5A5'}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: phase==='result_ok'?'#22c55e':'#ef4444', color:'#fff' }}>
                    {phase==='result_ok' ? <Check size={17} strokeWidth={3}/> : <X size={17} strokeWidth={3}/>}
                  </div>
                  <div>
                    <p style={{ margin:0, fontWeight:700, fontSize: isMobile?13:14,
                      color: phase==='result_ok'?'#14532D':'#7F1D1D' }}>
                      {item.name} — {item.property}
                    </p>
                    <p style={{ margin:'3px 0 0', fontSize: isMobile?12:13, color:textMuted, lineHeight:1.55 }}>
                      {item.reason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tile tray */}
            <div style={{ marginTop:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:primaryColor }}/>
                <span style={{ fontSize:11, fontWeight:700, color:primaryColor, letterSpacing:'0.1em', textTransform:'uppercase' }}>
                  Material Tray
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: isMobile?8:10 }}>
                {materials.map((mat, i) => {
                  const isTested  = !!tested[mat.id];
                  const isDrag    = draggedId===mat.id || touchId===mat.id;
                  const isHovered = hoverTile===mat.id && !isTested;
                  return (
                    <div key={mat.id}
                      draggable={!isTested}
                      onClick={() => { if(!isTested && phase==='idle') runTest(mat); }}
                      onDragStart={e=>onDS(e,mat.id)} onDragEnd={onDE}
                      onTouchStart={e=>onTS(e,mat.id)} onTouchMove={onTM} onTouchEnd={onTE}
                      onMouseEnter={()=>setHoverTile(mat.id)} onMouseLeave={()=>setHoverTile(null)}
                      style={{
                        position:'relative', borderRadius:16, padding: isMobile?'10px 6px':'12px 8px',
                        background: isTested ? (darkMode?'rgba(255,255,255,0.03)':'#F8F9FF') : mat.color,
                        border:`2px solid ${isTested?(darkMode?'rgba(255,255,255,0.07)':'#E2E8F0'):mat.accentColor+'45'}`,
                        cursor: isTested?'not-allowed':'grab',
                        opacity: isDrag?0.35 : isTested?0.48 : 1,
                        transform: isHovered&&!isDrag ? 'translateY(-5px) scale(1.04)' : 'scale(1)',
                        boxShadow: isHovered ? `0 10px 22px ${mat.accentColor}28` : isTested?'none':`0 3px 10px ${mat.accentColor}16`,
                        transition:'all .2s cubic-bezier(.4,0,.2,1)',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                        userSelect:'none', WebkitUserSelect:'none', touchAction:'none',
                        animation: isTested?'none':`popIn .45s ease-out ${i*0.07}s both`,
                      }}>
                      {isTested && (
                        <div style={{ position:'absolute', top:-8, right:-8, width:22, height:22, borderRadius:'50%',
                          background: tested[mat.id].holdsWater?'#22c55e':'#ef4444',
                          display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
                          border:'2.5px solid #fff', boxShadow:'0 2px 8px rgba(0,0,0,.12)', animation:'popIn .3s ease-out' }}>
                          {tested[mat.id].holdsWater ? <Check size={11} strokeWidth={3}/> : <X size={11} strokeWidth={3}/>}
                        </div>
                      )}
                      <TileIcon shape={mat.shape} color={mat.color} accent={mat.accentColor} sz={isMobile?40:48}/>
                      <p style={{ margin:0, fontSize: isMobile?10:11, fontWeight:700,
                        color: isTested?textMuted:mat.accentColor, textAlign:'center', lineHeight:1.2 }}>
                        {mat.name}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p style={{ textAlign:'center', fontSize:11, color:textMuted, margin:'8px 0 0', fontStyle:'italic' }}>
                {isMobile ? 'Tap a tile to test it' : 'Drag tiles into the zone above · or click to test directly'}
              </p>
            </div>
          </div>

          {/* ── RIGHT: Results ── */}
          <div style={{ display:'flex', flexDirection:'column', gap: isMobile?12:16 }}>

            {/* Suitable */}
            <div style={{ ...card(), padding: isMobile?'16px':'20px', animation:'fadeInUp .65s ease-out' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'#DCFCE7', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Check size={17} color="#16a34a" strokeWidth={3}/>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#16a34a', letterSpacing:'0.1em', textTransform:'uppercase' }}>Suitable</div>
                  <div style={{ fontSize:13, fontWeight:700, color:textMain }}>Holds Water ({suitable.length})</div>
                </div>
              </div>
              {suitable.length===0
                ? <p style={{ margin:0, fontSize:12, color:textMuted, fontStyle:'italic', textAlign:'center', padding:'6px 0' }}>Test a material to see results…</p>
                : <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {suitable.map(m=>(
                      <div key={m.id} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:999,
                        background:'#F0FDF4', border:'1.5px solid #86EFAC', animation:'slideUp .35s ease-out' }}>
                        <TileIcon shape={m.shape} color={m.color} accent={m.accentColor} sz={20}/>
                        <span style={{ fontSize:11, fontWeight:600, color:'#14532D' }}>{m.name}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Unsuitable */}
            <div style={{ ...card(), padding: isMobile?'16px':'20px', animation:'fadeInUp .7s ease-out' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'#FEE2E2', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <X size={17} color="#dc2626" strokeWidth={3}/>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#dc2626', letterSpacing:'0.1em', textTransform:'uppercase' }}>Unsuitable</div>
                  <div style={{ fontSize:13, fontWeight:700, color:textMain }}>Leaks Water ({unsuitable.length})</div>
                </div>
              </div>
              {unsuitable.length===0
                ? <p style={{ margin:0, fontSize:12, color:textMuted, fontStyle:'italic', textAlign:'center', padding:'6px 0' }}>None failed yet…</p>
                : <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {unsuitable.map(m=>(
                      <div key={m.id} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:999,
                        background:'#FFF1F2', border:'1.5px solid #FCA5A5', animation:'slideUp .35s ease-out' }}>
                        <TileIcon shape={m.shape} color={m.color} accent={m.accentColor} sz={20}/>
                        <span style={{ fontSize:11, fontWeight:600, color:'#7F1D1D' }}>{m.name}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Latest finding */}
            {lastTested && !party && (
              <div style={{ ...card({ border:`1.5px solid ${lastTested.holdsWater?'#86EFAC':'#FCA5A5'}` }),
                padding: isMobile?'16px':'20px', animation:'fadeInUp .45s ease-out' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:textMuted, marginBottom:10 }}>Latest Finding</div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flexShrink:0 }}>
                    <svg viewBox="0 0 100 100" width={58} height={58}>
                      <ContainerSVG material={lastTested} water={lastTested.holdsWater?52:0} phase={lastTested.holdsWater?'result_ok':'result_fail'}/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ margin:0, fontWeight:700, fontSize: isMobile?13:14, color:textMain }}>{lastTested.name}</p>
                    <span style={{ display:'inline-block', marginTop:3, padding:'2px 9px', borderRadius:999, fontSize:10, fontWeight:700,
                      background: lastTested.holdsWater?'#DCFCE7':'#FEE2E2',
                      color: lastTested.holdsWater?'#166534':'#991B1B' }}>
                      {lastTested.property}
                    </span>
                    <p style={{ margin:'6px 0 0', fontSize: isMobile?11:12, color:textMuted, lineHeight:1.55 }}>{lastTested.reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Celebration */}
            {party && (
              <div style={{ borderRadius:24, padding: isMobile?'20px':'26px', overflow:'hidden', position:'relative',
                background:`linear-gradient(135deg,${primaryColor},#7C3AED 55%,${secondaryColor})`,
                boxShadow:`0 12px 40px ${primaryColor}45`, color:'#fff', animation:'popIn .55s ease-out' }}>
                {Array.from({length:16}).map((_,i)=>(
                  <div key={i} style={{ position:'absolute', top:-8, left:`${(i*6.2)%96}%`, width:8, height:8,
                    background:['#FDE68A','#A5F3FC','#FBCFE8','#BBF7D0','#FED7AA'][i%5],
                    borderRadius: i%2===0?'50%':'2px',
                    animation:`confetti ${1.8+i*0.1}s ease-in ${i*0.12}s infinite` }}/>
                ))}
                <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative', zIndex:2 }}>
                  <Award size={isMobile?34:44} color="#FDE68A"/>
                  <div>
                    <p style={{ margin:0, fontWeight:800, fontSize: isMobile?16:19 }}>{successMessage}</p>
                    <p style={{ margin:'4px 0 0', fontSize: isMobile?12:13, opacity:.92 }}>
                      🟢 {suitable.length} hold water · 🔴 {unsuitable.length} leak
                    </p>
                    <p style={{ margin:'6px 0 0', fontSize: isMobile?11:12, opacity:.88, lineHeight:1.55 }}>
                      Hard, non-absorbent materials make the best water containers!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile touch drag follower */}
      {touchId && touchMat && touchPos && (
        <div style={{ position:'fixed', left:touchPos.x, top:touchPos.y,
          transform:'translate(-50%,-50%)', pointerEvents:'none', zIndex:9999,
          opacity:.88, filter:'drop-shadow(0 8px 18px rgba(0,0,0,0.28))' }}>
          <svg viewBox="0 0 100 100" width={68} height={68}>
            <TileIcon shape={touchMat.shape} color={touchMat.color} accent={touchMat.accentColor} sz={68}/>
          </svg>
        </div>
      )}
    </div>
  );
};

export default TumblerMaterialLab;
// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════