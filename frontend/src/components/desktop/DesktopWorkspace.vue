<script setup lang="ts">
import { ref, nextTick, useTemplateRef } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useDesktopStore, type DesktopItem } from '@/stores/desktopStore';
import { useFileSystemStore, notifyFilesystemChanged } from '@/stores/filesystem';
import { useCustomizationStore } from '@/stores/customizationStore';
import OxplorerWindow from '@/components/apps/oxplorer/OxplorerWindow.vue';
import OnotesWindow from '@/components/apps/onotes/OnotesWindow.vue';
import OsheetsWindow from '@/components/apps/osheets/OsheetsWindow.vue';
import OpicsWindow from '@/components/apps/opics/OpicsWindow.vue';
import OpdfWindow from '@/components/apps/opdf/OpdfWindow.vue';
import OpaintWindow from '@/components/apps/opaint/OpaintWindow.vue';
import OmonitorWindow from '@/components/apps/omonitor/OmonitorWindow.vue';
import OplannerWindow from '@/components/apps/oplanner/OplannerWindow.vue';
import CustomizationWindow from '@/components/apps/customization/CustomizationWindow.vue';
import oxplorerSvg from '@/assets/oxplorer.svg';
import onotesSvg from '@/assets/onotes.svg';
import osheetsSvg from '@/assets/osheets.svg';
import opicsSvg from '@/assets/opics.svg';
import opdfSvg from '@/assets/opdf.svg';
import opaintSvg from '@/assets/opaint.svg';
import omonitorSvg from '@/assets/omonitor.svg';
import oplannerSvg from '@/assets/oplanner.svg';
import customizationSvg from '@/assets/customization.svg';
import SecurityModal from '@/components/common/SecurityModal.vue';

const winStore = useWindowStore();
const desktopStore = useDesktopStore();
const fs = useFileSystemStore();
const customStore = useCustomizationStore();
const workspaceRef = useTemplateRef<HTMLElement>('workspaceRef');

// --- CONSTANTES DE CUADRÍCULA ESTILO WINDOWS (Snap to Grid) ---
const GRID_CELL_WIDTH = 92;
const GRID_CELL_HEIGHT = 96;
const GRID_OFFSET_X = 20;
const GRID_OFFSET_Y = 20;
const ICON_WIDTH = 84;
const ICON_HEIGHT = 86;

// Definición de las aplicaciones principales del sistema en el Escritorio
interface AppShortcut {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  windowId: 'oxplorer' | 'onotes' | 'osheets' | 'opics' | 'opdf' | 'opaint' | 'omonitor' | 'oplanner' | 'customization';
}

const appShortcuts = ref<AppShortcut[]>([
  { id: 'app_oxplorer', name: 'Oxplorer', icon: oxplorerSvg, x: 20, y: 20, windowId: 'oxplorer' },
  { id: 'app_onotes', name: 'Onotes', icon: onotesSvg, x: 20, y: 116, windowId: 'onotes' },
  { id: 'app_osheets', name: 'Osheets', icon: osheetsSvg, x: 20, y: 212, windowId: 'osheets' },
  { id: 'app_opics', name: 'Opics', icon: opicsSvg, x: 20, y: 308, windowId: 'opics' },
  { id: 'app_opdf', name: 'Opdf', icon: opdfSvg, x: 20, y: 404, windowId: 'opdf' },
  { id: 'app_opaint', name: 'Opaint', icon: opaintSvg, x: 20, y: 500, windowId: 'opaint' },
  { id: 'app_omonitor', name: 'Omonitor', icon: omonitorSvg, x: 20, y: 596, windowId: 'omonitor' },
  { id: 'app_oplanner', name: 'Oplanner', icon: oplannerSvg, x: 20, y: 692, windowId: 'oplanner' },
  { id: 'app_customization', name: 'Personalización', icon: customizationSvg, x: 112, y: 20, windowId: 'customization' },
]);

// Control de arrastre y estado de celda objetivo
const activeDragId = ref<string | null>(null);
const isActuallyDragging = ref(false);
const isCurrentlyColliding = ref(false);
const hoverGridSlot = ref<{ col: number; row: number; x: number; y: number } | null>(null);

interface DropFolderTarget {
  id: string;
  name: string;
  type: 'desktop' | 'oxplorer-node' | 'oxplorer-content';
}
const hoveredDropFolder = ref<DropFolderTarget | null>(null);
let startPointerX = 0;
let startPointerY = 0;
let initialTargetX = 0;
let initialTargetY = 0;
let hasMoved = false;

