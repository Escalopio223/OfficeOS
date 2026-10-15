<script setup lang="ts">
import { ref, nextTick, useTemplateRef } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useDesktopStore, type DesktopItem } from '@/stores/desktopStore';
import OxplorerWindow from '@/components/apps/oxplorer/OxplorerWindow.vue';
import OnotesWindow from '@/components/apps/onotes/OnotesWindow.vue';
import oxplorerSvg from '@/assets/oxplorer.svg';
import OsheetsWindow from '@/components/apps/osheets/OsheetsWindow.vue';
import OphotosWindow from '@/components/apps/ophotos/OphotosWindow.vue';

const winStore = useWindowStore();
const desktopStore = useDesktopStore();
const workspaceRef = useTemplateRef<HTMLElement>('workspaceRef');

const ICON_WIDTH = 84;
const ICON_HEIGHT = 86;
const COLLISION_PADDING = 6; // Margen mínimo de separación entre iconos

// Coordenadas locales para el icono de Oxplorer
const oxplorerPos = ref({ x: 24, y: 24 });

// Control de arrastre y estado de colisión en tiempo real
const activeDragId = ref<string | null>(null);
const isCurrentlyColliding = ref(false);
let startPointerX = 0;
let startPointerY = 0;
let initialTargetX = 0;
let initialTargetY = 0;
let hasMoved = false;

// --- MOTOR DE COLISIONES (AABB) ---
function getDesktopBounds() {
  const bounds = workspaceRef.value?.getBoundingClientRect();
  return {
    maxW: bounds ? bounds.width - ICON_WIDTH - 12 : window.innerWidth - ICON_WIDTH - 12,
    maxH: bounds ? bounds.height - ICON_HEIGHT - 12 : window.innerHeight - ICON_HEIGHT - 62,
  };
}

function getAllObstacles(excludeId: string | null) {
  const obstacles: { id: string; x: number; y: number }[] = [];

  if (excludeId !== 'oxplorer') {
    obstacles.push({ id: 'oxplorer', x: oxplorerPos.value.x, y: oxplorerPos.value.y });
  }

  for (const item of desktopStore.getFolderChildren(null)) {
    if (item.id !== excludeId) {
      obstacles.push({ id: item.id, x: item.x ?? 24, y: item.y ?? 120 });
    }
  }

  return obstacles;
}

function isColliding(x: number, y: number, excludeId: string | null): boolean {
  const obstacles = getAllObstacles(excludeId);
  const w = ICON_WIDTH + COLLISION_PADDING;
  const h = ICON_HEIGHT + COLLISION_PADDING;

  return obstacles.some((obs) => {
    return (
      x < obs.x + w &&
      x + w > obs.x &&
      y < obs.y + h &&
      y + h > obs.y
    );
  });
}

// Busca la posición libre más cercana en caso de solapamiento
function findFreePosition(targetX: number, targetY: number, excludeId: string | null): { x: number; y: number } {
  const { maxW, maxH } = getDesktopBounds();
  const clampedX = Math.min(Math.max(12, targetX), maxW);
  const clampedY = Math.min(Math.max(12, targetY), maxH);

  if (!isColliding(clampedX, clampedY, excludeId)) {
    return { x: clampedX, y: clampedY };
  }

  // Búsqueda radial por pasos para encontrar el hueco adyacente más próximo
  const step = 20;
  for (let radius = step; radius < 1200; radius += step) {
    const candidates = [
      { x: clampedX, y: clampedY + radius }, // Abajo
      { x: clampedX + radius, y: clampedY }, // Derecha
      { x: clampedX, y: clampedY - radius }, // Arriba
      { x: clampedX - radius, y: clampedY }, // Izquierda
      { x: clampedX + radius, y: clampedY + radius }, // Diagonal inf-der
      { x: clampedX - radius, y: clampedY + radius }, // Diagonal inf-izq
      { x: clampedX + radius, y: clampedY - radius }, // Diagonal sup-der
      { x: clampedX - radius, y: clampedY - radius }, // Diagonal sup-izq
    ];

    for (const pos of candidates) {
      if (pos.x >= 12 && pos.x <= maxW && pos.y >= 12 && pos.y <= maxH) {
        if (!isColliding(pos.x, pos.y, excludeId)) {
          return pos;
        }
      }
    }
  }

  // Fallback a su posición original antes de arrastrar
  return { x: initialTargetX, y: initialTargetY };
}

