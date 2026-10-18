<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useWindowBounds } from '@/composables/useWindowBounds';
import { usePaintStore } from '@/stores/paintStore';
import opaintSvg from '@/assets/opaint.svg';
import OpaintCanvas from './OpaintCanvas.vue';
import OpaintFloatingDock from './OpaintFloatingDock.vue';
import OpaintLayersPanel from './OpaintLayersPanel.vue';
import OpaintRadialMenu from './OpaintRadialMenu.vue';
import OpaintExportModal from './OpaintExportModal.vue';
import WindowControls from '@/components/common/WindowControls.vue';
import type { OpaintProjectData } from '@/types/paint';

const winStore = useWindowStore();
const paintStore = usePaintStore();
const winState = winStore.windows['opaint'];

// Dimensiones y límites de la ventana flotante en el escritorio
const { x, y, width, height, startDrag, startResize } = useWindowBounds(120, 50, 920, 620);

const layersPanelOpen = ref(true);
const exportModalOpen = ref(false);

function handleClose() {
  winStore.closeWindow('opaint');
}

function handleMinimize() {
  winStore.toggleMinimize('opaint');
}

function handleMaximize() {
  winStore.toggleMaximize('opaint');
}

function handleFocus() {
  winStore.focusWindow('opaint');
}

// Carga reactiva de datos al abrir archivo desde el escritorio o Oxplorer
watch(
  () => winState.data,
  async (newData) => {
    if (!newData) {
      if (paintStore.layers.length === 0) {
        paintStore.initDefaultCanvas(1200, 800);
      }
      return;
    }

    if (newData.isNew) {
      paintStore.initDefaultCanvas(1200, 800);
      paintStore.projectName = 'Nuevo Dibujo.opaint';
      paintStore.projectFileId = null;
      if (winState) winState.title = 'Opaint - Nuevo Dibujo.opaint';
      return;
    }

    // Caso 1: Archivo .opaint (JSON estructurado)
    if (newData.fileId || newData.content) {
      paintStore.projectFileId = newData.fileId || null;
      paintStore.projectName = newData.name || 'Dibujo.opaint';
      if (winState) winState.title = `Opaint - ${paintStore.projectName}`;

      let rawContent = newData.content;
      if (!rawContent && newData.fileId) {
        try {
          const res = await fetch(`/api/files/${newData.fileId}/raw`);
          if (res.ok) {
            rawContent = await res.text();
          }
        } catch {}
      }

      if (rawContent) {
        try {
          const parsed: OpaintProjectData = JSON.parse(rawContent);
          await paintStore.loadProject(parsed);
          return;
        } catch {
          // Si no es JSON, intentar cargar como imagen plana en la capa 1
        }
      }
    }

    // Caso 2: Cargar una imagen (PNG, JPG, WebP) directamente en el lienzo
    if (newData.imageUrl || newData.url) {
      const imgUrl = newData.imageUrl || newData.url;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        paintStore.initDefaultCanvas(img.width || 1200, img.height || 800);
        const l1 = paintStore.layers[0];
        if (l1 && l1.ctx) {
          l1.ctx.drawImage(img, 0, 0);
        }
        paintStore.projectName = newData.name ? `${newData.name}.opaint` : 'Imagen.opaint';
        if (winState) winState.title = `Opaint - ${paintStore.projectName}`;
      };
      img.src = imgUrl;
    }
  },
  { immediate: true }
);

function handleNewDrawing() {
  if (paintStore.isDirty && !confirm('¿Deseas crear un nuevo lienzo? Se perderán los cambios no guardados.')) {
    return;
  }
  paintStore.initDefaultCanvas(1200, 800);
  paintStore.projectName = 'Nuevo Dibujo.opaint';
  paintStore.projectFileId = null;
  if (winState) winState.title = 'Opaint - Nuevo Dibujo.opaint';
}

// Atajos de teclado en la ventana
function onGlobalKeyDown(e: KeyboardEvent) {
  if (!winState.isOpen || winState.isMinimized) return;

  const isCtrl = e.ctrlKey || e.metaKey;

  if (isCtrl && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      paintStore.redo();
    } else {
      paintStore.undo();
    }
    return;
  }

  if (isCtrl && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    paintStore.redo();
    return;
  }

  if (isCtrl && e.key.toLowerCase() === 's') {
    e.preventDefault();
    exportModalOpen.value = true;
    return;
  }

  // Teclas de herramientas rápidas si no se está escribiendo en un input
  if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
    return;
  }

  switch (e.key.toLowerCase()) {
    case 'b':
      paintStore.currentToolType = 'brush';
      break;
    case 'e':
      paintStore.currentToolType = 'eraser';
      break;
    case 'g':
      paintStore.currentToolType = 'fill';
      break;
    case 'u':
      paintStore.currentToolType = 'shape';
      break;
    case 's':
      paintStore.currentToolType = 'select';
      break;
    case 'h':
      paintStore.currentToolType = 'pan';
      break;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown);
  if (winState) {
    winState.title = `Opaint - ${paintStore.projectName}`;
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeyDown);
});
</script>

