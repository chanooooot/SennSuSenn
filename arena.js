// arena.js — platform, hill zone, inward force, fall/respawn, scoring (SPEC §3, §5).
// Frozen seam (D5): never reaches into stroke data, only { body }.

const ARENA = (() => {
  const { Engine, World, Bodies, Body } = Matter;

  const PLATFORM_Y = 900;
  const HILL_MIN = 310, HILL_MAX = 410;
  const CENTER_X = 360;
  const FORCE_COEF = 0.006;
  const FALL_Y = 1200;
  const RESPAWN_MS = 1000;
  const SPAWN_X = [180, 540];

  let engine, world;
  let creatures = [];
  let scores = [0, 0];
  let elapsed = 0;

  function init(bodies) {
    engine = Engine.create();
    world = engine.world;
    world.gravity.y = 1.0;

    World.add(world, Bodies.rectangle(360, 920, 640, 40, { isStatic: true }));

    creatures = bodies.map((body, i) => {
      Body.setPosition(body, { x: SPAWN_X[i], y: 700 });
      Body.setVelocity(body, { x: 0, y: 0 });
      World.add(world, body);
      return { body, fallen: false, respawnAt: 0 };
    });

    scores = [0, 0];
    elapsed = 0;
  }

  function update(deltaMs) {
    creatures.forEach((c) => {
      if (c.fallen) return;
      const dir = Math.sign(CENTER_X - c.body.position.x);
      Body.applyForce(c.body, c.body.position, { x: dir * c.body.mass * FORCE_COEF, y: 0 });
    });

    Engine.update(engine, deltaMs);
    elapsed += deltaMs;

    creatures.forEach((c, i) => {
      if (c.fallen) {
        if (elapsed >= c.respawnAt) {
          const x = c.body.position.x < CENTER_X ? 80 : 640;
          Body.setPosition(c.body, { x, y: 700 });
          Body.setVelocity(c.body, { x: 0, y: 0 });
          Body.setAngularVelocity(c.body, 0);
          c.fallen = false;
        }
        return;
      }
      if (c.body.position.y > FALL_Y) {
        c.fallen = true;
        c.respawnAt = elapsed + RESPAWN_MS;
      } else if (c.body.position.x > HILL_MIN && c.body.position.x < HILL_MAX && c.body.position.y < PLATFORM_Y) {
        scores[i] += 1;
      }
    });
  }

  function render(ctx) {
    ctx.fillStyle = '#333';
    ctx.fillRect(40, 900, 640, 40);
    ctx.fillStyle = 'rgba(255,210,60,0.25)';
    ctx.fillRect(HILL_MIN, 900, HILL_MAX - HILL_MIN, 40);
  }

  function getScores() { return scores; }

  return { init, update, render, getScores };
})();
