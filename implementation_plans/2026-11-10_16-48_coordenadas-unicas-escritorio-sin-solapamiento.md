# Plan de Implementación - Coordenadas Únicas en Escritorio sin Solapamiento entre Archivos y Apps

## 1. Objetivo de la tarea
Garantizar que cada aplicación del sistema y cada archivo o carpeta en el Escritorio tenga su propia coordenada de cuadrícula exclusiva, impidiendo cualquier solapamiento tanto en la carga inicial (incluyendo los archivos del *seed*), como al crear nuevos archivos desde cualquier aplicación o menú contextual, o al arrastrar elementos.

---

## 2. Lista exacta de archivos a crear, modificar o eliminar
- **Modificar:**
  - `frontend/src/stores/desktopStore.ts`:
    - Centralizar las constantes de cuadrícula (`GRID_OFFSET_X`, `GRID_OFFSET_Y`, `GRID_CELL_WIDTH`, `GRID_CELL_HEIGHT`) y el registro de posiciones de las aplicaciones del sistema (`systemAppPositions`).
    - Implementar `snapToGrid`, `isCellOccupied` y `resolveUniqueGridPosition` para validar cualquier coordenada frente a todas las aplicaciones del sistema y todos los archivos/carpetas existentes en el escritorio.
    - En `fetchDesktopItems()`: validar y ajustar la posición de todos los nodos cargados (incluso los que ya traen `pos_x` y `pos_y` desde base de datos) para que si colisionan con una app del sistema o con otro archivo, o están desalineados de la cuadrícula, se reubiquen automáticamente en la celda libre más cercana y actualicen su posición en el backend.
    - En `createNote`, `createSheet`, `createPdf`, `createPaintFile`, `createPlannerFile`, `createFolder` y `updatePosition`: asegurar que siempre se asigne una coordenada única libre utilizando `resolveUniqueGridPosition`.
  - `frontend/src/components/desktop/DesktopWorkspace.vue`:
    - Sincronizar las posiciones de `appShortcuts` con `desktopStore` al mover iconos de aplicaciones o al reorganizar la cuadrícula (`reorganizeGrid`).
  - `backend/scripts/seed.ts`:
    - Actualizar las coordenadas iniciales de `sampleDesktopFiles` para que se ubiquen en celdas válidas y libres de la columna 1 (`x = 112`, filas 1 a 5: `y = 116, 212, 308, 404, 500`), sin pisar la columna 0 de apps ni el icono de `Personalización` (`112, 20`).
  - `frontend/src/__tests__/customization.spec.ts`:
    - Añadir pruebas unitarias que verifiquen que ningún archivo creado o cargado en `desktopStore` pueda compartir coordenada con una aplicación del sistema ni con otro archivo del escritorio.

---

## 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de datos:** Actualización de coordenadas `pos_x` y `pos_y` de los nodos en `root.desktop` y en el script `seed.ts`.
- **Endpoints:** Se invalida la caché de Redis tras actualizar las coordenadas iniciales en la base de datos.
- **Estado (Pinia - `useDesktopStore`):**
  - Nuevo estado `systemAppPositions` sincronizado con los accesos directos del escritorio.
  - Funciones exportadas `resolveUniqueGridPosition`, `isCellOccupied`, `snapToGrid` y `setSystemAppPosition`.

---

## 4. Pasos secuenciales de ejecución
1. **Crear el plan de implementación** en `implementation_plans/2026-11-10_16-48_coordenadas-unicas-escritorio-sin-solapamiento.md`.
2. **Actualizar `frontend/src/stores/desktopStore.ts`** con el motor de resolución de colisiones de celdas contra apps del sistema y archivos existentes.
3. **Actualizar `frontend/src/components/desktop/DesktopWorkspace.vue`** para mantener sincronizadas las coordenadas de `appShortcuts` con `desktopStore`.
4. **Actualizar `backend/scripts/seed.ts`** con las coordenadas alineadas a la cuadrícula para los archivos de muestra del escritorio y actualizar los registros actuales en PostgreSQL + limpiar caché de Redis.
5. **Añadir y ejecutar tests unitarios en Vitest** para verificar que no existan colisiones de coordenadas.

