import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
interface MaterialConfig {
  name: string;
  emoji: string;
  colorFrom: string;
  colorTo: string;
  dropHeight: number;
}

interface BounceRecorderAdditionalProps {
  rows?: Array<{
    material: string;
    emoji?: string;
    dropHeight?: number;
  }>;
  dropHeightDefault?: number;
}

interface BounceRecorderProps {
  props?: {
    width?: number;
    darkMode?: boolean;
    additionalProps?: BounceRecorderAdditionalProps;
  };
}

// ─────────────────────────────────────────────────────────────────
// PALETTE  (cycles if more than 6 materials)
// ─────────────────────────────────────────────────────────────────
const PALETTE: Pick<MaterialConfig, 'emoji' | 'colorFrom' | 'colorTo'>[] = [
  { emoji: '🔴', colorFrom: '#FC9145', colorTo: '#E53E3E' },
  { emoji: '🟡', colorFrom: '#4A4DC9', colorTo: '#533086' },
  { emoji: '🟤', colorFrom: '#C1C1EA', colorTo: '#8B7BB5' },
  { emoji: '🟢', colorFrom: '#22C55E', colorTo: '#16A34A' },
  { emoji: '🔵', colorFrom: '#38BDF8', colorTo: '#0284C7' },
  { emoji: '⚪', colorFrom: '#A3A3A3', colorTo: '#525252' },
];

const DEFAULT_MATERIALS: MaterialConfig[] = [
  { name: 'Rubber',  emoji: '🔴', colorFrom: '#FC9145', colorTo: '#E53E3E', dropHeight: 100 },
  { name: 'Plastic', emoji: '🟡', colorFrom: '#4A4DC9', colorTo: '#533086', dropHeight: 100 },
  { name: 'Clay',    emoji: '🟤', colorFrom: '#C1C1EA', colorTo: '#8B7BB5', dropHeight: 100 },
];

// ─────────────────────────────────────────────────────────────────
// GLOBAL STYLE INJECTION  (runs once)
// ─────────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('br-global-styles')) return;
  const el = document.createElement('style');
  el.id = 'br-global-styles';
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Baloo+2:wght@600;700;800&display=swap');

    /* ── keyframes ── */
    @keyframes br-bounce {
      0%   { transform: translateY(0) scale(1); }
      35%  { transform: translateY(-12px) scale(0.93); }
      55%  { transform: translateY(0) scale(1.1); }
      75%  { transform: translateY(-6px) scale(0.97); }
      90%  { transform: translateY(0) scale(1.03); }
      100% { transform: translateY(0) scale(1); }
    }
    @keyframes br-popIn {
      0%   { transform: scale(0) rotate(-8deg); opacity: 0; }
      60%  { transform: scale(1.18) rotate(2deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes br-slideUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes br-barGrow {
      from { width: 0 !important; }
    }

    /* ── utility classes ── */
    .br-bounce-anim { animation: br-bounce 0.85s ease-out !important; }
    .br-pop-anim    { animation: br-popIn  0.4s  ease-out; }
    .br-slide-anim  { animation: br-slideUp 0.45s ease-out; }
    .br-bar-anim    { animation: br-barGrow 0.72s cubic-bezier(0.34,1.2,0.64,1); }

    /* ── number input: hide spinners ── */
    .br-number-input::-webkit-outer-spin-button,
    .br-number-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .br-number-input[type=number] { -moz-appearance: textfield; }

    /* ── focus ring ── */
    .br-focusable:focus {
      outline: none;
      border-color: #4A4DC9 !important;
      box-shadow: 0 0 0 3px rgba(74,77,201,0.15) !important;
    }

    /* ── box-sizing reset inside root ── */
    .br-root, .br-root * { box-sizing: border-box; }
  `;
  document.head.appendChild(el);
};

// ─────────────────────────────────────────────────────────────────
// BUILD MATERIAL LIST FROM additionalProps
// ─────────────────────────────────────────────────────────────────
const buildMaterials = (ap: BounceRecorderAdditionalProps): MaterialConfig[] => {
  if (!ap.rows || ap.rows.length === 0) {
    return DEFAULT_MATERIALS.map(m => ({
      ...m,
      dropHeight: ap.dropHeightDefault ?? m.dropHeight,
    }));
  }
  return ap.rows.map((r, i) => {
    const p = PALETTE[i % PALETTE.length];
    return {
      name:       r.material,
      emoji:      r.emoji     ?? p.emoji,
      colorFrom:  p.colorFrom,
      colorTo:    p.colorTo,
      dropHeight: r.dropHeight ?? ap.dropHeightDefault ?? 100,
    };
  });
};

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

/** Animated ball dot — bounces whenever animKey changes */
const BallDot: React.FC<{ mat: MaterialConfig; animKey: number }> = ({ mat, animKey }) => {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(animKey);

  useEffect(() => {
    if (animKey === prev.current || !ref.current) return;
    prev.current = animKey;
    ref.current.classList.remove('br-bounce-anim');
    void ref.current.offsetWidth; // reflow
    ref.current.classList.add('br-bounce-anim');
    const t = setTimeout(() => ref.current?.classList.remove('br-bounce-anim'), 900);
    return () => clearTimeout(t);
  }, [animKey]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${mat.colorFrom}, ${mat.colorTo})`,
        boxShadow: animKey > 0 ? `0 3px 12px ${mat.colorFrom}88` : 'none',
        transition: 'box-shadow 0.3s',
      }}
    />
  );
};

