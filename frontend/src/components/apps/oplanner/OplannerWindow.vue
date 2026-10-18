<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useWindowBounds } from '@/composables/useWindowBounds';
import { useOplannerStore } from '@/stores/oplannerStore';
import WindowControls from '@/components/common/WindowControls.vue';
import oplannerSvg from '@/assets/oplanner.svg';
import OplannerBoardView from './OplannerBoardView.vue';
import OplannerTableView from './OplannerTableView.vue';
import OplannerDocsView from './OplannerDocsView.vue';
import OplannerTaskDrawer from './OplannerTaskDrawer.vue';
import type { TaskPriority, TaskStatus } from '@/types/oplanner';

const winStore = useWindowStore();
const store = useOplannerStore();

const winState = winStore.windows['oplanner'];
const { x, y, width, height, startDrag, startResize } = useWindowBounds(90, 35, 1060, 680);

const fileInputRef = ref<HTMLInputElement | null>(null);
const showExportMenu = ref(false);

function handleHeaderDoubleClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.win-controls') && !target.closest('.header-btn')) {
    winStore.toggleMaximize('oplanner');
  }
}

// Atajo global Ctrl+S / Cmd+S dentro de la ventana
function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    handleSave();
  }
}

async function handleSave() {
  await store.saveToVirtualFs();
}

function handleImportClick() {
  fileInputRef.value?.click();
}

function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target?.result as string;
    if (content) {
      store.importFromOplannerFile(content);
    }
  };
  reader.readAsText(file);
  target.value = '';
}

function handleCreateTask() {
  const t = store.createTask('todo', { title: 'Nueva Tarea' });
  store.openTaskDrawer(t.id);
}

