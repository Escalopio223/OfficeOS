<script setup lang="ts">
import { ref } from 'vue';
import { usePaintStore } from '@/stores/paintStore';
import type { ToolType, ShapeType } from '@/types/paint';

defineProps<{
  layersPanelOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggleLayers'): void;
  (e: 'openExport'): void;
}>();

const paintStore = usePaintStore();

const showShapesMenu = ref(false);
const showStrokeMenu = ref(false);

const shapeOptions: { type: ShapeType; label: string; icon: string }[] = [
  { type: 'rect', label: 'Rectángulo', icon: '▢' },
  { type: 'ellipse', label: 'Círculo / Elipse', icon: '○' },
  { type: 'line', label: 'Línea', icon: '╱' },
  { type: 'arrow', label: 'Flecha', icon: '➜' },
];

function selectTool(type: ToolType) {
  paintStore.currentToolType = type;
  if (type === 'shape') {
    showShapesMenu.value = !showShapesMenu.value;
  } else {
    showShapesMenu.value = false;
  }
}

function selectShape(shape: ShapeType) {
  paintStore.brushSettings.shape = shape;
  paintStore.currentToolType = 'shape';
  showShapesMenu.value = false;
}
</script>

<template>
  <nav class="opaint-floating-dock glass-island">
    <!-- Grupo de herramientas principales -->
    <div class="dock-tools-group">
      <button
        class="dock-btn"
        :class="{ 'is-active': paintStore.currentToolType === 'brush' }"
        title="Pincel (B)"
        @click="selectTool('brush')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="tool-icon">
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
        </svg>
      </button>

      <button
        class="dock-btn"
        :class="{ 'is-active': paintStore.currentToolType === 'eraser' }"
        title="Borrador (E)"
        @click="selectTool('eraser')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="tool-icon">
          <path d="M7 21L20.5 7.5a2.121 2.121 0 0 0 0-3l-2.5-2.5a2.121 2.121 0 0 0-3 0L2 15l5 6z" />
          <path d="M18 10l-5-5" />
          <path d="M2 21h16" />
        </svg>
      </button>

      <!-- Selector de Formas Geométricas -->
      <div class="popover-wrapper">
        <button
          class="dock-btn"
          :class="{ 'is-active': paintStore.currentToolType === 'shape' }"
          title="Formas Geométricas (U)"
          @click="selectTool('shape')"
        >
          <span class="shape-indicator-glyph">{{ shapeOptions.find(s => s.type === paintStore.brushSettings.shape)?.icon || '▢' }}</span>
        </button>

        <transition name="pop-spring">
          <div v-if="showShapesMenu" class="shapes-flyout glass-card">
            <button
              v-for="s in shapeOptions"
              :key="s.type"
              class="shape-item-btn"
              :class="{ 'is-selected': paintStore.brushSettings.shape === s.type }"
              @click="selectShape(s.type)"
            >
              <span class="glyph">{{ s.icon }}</span>
              <span>{{ s.label }}</span>
            </button>
            <div class="fill-toggle-row">
              <label class="toggle-checkbox">
                <input v-model="paintStore.brushSettings.useFill" type="checkbox" />
                <span>Rellenar forma</span>
              </label>
            </div>
          </div>
        </transition>
      </div>

      <button
        class="dock-btn"
        :class="{ 'is-active': paintStore.currentToolType === 'fill' }"
        title="Bote de Pintura (G)"
        @click="selectTool('fill')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="tool-icon">
          <path d="M19 11l-8-8-8 8a6 6 0 0 0 8.5 8.5L19 11z" />
          <path d="M5 2l5 5" />
          <path d="M2 13h15" />
          <path d="M22 20a2 2 0 1 1-4 0c0-1.6 2-3 2-3s2 1.4 2 3z" />
        </svg>
      </button>

      <button
        class="dock-btn"
        :class="{ 'is-active': paintStore.currentToolType === 'select' }"
        title="Selección Rectangular (S)"
        @click="selectTool('select')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="4 3" class="tool-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </button>

      <button
        class="dock-btn"
        :class="{ 'is-active': paintStore.currentToolType === 'pan' }"
        title="Mover lienzo / Pan (Espacio)"
        @click="selectTool('pan')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="tool-icon">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M6 14v-2a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6a7 7 0 0 0 7 7h3a7 7 0 0 0 7-7v-4" />
        </svg>
      </button>
    </div>

    <div class="dock-divider" />

    <!-- Control de color y grosor -->
    <div class="dock-properties-group">
      <div class="color-picker-wrapper" title="Color de trazo">
        <input
          v-model="paintStore.brushSettings.color"
          type="color"
          class="color-native-input"
        />
        <div class="color-preview-orb" :style="{ backgroundColor: paintStore.brushSettings.color }" />
      </div>

      <div v-if="paintStore.brushSettings.useFill" class="color-picker-wrapper" title="Color de relleno">
        <input
          v-model="paintStore.brushSettings.fillColor"
          type="color"
          class="color-native-input"
        />
        <div class="color-preview-orb fill-orb" :style="{ backgroundColor: paintStore.brushSettings.fillColor }" />
      </div>

      <!-- Selector de Grosor -->
      <div class="popover-wrapper">
        <button
          class="stroke-trigger-btn"
          title="Grosor de trazo"
          @click="showStrokeMenu = !showStrokeMenu"
        >
          <span class="stroke-dot" :style="{ width: `${Math.min(20, Math.max(4, paintStore.brushSettings.strokeWidth))}px`, height: `${Math.min(20, Math.max(4, paintStore.brushSettings.strokeWidth))}px` }" />
          <span class="stroke-label">{{ paintStore.brushSettings.strokeWidth }}px</span>
        </button>

        <transition name="pop-spring">
          <div v-if="showStrokeMenu" class="stroke-flyout glass-card">
            <span class="flyout-title">Grosor de trazo</span>
            <input
              v-model.number="paintStore.brushSettings.strokeWidth"
              type="range"
              min="1"
              max="80"
              class="dock-slider"
            />
            <div class="stroke-presets">
              <button
                v-for="size in [2, 6, 12, 24, 48]"
                :key="size"
                class="size-preset-pill"
                :class="{ 'is-active': paintStore.brushSettings.strokeWidth === size }"
                @click="paintStore.brushSettings.strokeWidth = size"
              >
                {{ size }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div class="dock-divider" />

    <!-- Acciones de historial y capas -->
    <div class="dock-actions-group">
      <button
        class="dock-btn"
        :disabled="!paintStore.canUndo"
        title="Deshacer (Ctrl+Z)"
        @click="paintStore.undo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="tool-icon">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </button>

      <button
        class="dock-btn"
        :disabled="!paintStore.canRedo"
        title="Rehacer (Ctrl+Y)"
        @click="paintStore.redo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="tool-icon">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
      </button>

      <button
        class="dock-btn"
        :class="{ 'is-active': layersPanelOpen }"
        title="Gestor de Capas"
        @click="emit('toggleLayers')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="tool-icon">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        <span class="layer-count-badge">{{ paintStore.layers.length }}</span>
      </button>

      <button
        class="dock-btn export-highlight-btn"
        title="Exportar imagen o guardar proyecto"
        @click="emit('openExport')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="tool-icon">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.opaint-floating-dock {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(18, 22, 34, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 28px;
  box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 50;
  user-select: none;
}

