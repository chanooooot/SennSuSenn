# HANDOFF

Read `CLAUDE.md`, `SPEC.md`, and `BUILD_PLAN.md` first — they are the source of truth.

## State

Deployed URL: https://chanooooot.github.io/SennSuSenn/ (GitHub Pages from `main`).

Phases 0–2 are built. The P2 kill gate has not run. Stop before P3 until Ham confirms at least 3/10 spontaneous laugh/WTF reactions.

## Constant-tie fix

Ham approved the minimum passing calibration:

- `arena.js`: `FORCE_COEF = 0.00015`.
- Both creatures spawn at y=700: `SPAWN_Y = [700, 700]`.
- `SPEC.md` matches both values.
- Scoring, creature physics, module seam, hill dimensions, 15.0s match duration, and 1000ms respawn are unchanged.

Root cause: `0.006` overwhelmed friction and shape differences, pushing both creatures into the hill together.

The deterministic five-match harness passes through the real `creature.js` pipeline with Matter.js 0.19.0 and poly-decomp 0.3.0:

- wide/tall: `0/744`
- wide/circle: `0/795`
- hook/wide: `773/0`
- triangle/circle: `0/795`
- hook/triangle: `773/0`
- Result: scoring in 5/5, ties in 0/5.

## Diagnostics

Temporary raw-score/grip result text and its matching console log remain until the phone check passes. Remove both afterward. Keep the required fallback-frequency console log in `creature.js`.

## Next steps

1. On Ham's phone, play with visibly different drawings. Confirm both shapes reach the hill and scores diverge.
2. After that passes, remove only the temporary raw-score/grip result text and matching result log.
3. Run the 10-match P2 kill gate. Proceed only with at least 3/10 spontaneous laugh/WTF reactions.
4. Do not build P3 before Ham confirms the gate.
