import zlib from 'zlib';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function createRng(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLIENTES = [
  { name: 'Tech Solutions Iberia S.L.', cif: 'B87654321' },
  { name: 'Logística Global del Norte S.A.', cif: 'A12345678' },
  { name: 'Consultoría Estratégica Nexus', cif: 'B99887766' },
  { name: 'Almacenes e Industrias Alfa', cif: 'B55443322' },
  { name: 'Sistemas Cloud Avanzados S.L.', cif: 'B11223344' },
  { name: 'Innovaciones Digitales Madrid', cif: 'B33445566' },
  { name: 'Servicios de Telecomunicaciones Sur', cif: 'A77889900' },
  { name: 'Distribuciones Comerciales Oogle', cif: 'B66778899' },
];

const CONCEPTOS = [
  { desc: 'Licencia Servidor Enterprise', cat: 'Software', basePrice: 450.0 },
  { desc: 'Mantenimiento Preventivo Mensual', cat: 'Servicios', basePrice: 120.0 },
  { desc: 'Consultoría Arquitectura Cloud', cat: 'Consultoría', basePrice: 85.0 },
  { desc: 'Disco SSD NVMe 2TB Enterprise', cat: 'Hardware', basePrice: 195.5 },
  { desc: 'Memoria RAM 64GB DDR5 ECC', cat: 'Hardware', basePrice: 220.0 },
  { desc: 'Switch Gestionado 24p Gigabit', cat: 'Redes', basePrice: 340.0 },
  { desc: 'Copia de Seguridad en la Nube 1TB', cat: 'Cloud', basePrice: 45.0 },
  { desc: 'Certificado SSL Wildcard Anual', cat: 'Seguridad', basePrice: 89.0 },
  { desc: 'Auditoría de Vulnerabilidades', cat: 'Seguridad', basePrice: 650.0 },
  { desc: 'Router Fibra Óptica Balanceador', cat: 'Redes', basePrice: 280.0 },
  { desc: 'Cableado Estructurado Cat6A (Bobina)', cat: 'Redes', basePrice: 135.0 },
  { desc: 'Monitor 27" IPS Profesional', cat: 'Periféricos', basePrice: 215.0 },
  { desc: 'Teclado Mecánico y Ratón Ergonómico', cat: 'Periféricos', basePrice: 85.0 },
  { desc: 'Desarrollo API REST a Medida (Horas)', cat: 'Desarrollo', basePrice: 60.0 },
  { desc: 'Soporte Técnico Especializado 24/7', cat: 'Soporte', basePrice: 300.0 },
];

/**
 * Genera el contenido de una factura CSV virtual determinista con cabecera y mínimo 25 líneas.
 */
export function generateDeterministicInvoiceCsv(seedKey: string, fileName: string): string {
  const seed = hashString(seedKey || fileName);
  const rng = createRng(seed);

  const cliente = CLIENTES[Math.floor(rng() * CLIENTES.length)];
  const yearMatch = fileName.match(/202[4-6]/) || ['2025'];
  const year = yearMatch[0];
  const numFactura = `FAC-${year}-${Math.floor(rng() * 90000 + 10000)}`;

  const headers = ['id', 'fecha', 'factura_no', 'cliente', 'cif_nif', 'concepto', 'categoria', 'unidades', 'precio_unitario', 'subtotal', 'iva_pct', 'total'];
  const lines: string[] = [headers.join(',')];

  const totalLines = 25 + Math.floor(rng() * 6); // entre 25 y 30 líneas
  let sumSubtotal = 0;

  for (let i = 1; i <= totalLines; i++) {
    const item = CONCEPTOS[Math.floor(rng() * CONCEPTOS.length)];
    const month = String(Math.floor(rng() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(rng() * 28) + 1).padStart(2, '0');
    const fecha = `${year}-${month}-${day}`;

    const unidades = Math.floor(rng() * 8) + 1;
    const variacionPrecio = +(item.basePrice * (0.9 + rng() * 0.2)).toFixed(2);
    const subtotal = +(unidades * variacionPrecio).toFixed(2);
    const ivaPct = 21;
    const total = +(subtotal * 1.21).toFixed(2);

    sumSubtotal += subtotal;

    lines.push([
      i,
      fecha,
      numFactura,
      `"${cliente.name}"`,
      cliente.cif,
      `"${item.desc} #${i}"`,
      item.cat,
      unidades,
      variacionPrecio.toFixed(2),
      subtotal.toFixed(2),
      ivaPct,
      total.toFixed(2),
    ].join(','));
  }

  // Línea final de balance resumen
  const totalIva = +(sumSubtotal * 0.21).toFixed(2);
  const granTotal = +(sumSubtotal + totalIva).toFixed(2);
  lines.push([
    'TOTALES',
    `${year}-12-31`,
    numFactura,
    `"${cliente.name}"`,
    cliente.cif,
    '"RESUMEN TOTAL FACTURA"',
    'BALANCE',
    totalLines,
    '',
    sumSubtotal.toFixed(2),
    '21.00',
    granTotal.toFixed(2),
  ].join(','));

  return lines.join('\n');
}

/**
 * Genera código determinista funcional según extensión (.js, .ts, .json, .sql, .md, .txt)
 */
export function generateDeterministicCode(seedKey: string, fileName: string): string {
  const seed = hashString(seedKey || fileName);
  const rng = createRng(seed);
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.json')) {
    return JSON.stringify(
      {
        name: fileName.replace(/\.json$/i, ''),
        version: `${Math.floor(rng() * 3 + 1)}.${Math.floor(rng() * 10)}.${Math.floor(rng() * 20)}`,
        description: `Módulo generado automáticamente para OogleOS: ${fileName}`,
        private: true,
        scripts: {
          build: 'tsc -b && vite build',
          lint: 'eslint . --ext .ts,.vue',
          test: 'vitest run',
        },
        metadata: {
          seed: seedKey,
          checksum: `sha256-${seed.toString(16).padStart(16, '0')}`,
          engine: 'VirtualFilesystem-LTree',
          indexed_nodes: 100000,
        },
        dependencies: {
          '@fastify/cors': '^11.3.1',
          fastify: '^5.12.5',
          ioredis: '^6.0.0',
          pg: '^8.23.1',
          vue: '^3.5.13',
        },
      },
      null,
      2
    );
  }

  if (lower.endsWith('.ts') || lower.endsWith('.js')) {
    const isTs = lower.endsWith('.ts');
    const typeStr = isTs ? ': Promise<{ success: boolean; data: any; durationMs: number }>' : '';
    const paramType = isTs ? 'params: Record<string, any>' : 'params';
    const funcName = fileName.replace(/\.[a-z]+$/i, '').replace(/[^a-zA-Z0-9]/g, '_');

    return `/**
 * OogleOS Virtual Code Engine
 * File: ${fileName}
 * Seed: ${seedKey}
 */

export interface ${funcName}Config {
  retries: number;
  timeoutMs: number;
  verbose: boolean;
}

export const defaultConfig = {
  retries: ${Math.floor(rng() * 5 + 1)},
  timeoutMs: ${Math.floor(rng() * 4000 + 1000)},
  verbose: ${rng() > 0.5 ? 'true' : 'false'},
};

export async function execute_${funcName}(${paramType})${typeStr} {
  const startTime = Date.now();
  console.log('[OogleOS] Executing ${funcName}...', params);

  // Simulación de procesamiento de datos en nodo
  const buffer = Buffer.alloc(${Math.floor(rng() * 512 + 64)});
  buffer.fill(${Math.floor(rng() * 255)});

  const durationMs = Date.now() - startTime;
  return {
    success: true,
    data: {
      fileName: '${fileName}',
      bufferLength: buffer.length,
      timestamp: new Date().toISOString(),
    },
    durationMs,
  };
}

export default execute_${funcName};
`;
  }

  if (lower.endsWith('.sql')) {
    return `-- OogleOS Virtual Migration / Script
-- File: ${fileName}
-- Generated for node: ${seedKey}

BEGIN;

CREATE TABLE IF NOT EXISTS sample_table_${seed.toString(16).slice(0, 6)} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_name VARCHAR(100) NOT NULL,
  amount NUMERIC(10, 2) DEFAULT ${(rng() * 5000).toFixed(2)},
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO sample_table_${seed.toString(16).slice(0, 6)} (record_name, amount)
VALUES
  ('${fileName}_entry_1', ${(rng() * 1000).toFixed(2)}),
  ('${fileName}_entry_2', ${(rng() * 1000).toFixed(2)}),
  ('${fileName}_entry_3', ${(rng() * 1000).toFixed(2)});

COMMIT;
`;
  }

  if (lower.endsWith('.md')) {
    return `# Documentación: ${fileName}

**Ruta Virtual:** \`${fileName}\`  
**Identificador de Nodo:** \`${seedKey}\`  
**Estado:** Activo en Sistema de Archivos Híbrido OogleOS (100k nodos)

---

### Descripción del Componente
Este archivo forma parte del repositorio virtual indexado en PostgreSQL mediante \`ltree\` y caché en Redis.
Se genera al vuelo de forma determinista para garantizar un consumo nulo de almacenamiento en disco para ficheros de código y documentación.

### Especificaciones
- **Lectura:** Endpoint \`GET /api/files/:id/raw\`
- **Descarga:** Endpoint \`GET /api/files/:id/download\`
- **Tipo de Almacenamiento:** \`VIRTUAL\`
- **Semilla Hash:** \`${seed}\`

### Historial de cambios
1. Inicialización en jerarquía raíz.
2. Indexación B-Tree y GiST.
3. Validación en pruebas de carga de 100.000 nodos.
`;
  }

  // Formato de texto / logs por defecto
  return `[OogleOS Virtual Text File]
Nombre: ${fileName}
ID de Nodo: ${seedKey}
Fecha: ${new Date().toISOString()}

Registro de actividad del sistema:
- [00:00:01] INFO  Kernel inicializado con éxito.
- [00:00:02] DEBUG PostgreSQL pool conectado en puerto 5433.
- [00:00:03] INFO  Redis cache lista (TTL 60s).
- [00:00:04] INFO  Nodo ${fileName} verificado correctamente.
`;
}

/**
 * Genera un PDF binario mínimo estándar y válido (%PDF-1.4) con texto visible.
 */
export function generateDeterministicPdf(seedKey: string, fileName: string): Buffer {
  const seed = hashString(seedKey || fileName);
  const rng = createRng(seed);

  const cleanTitle = fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_\-\. ]/g, ' ');
  const refCode = `DOC-${seed.toString(16).slice(0, 6).toUpperCase()}-${Math.floor(rng() * 9000 + 1000)}`;
  const dateStr = `2026-0${Math.floor(rng() * 9 + 1)}-${String(Math.floor(rng() * 28 + 1)).padStart(2, '0')}`;

  const paragraphs = [
    `Este documento confidencial certifica los registros y especificaciones del archivo ${fileName}.`,
    `1. OBJETO: Auditoria de integridad de arquitectura hibrida para el sistema operativo OogleOS.`,
    `2. ALCANCE: Indexacion de 100.000 nodos en PostgreSQL con extension ltree y aceleracion Redis.`,
    `3. RESOLUCION: Se valida la disponibilidad del servicio y la entrega de binarios en streaming.`,
    `4. CONFORMIDAD: El presente archivo se encuentra firmado digitalmente por la autoridad Opdf.`
  ];

  const streamLines: string[] = [
    'q',
    '0.92 0.26 0.21 rg',
    '45 795 505 6 re f', // Barra roja Opdf
    'Q',
    'BT',
    '/F1 10 Tf',
    '0.4 0.45 0.5 rg',
    '45 775 Td',
    `(OOGLEOS SUITE - OPDF | REF: ${refCode}) Tj`,
    'ET',
    'BT',
    '/F1 18 Tf',
    '0.1 0.15 0.25 rg',
    '45 745 Td',
    `(${cleanTitle}) Tj`,
    'ET',
    'BT',
    '/F1 9 Tf',
    '0.5 0.55 0.6 rg',
    '45 722 Td',
    `(Fecha de emision: ${dateStr}   |   ID de Nodo: ${seedKey.slice(0, 18)}...) Tj`,
    'ET',
    'q',
    '0.85 0.88 0.92 RG',
    '1 w',
    '45 708 m 550 708 l S',
    'Q'
  ];

  streamLines.push('BT', '/F1 11 Tf', '20 TL', '0.15 0.18 0.22 rg', '45 675 Td');
  for (let i = 0; i < paragraphs.length; i++) {
    streamLines.push(`(${paragraphs[i]}) Tj`);
    if (i < paragraphs.length - 1) {
      streamLines.push('T*');
    }
  }
  streamLines.push('ET');

  // Firma
  streamLines.push(
    'q',
    '0.85 0.88 0.92 RG',
    '1 w',
    '45 100 m 200 100 l S',
    'Q',
    'BT',
    '/F1 9 Tf',
    '0.4 0.45 0.5 rg',
    '45 85 Td',
    '(Firma Autorizada: Direccion de Tecnologia) Tj',
    'ET',
    // Pie de página
    'q',
    '0.85 0.88 0.92 RG',
    '1 w',
    '45 50 m 550 50 l S',
    'Q',
    'BT',
    '/F1 8 Tf',
    '0.55 0.6 0.65 rg',
    '45 36 Td',
    '(OogleOS Opdf Viewer | Documento PDF Oficial) Tj',
    'ET',
    'BT',
    '/F1 8 Tf',
    '0.55 0.6 0.65 rg',
    '500 36 Td',
    '(Pagina 1 / 1) Tj',
    'ET'
  );

  const streamContent = streamLines.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'ascii');

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
  const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n';

  const header = '%PDF-1.4\n%Opdf-Standard-1.4\n';
  const offsets: number[] = [0];
  let cur = Buffer.byteLength(header, 'ascii');

  const objects = [obj1, obj2, obj3, obj4, obj5];
  for (const obj of objects) {
    offsets.push(cur);
    cur += Buffer.byteLength(obj, 'ascii');
  }

  const startXref = cur;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  const fullPdf = header + objects.join('') + xref;
  return Buffer.from(fullPdf, 'ascii');
}

