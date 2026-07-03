import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RotateCcw, X, ChevronDown, Check, Sparkles } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ObjectTile {
  id: string;
  label: string;
  emoji: string;
  correctMaterials: string[];   // the valid answer(s) — what the object is really made of
  explanation: string;          // short, purpose-first reasoning shown in review
}

interface RowState {
  tileId: string | null;
  materials: string[];          // materials the student picked (neutral until checked)
}

type Phase = 'play' | 'result' | 'review';

interface ActivityProps {
  props?: {
    width?: number;
    height?: number;
    gradeLevel?: 6 | 7 | 8;
    additionalProps?: {
      tiles?: ObjectTile[];
      materialPool?: string[];
      title?: string;
      tableTitle?: string;
      objectCount?: number;     // how many objects to show per round
    };
  };
  setStepDetails?: (s: { currentStep: number; totalSteps: number; isPaused: boolean; currentMode: string }) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─── Tier presets (this is Class 6 content → playful, big celebration) ──────────
const TIER_CONFIG = {
  6: { confettiCount: 70, confettiDuration: 2600, starCount: 5, scoreSizePx: 60, touch: 54, easing: 'cubic-bezier(.34,1.56,.64,1)' },
  7: { confettiCount: 40, confettiDuration: 2000, starCount: 5, scoreSizePx: 54, touch: 50, easing: 'cubic-bezier(.22,1,.36,1)' },
  8: { confettiCount: 16, confettiDuration: 1500, starCount: 0, scoreSizePx: 48, touch: 48, easing: 'cubic-bezier(.22,1,.36,1)' },
} as const;

// ─── Material pool (from the chapter: paper, wood, cloth, glass, metal, plastic, clay) + rubber ─
const MATERIAL_POOL = ['plastic', 'metal', 'wood', 'paper', 'cloth', 'glass', 'clay', 'rubber'];

// ─── Object bank (materials all drawn from the pool above) ──────────────────────
const DEFAULT_TILES: ObjectTile[] = [
  { id: 'water_bottle',  label: 'Plastic Bottle',   emoji: '🍼', correctMaterials: ['plastic'],            explanation: 'A plastic bottle is light and waterproof, so it can hold water without leaking or breaking.' },
  { id: 'eraser',        label: 'Eraser',           emoji: '🧽', correctMaterials: ['rubber'],             explanation: 'An eraser needs to be soft and grippy to rub out pencil marks, so it is made of rubber.' },
  { id: 'schoolbag',     label: 'School Bag',       emoji: '🎒', correctMaterials: ['cloth'],              explanation: 'A school bag must be soft, light and foldable to carry your books — cloth is perfect for that.' },
  { id: 'matka',         label: 'Matka (Clay Pot)', emoji: '🏺', correctMaterials: ['clay'],               explanation: 'A matka keeps water cool because it is made of clay, which lets a little water seep out and evaporate.' },
  { id: 'pen',           label: 'Pen',              emoji: '🖊️', correctMaterials: ['plastic', 'metal'],   explanation: 'A pen uses plastic for the body and metal for the tip — different parts, different materials.' },
  { id: 'notebook',      label: 'Notebook',         emoji: '📓', correctMaterials: ['paper'],              explanation: 'A notebook is made of paper so you can write on it easily.' },
  { id: 'steel_tumbler', label: 'Steel Tumbler',    emoji: '🥤', correctMaterials: ['metal'],              explanation: 'A steel tumbler is made of metal so it is strong, shiny and does not break when dropped.' },
  { id: 'clay_diya',     label: 'Clay Diya',        emoji: '🪔', correctMaterials: ['clay'],               explanation: 'A diya is shaped from clay and baked hard so it can safely hold burning oil.' },
  { id: 'newspaper',     label: 'Newspaper',        emoji: '📰', correctMaterials: ['paper'],              explanation: 'A newspaper is printed on paper, which is cheap and easy to fold.' },
  { id: 'wooden_ruler',  label: 'Wooden Ruler',     emoji: '📏', correctMaterials: ['wood'],               explanation: 'A ruler is made of wood so it stays straight and stiff for drawing lines.' },
  { id: 'window_glass',  label: 'Window Glass',     emoji: '🪟', correctMaterials: ['glass'],              explanation: 'A window is made of glass so you can see through it clearly.' },
  { id: 'metal_key',     label: 'Metal Key',        emoji: '🔑', correctMaterials: ['metal'],              explanation: 'A key is made of metal so it is hard and strong enough to turn a lock.' },
  { id: 'glass_tumbler', label: 'Glass Tumbler',    emoji: '🥛', correctMaterials: ['glass'],              explanation: 'A glass tumbler is made of glass so you can see the drink inside.' },
  { id: 'pencil',        label: 'Wooden Pencil',    emoji: '✏️', correctMaterials: ['wood'],               explanation: 'A wooden pencil is light, easy to hold and simple to sharpen when it gets blunt.' },
  { id: 'spoon',         label: 'Steel Spoon',      emoji: '🥄', correctMaterials: ['metal'],              explanation: 'A steel spoon is made of metal, so it is strong, smooth and easy to wash after eating.' },
  { id: 'coin',          label: 'Coin',             emoji: '🪙', correctMaterials: ['metal'],              explanation: 'A coin is made of metal so it stays hard and lasts through years of daily use.' },
  { id: 'tin_can',       label: 'Tin Can',          emoji: '🥫', correctMaterials: ['metal'],              explanation: 'A food tin is made of metal so it keeps the food inside sealed and fresh.' },
  { id: 'bucket',        label: 'Plastic Bucket',   emoji: '🪣', correctMaterials: ['plastic'],            explanation: 'A plastic bucket is light to carry and does not rust, even when it is full of water.' },
  { id: 'toothbrush',    label: 'Plastic Toothbrush', emoji: '🪥', correctMaterials: ['plastic'],          explanation: 'A plastic toothbrush handle is light, waterproof and easy to grip while you brush.' },
  { id: 'balloon',       label: 'Balloon',          emoji: '🎈', correctMaterials: ['rubber'],             explanation: 'A balloon is made of rubber so it can stretch thin and fill up with air.' },
  { id: 'slippers',      label: 'Rubber Slippers',  emoji: '🩴', correctMaterials: ['rubber'],             explanation: 'Rubber slippers bend easily and grip the floor, so your feet do not slip even when it is wet.' },
  { id: 'mirror',        label: 'Mirror',           emoji: '🪞', correctMaterials: ['glass'],              explanation: 'A mirror is made of glass with a shiny coating behind it, so you can see your reflection.' },
  { id: 'cardboard_box', label: 'Cardboard Box',    emoji: '📦', correctMaterials: ['paper'],              explanation: 'A box is made of thick paper called cardboard, so it is light and folds up to pack things.' },
  { id: 'brick',         label: 'Brick',            emoji: '🧱', correctMaterials: ['clay'],               explanation: 'A brick is made of baked clay so it becomes hard and strong enough to build walls.' },
  { id: 'flower_pot',    label: 'Clay Flower Pot',  emoji: '🪴', correctMaterials: ['clay'],               explanation: 'A clay flower pot holds the soil and lets the roots get air through its walls.' },
  { id: 'tshirt',        label: 'T-Shirt',          emoji: '👕', correctMaterials: ['cloth'],              explanation: 'A t-shirt is made of cloth so it is soft, light and comfortable to wear.' },
  { id: 'wooden_door',   label: 'Wooden Door',      emoji: '🚪', correctMaterials: ['wood'],               explanation: 'A door is made of wood so it is solid and strong enough to close off a room.' },
  { id: 'socks',         label: 'Socks',            emoji: '🧦', correctMaterials: ['cloth'],              explanation: 'Socks are made of cloth so they are soft, stretchy and keep your feet warm.' },
  { id: 'cap',           label: 'Cap',              emoji: '🧢', correctMaterials: ['cloth'],              explanation: 'A cap is made of cloth so it is soft, light and shades your head from the sun.' },
  { id: 'cricket_bat',   label: 'Wooden Cricket Bat', emoji: '🏏', correctMaterials: ['wood'],             explanation: 'A wooden cricket bat is strong and springy, so it can hit the ball far.' },
  { id: 'light_bulb',    label: 'Light Bulb',       emoji: '💡', correctMaterials: ['glass'],              explanation: 'A bulb is made of glass so light can shine through it and brighten the room.' },
  { id: 'book',          label: 'Book',             emoji: '📖', correctMaterials: ['paper'],              explanation: 'A book is made of paper so its pages are light and easy to turn and read.' },
];

// ─── Small helpers ──────────────────────────────────────────────────────────────
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample<T>(arr: T[], n: number, seed: number): T[] {
  return shuffle(arr, mulberry32(seed)).slice(0, Math.min(n, arr.length));
}

// ─── CSS injection ────────────────────────────────────────────────────────────
const injectCSS = () => {
  if (document.getElementById('a61-styles-v2')) return;
  const s = document.createElement('style');
  s.id = 'a61-styles-v2';
  s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
.a61-root *, .a61-root *::before, .a61-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.a61-root {
  font-family: 'Poppins', sans-serif;
  background: linear-gradient(135deg, #f0efff 0%, #fff8f2 100%);
  min-height: 100vh;
  padding: 16px;
}

/* ── HEADER ── */
.a61-header { text-align: center; margin-bottom: 16px; }
.a61-title {
  font-size: clamp(1.15rem, 3vw, 1.65rem);
  font-weight: 900;
  background: linear-gradient(90deg, #533086, #4A4DC9, #FC9145);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 4px;
}
.a61-subtitle { font-size: clamp(0.78rem, 1.8vw, 0.9rem); color: #6B6BAA; font-weight: 500; }
.a61-subtitle strong { color: #FC9145; }

/* ── COUNTER BAR ── */
.a61-counter-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border: 2px solid #C1C1EA; border-radius: 16px;
  padding: 10px 18px; margin-bottom: 14px;
  box-shadow: 0 2px 12px rgba(83,48,134,.07);
  flex-wrap: wrap; gap: 8px;
}
.a61-counter-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.a61-counter-text { font-size: 0.84rem; font-weight: 700; color: #533086; }
.a61-progress-track { background: #EBEBEB; border-radius: 99px; height: 8px; width: 140px; overflow: hidden; }
.a61-progress-fill { height: 100%; background: linear-gradient(90deg, #4A4DC9, #FC9145); border-radius: 99px; transition: width .5s cubic-bezier(.34,1.56,.64,1); }
.a61-reset-btn {
  background: #fff; border: 2px solid #C1C1EA; border-radius: 10px;
  padding: 6px 14px; cursor: pointer; font-family: 'Poppins', sans-serif;
  font-weight: 700; font-size: 0.75rem; color: #6060A0;
  display: flex; align-items: center; gap: 5px; transition: all .15s ease;
}
.a61-reset-btn:hover { border-color: #4A4DC9; color: #4A4DC9; }

/* ── BODY LAYOUT ── */
.a61-body { max-width: 640px; margin: 0 auto; }

/* ── TILES PANEL ── */
.a61-tiles-panel {
  background: #fff; border: 2.5px solid #C1C1EA; border-radius: 18px; padding: 14px;
  box-shadow: 0 4px 18px rgba(83,48,134,.08); position: sticky; top: 16px;
}
.a61-panel-title { font-weight: 800; font-size: 0.85rem; color: #533086; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.a61-panel-count { background: linear-gradient(135deg, #533086, #4A4DC9); color: #fff; border-radius: 99px; padding: 1px 9px; font-size: 0.66rem; font-weight: 700; }
.a61-tiles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
@media (max-width: 760px) {
  .a61-tiles-panel { position: static; }
  .a61-tiles-grid  { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
}
.a61-tile {
  background: linear-gradient(135deg, #f5f3ff, #fff8f2); border: 2px solid #C1C1EA;
  border-radius: 12px; padding: 9px 6px; cursor: grab;
  display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center;
  transition: all .18s ease; user-select: none; -webkit-user-select: none;
}
.a61-tile:hover { border-color: #4A4DC9; box-shadow: 0 4px 14px rgba(74,77,201,.2); transform: translateY(-2px); }
.a61-tile.dragging { opacity: .4; transform: scale(.95); cursor: grabbing; }
.a61-tile.used { opacity: .32; pointer-events: none; filter: grayscale(.5); }
.a61-tile-emoji { font-size: 1.55rem; line-height: 1; }
.a61-tile-label { font-size: 0.62rem; font-weight: 700; color: #4A4DC9; line-height: 1.2; }

/* ── TABLE PANEL ── */
.a61-table-panel { background: #fff; border: 2.5px solid #C1C1EA; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 18px rgba(83,48,134,.08); }
.a61-table-heading {
  background: linear-gradient(135deg, #533086, #4A4DC9); color: #fff; font-weight: 800;
  font-size: clamp(0.85rem, 2vw, 1rem); padding: 13px 18px; text-align: center; letter-spacing: .02em;
}
.a61-table-header-row { display: grid; grid-template-columns: 1fr 1.25fr; background: linear-gradient(135deg, #C1C1EA44, #FFF3E444); border-bottom: 2px solid #C1C1EA; }
.a61-table-header-cell { padding: 11px 14px; font-weight: 800; font-size: clamp(0.72rem, 1.5vw, 0.84rem); color: #533086; border-right: 1.5px solid #C1C1EA; text-align: center; }
.a61-table-header-cell:last-child { border-right: none; }

.a61-table-row { display: grid; grid-template-columns: 1fr 1.25fr; border-bottom: 1.5px solid #F0EFFE; min-height: 62px; transition: background .2s ease; }
.a61-table-row:last-child { border-bottom: none; }
.a61-table-row.filled { background: linear-gradient(135deg, #f8f7ff, #fff9f5); }
.a61-table-row.highlight { background: linear-gradient(135deg, #C1C1EA22, #FFF3E433); }

/* Drop zone cell */
.a61-drop-cell { border-right: 1.5px solid #E8E7FF; padding: 8px 10px; display: flex; align-items: center; justify-content: center; min-height: 62px; transition: all .2s ease; position: relative; }
.a61-drop-cell.empty { background: repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(193,193,234,.18) 6px, rgba(193,193,234,.18) 7px); cursor: pointer; }
.a61-drop-cell.empty:hover, .a61-drop-cell.drag-over { background: rgba(74,77,201,.08); }
.a61-drop-cell.drag-over { box-shadow: inset 0 0 0 2px #4A4DC9; }
.a61-drop-placeholder { font-size: 0.7rem; color: #B7B7DC; font-style: italic; font-weight: 500; text-align: center; }
.a61-placed-tile { display: flex; flex-direction: column; align-items: center; gap: 3px; position: relative; width: 100%; }
.a61-placed-emoji { font-size: 1.45rem; line-height: 1; }
.a61-placed-label { font-size: 0.62rem; font-weight: 700; color: #533086; text-align: center; line-height: 1.2; }
.a61-remove-btn { position: absolute; top: -6px; right: -2px; background: #FC9145; border: none; border-radius: 50%; width: 17px; height: 17px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .14s ease; padding: 0; }
.a61-remove-btn:hover { background: #e07020; transform: scale(1.1); }

/* ── MATERIAL CELL ── */
.a61-mat-cell { padding: 9px 11px; display: flex; flex-direction: column; justify-content: center; gap: 7px; min-height: 62px; }
.a61-hint { display: inline-flex; align-items: center; gap: 5px; font-size: 0.62rem; font-weight: 700; color: #8A7BBA; }
.a61-hint-badge { background: #EDEDF8; color: #533086; border-radius: 99px; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; }

.a61-mat-chips { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.a61-mat-chip {
  display: inline-flex; align-items: center; gap: 5px; border-radius: 99px; padding: 4px 9px;
  font-size: 0.66rem; font-weight: 700; animation: a61-chipPop .22s ease;
  background: linear-gradient(135deg, #4A4DC9, #533086); color: #fff;
}
.a61-mat-chip.correct { background: linear-gradient(135deg, #2ECC71, #25a25a); }
.a61-mat-chip.wrong   { background: linear-gradient(135deg, #E74C3C, #c0392b); }
.a61-chip-eg { font-size: 0.82rem; line-height: 1; flex-shrink: 0; }
.a61-mat-chip-x { cursor: pointer; opacity: .8; line-height: 1; display: inline-flex; transition: opacity .12s; }
.a61-mat-chip-x:hover { opacity: 1; }

/* Dropdown trigger */
.a61-dd-trigger {
  display: inline-flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; max-width: 220px; background: #F8F7FF; border: 1.5px solid #C1C1EA; border-radius: 10px;
  padding: 7px 11px; font-family: 'Poppins', sans-serif; font-size: 0.72rem; font-weight: 600;
  color: #533086; cursor: pointer; transition: all .15s ease;
}
.a61-dd-trigger:hover { border-color: #4A4DC9; background: #fff; }
.a61-dd-trigger.open { border-color: #4A4DC9; box-shadow: 0 0 0 2px rgba(74,77,201,.18); }
.a61-dd-trigger .chev { transition: transform .18s ease; flex-shrink: 0; }
.a61-dd-trigger.open .chev { transform: rotate(180deg); }
.a61-mat-empty { font-size: 0.7rem; color: #D0D0E8; font-style: italic; }

/* Dropdown panel (fixed so it escapes table overflow) */
.a61-dd-panel {
  position: fixed; z-index: 9999; background: #fff; border: 1.5px solid #C1C1EA;
  border-radius: 12px; box-shadow: 0 12px 34px rgba(83,48,134,.22); padding: 6px;
  max-height: 260px; overflow-y: auto; animation: a61-ddPop .16s ease;
  min-width: 210px; max-width: 300px;
}
.a61-dd-option {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  background: transparent; border: none; border-radius: 8px; padding: 8px 10px;
  font-family: 'Poppins', sans-serif; cursor: pointer; transition: background .12s ease;
}
.a61-dd-option:hover { background: #EDEDF8; }
.a61-dd-eg-icon { font-size: 1.18rem; line-height: 1; flex-shrink: 0; width: 24px; text-align: center; }
.a61-dd-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.a61-dd-name { font-size: 0.8rem; font-weight: 700; color: #3A3A55; line-height: 1.2; }
.a61-dd-option:hover .a61-dd-name { color: #533086; }
.a61-dd-eg { font-size: 0.64rem; font-weight: 500; color: #9A9AB8; line-height: 1.2; }
.a61-dd-empty { padding: 10px 12px; font-size: 0.72rem; color: #A6A6C8; font-style: italic; }

/* ── CHECK BAR ── */
.a61-checkbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
.a61-check-status { font-size: 0.82rem; font-weight: 600; color: #6B6BAA; }
.a61-check-btn {
  display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #FF7212, #FC9145);
  color: #fff; border: none; border-radius: 12px; padding: 12px 26px; font-family: 'Poppins', sans-serif;
  font-weight: 800; font-size: 0.92rem; cursor: pointer; box-shadow: 0 6px 18px rgba(255,114,18,.32); transition: all .16s ease;
}
.a61-check-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(255,114,18,.4); }
.a61-check-btn:disabled { background: #D7D7E6; color: #fff; cursor: not-allowed; box-shadow: none; transform: none; }

/* ── RESULT OVERLAY ── */
.a61-overlay { position: fixed; inset: 0; background: rgba(20,15,40,.55); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; animation: a61-fadeIn .2s ease; }
.a61-result-card {
  position: relative; background: linear-gradient(150deg, #ffffff 60%, #fff3ea); border-radius: 24px;
  padding: 30px 28px; text-align: center; max-width: 380px; width: 100%;
  box-shadow: 0 24px 60px rgba(20,15,40,.4); animation: a61-cardPop .5s cubic-bezier(.34,1.56,.64,1); overflow: hidden;
}
.a61-result-emoji { font-size: 2.6rem; line-height: 1; }
.a61-score { font-weight: 900; line-height: 1; margin-top: 8px; background: linear-gradient(90deg, #533086, #4A4DC9, #FC9145); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.a61-score-total { font-size: 0.95rem; font-weight: 700; color: #8A7BBA; margin-top: 2px; }
.a61-stars { display: flex; justify-content: center; gap: 5px; margin: 12px 0 6px; }
.a61-star { font-size: 1.5rem; line-height: 1; opacity: 0; transform: scale(.4); animation: a61-starPop .4s cubic-bezier(.34,1.56,.64,1) forwards; }
.a61-star.empty { filter: grayscale(1); opacity: .35 !important; transform: scale(1); animation: none; }
.a61-encourage { font-size: 0.9rem; font-weight: 600; color: #4E4E4E; line-height: 1.5; margin: 8px 4px 18px; }
.a61-result-ctas { display: flex; flex-direction: column; gap: 9px; }
.a61-cta-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  background: linear-gradient(135deg, #FF7212, #FC9145); color: #fff; border: none; border-radius: 12px;
  padding: 12px 18px; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: transform .14s ease;
}
.a61-cta-primary:hover { transform: scale(1.03); }
.a61-cta-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  background: #fff; color: #533086; border: 2px solid #C1C1EA; border-radius: 12px;
  padding: 11px 18px; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: all .14s ease;
}
.a61-cta-secondary:hover { border-color: #4A4DC9; color: #4A4DC9; }

/* Confetti */
.a61-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.a61-confetti-piece { position: absolute; top: -12px; width: 9px; height: 14px; border-radius: 2px; animation-name: a61-confettiFall; animation-timing-function: cubic-bezier(.3,.6,.5,1); animation-iteration-count: 1; }

/* ── REVIEW SCREEN ── */
.a61-review { background: #fff; border: 2.5px solid #C1C1EA; border-radius: 20px; padding: 20px 18px; box-shadow: 0 6px 22px rgba(83,48,134,.1); animation: a61-fadeIn .25s ease; }
.a61-review-head { font-weight: 900; font-size: clamp(1.05rem, 2.6vw, 1.4rem); color: #533086; text-align: center; }
.a61-review-sub { font-size: 0.84rem; color: #8A7BBA; text-align: center; margin: 4px 0 16px; font-weight: 500; }
.a61-correct-strip { background: #EAF9F0; border: 1.5px solid #BCEBCF; border-radius: 14px; padding: 12px 14px; margin-bottom: 16px; }
.a61-correct-title { font-size: 0.78rem; font-weight: 800; color: #25a25a; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.a61-correct-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.a61-correct-pill { display: inline-flex; align-items: center; gap: 5px; background: #fff; border: 1.5px solid #BCEBCF; border-radius: 99px; padding: 4px 10px; font-size: 0.7rem; font-weight: 700; color: #25a25a; }
.a61-perfect { text-align: center; padding: 14px; font-size: 0.95rem; font-weight: 700; color: #25a25a; }

.a61-review-card { background: #FBFAFF; border: 1.5px solid #E4E1F5; border-radius: 16px; padding: 15px 16px; margin-bottom: 12px; }
.a61-rc-obj { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.a61-rc-obj-emoji { font-size: 1.7rem; line-height: 1; }
.a61-rc-obj-label { font-weight: 800; font-size: 0.95rem; color: #533086; }
.a61-rc-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 7px; }
.a61-rc-key { font-size: 0.74rem; font-weight: 700; min-width: 92px; }
.a61-rc-key.you { color: #c0392b; }
.a61-rc-key.ans { color: #25a25a; }
.a61-rc-expl { font-size: 0.82rem; line-height: 1.55; color: #4E4E4E; background: #fff; border-radius: 10px; padding: 10px 12px; border: 1px dashed #C1C1EA; margin-top: 8px; }
.a61-review-foot { text-align: center; margin-top: 8px; }

/* ── KEYFRAMES ── */
@keyframes a61-chipPop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
@keyframes a61-ddPop { from { transform: translateY(-6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes a61-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes a61-cardPop { from { transform: scale(.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes a61-starPop { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
@keyframes a61-confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(460px) rotate(540deg); opacity: 0; } }
@keyframes a61-rowFill { from { background: rgba(74,77,201,.12); } to { background: transparent; } }
  `;
  document.head.appendChild(s);
};

// ─── Component ──────────────────────────────────────────────────────────────────
const Activity61: React.FC<ActivityProps> = ({ props = {} }) => {
  const additional = props.additionalProps || {};
  const allTiles    = additional.tiles       || DEFAULT_TILES;
  const pool        = additional.materialPool || MATERIAL_POOL;
  const title       = additional.title       || 'Activity 6.1: Let us Identify';
  const tableTitle  = additional.tableTitle  || 'Table 6.1: Identify Materials';
  const objectCount = additional.objectCount ?? Math.min(8, allTiles.length);
  const gradeLevel  = props.gradeLevel ?? 6;
  const tier        = TIER_CONFIG[gradeLevel];

  // Randomised set of objects for this round (fresh on Play again)
  const [sessionSeed, setSessionSeed] = useState<number>(() => (Math.random() * 1e9) | 0);
  const sessionTiles = useMemo(
    () => sample(allTiles, objectCount, sessionSeed),
    [allTiles, objectCount, sessionSeed]
  );

  const [rows, setRows]               = useState<RowState[]>(() => sessionTiles.map(t => ({ tileId: t.id, materials: [] })));
  const [openRow, setOpenRow]         = useState<number | null>(null);
  const [ddPos, setDdPos]             = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const [phase, setPhase]             = useState<Phase>('play');
  const [displayedScore, setDisplayedScore] = useState(0);

  const triggerRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => { injectCSS(); }, []);

  // Reset the board whenever the round's object set changes
  useEffect(() => {
    setRows(sessionTiles.map(t => ({ tileId: t.id, materials: [] })));
    setOpenRow(null);
    setDdPos(null);
    setPhase('play');
  }, [sessionTiles]);

  // Close dropdown on outside click / scroll / resize
  useEffect(() => {
    if (openRow === null) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.a61-dd-panel') || t.closest('.a61-dd-trigger')) return;
      setOpenRow(null); setDdPos(null);
    };
    const onScroll = () => { setOpenRow(null); setDdPos(null); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [openRow]);

  const getTile = (id: string) => allTiles.find(t => t.id === id)!;

  const total       = sessionTiles.length;

  const isRowFull = (r: RowState) =>
    r.tileId !== null && r.materials.length === getTile(r.tileId).correctMaterials.length;
  const isRowCorrect = (r: RowState) => {
    if (r.tileId === null) return false;
    const correct = getTile(r.tileId).correctMaterials;
    return r.materials.length === correct.length && r.materials.every(m => correct.includes(m));
  };

  const answeredCount = rows.filter(isRowFull).length;
  const ready         = rows.every(isRowFull);
  const score         = rows.filter(isRowCorrect).length;
  const pct           = total ? score / total : 0;
  const filledFraction = total ? answeredCount / total : 0;

  // Count-up score on result
  useEffect(() => {
    if (phase !== 'result') { setDisplayedScore(0); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1200, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedScore(Math.round(eased * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, score]);

  // Confetti pieces for the result popup
  const confetti = useMemo(() => {
    if (phase !== 'result') return [];
    const rng = mulberry32(sessionSeed ^ 0x9e3779b9);
    const colors = ['#4A4DC9', '#533086', '#FC9145', '#FF7212', '#7FC4E8', '#E88FB0', '#2ECC71'];
    return Array.from({ length: tier.confettiCount }).map((_, i) => ({
      id: i,
      left: rng() * 100,
      delay: rng() * 600,
      duration: tier.confettiDuration * (0.6 + rng() * 0.6),
      color: colors[Math.floor(rng() * colors.length)],
      rotate: rng() * 360,
    }));
  }, [phase, sessionSeed, tier.confettiCount, tier.confettiDuration]);

  // ── Materials via dropdown ──────────────────────────────────────────────────
  const toggleDropdown = (rowIdx: number) => {
    if (openRow === rowIdx) { setOpenRow(null); setDdPos(null); return; }
    const el = triggerRefs.current[rowIdx];
    if (el) {
      const r = el.getBoundingClientRect();
      const optionCount = pool.filter(m => !rows[rowIdx].materials.includes(m)).length;
      const estH = Math.min(280, optionCount * 42 + 14);
      const spaceBelow = window.innerHeight - r.bottom - 12;
      const spaceAbove = r.top - 12;
      const openUp = spaceBelow < estH && spaceAbove > spaceBelow;
      const width = Math.max(r.width, 210);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      if (openUp) {
        setDdPos({ left, width, bottom: window.innerHeight - r.top + 6, maxH: Math.max(130, spaceAbove) });
      } else {
        setDdPos({ left, width, top: r.bottom + 6, maxH: Math.max(130, spaceBelow) });
      }
    }
    setOpenRow(rowIdx);
  };
  const addMaterial = (rowIdx: number, mat: string) => {
    setRows(prev => {
      const next = [...prev];
      const row = next[rowIdx];
      if (!row.tileId || row.materials.includes(mat)) return prev;
      if (row.materials.length >= getTile(row.tileId).correctMaterials.length) return prev;
      next[rowIdx] = { ...row, materials: [...row.materials, mat] };
      return next;
    });
    setOpenRow(null); setDdPos(null);
  };
  const removeMaterial = (rowIdx: number, mat: string) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], materials: next[rowIdx].materials.filter(m => m !== mat) };
      return next;
    });
  };

  // ── Flow controls ───────────────────────────────────────────────────────────
  const handleCheck     = () => { if (ready) { setOpenRow(null); setDdPos(null); setPhase('result'); } };
  const handleReview    = () => setPhase('review');
  const handlePlayAgain = () => setSessionSeed((Math.random() * 1e9) | 0); // effect resets the rest
  const handleReset     = () => {
    setRows(sessionTiles.map(t => ({ tileId: t.id, materials: [] })));
    setOpenRow(null); setDdPos(null); setPhase('play');
  };

  const encouragement =
    pct >= 0.9 ? 'Brilliant! You really know what things are made of! 🌟'
    : pct >= 0.6 ? 'Nice work! Let us look at the tricky ones together.'
    : 'Good try! Every mistake teaches us something new — let us learn together.';

  const starsFilled = score === 0 ? 0 : Math.max(1, Math.ceil(pct * tier.starCount));

  const correctRows = rows.filter(r => r.tileId && isRowCorrect(r));
  const wrongRows   = rows
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => r.tileId && !isRowCorrect(r));

  const Chip = ({ mat, state, onRemove }: { mat: string; state?: 'correct' | 'wrong'; onRemove?: () => void }) => (
    <span className={`a61-mat-chip${state ? ' ' + state : ''}`}>
      {cap(mat)}
      {onRemove && (
        <span className="a61-mat-chip-x" onClick={onRemove}><X size={11} color="#fff" strokeWidth={3} /></span>
      )}
    </span>
  );

  // ─── REVIEW SCREEN ──────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div className="a61-root">
        <div className="a61-review">
          <div className="a61-review-head">Let us see what we learned</div>
          <div className="a61-review-sub">You scored {score} out of {total}</div>

          {correctRows.length > 0 && (
            <div className="a61-correct-strip">
              <div className="a61-correct-title"><Check size={14} strokeWidth={3} /> You got these right</div>
              <div className="a61-correct-pills">
                {correctRows.map((r, i) => (
                  <span key={i} className="a61-correct-pill">
                    <span>{getTile(r.tileId!).emoji}</span>{getTile(r.tileId!).label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {wrongRows.length === 0 ? (
            <div className="a61-perfect">🎉 Perfect! You identified every material correctly.</div>
          ) : (
            wrongRows.map(({ r, idx }) => {
              const tile = getTile(r.tileId!);
              return (
                <div key={idx} className="a61-review-card">
                  <div className="a61-rc-obj">
                    <span className="a61-rc-obj-emoji">{tile.emoji}</span>
                    <span className="a61-rc-obj-label">{tile.label}</span>
                  </div>
                  <div className="a61-rc-line">
                    <span className="a61-rc-key you">You chose:</span>
                    {r.materials.length ? r.materials.map(m => <Chip key={m} mat={m} state="wrong" />)
                      : <span style={{ fontSize: '0.74rem', color: '#c0392b', fontStyle: 'italic' }}>nothing</span>}
                  </div>
                  <div className="a61-rc-line">
                    <span className="a61-rc-key ans">Correct answer:</span>
                    {tile.correctMaterials.map(m => <Chip key={m} mat={m} state="correct" />)}
                  </div>
                  <div className="a61-rc-expl">{tile.explanation}</div>
                </div>
              );
            })
          )}

          <div className="a61-review-foot">
            <button className="a61-cta-primary" onClick={handlePlayAgain}>
              <RotateCcw size={15} strokeWidth={2.5} /> Play again!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAY VIEW (+ result overlay) ───────────────────────────────────────────
  return (
    <div className="a61-root">

      {/* Header */}
      <div className="a61-header">
        <div className="a61-title">{title}</div>
        <div className="a61-subtitle">
          Open each dropdown and <strong>choose the material</strong> every object is made of.
        </div>
      </div>

      {/* Counter bar */}
      <div className="a61-counter-bar">
        <div className="a61-counter-left">
          <span className="a61-counter-text">{answeredCount} / {total} answered</span>
          <div className="a61-progress-track">
            <div className="a61-progress-fill" style={{ width: `${Math.round(filledFraction * 100)}%` }} />
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#FC9145' }}>
            {Math.round(filledFraction * 100)}%
          </span>
        </div>
        <button className="a61-reset-btn" onClick={handleReset}>
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* Body */}
      <div className="a61-body">

        {/* Table panel */}
        <div className="a61-table-panel">
          <div className="a61-table-heading">{tableTitle}</div>
          <div className="a61-table-header-row">
            <div className="a61-table-header-cell">I observe</div>
            <div className="a61-table-header-cell">Materials they are made up of</div>
          </div>

          <div className="a61-table-rows">
            {rows.map((row, idx) => {
              const tile        = getTile(row.tileId!);
              const need        = tile.correctMaterials.length;
              const canAddMore  = row.materials.length < need;

              return (
                <div
                  key={idx}
                  className="a61-table-row filled"
                >
                  {/* Object cell */}
                  <div className="a61-drop-cell">
                    <div className="a61-placed-tile">
                      <span className="a61-placed-emoji">{tile.emoji}</span>
                      <span className="a61-placed-label">{tile.label}</span>
                    </div>
                  </div>

                  {/* Material cell — dropdown */}
                  <div className="a61-mat-cell">
                    <span className="a61-hint">
                      <span className="a61-hint-badge">{need}</span>
                      {need === 1 ? 'Choose the material' : `Choose ${need} materials`}
                    </span>

                    {row.materials.length > 0 && (
                      <div className="a61-mat-chips">
                        {row.materials.map(mat => (
                          <Chip key={mat} mat={mat} onRemove={() => removeMaterial(idx, mat)} />
                        ))}
                      </div>
                    )}

                    {canAddMore && (
                      <button
                        ref={(el) => { triggerRefs.current[idx] = el; }}
                        className={`a61-dd-trigger${openRow === idx ? ' open' : ''}`}
                        onClick={() => toggleDropdown(idx)}
                      >
                        {row.materials.length === 0 ? 'Choose material…' : 'Add another…'}
                        <ChevronDown size={15} className="chev" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Check bar */}
      <div className="a61-checkbar">
        <span className="a61-check-status">
          {ready ? 'All set — check your answers!' : `Fill every row to check (${answeredCount}/${total} done)`}
        </span>
        <button className="a61-check-btn" onClick={handleCheck} disabled={!ready}>
          <Check size={18} strokeWidth={3} /> Check Answers
        </button>
      </div>

      {/* Dropdown panel (fixed) */}
      {openRow !== null && ddPos && (() => {
        const row = rows[openRow];
        const tile = row.tileId ? getTile(row.tileId) : null;
        if (!tile) return null;
        const options = pool.filter(m => !row.materials.includes(m));
        return (
          <div className="a61-dd-panel" style={{ left: ddPos.left, top: ddPos.top, bottom: ddPos.bottom, minWidth: ddPos.width, maxHeight: ddPos.maxH }}>
            {options.length === 0 ? (
              <div className="a61-dd-empty">No materials left</div>
            ) : (
              options.map(mat => (
                <button key={mat} className="a61-dd-option" onClick={() => addMaterial(openRow, mat)}>
                  <span className="a61-dd-name">{cap(mat)}</span>
                </button>
              ))
            )}
          </div>
        );
      })()}

      {/* Result overlay */}
      {phase === 'result' && (
        <div className="a61-overlay">
          <div className="a61-result-card">
            <div className="a61-confetti">
              {confetti.map(c => (
                <span
                  key={c.id}
                  className="a61-confetti-piece"
                  style={{
                    left: `${c.left}%`,
                    background: c.color,
                    transform: `rotate(${c.rotate}deg)`,
                    animationDelay: `${c.delay}ms`,
                    animationDuration: `${c.duration}ms`,
                  }}
                />
              ))}
            </div>

            <div className="a61-result-emoji">{pct >= 0.9 ? '🏆' : pct >= 0.6 ? '🎉' : '💪'}</div>
            <div className="a61-score" style={{ fontSize: tier.scoreSizePx }}>{displayedScore}</div>
            <div className="a61-score-total">out of {total}</div>

            {tier.starCount > 0 && (
              <div className="a61-stars">
                {Array.from({ length: tier.starCount }).map((_, i) =>
                  i < starsFilled
                    ? <span key={i} className="a61-star" style={{ animationDelay: `${300 + i * 180}ms` }}>⭐</span>
                    : <span key={i} className="a61-star empty">⭐</span>
                )}
              </div>
            )}

            <div className="a61-encourage">{encouragement}</div>

            <div className="a61-result-ctas">
              <button className="a61-cta-primary" onClick={handleReview}>
                <Sparkles size={16} /> Let us see what we learned
              </button>
              <button className="a61-cta-secondary" onClick={handlePlayAgain}>
                <RotateCcw size={15} strokeWidth={2.5} /> Play again!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Activity61;