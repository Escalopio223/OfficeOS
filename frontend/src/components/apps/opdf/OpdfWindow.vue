<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useWindowBounds } from '@/composables/useWindowBounds';
import { useDesktopStore } from '@/stores/desktopStore';
import { notifyFilesystemChanged } from '@/stores/filesystem';
import { downloadPdfFile, buildStandardPdf, type PdfDocumentData } from '@/utils/pdfGenerator';
import opdfSvg from '@/assets/opdf.svg';

const winStore = useWindowStore();
const desktopStore = useDesktopStore();
const winState = computed(() => winStore.windows['opdf']!);

const {
  x,
  y,
  width,
  height,
  startDrag,
  startResize,
} = useWindowBounds(140, 50, 940, 650, 520, 380);

const currentFileId = ref<string | null>(null);
const fileName = ref('Nuevo Documento.pdf');
const isSaved = ref(true);
const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false);

// Modos: 'viewer' (Visor nativo e interactivo) | 'editor' (Creador y redactor de PDFs)
const activeMode = ref<'viewer' | 'editor'>('viewer');

// Zoom del visor
const zoom = ref(100);

// URL del Blob PDF cargado o generado
const pdfBlobUrl = ref<string | null>(null);

// Datos del documento para edición / generación
const docTitle = ref('Informe Oficial OogleOS');
const docSubtitle = ref('Documento de Arquitectura y Auditoría');
const docAuthor = ref('Administrador OogleOS');
const docDate = ref(new Date().toISOString().slice(0, 10));
const docCategory = ref('CORPORATIVO');
const docContent = ref(
  '1. INTRODUCCIÓN\nEste documento ha sido generado con la suite Opdf en OogleOS.\nPermite la redacción, lectura y descarga de archivos PDF 100% compatibles con visores estándar.\n\n2. ESPECIFICACIONES TÉCNICAS\n- Arquitectura híbrida con 100.000 nodos indexados.\n- Entrega de binarios mediante streaming seguro.\n- Descarga con cabecera Content-Disposition nativa.\n\n3. CONCLUSIONES\nEl sistema opera bajo parámetros óptimos de latencia y disponibilidad.'
);

// Plantillas predefinidas
const TEMPLATES: Record<string, { title: string; subtitle: string; category: string; content: string }> = {
  informe: {
    title: 'Informe Ejecutivo de Rendimiento',
    subtitle: 'Auditoría Trimestral de Infraestructura',
    category: 'INFORME',
    content:
      '1. RESUMEN EJECUTIVO\nSe han analizado las métricas clave de rendimiento del sistema.\nLa latencia media en consultas indexadas se sitúa por debajo de los 2 ms.\n\n2. RECOMENDACIONES\n- Mantener la invalidación selectiva de caché en Redis.\n- Monitorear el volumen de transacciones en horas punta.\n\n3. FIRMA\nDepartamento de Operaciones de OogleOS.',
  },
  contrato: {
    title: 'Contrato de Prestación de Servicios Tecnológicos',
    subtitle: 'Acuerdo de Nivel de Servicio (SLA) 99.9%',
    category: 'LEGAL',
    content:
      'CLÁUSULA PRIMERA: OBJETO DEL CONTRATO\nEl proveedor suministra servicios de computación, almacenamiento y virtualización de ficheros.\n\nCLÁUSULA SEGUNDA: CONFIDENCIALIDAD\nAmbas partes se comprometen a salvaguardar los datos confidenciales y los árboles de ficheros protegidos con contraseña.\n\nCLÁUSULA TERCERA: VIGENCIA\nEl presente acuerdo entrará en vigor desde la fecha de firma.',
  },
  acta: {
    title: 'Acta de Reunión de Dirección Técnica',
    subtitle: 'Comité de Arquitectura y Seguridad',
    category: 'REUNIÓN',
    content:
      'FECHA Y HORA: ' + new Date().toLocaleString() + '\nASISTENTES: Equipo de Desarrollo Core, Arquitecto de Software.\n\nORDEN DEL DÍA:\n1. Lanzamiento oficial de Opdf (Visor y Creador).\n2. Evaluación de las 150 imágenes físicas y 500 facturas CSV.\n3. Despliegue de índices optimizados en PostgreSQL.\n\nACUERDOS:\nSe aprueba por unanimidad el pase a producción.',
  },
  blanco: {
    title: 'Nuevo Documento',
    subtitle: 'Borrador Oficial',
    category: 'GENERAL',
    content: 'Escribe aquí el contenido del documento PDF...',
  },
};

