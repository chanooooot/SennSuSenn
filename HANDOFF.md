# HANDOFF

Read `CLAUDE.md`, `SPEC.md`, and `BUILD_PLAN.md` first — they are the source of truth.

## State

Deployed URL: https://chanooooot.github.io/SennSuSenn/ (GitHub Pages from `main`).

Deployed: **build 7** (`?v=7`, "build 7" on the home screen). Build 7 = build 6 plus creature-geometry fixes from a review, no arena tuning change:

- **NaN creature fixed.** `perpDist` returned 0 for every point when a segment's ends coincided, so `rdp` collapsed any exactly-closed stroke (once the drawing passed 400 points) into two identical points and the ribbon divided by zero. The creature was invisible, never scored or respawned, and the result read `NaN`. `perpDist` now falls back to point distance, and decimated strokes are deduped again.
- **Invisible scribble spikes fixed.** The inner miter on a near-180° turn divided by `1 + dot` ~ 0 and threw a vertex hundreds of px out. A zigzag drawn 30px wide became a 240px body. Joins now bevel when `1 + dot < 0.25` (sanitizer threshold). Measured drawn/physics width after: loop 105/108, scribble 235/240, hairpin 236/240.
- **Render thickness matches physics (D15).** Strokes draw at `RIBBON_WIDTH * scale` (`creature.lineWidth`). A tap now shows as its real 113px blob instead of a 6px dot. Trade-off: span-capped long lines draw ~3-5px thick.
- Nits: Undo/Clear mid-stroke now drop the in-progress stroke; respawn uses `SPAWN_Y`; `main.js` reads `ARENA.getTicks()` instead of a duplicate counter.

Build 6 (`?v=6` on the script tags, "build 6" printed on the home screen). Build 6 = build 5 physics plus a multi-touch input fix: `pointermove`/`pointerup` now check `pointerId`, so a stray second finger neither appends to nor ends the first stroke. No physics change.

**Hill experiment result: Ham reports the game is "a lot better" on the phone (build 3).** The stable-centre standstill that failed the first kill gate is addressed. The hill is no longer a painted flat band; it is a real triangle and the apex is an unstable perch.

Build 4 adds exclusive scoring, approved by Ham. Only the creature nearest `x=360` scores, and only inside the zone; an exact distance tie awards nobody. **This changes D4 and D13** — update SPEC §2 and §5 if the gate passes. Measured over 480 ticks against real Matter: identical blobs `73/236`, blob vs wide bar `11/309`, tall vs wide `241/115`, and the sum never exceeds the tick count.

Watch item: identical shapes now finish lopsided rather than near-even, so solver ordering and float noise decide a symmetric match-up. Real play never uses identical creatures, so this is recorded rather than treated as a fairness break.

Build 5 fixes a runaway leader Ham reported on build 4: one player pulled ahead early and stayed ahead. Not a hill-height problem — sweeping `HUMP_RISE` (42/64/90) left the average margin near 290 at every value, because nothing could dislodge whoever reached the apex first. The lunge is the only offensive force in the match; it was too weak. Swept `LUNGE_X`/`LUNGE_Y` against real physics over 480 ticks (avg margin / lead changes): `2.5` → 238/2, `4` → 197/2, **`6` → 134/7 (shipped)**, `8` → 72/4. Halving the lunge interval was worse (366/0 swaps) — nobody settles long enough to score. Match scores: blob vs bar `11/309 → 122/169`, tall vs wide `241/115 → 208/197`. Not yet confirmed on Ham's phone.

Defect 5 (grip has no dynamic range, see below) remains unfixed. It needs Ham's approval because it touches SPEC §4's grip formula. Not attempted yet — but pre-verified in the scratchpad: measuring the isoperimetric ratio on the silhouette instead of the ribbon gives grip spread `0.000 → 0.600` across line/circle/square/star/hook test shapes, so the fix is known to work before it's written.

