# HANDOFF

Read `CLAUDE.md`, `SPEC.md`, `BUILD_PLAN.md` first — they're the source of truth. This file is a snapshot for whoever picks this up next.

## State

Deployed: https://chanooooot.github.io/SennSuSenn/ (public repo, GitHub Pages on `main` root).

Phase 0, 1, 2 built (skeleton, hull-only game loop, concave via poly-decomp + hull fallback). Kill gate (10 hot-seat matches, BUILD_PLAN.md) **not yet run** — still debugging a tie bug that makes it pointless to gate on right now.

## Open bug: matches tie constantly

Symptom: creatures visibly push/wobble against each other at center but neither wins — score comes out equal (or 0-0) essentially every match.

**Diagnosis so far (see git log `3d03601`..`ca28924`):**
1. First fix: `FORCE_COEF` in `arena.js` was too weak relative to fixed `frictionAir=0.01` — terminal velocity was ~0.06px/tick, creatures barely crept. Bumped `0.0006` → `0.006`. This fixed a real "standstill" bug but ties continued.
2. Wrongly diagnosed the tie as hill-zone width letting both creatures fit at once. Narrowed 180px → 100px → 60px. **Both were wrong** — the zone is centered at the same x=360 both creatures jam around, so a symmetric zone can only pick between two different exact-tie regimes (both inside = tie, both outside = 0-0 tie), never break the tie. Reverted to spec's original 270-450.
3. Actual attempted fix: spawn is now **asymmetric on Y** (`SPAWN_Y = [700, 620]` in `arena.js`) so the two creatures don't move in a perfect mirror and enter the scoring zone on different ticks. **Not yet confirmed working on device.**
4. Suspected secondary cause, also unconfirmed: the grip/friction formula in `creature.js` (`isoperimetricRatio` → `grip`) may be saturating to the same clamp (0.3 or 0.9) for most hand-drawn shapes, making two creatures physically identical regardless of drawn shape. A debug line was added to the result screen (`main.js` ~line 253) to show `raw scores` and `grip` for both creatures — **user reports this line is not appearing on phone**, unconfirmed whether that's a real bug or a stale-cache/deploy-propagation issue (many rapid pushes in a row; GitHub Pages CDN + phone browser cache can lag).

## Next steps, in order

1. **Confirm the debug line actually renders.** Hard-refresh on the phone (clear cache or add a `?v=2` query to the URL to bust cache) and replay a match. If it still doesn't show, something is throwing before `state === 'result'` is reached — check for a JS error killing the `requestAnimationFrame` loop (e.g. via remote inspector, see below, or by temporarily wrapping `frame()`'s body in try/catch and rendering the error to canvas).
2. Once the line shows, read off `raw X/Y grip A/B`:
   - If `raw` is `0/0` → creatures never entered the hill zone at all this match — a different bug (maybe spawn/force regression).
   - If `raw` is `N/N` (equal, nonzero) → the spawn-Y asymmetry fix didn't work, needs another approach.
   - If `raw` differs → tie bug is fixed, move on to the kill gate.
   - If `grip` is identical for both (e.g. both 0.90 or both 0.30) → the friction formula is saturating, take it to Ham as a SPEC §4 formula issue (don't retune the clamp constants unilaterally — those are spec values).
3. Remote debugging without the on-screen line (for deeper JS errors): iOS needs a Mac (Settings → Safari → Advanced → Web Inspector, then Safari on Mac → Develop menu). Android needs `chrome://inspect/#devices` on a computer with the phone plugged in via USB (Developer options → USB debugging). Both need a cable; there's no cable-free remote console for this project (no analytics/error-reporting service, per SPEC §10 zero-cost constraint).
4. After the tie bug is confirmed fixed: run the **kill gate** (BUILD_PLAN.md, 10 hot-seat matches, ≥3 laughs/WTF to proceed to Phase 3). Do not build Phase 3+ before this passes.
5. Remove the debug line (`main.js` result-state block) before considering Phase 1/2 "done" — it's diagnostic only, not part of the spec'd result screen (SPEC §7).

## Values changed from original SPEC during this session

- `FORCE_COEF` (arena.js): `0.0006` → `0.006` (BUILD_PLAN explicitly sanctions tuning this one).
- Spawn Y (arena.js + SPEC.md §3): both `y=700` → `[700, 620]` (P1, P2). SPEC.md updated to match, Ham has been steering these changes live but hasn't yet confirmed the outcome on-device.
- Hill zone: touched twice, reverted back to spec original 270-450. No net change from spec.
