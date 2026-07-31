# SPEC — SennSuSenn (เส้นสู้เส้น)

**Version:** 1.0 · **Date:** 2026-07-29 · **Owner:** Ham
**One-liner:** Two people draw a creature on one phone. The drawings are dropped into a physics arena and shove each other for 15 seconds. Whoever holds the center longest wins.

**Name:** เส้นสู้เส้น — "line fights line." Repo slug: `sennsusenn`.

---

## 1. Concept

- Player 1 draws a creature with their finger. Hands the phone over. Player 2 draws theirs.
- Both drawings become physics bodies, normalized to the same size and mass.
- They are dropped onto a flat platform with a scoring zone in the center.
- A constant inward force pulls both toward the center. **Neither player has any control during the match.**
- Score accumulates every frame your creature's center is inside the zone. 15 seconds. Higher score wins.
- Falling off the platform costs you 1 second of respawn time — not the match.
- Twice per match a telegraphed arena event fires (wind, tilt, bounce pad). It hits both creatures equally.
- Result screen: scores, rematch, share 15s clip.

**The feeling we are building for:** "WTF, how did *that* win?" — surprise with a visible cause. Chaos the players can see coming, outcomes they can't predict.

**What this is not:** not a pet-raiser, not a fighting game with invented damage numbers, not a skill game with controls. The drawing is the entire input.

---

## 2. Decision Log

All 19 decisions settled in the scoping session. Do not change these without asking Ham.

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Session model | Single session. Draw → fight immediately. No persistence, no pet-raising | Pet-raising is a retention mechanic that only pays off on repeat visits. A link shared to friends realistically gets 1–3 sessions. (opinion) Deferred to backlog. |
| D2 | Relationship to AirToon | New repo. AirToon is reference code only | AirToon is a toy optimized for "any scribble looks cute." This is a game that needs drawings to be legible as stats and fair. Those pressures conflict. (opinion) |
| D3 | Competition type | Compete via physics, not invented combat | A damage formula the player can't see reads as random. Physics outcomes are self-explanatory. (opinion) |
| D4 | Format | King of the Hill, 15s | Scored highest across WTF / build ease / clip / tech risk / fairness. Fixes sumo's stalemate failure mode: passivity scores zero. |
| D5 | Architecture | Frozen seam: creature module ↔ arena module | Contract is `{ body, traits }`. Arena never touches stroke data. This is what makes future modes cheap instead of a rewrite. **Hard constraint.** |
| D6 | Fairness | Normalize every creature to identical area and mass | Without it the winning strategy is "draw the biggest blob" and shape stops mattering. |
| D7 | Player control | None during match. Constant inward force only | Shape becomes 100% of the skill. Makes it a spectator game, which is what makes it clippable. Steering deferred (see §9). |
| D8 | Physics body | Concave via poly-decomp, with sanitizer + convex hull fallback | Convex hull can only roll/slide/topple — three verbs. Concave gives hooks, spikes, scoops. Fallback means it can never break. |
| D9 | Chaos source | Arena events in v1. Hidden trait reveal deferred | Shipping both at once makes it impossible to tell which is producing fun vs. which is producing "this is rigged." (opinion) |
| D10 | Player model | Hot-seat, one phone | Zero networking. The reaction needs two people at one screen. Async is P5. |
| D11 | Input | **Touch only. No camera, ever.** | Every other locked decision argues against the camera: no controls during match means it goes dark after 10s; air-strokes are shakier so hulls are less controllable; hot-seat handover is worse with gestures. Air-drawing belongs to AirToon. |
| D12 | Trait extraction | 3 emergent traits from geometry. No labels shown | Aspect ratio *is* stability. Perimeter-to-area *is* grip. Hull *is* center of mass. Nothing invented, nothing to balance. |
| D13 | Win / tie | Continuous fractional scoring. Live score shown during match | Exact ties are astronomically unlikely at 60fps float accumulation. (fact) Tie screen exists as a guard, sudden death does not. |
| D14 | Clip | MediaRecorder 15s → Web Share. 1hr timebox → screenshot fallback | The clip is the only growth mechanic left after cutting async/realtime from v1. iOS Safari MediaRecorder is the known risk. (fact) |
| D15 | Visual style | Raw strokes. No smoothing, no glow | The ugliness is the joke. Also: the player must see the exact shape physics is acting on, or losses feel arbitrary. |
| D16 | Orientation | Portrait only | Hot-seat handover is portrait. Vertical clips get watched. Narrow arena = faster contact, suits 15s. |
| D17 | Stack | 4 files, vanilla JS, Matter.js + poly-decomp via CDN, GitHub Pages | Multi-file is a deliberate departure from Ham's single-file norm — it physically enforces D5. No bundler, no npm, no build step. |
| D18 | Kill criterion | Fun gate at end of P2 (see §8) | The tech risk here is near zero. The real risk is that watching two blobs is dull. |
| D19 | Two-phone mode | Designed in v1, built in P5 | Not a mode in the design sense — same rules, same physics, only the *source* of creature 2 differs. D5's seam makes it near-free. Creature object must be serializable from day one. |

**Prior art note (fact):** Draw Joust! (Voodoo, 2020) already ships "draw a thing, physics decides the fight," with browser versions. Draw Climber and Sumotori Dreams cover adjacent ground. The unoccupied gap is the hot-seat moment — two humans, one phone, no meta-progression, 15 seconds, rematch. Build for that, not for novelty of the draw-to-physics trick.

---

## 3. Arena Spec

Logical canvas: **720 × 1280**, scaled to fit viewport, portrait locked.

| Element | Value |
|---|---|
| Platform | Static rectangle, x 40→680 (width 640), top surface at y=900, thickness 40 |
| Hill zone | x 270→450 (width 180), centered at x=360, rendered as a soft band on the platform |
| Gravity | Matter default, y = 1.0 |
| Inward force | Applied every tick toward x=360. `F = mass * 0.0006`, horizontal only. Scaled by mass so both creatures accelerate identically regardless of shape |
| Spawn | P1 at x=180 y=700, P2 at x=540 y=620, zero velocity |
| Fall threshold | y > 1200 |
| Respawn | 1000ms delay, then reappear at x=80 (fell left) or x=640 (fell right), y=700, zero velocity |
| Match length | 15.0s, starting after a 3s countdown |

Side view. Gravity pulls down, inward force pushes horizontally. "Toppling" and "getting shoved off the edge" both work naturally in this projection.

---

## 4. Creature Spec

### Draw phase
- Draw box: 560 × 560, centered, visible border.
- Multi-stroke. Max **5 strokes**, max **400 points total** after decimation.
- Undo last stroke, clear all. No color picker — P1 is assigned red, P2 blue.
- Confirm button. Disabled until at least one stroke exists with ≥3 points.

### Conversion pipeline (`creature.js`)
1. **Decimate** — Ramer–Douglas–Peucker, epsilon tuned to land under 400 total points.
2. **Sanitize** — reject self-intersecting paths, drop near-zero-area slivers, cap vertex count at **24** per resulting polygon.
3. **Outline** — union of strokes → outline path. Attempt concave decomposition via poly-decomp.
4. **Fallback** — if decomposition fails, produces zero parts, or yields any degenerate polygon: silently fall back to convex hull for that creature. Never surface an error to the player.
5. **Normalize size** — scale uniformly so hull area = **9000 px²**, preserving aspect ratio.
6. **Normalize mass** — `Body.setMass(body, 1.0)` after creation.
7. Return `{ body, traits, strokes }`.

### Traits (emergent, never displayed)
| Trait | Derived from | Effect |
|---|---|---|
| Stability | Bounding box aspect ratio (w/h) | Emerges naturally — wide-and-low resists toppling, tall-and-thin falls over |
| Grip | Isoperimetric ratio `perimeter² / (4π · area)`, 1.0 = perfect circle | Sets friction: `clamp(0.3 + 0.5 * (ratio - 1), 0.3, 0.9)`. Spiky shapes catch and snag |
| Topple risk | Center of mass height from hull | Automatic from Matter.js body construction |

Fixed for all creatures: `restitution = 0.2`, `frictionAir = 0.01`.

**No named trait labels. No stat display.** Players learn by watching. This is D12.

### Rendering
Render the **original strokes**, not the physics hull. Transform stroke points by the body's position and angle each frame. Players see their starfish; physics sees the decomposed polygons. This looks dramatically better than rendering the hull and nobody notices the difference. (opinion)

---

## 5. Scoring

- Every physics tick, for each creature: if `body.position.x` is within the hill zone **and** `body.position.y < 900` (i.e. on the platform, not fallen), add `1` to that creature's raw score.
- Display as seconds, one decimal: `raw / 60`.
- Both scores shown live during the match, ticking up. This is what gives the final seconds visible tension and makes the clip readable without an end card.
- Higher raw score at 15.0s wins. Exact equality → tie screen (guard only, expected to be vanishingly rare).

---

## 6. Chaos Events

Two events fire per match, drawn randomly without replacement from the three below. Fire times: **t = 5.0s** and **t = 11.0s**. Telegraphed with a visible warning **1.0s before** each.

| Event | Behaviour | Duration |
|---|---|---|
| Wind gust | Constant horizontal force, random direction, applied equally to both bodies | 1.5s |
| Platform tilt | Platform rotates to ±8° over 0.5s, holds, returns over 0.5s | 2.0s hold |
| Bounce pad | High-restitution pad appears at a random x on the platform | 3.0s |

**All events are symmetrical.** They hit both creatures. This is what keeps losing to chaos feeling like bad luck rather than bad design. (opinion)

Telegraph = a clear visual cue (icon + flash) at the location or edge where the event will occur.

---

## 7. Match Flow

```
Home  →  mode select: [Same phone] [Send challenge — disabled until P5]
      →  P1 draw screen
      →  "Pass the phone" handover screen
      →  P2 draw screen
      →  3s countdown
      →  15s match (live scores, 2 chaos events)
      →  Result: scores, winner, [Rematch] [Share clip]
```

Rematch returns to P1 draw screen. Creatures are never reused — you draw fresh every round. This is deliberate: the rematch lever is "draw better," and that only works if you actually draw again.

---

## 8. Kill Criterion

**Checked at the end of Phase 2, before building P3 or P4.**

Play **10 hot-seat matches with a real person.** If fewer than **3** produce a spontaneous laugh or "WTF" reaction — **stop. Do not build the remaining phases.**

Rationale: the technical risk here is near zero — two rigid bodies on a flat plane is trivial for Matter.js. (fact) The real risk is that watching for 15 seconds is dull. Chaos events amplify fun that already exists; they do not create it. P2 is the earliest point where the real game exists and the latest point where quitting is still cheap.

No performance gate. Adding one would be ceremony.

---

## 9. Creature Encoding (for P5)

**Must be designed into v1 even though the code ships in P5.** Retrofitting serialization onto an object full of Matter.js references is painful. (fact)

Format:
```
{ v: 1, c: 0|1, s: [[x,y,x,y,...], [...]] }
```
- Coordinates quantized to an 8-bit grid in a 256×256 draw-box space.
- Max 400 points total (decimate before encoding).
- Packed as bytes → `btoa` → URL-safe. Target under 1,100 characters.
- URL shape: `https://<user>.github.io/sennsusenn/?c=<payload>`
- On load with `?c=`, skip P1 draw, show "Challenge received," go straight to P2 draw.

`creature.js` must expose both `fromStrokes()` (v1) and `fromURL()` (P5). Same return contract.

---

## 10. Cost

**$0/month. No card on file. Nothing to expire.** (fact)

| Item | Cost |
|---|---|
| GitHub public repo + Pages hosting + bandwidth + SSL | $0 |
| Matter.js via CDN (MIT) | $0 |
| poly-decomp via CDN (MIT) | $0 |
| Domain — use `<user>.github.io/sennsusenn` | $0 |
| Backend / database / API keys / analytics | none exist |
| Video hosting | none — clip goes to the OS share sheet, never uploads |

**Prohibited without Ham's approval:** custom domain (~$12/yr), any hosted leaderboard (needs Supabase — free tier, but it introduces an account and a dependency).

---

## 11. v1.1 Backlog — Explicitly Deferred

Do not build any of these in v1. Listed so they don't creep in.

1. **Async challenge link** — P5 of this build, first thing after the kill gate passes.
2. **Steer mode toggle** — tap left/right to nudge. ~25 lines. **Trigger: only if 10 matches test flat and passive.** Warning: once you can steer, bad drawings get rescued by thumbs and the drawing becomes decoration.
3. **Hidden trait reveal** — named traits (HEAVY / SPINNER / BOUNCY) shown at match start. Add only after watching 10 real matches with arena events.
4. **Sudden death** on tie.
5. **Creature persistence** — save your best creature to localStorage.
6. **More chaos events** — ice patch, gravity flip, shrinking platform.
7. **Best-of-3 series.**
8. **Sound.**
9. **Leaderboard** — requires backend. Violates §10 as written.
10. **Realtime two-phone play** — lobby, sync, and physics determinism across devices. Genuine trap. (fact)
11. **Air-drawing input** — belongs to AirToon. Not this project.

---

## 12. Success Criteria for v1

- Two people can play a complete match on one phone with zero explanation.
- A creature drawn as a spiky shape visibly behaves differently from one drawn as a wide blob.
- Match length is exactly 15s, every time.
- Runs at 60fps on Ham's phone with two concave bodies.
- Total own JS under 40KB.
- Deployed at a public URL that a friend can open and play immediately.
