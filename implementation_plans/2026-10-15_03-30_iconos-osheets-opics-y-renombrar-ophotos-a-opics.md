# Plan de Implementación: Iconos SVG para Osheets y Opics, y Renombrar Ophotos a Opics

**Fecha y hora:** 2026-10-15 03:30  
**Rama:** `feature/folders-usage`  

---

### 1. Objetivo de la tarea
1. **Asociar iconos SVG en la barra de tareas y cabeceras de ventana:**
   - Mostrar `osheets.svg` en la barra de tareas (`Taskbar.vue`) cuando se abra un archivo de hoja de cálculo (`.CSV` en Osheets), y utilizar dicho SVG en la cabecera de la ventana `OsheetsWindow.vue`.
   - Mostrar `opics.svg` en la barra de tareas (`Taskbar.vue`) cuando se abra un archivo de imagen (`.JPG`, `.PNG`), y utilizar dicho SVG en la cabecera de la ventana.
2. **Renombrar completamente Ophotos a Opics:**
   - Renombrar el componente y directorio `components/apps/ophotos/OphotosWindow.vue` a `components/apps/opics/OpicsWindow.vue`.
   - Actualizar el identificador de ventana en `windowStore.ts` de `ophotos` a `opics` (tipo `WindowId`, estado y título por defecto `'Opics'`).
   - Actualizar las aperturas de ventana y renderizado condicional en `DesktopWorkspace.vue` y `OxplorerWindow.vue` para usar `opics`.
   - Actualizar las clases CSS, textos y títulos internos de la ventana a Opics.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar
- **Crear:**
  - `frontend/src/components/apps/opics/OpicsWindow.vue` (componente renombrado y adaptado de OphotosWindow con `opics.svg`).
- **Modificar:**
  - `frontend/src/components/desktop/Taskbar.vue`: Importar `osheetsSvg` y `opicsSvg` y mapear `'osheets'` y `'opics'` en `getWindowIcon`.
  - `frontend/src/stores/windowStore.ts`: Cambiar `'ophotos'` por `'opics'` en `WindowId` y en el mapa de ventanas inicial.
  - `frontend/src/components/apps/osheets/OsheetsWindow.vue`: Importar `osheetsSvg`, usarlo en el header y sincronizar el título en la barra de tareas.
  - `frontend/src/components/desktop/DesktopWorkspace.vue`: Reemplazar importación y uso de `OphotosWindow` por `OpicsWindow`, y llamadas a `winStore.openWindow('opics', ...)`.
  - `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`: Cambiar llamadas a `winStore.openWindow('opics', ...)` al abrir imágenes (.JPG, .PNG).
- **Eliminar:**
  - `frontend/src/components/apps/ophotos/OphotosWindow.vue` (reemplazado por `OpicsWindow.vue`).

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de datos:** Ninguno.
- **Endpoints:** Ninguno.
- **Estado (Pinia - `windowStore.ts`):**
  - `WindowId`: `'oxplorer' | 'onotes' | 'osheets' | 'opics'`.
  - `windows.opics`: `{ id: 'opics', title: 'Opics', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 13, data: null }`.

---

### 4. Pasos secuenciales de ejecución
1. **Creación del Plan de Implementación:** Guardar este documento en `/implementation_plans/2026-10-15_03-30_iconos-osheets-opics-y-renombrar-ophotos-a-opics.md`.
2. **Actualizar `windowStore.ts`:**
   - Cambiar tipo `WindowId` a `'oxplorer' | 'onotes' | 'osheets' | 'opics'`.
   - Reemplazar clave `ophotos` por `opics` en `windows`.
3. **Crear `OpicsWindow.vue`:**
   - Copiar/adaptar `OphotosWindow.vue` como `OpicsWindow.vue`.
   - Importar `opicsSvg` de `@/assets/opics.svg`.
   - Reemplazar todas las referencias internas de `ophotos` por `opics`.
   - Sincronizar el título de la ventana con el archivo visualizado (`winStore.windows['opics'].title = fileName`).
4. **Eliminar `OphotosWindow.vue`:**
   - Eliminar el archivo antiguo `OphotosWindow.vue`.
5. **Actualizar `OsheetsWindow.vue`:**
   - Importar `osheetsSvg` de `@/assets/osheets.svg`.
   - Usar `osheetsSvg` en la cabecera.
   - Sincronizar el título de la ventana con el nombre del CSV (`winStore.windows['osheets'].title = fileName`).
6. **Actualizar `Taskbar.vue`:**
   - Importar `osheetsSvg` y `opicsSvg`.
   - Añadir casos `'osheets'` y `'opics'` (con fallback `'ophotos'`) en `getWindowIcon`.
7. **Actualizar `DesktopWorkspace.vue` y `OxplorerWindow.vue`:**
   - En `DesktopWorkspace.vue`, importar y usar `OpicsWindow` en lugar de `OphotosWindow`, y abrir `'opics'` al hacer doble clic en imágenes.
   - En `OxplorerWindow.vue`, abrir `'opics'` al hacer doble clic en imágenes.
8. **Verificación y validación:**
   - Ejecutar `npm run build` en el frontend (`vue-tsc` + `vite build`).
   - Ejecutar `npm run test:unit -- --run`.
9. **Comunicación al usuario:** Informar detalladamente de los cambios completados.
