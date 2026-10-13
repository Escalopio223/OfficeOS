<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useWindowBounds } from '@/composables/useWindowBounds';

const winStore = useWindowStore();
const winState = winStore.windows['ophotos'];
const { x, y, width, height, startDrag, startResize } = useWindowBounds(200, 60, 720, 520);

const zoom = ref(1);
const rotation = ref(0);

const fileName = computed(() => winState.data?.name || 'imagen.jpg');
const imageUrl = computed(() => winState.data?.url || '');
const imageMeta = computed(() => winState.data?.meta || '800 x 600 px');

watch(
  () => winState.data,
  () => {
    zoom.value = 1;
    rotation.value = 0;
  }
);

function zoomIn() {
  zoom.value = Math.min(3, +(zoom.value + 0.25).toFixed(2));
}

function zoomOut() {
  zoom.value = Math.max(0.5, +(zoom.value - 0.25).toFixed(2));
}

function rotate() {
  rotation.value = (rotation.value + 90) % 360;
}

function resetView() {
  zoom.value = 1;
  rotation.value = 0;
}

function handleDoubleClickHeader(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.win-controls')) {
    winStore.toggleMaximize('ophotos');
  }
}
</script>

<template>
  <div
    v-show="!winState.isMinimized"
    class="ophotos-window"
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
    @mousedown="winStore.focusWindow('ophotos')"
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
        <svg class="photos-icon" viewBox="0 0 24 24" fill="none" stroke="#EA4335" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>{{ fileName }} — Ophotos</span>
      </div>

      <div class="win-controls" @mousedown.stop @dblclick.stop>
        <button class="win-btn" @click="winStore.toggleMinimize('ophotos')">—</button>
        <button class="win-btn" @click="winStore.toggleMaximize('ophotos')">
          {{ winState.isMaximized ? '❐' : '□' }}
        </button>
        <button class="win-btn close" @click="winStore.closeWindow('ophotos')">✕</button>
      </div>
    </header>

    <!-- Controles de Imagen -->
    <div class="photos-toolbar">
      <div class="tool-group">
        <button class="tool-btn" @click="zoomOut">🔍 -</button>
        <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
        <button class="tool-btn" @click="zoomIn">🔍 +</button>
        <button class="tool-btn" @click="rotate">↻ Rotar</button>
        <button class="tool-btn" @click="resetView">Restaurar</button>
      </div>
      <span class="meta-info">{{ imageMeta }}</span>
    </div>

    <!-- Lienzo de Visualización -->
    <div class="canvas-viewport">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="fileName"
        class="preview-img"
        :style="{ transform: `scale(${zoom}) rotate(${rotation}deg)` }"
        draggable="false"
      />
    </div>
  </div>
</template>

<style scoped>
.ophotos-window {
  position: absolute;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(234, 67, 53, 0.3);
  border-radius: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.ophotos-window.is-maximized {
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: calc(100vh - 50px) !important;
  border-radius: 0;
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

.window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
}
.photos-icon { width: 16px; height: 16px; }

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

.photos-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.tool-btn:hover { background: rgba(255, 255, 255, 0.16); }

.zoom-label {
  font-size: 12px;
  font-family: monospace;
  color: #cbd5e1;
  min-width: 45px;
  text-align: center;
}

.meta-info {
  font-size: 11px;
  font-family: monospace;
  color: #94a3b8;
}

.canvas-viewport {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(circle, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.95) 100%);
  position: relative;
}

.preview-img {
  max-width: 90%;
  max-height: 90%;
  border-radius: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  transition: transform 0.2s ease;
  object-fit: contain;
}
</style>