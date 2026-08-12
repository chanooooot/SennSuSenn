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
  const LUNGE_TICKS = 60;
  const LUNGE_X = 2.5;
  const LUNGE_Y = -4;
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

    creatures.forEach((c, i) => {
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
      } else if (c.body.position.x > HILL_MIN && c.body.position.x < HILL_MAX && c.body.position.y < PLATFORM_Y) {
        scores[i] += 1;
      }
    });
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
