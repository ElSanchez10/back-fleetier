import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { excel } from './excel.util';

interface Fila {
  nombre: string;
  fecha: string;
  monto: number;
}

async function leer(archivo: Awaited<ReturnType<typeof excel>>) {
  const trozos: Buffer[] = [];
  for await (const trozo of archivo.getStream()) {
    trozos.push(trozo as Buffer);
  }
  const libro = new ExcelJS.Workbook();
  // Los tipos de exceljs declaran su propio Buffer; el de Node sirve igual.
  await libro.xlsx.load(Buffer.concat(trozos) as unknown as ExcelJS.Buffer);
  return libro.worksheets[0];
}

describe('excel', () => {
  it('arma una hoja con títulos, fechas de Chile sin correr y montos en pesos', async () => {
    const archivo = await excel<Fila>(
      'Prueba',
      'Hoja',
      [
        { titulo: 'Nombre', valor: (f) => f.nombre },
        { titulo: 'Salida', valor: (f) => f.fecha, tipo: 'fechaHora' },
        { titulo: 'Monto', valor: (f) => f.monto, tipo: 'pesos' },
      ],
      [{ nombre: 'Ñuble', fecha: '2026-10-15T23:30', monto: 15000 }],
    );
    expect(archivo.getHeaders().disposition).toContain(
      "filename*=UTF-8''Prueba",
    );

    const hoja = await leer(archivo);
    expect(hoja.name).toBe('Hoja');
    expect(hoja.getRow(1).values).toEqual([
      undefined,
      'Nombre',
      'Salida',
      'Monto',
    ]);
    const fila = hoja.getRow(2);
    expect(fila.getCell(1).value).toBe('Ñuble');
    expect((fila.getCell(2).value as Date).toISOString()).toBe(
      '2026-10-15T23:30:00.000Z',
    );
    expect(fila.getCell(3).numFmt).toBe('"$"#,##0');
  });
});
