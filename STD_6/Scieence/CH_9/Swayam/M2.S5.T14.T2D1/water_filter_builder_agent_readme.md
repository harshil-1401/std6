# Build a Low-Cost Water Filter — Agent README

**Tool:** `water_filter_builder` · **Component:** `WaterFilterBuilder` · **v1.0.0**
**Topic M2.S5.T14 — Build a simple low-cost water filter** (Class 6 Science · topic `M2.S5.T14` · tool `M2.S5.T14.T2D1`)

A **tap-to-build** construction tool. An **upturned plastic bottle** (bottom cut off, neck pointing **down** into an output beaker) has **four empty layer slots**. A side palette holds **five** layer cards — **cotton plug, charcoal, fine sand, coarse sand, pebbles/gravel** — but only four slots, so **coarse sand is a distractor** the student must reject. The student **taps** cards to stack the filter from the **bottom (neck) upward**; tapping a placed layer removes it. With all four slots filled, **Pour pond water** animates muddy water trickling down through each layer into the beaker. The **correct order** gives **clear** output; any wrong order gives **cloudy** output with a one-line hint. Fix → re-pour until clear → a gamified summary explains why each layer goes where it does. **No drag-and-drop — tap to place** (house rule; robust on mobile).

> **Prod-safe icons:** this tool imports **no `lucide-react`** — all icons are inline SVGs, so it renders on every iframe-renderer version (an icon name can never be "not defined" at runtime).

---

## The correct stack

Because the bottle is **upturned**, water poured in the wide cut top meets the **coarsest** layer first and exits through the cotton last.

| Slot (bottom → top) | Layer | Job |
|---|---|---|
| 0 — bottom (at the neck) | **Cotton plug** | Holds the layers + clean water in so nothing washes straight out |
| 1 | **Charcoal** | Removes colour, smell and very fine impurities |
| 2 | **Fine sand** | Traps fine mud and small particles |
| 3 — top (at the mouth) | **Pebbles / gravel** | Catch the large floating leaves & debris first |

**Distractor card:** **Coarse sand** — plausible, but pebbles/gravel make the better top layer for big debris. Picking it (or mis-ordering) yields a cloudy pour + a hint.

---

## Quick reference

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `gradeLevel` | `6 \| 7 \| 8` | `6` | Tier preset. **6** = heavy game, story framing, big text, slowest pour, 70 confetti + stars. 7 = moderate. 8 = light/formal. |
| `themeColor` | string | `#4A4DC9` | Accent hint. Internally uses the Singularity palette: header purple, pond-water brown, CTAs orange `#FF7212`. |
| `additionalProps.showHints` | boolean | `true` | Show the one-line "what to fix" hint on a cloudy pour (and the inline build tips). |

Prop signature is the standard framework one: `props`, `setStepDetails`, `stopAutoNext`, `setStopAutoNext`.

---

## What the flow contains

A **single guided flow** (no mode selector, no separate quiz):

1. **Build** — tap the 5 palette cards to stack the upturned bottle bottom→top (4 slots; coarse sand is a trap). Tap a placed layer to remove it. The next empty slot pulses orange.
2. **Pour & test** — press **Pour pond water**; water trickles down through each layer into the beaker. Correct order → **clear**; wrong order → **cloudy** + a context-aware one-line hint (cotton must be at the neck / coarsest on top / you used the coarse-sand trap). Fix and re-pour.
3. **Why this works** — gamified summary: stars (3 for a first-try solve, 2 after retries), confetti, and a top→bottom recap explaining each layer's job. **Build again** resets.

---

## Tool-call examples

### 1. Default full activity (recommended)
```json
{
  "frontend_action": "show_interactive_tool",
  "title": "Build a Low-Cost Water Filter",
  "data": {
    "toolName": "water_filter_builder",
    "parameters": { "gradeLevel": 6 }
  },
  "instructions_for_student": "Tap the layer cards to stack your filter from the bottom up (cotton at the neck, pebbles on top), then pour the muddy pond water through. If it's cloudy, fix the order and try again."
}
```

### 2. Older grade, lighter gamification
```json
{
  "toolName": "water_filter_builder",
  "parameters": { "gradeLevel": 8 }
}
```

### 3. Hide the corrective hints (assessment-style)
```json
{
  "toolName": "water_filter_builder",
  "parameters": { "additionalProps": { "showHints": false } }
}
```

---

## Decision tree for agents

```
Student is on "build a water filter" / filter layers / cleaning muddy water
  │
  ├─ Teaching how to build the filter (layer order + why)
  │     → default call
  │
  ├─ After teaching filtration (residue/filtrate) and want a hands-on apply step
  │     → default call (follows naturally from filter_muddy_water_simulator)
  │
  └─ Quick check they can order the layers without coaching
        → additionalProps.showHints: false
```

---

## Concepts reinforced (curriculum-accurate)

- A simple water filter can be built cheaply from an **upturned cut-bottom bottle** and locally-available materials.
- **Layer order matters:** coarsest (pebbles/gravel) on top to catch big debris → fine sand to trap mud → charcoal to remove colour/smell → cotton plug at the bottom to hold it all in.
- The filter separates **insoluble** solids (mud, leaves, grit) from water; a **dissolved (soluble)** impurity still passes through — this cleans up, it does not remove dissolved salts.
- Every layer has a job; the wrong order lets particles straight through and the water stays cloudy.
- Everyday filter materials: **cotton, charcoal, sand and pebbles/gravel**.

---

## Gotchas

- The bottle is **upturned (neck down)** — slot 0 is the BOTTOM (at the neck), slot 3 is the TOP (at the mouth). Placement fills bottom→top, which matches how you'd actually pack the bottle.
- There are **5 cards for 4 slots** — **coarse sand is the distractor**. A build that uses it (or mis-orders the rest) pours cloudy.
- **Tap to place, not drag** — tapping a card fills the next empty slot; tapping a placed layer removes it. Do not expect HTML5 drag-and-drop.
- Single flow — there is **no quiz/practice mode** and no mode selector; the gamified payoff is the end-of-flow summary.
- The tool always calls `setStopAutoNext(true)`; `autoPlayDuration` will not auto-advance it.
- **Icons are inline SVG (no lucide-react)** — do not "fix" by adding a lucide import; that reintroduces the `X is not defined` prod error.
```
