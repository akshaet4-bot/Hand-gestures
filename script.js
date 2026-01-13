const video = document.querySelector(".input_video");
const fxCanvas = document.getElementById("fxCanvas");
const drawCanvas = document.getElementById("drawCanvas");
const fxCtx = fxCanvas.getContext("2d");
const drawCtx = drawCanvas.getContext("2d");
const modeUI = document.getElementById("mode");

/* Resize handling (VERY IMPORTANT on mobile) */
function resizeCanvas() {
  fxCanvas.width = drawCanvas.width = window.innerWidth;
  fxCanvas.height = drawCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* App state */
let MODE = "PATTERN"; // PATTERN | DRAW
let lastX = null, lastY = null;
let pinchActive = false;

/* MediaPipe Hands */
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

/* Camera */
const camera = new Camera(video, {
  onFrame: async () => {
    try {
      await hands.send({ image: video });
    } catch (e) {
      console.error(e);
    }
  },
  width: 640,
  height: 480
});
camera.start();

/* Main logic */
function onResults(results) {
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

  if (!results.multiHandLandmarks) return;

  const lm = results.multiHandLandmarks[0];
  const index = lm[8];
  const thumb = lm[4];
  const middle = lm[12];

  const x = index.x * fxCanvas.width;
  const y = index.y * fxCanvas.height;

  /* Pinch detection */
  const pinchDist = Math.hypot(index.x - thumb.x, index.y - thumb.y);

  if (pinchDist < 0.06 && !pinchActive) {
    pinchActive = true;
    MODE = MODE === "DRAW" ? "PATTERN" : "DRAW";
  }
  if (pinchDist > 0.09) pinchActive = false;

  modeUI.textContent = `MODE: ${MODE}`;

  if (MODE === "DRAW") airDraw(x, y);
  if (MODE === "PATTERN") drawPattern(x, y, middle.y);
}

/* ✍️ Air Drawing */
function airDraw(x, y) {
  drawCtx.strokeStyle = "rgba(0,255,255,0.85)";
  drawCtx.lineWidth = 3;
  drawCtx.shadowColor = "cyan";
  drawCtx.shadowBlur = 12;

  if (lastX !== null) {
    drawCtx.beginPath();
    drawCtx.moveTo(lastX, lastY);
    drawCtx.lineTo(x, y);
    drawCtx.stroke();
  }

  lastX = x;
  lastY = y;
}

/* 🎨 Pattern Generator */
function drawPattern(x, y, intensity) {
  const size = 60 + intensity * 120;

  fxCtx.strokeStyle = `rgba(0,255,255,${0.2 + intensity})`;
  fxCtx.lineWidth = 2;
  fxCtx.shadowColor = "cyan";
  fxCtx.shadowBlur = 25;

  fxCtx.strokeRect(x - size / 2, y - size / 2, size, size);
}

/* Soft fade effect */
setInterval(() => {
  drawCtx.fillStyle = "rgba(0,0,0,0.04)";
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
}, 40);
