const video = document.querySelector(".input_video");
const fxCanvas = document.getElementById("fxCanvas");
const drawCanvas = document.getElementById("drawCanvas");
const fxCtx = fxCanvas.getContext("2d");
const drawCtx = drawCanvas.getContext("2d");
const modeUI = document.getElementById("mode");
const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");
const ui = document.getElementById("ui");

function resize() {
  fxCanvas.width = drawCanvas.width = window.innerWidth;
  fxCanvas.height = drawCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

let MODE = "PATTERN";
let lastX = null, lastY = null;
let pinchActive = false;
let camera;

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

/* START CAMERA ONLY AFTER USER TAP */
startBtn.addEventListener("click", () => {
  startScreen.style.display = "none";
  ui.hidden = false;

  camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480
  });

  camera.start();
});

function onResults(results) {
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  if (!results.multiHandLandmarks) return;

  const lm = results.multiHandLandmarks[0];
  const index = lm[8];
  const thumb = lm[4];

  const x = index.x * fxCanvas.width;
  const y = index.y * fxCanvas.height;

  const pinchDist = Math.hypot(index.x - thumb.x, index.y - thumb.y);

  if (pinchDist < 0.06 && !pinchActive) {
    pinchActive = true;
    MODE = MODE === "DRAW" ? "PATTERN" : "DRAW";
  }
  if (pinchDist > 0.09) pinchActive = false;

  modeUI.textContent = "MODE: " + MODE;

  if (MODE === "DRAW") drawAir(x, y);
  if (MODE === "PATTERN") drawBox(x, y);
}

function drawAir(x, y) {
  drawCtx.strokeStyle = "rgba(0,255,255,0.9)";
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

function drawBox(x, y) {
  fxCtx.strokeStyle = "rgba(0,255,255,0.6)";
  fxCtx.lineWidth = 2;
  fxCtx.shadowColor = "cyan";
  fxCtx.shadowBlur = 25;
  fxCtx.strokeRect(x - 50, y - 50, 100, 100);
}
