<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useFileSystemStore } from '@/stores/filesystem';
import { useWindowStore } from '@/stores/windowStore';
import { useWindowBounds } from '@/composables/useWindowBounds';
import oxplorerSvg from '@/assets/oxplorer.svg';

const fs = useFileSystemStore();
const winStore = useWindowStore();
const searchQuery = ref('');

const winState = winStore.windows['oxplorer'];
const { x, y, width, height, startDrag, startResize } = useWindowBounds(80, 40, 840, 520);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toUpperCase() || 'FILE' : 'FILE';
}

function handleHeaderDoubleClick(e: MouseEvent) {
  // Solo reaccionar si el doble clic se hace sobre la barra, no sobre los botones de control
  const target = e.target as HTMLElement;
  if (!target.closest('.win-controls') && !target.closest('.perf-stats')) {
    winStore.toggleMaximize('oxplorer');
  }
}

onMounted(() => {
  fs.initRoot();
});
</script>

<template>
  <div
    v-show="!winState.isMinimized"
    class="glass-window"
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
    @mousedown="winStore.focusWindow('oxplorer')"
  >
    <!-- Tiradores de Redimensionamiento (Bordes y Esquinas) -->
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

    <!-- Cabecera Arrastrable con Doble Clic para Maximizar/Restaurar -->
    <header
      class="window-header"
      @mousedown="startDrag($event, winState.isMaximized)"
      @dblclick="handleHeaderDoubleClick"
    >
      <div class="window-title">
        <img :src="oxplorerSvg" alt="Oxplorer" class="window-header-icon" />
        <span class="title-text">Oxplorer</span>
        <span class="path-chip">{{ fs.currentFolder?.path || 'root' }}</span>
      </div>

      <div class="header-right" @mousedown.stop @dblclick.stop>
        <div class="perf-stats">
          <span class="perf-badge latency">
            <span class="dot"></span>
            {{ fs.latency }}
          </span>
          <span class="perf-badge source" :class="fs.dataSource">
            {{ fs.dataSource }}
          </span>
        </div>

        <div class="win-controls">
          <button class="win-btn minimize" title="Minimizar" @click="winStore.toggleMinimize('oxplorer')">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="win-btn maximize" title="Maximizar / Restaurar" @click="winStore.toggleMaximize('oxplorer')">
            <svg v-if="winState.isMaximized" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="7" width="11" height="11" rx="1.5"/>
              <path d="M8 7V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </button>
          <button class="win-btn close" title="Cerrar" @click="winStore.closeWindow('oxplorer')">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Barra de navegación y búsqueda -->
    <div class="glass-toolbar">
      <div class="nav-actions">
        <button class="glass-btn nav" :disabled="fs.history.length === 0" @click="searchQuery = ''; fs.goBack()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
      </div>

      <div class="address-bar">
        <svg class="folder-prefix" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
        </svg>
        <span class="address-text">{{ fs.currentFolder?.path || 'Cargando directorio...' }}</span>
      </div>

      <div class="search-wrapper">
        <svg class="search-glass-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Buscar 100k nodos..." 
          @input="fs.search(searchQuery)" 
        />
        <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''; fs.search('')">✕</button>
      </div>
    </div>

    <!-- Contenido de archivos -->
    <main class="glass-content" :class="{ 'is-loading': fs.loading }">
      <div
        v-for="item in fs.nodes"
        :key="item.id"
        class="file-card"
        :class="{ 'is-dir': item.is_directory }"
        @dblclick="fs.openDirectory(item)"
      >
        <div class="icon-container">
          <svg v-if="item.is_directory" class="folder-svg" viewBox="0 0 24 24">
            <defs>
              <linearGradient id="folderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#38bdf8" />
                <stop offset="100%" stop-color="#0284c7" />
              </linearGradient>
            </defs>
            <path fill="url(#folderGrad)" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>

          <div v-else class="doc-icon-wrapper">
            <svg class="file-svg" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span class="file-badge">{{ getFileExtension(item.name) }}</span>
          </div>
        </div>

        <div class="meta-container">
          <span class="file-title" :title="item.name">{{ item.name }}</span>
          <span v-if="!item.is_directory" class="file-sub">{{ formatBytes(item.size_bytes) }}</span>
          <span v-else class="file-sub dir-tag">Carpeta</span>
        </div>
      </div>

      <div v-if="fs.nodes.length === 0 && !fs.loading" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>No se encontraron nodos en este directorio</p>
      </div>
    </main>

    <!-- Barra de estado -->
    <footer class="window-statusbar">
      <div class="status-info">
        <span class="status-item">{{ fs.nodes.length }} elementos</span>
        <span class="status-divider">|</span>
        <span class="status-item">Indexación Trigram</span>
      </div>
      <div class="status-legend">
        <span>PostgreSQL + Redis</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.glass-window {
  position: absolute;
  background: rgba(15, 23, 42, 0.82);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 
    0 20px 50px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.glass-window.is-maximized {
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: calc(100vh - 50px) !important;
  border-radius: 0;
  border: none;
}

/* Tiradores de Redimensionamiento */
.resize-handle {
  position: absolute;
  z-index: 100;
}
.resize-handle.n { top: 0; left: 6px; right: 6px; height: 6px; cursor: n-resize; }
.resize-handle.s { bottom: 0; left: 6px; right: 6px; height: 6px; cursor: s-resize; }
.resize-handle.e { top: 6px; bottom: 6px; right: 0; width: 6px; cursor: e-resize; }
.resize-handle.w { top: 6px; bottom: 6px; left: 0; width: 6px; cursor: w-resize; }
.resize-handle.ne { top: 0; right: 0; width: 10px; height: 10px; cursor: ne-resize; }
.resize-handle.nw { top: 0; left: 0; width: 10px; height: 10px; cursor: nw-resize; }
.resize-handle.se { bottom: 0; right: 0; width: 10px; height: 10px; cursor: se-resize; }
.resize-handle.sw { bottom: 0; left: 0; width: 10px; height: 10px; cursor: sw-resize; }

/* Cabecera */
.window-header {
  height: 42px;
  background: rgba(255, 255, 255, 0.03);
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
  gap: 10px;
}

.window-header-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.title-text {
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
}

.path-chip {
  font-size: 11px;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
  color: #94a3b8;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.perf-stats {
  display: flex;
  align-items: center;
  gap: 6px;
}

.perf-badge {
  font-size: 11px;
  font-family: monospace;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 5px;
}

.perf-badge.latency { color: #38bdf8; }
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #38bdf8;
  box-shadow: 0 0 6px #38bdf8;
}
.perf-badge.source.redis-cache { color: #4ade80; border-color: rgba(74, 222, 128, 0.25); }
.perf-badge.source.trigram-index { color: #facc15; border-color: rgba(250, 204, 21, 0.25); }
.perf-badge.source.postgres { color: #cbd5e1; }

.win-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.win-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.win-btn svg { width: 12px; height: 12px; }
.win-btn:hover { background: rgba(255, 255, 255, 0.15); color: #ffffff; }
.win-btn.close:hover { background: #ef4444; border-color: #ef4444; color: #ffffff; }

/* Barra de herramientas */
.glass-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.glass-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.glass-btn svg { width: 16px; height: 16px; }
.glass-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.14); }
.glass-btn:disabled { opacity: 0.25; cursor: not-allowed; }

.address-bar {
  flex: 1;
  height: 32px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 8px;
}

.folder-prefix { width: 15px; height: 15px; color: #38bdf8; flex-shrink: 0; }
.address-text {
  font-size: 12px;
  font-family: monospace;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-wrapper { position: relative; width: 240px; height: 32px; }
.search-glass-icon {
  position: absolute;
  left: 9px;
  top: 8px;
  width: 15px;
  height: 15px;
  color: #94a3b8;
  pointer-events: none;
}
.search-wrapper input {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 0 28px 0 32px;
  color: #ffffff;
  font-size: 12px;
  outline: none;
  transition: all 0.15s ease;
}
.search-wrapper input:focus {
  border-color: rgba(56, 189, 248, 0.5);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
}
.clear-search {
  position: absolute;
  right: 8px;
  top: 7px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}

/* Área de contenido */
.glass-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
  gap: 12px;
  align-content: start;
}
.glass-content.is-loading { opacity: 0.5; }

.file-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.15s ease;
}
.file-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.icon-container {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}
.folder-svg { width: 44px; height: 44px; filter: drop-shadow(0 4px 8px rgba(2, 132, 199, 0.3)); }
.doc-icon-wrapper { position: relative; display: flex; align-items: center; justify-content: center; }
.file-svg { width: 40px; height: 40px; }
.file-badge {
  position: absolute;
  bottom: 2px;
  right: -2px;
  font-size: 8px;
  font-weight: 700;
  font-family: monospace;
  background: #3b82f6;
  color: #ffffff;
  padding: 1px 3px;
  border-radius: 3px;
}

.meta-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.file-title {
  font-size: 12px;
  font-weight: 500;
  color: #f8fafc;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.file-sub { font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 2px; }
.file-sub.dir-tag { color: #38bdf8; font-family: inherit; }

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 70px;
  gap: 12px;
  color: #64748b;
}
.empty-state svg { width: 48px; height: 48px; }

.window-statusbar {
  height: 26px;
  background: rgba(10, 15, 29, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  font-size: 11px;
  color: #94a3b8;
}
.status-info { display: flex; align-items: center; gap: 8px; }
.status-divider { color: #475569; }
.status-legend { font-family: monospace; font-size: 10px; color: #64748b; }
</style>