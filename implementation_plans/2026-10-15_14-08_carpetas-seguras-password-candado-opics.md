# Plan de Implementación: Carpetas Seguras con Contraseña, Candado Visual y Exclusión en Opics

**Fecha y hora:** 2026-10-15 14:08  
**Rama:** `feature/folders-usage-3`  

---

### 1. Objetivo de la tarea
Implementar un sistema de seguridad por contraseña para carpetas en OogleOS con las siguientes características:
1. **Creación y gestión de carpetas seguras:**
   - Permitir crear carpetas protegidas con contraseña desde el escritorio (`DesktopWorkspace.vue`) y desde el explorador (`OxplorerWindow.vue`).
   - Permitir proteger carpetas existentes asignando una contraseña.
   - Permitir quitar la protección de una carpeta protegida solicitando y validando la contraseña actual.
2. **Control de acceso:**
   - Al intentar abrir una carpeta protegida (mediante doble clic en el escritorio o en Oxplorer), se debe requerir obligatoriamente la contraseña para poder visualizar su contenido.
   - Si la contraseña es correcta, se concede el acceso a la carpeta; si es incorrecta, se notifica el fallo de autenticación.
3. **Indicador visual de candado:**
   - Si una carpeta tiene contraseña, mostrar un icono de candado superpuesto sobre el icono de la carpeta, tanto en los iconos del escritorio como en las tarjetas y vistas de Oxplorer.
4. **Componente de UI para introducir la contraseña:**
   - Reutilizar / igualar el componente modal de tipo glassmorphism utilizado para nombrar archivos (`showNameModal`), adaptado para solicitar y verificar contraseñas con campos seguros (`type="password"`), mensajes de error y confirmación con tecla `Enter` o botón `Aceptar`.
5. **Privacidad en Opics:**
   - Modificar las consultas de imágenes de Opics (`GET /api/nodes/images`) para que ninguna imagen que resida dentro de una carpeta protegida (o en cualquiera de sus subdirectorios descendientes) aparezca en la galería ni en las búsquedas por nombre de Opics.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar
- **Crear:**
  - `frontend/src/components/common/SecurityModal.vue`:
    - Componente modal reutilizable con estética glassmorphism idéntica a la de creación de archivos, configurable para solicitar contraseñas, definir contraseñas nuevas o ingresar nombre y contraseña simultáneamente.