Cache note: GitHub Pages serves assets with `cache-control: max-age=600`, and an iOS Safari hard refresh does not reliably clear sub-resources. Two rounds were lost to this. The script tags now carry `?v=N` — **bump it on every deploy** — and the home screen prints the build number so a stale cache is visible in one glance.

The P2 pre-gate repair baseline was implemented, locally verified, and deployed from `main` at commit `e99d6de`.

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
- Own JS: 25,345 bytes at build 5 (see build 6 note in State).
- The earlier motion-only check missed bodies moving together while touching. The minimized physics repro improved from 4.95 seconds of continuous contact at restitution 0.2 to 0.02 seconds at 0.4; the full closed-square creature regression now clears within 0.10 seconds.
- Mixed-shape scores diverged: `350/294`, `349/359`, and `349/111`.
- 30fps and 60fps scenario: `350/294`, exactly 480 physics ticks in both runs.

## Standstill review (2026-08-12)

Ham's report: creatures either do not move or move very little. Four defects found, ranked by contribution.

1. **Scoring has no conflict in it.** `arena.js` scores each creature independently, and the 180px hill fits both. Ham's own numbers prove it: `349 + 359 = 708` in a 480-tick match, so both scored on at least 228 ticks. Not fixed yet — see the open question below.
2. **Grip trait was dead.** The platform carried no `friction` option, so it used Matter's default `0.1`. Matter pairs friction as `min(a, b)`, which clamped every creature's `0.3`–`0.9` grip to `0.1`. Spiky shapes never caught on anything. **Partly fixed:** ground friction is now an explicit `0.35` rather than an accidental `0.1`. It cannot go to `1` yet — see defect 5.
3. **Thin strokes became platform-spanning bars.** Normalizing on hull area alone blew a 560px stroke (~3400px² of ribbon) up by 1.63x to **913px wide** on a **640px** platform — unfallable, untoppleable, permanently on the hill. D6 fairness was inverted: the dominant strategy was one long line, not a big blob. **Fixed:** `MAX_SPAN = 240` caps the scale. Line 913px → 237px; blob 107px and tap 113px are untouched by the cap.
4. **The lunge sustained the pile-up it was added to break.** `arena.js` aims each lunge at the opponent's position, so once both are near the centre they hop into each other every second — equal mass, head-on, cancelling. The `|| (i === 0 ? 1 : -1)` separation fallback only fires on exact x equality, so it is effectively dead code. Left as-is to keep the hill a single variable.
5. **Grip has no dynamic range.** `creature.js` measures the isoperimetric ratio on the **ribbon outline**, not on the silhouette. A ribbon is always a long thin loop, so the ratio is always large: any stroke over **27px** pins grip to its `0.9` ceiling. Measured values — `L=100` → 0.900, `L=300` → 0.900, `L=560` → 0.900, `L=1200` → 0.900. Only a tap differs, at 0.327. So every creature a finger can realistically draw has **identical** friction, and SPEC §4's "spiky shapes catch and snag" cannot happen. Not fixed — the fix is to measure the ratio on the silhouette (where a circle really does give 1.0, as SPEC §4 intends), which is a change to a SPEC formula and needs Ham's approval.

Defect 5 is why ground friction is `0.35` and not `1`. With grip pinned at 0.9, setting ground friction to `1` would make `min(a, b)` = 0.9 for every creature — far above the hill's `tan(25°) = 0.467` — so nothing would ever slide and the standstill would get **worse**. Until grip has real range, ground friction is the effective global friction, and it is deliberately set below the slope so the apex stays unstable.

## Hill experiment (deployed, build 3+)

The root cause HANDOFF already named — flat arena plus centre attraction plus energy loss equals a **stable** equilibrium — is still unaddressed. The game is called King of the Hill and SPEC §3 renders the hill as a painted flat band. There is no hill.

