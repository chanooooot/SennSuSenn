# HANDOFF

Read `CLAUDE.md`, `SPEC.md`, and `BUILD_PLAN.md` first — they are the source of truth.

## State

Deployed URL: https://chanooooot.github.io/SennSuSenn/ (GitHub Pages from `main`).

P2 pre-gate repairs are implemented, locally verified, and deployed from `main` at commit `e99d6de`.

**STOP:** the 10-match P2 kill gate failed. Ham confirmed the passive matches are boring: creatures bump near the center, settle, and remain still. The optional steer-mode experiment was considered and rejected because no player control during the match is a core product decision.

Active development is stopped. P3–P5 remain blocked. Resume only after Ham approves a new core-loop hypothesis and updates the settled decisions in `SPEC.md`.

## Kill-gate result

- Result: **FAIL** after 10 real matches.
- Observed loop: initial collision followed by a long center standstill.
- Deterministic diagnosis: identical tap creatures remain effectively motionless for 13.2 of 15 seconds; one creature alone settles at center for 9.8 seconds.
- Zero friction, restitution 0.9, zero air friction, and inward-force changes did not remove the standstill.
- Root cause: the flat arena, constant center attraction, and energy loss form a stable center equilibrium. This is a design outcome, not a Matter.js sleeping or render-timing bug.
- Decision: preserve the no-control premise and stop rather than build steering or use P3 chaos to mask the failed core loop.

## P2 pre-gate repair

- Each open stroke becomes a 6px ribbon with bevel joins and round caps.
- Disconnected strokes remain separate collision parts in one compound body.
- Duplicate points are removed; a tap becomes a playable 6px octagon.
- Any invalid ribbon or decomposition triggers whole-creature convex-hull fallback.
- Collision geometry is normalized to 9000px² hull area and mass 1.0.
- Stored strokes are decimated, normalized, body-local centerlines. The `{ body, traits, strokes }` seam is unchanged.
- Matter.js runs at fixed `1000 / 60` steps. Matches end after exactly 900 ticks.
- Render deltas are clamped to 100ms with at most six physics steps per frame.
- Falling bodies are removed immediately and respawn after 60 ticks at the recorded side with zero velocity.
- Rendering uses `#E14B3B`, `#2E6FD9`, 6px round-cap strokes, and match background `#F5F1E8`.
- Approved inward force remains `0.0003`; `AGENTS.md`, `CLAUDE.md`, `BUILD_PLAN.md`, and `SPEC.md` agree.

## Local verification

- Own JS: 20,986 bytes; budget is under 40KB.
- Syntax checks pass for `creature.js`, `arena.js`, and `main.js`.
- Straight, tap, hook, self-crossing, overlapping, disconnected five-stroke, and 400-point cases complete 900 ticks without NaN, teleport, or platform fall-through.
- Every tested body: 9000px² hull area, mass 1.0, at most 24 vertices per polygon, at most 400 stored points.
- Hook remains concave; self-crossing input triggers whole-creature fallback.
- Identical scenario at 60fps and 30fps: `415/382`, exactly 900 physics ticks in both runs.
- Respawn: exactly 60 ticks, recorded side preserved, position y=700, zero linear/angular velocity.

Browser pointer/canvas smoke testing was unavailable in the verification session. Phone-only checks remain authoritative.

## Diagnostics

Keep the fallback-frequency console log and temporary raw-score/grip result diagnostics through the first phone calibration. After calibration passes, remove only the raw-score/grip result text and its matching console log.

## Next steps

1. Leave the deployed P2 build as a documented prototype; no further implementation is queued.
2. If revisiting the idea, test a new passive core loop on paper or in a disposable prototype before changing this repo.
3. Resume repository work only after Ham approves the new hypothesis and records the changed decisions in `SPEC.md`.
4. Start from the kill gate again. P3–P5 stay blocked until the replacement loop is fun without chaos.
