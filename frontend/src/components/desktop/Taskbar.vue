<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import oogleLogoSvg from '@/assets/oogle-logo.svg';
import oxplorerSvg from '@/assets/oxplorer.svg';
import onotesSvg from '@/assets/onotes.svg';
import osheetsSvg from '@/assets/osheets.svg';
import opicsSvg from '@/assets/opics.svg';
import opdfSvg from '@/assets/opdf.svg';
import opaintSvg from '@/assets/opaint.svg';
import omonitorSvg from '@/assets/omonitor.svg';
import { useWindowStore } from '@/stores/windowStore';

const winStore = useWindowStore();

defineEmits<{
  (e: 'toggle-start'): void;
}>();

const contextMenuVisible = ref(false);
const contextMenuPos = ref({ x: 0, y: 0 });

function onTaskbarContextMenu(e: MouseEvent) {
  contextMenuPos.value = {
    x: Math.min(e.clientX, window.innerWidth - 240),
    y: Math.max(10, window.innerHeight - 130),
  };
  contextMenuVisible.value = true;
}

function closeContextMenu() {
  contextMenuVisible.value = false;
}

function openTaskManager() {
  winStore.openWindow('omonitor');
  closeContextMenu();
}

function toggleDesktop() {
  winStore.toggleShowDesktop();
  closeContextMenu();
}

function handleGlobalClick(e: MouseEvent) {
  if (contextMenuVisible.value) {
    closeContextMenu();
  }
}

onMounted(() => {
  window.addEventListener('click', handleGlobalClick);
});

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick);
});

function getWindowIcon(id: string): string {
  switch (id) {
    case 'onotes':
      return onotesSvg;
    case 'oxplorer':
      return oxplorerSvg;
    case 'osheets':
      return osheetsSvg;
    case 'opics':
      return opicsSvg;
    case 'opdf':
      return opdfSvg;
    case 'opaint':
      return opaintSvg;
    case 'omonitor':
      return omonitorSvg;
    default:
      return oxplorerSvg;
  }
}
</script>

<template>
  <footer class="taskbar" @contextmenu.prevent="onTaskbarContextMenu($event)">
    <div class="taskbar-left">
      <button class="oogle-start-btn" aria-label="Menú Oogle" @click="$emit('toggle-start')">
        <img :src="oogleLogoSvg" alt="Oogle" class="oogle-btn-icon" />
      </button>

      <!-- Apps abiertas en la barra de tareas -->
      <div class="taskbar-apps">
        <template v-for="win in winStore.windows" :key="win?.id">
          <button
            v-if="win && win.isOpen"
            class="taskbar-item"
            :class="{ active: !win.isMinimized }"
            @click="winStore.toggleMinimize(win.id)"
          >
            <img :src="getWindowIcon(win.id)" :alt="win.title" class="app-icon" />
            <span>{{ win.title }}</span>
          </button>
        </template>
      </div>
    </div>

    <div class="taskbar-status">
      <slot name="tray"></slot>
    </div>

    <!-- Menú contextual de la barra de tareas -->
    <div
      v-if="contextMenuVisible"
      class="taskbar-context-menu"
      :style="{ left: `${contextMenuPos.x}px`, top: `${contextMenuPos.y}px` }"
      @click.stop
    >
      <button class="menu-action-item" @click="openTaskManager">
        <img :src="omonitorSvg" alt="Omonitor" class="menu-icon" />
        <span>Administrador de tareas / Omonitor</span>
      </button>
      <div class="menu-separator"></div>
      <button class="menu-action-item" @click="toggleDesktop">
        <span class="menu-emoji">🖥️</span>
        <span>Mostrar el escritorio</span>
      </button>
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

/* Menú Contextual de la Barra de Tareas */
.taskbar-context-menu {
  position: fixed;
  background: #181825;
  border: 1px solid #313244;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 9999;
  min-width: 230px;
  animation: context-pop 0.12s ease-out;
}

@keyframes context-pop {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-action-item {
  background: transparent;
  border: none;
  border-radius: 5px;
  padding: 8px 10px;
  color: #cdd6f4;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.12s ease;
}

.menu-action-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.menu-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.menu-emoji {
  font-size: 14px;
}

.menu-separator {
  height: 1px;
  background: #313244;
  margin: 4px 0;
}
</style>