.dock-tools-group,
.dock-properties-group,
.dock-actions-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dock-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 4px;
}

.dock-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: transparent;
  border: 1px solid transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dock-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transform: translateY(-2px);
}

.dock-btn.is-active {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 0 14px rgba(59, 130, 246, 0.5);
  transform: translateY(-2px);
}

.dock-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.tool-icon {
  width: 18px;
  height: 18px;
}

.shape-indicator-glyph {
  font-size: 18px;
  font-weight: 700;
}

.layer-count-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #6366f1;
  color: #ffffff;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 8px;
}

.export-highlight-btn {
  background: rgba(16, 185, 129, 0.16);
  color: #34d399;
}

.export-highlight-btn:hover {
  background: rgba(16, 185, 129, 0.3);
  color: #ffffff;
}

/* Color orb preview */
.color-picker-wrapper {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-native-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.color-preview-orb {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  transition: transform 0.15s ease;
}

.color-picker-wrapper:hover .color-preview-orb {
  transform: scale(1.15);
}

.fill-orb {
  border-style: dashed;
}

/* Selector de grosor */
.stroke-trigger-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 10px;
  border-radius: 16px;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stroke-trigger-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.stroke-dot {
  background: #ffffff;
  border-radius: 50%;
  display: inline-block;
}

/* Flyouts flotantes contextuales */
.popover-wrapper {
  position: relative;
}

.shapes-flyout,
.stroke-flyout {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(23, 27, 40, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(24px);
  padding: 10px;
  border-radius: 16px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
  z-index: 60;
}

.shape-item-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.shape-item-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.shape-item-btn.is-selected {
  background: #3b82f6;
  color: #ffffff;
}

.shape-item-btn .glyph {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.fill-toggle-row {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.toggle-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
  cursor: pointer;
}

.flyout-title {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 4px;
}

.dock-slider {
  width: 100%;
  accent-color: #3b82f6;
  cursor: pointer;
}

.stroke-presets {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.size-preset-pill {
  flex: 1;
  padding: 4px 0;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s ease;
}

.size-preset-pill:hover,
.size-preset-pill.is-active {
  background: #3b82f6;
  color: #ffffff;
}

/* Transiciones fluidas */
.pop-spring-enter-active,
.pop-spring-leave-active {
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.18s ease;
}

.pop-spring-enter-from,
.pop-spring-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px) scale(0.95);
}
</style>
