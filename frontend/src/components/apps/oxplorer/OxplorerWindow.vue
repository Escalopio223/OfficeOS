<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useFileSystemStore } from '@/stores/filesystem';
import { useWindowStore } from '@/stores/windowStore';
import { useDesktopStore } from '@/stores/desktopStore';
import { useWindowBounds } from '@/composables/useWindowBounds';
import oxplorerSvg from '@/assets/oxplorer.svg';
import SecurityModal from '@/components/common/SecurityModal.vue';
import WindowControls from '@/components/common/WindowControls.vue';

const fs = useFileSystemStore();
const winStore = useWindowStore();
const desktopStore = useDesktopStore();
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
  const target = e.target as HTMLElement;
  if (!target.closest('.win-controls') && !target.closest('.perf-stats')) {
    winStore.toggleMaximize('oxplorer');
  }
}

// Drag nativo para arrastrar archivos fuera de Oxplorer hacia el escritorio u otras carpetas
function onFileDragStart(e: DragEvent, item: any) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copyMove';
  }
}

// Abrir carpetas en Oxplorer o abrir archivos en sus apps correspondientes
function handleItemDoubleClick(item: any) {
  if (item.is_directory) {
    if (item.is_protected && !fs.isFolderUnlocked(item.id)) {
      openUnlockModal(item);
      return;
    }
    fs.openDirectory(item);
    return;
  }

  const ext = getFileExtension(item.name);

  // 1. Archivos de hoja de cálculo (.CSV) -> Osheets
  if (ext === 'CSV') {
    winStore.openWindow('osheets', {
      name: item.name,
      content: item.content,
      fileId: item.id,
    });
    return;
  }

  // 2. Archivos de imagen (.JPG, .PNG, .JPEG, .WEBP, .SVG) -> Opics
  if (ext === 'JPG' || ext === 'PNG' || ext === 'JPEG' || ext === 'WEBP' || ext === 'SVG') {
    winStore.openWindow('opics', {
      name: item.name,
      url: fs.getFileRawUrl(item.id),
      meta: `${formatBytes(item.size_bytes)} • ${ext}`,
      imageId: item.id,
    });
    return;
  }

  // 3. Documentos PDF -> Abrir en Opdf
  if (ext === 'PDF') {
    winStore.openWindow('opdf', {
      fileId: item.id,
      name: item.name,
      content: item.content,
    });
    return;
  }

  // 4. Archivos de dibujo (.OPAINT) -> Opaint
  if (ext === 'OPAINT') {
    winStore.openWindow('opaint', {
      fileId: item.id,
      name: item.name,
      content: item.content,
    });
    return;
  }

  // 4. Archivos de texto y código (.TXT, .MD, .JSON, .LOG, .SQL, .JS, .TS) -> Onotes
  winStore.openWindow('onotes', {
    noteId: item.id,
    name: item.name,
    content: item.content,
  });
}

function handleDownloadSelectedItem() {
  if (!selectedItem.value || selectedItem.value.is_directory) return;
  fs.downloadFile(selectedItem.value);
  closeAllMenus();
}

// Modal personalizado para nombrar carpetas y archivos
const showNameModal = ref(false);
const modalTitle = ref('');
const modalInput = ref('');
const modalType = ref<'folder' | 'file' | 'note' | 'sheet' | 'pdf' | 'paint'>('folder');
const modalInputRef = ref<HTMLInputElement | null>(null);

function openCreateModal(type: 'folder' | 'file' | 'note' | 'sheet' | 'pdf' | 'paint') {
  closeAllMenus();
  modalType.value = type;
  if (type === 'folder') {
    modalTitle.value = 'Nueva Carpeta';
    modalInput.value = 'Nueva Carpeta';
  } else if (type === 'note') {
    modalTitle.value = 'Nueva Nota (Onotes)';
    modalInput.value = 'Nueva Nota.txt';
  } else if (type === 'sheet') {
    modalTitle.value = 'Nueva Hoja de Cálculo (Osheets)';
    modalInput.value = 'Nueva Hoja.csv';
  } else if (type === 'pdf') {
    modalTitle.value = 'Nuevo Documento PDF (Opdf)';
    modalInput.value = 'Nuevo Documento.pdf';
  } else if (type === 'paint') {
    modalTitle.value = 'Nuevo Dibujo (Opaint)';
    modalInput.value = 'Nuevo Dibujo.opaint';
  } else {
    modalTitle.value = 'Nuevo Archivo';
    modalInput.value = 'Nuevo Documento.txt';
  }
  showNameModal.value = true;
  nextTick(() => {
    modalInputRef.value?.focus();
    modalInputRef.value?.select();
  });
}

