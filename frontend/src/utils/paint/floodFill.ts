import type { Point } from '@/types/paint';

function parseHexColor(hex: string): [number, number, number, number] {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  if (c.length === 6) {
    c += 'ff';
  }
  const num = parseInt(c, 16);
  return [
    (num >> 24) & 255,
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255,
  ];
}

function colorMatch(
  c1: [number, number, number, number],
  c2: [number, number, number, number],
  tolerance: number
): boolean {
  return (
    Math.abs(c1[0] - c2[0]) <= tolerance &&
    Math.abs(c1[1] - c2[1]) <= tolerance &&
    Math.abs(c1[2] - c2[2]) <= tolerance &&
    Math.abs(c1[3] - c2[3]) <= tolerance
  );
}

/**
 * Algoritmo de relleno por inundación (Flood Fill) optimizado para Canvas 2D
 */
export function executeFloodFill(
  ctx: CanvasRenderingContext2D,
  startPoint: Point,
  fillColorHex: string,
  tolerance = 20
): boolean {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  const startX = Math.floor(startPoint.x);
  const startY = Math.floor(startPoint.y);

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return false;
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const startIndex = (startY * width + startX) * 4;
  const targetColor: [number, number, number, number] = [
    data[startIndex] ?? 0,
    data[startIndex + 1] ?? 0,
    data[startIndex + 2] ?? 0,
    data[startIndex + 3] ?? 0,
  ];

  const fillColor = parseHexColor(fillColorHex);

  // Si el color objetivo ya es igual al color de relleno dentro de la tolerancia, abortar
  if (colorMatch(targetColor, fillColor, 2)) {
    return false;
  }

  const visited = new Uint8Array(width * height);
  const queue: number[] = [startX, startY];
  visited[startY * width + startX] = 1;

  const maxTolerance = (tolerance / 100) * 255;

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    if (cx === undefined || cy === undefined) break;

    const idx = (cy * width + cx) * 4;

    // Pintar píxel
    data[idx] = fillColor[0];
    data[idx + 1] = fillColor[1];
    data[idx + 2] = fillColor[2];
    data[idx + 3] = fillColor[3];

    // Inspeccionar 4 vecinos adyacentes
    const neighbors: [number, number][] = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (let i = 0; i < 4; i++) {
      const neighbor = neighbors[i];
      if (!neighbor) continue;
      const nx = neighbor[0];
      const ny = neighbor[1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!visited[nPos]) {
          const nIdx = nPos * 4;
          const neighborColor: [number, number, number, number] = [
            data[nIdx] ?? 0,
            data[nIdx + 1] ?? 0,
            data[nIdx + 2] ?? 0,
            data[nIdx + 3] ?? 0,
          ];

          if (colorMatch(targetColor, neighborColor, maxTolerance)) {
            visited[nPos] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return true;
}
