// main.js — state machine + input + rendering (SPEC §7).

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const ui = document.getElementById('ui');

const DRAW_BOX = { x: 80, y: 200, w: 560, h: 560 };
const COLORS = ['#E14B3B', '#2E6FD9'];
const STEP_MS = 1000 / 60;
// PROTOTYPE: short match for the auto-lunge fun test.
const MATCH_TICKS = 480;

let state = 'home';
let strokes = [], currentStroke = null;
let creatures = [null, null];
let countdownStart = 0;
let matchTicks = 0;
let accumulator = 0;
let winnerText = '';

// ---------- layout / resize ----------

function fitCanvas() {
  const scale = Math.min(window.innerWidth / 720, window.innerHeight / 1280);
  const w = 720 * scale + 'px', h = 1280 * scale + 'px';
  canvas.style.width = w; canvas.style.height = h;
  ui.style.width = w; ui.style.height = h;
}

function checkOrientation() {
  document.body.classList.toggle('landscape', window.innerWidth > window.innerHeight);
}

function resize() { checkOrientation(); fitCanvas(); }
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// ---------- UI (DOM buttons, positioned in logical % of 720x1280) ----------

function btn(label, xL, yL, wL, hL, onClick, disabled) {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.left = (xL / 720 * 100) + '%';
  b.style.top = (yL / 1280 * 100) + '%';
  b.style.width = (wL / 720 * 100) + '%';
  b.style.height = (hL / 1280 * 100) + '%';
  b.disabled = !!disabled;
  b.onclick = onClick;
  ui.appendChild(b);
}

function renderUI() {
  ui.innerHTML = '';
  if (state === 'home') {
    btn('PLAY — Same Phone', 160, 700, 400, 80, () => startDraw(0));
    btn('Send Challenge (soon)', 160, 800, 400, 80, () => {}, true);
  } else if (state === 'draw') {
    const canConfirm = strokes.some(s => s.length >= 1);
    btn('Undo', 80, 800, 170, 70, undoStroke);
    btn('Clear', 275, 800, 170, 70, clearStrokes);
    btn('Confirm', 470, 800, 170, 70, confirmDraw, !canConfirm);
  } else if (state === 'handover') {
    const p = creatures[0] ? 2 : 1;
    btn(`Player ${p} ready`, 160, 900, 400, 90, () => startDraw(creatures[0] ? 1 : 0));
  } else if (state === 'result') {
    btn('Rematch', 160, 950, 400, 90, rematch);
  }
}

// ---------- drawing input ----------

function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / rect.width * 720,
    y: (clientY - rect.top) / rect.height * 1280
  };
}

function inBox(p) {
  return p.x >= DRAW_BOX.x && p.x <= DRAW_BOX.x + DRAW_BOX.w &&
         p.y >= DRAW_BOX.y && p.y <= DRAW_BOX.y + DRAW_BOX.h;
}

canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'draw' || currentStroke || strokes.length >= 5) return;
  const p = toLogical(e.clientX, e.clientY);
  if (!inBox(p)) return;
  currentStroke = [{ x: p.x - DRAW_BOX.x, y: p.y - DRAW_BOX.y }];
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!currentStroke) return;
  const p = toLogical(e.clientX, e.clientY);
  currentStroke.push({
    x: Math.min(Math.max(p.x - DRAW_BOX.x, 0), DRAW_BOX.w),
    y: Math.min(Math.max(p.y - DRAW_BOX.y, 0), DRAW_BOX.h)
  });
});

function endStroke() {
  if (currentStroke && currentStroke.length >= 1) strokes.push(currentStroke);
  currentStroke = null;
  renderUI();
}
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);

function undoStroke() { strokes.pop(); renderUI(); }
function clearStrokes() { strokes = []; renderUI(); }

// ---------- state transitions ----------

function startDraw(playerIndex) {
  strokes = []; currentStroke = null;
  state = 'draw';
  drawingPlayer = playerIndex;
  renderUI();
}

let drawingPlayer = 0;

function confirmDraw() {
  creatures[drawingPlayer] = CREATURE.fromStrokes(strokes);
  if (drawingPlayer === 0) {
    state = 'handover';
  } else {
    state = 'countdown';
    countdownStart = performance.now();
  }
  renderUI();
}

function rematch() {
  creatures = [null, null];
  startDraw(0);
}

// ---------- render loop ----------

