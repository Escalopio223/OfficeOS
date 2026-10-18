import type { Point, PaintLayer, BrushSettings, ICommand, ToolType } from '@/types/paint';

export abstract class BaseTool {
  abstract readonly name: ToolType;
  cursor = 'crosshair';

  abstract onPointerDown(
    point: Point,
    e: PointerEvent,
    layer: PaintLayer,
    previewCtx: CanvasRenderingContext2D,
    settings: BrushSettings
  ): void;

  abstract onPointerMove(
    point: Point,
    e: PointerEvent,
    layer: PaintLayer,
    previewCtx: CanvasRenderingContext2D,
    settings: BrushSettings
  ): void;

  abstract onPointerUp(
    point: Point,
    e: PointerEvent,
    layer: PaintLayer,
    previewCtx: CanvasRenderingContext2D,
    settings: BrushSettings
  ): ICommand | null;

  onCancel(previewCtx: CanvasRenderingContext2D): void {
    previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);
  }
}