// --- MOTOR DE CUADRÍCULA ESTILO WINDOWS ---
function getDesktopBounds() {
  const bounds = workspaceRef.value?.getBoundingClientRect();
  const width = bounds ? bounds.width : (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const height = bounds ? bounds.height : (typeof window !== 'undefined' ? window.innerHeight - 50 : 800);
  const maxCols = Math.max(1, Math.floor((width - GRID_OFFSET_X) / GRID_CELL_WIDTH));
  const maxRows = Math.max(1, Math.floor((height - GRID_OFFSET_Y) / GRID_CELL_HEIGHT));
  return {
    width,
    height,
    maxW: Math.max(12, width - ICON_WIDTH - 12),
    maxH: Math.max(12, height - ICON_HEIGHT - 12),
    maxCols,
    maxRows,
  };
}

// Convierte cualquier coordenada en píxeles al índice de celda y coordenadas acopladas a la cuadrícula
function snapToGridCoords(px: number, py: number): { col: number; row: number; x: number; y: number } {
  const { maxCols, maxRows } = getDesktopBounds();
  let col = Math.round((px - GRID_OFFSET_X) / GRID_CELL_WIDTH);
  let row = Math.round((py - GRID_OFFSET_Y) / GRID_CELL_HEIGHT);
  col = Math.max(0, Math.min(maxCols - 1, col));
  row = Math.max(0, Math.min(maxRows - 1, row));
  return {
    col,
    row,
    x: GRID_OFFSET_X + col * GRID_CELL_WIDTH,
    y: GRID_OFFSET_Y + row * GRID_CELL_HEIGHT,
  };
}

// Comprueba si una celda (col, row) ya está ocupada por otro icono
function isGridSlotOccupied(col: number, row: number, excludeId: string | null): boolean {
  const targetX = GRID_OFFSET_X + col * GRID_CELL_WIDTH;
  const targetY = GRID_OFFSET_Y + row * GRID_CELL_HEIGHT;

  for (const app of appShortcuts.value) {
    if (app.id !== excludeId) {
      if (Math.abs(app.x - targetX) < 40 && Math.abs(app.y - targetY) < 40) {
        return true;
      }
    }
  }

  for (const item of desktopStore.items) {
    if (item.id !== excludeId) {
      const ix = item.x ?? 20;
      const iy = item.y ?? 20;
      if (Math.abs(ix - targetX) < 40 && Math.abs(iy - targetY) < 40) {
        return true;
      }
    }
  }

  return false;
}

// Búsqueda inteligente de la celda de cuadrícula libre más cercana para evitar solapamientos
function findFreeGridSlotNear(targetCol: number, targetRow: number, excludeId: string | null): { col: number; row: number; x: number; y: number } {
  const { maxCols, maxRows } = getDesktopBounds();

  if (!isGridSlotOccupied(targetCol, targetRow, excludeId)) {
    return {
      col: targetCol,
      row: targetRow,
      x: GRID_OFFSET_X + targetCol * GRID_CELL_WIDTH,
      y: GRID_OFFSET_Y + targetRow * GRID_CELL_HEIGHT,
    };
  }

  // Búsqueda espiral discreta celda a celda
  for (let radius = 1; radius < Math.max(maxCols, maxRows) + 5; radius++) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
        const c = targetCol + dc;
        const r = targetRow + dr;
        if (c >= 0 && c < maxCols && r >= 0 && r < maxRows) {
          if (!isGridSlotOccupied(c, r, excludeId)) {
            return {
              col: c,
              row: r,
              x: GRID_OFFSET_X + c * GRID_CELL_WIDTH,
              y: GRID_OFFSET_Y + r * GRID_CELL_HEIGHT,
            };
          }
        }
      }
    }
  }

  return {
    col: targetCol,
    row: targetRow,
    x: GRID_OFFSET_X + targetCol * GRID_CELL_WIDTH,
    y: GRID_OFFSET_Y + targetRow * GRID_CELL_HEIGHT,
  };
}

function findFreeGridPosition(clickX: number, clickY: number, excludeId: string | null): { x: number; y: number } {
  const snapped = snapToGridCoords(clickX, clickY);
  const free = findFreeGridSlotNear(snapped.col, snapped.row, excludeId);
  return { x: free.x, y: free.y };
}

