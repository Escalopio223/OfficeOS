# Plan de Implementación: Menú de Inicio Desplegable de Aplicaciones en la Barra de Tareas (Estilo Windows)

**Fecha y hora:** 2026-10-18 05:08  
**Rama:** `feature/start-menu`  

---

### 1. Objetivo de la tarea
Diseñar e implementar el **Menú de Inicio desplegable estilo Windows** (Start Menu) en el botón de Inicio (logo de Oogle) de la barra de tareas (`Taskbar.vue`), permitiendo al usuario:
1. Desplegar un menú emergente con animación fluida y estética glassmorphism moderna al hacer clic en el botón de Inicio.
2. Visualizar y lanzar rápidamente todas las aplicaciones disponibles en el ecosistema OogleOS:
   - **Oxplorer** (Explorador de Archivos)
   - **Onotes** (Editor de Notas y Código)
   - **Osheets** (Hojas de Cálculo CSV)
   - **Opics** (Galería de Fotos)
   - **Opdf** (Visor y Creador PDF)
   - **Opaint** (Estudio de Dibujo Digital)
   - **Omonitor** (Administrador de Tareas y Telemetría)
   - **Oplanner** (Suite de Planificación y Proyectos)
3. Barra de búsqueda integrada en la parte superior del menú para filtrar aplicaciones en tiempo real.
4. Barra inferior de usuario con perfil autenticado y botón de cierre de sesión (`authStore.logout()`).
5. Cierre automático al hacer clic fuera del menú, al pulsar la tecla `Escape` o al abrir cualquier aplicación.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar

#### Archivos a Crear:
1. `frontend/src/components/desktop/StartMenu.vue`:
   - Componente modular para el menú de inicio con buscador reactivo, lista de apps del sistema con sus iconos SVG y barra de perfil de usuario/cierre de sesión.
2. `frontend/src/__tests__/StartMenu.spec.ts`:
   - Pruebas unitarias para verificar la lista de aplicaciones, el filtrado por búsqueda y la apertura de ventanas.

#### Archivos a Modificar:
1. `frontend/src/components/desktop/Taskbar.vue`:
   - Estado reactivo `isStartMenuOpen`.
   - Alternar visibilidad al hacer clic en `.oogle-start-btn`.
   - Montar el componente `StartMenu.vue` con control de clic exterior y cierre automático.
2. `frontend/src/App.vue`:
   - Conectar el evento de toggle si aplica o mantener el estado encapsulado dentro de `Taskbar.vue`.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)
- No requiere cambios en base de datos ni endpoints backend.
- Utiliza los stores existentes `useWindowStore` (para abrir ventanas) y `useAuthStore` (para información de usuario y logout).

---

### 4. Pasos secuenciales de ejecución

1. **Creación del Componente `StartMenu.vue`:**
   - Estructurar plantilla con header (buscador reactivo), grid/lista de aplicaciones con iconos oficiales y footer de usuario/logout.
   - Aplicar estilos dark/glassmorphic estilo Windows 11 con bordes suaves, desenfoque de fondo y micro-interacciones hover.
2. **Integración en `Taskbar.vue`:**
   - Importar `StartMenu.vue`.
   - Controlar apertura/cierre reactivo en el botón `.oogle-start-btn`.
   - Detectar clic fuera del menú para cerrarlo automáticamente.
3. **Pruebas y Verificación:**
   - Crear suite de pruebas en `frontend/src/__tests__/StartMenu.spec.ts`.
   - Ejecutar `npx vitest run` y `npm run type-check`.
