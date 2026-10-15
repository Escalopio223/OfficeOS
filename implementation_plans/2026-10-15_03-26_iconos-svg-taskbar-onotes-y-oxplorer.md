# Plan de Implementación: Iconos SVG en Taskbar para Onotes y Oxplorer

**Fecha y hora:** 2026-10-15 03:26  
**Rama:** `feature/folders-usage`  

---

### 1. Objetivo de la tarea
El objetivo es mostrar dinámicamente en la barra de tareas (`Taskbar.vue`) el icono SVG correspondiente a cada aplicación cuando esté abierta:
- Mostrar `onotes.svg` cuando se abra un documento de texto o nota (ventana de `onotes`).
- Mostrar `oxplorer.svg` cuando se abra Oxplorer o cualquier carpeta del escritorio (ventana de `oxplorer`).
- Asegurar que la barra de tareas no tenga hardcodeado un único icono para todas las ventanas, mapeando de forma limpia cada ventana a su SVG correspondiente y manteniendo soporte visual para otras ventanas (`osheets`, `ophotos`).

---

### 2. Lista exacta de archivos a crear, modificar o eliminar
- **Modificar:**
  - `frontend/src/components/desktop/Taskbar.vue`: Importar `onotesSvg` desde `@/assets/onotes.svg`, definir función/mapeo reactivo de iconos por identificador de ventana (`getWindowIcon(win.id)`), y enlazar el atributo `:src` de la imagen de cada item en la barra de tareas.
  - (Opcional complementario) `frontend/src/components/apps/onotes/OnotesWindow.vue`: Usar `onotes.svg` en la cabecera de la ventana de Onotes para coherencia visual completa entre la ventana y la barra de tareas.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de datos:** Ninguno.
- **Endpoints:** Ninguno.
- **Estado (Pinia):** Ningún cambio destructivo; se aprovecha la propiedad `win.id` existente en `windowStore` ('oxplorer', 'onotes', etc.) para resolver el SVG correspondiente.

---

### 4. Pasos secuenciales de ejecución
1. **Creación del Plan de Implementación:** Guardar este documento en `/implementation_plans/2026-10-15_03-26_iconos-svg-taskbar-onotes-y-oxplorer.md`.
2. **Actualizar `Taskbar.vue`:**
   - Importar `onotesSvg` desde `@/assets/onotes.svg`.
   - Crear mapa/función helper `getWindowIcon(id: string): string` que devuelva `onotesSvg` para `'onotes'` y `oxplorerSvg` para `'oxplorer'` (con fallback a `oxplorerSvg`).
   - Sustituir `<img :src="oxplorerSvg" alt="Oxplorer" class="app-icon" />` por `<img :src="getWindowIcon(win.id)" :alt="win.title" class="app-icon" />`.
3. **Actualizar `OnotesWindow.vue` (coherencia de marca):**
   - Importar `onotesSvg` y sustituir el icono genérico en el encabezado por el SVG oficial de Onotes.
4. **Verificación y validación:**
   - Ejecutar `npm run build` en el frontend para asegurar tipado y empaquetado sin errores.
   - Ejecutar `npm run test:unit -- --run` para verificar la suite de tests.
5. **Comunicación al usuario:** Informar de la finalización de los cambios implementados.