/** ✓ / ✗ / dashed-circle */
const TickIcon: React.FC<{ value: string }> = ({ value }) => {
  if (value === '') {
    return (
      <div
        aria-label="not yet filled"
        style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '2px dashed #CACACA', margin: 'auto',
        }}
      />
    );
  }
  const bouncy = parseFloat(value) > 5;
  return (
    <span
      className="br-pop-anim"
      role="img"
      aria-label={bouncy ? 'bouncy' : 'not bouncy'}
      style={{
        display: 'block', textAlign: 'center', margin: 'auto',
        fontSize: 20, fontWeight: 900, lineHeight: 1,
        color: bouncy ? '#22C55E' : '#EF4444',
      }}
    >
      {bouncy ? '✓' : '✗'}
    </span>
  );
};

/** One bar inside the chart */
const BarRow: React.FC<{
  mat: MaterialConfig;
  value: string;
  scale: number;
  animKey: number;
}> = ({ mat, value, scale, animKey }) => {
  const raw     = parseFloat(value);
  const hasVal  = value !== '';
  const pct     = hasVal ? Math.max((raw / scale) * 100, 2) : 0;
  const dropPct = Math.min((mat.dropHeight / scale) * 100, 99.5);
  const overDrop = hasVal && raw > mat.dropHeight;
  // label placement: inside bar if bar is wider than ~24 %
  const labelInside = pct > 24;

  return (
    <div style={{ marginBottom: 14 }}>

      {/* ── meta row ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '4px 8px',
        marginBottom: 6,
      }}>
        {/* left: emoji + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 16 }}>{mat.emoji}</span>
          <span style={{
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 800, fontSize: 13, color: '#4E4E4E',
          }}>
            {mat.name}
          </span>
        </div>

        {/* right: percentage hint + value pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasVal && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#CACACA',
              fontFamily: "'Nunito', sans-serif",
            }}>
              {Math.round((raw / mat.dropHeight) * 100)}% of drop
            </span>
          )}
          {overDrop && (
            <span style={{
              fontSize: 10, fontWeight: 800, color: '#EF4444',
              fontFamily: "'Nunito', sans-serif",
            }}>
              ⚠ exceeds drop
            </span>
          )}
          {/* animated value pill */}
          <span
            key={`pill-${animKey}`}
            className={hasVal ? 'br-pop-anim' : ''}
            style={{
              fontSize: 11, fontWeight: 800,
              padding: '2px 10px', borderRadius: 20,
              fontFamily: "'Nunito', sans-serif",
              background: hasVal
                ? `linear-gradient(135deg, ${mat.colorFrom}, ${mat.colorTo})`
                : '#F5F5F5',
              color: hasVal ? 'white' : '#CACACA',
              border: hasVal ? 'none' : '1.5px solid #C1C1EA',
              transition: 'background 0.3s, color 0.3s',
              whiteSpace: 'nowrap',
            }}
          >
            {hasVal ? `${raw} cm` : '—'}
          </span>
        </div>
      </div>

      {/* ── track ── */}
      <div style={{ position: 'relative', height: 32 }}>
        {/* background */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 10,
          background: '#EEEEFF',
          overflow: 'hidden',
        }}>
          {/* bar fill */}
          {hasVal && (
            <div
              key={`bar-${animKey}`}
              className="br-bar-anim"
              style={{
                position: 'absolute', top: 0, left: 0,
                height: '100%', borderRadius: 10,
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${mat.colorFrom}, ${mat.colorTo})`,
                zIndex: 2,
              }}
            >
              {labelInside && (
                <span style={{
                  position: 'absolute', right: 8,
                  top: '50%', transform: 'translateY(-50%)',
                  fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                  color: 'white',
                  fontFamily: "'Nunito', sans-serif",
                  textShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }}>
                  {raw}
                </span>
              )}
            </div>
          )}

          {/* outside label (when bar is short) */}
          {hasVal && !labelInside && (
            <span style={{
              position: 'absolute', zIndex: 4,
              left: `calc(${pct}% + 7px)`,
              top: '50%', transform: 'translateY(-50%)',
              fontSize: 11, fontWeight: 800,
              color: '#533086', whiteSpace: 'nowrap',
              fontFamily: "'Nunito', sans-serif",
            }}>
              {raw}
            </span>
          )}

          {/* placeholder */}
          {!hasVal && (
            <span style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', paddingLeft: 10,
              fontSize: 11, fontWeight: 600, color: '#CACACA',
              fontFamily: "'Nunito', sans-serif",
              pointerEvents: 'none',
            }}>
              enter value →
            </span>
          )}
        </div>

        {/* drop-height dashed marker — sits ABOVE overflow:hidden parent */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: 4, bottom: 4, zIndex: 5,
            left: `calc(${dropPct}% - 1px)`,
            width: 2, borderRadius: 2,
            background: 'repeating-linear-gradient(to bottom, #A0A0C8 0 4px, transparent 4px 8px)',
          }}
        />
      </div>
    </div>
  );
};

/** Horizontal axis below all bars */
const ChartAxis: React.FC<{ scale: number }> = ({ scale }) => {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * scale));
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 1, background: '#EBEBEB' }} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 4,
      }}>
        {ticks.map(t => (
          <span key={t} style={{
            fontSize: 9, fontWeight: 700, color: '#CACACA',
            fontFamily: "'Nunito', sans-serif",
          }}>
            {t}
          </span>
        ))}
      </div>
      <div style={{
        textAlign: 'center', marginTop: 2,
        fontSize: 9, fontWeight: 700, color: '#CACACA',
        fontFamily: "'Nunito', sans-serif",
      }}>
        Bounce height (cm)
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const BounceRecorder: React.FC<BounceRecorderProps> = ({ props: toolProps = {} }) => {
  const { additionalProps = {} } = toolProps;
  const materials = buildMaterials(additionalProps);

  const [values,        setValues]        = useState<string[]>(materials.map(() => ''));
  const [animKeys,      setAnimKeys]      = useState<number[]>(materials.map(() => 0));
  const [inference,     setInference]     = useState('');
  const [infSubmitted,  setInfSubmitted]  = useState(false);
  const [showInference, setShowInference] = useState(false);
  const [mounted,       setMounted]       = useState(false);

  useEffect(() => {
    injectStyles();
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (values.every(v => v !== '') && !showInference) {
      setTimeout(() => setShowInference(true), 150);
    }
  }, [values, showInference]);

  const updateValue = (i: number, raw: string) => {
    setValues(prev  => { const n = [...prev];      n[i] = raw;          return n; });
    setAnimKeys(prev => { const n = [...prev];     n[i] = prev[i] + 1;  return n; });
  };

  const reset = () => {
    setValues(materials.map(() => ''));
    setAnimKeys(materials.map(() => 0));
    setInference('');
    setInfSubmitted(false);
    setShowInference(false);
  };

  // Derived values
  const filled      = values.filter(v => v !== '').length;
  const allFilled   = filled === materials.length;
  const nums        = values.map(v => parseFloat(v) || 0);
  const maxEntered  = Math.max(...nums, 0);
  const DROP        = materials[0]?.dropHeight ?? 100;
  const scale       = Math.max(DROP, maxEntered);
  const bestIdx     = nums.reduce((bi, v, i) => v > nums[bi] ? i : bi, 0);

  // ── shared style tokens ──────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'white',
    borderRadius: 18,
    padding: '16px 18px',
    border: '1.5px solid #C1C1EA',
    boxShadow: '0 4px 20px rgba(83,48,134,0.08)',
  };

  const cardTitle: React.CSSProperties = {
    fontFamily: "'Baloo 2', sans-serif",
    fontWeight: 700, fontSize: 14,
    background: 'linear-gradient(135deg, #533086, #FC9145)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: 14,
    display: 'flex', alignItems: 'center', gap: 6,
  };

  const tableHeaderCell: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, color: '#533086',
    textTransform: 'uppercase', letterSpacing: '0.4px',
    fontFamily: "'Nunito', sans-serif",
  };

  // ── render ───────────────────────────────────────────────────────
  return (
    <div
      className="br-root"
      style={{
        fontFamily: "'Nunito', sans-serif",
        maxWidth: 900,
        width: '100%',
        margin: '0 auto',
        padding: 'clamp(8px, 2vw, 16px)',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
    >

      {/* ──────────── HEADER ──────────── */}
      <div
        className="br-slide-anim"
        style={{
          background: 'linear-gradient(135deg, #533086 0%, #4A4DC9 60%, #FC9145 100%)',
          borderRadius: 18, padding: '14px 18px',
          marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* decorative blob */}
        <div style={{
          position: 'absolute', top: -28, right: -28,
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
        }} />

        <div style={{
          fontSize: 26,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '50%', width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          🏀
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800,
            fontSize: 'clamp(13px, 3.5vw, 19px)',
            color: 'white', lineHeight: 1.15,
          }}>
            Table 6.2 — Bounce Recorder
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 2 }}>
            Activity 6.4 · Materials Around Us · Grade 6
          </div>
        </div>

        <button
          onClick={reset}
          aria-label="Reset all values"
          style={{
            marginLeft: 'auto', flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            borderRadius: 9, padding: '5px 12px',
            color: 'white', cursor: 'pointer',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 700, fontSize: 12,
          }}
        >
          ↺ Reset
        </button>
      </div>

      {/* ──────────── TWO-COLUMN GRID ──────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
        gap: 14,
        marginBottom: 14,
      }}>

        {/* ── TABLE CARD ── */}
        <div style={card}>
          <div style={cardTitle}>📋 Record Your Results</div>

          {/* column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '26px 1fr 82px 50px',
            gap: 6,
            paddingBottom: 8, marginBottom: 2,
            borderBottom: '2px solid #C1C1EA',
          }}>
            {['', 'Material', 'Bounce cm', 'Bouncy?'].map((h, i) => (
              <div key={i} style={tableHeaderCell}>{h}</div>
            ))}
          </div>

          {/* data rows */}
          {materials.map((mat, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '26px 1fr 82px 50px',
                gap: 6, alignItems: 'center',
                padding: '8px 0',
                borderBottom: i < materials.length - 1 ? '1px solid #EBEBEB' : 'none',
              }}
            >
              <BallDot mat={mat} animKey={animKeys[i]} />

              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#4E4E4E' }}>
                  {mat.name}
                </div>
                <div style={{ fontSize: 10, color: '#CACACA', fontWeight: 600 }}>
                  Drop: {mat.dropHeight} cm
                </div>
              </div>

              <input
                className="br-number-input br-focusable"
                type="number"
                min="0" max="999" step="1"
                placeholder="e.g. 65"
                value={values[i]}
                onChange={e => updateValue(i, e.target.value)}
                aria-label={`${mat.name} bounce height in centimetres`}
                style={{
                  width: '100%', padding: '7px 9px',
                  border: '2px solid #C1C1EA', borderRadius: 9,
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 14, fontWeight: 700, color: '#4E4E4E',
                  background: '#F5F5F5',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              />

              <TickIcon value={values[i]} />
            </div>
          ))}

          {/* progress */}
          <div style={{ marginTop: 14 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, fontWeight: 700, color: '#4E4E4E',
              fontFamily: "'Nunito', sans-serif",
              marginBottom: 4,
            }}>
              <span>Progress</span>
              <span>{filled}/{materials.length} filled</span>
            </div>
            <div style={{ background: '#EBEBEB', borderRadius: 6, height: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(filled / materials.length) * 100}%`,
                background: 'linear-gradient(90deg, #4A4DC9, #FC9145)',
                borderRadius: 6,
                transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </div>
          </div>
        </div>

        {/* ── CHART CARD ── */}
        <div style={card}>
          <div style={cardTitle}>📊 Live Bar Chart</div>

          {/* legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <div style={{
              width: 18, height: 2, flexShrink: 0,
              background: 'repeating-linear-gradient(to right, #A0A0C8 0 4px, transparent 4px 8px)',
            }} />
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#CACACA',
              fontFamily: "'Nunito', sans-serif",
            }}>
              Drop height ({DROP} cm)
            </span>
          </div>

          {/* bars */}
          <div role="img" aria-label={`Bar chart comparing bounce heights of ${materials.map(m => m.name).join(', ')}`}>
            {materials.map((mat, i) => (
              <BarRow
                key={i}
                mat={mat}
                value={values[i]}
                scale={scale}
                animKey={animKeys[i]}
              />
            ))}
          </div>

          <ChartAxis scale={scale} />

          {/* trophy — only when all filled */}
          {allFilled && (
            <div
              className="br-slide-anim"
              style={{
                marginTop: 14, padding: '10px 12px',
                background: 'linear-gradient(135deg, #FFF3E4, #C1C1EA)',
                borderRadius: 11, border: '1.5px solid #FC9145',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>🏆</span>
              <div>
                <div style={{
                  fontWeight: 800, fontSize: 12, color: '#533086',
                  fontFamily: "'Nunito', sans-serif",
                }}>
                  Highest bounce: {materials[bestIdx]?.name}
                </div>
                <div style={{
                  fontSize: 11, color: '#4E4E4E', fontWeight: 600,
                  fontFamily: "'Nunito', sans-serif",
                }}>
                  {values[bestIdx]} cm out of {materials[bestIdx]?.dropHeight} cm drop
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────────── INFERENCE SECTION ──────────── */}
      {showInference && (
        <div
          className="br-slide-anim"
          style={{
            background: 'linear-gradient(135deg, #F5F5F5, #FFF3E4)',
            border: '2px solid #FC9145',
            borderRadius: 18, padding: '16px 18px',
            marginBottom: 12,
          }}
        >
          <div style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800,
            fontSize: 'clamp(13px, 3vw, 16px)',
            color: '#533086', marginBottom: 8,
          }}>
            🏅 Write Your Inference
          </div>

          <div style={{
            fontSize: 12, color: '#4E4E4E', fontWeight: 600,
            lineHeight: 1.6, padding: '8px 10px',
            background: 'rgba(74,77,201,0.07)',
            borderRadius: 9, marginBottom: 12,
          }}>
            Which material is best for a ball used in sports? Why?
          </div>

          {!infSubmitted ? (
            <>
              <textarea
                className="br-focusable"
                value={inference}
                onChange={e => setInference(e.target.value)}
                placeholder="Based on my results, I think _____ is best for a sports ball because..."
                rows={3}
                aria-label="Write your inference here"
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '2px solid #C1C1EA', borderRadius: 10,
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 13, fontWeight: 600, color: '#4E4E4E',
                  background: '#F5F5F5', resize: 'vertical', minHeight: 72,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  display: 'block',
                }}
              />
              <button
                disabled={inference.trim().length <= 5}
                onClick={() => setInfSubmitted(true)}
                style={{
                  marginTop: 8, padding: '9px 22px',
                  background: inference.trim().length > 5
                    ? 'linear-gradient(135deg, #533086, #FC9145)'
                    : '#EBEBEB',
                  color: inference.trim().length > 5 ? 'white' : '#CACACA',
                  border: 'none', borderRadius: 11,
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 700, fontSize: 14,
                  cursor: inference.trim().length > 5 ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                Submit Inference ✈️
              </button>
            </>
          ) : (
            <div className="br-slide-anim">
              {/* Student answer */}
              <div style={{
                background: 'white', borderRadius: 11,
                padding: '10px 14px', border: '2px solid #22C55E',
                marginBottom: 10,
              }}>
                <div style={{
                  fontWeight: 800, color: '#22C55E',
                  fontSize: 12, marginBottom: 4,
                  fontFamily: "'Nunito', sans-serif",
                }}>
                  ✓ Great inference!
                </div>
                <div style={{
                  fontWeight: 700, color: '#4E4E4E',
                  fontSize: 13, lineHeight: 1.55, fontStyle: 'italic',
                  fontFamily: "'Nunito', sans-serif",
                }}>
                  "{inference}"
                </div>
              </div>

              {/* Auto-generated inferred rule */}
              <div style={{
                background: 'linear-gradient(135deg, #533086, #4A4DC9)',
                borderRadius: 11, padding: '12px 14px',
              }}>
                <div style={{
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 800,
                  color: 'white', fontSize: 12, marginBottom: 5,
                }}>
                  📌 Inferred Rule (Table 6.2 Final Row)
                </div>
                <div style={{
                  color: '#FFF3E4', fontSize: 12,
                  fontWeight: 700, lineHeight: 1.65,
                  fontFamily: "'Nunito', sans-serif",
                }}>
                  <span style={{ color: '#FC9145', fontWeight: 900 }}>
                    {materials[bestIdx]?.name}
                  </span>{' '}
                  bounced highest ({values[bestIdx]} cm), making it the best
                  choice for sports balls. A material with{' '}
                  <span style={{ color: '#C1C1EA' }}>high elasticity</span>{' '}
                  returns more energy on impact, producing a higher, more
                  consistent bounce.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────── FOOTER ──────────── */}
      <div style={{
        textAlign: 'center', fontSize: 10,
        color: '#CACACA', fontWeight: 600,
        letterSpacing: '0.3px',
        fontFamily: "'Nunito', sans-serif",
      }}>
        Curiosity · Textbook of Science · Grade 6 · Chapter 6 — Materials Around Us
      </div>
    </div>
  );
};

export default BounceRecorder;