import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { useOmonitorStore } from '@/stores/omonitorStore';
import { useWindowStore } from '@/stores/windowStore';
import MetricChartSvg from '@/components/apps/omonitor/MetricChartSvg.vue';
import OmonitorWindow from '@/components/apps/omonitor/OmonitorWindow.vue';

describe('Omonitor Store & Components', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sessions: [], summary: {} }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useOmonitorStore', () => {
    it('inicializa un identificador de sesión RGPD persistente sin IP', () => {
      const store = useOmonitorStore();
      expect(store.sessionId).toBeDefined();
      expect(store.sessionId.startsWith('sess_')).toBe(true);

      const savedId = localStorage.getItem('oogleos_telemetry_session_id');
      expect(savedId).toBe(store.sessionId);
    });

    it('gestiona la cola FIFO deslizante de métricas con un máximo de 30 muestras', () => {
      const store = useOmonitorStore();
      expect(store.metricsHistory.length).toBe(0);

      // Simular la llegada de 35 eventos de métricas
      for (let i = 1; i <= 35; i++) {
        store.metricsHistory.push({
          timestamp: Date.now() + i,
          cpu: { percent: i, cores: 8, model: 'Test CPU' },
          memory: {
            hostTotal: 16000000000,
            hostUsed: 8000000000,
            hostFree: 8000000000,
            hostPercent: 50,
            processRss: 100000000,
            processHeapUsed: 50000000,
            processHeapTotal: 60000000,
          },
          uptime: i * 2,
          eventLoopLagMs: 0.1,
          health: {
            postgres: { status: 'online', latencyMs: 1 },
            redis: { status: 'online', latencyMs: 1 },
            bullmq: { status: 'online', waiting: 0, active: 0, completed: 0, failed: 0 },
          },
        });
        if (store.metricsHistory.length > 30) {
          store.metricsHistory.shift();
        }
      }

      expect(store.metricsHistory.length).toBe(30);
      // El primer valor debe ser el número 6 (desplazamiento de los primeros 5)
      expect(store.metricsHistory[0]?.cpu.percent).toBe(6);
      expect(store.metricsHistory[29]?.cpu.percent).toBe(35);
    });

    it('alterna el panel inspector de stream crudo', () => {
      const store = useOmonitorStore();
      expect(store.isRawInspectorOpen).toBe(false);

      store.toggleRawInspector();
      expect(store.isRawInspectorOpen).toBe(true);

      store.toggleRawInspector();
      expect(store.isRawInspectorOpen).toBe(false);
    });

    it('cambia entre pestañas de Omonitor correctamente', () => {
      const store = useOmonitorStore();
      expect(store.activeTab).toBe('performance');

      store.setActiveTab('processes');
      expect(store.activeTab).toBe('processes');

      store.setActiveTab('telemetry');
      expect(store.activeTab).toBe('telemetry');
    });
  });

  describe('useWindowStore Integration with Omonitor', () => {
    it('incluye la ventana omonitor en el mapa del sistema', () => {
      const winStore = useWindowStore();
      const omonitorWin = winStore.windows['omonitor'];

      expect(omonitorWin).toBeDefined();
      expect(omonitorWin?.title).toContain('Omonitor');
      expect(omonitorWin?.isOpen).toBe(false);
    });

    it('asigna un PID simulado y timestamp al abrir la ventana y los limpia al cerrar', () => {
      const winStore = useWindowStore();
      winStore.openWindow('omonitor');

      const openedWin = winStore.windows['omonitor'];
      expect(openedWin?.isOpen).toBe(true);
      expect(openedWin?.pid).toBeGreaterThan(0);
      expect(openedWin?.openedAt).toBeDefined();

      winStore.closeWindow('omonitor');
      expect(openedWin?.isOpen).toBe(false);
      expect(openedWin?.pid).toBeUndefined();
      expect(openedWin?.openedAt).toBeUndefined();
    });

    it('permite alternar el estado Mostrar Escritorio (minimizar y restaurar todas las ventanas)', () => {
      const winStore = useWindowStore();
      winStore.openWindow('omonitor');
      winStore.openWindow('oxplorer');

      expect(winStore.windows['omonitor']?.isMinimized).toBe(false);
      expect(winStore.windows['oxplorer']?.isMinimized).toBe(false);

      // Primer toggle: todas minimizadas
      winStore.toggleShowDesktop();
      expect(winStore.windows['omonitor']?.isMinimized).toBe(true);
      expect(winStore.windows['oxplorer']?.isMinimized).toBe(true);

      // Segundo toggle: restauradas
      winStore.toggleShowDesktop();
      expect(winStore.windows['omonitor']?.isMinimized).toBe(false);
      expect(winStore.windows['oxplorer']?.isMinimized).toBe(false);
    });
  });

  describe('MetricChartSvg Component', () => {
    it('renderiza la gráfica SVG con títulos y valor actual', () => {
      const wrapper = mount(MetricChartSvg, {
        props: {
          title: 'Uso de CPU',
          subtitle: '8 Núcleos AMD',
          currentValue: 42,
          unit: '%',
          color: '#12b5cb',
          history: [10, 20, 30, 42],
          maxVal: 100,
        },
      });

      expect(wrapper.text()).toContain('Uso de CPU');
      expect(wrapper.text()).toContain('8 Núcleos AMD');
      expect(wrapper.text()).toContain('42%');
      expect(wrapper.find('svg.chart-svg').exists()).toBe(true);
      expect(wrapper.find('polyline').exists()).toBe(true);
    });

    it('maneja un historial vacío de datos sin lanzar excepciones', () => {
      const wrapper = mount(MetricChartSvg, {
        props: {
          title: 'Memoria RAM',
          currentValue: 0,
          history: [],
          maxVal: 100,
        },
      });

      expect(wrapper.find('svg.chart-svg').exists()).toBe(true);
      expect(wrapper.find('polyline').exists()).toBe(false);
    });
  });

  describe('OmonitorWindow Component', () => {
    it('se monta y renderiza correctamente sin errores con estado inicial', () => {
      const winStore = useWindowStore();
      winStore.openWindow('omonitor');

      const wrapper = mount(OmonitorWindow);
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.text()).toContain('Omonitor');
      expect(wrapper.text()).toContain('Rendimiento');
      expect(wrapper.text()).toContain('Procesos');
      expect(wrapper.text()).toContain('Telemetría y Tráfico');
    });
  });
});
