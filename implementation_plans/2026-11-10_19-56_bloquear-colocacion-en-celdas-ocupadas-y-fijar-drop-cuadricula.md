# Plan de Implementación - Bloquear Colocación en Celdas en Rojo (Ocupadas) y Corregir Condición de Carrera al Soltar Iconos

## 1. Objetivo de la tarea
Impedir que un archivo o aplicación arrastrado en el escritorio pueda colocarse en una posición marcada en rojo (ocupada) o quedarse en coordenadas intermedias fuera de la cuadrícula al soltar el clic, permitiendo únicamente su colocación en celdas libres de la cuadrícula (o dentro de una carpeta si se suelta sobre una carpeta).

---

## 2. Lista exacta de archivos a crear, modificar o eliminar
- **Modificar:**
  - `frontend/src/components/desktop/DesktopWorkspace.vue`:
    - En `onGlobalMouseUp()`: eliminar inmediatamente los *listeners* `mousemove` y `mouseup` y limpiar el estado de arrastre (`activeDragId`, `isActuallyDragging`) de forma síncrona **antes** de cualquier `await`, evitando que un evento `mousemove` posterior durante la petición HTTP `PATCH` sobrescriba las coordenadas acopladas con las coordenadas libres del puntero (`nextX, nextY`).
    - En `onGlobalMouseUp()`: si la celda objetivo está ocupada (`isGridSlotOccupied(rawPos.col, rawPos.row, id)` es `true`, es decir, cuando se muestra en rojo), rechazar la colocación en esa posición y devolver el icono a su celda de origen (`initialTargetX, initialTargetY` acoplada a la cuadrícula), permitiendo colocar el icono únicamente cuando se suelta sobre una celda libre.
    - Añadir `@dragstart.prevent` a los elementos `.shortcut-item` del escritorio para evitar que el arrastre nativo del navegador interfiera con el ciclo `mousedown`/`mousemove`/`mouseup`.
    - Añadir estado visual `.is-invalid` a `.grid-ghost-cell` cuando la celda objetivo está ocupada.
  - `frontend/src/__tests__/customization.spec.ts`:
    - Añadir test unitario verificando el rechazo de colocación en celdas ocupadas (retorno a la celda de origen) y aceptación únicamente en celdas libres.

---

## 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de datos:** Reubicar cualquier archivo que haya quedado en coordenadas fuera de la cuadrícula en `root.desktop` y limpiar caché de Redis.
- **Endpoints:** Ningún cambio.
- **Estado (Pinia):** Ningún cambio estructural; `updatePosition` recibe siempre coordenadas de celdas libres validadas.

---

## 4. Pasos secuenciales de ejecución
1. **Crear el plan de implementación** en `implementation_plans/2026-11-10_19-56_bloquear-colocacion-en-celdas-ocupadas-y-fijar-drop-cuadricula.md`.
2. **Actualizar `frontend/src/components/desktop/DesktopWorkspace.vue`:**
   - Desacoplar la limpieza síncrona de eventos `mousemove`/`mouseup` antes de las llamadas asíncronas en `onGlobalMouseUp()`.
   - Si la celda destino está ocupada (`isGridSlotOccupied`), restaurar el elemento a su celda original en lugar de permitir soltarlo en zona roja.
   - Prevenir `dragstart` nativo en `.shortcut-item` y reflejar el estado inválido en `.grid-ghost-cell`.
3. **Normalizar coordenadas en PostgreSQL y limpiar Redis** por si algún archivo quedó en una coordenada intermedia tras la prueba anterior.
4. **Añadir y ejecutar tests unitarios en Vitest** validando el comportamiento.

