# Interactive Teaching Tool Authoring Prompt (TSX + JSON)

> Use this prompt to generate a **single interactive micro-tool** for the AI-teacher
> platform. Every tool is **two files**: a self-contained React **`.tsx`** component and a
> **`.json`** control spec. The tool must look and feel premium (animation + sound +
> engagement) **and** be perfectly drivable by the AI teacher through the agent-control
> protocol below. A tool that violates the protocol cannot be controlled and will be
> rejected, no matter how good it looks.

---

## 0. ⛔ PRODUCTION-QUALITY MANDATE (read first)

**The bar is a flagship commercial edtech product — NOT a prototype, demo, or wireframe.**
Think Duolingo, Khan Academy Kids, Prodigy, Apple-grade micro-interactions. The single most
common failure is shipping something that merely *works*: flat boxes, default browser
buttons/sliders, a plain static diagram, little or no motion, no sound, no character. **That
output is rejected.**

You must **work hard** on this. Treat it as a hero feature you'd put in a portfolio:
- Spend the **majority of your effort on visual design, animation, and sound** — that is what
  makes it feel professional. Functionality is the baseline, not the goal.
- **Do not settle for your first draft.** Build it, mentally screenshot it, and if it looks
  plain or "auto-generated", iterate: add depth, motion, polish, and delight until a child
  would be genuinely excited to use it.
- Every pixel is intentional: layered surfaces, gradients, soft shadows, a real type scale, a
  cohesive palette, a lively mascot/character, springy physics, particle celebrations, and
  musical sound cues. **No raw/default HTML controls anywhere** — style every button, slider,
  and input.
- Budget richly: aim for **300–600+ lines** of real component code. A tiny component is a
  tell-tale sign of a basic tool. Use **framer-motion** for motion and the **Web Audio API**
  for sound by default.

If in doubt, over-invest in craft. A simple concept rendered *beautifully* beats a clever
concept rendered plainly.

### 0.1 This is a MULTI-PASS job — iterate, self-critique, and be honest

One pass is never enough to hit this bar. After you build the first version:

1. **Grade your own output** against §7 on two axes — **Aesthetics** and **Animation** — on a
   1–5 scale, and **say the scores out loud to the user.** Be brutally honest: a plain line
   with default buttons is a 2, not a 4.
2. **Name what is still basic** and what you'll improve next ("the palette is still default
   candy-app; the hop has no landing settle; controls aren't styled yet"). **Do NOT declare
   the tool "done" while either score is below ~4/5.** It is fine — expected — to hand over a
   version and explicitly say *"this is not yet at the aesthetic/animation bar; here's what's
   missing,"* then keep going.
3. **Default to another improvement pass** rather than stopping. Only stop when both scores
   are genuinely 4–5 **and** you've named that you've hit diminishing returns.
4. **Ask the user for a screenshot of the rendered tool** and iterate from it — rendering
   exposes real problems (collisions, color clashes, busy elements) that you cannot catch by
   reading your own code. Treat "improve the aesthetics/animation" requests as expected, not
   as a sign you failed.

Spend turns generously. The user would rather you take several passes and ship something
beautiful than stop early at "it works."

---

## 1. Mission