- **Modificar:**
  - `docker/postgres/init/01_init.sql`:
    - Agregar campo `password VARCHAR(255) NULL` en la definición de la tabla `filesystem_nodes`.
  - `backend/src/server.ts`:
    - Ejecutar migración automática al arrancar (`ALTER TABLE filesystem_nodes ADD COLUMN IF NOT EXISTS password VARCHAR(255) NULL;`).
    - Actualizar consultas `SELECT` para incluir `(password IS NOT NULL AND password <> '') AS is_protected`.
    - En `POST /api/nodes`, permitir recibir `password` al crear una carpeta protegida.
    - En `PATCH /api/nodes/:id`, permitir establecer `password` o removerla (`password: null`), validando `currentPassword` si ya estaba protegida.
    - Crear endpoint `POST /api/nodes/:id/verify-password` para validar si la contraseña proporcionada es correcta.
    - En `GET /api/nodes/images`, añadir cláusula `NOT EXISTS` con `path <@ pf.path` para excluir imágenes contenidas en carpetas con contraseña.
  - `frontend/src/types/filesystem.ts`:
    - Añadir campo opcional `is_protected?: boolean` en `FileNode`.
  - `frontend/src/stores/filesystem.ts`:
    - Añadir método `verifyFolderPassword(folderId: string, password: string)` y soporte para sesiones de carpetas desbloqueadas.
    - Añadir métodos `setFolderPassword(folderId: string, password: string)` y `removeFolderPassword(folderId: string, currentPassword: string)`.
  - `frontend/src/stores/desktopStore.ts`:
    - Añadir soporte para `is_protected` en `DesktopItem` y método helper `createSecureFolder(name, password, x, y)`.
  - `frontend/src/components/desktop/DesktopWorkspace.vue`:
    - Renderizar icono de candado superpuesto sobre carpetas que tengan `is_protected === true`.
    - Añadir opciones en el menú contextual del escritorio ("🔒 Nueva Carpeta Segura") y en el menú de carpeta ("🔒 Proteger con contraseña" / "🔓 Quitar protección").
    - Interceptar apertura por doble clic para solicitar contraseña mediante el modal antes de abrir en Oxplorer.
  - `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:
    - Renderizar icono de candado en las tarjetas de carpeta protegidas.
    - Añadir opciones en menús contextuales ("🔒 Nueva Carpeta Segura", "🔒 Proteger con contraseña", "🔓 Quitar protección").
    - Interceptar navegación en subcarpetas para solicitar contraseña con el modal.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de datos:**
  - Nueva columna `password VARCHAR(255) NULL` en `filesystem_nodes`.
  - Se utiliza `(password IS NOT NULL AND password <> '') AS is_protected` en las respuestas de la API para no filtrar contraseñas en texto plano a los clientes.
- **Endpoints:**
  - `POST /api/nodes/:id/verify-password`:
    - Body: `{ password: string }`
    - Retorna: `{ valid: boolean }`
  - `POST /api/nodes`:
    - Soporta campo opcional `password` al crear carpetas (`is_directory: true`).
  - `PATCH /api/nodes/:id`:
    - Soporta actualizar `password` (o `null` para quitar protección) validando `currentPassword` si corresponde.
  - `GET /api/nodes/images`:
    - Exclusión mediante `NOT EXISTS (SELECT 1 FROM filesystem_nodes pf WHERE pf.is_directory = true AND pf.password IS NOT NULL AND pf.password <> '' AND filesystem_nodes.path <@ pf.path)`.
- **Estado (Pinia):**
  - `filesystemStore`: Conjunto reactivo de IDs de carpetas desbloqueadas temporalmente en la sesión (`unlockedFolderIds = ref<Set<string>>(new Set())`).
  - `desktopStore`: Campo `is_protected` mapeado en `DesktopItem`.

---

### 4. Pasos secuenciales de ejecución
1. **Creación del Plan de Implementación:**
   - Registrar y guardar este documento en `/implementation_plans/2026-10-15_14-08_carpetas-seguras-password-candado-opics.md`.
2. **Backend: Migración de BD y Endpoints de Seguridad:**
   - Modificar `backend/src/server.ts` para asegurar la columna `password`, retornar `is_protected`, permitir proteger/desproteger carpetas y validar contraseñas.
   - Modificar `GET /api/nodes/images` para omitir imágenes contenidas en árboles de carpetas protegidas.
3. **Frontend: Modelos y Stores:**
   - Actualizar tipos en `frontend/src/types/filesystem.ts`.
   - Implementar métodos de verificación, protección y desbloqueo en `filesystem.ts` y `desktopStore.ts`.
4. **Frontend: Modal Reutilizable de Contraseñas:**
   - Desarrollar `SecurityModal.vue` reutilizando la estética visual del modal existente de Oxplorer.
5. **Frontend: Integración en DesktopWorkspace:**
   - Mostrar candado visual sobre carpetas con `is_protected`.
   - Integrar opciones de menú contextual y validación de contraseña antes de abrir carpetas protegidas.
6. **Frontend: Integración en Oxplorer:**
   - Mostrar candado visual en las tarjetas de carpeta protegidas.
   - Integrar opciones de creación de carpeta segura y gestión de protección en menús contextuales.
   - Solicitar contraseña al navegar a carpetas protegidas.
7. **Pruebas y Verificación:**
   - Probar creación de carpeta con contraseña, validación de acceso, desprotección con contraseña correcta, y rechazo de contraseña incorrecta.
   - Probar que las imágenes dentro de la carpeta protegida no aparezcan en Opics.
   - Ejecutar suite de pruebas (`npm run test:unit`) y compilación (`npm run build`).
