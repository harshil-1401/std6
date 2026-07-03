import React, { useState, useEffect, useCallback } from 'react';
import { Check, RotateCcw, Lightbulb } from 'lucide-react';

interface ClassroomObject {
  id: string; label: string; correctMaterial: string;
  hint: string; x: number; y: number; emoji: string; color: string;
}
interface MaterialOption { id: string; label: string; emoji: string; color: string; }
interface TagState { objectId: string; selectedMaterial: string; correct: boolean; attempts: number; }
interface ClassroomTaggerProps {
  props?: { additionalProps?: { objects?: ClassroomObject[]; materials?: MaterialOption[]; title?: string; }; };
}

const DEFAULT_OBJECTS: ClassroomObject[] = [
  { id:'fan',      label:'Fan Grille',   correctMaterial:'metal',   hint:'Shiny, hard, and conducts electricity.',           x:82, y:14, emoji:'⚙️', color:'#4E4E4E' },
  { id:'chalk',    label:'Chalk',        correctMaterial:'mineral', hint:'Made of calcium carbonate — a soft rock mineral.', x:50, y:22, emoji:'🪨', color:'#888888' },
  { id:'duster',   label:'Duster',       correctMaterial:'cloth',   hint:'Soft fibre that wipes the board clean.',           x:72, y:30, emoji:'🧹', color:'#533086' },
  { id:'notebook', label:'Notebook',     correctMaterial:'paper',   hint:'It can be torn and written on. Trees made me!',   x:14, y:36, emoji:'📓', color:'#4A4DC9' },
  { id:'pen',      label:'Pen',          correctMaterial:'plastic', hint:'Lightweight and moulded into shape. Not metal!',   x:42, y:44, emoji:'🖊️', color:'#FC9145' },
  { id:'bottle',   label:'Water Bottle', correctMaterial:'plastic', hint:'See-through and light — moulded from polymers.',  x:74, y:50, emoji:'🍼', color:'#FC9145' },
  { id:'bag',      label:'School Bag',   correctMaterial:'cloth',   hint:'Woven fibres make me flexible and soft.',          x:20, y:60, emoji:'🎒', color:'#533086' },
  { id:'table',    label:'Table',        correctMaterial:'wood',    hint:'Cut from trees, smooth and sturdy.',               x:56, y:64, emoji:'🪵', color:'#8B5E3C' },
  { id:'chair',    label:'Chair',        correctMaterial:'wood',    hint:'Same as the table — grown in forests!',            x:30, y:78, emoji:'🪑', color:'#8B5E3C' },
  { id:'tile',     label:'Floor Tile',   correctMaterial:'mineral', hint:'Baked clay or stone — hard and cold underfoot.',   x:68, y:82, emoji:'🏗️', color:'#888888' },
];

const DEFAULT_MATERIALS: MaterialOption[] = [
  { id:'paper',   label:'Paper',   emoji:'📄', color:'#4A4DC9' },
  { id:'plastic', label:'Plastic', emoji:'🧪', color:'#FC9145' },
  { id:'metal',   label:'Metal',   emoji:'⚙️', color:'#555555' },
  { id:'wood',    label:'Wood',    emoji:'🌲', color:'#8B5E3C' },
  { id:'cloth',   label:'Cloth',   emoji:'🧵', color:'#533086' },
  { id:'mineral', label:'Mineral', emoji:'🪨', color:'#777777' },
];

