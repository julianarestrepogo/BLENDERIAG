/**
 * TYPE IN MOTION - Modalidad 2: STRETCH IT (v2.0)
 * Los jugadores estiran, comprimen y deforman palabras 3D
 * utilizando los movimientos de sus manos para coincidir con la silueta objetivo.
 * Vista 100% frontal y paleta cálida vibrante.
 */

import * as THREE from 'three';

export class StretchItMode {
  constructor(challengeData, onProgressUpdate) {
    this.engine = null;
    this.challenge = challengeData; // { text: "STRETCH", targetScaleX: 2.8, targetScaleY: 0.6, hint: "..." }
    this.onProgressUpdate = onProgressUpdate;

    this.rootGroup = new THREE.Group();
    this.wordGroup = new THREE.Group();
    this.targetGhostGroup = new THREE.Group();

    this.currentScale = new THREE.Vector2(1.0, 1.0);
    this.targetScale = new THREE.Vector2(
      challengeData.targetScaleX || 2.5,
      challengeData.targetScaleY || 0.6
    );

    this.holdTimer = 0;
    this.isMatched = false;
    this.lastSoundTime = 0;
  }

  async init(engine) {
    this.engine = engine;
    this.engine.scene.add(this.rootGroup);
    this.rootGroup.add(this.targetGhostGroup);
    this.rootGroup.add(this.wordGroup);

    const text = this.challenge.text || "STRETCH";
    const chars = text.split('');
    const spacing = 1.35;
    const startX = -((chars.length - 1) * spacing) / 2;

    // 1. Cargar letras frontales de la palabra activa
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const model = await this.engine.loadModel(`letter_${char}`);
      model.position.set(startX + i * spacing, 0, 0);
      model.scale.set(1.5, 1.5, 1.5);
      model.rotation.set(0, 0, 0);
      this.wordGroup.add(model);
    }

    // 2. Silueta de referencia (Marco frontal tipo editorial en Naranja y Rosado)
    const ghostWidth = Math.abs(startX * 2) * this.targetScale.x + 2.4;
    const ghostHeight = 3.2 * this.targetScale.y;

    const ghostGeom = new THREE.PlaneGeometry(ghostWidth, ghostHeight);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: this.engine.colors.yellow,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const ghostMesh = new THREE.Mesh(ghostGeom, ghostMat);
    ghostMesh.position.set(0, 0, -0.2);
    this.targetGhostGroup.add(ghostMesh);

    // Borde elegante
    const edgeGeom = new THREE.EdgesGeometry(ghostGeom);
    const edgeMat = new THREE.LineBasicMaterial({
      color: this.engine.colors.orange,
      linewidth: 3
    });
    const edgeLines = new THREE.LineSegments(edgeGeom, edgeMat);
    edgeLines.position.copy(ghostMesh.position);
    this.targetGhostGroup.add(edgeLines);

    this.wordGroup.scale.set(1.0, 1.0, 1.0);

    console.log(`[STRETCH IT] Reto iniciado: ${text} | Target: (${this.targetScale.x}, ${this.targetScale.y})`);
  }

  onHandUpdate(handPoint3D, primaryHand, twoHands) {
    if (this.isMatched) return;

    let targetX = this.currentScale.x;
    let targetY = this.currentScale.y;

    // Si hay dos manos activas en cámara
    if (twoHands && twoHands.active) {
      targetX = THREE.MathUtils.lerp(0.4, 3.5, twoHands.distance * 1.8);
      targetY = THREE.MathUtils.lerp(0.3, 3.0, (1.0 - twoHands.distance) * 1.5);
    } 
    // Si hay una sola mano o modo mouse
    else if (primaryHand && primaryHand.active) {
      if (primaryHand.isPinching) {
        const offsetX = Math.abs(handPoint3D.x) * 0.8;
        const offsetY = Math.abs(handPoint3D.y) * 0.8;
        targetX = Math.max(0.4, Math.min(3.5, offsetX * 1.4));
        targetY = Math.max(0.3, Math.min(3.0, offsetY * 1.4));
      } else if (twoHands && typeof twoHands.distance === 'number') {
        targetX = THREE.MathUtils.lerp(0.4, 3.5, twoHands.distance * 2.0);
        targetY = THREE.MathUtils.lerp(0.3, 2.8, (1.0 - twoHands.distance) * 2.0);
      }
    }

    this.currentScale.x = THREE.MathUtils.lerp(this.currentScale.x, targetX, 0.2);
    this.currentScale.y = THREE.MathUtils.lerp(this.currentScale.y, targetY, 0.2);

    this.wordGroup.scale.set(this.currentScale.x, this.currentScale.y, 1.0);

    // Sonido de estiramiento
    const now = performance.now();
    if (now - this.lastSoundTime > 180 && Math.abs(targetX - this.currentScale.x) > 0.05) {
      if (window.soundEngine) window.soundEngine.playStretch(this.currentScale.x / 3.0);
      this.lastSoundTime = now;
    }

    this.checkAccuracy();
  }

  checkAccuracy() {
    const diffX = Math.abs(this.currentScale.x - this.targetScale.x);
    const diffY = Math.abs(this.currentScale.y - this.targetScale.y);

    const maxError = 2.0;
    const totalError = (diffX + diffY) / 2;
    const accuracy = Math.max(0, Math.min(100, Math.round((1 - (totalError / maxError)) * 100)));

    const meter = document.getElementById('stretch-accuracy-fill');
    const text = document.getElementById('stretch-accuracy-text');
    if (meter && text) {
      meter.style.width = `${accuracy}%`;
      text.textContent = `Afinidad Tipográfica: ${accuracy}%`;
    }

    if (this.onProgressUpdate) {
      this.onProgressUpdate(accuracy, Math.round(accuracy * 10));
    }

    if (accuracy >= 88 && !this.isMatched) {
      this.holdTimer += 0.05;
      if (this.holdTimer >= 0.8) {
        this.isMatched = true;
        this.onMatchSuccess();
      }
    } else {
      this.holdTimer = Math.max(0, this.holdTimer - 0.02);
    }
  }

  onMatchSuccess() {
    if (window.soundEngine) window.soundEngine.playSuccess();

    this.wordGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.color.setHex(this.engine.colors.yellow);
      }
    });

    if (this.onProgressUpdate) {
      this.onProgressUpdate(100, 1000);
    }
  }

  update(delta) {
    if (this.isMatched) {
      // Pulso frontal suave de celebración
      const scaleBounce = 1.0 + Math.sin(performance.now() * 0.008) * 0.05;
      this.wordGroup.scale.set(this.currentScale.x * scaleBounce, this.currentScale.y * scaleBounce, 1.0);
    }
  }

  destroy() {
    if (this.engine && this.rootGroup) {
      this.engine.scene.remove(this.rootGroup);
    }
  }
}