function applyTemplate(key: string) {
  const tpl = TEMPLATES[key];
  if (!tpl) return;
  docTitle.value = tpl.title;
  docSubtitle.value = tpl.subtitle;
  docCategory.value = tpl.category;
  docContent.value = tpl.content;
  docDate.value = new Date().toISOString().slice(0, 10);
  isSaved.value = false;
  generatePreviewBlob();
}

function generatePreviewBlob() {
  if (pdfBlobUrl.value) {
    URL.revokeObjectURL(pdfBlobUrl.value);
    pdfBlobUrl.value = null;
  }

  const docData: PdfDocumentData = {
    title: docTitle.value,
    subtitle: docSubtitle.value,
    author: docAuthor.value,
    date: docDate.value,
    category: docCategory.value,
    content: docContent.value,
  };

  const binary = buildStandardPdf(docData);
  const blob = new Blob([binary as unknown as BlobPart], { type: 'application/pdf' });
  pdfBlobUrl.value = URL.createObjectURL(blob);
}

// Cargar archivo o reaccionar a apertura desde Oxplorer o Escritorio
watch(
  () => winState.value?.data,
  async (newData) => {
    errorMessage.value = '';
    successMessage.value = '';

    if (newData) {
      if (newData.fileId) {
        currentFileId.value = newData.fileId;
        fileName.value = newData.name || 'documento.pdf';
        winStore.windows['opdf']!.title = `${fileName.value} — Opdf`;
        activeMode.value = 'viewer';
        await loadExistingPdf(newData.fileId);
        return;
      }

      if (newData.isNew) {
        createNewPdf();
        return;
      }
    }

    if (!pdfBlobUrl.value) {
      generatePreviewBlob();
    }
  },
  { immediate: true }
);

async function loadExistingPdf(fileId: string) {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const res = await fetch(`/api/files/${fileId}/raw`);
    if (!res.ok) throw new Error('Error al cargar archivo PDF');

    const arrayBuf = await res.arrayBuffer();
    if (pdfBlobUrl.value) {
      URL.revokeObjectURL(pdfBlobUrl.value);
    }
    const blob = new Blob([arrayBuf], { type: 'application/pdf' });
    pdfBlobUrl.value = URL.createObjectURL(blob);

    // Deducir datos básicos para el editor si se desea modificar
    docTitle.value = fileName.value.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    docSubtitle.value = 'Documento cargado desde el sistema de archivos';
    docCategory.value = 'DOCUMENTO';
    isSaved.value = true;
  } catch (err: any) {
    errorMessage.value = err?.message || 'No se pudo cargar el PDF.';
  } finally {
    isLoading.value = false;
  }
}

function createNewPdf() {
  currentFileId.value = null;
  winStore.windows['opdf']!.data = null;
  fileName.value = 'Nuevo Documento.pdf';
  winStore.windows['opdf']!.title = 'Nuevo Documento.pdf — Opdf';
  activeMode.value = 'editor';
  applyTemplate('informe');
  isSaved.value = true;
}

function setSuccessFeedback(msg: string) {
  successMessage.value = msg;
  setTimeout(() => {
    if (successMessage.value === msg) {
      successMessage.value = '';
    }
  }, 3500);
}

