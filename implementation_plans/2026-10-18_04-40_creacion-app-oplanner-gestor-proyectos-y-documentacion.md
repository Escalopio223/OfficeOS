# Plan de Implementación: Creación de la Suite Oplanner (Gestor de Proyectos y Espacio de Trabajo Híbrido Linear/Notion)

**Fecha y hora:** 2026-10-18 04:40  
**Rama:** `feature/Oplanner`  

---

### 1. Objetivo de la tarea
Diseñar e implementar de extremo a extremo la aplicación **Oplanner** (gestor de proyectos ágil y documentación estructurada estilo Linear/Notion ligero) dentro de OogleOS, manteniendo la independencia de `Onotes` para texto plano y posicionando `Oplanner` como la suite avanzada de planificación técnica y especificaciones.

Principales pilares del desarrollo:
1. **Integración con el Ecosistema OogleOS (UI, Archivos y Telemetría):**
   - Icono oficial del sistema mediante el SVG existente `frontend/src/assets/oplanner.svg`.
   - Asociación de archivos `.oplanner` (formato JSON estructurado) en `Oxplorer` y `DesktopWorkspace`.
   - Capacidad de exportar/descargar `.oplanner` (así como JSON/Markdown) al sistema operativo anfitrión e importar archivos `.oplanner`.
   - Conexión con telemetría en tiempo real (`Omonitor`): los contadores `files_created`, `files_opened` y `files_deleted` se actualizan reactivamente al manipular proyectos.
2. **Arquitectura de Datos y Rendimiento Técnico:**
   - Modelo de datos unificado: metadatos del proyecto, especificación técnica en bloques (`DocBlock[]`), colección de tareas (`TaskItem[]`).
   - Tareas con `id`, `code` (`OOG-XX`), `title`, `status` (`backlog`, `todo`, `in_progress`, `done`), `priority` (`low`, `medium`, `high`, `urgent`), `tags` (array de `{ id, label, color }`), `dueDate`, `position` (número flotante para fractional indexing), `description` (Markdown/enriquecido) y `subtasks` (`{ id, title, completed }`).
   - Algoritmo de **Fractional Indexing** (punto medio flotante) para inserción y reordenamiento O(1) sin reindexar colecciones enteras.
   - Proyecto precargado completo por defecto: *"OogleOS Architecture & Roadmap.oplanner"* con tareas y documentación real del sistema para onboarding inmediato.
3. **Arquitectura Frontend e Interfaz de Usuario (Vue 3 + Pinia):**
   - Store reactivo `useOplannerStore` en `frontend/src/stores/oplannerStore.ts`.
   - Interfaz moderna, oscura/glassmorphic inspirada en Linear y Notion, con barra lateral de proyectos, selector de vistas y 3 vistas sincronizadas en vivo:
     - **Vista 1 (Kanban Board):** Columnas por estado con contadores, drag & drop nativo HTML5 con cálculo de Fractional Indexing al soltar, tarjetas con ID corto, etiquetas, prioridad y progreso de subtareas.
     - **Vista 2 (Tabla / Base de Datos):** Tabla de alta densidad con edición en línea (*inline editing*) de estado, prioridad, título y fecha, con filtros debounced por texto, prioridad y etiquetas, y ordenación configurable.
     - **Vista 3 (Docs & Specs):** Editor basado en bloques con comando slash (`/`) navegable por teclado (H1, H2, H3, Checklist, Code, Callout, Task Mention interactiva).
     - **Panel Lateral de Detalle (Task Drawer):** Edición profunda de tareas, checklist interactivo, autoguardado con indicador visual de estado y soporte de atajo `Ctrl+S` / `Cmd+S`.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar

#### Archivos a Crear:
1. `frontend/src/types/oplanner.ts`:
   - Interfaces y tipos TypeScript: `TaskStatus`, `TaskPriority`, `TaskTag`, `TaskSubtask`, `TaskItem`, `DocBlockType`, `DocBlock`, `OplannerProject`, `OplannerFilterState`.
2. `frontend/src/stores/oplannerStore.ts`:
   - Store de Pinia para Oplanner: estado del proyecto actual, proyecto precargado por defecto, fractional indexing (`calcPositionBetween`), CRUD de tareas y bloques, filtros, estado de guardado, historial de persistencia en Oxplorer/Filesystem y exportación/importación.
3. `frontend/src/components/apps/oplanner/OplannerWindow.vue`:
   - Ventana principal de Oplanner con controles unificados (`WindowControls`), barra superior con selector de vistas y estado de guardado, sidebar de proyecto y contenedor principal.
4. `frontend/src/components/apps/oplanner/OplannerBoardView.vue`:
   - Tablero Kanban con columnas (`Backlog`, `To Do`, `In Progress`, `Done`), drag & drop nativo fluido y fractional indexing.
5. `frontend/src/components/apps/oplanner/OplannerTableView.vue`:
   - Vista en tabla tipo base de datos interactiva con celdas editables en línea, ordenación por columnas y barra de filtros.
6. `frontend/src/components/apps/oplanner/OplannerDocsView.vue`:
   - Editor de especificaciones por bloques, menú contextual flotante para comandos `/`, bloques interactivos y menciones a tareas.