// Comprueba si unas coordenadas caen sobre una carpeta del escritorio para meter archivos
function findFolderUnder(x: number, y: number, excludeId: string): DesktopItem | null {
  const w = ICON_WIDTH;
  const h = ICON_HEIGHT;
  for (const item of desktopStore.items) {
    if (item.id !== excludeId && item.is_directory) {
      const ix = item.x ?? 20;
      const iy = item.y ?? 20;
      if (
        x < ix + w &&
        x + w > ix &&
        y < iy + h &&
        y + h > iy
      ) {
        return item;
      }
    }
  }
  return null;
}

// Auto-reorganizar cuadrícula completa (Estilo Windows Auto-Arrange)
async function reorganizeGrid() {
  const { maxRows } = getDesktopBounds();
  let col = 0;
  let row = 0;

  // 1. Organizar accesos de aplicaciones
  for (const app of appShortcuts.value) {
    app.x = GRID_OFFSET_X + col * GRID_CELL_WIDTH;
    app.y = GRID_OFFSET_Y + row * GRID_CELL_HEIGHT;
    desktopStore.setSystemAppPosition(app.id, app.x, app.y);
    row++;
    if (row >= maxRows) {
      row = 0;
      col++;
    }
  }

  // 2. Organizar elementos del usuario (carpetas y documentos)
  for (const item of desktopStore.items) {
    const targetX = GRID_OFFSET_X + col * GRID_CELL_WIDTH;
    const targetY = GRID_OFFSET_Y + row * GRID_CELL_HEIGHT;
    await desktopStore.updatePosition(item.id, targetX, targetY);
    row++;
    if (row >= maxRows) {
      row = 0;
      col++;
    }
  }
}

// --- EVENTOS DE ARRASTRE DE ELEMENTOS ---
function startItemDrag(e: MouseEvent, id: string, currentX: number, currentY: number) {
  if (e.button !== 0) return;
  if (editingItemId.value === id) return;

  activeDragId.value = id;
  isActuallyDragging.value = false;
  hasMoved = false;
  isCurrentlyColliding.value = false;
  hoverGridSlot.value = snapToGridCoords(currentX, currentY);
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

  if (Math.hypot(deltaX, deltaY) > 6) {
    hasMoved = true;
    isActuallyDragging.value = true;
  }

  if (!isActuallyDragging.value) return;

  const { maxW, maxH } = getDesktopBounds();
  const nextX = Math.min(Math.max(12, initialTargetX + deltaX), maxW);
  const nextY = Math.min(Math.max(12, initialTargetY + deltaY), maxH);

  // Calcular la celda magnética correspondiente en tiempo real
  const snapped = snapToGridCoords(nextX, nextY);
  hoverGridSlot.value = snapped;

  const appTarget = appShortcuts.value.find((a) => a.id === activeDragId.value);
  if (appTarget) {
    appTarget.x = nextX;
    appTarget.y = nextY;
    isCurrentlyColliding.value = isGridSlotOccupied(snapped.col, snapped.row, appTarget.id);
    return;
  }

  const targetItem = desktopStore.items.find((i) => i.id === activeDragId.value);
  if (targetItem) {
    targetItem.x = nextX;
    targetItem.y = nextY;
  }

  // Limpiar clases de hover en Oxplorer
  document.querySelectorAll('.is-drop-hover').forEach((el) => el.classList.remove('is-drop-hover'));

  // Detección debajo del cursor mediante document.elementsFromPoint
  const elements = document.elementsFromPoint(e.clientX, e.clientY);

  // A) ¿Está sobre una tarjeta de carpeta en Oxplorer?
  const oxplorerDirCard = elements.find((el) => {
    const card = el.closest('.file-card');
    return card && card.getAttribute('data-is-dir') === 'true';
  })?.closest('.file-card') as HTMLElement | undefined;

  // B) ¿Está sobre el área de contenido de Oxplorer?
  const oxplorerContent = elements.find((el) => el.closest('.glass-content'))?.closest('.glass-content') as HTMLElement | undefined;

  // C) ¿Está sobre una carpeta del propio escritorio?
  const desktopFolderTarget = findFolderUnder(nextX, nextY, activeDragId.value);

  if (oxplorerDirCard) {
    const folderId = oxplorerDirCard.getAttribute('data-node-id');
    const folderName = oxplorerDirCard.getAttribute('data-node-name') || 'Carpeta';
    if (folderId && folderId !== activeDragId.value) {
      hoveredDropFolder.value = {
        id: folderId,
        name: folderName,
        type: 'oxplorer-node',
      };
      oxplorerDirCard.classList.add('is-drop-hover');
      isCurrentlyColliding.value = false;
      return;
    }
  }

  if (oxplorerContent && fs.currentFolder) {
    if (fs.currentFolder.path !== 'root.desktop' && fs.currentFolder.id !== activeDragId.value) {
      hoveredDropFolder.value = {
        id: fs.currentFolder.id,
        name: fs.currentFolder.name || 'Oxplorer',
        type: 'oxplorer-content',
      };
      oxplorerContent.classList.add('is-drop-hover');
      isCurrentlyColliding.value = false;
      return;
    }
  }

  if (desktopFolderTarget) {
    hoveredDropFolder.value = {
      id: desktopFolderTarget.id,
      name: desktopFolderTarget.name,
      type: 'desktop',
    };
    isCurrentlyColliding.value = false;
    return;
  }

  // Sin carpeta detectada: verificar si la celda de cuadrícula está ocupada
  hoveredDropFolder.value = null;
  isCurrentlyColliding.value = isGridSlotOccupied(snapped.col, snapped.row, activeDragId.value);
}

