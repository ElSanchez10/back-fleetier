import { StreamableFile } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Rol } from '../auth/sesion.js';
import { hoyEnChile } from './validaciones.js';

// Una columna de la planilla: su título y cómo sacar el valor de cada fila.
//   fecha   texto 'AAAA-MM-DD' o 'AAAA-MM-DDTHH:MM' → celda de fecha de Excel
//   pesos   monto con separador de miles y signo $
export interface Columna<T> {
  titulo: string;
  valor: (fila: T) => string | number | boolean | null;
  tipo?: 'texto' | 'numero' | 'fecha' | 'fechaHora' | 'pesos';
}

const FORMATOS = {
  fecha: 'dd-mm-yyyy',
  fechaHora: 'dd-mm-yyyy hh:mm',
  pesos: '"$"#,##0',
  numero: '#,##0',
} as const;

// La hora de Chile se guarda en la celda tal cual (sin zona): así Excel
// muestra la misma hora que la app.
function aFecha(valor: string): Date {
  const [dia, hora = '00:00'] = valor.split('T');
  return new Date(`${dia}T${hora}:00Z`);
}

// Arma un .xlsx de una hoja con los títulos en negrita, la primera fila fija
// y filtro en cada columna, y lo entrega como descarga.
// `nombre` lleva el día en que se generó, como en la versión Laravel:
// "Historial Rutas (Generado 15-10-2026).xlsx".
export async function excel<T>(
  nombre: string,
  hoja: string,
  columnas: Columna<T>[],
  filas: T[],
): Promise<StreamableFile> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'DSL';
  const planilla = libro.addWorksheet(hoja, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  planilla.columns = columnas.map((c) => ({
    header: c.titulo,
    width: Math.max(c.titulo.length + 4, c.tipo === 'fechaHora' ? 18 : 12),
    style:
      c.tipo && c.tipo !== 'texto' ? { numFmt: FORMATOS[c.tipo] } : undefined,
  }));
  for (const fila of filas) {
    planilla.addRow(
      columnas.map((c) => {
        const valor = c.valor(fila);
        if (valor === null || valor === '') {
          return null;
        }
        return c.tipo === 'fecha' || c.tipo === 'fechaHora'
          ? aFecha(String(valor))
          : valor;
      }),
    );
  }
  // Ancho según el texto más largo de cada columna (con tope).
  planilla.columns.forEach((columna, i) => {
    if (columnas[i].tipo === undefined || columnas[i].tipo === 'texto') {
      const largo = Math.max(
        ...filas.map((f) => String(columnas[i].valor(f) ?? '').length),
        0,
      );
      columna.width = Math.min(Math.max(columna.width ?? 10, largo + 2), 60);
    }
  });
  planilla.getRow(1).font = { bold: true };
  planilla.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columnas.length },
  };

  const contenido = Buffer.from(await libro.xlsx.writeBuffer());
  const [anio, mes, dia] = hoyEnChile().split('-');
  const archivo = `${nombre} (Generado ${dia}-${mes}-${anio}).xlsx`;
  return new StreamableFile(contenido, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // filename* lleva el nombre con tildes; filename, una versión sin ellas.
    disposition: `attachment; filename="${archivo.normalize('NFD').replace(/[^\x20-\x7e]/g, '')}"; filename*=UTF-8''${encodeURIComponent(archivo)}`,
    length: contenido.length,
  });
}

// Más filas de las que una planilla necesita: acota la consulta por si acaso.
export const MAX_FILAS_EXCEL = 50_000;

// Quienes descargan planillas (en Laravel, todos menos el coordinador).
export const EXPORTAN: Rol[] = ['admin', 'asistente', 'encargado'];
