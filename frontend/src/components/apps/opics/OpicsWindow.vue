<script setup lang="ts">
import { ref, watch } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useWindowBounds } from '@/composables/useWindowBounds';
import opicsSvg from '@/assets/opics.svg';

interface ImageNode {
  id: string;
  name: string;
  path: string;
  size_bytes: number;
  mime_type?: string;
}

const winStore = useWindowStore();
const winState = winStore.windows['opics'];
const { x, y, width, height, startDrag, startResize } = useWindowBounds(180, 60, 840, 560);

const currentMode = ref<'gallery' | 'single'>('gallery');
const images = ref<ImageNode[]>([]);
const loadingImages = ref(false);
const searchQuery = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const currentImageIndex = ref<number>(-1);
const fileName = ref('Galería de Imágenes');
const imageUrl = ref('');
const imageMeta = ref('');

const zoom = ref(1);
const rotation = ref(0);

function formatBytes(bytes: number = 0): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getThumbUrl(name: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(name)}/320/220`;
}

function getFullUrl(name: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(name)}/1000/700`;
}

async function fetchImages(query = '') {
  loadingImages.value = true;
  try {
    const q = query.trim();
    const endpoint = q
      ? `/api/nodes/images?q=${encodeURIComponent(q)}&limit=150`
      : `/api/nodes/images?limit=150`;
    const res = await fetch(endpoint);
    if (!res.ok) return;
    const data = await res.json();
    images.value = data.nodes || [];

    // Si estamos en modo individual y se encuentra la imagen actual, sincronizar índice
    if (currentMode.value === 'single' && fileName.value) {
      const idx = images.value.findIndex((img) => img.name === fileName.value);
      if (idx !== -1) currentImageIndex.value = idx;
    }
  } catch (err) {
    console.error('Error al cargar imágenes:', err);
  } finally {
    loadingImages.value = false;
  }
}

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    fetchImages(searchQuery.value);
  }, 250);
}

function clearSearch() {
  searchQuery.value = '';
  fetchImages('');
}

function openSingleImage(img: ImageNode, idx: number) {
  currentImageIndex.value = idx;
  fileName.value = img.name;
  imageUrl.value = getFullUrl(img.name);
  imageMeta.value = `${formatBytes(img.size_bytes)} • ${img.path || 'OogleOS'}`;
  currentMode.value = 'single';
  zoom.value = 1;
  rotation.value = 0;
  winStore.windows['opics'].title = `${img.name} — Opics`;
}

function returnToGallery() {
  currentMode.value = 'gallery';
  winStore.windows['opics'].title = searchQuery.value
    ? `Búsqueda: "${searchQuery.value}" — Opics`
    : 'Galería de Fotos — Opics';
}

function prevImage() {
  if (images.value.length === 0) return;
  const newIndex = (currentImageIndex.value - 1 + images.value.length) % images.value.length;
  const target = images.value[newIndex];
  if (target) openSingleImage(target, newIndex);
}

function nextImage() {
  if (images.value.length === 0) return;
  const newIndex = (currentImageIndex.value + 1) % images.value.length;
  const target = images.value[newIndex];
  if (target) openSingleImage(target, newIndex);
}

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

watch(
  () => winState.data,
  (newData) => {
    if (newData?.url || (newData?.name && !newData?.mode)) {
      fileName.value = newData.name || 'imagen.jpg';
      imageUrl.value = newData.url || getFullUrl(newData.name);
      imageMeta.value = newData.meta || '800 x 600 px';
      currentMode.value = 'single';
      zoom.value = 1;
      rotation.value = 0;
      winStore.windows['opics'].title = `${fileName.value} — Opics`;
      fetchImages();
      return;
    }

    currentMode.value = 'gallery';
    winStore.windows['opics'].title = 'Galería de Fotos — Opics';
    fetchImages();
  },
  { immediate: true }
);

function handleDoubleClickHeader(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.win-controls')) {
    winStore.toggleMaximize('opics');
  }
}
</script>

