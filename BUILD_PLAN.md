# BUILD_PLAN — SennSuSenn

Read `SPEC.md` first. Decisions in §2 are settled — do not revisit them.

**Rule: a phase is done only when its Verify check passes on Ham's real phone.** Not "it should work." Ham confirming on device is done.

Report after each phase: what shipped, the deployed URL, what to test, known issues.

---

## Phase 0 — Skeleton

**Goal:** an empty portrait canvas deployed and reachable.

1. Create `index.html`, `creature.js`, `arena.js`, `main.js`.
2. Matter.js and poly-decomp via CDN `<script>` tags. No npm, no bundler, no build step.
3. Fixed 720×1280 logical canvas, scaled to fit viewport. Landscape shows a "rotate your phone" overlay.
4. Push to GitHub, enable Pages.

**Verify:** Ham opens the URL on his phone. Sees a correctly-proportioned blank canvas in portrait. Rotating shows the overlay.

---

## Phase 1 — The game loop (convex hull only)

**Goal:** a complete, playable match. Ugly but real.

1. **Draw screen.** 560×560 draw box, finger drawing, multi-stroke (max 5), undo, clear, confirm. P1 red, P2 blue.
2. **`creature.js` v1** — strokes → RDP decimate → **convex hull** → scale to 9000px² → `Body.setMass(1.0)` → return `{ body, traits, strokes }`.
   - Traits: friction from isoperimetric ratio per SPEC §4. Restitution 0.2, frictionAir 0.01.
   - **Concave decomposition is NOT in this phase.** Hull only.
3. **`arena.js` v1** — platform, hill zone, gravity, inward force, fall detection, 1s respawn, per-tick scoring.
4. **`main.js`** — state machine: home → P1 draw → handover → P2 draw → 3s countdown → 15s match → result → rematch.
5. Live scores rendered during the match. Strokes rendered transformed by body position/angle — **not** the hull.

**Do not build:** chaos events, clip capture, async, sound, menus beyond the flow in SPEC §7.

**Verify:**
- Ham and one other person complete a full match end-to-end on one phone.
- Match ends at exactly 15.0s.
- A creature knocked off the platform respawns at the edge after ~1s and can score again.
- Live scores tick visibly.
- 60fps.

---

## Phase 2 — Concave bodies

**Goal:** hooks, spikes and scoops actually do something.

1. Add the sanitizer per SPEC §4: reject self-intersections, drop slivers, cap 24 vertices per polygon.
2. Attempt poly-decomp decomposition.
3. **Hard fallback:** any failure, zero parts, or any degenerate polygon → silently use convex hull for that creature. The player must never see an error.
4. Log fallback frequency to console during testing so Ham can see how often it fires.

**Timebox: 4 hours.** If concave bodies are still unstable — bodies exploding, interpenetrating at spawn, frame drops — stop, ship hull-only, and note it in the backlog. Phase 1 is a complete game on its own.

**Verify:**
- A deliberately hooked shape visibly catches on the opponent at least once in 5 matches.
- No body ever explodes, teleports, or falls through the platform.
- Fallback rate under 30% across 20 drawings.
- Still 60fps.

---

## 🚦 KILL GATE — after Phase 2

**Play 10 hot-seat matches with a real person.**

- **≥3 spontaneous laughs or "WTF" reactions → continue to Phase 3.**
- **<3 → STOP.** Do not build Phases 3–5.

This is the whole risk of the project. The tech is boring and proven; the open question is whether watching is fun. Chaos events amplify fun that exists — they don't create it.

If the gate fails, the honest options are: abandon, or try the steer-mode toggle from SPEC §11 item 2 as a single experiment. Nothing else.

---

## Phase 3 — Chaos events

**Goal:** the WTF moment.

1. Three events per SPEC §6: wind gust, platform tilt, bounce pad.
2. Pick 2 at random without replacement each match. Fire at t=5.0s and t=11.0s.
3. Telegraph each with a visible cue 1.0s before.
4. All events symmetrical — both creatures affected equally.

**Verify:**
- Telegraph is noticeable enough that a first-time player sees it coming.
- Both creatures are visibly affected by every event.
- An event changes the outcome of at least 1 match in 10.
- Still 60fps.

---

## Phase 4 — Clip capture

**Goal:** the match leaves the room.

1. `canvas.captureStream(30)` → MediaRecorder → blob → Web Share API.
2. Record the 15s match automatically. Share button on the result screen.
3. **No editing, no trimming, no filters, no watermark.** Record, hand to share sheet, done.

**Timebox: 1 hour on iOS Safari.** MediaRecorder support there is partial and codec-dependent. (fact) If it doesn't work inside the timebox, fall back permanently to a **screenshot of the result screen** (both creatures + final scores) and move on.

**Verify:** Ham records a match on his phone and successfully sends it to someone via the native share sheet.

---

## Phase 5 — Async challenge link

**Goal:** friends can play without being in the same room.

1. Implement encoding per SPEC §9. `creature.js` exposes `fromURL()` alongside `fromStrokes()` — same return contract.
2. "Send challenge" button after P1 draws → generates URL → native share.
3. On load with `?c=`, skip P1 draw, show "Challenge received," go to P2 draw.
4. Enable the previously-disabled "Send challenge" option on the home screen.
5. Guard: if payload exceeds 1,100 characters, decimate further before encoding.

**Verify:** Ham generates a link, sends it to a friend on a different phone, friend opens it, draws, and plays a full match against Ham's creature.

---

## Budgets (binding)

| Metric | Limit |
|---|---|
| Frame rate | 60fps with 2 concave bodies |
| Own JS (excl. CDN) | < 40KB |
| Stroke points per creature | ≤ 400 after decimation |
| Vertices per polygon | ≤ 24 |
| Strokes per creature | ≤ 5 |
| Encoded creature payload | < 1,100 chars |
| Monthly cost | $0 |

---

## Known risk areas — handle as specified, do not rabbit-hole

- **poly-decomp on freehand strokes (P2):** the sanitizer + hull fallback IS the fix. Tune the sanitizer thresholds. Do not redesign the pipeline.
- **iOS Safari MediaRecorder (P4):** 1-hour timebox → screenshot fallback. Do not spend a day on codec negotiation.
- **Inward force tuning (P1):** if creatures reach the center too fast or stall, adjust the `0.0006` coefficient only. Do not add steering, do not add a second force.
- **Bodies interpenetrating at spawn (P2):** increase spawn separation or spawn height before touching solver settings.
