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

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ================= SMOOTH DRAW =================
function drawSmoothStroke(points) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  ctx.stroke();
}

// ================= REDRAW =================
function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "black";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  strokes.forEach(stroke => drawSmoothStroke(stroke));
  drawSmoothStroke(currentStroke);
}

// ================= ERASE =================
function eraseAt(x, y) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(x, y, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ================= MAIN =================
hands.onResults(results => {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    if (isDrawing && currentStroke.length > 0) {
      strokes.push([...currentStroke]);
    }
    currentStroke = [];
    isDrawing = false;
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

  const palmX = lm[9].x * canvas.width;
  const palmY = lm[9].y * canvas.height;

  // Fingers open
  const fingersOpen =
    isFingerOpen(index, indexPip) &&
    isFingerOpen(middle, middlePip) &&
    isFingerOpen(ring, ringPip) &&
    isFingerOpen(pinky, pinkyPip);

  // Fingers close together (eraser condition)
  const fingersClose =
    distance(index, middle) < 0.04 &&
    distance(middle, ring) < 0.04 &&
    distance(ring, pinky) < 0.04;

  const pinchDistance = distance(index, thumb);

  // ✏️ DRAW — ONLY WHILE PINCH IS CLOSED
  if (pinchDistance < 0.045 && !fingersOpen) {
    if (!isDrawing) {
      // Start new stroke EXACTLY at pinch point
      currentStroke = [{ x, y }];
      isDrawing = true;
    } else {
      currentStroke.push({ x, y });
    }
  }

  // ✋ ERASE — OPEN PALM + FINGERS CLOSE
  else if (fingersOpen && fingersClose) {
    if (isDrawing && currentStroke.length > 0) {
      strokes.push([...currentStroke]);
      currentStroke = [];
    }
    isDrawing = false;
    eraseAt(palmX, palmY);
  }

  // ✊ STOP DRAWING
  else {
    if (isDrawing && currentStroke.length > 0) {
      strokes.push([...currentStroke]);
    }
    currentStroke = [];
    isDrawing = false;
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
