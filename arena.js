// arena.js — platform, hill zone, inward force, fall/respawn, scoring (SPEC §3, §5).
// Frozen seam (D5): never reaches into stroke data, only { body }.

const ARENA = (() => {
  const { Engine, World, Bodies, Body } = Matter;

  const PLATFORM_Y = 900;
  const HILL_MIN = 270, HILL_MAX = 450;
  const CENTER_X = 360;
  const FORCE_COEF = 0.0003;
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

    World.add(world, Bodies.rectangle(360, 920, 640, 40, { isStatic: true }));

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
    creatures.forEach((c) => {
      if (c.fallen) return;
      const dir = Math.sign(CENTER_X - c.body.position.x);
      Body.applyForce(c.body, c.body.position, { x: dir * c.body.mass * FORCE_COEF, y: 0 });
    });

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
    ctx.fillStyle = 'rgba(255,210,60,0.25)';
    ctx.fillRect(HILL_MIN, 900, HILL_MAX - HILL_MIN, 40);
  }

  function getScores() { return scores; }
  function getTicks() { return ticks; }

  return { init, update, render, getScores, getTicks };
})();
