const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Drawing state
let prevX = null;
let prevY = null;

// MediaPipe Hands
const hands = new Hands({
  locateFile: file =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

// Helper: check finger open
function isFingerOpen(tip, pip) {
  return tip.y < pip.y;
}

hands.onResults(results => {
  // ❌ DO NOT clear canvas every frame (or drawing will vanish)
  // ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    prevX = null;
    prevY = null;
    return;
  }

  const lm = results.multiHandLandmarks[0];

  const index = lm[8];
  const thumb = lm[4];
  const middle = lm[12];
  const ring = lm[16];
  const pinky = lm[20];

  const indexPip = lm[6];
  const middlePip = lm[10];
  const ringPip = lm[14];
  const pinkyPip = lm[18];

  const x = index.x * canvas.width;
  const y = index.y * canvas.height;

  // Finger states
  const indexOpen = isFingerOpen(index, indexPip);
  const middleOpen = isFingerOpen(middle, middlePip);
  const ringOpen = isFingerOpen(ring, ringPip);
  const pinkyOpen = isFingerOpen(pinky, pinkyPip);

  const allFingersOpen =
    indexOpen && middleOpen && ringOpen && pinkyOpen;

  // Pinch distance
  const pinchDistance = Math.hypot(
    index.x - thumb.x,
    index.y - thumb.y
  );

  // ✏️ DRAW (Pinch gesture)
  if (pinchDistance < 0.05) {
    if (prevX !== null) {
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    prevX = x;
    prevY = y;
  }

  // ✋ ERASE (Open Palm)
  else if (allFingersOpen) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    prevX = null;
    prevY = null;
  }

  // ✊ STOP DRAWING
  else {
    prevX = null;
    prevY = null;
  }
});

// Camera start
const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 640,
  height: 480
});

camera.start();