function drawBoxAndStrokes(colorIndex) {
  ctx.strokeStyle = '#555';
  ctx.strokeRect(DRAW_BOX.x, DRAW_BOX.y, DRAW_BOX.w, DRAW_BOX.h);
  ctx.strokeStyle = COLORS[colorIndex];
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  [...strokes, currentStroke].filter(Boolean).forEach(s => {
    if (s.every(p => p.x === s[0].x && p.y === s[0].y)) {
      ctx.fillStyle = COLORS[colorIndex];
      ctx.beginPath();
      ctx.arc(DRAW_BOX.x + s[0].x, DRAW_BOX.y + s[0].y, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(DRAW_BOX.x + s[0].x, DRAW_BOX.y + s[0].y);
    for (let i = 1; i < s.length; i++) ctx.lineTo(DRAW_BOX.x + s[i].x, DRAW_BOX.y + s[i].y);
    ctx.stroke();
  });
  ctx.lineWidth = 1;
}

function renderCreature(c, colorIndex) {
  const cos = Math.cos(c.body.angle), sin = Math.sin(c.body.angle);
  ctx.strokeStyle = COLORS[colorIndex];
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  c.strokes.forEach(s => {
    if (s.length === 1) {
      ctx.fillStyle = COLORS[colorIndex];
      ctx.beginPath();
      ctx.arc(c.body.position.x + s[0].x * cos - s[0].y * sin,
              c.body.position.y + s[0].x * sin + s[0].y * cos, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    s.forEach((p, i) => {
      const wx = c.body.position.x + p.x * cos - p.y * sin;
      const wy = c.body.position.y + p.x * sin + p.y * cos;
      if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    });
    ctx.stroke();
  });
  ctx.lineWidth = 1;
}

let lastTs = 0;
function frame(ts) {
  const dt = lastTs ? ts - lastTs : 16;
  lastTs = ts;

  ctx.fillStyle = state === 'match' ? '#F5F1E8' : '#1a1a1a';
  ctx.fillRect(0, 0, 720, 1280);

  if (state === 'home') {
    ctx.fillStyle = '#fff';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('เส้นสู้เส้น', 360, 400);
    ctx.font = '20px sans-serif';
    ctx.fillText('line fights line', 360, 440);
    // Cache check: GitHub Pages caches for 10 minutes, so this says which build is running.
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText('build 5', 360, 1240);
  } else if (state === 'draw') {
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS[drawingPlayer];
    ctx.fillText(`Player ${drawingPlayer + 1}, draw your creature`, 360, 130);
    drawBoxAndStrokes(drawingPlayer);
  } else if (state === 'handover') {
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pass the phone', 360, 500);
    ctx.font = '20px sans-serif';
    ctx.fillText('to Player 2', 360, 540);
  } else if (state === 'countdown') {
    const secs = 3 - Math.floor((ts - countdownStart) / 1000);
    if (secs <= 0) {
      state = 'match';
      matchTicks = 0;
      accumulator = 0;
      ARENA.init(creatures);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = '120px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(secs), 360, 660);
    }
  } else if (state === 'match') {
    accumulator += Math.min(dt, 100);
    let steps = 0;
    while (accumulator >= STEP_MS && steps < 6 && matchTicks < MATCH_TICKS) {
      ARENA.update();
      accumulator -= STEP_MS;
      matchTicks++;
      steps++;
    }
    ARENA.render(ctx);
    renderCreature(creatures[0], 0);
    renderCreature(creatures[1], 1);

    const scores = ARENA.getScores();
    ctx.fillStyle = COLORS[0];
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText((scores[0] / 60).toFixed(1), 60, 80);
    ctx.fillStyle = COLORS[1];
    ctx.textAlign = 'right';
    ctx.fillText((scores[1] / 60).toFixed(1), 660, 80);

    if (matchTicks === MATCH_TICKS) {
      const s = ARENA.getScores();
      winnerText = s[0] === s[1] ? 'Tie!' : (s[0] > s[1] ? 'Player 1 wins!' : 'Player 2 wins!');
      console.log('raw scores', s, 'grip', creatures[0].traits.grip, creatures[1].traits.grip);
      state = 'result';
      renderUI();
    }
  } else if (state === 'result') {
    const scores = ARENA.getScores();
    ctx.fillStyle = '#fff';
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(winnerText, 360, 500);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = COLORS[0];
    ctx.fillText(`P1: ${(scores[0] / 60).toFixed(1)}`, 360, 570);
    ctx.fillStyle = COLORS[1];
    ctx.fillText(`P2: ${(scores[1] / 60).toFixed(1)}`, 360, 610);

    ctx.fillStyle = '#888';
    ctx.font = '18px sans-serif';
    ctx.fillText(`raw ${scores[0]}/${scores[1]}  grip ${creatures[0].traits.grip.toFixed(2)}/${creatures[1].traits.grip.toFixed(2)}`, 360, 660);
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
renderUI();
