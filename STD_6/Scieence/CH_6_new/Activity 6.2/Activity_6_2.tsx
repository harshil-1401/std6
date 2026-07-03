import React, { useEffect, useMemo, useRef, useState } from "react";

/* -------------------------------------------------------------------------
   Inline SVG icons (no external dependency).
   Rendering a forwardRef object from a separately-bundled icon library can
   trigger React "Element type is invalid" (#130) when the host app uses a
   different React copy. Plain <svg> elements are always valid host elements.
   ------------------------------------------------------------------------- */
interface IconProps {
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}
const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 24,
  color = "currentColor",
  fill = "none",
  strokeWidth = 2,
  style,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const Award: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="6" />
    <path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" />
  </Svg>
);
const Star: React.FC<IconProps> = (p) => (
  <Svg {...p} fill={p.fill ?? "none"}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
  </Svg>
);
const RotateCcw: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Svg>
);
const ArrowLeft: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </Svg>
);
const ArrowRight: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Svg>
);
const X: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
);
const Check: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);
const Sparkles: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M12 3l1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7z" />
    <path d="M19 14l.8 1.9 1.9.8-1.9.8L19 19.4l-.8-1.9-1.9-.8 1.9-.8z" />
  </Svg>
);

/* =========================================================================
   Activity 6.2 — Let us group
   "Group the objects based on a common property."
   Short tap-to-sort tool: sort everyday objects by the MATERIAL they are
   made of (Metal / Wood / Plastic / Clay). Class 6 tier — playful,
   story-framed, heavy celebration, analogy-first review.
   ========================================================================= */

type GradeLevel = 6 | 7 | 8;
type Phase = "play" | "result" | "review";

