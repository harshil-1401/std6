/* This renderer strips all `import` statements and provides React globally
   ("React and ReactDOM are always available — no need to import them").
   So we pull the hooks off the global React instead of importing them —
   relying on a stripped named import is what leaves useState/useEffect
   undefined and surfaces as React error #130 at render time. */
   declare const React: any;
   const { useState, useEffect, useMemo, useRef } = React;
   
   /* ============================================================================
      ICONS — inline SVG components (self-contained).
   
      NOTE: This file previously imported icons from "lucide-react". In this
      renderer, `import` statements are stripped and libraries are re-provided as
      global UMD shims. lucide-react is not one of the shimmed libraries, so its
      named exports resolved to plain icon-definition OBJECTS instead of React
      components. Rendering an object as a component throws React error #130
      ("Element type is invalid ... got: object"). Defining the icons locally as
      real function components removes that dependency and fixes the crash.
      ========================================================================== */
   type IconProps = { size?: number; color?: string; style?: React.CSSProperties };
   const svgBase = (size: number): React.SVGProps<SVGSVGElement> => ({
     width: size,
     height: size,
     viewBox: "0 0 24 24",
     fill: "none",
     stroke: "currentColor",
     strokeWidth: 2,
     strokeLinecap: "round",
     strokeLinejoin: "round",
   });
   
   const RotateCcw = ({ size = 24, color = "currentColor", style }: IconProps) => (
     <svg {...svgBase(size)} color={color} style={style}>
       <polyline points="1 4 1 10 7 10" />
       <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
     </svg>
   );
   const Check = ({ size = 24, color = "currentColor", style }: IconProps) => (
     <svg {...svgBase(size)} color={color} style={style}>
       <polyline points="20 6 9 17 4 12" />
     </svg>
   );
   const X = ({ size = 24, color = "currentColor", style }: IconProps) => (
     <svg {...svgBase(size)} color={color} style={style}>
       <line x1="18" y1="6" x2="6" y2="18" />
       <line x1="6" y1="6" x2="18" y2="18" />
     </svg>
   );
   const ChevronRight = ({ size = 24, color = "currentColor", style }: IconProps) => (
     <svg {...svgBase(size)} color={color} style={style}>
       <polyline points="9 18 15 12 9 6" />
     </svg>
   );
   const ChevronLeft = ({ size = 24, color = "currentColor", style }: IconProps) => (
     <svg {...svgBase(size)} color={color} style={style}>
       <polyline points="15 18 9 12 15 6" />
     </svg>
   );
   const Lightbulb = ({ size = 24, color = "currentColor", style }: IconProps) => (
     <svg {...svgBase(size)} color={color} style={style}>
       <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
       <path d="M9 18h6" />
       <path d="M10 22h4" />
     </svg>
   );
   const Sparkles = ({ size = 24, color = "currentColor", style }: IconProps) => (
     <svg {...svgBase(size)} color={color} style={style}>
       <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
       <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
       <path d="M5 14l.6 1.6L7.2 16.2 5.6 16.8 5 18.4l-.6-1.6L2.8 16.2l1.6-.6L5 14z" />
     </svg>
   );
   const Ban = ({ size = 24, color = "currentColor", style }: IconProps) => (
     <svg {...svgBase(size)} color={color} style={style}>
       <circle cx="12" cy="12" r="10" />
       <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
     </svg>
   );
   const Play = ({ size = 24, color = "currentColor", style }: IconProps) => (
     <svg
       {...svgBase(size)}
       color={color}
       style={style}
       fill={color === "currentColor" ? "currentColor" : color}
     >
       <polygon points="6 4 20 12 6 20 6 4" />
     </svg>
   );
   
   /* ============================================================================
      Sieve Matching Board  —  Class 6 Science · "Methods of Separation"
      Step-by-step: the student walks through all four mixtures one at a time.
      For each, pick the right sieve, then watch a realistic sifting animation —
      small pieces jiggle on the woven mesh and drop through to a pile below while
      big pieces stay on top. Tea (a solid in a liquid) just runs straight through.
      Themed on the Singularity design system (Poppins, purple #4A4DC9 / orange).
      ========================================================================== */
   
   /* ------------------------------- Types ----------------------------------- */
   type Phase = "intro" | "predict" | "explore" | "recap";
   type GradeLevel = 6 | 7 | 8;
   type Status = "idle" | "wrong" | "correct";
   
   interface Mixture {
     id: string;
     name: string;
     partA: string;
     partB: string;
     passLabel: string;
     stayLabel: string;
     kind: "solid-solid" | "solid-liquid";
     correct: string;
     reason: string;
   }
   interface SieveOption {
     id: string;
     name: string;
     holes: string;
     special?: boolean;
   }
   interface ToolProps {
     props?: {
       width?: number;
       height?: number;
       data?: { config?: { mixtures?: Mixture[]; options?: SieveOption[] } };
       gradeLevel?: GradeLevel;
     };
     setStepDetails?: (s: {
       currentStep: number;
       totalSteps: number;
       isPaused: boolean;
       currentMode: string;
     }) => void;
   }
   
   /* --------------------------- Design tokens ------------------------------- */
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
     successDeep: "#1E9E55",
     successBg: "#EAFBF1",
     danger: "#E53E3E",
     dangerBg: "#FDEBEB",
     amber: "#F59E0B",
   } as const;
   
   /* --------------------------- Default data -------------------------------- */
   const MIXTURES: Mixture[] = [
     {
       id: "atta",
       name: "Atta + Bran",
       partA: "fine flour",
       partB: "bran flakes",
       passLabel: "fine flour falls through",
       stayLabel: "bran stays",
       kind: "solid-solid",
       correct: "veryFine",
       reason:
         "Fine flour slips through the tiny holes, while the bigger bran flakes stay on top.",
     },
     {
       id: "rice",
       name: "Rice + Small Stones",
       partA: "rice grains",
       partB: "small stones",
       passLabel: "small stones fall through",
       stayLabel: "rice stays",
       kind: "solid-solid",
       correct: "medium",
       reason:
         "The grains and stones are different sizes — medium holes let the smaller stones fall through and hold the larger rice back.",
     },
     {
       id: "sand",
       name: "Sand + Pebbles",
       partA: "sand",
       partB: "pebbles",
       passLabel: "sand falls through",
       stayLabel: "pebbles stay",
       kind: "solid-solid",
       correct: "coarse",
       reason:
         "Sand pours through the big holes; the pebbles are far too large to pass.",
     },
     {
       id: "tea",
       name: "Tea Leaves + Tea",
       partA: "tea leaves",
       partB: "liquid tea",
       passLabel: "the liquid runs through",
       stayLabel: "tea leaves caught",
       kind: "solid-liquid",
       correct: "none",
       reason:
         "Tea is a solid mixed in a liquid, so the size-matching of sieving doesn't apply. You separate it by filtration instead - straining catches the tea leaves while the liquid runs through.",
     },
   ];
   
   const OPTIONS: SieveOption[] = [
     { id: "veryFine", name: "Very Fine Sieve", holes: "tiny holes" },
     { id: "medium", name: "Medium Sieve", holes: "medium holes" },
     { id: "coarse", name: "Coarse Sieve", holes: "big holes" },
     { id: "none", name: "Sieving Won't Work", holes: "no sieve fits", special: true },
   ];
   
   /* ------------------------------ Helpers ---------------------------------- */
   const useResponsive = () => {
     const [size, setSize] = useState({ w: 900, h: 700 });
     useEffect(() => {
       const h = () => setSize({ w: window.innerWidth, h: window.innerHeight });
       window.addEventListener("resize", h);
       h();
       return () => window.removeEventListener("resize", h);
     }, []);
     return { ...size, isMobile: size.w < 760, isNarrow: size.w < 480 };
   };
   function mulberry32(seed: number) {
     return () => {
       let t = (seed += 0x6d2b79f5);
       t = Math.imul(t ^ (t >>> 15), t | 1);
       t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
       return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
     };
   }
   function shuffle<T>(arr: T[], rnd: () => number): T[] {
     const a = [...arr];
     for (let i = a.length - 1; i > 0; i--) {
       const j = Math.floor(rnd() * (i + 1));
       [a[i], a[j]] = [a[j], a[i]];
     }
     return a;
   }
   function getHint(mixture: Mixture, pickedId: string): string {
     if (mixture.kind === "solid-liquid" && pickedId !== "none")
       return "Look closely — this one isn't two solids. A sieve can't hold a liquid back. Which card fits a solid mixed in a liquid?";
     if (mixture.kind === "solid-solid" && pickedId === "none")
       return "These are two solids of different sizes, so a sieve CAN separate them. Match the hole size to the particles.";
     return "Almost! Think about the hole size. The holes must be big enough for the smaller part to fall through, yet small enough to trap the bigger part.";
   }
   
   /* color utilities for sprite shading */
   function hexToRgb(h: string) {
     const n = parseInt(h.replace("#", ""), 16);
     return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
   }
   function clamp255(v: number) {
     return Math.max(0, Math.min(255, Math.round(v)));
   }
   function shade(h: string, amt: number) {
     const { r, g, b } = hexToRgb(h);
     const f = (c: number) => clamp255(c + amt);
     return `rgb(${f(r)},${f(g)},${f(b)})`;
   }
   
   /* =========================================================================
      PARTICLE MODEL + SPRITE CACHE (shaded grains, pre-rendered for realism)
      ======================================================================= */
   interface Particle {
     x: number;
     y: number;
     vx: number;
     vy: number;
     r: number;
     kind: "small" | "big" | "liquid";
     shape: "circle" | "oval" | "flake";
     spriteKey: string;
     rot: number;
     vr: number;
     settled: boolean;
     onMesh: boolean;
     done: boolean;
     sifting: boolean;
     siftUntil: number;
   }
   
   const SIM_PALETTE: Record<
     string,
     {
       small: { r: number; color: string; shape: Particle["shape"]; n: number };
       big: { r: number; color: string; shape: Particle["shape"]; n: number };
       liquid?: string;
       powder?: boolean; // true → fine powder (bed + falling streaks); false → discrete grains
     }
   > = {
     atta: {
       small: { r: 1.7, color: "#F0E7D2", shape: "circle", n: 54 },
       big: { r: 3.4, color: "#C7A24A", shape: "flake", n: 10 },
       powder: true,
     },
     rice: {
       small: { r: 2.5, color: "#2B2A30", shape: "circle", n: 6 }, // a few small dark stones (fall through)
       big: { r: 4.6, color: "#EFE9DC", shape: "oval", n: 38 }, // lots of white rice grains (stay on top)
     },
     sand: {
       small: { r: 2.3, color: "#E3B85F", shape: "circle", n: 64 },
       big: { r: 6.2, color: "#B7B0A3", shape: "circle", n: 7 },
       powder: true,
     },
     tea: {
       small: { r: 1.8, color: "#A66838", shape: "circle", n: 70 },
       big: { r: 2.9, color: "#2C1A0C", shape: "oval", n: 18 },
       liquid: "#9A5A2E",
     },
   };
   
   const spriteCache = new Map<string, { c: HTMLCanvasElement; w: number; h: number }>();
   function getSprite(color: string, shape: Particle["shape"], r: number) {
     const key = `${color}|${shape}|${r}`;
     const cached = spriteCache.get(key);
     if (cached) return cached;
     const scale = 2;
     const w = shape === "oval" ? r * 2.8 : shape === "flake" ? r * 2.5 : r * 2.1;
     const h = shape === "oval" ? r * 1.5 : shape === "flake" ? r * 1.8 : r * 2.1;
     const cw = Math.ceil(w * scale) + 4;
     const ch = Math.ceil(h * scale) + 4;
     const c = document.createElement("canvas");
     c.width = cw;
     c.height = ch;
     const ctx = c.getContext("2d")!;
     ctx.translate(cw / 2, ch / 2);
     ctx.scale(scale, scale);
     const grad = ctx.createRadialGradient(-w * 0.2, -h * 0.22, r * 0.2, 0, 0, w * 0.62);
     grad.addColorStop(0, shade(color, 48));
     grad.addColorStop(0.55, color);
     grad.addColorStop(1, shade(color, -34));
     ctx.fillStyle = grad;
     ctx.strokeStyle = shade(color, -55);
     ctx.lineWidth = 0.7;
     ctx.beginPath();
     ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
     ctx.fill();
     ctx.stroke();
     // tiny specular highlight
     ctx.fillStyle = "rgba(255,255,255,.4)";
     ctx.beginPath();
     ctx.ellipse(-w * 0.18, -h * 0.2, w * 0.14, h * 0.12, 0, 0, Math.PI * 2);
     ctx.fill();
     const sp = { c, w, h };
     spriteCache.set(key, sp);
     return sp;
   }
   
   /* =========================================================================
      SieveSimulation — realistic canvas particle animation of one mixture
      ======================================================================= */
   function SieveSimulation({
     mixtureId,
     sieveVariant,
     isLiquid,
     passLabel,
     stayLabel,
     height = 240,
     loop = false,
     playKey = 0,
   }: {
     mixtureId: string;
     sieveVariant: string;
     isLiquid: boolean;
     passLabel?: string;
     stayLabel?: string;
     height?: number;
     loop?: boolean;
     playKey?: number;
   }) {
     const wrapRef = useRef<HTMLDivElement | null>(null);
     const canvasRef = useRef<HTMLCanvasElement | null>(null);
     const rafRef = useRef<number | null>(null);
     const [epoch, setEpoch] = useState(0);
   
     useEffect(() => {
       let to: number | null = null;
       const onResize = () => {
         if (to) window.clearTimeout(to);
         to = window.setTimeout(() => setEpoch((e) => e + 1), 200);
       };
       window.addEventListener("resize", onResize);
       return () => {
         window.removeEventListener("resize", onResize);
         if (to) window.clearTimeout(to);
       };
     }, []);
   
     useEffect(() => {
       const canvas = canvasRef.current;
       const wrap = wrapRef.current;
       if (!canvas || !wrap) return;
       const W = Math.max(wrap.clientWidth || 300, 200);
       const H = height;
       const dpr = Math.min(window.devicePixelRatio || 1, 2);
       canvas.width = Math.round(W * dpr);
       canvas.height = Math.round(H * dpr);
       const ctx = canvas.getContext("2d");
       if (!ctx) return;
       ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
       ctx.lineJoin = "round";
       ctx.lineCap = "round";
   
       const pal = SIM_PALETTE[mixtureId] || SIM_PALETTE.atta;
       const smallRgb = hexToRgb(pal.small.color);
       const powdery = !!pal.powder; // flour/sand sift as powder; rice stones are discrete
       const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
   
       // ---- sieve = a shallow round pan: wide opening on top, mesh floor below ----
       const cx = W / 2;
       const meshY = Math.round(H * 0.4); // the mesh floor (pebbles sit here / sand passes through)
       const wallH = Math.max(H * 0.11, 18);
       const panTopY = meshY - wallH; // the opening rim
       const ptw = Math.min(W * 0.3, 150); // half width of opening
       const pbw = ptw * 0.9; // half width of mesh floor
       const topRy = ptw * 0.26;
       const botRy = pbw * 0.24;
       const meshGap = sieveVariant === "veryFine" ? 5 : sieveVariant === "coarse" ? 14 : 9;
       // How long fine grains linger on the mesh before working through a hole.
       // Realistic sieving: finer holes trap the powder far longer and release it
       // as a slow, gradual trickle while you keep shaking; coarse holes pour fast.
       const siftSpan =
         meshGap <= 5
           ? { base: 2200, rand: 9000 } // very fine (e.g. flour): very slow, steady trickle
           : meshGap <= 9
           ? { base: 900, rand: 3800 } // medium (rice + small stones)
           : { base: 200, rand: 900 }; // coarse (e.g. sand): pours through quickly
   
       // collecting bowl below — a rounded bowl that catches what falls through
       const bowlTopY = Math.round(H * 0.56);
       const bowlBotY = H - 8;
       const bowlHW = pbw * 0.8;
       const bowlRy = bowlHW * 0.24;
       const heapBase = bowlBotY - 4;
       const maxHeapH = (bowlBotY - bowlTopY) * 0.82;
       const heapHeight = (n: number) => Math.min(Math.sqrt(n) * (H * 0.02), maxHeapH);
       const heapWidth = (n: number) => Math.min(heapHeight(n) * 1.8 + 10, bowlHW * 0.92);
   
       const halfAt = (y: number) => {
         if (y <= panTopY) return ptw;
         if (y >= meshY) return pbw;
         return lerp(ptw, pbw, (y - panTopY) / (meshY - panTopY));
       };
   
       const rnd = mulberry32(
         mixtureId.split("").reduce((a, c) => a + c.charCodeAt(0), 11) + epoch + playKey
       );
   
       // emit list
       const list: { kind: Particle["kind"]; r: number; color: string; shape: Particle["shape"] }[] = [];
       const pushN = (
         n: number,
         kind: Particle["kind"],
         def: { r: number; color: string; shape: Particle["shape"] }
       ) => {
         for (let i = 0; i < n; i++) list.push({ kind, ...def });
       };
       if (isLiquid) {
         // The liquid drains through and pools below, but the solid tea leaves are
         // CAUGHT on the mesh (a strainer holds them back). That is filtration, not
         // sieving — so the leaves must NOT drop through.
         pushN(pal.small.n, "liquid", pal.small);
         pushN(pal.big.n, "big", pal.big);
       } else {
         pushN(pal.small.n, "small", pal.small);
         pushN(pal.big.n, "big", pal.big);
       }
       for (let i = list.length - 1; i > 0; i--) {
         const j = Math.floor(rnd() * (i + 1));
         [list[i], list[j]] = [list[j], list[i]];
       }
   
       let liquidLvl = 0;
       let collected = 0; // grains that have piled into the bowl
   
       interface P2 extends Particle {
         depth: number; // front/back offset on the elliptical mesh floor
         sifted: boolean; // has already passed through the mesh once
       }
       const parts: P2[] = [];
       let emitted = 0;
       const total = list.length;
       const pourMs = 1800;
       const emitEvery = pourMs / total;
       let start = performance.now();
       let last = start;
       let finished = false;
       let finishTime = 0;
   
       // pour jar sweeps across the opening so things scatter
       const jarXAt = (now: number) =>
         cx - ptw * 0.6 + Math.min((now - start) / pourMs, 1) * ptw * 1.2;
   
       const spawn = (item: { kind: Particle["kind"]; r: number; color: string; shape: Particle["shape"] }) => {
         const jx = jarXAt(performance.now());
         parts.push({
           x: jx + (rnd() - 0.5) * 12,
           y: panTopY - 30,
           vx: (rnd() - 0.5) * 8,
           vy: 18 + rnd() * 14,
           r: item.r,
           kind: item.kind,
           shape: item.shape,
           spriteKey: item.color,
           rot: rnd() * Math.PI,
           vr: (rnd() - 0.5) * 4,
           settled: false,
           onMesh: false,
           done: false,
           sifting: false,
           siftUntil: 0,
           depth: 0,
           sifted: false,
         });
       };
   
       const drawSprite = (p: Particle) => {
         const sp = getSprite(p.spriteKey, p.shape, p.r);
         ctx.save();
         ctx.translate(p.x, p.y);
         ctx.rotate(p.rot);
         ctx.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
         ctx.restore();
       };
   
       const metalV = (y0: number, y1: number) => {
         const g = ctx.createLinearGradient(0, y0, 0, y1);
         g.addColorStop(0, "#FFFFFF");
         g.addColorStop(0.5, "#C7C7D4");
         g.addColorStop(1, "#8C8CA2");
         return g;
       };
   
       const sieveBackAndFloor = (shake: number) => {
         const c = cx + shake;
         // shadow
         ctx.save();
         ctx.globalAlpha = 0.12;
         ctx.fillStyle = "#000";
         ctx.beginPath();
         ctx.ellipse(c, meshY + botRy * 1.8, pbw * 1.05, botRy * 1.1, 0, 0, Math.PI * 2);
         ctx.fill();
         ctx.restore();
   
         // interior wall (light, behind contents)
         ctx.beginPath();
         ctx.moveTo(c - ptw, panTopY);
         ctx.lineTo(c - pbw, meshY);
         ctx.ellipse(c, meshY, pbw, botRy, 0, Math.PI, 0, true);
         ctx.lineTo(c + ptw, panTopY);
         ctx.ellipse(c, panTopY, ptw, topRy, 0, 0, Math.PI, true);
         ctx.closePath();
         ctx.fillStyle = "#F3F2F8";
         ctx.fill();
   
         // mesh floor
         ctx.save();
         ctx.beginPath();
         ctx.ellipse(c, meshY, pbw, botRy, 0, 0, Math.PI * 2);
         ctx.clip();
         ctx.fillStyle = sieveVariant === "none" ? "#EBEBF4" : "#F0EEF8";
         ctx.fillRect(c - pbw, meshY - botRy - 2, pbw * 2, botRy * 2 + 4);
         const rg = ctx.createRadialGradient(c, meshY - botRy * 0.4, pbw * 0.1, c, meshY + botRy * 0.5, pbw * 1.1);
         rg.addColorStop(0, "rgba(255,255,255,.5)");
         rg.addColorStop(0.7, "rgba(110,110,140,0)");
         rg.addColorStop(1, "rgba(55,55,85,.2)");
         ctx.fillStyle = rg;
         ctx.fillRect(c - pbw, meshY - botRy - 2, pbw * 2, botRy * 2 + 4);
         ctx.strokeStyle = "rgba(74,77,121,.32)";
         ctx.lineWidth = 1;
         for (let i = -pbw - botRy; i <= pbw + botRy; i += meshGap) {
           ctx.beginPath();
           ctx.moveTo(c + i, meshY - botRy - 2);
           ctx.lineTo(c + i + botRy * 2 + 4, meshY + botRy + 2);
           ctx.stroke();
           ctx.beginPath();
           ctx.moveTo(c + i, meshY + botRy + 2);
           ctx.lineTo(c + i + botRy * 2 + 4, meshY - botRy - 2);
           ctx.stroke();
         }
         ctx.restore();
   
         // back rim arcs
         ctx.strokeStyle = metalV(meshY - botRy, meshY + botRy);
         ctx.lineWidth = 3;
         ctx.beginPath();
         ctx.ellipse(c, meshY, pbw, botRy, 0, Math.PI, Math.PI * 2);
         ctx.stroke();
         ctx.strokeStyle = metalV(panTopY - topRy, panTopY + topRy);
         ctx.lineWidth = 4;
         ctx.beginPath();
         ctx.ellipse(c, panTopY, ptw, topRy, 0, Math.PI, Math.PI * 2);
         ctx.stroke();
       };
   
       const sieveFront = (shake: number) => {
         const c = cx + shake;
         ctx.strokeStyle = metalV(meshY - botRy, meshY + botRy);
         ctx.lineWidth = 4;
         ctx.beginPath();
         ctx.ellipse(c, meshY, pbw, botRy, 0, 0, Math.PI);
         ctx.stroke();
         ctx.lineWidth = 4;
         ctx.beginPath();
         ctx.moveTo(c - ptw, panTopY);
         ctx.lineTo(c - pbw, meshY);
         ctx.moveTo(c + ptw, panTopY);
         ctx.lineTo(c + pbw, meshY);
         ctx.stroke();
         ctx.lineWidth = 4;
         ctx.strokeStyle = metalV(panTopY - topRy, panTopY + topRy);
         ctx.beginPath();
         ctx.ellipse(c, panTopY, ptw, topRy, 0, 0, Math.PI);
         ctx.stroke();
       };
   
       const drawBowl = () => {
         ctx.beginPath();
         ctx.moveTo(cx - bowlHW, bowlTopY);
         ctx.quadraticCurveTo(cx - bowlHW, bowlBotY, cx - bowlHW * 0.42, bowlBotY);
         ctx.lineTo(cx + bowlHW * 0.42, bowlBotY);
         ctx.quadraticCurveTo(cx + bowlHW, bowlBotY, cx + bowlHW, bowlTopY);
         ctx.closePath();
         ctx.fillStyle = "#FBFAF7";
         ctx.fill();
       };
       const bowlClip = () => {
         ctx.beginPath();
         ctx.moveTo(cx - bowlHW + 2, bowlTopY);
         ctx.quadraticCurveTo(cx - bowlHW + 2, bowlBotY - 2, cx - bowlHW * 0.42, bowlBotY - 2);
         ctx.lineTo(cx + bowlHW * 0.42, bowlBotY - 2);
         ctx.quadraticCurveTo(cx + bowlHW - 2, bowlBotY - 2, cx + bowlHW - 2, bowlTopY);
         ctx.closePath();
         ctx.clip();
       };
       const drawBowlRim = () => {
         ctx.strokeStyle = "#B9B3C0";
         ctx.lineWidth = 2.5;
         ctx.beginPath();
         ctx.moveTo(cx - bowlHW, bowlTopY);
         ctx.quadraticCurveTo(cx - bowlHW, bowlBotY, cx - bowlHW * 0.42, bowlBotY);
         ctx.lineTo(cx + bowlHW * 0.42, bowlBotY);
         ctx.quadraticCurveTo(cx + bowlHW, bowlBotY, cx + bowlHW, bowlTopY);
         ctx.stroke();
         ctx.strokeStyle = "#CFC9D6";
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.ellipse(cx, bowlTopY, bowlHW, bowlRy, 0, 0, Math.PI * 2);
         ctx.stroke();
       };
   
       const drawJar = (now: number) => {
         const t = (now - start) / pourMs;
         if (t > 1.08) return;
         const jx = jarXAt(now);
         const lift = t > 0.92 ? (t - 0.92) * 160 : 0;
         ctx.save();
         ctx.translate(jx + 12, panTopY - 40 - lift);
         ctx.rotate(0.95);
         ctx.globalAlpha = t > 0.96 ? Math.max(0, 1 - (t - 0.96) * 9) : 1;
         ctx.fillStyle = "#EDEBF7";
         ctx.strokeStyle = DS.primary;
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.moveTo(-15, -12);
         ctx.lineTo(12, -12);
         ctx.lineTo(16, 3);
         ctx.lineTo(18, 8);
         ctx.lineTo(6, 11);
         ctx.lineTo(-15, 11);
         ctx.closePath();
         ctx.fill();
         ctx.stroke();
         ctx.restore();
       };
   
       const drawPill = (x: number, y: number, text: string, bg: string, fg: string, alpha: number) => {
         ctx.save();
         ctx.globalAlpha = alpha;
         ctx.font = "600 11px Poppins, sans-serif";
         const w = ctx.measureText(text).width + 16;
         const h = 18;
         ctx.fillStyle = bg;
         ctx.strokeStyle = shade(bg, -20);
         ctx.lineWidth = 1;
         const rx = x - w / 2;
         const ry = y - h / 2;
         const rr = 9;
         ctx.beginPath();
         ctx.moveTo(rx + rr, ry);
         ctx.lineTo(rx + w - rr, ry);
         ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + rr);
         ctx.lineTo(rx + w, ry + h - rr);
         ctx.quadraticCurveTo(rx + w, ry + h, rx + w - rr, ry + h);
         ctx.lineTo(rx + rr, ry + h);
         ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - rr);
         ctx.lineTo(rx, ry + rr);
         ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
         ctx.closePath();
         ctx.fill();
         ctx.stroke();
         ctx.fillStyle = fg;
         ctx.textAlign = "center";
         ctx.textBaseline = "middle";
         ctx.fillText(text, x, y + 0.5);
         ctx.restore();
       };
   
       const frame = (now: number) => {
         let dt = (now - last) / 1000;
         if (dt > 0.05) dt = 0.05;
         last = now;
         const t = (now - start) / 1000;
   
         while (emitted < total && now - start >= emitted * emitEvery) {
           spawn(list[emitted]);
           emitted++;
         }
   
         const shake = Math.sin(t * 16) * (pbw * 0.04);
         const shakeDX = Math.cos(t * 16) * 16 * (pbw * 0.04) * dt;
   
         for (const p of parts) {
           if (p.done) continue;
   
           if (p.sifting) {
             p.x += shakeDX + (rnd() - 0.5) * 0.6;
             p.rot += p.vr * dt;
             if (now >= p.siftUntil) {
               p.sifting = false;
               p.sifted = true;
               p.vy = 30 + rnd() * 14;
               p.vx = (rnd() - 0.5) * 6;
             }
             continue;
           }
   
           if (!p.settled) {
             // Fine flour, once it sifts through, drifts down slowly (low terminal
             // velocity from air resistance). Only the pour-in grains fall fast.
             const drifting = powdery && p.kind === "small" && p.sifted;
             p.vy += (drifting ? 150 : 600) * dt;
             if (drifting && p.vy > 95) p.vy = 95;
             p.x += p.vx * dt;
             p.y += p.vy * dt;
             p.rot += p.vr * dt;
   
             if (p.y < meshY) {
               const half = halfAt(p.y) - p.r;
               if (p.x < cx - half) { p.x = cx - half; p.vx = Math.abs(p.vx) * 0.4; }
               if (p.x > cx + half) { p.x = cx + half; p.vx = -Math.abs(p.vx) * 0.4; }
             }
   
             const onFloor = Math.abs(p.x - cx) < pbw;
   
             if (p.kind === "big" && onFloor && p.y + p.r >= meshY && p.vy > 0) {
               p.depth = (rnd() - 0.5) * botRy * 1.4;
               p.y = meshY + p.depth - p.r * 0.3;
               p.vy = 0;
               p.vx = 0;
               p.settled = true;
               p.onMesh = true;
             } else if (!isLiquid && p.kind === "small" && !p.sifted && onFloor && p.y + p.r >= meshY && p.vy > 0) {
               // small grains come to rest ON the mesh, forming a powder layer that
               // sits slightly proud of the net; each grain only drops through once
               // the shaking has worked it over a hole — staggered so the flour
               // sifts through as a gradual trickle, not all at once.
               p.depth = (rnd() - 0.5) * botRy * 1.2;
               p.y = meshY + p.depth - p.r - rnd() * meshGap * 0.8;
               p.sifting = true;
               // uniform spread → flour keeps trickling through for the whole
               // shake rather than dumping through all at once
               p.siftUntil = now + siftSpan.base + rnd() * siftSpan.rand;
               p.vy = 0;
               p.vx = 0;
             } else if (p.y >= meshY) {
               // below the mesh — steer firmly toward the centre so every grain lands on the heap
               p.vx += (cx - p.x) * 6 * dt;
               p.vx *= 0.92;
               if (isLiquid) {
                 const inBowl = Math.abs(p.x - cx) < bowlHW * 0.96;
                 if (inBowl && p.y >= bowlBotY - liquidLvl - 2) {
                   liquidLvl = Math.min(liquidLvl + 0.4, bowlBotY - bowlTopY - 6);
                   p.done = true;
                 } else if (p.y > H + 20) p.done = true;
               } else {
                 const hH = heapHeight(collected);
                 const hW = heapWidth(collected);
                 const k = Math.max(0, 1 - Math.abs(p.x - cx) / Math.max(hW, 1));
                 const surf = heapBase - hH * k;
                 if (p.y + p.r >= surf && p.vy > 0) {
                   collected++;
                   p.done = true;
                 } else if (p.y > H + 20) p.done = true;
               }
             }
             if (p.y > H + 30) p.done = true;
           } else if (p.onMesh) {
             p.x += shakeDX + (rnd() - 0.5) * 0.3;
             p.x = Math.max(cx - pbw * 0.82, Math.min(cx + pbw * 0.82, p.x));
           }
         }
   
         // spread resting pebbles apart so they scatter, not stack
         const bigs = parts.filter((p) => p.onMesh && !p.done);
         for (let i = 0; i < bigs.length; i++) {
           for (let j = i + 1; j < bigs.length; j++) {
             const a = bigs[i];
             const b = bigs[j];
             const dx = b.x - a.x;
             const dy = b.y - a.y;
             const dist = Math.hypot(dx, dy) || 0.01;
             const minD = (a.r + b.r) * 0.95;
             if (dist < minD) {
               const push = (minD - dist) / 2;
               const ux = dx / dist;
               a.x -= ux * push;
               b.x += ux * push;
             }
           }
         }
         for (const p of bigs) {
           p.x = Math.max(cx - pbw * 0.82, Math.min(cx + pbw * 0.82, p.x));
           p.y = meshY + p.depth - p.r * 0.3 + Math.sin(t * 16) * 0.5;
         }
   
         // ---------------- draw ----------------
         ctx.clearRect(0, 0, W, H);
   
         // bowl
         drawBowl();
         ctx.save();
         bowlClip();
         if (isLiquid && liquidLvl > 0) {
           const top = bowlBotY - liquidLvl;
           const lg = ctx.createLinearGradient(0, top, 0, bowlBotY);
           lg.addColorStop(0, shade(pal.liquid || "#9A5A2E", 26));
           lg.addColorStop(1, shade(pal.liquid || "#9A5A2E", -18));
           ctx.fillStyle = lg;
           ctx.beginPath();
           ctx.moveTo(cx - bowlHW, bowlBotY);
           ctx.lineTo(cx - bowlHW, top);
           for (let xx = cx - bowlHW; xx <= cx + bowlHW; xx += 7)
             ctx.lineTo(xx, top + Math.sin(xx * 0.16 + t * 4) * 1.4);
           ctx.lineTo(cx + bowlHW, bowlBotY);
           ctx.closePath();
           ctx.fill();
         }
         for (const p of parts) {
           if (p.done || p.onMesh || p.sifting) continue;
           if (p.settled) drawSprite(p);
         }
         // the growing sand heap
         if (!isLiquid && collected > 0) {
           const hH = heapHeight(collected);
           const hW = heapWidth(collected);
           const base = pal.small.color;
           const hg = ctx.createLinearGradient(0, heapBase - hH, 0, heapBase);
           hg.addColorStop(0, shade(base, 30));
           hg.addColorStop(1, shade(base, -22));
           ctx.fillStyle = hg;
           ctx.beginPath();
           ctx.moveTo(cx - hW, heapBase);
           ctx.quadraticCurveTo(cx - hW * 0.45, heapBase - hH, cx, heapBase - hH);
           ctx.quadraticCurveTo(cx + hW * 0.45, heapBase - hH, cx + hW, heapBase);
           ctx.closePath();
           ctx.fill();
           // speckle texture on the heap
           const speckles = Math.min(collected, 46);
           const sr = mulberry32(777);
           ctx.fillStyle = shade(base, -34);
           for (let i = 0; i < speckles; i++) {
             const u = (sr() - 0.5) * 2;
             const px = cx + u * hW * 0.82;
             const k = Math.max(0, 1 - Math.abs(px - cx) / Math.max(hW, 1));
             const py = heapBase - hH * k * sr();
             ctx.globalAlpha = 0.5;
             ctx.beginPath();
             ctx.arc(px, py, pal.small.r * 0.7, 0, Math.PI * 2);
             ctx.fill();
           }
           ctx.globalAlpha = 1;
         }
         ctx.restore();
         drawBowlRim();
   
         // what falls through the mesh: powders rain as a curtain of fine streaks,
         // discrete grains (stones) fall as solid pieces
         for (const p of parts) {
           if (p.done || p.settled || p.onMesh || p.sifting) continue;
           if (p.y <= meshY) continue;
           if (p.kind === "small" && powdery) {
             const len = Math.min(7 + p.vy * 0.24, 28);
             ctx.lineWidth = 1;
             ctx.strokeStyle = `rgba(${smallRgb.r},${smallRgb.g},${smallRgb.b},0.6)`;
             ctx.beginPath();
             ctx.moveTo(p.x, p.y - len);
             ctx.lineTo(p.x, p.y);
             ctx.stroke();
             ctx.strokeStyle = `rgba(${smallRgb.r},${smallRgb.g},${smallRgb.b},0.28)`;
             ctx.beginPath();
             ctx.moveTo(p.x - 3, p.y - len * 0.7);
             ctx.lineTo(p.x - 3, p.y + 2);
             ctx.moveTo(p.x + 3, p.y - len * 0.8);
             ctx.lineTo(p.x + 3, p.y + 1);
             ctx.stroke();
           } else if (p.y > meshY) {
             drawSprite(p);
           }
         }
   
         // sieve back + mesh floor
         sieveBackAndFloor(shake);
   
         // ---- powder bed: the fine grains resting ON the mesh, waiting to sift ----
         // Its size tracks how much flour is still on the net, so the bed grows as
         // it pours in and slowly shrinks as the shaking works it through the holes.
         const restingSmall = parts.reduce(
           (n, p) => n + (p.kind === "small" && p.sifting ? 1 : 0),
           0
         );
         const bedFrac = pal.small.n > 0 ? restingSmall / pal.small.n : 0;
         if (!isLiquid && powdery && bedFrac > 0.02) {
           const c = cx + shake;
           const color = pal.small.color;
           const rxIn = pbw * 0.92;
           const bedRise = botRy * 0.45 + botRy * 2.2 * Math.min(bedFrac, 1);
           ctx.save();
           // clip to the pan interior so the powder stays within the walls
           ctx.beginPath();
           ctx.moveTo(c - ptw, panTopY);
           ctx.lineTo(c - pbw - 2, meshY + botRy + 2);
           ctx.lineTo(c + pbw + 2, meshY + botRy + 2);
           ctx.lineTo(c + ptw, panTopY);
           ctx.closePath();
           ctx.clip();
   
           const baseY = meshY + botRy * 0.2;
           const grad = ctx.createLinearGradient(0, baseY - bedRise - botRy, 0, baseY + botRy);
           grad.addColorStop(0, shade(color, 30));
           grad.addColorStop(0.6, color);
           grad.addColorStop(1, shade(color, -24));
           ctx.fillStyle = grad;
           ctx.beginPath();
           ctx.moveTo(c - rxIn, baseY);
           const segs = 16;
           for (let i = 0; i <= segs; i++) {
             const u = i / segs;
             const x = c - rxIn + u * rxIn * 2;
             const dome = Math.sin(u * Math.PI) * bedRise; // mound, tallest in the middle
             const wave = Math.sin(u * 9 + t * 6) * botRy * 0.16; // jiggly powder surface
             ctx.lineTo(x, baseY - dome + wave);
           }
           ctx.lineTo(c + rxIn, baseY);
           ctx.ellipse(c, baseY, rxIn, botRy * 0.9, 0, 0, Math.PI);
           ctx.closePath();
           ctx.fill();
   
           // speckles of bran / impurity scattered across the powder
           const sr = mulberry32(4242);
           const nSpeck = Math.floor(64 * bedFrac);
           for (let i = 0; i < nSpeck; i++) {
             const u = sr();
             const x = c - rxIn + u * rxIn * 2;
             const dome = Math.sin(u * Math.PI) * bedRise;
             const y = baseY - dome * sr() + (sr() - 0.5) * botRy * 0.4;
             ctx.globalAlpha = 0.6;
             ctx.fillStyle = sr() > 0.45 ? shade(color, -54) : shade(color, 26);
             ctx.beginPath();
             ctx.arc(x, y, 0.8 + sr() * 1.5, 0, Math.PI * 2);
             ctx.fill();
           }
           ctx.globalAlpha = 1;
           ctx.restore();
         }
   
         // big pieces (bran / rice / pebbles) resting on top of the bed + any
         // grains still pouring in from the jar
         const onTop = parts.filter(
           (p) =>
             !p.done &&
             (p.onMesh ||
               (p.sifting && !powdery) ||
               (!p.settled && !p.sifting && p.y <= meshY))
         );
         onTop.sort((a, b) => a.y - b.y);
         for (const p of onTop) {
           if (p.onMesh || p.sifting) {
             ctx.save();
             ctx.globalAlpha = 0.16;
             ctx.fillStyle = "#000";
             ctx.beginPath();
             ctx.ellipse(p.x, p.y + p.r * 0.8, p.r * 1.1, p.r * 0.45, 0, 0, Math.PI * 2);
             ctx.fill();
             ctx.restore();
           }
           drawSprite(p);
         }
   
         // sieve front lip + walls
         sieveFront(shake);
   
         // motion lines on both sides showing the sieve being shaken side-to-side
         if (!finished && (emitted < total || restingSmall > 0)) {
           const amp = Math.abs(Math.sin(t * 16));
           ctx.strokeStyle = `rgba(185,185,210,${0.25 + amp * 0.5})`;
           ctx.lineWidth = 2.4;
           const midY = (panTopY + meshY) / 2 + topRy;
           for (let i = 0; i < 3; i++) {
             const off = 9 + i * 8;
             const r = 7 + i * 4;
             ctx.beginPath();
             ctx.arc(cx - ptw - off, midY, r, Math.PI * 0.62, Math.PI * 1.38);
             ctx.stroke();
             ctx.beginPath();
             ctx.arc(cx + ptw + off, midY, r, -Math.PI * 0.38, Math.PI * 0.38);
             ctx.stroke();
           }
         }
   
         drawJar(now);
   
         const allDone = emitted >= total && parts.every((p) => p.settled || p.done);
         if (allDone && !finished) {
           finished = true;
           finishTime = now;
         }
         if (finished) {
           const a = Math.min((now - finishTime) / 450, 1);
           if (isLiquid) {
             if (stayLabel) drawPill(cx, panTopY - topRy - 14, stayLabel, DS.primaryGhost, DS.primary, a);
             drawPill(cx, bowlTopY - 14, passLabel || "liquid runs through", DS.dangerBg, DS.danger, a);
           } else {
             if (stayLabel) drawPill(cx, panTopY - topRy - 14, stayLabel, DS.primaryGhost, DS.primary, a);
             if (passLabel) drawPill(cx, bowlTopY - 14, passLabel, DS.successBg, DS.successDeep, a);
           }
         }
   
         if (finished && loop && now - finishTime > 1700) {
           if (rafRef.current) cancelAnimationFrame(rafRef.current);
           setEpoch((e) => e + 1);
           return;
         }
         rafRef.current = requestAnimationFrame(frame);
       };
   
       rafRef.current = requestAnimationFrame(frame);
       return () => {
         if (rafRef.current) cancelAnimationFrame(rafRef.current);
       };
     }, [epoch, playKey, mixtureId, sieveVariant, isLiquid, height, loop, passLabel, stayLabel]);
   
     return (
       <div ref={wrapRef} style={{ width: "100%" }}>
         <canvas
           ref={canvasRef}
           style={{
             width: "100%",
             height,
             display: "block",
             borderRadius: 14,
             background: "linear-gradient(180deg, #3A4160, #262C40)",
             border: `1px solid #2A3147`,
           }}
         />
       </div>
     );
   }
   
   /* =========================== Static mixture icon ========================= */
   function MixtureIcon({ id, size = 90 }: { id: string; size?: number }) {
     const rnd = mulberry32(id.split("").reduce((a, c) => a + c.charCodeAt(0), 7));
     const small: React.ReactNode[] = [];
     const big: React.ReactNode[] = [];
     const palette: Record<string, { liquid?: string; small: string; big: string }> = {
       atta: { small: "#F3ECDD", big: "#C9A24A" },
       rice: { small: "#F2EDE0", big: "#2B2A30" },
       sand: { small: "#E3C07A", big: "#B6B0A4" },
       tea: { liquid: "#9A5A2E", small: "#3A2616", big: "#2A1B0F" },
     };
     const p = palette[id] || palette.atta;
     const isLiquid = id === "tea";
     for (let i = 0; i < 24; i++) {
       const x = 24 + rnd() * 42, y = 40 + rnd() * 24;
       if (id === "rice")
         small.push(<ellipse key={`s${i}`} cx={x} cy={y} rx={3} ry={1.5} fill={p.small} stroke="#D8D2C2" strokeWidth={0.5} transform={`rotate(${rnd() * 180} ${x} ${y})`} />);
       else
         small.push(<circle key={`s${i}`} cx={x} cy={y} r={1.6 + rnd()} fill={isLiquid ? p.big : p.small} opacity={0.9} />);
     }
     for (let i = 0; i < 6; i++) {
       const x = 26 + rnd() * 38, y = 42 + rnd() * 20;
       if (id === "rice") big.push(<circle key={`b${i}`} cx={x} cy={y} r={2.4 + rnd() * 1.3} fill={p.big} />);
       else big.push(<circle key={`b${i}`} cx={x} cy={y} r={3 + rnd() * 2.2} fill={p.big} />);
     }
     return (
       <svg width={size} height={size * 0.8} viewBox="0 0 90 72" shapeRendering="geometricPrecision">
         <path d="M 16 34 Q 16 30 20 30 L 70 30 Q 74 30 74 34 L 70 60 Q 69 66 62 66 L 28 66 Q 21 66 20 60 Z" fill={isLiquid ? p.liquid : "#FBFAF6"} stroke={DS.gray400} strokeWidth={2} />
         <clipPath id={`mclip-${id}`}><path d="M 18 33 L 72 33 L 68 60 Q 67 64 61 64 L 29 64 Q 23 64 22 60 Z" /></clipPath>
         <g clipPath={`url(#mclip-${id})`}>
           {isLiquid && <rect x={16} y={32} width={58} height={34} fill={p.liquid} />}
           {small}
           {big}
         </g>
         {id === "tea" && <path d="M 74 38 q 12 2 12 10 q 0 8 -12 9" fill="none" stroke={DS.gray400} strokeWidth={2.5} />}
       </svg>
     );
   }
   
   /* ============================ Sieve icon (chips) ========================= */
   function SieveIcon({ variant, size = 64 }: { variant: string; size?: number }) {
     const cfg: Record<string, { r: number; gap: number }> = {
       veryFine: { r: 1.3, gap: 5 },
       medium: { r: 2.4, gap: 8 },
       coarse: { r: 3.8, gap: 12 },
       none: { r: 2.4, gap: 8 },
     };
     const { r, gap } = cfg[variant] || cfg.medium;
     const cx = 32, cy = 30, rx = 24, ry = 13;
     const holes: React.ReactNode[] = [];
     for (let y = cy - ry + 3; y <= cy + ry - 3; y += gap)
       for (let x = cx - rx + 3; x <= cx + rx - 3; x += gap) {
         const dx = (x - cx) / rx, dy = (y - cy) / ry;
         if (dx * dx + dy * dy <= 0.82) holes.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff" />);
       }
     return (
       <svg width={size} height={size} viewBox="0 0 64 64" shapeRendering="geometricPrecision">
         <rect x={2} y={27} width={10} height={6} rx={3} fill={DS.gray400} />
         <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={variant === "none" ? "#F0EEF8" : DS.primaryGhost} stroke={DS.primary} strokeWidth={2.5} />
         <g>{holes}</g>
         <path d={`M ${cx - rx} ${cy} L ${cx - rx + 2} ${cy + 10} Q ${cx} ${cy + 18} ${cx + rx - 2} ${cy + 10} L ${cx + rx} ${cy}`} fill="none" stroke={DS.primary} strokeWidth={2.5} strokeLinejoin="round" />
         {variant === "none" && (
           <g>
             <circle cx={cx} cy={cy + 2} r={15} fill="none" stroke={DS.danger} strokeWidth={3.5} />
             <line x1={cx - 10} y1={cy - 8} x2={cx + 10} y2={cy + 12} stroke={DS.danger} strokeWidth={3.5} strokeLinecap="round" />
           </g>
         )}
       </svg>
     );
   }
   
   /* ============================ Confetti ==================================== */
   function Confetti({ n }: { n: number }) {
     const pieces = useMemo(
       () =>
         Array.from({ length: n }).map((_, i) => ({
           id: i, left: Math.random() * 100, delay: Math.random() * 0.5,
           dur: 1.8 + Math.random() * 1.1, col: [DS.primary, DS.accent, DS.success, DS.amber, "#DB2777"][i % 5],
           size: 6 + Math.random() * 6, rot: Math.random() * 360,
         })),
       [n]
     );
     return (
       <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
         {pieces.map((p) => (
           <span key={p.id} style={{ position: "absolute", top: -16, left: `${p.left}%`, width: p.size, height: p.size * 0.6, background: p.col, borderRadius: 2, transform: `rotate(${p.rot}deg)`, animation: `smb-fall ${p.dur}s ${p.delay}s ease-in forwards` }} />
         ))}
       </div>
     );
   }
   
   /* ---------------------------- Section title ------------------------------ */
   function SectionTitle({ n, label }: { n: number; label: string }) {
     return (
       <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
         <span style={{ width: 30, height: 30, borderRadius: 9999, background: `linear-gradient(135deg, ${DS.primaryDark}, ${DS.primary})`, color: "#fff", fontWeight: 800, fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
         <span style={{ fontWeight: 800, fontSize: 18, color: DS.gray900 }}>{label}</span>
       </div>
     );
   }
   
   /* ============================ Main component ============================== */
   function SieveMatchingBoard({ props = {}, setStepDetails }: ToolProps) {
     const mixturesData = props.data?.config?.mixtures ?? MIXTURES;
     const optionsData = props.data?.config?.options ?? OPTIONS;
     const { isMobile, isNarrow } = useResponsive();
   
     const [seed, setSeed] = useState(() => Date.now());
     const [phase, setPhase] = useState<Phase>("intro");
     const [prediction, setPrediction] = useState<string | null>(null);
     const [exampleIdx, setExampleIdx] = useState(0);
     const [picks, setPicks] = useState<Record<string, string | null>>({});
     const [status, setStatus] = useState<Record<string, Status>>({});
     const [hints, setHints] = useState<Record<string, string>>({});
     const [replay, setReplay] = useState<Record<string, number>>({});
   
     const STEPS: Phase[] = ["intro", "predict", "explore", "recap"];
     const stepIndex = STEPS.indexOf(phase);
   
     const mixtures = useMemo(() => shuffle(mixturesData, mulberry32(seed)), [seed, mixturesData]);
     const options = useMemo(() => shuffle(optionsData, mulberry32(seed ^ 0x9e3779b9)), [seed, optionsData]);
   
     useEffect(() => {
       const style = document.createElement("style");
       style.setAttribute("data-smb", "true");
       style.textContent = `
         @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
         @keyframes smb-fall { to { transform: translateY(640px) rotate(540deg); opacity: 0; } }
         @keyframes smb-up { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
         @keyframes smb-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
       `;
       document.head.appendChild(style);
       return () => { document.querySelectorAll("style[data-smb]").forEach((s) => s.remove()); };
     }, []);
   
     useEffect(() => {
       setStepDetails?.({ currentStep: stepIndex, totalSteps: STEPS.length, isPaused: true, currentMode: "explore" });
     }, [stepIndex]); // eslint-disable-line
   
     // Step 3 walks through only the sieve-able mixtures; the non-sieveable tea is
     // covered by the Step 2 prediction and the Step 4 recap, so it isn't an example.
     const exploreMixtures = useMemo(() => mixtures.filter((m) => m.correct !== "none"), [mixtures]);
     const correctCount = exploreMixtures.filter((m) => status[m.id] === "correct").length;
     const optionById = (id: string) => optionsData.find((o) => o.id === id);
     const sieveVariantFor = (m: Mixture) => (m.correct === "none" ? "medium" : m.correct);
   
     const current = exploreMixtures[exampleIdx];
   
     const handlePick = (mixture: Mixture, optId: string) => {
       if (status[mixture.id] === "correct") return;
       setPicks((p) => ({ ...p, [mixture.id]: optId }));
       if (optId === mixture.correct) {
         setStatus((s) => ({ ...s, [mixture.id]: "correct" }));
         setHints((h) => ({ ...h, [mixture.id]: "" }));
         setReplay((r) => ({ ...r, [mixture.id]: (r[mixture.id] || 0) + 1 }));
       } else {
         setStatus((s) => ({ ...s, [mixture.id]: "wrong" }));
         setHints((h) => ({ ...h, [mixture.id]: getHint(mixture, optId) }));
       }
     };
   
     const playAgain = () => {
       setSeed(Date.now());
       setPhase("intro");
       setPrediction(null);
       setExampleIdx(0);
       setPicks({});
       setStatus({});
       setHints({});
       setReplay({});
     };
   
     /* styles */
     const btnBase: React.CSSProperties = { fontFamily: "Poppins, sans-serif", fontWeight: 700, border: "none", borderRadius: 9999, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 26px", fontSize: 16, minHeight: 50, transition: "transform 100ms ease, filter 120ms ease" };
     const primaryBtn: React.CSSProperties = { ...btnBase, background: `linear-gradient(135deg, ${DS.accent}, ${DS.accentDark})`, color: DS.white, boxShadow: "0 6px 16px rgba(255,114,18,.32)" };
     const ghostBtn: React.CSSProperties = { ...btnBase, background: DS.white, color: DS.primary, border: `2px solid ${DS.primaryLight}` };
     const disabledBtn: React.CSSProperties = { ...btnBase, background: DS.gray200, color: DS.gray400, cursor: "not-allowed", boxShadow: "none" };
     const smallBtn: React.CSSProperties = { ...btnBase, padding: "8px 16px", fontSize: 13, minHeight: 0 };
     const cardShadow = "0 4px 18px rgba(0,0,0,.06)";
   
     return (
       <div style={{ fontFamily: "Poppins, sans-serif", background: DS.gray100, minHeight: "100%", width: "100%", color: DS.gray900, boxSizing: "border-box" }}>
         {/* Header */}
         <div style={{ background: `linear-gradient(135deg, ${DS.primaryDark}, ${DS.primary})`, padding: isMobile ? "16px" : "20px 28px", color: DS.white }}>
           <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
             <div>
               <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, letterSpacing: -0.3 }}>Match the Sieve</div>
               <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 500 }}>Methods of Separation · Sieving</div>
             </div>
             <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
               {STEPS.map((s, i) => (
                 <span key={s} style={{ width: i === stepIndex ? 26 : 9, height: 9, borderRadius: 9999, background: i <= stepIndex ? DS.accent : "rgba(255,255,255,.35)", transition: "all 200ms ease" }} />
               ))}
             </div>
           </div>
         </div>
   
         <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "16px 14px 30px" : "24px 24px 40px", boxSizing: "border-box" }}>
           {/* ===================== STEP 1 — INTRO ===================== */}
           {phase === "intro" && (
             <div style={{ animation: "smb-up 380ms ease" }}>
               <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: DS.accentLight, color: DS.accentDark, padding: "6px 14px", borderRadius: 9999, fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
                 <Sparkles size={16} /> Sieving challenge
               </div>
               <p style={{ fontSize: isMobile ? 18 : 22, fontWeight: 600, lineHeight: 1.45, margin: "0 0 8px" }}>
                 A sieve separates a solid mixture by size — small pieces fall through the holes, big pieces stay on top.
               </p>
               <p style={{ fontSize: isMobile ? 16 : 17, color: DS.gray700, lineHeight: 1.6, margin: "0 0 18px" }}>
                 You'll go through all four mixtures one at a time. Watch the live demo below, then start. <b>One mixture cannot be sieved at all</b> — keep an eye out for it!
               </p>
   
               <div style={{ background: DS.white, borderRadius: 18, padding: 14, boxShadow: cardShadow, marginBottom: 22 }}>
                 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                   <Play size={16} color={DS.primary} /> Sand + Pebbles through a coarse sieve
                 </div>
                 <SieveSimulation mixtureId="sand" sieveVariant="coarse" isLiquid={false} passLabel="sand falls through" stayLabel="pebbles stay" height={isMobile ? 200 : 240} loop />
               </div>
   
               <div style={{ fontWeight: 800, fontSize: 14, color: DS.primaryDark, margin: "0 0 10px" }}>Your sieve options</div>
               <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
                 {options.map((o) => (
                   <div key={o.id} style={{ background: o.special ? DS.dangerBg : DS.white, border: `2px solid ${o.special ? DS.danger : DS.primaryLight}`, borderRadius: 16, padding: 12, textAlign: "center" }}>
                     {o.special ? (
                       <div style={{ height: isMobile ? 56 : 64, display: "flex", alignItems: "center", justifyContent: "center" }}><Ban size={40} color={DS.danger} /></div>
                     ) : (
                       <SieveIcon variant={o.id} size={isMobile ? 56 : 64} />
                     )}
                     <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{o.name}</div>
                     <div style={{ fontSize: 11.5, color: DS.gray700 }}>{o.holes}</div>
                   </div>
                 ))}
               </div>
   
               <button style={primaryBtn} onClick={() => setPhase("predict")}>Let's start <ChevronRight size={20} /></button>
             </div>
           )}
   
           {/* ===================== STEP 2 — PREDICT ===================== */}
           {phase === "predict" && (
             <div style={{ animation: "smb-up 380ms ease" }}>
               <SectionTitle n={2} label="Make a prediction" />
               <div style={{ background: DS.white, borderRadius: 20, padding: isMobile ? 18 : 26, boxShadow: cardShadow }}>
                 <p style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, margin: "0 0 16px" }}>
                   Which mixture do you think <span style={{ color: DS.primary }}>no sieve</span> can separate?
                 </p>
                 <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: 12 }}>
                   {mixtures.map((m) => {
                     const picked = prediction === m.id;
                     const reveal = prediction !== null;
                     const isRight = m.kind === "solid-liquid";
                     return (
                       <button key={m.id} onClick={() => prediction === null && setPrediction(m.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: `2px solid ${reveal && isRight ? DS.success : picked ? DS.danger : DS.primaryLight}`, background: reveal && isRight ? DS.successBg : picked ? DS.dangerBg : DS.white, cursor: prediction === null ? "pointer" : "default", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15, color: DS.gray900, textAlign: "left" }}>
                         <span style={{ flexShrink: 0 }}><MixtureIcon id={m.id} size={54} /></span>
                         <span style={{ flex: 1 }}>{m.name}</span>
                         {reveal && isRight && <Check size={18} color={DS.success} />}
                         {reveal && picked && !isRight && <X size={18} color={DS.danger} />}
                       </button>
                     );
                   })}
                 </div>
                 {prediction !== null && (
                   <div style={{ marginTop: 18, background: DS.primaryGhost, borderRadius: 14, padding: "14px 16px", animation: "smb-up 300ms ease" }}>
                     <p style={{ margin: 0, fontSize: isMobile ? 16 : 17, lineHeight: 1.55 }}>
                       <b style={{ color: DS.primary }}>Tea Leaves + Tea</b> is the odd one out. It's a solid floating in a <i>liquid</i>, and sieving only works on <b>solid–solid</b> mixtures. You'll see why as you go through each example.
                     </p>
                   </div>
                 )}
                 <div style={{ marginTop: 22, textAlign: "right" }}>
                   <button style={prediction ? primaryBtn : disabledBtn} disabled={!prediction} onClick={() => { setExampleIdx(0); setPhase("explore"); }}>Go through the examples <ChevronRight size={20} /></button>
                 </div>
               </div>
             </div>
           )}
   
           {/* ===================== STEP 3 — EXPLORE (one example at a time) ======= */}
           {phase === "explore" && current && (() => {
             const m = current;
             const st = status[m.id] || "idle";
             const picked = picks[m.id];
             const locked = st === "correct";
             const usedOpt = optionById(m.correct);
             const isLast = exampleIdx === exploreMixtures.length - 1;
             return (
               <div style={{ animation: "smb-up 320ms ease" }} key={m.id}>
                 <SectionTitle n={3} label="Sieve each mixture" />
   
                 {/* example progress */}
                 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                   <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                     {exploreMixtures.map((mm, i) => (
                       <button
                         key={mm.id}
                         onClick={() => (i <= exampleIdx || status[mm.id] === "correct") && setExampleIdx(i)}
                         style={{
                           width: i === exampleIdx ? 30 : 11,
                           height: 11,
                           borderRadius: 9999,
                           border: "none",
                           padding: 0,
                           cursor: i <= exampleIdx || status[mm.id] === "correct" ? "pointer" : "default",
                           background: status[mm.id] === "correct" ? DS.success : i === exampleIdx ? DS.primary : DS.gray200,
                           transition: "all 200ms ease",
                         }}
                         title={mm.name}
                       />
                     ))}
                   </div>
                   <span style={{ fontWeight: 700, fontSize: 13, color: DS.gray700 }}>
                     Example {exampleIdx + 1} of {exploreMixtures.length} · {correctCount} solved
                   </span>
                 </div>
   
                 <div style={{ background: DS.white, borderRadius: 20, padding: isMobile ? 16 : 22, boxShadow: cardShadow, border: `2px solid ${locked ? DS.success : st === "wrong" ? DS.danger : "transparent"}`, animation: st === "wrong" ? "smb-shake 380ms ease" : "none" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                     <MixtureIcon id={m.id} size={isMobile ? 76 : 90} />
                     <div>
                       <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 22 }}>{m.name}</div>
                       <div style={{ fontSize: 14, color: DS.gray700 }}>{m.partA} + {m.partB}</div>
                     </div>
                     {locked && (
                       <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, color: DS.successDeep, fontWeight: 700, fontSize: 14 }}>
                         <Check size={18} /> Solved
                       </span>
                     )}
                   </div>
   
                   {!locked ? (
                     <>
                       <p style={{ fontWeight: 700, fontSize: isMobile ? 15 : 16, margin: "0 0 12px" }}>
                         Which option separates this mixture?
                       </p>
                       <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: 10 }}>
                         {options.map((o) => {
                           const isPicked = picked === o.id;
                           const showWrong = isPicked && st === "wrong";
                           return (
                             <button key={o.id} onClick={() => handlePick(m, o.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: `2px solid ${showWrong ? DS.danger : o.special ? "#F3C9C9" : DS.primaryLight}`, background: showWrong ? DS.dangerBg : DS.white, cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13.5, color: DS.gray900, textAlign: "left", minHeight: 52 }}>
                               {o.special ? <Ban size={26} color={DS.danger} style={{ flexShrink: 0 }} /> : <span style={{ flexShrink: 0 }}><SieveIcon variant={o.id} size={42} /></span>}
                               <span style={{ lineHeight: 1.2 }}>{o.name}<br /><span style={{ fontWeight: 500, fontSize: 11.5, color: DS.gray700 }}>{o.holes}</span></span>
                             </button>
                           );
                         })}
                       </div>
                       {st === "wrong" && hints[m.id] && (
                         <div style={{ marginTop: 14, background: DS.accentLight, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 8 }}>
                           <Lightbulb size={20} color={DS.accentDark} style={{ flexShrink: 0, marginTop: 1 }} />
                           <p style={{ margin: 0, fontSize: 14, color: DS.gray900, lineHeight: 1.5 }}>{hints[m.id]}</p>
                         </div>
                       )}
                     </>
                   ) : (
                     <>
                       <SieveSimulation
                         mixtureId={m.id}
                         sieveVariant={sieveVariantFor(m)}
                         isLiquid={m.kind === "solid-liquid"}
                         passLabel={m.passLabel}
                         stayLabel={m.stayLabel}
                         height={isMobile ? 210 : 260}
                         playKey={replay[m.id] || 0}
                       />
                       <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                         <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: m.correct === "none" ? DS.dangerBg : DS.primaryGhost, color: m.correct === "none" ? DS.danger : DS.primary, borderRadius: 9999, padding: "6px 14px", fontWeight: 700, fontSize: 13 }}>
                           {usedOpt?.name}
                         </span>
                         <button style={{ ...smallBtn, background: DS.white, color: DS.primary, border: `2px solid ${DS.primaryLight}` }} onClick={() => setReplay((r) => ({ ...r, [m.id]: (r[m.id] || 0) + 1 }))}>
                           <RotateCcw size={15} /> Watch again
                         </button>
                       </div>
                       <div style={{ marginTop: 12, background: DS.successBg, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 8 }}>
                         <Check size={20} color={DS.successDeep} style={{ flexShrink: 0, marginTop: 1 }} />
                         <p style={{ margin: 0, fontSize: 14, color: DS.gray900, lineHeight: 1.5 }}>{m.reason}</p>
                       </div>
                     </>
                   )}
                 </div>
   
                 {/* nav buttons */}
                 <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", gap: 10 }}>
                   <button
                     style={{ ...ghostBtn, opacity: exampleIdx === 0 ? 0.4 : 1, cursor: exampleIdx === 0 ? "not-allowed" : "pointer" }}
                     disabled={exampleIdx === 0}
                     onClick={() => setExampleIdx((i) => Math.max(0, i - 1))}
                   >
                     <ChevronLeft size={18} /> Previous
                   </button>
                   {!isLast ? (
                     <button style={locked ? primaryBtn : disabledBtn} disabled={!locked} onClick={() => setExampleIdx((i) => i + 1)}>
                       Next example <ChevronRight size={20} />
                     </button>
                   ) : (
                     <button style={locked ? primaryBtn : disabledBtn} disabled={!locked} onClick={() => setPhase("recap")}>
                       See what we learned <ChevronRight size={20} />
                     </button>
                   )}
                 </div>
               </div>
             );
           })()}
   
           {/* ===================== STEP 4 — RECAP ===================== */}
           {phase === "recap" && (
             <div style={{ animation: "smb-up 380ms ease", position: "relative" }}>
               <Confetti n={50} />
               <SectionTitle n={4} label="What you learned" />
               <div style={{ background: DS.white, borderRadius: 20, padding: isMobile ? 18 : 26, boxShadow: cardShadow }}>
                 <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: DS.successBg, color: DS.successDeep, padding: "6px 14px", borderRadius: 9999, fontWeight: 800, fontSize: 14, marginBottom: 16 }}>
                   <Check size={18} /> All three sieved — nice work!
                 </div>
   
                 <div style={{ background: DS.primaryGhost, borderRadius: 16, padding: "16px 18px", marginBottom: 18 }}>
                   <p style={{ margin: "0 0 6px", fontWeight: 800, color: DS.primary, fontSize: 16 }}>Why tea was the trap</p>
                   <p style={{ margin: 0, fontSize: isMobile ? 16 : 17, lineHeight: 1.6 }}>
                     <b>Sieving works only on solid–solid mixtures</b> whose pieces are different sizes. Tea leaves sit in <i>liquid</i> tea, so this isn't a sieving job. You strain it instead — the mesh catches the leaves while the liquid runs through. That's <b style={{ color: DS.primary }}>filtration</b>, not sieving.
                   </p>
                 </div>
   
                 <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
                   {mixtures
                     .slice()
                     .sort((a, b) => (a.kind === "solid-liquid" ? 1 : 0) - (b.kind === "solid-liquid" ? 1 : 0))
                     .map((m) => {
                       const o = optionById(m.correct);
                       return (
                         <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: DS.gray100, borderRadius: 14, padding: "10px 14px" }}>
                           <MixtureIcon id={m.id} size={58} />
                           <div style={{ flex: 1, minWidth: 0 }}>
                             <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                               {m.name} → <span style={{ color: m.correct === "none" ? DS.danger : DS.primary }}>{o?.name}</span>
                             </div>
                             <div style={{ fontSize: 13, color: DS.gray700, lineHeight: 1.45 }}>{m.reason}</div>
                           </div>
                         </div>
                       );
                     })}
                 </div>
   
                 <div style={{ background: DS.accentLight, borderRadius: 14, padding: "14px 16px" }}>
                   <p style={{ margin: "0 0 6px", fontWeight: 700, color: DS.accentDark }}>The big idea</p>
                   <p style={{ margin: 0, fontSize: isMobile ? 16 : 17, lineHeight: 1.6 }}>
                     Different separation methods use different properties. Sieving and handpicking use <b>size</b>; winnowing uses <b>weight</b>; a magnet uses <b>magnetism</b>; and filtration or evaporation handle <b>solids mixed in liquids</b>. Pick the method that matches what's in the mixture.
                   </p>
                 </div>
   
                 <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
                   <button style={primaryBtn} onClick={playAgain}><RotateCcw size={18} /> Play again!</button>
                   <button style={ghostBtn} onClick={() => { setExampleIdx(0); setPhase("explore"); }}>Review examples</button>
                 </div>
               </div>
             </div>
           )}
         </div>
       </div>
     );
   }
   
   export default SieveMatchingBoard;