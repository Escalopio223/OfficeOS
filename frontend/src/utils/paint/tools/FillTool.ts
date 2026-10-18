import { BaseTool } from './BaseTool';
import type { Point, PaintLayer, BrushSettings, ICommand, ToolType } from '@/types/paint';
import { DrawCommand } from '../commands/Command';
import { executeFloodFill } from '../floodFill';

export class FillTool extends BaseTool {
  readonly name: ToolType = 'fill';
  cursor = 'crosshair';

  private beforeImageData: ImageData | null = null;
  private hasFilled = false;

  onPointerDown(
    point: Point,
    _e: PointerEvent,
    layer: PaintLayer,
    _previewCtx: CanvasRenderingContext2D,
    settings: BrushSettings
  ): void {
    if (!layer.ctx) return;

    const { width, height } = layer.canvas;
    this.beforeImageData = layer.ctx.getImageData(0, 0, width, height);

    const fillColor = settings.useFill ? settings.fillColor : settings.color;
    this.hasFilled = executeFloodFill(layer.ctx, point, fillColor, settings.tolerance);
  }

  onPointerMove(): void {
    // No requiere acción continua en move
  }

  onPointerUp(
    _point: Point,
    _e: PointerEvent,
    layer: PaintLayer,
    _previewCtx: CanvasRenderingContext2D,
    _settings: BrushSettings
  ): ICommand | null {
    if (!this.hasFilled || !this.beforeImageData || !layer.ctx) {
      this.hasFilled = false;
      this.beforeImageData = null;
      return null;
    }

    const { width, height } = layer.canvas;
    const afterImageData = layer.ctx.getImageData(0, 0, width, height);

    const cmd = new DrawCommand(layer, this.beforeImageData, afterImageData, 'Relleno de Color');
    this.hasFilled = false;
    this.beforeImageData = null;
    return cmd;
  }
}
