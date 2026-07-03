import React, { useState, useEffect, useCallback } from 'react';

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
  emoji: string;
  stepNum: number;
  bins: Bin[];
}

interface SavedPass {
  key: PassKey;
  label: string;
  emoji: string;
  bins: Array<{ bin: Bin; tiles: Tile[] }>;
}

// ─────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────
const TILES: Tile[] = [
  { id: 'ball',    label: 'Ball',    emoji: '⚽', shape: 'round', colour: 'green',  material: 'plant'  },
  { id: 'crayon',  label: 'Crayon',  emoji: '🖍️', shape: 'long',  colour: 'red',    material: 'wood'   },
  { id: 'leaf',    label: 'Leaf',    emoji: '🍃', shape: 'flat',  colour: 'green',  material: 'plant'  },
  { id: 'coin',    label: 'Coin',    emoji: '🪙', shape: 'round', colour: 'brown',  material: 'metal'  },
  { id: 'button',  label: 'Button',  emoji: '🔘', shape: 'round', colour: 'brown',  material: 'metal'  },
  { id: 'pebble',  label: 'Pebble',  emoji: '🪨', shape: 'flat',  colour: 'brown',  material: 'metal'  },
  { id: 'feather', label: 'Feather', emoji: '🪶', shape: 'long',  colour: 'brown',  material: 'plant'  },
  { id: 'pencil',  label: 'Pencil',  emoji: '✏️', shape: 'long',  colour: 'red',    material: 'wood'   },
];

const PASSES: PassConfig[] = [
  {
    key: 'shape', label: 'Shape', emoji: '🔷', stepNum: 1,
    bins: [
      { id: 'round', label: 'Round',  emoji: '⭕', color: '#4A4DC9', light: '#EEEEFF' },
      { id: 'long',  label: 'Long',   emoji: '📏', color: '#FC9145', light: '#FFF3E4' },
      { id: 'flat',  label: 'Flat',   emoji: '🟦', color: '#533086', light: '#F3EEF9' },
    ],
  },
  {
    key: 'colour', label: 'Colour', emoji: '🎨', stepNum: 2,
    bins: [
      { id: 'red',   label: 'Red',   emoji: '🔴', color: '#E53E3E', light: '#FFF0F0' },
      { id: 'green', label: 'Green', emoji: '🟢', color: '#16A34A', light: '#F0FFF4' },
      { id: 'brown', label: 'Brown', emoji: '🟤', color: '#92400E', light: '#FEF3C7' },
    ],
  },
  {
    key: 'material', label: 'Material', emoji: '🧱', stepNum: 3,
    bins: [
      { id: 'wood',  label: 'Wood',  emoji: '🪵', color: '#A0522D', light: '#FDF6EE' },
      { id: 'metal', label: 'Metal', emoji: '⚙️', color: '#475569', light: '#F8FAFC' },
      { id: 'plant', label: 'Plant', emoji: '🌿', color: '#15803D', light: '#F0FFF4' },
    ],
  },
];

const STEP_ACCENTS = ['#4A4DC9', '#FC9145', '#533086'];

