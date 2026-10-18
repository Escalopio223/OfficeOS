import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePaintStore } from '@/stores/paintStore';
import { serializeProject, compositeAllLayers, exportCanvasToSvg } from '@/utils/paint/serializer';
import { executeFloodFill } from '@/utils/paint/floodFill';
import type { ICommand } from '@/types/paint';

describe('Opaint Engine & Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    // Mock toDataURL para entorno jsdom
    HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement) {
      return 'data:image/png;base64,mockedPngData';
    };

    // Mock getContext('2d') para entorno jsdom
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
      if (type === '2d') {
        const dummyCanvas = this;
        return {
          canvas: dummyCanvas,
          clearRect: vi.fn(),
          fillRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          arc: vi.fn(),
          ellipse: vi.fn(),
          drawImage: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          strokeRect: vi.fn(),
          putImageData: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(dummyCanvas.width * dummyCanvas.height * 4),
            width: dummyCanvas.width,
            height: dummyCanvas.height,
          })),
        } as unknown as CanvasRenderingContext2D;
      }
      return null;
    } as any;
  });

  it('inicializa el lienzo por defecto con dimensiones y una capa activa', () => {
    const store = usePaintStore();
    store.initDefaultCanvas(800, 600, '#ffffff');

    expect(store.viewport.canvasWidth).toBe(800);
    expect(store.viewport.canvasHeight).toBe(600);
    expect(store.layers.length).toBe(1);
    expect(store.activeLayer).not.toBeNull();
    expect(store.activeLayer?.id).toBe(store.layers[0]?.id);
    expect(store.activeLayer?.visible).toBe(true);
  });

  it('permite añadir, reordenar y eliminar capas correctamente', () => {
    const store = usePaintStore();
    store.initDefaultCanvas(800, 600);

    const layer2 = store.addLayer('Capa Boceto');
    expect(store.layers.length).toBe(2);
    expect(store.activeLayerId).toBe(layer2.id);
    expect(layer2.zIndex).toBeGreaterThan(store.layers[0]?.zIndex ?? 0);

    // Reordenar capa
    const l1 = store.layers[0];
    if (l1) {
      const zBefore = l1.zIndex;
      store.reorderLayer(l1.id, 'up');
      expect(l1.zIndex).toBeGreaterThanOrEqual(zBefore);
    }

    // No debe permitir eliminar si solo queda 1 capa
    store.removeLayer(layer2.id);
    expect(store.layers.length).toBe(1);
    const deleteAttempt = store.removeLayer(store.layers[0]!.id);
    expect(deleteAttempt).toBe(false);
    expect(store.layers.length).toBe(1);
  });

  it('gestiona el historial Undo/Redo mediante el patrón Command', () => {
    const store = usePaintStore();
    store.initDefaultCanvas(400, 300);

    let executed = 0;
    const testCommand: ICommand = {
      name: 'Comando Prueba',
      execute: () => { executed++; },
      undo: () => { executed--; },
      redo: () => { executed++; },
    };

    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);

    store.pushCommand(testCommand);
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);

    store.undo();
    expect(executed).toBe(-1);
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(executed).toBe(0);
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);
  });

  it('serializa el proyecto Opaint a estructura JSON válida', () => {
    const store = usePaintStore();
    store.initDefaultCanvas(500, 400, '#f0f0f0');

    const projectData = serializeProject(
      'Arte.opaint',
      store.viewport.canvasWidth,
      store.viewport.canvasHeight,
      store.viewport.backgroundColor,
      store.layers
    );

    expect(projectData.version).toBe('1.0.0');
    expect(projectData.title).toBe('Arte.opaint');
    expect(projectData.canvas.width).toBe(500);
    expect(projectData.canvas.height).toBe(400);
    expect(projectData.canvas.backgroundColor).toBe('#f0f0f0');
    expect(projectData.layers.length).toBe(1);
    expect(projectData.layers[0]?.dataUrl).toContain('data:image/png;base64');
  });

  it('genera SVG válido a partir del lienzo compuesto', () => {
    const store = usePaintStore();
    store.initDefaultCanvas(200, 200, '#ffffff');

    const composite = compositeAllLayers(200, 200, '#ffffff', store.layers);
    const svg = exportCanvasToSvg(200, 200, '#ffffff', composite);

    expect(svg).toContain('<svg');
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="200"');
    expect(svg).toContain('<image');
  });

  it('ejecuta Flood Fill en límites válidos y detecta límites incorrectos', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d')!;
    expect(ctx).not.toBeNull();

    // Rellenar desde punto válido
    const filled = executeFloodFill(ctx, { x: 5, y: 5 }, '#4285F4', 10);
    expect(filled).toBe(true);

    // Puntos fuera de límites deben retornar false
    const outOfBounds = executeFloodFill(ctx, { x: -5, y: 100 }, '#EA4335', 10);
    expect(outOfBounds).toBe(false);
  });
});
