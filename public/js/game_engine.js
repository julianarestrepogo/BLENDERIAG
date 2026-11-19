/**
 * TYPE IN MOTION - Three.js 3D Engine
 * Renderiza la escena 3D, carga modelos de Blender (.glb) y gestiona
 * la interacción física y espacial con las manos o el cursor.
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

    // Caché de modelos 3D cargados desde Blender
    this.modelCache = new Map();

    // Raycasting y puntero 3D
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Plano Z=0 para arrastrar

    // Mano virtual / cursor 3D
    this.handPointer = null;
    this.interactiveObjects = [];
    this.grabbedObject = null;
    this.grabOffset = new THREE.Vector3();

    // Modo de juego activo
    this.currentMode = null;
    this.clock = new THREE.Clock();

    // Paleta oficial de materiales
    this.materials = {
      cream: new THREE.MeshStandardMaterial({ color: 0xF5F2EB, roughness: 0.15, metalness: 0.05 }),
      black: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.15, metalness: 0.05 }),
      electricBlue: new THREE.MeshStandardMaterial({ color: 0x0038FF, roughness: 0.12, metalness: 0.08 }),
      vividOrange: new THREE.MeshStandardMaterial({ color: 0xFF5500, roughness: 0.15, metalness: 0.05 }),
      limeGreen: new THREE.MeshStandardMaterial({ color: 0xCCFF00, roughness: 0.18, metalness: 0.05 })
    };
  }

  init(containerElement) {
    this.container = containerElement;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xF5F2EB); // Fondo crema editorial

    // 2. Cámara
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderizador WebGL
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true, // Permite capturas de pantalla de los pósters
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Iluminación tipo estudio de diseño
    this.setupLighting();

    // 5. Puntero visual de la mano
    this.setupHandPointer();

    // 6. Manejo de redimensión
    window.addEventListener('resize', () => this.onWindowResize());

    // 7. Loop de animación
    this.animate();

    console.log("[GAME ENGINE] Motor 3D Three.js inicializado correctamente.");
  }

  setupLighting() {
    // Luz ambiental suave
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    // Luz principal directional con sombras suaves
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(6, 10, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    this.scene.add(keyLight);

    // Luz de relleno azul eléctrico tenue
    const rimLight = new THREE.DirectionalLight(0x0038FF, 0.6);
    rimLight.position.set(-8, -4, 4);
    this.scene.add(rimLight);

    // Luz de acento naranja sutil
    const accentLight = new THREE.DirectionalLight(0xFF5500, 0.4);
    accentLight.position.set(4, -6, 5);
    this.scene.add(accentLight);
  }

  setupHandPointer() {
    // Esfera 3D que representa el punto de agarre de la mano en el espacio
    const geometry = new THREE.SphereGeometry(0.18, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x0038FF,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    this.handPointer = new THREE.Mesh(geometry, material);
    this.handPointer.position.set(0, 0, 0.5);
    this.scene.add(this.handPointer);
  }

  // Cargar modelo .glb de Blender
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
          root.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.modelCache.set(modelName, root);
          resolve(root.clone());
        },
        undefined,
        (error) => {
          console.warn(`[3D LOADER] Fallback para ${modelName}:`, error.message);
          // Fallback procedimental si el glb no carga
          const fallbackMesh = this.createFallbackMesh(modelName);
          resolve(fallbackMesh);
        }
      );
    });
  }

  createFallbackMesh(name) {
    const group = new THREE.Group();
    let geom = new THREE.BoxGeometry(1.2, 1.2, 0.4);
    let mat = this.materials.electricBlue;

    if (name.includes('torus')) {
      geom = new THREE.TorusGeometry(0.8, 0.3, 16, 32);
      mat = this.materials.limeGreen;
    } else if (name.includes('cylinder') || name.includes('capsule')) {
      geom = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 24);
      mat = this.materials.vividOrange;
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }

  // Actualización de posición de mano enviada por HandTracker
  updateHand(primaryHand, twoHands) {
    if (!primaryHand.active) {
      if (this.handPointer) this.handPointer.visible = false;
      return;
    }

    if (this.handPointer) this.handPointer.visible = true;

    // Convertir de espacio [0..1] a Coordenadas de Dispositivo Normalizado [-1..1]
    this.mouse.x = (primaryHand.x * 2) - 1;
    this.mouse.y = -(primaryHand.y * 2) + 1;

    // Proyectar rayo hacia el plano Z=0
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targetPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, targetPoint);

    if (targetPoint) {
      // Suavizar posición del puntero 3D
      this.handPointer.position.lerp(targetPoint, 0.6);
      this.handPointer.position.z = 0.5;

      // Color según agarre / pinch
      if (primaryHand.isPinching) {
        this.handPointer.material.color.setHex(0xCCFF00); // Verde Lima al pellizcar
        this.handPointer.scale.set(0.8, 0.8, 0.8);
      } else {
        this.handPointer.material.color.setHex(0x0038FF); // Azul Eléctrico en reposo
        this.handPointer.scale.set(1.0, 1.0, 1.0);
      }
    }

    // Notificar al modo activo
    if (this.currentMode && typeof this.currentMode.onHandUpdate === 'function') {
      this.currentMode.onHandUpdate(targetPoint, primaryHand, twoHands);
    }
  }

  setMode(modeInstance) {
    // Limpiar modo anterior si existe
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
    this.camera.aspect = width / height;
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
