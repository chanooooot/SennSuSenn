# AGENTS.md — SennSuSenn

Instructions for any coding agent (Codex, etc.) working in this repo.

## Project

SennSuSenn (เส้นสู้เส้น, "line fights line"). Mobile web game, portrait, touch only. Two people draw a creature each on one phone. Drawings become Matter.js physics bodies normalized to identical area (9000px²) and mass (1.0), dropped onto a platform. A constant inward force pulls both toward a center scoring zone. **No player input during the match.** 15 seconds. Highest time-in-zone wins.

**Source of truth:**
- `SPEC.md` — product spec + settled decision log (§2). Do not change decisions without asking Ham.
- `BUILD_PLAN.md` — phases P0–P5 with per-phase Verify checks, budgets, and a kill gate after P2.

## Rules

1. **Stack:** Vanilla JS only. No frameworks, no bundlers, no npm, no TypeScript, no build step. Matter.js + poly-decomp via CDN `<script>` tags.
2. **Repo files:** `index.html`, `creature.js`, `arena.js`, `main.js`, `README.md` only. Do not add others without approval.
3. **Zero cost:** no servers, no API keys, no external services, no analytics. Deploy: GitHub Pages. A solution requiring a backend is the wrong solution.
4. **No camera.** No MediaPipe, no getUserMedia, no hand tracking. Explicitly rejected in D11. Touch only.
5. **Module seam is a hard constraint (D5):** `creature.js` returns `{ body, traits, strokes }` and knows nothing about hills, scoring, or chaos. `arena.js` consumes it and never reads stroke data. Do not merge the files. Do not leak logic across the boundary.
6. **Creature object must stay serializable (D19)** to the URL format in SPEC §9, from Phase 1 onward, even though the encoder ships in P5.
7. **Follow phase order.** A phase is done only when its Verify check passes on Ham's real phone. **Stop at the kill gate after P2** until Ham confirms.
8. **Budgets binding:** 60fps with 2 concave bodies, <40KB own JS, ≤400 points/creature, ≤24 vertices/polygon, ≤5 strokes, <1,100 char payload, $0/month.
9. **Simplicity:** minimum code per phase. No speculative features, abstractions, or configs. Every changed line must trace to the current phase or explicit feedback.
10. **Surgical edits:** don't reformat or improve untouched code. State assumptions before each phase.

## Implement-exactly cheat sheet

**Canvas:** 720 × 1280 logical, scaled to viewport, portrait locked, landscape → rotate overlay.

**Arena:**
- Platform: static rect, x 40→680, top surface y=900, thickness 40
- Hill zone: x 270→450 (center x=360)
- Gravity: y = 1.0
- Inward force per tick toward x=360: `F = mass * 0.0003`, horizontal only
- Spawn: P1 x=180, P2 x=540, both y=700
- Fall: y > 1200 → remove → respawn after 1000ms at x=80 or x=640 (side fallen), y=700
- Match: 15.0s after a 3s countdown

**Creature pipeline:**
1. RDP decimate to ≤400 total points
2. Sanitize: reject self-intersections, drop near-zero-area slivers, cap 24 vertices/polygon
3. Try poly-decomp concave decomposition
4. On any failure/degenerate result → **silent** convex hull fallback (never show an error)
5. Scale uniformly to hull area = 9000px²
6. `Body.setMass(body, 1.0)`
7. Friction = `clamp(0.3 + 0.5 * (isoperimetricRatio - 1), 0.3, 0.9)` where ratio = `perimeter² / (4π · area)`
8. Fixed: `restitution = 0.2`, `frictionAir = 0.01`
9. Return `{ body, traits, strokes }`

**Rendering:** draw the ORIGINAL strokes transformed by body position + angle. Never render the hull. 6px round-cap lines. P1 red `#E14B3B`, P2 blue `#2E6FD9`. Light arena background, dark platform, soft hill band. No glow, no smoothing, no texture.

**Scoring:** per tick, if `body.position.x` inside hill zone AND `body.position.y < 900` → `+1`. Display as `raw / 60`, one decimal. Both scores live on screen during the match.

**Chaos (P3 only):** pick 2 of 3 without replacement, fire at t=5.0s and t=11.0s, telegraph 1.0s before, both creatures affected equally.
- Wind gust: horizontal force, random direction, 1.5s
- Platform tilt: ±8° over 0.5s, hold 2.0s, return 0.5s
- Bounce pad: high-restitution pad at random platform x, 3.0s

**Flow:** home (mode select; "Send challenge" disabled until P5) → P1 draw → handover screen → P2 draw → 3s countdown → 15s match → result (scores, winner, rematch, share). Rematch returns to P1 draw. Creatures are never reused.

## Do not build (v1.1 backlog — SPEC §11)

Player controls/steering · smoothing or styling of strokes · named trait labels or stat panels · sound · persistence · leaderboard · best-of-3 · sudden death · realtime multiplayer · responsive/landscape layouts · air-drawing input.

## Communication with Ham

Direct, concise, bullets. Metrics first. Label **(fact)** vs **(opinion)**. One question at a time. Specific numbers, not ranges. After each phase: what shipped, deployed URL, what to test, known issues. Ask before creating any file beyond the 5 allowed.

## Known risks — handle as specified

- **poly-decomp on freehand strokes (P2):** sanitizer + hull fallback IS the fix. Tune thresholds, don't redesign. 4-hour timebox, then ship hull-only.
- **iOS Safari MediaRecorder (P4):** 1-hour timebox → permanent screenshot fallback.
- **Inward force feel (P1):** tune the `0.0003` coefficient only.
- **Spawn interpenetration (P2):** increase separation or spawn height before touching solver settings.
