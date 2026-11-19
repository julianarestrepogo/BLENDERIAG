/**
 * TYPE IN MOTION - Three.js 3D Engine (v2.0)
 * Renderizado 3D con CÁMARA ORTOGRÁFICA TOTALMENTE FRONTAL,
 * sin distorsión de perspectiva, asegurando legibilidad vertical perfecta
 * y correspondencia 1:1 exacta entre el seguimiento de manos y la pantalla.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class GameEngine {
  constructor() {
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.gltfLoader = new GLTFLoader();

    // Dimensiones del frustum ortográfico frontal
    this.frustumHeight = 12.0;
    this.frustumWidth = 16.0;

    // Caché de modelos 3D cargados desde Blender
    this.modelCache = new Map();

    // Raycasting y coordenadas 3D
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Plano visual Z=0 frontal

    // Mano virtual / cursor 3D
    this.handPointer = null;
    this.currentHandPos = new THREE.Vector3(0, 0, 0);

    // Modo de juego activo
    this.currentMode = null;
    this.clock = new THREE.Clock();

    // Nueva paleta cálida, contemporánea y alegre
    this.colors = {
      orange: 0xFF713B,
      yellow: 0xFFD65A,
      pink:   0xFF91B5,
      red:    0xE84442,
      cream:  0xFFF7EB,
      dark:   0x1A1110
    };

    // Materiales plásticos suaves y ligeramente brillantes
    this.materials = {
      orange: new THREE.MeshStandardMaterial({ color: 0xFF713B, roughness: 0.20, metalness: 0.02 }),
      yellow: new THREE.MeshStandardMaterial({ color: 0xFFD65A, roughness: 0.20, metalness: 0.02 }),
      pink:   new THREE.MeshStandardMaterial({ color: 0xFF91B5, roughness: 0.20, metalness: 0.02 }),
      red:    new THREE.MeshStandardMaterial({ color: 0xE84442, roughness: 0.20, metalness: 0.02 }),
      cream:  new THREE.MeshStandardMaterial({ color: 0xFFF7EB, roughness: 0.25, metalness: 0.0 }),
      dark:   new THREE.MeshStandardMaterial({ color: 0x1A1110, roughness: 0.18, metalness: 0.05 })
    };
  }

  init(containerElement) {
    this.container = containerElement;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / height;

    // 1. Escena con fondo crema cálido
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.cream);

    // 2. CÁMARA ORTOGRÁFICA FRONTAL (Elimina distorsión y perspectiva cenital)
    this.frustumWidth = this.frustumHeight * aspect;
    this.camera = new THREE.OrthographicCamera(
      -this.frustumWidth / 2,
      this.frustumWidth / 2,
      this.frustumHeight / 2,
      -this.frustumHeight / 2,
      0.1,
      100
    );
    // Mirando perpendicularmente al plano Z=0 desde el eje Z positivo
    this.camera.position.set(0, 0, 25);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderizador WebGL
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Iluminación frontal de estudio
    this.setupLighting();

    // 5. Puntero de mano
    this.setupHandPointer();

    // 6. Evento de redimensión
    window.addEventListener('resize', () => this.onWindowResize());

    // 7. Loop de animación
    this.animate();

    console.log("[GAME ENGINE] Motor 3D inicializado con Cámara Ortográfica Frontal.");
  }

  setupLighting() {
    // Luz ambiental suave para claridad visual y legibilidad
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    this.scene.add(ambientLight);

    // Luz principal superior-derecha para resaltar biseles y profundidad 3D
    const keyLight = new THREE.DirectionalLight(0xfff6ea, 1.3);
    keyLight.position.set(5, 7, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.scene.add(keyLight);

    // Luz de relleno cálida desde la izquierda
    const fillLight = new THREE.DirectionalLight(0xFFD65A, 0.45);
    fillLight.position.set(-6, -2, 8);
    this.scene.add(fillLight);

    // Luz de acento rosada inferior
    const accentLight = new THREE.DirectionalLight(0xFF91B5, 0.35);
    accentLight.position.set(0, -6, 6);
    this.scene.add(accentLight);
  }

  setupHandPointer() {
    // Anillo exterior y punto central cálido para el seguimiento
    const pointerGroup = new THREE.Group();

    const ringGeom = new THREE.RingGeometry(0.24, 0.30, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.colors.orange,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);

    const dotGeom = new THREE.CircleGeometry(0.12, 24);
    const dotMat = new THREE.MeshBasicMaterial({
      color: this.colors.yellow,
      side: THREE.DoubleSide
    });
    const dot = new THREE.Mesh(dotGeom, dotMat);

    pointerGroup.add(ring);
    pointerGroup.add(dot);
    pointerGroup.position.set(0, 0, 1.5);

    this.handPointer = pointerGroup;
    this.scene.add(this.handPointer);
  }

  // Cargar modelo .glb de Blender y normalizar orientación frontal
  async loadModel(modelName) {
    if (this.modelCache.has(modelName)) {
      return this.modelCache.get(modelName).clone();
    }

    return new Promise((resolve) => {
      const path = `/assets/models/${modelName}.glb`;
      this.gltfLoader.load(
        path,
        (gltf) => {
          const root = gltf.scene;

          // Asegurar sombras y materiales óptimos
          root.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Centrar el objeto en su origen geométrico
          const box = new THREE.Box3().setFromObject(root);
          const center = new THREE.Vector3();
          box.getCenter(center);
          root.position.sub(center);

          const wrapper = new THREE.Group();
          wrapper.add(root);

          this.modelCache.set(modelName, wrapper);
          resolve(wrapper.clone());
        },
        undefined,
        (error) => {
          console.warn(`[3D LOADER] Fallback procedimental para ${modelName}:`, error.message);
          const fallbackMesh = this.createFallbackMesh(modelName);
          resolve(fallbackMesh);
        }
      );
    });
  }

  createFallbackMesh(name) {
    const group = new THREE.Group();
    let geom = new THREE.BoxGeometry(1.2, 1.4, 0.4);
    let mat = this.materials.orange;

    if (name.includes('torus')) {
      geom = new THREE.TorusGeometry(0.8, 0.28, 16, 32);
      mat = this.materials.pink;
    } else if (name.includes('pill') || name.includes('cylinder')) {
      geom = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 24);
      mat = this.materials.yellow;
    } else if (name.includes('cone')) {
      geom = new THREE.ConeGeometry(0.8, 1.5, 24);
      mat = this.materials.red;
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }

  // Mapeo lineal exacto 1:1 entre coordenadas de mano (0..1) y el espacio frontal ortográfico
  updateHand(primaryHand, twoHands) {
    if (!primaryHand.active) {
      if (this.handPointer) this.handPointer.visible = false;
      return;
    }

    if (this.handPointer) this.handPointer.visible = true;

    // Conversión directa a coordenadas ortográficas mundiales
    const worldX = ((primaryHand.x * 2) - 1) * (this.frustumWidth / 2);
    const worldY = (-(primaryHand.y * 2) + 1) * (this.frustumHeight / 2);

    this.currentHandPos.set(worldX, worldY, 0);

    // Suavizado del cursor
    this.handPointer.position.lerp(new THREE.Vector3(worldX, worldY, 1.5), 0.7);

    // Feedback visual en el cursor al pellizcar / agarrar
    if (primaryHand.isPinching) {
      this.handPointer.children[0].material.color.setHex(this.colors.red);
      this.handPointer.children[1].material.color.setHex(this.colors.yellow);
      this.handPointer.scale.set(0.8, 0.8, 0.8);
    } else {
      this.handPointer.children[0].material.color.setHex(this.colors.orange);
      this.handPointer.children[1].material.color.setHex(this.colors.cream);
      this.handPointer.scale.set(1.0, 1.0, 1.0);
    }

    // Notificar al modo activo
    if (this.currentMode && typeof this.currentMode.onHandUpdate === 'function') {
      this.currentMode.onHandUpdate(this.currentHandPos, primaryHand, twoHands);
    }
  }

  setMode(modeInstance) {
    if (this.currentMode && typeof this.currentMode.destroy === 'function') {
      this.currentMode.destroy();
    }
    this.currentMode = modeInstance;
    if (this.currentMode && typeof this.currentMode.init === 'function') {
      this.currentMode.init(this);
    }
  }

  getCanvasSnapshot() {
    return this.renderer.domElement.toDataURL('image/png');
  }

  onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / height;

    this.frustumWidth = this.frustumHeight * aspect;

    this.camera.left = -this.frustumWidth / 2;
    this.camera.right = this.frustumWidth / 2;
    this.camera.top = this.frustumHeight / 2;
    this.camera.bottom = -this.frustumHeight / 2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    if (this.currentMode && typeof this.currentMode.update === 'function') {
      this.currentMode.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

export const gameEngine = new GameEngine();
