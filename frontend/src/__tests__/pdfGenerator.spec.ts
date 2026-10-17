import { describe, it, expect } from 'vitest';
import { buildStandardPdf, createPdfBlob, type PdfDocumentData } from '@/utils/pdfGenerator';

describe('pdfGenerator (Opdf Engine)', () => {
  it('should generate a valid %PDF-1.4 binary structure', () => {
    const docData: PdfDocumentData = {
      title: 'Prueba Unitaria Opdf',
      subtitle: 'Subtítulo de Prueba',
      author: 'Tester OogleOS',
      date: '2026-10-17',
      category: 'TEST',
      content: 'Línea 1 de contenido.\nLínea 2 de contenido con caracteres acentuados áéíóú.',
    };

    const binary = buildStandardPdf(docData);
    expect(binary).toBeInstanceOf(Uint8Array);
    expect(binary.byteLength).toBeGreaterThan(500);

    // Comprobar cabecera estándar %PDF-1.4
    const headerStr = new TextDecoder().decode(binary.subarray(0, 8));
    expect(headerStr).toContain('%PDF-1.4');

    // Comprobar terminación %%EOF
    const fullStr = new TextDecoder().decode(binary);
    expect(fullStr).toContain('%%EOF');
    expect(fullStr).toContain('/Type /Catalog');
    expect(fullStr).toContain('/Type /Page');
    expect(fullStr).toContain('xref');
    expect(fullStr).toContain('trailer');
  });

  it('should create an application/pdf Blob correctly', () => {
    const docData: PdfDocumentData = {
      title: 'Documento Blob',
      content: 'Contenido simple',
    };

    const blob = createPdfBlob(docData);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(500);
  });
});
