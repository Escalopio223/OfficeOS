<script setup lang="ts">
import { ref } from 'vue';
import { usePaintStore } from '@/stores/paintStore';
import {
  serializeProject,
  compositeAllLayers,
  exportCanvasToBlob,
  exportCanvasToSvg,
  triggerHostDownload,
} from '@/utils/paint/serializer';
import { notifyFilesystemChanged } from '@/stores/filesystem';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', filename: string): void;
}>();

const paintStore = usePaintStore();

const exportFormat = ref<'opaint' | 'png' | 'webp' | 'svg'>('opaint');
const exportDestination = ref<'vfs' | 'local'>('vfs');
const fileNameInput = ref(paintStore.projectName.replace(/\.[^/.]+$/, '') || 'Mi Dibujo');
const isProcessing = ref(false);
const statusMessage = ref('');
const errorMessage = ref('');

async function handleConfirmExport() {
  errorMessage.value = '';
  statusMessage.value = '';
  isProcessing.value = true;

  try {
    const rawName = fileNameInput.value.trim() || 'Dibujo';
    const ext = exportFormat.value;
    const finalFilename = `${rawName}.${ext}`;

    // 1. FORMATO .OPAINT (Proyecto multicapa editable)
    if (ext === 'opaint') {
      const projectData = serializeProject(
        finalFilename,
        paintStore.viewport.canvasWidth,
        paintStore.viewport.canvasHeight,
        paintStore.viewport.backgroundColor,
        paintStore.layers
      );
      const jsonContent = JSON.stringify(projectData);

      if (exportDestination.value === 'local') {
        triggerHostDownload(jsonContent, finalFilename);
        statusMessage.value = 'Archivo .opaint descargado correctamente.';
      } else {
        // Guardar en OogleOS VFS
        if (paintStore.projectFileId) {
          // Actualizar archivo existente
          const res = await fetch(`/api/nodes/${paintStore.projectFileId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: finalFilename,
              content: jsonContent,
            }),
          });
          if (!res.ok) throw new Error('Error al actualizar archivo en OogleOS');
        } else {
          // Crear nuevo nodo en root.desktop
          const res = await fetch('/api/nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: finalFilename,
              is_directory: false,
              content: jsonContent,
              parentPath: 'root.desktop',
              mime_type: 'application/x-opaint',
            }),
          });
          if (!res.ok) throw new Error('Error al guardar en OogleOS');
          const newNode = await res.json();
          paintStore.projectFileId = newNode.id;
        }

        paintStore.projectName = finalFilename;
        paintStore.isDirty = false;
        notifyFilesystemChanged();
        statusMessage.value = 'Guardado con éxito en el Escritorio de OogleOS.';
      }
    } else {
      // 2. FORMATOS ESTÁNDAR: PNG, WEBP, SVG
      const compositeCanvas = compositeAllLayers(
        paintStore.viewport.canvasWidth,
        paintStore.viewport.canvasHeight,
        paintStore.viewport.backgroundColor,
        paintStore.layers
      );

      if (ext === 'svg') {
        const svgContent = exportCanvasToSvg(
          paintStore.viewport.canvasWidth,
          paintStore.viewport.canvasHeight,
          paintStore.viewport.backgroundColor,
          compositeCanvas
        );

        if (exportDestination.value === 'local') {
          triggerHostDownload(svgContent, finalFilename);
          statusMessage.value = 'Archivo SVG descargado.';
        } else {
          const res = await fetch('/api/nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: finalFilename,
              is_directory: false,
              content: svgContent,
              parentPath: 'root.desktop',
              mime_type: 'image/svg+xml',
            }),
          });
          if (!res.ok) throw new Error('Error al guardar SVG en OogleOS');
          notifyFilesystemChanged();
          statusMessage.value = 'SVG guardado en OogleOS.';
        }
      } else {
        // PNG o WebP
        const mime = ext === 'webp' ? 'image/webp' : 'image/png';
        const blob = await exportCanvasToBlob(compositeCanvas, mime);
        if (!blob) throw new Error('Error al generar blob de imagen');

        if (exportDestination.value === 'local') {
          triggerHostDownload(blob, finalFilename);
          statusMessage.value = `Imagen ${ext.toUpperCase()} descargada a tu PC.`;
        } else {
          // En OogleOS subimos imágenes como FormData multipart o Base64 DataURL
          const dataUrl = compositeCanvas.toDataURL(mime);
          const res = await fetch('/api/nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: finalFilename,
              is_directory: false,
              content: dataUrl,
              parentPath: 'root.desktop',
              mime_type: mime,
            }),
          });
          if (!res.ok) throw new Error('Error al guardar imagen en OogleOS');
          notifyFilesystemChanged();
          statusMessage.value = `Imagen ${ext.toUpperCase()} guardada en OogleOS.`;
        }
      }
    }

    emit('saved', finalFilename);
    setTimeout(() => {
      emit('close');
    }, 1200);
  } catch (err: any) {
    errorMessage.value = err.message || 'Error inesperado al exportar';
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <div v-if="isOpen" class="export-modal-backdrop" @click.self="emit('close')">
    <div class="export-modal-card glass-modal">
      <div class="modal-header">
        <div class="modal-title-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="modal-header-icon">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <h3>Guardar o Exportar Dibujo</h3>
        </div>
        <button class="close-x-btn" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <!-- Nombre del archivo -->
        <div class="form-group">
          <label>Nombre del archivo</label>
          <input
            v-model="fileNameInput"
            type="text"
            class="form-input"
            placeholder="Nombre del proyecto..."
          />
        </div>

        <!-- Selector de Formato -->
        <div class="form-group">
          <label>Formato de exportación</label>
          <div class="format-chips-grid">
            <button
              class="format-chip"
              :class="{ 'is-active': exportFormat === 'opaint' }"
              @click="exportFormat = 'opaint'"
            >
              <span class="chip-badge">Recomendado</span>
              <span class="chip-title">.OPAINT</span>
              <span class="chip-desc">Proyecto multicapa editable en OogleOS</span>
            </button>

            <button
              class="format-chip"
              :class="{ 'is-active': exportFormat === 'png' }"
              @click="exportFormat = 'png'"
            >
              <span class="chip-title">PNG</span>
              <span class="chip-desc">Imagen rasterizada sin pérdida</span>
            </button>

            <button
              class="format-chip"
              :class="{ 'is-active': exportFormat === 'webp' }"
              @click="exportFormat = 'webp'"
            >
              <span class="chip-title">WebP</span>
              <span class="chip-desc">Máxima compresión web</span>
            </button>

            <button
              class="format-chip"
              :class="{ 'is-active': exportFormat === 'svg' }"
              @click="exportFormat = 'svg'"
            >
              <span class="chip-title">SVG</span>
              <span class="chip-desc">Gráfico vectorial escalable</span>
            </button>
          </div>
        </div>

        <!-- Destino: OogleOS vs PC Local -->
        <div class="form-group">
          <label>Destino</label>
          <div class="destination-tabs">
            <button
              class="dest-tab"
              :class="{ 'is-active': exportDestination === 'vfs' }"
              @click="exportDestination = 'vfs'"
            >
              <span class="tab-icon">🖥️</span>
              <span>Guardar en OogleOS (Escritorio)</span>
            </button>
            <button
              class="dest-tab"
              :class="{ 'is-active': exportDestination === 'local' }"
              @click="exportDestination = 'local'"
            >
              <span class="tab-icon">💾</span>
              <span>Descargar a mi PC local</span>
            </button>
          </div>
        </div>

        <!-- Mensajes de feedback -->
        <div v-if="statusMessage" class="feedback-msg success-msg">
          ✓ {{ statusMessage }}
        </div>
        <div v-if="errorMessage" class="feedback-msg error-msg">
          ⚠ {{ errorMessage }}
        </div>
      </div>

      <div class="modal-footer">
        <button class="secondary-btn" @click="emit('close')">Cancelar</button>
        <button
          class="primary-btn"
          :disabled="isProcessing"
          @click="handleConfirmExport"
        >
          {{ isProcessing ? 'Procesando...' : exportDestination === 'local' ? 'Descargar Archivo' : 'Guardar en OogleOS' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
}

.export-modal-card {
  width: 90%;
  max-width: 480px;
  background: rgba(23, 27, 40, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(28px);
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
  overflow: hidden;
  animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(12px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-title-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-header-icon {
  width: 20px;
  height: 20px;
  color: #38bdf8;
}

.modal-title-box h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
}

.close-x-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.close-x-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.form-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 10px 12px;
  color: #ffffff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
}

.format-chips-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.format-chip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.format-chip:hover {
  background: rgba(255, 255, 255, 0.08);
}

.format-chip.is-active {
  background: rgba(59, 130, 246, 0.16);
  border-color: #3b82f6;
  box-shadow: 0 0 14px rgba(59, 130, 246, 0.25);
}

.chip-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: #3b82f6;
  color: #ffffff;
  font-size: 8px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 6px;
  text-transform: uppercase;
}

.chip-title {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
}

.chip-desc {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
}

.destination-tabs {
  display: flex;
  gap: 8px;
}

.dest-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dest-tab:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
}

.dest-tab.is-active {
  background: rgba(16, 185, 129, 0.16);
  border-color: #10b981;
  color: #34d399;
}

.feedback-msg {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.success-msg {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.error-msg {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.secondary-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #cbd5e1;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.primary-btn {
  padding: 8px 18px;
  background: #2563eb;
  border: 1px solid #3b82f6;
  color: #ffffff;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
  transition: all 0.15s ease;
}

.primary-btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