function cancelCreateModal() {
  showNameModal.value = false;
  modalInput.value = '';
}

async function confirmCreateModal() {
  const name = modalInput.value.trim();
  if (!name) return;

  showNameModal.value = false;

  if (modalType.value === 'folder') {
    await fs.createNode({
      name,
      is_directory: true,
      parentId: fs.currentFolder?.id,
      parentPath: fs.currentFolder?.path,
    });
  } else if (modalType.value === 'note') {
    const node = await fs.createNode({
      name,
      is_directory: false,
      content: '',
      parentId: fs.currentFolder?.id,
      parentPath: fs.currentFolder?.path,
    });
    if (node) {
      winStore.openWindow('onotes', { noteId: node.id });
    }
  } else if (modalType.value === 'sheet') {
    let sheetName = name;
    if (!sheetName.toLowerCase().endsWith('.csv')) {
      sheetName += '.csv';
    }
    const defaultCsv = 'id,producto,precio,stock\n1,Teclado Mecánico,79.99,15\n2,Ratón Inalámbrico,39.99,28';
    const node = await fs.createNode({
      name: sheetName,
      is_directory: false,
      content: defaultCsv,
      parentId: fs.currentFolder?.id,
      parentPath: fs.currentFolder?.path,
    });
    if (node) {
      winStore.openWindow('osheets', {
        name: node.name,
        content: node.content,
        fileId: node.id,
      });
    }
  } else if (modalType.value === 'pdf') {
    let pdfName = name;
    if (!pdfName.toLowerCase().endsWith('.pdf')) {
      pdfName += '.pdf';
    }
    const node = await fs.createNode({
      name: pdfName,
      is_directory: false,
      content: '',
      parentId: fs.currentFolder?.id,
      parentPath: fs.currentFolder?.path,
    });
    if (node) {
      winStore.openWindow('opdf', {
        fileId: node.id,
        name: node.name,
        content: node.content,
        isNew: true,
      });
    }
  } else if (modalType.value === 'paint') {
    let paintName = name;
    if (!paintName.toLowerCase().endsWith('.opaint')) {
      paintName += '.opaint';
    }
    const node = await fs.createNode({
      name: paintName,
      is_directory: false,
      content: '',
      parentId: fs.currentFolder?.id,
      parentPath: fs.currentFolder?.path,
    });
    if (node) {
      winStore.openWindow('opaint', {
        fileId: node.id,
        name: node.name,
        content: node.content,
        isNew: true,
      });
    }
  } else {
    await fs.createNode({
      name,
      is_directory: false,
      content: '',
      parentId: fs.currentFolder?.id,
      parentPath: fs.currentFolder?.path,
    });
  }
}

// Soltar un archivo o carpeta dentro de una tarjeta de subcarpeta en Oxplorer
async function onDropOnDirectoryItem(e: DragEvent, targetFolder: any) {
  e.preventDefault();
  e.stopPropagation();
  const raw = e.dataTransfer?.getData('application/json');
  if (!raw) return;
  try {
    const source = JSON.parse(raw);
    if (source.id === targetFolder.id) return;
    await fs.moveNode(source.id, targetFolder.id);
  } catch {}
}

// Soltar un elemento en el fondo de la carpeta actual de Oxplorer
async function onDropOnCurrentFolder(e: DragEvent) {
  e.preventDefault();
  const raw = e.dataTransfer?.getData('application/json');
  if (!raw || !fs.currentFolder) return;
  try {
    const source = JSON.parse(raw);
    if (source.id === fs.currentFolder.id || source.parent_id === fs.currentFolder.id) return;
    await fs.moveNode(source.id, fs.currentFolder.id);
  } catch {}
}

// Menús Contextuales Internos de Oxplorer
const showOxplorerMenu = ref(false);
const oxplorerMenuPos = ref({ x: 0, y: 0 });

const showItemMenu = ref(false);
const itemMenuPos = ref({ x: 0, y: 0 });
const selectedItem = ref<any | null>(null);

