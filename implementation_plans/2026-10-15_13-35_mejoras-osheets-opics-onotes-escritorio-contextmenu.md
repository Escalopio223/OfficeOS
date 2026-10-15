# Plan de Implementación: Mejoras en Osheets, Opics, Onotes, Accesos en Escritorio y Menú Contextual

**Fecha y hora:** 2026-10-15 13:35  
**Rama:** `feature/apps-improvements`  

---

### 1. Objetivo de la tarea
Implementar un conjunto integral de mejoras funcionales y de experiencia de usuario en las aplicaciones principales del sistema (Osheets, Opics y Onotes), así como en el entorno de escritorio y menús contextuales:
1. **Osheets (Creación y edición de CSVs):**
   - Permitir crear archivos CSV nuevos desde la propia aplicación y desde los menús contextuales.
   - Proveer barra de herramientas con creación de nuevo archivo, selector/input de nombre con validación de extensión `.csv`, botones para añadir filas/columnas y alternancia entre vista de cuadrícula y modo texto/crudo.
   - Permitir guardar los cambios o el nuevo archivo directamente en el backend (`/api/nodes`) actualizando el árbol de archivos y el escritorio en tiempo real.
2. **Opics (Galería global y búsqueda por nombre):**
   - Permitir visualizar todas las imágenes existentes en el sistema independientemente de la carpeta en la que residan (modo galería).
   - Implementar barra de búsqueda en tiempo real que filtre/busque imágenes por nombre (similar a la búsqueda difusa de Oxplorer).
   - Permitir navegar entre las imágenes (anterior / siguiente), hacer zoom, rotar y volver cómodamente a la galería.
   - Implementar endpoint backend optimizado `GET /api/nodes/images` con soporte de búsqueda `?q=...` y paginación.
3. **Onotes (Creación de nuevos archivos de texto y restricción estricta de extensiones):**
   - Permitir crear archivos de texto nuevos desde Onotes (botón "Nuevo"), permitiendo nombrar el archivo y guardarlo en el sistema de archivos (`root.desktop` o carpeta actual).
   - Obligar y validar estrictamente que solo se guarden formatos relacionados con texto (`.txt`, `.json`, `.js`, `.ts`, `.html`, `.css`, `.md`, `.log`, `.sql`, `.xml`, `.csv`, `.yml`, `.yaml`, `.env`, `.sh`). Si el usuario introduce una extensión no válida (como `.png`, `.exe`, `.jpg`, `.pdf`), se bloqueará el guardado mostrando una advertencia visual clara.
4. **Iconos de Apps en el Escritorio:**
   - Incorporar accesos directos arrastrables para todas las apps con su icono SVG oficial en el escritorio: **Oxplorer**, **Onotes**, **Osheets** y **Opics**.
   - Integrar los nuevos accesos directos en el motor de colisiones AABB del escritorio y en el generador de posiciones libres para evitar solapamientos con carpetas y notas.
5. **Acceso en Menú Contextual (Clic derecho):**
   - Añadir en el menú contextual del fondo del escritorio (`DesktopWorkspace.vue`) las opciones para Osheets ("📊 Nueva Hoja de Cálculo (Osheets)") y Opics ("🖼️ Galería de Fotos (Opics)"), equiparando su acceso al de Onotes.
   - Añadir igualmente estas opciones en el menú contextual de Oxplorer (`OxplorerWindow.vue`).

---

