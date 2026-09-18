// creature.js — strokes -> physics body (SPEC §4).
// Frozen seam (D5): knows nothing about arena, hills, or scoring.

const CREATURE = (() => {
  const MAX_POINTS = 400;
  const MAX_VERTICES = 24;
  const RIBBON_WIDTH = 6;
  const MAX_SPAN = 240;
  const MIN_AREA = 1;
  const stats = { total: 0, fallback: 0 };

  function samePoint(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function removeConsecutiveDuplicates(points) {
    return points.filter((p, i) => i === 0 || !samePoint(p, points[i - 1]));
  }

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

  // Decimate all strokes together, raising epsilon until total points <= 400.
  function decimateAll(rawStrokes) {
    const clean = rawStrokes.map(removeConsecutiveDuplicates).filter(s => s.length);
    let out = clean.map(s => s.slice());
    let epsilon = 1;
    while (out.reduce((n, s) => n + s.length, 0) > MAX_POINTS) {
      out = clean.map(s => rdp(s, epsilon));
      epsilon *= 1.5;
    }
    return out;
  }

  // A convex polygon stays convex when vertices are removed in winding order.
  function capConvex(vertices) {
    if (vertices.length <= MAX_VERTICES) return vertices;
    const capped = [];
    for (let i = 0; i < MAX_VERTICES; i++) {
      capped.push(vertices[Math.floor(i * vertices.length / MAX_VERTICES)]);
    }
    return capped;
  }

  function strokeRibbon(stroke) {
    const radius = RIBBON_WIDTH / 2;
    if (stroke.length === 1) {
      return Array.from({ length: 8 }, (_, i) => ({
        x: stroke[0].x + Math.cos(i * Math.PI / 4) * radius,
        y: stroke[0].y + Math.sin(i * Math.PI / 4) * radius
      }));
    }

    const normals = [];
    for (let i = 0; i < stroke.length - 1; i++) {
      const dx = stroke[i + 1].x - stroke[i].x;
      const dy = stroke[i + 1].y - stroke[i].y;
      const length = Math.hypot(dx, dy);
      normals.push({ x: -dy / length, y: dx / length });
    }

    const outline = [];
    const add = (p) => {
      if (!outline.length || !samePoint(p, outline[outline.length - 1])) outline.push(p);
    };
    const offset = (p, n, sign) => ({
      x: p.x + n.x * radius * sign,
      y: p.y + n.y * radius * sign
    });
    const addJoin = (i, sign, reverse) => {
      const previous = normals[i - 1], next = normals[i];
      const turn = previous.x * next.y - previous.y * next.x;
      const dot = previous.x * next.x + previous.y * next.y;
      if (Math.abs(turn) < 1e-8 || turn * sign < 0) {
        const first = reverse ? next : previous;
        const second = reverse ? previous : next;
        add(offset(stroke[i], first, sign));
        if (dot < 1 - 1e-8) add(offset(stroke[i], second, sign));
      } else {
        const factor = radius * sign / (1 + dot);
        add({
          x: stroke[i].x + (previous.x + next.x) * factor,
          y: stroke[i].y + (previous.y + next.y) * factor
        });
      }
    };

    add(offset(stroke[0], normals[0], 1));
    for (let i = 1; i < stroke.length - 1; i++) {
      addJoin(i, 1, false);
    }
    const end = stroke[stroke.length - 1];
    add(offset(end, normals[normals.length - 1], 1));

    const endAngle = Math.atan2(normals[normals.length - 1].y, normals[normals.length - 1].x);
    for (let i = 1; i <= 4; i++) {
      const angle = endAngle - Math.PI * i / 4;
      add({ x: end.x + Math.cos(angle) * radius, y: end.y + Math.sin(angle) * radius });
    }

    for (let i = stroke.length - 2; i > 0; i--) {
      addJoin(i, -1, true);
    }
    add(offset(stroke[0], normals[0], -1));

    const startAngle = Math.atan2(-normals[0].y, -normals[0].x);
    for (let i = 1; i < 4; i++) {
      const angle = startAngle - Math.PI * i / 4;
      add({
        x: stroke[0].x + Math.cos(angle) * radius,
        y: stroke[0].y + Math.sin(angle) * radius
      });
    }
    return outline;
  }

  function polygonSelfIntersects(points) {
    const epsilon = 1e-8;
    const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const onSegment = (a, b, p) =>
      Math.abs(cross(a, b, p)) <= epsilon &&
      p.x >= Math.min(a.x, b.x) - epsilon && p.x <= Math.max(a.x, b.x) + epsilon &&
      p.y >= Math.min(a.y, b.y) - epsilon && p.y <= Math.max(a.y, b.y) + epsilon;
    const intersects = (a, b, c, d) => {
      const abC = cross(a, b, c), abD = cross(a, b, d);
      const cdA = cross(c, d, a), cdB = cross(c, d, b);
      if (((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon)) &&
          ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon))) return true;
      return (Math.abs(abC) <= epsilon && onSegment(a, b, c)) ||
             (Math.abs(abD) <= epsilon && onSegment(a, b, d)) ||
             (Math.abs(cdA) <= epsilon && onSegment(c, d, a)) ||
             (Math.abs(cdB) <= epsilon && onSegment(c, d, b));
    };

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) continue;
        if (intersects(points[i], points[(i + 1) % points.length],
                       points[j], points[(j + 1) % points.length])) return true;
      }
    }
    return false;
  }

  function tryDecompose(ribbon) {
    try {
      if (ribbon.length < 3 || Math.abs(Matter.Vertices.area(ribbon)) < MIN_AREA) return null;
      if (polygonSelfIntersects(ribbon)) return null;

      const polygon = ribbon.map(p => [p.x, p.y]);
      decomp.makeCCW(polygon);
      const raw = decomp.quickDecomp(polygon);
      if (!raw || !raw.length) return null;

      const parts = [];
      for (const rawPart of raw) {
        let part = removeConsecutiveDuplicates(rawPart.map(v => ({ x: v[0], y: v[1] })));
        part = capConvex(part);
        if (part.length < 3 || part.length > MAX_VERTICES ||
            Math.abs(Matter.Vertices.area(part)) < MIN_AREA ||
            polygonSelfIntersects(part) || Matter.Vertices.isConvex(part) !== true) return null;
        parts.push(part);
      }
      return parts;
    } catch (e) {
      return null;
    }
  }

  function perimeter(polygon) {
    let length = 0;
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      length += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return length;
  }

  function areaWeightedCentre(parts) {
    let x = 0, y = 0, totalArea = 0;
    parts.forEach(part => {
      const area = Math.abs(Matter.Vertices.area(part));
      const centre = Matter.Vertices.centre(part);
      x += centre.x * area;
      y += centre.y * area;
      totalArea += area;
    });
    return { x: x / totalArea, y: y / totalArea };
  }

  function fromStrokes(rawStrokes) {
    const strokes = decimateAll(rawStrokes);
    const ribbons = strokes.map(strokeRibbon);
    const ribbonVertices = ribbons.flat();

    stats.total++;
    let parts = [];
    let usedFallback = false;
    for (const ribbon of ribbons) {
      const ribbonParts = tryDecompose(ribbon);
      if (!ribbonParts) {
        usedFallback = true;
        break;
      }
      parts.push(...ribbonParts);
    }

    if (usedFallback || !parts.length) {
      stats.fallback++;
      parts = [capConvex(Matter.Vertices.hull(ribbonVertices))];
    }
    console.log(`creature: fallback ${stats.fallback}/${stats.total} (${Math.round(100 * stats.fallback / stats.total)}%)`);

    const gripArea = ribbons.reduce((sum, ribbon) => sum + Math.abs(Matter.Vertices.area(ribbon)), 0);
    const gripPerimeter = ribbons.reduce((sum, ribbon) => sum + perimeter(ribbon), 0);
    const isoperimetricRatio = (gripPerimeter * gripPerimeter) / (4 * Math.PI * gripArea);
    const grip = Math.min(0.9, Math.max(0.3, 0.3 + 0.5 * (isoperimetricRatio - 1)));

    const hull = Matter.Vertices.hull(parts.flat());
    const xs = hull.map(p => p.x), ys = hull.map(p => p.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys) || 1;
    const aspectRatio = width / height;

    // Area-only normalization blows thin strokes up past the 640px platform
    // (a 560px line has ~3400px^2 of ribbon area -> 913px wide). Cap the span.
    // ponytail: leaves such creatures ~2.5px thick. They cannot tunnel the 40px platform
    // at ~10px/tick, but two thin bodies can pass through each other; if that shows up on
    // the phone, build the ribbon at width 6/scale so final thickness is scale-independent.
    const scale = Math.min(
      Math.sqrt(9000 / Math.abs(Matter.Vertices.area(hull))),
      MAX_SPAN / Math.max(width, height)
    );
    const scaledParts = parts.map(part => part.map(p => ({ x: p.x * scale, y: p.y * scale })));
    const centre = areaWeightedCentre(scaledParts);
    const localParts = scaledParts.map(part => part.map(p => ({
      x: p.x - centre.x,
      y: p.y - centre.y
    })));

    const bodyOptions = {
      friction: grip,
      restitution: 0.4,
      frictionAir: 0.01
    };
    const bodyParts = localParts.map(part => Matter.Body.create({
      ...bodyOptions,
      position: Matter.Vertices.centre(part),
      vertices: part
    }));
    const body = bodyParts.length === 1 ? bodyParts[0] : Matter.Body.create({
      ...bodyOptions,
      parts: bodyParts
    });
    Matter.Body.setPosition(body, { x: 0, y: 0 });
    Matter.Body.setMass(body, 1.0);

    const renderStrokes = strokes.map(stroke => stroke.map(p => ({
      x: p.x * scale - centre.x,
      y: p.y * scale - centre.y
    })));

    return {
      body,
      traits: { aspectRatio, grip },
      strokes: renderStrokes,
      source: strokes
    };
  }

  return { fromStrokes, stats };
})();