// Guardar el PDF en OogleOS
async function savePdfToSystem() {
  errorMessage.value = '';
  const cleanName = fileName.value.trim().endsWith('.pdf')
    ? fileName.value.trim()
    : `${fileName.value.trim()}.pdf`;

  if (!cleanName || cleanName === '.pdf') {
    errorMessage.value = 'El nombre del PDF no puede estar vacío.';
    return;
  }

  try {
    const docData: PdfDocumentData = {
      title: docTitle.value,
      subtitle: docSubtitle.value,
      author: docAuthor.value,
      date: docDate.value,
      category: docCategory.value,
      content: docContent.value,
    };

    const binary = buildStandardPdf(docData);
    let binaryStr = '';
    const len = binary.byteLength;
    for (let i = 0; i < len; i++) {
      binaryStr += String.fromCharCode(binary[i] ?? 0);
    }

    if (currentFileId.value) {
      // Actualizar archivo existente
      const res = await fetch(`/api/nodes/${currentFileId.value}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          content: binaryStr,
        }),
      });
      if (!res.ok) throw new Error('Error al actualizar PDF');

      desktopStore.renameItem(currentFileId.value, cleanName);
      notifyFilesystemChanged();
      isSaved.value = true;
      winStore.windows['opdf']!.title = `${cleanName} — Opdf`;
      generatePreviewBlob();
      setSuccessFeedback('Documento PDF guardado correctamente');
    } else {
      // Crear en Escritorio
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          content: binaryStr,
          parentPath: 'root.desktop',
          is_directory: false,
          mime_type: 'application/pdf',
          storage_type: 'VIRTUAL',
        }),
      });
      if (!res.ok) throw new Error('Error al crear archivo PDF');
      const node = await res.json();
      currentFileId.value = node.id;
      winStore.windows['opdf']!.data = { name: cleanName, fileId: node.id };
      winStore.windows['opdf']!.title = `${cleanName} — Opdf`;
      isSaved.value = true;
      await desktopStore.fetchDesktopItems();
      notifyFilesystemChanged();
      generatePreviewBlob();
      setSuccessFeedback('PDF creado y guardado en el Escritorio');
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al guardar el PDF.';
  }
}

// Descargar el PDF como archivo real y funcional
function triggerDownload() {
  if (currentFileId.value && isSaved.value) {
    // Descarga directa desde endpoint con Content-Disposition nativo
    const a = document.createElement('a');
    a.href = `/api/files/${currentFileId.value}/download`;
    a.download = fileName.value;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    // Generar binario PDF real desde los datos del editor
    const docData: PdfDocumentData = {
      title: docTitle.value,
      subtitle: docSubtitle.value,
      author: docAuthor.value,
      date: docDate.value,
      category: docCategory.value,
      content: docContent.value,
    };
    downloadPdfFile(docData, fileName.value);
  }
}

function zoomIn() {
  zoom.value = Math.min(200, zoom.value + 15);
}

function zoomOut() {
  zoom.value = Math.max(50, zoom.value - 15);
}

function resetZoom() {
  zoom.value = 100;
}

function handleDoubleClickHeader(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.win-controls')) {
    winStore.toggleMaximize('opdf');
  }
}

onUnmounted(() => {
  if (pdfBlobUrl.value) {
    URL.revokeObjectURL(pdfBlobUrl.value);
  }
});
</script>

<template>
  <div
    v-show="!winState.isMinimized"
    class="opdf-window"
    :class="{ 'is-maximized': winState.isMaximized }"
    :style="
      winState.isMaximized
        ? { zIndex: winState.zIndex }
        : {
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`,
            zIndex: winState.zIndex,
          }
    "
    @mousedown="winStore.focusWindow('opdf')"
  >
    <!-- Tiradores Resize -->
    <template v-if="!winState.isMaximized">
      <div class="resize-handle n" @mousedown="startResize($event, 'n', winState.isMaximized)"></div>
      <div class="resize-handle s" @mousedown="startResize($event, 's', winState.isMaximized)"></div>
      <div class="resize-handle e" @mousedown="startResize($event, 'e', winState.isMaximized)"></div>
      <div class="resize-handle w" @mousedown="startResize($event, 'w', winState.isMaximized)"></div>
      <div class="resize-handle ne" @mousedown="startResize($event, 'ne', winState.isMaximized)"></div>
      <div class="resize-handle nw" @mousedown="startResize($event, 'nw', winState.isMaximized)"></div>
      <div class="resize-handle se" @mousedown="startResize($event, 'se', winState.isMaximized)"></div>
      <div class="resize-handle sw" @mousedown="startResize($event, 'sw', winState.isMaximized)"></div>
    </template>

    <!-- Header de Ventana -->
    <header
      class="window-header"
      @mousedown="startDrag($event, winState.isMaximized)"
      @dblclick="handleDoubleClickHeader"
    >
      <div class="window-title">
        <img :src="opdfSvg" alt="Opdf" class="opdf-icon" />
        <span>{{ fileName }} {{ isSaved ? '' : '*' }} — Opdf Visor</span>
      </div>

      <div class="win-controls" @mousedown.stop @dblclick.stop>
        <button class="win-btn" title="Minimizar" @click="winStore.toggleMinimize('opdf')">—</button>
        <button class="win-btn" title="Maximizar" @click="winStore.toggleMaximize('opdf')">
          {{ winState.isMaximized ? '❐' : '□' }}
        </button>
        <button class="win-btn close" title="Cerrar" @click="winStore.closeWindow('opdf')">✕</button>
      </div>
    </header>

    <!-- Barra de Herramientas -->
    <div class="opdf-toolbar">
      <div class="toolbar-left">
        <button class="tool-btn" title="Crear nuevo PDF" @click="createNewPdf">
          <span>📄 Nuevo PDF</span>
        </button>
        <button class="tool-btn primary" title="Guardar PDF en OogleOS" @click="savePdfToSystem">
          <span>💾 Guardar</span>
        </button>
        <button class="tool-btn download" title="Descargar archivo PDF real a tu ordenador" @click="triggerDownload">
          <span>⬇️ Descargar PDF</span>
        </button>

        <div class="filename-box">
          <span class="file-label">Archivo:</span>
          <input
            v-model="fileName"
            type="text"
            class="filename-input"
            placeholder="documento.pdf"
            @input="isSaved = false; errorMessage = ''"
          />
        </div>
      </div>

      <div class="toolbar-right">
        <!-- Control de Zoom -->
        <div class="zoom-controls">
          <button class="tool-btn zoom-btn" title="Reducir zoom" @click="zoomOut">🔍 -</button>
          <span class="zoom-label" title="Restablecer 100%" @click="resetZoom">{{ zoom }}%</span>
          <button class="tool-btn zoom-btn" title="Aumentar zoom" @click="zoomIn">🔍 +</button>
        </div>

        <!-- Selector de Modo -->
        <div class="mode-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeMode === 'viewer' }"
            @click="activeMode = 'viewer'; generatePreviewBlob()"
          >
            👁️ Visor
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeMode === 'editor' }"
            @click="activeMode = 'editor'"
          >
            ✏️ Editar / Redactar
          </button>
        </div>
      </div>
    </div>

    <!-- Feedback de Estado -->
    <div v-if="errorMessage" class="banner error-banner">
      <span>⚠️ {{ errorMessage }}</span>
      <button class="banner-close" @click="errorMessage = ''">✕</button>
    </div>
    <div v-if="successMessage" class="banner success-banner">
      <span>✅ {{ successMessage }}</span>
      <button class="banner-close" @click="successMessage = ''">✕</button>
    </div>

    <!-- Cuerpo de la Aplicación -->
    <div class="opdf-body">
      <!-- MODO 1: VISOR DE PDF -->
      <div v-if="activeMode === 'viewer'" class="viewer-container">
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <span>Cargando documento PDF...</span>
        </div>

        <div v-else class="pdf-stage" :style="{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }">
          <!-- Si el navegador soporta incrustación en iframe de application/pdf -->
          <iframe
            v-if="pdfBlobUrl"
            :src="pdfBlobUrl + '#toolbar=0&navpanes=0'"
            class="pdf-native-frame"
            title="Visor PDF"
          ></iframe>

          <!-- Hoja A4 renderizada (fallback visual de alta fidelidad) -->
          <div class="a4-sheet">
            <div class="sheet-stripe"></div>
            <div class="sheet-header">
              <span class="sheet-org">OOGLEOS SUITE — OPDF</span>
              <span class="sheet-cat">{{ docCategory }}</span>
            </div>
            <h1 class="sheet-title">{{ docTitle }}</h1>
            <p v-if="docSubtitle" class="sheet-sub">{{ docSubtitle }}</p>
            <div class="sheet-meta">
              <span><strong>Autor:</strong> {{ docAuthor }}</span>
              <span><strong>Fecha:</strong> {{ docDate }}</span>
            </div>
            <hr class="sheet-divider" />
            <div class="sheet-content">
              <p v-for="(p, idx) in docContent.split('\n')" :key="idx" class="sheet-para">
                {{ p }}
              </p>
            </div>
            <div class="sheet-footer">
              <span>Documento Oficial Opdf — OogleOS Web Operating System</span>
              <span>Página 1 / 1</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MODO 2: EDITOR / CREADOR DE PDFS -->
      <div v-else class="editor-container">
        <!-- Panel de Formulario / Redacción -->
        <div class="editor-sidebar">
          <div class="sidebar-section">
            <label class="section-label">Plantillas Rápidas:</label>
            <div class="template-chips">
              <button class="chip-btn" @click="applyTemplate('informe')">📊 Informe</button>
              <button class="chip-btn" @click="applyTemplate('contrato')">📑 Contrato</button>
              <button class="chip-btn" @click="applyTemplate('acta')">📋 Acta</button>
              <button class="chip-btn" @click="applyTemplate('blanco')">📄 En blanco</button>
            </div>
          </div>

          <div class="sidebar-section">
            <label class="section-label">Título del Documento:</label>
            <input
              v-model="docTitle"
              type="text"
              class="form-input"
              placeholder="Ej: Informe Trimestral"
              @input="isSaved = false; generatePreviewBlob()"
            />
          </div>

          <div class="sidebar-section">
            <label class="section-label">Subtítulo / Referencia:</label>
            <input
              v-model="docSubtitle"
              type="text"
              class="form-input"
              placeholder="Ej: Auditoría del Sistema"
              @input="isSaved = false; generatePreviewBlob()"
            />
          </div>

          <div class="form-row">
            <div class="form-col">
              <label class="section-label">Autor / Emisor:</label>
              <input
                v-model="docAuthor"
                type="text"
                class="form-input"
                @input="isSaved = false; generatePreviewBlob()"
              />
            </div>
            <div class="form-col">
              <label class="section-label">Fecha:</label>
              <input
                v-model="docDate"
                type="date"
                class="form-input"
                @input="isSaved = false; generatePreviewBlob()"
              />
            </div>
          </div>

          <div class="sidebar-section">
            <label class="section-label">Categoría:</label>
            <input
              v-model="docCategory"
              type="text"
              class="form-input"
              placeholder="Ej: INFORME, CONTRATO, FACTURA"
              @input="isSaved = false; generatePreviewBlob()"
            />
          </div>

          <div class="sidebar-section flex-grow">
            <label class="section-label">Cuerpo y Párrafos del Documento:</label>
            <textarea
              v-model="docContent"
              class="form-textarea"
              placeholder="Redacta el texto del documento PDF..."
              @input="isSaved = false; generatePreviewBlob()"
            ></textarea>
          </div>
        </div>

        <!-- Vista previa en tiempo real -->
        <div class="editor-preview">
          <div class="preview-badge">Vista Previa A4 en Vivo</div>
          <div class="preview-scroll">
            <div class="a4-sheet mini-preview">
              <div class="sheet-stripe"></div>
              <div class="sheet-header">
                <span class="sheet-org">OOGLEOS — OPDF</span>
                <span class="sheet-cat">{{ docCategory }}</span>
              </div>
              <h2 class="sheet-title">{{ docTitle }}</h2>
              <p v-if="docSubtitle" class="sheet-sub">{{ docSubtitle }}</p>
              <div class="sheet-meta">
                <span>{{ docAuthor }}</span>
                <span>{{ docDate }}</span>
              </div>
              <hr class="sheet-divider" />
              <div class="sheet-content">
                <p v-for="(p, idx) in docContent.split('\n')" :key="idx" class="sheet-para">
                  {{ p }}
                </p>
              </div>
              <div class="sheet-footer">
                <span>Documento Oficial Opdf</span>
                <span>Pág. 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Barra de Estado Inferior -->
    <footer class="opdf-statusbar">
      <div class="status-info">
        <span class="status-item">Formato: Estándar PDF-1.4</span>
        <span class="status-divider">|</span>
        <span class="status-item">Resolución: 595 x 842 pt (A4)</span>
        <span class="status-divider">|</span>
        <span class="status-item">{{ activeMode === 'viewer' ? 'Modo Visor' : 'Modo Editor' }}</span>
      </div>
      <div class="status-badge">
        <span>Opdf Engine • OogleOS</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.opdf-window {
  position: absolute;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.94);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.7),
    0 0 35px rgba(234, 67, 53, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  color: #f8fafc;
}

.opdf-window.is-maximized {
  left: 0 !important;
  top: 0 !important;
  width: 100vw !important;
  height: calc(100vh - 50px) !important;
  border-radius: 0;
}

.resize-handle {
  position: absolute;
  z-index: 10;
}
.resize-handle.n { top: 0; left: 0; right: 0; height: 6px; cursor: n-resize; }
.resize-handle.s { bottom: 0; left: 0; right: 0; height: 6px; cursor: s-resize; }
.resize-handle.e { top: 0; right: 0; bottom: 0; width: 6px; cursor: e-resize; }
.resize-handle.w { top: 0; left: 0; bottom: 0; width: 6px; cursor: w-resize; }
.resize-handle.ne { top: 0; right: 0; width: 12px; height: 12px; cursor: ne-resize; }
.resize-handle.nw { top: 0; left: 0; width: 12px; height: 12px; cursor: nw-resize; }
.resize-handle.se { bottom: 0; right: 0; width: 12px; height: 12px; cursor: se-resize; }
.resize-handle.sw { bottom: 0; left: 0; width: 12px; height: 12px; cursor: sw-resize; }

.window-header {
  height: 42px;
  background: rgba(30, 41, 59, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  cursor: grab;
}

.window-header:active {
  cursor: grabbing;
}

.window-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.opdf-icon {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 2px 4px rgba(234, 67, 53, 0.35));
}

.win-controls {
  display: flex;
  align-items: center;
  gap: 7px;
}

.win-btn {
  width: 28px;
  height: 26px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}

.win-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.win-btn.close:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}

