import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  SystemMetricsTick,
  TelemetryLog,
  TelemetrySessionItem,
  TelemetrySummary,
  FileActivityNotification,
} from '@/types/omonitor';

const SESSION_STORAGE_KEY = 'oogleos_telemetry_session_id';

export const useOmonitorStore = defineStore('omonitor', () => {
  // 1. Identificación y Sesión RGPD
  const sessionId = ref<string>('');
  const sessionHash = ref<string>('#anon');
  const isRegistered = ref<boolean>(false);

  // 2. Stream en tiempo real (SSE)
  const isConnected = ref<boolean>(false);
  const metricsHistory = ref<SystemMetricsTick[]>([]);
  const currentMetrics = ref<SystemMetricsTick | null>(null);
  const lastRawJson = ref<string>('');
  const logs = ref<TelemetryLog[]>([]);
  const lastFileActivity = ref<FileActivityNotification | null>(null);

  // 3. Telemetría y Analítica de Tráfico
  const sessions = ref<TelemetrySessionItem[]>([]);
  const summary = ref<TelemetrySummary>({
    totalSessions: 0,
    onlineCount: 0,
    avgStaySeconds: 0,
    totalFilesManipulated: 0,
    totalFilesCreated: 0,
    totalFilesOpened: 0,
    totalFilesDeleted: 0,
  });

  // 4. UI State
  const isRawInspectorOpen = ref<boolean>(false);
  const activeTab = ref<'processes' | 'performance' | 'telemetry'>('performance');

  // Controladores internos
  let eventSource: EventSource | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // Inicializar ID de sesión persistente (sin IP)
  function initSession() {
    let storedId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedId) {
      storedId = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(SESSION_STORAGE_KEY, storedId);
    }
    sessionId.value = storedId;
  }

  // Registrar sesión en backend con huella del entorno
  async function registerSession() {
    if (!sessionId.value) initSession();

    try {
      const res = await fetch('/api/telemetry/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.value,
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          language: navigator.language || 'es',
          referrer: document.referrer || '',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        sessionHash.value = data.sessionHash || '#anon';
        isRegistered.value = true;
      }
    } catch (err) {
      console.warn('Error al registrar sesión de telemetría:', err);
    }

    startHeartbeat();
  }

  // Heartbeat periódico cada 15 segundos
  function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(async () => {
      if (!sessionId.value) return;
      try {
        await fetch('/api/telemetry/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId.value }),
        });
      } catch {
        // Fallo silencioso en heartbeat
      }
    }, 15000);
  }

  // Conectar al canal SSE en tiempo real (/api/system/stream)
  function connectStream() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (eventSource) return;

    eventSource = new EventSource('/api/system/stream');

    eventSource.onopen = () => {
      isConnected.value = true;
    };

    // Evento de métricas periódicas (cada 2 segundos)
    eventSource.addEventListener('metrics', (event) => {
      try {
        const data: SystemMetricsTick = JSON.parse(event.data);
        currentMetrics.value = data;
        lastRawJson.value = JSON.stringify(data, null, 2);

        // Mantener ventana deslizante FIFO de 30 muestras (60 segundos)
        metricsHistory.value.push(data);
        if (metricsHistory.value.length > 30) {
          metricsHistory.value.shift();
        }
      } catch (err) {
        console.error('Error parseando métricas SSE:', err);
      }
    });

    // Evento de logs en vivo
    eventSource.addEventListener('log', (event) => {
      try {
        const log: TelemetryLog = JSON.parse(event.data);
        logs.value.unshift(log);
        if (logs.value.length > 100) {
          logs.value.pop();
        }
      } catch (err) {
        console.error('Error parseando log SSE:', err);
      }
    });

    // Evento reactivo de actividad sobre archivos
    eventSource.addEventListener('file_activity', (event) => {
      try {
        const act: FileActivityNotification = JSON.parse(event.data);
        lastFileActivity.value = act;

        // Actualizar sesión reactivamente en la tabla y encender destello CSS
        const targetSession = sessions.value.find((s) => s.session_hash === act.sessionHash);
        if (targetSession) {
          if (act.type === 'created') targetSession.files_created++;
          else if (act.type === 'opened') targetSession.files_opened++;
          else if (act.type === 'deleted') targetSession.files_deleted++;

          targetSession.justUpdated = true;
          setTimeout(() => {
            targetSession.justUpdated = false;
          }, 1500);
        }

        // Incrementar totales en el resumen
        summary.value.totalFilesManipulated++;
        if (act.type === 'created') summary.value.totalFilesCreated++;
        if (act.type === 'opened') summary.value.totalFilesOpened++;
        if (act.type === 'deleted') summary.value.totalFilesDeleted++;
      } catch (err) {
        console.error('Error en file_activity SSE:', err);
      }
    });

    // Evento de actualización de sesión
    eventSource.addEventListener('session_update', () => {
      fetchSessions();
    });

    eventSource.onerror = () => {
      isConnected.value = false;
    };
  }

  // Desconectar SSE y limpiar recursos
  function disconnectStream() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      isConnected.value = false;
    }
  }

  // Consultar lista completa de sesiones y métricas agregadas
  async function fetchSessions() {
    try {
      const res = await fetch('/api/telemetry/sessions');
      if (res.ok) {
        const data = await res.json();
        const incomingSessions: TelemetrySessionItem[] = data.sessions || [];

        // Ordenar colocando la sesión actual del visitante en 1ª posición
        sessions.value = incomingSessions.sort((a, b) => {
          if (a.session_id === sessionId.value) return -1;
          if (b.session_id === sessionId.value) return 1;
          return 0;
        });

        if (data.summary) {
          summary.value = data.summary;
        }
      }
    } catch (err) {
      console.warn('Error al obtener sesiones:', err);
    }
  }

  // Notificar explícitamente apertura o manipulación de archivo
  async function reportFileAction(action: 'opened' | 'created' | 'deleted', fileName: string) {
    if (!sessionId.value) initSession();
    try {
      await fetch('/api/telemetry/file-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.value,
          fileName,
          action,
        }),
      });
    } catch {
      // Manejo silencioso
    }
  }

  function toggleRawInspector() {
    isRawInspectorOpen.value = !isRawInspectorOpen.value;
  }

  function setActiveTab(tab: 'processes' | 'performance' | 'telemetry') {
    activeTab.value = tab;
    if (tab === 'telemetry') {
      fetchSessions();
    }
  }

  // Inicializar al instanciar el store
  initSession();

  return {
    // Estado
    sessionId,
    sessionHash,
    isRegistered,
    isConnected,
    metricsHistory,
    currentMetrics,
    lastRawJson,
    logs,
    sessions,
    summary,
    lastFileActivity,
    isRawInspectorOpen,
    activeTab,

    // Acciones
    initSession,
    registerSession,
    connectStream,
    disconnectStream,
    fetchSessions,
    reportFileAction,
    toggleRawInspector,
    setActiveTab,
  };
});
