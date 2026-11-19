/**
 * TYPE IN MOTION - Hand Tracker (MediaPipe + Fallback Mouse)
 * Detecta manos por cámara, calcula pellizco (grab/pinch), estiramiento a dos manos,
 * y ofrece soporte alternativo fluido por mouse si no hay cámara activa.
 */

class HandTracker {
  constructor() {
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.hands = null;
    this.camera = null;

    // Estado de tracking
    this.isCameraActive = false;
    this.isMouseFallback = false;

    // Datos de la mano primaria (para mover/agarrar)
    this.primaryHand = {
      active: false,
      x: 0.5, // 0..1 (normalizado)
      y: 0.5,
      isPinching: false,
      pinchDistance: 1.0
    };

    // Datos para dos manos (para STRETCH IT)
    this.twoHands = {
      active: false,
      hand1: { x: 0.3, y: 0.5 },
      hand2: { x: 0.7, y: 0.5 },
      distance: 0.4,
      verticalDistance: 0.0
    };

    this.onHandUpdate = null; // Callback hacia el motor 3D
  }

  async init(videoElem, canvasElem, onUpdateCallback) {
    this.videoElement = videoElem;
    this.canvasElement = canvasElem;
    this.canvasCtx = canvasElem ? canvasElem.getContext('2d') : null;
    this.onHandUpdate = onUpdateCallback;

    this.setupMouseFallback();

    // Intentar inicializar MediaPipe
    try {
      if (window.Hands) {
        this.hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55
        });

        this.hands.onResults((results) => this.onResults(results));

        if (window.Camera && this.videoElement) {
          this.camera = new window.Camera(this.videoElement, {
            onFrame: async () => {
              if (this.isCameraActive && this.hands) {
                await this.hands.send({ image: this.videoElement });
              }
            },
            width: 320,
            height: 240
          });

          await this.camera.start();
          this.isCameraActive = true;
          this.isMouseFallback = false;
          console.log("[HAND TRACKER] MediaPipe Cámara activada con éxito.");
        }
      } else {
        console.warn("[HAND TRACKER] MediaPipe no disponible, usando modo mouse.");
        this.enableMouseFallback();
      }
    } catch (err) {
      console.warn("[HAND TRACKER] No se pudo acceder a la cámara:", err.message);
      this.enableMouseFallback();
    }
  }

  enableMouseFallback() {
    this.isCameraActive = false;
    this.isMouseFallback = true;
    const badge = document.getElementById('tracking-mode-badge');
    if (badge) {
      badge.textContent = 'Modo: Mouse / Cursor Activo 🖱️';
      badge.classList.add('badge-mouse');
    }
  }

  setupMouseFallback() {
    window.addEventListener('mousemove', (e) => {
      if (!this.isCameraActive || this.isMouseFallback) {
        // Mapear posición de ratón a 0..1
        this.primaryHand.x = e.clientX / window.innerWidth;
        this.primaryHand.y = e.clientY / window.innerHeight;
        this.primaryHand.active = true;

        if (this.onHandUpdate) {
          this.onHandUpdate(this.primaryHand, this.twoHands);
        }
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.isCameraActive || this.isMouseFallback) {
        if (e.button === 0) { // Click izquierdo = agarrar
          this.primaryHand.isPinching = true;
          this.primaryHand.pinchDistance = 0.02;
          if (this.onHandUpdate) {
            this.onHandUpdate(this.primaryHand, this.twoHands);
          }
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (!this.isCameraActive || this.isMouseFallback) {
        this.primaryHand.isPinching = false;
        this.primaryHand.pinchDistance = 0.5;
        if (this.onHandUpdate) {
          this.onHandUpdate(this.primaryHand, this.twoHands);
        }
      }
    });

    // Soporte para simular estiramiento con rueda del mouse
    window.addEventListener('wheel', (e) => {
      if (this.isMouseFallback) {
        const delta = Math.sign(e.deltaY) * -0.05;
        this.twoHands.distance = Math.max(0.1, Math.min(1.0, this.twoHands.distance + delta));
        this.twoHands.active = true;
        if (this.onHandUpdate) {
          this.onHandUpdate(this.primaryHand, this.twoHands);
        }
      }
    }, { passive: true });
  }

  onResults(results) {
    if (!this.canvasCtx || !this.canvasElement) return;

    // Limpiar canvas PIP
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const numHands = results.multiHandLandmarks.length;

      // 1. MANO PRIMARIA
      const lm0 = results.multiHandLandmarks[0];
      // Espejar coordenada X para interacción natural
      const indexTip = lm0[8];
      const thumbTip = lm0[4];

      const handX = 1.0 - indexTip.x;
      const handY = indexTip.y;

      // Distancia euclidiana entre pulgar e índice (pellizco)
      const dx = thumbTip.x - indexTip.x;
      const dy = thumbTip.y - indexTip.y;
      const dz = thumbTip.z - indexTip.z;
      const pinchDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      this.primaryHand.active = true;
      this.primaryHand.x = handX;
      this.primaryHand.y = handY;
      this.primaryHand.pinchDistance = pinchDist;
      this.primaryHand.isPinching = pinchDist < 0.075; // Umbral de agarre

      // 2. DOS MANOS (Para STRETCH IT)
      if (numHands >= 2) {
        const lm1 = results.multiHandLandmarks[1];
        const h1x = 1.0 - lm0[8].x;
        const h1y = lm0[8].y;
        const h2x = 1.0 - lm1[8].x;
        const h2y = lm1[8].y;

        const hdx = h2x - h1x;
        const hdy = h2y - h1y;
        const twoHandDist = Math.sqrt(hdx * hdx + hdy * hdy);

        this.twoHands.active = true;
        this.twoHands.hand1 = { x: h1x, y: h1y };
        this.twoHands.hand2 = { x: h2x, y: h2y };
        this.twoHands.distance = twoHandDist;
        this.twoHands.verticalDistance = Math.abs(hdy);
      } else {
        // Si hay una sola mano, podemos usar el pellizco extendido para estirar
        this.twoHands.active = false;
      }

      // Dibujar esqueleto de mano estilizado en PIP
      for (const landmarks of results.multiHandLandmarks) {
        this.drawHandSkeleton(landmarks, this.primaryHand.isPinching);
      }
    } else {
      this.primaryHand.active = false;
      this.twoHands.active = false;
    }

    this.canvasCtx.restore();

    if (this.onHandUpdate) {
      this.onHandUpdate(this.primaryHand, this.twoHands);
    }
  }

  drawHandSkeleton(landmarks, isPinching) {
    const ctx = this.canvasCtx;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    // Conexiones de dedos
    const connections = [
      [0,1],[1,2],[2,3],[3,4],        // Pulgar
      [0,5],[5,6],[6,7],[7,8],        // Índice
      [5,9],[9,10],[10,11],[11,12],   // Medio
      [9,13],[13,14],[14,15],[15,16], // Anular
      [13,17],[17,18],[18,19],[19,20],[0,17] // Meñique y palma
    ];

    ctx.lineWidth = 2;
    ctx.strokeStyle = isPinching ? '#CCFF00' : 'rgba(0, 56, 255, 0.6)';

    for (const [i, j] of connections) {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo((1.0 - p1.x) * w, p1.y * h);
      ctx.lineTo((1.0 - p2.x) * w, p2.y * h);
      ctx.stroke();
    }

    // Puntos en articulaciones
    landmarks.forEach((p, index) => {
      const px = (1.0 - p.x) * w;
      const py = p.y * h;
      ctx.beginPath();
      ctx.arc(px, py, index === 8 || index === 4 ? 4 : 2, 0, Math.PI * 2);
      ctx.fillStyle = (index === 8 || index === 4) 
        ? (isPinching ? '#CCFF00' : '#FF5500') 
        : '#F5F2EB';
      ctx.fill();
    });
  }
}

window.handTracker = new HandTracker();
