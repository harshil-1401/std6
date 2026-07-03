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

> The JSON sidecar now also carries the **v1 generator blocks** — `sources`,
> `teaching_sequence`, an `additionalProps` schema, and (for the chapter's chosen AI-demo tool)
> an `ai_control` block. See §12, §13, §14 and §18.

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

  // ── Authoring metadata (the human-facing fields the platform's authoring form collects) ──
  "title": "Wind and the spinning firki",
  "description": "Drag the wind slider and watch the paper firki spin faster; predict-then-reveal how the wind level changes its speed.",
  "context": "Grade 6 Science, Air Around Us. An on-screen version of the paper-firki activity: moving air (wind) pushes the blades and spins the firki — the stronger the wind, the faster it turns.",
  "teachingNotes": "Predict-then-reveal: the student commits a prediction, then reveals the real result. Re-run at each wind level to show the firki spins faster with stronger wind, motivating that moving air applies a force.",
  "instructionsForStudent": "Set a wind level, predict how fast the firki will spin, then run it and reveal the result. Try another wind level and compare.",

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
- **Authoring metadata — `title`, `description`, `context`, `teachingNotes`,
  `instructionsForStudent`** — the human-authored fields surfaced in the platform's authoring form
  and read by the teacher. They live in **two places, kept in sync** — the authoring-form registry
  (`src/data/formfield.json`: one array entry per tool, camelCase, plus `2dToolJson` / `2dToolTsx`
  path pointers to the sidecar and component) **and** this per-tool JSON sidecar; write each string
  once and mirror it in both. All five are **required**, written in plain student-/teacher-facing prose
  grounded in *this specific* tool — never code, agent-verb, or windowMethod language. Each carries a
  distinct job; do not paraphrase one into another:
  - **`title`** — the tool's display name: a concise noun phrase (e.g. "Handspan measuring tool").
  - **`description`** — a single sentence naming what the student *does* and the payoff/reveal.
  - **`context`** — grade · subject · chapter, then the real-world activity the tool renders
    on-screen (the phenomenon and why it matters) — enough for a teacher to place it in the lesson.
  - **`teachingNotes`** — how to run it: the pedagogical move (e.g. predict-then-reveal), what to
    re-run or compare, and the idea it should land.
  - **`instructionsForStudent`** — the concrete step-by-step the learner follows, in order.

> **Plus the v1 sidecar blocks** — every tool's JSON also carries `sources`,
> `teaching_sequence`, and an `additionalProps` schema; the chapter's chosen AI-demo tool
> additionally carries an `ai_control` block. The full block list and shapes are in §18.

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

> **v1 variant — the handle-driven demo track.** §6.1 above (the `ai` / `student` split, where
> `ai` **collapses** the panel) is the primary 2D contract and stays as-is. A tool built on the
> v1 control track (§13) is instead driven by an animated `playDemo()` handle, and during that
> demo it **keeps the manual controls visible and interactive** (it does *not* collapse the
> panel). Pick the track per tool; when you build a v1-track AI-demo tool, follow §13.

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
- **Responsive — the tool RESIZES ITSELF to fit the screen, capped at 4K (ALL tools):** the
  tool must **resize as per the screen** — it fills the iframe (≈ full width, ≥ 80vh), scales
  cleanly and fluidly from a small phone all the way up to a large display, and **re-flows live
  whenever the screen/container changes size** (rotate, window resize, split view). Nothing is
  fixed-size: the layout/visuals **adapt per screen size** (fluid root `width:100%`; inline SVG
  scales via its `viewBox` + `preserveAspectRatio` — never a fixed pixel canvas; honor
  `props.width`/`props.height` when supplied, otherwise fill the parent). **Maximum rendered
  size is `3840 × 2160` px (4K)** — clamp the root so it grows to fill big displays yet never
  exceeds a 4K canvas (e.g. `maxWidth:3840px; maxHeight:2160px`, preserving aspect ratio).
  (§17 restates this for the v1 track.)
- **No scrolling — the tool is a single self-contained screen that fits its viewport.** There must
  be **no vertical or horizontal page scrollbar** at any supported size: the entire experience
  (phenomenon, read-out, controls, CTA) fits within the viewport at once. Fit the content to the
  available space instead of overflowing — cap the phenomenon's height (`max-height` in `dvh`/`svh`),
  use compact/2-column layouts, and reflow per §8.1 (esp. the 1366×768 @ 100% sign-off). The learner
  must never scroll to reach an interaction or the CTA. (An internal, deliberately-scrollable pane —
  e.g. a long list — is fine, but the tool as a whole never spawns a page scrollbar.)
- Accept a `props` object matching the JSON `props.defaults` + `additionalProps` (theme,
  seed, etc.). Be deterministic given the same `seed`.
- Robust: ignore unknown commands, never throw out of the message handler, clamp args.

> **v1 additions (see §17):** the v1 chapter-build track adds two further constraints —
> **(a)** clamp the rendered size to a **4K maximum (`3840 × 2160` px)** while still filling
> large displays, and **(b)** for tools authored under the v1 generator track, keep the
> dependency surface to **`react` (+ `lucide-react`) only**, with **pure inline SVG** and no
> fixed pixel canvas. (2D's primary contract still permits `framer-motion` + Web Audio as in
> §7; §17 explains which stack applies to which track.)

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

**Authoring metadata**
- [ ] All five human-facing fields present and tool-specific: `title`, `description`, `context`,
      `teachingNotes`, `instructionsForStudent` — plain prose, each doing its distinct job (§4).

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
- [ ] Responsive — **adjusts per screen size** (fluid root + `viewBox`-scaled SVG, no fixed
      pixel canvas) and **clamped to a 4K max (`3840 × 2160` px)**; **buttons meet the minimum
      size — mobile ≥ 24×24, smartboard ≥ 60×30 (§7.4)**; big targets, kid-friendly,
      deterministic for a given seed.
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

---
---

# PART B — v1 AI-Operated Tool Generator (folded in)

> **How Part B relates to Part A.** Everything in §0–§10 above is the **primary 2D contract**
> and stays authoritative. Part B adds the capabilities of the **v1 AI-operated tool
> generator** without removing anything above: the **chapter-level build workflow** (§11), the
> per-tool **teaching sequence** (§12), the **AI-operated demo track** with the
> `ToolHandle` / `playDemo()` control surface (§13), the typed **`additionalProps`** content
> channel (§14), the concrete **brand palette + Poppins + styled controls** (§15), the
> **"less text, more visual"** principle (§16), the **responsive 4K-cap & dependency** rules
> (§17), and the **expanded JSON sidecar** blocks (§18).
>
> Where the v1 generator's choices differ from §0–§10 — control surface (`window.postMessage`
> in §3 **vs** a React `forwardRef` `ToolHandle` here) and allowed deps (`framer-motion` + Web
> Audio in §7 **vs** `react` + `lucide-react` + inline-SVG-only here) — **both are kept**:
> §3/§6.1/§7 govern the 2D postMessage track, and §13/§15/§17 govern the v1 AI-operated demo
> track. Each section below states which track it applies to and how the two map onto each
> other.
>
> **Build each tool for ONE track, not both at once.** Decide up front whether a given tool is a
> **2D postMessage tool** (§3 contract: `window.postMessage`, the void emit-style `getState()`
> of §3.3/§9, the flat `props` object of §4/§8) or a **v1 AI-operated tool** (§13 contract: the
> `forwardRef` `ToolHandle`, the **value-returning** `getState(): ToolState`, the nested
> `ToolProps` shape). These two surfaces use the **same method/prop names with different
> shapes** — `getState()` (void-emit vs returns `ToolState`), the props object (flat
> `props.themeColor`/`props.additionalProps` vs nested `props.props.themeColor`/
> `props.props.additionalProps`), and `reset()` (void vs `Promise<void> | void`) — so a single
> component cannot implement both literally. The track-pairing tables below are a **conceptual
> map** (which mode/dep/intent corresponds to which), **not** an instruction to expose both APIs
> from one tool. If a tool genuinely must bridge both worlds, give the two surfaces **distinct
> method names** (e.g. `getState()` returns `ToolState` for the handle while a separate
> postMessage `getState` command emits `{type:'state', state}`) and read display props from the
> one shape its primary track uses — never overload one name with two contracts.

