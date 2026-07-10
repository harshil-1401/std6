# Cloud in a Bottle — Agent README

**Tool:** `cloud_in_a_bottle_simulator` · **Component:** `CloudInABottleSimulator` · **v1.0.0**
**Topic M5.S8.T17 — Dust particles help water vapour form clouds (cloud in a bottle)** (Class 6 Science · topic `M5.S8.T17` · tool `M5.S8.T17.T2D1`)

A tap-and-slide guided experiment for the role of **condensation nuclei** in cloud formation. In **Explore** the student sees a **closed bottle** holding a little warm water (so the air is full of invisible water vapour), **predicts** whether a clean bottle will make a cloud, then drags a **squeeze slider** to compress and **release** the air — first with **no dust**, then after **adding burnt-paper dust**. The physics is honest: releasing the squeeze lets the air **expand and cool**, but a visible **cloud appears only when dust is present** for the vapour to condense onto. Squeeze again and the cloud clears. A gamified **Quiz** mode follows the house flow (silent play → result popup → concept review). **No drag-drop — only taps, one squeeze slider, and a dust toggle.**

---

## Quick reference

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `gradeLevel` | `6 \| 7 \| 8` | `6` | Tier preset. **6** = heavy game, story framing, big text, 70 confetti + 5 stars. 7 = moderate. 8 = light/formal. |
| `themeColor` | string | `#4A4DC9` | Accent hint. Internally the tool uses the Singularity palette: header purple, **CLOUD!** tag purple, CTAs orange `#FF7212`. |
| `initialMode` | `learn \| practice` | `learn` | Opening mode. |
| `enabledModes` | array | `["learn","practice"]` | Toggle shown as **Explore / Quiz**. |
| `showModeSelector` | boolean | `true` | Show the Explore/Quiz header toggle. |
| `showNavigation` | boolean | `true` | Back/Next in Explore. Auto-hidden when `filterSteps` freezes one screen. |
| `filterSteps` | `string[]` | `[]` | Freeze Explore on ONE screen (hides nav). Single-element `["S1".."S5"]`. See below. |
| `autoPlayDuration` | number | `0` | Host hint only; tool sets `stopAutoNext(true)` because every screen needs interaction. |
| `additionalProps` | object | see below | Scene state + copy + re-theming. |

Prop signature is the standard framework one: `props`, `setStepDetails`, `stopAutoNext`, `setStopAutoNext`.

---

## `filterSteps` — freeze on one Explore screen

Pass a single-element array to embed exactly one moment (nav hidden):

| Value | Screen | Shows |
|---|---|---|
| `["S1"]` | The closed bottle | Warm water + invisible vapour; the goal stated. |
| `["S2"]` | Predict | Tap-select: will the clean bottle make a cloud? |
| `["S3"]` | Squeeze with NO dust | The squeeze slider on a clean bottle → release stays clear. |
| `["S4"]` | Add dust & squeeze | The dust toggle + squeeze slider → release makes a cloud. |
| `["S5"]` | Wrap (side-by-side) | No-dust vs with-dust bottles and the rule + a "Take the Quiz" CTA. |

Empty `[]` = the full free-running 5-screen flow with Back/Next.

---

## `additionalProps` reference

| Key | Type | Default | Notes |
|---|---|---|---|
| `dustPresent` | boolean | `false` | Whether burnt-paper dust is in the bottle on mount. `true` lets a learner start already able to make a cloud (use with `squeeze: 0` for a ready-made cloud, or pair with S4). |
| `squeeze` | number `0..1` | `0` | Initial squeeze (0 = released/cool/expanded, 1 = fully squeezed/warm). The cloud (with dust) appears as you release toward 0. For a frozen mid-squeeze illustration. |
| `showHints` | boolean | `true` | Show the small inline coaching hints under the bottle/slider. |
| `feedbackMessage` | string | "Warm water at the bottom → lots of invisible vapour in the air above it." | One-line coaching under the bottle (S1). |
| `predictionPrompt` | string | "With no dust inside, will squeezing and releasing make a cloud?" | Question on the Predict screen (S2). |
| `dustLabel` | string | `"burnt-paper dust"` | Re-theme the nuclei source (e.g. `"match smoke"`, `"incense smoke"`, `"chalk dust"`). |
| `hazeColor` | `#hex` | `#EAF1F6` | Colour of the condensation haze (the cloud) that forms. |

> The **cloud is emergent**, not a fixed answer: the tool recomputes the haze from the current `squeeze` and `dust`. Release the squeeze (cool the air) **with** dust → a cloud blooms; release **without** dust → it stays clear; squeeze back → it clears. So you don't configure "cloud" — the learner causes it by releasing the squeeze with dust present.

---

## What the modes contain

**Explore (learn)** — 5 screens:
1. **The closed bottle** — warm water + invisible vapour; goal set (make a cloud).
2. **Predict** — tap: will a clean bottle make a cloud on release?
3. **Squeeze with NO dust** — drag the squeeze slider; release stays **clear** (cooling alone isn't enough).
4. **Add dust & squeeze** — tap to add dust, squeeze and release → a **cloud** forms; squeeze clears it.
5. **Wrap** — no-dust vs with-dust side by side, the big-idea rule, then *Take the Quiz*.

**Quiz (practice)** — 4 randomized questions drawn from: why the cloud needs dust (nuclei), squeeze-vs-release timing, the clean-bottle (no dust) outcome, how real clouds form, and the role of the warm water → result popup (score count-up, stars, confetti) → wrong-answer review → play again.

---

## Tool-call examples

### 1. Default full lesson (recommended)
```json
{
  "frontend_action": "show_interactive_tool",
  "title": "Make a Cloud in a Bottle",
  "data": {
    "toolName": "cloud_in_a_bottle_simulator",
    "parameters": {
      "gradeLevel": 6,
      "initialMode": "learn"
    }
  },
  "instructions_for_student": "Squeeze the bottle hard and release it — first with no dust, then with burnt-paper dust added. Watch when the cloud appears."
}
```

### 2. Embed only the "add dust & squeeze" moment
```json
{
  "toolName": "cloud_in_a_bottle_simulator",
  "parameters": {
    "showModeSelector": false,
    "filterSteps": ["S4"],
    "additionalProps": { "feedbackMessage": "Add the dust, then squeeze and release — watch the cloud puff in." }
  }
}
```

### 3. Open on the clean-bottle (no dust) failure to set up the contrast
```json
{
  "toolName": "cloud_in_a_bottle_simulator",
  "parameters": {
    "filterSteps": ["S3"],
    "additionalProps": { "dustPresent": false, "feedbackMessage": "Squeeze and release this clean bottle — does a cloud form?" }
  }
}
```

### 4. Present a frozen ready-made cloud (dust in, released)
```json
{
  "toolName": "cloud_in_a_bottle_simulator",
  "parameters": {
    "filterSteps": ["S4"],
    "additionalProps": { "dustPresent": true, "squeeze": 0 }
  }
}
```

### 5. Re-theme the nuclei source to match smoke
```json
{
  "toolName": "cloud_in_a_bottle_simulator",
  "parameters": {
    "additionalProps": {
      "dustLabel": "match smoke",
      "predictionPrompt": "With clean air inside, will squeezing and releasing make a cloud?"
    }
  }
}
```

### 6. Quiz only (revision)
```json
{
  "toolName": "cloud_in_a_bottle_simulator",
  "parameters": { "initialMode": "practice", "enabledModes": ["practice"], "showModeSelector": false }
}
```

---

## Decision tree for agents

```
Student is on "how clouds form" / "dust helps vapour condense" / cloud-in-a-bottle
  │
  ├─ Teaching the WHOLE idea the first time
  │     → default call (Explore, no filterSteps)
  │
  ├─ Want the "cooling alone isn't enough" beat (clean bottle)
  │     → filterSteps: ["S3"]
  │
  ├─ Want the payoff (dust → cloud)
  │     → filterSteps: ["S4"]  (optionally dustPresent:true, squeeze:0 for a ready cloud)
  │
  ├─ Connecting to REAL clouds in the sky
  │     → use the Wrap screen (default flow) or the q_real_clouds quiz question
  │
  ├─ Different nuclei source (match smoke / incense / chalk dust)
  │     → re-theme via dustLabel
  │
  └─ Revision / check understanding
        → initialMode: "practice"
```

---

## Concepts reinforced (curriculum-accurate)

- **Water vapour** from the warm water fills the closed air space (evaporation).
- **Condensation** = vapour turning back into tiny liquid droplets. It needs the air to **cool** — which happens when the squeezed air is **released** and expands.
- **Condensation nuclei** = tiny particles (here **burnt-paper dust**) that the vapour condenses **onto**. Without them, cooled vapour stays mostly invisible; with them, a visible cloud forms.
- **Squeeze vs release** — squeezing compresses + warms the air (clear); releasing expands + cools it (cloud, if dust is present). The dust does **not** become the cloud; it is the surface the water droplets build on.
- **Real clouds** — warm air carrying vapour rises, cools, and condenses onto dust/smoke/salt specks high in the sky; billions of tiny droplets together make a cloud.

---

## Gotchas

- The cloud is **driven by the squeeze slider + dust toggle**, not by a static prop — to *show* a cloud frozen, set `dustPresent: true` + `squeeze: 0`; to let the learner *cause* it, leave them on S4 and let them add dust and release.
- A clean bottle (no dust) will **not** make a real cloud however much you release — that contrast is the whole point; don't treat the faint shimmer as the cloud.
- `filterSteps` takes the **string** step ids `S1..S5` (not numbers). A multi-element array uses only the first id.
- The tool always calls `setStopAutoNext(true)`; `autoPlayDuration` will not auto-advance it.
