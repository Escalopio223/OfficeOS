import { BaseTool } from './BaseTool';
import type { Point, PaintLayer, BrushSettings, ICommand, ToolType, RectBounds } from '@/types/paint';

export class SelectTool extends BaseTool {
  readonly name: ToolType = 'select';
  cursor = 'crosshair';

  private isSelecting = false;
  private startPoint: Point | null = null;
  public selection: RectBounds | null = null;

  onPointerDown(
    point: Point,
    _e: PointerEvent,
    _layer: PaintLayer,
    _previewCtx: CanvasRenderingContext2D,
    _settings: BrushSettings
  ): void {
    this.isSelecting = true;
    this.startPoint = point;
    this.selection = null;
  }

  onPointerMove(
    point: Point,
    _e: PointerEvent,
    _layer: PaintLayer,
    previewCtx: CanvasRenderingContext2D,
    _settings: BrushSettings
  ): void {
    if (!this.isSelecting || !this.startPoint || !previewCtx) return;

    previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);

    const x = Math.min(this.startPoint.x, point.x);
    const y = Math.min(this.startPoint.y, point.y);
    const w = Math.abs(point.x - this.startPoint.x);
    const h = Math.abs(point.y - this.startPoint.y);

    this.renderMarquee(previewCtx, x, y, w, h);
  }

  onPointerUp(
    point: Point,
    _e: PointerEvent,
    _layer: PaintLayer,
    previewCtx: CanvasRenderingContext2D,
    _settings: BrushSettings
  ): ICommand | null {
    if (!this.isSelecting || !this.startPoint || !previewCtx) {
      this.isSelecting = false;
      return null;
    }

    const x = Math.min(this.startPoint.x, point.x);
    const y = Math.min(this.startPoint.y, point.y);
    const w = Math.abs(point.x - this.startPoint.x);
    const h = Math.abs(point.y - this.startPoint.y);

    if (w > 4 && h > 4) {
      this.selection = { x, y, width: w, height: h };
      this.renderMarquee(previewCtx, x, y, w, h);
    } else {
      this.selection = null;
      previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);
    }

    this.isSelecting = false;
    this.startPoint = null;
    return null;
  }

  private renderMarquee(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(66, 133, 244, 0.12)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = '#4285F4';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  clearSelection(previewCtx: CanvasRenderingContext2D): void {
    this.selection = null;
    previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);
  }
}
