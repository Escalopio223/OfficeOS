<script setup lang="ts">
import oogleLogoSvg from '@/assets/oogle-logo.svg';
import oxplorerSvg from '@/assets/oxplorer.svg';
import { useWindowStore } from '@/stores/windowStore';

const winStore = useWindowStore();

defineEmits<{
  (e: 'toggle-start'): void;
}>();
</script>

<template>
  <footer class="taskbar">
    <div class="taskbar-left">
      <button class="oogle-start-btn" aria-label="Menú Oogle" @click="$emit('toggle-start')">
        <img :src="oogleLogoSvg" alt="Oogle" class="oogle-btn-icon" />
      </button>

      <!-- Apps abiertas en la barra de tareas -->
      <div class="taskbar-apps">
        <button
          v-for="win in winStore.windows"
          v-show="win.isOpen"
          :key="win.id"
          class="taskbar-item"
          :class="{ active: !win.isMinimized }"
          @click="winStore.toggleMinimize(win.id)"
        >
          <img :src="oxplorerSvg" alt="Oxplorer" class="app-icon" />
          <span>{{ win.title }}</span>
        </button>
      </div>
    </div>

    <div class="taskbar-status">
      <slot name="tray"></slot>
    </div>
  </footer>
</template>

<style scoped>
.taskbar {
  height: 50px;
  background-color: #11111b;
  border-top: 1px solid #313244;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  color: #a6adc8;
  font-size: 12px;
  user-select: none;
}

.taskbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.oogle-start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s ease;
}

.oogle-start-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: scale(1.08);
  box-shadow: 0 0 10px rgba(66, 133, 244, 0.4);
}

.oogle-btn-icon {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.taskbar-apps {
  display: flex;
  gap: 6px;
}

.taskbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 6px;
  color: #cdd6f4;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}

.taskbar-item:hover {
  background: rgba(255, 255, 255, 0.12);
}

.taskbar-item.active {
  background: rgba(255, 255, 255, 0.18);
  border-color: #38bdf8;
}

.app-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.taskbar-status {
  font-size: 11px;
  color: #6c7086;
}
</style>