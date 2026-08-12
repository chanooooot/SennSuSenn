// arena.js — platform, hill zone, auto-lunge, fall/respawn, scoring (SPEC §3, §5).
// Frozen seam (D5): never reaches into stroke data, only { body }.

const ARENA = (() => {
  const { Engine, World, Bodies, Body } = Matter;

  const PLATFORM_Y = 900;
  const HILL_MIN = 270, HILL_MAX = 450;
  const CENTER_X = 360;
  // EXPERIMENT: the hill is an actual hill. The apex is an unstable perch, so holding it
  // is decided by centre-of-mass height and hull interlock instead of by settling first.
  // Grip does NOT sort creatures here - see GROUND_FRICTION below.
  // HUMP_RISE is the tuning knob: 42 over a 90 half-width is a 25deg slope.
  const HUMP_RISE = 42;
  // Matter pairs friction as min(a, b). The old platform carried no friction option, so
  // Matter's default 0.1 silently clamped every creature's 0.3-0.9 grip and the trait did
  // nothing. Grip is measured on the ribbon outline though, which pins it to 0.9 for any
  // stroke over 27px, so grip has no range yet and THIS value is what actually binds.
  // It must stay under tan(25deg) = 0.467 or creatures stick and the apex stops being
  // unstable. Raise it to 1 once grip is measured on the silhouette instead.
  const GROUND_FRICTION = 0.35;
  // PROTOTYPE: recurring equal impulses replace the stable center attractor.
  // Strength is what stops one creature running away with the match: at 2.5 nothing could
  // dislodge whoever reached the apex first. Swept against real physics over 480 ticks,
  // average margin / lead changes were 2.5 -> 238/2, 4 -> 197/2, 6 -> 134/7, 8 -> 72/4.
  // Raising HUMP_RISE did nothing here (margin ~290 at 42, 64 and 90), and halving
  // LUNGE_TICKS was far worse (366/0) because nobody settles long enough to score.
  const LUNGE_TICKS = 60;
  const LUNGE_X = 6;
  const LUNGE_Y = -5;
  const FALL_Y = 1200;
  const STEP_MS = 1000 / 60;
  const RESPAWN_TICKS = 60;
  const SPAWN_X = [180, 540];
  const SPAWN_Y = [700, 700];

  let engine, world;
  let creatures = [];
  let scores = [0, 0];
  let ticks = 0;

  function init(creatureObjects) {
    engine = Engine.create();
    world = engine.world;
    world.gravity.y = 1.0;

    World.add(world, [
      Bodies.rectangle(360, 920, 640, 40, { isStatic: true, friction: GROUND_FRICTION }),
      // slope 1 makes trapezoid a triangle; its centroid sits a third of the rise up.
      Bodies.trapezoid(CENTER_X, PLATFORM_Y - HUMP_RISE / 3, HILL_MAX - HILL_MIN, HUMP_RISE, 1,
        { isStatic: true, friction: GROUND_FRICTION })
    ]);

    creatures = creatureObjects.map((creature, i) => {
      const body = creature.body;
      Body.setPosition(body, { x: SPAWN_X[i], y: SPAWN_Y[i] });
      Body.setVelocity(body, { x: 0, y: 0 });
      World.add(world, body);
      return { body, fallen: false, respawnAt: 0, respawnX: 0 };
    });

    scores = [0, 0];
    ticks = 0;
  }

  function update() {
    if ((ticks + 1) % LUNGE_TICKS === 0) {
      creatures.forEach((c, i) => {
        if (c.fallen) return;
        const opponent = creatures[1 - i];
        const targetX = opponent && !opponent.fallen ? opponent.body.position.x : CENTER_X;
        const dir = Math.sign(targetX - c.body.position.x) || (i === 0 ? 1 : -1);
        Body.setVelocity(c.body, {
          x: c.body.velocity.x + dir * LUNGE_X,
          y: Math.min(c.body.velocity.y, LUNGE_Y)
        });
      });
    }

    Engine.update(engine, STEP_MS);
    ticks++;

    creatures.forEach((c) => {
      if (c.fallen) {
        if (ticks >= c.respawnAt) {
          Body.setPosition(c.body, { x: c.respawnX, y: 700 });
          Body.setVelocity(c.body, { x: 0, y: 0 });
          Body.setAngularVelocity(c.body, 0);
          World.add(world, c.body);
          c.fallen = false;
        }
        return;
      }
      if (c.body.position.y > FALL_Y) {
        c.respawnX = c.body.position.x < CENTER_X ? 80 : 640;
        c.fallen = true;
        c.respawnAt = ticks + RESPAWN_TICKS;
        World.remove(world, c.body);
      }
    });

    // Exclusive hill: only whoever is nearest x=360 scores, so the two scores can never
    // sum past the tick count. Both creatures used to score at once and a 480-tick match
    // ended 349/359 - the number could not tell a dramatic match from a dull one.
    // An exact distance tie awards nobody, which float equality makes unreachable (D13).
    let leader = -1, best = Infinity;
    creatures.forEach((c, i) => {
      if (c.fallen) return;
      const p = c.body.position;
      if (p.x <= HILL_MIN || p.x >= HILL_MAX || p.y >= PLATFORM_Y) return;
      const distance = Math.abs(p.x - CENTER_X);
      if (distance < best) { best = distance; leader = i; }
      else if (distance === best) leader = -1;
    });
    if (leader >= 0) scores[leader] += 1;
  }

  function render(ctx) {
    ctx.fillStyle = '#333';
    ctx.fillRect(40, 900, 640, 40);
    // Solid, not a 0.25 alpha tint: over a #333 platform that tint was invisible.
    ctx.fillStyle = 'rgba(255,210,60,0.9)';
    ctx.beginPath();
    ctx.moveTo(HILL_MIN, PLATFORM_Y);
    ctx.lineTo(CENTER_X, PLATFORM_Y - HUMP_RISE);
    ctx.lineTo(HILL_MAX, PLATFORM_Y);
    ctx.closePath();
    ctx.fill();
  }

  function getScores() { return scores; }
  function getTicks() { return ticks; }

  return { init, update, render, getScores, getTicks };
})();
