/**
 * OogleOS PDF Engine - Generador de binarios PDF estándar (%PDF-1.4)
 * Produce archivos PDF reales, válidos y compatibles con Adobe Acrobat, navegadores y visores del SO.
 */

export interface PdfDocumentData {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  category?: string;
  content: string;
}

function escapePdfText(text: string): string {
  // En PDF se escapan (, ), y \
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    // Normalizar tildes y caracteres especiales a equivalentes ASCII seguros para Type1 Helvetica
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Divide un texto largo en líneas que caben en un ancho dado (en caracteres aproximados).
 */
function wrapText(text: string, maxCharsPerLine = 75): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > maxCharsPerLine) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
  }

  return lines;
}

/**
 * Genera un Buffer binario Uint8Array con la estructura PDF-1.4 canónica
 */
export function buildStandardPdf(doc: PdfDocumentData): Uint8Array {
  const cleanTitle = escapePdfText(doc.title || 'Documento Opdf');
  const cleanSubtitle = escapePdfText(doc.subtitle || 'Documento Oficial de OogleOS');
  const cleanAuthor = escapePdfText(doc.author || 'Usuario OogleOS');
  const cleanDate = escapePdfText(doc.date || new Date().toLocaleDateString());
  const cleanCategory = escapePdfText(doc.category || 'GENERAL');

  const wrappedLines = wrapText(doc.content || 'Este documento fue generado con Opdf.');

  // Construir las instrucciones de dibujo y texto en PDF stream
  const streamLines: string[] = [];

  // Barra superior decorativa roja Opdf (RGB: 234/255, 67/255, 53/255 -> 0.92, 0.26, 0.21)
  streamLines.push('q');
  streamLines.push('0.92 0.26 0.21 rg');
  streamLines.push('45 795 505 6 re f'); // Barra decorativa superior
  streamLines.push('Q');

  // Cabecera institucional
  streamLines.push('BT');
  streamLines.push('/F1 10 Tf');
  streamLines.push('0.4 0.45 0.5 rg');
  streamLines.push('45 775 Td');
  streamLines.push(`(OOGLEOS - OPDF SUITE | CATEGORIA: ${cleanCategory.toUpperCase()}) Tj`);
  streamLines.push('ET');

  // Título del Documento
  streamLines.push('BT');
  streamLines.push('/F1 20 Tf');
  streamLines.push('0.1 0.15 0.25 rg');
  streamLines.push('45 745 Td');
  streamLines.push(`(${cleanTitle}) Tj`);
  streamLines.push('ET');

  // Subtítulo
  if (cleanSubtitle) {
    streamLines.push('BT');
    streamLines.push('/F2 12 Tf');
    streamLines.push('0.3 0.35 0.4 rg');
    streamLines.push('45 725 Td');
    streamLines.push(`(${cleanSubtitle}) Tj`);
    streamLines.push('ET');
  }

  // Metadatos (Autor y Fecha)
  streamLines.push('BT');
  streamLines.push('/F2 9 Tf');
  streamLines.push('0.5 0.55 0.6 rg');
  streamLines.push('45 700 Td');
  streamLines.push(`(Autor: ${cleanAuthor}   |   Fecha: ${cleanDate}) Tj`);
  streamLines.push('ET');

  // Línea divisoria
  streamLines.push('q');
  streamLines.push('0.85 0.88 0.92 RG');
  streamLines.push('1 w');
  streamLines.push('45 688 m 550 688 l S');
  streamLines.push('Q');

  // Cuerpo del texto
  let currentY = 665;
  const lineHeight = 16;
  const bottomLimit = 75;

  streamLines.push('BT');
  streamLines.push('/F2 11 Tf');
  streamLines.push('0.15 0.18 0.22 rg');
  streamLines.push(`45 ${currentY} Td`);

  for (const line of wrappedLines) {
    if (currentY <= bottomLimit) {
      // Si se acaba la página en un documento de 1 página simple, omitir o cortar ordenadamente
      break;
    }

    if (line === '') {
      streamLines.push('T*');
      currentY -= lineHeight * 0.7;
    } else {
      const safeLine = escapePdfText(line);
      streamLines.push(`(${safeLine}) '`);
      currentY -= lineHeight;
    }
  }
  streamLines.push('ET');

  // Pie de página oficial
  streamLines.push('q');
  streamLines.push('0.85 0.88 0.92 RG');
  streamLines.push('1 w');
  streamLines.push('45 50 m 550 50 l S');
  streamLines.push('Q');

  streamLines.push('BT');
  streamLines.push('/F2 8 Tf');
  streamLines.push('0.55 0.6 0.65 rg');
  streamLines.push('45 36 Td');
  streamLines.push('(Documento verificado por Opdf | OogleOS Sistema Operativo Web) Tj');
  streamLines.push('ET');

  streamLines.push('BT');
  streamLines.push('/F1 8 Tf');
  streamLines.push('0.55 0.6 0.65 rg');
  streamLines.push('510 36 Td');
  streamLines.push('(Pagina 1 / 1) Tj');
  streamLines.push('ET');

  const streamContent = streamLines.join('\n');
  const streamBytes = new TextEncoder().encode(streamContent);
  const streamLength = streamBytes.length;

  // Estructura de Objetos PDF y cálculo exacto de tabla xref
  const objects: { num: number; content: Uint8Array }[] = [];

  // Objeto 1: Catalog
  objects.push({
    num: 1,
    content: new TextEncoder().encode('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
  });

  // Objeto 2: Pages
  objects.push({
    num: 2,
    content: new TextEncoder().encode('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'),
  });

  // Objeto 3: Page (A4: 595 x 842 pt)
  objects.push({
    num: 3,
    content: new TextEncoder().encode(
      '3 0 obj\n' +
      '<< /Type /Page\n' +
      '   /Parent 2 0 R\n' +
      '   /MediaBox [0 0 595 842]\n' +
      '   /Contents 4 0 R\n' +
      '   /Resources <<\n' +
      '     /Font <<\n' +
      '       /F1 5 0 R\n' +
      '       /F2 6 0 R\n' +
      '     >>\n' +
      '   >>\n' +
      '>>\nendobj\n'
    ),
  });

  // Objeto 4: Stream Contents
  const streamHeader = new TextEncoder().encode(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n`);
  const streamFooter = new TextEncoder().encode('\nendstream\nendobj\n');
  const obj4Content = new Uint8Array(streamHeader.length + streamBytes.length + streamFooter.length);
  obj4Content.set(streamHeader, 0);
  obj4Content.set(streamBytes, streamHeader.length);
  obj4Content.set(streamFooter, streamHeader.length + streamBytes.length);

  objects.push({ num: 4, content: obj4Content });

  // Objeto 5: Font Bold
  objects.push({
    num: 5,
    content: new TextEncoder().encode('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n'),
  });

  // Objeto 6: Font Regular
  objects.push({
    num: 6,
    content: new TextEncoder().encode('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'),
  });

  // Ensamblado final con cálculo preciso de offsets para xref
  const header = new TextEncoder().encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const offsets: number[] = [0]; // offset 0 para objeto 0 (vacío)
  let currentOffset = header.length;

  const chunks: Uint8Array[] = [header];

  for (const obj of objects) {
    offsets.push(currentOffset);
    chunks.push(obj.content);
    currentOffset += obj.content.length;
  }

  // Generar tabla xref
  const startXref = currentOffset;
  let xrefStr = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xrefStr += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  xrefStr += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  chunks.push(new TextEncoder().encode(xrefStr));

  // Concatenar todos los chunks en un único Uint8Array continuo
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
}

/**
 * Crea un Blob de tipo application/pdf descargable o visualizable
 */
export function createPdfBlob(doc: PdfDocumentData): Blob {
  const binaryData = buildStandardPdf(doc);
  return new Blob([binaryData as unknown as BlobPart], { type: 'application/pdf' });
}

/**
 * Dispara la descarga del PDF en el navegador del usuario
 */
export function downloadPdfFile(doc: PdfDocumentData, fileName = 'documento.pdf') {
  const blob = createPdfBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