// Sincronización al abrir la ventana con datos de archivo (desde Oxplorer o Desktop)
watch(
  () => winState?.data,
  (newData) => {
    if (newData?.fileId && newData?.content !== undefined) {
      store.loadProjectFromFile(newData.fileId, newData.name || 'Proyecto.oplanner', newData.content);
    }
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div
    class="glass-window oplanner-window"
    :class="{
      'is-maximized': winState.isMaximized,
      'is-minimized': winState.isMinimized,
    }"
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
    @mousedown="winStore.focusWindow('oplanner')"
    @click="showExportMenu = false"
  >
    <!-- Cabecera de la Ventana -->
    <header class="glass-header" @mousedown="startDrag($event, winState.isMaximized)" @dblclick="handleHeaderDoubleClick">
      <div class="header-left">
        <img :src="oplannerSvg" alt="Oplanner" class="header-icon" />
        <div class="project-info">
          <span class="window-title">Oplanner</span>
          <span class="file-name-divider">/</span>
          <span class="project-name-badge" :title="store.currentFileName">
            {{ store.currentProject.name }}
          </span>
        </div>

        <!-- Indicador de guardado reactivo -->
        <div class="save-status-pill" :class="{ 'is-dirty': store.isDirty, 'is-saving': store.isSaving }">
          <span class="status-dot"></span>
          <span class="status-label">
            {{ store.isSaving ? 'Guardando...' : store.isDirty ? 'Cambios sin guardar' : 'Guardado en Oxplorer' }}
          </span>
        </div>
      </div>

      <div class="header-right" @mousedown.stop @dblclick.stop>
        <!-- Botón rápido Guardar (Ctrl+S) -->
        <button
          class="header-btn save-btn"
          :class="{ 'has-changes': store.isDirty }"
          title="Guardar en sistema de archivos virtual (Ctrl+S)"
          @click="handleSave"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          <span>Guardar</span>
        </button>

        <!-- Menú Exportar / Descargar -->
        <div class="export-dropdown-wrapper">
          <button
            class="header-btn"
            title="Opciones de exportación y descarga"
            @click.stop="showExportMenu = !showExportMenu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Exportar ▾</span>
          </button>

          <div v-if="showExportMenu" class="export-menu" @click.stop>
            <button class="export-item" @click="store.exportAsOplanner(); showExportMenu = false;">
              📦 Descargar .oplanner (JSON)
            </button>
            <button class="export-item" @click="store.exportAsMarkdown(); showExportMenu = false;">
              📄 Exportar como Markdown (.md)
            </button>
            <div class="export-divider"></div>
            <button class="export-item" @click="handleImportClick(); showExportMenu = false;">
              📂 Importar archivo .oplanner...
            </button>
            <button class="export-item" @click="store.resetToDemo(); showExportMenu = false;">
              🔄 Cargar Roadmap Demo OogleOS
            </button>
          </div>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept=".oplanner,.json"
          style="display: none"
          @change="onFileSelected"
        />

        <!-- Botón + Nueva Tarea -->
        <button
          class="header-btn primary-btn"
          title="Crear nueva tarea"
          @click="handleCreateTask"
        >
          <span>+ Tarea</span>
        </button>

        <!-- Controles unificados de ventana -->
        <WindowControls window-id="oplanner" :is-maximized="winState.isMaximized" />
      </div>
    </header>

    <!-- Barra de Herramientas y Selector de Vistas -->
    <div class="oplanner-toolbar">
      <!-- Selector de vistas estilo Linear -->
      <div class="view-switcher">
        <button
          class="view-tab"
          :class="{ 'is-active': store.activeView === 'board' }"
          @click="store.activeView = 'board'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="5" height="18" rx="1"></rect>
            <rect x="10" y="3" width="5" height="12" rx="1"></rect>
            <rect x="17" y="3" width="5" height="15" rx="1"></rect>
          </svg>
          <span>Tablero</span>
          <span class="tab-badge">{{ store.currentProject.tasks.length }}</span>
        </button>

        <button
          class="view-tab"
          :class="{ 'is-active': store.activeView === 'table' }"
          @click="store.activeView = 'table'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
            <line x1="8" y1="3" x2="8" y2="21"></line>
          </svg>
          <span>Tabla</span>
        </button>

        <button
          class="view-tab"
          :class="{ 'is-active': store.activeView === 'docs' }"
          @click="store.activeView = 'docs'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>Docs & Specs</span>
          <span class="tab-badge">{{ store.currentProject.docs.length }}</span>
        </button>
      </div>

      <!-- Filtros y Búsqueda (Visibles en Tablero y Tabla) -->
      <div v-if="store.activeView !== 'docs'" class="toolbar-filters">
        <!-- Buscador con debounce -->
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="store.searchQuery"
            type="text"
            placeholder="Filtrar tareas..."
            class="search-input"
          />
          <button v-if="store.searchQuery" class="clear-btn" @click="store.searchQuery = ''">✕</button>
        </div>

        <!-- Filtro por Prioridad -->
        <select v-model="store.filterPriority" class="filter-select">
          <option value="all">Prioridad: Todas</option>
          <option value="urgent">🔴 Urgente</option>
          <option value="high">🟠 Alta</option>
          <option value="medium">🟡 Media</option>
          <option value="low">⚪ Baja</option>
        </select>

        <!-- Filtro por Etiqueta -->
        <select v-model="store.filterTag" class="filter-select">
          <option value="all">Etiqueta: Todas</option>
          <option
            v-for="tag in store.availableTags"
            :key="tag.id"
            :value="tag.id"
          >
            🏷️ {{ tag.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Área Principal de la Aplicación -->
    <main class="oplanner-workspace">
      <OplannerBoardView v-if="store.activeView === 'board'" />
      <OplannerTableView v-else-if="store.activeView === 'table'" />
      <OplannerDocsView v-else-if="store.activeView === 'docs'" />

      <!-- Drawer lateral de detalle de tarea -->
      <OplannerTaskDrawer />
    </main>

    <!-- Tiradores de Redimensionado -->
    <div v-if="!winState.isMaximized" class="resize-handle handle-e" @mousedown="startResize($event, 'e', winState.isMaximized)"></div>
    <div v-if="!winState.isMaximized" class="resize-handle handle-s" @mousedown="startResize($event, 's', winState.isMaximized)"></div>
    <div v-if="!winState.isMaximized" class="resize-handle handle-se" @mousedown="startResize($event, 'se', winState.isMaximized)"></div>
  </div>
</template>

<style scoped>
.oplanner-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: #0d121c;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
  color: #f1f5f9;
}

.oplanner-window.is-maximized {
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: calc(100vh - 44px) !important;
  border-radius: 0;
  border: none;
}

.oplanner-window.is-minimized {
  display: none;
}

.glass-header {
  height: 44px;
  background: #111726;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  user-select: none;
  cursor: move;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 20px;
  height: 20px;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.window-title {
  font-weight: 700;
  color: #f8fafc;
}

.file-name-divider {
  color: #475569;
}

.project-name-badge {
  font-weight: 500;
  color: #94a3b8;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.save-status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.save-status-pill .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.save-status-pill.is-dirty {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.25);
}

.save-status-pill.is-dirty .status-dot {
  background: #f59e0b;
}

.save-status-pill.is-saving .status-dot {
  background: #38bdf8;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.header-btn svg {
  width: 14px;
  height: 14px;
}

.header-btn.save-btn.has-changes {
  border-color: rgba(245, 158, 11, 0.4);
  color: #fcd34d;
}

.header-btn.primary-btn {
  background: #38bdf8;
  color: #0b0f17;
  border: none;
  font-weight: 600;
}

.header-btn.primary-btn:hover {
  background: #7dd3fc;
}

/* Menú flotante de exportación */
.export-dropdown-wrapper {
  position: relative;
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  width: 240px;
  background: #111726;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  z-index: 50;
  padding: 5px;
}

.export-item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: #cbd5e1;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.export-item:hover {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.export-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 0;
}

/* Barra de herramientas */
.oplanner-toolbar {
  height: 42px;
  background: #0f1522;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.view-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-tab svg {
  width: 14px;
  height: 14px;
}

.view-tab:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.view-tab.is-active {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  font-weight: 600;
}

.tab-badge {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 5px;
  border-radius: 8px;
  color: inherit;
}

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 8px;
  width: 13px;
  height: 13px;
  color: #64748b;
  pointer-events: none;
}

.search-input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 4px 24px 4px 26px;
  color: #f1f5f9;
  font-size: 12px;
  width: 160px;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  width: 210px;
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.04);
}

.clear-btn {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
}

.filter-select {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 4px 8px;
  color: #cbd5e1;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.filter-select:focus {
  border-color: #38bdf8;
}

/* Espacio de trabajo */
.oplanner-workspace {
  flex: 1;
  position: relative;
  display: flex;
  overflow: hidden;
}

/* Tiradores de Redimensionado */
.resize-handle {
  position: absolute;
  z-index: 30;
}
.handle-e {
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: e-resize;
}
.handle-s {
  bottom: 0;
  left: 0;
  width: 100%;
  height: 6px;
  cursor: s-resize;
}
.handle-se {
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  cursor: se-resize;
}
</style>
