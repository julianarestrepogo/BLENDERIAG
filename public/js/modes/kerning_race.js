/**
 * TYPE IN MOTION - Modalidad 4: KERNING RACE (Nuevo Reto)
 * Competencia de precisión tipográfica: los jugadores ajustan
 * el espaciado horizontal (kerning) entre letras con gestos de agarre
 * para igualar la distribución perfecta de la palabra de referencia.
 */

import * as THREE from 'three';

export class KerningRaceMode {
  constructor(challengeData, onProgressUpdate) {
    this.engine = null;
    this.challenge = challengeData; // { word: "AVALON", referencePositions: [...], initialPositions: [...] }
    this.onProgressUpdate = onProgressUpdate;

    this.rootGroup = new THREE.Group();
    this.refWordGroup = new THREE.Group();
    this.interactiveWordGroup = new THREE.Group();

    this.letters = [];
    this.grabbedLetter = null;
    this.grabOffsetX = 0;
    this.wasPinching = false;

    this.isCompleted = false;
    this.lastSoundTime = 0;
  }

  async init(engine) {
    this.engine = engine;
    this.engine.scene.add(this.rootGroup);
    this.rootGroup.add(this.refWordGroup);
    this.rootGroup.add(this.interactiveWordGroup);

    const word = this.challenge.word || "AVALON";
    const chars = word.split('');
    const numChars = chars.length;

    // Calcular posiciones de referencia balanceadas
    const refSpacing = 1.35;
    const totalRefWidth = (numChars - 1) * refSpacing;
    const startX = -totalRefWidth / 2;

    this.refPositions = [];
    for (let i = 0; i < numChars; i++) {
      this.refPositions.push(startX + i * refSpacing);
    }

    // 1. PALABRA DE REFERENCIA (Arriba, y = 1.8)
    const refBannerGeom = new THREE.PlaneGeometry(totalRefWidth + 3.2, 2.2);
    const refBannerMat = new THREE.MeshBasicMaterial({
      color: this.engine.colors.cream,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const refBanner = new THREE.Mesh(refBannerGeom, refBannerMat);
    refBanner.position.set(0, 1.8, -0.15);
    this.refWordGroup.add(refBanner);

    const refBorderGeom = new THREE.EdgesGeometry(refBannerGeom);
    const refBorderMat = new THREE.LineBasicMaterial({
      color: this.engine.colors.yellow,
      linewidth: 3
    });
    const refBorder = new THREE.LineSegments(refBorderGeom, refBorderMat);
    refBorder.position.copy(refBanner.position);
    this.refWordGroup.add(refBorder);

    // Cargar letras de referencia en gris/carbón sutil
    for (let i = 0; i < numChars; i++) {
      const char = chars[i];
      const model = await this.engine.loadModel(`letter_${char}`);
      model.position.set(this.refPositions[i], 1.8, 0.05);
      model.scale.set(1.15, 1.15, 1.15);
      model.rotation.set(0, 0, 0);

      // Material sutil de referencia
      model.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: this.engine.colors.dark,
            roughness: 0.4
          });
        }
      });
      this.refWordGroup.add(model);
    }

    // 2. PALABRA INTERACTIVA CON ESPACIADO IRREGULAR (Abajo, y = -1.2)
    // Línea guía de base
    const baselineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startX - 2.0, -1.8, 0),
      new THREE.Vector3(-startX + 2.0, -1.8, 0)
    ]);
    const baselineMat = new THREE.LineDashedMaterial({
      color: this.engine.colors.orange,
      dashSize: 0.3,
      gapSize: 0.15,
      linewidth: 2
    });
    const baseline = new THREE.Line(baselineGeom, baselineMat);
    baseline.computeLineDistances();
    this.interactiveWordGroup.add(baseline);

    // Generar posiciones iniciales visiblemente desordenadas/mal espaciadas
    for (let i = 0; i < numChars; i++) {
      const char = chars[i];
      const model = await this.engine.loadModel(`letter_${char}`);

      // Desplazamiento irregular en X (espaciado defectuoso a corregir)
      let initialOffset = 0;
      if (i > 0) {
        // Alternar entre muy pegadas o muy separadas
        const badGaps = [-0.65, 0.75, -0.55, 0.85, -0.7];
        initialOffset = badGaps[(i - 1) % badGaps.length];
      }
      const initialX = this.refPositions[i] + initialOffset;

      model.position.set(initialX, -1.2, 0.1);
      model.scale.set(1.4, 1.4, 1.4);
      model.rotation.set(0, 0, 0);

      const letterData = {
        index: i,
        char: char,
        mesh: model,
        targetX: this.refPositions[i]
      };
      model.userData = letterData;

      this.interactiveWordGroup.add(model);
      this.letters.push(letterData);
    }

    // Mostrar HUD específico
    const meter = document.getElementById('stretch-accuracy-meter');
    if (meter) meter.style.display = 'block';

    console.log(`[KERNING RACE] Reto iniciado para: ${word}`);
    this.checkAccuracy();
  }

  onHandUpdate(handPoint3D, primaryHand) {
    if (this.isCompleted || !handPoint3D || !primaryHand.active) {
      if (this.grabbedLetter) {
        this.grabbedLetter = null;
        if (window.soundEngine) window.soundEngine.playDrop();
      }
      return;
    }

    if (primaryHand.isPinching && !this.wasPinching) {
      // Intentar agarrar la letra más cercana
      let closest = null;
      let minDist = 1.3;

      for (const item of this.letters) {
        const dist = Math.hypot(item.mesh.position.x - handPoint3D.x, item.mesh.position.y - handPoint3D.y);
        if (dist < minDist) {
          minDist = dist;
          closest = item;
        }
      }

      if (closest) {
        this.grabbedLetter = closest;
        this.grabOffsetX = closest.mesh.position.x - handPoint3D.x;
        if (window.soundEngine) window.soundEngine.playGrab();
      }
    } else if (primaryHand.isPinching && this.grabbedLetter) {
      // Desplazamiento horizontal para ajustar el kerning
      const newX = handPoint3D.x + this.grabOffsetX;
      // Límites laterales de la pantalla
      const clampedX = Math.max(-6.5, Math.min(6.5, newX));
      this.grabbedLetter.mesh.position.x = clampedX;

      // Sonido de ajuste
      const now = performance.now();
      if (now - this.lastSoundTime > 120) {
        if (window.soundEngine) window.soundEngine.playKerning();
        this.lastSoundTime = now;
      }

      this.checkAccuracy();
    } else if (!primaryHand.isPinching && this.wasPinching) {
      if (this.grabbedLetter) {
        this.grabbedLetter = null;
        if (window.soundEngine) window.soundEngine.playDrop();
      }
    }

    this.wasPinching = primaryHand.isPinching;
  }

  checkAccuracy() {
    let totalError = 0;
    const num = this.letters.length;

    for (let i = 0; i < num; i++) {
      const actualX = this.letters[i].mesh.position.x;
      const targetX = this.letters[i].targetX;
      totalError += Math.abs(actualX - targetX);
    }

    // Promedio de error por letra
    const avgError = totalError / num;
    const maxTolerance = 1.8;
    const accuracy = Math.max(0, Math.min(100, Math.round((1.0 - (avgError / maxTolerance)) * 100)));

    const meter = document.getElementById('stretch-accuracy-fill');
    const text = document.getElementById('stretch-accuracy-text');
    if (meter && text) {
      meter.style.width = `${accuracy}%`;
      text.textContent = `Precisión de Kerning: ${accuracy}%`;
    }

    const currentScore = Math.round(accuracy * 10);
    if (this.onProgressUpdate) {
      this.onProgressUpdate(accuracy, currentScore);
    }

    // Si alcanza una precisión excelente (>= 92%)
    if (accuracy >= 92 && !this.isCompleted) {
      this.isCompleted = true;
      this.onSuccess();
    }
  }

  onSuccess() {
    if (window.soundEngine) window.soundEngine.playSuccess();

    // Resaltar letras en amarillo y naranja de victoria
    this.letters.forEach((item) => {
      item.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.color.setHex(this.engine.colors.yellow);
        }
      });
    });

    if (this.onProgressUpdate) {
      this.onProgressUpdate(100, 1000);
    }
  }

  update(delta) {
    if (this.isCompleted) {
      // Brillo triunfal suave
      const time = performance.now() * 0.005;
      this.letters.forEach((item, idx) => {
        item.mesh.position.y = -1.2 + Math.sin(time + idx * 0.6) * 0.08;
      });
    }
  }

  destroy() {
    const meter = document.getElementById('stretch-accuracy-meter');
    if (meter) meter.style.display = 'none';

    if (this.engine && this.rootGroup) {
      this.engine.scene.remove(this.rootGroup);
    }
  }
}
