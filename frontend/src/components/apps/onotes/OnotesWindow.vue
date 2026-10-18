<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useDesktopStore } from '@/stores/desktopStore';
import { useFileSystemStore, notifyFilesystemChanged } from '@/stores/filesystem';
import { useWindowBounds } from '@/composables/useWindowBounds';
import onotesSvg from '@/assets/onotes.svg';
import WindowControls from '@/components/common/WindowControls.vue';

const winStore = useWindowStore();
const desktopStore = useDesktopStore();
const fs = useFileSystemStore();

const winState = winStore.windows['onotes'];
const { x, y, width, height, startDrag, startResize } = useWindowBounds(140, 70, 700, 480);

const currentNoteId = ref<string | null>(null);
const isVirtualPreview = computed(() => !!winState.data?.virtualFile && !currentNoteId.value);

const noteName = ref('Nueva Nota.txt');
const textContent = ref('');
const isSaved = ref(true);
const errorMessage = ref('');
const successMessage = ref('');

// Extensiones de texto permitidas obligatoriamente
const ALLOWED_TEXT_EXTENSIONS = [
  'txt', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'htm', 'css', 'scss',
  'md', 'markdown', 'log', 'sql', 'xml', 'csv', 'yml', 'yaml', 'env', 'sh', 'bash', 'py'
];