/**
 * Genera un PNG válido de 64x64 con colores deterministas basados en el nombre.
 */
export function generateDeterministicPaintPng(seedKey: string, fileName: string): Buffer {
  const seed = hashString(seedKey || fileName);
  const rng = createRng(seed);

  const width = 64;
  const height = 64;

  const r1 = Math.floor(rng() * 200 + 40);
  const g1 = Math.floor(rng() * 200 + 40);
  const b1 = Math.floor(rng() * 200 + 40);

  const r2 = (r1 + 80) % 256;
  const g2 = (g1 + 80) % 256;
  const b2 = (b1 + 80) % 256;

  // Raw pixel data: 1 byte filter type (0 = none) + width * 3 bytes (RGB) per row
  const rowBytes = 1 + width * 3;
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None
    const ratio = y / height;
    const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 3;
      // Añadir un borde decorativo
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        rawData[px] = 30;
        rawData[px + 1] = 41;
        rawData[px + 2] = 59;
      } else {
        rawData[px] = r;
        rawData[px + 1] = g;
        rawData[px + 2] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // Construcción de PNG (Signature + IHDR + IDAT + IEND)
  function createChunk(type: string, data: Buffer): Buffer {
    const len = data.length;
    const header = Buffer.alloc(8);
    header.writeUInt32BE(len, 0);
    header.write(type, 4, 4, 'ascii');

    const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = crc32(crcBuf);

    const footer = Buffer.alloc(4);
    footer.writeUInt32BE(crc, 0);

    return Buffer.concat([header, data, footer]);
  }

  // Tabla CRC32
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width(4), height(4), bitDepth(1)=8, colorType(1)=2 (RGB), compression(1)=0, filter(1)=0, interlace(1)=0
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2; // RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}
