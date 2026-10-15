# Plan de Implementación: Modal Estilizado para Nombres, Eliminación de Elementos en Oxplorer y Retirada de Botón Actualizar

**Fecha y Hora:** 2026-10-15 03:18  
**Rama:** `feature/folders-usage`  
**Estado:** Listo para ejecución  

---

## 1. Objetivo de la Tarea

1. **Quitar opción de actualizar:** Remover el botón/opción "Actualizar" del menú contextual de Oxplorer.
2. **Modal estético para nombrar archivos/carpetas:**
   - Reemplazar por completo el `prompt()` nativo del navegador por un modal Vue personalizado y reactivo con estética Glassmorphism propia de OogleOS.
   - Posicionado exactamente en el centro de la pantalla.
   - Dimensiones aproximadas del 20% del ancho y 20% del alto de la pantalla (con límites mínimos para legibilidad y usabilidad).
   - Comportamiento modal estricto: no se cierra haciendo clic en el backdrop; solo se descarta al pulsar **Cancelar** (abortando la creación) o al pulsar **Crear** / presionar Enter con un nombre válido.
   - Aplicable para crear tanto carpetas como archivos de texto / notas.
3. **Eliminar archivos y carpetas desde Oxplorer:**
   - Incorporar menú contextual sobre los elementos de Oxplorer (tarjetas de archivos y carpetas) al hacer clic derecho sobre ellos.
   - Incluir la opción `🗑️ Eliminar` (con estilo danger), que invoque `fs.deleteNode(item.id)`.
   - Notificar y sincronizar en tiempo real con el Escritorio (si el elemento eliminado estaba en `root.desktop`, desaparecerá al instante también del Escritorio).

---

## 2. Lista Exacta de Archivos a Crear, Modificar o Eliminar

- **Modificar:** `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`
  - Eliminar la opción "Actualizar" y su método asociado `handleRefreshFromMenu()`.
  - Crear el estado y componente modal interno para solicitar el nombre del nuevo nodo (carpeta o nota/archivo).
  - Añadir soporte de menú contextual para tarjetas de elementos (`@contextmenu.stop="onItemContextMenu($event, item)"`) con opciones `📂 Abrir` y `🗑️ Eliminar`.
  - Conectar la acción de eliminar con `fs.deleteNode(selectedItem.id)`.
  - Añadir estilos CSS para el modal centrado (~20vw / ~20vh) y el menú contextual de items.

---

## 3. Cambios en Base de Datos, Endpoints o Estado (Pinia)

- **Base de Datos / Endpoints:** Ninguno; `DELETE /api/nodes/:id` y `POST /api/nodes` ya están implementados y verificados.
- **Pinia:** Se utiliza `useFileSystemStore.deleteNode()` y `createNode()`, que ya disparan `notifyFilesystemChanged()` manteniendo la reactividad con el Escritorio.

---

## 4. Pasos Secuenciales de Ejecución

1. **Implementar estado y métodos del Modal en `OxplorerWindow.vue`:**
   - Estado: `showNameModal = ref(false)`, `modalTitle = ref('')`, `nodeNameInput = ref('')`, `modalType = ref<'folder' | 'file'>('folder')`.
   - Métodos: `openCreateModal(type: 'folder' | 'file')`, `confirmCreateModal()`, `cancelCreateModal()`.
2. **Actualizar menús contextuales en `OxplorerWindow.vue`:**
   - Retirar "Actualizar" del menú de fondo.
   - Agregar menú contextual para elementos (`itemContextMenu`) con `📂 Abrir` y `🗑️ Eliminar`.
   - Método `handleDeleteItem(item)`.
3. **Estructura y estilos del Modal:**
   - Backdrop semi-transparente bloqueante con `backdrop-filter: blur(8px)`.
   - Tarjeta central: `width: clamp(300px, 20vw, 460px); min-height: 20vh; display: flex; flex-direction: column; justify-content: space-between;`.
   - Input con autoenfoque y botones de acción "Cancelar" y "Crear".
4. **Validación y Pruebas:**
   - Compilación con `npm run build`.
   - Pruebas unitarias con `npm run test:unit -- --run`.
   - Verificar la experiencia visual y funcional del modal y la eliminación de nodos.
