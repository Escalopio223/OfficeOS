# Plan de Implementación: Creación de la Aplicación Opaint (Dibujo Avanzado en OogleOS)

**Fecha y hora:** 2026-10-18 03:05  
**Rama:** `feature/Opaint`  

---

### 1. Objetivo de la tarea
Diseñar, estructurar e implementar una aplicación de dibujo y pintura digital de última generación llamada **Opaint** dentro del entorno de escritorio virtual OogleOS.

La aplicación resolverá los siguientes requerimientos arquitectónicos y funcionales:
1. **Lienzo de Alto Rendimiento (HTML5 Canvas 2D + Viewport Transformation):**
   - Soporte para Zoom fluido con rueda de ratón (centrado en el cursor) y desplazamiento espacial (Pan interactivo con barra espaciadora o botón central/herramienta mano).
   - Renderizado multicapa independiente (múltiples capas con control de visibilidad, opacidad, orden z-index y modos de fusión).
   - Canvas de previsualización flotante (*overlay preview buffer*) para mostrar trazos, formas vectoriales y selecciones sin ensuciar la capa activa hasta confirmar el puntero.
   - Soporte de alta resolución (HiDPI / Retina con `devicePixelRatio`).
2. **Sistema de Herramientas Modular y Extensible (Patrón Strategy):**
   - Arquitectura orientada a objetos con interfaz base `BaseTool`.
   - Implementación de herramientas clave:
     - **Pincel (Brush):** Trazo suave con interpolación cuadrática y control de grosor/opacidad.
     - **Borrador (Eraser):** Conmutación a modo de composición `destination-out`.
     - **Formas Geométricas (Shapes):** Rectángulos, elipses, líneas y flechas con previsualización en tiempo real y bloqueo de proporción (Shift).
     - **Bote de Pintura (Flood Fill):** Algoritmo optimizado de escaneo por colas sobre `Uint32Array` de `ImageData` con tolerancia de color.
     - **Selección Rectangular (Marquee):** Área de selección delimitada con capacidad de traslación.
3. **Persistencia y Sistema de Archivos de OogleOS:**
   - Formato propio de guardado `.opaint`: JSON estructurado que encapsula metadatos, dimensiones del lienzo, configuración de capas y datos binarios/dataURL de cada capa.
   - Integración nativa con el sistema de archivos de OogleOS (`/api/nodes`) para crear, guardar cambios y abrir archivos `.opaint` directamente desde el Escritorio o desde Oxplorer.
   - Exportación directa a formatos estándar (**PNG**, **WebP**, **SVG**) con opción de descarga local al sistema operativo real del usuario (`fs.downloadBlob`).
4. **Innovación en UI/UX Frontend (Vue 3 Composition API + Glassmorphism):**
   - Interfaz limpia, minimalista y libre de barras sobrecargadas.
   - **Dock Flotante Contextual:** Píldora inferior animada con selector de herramientas, color picker activo y regulador de grosor.
   - **Menú Radial / Pie Menu Flotante:** Acceso rápido circular a herramientas e historial activable mediante atajo o clic derecho secundario.
   - **Panel de Capas Colapsable:** Panel de cristal (*glassmorphism*) con miniaturas, reordenamiento, slider de opacidad y visibilidad.
5. **Gestión de Estado Centralizada e Historial (Pinia + Patrón Command):**
   - Store dedicado `usePaintStore` en Pinia para gestionar capas, capa activa, herramientas, viewport y pila de acciones Undo/Redo.
   - Historial robusto con interfaz `ICommand` para revertir y rehacer trazos, inserción/eliminación de capas y modificaciones sin pérdida de fidelidad.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar

#### Archivos a Crear:
1. `frontend/src/assets/opaint.svg`:
   - Icono SVG vectorial con identidad corporativa de OogleOS (paleta oficial Google con diseño moderno de paleta y pincel digital).
2. `frontend/src/types/paint.ts`:
   - Definición de tipos de capas (`PaintLayer`), formato de archivo `.opaint` (`OpaintFileFormat`), herramientas (`ToolType`), opciones de pincel/formas y comandos de historial.
3. `frontend/src/utils/paint/tools/BaseTool.ts`:
   - Clase abstracta / interfaz de estrategia para las herramientas interactivas del lienzo.
4. `frontend/src/utils/paint/tools/BrushTool.ts`:
   - Implementación de pincel con suavizado de curvas.
5. `frontend/src/utils/paint/tools/EraserTool.ts`:
   - Implementación de borrador con corte alfa.
6. `frontend/src/utils/paint/tools/ShapeTool.ts`:
   - Implementación de formas geométricas (rectángulo, círculo/elipse, línea, flecha).
7. `frontend/src/utils/paint/tools/FillTool.ts`:
   - Implementación de relleno por inundación (*flood fill*) basado en búfer tipado de 32 bits.
8. `frontend/src/utils/paint/tools/SelectTool.ts`:
   - Herramienta de selección rectangular y movimiento de área.
9. `frontend/src/utils/paint/commands/Command.ts`:
   - Interfaz `ICommand` y comandos concretos (`DrawCommand`, `LayerCommand`, `ClearCommand`).
10. `frontend/src/utils/paint/serializer.ts`:
    - Funciones de exportación/importación del formato `.opaint` y renderizado compuesto para descargas PNG/WebP/SVG.
11. `frontend/src/stores/paintStore.ts`:
    - Store Pinia centralizado para capas, herramientas activas, historial Undo/Redo y viewport.
12. `frontend/src/components/apps/opaint/OpaintWindow.vue`:
    - Ventana principal de la aplicación integrada con `useWindowBounds` y atajos de teclado globales.
13. `frontend/src/components/apps/opaint/OpaintCanvas.vue`:
    - Componente del lienzo interactivo con transformación de viewport, aceleración 2D y punteros.
