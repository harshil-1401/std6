import React, { useState, useEffect, useRef } from "react";
import { RotateCcw, Check, X, ChevronRight, Sparkles, Beaker } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

interface Material {
  name: string;
  emoji: string;
  properties: {
    hardness: "hard" | "soft";
    solubility: "soluble" | "insoluble";
    lustre: "lustrous" | "non-lustrous";
    mass: "heavy" | "light";
  };
  description: string;
  color: string;
}

interface Question {
  id: string;
  label: string;
  icon: string;
  property: keyof Material["properties"];
  options: { label: string; value: string; icon: string }[];
}

interface Answer {
  questionId: string;
  value: string;
}

interface DecisionTreeToolProps {
  props?: {
    width?: number;
    height?: number;
    additionalProps?: {
      materialX?: Partial<Material>;
      materialY?: Partial<Material>;
      customQuestions?: Partial<Question>[];
    };
    themeColor?: string;
    darkMode?: boolean;
  };
  setStepDetails?: (details: any) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS  (from Singularity design PDF)
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  primaryBlue: "#4A4DC9",
  primaryOrange: "#FF7212",
  gradStart: "#533086",
  gradEnd: "#FC9145",
  dark: "#4E4E4E",
  mid: "#CACACA",
  light: "#EBEBEB",
  lightest: "#F5F5F5",
  accentPurple: "#C1C1EA",
  accentPeach: "#FFF3E4",
  white: "#FFFFFF",
  success: "#22c55e",
  error: "#ef4444",
};

const grad = `linear-gradient(135deg, ${COLORS.gradStart}, ${COLORS.gradEnd})`;
const gradBlue = `linear-gradient(135deg, ${COLORS.primaryBlue}, #6366f1)`;

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MATERIALS: Record<"X" | "Y", Material> = {
  X: {
    name: "Salt (NaCl)",
    emoji: "🧂",
    properties: {
      hardness: "hard",
      solubility: "soluble",
      lustre: "non-lustrous",
      mass: "light",
    },
    description:
      "Salt is a hard crystalline material that dissolves easily in water. It has no metallic shine and is relatively lightweight.",
    color: "#4A4DC9",
  },
  Y: {
    name: "Iron Nail",
    emoji: "🔩",
    properties: {
      hardness: "hard",
      solubility: "insoluble",
      lustre: "lustrous",
      mass: "heavy",
    },
    description:
      "An iron nail is hard and heavy. It does not dissolve in water and has a shiny metallic lustre.",
    color: "#533086",
  },
};