- A static triangle now sits on the platform across the hill zone: base `(270,900)`–`(450,900)`, apex `(360,858)`. Verified against Matter's `Bodies.trapezoid` slope-1 vertex math.
- `HUMP_RISE = 42` over a 90px half-width is a **25° slope, tan 0.467**. Paired knob: `GROUND_FRICTION = 0.35`, held below that 0.467 so nothing can park on the slope.
- The apex is an unstable perch, so settling first no longer wins. Because of defect 5 the contest is decided by centre-of-mass height and hull interlock, **not** by grip — grip is the same for both creatures.
- Lunge strength was raised in build 5 (`LUNGE_X` 2.5 → 6, `LUNGE_Y` -4 → -5) after Ham reported a runaway leader on build 4 — see the State section above.
- **This contradicts SPEC §3** (platform as a single flat rectangle) and, as of build 4, D4/D13 (scoring). Unsettled until the phone gate passes.
- No player control, no chaos events, no new files, no dependencies, no seam change.

## Local verification (P2 pre-gate baseline, pre-dates the auto-lunge experiment)

- Own JS: 20,986 bytes; budget is under 40KB.
- Syntax checks pass for `creature.js`, `arena.js`, and `main.js`.
- Straight, tap, hook, self-crossing, overlapping, disconnected five-stroke, and 400-point cases complete 900 ticks without NaN, teleport, or platform fall-through.
- Every tested body: 9000px² hull area, mass 1.0, at most 24 vertices per polygon, at most 400 stored points.
- Hook remains concave; self-crossing input triggers whole-creature fallback.
- Identical scenario at 60fps and 30fps: `415/382`, exactly 900 physics ticks in both runs.
- Respawn: exactly 60 ticks, recorded side preserved, position y=700, zero linear/angular velocity.

See "Auto-lunge experiment" above for the current 480-tick/8s deployed numbers.

Browser pointer/canvas smoke testing was unavailable in the verification session. Phone-only checks remain authoritative.

## Diagnostics

Keep the fallback-frequency console log and temporary raw-score/grip result diagnostics through the first phone calibration. After calibration passes, remove only the raw-score/grip result text and its matching console log.

## Next steps

1. **Ham tests build 7 on his phone** (home screen must read "build 7" — if it says 6, wait 10 minutes for the Pages cache and reload).
   - Multi-touch: draw with one finger, rest a second finger inside the box mid-stroke, lift it. The stroke must continue unbroken and not end early.
   - Lead swap: play 2 or 3 matches with different shapes. Does the lead change hands mid-match, or does one player run away with it early like build 4?
2. Report both results. If the lead still runs away, the next knob is `LUNGE_X` (8 measured 72/4 in the sweep) — one variable, one deploy.
3. Decide defect 5: fix grip by measuring the isoperimetric ratio on the silhouette instead of the ribbon (pre-verified spread `0.000 -> 0.600`, changes a SPEC §4 formula), or run the 10-match gate with grip flat. Recommendation (opinion): gate first, grip after.
4. Run the 10 hot-seat match kill gate. Pass only with at least 3 spontaneous laugh/WTF reactions and no recurring touch-locks.
5. If the gate passes, approve or reject the SPEC divergence ledger below, then update `SPEC.md` §2, `BUILD_PLAN.md`, `AGENTS.md`, and `CLAUDE.md` before further implementation.
6. If it fails, revert the prototype and restore permanent stop state.
7. Keep P3–P5 blocked until Ham explicitly confirms the new gate result.

## SPEC divergence ledger (needs Ham's decision after the gate)

| SPEC says | Code does |
|---|---|
| §5/§7 15 s match | `MATCH_TICKS = 480` (8 s) |
| §3 flat platform + inward force 0.0003 | triangle hill + auto-lunge, no inward force |
| §5 / D4 / D13 both creatures score per tick | exclusive: only the creature nearest x=360 scores |
| §4 Confirm needs a stroke with >=3 points | any stroke, a tap becomes an octagon |

Also: CLAUDE.md allows 5 files including `README.md`, which does not exist, while `AGENTS.md`, `HANDOFF.md`, and `STATUS.md` do. Amend the rule or the repo.