14. `frontend/src/components/apps/opaint/OpaintFloatingDock.vue`:
    - Barra flotante inferior de herramientas y propiedades rápidas.
15. `frontend/src/components/apps/opaint/OpaintRadialMenu.vue`:
    - Menú radial animado con trigonometría y micro-interacciones.
16. `frontend/src/components/apps/opaint/OpaintLayersPanel.vue`:
    - Panel flotante de gestión de capas con preview y opacidad.
17. `frontend/src/components/apps/opaint/OpaintExportModal.vue`:
    - Modal de exportación y guardado en OogleOS o descarga al SO local.

#### Archivos a Modificar:
1. `frontend/src/stores/windowStore.ts`:
   - Agregar `'opaint'` al tipo `WindowId` y registrar la instancia de ventana en `windows`.
2. `frontend/src/stores/desktopStore.ts`:
   - Agregar método auxiliar `createPaintFile` o soporte para archivos `.opaint` en el escritorio.
3. `frontend/src/components/desktop/DesktopWorkspace.vue`:
   - Registrar el acceso directo de **Opaint** en `appShortcuts` con `opaint.svg`.
   - Renderizar `<OpaintWindow v-if="winStore.windows['opaint']?.isOpen" />`.
   - Asociar doble clic en archivos `.opaint`, `.png`, `.jpg` a opción de abrir en Opaint.
   - Añadir opción "🎨 Nuevo Dibujo (Opaint)" en el menú contextual del escritorio vacío.
4. `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:
   - Asociar archivos `.opaint` a la apertura directa en la ventana de Opaint.
   - Permitir crear archivos de dibujo `.opaint` desde el menú de creación rápida.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)

- **Base de datos:**
  - No requiere migraciones DDL: `filesystem_nodes` ya soporta contenido textual/JSON ilimitado en la columna `content` y mime_type arbitrario (`application/x-opaint` o `application/json`).
- **Endpoints:**
  - Utiliza `GET /api/nodes`, `POST /api/nodes`, `PATCH /api/nodes/:id` y `GET /api/files/:id/raw` para lectura, guardado y sincronización.
- **Estado (Pinia):**
  - **`windowStore`**: Nueva ventana `'opaint'` con propiedades de tamaño, zIndex y datos del archivo abierto (`fileId`, `name`, `content`).
  - **`paintStore`**:
    - `layers`: Lista reactiva de capas `{ id, name, visible, opacity, zIndex, canvas, ctx }`.
    - `activeLayerId`: Capa seleccionada sobre la que operan las herramientas.
    - `currentTool`: Instancia de la herramienta seleccionada (`brush`, `eraser`, `shapes`, `fill`, `select`).
    - `brushSettings`: Color primario, secundario, grosor (1px a 100px), opacidad, tipo de forma.
    - `viewport`: Escala de zoom (`zoom: 1.0`), desfase (`panX: 0`, `panY: 0`), dimensiones lógicas del lienzo (ej: 1200x800).
    - `history`: Pila de comandos ejecutados con índice de posición para Undo/Redo instantáneo.

---

### 4. Pasos secuenciales de ejecución

1. **Creación y Verificación de Rama:**
   - Situarse en la rama `feature/Opaint` mediante `git checkout -b feature/Opaint` (completado).
2. **Registro del Plan de Implementación:**
   - Crear y confirmar el documento en `/implementation_plans/2026-10-18_03-05_creacion-app-opaint-dibujo-avanzado.md`.
3. **Diseño de Activo Vectorial:**
   - Crear `frontend/src/assets/opaint.svg` con estética Google Material / OogleOS.
4. **Definición de Tipos y Arquitectura de Herramientas:**
   - Crear `frontend/src/types/paint.ts`.
   - Implementar el patrón Strategy en `frontend/src/utils/paint/tools/` (`BaseTool`, `BrushTool`, `EraserTool`, `ShapeTool`, `FillTool`, `SelectTool`).
   - Implementar el algoritmo de Flood Fill en `frontend/src/utils/paint/floodFill.ts`.
5. **Patrón Command e Historial:**
   - Crear `frontend/src/utils/paint/commands/Command.ts` para capturar deltas de imagen antes y después del trazo.
6. **Serialización y Exportación:**
   - Crear `frontend/src/utils/paint/serializer.ts` para guardar en formato `.opaint`, exportar a PNG/WebP y generar SVG.
7. **Store Pinia de Opaint:**
   - Implementar `frontend/src/stores/paintStore.ts` con gestión de capas, herramientas e historial Undo/Redo.
8. **Componentes Visuales de Opaint:**
   - Implementar `OpaintCanvas.vue` con soporte para transformación de viewport, HiDPI y buffer multicapa.
   - Implementar `OpaintFloatingDock.vue` para controles flotantes sin saturar la pantalla.
   - Implementar `OpaintRadialMenu.vue` con menú contextual circular.
   - Implementar `OpaintLayersPanel.vue` para la inspección y reordenamiento de capas.
   - Implementar `OpaintExportModal.vue` para la exportación multimodal.
   - Crear `OpaintWindow.vue` ensamblando los componentes y el ciclo de vida de la ventana.
9. **Integración en el Sistema Operativo OogleOS:**
   - Registrar la ventana en `windowStore.ts`.
   - Incorporar acceso directo, menú contextual y renderizado en `DesktopWorkspace.vue`.
   - Añadir soporte para extensiones `.opaint` en `OxplorerWindow.vue`.
10. **Validación, Compilación y Pruebas:**
    - Comprobar ausencia de errores de tipado TypeScript y ejecutar compilación (`npm run build`).
    - Validar fluidez de zoom, pan, trazos de pincel, flood fill, capas, guardado en VFS y descarga al sistema host.
