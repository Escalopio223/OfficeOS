import { BaseTool } from './BaseTool';
import type { Point, PaintLayer, BrushSettings, ICommand, ToolType } from '@/types/paint';
import { DrawCommand } from '../commands/Command';

export class EraserTool extends BaseTool {
  readonly name: ToolType = 'eraser';
  cursor = 'cell';

  private isDrawing = false;
  private points: Point[] = [];
  private beforeImageData: ImageData | null = null;

  onPointerDown(
    point: Point,
    _e: PointerEvent,
    layer: PaintLayer,
    _previewCtx: CanvasRenderingContext2D,
    settings: BrushSettings
  ): void {
    if (!layer.ctx) return;
    this.isDrawing = true;
    this.points = [point];

    const { width, height } = layer.canvas;
    this.beforeImageData = layer.ctx.getImageData(0, 0, width, height);

    layer.ctx.save();
    layer.ctx.globalCompositeOperation = 'destination-out';
    layer.ctx.lineWidth = settings.strokeWidth * 1.5; // El borrador suele ser algo más amplio
    layer.ctx.lineCap = 'round';
    layer.ctx.lineJoin = 'round';

    // Borrado inicial en el punto
    layer.ctx.beginPath();
    layer.ctx.arc(point.x, point.y, (settings.strokeWidth * 1.5) / 2, 0, Math.PI * 2);
    layer.ctx.fill();
  }

  onPointerMove(
    point: Point,
    _e: PointerEvent,
    layer: PaintLayer,
    _previewCtx: CanvasRenderingContext2D,
    _settings: BrushSettings
  ): void {
    if (!this.isDrawing || !layer.ctx) return;

    this.points.push(point);

    if (this.points.length < 2) return;

    const len = this.points.length;
    const p1 = this.points[len - 2];
    const p2 = this.points[len - 1];

    if (!p1 || !p2) return;

    layer.ctx.beginPath();
    layer.ctx.moveTo(p1.x, p1.y);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    layer.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    layer.ctx.stroke();
  }

  onPointerUp(
    _point: Point,
    _e: PointerEvent,
    layer: PaintLayer,
    _previewCtx: CanvasRenderingContext2D,
    _settings: BrushSettings
  ): ICommand | null {
    if (!this.isDrawing || !this.beforeImageData || !layer.ctx) {
      this.isDrawing = false;
      return null;
    }

    layer.ctx.restore();
    this.isDrawing = false;
    this.points = [];

    const { width, height } = layer.canvas;
    const afterImageData = layer.ctx.getImageData(0, 0, width, height);

    const cmd = new DrawCommand(layer, this.beforeImageData, afterImageData, 'Borrador');
    this.beforeImageData = null;
    return cmd;
  }
}