### 2. Lista exacta de archivos a crear, modificar o eliminar
- **Modificar:**
  - `backend/src/server.ts`:
    - Agregar endpoint `GET /api/nodes/images` para consultar todas las imágenes del sistema de archivos (`.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`, `.gif`) con filtro opcional de búsqueda por nombre `q`.
  - `frontend/src/components/apps/osheets/OsheetsWindow.vue`:
    - Añadir capacidad de crear nuevo documento CSV, edición de celdas o filas/columnas, guardado en backend (`POST` o `PATCH` `/api/nodes`), renombrado y validación de extensión `.csv`.
  - `frontend/src/components/apps/opics/OpicsWindow.vue`:
    - Integrar vista de galería global con grid de miniaturas, buscador en tiempo real por nombre, botón para alternar entre vista individual y galería, y navegación entre imágenes.
  - `frontend/src/components/apps/onotes/OnotesWindow.vue`:
    - Añadir botón de "Nuevo archivo", campo para editar el nombre de la nota, validación estricta de extensiones de texto permitidas y guardado como nuevo nodo cuando no posea `noteId`.
  - `frontend/src/components/desktop/DesktopWorkspace.vue`:
    - Renderizar los 4 accesos directos de aplicaciones (**Oxplorer**, **Onotes**, **Osheets**, **Opics**) con sus respectivos iconos SVG y soporte de arrastre/colisión.
    - Ampliar el menú contextual del escritorio para incluir acceso a Osheets y Opics.
  - `frontend/src/stores/desktopStore.ts`:
    - Ajustar `findFreeGridSlot` para considerar las posiciones ocupadas por los accesos directos de las aplicaciones del sistema.
    - Añadir función helper `createSheet(name, content, x, y)` para crear hojas de cálculo en el escritorio.
  - `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:
    - Añadir al menú contextual de fondo de Oxplorer las opciones de crear hoja de cálculo Osheets y abrir galería Opics.
    - Añadir soporte de creación de tipo `sheet` en el modal de nuevo archivo con validación de extensiones.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de datos:**
  - Ningún cambio de esquema requerido. La tabla `filesystem_nodes` ya soporta `mime_type`, `content`, `name` y consultas `ILIKE`.
- **Endpoints:**
  - `GET /api/nodes/images`:
    - Parámetros query: `q` (búsqueda opcional), `limit` (por defecto 100, máx 200).
    - Retorna lista de nodos que cumplen extensiones de imagen (`.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`, `.gif`).
- **Estado (Pinia):**
  - `desktopStore`: método helper `createSheet` para facilitar la creación de nodos `.csv` con contenido por defecto.

---

### 4. Pasos secuenciales de ejecución
1. **Creación del Plan de Implementación:**
   - Guardar este documento en `/implementation_plans/2026-10-15_13-35_mejoras-osheets-opics-onotes-escritorio-contextmenu.md`.
2. **Backend: Endpoint para Galería y Búsqueda de Imágenes:**
   - En `backend/src/server.ts`, implementar ruta `GET /api/nodes/images`.
3. **Frontend - Onotes:**
   - Implementar lista de extensiones de texto permitidas: `['txt', 'json', 'js', 'ts', 'html', 'htm', 'css', 'md', 'log', 'sql', 'xml', 'csv', 'yml', 'yaml', 'env', 'sh']`.
   - Permitir crear nueva nota en blanco con botón "Nuevo".
   - Permitir editar el nombre del archivo con validación en tiempo real.
   - En `saveFile`, validar extensión y crear nodo vía `POST /api/nodes` si es nueva nota, o actualizar vía `PATCH /api/nodes/:id` si ya existe.
4. **Frontend - Osheets:**
   - Permitir crear nuevos CSVs en blanco o con plantilla.
   - Permitir editar celdas o añadir/eliminar filas y columnas.
   - Añadir acción "Guardar" que persista el contenido en el backend (`POST` para nuevo o `PATCH` para existente).
   - Validar que el archivo conserve la extensión `.csv`.
5. **Frontend - Opics:**
   - Agregar vista de galería con buscador interactivo y visualización en cuadrícula de todas las imágenes del sistema de archivos.
   - Conectar con `GET /api/nodes/images?q=...`.
   - Permitir hacer clic en cualquier imagen para abrirla en modo visor completo con zoom, rotación y botón "‹ Galería".
6. **Frontend - Escritorio y Accesos Directos:**
   - En `DesktopWorkspace.vue`, registrar los 4 accesos directos (Oxplorer, Onotes, Osheets, Opics) con sus iconos SVG.
   - Habilitar arrastre y prevención de colisiones para los 4 accesos directos.
   - Añadir en el menú contextual del fondo del escritorio los botones para Osheets ("📊 Nueva Hoja de Cálculo (Osheets)") y Opics ("🖼️ Galería de Fotos (Opics)").
   - En `desktopStore.ts`, añadir `createSheet` y ajustar `findFreeGridSlot` para respetar el espacio de las apps.
7. **Frontend - Oxplorer:**
   - Añadir en el menú contextual de Oxplorer el acceso a Osheets ("📊 Nueva Hoja de Cálculo (Osheets)") y Opics ("🖼️ Galería de Fotos (Opics)").
   - Manejar la creación del archivo `.csv` en la carpeta actual a través del modal de creación.
8. **Pruebas y Verificación:**
   - Comprobar compilación del backend y frontend (`vue-tsc` / tests).
   - Validar en el navegador la creación de CSVs en Osheets, la galería y buscador de Opics, la validación de extensiones de Onotes, los iconos en el escritorio y los menús contextuales.
