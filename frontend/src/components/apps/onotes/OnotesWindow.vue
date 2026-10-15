<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useDesktopStore } from '@/stores/desktopStore';
import { useFileSystemStore, notifyFilesystemChanged } from '@/stores/filesystem';
import { useWindowBounds } from '@/composables/useWindowBounds';
import onotesSvg from '@/assets/onotes.svg';

const winStore = useWindowStore();
const desktopStore = useDesktopStore();
const fs = useFileSystemStore();

const winState = winStore.windows['onotes'];
const { x, y, width, height, startDrag, startResize } = useWindowBounds(140, 70, 680, 460);

const activeNoteId = computed(() => winState.data?.noteId || null);
const isVirtualPreview = computed(() => !!winState.data?.virtualFile && !activeNoteId.value);

const noteName = ref('Sin título.txt');
const textContent = ref('');
const isSaved = ref(true);

watch(
  () => winState.data,
  (newData) => {
    if (newData?.noteId) {
      const desktopItem = desktopStore.items.find((i) => i.id === newData.noteId);
      if (desktopItem) {
        noteName.value = desktopItem.name;
        textContent.value = desktopItem.content || '';
        isSaved.value = true;
        winStore.windows['onotes'].title = desktopItem.name;
        return;
      }
      const fsItem = fs.nodes.find((n) => n.id === newData.noteId);
      if (fsItem) {
        noteName.value = fsItem.name;
        textContent.value = fsItem.content || '';
        isSaved.value = true;
        winStore.windows['onotes'].title = fsItem.name;
        return;
      }
      if (newData?.virtualFile) {
        noteName.value = newData.virtualFile.name;
        textContent.value = newData.virtualFile.content;
        isSaved.value = true;
        winStore.windows['onotes'].title = newData.virtualFile.name;
        return;
      }
    }
    if (newData?.virtualFile) {
      noteName.value = newData.virtualFile.name;
      textContent.value = newData.virtualFile.content;
      isSaved.value = true;
      winStore.windows['onotes'].title = newData.virtualFile.name;
      return;
    }

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

async function saveFile() {
  if (activeNoteId.value) {
    try {
      await fetch(`/api/nodes/${activeNoteId.value}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textContent.value }),
      });
      desktopStore.updateNoteContent(activeNoteId.value, textContent.value);
      notifyFilesystemChanged();
      isSaved.value = true;
    } catch {}
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

      <div class="win-controls" @mousedown.stop @dblclick.stop>
        <button class="win-btn" title="Minimizar" @click="winStore.toggleMinimize('onotes')">—</button>
        <button class="win-btn" title="Maximizar" @click="winStore.toggleMaximize('onotes')">
          {{ winState.isMaximized ? '❐' : '□' }}
        </button>
        <button class="win-btn close" title="Cerrar" @click="winStore.closeWindow('onotes')">✕</button>
      </div>
    </header>

    <!-- Barra de acciones rápidas -->
    <div class="editor-toolbar">
      <template v-if="!isVirtualPreview">
        <button class="toolbar-btn" @click="saveFile">
          💾 Guardar
        </button>
        <span class="status-indicator" :class="{ 'is-dirty': !isSaved }">
          {{ isSaved ? 'Guardado en escritorio' : 'Cambios sin guardar' }}
        </span>
      </template>
    </div>

    <!-- Área de edición -->
    <textarea
      v-model="textContent"
      class="editor-area"
      :readonly="isVirtualPreview"
      placeholder="Escribe aquí tu nota..."
      @input="onInput"
    ></textarea>
  </div>
</template>

<style scoped>
.onotes-window {
  position: absolute;
  background: rgba(18, 24, 38, 0.88);
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
  gap: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.toolbar-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}
.toolbar-btn:hover { background: rgba(255, 255, 255, 0.16); }

.status-indicator { font-size: 11px; color: #4ade80; }
.status-indicator.is-dirty { color: #facc15; }
.status-indicator.preview-badge { color: #38bdf8; }

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