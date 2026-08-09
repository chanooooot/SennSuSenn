# HANDOFF

Read `CLAUDE.md`, `SPEC.md`, and `BUILD_PLAN.md` first — they are the source of truth.

## State

Deployed URL: https://chanooooot.github.io/SennSuSenn/ (GitHub Pages from `main`).

P2 pre-gate repairs are implemented and locally verified. The P2 phone checks and 10-match kill gate have not run. Stop before P3 until Ham confirms at least 3/10 spontaneous laugh/WTF reactions.

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

1. On Ham's phone, verify the full flow, 15.0-second match, 1-second respawn, live scores, and 60fps.
2. Across 20 drawings, confirm fallback is below 30% and a hook catches at least once in five matches.
3. Remove only the temporary raw-score/grip diagnostics after calibration passes.
4. Run 10 hot-seat matches. Continue only with at least 3 spontaneous laugh/WTF reactions.
5. Keep P3–P5 blocked until Ham confirms the gate.
