import { useState, useEffect, useRef, useMemo } from "react";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const GROUPS = [
  { id: "material",     label: "Material",      icon: "🧪", question: "What is it made of?",        color: "#4A4DC9", light: "#EDEDF8" },
  { id: "hardness",     label: "Hard or Soft?", icon: "💪", question: "Can you compress or scratch it?", color: "#0891b2", light: "#DBEAFE" },
  { id: "lustre",       label: "Shine",         icon: "✨", question: "Does its surface reflect light?", color: "#B45309", light: "#FEF3C7" },
  { id: "transparency", label: "Transparency",  icon: "👁️", question: "Can you see through it?",     color: "#7C3AED", light: "#EDE9FE" },
];

interface TagDef { id: string; group: string; label: string; }
const TAGS: TagDef[] = [
  { id:"metal",        group:"material",     label:"Metal"        },
  { id:"glass",        group:"material",     label:"Glass"        },
  { id:"paper",        group:"material",     label:"Paper"        },
  { id:"rubber",       group:"material",     label:"Rubber"       },
  { id:"wood",         group:"material",     label:"Wood"         },
  { id:"clay",         group:"material",     label:"Clay"         },
  { id:"cotton",       group:"material",     label:"Cotton"       },
  { id:"plastic",      group:"material",     label:"Plastic"      },
  { id:"hard",         group:"hardness",     label:"Hard"         },
  { id:"soft",         group:"hardness",     label:"Soft"         },
  { id:"shiny",        group:"lustre",       label:"Shiny ✨"     },
  { id:"dull",         group:"lustre",       label:"Dull"         },
  { id:"transparent",  group:"transparency", label:"Transparent"  },
  { id:"translucent",  group:"transparency", label:"Translucent"  },
  { id:"opaque",       group:"transparency", label:"Opaque"       },
];

interface ObjDef { id:string; name:string; emoji:string; clue:string; correctTags:string[]; }
const OBJECTS: ObjDef[] = [
  { id:"key",         name:"Metal Key",    emoji:"🔑", clue:"Cold to touch · Heavy for its size · Surface catches light",          correctTags:["metal","hard","shiny","opaque"]       },
  { id:"notebook",    name:"Notebook",     emoji:"📓", clue:"Light in hand · Cover bends easily · Surface looks dull",              correctTags:["paper","soft","dull","opaque"]        },
  { id:"marble",      name:"Glass Marble", emoji:"🔵", clue:"Smooth and cold · You can see right through it · Very hard",           correctTags:["glass","hard","dull","transparent"]   },
  { id:"eraser",      name:"Eraser",       emoji:"🧽", clue:"Squishy and flexible · Dull matte surface · Easy to squeeze",          correctTags:["rubber","soft","dull","opaque"]       },
  { id:"coin",        name:"Copper Coin",  emoji:"🪙", clue:"Heavy for its size · Shiny surface · Cannot compress at all",          correctTags:["metal","hard","shiny","opaque"]       },
  { id:"ruler",       name:"Wooden Ruler", emoji:"📏", clue:"Slightly rough surface · Hard to scratch · Dull appearance",           correctTags:["wood","hard","dull","opaque"]         },
  { id:"butterPaper", name:"Butter Paper", emoji:"📄", clue:"Very thin · Hold to light — shapes visible but not clearly",           correctTags:["paper","soft","dull","translucent"]   },
  { id:"brick",       name:"Clay Brick",   emoji:"🧱", clue:"Rough and heavy · Cannot see through · Very hard surface",             correctTags:["clay","hard","dull","opaque"]         },
  { id:"cotton",      name:"Cotton Ball",  emoji:"☁️", clue:"Lightest of all · Compresses in seconds · Soft and fluffy",            correctTags:["cotton","soft","dull","opaque"]       },
  { id:"plasticBag",  name:"Plastic Bag",  emoji:"🛍️", clue:"Thin and flexible · You can clearly see objects through it",           correctTags:["plastic","soft","dull","transparent"] },
];

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  const pts = useMemo(() => Array.from({ length: 55 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 0.9,
    color: ["#4A4DC9","#FF7212","#2ECC71","#FC9145","#DB2777","#F59E0B"][i % 6],
    size: 7 + Math.random() * 7, dur: 2.0 + Math.random() * 1.0,
  })), []);
  if (!active) return null;
  return (
    <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:500,overflow:"hidden" }}>
      {pts.map(p => (
        <div key={p.id} style={{ position:"absolute",top:"-14px",left:`${p.left}%`,width:p.size,height:p.size,borderRadius:"3px",background:p.color,animation:`cfFall ${p.dur}s ease-in ${p.delay}s forwards` }} />
      ))}
    </div>
  );
}