interface ToolProps {
  props?: {
    width?: number;
    height?: number;
    gradeLevel?: GradeLevel;
    additionalProps?: Record<string, any>;
  };
  setStepDetails?: (s: {
    currentStep: number;
    totalSteps: number;
    isPaused: boolean;
    currentMode: string;
  }) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

/* -------------------------------------------------------------------------
   Design tokens (Singularity)
   ------------------------------------------------------------------------- */
const DS = {
  primary: "#4A4DC9",
  primaryDark: "#533086",
  primaryLight: "#C1C1EA",
  primaryGhost: "#EDEDF8",
  accent: "#FF7212",
  accentDark: "#FC9145",
  accentLight: "#FFF3E4",
  gray900: "#1A1A2E",
  gray700: "#4E4E4E",
  gray400: "#CACACA",
  gray200: "#EBEBEB",
  gray100: "#F5F5F5",
  white: "#FFFFFF",
  success: "#2ECC71",
  danger: "#E53E3E",
  teal: "#0891b2",
  forest: "#166534",
  pink: "#DB2777",
  font: "'Poppins', system-ui, sans-serif",
};

/* -------------------------------------------------------------------------
   Tier presets (Class 6 = heavy game)
   ------------------------------------------------------------------------- */
const TIER_CONFIG = {
  6: {
    confettiCount: 70,
    confettiDuration: 2600,
    showStars: true,
    starCount: 5,
    starStaggerMs: 200,
    scoreSizePx: 60,
    encouragement: {
      high: "Awesome sorting — you're a materials master!",
      mid: "Nice going! Let's look at the tricky ones together.",
      low: "Don't worry — every try teaches you something. Let's see!",
    },
    playAgainLabel: "Play again!",
    reviewLabel: "Let's see what we learned",
    bodyFontMobile: 16,
    bodyFontDesktop: 17,
    heroFontMobile: 36,
    heroFontDesktop: 48,
    touchTargetMobile: 56,
    storyFrame: true,
  },
  7: {
    confettiCount: 40,
    confettiDuration: 2000,
    showStars: true,
    starCount: 5,
    starStaggerMs: 200,
    scoreSizePx: 54,
    encouragement: {
      high: "Strong work — concept locked.",
      mid: "Good job. A couple to polish.",
      low: "Let's walk through these — you'll get it.",
    },
    playAgainLabel: "Play again",
    reviewLabel: "Review answers",
    bodyFontMobile: 15,
    bodyFontDesktop: 16,
    heroFontMobile: 32,
    heroFontDesktop: 44,
    touchTargetMobile: 50,
    storyFrame: false,
  },
  8: {
    confettiCount: 15,
    confettiDuration: 1500,
    showStars: false,
    starCount: 0,
    starStaggerMs: 0,
    scoreSizePx: 46,
    encouragement: {
      high: "Excellent. You've got this.",
      mid: "Good — review the ones you missed.",
      low: "Work through the explanations carefully.",
    },
    playAgainLabel: "Try fresh objects",
    reviewLabel: "Review answers",
    bodyFontMobile: 15,
    bodyFontDesktop: 16,
    heroFontMobile: 30,
    heroFontDesktop: 40,
    touchTargetMobile: 48,
    storyFrame: false,
  },
} as const;

/* -------------------------------------------------------------------------
   Domain data — objects and the bins (materials)
   ------------------------------------------------------------------------- */
interface ObjItem {
  id: string;
  label: string;
  emoji: string;
  material: MaterialKey;
  why: string; // analogy-first explanation for review
}
type MaterialKey = "metal" | "wood" | "plastic" | "clay";

const BINS: {
  key: MaterialKey;
  label: string;
  emoji: string;
  color: string;
  soft: string;
}[] = [
  { key: "metal", label: "Metal", emoji: "⚙️", color: DS.primary, soft: DS.primaryGhost },
  { key: "wood", label: "Wood", emoji: "🌳", color: DS.forest, soft: "#E7F1EA" },
  { key: "plastic", label: "Plastic", emoji: "♳", color: DS.teal, soft: "#E2F4F8" },
  { key: "clay", label: "Clay", emoji: "🏺", color: DS.pink, soft: "#FBE7F1" },
];

const BIN_BY_KEY: Record<MaterialKey, (typeof BINS)[number]> = Object.fromEntries(
  BINS.map((b) => [b.key, b])
) as any;

const OBJECTS: ObjItem[] = [
  // ---- Metal ----
  {
    id: "key",
    label: "Key",
    emoji: "🔑",
    material: "metal",
    why: "A key is hard, heavy for its size and shiny — a clear sign of metal, like iron and brass.",
  },
  {
    id: "coin",
    label: "Coin",
    emoji: "🪙",
    material: "metal",
    why: "Coins are made of metal — they are shiny, hard, and clink when they drop.",
  },
  {
    id: "bolt",
    label: "Iron bolt",
    emoji: "🔩",
    material: "metal",
    why: "An iron bolt is hard and can rust in the rain — both are signs that it is metal.",
  },
  // ---- Wood ----
  {
    id: "pencil",
    label: "Pencil",
    emoji: "✏️",
    material: "wood",
    why: "A pencil's body is carved from wood — it is light, not shiny, and easy to sharpen.",
  },
  {
    id: "board",
    label: "Wooden board",
    emoji: "🪵",
    material: "wood",
    why: "A board cut from a tree is wood — it floats, feels rough, and does not shine like metal.",
  },
  {
    id: "bat",
    label: "Cricket bat",
    emoji: "🏏",
    material: "wood",
    why: "A cricket bat is shaped from willow wood — light and strong, perfect for hitting the ball.",
  },
  // ---- Plastic ----
  {
    id: "bottle",
    label: "Plastic bottle",
    emoji: "🧴",
    material: "plastic",
    why: "A bottle that is light, bendy and waterproof is plastic — not glass or metal.",
  },
  {
    id: "bucket",
    label: "Bucket",
    emoji: "🪣",
    material: "plastic",
    why: "A bucket that is light, colourful and never rusts is made of plastic.",
  },
  {
    id: "cup",
    label: "Plastic cup",
    emoji: "🥤",
    material: "plastic",
    why: "A disposable cup that is light and bends a little when you squeeze it is plastic.",
  },
  // ---- Clay ----
  {
    id: "diya",
    label: "Clay lamp (diya)",
    emoji: "🪔",
    material: "clay",
    why: "A diya is shaped from soft clay and then baked hard — baked clay is called terracotta.",
  },
  {
    id: "pot",
    label: "Clay pot",
    emoji: "🏺",
    material: "clay",
    why: "An earthen pot is clay shaped on a wheel and baked — like pottery from the Sindhu-Sarasvatī Civilisation.",
  },
  {
    id: "brick",
    label: "Brick",
    emoji: "🧱",
    material: "clay",
    why: "A brick is clay baked in a kiln until it is hard — that is why the textbook calls a brick 'baked clay'.",
  },
];

const OBJ_BY_ID: Record<string, ObjItem> = Object.fromEntries(
  OBJECTS.map((o) => [o.id, o])
);

/* -------------------------------------------------------------------------
   PRNG + shuffle (fresh order every play)
   ------------------------------------------------------------------------- */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
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

/* -------------------------------------------------------------------------
   Responsive hook
   ------------------------------------------------------------------------- */
const useResponsive = () => {
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const h = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", h);
    h();
    return () => window.removeEventListener("resize", h);
  }, []);
  return { ...size, isMobile: size.w < 576 };
};