async function onGlobalMouseUp() {
  // Detener inmediatamente los listeners antes de cualquier await para evitar condiciones de carrera
  window.removeEventListener('mousemove', onGlobalMouseMove);
  window.removeEventListener('mouseup', onGlobalMouseUp);
  document.querySelectorAll('.is-drop-hover').forEach((el) => el.classList.remove('is-drop-hover'));

  const id = activeDragId.value;
  const wasDragging = isActuallyDragging.value;
  const dropFolder = hoveredDropFolder.value;
  const originSnap = snapToGridCoords(initialTargetX, initialTargetY);

  activeDragId.value = null;
  isActuallyDragging.value = false;
  hasMoved = false;
  hoveredDropFolder.value = null;
  hoverGridSlot.value = null;
  isCurrentlyColliding.value = false;

  if (id && wasDragging) {
    const appTarget = appShortcuts.value.find((a) => a.id === id);
    if (appTarget) {
      const rawPos = snapToGridCoords(appTarget.x, appTarget.y);
      // Si la celda destino está ocupada (en rojo), no permitir colocarlo ahí: devolver a su celda de origen
      if (isGridSlotOccupied(rawPos.col, rawPos.row, appTarget.id)) {
        const safeOrigin = isGridSlotOccupied(originSnap.col, originSnap.row, appTarget.id)
          ? findFreeGridSlotNear(originSnap.col, originSnap.row, appTarget.id)
          : originSnap;
        appTarget.x = safeOrigin.x;
        appTarget.y = safeOrigin.y;
        desktopStore.setSystemAppPosition(appTarget.id, safeOrigin.x, safeOrigin.y);
      } else {
        appTarget.x = rawPos.x;
        appTarget.y = rawPos.y;
        desktopStore.setSystemAppPosition(appTarget.id, rawPos.x, rawPos.y);
      }
    } else {
      const targetItem = desktopStore.items.find((i) => i.id === id);
      if (targetItem) {
        if (dropFolder) {
          if (dropFolder.type === 'oxplorer-node' || dropFolder.type === 'oxplorer-content') {
            await fs.moveNode(id, dropFolder.id);
          } else {
            await desktopStore.moveToFolder(id, dropFolder.id);
          }
        } else {
          const rawPos = snapToGridCoords(targetItem.x ?? 20, targetItem.y ?? 20);
          // Si la celda destino está ocupada (en rojo), rechazar colocación y devolver a su celda original
          if (isGridSlotOccupied(rawPos.col, rawPos.row, id)) {
            const safeOrigin = isGridSlotOccupied(originSnap.col, originSnap.row, id)
              ? findFreeGridSlotNear(originSnap.col, originSnap.row, id)
              : originSnap;
            targetItem.x = safeOrigin.x;
            targetItem.y = safeOrigin.y;
            targetItem.pos_x = safeOrigin.x;
            targetItem.pos_y = safeOrigin.y;
            await desktopStore.updatePosition(id, safeOrigin.x, safeOrigin.y);
          } else {
            targetItem.x = rawPos.x;
            targetItem.y = rawPos.y;
            targetItem.pos_x = rawPos.x;
            targetItem.pos_y = rawPos.y;
            await desktopStore.updatePosition(id, rawPos.x, rawPos.y);
          }
        }
      }
    }
  }
}

