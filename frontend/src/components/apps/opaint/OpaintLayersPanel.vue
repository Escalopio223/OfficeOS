<script setup lang="ts">
import { computed } from 'vue';
import { usePaintStore } from '@/stores/paintStore';
import type { PaintLayer } from '@/types/paint';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const paintStore = usePaintStore();

// Las capas se muestran con la de mayor zIndex arriba (convención estándar de diseño)
const displayLayers = computed(() => {
  return [...paintStore.layers].sort((a, b) => b.zIndex - a.zIndex);
});

function handleAddLayer() {
  paintStore.addLayer();
}

function handleSelectLayer(layer: PaintLayer) {
  paintStore.activeLayerId = layer.id;
}

function toggleVisibility(layer: PaintLayer) {
  paintStore.setLayerVisibility(layer.id, !layer.visible);
}

function handleOpacityChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const val = parseFloat(target.value) / 100;
  if (paintStore.activeLayer) {
    paintStore.setLayerOpacity(paintStore.activeLayer.id, val);
  }
}
</script>

<template>
  <transition name="slide-panel">
    <aside v-if="isOpen" class="opaint-layers-panel glass-panel">
      <!-- Encabezado del panel -->
      <div class="panel-header">
        <div class="panel-title-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="header-icon">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span class="panel-title">Capas ({{ paintStore.layers.length }})</span>
        </div>
        <div class="header-actions">
          <button class="icon-action-btn" title="Añadir nueva capa" @click="handleAddLayer">
            +
          </button>
          <button class="icon-action-btn" title="Cerrar panel" @click="emit('close')">
            ✕
          </button>
        </div>
      </div>

      <!-- Slider de opacidad de la capa activa -->
      <div v-if="paintStore.activeLayer" class="layer-opacity-section">
        <div class="opacity-label-row">
          <span class="caption">Opacidad de capa</span>
          <span class="value">{{ Math.round((paintStore.activeLayer.opacity ?? 1) * 100) }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          :value="Math.round((paintStore.activeLayer.opacity ?? 1) * 100)"
          class="opacity-slider"
          @input="handleOpacityChange"
        />
      </div>

      <!-- Lista de capas -->
      <div class="layers-list">
        <div
          v-for="layer in displayLayers"
          :key="layer.id"
          class="layer-item-card"
          :class="{
            'is-active': layer.id === paintStore.activeLayerId,
            'is-hidden': !layer.visible,
          }"
          @click="handleSelectLayer(layer)"
        >
          <!-- Toggle de Visibilidad -->
          <button
            class="visibility-btn"
            :title="layer.visible ? 'Ocultar capa' : 'Mostrar capa'"
            @click.stop="toggleVisibility(layer)"
          >
            <span v-if="layer.visible">👁️</span>
            <span v-else class="eye-hidden">🕶️</span>
          </button>

          <!-- Nombre de la capa -->
          <span class="layer-name">{{ layer.name }}</span>

          <!-- Acciones de orden y eliminación -->
          <div class="layer-item-actions">
            <button
              class="mini-btn"
              title="Subir nivel"
              @click.stop="paintStore.reorderLayer(layer.id, 'up')"
            >
              ▲
            </button>
            <button
              class="mini-btn"
              title="Bajar nivel"
              @click.stop="paintStore.reorderLayer(layer.id, 'down')"
            >
              ▼
            </button>
            <button
              v-if="paintStore.layers.length > 1"
              class="mini-btn delete-btn"
              title="Eliminar capa"
              @click.stop="paintStore.removeLayer(layer.id)"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </aside>
  </transition>
</template>

<style scoped>
.opaint-layers-panel {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 260px;
  max-height: calc(100% - 100px);
  display: flex;
  flex-direction: column;
  background: rgba(18, 22, 34, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 45;
  user-select: none;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f5f9;
  font-size: 13px;
  font-weight: 700;
}

.header-icon {
  width: 16px;
  height: 16px;
  color: #818cf8;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* Opacity slider section */
.layer-opacity-section {
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.15);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.opacity-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 6px;
}

.opacity-slider {
  width: 100%;
  accent-color: #6366f1;
  cursor: pointer;
}

/* Layers list */
.layers-list {
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
}

.layer-item-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.layer-item-card:hover {
  background: rgba(255, 255, 255, 0.08);
}

.layer-item-card.is-active {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
}

.layer-item-card.is-hidden {
  opacity: 0.45;
}

.visibility-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 2px;
}

.layer-name {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-item-actions {
  display: flex;
  gap: 3px;
}

.mini-btn {
  background: rgba(255, 255, 255, 0.06);
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 10px;
  padding: 2px 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mini-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

/* Transición fluida */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
  transform: translateX(18px) scale(0.96);
}
</style>