function closeAllMenus() {
  showOxplorerMenu.value = false;
  showItemMenu.value = false;
}

function onOxplorerContextMenu(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.file-card')) return;
  e.preventDefault();
  e.stopPropagation();
  closeAllMenus();

  const winEl = (e.currentTarget as HTMLElement).closest('.glass-window');
  if (winEl) {
    const rect = winEl.getBoundingClientRect();
    oxplorerMenuPos.value = {
      x: Math.min(e.clientX - rect.left, rect.width - 180),
      y: Math.min(e.clientY - rect.top, rect.height - 110),
    };
  } else {
    oxplorerMenuPos.value = { x: e.clientX, y: e.clientY };
  }
  showOxplorerMenu.value = true;
}

function onItemContextMenu(e: MouseEvent, item: any) {
  e.preventDefault();
  e.stopPropagation();
  closeAllMenus();
  selectedItem.value = item;

  const winEl = (e.currentTarget as HTMLElement).closest('.glass-window');
  if (winEl) {
    const rect = winEl.getBoundingClientRect();
    itemMenuPos.value = {
      x: Math.min(e.clientX - rect.left, rect.width - 180),
      y: Math.min(e.clientY - rect.top, rect.height - 110),
    };
  } else {
    itemMenuPos.value = { x: e.clientX, y: e.clientY };
  }
  showItemMenu.value = true;
}

function handleOpenSelectedItem() {
  if (selectedItem.value) {
    handleItemDoubleClick(selectedItem.value);
  }
  closeAllMenus();
}

async function handleDeleteSelectedItem() {
  if (!selectedItem.value) return;
  const item = selectedItem.value;
  closeAllMenus();

  if (winStore.windows['onotes']?.data?.noteId === item.id) {
    winStore.closeWindow('onotes');
  }
  if (winStore.windows['osheets']?.data?.fileId === item.id) {
    winStore.closeWindow('osheets');
  }

  await fs.deleteNode(item.id);
}

function handleCreateFolderFromMenu() {
  closeAllMenus();
  openCreateModal('folder');
}

function handleCreateNoteFromMenu() {
  closeAllMenus();
  openCreateModal('note');
}

function handleCreateSheetFromMenu() {
  closeAllMenus();
  openCreateModal('sheet');
}

function handleCreatePdfFromMenu() {
  closeAllMenus();
  openCreateModal('pdf');
}

function handleCreatePaintFromMenu() {
  closeAllMenus();
  openCreateModal('paint');
}

function handleOpenOpicsFromMenu() {
  closeAllMenus();
  winStore.openWindow('opics', { mode: 'gallery' });
}

// Modal de seguridad para carpetas protegidas en Oxplorer
const securityModalOpen = ref(false);
const securityModalMode = ref<'unlock' | 'create-secure' | 'set-password' | 'remove-password'>('unlock');
const securityTargetFolder = ref<any | null>(null);
const securityError = ref('');
const securityLoading = ref(false);

function openUnlockModal(folder: any) {
  securityTargetFolder.value = folder;
  securityModalMode.value = 'unlock';
  securityError.value = '';
  securityModalOpen.value = true;
}

function handleCreateSecureFolderFromMenu() {
  closeAllMenus();
  securityTargetFolder.value = null;
  securityModalMode.value = 'create-secure';
  securityError.value = '';
  securityModalOpen.value = true;
}

function handleSetProtection() {
  if (!selectedItem.value) return;
  const item = selectedItem.value;
  closeAllMenus();
  securityTargetFolder.value = item;
  securityModalMode.value = 'set-password';
  securityError.value = '';
  securityModalOpen.value = true;
}

function handleRemoveProtection() {
  if (!selectedItem.value) return;
  const item = selectedItem.value;
  closeAllMenus();
  securityTargetFolder.value = item;
  securityModalMode.value = 'remove-password';
  securityError.value = '';
  securityModalOpen.value = true;
}

