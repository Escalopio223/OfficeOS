# Plan de Implementación: Refactorización Masiva del Sistema de Archivos Híbrido (100k Nodos)

**Fecha y hora:** 2026-10-17 03:23  
**Rama:** `feature/hybrid-filesystem-100k` (o rama activa actual)  

---

### 1. Objetivo de la tarea
Refactorizar de manera integral el sistema de archivos de OogleOS en la base de datos (PostgreSQL), el backend (Node.js/Fastify) y el frontend (Vue 3 / Pinia / Oxplorer / Onotes / Osheets / Opics) para soportar una arquitectura híbrida de almacenamiento virtual y físico a escala masiva (100.000 nodos):

1. **Nuevo Esquema de Base de Datos e Indexación:**
   - Adaptar `filesystem_nodes` con campos `user_id`, `parent_id`, `name`, `type` ('folder' | 'file'), `mime_type`, `size_bytes`, `storage_type` ('FILE' | 'VIRTUAL') y `storage_path`.
   - Mantener retrocompatibilidad y campos del sistema (`path LTREE`, `pos_x`, `pos_y`, `password`, `is_directory` generado/computado).
   - Crear un índice compuesto `(user_id, parent_id, type, name)` y preservar los índices para `path` y búsqueda trigramática `name`.

2. **Estructura Raíz Obligatoria y Seeder de 100.000 Nodos:**
   - Limpiar la tabla previa y generar la jerarquía raíz obligatoria:
     1. `/Escritorio`: Limpio y funcional con accesos de muestra y persistencia de coordenadas.
     2. `/Imagenes`: Subcarpetas por años (`/2024`, `/2025`, `/2026`) y meses (`/Enero` a `/Diciembre`), conteniendo exactamente **150 imágenes físicas reales** (.jpg, .png, .webp) guardadas en `/backend/storage/images/`.
     3. `/Facturas_CSV`: Subcarpetas por años y trimestres (`/T1` a `/T4`), conteniendo exactamente **500 archivos CSV virtuales** deterministas con cabecera y >= 25 líneas de facturación.
     4. `/Textos`: Subcarpetas (`/Notas`, `/Borradores`, `/Logs`) con archivos virtuales de texto.
     5. `/Codigo`: Subcarpetas (`/Proyecto_Alpha`, `/Scripts`, `/Configs`, estructurando `node_modules` y paquetes reales) con archivos virtuales (`.json`, `.md`, `.js`, `.ts`, `.sql`).
     6. `/Documentos_PDF`: Subcarpetas (`/Contratos`, `/Manuales`, `/Informes`) con simulación y binarios mínimos de PDFs.
     7. `/Dibujos_Paint`: Subcarpetas (`/Bocetos`, `/Sprites`, `/Lienzos`) con archivos `.png`.
   - Total exacto de nodos generados: **100.000 nodos**.

3. **Backend y Generador Determinista al Vuelo:**
   - Generador determinista mediante semilla (`id` o `name`) para CSVs, código (`.js`, `.ts`, `.json`, `.sql`), PDFs y notas.
   - Endpoint `GET /api/files/:id/raw`: Entrega el contenido binario o de texto con su `mime_type` correspondiente (tanto físico como virtual).
   - Endpoint `GET /api/files/:id/download`: Inyecta `Content-Disposition: attachment; filename="{node.name}"` para descarga real funcional en el sistema operativo del usuario.
   - Paginación y metadatos (`total`, `page`, `totalPages`) en `GET /api/nodes`.

4. **Frontend (Oxplorer, Onotes, Osheets, Opics):**
   - Adaptar `types/filesystem.ts` y `filesystemStore`.
   - Oxplorer: Consumo de endpoints `/api/files/:id/raw` y `/api/files/:id/download`, opción de menú "⬇️ Descargar", y soporte de paginación/carga diferida para carpetas masivas.
   - Onotes y Osheets: Carga asíncrona mediante `/api/files/:id/raw` si el contenido es virtual.
   - Opics: Consumo de imágenes reales del almacenamiento físico mediante `/api/files/:id/raw`.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar

- **Crear:**
  - `backend/src/utils/virtualFiles.ts`: Generador determinista de contenido (CSVs de facturas con >= 25 líneas, código JS/TS/JSON/SQL/MD, PDFs válidos).
  - `backend/src/utils/imageGenerator.ts`: Generador / aprovisionador de las 150 imágenes físicas reales en disco (`backend/storage/images/`).
  - `backend/storage/images/.gitkeep`: Carpeta física de almacenamiento para los 150 binarios reales.

- **Modificar:**
  - `docker/postgres/init/01_init.sql`:
    - Actualizar definición de `filesystem_nodes` con `user_id`, `type`, `storage_type`, `storage_path`, `is_directory` (generada), e índice compuesto `(user_id, parent_id, type, name)`.
  - `backend/src/server.ts`:
    - Migración automática al arrancar para adaptar columnas e índices en caso de existir la tabla.
    - Implementar `GET /api/files/:id/raw` y `GET /api/files/:id/download`.
    - Actualizar `GET /api/nodes` con soporte de `storage_type`, `storage_path`, `user_id`, `type`, y conteo total para paginación.
    - Actualizar consultas de inserción y actualización para contemplar `type`, `storage_type`, `storage_path`.
  - `backend/scripts/seed.ts`:
    - Reescribir por completo para generar las 150 imágenes físicas en disco, los 500 CSVs virtuales en trimestres, y la distribución exacta de 100.000 nodos con la jerarquía raíz solicitada.
  - `frontend/src/types/filesystem.ts`:
    - Añadir `user_id`, `type`, `storage_type`, `storage_path` a `FileNode`, y `total`, `totalPages` a `NodesResponse`.
  - `frontend/src/stores/filesystem.ts`:
    - Añadir helpers para URLs raw/download y soporte de paginación.
  - `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:
    - Conectar apertura de archivos a `/api/files/:id/raw`.
    - Añadir opción "⬇️ Descargar" en menú contextual y barra de herramientas conectada a `/api/files/:id/download`.
    - Añadir paginación / "Cargar más" en carpetas con alta densidad de nodos.
  - `frontend/src/components/apps/onotes/OnotesWindow.vue`:
    - Obtener contenido desde `/api/files/:id/raw` si no viene pre-cargado en memoria.
  - `frontend/src/components/apps/osheets/OsheetsWindow.vue`:
    - Obtener CSV desde `/api/files/:id/raw` si no viene pre-cargado.
  - `frontend/src/components/apps/opics/OpicsWindow.vue`:
    - Usar `/api/files/${img.id}/raw` como origen de previsualización y vista individual de las 150 imágenes físicas reales.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)

- **Base de Datos (PostgreSQL):**
  - Tabla `filesystem_nodes`:
    - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
    - `user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'`
    - `parent_id UUID REFERENCES filesystem_nodes(id) ON DELETE CASCADE`
    - `name VARCHAR(255) NOT NULL`
    - `type VARCHAR(20) NOT NULL DEFAULT 'file' CHECK (type IN ('folder', 'file'))`
    - `is_directory BOOLEAN GENERATED ALWAYS AS (type = 'folder') STORED`
    - `mime_type VARCHAR(100)`
    - `size_bytes BIGINT DEFAULT 0`
    - `storage_type VARCHAR(20) NOT NULL DEFAULT 'VIRTUAL' CHECK (storage_type IN ('FILE', 'VIRTUAL'))`
    - `storage_path TEXT`
    - `path LTREE NOT NULL`
    - `pos_x INTEGER`
    - `pos_y INTEGER`
    - `content TEXT`
    - `password VARCHAR(255)`
    - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
  - Índices:
    - `CREATE INDEX idx_fs_user_parent_type_name ON filesystem_nodes (user_id, parent_id, type, name);`
    - `CREATE INDEX idx_fs_path_gist ON filesystem_nodes USING GIST (path);`
    - `CREATE INDEX idx_fs_parent_id ON filesystem_nodes (parent_id);`
    - `CREATE INDEX idx_fs_name_trgm ON filesystem_nodes USING GIN (name gin_trgm_ops);`

- **Endpoints Backend:**
  - `GET /api/files/:id/raw`:
    - Devuelve el contenido exacto del archivo con su `Content-Type: {mime_type}`.
  - `GET /api/files/:id/download`:
    - Devuelve el contenido con cabecera `Content-Disposition: attachment; filename="{node.name}"` y su `Content-Type`.
  - `GET /api/nodes`:
    - Acepta `parentId`, `parentPath`, `page`, `limit`.
    - Retorna `{ took_ms, count, total, page, totalPages, currentFolder, nodes }`.

- **Estado en Pinia:**
  - `filesystemStore`:
    - Añadir `currentPage`, `totalNodes`, `hasMoreNodes`, y métodos `loadMoreFolderContents()`.
    - Métodos auxiliares `getFileRawUrl(id)` y `downloadFile(id, name)`.

---

### 4. Pasos secuenciales de ejecución

1. **Crear y registrar el plan de implementación:**
   - Registrar este documento en `/implementation_plans/2026-10-17_03-23_refactor-filesystem-hibrido-100k-nodos.md`.
2. **Actualizar el Esquema de Base de Datos:**
   - Modificar `docker/postgres/init/01_init.sql` con el nuevo esquema, columnas y el índice compuesto `(user_id, parent_id, type, name)`.
   - Añadir script o migración en `server.ts` para aplicar `ALTER TABLE` o recrear la tabla de forma segura.
3. **Módulo de Archivos Virtuales y Aprovisionamiento Físico:**
   - Crear `backend/src/utils/virtualFiles.ts` con el generador determinista (CSV facturas >= 25 líneas con cálculos, JS/TS, JSON, SQL, PDF, Paint).
   - Crear `backend/src/utils/imageGenerator.ts` para aprovisionar las 150 imágenes físicas reales en `backend/storage/images/`.
4. **Reescribir Seeder Masivo (100.000 nodos):**
   - Actualizar `backend/scripts/seed.ts` con la estructura raíz obligatoria:
     - `/Escritorio` (Limpio con accesos de muestra)
     - `/Imagenes` (Años 2024-2026, 12 meses, 150 imágenes físicas)
     - `/Facturas_CSV` (Años 2024-2026, 4 trimestres, 500 CSVs virtuales)
     - `/Textos` (`/Notas`, `/Borradores`, `/Logs`)
     - `/Codigo` (`/Proyecto_Alpha`, `/Scripts`, `/Configs`, `node_modules`)
     - `/Documentos_PDF` (`/Contratos`, `/Manuales`, `/Informes`)
     - `/Dibujos_Paint` (`/Bocetos`, `/Sprites`, `/Lienzos`)
   - Ejecutar el seeder y verificar la inserción exacta de los 100.000 nodos.
5. **Implementar Endpoints en el Backend:**
   - Añadir endpoints `GET /api/files/:id/raw` y `GET /api/files/:id/download`.
   - Adaptar `GET /api/nodes` para incluir campos de almacenamiento y conteo para paginación.
6. **Actualizar Frontend (Tipos, Stores y Componentes):**
   - Actualizar `types/filesystem.ts` y `filesystemStore`.
   - Modificar `OxplorerWindow.vue` para conectarlo a los nuevos endpoints, añadir acción de descarga y paginación en carpetas extensas.
   - Modificar `OnotesWindow.vue`, `OsheetsWindow.vue` y `OpicsWindow.vue` para consumir `/api/files/:id/raw`.
7. **Pruebas y Verificación:**
   - Verificar compilación en frontend (`npm run build`) y arranque en backend.
   - Validar navegación rápida en carpetas con miles de elementos, descarga real de archivos y visualización de imágenes físicas en Opics.
