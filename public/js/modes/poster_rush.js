/**
 * TYPE IN MOTION - Modalidad 3: POSTER RUSH
 * Los jugadores componen libremente un cartel tipográfico editorial 3D
 * combinando letras tridimensionales y figuras geométricas de Blender.
 */

import * as THREE from 'three';

export class PosterRushMode {
  constructor(challengeData, onProgressUpdate, onPosterSubmit) {
    this.engine = null;
    this.challenge = challengeData;
    this.onProgressUpdate = onProgressUpdate;
    this.onPosterSubmit = onPosterSubmit;

    this.rootGroup = new THREE.Group();
    this.posterGroup = new THREE.Group();
    this.elements = [];

    this.grabbedElement = null;
    this.grabOffset = new THREE.Vector3();
    this.wasPinching = false;
    this.activeColorHex = 0x0038FF; // Azul eléctrico inicial

    this.score = 300;
  }

  async init(engine) {
    this.engine = engine;
    this.engine.scene.add(this.rootGroup);
    this.rootGroup.add(this.posterGroup);

    // 1. Lienzo del póster 3D (Proporción vertical editorial 3:4)
    const posterWidth = 7.0;
    const posterHeight = 9.2;

    const canvasGeom = new THREE.PlaneGeometry(posterWidth, posterHeight);
    const canvasMat = new THREE.MeshStandardMaterial({
      color: 0xF5F2EB, // Crema editorial
      roughness: 0.9,
      metalness: 0.0
    });
    this.posterCanvas = new THREE.Mesh(canvasGeom, canvasMat);
    this.posterCanvas.position.set(0, 0, -0.3);
    this.posterCanvas.receiveShadow = true;
    this.posterGroup.add(this.posterCanvas);

    // Marco exterior minimalista (Negro editorial)
    const frameGeom = new THREE.EdgesGeometry(canvasGeom);
    const frameMat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 3 });
    const frame = new THREE.LineSegments(frameGeom, frameMat);
    frame.position.copy(this.posterCanvas.position);
    this.posterGroup.add(frame);

    // 2. Spawn inicial de elementos de bienvenida
    await this.spawnElement('letter_T', -1.8, 2.2, 0x0038FF);
    await this.spawnElement('letter_Y', -0.6, 2.2, 0xFF5500);
    await this.spawnElement('letter_P', 0.6, 2.2, 0x111111);
    await this.spawnElement('letter_E', 1.8, 2.2, 0xCCFF00);
    await this.spawnElement('torus_ring', 2.0, -2.0, 0xCCFF00);
    await this.spawnElement('beveled_cube', -2.0, -1.8, 0xFF5500);

    this.setupUI();
  }

  setupUI() {
    const bar = document.getElementById('poster-tools-bar');
    if (bar) bar.style.display = 'flex';

    // Vincular botones de spawn
    document.querySelectorAll('.btn-spawn-item').forEach((btn) => {
      btn.onclick = () => {
        const item = btn.dataset.item;
        this.spawnElement(item, 0, 0, this.activeColorHex);
      };
    });

    // Vincular swatches de color
    document.querySelectorAll('.color-swatch').forEach((swatch) => {
      swatch.onclick = () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.activeColorHex = parseInt(swatch.dataset.color, 16);

        // Si hay elemento seleccionado, cambiarle el color
        if (this.grabbedElement) {
          this.applyColor(this.grabbedElement, this.activeColorHex);
        }
      };
    });

    // Botón de Enviar Póster
    const submitBtn = document.getElementById('btn-submit-poster');
    if (submitBtn) {
      submitBtn.onclick = () => this.finalizePoster();
    }
  }

  async spawnElement(modelName, x, y, colorHex) {
    const model = await this.engine.loadModel(modelName);
    model.position.set(x, y, 0.1);
    model.scale.set(1.2, 1.2, 1.2);

    if (colorHex) {
      this.applyColor(model, colorHex);
    }

    model.userData = {
      isPosterElement: true,
      modelName: modelName
    };

    this.posterGroup.add(model);
    this.elements.push(model);

    if (window.soundEngine) window.soundEngine.playGrab();

    // Actualizar puntaje de composición
    this.score += 150;
    const progress = Math.min(100, Math.round((this.elements.length / 10) * 100));
    if (this.onProgressUpdate) {
      this.onProgressUpdate(progress, this.score);
    }
  }

  applyColor(object, colorHex) {
    object.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.15,
          metalness: 0.05
        });
      }
    });
  }

  onHandUpdate(handPoint3D, primaryHand) {
    if (!handPoint3D || !primaryHand.active) {
      if (this.grabbedElement) this.releaseElement();
      return;
    }

    if (primaryHand.isPinching && !this.wasPinching) {
      this.tryGrab(handPoint3D);
    } else if (primaryHand.isPinching && this.grabbedElement) {
      // Arrastrar dentro de los límites del póster
      const clampedX = Math.max(-3.0, Math.min(3.0, handPoint3D.x + this.grabOffset.x));
      const clampedY = Math.max(-4.0, Math.min(4.0, handPoint3D.y + this.grabOffset.y));
      this.grabbedElement.position.x = clampedX;
      this.grabbedElement.position.y = clampedY;
      this.grabbedElement.position.z = 0.5; // Flotar sobre el póster
    } else if (!primaryHand.isPinching && this.wasPinching) {
      this.releaseElement();
    }

    this.wasPinching = primaryHand.isPinching;
  }

  tryGrab(handPoint3D) {
    let closest = null;
    let minDist = 1.2;

    for (const elem of this.elements) {
      const d = elem.position.distanceTo(handPoint3D);
      if (d < minDist) {
        minDist = d;
        closest = elem;
      }
    }

    if (closest) {
      this.grabbedElement = closest;
      this.grabOffset.subVectors(closest.position, handPoint3D);
      if (window.soundEngine) window.soundEngine.playGrab();
    }
  }

  releaseElement() {
    if (this.grabbedElement) {
      this.grabbedElement.position.z = 0.1;
      if (window.soundEngine) window.soundEngine.playDrop();
      this.grabbedElement = null;
    }
  }

  finalizePoster() {
    if (window.soundEngine) window.soundEngine.playSuccess();

    // Capturar snapshot del lienzo WebGL
    const snapshotDataUrl = this.engine.getCanvasSnapshot();

    if (this.onPosterSubmit) {
      this.onPosterSubmit(snapshotDataUrl, this.score);
    }
  }

  update(delta) {
    // Animación suave de elementos libres
    const time = performance.now() * 0.001;
    this.elements.forEach((elem, i) => {
      if (elem !== this.grabbedElement) {
        elem.rotation.z += Math.sin(time + i) * 0.002;
      }
    });
  }

  destroy() {
    const bar = document.getElementById('poster-tools-bar');
    if (bar) bar.style.display = 'none';

    if (this.engine && this.rootGroup) {
      this.engine.scene.remove(this.rootGroup);
    }
  }
}
