import { BaseTool } from './BaseTool';
import type { Point, PaintLayer, BrushSettings, ICommand, ToolType, ShapeType } from '@/types/paint';
import { DrawCommand } from '../commands/Command';

export class ShapeTool extends BaseTool {
  readonly name: ToolType = 'shape';
  cursor = 'crosshair';

  private isDrawing = false;
  private startPoint: Point | null = null;
  private beforeImageData: ImageData | null = null;

  onPointerDown(
    point: Point,
    _e: PointerEvent,
    layer: PaintLayer,
    _previewCtx: CanvasRenderingContext2D,
    _settings: BrushSettings
  ): void {
    if (!layer.ctx) return;
    this.isDrawing = true;
    this.startPoint = point;

    const { width, height } = layer.canvas;
    this.beforeImageData = layer.ctx.getImageData(0, 0, width, height);
  }

  onPointerMove(
    point: Point,
    e: PointerEvent,
    _layer: PaintLayer,
    previewCtx: CanvasRenderingContext2D,
    settings: BrushSettings
  ): void {
    if (!this.isDrawing || !this.startPoint || !previewCtx) return;

    previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);

    this.renderShape(previewCtx, this.startPoint, point, settings, e.shiftKey);
  }

  onPointerUp(
    point: Point,
    e: PointerEvent,
    layer: PaintLayer,
    previewCtx: CanvasRenderingContext2D,
    settings: BrushSettings
  ): ICommand | null {
    if (!this.isDrawing || !this.startPoint || !this.beforeImageData || !layer.ctx) {
      this.isDrawing = false;
      previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);
      return null;
    }

    // Limpiar canvas de preview
    previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);

    // Dibujar en la capa real
    this.renderShape(layer.ctx, this.startPoint, point, settings, e.shiftKey);

    const { width, height } = layer.canvas;
    const afterImageData = layer.ctx.getImageData(0, 0, width, height);

    const cmd = new DrawCommand(layer, this.beforeImageData, afterImageData, `Forma (${settings.shape})`);
    this.isDrawing = false;
    this.startPoint = null;
    this.beforeImageData = null;
    return cmd;
  }

  private renderShape(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    settings: BrushSettings,
    lockRatio = false
  ): void {
    ctx.save();
    ctx.strokeStyle = settings.color;
    ctx.fillStyle = settings.fillColor;
    ctx.lineWidth = settings.strokeWidth;
    ctx.lineCap = settings.lineCap || 'round';
    ctx.lineJoin = settings.lineJoin || 'round';
    ctx.globalAlpha = settings.opacity;

    let width = end.x - start.x;
    let height = end.y - start.y;

    if (lockRatio) {
      const maxDim = Math.max(Math.abs(width), Math.abs(height));
      width = width < 0 ? -maxDim : maxDim;
      height = height < 0 ? -maxDim : maxDim;
    }

    switch (settings.shape) {
      case 'rect': {
        const x = width < 0 ? start.x + width : start.x;
        const y = height < 0 ? start.y + height : start.y;
        const w = Math.abs(width);
        const h = Math.abs(height);

        if (settings.useFill) {
          ctx.fillRect(x, y, w, h);
        }
        ctx.strokeRect(x, y, w, h);
        break;
      }

      case 'ellipse': {
        const radiusX = Math.abs(width) / 2;
        const radiusY = Math.abs(height) / 2;
        const centerX = start.x + width / 2;
        const centerY = start.y + height / 2;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, Math.max(0.1, radiusX), Math.max(0.1, radiusY), 0, 0, Math.PI * 2);
        if (settings.useFill) {
          ctx.fill();
        }
        ctx.stroke();
        break;
      }

      case 'line': {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(start.x + width, start.y + height);
        ctx.stroke();
        break;
      }

      case 'arrow': {
        const targetX = start.x + width;
        const targetY = start.y + height;
        const angle = Math.atan2(targetY - start.y, targetX - start.x);
        const headLen = Math.max(12, settings.strokeWidth * 3);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        // Punta de la flecha
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(
          targetX - headLen * Math.cos(angle - Math.PI / 6),
          targetY - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          targetX - headLen * Math.cos(angle + Math.PI / 6),
          targetY - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = settings.color;
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }
}