---

## 11. Chapter-level build workflow (from the v1 generator)

Given **ONE chapter**, you: **(1)** ingest its Learning Plan + chapter PDF (provided by the
user), **(2)** build only the chapter's *missing* tools (`.tsx` + `.json` each), **(3)** choose
the tool(s) best suited to an AI-driven demo and implement the `playDemo()` / `ToolHandle`
control surface on them (§13), and **(4)** for **every** tool, decide and record its **teaching
sequence** — *concept-first* or *tool-first* (§12) — in the JSON sidecar so the teaching AI
knows whether to explain before or after the demo. Output only the two-file deliverables
described in §2.

### Step 1 — Inputs: the user provides the Learning Plan + chapter PDF (FIRST)
- **Ask the user to provide both** — by **uploading them here** or giving a **local file
  path**: (a) the chapter's **Learning Plan** (modules → segments → topics, objectives,
  teaching flow), and (b) the **chapter PDF** (textbook).
- **Never query a database or fetch remotely.** If either is missing, **STOP and request it**;
  proceed only once both are given.
- Extract every objective, concept, the activities + exact procedures, and the single
  **deterministic outcome** for each. Ground everything in these two sources — don't invent
  science.

### Step 2 — Plan the chapter's tool set (from the Learning Plan)
List each tool: `toolId`, concept, ordered process steps (per the PDF), deterministic outcome,
`objective_id(s)`.

### Step 3 — Build only the MISSING tools
Inspect the chapter folder; list existing tools. **If a tool already exists, do NOT regenerate
or duplicate it — skip it.** Generate `.tsx` + `.json` only for missing tools, grounded in the
LP + PDF.

### Step 4 — Choose the tool(s) best suited to an AI-driven demo
Score every tool for AI-operability; pick the **best** (+ runner-up) with a one-line rationale,
and implement the `playDemo()` / `ToolHandle` control surface (§13) on it. Criteria (high →
low): single deterministic outcome; a clear, watchable process; **lowest AI-driving latency**
(few awaitable steps, tiny state); minimal-UI feasibility; cleanly controllable via a handle;
small & self-contained. Avoid sprawling multi-scene/sandbox tools. **Report this choice before
emitting the files.**

### Hard constraints (chapter workflow)
- User supplies the Learning Plan + chapter PDF (upload or local path); never a DB; halt until
  both given.
- Never recreate an existing tool; edit existing tools in place rather than duplicating.
- `playDemo()` is deterministic, **animated**, and runs purely through the handle; it shows the
  real process (no instant end-states) and keeps the explanation visible.
- **During an AI demo, the manual controls stay visible and interactive** — never hide
  pickers/buttons/tabs or disable input (no `pointerEvents:none`) while `playDemo()` runs; the
  student can also drive the tool themselves.
- Output only `.tsx`/`.json`; the backend driver is OUT of scope.
- Self-contained and strict-TS clean (`tsc -b` with no warnings).
- Report the Step 4 choice before emitting the files.

---

## 12. Teaching sequence (per tool) — concept-first vs tool-first

Every tool must declare, in an **AI-readable** field, the order the teaching AI should follow
when it presents the tool. Pick the one that is **pedagogically logical for that specific
tool** and record it — with a one-line rationale — in the JSON sidecar's `teaching_sequence`
block (see §18). The two options:

- **`concept_first`** — *explain the concept first, then show the AI-controlled tool.* Use when
  the demo is abstract or procedural and hard to interpret cold: the student needs the idea,
  vocabulary, or goal first, and the demo then **confirms** it.
- **`tool_first`** — *show/run the tool first, then explain the concept.* Use for discovery /
  predict-then-reveal / surprising phenomena: let the student **watch it happen**, then explain
  *why* from what they just saw (the explanation lands harder after the observation).

Decide **per tool** — do not default everything to one. Record the chosen `order`, a short
tool-specific `rationale`, and both option descriptions so the teaching AI can read them later.

---

## 13. v1 AI-operated demo — the `ToolHandle` / `playDemo()` control surface

This is the **v1 control track** — an **alternative** to §3's `window.postMessage` contract, not
an addition layered on top of it. A tool built for the chapter workflow is driven through the
React handle below (`forwardRef` `ToolHandle` + `onReady`/`onStateChange`); it does **not** also
expose the §3 postMessage API, because the two share method/prop names with incompatible shapes
(see the "build for ONE track" note in the Part B intro). Pick the track per tool.

The handle gives the teaching AI a single, deterministic way to demonstrate the tool:
`playDemo()` runs the whole animated demonstration. **During the demo the manual controls stay
visible and interactive** — never hide pickers/buttons/tabs or disable input (no
`pointerEvents:none`) while `playDemo()` runs; the student can also drive the tool themselves,
and the explanation/detail callouts stay on screen throughout. (This is the v1-track equivalent
of §6's "agent demonstrates, student watches/does" — driven by the handle rather than by
postMessage verbs and the §6.1 mode collapse.)

### 13.1 Component contract (every `.tsx` in the v1 track)
- Deps: only `react` (+ `lucide-react`). No other libs/assets/network. Pure inline SVG;
  responsive `viewBox` (no hard-coded pixel canvases). (See §17 for the responsive/4K rule and
  how this relates to §7/§8's framer-motion allowance.)
- **Strict-TS clean** (`noUnusedLocals`): no unused imports/vars; `useRef` always initialised;
  import `React` only if you use `React.*`.
- **Animate the real process — never jump to end states.** Drive motion with
  `requestAnimationFrame` / CSS transitions and reuse the tool's own animation primitives.

```ts
export interface ToolState { phase: string; done: boolean; /* + observables */ }
export interface ToolHandle {
  /** Runs the whole AI demonstration, ANIMATED and paced; resolves when it finishes. */
  playDemo(): Promise<void>;
  /** Optional fine-grained, awaitable actions (each resolves AFTER its on-screen animation settles). */
  reset(): Promise<void> | void;
  getState(): ToolState;
}
export interface ToolProps {
  onReady?: (h: ToolHandle) => void;
  onStateChange?: (s: ToolState) => void;
  props?: { width?: number; height?: number; themeColor?: string; additionalProps?: Record<string, unknown> };
}
```
Implement as `forwardRef<ToolHandle, ToolProps>` **AND** call `onReady(handle)`; fire
`onStateChange` on every discrete change.

### 13.2 AI demo animation — ADAPT TO THE TOOL (required) — SLOW, NOT TOO FAST
> **Pacing rule (non-negotiable): keep the animation SLOW, not too fast.** A rushed demo is a
> bug. **When in doubt, make it SLOWER.**

`playDemo()` must **visibly animate the tool's actual process**, paced **slowly and calmly**:
each step is a **motion of ≈1.6–2.0 s** followed by a **hold of ≈1.5–2.5 s** before the next
step (**≈3.5–4.5 s of visible time per step total**). It must never feel rushed; the whole demo
should be deliberate so a learner can watch each motion finish and read its caption before the
next one starts. **Err on the side of too slow rather than too fast — if you are unsure,
lengthen the holds.** Each awaitable action resolves only **after its animation settles**. Slow
the AI demo's *own* pacing (the inter-step holds, and any animation duration used **only** by
`playDemo`) — but do **not** change motion durations shared with the manual interaction (the
tool's normal hands-on behaviour stays identical). Match the animation to the interaction type:
- **Drag-and-drop / sorting** → animate each item **dragging** from its source to the target:
  show a moving ghost/clone travelling there, highlight the drop zone, *then* commit the
  placement. Never just pop it into place.
- **Physical simulation** → animate the motion with `requestAnimationFrame` (object
  approaching, needle/pendulum/spring settling, iron filings moving); resolve when it comes to
  rest.
- **Step-by-step / builder** → perform each step with its real transition and a short pause
  between steps.
- **Data plotter / reveal** → animate the plot being drawn / the reveal sequence in order.

Throughout the AI demo, **keep the explanation/detail callouts visible** (the per-step "why") —
the student watches the process *and* reads the reasoning. Reuse the same primitives the manual
UI uses (e.g. the existing drag ghost), so the AI path looks identical to a real interaction.

---

## 14. `additionalProps` — agent-provided dynamic content (every tool)

Each tool accepts an `additionalProps` **data** object — small, tool-specific content the
teaching AI passes at runtime to parameterize the tool **without code changes** (e.g. which
values to show/highlight, a scenario to load, ranges, labels). The **access path depends on the
tool's track:** a 2D postMessage tool reads it at the flat path `props.additionalProps` (§4/§8);
a v1 AI-operated tool reads it at the nested `ToolProps` path `props.props.additionalProps`
(§13.1). Same data object, same sidecar `schema` — only the prop path differs. Rules:
- **Type it** with a dedicated `interface <Tool>AdditionalProps`, and read it with **sensible
  defaults** — the tool MUST render correctly when `additionalProps` is absent or empty.
- **React to changes**: re-run the relevant animation when it changes
  (`useEffect([additionalProps])`).
- **Document it** in the JSON sidecar `additionalProps` block: a `schema` (each key → type,
  default, description) plus 2–4 `examples`.
- Data-only — no functions/DOM; the agent supplies plain JSON.

---

## 15. Brand palette, typography & styled controls (from v1)

§7.1 says "one cohesive scheme driven by `props.themeColor`." The v1 generator specifies the
**concrete brand palette** to use. Use the brand palette + **Poppins**; never invent ad-hoc
colors. Expose `themeColor` (default the primary blue) and derive accents from the palette.

**Palette**

| Token | Hex | Use |
|---|---|---|
| Primary (blue) | `#4A4DC9` | primary actions, active state, accents |
| Secondary (orange) | `#FF7212` | highlight / emphasis CTAs |
| Brand gradient | `#533086 → #FC9145` | headers, hero / primary gradient (purple→orange) |
| Soft gradient | `#C1C1EA → #FFF3E4` | subtle backgrounds / fills |
| Solid purple / orange | `#533086` / `#FC9145` | gradient stops, deep accents |
| Tints | `#C1C1EA` (purple) · `#FFF3E4` (cream) | hover washes, filled shapes |
| Text / icon | `#4E4E4E` (or darker `#1A1A2E`) | body text, icons |
| Neutrals | `#CACACA` · `#EBEBEB` · `#F5F5F5` | disabled · borders · surfaces |
| Status | `#22C55E` success · `#EF4444` error | feedback only |

**Type:** Poppins (400–900), loaded via
`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap')`.
700–800 headings, 500–600 body/labels.

**Buttons** — three variants × four states; pill **radius 24px**, **height 40px**, **horizontal
padding 24px**; with an icon use a **24px** icon + **4px** gap.
- **Contained** (primary): filled `#4A4DC9` or the brand gradient, white text. *Hover* lighten
  ~5% / lift; *Pressed* darker (`#533086`) + scale 0.97; *Disabled* `#EBEBEB` bg / `#CACACA`
  text, no shadow.
- **Outlined**: 1.5–2px primary border, transparent bg, primary text; hover adds a `#C1C1EA`
  wash; disabled border `#EBEBEB`.
- **Texted**: primary text only (no bg/border); hover adds a faint tint bg.
- **Highlight**: filled `#FF7212` — use sparingly, for the single most important CTA.
- Transitions ≈0.18s ease; always give clear `:hover` / `:active` / `:disabled` feedback.

**Shapes / SVG fills:** neutral outline (`#EBEBEB`/`#CACACA` stroke), blue-filled (`#C1C1EA`
fill + `#4A4DC9` stroke), or orange-filled (`#FFF3E4` fill + `#FF7212` stroke). Cards/surfaces:
white on `#F5F5F5`, radius 16–24px, soft shadow.

---

## 16. Less text, more visual — show, don't tell (from v1)

**Lead with the visual; keep text to the minimum needed.** The animation/diagram carries the
lesson — text only points at it.
- Replace paragraphs with **labelled visuals**: on-scene captions, icons, arrows, and
  highlights instead of blocks of prose.
- Ground every concept in **real-life content** — concrete, recognizable objects/scenes/
  scenarios (a thermometer under the tongue, a magnet on a fridge, iron filings round a bar
  magnet), not abstract text.
- When text **is** required, make it short: a one-line caption/label beside the visual, never a
  wall of explanation. If you can show it instead of writing it, show it.

---

## 17. Responsive sizing, the 4K cap & dependency surface (from v1)

**Which stack applies to which track.** The 2D primary contract (§3/§7/§8) permits
`framer-motion` + Web Audio. The **v1 chapter-build track** (§11, §13) restricts deps to
**`react` (+ `lucide-react`) only**, with **pure inline SVG** and **no other libs/assets/
network**. When you author a tool under the v1 generator workflow, follow the v1 dependency
surface; when you author a standalone 2D tool under §3, §7/§8 apply. Keep each tool internally
consistent with the track it's built for.

**Responsive sizing — the tool resizes as per the screen, capped at 4K.** The tool must resize
itself fluidly to its container/viewport and **re-flow whenever the screen size changes**: the
root element fills the available width (`width:100%`) and the inline SVG scales via its
`viewBox` + `preserveAspectRatio` (never a fixed pixel canvas). Honor `props.width`/
`props.height` when supplied, otherwise fill the parent. It must render crisply from small
mobile screens all the way up to **4K — but clamp the rendered size to a maximum of
`3840 × 2160` px (4K)** so it scales up to fill large displays yet never grows beyond a 4K
canvas (e.g. `maxWidth:3840px; maxHeight:2160px` on the root, preserving aspect ratio).

---

## 18. Expanded JSON sidecar (from v1)

Every tool's JSON keeps the §4 fields **and** adds a `sources` block, an `additionalProps`
block (§14), and a `teaching_sequence` block (§12). The chapter's **chosen** AI-demo tool (§11
Step 4) additionally gets an `ai_control` block:

```json
{
  "sources": { "learning_plan": "<provided file/path>", "objective_ids": ["O?"], "chapter_pdf": "<provided file/path>", "pdf_section": "Activity 4.x" },
  "additionalProps": {
    "description": "Tool-specific dynamic content the teaching AI may pass at runtime (OPTIONAL — the tool must work with sensible defaults if absent).",
    "schema": { "<key>": { "type": "number|string|boolean|array|object", "default": "<default>", "description": "<what it controls>" } },
    "examples": { "<scenarioName>": { "<key>": "<value>" } }
  },
  "teaching_sequence": {
    "order": "tool_first",
    "rationale": "<one line: why this order is pedagogically right for THIS tool>",
    "options": {
      "concept_first": "Explain <the concept> first, then run playDemo() so the student sees it confirmed.",
      "tool_first": "Run playDemo() first so the student observes <the phenomenon>, then explain <the concept> from what they saw."
    }
  },
  "ai_control": {
    "handle": "ToolHandle", "obtain_via": "ref or onReady",
    "primary_action": "playDemo()  // runs the full ANIMATED demo, resolves when done",
    "actions": [ { "name": "...", "returns": "Promise<void>", "awaitable": true, "animates": "what the student sees move" } ],
    "animation": "describe the per-step motion the AI performs (e.g. 'each card drags from the pool to its bin (~0.85s), drop zone highlights, then locks'); details/explanations stay visible",
    "state_shape": { "phase": "string", "done": "boolean" },
    "demo_script": ["playDemo()"]
  }
}
```

---

## 19. Acceptance checklist — v1 additions (in addition to §10)

**Chapter workflow & sources**
- [ ] Both inputs (Learning Plan + chapter PDF) were provided by the user; nothing invented;
      no DB/remote fetch. Halted until both given.
- [ ] Only **missing** tools were generated; existing tools were not duplicated.
- [ ] Step 4's AI-operability choice (+ runner-up + rationale) was reported **before** emitting
      the files.
- [ ] `sources` block present (learning_plan, objective_ids, chapter_pdf, pdf_section).

**Teaching sequence**
- [ ] `teaching_sequence` block present on **every** tool with a chosen `order`
      (`concept_first` | `tool_first`), a tool-specific `rationale`, and both option
      descriptions. Not blindly defaulted to one.

**v1 AI-operated demo (chosen tool)**
- [ ] Implemented as `forwardRef<ToolHandle, ToolProps>` **and** calls `onReady(handle)`;
      fires `onStateChange` on every discrete change.
- [ ] During `playDemo()` the manual controls stay **visible & interactive** (`pointerEvents`
      never disabled); the student can also drive the tool themselves.
- [ ] `playDemo()` is deterministic, **animated** (never jumps to end states), and **SLOW**
      (≈1.6–2.0 s motion + ≈1.5–2.5 s hold per step); each awaitable resolves only after its
      animation settles; explanation callouts stay visible.
- [ ] `ai_control` block present in the sidecar.

**additionalProps**
- [ ] `props.additionalProps` typed via `interface <Tool>AdditionalProps`, read with sensible
      defaults, re-runs animation on change; documented in the sidecar (`schema` + 2–4
      `examples`).

**Visual / brand / responsive**
- [ ] Uses the brand palette + Poppins (§15); styled buttons (variants × states); no ad-hoc
      colors; SVG fills follow the palette.
- [ ] "Less text, more visual" (§16): labelled visuals + real-life content, not prose blocks.
- [ ] Responsive: fluid root + `viewBox`-scaled inline SVG (no fixed pixel canvas); clamped to
      a **4K max (`3840 × 2160` px)**; honors `props.width`/`props.height`.
- [ ] Dependency surface correct for the track (v1 track: `react` + `lucide-react` + inline SVG
      only; strict-TS clean, `tsc -b` no warnings).
