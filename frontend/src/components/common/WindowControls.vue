<script setup lang="ts">
import { useWindowStore, type WindowId } from '@/stores/windowStore';

const props = defineProps<{
  windowId: WindowId;
  isMaximized: boolean;
}>();

const emit = defineEmits<{
  (e: 'minimize'): void;
  (e: 'maximize'): void;
  (e: 'close'): void;
}>();

const winStore = useWindowStore();

function handleMinimize() {
  emit('minimize');
  winStore.toggleMinimize(props.windowId);
}

function handleMaximize() {
  emit('maximize');
  winStore.toggleMaximize(props.windowId);
}

function handleClose() {
  emit('close');
  winStore.closeWindow(props.windowId);
}
</script>

<template>
  <div class="window-controls-group" @mousedown.stop @dblclick.stop>
    <!-- Minimizar -->
    <button
      class="win-btn minimize"
      title="Minimizar"
      aria-label="Minimizar"
      @click.stop="handleMinimize"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>

    <!-- Maximizar / Restaurar -->
    <button
      class="win-btn maximize"
      :title="isMaximized ? 'Restaurar' : 'Maximizar'"
      :aria-label="isMaximized ? 'Restaurar' : 'Maximizar'"
      @click.stop="handleMaximize"
    >
      <svg v-if="isMaximized" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="5" y="7" width="11" height="11" rx="1.5" />
        <path d="M8 7V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    </button>

    <!-- Cerrar -->
    <button
      class="win-btn close"
      title="Cerrar"
      aria-label="Cerrar"
      @click.stop="handleClose"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.window-controls-group {
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.win-btn {
  width: 28px;
  height: 26px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.win-btn svg {
  width: 12px;
  height: 12px;
}

.win-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.win-btn.close:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}
</style>
