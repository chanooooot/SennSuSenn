# CLAUDE.md — SennSuSenn

Instructions for Claude Code working in this repo.

## Project

SennSuSenn (เส้นสู้เส้น, "line fights line"). A mobile web game. Two people draw a creature with their finger on one phone. Both drawings become physics bodies, normalized to identical size and mass, dropped into an arena. A constant inward force pulls them toward a scoring zone. No player control during the match. 15 seconds. Whoever holds the center longest wins.

**Source of truth:**
- `SPEC.md` — product spec + settled decision log (§2). **Do not change decisions without asking Ham.**
- `BUILD_PLAN.md` — phases P0–P5, per-phase Verify checks, budgets, kill gate.

## Hard constraints

1. **Stack:** Vanilla JS only. No frameworks, no bundlers, no npm, no TypeScript, no build step. Matter.js and poly-decomp via CDN `<script>` tags.
2. **Files:** `index.html`, `creature.js`, `arena.js`, `main.js`, `README.md`. **Do not add other files without explicit approval.**
3. **Zero cost:** no servers, no API keys, no external services, no analytics, no custom domain. Deploy target is GitHub Pages. If a solution needs a backend, it's the wrong solution.
4. **No camera.** This project does not use MediaPipe, getUserMedia, or hand tracking. That was considered and explicitly rejected (D11). Touch input only.
5. **The seam is architectural, not stylistic (D5).** `creature.js` converts strokes into `{ body, traits, strokes }` and knows nothing about hills, scoring, or chaos. `arena.js` consumes that object and never reaches back into stroke data. This is why the files are separate. **Do not merge them. Do not let arena logic leak into creature code or vice versa.** Violating this is the single most likely way this project rots.
6. **Serializable from day one (D19).** The creature object must be encodable to a URL string per SPEC §9, even in Phase 1 where the encoder isn't built yet. Do not store raw Matter.js references in a way that makes this impossible later.
7. **Follow phase order.** A phase is done only when its Verify check passes on Ham's real phone.
8. **Respect the kill gate after P2.** Do not build P3–P5 until Ham confirms the fun test passed.
9. **Budgets are binding** — see BUILD_PLAN.md. 60fps, <40KB own JS, ≤400 points, ≤24 vertices, ≤5 strokes.

## Working style (Karpathy)

- **Think before coding.** State assumptions explicitly. If multiple interpretations exist, present them — don't pick silently. If something is unclear, stop and ask.
- **Simplicity first.** Minimum code that solves the problem. No speculative abstractions, no config options nobody asked for, no error handling for impossible cases. If you write 200 lines and it could be 50, rewrite it.
- **Surgical changes.** When iterating, touch only what the feedback requires. Don't reformat, don't "improve" untouched code, don't refactor things that aren't broken.
- **Verifiable goals.** Each phase ends with its Verify check. "It should work" is not done.
- Before each phase, state in 2–3 bullets what you're assuming and what could go wrong.

## Things that will feel tempting and are wrong

- Adding player controls during the match. **No.** D7. Shape is 100% of the skill.
- Smoothing or beautifying the strokes. **No.** D15. The ugliness is the joke, and the player must see the exact shape physics acts on.
- Rendering the physics hull instead of the original strokes. **No.** Render strokes, simulate hull. SPEC §4.
- Adding named stat labels or a stats panel. **No.** D12. Traits are emergent and never displayed.
- Showing an error when concave decomposition fails. **No.** Silent fallback to convex hull.
- Building a leaderboard, sound, or persistence. **No.** All in the v1.1 backlog, SPEC §11.
- Making the arena responsive to multiple aspect ratios. **No.** D16, portrait only, fixed logical canvas.
- Reusing creatures across rematches. **No.** Fresh draw every round — that's the whole loop.

## Communication with Ham

- Direct, concise, bullets. Metrics first. No long preambles, no filler.
- Label **(fact)** vs **(opinion)**.
- One question at a time when a decision is needed.
- Specific numbers, not ranges or vague adjectives.
- After each phase: what shipped, deployed URL, what to test, known issues.
- **Ask before creating any file** beyond the 5 allowed.

## Known risk areas — handle as specified, don't rabbit-hole

- **poly-decomp on freehand strokes (P2):** the sanitizer + convex hull fallback IS the specified fix. Tune sanitizer thresholds. Do not redesign the pipeline. 4-hour timebox.
- **iOS Safari MediaRecorder (P4):** 1-hour timebox → permanent screenshot fallback. (fact) Do not spend a day on codecs.
- **Inward force feel (P1):** adjust the `0.0003` coefficient only. Do not add a second force, do not add steering.
- **Spawn interpenetration (P2):** increase spawn separation or height before touching solver settings.
