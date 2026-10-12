import { toBuffer, toSVG } from 'bwip-js/node';
import PDFDocument from 'pdfkit';

export interface Etiqueta {
  nombre: string;
  codigo: string;
}

// Todas las etiquetas usan Code 128, que es lo que lee la pistola.
const BARRAS = { bcid: 'code128', includetext: false } as const;

// El código de barras como imagen SVG, para mostrarlo en la ficha del cooler.
export function barrasSvg(codigo: string): string {
  return toSVG({ ...BARRAS, text: codigo, height: 14, scale: 2 });
}

// Hoja A4 apaisada con cuatro etiquetas por fila.
const ANCHO = 841.89;
const ALTO = 595.28;
const MARGEN = 30;
const COLUMNAS = 4;
const ALTO_CELDA = 125;
const ANCHO_CELDA = (ANCHO - 2 * MARGEN) / COLUMNAS;
const FILAS = Math.floor((ALTO - 2 * MARGEN) / ALTO_CELDA);
const ANCHO_BARRAS = 150;
const ALTO_BARRAS = 50;

// PDF para imprimir y pegar: por cada cooler su número, el código de barras y
// el código escrito debajo.
export async function armarEtiquetas(etiquetas: Etiqueta[]): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: MARGEN,
    info: { Title: 'Etiquetas de coolers' },
  });
  const partes: Buffer[] = [];
  doc.on('data', (parte: Buffer) => partes.push(parte));
  const listo = new Promise<Buffer>((resolver, rechazar) => {
    doc.on('end', () => resolver(Buffer.concat(partes)));
    doc.on('error', rechazar);
  });

  for (const [i, etiqueta] of etiquetas.entries()) {
    const enPagina = i % (COLUMNAS * FILAS);
    if (i > 0 && enPagina === 0) {
      doc.addPage();
    }
    const x = MARGEN + (enPagina % COLUMNAS) * ANCHO_CELDA;
    const y = MARGEN + Math.floor(enPagina / COLUMNAS) * ALTO_CELDA;
    const centrado = { width: ANCHO_CELDA, align: 'center' } as const;

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(`Cooler ${etiqueta.nombre}`, x, y + 12, {
        ...centrado,
        lineBreak: false,
      });
    const imagen = await toBuffer({
      ...BARRAS,
      text: etiqueta.codigo,
      height: 14,
      scale: 3,
    });
    doc.image(imagen, x + (ANCHO_CELDA - ANCHO_BARRAS) / 2, y + 34, {
      fit: [ANCHO_BARRAS, ALTO_BARRAS],
      align: 'center',
    });
    doc
      .font('Helvetica')
      .fontSize(12)
      .text(etiqueta.codigo, x, y + 90, { ...centrado, lineBreak: false });
  }
  if (etiquetas.length === 0) {
    doc.font('Helvetica').fontSize(12).text('No hay coolers que mostrar.');
  }

  doc.end();
  return listo;
}