/* =========================================================================
   Component
   ========================================================================= */
const GroupObjectsByMaterial: React.FC<ToolProps> = ({
  props = {},
  setStepDetails,
}) => {
  const extra = props.additionalProps || {};
  const grade = (extra.gradeLevel ?? props.gradeLevel ?? 6) as GradeLevel;
  const tier = TIER_CONFIG[grade];
  const { isMobile } = useResponsive();

  const [sessionSeed, setSessionSeed] = useState(() => Date.now());
  const ordered = useMemo(
    () => shuffle(OBJECTS, mulberry32(sessionSeed)),
    [sessionSeed]
  );

  // placements: objId -> binKey. With immediate validation, only CORRECT
  // placements are ever stored, so every placed object sits in its right bin.
  const [placed, setPlaced] = useState<Record<string, MaterialKey | undefined>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("play");
  const [reviewIdx, setReviewIdx] = useState(0);

  // immediate-feedback state
  const [mistakes, setMistakes] = useState<Record<string, number>>({});
  const [reject, setReject] = useState<{ id: string; bin: MaterialKey } | null>(null);
  const rejectTimer = useRef<number | undefined>(undefined);

  // drag state (works for both mouse and touch via Pointer Events)
  const [drag, setDrag] = useState<{ id: string; emoji: string; label: string; x: number; y: number } | null>(null);
  const [hoverBin, setHoverBin] = useState<MaterialKey | null>(null);
  const binEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragInfo = useRef<
    { id: string; obj: ObjItem; startX: number; startY: number; moved: boolean } | null
  >(null);

  const total = ordered.length;
  const placedCount = ordered.filter((o) => placed[o.id]).length;
  const allPlaced = placedCount === total; // (== all correct, given validation)

  // score = objects placed correctly on the FIRST try (no wrong attempts)
  const firstTry = ordered.filter((o) => placed[o.id] === o.material && !mistakes[o.id]).length;
  // tricky = objects that needed more than one attempt (used in review)
  const tricky = ordered.filter((o) => mistakes[o.id]);

  useEffect(() => {
    setStepDetails?.({
      currentStep: placedCount,
      totalSteps: total,
      isPaused: phase !== "play",
      currentMode: "sort",
    });
  }, [placedCount, total, phase, setStepDetails]);

  /* ---- inject fonts + keyframes ---- */
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-tool", "group-objects");
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap');
      @keyframes go-fadeUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform:none;} }
      @keyframes go-pop { 0%{transform:scale(.6);opacity:0;} 60%{transform:scale(1.12);} 100%{transform:scale(1);opacity:1;} }
      @keyframes go-scaleBack { 0%{transform:scale(.7);opacity:0;} 70%{transform:scale(1.06);} 100%{transform:scale(1);opacity:1;} }
      @keyframes go-fall { to { transform: translateY(120vh) rotate(720deg); opacity:0; } }
      @keyframes go-starPop { 0%{transform:scale(0) rotate(-30deg);opacity:0;} 60%{transform:scale(1.25) rotate(8deg);} 100%{transform:scale(1) rotate(0);opacity:1;} }
      @keyframes go-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(74,77,201,.0);} 50%{box-shadow:0 0 0 6px rgba(74,77,201,.18);} }
      @keyframes go-shake { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-6px);} 40%{transform:translateX(6px);} 60%{transform:translateX(-4px);} 80%{transform:translateX(4px);} }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  /* ---- auto-advance to result once every object is correctly placed ---- */
  useEffect(() => {
    if (phase === "play" && allPlaced) {
      const t = window.setTimeout(() => setPhase("result"), 650);
      return () => window.clearTimeout(t);
    }
  }, [phase, allPlaced]);

  useEffect(() => () => window.clearTimeout(rejectTimer.current), []);

  /* ---- wrong attempt: record a mistake + shake feedback, do NOT place ---- */
  const triggerReject = (id: string, bin: MaterialKey) => {
    setMistakes((m) => ({ ...m, [id]: (m[id] || 0) + 1 }));
    setReject(null);
    // double rAF so the shake animation restarts even on repeat wrong drops
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setReject({ id, bin }))
    );
    window.clearTimeout(rejectTimer.current);
    rejectTimer.current = window.setTimeout(() => setReject(null), 600);
  };

  /* ---- handlers ---- */
  // tap path: pick up / put back via tap-then-tap-a-bin
  const handleTap = (o: ObjItem) => {
    if (phase !== "play") return;
    if (placed[o.id]) {
      setPlaced((p) => ({ ...p, [o.id]: undefined }));
      setSelected(o.id);
      return;
    }
    setSelected((s) => (s === o.id ? null : o.id));
  };

  // which bin (if any) sits under a screen point — for drag-drop hit testing
  const binAtPoint = (x: number, y: number): MaterialKey | null => {
    for (const bin of BINS) {
      const el = binEls.current[bin.key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return bin.key;
    }
    return null;
  };

  const onObjPointerDown = (e: React.PointerEvent, o: ObjItem) => {
    if (phase !== "play") return;
    dragInfo.current = { id: o.id, obj: o, startX: e.clientX, startY: e.clientY, moved: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const onObjPointerMove = (e: React.PointerEvent) => {
    const d = dragInfo.current;
    if (!d) return;
    const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    if (!d.moved && dist > 6) d.moved = true;
    if (d.moved) {
      setDrag({ id: d.id, emoji: d.obj.emoji, label: d.obj.label, x: e.clientX, y: e.clientY });
      setHoverBin(binAtPoint(e.clientX, e.clientY));
    }
  };

  const onObjPointerUp = (e: React.PointerEvent) => {
    const d = dragInfo.current;
    dragInfo.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (!d) return;
    if (d.moved) {
      const bin = binAtPoint(e.clientX, e.clientY);
      if (bin) {
        if (bin === d.obj.material) {
          setPlaced((p) => ({ ...p, [d.id]: bin })); // correct → place it
        } else {
          triggerReject(d.id, bin); // wrong → reject, don't place
        }
      } else {
        setPlaced((p) => ({ ...p, [d.id]: undefined })); // dropped outside → back to tray
      }
      setSelected(null);
    } else {
      handleTap(d.obj); // it was a tap, not a drag
    }
    setDrag(null);
    setHoverBin(null);
  };

  const onObjPointerCancel = () => {
    dragInfo.current = null;
    setDrag(null);
    setHoverBin(null);
  };

  const handlePickBin = (key: MaterialKey) => {
    if (phase !== "play" || !selected) return;
    const obj = OBJ_BY_ID[selected];
    if (obj && key === obj.material) {
      setPlaced((p) => ({ ...p, [selected]: key })); // correct → place it
      setSelected(null);
    } else {
      triggerReject(selected, key); // wrong → reject, keep it selected to retry
    }
  };

  const handleReview = () => {
    setReviewIdx(0);
    setPhase("review");
  };

  const handlePlayAgain = () => {
    setSessionSeed(Date.now());
    setPlaced({});
    setSelected(null);
    setMistakes({});
    setReject(null);
    setReviewIdx(0);
    setPhase("play");
  };

  const bodyFont = isMobile ? tier.bodyFontMobile : tier.bodyFontDesktop;
  const heroFont = isMobile ? tier.heroFontMobile : tier.heroFontDesktop;
  const tray = ordered.filter((o) => !placed[o.id]);

  return (
    <div
      style={{
        fontFamily: DS.font,
        color: DS.gray900,
        background: DS.gray100,
        borderRadius: 24,
        overflow: "hidden",
        maxWidth: 920,
        margin: "0 auto",
        boxShadow: "0 10px 40px rgba(26,26,46,.10)",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${DS.primaryDark}, ${DS.primary})`,
          color: DS.white,
          padding: isMobile ? "18px 18px" : "22px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: 800,
              letterSpacing: -0.3,
            }}
          >
            Group the Objects
          </div>
          <div
            style={{
              fontSize: bodyFont - 2,
              fontWeight: 500,
              opacity: 0.9,
              marginTop: 2,
            }}
          >
            Sort each thing by the material it is made of
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,.18)",
            borderRadius: 999,
            padding: "6px 14px",
            fontWeight: 700,
            fontSize: bodyFont - 1,
            whiteSpace: "nowrap",
          }}
        >
          {placedCount} / {total}
        </div>
      </div>

      {/* progress bar */}
      <div style={{ height: 5, background: DS.gray200 }}>
        <div
          style={{
            height: "100%",
            width: `${(placedCount / total) * 100}%`,
            background: `linear-gradient(90deg, ${DS.accent}, ${DS.accentDark})`,
            transition: "width .35s ease",
          }}
        />
      </div>

      {/* Body */}
      <div style={{ padding: isMobile ? 16 : 24 }}>
        {/* story / instruction strip */}
        {tier.storyFrame && (
          <div
            style={{
              background: DS.accentLight,
              border: `1.5px solid ${DS.accentDark}`,
              borderRadius: 14,
              padding: "12px 16px",
              fontSize: bodyFont,
              fontWeight: 500,
              color: DS.gray900,
              marginBottom: 16,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Sparkles size={20} color={DS.accent} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Madam Vidya tipped a box of objects onto the table.{" "}
              <strong>Drag</strong> each object into a bin — or tap it, then tap a
              bin. Only the <strong>right material</strong> bin will accept it!
            </span>
          </div>
        )}

        {/* TRAY */}
        <div
          style={{
            fontSize: bodyFont - 1,
            fontWeight: 600,
            color: DS.gray700,
            marginBottom: 8,
          }}
        >
          {tray.length ? "Objects to sort — drag one into a bin, or tap to pick it up" : "All objects sorted! 🎉"}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            minHeight: 86,
            background: DS.white,
            border: `2px dashed ${DS.gray200}`,
            borderRadius: 16,
            padding: 12,
            marginBottom: 20,
            alignContent: "flex-start",
          }}
        >
          {tray.length === 0 && (
            <div
              style={{
                width: "100%",
                textAlign: "center",
                color: DS.gray400,
                fontWeight: 600,
                fontSize: bodyFont,
                alignSelf: "center",
              }}
            >
              Empty — every object found a group.
            </div>
          )}
          {tray.map((o) => {
            const isSel = selected === o.id;
            const isDragging = drag?.id === o.id;
            const isRejected = reject?.id === o.id;
            return (
              <button
                key={o.id}
                onPointerDown={(e) => onObjPointerDown(e, o)}
                onPointerMove={onObjPointerMove}
                onPointerUp={onObjPointerUp}
                onPointerCancel={onObjPointerCancel}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  minWidth: isMobile ? 78 : 92,
                  minHeight: tier.touchTargetMobile + 14,
                  padding: "10px 8px",
                  borderRadius: 14,
                  cursor: "grab",
                  touchAction: "none",
                  background: isRejected ? "#FDECEC" : isSel ? DS.primary : DS.gray100,
                  color: isSel && !isRejected ? DS.white : DS.gray900,
                  border: `2px solid ${
                    isRejected ? DS.danger : isSel ? DS.primary : DS.gray200
                  }`,
                  fontFamily: DS.font,
                  fontWeight: 600,
                  fontSize: bodyFont - 2,
                  opacity: isDragging ? 0.35 : 1,
                  animation: isRejected
                    ? "go-shake .45s ease"
                    : isSel && !isDragging
                    ? "go-pulse 1.2s ease infinite"
                    : "go-fadeUp .35s ease",
                  transition: "background .15s, border .15s, opacity .15s",
                }}
              >
                <span style={{ fontSize: 30, lineHeight: 1 }}>{o.emoji}</span>
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>

        {/* BINS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
            gap: 12,
          }}
        >
          {BINS.map((bin) => {
            const items = ordered.filter((o) => placed[o.id] === bin.key);
            const isHover = hoverBin === bin.key;
            const isReject = reject?.bin === bin.key;
            const active = !!selected || !!drag;
            return (
              <button
                key={bin.key}
                ref={(el) => {
                  binEls.current[bin.key] = el;
                }}
                onClick={() => handlePickBin(bin.key)}
                style={{
                  textAlign: "left",
                  background: isReject ? "#FDECEC" : isHover ? bin.color : bin.soft,
                  border: `${isHover || isReject ? 3 : 2.5}px solid ${
                    isReject ? DS.danger : bin.color
                  }`,
                  borderRadius: 16,
                  padding: 12,
                  minHeight: 120,
                  cursor: selected ? "pointer" : "default",
                  opacity: active || items.length ? 1 : 0.92,
                  fontFamily: DS.font,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  transition: "transform .12s, background .12s, border .12s",
                  transform: isHover ? "scale(1.04)" : "scale(1)",
                  boxShadow: isHover ? `0 8px 22px ${bin.color}55` : "none",
                  animation: isReject ? "go-shake .45s ease" : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 700,
                    color: isHover ? DS.white : bin.color,
                    fontSize: bodyFont,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{bin.emoji}</span>
                  {bin.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {items.map((o) => (
                    <span
                      key={o.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onObjPointerDown(e, o);
                      }}
                      onPointerMove={onObjPointerMove}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        onObjPointerUp(e);
                      }}
                      onPointerCancel={onObjPointerCancel}
                      onClick={(e) => e.stopPropagation()}
                      title="Tap to take it back, or drag to another bin"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: isHover ? DS.white : DS.white,
                        border: `1.5px solid ${bin.color}`,
                        color: DS.gray900,
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: bodyFont - 3,
                        fontWeight: 600,
                        cursor: "grab",
                        touchAction: "none",
                        opacity: drag?.id === o.id ? 0.35 : 1,
                        animation: reject?.id === o.id ? "go-shake .45s ease" : "go-pop .3s ease",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{o.emoji}</span>
                      {o.label}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Status line (no submit needed — validation is immediate) */}
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            minHeight: 28,
            fontSize: bodyFont,
            fontWeight: 600,
            color: reject ? DS.danger : DS.gray700,
            transition: "color .15s",
          }}
        >
          {reject
            ? "Not quite — that bin is a different material. Try another!"
            : allPlaced
            ? "All sorted correctly! 🎉"
            : `Placed ${placedCount} of ${total} — only the right bin will accept each object.`}
        </div>
      </div>

      {/* DRAG GHOST (follows mouse/finger) */}
      {drag && (
        <div
          style={{
            position: "fixed",
            left: drag.x,
            top: drag.y,
            transform: "translate(-50%, -50%) rotate(-4deg)",
            pointerEvents: "none",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "10px 12px",
            borderRadius: 14,
            background: DS.white,
            border: `2px solid ${DS.primary}`,
            boxShadow: "0 12px 28px rgba(26,26,46,.28)",
            fontFamily: DS.font,
            fontWeight: 600,
            fontSize: bodyFont - 2,
            color: DS.gray900,
          }}
        >
          <span style={{ fontSize: 30, lineHeight: 1 }}>{drag.emoji}</span>
          <span>{drag.label}</span>
        </div>
      )}

      {/* RESULT POPUP */}
      {phase === "result" && (
        <ResultPopup
          score={firstTry}
          total={total}
          tier={tier}
          heroFont={heroFont}
          bodyFont={bodyFont}
          hasTricky={tricky.length > 0}
          onReview={handleReview}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* REVIEW */}
      {phase === "review" && (
        <ReviewOverlay
          tricky={tricky}
          mistakes={mistakes}
          reviewIdx={reviewIdx}
          setReviewIdx={setReviewIdx}
          onPlayAgain={handlePlayAgain}
          bodyFont={bodyFont}
          isMobile={isMobile}
        />
      )}
    </div>
  );
};

export default GroupObjectsByMaterial;

/* =========================================================================
   Result popup
   ========================================================================= */
function ResultPopup({
  score,
  total,
  tier,
  heroFont,
  bodyFont,
  hasTricky,
  onReview,
  onPlayAgain,
}: any) {
  const [count, setCount] = useState(0);
  const pct = score / total;
  const enc =
    pct >= 0.9
      ? tier.encouragement.high
      : pct >= 0.6
      ? tier.encouragement.mid
      : tier.encouragement.low;
  const starsEarned = Math.max(1, Math.round(pct * tier.starCount));

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1100, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const confetti = useMemo(
    () =>
      Array.from({ length: tier.confettiCount }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: tier.confettiDuration / 1000 + Math.random() * 0.8,
        color: [DS.accent, DS.primary, DS.success, DS.pink, DS.teal][i % 5],
        size: 7 + Math.random() * 7,
      })),
    [tier]
  );

  return (
    <div style={overlay}>
      {confetti.map((c, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: -20,
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            background: c.color,
            borderRadius: 2,
            animation: `go-fall ${c.dur}s linear ${c.delay}s forwards`,
          }}
        />
      ))}
      <div
        style={{
          background: DS.white,
          borderRadius: 24,
          padding: 32,
          width: "min(420px, 90%)",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,.3)",
          animation: "go-scaleBack .5s ease",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${DS.primaryDark}, ${DS.accent})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <Award size={34} color={DS.white} />
        </div>

        {tier.showStars && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
            {Array.from({ length: tier.starCount }).map((_, i) => (
              <Star
                key={i}
                size={28}
                fill={i < starsEarned ? DS.accent : "none"}
                color={i < starsEarned ? DS.accent : DS.gray400}
                style={{ animation: `go-starPop .4s ease ${i * tier.starStaggerMs}ms both` }}
              />
            ))}
          </div>
        )}

        <div
          style={{
            fontSize: tier.scoreSizePx,
            fontWeight: 800,
            color: DS.primaryDark,
            lineHeight: 1.05,
          }}
        >
          {count}
          <span style={{ fontSize: tier.scoreSizePx * 0.45, color: DS.gray400 }}>
            {" "}/ {total}
          </span>
        </div>
        <div style={{ fontSize: bodyFont - 1, fontWeight: 600, color: DS.gray700, marginBottom: 4 }}>
          sorted right on the first try
        </div>
        <div style={{ fontSize: bodyFont, fontWeight: 500, color: DS.gray900, margin: "12px 0 20px" }}>
          {enc}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {hasTricky && (
            <button onClick={onReview} style={primaryBtn(bodyFont)}>
              {tier.reviewLabel}
            </button>
          )}
          <button onClick={onPlayAgain} style={hasTricky ? outlineBtn(bodyFont) : primaryBtn(bodyFont)}>
            <RotateCcw size={16} />
            {tier.playAgainLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Review overlay
   ========================================================================= */
function ReviewOverlay({
  tricky,
  mistakes,
  reviewIdx,
  setReviewIdx,
  onPlayAgain,
  bodyFont,
  isMobile,
}: any) {
  const none = tricky.length === 0;
  const o: ObjItem | undefined = tricky[reviewIdx];
  const correct = o ? BIN_BY_KEY[o.material] : undefined;
  const tries = o ? (mistakes[o.id] || 0) + 1 : 0;

  return (
    <div style={overlay}>
      <div
        style={{
          background: DS.white,
          borderRadius: 24,
          padding: isMobile ? 20 : 28,
          width: "min(480px, 92%)",
          maxHeight: "86%",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,.3)",
          animation: "go-scaleBack .45s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: bodyFont + 4, color: DS.primaryDark }}>
            {none ? "Perfect — first try every time!" : "Let's learn the tricky ones"}
          </div>
          <button onClick={onPlayAgain} style={iconBtn}>
            <X size={18} color={DS.gray700} />
          </button>
        </div>

        {none ? (
          <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🌟</div>
            <p style={{ fontSize: bodyFont, fontWeight: 500, color: DS.gray900, lineHeight: 1.6 }}>
              You sorted every object into the right material on your first try.
              Arranging things into groups by a shared property is called{" "}
              <strong>classification</strong> — exactly what Activity 6.2 is about!
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                background: DS.gray100,
                borderRadius: 16,
                padding: 18,
                animation: "go-fadeUp .3s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 40 }}>{o!.emoji}</span>
                <span style={{ fontSize: bodyFont + 4, fontWeight: 700 }}>{o!.label}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: bodyFont - 2,
                    color: DS.gray700,
                    fontWeight: 600,
                  }}
                >
                  Correct group
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: DS.white,
                    border: `1.5px solid ${DS.success}`,
                    borderRadius: 999,
                    padding: "4px 12px",
                    fontWeight: 700,
                    color: DS.success,
                    fontSize: bodyFont - 1,
                  }}
                >
                  <Check size={15} color={DS.success} />
                  <span style={{ fontSize: 16 }}>{correct?.emoji}</span>
                  {correct?.label}
                </span>
              </div>
              <div style={{ fontSize: bodyFont - 2, color: DS.gray700, fontWeight: 500 }}>
                You found the right bin after {tries} {tries === 1 ? "try" : "tries"}.
              </div>

              <div style={{ height: 1, background: DS.gray200, margin: "14px 0" }} />
              <p style={{ fontSize: bodyFont, lineHeight: 1.65, color: DS.gray900, margin: 0 }}>
                {o!.why}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 12,
                marginTop: 18,
              }}
            >
              <button
                onClick={() => setReviewIdx((i: number) => Math.max(0, i - 1))}
                disabled={reviewIdx === 0}
                style={{
                  ...outlineBtn(bodyFont),
                  justifySelf: "start",
                  minWidth: 112,
                  padding: "11px 18px",
                  opacity: reviewIdx === 0 ? 0.45 : 1,
                  cursor: reviewIdx === 0 ? "default" : "pointer",
                }}
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <div
                style={{
                  justifySelf: "center",
                  fontSize: bodyFont - 1,
                  fontWeight: 700,
                  color: DS.gray700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {reviewIdx + 1} / {tricky.length}
              </div>

              {reviewIdx < tricky.length - 1 ? (
                <button
                  onClick={() => setReviewIdx((i: number) => i + 1)}
                  style={{
                    ...primaryBtn(bodyFont),
                    justifySelf: "end",
                    minWidth: 112,
                    padding: "11px 18px",
                  }}
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={onPlayAgain}
                  style={{
                    ...primaryBtn(bodyFont),
                    justifySelf: "end",
                    minWidth: 112,
                    padding: "11px 18px",
                  }}
                >
                  <RotateCcw size={15} />
                  Play again
                </button>
              )}
            </div>
          </>
        )}

        {none && (
          <button onClick={onPlayAgain} style={{ ...primaryBtn(bodyFont), width: "100%", marginTop: 18 }}>
            <RotateCcw size={16} />
            Play again!
          </button>
        )}
      </div>
    </div>
  );
}

/* ---- shared style helpers ---- */
const overlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  overflow: "hidden",
  padding: 16,
};
const primaryBtn = (f: number): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: DS.accent,
  color: DS.white,
  border: "none",
  borderRadius: 999,
  padding: "12px 22px",
  fontFamily: DS.font,
  fontWeight: 700,
  fontSize: f,
  lineHeight: 1,
  cursor: "pointer",
  boxShadow: "0 5px 14px rgba(255,114,18,.32)",
});
const outlineBtn = (f: number): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: DS.white,
  color: DS.primary,
  border: `2px solid ${DS.primary}`,
  borderRadius: 999,
  padding: "11px 22px",
  fontFamily: DS.font,
  fontWeight: 700,
  fontSize: f,
  lineHeight: 1,
  cursor: "pointer",
});
const iconBtn: React.CSSProperties = {
  background: DS.gray100,
  border: "none",
  borderRadius: 999,
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};