const injectCSS = () => {
  if (document.getElementById('ct6')) return;
  const el = document.createElement('style');
  el.id = 'ct6';
  el.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800;900&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ════════════════════════════════════════════
   ROOT — fills viewport, no body scroll
════════════════════════════════════════════ */
.ct {
  font-family: 'Poppins', sans-serif;
  background: linear-gradient(135deg, #eeecff 0%, #fff7f0 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ════════════════════════════════════════════
   HEADER
════════════════════════════════════════════ */
.ct-hd {
  flex-shrink: 0;
  padding: 12px 20px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.ct-logo {
  font-size: clamp(1rem, 2.2vw, 1.5rem);
  font-weight: 900;
  background: linear-gradient(90deg, #533086, #4A4DC9, #FC9145);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  white-space: nowrap;
}
.ct-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.ct-chip {
  background: #fff;
  border: 1.5px solid #C1C1EA;
  border-radius: 20px;
  padding: 3px 11px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  box-shadow: 0 1px 5px rgba(83,48,134,.08);
}

/* ════════════════════════════════════════════
   PROGRESS BAR
════════════════════════════════════════════ */
.ct-bar-wrap { flex-shrink: 0; padding: 0 20px 8px; }
.ct-bar-bg { background: #E5E5F7; border-radius: 99px; height: 7px; overflow: hidden; }
.ct-bar-fg {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #4A4DC9, #FC9145);
  transition: width .5s cubic-bezier(.68, -.55, .27, 1.55);
}

/* ════════════════════════════════════════════
   DESKTOP LAYOUT  (> 768px)
   Two columns: scene | panel
   Both fit exactly in remaining vh — no scroll
════════════════════════════════════════════ */
@media (min-width: 769px) {
  .ct {
    height: 100vh;
    overflow: hidden;
  }
  .ct-body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr 310px;
    gap: 14px;
    padding: 0 16px 14px;
    overflow: hidden;
  }
  /* Scene fills column, fixed height */
  .ct-scene {
    position: relative;
    border-radius: 20px;
    border: 2.5px solid #C1C1EA;
    overflow: hidden;
    min-height: 0;
    background: linear-gradient(155deg, #f5f3ff 0%, #fde8d4 100%);
    box-shadow: 0 6px 24px rgba(83,48,134,.1);
  }
  /* Right panel: flex-col, fills height, no scroll */
  .ct-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    overflow: hidden;
  }
  /* Tagged list stretches to fill remaining panel space */
  .ct-tagged {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  /* Tagged rows spread evenly — no scroll */
  .ct-tagged-rows {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
}

/* ════════════════════════════════════════════
   MOBILE LAYOUT  (≤ 768px)
   Single column, natural page height, scrolls
════════════════════════════════════════════ */
@media (max-width: 768px) {
  .ct {
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .ct-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 12px 16px;
  }
  /* Scene: fixed aspect ratio on mobile */
  .ct-scene {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 65%;   /* 65% of width = 4:6 ratio */
    border-radius: 16px;
    border: 2.5px solid #C1C1EA;
    overflow: hidden;
    background: linear-gradient(155deg, #f5f3ff 0%, #fde8d4 100%);
    box-shadow: 0 4px 18px rgba(83,48,134,.1);
    flex-shrink: 0;
  }
  /* All scene children need absolute because parent is padding-based */
  .ct-scene-inner {
    position: absolute;
    inset: 0;
  }
  /* Right panel: natural height, no overflow */
  .ct-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  /* Tagged list: natural height, all rows visible */
  .ct-tagged {
    flex: none;
    height: auto;
  }
  .ct-tagged-rows {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  /* Slightly smaller text on mobile */
  .ct-rn    { font-size: 0.72rem !important; }
  .ct-mat   { font-size: 0.78rem !important; padding: 9px 8px !important; }
  .ct-logo  { font-size: 1rem !important; }
  .ct-chip  { font-size: 0.65rem !important; padding: 2px 9px !important; }
}

@media (max-width: 420px) {
  .ct-hd    { padding: 10px 14px 6px; }
  .ct-bar-wrap { padding: 0 14px 6px; }
  .ct-body  { padding: 0 10px 14px; }
  .ct-scene { padding-bottom: 72%; }
  .ct-mat   { font-size: 0.72rem !important; padding: 8px 6px !important; }
}

/* ════════════════════════════════════════════
   SCENE INTERNALS (shared desktop + mobile)
════════════════════════════════════════════ */
.ct-grid {
  position: absolute; inset: 0; pointer-events: none;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(193,193,234,.2) 39px, rgba(193,193,234,.2) 40px),
    repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(193,193,234,.14) 39px, rgba(193,193,234,.14) 40px);
}
.ct-deco-wall  { position: absolute; top: 0; left: 0; right: 0; height: 38%; background: linear-gradient(180deg, rgba(193,193,234,.15) 0%, transparent 100%); pointer-events: none; }
.ct-deco-floor { position: absolute; bottom: 0; left: 0; right: 0; height: 16%; background: linear-gradient(0deg, rgba(252,145,69,.1) 0%, transparent 100%); pointer-events: none; }

.ct-board {
  position: absolute;
  top: 5%; left: 24%; width: 42%; height: 25%;
  background: #2a5425;
  border: 4px solid #8B5E3C;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(0,0,0,.2), inset 0 0 20px rgba(0,0,0,.1);
}
.ct-board-txt {
  color: #d4edda; font-weight: 700; text-align: center; padding: 0 6px;
  font-size: clamp(.4rem, 1vw, .74rem); letter-spacing: .02em;
}
.ct-window {
  position: absolute; top: 4%; left: 3%; width: 12%; height: 18%;
  background: linear-gradient(135deg, rgba(193,193,234,.35), rgba(255,255,255,.55));
  border: 2px solid rgba(193,193,234,.55); border-radius: 6px;
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 2px; padding: 3px;
}
.ct-window-pane { background: rgba(255,255,255,.65); border-radius: 2px; }

/* ════════════════════════════════════════════
   OBJECT CHIPS
════════════════════════════════════════════ */
.ct-obj {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer; z-index: 10; will-change: transform;
}
.ct-obj.locked { cursor: default; z-index: 8; }
.ct-obj.active { z-index: 20; }

.ct-chip-box {
  background: #fff;
  border: 2px solid rgba(193,193,234,.65);
  border-radius: 12px;
  padding: 5px 9px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-width: 52px;
  box-shadow: 0 2px 9px rgba(0,0,0,.07);
  transition: all .2s ease;
}
.ct-chip-box.sel {
  background: linear-gradient(135deg, var(--oc), #FC9145);
  border-color: var(--oc);
  box-shadow: 0 5px 16px var(--os);
  transform: scale(1.05);
}
.ct-chip-box.done {
  background: linear-gradient(135deg, #48bb78, #68d391);
  border-color: #38a169;
  box-shadow: 0 3px 10px rgba(72,187,120,.3);
}
.ct-cbe { font-size: clamp(.88rem, 1.8vw, 1.25rem); line-height: 1; }
.ct-cbl {
  font-size: clamp(.36rem, .8vw, .58rem);
  font-weight: 700; text-transform: uppercase; letter-spacing: .3px;
  color: #533086; white-space: nowrap;
}
.ct-chip-box.sel .ct-cbl,
.ct-chip-box.done .ct-cbl { color: #fff; }
.ct-done-row { display: flex; align-items: center; gap: 2px; margin-top: 1px; }
.ct-done-row span { font-size: .44rem; font-weight: 700; color: #fff; text-transform: capitalize; }

.ct-prompt {
  position: absolute; bottom: 9px; left: 50%; transform: translateX(-50%);
  background: rgba(83,48,134,.84); color: #fff;
  border-radius: 20px; padding: 6px 18px;
  font-size: .72rem; font-weight: 700; white-space: nowrap; pointer-events: none;
  box-shadow: 0 4px 12px rgba(83,48,134,.28);
}

/* ════════════════════════════════════════════
   PALETTE CARD
════════════════════════════════════════════ */
.ct-pal {
  flex-shrink: 0;
  background: #fff; border: 2px solid #C1C1EA; border-radius: 18px;
  padding: 14px;
  box-shadow: 0 3px 16px rgba(83,48,134,.07);
}
.ct-pal-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.ct-pal-title { font-weight: 800; font-size: .86rem; color: #533086; }
.ct-pal-badge { background: #C1C1EA33; border-radius: 8px; padding: 2px 9px; font-size: .68rem; color: #4A4DC9; font-weight: 700; }
.ct-pal-idle  { text-align: center; color: #BCBCE0; font-size: .8rem; font-style: italic; padding: 6px 0 3px; }
.ct-mat-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ct-mat {
  border-radius: 11px; padding: 10px 9px;
  display: flex; align-items: center; gap: 7px;
  font-family: 'Poppins', sans-serif; font-weight: 700; font-size: .8rem;
  border: 2px solid var(--mc); background: var(--mb); color: var(--mc);
  cursor: pointer; transition: all .16s ease;
}
.ct-mat:hover { transform: scale(1.04); box-shadow: 0 3px 10px var(--ms); }
.ct-mat-em { font-size: 1.05rem; }

/* ════════════════════════════════════════════
   HINT CARD
════════════════════════════════════════════ */
.ct-hint {
  flex-shrink: 0;
  background: linear-gradient(135deg, #FFF3E4, #FC914515);
  border: 2px solid #FC9145; border-radius: 14px;
  padding: 11px 13px;
  display: flex; gap: 8px; align-items: flex-start;
  animation: ctSlideUp .25s ease;
}
.ct-hint-lbl { font-weight: 800; font-size: .68rem; color: #FC9145; margin-bottom: 2px; }
.ct-hint-txt { font-size: .76rem; color: #533086; font-weight: 600; line-height: 1.4; }

/* ════════════════════════════════════════════
   TAGGED LIST (shared styles)
════════════════════════════════════════════ */
.ct-tagged {
  background: #fff; border: 2px solid #C1C1EA; border-radius: 18px;
  padding: 12px 14px;
  box-shadow: 0 3px 12px rgba(83,48,134,.05);
  display: flex; flex-direction: column;
}
.ct-tagged-ttl { font-weight: 800; font-size: .82rem; color: #533086; margin-bottom: 6px; flex-shrink: 0; }
.ct-row {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 0; border-bottom: 1px solid #F3F2FF;
}
.ct-row:last-child { border-bottom: none; }
.ct-re  { font-size: .9rem; width: 20px; text-align: center; flex-shrink: 0; }
.ct-rn  { flex: 1; font-size: .72rem; font-weight: 600; color: #4E4E4E; }
.ct-r-tap { font-size: .62rem; color: #C0C0DC; font-style: italic; }
.ct-r-ok  { display: flex; align-items: center; gap: 2px; background: #F0FFF4; border-radius: 6px; padding: 2px 7px; }
.ct-r-ok span { font-size: .6rem; font-weight: 700; color: #38a169; text-transform: capitalize; }

/* ════════════════════════════════════════════
   RESET BUTTON
════════════════════════════════════════════ */
.ct-reset {
  flex-shrink: 0;
  background: #fff; border: 2px solid #D0CFEF; border-radius: 12px;
  padding: 9px 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-family: 'Poppins', sans-serif; font-weight: 700; font-size: .78rem; color: #6060A0;
  transition: all .16s ease;
}
.ct-reset:hover { border-color: #4A4DC9; color: #4A4DC9; }

/* ════════════════════════════════════════════
   MODAL
════════════════════════════════════════════ */
.ct-overlay {
  position: fixed; inset: 0; background: rgba(83,48,134,.68);
  display: flex; align-items: center; justify-content: center;
  z-index: 300; backdrop-filter: blur(5px);
}
.ct-modal {
  background: #fff; border-radius: 24px; padding: 30px 34px;
  max-width: 390px; width: 90%; text-align: center;
  box-shadow: 0 20px 60px rgba(83,48,134,.28);
  animation: ctBounce .5s ease;
}
.ct-m-icon  { font-size: 2.8rem; }
.ct-m-title {
  font-weight: 900; font-size: 1.55rem;
  background: linear-gradient(90deg, #533086, #FC9145);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  margin: 9px 0 5px;
}
.ct-m-sub { color: #4E4E4E; font-weight: 600; font-size: .88rem; line-height: 1.5; }
.ct-m-mats {
  background: linear-gradient(135deg, #C1C1EA22, #FFF3E4);
  border-radius: 14px; padding: 12px; margin: 12px 0;
  display: grid; grid-template-columns: 1fr 1fr; gap: 7px;
}
.ct-m-chip { display: flex; align-items: center; gap: 5px; background: #fff; border-radius: 9px; padding: 5px 9px; }
.ct-m-chip-lbl { font-weight: 700; font-size: .75rem; text-transform: capitalize; }
.ct-play-btn {
  background: linear-gradient(135deg, #533086, #4A4DC9);
  color: #fff; border: none; border-radius: 12px; padding: 11px 26px;
  font-family: 'Poppins', sans-serif; font-weight: 700; font-size: .88rem; cursor: pointer;
  box-shadow: 0 4px 14px rgba(74,77,201,.36);
  display: inline-flex; align-items: center; gap: 6px; transition: transform .13s;
}
.ct-play-btn:hover { transform: scale(1.04); }

/* ════════════════════════════════════════════
   KEYFRAMES
════════════════════════════════════════════ */
@keyframes ctShake {
  0%,100% { transform: translate(-50%,-50%) translateX(0); }
  20%     { transform: translate(-50%,-50%) translateX(-7px); }
  40%     { transform: translate(-50%,-50%) translateX(7px); }
  60%     { transform: translate(-50%,-50%) translateX(-4px); }
  80%     { transform: translate(-50%,-50%) translateX(4px); }
}
@keyframes ctFloat {
  0%,100% { transform: translate(-50%,-50%) translateY(0); }
  50%     { transform: translate(-50%,-50%) translateY(-5px); }
}
@keyframes ctPromptBob {
  0%,100% { transform: translateX(-50%) translateY(0); }
  50%     { transform: translateX(-50%) translateY(-4px); }
}
@keyframes ctGlow {
  0%,100% { filter: drop-shadow(0 0 0 transparent); }
  50%     { filter: drop-shadow(0 0 9px rgba(74,77,201,.55)); }
}
@keyframes ctPop {
  0%   { transform: translate(-50%,-50%) scale(.72); opacity: 0; }
  70%  { transform: translate(-50%,-50%) scale(1.1); }
  100% { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
}
@keyframes ctSlideUp {
  from { transform: translateY(10px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes ctBounce {
  0%   { transform: scale(0) rotate(-8deg); opacity: 0; }
  60%  { transform: scale(1.1) rotate(2deg); }
  100% { transform: scale(1) rotate(0);    opacity: 1; }
}
@keyframes ctPulse {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.1); }
}
  `;
  document.head.appendChild(el);
};

// ─── Component ────────────────────────────────────────────────────────────────
const ClassroomTagger: React.FC<ClassroomTaggerProps> = ({ props = {} }) => {
  const { additionalProps = {} } = props;
  const objects   = additionalProps.objects   || DEFAULT_OBJECTS;
  const materials = additionalProps.materials || DEFAULT_MATERIALS;
  const title     = additionalProps.title     || 'Classroom Materials Hunt';

  const [sel,   setSel]   = useState<string | null>(null);
  const [tags,  setTags]  = useState<Record<string, TagState>>({});
  const [shake, setShake] = useState<string | null>(null);
  const [hint,  setHint]  = useState<string | null>(null);
  const [pop,   setPop]   = useState<string | null>(null);
  const [done,  setDone]  = useState(false);

  useEffect(() => { injectCSS(); }, []);

  const correct  = Object.values(tags).filter(t => t.correct).length;
  const distinct = new Set(Object.values(tags).filter(t => t.correct).map(t => t.selectedMaterial)).size;
  const pct      = Math.round((correct / objects.length) * 100);
  const selObj   = objects.find(o => o.id === sel);

  const clickObj = useCallback((id: string) => {
    if (tags[id]?.correct) return;
    setSel(id); setHint(null);
  }, [tags]);

  const pickMat = useCallback((mid: string) => {
    if (!sel) return;
    const obj  = objects.find(o => o.id === sel)!;
    const ok   = obj.correctMaterial === mid;
    const prev = tags[sel]?.attempts || 0;
    const next = { ...tags, [sel]: { objectId: sel, selectedMaterial: mid, correct: ok, attempts: prev + 1 } };
    setTags(next);
    if (ok) {
      setPop(sel); setTimeout(() => setPop(null), 700);
      setSel(null); setHint(null);
      if (Object.values(next).filter(t => t.correct).length === objects.length)
        setTimeout(() => setDone(true), 600);
    } else {
      setShake(sel); setTimeout(() => setShake(null), 500);
      setHint(sel);
    }
  }, [sel, tags, objects]);

  const reset = () => { setTags({}); setSel(null); setHint(null); setDone(false); };

  const objAnim = (o: ClassroomObject) => {
    if (shake === o.id) return 'ctShake .5s ease forwards';
    if (pop   === o.id) return 'ctPop .6s ease forwards';
    if (tags[o.id]?.correct) return 'none';
    if (sel   === o.id) return 'ctGlow 1.5s ease infinite';
    return 'ctFloat 3s ease-in-out infinite';
  };

  // Scene content — same for both desktop and mobile
  const sceneContent = (
    <>
      <div className="ct-grid"/>
      <div className="ct-deco-wall"/>
      <div className="ct-deco-floor"/>
      <div className="ct-window">
        <div className="ct-window-pane"/><div className="ct-window-pane"/>
        <div className="ct-window-pane"/><div className="ct-window-pane"/>
      </div>
      <div className="ct-board">
        <span className="ct-board-txt">Materials Around Us</span>
      </div>
      {objects.map(o => {
        const tag   = tags[o.id];
        const isOk  = tag?.correct;
        const isSel = sel === o.id;
        return (
          <div
            key={o.id}
            className={`ct-obj${isOk ? ' locked' : ''}${isSel ? ' active' : ''}`}
            style={{ left: `${o.x}%`, top: `${o.y}%`, animation: objAnim(o) }}
            onClick={() => clickObj(o.id)}
          >
            <div
              className={`ct-chip-box${isSel ? ' sel' : ''}${isOk ? ' done' : ''}`}
              style={{ '--oc': o.color, '--os': o.color + '55' } as React.CSSProperties}
            >
              <span className="ct-cbe">{o.emoji}</span>
              <span className="ct-cbl">{o.label}</span>
              {isOk && (
                <div className="ct-done-row">
                  <Check size={8} color="#fff" strokeWidth={3}/>
                  <span>{tag.selectedMaterial}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {correct === 0 && !sel && (
        <div className="ct-prompt" style={{ animation: 'ctPromptBob 2s ease-in-out infinite' }}>
          👆 Tap any object to begin!
        </div>
      )}
    </>
  );

  // Panel content — same for both
  const panelContent = (
    <>
      {/* Palette */}
      <div className="ct-pal">
        <div className="ct-pal-hd">
          <span className="ct-pal-title">🎨 Pick a Material</span>
          {selObj && <span className="ct-pal-badge">{selObj.emoji} {selObj.label}</span>}
        </div>
        {!sel ? (
          <div className="ct-pal-idle">← Tap an object in the scene</div>
        ) : (
          <div className="ct-mat-grid">
            {materials.map(m => (
              <button
                key={m.id}
                className="ct-mat"
                style={{ '--mc': m.color, '--mb': m.color + '14', '--ms': m.color + '30' } as React.CSSProperties}
                onClick={() => pickMat(m.id)}
              >
                <span className="ct-mat-em">{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hint */}
      {hint && (
        <div className="ct-hint">
          <Lightbulb size={14} color="#FC9145" style={{ flexShrink: 0, marginTop: 2 }}/>
          <div>
            <div className="ct-hint-lbl">HINT</div>
            <div className="ct-hint-txt">{objects.find(o => o.id === hint)?.hint}</div>
          </div>
        </div>
      )}

      {/* Tagged list */}
      <div className="ct-tagged">
        <div className="ct-tagged-ttl">📋 Tagged Objects</div>
        <div className="ct-tagged-rows">
          {objects.map(o => {
            const tag = tags[o.id];
            return (
              <div
                key={o.id}
                className="ct-row"
                style={tag?.correct ? { animation: 'ctSlideUp .3s ease' } : undefined}
              >
                <span className="ct-re">{o.emoji}</span>
                <span className="ct-rn">{o.label}</span>
                {tag?.correct ? (
                  <div className="ct-r-ok">
                    <Check size={8} color="#38a169" strokeWidth={3}/>
                    <span>{tag.selectedMaterial}</span>
                  </div>
                ) : (
                  <span className="ct-r-tap">tap it</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      <button className="ct-reset" onClick={reset}>
        <RotateCcw size={12}/> Reset Game
      </button>
    </>
  );

  return (
    <div className="ct">
      {/* Header */}
      <div className="ct-hd">
        <div className="ct-logo">{title}</div>
        <div className="ct-chips">
          <div className="ct-chip"><span>🎯</span><span style={{ color: '#4A4DC9' }}>{correct}/{objects.length} Tagged</span></div>
          <div className="ct-chip"><span>🧩</span><span style={{ color: '#533086' }}>{distinct} Material{distinct !== 1 ? 's' : ''}</span></div>
          <div className="ct-chip"><span>⚡</span><span style={{ color: '#FC9145' }}>{pct}%</span></div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="ct-bar-wrap">
        <div className="ct-bar-bg"><div className="ct-bar-fg" style={{ width: `${pct}%` }}/></div>
      </div>

      {/* Body */}
      <div className="ct-body">
        {/* Scene */}
        <div className="ct-scene">
          {/* Mobile uses padding-bottom trick so we need inner wrapper */}
          <div className="ct-scene-inner">
            {sceneContent}
          </div>
        </div>

        {/* Right Panel */}
        <div className="ct-panel">
          {panelContent}
        </div>
      </div>

      {/* Completion Modal */}
      {done && (
        <div className="ct-overlay">
          <div className="ct-modal">
            <div className="ct-m-icon" style={{ animation: 'ctPulse 1s ease infinite' }}>🏆</div>
            <div className="ct-m-title">Excellent Work!</div>
            <p className="ct-m-sub">
              You tagged all <strong>{objects.length} objects</strong> and discovered{' '}
              <strong>{distinct} distinct materials</strong>!
            </p>
            <div className="ct-m-mats">
              {Array.from(new Set(Object.values(tags).filter(t => t.correct).map(t => t.selectedMaterial))).map(mid => {
                const m = materials.find(m => m.id === mid);
                return m ? (
                  <div key={mid} className="ct-m-chip" style={{ border: `2px solid ${m.color}44` }}>
                    <span>{m.emoji}</span>
                    <span className="ct-m-chip-lbl" style={{ color: m.color }}>{m.label}</span>
                  </div>
                ) : null;
              })}
            </div>
            <button className="ct-play-btn" onClick={reset}>
              <RotateCcw size={12}/> Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomTagger;