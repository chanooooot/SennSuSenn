# HANDOFF

Read `CLAUDE.md`, `SPEC.md`, and `BUILD_PLAN.md` first — they are the source of truth.

## State

Deployed URL: https://chanooooot.github.io/SennSuSenn/ (GitHub Pages from `main`).

P2 pre-gate repairs were implemented, locally verified, and deployed from `main` at commit `e99d6de`.

The original 10-match P2 kill gate failed. Ham confirmed the passive matches were boring: creatures bumped near the center, settled, and remained still. The optional steer-mode experiment was rejected because no player control during the match is a core product decision.

**EXPERIMENT:** Ham approved one new passive core-loop test: automatic lunges. The deployed prototype uses an 8-second match and gives both creatures an equal hop toward the opponent every second. It adds no player input. P3–P5 remain blocked.

This experiment intentionally overrides the 15-second match and constant inward force in `SPEC.md`. Treat it as unsettled until the phone gate passes. If it passes, update the settled decisions before further development; if it fails, revert to stop state.

## Kill-gate result

- Result: **FAIL** after 10 real matches.
- Observed loop: initial collision followed by a long center standstill.
- Deterministic diagnosis: identical tap creatures remain effectively motionless for 13.2 of 15 seconds; one creature alone settles at center for 9.8 seconds.
- Zero friction, restitution 0.9, zero air friction, and inward-force changes did not remove the standstill.
- Root cause: the flat arena, constant center attraction, and energy loss form a stable center equilibrium. This is a design outcome, not a Matter.js sleeping or render-timing bug.
- Decision after the failure: preserve the no-control premise, reject steering, and test one continuously active automatic-fighter loop before stopping permanently. P3 chaos remains blocked.

## P2 pre-gate repair

- Each open stroke becomes a 6px ribbon with bevel joins and round caps.
- Disconnected strokes remain separate collision parts in one compound body.
- Duplicate points are removed; a tap becomes a playable 6px octagon.
- Any invalid ribbon or decomposition triggers whole-creature convex-hull fallback.
- Collision geometry is normalized to 9000px² hull area and mass 1.0.
- Stored strokes are decimated, normalized, body-local centerlines. The `{ body, traits, strokes }` seam is unchanged.
- Matter.js runs at fixed `1000 / 60` steps. The repaired baseline ended after exactly 900 ticks.
- Render deltas are clamped to 100ms with at most six physics steps per frame.
- Falling bodies are removed immediately and respawn after 60 ticks at the recorded side with zero velocity.
- Rendering uses `#E14B3B`, `#2E6FD9`, 6px round-cap strokes, and match background `#F5F1E8`.
- The repaired baseline used inward force `0.0003`; the experiment replaces it rather than retuning it.

## Auto-lunge experiment

- Match: 480 ticks / 8.0 seconds.
- Pulse: every 60 ticks, starting at 1.0 seconds.
- Both active creatures receive the same bounded upward velocity and horizontal impulse toward the opponent.
- Contact-lock fix: creature restitution is 0.4, approved by Ham after the first phone run.
- No player controls, P3 chaos, new files, dependencies, or seam changes.
- Own JS: 21,427 bytes.
- The earlier motion-only check missed bodies moving together while touching. The minimized physics repro improved from 4.95 seconds of continuous contact at restitution 0.2 to 0.02 seconds at 0.4; the full closed-square creature regression now clears within 0.10 seconds.
- Mixed-shape scores diverged: `350/294`, `349/359`, and `349/111`.
- 30fps and 60fps scenario: `350/294`, exactly 480 physics ticks in both runs.

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

1. On Ham's phone, hard-refresh the deployed URL and confirm matches last 8.0 seconds with visible lunges every second.
2. Run 10 hot-seat matches with varied flat, closed, and hooked shapes. Pass only with at least 3 spontaneous laugh/WTF reactions and no recurring touch-locks.
3. If the experiment passes, update `SPEC.md`, `BUILD_PLAN.md`, `AGENTS.md`, and `CLAUDE.md` before further implementation.
4. If it fails, revert the prototype and restore permanent stop state.
5. Keep P3–P5 blocked until Ham explicitly confirms the new gate result.
