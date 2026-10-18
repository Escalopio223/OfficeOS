<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useWindowStore, type WindowId } from '@/stores/windowStore';
import { useAuthStore } from '@/stores/authStore';
import oxplorerSvg from '@/assets/oxplorer.svg';
import onotesSvg from '@/assets/onotes.svg';
import osheetsSvg from '@/assets/osheets.svg';
import opicsSvg from '@/assets/opics.svg';
import opdfSvg from '@/assets/opdf.svg';
import opaintSvg from '@/assets/opaint.svg';
import omonitorSvg from '@/assets/omonitor.svg';
import oplannerSvg from '@/assets/oplanner.svg';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const winStore = useWindowStore();
const authStore = useAuthStore();

const searchQuery = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);

interface AppItem {
  id: WindowId;
  name: string;
  category: string;
  description: string;
  icon: string;
}

const apps: AppItem[] = [
  {
    id: 'oxplorer',
    name: 'Oxplorer',
    category: 'Sistema',
    description: 'Explorador de archivos virtual',
    icon: oxplorerSvg,
  },
  {
    id: 'oplanner',
    name: 'Oplanner',
    category: 'Productividad',
    description: 'Suite de proyectos y roadmap',
    icon: oplannerSvg,
  },
  {
    id: 'omonitor',
    name: 'Omonitor',
    category: 'Sistema',
    description: 'Administrador de tareas y telemetría',
    icon: omonitorSvg,
  },
  {
    id: 'onotes',
    name: 'Onotes',
    category: 'Herramientas',
    description: 'Editor de notas y código',
    icon: onotesSvg,
  },
  {
    id: 'osheets',
    name: 'Osheets',
    category: 'Productividad',
    description: 'Hojas de cálculo CSV',
    icon: osheetsSvg,
  },
  {
    id: 'opaint',
    name: 'Opaint',
    category: 'Creatividad',
    description: 'Estudio de dibujo digital y capas',
    icon: opaintSvg,
  },
  {
    id: 'opdf',
    name: 'Opdf',
    category: 'Herramientas',
    description: 'Visor y creador de documentos PDF',
    icon: opdfSvg,
  },
  {
    id: 'opics',
    name: 'Opics',
    category: 'Multimedia',
    description: 'Galería de fotos e imágenes',
    icon: opicsSvg,
  },
];

const filteredApps = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return apps;
  return apps.filter(
    (app) =>
      app.name.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q)
  );
});

function launchApp(appId: WindowId) {
  if (appId === 'osheets') {
    winStore.openWindow('osheets', { isNew: true });
  } else if (appId === 'opdf') {
    winStore.openWindow('opdf', { isNew: true });
  } else if (appId === 'opaint') {
    winStore.openWindow('opaint', { isNew: true });
  } else if (appId === 'opics') {
    winStore.openWindow('opics', { mode: 'gallery' });
  } else {
    winStore.openWindow(appId);
  }
  emit('close');
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  } else if (e.key === 'Enter' && filteredApps.value.length > 0) {
    const first = filteredApps.value[0];
    if (first) {
      launchApp(first.id);
    }
  }
}

function handleLogout() {
  emit('close');
  authStore.logout();
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  nextTick(() => {
    searchInputRef.value?.focus();
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="start-menu-container" @click.stop>
    <!-- Buscador superior estilo Windows 11 -->
    <div class="start-search-bar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        placeholder="Buscar aplicaciones y herramientas..."
        class="search-input"
      />
      <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
    </div>

    <!-- Sección de Aplicaciones -->
    <div class="start-content-area">
      <div class="section-header">
        <span class="section-title">
          {{ searchQuery ? 'Resultados de búsqueda' : 'Aplicaciones de OogleOS' }}
        </span>
        <span class="apps-count">{{ filteredApps.length }} disponibles</span>
      </div>

      <!-- Cuadrícula de aplicaciones estilo Windows 11 -->
      <div class="apps-grid">
        <div
          v-for="app in filteredApps"
          :key="app.id"
          class="app-card"
          :title="`${app.name} — ${app.description}`"
          @click="launchApp(app.id)"
        >
          <div class="app-icon-wrap">
            <img :src="app.icon" :alt="app.name" class="app-icon-img" />
          </div>
          <span class="app-title">{{ app.name }}</span>
        </div>

        <div v-if="filteredApps.length === 0" class="no-apps-found">
          <span class="no-apps-icon">🔍</span>
          <p>No se encontraron aplicaciones para "{{ searchQuery }}"</p>
        </div>
      </div>
    </div>

    <!-- Barra Inferior de Perfil y Sesión -->
    <footer class="start-footer">
      <div class="user-profile">
        <div class="user-avatar">
          <span>A</span>
        </div>
        <div class="user-details">
          <span class="user-name">Administrador</span>
          <span class="user-role">Superusuario • OogleOS</span>
        </div>
      </div>

      <button
        class="btn-power"
        title="Cerrar sesión de OogleOS"
        @click="handleLogout"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
          <line x1="12" y1="2" x2="12" y2="12"></line>
        </svg>
        <span>Salir</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.start-menu-container {
  position: fixed;
  bottom: 58px;
  left: 14px;
  width: 480px;
  max-width: calc(100vw - 28px);
  background: rgba(18, 24, 38, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75), 0 0 1px rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: startMenuAppear 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: bottom left;
}

@keyframes startMenuAppear {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.start-search-bar {
  padding: 18px 20px 14px 20px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 32px;
  width: 16px;
  height: 16px;
  color: #64748b;
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px 34px 10px 38px;
  color: #f1f5f9;
  font-size: 13px;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.05);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
}

.clear-search-btn {
  position: absolute;
  right: 32px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}

.clear-search-btn:hover {
  color: #f1f5f9;
}

.start-content-area {
  padding: 0 20px 16px 20px;
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.start-content-area::-webkit-scrollbar {
  width: 5px;
}
.start-content-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.apps-count {
  font-size: 11px;
  color: #64748b;
}

/* Cuadrícula de Aplicaciones estilo Windows 11 Pinned Grid */
.apps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px 8px;
  padding: 4px 0;
}

.app-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  padding: 12px 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.app-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(56, 189, 248, 0.35);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

.app-icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.15s ease, background 0.15s ease;
}

.app-card:hover .app-icon-wrap {
  transform: scale(1.08);
  background: rgba(56, 189, 248, 0.12);
}

.app-icon-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.45));
}

.app-title {
  font-size: 11.5px;
  font-weight: 500;
  color: #f1f5f9;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 95px;
}

.no-apps-found {
  grid-column: 1 / -1;
  padding: 30px;
  text-align: center;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.no-apps-found {
  padding: 30px;
  text-align: center;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.no-apps-icon {
  font-size: 24px;
}

.start-footer {
  padding: 12px 18px;
  background: rgba(12, 16, 26, 0.9);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0284c7, #38bdf8);
  color: #041021;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(56, 189, 248, 0.3);
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
}

.user-role {
  font-size: 10px;
  color: #64748b;
}

.btn-power {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-power:hover {
  background: rgba(239, 68, 68, 0.22);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.4);
}

.btn-power svg {
  width: 14px;
  height: 14px;
}
</style>
