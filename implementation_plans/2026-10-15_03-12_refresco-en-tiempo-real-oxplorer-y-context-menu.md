# Plan de Implementación: Refresco en Tiempo Real de Oxplorer y Menú Contextual Interno

**Fecha y Hora:** 2026-10-15 03:12  
**Rama:** `feature/folders-usage`  
**Estado:** Listo para ejecución  

---

## 1. Objetivo de la Tarea

Solucionar el problema de refresco en Oxplorer cuando se crea un elemento (carpeta o nota):
1. Asegurar que `filesystemStore` escuche activamente el evento reactivo `filesystemEvent`, de modo que cuando se cree, mueva, renombre o elimine cualquier nodo, la vista de la carpeta actualmente abierta en Oxplorer (`currentFolder`) se refresque de inmediato en tiempo real (sin requerir salir y volver a entrar).
2. Incorporar soporte de menú contextual propio dentro de Oxplorer (`@contextmenu.stop` en el contenedor `glass-content`):
   - Al hacer clic derecho en una zona vacía de Oxplorer, mostrar un menú contextual con opciones para:
     - 📁 Nueva Carpeta (crea dentro de `currentFolder`)
     - 📝 Nueva Nota (crea dentro de `currentFolder` y abre Onotes)
   - Evitar que el clic derecho en Oxplorer propague accidentalmente hacia el fondo del escritorio.
3. Garantizar la sincronización bidireccional total: si se crea un elemento en `root.desktop` (ya sea desde el menú contextual del Escritorio o desde Oxplorer dentro de la carpeta `Escritorio`), se actualizan instantáneamente tanto el fondo del Escritorio como la ventana de Oxplorer.

---

## 2. Lista Exacta de Archivos a Crear, Modificar o Eliminar

- **Modificar:** `frontend/src/stores/filesystem.ts`
  - Añadir un watcher sobre `filesystemEvent` en `useFileSystemStore` para ejecutar `refreshCurrentFolder()` cada vez que se notifique un cambio en el sistema de archivos.
- **Modificar:** `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`
  - Añadir manejador de menú contextual `@contextmenu.stop="onContextMenu"` en el área de contenido de Oxplorer.
  - Implementar menú flotante con opciones para crear nueva carpeta o nueva nota en la carpeta actual (`currentFolder`).
  - Al crear una nota desde el menú contextual de Oxplorer, abrir Onotes con el `noteId` correspondiente.
  - Cerrar el menú contextual al hacer clic fuera o al seleccionar una acción.

---

## 3. Cambios en Base de Datos, Endpoints o Estado (Pinia)

- **Base de Datos / Endpoints:** No se requieren cambios en la base de datos ni en el backend; los endpoints `GET`, `POST`, `PATCH`, `DELETE` ya están completamente operativos y funcionando.
- **Estado (Pinia):**
  - `filesystemStore`: inclusión de `watch(filesystemEvent, () => { if (currentFolder.value) refreshCurrentFolder(); })` para sincronización instantánea y reactiva.

---

## 4. Pasos Secuenciales de Ejecución

1. **Actualizar `frontend/src/stores/filesystem.ts`:**
   - Suscribir `useFileSystemStore` a `filesystemEvent` para que cualquier mutación efectuada en cualquier parte del sistema refresque la carpeta abierta en Oxplorer.
2. **Actualizar `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:**
   - Prevenir la propagación del evento `@contextmenu` hacia el escritorio.
   - Implementar el menú contextual propio de Oxplorer para crear carpetas y notas dentro de `currentFolder`.
   - Ajustar estilos CSS para el menú contextual interno de Oxplorer.
3. **Validación y Pruebas:**
   - Comprobar compilación mediante `npm run build`.
   - Verificar que al crear una nota o carpeta en `Escritorio` desde Oxplorer se visualiza de inmediato en Oxplorer y en el fondo del Escritorio sin necesidad de recargar ni salir de la carpeta.
