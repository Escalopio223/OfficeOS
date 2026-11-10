# Plan de Implementación - Aislar Coordenadas de Previsualización de Arrastre sin Mutar Estado de Iconos

## 1. Objetivo de la tarea
Eliminar por completo cualquier posibilidad de que un archivo o aplicación del escritorio quede posicionado fuera de una celda de cuadrícula libre o en una posición en rojo (ocupada), aislando la posición temporal del puntero durante el arrastre (`dragPreviewPos`) para no mutar nunca `item.x` / `item.y` ni `app.x` / `app.y` durante el evento `mousemove`.

---

## 2. Lista exacta de archivos a crear, modificar o eliminar
- **Modificar:**
  - `frontend/src/components/desktop/DesktopWorkspace.vue`:
    - Introducir `dragPreviewPos = ref<{ x: number; y: number } | null>(null)` para representar exclusivamente la posición visual flotante del icono mientras se arrastra.
    - Eliminar las mutaciones directas `appTarget.x = nextX; appTarget.y = nextY;` y `targetItem.x = nextX; targetItem.y = nextY;` dentro de `onGlobalMouseMove`. De esta forma, `item.x`/`item.y` y `app.x`/`app.y` **jamás** contienen coordenadas intermedias fuera de la cuadrícula.
    - Actualizar el `:style` de `.shortcut-item` mediante funciones auxiliares `getAppStyle(app)` y `getItemStyle(item)` que usan `dragPreviewPos` únicamente mientras `isActuallyDragging && activeDragId === id`, y vuelven instantáneamente a las coordenadas de cuadrícula (`item.x, item.y`) en cuanto se suelta el ratón.
    - En `onGlobalMouseUp()`: evaluar la celda destino a partir de `dragPreviewPos`. Si la celda destino está ocupada (`isGridSlotOccupied` es `true`, mostrado en rojo), descartar el movimiento sin modificar `item.x`/`item.y` (por lo que el icono vuelve automáticamente a su celda original intacta). Solo actualizar `item.x`/`item.y` y persistir en el backend si la celda destino está libre.
    - Añadir limpieza de *listeners* en `onUnmounted` para evitar listeners huérfanos tras recargas de HMR en Vite.

---

## 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de datos:** Ningún cambio de esquema.
- **Endpoints:** Ningún cambio.
- **Estado (Pinia):** Los elementos de `useDesktopStore().items` nunca reciben coordenadas intermedias fuera de la cuadrícula durante `mousemove`.

---

## 4. Pasos secuenciales de ejecución
1. **Crear el plan de implementación** en `implementation_plans/2026-11-10_20-12_aislar-coordenadas-preview-arrastre-sin-mutar-items.md`.
2. **Actualizar `frontend/src/components/desktop/DesktopWorkspace.vue`** para usar `dragPreviewPos` durante el arrastre y prohibir mutaciones de coordenadas fuera de la cuadrícula en `desktopStore.items` y `appShortcuts`.
3. **Ejecutar los tests unitarios de Vitest** para verificar que toda la suite pasa sin errores.
4. **Hacer commit de los cambios en la rama `fix/secure-folder`**.
