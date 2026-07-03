# Settle & Pour: Sedimentation + Decantation — Agent README

**Tool:** `sediment_decant_sequence` · **Component:** `SedimentDecantSequence` · **v1.0.0**
**Topic M2.S4.T10 / Fig. 9.9 — Removing tea leaves without a strainer** (Class 6 Science · topic `M2.S4.T10` · tool `M2.S4.T10.T2D1`)

A tap-and-slide guided experiment for the two-step separation of a **heavier insoluble solid** from a liquid. In **Explore** the student sees a pan of tea with leaves mixed through it, **predicts** the fast-tilt effect, presses **Wait** to watch the leaves **sediment** to the bottom, then drags a **tilt slider** to **decant** the clear tea into a cup. The pour is physically honest: tilt **slowly** and only clear tea flows; **yank it fast** and the settled leaves lift back up so the cup goes **cloudy** — the built-in failure case. A gamified **Quiz** mode follows the house flow (silent play → result popup → concept review). **No drag-drop — only taps and one slider.**

---

## Quick reference

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `gradeLevel` | `6 \| 7 \| 8` | `6` | Tier preset. **6** = heavy game, story framing, big text, slowest/most dramatic settle, 70 confetti + 5 stars. 7 = moderate. 8 = light/formal. |
| `themeColor` | string | `#3b82f6` | Accent hint. Internally the tool uses the Singularity palette: header purple, **SEDIMENTATION** tag purple, **DECANTATION** tag + CTAs orange `#FF7212`. |
| `initialMode` | `learn \| practice` | `learn` | Opening mode. |
| `enabledModes` | array | `["learn","practice"]` | Toggle shown as **Explore / Quiz**. |
| `showModeSelector` | boolean | `true` | Show the Explore/Quiz header toggle. |
| `showNavigation` | boolean | `true` | Back/Next in Explore. Auto-hidden when `filterSteps` freezes one screen. |
| `filterSteps` | `string[]` | `[]` | Freeze Explore on ONE screen (hides nav). Single-element `["S1".."S4"]`. See below. |
| `autoPlayDuration` | number | `8000` | Host hint only; tool sets `stopAutoNext(true)` because every screen needs interaction. |
| `additionalProps` | object | see below | Scene state + copy + re-theming. |

Prop signature is the standard framework one: `props`, `setStepDetails`, `stopAutoNext`, `setStopAutoNext`.

---

## `filterSteps` — freeze on one Explore screen

Pass a single-element array to embed exactly one moment (nav hidden):

| Value | Screen | Shows |
|---|---|---|
| `["S1"]` | See the mixed pan | Leaves suspended throughout; the problem statement. |
| `["S2"]` | Predict the tilt effect | Tap-select: clear vs cloudy. |
| `["S3"]` | Wait for sedimentation | The **Wait** button + the settling animation + SEDIMENTATION tag. |
| `["S4"]` | Tilt slowly to decant | The tilt slider with the leaves pre-settled; DECANTATION tag. Slow = clear, fast yank = cloudy (built-in failure case). Ends with the rule wrap + quiz CTA. |

Empty `[]` = the full free-running 4-screen flow with Back/Next.

---

## `additionalProps` reference

| Key | Type | Default | Notes |
|---|---|---|---|
| `panState` | `"mixed" \| "settling" \| "settled"` | `"mixed"` | Initial settle state. `"settled"` drops the learner straight onto decantation. |
| `tiltAngle` | number `0..60` | `0` | Initial pan tilt in degrees. Pouring starts past ~16°. For a frozen mid-pour illustration. |
| `cupContents` | `"empty" \| "clear" \| "cloudy"` | `"empty"` | Pre-fill the cup. `"clear"` = a good slow decant already happened; `"cloudy"` = the fast-tilt failure outcome. |
| `showHints` | boolean | `true` | Show the small inline coaching hints. |
| `feedbackMessage` | string | "Wait for the leaves to settle before tilting. Tilt slowly." | One-line coaching under the pan (S1 / S4). |
| `predictionPrompt` | string | "Will tilting FAST pour clear tea or cloudy tea?" | Question on the Predict screen. |
| `liquidLabel` | string | `"tea"` | Re-theme the liquid (e.g. `"muddy water"`, `"rice water"`). |
| `solidLabel` | string | `"tea leaves"` | The heavier insoluble solid that settles (e.g. `"mud"`, `"rice grains"`, `"sand"`). |
| `liquidColor` | `#hex` | `#C97B30` | Colour of the still-mixed liquid. |
| `solidColor` | `#hex` | `#5A3A1A` | Colour of the settled band + suspended cloud. |

> The **fast-tilt failure is emergent**, not a fixed answer: the tool measures how fast you move the slider (deg/sec). Move it fast and the settled solid lifts → the pour stream and cup turn cloudy. Ease off and it slowly re-settles. So you don't configure "cloudy" — the learner causes it.

---

## What the modes contain

**Explore (learn)** — 4 screens:
1. **See the mixed pan** — leaves everywhere; goal set.
2. **Predict the tilt effect** — tap clear/cloudy.
3. **Wait for sedimentation** — press *Wait*; leaves sink into a dark band (**SEDIMENTATION**).
4. **Tilt slowly to decant** — drag the slider; a slow tilt pours clear tea while the leaves stay (**DECANTATION**), but a fast yank lifts them so the cup goes cloudy (the built-in failure case). Ends with the rule wrap → *Take the Quiz*.

**Quiz (practice)** — 4 randomized questions drawn from: which step is first, name the pour-off step (*decantation*), the fast-tilt outcome, will salt settle (the **insoluble** rule), and rice-washing as everyday decantation → result popup (score count-up, stars, confetti) → wrong-answer review → play again.

---

## Tool-call examples

### 1. Default full lesson (recommended)
```json
{
  "frontend_action": "show_interactive_tool",
  "title": "Settle & Pour the Tea",
  "data": {
    "toolName": "sediment_decant_sequence",
    "parameters": {
      "gradeLevel": 6,
      "initialMode": "learn",
      "additionalProps": {
        "feedbackMessage": "Wait for the leaves to settle before tilting. Tilt slowly."
      }
    }
  },
  "instructions_for_student": "Wait for the leaves to settle, then tilt slowly to pour clear tea. Try a fast tilt too — see what goes wrong."
}
```

### 2. Embed only the sedimentation moment (after the settling video)
```json
{
  "toolName": "sediment_decant_sequence",
  "parameters": {
    "showModeSelector": false,
    "filterSteps": ["S3"],
    "additionalProps": { "feedbackMessage": "Press Wait and watch the leaves settle — this is sedimentation." }
  }
}
```

### 3. Jump straight to decantation with leaves already settled
```json
{
  "toolName": "sediment_decant_sequence",
  "parameters": {
    "filterSteps": ["S4"],
    "additionalProps": { "panState": "settled", "feedbackMessage": "Tilt slowly. Clear tea flows in — this is decantation." }
  }
}
```

### 4. Show the failure outcome as a frozen illustration
```json
{
  "toolName": "sediment_decant_sequence",
  "parameters": {
    "filterSteps": ["S4"],
    "additionalProps": { "panState": "settled", "tiltAngle": 40, "cupContents": "cloudy",
      "feedbackMessage": "Tilting too fast disturbed the leaves — cloudy tea poured out." }
  }
}
```

### 5. Re-theme to washing rice (real-world decantation)
```json
{
  "toolName": "sediment_decant_sequence",
  "parameters": {
    "additionalProps": {
      "liquidLabel": "rice water", "solidLabel": "rice grains",
      "liquidColor": "#CDB892", "solidColor": "#E8E2D0",
      "feedbackMessage": "Pour off the cloudy water slowly; let the rice grains stay at the bottom."
    }
  }
}
```

### 6. Quiz only (revision)
```json
{
  "toolName": "sediment_decant_sequence",
  "parameters": { "initialMode": "practice", "enabledModes": ["practice"], "showModeSelector": false }
}
```

---

## Decision tree for agents

```
Student is on sedimentation / decantation / "removing tea leaves without a strainer"
  │
  ├─ Teaching the WHOLE sequence the first time
  │     → default call (Explore, no filterSteps)
  │
  ├─ Just played the settling video, want the "wait" beat
  │     → filterSteps: ["S3"]
  │
  ├─ Want to practise the careful pour
  │     → filterSteps: ["S4"], additionalProps.panState: "settled"
  │
  ├─ Asking "what if you pour fast?" / explaining the mistake
  │     → filterSteps: ["S4"] and let them yank the slider fast  (or a frozen cloudy still: tiltAngle+cupContents:"cloudy")
  │
  ├─ Connecting to a real-world case (rice / muddy water)
  │     → re-theme via liquidLabel/solidLabel/colors
  │
  └─ Revision / check understanding
        → initialMode: "practice"
```

---

## Concepts reinforced (curriculum-accurate)

- **Sedimentation** = the settling of the **heavier insoluble** component to the bottom of a liquid (gravity pulls the leaves down; they don't dissolve, so they stay as separate solids).
- **Decantation** = gently pouring off the clear upper liquid, leaving the settled solid behind. **Sedimentation first, then decantation.**
- **Tilt slowly** — a fast pour re-suspends the solid and ruins the separation (the tool's failure case).
- **Error alert** — sedimentation works **only on insoluble** solids: stir salt into water and it **dissolves**, so it will **never** settle, however long you wait.
- **Everyday cases** — tea pan (Fig. 9.9), an overnight clay *matka* of water (grit settles), washing rice (pour off the water, keep the grains).

---

## Gotchas

- The cloudy failure is **driven by slider speed**, not by a prop — to *show* it frozen, set `tiltAngle` + `cupContents: "cloudy"`; to let the learner *cause* it, leave them on S4 and let them yank the slider fast.
- `filterSteps` takes the **string** step ids `S1..S4` (not numbers). A multi-element array uses only the first id.
- The tool always calls `setStopAutoNext(true)`; `autoPlayDuration` will not auto-advance it.
```
