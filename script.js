const video = document.querySelector(".input_video");
const drawCanvas = document.getElementById("drawCanvas");
const fxCanvas = document.getElementById("fxCanvas");
const drawCtx = drawCanvas.getContext("2d");
const fxCtx = fxCanvas.getContext("2d");
const modeUI = document.getElementById("mode");

drawCanvas.width = fxCanvas.width = window.innerWidth;
drawCanvas.height = fxCanvas.height = window.innerHeight;

let MODE = "PATTERN"; // PATTERN | DRAW | PAUSE
let lastX = null, lastY = null;
let pinchActive = false;

const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

const camera = new Camera(video, {
  onFrame: async () => await hands.send({ image: video }),
  width: 640,
  height: 480
});
camera.start();

function onResults(results) {
  fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);

  if (!results.multiHandLandmarks || MODE === "PAUSE") return;

  const lm = results.multiHandLandmarks[0];
  const index = lm[8];
  const thumb = lm[4];
  const middle = lm[12];

  const x = index.x * fxCanvas.width;
  const y = index.y * fxCanvas.height;

  // PINCH DETECTION
  const pinchDist = Math.hypot(index.x-thumb.x, index.y-thumb.y);

  if (pinchDist < 0.05 && !pinchActive) {
    pinchActive = true;
    MODE = MODE === "DRAW" ? "PATTERN" : "DRAW";
  }
  if (pinchDist > 0.08) pinchActive = false;

  modeUI.innerText = "MODE: " + MODE;

  if (MODE === "DRAW") drawAir(x,y);
  if (MODE === "PATTERN") patternFX(x,y,middle);
}

// ✍️ AIR DRAWING
function drawAir(x,y) {
  drawCtx.strokeStyle = "rgba(0,255,255,0.8)";
  drawCtx.lineWidth = 3;
  drawCtx.shadowColor = "cyan";
  drawCtx.shadowBlur = 10;

  if (lastX !== null) {
    drawCtx.beginPath();
    drawCtx.moveTo(lastX,lastY);
    drawCtx.lineTo(x,y);
    drawCtx.stroke();
  }

  lastX = x;
  lastY = y;
}

// 🎨 PATTERN GENERATOR
function patternFX(x,y,middle) {
  const speed = Math.abs(middle.y - 0.5);

  fxCtx.strokeStyle = `rgba(0,255,255,${0.2+speed})`;
  fxCtx.lineWidth = 2;
  fxCtx.shadowBlur = 20;
  fxCtx.shadowColor = "cyan";

  fxCtx.strokeRect(
    x-40-speed*80,
    y-40-speed*80,
    80+speed*160,
    80+speed*160
  );
}

// CLEAR CANVAS (OPEN PALM HOLD)
setInterval(()=>{
  if (MODE === "PATTERN") {
    drawCtx.fillStyle = "rgba(0,0,0,0.05)";
    drawCtx.fillRect(0,0,drawCanvas.width,drawCanvas.height);
  }
},40);