// ─────────────────────────────────────────────────────────────────
// STYLE INJECTION
// ─────────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('os-v2-styles')) return;
  const el = document.createElement('style');
  el.id = 'os-v2-styles';
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Baloo+2:wght@600;700;800&display=swap');

    @keyframes osSlideUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes osPopIn    { 0%{transform:scale(0.6) rotate(-4deg);opacity:0} 70%{transform:scale(1.08) rotate(1deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
    @keyframes osConfetti { 0%{transform:translateY(-6px) rotate(0deg);opacity:1} 100%{transform:translateY(60px) rotate(360deg);opacity:0} }
    @keyframes osBarGrow  { from{width:0!important} }
    @keyframes osPulse    { 0%,100%{box-shadow:0 0 0 0 rgba(74,77,201,0.25)} 50%{box-shadow:0 0 0 8px rgba(74,77,201,0)} }

    .os2-root, .os2-root * { box-sizing:border-box; }
    .os2-root { font-family:'Nunito',sans-serif; }

    .os2-slide  { animation: osSlideUp 0.4s ease-out; }
    .os2-pop    { animation: osPopIn   0.35s ease-out; }
    .os2-bar    { animation: osBarGrow 0.55s cubic-bezier(0.34,1.3,0.64,1); }

    /* tiles */
    .os2-tile         { cursor:grab; user-select:none; touch-action:none; }
    .os2-tile:active  { cursor:grabbing; transform:scale(0.96); }
    .os2-tile.done    { opacity:0.45; cursor:default; pointer-events:none; filter:grayscale(0.3); }

    /* bins */
    .os2-bin { transition:background 0.18s, border-color 0.18s, transform 0.14s; }
    .os2-bin.dragover { transform:scale(1.025); }

    /* step connector line */
    .os2-connector { width:2px; background:linear-gradient(to bottom,#C1C1EA,#EBEBEB); margin:0 auto; }

    /* pass pill */
    .os2-pill { transition:all 0.18s; cursor:pointer; }
    .os2-pill:hover { filter:brightness(1.05); transform:translateY(-1px); }

    /* scrollbar */
    .os2-scroll::-webkit-scrollbar { height:3px; }
    .os2-scroll::-webkit-scrollbar-thumb { background:#C1C1EA; border-radius:2px; }

    /* save button hover */
    .os2-savebtn:hover { transform:translateY(-2px) !important; box-shadow:0 8px 28px rgba(83,48,134,0.35) !important; }
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
// TILE CHIP  (compact for the stage)
// ─────────────────────────────────────────────────────────────────
const TileChip: React.FC<{
  tile: Tile;
  placed: boolean;
  onDragStart: (id: string) => void;
}> = ({ tile, placed, onDragStart }) => (
  <div
    className={`os2-tile${placed ? ' done' : ''}`}
    draggable={!placed}
    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(tile.id); }}
    title={tile.label}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 3,
      padding: '8px 4px', borderRadius: 12, minWidth: 0,
      background: placed ? '#F8F8F8' : 'white',
      border: `2px solid ${placed ? '#EBEBEB' : '#C1C1EA'}`,
      boxShadow: placed ? 'none' : '0 2px 10px rgba(83,48,134,0.09)',
      minHeight: 72,
      transition: 'all 0.15s',
    }}
  >
    <span style={{ fontSize: 24, lineHeight: 1 }}>{tile.emoji}</span>
    <span style={{
      fontSize: 9, fontWeight: 800, textAlign: 'center',
      color: placed ? '#CACACA' : '#533086',
      fontFamily: "'Nunito',sans-serif",
      lineHeight: 1.2,
    }}>
      {tile.label}
    </span>
    {placed && (
      <span style={{ fontSize: 8, color: '#22C55E', fontWeight: 900 }}>✓</span>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// BIN  (full responsive width)
// ─────────────────────────────────────────────────────────────────
const BinBox: React.FC<{
  bin: Bin;
  tiles: Tile[];
  onDrop: (binId: string) => void;
  locked: boolean;
}> = ({ bin, tiles, onDrop, locked }) => {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`os2-bin${over && !locked ? ' dragover' : ''}`}
      onDragOver={e => { if (!locked) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); if (!locked) onDrop(bin.id); }}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        border: `2px ${locked ? 'solid' : 'dashed'} ${over && !locked ? bin.color : locked ? bin.color + '55' : '#C1C1EA'}`,
        borderRadius: 14,
        background: over && !locked ? bin.light : locked ? bin.light + 'aa' : '#FAFAFA',
        padding: '10px',
        display: 'flex', flexDirection: 'column', gap: 6,
        minHeight: 120,
      }}
    >
      {/* Bin header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        paddingBottom: 7, borderBottom: `1.5px solid ${bin.color}22`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: `${bin.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0,
        }}>
          {bin.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 800,
            fontSize: 13, color: bin.color,
          }}>
            {bin.label}
          </div>
          <div style={{ fontSize: 9, color: '#CACACA', fontWeight: 700 }}>
            {tiles.length} item{tiles.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Dropped tiles as horizontal pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1, alignContent: 'flex-start' }}>
        {tiles.map(t => (
          <div
            key={t.id}
            className="os2-pop"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'white', borderRadius: 20,
              padding: '3px 9px 3px 5px',
              border: `1.5px solid ${bin.color}30`,
              boxShadow: `0 1px 5px ${bin.color}14`,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 15 }}>{t.emoji}</span>
            <span style={{
              fontSize: 10, fontWeight: 800,
              color: '#4E4E4E', fontFamily: "'Nunito',sans-serif",
            }}>
              {t.label}
            </span>
          </div>
        ))}
        {tiles.length === 0 && !over && (
          <span style={{
            fontSize: 10, color: '#CACACA', fontWeight: 600,
            fontFamily: "'Nunito',sans-serif", padding: '4px 0',
          }}>
            drop here →
          </span>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// STEP CARD  (one per pass — all visible, stacked vertically)
// ─────────────────────────────────────────────────────────────────
const StepCard: React.FC<{
  pass: PassConfig;
  passData: Record<string, string>;
  isDone: boolean;
  isActive: boolean;
  onDrop: (binId: string) => void;
  onSave: () => void;
  onActivate: () => void;
  showConfetti: boolean;
  dragId: string | null;
  onDragStart: (id: string) => void;
}> = ({ pass, passData, isDone, isActive, onDrop, onSave, onActivate, showConfetti, dragId, onDragStart }) => {
  const accent = STEP_ACCENTS[pass.stepNum - 1];

  // Which tiles placed in this pass
  const placedIds = new Set(
    Object.entries(passData)
      .filter(([, bid]) => pass.bins.some(b => b.id === bid))
      .map(([tid]) => tid)
  );
  const allPlaced = placedIds.size === TILES.length;

  // Bin → tiles map
  const binTiles: Record<string, Tile[]> = {};
  pass.bins.forEach(b => { binTiles[b.id] = []; });
  Object.entries(passData).forEach(([tid, bid]) => {
    if (binTiles[bid]) {
      const tile = TILES.find(t => t.id === tid);
      if (tile) binTiles[bid].push(tile);
    }
  });

  return (
    <div style={{
      borderRadius: 20,
      border: `2px solid ${isDone ? accent + '55' : isActive ? accent + '88' : '#EBEBEB'}`,
      background: isDone ? `${accent}06` : 'white',
      overflow: 'hidden',
      boxShadow: isActive ? `0 4px 24px ${accent}18` : '0 2px 12px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.25s, border-color 0.25s',
    }}>

      {/* Step header bar */}
      <div
        onClick={!isDone ? onActivate : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          background: isDone
            ? `linear-gradient(135deg, ${accent}18, ${accent}08)`
            : isActive
              ? `linear-gradient(135deg, ${accent}14, ${accent}06)`
              : '#FAFAFA',
          cursor: isDone ? 'default' : 'pointer',
          borderBottom: (isActive || isDone) ? `1.5px solid ${accent}20` : '1.5px solid #EBEBEB',
        }}
      >
        {/* Step number badge */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: isDone
            ? '#22C55E'
            : isActive
              ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
              : '#EBEBEB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isActive ? `0 2px 10px ${accent}40` : 'none',
          transition: 'background 0.2s',
        }}>
          {isDone
            ? <span style={{ fontSize: 16 }}>✓</span>
            : <span style={{
                fontFamily: "'Baloo 2',sans-serif", fontWeight: 800,
                fontSize: 15, color: isActive ? 'white' : '#CACACA',
              }}>
                {pass.stepNum}
              </span>
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 800,
            fontSize: 'clamp(13px,2.5vw,15px)',
            color: isDone ? '#22C55E' : isActive ? accent : '#CACACA',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{pass.emoji}</span>
            <span>Step {pass.stepNum}: Sort by {pass.label}</span>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: isDone ? '#22C55E' : isActive ? '#CACACA' : '#CACACA',
            marginTop: 1,
          }}>
            {isDone ? '8/8 sorted — pass saved ✓' : isActive ? `${placedIds.size}/8 objects placed` : 'Click to start this step'}
          </div>
        </div>

        {/* Status badge */}
        {isDone && (
          <span style={{
            fontSize: 11, fontWeight: 800, color: '#15803D',
            background: '#F0FFF4', border: '1.5px solid #22C55E',
            borderRadius: 20, padding: '3px 10px', flexShrink: 0,
          }}>
            Saved ✅
          </span>
        )}
        {isActive && !isDone && (
          <span style={{
            fontSize: 11, fontWeight: 800, color: 'white',
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            borderRadius: 20, padding: '3px 10px', flexShrink: 0,
          }}>
            Active
          </span>
        )}
      </div>

      {/* Expanded body — only for active step */}
      {isActive && !isDone && (
        <div style={{ padding: '16px 18px' }} className="os2-slide">

          {/* ── BINS ROW ── */}
          <div style={{
            fontSize: 11, fontWeight: 800, color: accent,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            fontFamily: "'Nunito',sans-serif", marginBottom: 10,
          }}>
            Drag tiles into the correct bin:
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10, marginBottom: 16,
          }}>
            {pass.bins.map(bin => (
              <BinBox
                key={bin.id}
                bin={bin}
                tiles={binTiles[bin.id] || []}
                onDrop={onDrop}
                locked={false}
              />
            ))}
          </div>

          {/* ── DIVIDER ── */}
          <div style={{ height: 1, background: '#EBEBEB', marginBottom: 16 }} />

          {/* ── TILE STAGE ── */}
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#533086',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            fontFamily: "'Nunito',sans-serif", marginBottom: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>🎯 Objects</span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0,
              color: allPlaced ? '#22C55E' : '#CACACA',
              textTransform: 'none',
            }}>
              {placedIds.size}/8 placed
            </span>
          </div>

          {/* progress bar */}
          <div style={{
            background: '#EBEBEB', borderRadius: 4, height: 4,
            marginBottom: 12, overflow: 'hidden',
          }}>
            <div
              className="os2-bar"
              style={{
                height: '100%',
                width: `${(placedIds.size / TILES.length) * 100}%`,
                background: `linear-gradient(90deg, ${accent}, #FC9145)`,
                borderRadius: 4,
                transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
          </div>

          {/* Tile grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
            gap: 8, marginBottom: 16,
          }}>
            {TILES.map(tile => (
              <TileChip
                key={tile.id}
                tile={tile}
                placed={placedIds.has(tile.id)}
                onDragStart={onDragStart}
              />
            ))}
          </div>

          {/* Save button — only when all placed */}
          {allPlaced && (
            <div className="os2-slide" style={{ position: 'relative' }}>
              {showConfetti && <Confetti />}
              <button
                className="os2-savebtn"
                onClick={onSave}
                style={{
                  width: '100%', padding: '13px 0',
                  borderRadius: 12, border: 'none',
                  background: `linear-gradient(135deg, #533086, ${accent} 55%, #FC9145)`,
                  color: 'white', cursor: 'pointer',
                  fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 15,
                  boxShadow: `0 4px 20px ${accent}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                💾 Save Pass {pass.stepNum} — By {pass.label}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Saved summary — collapsed view of completed pass */}
      {isDone && (
        <div style={{ padding: '12px 18px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}>
            {pass.bins.map(bin => (
              <div key={bin.id} style={{
                background: bin.light,
                borderRadius: 10, padding: '8px 10px',
                border: `1.5px solid ${bin.color}28`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  marginBottom: 5,
                }}>
                  <span style={{ fontSize: 12 }}>{bin.emoji}</span>
                  <span style={{
                    fontFamily: "'Baloo 2',sans-serif", fontWeight: 800,
                    fontSize: 11, color: bin.color,
                  }}>
                    {bin.label}
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 9, fontWeight: 800, color: 'white',
                    background: bin.color, borderRadius: 8, padding: '1px 5px',
                  }}>
                    {binTiles[bin.id]?.length ?? 0}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {(binTiles[bin.id] || []).map(t => (
                    <span key={t.id} title={t.label} style={{ fontSize: 15 }}>
                      {t.emoji}
                    </span>
                  ))}
                  {(binTiles[bin.id] || []).length === 0 && (
                    <span style={{ fontSize: 9, color: '#CACACA' }}>—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const ObjectSorter: React.FC = () => {
  const [activePass, setActivePass]   = useState<PassKey>('shape');
  const [passData, setPassData]       = useState<Record<PassKey, Record<string, string>>>({
    shape: {}, colour: {}, material: {},
  });
  const [dragId, setDragId]           = useState<string | null>(null);
  const [doneKeys, setDoneKeys]       = useState<Set<PassKey>>(new Set());
  const [showConfetti, setShowConfetti] = useState<PassKey | null>(null);
  const [mounted, setMounted]         = useState(false);

  useEffect(() => { injectStyles(); setTimeout(() => setMounted(true), 40); }, []);

  const handleDrop = useCallback((passKey: PassKey, binId: string) => {
    if (!dragId) return;
    const pass = PASSES.find(p => p.key === passKey)!;
    const tile = TILES.find(t => t.id === dragId);
    if (!tile) return;
    const correct = (tile as Record<string, string>)[passKey] === binId;
    if (!correct) { setDragId(null); return; }
    setPassData(prev => ({
      ...prev,
      [passKey]: { ...prev[passKey], [dragId]: binId },
    }));
    setDragId(null);
  }, [dragId]);

  const savePass = (passKey: PassKey) => {
    const pass = PASSES.find(p => p.key === passKey)!;
    const placedCount = Object.keys(passData[passKey]).length;
    if (placedCount < TILES.length || doneKeys.has(passKey)) return;

    setDoneKeys(prev => new Set([...prev, passKey]));
    setShowConfetti(passKey);
    setTimeout(() => setShowConfetti(null), 1400);

    // Auto-advance to next pass
    const idx = PASSES.findIndex(p => p.key === passKey);
    if (idx < PASSES.length - 1) {
      setTimeout(() => setActivePass(PASSES[idx + 1].key), 600);
    }
  };

  const resetAll = () => {
    setPassData({ shape: {}, colour: {}, material: {} });
    setDoneKeys(new Set());
    setActivePass('shape');
    setDragId(null);
    setShowConfetti(null);
  };

  const allThreeDone = doneKeys.size === 3;

  if (!mounted) return null;

  return (
    <div
      className="os2-root"
      style={{
        maxWidth: 720, width: '100%', margin: '0 auto',
        padding: 'clamp(8px, 2vw, 16px)',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg,#533086 0%,#4A4DC9 55%,#FC9145 100%)',
        borderRadius: 18, padding: '14px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(83,48,134,0.22)',
      }}>
        <div style={{
          position: 'absolute', top: -32, right: -32,
          width: 110, height: 110, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
        }} />
        <div style={{
          fontSize: 26, background: 'rgba(255,255,255,0.15)',
          borderRadius: '50%', width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          🗂️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 800,
            fontSize: 'clamp(13px,3.5vw,19px)', color: 'white', lineHeight: 1.15,
          }}>
            Object Sorter — Fig. 6.4
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 2 }}>
            Activity 6.2 · Sort the same 8 objects 3 different ways!
          </div>
        </div>
        <button
          onClick={resetAll}
          style={{
            marginLeft: 'auto', flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            borderRadius: 9, padding: '5px 12px',
            color: 'white', cursor: 'pointer',
            fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 12,
          }}
        >
          ↺ Reset
        </button>
      </div>

      {/* ── INSTRUCTIONS ── */}
      <div style={{
        background: 'rgba(74,77,201,0.06)',
        border: '1.5px solid #C1C1EA',
        borderRadius: 12, padding: '10px 14px',
        marginBottom: 20,
        fontSize: 12, color: '#4E4E4E', fontWeight: 600,
        fontFamily: "'Nunito',sans-serif", lineHeight: 1.6,
      }}>
        🏷️ <strong>How to play:</strong> Three steps — sort all 8 objects by <strong>shape</strong>, then <strong>colour</strong>, then <strong>material</strong>.
        Drag each tile into the correct bin. Wrong bins won't accept the tile.
        After each step is done, click Save to move to the next!
      </div>

      {/* ── STEP CARDS — stacked vertically with connector ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {PASSES.map((pass, idx) => (
          <React.Fragment key={pass.key}>
            <StepCard
              pass={pass}
              passData={passData[pass.key]}
              isDone={doneKeys.has(pass.key)}
              isActive={activePass === pass.key && !doneKeys.has(pass.key)}
              onDrop={(binId) => handleDrop(pass.key, binId)}
              onSave={() => savePass(pass.key)}
              onActivate={() => { if (!doneKeys.has(pass.key)) setActivePass(pass.key); }}
              showConfetti={showConfetti === pass.key}
              dragId={dragId}
              onDragStart={setDragId}
            />
            {/* Connector between steps */}
            {idx < PASSES.length - 1 && (
              <div style={{
                width: 2, height: 20, margin: '0 auto',
                background: doneKeys.has(pass.key)
                  ? `linear-gradient(to bottom, ${STEP_ACCENTS[idx]}, ${STEP_ACCENTS[idx + 1]}55)`
                  : '#EBEBEB',
                borderRadius: 2,
                transition: 'background 0.4s',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── ALL DONE BANNER ── */}
      {allThreeDone && (
        <div
          className="os2-slide"
          style={{
            marginTop: 20,
            background: 'linear-gradient(135deg,#533086,#4A4DC9 55%,#FC9145)',
            borderRadius: 18, padding: '18px 20px',
            boxShadow: '0 6px 28px rgba(83,48,134,0.28)',
          }}
        >
          <div style={{
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 800,
            color: 'white', fontSize: 'clamp(14px,3vw,18px)',
            marginBottom: 8,
          }}>
            🎉 All 3 Passes Complete!
          </div>
          <div style={{
            color: '#C1C1EA', fontSize: 12, fontWeight: 700, lineHeight: 1.7,
          }}>
            Look at the three saved boards above — the <strong style={{ color: '#FFF3E4' }}>same 8 objects</strong> formed{' '}
            <strong style={{ color: '#FC9145' }}>completely different groups</strong> each time, depending on which
            property you sorted by. This is what <strong style={{ color: 'white' }}>classification</strong> means:
            the same things can be grouped in many different ways!
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{
        textAlign: 'center', fontSize: 10, color: '#CACACA',
        fontWeight: 600, letterSpacing: '0.3px', marginTop: 16,
        fontFamily: "'Nunito',sans-serif",
      }}>
        Curiosity · Textbook of Science · Grade 6 · Chapter 6 — Materials Around Us
      </div>
    </div>
  );
};

export default ObjectSorter;