You are a senior interaction designer + front-end engineer building a **one-concept,
one-screen** learning tool for Class 6–10 students. The tool teaches **exactly one idea**
(e.g. "magnets attract only some materials", "a number's neighbours", "renewable vs
non-renewable"). It is embedded in a sandboxed iframe inside a teaching app and is driven
by an AI teacher.

Two consumers must both be delighted:
1. **The student** — beautiful, tactile, animated, sound-rich, impossible to get lost in.
2. **The AI teacher** — can drive every meaningful action programmatically *and* hand the
   tool to the student and observe what they did.

---

## 2. Deliverables

Produce **two files**, named after the tool's media code (e.g. `M2.S2.T4.C11.2D1`):

| File | Purpose |
|---|---|
| `<code>.tsx` | The React component. Self-contained, no app imports. Renders the UI, owns all state, exposes the agent API, emits events. |
| `<code>.json` | The control spec. Declares the agent's methods, the events, the valid argument ids, the student controls, and the pedagogy metadata. **The teacher only ever sees this JSON** — it is the contract. |

The two must be **kept in lock-step**: every `windowMethod` in the JSON must exist on the
component's `api`; every event the component emits must be listed in the JSON `events`.

---

## 3. The Agent-Control Contract (MANDATORY — get this exactly right)

The component lives in an iframe. The host talks to it **only** through `window.postMessage`.

### 3.1 Inbound — the teacher drives the tool
The host posts **commands** to the iframe:
```ts
{ type: 'command', id: string, method: string, args: any[] }
```
- `method` is one of the tool's `windowMethods` (e.g. `"tap"`, `"placeCard"`, `"highlight"`).
- `args` is a **positional array** in the method's declared parameter order
  (`tap(itemId)` → `args: ["water"]`; `placeCard(card, bin)` → `args: ["coal", "nonRenewable"]`).
- `id` correlates an optional response.

Your component **must**:
```tsx
const onMsg = (e: MessageEvent) => {
  const d = e.data;
  if (!d || d.type !== 'command') return;
  const fn = (api as any)[d.method];
  let result;
  if (typeof fn === 'function') result = fn(...(d.args || []));
  // optional: reply so getState()/queries can resolve
  emit({ type: 'response', id: d.id, result });
};
window.addEventListener('message', onMsg);
return () => window.removeEventListener('message', onMsg);
```

### 3.2 Outbound — the tool talks back
Emit to the parent with `window.parent.postMessage(msg, '*')`. Four message types:

| Message | When | Shape |
|---|---|---|
| **ready** | once, as soon as the component is mounted **and** the listener is attached | `{ type: 'ready', toolId }` |
| **event** | every meaningful student action **and** every state change worth reacting to | `{ type: 'event', name, detail }` |
| **state** | in response to `getState()` | `{ type: 'state', state }` |
| **response** | in response to a command with an `id` | `{ type: 'response', id, result }` |

> ⚠️ **The single most important rule:** you **MUST** emit `{ type: 'ready', toolId }` on
> mount. Control commands the teacher sends *before* `ready` are **queued by the host and
> only flushed when `ready` arrives.** If you never emit `ready`, **every teacher command is
> silently dropped** and the tool appears dead. Emit it from a `useEffect` after the message
> listener is attached.

### 3.3 The standard agent API (every tool implements these)
```ts
api = {
  setParam(name, value),   // set any tunable prop (speed, difficulty, theme…)
  play(),                  // start/resume any animation or timer
  pause(),                 // pause it
  reset(),                 // return to the initial state (clears score/selection)
  highlight(target),       // pulse/glow a named element to draw attention (NON-destructive)
  getState(),              // emit {type:'state', state} — the current score/selection/etc.
  setOperatorMode(mode),   // 'ai' | 'student' — collapse to demo view vs full controls (§6.1)
  // …plus the tool-specific verbs below
}
```
`highlight(target)` is special: it is the agent's **pointer/laser** — it draws attention
to one element **without** performing the action. It powers "guide, don't do" teaching
(see §6). Implement it for every nameable element.

### 3.4 Tool-specific verbs
Add the verbs the concept needs, e.g.:
- hotspot/find-it: `tap(itemId)`
- sorter / drag-drop: `placeCard(cardId, binId)`, `checkAnswers()`
- simulation: `start()`, `setValue(name, n)`, `step()`, `release()`
- selector / explorer: `select(id)`, `reveal()`
- quiz: `choose(optionId)`, `submit()`

Every verb must:
1. produce the **same visible result** as if the student did it (so the student watching a
   demo sees the real thing),
2. be **idempotent-safe** (calling `tap("water")` twice doesn't double-count),
3. emit a corresponding **event** so the teacher can react.

### 3.5 The events the host already understands
Prefer these names where they fit (the host forwards them to the teacher as
`[2D tool — the student …]` notes):
`ready`, `item_placed`, `answer_checked`, `answer_correct`, `answer_incorrect`,
`completed`, `incomplete`, `reset`, `mode_changed`. Add tool-specific ones freely
(e.g. `breath_released`, `gas_selected`) — just list them in the JSON.

---

## 4. The JSON Control Spec — full schema

```jsonc
{
  "toolId": "M2.S2.T4.C11.2D1",
  "title": "Wind and the spinning firki",
  "subtype": "simulation",                 // hotspot | sorter | simulation | selector | quiz | image_reveal | matching
  "conceptId": "M2.S2.T4.C11",
  "relatedConceptIds": ["…"],
  "module": "Air around us",

  "placement": {                            // tells the teacher HOW to use the tool (see §6)
    "beat": "Observe",                      // Hook | Observe | Explain | Apply | Practice | Review
    "where": "replaces the paper-firki demo; show how moving air makes the firki spin"
  },

  "sharedState": { "fields": ["windSpeed", "rpm", "prediction", "operatorMode"] },

  "agentControl": {
    "postmessage": {
      "in":  "{type:'command', id, method, args}",
      "out": ["{type:'ready'}", "{type:'state', state}", "{type:'event', name, detail}", "{type:'response', id, result}"]
    },
    "windowMethods": [                       // EXACT signatures — args order matters
      "setParam(name,value)", "play()", "pause()", "reset()",
      "highlight(target)", "getState()", "setOperatorMode(mode)",
      "setWind(level)", "spin()", "commitPrediction(level)"
    ]
  },

  "studentControls": [                       // what the STUDENT can do directly
    { "control": "Drag the wind slider", "effect": "changes wind level and how fast the firki spins" },
    { "control": "Tap 'Predict'", "effect": "locks a prediction, then reveals the real result" }
  ],

  "answerKey": {                             // ⭐ THE VALID ARG IDS + correct answers (see §5)
    "windLevels": ["none", "gentle", "strong"],
    "correctPrediction": "strong",
    "operatorModes": ["ai", "student"]       // ai = collapse to demo view; student = full controls (§6.1)
  },

  "props": {
    "defaults": { "themeColor": "#4A4DC9", "darkMode": false, "operatorMode": "student" },
    "additionalProps": { "seed": 42 }
  },

  "events": ["ready", "wind_changed", "prediction_made", "spun", "completed", "reset", "operator_mode_changed"],

  "scientificFacts": [
    "Moving air (wind) can push objects and make them spin.",
    "The faster the air moves, the more force it applies."
  ]
}
```

Field notes:
- **`subtype`** — drives the host's lock/observe behaviour. Be accurate.
- **`placement.beat`** — `Apply`/`Practice` ⇒ the **student** does the activity (agent
  guides). `Observe`/`Explain` ⇒ the **agent** demonstrates. (See §6.)
- **`studentControls`** — written in plain language; the teacher reads these to coach.
- **`scientificFacts`** — 2–4 short, correct, age-appropriate facts the teacher can speak.

---

## 5. ⭐ Valid Argument IDs — the rule that makes control actually work

The teacher is an LLM. It only knows what your JSON tells it. If your `tap(itemId)` accepts
`"water"` but the teacher doesn't know that, it will **guess** — and call `tap("river")`,
which silently no-ops. (This is a real failure we hit.) Therefore:

1. **Enumerate every valid argument value in the spec**, reachable from `answerKey` (or a
   clearly-named top-level list). Lists of short ids, or a dict whose **keys** are the ids:
   ```jsonc
   "answerKey": { "treasures": ["air","sunlight","water","trees","soil","birds"],
                  "madeByPeople": ["house","bicycle","pole","bottle"] }
   ```
2. **Make ids intuitive and literal** — the id should be the obvious word for the thing.
   Use `"water"`, not `"river"` or `"item_3"`. Use `"battery"`, not `"part_b"`. If the
   on-screen label is "Sunlight", the id is `"sunlight"`.
3. **One id space, documented.** If `tap`, `highlight`, and `placeCard` all reference the
   same items, they all use the **same** ids.
4. **`highlight(target)` targets must be listed too** (every nameable region/element).

> Acceptance test: a person reading **only the JSON** can write a correct
> `tap(...)`/`placeCard(...)` call for every item, without seeing the component.

---

## 6. Pedagogy & Operation Modes (the tool must support BOTH)

The platform runs a tool in one of two modes. **Your tool must teach well in both**, which
is why you implement **both** "do" verbs and a "guide" verb (`highlight`).

| Mode | Who acts | The agent's job | Your tool must support |
|---|---|---|---|
| **ai_operated** | the **teacher** drives | demonstrate the concept by calling verbs | the verbs produce the **real** visible result |
| **student_operated** | the **student** drives | watch + coach; `highlight()` to hint; comment on emitted events | rich **events** so the agent knows what the student did |

**Match the verbs to the `placement.beat`:**
- **Observe / Explain tools** (e.g. the breath-hold meter, the spinning firki): the agent
  *demonstrates*. The star verb is the one that **runs the phenomenon** (`spin()`,
  `release()`, `play()`). The student watches the animation and answers *why*.
- **Apply / Practice tools** (e.g. tap-the-treasures, sort-the-cards, the quiz): the
  **student** does the activity — that *is* the learning. The agent should mostly
  **`highlight()` a missed/next item and encourage**, not perform every tap itself. So:
  - implement `highlight(itemId)` richly (it's the agent's main verb here),
  - emit a clear event on each student action (`item_placed`, `answer_checked`, …),
  - still implement the "do" verb (`tap`, `placeCard`) for the rare demo, but design the
    tool so a hint+student-tap loop feels natural.

> Design heuristic: if the fun/learning is in the **doing** (find it, sort it, guess it),
> it's an **activity** tool — optimise for the student doing it and the agent nudging. If
> the learning is in **seeing a phenomenon unfold**, it's a **demo** tool — optimise for the
> agent running it cleanly while narrating.

### 6.1 ⭐ The UI must ADAPT to the operation mode (don't always show the controls)

The mode is **not just a teaching style — it changes what the student sees.** The tool
receives the current mode from the **host** (it is host/platform-set, NOT a student-facing
toggle) and **re-renders accordingly**:

- **`ai_operated`** → **collapse to a focused DEMO view.** Show only the **phenomenon** (the
  animated showpiece: the pond + hopping frog, the meter, the simulation) plus the
  expression/read-out and a short **"watch" caption** ("👩‍🏫 Your teacher is showing you… —
  watch, you'll get a turn"). **HIDE the student control panel** — steppers, sliders,
  action buttons, mode toggles. The agent drives entirely through verbs, so the knobs would
  only clutter the demo and a stray tap would fight the animation.
- **`student_operated`** → show the **full** interactive control panel (the student drives).

Implementation requirements:
- Accept `operatorMode: 'ai' | 'student'` via `props` (**default `'student'`** — safe for
  standalone) **and** via `setParam('operatorMode', …)` / a dedicated
  `setOperatorMode(mode)` method.
- Gate the control panel on the mode: `{mode === 'student' && <Controls/>}`; render the
  demo caption when `mode === 'ai'`. The phenomenon + read-out render in **both**.
- A **small, non-prominent** mode indicator chip is fine (e.g. `👩‍🏫 Teacher` / `🙋 Your
  turn`) and may be clickable for testing — but it must NOT be a big primary control;
  students don't decide who's driving.
- Emit `operator_mode_changed` and reflect `operatorMode` in `getState()`.
- Add to the JSON: `setOperatorMode(mode)` in `windowMethods`, `operatorMode` in `props` +
  `sharedState`, `operator_mode_changed` in `events`, and
  `"operatorModes": ["ai","student"]` in `answerKey` with a one-line note on the collapse
  behaviour so the teacher LLM knows the tool reconfigures itself.

---

## 7. Quality Bar — this must look like a flagship product, not a prototype

The #1 reason a generated tool is rejected is that it looks **basic**: flat boxes, default
buttons/sliders, a plain static diagram, no motion, no sound, no personality. **Do not ship
that.** This section is where you spend most of your effort. Build it, then push past the
first version until it looks *premium*.

### 7.1 Visual design — modern, layered, intentional
- **Depth & material**: layered cards on a soft background; multi-stop **shadows**; rounded
  corners (16–28px); **gradients** and/or subtle glassmorphism; a clear elevation hierarchy.
  Never flat, default-bordered boxes.
- **Palette**: one cohesive, vibrant-but-tasteful scheme driven by `props.themeColor`;
  consistent **semantic** colors (success/warn/error); gradient accents; full **light AND
  dark mode** (`props.darkMode`).
- **Typography**: a real type scale (display / heading / body / caption), strong weight
  contrast, a friendly modern font (a clean `system-ui` stack or a Google font); the star
  numbers are big, chunky, tabular.
- **Composition**: generous whitespace on an 8px rhythm, aligned grids, one clear focal
  point. It must look **designed**, not auto-laid-out.
- **Character**: where it fits, a **mascot** (the frog, a friendly sun, a robot) with an
  **idle animation** and expressions that react to events (beams on correct, worried on
  wrong). Personality is a huge part of engagement for kids.

### 7.2 Animation — rich, physical, delightful (this IS what "professional" means here)
Static + functional = basic. **Every interaction and state change must move with intent.**
- **Physics, not linear jumps**: spring/easing motion. Use **framer-motion** by default
  (`motion`, `AnimatePresence`, `layout`, spring `transition`); fall back to CSS
  transitions/`@keyframes` + `requestAnimationFrame` only if it isn't available.
- **Entrance**: elements **stagger in** (fade + rise + scale) on mount — never pop in flat.
- **The core phenomenon is the showpiece — animate it richly:** the frog **hops in springy
  arcs** with squash-and-stretch and a **drawn SVG arc trail**; the meter **fills/drains
  smoothly**; numbers **count up**; the marker **glides** along the line, never teleports.
- **Feedback motion**: selection = scale-up + glow + ring; correct = pop + ✓ stamp +
  **confetti/particle burst**; wrong = shake + soft flash; reveal = sliding panels, drawn
  paths, cross-fades.
- **Ambient life**: gentle idle motion (a breathing mascot, drifting clouds, a pulsing hint)
  so the screen is never dead.
- **`highlight(target)`** = an eye-catching looping **pulse / ring / bouncing arrow** the
  agent uses to point at things while teaching.
- 60fps, GPU-friendly transforms (translate/scale/opacity); respect `prefers-reduced-motion`
  (swap large motion for crossfades).

### 7.3 Sound — layered, musical, mutable
- **Web Audio API** synthesised cues (no asset deps) or tiny base64 clips. Make them feel
  **pleasant and musical**, not raw beeps: a soft **tap**, a rising two-note **correct**
  chime, a gentle **wrong** thunk, a small **completion fanfare** (arpeggio); an optional
  ambient loop if it fits (wind, water).
- Gate first sound behind a gesture; **never loud-autoplay**; expose
  `setParam('muted', boolean)` and a visible mute toggle.

### 7.4 Engagement & polish
- A visible **score / streak / stars / progress** (`4/6`, ⭐⭐⭐, 🔥 streak) with satisfying
  count-ups, and a real **celebration** on completion (confetti + fanfare + a "well done!"
  state).
- **Specific** feedback ("✓ Water — the river gives us water"), not bare ✓/✗.
- Big tap targets, kid-friendly type, an obvious "what do I do" hint line, and **hover /
  active / focus** states on everything interactive.
- **Minimum interactive-element size — hard floor, by device target:** on **mobile** every button /
  tap target is **≥ 24×24 CSS px**; on a **smartboard / large touch display** **≥ 60×30 CSS px**
  (a larger absolute footprint for arm's-length, standing-up, shared touch — a 24px control is
  unusable on a wall display). These are *minimums* — the primary CTA and main controls should be
  comfortably bigger (pill buttons, generous padding; aim ≥ 44 px on the primary action). Take the
  device context from `props` (`props.device: 'mobile' | 'smartboard'`, default `'mobile'`) — or
  infer it from the viewport/pointer — and size every control to the matching floor.
- A smooth **`reset()`** that visibly clears with motion; an intentional initial/empty state.
- **Zero raw default controls** — style every `<button>`, slider, and input.

> **Self-check before returning:** mentally screenshot the result. If it looks like a
> wireframe, a default-styled form, or a plain diagram, it is **NOT done**. Keep pushing the
> visuals, motion, and sound until it looks like something a child would beg to play with.

---

## 8. Technical constraints

- **One self-contained `.tsx`**: a single default-exported React function component. No
  imports from the host app. React is available; `framer-motion` may be — feature-detect or
  fall back to CSS. No network calls.
- Runs in `sandbox="allow-scripts allow-same-origin"`. No `localStorage`/cookies reliance.
- **Responsive**: fill the iframe (≈ full width, ≥ 80vh), scale cleanly from phone to desktop.
- Accept a `props` object matching the JSON `props.defaults` + `additionalProps` (theme,
  seed, etc.). Be deterministic given the same `seed`.
- Robust: ignore unknown commands, never throw out of the message handler, clamp args.

### 8.1 Orientation-aware layout — recompose for landscape, don't merely scale

**Responsiveness here is two-dimensional: the tool must adapt to the viewport's *orientation*
(aspect ratio), not just its width.** A single fluid column that only shrinks is a failure mode —
on a wide, short **landscape** viewport it forces vertical scrolling and pushes the interaction
below the fold. Treat **portrait (tall)** and **landscape (wide)** as two first-class layouts of the
same component and let it **reflow** between them; state, logic and the agent contract are
identical across both — only the *arrangement* changes, never the capability.

- **⭐ Primary reference viewport — 1366×768 CSS px @ 100% zoom (laptop landscape).** This is the
  canonical landscape target you design, tune and screenshot against. The tool's **full two-pane
  composition must fit inside one 1366×768 viewport at 100% browser zoom — zero vertical scroll and
  zero horizontal scroll** (never depend on the user zooming out to make it fit); both the
  phenomenon and the controls sit fully above the fold. And **fill the frame**: balance or scale the
  panes to occupy the ~768 px height instead of clustering in the top half over a dead band —
  vertically centre the content (`min-height:100dvh; display:grid; place-content:center`) or grow
  the panes so the layout reads deliberate, not top-heavy. Budget for host chrome: the tool usually
  renders beside a sidebar/frame, so design the content for a **usable width of ~1000–1100 px**, not
  the full 1366. Other sizes (phones, tablets, 4K) still scale fluidly — 1366×768 is simply the frame
  you sign off on.
- **Break on orientation, not just on width.** Drive the layout with
  `@media (orientation: landscape) / (orientation: portrait)`, **container queries** (`@container`)
  and/or `aspect-ratio`, so the tool reconfigures itself the instant the device rotates or the
  host iframe's aspect ratio changes — don't rely on `min-width` breakpoints alone.
- **In landscape, split horizontally.** Reflow the vertical stack (header → phenomenon → controls →
  read-out) into a **two-pane** composition: the animated **showpiece on one side, the controls +
  read-out on the other**, via `flex` / CSS `grid` (`flex-wrap`, `grid-template-columns:
  minmax()/auto-fit`, `clamp()/min()/max()` sizing). Spend the extra horizontal room deliberately —
  never leave it as dead margin or letterboxed bars.
- **Respect the short axis.** Landscape is height-constrained: size against the **viewport height**
  with `dvh`/`svh` (not `vh`), cap the phenomenon with a `max-height`, and keep the **primary
  interaction, the star read-out and the CTA visible without scrolling** (above the fold).
- **Let the SVG breathe.** The scene holds its intrinsic ratio via `viewBox` +
  `preserveAspectRatio="xMidYMid meet"` and grows along the wide axis rather than clipping or
  distorting; anchored labels/overlays must re-anchor to the recomposed layout, not float free.
- **Invariants in both orientations:** touch targets meet the §7.4 device-target minimums
  (**mobile ≥ 24×24 px, smartboard ≥ 60×30 px**; ≥ 44 px on the primary action), the full type
  scale, and honored safe-area insets (`env(safe-area-inset-*)`).
- **Verify by rotating — and sign off at 1366×768 @ 100%.** The layout must **recompose cleanly**
  on a portrait phone, a landscape phone/tablet and a desktop iframe. The mandatory sign-off check:
  **screenshot the tool at exactly 1366×768 @ 100% zoom** — everything fits in the one viewport with
  no clipping, no overlap, no horizontal or vertical scrollbar, and no orphaned whitespace band. If
  rotating yields a worse layout than portrait, or the 1366×768 frame scrolls or reads top-heavy, it
  is **not done**.

---

## 9. Skeleton (copy this shape)

```tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';

const TOOL_ID = 'M2.S2.T4.C11.2D1';
const emit = (m: any) => { try { window.parent.postMessage(m, '*'); } catch {} };

export default function Tool(props: any) {
  const [state, setState] = useState(() => /* initial state from props.seed */ ({ /* … */ }));
  const muted = useRef(false);

  // --- sound (Web Audio, lazy, mutable) ---
  const playCue = useCallback((kind: 'tap'|'correct'|'wrong'|'done') => {
    if (muted.current) return; /* synth a short tone with AudioContext */ }, []);

  // --- the tool-specific actions (used by BOTH student clicks and agent commands) ---
  const doTap = useCallback((itemId: string) => {
    /* update state, animate, score */ playCue('correct');
    emit({ type: 'event', name: 'item_placed', detail: { itemId, score: /* … */ } });
  }, []);
  const doHighlight = useCallback((target: string) => { /* pulse the element */ }, []);

  // --- the agent API: every windowMethod in the JSON lives here ---
  const api = {
    setParam: (n: string, v: any) => { if (n === 'muted') muted.current = !!v; /* … */ },
    play: () => {/* … */}, pause: () => {/* … */}, reset: () => {/* … */},
    highlight: doHighlight,
    getState: () => emit({ type: 'state', state }),
    tap: doTap,                // ⭐ tool-specific
  };
  const apiRef = useRef(api); apiRef.current = api;

  // --- the command listener + the REQUIRED ready signal ---
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== 'command') return;
      const fn = (apiRef.current as any)[d.method];
      let result; if (typeof fn === 'function') result = fn(...(d.args || []));
      emit({ type: 'response', id: d.id, result });
    };
    window.addEventListener('message', onMsg);
    emit({ type: 'ready', toolId: TOOL_ID });   // ⭐ MUST fire, or commands are dropped
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (/* the animated, sound-rich, engaging UI */ <div /* … */ />);
}
```

Pair it with the §4 JSON, where every `windowMethod` matches an `api` key and every emitted
`event` is listed.

---

## 10. Acceptance checklist (the tool is done only when ALL pass)

**Contract**
- [ ] Emits `{type:'ready', toolId}` once on mount, after the listener is attached.
- [ ] Handles `{type:'command', id, method, args}`; `args` is positional, in signature order.
- [ ] Every JSON `windowMethod` exists on `api`; every emitted event is in JSON `events`.
- [ ] Agent verbs produce the *same* visible result as the student doing it; idempotent-safe.
- [ ] `highlight(target)` implemented for every nameable element (non-destructive pulse).
- [ ] `getState()` emits `{type:'state', state}`; `reset()` fully clears.

**Valid ids**
- [ ] Every valid arg value is enumerated in `answerKey` (or a named list) in the JSON.
- [ ] Ids are intuitive/literal (the obvious word for the thing — `water`, not `river`).
- [ ] A reader of the JSON alone can write a correct call for every item.

**Pedagogy & operation modes**
- [ ] `placement.beat` set correctly; verbs match (demo verb for Observe/Explain; rich
      `highlight` + events for Apply/Practice).
- [ ] Teaches well in **both** ai_operated (agent demonstrates) and student_operated
      (student does, agent hints via highlight + reads events).
- [ ] **UI adapts to the mode (§6.1):** `ai` collapses to the focused demo view (phenomenon
      + "watch" caption, **controls hidden**); `student` shows the full panel. Driven by
      `setOperatorMode`/`operatorMode` (default `student`); `operator_mode_changed` emitted.

**Quality**
- [ ] Every state change animated (60fps; respects reduced-motion).
- [ ] Purposeful sound cues; muted-friendly; `setParam('muted', …)` works; no loud autoplay.
- [ ] Visible score/streak/progress + specific feedback + a celebratory completion.
- [ ] Responsive; **buttons meet the minimum size — mobile ≥ 24×24, smartboard ≥ 60×30 (§7.4)**;
      kid-friendly, deterministic for a given seed.
- [ ] **Orientation-aware (§8.1):** recomposes between portrait and landscape (not merely
      fluid-scales) — in landscape it splits the phenomenon and controls horizontally. **Signed off
      at 1366×768 @ 100% zoom:** the full layout fits one viewport with NO vertical/horizontal
      scroll, content fills the frame (not top-heavy), interaction + read-out above the fold, and no
      clipping/overlap when rotated.
- [ ] **Self-graded Aesthetics ≥ 4/5 and Animation ≥ 4/5 (§0.1)** — scores stated to the
      user; did not declare "done" while either was below bar; iterated past the first draft.

---

### One-line brief to hand the generator
> "Build `<code>.tsx` + `<code>.json` for the concept **‹CONCEPT›** as a **‹subtype›** tool.
> This must look like a **flagship commercial edtech product, not a prototype** (§0) — work
> hard on visual design, framer-motion animation, Web Audio sound, and a lively mascot; no
> default/flat controls. Follow the agent-control contract (§3) exactly — especially the
> `ready` signal and the `{type:'command'}` handler — enumerate all valid arg ids in
> `answerKey` with intuitive names (§5), support both operation modes (§6), and clear the
> full §7 quality bar. Iterate past your first draft; verify against the §10 checklist
> before returning."

### Add this to the §10 checklist — production polish
- [ ] Looks like a premium app, not a prototype: layered cards, gradients/shadows, real type
      scale, cohesive palette, light **and** dark mode — **no default/flat HTML controls**.
- [ ] framer-motion (or equivalent) physics motion throughout; staggered entrance; the core
      phenomenon richly animated; confetti/particle celebration on completion.
- [ ] A mascot/character with idle + reactive animation (where it fits).
- [ ] Musical Web Audio cues; mute toggle; no loud autoplay.
- [ ] Substantial, crafted component (not a thin stub); you iterated past the first draft.
