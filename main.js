// Phase 0: skeleton only. Game state machine lands in Phase 1.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / 720, window.innerHeight / 1280);
  canvas.style.width = 720 * scale + 'px';
  canvas.style.height = 1280 * scale + 'px';
}

function checkOrientation() {
  document.body.classList.toggle('landscape', window.innerWidth > window.innerHeight);
}

function resize() {
  checkOrientation();
  fitCanvas();
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

ctx.fillStyle = '#1a1a1a';
ctx.fillRect(0, 0, canvas.width, canvas.height);
