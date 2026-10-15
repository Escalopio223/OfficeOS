# Plan de Implementación: Corrección de Apertura de Oxplorer y Eventos de Doble Clic

**Fecha y hora:** 2026-10-15 03:43  
**Rama:** `feature/folders-usage`  

---

### 1. Objetivo de la tarea
Diagnosticar y corregir el problema que impide abrir la ventana de Oxplorer:
- En `DesktopWorkspace.vue`, al pulsar el ratón sobre el icono de Oxplorer (`mousedown`), se activaba inmediatamente el identificador de arrastre (`activeDragId`), asignando la clase CSS `.is-dragging`. Dicha clase contenía la propiedad `pointer-events: none;`, lo cual impedía que el navegador recibiera el segundo clic del doble clic y cancelaba por completo el evento nativo `@dblclick`.
- Adicionalmente, la bandera `hasMoved` con umbral de 3 píxeles se activaba durante la pulsación del ratón, provocando que `handleOxplorerDoubleClick` hiciera `return` prematuro sin abrir la ventana.
- Corregir el estado de arrastre para que `.is-dragging` y `pointer-events: none` se activen únicamente cuando el ratón realmente se desplace más de 6 píxeles (arrastre real), permitiendo que el doble clic abra Oxplorer y las carpetas de forma limpia e instantánea.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar
- **Modificar:**
  - `frontend/src/components/desktop/DesktopWorkspace.vue`:
    - Separar el estado de clic inicial (`activeDragId`) del estado de arrastre visual activo (`isActuallyDragging = ref(false)`).
    - Activar `isActuallyDragging` solo cuando el desplazamiento supere el umbral (`Math.hypot(deltaX, deltaY) > 6`).
    - Vincular la clase `.is-dragging` únicamente a `isActuallyDragging && activeDragId === item.id`, evitando `pointer-events: none` en clics simples o dobles clics.
    - Asegurar que `handleOxplorerDoubleClick` ejecute siempre `winStore.openWindow('oxplorer', { targetPath: 'root' })` cuando el usuario no esté en un arrastre sostenido.
    - Asegurar que `handleItemDoubleClick` no se bloquee por micromovimientos involuntarios del ratón al hacer doble clic.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de datos:** Ninguno.
- **Endpoints:** Ninguno.
- **Estado (Pinia):** Ninguno.

---

### 4. Pasos secuenciales de ejecución
1. **Creación del Plan de Implementación:** Guardar este documento en `/implementation_plans/2026-10-15_03-43_corregir-apertura-oxplorer-y-doble-clic.md`.
2. **Actualizar `DesktopWorkspace.vue`:**
   - Definir `const isActuallyDragging = ref(false);`.
   - En `startItemDrag`, resetear `isActuallyDragging.value = false;`.
   - En `onGlobalMouseMove`, activar `isActuallyDragging.value = true;` únicamente si `Math.hypot(deltaX, deltaY) > 6`.
   - En `onGlobalMouseUp`, resetear `isActuallyDragging.value = false;`.
   - En el template, vincular `'is-dragging': isActuallyDragging && activeDragId === ...`.
3. **Verificación y validación:**
   - Ejecutar `npm run build` en el frontend (`vue-tsc` + `vite build`).
   - Ejecutar `npm run test:unit -- --run`.
4. **Comunicación al usuario:** Explicar la causa raíz corregida y confirmar el restablecimiento de la apertura de Oxplorer.
