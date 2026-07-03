import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, CheckCircle, Star, Layers, ChevronRight, Lock, XCircle } from 'lucide-react';

// ── Keyframes ──────────────────────────────────────────────────────────────────
const injectKeyframes = () => {
  const id = 'mc-kf';
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    @keyframes fadeUp     { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes popIn      { 0%{transform:scale(.7);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
    @keyframes correctDrop{ 0%{transform:scale(1)} 30%{transform:scale(1.18)} 60%{transform:scale(.95)} 100%{transform:scale(1)} }
    @keyframes shakeBin   { 0%{transform:translateX(0)} 18%{transform:translateX(-8px)} 36%{transform:translateX(8px)} 54%{transform:translateX(-6px)} 72%{transform:translateX(6px)} 90%{transform:translateX(-2px)} 100%{transform:translateX(0)} }
    @keyframes shakeTile  { 0%{transform:rotate(0deg)} 20%{transform:rotate(-6deg)} 40%{transform:rotate(6deg)} 60%{transform:rotate(-4deg)} 80%{transform:rotate(4deg)} 100%{transform:rotate(0deg)} }
    @keyframes confetti   { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(80px) rotate(720deg);opacity:0} }
    @keyframes binGlow    { 0%,100%{box-shadow:0 4px 24px rgba(83,48,134,.10)} 50%{box-shadow:0 4px 32px rgba(83,48,134,.28)} }
    @keyframes trayFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    @keyframes wobble     { 0%,100%{transform:rotate(-2deg) scale(1.06)} 50%{transform:rotate(2deg) scale(1.06)} }
    @keyframes badgePop   { 0%{transform:scale(0) rotate(-10deg);opacity:0} 80%{transform:scale(1.1) rotate(3deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
    @keyframes slideIn    { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
    @keyframes unlockPop  { 0%{transform:scale(0.5) rotate(-8deg);opacity:0} 70%{transform:scale(1.08) rotate(2deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
    @keyframes pulseRing  { 0%{box-shadow:0 0 0 0 rgba(83,48,134,.45)} 70%{box-shadow:0 0 0 12px rgba(83,48,134,0)} 100%{box-shadow:0 0 0 0 rgba(83,48,134,0)} }
    @keyframes hintSlide  { 0%{opacity:0;transform:translateY(-10px) scale(.95)} 100%{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes hintFadeOut{ 0%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
    @keyframes wrongFlashBin { 0%{background:#fee2e2} 60%{background:#fee2e2} 100%{background:inherit} }
    @keyframes greenPulse { 0%,100%{box-shadow:0 4px 20px rgba(34,197,94,.15)} 50%{box-shadow:0 4px 28px rgba(34,197,94,.35)} }
  `;
  document.head.appendChild(s);
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface ObjectItem {
  id: string; emoji: string; name: string; material: string;
  shine: 'shiny' | 'dull' | 'mixed';
  hardness: 'hard' | 'soft' | 'mixed';
  colour: 'warm' | 'cool' | 'neutral';
  shape: 'flat' | 'round' | 'block';
}
interface BinDef  { id: string; label: string; color: string; bg: string; border: string; emoji: string; }
interface PropDef { key: string; label: string; bins: BinDef[]; }
interface ClassifierProps {
  props?: { darkMode?: boolean; additionalProps?: { objects?: ObjectItem[]; properties?: PropDef[]; }; };
}
interface HintState { objId: string; objName: string; objEmoji: string; correctBinLabel: string; correctBinColor: string; }

// ── Default data ───────────────────────────────────────────────────────────────
const DEFAULT_OBJECTS: ObjectItem[] = [
  { id:'spoon',  emoji:'🥄', name:'Steel Spoon',  material:'metal',   shine:'shiny', hardness:'hard', colour:'neutral', shape:'flat'  },
  { id:'pot',    emoji:'🪴', name:'Clay Pot',     material:'clay',    shine:'dull',  hardness:'hard', colour:'warm',    shape:'round' },
  { id:'scarf',  emoji:'🧣', name:'Cotton Scarf', material:'cloth',   shine:'dull',  hardness:'soft', colour:'warm',    shape:'flat'  },
  { id:'ball',   emoji:'🏀', name:'Plastic Ball', material:'plastic', shine:'mixed', hardness:'hard', colour:'warm',    shape:'round' },
  { id:'marble', emoji:'🔮', name:'Glass Marble', material:'glass',   shine:'shiny', hardness:'hard', colour:'cool',    shape:'round' },
  { id:'rubber', emoji:'🔴', name:'Rubber Band',  material:'rubber',  shine:'mixed', hardness:'soft', colour:'warm',    shape:'flat'  },
  { id:'wood',   emoji:'🟫', name:'Wooden Block', material:'wood',    shine:'dull',  hardness:'hard', colour:'warm',    shape:'block' },
  { id:'paper',  emoji:'📄', name:'Paper Sheet',  material:'paper',   shine:'dull',  hardness:'soft', colour:'neutral', shape:'flat'  },
  { id:'sponge', emoji:'🧽', name:'Sponge',       material:'sponge',  shine:'dull',  hardness:'soft', colour:'warm',    shape:'block' },
  { id:'ice',    emoji:'🧊', name:'Ice Cube',     material:'ice',     shine:'shiny', hardness:'hard', colour:'cool',    shape:'block' },
];

const DEFAULT_PROPERTIES: PropDef[] = [
  {
    key:'shine', label:'Shine / Lustre',
    bins:[
      { id:'shiny', label:'Shiny (Lustrous)',     color:'#533086', bg:'linear-gradient(135deg,#f0ecfa,#e6dff5)', border:'#C1C1EA', emoji:'✨' },
      { id:'dull',  label:'Dull (Non-Lustrous)',  color:'#4E4E4E', bg:'linear-gradient(135deg,#f5f5f5,#ebebeb)', border:'#CACACA', emoji:'🪨' },
      { id:'mixed', label:'Somewhere In Between', color:'#FF7212', bg:'linear-gradient(135deg,#fff3e4,#ffe8cc)', border:'#FFF3E4', emoji:'🌗' },
    ],
  },
  {
    key:'hardness', label:'Hardness',
    bins:[
      { id:'hard',  label:'Hard',  color:'#533086', bg:'linear-gradient(135deg,#f0ecfa,#e6dff5)', border:'#C1C1EA', emoji:'💎' },
      { id:'soft',  label:'Soft',  color:'#FC9145', bg:'linear-gradient(135deg,#fff3e4,#ffe8cc)', border:'#FFF3E4', emoji:'🧸' },
      { id:'mixed', label:'Mixed', color:'#4E4E4E', bg:'linear-gradient(135deg,#f5f5f5,#ebebeb)', border:'#CACACA', emoji:'⚖️' },
    ],
  },
  {
    key:'colour', label:'Colour Tone',
    bins:[
      { id:'warm',    label:'Warm Tones',    color:'#FC9145', bg:'linear-gradient(135deg,#fff3e4,#ffe8cc)', border:'#FFF3E4', emoji:'🔥' },
      { id:'cool',    label:'Cool Tones',    color:'#4A4DC9', bg:'linear-gradient(135deg,#eeeffe,#d8d9fc)', border:'#C1C1EA', emoji:'❄️' },
      { id:'neutral', label:'Neutral Tones', color:'#4E4E4E', bg:'linear-gradient(135deg,#f5f5f5,#ebebeb)', border:'#CACACA', emoji:'⚪' },
    ],
  },
  {
    key:'shape', label:'Shape',
    bins:[
      { id:'flat',  label:'Flat / Thin',  color:'#4A4DC9', bg:'linear-gradient(135deg,#eeeffe,#d8d9fc)', border:'#C1C1EA', emoji:'📋' },
      { id:'round', label:'Round / Oval', color:'#533086', bg:'linear-gradient(135deg,#f0ecfa,#e6dff5)', border:'#C1C1EA', emoji:'⭕' },
      { id:'block', label:'Block / Cube', color:'#FC9145', bg:'linear-gradient(135deg,#fff3e4,#ffe8cc)', border:'#FFF3E4', emoji:'📦' },
    ],
  },
  {
    key:'material', label:'Material Type',
    bins:[
      { id:'metal',   label:'Metal / Glass / Ice',       color:'#4A4DC9', bg:'linear-gradient(135deg,#eeeffe,#d8d9fc)', border:'#C1C1EA', emoji:'🔩' },
      { id:'natural', label:'Natural (Clay/Wood/Cotton)', color:'#533086', bg:'linear-gradient(135deg,#f0ecfa,#e6dff5)', border:'#C1C1EA', emoji:'🌿' },
      { id:'other',   label:'Synthetic / Other',         color:'#FC9145', bg:'linear-gradient(135deg,#fff3e4,#ffe8cc)', border:'#FFF3E4', emoji:'🏭' },
    ],
  },
];

const MATERIAL_BIN_MAP: Record<string, string> = {
  metal:'metal', glass:'metal', ice:'metal',
  clay:'natural', wood:'natural', cloth:'natural', paper:'natural',
  plastic:'other', rubber:'other', sponge:'other',
};

function getCorrectBin(obj: ObjectItem, propKey: string): string {
  if (propKey === 'material') return MATERIAL_BIN_MAP[obj.material] ?? 'other';
  return (obj as any)[propKey] ?? '';
}

// ── Confetti ───────────────────────────────────────────────────────────────────
const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const colors = ['#533086','#FC9145','#4A4DC9','#FF7212','#C1C1EA'];
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999, overflow:'hidden' }}>
      {Array.from({ length:26 }, (_,i) => (
        <div key={i} style={{
          position:'absolute', left:`${3+(i*3.8)%94}%`, top:-14,
          width:10, height:10,
          borderRadius: i%3===0?'50%':i%3===1?'2px':'0',
          background: colors[i%colors.length],
          animation:`confetti ${0.65+(i%4)*0.2}s ease-in ${(i%8)*0.06}s forwards`,
          transform:`rotate(${i*29}deg)`,
        }}/>
      ))}
    </div>
  );
};

// ── Step Bar ───────────────────────────────────────────────────────────────────
const StepBar: React.FC<{
  properties: PropDef[]; currentStep: number; completedSteps: number[]; isMobile: boolean;
}> = ({ properties, currentStep, completedSteps, isMobile }) => (
  <div style={{ background:'#fff', borderRadius:16, padding:isMobile?'14px 12px':'16px 20px', marginBottom:16, boxShadow:'0 2px 16px rgba(83,48,134,0.09)', border:'1.5px solid #e6dff5' }}>
    <p style={{ margin:'0 0 10px', fontSize:10, fontWeight:700, color:'#CACACA', textTransform:'uppercase', letterSpacing:1.3 }}>
      {'Classify By — Step '+(currentStep+1)+' of '+properties.length}
    </p>
    <div style={{ display:'flex', gap:isMobile?5:8, flexWrap:'wrap' }}>
      {properties.map((p,i) => {
        const done   = completedSteps.includes(i);
        const active = i === currentStep;
        const locked = i > currentStep && !done;
        return (
          <div key={p.key} style={{
            display:'flex', alignItems:'center', gap:5,
            padding:isMobile?'6px 11px':'8px 16px', borderRadius:99,
            background: done||active ? 'linear-gradient(135deg,#533086,#4A4DC9)' : '#F5F5F5',
            border: active||done ? '2px solid #533086' : '2px solid #EBEBEB',
            opacity: locked ? 0.42 : 1,
            transition:'all .3s ease',
            animation: active ? 'popIn .3s ease both' : 'none',
            boxShadow: active ? '0 4px 16px rgba(83,48,134,.28)' : 'none',
          }}>
            {done && !active
              ? <span style={{fontSize:11}}>✅</span>
              : locked
              ? <Lock size={10} color="#CACACA"/>
              : <span style={{fontSize:11, color:active?'#fff':'#4E4E4E'}}>{i+1}</span>
            }
            <span style={{ fontSize:isMobile?10:12, fontWeight:active||done?700:500, color:active||done?'#fff':locked?'#CACACA':'#4E4E4E', whiteSpace:'nowrap' }}>
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Hint Toast ─────────────────────────────────────────────────────────────────
const HintToast: React.FC<{ hint: HintState | null; isMobile: boolean }> = ({ hint, isMobile }) => {
  if (!hint) return null;
  return (
    <div style={{
      position:'fixed', top:isMobile?14:20, left:'50%', transform:'translateX(-50%)',
      zIndex:10000, pointerEvents:'none',
      background:'#1e1b4b', borderRadius:16,
      padding:isMobile?'12px 16px':'14px 22px',
      boxShadow:'0 8px 40px rgba(0,0,0,.35)',
      display:'flex', alignItems:'center', gap:12,
      maxWidth:isMobile?320:460, width:'92vw',
      animation:'hintSlide .25s cubic-bezier(.34,1.56,.64,1) both',
    }}>
      <div style={{ background:'#ef4444', borderRadius:10, width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <XCircle size={20} color="#fff"/>
      </div>
      <div>
        <p style={{ margin:'0 0 3px', fontSize:13, fontWeight:800, color:'#fff' }}>
          <span style={{fontSize:16, marginRight:4}}>{hint.objEmoji}</span>
          {hint.objName + ' doesn\'t belong here!'}
        </p>
        <p style={{ margin:0, fontSize:12, color:'rgba(255,255,255,.72)', lineHeight:1.4 }}>
          {'It should go in '}
          <span style={{ fontWeight:700, color:hint.correctBinColor, background:'rgba(255,255,255,.1)', padding:'1px 8px', borderRadius:6 }}>
            {hint.correctBinLabel}
          </span>
        </p>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const MaterialClassifier: React.FC<ClassifierProps> = ({ props: toolProps = {} }) => {
  const { additionalProps = {}, darkMode = false } = toolProps;
  const objects: ObjectItem[] = additionalProps.objects ?? DEFAULT_OBJECTS;
  const properties: PropDef[] = (additionalProps.properties as PropDef[]) ?? DEFAULT_PROPERTIES;

  // Step state
  const [currentStep, setCurrentStep]       = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [allDone, setAllDone]               = useState(false);

  // Game state
  const [bins, setBins]               = useState<Record<string, string[]>>({});
  const [tray, setTray]               = useState<string[]>(objects.map(o => o.id));
  const [dragging, setDragging]       = useState<string | null>(null);
  const [dragOverBin, setDragOverBin] = useState<string | null>(null);
  const [correctDropId, setCorrectDropId] = useState<string | null>(null);   // tile just placed correctly
  const [wrongBinId, setWrongBinId]       = useState<string | null>(null);   // bin shaking due to wrong drop
  const [wrongTileId, setWrongTileId]     = useState<string | null>(null);   // tile shaking in tray
  const [hint, setHint]                   = useState<HintState | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confetti, setConfetti]       = useState(false);
  const [stepComplete, setStepComplete] = useState(false);

  // UI state
  const [mounted, setMounted]     = useState(false);
  const [isMobile, setIsMobile]   = useState(false);
  const [touchDragId, setTouchDragId] = useState<string | null>(null);
  const [touchPos, setTouchPos]       = useState<{ x: number; y: number } | null>(null);
  const binRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { injectKeyframes(); setMounted(true); }, []);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const initStep = useCallback((stepIdx: number) => {
    const prop = properties[stepIdx];
    const empty: Record<string, string[]> = {};
    prop.bins.forEach(b => { empty[b.id] = []; });
    setBins(empty);
    setTray(objects.map(o => o.id));
    setStepComplete(false);
    setDragging(null); setDragOverBin(null);
    setCorrectDropId(null); setWrongBinId(null); setWrongTileId(null); setHint(null);
  }, [properties, objects]);

  useEffect(() => { initStep(currentStep); }, [currentStep]);

  // ── Core drop logic: validate on every drop ──────────────────────────────────
  const handleAttemptDrop = (binId: string, objId: string) => {
    if (!objId) return;
    const obj = objects.find(o => o.id === objId);
    if (!obj) return;
    const prop = properties[currentStep];
    const correct = getCorrectBin(obj, prop.key);

    if (correct === binId) {
      // ✅ CORRECT — accept drop
      const newTray = tray.filter(id => id !== objId);
      const newBins = { ...bins, [binId]: [...(bins[binId] ?? []), objId] };
      setTray(newTray);
      setBins(newBins);
      setCorrectDropId(objId);
      setTimeout(() => setCorrectDropId(null), 600);
      // clear any existing hint
      setHint(null);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      // check if step complete
      if (newTray.length === 0) {
        setStepComplete(true);
        setConfetti(true);
        setTimeout(() => setConfetti(false), 1500);
      }
    } else {
      // ❌ WRONG — reject drop, stay in tray, shake + hint
      // shake the bin
      setWrongBinId(binId);
      setTimeout(() => setWrongBinId(null), 600);
      // shake the tile in tray
      setWrongTileId(objId);
      setTimeout(() => setWrongTileId(null), 600);
      // show hint toast
      const correctBin = prop.bins.find(b => b.id === correct);
      setHint({
        objId, objName: obj.name, objEmoji: obj.emoji,
        correctBinLabel: correctBin?.label ?? correct,
        correctBinColor: correctBin?.color ?? '#FC9145',
      });
      // auto-dismiss hint after 2.8s
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setHint(null), 2800);
    }
  };

  const goNextStep = () => {
    const done = [...completedSteps];
    if (!done.includes(currentStep)) done.push(currentStep);
    setCompletedSteps(done);
    if (currentStep < properties.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      setAllDone(true);
    }
  };

  const replayStep = (idx: number) => { setAllDone(false); setCurrentStep(idx); initStep(idx); };

  // ── Desktop drag handlers ────────────────────────────────────────────────────
  const onDragStart    = (e: React.DragEvent, id: string) => { setDragging(id); e.dataTransfer.setData('text/plain', id); };
  const onDragEnd      = () => { setDragging(null); setDragOverBin(null); };
  const onBinDragOver  = (e: React.DragEvent, binId: string) => { e.preventDefault(); setDragOverBin(binId); };
  const onBinDragLeave = () => setDragOverBin(null);
  const onBinDrop      = (e: React.DragEvent, binId: string) => {
    e.preventDefault();
    handleAttemptDrop(binId, e.dataTransfer.getData('text/plain'));
    setDragging(null); setDragOverBin(null);
  };

  // ── Touch drag handlers ──────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent, id: string) => {
    setTouchDragId(id); const t = e.touches[0]; setTouchPos({ x:t.clientX, y:t.clientY });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0]; setTouchPos({ x:t.clientX, y:t.clientY });
  };
  const onTouchEnd = () => {
    if (!touchDragId || !touchPos) { setTouchDragId(null); setTouchPos(null); return; }
    let dropped = false;
    for (const [binId, ref] of Object.entries(binRefs.current)) {
      if (!ref) continue;
      const r = ref.getBoundingClientRect();
      if (touchPos.x>=r.left && touchPos.x<=r.right && touchPos.y>=r.top && touchPos.y<=r.bottom) {
        handleAttemptDrop(binId, touchDragId);
        dropped = true; break;
      }
    }
    setTouchDragId(null); setTouchPos(null);
  };

  const prop        = properties[currentStep];
  const totalPlaced = objects.length - tray.length;
  const bg          = darkMode ? '#1a1228' : '#f8f7ff';
  const surface     = darkMode ? '#231a35' : '#ffffff';
  const subtext     = darkMode ? '#a89ecb' : '#4E4E4E';

  const nextLabel = currentStep < properties.length - 1 ? 'Next Property' : 'See Results';
  const nextHint  = currentStep < properties.length - 1
    ? 'Next: classify by "' + properties[currentStep+1].label + '"'
    : 'You have completed all properties!';

  // ── ALL DONE screen ──────────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div style={{ fontFamily:"'Poppins',sans-serif", background:bg, minHeight:'100vh', width:'100%', padding:isMobile?'14px 8px':'24px 16px', boxSizing:'border-box' }}>
        <Confetti active={confetti}/>
        <div style={{ background:'linear-gradient(135deg,#533086 0%,#4A4DC9 60%,#FC9145 100%)', borderRadius:20, padding:isMobile?'18px 16px':'22px 30px', marginBottom:20, boxShadow:'0 8px 32px rgba(83,48,134,.25)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,.07)' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4, position:'relative', zIndex:1 }}>
            <Layers size={isMobile?20:24} color="#fff"/>
            <h1 style={{ margin:0, fontSize:isMobile?17:24, fontWeight:800, color:'#fff', letterSpacing:'-.5px' }}>Material Classifier</h1>
          </div>
          <p style={{ margin:0, color:'rgba(255,255,255,.82)', fontSize:isMobile?11:13, fontWeight:500, position:'relative', zIndex:1 }}>NCERT Grade 6 · Chapter 6 — Materials Around Us · Activity 6.2</p>
        </div>
        <div style={{ background:'linear-gradient(135deg,#533086,#4A4DC9)', borderRadius:20, padding:isMobile?'22px 16px':'32px 36px', marginBottom:20, textAlign:'center', boxShadow:'0 8px 32px rgba(83,48,134,.30)', animation:'popIn .5s ease both' }}>
          <div style={{ fontSize:isMobile?48:64, marginBottom:12 }}>🏆</div>
          <h2 style={{ margin:'0 0 8px', fontSize:isMobile?20:28, fontWeight:800, color:'#fff' }}>Brilliant! All Done!</h2>
          <p style={{ margin:'0 0 20px', color:'rgba(255,255,255,.82)', fontSize:isMobile?13:15 }}>
            {'You correctly classified all '+objects.length+' objects by all '+properties.length+' properties!'}
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center' }}>
            {properties.map(p => (
              <div key={p.key} style={{ padding:'8px 18px', borderRadius:99, background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.3)', color:'#fff', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                <span>✅</span><span>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ margin:'0 0 12px', fontSize:12, fontWeight:700, color:subtext, textTransform:'uppercase', letterSpacing:1 }}>Re-classify by any property</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
          {properties.map((p,i) => (
            <button key={p.key} onClick={() => replayStep(i)} style={{ padding:isMobile?'10px 16px':'11px 20px', borderRadius:99, border:'2px solid #C1C1EA', background:surface, color:'#533086', fontSize:isMobile?12:13, fontWeight:700, cursor:'pointer', fontFamily:"'Poppins',sans-serif", display:'flex', alignItems:'center', gap:7, transition:'all .2s ease' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='linear-gradient(135deg,#f0ecfa,#e6dff5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background=surface; }}
            >
              <RotateCcw size={14}/><span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── GAME screen ──────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Poppins',sans-serif", background:bg, minHeight:'100vh', width:'100%', padding:isMobile?'12px 8px':'24px 16px', boxSizing:'border-box', position:'relative', animation:mounted?'fadeUp 0.5s ease both':'none' }}>
      <Confetti active={confetti}/>

      {/* Hint toast — fixed top center */}
      <HintToast hint={hint} isMobile={isMobile}/>

      {/* Touch ghost tile */}
      {touchDragId && touchPos && (() => {
        const obj = objects.find(o => o.id === touchDragId);
        if (!obj) return null;
        return (
          <div style={{ position:'fixed', left:touchPos.x-36, top:touchPos.y-36, zIndex:9998, pointerEvents:'none', width:72, height:72, borderRadius:16, background:surface, border:'2px solid #533086', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontSize:26, opacity:.9, boxShadow:'0 8px 32px rgba(83,48,134,.35)' }}>
            <span>{obj.emoji}</span>
          </div>
        );
      })()}

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg,#533086 0%,#4A4DC9 60%,#FC9145 100%)', borderRadius:20, padding:isMobile?'18px 16px':'22px 30px', marginBottom:16, position:'relative', overflow:'hidden', boxShadow:'0 8px 32px rgba(83,48,134,.25)' }}>
        <div style={{ position:'absolute', top:-20, right:-20, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,.07)' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4, position:'relative', zIndex:1 }}>
          <Layers size={isMobile?20:24} color="#fff"/>
          <h1 style={{ margin:0, fontSize:isMobile?17:24, fontWeight:800, color:'#fff', letterSpacing:'-.5px' }}>Material Classifier</h1>
        </div>
        <p style={{ margin:0, color:'rgba(255,255,255,.82)', fontSize:isMobile?11:13, fontWeight:500, position:'relative', zIndex:1 }}>NCERT Grade 6 · Chapter 6 — Materials Around Us · Activity 6.2</p>
        <div style={{ marginTop:14, position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ color:'rgba(255,255,255,.9)', fontSize:11, fontWeight:600 }}>{totalPlaced+' / '+objects.length+' sorted'}</span>
            <span style={{ color:'rgba(255,255,255,.75)', fontSize:11 }}>{'Property '+(currentStep+1)+' of '+properties.length}</span>
          </div>
          <div style={{ background:'rgba(255,255,255,.2)', borderRadius:99, height:7, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background:'#FC9145', width:`${(totalPlaced/objects.length)*100}%`, transition:'width .4s cubic-bezier(.34,1.56,.64,1)' }}/>
          </div>
        </div>
      </div>

      {/* ── Step Bar ───────────────────────────────────────────────────────────── */}
      <StepBar properties={properties} currentStep={currentStep} completedSteps={completedSteps} isMobile={isMobile}/>

      {/* ── Bins (above tray) ──────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':('repeat('+prop.bins.length+',1fr)'), gap:12, marginBottom:14, animation:'slideIn .35s ease both' }}>
        {prop.bins.map(bin => {
          const isOver    = dragOverBin === bin.id;
          const isShaking = wrongBinId === bin.id;
          const itemsInBin = (bins[bin.id] ?? []).map(id => objects.find(o => o.id === id)!).filter(Boolean);
          const allCorrect = itemsInBin.length > 0 && stepComplete;

          return (
            <div key={bin.id} ref={el => { binRefs.current[bin.id] = el; }}
              onDragOver={e => onBinDragOver(e, bin.id)} onDragLeave={onBinDragLeave} onDrop={e => onBinDrop(e, bin.id)}
              style={{
                background: bin.bg,
                border: '2.5px '+(isOver?'solid':'dashed')+' '+(isShaking?'#ef4444':allCorrect?'#22c55e':bin.border),
                borderRadius:18, padding:'14px 12px', minHeight:130,
                transition:'border-color .2s ease, box-shadow .2s ease',
                transform: isOver ? 'scale(1.025)' : 'scale(1)',
                boxShadow: isShaking
                  ? '0 0 0 3px rgba(239,68,68,.35), 0 4px 20px rgba(239,68,68,.2)'
                  : isOver
                  ? '0 8px 32px rgba(83,48,134,.22)'
                  : allCorrect
                  ? '0 4px 20px rgba(34,197,94,.22)'
                  : itemsInBin.length>0
                  ? '0 4px 24px rgba(83,48,134,.14)'
                  : '0 2px 12px rgba(83,48,134,.07)',
                animation: isShaking ? 'shakeBin .5s ease' : 'none',
                position:'relative',
              }}>

              {/* Bin header */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ fontSize:20 }}>{bin.emoji}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:isMobile?12:13, fontWeight:700, color:bin.color }}>{bin.label}</p>
                  <p style={{ margin:0, fontSize:10, color:subtext }}>{itemsInBin.length+' '+(itemsInBin.length!==1?'items':'item')}</p>
                </div>
                {itemsInBin.length > 0 && (
                  <div style={{ background:allCorrect?'#22c55e':bin.color, color:'#fff', borderRadius:99, width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, animation:'badgePop .3s ease both' }}>
                    {allCorrect ? '✓' : itemsInBin.length}
                  </div>
                )}
              </div>

              {/* Drop highlight overlay */}
              {isOver && dragging && (
                <div style={{ position:'absolute', inset:0, borderRadius:18, background:bin.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, pointerEvents:'none', zIndex:5 }}>⬇️</div>
              )}

              {/* Wrong-drop flash overlay */}
              {isShaking && (
                <div style={{ position:'absolute', inset:0, borderRadius:18, background:'rgba(239,68,68,.08)', pointerEvents:'none', zIndex:4 }}/>
              )}

              {/* Items in bin */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {itemsInBin.map(obj => (
                  <div key={obj.id} style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                    padding:'6px 10px', borderRadius:12,
                    background: stepComplete ? '#f0fdf4' : surface,
                    border:'1.5px solid '+(stepComplete?'#22c55e':bin.border),
                    animation: correctDropId===obj.id ? 'correctDrop .5s ease both' : 'popIn .3s ease both',
                    boxShadow:'0 1px 6px rgba(0,0,0,.07)',
                    position:'relative',
                  }}>
                    <span style={{ fontSize:isMobile?18:22 }}>{obj.emoji}</span>
                    <span style={{ fontSize:9, fontWeight:600, color:stepComplete?'#16a34a':bin.color, textAlign:'center', maxWidth:64 }}>{obj.name}</span>
                    {stepComplete && (
                      <div style={{ position:'absolute', top:-7, right:-7, background:'#22c55e', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', animation:'badgePop .3s ease both' }}>
                        <span style={{ fontSize:9, color:'#fff', fontWeight:800 }}>✓</span>
                      </div>
                    )}
                  </div>
                ))}
                {itemsInBin.length===0 && !isOver && (
                  <p style={{ color:'#CACACA', fontSize:11, fontStyle:'italic', margin:'2px 0 0' }}>Drop objects here</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Objects Tray (below bins) ───────────────────────────────────────────── */}
      <div style={{ background:surface, border:'2px dashed #C1C1EA', borderRadius:18, padding:isMobile?'12px 10px':'16px 18px', marginBottom:16, minHeight:80, boxShadow:'0 2px 14px rgba(83,48,134,.07)', animation:'trayFloat 4s ease-in-out infinite' }}>
        <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:'#533086', textTransform:'uppercase', letterSpacing:1 }}>
          {'🗂 Objects Tray — '+(tray.length>0 ? tray.length+' remaining' : 'All sorted! 🎉')}
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:isMobile?7:10 }}>
          {tray.map(id => {
            const obj = objects.find(o => o.id === id)!;
            const isDrag    = dragging === id || touchDragId === id;
            const isWrong   = wrongTileId === id;
            return (
              <div key={id} draggable
                onDragStart={e => onDragStart(e, id)} onDragEnd={onDragEnd}
                onTouchStart={e => onTouchStart(e, id)} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  padding:isMobile?'8px 10px':'10px 14px', borderRadius:14,
                  background: isDrag
                    ? 'linear-gradient(135deg,#f0ecfa,#e6dff5)'
                    : isWrong
                    ? '#fee2e2'
                    : 'linear-gradient(135deg,#fafafa,#f0f0fa)',
                  border: isDrag
                    ? '2px solid #533086'
                    : isWrong
                    ? '2px solid #ef4444'
                    : '2px solid #EBEBEB',
                  cursor:'grab', userSelect:'none', touchAction:'none',
                  animation: isWrong ? 'shakeTile .5s ease' : isDrag ? 'wobble .5s ease infinite' : 'popIn .3s ease both',
                  boxShadow: isDrag ? '0 8px 28px rgba(83,48,134,.28)' : isWrong ? '0 4px 16px rgba(239,68,68,.20)' : '0 2px 8px rgba(0,0,0,.07)',
                  opacity: touchDragId===id ? 0.4 : 1,
                  transition:'background .2s, border .2s, box-shadow .2s',
                }}>
                <span style={{ fontSize:isMobile?24:28 }}>{obj.emoji}</span>
                <span style={{ fontSize:isMobile?9:11, fontWeight:600, color:isWrong?'#ef4444':'#533086', textAlign:'center', maxWidth:70 }}>{obj.name}</span>
              </div>
            );
          })}
          {tray.length===0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, color:'#22c55e', fontWeight:700, fontSize:13, animation:'badgePop .5s ease both' }}>
              <Star size={17} fill="#22c55e"/><span>All sorted correctly!</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Step complete banner + Next ─────────────────────────────────────────── */}
      {stepComplete && (
        <div style={{ background:'linear-gradient(135deg,#533086,#4A4DC9)', borderRadius:18, padding:isMobile?'18px 16px':'22px 28px', marginBottom:14, animation:'unlockPop .5s cubic-bezier(.34,1.56,.64,1) both', boxShadow:'0 8px 32px rgba(83,48,134,.32)', display:'flex', flexWrap:'wrap', alignItems:'center', gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <CheckCircle size={22} color="#FC9145"/>
              <p style={{ margin:0, color:'#fff', fontWeight:800, fontSize:isMobile?14:17 }}>
                {'"'+prop.label+'" — Perfect! ✅'}
              </p>
            </div>
            <p style={{ margin:0, color:'rgba(255,255,255,.78)', fontSize:isMobile?12:13 }}>{nextHint}</p>
          </div>
          <button onClick={goNextStep} style={{ display:'flex', alignItems:'center', gap:8, padding:isMobile?'12px 20px':'13px 28px', borderRadius:99, border:'none', background:'linear-gradient(135deg,#FC9145,#FF7212)', color:'#fff', fontSize:isMobile?13:15, fontWeight:700, cursor:'pointer', fontFamily:"'Poppins',sans-serif", boxShadow:'0 6px 20px rgba(252,145,69,.50)', animation:'pulseRing 2s ease infinite', flexShrink:0, whiteSpace:'nowrap' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='scale(1.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}
          >
            <ChevronRight size={17}/><span>{nextLabel}</span>
          </button>
        </div>
      )}

      {/* ── Reset button ───────────────────────────────────────────────────────── */}
      {!stepComplete && (
        <button onClick={() => initStep(currentStep)} style={{ display:'flex', alignItems:'center', gap:9, padding:isMobile?'11px 18px':'12px 22px', borderRadius:99, border:'2px solid #CACACA', background:surface, color:subtext, fontSize:isMobile?12:13, fontWeight:600, cursor:'pointer', fontFamily:"'Poppins',sans-serif", transition:'all .2s ease' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='#533086'; (e.currentTarget as HTMLElement).style.color='#533086'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#CACACA'; (e.currentTarget as HTMLElement).style.color=subtext; }}
        >
          <RotateCcw size={14}/><span>{'Reset "'+prop.label+'"'}</span>
        </button>
      )}

      <p style={{ textAlign:'center', color:subtext, fontSize:11, marginTop:16, marginBottom:0 }}>
        {isMobile ? '👆 Touch & drag tiles into the correct bin' : '🖱 Drag tiles into the correct bin — wrong drops are rejected instantly'}
      </p>
    </div>
  );
};

export default MaterialClassifier;