function getExtension(name: string): string {
  const parts = name.trim().split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

function isValidTextFile(name: string): boolean {
  const ext = getExtension(name);
  return ext !== '' && ALLOWED_TEXT_EXTENSIONS.includes(ext);
}

watch(
  () => winState.data,
  (newData) => {
    errorMessage.value = '';
    successMessage.value = '';

    if (newData?.noteId) {
      currentNoteId.value = newData.noteId;
      noteName.value = newData.name || 'Nota.txt';
      winStore.windows['onotes'].title = noteName.value;

      const desktopItem = desktopStore.items.find((i) => i.id === newData.noteId);
      const fsItem = fs.nodes.find((n) => n.id === newData.noteId);
      const existing = desktopItem || fsItem;

      if (existing) {
        noteName.value = existing.name;
        winStore.windows['onotes'].title = existing.name;
      }

      const existingContent = desktopItem?.content ?? fsItem?.content ?? newData.content;

      if (existingContent !== undefined && existingContent !== null && existingContent !== '') {
        textContent.value = existingContent;
        isSaved.value = true;
        return;
      }

      // Cargar desde endpoint raw de archivos (soporta tanto virtuales deterministas como físicos)
      fetch(`/api/files/${newData.noteId}/raw`)
        .then((res) => (res.ok ? res.text() : ''))
        .then((text) => {
          if (currentNoteId.value === newData.noteId) {
            textContent.value = text;
            isSaved.value = true;
          }
        })
        .catch(() => {
          textContent.value = '';
        });
      return;
    }

    if (newData?.virtualFile) {
      currentNoteId.value = null;
      noteName.value = newData.virtualFile.name;
      textContent.value = newData.virtualFile.content;
      isSaved.value = true;
      winStore.windows['onotes'].title = newData.virtualFile.name;
      return;
    }

    currentNoteId.value = null;
    noteName.value = 'Nueva Nota.txt';
    textContent.value = '';
    isSaved.value = true;
    winStore.windows['onotes'].title = 'Nueva Nota.txt';
  },
  { immediate: true }
);

function onInput() {
  if (!isVirtualPreview.value) {
    isSaved.value = false;
  }
}

function createNewNote() {
  currentNoteId.value = null;
  winStore.windows['onotes'].data = null;
  noteName.value = 'Nueva Nota.txt';
  textContent.value = '';
  isSaved.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  winStore.windows['onotes'].title = 'Nueva Nota.txt';
}

function setSuccessFeedback(msg: string) {
  successMessage.value = msg;
  setTimeout(() => {
    if (successMessage.value === msg) {
      successMessage.value = '';
    }
  }, 3500);
}

async function saveFile() {
  errorMessage.value = '';
  const trimmedName = noteName.value.trim();

  if (!trimmedName) {
    errorMessage.value = 'El nombre del archivo no puede estar vacío.';
    return;
  }

  if (!isValidTextFile(trimmedName)) {
    const detectedExt = getExtension(trimmedName);
    errorMessage.value = detectedExt
      ? `Formato ".${detectedExt}" no permitido. Onotes solo permite archivos de texto (.txt, .json, .js, .ts, .md, .html, .css, .log, .sql, etc.)`
      : 'Formato inválido. Debe incluir una extensión de texto (ejemplo: .txt, .json, .js, .md).';
    return;
  }

  try {
    if (currentNoteId.value) {
      // Modificar archivo existente
      const res = await fetch(`/api/nodes/${currentNoteId.value}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          content: textContent.value
        }),
      });
      if (!res.ok) throw new Error('Error al actualizar nota');

      desktopStore.updateNoteContent(currentNoteId.value, textContent.value);
      desktopStore.renameItem(currentNoteId.value, trimmedName);
      notifyFilesystemChanged();
      isSaved.value = true;
      winStore.windows['onotes'].title = trimmedName;
      setSuccessFeedback('Guardado correctamente');
    } else {
      // Crear archivo de texto nuevo en el escritorio (root.desktop)
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          is_directory: false,
          content: textContent.value,
          parentPath: 'root.desktop',
          mime_type: 'text/plain',
        }),
      });
      if (!res.ok) throw new Error('Error al crear archivo');
      const newNode = await res.json();
      currentNoteId.value = newNode.id;
      winStore.windows['onotes'].data = { noteId: newNode.id };
      winStore.windows['onotes'].title = trimmedName;
      isSaved.value = true;
      await desktopStore.fetchDesktopItems();
      notifyFilesystemChanged();
      setSuccessFeedback('Archivo creado y guardado en Escritorio');
    }
  } catch (e) {
    errorMessage.value = 'Ocurrió un error al intentar guardar el archivo.';
  }
}

function handleDoubleClickHeader(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.win-controls')) {
    winStore.toggleMaximize('onotes');
  }
}
</script>

<template>
  <div
    v-show="!winState.isMinimized"
    class="onotes-window"
    :class="{ 'is-maximized': winState.isMaximized }"
    :style="
      winState.isMaximized
        ? { zIndex: winState.zIndex }
        : {
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`,
            zIndex: winState.zIndex
          }
    "
    @mousedown="winStore.focusWindow('onotes')"
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

    <!-- Header -->
    <header class="window-header" @mousedown="startDrag($event, winState.isMaximized)" @dblclick="handleDoubleClickHeader">
      <div class="window-title">
        <img :src="onotesSvg" alt="Onotes" class="onotes-icon" />
        <span>{{ noteName }} {{ isSaved ? '' : '*' }} — Onotes</span>
      </div>

      <WindowControls window-id="onotes" :is-maximized="winState.isMaximized" />
    </header>

    <!-- Barra de acciones y nombre de archivo -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn" title="Crear nueva nota en blanco" @click="createNewNote">
          📄 Nuevo
        </button>
        <button v-if="!isVirtualPreview" class="toolbar-btn primary" title="Guardar cambios" @click="saveFile">
          💾 Guardar
        </button>

        <div v-if="!isVirtualPreview" class="filename-container">
          <span class="file-label">Archivo:</span>
          <input
            v-model="noteName"
            type="text"
            class="filename-input"
            :class="{ 'is-invalid': !isValidTextFile(noteName) }"
            placeholder="nota.txt"
            @input="isSaved = false; errorMessage = ''"
          />
        </div>
      </div>

      <div class="toolbar-right">
        <span v-if="successMessage" class="status-indicator success">✓ {{ successMessage }}</span>
        <span v-else-if="!isVirtualPreview" class="status-indicator" :class="{ 'is-dirty': !isSaved }">
          {{ isSaved ? (currentNoteId ? 'Guardado' : 'Borrador nuevo') : 'Cambios sin guardar' }}
        </span>
        <span v-else class="status-indicator preview-badge">Vista previa</span>
      </div>
    </div>

    <!-- Banner de error si la extensión no es válida -->
    <div v-if="errorMessage" class="error-banner">
      <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ errorMessage }}</span>
      <button class="close-alert-btn" @click="errorMessage = ''">✕</button>
    </div>

    <!-- Área de edición -->
    <textarea
      v-model="textContent"
      class="editor-area"
      :readonly="isVirtualPreview"
      placeholder="Escribe aquí tu contenido de texto (.txt, .json, .js, .md)..."
      @input="onInput"
    ></textarea>
  </div>
</template>

<style scoped>
.onotes-window {
  position: absolute;
  background: rgba(18, 24, 38, 0.92);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.onotes-window.is-maximized {
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: calc(100vh - 50px) !important;
  border-radius: 0;
  border: none;
}

.resize-handle { position: absolute; z-index: 100; }
.resize-handle.n { top: 0; left: 6px; right: 6px; height: 6px; cursor: n-resize; }
.resize-handle.s { bottom: 0; left: 6px; right: 6px; height: 6px; cursor: s-resize; }
.resize-handle.e { top: 6px; bottom: 6px; right: 0; width: 6px; cursor: e-resize; }
.resize-handle.w { top: 6px; bottom: 6px; left: 0; width: 6px; cursor: w-resize; }
.resize-handle.ne { top: 0; right: 0; width: 10px; height: 10px; cursor: ne-resize; }
.resize-handle.nw { top: 0; left: 0; width: 10px; height: 10px; cursor: nw-resize; }
.resize-handle.se { bottom: 0; right: 0; width: 10px; height: 10px; cursor: se-resize; }
.resize-handle.sw { bottom: 0; left: 0; width: 10px; height: 10px; cursor: sw-resize; }

.window-header {
  height: 38px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  cursor: grab;
}
.window-header:active { cursor: grabbing; }

.window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #f8fafc;
}

.onotes-icon { width: 16px; height: 16px; }

.win-controls { display: flex; gap: 4px; }
.win-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
}
.win-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.win-btn.close:hover { background: #ef4444; color: #fff; }

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #f8fafc;
  padding: 4px 10px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}
.toolbar-btn:hover { background: rgba(255, 255, 255, 0.16); }
.toolbar-btn.primary {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(59, 130, 246, 0.5);
  color: #93c5fd;
}
.toolbar-btn.primary:hover { background: rgba(59, 130, 246, 0.4); color: #fff; }

.filename-container {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 6px;
}

.file-label {
  font-size: 11px;
  color: #94a3b8;
}

.filename-input {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-family: monospace;
  outline: none;
  min-width: 140px;
  transition: border-color 0.2s;
}
.filename-input:focus {
  border-color: #60a5fa;
  background: rgba(255, 255, 255, 0.1);
}
.filename-input.is-invalid {
  border-color: #f87171;
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
}

.status-indicator { font-size: 11px; color: #4ade80; }
.status-indicator.success { color: #38bdf8; font-weight: 500; }
.status-indicator.is-dirty { color: #facc15; }
.status-indicator.preview-badge { color: #38bdf8; }

.error-banner {
  background: rgba(239, 68, 68, 0.2);
  border-bottom: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 6px 12px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.alert-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke: #f87171;
}
.error-banner span {
  flex: 1;
}
.close-alert-btn {
  background: transparent;
  border: none;
  color: #fca5a5;
  cursor: pointer;
  font-size: 12px;
}

.editor-area {
  flex: 1;
  width: 100%;
  padding: 14px;
  background: transparent;
  border: none;
  color: #f8fafc;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  user-select: text;
}
</style>