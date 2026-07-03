import React from 'react';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: ball_bounce_tool.tsx
// NCERT Grade 6 Science · Chapter 6 "Materials Around Us" · Activity 6.4
// Drop different balls from a fixed height, watch them bounce, record the height.
// ════════════════════════════════════════════════════════════════════════════

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'experiment' | 'compare';

interface StepDetails {
  currentStep: number;
  totalSteps: number;
  isPaused: boolean;
  currentMode: ModeType;
}

interface BallSpec {
  id: string;
  name: string;
  material: string;
  // bounceFactor: fraction of drop height the ball returns to (0..1)
  bounceFactor: number;
  level: 'High' | 'Medium' | 'Low';
  // visual
  fill: string;
  fill2: string;
  stroke: string;
  // identifies which inline-SVG ball face to draw
  art: 'tennis' | 'cricket' | 'exercise';
  note: string;
}

interface BallBounceAdditionalProps {
  balls?: BallSpec[];
  dropHeightCm?: number;        // the "fixed height" balls are dropped from
  highlightBallId?: string;     // which ball to pre-select / emphasise
  showTable?: boolean;          // show the recording table (default true)
  showMaterials?: boolean;      // show the material swatch row (default true)
  autoRecord?: boolean;         // auto-fill the table row after a drop (default true)
}

