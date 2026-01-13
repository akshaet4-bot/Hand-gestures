const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ================= DRAWING MEMORY =================
let strokes = [];        // All saved drawings
let currentStroke = []; // Current air-writing stroke
let prevX = null;
let prevY = null;

// ================= MEDIAPIPE HANDS =================
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

// ================= HELPERS =================
function isFingerOpen(tip, pip) {
  return tip.y < pip.y;
}

// ================= REDRAW CANVAS =================
function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "red";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  // Draw saved strokes
  strokes.forEach(stroke => {
    ctx.beginPath();
    for (let i = 1; i < stroke.length; i++) {
      ctx.moveTo(stroke[i - 1].x, stroke[i - 1].y);
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  });

  // Draw current stroke
  if (currentStroke.length > 1) {
    ctx.beginPath();
    for (let i = 1; i < currentStroke.length; i++) {
      ctx.moveTo(currentStroke[i - 1].x, currentStroke[i - 1].y);
      ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
    }
    ctx.stroke();
  }
}

// ================= MAIN LOGIC =================
hands.onResults(results => {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    if (currentStroke.length > 0) {
      strokes.push([...currentStroke]);
      currentStroke = [];
    }
    prevX = null;
    prevY = null;
    redrawCanvas();
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
    currentStroke.push({ x, y });
    prevX = x;
    prevY = y;
  }

  // ✋ ERASE ALL (Open Palm)
  else if (allFingersOpen) {
    strokes = [];
    currentStroke = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    prevX = null;
    prevY = null;
  }

  // ✊ STOP DRAWING → SAVE STROKE
  else {
    if (currentStroke.length > 0) {
      strokes.push([...currentStroke]);
      currentStroke = [];
    }
    prevX = null;
    prevY = null;
  }

  redrawCanvas();
});

// ================= CAMERA =================
const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 640,
  height: 480
});

camera.start();
