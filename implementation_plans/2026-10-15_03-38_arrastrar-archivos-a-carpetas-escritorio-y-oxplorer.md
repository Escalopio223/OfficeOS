# Plan de Implementación: Arrastre de Archivos a Carpetas en Escritorio y Oxplorer

**Fecha y hora:** 2026-10-15 03:38  
**Rama:** `feature/folders-usage`  

---

### 1. Objetivo de la tarea
1. **Arrastrar desde el Escritorio hacia Oxplorer:**
   - Permitir que al mover un archivo desde el escritorio y soltarlo sobre una carpeta dentro de Oxplorer (o sobre el área de contenido de la carpeta abierta en Oxplorer), el archivo se mueva a dicha carpeta de forma reactiva y en tiempo real.
2. **Arrastrar sobre carpetas en el propio Escritorio:**
   - Eliminar el feedback de colisión inválida (borde rojo) cuando se arrastra un archivo encima de una carpeta del escritorio.
   - Mostrar un icono e indicador visual claro (`📥 Mover a [Carpeta]`) de que el archivo va a introducirse dentro de la carpeta seleccionada.
   - Resaltar visualmente la carpeta receptora con un estilo activo de zona de recepción (`is-drop-target`).
   - Al soltar el archivo (`mouseup`), ingresarlo dentro de la carpeta (`desktopStore.moveToFolder`), eliminándolo del escritorio y sincronizando el sistema de archivos en tiempo real.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar
- **Modificar:**
  - `frontend/src/components/desktop/DesktopWorkspace.vue`:
    - En el arrastre (`startItemDrag`, `onGlobalMouseMove`, `onGlobalMouseUp`), detectar mediante `document.elementsFromPoint(e.clientX, e.clientY)` y `findFolderUnder` si el elemento arrastrado está sobre una carpeta del escritorio o sobre una carpeta/contenido de Oxplorer.
    - Anular la colisión roja (`isCurrentlyColliding = false`) cuando el elemento se encuentre sobre una carpeta destino válida.
    - Añadir estado reactivo `hoveredDropFolder` con `{ id: string, name: string, targetType: 'desktop-folder' | 'oxplorer-folder' | 'oxplorer-content' }`.
    - Añadir indicador visual (icono de inserción en carpeta + badge con nombre de carpeta) en el elemento arrastrado.
    - Añadir clase reactiva `.is-drop-target` en las carpetas receptoras.
    - Elevar `z-index` del elemento arrastrado (`z-index: 99999`) y definir `pointer-events: none` durante el arrastre para permitir detección exacta de elementos subyacentes.
    - En `onGlobalMouseUp`, si hay una carpeta destino válida (sea de escritorio u Oxplorer), mover el archivo vía `desktopStore.moveToFolder` o `fs.moveNode`.
    - Implementar `onDropOnFolderIcon(e: DragEvent, folderId: string)` para arrastre nativo HTML5.
  - `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:
    - Añadir atributos `data-id`, `data-name`, `data-is-dir` a `.file-card`.
    - Añadir atributos `data-current-folder-id`, `data-current-folder-name` a `.glass-content`.
    - Añadir estilos para destacar tarjetas de subcarpeta cuando reciben elementos (`.file-card.is-drop-hover`).

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de datos:** Ninguno (los endpoints `PATCH /api/nodes/:id` con `targetFolderId` ya soportan mover nodos entre carpetas).
- **Endpoints:** Ninguno.
- **Estado (Pinia):**
  - Utilizar `desktopStore.moveToFolder` y `fs.moveNode`, los cuales disparan `notifyFilesystemChanged()`, manteniendo sincronizados en tiempo real tanto el escritorio como las ventanas de Oxplorer.

---

### 4. Pasos secuenciales de ejecución
1. **Creación del Plan de Implementación:** Guardar este documento en `/implementation_plans/2026-10-15_03-38_arrastrar-archivos-a-carpetas-escritorio-y-oxplorer.md`.
2. **Actualizar `OxplorerWindow.vue`:**
   - Añadir atributos de datos (`data-id`, `data-name`, `data-is-dir`) en las tarjetas de archivos y carpetas (`.file-card`).
   - Añadir atributos a `.glass-content` (`data-current-folder-id`, `data-current-folder-name`).
   - Añadir reglas CSS para `.file-card.is-drop-hover` y `.glass-content.is-drop-hover`.
3. **Actualizar `DesktopWorkspace.vue`:**
   - Añadir `hoveredDropFolder = ref<{ id: string; name: string; type: 'desktop-folder' | 'oxplorer' } | null>(null)`.
   - Modificar `onGlobalMouseMove` para chequear carpetas de escritorio y elementos de Oxplorer.
   - En caso de detectar carpeta, suprimir colisión roja y activar badge flotante con icono.
   - Modificar `onGlobalMouseUp` para ejecutar el movimiento correspondiente según el tipo de carpeta detectada.
   - Implementar `onDropOnFolderIcon` para arrastres HTML5 nativos hacia carpetas del escritorio.
   - Actualizar el template con el icono/badge de inserción en carpeta (`📥 Mover a [Carpeta]`) y clases de estilos en CSS.
4. **Verificación y validación:**
   - Ejecutar `npm run build` en el frontend para validar tipado y compilación.
   - Ejecutar `npm run test:unit -- --run` para verificar la suite de tests.
5. **Comunicación al usuario:** Explicar el funcionamiento de la nueva interacción visual y movimiento a carpetas.