async function onSecurityConfirm(payload: { name: string; password: string }) {
  if (securityModalMode.value === 'unlock') {
    if (!securityTargetFolder.value) return;
    securityLoading.value = true;
    securityError.value = '';
    const valid = await fs.verifyFolderPassword(securityTargetFolder.value.id, payload.password);
    securityLoading.value = false;
    if (valid) {
      const folder = securityTargetFolder.value;
      securityModalOpen.value = false;
      fs.openDirectory(folder);
    } else {
      securityError.value = 'Contraseña incorrecta';
    }
  } else if (securityModalMode.value === 'create-secure') {
    securityLoading.value = true;
    await fs.createNode({
      name: payload.name,
      is_directory: true,
      parentId: fs.currentFolder?.id,
      parentPath: fs.currentFolder?.path,
      password: payload.password,
    });
    securityLoading.value = false;
    securityModalOpen.value = false;
  } else if (securityModalMode.value === 'set-password') {
    if (!securityTargetFolder.value) return;
    securityLoading.value = true;
    securityError.value = '';
    const res = await fs.setFolderPassword(securityTargetFolder.value.id, payload.password);
    securityLoading.value = false;
    if (res.success) {
      securityModalOpen.value = false;
      await fs.refreshCurrentFolder();
    } else {
      securityError.value = res.error || 'Error al proteger la carpeta';
    }
  } else if (securityModalMode.value === 'remove-password') {
    if (!securityTargetFolder.value) return;
    securityLoading.value = true;
    securityError.value = '';
    const res = await fs.removeFolderPassword(securityTargetFolder.value.id, payload.password);
    securityLoading.value = false;
    if (res.success) {
      securityModalOpen.value = false;
      await fs.refreshCurrentFolder();
    } else {
      securityError.value = res.error || 'Contraseña incorrecta';
    }
  }
}

// Reaccionar a la apertura con ruta específica desde el escritorio o accesos directos
watch(
  () => winStore.windows['oxplorer']?.data,
  (newData) => {
    if (newData?.targetPath) {
      fs.navigateToPath(newData.targetPath);
    } else if (newData?.targetFolder) {
      fs.openDirectory(newData.targetFolder);
    }
  },
  { deep: true }
);

watch(
  () => fs.currentFolder,
  (folder) => {
    if (folder) {
      winStore.windows['oxplorer'].title = folder.path === 'root' ? 'Oxplorer' : (folder.name || 'Oxplorer');
    }
  }
);