function handleAppShortcutDoubleClick(app: AppShortcut) {
  if (isActuallyDragging.value) return;
  if (app.windowId === 'oxplorer') {
    winStore.openWindow('oxplorer', { targetPath: 'root' });
  } else if (app.windowId === 'onotes') {
    winStore.openWindow('onotes');
  } else if (app.windowId === 'osheets') {
    winStore.openWindow('osheets', { isNew: true });
  } else if (app.windowId === 'opics') {
    winStore.openWindow('opics', { mode: 'gallery' });
  } else if (app.windowId === 'opdf') {
    winStore.openWindow('opdf', { isNew: true });
  } else if (app.windowId === 'opaint') {
    winStore.openWindow('opaint', { isNew: true });
  } else if (app.windowId === 'omonitor') {
    winStore.openWindow('omonitor');
  } else if (app.windowId === 'oplanner') {
    winStore.openWindow('oplanner');
  } else if (app.windowId === 'customization') {
    winStore.openWindow('customization');
  } else {
    winStore.openWindow(app.windowId);
  }
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
  const freePos = findFreeGridPosition(desktopMenuPos.value.x, desktopMenuPos.value.y, null);
  desktopStore.createFolder('Nueva Carpeta', freePos.x, freePos.y);
  closeAllMenus();
}

function handleCreateNote() {
  const freePos = findFreeGridPosition(desktopMenuPos.value.x, desktopMenuPos.value.y, null);
  desktopStore.createNote('Nueva Nota.txt', '', freePos.x, freePos.y).then((note) => {
    if (note) {
      winStore.openWindow('onotes', { noteId: note.id });
    }
  });
  closeAllMenus();
}

function handleCreateSheet() {
  const freePos = findFreeGridPosition(desktopMenuPos.value.x, desktopMenuPos.value.y, null);
  desktopStore.createSheet(
    'Nueva Hoja.csv',
    'id,producto,precio,stock\n1,Teclado Mecánico,79.99,15\n2,Ratón Inalámbrico,39.99,28',
    freePos.x,
    freePos.y
  ).then((sheet) => {
    if (sheet) {
      winStore.openWindow('osheets', {
        name: sheet.name,
        content: sheet.content,
        fileId: sheet.id,
      });
    }
  });
  closeAllMenus();
}

function handleCreatePdf() {
  const freePos = findFreeGridPosition(desktopMenuPos.value.x, desktopMenuPos.value.y, null);
  desktopStore.createPdf('Nuevo Documento.pdf', '', freePos.x, freePos.y).then((pdf) => {
    if (pdf) {
      winStore.openWindow('opdf', {
        fileId: pdf.id,
        name: pdf.name,
        content: pdf.content,
        isNew: true,
      });
    }
  });
  closeAllMenus();
}

function handleCreatePaint() {
  const freePos = findFreeGridPosition(desktopMenuPos.value.x, desktopMenuPos.value.y, null);
  desktopStore.createPaintFile('Nuevo Dibujo.opaint', '', freePos.x, freePos.y).then((paint) => {
    if (paint) {
      winStore.openWindow('opaint', {
        fileId: paint.id,
        name: paint.name,
        content: paint.content,
        isNew: true,
      });
    }
  });
  closeAllMenus();
}

function handleCreatePlanner() {
  const freePos = findFreeGridPosition(desktopMenuPos.value.x, desktopMenuPos.value.y, null);
  desktopStore.createPlannerFile('Nuevo Proyecto.oplanner', '', freePos.x, freePos.y).then((planner) => {
    if (planner) {
      winStore.openWindow('oplanner', {
        fileId: planner.id,
        name: planner.name,
        content: planner.content,
      });
    }
  });
  closeAllMenus();
}

function handleOpenOpics() {
  winStore.openWindow('opics', { mode: 'gallery' });
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

// Modal de seguridad para carpetas protegidas
const securityModalOpen = ref(false);
const securityModalMode = ref<'unlock' | 'create-secure' | 'set-password' | 'remove-password'>('unlock');
const securityTargetFolder = ref<DesktopItem | null>(null);
const securityError = ref('');
const securityLoading = ref(false);

function openUnlockModal(folder: DesktopItem) {
  securityTargetFolder.value = folder;
  securityModalMode.value = 'unlock';
  securityError.value = '';
  securityModalOpen.value = true;
}

function handleCreateSecureFolder() {
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
      winStore.openWindow('oxplorer', { targetPath: folder.path, targetFolder: folder });
    } else {
      securityError.value = 'Contraseña incorrecta';
    }
  } else if (securityModalMode.value === 'create-secure') {
    const freePos = findFreeGridPosition(desktopMenuPos.value.x, desktopMenuPos.value.y, null);
    securityLoading.value = true;
    await desktopStore.createFolder(payload.name, freePos.x, freePos.y, payload.password);
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
      await desktopStore.fetchDesktopItems();
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
      await desktopStore.fetchDesktopItems();
    } else {
      securityError.value = res.error || 'Contraseña incorrecta';
    }
  }
}

