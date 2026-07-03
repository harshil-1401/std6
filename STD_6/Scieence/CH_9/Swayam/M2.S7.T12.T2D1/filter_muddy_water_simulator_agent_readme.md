# Filter the Muddy Water — Agent README

**Tool:** `filter_muddy_water_simulator` · **Component:** `FilterMuddyWaterSimulator` · **v1.0.0**
**Topic M2.S7.T12 — Filtering muddy water with filter paper** (Class 6 Science · topic `M2.S7.T12` · tool `M2.S7.T12.T2D1`)

A tap-and-select guided experiment on **filtration**. In **Explore** the student folds a round filter paper into a cone (3 taps), **predicts** whether the mud passes through, then presses **Pour** to tip muddy water in and watch the **mud stay on the paper (residue)** while **clear water drips into the conical flask (filtrate)**. A pore selector compares **filter paper (fine → clear)** vs **loose cloth (coarse → cloudy)**. A gamified **Quiz** mode follows the house flow (silent play → result popup → concept review). **No drag-drop — only taps and one pore selector.**

> **Prod-safe icons:** this tool imports **no `lucide-react`** — all icons are inline SVGs, so it renders on every iframe-renderer version (an icon name can never be "not defined" at runtime).

---

## Quick reference

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `gradeLevel` | `6 \| 7 \| 8` | `6` | Tier preset. **6** = heavy game, story framing, big text, slowest pour, 70 confetti + 5 stars. 7 = moderate. 8 = light/formal. |
| `themeColor` | string | `#4A4DC9` | Accent hint. Internally uses the Singularity palette: header purple, residue brown, filtrate teal, CTAs orange `#FF7212`. |
| `initialMode` | `learn \| practice` | `learn` | Opening mode. |
| `enabledModes` | array | `["learn","practice"]` | Toggle shown as **Explore / Quiz**. |
| `showModeSelector` | boolean | `true` | Show the Explore/Quiz header toggle. |
| `showNavigation` | boolean | `true` | Back/Next in Explore. Auto-hidden when `filterSteps` freezes one screen. |
| `filterSteps` | `string[]` | `[]` | Freeze Explore on ONE screen (hides nav). Single-element `["S1".."S4"]`. |
| `autoPlayDuration` | number | `0` | Host hint only; tool sets `stopAutoNext(true)` because every screen needs interaction. |
| `additionalProps` | object | see below | Pore material + copy + re-theming. |

Prop signature is the standard framework one: `props`, `setStepDetails`, `stopAutoNext`, `setStopAutoNext`.

---

## `filterSteps` — freeze on one Explore screen

Pass a single-element array to embed exactly one moment (nav hidden):

| Value | Screen | Shows |
|---|---|---|
| `["S1"]` | Fold the filter paper | The folding sequence + the **Fold** button. |
| `["S2"]` | Predict the result | Tap-select: mud passes through vs held back. |
| `["S3"]` | Pour & filter | The **Pour** button + pore selector + the filtering animation. |
| `["S4"]` | Name the parts | The labelled result (residue / filtrate) + rule wrap. |

Empty `[]` = the full free-running 4-screen flow with Back/Next.

---

## `additionalProps` reference

| Key | Type | Default | Notes |
|---|---|---|---|
| `pore` | `"paper" \| "cloth"` | `"paper"` | Starting filter material. `paper` = fine pores → **clear** filtrate; `cloth` = coarse pores → **cloudy** filtrate. Student can switch on the Pour screen. |
| `showHints` | boolean | `true` | Show inline coaching captions. |
| `feedbackMessage` | string | "Press “Pour” to start filtering…" | One-line coaching under the apparatus before pouring. |
| `predictionPrompt` | string | "Will the mud pass THROUGH the filter paper, or be held back?" | Question on the Predict screen. |
| `liquidLabel` | string | `"muddy water"` | Re-theme the mixture (e.g. `"tea with leaves"`, `"sandy water"`). |
| `residueLabel` | string | `"mud"` | The solid trapped on the paper (residue), e.g. `"sand"`, `"tea leaves"`. |
| `filtrateLabel` | string | `"clear water"` | The liquid that passes through (filtrate). |
| `muddyColor` | `#hex` | `#9C7B52` | Colour of the unfiltered liquid + pour stream. |
| `residueColor` | `#hex` | `#8B5E34` | Colour of the trapped solid + the cloudiness tint when pores are coarse. |

> The **cloudy-vs-clear** outcome is driven by the `pore` choice, not a separate prop. Fine paper → clear filtrate; loose cloth → some fine mud slips through so the filtrate stays cloudy — the everyday "choice of filter depends on particle size" point.

---

## What the modes contain

**Explore (learn)** — 4 screens:
1. **Fold the filter paper** — tap 3× : half → quarter → open the cone into the funnel.
2. **Predict** — tap: mud passes through / mud held back.
3. **Pour & filter** — press *Pour*; mud caps the paper (**RESIDUE**), clear water drips into the flask (**FILTRATE**). Toggle paper ↔ cloth to compare clarity.
4. **Name the parts** — labelled result + rule wrap → *Take the Quiz*.

**Quiz (practice)** — 4 randomized questions: name the **residue**, name the **filtrate**, what filtration separates (**insoluble solid from a liquid**), pore size → clarity, and everyday filters (**cotton/charcoal/sand**, tea bags) → result popup (score count-up, stars, confetti) → wrong-answer review → play again.

---

## Tool-call examples

### 1. Default full lesson (recommended)
```json
{
  "frontend_action": "show_interactive_tool",
  "title": "Filter the Muddy Water",
  "data": {
    "toolName": "filter_muddy_water_simulator",
    "parameters": {
      "gradeLevel": 6,
      "initialMode": "learn",
      "additionalProps": {
        "feedbackMessage": "Press “Pour” and watch where the mud and the clear water end up."
      }
    }
  },
  "instructions_for_student": "Fold the filter paper into a cone, predict whether the mud will pass through, then pour the muddy water and watch where the mud and the clear water end up."
}
```

### 2. Embed only the pour/filter moment (after the prediction prompt)
```json
{
  "toolName": "filter_muddy_water_simulator",
  "parameters": {
    "showModeSelector": false,
    "filterSteps": ["S3"],
    "additionalProps": { "feedbackMessage": "Pour the muddy water — mud stays on the paper, clear water drips through." }
  }
}
```

### 3. Show the cloth-vs-paper contrast (start on coarse cloth)
```json
{
  "toolName": "filter_muddy_water_simulator",
  "parameters": {
    "filterSteps": ["S3"],
    "additionalProps": { "pore": "cloth", "feedbackMessage": "Loose cloth has bigger pores — some fine mud gets through, so the water looks cloudy. Try filter paper for clearer water." }
  }
}
```

### 4. Re-theme to rinsing sandy water
```json
{
  "toolName": "filter_muddy_water_simulator",
  "parameters": {
    "additionalProps": {
      "liquidLabel": "sandy water", "residueLabel": "sand", "filtrateLabel": "clear water",
      "muddyColor": "#C9B68A", "residueColor": "#B8A06A"
    }
  }
}
```

### 5. Quiz only (revision)
```json
{
  "toolName": "filter_muddy_water_simulator",
  "parameters": { "initialMode": "practice", "enabledModes": ["practice"], "showModeSelector": false }
}
```

---

## Decision tree for agents

```
Student is on filtration / "filter muddy water" / residue & filtrate
  │
  ├─ Teaching the WHOLE method the first time
  │     → default call (Explore, no filterSteps)
  │
  ├─ Just asked to predict "does the mud pass through?"
  │     → filterSteps: ["S2"]
  │
  ├─ Want to show the filtering happen
  │     → filterSteps: ["S3"]
  │
  ├─ Explaining why filter choice matters / clear vs cloudy
  │     → filterSteps: ["S3"], additionalProps.pore: "cloth" (then compare to paper)
  │
  ├─ Another insoluble-solid-in-liquid case (sand, tea leaves)
  │     → re-theme via liquidLabel/residueLabel/colors
  │
  └─ Revision / check understanding
        → initialMode: "practice"
```

---

## Concepts reinforced (curriculum-accurate)

- **Filtration** separates an **insoluble** solid from a liquid by passing the mixture through a filter with fine pores.
- The solid trapped on the paper is the **residue** (here: mud); the liquid that passes through is the **filtrate** (here: clear water).
- The **choice of filter depends on particle size** — finer pores give clearer filtrate; loose cloth lets fine particles through.
- A **dissolved (soluble) solid** cannot be filtered out — it slips through with the liquid (you'd evaporate the water instead).
- **Everyday filters:** cotton, charcoal and sand; tea bags (silk → muslin → filter paper).

---

## Gotchas

- The cloudy-vs-clear result is set by the **`pore`** prop (`paper`/`cloth`), not a clarity number — switching pore on S3 re-pours.
- `filterSteps` takes the **string** step ids `S1..S4` (not numbers). A multi-element array uses only the first id.
- The tool always calls `setStopAutoNext(true)`; `autoPlayDuration` will not auto-advance it.
- **Icons are inline SVG (no lucide-react)** — do not "fix" by adding a lucide import; that reintroduces the `X is not defined` prod error.
```
