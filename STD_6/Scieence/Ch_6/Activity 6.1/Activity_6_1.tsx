import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, CheckCircle, Plus, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ObjectTile {
  id: string;
  label: string;
  emoji: string;
  suggestedMaterials: string[];
}

interface TableRow {
  tileId: string | null;
  materials: string[];
  inputValue: string;
}

interface ActivityProps {
  props?: {
    additionalProps?: {
      tiles?: ObjectTile[];
      title?: string;
      tableTitle?: string;
    };
  };
}

// ─── Default Data ─────────────────────────────────────────────────────────────
const DEFAULT_TILES: ObjectTile[] = [
  { id: 'water_bottle',    label: 'Water Bottle',      emoji: '🍼', suggestedMaterials: ['plastic', 'metal'] },
  { id: 'eraser',          label: 'Eraser',             emoji: '🧹', suggestedMaterials: ['rubber'] },
  { id: 'schoolbag',       label: 'School Bag',         emoji: '🎒', suggestedMaterials: ['cloth', 'metal'] },
  { id: 'matka',           label: 'Matka (Clay Pot)',   emoji: '🏺', suggestedMaterials: ['clay'] },
  { id: 'pen',             label: 'Pen',                emoji: '🖊️', suggestedMaterials: ['plastic', 'metal', 'ink'] },
  { id: 'notebook',        label: 'Notebook',           emoji: '📓', suggestedMaterials: ['paper'] },
  { id: 'handkerchief',    label: 'Handkerchief',       emoji: '🧣', suggestedMaterials: ['cloth'] },
  { id: 'steel_tumbler',   label: 'Steel Tumbler',      emoji: '🥤', suggestedMaterials: ['metal', 'steel'] },
  { id: 'clay_diya',       label: 'Clay Diya',          emoji: '🪔', suggestedMaterials: ['clay', 'terracotta'] },
  { id: 'window_pane',     label: 'Window Pane',        emoji: '🪟', suggestedMaterials: ['glass', 'wood', 'metal'] },
  { id: 'newspaper',       label: 'Newspaper',          emoji: '📰', suggestedMaterials: ['paper'] },
  { id: 'plastic_chair',   label: 'Plastic Chair',      emoji: '🪑', suggestedMaterials: ['plastic'] },
  { id: 'chalk',           label: 'Chalk',              emoji: '🪨', suggestedMaterials: ['calcium carbonate', 'mineral'] },
  { id: 'wooden_ruler',    label: 'Wooden Ruler',       emoji: '📏', suggestedMaterials: ['wood'] },
  { id: 'metal_key',       label: 'Metal Key',          emoji: '🔑', suggestedMaterials: ['metal'] },
];

