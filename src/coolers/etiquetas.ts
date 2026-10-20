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
// Relleno de la celda y sangría del código escrito (20 y 45 px en Laravel).
const RELLENO = 15;
const SANGRIA_CODIGO = 34;

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
    // Como en la versión Laravel: todo alineado a la izquierda de la celda, y
    // el código escrito un poco más adentro, bajo las barras.
    const izquierda = x + RELLENO;

    doc
      .font('Helvetica')
      .fontSize(13.5)
      .text(`Cooler ${etiqueta.nombre}`, izquierda, y + 12, {
        width: ANCHO_CELDA - RELLENO,
        lineBreak: false,
      });
    const imagen = await toBuffer({
      ...BARRAS,
      text: etiqueta.codigo,
      height: 14,
      scale: 3,
    });
    doc.image(imagen, izquierda, y + 34, {
      fit: [ANCHO_BARRAS, ALTO_BARRAS],
    });
    doc
      .font('Helvetica')
      .fontSize(12.75)
      .text(etiqueta.codigo, izquierda + SANGRIA_CODIGO, y + 92, {
        width: ANCHO_CELDA - RELLENO - SANGRIA_CODIGO,
        lineBreak: false,
      });
  }
  if (etiquetas.length === 0) {
    doc.font('Helvetica').fontSize(12).text('No hay coolers que mostrar.');
  }

  doc.end();
  return listo;
}
