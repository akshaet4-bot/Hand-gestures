const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');

let lastScrollY = null;
let pinchActive = false;

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 360,
  height: 480
});

camera.start();

function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks) {
    for (const landmarks of results.multiHandLandmarks) {

      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
      drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });

      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const thumbTip = landmarks[4];

      // 👉 TWO FINGER SCROLL
      if (lastScrollY !== null) {
        const deltaY = (indexTip.y + middleTip.y) / 2 - lastScrollY;
        window.scrollBy(0, deltaY * 500);
      }
      lastScrollY = (indexTip.y + middleTip.y) / 2;

      // 🤏 PINCH CLICK
      const pinchDistance = Math.hypot(
        indexTip.x - thumbTip.x,
        indexTip.y - thumbTip.y
      );

      if (pinchDistance < 0.04 && !pinchActive) {
        pinchActive = true;
        document.elementFromPoint(
          indexTip.x * window.innerWidth,
          indexTip.y * window.innerHeight
        )?.click();
      }

      if (pinchDistance > 0.06) {
        pinchActive = false;
      }
    }
  }

  canvasCtx.restore();
}
