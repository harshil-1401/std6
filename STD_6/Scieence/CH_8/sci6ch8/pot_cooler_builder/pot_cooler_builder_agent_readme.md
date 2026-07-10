# Build & Test a Pot-in-Pot Cooler — Agent README

**Tool:** `pot_cooler_builder` · **Component:** `PotCoolerBuilder` · **v1.0.0**
**Topic M4.S7.T15 — Building a pot-in-pot (matka) cooler that needs no electricity** (Class 6 Science · Ch 8 · topic `M4.S7.T15` · tool `M4.S7.T15.2D1` · objective `O34`)

A **tap-to-build** simulation of building and testing the traditional no-electricity pot-in-pot cooler. The student assembles a side **cut-away** cooler in **six ordered tap steps** (large pot → base sand → small pot full of produce → fill sand → pour water → wet jute cover), **predicts** the inside temperature trend, then presses **Play** to run ~5 simulated hours and watch an inside **thermometer fall** as evaporation removes heat. Faint vapour wisps rise from the damp wall; the inside tints cool blue. The moist sand and wet cover cool the inside by **~9°C**, showing that **evaporation does the cooling** and the cooler needs no electricity. Ends with a "how it works" summary linking to the surahi. **Single guided flow** (no quiz mode), four stages: Build → Predict → Observe → Summary. **No drag-and-drop — tap-to-build plus a time slider only.**

> **Prod-safe icons:** this tool imports **no `lucide-react`** — all icons are inline SVGs (thermometer, snowflake, droplets, play/pause…), so it renders on every iframe-renderer version (an icon name can never be "not defined" at runtime).

---

## The flow (4 stages, single linear path)

1. **Build** — tap 6 ordered steps to assemble the cut-away cooler (the small pot fills with fruits & vegetables; water is poured into the sand at step 5). A numbered checklist tracks progress; **Undo** steps back. The next step pulses. Faithful to the textbook build order.
2. **Predict** — inside gets **cooler** / no change / warmer (the correct answer is *cooler*).
3. **Observe** — Play / Pause / Reset + a time-scrub slider over ~5 hours. The thermometer falls (mercury drops + turns blue, inside tints cool); vapour wisps rise from the damp wall.
4. **What I learned** — summary scorecard: the temperature drop (~9°C), stars, confetti, a right/wrong prediction recap, and the **seep → evaporate → cool** explanation linking to the surahi. **Build again** resets.

---

## The 6 build steps (faithful to the grounding quote)

| # | Step | Reveals |
|---|---|---|
| 1 | Place the large pot | The outer earthen pot (cut-away) |
| 2 | Add a layer of sand | The base sand the small pot rests on |
| 3 | Set the small pot inside | The small inner pot + the inside thermometer |
| 4 | Fill the gap with sand | Sand packed in the ring around the small pot |
| 5 | Pour water into the sand | The sand becoming damp — the water that evaporates |
| 6 | Add the wet jute cover | The damp jute lid over the small pot's mouth |

---

## The physics (verified, single source of truth)

Every reading is computed from one closed-form equation — **no hardcoded curve tables**.

```
m         = 0.6·sandWet + 0.4·coverWet          // effective moisture, 0..1
DTMAX_EFF = 14 · (1 − 0.30) = 9.8°C             // humidity-scaled max evaporative cooling
T_floor   = 32 − (2 + 9.8·m)                    // moisture-dependent floor
T(t,m)    = T_floor + (32 − T_floor)·e^(−t/1.5) // exponential approach, clamped [T_floor, 32]
```

| Moisture | Floor | After ~5 h | Drop |
|---|---|---|---|
| Full moist (m=1) | 20.2°C | ~20.6°C | **~11°C** |
| Half moist | ~25°C | ~25.3°C | ~7°C |
| **Dry (m=0)** | 30.0°C | ~30.1°C | **~2°C** (small, real — not flat) |
| Cover-only | ~28°C | ~26.3°C | ~6°C (cover helps; sand matters most) |

- Starts at **32°C** (a dry hot day). `t=0` always reads 32.0°C regardless of moisture, so the prediction is made before any change shows.
- **Monotonic** decreasing in time and moisture, clamped to the floor → a "warmer" prediction can never come true.
- **Real-world caveat (not a UI knob):** evaporative coolers work best in **dry heat**; in humid air a real cooler cools less. The model bakes in a dry-day humidity (RH 0.30). Mention this if a student asks why a matka "doesn't work in the monsoon."

---

## Quick reference

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `gradeLevel` | `6 \| 7 \| 8` | `6` | Tier preset. **6** = heavy game, story framing, big text, slowest play, 70 confetti + 5 stars. 7 = moderate. 8 = light/formal/faster. |
| `themeColor` | string | `#4A4DC9` | Accent hint. Internally uses the Singularity palette + clay/sand/water domain colours; CTAs orange `#FF7212`. |
| `additionalProps.showHints` | boolean | `true` | Show the evaporative-cooling verdict on the Observe stage. When false, Observe shows only the bare reading. |

Prop signature is the standard framework one: `props`, `setStepDetails`, `stopAutoNext`, `setStopAutoNext`.

---

## Tool-call examples

### 1. Default full activity (recommended)
```json
{
  "frontend_action": "show_interactive_tool",
  "title": "Build & Test a Pot-in-Pot Cooler",
  "data": {
    "toolName": "pot_cooler_builder",
    "parameters": { "gradeLevel": 6 }
  },
  "instructions_for_student": "Build the cooler step by step (pour water into the sand), predict what happens to the inside temperature, then run time and watch the thermometer."
}
```

### 2. Older grade, lighter gamification & faster play
```json
{
  "toolName": "pot_cooler_builder",
  "parameters": { "gradeLevel": 8 }
}
```

### 3. Hide the coaching captions (assessment-style)
```json
{
  "toolName": "pot_cooler_builder",
  "parameters": { "additionalProps": { "showHints": false } }
}
```

---

## Decision tree for agents

```
Student is on evaporative cooling / earthen pot / matka / surahi / "how does a pot-in-pot cooler work"
  │
  ├─ Teaching how to build the cooler + WHY it cools (the main activity)
  │     → default call
  │
  ├─ Want to emphasise WHY it cools (evaporation does the cooling)
  │     → default call; the Observe verdict and the summary both name the
  │       seep → evaporate → cool chain explicitly
  │
  ├─ After the earthen-pot / surahi explanation, as the hands-on apply step
  │     → default call (follows naturally from the matka cooling topic)
  │
  └─ Quick check without coaching captions
        → additionalProps.showHints: false
```

---

## Concepts reinforced (curriculum-accurate)

- A pot-in-pot cooler is a **smaller earthen pot inside a larger one**, with **moist sand** between them and a **wet cover** on top.
- Water in the moist sand **seeps** to the pot surfaces and **evaporates** into the air.
- **Evaporation takes heat away** (a cooling effect), so the **inside gets cooler** and keeps fruits/vegetables fresh.
- It works with **no electricity** — the same principle as an earthen **matka** and a **surahi**.
- **Dry sand → almost no cooling**: with nothing to evaporate, there is no cooling effect. The sand must be kept moist by adding water regularly.

---

## Gotchas

- **Tap-to-build + one time slider, not drag-and-drop.** Build steps are tapped in order (Undo steps back); the Observe stage has a native range slider that scrubs simulated time. The sand/cover are built moist (water poured at step 5) — there is no moisture slider. No card drag-drop anywhere.
- The **dry case is intentionally a small ~2°C drift, not flat 0°C** — bare porous terracotta wicks a little ambient moisture, so a real matka is never exactly at room temperature. The teaching contrast (≈2°C dry vs ≈12°C moist) is still unmistakable. Don't "fix" the dry case to be perfectly flat.
- The cooler **cannot get warmer** and the inside **never falls below its moisture floor** — these are guaranteed by the clamped monotonic model, so a "warmer" prediction is always wrong.
- The humidity assumption (dry hot day, RH 0.30) is **hardcoded** — there is no humidity slider. If asked about humid weather, explain it as a real-world caveat (covered above), not a bug.
- Single flow — there is **no quiz/practice mode** and no mode selector; the gamified payoff is the end-of-flow summary.
- The tool always calls `setStopAutoNext(true)`; `autoPlayDuration` will not auto-advance it.
- **Icons are inline SVG (no lucide-react)** — do not "fix" by adding a lucide import; that reintroduces the `X is not defined` prod error.
```