function handleItemDoubleClick(item: DesktopItem) {
  if (isActuallyDragging.value || editingItemId.value === item.id) return;

  // Si es carpeta, verificar si está protegida (siempre pide contraseña en cada entrada)
  if (item.is_directory) {
    if (item.is_protected) {
      openUnlockModal(item);
      return;
    }
    winStore.openWindow('oxplorer', { targetPath: item.path, targetFolder: item });
    return;
  }

  // Notificar al backend sobre apertura de archivo (telemetría reactiva en tiempo real)
  fs.notifyFileOpened(item.name);

  const ext = item.name.split('.').pop()?.toUpperCase() || '';

  if (ext === 'CSV') {
    winStore.openWindow('osheets', {
      name: item.name,
      content: item.content,
      fileId: item.id,
    });
    return;
  }

  if (ext === 'JPG' || ext === 'PNG' || ext === 'JPEG' || ext === 'WEBP' || ext === 'SVG') {
    winStore.openWindow('opics', {
      name: item.name,
      url: fs.getFileRawUrl(item.id),
      meta: `${item.name} • ${ext}`,
      imageId: item.id,
    });
    return;
  }

  if (ext === 'PDF') {
    winStore.openWindow('opdf', {
      fileId: item.id,
      name: item.name,
      content: item.content,
    });
    return;
  }

  if (ext === 'OPAINT') {
    winStore.openWindow('opaint', {
      fileId: item.id,
      name: item.name,
      content: item.content,
    });
    return;
  }

  if (ext === 'OPLANNER') {
    winStore.openWindow('oplanner', {
      fileId: item.id,
      name: item.name,
      content: item.content,
    });
    return;
  }

  // Archivo de texto/nota general
  winStore.openWindow('onotes', { noteId: item.id, name: item.name, content: item.content });
}

function handleDownloadSelectedItem() {
  if (!selectedItem.value || selectedItem.value.is_directory) return;
  fs.downloadFile(selectedItem.value);
  closeAllMenus();
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
  if (winStore.windows['osheets']?.data?.fileId === idToDelete) {
    winStore.closeWindow('osheets');
  }

  desktopStore.deleteItem(idToDelete);
  selectedItem.value = null;
  closeAllMenus();
}

// Drop en el fondo del escritorio (mueve el archivo/carpeta a root.desktop con coordenadas libres)
async function onDropOnDesktop(e: DragEvent) {
  e.preventDefault();
  const rawData = e.dataTransfer?.getData('application/json');
  if (rawData) {
    try {
      const node = JSON.parse(rawData);
      const freePos = findFreeGridPosition(e.clientX - ICON_WIDTH / 2, e.clientY - ICON_HEIGHT / 2, null);
      await fetch(`/api/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetFolderPath: 'root.desktop',
          pos_x: freePos.x,
          pos_y: freePos.y,
        }),
      });
      notifyFilesystemChanged();
    } catch {}
  }
}

// Drop sobre un icono que sea carpeta en el escritorio
async function onDropOnFolderIcon(e: DragEvent, targetFolderId: string) {
  e.preventDefault();
  e.stopPropagation();
  const rawData = e.dataTransfer?.getData('application/json');
  if (rawData) {
    try {
      const node = JSON.parse(rawData);
      if (node.id === targetFolderId) return;
      await fetch(`/api/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetFolderId,
          pos_x: null,
          pos_y: null,
        }),
      });
      notifyFilesystemChanged();
    } catch {}
  }
}
</script>

