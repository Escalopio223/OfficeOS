export type ToolType = 'select' | 'brush' | 'eraser' | 'shape' | 'fill' | 'pan';

export type ShapeType = 'rect' | 'ellipse' | 'line' | 'arrow';

export interface Point {
  x: number;
  y: number;
}

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PaintLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0.0 a 1.0
  zIndex: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface BrushSettings {
  color: string;
  secondaryColor: string;
  strokeWidth: number; // 1 a 100
  opacity: number; // 0.0 a 1.0
  shape: ShapeType;
  fillColor: string;
  useFill: boolean;
  tolerance: number; // 0 a 100 para Flood Fill
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
}

export interface ViewportState {
  zoom: number; // 0.1 a 10.0
  panX: number;
  panY: number;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
}

export interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  dataUrl: string; // PNG en Base64
}

export interface OpaintProjectData {
  version: '1.0.0';
  title: string;
  createdAt: string;
  updatedAt: string;
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  layers: SerializedLayer[];
}

export interface ICommand {
  name: string;
  execute: () => void;
  undo: () => void;
  redo: () => void;
}
