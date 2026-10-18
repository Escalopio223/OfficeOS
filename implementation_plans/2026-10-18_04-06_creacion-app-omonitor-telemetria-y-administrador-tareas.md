# Plan de Implementación: Creación de la Aplicación Omonitor (Administrador de Tareas, Métricas del Servidor en Tiempo Real y Telemetría de Sesiones)

**Fecha y hora:** 2026-10-18 04:06  
**Rama:** `feature/omonitor`  

---

### 1. Objetivo de la tarea
Diseñar e implementar de extremo a extremo la aplicación del sistema **Omonitor** dentro de OogleOS, cubriendo:
1. **Integración en el Sistema Operativo (UI & Accesos):**
   - Icono oficial del sistema mediante `frontend/src/assets/omonitor.svg`.
   - Acceso directo en el escritorio virtual (`DesktopWorkspace.vue`).
   - Menú contextual (clic derecho) sobre la barra de tareas (`Taskbar.vue`) con opción para abrir o enfocar "Administrador de tareas / Omonitor" y "Mostrar el escritorio".
   - Registro en `windowStore.ts` y utilización del componente unificado `WindowControls.vue`.
2. **Arquitectura Backend (Node.js, Fastify/Express, PostgreSQL, Redis, BullMQ):**
   - **Canal de Tiempo Real (SSE):** Endpoint `GET /api/system/stream` (`text/event-stream`, `keep-alive`, `no-cache`), con limpieza estricta de intervalos y listeners en `req.on('close')` para evitar fugas de memoria.
   - **Métricas Reales (cada 2 segundos):**
     - CPU (%) calculada mediante delta diferencial de tiempos `idle` vs `total` con `os.cpus()`.
     - Memoria del host (`os.totalmem()`, `os.freemem()`) y del proceso Node.js (`process.memoryUsage()`).
     - Uptime del servidor y latencia del Event Loop.
     - Healthchecks con latencia en milisegundos para PostgreSQL (`SELECT 1`), Redis (`PING`) y contadores de trabajos en colas BullMQ (`waiting`, `active`, `completed`, `failed`).
   - **Interceptor de Logs en Tiempo Real:** Middleware/hook que capture peticiones HTTP entrantes (`method`, `url`, `statusCode`, `responseTime`, `sessionHash`) y las emita por el stream SSE.
   - **Telemetría de Sesiones sin IP (RGPD):**
     - Tabla `telemetry_sessions` en PostgreSQL con `session_hash` corto (ej. `#a4f9`), User-Agent parseado (SO y navegador), resolución de pantalla, zona horaria, idioma, referrer categorizado, fecha de inicio y última actividad.
     - Endpoints `POST /api/telemetry/session` y `POST /api/telemetry/heartbeat`.
   - **Reactividad Cruzada de Archivos (Causa y Efecto):**
     - Contabilizar `files_created`, `files_opened`, `files_deleted` por sesión.
     - Interceptar creación (`POST /api/nodes`), apertura (`GET /api/files/:id/raw` o evento de apertura) y borrado (`DELETE /api/nodes/:id`) para incrementar contadores en base de datos y emitir evento SSE reactivo inmediato.
3. **Arquitectura Frontend (Vue 3 Composition API + Pinia):**
   - Store reactivo `useOmonitorStore` en `frontend/src/stores/omonitorStore.ts`.
   - Ventana `OmonitorWindow.vue` con 3 pestañas principales:
     - **Pestaña 1 (Procesos):** Lista de ventanas abiertas en OogleOS, PID simulado, estado (Activa/Minimizada), tiempo activo y botón "Finalizar tarea".
     - **Pestaña 2 (Rendimiento):** Gráficas SVG nativas con cola FIFO de 30 muestras (60s) para CPU (%) y Memoria (RAM / V8 Heap), tarjetas de estado de infraestructura (Postgres, Redis, BullMQ) y consola de logs con auto-scroll.
     - **Pestaña 3 (Telemetría y Tráfico):** KPIs superiores (visitas únicas, usuarios online, tiempo medio, total archivos manipulados) y tabla de sesiones con la sesión actual destacada `🟢 Online (Tú / Sesión Actual)` y destellos visuales CSS (flash) ante cambios en tiempo real.
     - **Inspector de Stream Crudo (`</> Raw Stream / API Inspector`):** Panel lateral/desplegable con el payload JSON crudo recibido por SSE.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar

#### Archivos a Crear:
1. `backend/src/utils/systemMetrics.ts`:
   - Módulo de cálculo diferencial de CPU (`os.cpus()`), memoria, event loop lag, ping a PostgreSQL, ping a Redis y métricas de cola BullMQ.
2. `backend/src/utils/telemetry.ts`:
   - Lógica de hash de sesión, categorización de referrers, parser de SO/Navegador y emitter global de eventos de sistema.
3. `frontend/src/stores/omonitorStore.ts`:
   - Store Pinia para conexión SSE, gestión de sesión cliente (`localStorage`), historial FIFO de métricas (CPU/RAM), logs en vivo y lista de sesiones.
4. `frontend/src/components/apps/omonitor/OmonitorWindow.vue`:
   - Ventana principal de Omonitor con pestañas (Procesos, Rendimiento, Telemetría) y botón para desplegar el inspector de stream crudo.