<template>
  <div
    v-show="!winState.isMinimized"
    class="opaint-window glass-frame"
    :class="{ 'is-maximized': winState.isMaximized }"
    :style="{
      left: winState.isMaximized ? '0px' : `${x}px`,
      top: winState.isMaximized ? '0px' : `${y}px`,
      width: winState.isMaximized ? '100%' : `${width}px`,
      height: winState.isMaximized ? 'calc(100% - 40px)' : `${height}px`,
      zIndex: winState.zIndex,
    }"
    @mousedown="handleFocus"
  >
    <!-- Barra de Título y Controles de Ventana -->
    <header class="window-titlebar" @mousedown="startDrag($event, winState.isMaximized)">
      <div class="titlebar-left">
        <img :src="opaintSvg" alt="Opaint" class="app-icon" draggable="false" />
        <span class="window-title">
          {{ paintStore.projectName }}
          <span v-if="paintStore.isDirty" class="dirty-dot" title="Cambios sin guardar">•</span>
        </span>
      </div>

      <!-- Acciones de barra superior -->
      <div class="titlebar-center">
        <button class="topbar-action-btn" title="Nuevo lienzo en blanco" @click.stop="handleNewDrawing">
          📄 Nuevo
        </button>
        <button class="topbar-action-btn highlight-btn" title="Guardar en OogleOS o descargar" @click.stop="exportModalOpen = true">
          💾 Guardar / Exportar
        </button>
      </div>

      <WindowControls window-id="opaint" :is-maximized="winState.isMaximized" />
    </header>

    <!-- Área de Trabajo Principal (Viewport de dibujo) -->
    <div class="opaint-viewport-wrapper">
      <OpaintCanvas />

      <!-- Menú radial contextual interactivo -->
      <OpaintRadialMenu />

      <!-- Dock Flotante de Herramientas -->
      <OpaintFloatingDock
        :layers-panel-open="layersPanelOpen"
        @toggle-layers="layersPanelOpen = !layersPanelOpen"
        @open-export="exportModalOpen = true"
      />

      <!-- Panel Flotante de Capas -->
      <OpaintLayersPanel
        :is-open="layersPanelOpen"
        @close="layersPanelOpen = false"
      />

      <!-- Modal de Exportación -->
      <OpaintExportModal
        :is-open="exportModalOpen"
        @close="exportModalOpen = false"
        @saved="(filename) => { if (winState) winState.title = `Opaint - ${filename}`; }"
      />
    </div>

    <!-- Puntos de redimensión (Resize Handles) -->
    <template v-if="!winState.isMaximized">
      <div class="resize-handle rh-e" @mousedown.stop="startResize($event, 'e')" />
      <div class="resize-handle rh-s" @mousedown.stop="startResize($event, 's')" />
      <div class="resize-handle rh-se" @mousedown.stop="startResize($event, 'se')" />
      <div class="resize-handle rh-w" @mousedown.stop="startResize($event, 'w')" />
      <div class="resize-handle rh-sw" @mousedown.stop="startResize($event, 'sw')" />
    </template>
  </div>
</template>

<style scoped>
.opaint-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: #0f131f;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
  user-select: none;
}

.opaint-window.is-maximized {
  border-radius: 0;
  border: none;
}

/* Barra de Título */
.window-titlebar {
  height: 38px;
  background: rgba(18, 22, 34, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  cursor: default;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
}

.app-icon {
  width: 20px;
  height: 20px;
}

.window-title {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: 0.3px;
}

.dirty-dot {
  color: #38bdf8;
  font-size: 16px;
  font-weight: bold;
}

.titlebar-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-action-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.topbar-action-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.topbar-action-btn.highlight-btn {
  background: rgba(59, 130, 246, 0.18);
  border-color: rgba(59, 130, 246, 0.4);
  color: #60a5fa;
}

.topbar-action-btn.highlight-btn:hover {
  background: rgba(59, 130, 246, 0.35);
  color: #ffffff;
}

.titlebar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.win-btn {
  width: 26px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.win-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.win-btn.close:hover {
  background: #ef4444;
  color: #ffffff;
}

/* Área de dibujo */
.opaint-viewport-wrapper {
  position: relative;
  flex: 1;
  width: 100%;
  height: calc(100% - 38px);
  overflow: hidden;
}

/* Resize Handles */
.resize-handle {
  position: absolute;
  z-index: 1000;
}

.rh-e {
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: e-resize;
}

.rh-s {
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: s-resize;
}

.rh-se {
  right: 0;
  bottom: 0;
  width: 12px;
  height: 12px;
  cursor: se-resize;
}

.rh-w {
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: w-resize;
}

.rh-sw {
  left: 0;
  bottom: 0;
  width: 12px;
  height: 12px;
  cursor: sw-resize;
}
</style>
