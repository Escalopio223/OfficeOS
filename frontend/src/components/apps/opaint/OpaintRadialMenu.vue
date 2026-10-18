<script setup lang="ts">
import { computed } from 'vue';
import { usePaintStore } from '@/stores/paintStore';
import type { ToolType } from '@/types/paint';

const paintStore = usePaintStore();

interface RadialItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  active?: boolean;
  disabled?: boolean;
  color?: string;
}

const items = computed<RadialItem[]>(() => [
  {
    id: 'brush',
    label: 'Pincel',
    icon: '🖌️',
    active: paintStore.currentToolType === 'brush',
    action: () => {
      paintStore.currentToolType = 'brush';
      close();
    },
  },
  {
    id: 'eraser',
    label: 'Borrador',
    icon: '🧹',
    active: paintStore.currentToolType === 'eraser',
    action: () => {
      paintStore.currentToolType = 'eraser';
      close();
    },
  },
  {
    id: 'fill',
    label: 'Relleno',
    icon: '🪣',
    active: paintStore.currentToolType === 'fill',
    action: () => {
      paintStore.currentToolType = 'fill';
      close();
    },
  },
  {
    id: 'shape',
    label: 'Formas',
    icon: '📐',
    active: paintStore.currentToolType === 'shape',
    action: () => {
      paintStore.currentToolType = 'shape';
      close();
    },
  },
  {
    id: 'undo',
    label: 'Deshacer',
    icon: '↩️',
    disabled: !paintStore.canUndo,
    action: () => {
      paintStore.undo();
      close();
    },
  },
  {
    id: 'redo',
    label: 'Rehacer',
    icon: '↪️',
    disabled: !paintStore.canRedo,
    action: () => {
      paintStore.redo();
      close();
    },
  },
  {
    id: 'clear',
    label: 'Limpiar',
    icon: '🗑️',
    color: '#ef4444',
    action: () => {
      paintStore.clearActiveLayer();
      close();
    },
  },
]);

const RADIUS = 68; // Radio circular en píxeles

function getItemStyle(index: number, total: number) {
  // Distribuir equitativamente en 360 grados empezando arriba (-90deg)
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const x = Math.round(Math.cos(angle) * RADIUS);
  const y = Math.round(Math.sin(angle) * RADIUS);

  return {
    transform: `translate(${x}px, ${y}px)`,
    transitionDelay: `${index * 25}ms`,
  };
}

function close() {
  paintStore.isRadialMenuOpen = false;
}
</script>

<template>
  <div
    v-if="paintStore.isRadialMenuOpen"
    class="radial-backdrop"
    @click.stop="close"
    @contextmenu.prevent="close"
  >
    <div
      class="radial-menu-center"
      :style="{ left: `${paintStore.radialMenuPos.x}px`, top: `${paintStore.radialMenuPos.y}px` }"
      @click.stop
    >
      <!-- Botón central de cierre / logo -->
      <button class="center-hub-btn" title="Cerrar menú radial" @click="close">
        <span class="hub-icon">✕</span>
      </button>

      <!-- Botones orbitales radiales distribuidos trigonométricamente -->
      <button
        v-for="(item, idx) in items"
        :key="item.id"
        class="radial-item-btn"
        :class="{ 'is-active': item.active, 'is-disabled': item.disabled }"
        :style="getItemStyle(idx, items.length)"
        :disabled="item.disabled"
        :title="item.label"
        @click="item.action"
      >
        <span class="item-icon">{{ item.icon }}</span>
        <span class="item-tooltip">{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.radial-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(2px);
}

.radial-menu-center {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-hub-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(30, 41, 59, 0.95);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 2;
}

.center-hub-btn:hover {
  transform: scale(1.1);
  color: #ffffff;
  border-color: #38bdf8;
}

.hub-icon {
  font-size: 14px;
  font-weight: 700;
}

.radial-item-btn {
  position: absolute;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(16px);
  color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease, box-shadow 0.15s ease;
  z-index: 1;
}

.radial-item-btn:hover:not(:disabled) {
  background: #3b82f6;
  border-color: #60a5fa;
  transform: scale(1.2) !important;
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.6);
}

.radial-item-btn.is-active {
  background: #2563eb;
  border-color: #93c5fd;
  box-shadow: 0 0 12px rgba(37, 99, 235, 0.5);
}

.radial-item-btn.is-disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.item-icon {
  font-size: 16px;
  pointer-events: none;
}

.item-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  background: rgba(0, 0, 0, 0.85);
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.radial-item-btn:hover .item-tooltip {
  opacity: 1;
}
</style>