// ─── SCORE COUNT-UP ───────────────────────────────────────────────────────────
function CountUp({ value }: { value: number }) {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 1000, 1);
      setDisp(Math.round(p * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{disp}</>;
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────
function ResultScreen({ score, total, allAnswers, onAgain }: {
  score: number; total: number;
  allAnswers: Record<string, string[]>; onAgain: () => void;
}) {
  const [tab, setTab] = useState<"score"|"review">("score");
  const pct   = score / total;
  const stars = pct >= 0.9 ? 5 : pct >= 0.7 ? 4 : pct >= 0.5 ? 3 : pct >= 0.3 ? 2 : 1;
  const msg   = pct >= 0.8 ? "Excellent scientist! 🔬" : pct >= 0.5 ? "Good work! A few to revisit 🙂" : "Every mistake is a discovery! 💡";

  return (
    <div style={{ fontFamily:"'Poppins',sans-serif",background:"#F5F5F5",minHeight:"100vh" }}>

      {/* header */}
      <div style={{ background:"linear-gradient(135deg,#533086,#4A4DC9)",padding:"22px 20px 28px",color:"white",textAlign:"center" }}>
        <div style={{ fontSize:13,opacity:0.75,letterSpacing:1.5,marginBottom:6 }}>ACTIVITY 6.2 — RESULTS</div>
        <div style={{ fontSize:64,fontWeight:800,lineHeight:1 }}><CountUp value={score} /></div>
        <div style={{ fontSize:16,opacity:0.85,marginBottom:14 }}>out of {total} properties correct</div>
        <div style={{ display:"flex",justifyContent:"center",gap:6,marginBottom:10 }}>
          {Array.from({ length:5 },(_,i) => (
            <span key={i} style={{ fontSize:28,opacity:i<stars?1:0.25,animation:i<stars?`starPop 0.4s ease ${i*0.12}s both`:"none" }}>⭐</span>
          ))}
        </div>
        <div style={{ fontSize:15,fontWeight:600,opacity:0.95 }}>{msg}</div>
      </div>

      {/* tabs */}
      <div style={{ display:"flex",background:"white",borderBottom:"2px solid #EBEBEB",position:"sticky",top:0,zIndex:10 }}>
        {(["score","review"] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{ flex:1,padding:"14px",border:"none",borderBottom:`3px solid ${tab===t?"#FF7212":"transparent"}`,background:"white",fontSize:14,fontWeight:700,color:tab===t?"#FF7212":"#9CA3AF",fontFamily:"inherit",cursor:"pointer",transition:"all 0.18s" }}>
            {t==="score" ? "📊 Summary" : "📋 Full Review"}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:640,margin:"0 auto",padding:"20px 16px 40px" }}>

        {/* SUMMARY TAB */}
        {tab==="score" && (
          <div style={{ animation:"slideUp 0.35s ease both" }}>
            {/* per-object quick summary */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
              {OBJECTS.map(obj => {
                const chosen = allAnswers[obj.id] ?? [];
                const correct = obj.correctTags.filter(cid => chosen.includes(cid)).length;
                const total4  = 4;
                const allOk   = correct === total4;
                return (
                  <div key={obj.id} style={{ background:"white",borderRadius:16,padding:"14px",boxShadow:"0 2px 10px rgba(0,0,0,0.07)",borderTop:`4px solid ${allOk?"#2ECC71":"#E53E3E"}`,display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ fontSize:30 }}>{obj.emoji}</span>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:700,color:"#1A1A2E",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{obj.name}</div>
                      <div style={{ fontSize:12,color: allOk?"#2ECC71":"#E53E3E",fontWeight:600 }}>{correct}/{total4} correct</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background:"linear-gradient(135deg,#FFF3E4,#EDEDF8)",borderRadius:16,padding:"16px 18px",border:"1.5px solid #C1C1EA",marginBottom:20 }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#533086",marginBottom:5 }}>💡 What you discovered</div>
              <div style={{ fontSize:14,color:"#4E4E4E",lineHeight:1.7 }}>
                The same object has <strong>multiple properties at once</strong> — it can be Metal, Hard, Shiny and Opaque all together! That's why we classify by <strong>one property at a time</strong>.
              </div>
            </div>
            <button onClick={onAgain} style={{ width:"100%",padding:"16px",borderRadius:9999,border:"none",background:"linear-gradient(135deg,#FF7212,#FC9145)",color:"white",fontSize:16,fontWeight:700,fontFamily:"inherit",cursor:"pointer",boxShadow:"0 4px 16px rgba(255,114,18,0.35)" }}>
              🎮 Play again!
            </button>
          </div>
        )}

        {/* REVIEW TAB */}
        {tab==="review" && (
          <div style={{ animation:"slideUp 0.35s ease both" }}>
            {OBJECTS.map(obj => {
              const chosen = allAnswers[obj.id] ?? [];
              return (
                <div key={obj.id} style={{ background:"white",borderRadius:20,padding:"18px",marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.08)" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:12,borderBottom:"1px solid #F3F4F6" }}>
                    <span style={{ fontSize:36 }}>{obj.emoji}</span>
                    <div>
                      <div style={{ fontSize:16,fontWeight:700,color:"#1A1A2E" }}>{obj.name}</div>
                      <div style={{ fontSize:12,color:"#9CA3AF",marginTop:2 }}>{obj.clue}</div>
                    </div>
                  </div>
                  {GROUPS.map(g => {
                    const correctId = obj.correctTags.find(tid => TAGS.find(t=>t.id===tid && t.group===g.id))!;
                    const chosenId  = chosen.find(tid => TAGS.find(t=>t.id===tid && t.group===g.id));
                    const ok        = chosenId === correctId;
                    const correctLabel = TAGS.find(t=>t.id===correctId)?.label ?? correctId;
                    const chosenLabel  = chosenId ? (TAGS.find(t=>t.id===chosenId)?.label ?? chosenId) : "—";
                    return (
                      <div key={g.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #F9FAFB" }}>
                        <span style={{ fontSize:14,width:22 }}>{g.icon}</span>
                        <span style={{ fontSize:13,color:"#6B7280",fontWeight:500,flex:1 }}>{g.label}</span>
                        {!ok && <span style={{ fontSize:12,background:"#FEE2E2",color:"#991B1B",borderRadius:8,padding:"3px 9px",fontWeight:600 }}>{chosenLabel}</span>}
                        <span style={{ fontSize:12,background:ok?"#D1FAE5":"#DCFCE7",color:ok?"#065F46":"#166534",borderRadius:8,padding:"3px 9px",fontWeight:700,border:`1px solid ${ok?"#86EFAC":"#86EFAC"}` }}>
                          {ok?"✓ ":""}{correctLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <button onClick={onAgain} style={{ width:"100%",padding:"16px",borderRadius:9999,border:"none",background:"linear-gradient(135deg,#FF7212,#FC9145)",color:"white",fontSize:16,fontWeight:700,fontFamily:"inherit",cursor:"pointer",marginTop:8 }}>
              🎮 Play again!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN GAME ────────────────────────────────────────────────────────────────
export default function SpotlightSort() {
  const [objIdx,     setObjIdx]     = useState(0);
  const [chosen,     setChosen]     = useState<string[]>([]);
  const [submitted,  setSubmitted]  = useState(false);
  const [allAnswers, setAllAnswers] = useState<Record<string,string[]>>({});
  const [done,       setDone]       = useState(false);
  const [confetti,   setConfetti]   = useState(false);
  const [cardKey,    setCardKey]    = useState(0); // forces re-animation on new object
  const styleRef = useRef<HTMLStyleElement|null>(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      @keyframes cfFall   { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(540deg);opacity:0} }
      @keyframes slideUp  { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      @keyframes cardIn   { 0%{transform:scale(0.88) translateY(12px);opacity:0} 100%{transform:scale(1) translateY(0);opacity:1} }
      @keyframes starPop  { 0%{transform:scale(0) rotate(-20deg);opacity:0} 70%{transform:scale(1.25)} 100%{transform:scale(1);opacity:1} }
      @keyframes tagBounce{ 0%{transform:scale(0.8);opacity:0} 65%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
      @keyframes shake    { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
      @keyframes greenPop { 0%{transform:scale(1)} 40%{transform:scale(1.04)} 100%{transform:scale(1)} }
      .tag-btn { transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease; cursor: pointer; -webkit-tap-highlight-color: transparent; }
      .tag-btn:hover:not(:disabled) { transform: translateY(-2px); }
      .tag-btn:active:not(:disabled) { transform: scale(0.96); }
    `;
    document.head.appendChild(s);
    styleRef.current = s;
    return () => { if (styleRef.current) document.head.removeChild(styleRef.current); };
  }, []);

  const obj = OBJECTS[objIdx];
  const totalObjects = OBJECTS.length;
  const totalTags    = totalObjects * 4;

  const finalScore = useMemo(() => {
    return Object.entries(allAnswers).reduce((sum, [oid, tags]) => {
      const o = OBJECTS.find(x => x.id === oid)!;
      return sum + o.correctTags.filter(cid => tags.includes(cid)).length;
    }, 0);
  }, [allAnswers]);

  const allGroupsTagged = GROUPS.every(g =>
    chosen.some(tid => TAGS.find(t => t.id===tid && t.group===g.id))
  );

  const toggleTag = (tagId: string, group: string) => {
    if (submitted) return;
    setChosen(prev => {
      const without = prev.filter(tid => TAGS.find(t=>t.id===tid)?.group !== group);
      return prev.includes(tagId) ? without : [...without, tagId];
    });
  };

  const handleCheck = () => {
    if (!allGroupsTagged || submitted) return;
    setSubmitted(true);
    setAllAnswers(prev => ({ ...prev, [obj.id]: chosen }));
  };

  const handleNext = () => {
    const next = objIdx + 1;
    if (next >= totalObjects) {
      // finalise score including current obj (already in allAnswers from handleCheck)
      const s = Object.entries({ ...allAnswers, [obj.id]: chosen }).reduce((sum,[oid,tags])=>{
        const o = OBJECTS.find(x=>x.id===oid)!;
        return sum + o.correctTags.filter(cid=>tags.includes(cid)).length;
      }, 0);
      setDone(true);
      if (s / totalTags >= 0.55) { setConfetti(true); setTimeout(()=>setConfetti(false),2600); }
    } else {
      setObjIdx(next);
      setChosen([]);
      setSubmitted(false);
      setCardKey(k => k + 1);
    }
  };

  const handleReset = () => {
    setObjIdx(0); setChosen([]); setSubmitted(false);
    setAllAnswers({}); setDone(false); setConfetti(false); setCardKey(k=>k+1);
  };

  if (done) return <ResultScreen score={finalScore} total={totalTags} allAnswers={allAnswers} onAgain={handleReset} />;

  // per-group state helpers
  const getGroupState = (gid: string) => {
    const selectedId  = chosen.find(tid => TAGS.find(t=>t.id===tid && t.group===gid));
    const correctId   = submitted ? obj.correctTags.find(tid => TAGS.find(t=>t.id===tid && t.group===gid)) : undefined;
    const isCorrect   = submitted && !!selectedId && selectedId === correctId;
    const isWrong     = submitted && selectedId !== correctId;
    return { selectedId, correctId, isCorrect, isWrong };
  };

  const g = (gid:string) => GROUPS.find(x=>x.id===gid)!;

  return (
    <div style={{ fontFamily:"'Poppins',sans-serif",background:"#F5F5F5",minHeight:"100vh",display:"flex",flexDirection:"column" }}>

      {/* ── TOP BAR ── */}
      <div style={{ background:"linear-gradient(135deg,#533086,#4A4DC9)",padding:"14px 18px",flexShrink:0 }}>
        <div style={{ maxWidth:680,margin:"0 auto" }}>
          {/* title row */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,0.65)",letterSpacing:1.5,fontWeight:600 }}>ACTIVITY 6.2</div>
              <div style={{ fontSize:17,fontWeight:800,color:"white",lineHeight:1.2 }}>Spotlight Sort 🔦</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:22,fontWeight:800,color:"white" }}>{objIdx+1}<span style={{ fontSize:14,opacity:0.7 }}>/{totalObjects}</span></div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,0.65)" }}>objects</div>
            </div>
          </div>
          {/* progress dots */}
          <div style={{ display:"flex",gap:4 }}>
            {OBJECTS.map((_,i) => (
              <div key={i} style={{ flex:1,height:5,borderRadius:99,background: i<objIdx ? "#2ECC71" : i===objIdx ? "#FF7212" : "rgba(255,255,255,0.22)",transition:"background 0.3s ease" }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1,maxWidth:680,margin:"0 auto",width:"100%",padding:"16px 16px 20px",display:"flex",flexDirection:"column",gap:14 }}>

        {/* ── OBJECT CARD ── */}
        <div key={cardKey} style={{ background:"white",borderRadius:22,padding:"18px 20px",boxShadow:"0 4px 24px rgba(74,77,201,0.13)",display:"flex",alignItems:"center",gap:16,animation:"cardIn 0.38s cubic-bezier(.34,1.4,.64,1) both",flexShrink:0 }}>
          {/* big emoji */}
          <div style={{ width:80,height:80,borderRadius:18,background:"#F8F9FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:52,flexShrink:0 }}>
            {obj.emoji}
          </div>
          {/* name + clue */}
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:18,fontWeight:800,color:"#1A1A2E",marginBottom:6 }}>{obj.name}</div>
            {/* clue pills */}
            <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
              {obj.clue.split(" · ").map((c,i) => (
                <span key={i} style={{ fontSize:12,background:"#F8F9FF",color:"#4E4E4E",border:"1px solid #EBEBEB",borderRadius:8,padding:"3px 9px",lineHeight:1.5 }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── INSTRUCTION ── */}
        <div style={{ textAlign:"center",fontSize:13,color:"#6B7280",fontWeight:500,flexShrink:0 }}>
          Pick <strong style={{ color:"#533086" }}>one answer per row</strong> that best describes this object
        </div>

        {/* ── 4 PROPERTY ROWS ── */}
        <div style={{ display:"flex",flexDirection:"column",gap:10,flex:1 }}>
          {GROUPS.map(group => {
            const { selectedId, correctId, isCorrect, isWrong } = getGroupState(group.id);
            const groupTags = TAGS.filter(t => t.group === group.id);

            let rowBorder = "#EBEBEB";
            let rowBg     = "white";
            if (submitted && isCorrect) { rowBorder = "#2ECC71"; rowBg = "#F0FDF4"; }
            if (submitted && isWrong)   { rowBorder = "#E53E3E"; rowBg = "#FFF5F5"; }

            return (
              <div key={group.id}
                style={{ background:rowBg,borderRadius:18,border:`2px solid ${rowBorder}`,padding:"12px 14px",transition:"all 0.25s ease",animation: submitted && isWrong ? "shake 0.4s ease" : submitted && isCorrect ? "greenPop 0.4s ease" : "none" }}>

                {/* Row header */}
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                  <div style={{ width:32,height:32,borderRadius:10,background:group.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>
                    {group.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:"#1A1A2E" }}>{group.label}</div>
                    <div style={{ fontSize:11,color:"#9CA3AF" }}>{group.question}</div>
                  </div>
                  {/* submitted state indicator */}
                  {submitted && (
                    <div style={{ fontSize:18,flexShrink:0 }}>
                      {isCorrect ? "✅" : "❌"}
                    </div>
                  )}
                  {/* not submitted: show selected pill or prompt */}
                  {!submitted && selectedId && (
                    <div style={{ fontSize:12,background:group.light,color:group.color,borderRadius:8,padding:"3px 10px",fontWeight:700,flexShrink:0 }}>
                      {TAGS.find(t=>t.id===selectedId)?.label}
                    </div>
                  )}
                  {!submitted && !selectedId && (
                    <div style={{ fontSize:11,color:"#CACACA",flexShrink:0 }}>pick one →</div>
                  )}
                </div>

                {/* Tag buttons */}
                <div style={{ display:"flex",flexWrap:"wrap",gap:7 }}>
                  {groupTags.map(tag => {
                    const isSel      = chosen.includes(tag.id);
                    const isCorrectT = submitted && tag.id === correctId;
                    const isWrongT   = submitted && isSel && tag.id !== correctId;

                    // colours
                    let bg      = isSel ? group.light : "#F5F5F5";
                    let border  = isSel ? group.color : "#E0E0E0";
                    let color   = isSel ? group.color : "#6B7280";
                    let shadow  = isSel ? `0 3px 10px ${group.color}28` : "none";

                    if (submitted) {
                      if (isCorrectT) { bg="#D1FAE5"; border="#2ECC71"; color="#065F46"; shadow="none"; }
                      else if (isWrongT){ bg="#FEE2E2"; border="#E53E3E"; color="#991B1B"; shadow="none"; }
                      else             { bg="#F9FAFB"; border="#EBEBEB"; color="#C0C0C0"; shadow="none"; }
                    }

                    return (
                      <button key={tag.id}
                        className="tag-btn"
                        onClick={() => toggleTag(tag.id, group.id)}
                        disabled={submitted}
                        style={{ padding:"8px 14px",borderRadius:10,border:`2px solid ${border}`,background:bg,color,fontSize:13,fontWeight:600,fontFamily:"inherit",boxShadow:shadow,animation: isSel && !submitted ? "tagBounce 0.28s cubic-bezier(.34,1.56,.64,1) both" : "none" }}>
                        {tag.label}
                        {isCorrectT && " ✓"}
                        {isWrongT   && " ✗"}
                      </button>
                    );
                  })}
                </div>

                {/* after submit: show correct answer if wrong */}
                {submitted && isWrong && correctId && (
                  <div style={{ marginTop:8,fontSize:12,color:"#065F46",fontWeight:600 }}>
                    Correct answer: <span style={{ background:"#D1FAE5",borderRadius:7,padding:"2px 8px" }}>{TAGS.find(t=>t.id===correctId)?.label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── BOTTOM ACTION ── */}
        <div style={{ flexShrink:0,paddingTop:4 }}>
          {!submitted ? (
            // progress dots showing which groups are tagged
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
                {GROUPS.map(g => {
                  const tagged = chosen.some(tid => TAGS.find(t=>t.id===tid && t.group===g.id));
                  return (
                    <div key={g.id} style={{ display:"flex",alignItems:"center",gap:4 }}>
                      <div style={{ width:10,height:10,borderRadius:"50%",background:tagged ? g.color : "#EBEBEB",transition:"background 0.2s ease" }} />
                      <span style={{ fontSize:11,color:tagged ? g.color : "#CACACA",fontWeight:600 }}>{g.label}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={handleCheck} disabled={!allGroupsTagged}
                style={{ width:"100%",padding:"16px",borderRadius:9999,border:"none",background: allGroupsTagged ? "linear-gradient(135deg,#FF7212,#FC9145)" : "#EBEBEB",color: allGroupsTagged ? "white" : "#CACACA",fontSize:16,fontWeight:700,fontFamily:"inherit",cursor: allGroupsTagged ? "pointer" : "default",boxShadow: allGroupsTagged ? "0 6px 18px rgba(255,114,18,0.35)" : "none",transition:"all 0.2s ease" }}>
                {allGroupsTagged ? "Check! 🎯" : `${chosen.length} / 4 groups tagged`}
              </button>
            </div>
          ) : (
            <button onClick={handleNext}
              style={{ width:"100%",padding:"16px",borderRadius:9999,border:"none",background:"linear-gradient(135deg,#4A4DC9,#533086)",color:"white",fontSize:16,fontWeight:700,fontFamily:"inherit",cursor:"pointer",boxShadow:"0 6px 18px rgba(74,77,201,0.35)",animation:"slideUp 0.35s ease both" }}>
              {objIdx+1 < totalObjects ? `Next → Object ${objIdx+2}` : "See my results 🏆"}
            </button>
          )}
        </div>
      </div>

      <Confetti active={confetti} />
    </div>
  );
}