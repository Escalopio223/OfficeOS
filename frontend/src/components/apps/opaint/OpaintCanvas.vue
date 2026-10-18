<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, useTemplateRef } from 'vue';
import { usePaintStore } from '@/stores/paintStore';
import type { Point } from '@/types/paint';
import { BrushTool } from '@/utils/paint/tools/BrushTool';
import { EraserTool } from '@/utils/paint/tools/EraserTool';
import { ShapeTool } from '@/utils/paint/tools/ShapeTool';
import { FillTool } from '@/utils/paint/tools/FillTool';
import { SelectTool } from '@/utils/paint/tools/SelectTool';
import type { BaseTool } from '@/utils/paint/tools/BaseTool';

const paintStore = usePaintStore();

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');
const displayCanvasRef = useTemplateRef<HTMLCanvasElement>('displayCanvasRef');
const previewCanvasRef = useTemplateRef<HTMLCanvasElement>('previewCanvasRef');

// Instancias de herramientas
const toolsMap: Record<string, BaseTool> = {
  brush: new BrushTool(),
  eraser: new EraserTool(),
  shape: new ShapeTool(),
  fill: new FillTool(),
  select: new SelectTool(),
};

// Control de desplazamiento espacial (Pan) con barra espaciadora o botón central
const isSpacePressed = ref(false);
const isPanning = ref(false);
let startPanMouseX = 0;
let startPanMouseY = 0;
let initialPanX = 0;
let initialPanY = 0;

let previewCtx: CanvasRenderingContext2D | null = null;
let animationFrameId: number | null = null;

function getActiveTool(): BaseTool {
  const tool = toolsMap[paintStore.currentToolType];
  return tool ?? (toolsMap.brush as BaseTool);
}

// Transformación de coordenadas de pantalla a espacio de lienzo lógico
function screenToCanvas(e: MouseEvent | PointerEvent): Point {
  const container = containerRef.value;
  if (!container) return { x: 0, y: 0 };
  const rect = container.getBoundingClientRect();

  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const canvasX = (mouseX - paintStore.viewport.panX) / paintStore.viewport.zoom;
  const canvasY = (mouseY - paintStore.viewport.panY) / paintStore.viewport.zoom;

  return { x: canvasX, y: canvasY };
}

// Renderizado reactivo continuo de alta fidelidad
function renderViewport() {
  const displayCanvas = displayCanvasRef.value;
  if (!displayCanvas) return;
  const ctx = displayCanvas.getContext('2d');
  if (!ctx) return;

  const w = displayCanvas.width;
  const h = displayCanvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.save();
  // Aplicar transformación espacial de Viewport
  ctx.translate(paintStore.viewport.panX, paintStore.viewport.panY);
  ctx.scale(paintStore.viewport.zoom, paintStore.viewport.zoom);

  const cw = paintStore.viewport.canvasWidth;
  const ch = paintStore.viewport.canvasHeight;

  // Sombra elegante del documento
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  // Fondo del lienzo
  ctx.fillStyle = paintStore.viewport.backgroundColor || '#FFFFFF';
  ctx.fillRect(0, 0, cw, ch);

  ctx.shadowColor = 'transparent';

  // Renderizar capas ordenadas por zIndex
  for (const layer of paintStore.sortedLayers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  }

  // Previsualización interactiva flotante (overlay preview)
  if (previewCanvasRef.value) {
    ctx.drawImage(previewCanvasRef.value, 0, 0);
  }

  // Borde sutil del lienzo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1 / paintStore.viewport.zoom;
  ctx.strokeRect(0, 0, cw, ch);

  ctx.restore();
}

function scheduleRender() {
  if (animationFrameId !== null) return;
  animationFrameId = requestAnimationFrame(() => {
    animationFrameId = null;
    renderViewport();
  });
}