.opdf-toolbar {
  padding: 8px 14px;
  background: rgba(15, 23, 42, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
  padding: 5px 11px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.tool-btn.primary {
  background: #ea4335;
  border-color: #ea4335;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(234, 67, 53, 0.35);
}

.tool-btn.primary:hover {
  background: #d93025;
  box-shadow: 0 4px 12px rgba(234, 67, 53, 0.5);
}

.tool-btn.download {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.35);
  color: #34d399;
}

.tool-btn.download:hover {
  background: rgba(16, 185, 129, 0.28);
  border-color: #34d399;
  color: #ffffff;
}

.filename-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.25);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.file-label {
  font-size: 11px;
  color: #94a3b8;
}

.filename-input {
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  width: 160px;
}

.zoom-controls {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  padding: 2px;
}

.zoom-btn {
  padding: 3px 7px;
  background: transparent;
  border: none;
  font-size: 11px;
}

.zoom-label {
  font-size: 11px;
  padding: 0 6px;
  color: #cbd5e1;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}

.mode-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.35);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.tab-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn.active {
  background: rgba(234, 67, 53, 0.25);
  color: #ff8a80;
  border: 1px solid rgba(234, 67, 53, 0.4);
}

.banner {
  padding: 6px 14px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.error-banner {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border-bottom: 1px solid rgba(239, 68, 68, 0.3);
}

.success-banner {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border-bottom: 1px solid rgba(16, 185, 129, 0.3);
}

.banner-close {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
}

.opdf-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
}

