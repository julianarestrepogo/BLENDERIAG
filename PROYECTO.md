# TYPE IN MOTION
## Documento Maestro de Planificación, Diseño y Estado del Proyecto (v2.0)

---

### 1. ¿Qué hace la aplicación?

**TYPE IN MOTION** es un juego interactivo y competitivo multijugador basado en el diseño tipográfico contemporáneo. Los jugadores deben completar desafíos con letras, palabras y composiciones gráficas tridimensionales utilizando los movimientos de sus manos frente a una cámara web.

El juego combina creatividad, velocidad, observación y coordinación mediante desafíos contrarreloj, puntuaciones en tiempo real y una clasificación de ganadores, ahora ampliado a **cinco modalidades de juego**.

---

### 2. ¿Quién utiliza la aplicación?

Está dirigida a jóvenes y adultos interesados en los videojuegos, el diseño gráfico, la tipografía y las experiencias interactivas.

Múltiples personas pueden conectarse simultáneamente desde diferentes computadores, crear salas privadas o unirse mediante un código de acceso para competir en tiempo real. Cada participante utiliza su propia cámara web para interactuar con el juego, contando además con controles alternativos por mouse para pruebas o entornos sin cámara.

---

### 3. ¿Qué elementos 3D tendrá y cuál será su estética?

La aplicación cuenta con las 26 letras del abecedario tridimensionales (A-Z), palabras completas, figuras geométricas (toroides, cubos biselados, cápsulas, discos gráficos, conos y estrellas tipográficas) y animaciones fluidas que reaccionan a los movimientos de los usuarios.

#### Corrección y Perspectiva Frontal de las Letras:
* **Orientación 100% Frontal:** Todas las letras se visualizan directamente de frente a la pantalla (paralelas al plano visual), eliminando cualquier ángulo cenital o elevado que dificulte su lectura.
* **Cámara Ortográfica Frontal:** Configurada en Three.js sin distorsión de perspectiva, situada en el eje Z mirando al origen, asegurando que los caracteres mantengan una orientación vertical perfecta y completamente legible.
* **Modelado en Blender:** Los modelos se exportan con rotación aplicada para quedar erguidos verticalmente. Se conservan el volumen, la profundidad 3D y el biselado suave mediante iluminación de estudio con sombras sutiles.

#### Nueva Identidad Visual y Paleta de Colores:
Estética cálida, vibrante, alegre, editorial y divertida, inspirada en juegos arcade modernos y diseño tipográfico experimental (sin elementos futuristas ni de ciencia ficción).

* **Naranja:** `#FF713B` (Color primario dinámico para botones, acentos y letras)
* **Amarillo:** `#FFD65A` (Indicadores de éxito, temporizador y destacados)
* **Rosado:** `#FF91B5` (Detalles amigables, elementos secundarios y podio)
* **Rojo:** `#E84442` (Alertas, elementos clave y avisos de error)
* **Crema:** `#FFF7EB` (Fondo cálido editorial y lienzos limpios)
* **Carbón Oscuro:** `#1A1110` (Textos de alto contraste, marcos y legibilidad máxima)

**Materiales y Acabados:**
* Plásticos suaves y ligeramente brillantes (`roughness: 0.20`, `metallic: 0.02`), con reflejos cálidos y volumen táctil.
* Tipografías bold, expresivas, legibles y de impacto editorial (*Syne*, *Archivo Black*, *Space Grotesk*).

---

### 4. ¿Qué ve la persona en pantalla?

1. **Pantalla de Inicio (Home):**
   * Encabezado con logo, estado de cámara y botón para alternar a modo mouse.
   * Formulario para ingresar nombre de jugador, botón "CREAR SALA NUEVA" y casilla para unirse con código de 5 caracteres.
   * Galería visual de las 5 modalidades con sus iconos y etiquetas de color.
2. **Sala de Espera (Lobby):**
   * Código de sala grande en naranja.
   * **Selector de Modalidad para el Anfitrión:** Permite elegir jugar el *Torneo Completo (5 Rondas)* o un reto específico.
   * Rejilla de tarjetas de jugadores conectados con sus avatares en tiempo real.
   * Botón "¡INICIAR PARTIDA!" para el host o indicador de espera para invitados.
3. **Modal de Instrucciones Visuales Previas:**
   * Ventana emergente previa al inicio de cada reto que explica de forma concisa el objetivo y el gesto exacto con las manos (con temporizador de inicio automático de 3 segundos).
4. **Pantalla de Juego (Game):**
   * Vista 3D frontal con letras y figuras interactivas.
   * HUD superior: Nombre y número de ronda, instrucciones del reto, reloj temporizador en amarillo y puntuación personal en naranja.
   * Marcador en vivo lateral con el avance de todos los jugadores de la sala.
   * Medidor de afinidad y precisión para *STRETCH IT* y *KERNING RACE*.
   * Barra de herramientas para *POSTER RUSH* con figuras de Blender, letras y selectores de color.
   * Ventana PIP inferior con la cámara web del usuario y el esqueleto de la mano dibujado en tiempo real.
5. **Pantalla de Resultados de Ronda:**
   * Tabla de posiciones intermedias con puntos obtenidos en la ronda y acumulados.
6. **Pantalla Final y Podio:**
   * Podio de ganadores (1º, 2º y 3º lugar) con alturas proporcionales y colores temáticos.
   * **Exposición de Pósters Tipográficos 3D:** Galería interactiva con las capturas de los carteles diseñados por cada jugador en la ronda de Poster Rush.

