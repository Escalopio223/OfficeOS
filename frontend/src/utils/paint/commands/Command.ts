import type { ICommand, PaintLayer } from '@/types/paint';

export class DrawCommand implements ICommand {
  name: string;
  private layer: PaintLayer;
  private beforeImageData: ImageData;
  private afterImageData: ImageData;

  constructor(
    layer: PaintLayer,
    beforeImageData: ImageData,
    afterImageData: ImageData,
    name = 'Trazo'
  ) {
    this.name = name;
    this.layer = layer;
    this.beforeImageData = beforeImageData;
    this.afterImageData = afterImageData;
  }

  execute(): void {
    this.layer.ctx.putImageData(this.afterImageData, 0, 0);
  }

  undo(): void {
    this.layer.ctx.putImageData(this.beforeImageData, 0, 0);
  }

  redo(): void {
    this.layer.ctx.putImageData(this.afterImageData, 0, 0);
  }
}

export class ClearCommand implements ICommand {
  name = 'Limpiar Capa';
  private layer: PaintLayer;
  private beforeImageData: ImageData;

  constructor(layer: PaintLayer, beforeImageData: ImageData) {
    this.layer = layer;
    this.beforeImageData = beforeImageData;
  }

  execute(): void {
    this.layer.ctx.clearRect(0, 0, this.layer.canvas.width, this.layer.canvas.height);
  }

  undo(): void {
    this.layer.ctx.putImageData(this.beforeImageData, 0, 0);
  }

  redo(): void {
    this.layer.ctx.clearRect(0, 0, this.layer.canvas.width, this.layer.canvas.height);
  }
}
