import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type PassKey = 'shape' | 'colour' | 'material';

interface Tile {
  id: string;
  label: string;
  emoji: string;
  shape: string;
  colour: string;
  material: string;
}

interface Bin {
  id: string;
  label: string;
  emoji: string;
  color: string;
  light: string;
}

interface PassConfig {
  key: PassKey;
  label: string;
  question: string;
  emoji: string;
  stepNum: number;
  bins: Bin[];
  omit?: string[]; // tile ids excluded from this pass
}

// ─────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────
const TILES: Tile[] = [
  { id: 'apple',    label: 'Apple',      emoji: '🍎', shape: 'round', colour: 'red',   material: 'plant' },
  { id: 'straw',    label: 'Strawberry', emoji: '🍓', shape: 'round', colour: 'red',   material: 'plant' },
  { id: 'leaf',     label: 'Leaf',       emoji: '🍃', shape: 'flat',  colour: 'green', material: 'plant' },
  { id: 'cucumber', label: 'Cucumber',   emoji: '🥒', shape: 'long',  colour: 'green', material: 'plant' },
  { id: 'coin',     label: 'Coin',       emoji: '🪙', shape: 'round', colour: 'brown', material: 'metal' },
  { id: 'key',      label: 'Key',        emoji: '🗝️', shape: 'long',  colour: 'brown', material: 'metal' },
  { id: 'log',      label: 'Wooden log', emoji: '🪵', shape: 'long',  colour: 'brown', material: 'wood'  },
  { id: 'plank',    label: 'Wood block', emoji: '🟫', shape: 'flat',  colour: 'brown', material: 'wood'  },
];

const PASSES: PassConfig[] = [
  {
    key: 'shape', label: 'Shape', emoji: '🔷', stepNum: 1,
    question: 'What shape is each object?',
    bins: [
      { id: 'round', label: 'Round', emoji: '⭕', color: '#4A4DC9', light: '#EEEEFF' },
      { id: 'long',  label: 'Long',  emoji: '📏', color: '#FC9145', light: '#FFF3E4' },
      { id: 'flat',  label: 'Flat',  emoji: '🟦', color: '#533086', light: '#F3EEF9' },
    ],
  },
  {
    key: 'colour', label: 'Colour', emoji: '🎨', stepNum: 2,
    question: 'What colour is each object?',
    omit: ['key'], // key removed from the colour step
    bins: [
      { id: 'red',   label: 'Red',   emoji: '🔴', color: '#E53E3E', light: '#FFF0F0' },
      { id: 'green', label: 'Green', emoji: '🟢', color: '#16A34A', light: '#F0FFF4' },
      { id: 'brown', label: 'Brown', emoji: '🟤', color: '#92400E', light: '#FEF3C7' },
    ],
  },
  {
    key: 'material', label: 'Material', emoji: '🧱', stepNum: 3,
    question: 'What is each object made of?',
    bins: [
      { id: 'plant', label: 'Plant', emoji: '🌿', color: '#15803D', light: '#F0FFF4' },
      { id: 'metal', label: 'Metal', emoji: '⚙️', color: '#475569', light: '#F8FAFC' },
      { id: 'wood',  label: 'Wood',  emoji: '🪵', color: '#A0522D', light: '#FDF6EE' },
    ],
  },
];

const STEP_ACCENTS = ['#4A4DC9', '#FC9145', '#533086'];
const PASS_SEEDS: Record<PassKey, number> = { shape: 1, colour: 2, material: 3 };

// Tiles shown for a given pass (some passes omit certain objects)
const tilesForPass = (pass: PassConfig): Tile[] =>
  TILES.filter(t => !(pass.omit ?? []).includes(t.id));

// ─────────────────────────────────────────────────────────────────
// RESPONSIVE HOOK  (works from 320px up)
// ─────────────────────────────────────────────────────────────────
const useResponsive = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    h();
    return () => window.removeEventListener('resize', h);
  }, []);
  return { w, isXs: w < 380, isMobile: w < 576 };
};

