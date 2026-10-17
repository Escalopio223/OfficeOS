# Plan de Implementación: Corrección de Visualización de PDFs Preexistentes en Opdf

## 1. Objetivo de la tarea
Solucionar el problema por el cual los archivos PDF previamente creados (tanto los nodos virtuales generados en el sistema de 100k nodos como los archivos creados o guardados previamente en OogleOS) no se visualizan correctamente al abrirlos en la aplicación **Opdf**.

La solución garantizará que:
1. Al abrir cualquier PDF existente (p. ej. `Guia_Desarrollo.pdf` u otros documentos del sistema), Opdf extraiga e interprete correctamente su estructura, título, metadatos y contenido real.
2. El visor cuente con un renderizado dual ultra-robusto:
   - **Vista Documento A4 nativa de Opdf**: Renderiza fielmente la hoja A4 con tipografía, márgenes, cabeceras, líneas y cuerpo del texto real del archivo, inmune a bloqueos de sandbox o extensiones de navegador.
   - **Visor Embebido del Sistema (`<object>` / `<embed>`)**: Para navegadores con visor PDF nativo activo.
   - Selector o toggle accesible en la barra superior para alternar entre ambas vistas según la preferencia del usuario.
3. Se normalicen los binarios generados en el backend (`virtualFiles.ts`) y frontend (`pdfGenerator.ts`) para usar fuentes `/WinAnsiEncoding`, posicionamiento de texto con `TL` e interlineado exacto, y cabeceras sin desfasaje de bytes UTF-8 para garantizar una tabla `xref` 100% matemática.
4. Al guardar un PDF modificado o nuevo, la persistencia no corrompa los offsets binarios.

---

## 2. Lista exacta de archivos a crear, modificar o eliminar

### Modificar:
1. `backend/src/utils/virtualFiles.ts`:
   - Corregir `generateDeterministicPdf` para usar `/Encoding /WinAnsiEncoding`.
   - Ajustar el cálculo de interlineado en los flujos de texto PDF (`TL` y `T*`) para evitar solapamientos.
   - Asegurar que la cabecera y el contenido binario mantengan offsets exactos.
2. `frontend/src/utils/pdfGenerator.ts`:
   - Incluir soporte para extracción/parsing de texto y metadatos desde binarios PDF (`extractPdfData(buffer)`).
   - Añadir `/Encoding /WinAnsiEncoding` y asegurar offsets matemáticos en `buildStandardPdf`.
3. `frontend/src/components/apps/opdf/OpdfWindow.vue`:
   - Actualizar `loadExistingPdf` para procesar el binario, extraer el texto real del PDF e inicializar `docTitle`, `docSubtitle`, `docCategory` y `docContent`.
   - Implementar renderizado dual en el Visor (Hoja A4 fiel y elemento `<object type="application/pdf">`).
   - Añadir selector de vista en la barra de herramientas (`Vista Documento` / `Visor Plugin`).
   - Evitar corrupción de offsets al guardar.
4. `frontend/src/__tests__/pdfGenerator.spec.ts`:
   - Añadir pruebas unitarias para la extracción de texto (`extractPdfData`) y compatibilidad de binarios.

### Eliminar / Limpiar:
- Scripts de comprobación temporales en `backend/` (`check_pdfs.js`, `test_raw.js`, `test_guia.js`).

---

## 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de Datos**: No se alteran tablas ni esquemas; los nodos existentes siguen teniendo `type = 'file'` y `mime_type = 'application/pdf'`. Se repara el nodo `Nuevo Documento.pdf` si sus bytes quedaron desfasados.
- **Endpoints**: `GET /api/files/:id/raw` y `GET /api/files/:id/download` continúan sirviendo `application/pdf` con streaming binario.
- **Pinia (`windowStore.ts` / `desktopStore.ts`)**: Se mantienen las interfaces sin breaking changes.

---

## 4. Pasos secuenciales de ejecución

1. **Creación del Plan de Implementación** (este documento).
2. **Refactorización del Motor PDF en Backend (`backend/src/utils/virtualFiles.ts`)**:
   - Ajustar `generateDeterministicPdf` con fuentes `/WinAnsiEncoding`, posicionamiento de texto limpio y tabla `xref` exacta.
3. **Ampliación de `pdfGenerator.ts` en Frontend**:
   - Añadir función `extractPdfData(buffer: ArrayBuffer | Uint8Array)` capaz de leer los streams `BT ... ET` y extraer títulos, fechas, referencias y párrafos de cualquier PDF generado o estándar.
   - Asegurar la compatibilidad con `/WinAnsiEncoding`.
4. **Actualización de `OpdfWindow.vue`**:
   - En `loadExistingPdf`, extraer el texto y datos del documento usando `extractPdfData`.
   - Mejorar el contenedor del Visor: mostrar la hoja A4 maquetada con alta fidelidad y el visualizador embebido con `<object>`.
   - Añadir interruptor de vista en la barra de herramientas.
   - Sincronizar la pestaña `Editar / Redactar` con los datos reales extraídos del PDF cargado.
5. **Verificación y Pruebas**:
   - Ejecutar vitest en frontend (`npm run test:unit`).
   - Ejecutar typecheck y build (`npm run build`).
   - Comprobar la visualización y descarga de `Guia_Desarrollo.pdf` y otros PDFs existentes.
6. **Commit en la rama `feature/Opdf`**.
