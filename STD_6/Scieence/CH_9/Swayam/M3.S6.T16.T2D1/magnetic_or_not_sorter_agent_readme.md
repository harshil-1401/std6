# Magnetic or Non-Magnetic? — Agent README

**Tool:** `magnetic_or_not_sorter` · **Component:** `MagneticOrNotSorter` · **v1.0.0**
**Topic M3.S6.T16 — Magnetic vs non-magnetic materials** (Class 6 Science · topic `M3.S6.T16` · tool `M3.S6.T16.T2D1`)

A **tap-to-sort** tool that builds the **magnetic / non-magnetic** distinction. **Twelve** everyday object cards appear one at a time, each resting on a table. For each, the student taps one of two bins: **"Sticks to magnet"** or **"Does not stick"**. A **red horseshoe magnet** then swoops down: magnetic objects (iron, steel, cobalt) **lift off the table and stick** to the poles with attraction field lines; non-magnetic objects stay put with a **"no pull"** tag. **Green tick** on correct; a **one-line metal hint** on wrong. It is a **single guided flow** (no separate quiz mode): after the last object the student lands on a **gamified summary scorecard** (score count-up, stars, confetti, a two-column magnetic/non-magnetic recap, and *Start over*). **No drag-drop — only the two bin buttons.**

> **Prod-safe icons:** this tool imports **no `lucide-react`** — all icons are inline SVGs (including the horseshoe-magnet glyph), so it renders on every iframe-renderer version (an icon name can never be "not defined" at runtime).

---

## The twelve objects (answer key)

| Object | Slug | Material | Sticks? |
|---|---|---|---|
| Iron nail | `iron_nail` | Iron | ✅ magnetic |
| Steel safety pin | `steel_pin` | Steel | ✅ magnetic |
| Iron key | `iron_key` | Iron | ✅ magnetic |
| Cobalt figurine | `cobalt_figure` | Cobalt | ✅ magnetic |
| Aluminium foil | `aluminium_foil` | Aluminium | ❌ non-magnetic |
| Copper coin | `copper_coin` | Copper | ❌ non-magnetic |
| Plastic ruler | `plastic_ruler` | Plastic | ❌ non-magnetic |
| Pencil eraser | `eraser` | Rubber | ❌ non-magnetic |
| Rubber band | `rubber_band` | Rubber | ❌ non-magnetic |
| Nickel coin | `nickel_coin` | Cupro-nickel | ❌ non-magnetic |
| Wooden block | `wooden_block` | Wood | ❌ non-magnetic |
| Gold ring | `gold_ring` | Gold | ❌ non-magnetic |

**Rule:** only **iron, steel and cobalt** stick. Other metals (aluminium, copper, gold) are non-magnetic; non-metals (plastic, rubber, wood) never are. Note the two traps: the **"nickel" coin** is really cupro-nickel (copper+nickel), not pure nickel, so it does **not** stick; **gold** is a metal but non-magnetic.

---

## Quick reference

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `gradeLevel` | `6 \| 7 \| 8` | `6` | Tier preset. **6** = heavy game, story framing, big text, slowest magnet swoop, 70 confetti + 5 stars. 7 = moderate. 8 = light/formal. |
| `themeColor` | string | `#4A4DC9` | Accent hint. Internally uses the Singularity palette: header purple, red horseshoe magnet, CTAs orange `#FF7212`. |
| `showNavigation` | boolean | `true` | Back/Next between objects (Next gated on answering each card). |
| `additionalProps` | object | see below | Object set + hints. |

Prop signature is the standard framework one: `props`, `setStepDetails`, `stopAutoNext`, `setStopAutoNext`.

---

## `additionalProps` reference

| Key | Type | Default | Notes |
|---|---|---|---|
| `objects` | `(string \| object)[]` | the 12 above | Which cards appear and in what order. Use slugs from the library, a **subset** to shorten/focus the lesson, or full objects to add a new one: `{ slug, name, emoji, magnetic: true\|false, material, hint }`. |
| `showHints` | boolean | `true` | Show the one-line metal hint on a wrong answer (and inline captions). |

> `magnetic: true` means it sticks to the magnet (iron/steel/cobalt). That single field drives both the swoop animation (lift vs no-pull) and the correct answer.

---

## What the flow contains

A **single guided flow** (no mode selector, no separate quiz):

1. **Per-object cards** — for each of the 12 objects: tap **Sticks to magnet** or **Does not stick** → the magnet swoops down to test it (magnetic objects lift and stick with field lines; non-magnetic stay with a "no pull" tag). **Green tick + confirmation** if correct, **one-line metal hint** if wrong. Back/Next move between objects (Next unlocks once answered).
2. **Summary scorecard** — after the last object: score count-up out of 12, 5 stars + confetti (at ≥60%), a **two-column magnetic / non-magnetic recap** with per-object right/wrong marks, the iron-steel-cobalt rule, and a **Start over** button.

---

## Tool-call examples

### 1. Default full lesson (recommended)
```json
{
  "frontend_action": "show_interactive_tool",
  "title": "Magnetic or Non-Magnetic?",
  "data": {
    "toolName": "magnetic_or_not_sorter",
    "parameters": { "gradeLevel": 6 }
  },
  "instructions_for_student": "For each object, decide whether it sticks to the magnet or not, then watch the magnet come down to test it."
}
```

### 2. Short focused set (just the metal traps)
```json
{
  "toolName": "magnetic_or_not_sorter",
  "parameters": {
    "additionalProps": { "objects": ["iron_nail", "aluminium_foil", "copper_coin", "nickel_coin", "gold_ring", "cobalt_figure"] }
  }
}
```

### 3. Hide hints (assessment-style)
```json
{
  "toolName": "magnetic_or_not_sorter",
  "parameters": { "additionalProps": { "showHints": false } }
}
```

### 4. Add your own object
```json
{
  "toolName": "magnetic_or_not_sorter",
  "parameters": {
    "additionalProps": {
      "objects": [
        "iron_nail", "copper_coin",
        { "slug": "scissors", "name": "Steel scissors", "emoji": "✂️", "magnetic": true, "material": "Steel", "hint": "Scissors are steel (mostly iron), so they stick to a magnet." }
      ]
    }
  }
}
```

---

## Decision tree for agents

```
Student is on magnets / "which materials are magnetic?" / sorting by magnet
  │
  ├─ Teaching the magnetic/non-magnetic distinction the first time
  │     → default call (all 12 objects)
  │
  ├─ Want to focus on the misleading metals (aluminium, copper, gold, "nickel")
  │     → additionalProps.objects: ["iron_nail","aluminium_foil","copper_coin","nickel_coin","gold_ring","cobalt_figure"]
  │
  ├─ Leading into separating iron filings from a mixture with a magnet
  │     → default call, then the separation-by-magnet activity
  │
  └─ Quick check without coaching
        → additionalProps.showHints: false
```

---

## Concepts reinforced (curriculum-accurate)

- Magnets attract only some materials: **iron, steel (mostly iron) and cobalt** are magnetic and stick.
- **Most metals are NOT magnetic** — aluminium, copper and gold are metals but a magnet has no pull on them.
- **Non-metals** (plastic, rubber, wood) are never magnetic.
- **Names can mislead:** a "nickel" coin is usually a copper-nickel alloy, not pure nickel, so it does not stick.
- Sticking to a magnet is a simple test that lets you **separate magnetic materials from a mixture** (links to picking iron filings out with a magnet).

---

## Gotchas

- The swoop animation and the correct answer are both driven by one field, **`magnetic`** (`true` = sticks). Set it correctly on any custom object.
- **Curriculum-accurate answer key:** the **nickel coin** and **gold ring** are **non-magnetic** here (real coins are cupro-nickel / steel-plated; rings are non-ferrous). Do not "correct" the nickel coin to magnetic.
- `objects` accepts **slugs** (from the library) or **full objects**; an unknown slug falls back to a neutral non-magnetic card, so prefer known slugs or full objects.
- Tap only — the two bin buttons. There is **no drag-and-drop** anywhere.
- Single flow — there is **no quiz/practice mode** and no mode selector; the gamified payoff is the end-of-flow summary.
- The tool always calls `setStopAutoNext(true)`; `autoPlayDuration` will not auto-advance it.
- **Icons are inline SVG (no lucide-react)** — do not "fix" by adding a lucide import; that reintroduces the `X is not defined` prod error.
```