<template>
  <main
    ref="workspaceRef"
    class="desktop-workspace"
    :style="customStore.wallpaperStyle"
    @contextmenu="onDesktopRightClick"
    @click="closeAllMenus"
    @dragover.prevent
    @drop="onDropOnDesktop($event)"
  >
    <!-- Indicador de cuadrícula magnética estilo Windows durante el arrastre -->
    <div
      v-if="isActuallyDragging && hoverGridSlot && !hoveredDropFolder"
      class="grid-ghost-cell"
      :class="{ 'is-invalid': isCurrentlyColliding }"
      :style="{ left: `${hoverGridSlot.x}px`, top: `${hoverGridSlot.y}px` }"
    ></div>
    <!-- Accesos Directos de Aplicaciones del Sistema (Oxplorer, Onotes, Osheets, Opics) -->
    <div
      v-for="app in appShortcuts"
      :key="app.id"
      class="shortcut-item"
      :class="{
        'is-dragging': isActuallyDragging && activeDragId === app.id,
        'is-overlapping': isActuallyDragging && activeDragId === app.id && isCurrentlyColliding
      }"
      :style="{ left: `${app.x}px`, top: `${app.y}px` }"
      @mousedown="startItemDrag($event, app.id, app.x, app.y)"
      @dragstart.prevent
      @dblclick="handleAppShortcutDoubleClick(app)"
    >
      <img :src="app.icon" :alt="app.name" class="shortcut-icon" draggable="false" />
      <span class="shortcut-label">{{ app.name }}</span>
    </div>

    <!-- Items dinámicos del escritorio Arrastrables (Carpetas y Notas de root.desktop) -->
    <div
      v-for="item in desktopStore.items"
      :key="item.id"
      class="shortcut-item"
      :class="{
        'is-dragging': isActuallyDragging && activeDragId === item.id,
        'is-overlapping': isActuallyDragging && activeDragId === item.id && isCurrentlyColliding && !hoveredDropFolder,
        'is-drop-target': hoveredDropFolder?.id === item.id && hoveredDropFolder?.type === 'desktop'
      }"
      :data-id="item.id"
      :data-is-dir="item.is_directory ? 'true' : 'false'"
      :style="{ left: `${item.x ?? 24}px`, top: `${item.y ?? 120}px` }"
      @mousedown="startItemDrag($event, item.id, item.x ?? 24, item.y ?? 120)"
      @dragstart.prevent
      @dblclick="handleItemDoubleClick(item)"
      @contextmenu="onItemRightClick($event, item)"
      @dragover.prevent
      @drop.stop="item.is_directory ? onDropOnFolderIcon($event, item.id) : null"
    >
      <!-- Indicador en la carpeta receptora -->
      <div v-if="hoveredDropFolder?.id === item.id && hoveredDropFolder?.type === 'desktop'" class="folder-target-indicator">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="7 10 12 15 17 10" />
        </svg>
      </div>

      <!-- Badge con icono de inserción en el archivo que se está arrastrando -->
      <div v-if="isActuallyDragging && activeDragId === item.id && hoveredDropFolder" class="folder-insert-badge">
        <svg class="folder-insert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 3v11m0 0l-4-4m4 4l4-4" />
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span>Meter en {{ hoveredDropFolder.name }}</span>
      </div>

      <div v-if="item.is_directory" class="folder-icon-wrapper">
        <svg class="folder-icon" viewBox="0 0 24 24" fill="#FBBC05">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
        <div v-if="item.is_protected" class="padlock-badge" title="Carpeta protegida con contraseña">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="#0f172a"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
      </div>
      <img
        v-else-if="item.name.toLowerCase().endsWith('.oplanner')"
        :src="oplannerSvg"
        alt="Oplanner"
        class="shortcut-icon"
      />
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
      <button class="context-item" @click="handleCreateSecureFolder">
        🔒 Nueva Carpeta Segura
      </button>
      <button class="context-item" @click="handleCreateNote">
        📝 Nueva Nota (Onotes)
      </button>
      <button class="context-item" @click="handleCreateSheet">
        📊 Nueva Hoja de Cálculo (Osheets)
      </button>
      <button class="context-item" @click="handleCreatePdf">
        📄 Nuevo Documento PDF (Opdf)
      </button>
      <button class="context-item" @click="handleCreatePaint">
        🎨 Nuevo Dibujo (Opaint)
      </button>
      <button class="context-item" @click="handleCreatePlanner">
        📋 Nuevo Proyecto (Oplanner)
      </button>
      <button class="context-item" @click="handleOpenOpics">
        🖼️ Galería de Fotos (Opics)
      </button>
      <div class="menu-divider"></div>
      <button class="context-item" @click="reorganizeGrid(); closeAllMenus();">
        📐 Auto-organizar cuadrícula
      </button>
      <button class="context-item" @click="winStore.openWindow('customization'); closeAllMenus();">
        🎨 Personalizar
      </button>
      <div class="menu-divider"></div>
      <button class="context-item" @click="winStore.openWindow('omonitor'); closeAllMenus();">
        📊 Administrador de tareas (Omonitor)
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
      <button v-if="!selectedItem?.is_directory" class="context-item" @click="handleDownloadSelectedItem">
        ⬇️ Descargar
      </button>
      <template v-if="selectedItem?.is_directory">
        <button v-if="selectedItem?.is_protected" class="context-item" @click="handleRemoveProtection">
          🔓 Quitar Protección
        </button>
        <button v-else class="context-item" @click="handleSetProtection">
          🔒 Proteger con contraseña
        </button>
      </template>
      <button class="context-item" @click="startRename">
        ✏️ Renombrar
      </button>
      <div class="menu-divider"></div>
      <button class="context-item danger" @click="handleDeleteSelectedItem">
        🗑️ Eliminar
      </button>
    </div>

    <!-- Modal de Seguridad para Carpetas -->
    <SecurityModal
      :is-open="securityModalOpen"
      :mode="securityModalMode"
      :folder-name="securityTargetFolder?.name || ''"
      :error-message="securityError"
      :loading="securityLoading"
      @close="securityModalOpen = false"
      @confirm="onSecurityConfirm"
    />

    <!-- Ventanas activas -->
    <OxplorerWindow v-if="winStore.windows['oxplorer']?.isOpen" />
    <OnotesWindow v-if="winStore.windows['onotes']?.isOpen" />
    <OsheetsWindow v-if="winStore.windows['osheets']?.isOpen" />
    <OpicsWindow v-if="winStore.windows['opics']?.isOpen" />
    <OpdfWindow v-if="winStore.windows['opdf']?.isOpen" />
    <OpaintWindow v-if="winStore.windows['opaint']?.isOpen" />
    <OmonitorWindow v-if="winStore.windows['omonitor']?.isOpen" />
    <OplannerWindow v-if="winStore.windows['oplanner']?.isOpen" />
    <CustomizationWindow v-if="winStore.windows['customization']?.isOpen" @reorganize-grid="reorganizeGrid" />
  </main>