// Redimensionar tamaño del canvas display según su contenedor
function syncDisplaySize() {
  if (!containerRef.value || !displayCanvasRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  displayCanvasRef.value.width = rect.width;
  displayCanvasRef.value.height = rect.height;

  // El preview canvas tiene el tamaño lógico de las capas
  if (previewCanvasRef.value) {
    previewCanvasRef.value.width = paintStore.viewport.canvasWidth;
    previewCanvasRef.value.height = paintStore.viewport.canvasHeight;
    previewCtx = previewCanvasRef.value.getContext('2d');
  }

  scheduleRender();
}

// --- EVENTOS DEL PUNTERO EN EL LIENZO ---
function onPointerDown(e: PointerEvent) {
  // Clic derecho abre el menú radial flotante
  if (e.button === 2) {
    e.preventDefault();
    const container = containerRef.value;
    if (container) {
      const rect = container.getBoundingClientRect();
      paintStore.radialMenuPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      paintStore.isRadialMenuOpen = true;
    }
    return;
  }

  // Si el menú radial estaba abierto, cerrarlo con clic primario
  if (paintStore.isRadialMenuOpen) {
    paintStore.isRadialMenuOpen = false;
    return;
  }

  // Modo Pan (Barra espaciadora o botón central del ratón)
  if (isSpacePressed.value || e.button === 1 || paintStore.currentToolType === 'pan') {
    isPanning.value = true;
    startPanMouseX = e.clientX;
    startPanMouseY = e.clientY;
    initialPanX = paintStore.viewport.panX;
    initialPanY = paintStore.viewport.panY;
    return;
  }

  if (e.button !== 0) return; // Solo botón izquierdo para pintar

  const layer = paintStore.activeLayer;
  if (!layer || !previewCtx) return;

  const point = screenToCanvas(e);
  const tool = getActiveTool();

  tool.onPointerDown(point, e, layer, previewCtx, paintStore.brushSettings);
  scheduleRender();
}

function onPointerMove(e: PointerEvent) {
  if (isPanning.value) {
    const dx = e.clientX - startPanMouseX;
    const dy = e.clientY - startPanMouseY;
    paintStore.viewport.panX = initialPanX + dx;
    paintStore.viewport.panY = initialPanY + dy;
    scheduleRender();
    return;
  }

  const layer = paintStore.activeLayer;
  if (!layer || !previewCtx) return;

  const point = screenToCanvas(e);
  const tool = getActiveTool();

  tool.onPointerMove(point, e, layer, previewCtx, paintStore.brushSettings);
  scheduleRender();
}

function onPointerUp(e: PointerEvent) {
  if (isPanning.value) {
    isPanning.value = false;
    return;
  }

  const layer = paintStore.activeLayer;
  if (!layer || !previewCtx) return;

  const point = screenToCanvas(e);
  const tool = getActiveTool();

  const cmd = tool.onPointerUp(point, e, layer, previewCtx, paintStore.brushSettings);
  if (cmd) {
    paintStore.pushCommand(cmd);
  }

  scheduleRender();
}

// Zoom interactivo con rueda de ratón (centrado en el cursor)
function onWheel(e: WheelEvent) {
  e.preventDefault();
  const container = containerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const mousePoint = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };

  const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
  paintStore.setZoom(paintStore.viewport.zoom * zoomFactor, mousePoint);
  scheduleRender();
}

// Atajos de teclado para pan (barra espaciadora)
function onKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space' && !e.repeat && !isSpacePressed.value) {
    isSpacePressed.value = true;
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') {
    isSpacePressed.value = false;
    isPanning.value = false;
  }
}

// Centrar el lienzo inicialmente
function centerCanvasInViewport() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const cw = paintStore.viewport.canvasWidth;
  const ch = paintStore.viewport.canvasHeight;

  paintStore.viewport.panX = Math.round((rect.width - cw) / 2);
  paintStore.viewport.panY = Math.round((rect.height - ch) / 2);
  paintStore.viewport.zoom = 1.0;
  scheduleRender();
}

watch(
  () => [paintStore.layers, paintStore.viewport.zoom, paintStore.viewport.panX, paintStore.viewport.panY],
  () => scheduleRender(),
  { deep: true }
);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value) {
    syncDisplaySize();
    centerCanvasInViewport();

    resizeObserver = new ResizeObserver(() => {
      syncDisplaySize();
    });
    resizeObserver.observe(containerRef.value);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
});

onUnmounted(() => {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});

defineExpose({
  scheduleRender,
  centerCanvasInViewport,
});
</script>

<template>
  <div
    ref="containerRef"
    class="opaint-viewport-container"
    :class="{ 'is-panning': isPanning || isSpacePressed || paintStore.currentToolType === 'pan' }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
    @wheel="onWheel"
    @contextmenu.prevent
  >
    <!-- Canvas de presentación optimizado a resolución de pantalla -->
    <canvas ref="displayCanvasRef" class="display-canvas" />

    <!-- Canvas invisible offscreen/overlay para preview de herramientas -->
    <canvas ref="previewCanvasRef" class="preview-canvas" style="display: none;" />

    <!-- HUD de información de zoom en esquina inferior izquierda -->
    <div class="zoom-hud glass-pill">
      <span>{{ Math.round(paintStore.viewport.zoom * 100) }}%</span>
      <button class="hud-btn" title="Restablecer vista (100%)" @click.stop="paintStore.resetZoom">
        1:1
      </button>
      <button class="hud-btn" title="Centrar lienzo" @click.stop="centerCanvasInViewport">
        ⛶
      </button>
    </div>
  </div>
</template>

<style scoped>
.opaint-viewport-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #12141a;
  background-image:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
  cursor: crosshair;
  user-select: none;
  touch-action: none;
}

.opaint-viewport-container.is-panning {
  cursor: grab;
}

.opaint-viewport-container.is-panning:active {
  cursor: grabbing;
}

.display-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.zoom-hud {
  position: absolute;
  bottom: 24px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.hud-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.hud-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}
</style>
