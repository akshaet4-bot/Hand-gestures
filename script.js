const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ================= MEMORY =================
let strokes = [];
let currentStroke = [];
let isDrawing = false;

// ================= MEDIAPIPE =================
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

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// 🧠 Smooth points (removes shaky noise)
function smoothStroke(points, threshold = 2) {
  if (points.length < 2) return points;
  const smooth = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (dist(points[i], smooth[smooth.length - 1]) > threshold) {
      smooth.push(points[i]);
    }
  }
  return smooth;
}

// ================= DRAW =================
function drawSmoothStroke(points) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
  }
  ctx.stroke();
}

// ================= REDRAW =================
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "black";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  strokes.forEach(s => drawSmoothStroke(s));
  drawSmoothStroke(currentStroke);
}

// ================= ERASE FROM MEMORY =================
function eraseFromStrokes(x, y, radius = 35) {
  strokes = strokes.map(stroke =>
    stroke.filter(p => dist(p, { x, y }) > radius)
  ).filter(stroke => stroke.length > 1);
}

// ================= MAIN =================
hands.onResults(results => {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    if (isDrawing && currentStroke.length > 0) {
      strokes.push(smoothStroke(currentStroke));
    }
    currentStroke = [];
    isDrawing = false;
    redraw();
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

  // 🔥 FIXED COORDINATES (MATCH PINCH POINT)
  const x = (1 - index.x) * canvas.width;
  const y = index.y * canvas.height;

  const palmX = (1 - lm[9].x) * canvas.width;
  const palmY = lm[9].y * canvas.height;

  const fingersOpen =
    isFingerOpen(index, indexPip) &&
    isFingerOpen(middle, middlePip) &&
    isFingerOpen(ring, ringPip) &&
    isFingerOpen(pinky, pinkyPip);

  const fingersClose =
    dist(index, middle) < 0.045 &&
    dist(middle, ring) < 0.045 &&
    dist(ring, pinky) < 0.045;

  const pinch = dist(index, thumb);

  // ✏️ DRAW (PINCH)
  if (pinch < 0.045 && !fingersOpen) {
    if (!isDrawing) {
      currentStroke = [{ x, y }];
      isDrawing = true;
    } else {
      currentStroke.push({ x, y });
    }
  }

  // ✋ ERASE (OPEN PALM + FINGERS CLOSE)
  else if (fingersOpen && fingersClose) {
    if (isDrawing && currentStroke.length > 0) {
      strokes.push(smoothStroke(currentStroke));
      currentStroke = [];
    }
    isDrawing = false;
    eraseFromStrokes(palmX, palmY);
  }

  // ✊ STOP
  else {
    if (isDrawing && currentStroke.length > 0) {
      strokes.push(smoothStroke(currentStroke));
    }
    currentStroke = [];
    isDrawing = false;
  }

  redraw();
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
