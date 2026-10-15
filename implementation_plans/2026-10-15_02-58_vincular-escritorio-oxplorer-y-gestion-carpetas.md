# Plan de Implementación: Vincular Escritorio y Oxplorer en Tiempo Real y Gestión de Carpetas

**Fecha:** 2026-10-15  
**Rama:** `feature/folders-usage`  
**Estado:** Listo para ejecución  

---

## 1. Objetivo de la Tarea

Implementar la vinculación bidireccional y en tiempo real entre el **Escritorio** y **Oxplorer** sobre PostgreSQL (eliminando por completo el uso de `localStorage`), permitiendo:
1. Abrir cualquier carpeta haciendo doble clic en ella tanto desde el Escritorio (abriendo una ventana de Oxplorer en esa ruta) como desde el explorador Oxplorer.
2. Mostrar en el Escritorio únicamente los nodos que pertenezcan a `root.desktop` directamente desde la base de datos.
3. Si un nodo es creado en `root.desktop` sin coordenadas (`pos_x`/`pos_y` en `null`), el Escritorio le asigna automáticamente la primera celda/espacio libre mediante el sistema de colisiones AABB y persiste sus coordenadas.
4. Mover archivos o carpetas dentro de otras carpetas mediante arrastrar y soltar (Drag & Drop):
   - Al soltar un icono sobre una carpeta en el Escritorio (detectado mediante bounding box), el nodo se mueve dentro de esa carpeta en la base de datos (actualizando su `parent_id` y `path` ltree, y limpiando sus coordenadas).
   - Al soltar en un espacio vacío, actualiza sus coordenadas `pos_x` y `pos_y`.
   - Al arrastrar entre Oxplorer y el Escritorio o entre carpetas dentro de Oxplorer, los nodos se mueven a la carpeta destino.
5. Crear carpetas y notas/archivos en `root.desktop` (desde menú contextual del Escritorio) o en cualquier subcarpeta activa (desde Oxplorer), guardándolos de forma atómica en PostgreSQL con slugs `ltree` válidos.

---

## 2. Lista Exacta de Archivos a Crear, Modificar o Eliminar

### Backend
- **Modificar:** `backend/src/server.ts`
  - Extender `GET /api/nodes` para soportar búsqueda por `parentPath` (además de `parentId`) y devolver las columnas `pos_x`, `pos_y`, `content`.
  - Crear endpoint `POST /api/nodes` para crear carpetas y archivos en un `parentPath` o `parentId` determinado, generando un slug ltree seguro e invalidando la caché de Redis correspondiente.
  - Crear endpoint `PATCH /api/nodes/:id` para:
    - Mover un nodo a otra carpeta actualizando recursivamente en cascada el `path` de todos sus descendientes mediante `<@` y `subpath` de PostgreSQL `ltree`.
    - Actualizar coordenadas (`pos_x`, `pos_y`).
    - Actualizar `name` y `content` (para Onotes y renombrado).
    - Validar protecciones (`root` y `root.desktop` inamovibles, prohibir mover una carpeta dentro de sí misma o de un descendiente).
  - Crear endpoint `DELETE /api/nodes/:id` protegiendo `root` y `root.desktop`, e invalidando la caché de Redis.

### Frontend
- **Modificar:** `frontend/src/types/filesystem.ts`
  - Enriquecer `FileNode` con los campos opcionales `pos_x?: number | null`, `pos_y?: number | null`, `content?: string | null`.
- **Modificar:** `frontend/src/stores/filesystem.ts`
  - Añadir soporte para navegar por `path` (`navigateToPath(path: string)`).
  - Añadir acciones para crear (`createNode`), mover (`moveNode`), renombrar (`renameNode`), borrar (`deleteNode`) y actualizar contenido (`updateContent`).
  - Añadir mecanismo de eventos o sincronización con `desktopStore` para invalidación mutua reactiva.
- **Modificar:** `frontend/src/stores/desktopStore.ts`
  - Eliminar totalmente la dependencia de `localStorage`.
  - Cargar los nodos directamente de PostgreSQL consultando `root.desktop`.
  - Sincronizar las acciones de crear carpeta, crear nota, mover a carpeta, actualizar posición y renombrar/eliminar con los nuevos endpoints del backend.
  - Asignar posiciones libres a elementos entrantes con `pos_x === null || pos_y === null`.
- **Modificar:** `frontend/src/components/desktop/DesktopWorkspace.vue`
  - Renderizar los nodos de `desktopStore` (obtenidos de PostgreSQL).
  - Al hacer doble clic en una carpeta (`is_directory === true`), abrir Oxplorer navegando a esa ruta (`path`).
  - Al soltar un icono arrastrado sobre otra carpeta (colisión bounding box), llamar a `desktopStore.moveItemToFolder(itemId, targetFolderId)`.
  - Soportar drop de elementos procedentes de Oxplorer hacia el escritorio (`root.desktop`).
- **Modificar:** `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`
  - Responder a la ruta inicial solicitada al abrir la ventana.
  - Añadir botones/acciones para "Nueva Carpeta" y "Nuevo Archivo" dentro de la carpeta activa.
  - Soportar arrastrar elementos dentro de Oxplorer hacia una carpeta visible.
  - Refrescar el escritorio si la carpeta modificada es `root.desktop`.
- **Modificar:** `frontend/src/components/apps/onotes/OnotesWindow.vue`
  - Guardar cambios de texto directamente en PostgreSQL vía API (`PATCH /api/nodes/:id`).

---

## 3. Cambios en Base de Datos, Endpoints o Estado (Pinia)