/* VISOR */
.viewer-container {
  flex: 1;
  overflow: auto;
  background: #1e293b;
  display: flex;
  justify-content: center;
  padding: 30px 20px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 13px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(234, 67, 53, 0.2);
  border-top-color: #ea4335;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pdf-stage {
  transition: transform 0.15s ease;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-width: 620px;
}

.pdf-native-frame {
  width: 640px;
  height: 860px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.55);
}

/* HOJA A4 */
.a4-sheet {
  display: none; /* Se visualiza por defecto el iframe embebido nativo */
}

/* Fallback o Vista Previa en Editor */
.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-sidebar {
  width: 420px;
  background: rgba(15, 23, 42, 0.85);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.sidebar-section.flex-grow {
  flex: 1;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.template-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip-btn {
  padding: 4px 9px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip-btn:hover {
  background: rgba(234, 67, 53, 0.2);
  border-color: rgba(234, 67, 53, 0.4);
  color: #ffffff;
}

.form-input {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 7px;
  padding: 7px 10px;
  color: #ffffff;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  border-color: #ea4335;
}

.form-row {
  display: flex;
  gap: 10px;
}

.form-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-textarea {
  flex: 1;
  min-height: 180px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 7px;
  padding: 9px 11px;
  color: #ffffff;
  font-size: 12px;
  line-height: 1.5;
  font-family: inherit;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s ease;
}

.form-textarea:focus {
  border-color: #ea4335;
}

.editor-preview {
  flex: 1;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.preview-badge {
  position: absolute;
  top: 10px;
  right: 14px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 10px;
  color: #94a3b8;
  z-index: 5;
}

.preview-scroll {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 24px;
}

/* ESTILO HOJA A4 IMPRESA */
.mini-preview {
  display: block !important;
  width: 500px;
  min-height: 700px;
  background: #ffffff;
  color: #1e293b;
  border-radius: 4px;
  padding: 35px 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  position: relative;
  display: flex;
  flex-direction: column;
  user-select: text;
}

.sheet-stripe {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: #ea4335;
  border-radius: 4px 4px 0 0;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.08em;
  margin-bottom: 16px;
}

.sheet-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.sheet-sub {
  margin: 4px 0 10px 0;
  font-size: 12px;
  color: #475569;
}

.sheet-meta {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #64748b;
  margin-bottom: 12px;
}

.sheet-divider {
  border: none;
  height: 1px;
  background: #e2e8f0;
  margin: 0 0 18px 0;
}

.sheet-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sheet-para {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: #334155;
  white-space: pre-wrap;
}

.sheet-footer {
  margin-top: 24px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  color: #94a3b8;
}

/* Statusbar */
.opdf-statusbar {
  height: 24px;
  background: rgba(15, 23, 42, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-divider {
  color: rgba(255, 255, 255, 0.15);
}

.status-badge {
  font-size: 10px;
  color: #ff8a80;
  font-weight: 500;
}
</style>
