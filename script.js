const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let drawing = false;
let prevX = null, prevY = null;

const hands = new Hands({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    const indexFinger = landmarks[8];
    const thumb = landmarks[4];

    let x = indexFinger.x * canvas.width;
    let y = indexFinger.y * canvas.height;

    let distance = Math.hypot(
      indexFinger.x - thumb.x,
      indexFinger.y - thumb.y
    );

    // ✏️ Pinch = Draw
    if (distance < 0.05) {
      drawing = true;
      if (prevX) {
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    } else {
      drawing = false;
      prevX = null;
      prevY = null;
    }

    prevX = x;
    prevY = y;
  }
});

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 640,
  height: 480
});

camera.start();