---

### 5. ¿Qué puede hacer el usuario?

Los participantes interactúan mediante visión artificial por cámara web (MediaPipe Hands) o mediante mouse/cursor:

* **Pellizco (Índice + Pulgar):** Agarrar, arrastrar y soltar letras o figuras en el espacio frontal.
* **Separación de Manos:** Abrir o juntar ambas manos para estirar y comprimir palabras.
* **Toque / Contacto Directo:** Tocar letras flotantes para reventarlas (*pop*).
* **Desplazamiento Horizontal:** Mover letras lateralmente sobre la línea base.

#### Las Cinco Modalidades de Juego:

1. **RETO 1 — FIX THE TYPE:**
   * Las letras de una palabra aparecen desordenadas. El jugador debe tomarlas y encajarlas en sus casillas superiores en el orden correcto antes de que acabe el tiempo.
2. **RETO 2 — STRETCH IT:**
   * El jugador estira o comprime una palabra con sus manos para hacerla coincidir con la silueta de referencia en pantalla. Se evalúa la afinidad porcentual.
3. **RETO 3 — POSTER RUSH:**
   * Lienzo editorial donde los participantes componen libremente un cartel 3D añadiendo figuras geométricas de Blender y letras con colores personalizados. Al terminar se captura y exhibe en la galería final.
4. **RETO 4 — KERNING RACE (Nuevo):**
   * Competencia de precisión tipográfica. Una palabra presenta espaciados irregulares y defectuosos. El jugador debe mover horizontalmente cada letra para igualar el espaciado armónico de la palabra de referencia superior.
5. **RETO 5 — TYPE POP (Nuevo):**
   * Competencia de velocidad y reflejos. Letras 3D flotan y rebotan por la pantalla a velocidad creciente. El juego indica una letra objetivo (ej. "¡TOCA LA LETRA 'M'!"); tocarla suma +200 pts con animación de confeti POP, mientras que tocar letras incorrectas penaliza -50 pts.

---

### 6. ¿Qué se comparte entre los usuarios?

* **Salas virtuales y sincronización autoritativa:** El servidor Node.js gestiona el reloj centralizado, el inicio de rondas y el avance de modalidades.
* **Marcadores y clasificaciones en vivo:** Cada acierto o avance emite actualizaciones inmediatas a todos los participantes conectados.
* **Exposición colectiva:** Las imágenes de los carteles generados en *POSTER RUSH* se transmiten y muestran a toda la sala en la pantalla final.
* **Podio general:** Clasificación global al cierre de la partida anunciando al ganador.

---

## 🛠️ Herramientas de Desarrollo

* **Antigravity:** Programación completa de la arquitectura web, frontend interactivo, lógica de los 5 modos y puente de comunicación.
* **Blender 5.3:** Modelado y exportación de las 26 letras (A-Z) y figuras geométricas frontales (`.glb`), y escena nativa editable [`blender/type_in_motion.blend`](file:///Users/apple/Downloads/BLENDERIAG/blender/type_in_motion.blend).
* **Node.js:** Servidor central con Express y Socket.io para la sincronización multijugador en tiempo real.

---

## 📋 REGISTRO DE AVANCES Y DECISIONES TÉCNICAS (ACTUALIZACIÓN v2.0)

| Área / Característica | Estado Real | Detalles Técnicos |
| :--- | :--- | :--- |
| **Perspectiva Frontal de Letras** | ✅ Implementado | Sustitución de perspectiva inclinada por `OrthographicCamera` perpendicular al plano Z=0. Rotación en X aplicada en Blender para que los modelos se orienten de pie hacia la cámara. |
| **Identidad Visual y Paleta** | ✅ Implementado | Aplicación homogénea de Naranja (`#FF713B`), Amarillo (`#FFD65A`), Rosado (`#FF91B5`), Rojo (`#E84442`), Crema (`#FFF7EB`) y Carbón (`#1A1110`) en CSS, shaders de Three.js y Blender. |
| **Reto 1: Fix The Type** | ✅ Actualizado | Adaptado a vista frontal con casillas alineadas y letras legibles sin rotaciones extrañas. |
| **Reto 2: Stretch It** | ✅ Actualizado | Marco de silueta en tonos naranja/amarillo con lectura de afinidad y deformación frontal limpia. |
| **Reto 3: Poster Rush** | ✅ Actualizado | Paleta cálida en swatches, nuevos assets (estrella tipográfica) y lienzo frontal 3:4. |
| **Reto 4: Kerning Race** | ✅ Implementado | Palabra de referencia superior, letras móviles sobre eje horizontal, cálculo de error cuadrático medio y retroalimentación de precisión en tiempo real. |
| **Reto 5: Type Pop** | ✅ Implementado | Física de rebote 3D frontal, cambio dinámico de letra objetivo, partículas de pop, debounce de toque y penalización visual. |
| **Selector de Modalidades en Lobby** | ✅ Implementado | El anfitrión puede elegir jugar el torneo completo de 5 rondas o seleccionar un reto individual específico. |
| **Instrucciones Visuales Previas** | ✅ Implementado | Modal animado con iconos, descripción del reto y explicación del gesto manual antes de cada partida. |
| **Assets 3D en Blender** | ✅ Generados | 26 letras A-Z + 6 figuras geométricas exportadas a `public/assets/models/` y escena nativa `.blend` guardada. |