// ─────────────────────────────────────────────────────────────────
// SEEDED SHUFFLE
// ─────────────────────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// STYLE INJECTION
// ─────────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('os-v4-styles')) return;
  const el = document.createElement('style');
  el.id = 'os-v4-styles';
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Baloo+2:wght@600;700;800&display=swap');

    @keyframes osSlideUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes osFade     { from{opacity:0} to{opacity:1} }
    @keyframes osPopIn    { 0%{transform:scale(0.6) rotate(-4deg);opacity:0} 70%{transform:scale(1.08) rotate(1deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
    @keyframes osConfetti { 0%{transform:translateY(-6px) rotate(0deg);opacity:1} 100%{transform:translateY(60px) rotate(360deg);opacity:0} }
    @keyframes osBarGrow  { from{width:0!important} }
    @keyframes osShake    { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
    @keyframes osPulse    { 0%,100%{box-shadow:0 0 0 0 rgba(252,145,69,0.45)} 50%{box-shadow:0 0 0 7px rgba(252,145,69,0)} }
    @keyframes osRing     { 0%,100%{box-shadow:0 0 0 0 rgba(83,48,134,0.5)} 50%{box-shadow:0 0 0 6px rgba(83,48,134,0)} }

    .os4-root, .os4-root * { box-sizing: border-box; }
    .os4-root { font-family: 'Nunito', sans-serif; max-width: 100%; -webkit-text-size-adjust: 100%; }

    .os4-slide  { animation: osSlideUp 0.4s ease-out; }
    .os4-fade   { animation: osFade 0.45s ease-out; }
    .os4-pop    { animation: osPopIn 0.35s ease-out; }
    .os4-bar    { animation: osBarGrow 0.55s cubic-bezier(0.34,1.3,0.64,1); }
    .os4-shake  { animation: osShake 0.3s ease-in-out; }

    /* touch-action:none lets a drag start on a tile without the page scrolling */
    .os4-tile          { cursor: grab; user-select: none; -webkit-user-select: none; touch-action: none; transition: transform 0.12s, box-shadow 0.15s, border-color 0.15s, opacity 0.15s; }
    .os4-tile:hover:not(.done):not(.dragging) { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(83,48,134,0.16); }
    .os4-tile.done     { opacity: 0.4; cursor: default; pointer-events: none; filter: grayscale(0.35); }
    .os4-tile.selected { cursor: pointer; transform: translateY(-3px) scale(1.05); animation: osRing 1.2s ease-in-out infinite; }
    .os4-tile.dragging { opacity: 0.35; cursor: grabbing; }

    .os4-bin { transition: background 0.18s, border-color 0.18s, transform 0.14s, outline 0.15s; }
    .os4-bin.dragover { transform: scale(1.04); }

    .os4-ghost { position: fixed; z-index: 9999; pointer-events: none; will-change: transform; }

    .os4-btn { touch-action: manipulation; }
    .os4-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 26px rgba(83,48,134,0.32) !important; }
    .os4-pulse { animation: osPulse 1.6s ease-in-out infinite; }

    /* Touch devices: no sticky hover-lift */
    @media (hover: none) {
      .os4-tile:hover:not(.done):not(.dragging) { transform: none; box-shadow: 0 2px 10px rgba(83,48,134,0.09); }
      .os4-tile.selected:hover { transform: translateY(-3px) scale(1.05); }
      .os4-btn:hover { transform: none !important; }
    }
  `;
  document.head.appendChild(el);
};

// ─────────────────────────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────────────────────────
const Confetti: React.FC = () => (
  <>
    {[
      { c: '#4A4DC9', x: 12, d: 0    },
      { c: '#FC9145', x: 35, d: 0.09 },
      { c: '#533086', x: 58, d: 0.05 },
      { c: '#22C55E', x: 78, d: 0.13 },
      { c: '#E53E3E', x: 90, d: 0.07 },
    ].map((p, i) => (
      <div key={i} style={{
        position: 'absolute', top: 0, left: `${p.x}%`,
        width: 8, height: 8, borderRadius: '50%',
        background: p.c, pointerEvents: 'none', zIndex: 30,
        animation: `osConfetti 1.2s ease-in ${p.d}s forwards`,
      }} />
    ))}
  </>
);

// ─────────────────────────────────────────────────────────────────
// BROWN COIN  (used for the coin in the Colour step, where it sits in
// the Brown bin — the 🪙 emoji is gold and can't be recoloured reliably)
// ─────────────────────────────────────────────────────────────────
const BrownCoin: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="brown coin"
    style={{ display: 'block', flexShrink: 0, pointerEvents: 'none', ...style }}>
    <circle cx="16" cy="16" r="15" fill="#9C6B33" stroke="#5E3F1E" strokeWidth="2" />
    <circle cx="16" cy="16" r="11" fill="none" stroke="#5E3F1E" strokeWidth="1.3" opacity="0.5" />
    <text x="16" y="21.5" textAnchor="middle" fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="13" fill="#4A2F12">₹</text>
  </svg>
);

// Render a tile's icon — brown coin SVG when it's the coin in a "brown" context, else the emoji
const TileGlyph: React.FC<{ tile: Tile; size: number; brownCoin?: boolean; style?: React.CSSProperties }> = ({ tile, size, brownCoin, style }) =>
  tile.id === 'coin' && brownCoin
    ? <BrownCoin size={size} style={style} />
    : <span style={{ fontSize: size, lineHeight: 1, pointerEvents: 'none', flexShrink: 0, ...style }}>{tile.emoji}</span>;

// ─────────────────────────────────────────────────────────────────
// STEPPER
// ─────────────────────────────────────────────────────────────────
const Stepper: React.FC<{
  current: PassKey;
  doneKeys: Set<PassKey>;
  isXs: boolean;
}> = ({ current, doneKeys, isXs }) => {
  const circle = isXs ? 32 : 38;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
      {PASSES.map((p, i) => {
        const done   = doneKeys.has(p.key);
        const active = current === p.key && !done;
        const accent = STEP_ACCENTS[i];
        return (
          <React.Fragment key={p.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '0 4px', minWidth: 0 }}>
              <div
                className={active ? 'os4-pulse' : ''}
                style={{
                  width: circle, height: circle, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#22C55E' : active ? `linear-gradient(135deg,${accent},${accent}cc)` : '#EBEBEB',
                  boxShadow: active ? `0 3px 12px ${accent}55` : 'none',
                  transition: 'all 0.25s',
                }}
              >
                {done
                  ? <span style={{ fontSize: isXs ? 15 : 18, color: 'white' }}>✓</span>
                  : <span style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: isXs ? 14 : 16, color: active ? 'white' : '#CACACA' }}>{p.stepNum}</span>}
              </div>
              <span style={{
                fontFamily: "'Baloo 2',sans-serif", fontWeight: 800,
                fontSize: 'clamp(10px,2.2vw,12px)',
                color: done ? '#22C55E' : active ? accent : '#CACACA', whiteSpace: 'nowrap',
              }}>
                {p.emoji} {p.label}
              </span>
            </div>
            {i < PASSES.length - 1 && (
              <div style={{
                flex: 1, height: 3, minWidth: 12, maxWidth: 60, borderRadius: 2, margin: '0 2px 18px',
                background: doneKeys.has(PASSES[i].key)
                  ? `linear-gradient(to right, ${STEP_ACCENTS[i]}, ${STEP_ACCENTS[i + 1]})`
                  : '#EBEBEB',
                transition: 'background 0.4s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// TILE CHIP  (pointer-driven: tap = select, drag = move — works on touch + mouse)
// ─────────────────────────────────────────────────────────────────
const TileChip: React.FC<{
  tile: Tile;
  placed: boolean;
  selected: boolean;
  dragging: boolean;
  accent: string;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onPointerMove: (e: React.PointerEvent, id: string) => void;
  onPointerUp: (e: React.PointerEvent, id: string) => void;
  onPointerCancel: (e: React.PointerEvent, id: string) => void;
  coinBrown: boolean;
}> = ({ tile, placed, selected, dragging, accent, coinBrown, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }) => (
  <div
    className={`os4-tile${placed ? ' done' : ''}${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}`}
    onPointerDown={e => { if (!placed) onPointerDown(e, tile.id); }}
    onPointerMove={e => { if (!placed) onPointerMove(e, tile.id); }}
    onPointerUp={e => { if (!placed) onPointerUp(e, tile.id); }}
    onPointerCancel={e => { if (!placed) onPointerCancel(e, tile.id); }}
    title={tile.label}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 3,
      padding: '9px 4px', borderRadius: 12, minWidth: 0,
      background: placed ? '#F8F8F8' : 'white',
      border: `2px solid ${selected ? accent : placed ? '#EBEBEB' : '#C1C1EA'}`,
      boxShadow: placed ? 'none' : '0 2px 10px rgba(83,48,134,0.09)',
      minHeight: 74,
    }}
  >
    <TileGlyph tile={tile} size={26} brownCoin={coinBrown} />
    <span style={{
      fontSize: 9, fontWeight: 800, textAlign: 'center', pointerEvents: 'none',
      color: placed ? '#CACACA' : '#533086', fontFamily: "'Nunito',sans-serif", lineHeight: 1.2,
    }}>
      {tile.label}
    </span>
    {placed && <span style={{ fontSize: 8, color: '#22C55E', fontWeight: 900, pointerEvents: 'none' }}>✓ sorted</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// BIN
// ─────────────────────────────────────────────────────────────────
const BinBox: React.FC<{
  bin: Bin;
  tiles: Tile[];
  armed: boolean;       // a tile is selected (tap) or being dragged
  over: boolean;        // pointer is currently over this bin during a drag
  selectable: boolean;  // tap-selection active → clickable to place
  onClick: (binId: string) => void;
  rejecting: boolean;
  isMobile: boolean;
  coinBrown: boolean;
}> = ({ bin, tiles, armed, over, selectable, onClick, rejecting, isMobile, coinBrown }) => (
  <div
    data-bin={bin.id}
    className={`os4-bin${over ? ' dragover' : ''}${rejecting ? ' os4-shake' : ''}`}
    onClick={() => onClick(bin.id)}
    style={{
      flex: '1 1 0', minWidth: 0,
      border: `2px ${armed ? 'solid' : 'dashed'} ${rejecting ? '#E53E3E' : over || armed ? bin.color : '#C1C1EA'}`,
      borderRadius: 14,
      background: over || armed ? bin.light : '#FAFAFA',
      padding: isMobile ? 7 : 10, display: 'flex', flexDirection: 'column', gap: 6,
      minHeight: isMobile ? 108 : 130,
      cursor: selectable ? 'pointer' : 'default',
      outline: selectable ? `3px solid ${bin.color}55` : 'none',
      outlineOffset: 2,
    }}
  >
    <div style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6,
      paddingBottom: 7, borderBottom: `1.5px solid ${bin.color}22`, flexShrink: 0, pointerEvents: 'none',
    }}>
      <div style={{
        width: isMobile ? 22 : 26, height: isMobile ? 22 : 26, borderRadius: '50%', background: `${bin.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 11 : 13, flexShrink: 0,
      }}>{bin.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: isMobile ? 12 : 13, color: bin.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bin.label}</div>
        <div style={{ fontSize: 9, color: '#CACACA', fontWeight: 700 }}>{tiles.length} item{tiles.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 4 : 5, flex: 1, alignContent: 'flex-start', pointerEvents: 'none' }}>
      {tiles.map(t => (
        isMobile ? (
          <span key={t.id} className="os4-pop" title={t.label} style={{ fontSize: 20, lineHeight: 1.1, display: 'inline-flex', alignItems: 'center' }}>
            {t.id === 'coin' && coinBrown ? <BrownCoin size={20} /> : t.emoji}
          </span>
        ) : (
          <div key={t.id} className="os4-pop" style={{
            display: 'flex', alignItems: 'center', gap: 5, maxWidth: '100%',
            background: 'white', borderRadius: 20, padding: '3px 9px 3px 5px',
            border: `1.5px solid ${bin.color}30`, boxShadow: `0 1px 5px ${bin.color}14`,
          }}>
            {t.id === 'coin' && coinBrown
              ? <BrownCoin size={17} />
              : <span style={{ fontSize: 15, flexShrink: 0 }}>{t.emoji}</span>}
            <span style={{ fontSize: 10, fontWeight: 800, color: '#4E4E4E', fontFamily: "'Nunito',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
          </div>
        )
      ))}
      {tiles.length === 0 && !over && (
        <span style={{ fontSize: 10, color: '#CACACA', fontWeight: 600, fontFamily: "'Nunito',sans-serif", padding: '4px 0' }}>
          {selectable ? 'tap to place' : 'drop here'}
        </span>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// DONE SUMMARY
// ─────────────────────────────────────────────────────────────────
const DoneSummary: React.FC<{ pass: PassConfig; passData: Record<string, string> }> = ({ pass, passData }) => {
  const accent = STEP_ACCENTS[pass.stepNum - 1];
  const binTiles: Record<string, Tile[]> = {};
  pass.bins.forEach(b => { binTiles[b.id] = []; });
  Object.entries(passData).forEach(([tid, bid]) => {
    if (binTiles[bid]) { const t = TILES.find(x => x.id === tid); if (t) binTiles[bid].push(t); }
  });
  return (
    <div className="os4-fade" style={{
      borderRadius: 16, border: `2px solid ${accent}40`, background: `${accent}06`,
      padding: '10px 14px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', background: '#22C55E',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><span style={{ fontSize: 13, color: 'white' }}>✓</span></div>
        <span style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 13, color: '#22C55E' }}>
          Step {pass.stepNum}: Sorted by {pass.label}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {pass.bins.map(bin => (
          <div key={bin.id} style={{ background: bin.light, borderRadius: 10, padding: '7px 9px', border: `1.5px solid ${bin.color}28`, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <span style={{ fontSize: 12 }}>{bin.emoji}</span>
              <span style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 11, color: bin.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bin.label}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {(binTiles[bin.id] || []).map(t => (
                t.id === 'coin' && pass.key === 'colour'
                  ? <BrownCoin key={t.id} size={17} />
                  : <span key={t.id} title={t.label} style={{ fontSize: 16 }}>{t.emoji}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// ACTIVE STEP
// ─────────────────────────────────────────────────────────────────
const ActiveStep: React.FC<{
  pass: PassConfig;
  passData: Record<string, string>;
  clickSelId: string | null;
  dragId: string | null;
  hoverBin: string | null;
  onBinClick: (binId: string) => void;
  onSave: () => void;
  onTilePointerDown: (e: React.PointerEvent, id: string) => void;
  onTilePointerMove: (e: React.PointerEvent, id: string) => void;
  onTilePointerUp: (e: React.PointerEvent, id: string) => void;
  onTilePointerCancel: (e: React.PointerEvent, id: string) => void;
  showConfetti: boolean;
  rejectBin: string | null;
  isMobile: boolean;
}> = ({ pass, passData, clickSelId, dragId, hoverBin, onBinClick, onSave,
        onTilePointerDown, onTilePointerMove, onTilePointerUp, onTilePointerCancel,
        showConfetti, rejectBin, isMobile }) => {
  const accent = STEP_ACCENTS[pass.stepNum - 1];
  const passTiles = tilesForPass(pass);
  const total = passTiles.length;
  const coinBrown = pass.key === 'colour';

  const placedIds = new Set(
    Object.entries(passData)
      .filter(([, bid]) => pass.bins.some(b => b.id === bid))
      .map(([tid]) => tid)
  );
  const allPlaced = placedIds.size === total;
  const hasSelection = !!clickSelId;
  const dragActive = !!dragId;

  const binTiles: Record<string, Tile[]> = {};
  pass.bins.forEach(b => { binTiles[b.id] = []; });
  Object.entries(passData).forEach(([tid, bid]) => {
    if (binTiles[bid]) { const t = TILES.find(x => x.id === tid); if (t) binTiles[bid].push(t); }
  });

  const order = shuffleSeeded(passTiles, PASS_SEEDS[pass.key]);
  const selTile = clickSelId ? TILES.find(t => t.id === clickSelId) : null;
  const pad = isMobile ? '12px 12px' : '16px 18px';

  return (
    <div className="os4-fade" style={{
      borderRadius: 20, border: `2px solid ${accent}88`, background: 'white',
      overflow: 'hidden', boxShadow: `0 6px 28px ${accent}1c`,
    }}>
      {/* Step header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 9 : 12, padding: isMobile ? '12px 12px' : '14px 18px',
        background: `linear-gradient(135deg, ${accent}14, ${accent}06)`,
        borderBottom: `1.5px solid ${accent}20`,
      }}>
        <div style={{
          width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 10px ${accent}40`,
        }}>
          <span style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: isMobile ? 15 : 17, color: 'white' }}>{pass.stepNum}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 'clamp(13px,3.4vw,17px)', color: accent, lineHeight: 1.15 }}>
            Step {pass.stepNum}: Sort by {pass.label} {pass.emoji}
          </div>
          <div style={{ fontSize: 'clamp(10px,2.6vw,11px)', fontWeight: 700, color: '#4E4E4E', marginTop: 1 }}>{pass.question}</div>
        </div>
        <div style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 14, color: allPlaced ? '#22C55E' : accent, flexShrink: 0 }}>
          {placedIds.size}/{total}
        </div>
      </div>

      <div style={{ padding: pad }}>
        {/* Progress bar */}
        <div style={{ background: '#EBEBEB', borderRadius: 4, height: 5, marginBottom: 16, overflow: 'hidden' }}>
          <div className="os4-bar" style={{
            height: '100%', width: `${(placedIds.size / total) * 100}%`,
            background: `linear-gradient(90deg, ${accent}, #FC9145)`, borderRadius: 4,
            transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        </div>

        {/* Hint bar */}
        {hasSelection && selTile ? (
          <div className="os4-fade" style={{
            fontSize: 11, fontWeight: 700, padding: '7px 11px', borderRadius: 9, marginBottom: 12,
            border: `1.5px solid ${accent}55`, background: `${accent}12`, color: accent,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{selTile.emoji}</span>
            <span><strong>{selTile.label}</strong> selected — now tap a bin to place it, or tap another object to swap</span>
          </div>
        ) : (
          <div style={{
            fontSize: 11, fontWeight: 700, padding: '7px 11px', borderRadius: 9, marginBottom: 12,
            border: '1.5px solid #C1C1EA', background: '#F3F0FA', color: '#7B6B9C',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ flexShrink: 0 }}>💡</span>
            <span><strong>Drag</strong> an object into a bin — or <strong>tap</strong> it, then <strong>tap a bin</strong> to place it</span>
          </div>
        )}

        {/* Bins */}
        <div style={{
          fontSize: 11, fontWeight: 800, color: accent, textTransform: 'uppercase',
          letterSpacing: '0.5px', fontFamily: "'Nunito',sans-serif", marginBottom: 10,
        }}>
          ① Put each object in the right {pass.label.toLowerCase()} bin
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 6 : 10, marginBottom: 18 }}>
          {pass.bins.map(bin => (
            <BinBox
              key={bin.id}
              bin={bin}
              tiles={binTiles[bin.id] || []}
              armed={hasSelection || dragActive}
              over={hoverBin === bin.id}
              selectable={hasSelection}
              onClick={onBinClick}
              rejecting={rejectBin === bin.id}
              isMobile={isMobile}
              coinBrown={coinBrown}
            />
          ))}
        </div>

        {/* Tiles */}
        <div style={{
          fontSize: 11, fontWeight: 800, color: '#533086', textTransform: 'uppercase',
          letterSpacing: '0.5px', fontFamily: "'Nunito',sans-serif", marginBottom: 10,
        }}>
          ② Objects to sort {allPlaced ? '✓ all sorted!' : `(${total - placedIds.size} left)`}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 62 : 72}px, 1fr))`,
          gap: 8, marginBottom: allPlaced ? 16 : 0,
        }}>
          {order.map(tile => (
            <TileChip
              key={tile.id}
              tile={tile}
              placed={placedIds.has(tile.id)}
              selected={clickSelId === tile.id}
              dragging={dragId === tile.id}
              accent={accent}
              coinBrown={coinBrown}
              onPointerDown={onTilePointerDown}
              onPointerMove={onTilePointerMove}
              onPointerUp={onTilePointerUp}
              onPointerCancel={onTilePointerCancel}
            />
          ))}
        </div>

        {/* Save button */}
        {allPlaced && (
          <div className="os4-slide" style={{ position: 'relative' }}>
            {showConfetti && <Confetti />}
            <button
              className="os4-btn"
              onClick={onSave}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                background: `linear-gradient(135deg, #533086, ${accent} 55%, #FC9145)`,
                color: 'white', cursor: 'pointer',
                fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 'clamp(13px,3.4vw,15px)',
                boxShadow: `0 4px 20px ${accent}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
            >
              {pass.stepNum < 3 ? `✓ Save & go to Step ${pass.stepNum + 1} →` : '✓ Finish — see the result!'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const ObjectSorter: React.FC = () => {
  const { isXs, isMobile }                = useResponsive();
  const [activePass, setActivePass]       = useState<PassKey>('shape');
  const [passData, setPassData]           = useState<Record<PassKey, Record<string, string>>>({
    shape: {}, colour: {}, material: {},
  });
  const [clickSelId, setClickSelId]       = useState<string | null>(null);
  const [doneKeys, setDoneKeys]           = useState<Set<PassKey>>(new Set());
  const [showConfetti, setShowConfetti]   = useState<PassKey | null>(null);
  const [rejectBin, setRejectBin]         = useState<string | null>(null);
  const [mounted, setMounted]             = useState(false);

  // Pointer-drag state (works on mouse, touch & pen)
  const [ghost, setGhost]                 = useState<{ id: string; x: number; y: number } | null>(null);
  const [hoverBin, setHoverBin]           = useState<string | null>(null);
  const dragRef                           = useRef<{ id: string; sx: number; sy: number; moved: boolean } | null>(null);

  const activePassRef = useRef(activePass);
  activePassRef.current = activePass;

  useEffect(() => { injectStyles(); setTimeout(() => setMounted(true), 40); }, []);

  // ── placement (shared by drag + tap)
  const tryPlace = useCallback((passKey: PassKey, binId: string, sourceId: string | null) => {
    if (!sourceId) return;
    const tile = TILES.find(t => t.id === sourceId);
    if (!tile) return;
    const tileValue = (tile as unknown as Record<string, string>)[passKey];
    if (tileValue !== binId) {
      setRejectBin(binId);
      setTimeout(() => setRejectBin(null), 340);
      setClickSelId(null);
      return;
    }
    setPassData(prev => ({ ...prev, [passKey]: { ...prev[passKey], [sourceId]: binId } }));
    setClickSelId(null);
  }, []);

  // ── tap path
  const handleTileTap = useCallback((id: string) => {
    setClickSelId(prev => (prev === id ? null : id));
  }, []);

  const handleBinClick = useCallback((binId: string) => {
    if (clickSelId) tryPlace(activePass, binId, clickSelId);
  }, [activePass, clickSelId, tryPlace]);

  // ── which bin (if any) sits under a screen point
  const binAtPoint = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const binEl = el?.closest('[data-bin]') as HTMLElement | null;
    return binEl ? binEl.getAttribute('data-bin') : null;
  };

  // ── pointer drag handlers
  const onTilePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, moved: false };
  }, []);

  const onTilePointerMove = useCallback((e: React.PointerEvent, id: string) => {
    const d = dragRef.current;
    if (!d || d.id !== id) return;
    if (!d.moved) {
      const dist = Math.hypot(e.clientX - d.sx, e.clientY - d.sy);
      if (dist < 6) return;        // not yet a drag — keep it a potential tap
      d.moved = true;
      setClickSelId(null);          // dragging clears any tap-selection
    }
    setGhost({ id, x: e.clientX, y: e.clientY });
    setHoverBin(binAtPoint(e.clientX, e.clientY));
  }, []);

  const onTilePointerUp = useCallback((e: React.PointerEvent, id: string) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.id !== id) { setGhost(null); setHoverBin(null); return; }
    if (d.moved) {
      const bin = binAtPoint(e.clientX, e.clientY);
      setGhost(null);
      setHoverBin(null);
      if (bin) tryPlace(activePassRef.current, bin, id);
    } else {
      // never moved → treat as a tap
      setGhost(null);
      setHoverBin(null);
      handleTileTap(id);
    }
  }, [tryPlace, handleTileTap]);

  const onTilePointerCancel = useCallback(() => {
    dragRef.current = null;
    setGhost(null);
    setHoverBin(null);
  }, []);

  const savePass = (passKey: PassKey) => {
    const cfg = PASSES.find(p => p.key === passKey)!;
    const need = tilesForPass(cfg).length;
    if (Object.keys(passData[passKey]).length < need || doneKeys.has(passKey)) return;
    setDoneKeys(prev => new Set([...prev, passKey]));
    setShowConfetti(passKey);
    setTimeout(() => setShowConfetti(null), 1400);
    const idx = PASSES.findIndex(p => p.key === passKey);
    if (idx < PASSES.length - 1) {
      setTimeout(() => setActivePass(PASSES[idx + 1].key), 650);
    }
  };

  const resetAll = () => {
    setPassData({ shape: {}, colour: {}, material: {} });
    setDoneKeys(new Set());
    setActivePass('shape');
    setClickSelId(null);
    setShowConfetti(null);
    setRejectBin(null);
    setGhost(null);
    setHoverBin(null);
    dragRef.current = null;
  };

  const allThreeDone = doneKeys.size === 3;
  const activeConfig = PASSES.find(p => p.key === activePass)!;
  const ghostTile = ghost ? TILES.find(t => t.id === ghost.id) : null;

  if (!mounted) return null;

  return (
    <div className="os4-root" style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: 'clamp(8px, 2vw, 16px)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#533086 0%,#4A4DC9 55%,#FC9145 100%)',
        borderRadius: 18, padding: isMobile ? '11px 13px' : '14px 18px', marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: isMobile ? 9 : 12,
        position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(83,48,134,0.22)',
      }}>
        <div style={{
          position: 'absolute', top: -32, right: -32, width: 110, height: 110, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
        }} />
        <div style={{
          fontSize: isMobile ? 22 : 26, background: 'rgba(255,255,255,0.15)', borderRadius: '50%',
          width: isMobile ? 38 : 44, height: isMobile ? 38 : 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>🗂️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 'clamp(13px,3.7vw,19px)', color: 'white', lineHeight: 1.15 }}>
            Object Sorter — Fig. 6.4
          </div>
          <div style={{ fontSize: 'clamp(10px,2.6vw,11px)', color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginTop: 2, lineHeight: 1.25 }}>
            Activity 6.2 · Sort everyday objects 3 different ways
          </div>
        </div>
        <button onClick={resetAll} aria-label="Reset" style={{
          flexShrink: 0, background: 'rgba(255,255,255,0.15)',
          border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 9,
          padding: isXs ? '6px 9px' : '5px 12px',
          color: 'white', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 12,
          touchAction: 'manipulation',
        }}>{isXs ? '↺' : '↺ Reset'}</button>
      </div>

      {/* Stepper */}
      <Stepper current={activePass} doneKeys={doneKeys} isXs={isXs} />

      {/* Done summaries (shown only when all done) */}
      {allThreeDone && PASSES.map(p => (
        <DoneSummary key={p.key} pass={p} passData={passData[p.key]} />
      ))}

      {/* Active step */}
      {!allThreeDone && (
        <ActiveStep
          pass={activeConfig}
          passData={passData[activePass]}
          clickSelId={clickSelId}
          dragId={ghost?.id ?? null}
          hoverBin={hoverBin}
          onBinClick={handleBinClick}
          onSave={() => savePass(activePass)}
          onTilePointerDown={onTilePointerDown}
          onTilePointerMove={onTilePointerMove}
          onTilePointerUp={onTilePointerUp}
          onTilePointerCancel={onTilePointerCancel}
          showConfetti={showConfetti === activePass}
          rejectBin={rejectBin}
          isMobile={isMobile}
        />
      )}

      {/* Final banner */}
      {allThreeDone && (
        <div className="os4-slide" style={{
          marginTop: 4,
          background: 'linear-gradient(135deg,#533086,#4A4DC9 55%,#FC9145)',
          borderRadius: 18, padding: isMobile ? '15px 16px' : '18px 20px', boxShadow: '0 6px 28px rgba(83,48,134,0.28)',
        }}>
          <div style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, color: 'white', fontSize: 'clamp(14px,3.4vw,18px)', marginBottom: 8 }}>
            🎉 All 3 steps complete!
          </div>
          <div style={{ color: '#E9E6F5', fontSize: 'clamp(11.5px,3vw,12.5px)', fontWeight: 700, lineHeight: 1.7 }}>
            Look at the three boards above — the <strong style={{ color: '#FFF3E4' }}>same objects</strong> formed{' '}
            <strong style={{ color: '#FC9145' }}>completely different groups</strong> each time, depending on the
            property you sorted by. That is what <strong style={{ color: 'white' }}>classification</strong> means:
            the same things can be grouped in many different ways!
          </div>
          <button onClick={resetAll} className="os4-btn" style={{
            marginTop: 14, padding: '11px 22px', borderRadius: 11, border: 'none',
            background: 'white', color: '#533086', cursor: 'pointer',
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 14,
            transition: 'transform 0.15s, box-shadow 0.15s', touchAction: 'manipulation',
          }}>↺ Try again</button>
        </div>
      )}

      {/* Footer */}
      <div style={{
        textAlign: 'center', fontSize: 10, color: '#CACACA', fontWeight: 600,
        letterSpacing: '0.3px', marginTop: 16, fontFamily: "'Nunito',sans-serif",
        padding: '0 8px', lineHeight: 1.4,
      }}>
        Curiosity · Textbook of Science · Grade 6 · Chapter 6 — Materials Around Us
      </div>

      {/* Drag ghost — follows the finger / cursor on every device */}
      {ghost && ghostTile && (
        <div className="os4-ghost" style={{
          left: ghost.x, top: ghost.y, transform: 'translate(-50%, -50%) scale(1.08) rotate(-3deg)',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '8px 10px', borderRadius: 12, background: 'white',
            border: '2px solid #533086', boxShadow: '0 10px 26px rgba(83,48,134,0.35)',
          }}>
            <span style={{ fontSize: 26, lineHeight: 1 }}>
              {ghostTile.id === 'coin' && activePass === 'colour' ? <BrownCoin size={26} /> : ghostTile.emoji}
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#533086', fontFamily: "'Nunito',sans-serif" }}>{ghostTile.label}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectSorter;