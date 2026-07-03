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
Think Duolingo, Brilliant, Desmos, Khan Academy, Apple-grade micro-interactions — products that
feel premium for **students aged ~11–16 (Class 6–10)**, not a preschool app. The single most
common failure is shipping something that merely *works*: flat boxes, default browser
buttons/sliders, a plain static diagram, little or no motion, no sound, no character. **That
output is rejected.**

You must **work hard** on this. Treat it as a hero feature you'd put in a portfolio:
- Spend the **majority of your effort on visual design, animation, and sound** — that is what
  makes it feel professional. Functionality is the baseline, not the goal.
- **Do not settle for your first draft.** Build it, mentally screenshot it, and if it looks
  plain or "auto-generated", iterate: add depth, motion, polish, and delight until a **student in
  this age range** would be genuinely excited to use it.
- Every pixel is intentional: layered surfaces, gradients, soft shadows, a real type scale, a
  cohesive palette, springy physics, particle celebrations, and musical sound cues. **No
  raw/default HTML controls anywhere** — style every button, slider, and input.
- Match the register to the concept and age: playful where it suits younger students or a light
  topic; clean, confident, and grown-up for older students or serious topics (anatomy, algebra,
  civics). Premium ≠ cartoonish.
- Budget for craft, but size the component to what the concept **genuinely needs** — see §7.4.

If in doubt, over-invest in craft. A simple concept rendered *beautifully* beats a clever
concept rendered plainly.

### 0.1 This is a MULTI-PASS job — iterate, self-critique, and be honest

One pass is never enough to hit this bar. After you build the first version:

1. **Grade your own output** against §7 on two axes — **Aesthetics** and **Animation** — on a
   1–5 scale, and **say the scores out loud to the user.** Be brutally honest: a plain layout
   with default buttons is a 2, not a 4.
2. **Name what is still basic** and what you'll improve next ("the palette is still default;
   the core interaction has no landing settle; controls aren't styled yet"). **Do NOT declare
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

### 0.2 ⛔ Examples in this prompt are ILLUSTRATIVE ONLY — never copy them

This prompt uses concrete examples (a spinning firki, a wind slider, tap-the-items, a matcher)
purely to explain the schema and the contract. **They are not a template for what to build.**

- **Do not import any character, mascot, animal, motif, colour, or choreography from this prompt
  into your output.** They illustrate *mechanics*, not the deliverable.
- Build for the **actual concept you were handed** — its own subject, its own visuals, its own
  tone. A magnets tool, a fractions tool, a grammar-matching tool, and a civics timeline should
  look like four different products, not four skins of the same demo.
- Whenever an example below reads "e.g. the frog/firki/…", mentally replace it with *your*
  concept's core element.

---

## 1. Mission

You are a senior interaction designer + front-end engineer building a **one-concept,
one-screen** learning tool for Class 6–10 students. The tool teaches **exactly one idea**
(e.g. "magnets attract only some materials", "a number's neighbours on the line", "which words
are synonyms", "renewable vs non-renewable"). It is embedded in a sandboxed iframe inside a
teaching app and is driven by an AI teacher.

The tool can be any of several **subtypes** (hotspot, sorter, simulation, selector, quiz,
image_reveal, matching — see §3.4/§4). **Not every subtype has a "phenomenon" to watch.** A
simulation does; a matcher or a quiz does not. Throughout this prompt, wherever we say **"the
core interactive element"** we mean *whatever the student mainly looks at and acts on* — a
simulated scene, a number line, two columns to pair, a set of tappable items, an image to
uncover. Design that element to be the showpiece, whatever form it takes.

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
| `<code>.json` | The control spec. Declares the agent's methods, the events, the valid argument ids, the student controls, the pedagogy metadata, **and the four `agentInstructions` fields (§11)**. **The teacher only ever sees this JSON** — it is the contract. |

The two must be **kept in lock-step**: every `windowMethod` in the JSON must exist on the
component's `api`; every event the component emits must be listed in the JSON `events`.

The JSON also carries the **`agentInstructions`** block (§11) — `description`,
`teacherToolInstruction`, `studentToolInstruction`, `teacherRealInstruction` — the per-tool
text the platform injects into the teacher-agent instruction templates. Author it in lock-step
too: its `action_id`s must match the `windowMethods`, its valid-id references must match
`validIds`/`answerKey`, and its report-back references must match `events`.

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
  const fn = (apiRef.current as any)[d.method];
  let result;
  if (typeof fn === 'function') result = fn(...(d.args || []));
  // reply so getState()/queries can resolve; echo the id so the caller can correlate
  emit({ type: 'response', id: d.id, result });
};
window.addEventListener('message', onMsg);
return () => window.removeEventListener('message', onMsg);
```
> Read from an `apiRef` (a ref that always points at the latest `api`), not a captured `api`
> object — otherwise agent commands run against stale state. See §9.

### 3.2 Outbound — the tool talks back
Emit to the parent with `window.parent.postMessage(msg, '*')`. Four message types:

| Message | When | Shape |
|---|---|---|
| **ready** | once, as soon as the component is mounted **and** the listener is attached | `{ type: 'ready', toolId }` |
| **event** | every meaningful student action **and** every state change worth reacting to | `{ type: 'event', name, detail }` |
| **state** | in response to `getState()`, for passive listeners | `{ type: 'state', state }` |
| **response** | in response to a command carrying an `id` | `{ type: 'response', id, result }` |

**Correlating a query:** a command with an `id` always gets back `{ type: 'response', id, result }`,
where `result` is the method's return value. Make `getState()` **return** the state object *and*
broadcast `{ type: 'state', state }` — so a caller awaiting `id` gets the state in `result`, and
passive listeners still receive the `state` message. Never leave a query uncorrelated.

> ⚠️ **The single most important rule:** you **MUST** emit `{ type: 'ready', toolId }` on
> mount. Control commands the teacher sends *before* `ready` are **queued by the host and
> only flushed when `ready` arrives.** If you never emit `ready`, **every teacher command is
> silently dropped** and the tool appears dead. Emit it from a `useEffect` after the message
> listener is attached.

### 3.3 The standard agent API (every tool implements these)
```ts
api = {
  setParam(name, value),   // set any tunable prop (speed, difficulty, theme, muted, operatorMode…)
  play(),                  // start/resume any animation or timer
  pause(),                 // pause it
  reset(),                 // return to the initial state (clears score/selection)
  highlight(target),       // pulse/glow a named element to draw attention (NON-destructive)
  getState(),              // RETURN the state AND emit {type:'state', state} (score/selection/mode/depth)
  setOperatorMode(mode),   // 'ai' | 'student' — switch the whole experience: UI + content depth (§6)
  // …plus the tool-specific verbs below
}
```
`highlight(target)` is special: it is the agent's **pointer/laser** — it draws attention
to one element **without** performing the action. It powers "guide, don't do" teaching
(see §6). Implement it for every nameable element.

### 3.4 Tool-specific verbs (per subtype)
Add the verbs the concept needs. Reference set by subtype:

| Subtype | Verbs (exact signatures) | Typical events |
|---|---|---|
| **hotspot** / find-it | `tap(itemId)` | `item_tapped`, `answer_correct`, `answer_incorrect` |
| **sorter** / drag-drop | `placeCard(cardId, binId)`, `checkAnswers()`, `removeCard(cardId)` | `item_placed`, `answer_checked`, `completed` |
| **simulation** | `start()`, `setValue(name, n)`, `step()`, `release()` | tool-specific (`value_changed`, `run_completed`…) |
| **selector** / explorer | `select(id)`, `reveal()` | `item_selected`, `revealed` |
| **quiz** | `choose(optionId)`, `submit()` | `option_chosen`, `answer_checked`, `completed` |
| **image_reveal** | `reveal(regionId)`, `revealAll()`, `hideAll()` | `region_revealed`, `all_revealed`, `reset` |
| **matching** | `match(leftId, rightId)`, `clearMatch(leftId)`, `checkMatches()` | `pair_matched`, `pair_incorrect`, `all_matched` |

Every verb must:
1. produce the **same visible result** as if the student did it (so the student watching a
   demo sees the real thing),
2. be **idempotent-safe** (calling `tap("water")` twice doesn't double-count; matching an
   already-matched pair no-ops),
3. emit a corresponding **event** so the teacher can react,
4. read the **latest** state via a ref (never a stale closure — §9).

### 3.5 The events the host already understands
Prefer these names where they fit (the host forwards them to the teacher as
`[2D tool — the student …]` notes):
`ready`, `item_placed`, `answer_checked`, `answer_correct`, `answer_incorrect`,
`completed`, `incomplete`, `reset`, `operator_mode_changed`. Subtype events
(`region_revealed`, `all_matched`, `value_changed`, `run_completed`…) and any concept-specific
ones are welcome — just list every one you emit in the JSON `events`.

---

## 4. The JSON Control Spec — full schema

```jsonc
// ⚠️ ILLUSTRATIVE EXAMPLE ONLY (§0.2). Shows the SHAPE of the spec, not what to build.
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

  "sharedState": { "fields": ["windSpeed", "rpm", "prediction", "operatorMode", "depth"] },

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

  "validIds": {                              // ⭐ THE FULL ARG-ID SPACE (see §5) — every value any verb accepts
    "windLevels": ["none", "gentle", "strong"],
    "highlightTargets": ["windSlider", "firki", "predictButton", "rpmReadout"],
    "operatorModes": ["ai", "student"]       // ai = lean teacher demo; student = full practice (§6)
  },

  "answerKey": {                             // ⭐ ONLY which id(s) are correct — kept separate from validIds
    "correctPrediction": "strong"
  },

  "props": {
    "defaults": { "themeColor": "#4A4DC9", "darkMode": false, "operatorMode": "student", "device": "mobile" },
    "additionalProps": { "seed": 42 }
  },

  "events": ["ready", "wind_changed", "prediction_made", "spun", "completed", "reset", "operator_mode_changed"],

  "scientificFacts": [
    "Moving air (wind) can push objects and make them spin.",
    "The faster the air moves, the more force it applies."
  ],

  "agentInstructions": {                     // ⭐ the four per-tool instruction fields (see §11) — HTML-tagged, ALWAYS/NEVER, no repetition
    "description":
      "<description>Shows how moving air makes a firki spin faster as wind increases.</description>",
    "teacherToolInstruction":               // teacher AGENT, ai mode — how YOU drive it to demonstrate
      "<teacher_tool_instruction>ALWAYS set a wind level with setWind, then spin() and let the student watch the rpm change. ALWAYS ask what they OBSERVED before you reveal the prediction. NEVER ask the student to operate the tool in this mode.</teacher_tool_instruction>",
    "studentToolInstruction":               // student mode — student-facing, what to TRY
      "<student_tool_instruction>ALWAYS try each wind level and watch the firki. ALWAYS lock a prediction before revealing the result, and be ready to explain WHY you chose it.</student_tool_instruction>",
    "teacherRealInstruction":               // human teacher in class — what the tool is / when to use it
      "<teacher_real_instruction>A wind-and-firki simulation for the 'moving air exerts force' beat. Use it in place of the paper-firki demo.</teacher_real_instruction>"
  }
}
```

Field notes:
- **`subtype`** — drives the host's lock/observe behaviour. Be accurate.
- **`placement.beat`** — `Apply`/`Practice` ⇒ the **student** does the activity (agent
  guides). `Observe`/`Explain` ⇒ the **agent** demonstrates. (See §6.)
- **`validIds` vs `answerKey`** — `validIds` enumerates every argument value any verb will
  accept (so the teacher never guesses an id). `answerKey` says only which of those ids is the
  *correct* answer. Keep them separate so an id list can be shared without leaking the answer.
- **`studentControls`** — written in plain language; the teacher reads these to coach.
- **`scientificFacts`** — 2–4 short, correct, age-appropriate facts the teacher can speak
  (rename to `keyFacts` for non-science subjects).
- **Authoring metadata — `title`, `description`, `context`, `teachingNotes`,
  `instructionsForStudent`** — the human-authored fields surfaced in the platform's authoring form
  and read by the teacher (these top-level fields are the plain authoring blurbs — distinct from the
  HTML-tagged `agentInstructions.description` in §11, which is agent-template text). They live in
  **two places, kept in sync** — the authoring-form registry (`src/data/formfield.json`: one array
  entry per tool, camelCase, plus `2dToolJson` / `2dToolTsx` path pointers to the sidecar and
  component) **and** this per-tool JSON sidecar; write each string once and mirror it in both. All
  five are **required**, written in plain student-/teacher-facing prose grounded in *this specific*
  tool — never code, agent-verb, or windowMethod language. Each carries a distinct job; do not
  paraphrase one into another:
  - **`title`** — the tool's display name: a concise noun phrase (e.g. "Handspan measuring tool").
  - **`description`** — a single sentence naming what the student *does* and the payoff/reveal.
  - **`context`** — grade · subject · chapter, then the real-world activity the tool renders
    on-screen (the phenomenon and why it matters) — enough for a teacher to place it in the lesson.
  - **`teachingNotes`** — how to run it: the pedagogical move (e.g. predict-then-reveal), what to
    re-run or compare, and the idea it should land.
  - **`instructionsForStudent`** — the concrete step-by-step the learner follows, in order.
- **`agentInstructions`** — the four per-tool instruction fields the platform injects into the
  teacher-agent templates. **Author them per §11**: wrap each in its HTML tag, use ALWAYS/NEVER
  phrasing, and state each rule once. Their `action_id`s/args must match `windowMethods` +
  `validIds`.

---

## 5. ⭐ Valid Argument IDs — the rule that makes control actually work

The teacher is an LLM. It only knows what your JSON tells it. If your `tap(itemId)` accepts
`"water"` but the teacher doesn't know that, it will **guess** — and call `tap("river")`,
which silently no-ops. (This is a real failure we hit.) Therefore:

1. **Enumerate every valid argument value in `validIds`** — lists of short ids, or a dict
   whose **keys** are the ids:
   ```jsonc
   "validIds": { "treasures": ["air","sunlight","water","trees","soil","birds"],
                 "madeByPeople": ["house","bicycle","pole","bottle"] },
   "answerKey": { "correct": ["air","sunlight","water","trees","soil","birds"] }
   ```
2. **Make ids intuitive and literal** — the id should be the obvious word for the thing.
   Use `"water"`, not `"river"` or `"item_3"`. Use `"battery"`, not `"part_b"`. If the
   on-screen label is "Sunlight", the id is `"sunlight"`.
3. **One id space, documented.** If `tap`, `highlight`, and `placeCard` all reference the
   same items, they all use the **same** ids.
4. **`highlight(target)` targets must be listed too** (every nameable region/element) — put
   them in `validIds` (e.g. a `highlightTargets` list).

> Acceptance test: a person reading **only the JSON** can write a correct
> `tap(...)`/`placeCard(...)`/`highlight(...)` call for every item, without seeing the component.

---

## 6. Pedagogy & Operation Modes (the tool must support BOTH)

The platform runs a tool in one of two modes. **Your tool must teach well in both**, which
is why you implement **both** "do" verbs and a "guide" verb (`highlight`).

| Mode | Who acts | The agent's job | Your tool must support |
|---|---|---|---|
| **ai_operated** | the **teacher** drives | demonstrate the concept by calling verbs | the verbs produce the **real** visible result |
| **student_operated** | the **student** drives | watch + coach; `highlight()` to hint; comment on emitted events | rich **events** so the agent knows what the student did |

**Match the verbs to the `placement.beat`:**
- **Observe / Explain tools** (e.g. a simulation the teacher runs): the agent *demonstrates*.
  The star verb is the one that **runs the core interaction** (`spin()`, `release()`, `play()`).
  The student watches and answers *why*.
- **Apply / Practice tools** (e.g. tap-the-items, sort-the-cards, a matcher, a quiz): the
  **student** does the activity — that *is* the learning. The agent should mostly
  **`highlight()` a missed/next item and encourage**, not perform every action itself. So:
  - implement `highlight(itemId)` richly (it's the agent's main verb here),
  - emit a clear event on each student action (`item_placed`, `answer_checked`, …),
  - still implement the "do" verb for the rare demo, but design the tool so a
    hint+student-action loop feels natural.

> Design heuristic: if the fun/learning is in the **doing** (find it, sort it, match it, guess
> it), it's an **activity** tool — optimise for the student doing it and the agent nudging. If
> the learning is in **seeing something unfold**, it's a **demo** tool — optimise for the agent
> running it cleanly while narrating.

### 6.1 ⭐ The UI must ADAPT to the mode — with a CLICKABLE Teacher/Student toggle

The mode is **not just a teaching style — it changes what the student sees.** The tool receives
the current mode from the **host** (via `props.operatorMode` and `setOperatorMode`) **and**
exposes its own **clickable toggle** so both experiences can be shown on demand.

**What each mode renders:**
- **`ai_operated` (Teacher)** → **collapse to a focused DEMO view.** Show only the **core
  interactive element** (the animated showpiece, the meter, the simulation) plus the
  read-out and a short **"watch" caption** ("👩‍🏫 Your teacher is showing you this — watch,
  you'll get a turn"). **HIDE the student control panel** — steppers, sliders, action buttons.
  The agent drives through verbs, so the knobs would only clutter the demo and a stray tap would
  fight the animation. Content is **lean** (§6.2).
- **`student_operated` (Student)** → show the **full** interactive control panel; the student
  drives. Content is the **full** set (§6.2).

**The toggle (new requirement):**
- Render a **clearly clickable, fully-styled segmented toggle** — `👩‍🏫 Teacher | 🙋 Your turn`
  (label it Teacher / Student). Clicking it **switches the entire experience live**: the UI
  collapse/expand **and** the content depth (§6.2). This is the mechanism to *show most of the
  tool* — reviewers, the teacher, or a standalone tester can flip between the trimmed demo and
  the full practice set in one tap.
- It must be a **real control, not a default checkbox** — styled, with hover/active/focus
  states, an obvious selected segment, and a smooth transition between modes.
- Keep it **visible but secondary** to the primary CTA — a compact segmented control (e.g.
  top-right of the header), not a giant button competing with the main action.
- **Host still wins in production.** The host sets the mode via `setOperatorMode`; the toggle
  mirrors host state and can override it for demo/preview/standalone. If the host wants to lock
  the mode, it can hide the toggle via a prop (`props.showModeToggle: false`, default `true`).

**Implementation requirements:**
- Accept `operatorMode: 'ai' | 'student'` via `props` (**default `'student'`** — safe for
  standalone) **and** via `setParam('operatorMode', …)` / a dedicated `setOperatorMode(mode)`
  method **and** via the on-screen toggle. All three paths call the same handler.
- Gate the control panel on the mode: `{mode === 'student' && <Controls/>}`; render the demo
  caption when `mode === 'ai'`. The core element + read-out render in **both**.
- Emit `operator_mode_changed` (with the new depth) and reflect `operatorMode` + `depth` in
  `getState()`.
- Add to the JSON: `setOperatorMode(mode)` in `windowMethods`, `operatorMode` + `depth` in
  `props`/`sharedState`, `operator_mode_changed` in `events`, and `"operatorModes":
  ["ai","student"]` in `validIds` with a one-line note on the collapse + depth behaviour so the
  teacher LLM knows the tool reconfigures itself.

### 6.2 ⭐ Content depth adapts to the mode — Teacher = lean, Student = full

Beyond hiding controls, the **amount of content differs by mode.** Same capability, same verbs,
same code — only *how many steps and examples are surfaced* changes.

- **`ai_operated` (Teacher) → LEAN.** The teacher is demonstrating **one idea quickly** and
  narrating over it. Surface the **minimum**: the shortest path that shows the idea once —
  typically **a single worked example / one representative item** and the **fewest steps** needed
  to make the point. **No extended practice set**, no long multi-step walkthrough. The demo
  should be clean and fast so the teacher can show it and move on.
- **`student_operated` (Student) → FULL.** The student is **practising to mastery** and needs
  scaffolding. Surface the **complete** set: the **full step sequence**, **more worked examples /
  more practice items** (typically **3–6** rounds or items where the concept supports it), extra
  **hints**, and a visible **progress/score across the larger set**.

Rules:
- The component **holds the full content set internally** and renders a **trimmed slice** in
  Teacher mode vs the **full set** in Student mode. It is **one component with two depths**, never
  two code paths or two files.
- Switching mode (via the toggle, `setOperatorMode`, or the host) **re-derives the depth live** —
  expanding or trimming the visible steps/examples with motion, not a hard reload.
- Reflect the active depth in `getState()` (e.g. `depth: 'lean' | 'full'`, plus `stepCount` /
  `exampleCount`) and include the depth in the `operator_mode_changed` event detail.
- Default (`student`) shows the **full** experience — safest for standalone use.

> In short: **Teacher mode = fewer steps + fewer examples (a crisp demo); Student mode = more
> steps + more examples (real practice).** The clickable toggle lets anyone flip between the two
> and see the whole tool.

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
- **Character (OPTIONAL — use judgement).** A **mascot or character is optional and
  concept/age-dependent, not a default.** Add one only when it genuinely fits — a light topic,
  younger students, a narrative concept — and let it react to events (a small celebratory
  reaction on correct, a gentle one on wrong). **Many tools should have NO mascot:** number
  lines, sorters, matchers, data/graph tools, geometry tools, and most tools aimed at older
  students look *more* premium and age-appropriate **without** a cartoon character. When a
  mascot doesn't fit, put the personality into **motion, colour, and micro-interactions**
  instead. Never bolt on an unrelated animal to "add character."

### 7.2 Animation — rich, physical, delightful (this IS what "professional" means here)
Static + functional = basic. **Every interaction and state change must move with intent.**
- **Physics, not linear jumps**: spring/easing motion. Use **framer-motion** by default
  (`motion`, `AnimatePresence`, `layout`, spring `transition`) — see §8 for availability.
- **Entrance**: elements **stagger in** (fade + rise + scale) on mount — never pop in flat.
- **The core interactive element is the showpiece — animate it richly** in whatever form it
  takes: a simulated object moves in springy arcs with squash-and-stretch and a drawn SVG trail;
  a meter **fills/drains smoothly**; matched pairs **snap together** with a satisfying settle;
  numbers **count up**; a marker **glides** along a line, never teleports.
- **Feedback motion**: selection = scale-up + glow + ring; correct = pop + ✓ stamp +
  **confetti/particle burst**; wrong = shake + soft flash; reveal = sliding panels, drawn
  paths, cross-fades.
- **Ambient life**: gentle idle motion (a breathing accent, drifting gradient, a pulsing hint)
  so the screen is never dead — no mascot required.
- **`highlight(target)`** = an eye-catching looping **pulse / ring / bouncing arrow** the
  agent uses to point at things while teaching.
- **Mode transitions animate**: collapsing to the Teacher demo and expanding to the Student
  panel (§6.1), and trimming/expanding steps/examples (§6.2), both animate smoothly.
- 60fps, GPU-friendly transforms (translate/scale/opacity); respect `prefers-reduced-motion`
  (swap large motion for crossfades).

### 7.3 Sound — layered, musical, mutable
- **Web Audio API** synthesised cues (no asset deps) or tiny base64 clips. Make them feel
  **pleasant and musical**, not raw beeps: a soft **tap**, a rising two-note **correct**
  chime, a gentle **wrong** thunk, a small **completion fanfare** (arpeggio); an optional
  ambient loop if it fits.
- Gate first sound behind a gesture; **never loud-autoplay**; expose
  `setParam('muted', boolean)` and a visible mute toggle.

### 7.4 Engagement, polish & sizing
- A visible **score / streak / stars / progress** (`4/6`, ⭐⭐⭐, 🔥 streak) with satisfying
  count-ups, and a real **celebration** on completion (confetti + fanfare + a "well done!" state).
- **The completion celebration must take over the WHOLE screen — never a corner toast or a strip
  pinned to the bottom.** Render it as a **full-viewport overlay**: a `position: fixed; inset: 0`
  layer at a high `z-index` with `pointer-events: none` (so it celebrates *over* the tool without
  blocking it), filling the entire frame — stars / confetti / particles burst from the centre and
  rain across the **full width and height**, with a **centred** "well done!" moment and the fanfare,
  then it fades out and hands the screen back. The moment should *own* the screen; a celebration
  confined to the footer reads as an afterthought. Because it is `position: fixed`, it escapes any
  pinned / `overflow:hidden` canvas and covers the frame regardless of the tool's fit/scroll
  structure (§8).
- **Specific** feedback ("✓ Water — the river gives us water"), not bare ✓/✗.
- Big tap targets, kid-friendly type, an obvious "what do I do" hint line, and **hover /
  active / focus** states on everything interactive.
- **Minimum interactive-element size — hard floor, by device target:** on **mobile** every
  button / tap target is **≥ 24×24 CSS px**; on a **smartboard / large touch display**
  **≥ 60×30 CSS px** (a larger absolute footprint for arm's-length, standing-up, shared touch —
  a 24px control is unusable on a wall display). These are *minimums* — the primary CTA and main
  controls should be comfortably bigger (pill buttons, generous padding; aim ≥ 44 px on the
  primary action). Take the device context from `props` (`props.device: 'mobile' | 'smartboard'`,
  default `'mobile'`) — or infer it from the viewport/pointer — and size every control to the
  matching floor.
- A smooth **`reset()`** that visibly clears with motion; an intentional initial/empty state.
- **Zero raw default controls** — style every `<button>`, slider, input, **and the mode toggle**.
- **Size the component to the concept, not to a line count.** A rich simulation may run several
  hundred lines; a focused quiz or matcher is legitimately smaller. **Never pad to hit a number,
  and never ship a thin stub** — a component that's tiny *because it skipped design, animation,
  and sound* is the failure we're guarding against, not a small line total per se.

> **Self-check before returning:** mentally screenshot the result. If it looks like a
> wireframe, a default-styled form, or a plain diagram, it is **NOT done**. Keep pushing the
> visuals, motion, and sound until it looks like something a student in this age range would
> beg to use.

---

## 8. Technical constraints

- **One self-contained `.tsx`**: a single default-exported React function component. No
  imports from the host app. No network calls.
- **framer-motion:** this environment **provides framer-motion — import and use it directly.**
  (If you are adapting this prompt to a host that does *not* bundle it, change that one import to
  a CSS-transition/`requestAnimationFrame` approach instead — but **commit to ONE path.** Do
  **not** ship runtime "feature-detection" branches: static imports throw at load if the package
  is absent, so a try/catch fallback doesn't work cleanly.)
- **Sandbox:** the tool runs inside an iframe. If the host uses
  `sandbox="allow-scripts allow-same-origin"`, note that those two flags **together weaken the
  sandbox** (framed script can remove its own sandboxing) — for generated tools, confirm this is
  intentional and drop `allow-same-origin` if it isn't needed. Don't rely on
  `localStorage`/cookies regardless.
- **Responsive**: fill the iframe (≈ full width, ≥ 80vh), scale cleanly from phone to desktop.
- **No scrolling — the tool is a single self-contained screen that fits its viewport.** There must
  be **no vertical or horizontal page scrollbar** at any supported size: the entire experience (the
  core interactive element, read-out, controls, toggle, CTA) fits within the viewport at once. Fit
  the content to the available space instead of overflowing — cap the core element's height
  (`max-height` in `dvh`/`svh`), use compact / 2-column layouts, and reflow per §8.1 (esp. the
  1366×768 @ 100% sign-off). The learner must never scroll to reach an interaction or the CTA. (An
  internal, deliberately-scrollable pane — e.g. a long list — is fine, but the tool as a whole never
  spawns a page scrollbar.)
- **The no-scroll rule is absolute; the *fit strategy* adapts to the context size.** Sense the size of
  your context (the container/frame) — via **container queries** (`@container`), `dvh`/`svh`, or a
  measured resize — and adapt **how much you surface at once**: in a **roomy** context (Web 1366×768,
  Smart Board 1920×1080) the whole activity **fully fits with no scroll anywhere** and *fills* the frame;
  in the **tightest** context (Mobile App 844×390) **show fewer items/steps at once** — fewer cards, one
  section/phase at a time, a hard-capped phenomenon — so it still fits. Only if a single active section
  genuinely cannot fit the tightest frame may an **inner pane** scroll. It is the **same content set
  surfaced in a different amount per context size**, and the **page/frame itself never scrolls at any
  size.** (This is distinct from the §6.2 Teacher/Student depth split — here the depth adapts to the
  *container size*, not the operator mode; both can apply at once.)
- **No-scroll box-model gotchas (these cause phantom 1–30 px scrollbars — real bugs we hit):**
  - **Set `box-sizing: border-box`** on the root and on any `width:100%` / `height:100%` /
    `min-height:100%` container. With the default `content-box`, **padding is ADDED to the size**: a
    `width:100%` box with horizontal padding becomes *wider* than its parent (→ horizontal scrollbar),
    and a `min-height:100%` root with **bottom padding** grows *taller* than the viewport (→ vertical
    scrollbar). Put the spacing on inner elements, or use `border-box` so padding is contained — and
    watch the `padding` **shorthand** (`padding:"0 0 6px"`), not just `paddingBottom`.
  - **`min-height:100%` does NOT prevent overflow** — it only sets a floor; if the content is taller
    than the viewport it still scrolls, so you must genuinely make it *fit*.
  - **In a two-pane layout the TALLER column sets the height.** Shrinking the showpiece/SVG does
    nothing if the controls column is the tall one — trim the real critical path (header height,
    inter-section margins, and the tallest column), not just the phenomenon.
- Accept a `props` object matching the JSON `props.defaults` + `additionalProps` (theme, seed,
  operatorMode, device, etc.). Be **deterministic** given the same `seed`.
- Robust: ignore unknown commands, never throw out of the message handler, clamp args.

### 8.1 Orientation-aware layout — recompose for landscape, don't merely scale

**Responsiveness here is two-dimensional: the tool must adapt to the viewport's *orientation*
(aspect ratio), not just its width.** A single fluid column that only shrinks is a failure mode —
on a wide, short **landscape** viewport it forces vertical scrolling and pushes the interaction
below the fold. Treat **portrait (tall)** and **landscape (wide)** as two first-class layouts of the
same component and let it **reflow** between them; state, logic and the agent contract are
identical across both — only the *arrangement* changes, never the capability.

- **⭐ Three canonical device frames — the tool is previewed in EACH and must fit with NO scroll.**
  The platform embeds the tool at three fixed **landscape** sizes (a device-preview switcher: Mobile
  App / Web Version / Smart Board). You design, tune and **sign off on all three** — zero vertical AND
  zero horizontal scroll in each, at 100% zoom (never rely on the user zooming out):

  | Frame | Size (CSS px) | Height | Design note |
  |---|---|---|---|
  | **Mobile App** | **844 × 390** | **390 px — tightest** | landscape phone; barely a few rows tall — the hard case. |
  | **Web Version** | **1366 × 768** | 768 px | laptop — the balanced reference you tune against. |
  | **Smart Board** | **1920 × 1080** | 1080 px | large touch display — must **fill** the frame, not sit sparse. |

  Heights span **390 → 1080 px** (≈ 2.8×), so **height is the binding constraint — design height-first**
  (`dvh`/`svh`, cap the phenomenon with `max-height`), not width-first. Budget for host chrome, so the
  usable area is a bit smaller than the raw frame.
  - **844×390 is the hard one.** 390 px is almost no vertical room: **show less at once** — surface only
    the **active step/section**, don't stack an intro card *and* the predict card *and* the answer
    options at the same time (that's exactly what overflows today); shrink the header, cap the
    phenomenon hard in `svh`, and use the two-pane split to spend the width. If a single section still
    can't fit, an internal scroll pane *within that section* is acceptable — the **frame itself must
    never scroll**.
  - **1920×1080 — fill, don't sparse.** Grow/scale the panes and type (`clamp()`, `min()/max()`) and
    centre the composition to occupy the big frame (`display:grid; place-content:center`); never strand
    a small tool in the top-left over a dead band.
  - **Map the device context (§4/§7.4):** Mobile App → `props.device:'mobile'` (targets ≥ 24×24);
    Smart Board → `props.device:'smartboard'` (targets ≥ 60×30); Web → desktop pointer (≥ 44 px on the
    primary action). Or infer from the viewport/pointer. Sizes between these still scale fluidly.
- **Break on orientation, not just on width.** Drive the layout with
  `@media (orientation: landscape) / (orientation: portrait)`, **container queries** (`@container`)
  and/or `aspect-ratio`, so the tool reconfigures itself the instant the device rotates or the
  host iframe's aspect ratio changes — don't rely on `min-width` breakpoints alone.
- **In landscape, split horizontally.** Reflow the vertical stack (header → core element → controls →
  read-out) into a **two-pane** composition: the animated **showpiece on one side, the controls +
  read-out on the other**, via `flex` / CSS `grid` (`flex-wrap`, `grid-template-columns:
  minmax()/auto-fit`, `clamp()/min()/max()` sizing). Spend the extra horizontal room deliberately —
  never leave it as dead margin or letterboxed bars.
- **Respect the short axis.** Landscape is height-constrained: size against the **viewport height**
  with `dvh`/`svh` (not `vh`), cap the core element with a `max-height`, and keep the **primary
  interaction, the star read-out and the CTA visible without scrolling** (above the fold).
- **Let the SVG breathe.** The scene holds its intrinsic ratio via `viewBox` +
  `preserveAspectRatio="xMidYMid meet"` and grows along the wide axis rather than clipping or
  distorting; anchored labels/overlays must re-anchor to the recomposed layout, not float free.
- **Invariants in both orientations:** touch targets meet the §7.4 device-target minimums
  (**mobile ≥ 24×24 px, smartboard ≥ 60×30 px**; ≥ 44 px on the primary action), the full type
  scale, and honored safe-area insets (`env(safe-area-inset-*)`).
- **Verify by rotating — and sign off at ALL THREE device frames @ 100%.** The layout must **recompose cleanly**
  on a portrait phone, a landscape phone/tablet and a desktop iframe. The mandatory sign-off check:
  **screenshot the tool at each of 844×390, 1366×768 and 1920×1080 @ 100% zoom** — and make sure each
  viewport is *truly* that CSS px size: a zoomed-out browser reports a **larger** CSS viewport and
  gives a false "it fits" pass (confirm `window.innerWidth`/`innerHeight` match the frame and
  `devicePixelRatio === 1`, or just check that `main.scrollHeight === main.clientHeight`). Everything
  fits in each frame with
  no clipping, no overlap, no horizontal or vertical scrollbar, and no orphaned whitespace band. If
  rotating yields a worse layout than portrait, or **any of the three frames scrolls** or reads top-heavy, it
  is **not done**.

---

## 9. Skeleton (copy this shape)

```tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
// framer-motion is available in this environment — import it directly (§8).
import { motion, AnimatePresence } from 'framer-motion';

const TOOL_ID = 'M2.S2.T4.C11.2D1';
const emit = (m: any) => { try { window.parent.postMessage(m, '*'); } catch {} };

export default function Tool(props: any) {
  const [state, setState] = useState(() => /* initial state from props.seed */ ({ score: 0, /* … */ }));
  // ⭐ always-fresh mirror of state — read this inside handlers so agent commands never see stale state
  const stateRef = useRef(state); stateRef.current = state;

  const [mode, setMode] = useState<'ai' | 'student'>(props.operatorMode ?? 'student');
  const depth = mode === 'ai' ? 'lean' : 'full';        // §6.2 — Teacher = lean, Student = full
  const muted = useRef(false);

  // --- sound (Web Audio, lazy, mutable) ---
  const playCue = useCallback((kind: 'tap'|'correct'|'wrong'|'done') => {
    if (muted.current) return; /* synth a short pleasant tone with AudioContext */ }, []);

  // --- mode + depth switch: used by props, setOperatorMode, AND the clickable toggle (§6.1) ---
  const applyMode = useCallback((m: 'ai' | 'student') => {
    setMode(m);
    emit({ type: 'event', name: 'operator_mode_changed',
           detail: { mode: m, depth: m === 'ai' ? 'lean' : 'full' } });
  }, []);

  // --- tool-specific actions (used by BOTH student clicks and agent commands) ---
  // ⭐ read latest via stateRef, write via setState — NEVER read `state` in a []-deps callback (stale!)
  const doTap = useCallback((itemId: string) => {
    const cur = stateRef.current;
    const next = { ...cur, /* mark item, update score from cur */ };
    setState(next);
    playCue('correct');
    emit({ type: 'event', name: 'item_placed', detail: { itemId, score: next.score } });
  }, [playCue]);
  const doHighlight = useCallback((target: string) => { /* pulse the named element */ }, []);

  // --- the agent API: every windowMethod in the JSON lives here ---
  const api = {
    setParam: (n: string, v: any) => {
      if (n === 'muted') muted.current = !!v;
      else if (n === 'operatorMode') applyMode(v);
      /* …other tunables… */
    },
    play: () => {/* … */}, pause: () => {/* … */}, reset: () => {/* clear score/selection with motion */},
    highlight: doHighlight,
    getState: () => { emit({ type: 'state', state: stateRef.current });   // for passive listeners
                      return { ...stateRef.current, operatorMode: mode, depth }; }, // and as the response result
    setOperatorMode: applyMode,
    tap: doTap,                // ⭐ tool-specific
  };
  const apiRef = useRef(api); apiRef.current = api;   // handler reads the LATEST api

  // --- the command listener + the REQUIRED ready signal ---
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || d.type !== 'command') return;
      const fn = (apiRef.current as any)[d.method];
      let result; if (typeof fn === 'function') result = fn(...(d.args || []));
      emit({ type: 'response', id: d.id, result });   // echo id + return value so queries correlate
    };
    window.addEventListener('message', onMsg);
    emit({ type: 'ready', toolId: TOOL_ID });   // ⭐ MUST fire, or commands are dropped
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // --- keep in sync if the host changes the mode via props ---
  useEffect(() => { if (props.operatorMode && props.operatorMode !== mode) setMode(props.operatorMode); },
            [props.operatorMode]); // eslint-disable-line

  return (
    <div /* animated, sound-rich, responsive shell */>
      {/* header: title + a STYLED, CLICKABLE Teacher|Student segmented toggle (§6.1) */}
      {/* {(props.showModeToggle ?? true) && <ModeToggle mode={mode} onChange={applyMode} />} */}

      {/* the core interactive element (showpiece) — renders in BOTH modes */}

      {/* Student mode → full controls + full step/example set (depth='full', §6.2) */}
      {/* {mode === 'student' && <Controls /* full set *//>} */}

      {/* Teacher mode → "watch" caption + lean single example, controls hidden (depth='lean') */}
      {/* {mode === 'ai' && <WatchCaption />} */}
    </div>
  );
}
```

Pair it with the §4 JSON, where every `windowMethod` matches an `api` key and every emitted
`event` is listed.

---

## 10. Acceptance checklist (the tool is done only when ALL pass)

**Contract**
- [ ] Emits `{type:'ready', toolId}` once on mount, after the listener is attached.
- [ ] Handles `{type:'command', id, method, args}`; `args` is positional, in signature order.
- [ ] Reads the latest state via a **ref** in handlers (no stale-closure `useCallback([])` reads).
- [ ] Every JSON `windowMethod` exists on `api`; every emitted event is in JSON `events`.
- [ ] Agent verbs produce the *same* visible result as the student doing it; idempotent-safe.
- [ ] `highlight(target)` implemented for every nameable element (non-destructive pulse).
- [ ] `getState()` **returns** the state (so the command `response` carries it) **and** emits
      `{type:'state', state}`; `reset()` fully clears.

**Valid ids**
- [ ] Every valid arg value is enumerated in **`validIds`**; **`answerKey`** holds only the
      correct id(s) — the two are separate.
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
- [ ] **UI adapts to the mode (§6.1):** `ai` collapses to the focused demo view (core element
      + "watch" caption, **controls hidden**); `student` shows the full panel.
- [ ] **Clickable, fully-styled Teacher | Student toggle (§6.1)** switches the whole experience
      live (UI collapse **and** content depth); mirrors/overrides host mode; hideable via
      `props.showModeToggle`; default `student`; `operator_mode_changed` emitted.
- [ ] **Content depth by mode (§6.2):** Teacher = **lean** (fewer steps, ~1 example); Student =
      **full** (more steps, ~3–6 examples/rounds, extra hints). One component, two depths;
      switches live with motion; `depth` reflected in `getState()` and the mode-change event.

**Agent instructions (§11)**
- [ ] All four `agentInstructions` fields present — `description`, `teacherToolInstruction`,
      `studentToolInstruction`, `teacherRealInstruction` — each wrapped in its HTML tag.
- [ ] Written in **ALWAYS/NEVER** language; **no instruction repeated** unless necessary.
- [ ] `teacherToolInstruction` only ever **drives** the tool (ai mode); `studentToolInstruction`
      is student-facing and **never drives**; `teacherRealInstruction` is human-facing (no agent syntax).
- [ ] Every `action_id`/arg referenced matches the JSON `windowMethods` + `validIds`/`answerKey`;
      every report-back name matches `events`. No concept specifics leaked from this prompt (§0.2).

**Quality**
- [ ] Every state change animated (60fps; respects reduced-motion); mode/depth transitions animate.
- [ ] Purposeful sound cues; muted-friendly; `setParam('muted', …)` works; no loud autoplay.
- [ ] Visible score/streak/progress + specific feedback + a celebratory completion — the completion
      celebration is a **full-screen** `position:fixed; inset:0` overlay (whole viewport), **not** a
      corner toast or bottom strip (§7.4).
- [ ] Responsive; **buttons meet the minimum size — mobile ≥ 24×24, smartboard ≥ 60×30 (§7.4)**;
      kid-friendly, deterministic for a given seed.
- [ ] **Orientation-aware (§8.1):** recomposes between portrait and landscape (not merely
      fluid-scales) — in landscape it splits the core element and controls horizontally.
      **Signed off at all three device frames — Mobile App 844×390, Web Version 1366×768, Smart Board
      1920×1080 @ 100% zoom (§8.1):** each frame fits with NO
      vertical/horizontal scroll, content fills the frame (not top-heavy), interaction + read-out
      above the fold, and no clipping/overlap when rotated. **`box-sizing: border-box` on the root /
      any `100%`-sized container** (padding on a `content-box` `width:100%`/`min-height:100%` box
      spawns a phantom scrollbar — §8); verified at a *true* 1366×768 CSS viewport (not a zoomed one).
- [ ] **Mascot is OPTIONAL and concept/age-appropriate (§7.1)** — many tools ship with none;
      personality carried by motion/colour when a character doesn't fit. No unrelated animals bolted on.
- [ ] **Sized to the concept, not padded to a line count, and not a thin stub (§7.4).**
- [ ] **Self-graded Aesthetics ≥ 4/5 and Animation ≥ 4/5 (§0.1)** — scores stated to the
      user; did not declare "done" while either was below bar; iterated past the first draft.
- [ ] **No example from this prompt (character, motif, colour, choreography) copied into the
      output (§0.2)** — the tool is built for its own concept.

---

## 11. Teacher-Agent Instructions — the fifth deliverable + injection templates

Every tool ships four instruction fields in `agentInstructions` (§4). The platform injects them,
plus data already in the JSON, into the two mode templates below and hands the result to the
teacher agent. **This layer is generated from the JSON — it never restates concept specifics
from this prompt (§0.2).**

**Formatting rules for everything in this section (stated once):**
- ALWAYS wrap each field's content in its own HTML tag (shown below).
- ALWAYS phrase every instruction as **ALWAYS / NEVER**.
- NEVER repeat an instruction unless it is genuinely necessary.
- ALWAYS derive every `action_id`, argument id, and report-back name from **this tool's JSON**
  (`windowMethods`, `validIds`/`answerKey`, `events`); NEVER invent or hardcode them.

### 11.1 The four fields (author these into `agentInstructions`)

- **`<description>`** — ALWAYS one or two plain sentences: what the tool teaches and does. Feeds
  **ABOUT** in both modes.
- **`<teacher_tool_instruction>`** — ALWAYS tell the teacher **agent** how to **drive** the tool
  to demonstrate the concept: which verbs, in what order, what to `highlight`, what to ask.
  NEVER write it student-facing.
- **`<student_tool_instruction>`** — ALWAYS tell the **student**, in plain student-facing words,
  what to **try** and the goal. NEVER agent-directed; NEVER describe the agent driving anything.
- **`<teacher_real_instruction>`** — ALWAYS a short, human-facing note for the classroom teacher:
  what the tool is and when to reach for it. NEVER use agent/marker syntax.

### 11.2 What the platform injects into the templates

| Template slot | Source in the JSON |
|---|---|
| `‹TOOL_ID›` | `toolId` |
| `‹ACTIONS›` (with signatures) | `agentControl.windowMethods` |
| `‹VALID_ARG_VALUES›` | `validIds` (+ `answerKey`) |
| `‹REPORT_BACK_EVENTS›` | `events` (the ones the host forwards as `[2D tool …]` notes) |
| `‹ABOUT›` | `agentInstructions.description` |
| `‹HOW_TO_DRIVE›` | `agentInstructions.teacherToolInstruction` |
| `‹WHAT_TO_TRY›` | `agentInstructions.studentToolInstruction` |
| `‹STUDENT_CONTROLS›` | `studentControls`, in plain words |

### 11.3 TEACHER MODE template (`operatorMode = 'ai'` — the agent drives)

```
<teacher_mode_instructions tool_id="‹TOOL_ID›">
LIVE CONTROL — in this mode YOU drive the tool in real time with
  control_2d_tool(action_id="…", args={…}). The student WATCHES and answers questions about what
  they see; they do NOT touch it.

CONTROLLABLE ACTIONS — this tool exposes ‹N› actions, read from its control JSON. ALWAYS use ONLY
these action_id values; NEVER invent, rename, or assume one:
  ‹ACTIONS — the windowMethods with signatures + a one-line description each, e.g.:
   - setParam(name, value): set a named parameter (e.g. operatorMode, muted)
   - play() / pause() / reset(): start-or-resume / pause / reset to the starting state
   - highlight(target): non-destructively pulse/point at a named element — does NOT answer or score
   - setOperatorMode(mode): 'ai' (you drive, student watches) or 'student' (they drive)
   - ‹subtype verbs — e.g. tap(itemId) / placeCard(cardId,binId) / reveal(regionId) /
     match(leftId,rightId) / setValue(name,n) …››

VALID ARG VALUES — ALWAYS pass the EXACT ids from the JSON; NEVER substitute a synonym
(e.g. use "water", never "river"):
  ‹VALID_ARG_VALUES — injected from validIds (+ answerKey)›

REPORT-BACK — the tool tells you what happens as a '[2D tool …]' note; ALWAYS react to it.
Notes for this tool: ‹REPORT_BACK_EVENTS›.

ABOUT: ‹ABOUT›
HOW TO DRIVE THIS TOOL: ‹HOW_TO_DRIVE›

HOW TO TEACH (ai-operated):
- ALWAYS bring the tool on screen ONCE with the inline marker [[tool: ‹TOOL_ID›]] the first time
  you use it; it then STAYS on screen. NEVER re-write that marker on later turns, and NEVER call
  control_2d_tool before the tool is shown.
- ALWAYS perform every action yourself with an inline control marker:
  [[control_2d_tool(action_id="…", args={…})]] — using ONLY the actions above. The system runs the
  marker, the tool reacts, then you say one short sentence about what it shows.
- ALWAYS batch items that share a reason into ONE call by passing an ARRAY as the first arg
  (e.g. [[control_2d_tool(action_id="placeCard", args={"idOrArray":["a","b","c"],"bin":"living"})]]).
  Act on an item on its own ONLY when you want to discuss that one.
- ALWAYS fill EVERY parameter with the EXACT key names in signature order; a verb that names an
  item ALWAYS takes that item id as the FIRST arg (positional args=[…] is equivalent). NEVER pass
  only the bin/group.
- NEVER ask the student to tap/click/drag/operate the tool — in this mode that is YOUR job.
- NEVER narrate an action you did not actually put in a marker this message.
- ALWAYS involve the student with a thinking question about what they OBSERVED or what it MEANS
  ("what happened to the level?", "why do you think that is?") — NEVER an instruction to operate
  the tool. Turns with no tool action are fine when you are explaining.
- ALWAYS keep messages short. NEVER reveal a check/answer before the student attempts it.
</teacher_mode_instructions>
```

### 11.4 STUDENT MODE template (`operatorMode = 'student'` — the student drives)

```
<student_mode_instructions tool_id="‹TOOL_ID›">
STUDENT-OPERATED — the STUDENT drives this tool, NOT you. It is UNLOCKED for them; THEY
tap/click/explore it themselves. You have NO control: NEVER call control_2d_tool (or any driving
tool), and NEVER say "I'll tap", "let me tap", "watch me", or "now I'll show you on the tool" —
you are not operating it, and the student can see that it is false.

ABOUT: ‹ABOUT›
WHAT TO TELL THE STUDENT TO TRY: ‹WHAT_TO_TRY›
THE STUDENT'S OWN CONTROLS: ‹STUDENT_CONTROLS›

REPORT-BACK — the tool tells you what the student did as a '[2D tool — the student …]' note;
ALWAYS react to it. Notes for this tool: ‹REPORT_BACK_EVENTS›.

YOUR JOB — OBSERVE & COACH (do NOT drive):
- ALWAYS introduce the tool and its GOAL ONCE, then let the student work AT THEIR OWN PACE.
- ALWAYS tell the student in plain words what to TRY, then STOP and let them do it.
- NEVER walk them through one step per message, and NEVER pose a fresh question every turn — that
  turns the lesson into a click-by-click quiz and buries the objective. Let them explore several
  steps, react to what they report, and keep tying it back to the OBJECTIVE you are teaching.
- ALWAYS treat their actions as EXPLORATION, not a final answer: acknowledge what they did,
  connect it to the idea, and invite them to explain WHY. NEVER declare it 'correct' until the
  note says it was checked/submitted (or they type an answer) — THEN praise or gently correct.
- ALWAYS keep every message to one or two short sentences so they get straight back to the tool.
- When the activity has served its point, ALWAYS hand back to the orchestrator's directive
  (move on) instead of inventing more tool questions.
</student_mode_instructions>
```

---

### One-line brief to hand the generator
> "Build `<code>.tsx` + `<code>.json` for the concept **‹CONCEPT›** as a **‹subtype›** tool.
> This must look like a **flagship commercial edtech product for students aged ~11–16, not a
> prototype** (§0) — work hard on visual design, framer-motion animation, and Web Audio sound; a
> mascot is **optional and only if it fits the concept/age** (§7.1); no default/flat controls.
> Follow the agent-control contract (§3) exactly — especially the `ready` signal, the
> `{type:'command'}` handler, and reading state via a ref (§9). Enumerate all valid arg ids in
> **`validIds`** with intuitive names, correct answers in **`answerKey`** (§5). Support both
> operation modes (§6): a **clickable Teacher|Student toggle** that switches the UI **and** the
> content depth — **Teacher = lean (fewer steps/examples), Student = full (more steps/examples)**
> (§6.1–6.2). Author the four **`agentInstructions`** fields (§11) — `description`,
> `teacherToolInstruction`, `studentToolInstruction`, `teacherRealInstruction` — HTML-tagged, in
> ALWAYS/NEVER language, no repetition, with `action_id`s/args mirroring the JSON. Clear the full
> §7 quality bar. Do **not** copy any example from this prompt (§0.2). Iterate past your first
> draft; verify against the §10 checklist before returning."
