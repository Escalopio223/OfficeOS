<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useWindowStore, type WindowInstance } from '@/stores/windowStore';
import { useWindowBounds } from '@/composables/useWindowBounds';
import { useOmonitorStore } from '@/stores/omonitorStore';
import omonitorSvg from '@/assets/omonitor.svg';
import oxplorerSvg from '@/assets/oxplorer.svg';
import onotesSvg from '@/assets/onotes.svg';
import osheetsSvg from '@/assets/osheets.svg';
import opicsSvg from '@/assets/opics.svg';
import opdfSvg from '@/assets/opdf.svg';
import opaintSvg from '@/assets/opaint.svg';
import WindowControls from '@/components/common/WindowControls.vue';
import MetricChartSvg from './MetricChartSvg.vue';
import RawStreamInspector from './RawStreamInspector.vue';

const winStore = useWindowStore();
const omonitor = useOmonitorStore();
const winState = computed(() => winStore.windows['omonitor'] || {
  id: 'omonitor',
  title: 'Administrador de tareas - Omonitor',
  isOpen: false,
  isMinimized: false,
  isMaximized: false,
  zIndex: 16,
});

const {
  x,
  y,
  width,
  height,
  startDrag,
  startResize,
} = useWindowBounds(120, 60, 880, 600, 680, 480);

// Timer de refresco de cronómetros en vivo (cada segundo)
const nowTick = ref(Date.now());
let liveClockInterval: ReturnType<typeof setInterval> | null = null;

// Consola de logs
const autoScrollLogs = ref(true);
const logContainerRef = ref<HTMLElement | null>(null);

