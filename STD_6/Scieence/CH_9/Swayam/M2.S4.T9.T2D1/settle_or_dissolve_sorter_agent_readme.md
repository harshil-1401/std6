# Soluble or Insoluble? Will it settle? — Agent README

**Tool:** `settle_or_dissolve_sorter` · **Component:** `SettleOrDissolveSorter` · **v1.0.0**
**Topic M2.S4.T9 — Soluble vs insoluble substances in water** (Class 6 Science · topic `M2.S4.T9` · tool `M2.S4.T9.T2D1`)

A tap-and-select tool that builds the **soluble / insoluble** distinction through a glass of water. Eight everyday substances — **salt, sand, tea leaves, sugar, chalk powder, lemon juice, chalk pieces, mud** — are dropped one at a time into a glass of water. For each, the student watches it fall and swirl, then **predicts** one of two outcomes: **"settles at the bottom"** (insoluble) or **"stays dissolved"** (soluble). The glass animates the real result — a soluble thing disappears and faintly tints the water, an insoluble thing clouds then settles as a band at the bottom. **Green tick** on correct; a **one-line hint** on wrong tells whether that substance dissolves in water. It is a **single guided flow** (no separate quiz mode): after the last substance the student lands on a **gamified summary scorecard** (score count-up, stars, confetti, a per-substance right/wrong recap, and *Start over*). **No drag-drop — only the two outcome buttons.**

> **Prod-safe icons:** this tool imports **no `lucide-react`** — all icons are inline SVGs, so it renders on every iframe-renderer version (an icon name can never be "not defined" at runtime).

---

## Quick reference

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `gradeLevel` | `6 \| 7 \| 8` | `6` | Tier preset. **6** = heavy game, story framing, big text, slowest settle, 70 confetti + 5 stars. 7 = moderate. 8 = light/formal. |
| `themeColor` | string | `#4A4DC9` | Accent hint. Internally uses the Singularity palette: header purple, water blue, sediment brown, CTAs orange `#FF7212`. |
| `showNavigation` | boolean | `true` | Back/Next between substances (Next gated on answering each card). |
| `autoPlayDuration` | number | `0` | Host hint only; tool sets `stopAutoNext(true)` because every card needs interaction. |
| `additionalProps` | object | see below | Substance set + hints. |

Prop signature is the standard framework one: `props`, `setStepDetails`, `stopAutoNext`, `setStopAutoNext`.

---

## The eight substances (answer key)

| Substance | Slug | Outcome | Soluble? |
|---|---|---|---|
| Salt | `salt` | Stays dissolved | ✅ soluble |
| Sugar | `sugar` | Stays dissolved | ✅ soluble |
| Lemon juice | `lemon_juice` | Stays dissolved | ✅ soluble (miscible) |
| Sand | `sand` | Settles at the bottom | ❌ insoluble |
| Tea leaves | `tea_leaves` | Settles at the bottom | ❌ insoluble |
| Chalk powder | `chalk_powder` | Settles at the bottom | ❌ insoluble |
| Chalk pieces | `chalk_pieces` | Settles at the bottom | ❌ insoluble |
| Mud | `mud` | Settles at the bottom | ❌ insoluble |

---

## `additionalProps` reference

| Key | Type | Default | Notes |
|---|---|---|---|
| `substances` | `(string \| object)[]` | the 8 above | Which cards appear and in what order. Use slugs from the library, a **subset** to shorten/focus the lesson, or full objects to add a new one: `{ slug, name, emoji, outcome: "settles"\|"dissolves", color, solutionTint, hint }`. |
| `showHints` | boolean | `true` | Show the one-line dissolve/insoluble hint on a wrong answer (and inline captions). |

> `outcome: "settles"` means **insoluble**; `outcome: "dissolves"` means **soluble**. That single field drives both the glass animation and the correct answer.

---

## What the flow contains

A **single guided flow** (no mode selector, no separate quiz):

1. **Per-substance cards** — for each of the 8 substances: it drops into the glass and swirls → student waits → taps **Settles at the bottom** or **Stays dissolved**. The glass reveals the real outcome; **green tick + confirmation** if correct, **one-line hint** (does it dissolve?) if wrong. Back/Next move between substances (Next unlocks once the current card is answered).
2. **Summary scorecard** — after the last substance: score count-up out of 8, 5 stars + confetti (at ≥60%), a per-substance right/wrong recap grid, tier encouragement, and a **Start over** button.

---

## Tool-call examples

### 1. Default full lesson (recommended)
```json
{
  "frontend_action": "show_interactive_tool",
  "title": "Soluble or Insoluble? Will it settle?",
  "data": {
    "toolName": "settle_or_dissolve_sorter",
    "parameters": { "gradeLevel": 6 }
  },
  "instructions_for_student": "Drop each substance into the glass of water and wait. Decide whether it settles at the bottom (insoluble) or stays dissolved (soluble)."
}
```

### 2. Short focused set (just the tricky soluble/insoluble contrast)
```json
{
  "toolName": "settle_or_dissolve_sorter",
  "parameters": {
    "additionalProps": { "substances": ["salt", "sand", "sugar", "chalk_powder"] }
  }
}
```

### 3. Add your own substance
```json
{
  "toolName": "settle_or_dissolve_sorter",
  "parameters": {
    "additionalProps": {
      "substances": [
        "salt", "sand",
        { "slug": "oil", "name": "Cooking oil", "emoji": "🫗", "outcome": "dissolves", "color": "#E0B84A", "solutionTint": "#FBF3D6", "hint": "Oil does not dissolve and does not settle — it floats, but for this sort it 'stays in the liquid' rather than settling at the bottom." }
      ]
    }
  }
}
```

---

## Decision tree for agents

```
Student is on soluble vs insoluble / "does it dissolve or settle?"
  │
  ├─ Teaching the distinction the first time
  │     → default call (all 8 substances)
  │
  ├─ Want a quick focused contrast (one soluble + one insoluble)
  │     → additionalProps.substances: ["salt","sand","sugar","chalk_powder"]
  │
  ├─ Following the filtration lesson (insoluble settles → can be filtered)
  │     → default call, then hand off to filter_muddy_water_simulator
  │
  └─ Revision / check understanding
        → default call (the end-of-flow scorecard shows how many they got right)
```

---

## Concepts reinforced (curriculum-accurate)

- A **soluble** substance **dissolves** in water — it spreads through and disappears, so it **stays dissolved** and does not settle (salt, sugar, lemon juice).
- An **insoluble** substance **does not dissolve** — the particles stay solid and, being heavier than water, **settle at the bottom** (sand, tea leaves, chalk, mud).
- "Stays dissolved" vs "settles at the bottom" is the everyday test that tells soluble from insoluble.
- This sets up **sedimentation / decantation / filtration**: only insoluble solids settle and can be filtered out; a dissolved solid stays in the water (you'd evaporate it instead).

---

## Gotchas

- The animation and the correct answer are both driven by one field, **`outcome`** (`"settles"` = insoluble, `"dissolves"` = soluble) — set it correctly on any custom substance.
- `substances` accepts **slugs** (from the library) or **full objects**; an unknown slug falls back to a neutral "insoluble" card, so prefer the known slugs or full objects.
- Tap only — the two outcome buttons. There is **no drag-and-drop** anywhere.
- The tool always calls `setStopAutoNext(true)`; `autoPlayDuration` will not auto-advance it.
- **Icons are inline SVG (no lucide-react)** — do not "fix" by adding a lucide import; that reintroduces the `X is not defined` prod error.
```