onMounted(() => {
  const initData = winStore.windows['oxplorer']?.data;
  if (initData?.targetPath) {
    fs.navigateToPath(initData.targetPath);
  } else if (initData?.targetFolder) {
    fs.openDirectory(initData.targetFolder);
  } else {
    fs.initRoot();
  }
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
    @click="closeAllMenus"
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

        <WindowControls window-id="oxplorer" :is-maximized="winState.isMaximized" />
      </div>
    </header>

    <!-- Barra de navegación y búsqueda con creación de carpetas y archivos -->
    <div class="glass-toolbar">
      <div class="nav-actions">
        <button class="glass-btn nav" :disabled="fs.history.length === 0" title="Atrás" @click="searchQuery = ''; fs.goBack()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
      </div>

      <div class="action-buttons">
        <button class="action-btn" title="Crear Carpeta" @click="openCreateModal('folder')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
          <span>+ Carpeta</span>
        </button>
        <button class="action-btn" title="Crear Carpeta Segura" @click="handleCreateSecureFolderFromMenu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>+ Segura</span>
        </button>
        <button class="action-btn" title="Crear Archivo" @click="openCreateModal('file')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
          <span>+ Archivo</span>
        </button>
        <button class="action-btn" title="Crear Documento PDF" @click="openCreateModal('pdf')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <path d="M9 13h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9v-3z" stroke-width="1.5" />
            <path d="M9 13v5" stroke-width="1.5" />
          </svg>
          <span>+ PDF</span>
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

    <!-- Contenido de archivos con soporte de Drop sobre carpetas y fondo y clic derecho -->
    <main
      class="glass-content"
      :class="{ 'is-loading': fs.loading }"
      :data-oxplorer-content="true"
      :data-current-folder-id="fs.currentFolder?.id"
      :data-current-folder-name="fs.currentFolder?.name || 'Oxplorer'"
      @dragover.prevent
      @drop="onDropOnCurrentFolder($event)"
      @contextmenu.stop="onOxplorerContextMenu"
    >
      <div
        v-for="item in fs.nodes"
        :key="item.id"
        class="file-card"
        :class="{ 'is-dir': item.is_directory, 'is-selected': selectedItem?.id === item.id && showItemMenu }"
        :data-oxplorer-node="true"
        :data-node-id="item.id"
        :data-node-name="item.name"
        :data-is-dir="item.is_directory ? 'true' : 'false'"
        draggable="true"
        @dragstart="onFileDragStart($event, item)"
        @dblclick="handleItemDoubleClick(item)"
        @contextmenu.stop.prevent="onItemContextMenu($event, item)"
        @dragover.prevent
        @drop.stop="item.is_directory ? onDropOnDirectoryItem($event, item) : null"
      >
        <div class="icon-container">
          <div v-if="item.is_directory" class="folder-svg-wrap">
            <svg class="folder-svg" viewBox="0 0 24 24">
              <defs>
                <linearGradient id="folderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8" />
                  <stop offset="100%" stop-color="#0284c7" />
                </linearGradient>
              </defs>
              <path fill="url(#folderGrad)" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
            <div v-if="item.is_protected" class="padlock-badge" title="Carpeta protegida con contraseña">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="#0f172a"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
          </div>

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

      <!-- Botón para cargar más nodos en carpetas con miles de archivos -->
      <div v-if="fs.hasMore" class="load-more-wrapper">
        <button
          class="load-more-btn"
          :disabled="fs.loadingMore"
          @click="fs.loadMoreFolderContents()"
        >
          <span v-if="fs.loadingMore" class="spinner"></span>
          <span>{{ fs.loadingMore ? 'Cargando más nodos...' : `Cargar más (${fs.nodes.length} de ${fs.total} nodos)` }}</span>
        </button>
      </div>

      <div v-if="fs.nodes.length === 0 && !fs.loading" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>No se encontraron nodos en este directorio</p>
      </div>
    </main>

    <!-- Menú Contextual de Fondo de Oxplorer -->
    <div
      v-if="showOxplorerMenu"
      class="oxplorer-context-menu"
      :style="{ left: `${oxplorerMenuPos.x}px`, top: `${oxplorerMenuPos.y}px` }"
      @click.stop
    >
      <button class="context-item" @click="handleCreateFolderFromMenu">
        📁 Nueva Carpeta
      </button>
      <button class="context-item" @click="handleCreateSecureFolderFromMenu">
        🔒 Nueva Carpeta Segura
      </button>
      <button class="context-item" @click="handleCreateNoteFromMenu">
        📝 Nueva Nota (Onotes)
      </button>
      <button class="context-item" @click="handleCreateSheetFromMenu">
        📊 Nueva Hoja de Cálculo (Osheets)
      </button>
      <button class="context-item" @click="handleCreatePdfFromMenu">
        📄 Nuevo Documento PDF (Opdf)
      </button>
      <button class="context-item" @click="handleCreatePaintFromMenu">
        🎨 Nuevo Dibujo (Opaint)
      </button>
      <button class="context-item" @click="handleOpenOpicsFromMenu">
        🖼️ Galería de Fotos (Opics)
      </button>
    </div>

    <!-- Menú Contextual de Elemento (Archivo / Carpeta) en Oxplorer -->
    <div
      v-if="showItemMenu && selectedItem"
      class="oxplorer-context-menu"
      :style="{ left: `${itemMenuPos.x}px`, top: `${itemMenuPos.y}px` }"
      @click.stop
    >
      <button class="context-item" @click="handleOpenSelectedItem">
        <span>{{ selectedItem.is_directory ? '📁 Abrir Carpeta' : '📂 Abrir' }}</span>
      </button>
      <button v-if="!selectedItem?.is_directory" class="context-item" @click="handleDownloadSelectedItem">
        <span>⬇️ Descargar archivo</span>
      </button>
      <template v-if="selectedItem?.is_directory">
        <button v-if="selectedItem?.is_protected" class="context-item" @click="handleRemoveProtection">
          <span>🔓 Quitar Protección</span>
        </button>
        <button v-else class="context-item" @click="handleSetProtection">
          <span>🔒 Proteger con contraseña</span>
        </button>
      </template>
      <div class="menu-divider"></div>
      <button class="context-item danger" @click="handleDeleteSelectedItem">
        <span>🗑️ Eliminar</span>
      </button>
    </div>

    <!-- Modal de Seguridad para Carpetas en Oxplorer -->
    <SecurityModal
      :is-open="securityModalOpen"
      :mode="securityModalMode"
      :folder-name="securityTargetFolder?.name || ''"
      :error-message="securityError"
      :loading="securityLoading"
      @close="securityModalOpen = false"
      @confirm="onSecurityConfirm"
    />

    <!-- Modal Glassmorphism de Creación (20% ancho x 20% alto, centrado, no cerrable salvo Cancelar o Crear) -->
    <Teleport to="body">
      <div v-if="showNameModal" class="modal-backdrop">
        <div class="name-modal" @click.stop>
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="modal-icon">{{ modalType === 'folder' ? '📁' : modalType === 'note' ? '📝' : '📄' }}</span>
              <h3 class="modal-title">{{ modalTitle }}</h3>
            </div>
          </div>

          <div class="modal-body">
            <label class="modal-label">Nombre del elemento:</label>
            <input
              ref="modalInputRef"
              v-model="modalInput"
              type="text"
              class="modal-input"
              placeholder="Escribe el nombre..."
              @keydown.enter.prevent="confirmCreateModal"
            />
          </div>

          <div class="modal-actions">
            <button class="modal-btn secondary" type="button" @click="cancelCreateModal">
              Cancelar
            </button>
            <button
              class="modal-btn primary"
              type="button"
              :disabled="!modalInput.trim()"
              @click="confirmCreateModal"
            >
              Crear
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Barra de estado -->
    <footer class="window-statusbar">
      <div class="status-info">
        <span class="status-item">{{ fs.nodes.length }} de {{ fs.total }} elementos</span>
        <span class="status-divider">|</span>
        <span class="status-item">Pág. {{ fs.page }} / {{ fs.totalPages }}</span>
        <span class="status-divider">|</span>
        <span class="status-item">Indexación Trigram</span>
      </div>
      <div class="status-legend">
        <span>PostgreSQL + Redis (100k nodos)</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

.action-btn svg {
  width: 13px;
  height: 13px;
}

.oxplorer-context-menu {
  position: absolute;
  background: rgba(24, 24, 37, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  min-width: 170px;
}

.context-item {
  background: transparent;
  border: none;
  color: #e2e8f0;
  padding: 8px 12px;
  text-align: left;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
}

.context-item:hover {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.context-item.danger {
  color: #fca5a5;
}

.context-item.danger:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 0;
}

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

.file-card.is-selected {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
}

.file-card.is-drop-hover {
  background: rgba(56, 189, 248, 0.25) !important;
  border-color: #38bdf8 !important;
  transform: scale(1.06) !important;
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.4) !important;
}

.glass-content.is-drop-hover {
  background: rgba(56, 189, 248, 0.05);
  outline: 2px dashed rgba(56, 189, 248, 0.45);
  outline-offset: -4px;
}

.icon-container {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}
.folder-svg-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.folder-svg { width: 44px; height: 44px; filter: drop-shadow(0 4px 8px rgba(2, 132, 199, 0.3)); }
.padlock-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  background: rgba(15, 23, 42, 0.95);
  border: 1.5px solid #f59e0b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6), 0 0 8px rgba(245, 158, 11, 0.4);
  pointer-events: none;
}
.padlock-badge svg {
  width: 10px;
  height: 10px;
  color: #fbbf24;
}
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

/* Modal Glassmorphism de Creación (20% pantalla ancho x alto, centrado) */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 15, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
}

.name-modal {
  width: 20vw;
  height: 20vh;
  min-width: 320px;
  min-height: 190px;
  background: rgba(18, 24, 38, 0.94);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  box-shadow: 
    0 25px 60px rgba(0, 0, 0, 0.75), 
    0 0 35px rgba(56, 189, 248, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  animation: modalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.93) translateY(8px);
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
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-icon {
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
}

.modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #f8fafc;
  letter-spacing: -0.01em;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}

.modal-label {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.modal-input {
  background: rgba(10, 15, 29, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #ffffff;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.modal-input:focus {
  border-color: #38bdf8;
  background: rgba(10, 15, 29, 0.9);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.modal-btn {
  padding: 7px 16px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
  border: none;
}

.modal-btn.secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.modal-btn.primary {
  background: linear-gradient(135deg, #0284c7, #38bdf8);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
}

.modal-btn.primary:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(56, 189, 248, 0.45);
  transform: translateY(-1px);
}

.modal-btn.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.load-more-wrapper {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
  width: 100%;
}

.load-more-btn {
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.load-more-btn:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.24);
  border-color: #38bdf8;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
  transform: translateY(-1px);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(56, 189, 248, 0.25);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>