5. `frontend/src/components/apps/omonitor/MetricChartSvg.vue`:
   - Gráfica de línea SVG nativa (`<svg>`, `<polyline>`, `<polygon>`) para métricas continuas sin dependencias externas.
6. `frontend/src/components/apps/omonitor/RawStreamInspector.vue`:
   - Panel lateral desplegable con payload JSON crudo, status SSE y latencia de paquetes.
7. `frontend/src/__tests__/omonitor.spec.ts`:
   - Pruebas unitarias para el store `useOmonitorStore` y componentes de Omonitor.

#### Archivos a Modificar:
1. `backend/package.json`:
   - Añadir dependencia `bullmq` (instalada).
2. `backend/src/server.ts`:
   - Crear tabla `telemetry_sessions` en la inicialización de la base de datos.
   - Registrar interceptor de logs en peticiones HTTP.
   - Endpoint `GET /api/system/stream` (SSE).
   - Endpoints `POST /api/telemetry/session` y `POST /api/telemetry/heartbeat`.
   - Conectar controladores de archivos (`/api/nodes`, `/api/files`) para actualizar métricas de sesión (`files_created`, `files_opened`, `files_deleted`) y emitir eventos SSE.
3. `frontend/src/stores/windowStore.ts`:
   - Añadir `'omonitor'` al tipo `WindowId` y estado inicial en `windows`.
4. `frontend/src/components/desktop/DesktopWorkspace.vue`:
   - Importar `OmonitorWindow.vue` y `omonitorSvg`.
   - Añadir acceso directo `Omonitor` a `appShortcuts`.
   - Montar `<OmonitorWindow v-if="winStore.windows['omonitor']?.isOpen" />`.
5. `frontend/src/components/desktop/Taskbar.vue`:
   - Añadir soporte para `opaintSvg` y `omonitorSvg` en `getWindowIcon`.
   - Implementar menú contextual con clic derecho sobre la barra de tareas ("📊 Administrador de tareas / Omonitor", "🖥️ Mostrar el escritorio").
6. `frontend/src/stores/filesystem.ts`:
   - Enviar cabecera `x-session-id` en las peticiones a la API para vincular la actividad de archivos a la sesión actual.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)

- **Base de datos (PostgreSQL):**
  - Nueva tabla `telemetry_sessions`:
    - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
    - `session_id VARCHAR(64) UNIQUE NOT NULL`
    - `session_hash VARCHAR(16) NOT NULL`
    - `os VARCHAR(64)`, `browser VARCHAR(64)`
    - `screen_resolution VARCHAR(32)`
    - `timezone VARCHAR(64)`, `language VARCHAR(32)`
    - `referrer VARCHAR(255)`, `referrer_category VARCHAR(64)`
    - `files_created INTEGER DEFAULT 0`
    - `files_opened INTEGER DEFAULT 0`
    - `files_deleted INTEGER DEFAULT 0`
    - `started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    - `last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
- **Endpoints:**
  - `GET /api/system/stream`: Server-Sent Events (SSE).
  - `POST /api/telemetry/session`: Registro/actualización de sesión cliente.
  - `POST /api/telemetry/heartbeat`: Latido de actividad de sesión.
  - `POST /api/telemetry/file-event`: Registro explícito de apertura de archivo si aplica.
- **Estado (Pinia):**
  - `windowStore.windows['omonitor']`
  - `omonitorStore`: métricas en vivo, 30 snapshots de historial, lista de logs, lista de sesiones, toggle de inspector crudo.

---

### 4. Pasos secuenciales de ejecución

1. **Creación de la Rama y Registro del Plan:**
   - Crear rama `feature/omonitor` y registrar este plan en `/implementation_plans/2026-10-18_04-06_creacion-app-omonitor-telemetria-y-administrador-tareas.md`.
2. **Módulos de Backend para Métricas y Telemetría:**
   - Implementar `backend/src/utils/systemMetrics.ts` (CPU delta, memoria, event loop lag, pings a Postgres/Redis y BullMQ).
   - Implementar `backend/src/utils/telemetry.ts` (parser de entorno, categorizador de referrers, emitter de eventos).
3. **Actualización de `server.ts`:**
   - Tabla `telemetry_sessions`.
   - Interceptor de logs y endpoint SSE `/api/system/stream`.
   - Integración de contadores de archivos en creación, apertura y borrado.
4. **Actualización de Stores en Frontend:**
   - Añadir `'omonitor'` a `windowStore.ts`.
   - Implementar `frontend/src/stores/omonitorStore.ts` con SSE, tracking de sesión e integración de `x-session-id`.
   - Actualizar llamadas de `filesystem.ts` con `x-session-id`.
5. **Componentes Frontend de Omonitor:**
   - Implementar `MetricChartSvg.vue` (gráfica de líneas nativa reactiva).
   - Implementar `RawStreamInspector.vue` (inspector de payload JSON).
   - Implementar `OmonitorWindow.vue` con pestañas Procesos, Rendimiento, Telemetría.
6. **Integración en el Sistema:**
   - Acceso directo en `DesktopWorkspace.vue`.
   - Menú contextual en `Taskbar.vue` con soporte de iconos en `getWindowIcon`.
7. **Pruebas y Verificación:**
   - Tests unitarios en `frontend/src/__tests__/omonitor.spec.ts`.
   - Ejecutar `npx vitest run` y `npm run build`.
   - Verificar flujo de eventos SSE y reactividad de sesiones.
