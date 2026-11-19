/**
 * TYPE IN MOTION - Modalidad 1: FIX THE TYPE (v2.0)
 * Los jugadores deben agarrar y ordenar letras 3D desordenadas
 * para formar la palabra objetivo correctamente.
 * Vista 100% frontal, orientación vertical perfecta y paleta cálida.
 */

import * as THREE from 'three';

export class FixTheTypeMode {
  constructor(challengeData, onProgressUpdate) {
    this.engine = null;
    this.challenge = challengeData; // { word: "MOTION", shuffledLetters: [...] }
    this.onProgressUpdate = onProgressUpdate;

    this.rootGroup = new THREE.Group();
    this.slots = [];
    this.letterObjects = [];
    this.grabbedLetter = null;
    this.grabOffset = new THREE.Vector3();
    this.wasPinching = false;

    this.placedCount = 0;
  }

  async init(engine) {
    this.engine = engine;
    this.engine.scene.add(this.rootGroup);

    const word = this.challenge.word;
    const letters = this.challenge.shuffledLetters || word.split('');
    const numLetters = word.length;
    const spacing = 1.6;
    const startX = -((numLetters - 1) * spacing) / 2;

    // 1. Crear slots receptores en la parte superior/media
    for (let i = 0; i < numLetters; i++) {
      const slotX = startX + i * spacing;
      const slotY = 1.4;

      // Base receptora cuadrada estilo editorial
      const slotGeom = new THREE.PlaneGeometry(1.35, 1.6);
      const slotMat = new THREE.MeshBasicMaterial({
        color: this.engine.colors.cream,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      });
      const slotMesh = new THREE.Mesh(slotGeom, slotMat);
      slotMesh.position.set(slotX, slotY, -0.05);
      this.rootGroup.add(slotMesh);

      // Borde de slot en naranja editorial
      const edges = new THREE.EdgesGeometry(slotGeom);
      const lineMat = new THREE.LineBasicMaterial({
        color: this.engine.colors.orange,
        linewidth: 2
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.position.copy(slotMesh.position);
      this.rootGroup.add(wireframe);

      this.slots.push({
        index: i,
        expectedChar: word[i],
        x: slotX,
        y: slotY,
        occupied: false,
        mesh: slotMesh,
        wireframe: wireframe
      });
    }

    // 2. Cargar letras 3D desordenadas (abajo) con orientación vertical frontal
    for (let i = 0; i < letters.length; i++) {
      const char = letters[i];
      const model = await this.engine.loadModel(`letter_${char}`);

      // Posición inicial repartida horizontalmente en área inferior
      const spreadX = startX + i * spacing + (Math.random() - 0.5) * 0.4;
      const spawnY = -2.2 + (i % 2 === 0 ? 0.35 : -0.35);

      model.position.set(spreadX, spawnY, 0.1);
      model.scale.set(1.4, 1.4, 1.4);
      // Mantener rotación Z en 0 para legibilidad vertical frontal absoluta
      model.rotation.set(0, 0, 0);

      model.userData = {
        char: char,
        initialY: spawnY,
        floatSeed: Math.random() * 100,
        isPlaced: false,
        targetSlot: null
      };

      this.rootGroup.add(model);
      this.letterObjects.push(model);
    }

    console.log(`[FIX THE TYPE] Reto iniciado: Palabra "${word}" con ${numLetters} letras.`);
  }

  onHandUpdate(handPoint3D, primaryHand) {
    if (!handPoint3D || !primaryHand.active) {
      if (this.grabbedLetter) {
        this.releaseLetter();
      }
      return;
    }

    // Detectar transición de pellizco (Pinch Down)
    if (primaryHand.isPinching && !this.wasPinching) {
      this.tryGrabLetter(handPoint3D);
    } 
    // Mover letra agarrada
    else if (primaryHand.isPinching && this.grabbedLetter) {
      this.grabbedLetter.position.x = handPoint3D.x + this.grabOffset.x;
      this.grabbedLetter.position.y = handPoint3D.y + this.grabOffset.y;
      this.grabbedLetter.position.z = 0.5; // Elevar ligeramente al arrastrar
    } 
    // Soltar letra (Pinch Up)
    else if (!primaryHand.isPinching && this.wasPinching) {
      this.releaseLetter();
    }

    this.wasPinching = primaryHand.isPinching;
  }

  tryGrabLetter(handPoint3D) {
    let closest = null;
    let minDistance = 1.4; // Radio de atracción del agarre

    for (const letter of this.letterObjects) {
      if (letter.userData.isPlaced) continue; // Ya no se mueve si encajó
      const dist = Math.hypot(letter.position.x - handPoint3D.x, letter.position.y - handPoint3D.y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = letter;
      }
    }

    if (closest) {
      this.grabbedLetter = closest;
      this.grabOffset.set(
        closest.position.x - handPoint3D.x,
        closest.position.y - handPoint3D.y,
        0
      );
      if (window.soundEngine) window.soundEngine.playGrab();
    }
  }

  releaseLetter() {
    if (!this.grabbedLetter) return;

    const letter = this.grabbedLetter;
    const char = letter.userData.char;

    // Buscar si está cerca de algún slot válido
    let snapped = false;
    for (const slot of this.slots) {
      if (!slot.occupied && slot.expectedChar === char) {
        const dist = Math.hypot(letter.position.x - slot.x, letter.position.y - slot.y);
        if (dist < 1.1) { // Radio de encaje
          // ¡Encaje exitoso!
          letter.position.set(slot.x, slot.y, 0.1);
          letter.scale.set(1.5, 1.5, 1.5);
          letter.userData.isPlaced = true;
          slot.occupied = true;
          snapped = true;
          this.placedCount++;

          if (window.soundEngine) window.soundEngine.playSnap();

          // Efecto visual cálido en slot
          slot.mesh.material.color.setHex(this.engine.colors.yellow);
          slot.mesh.material.opacity = 1.0;
          slot.wireframe.material.color.setHex(this.engine.colors.red);

          // Notificar progreso al servidor
          const progress = Math.round((this.placedCount / this.slots.length) * 100);
          const score = this.placedCount * 250;
          if (this.onProgressUpdate) {
            this.onProgressUpdate(progress, score);
          }

          if (this.placedCount === this.slots.length) {
            if (window.soundEngine) window.soundEngine.playSuccess();
          }
          break;
        }
      }
    }

    if (!snapped && window.soundEngine) {
      window.soundEngine.playDrop();
    }

    this.grabbedLetter = null;
  }

  update(delta) {
    // Animación suave de flotación vertical sutil
    const time = performance.now() * 0.002;
    for (const letter of this.letterObjects) {
      if (!letter.userData.isPlaced && letter !== this.grabbedLetter) {
        const seed = letter.userData.floatSeed;
        letter.position.y = letter.userData.initialY + Math.sin(time + seed) * 0.08;
      }
    }
  }

  destroy() {
    if (this.engine && this.rootGroup) {
      this.engine.scene.remove(this.rootGroup);
    }
  }
}
