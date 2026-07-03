import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS — Singularity_tool_Design_1.pdf
// Primary: #4A4DC9 (blue), #FF7212 (orange)
// Gradient: #533086 → #FC9145
// Neutrals: #4E4E4E, #CACACA, #EBEBEB, #F5F5F5, #FFFFFF
// Accents: #C1C1EA (blue-light), #FFF3E4 (orange-light)
// Font: Poppins
// ─────────────────────────────────────────────────────────────────
const T = {
  blue:        '#4A4DC9',
  orange:      '#FF7212',
  gradFrom:    '#533086',
  gradTo:      '#FC9145',
  gray900:     '#4E4E4E',
  gray400:     '#CACACA',
  gray200:     '#EBEBEB',
  gray50:      '#F5F5F5',
  blueLight:   '#C1C1EA',
  orangeLight: '#FFF3E4',
  white:       '#FFFFFF',
  success:     '#22C55E',
  error:       '#EF4444',
  font:        "'Poppins', sans-serif",
};

// ─────────────────────────────────────────────────────────────────
// EASING HELPERS
// ─────────────────────────────────────────────────────────────────
const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ─────────────────────────────────────────────────────────────────
// BREAKPOINTS — fluid, live
// ─────────────────────────────────────────────────────────────────
const useBreakpoint = () => {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 900);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    fn();
    return () => window.removeEventListener('resize', fn);
  }, []);
  const isMobile  = w < 520;
  const isTablet  = w >= 520 && w < 800;
  const isDesktop = w >= 800;
  // Fluid compass size: clamp between 160px and 280px based on available width
  const compassSize = Math.min(280, Math.max(160, Math.round(w * 0.35)));
  // Map width: fills available space
  const mapWidth  = Math.min(480, Math.max(280, w - (isMobile ? 32 : 64)));
  const mapHeight = Math.round(mapWidth * (300 / 480));
  return { w, isMobile, isTablet, isDesktop, compassSize, mapWidth, mapHeight };
};

// ─────────────────────────────────────────────────────────────────
// CSS INJECTION — comprehensive responsive styles + media queries
// ─────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }

@keyframes cardIn {
  from { opacity: 0; transform: translateY(18px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pulseRing {
  0%   { box-shadow: 0 0 0 0 rgba(83,48,134,0.45); }
  70%  { box-shadow: 0 0 0 12px rgba(83,48,134,0); }
  100% { box-shadow: 0 0 0 0 rgba(83,48,134,0); }
}
@keyframes greenFlash {
  0%,100% { filter: drop-shadow(0 0 0px #22C55E); }
  50%     { filter: drop-shadow(0 0 14px #22C55E); }
}
@keyframes bgDrift {
  0%,100% { transform: translate(0,0); }
  33%     { transform: translate(20px,-15px); }
  66%     { transform: translate(-15px,10px); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes correctPop {
  0%   { transform: scale(0.8); opacity: 0; }
  65%  { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes mapPinDrop {
  0%   { transform: translateY(-18px); opacity: 0; }
  65%  { transform: translateY(3px); opacity: 1; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes feedbackIn {
  from { opacity: 0; transform: translateY(24px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Interactive elements ── */
.cet-btn-primary {
  transition: transform .22s ease, filter .22s ease, box-shadow .22s ease;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
}
.cet-btn-primary:hover:not(:disabled) { transform: translateY(-2px) scale(1.02); filter: brightness(1.07); }
.cet-btn-primary:active:not(:disabled) { transform: scale(0.97); }
.cet-btn-primary:disabled { cursor: not-allowed; }

.cet-btn-ghost {
  transition: background .18s ease, border-color .18s ease, transform .15s ease;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.cet-btn-ghost:hover:not(:disabled) { background: rgba(193,193,234,0.18) !important; }
.cet-btn-ghost:active:not(:disabled) { transform: scale(0.97); }

.cet-loc-row {
  transition: background .18s ease, border-color .18s ease, transform .18s ease;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.cet-loc-row:hover { transform: translateX(3px); }
.cet-loc-row:active { transform: scale(0.98); }

.cet-map-pin {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform .2s ease;
}
.cet-map-pin:hover { transform: scale(1.12); }
.cet-map-pin:active { transform: scale(0.95); }

/* ── Compass drag area ── */
.cet-compass-drag {
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  touch-action: none;
}

/* ── Responsive grid helpers ── */
.cet-row {
  display: flex;
  align-items: center;
  gap: 20px;
}
.cet-col { display: flex; flex-direction: column; gap: 12px; }

@media (max-width: 519px) {
  .cet-row { flex-direction: column; align-items: stretch; }
  .cet-row.cet-keep-row { flex-direction: row; }
  .cet-hide-mobile { display: none !important; }
}
@media (min-width: 520px) and (max-width: 799px) {
  .cet-row { flex-direction: column; align-items: center; }
  .cet-row.cet-tablet-row { flex-direction: row; align-items: flex-start; }
}
@media (min-width: 800px) {
  .cet-row { flex-direction: row; align-items: flex-start; }
}
`;

const injectStyles = () => {
  if (document.getElementById('cet-css')) return;
  const s = document.createElement('style');
  s.id = 'cet-css';
  s.textContent = STYLES;
  document.head.appendChild(s);
};

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5;
type Location = { id: string; name: string; emoji: string; x: number; y: number; color: string };

interface Props {
  props?: {
    additionalProps?: {
      title?: string;
      subtitle?: string;
      locations?: Location[];
    };
  };
}

const DEFAULT_LOCATIONS: Location[] = [
  { id: 'school',  name: 'School Playground', emoji: '🏫', x: 25, y: 30, color: '#4A4DC9' },
  { id: 'forest',  name: 'Forest Trail',       emoji: '🌲', x: 62, y: 48, color: '#22C55E' },
  { id: 'river',   name: 'River Bank',          emoji: '🏞️', x: 42, y: 72, color: '#06B6D4' },
];

const DIRECTION_LABELS = ['N','NE','E','SE','S','SW','W','NW'];

// ─────────────────────────────────────────────────────────────────
// COMPASS SVG — RAF-based needle animation, no CSS/transform conflicts
// ─────────────────────────────────────────────────────────────────
interface NeedlePersonality {
  amp: number;    // swing amplitude in degrees
  freq: number;   // oscillation frequency
  decay: number;  // decay rate (higher = faster damping)
}

interface CompassProps {
  dialRotation: number;
  isSettling: boolean;
  isAligned: boolean;
  startDialRot: number;
  personality: NeedlePersonality;
  size: number;
}

const CompassSVG: React.FC<CompassProps> = ({ dialRotation, isSettling, isAligned, startDialRot, personality, size }) => {
  const cx = size / 2;
  const cy = size / 2;
  const R  = size / 2 - 6;

  // needleRot: world-space rotation of needle tip (0 = pointing up = north).
  // Starts displaced based on startDialRot so the swing origin differs per location.
  const [needleRot, setNeedleRot] = useState(() => {
    // Initial needle displaced opposite to dial start so it visually needs to swing home
    const sign = startDialRot > 180 ? -1 : 1;
    return sign * Math.min(personality.amp * 1.2, 80);
  });
  const rafRef   = useRef<number>();
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!isSettling) {
      setNeedleRot(0);
      return;
    }

    const DURATION = 3200 + personality.freq * 20; // each location settles at slightly different pace
    const { amp, freq, decay } = personality;

    // Initial displacement — direction determined by which side dial N is on
    const sign = startDialRot > 180 ? -1 : 1;
    const startDisp = sign * Math.min(amp * 1.1, 85);

    startRef.current = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startRef.current) / DURATION, 1);

      // Decaying sinusoidal oscillation settling to 0
      // formula: displacement * (1-t)^1.4 * cos(freq*t) — gives natural pendulum feel
      const envelope   = Math.pow(1 - t, 1.4);
      const oscillation = Math.cos(freq * t * Math.PI);
      const current = startDisp * envelope * oscillation;

      setNeedleRot(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setNeedleRot(0);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isSettling, startDialRot, personality.amp, personality.freq]);

  const finalNeedleRot = needleRot;

  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const nH = R - 18;
  const sH = R - 18;
  const nW = 5.5;

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ userSelect: 'none', display: 'block' }}
    >
      <defs>
        <radialGradient id={`bezelG-${size}`} cx="38%" cy="32%">
          <stop offset="0%"   stopColor="#eaeaf4" />
          <stop offset="55%"  stopColor="#c8c8d8" />
          <stop offset="100%" stopColor="#9898b8" />
        </radialGradient>
        <radialGradient id={`faceG-${size}`} cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#fafafe" />
          <stop offset="100%" stopColor="#eeeef8" />
        </radialGradient>
        <radialGradient id={`glassG-${size}`} cx="33%" cy="28%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="rgba(200,210,255,0.05)" />
        </radialGradient>
        <linearGradient id={`needleN-${size}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#c00" />
          <stop offset="100%" stopColor="#ff4444" />
        </linearGradient>
        <linearGradient id={`needleS-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#bbb" />
          <stop offset="100%" stopColor="#888" />
        </linearGradient>
        <filter id={`nShadow-${size}`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="1.5" dy="2" stdDeviation="2.5" floodOpacity="0.28"/>
        </filter>
        <filter id={`gGlow-${size}`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#22C55E" floodOpacity="0.75"/>
        </filter>
        <clipPath id={`dialClip-${size}`}>
          <circle cx={cx} cy={cy} r={R - 9} />
        </clipPath>
      </defs>

      {/* ── ROTATING DIAL GROUP (bezel + ticks + labels) ── */}
      <g transform={`rotate(${dialRotation},${cx},${cy})`}>

        {/* Bezel */}
        <circle cx={cx} cy={cy} r={R}
          fill={`url(#bezelG-${size})`}
          stroke={isAligned ? T.success : '#a8a8c0'} strokeWidth={isAligned ? 2.5 : 1.5}
          style={{ transition: 'stroke 0.4s ease, filter 0.4s ease',
                   filter: isAligned ? 'drop-shadow(0 0 10px #22C55E66)' : 'none' }} />

        {/* Dial face */}
        <circle cx={cx} cy={cy} r={R - 9}
          fill={`url(#faceG-${size})`} stroke={T.gray200} strokeWidth="0.8" />

        {/* Tick marks — drawn in dial's rotated space so they rotate with box */}
        {ticks.map(deg => {
          const rad    = (deg - 90) * Math.PI / 180;
          const outerR = R - 9;
          const isMaj  = deg % 90 === 0;
          const isMed  = deg % 45 === 0 && !isMaj;
          const len    = isMaj ? 11 : isMed ? 8 : 4;
          return (
            <line key={deg}
              x1={cx + outerR * Math.cos(rad)}           y1={cy + outerR * Math.sin(rad)}
              x2={cx + (outerR - len) * Math.cos(rad)}   y2={cy + (outerR - len) * Math.sin(rad)}
              stroke={isMaj ? T.gray900 : isMed ? T.gray400 : T.gray200}
              strokeWidth={isMaj ? 2 : isMed ? 1.4 : 0.8}
            />
          );
        })}

        {/* Cardinal & intercardinal labels — inside the rotating group so they rotate with box */}
        {DIRECTION_LABELS.map((label, i) => {
          const deg  = i * 45;
          const rad  = (deg - 90) * Math.PI / 180;
          const lr   = R - 27;
          const isC  = i % 2 === 0;
          const isN  = label === 'N';
          return (
            <text key={label}
              x={cx + lr * Math.cos(rad)}
              y={cy + lr * Math.sin(rad)}
              textAnchor="middle" dominantBaseline="central"
              fontSize={isN ? 15 : isC ? 12 : 8}
              fontWeight={isC ? 800 : 500}
              fontFamily="Poppins, sans-serif"
              fill={isN
                ? (isAligned ? T.success : '#DC2626')
                : isC ? T.gray900 : T.gray400}
              style={{ transition: 'fill 0.4s ease' }}
            >
              {label}
            </text>
          );
        })}

        {/* Degree numbers */}
        {[30,60,120,150,210,240,300,330].map(deg => {
          const rad = (deg - 90) * Math.PI / 180;
          const nr  = R - 19;
          return (
            <text key={deg}
              x={cx + nr * Math.cos(rad)} y={cy + nr * Math.sin(rad)}
              textAnchor="middle" dominantBaseline="central"
              fontSize={5.5} fontFamily="Poppins, sans-serif" fill={T.gray400}>
              {deg}
            </text>
          );
        })}

        {/* Inner rose lines */}
        {[0,90,180,270].map(deg => {
          const rad = (deg - 90) * Math.PI / 180;
          const r1  = R - 46;
          return (
            <line key={deg} x1={cx} y1={cy}
              x2={cx + r1 * Math.cos(rad)} y2={cy + r1 * Math.sin(rad)}
              stroke={T.gray200 + '88'} strokeWidth="0.8"
            />
          );
        })}
      </g>

      {/* ── GLASS COVER (above dial, below needle) ── */}
      <circle cx={cx} cy={cy} r={R - 9} fill={`url(#glassG-${size})`} />

      {/* ── NEEDLE GROUP — NOT inside the rotating dial group ── */}
      {/* Needle drawn at origin (0,0) with north tip pointing UP (-Y).
          We only apply finalNeedleRot around the center point. */}
      <g transform={`rotate(${finalNeedleRot},${cx},${cy})`}
         filter={isAligned ? `url(#gGlow-${size})` : `url(#nShadow-${size})`}>
        {/* North (red) half — points toward top of SVG = geographic north */}
        <polygon
          points={`
            ${cx},${cy - nH}
            ${cx - nW},${cy}
            ${cx},${cy - nW * 0.7}
            ${cx + nW},${cy}
          `}
          fill={isAligned ? T.success : `url(#needleN-${size})`}
          style={{ transition: 'fill 0.5s ease' }}
        />
        {/* South (grey) half — points toward bottom */}
        <polygon
          points={`
            ${cx},${cy + sH}
            ${cx - nW},${cy}
            ${cx},${cy + nW * 0.7}
            ${cx + nW},${cy}
          `}
          fill={isAligned ? '#86efac' : `url(#needleS-${size})`}
          style={{ transition: 'fill 0.5s ease' }}
        />
        {/* Center pivot pin */}
        <circle cx={cx} cy={cy} r={6}
          fill={isAligned ? T.success : '#333'}
          stroke={T.white} strokeWidth="2"
          style={{ transition: 'fill 0.5s ease' }} />
        <circle cx={cx} cy={cy} r={2.8} fill={T.white} />
      </g>

      {/* ── ALIGNMENT RING ── */}
      {isAligned && (
        <circle cx={cx} cy={cy} r={R + 4}
          fill="none" stroke={T.success} strokeWidth="2.5"
          strokeDasharray="10 5" opacity="0.8"
          style={{ animation: 'greenFlash 1.5s ease-in-out 4' }} />
      )}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAP SVG — full illustrated top-down map with always-visible pins
// ─────────────────────────────────────────────────────────────────
const MapSVG: React.FC<{
  locations: Location[];
  activeLocation: string;
  completedLocations: string[];
  onSelect: (id: string) => void;
  width: number;
  height: number;
}> = ({ locations, activeLocation, completedLocations, onSelect, width, height }) => {
  // Fixed safe pin coordinates (% of 480×300 viewBox, avoiding edges)
  const PIN_POSITIONS: Record<string, [number, number]> = {
    school: [105, 90],
    forest: [300, 110],
    river:  [220, 220],
  };
  // Fallback for custom locations
  const getPinPos = (loc: Location): [number, number] =>
    PIN_POSITIONS[loc.id] ?? [
      20 + (loc.x / 100) * 440,
      20 + (loc.y / 100) * 260,
    ];

  return (
    <svg
      width={width} height={height}
      viewBox="0 0 480 300"
      style={{ borderRadius: 16, display: 'block' }}
    >
      <defs>
        <linearGradient id="mapBg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dff0fd" />
          <stop offset="100%" stopColor="#c8e6b8" />
        </linearGradient>
        <linearGradient id="riverGrad2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7ec8e3" />
          <stop offset="50%" stopColor="#5bb3d4" />
          <stop offset="100%" stopColor="#7ec8e3" />
        </linearGradient>
        <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c9956a" />
          <stop offset="100%" stopColor="#b07d52" />
        </linearGradient>
        <filter id="pinShadow2" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.22"/>
        </filter>
        <filter id="treeShadow2" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.2"/>
        </filter>
        <clipPath id="mapClip">
          <rect width="480" height="300" rx="12" />
        </clipPath>
      </defs>

      {/* Clip everything to the map boundary */}
      <g clipPath="url(#mapClip)">
        {/* Ground */}
        <rect width="480" height="300" fill="url(#mapBg2)" />

        {/* Terrain patches */}
        <ellipse cx="240" cy="200" rx="140" ry="70" fill="#a8e6a022" />
        <ellipse cx="340" cy="130" rx="100" ry="60" fill="#a8d88822" />
        <ellipse cx="80" cy="100" rx="75" ry="50" fill="#b8e8a822" />
        <ellipse cx="420" cy="230" rx="70" ry="45" fill="#90d88022" />

        {/* River — wide and clearly visible */}
        <path d="M -10 195 Q 80 175 160 188 Q 240 200 320 188 Q 400 176 490 192"
          fill="none" stroke="url(#riverGrad2)" strokeWidth="30" strokeLinecap="round" />
        {/* River highlight */}
        <path d="M -10 195 Q 80 175 160 188 Q 240 200 320 188 Q 400 176 490 192"
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="10" strokeLinecap="round" />
        {/* River shimmer lines */}
        <path d="M 40 190 Q 90 182 140 187" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M 200 190 Q 260 196 310 190" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M 360 184 Q 410 178 450 183" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>

        {/* Forest trees — grouped near forest location */}
        {[[285,95],[305,82],[320,100],[300,112],[318,82],[338,95]].map(([tx,ty],i) => (
          <g key={i} filter="url(#treeShadow2)">
            <circle cx={tx} cy={ty+4} r={12} fill="#1a7a3a" opacity="0.4" /> {/* shadow */}
            <circle cx={tx} cy={ty} r={12} fill="#2d9e4e" />
            <circle cx={tx-4} cy={ty+4} r={9} fill="#25894a" />
            <circle cx={tx+4} cy={ty+4} r={9} fill="#3ab85e" />
            <circle cx={tx} cy={ty-2} r={8} fill="#4cd472" />
          </g>
        ))}

        {/* School building */}
        <rect x="80" y="68" width="52" height="36" rx="4" fill="#b8d4f8" stroke="#5b96e8" strokeWidth="1.5" />
        <polygon points="78,68 106,48 134,68" fill="#e84040" />
        <rect x="98" y="82" width="10" height="22" rx="2" fill="#2044b8" /> {/* door */}
        <rect x="83" y="74" width="10" height="10" rx="1" fill="white" opacity="0.9" /> {/* windows */}
        <rect x="115" y="74" width="10" height="10" rx="1" fill="white" opacity="0.9" />
        <rect x="83" y="74" width="10" height="10" rx="1" fill="none" stroke="#5b96e8" strokeWidth="0.8" />
        <rect x="115" y="74" width="10" height="10" rx="1" fill="none" stroke="#5b96e8" strokeWidth="0.8" />
        {/* Flag */}
        <line x1="106" y1="48" x2="106" y2="38" stroke="#555" strokeWidth="1.2"/>
        <polygon points="106,38 118,42 106,46" fill="#e84040"/>

        {/* Dirt paths */}
        <path d="M 106 104 Q 140 140 175 180 Q 200 200 220 220"
          fill="none" stroke="#c9956a" strokeWidth="6" strokeLinecap="round" opacity="0.7"/>
        <path d="M 220 220 Q 260 228 300 115"
          fill="none" stroke="#c9956a" strokeWidth="6" strokeLinecap="round" opacity="0.6"/>

        {/* River bank label */}
        <text x="220" y="168" textAnchor="middle" fontSize="9" fontFamily="Poppins, sans-serif"
          fill="#3b80a8" fontWeight="600" opacity="0.8">River Bank</text>

        {/* Compass rose — top right, inside safe area */}
        <g transform="translate(440,28)">
          <circle r="20" fill="rgba(255,255,255,0.92)" stroke={T.gray200} strokeWidth="1.5"/>
          <line x1="0" y1="-14" x2="0" y2="-5" stroke="#e84040" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="0" y1="5"  x2="0" y2="14" stroke={T.gray400} strokeWidth="2" strokeLinecap="round"/>
          <line x1="-14" y1="0" x2="-5" y2="0" stroke={T.gray400} strokeWidth="2" strokeLinecap="round"/>
          <line x1="5"  y1="0" x2="14" y2="0" stroke={T.gray400} strokeWidth="2" strokeLinecap="round"/>
          <text x="0" y="-17" textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="Poppins, sans-serif" fill="#e84040">N</text>
          <text x="0"  y="23" textAnchor="middle" fontSize="8" fontFamily="Poppins, sans-serif" fill={T.gray400}>S</text>
          <text x="18" y="3"  textAnchor="middle" fontSize="8" fontFamily="Poppins, sans-serif" fill={T.gray400}>E</text>
          <text x="-18" y="3" textAnchor="middle" fontSize="8" fontFamily="Poppins, sans-serif" fill={T.gray400}>W</text>
        </g>
      </g>

      {/* Location pins — rendered OUTSIDE clipPath so they're never cut off */}
      {locations.map((loc, i) => {
        const [px, py] = getPinPos(loc);
        const isActive    = loc.id === activeLocation;
        const isCompleted = completedLocations.includes(loc.id);
        const r = isActive ? 18 : 14;

        return (
          <g key={loc.id}
            onClick={() => onSelect(loc.id)}
            style={{ cursor: 'pointer', animation: `mapPinDrop 0.45s cubic-bezier(0.175,0.885,0.32,1.275) ${i*0.12}s both` }}
          >
            {/* Drop shadow */}
            <ellipse cx={px} cy={py + r + 4} rx={r * 0.7} ry={4}
              fill="rgba(0,0,0,0.18)" />

            {/* Pin circle */}
            <circle cx={px} cy={py} r={r}
              fill={isCompleted ? T.success : isActive ? loc.color : T.white}
              stroke={isCompleted ? '#15803d' : isActive ? loc.color : T.gray400}
              strokeWidth={isActive ? 3 : 2}
              filter="url(#pinShadow2)"
              style={{ transition: 'all 0.3s ease' }}
            />

            {/* Emoji */}
            <text x={px} y={py + 1}
              textAnchor="middle" dominantBaseline="central"
              fontSize={isActive ? 14 : 11}
              style={{ userSelect: 'none' }}>
              {isCompleted ? '✅' : loc.emoji}
            </text>

            {/* Label bubble */}
            <rect
              x={px - 44} y={py - r - 22}
              width={88} height={18} rx={9}
              fill={isActive ? loc.color : 'rgba(255,255,255,0.92)'}
              stroke={isActive ? loc.color : T.gray200} strokeWidth="1"
            />
            <text
              x={px} y={py - r - 13}
              textAnchor="middle" dominantBaseline="central"
              fontSize="8.5" fontWeight="700" fontFamily="Poppins, sans-serif"
              fill={isActive ? '#fff' : T.gray900}>
              {loc.name}
            </text>

            {/* Active pulse ring */}
            {isActive && !isCompleted && (
              <circle cx={px} cy={py} r={r + 5}
                fill="none" stroke={loc.color} strokeWidth="2" opacity="0.4"
                style={{ animation: 'pulseRing 1.8s ease-in-out infinite' }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────────────────────────
const StepDots: React.FC<{ current: Step; total: number }> = ({ current, total }) => (
  <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
    {Array.from({ length: total }, (_, i) => {
      const s = (i + 1) as Step;
      const done = s < current;
      const active = s === current;
      return (
        <div key={s} style={{
          width: active ? 28 : done ? 10 : 8,
          height: active ? 8 : done ? 10 : 8,
          borderRadius: 20,
          background: active
            ? `linear-gradient(90deg, ${T.gradFrom}, ${T.gradTo})`
            : done ? T.success : T.gray200,
          transition: 'all 0.35s ease',
          boxShadow: active ? `0 2px 8px ${T.gradFrom}55` : 'none',
        }} />
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// PREDICTION BUTTON
// ─────────────────────────────────────────────────────────────────
const PredBtn: React.FC<{
  label: string; value: string; selected: boolean; correct: boolean | null;
  onClick: () => void; isMobile: boolean;
}> = ({ label, value, selected, correct, onClick, isMobile }) => {
  const isC = correct === true;
  const isW = correct === false;
  const border = isC ? T.success : isW ? T.error : selected ? T.blue : T.gray200;
  const bg     = isC ? 'rgba(34,197,94,0.09)' : isW ? 'rgba(239,68,68,0.07)' : selected ? `${T.blueLight}30` : T.white;
  const tc     = isC ? T.success : isW ? T.error : selected ? T.blue : T.gray900;

  return (
    <button
      className="cet-btn-ghost"
      onClick={onClick}
      disabled={correct !== null}
      style={{
        padding: isMobile ? '8px 10px' : '9px 14px',
        borderRadius: 10, border: `2px solid ${border}`, background: bg,
        color: tc, fontWeight: selected ? 700 : 500, fontSize: isMobile ? 12 : 13,
        fontFamily: T.font, cursor: correct !== null ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        flex: 1, justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
    >
      {isC ? '✅' : isW ? '❌' : ''}
      {label}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const CompassExplorerTool: React.FC<Props> = ({ props: tp = {} }) => {
  const ap = tp?.additionalProps ?? {};
  const toolTitle    = ap.title    ?? 'Compass Explorer';
  const toolSubtitle = ap.subtitle ?? 'Chapter 4 — Exploring Magnets';
  const locations: Location[] = ap.locations ?? DEFAULT_LOCATIONS;

  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  // ── State ──
  const [step, setStep] = useState<Step>(1);
  const [currentLocIdx, setCurrentLocIdx] = useState(0);
  const [completedLocs, setCompletedLocs] = useState<string[]>([]);
  const [dialRotation, setDialRotation]   = useState(0);
  const [isSettling, setIsSettling]       = useState(false);
  const [isAligned, setIsAligned]         = useState(false);
  const [isDragging, setIsDragging]       = useState(false);
  const [prediction, setPrediction]       = useState<string | null>(null);
  const [predCorrect, setPredCorrect]     = useState<boolean | null>(null);

  // Each location gets a FIXED, dramatically different starting dial rotation
  // so they all feel very different from each other
  const LOCATION_DIAL_STARTS = [
    142,   // School Playground — N is way to the left
    251,   // Forest Trail — N is at the bottom-right
    67,    // River Bank — N is at top-right
    188,   // 4th location fallback
    315,   // 5th location fallback
  ];
  const [startDialRots] = useState(() =>
    locations.map((_, i) => LOCATION_DIAL_STARTS[i] ?? (80 + i * 97))
  );

  // Per-location needle swing personality: [swingAmplitude, frequency, decayRate]
  const NEEDLE_PERSONALITIES = [
    { amp: 55, freq: 13, decay: 7 },   // School — wide slow swing
    { amp: 38, freq: 18, decay: 9 },   // Forest — fast tight oscillation
    { amp: 70, freq: 11, decay: 6 },   // River  — dramatic slow pendulum
    { amp: 45, freq: 15, decay: 8 },   // fallback
    { amp: 50, freq: 12, decay: 7 },   // fallback
  ];

  const compassRef      = useRef<HTMLDivElement>(null);
  const isDraggingRef   = useRef(false);
  const startAngleRef   = useRef(0);
  const startDialRef    = useRef(0);
  const liveDialRef     = useRef(0);          // tracks live value without React re-renders
  const rafIdRef        = useRef<number>(0);
  const lastCommitRef   = useRef(0);

  const currentLoc = locations[currentLocIdx];
  const ALIGN_THRESHOLD = 8;
  const normalizeAngle  = (a: number) => ((a % 360) + 360) % 360;

  const alignDiff = (rot: number) => {
    const d = normalizeAngle(rot);
    return Math.min(d, 360 - d);
  };

  // Check alignment whenever dialRotation state changes
  useEffect(() => {
    if (step !== 3 && step !== 4) return;
    const diff = alignDiff(dialRotation);
    const aligned = diff <= ALIGN_THRESHOLD;
    setIsAligned(aligned);
    if (aligned && !completedLocs.includes(currentLoc.id)) {
      setTimeout(() => {
        setCompletedLocs(prev =>
          prev.includes(currentLoc.id) ? prev : [...prev, currentLoc.id]
        );
      }, 800);
    }
  }, [dialRotation, step, currentLoc.id]);

  // Settling animation trigger on step 1
  useEffect(() => {
    if (step === 1) {
      const initial = startDialRots[currentLocIdx];
      liveDialRef.current = initial;
      setDialRotation(initial);
      setIsAligned(false);
      setIsSettling(true);
      const t = setTimeout(() => setIsSettling(false), 3400);
      return () => clearTimeout(t);
    }
  }, [step, currentLocIdx]);

  // Reset per location
  const resetForLocation = (idx: number) => {
    const initial = startDialRots[idx];
    liveDialRef.current = initial;
    setDialRotation(initial);
    setIsAligned(false);
    setIsSettling(false);
    setPrediction(null);
    setPredCorrect(null);
    setTimeout(() => setIsSettling(true), 60);
    setTimeout(() => setIsSettling(false), 3500);
  };

  // ── Geometry helper ──
  const getEventAngle = (clientX: number, clientY: number): number => {
    const el = compassRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  // ── RAF commit loop — runs only while dragging ──
  const startRAF = () => {
    const loop = (now: number) => {
      if (!isDraggingRef.current) return;
      // Throttle state commits to ~60fps
      if (now - lastCommitRef.current > 14) {
        lastCommitRef.current = now;
        setDialRotation(liveDialRef.current);
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
  };

  const stopRAF = () => {
    cancelAnimationFrame(rafIdRef.current);
    // Final commit
    setDialRotation(liveDialRef.current);
  };

  // ── Pointer events (mouse + stylus) ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (step !== 3 && step !== 4) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    startAngleRef.current = getEventAngle(e.clientX, e.clientY);
    startDialRef.current  = liveDialRef.current;
    setIsDragging(true);
    startRAF();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || (step !== 3 && step !== 4)) return;
    const angle = getEventAngle(e.clientX, e.clientY);
    liveDialRef.current = startDialRef.current + (angle - startAngleRef.current);
  };

  const onPointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    stopRAF();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (step !== 3 && step !== 4) return;
    const t = e.touches[0];
    isDraggingRef.current = true;
    startAngleRef.current = getEventAngle(t.clientX, t.clientY);
    startDialRef.current  = liveDialRef.current;
    setIsDragging(true);
    startRAF();
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || (step !== 3 && step !== 4)) return;
    e.preventDefault();
    const t = e.touches[0];
    const angle = getEventAngle(t.clientX, t.clientY);
    liveDialRef.current = startDialRef.current + (angle - startAngleRef.current);
  };

  const onTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    stopRAF();
  };

  // ── Prediction answers ──
  const PRED_OPTIONS = [
    { value: 'north', label: '↑ North' },
    { value: 'south', label: '↓ South' },
    { value: 'east',  label: '→ East' },
    { value: 'west',  label: '← West' },
  ];

  const handlePrediction = (val: string) => {
    setPrediction(val);
    setPredCorrect(val === 'north');
  };

  // ── Location select (step 4 — stays on step 4) ──
  const handleLocSelect = (id: string) => {
    const idx = locations.findIndex(l => l.id === id);
    if (idx === -1) return;
    setCurrentLocIdx(idx);
    const initial = startDialRots[idx];
    liveDialRef.current = initial;
    setDialRotation(initial);
    setIsAligned(completedLocs.includes(locations[idx].id));
    setIsSettling(true);
    setTimeout(() => setIsSettling(false), 3400);
  };

  // ── Next step logic ──
  const handleNext = () => {
    if (step === 1) { setStep(2); return; }
    if (step === 2) { if (predCorrect !== null) setStep(3); return; }
    if (step === 3) {
      if (!isAligned) return;
      if (completedLocs.length >= locations.length) { setStep(5); return; }
      const nextIdx = locations.findIndex(l => !completedLocs.includes(l.id));
      const idx = nextIdx >= 0 ? nextIdx : 0;
      setCurrentLocIdx(idx);
      const initial = startDialRots[idx];
      liveDialRef.current = initial;
      setDialRotation(initial);
      setIsAligned(false);
      setIsSettling(true);
      setTimeout(() => setIsSettling(false), 3400);
      setStep(4);
    }
  };

  // ── Fluid sizes from breakpoint hook ──
  const { compassSize, mapWidth, mapHeight } = useBreakpoint();

  useEffect(() => { injectStyles(); }, []);

  // ── Responsive helpers ──
  const P = (m: number, t: number, d: number) => isMobile ? m : isTablet ? t : d;
  const cardPad = P('14px 12px 18px', '20px 20px 24px', '24px 28px 30px');

  // Personality shortcut
  const personality = NEEDLE_PERSONALITIES[currentLocIdx] ?? NEEDLE_PERSONALITIES[0];

  // Location colours
  const locBg = [T.orangeLight, 'rgba(34,197,94,0.08)', 'rgba(6,182,212,0.08)'];
  const locBorder = ['rgba(255,114,18,0.25)', 'rgba(34,197,94,0.3)', 'rgba(6,182,212,0.3)'];
  const locStories = [
    'The compass was carelessly placed sideways on the playground! N points left — watch the needle swing home…',
    'Someone left the compass upside-down on the forest trail! The dial is flipped ~180° — big swing!',
    'The compass slipped off the river bank and spun ~70° — the needle still finds north!',
  ];

  return (
    <div style={{
      minHeight: '100vh', background: T.gray50,
      fontFamily: T.font,
      padding: P('10px 10px 24px', '14px 16px 28px', '20px 20px 32px'),
      boxSizing: 'border-box', position: 'relative', overflowX: 'hidden',
    }}>

      {/* Ambient blobs — pointer-none, fixed */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-15%', borderRadius: '50%',
        width: P(240, 380, 500), height: P(240, 380, 500),
        background: `radial-gradient(circle, ${T.blueLight}30 0%, transparent 70%)`,
        pointerEvents: 'none', animation: 'bgDrift 14s ease-in-out infinite', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', left: '-15%', borderRadius: '50%',
        width: P(200, 340, 440), height: P(200, 340, 440),
        background: `radial-gradient(circle, ${T.orangeLight} 0%, transparent 70%)`,
        pointerEvents: 'none', animation: 'bgDrift 18s ease-in-out infinite reverse', zIndex: 0,
      }} />

      <div style={{ maxWidth: 880, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign: 'center', marginBottom: P(12, 16, 22), animation: 'cardIn 0.4s ease-out both' }}>
          {/* Subtitle chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: P('3px 10px', '4px 13px', '5px 16px'), borderRadius: 20, marginBottom: 8,
            background: `${T.blueLight}55`, border: `1px solid ${T.blueLight}`,
          }}>
            <span style={{ fontSize: P(11,12,13) }}>🧭</span>
            <span style={{ fontSize: P(9,10,11), fontWeight: 600, color: T.blue, fontFamily: T.font, letterSpacing: 0.6 }}>
              {toolSubtitle}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: P(18, 24, 30), fontWeight: 900, fontFamily: T.font,
            lineHeight: 1.15, marginBottom: 10,
            background: `linear-gradient(135deg, ${T.gradFrom} 0%, ${T.blue} 50%, ${T.gradTo} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>{toolTitle}</h1>

          {/* Step dots */}
          <StepDots current={step} total={5} />
        </div>

        {/* ── MAIN CARD ── */}
        <div style={{
          background: T.white,
          borderRadius: P(14, 18, 22),
          border: `1.5px solid ${T.gray200}`,
          boxShadow: '0 4px 32px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          animation: 'cardIn 0.48s ease-out 0.08s both',
        }}>
          {/* Gradient strip */}
          <div style={{ height: 5, background: `linear-gradient(90deg, ${T.gradFrom}, ${T.gradTo})` }} />

          <div style={{ padding: cardPad }}>

            {/* ════════════════════════════════════
                STEP 1 — Watch the needle settle
            ════════════════════════════════════ */}
            {step === 1 && (
              <div style={{ animation: 'fadeIn 0.35s ease-out both' }}>
                <StepHeader step={1}
                  title="Watch the Needle Settle"
                  desc={`Compass placed at ${currentLoc.emoji} ${currentLoc.name}. Watch the needle swing and settle!`}
                  isMobile={isMobile} />

                {/* Compass + info — row on desktop, col on mobile */}
                <div className="cet-row" style={{ marginTop: P(16,18,22), gap: P(16,20,28), justifyContent: 'center' }}>
                  {/* Compass — always centered in col layout */}
                  <div ref={compassRef} style={{ cursor: 'default', flexShrink: 0, alignSelf: 'center' }}>
                    <CompassSVG
                      dialRotation={dialRotation} isSettling={isSettling}
                      isAligned={false} startDialRot={startDialRots[currentLocIdx]}
                      personality={personality} size={compassSize}
                    />
                  </div>

                  {/* Info card */}
                  <div style={{
                    flex: 1, minWidth: 0,
                    background: locBg[currentLocIdx] ?? T.orangeLight,
                    border: `1.5px solid ${locBorder[currentLocIdx] ?? 'rgba(255,114,18,0.25)'}`,
                    borderRadius: 14, padding: P('12px', '14px', '18px'),
                    width: '100%',
                  }}>
                    <p style={{ fontSize: P(13,13,14), fontWeight: 700, color: T.gray900, fontFamily: T.font, marginBottom: 6 }}>
                      {currentLoc.emoji} {currentLoc.name}
                    </p>
                    <p style={{ fontSize: P(11.5,12,12.5), color: T.gray900, fontFamily: T.font, lineHeight: 1.65, marginBottom: 10 }}>
                      {locStories[currentLocIdx] ?? locStories[0]}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['🔴 Red = North-seeking pole', '⬜ White = South-seeking pole'].map(tag => (
                        <span key={tag} style={{
                          fontSize: P(10.5,11,11.5), fontFamily: T.font, color: T.gray900,
                          background: 'rgba(255,255,255,0.75)', borderRadius: 8, padding: '3px 9px',
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <ActionBtn label={isSettling ? '⏳ Settling…' : 'Next: Make a Prediction →'}
                  disabled={isSettling} onClick={handleNext} isMobile={isMobile} />
              </div>
            )}

            {/* ════════════════════════════════════
                STEP 2 — Predict direction
            ════════════════════════════════════ */}
            {step === 2 && (
              <div style={{ animation: 'fadeIn 0.35s ease-out both' }}>
                <StepHeader step={2}
                  title="Make Your Prediction"
                  desc="The red tip of the needle is pointing toward…"
                  isMobile={isMobile} />

                <div className="cet-row" style={{ marginTop: P(16,18,22), gap: P(16,20,28), justifyContent: 'center' }}>
                  <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                    <CompassSVG
                      dialRotation={dialRotation} isSettling={false}
                      isAligned={false} startDialRot={startDialRots[currentLocIdx]}
                      personality={personality} size={compassSize}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <p style={{ fontSize: P(10.5,11,11.5), fontWeight: 600, color: T.gray400, fontFamily: T.font, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                      The red tip points…
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: P(7,8,9), marginBottom: 12 }}>
                      {PRED_OPTIONS.map(opt => (
                        <PredBtn key={opt.value} label={opt.label} value={opt.value}
                          selected={prediction === opt.value}
                          correct={prediction === opt.value ? predCorrect : null}
                          onClick={() => handlePrediction(opt.value)}
                          isMobile={isMobile} />
                      ))}
                    </div>
                    {predCorrect !== null && (
                      <div style={{
                        padding: P('10px 12px','11px 13px','12px 14px'), borderRadius: 12,
                        background: predCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.07)',
                        border: `1.5px solid ${predCorrect ? T.success : T.error}`,
                        animation: 'correctPop 0.45s ease-out both',
                      }}>
                        <p style={{ fontSize: P(11.5,12,12.5), color: T.gray900, fontFamily: T.font, lineHeight: 1.6 }}>
                          {predCorrect
                            ? '✅ Correct! The red end always points North — that\'s the North-seeking pole!'
                            : '❌ Not quite! The red end is the North-seeking pole — it always points North.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <ActionBtn
                  label={predCorrect !== null ? 'Next: Align the Compass →' : 'Select your prediction first'}
                  disabled={predCorrect === null} onClick={handleNext} isMobile={isMobile} />
              </div>
            )}

            {/* ════════════════════════════════════
                STEP 3 — Align the compass
            ════════════════════════════════════ */}
            {step === 3 && (
              <div style={{ animation: 'fadeIn 0.35s ease-out both' }}>
                <StepHeader step={3}
                  title="Align the Compass"
                  desc="Drag the compass box to rotate until N on the dial matches the red needle tip!"
                  isMobile={isMobile} />

                <div className="cet-row" style={{ marginTop: P(16,18,22), gap: P(16,20,28), justifyContent: 'center' }}>
                  {/* Draggable compass */}
                  <div ref={compassRef}
                    className="cet-compass-drag"
                    onPointerDown={onPointerDown} onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
                    onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab', flexShrink: 0, alignSelf: 'center' }}
                  >
                    <CompassSVG
                      dialRotation={dialRotation} isSettling={false}
                      isAligned={isAligned} startDialRot={startDialRots[currentLocIdx]}
                      personality={personality} size={compassSize}
                    />
                  </div>

                  {/* Guidance panel */}
                  <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                    {!isAligned ? (
                      <div style={{
                        background: `${T.blueLight}20`, border: `1.5px solid ${T.blueLight}`,
                        borderRadius: 14, padding: P('12px','14px','16px'),
                      }}>
                        <p style={{ fontSize: P(11.5,12,13), color: T.gray900, fontFamily: T.font, lineHeight: 1.65, marginBottom: 10 }}>
                          🔄 <strong>Drag</strong> the compass to rotate the box until{' '}
                          <strong style={{ color: T.blue }}>N</strong> lines up with the{' '}
                          <strong style={{ color: '#ef4444' }}>red needle</strong>.
                        </p>
                        {/* Alignment meter */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: P(10,10.5,11), color: T.gray400, fontFamily: T.font }}>Alignment</span>
                            <span style={{ fontSize: P(10,10.5,11), fontWeight: 700, color: T.blue, fontFamily: T.font }}>
                              {Math.round(alignDiff(dialRotation))}° off
                            </span>
                          </div>
                          <div style={{ height: P(7,7,8), borderRadius: 4, background: T.gray200, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 4,
                              background: `linear-gradient(90deg, ${T.gradFrom}, ${T.gradTo})`,
                              width: `${Math.max(0, 100 - (alignDiff(dialRotation) / 180) * 100)}%`,
                              transition: 'width 0.07s linear',
                            }} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(34,197,94,0.08)', border: `1.5px solid ${T.success}`,
                        borderRadius: 14, padding: P('12px','14px','16px'),
                        animation: 'correctPop 0.45s ease-out both',
                      }}>
                        <p style={{ fontSize: P(22,24,26), textAlign: 'center', marginBottom: 6 }}>🎉</p>
                        <p style={{ fontSize: P(11.5,12,13), color: T.gray900, fontFamily: T.font, lineHeight: 1.65, textAlign: 'center' }}>
                          <strong style={{ color: T.success }}>All directions lit up!</strong><br />
                          N, S, E, W are aligned at <strong>{currentLoc.name}</strong>.
                        </p>
                      </div>
                    )}

                    {/* Direction grid when aligned */}
                    {isAligned && (
                      <div style={{
                        marginTop: 10, display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr',
                        gap: P(6,7,8),
                        animation: 'slideUp 0.4s ease-out 0.25s both', opacity: 0,
                      }}>
                        {['↑ North','↓ South','→ East','← West'].map(d => (
                          <div key={d} style={{
                            padding: P('6px 8px','7px 9px','7px 10px'), borderRadius: 9,
                            background: 'rgba(34,197,94,0.1)', border: `1.5px solid ${T.success}`,
                            textAlign: 'center', fontSize: P(11,11.5,12), fontWeight: 700,
                            color: T.success, fontFamily: T.font,
                          }}>{d}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {isAligned && (
                  <ActionBtn
                    label={completedLocs.length >= locations.length
                      ? 'See Summary →'
                      : `Next Location (${completedLocs.length}/${locations.length} done) →`}
                    disabled={false} onClick={handleNext} isMobile={isMobile} />
                )}
              </div>
            )}

            {/* ════════════════════════════════════
                STEP 4 — Explore locations
            ════════════════════════════════════ */}
            {step === 4 && (
              <div style={{ animation: 'fadeIn 0.35s ease-out both' }}>
                <StepHeader step={4}
                  title="Explore Every Location"
                  desc="Tap each pin on the map — compass updates live. Align N at each spot!"
                  isMobile={isMobile} />

                {/* Map + right panel */}
                <div className="cet-row" style={{ marginTop: P(14,16,20), gap: P(14,16,20), alignItems: 'flex-start' }}>

                  {/* Map — full width on mobile, constrained on wider */}
                  <div style={{
                    borderRadius: 14, overflow: 'visible',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.11)',
                    border: `1.5px solid ${T.gray200}`,
                    background: T.white, flexShrink: 0,
                    width: '100%', maxWidth: mapWidth,
                    alignSelf: 'flex-start',
                  }}>
                    <MapSVG
                      locations={locations}
                      activeLocation={currentLoc.id}
                      completedLocations={completedLocs}
                      onSelect={handleLocSelect}
                      width={mapWidth}
                      height={mapHeight}
                    />
                  </div>

                  {/* Right column: location badge + mini compass + list */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: P(10,11,12), width: '100%' }}>

                    {/* Active location badge */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: P('9px 12px','10px 13px','10px 14px'), borderRadius: 12,
                      background: `${currentLoc.color}18`, border: `2px solid ${currentLoc.color}`,
                    }}>
                      <span style={{ fontSize: P(20,22,24), flexShrink: 0 }}>{currentLoc.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: P(12,13,13), fontWeight: 800, color: currentLoc.color, fontFamily: T.font }}>
                          {currentLoc.name}
                        </p>
                        <p style={{ fontSize: P(10,10.5,11), color: T.gray400, fontFamily: T.font }}>
                          {completedLocs.includes(currentLoc.id) ? '✅ Aligned!' : 'Drag to align N with needle'}
                        </p>
                      </div>
                      <span style={{ fontSize: P(11,11.5,12), fontWeight: 700, color: T.gray400, fontFamily: T.font, flexShrink: 0 }}>
                        {completedLocs.length}/{locations.length}
                      </span>
                    </div>

                    {/* Mini compass + meter — side by side */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: P(12,14,16) }}>
                      <div ref={compassRef}
                        className="cet-compass-drag"
                        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
                        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab', flexShrink: 0 }}
                      >
                        <CompassSVG
                          dialRotation={dialRotation} isSettling={isSettling}
                          isAligned={isAligned} startDialRot={startDialRots[currentLocIdx]}
                          personality={personality}
                          size={Math.min(compassSize, 170)}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {!isAligned ? (
                          <>
                            <p style={{ fontSize: P(11,11.5,12), color: T.gray900, fontFamily: T.font, lineHeight: 1.6, marginBottom: 8 }}>
                              🔄 <strong>Drag</strong> until <strong style={{ color: T.blue }}>N</strong> meets the <strong style={{ color: '#ef4444' }}>red needle</strong>.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: T.gray400, fontFamily: T.font }}>Alignment</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: T.blue, fontFamily: T.font }}>
                                {Math.round(alignDiff(dialRotation))}° off
                              </span>
                            </div>
                            <div style={{ height: 7, borderRadius: 4, background: T.gray200, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 4,
                                background: `linear-gradient(90deg, ${T.gradFrom}, ${T.gradTo})`,
                                width: `${Math.max(0, 100 - (alignDiff(dialRotation) / 180) * 100)}%`,
                                transition: 'width 0.07s linear',
                              }} />
                            </div>
                          </>
                        ) : (
                          <div style={{
                            padding: '10px 12px', borderRadius: 11,
                            background: 'rgba(34,197,94,0.08)', border: `1.5px solid ${T.success}`,
                            animation: 'correctPop 0.4s ease-out both', textAlign: 'center',
                          }}>
                            <p style={{ fontSize: P(20,22,24) }}>🎉</p>
                            <p style={{ fontSize: P(11,11.5,12), color: T.gray900, fontFamily: T.font, lineHeight: 1.5, marginTop: 4 }}>
                              <strong style={{ color: T.success }}>Aligned!</strong><br/>N points north here too!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: P(6,7,7) }}>
                      {locations.map(loc => {
                        const done   = completedLocs.includes(loc.id);
                        const active = loc.id === currentLoc.id;
                        return (
                          <div key={loc.id} className="cet-loc-row"
                            onClick={() => handleLocSelect(loc.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: P('8px 10px','8px 11px','9px 12px'), borderRadius: 10,
                              border: `2px solid ${active ? loc.color : done ? T.success : T.gray200}`,
                              background: done ? 'rgba(34,197,94,0.07)' : active ? `${loc.color}14` : T.white,
                            }}>
                            <span style={{ fontSize: P(15,16,17), flexShrink: 0 }}>{done ? '✅' : loc.emoji}</span>
                            <span style={{ fontSize: P(11.5,12,12.5), fontWeight: active ? 700 : 500, color: active ? loc.color : T.gray900, fontFamily: T.font, flex: 1, minWidth: 0 }}>
                              {loc.name}
                            </span>
                            <span style={{
                              fontSize: P(9.5,10,10.5), fontWeight: 700, fontFamily: T.font, flexShrink: 0,
                              color: done ? T.success : active ? loc.color : T.gray400,
                              padding: '2px 8px', borderRadius: 10,
                              background: done ? 'rgba(34,197,94,0.12)' : active ? `${loc.color}18` : T.gray50,
                            }}>
                              {done ? 'Done ✓' : active ? 'Now →' : 'Tap'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {completedLocs.length >= locations.length && (
                      <ActionBtn label="🏆 See Summary →" disabled={false} onClick={() => setStep(5)} isMobile={isMobile} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════
                STEP 5 — Summary
            ════════════════════════════════════ */}
            {step === 5 && (
              <div style={{ animation: 'feedbackIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
                <div style={{ textAlign: 'center', marginBottom: P(18,20,24) }}>
                  <div style={{ fontSize: P(40,44,48), marginBottom: 6 }}>🌟</div>
                  <h2 style={{
                    fontSize: P(18,22,26), fontWeight: 900, fontFamily: T.font,
                    background: `linear-gradient(135deg, ${T.gradFrom}, ${T.gradTo})`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    marginBottom: 6,
                  }}>The Compass Works Everywhere!</h2>
                  <p style={{ fontSize: P(11.5,12,13), color: T.gray400, fontFamily: T.font }}>
                    You completed all {locations.length} locations
                  </p>
                </div>

                {/* Key facts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: P(9,10,12), marginBottom: P(18,20,24) }}>
                  {[
                    { icon: '🧲', title: 'Earth is a Giant Magnet', body: 'Earth behaves like a giant magnet with magnetic poles near the geographic poles.' },
                    { icon: '🔴', title: 'North-Seeking Pole', body: 'The red end of the needle always aligns with Earth\'s magnetic north.' },
                    { icon: '📍', title: 'Works Everywhere', body: 'The needle always points north–south, no matter where you place the compass.' },
                    { icon: '🗺️', title: 'Finding Directions', body: 'Once N is aligned, you can read N, S, E, W from the dial.' },
                  ].map((fact, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: P(11,12,14),
                      padding: P('11px 13px','12px 14px','13px 15px'),
                      borderRadius: 13, background: T.gray50, border: `1.5px solid ${T.gray200}`,
                      animation: `slideUp 0.4s ease-out ${0.08 * i}s both`,
                    }}>
                      <span style={{ fontSize: P(19,20,22), flexShrink: 0 }}>{fact.icon}</span>
                      <div>
                        <p style={{ fontSize: P(12,12.5,13), fontWeight: 700, color: T.gray900, fontFamily: T.font, marginBottom: 2 }}>{fact.title}</p>
                        <p style={{ fontSize: P(11,11.5,12), color: T.gray400, fontFamily: T.font, lineHeight: 1.6 }}>{fact.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Locations explored */}
                <div style={{
                  background: T.orangeLight, border: `1.5px solid rgba(255,114,18,0.2)`,
                  borderRadius: 13, padding: P('12px 14px','14px 16px','14px 16px'), marginBottom: P(16,18,20),
                }}>
                  <p style={{ fontSize: P(12,12.5,13), fontWeight: 700, color: T.orange, fontFamily: T.font, marginBottom: 8 }}>
                    📍 Locations Explored
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {locations.map(loc => (
                      <div key={loc.id} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: P('4px 9px','5px 11px','5px 12px'), borderRadius: 20,
                        background: `${T.success}22`, border: `1.5px solid ${T.success}44`,
                      }}>
                        <span style={{ fontSize: P(12,13,14) }}>{loc.emoji}</span>
                        <span style={{ fontSize: P(10,11,11.5), fontWeight: 600, color: T.gray900, fontFamily: T.font }}>{loc.name}</span>
                        <span style={{ fontSize: 12 }}>✅</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Restart button */}
                <button className="cet-btn-primary"
                  onClick={() => {
                    setStep(1); setCurrentLocIdx(0); setCompletedLocs([]);
                    setPrediction(null); setPredCorrect(null); setIsAligned(false);
                    resetForLocation(0);
                  }}
                  style={{
                    width: '100%', height: P(44,46,48), borderRadius: 24, border: 'none',
                    background: `linear-gradient(135deg, ${T.gradFrom} 0%, ${T.blue} 55%, ${T.gradTo} 100%)`,
                    color: '#fff', fontWeight: 700, fontSize: P(13,14,15),
                    fontFamily: T.font,
                    boxShadow: `0 5px 22px ${T.gradFrom}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    animation: 'pulseRing 2.5s ease-in-out infinite',
                  }}>
                  <span style={{ fontSize: P(16,17,18) }}>🔄</span>
                  Explore Again
                </button>
              </div>
            )}

          </div>{/* end card padding */}
        </div>{/* end card */}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: P(14,16,18), paddingBottom: 4 }}>
          <p style={{ fontSize: P(9.5,10,10.5), color: T.gray400, fontFamily: T.font }}>
            NCERT Curiosity · Textbook of Science · Grade 6 · Chapter 4
          </p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────
const StepHeader: React.FC<{ step: number; title: string; desc: string; isMobile: boolean }> = ({ step, title, desc, isMobile }) => (
  <div style={{ marginBottom: isMobile ? 4 : 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 9 : 11, marginBottom: isMobile ? 6 : 8 }}>
      <div style={{
        width: isMobile ? 28 : 32, height: isMobile ? 28 : 32,
        borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg, ${T.gradFrom}, ${T.blue})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: isMobile ? 13 : 14, fontFamily: T.font,
        boxShadow: `0 4px 12px ${T.gradFrom}40`,
      }}>{step}</div>
      <h2 style={{
        fontSize: isMobile ? 15 : 18, fontWeight: 800, color: T.gray900,
        fontFamily: T.font, lineHeight: 1.2, minWidth: 0,
      }}>
        {title}
      </h2>
    </div>
    <p style={{
      fontSize: isMobile ? 12 : 13, color: T.gray400, fontFamily: T.font,
      lineHeight: 1.6, paddingLeft: isMobile ? 37 : 43,
    }}>
      {desc}
    </p>
  </div>
);

const ActionBtn: React.FC<{ label: string; disabled: boolean; onClick: () => void; isMobile: boolean }> = ({ label, disabled, onClick, isMobile }) => (
  <div style={{ marginTop: isMobile ? 16 : 20, display: 'flex', justifyContent: 'center' }}>
    <button
      className="cet-btn-primary"
      disabled={disabled}
      onClick={onClick}
      style={{
        height: isMobile ? 44 : 48,
        padding: isMobile ? '0 20px' : '0 36px',
        borderRadius: 24, border: 'none',
        background: disabled
          ? T.gray200
          : `linear-gradient(135deg, ${T.gradFrom} 0%, ${T.blue} 50%, ${T.gradTo} 100%)`,
        color: disabled ? T.gray400 : '#fff',
        fontWeight: 700, fontSize: isMobile ? 12.5 : 14, fontFamily: T.font,
        animation: !disabled ? 'pulseRing 2.2s ease-in-out infinite' : 'none',
        boxShadow: !disabled ? `0 5px 22px ${T.gradFrom}40` : 'none',
        display: 'flex', alignItems: 'center', gap: 7,
        width: isMobile ? '100%' : 'auto',
        justifyContent: 'center',
      }}
    >{label}</button>
  </div>
);

export default CompassExplorerTool;