7. `frontend/src/components/apps/oplanner/OplannerTaskDrawer.vue`:
   - Drawer deslizante lateral para edición de tareas, gestión de subtareas, propiedades y atajo de teclado `Ctrl+S`.
8. `frontend/src/__tests__/oplanner.spec.ts`:
   - Suite de pruebas unitarias cubriendo el store `useOplannerStore`, la lógica de fractional indexing, filtrado, serialización `.oplanner` e inserción de tareas y bloques.

#### Archivos a Modificar:
1. `backend/src/server.ts`:
   - Reconocimiento de extensión `.oplanner` asignando `mime_type: 'application/json'` en la creación de nodos `/api/nodes`.
2. `frontend/src/stores/windowStore.ts`:
   - Añadir `'oplanner'` al tipo `WindowId` y al estado inicial de ventanas con configuración de z-index y metadatos.
3. `frontend/src/components/desktop/DesktopWorkspace.vue`:
   - Importar `oplannerSvg` y `OplannerWindow.vue`.
   - Añadir acceso directo `Oplanner` a `appShortcuts`.
   - Manejar doble clic en icono de la aplicación y en archivos `.oplanner` (notificando telemetría `files_opened`).
   - Añadir opción "📋 Nuevo Proyecto (Oplanner)" en el menú contextual del escritorio.
   - Montar el componente `<OplannerWindow v-if="winStore.windows['oplanner']?.isOpen" />`.
4. `frontend/src/components/desktop/Taskbar.vue`:
   - Importar `oplannerSvg` y mapear `'oplanner'` en `getWindowIcon`.
5. `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:
   - Manejar doble clic en archivos `.oplanner` para abrir `winStore.openWindow('oplanner', { fileId, name, content })`.
   - Renderizar icono representativo para `.oplanner`.
   - Añadir opción de creación de proyecto en el menú contextual y toolbar de Oxplorer.
6. `frontend/src/stores/desktopStore.ts`:
   - Método `createPlannerProject(name, content, x, y)` para crear archivos `.oplanner` directamente en el escritorio.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)

- **Base de datos (PostgreSQL):**
  - No requiere migraciones DDL adicionales: la tabla `filesystem_nodes` ya soporta `storage_type: 'VIRTUAL'` y almacenamiento de texto en la columna `content TEXT`, lo que permite persistir los proyectos `.oplanner` serializados en JSON sin restricciones de esquema.
- **Endpoints:**
  - `POST /api/nodes`: Soporte implícito para extensión `.oplanner` asignando `mime_type: 'application/json'`.
  - La telemetría existente (`recordFileActivity` con `files_created`, `files_opened`, `files_deleted`) y `POST /api/telemetry/file-event` se activan automáticamente al manipular archivos `.oplanner`.
- **Estado (Pinia):**
  - `useOplannerStore`:
    - `currentProject`: `OplannerProject` (metadatos, `tasks`, `docs`).
    - `activeView`: `'board' | 'table' | 'docs'`.
    - `selectedTaskId`: `string | null` (control del Task Drawer).
    - `filterQuery`, `filterPriority`, `filterTag`: filtros de búsqueda debounced.
    - `isDirty`: estado reactivo de cambios sin guardar.
    - `currentFileId`: id del nodo en el sistema de archivos si fue cargado de Oxplorer.

---

### 4. Pasos secuenciales de ejecución

1. **Backend & Tipos:**
   - Actualizar `backend/src/server.ts` para mapear `.oplanner` a `application/json`.
   - Crear `frontend/src/types/oplanner.ts` con todos los modelos y estructuras de datos.
2. **Store de Pinia (`useOplannerStore`):**
   - Implementar el proyecto por defecto con tareas y documentación realista de OogleOS.
   - Implementar el algoritmo de Fractional Indexing para punto medio flotante.
   - Implementar métodos de mutación reactiva (CRUD de tareas, subtareas, bloques de specs).
   - Implementar serialización/deserialización, guardado en virtual FS con telemetría e import/export al SO del usuario.
3. **Integración con Sistema de Ventanas y Escritorio:**
   - Registrar `oplanner` en `windowStore.ts`.
   - Integrar en `Taskbar.vue` (icono).
   - Integrar en `DesktopWorkspace.vue` (shortcut, menú contextual, doble clic de archivo).
   - Integrar en `OxplorerWindow.vue` (icono, doble clic y creación).
   - Actualizar `desktopStore.ts`.
4. **Desarrollo de Componentes UI:**
   - Crear `OplannerBoardView.vue` (Kanban con HTML5 Drag & Drop y Fractional Indexing).
   - Crear `OplannerTableView.vue` (tabla interactiva con inline editing y filtros).
   - Crear `OplannerDocsView.vue` (editor de bloques con slash menu flotante `/` y task mentions).
   - Crear `OplannerTaskDrawer.vue` (panel lateral de detalle con autoguardado y checklist).
   - Ensamblar en `OplannerWindow.vue` con estética oscura/Linear de alto nivel.
5. **Pruebas y Verificación:**
   - Crear y ejecutar suite de pruebas en `frontend/src/__tests__/oplanner.spec.ts`.
   - Ejecutar suite general de tests para asegurar que no hay regresiones.
   - Comprobar compilación de TypeScript en frontend y backend.
