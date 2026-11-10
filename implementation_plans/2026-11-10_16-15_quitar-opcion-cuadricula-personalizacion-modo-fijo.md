# Plan de Implementación: Cuadrícula Fija Permanente y Eliminación de la Pestaña de Cuadrícula en Personalización

**Fecha y hora:** 2026-11-10 16:15  
**Rama de trabajo:** `feature/customization`  
**Autor:** Agente Antigravity / OfficeOS Team

---

## 1. Objetivo de la tarea

1. Eliminar la pestaña/sección "Cuadrícula Escritorio" de la ventana de Personalización (`CustomizationWindow.vue`) para que la interfaz se centre exclusivamente en Fondo de Pantalla, Tema, Barra de Tareas y Tipografía.
2. Hacer que el comportamiento de Cuadrícula (Snap to Grid estilo Windows) sea **permanente, fijo y obligatorio** en todo el escritorio: los iconos siempre se acoplarán a las celdas discretas sin opción a desactivarlo.
3. Limpiar del store de personalización (`customizationStore.ts`) el estado y métodos de alternancia de cuadrícula (`gridSnap`, `setGridSnap`).
4. Mantener en el menú contextual del escritorio la acción de utilidad "📐 Auto-organizar cuadrícula" para ordenar los iconos en columnas limpias cuando el usuario lo desee.
5. Actualizar la suite de pruebas unitarias (`customization.spec.ts`) para validar el nuevo estado sin `gridSnap`.

---

## 2. Lista exacta de archivos a crear, modificar o eliminar

### Archivos a crear:
- Ninguno.

### Archivos a modificar:
- `frontend/src/components/apps/customization/CustomizationWindow.vue`:
  - Modificar el tipo `activeTab` de `'theme' | 'wallpaper' | 'taskbar' | 'typography' | 'grid'` a `'theme' | 'wallpaper' | 'taskbar' | 'typography'`.
  - Eliminar el botón de navegación de la barra lateral correspondiente a Cuadrícula.
  - Eliminar la sección `<section v-else-if="activeTab === 'grid'">` y sus estilos asociados.
  - Eliminar la función `toggleGridSnap`.
- `frontend/src/stores/customizationStore.ts`:
  - Retirar la propiedad `gridSnap` del store, persistencia y método `resetDefaults`.
- `frontend/src/components/desktop/DesktopWorkspace.vue`:
  - Asegurar acoplamiento magnético directo e incondicional en `onGlobalMouseMove` y `onGlobalMouseUp`.
- `frontend/src/__tests__/customization.spec.ts`:
  - Actualizar pruebas unitarias eliminando expectativas sobre `gridSnap`.

### Archivos a eliminar:
- Ninguno.

---

## 3. Cambios en base de datos, endpoints o estado (Pinia)
- En `customizationStore`: se elimina `gridSnap: Ref<boolean>` y `setGridSnap(snap: boolean)`.

---

## 4. Pasos secuenciales de ejecución

1. **Creación del Implementation Plan:** Guardar este documento en `/implementation_plans/`.
2. **Modificación de `customizationStore.ts`:**
   - Retirar `gridSnap` de `loadSavedSettings`, `saveSettings`, `state`, y `resetDefaults`.
3. **Modificación de `CustomizationWindow.vue`:**
   - Quitar la pestaña `grid` y su contenido.
4. **Verificación de `DesktopWorkspace.vue`:**
   - Confirmar que el snap a la cuadrícula funciona siempre de forma nativa e incondicional.
5. **Actualización de pruebas (`customization.spec.ts`):**
   - Ejecutar `vitest` y confirmar que todos los tests pasan al 100%.
6. **Confirmación y commit en git.**
