import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  PaintLayer,
  ToolType,
  BrushSettings,
  ViewportState,
  ICommand,
  OpaintProjectData,
  Point,
} from '@/types/paint';
import { ClearCommand } from '@/utils/paint/commands/Command';

export const usePaintStore = defineStore('paint', () => {
  // Dimensiones del lienzo lógico y viewport
  const viewport = ref<ViewportState>({
    zoom: 1.0,
    panX: 0,
    panY: 0,
    canvasWidth: 1200,
    canvasHeight: 800,
    backgroundColor: '#FFFFFF',
  });

  // Metadatos del proyecto y persistencia
  const projectName = ref('Nuevo Dibujo.opaint');
  const projectFileId = ref<string | null>(null);
  const isDirty = ref(false);

  // Capas del lienzo
  const layers = ref<PaintLayer[]>([]);
  const activeLayerId = ref<string>('');

  // Herramienta activa y configuraciones
  const currentToolType = ref<ToolType>('brush');

  const brushSettings = ref<BrushSettings>({
    color: '#4285F4',
    secondaryColor: '#FFFFFF',
    strokeWidth: 8,
    opacity: 1.0,
    shape: 'rect',
    fillColor: '#FBBC04',
    useFill: false,
    tolerance: 25,
    lineCap: 'round',
    lineJoin: 'round',
  });

  // Menú Radial Contextual
  const isRadialMenuOpen = ref(false);
  const radialMenuPos = ref<Point>({ x: 0, y: 0 });

  // Historial de Comandos (Undo / Redo)
  const history = ref<ICommand[]>([]);
  const historyIndex = ref<number>(-1);
  const maxHistory = 50;

  // Getters
  const activeLayer = computed(() => {
    return layers.value.find((l) => l.id === activeLayerId.value) || layers.value[0] || null;
  });

  const sortedLayers = computed(() => {
    return [...layers.value].sort((a, b) => a.zIndex - b.zIndex);
  });

  const canUndo = computed(() => historyIndex.value >= 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  // --- GESTIÓN DE CAPAS ---
  function helperCreateCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    return { canvas, ctx };
  }

  function initDefaultCanvas(width = 1200, height = 800, bg = '#FFFFFF') {
    viewport.value.canvasWidth = width;
    viewport.value.canvasHeight = height;
    viewport.value.backgroundColor = bg;
    viewport.value.zoom = 1.0;
    viewport.value.panX = 0;
    viewport.value.panY = 0;

    history.value = [];
    historyIndex.value = -1;
    isDirty.value = false;

    const { canvas, ctx } = helperCreateCanvas(width, height);
    const initialLayer: PaintLayer = {
      id: 'layer_1',
      name: 'Capa 1',
      visible: true,
      opacity: 1.0,
      zIndex: 1,
      canvas,
      ctx,
    };

    layers.value = [initialLayer];
    activeLayerId.value = initialLayer.id;
  }

  function addLayer(name?: string): PaintLayer {
    const nextZ = layers.value.reduce((max, l) => Math.max(max, l.zIndex), 0) + 1;
    const id = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const { canvas, ctx } = helperCreateCanvas(viewport.value.canvasWidth, viewport.value.canvasHeight);

    const newLayer: PaintLayer = {
      id,
      name: name || `Capa ${layers.value.length + 1}`,
      visible: true,
      opacity: 1.0,
      zIndex: nextZ,
      canvas,
      ctx,
    };

    layers.value.push(newLayer);
    activeLayerId.value = id;
    isDirty.value = true;
    return newLayer;
  }

  function removeLayer(id: string): boolean {
    if (layers.value.length <= 1) return false; // Al menos debe existir una capa
    const index = layers.value.findIndex((l) => l.id === id);
    if (index === -1) return false;

    layers.value.splice(index, 1);
    const fallback = layers.value[Math.max(0, index - 1)];
    if (activeLayerId.value === id && fallback) {
      activeLayerId.value = fallback.id;
    }
    isDirty.value = true;
    return true;
  }

  function reorderLayer(id: string, direction: 'up' | 'down') {
    const list = [...sortedLayers.value];
    const idx = list.findIndex((l) => l.id === id);
    if (idx === -1) return;

    if (direction === 'up' && idx < list.length - 1) {
      const current = list[idx];
      const next = list[idx + 1];
      if (current && next) {
        const tempZ = current.zIndex;
        current.zIndex = next.zIndex;
        next.zIndex = tempZ;
        isDirty.value = true;
      }
    } else if (direction === 'down' && idx > 0) {
      const current = list[idx];
      const prev = list[idx - 1];
      if (current && prev) {
        const tempZ = current.zIndex;
        current.zIndex = prev.zIndex;
        prev.zIndex = tempZ;
        isDirty.value = true;
      }
    }
  }

  function setLayerVisibility(id: string, visible: boolean) {
    const layer = layers.value.find((l) => l.id === id);
    if (layer) {
      layer.visible = visible;
      isDirty.value = true;
    }
  }

  function setLayerOpacity(id: string, opacity: number) {
    const layer = layers.value.find((l) => l.id === id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
      isDirty.value = true;
    }
  }

  // --- HISTORIAL (COMMAND PATTERN) ---
  function pushCommand(cmd: ICommand) {
    // Si estamos en un punto anterior del historial, truncar el futuro
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }

    history.value.push(cmd);
    if (history.value.length > maxHistory) {
      history.value.shift();
    } else {
      historyIndex.value++;
    }

    isDirty.value = true;
  }

  function undo() {
    if (!canUndo.value) return;
    const cmd = history.value[historyIndex.value];
    if (cmd) {
      cmd.undo();
      historyIndex.value--;
    }
  }

  function redo() {
    if (!canRedo.value) return;
    const nextIdx = historyIndex.value + 1;
    const cmd = history.value[nextIdx];
    if (cmd) {
      historyIndex.value = nextIdx;
      cmd.redo();
    }
  }

  function clearActiveLayer() {
    const layer = activeLayer.value;
    if (!layer || !layer.ctx) return;
    const beforeData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const cmd = new ClearCommand(layer, beforeData);
    cmd.execute();
    pushCommand(cmd);
  }

  // --- VIEWPORT / ZOOM / PAN ---
  function setZoom(newZoom: number, center?: Point) {
    const clamped = Math.max(0.1, Math.min(10.0, newZoom));
    if (center) {
      // Zoom centrado en el punto del cursor
      const ratio = clamped / viewport.value.zoom;
      viewport.value.panX = center.x - (center.x - viewport.value.panX) * ratio;
      viewport.value.panY = center.y - (center.y - viewport.value.panY) * ratio;
    }
    viewport.value.zoom = clamped;
  }

  function panBy(dx: number, dy: number) {
    viewport.value.panX += dx;
    viewport.value.panY += dy;
  }

  function resetZoom() {
    viewport.value.zoom = 1.0;
    viewport.value.panX = 0;
    viewport.value.panY = 0;
  }

  // --- CARGA DE PROYECTO DESDE JSON ---
  async function loadProject(data: OpaintProjectData) {
    viewport.value.canvasWidth = data.canvas.width;
    viewport.value.canvasHeight = data.canvas.height;
    viewport.value.backgroundColor = data.canvas.backgroundColor || '#FFFFFF';
    projectName.value = data.title || 'Dibujo.opaint';

    history.value = [];
    historyIndex.value = -1;

    const loadedLayers: PaintLayer[] = [];

    for (const serialized of data.layers) {
      const { canvas, ctx } = helperCreateCanvas(data.canvas.width, data.canvas.height);

      if (serialized.dataUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = serialized.dataUrl;
        });
      }

      loadedLayers.push({
        id: serialized.id,
        name: serialized.name,
        visible: serialized.visible !== false,
        opacity: serialized.opacity ?? 1.0,
        zIndex: serialized.zIndex ?? loadedLayers.length + 1,
        canvas,
        ctx,
      });
    }

    if (loadedLayers.length === 0) {
      initDefaultCanvas(data.canvas.width, data.canvas.height, data.canvas.backgroundColor);
    } else {
      layers.value = loadedLayers;
      const last = loadedLayers[loadedLayers.length - 1];
      if (last) {
        activeLayerId.value = last.id;
      }
    }

    isDirty.value = false;
  }

  return {
    viewport,
    projectName,
    projectFileId,
    isDirty,
    layers,
    activeLayerId,
    activeLayer,
    sortedLayers,
    currentToolType,
    brushSettings,
    isRadialMenuOpen,
    radialMenuPos,
    history,
    historyIndex,
    canUndo,
    canRedo,
    initDefaultCanvas,
    addLayer,
    removeLayer,
    reorderLayer,
    setLayerVisibility,
    setLayerOpacity,
    pushCommand,
    undo,
    redo,
    clearActiveLayer,
    setZoom,
    panBy,
    resetZoom,
    loadProject,
  };
});