</template>

<style scoped>
.desktop-workspace {
  flex: 1;
  position: relative;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
  transition: background 0.25s ease-out;
}

.grid-ghost-cell {
  position: absolute;
  width: 84px;
  height: 86px;
  border-radius: 8px;
  border: 2px dashed rgba(56, 189, 248, 0.7);
  background: rgba(56, 189, 248, 0.12);
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.25);
  pointer-events: none;
  z-index: 5;
  transition: all 0.08s ease-out;
}

.grid-ghost-cell.is-invalid {
  border-color: rgba(248, 113, 113, 0.85);
  background: rgba(239, 68, 68, 0.16);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
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
  opacity: 0.95;
  cursor: grabbing;
  z-index: 99999 !important;
  pointer-events: none;
}

/* Feedback visual cuando el icono está pisando a otro (colisión inválida) */
.shortcut-item.is-overlapping {
  background: rgba(239, 68, 68, 0.22);
  border-color: rgba(248, 113, 113, 0.75);
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
}

/* Carpeta receptora activa en el escritorio */
.shortcut-item.is-drop-target {
  background: rgba(56, 189, 248, 0.22) !important;
  border: 2px dashed #38bdf8 !important;
  transform: scale(1.08);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.45);
}

.folder-target-indicator {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 22px;
  background: #0284c7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: bounceDown 0.6s infinite alternate ease-in-out;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  z-index: 5;
}

.folder-target-indicator svg {
  width: 14px;
  height: 14px;
  stroke: #ffffff;
}

@keyframes bounceDown {
  from { transform: translateX(-50%) translateY(0); }
  to { transform: translateX(-50%) translateY(4px); }
}

/* Badge flotante en el icono arrastrado */
.folder-insert-badge {
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(14, 165, 233, 0.95);
  backdrop-filter: blur(8px);
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), 0 0 12px rgba(56, 189, 248, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.35);
  pointer-events: none;
  animation: fadeIn 0.15s ease-out;
  z-index: 100000;
}

.folder-insert-icon {
  width: 13px;
  height: 13px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.shortcut-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45));
  pointer-events: none;
}

.folder-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.padlock-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
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
  width: 11px;
  height: 11px;
  color: #fbbf24;
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