// --- EVENTOS DE ARRASTRE ---
function startItemDrag(e: MouseEvent, id: string, currentX: number, currentY: number) {
  if (e.button !== 0) return;
  if (editingItemId.value === id) return;

  activeDragId.value = id;
  hasMoved = false;
  isCurrentlyColliding.value = false;
  startPointerX = e.clientX;
  startPointerY = e.clientY;
  initialTargetX = currentX;
  initialTargetY = currentY;

  window.addEventListener('mousemove', onGlobalMouseMove);
  window.addEventListener('mouseup', onGlobalMouseUp);
}

function onGlobalMouseMove(e: MouseEvent) {
  if (!activeDragId.value) return;

  const deltaX = e.clientX - startPointerX;
  const deltaY = e.clientY - startPointerY;

  if (Math.hypot(deltaX, deltaY) > 3) {
    hasMoved = true;
  }

  const { maxW, maxH } = getDesktopBounds();
  const nextX = Math.min(Math.max(12, initialTargetX + deltaX), maxW);
  const nextY = Math.min(Math.max(12, initialTargetY + deltaY), maxH);

  // Comprobar si en esta coordenada está pisando otro icono
  isCurrentlyColliding.value = isColliding(nextX, nextY, activeDragId.value);

  if (activeDragId.value === 'oxplorer') {
    oxplorerPos.value.x = nextX;
    oxplorerPos.value.y = nextY;
  } else {
    const targetItem = desktopStore.items.find((i) => i.id === activeDragId.value);
    if (targetItem) {
      targetItem.x = nextX;
      targetItem.y = nextY;
    }
  }
}

function onGlobalMouseUp() {
  if (activeDragId.value) {
    const id = activeDragId.value;

    if (id === 'oxplorer') {
      const freePos = findFreePosition(oxplorerPos.value.x, oxplorerPos.value.y, 'oxplorer');
      oxplorerPos.value.x = freePos.x;
      oxplorerPos.value.y = freePos.y;
    } else {
      const targetItem = desktopStore.items.find((i) => i.id === id);
      if (targetItem && targetItem.x !== undefined && targetItem.y !== undefined) {
        const freePos = findFreePosition(targetItem.x, targetItem.y, id);
        desktopStore.updatePosition(id, freePos.x, freePos.y);
      }
    }
  }

  activeDragId.value = null;
  isCurrentlyColliding.value = false;
  window.removeEventListener('mousemove', onGlobalMouseMove);
  window.removeEventListener('mouseup', onGlobalMouseUp);
}

function handleOxplorerDoubleClick() {
  if (hasMoved) return;
  winStore.openWindow('oxplorer');
}

// --- Menú Contextual del Escritorio ---
const showDesktopMenu = ref(false);
const desktopMenuPos = ref({ x: 0, y: 0 });

function onDesktopRightClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.shortcut-item')) return;
  e.preventDefault();
  closeAllMenus();
  desktopMenuPos.value = { x: e.clientX, y: e.clientY };
  showDesktopMenu.value = true;
}

function handleCreateFolder() {
  const freePos = findFreePosition(desktopMenuPos.value.x, desktopMenuPos.value.y, null);
  desktopStore.createFolder('Nueva Carpeta', null, freePos.x, freePos.y);
  closeAllMenus();
}

function handleCreateNote() {
  const freePos = findFreePosition(desktopMenuPos.value.x, desktopMenuPos.value.y, null);
  const note = desktopStore.createNote('Nueva Nota.txt', null, '', freePos.x, freePos.y);
  winStore.openWindow('onotes', { noteId: note.id });
  closeAllMenus();
}