// Mapeo de iconos de aplicaciones para la lista de procesos
function getAppIcon(appId: string): string {
  switch (appId) {
    case 'oxplorer':
      return oxplorerSvg;
    case 'onotes':
      return onotesSvg;
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

// Lista reactiva de procesos abiertos en OogleOS
const activeProcesses = computed(() => {
  return Object.values(winStore.windows)
    .filter((w): w is WindowInstance => !!w && w.isOpen)
    .map((w) => {
      const opened = w.openedAt || nowTick.value;
      const elapsedSec = Math.max(0, Math.floor((nowTick.value - opened) / 1000));
      const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const ss = String(elapsedSec % 60).padStart(2, '0');

      let statusText = 'En primer plano';
      let statusColor = '#a6e3a1'; // verde
      if (w.isMinimized) {
        statusText = 'Minimizada';
        statusColor = '#fab387'; // naranja
      } else if (w.zIndex < (winStore.windows['omonitor']?.zIndex ?? 0)) {
        statusText = 'En segundo plano';
        statusColor = '#89b4fa'; // azul
      }

      return {
        id: w.id,
        title: w.title,
        icon: getAppIcon(w.id),
        pid: w.pid || 1024,
        isMinimized: w.isMinimized,
        uptimeStr: `${mm}:${ss}`,
        statusText,
        statusColor,
      };
    });
});

// Historia de CPU y RAM para las gráficas SVG
const cpuHistory = computed(() => omonitor.metricsHistory.map((m) => m.cpu.percent));
const ramHistory = computed(() => omonitor.metricsHistory.map((m) => m.memory.hostPercent));

// Cronómetro en vivo de la sesión actual
const currentSessionLiveTime = computed(() => {
  const current = omonitor.sessions.find((s) => s.session_id === omonitor.sessionId);
  if (!current) return '00:00';
  const startEpoch = new Date(current.started_at).getTime();
  const diffSec = Math.max(0, Math.floor((nowTick.value - startEpoch) / 1000));
  const mm = String(Math.floor(diffSec / 60)).padStart(2, '0');
  const ss = String(diffSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
});

function formatDurationSeconds(seconds: number | string): string {
  const s = Math.round(Number(seconds) || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function terminateProcess(processId: string) {
  winStore.closeWindow(processId);
}

function handleDoubleClickHeader() {
  winStore.toggleMaximize('omonitor');
}

function clearLogs() {
  omonitor.logs = [];
}

// Auto-scroll del contenedor de logs
function scrollToBottom() {
  if (autoScrollLogs.value && logContainerRef.value) {
    nextTick(() => {
      if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
      }
    });
  }
}

onMounted(() => {
  omonitor.registerSession();
  omonitor.connectStream();
  omonitor.fetchSessions();

  liveClockInterval = setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (liveClockInterval) clearInterval(liveClockInterval);
});
</script>

<template>
  <div
    v-show="!winState.isMinimized"
    class="omonitor-window"
    :class="{ 'is-maximized': winState.isMaximized }"
    :style="
      winState.isMaximized
        ? { zIndex: winState.zIndex }
        : { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, zIndex: winState.zIndex }
    "
    @mousedown="winStore.focusWindow('omonitor')"
  >
    <!-- Tiradores de Redimensión -->
    <template v-if="!winState.isMaximized">
      <div class="resize-handle n" @mousedown="startResize($event, 'n', winState.isMaximized)"></div>
      <div class="resize-handle s" @mousedown="startResize($event, 's', winState.isMaximized)"></div>
      <div class="resize-handle e" @mousedown="startResize($event, 'e', winState.isMaximized)"></div>
      <div class="resize-handle w" @mousedown="startResize($event, 'w', winState.isMaximized)"></div>
      <div class="resize-handle se" @mousedown="startResize($event, 'se', winState.isMaximized)"></div>
      <div class="resize-handle sw" @mousedown="startResize($event, 'sw', winState.isMaximized)"></div>
      <div class="resize-handle ne" @mousedown="startResize($event, 'ne', winState.isMaximized)"></div>
      <div class="resize-handle nw" @mousedown="startResize($event, 'nw', winState.isMaximized)"></div>
    </template>

    <!-- Cabecera de la Ventana -->
    <header
      class="window-header"
      @mousedown="startDrag($event, winState.isMaximized)"
      @dblclick="handleDoubleClickHeader"
    >
      <div class="window-title">
        <img :src="omonitorSvg" alt="Omonitor" class="omonitor-icon" />
        <span class="title-text">Administrador de tareas — Omonitor</span>

        <!-- Badge de conexión en vivo SSE -->
        <span class="stream-badge" :class="{ online: omonitor.isConnected }">
          <span class="stream-dot"></span>
          {{ omonitor.isConnected ? 'En vivo (SSE)' : 'Desconectado' }}
        </span>
      </div>

      <div class="header-right-tools">
        <!-- Toggle </> Raw Stream / API Inspector -->
        <button
          class="btn-raw-inspector"
          :class="{ active: omonitor.isRawInspectorOpen }"
          title="Abrir inspector de stream JSON en tiempo real"
          @click.stop="omonitor.toggleRawInspector"
        >
          &lt;/&gt; Raw Stream
        </button>

        <WindowControls window-id="omonitor" :is-maximized="winState.isMaximized" />
      </div>
    </header>

    <!-- Barra de Navegación de Pestañas -->
    <nav class="omonitor-nav-tabs">
      <button
        class="tab-btn"
        :class="{ active: omonitor.activeTab === 'processes' }"
        @click="omonitor.setActiveTab('processes')"
      >
        <span class="tab-icon">⚙️</span>
        <span>Procesos</span>
        <span class="tab-counter">{{ activeProcesses.length }}</span>
      </button>

      <button
        class="tab-btn"
        :class="{ active: omonitor.activeTab === 'performance' }"
        @click="omonitor.setActiveTab('performance')"
      >
        <span class="tab-icon">⚡</span>
        <span>Rendimiento</span>
        <span v-if="omonitor.currentMetrics" class="tab-badge-accent">
          {{ omonitor.currentMetrics.cpu.percent }}% CPU
        </span>
      </button>

      <button
        class="tab-btn"
        :class="{ active: omonitor.activeTab === 'telemetry' }"
        @click="omonitor.setActiveTab('telemetry')"
      >
        <span class="tab-icon">🌐</span>
        <span>Telemetría y Tráfico</span>
      </button>
    </nav>

    <!-- Contenido Principal Dinámico -->
    <div class="omonitor-body">
      <!-- ========================================== -->
      <!-- PESTAÑA 1: PROCESOS (CLIENTE / OOGLEOS)     -->
      <!-- ========================================== -->
      <section v-if="omonitor.activeTab === 'processes'" class="tab-content processes-tab">
        <div class="processes-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Aplicación</th>
                <th style="width: 80px;">PID</th>
                <th style="width: 150px;">Estado</th>
                <th style="width: 120px;">Tiempo activo</th>
                <th style="width: 130px; text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="proc in activeProcesses" :key="proc.id" class="process-row">
                <td class="col-app">
                  <img :src="proc.icon" :alt="proc.title" class="process-app-icon" />
                  <span class="process-name">{{ proc.title }}</span>
                </td>
                <td class="col-pid">
                  <span class="pid-badge">{{ proc.pid }}</span>
                </td>
                <td class="col-status">
                  <span class="status-pill" :style="{ borderColor: proc.statusColor, color: proc.statusColor }">
                    ● {{ proc.statusText }}
                  </span>
                </td>
                <td class="col-uptime">
                  <span class="uptime-text">{{ proc.uptimeStr }}</span>
                </td>
                <td class="col-action" style="text-align: right;">
                  <button
                    class="btn-terminate"
                    title="Cerrar forzosamente la aplicación"
                    @click="terminateProcess(proc.id)"
                  >
                    Finalizar tarea
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="processes-footer-bar">
          <span>Procesos en ejecución: <strong>{{ activeProcesses.length }}</strong></span>
          <span>Plataforma: <strong>OogleOS Web Desktop</strong></span>
        </div>
      </section>

      <!-- ========================================== -->
      <!-- PESTAÑA 2: RENDIMIENTO (SERVIDOR HOST)     -->
      <!-- ========================================== -->
      <section v-if="omonitor.activeTab === 'performance'" class="tab-content performance-tab">
        <!-- Gráficas de CPU y Memoria (SVG nativo en tiempo real) -->
        <div class="charts-grid">
          <MetricChartSvg
            title="CPU del Host"
            :subtitle="omonitor.currentMetrics ? `${omonitor.currentMetrics.cpu.cores} Núcleos • ${omonitor.currentMetrics.cpu.model}` : 'Calculando diferencial...'"
            :current-value="omonitor.currentMetrics?.cpu.percent ?? 0"
            unit="%"
            color="#12b5cb"
            :history="cpuHistory"
            :max-val="100"
            badge-text="Delta os.cpus()"
          />

          <MetricChartSvg
            title="Memoria RAM del Servidor"
            :subtitle="
              omonitor.currentMetrics
                ? `${(omonitor.currentMetrics.memory.hostUsed / 1024 / 1024 / 1024).toFixed(1)} GB de ${(omonitor.currentMetrics.memory.hostTotal / 1024 / 1024 / 1024).toFixed(1)} GB host`
                : 'Leyendo memoria...'
            "
            :current-value="omonitor.currentMetrics?.memory.hostPercent ?? 0"
            unit="%"
            color="#a6e3a1"
            :history="ramHistory"
            :max-val="100"
            :badge-text="
              omonitor.currentMetrics
                ? `Node V8 Heap: ${(omonitor.currentMetrics.memory.processHeapUsed / 1024 / 1024).toFixed(0)} MB`
                : ''
            "
          />
        </div>

        <!-- Panel de Salud e Infraestructura -->
        <div class="health-grid">
          <!-- PostgreSQL -->
          <div class="health-card">
            <div class="health-card-header">
              <span class="health-service">PostgreSQL</span>
              <span
                class="health-badge"
                :class="{ online: omonitor.currentMetrics?.health?.postgres?.status === 'online' }"
              >
                ● {{ omonitor.currentMetrics?.health?.postgres?.status === 'online' ? 'Online' : 'Offline' }}
              </span>
            </div>
            <div class="health-card-body">
              <div class="health-metric">
                <span class="label">Latencia ping:</span>
                <span class="val">{{ omonitor.currentMetrics?.health?.postgres?.latencyMs ?? 0 }} ms</span>
              </div>
              <div class="health-metric">
                <span class="label">Base de datos:</span>
                <span class="val">oogleos_db:5433</span>
              </div>
            </div>
          </div>

          <!-- Redis -->
          <div class="health-card">
            <div class="health-card-header">
              <span class="health-service">Redis Cache</span>
              <span
                class="health-badge"
                :class="{ online: omonitor.currentMetrics?.health?.redis?.status === 'online' }"
              >
                ● {{ omonitor.currentMetrics?.health?.redis?.status === 'online' ? 'Online' : 'Offline' }}
              </span>
            </div>
            <div class="health-card-body">
              <div class="health-metric">
                <span class="label">Latencia PING:</span>
                <span class="val">{{ omonitor.currentMetrics?.health?.redis?.latencyMs ?? 0 }} ms</span>
              </div>
              <div class="health-metric">
                <span class="label">Cache & Streams:</span>
                <span class="val">127.0.0.1:6379</span>
              </div>
            </div>
          </div>

          <!-- BullMQ -->
          <div class="health-card">
            <div class="health-card-header">
              <span class="health-service">Colas BullMQ</span>
              <span
                class="health-badge"
                :class="{ online: omonitor.currentMetrics?.health?.bullmq?.status === 'online' }"
              >
                ● {{ omonitor.currentMetrics?.health?.bullmq?.status === 'online' ? 'Online' : 'Offline' }}
              </span>
            </div>
            <div class="health-card-body">
              <div class="bullmq-counts">
                <div class="bull-item">
                  <span class="bull-label">Wait:</span>
                  <span class="bull-val">{{ omonitor.currentMetrics?.health?.bullmq?.waiting ?? 0 }}</span>
                </div>
                <div class="bull-item">
                  <span class="bull-label">Act:</span>
                  <span class="bull-val">{{ omonitor.currentMetrics?.health?.bullmq?.active ?? 0 }}</span>
                </div>
                <div class="bull-item">
                  <span class="bull-label">Done:</span>
                  <span class="bull-val">{{ omonitor.currentMetrics?.health?.bullmq?.completed ?? 0 }}</span>
                </div>
                <div class="bull-item">
                  <span class="bull-label">Fail:</span>
                  <span class="bull-val">{{ omonitor.currentMetrics?.health?.bullmq?.failed ?? 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Consola de Logs en Vivo con Interceptor -->
        <div class="live-console-card">
          <div class="console-header">
            <div class="console-title">
              <span class="console-dot"></span>
              <span>Consola HTTP en tiempo real</span>
              <span class="log-count">({{ omonitor.logs.length }} eventos)</span>
            </div>
            <div class="console-actions">
              <label class="autoscroll-toggle">
                <input v-model="autoScrollLogs" type="checkbox" />
                <span>Auto-scroll</span>
              </label>
              <button class="btn-clear-logs" @click="clearLogs">Limpiar</button>
            </div>
          </div>

          <div ref="logContainerRef" class="console-output">
            <div v-if="omonitor.logs.length === 0" class="console-empty">
              Esperando peticiones y eventos HTTP desde el backend...
            </div>
            <div
              v-for="log in omonitor.logs"
              :key="log.id"
              class="console-log-row"
            >
              <span class="log-time">{{ log.timestamp }}</span>
              <span class="log-method" :class="log.method.toLowerCase()">{{ log.method }}</span>
              <span class="log-status" :class="`s${String(log.statusCode).charAt(0)}`">{{ log.statusCode }}</span>
              <span class="log-duration">{{ log.durationMs }}ms</span>
              <span class="log-session">{{ log.sessionHash }}</span>
              <span class="log-url">{{ log.url }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================================== -->
      <!-- PESTAÑA 3: TELEMETRÍA Y TRÁFICO (RGPD)     -->
      <!-- ========================================== -->
      <section v-if="omonitor.activeTab === 'telemetry'" class="tab-content telemetry-tab">
        <!-- KPIs Superiores -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">Total Visitas / Sesiones</span>
            <span class="kpi-val">{{ omonitor.summary.totalSessions }}</span>
            <span class="kpi-sub">Únicas registradas</span>
          </div>

          <div class="kpi-card active-pulse">
            <span class="kpi-label">Usuarios Conectados Ahora</span>
            <div class="kpi-val-group">
              <span class="pulse-green-dot"></span>
              <span class="kpi-val">{{ omonitor.summary.onlineCount }}</span>
            </div>
            <span class="kpi-sub">Online en tiempo real</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Tiempo Medio de Estancia</span>
            <span class="kpi-val">{{ formatDurationSeconds(omonitor.summary.avgStaySeconds) }}</span>
            <span class="kpi-sub">Permanencia en OogleOS</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Archivos Manipulados</span>
            <span class="kpi-val">{{ omonitor.summary.totalFilesManipulated }}</span>
            <span class="kpi-sub">
              +{{ omonitor.summary.totalFilesCreated }} creados • {{ omonitor.summary.totalFilesOpened }} abiertos • {{ omonitor.summary.totalFilesDeleted }} borrados
            </span>
          </div>
        </div>

        <!-- Tabla de Sesiones con Huella de Entorno -->
        <div class="sessions-table-wrapper">
          <div class="sessions-header-info">
            <span class="section-title">Huella de Entorno y Reactividad de Archivos</span>
            <span class="rgpd-badge">🔒 Sin direcciones IP (Cumplimiento RGPD)</span>
          </div>

          <div class="sessions-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 140px;">Estado</th>
                  <th style="width: 100px;">ID Sesión</th>
                  <th>Entorno (OS • Browser • Pantalla • Zona)</th>
                  <th style="width: 120px;">Origen</th>
                  <th style="width: 110px;">Tiempo activo</th>
                  <th style="width: 160px; text-align: right;">Archivos (C / A / B)</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="sess in omonitor.sessions"
                  :key="sess.session_id"
                  class="session-row"
                  :class="{
                    'is-current-user': sess.session_id === omonitor.sessionId,
                    'row-reactive-flash': sess.justUpdated,
                  }"
                >
                  <td class="col-sess-status">
                    <span v-if="sess.session_id === omonitor.sessionId" class="badge-you">
                      🟢 Online (Tú)
                    </span>
                    <span v-else-if="sess.is_online" class="badge-online">
                      🟢 Online
                    </span>
                    <span v-else class="badge-offline">
                      ⚪ Desconectado
                    </span>
                  </td>

                  <td class="col-sess-hash">
                    <span class="hash-tag">{{ sess.session_hash }}</span>
                  </td>

                  <td class="col-sess-env">
                    <div class="env-main">
                      <strong>{{ sess.os }}</strong> • {{ sess.browser }}
                    </div>
                    <div class="env-sub">
                      {{ sess.screen_resolution }} • {{ sess.timezone }} ({{ sess.language }})
                    </div>
                  </td>

                  <td class="col-sess-ref">
                    <span class="ref-badge">{{ sess.referrer_type || 'Directo' }}</span>
                  </td>

                  <td class="col-sess-time">
                    <span v-if="sess.session_id === omonitor.sessionId" class="live-clock">
                      {{ currentSessionLiveTime }}
                    </span>
                    <span v-else>
                      {{ formatDurationSeconds(sess.duration_seconds) }}
                    </span>
                  </td>

                  <td class="col-sess-files" style="text-align: right;">
                    <div class="file-badges-group">
                      <span class="file-badge created" title="Archivos Creados">+{{ sess.files_created }}</span>
                      <span class="file-badge opened" title="Archivos Abiertos">👁️ {{ sess.files_opened }}</span>
                      <span class="file-badge deleted" title="Archivos Borrados">🗑️ {{ sess.files_deleted }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Panel Lateral Superpuesto: Raw Stream / API Inspector -->
      <RawStreamInspector v-if="omonitor.isRawInspectorOpen" />
    </div>
  </div>
</template>

<style scoped>
.omonitor-window {
  position: absolute;
  background: #1e1e2e;
  border-radius: 12px;
  border: 1px solid #313244;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #cdd6f4;
}

.omonitor-window.is-maximized {
  left: 0 !important;
  top: 0 !important;
  width: 100vw !important;
  height: calc(100vh - 50px) !important;
  border-radius: 0;
  border: none;
}

/* Header */
.window-header {
  height: 44px;
  background: #181825;
  border-bottom: 1px solid #313244;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  cursor: grab;
}

.window-header:active {
  cursor: grabbing;
}

.window-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.omonitor-icon {
  width: 22px;
  height: 22px;
}

.title-text {
  font-size: 13px;
  font-weight: 600;
  color: #cdd6f4;
}

.stream-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(243, 139, 168, 0.15);
  color: #f38ba8;
  border: 1px solid rgba(243, 139, 168, 0.3);
}

.stream-badge.online {
  background: rgba(166, 227, 161, 0.15);
  color: #a6e3a1;
  border-color: rgba(166, 227, 161, 0.3);
}

.stream-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}

.header-right-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-raw-inspector {
  background: #313244;
  border: 1px solid #45475a;
  color: #cdd6f4;
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-raw-inspector:hover {
  background: #45475a;
  color: #12b5cb;
  border-color: #12b5cb;
}

.btn-raw-inspector.active {
  background: #12b5cb;
  color: #11111b;
  border-color: #12b5cb;
}

/* Nav Tabs */
.omonitor-nav-tabs {
  height: 40px;
  background: #181825;
  border-bottom: 1px solid #313244;
  display: flex;
  padding: 0 12px;
  gap: 6px;
}

.tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: #a6adc8;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.tab-btn:hover {
  color: #cdd6f4;
}

.tab-btn.active {
  color: #12b5cb;
  border-bottom-color: #12b5cb;
  font-weight: 600;
}

.tab-counter {
  background: #313244;
  color: #cdd6f4;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
}

.tab-badge-accent {
  background: rgba(18, 181, 203, 0.15);
  color: #12b5cb;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  font-family: monospace;
}

.tab-badge-live {
  background: rgba(166, 227, 161, 0.15);
  color: #a6e3a1;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
}

/* Body */
.omonitor-body {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #181825;
}

.tab-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Pestaña 1: Procesos */
.processes-table-container {
  flex: 1;
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 8px;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

.data-table th {
  background: #181825;
  color: #a6adc8;
  font-weight: 600;
  padding: 10px 14px;
  border-bottom: 1px solid #313244;
  position: sticky;
  top: 0;
  z-index: 2;
}

.data-table td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cdd6f4;
}

.process-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.col-app {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.process-app-icon {
  width: 20px;
  height: 20px;
}

.pid-badge {
  font-family: monospace;
  background: #313244;
  padding: 2px 6px;
  border-radius: 4px;
  color: #fab387;
  font-size: 11px;
}

.status-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid;
}

.uptime-text {
  font-family: monospace;
  color: #a6adc8;
}

.btn-terminate {
  background: rgba(243, 139, 168, 0.12);
  border: 1px solid rgba(243, 139, 168, 0.3);
  color: #f38ba8;
  padding: 4px 10px;
  border-radius: 5px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-terminate:hover {
  background: #f38ba8;
  color: #11111b;
  font-weight: 600;
}

.processes-footer-bar {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 6px;
  font-size: 11px;
  color: #6c7086;
}

.processes-footer-bar strong {
  color: #cdd6f4;
}

/* Pestaña 2: Rendimiento */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.health-card {
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.health-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-service {
  font-size: 12px;
  font-weight: 600;
  color: #cdd6f4;
}

.health-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  color: #f38ba8;
  background: rgba(243, 139, 168, 0.15);
}

.health-badge.online {
  color: #a6e3a1;
  background: rgba(166, 227, 161, 0.15);
}

.health-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}

.health-metric {
  display: flex;
  justify-content: space-between;
}

.health-metric .label {
  color: #6c7086;
}

.health-metric .val {
  color: #a6adc8;
  font-family: monospace;
}

.bullmq-counts {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  background: #181825;
  padding: 4px 6px;
  border-radius: 4px;
}

.bull-item {
  display: flex;
  gap: 4px;
  font-size: 10px;
}

.bull-label {
  color: #6c7086;
}

.bull-val {
  color: #89b4fa;
  font-family: monospace;
  font-weight: 600;
}

/* Consola de logs */
.live-console-card {
  flex: 1;
  min-height: 180px;
  background: #11111b;
  border: 1px solid #313244;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.console-header {
  padding: 8px 12px;
  background: #181825;
  border-bottom: 1px solid #313244;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.console-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #cdd6f4;
}

.console-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #12b5cb;
  box-shadow: 0 0 6px #12b5cb;
}

.log-count {
  font-size: 10px;
  color: #6c7086;
}

.console-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.autoscroll-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #a6adc8;
  cursor: pointer;
}

.btn-clear-logs {
  background: #313244;
  border: none;
  color: #a6adc8;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-clear-logs:hover {
  background: #45475a;
  color: #ffffff;
}

.console-output {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1.6;
  display: flex;
  flex-direction: column-reverse;
}

.console-empty {
  color: #585b70;
  font-style: italic;
  padding: 10px 0;
}

.console-log-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
}

.log-time {
  color: #585b70;
  min-width: 65px;
}

.log-method {
  font-weight: 700;
  min-width: 45px;
}

.log-method.get { color: #89b4fa; }
.log-method.post { color: #a6e3a1; }
.log-method.patch { color: #f9e2af; }
.log-method.delete { color: #f38ba8; }

.log-status {
  font-weight: 600;
  min-width: 32px;
}

.log-status.s2 { color: #a6e3a1; }
.log-status.s3 { color: #89dceb; }
.log-status.s4 { color: #fab387; }
.log-status.s5 { color: #f38ba8; }

.log-duration {
  color: #6c7086;
  min-width: 40px;
}

.log-session {
  color: #cba6f7;
  font-weight: 500;
  min-width: 50px;
}

.log-url {
  color: #cdd6f4;
  word-break: break-all;
}

/* Pestaña 3: Telemetría y Tráfico */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.kpi-card {
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-card.active-pulse {
  border-color: rgba(166, 227, 161, 0.4);
}

.kpi-label {
  font-size: 11px;
  color: #6c7086;
}

.kpi-val-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pulse-green-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #a6e3a1;
  box-shadow: 0 0 8px #a6e3a1;
  animation: pulse-ring 1.8s infinite;
}

.kpi-val {
  font-size: 22px;
  font-weight: 700;
  color: #cdd6f4;
  font-family: 'JetBrains Mono', monospace;
}

.kpi-sub {
  font-size: 10px;
  color: #a6adc8;
}

.sessions-table-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sessions-header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #cdd6f4;
}

.rgpd-badge {
  font-size: 10px;
  color: #a6e3a1;
  background: rgba(166, 227, 161, 0.12);
  padding: 2px 8px;
  border-radius: 4px;
}

.sessions-table-container {
  flex: 1;
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 8px;
  overflow: auto;
}

.session-row.is-current-user {
  background: rgba(18, 181, 203, 0.05);
}

.session-row.is-current-user > td:first-child {
  border-left: 3px solid #12b5cb;
}

/* Feedback Visual Reactivo: Destello suave y pulido sin sombras deslumbrantes */
.session-row.row-reactive-flash {
  animation: row-flash 1.2s ease-out;
}

@keyframes row-flash {
  0% {
    background-color: rgba(18, 181, 203, 0.18);
  }
  100% {
    background-color: transparent;
  }
}

.session-row.is-current-user.row-reactive-flash {
  animation: row-flash-current 1.2s ease-out;
}

@keyframes row-flash-current {
  0% {
    background-color: rgba(18, 181, 203, 0.22);
  }
  100% {
    background-color: rgba(18, 181, 203, 0.05);
  }
}

.badge-you {
  font-size: 11px;
  font-weight: 600;
  color: #12b5cb;
}

.badge-online {
  font-size: 11px;
  color: #a6e3a1;
}

.badge-offline {
  font-size: 11px;
  color: #6c7086;
}

.hash-tag {
  font-family: monospace;
  font-weight: 700;
  color: #fab387;
  background: #313244;
  padding: 2px 6px;
  border-radius: 4px;
}

.env-main {
  font-weight: 500;
  color: #cdd6f4;
}

.env-sub {
  font-size: 10px;
  color: #6c7086;
}

.ref-badge {
  font-size: 11px;
  padding: 2px 6px;
  background: #313244;
  border-radius: 4px;
  color: #89b4fa;
}

.live-clock {
  font-family: monospace;
  color: #a6e3a1;
  font-weight: 600;
}

.file-badges-group {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.file-badge {
  font-size: 10px;
  font-family: monospace;
  padding: 2px 6px;
  border-radius: 4px;
}

.file-badge.created {
  background: rgba(166, 227, 161, 0.15);
  color: #a6e3a1;
}

.file-badge.opened {
  background: rgba(137, 180, 250, 0.15);
  color: #89b4fa;
}

.file-badge.deleted {
  background: rgba(243, 139, 168, 0.15);
  color: #f38ba8;
}

/* Tiradores de redimensión estándar */
.resize-handle {
  position: absolute;
  z-index: 10;
}
.resize-handle.n { top: 0; left: 0; right: 0; height: 5px; cursor: n-resize; }
.resize-handle.s { bottom: 0; left: 0; right: 0; height: 5px; cursor: s-resize; }
.resize-handle.e { top: 0; bottom: 0; right: 0; width: 5px; cursor: e-resize; }
.resize-handle.w { top: 0; bottom: 0; left: 0; width: 5px; cursor: w-resize; }
.resize-handle.se { bottom: 0; right: 0; width: 12px; height: 12px; cursor: se-resize; }
.resize-handle.sw { bottom: 0; left: 0; width: 12px; height: 12px; cursor: sw-resize; }
.resize-handle.ne { top: 0; right: 0; width: 12px; height: 12px; cursor: ne-resize; }
.resize-handle.nw { top: 0; left: 0; width: 12px; height: 12px; cursor: nw-resize; }
</style>
