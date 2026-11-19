/**
 * TYPE IN MOTION - Modalidad 5: TYPE POP (Nuevo Reto)
 * Competencia de velocidad, observación y reflejos:
 * Letras 3D flotan y rebotan dinámicamente por la pantalla.
 * El jugador debe identificar y 'reventar' (tocar o pellizcar) la letra objetivo.
 * Cada acierto suma puntos (+200) y reproduce una animación POP divertida;
 * los toques incorrectos descuentan puntos (-50) con retroalimentación visual inmediata.
 */

import * as THREE from 'three';

export class TypePopMode {
  constructor(challengeData, onProgressUpdate) {
    this.engine = null;
    this.challenge = challengeData;
    this.onProgressUpdate = onProgressUpdate;

    this.rootGroup = new THREE.Group();
    this.floatingLetters = [];
    this.popParticles = [];

    // Letra objetivo actual
    this.targetLetter = 'M';
    this.possibleTargets = ['A', 'B', 'C', 'E', 'M', 'O', 'P', 'R', 'S', 'T'];
    this.currentTargetIndex = 0;

    this.score = 0;
    this.hits = 0;
    this.targetHitsToChange = 3;
    this.currentHitsForThisTarget = 0;

    this.speedMultiplier = 1.0;
    this.elapsedTime = 0;
    this.lastTouchTime = 0;
  }

  async init(engine) {
    this.engine = engine;
    this.engine.scene.add(this.rootGroup);

    // Escoger letra objetivo inicial
    this.pickNextTarget();

    // Spawnear 12 letras 3D flotantes simultáneas
    const pool = ['A', 'B', 'C', 'D', 'E', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'Y'];
    for (let i = 0; i < 12; i++) {
      const char = (i % 3 === 0) 
        ? this.targetLetter 
        : pool[Math.floor(Math.random() * pool.length)];

      await this.spawnFloatingLetter(char);
    }

    console.log(`[TYPE POP] Reto iniciado. Letra objetivo inicial: "${this.targetLetter}"`);
  }

  pickNextTarget() {
    // Seleccionar una letra objetivo de la lista
    const filtered = this.possibleTargets.filter(l => l !== this.targetLetter);
    this.targetLetter = filtered[Math.floor(Math.random() * filtered.length)];
    this.currentHitsForThisTarget = 0;

    // Actualizar indicador en UI
    const hint = document.getElementById('current-round-hint');
    if (hint) {
      hint.innerHTML = `¡TOCA O PELLIZCA LA LETRA <strong style="color: #E84442; font-size: 1.3rem; background: #FFD65A; padding: 2px 8px; border-radius: 4px;">${this.targetLetter}</strong>!`;
    }
  }

  async spawnFloatingLetter(char) {
    const model = await this.engine.loadModel(`letter_${char}`);

    // Posición inicial aleatoria dentro de los límites frontales
    const x = (Math.random() - 0.5) * 11.0;
    const y = (Math.random() - 0.5) * 7.5;

    model.position.set(x, y, 0.1);
    model.scale.set(1.4, 1.4, 1.4);
    model.rotation.set(0, 0, 0);

    const speed = 1.2 + Math.random() * 1.5;
    const angle = Math.random() * Math.PI * 2;

    const letterItem = {
      char: char,
      mesh: model,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      isPopping: false,
      popScale: 1.4
    };

    model.userData = letterItem;
    this.rootGroup.add(model);
    this.floatingLetters.push(letterItem);
  }

  onHandUpdate(handPoint3D, primaryHand) {
    if (!handPoint3D || !primaryHand.active) return;

    const now = performance.now();
    if (now - this.lastTouchTime < 180) return; // Debounce entre toques

    const touchRadius = 1.25;

    for (let i = this.floatingLetters.length - 1; i >= 0; i--) {
      const item = this.floatingLetters[i];
      if (item.isPopping) continue;

      const dist = Math.hypot(item.mesh.position.x - handPoint3D.x, item.mesh.position.y - handPoint3D.y);

      // Si la mano toca la letra (o está pellizcando cerca)
      if (dist < touchRadius) {
        this.lastTouchTime = now;

        if (item.char === this.targetLetter) {
          // ¡ACIERTO EXITOSO!
          this.popLetter(item, i);
        } else if (primaryHand.isPinching) {
          // ERROR (tocó letra incorrecta con pellizco)
          this.penalizeLetter(item);
        }
        break;
      }
    }
  }

