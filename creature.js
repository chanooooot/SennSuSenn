// creature.js — strokes -> physics body (SPEC §4).
// Phase 1: convex hull only. Concave decomposition lands in Phase 2.
// Frozen seam (D5): knows nothing about arena, hills, or scoring.

const CREATURE = (() => {
  function perpDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1e-6;
    return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
  }

  function rdp(points, epsilon) {
    if (points.length < 3) return points.slice();
    let dmax = 0, index = 0;
    const end = points.length - 1;
    for (let i = 1; i < end; i++) {
      const d = perpDist(points[i], points[0], points[end]);
      if (d > dmax) { dmax = d; index = i; }
    }
    if (dmax > epsilon) {
      const left = rdp(points.slice(0, index + 1), epsilon);
      const right = rdp(points.slice(index), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [points[0], points[end]];
  }

  // Decimate all strokes together, raising epsilon until total points <= 400 (SPEC §4 step 1).
  function decimateAll(strokes) {
    let out = strokes;
    let epsilon = 1;
    for (let i = 0; i < 20; i++) {
      out = strokes.map(s => rdp(s, epsilon));
      const total = out.reduce((n, s) => n + s.length, 0);
      if (total <= 400) break;
      epsilon *= 1.5;
    }
    return out;
  }

  // Cap a closed hull to <= max vertices (budget: SPEC §4 step 2 / BUILD_PLAN budgets).
  function capVertices(hull, max) {
    let h = hull, epsilon = 0.5;
    for (let i = 0; i < 20 && h.length > max; i++) {
      const closed = rdp(h.concat([h[0]]), epsilon);
      h = closed.slice(0, -1);
      epsilon *= 1.5;
    }
    return h;
  }

  function fromStrokes(rawStrokes) {
    const strokes = decimateAll(rawStrokes);
    const allPoints = strokes.flat();
    let hull = Matter.Vertices.hull(allPoints);
    hull = capVertices(hull, 24);

    const area = Math.abs(Matter.Vertices.area(hull));
    let perimeter = 0;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i], b = hull[(i + 1) % hull.length];
      perimeter += Math.hypot(b.x - a.x, b.y - a.y);
    }
    const isoperimetricRatio = (perimeter * perimeter) / (4 * Math.PI * area);
    const grip = Math.min(0.9, Math.max(0.3, 0.3 + 0.5 * (isoperimetricRatio - 1)));

    const xs = hull.map(p => p.x), ys = hull.map(p => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys) || 1;
    const aspectRatio = w / h;

    const scale = Math.sqrt(9000 / area);
    const scaledHull = hull.map(p => ({ x: p.x * scale, y: p.y * scale }));
    const centre = Matter.Vertices.centre(scaledHull);

    const body = Matter.Bodies.fromVertices(0, 0, [scaledHull], {
      friction: grip,
      restitution: 0.2,
      frictionAir: 0.01
    });
    Matter.Body.setMass(body, 1.0);

    const renderStrokes = strokes.map(s => s.map(p => ({
      x: p.x * scale - centre.x,
      y: p.y * scale - centre.y
    })));

    return {
      body,
      traits: { aspectRatio, grip },
      strokes: renderStrokes
    };
  }

  return { fromStrokes };
})();