const QUESTIONS: Question[] = [
  {
    id: "hardness",
    label: "Is it Hard or Soft?",
    icon: "🪨",
    property: "hardness",
    options: [
      { label: "Hard", value: "hard", icon: "💎" },
      { label: "Soft", value: "soft", icon: "🧸" },
    ],
  },
  {
    id: "solubility",
    label: "Does it dissolve in water?",
    icon: "💧",
    property: "solubility",
    options: [
      { label: "Soluble", value: "soluble", icon: "✨" },
      { label: "Insoluble", value: "insoluble", icon: "🚫" },
    ],
  },
  {
    id: "lustre",
    label: "Does it shine / have lustre?",
    icon: "✨",
    property: "lustre",
    options: [
      { label: "Lustrous", value: "lustrous", icon: "⭐" },
      { label: "Non-lustrous", value: "non-lustrous", icon: "🪨" },
    ],
  },
  {
    id: "mass",
    label: "Is it Heavy or Light?",
    icon: "⚖️",
    property: "mass",
    options: [
      { label: "Heavy", value: "heavy", icon: "🏋️" },
      { label: "Light", value: "light", icon: "🪶" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// KEYFRAMES INJECTION
// ─────────────────────────────────────────────────────────────────────────────

const injectKeyframes = () => {
  const id = "dt-keyframes";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

    @keyframes dt-fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes dt-pop    { 0%{transform:scale(0.8)} 60%{transform:scale(1.08)} 100%{transform:scale(1)} }
    @keyframes dt-shimmer{ 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes dt-pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(74,77,201,0.4)} 50%{box-shadow:0 0 0 12px rgba(74,77,201,0)} }
    @keyframes dt-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes dt-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes dt-branch { from{width:0;opacity:0} to{width:100%;opacity:1} }
    @keyframes dt-reveal { from{opacity:0;transform:scale(0.7) rotate(-8deg)} to{opacity:1;transform:scale(1) rotate(0deg)} }
    @keyframes dt-tick   { 0%{transform:scale(0)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
    @keyframes dt-glow   { 0%,100%{filter:drop-shadow(0 0 4px rgba(83,48,134,0.5))} 50%{filter:drop-shadow(0 0 14px rgba(252,145,69,0.8))} }
    @keyframes dt-tile-hover { 0%{transform:translateY(0) scale(1)} 100%{transform:translateY(-4px) scale(1.03)} }
    @keyframes dt-wrong  { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
    @keyframes dt-confetti { 0%{transform:translateY(0) rotate(0deg); opacity:1} 100%{transform:translateY(120px) rotate(720deg); opacity:0} }
  `;
  document.head.appendChild(style);
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const ConfettiPiece: React.FC<{ delay: number; x: number; color: string }> = ({
  delay,
  x,
  color,
}) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: `${x}%`,
      width: 10,
      height: 10,
      borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      background: color,
      animation: `dt-confetti 1.2s ease-out ${delay}s forwards`,
      pointerEvents: "none",
    }}
  />
);

const QuestionBadge: React.FC<{ q: Question; index: number; answer?: string; isActive: boolean }> = ({
  q,
  index,
  answer,
  isActive,
}) => {
  const answered = !!answer;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 20,
        background: isActive
          ? grad
          : answered
          ? `${COLORS.accentPurple}55`
          : `${COLORS.light}`,
        border: isActive
          ? "none"
          : answered
          ? `1.5px solid ${COLORS.primaryBlue}`
          : `1.5px solid ${COLORS.mid}`,
        color: isActive ? "#fff" : answered ? COLORS.gradStart : COLORS.dark,
        fontFamily: "'Poppins', sans-serif",
        fontSize: 12,
        fontWeight: isActive ? 700 : 500,
        transition: "all 0.3s ease",
        animation: isActive ? "dt-pulse 2s infinite" : "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 14 }}>{q.icon}</span>
      <span>Q{index + 1}</span>
      {answered && (
        <span
          style={{
            background: COLORS.primaryBlue,
            color: "#fff",
            borderRadius: "50%",
            width: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            animation: "dt-tick 0.3s ease-out",
          }}
        >
          ✓
        </span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TILE: Mystery material card
// ─────────────────────────────────────────────────────────────────────────────

const MaterialTile: React.FC<{
  label: "X" | "Y";
  material: Material;
  answers: Answer[];
  revealed: boolean;
  isWrong: boolean;
}> = ({ label, material, answers, revealed, isWrong }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 0,
        background: revealed
          ? grad
          : `linear-gradient(135deg, ${COLORS.accentPurple}40, ${COLORS.accentPeach}40)`,
        borderRadius: 20,
        padding: "20px 16px",
        border: `2px solid ${revealed ? "transparent" : COLORS.primaryBlue}`,
        boxShadow: hovered
          ? `0 12px 32px rgba(74,77,201,0.25)`
          : `0 4px 16px rgba(74,77,201,0.1)`,
        transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        animation: isWrong
          ? "dt-wrong 0.4s ease-out"
          : revealed
          ? "dt-reveal 0.6s cubic-bezier(0.34,1.56,0.64,1)"
          : `${hovered ? "dt-tile-hover" : "none"} 0.2s ease-out forwards`,
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* decorative bg blob */}
      {!revealed && (
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `${COLORS.primaryBlue}18`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* tile label */}
      <div
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: 13,
          fontWeight: 700,
          color: revealed ? "rgba(255,255,255,0.8)" : COLORS.dark,
          marginBottom: 6,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Mystery {label}
      </div>

      {/* big emoji/question */}
      <div
        style={{
          fontSize: 48,
          textAlign: "center",
          lineHeight: 1,
          marginBottom: 10,
          animation: revealed ? "dt-float 3s ease-in-out infinite" : "none",
          filter: revealed ? "none" : "grayscale(1) opacity(0.35)",
        }}
      >
        {revealed ? material.emoji : "❓"}
      </div>

      {/* material name */}
      {revealed ? (
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: 16,
            color: "#fff",
            textAlign: "center",
            marginBottom: 8,
            textShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {material.name}
        </div>
      ) : (
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: COLORS.primaryBlue,
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: 4,
          }}
        >
          ?????
        </div>
      )}

      {/* answered properties trail */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          justifyContent: "center",
        }}
      >
        {answers.map((a, i) => {
          const q = QUESTIONS.find((q) => q.id === a.questionId);
          const opt = q?.options.find((o) => o.value === a.value);
          const isCorrect =
            material.properties[q?.property as keyof Material["properties"]] === a.value;
          return (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 12,
                background: revealed
                  ? isCorrect
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(255,80,80,0.3)"
                  : `${COLORS.white}cc`,
                color: revealed ? "#fff" : COLORS.dark,
                fontFamily: "'Poppins', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                animation: `dt-fadeIn 0.3s ease-out ${i * 0.1}s both`,
              }}
            >
              {opt?.icon} {opt?.label}
              {revealed && (
                <span style={{ marginLeft: 2 }}>{isCorrect ? "✓" : "✗"}</span>
              )}
            </span>
          );
        })}
      </div>

      {revealed && (
        <p
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          {material.description}
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH PATH VISUALIZER
// ─────────────────────────────────────────────────────────────────────────────

const BranchPath: React.FC<{
  answersX: Answer[];
  answersY: Answer[];
}> = ({ answersX, answersY }) => {
  const colors = [COLORS.primaryBlue, COLORS.primaryOrange, COLORS.gradStart, "#22c55e"];
  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        padding: "12px 0",
      }}
    >
      {QUESTIONS.map((q, qi) => {
        const axAns = answersX.find((a) => a.questionId === q.id);
        const ayAns = answersY.find((a) => a.questionId === q.id);
        if (!axAns && !ayAns) return null;
        const color = colors[qi % colors.length];
        return (
          <div
            key={q.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
              animation: `dt-fadeIn 0.4s ease-out ${qi * 0.12}s both`,
              flexWrap: "wrap",
            }}
          >
            {/* question node */}
            <div
              style={{
                background: color,
                color: "#fff",
                borderRadius: 8,
                padding: "3px 10px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
              }}
            >
              {q.icon} Q{qi + 1}
            </div>

            {/* branch line */}
            <div
              style={{
                flex: 1,
                height: 2,
                background: `${color}60`,
                borderRadius: 2,
                minWidth: 20,
                animation: "dt-branch 0.5s ease-out both",
              }}
            />

            {/* X answer */}
            {axAns && (
              <div
                style={{
                  background: `${COLORS.primaryBlue}20`,
                  border: `1.5px solid ${COLORS.primaryBlue}`,
                  borderRadius: 8,
                  padding: "3px 8px",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.primaryBlue,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  flexShrink: 0,
                }}
              >
                X:{" "}
                {q.options.find((o) => o.value === axAns.value)?.icon}{" "}
                {axAns.value}
              </div>
            )}

            {/* Y answer */}
            {ayAns && (
              <div
                style={{
                  background: `${COLORS.gradStart}20`,
                  border: `1.5px solid ${COLORS.gradStart}`,
                  borderRadius: 8,
                  padding: "3px 8px",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.gradStart,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  flexShrink: 0,
                }}
              >
                Y:{" "}
                {q.options.find((o) => o.value === ayAns.value)?.icon}{" "}
                {ayAns.value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION CARD
// ─────────────────────────────────────────────────────────────────────────────

const QuestionCard: React.FC<{
  question: Question;
  qIndex: number;
  totalQ: number;
  activeTile: "X" | "Y";
  onAnswer: (value: string) => void;
  wrongAnim: boolean;
}> = ({ question, qIndex, totalQ, activeTile, onAnswer, wrongAnim }) => {
  const [hoveredOpt, setHoveredOpt] = useState<string | null>(null);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: "20px 18px",
        border: `2px solid ${COLORS.accentPurple}`,
        boxShadow: `0 8px 32px rgba(74,77,201,0.12)`,
        animation: wrongAnim
          ? "dt-wrong 0.4s ease-out"
          : "dt-fadeIn 0.4s ease-out",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: grad,
        }}
      />

      {/* progress pill */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          marginTop: 4,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: COLORS.dark,
          }}
        >
          Question {qIndex + 1} of {totalQ}
        </span>
        <span
          style={{
            background: grad,
            color: "#fff",
            borderRadius: 12,
            padding: "3px 12px",
            fontFamily: "'Poppins', sans-serif",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Mystery {activeTile}
        </span>
      </div>

      {/* question text */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 28 }}>{question.icon}</span>
        <h3
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            color: COLORS.gradStart,
            margin: 0,
            lineHeight: 1.35,
          }}
        >
          {question.label}
        </h3>
      </div>

      {/* answer buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {question.options.map((opt) => {
          const isHovered = hoveredOpt === opt.value;
          return (
            <button
              key={opt.value}
              onMouseEnter={() => setHoveredOpt(opt.value)}
              onMouseLeave={() => setHoveredOpt(null)}
              onClick={() => onAnswer(opt.value)}
              style={{
                background: isHovered ? grad : COLORS.accentPeach,
                border: `2px solid ${isHovered ? "transparent" : COLORS.accentPurple}`,
                borderRadius: 14,
                padding: "12px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                color: isHovered ? "#fff" : COLORS.gradStart,
                transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                transform: isHovered ? "scale(1.04) translateY(-2px)" : "scale(1)",
                boxShadow: isHovered
                  ? "0 8px 20px rgba(83,48,134,0.25)"
                  : "none",
              }}
            >
              <span style={{ fontSize: 24 }}>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HINT TOAST
// ─────────────────────────────────────────────────────────────────────────────

const HintToast: React.FC<{ message: string; onDismiss: () => void }> = ({
  message,
  onDismiss,
}) => (
  <div
    onClick={onDismiss}
    style={{
      background: `linear-gradient(135deg, #ef4444, #dc2626)`,
      color: "#fff",
      borderRadius: 14,
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      animation: "dt-fadeIn 0.3s ease-out",
      boxShadow: "0 4px 20px rgba(239,68,68,0.35)",
      fontFamily: "'Poppins', sans-serif",
      fontSize: 13,
      fontWeight: 600,
    }}
  >
    <span style={{ fontSize: 20 }}>💡</span>
    <span style={{ flex: 1 }}>{message}</span>
    <span style={{ opacity: 0.7, fontSize: 11 }}>tap to dismiss</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const DecisionTreeTool: React.FC<DecisionTreeToolProps> = ({ props: toolProps }) => {
  const additionalProps = toolProps?.additionalProps ?? {};

  const materialX: Material = {
    ...DEFAULT_MATERIALS.X,
    ...(additionalProps.materialX ?? {}),
    properties: {
      ...DEFAULT_MATERIALS.X.properties,
      ...(additionalProps.materialX?.properties ?? {}),
    },
  };
  const materialY: Material = {
    ...DEFAULT_MATERIALS.Y,
    ...(additionalProps.materialY ?? {}),
    properties: {
      ...DEFAULT_MATERIALS.Y.properties,
      ...(additionalProps.materialY?.properties ?? {}),
    },
  };

  // current question index (shared sequence, applied alternately to X then Y)
  const [qIndex, setQIndex] = useState(0);
  // activeTile: we ask each question for X first, then Y
  const [activeTile, setActiveTile] = useState<"X" | "Y">("X");
  const [answersX, setAnswersX] = useState<Answer[]>([]);
  const [answersY, setAnswersY] = useState<Answer[]>([]);
  const [wrongAnim, setWrongAnim] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [revealedX, setRevealedX] = useState(false);
  const [revealedY, setRevealedY] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const confettiColors = [COLORS.primaryBlue, COLORS.primaryOrange, COLORS.gradStart, COLORS.gradEnd, "#22c55e"];

  useEffect(() => {
    injectKeyframes();
  }, []);

  const totalRounds = QUESTIONS.length; // 4 questions

  // which question is being answered right now
  const currentQuestion = QUESTIONS[qIndex];

  const handleAnswer = (value: string) => {
    if (!currentQuestion) return;

    const material = activeTile === "X" ? materialX : materialY;
    const correct = material.properties[currentQuestion.property];
    const isCorrect = value === correct;

    if (!isCorrect) {
      // wrong branch: shake + hint
      setWrongAnim(true);
      setTimeout(() => setWrongAnim(false), 500);
      const hintMap: Record<string, string> = {
        hardness: `💡 Hint: Try pressing the material. Can it be scratched easily?`,
        solubility: `💡 Hint: What happens when you stir it in water?`,
        lustre: `💡 Hint: Does it reflect light like metal?`,
        mass: `💡 Hint: Would you feel a difference picking it up?`,
      };
      setHint(hintMap[currentQuestion.id] ?? "💡 Hint: Try the other option!");
      return;
    }

    // correct answer — record and advance
    const newAnswer: Answer = { questionId: currentQuestion.id, value };

    if (activeTile === "X") {
      const next = [...answersX, newAnswer];
      setAnswersX(next);

      if (next.length === totalRounds) {
        // X fully answered — now switch to Y (start from q0 for Y)
        setActiveTile("Y");
        // reset qIndex for Y — we iterate Y through same questions
        setQIndex(0);
      } else {
        setQIndex((p) => p + 1);
      }
    } else {
      const next = [...answersY, newAnswer];
      setAnswersY(next);

      if (next.length === totalRounds) {
        // both done — reveal!
        setRevealedX(true);
        setRevealedY(true);
        setPhase("done");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      } else {
        setQIndex((p) => p + 1);
      }
    }

    setHint(null);
  };

  const handleReset = () => {
    setQIndex(0);
    setActiveTile("X");
    setAnswersX([]);
    setAnswersY([]);
    setWrongAnim(false);
    setHint(null);
    setRevealedX(false);
    setRevealedY(false);
    setShowConfetti(false);
    setPhase("playing");
  };

  const progressX = answersX.length;
  const progressY = answersY.length;
  const totalProgress = progressX + progressY;
  const maxProgress = totalRounds * 2;

  // ── INTRO SCREEN ──────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          width: "100%",
          background: COLORS.lightest,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Poppins', sans-serif",
          padding: "24px 16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            background: "#fff",
            borderRadius: 28,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(74,77,201,0.18)",
          }}
        >
          {/* header */}
          <div
            style={{
              background: grad,
              padding: "32px 28px 24px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: 56,
                marginBottom: 12,
                animation: "dt-float 3s ease-in-out infinite",
              }}
            >
              🔬
            </div>
            <h1
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: 24,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Mystery Material
              <br />
              Decision Tree
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 13,
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              Chapter 6 · Materials Around Us
            </p>
          </div>

          <div style={{ padding: "24px 24px 28px" }}>
            <p
              style={{
                color: COLORS.dark,
                fontSize: 14,
                lineHeight: 1.7,
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Two mystery tiles <strong style={{ color: COLORS.primaryBlue }}>X</strong> and{" "}
              <strong style={{ color: COLORS.gradStart }}>Y</strong> are hidden. Answer{" "}
              <strong>4 property questions</strong> for each material — the tool
              will reveal their identity!
            </p>

            {/* How to play cards */}
            {[
              { icon: "🪨", text: "Hard or Soft?" },
              { icon: "💧", text: "Soluble or Insoluble?" },
              { icon: "✨", text: "Lustrous or Non-lustrous?" },
              { icon: "⚖️", text: "Heavy or Light?" },
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 12px",
                  borderRadius: 12,
                  background:
                    i % 2 === 0 ? COLORS.accentPeach : `${COLORS.accentPurple}30`,
                  marginBottom: 8,
                  animation: `dt-fadeIn 0.4s ease-out ${i * 0.1}s both`,
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    width: 36,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {step.icon}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: COLORS.gradStart,
                  }}
                >
                  {step.text}
                </span>
              </div>
            ))}

            <button
              onClick={() => setPhase("playing")}
              style={{
                width: "100%",
                marginTop: 20,
                padding: "14px",
                background: grad,
                color: "#fff",
                border: "none",
                borderRadius: 16,
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 6px 20px rgba(83,48,134,0.3)",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1.02) translateY(-2px)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")
              }
            >
              <span style={{ fontSize: 20 }}>🚀</span> Start Identifying!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN PLAYING / DONE SCREEN ─────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: COLORS.lightest,
        fontFamily: "'Poppins', sans-serif",
        padding: "16px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        maxWidth: 760,
        margin: "0 auto",
      }}
    >
      {/* Confetti */}
      {showConfetti && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            pointerEvents: "none",
            zIndex: 999,
          }}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <ConfettiPiece
              key={i}
              delay={i * 0.04}
              x={Math.random() * 100}
              color={confettiColors[i % confettiColors.length]}
            />
          ))}
        </div>
      )}

      {/* ── HEADER ── */}
      <div
        style={{
          background: grad,
          borderRadius: 20,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            🔬 Mystery Material Identifier
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 11,
              margin: "2px 0 0",
            }}
          >
            Materials Around Us · Chapter 6
          </p>
        </div>

        {/* overall progress bar */}
        <div style={{ flex: 1, minWidth: 100, maxWidth: 200 }}>
          <div
            style={{
              height: 6,
              background: "rgba(255,255,255,0.3)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(totalProgress / maxProgress) * 100}%`,
                background: "#fff",
                borderRadius: 3,
                transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            />
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 10,
              margin: "4px 0 0",
              textAlign: "right",
            }}
          >
            {totalProgress}/{maxProgress} answers
          </p>
        </div>

        <button
          onClick={handleReset}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1.5px solid rgba(255,255,255,0.5)",
            borderRadius: 12,
            color: "#fff",
            cursor: "pointer",
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'Poppins', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.35)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.2)")
          }
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {/* ── QUESTION PROGRESS BADGES ── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        {QUESTIONS.map((q, i) => {
          const qAnsweredX = answersX.find((a) => a.questionId === q.id);
          const qAnsweredY = answersY.find((a) => a.questionId === q.id);
          const isActive =
            phase === "playing" &&
            i === qIndex &&
            ((activeTile === "X" && !qAnsweredX) ||
              (activeTile === "Y" && !qAnsweredY));
          return (
            <QuestionBadge
              key={q.id}
              q={q}
              index={i}
              answer={
                activeTile === "X"
                  ? qAnsweredX?.value
                  : qAnsweredY?.value
              }
              isActive={isActive}
            />
          );
        })}
      </div>

      {/* ── MATERIAL TILES ── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MaterialTile
          label="X"
          material={materialX}
          answers={answersX}
          revealed={revealedX}
          isWrong={wrongAnim && activeTile === "X"}
        />
        <MaterialTile
          label="Y"
          material={materialY}
          answers={answersY}
          revealed={revealedY}
          isWrong={wrongAnim && activeTile === "Y"}
        />
      </div>

      {/* ── ACTIVE QUESTION OR DONE ── */}
      {phase === "playing" && currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          qIndex={qIndex}
          totalQ={totalRounds}
          activeTile={activeTile}
          onAnswer={handleAnswer}
          wrongAnim={wrongAnim}
        />
      )}

      {/* ── HINT ── */}
      {hint && (
        <HintToast message={hint} onDismiss={() => setHint(null)} />
      )}

      {/* ── DONE PANEL ── */}
      {phase === "done" && (
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "20px 18px",
            border: `2px solid ${COLORS.accentPurple}`,
            boxShadow: `0 8px 32px rgba(74,77,201,0.12)`,
            animation: "dt-reveal 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 28, animation: "dt-glow 2s infinite" }}>
              🎉
            </span>
            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 17,
                color: COLORS.gradStart,
                margin: 0,
              }}
            >
              Both Materials Revealed!
            </h3>
          </div>

          <p
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 13,
              color: COLORS.dark,
              lineHeight: 1.6,
              marginBottom: 14,
            }}
          >
            You answered all 4 property questions for each mystery material.
            Here is the decision path you took:
          </p>

          <BranchPath answersX={answersX} answersY={answersY} />

          <button
            onClick={handleReset}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "12px",
              background: grad,
              color: "#fff",
              border: "none",
              borderRadius: 14,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1.02)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")
            }
          >
            <RotateCcw size={15} /> Try Again with New Materials
          </button>
        </div>
      )}

      {/* ── FOOTER NOTE ── */}
      <p
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: 10,
          color: COLORS.mid,
          textAlign: "center",
          marginTop: "auto",
          paddingTop: 8,
        }}
      >
        NCERT Curiosity · Grade 6 · Chapter 6 — Materials Around Us
      </p>
    </div>
  );
};

export default DecisionTreeTool;