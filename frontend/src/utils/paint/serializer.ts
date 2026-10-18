import type { OpaintProjectData, PaintLayer, SerializedLayer } from '@/types/paint';

/**
 * Serializa el estado completo del proyecto Opaint a formato JSON estructurado
 */
export function serializeProject(
  title: string,
  width: number,
  height: number,
  backgroundColor: string,
  layers: PaintLayer[]
): OpaintProjectData {
  const serializedLayers: SerializedLayer[] = layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    zIndex: layer.zIndex,
    dataUrl: layer.canvas.toDataURL('image/png'),
  }));

  return {
    version: '1.0.0',
    title: title || 'Sin Título',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canvas: {
      width,
      height,
      backgroundColor,
    },
    layers: serializedLayers,
  };
}

/**
 * Compone todas las capas visibles en un único canvas plano respetando zIndex y opacidad
 */
export function compositeAllLayers(
  width: number,
  height: number,
  backgroundColor: string,
  layers: PaintLayer[]
): HTMLCanvasElement {
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return outCanvas;

  // Fondo si no es transparente
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Ordenar capas por zIndex ascendente
  const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sorted) {
    if (!layer.visible || layer.opacity <= 0) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  }

  return outCanvas;
}

/**
 * Exporta un canvas a un Blob en formato PNG o WebP
 */
export function exportCanvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: 'image/png' | 'image/webp' | 'image/jpeg' = 'image/png',
  quality = 0.95
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

/**
 * Genera un SVG estructurado que encapsula el lienzo compuesto
 */
export function exportCanvasToSvg(
  width: number,
  height: number,
  backgroundColor: string,
  compositeCanvas: HTMLCanvasElement
): string {
  const pngData = compositeCanvas.toDataURL('image/png');
  const bgRect = backgroundColor && backgroundColor !== 'transparent'
    ? `<rect width="${width}" height="${height}" fill="${backgroundColor}" />`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${bgRect}
  <image width="${width}" height="${height}" xlink:href="${pngData}" />
</svg>`;
}

/**
 * Descarga directamente un archivo o Blob al sistema operativo real del usuario
 */
export function triggerHostDownload(data: Blob | string, filename: string): void {
  const url = typeof data === 'string'
    ? (data.startsWith('data:') ? data : URL.createObjectURL(new Blob([data], { type: 'text/plain;charset=utf-8' })))
    : URL.createObjectURL(data);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (typeof data !== 'string' || !data.startsWith('data:')) {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