<template>
  <div
    v-show="!winState.isMinimized"
    class="opics-window"
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
    @mousedown="winStore.focusWindow('opics')"
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
        <img :src="opicsSvg" alt="Opics" class="opics-icon" />
        <span>{{ currentMode === 'gallery' ? 'Galería de Fotos' : fileName }} — Opics</span>
      </div>

      <div class="win-controls" @mousedown.stop @dblclick.stop>
        <button class="win-btn" title="Minimizar" @click="winStore.toggleMinimize('opics')">—</button>
        <button class="win-btn" title="Maximizar" @click="winStore.toggleMaximize('opics')">
          {{ winState.isMaximized ? '❐' : '□' }}
        </button>
        <button class="win-btn close" title="Cerrar" @click="winStore.closeWindow('opics')">✕</button>
      </div>
    </header>

    <!-- Barra de Herramientas Dinámica -->
    <div class="opics-toolbar">
      <!-- Toolbar Modo Galería -->
      <template v-if="currentMode === 'gallery'">
        <div class="gallery-search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="gallery-search-input"
            placeholder="Buscar fotos por nombre en todo el sistema..."
            @input="onSearchInput"
          />
          <button v-if="searchQuery" class="clear-search-btn" @click="clearSearch">✕</button>
        </div>

        <div class="gallery-meta">
          <span class="count-badge">{{ images.length }} fotos</span>
          <button class="tool-btn refresh-btn" title="Recargar imágenes" @click="fetchImages(searchQuery)">
            ↻
          </button>
        </div>
      </template>

      <!-- Toolbar Modo Visor Individual -->
      <template v-else>
        <div class="viewer-actions">
          <button class="tool-btn back-btn" title="Volver a la galería" @click="returnToGallery">
            ‹ Galería
          </button>

          <div class="nav-group" v-if="images.length > 0">
            <button class="tool-btn nav" title="Imagen anterior" @click="prevImage">◀</button>
            <span class="image-index-text" v-if="currentImageIndex >= 0">
              {{ currentImageIndex + 1 }} / {{ images.length }}
            </span>
            <button class="tool-btn nav" title="Imagen siguiente" @click="nextImage">▶</button>
          </div>

          <div class="zoom-group">
            <button class="tool-btn" @click="zoomOut">🔍 -</button>
            <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
            <button class="tool-btn" @click="zoomIn">🔍 +</button>
            <button class="tool-btn" @click="rotate">↻ Rotar</button>
            <button class="tool-btn" @click="resetView">Restaurar</button>
          </div>
        </div>

        <span class="meta-info">{{ imageMeta }}</span>
      </template>
    </div>

    <!-- Contenido: Galería de Cuadrícula -->
    <div v-if="currentMode === 'gallery'" class="gallery-viewport">
      <div v-if="loadingImages" class="gallery-status">
        <div class="spinner"></div>
        <span>Buscando imágenes en el sistema...</span>
      </div>

      <div v-else-if="images.length === 0" class="gallery-status empty">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p>No se encontraron imágenes que coincidan con "{{ searchQuery }}"</p>
      </div>

      <div v-else class="gallery-grid">
        <div
          v-for="(img, idx) in images"
          :key="img.id"
          class="image-card"
          @click="openSingleImage(img, idx)"
        >
          <div class="card-thumb-wrapper">
            <img :src="getThumbUrl(img.name)" :alt="img.name" class="card-thumb" loading="lazy" />
          </div>
          <div class="card-info">
            <span class="card-name" :title="img.name">{{ img.name }}</span>
            <span class="card-size">{{ formatBytes(img.size_bytes) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenido: Visor Individual -->
    <div v-else class="canvas-viewport">
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
.opics-window {
  position: absolute;
  background: rgba(15, 23, 42, 0.94);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(234, 67, 53, 0.35);
  border-radius: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.opics-window.is-maximized {
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
.window-header:active { cursor: grabbing; }

.window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
}
.opics-icon { width: 18px; height: 18px; object-fit: contain; }

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

.opics-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.gallery-search-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 4px 10px;
  flex: 1;
  max-width: 380px;
  gap: 8px;
}
.gallery-search-box:focus-within {
  border-color: #ea4335;
  background: rgba(255, 255, 255, 0.09);
}

.search-icon {
  width: 14px;
  height: 14px;
  color: #94a3b8;
  flex-shrink: 0;
}

.gallery-search-input {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 12px;
  outline: none;
  width: 100%;
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
}

.gallery-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.count-badge {
  font-size: 11px;
  font-family: monospace;
  color: #ea4335;
  background: rgba(234, 67, 53, 0.15);
  border: 1px solid rgba(234, 67, 53, 0.3);
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.viewer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-btn {
  background: rgba(234, 67, 53, 0.25) !important;
  border-color: rgba(234, 67, 53, 0.45) !important;
  color: #fca5a5 !important;
  font-weight: 600;
}
.back-btn:hover {
  background: rgba(234, 67, 53, 0.4) !important;
  color: #fff !important;
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
}

.image-index-text {
  font-size: 11px;
  font-family: monospace;
  color: #94a3b8;
  padding: 0 4px;
}

.zoom-group {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}

.tool-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tool-btn:hover { background: rgba(255, 255, 255, 0.16); }
.tool-btn.nav { padding: 4px 8px; }
.tool-btn.refresh-btn { font-size: 14px; padding: 2px 8px; }

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

/* Galería Grid */
.gallery-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: rgba(10, 15, 29, 0.6);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}

.image-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}
.image-card:hover {
  transform: translateY(-2px);
  border-color: rgba(234, 67, 53, 0.5);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  background: rgba(255, 255, 255, 0.07);
}

.card-thumb-wrapper {
  width: 100%;
  height: 110px;
  background: rgba(0, 0, 0, 0.4);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.image-card:hover .card-thumb {
  transform: scale(1.05);
}

.card-info {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-name {
  font-size: 12px;
  color: #f1f5f9;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-size {
  font-size: 10px;
  color: #94a3b8;
  font-family: monospace;
}

.gallery-status {
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 13px;
}
.gallery-status.empty {
  color: #64748b;
}
.empty-icon {
  width: 48px;
  height: 48px;
  stroke: #475569;
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

/* Visor individual */
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