// ─── CSS injection ────────────────────────────────────────────────────────────
const injectCSS = () => {
  if (document.getElementById('act61-css')) return;
  const s = document.createElement('style');
  s.id = 'act61-css';
  s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.a61-root {
  font-family: 'Poppins', sans-serif;
  background: linear-gradient(135deg, #f0efff 0%, #fff8f2 100%);
  min-height: 100vh;
  padding: 16px;
}

/* ── HEADER ── */
.a61-header {
  text-align: center;
  margin-bottom: 16px;
}
.a61-title {
  font-size: clamp(1.1rem, 3vw, 1.6rem);
  font-weight: 900;
  background: linear-gradient(90deg, #533086, #4A4DC9, #FC9145);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 4px;
}
.a61-subtitle {
  font-size: clamp(0.72rem, 1.8vw, 0.85rem);
  color: #6B6BAA;
  font-weight: 500;
}

/* ── COUNTER BAR ── */
.a61-counter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 2px solid #C1C1EA;
  border-radius: 16px;
  padding: 10px 18px;
  margin-bottom: 14px;
  box-shadow: 0 2px 12px rgba(83,48,134,.07);
  flex-wrap: wrap;
  gap: 8px;
}
.a61-counter-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.a61-counter-text {
  font-size: 0.82rem;
  font-weight: 700;
  color: #533086;
}
.a61-progress-track {
  background: #EBEBEB;
  border-radius: 99px;
  height: 8px;
  width: 140px;
  overflow: hidden;
}
.a61-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4A4DC9, #FC9145);
  border-radius: 99px;
  transition: width 0.5s cubic-bezier(.68,-.55,.27,1.55);
}
.a61-reset-btn {
  background: #fff;
  border: 2px solid #C1C1EA;
  border-radius: 10px;
  padding: 5px 14px;
  cursor: pointer;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 0.73rem;
  color: #6060A0;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;
}
.a61-reset-btn:hover { border-color: #4A4DC9; color: #4A4DC9; }

/* ── BODY LAYOUT ── */
.a61-body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 14px;
  align-items: start;
}
@media (max-width: 720px) {
  .a61-body {
    grid-template-columns: 1fr;
  }
}

/* ── TILES PANEL ── */
.a61-tiles-panel {
  background: #fff;
  border: 2.5px solid #C1C1EA;
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 4px 18px rgba(83,48,134,.08);
  position: sticky;
  top: 16px;
}
.a61-panel-title {
  font-weight: 800;
  font-size: 0.82rem;
  color: #533086;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.a61-panel-count {
  background: linear-gradient(135deg, #533086, #4A4DC9);
  color: #fff;
  border-radius: 99px;
  padding: 1px 8px;
  font-size: 0.65rem;
  font-weight: 700;
}
.a61-tiles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}
@media (max-width: 720px) {
  .a61-tiles-panel { position: static; }
  .a61-tiles-grid  { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
}

/* Individual tile */
.a61-tile {
  background: linear-gradient(135deg, #f5f3ff, #fff8f2);
  border: 2px solid #C1C1EA;
  border-radius: 12px;
  padding: 8px 6px;
  cursor: grab;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  transition: all 0.18s ease;
  user-select: none;
  -webkit-user-select: none;
}
.a61-tile:hover {
  border-color: #4A4DC9;
  box-shadow: 0 4px 14px rgba(74,77,201,.2);
  transform: translateY(-2px);
}
.a61-tile.dragging {
  opacity: 0.4;
  transform: scale(0.95);
  cursor: grabbing;
}
.a61-tile.used {
  opacity: 0.35;
  pointer-events: none;
  filter: grayscale(0.5);
}
.a61-tile-emoji { font-size: 1.5rem; line-height: 1; }
.a61-tile-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: #4A4DC9;
  line-height: 1.2;
}

/* ── TABLE PANEL ── */
.a61-table-panel {
  background: #fff;
  border: 2.5px solid #C1C1EA;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(83,48,134,.08);
}
.a61-table-heading {
  background: linear-gradient(135deg, #533086, #4A4DC9);
  color: #fff;
  font-weight: 800;
  font-size: clamp(0.8rem, 2vw, 1rem);
  padding: 12px 18px;
  text-align: center;
  letter-spacing: 0.02em;
}
.a61-table-header-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: linear-gradient(135deg, #C1C1EA44, #FFF3E444);
  border-bottom: 2px solid #C1C1EA;
}
.a61-table-header-cell {
  padding: 10px 14px;
  font-weight: 800;
  font-size: clamp(0.7rem, 1.5vw, 0.82rem);
  color: #533086;
  border-right: 1.5px solid #C1C1EA;
  text-align: center;
}
.a61-table-header-cell:last-child { border-right: none; }

/* Table rows */
.a61-table-rows { }
.a61-table-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1.5px solid #F0EFFE;
  min-height: 56px;
  transition: background 0.2s ease;
}
.a61-table-row:last-child { border-bottom: none; }
.a61-table-row.filled { background: linear-gradient(135deg, #f8f7ff, #fff9f5); }
.a61-table-row.highlight { background: linear-gradient(135deg, #C1C1EA22, #FFF3E433); }

/* Drop zone cell */
.a61-drop-cell {
  border-right: 1.5px solid #E8E7FF;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  transition: all 0.2s ease;
  position: relative;
}
.a61-drop-cell.empty {
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 6px,
    rgba(193,193,234,.18) 6px,
    rgba(193,193,234,.18) 7px
  );
  cursor: pointer;
}
.a61-drop-cell.empty:hover,
.a61-drop-cell.drag-over {
  background: rgba(74,77,201,.08);
  border-color: #4A4DC9;
}
.a61-drop-cell.drag-over {
  box-shadow: inset 0 0 0 2px #4A4DC9;
}
.a61-drop-placeholder {
  font-size: 0.68rem;
  color: #C1C1EA;
  font-style: italic;
  font-weight: 500;
  text-align: center;
}

/* Placed tile in cell */
.a61-placed-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  position: relative;
  width: 100%;
}
.a61-placed-emoji { font-size: 1.4rem; line-height: 1; }
.a61-placed-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: #533086;
  text-align: center;
  line-height: 1.2;
}
.a61-remove-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #FC9145;
  border: none;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.14s ease;
  padding: 0;
}
.a61-remove-btn:hover { background: #e07020; transform: scale(1.1); }

/* Material input cell */
.a61-mat-cell {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  min-height: 56px;
}
.a61-mat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.a61-mat-chip {
  background: linear-gradient(135deg, #4A4DC9, #533086);
  color: #fff;
  border-radius: 99px;
  padding: 2px 8px;
  font-size: 0.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 3px;
  animation: chipPop 0.25s ease;
}
.a61-mat-chip-x {
  cursor: pointer;
  opacity: 0.7;
  line-height: 1;
  font-size: 0.7rem;
  transition: opacity 0.12s;
}
.a61-mat-chip-x:hover { opacity: 1; }

.a61-mat-input-row {
  display: flex;
  gap: 4px;
  align-items: center;
}
.a61-mat-input {
  flex: 1;
  border: 1.5px solid #C1C1EA;
  border-radius: 8px;
  padding: 3px 7px;
  font-family: 'Poppins', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  color: #533086;
  outline: none;
  transition: border-color 0.15s;
  min-width: 0;
  background: #F8F7FF;
}
.a61-mat-input:focus { border-color: #4A4DC9; background: #fff; }
.a61-mat-add-btn {
  background: linear-gradient(135deg, #4A4DC9, #533086);
  border: none;
  border-radius: 7px;
  padding: 4px 7px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.14s ease;
  flex-shrink: 0;
}
.a61-mat-add-btn:hover { transform: scale(1.08); }

/* Suggestions */
.a61-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 2px;
}
.a61-suggestion-btn {
  background: #FFF3E4;
  border: 1.5px solid #FC9145;
  border-radius: 99px;
  padding: 1px 7px;
  font-family: 'Poppins', sans-serif;
  font-size: 0.55rem;
  font-weight: 700;
  color: #FC9145;
  cursor: pointer;
  transition: all 0.13s ease;
}
.a61-suggestion-btn:hover {
  background: #FC9145;
  color: #fff;
  transform: scale(1.05);
}

/* ── COMPLETION BANNER ── */
.a61-complete-banner {
  background: linear-gradient(135deg, #533086, #4A4DC9);
  border-radius: 16px;
  padding: 20px 24px;
  text-align: center;
  color: #fff;
  margin-top: 14px;
  animation: bannerSlide 0.4s ease;
  box-shadow: 0 8px 28px rgba(83,48,134,.3);
}
.a61-complete-icon { font-size: 2.4rem; animation: completePulse 1s ease infinite; }
.a61-complete-title {
  font-weight: 900;
  font-size: clamp(1.1rem, 3vw, 1.5rem);
  margin: 8px 0 4px;
}
.a61-complete-sub {
  font-size: 0.82rem;
  opacity: 0.88;
  font-weight: 500;
}
.a61-replay-btn {
  background: #fff;
  color: #533086;
  border: none;
  border-radius: 12px;
  padding: 10px 24px;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 0.86rem;
  cursor: pointer;
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.14s;
}
.a61-replay-btn:hover { transform: scale(1.04); }

/* ── KEYFRAMES ── */
@keyframes chipPop {
  0%   { transform: scale(0.6); opacity: 0; }
  70%  { transform: scale(1.1); }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes bannerSlide {
  from { transform: translateY(14px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes completePulse {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.12); }
}
@keyframes rowFill {
  from { background: rgba(74,77,201,.12); }
  to   { background: transparent; }
}
  `;
  document.head.appendChild(s);
};

// ─── Component ────────────────────────────────────────────────────────────────
const Activity61: React.FC<ActivityProps> = ({ props = {} }) => {
  const { additionalProps = {} } = props;
  const tiles     = additionalProps.tiles      || DEFAULT_TILES;
  const title     = additionalProps.title      || 'Activity 6.1: Let us Identify';
  const tableTitle = additionalProps.tableTitle || 'Table 6.1: Identify Materials';

  // Each row: tileId placed + materials entered
  const [rows, setRows]           = useState<TableRow[]>(
    tiles.map(() => ({ tileId: null, materials: [], inputValue: '' }))
  );
  const [dragging, setDragging]   = useState<string | null>(null);
  const [dragOver, setDragOver]   = useState<number | null>(null);
  const [newlyFilled, setNewlyFilled] = useState<number | null>(null);

  useEffect(() => { injectCSS(); }, []);

  const usedTileIds = rows.filter(r => r.tileId !== null).map(r => r.tileId!);
  const filledRows  = rows.filter(r => r.tileId !== null && r.materials.length > 0).length;
  const totalRows   = tiles.length;
  const pct         = Math.round((filledRows / totalRows) * 100);
  const allDone     = filledRows === totalRows;

  // ─── Drag handlers (desktop) ────────────────────────────────────────────────
  const onDragStart = (tileId: string) => {
    setDragging(tileId);
  };
  const onDragOver = (e: React.DragEvent, rowIdx: number) => {
    e.preventDefault();
    setDragOver(rowIdx);
  };
  const onDrop = (rowIdx: number) => {
    if (!dragging) return;
    if (rows[rowIdx].tileId) return; // already filled
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], tileId: dragging };
      return next;
    });
    setNewlyFilled(rowIdx);
    setTimeout(() => setNewlyFilled(null), 600);
    setDragging(null);
    setDragOver(null);
  };
  const onDragEnd = () => { setDragging(null); setDragOver(null); };

  // ─── Click to place (mobile / accessibility) ─────────────────────────────
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  const handleTileClick = (tileId: string) => {
    if (usedTileIds.includes(tileId)) return;
    setSelectedTile(prev => prev === tileId ? null : tileId);
  };

  const handleCellClick = (rowIdx: number) => {
    if (rows[rowIdx].tileId) return;
    if (!selectedTile) return;
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], tileId: selectedTile };
      return next;
    });
    setNewlyFilled(rowIdx);
    setTimeout(() => setNewlyFilled(null), 600);
    setSelectedTile(null);
  };

  // ─── Remove tile from row ────────────────────────────────────────────────
  const removeFromRow = (rowIdx: number) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = { tileId: null, materials: [], inputValue: '' };
      return next;
    });
  };

  // ─── Material management ─────────────────────────────────────────────────
  const addMaterial = (rowIdx: number, value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return;
    if (rows[rowIdx].materials.includes(trimmed)) return;
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        materials: [...next[rowIdx].materials, trimmed],
        inputValue: '',
      };
      return next;
    });
  };

  const removeMaterial = (rowIdx: number, mat: string) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], materials: next[rowIdx].materials.filter(m => m !== mat) };
      return next;
    });
  };

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addMaterial(rowIdx, rows[rowIdx].inputValue);
    }
  };

  const setInputValue = (rowIdx: number, val: string) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], inputValue: val };
      return next;
    });
  };

  const handleReset = () => {
    setRows(tiles.map(() => ({ tileId: null, materials: [], inputValue: '' })));
    setSelectedTile(null);
    setDragging(null);
  };

  const getTile = (id: string) => tiles.find(t => t.id === id)!;

  return (
    <div className="a61-root">

      {/* Header */}
      <div className="a61-header">
        <div className="a61-title">{title}</div>
        <div className="a61-subtitle">
          Drag each object into the table and write the material it is made of.
          {selectedTile && (
            <span style={{ color: '#FC9145', marginLeft: 6 }}>
              ✨ Tap a row to place <strong>{getTile(selectedTile).label}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Counter bar */}
      <div className="a61-counter-bar">
        <div className="a61-counter-left">
          <span className="a61-counter-text">
            {filledRows} / {totalRows} rows completed
          </span>
          <div className="a61-progress-track">
            <div className="a61-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FC9145' }}>{pct}%</span>
        </div>
        <button className="a61-reset-btn" onClick={handleReset}>
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* Body */}
      <div className="a61-body">

        {/* Tiles Panel */}
        <div className="a61-tiles-panel">
          <div className="a61-panel-title">
            🧺 Object Tiles
            <span className="a61-panel-count">
              {tiles.length - usedTileIds.length} left
            </span>
          </div>
          <div className="a61-tiles-grid">
            {tiles.map(tile => {
              const isUsed     = usedTileIds.includes(tile.id);
              const isDragging = dragging === tile.id;
              const isSelected = selectedTile === tile.id;
              return (
                <div
                  key={tile.id}
                  className={`a61-tile${isDragging ? ' dragging' : ''}${isUsed ? ' used' : ''}`}
                  draggable={!isUsed}
                  onDragStart={() => onDragStart(tile.id)}
                  onDragEnd={onDragEnd}
                  onClick={() => handleTileClick(tile.id)}
                  style={isSelected ? {
                    borderColor: '#FC9145',
                    boxShadow: '0 0 0 2px #FC914566',
                    background: 'linear-gradient(135deg, #FFF3E4, #fff)',
                  } : undefined}
                  title={isUsed ? 'Already placed' : `Drag or tap to place ${tile.label}`}
                >
                  <span className="a61-tile-emoji">{tile.emoji}</span>
                  <span className="a61-tile-label">{tile.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table Panel */}
        <div className="a61-table-panel">
          <div className="a61-table-heading">{tableTitle}</div>

          <div className="a61-table-header-row">
            <div className="a61-table-header-cell">I observe</div>
            <div className="a61-table-header-cell">Materials they are made up of</div>
          </div>

          <div className="a61-table-rows">
            {rows.map((row, idx) => {
              const tile        = row.tileId ? getTile(row.tileId) : null;
              const isHighlight = dragOver === idx;
              const isFilled    = newlyFilled === idx;
              const suggestions = tile ? tile.suggestedMaterials.filter(s => !row.materials.includes(s)) : [];

              return (
                <div
                  key={idx}
                  className={`a61-table-row${tile ? ' filled' : ''}${isHighlight ? ' highlight' : ''}`}
                  style={isFilled ? { animation: 'rowFill 0.5s ease' } : undefined}
                >
                  {/* Drop zone cell */}
                  <div
                    className={`a61-drop-cell${!tile ? ' empty' : ''}${isHighlight ? ' drag-over' : ''}`}
                    onDragOver={(e) => onDragOver(e, idx)}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => onDrop(idx)}
                    onClick={() => handleCellClick(idx)}
                  >
                    {tile ? (
                      <div className="a61-placed-tile">
                        <button
                          className="a61-remove-btn"
                          onClick={(e) => { e.stopPropagation(); removeFromRow(idx); }}
                          title="Remove"
                        >
                          <X size={9} color="#fff" strokeWidth={3} />
                        </button>
                        <span className="a61-placed-emoji">{tile.emoji}</span>
                        <span className="a61-placed-label">{tile.label}</span>
                      </div>
                    ) : (
                      <span className="a61-drop-placeholder">
                        {selectedTile ? '👆 tap to place' : '⬅ drag here'}
                      </span>
                    )}
                  </div>

                  {/* Material input cell */}
                  <div className="a61-mat-cell">
                    {tile ? (
                      <>
                        {/* Chips */}
                        {row.materials.length > 0 && (
                          <div className="a61-mat-chips">
                            {row.materials.map(mat => (
                              <span key={mat} className="a61-mat-chip">
                                {mat}
                                <span
                                  className="a61-mat-chip-x"
                                  onClick={() => removeMaterial(idx, mat)}
                                >×</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Input row */}
                        <div className="a61-mat-input-row">
                          <input
                            className="a61-mat-input"
                            placeholder="type material…"
                            value={row.inputValue}
                            onChange={(e) => setInputValue(idx, e.target.value)}
                            onKeyDown={(e) => handleInputKey(e, idx)}
                          />
                          <button
                            className="a61-mat-add-btn"
                            onClick={() => addMaterial(idx, row.inputValue)}
                            title="Add material"
                          >
                            <Plus size={12} color="#fff" strokeWidth={3} />
                          </button>
                        </div>

                        {/* Suggestions */}
                        {suggestions.length > 0 && (
                          <div className="a61-suggestions">
                            {suggestions.map(s => (
                              <button
                                key={s}
                                className="a61-suggestion-btn"
                                onClick={() => addMaterial(idx, s)}
                              >
                                + {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: '0.65rem', color: '#D0D0E8', fontStyle: 'italic' }}>
                        — place an object first —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Completion banner */}
      {allDone && (
        <div className="a61-complete-banner">
          <div className="a61-complete-icon">🎉</div>
          <div className="a61-complete-title">Table Complete!</div>
          <div className="a61-complete-sub">
            You identified materials for all {totalRows} objects. Great observation skills!
          </div>
          <button className="a61-replay-btn" onClick={handleReset}>
            <RotateCcw size={13} /> Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Activity61;