interface BallBounceToolProps {
  props?: {
    width?: number;
    height?: number;
    initialMode?: ModeType;
    showModeSelector?: boolean;
    themeColor?: string;
    animationSpeed?: number;
    additionalProps?: BallBounceAdditionalProps;
  };
  setStepDetails?: (s: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (v: boolean) => void;
}

// ==================== DESIGN TOKENS (Singularity) ====================

const T = {
  purple: '#533086',
  purpleSoft: '#C1C1EA',
  purpleWash: '#EFEDF7',
  orange: '#FC9145',
  orangeSoft: '#FFF3E4',
  ink: '#2E2747',
  grey: '#4E4E4E',
  greyLine: '#E3E0EE',
  panel: '#FFFFFF',
  page: '#F5F5F5',
  font: 'Poppins, system-ui, -apple-system, sans-serif',
};

// ==================== DEFAULT DATA (from textbook Fig. 6.3) ====================

const DEFAULT_BALLS: BallSpec[] = [
  {
    id: 'tennis',
    name: 'Tennis ball',
    material: 'Rubber + felt',
    bounceFactor: 0.62,
    level: 'High',
    fill: '#D4E157',
    fill2: '#AFB42B',
    stroke: '#827717',
    art: 'tennis',
    note: 'Springy rubber stores energy on impact and pushes the ball back up.',
  },
  {
    id: 'cricket',
    name: 'Cricket ball',
    material: 'Cork + leather',
    bounceFactor: 0.18,
    level: 'Low',
    fill: '#C62828',
    fill2: '#8E0000',
    stroke: '#5A0000',
    art: 'cricket',
    note: 'Hard, dense cork barely deforms, so almost no energy returns as bounce.',
  },
  {
    id: 'exercise',
    name: 'Hand exercise ball',
    material: 'Soft foam',
    bounceFactor: 0.30,
    level: 'Medium',
    fill: '#FFD54F',
    fill2: '#FFA000',
    stroke: '#E65100',
    art: 'exercise',
    note: 'Soft foam squashes a lot and absorbs energy, giving a gentle bounce.',
  },
];

// ==================== EASING HELPERS ====================

function easeInQuad(t: number): number {
  return t * t;
}
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

// ==================== RESPONSIVE SIZING MAP ====================
// Single sizing map keyed by breakpoint label.

type BP = 'XS' | 'S' | 'M' | 'L';

const SIZING: Record<BP, {
  stage: number;     // stage (drop arena) height in px
  ball: number;      // ball diameter in px
  pad: number;
  title: number;
  body: number;
  cell: number;
  gap: number;
}> = {
  XS: { stage: 240, ball: 34, pad: 12, title: 16, body: 12, cell: 11, gap: 12 },
  S:  { stage: 290, ball: 42, pad: 14, title: 18, body: 12.5, cell: 12, gap: 14 },
  M:  { stage: 350, ball: 54, pad: 18, title: 21, body: 13.5, cell: 13, gap: 18 },
  L:  { stage: 420, ball: 64, pad: 22, title: 24, body: 14.5, cell: 14, gap: 22 },
};

function pickBP(w: number): BP {
  if (w < 400) return 'XS';
  if (w < 560) return 'S';
  if (w < 860) return 'M';
  return 'L';
}

// ==================== INLINE SVG BALL FACES ====================

function BallFace(props: { spec: BallSpec; size: number; squash: number }) {
  const { spec, size, squash } = props;
  const r = size / 2;
  // squash: 0 = round, up to ~0.35 = flattened at the bottom on impact
  const sx = 1 + squash * 0.55;
  const sy = 1 - squash;
  const gid = 'bg-' + spec.id;
  const sid = 'sh-' + spec.id;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        display: 'block',
        transform: `scaleX(${sx}) scaleY(${sy})`,
        transformOrigin: '50% 100%',
        transition: 'transform 90ms linear',
        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.22))',
      }}
    >
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={spec.fill} />
          <stop offset="100%" stopColor={spec.fill2} />
        </radialGradient>
        <radialGradient id={sid} cx="35%" cy="28%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${gid})`} stroke={spec.stroke} strokeWidth="2" />
      <ellipse cx="38" cy="34" rx="26" ry="20" fill={`url(#${sid})`} />
      {spec.art === 'tennis' && (
        <>
          <path d="M14 30 Q50 52 14 74" fill="none" stroke="#FAFAFA" strokeWidth="4" strokeLinecap="round" />
          <path d="M86 26 Q50 48 86 70" fill="none" stroke="#FAFAFA" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {spec.art === 'cricket' && (
        <>
          <path d="M50 6 Q60 50 50 94" fill="none" stroke="#FFF3E0" strokeWidth="2" strokeDasharray="3 4" />
          <path d="M44 14 L40 20 M44 28 L40 34 M44 42 L40 48 M44 56 L40 62 M44 70 L40 76"
            stroke="#FFE0B2" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M56 14 L60 20 M56 28 L60 34 M56 42 L60 48 M56 56 L60 62 M56 70 L60 76"
            stroke="#FFE0B2" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {spec.art === 'exercise' && (
        <circle cx="50" cy="50" r="32" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.45" />
      )}
    </svg>
  );
}

// ==================== KEYFRAMES ====================

const KEYFRAMES = `
@keyframes bb-fadeUp { from { opacity: 0; transform: translateY(14px);} to { opacity:1; transform: translateY(0);} }
@keyframes bb-pop { 0% { transform: scale(0.6); opacity:0;} 70% { transform: scale(1.06);} 100% { transform: scale(1); opacity:1;} }
@keyframes bb-ring { 0% { transform: scale(0.4); opacity:0.5;} 100% { transform: scale(2.4); opacity:0;} }
@keyframes bb-rowIn { from { opacity:0; transform: translateX(-10px);} to { opacity:1; transform: translateX(0);} }
@keyframes bb-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(83,48,134,0);} 50% { box-shadow: 0 0 0 6px rgba(83,48,134,0.18);} }
`;

// ==================== MAIN COMPONENT ====================

function BallBounceTool(props: BallBounceToolProps) {
  const config = props.props || {};
  const ap: BallBounceAdditionalProps = config.additionalProps || {};

  const balls = ap.balls && ap.balls.length ? ap.balls : DEFAULT_BALLS;
  const dropHeightCm = typeof ap.dropHeightCm === 'number' ? ap.dropHeightCm : 100;
  const showTable = ap.showTable !== false;
  const showMaterials = ap.showMaterials !== false;
  const autoRecord = ap.autoRecord !== false;
  const speed = config.animationSpeed && config.animationSpeed > 0 ? config.animationSpeed : 1;
  const showModeSelector = config.showModeSelector !== false;

  const initialMode: ModeType = config.initialMode === 'experiment' ? 'experiment' : 'compare';

  const startId =
    ap.highlightBallId && balls.some(function (b) { return b.id === ap.highlightBallId; })
      ? (ap.highlightBallId as string)
      : balls[0].id;

  // ---- per-ball motion state ----
  // Each active ball has its own top (0..1 fraction, 0 = release height, 1 = floor),
  // squash, and measured peak. Single-ball mode animates one entry; compare mode all.
  interface Motion { top: number; squash: number; peak: number | null; }

  function blankMotion(): Motion { return { top: 0, squash: 0, peak: null }; }

  const [mode, setMode] = React.useState<ModeType>(initialMode);
  const [bp, setBp] = React.useState<BP>('L');
  const [selectedId, setSelectedId] = React.useState<string>(startId);
  const [phase, setPhase] = React.useState<'idle' | 'dropping' | 'running' | 'done'>('idle');
  // motion keyed by ball id
  const [motion, setMotion] = React.useState<Record<string, Motion>>({});
  // ids currently shown on the stage (one in experiment mode, all in compare mode)
  const [activeIds, setActiveIds] = React.useState<string[]>([startId]);
  const [rings, setRings] = React.useState<{ id: number; ballId: string }[]>([]);
  // recorded results keyed by ball id -> measured bounce height in cm
  const [records, setRecords] = React.useState<Record<string, number>>({});

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const ringSeq = React.useRef<number>(0);

  const S = SIZING[bp];
  const selected = balls.find(function (b) { return b.id === selectedId; }) || balls[0];

  function getMotion(id: string): Motion {
    return motion[id] || blankMotion();
  }

  const isBusy = phase === 'dropping' || phase === 'running';

  // ---- ResizeObserver-driven breakpoints ----
  React.useEffect(function () {
    const el = containerRef.current;
    if (!el) return;
    function measure(w: number) { setBp(pickBP(w)); }
    measure(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(function (entries) {
      for (const e of entries) measure(e.contentRect.width);
    });
    ro.observe(el);
    return function () { ro.disconnect(); };
  }, []);

  // ---- inject keyframes ----
  React.useEffect(function () {
    const id = 'bb-keyframes';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = KEYFRAMES;
    document.head.appendChild(s);
    return function () {
      const ex = document.getElementById(id);
      if (ex && ex.parentNode) ex.parentNode.removeChild(ex);
    };
  }, []);

  // ---- initialise active balls for the starting mode ----
  React.useEffect(function () {
    if (initialMode === 'compare') {
      setActiveIds(balls.map(function (b) { return b.id; }));
    } else {
      setActiveIds([startId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- report step details upward ----
  React.useEffect(function () {
    if (props.setStepDetails) {
      props.setStepDetails({
        currentStep: 1,
        totalSteps: 1,
        isPaused: phase === 'idle' || phase === 'done',
        currentMode: mode,
      });
    }
  }, [phase, mode]);

  function cleanup() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }
  React.useEffect(function () { return cleanup; }, []);

  function spawnRing(ballId: string) {
    const rid = ringSeq.current++;
    setRings(function (r) { return r.concat([{ id: rid, ballId: ballId }]); });
    setTimeout(function () {
      setRings(function (r) { return r.filter(function (x) { return x.id !== rid; }); });
    }, 700);
  }

  // ---- unified physics-flavoured drop engine ----
  // Animates every ball in `ids` at the same time, each with its own timing
  // derived from its bounceFactor. One requestAnimationFrame loop drives them all.
  function runDropMulti(ids: string[]) {
    cleanup();

    const specs = ids
      .map(function (id) { return balls.find(function (b) { return b.id === id; }); })
      .filter(function (b): b is BallSpec { return !!b; });
    if (!specs.length) return;

    // reset motion for the balls about to drop
    setMotion(function (m) {
      const next = Object.assign({}, m);
      specs.forEach(function (s) { next[s.id] = blankMotion(); });
      return next;
    });
    setActiveIds(ids);
    setPhase('dropping');

    // precompute timing per ball
    const timing: Record<string, { fall: number; rise: number; settle: number; total: number; bounce: number; rang: boolean }> = {};
    specs.forEach(function (s) {
      const bounce = s.bounceFactor;
      const fall = 720 / speed;
      const rise = (660 * Math.sqrt(Math.max(0.05, bounce))) / speed;
      const settle = 280 / speed;
      timing[s.id] = { fall: fall, rise: rise, settle: settle, total: fall + 90 + rise + settle, bounce: bounce, rang: false };
    });
    const maxTotal = Math.max.apply(null, specs.map(function (s) { return timing[s.id].total; }));

    const start = performance.now();

    function frame(now: number) {
      const t = now - start;
      let anyRising = false;

      setMotion(function (prev) {
        const next = Object.assign({}, prev);
        specs.forEach(function (s) {
          const tm = timing[s.id];
          const bounce = tm.bounce;
          let top: number;
          let squash = 0;
          let peak: number | null = next[s.id] ? next[s.id].peak : null;

          if (t < tm.fall) {
            top = easeInQuad(t / tm.fall);             // accelerating fall
          } else if (t < tm.fall + 90) {
            top = 1;                                    // impact: squash
            squash = bounce < 0.25 ? 0.14 : 0.3;
            if (!tm.rang && t - tm.fall < 40) { tm.rang = true; spawnRing(s.id); }
          } else if (t < tm.fall + 90 + tm.rise) {
            const p = easeOutQuad((t - tm.fall - 90) / tm.rise);  // decelerating rise
            top = 1 - bounce * p;
            anyRising = true;
          } else if (t < tm.total) {
            const p = (t - tm.fall - 90 - tm.rise) / tm.settle;   // settle to floor
            top = (1 - bounce) + bounce * easeInQuad(p);
            peak = bounce;
            anyRising = true;
          } else {
            top = 1;
            peak = bounce;
          }
          next[s.id] = { top: top, squash: squash, peak: peak };
        });
        return next;
      });

      if (anyRising) setPhase('running');

      if (t < maxTotal + 20) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        // finished: settle all to floor, commit records
        setMotion(function (prev) {
          const next = Object.assign({}, prev);
          specs.forEach(function (s) { next[s.id] = { top: 1, squash: 0, peak: timing[s.id].bounce }; });
          return next;
        });
        if (autoRecord) {
          setRecords(function (r) {
            const next = Object.assign({}, r);
            specs.forEach(function (s) { next[s.id] = Math.round(dropHeightCm * timing[s.id].bounce); });
            return next;
          });
        }
        setPhase('done');
        rafRef.current = null;
      }
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  function handleDrop() {
    if (isBusy) return;
    runDropMulti([selectedId]);
  }

  // drop ALL balls together, side by side
  function runCompareAll() {
    if (isBusy) return;
    setRecords({});
    runDropMulti(balls.map(function (b) { return b.id; }));
  }

  function handleReset() {
    cleanup();
    setPhase('idle');
    setRings([]);
    setMotion(function (m) {
      const next: Record<string, Motion> = {};
      // keep balls visible at release height
      activeIds.forEach(function (id) { next[id] = blankMotion(); });
      return next;
    });
  }

  function handleResetAll() {
    cleanup();
    setPhase('idle');
    setRings([]);
    setRecords({});
    setMotion({});
    setActiveIds(mode === 'compare' ? balls.map(function (b) { return b.id; }) : [selectedId]);
  }

  function selectBall(id: string) {
    if (isBusy || mode === 'compare') return;
    setSelectedId(id);
    setActiveIds([id]);
    setPhase('idle');
    setMotion({});
  }

  // ---- layout geometry for the stage ----
  const stageH = S.stage;
  const topPad = 30;                          // room at top for the drop-height chip
  const floorY = stageH - 44;                 // y of the floor line within the stage (room for lane labels)
  const usable = floorY - S.ball - topPad;    // vertical travel range for the ball's top
  const dropLineY = topPad + S.ball / 2;      // release height marker

  // top (in px) of a ball given its motion fraction (0 = release, 1 = floor)
  function ballYpx(top: number): number {
    return topPad + top * usable;
  }
  // y of the peak guide line for a measured bounce fraction
  function peakYpx(peakFrac: number): number {
    return floorY - peakFrac * usable - S.ball / 2;
  }

  // balls currently on the stage, laid out in equal lanes
  const stageBalls = activeIds
    .map(function (id) { return balls.find(function (b) { return b.id === id; }); })
    .filter(function (b): b is BallSpec { return !!b; });
  const laneCount = Math.max(1, stageBalls.length);

  const isSmall = bp === 'XS' || bp === 'S';   // phone-ish widths
  const isXS = bp === 'XS';

  // short lane labels so 3 lanes fit on narrow screens
  function laneLabel(b: BallSpec): string {
    if (b.id === 'tennis') return 'Tennis';
    if (b.id === 'cricket') return 'Cricket';
    if (b.id === 'exercise') return isXS ? 'Foam' : 'Exercise';
    const base = b.name.replace(' ball', '');
    return isXS && base.length > 8 ? base.split(' ')[0] : base;
  }

  // ---- styles ---- (entries are either static CSS objects or factory functions)
  const st: Record<string, any> = {
    root: {
      fontFamily: T.font,
      background: T.page,
      borderRadius: 22,
      padding: S.pad,
      color: T.ink,
      boxSizing: 'border-box',
      width: '100%',
    },
    header: {
      display: 'flex',
      flexWrap: 'wrap',
      flexDirection: isSmall ? 'column' : 'row',
      alignItems: isSmall ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: isSmall ? 12 : 10,
      marginBottom: S.gap,
    },
    eyebrow: {
      fontSize: isXS ? 10 : 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      fontWeight: 600,
      color: T.orange,
    },
    h1: { fontSize: S.title, fontWeight: 700, margin: '2px 0 0', lineHeight: 1.15 },
    sub: { fontSize: S.body, color: T.grey, margin: '4px 0 0', maxWidth: 560 },
    modeWrap: {
      display: 'flex',
      width: isSmall ? '100%' : 'auto',
      background: T.purpleWash,
      borderRadius: 999,
      padding: 4,
      gap: 4,
      flexShrink: 0,
    },
    modeBtn: (active: boolean) => ({
      border: 'none',
      cursor: 'pointer',
      borderRadius: 999,
      padding: isXS ? '9px 10px' : '8px 16px',
      fontFamily: T.font,
      fontSize: isXS ? 12 : 13,
      fontWeight: 600,
      color: active ? '#fff' : T.purple,
      background: active ? T.purple : 'transparent',
      transition: 'all .25s ease',
      flex: isSmall ? 1 : 'initial',
      whiteSpace: 'nowrap',
    }),
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: S.gap,
      alignItems: 'stretch',
    },
    panel: {
      background: T.panel,
      borderRadius: 18,
      padding: S.pad,
      boxShadow: '0 6px 20px rgba(46,39,71,0.06)',
      boxSizing: 'border-box',
      minWidth: 0,
    },
    panelTitle: { fontSize: 14, fontWeight: 700, margin: '0 0 10px', color: T.purple },
    stage: {
      position: 'relative',
      height: stageH,
      borderRadius: 14,
      background: 'linear-gradient(180deg,#FBFAFF 0%, #F1EEFA 100%)',
      overflow: 'hidden',
      border: `1px solid ${T.greyLine}`,
    },
    floor: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: floorY,
      height: 44,
      background: 'repeating-linear-gradient(45deg,#E6E1F4,#E6E1F4 8px,#DCD6EE 8px,#DCD6EE 16px)',
      borderTop: `2px solid ${T.purpleSoft}`,
    },
    guide: (y: number, color: string, dashed: boolean) => ({
      position: 'absolute',
      left: 8,
      right: 8,
      top: y,
      borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
      pointerEvents: 'none',
    }),
    guideTag: (color: string) => ({
      position: 'absolute',
      right: 6,
      top: -10,
      fontSize: isXS ? 9 : 10,
      fontWeight: 700,
      color: '#fff',
      background: color,
      borderRadius: 6,
      padding: '2px 6px',
      whiteSpace: 'nowrap',
    }),
    swatchRow: {
      display: 'grid',
      gridTemplateColumns: `repeat(${balls.length}, minmax(0,1fr))`,
      gap: isXS ? 6 : 10,
      marginTop: 12,
    },
    swatch: (active: boolean, b: BallSpec) => ({
      cursor: isBusy ? 'default' : 'pointer',
      borderRadius: 14,
      padding: isXS ? 7 : 10,
      textAlign: 'center',
      border: `2px solid ${active ? T.purple : T.greyLine}`,
      background: active ? T.purpleWash : '#fff',
      transition: 'all .2s ease',
      animation: active ? 'bb-glow 1.6s ease-in-out infinite' : 'none',
      minWidth: 0,
    }),
    swatchName: { fontSize: isXS ? 11 : 12, fontWeight: 700, marginTop: 6, lineHeight: 1.2 },
    swatchMat: { fontSize: isXS ? 9.5 : 10.5, color: T.grey, marginTop: 2 },
    controls: {
      display: 'flex',
      gap: 10,
      marginTop: 14,
      flexDirection: isXS ? 'column' : 'row',
      flexWrap: 'wrap',
    },
    btnPrimary: {
      flex: 1,
      minWidth: isXS ? 0 : 130,
      width: isXS ? '100%' : 'auto',
      border: 'none',
      cursor: isBusy ? 'not-allowed' : 'pointer',
      borderRadius: 999,
      padding: '12px 18px',
      fontFamily: T.font,
      fontSize: isXS ? 13 : 14,
      fontWeight: 700,
      color: '#fff',
      background: isBusy ? T.purpleSoft : T.purple,
      transition: 'all .2s ease',
    },
    btnGhost: {
      border: `2px solid ${T.purple}`,
      cursor: 'pointer',
      borderRadius: 999,
      padding: '12px 18px',
      width: isXS ? '100%' : 'auto',
      fontFamily: T.font,
      fontSize: isXS ? 13 : 14,
      fontWeight: 700,
      color: T.purple,
      background: '#fff',
    },
    note: {
      marginTop: 12,
      fontSize: S.body,
      color: T.grey,
      background: T.orangeSoft,
      borderRadius: 12,
      padding: '10px 12px',
      lineHeight: 1.45,
      borderLeft: `4px solid ${T.orange}`,
    },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: S.cell, minWidth: isXS ? 300 : 0 },
    th: {
      textAlign: 'left',
      fontWeight: 700,
      color: '#fff',
      background: T.purple,
      padding: isXS ? '8px 8px' : '10px 10px',
      fontSize: S.cell,
    },
    thFirst: { borderTopLeftRadius: 10 },
    thLast: { borderTopRightRadius: 10, textAlign: 'right' as const },
    td: { padding: isXS ? '8px 8px' : '10px 10px', borderBottom: `1px solid ${T.greyLine}`, verticalAlign: 'middle' },
    tdRight: { textAlign: 'right' as const, fontWeight: 700 },
    pill: (lvl: string) => ({
      display: 'inline-block',
      fontSize: isXS ? 10 : 11,
      fontWeight: 700,
      padding: isXS ? '3px 7px' : '3px 10px',
      borderRadius: 999,
      whiteSpace: 'nowrap',
      color: lvl === 'High' ? '#2E7D32' : lvl === 'Medium' ? '#E65100' : '#B71C1C',
      background: lvl === 'High' ? '#E8F5E9' : lvl === 'Medium' ? '#FFF3E0' : '#FFEBEE',
    }),
    footHint: { fontSize: isXS ? 11 : 11.5, color: T.grey, marginTop: 12, lineHeight: 1.4 },
  };

  return (
    <div ref={containerRef} style={st.root}>
      <div style={{ animation: 'bb-fadeUp .5s ease both' }}>
        {/* Header */}
        <div style={st.header}>
          <div style={{ minWidth: 0 }}>
            <div style={st.eyebrow}>Activity 6.4 · Let us explore</div>
            <h1 style={st.h1}>Which ball bounces the highest?</h1>
            <p style={st.sub}>
              These balls are the same size but made of different materials. Drop each one
              from the same height, watch it bounce, and record how high it comes back up.
            </p>
          </div>
          {showModeSelector && (
            <div style={st.modeWrap}>
              <button style={st.modeBtn(mode === 'experiment')} onClick={function () { setMode('experiment'); cleanup(); setPhase('idle'); setRings([]); setMotion({}); setActiveIds([selectedId]); }}>
                Drop one
              </button>
              <button style={st.modeBtn(mode === 'compare')} onClick={function () { setMode('compare'); cleanup(); setPhase('idle'); setRings([]); setMotion({}); setRecords({}); setActiveIds(balls.map(function (b) { return b.id; })); }}>
                Drop all together
              </button>
            </div>
          )}
        </div>

        {/* Two-column body */}
        <div style={st.grid}>
          {/* LEFT: stage + materials + controls */}
          <div style={st.panel}>
            <div style={st.panelTitle}>The drop test</div>

            <div style={st.stage}>
              {/* drop-height caption pinned to the corner, clear of the balls */}
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 6,
                  zIndex: 3,
                  fontSize: isXS ? 9 : 10,
                  fontWeight: 700,
                  color: '#fff',
                  background: T.purple,
                  borderRadius: 6,
                  padding: '2px 7px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                Drop height · {dropHeightCm} cm
              </div>

              {/* release-height guide line (shared) */}
              <div style={st.guide(dropLineY, T.purpleSoft, true)} />

              {/* lanes: one column per active ball */}
              {stageBalls.map(function (b, idx) {
                const m = getMotion(b.id);
                const laneW = 100 / laneCount;                 // % width of a lane
                const laneCenter = laneW * idx + laneW / 2;    // % from left
                const showPeak = m.peak != null && (phase === 'running' || phase === 'done');
                const measuredCm = m.peak != null ? Math.round(dropHeightCm * m.peak) : null;
                return (
                  <div key={b.id} style={{ position: 'absolute', left: laneW * idx + '%', top: 0, width: laneW + '%', height: '100%' }}>
                    {/* per-ball peak guide */}
                    {showPeak && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '12%',
                          right: '12%',
                          top: peakYpx(m.peak as number),
                          borderTop: `2px dashed ${b.stroke}`,
                          pointerEvents: 'none',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            top: -9,
                            fontSize: isXS ? 8.5 : 9.5,
                            fontWeight: 700,
                            color: '#fff',
                            background: b.stroke,
                            borderRadius: 5,
                            padding: '1px 5px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {measuredCm} cm
                        </span>
                      </div>
                    )}

                    {/* impact rings for this ball */}
                    {rings.filter(function (rg) { return rg.ballId === b.id; }).map(function (rg) {
                      return (
                        <div
                          key={rg.id}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: floorY,
                            width: S.ball,
                            height: S.ball / 2,
                            marginLeft: -S.ball / 2,
                            borderRadius: '50%',
                            border: `3px solid ${b.stroke}`,
                            opacity: 0.6,
                            transform: 'scale(0.4)',
                            animation: 'bb-ring .65s ease-out forwards',
                          }}
                        />
                      );
                    })}

                    {/* the ball */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: ballYpx(m.top),
                        marginLeft: -S.ball / 2,
                        width: S.ball,
                        height: S.ball,
                      }}
                    >
                      <BallFace spec={b} size={S.ball} squash={m.squash} />
                    </div>

                    {/* lane label under the floor */}
                    {laneCount > 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '8%',
                          right: '8%',
                          top: floorY + 10,
                          textAlign: 'center',
                          fontSize: isXS ? 9.5 : 10.5,
                          fontWeight: 700,
                          color: T.purple,
                          background: '#fff',
                          borderRadius: 6,
                          padding: '3px 2px',
                          lineHeight: 1.1,
                          boxShadow: '0 1px 3px rgba(46,39,71,0.12)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {laneLabel(b)}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={st.floor} />
            </div>

            {/* material swatches */}
            {showMaterials && (
              <div style={st.swatchRow}>
                {balls.map(function (b) {
                  const active = mode === 'compare' ? activeIds.indexOf(b.id) !== -1 : b.id === selectedId;
                  return (
                    <div key={b.id} style={st.swatch(active, b)} onClick={function () { selectBall(b.id); }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <BallFace spec={b} size={isXS ? 28 : 36} squash={0} />
                      </div>
                      <div style={st.swatchName}>{b.name}</div>
                      <div style={st.swatchMat}>{b.material}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* controls */}
            <div style={st.controls}>
              {mode === 'experiment' ? (
                <button style={st.btnPrimary} onClick={handleDrop} disabled={isBusy}>
                  {isBusy ? 'Dropping…' : `Drop the ${selected.name.toLowerCase()}`}
                </button>
              ) : (
                <button style={st.btnPrimary} onClick={runCompareAll} disabled={isBusy}>
                  {isBusy ? 'Dropping…' : 'Drop all together'}
                </button>
              )}
              <button style={st.btnGhost} onClick={handleResetAll}>Reset</button>
            </div>

            <div style={st.note}>
              {mode === 'compare' ? (
                <span><strong>Watch closely:</strong> all three are released together from the same height — the springy {balls.slice().sort(function (a, b2) { return b2.bounceFactor - a.bounceFactor; })[0].name.toLowerCase()} climbs back the highest.</span>
              ) : (
                <span><strong>{selected.name}:</strong> {selected.note}</span>
              )}
            </div>
          </div>

          {/* BELOW: recording table (fills after the balls are dropped) */}
          <div style={st.panel}>
            <div style={st.panelTitle}>Table 6.2 · Bouncing level of the balls</div>

            {/* table */}
            {showTable && (
              <div style={{ marginTop: 14, overflowX: 'auto' }}>
                <table style={st.table}>
                  <thead>
                    <tr>
                      <th style={Object.assign({}, st.th, st.thFirst)}>Ball</th>
                      <th style={st.th}>Material</th>
                      <th style={st.th}>Height of bounce</th>
                      <th style={Object.assign({}, st.th, st.thLast)}>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balls.map(function (b, i) {
                      const rec = records[b.id];
                      const tested = rec != null;
                      return (
                        <tr
                          key={b.id}
                          style={{
                            background: b.id === selectedId ? T.purpleWash : 'transparent',
                            animation: tested ? `bb-rowIn .4s ease ${i * 0.05}s both` : 'none',
                          }}
                        >
                          <td style={st.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <BallFace spec={b} size={24} squash={0} />
                              <span style={{ fontWeight: 600 }}>{b.name}</span>
                            </div>
                          </td>
                          <td style={Object.assign({}, st.td, { color: T.grey })}>{b.material}</td>
                          <td style={Object.assign({}, st.td, st.tdRight)}>
                            {tested ? `${rec} cm` : '—'}
                          </td>
                          <td style={Object.assign({}, st.td, { textAlign: 'right' })}>
                            {tested ? <span style={st.pill(b.level)}>{b.level}</span> : <span style={{ color: T.greyLine }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={st.footHint}>
              The ball that comes back up the highest has the highest bounce. Notice it is the
              one made of springy rubber — the material an object is made of decides how it behaves.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BallBounceTool;

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ════════════════════════════════════════════════════════════════════════════