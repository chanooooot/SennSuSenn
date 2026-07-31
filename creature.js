// creature.js — strokes -> physics body (SPEC §4).
// Frozen seam (D5): knows nothing about arena, hills, or scoring.

const CREATURE = (() => {
  const stats = { total: 0, fallback: 0 };
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

  function polygonSelfIntersects(pts) {
    const n = pts.length;
    function ccw(a, b, c) { return (c.y - a.y) * (b.x - a.x) - (b.y - a.y) * (c.x - a.x); }
    function segInt(p1, p2, p3, p4) {
      const d1 = ccw(p3, p4, p1), d2 = ccw(p3, p4, p2), d3 = ccw(p1, p2, p3), d4 = ccw(p1, p2, p4);
      return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
        if (segInt(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
      }
    }
    return false;
  }

  // Sanitizer + poly-decomp attempt. Returns array of convex parts, or null on any failure
  // (self-intersection, sliver, decomp exception, zero parts) — caller falls back to hull.
  function tryDecompose(outline) {
    try {
      if (outline.length < 3) return null;
      if (Math.abs(Matter.Vertices.area(outline)) < 20) return null;
      if (polygonSelfIntersects(outline)) return null;

      const raw = decomp.quickDecomp(outline.map(p => [p.x, p.y]));
      if (!raw || raw.length === 0) return null;

      const parts = raw
        .map(part => capVertices(part.map(v => ({ x: v[0], y: v[1] })), 24))
        .filter(v => v.length >= 3 && Math.abs(Matter.Vertices.area(v)) > 20);

      return parts.length > 0 ? parts : null;
    } catch (e) {
      return null;
    }
  }

  function fromStrokes(rawStrokes) {
    const strokes = decimateAll(rawStrokes);
    const allPoints = strokes.flat();

    stats.total++;
    let parts = tryDecompose(allPoints);
    let area, perimeterPoly;

    if (parts) {
      perimeterPoly = allPoints;
      area = Math.abs(Matter.Vertices.area(allPoints));
    } else {
      stats.fallback++;
      let hull = Matter.Vertices.hull(allPoints);
      hull = capVertices(hull, 24);
      parts = [hull];
      perimeterPoly = hull;
      area = Math.abs(Matter.Vertices.area(hull));
    }
    console.log(`creature: fallback ${stats.fallback}/${stats.total} (${Math.round(100 * stats.fallback / stats.total)}%)`);

    let perimeter = 0;
    for (let i = 0; i < perimeterPoly.length; i++) {
      const a = perimeterPoly[i], b = perimeterPoly[(i + 1) % perimeterPoly.length];
      perimeter += Math.hypot(b.x - a.x, b.y - a.y);
    }
    const isoperimetricRatio = (perimeter * perimeter) / (4 * Math.PI * area);
    const grip = Math.min(0.9, Math.max(0.3, 0.3 + 0.5 * (isoperimetricRatio - 1)));

    const xs = allPoints.map(p => p.x), ys = allPoints.map(p => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys) || 1;
    const aspectRatio = w / h;

    const scale = Math.sqrt(9000 / area);
    const scaledParts = parts.map(part => part.map(p => ({ x: p.x * scale, y: p.y * scale })));
    const centre = Matter.Vertices.centre(scaledParts.flat());

    const body = Matter.Bodies.fromVertices(0, 0, scaledParts, {
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

  return { fromStrokes, stats };
})();