  popLetter(item, index) {
    item.isPopping = true;
    if (window.soundEngine) window.soundEngine.playPop();

    this.score += 200;
    this.hits++;
    this.currentHitsForThisTarget++;

    // Efecto visual: cambiar material a amarillo brillante
    item.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.color.setHex(this.engine.colors.yellow);
      }
    });

    // Partículas de confeti tipográfico
    this.createPopParticles(item.mesh.position.x, item.mesh.position.y);

    // Progreso dinámico
    const progress = Math.min(100, Math.round((this.hits / 15) * 100));
    if (this.onProgressUpdate) {
      this.onProgressUpdate(progress, this.score);
    }

    // Si ya completó varios aciertos de esta letra, cambiar de objetivo
    if (this.currentHitsForThisTarget >= this.targetHitsToChange) {
      this.pickNextTarget();
    }

    // Reemplazar la letra reventada por otra nueva
    setTimeout(() => {
      this.rootGroup.remove(item.mesh);
      this.floatingLetters.splice(index, 1);
      // Probabilidad alta de incluir la letra objetivo actual
      const nextChar = (Math.random() < 0.45) 
        ? this.targetLetter 
        : this.possibleTargets[Math.floor(Math.random() * this.possibleTargets.length)];
      this.spawnFloatingLetter(nextChar);
    }, 200);
  }

  penalizeLetter(item) {
    if (window.soundEngine) window.soundEngine.playMiss();
    this.score = Math.max(0, this.score - 50);

    // Feedback visual en rojo de error
    item.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.color.setHex(this.engine.colors.red);
      }
    });

    if (this.onProgressUpdate) {
      this.onProgressUpdate(Math.min(100, Math.round((this.hits / 15) * 100)), this.score);
    }

    setTimeout(() => {
      item.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.color.setHex(this.engine.colors.orange);
        }
      });
    }, 300);
  }

  createPopParticles(x, y) {
    const pGroup = new THREE.Group();
    const pCount = 8;
    const pGeom = new THREE.CircleGeometry(0.12, 8);

    for (let i = 0; i < pCount; i++) {
      const angle = (i / pCount) * Math.PI * 2;
      const pMat = new THREE.MeshBasicMaterial({
        color: (i % 2 === 0) ? this.engine.colors.yellow : this.engine.colors.pink,
        side: THREE.DoubleSide
      });
      const pMesh = new THREE.Mesh(pGeom, pMat);
      pMesh.position.set(x, y, 0.2);
      pMesh.userData = {
        vx: Math.cos(angle) * 3.5,
        vy: Math.sin(angle) * 3.5,
        life: 1.0
      };
      pGroup.add(pMesh);
    }

    this.rootGroup.add(pGroup);
    this.popParticles.push(pGroup);
  }

  update(delta) {
    this.elapsedTime += delta;
    // Aumento progresivo de velocidad cada 8 segundos
    this.speedMultiplier = 1.0 + Math.min(1.2, this.elapsedTime * 0.04);

    // Movimiento y rebote de letras en los bordes de la pantalla
    const boundX = 6.8;
    const boundY = 4.4;

    for (const item of this.floatingLetters) {
      if (item.isPopping) {
        // Animación de pop (escalar hacia arriba y desaparecer)
        item.popScale += delta * 6.0;
        item.mesh.scale.set(item.popScale, item.popScale, item.popScale);
        continue;
      }

      item.mesh.position.x += item.vx * this.speedMultiplier * delta;
      item.mesh.position.y += item.vy * this.speedMultiplier * delta;

      // Rebote elástico en bordes horizontales
      if (item.mesh.position.x > boundX) {
        item.mesh.position.x = boundX;
        item.vx = -Math.abs(item.vx);
      } else if (item.mesh.position.x < -boundX) {
        item.mesh.position.x = -boundX;
        item.vx = Math.abs(item.vx);
      }

      // Rebote elástico en bordes verticales
      if (item.mesh.position.y > boundY) {
        item.mesh.position.y = boundY;
        item.vy = -Math.abs(item.vy);
      } else if (item.mesh.position.y < -boundY) {
        item.mesh.position.y = -boundY;
        item.vy = Math.abs(item.vy);
      }
    }

    // Actualizar partículas
    for (let pIdx = this.popParticles.length - 1; pIdx >= 0; pIdx--) {
      const pGroup = this.popParticles[pIdx];
      let anyAlive = false;

      pGroup.children.forEach((pMesh) => {
        pMesh.position.x += pMesh.userData.vx * delta;
        pMesh.position.y += pMesh.userData.vy * delta;
        pMesh.userData.life -= delta * 2.5;
        pMesh.scale.setScalar(Math.max(0, pMesh.userData.life));
        if (pMesh.userData.life > 0) anyAlive = true;
      });

      if (!anyAlive) {
        this.rootGroup.remove(pGroup);
        this.popParticles.splice(pIdx, 1);
      }
    }
  }

  destroy() {
    if (this.engine && this.rootGroup) {
      this.engine.scene.remove(this.rootGroup);
    }
  }
}