### Base de Datos (PostgreSQL)
- No requiere nuevas tablas ni alteraciones DDL; la tabla `filesystem_nodes` ya cuenta con `id`, `name`, `is_directory`, `size_bytes`, `mime_type`, `parent_id`, `path` (`ltree`), `pos_x`, `pos_y`, `content`.
- Consultas `ltree` avanzadas:
  - Mover subárbol en cascada:
    ```sql
    UPDATE filesystem_nodes
    SET path = $1::ltree || subpath(path, nlevel($2::ltree))
    WHERE path <@ $2::ltree AND id != $3;
    ```
  - Comprobación de descendiente: `SELECT 1 FROM filesystem_nodes WHERE id = $targetId AND path <@ $sourcePath;`
  - Protección estricta: `id` o `path` no pueden ser `root` ni `root.desktop` al mover o eliminar.

### Endpoints (Fastify)
1. `GET /api/nodes`
   - Parámetros query: `parentId` (uuid opcional), `parentPath` (ltree opcional), `page`, `limit`.
   - Retorna: `took_ms`, `source`, `count`, `page`, `nodes` (con `pos_x`, `pos_y`, `content`).
2. `POST /api/nodes`
   - Body: `{ name, is_directory, parentPath?, parentId?, pos_x?, pos_y?, content?, mime_type? }`
   - Genera slug seguro para ltree (`^[A-Za-z0-9_]+$`).
   - Invalida claves en Redis (`fs:dir:*`).
3. `PATCH /api/nodes/:id`
   - Body: `{ pos_x?, pos_y?, targetFolderId?, targetFolderPath?, name?, content? }`
   - Si incluye `targetFolderId` o `targetFolderPath`, efectúa la reubicación en `filesystem_nodes` (modificando `parent_id`, `path` y cascada).
   - Invalida claves en Redis (`fs:dir:*`).
4. `DELETE /api/nodes/:id`
   - Elimina el nodo y sus descendientes (garantizado por `CASCADE`).
   - Invalida claves en Redis.

### Estado (Pinia)
- `desktopStore`:
  - `items`: `ref<FileNode[]>([])` (reemplaza los items mock de `localStorage`).
  - `loadDesktopItems()`: Realiza `GET /api/nodes?parentPath=root.desktop`.
  - `updatePosition(id, x, y)`: `PATCH /api/nodes/:id` con `{ pos_x: x, pos_y: y }`.
  - `moveToFolder(id, targetFolderId)`: `PATCH /api/nodes/:id` con `{ targetFolderId }`.
- `filesystemStore`:
  - `openDirectory(folder)`: Navega a cualquier carpeta por objeto `FileNode`.
  - `navigateToPath(path)`: Resuelve y abre un nodo por su ruta ltree.
  - `refreshCurrentFolder()`: Recarga los hijos del directorio actual.

---

## 4. Pasos Secuenciales de Ejecución

1. **Implementar Endpoints en el Backend (`backend/src/server.ts`):**
   - Actualizar `GET /api/nodes` para aceptar `parentPath` y seleccionar `pos_x, pos_y, content`.
   - Implementar `POST /api/nodes` con validación de parent, generación de slug para ltree e invalidación de Redis.
   - Implementar `PATCH /api/nodes/:id` con soporte de movimiento de carpeta mediante `ltree` en cascada, actualización de coordenadas y actualización de contenido.
   - Implementar `DELETE /api/nodes/:id` con comprobación de seguridad para nodos protegidos.
   - Probar los endpoints ejecutando peticiones de validación.

2. **Actualizar Tipos y Stores de Frontend:**
   - Modificar `frontend/src/types/filesystem.ts` con los nuevos campos de `FileNode`.
   - Actualizar `frontend/src/stores/filesystem.ts` con funciones CRUD y navegación por `path`.
   - Refactorizar `frontend/src/stores/desktopStore.ts`: eliminar `localStorage`, conectar con `/api/nodes`, implementar cálculo de coordenadas libres para nodos sin posición.

3. **Vincular el Escritorio (`DesktopWorkspace.vue`):**
   - Cargar al inicio los hijos de `root.desktop` mediante `desktopStore.loadDesktopItems()`.
   - Manejar doble clic en carpetas para abrir Oxplorer en la ruta seleccionada.
   - Implementar detección de colisión AABB al soltar un icono arrastrado sobre una carpeta para ejecutar `moveToFolder`.
   - Permitir soltar elementos arrastrados desde Oxplorer en el fondo del escritorio (`root.desktop`).

4. **Mejorar Oxplorer (`OxplorerWindow.vue`):**
   - Soportar apertura con ruta específica desde los datos de la ventana (`winStore.windows['oxplorer'].data`).
   - Añadir acciones rápidas para crear carpetas y archivos en el directorio actual.
   - Añadir soporte de Drag & Drop para mover elementos dentro de subcarpetas en Oxplorer.
   - Sincronizar en tiempo real con `desktopStore` cuando se modifiquen elementos en `root.desktop`.

5. **Actualizar Onotes (`OnotesWindow.vue`):**
   - Asegurar que al pulsar guardar o editar notas se actualice el `content` en PostgreSQL a través de la API.

6. **Verificación Integral y Pruebas:**
   - Crear una carpeta en el Escritorio y verificar que aparece al instante dentro de `root.desktop` en Oxplorer.
   - Crear una carpeta o archivo en `root.desktop` desde Oxplorer y comprobar que aparece de inmediato en el Escritorio en un espacio libre.
   - Abrir una carpeta del Escritorio con doble clic y verificar que Oxplorer abre su contenido exacto.
   - Arrastrar un archivo sobre una carpeta en el Escritorio y verificar que desaparece del escritorio y pasa a estar dentro de la carpeta.
   - Mover un archivo desde Oxplorer al Escritorio y validar persistencia tras recargar.
