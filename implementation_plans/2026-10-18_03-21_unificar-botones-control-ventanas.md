# Plan de Implementación: Unificación de Botones de Control de Ventana en OogleOS

**Fecha y hora:** 2026-10-18 03:21  
**Rama:** `feature/Opaint`  

---

### 1. Objetivo de la tarea
Estandarizar y unificar los tamaños, proporciones, iconografía SVG, espaciados y estados visuales (hover/active) de los botones de control de ventana (**Minimizar**, **Maximizar/Restaurar** y **Cerrar**) en todas las aplicaciones del ecosistema OogleOS:
- **Opaint** (`OpaintWindow.vue`)
- **Opdf** (`OpdfWindow.vue`)
- **Opics** (`OpicsWindow.vue`)
- **Osheets** (`OsheetsWindow.vue`)
- **Onotes** (`OnotesWindow.vue`)
- **Oxplorer** (`OxplorerWindow.vue`)

Para asegurar la coherencia estética global y evitar duplicidad de estilos dispersos, se creará un componente reutilizable `WindowControls.vue` en `frontend/src/components/common/WindowControls.vue` que centralizará el diseño, las dimensiones exactas (`28px x 26px`, radio `6px`, espaciado `gap: 6px`) y los vectores SVG de alta definición para los controles de ventana.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar

#### Archivos a Crear:
1. `frontend/src/components/common/WindowControls.vue`:
   - Componente estandarizado que renderiza los tres botones con SVG vectoriales (línea para minimizar, rectángulo/doble rectángulo para maximizar/restaurar y cruz para cerrar).
   - Props: `windowId: WindowId`, `isMaximized: boolean`.
   - Eventos/Acciones: Integración directa con `useWindowStore` (`toggleMinimize`, `toggleMaximize`, `closeWindow`) con `@click.stop` y `@mousedown.stop`.

#### Archivos a Modificar:
1. `frontend/src/components/apps/opaint/OpaintWindow.vue`:
   - Reemplazar los botones de texto dispersos (`─`, `□`, `✕`) por `<WindowControls window-id="opaint" :is-maximized="winState.isMaximized" />`.
2. `frontend/src/components/apps/opdf/OpdfWindow.vue`:
   - Reemplazar los controles actuales por `<WindowControls window-id="opdf" :is-maximized="winState.isMaximized" />`.
3. `frontend/src/components/apps/opics/OpicsWindow.vue`:
   - Reemplazar los botones manuales por `<WindowControls window-id="opics" :is-maximized="winState.isMaximized" />`.
4. `frontend/src/components/apps/osheets/OsheetsWindow.vue`:
   - Reemplazar los botones manuales por `<WindowControls window-id="osheets" :is-maximized="winState.isMaximized" />`.
5. `frontend/src/components/apps/onotes/OnotesWindow.vue`:
   - Reemplazar los botones manuales por `<WindowControls window-id="onotes" :is-maximized="winState.isMaximized" />`.
6. `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:
   - Utilizar `<WindowControls window-id="oxplorer" :is-maximized="winState.isMaximized" />` para garantizar 100% de coherencia transversal.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)

- **Base de datos:** Ninguno.
- **Endpoints:** Ninguno.
- **Estado (Pinia):** Reutiliza las funciones existentes en `windowStore` (`toggleMinimize`, `toggleMaximize`, `closeWindow`).

---

### 4. Pasos secuenciales de ejecución

1. **Creación del Plan de Implementación:**
   - Registrar y guardar este documento en `/implementation_plans/2026-10-18_03-21_unificar-botones-control-ventanas.md`.
2. **Creación del Componente WindowControls:**
   - Implementar `frontend/src/components/common/WindowControls.vue` con dimensiones unificadas (`width: 28px; height: 26px; border-radius: 6px`), iconografía SVG limpia y estilos de hover estándar (#ef4444 en close, rgba(255,255,255,0.15) en minimize/maximize).
3. **Integración en Todas las Ventanas de OogleOS:**
   - Actualizar `OpaintWindow.vue`, `OpdfWindow.vue`, `OpicsWindow.vue`, `OsheetsWindow.vue`, `OnotesWindow.vue` y `OxplorerWindow.vue`.
4. **Verificación y Pruebas:**
   - Ejecutar suite de pruebas unitarias (`npx vitest run`).
   - Ejecutar compilación de producción (`npm run build`) para verificar ausencia de errores de tipado o template.
