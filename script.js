const video = document.querySelector(".input_video");
const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

let lastX = null;
let lastY = null;

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

/* START CAMERA AFTER USER CLICK */
startBtn.addEventListener("click", () => {
  startScreen.style.display = "none";

  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480
  });

  camera.start();
});

/* MAIN DRAW FUNCTION */
function onResults(results) {
  if (!results.multiHandLandmarks) {
    lastX = lastY = null;
    return;
  }

  const landmarks = results.multiHandLandmarks[0];
  const indexFinger = landmarks[8];

  // Convert to screen coordinates
  const x = indexFinger.x * canvas.width;
  const y = indexFinger.y * canvas.height;

  ctx.strokeStyle = "cyan";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "cyan";
  ctx.shadowBlur = 10;

  if (lastX !== null) {
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  lastX = x;
  lastY = y;
}
