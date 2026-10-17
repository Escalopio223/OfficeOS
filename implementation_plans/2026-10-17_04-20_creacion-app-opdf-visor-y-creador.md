# Plan de Implementación: Creación de la Aplicación Opdf (Visor y Creador de PDFs)

**Fecha y hora:** 2026-10-17 04:20  
**Rama:** `feature/Opdf`  

---

### 1. Objetivo de la tarea
Desarrollar e integrar una nueva aplicación oficial para OogleOS llamada **Opdf** que permita:
1. **Visualizar PDFs existentes:**
   - Interceptar la apertura de archivos `.pdf` mediante doble clic en el Escritorio (`DesktopWorkspace.vue`) y en el explorador (`OxplorerWindow.vue`), abriéndolos directamente en la ventana de **Opdf** en lugar de solo forzar la descarga.
   - Mostrar el contenido del PDF utilizando una interfaz de visor que combina un visor incrustado nativo (mediante Blob de `/api/files/:id/raw`) y un renderizado de alta fidelidad estilo página A4 ejecutiva con zoom, rotación y metadatos.
2. **Crear PDFs nuevos:**
   - Permitir redactar y diseñar nuevos documentos PDF dentro de Opdf (título, subtítulo/referencia, autor, fecha, categoría y cuerpo/párrafos de texto), ofreciendo plantillas predefinidas (Informe Ejecutivo, Contrato de Servicios, Acta de Reunión, Documento en Blanco).
   - Vista previa en tiempo real de la hoja del documento.
   - Guardar el nuevo documento en el sistema de archivos de OogleOS (`root.desktop` o carpeta activa) mediante `POST /api/nodes`.
3. **Descarga real de PDFs funcionales:**
   - Tanto para PDFs visualizados como creados, generar y descargar archivos binarios `.pdf` reales y válidos (`%PDF-1.4`) con estructura estándar (Catalog, Pages, Page, Font Helvetica, Stream y Trailer) que abran de forma nativa en cualquier lector de PDF del sistema operativo del usuario.
4. **Integración en el Sistema:**
   - Registrar la ventana `opdf` en `windowStore.ts`.
   - Agregar el acceso directo con icono `opdf.svg` en el Escritorio (`DesktopWorkspace.vue`).
   - Permitir crear archivos PDF desde el menú de creación de Oxplorer.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar

- **Crear:**
  - `frontend/src/components/apps/opdf/OpdfWindow.vue`:
    - Componente principal de la ventana Opdf con estética *glassmorphism*, barra de título con controles de ventana, barra de herramientas (Nuevo, Guardar, Descargar, Zoom, Selector de Vista), visor de PDF incrustado / lienzo A4 y formulario de redacción con plantillas.
  - `frontend/src/utils/pdfGenerator.ts`:
    - Generador estándar de binarios PDF (`%PDF-1.4`) en el frontend para crear PDFs reales con membretes, textos multilínea, saltos y numeración descargables como `Blob` de tipo `application/pdf`.

- **Modificar:**
  - `backend/src/utils/virtualFiles.ts`:
    - Mejorar `generateDeterministicPdf` para producir documentos PDF estructurados con contenido visible completo, cabeceras, cláusulas/párrafos realistas según el nombre del archivo.
  - `frontend/src/stores/windowStore.ts`:
    - Añadir `'opdf'` al tipo `WindowId` y registrar su estado inicial en `windows`.
  - `frontend/src/components/desktop/DesktopWorkspace.vue`:
    - Importar `OpdfWindow.vue` y `opdf.svg`.
    - Añadir acceso directo de Opdf a `appShortcuts` en el escritorio.
    - Renderizar `<OpdfWindow v-if="winStore.windows['opdf']?.isOpen" />`.
    - En `handleItemDoubleClick`, abrir los archivos con extensión `.PDF` en Opdf pasando su ID, nombre y contenido.
  - `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:
    - En `handleItemDoubleClick`, abrir archivos `.PDF` en Opdf en vez de forzar descarga directa.
    - Añadir opción "Nuevo Documento PDF (Opdf)" en el menú contextual y modal de creación de archivos.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)

- **Base de datos:**
  - No requiere cambios estructurales; la tabla `filesystem_nodes` ya soporta `mime_type: 'application/pdf'` y almacenamiento `'VIRTUAL'` / `'FILE'`.
- **Endpoints:**
  - `GET /api/files/:id/raw`: Ya entrega el binario PDF con `Content-Type: application/pdf`.
  - `GET /api/files/:id/download`: Ya inyecta `Content-Disposition: attachment; filename="..."`.
- **Estado (Pinia):**
  - `windowStore`: Registro de `windows['opdf']` con propiedades `{ id: 'opdf', title: 'Opdf', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 14, data: null }`.

---

### 4. Pasos secuenciales de ejecución

1. **Creación del Plan de Implementación:**
   - Registrar y guardar este documento en `/implementation_plans/2026-10-17_04-20_creacion-app-opdf-visor-y-creador.md`.
2. **Generador de PDFs reales en Frontend:**
   - Crear `frontend/src/utils/pdfGenerator.ts` con funciones para estructurar binarios PDF válidos (`%PDF-1.4`), con soporte de texto multilínea, formato A4 (595x842 pt), colores y metadatos.
3. **Mejora del generador de PDFs en Backend:**
   - Actualizar `generateDeterministicPdf` en `backend/src/utils/virtualFiles.ts` para que los PDFs virtuales generados al vuelo tengan textos ricos y diseño visual estructurado.
4. **Registro de la Ventana en WindowStore:**
   - Actualizar `frontend/src/stores/windowStore.ts` incorporando `'opdf'`.
5. **Creación del Componente OpdfWindow:**
   - Implementar `frontend/src/components/apps/opdf/OpdfWindow.vue` con:
     - Header con icono `opdf.svg`, controles de ventana y título.
     - Toolbar con acciones: "📄 Nuevo PDF", "💾 Guardar", "⬇️ Descargar PDF", controles de zoom (`-`, `%`, `+`), y selector de modo (Visor / Editor).
     - Visor: visualización embebida o mediante lienzo A4 con membrete, tipografía ejecutiva y diseño de hoja física.
     - Editor: formulario intuitivo con plantillas (Informe, Contrato, Acta) y actualización en vivo.
6. **Integración en Escritorio y Oxplorer:**
   - En `DesktopWorkspace.vue`: incluir icono en el escritorio, renderizar ventana y asociar doble clic de archivos `.pdf` a la apertura en Opdf.
   - En `OxplorerWindow.vue`: asociar doble clic de archivos `.pdf` a la apertura en Opdf y permitir crear PDFs nuevos.
7. **Compilación y Pruebas:**
   - Ejecutar `npm run build` en el frontend y pruebas unitarias (`npm run test:unit`).
   - Verificar la creación, visualización y descarga de PDFs reales.