// --- Menú Contextual de Elementos (Archivos / Carpetas) ---
const showItemMenu = ref(false);
const itemMenuPos = ref({ x: 0, y: 0 });
const selectedItem = ref<DesktopItem | null>(null);

const editingItemId = ref<string | null>(null);
const editingName = ref('');

function onItemRightClick(e: MouseEvent, item: DesktopItem) {
  e.preventDefault();
  e.stopPropagation();
  closeAllMenus();
  selectedItem.value = item;
  itemMenuPos.value = { x: e.clientX, y: e.clientY };
  showItemMenu.value = true;
}

function closeAllMenus() {
  showDesktopMenu.value = false;
  showItemMenu.value = false;
}

function handleItemDoubleClick(item: DesktopItem) {
  if (hasMoved || editingItemId.value === item.id) return;
  if (item.type === 'note' || item.type === 'oxplorer-node') {
    winStore.openWindow('onotes', { noteId: item.id });
  }
}

function handleOpenSelectedItem() {
  if (selectedItem.value) {
    handleItemDoubleClick(selectedItem.value);
  }
  closeAllMenus();
}

function startRename() {
  if (!selectedItem.value) return;
  editingItemId.value = selectedItem.value.id;
  editingName.value = selectedItem.value.name;
  closeAllMenus();

  nextTick(() => {
    const input = document.querySelector('.rename-input') as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function commitRename(id: string) {
  if (editingItemId.value === id) {
    desktopStore.renameItem(id, editingName.value);
    editingItemId.value = null;
  }
}

function cancelRename() {
  editingItemId.value = null;
}

function handleDeleteSelectedItem() {
  if (!selectedItem.value) return;
  const idToDelete = selectedItem.value.id;

  if (winStore.windows['onotes']?.data?.noteId === idToDelete) {
    winStore.closeWindow('onotes');
  }

  desktopStore.deleteItem(idToDelete);
  selectedItem.value = null;
  closeAllMenus();
}

function onDropOnFolder(e: DragEvent, folderId: string | null) {
  e.preventDefault();
  const rawData = e.dataTransfer?.getData('application/json');
  if (rawData) {
    const node = JSON.parse(rawData);
    const freePos = findFreePosition(e.clientX - ICON_WIDTH / 2, e.clientY - ICON_HEIGHT / 2, null);
    desktopStore.importFromOxplorer(node, folderId, freePos.x, freePos.y);
  }
}
</script>

<template>
  <main
    ref="workspaceRef"
    class="desktop-workspace"
    @contextmenu="onDesktopRightClick"
    @click="closeAllMenus"
    @dragover.prevent
    @drop="onDropOnFolder($event, null)"
  >
    <!-- Acceso Oxplorer Arrastrable -->
    <div
      class="shortcut-item"
      :class="{
        'is-dragging': activeDragId === 'oxplorer',
        'is-overlapping': activeDragId === 'oxplorer' && isCurrentlyColliding
      }"
      :style="{ left: `${oxplorerPos.x}px`, top: `${oxplorerPos.y}px` }"
      @mousedown="startItemDrag($event, 'oxplorer', oxplorerPos.x, oxplorerPos.y)"
      @dblclick="handleOxplorerDoubleClick"
    >
      <img :src="oxplorerSvg" alt="Oxplorer" class="shortcut-icon" draggable="false" />
      <span class="shortcut-label">Oxplorer</span>
    </div>

    <!-- Items dinámicos del escritorio Arrastrables (Carpetas y Notas) -->
    <div
      v-for="item in desktopStore.getFolderChildren(null)"
      :key="item.id"
      class="shortcut-item"
      :class="{
        'is-dragging': activeDragId === item.id,
        'is-overlapping': activeDragId === item.id && isCurrentlyColliding
      }"
      :style="{ left: `${item.x ?? 24}px`, top: `${item.y ?? 120}px` }"
      @mousedown="startItemDrag($event, item.id, item.x ?? 24, item.y ?? 120)"
      @dblclick="handleItemDoubleClick(item)"
      @contextmenu="onItemRightClick($event, item)"
      @dragover.prevent
      @drop.stop="item.type === 'folder' ? onDropOnFolder($event, item.id) : null"
    >
      <svg v-if="item.type === 'folder'" class="folder-icon" viewBox="0 0 24 24" fill="#FBBC05">
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
      </svg>
      <svg v-else class="file-icon" viewBox="0 0 24 24" fill="none" stroke="#FBBC05" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>

      <!-- Input de renombrado o nombre del archivo -->
      <template v-if="editingItemId === item.id">
        <input
          v-model="editingName"
          class="rename-input"
          type="text"
          @mousedown.stop
          @click.stop
          @keydown.enter="commitRename(item.id)"
          @keydown.esc="cancelRename"
          @blur="commitRename(item.id)"
        />
      </template>
      <span v-else class="shortcut-label">{{ item.name }}</span>
    </div>

    <!-- Menú Contextual: Escritorio vacío -->
    <div
      v-if="showDesktopMenu"
      class="context-menu"
      :style="{ left: `${desktopMenuPos.x}px`, top: `${desktopMenuPos.y}px` }"
      @click.stop
    >
      <button class="context-item" @click="handleCreateFolder">
        📁 Nueva Carpeta
      </button>
      <button class="context-item" @click="handleCreateNote">
        📝 Nueva Nota (Onotes)
      </button>
    </div>

    <!-- Menú Contextual: Item seleccionado (Archivo o Carpeta) -->
    <div
      v-if="showItemMenu"
      class="context-menu"
      :style="{ left: `${itemMenuPos.x}px`, top: `${itemMenuPos.y}px` }"
      @click.stop
    >
      <button class="context-item" @click="handleOpenSelectedItem">
        📂 Abrir
      </button>
      <button class="context-item" @click="startRename">
        ✏️ Renombrar
      </button>
      <div class="menu-divider"></div>
      <button class="context-item danger" @click="handleDeleteSelectedItem">
        🗑️ Eliminar
      </button>
    </div>

    <!-- Ventanas activas -->
    <OxplorerWindow v-if="winStore.windows['oxplorer'].isOpen" />
    <OnotesWindow v-if="winStore.windows['onotes']?.isOpen" />
    <OsheetsWindow v-if="winStore.windows['osheets']?.isOpen" />
    <OphotosWindow v-if="winStore.windows['ophotos']?.isOpen" />
  </main>
</template>

<style scoped>
.desktop-workspace {
  flex: 1;
  position: relative;
  background-image: url('@/assets/oogle.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
}

.shortcut-item {
  position: absolute;
  width: 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  touch-action: none;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.shortcut-item:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
}

.shortcut-item.is-dragging {
  opacity: 0.85;
  cursor: grabbing;
  z-index: 10;
}

/* Feedback visual cuando el icono está pisando a otro */
.shortcut-item.is-overlapping {
  background: rgba(239, 68, 68, 0.22);
  border-color: rgba(248, 113, 113, 0.75);
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
}

.shortcut-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45));
  pointer-events: none;
}

.folder-icon {
  width: 44px;
  height: 44px;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4));
  pointer-events: none;
}

.file-icon {
  width: 42px;
  height: 42px;
  background: rgba(15, 23, 42, 0.6);
  padding: 6px;
  border-radius: 6px;
  pointer-events: none;
}

.shortcut-label {
  color: #f8fafc;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  word-break: break-word;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  pointer-events: none;
}

.rename-input {
  width: 100%;
  font-size: 11px;
  font-family: inherit;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid #38bdf8;
  border-radius: 4px;
  padding: 2px 4px;
  text-align: center;
  outline: none;
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
}

/* Menús contextuales */
.context-menu {
  position: absolute;
  background: rgba(24, 24, 37, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  z-index: 10000;
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
}

.context-item:hover {
  background: rgba(66, 133, 244, 0.2);
  color: #38bdf8;
}

.context-item.danger:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 0;
}
</style>