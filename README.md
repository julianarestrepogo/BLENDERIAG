# 🎮 TYPE IN MOTION

> Juego interactivo y competitivo multijugador basado en diseño tipográfico, control gestual por cámara 3D y estética editorial moderna.

---

## ⚡ Inicio Rápido para la Próxima Sesión

```bash
cd /Users/apple/Downloads/BLENDERIAG
npm start
```
Luego visita en tu navegador: **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Estructura del Proyecto

* **`blender/`**:
  * `type_in_motion.blend`: Escena nativa editable de Blender con todas las letras 3D, formas geométricas, iluminación de estudio y materiales configurados.
* **`mcp/`**:
  * `addon.py`: Código del add-on MCP for Blender.
  * `mcp-for-blender-main/`: Código fuente del servidor MCP.
* **`scripts/`**:
  * `generate_blender_assets.py`: Exportador automatizado de modelos a glTF/GLB.
  * `save_blender_scene.py`: Creador de la escena `.blend`.
* **`public/`**:
  * `index.html`: Interfaz de usuario con todas las pantallas (Home, Lobby, Game, Results, Podium).
  * `css/style.css`: Estilos gráficos editoriales con la paleta oficial (Crema, Negro, Azul Eléctrico, Naranja, Verde Lima).
  * `js/main.js`: Orquestador de la aplicación y conexión Socket.io.
  * `js/game_engine.js`: Motor 3D Three.js.
  * `js/hand_tracker.js`: Detección de manos con MediaPipe Hands y fallback por mouse.
  * `js/sound_engine.js`: Síntesis de sonido procedural con Web Audio API.
  * `js/modes/`: Lógica de las tres modalidades de juego (*FIX THE TYPE*, *STRETCH IT*, *POSTER RUSH*).
  * `assets/models/`: Modelos 3D `.glb` exportados desde Blender.
* **`server.js`**: Servidor Node.js (Express + Socket.io) para sincronización multijugador en tiempo real.
* **`PROYECTO.md`**: Documento maestro con la especificación de los 6 puntos y estado del proyecto.

---

## 🛠️ Herramientas Utilizadas
* **Antigravity**: Desarrollo y programación de la aplicación e interfaz.
* **Blender 5.3**: Modelado 3D de letras, formas y materiales.
* **Node.js**: Servidor WebSockets y gestión de partidas en tiempo real.
