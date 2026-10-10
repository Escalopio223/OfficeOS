<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import OxplorerWindow from '@/components/apps/oxplorer/OxplorerWindow.vue';
import oxplorerSvg from '@/assets/oxplorer.svg';

const winStore = useWindowStore();
const workspaceRef = useTemplateRef<HTMLElement>('workspaceRef');

const iconPos = ref({ x: 24, y: 24 });
let isDraggingIcon = false;
let startPointerX = 0;
let startPointerY = 0;
let initialIconX = 0;
let initialIconY = 0;
let hasMoved = false;

// Dimensiones aproximadas del shortcut para calcular bordes
const ICON_WIDTH = 76;
const ICON_HEIGHT = 80;

function onIconPointerDown(e: MouseEvent) {
  if (e.button !== 0) return;

  isDraggingIcon = true;
  hasMoved = false;
  startPointerX = e.clientX;
  startPointerY = e.clientY;
  initialIconX = iconPos.value.x;
  initialIconY = iconPos.value.y;

  window.addEventListener('mousemove', onIconPointerMove);
  window.addEventListener('mouseup', onIconPointerUp);
}

function onIconPointerMove(e: MouseEvent) {
  if (!isDraggingIcon) return;

  const deltaX = e.clientX - startPointerX;
  const deltaY = e.clientY - startPointerY;

  if (Math.hypot(deltaX, deltaY) > 3) {
    hasMoved = true;
  }

  // Obtener los límites dinámicos del área de trabajo
  const bounds = workspaceRef.value?.getBoundingClientRect();
  const maxW = bounds ? bounds.width - ICON_WIDTH - 8 : 1000;
  const maxH = bounds ? bounds.height - ICON_HEIGHT - 8 : 600;

  // Clampear entre margen superior/izquierdo y el borde de la barra de tareas
  iconPos.value.x = Math.min(Math.max(12, initialIconX + deltaX), maxW);
  iconPos.value.y = Math.min(Math.max(12, initialIconY + deltaY), maxH);
}

function onIconPointerUp() {
  isDraggingIcon = false;
  window.removeEventListener('mousemove', onIconPointerMove);
  window.removeEventListener('mouseup', onIconPointerUp);
}

function handleDoubleClick() {
  if (hasMoved) return;
  winStore.openWindow('oxplorer');
}
</script>

<template>
  <main ref="workspaceRef" class="desktop-workspace">
    <!-- Icono arrastrable de Oxplorer con colisión -->
    <div
      class="shortcut-item"
      :class="{ 'is-dragging': isDraggingIcon }"
      :style="{ left: `${iconPos.x}px`, top: `${iconPos.y}px` }"
      @mousedown="onIconPointerDown"
      @dblclick="handleDoubleClick"
    >
      <img :src="oxplorerSvg" alt="Oxplorer" class="shortcut-icon" draggable="false" />
      <span class="shortcut-label">Oxplorer</span>
    </div>

    <!-- Ventana activa de Oxplorer -->
    <OxplorerWindow v-if="winStore.windows['oxplorer'].isOpen" />
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
  width: 76px;
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
  transition: background 0.15s ease, border-color 0.15s ease;
}

.shortcut-item:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
}

.shortcut-item.is-dragging {
  opacity: 0.85;
  cursor: grabbing;
  z-index: 5;
}

.shortcut-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45));
  pointer-events: none;
}

.shortcut-label {
  color: #f8fafc;
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  word-break: break-word;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  pointer-events: none;
}
</style>